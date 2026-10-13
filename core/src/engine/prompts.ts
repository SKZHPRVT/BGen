/**
 * Промпт для LLM: key:value конфиг. Поля зависят от жанра и аудитории.
 */
import type { Genre, Audience } from "../types.ts";

export function buildConfigPrompt(
  genre: Genre,
  audience: Audience,
  userPrompt: string,
): { system: string; user: string } {
  const fieldsBlock = getFieldsForGenre(genre, audience);

  const system = `Ты — настройщик игры. Игра УЖЕ написана и работает. Твоя задача — заполнить поля настройки.

ФОРМАТ ОТВЕТА — СТРОГО "ключ: значение", по одной строке:
- Пиши ТОЛЬКО эти строки, ничего больше.
- НЕ пиши HTML, CSS, JavaScript, JSON.
- НЕ оборачивай в \`\`\`.
- После значения — сразу перенос строки.

ЖАНР: ${genre}
АУДИТОРИЯ: ${audience}

${fieldsBlock}

ПРИМЕР (12 строк):
${exampleForGenre(genre)}

ТВОЙ ОТВЕТ — те же поля, только с твоими значениями. Ничего другого.`;

  const user = `Запрос: "${userPrompt}"

Заполни поля. Только "ключ: значение".`;
  return { system, user };
}

function getFieldsForGenre(genre: Genre, audience: Audience): string {
  const common = `1. title — название на русском, до 30 символов, отражает промпт
2. speed — ${speedRange(audience)} (для grid-игр — пауза между шагами; для кликера/2048 не критично)
3. gridSize — ${gridRange(audience)} (размер сетки, для snake/memory/2048)
4. bg — hex-цвет фона #RRGGBB, ${bgHint(audience)}
5. surface — hex-цвет игрового поля, чуть темнее bg
6. primary — hex-цвет игрока/основного элемента
7. accent — hex-цвет еды/цели/препятствия
8. text — hex-цвет текста, ${textHint(audience)}
9. emojiFood — один emoji для еды/цели (🍎 🌟 🍕) или пусто
10. emojiPlayer — один emoji для игрока или пусто
11. gameOverTitle — текст при проигрыше, короткий
12. restartButton — надпись кнопки рестарта, до 15 символов`;

  if (genre === "clicker") {
    return common + `
13. clickerEmoji — emoji для кликера (👆 🐱 🍪)`;
  }
  return common;
}

function exampleForGenre(genre: Genre): string {
  const base = `title: Змейка для бабушки
speed: 280
gridSize: 14
bg: #fdf6e3
surface: #f5e6c8
primary: #2a7f62
accent: #c0392b
text: #2c1810
emojiFood: 🍎
emojiPlayer: 
gameOverTitle: Игра окончена
restartButton: Заново`;

  if (genre === "clicker") {
    return `title: Кликер с котиками
speed: 150
gridSize: 16
bg: #fff0f6
surface: #ffe0ec
primary: #ff6ec7
accent: #7ee8fa
text: #5a2a4a
emojiFood: 🍪
emojiPlayer: 🐱
gameOverTitle: Хватит!
restartButton: Заново
clickerEmoji: 🐱`;
  }
  return base;
}

function speedRange(audience: Audience): string {
  switch (audience) {
    case "elderly": return "240-320 (медленно)";
    case "kids": return "140-200";
    case "hardcore": return "70-110 (быстро)";
    default: return "130-180";
  }
}
function gridRange(audience: Audience): string {
  switch (audience) {
    case "elderly": return "12-16";
    case "kids": return "14-18";
    case "hardcore": return "20-24";
    default: return "16-20";
  }
}
function bgHint(audience: Audience): string {
  switch (audience) {
    case "elderly": return "тёплый (бежевый, кремовый)";
    case "kids": return "яркий, весёлый";
    case "hardcore": return "тёмный, почти чёрный";
    default: return "подходящий по теме";
  }
}
function textHint(audience: Audience): string {
  switch (audience) {
    case "elderly": return "тёмный, контрастный";
    case "kids": return "тёмный или белый";
    case "hardcore": return "светлый или неон";
    default: return "контрастный с фоном";
  }
}
