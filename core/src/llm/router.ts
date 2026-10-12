import type { LLMProvider, LLMRequest } from "../types.ts";
import { ProviderError } from "./provider.ts";
import { withTimeout } from "../utils/timeout.ts";
import { ManualProvider } from "./providers/manual.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { OpenAIProvider } from "./providers/openai.ts";
import { MockProvider } from "./providers/mock.ts";

export interface RouterOptions {
  providers: LLMProvider[];
  timeoutMs?: number;
  retriesPerProvider?: number;
  onAttempt?: (info: { provider: string; attempt: number; error?: string }) => void;
}

export interface RouterResult {
  text: string;
  provider: string;
  attempts: number;
}

export class Router {
  private providers: LLMProvider[];
  private timeoutMs: number;
  private retries: number;
  private onAttempt?: RouterOptions["onAttempt"];

  constructor(opts: RouterOptions) {
    this.providers = opts.providers.filter((p) => p.isAvailable());
    this.timeoutMs = opts.timeoutMs ?? 90_000;
    this.retries = opts.retriesPerProvider ?? 1;
    this.onAttempt = opts.onAttempt;
  }

  available(): string[] { return this.providers.map((p) => p.name); }

  async generate(req: LLMRequest, onChunk?: (t: string) => void): Promise<RouterResult> {
    if (this.providers.length === 0) throw new Error("No LLM providers available.");
    const errors: string[] = [];
    let totalAttempts = 0;

    for (const p of this.providers) {
      for (let r = 0; r <= this.retries; r++) {
        totalAttempts++;
        try {
          this.onAttempt?.({ provider: p.name, attempt: totalAttempts });
          const task = onChunk && p.generateStream
            ? p.generateStream(req, onChunk)
            : p.generate(req);
          const text = await withTimeout(task, this.timeoutMs, `Provider ${p.name} timeout`);
          if (!text || text.trim().length < 50) throw new Error("Response too short");
          return { text, provider: p.name, attempts: totalAttempts };
        } catch (e) {
          const msg = e instanceof ProviderError ? e.message : (e as Error).message;
          errors.push(`${p.name}[${r + 1}]: ${msg}`);
          this.onAttempt?.({ provider: p.name, attempt: totalAttempts, error: msg });
        }
      }
    }

    throw new Error("All providers failed:\n" + errors.join("\n"));
  }
}

export function createDefaultRouter(opts: Partial<RouterOptions> = {}): Router {
  const order = (process.env.LLM_PROVIDER_ORDER ?? "manual,ollama,anthropic,openai")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const factory: Record<string, () => LLMProvider> = {
    manual: () => new ManualProvider(),
    ollama: () => new OllamaProvider(),
    anthropic: () => new AnthropicProvider(),
    openai: () => new OpenAIProvider(),
    mock: () => new MockProvider(),
  };

  const providers: LLMProvider[] = [];
  for (const name of order) {
    const f = factory[name];
    if (f) providers.push(f());
  }

  if (providers.every((p) => !p.isAvailable())) {
    providers.push(new MockProvider());
  }

  return new Router({ providers, ...opts });
}
