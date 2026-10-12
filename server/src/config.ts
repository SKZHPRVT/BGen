export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  env: process.env.NODE_ENV ?? "development",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  rateLimit: {
    windowMs: 60_000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX ?? 20),
  },
} as const;

// Для Railway: логируем, чтобы видеть в Deploy Logs, что подхватили
console.log(`[BGen/config] PORT=${config.port} HOST=${config.host} ENV=${config.env}`);