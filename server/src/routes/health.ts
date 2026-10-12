import { Hono } from "hono";
import { globalMetrics } from "../../../core/src/telemetry/metrics.ts";

export const healthRoute = new Hono();

healthRoute.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    metrics: globalMetrics.snapshot(),
  });
});
