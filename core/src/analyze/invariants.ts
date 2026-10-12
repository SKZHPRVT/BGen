import type { InvariantIssue } from "../types.ts";
import type { MiniAst } from "./miniAst.ts";

export function checkInvariants(ast: MiniAst): InvariantIssue[] {
  const issues: InvariantIssue[] = [];

  if (!ast.hasRequestAnimationFrame && !ast.hasSetInterval) {
    issues.push({
      id: "no-game-loop",
      severity: "error",
      message: "No game loop (requestAnimationFrame / setInterval)",
      hint: "Add requestAnimationFrame(loop) and call it recursively.",
    });
  }

  const hasAnyInput = ast.hasKeydown || ast.hasTouch || ast.hasMouse;
  if (!hasAnyInput) {
    issues.push({
      id: "no-input",
      severity: "error",
      message: "No input handlers at all",
      hint: "Add listeners for keydown, touchstart and pointerdown/click.",
    });
  }

  if (!ast.hasTouch) {
    issues.push({
      id: "no-touch",
      severity: "warning",
      message: "No touch controls",
      hint: "Add touchstart/touchmove/touchend for mobile devices.",
    });
  }

  if (!ast.hasStateMachine) {
    issues.push({
      id: "no-state-machine",
      severity: "error",
      message: "No explicit state machine (start/playing/gameover)",
      hint: "Introduce a state variable with values 'start', 'playing', 'gameover'.",
    });
  }

  if (!ast.hasWinLose) {
    issues.push({
      id: "no-win-lose",
      severity: "error",
      message: "No win or lose condition",
      hint: "Add a 'Game over' / 'Victory' screen with a restart button.",
    });
  }

  if (!ast.hasRestart) {
    issues.push({
      id: "no-restart",
      severity: "warning",
      message: "No restart function/button",
      hint: "Add reset() and a Restart button.",
    });
  }

  if (!ast.hasResize) {
    issues.push({
      id: "no-resize",
      severity: "warning",
      message: "Canvas/DOM does not adapt to screen size",
      hint: "Add addEventListener('resize', ...) and update canvas sizes.",
    });
  }

  if (!ast.hasViewportMeta) {
    issues.push({
      id: "no-viewport",
      severity: "warning",
      message: "Missing <meta name=\"viewport\">",
      hint: "Add viewport meta with width=device-width,initial-scale=1.",
    });
  }

  if (!ast.hasScore) {
    issues.push({
      id: "no-score",
      severity: "warning",
      message: "No visible score",
      hint: "Display score in large font.",
    });
  }

  return issues;
}
