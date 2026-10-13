import { Hono } from "hono";
import { isSupported, SUPPORTED_GENRES } from "../../../core/src/engine/build.ts";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const debugRoute = new Hono();

const __dirname = dirname(fileURLToPath(import.meta.url));

debugRoute.get("/api/debug", (c) => {
  let templates: string[] = [];
  let templatesDir = "";
  let dirExists = false;

  try {
    templatesDir = resolve(__dirname, "../../../core/src/engine/templates");
    dirExists = existsSync(templatesDir);
    if (dirExists) {
      templates = readdirSync(templatesDir);
    }
  } catch (e) {
    templates = [`error: ${(e as Error).message}`];
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
    templatesDir,
    dirExists,
    env: {
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd(),
    },
    timestamp: new Date().toISOString(),
  });
});