#!/usr/bin/env bun
/**
 * Бенчмарк ядра: сколько времени занимает генерация, кэш, анализ.
 * По умолчанию использует MockProvider (без сети).
 *
 * Запуск:
 *   bun tools/src/bench.ts
 *   BENCH_N=10 bun tools/src/bench.ts
 */
import { createGenerator } from "../../core/src/index.ts";
import { MockProvider } from "../../core/src/llm/providers/mock.ts";
import { analyze } from "../../core/src/analyze/report.ts";

const N = Number(process.env.BENCH_N ?? 5);

const PROMPTS = [
  "замути змейку для бабушки",
  "кликер с котиками для детей",
  "простой платформер",
  "головоломка три в ряд",
  "бесконечный раннер",
];

async function main() {
  console.log(`🚀 BGen bench (N=${N}, mock provider)\n`);

  const gen = createGenerator({ providers: [new MockProvider(20)] });

  // 1. Генерация без кэша
  const genTimes: number[] = [];
  console.log("📝 Cold generation:");
  for (let i = 0; i < N; i++) {
    const prompt = PROMPTS[i % PROMPTS.length]!;
    const t0 = performance.now();
    const res = await gen.generate(prompt, { useCache: false });
    const t = performance.now() - t0;
    genTimes.push(t);
    console.log(`  ${(t).toFixed(1).padStart(7)}ms · ${res.spec.genre.padEnd(10)} · ${prompt}`);
  }

  // 2. Кэш
  console.log("\n⚡ Warm cache:");
  const cacheTimes: number[] = [];
  for (let i = 0; i < N; i++) {
    const prompt = PROMPTS[i % PROMPTS.length]!;
    const t0 = performance.now();
    const res = await gen.generate(prompt);
    const t = performance.now() - t0;
    cacheTimes.push(t);
    console.log(`  ${(t).toFixed(1).padStart(7)}ms · fromCache=${res.fromCache} · ${prompt}`);
  }

  // 3. Анализ HTML
  console.log("\n🔍 Analyze only:");
  const sampleHtml = (await gen.generate(PROMPTS[0]!, { useCache: true })).html;
  const analyzeTimes: number[] = [];
  for (let i = 0; i < N * 10; i++) {
    const t0 = performance.now();
    analyze(sampleHtml);
    analyzeTimes.push(performance.now() - t0);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const p95 = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  };

  console.log("\n📊 Итоги:");
  console.log(`  Cold gen:    avg ${avg(genTimes).toFixed(1)}ms · p95 ${p95(genTimes).toFixed(1)}ms`);
  console.log(`  Warm cache:  avg ${avg(cacheTimes).toFixed(2)}ms · p95 ${p95(cacheTimes).toFixed(2)}ms`);
  console.log(`  Analyze:     avg ${avg(analyzeTimes).toFixed(3)}ms · p95 ${p95(analyzeTimes).toFixed(3)}ms`);
  console.log(`  Speedup:     x${(avg(genTimes) / avg(cacheTimes)).toFixed(1)}`);
  console.log("\n📈 Metrics:");
  console.log(JSON.stringify(gen.stats(), null, 2));
}

main().catch((e) => {
  console.error("❌ Bench failed:", e);
  process.exit(1);
});
