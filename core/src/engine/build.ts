/**
 * Сборка финального HTML из GameConfig.
 */
import type { Genre } from "../types.ts";
import type { GameConfig } from "./types.ts";
import { buildSnakeGame } from "./templates/snake.ts";
import { buildClickerGame } from "./templates/clicker.ts";
import { buildMemoryGame } from "./templates/memory.ts";
import { build2048Game } from "./templates/g2048.ts";

/**
 * Поддерживаемые жанры движка.
 */
export const SUPPORTED_GENRES: Genre[] = [
  "snake",
  "clicker",
  "memory",
  "2048",
];

export function isSupported(genre: Genre): boolean {
  return SUPPORTED_GENRES.includes(genre);
}

export function buildGame(cfg: GameConfig): string {
  if (!isSupported(cfg.genre)) {
    throw new Error(`Genre not supported by engine: ${cfg.genre}`);
  }
  switch (cfg.genre) {
    case "snake":
      return buildSnakeGame(cfg);
    case "clicker":
      return buildClickerGame(cfg);
    case "memory":
      return buildMemoryGame(cfg);
    case "2048":
      return build2048Game(cfg);
    default:
      throw new Error(`No template for genre: ${cfg.genre}`);
  }
}
