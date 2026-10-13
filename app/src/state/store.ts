/**
 * Простейшее observable-хранилище.
 *
 * ВАЖНО: addGame обновляет state СИНХРОННО, а сохранение в storage
 * делает в фоне (fire-and-forget). Это не блокирует UI в TMA,
 * где CloudStorage может тормозить.
 */

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
   * СИНХРОННО обновляет state и возвращает управление.
   * Сохранение в storage — в фоне. UI не блокируется.
   */
  async addGame(rec: GameRecord): Promise<void> {
    this.state.history = [rec, ...this.state.history].slice(0, MAX_HISTORY);
    this.state.currentGame = rec;
    this.emit();

    // Fire-and-forget — не блокируем клиента
    this.persistBackground();
  }

  async removeGame(id: string): Promise<void> {
    this.state.history = this.state.history.filter((g) => g.id !== id);
    this.emit();
    this.persistBackground();
  }

  async clearHistory(): Promise<void> {
    this.state.history = [];
    this.emit();
    this.persistBackground();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }

  /**
   * Сохранение в фоне. Не блокирует UI.
   */
  private persistBackground(): void {
    const data = JSON.stringify(this.state.history);
    // Не await — просто запускаем и забываем
    storage.set(STORAGE_KEY, data).catch((e) => {
      console.warn("[store] persist failed", e);
    });
  }
}

export const store = new Store();
