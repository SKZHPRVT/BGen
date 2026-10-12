import type { AnalysisReport } from "../types.ts";

export function buildRepairMessage(report: AnalysisReport, previousCode: string): string {
  const lines: string[] = [];

  lines.push("THE PREVIOUS GENERATION FAILED VALIDATION.");
  lines.push("");

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
