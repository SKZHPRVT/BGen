import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { config } from "./config.ts";
import { healthRoute } from "./routes/health.ts";
import { generateRoute } from "./routes/generate.ts";
import { corsMiddleware } from "./middlewares/cors.ts";
import { rateLimit } from "./middlewares/rateLimit.ts";
import { telegramAuth } from "./middlewares/telegramAuth.ts";
import { logger } from "../../core/src/telemetry/logger.ts";

const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", honoLogger());

// Telegram auth применяется ко всем /api/* (кроме /api/health)
// Если TELEGRAM_BOT_TOKEN не задан — пропускает без проверки (dev-режим)
app.use("/api/generate", telegramAuth);
app.use("/api/iterate", telegramAuth);

app.use("/api/generate", rateLimit);
app.use("/api/iterate", rateLimit);

app.route("/", healthRoute);
app.route("/", generateRoute);

app.get("/", (c) => {
  return c.json({
    name: "BGen Server",
    version: "0.1.0",
    endpoints: [
      "GET  /api/health",
      "POST /api/generate",
      "POST /api/iterate",
      "GET  /api/stats",
    ],
    telegramAuthEnabled: Boolean(config.telegramBotToken),
  });
});

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

app.onError((err, c) => {
  logger.error("Server error", { message: err.message, stack: err.stack });
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

// ─────────────────────────────────────────────────────────────
// Railway / Production binding
// ─────────────────────────────────────────────────────────────
// Railway передаёт свой $PORT — обязательно слушаем 0.0.0.0,
// иначе снаружи контейнера к серверу не достучаться.
const port = Number(process.env.PORT ?? config.port ?? 3000);
const hostname = "0.0.0.0";

logger.info(`BGen server starting on http://${hostname}:${port}`);
logger.info(`Telegram auth: ${config.telegramBotToken ? "ENABLED" : "disabled (dev mode)"}`);

export default {
  port,
  hostname,
  fetch: app.fetch,
};