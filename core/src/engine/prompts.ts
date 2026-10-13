/**
 * Промпт для LLM: «верни JSON-конфиг для игры».
 * Полная schema со всеми визуальными фишками.
 */
import type { Genre, Audience } from "../types.ts";

export function buildConfigPrompt(
  genre: Genre,
  audience: Audience,
  userPrompt: string,
): { system: string; user: string } {
  const system = `Ты — геймдизайнер и арт-директор. Пользователь хочет игру. Ты возвращаешь ТОЛЬКО JSON-конфиг с параметрами. НЕ пиши код.

ЖАНР: ${genre}
АУДИТОРИЯ: ${audience}

ПОЛНАЯ СХЕМА JSON:
{
  "title": "string (1-30, название игры на русском)",
  "subtitle": "string (0-60, опционально)",
  "stylePreset": "cozy|neon|retro8bit|minimal|space|forest|candy|cyberpunk|papercraft|nature",

  "colors": {
    "background": "#hex (фон всего экрана)",
    "surface": "#hex (фон игрового поля)",
    "primary": "#hex (цвет игрока)",
    "secondary": "#hex (вторичный, опционально)",
    "accent": "#hex (цвет еды/цели)",
    "text": "#hex (цвет текста)",
    "grid": "#hex (сетка, опционально)",
    "glow": "#hex (свечение, опционально)"
  },

  "background": {
    "type": "solid|gradient|particles|stars|grid",
    "gradient": { "from": "#hex", "to": "#hex", "angle": 0-360 },
    "particles": { "count": 5-100, "color": "#hex", "size": 1-5, "speed": 0.1-1, "shape": "circle|square|star" }
  },

  "sprites": {
    "player": {
      "type": "emoji|shape|pixel|svg",
      "emoji": "🐱",
      "shape": "circle|square|roundedSquare|triangle|hexagon|star|diamond",
      "size": 0.5-1.0,
      "color": "#hex",
      "outline": { "width": 0-4, "color": "#hex" },
      "pixel": {
        "size": 12-20,
        "palette": { "o": "#hex", "w": "#hex", ".": "transparent" },
        "grid": ["....oo....", "...oooo...", "..."]
      }
    },
    "food": { "type": "emoji|shape|pixel", "emoji": "🍎", "shape": "circle", "size": 0.7, "color": "#hex" },
    "obstacle": { /* аналогично */ },
    "powerup": { /* аналогично */ }
  },

  "animations": {
    "player": "none|pulse|breathe|shake|rotate|bounce|glow",
    "food": "none|pulse|bounce|rotate|glow",
    "obstacle": "none|shake|breathe"
  },

  "texts": {
    "startTitle": "string",
    "startHint": "string",
    "gameOverTitle": "string",
    "gameOverHint": "string (можно {score})",
    "winTitle": "string",
    "restartButton": "string (до 15 символов)",
    "scorePrefix": "string",
    "tutorial": "string (0-120, опционально)"
  },

  "audio": {
    "enabled": true/false,
    "volume": 0.0-1.0,
    "sounds": {
      "eat": "pop|coin|beep|chime",
      "gameOver": "fail|down|softFail",
      "win": "fanfare|chime",
      "tap": "click|beep"
    }
  },

  "speed": number (60-400 ms между шагами),
  "fontSize": number (16-24),
  "buttonSize": number (56-96),
  "gridSize": number (10-24),
  "difficulty": "easy|normal|hard",
  "lives": number (1-5),
  "scorePerFood": number (1-50),
  "wrapAroundWalls": true/false
}

ПРАВИЛА ПО АУДИТОРИИ:
${audienceRule(audience)}

ВИЗУАЛЬНЫЕ ПРАВИЛА:

1. ВЫБОР СПРАЙТА:
   - Если объект — узнаваемое emoji (яблоко, котик, звезда, гриб) → type: "emoji"
   - Если объект простой геометрический (шар, блок) → type: "shape"
   - Если объект должен выглядеть авторским и стилизованным (пиксельный слон, космокот, робот) → type: "pixel"
     • grid: массив строк одинаковой длины (8-20 символов каждая)
     • каждая буква = цвет из palette, точка = прозрачный
     • рисуй простые узнаваемые формы

2. ВЫБОР СТИЛЯ (stylePreset):
   - "бабушка/уют" → cozy, forest, papercraft
   - "ребёнок/яркое" → candy
   - "космос/звёзды" → space
   - "неон/киберпанк" → neon, cyberpunk
   - "минимализм" → minimal
   - "ретро/8бит" → retro8bit

3. АНИМАЦИИ:
   - Еда: pulse или bounce
   - Игрок: breathe (спокойно) или none
   - Препятствия: shake (если пугающие)

4. ЦВЕТА:
   - Все цвета — hex (#RRGGBB).
   - Высокий контраст текста/фона.
   - Для elderly: приглушённые, тёплые, пастельные.
   - Для kids: яркие, насыщенные.
   - Для hardcore: тёмная тема, неон.

ЖЁСТКИЕ ПРАВИЛА:
1. Верни ТОЛЬКО JSON. Ничего до, ничего после.
2. Без markdown-обёрток \`\`\`json.
3. Все поля обязательны, кроме помеченных "опционально".
4. Название — на русском, короткое, отражает промпт.

ОТВЕЧАЙ ТОЛЬКО JSON.`;

  const user = `Запрос: "${userPrompt}"

Верни JSON-конфиг для игры.`;

  return { system, user };
}

function audienceRule(audience: Audience): string {
  switch (audience) {
    case "elderly":
      return `- speed: 240-320 ms
- fontSize: 22-24
- buttonSize: 76-96
- gridSize: 12-16 (крупные клетки)
- Цвета: тёплые, спокойные, пастельные.
- Избегай чистого белого и ярких кислотных цветов.
- sprite.player — простой shape (круг/квадрат), не pixel.
- Анимации: breathe, pulse (спокойные).
- audio.enabled: false (пожилым не нужны бипы)`;
    case "kids":
      return `- speed: 140-200 ms
- fontSize: 20-24
- buttonSize: 76-96
- gridSize: 14-18
- Цвета: яркие, весёлые.
- sprite.player/food — emoji (🐱 🍎 🌟) или pixel.
- Анимации: bounce, pulse.
- audio.enabled: true, звуки pop/coin`;
    case "hardcore":
      return `- speed: 70-110 ms
- fontSize: 16-18
- buttonSize: 60-72
- gridSize: 20-24
- Цвета: тёмная тема, неон.
- stylePreset: neon или cyberpunk.
- Анимации: glow, pulse.
- audio.enabled: true`;
    default:
      return `- speed: 130-180 ms
- fontSize: 18-22
- buttonSize: 64-80
- gridSize: 16-20
- Сбалансированные цвета.
- Можно emoji или простой shape.`;
  }
}
