import type { LLMProvider, LLMRequest } from "../types.ts";

export function flattenPrompt(req: LLMRequest): string {
  return `${req.system}\n\n---\n\n${req.user}`;
}

export abstract class BaseProvider implements LLMProvider {
  abstract readonly name: string;
  abstract isAvailable(): boolean;
  abstract generate(req: LLMRequest): Promise<string>;

  async generateStream(req: LLMRequest, onChunk: (t: string) => void): Promise<string> {
    const text = await this.generate(req);
    const chunkSize = 80;
    for (let i = 0; i < text.length; i += chunkSize) {
      onChunk(text.slice(i, i + chunkSize));
      await new Promise((r) => setTimeout(r, 0));
    }
    return text;
  }
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}
