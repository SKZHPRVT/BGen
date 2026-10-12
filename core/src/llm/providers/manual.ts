import type { LLMRequest } from "../../types.ts";
import { BaseProvider, ProviderError } from "../provider.ts";

export class ManualProvider extends BaseProvider {
  readonly name = "manual";
  private queue: string[] = [];
  private fallback: string | undefined;

  constructor(options: { fallback?: string } = {}) {
    super();
    this.fallback = options.fallback;
  }

  isAvailable(): boolean {
    return this.queue.length > 0 || this.fallback !== undefined;
  }

  push(response: string): void { this.queue.push(response); }
  pushMany(responses: string[]): void { for (const r of responses) this.queue.push(r); }
  size(): number { return this.queue.length; }
  clear(): void { this.queue = []; }

  async generate(_req: LLMRequest): Promise<string> {
    const next = this.queue.shift();
    if (next) return next;
    if (this.fallback) return this.fallback;
    throw new ProviderError(this.name, "Queue empty. Push a response or provide fallback.");
  }
}
