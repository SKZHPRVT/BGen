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

  gigachat: {
    authKey: process.env.GIGACHAT_AUTH_KEY ?? "",
    model: process.env.GIGACHAT_MODEL ?? "GigaChat",
    scope: process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS",
  },
} as const;