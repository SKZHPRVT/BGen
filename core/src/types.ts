/**
 * BGen Core — базовые типы гипер-ядра.
 *
 * Здесь описаны все сущности, которыми оперируют модули:
 * classifier → compiler → router → analyzer → repair → cache.
 */

// ─────────────────────────────────────────────────────────────
// Жанры
// ─────────────────────────────────────────────────────────────

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
  | "unknown";

// ─────────────────────────────────────────────────────────────
// Аудитория
// ─────────────────────────────────────────────────────────────

export type Audience = "default" | "elderly" | "kids" | "hardcore";

// ─────────────────────────────────────────────────────────────
// Механики
// ─────────────────────────────────────────────────────────────

export type Mechanic =
  | "grow"
  | "collect"
  | "avoid"
  | "jump"
  | "match"
  | "tap"
  | "drag"
  | "swipe"
  | "combo"
  | "timer"
  | "levels"
  | "upgrade"
  | "score"
  | "lives";

// ─────────────────────────────────────────────────────────────
// Ограничения
// ─────────────────────────────────────────────────────────────

export interface Constraints {
  mobile?: boolean;
  noTimer?: boolean;
  highContrast?: boolean;
  largeElements?: boolean;
  colorblindSafe?: boolean;
  noSound?: boolean;
}

// ─────────────────────────────────────────────────────────────
// GameSpec
// ─────────────────────────────────────────────────────────────

export interface GameSpec {
  genre: Genre;
  audience: Audience;
  theme?: string;
  mechanics: Mechanic[];
  constraints: Constraints;
  rawPrompt: string;
  confidence: number;
}

// ─────────────────────────────────────────────────────────────
// Вход / выход ядра
// ─────────────────────────────────────────────────────────────

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
  /** Итоговый self-contained HTML игры */
  html: string;
  /** Спека, по которой генерировали */
  spec: GameSpec;
  /** Сколько попыток потребовалось */
  attempts: number;
  /** Провайдер, отдавший финальный ответ */
  provider: string;
  /** Предупреждения анализатора (не критичные) */
  warnings: string[];
  /** Ошибки, которые чинили по пути */
  repairedErrors: string[];
  /** Взято из кэша */
  fromCache: boolean;
  /**
   * Итоговый статус генерации:
   *   true  — все критические проверки пройдены
   *   false — после N попыток остались критические ошибки
   */
  ok: boolean;
  /** Примерное количество токенов */
  tokensUsed?: number;
  /** Длительность в мс */
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────
// Промпт после компиляции
// ─────────────────────────────────────────────────────────────

export interface CompiledPrompt {
  system: string;
  user: string;
  spec: GameSpec;
  examplesUsed: number;
}

// ─────────────────────────────────────────────────────────────
// Анализ кода
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Провайдеры LLM
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────

export interface CacheEntry {
  html: string;
  spec: GameSpec;
  createdAt: number;
  hits: number;
}

// ─────────────────────────────────────────────────────────────
// Ошибки
// ─────────────────────────────────────────────────────────────

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
