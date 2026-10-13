/**
 * Умный парсер ответа LLM → GameConfig.
 * Стратегии: JSON → key:value → null (default).
 */
import type { Genre } from "../types.ts";

export interface ParseResult {
  config: any | null;
  strategy: "json" | "keyvalue" | "none";
  raw: string;
}

export function parseLLMResponse(text: string, genre: Genre): ParseResult {
  const cleaned = stripMarkdown(text);

  const jsonResult = tryParseJSON(cleaned);
  if (jsonResult) {
    return { config: jsonResult, strategy: "json", raw: cleaned };
  }

  const kv = parseKeyValue(cleaned);
  if (kv && Object.keys(kv).length >= 3) {
    return {
      config: keyValueToConfig(kv, genre),
      strategy: "keyvalue",
      raw: cleaned,
    };
  }

  return { config: null, strategy: "none", raw: cleaned };
}

// ─────────────────────────────────────────────────────────────
// JSON
// ─────────────────────────────────────────────────────────────

function tryParseJSON(text: string): any | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const candidates: string[] = [];
  const full = text.slice(start, end + 1);
  candidates.push(full);
  candidates.push(fixCommonJSONErrors(full));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isGameConfigLike(parsed)) return parsed;
    } catch { /* next */ }
  }
  return null;
}

function fixCommonJSONErrors(text: string): string {
  return text.replace(/,(\s*[}\]])/g, "$1");
}

function isGameConfigLike(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  return Boolean(obj.title || obj.colors || obj.speed || obj.sprites || obj.genre);
}

// ─────────────────────────────────────────────────────────────
// key:value
// ─────────────────────────────────────────────────────────────

function parseKeyValue(text: string): Record<string, any> | null {
  const result: Record<string, any> = {};
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^[#\-*=]{2,}/.test(line)) continue;
    if (/^```/.test(line)) continue;

    const m = line.match(
      /^(?:\d+\.\s*)?([a-zA-Zа-яА-Я_][a-zA-Zа-яА-Я0-9_]*)\s*[:：=]\s*(.*?)\s*$/,
    );
    if (!m) continue;

    const rawKey = m[1].toLowerCase();
    const value = m[2].replace(/^["']|["']$/g, "").trim();
    if (!value) continue;

    const key = resolveKey(rawKey);
    if (!key) continue;

    if (/^\d+$/.test(value)) {
      result[key] = Number(value);
    } else if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      result[key] = value;
    } else if (/^[0-9a-fA-F]{6}$/.test(value)) {
      result[key] = `#${value}`;
    } else {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

const KEY_ALIASES: Record<string, string> = {
  title: "title", название: "title", имя: "title",
  speed: "speed", скорость: "speed", темп: "speed",
  gridsize: "gridSize", grid: "gridSize", сетка: "gridSize", размерсетки: "gridSize",
  fontsize: "fontSize", шрифт: "fontSize",
  buttonsize: "buttonSize", кнопки: "buttonSize",
  bg: "bg", background: "bg", фон: "bg", цветфона: "bg",
  surface: "surface", поле: "surface", цветполя: "surface",
  primary: "primary", змейка: "primary", игрок: "primary",
  accent: "accent", еда: "accent",
  text: "text", текст: "text", цветтекста: "text",
  gridcolor: "grid", grid_color: "grid", glow: "glow", свечение: "glow",
  emojifood: "emojiFood", foodemoji: "emojiFood", едаemoji: "emojiFood",
  emojiplayer: "emojiPlayer", playeremoji: "emojiPlayer", игрокemoji: "emojiPlayer",
  gameovertitle: "gameOverTitle", проигрыш: "gameOverTitle",
  restartbutton: "restartButton", кнопказаново: "restartButton",
  scoreprefix: "scorePrefix", счёт: "scorePrefix",
  starthint: "startHint", подсказка: "startHint",
  audio: "audio", звук: "audio",
};

function resolveKey(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
  return raw;
}

/**
 * Мапит плоский key:value объект в структуру GameConfig-like.
 * ВАЖНО: emojiFood/emojiPlayer превращаем в sprites.food/player с type="emoji".
 */
function keyValueToConfig(kv: Record<string, any>, genre: Genre): any {
  const result: any = {
    title: kv.title,
    speed: kv.speed,
    gridSize: kv.gridSize,
    fontSize: kv.fontSize,
    buttonSize: kv.buttonSize,
    genre,
    colors: {},
    sprites: {},
    texts: {},
  };

  // Цвета
  if (kv.bg) result.colors.background = kv.bg;
  if (kv.surface) result.colors.surface = kv.surface;
  if (kv.primary) result.colors.primary = kv.primary;
  if (kv.accent) result.colors.accent = kv.accent;
  if (kv.text) result.colors.text = kv.text;
  if (kv.grid) result.colors.grid = kv.grid;
  if (kv.glow) result.colors.glow = kv.glow;

  // Emoji → sprites
  if (kv.emojiFood && typeof kv.emojiFood === "string") {
    result.sprites.food = {
      type: "emoji",
      emoji: kv.emojiFood,
    };
  }
  if (kv.emojiPlayer && typeof kv.emojiPlayer === "string" && kv.emojiPlayer.length > 0) {
    result.sprites.player = {
      type: "emoji",
      emoji: kv.emojiPlayer,
    };
  }
  if (kv.clickerEmoji && typeof kv.clickerEmoji === "string") {
    result.sprites.player = {
      type: "emoji",
      emoji: kv.clickerEmoji,
    };
  }

  // Тексты
  if (kv.gameOverTitle) result.texts.gameOverTitle = kv.gameOverTitle;
  if (kv.restartButton) result.texts.restartButton = kv.restartButton;
  if (kv.scorePrefix) result.texts.scorePrefix = kv.scorePrefix;
  if (kv.startHint) result.texts.startHint = kv.startHint;

  // Audio
  if (kv.audio !== undefined) {
    const enabled = String(kv.audio).toLowerCase();
    result.audio = { enabled: enabled === "true" || enabled === "да" || enabled === "1" };
  }

  // Убираем пустые под-объекты
  if (Object.keys(result.colors).length === 0) delete result.colors;
  if (Object.keys(result.sprites).length === 0) delete result.sprites;
  if (Object.keys(result.texts).length === 0) delete result.texts;

  return result;
}

// ─────────────────────────────────────────────────────────────
// Общая чистка
// ─────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:json|text|yaml)?\s*\n?/i, "");
  s = s.replace(/\n?```\s*$/i, "");
  s = s.replace(/<[^>]+>/g, "");
  return s.trim();
}
