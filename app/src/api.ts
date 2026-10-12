import { tg } from "./tg.ts";

// В dev-режиме: пусто → Vite проксирует /api на localhost:3000
// В проде (Pages): абсолютный URL до сервера, задаётся через VITE_API_URL
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export interface GenerateRequest {
  prompt: string;
  audience?: string;
  theme?: string;
  previousCode?: string;
  previousPrompt?: string;
}

export interface GenerateResponse {
  html: string;
  spec: {
    genre: string;
    audience: string;
    theme?: string;
    mechanics: string[];
    confidence: number;
  };
  attempts: number;
  provider: string;
  warnings: string[];
  repairedErrors: string[];
  fromCache: boolean;
  durationMs: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const initData = tg?.initData;
  if (initData) headers["X-Telegram-Init-Data"] = initData;
  return headers;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(err.error ?? err.message ?? "Request failed", res.status);
  }
  return res.json() as Promise<T>;
}

export async function generate(req: GenerateRequest): Promise<GenerateResponse> {
  return postJSON<GenerateResponse>("/api/generate", req);
}

export async function iterate(req: GenerateRequest): Promise<GenerateResponse> {
  return postJSON<GenerateResponse>("/api/iterate", req);
}

export async function health(): Promise<{ status: string; uptime: number }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new ApiError("Health check failed", res.status);
  return res.json();
}