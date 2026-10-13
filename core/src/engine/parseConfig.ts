/**
 * Умный парсер ответа LLM → GameConfig.
 *
 * Три стратегии по убыванию надёжности:
 *   1. JSON-объект внутри текста
 *   2. Формат key:value построчно (наш основной)
 *   3. Возврат null (вызовет defaultConfig)
 *
 * GigaChat-7B часто ломает JSON (кавычки, запятые). Поэтому
 * key:value построчно — самый надёжный формат.
 */
import type { Genre } from "../types.ts";

export interface ParseResult {
  config: any | null;
  strategy: "json" | "keyvalue" | "none";
  raw: string;
}

/**
 * Главная функция парсинга.
 * Возвращает конфиг в виде объекта (не GameConfig, а "сырой" для normalizeConfig).
 */
export function parseLLMResponse(text: string, genre: Genre): ParseResult {
  const cleaned = stripMarkdown(text);

  // Стратегия 1: JSON
  const jsonResult = tryParseJSON(cleaned);
  if (jsonResult) {
    return { config: jsonResult, strategy: "json", raw: cleaned };
  }

  // Стратегия 2: key:value
  const kv = parseKeyValue(cleaned);
  if (kv && Object.keys(kv).length >= 3) {
    return {
      config: keyValueToConfig(kv, genre),
      strategy: "keyvalue",
      raw: cleaned,
    };
  }

  // Ничего не получилось
  return { config: null, strategy: "none", raw: cleaned };
}

// ─────────────────────────────────────────────────────────────
// Стратегия 1: JSON
// ─────────────────────────────────────────────────────────────

function tryParseJSON(text: string): any | null {
  // Ищем первый { и последний }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  // Пробуем несколько вариантов — полный, обрезанный, очищенный
  const candidates: string[] = [];

  const full = text.slice(start, end + 1);
  candidates.push(full);
  candidates.push(fixCommonJSONErrors(full));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isGameConfigLike(parsed)) return parsed;
    } catch {
      // пробуем следующий
    }
  }
  return null;
}

/**
 * Пытается починить типичные ошибки GigaChat в JSON:
 * - висячие запятые перед }
 * - одинарные кавычки вместо двойных
 * - лишние запятые в массивах
 */
function fixCommonJSONErrors(text: string): string {
  let s = text;
  // Одинарные кавычки → двойные (грубо, только для ключей и строк)
  // Убираем trailing comma перед } и ]
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

function isGameConfigLike(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  // Хотя бы одно из ключевых полей есть
  return Boolean(
    obj.title ||
    obj.colors ||
    obj.speed ||
    obj.sprites ||
    obj.genre,
  );
}

// ─────────────────────────────────────────────────────────────
// Стратегия 2: key:value построчно
// ─────────────────────────────────────────────────────────────

/**
 * Парсит текст в формате:
 *   key: value
 *   key2: value2
 *
 * Поддерживает:
 *   - опциональную нумерацию в начале ("1. title: ...")
 *   - двоеточие в значениях ("url: https://...")
 *   - русские названия ключей (мапятся через KEY_ALIASES)
 *   - hex-цвета с/без решётки
 */
function parseKeyValue(text: string): Record<string, any> | null {
  const result: Record<string, any> = {};
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Пропускаем строки-разделители, markdown, комментарии
    if (/^[#\-*=]{2,}/.test(line)) continue;
    if (/^```/.test(line)) continue;

    // Паттерн: [номер.] ключ [:：=] значение
    const m = line.match(
      /^(?:\d+\.\s*)?([a-zA-Zа-яА-Я_][a-zA-Zа-яА-Я0-9_]*)\s*[:：=]\s*(.*?)\s*$/,
    );
    if (!m) continue;

    const rawKey = m[1].toLowerCase();
    const value = m[2].replace(/^["']|["']$/g, "").trim();
    if (!value) continue;

    const key = resolveKey(rawKey);
    if (!key) continue;

    // Типы
    if (/^\d+$/.test(value)) {
      result[key] = Number(value);
    } else if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      result[key] = value;
    } else if (/^[0-9a-fA-F]{6}$/.test(value)) {
      // hex без #
      result[key] = `#${value}`;
    } else {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Алиасы ключей — что GigaChat может написать → что мы ожидаем.
 * Поддерживаем русские названия, варианты написания.
 */
const KEY_ALIASES: Record<string, string> = {
  // title
  title: "title",
  название: "title",
  имя: "title",

  // speed
  speed: "speed",
  скорость: "speed",
  темп: "speed",

  // grid
  gridsize: "gridSize",
  grid: "gridSize",
  сетка: "gridSize",
  размерсетки: "gridSize",

  // font
  fontsize: "fontSize",
  шрифт: "fontSize",
  размершрифта: "fontSize",

  // buttons
  buttonsize: "buttonSize",
  кнопки: "buttonSize",

  // colors
  bg: "bg",
  background: "bg",
  фон: "bg",
  цветфона: "bg",
  surface: "surface",
  поле: "surface",
  цветполя: "surface",
  primary: "primary",
  змейка: "primary",
  игрок: "primary",
  accent: "accent",
  еда: "accent",
  text: "text",
  текст: "text",
  цветтекста: "text",
  gridcolor: "grid",
  grid_color: "grid",
  glow: "glow",
  свечение: "glow",

  // emoji
  emojifood: "emojiFood",
  foodemoji: "emojiFood",
  едаemoji: "emojiFood",
  emojiplayer: "emojiPlayer",
  playeremoji: "emojiPlayer",
  игрокemoji: "emojiPlayer",

  // texts
  gameovertitle: "gameOverTitle",
  проигрыш: "gameOverTitle",
  restartbutton: "restartButton",
  кнопказаново: "restartButton",
  scoreprefix: "scorePrefix",
  счёт: "scorePrefix",
  starthint: "startHint",
  подсказка: "startHint",

  // audio
  audio: "audio",
  звук: "audio",
};

function resolveKey(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
  // Если ключ уже валидный (title, speed, emojiFood) — оставляем
  return raw;
}

/**
 * Мапит плоский key:value объект в структуру GameConfig-like.
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
    emojis: {},
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

  // Emoji
  if (kv.emojiFood) result.emojis.food = kv.emojiFood;
  if (kv.emojiPlayer) result.emojis.player = kv.emojiPlayer;

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

  // Убираем пустые под-объекты (иначе normalizeConfig может неправильно понять)
  if (Object.keys(result.colors).length === 0) delete result.colors;
  if (Object.keys(result.emojis).length === 0) delete result.emojis;
  if (Object.keys(result.texts).length === 0) delete result.texts;

  return result;
}

// ─────────────────────────────────────────────────────────────
// Общая чистка ответа
// ─────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  let s = text.trim();
  // Снимаем обёртку ```json ... ``` или ``` ... ```
  s = s.replace(/^```(?:json|text|yaml)?\s*\n?/i, "");
  s = s.replace(/\n?```\s*$/i, "");
  // Убираем HTML-теги если вдруг GigaChat вставил
  s = s.replace(/<[^>]+>/g, "");
  return s.trim();
}
