import { storage } from "./storage.ts";

export interface GameRecord {
  id: string;
  prompt: string;
  audience: string;
  genre: string;
  html: string;
  createdAt: number;
  attempts: number;
  provider: string;
}

export interface State {
  loading: boolean;
  status: string;
  statusType: "info" | "error" | "success";
  currentGame: GameRecord | null;
  history: GameRecord[];
}

type Listener = (state: State) => void;

const STORAGE_KEY = "bgen_history_v1";
const MAX_HISTORY = 20;

class Store {
  private state: State = {
    loading: false,
    status: "",
    statusType: "info",
    currentGame: null,
    history: [],
  };
  private listeners: Set<Listener> = new Set();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await storage.get(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GameRecord[];
        if (Array.isArray(parsed)) {
          this.state.history = parsed.slice(0, MAX_HISTORY);
          this.emit();
        }
      }
    } catch (e) {
      console.warn("[store] load failed", e);
    }
  }

  get(): State { return this.state; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  /**
   * ВАЖНО: этот метод НЕ асинхронный для UI.
   * Он мгновенно обновляет state и emit'ит.
   * Сохранение в storage идёт В ФОНЕ через fire-and-forget.
   */
  addGame(rec: GameRecord): void {
    this.state.history = [rec, ...this.state.history].slice(0, MAX_HISTORY);
    this.state.currentGame = rec;
    this.emit();

    // Persist в фоне — не блокирует UI
    this.persistInBackground();
  }

  removeGame(id: string): void {
    this.state.history = this.state.history.filter((g) => g.id !== id);
    this.emit();
    this.persistInBackground();
  }

  clearHistory(): void {
    this.state.history = [];
    this.emit();
    this.persistInBackground();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }

  /**
   * Fire-and-forget сохранение. Не ждём, не блокируем.
   */
  private persistInBackground(): void {
    const data = JSON.stringify(this.state.history);
    storage.set(STORAGE_KEY, data).catch((e) => {
      console.warn("[store] persist failed", e);
    });
  }
}

export const store = new Store();
