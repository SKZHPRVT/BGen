/**
 * Сборка финального HTML из GameConfig.
 */
import type { Genre } from "../types.ts";
import type { GameConfig } from "./types.ts";
import { buildSnakeGame } from "./templates/snake.ts";
import { buildClickerGame } from "./templates/clicker.ts";
import { buildMemoryGame } from "./templates/memory.ts";
import { build2048Game } from "./templates/g2048.ts";
import { buildRunnerGame } from "./templates/runner.ts";
import { buildBreakoutGame } from "./templates/breakout.ts";
import { buildTowerGame } from "./templates/tower.ts";
import { buildPlatformerGame } from "./templates/platformer.ts";
import { buildRacingGame } from "./templates/racing.ts";
import { buildFightingGame } from "./templates/fighting.ts";
import { buildTanksGame } from "./templates/tanks.ts";
import { buildTicTacToeGame } from "./templates/tictactoe.ts";

export const SUPPORTED_GENRES: Genre[] = [
  "snake",
  "clicker",
  "memory",
  "2048",
  "runner",
  "breakout",
  "tower",
  "platformer",
  "racing",
  "fighting",
  "tanks",
  "tictactoe",
];

export function isSupported(genre: Genre): boolean {
  return SUPPORTED_GENRES.includes(genre);
}

export function buildGame(cfg: GameConfig): string {
  if (!isSupported(cfg.genre)) {
    throw new Error(`Genre not supported by engine: ${cfg.genre}`);
  }
  switch (cfg.genre) {
    case "snake": return buildSnakeGame(cfg);
    case "clicker": return buildClickerGame(cfg);
    case "memory": return buildMemoryGame(cfg);
    case "2048": return build2048Game(cfg);
    case "runner": return buildRunnerGame(cfg);
    case "breakout": return buildBreakoutGame(cfg);
    case "tower": return buildTowerGame(cfg);
    case "platformer": return buildPlatformerGame(cfg);
    case "racing": return buildRacingGame(cfg);
    case "fighting": return buildFightingGame(cfg);
    case "tanks": return buildTanksGame(cfg);
    case "tictactoe": return buildTicTacToeGame(cfg);
    default:
      throw new Error(`No template for genre: ${cfg.genre}`);
  }
}
