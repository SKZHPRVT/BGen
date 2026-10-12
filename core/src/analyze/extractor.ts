import { extractHTML as rawExtract } from "../utils/strip.ts";

export interface ExtractResult {
  html: string;
  wasWrapped: boolean;
  wasTrimmed: boolean;
}

export function extractGame(raw: string): ExtractResult {
  const original = raw;
  const html = rawExtract(raw);
  return {
    html,
    wasWrapped: /```/.test(original),
    wasTrimmed: original.trim() !== html,
  };
}

export function stripLeadingNoise(html: string): string {
  return html
    .replace(/^(вот|here('| i)s|конечно|sure)[^\n]*\n+/i, "")
    .replace(/^<!--[\s\S]*?-->\s*/i, "")
    .trimStart();
}
