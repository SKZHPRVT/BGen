/**
 * BGen Game Engine — типы конфигов.
 *
 * LLM генерирует GameConfig (данные).
 * Движок превращает конфиг в рабочий HTML.
 *
 * Никакого кода от LLM — только параметры.
 */

import type { Genre } from "../types.ts";

export interface GameColors {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  grid?: string;
}

export interface GameEmojis {
  player?: string;
  food?: string;
  obstacle?: string;
  background?: string[];
}

export interface GameTexts {
  startTitle?: string;
  startHint?: string;
  gameOverTitle?: string;
  winTitle?: string;
  restartButton?: string;
  scorePrefix?: string;
}

export interface GameAudio {
  enabled: boolean;
  onEat?: "beep" | "pop" | "coin";
  onGameOver?: "fail" | "soft";
}

export interface GameConfig {
  title: string;
  subtitle?: string;
  genre: Genre;

  colors: GameColors;
  emojis?: GameEmojis;
  texts?: GameTexts;
  audio?: GameAudio;

  /** ms между шагами (для grid-based игр). 80-350ms. */
  speed: number;

  /** Размер шрифта, px. 16-24 для обычных, 20+ для elderly. */
  fontSize: number;

  /** Размер кнопок, px. 60+ для touch. */
  buttonSize: number;

  /** Размер сетки (для snake/2048/memory). */
  gridSize?: number;

  /** Сложность. */
  difficulty?: "easy" | "normal" | "hard";
}

/**
 * Дефолтный конфиг — если LLM что-то не вернула или вернула мусор.
 * Можно собрать игру полностью без LLM.
 */
export function defaultConfig(genre: Genre): GameConfig {
  return {
    title: "Игра",
    subtitle: "BGen",
    genre,
    colors: {
      background: "#111111",
      surface: "#1a1a1a",
      primary: "#4f8",
      accent: "#e33",
      text: "#ffffff",
      grid: "#222222",
    },
    emojis: {},
    texts: {
      startHint: "Тапни чтобы начать",
      gameOverTitle: "Игра окончена",
      winTitle: "Победа!",
      restartButton: "Заново",
      scorePrefix: "Счёт",
    },
    audio: { enabled: false },
    speed: 150,
    fontSize: 18,
    buttonSize: 64,
    gridSize: 20,
    difficulty: "normal",
  };
}

/**
 * Валидация и нормализация конфига от LLM.
 * Гарантирует корректные типы и диапазоны.
 */
export function normalizeConfig(raw: any, genre: Genre): GameConfig {
  const def = defaultConfig(genre);
  if (!raw || typeof raw !== "object") return def;

  const clamp = (v: any, min: number, max: number, fallback: number): number => {
    const n = Number(v);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  };

  const hex = (v: any, fallback: string): string => {
    if (typeof v !== "string") return fallback;
    const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/);
    return m ? `#${m[1]}` : fallback;
  };

  const safeStr = (v: any, fallback: string, maxLen = 60): string => {
    if (typeof v !== "string") return fallback;
    const s = v.trim().slice(0, maxLen);
    return s || fallback;
  };

  const safeEmoji = (v: any): string | undefined => {
    if (typeof v !== "string") return undefined;
    const s = v.trim().slice(0, 8);
    return s || undefined;
  };

  const colors = raw.colors && typeof raw.colors === "object" ? raw.colors : {};
  const texts = raw.texts && typeof raw.texts === "object" ? raw.texts : {};
  const emojis = raw.emojis && typeof raw.emojis === "object" ? raw.emojis : {};
  const audio = raw.audio && typeof raw.audio === "object" ? raw.audio : {};

  return {
    title: safeStr(raw.title, def.title, 30),
    subtitle: safeStr(raw.subtitle, def.subtitle ?? "", 60) || undefined,
    genre,
    colors: {
      background: hex(colors.background, def.colors.background),
      surface: hex(colors.surface, def.colors.surface),
      primary: hex(colors.primary, def.colors.primary),
      accent: hex(colors.accent, def.colors.accent),
      text: hex(colors.text, def.colors.text),
      grid: colors.grid ? hex(colors.grid, def.colors.grid ?? "#222") : def.colors.grid,
    },
    emojis: {
      player: safeEmoji(emojis.player),
      food: safeEmoji(emojis.food),
      obstacle: safeEmoji(emojis.obstacle),
      background: Array.isArray(emojis.background)
        ? emojis.background.filter((x: any) => typeof x === "string").slice(0, 5)
        : undefined,
    },
    texts: {
      startTitle: safeStr(texts.startTitle, def.texts?.startTitle ?? "", 40) || undefined,
      startHint: safeStr(texts.startHint, def.texts?.startHint ?? "", 60) || undefined,
      gameOverTitle: safeStr(texts.gameOverTitle, def.texts?.gameOverTitle ?? "", 40) || undefined,
      winTitle: safeStr(texts.winTitle, def.texts?.winTitle ?? "", 40) || undefined,
      restartButton: safeStr(texts.restartButton, def.texts?.restartButton ?? "", 20) || undefined,
      scorePrefix: safeStr(texts.scorePrefix, def.texts?.scorePrefix ?? "", 20) || undefined,
    },
    audio: {
      enabled: audio.enabled === true,
      onEat: ["beep", "pop", "coin"].includes(audio.onEat) ? audio.onEat : undefined,
      onGameOver: ["fail", "soft"].includes(audio.onGameOver) ? audio.onGameOver : undefined,
    },
    speed: clamp(raw.speed, 60, 400, def.speed),
    fontSize: clamp(raw.fontSize, 14, 28, def.fontSize),
    buttonSize: clamp(raw.buttonSize, 56, 96, def.buttonSize),
    gridSize: raw.gridSize ? clamp(raw.gridSize, 8, 30, def.gridSize ?? 20) : def.gridSize,
    difficulty: ["easy", "normal", "hard"].includes(raw.difficulty) ? raw.difficulty : "normal",
  };
}
