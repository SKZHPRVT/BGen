/**
 * BGen Game Engine — расширенная schema.
 * LLM генерирует конфиг, движок рендерит.
 */

import type { Genre } from "../types.ts";

// ─────────────────────────────────────────────────────────────
// ЦВЕТА
// ─────────────────────────────────────────────────────────────

export interface GameColors {
  background: string;
  surface: string;
  primary: string;
  secondary?: string;
  accent: string;
  text: string;
  grid?: string;
  shadow?: string;
  glow?: string;
}

// ─────────────────────────────────────────────────────────────
// ФОН
// ─────────────────────────────────────────────────────────────

export type BackgroundType = "solid" | "gradient" | "particles" | "stars" | "grid" | "none";

export interface BackgroundConfig {
  type: BackgroundType;
  gradient?: { from: string; to: string; angle?: number };
  particles?: {
    count: number;
    color: string;
    size: number;
    speed: number;
    shape?: "circle" | "square" | "star";
  };
}

// ─────────────────────────────────────────────────────────────
// СПРАЙТЫ
// ─────────────────────────────────────────────────────────────

export type SpriteType = "emoji" | "shape" | "pixel" | "svg" | "none";
export type ShapeName = "circle" | "square" | "roundedSquare" | "triangle" | "hexagon" | "star" | "diamond";

export interface SpriteConfig {
  type: SpriteType;

  // Emoji
  emoji?: string;

  // Shape
  shape?: ShapeName;
  size?: number;                  // 0.5-1.0 от клетки
  color?: string;
  outline?: { width: number; color: string };

  // Pixel art
  pixel?: {
    size: number;                 // 8-24
    palette: Record<string, string>; // {"o": "#ffb347", ".": "transparent"}
    grid: string[];
  };

  // SVG
  svg?: string;
}

// ─────────────────────────────────────────────────────────────
// АНИМАЦИИ
// ─────────────────────────────────────────────────────────────

export type AnimationName =
  | "none"
  | "pulse"
  | "shake"
  | "rotate"
  | "bounce"
  | "breathe"
  | "glow";

export interface AnimationsConfig {
  player?: AnimationName;
  food?: AnimationName;
  obstacle?: AnimationName;
  powerup?: AnimationName;
}

// ─────────────────────────────────────────────────────────────
// ТЕКСТЫ
// ─────────────────────────────────────────────────────────────

export interface GameTexts {
  startTitle?: string;
  startHint?: string;
  gameOverTitle?: string;
  gameOverHint?: string;
  winTitle?: string;
  winHint?: string;
  restartButton?: string;
  scorePrefix?: string;
  tutorial?: string;
}

// ─────────────────────────────────────────────────────────────
// АУДИО
// ─────────────────────────────────────────────────────────────

export type SoundType = "pop" | "coin" | "beep" | "chime" | "click" | "fail" | "down" | "softFail" | "fanfare";

export interface GameAudio {
  enabled: boolean;
  volume?: number;
  sounds?: {
    eat?: SoundType;
    gameOver?: SoundType;
    win?: SoundType;
    tap?: SoundType;
  };
}

// ─────────────────────────────────────────────────────────────
// СТИЛЬ-ПРЕСЕТ (сокращение для LLM)
// ─────────────────────────────────────────────────────────────

export type StylePreset =
  | "cozy"          // тёплый, пастельный, спокойный
  | "neon"          // неон, тёмный фон, яркие контуры
  | "retro8bit"     // 8-бит, пиксели, ограниченная палитра
  | "minimal"       // минимализм, чёрно-белое, чистое
  | "papercraft"    // бумажный, тёплый, слоистый
  | "space"         // космос, фиолетовый/чёрный, звёзды
  | "forest"        // зелёный, естественный
  | "candy"         // яркий, детский, пастельный
  | "cyberpunk"     // неон, розовый/циан, тёмный
  | "nature";       // зелёный/коричневый, естественный

// ─────────────────────────────────────────────────────────────
// ГЛАВНЫЙ КОНФИГ
// ─────────────────────────────────────────────────────────────

export interface GameConfig {
  title: string;
  subtitle?: string;
  genre: Genre;

  stylePreset?: StylePreset;

  colors: GameColors;
  background?: BackgroundConfig;

  sprites?: {
    player?: SpriteConfig;
    food?: SpriteConfig;
    obstacle?: SpriteConfig;
    powerup?: SpriteConfig;
  };

  animations?: AnimationsConfig;

  texts?: GameTexts;
  audio?: GameAudio;

  speed: number;                  // 60-400 ms
  fontSize: number;               // 14-28
  buttonSize: number;             // 56-96
  gridSize?: number;
  difficulty?: "easy" | "normal" | "hard";

  // Игровые параметры
  lives?: number;
  scorePerFood?: number;
  wrapAroundWalls?: boolean;
}

// ─────────────────────────────────────────────────────────────
// ПРЕСЕТЫ
// ─────────────────────────────────────────────────────────────

export const STYLE_PRESETS: Record<StylePreset, Partial<GameConfig>> = {
  cozy: {
    colors: {
      background: "#fdf6e3",
      surface: "#f5e6c8",
      primary: "#2a7f62",
      secondary: "#4fa583",
      accent: "#c0392b",
      text: "#2c1810",
      grid: "#e8d4a8",
      shadow: "#d4c4a0",
      glow: "#ffd88a",
    },
    background: { type: "solid" },
    animations: { player: "breathe", food: "pulse" },
    audio: { enabled: true, sounds: { eat: "pop", gameOver: "softFail" } },
  },
  neon: {
    colors: {
      background: "#0a0a15",
      surface: "#12122a",
      primary: "#00ffd5",
      secondary: "#00ccaa",
      accent: "#ff00aa",
      text: "#ffffff",
      grid: "#1a1a3a",
      shadow: "#000000",
      glow: "#00ffd5",
    },
    background: { type: "particles", particles: { count: 40, color: "#00ffd5", size: 2, speed: 0.2 } },
    animations: { player: "pulse", food: "glow" },
    audio: { enabled: true, sounds: { eat: "chime", gameOver: "fail" } },
  },
  retro8bit: {
    colors: {
      background: "#1a1a2e",
      surface: "#16213e",
      primary: "#f9d423",
      secondary: "#ff4e50",
      accent: "#00d4ff",
      text: "#ffffff",
      grid: "#0f3460",
      shadow: "#000000",
      glow: "#f9d423",
    },
    background: { type: "stars", particles: { count: 30, color: "#f9d423", size: 2, speed: 0.1 } },
    animations: { player: "shake", food: "bounce" },
    audio: { enabled: true, sounds: { eat: "beep", gameOver: "down" } },
  },
  minimal: {
    colors: {
      background: "#ffffff",
      surface: "#f5f5f5",
      primary: "#111111",
      secondary: "#333333",
      accent: "#111111",
      text: "#111111",
      grid: "#e5e5e5",
      shadow: "#dddddd",
      glow: "#111111",
    },
    background: { type: "solid" },
    animations: { player: "none", food: "none" },
    audio: { enabled: false },
  },
  space: {
    colors: {
      background: "#0a0a1a",
      surface: "#14142e",
      primary: "#7c3aed",
      secondary: "#a78bfa",
      accent: "#fbbf24",
      text: "#ffffff",
      grid: "#1f1f3f",
      shadow: "#000000",
      glow: "#a78bfa",
    },
    background: { type: "stars", particles: { count: 80, color: "#ffffff", size: 1, speed: 0.05 } },
    animations: { player: "breathe", food: "glow" },
    audio: { enabled: true, sounds: { eat: "chime", gameOver: "softFail" } },
  },
  forest: {
    colors: {
      background: "#0f1a0f",
      surface: "#1a2e1a",
      primary: "#7ba05b",
      secondary: "#a3c585",
      accent: "#e8b84b",
      text: "#f0f5e8",
      grid: "#2a3e2a",
      shadow: "#000000",
      glow: "#c7e89e",
    },
    background: { type: "solid" },
    animations: { player: "breathe", food: "pulse" },
    audio: { enabled: true, sounds: { eat: "pop", gameOver: "softFail" } },
  },
  candy: {
    colors: {
      background: "#fff0f6",
      surface: "#ffe0ec",
      primary: "#ff6ec7",
      secondary: "#ffb3e0",
      accent: "#7ee8fa",
      text: "#5a2a4a",
      grid: "#ffd0e0",
      shadow: "#e0a0c0",
      glow: "#ffb3e0",
    },
    background: { type: "particles", particles: { count: 20, color: "#ffb3e0", size: 4, speed: 0.1, shape: "circle" } },
    animations: { player: "bounce", food: "pulse" },
    audio: { enabled: true, sounds: { eat: "coin", gameOver: "softFail" } },
  },
  cyberpunk: {
    colors: {
      background: "#0d0221",
      surface: "#1a0a2e",
      primary: "#ff006e",
      secondary: "#ff4d94",
      accent: "#00f5ff",
      text: "#ffffff",
      grid: "#2a1a4a",
      shadow: "#000000",
      glow: "#00f5ff",
    },
    background: { type: "particles", particles: { count: 60, color: "#00f5ff", size: 2, speed: 0.3 } },
    animations: { player: "glow", food: "pulse" },
    audio: { enabled: true, sounds: { eat: "beep", gameOver: "fail" } },
  },
  papercraft: {
    colors: {
      background: "#f4e8d0",
      surface: "#e8d8b8",
      primary: "#8b6f47",
      secondary: "#b89770",
      accent: "#c25e3a",
      text: "#3a2e1f",
      grid: "#d4c4a0",
      shadow: "#b8a080",
      glow: "#e8c080",
    },
    background: { type: "solid" },
    animations: { player: "breathe", food: "pulse" },
    audio: { enabled: true, sounds: { eat: "pop", gameOver: "softFail" } },
  },
  nature: {
    colors: {
      background: "#e8f0e0",
      surface: "#d0e0c0",
      primary: "#5a7f3a",
      secondary: "#8fb56a",
      accent: "#d4691c",
      text: "#2a3a1a",
      grid: "#c0d4a8",
      shadow: "#a0b890",
      glow: "#c8e0a0",
    },
    background: { type: "solid" },
    animations: { player: "breathe", food: "pulse" },
    audio: { enabled: true, sounds: { eat: "pop", gameOver: "softFail" } },
  },
};

// ─────────────────────────────────────────────────────────────
// ДЕФОЛТНЫЙ КОНФИГ
// ─────────────────────────────────────────────────────────────

export function defaultConfig(genre: Genre): GameConfig {
  const preset = STYLE_PRESETS.cozy;
  return {
    title: "Игра",
    subtitle: "BGen",
    genre,
    stylePreset: "cozy",
    colors: preset.colors!,
    background: preset.background,
    sprites: {
      player: { type: "shape", shape: "roundedSquare", size: 0.85, color: preset.colors!.primary, outline: { width: 2, color: "#00000020" } },
      food: { type: "shape", shape: "circle", size: 0.7, color: preset.colors!.accent },
      obstacle: { type: "shape", shape: "triangle", size: 0.8, color: "#666666" },
    },
    animations: preset.animations,
    texts: {
      startTitle: "Готовы?",
      startHint: "Свайпайте или тапайте",
      gameOverTitle: "Игра окончена",
      gameOverHint: "Счёт: {score}",
      winTitle: "Победа!",
      winHint: "Набрано {score}",
      restartButton: "Заново",
      scorePrefix: "Счёт",
    },
    audio: preset.audio,
    speed: 150,
    fontSize: 18,
    buttonSize: 64,
    gridSize: 18,
    difficulty: "normal",
    lives: 1,
    scorePerFood: 10,
    wrapAroundWalls: false,
  };
}

// ─────────────────────────────────────────────────────────────
// НОРМАЛИЗАЦИЯ КОНФИГА ОТ LLM
// ─────────────────────────────────────────────────────────────

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
    const m = v.trim().match(/^#?([0-9a-fA-F]{6,8})$/);
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

  const validShape = (v: any, fallback: ShapeName): ShapeName => {
    const shapes: ShapeName[] = ["circle", "square", "roundedSquare", "triangle", "hexagon", "star", "diamond"];
    return shapes.includes(v) ? v : fallback;
  };

  const validAnim = (v: any, fallback: AnimationName): AnimationName => {
    const anims: AnimationName[] = ["none", "pulse", "shake", "rotate", "bounce", "breathe", "glow"];
    return anims.includes(v) ? v : fallback;
  };

  const validBgType = (v: any, fallback: BackgroundType): BackgroundType => {
    const types: BackgroundType[] = ["solid", "gradient", "particles", "stars", "grid", "none"];
    return types.includes(v) ? v : fallback;
  };

  const validSound = (v: any, fallback: SoundType): SoundType => {
    const sounds: SoundType[] = ["pop", "coin", "beep", "chime", "click", "fail", "down", "softFail", "fanfare"];
    return sounds.includes(v) ? v : fallback;
  };

  const validPreset = (v: any): StylePreset | undefined => {
    const presets = Object.keys(STYLE_PRESETS) as StylePreset[];
    return presets.includes(v) ? v : undefined;
  };

  // Определяем стиль-пресет (если задан, берём его базу)
  const stylePreset = validPreset(raw.stylePreset);
  const baseConfig = stylePreset ? { ...def, ...STYLE_PRESETS[stylePreset], stylePreset } : def;

  // Цвета — из raw, потом из пресета, потом дефолт
  const colors = raw.colors && typeof raw.colors === "object" ? raw.colors : {};
  const baseColors = baseConfig.colors;

  // Спрайты
  const rawSprites = raw.sprites && typeof raw.sprites === "object" ? raw.sprites : {};
  const sprites = {
    player: normalizeSprite(rawSprites.player, def.sprites!.player!, baseColors.primary),
    food: normalizeSprite(rawSprites.food, def.sprites!.food!, baseColors.accent),
    obstacle: normalizeSprite(rawSprites.obstacle, def.sprites!.obstacle!, "#666666"),
    powerup: rawSprites.powerup ? normalizeSprite(rawSprites.powerup, undefined, baseColors.secondary ?? baseColors.primary) : undefined,
  };

  // Анимации
  const rawAnims = raw.animations && typeof raw.animations === "object" ? raw.animations : {};
  const animations: AnimationsConfig = {
    player: validAnim(rawAnims.player, baseConfig.animations?.player ?? "none"),
    food: validAnim(rawAnims.food, baseConfig.animations?.food ?? "none"),
    obstacle: validAnim(rawAnims.obstacle, baseConfig.animations?.obstacle ?? "none"),
    powerup: rawAnims.powerup ? validAnim(rawAnims.powerup, "none") : undefined,
  };

  // Тексты
  const rawTexts = raw.texts && typeof raw.texts === "object" ? raw.texts : {};
  const texts: GameTexts = {
    startTitle: safeStr(rawTexts.startTitle, def.texts?.startTitle ?? "", 40) || undefined,
    startHint: safeStr(rawTexts.startHint, def.texts?.startHint ?? "", 80) || undefined,
    gameOverTitle: safeStr(rawTexts.gameOverTitle, def.texts?.gameOverTitle ?? "", 40) || undefined,
    gameOverHint: safeStr(rawTexts.gameOverHint, def.texts?.gameOverHint ?? "", 80) || undefined,
    winTitle: safeStr(rawTexts.winTitle, def.texts?.winTitle ?? "", 40) || undefined,
    winHint: safeStr(rawTexts.winHint, def.texts?.winHint ?? "", 80) || undefined,
    restartButton: safeStr(rawTexts.restartButton, def.texts?.restartButton ?? "", 20) || undefined,
    scorePrefix: safeStr(rawTexts.scorePrefix, def.texts?.scorePrefix ?? "", 20) || undefined,
    tutorial: safeStr(rawTexts.tutorial, "", 120) || undefined,
  };

  // Фон
  const rawBg = raw.background && typeof raw.background === "object" ? raw.background : {};
  const background: BackgroundConfig = {
    type: validBgType(rawBg.type, baseConfig.background?.type ?? "solid"),
    gradient: rawBg.gradient ? {
      from: hex(rawBg.gradient.from, baseColors.background),
      to: hex(rawBg.gradient.to, baseColors.surface),
      angle: clamp(rawBg.gradient.angle, 0, 360, 180),
    } : baseConfig.background?.gradient,
    particles: rawBg.particles ? {
      count: clamp(rawBg.particles.count, 5, 200, 40),
      color: hex(rawBg.particles.color, baseColors.primary),
      size: clamp(rawBg.particles.size, 1, 8, 2),
      speed: clamp(rawBg.particles.speed, 0.05, 2, 0.2),
      shape: ["circle", "square", "star"].includes(rawBg.particles.shape) ? rawBg.particles.shape : "circle",
    } : baseConfig.background?.particles,
  };

  // Аудио
  const rawAudio = raw.audio && typeof raw.audio === "object" ? raw.audio : {};
  const baseAudio = baseConfig.audio ?? { enabled: false };
  const audio: GameAudio = {
    enabled: rawAudio.enabled === true || (rawAudio.enabled === undefined && baseAudio.enabled === true),
    volume: clamp(rawAudio.volume, 0, 1, 0.7),
    sounds: {
      eat: validSound(rawAudio.sounds?.eat, baseAudio.sounds?.eat ?? "pop"),
      gameOver: validSound(rawAudio.sounds?.gameOver, baseAudio.sounds?.gameOver ?? "softFail"),
      win: validSound(rawAudio.sounds?.win, "fanfare"),
      tap: validSound(rawAudio.sounds?.tap, "click"),
    },
  };

  return {
    title: safeStr(raw.title, def.title, 30),
    subtitle: safeStr(raw.subtitle, def.subtitle ?? "", 60) || undefined,
    genre,
    stylePreset,
    colors: {
      background: hex(colors.background, baseColors.background),
      surface: hex(colors.surface, baseColors.surface),
      primary: hex(colors.primary, baseColors.primary),
      secondary: colors.secondary ? hex(colors.secondary, baseColors.secondary ?? baseColors.primary) : baseColors.secondary,
      accent: hex(colors.accent, baseColors.accent),
      text: hex(colors.text, baseColors.text),
      grid: colors.grid ? hex(colors.grid, baseColors.grid ?? "#222222") : baseColors.grid,
      shadow: colors.shadow ? hex(colors.shadow, baseColors.shadow ?? "#000000") : baseColors.shadow,
      glow: colors.glow ? hex(colors.glow, baseColors.glow ?? baseColors.primary) : baseColors.glow,
    },
    background,
    sprites,
    animations,
    texts,
    audio,
    speed: clamp(raw.speed, 60, 400, def.speed),
    fontSize: clamp(raw.fontSize, 14, 28, def.fontSize),
    buttonSize: clamp(raw.buttonSize, 56, 96, def.buttonSize),
    gridSize: raw.gridSize ? clamp(raw.gridSize, 8, 30, def.gridSize ?? 18) : def.gridSize,
    difficulty: ["easy", "normal", "hard"].includes(raw.difficulty) ? raw.difficulty : "normal",
    lives: clamp(raw.lives, 1, 10, 1),
    scorePerFood: clamp(raw.scorePerFood, 1, 100, 10),
    wrapAroundWalls: raw.wrapAroundWalls === true,
  };
}

function normalizeSprite(raw: any, def: SpriteConfig | undefined, defaultColor: string): SpriteConfig | undefined {
  if (!raw || typeof raw !== "object") return def;
  const type = ["emoji", "shape", "pixel", "svg", "none"].includes(raw.type) ? raw.type : (def?.type ?? "shape");

  const base: SpriteConfig = { type };

  if (type === "emoji") {
    base.emoji = typeof raw.emoji === "string" ? raw.emoji.slice(0, 8) : (def?.emoji ?? "⭐");
  } else if (type === "shape") {
    const shapes = ["circle", "square", "roundedSquare", "triangle", "hexagon", "star", "diamond"];
    base.shape = shapes.includes(raw.shape) ? raw.shape : (def?.shape ?? "circle");
    base.size = typeof raw.size === "number" ? Math.max(0.3, Math.min(1.2, raw.size)) : (def?.size ?? 0.8);
    base.color = typeof raw.color === "string" && /^#?[0-9a-fA-F]{6,8}$/.test(raw.color.replace("#", "")) 
      ? `#${raw.color.replace("#", "")}` 
      : defaultColor;
    if (raw.outline) {
      base.outline = {
        width: Math.max(0, Math.min(6, Number(raw.outline.width) || 2)),
        color: typeof raw.outline.color === "string" ? raw.outline.color : "#00000040",
      };
    }
  } else if (type === "pixel") {
    if (raw.pixel && raw.pixel.grid && Array.isArray(raw.pixel.grid)) {
      const grid = raw.pixel.grid
        .filter((row: any) => typeof row === "string")
        .slice(0, 32)
        .map((row: string) => row.slice(0, 32));
      const palette = raw.pixel.palette && typeof raw.pixel.palette === "object" ? raw.pixel.palette : { "o": defaultColor, ".": "transparent" };
      base.pixel = {
        size: Math.max(8, Math.min(24, Number(raw.pixel.size) || grid.length || 16)),
        palette,
        grid,
      };
    } else {
      // Если pixel не задан — откатываемся на shape
      base.type = "shape";
      base.shape = "roundedSquare";
      base.size = 0.85;
      base.color = defaultColor;
    }
  } else if (type === "svg") {
    if (typeof raw.svg === "string" && raw.svg.length < 3000 && raw.svg.includes("<svg")) {
      base.svg = raw.svg;
    } else {
      base.type = "shape";
      base.shape = "circle";
      base.size = 0.8;
      base.color = defaultColor;
    }
  }

  return base;
}
