/**
 * Классификатор промпта: естественный язык → GameSpec.
 */
import type {
  Audience, Constraints, GameSpec, Genre, Mechanic, UserInput,
} from "../types.ts";

const GENRE_KEYWORDS: Record<Exclude<Genre, "unknown">, string[]> = {
  snake: ["змейк", "змея", "snake", "червяк"],
  clicker: ["кликер", "кликай", "тапай", "clicker", "печеньк", "cookie"],
  platformer: ["платформер", "прыга", "марио", "platformer"],
  puzzle: ["головоломк", "пазл", "три в ряд", "match-3", "пятнашк", "puzzle"],
  runner: ["раннер", "runner", "беги", "бесконечн"],
  memory: ["memory", "мемори", "найди пар", "пары", "карточк"],
  shooter: ["шутер", "стрел", "shooter", "космическ", "invaders", "тир"],
  breakout: ["арканоид", "breakout", "кирпич", "arkanoid"],
  "2048": ["2048", "плитк", "сложи числа"],
  tower: ["башн", "tower", "stack", "стакан", "стройк"],
  racing: ["гонк", "racing", "машин", "тачк", "скорост", "дрифт", "drift"],
  fighting: ["файтинг", "драк", "боев", "мортал", "fighting", "удар"],
  tanks: ["танк", "tank", "артиллер", "пушк", "снаряд"],
  tictactoe: ["крестик", "нолик", "tic tac", "x и o", "три в ряд x o"],
};

const AUDIENCE_KEYWORDS: Record<Audience, string[]> = {
  elderly: ["бабушк", "дедушк", "пожил", "старик", "старш"],
  kids: ["ребен", "ребён", "дет", "малыш", "kid", "для детей"],
  hardcore: ["хардкор", "сложн", "hardcore", "для про", "для опытн"],
  default: [],
};

const MECHANIC_KEYWORDS: Record<Mechanic, string[]> = {
  grow: ["растёт", "растет", "растущ"],
  collect: ["собира", "сбор", "монет", "collect"],
  avoid: ["избега", "уворач", "avoid", "препятств"],
  jump: ["прыга", "прыж", "jump"],
  match: ["совпад", "одинаков", "match", "тройк"],
  tap: ["тап", "клик", "tap", "нажима"],
  drag: ["перетаск", "drag", "двига"],
  swipe: ["свайп", "swipe", "жест"],
  combo: ["комбо", "combo", "серия"],
  timer: ["таймер", "на время", "за N секунд"],
  levels: ["уровн", "levels", "этап"],
  upgrade: ["апгрейд", "прокач", "upgrade"],
  score: ["счёт", "счет", "очк", "score"],
  lives: ["жизн", "lives", "попытк"],
};

const THEME_KEYWORDS: Record<string, string[]> = {
  "космос": ["космос", "космич", "звезд", "звёзд", "space", "планет"],
  "дача": ["дач", "огород", "сад", "грядк"],
  "котики": ["кот", "кошк", "котик", "cat"],
  "море": ["мор", "океан", "рыб", "sea"],
  "лес": ["лес", "гриб", "дерев", "forest"],
  "город": ["город", "машин", "city", "улиц"],
  "еда": ["еда", "пицц", "бургер", "food", "печеньк"],
  "динозавры": ["динозавр", "dino", "рекс"],
  "роботы": ["робот", "robot", "механ"],
  "новый год": ["новый год", "ёлка", "елка", "дед мороз", "снег"],
};

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function detectGenre(prompt: string): { genre: Genre; confidence: number } {
  for (const [genre, kws] of Object.entries(GENRE_KEYWORDS) as [Genre, string[]][]) {
    if (includesAny(prompt, kws)) return { genre, confidence: 0.9 };
  }
  if (/карт|пазл|головолом/i.test(prompt)) return { genre: "puzzle", confidence: 0.5 };
  if (/прыг|бег|платф/i.test(prompt)) return { genre: "platformer", confidence: 0.5 };
  if (/тап|клик|нажим/i.test(prompt)) return { genre: "clicker", confidence: 0.5 };
  return { genre: "unknown", confidence: 0.2 };
}

function detectAudience(prompt: string, explicit?: Audience): Audience {
  if (explicit) return explicit;
  for (const [aud, kws] of Object.entries(AUDIENCE_KEYWORDS) as [Audience, string[]][]) {
    if (aud !== "default" && includesAny(prompt, kws)) return aud;
  }
  return "default";
}

function detectMechanics(prompt: string, genre: Genre): Mechanic[] {
  const found = new Set<Mechanic>();
  for (const [m, kws] of Object.entries(MECHANIC_KEYWORDS) as [Mechanic, string[]][]) {
    if (includesAny(prompt, kws)) found.add(m);
  }
  switch (genre) {
    case "snake": found.add("grow"); found.add("collect"); found.add("score"); break;
    case "clicker": found.add("tap"); found.add("upgrade"); found.add("score"); break;
    case "platformer": found.add("jump"); found.add("collect"); found.add("levels"); break;
    case "puzzle": found.add("match"); found.add("levels"); break;
    case "runner": found.add("avoid"); found.add("jump"); found.add("score"); break;
    case "memory": found.add("match"); found.add("tap"); found.add("score"); break;
    case "shooter": found.add("lives"); found.add("score"); break;
    case "breakout": found.add("lives"); found.add("score"); break;
    case "2048": found.add("swipe"); found.add("score"); break;
    case "tower": found.add("tap"); found.add("score"); break;
    case "racing": found.add("avoid"); found.add("score"); break;
    case "fighting": found.add("lives"); found.add("combo"); break;
    case "tanks": found.add("lives"); found.add("score"); break;
    case "tictactoe": found.add("tap"); found.add("match"); break;
  }
  return [...found];
}

function detectTheme(prompt: string): string | undefined {
  for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
    if (includesAny(prompt, kws)) return theme;
  }
  return undefined;
}

function detectConstraints(prompt: string, audience: Audience): Constraints {
  const c: Constraints = { mobile: true };
  if (audience === "elderly") {
    c.largeElements = true; c.highContrast = true; c.noTimer = true;
  }
  if (audience === "kids") c.largeElements = true;
  if (/без таймер|без времен|не спеш/i.test(prompt)) c.noTimer = true;
  if (/контраст/i.test(prompt)) c.highContrast = true;
  if (/дальтон|цвет.*безоп/i.test(prompt)) c.colorblindSafe = true;
  if (/без звук|тих/i.test(prompt)) c.noSound = true;
  return c;
}

export function classify(input: UserInput | string): GameSpec {
  const obj: UserInput = typeof input === "string" ? { prompt: input } : input;
  const prompt = obj.prompt;

  const { genre, confidence } = detectGenre(prompt);
  const audience = detectAudience(prompt, obj.audience);
  const mechanics = detectMechanics(prompt, genre);
  const theme = obj.theme ?? detectTheme(prompt);
  const constraints = detectConstraints(prompt, audience);

  return { genre, audience, theme, mechanics, constraints, rawPrompt: prompt, confidence };
}
