import type { AnalysisReport } from "../types.ts";
import type { Router } from "../llm/router.ts";
import { analyze } from "../analyze/report.ts";
import { extractGame, stripLeadingNoise } from "../analyze/extractor.ts";
import { buildRepairMessage } from "./strategies.ts";

export interface RepairOptions {
  maxAttempts?: number;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  onChunk?: (t: string) => void;
  onAttempt?: (info: AttemptInfo) => void;
}

export interface AttemptInfo {
  attempt: number;
  ok: boolean;
  errorCount: number;
  warningCount: number;
  provider: string;
}

export interface RepairResult {
  html: string;
  report: AnalysisReport;
  attempts: number;
  provider: string;
  repairedErrors: string[];
  history: AttemptInfo[];
}

export async function generateWithRepair(
  router: Router,
  initialSystem: string,
  initialUser: string,
  opts: RepairOptions = {},
): Promise<RepairResult> {
  const maxAttempts = opts.maxAttempts ?? 3;

  const system = initialSystem;
  let user = initialUser;
  let lastHtml = "";
  let lastReport: AnalysisReport | null = null;
  let lastProvider = "unknown";
  const repairedErrors: string[] = [];
  const history: AttemptInfo[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { text, provider } = await router.generate(
      {
        system,
        user,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
        signal: opts.signal,
      },
      opts.onChunk,
    );
    lastProvider = provider;

    const extracted = extractGame(text);
    const html = stripLeadingNoise(extracted.html);
    const report = analyze(html, { html });

    lastHtml = html;
    lastReport = report;

    history.push({
      attempt,
      ok: report.ok,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
      provider,
    });
    opts.onAttempt?.(history[history.length - 1]!);

    if (report.ok) {
      return {
        html,
        report,
        attempts: attempt,
        provider,
        repairedErrors,
        history,
      };
    }

    for (const e of report.errors) repairedErrors.push(e.id);

    if (attempt < maxAttempts) {
      user = buildRepairMessage(report, html);
    }
  }

  return {
    html: lastHtml,
    report: lastReport!,
    attempts: maxAttempts,
    provider: lastProvider,
    repairedErrors,
    history,
  };
}
