import type { AnalysisReport, InvariantIssue } from "../types.ts";
import { buildMiniAst } from "./miniAst.ts";
import { checkInvariants } from "./invariants.ts";
import { checkSecurity } from "./security.ts";
import { extractGame } from "./extractor.ts";

export interface AnalyzeOptions {
  html?: string;
}

export function analyze(rawOrHtml: string, opts: AnalyzeOptions = {}): AnalysisReport {
  const html = opts.html ?? extractGame(rawOrHtml).html;

  const all: InvariantIssue[] = [
    ...checkSecurity(html),
    ...checkInvariants(buildMiniAst(html)),
  ];

  const errors = all.filter((i) => i.severity === "error");
  const warnings = all.filter((i) => i.severity === "warning");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    looksLikeGame:
      /<canvas|<script/i.test(html) &&
      /(state|score|loop|player|game)/i.test(html),
    html,
    size: html.length,
  };
}
