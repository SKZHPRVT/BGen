import type { AnalysisReport } from "../types.ts";

export function buildCanvasSpecificHint(errorIds: string[]): string {
  const hints: string[] = [];

  if (errorIds.includes("hardcoded-canvas-size")) {
    hints.push(`CANVAS SIZE:
Замени фиксированные размеры на:
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
+ addEventListener('resize', тот же код).`);
  }

  if (errorIds.includes("canvas-no-drawing")) {
    hints.push(`DRAWING:
Добавь render():
  function render() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    // рисуй игровые объекты через fillRect / fillText
  }`);
  }

  if (errorIds.includes("invalid-calc-syntax")) {
    hints.push(`CSS CALC():
В calc() пробелы вокруг операторов ОБЯЗАТЕЛЬНЫ:
  ПРАВИЛЬНО: calc(50% - 50vw), calc(100% - 20px)
  НЕПРАВИЛЬНО: calc(50%-50vw)`);
  }

  if (errorIds.includes("controls-no-flex") || errorIds.includes("button-position-fixed")) {
    hints.push(`КНОПКИ УПРАВЛЕНИЯ:
#controls — display: flex, position: fixed снизу. Кнопки внутри — flex-элементы без position.

  #controls {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    z-index: 10;
  }
  #controls button {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 2px solid rgba(255,255,255,0.4);
    color: #fff;
    font-size: 28px;
  }`);
  }

  if (errorIds.includes("textcontent-vs-entity")) {
    hints.push(`СРАВНЕНИЕ КНОПОК:
Не используй event.target.textContent === '&larr;'.
Используй data-dir или id кнопки.`);
  }

  if (errorIds.includes("bad-arrow-entities")) {
    hints.push(`СТРЕЛКИ:
Используй символы напрямую: ◀ ▲ ▼ ▶
ЗАПРЕЩЕНЫ: &larr; &uarr; &darr; &rarr;`);
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
    lines.push("CRITICAL ERRORS (must fix):");
    for (const e of report.errors) {
      lines.push(`- [${e.id}] ${e.message}`);
      if (e.hint) lines.push(`  -> ${e.hint}`);
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("WARNINGS (should fix):");
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
  lines.push("FIX THE LISTED ISSUES.");
  lines.push("Requirements:");
  lines.push("- Return the FULL updated HTML file.");
  lines.push("- Keep everything that already works.");
  lines.push("- Output only code. Start with <!DOCTYPE html>, end with </html>.");

  return lines.join("\n");
}

export function buildCompactRepairMessage(report: AnalysisReport): string {
  const ids = [...report.errors, ...report.warnings].map((i) => i.id).join(", ");
  return `Previous code failed validation. Issues: ${ids}.
Return the FULL corrected HTML game file. Code only.`;
}
