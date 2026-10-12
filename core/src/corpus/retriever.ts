import type { GameSpec } from "../types.ts";
import { scoreEntry, type CorpusEntry } from "./similarity.ts";

export interface RetrieveOptions {
  topK?: number;
  minScore?: number;
}

export function retrieveExamples(
  spec: GameSpec,
  corpus: CorpusEntry[],
  opts: RetrieveOptions = {},
): CorpusEntry[] {
  const topK = opts.topK ?? 2;
  const minScore = opts.minScore ?? 5;

  return corpus
    .map((e) => ({ e, score: scoreEntry(e, spec) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.e);
}

export function formatExamplesForPrompt(entries: CorpusEntry[]): string[] {
  return entries.map((e, i) => {
    const header = `### EXAMPLE ${i + 1} — genre=${e.genre}, audience=${e.audience}, prompt="${e.prompt}"`;
    return `${header}\n\`\`\`html\n${e.html}\n\`\`\``;
  });
}
