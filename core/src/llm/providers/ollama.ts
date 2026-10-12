import type { LLMRequest } from "../../types.ts";
import { BaseProvider, ProviderError } from "../provider.ts";
import { parseSSE } from "../stream.ts";

interface OllamaOptions { url?: string; model?: string; }

export class OllamaProvider extends BaseProvider {
  readonly name = "ollama";
  private url: string;
  private model: string;

  constructor(opts: OllamaOptions = {}) {
    super();
    this.url = (opts.url ?? process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");
    this.model = opts.model ?? process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
  }

  isAvailable(): boolean { return Boolean(this.url); }
  async generate(req: LLMRequest): Promise<string> { return this.generateStream(req, () => {}); }

  async generateStream(req: LLMRequest, onChunk: (t: string) => void): Promise<string> {
    try {
      const res = await fetch(`${this.url}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: req.signal,
        body: JSON.stringify({
          model: this.model,
          stream: true,
          options: { temperature: req.temperature ?? 0.7, num_predict: req.maxTokens ?? 8000 },
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
          const json = JSON.parse(raw) as { message?: { content?: string }; done?: boolean };
          const delta = json.message?.content;
          if (delta) { full += delta; onChunk(delta); }
          if (json.done) break;
        } catch { /* skip */ }
      }
      return full;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(this.name, (e as Error).message, e);
    }
  }
}
