type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function log(level: Level, msg: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    console.log(prefix, msg, JSON.stringify(data));
  } else {
    console.log(prefix, msg);
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => log("debug", msg, data),
  info: (msg: string, data?: unknown) => log("info", msg, data),
  warn: (msg: string, data?: unknown) => log("warn", msg, data),
  error: (msg: string, data?: unknown) => log("error", msg, data),
};
