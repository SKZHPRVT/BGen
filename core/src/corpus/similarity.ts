import type { GameSpec } from "../types.ts";

export interface CorpusEntry {
  id: string;
  genre: string;
  audience: string;
  theme?: string;
  mechanics: string[];
  prompt: string;
  html: string;
  metrics?: {
    avgSessionSec?: number;
    winRate?: number;
    plays?: number;
  };
}

export function scoreEntry(entry: CorpusEntry, spec: GameSpec): number {
  let score = 0;

  if (entry.genre === spec.genre) score += 10;
  if (entry.audience === spec.audience) score += 6;
  if (entry.theme && spec.theme && entry.theme === spec.theme) score += 4;

  const mechOverlap = entry.mechanics.filter((m) => spec.mechanics.includes(m as never)).length;
  score += mechOverlap * 1.5;

  const m = entry.metrics;
  if (m) {
    if (typeof m.winRate === "number") score += m.winRate * 2;
    if (typeof m.plays === "number") score += Math.min(m.plays / 100, 2);
  }

  return score;
}
