/**
 * Игровые инварианты. Проверяют, что перед нами действительно игра,
 * а не набор div'ов, и что она запускается в играбельном состоянии.
 */
import type { InvariantIssue } from "../types.ts";
import type { MiniAst } from "./miniAst.ts";

export function checkInvariants(ast: MiniAst): InvariantIssue[] {
  const issues: InvariantIssue[] = [];

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

  // Мобильное управление — критично для TMA
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

  // Ресайз — важно для WebView
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
      message: "Нет <meta name=\"viewport\">",
      hint: "Добавь в <head> meta viewport с width=device-width,initial-scale=1.",
    });
  }

  // Score — почти всегда нужен
  if (!ast.hasScore) {
    issues.push({
      id: "no-score",
      severity: "warning",
      message: "Не найден счёт/очки в UI",
      hint: "Добавь отображение счёта крупным шрифтом.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // КРИТИЧНО: игра не должна стартовать в состоянии проигрыша
  // ─────────────────────────────────────────────────────────────
  // Ищем объявление состояния в первых 2000 символах скрипта:
  // state = 'gameover' / gameState: 'lose' / mode = 'dead' и т.п.
  const head = ast.raw.slice(0, 4000);
  const startsInGameover =
    /(?:state|phase|mode|gameState|game_state)\s*[:=]\s*['"`](gameover|game_over|game-over|lose|lost|dead|defeat)['"`]/i.test(
      head,
    );

  if (startsInGameover) {
    issues.push({
      id: "starts-in-gameover",
      severity: "error",
      message: "Игра инициализируется в состоянии проигрыша",
      hint:
        "Начальное состояние должно быть 'start' или 'playing'. " +
        "Gameover — только после реального проигрыша. " +
        "Не забудь показать экран старта или сразу начать игру.",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // КРИТИЧНО: игра не должна сразу выставлять win
  // ─────────────────────────────────────────────────────────────
  const startsInWin =
    /(?:state|phase|mode|gameState|game_state)\s*[:=]\s*['"`](win|won|victory|finished)['"`]/i.test(
      head,
    );

  if (startsInWin) {
    issues.push({
      id: "starts-in-win",
      severity: "error",
      message: "Игра инициализируется в состоянии победы",
      hint:
        "Начальное состояние должно быть 'start' или 'playing'. " +
        "Победа — только после достижения условия.",
    });
  }

  return issues;
}
