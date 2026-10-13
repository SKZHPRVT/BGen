import type { AnalysisReport } from "../types.ts";

export function buildCanvasSpecificHint(errorIds: string[]): string {
  const hints: string[] = [];

  if (errorIds.includes("no-throttle")) {
    hints.push(`THROTTLE — КРИТИЧНО:
Змейка/объект двигается слишком быстро (60 раз в секунду). Нужен throttle:

  var lastMove = 0;
  var MOVE_MS = 250;  // для пожилых; 130 — для обычных, 80 — для хардкор
  function loop(t) {
    if (t - lastMove > MOVE_MS) {
      lastMove = t;
      move();  // один шаг игры
    }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);`);
  }

  if (errorIds.includes("canvas-quadratic")) {
    hints.push(`CANVAS — НЕ КВАДРАТ:
Замени Math.min(...) на:
  var dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';`);
  }

  if (errorIds.includes("hardcoded-canvas-size")) {
    hints.push(`CANVAS SIZE:
canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; + resize listener.`);
  }

  if (errorIds.includes("no-postmessage") || errorIds.includes("no-bgen-input")) {
    hints.push(`POSTMESSAGE — ОБЯЗАТЕЛЬНО:
Приложение BGen управляет игрой снаружи. Добавь:

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || data.type !== 'bgen:input') return;
    switch (data.action) {
      case 'left': setDir('left'); break;
      case 'right': setDir('right'); break;
      case 'up': setDir('up'); break;
      case 'down': setDir('down'); break;
      case 'tap': onTap(); break;
      case 'restart': reset(); break;
      case 'start': if (state === 'start' || state === 'gameover') reset(); break;
    }
  });`);
  }

  if (errorIds.includes("has-own-controls")) {
    hints.push(`УБЕРИ СВОИ КНОПКИ:
Игра НЕ должна показывать свои кнопки управления — они приходят извне через postMessage.
Оставь только <canvas>. Никаких <div id="controls"> и <button>.`);
  }

  if (errorIds.includes("invalid-calc-syntax")) {
    hints.push(`CSS CALC():
Пробелы вокруг операторов обязательны: calc(50% - 50vw), calc(100% - 20px)`);
  }

  if (errorIds.includes("bad-arrow-entities") || errorIds.includes("textcontent-vs-entity")) {
    hints.push(`СТРЕЛКИ:
Используй символы ◀ ▲ ▼ ▶. Или вообще убери свои кнопки — управление снаружи.`);
  }

  if (errorIds.includes("canvas-no-drawing")) {
    hints.push(`DRAWING:
Добавь render() с fillRect/fillText и вызывай из loop().`);
  }

  if (errorIds.includes("starts-in-gameover") || errorIds.includes("starts-in-win")) {
    hints.push(`START STATE:
Начальное state = 'start' или 'playing'. Никогда 'gameover' или 'win'.`);
  }

  return hints.join("\n\n");
}

export function buildRepairMessage(report: AnalysisReport, previousCode: string): string {
  const lines: string[] = [];

  lines.push("THE PREVIOUS GENERATION FAILED VALIDATION.");
  lines.push("");

  const canvasHint = buildCanvasSpecificHint(report.errors.map((e) => e.id));
  if (canvasHint) {
    lines.push(canvasHint);
    lines.push("");
  }

  if (report.errors.length > 0) {
    lines.push("CRITICAL ERRORS:");
    for (const e of report.errors) {
      lines.push(`- [${e.id}] ${e.message}`);
      if (e.hint) lines.push(`  -> ${e.hint}`);
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("WARNINGS:");
    for (const w of report.warnings) {
      lines.push(`- [${w.id}] ${w.message}`);
      if (w.hint) lines.push(`  -> ${w.hint}`);
    }
    lines.push("");
  }

  lines.push("CURRENT CODE:");
  lines.push("```html");
  lines.push(previousCode);
  lines.push("```");
  lines.push("");
  lines.push("FIX THE LISTED ISSUES. Return the FULL updated HTML file.");
  lines.push("Keep everything that already works. Output only code.");

  return lines.join("\n");
}

export function buildCompactRepairMessage(report: AnalysisReport): string {
  const ids = [...report.errors, ...report.warnings].map((i) => i.id).join(", ");
  return `Previous code failed: ${ids}. Return the FULL corrected HTML game file. Code only.`;
}
