/**
 * BGen Core — базовые типы.
 */

export type Genre =
  | "snake"
  | "clicker"
  | "platformer"
  | "puzzle"
  | "runner"
  | "memory"
  | "shooter"
  | "breakout"
  | "2048"
  | "tower"
  | "racing"
  | "fighting"
  | "tanks"
  | "tictactoe"
  | "unknown";

export type Audience = "default" | "elderly" | "kids" | "hardcore";

export type Mechanic =
  | "grow" | "collect" | "avoid" | "jump" | "match" | "tap"
  | "drag" | "swipe" | "combo" | "timer" | "levels" | "upgrade"
  | "score" | "lives";

export interface Constraints {
  mobile?: boolean;
  noTimer?: boolean;
  highContrast?: boolean;
  largeElements?: boolean;
  colorblindSafe?: boolean;
  noSound?: boolean;
}

export interface GameSpec {
  genre: Genre;
  audience: Audience;
  theme?: string;
  mechanics: Mechanic[];
  constraints: Constraints;
  rawPrompt: string;
  confidence: number;
}

export interface UserInput {
  prompt: string;
  audience?: Audience;
  theme?: string;
  previousCode?: string;
  previousPrompt?: string;
}

export interface GenerateOptions {
  maxAttempts?: number;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
  useCorpus?: boolean;
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
}

export interface GenerateResult {
  html: string;
  spec: GameSpec;
  attempts: number;
  provider: string;
  warnings: string[];
  repairedErrors: string[];
  fromCache: boolean;
  ok: boolean;
  tokensUsed?: number;
  durationMs: number;
}

export interface CompiledPrompt {
  system: string;
  user: string;
  spec: GameSpec;
  examplesUsed: number;
}

export interface InvariantIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
  hint?: string;
}

export interface AnalysisReport {
  ok: boolean;
  errors: InvariantIssue[];
  warnings: InvariantIssue[];
  looksLikeGame: boolean;
  html: string;
  size: number;
}

export interface LLMRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generate(req: LLMRequest): Promise<string>;
  generateStream?(req: LLMRequest, onChunk: (t: string) => void): Promise<string>;
}

export interface CacheEntry {
  html: string;
  spec: GameSpec;
  createdAt: number;
  hits: number;
}

export class BGenError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BGenError";
  }
}
