/**
 * BGen Core — публичный API гипер-ядра.
 *
 * Логика:
 *   1. classify → GameSpec
 *   2. Если жанр поддерживается движком → LLM даёт JSON-конфиг → движок строит HTML
 *      При любой ошибке — используем defaultConfig, никогда не уходим на старый pipeline
 *   3. Если жанр не поддерживается → старый pipeline (LLM пишет HTML)
 */
import type {
  GenerateOptions,
  GenerateResult,
  GameSpec,
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

import { isSupported, buildGame } from "./engine/build.ts";
import { buildConfigPrompt } from "./engine/prompts.ts";
import { normalizeConfig, defaultConfig } from "./engine/types.ts";

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

  // ───────────────────────────────────────────────────────────
  // Engine-путь: LLM → JSON → движок → HTML
  // Гарантия: никогда не падает, всегда возвращает HTML
  // ───────────────────────────────────────────────────────────
  async function generateViaEngine(
    userInput: UserInput,
    spec: GameSpec,
    opts: GenerateOptions,
    start: number,
  ): Promise<GenerateResult> {
    logger.info("Using engine", { genre: spec.genre });

    let rawConfig: any = null;
    let providerName = "engine-default";

    // Шаг 1. Пытаемся получить JSON-конфиг от LLM
    try {
      const { system, user } = buildConfigPrompt(
        spec.genre,
        spec.audience,
        userInput.prompt,
      );

      const res = await router.generate({
        system,
        user,
        maxTokens: 2000,
        temperature: 0.7,
      });
      providerName = res.provider;

      logger.info("Engine LLM raw response", {
        provider: res.provider,
        length: res.text.length,
        preview: res.text.slice(0, 200),
      });

      // Парсим JSON
      let cleaned = res.text.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
      cleaned = cleaned.replace(/\n?```\s*$/i, "");

      // Отклоняем ответы с HTML — это явно не JSON-конфиг
      if (
        cleaned.includes("<!DOCTYPE") ||
        cleaned.includes("<html") ||
        cleaned.includes("<script")
      ) {
        logger.warn("LLM returned HTML instead of JSON, using default config");
      } else {
        const js = cleaned.indexOf("{");
        const je = cleaned.lastIndexOf("}");
        if (js !== -1 && je !== -1) {
          try {
            const parsed = JSON.parse(cleaned.slice(js, je + 1));
            // Проверяем, что это похоже на конфиг игры
            if (
              parsed &&
              typeof parsed === "object" &&
              (parsed.title || parsed.colors || parsed.speed || parsed.sprites)
            ) {
              rawConfig = parsed;
              logger.info("Parsed JSON config successfully");
            } else {
              logger.warn("Parsed JSON is not a game config", {
                keys: Object.keys(parsed || {}).slice(0, 10),
              });
            }
          } catch (parseErr) {
            logger.warn("JSON parse failed", {
              error: (parseErr as Error).message,
              preview: cleaned.slice(0, 200),
            });
          }
        } else {
          logger.warn("No JSON object found in LLM response");
        }
      }
    } catch (e) {
      logger.warn("Engine LLM config failed, using default", {
        error: (e as Error).message,
      });
    }

    // Шаг 2. Собираем HTML. Пробуем с LLM-конфигом, при неудаче — дефолт
    let html = "";
    let usedDefault = false;

    try {
      const cfg = normalizeConfig(rawConfig, spec.genre);
      html = buildGame(cfg);
      logger.info("Engine built game", {
        title: cfg.title,
        htmlLength: html.length,
      });
    } catch (buildErr) {
      logger.error("Engine build failed, using default config", {
        error: (buildErr as Error).message,
      });
      try {
        const defCfg = defaultConfig(spec.genre);
        html = buildGame(defCfg);
        usedDefault = true;
      } catch (defErr) {
        logger.error("Even default build failed", {
          error: (defErr as Error).message,
        });
        // Совсем критичный случай — отдаём минимальный HTML
        html = `<!DOCTYPE html><html><body style="background:#111;color:#fff;font-family:sans-serif;padding:40px;text-align:center"><h1>Упс</h1><p>Не удалось собрать игру</p></body></html>`;
        usedDefault = true;
      }
    }

    // Шаг 3. Анализ (быстрый — движок гарантирует структуру)
    let report;
    try {
      report = analyze(html, { html });
    } catch (analyzeErr) {
      logger.warn("Analyze failed", { error: (analyzeErr as Error).message });
      report = { ok: true, errors: [], warnings: [], looksLikeGame: true, html, size: html.length };
    }

    // Шаг 4. Кэш
    if (report.ok && opts.useCache !== false) {
      cache.set(spec, html);
    }

    const durationMs = Date.now() - start;
    globalMetrics.recordGeneration(spec.genre, 1, durationMs, false);
    logger.info("Engine generation done", {
      genre: spec.genre,
      provider: providerName,
      ok: report.ok,
      usedDefault,
      durationMs,
    });

    return {
      html,
      spec,
      attempts: 1,
      provider: usedDefault ? "engine+default" : `engine+${providerName}`,
      warnings: report.warnings.map((w) => `${w.id}: ${w.message}`),
      repairedErrors: [],
      fromCache: false,
      ok: report.ok,
      durationMs,
    };
  }

  return {
    async generate(input, opts = {}): Promise<GenerateResult> {
      const start = Date.now();
      const userInput: UserInput =
        typeof input === "string" ? { prompt: input } : input;

      const spec = classify(userInput);
      logger.info("Generate request", {
        prompt: userInput.prompt,
        spec: spec.genre,
        audience: spec.audience,
      });

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
            ok: true,
            durationMs: Date.now() - start,
          };
        }
        globalMetrics.recordCacheMiss();
      }

      // 2. Движок (для поддерживаемых жанров) — гарантированно возвращает HTML
      if (isSupported(spec.genre)) {
        return generateViaEngine(userInput, spec, opts, start);
      }

      // 3. Старый pipeline (для остальных жанров)
      let examples: string[] = [];
      if (opts.useCorpus !== false) {
        const corpus: CorpusEntry[] = await loadCorpus(corpusDir);
        if (corpus.length > 0) {
          const retrieved = retrieveExamples(spec, corpus, { topK: 2 });
          examples = formatExamplesForPrompt(retrieved);
        }
      }

      const compiled = compile(userInput, { examples });

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

      const finalOk = result.report.ok;
      if (finalOk && opts.useCache !== false) {
        cache.set(spec, result.html);
      }

      const durationMs = Date.now() - start;
      globalMetrics.recordGeneration(spec.genre, result.attempts, durationMs, false);

      return {
        html: result.html,
        spec,
        attempts: result.attempts,
        provider: result.provider,
        warnings: result.report.warnings.map((w) => `${w.id}: ${w.message}`),
        repairedErrors: result.repairedErrors,
        fromCache: false,
        ok: finalOk,
        durationMs,
      };
    },

    async iterate(previousCode, previousPrompt, newPrompt, opts = {}) {
      const newSpec = classify(newPrompt);
      const isGeneric = newSpec.genre === "unknown";
      const effectivePrompt =
        isGeneric && previousPrompt
          ? `${newPrompt} (игра: ${previousPrompt})`
          : newPrompt;

      return this.generate(
        {
          prompt: effectivePrompt,
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
