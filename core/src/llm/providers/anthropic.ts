import type { LLMRequest } from "../../types.ts";
import { BaseProvider, ProviderError } from "../provider.ts";
import { parseSSE } from "../stream.ts";

interface AnthropicOptions { apiKey?: string; model?: string; }

export class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic";
  private apiKey: string | undefined;
  private model: string;

  constructor(opts: AnthropicOptions = {}) {
    super();
    this.apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = opts.model ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
  }

  isAvailable(): boolean { return Boolean(this.apiKey); }
  async generate(req: LLMRequest): Promise<string> { return this.generateStream(req, () => {}); }

  async generateStream(req: LLMRequest, onChunk: (t: string) => void): Promise<string> {
    if (!this.apiKey) throw new ProviderError(this.name, "ANTHROPIC_API_KEY not set");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        signal: req.signal,
        body: JSON.stringify({
          model: this.model,
          max_tokens: req.maxTokens ?? 8000,
          temperature: req.temperature ?? 0.7,
          system: req.system,
          messages: [{ role: "user", content: req.user }],
          stream: true,
        }),
      });
      if (!res.ok || !res.body) throw new ProviderError(this.name, `HTTP ${res.status}`);
      let full = "";
      for await (const raw of parseSSE(res.body)) {
        try {
          const json = JSON.parse(raw) as { type?: string; delta?: { type?: string; text?: string } };
          if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
            const t = json.delta.text ?? "";
            if (t) { full += t; onChunk(t); }
          }
        } catch { /* skip */ }
      }
      return full;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(this.name, (e as Error).message, e);
    }
  }
}
