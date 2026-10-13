/**
 * Промпт для LLM: «верни конфиг, не пиши код».
 */
import type { Genre, Audience } from "../types.ts";

export function buildConfigPrompt(genre: Genre, audience: Audience, userPrompt: string): { system: string; user: string } {
  const system = `Ты — дизайнер игр. Пользователь хочет игру. Твоя задача — вернуть ТОЛЬКО JSON-конфиг с параметрами. НЕ пиши код.

ЖАНР: ${genre}
АУДИТОРИЯ: ${audience}

СХЕМА JSON (строго эти поля, ничего лишнего):
{
  "title": "string (1-30 символов, короткое название игры)",
  "subtitle": "string (0-60 символов, опционально)",
  "colors": {
    "background": "#hex (фон всего экрана)",
    "surface": "#hex (фон игрового поля)",
    "primary": "#hex (цвет змейки/игрока)",
    "accent": "#hex (цвет еды/цели)",
    "text": "#hex (цвет текста)",
    "grid": "#hex (цвет сетки, опционально)"
  },
  "emojis": {
    "player": "один emoji для игрока или пусто",
    "food": "один emoji для еды или пусто"
  },
  "speed": number (60-400 ms между шагами),
  "fontSize": number (16-24),
  "buttonSize": number (56-96),
  "gridSize": number (10-24),
  "texts": {
    "startHint": "string (короткая подсказка для старта)",
    "gameOverTitle": "string",
    "restartButton": "string (короткое, до 15 символов)",
    "scorePrefix": "string (например Счёт)"
  },
  "audio": { "enabled": true/false }
}

ПРАВИЛА ПОД АУДИТОРИЮ:
${audienceRule(audience)}

ПРАВИЛА ЦВЕТОВ (обязательно):
- Все цвета — валидные hex (#RRGGBB).
- Контраст текст/фон — высокий.
- Для elderly: спокойные, контрастные. Для kids: яркие насыщенные.
- НЕ используй чистый белый #ffffff и чистый чёрный #000000 одновременно.
- Фон и surface — тёмные оттенки (если не попрошено иначе).

ЖЁСТКИЕ ПРАВИЛА:
1. Верни ТОЛЬКО JSON. Без текста до, без текста после.
2. Без markdown-обёрток типа \`\`\`json.
3. Все поля обязательны, кроме subtitle, emojis, grid.
4. Название игры — на русском, короткое, связано с промптом.
5. Один emoji = один символ (несколько байт utf-8 — ок).

ОТВЕЧАЙ ТОЛЬКО JSON.`;

  const user = `Запрос: "${userPrompt}"

Верни JSON-конфиг для игры.`;

  return { system, user };
}

function audienceRule(audience: Audience): string {
  switch (audience) {
    case "elderly":
      return `- speed: 250-320 ms (медленно!)
- fontSize: 22-24
- buttonSize: 76-96
- gridSize: 14-18 (крупные клетки)
- Цвета: тёплые, спокойные, без кислотных. Контраст высокий.
- Тексты: короткие, понятные, без сленга.
- audio: enabled: false (пожилым не нужны бипы)`;
    case "kids":
      return `- speed: 140-200 ms
- fontSize: 20-24
- buttonSize: 76-96
- gridSize: 16-22
- Цвета: яркие, насыщенные, весёлые.
- Тексты: игровые, добрые.
- emojis: обязательно player и food (простые, яркие)
- audio: enabled: true`;
    case "hardcore":
      return `- speed: 70-110 ms (быстро!)
- fontSize: 16-18
- buttonSize: 60-72
- gridSize: 20-24 (мелкая сетка)
- Цвета: тёмная тема, неон.
- Тексты: короткие, минималистичные.
- audio: enabled: true`;
    default:
      return `- speed: 130-180 ms
- fontSize: 18-22
- buttonSize: 64-80
- gridSize: 16-20
- Цвета: сбалансированные, современные.
- audio: enabled: true`;
  }
}
