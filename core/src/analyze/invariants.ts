/**
 * Игровые инварианты. Проверяют, что перед нами действительно игра,
 * а не набор div'ов, и что она запускается в играбельном состоянии.
 *
 * ВАЖНО: проверки init-state ищут ТОЛЬКО объявление переменной
 * (`let state = "..."`, `var state = "..."`, `const state = "..."`),
 * а не любое упоминание (например, `if (state === "gameover")`).
 */
import type { InvariantIssue } from "../types.ts";
import type { MiniAst } from "./miniAst.ts";

export function checkInvariants(ast: MiniAst): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  const html = ast.raw;

  // Игровой цикл — критично
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

  // Победа/поражение
  if (!ast.hasWinLose) {
    issues.push({
      id: "no-win-lose",
      severity: "error",
      message: "Нет условия победы или поражения",
      hint: "Добавь экран 'Игра окончена' и/или 'Победа' с кнопкой рестарта.",
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
    /(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](gameover|game_over|game-over|lose|lost|dead|defeat)['"`]/i.test(
      head,
    );

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
    /(?:let|var|const)\s+(?:state|phase|mode|gameState|game_state)\s*=\s*['"`](win|won|victory|finished)['"`]/i.test(
      head,
    );

  if (startsInWin) {
    issues.push({
      id: "starts-in-win",
      severity: "error",
      message: "Игра инициализируется в состоянии победы",
      hint: "Начальное состояние должно быть 'start' или 'playing'.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ФУНКЦИЯ-ОБРАБОТЧИК ВЫЗЫВАЕТСЯ БЕЗ EVENT
  // ─────────────────────────────────────────────────────────────
  // Ищем объявление функции, которая использует event.key / event.touches /
  // event.clientX, но при этом где-то вызывается без аргумента: name().
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
          `с event аргументом. Убери прямой вызов ${name}() и добавь addEventListener.`,
      });
      break; // одного раза достаточно
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT ИСПОЛЬЗУЕТСЯ БЕЗ ПРОВЕРКИ
  // ─────────────────────────────────────────────────────────────
  // Если в коде есть event.key / event.touches БЕЗ передачи event в функцию
  const usesEventKey = /\bevent\.(key|touches|clientX|clientY)\b/i.test(html);
  const hasKeydownHandler = /addEventListener\s*\(\s*['"`](keydown|touchstart|pointerdown)/i.test(
    html,
  );
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
