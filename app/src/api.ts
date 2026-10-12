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

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
  const res = await fetch("/api/health");
  if (!res.ok) throw new ApiError("Health check failed", res.status);
  return res.json();
}
