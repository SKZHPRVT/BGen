import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { config } from "./config.ts";
import { healthRoute } from "./routes/health.ts";
import { generateRoute } from "./routes/generate.ts";
import { debugRoute } from "./routes/debug.ts";
import { corsMiddleware } from "./middlewares/cors.ts";
import { rateLimit } from "./middlewares/rateLimit.ts";
import { telegramAuth } from "./middlewares/telegramAuth.ts";
import { logger } from "../../core/src/telemetry/logger.ts";

const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", honoLogger());

app.use("/api/generate", telegramAuth);
app.use("/api/iterate", telegramAuth);

app.use("/api/generate", rateLimit);
app.use("/api/iterate", rateLimit);

app.route("/", healthRoute);
app.route("/", generateRoute);
app.route("/", debugRoute);

app.get("/", (c) => {
  return c.json({
    name: "BGen Server",
    version: "0.1.0",
    endpoints: [
      "GET  /api/health",
      "GET  /api/debug",
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

logger.info(`BGen server starting on http://${config.host}:${config.port}`);
logger.info(`Telegram auth: ${config.telegramBotToken ? "ENABLED" : "disabled (dev mode)"}`);

export default {
  port: config.port,
  hostname: config.host,
  fetch: app.fetch,
};
