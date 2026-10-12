import type { Context, Next } from "hono";
import { config } from "../config.ts";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export async function rateLimit(c: Context, next: Next) {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "local";

  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + config.rateLimit.windowMs };
    buckets.set(ip, bucket);
  }

  bucket.count++;

  if (bucket.count > config.rateLimit.maxRequests) {
    return c.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
      },
      429,
    );
  }

  c.header("X-RateLimit-Remaining", String(config.rateLimit.maxRequests - bucket.count));
  c.header("X-RateLimit-Reset", String(Math.floor(bucket.resetAt / 1000)));

  await next();
}
