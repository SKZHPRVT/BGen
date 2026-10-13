/**
 * Промпт для LLM: «верни JSON-конфиг для игры».
 * Жёсткое требование — только JSON, никакого HTML.
 */
import type { Genre, Audience } from "../types.ts";

export function buildConfigPrompt(
  genre: Genre,
  audience: Audience,
  userPrompt: string,
): { system: string; user: string } {
  const system = `Ты — API, который возвращает JSON. ТВОЯ РАБОТА — ВЕРНУТЬ ТОЛЬКО JSON-ОБЪЕКТ. 

КРИТИЧНО, ЧИТАЙ ВНИМАТЕЛЬНО:
- НЕ пиши HTML. НЕ пиши <!DOCTYPE html>. НЕ пиши <html>. НЕ пиши <script>. НЕ пиши <style>.
- НЕ пиши CSS. НЕ пиши JavaScript. НЕ пиши код игры.
- НЕ пиши текст до JSON. НЕ пиши текст после JSON.
- НЕ оборачивай в \`\`\`json.
- Только JSON-объект, начинающийся с { и заканчивающийся }.

ТЫ НЕ ГЕНЕРИРУЕШЬ ИГРУ. ТЫ ГЕНЕРИРУЕШЬ КОНФИГ ДЛЯ ИГРЫ, которую уже написали другие.
Игра уже существует, работает, ты только настраиваешь цвета/название/спрайты.

ЖАНР: ${genre}
АУДИТОРИЯ: ${audience}

СХЕМА JSON:
{
  "title": "string (1-30, на русском)",
  "subtitle": "string (опционально)",
  "stylePreset": "cozy|neon|retro8bit|minimal|space|forest|candy|cyberpunk|papercraft|nature",

  "colors": {
    "background": "#hex",
    "surface": "#hex",
    "primary": "#hex",
    "secondary": "#hex (опционально)",
    "accent": "#hex",
    "text": "#hex",
    "grid": "#hex (опционально)",
    "glow": "#hex (опционально)"
  },

  "background": {
    "type": "solid|gradient|particles|stars|grid",
    "gradient": { "from": "#hex", "to": "#hex", "angle": 180 },
    "particles": { "count": 30, "color": "#hex", "size": 2, "speed": 0.2, "shape": "circle" }
  },

  "sprites": {
    "player": { "type": "emoji|shape", "emoji": "🐍", "shape": "roundedSquare", "size": 0.85, "color": "#hex" },
    "food": { "type": "emoji|shape", "emoji": "🍎", "shape": "circle", "size": 0.7, "color": "#hex" }
  },

  "animations": {
    "player": "none|pulse|breathe|shake|glow",
    "food": "none|pulse|bounce|glow"
  },

  "texts": {
    "startHint": "string",
    "gameOverTitle": "string",
    "gameOverHint": "string (можно {score})",
    "restartButton": "string (до 15)",
    "scorePrefix": "string"
  },

  "audio": {
    "enabled": true/false,
    "sounds": {
      "eat": "pop|coin|chime",
      "gameOver": "softFail|down|fail"
    }
  },

  "speed": 60-400,
  "fontSize": 16-24,
  "buttonSize": 56-96,
  "gridSize": 10-24
}

ПРАВИЛА ПО АУДИТОРИИ:
${audienceRule(audience)}

ВЫБОР ВИЗУАЛА:
- Emoji для узнаваемых объектов (🍎 🐱 ⭐).
- Shape для простых (круг, квадрат, скруглённый квадрат).
- stylePreset — общее настроение (cozy, neon, space, candy).

Пример ответа (только JSON, без \`\`\`):
{"title":"Змейка для бабушки","stylePreset":"cozy","colors":{"background":"#fdf6e3","surface":"#f5e6c8","primary":"#2a7f62","accent":"#c0392b","text":"#2c1810","grid":"#e8d4a8"},"sprites":{"player":{"type":"shape","shape":"roundedSquare","size":0.85,"color":"#2a7f62"},"food":{"type":"emoji","emoji":"🍎"}},"speed":280,"fontSize":22,"buttonSize":80,"gridSize":14,"texts":{"startHint":"Свайпайте","gameOverTitle":"Игра окончена","restartButton":"Заново","scorePrefix":"Счёт"}}

ОТВЕЧАЙ ТОЛЬКО JSON.`;

  const user = `Запрос: "${userPrompt}"

Верни ТОЛЬКО JSON-объект. Без HTML. Без кода. Без \`\`\`.`;

  return { system, user };
}

function audienceRule(audience: Audience): string {
  switch (audience) {
    case "elderly":
      return `- speed: 240-320
- fontSize: 22-24
- buttonSize: 76-96
- gridSize: 12-16
- stylePreset: cozy, papercraft или nature
- Тёплые, спокойные цвета
- emoji для еды (🍎 🍒 🍇)`;
    case "kids":
      return `- speed: 140-200
- fontSize: 20-24
- buttonSize: 76-96
- gridSize: 14-18
- stylePreset: candy, cozy
- Яркие насыщенные цвета
- emoji для еды (🍕 🍩 🌈) и игрока (🐱 🐶 🐸)`;
    case "hardcore":
      return `- speed: 70-110
- fontSize: 16-18
- buttonSize: 60-72
- gridSize: 20-24
- stylePreset: neon, cyberpunk
- Тёмная тема, неон`;
    default:
      return `- speed: 130-180
- fontSize: 18-22
- buttonSize: 64-80
- gridSize: 16-20
- stylePreset: на выбор (space, forest, cozy)`;
  }
}
