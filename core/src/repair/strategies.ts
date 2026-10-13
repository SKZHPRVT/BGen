import type { AnalysisReport } from "../types.ts";

/**
 * Специальная подсказка для типичных ошибок canvas —
 * чтобы GigaChat понял что делать.
 */
export function buildCanvasSpecificHint(errorIds: string[]): string {
  const hints: string[] = [];

  if (errorIds.includes("hardcoded-canvas-size")) {
    hints.push(`КРИТИЧНО ПРО CANVAS:
Canvas имеет фиксированные размеры (например 400x400), поэтому игра маленькая и не на весь экран.
Замени на:

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

И добавь обработчик resize:
  window.addEventListener('resize', () => { /* тот же код */ });

Все координаты игровых объектов — через window.innerWidth и window.innerHeight.
Не хардкодь 400, 600, 800.`);
  }

  if (errorIds.includes("canvas-no-drawing")) {
    hints.push(`КРИТИЧНО ПРО ОТРИСОВКУ:
Canvas есть, но в коде нет команд отрисовки (fillRect/fillText/clearRect). Игра ничего не покажет.
Добавь функцию render() и вызывай её из игрового цикла:

  function render() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    // рисуем игровые объекты через fillRect или fillText
  }`);
  }

  if (errorIds.includes("bad-arrow-entities")) {
    hints.push(`ИСПРАВЬ СТРЕЛКИ:
Не используй &uarr; &darr; &upp; &dow; — они показываются как текст.
Используй символы напрямую: ◀ ▲ ▼ ▶`);
  }

  return hints.join("\n\n");
}

export function buildRepairMessage(report: AnalysisReport, previousCode: string): string {
  const lines: string[] = [];

  lines.push("THE PREVIOUS GENERATION FAILED VALIDATION.");
  lines.push("");

  // Специальные подсказки для canvas и стрелок
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
  lines.push("- Return the FULL updated HTML file (not a diff).");
  lines.push("- Keep everything that already works.");
  lines.push("- Do not add extra features beyond the requested fixes.");
  lines.push("- Output only code. Start with <!DOCTYPE html>, end with </html>.");

  return lines.join("\n");
}

export function buildCompactRepairMessage(report: AnalysisReport): string {
  const ids = [...report.errors, ...report.warnings].map((i) => i.id).join(", ");
  return `Previous code failed validation. Issues: ${ids}.
Return the FULL corrected HTML game file. Code only.`;
}
