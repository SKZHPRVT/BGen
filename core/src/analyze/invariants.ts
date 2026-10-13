/**
 * Игровые инварианты. Проверяют, что перед нами действительно игра,
 * а не набор div'ов, и что она запускается в играбельном состоянии.
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
  // Canvas должен быть на весь экран
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
      hint:
        "Используй: canvas.width = window.innerWidth * (window.devicePixelRatio || 1); " +
        "canvas.height = window.innerHeight * (window.devicePixelRatio || 1); " +
        "canvas.style.width = window.innerWidth + 'px'; " +
        "canvas.style.height = window.innerHeight + 'px'; " +
        "И добавь addEventListener('resize', ...) для пересчёта.",
    });
  }

  // Canvas есть, но ничего не рисуется
  const hasFillRect = /\.fillRect\s*\(/i.test(html);
  const hasFillText = /\.fillText\s*\(/i.test(html);
  const hasDrawImage = /\.drawImage\s*\(/i.test(html);
  const hasClearRect = /\.clearRect\s*\(/i.test(html);
  const hasAnyDrawing = hasFillRect || hasFillText || hasDrawImage || hasClearRect;

  if (ast.hasCanvas && !hasAnyDrawing) {
    issues.push({
      id: "canvas-no-drawing",
      severity: "error",
      message: "Canvas есть, но в коде нет команд отрисовки",
      hint:
        "Добавь ctx.fillRect() или ctx.fillText() в функцию render(). " +
        "Без этого на canvas ничего не появится.",
    });
  }

  // Неправильные HTML-entities для стрелок
  const badEntities = /&(uarr|darr|larr|rarr|upp|dow|left|right);/i;
  if (badEntities.test(html)) {
    issues.push({
      id: "bad-arrow-entities",
      severity: "error",
      message: "Неправильные HTML-entities для стрелок",
      hint:
        "Используй символы напрямую: ◀ ▲ ▼ ▶ (или unicode: &#x25C0; &#x25B2; &#x25BC; &#x25B6;). " +
        "Не используй &uarr; &darr; &upp; &dow; — они не отображаются.",
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
      hint: "Добавь requestAnimationFrame(loop) в конце и вызывай рекурсивно.",
    });
  }

  // Обработчики ввода
  const hasAnyInput = ast.hasKeydown || ast.hasTouch || ast.hasMouse;
  if (!hasAnyInput) {
    issues.push({
      id: "no-input",
      severity: "error",
      message: "Нет ни одного обработчика ввода",
      hint: "Добавь addEventListener для keydown, touchstart и pointerdown/click.",
    });
  }

  // Мобильное управление
  if (!ast.hasTouch) {
    issues.push({
      id: "no-touch",
      severity: "warning",
      message: "Нет touch-управления",
      hint: "Добавь touchstart/touchmove/touchend для мобильных устройств.",
    });
  }

  // State machine
  if (!ast.hasStateMachine) {
    issues.push({
      id: "no-state-machine",
      severity: "error",
      message: "Нет явной state machine (start/playing/gameover)",
      hint: "Введи переменную state со значениями 'start', 'playing', 'gameover'.",
    });
  }

  // Победа/поражение — WARNING
  if (!ast.hasWinLose) {
    issues.push({
      id: "no-win-lose",
      severity: "warning",
      message: "Нет явного условия победы/поражения",
      hint: "Для аркад это нормально. Для змейки/2048/платформера добавь win/lose.",
    });
  }

  // Рестарт
  if (!ast.hasRestart) {
    issues.push({
      id: "no-restart",
      severity: "warning",
      message: "Нет кнопки/функции рестарта",
      hint: "Добавь функцию reset() и кнопку «Заново».",
    });
  }

  // Ресайз
  if (!ast.hasResize) {
    issues.push({
      id: "no-resize",
      severity: "warning",
      message: "Канвас/DOM не адаптируется под экран",
      hint: "Добавь addEventListener('resize', ...) и обновляй размеры canvas.",
    });
  }

  // Viewport meta
  if (!ast.hasViewportMeta) {
    issues.push({
      id: "no-viewport",
      severity: "warning",
      message: 'Нет meta name="viewport"',
      hint: "Добавь в head meta viewport с width=device-width,initial-scale=1.",
    });
  }

  // Score
  if (!ast.hasScore) {
    issues.push({
      id: "no-score",
      severity: "warning",
      message: "Не найден счёт/очки в UI",
      hint: "Добавь отображение счёта крупным шрифтом.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Игра не должна стартовать в состоянии проигрыша/победы
  // (только инициализация через let/var/const)
  // ─────────────────────────────────────────────────────────────
  const head = html.slice(0, 4000);

  const startsInGameover =
    /(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](gameover|game_over|game-over|lose|lost|dead|defeat)['"`]/i.test(head);

  if (startsInGameover) {
    issues.push({
      id: "starts-in-gameover",
      severity: "error",
      message: "Игра инициализируется в состоянии проигрыша",
      hint:
        "Начальное состояние должно быть 'start' или 'playing'. " +
        "Gameover — только после реального проигрыша.",
    });
  }

  const startsInWin =
    /(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](win|won|victory|finished)['"`]/i.test(head);

  if (startsInWin) {
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
        hint:
          `Функция ${name} использует event.key / event.touches и должна ` +
          `вызываться ТОЛЬКО из addEventListener('keydown'|'touchstart'|...) ` +
          `с event аргументом.`,
      });
      break;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // event используется, но нет addEventListener
  // ─────────────────────────────────────────────────────────────
  const usesEventKey = /\bevent\.(key|touches|clientX|clientY)\b/i.test(html);
  const hasKeydownHandler =
    /addEventListener\s*\(\s*['"`](keydown|touchstart|pointerdown)/i.test(html);
  if (usesEventKey && !hasKeydownHandler) {
    issues.push({
      id: "event-without-handler",
      severity: "error",
      message: "event используется, но нет addEventListener",
      hint:
        "event.key / event.touches доступны только внутри addEventListener. " +
        "Добавь addEventListener('keydown', function(event) { if (event.key === ...) ... })",
    });
  }

  return issues;
}
