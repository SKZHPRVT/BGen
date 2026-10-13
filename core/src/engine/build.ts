/**
 * Сборка финального HTML из GameConfig.
 * Определяет шаблон по жанру.
 */
import type { Genre } from "../types.ts";
import type { GameConfig } from "./types.ts";
import { buildSnakeGame } from "./templates/snake.ts";

/**
 * Поддерживаемые жанры движка.
 * Если жанр не в списке — идём через LLM (старый pipeline).
 */
export const SUPPORTED_GENRES: Genre[] = [
  "snake",
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
    default:
      throw new Error(`No template for genre: ${cfg.genre}`);
  }
}
