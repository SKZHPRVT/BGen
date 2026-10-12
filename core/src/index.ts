/**
 * BGen Core — публичный API гипер-ядра.
 *
 *   const gen = createGenerator();
 *   const result = await gen.generate({ prompt: "замути змейку для бабушки" });
 *   console.log(result.html); // playable HTML
 */
import type {
  GenerateOptions,
  GenerateResult,
  LLMProvider,
  UserInput,
} from "./types.ts";
import { compile } from "./prompt/compiler.ts";
import { classify } from "./prompt/classifier.ts";
import { Router, createDefaultRouter } from "./llm/router.ts";
import { generateWithRepair } from "./repair/loop.ts";
import { analyze } from "./analyze/report.ts";
import { retrieveExamples, formatExamplesForPrompt } from "./corpus/retriever.ts";
import { loadCorpus, type CorpusEntry } from "./corpus/index.ts";
import { SemanticCache } from "./cache/semantic.ts";
import { globalMetrics } from "./telemetry/metrics.ts";
import { logger } from "./telemetry/logger.ts";

export interface GeneratorOptions {
  router?: Router;
  providers?: LLMProvider[];
  cache?: SemanticCache;
  corpusDir?: string;
  timeoutMs?: number;
}

export interface BGenGenerator {
  generate(input: UserInput | string, opts?: GenerateOptions): Promise<GenerateResult>;
  iterate(
    previousCode: string,
    previousPrompt: string,
    newPrompt: string,
    opts?: GenerateOptions,
  ): Promise<GenerateResult>;
  analyze(html: string): ReturnType<typeof analyze>;
  stats(): ReturnType<typeof globalMetrics.snapshot>;
  clearCache(): void;
}

export function createGenerator(options: GeneratorOptions = {}): BGenGenerator {
  const router = options.router ?? createDefaultRouter({
    providers: options.providers,
    timeoutMs: options.timeoutMs,
  });
  const cache = options.cache ?? new SemanticCache();
  const corpusDir = options.corpusDir ?? "core/corpus";

  return {
    async generate(input, opts = {}): Promise<GenerateResult> {
      const start = Date.now();
      const userInput: UserInput =
        typeof input === "string" ? { prompt: input } : input;

      const spec = classify(userInput);
      logger.info("Generate request", { prompt: userInput.prompt, spec: spec.genre, audience: spec.audience });

      // 1. Кэш
      if (opts.useCache !== false) {
        const cached = cache.get(spec);
        if (cached) {
          globalMetrics.recordGeneration(spec.genre, 1, Date.now() - start, true);
          logger.info("Cache hit", { genre: spec.genre });
          return {
            html: cached,
            spec,
            attempts: 1,
            provider: "cache",
            warnings: [],
            repairedErrors: [],
            fromCache: true,
            durationMs: Date.now() - start,
          };
        }
        globalMetrics.recordCacheMiss();
      }

      // 2. Few-shot из корпуса
      let examples: string[] = [];
      if (opts.useCorpus !== false) {
        const corpus: CorpusEntry[] = await loadCorpus(corpusDir);
        if (corpus.length > 0) {
          const retrieved = retrieveExamples(spec, corpus, { topK: 2 });
          examples = formatExamplesForPrompt(retrieved);
          logger.info("Corpus retrieval", { found: retrieved.length, total: corpus.length });
        }
      }

      // 3. Компиляция промпта
      const compiled = compile(userInput, { examples });

      // 4. Генерация с auto-repair
      const result = await generateWithRepair(
        router,
        compiled.system,
        compiled.user,
        {
          maxAttempts: opts.maxAttempts ?? 3,
          maxTokens: opts.maxTokens ?? 8000,
          temperature: opts.temperature,
          signal: opts.signal,
          onChunk: opts.onChunk,
        },
      );

      // 5. Кэш
      if (result.report.ok && opts.useCache !== false) {
        cache.set(spec, result.html);
      }

      const durationMs = Date.now() - start;
      globalMetrics.recordGeneration(spec.genre, result.attempts, durationMs, false);
      logger.info("Generation done", {
        genre: spec.genre,
        attempts: result.attempts,
        ok: result.report.ok,
        durationMs,
      });

      return {
        html: result.html,
        spec,
        attempts: result.attempts,
        provider: result.provider,
        warnings: result.report.warnings.map((w) => `${w.id}: ${w.message}`),
        repairedErrors: result.repairedErrors,
        fromCache: false,
        durationMs,
      };
    },

    async iterate(previousCode, previousPrompt, newPrompt, opts = {}) {
      return this.generate(
        {
          prompt: newPrompt,
          previousCode,
          previousPrompt,
        },
        { ...opts, useCache: false },
      );
    },

    analyze,

    stats: () => globalMetrics.snapshot(),

    clearCache: () => cache.clear(),
  };
}

// Реэкспорт полезного
export type {
  Audience,
  GameSpec,
  Genre,
  GenerateOptions,
  GenerateResult,
  Mechanic,
  UserInput,
  LLMProvider,
  CacheEntry,
  AnalysisReport,
  InvariantIssue,
  CompiledPrompt,
} from "./types.ts";

export { classify } from "./prompt/classifier.ts";
export { compile } from "./prompt/compiler.ts";
export { analyze } from "./analyze/report.ts";
export { Router, createDefaultRouter } from "./llm/router.ts";
export { SemanticCache } from "./cache/semantic.ts";
export { loadCorpus } from "./corpus/index.ts";
export { retrieveExamples } from "./corpus/retriever.ts";
export { globalMetrics } from "./telemetry/metrics.ts";
export { logger } from "./telemetry/logger.ts";
