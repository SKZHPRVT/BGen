#!/usr/bin/env bun
/**
 * Массовая генерация эталонных игр в корпус.
 * Использует живой LLM-роутер (не mock!).
 *
 * Запуск:
 *   bun tools/src/gen-corpus.ts
 *   TARGETS=snake:elderly,clicker:kids bun tools/src/gen-corpus.ts
 *
 * Требует рабочих LLM-провайдеров (anthropic/openai/ollama).
 */
import { createGenerator } from "../../core/src/index.ts";
import { createDefaultRouter } from "../../core/src/llm/router.ts";
import { writeFile, mkdir } from "node:fs/promises";
import type { Audience } from "../../core/src/types.ts";

interface Target {
  genre: string;
  audience: Audience;
  prompt: string;
  theme?: string;
}

const ALL_TARGETS: Target[] = [
  { genre: "snake", audience: "elderly", prompt: "замути змейку для бабушки" },
  { genre: "snake", audience: "default", prompt: "классическая змейка" },
  { genre: "snake", audience: "kids", prompt: "змейка для детей" },
  { genre: "clicker", audience: "kids", prompt: "кликер с котиками для детей", theme: "котики" },
  { genre: "clicker", audience: "elderly", prompt: "простой кликер для пожилых" },
  { genre: "platformer", audience: "default", prompt: "простой платформер с монетками" },
  { genre: "puzzle", audience: "elderly", prompt: "три в ряд для пожилых" },
  { genre: "runner", audience: "default", prompt: "бесконечный раннер в космосе" },
  { genre: "memory", audience: "elderly", prompt: "мемори для пожилых с крупными карточками" },
];

function parseTargets(): Target[] {
  const env = process.env.TARGETS;
  if (!env) return ALL_TARGETS;
  return env.split(",").map((s) => {
    const [genre, audience] = s.split(":");
    const found = ALL_TARGETS.find((t) => t.genre === genre && t.audience === audience);
    if (!found) throw new Error(`Unknown target: ${s}`);
    return found;
  });
}

async function main() {
  const targets = parseTargets();
  const router = createDefaultRouter();
  const available = router.available();

  console.log(`🎨 BGen corpus generator`);
  console.log(`   Targets: ${targets.length}`);
  console.log(`   Providers available: ${available.join(", ") || "none"}`);
  console.log("");

  if (available.length === 0 || (available.length === 1 && available[0] === "manual")) {
    console.error("❌ Нет живых провайдеров. Настрой .env или запусти Ollama.");
    process.exit(1);
  }

  const gen = createGenerator({ router });

  for (const target of targets) {
    console.log(`\n→ Generating ${target.genre}/${target.audience}...`);
    const t0 = Date.now();

    try {
      const res = await gen.generate({
        prompt: target.prompt,
        audience: target.audience,
        theme: target.theme,
      });

      const entry = {
        id: `${target.genre}-${target.audience}-${Date.now().toString(36)}`,
        genre: res.spec.genre,
        audience: res.spec.audience,
        theme: res.spec.theme,
        mechanics: res.spec.mechanics,
        prompt: target.prompt,
        metrics: { plays: 0, winRate: 0, avgSessionSec: 0 },
        html: res.html,
      };

      const dir = `core/corpus/${target.genre}`;
      await mkdir(dir, { recursive: true });
      const filename = `${dir}/${target.audience}-${Date.now().toString(36)}.json`;
      await writeFile(filename, JSON.stringify(entry, null, 2), "utf-8");

      console.log(`  ✅ ${filename}`);
      console.log(`     attempts=${res.attempts} provider=${res.provider} duration=${Date.now() - t0}ms`);
      console.log(`     warnings=${res.warnings.length}`);
    } catch (e) {
      console.error(`  ❌ Failed: ${(e as Error).message}`);
    }
  }

  console.log("\n🎉 Done. Corpus updated.");
}

main().catch((e) => {
  console.error("❌ gen-corpus failed:", e);
  process.exit(1);
});
