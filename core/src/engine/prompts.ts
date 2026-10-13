/**
 * Промпт для LLM: «заполни 12 полей в формате key: value».
 * Работает надёжнее JSON для GigaChat-7B.
 */
import type { Genre, Audience } from "../types.ts";

export function buildConfigPrompt(
  genre: Genre,
  audience: Audience,
  userPrompt: string,
): { system: string; user: string } {
  const fields = getFieldsForAudience(audience);

  const system = `Ты — настройщик игры. Игра УЖЕ написана и работает. Твоя задача — заполнить 12 полей настройки.

ФОРМАТ ОТВЕТА — СТРОГО "ключ: значение", по одной строке:
- Пиши ТОЛЬКО эти 12 строк, ничего больше.
- НЕ пиши HTML, CSS, JavaScript, JSON.
- НЕ пиши <!DOCTYPE>, <html>, <script>.
- НЕ пиши объяснений, комментариев, приветствий.
- НЕ оборачивай в \`\`\`.
- НЕ добавляй номера строк.
- После значения — сразу перенос строки.

${fields}

ПРИМЕР для запроса «змейка для бабушки»:
title: Змейка для бабушки
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
restartButton: Заново

ТВОЙ ОТВЕТ: 12 строк, ровно по этому формату. Ничего другого.`;

  const user = `Запрос пользователя: "${userPrompt}"

Заполни 12 полей. Возвращай только строки "ключ: значение".`;

  return { system, user };
}

function getFieldsForAudience(audience: Audience): string {
  const base = `1. title — название игры на русском, до 30 символов
2. speed — ${speedRange(audience)}
3. gridSize — ${gridRange(audience)}, размер игровой сетки
4. bg — hex-цвет фона #RRGGBB, ${bgHint(audience)}
5. surface — hex-цвет игрового поля, чуть темнее bg
6. primary — hex-цвет игрока/змейки
7. accent — hex-цвет еды/цели
8. text — hex-цвет текста, ${textHint(audience)}
9. emojiFood — один emoji для еды (🍎 🍒 🍇) или пусто
10. emojiPlayer — один emoji для игрока или пусто
11. gameOverTitle — текст при проигрыше (короткий)
12. restartButton — надпись кнопки рестарта (до 15)`;

  return base;
}

function speedRange(audience: Audience): string {
  switch (audience) {
    case "elderly": return "число от 240 до 320 (медленно!)";
    case "kids": return "число от 140 до 200";
    case "hardcore": return "число от 70 до 110 (быстро!)";
    default: return "число от 130 до 180";
  }
}

function gridRange(audience: Audience): string {
  switch (audience) {
    case "elderly": return "число 12 до 16";
    case "kids": return "число 14 до 18";
    case "hardcore": return "число 20 до 24";
    default: return "число 16 до 20";
  }
}

function bgHint(audience: Audience): string {
  switch (audience) {
    case "elderly": return "тёплый, спокойный (бежевый, кремовый)";
    case "kids": return "яркий, весёлый";
    case "hardcore": return "тёмный, почти чёрный";
    default: return "любой подходящий по теме";
  }
}

function textHint(audience: Audience): string {
  switch (audience) {
    case "elderly": return "тёмный, контрастный";
    case "kids": return "тёмный или белый, читаемый";
    case "hardcore": return "светлый или неон";
    default: return "контрастный с фоном";
  }
}
