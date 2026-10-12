/**
 * Валидация Telegram WebApp initData.
 *
 * Как работает:
 * 1. Telegram передаёт клиенту строку initData в window.Telegram.WebApp.initData
 * 2. Клиент шлёт её в заголовке X-Telegram-Init-Data
 * 3. Сервер пересчитывает подпись HMAC-SHA256 с bot-токеном
 * 4. Если подписи совпали — данные подлинные
 *
 * Формат initData:
 *   query_id=AAA&user=%7B%22id%22%3A123...%7D&auth_date=1234567890&hash=<hmac>
 *
 * Алгоритм (из офдок Telegram):
 *   data_check_string = отсортированные по алфавиту пары key=value,
 *                       соединённые \n, без поля hash
 *   secret_key = HMAC_SHA256("WebAppData", bot_token)
 *   hash = HMAC_SHA256(secret_key, data_check_string).hex()
 *
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
import type { Context, Next } from "hono";
import { config } from "../config.ts";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramAuthData {
  user?: TelegramUser;
  authDate: number;
  queryId?: string;
  startParam?: string;
  raw: string;
}

export interface TelegramAuthContext {
  authenticated: boolean;
  user?: TelegramUser;
  reason?: string;
}

/**
 * Проверяет подпись initData через HMAC-SHA256.
 * Возвращает null, если подпись невалидна или токен не настроен.
 */
async function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400, // 24 часа
): Promise<TelegramAuthData | null> {
  if (!initData || !botToken) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;

  // Собираем data_check_string: все пары кроме hash, отсортированные по ключу
  const entries: [string, string][] = [];
  for (const [k, v] of params.entries()) {
    if (k === "hash") continue;
    entries.push([k, v]);
  }
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const encoder = new TextEncoder();
  const botTokenKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const secretKeyBytes = await crypto.subtle.sign(
    "HMAC",
    botTokenKey,
    encoder.encode(botToken),
  );

  // hash = HMAC_SHA256(secret_key, data_check_string)
  const secretKey = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(dataCheckString),
  );
  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHash !== hash) return null;

  // Проверяем давность
  const authDate = Number(params.get("auth_date") ?? 0);
  if (authDate <= 0) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSeconds) return null;

  // Парсим user
  let user: TelegramUser | undefined;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      /* ignore */
    }
  }

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
    raw: initData,
  };
}

/**
 * Hono middleware: добавляет c.set("telegramAuth", authData) в контекст.
 *
 * Поведение:
 * - Если TELEGRAM_BOT_TOKEN не задан (dev) → пропускаем всех, authenticated = false
 * - Если initData валиден → authenticated = true, user заполнен
 * - Если initData невалиден → 401
 */
export async function telegramAuth(c: Context, next: Next) {
  const initData = c.req.header("X-Telegram-Init-Data") ?? "";

  // Dev-режим: токен не задан — пропускаем без проверки
  if (!config.telegramBotToken) {
    c.set("telegramAuth", { authenticated: false } as TelegramAuthContext);
    await next();
    return;
  }

  // Прод-режим: токен задан, но initData отсутствует
  if (!initData) {
    // Разрешаем "анонимный" доступ для /api/health и для локальной разработки
    // с явно заданным разрешением
    if (process.env.BGEN_ALLOW_ANONYMOUS === "1") {
      c.set("telegramAuth", { authenticated: false, reason: "anonymous allowed" });
      await next();
      return;
    }
    return c.json({ error: "Missing X-Telegram-Init-Data header" }, 401);
  }

  const verified = await verifyInitData(initData, config.telegramBotToken);
  if (!verified) {
    return c.json({ error: "Invalid initData signature" }, 401);
  }

  c.set("telegramAuth", {
    authenticated: true,
    user: verified.user,
  } as TelegramAuthContext);

  await next();
}

/**
 * Хелпер для получения auth-данных из контекста.
 */
export function getTelegramAuth(c: Context): TelegramAuthContext {
  return (c.get("telegramAuth") as TelegramAuthContext) ?? { authenticated: false };
}