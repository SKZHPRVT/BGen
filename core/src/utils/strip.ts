export function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:html|HTML|js|javascript)?\s*\n?/i, "");
  s = s.replace(/\n?```\s*$/i, "");
  s = s.replace(/^```(?:html)?\s*/i, "");
  s = s.replace(/\s*```$/i, "");
  return s.trim();
}

export function extractHTML(raw: string): string {
  const cleaned = stripMarkdownFences(raw);
  const withDoctype = cleaned.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i);
  if (withDoctype) return withDoctype[0].trim();
  const htmlOnly = cleaned.match(/<html[\s\S]*?<\/html>/i);
  if (htmlOnly) return "<!DOCTYPE html>\n" + htmlOnly[0].trim();
  return cleaned;
}

export function stripPreamble(raw: string): string {
  return raw.replace(/^(вот|here('| i)s|конечно|sure)[^\n]*\n+/i, "").trim();
}
