/**
 * Компилятор промптов.
 * UserInput → CompiledPrompt (system + user + spec + few-shot).
 */
import type { CompiledPrompt, GameSpec, UserInput } from "../types.ts";
import { classify } from "./classifier.ts";
import { genreRule } from "./genres.ts";
import { audienceRule } from "./audiences.ts";
import { mechanicsBlock } from "./mechanics.ts";
import { renderSpec } from "./renderSpec.ts";
import {
  HARD_RULES_BLOCK,
  IDENTITY_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  QUALITY_REMINDER,
} from "./blocks.ts";

export interface CompileOptions {
  /** Few-shot примеры, уже подготовленные retriever'ом */
  examples?: string[];
  /** Если это итерация — передаём предыдущий код */
  previousCode?: string;
  previousPrompt?: string;
}

export function compile(input: UserInput, opts: CompileOptions = {}): CompiledPrompt {
  const spec = classify(input);

  const systemParts: string[] = [
    IDENTITY_BLOCK,
    HARD_RULES_BLOCK,
    genreRule(spec.genre),
    audienceRule(spec.audience),
  ];

  const mech = mechanicsBlock(spec.mechanics);
  if (mech) systemParts.push(mech);

  if (opts.examples && opts.examples.length > 0) {
    systemParts.push(
      "ПРИМЕРЫ ХОРОШИХ ИГР (используй как референс стиля и структуры, но не копируй дословно):\n\n" +
        opts.examples.join("\n\n---\n\n"),
    );
  }

  systemParts.push(OUTPUT_FORMAT_BLOCK, QUALITY_REMINDER);

  const system = systemParts.join("\n\n");

  let user: string;
  if (opts.previousCode) {
    user = buildIterationPrompt(spec, opts.previousCode, opts.previousPrompt ?? "", input.prompt);
  } else {
    user = buildFreshPrompt(spec, input.prompt);
  }

  return {
    system,
    user,
    spec,
    examplesUsed: opts.examples?.length ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────

function buildFreshPrompt(spec: GameSpec, rawPrompt: string): string {
  return `Сгенерируй игру по запросу пользователя.

ЗАПРОС ПОЛЬЗОВАТЕЛЯ:
"${rawPrompt}"

РАЗОБРАННАЯ СПЕЦИФИКАЦИЯ:
${renderSpec(spec)}

Верни готовый HTML-файл. Только код.`;
}

function buildIterationPrompt(
  spec: GameSpec,
  previousCode: string,
  previousPrompt: string,
  newPrompt: string,
): string {
  return `Пользователь уже получил игру и хочет доработать её.

ИСХОДНЫЙ ЗАПРОС: "${previousPrompt}"

ТЕКУЩИЙ КОД ИГРЫ:
\`\`\`html
${previousCode}
\`\`\`

НОВЫЙ ЗАПРОС НА ДОРАБОТКУ: "${newPrompt}"

РАЗОБРАННАЯ СПЕЦИФИКАЦИЯ (обновлённая):
${renderSpec(spec)}

ПРАВИЛА ДОРАБОТКИ:
- Сохрани всё, что не противоречит новому запросу.
- Верни ПОЛНЫЙ обновлённый HTML-файл, а не diff и не фрагмент.
- Не ломай существующие механики, если пользователь не просил.
- Только код.`;
}
