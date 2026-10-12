#!/usr/bin/env bun
/**
 * Seed ManualProvider: готовит очередь ответов для офлайн-демо.
 *
 * Читает заранее подготовленные HTML-файлы из tools/seeds/*.html
 * и валит их в очередь. При запуске сервера с BGEN_USE_MANUAL=1
 * каждый /api/generate будет отдавать следующий файл по порядку.
 *
 * Запуск:
 *   bun tools/src/seed-manual.ts
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SEEDS_DIR = resolve(import.meta.dir, "../seeds");

async function main() {
  console.log(`🌱 Seed directory: ${SEEDS_DIR}`);

  let files: string[];
  try {
    files = await readdir(SEEDS_DIR);
  } catch {
    console.error(`❌ Папка ${SEEDS_DIR} не существует.`);
    console.error("   Создай её и положи туда HTML-файлы игр.");
    process.exit(1);
  }

  const htmls = files.filter((f) => f.endsWith(".html"));
  if (htmls.length === 0) {
    console.error("❌ Нет .html файлов в seeds/");
    process.exit(1);
  }

  console.log(`   Найдено ${htmls.length} файлов:`);
  for (const f of htmls) {
    const content = await readFile(resolve(SEEDS_DIR, f), "utf-8");
    console.log(`   - ${f} (${content.length} chars)`);
  }

  console.log("\n✅ Seeds готовы к использованию.");
  console.log("   Запусти сервер с BGEN_USE_MANUAL=1, и он будет отдавать их по очереди.");
}

main().catch((e) => {
  console.error("❌ seed-manual failed:", e);
  process.exit(1);
});
