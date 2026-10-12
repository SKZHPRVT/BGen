import type { InvariantIssue } from "../types.ts";

export function checkSecurity(html: string): InvariantIssue[] {
  const issues: InvariantIssue[] = [];

  const externalSrc = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
  if (externalSrc && externalSrc.length > 0) {
    issues.push({
      id: "external-resources",
      severity: "error",
      message: `External resources forbidden (${externalSrc.length})`,
      hint: "Remove all <script src>, <link href>, CDN. Everything must be inline.",
    });
  }

  if (/\bimport\s+[\w{*]|\brequire\s*\(/.test(html)) {
    issues.push({
      id: "module-imports",
      severity: "error",
      message: "ESM/CJS imports incompatible with self-contained HTML",
      hint: "Remove import/require, keep all code in one <script>.",
    });
  }

  if (/\bfetch\s*\(|XMLHttpRequest/.test(html)) {
    issues.push({
      id: "runtime-network",
      severity: "warning",
      message: "Uses fetch/XHR — will not work offline in WebView",
      hint: "Remove network calls from the game loop.",
    });
  }

  if (/\beval\s*\(|new\s+Function\s*\(/.test(html)) {
    issues.push({
      id: "eval",
      severity: "error",
      message: "eval/new Function forbidden (WebView CSP)",
      hint: "Rewrite without dynamic code execution.",
    });
  }

  if (/\b(alert|confirm|prompt)\s*\(/.test(html)) {
    issues.push({
      id: "native-dialogs",
      severity: "error",
      message: "alert/confirm/prompt blocked in WebView",
      hint: "Build a custom in-game UI (div over canvas).",
    });
  }

  const base64 = html.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{5000,}/g);
  if (base64) {
    issues.push({
      id: "heavy-base64",
      severity: "warning",
      message: `Heavy base64 images (${base64.length})`,
      hint: "Replace with emoji or canvas drawing.",
    });
  }

  if (html.length > 80_000) {
    issues.push({
      id: "oversize",
      severity: "warning",
      message: `Game file is large (${Math.round(html.length / 1024)} KB)`,
      hint: "Simplify code, don't cut functionality.",
    });
  }

  return issues;
}
