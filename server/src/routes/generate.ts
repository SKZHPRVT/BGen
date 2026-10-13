import { Hono } from "hono";
import { createGenerator } from "../../../core/src/index.ts";
import { MockProvider } from "../../../core/src/llm/providers/mock.ts";
import { createDefaultRouter } from "../../../core/src/llm/router.ts";
import { logger } from "../../../core/src/telemetry/logger.ts";
import type { Audience } from "../../../core/src/types.ts";

export const generateRoute = new Hono();

// Один генератор на весь сервер (кэш переиспользуется)
const providerOverride =
  process.env.BGEN_USE_MOCK === "1"
    ? [new MockProvider(200)]
    : undefined;

const generator = createGenerator(
  providerOverride
    ? { providers: providerOverride }
    : { router: createDefaultRouter() },
);

interface GenerateBody {
  prompt?: string;
  audience?: Audience;
  theme?: string;
  previousCode?: string;
  previousPrompt?: string;
  stream?: boolean;
}

/**
 * Валидация входящего промпта.
 * Защита от injection, XSS, чрезмерных размеров.
 */
function validatePrompt(prompt: string): string | null {
  if (!prompt) return "Field 'prompt' is required";
  if (prompt.length > 500) return "Prompt is too long (max 500 chars)";
  if (prompt.length < 2) return "Prompt is too short";

  // Защита от попыток инъекций
  if (/<\/?script/i.test(prompt)) return "Prompt contains forbidden tag";
  if (/<iframe/i.test(prompt)) return "Prompt contains forbidden tag";
  if (/<img[^>]*onerror/i.test(prompt)) return "Prompt contains forbidden pattern";

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(prompt)) return "Prompt contains control characters";

  return null;
}

generateRoute.post("/api/generate", async (c) => {
  let body: GenerateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = (body.prompt ?? "").trim();
  const validationError = validatePrompt(prompt);
  if (validationError) return c.json({ error: validationError }, 400);

  const start = Date.now();
  try {
    const result = await generator.generate({
      prompt,
      audience: body.audience,
      theme: body.theme,
      previousCode: body.previousCode,
      previousPrompt: body.previousPrompt,
    });

    return c.json({
      html: result.html,
      spec: result.spec,
      attempts: result.attempts,
      provider: result.provider,
      warnings: result.warnings,
      repairedErrors: result.repairedErrors,
      fromCache: result.fromCache,
      ok: result.ok,
      durationMs: Date.now() - start,
    });
  } catch (e) {
    logger.error("Generate failed", {
      error: (e as Error).message,
      prompt: prompt.slice(0, 100),
    });
    return c.json(
      {
        error: "Generation failed",
        message: (e as Error).message,
      },
      500,
    );
  }
});

generateRoute.post("/api/iterate", async (c) => {
  let body: GenerateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const newPrompt = (body.prompt ?? "").trim();
  const previousCode = body.previousCode ?? "";
  const previousPrompt = body.previousPrompt ?? "";

  const validationError = validatePrompt(newPrompt);
  if (validationError) return c.json({ error: validationError }, 400);
  if (!previousCode) return c.json({ error: "Field 'previousCode' is required" }, 400);
  if (previousCode.length > 200_000) {
    return c.json({ error: "previousCode is too large" }, 400);
  }

  try {
    const result = await generator.iterate(previousCode, previousPrompt, newPrompt);
    return c.json({
      html: result.html,
      spec: result.spec,
      attempts: result.attempts,
      provider: result.provider,
      warnings: result.warnings,
      fromCache: false,
      ok: result.ok,
      durationMs: result.durationMs,
    });
  } catch (e) {
    logger.error("Iterate failed", { error: (e as Error).message });
    return c.json({ error: "Iteration failed", message: (e as Error).message }, 500);
  }
});

generateRoute.get("/api/stats", (c) => {
  return c.json(generator.stats());
});
