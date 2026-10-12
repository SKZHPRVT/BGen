import type { LLMRequest } from "../../types.ts";
import { BaseProvider, ProviderError } from "../provider.ts";
import { parseSSE } from "../stream.ts";

interface OpenAIOptions { apiKey?: string; baseUrl?: string; model?: string; }

export class OpenAIProvider extends BaseProvider {
  readonly name = "openai";
  private apiKey: string | undefined;
  private baseUrl: string;
  private model: string;

  constructor(opts: OpenAIOptions = {}) {
    super();
    this.apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
    this.baseUrl = (opts.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = opts.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  isAvailable(): boolean { return Boolean(this.apiKey); }
  async generate(req: LLMRequest): Promise<string> { return this.generateStream(req, () => {}); }

  async generateStream(req: LLMRequest, onChunk: (t: string) => void): Promise<string> {
    if (!this.apiKey) throw new ProviderError(this.name, "OPENAI_API_KEY not set");
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        signal: req.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 8000,
          stream: true,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
        }),
      });
      if (!res.ok || !res.body) throw new ProviderError(this.name, `HTTP ${res.status}`);
      let full = "";
      for await (const raw of parseSSE(res.body)) {
        try {
          const json = JSON.parse(raw) as { choices?: { delta?: { content?: string } }[] };
          const t = json.choices?.[0]?.delta?.content ?? "";
          if (t) { full += t; onChunk(t); }
        } catch { /* skip */ }
      }
      return full;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(this.name, (e as Error).message, e);
    }
  }
}
