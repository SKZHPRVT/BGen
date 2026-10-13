/**
 * Диагностический endpoint.
 * Показывает, что реально в контейнере Railway:
 * - какие жанры поддерживает движок
 * - какие шаблоны лежат в core/src/engine/templates/
 * - cwd, env
 *
 * УДАЛИТЬ ПЕРЕД ФИНАЛЬНОЙ СДАЧЕЙ (не нужен в проде).
 */
import { Hono } from "hono";
import { isSupported, SUPPORTED_GENRES } from "../../../core/src/engine/build.ts";
import { readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const debugRoute = new Hono();

debugRoute.get("/api/debug", (c) => {
  let templates: string[] = [];
  let templatesError: string | null = null;
  let buildTsContent = "";
  let buildTsPath = "";

  try {
    // Ищем папку templates относительно этого файла
    const here = dirname(fileURLToPath(import.meta.url));
    // server/src/routes → ../../../core/src/engine/templates
    const templatesDir = resolve(here, "../../../core/src/engine/templates");
    if (existsSync(templatesDir)) {
      templates = readdirSync(templatesDir).filter((f) => f.endsWith(".ts"));
    } else {
      templatesError = `Not found: ${templatesDir}`;
    }

    const buildTs = resolve(here, "../../../core/src/engine/build.ts");
    buildTsPath = buildTs;
    if (existsSync(buildTs)) {
      // Показываем первые 500 символов build.ts, чтобы увидеть SUPPORTED_GENRES
      const { readFileSync } = await import("node:fs");
      buildTsContent = readFileSync(buildTs, "utf-8").slice(0, 800);
    }
  } catch (e) {
    templatesError = (e as Error).message;
  }

  return c.json({
    supportedGenres: SUPPORTED_GENRES,
    checks: {
      snake: isSupported("snake"),
      clicker: isSupported("clicker"),
      memory: isSupported("memory"),
      "2048": isSupported("2048"),
    },
    templatesInContainer: templates,
    templatesError,
    buildTsPath,
    buildTsPreview: buildTsContent,
    env: {
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd(),
      bunVersion: (globalThis as any).Bun?.version ?? "unknown",
    },
    timestamp: new Date().toISOString(),
  });
});
