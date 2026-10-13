/**
 * Игровые инварианты.
 *
 * Severity:
 *   error   — блокирует приёмку, запускает repair loop
 *   warning — не блокирует, идёт в UI как замечание
 */
import type { InvariantIssue } from "../types.ts";
import type { MiniAst } from "./miniAst.ts";

export function checkInvariants(ast: MiniAst): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  const html = ast.raw;

  // ─────────────────────────────────────────────────────────────
  // Canvas: должен быть на весь экран
  // ─────────────────────────────────────────────────────────────
  const hardcodedCanvasSize =
    /canvas\.width\s*=\s*\d{2,4}\s*;/i.test(html) ||
    /canvas\.height\s*=\s*\d{2,4}\s*;/i.test(html);

  const hasInnerSize =
    /canvas\.(width|height)\s*=\s*(window\.)?inner(Width|Height)/i.test(html) ||
    /canvas\.(width|height)\s*=\s*document\.(documentElement\.)?client(Width|Height)/i.test(html);

  if (ast.hasCanvas && hardcodedCanvasSize && !hasInnerSize) {
    issues.push({
      id: "hardcoded-canvas-size",
      severity: "error",
      message: "Canvas размер задан хардкодом, а не под экран",
      hint: "canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; + addEventListener('resize')",
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
  // CSS: calc() без пробелов вокруг операторов
  // ─────────────────────────────────────────────────────────────
  // Невалидно: calc(50%-50vw), calc(100%-20px)
  const badCalc = /calc\([^)]*\d(%|px|vw|vh|em|rem)?\s*[+\-*/]\s*\d/i.test(html);
  const goodCalcSpacing = /calc\([^)]*\d(%|px|vw|vh|em|rem)?\s+[+\-*/]\s+\d/i.test(html);
  if (badCalc && !goodCalcSpacing) {
    issues.push({
      id: "invalid-calc-syntax",
      severity: "error",
      message: "calc() без пробелов вокруг оператора — невалидный CSS",
      hint: "В calc() пробелы обязательны: calc(50% - 50vw), calc(100% - 20px)",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Кнопки управления: #controls должен быть flex
  // ─────────────────────────────────────────────────────────────
  const hasControlsButtons =
    /<div[^>]*id\s*=\s*["']controls["']/i.test(html) ||
    /<button[^>]*>\s*[◀▲▼▶←↑↓→]/i.test(html);

  if (hasControlsButtons) {
    const controlsIsFlex = /#controls\s*\{[^}]*display\s*:\s*(flex|grid)/i.test(html);
    const controlsIsFixed = /#controls\s*\{[^}]*position\s*:\s*fixed/i.test(html);

    if (!controlsIsFlex) {
      issues.push({
        id: "controls-no-flex",
        severity: "error",
        message: "Кнопки управления без flex/grid контейнера",
        hint: "#controls { display: flex; position: fixed; bottom: ...; left: 50%; transform: translateX(-50%); gap: 16px; }",
      });
    }
    if (!controlsIsFixed) {
      issues.push({
        id: "controls-not-fixed",
        severity: "warning",
        message: "#controls без position: fixed",
        hint: "Кнопки должны быть зафиксированы внизу: position: fixed; bottom: ...;",
      });
    }

    // Каждая кнопка внутри #controls не должна иметь position: fixed
    const buttonHasFixed = /#controls\s+button\s*\{[^}]*position\s*:\s*fixed/i.test(html);
    if (buttonHasFixed) {
      issues.push({
        id: "button-position-fixed",
        severity: "error",
        message: "Каждая кнопка с position: fixed — они наложатся друг на друга",
        hint: "position: fixed только у #controls (родителя). Кнопки — обычные flex-элементы.",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Сравнение textContent с HTML-entity
  // ─────────────────────────────────────────────────────────────
  if (/textContent\s*===?\s*['"`]&[a-z]+;['"`]/i.test(html)) {
    issues.push({
      id: "textcontent-vs-entity",
      severity: "error",
      message: "Сравнение textContent с HTML-entity — не сработает",
      hint: "textContent возвращает символ (◀), а не entity (&larr;). Используй data-dir или id кнопки.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HTML-entities стрелок — запрещены
  // ─────────────────────────────────────────────────────────────
  const badEntities = /&(uarr|darr|larr|rarr|upp|dow|left|right);/i;
  if (badEntities.test(html)) {
    issues.push({
      id: "bad-arrow-entities",
      severity: "error",
      message: "Неправильные HTML-entities для стрелок",
      hint: "Используй символы напрямую: ◀ ▲ ▼ ▶",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Игровой цикл
  // ─────────────────────────────────────────────────────────────
  if (!ast.hasRequestAnimationFrame && !ast.hasSetInterval) {
    issues.push({
      id: "no-game-loop",
      severity: "error",
      message: "Нет игрового цикла (requestAnimationFrame / setInterval)",
      hint: "Добавь requestAnimationFrame(loop) и вызывай рекурсивно.",
    });
  }

  // Ввод
  const hasAnyInput = ast.hasKeydown || ast.hasTouch || ast.hasMouse;
  if (!hasAnyInput) {
    issues.push({
      id: "no-input",
      severity: "error",
      message: "Нет ни одного обработчика ввода",
      hint: "Добавь addEventListener для keydown, touchstart и pointerdown/click.",
    });
  }

  if (!ast.hasTouch) {
    issues.push({
      id: "no-touch",
      severity: "warning",
      message: "Нет touch-управления",
      hint: "Добавь touchstart/touchmove/touchend.",
    });
  }

  // State machine
  if (!ast.hasStateMachine) {
    issues.push({
      id: "no-state-machine",
      severity: "error",
      message: "Нет явной state machine",
      hint: "Введи переменную state ('start', 'playing', 'gameover').",
    });
  }

  // Win/lose — warning
  if (!ast.hasWinLose) {
    issues.push({
      id: "no-win-lose",
      severity: "warning",
      message: "Нет явного условия победы/поражения",
      hint: "Для аркад это нормально.",
    });
  }

  if (!ast.hasRestart) {
    issues.push({
      id: "no-restart",
      severity: "warning",
      message: "Нет кнопки/функции рестарта",
      hint: "Добавь reset() и кнопку «Заново».",
    });
  }

  if (!ast.hasResize) {
    issues.push({
      id: "no-resize",
      severity: "warning",
      message: "Канвас не адаптируется под экран",
      hint: "Добавь addEventListener('resize', ...).",
    });
  }

  if (!ast.hasViewportMeta) {
    issues.push({
      id: "no-viewport",
      severity: "warning",
      message: 'Нет meta name="viewport"',
      hint: "Добавь meta viewport с width=device-width,initial-scale=1.",
    });
  }

  if (!ast.hasScore) {
    issues.push({
      id: "no-score",
      severity: "warning",
      message: "Не найден счёт/очки",
      hint: "Добавь отображение счёта.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Игра не должна стартовать в gameover/win
  // ─────────────────────────────────────────────────────────────
  const head = html.slice(0, 4000);

  if (/(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](gameover|game_over|game-over|lose|lost|dead|defeat)['"`]/i.test(head)) {
    issues.push({
      id: "starts-in-gameover",
      severity: "error",
      message: "Игра инициализируется в состоянии проигрыша",
      hint: "Начальное состояние должно быть 'start' или 'playing'.",
    });
  }

  if (/(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](win|won|victory|finished)['"`]/i.test(head)) {
    issues.push({
      id: "starts-in-win",
      severity: "error",
      message: "Игра инициализируется в состоянии победы",
      hint: "Начальное состояние должно быть 'start' или 'playing'.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Функция-обработчик вызывается без event
  // ─────────────────────────────────────────────────────────────
  const handlerNames = [
    ...html.matchAll(
      /function\s+(\w*(?:Handle|Input|Key|Touch|Click|Tap|Press)\w*)\s*\(\s*(\w+)\s*\)\s*\{([^}]{0,500})/gi,
    ),
  ]
    .filter((m) => /\b\w+\.(key|touches|clientX|clientY|type)\b/.test(m[3] ?? ""))
    .map((m) => m[1]);

  for (const name of new Set(handlerNames)) {
    const badCall = new RegExp(`\\b${name}\\s*\\(\\s*\\)`, "i").test(html);
    if (badCall) {
      issues.push({
        id: "handler-called-without-event",
        severity: "error",
        message: `Обработчик ${name}() вызывается без event`,
        hint: `Функция ${name} должна вызываться только из addEventListener с event.`,
      });
      break;
    }
  }

  return issues;
}
