/**
 * GigaChatProvider — Сбер GigaChat API.
 *
 * Особенности:
 *   - Не совместим с OpenAI: сначала OAuth-токен, потом чат-запросы.
 *   - Токен живёт 30 минут, обновляем автоматически.
 *   - Использует сертификат Минцифры РФ → в Node/Bun даёт "self signed certificate".
 *     Решение: env NODE_TLS_REJECT_UNAUTHORIZED=0 в Railway.
 *
 * Требует env:
 *   GIGACHAT_AUTH_KEY  — base64(ClientID:ClientSecret)
 *   GIGACHAT_MODEL     — GigaChat | GigaChat-Pro | GigaChat-Max
 *   GIGACHAT_SCOPE     — GIGACHAT_API_PERS | GIGACHAT_API_B2B
 */
import type { LLMRequest } from "../../types.ts";
import { BaseProvider, ProviderError } from "../provider.ts";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const API_BASE = "https://gigachat.devices.sberbank.ru/api/v1";

interface GigaChatOptions {
  authKey?: string;
  model?: string;
  scope?: string;
}

export class GigaChatProvider extends BaseProvider {
  readonly name = "gigachat";
  private authKey: string | undefined;
  private model: string;
  private scope: string;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(opts: GigaChatOptions = {}) {
    super();
    this.authKey = opts.authKey ?? process.env.GIGACHAT_AUTH_KEY;
    this.model = opts.model ?? process.env.GIGACHAT_MODEL ?? "GigaChat";
    this.scope = opts.scope ?? process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS";
  }

  isAvailable(): boolean {
    return Boolean(this.authKey);
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (!this.authKey) {
      throw new ProviderError(this.name, "GIGACHAT_AUTH_KEY не задан");
    }

    const rquid = crypto.randomUUID();
    const body = new URLSearchParams({ scope: this.scope });

    let res: Response;
    try {
      res = await fetch(OAUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          RqUID: rquid,
          Authorization: `Basic ${this.authKey}`,
        },
        body: body.toString(),
        // @ts-ignore
        tls: { rejectUnauthorized: false },
      });
    } catch (e) {
      throw new ProviderError(this.name, `OAuth fetch failed: ${(e as Error).message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ProviderError(
        this.name,
        `OAuth HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as { access_token: string; expires_at: number };
    this.accessToken = json.access_token;
    this.tokenExpiresAt = json.expires_at;
    return this.accessToken;
  }

  async generate(req: LLMRequest): Promise<string> {
    const token = await this.getAccessToken();

    const messages = [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ];

    try {
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: req.signal,
        // @ts-ignore
        tls: { rejectUnauthorized: false },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 8000,
          stream: false,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ProviderError(
          this.name,
          `HTTP ${res.status}: ${text.slice(0, 300)}`,
        );
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content ?? "";
      if (!content) {
        throw new ProviderError(this.name, "Empty response from GigaChat");
      }
      return content;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(this.name, (e as Error).message, e);
    }
  }

  /**
   * Генерация JSON-конфига игры.
   * Возвращает распарсенный JSON.
   */
  async generateConfig(system: string, user: string): Promise<any> {
    const text = await this.generate({
      system,
      user,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Очищаем возможные markdown-обёртки
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?```\s*$/i, "");

    // Ищем JSON в тексте
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("LLM did not return JSON");
    }

    const jsonStr = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(
        `Invalid JSON from LLM: ${(e as Error).message}\nRaw: ${jsonStr.slice(0, 300)}`,
      );
    }
  }
}
