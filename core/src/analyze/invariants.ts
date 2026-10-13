/**
 * Игровые инварианты.
 */
import type { InvariantIssue } from "../types.ts";
import type { MiniAst } from "./miniAst.ts";

export function checkInvariants(ast: MiniAst): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  const html = ast.raw;

  // ─────────────────────────────────────────────────────────────
  // Canvas: должен быть на весь экран (не Math.min)
  // ─────────────────────────────────────────────────────────────
  const hardcodedCanvasSize =
    /canvas\.width\s*=\s*\d{2,4}\s*;/i.test(html) ||
    /canvas\.height\s*=\s*\d{2,4}\s*;/i.test(html);

  const hasInnerSize =
    /canvas\.(width|height)\s*=\s*(window\.)?inner(Width|Height)/i.test(html) ||
    /canvas\.(width|height)\s*=\s*document\.(documentElement\.)?client(Width|Height)/i.test(html);

  const usesMathMin = /canvas\.(width|height)\s*=\s*(canvas\.(width|height)\s*=\s*)?Math\.min\s*\(\s*(window\.)?inner/i.test(html);

  if (usesMathMin) {
    issues.push({
      id: "canvas-quadratic",
      severity: "error",
      message: "Canvas как Math.min(innerWidth, innerHeight) — квадрат вместо прямоугольника",
      hint: "canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;",
    });
  } else if (ast.hasCanvas && hardcodedCanvasSize && !hasInnerSize) {
    issues.push({
      id: "hardcoded-canvas-size",
      severity: "error",
      message: "Canvas размер задан хардкодом",
      hint: "canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;",
    });
  }

  // Canvas есть, но нет отрисовки
  const hasFillRect = /\.fillRect\s*\(/i.test(html);
  const hasFillText = /\.fillText\s*\(/i.test(html);
  const hasDrawImage = /\.drawImage\s*\(/i.test(html);
  const hasClearRect = /\.clearRect\s*\(/i.test(html);
  if (ast.hasCanvas && !(hasFillRect || hasFillText || hasDrawImage || hasClearRect)) {
    issues.push({
      id: "canvas-no-drawing",
      severity: "error",
      message: "Canvas есть, но нет команд отрисовки",
      hint: "Добавь ctx.fillRect() или ctx.fillText() в render().",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // THROTTLE — критично для змейки/раннера/платформера
  // ─────────────────────────────────────────────────────────────
  const hasSetInterval = /setInterval\s*\(/i.test(html);
  const hasThrottleByTime =
    /performance\.now\(\)\s*-\s*(last|prev|previous)/i.test(html) ||
    /\bt\s*-\s*(last|prev|previous)\w*\s*>/i.test(html);
  const hasTimerVariable = /\b(lastMove|lastUpdate|lastTick|lastStep)/i.test(html);

  // Только для игр, где важно движение по шагам (змейка, раннер, платформер, breakout)
  // Кликеры и головоломки — не подпадают
  const needsThrottle =
    /snake|змейк|runner|раннер|breakout|арканоид|platformer|платформер/i.test(html) ||
    /\b(unshift|pop)\s*\(/.test(html); // движения через массив — характерно для змейки

  if (needsThrottle && !hasSetInterval && !hasThrottleByTime && !hasTimerVariable) {
    issues.push({
      id: "no-throttle",
      severity: "error",
      message: "Движение без throttle — объект двигается 60 раз в секунду",
      hint:
        "Используй: let lastMove = 0; const MOVE_MS = 200; " +
        "function loop(t) { if (t - lastMove > MOVE_MS) { lastMove = t; move(); } render(); requestAnimationFrame(loop); } " +
        "Для 'пожилые' MOVE_MS = 250-300, для 'обычная' = 130-150.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // POSTMESSAGE — критично, игра должна слушать родителя
  // ─────────────────────────────────────────────────────────────
  const hasPostMessageListener = /addEventListener\s*\(\s*['"]message['"]/i.test(html);
  const handlesBgenInput = /bgen:input/i.test(html);

  if (!hasPostMessageListener) {
    issues.push({
      id: "no-postmessage",
      severity: "error",
      message: "Игра не слушает postMessage от приложения BGen",
      hint:
        "window.addEventListener('message', function(event) { " +
        "const data = event.data; if (!data || data.type !== 'bgen:input') return; " +
        "switch(data.action) { case 'left': setDir('left'); break; ... } })",
    });
  } else if (!handlesBgenInput) {
    issues.push({
      id: "no-bgen-input",
      severity: "warning",
      message: "postMessage есть, но не обрабатывает bgen:input",
      hint: "Проверь: if (event.data.type !== 'bgen:input') return;",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Свои кнопки внутри игры — не нужны
  // ─────────────────────────────────────────────────────────────
  const hasOwnControls =
    /<div[^>]*id\s*=\s*["']controls["']/i.test(html) ||
    /<button[^>]*>[◀▲▼▶]/i.test(html);

  if (hasOwnControls) {
    issues.push({
      id: "has-own-controls",
      severity: "warning",
      message: "Игра содержит свои кнопки управления — не нужно",
      hint: "Управление идёт через postMessage от родителя. Убери свои кнопки.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CSS calc без пробелов
  // ─────────────────────────────────────────────────────────────
  const badCalc = /calc\([^)]*\d(%|px|vw|vh|em|rem)?\s*[+\-*/]\s*\d/i.test(html);
  const goodCalcSpacing = /calc\([^)]*\d(%|px|vw|vh|em|rem)?\s+[+\-*/]\s+\d/i.test(html);
  if (badCalc && !goodCalcSpacing) {
    issues.push({
      id: "invalid-calc-syntax",
      severity: "error",
      message: "calc() без пробелов вокруг оператора",
      hint: "calc(50% - 50vw), calc(100% - 20px) — с пробелами",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Игровой цикл
  // ─────────────────────────────────────────────────────────────
  if (!ast.hasRequestAnimationFrame && !ast.hasSetInterval) {
    issues.push({
      id: "no-game-loop",
      severity: "error",
      message: "Нет игрового цикла",
      hint: "Добавь requestAnimationFrame(loop).",
    });
  }

  // Ввод
  const hasAnyInput = ast.hasKeydown || ast.hasTouch || ast.hasMouse || hasPostMessageListener;
  if (!hasAnyInput) {
    issues.push({
      id: "no-input",
      severity: "error",
      message: "Нет ни одного обработчика ввода",
      hint: "Добавь keydown + postMessage listener.",
    });
  }

  // State machine
  if (!ast.hasStateMachine) {
    issues.push({
      id: "no-state-machine",
      severity: "error",
      message: "Нет явной state machine",
      hint: "state = 'start' | 'playing' | 'gameover'",
    });
  }

  // Win/lose — warning
  if (!ast.hasWinLose) {
    issues.push({
      id: "no-win-lose",
      severity: "warning",
      message: "Нет условия победы/поражения",
      hint: "Для аркад это нормально.",
    });
  }

  if (!ast.hasRestart) {
    issues.push({
      id: "no-restart",
      severity: "warning",
      message: "Нет функции рестарта",
      hint: "Добавь reset() и обработку action 'restart'.",
    });
  }

  if (!ast.hasResize) {
    issues.push({
      id: "no-resize",
      severity: "warning",
      message: "Canvas не адаптируется под экран",
      hint: "window.addEventListener('resize', resize)",
    });
  }

  if (!ast.hasViewportMeta) {
    issues.push({
      id: "no-viewport",
      severity: "warning",
      message: 'Нет meta viewport',
      hint: "meta name=viewport с width=device-width,initial-scale=1",
    });
  }

  if (!ast.hasScore) {
    issues.push({
      id: "no-score",
      severity: "warning",
      message: "Не найден счёт",
      hint: "Добавь отображение счёта.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Старт в gameover/win — критично
  // ─────────────────────────────────────────────────────────────
  const head = html.slice(0, 4000);

  if (/(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](gameover|game_over|game-over|lose|lost|dead|defeat)['"`]/i.test(head)) {
    issues.push({
      id: "starts-in-gameover",
      severity: "error",
      message: "Игра стартует в состоянии проигрыша",
      hint: "state = 'start' или 'playing'",
    });
  }

  if (/(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](win|won|victory|finished)['"`]/i.test(head)) {
    issues.push({
      id: "starts-in-win",
      severity: "error",
      message: "Игра стартует в состоянии победы",
      hint: "state = 'start' или 'playing'",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HTML-entities стрелок — только если есть свои кнопки (warning)
  // ─────────────────────────────────────────────────────────────
  const badEntities = /&(uarr|darr|larr|rarr|upp|dow|left|right);/i;
  if (badEntities.test(html) && hasOwnControls) {
    issues.push({
      id: "bad-arrow-entities",
      severity: "warning",
      message: "Неправильные HTML-entities для стрелок",
      hint: "Убери свои кнопки, используй postMessage",
    });
  }

  return issues;
}
