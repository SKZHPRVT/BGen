#!/usr/bin/env bun
/**
 * Прогон набора промптов через классификатор ядра.
 * Проверяет, что classifier правильно понимает жанр и аудиторию.
 */
import { classify } from "../../core/src/prompt/classifier.ts";

interface TestCase {
  prompt: string;
  expectGenre: string;
  expectAudience: string;
}

const CASES: TestCase[] = [
  { prompt: "замути змейку для бабушки", expectGenre: "snake", expectAudience: "elderly" },
  { prompt: "сделай кликер для детей с котиками", expectGenre: "clicker", expectAudience: "kids" },
  { prompt: "простой платформер с прыжками", expectGenre: "platformer", expectAudience: "default" },
  { prompt: "головоломка три в ряд", expectGenre: "puzzle", expectAudience: "default" },
  { prompt: "бесконечный раннер в космосе", expectGenre: "runner", expectAudience: "default" },
  { prompt: "мемори с крупными карточками для пожилых", expectGenre: "memory", expectAudience: "elderly" },
  { prompt: "аркадный шутер", expectGenre: "shooter", expectAudience: "default" },
  { prompt: "арканоид с кирпичами", expectGenre: "breakout", expectAudience: "default" },
  { prompt: "2048 с плитками", expectGenre: "2048", expectAudience: "default" },
  { prompt: "башня из блоков", expectGenre: "tower", expectAudience: "default" },
  { prompt: "сложный раннер для про", expectGenre: "runner", expectAudience: "hardcore" },
  { prompt: "змейка для детей", expectGenre: "snake", expectAudience: "kids" },
  { prompt: "кликер для бабушки", expectGenre: "clicker", expectAudience: "elderly" },
  { prompt: "хардкорный шутер", expectGenre: "shooter", expectAudience: "hardcore" },
  { prompt: "пазл для малышей", expectGenre: "puzzle", expectAudience: "kids" },
  { prompt: "игра в стиле марио", expectGenre: "platformer", expectAudience: "default" },
  { prompt: "тир по мишеням", expectGenre: "shooter", expectAudience: "default" },
  { prompt: "печеньки кликер", expectGenre: "clicker", expectAudience: "default" },
  { prompt: "три в ряд для детей", expectGenre: "puzzle", expectAudience: "kids" },
  { prompt: "пятнашки классические", expectGenre: "puzzle", expectAudience: "default" },
];

let passed = 0, failed = 0;
const failures: string[] = [];

console.log("🧪 Running classifier tests...\n");

for (const tc of CASES) {
  const spec = classify(tc.prompt);
  const okGenre = spec.genre === tc.expectGenre;
  const okAudience = spec.audience === tc.expectAudience;
  const ok = okGenre && okAudience;

  const mark = ok ? "✅" : "❌";
  const got = `${spec.genre}/${spec.audience}`;
  const exp = `${tc.expectGenre}/${tc.expectAudience}`;

  if (ok) {
    passed++;
    console.log(`${mark} "${tc.prompt}" → ${got}`);
  } else {
    failed++;
    const detail = [];
    if (!okGenre) detail.push(`genre ${spec.genre} ≠ ${tc.expectGenre}`);
    if (!okAudience) detail.push(`audience ${spec.audience} ≠ ${tc.expectAudience}`);
    console.log(`${mark} "${tc.prompt}" → ${got} (ожидалось ${exp}: ${detail.join(", ")})`);
    failures.push(`  - "${tc.prompt}": ${detail.join(", ")}`);
  }
}

console.log(`\n📊 Итог: ${passed} passed, ${failed} failed из ${CASES.length}`);

if (failed > 0) {
  console.log("\n🔧 Что нужно поправить в classifier:");
  console.log(failures.join("\n"));
  process.exit(1);
} else {
  console.log("🎉 Все промпты классифицируются верно!");
}
