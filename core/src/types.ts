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
// Механики — атомарные игровые свойства, влияющие на промпт
// ─────────────────────────────────────────────────────────────

export type Mechanic =
  | "grow"          // объект растёт
  | "collect"       // сбор предметов
  | "avoid"         // избегание препятствий
  | "jump"          // прыжки
  | "match"         // сопоставление / тройки
  | "tap"           // тап-действие
  | "drag"          // перетаскивание
  | "swipe"         // свайпы
  | "combo"         // серии / комбо
  | "timer"         // ограничение по времени
  | "levels"        // уровни
  | "upgrade"       // апгрейды
  | "score"         // счёт
  | "lives";        // жизни

// ─────────────────────────────────────────────────────────────
// Ограничения — технические требования
// ─────────────────────────────────────────────────────────────

export interface Constraints {
  mobile?: boolean;          // touch-управление
  noTimer?: boolean;         // без ограничения по времени
  highContrast?: boolean;    // повышенный контраст
  largeElements?: boolean;   // крупные элементы
  colorblindSafe?: boolean;  // безопасные цвета
  noSound?: boolean;         // без звука
}

// ─────────────────────────────────────────────────────────────
// GameSpec — результат классификации промпта
// ─────────────────────────────────────────────────────────────

export interface GameSpec {
  genre: Genre;
  audience: Audience;
  theme?: string;               // "космос", "дача", "котики"
  mechanics: Mechanic[];
  constraints: Constraints;
  /** Исходный промпт пользователя, как есть */
  rawPrompt: string;
  /** Уверенность классификатора 0..1 */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────
// Вход / выход ядра
// ─────────────────────────────────────────────────────────────

export interface UserInput {
  prompt: string;
  audience?: Audience;         // если пользователь явно выбрал
  theme?: string;
  previousCode?: string;       // для итераций
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
  /** Few-shot примеры, вставленные в промпт */
  examplesUsed: number;
}

// ─────────────────────────────────────────────────────────────
// Анализ кода
// ─────────────────────────────────────────────────────────────

export interface InvariantIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
  /** Короткий совет для repair loop */
  hint?: string;
}

export interface AnalysisReport {
  ok: boolean;
  errors: InvariantIssue[];
  warnings: InvariantIssue[];
  /** Признаки, что это вообще игра */
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
  /** Доступен ли провайдер прямо сейчас (ключ, URL и т.п.) */
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
