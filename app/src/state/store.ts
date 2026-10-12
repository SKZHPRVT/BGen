/**
 * Простейшее observable-хранилище без зависимостей.
 */

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

  constructor() {
    this.state.history = this.loadHistory();
  }

  get(): State { return this.state; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  async addGame(rec: GameRecord): Promise<void> {
    this.state.history = [rec, ...this.state.history].slice(0, MAX_HISTORY);
    this.saveHistory();
    this.set({ currentGame: rec });
  }

  removeGame(id: string): void {
    this.state.history = this.state.history.filter((g) => g.id !== id);
    this.saveHistory();
    this.set({});
  }

  clearHistory(): void {
    this.state.history = [];
    this.saveHistory();
    this.set({});
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.history));
    } catch {
      /* quota */
    }
  }

  private loadHistory(): GameRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as GameRecord[];
    } catch {
      return [];
    }
  }
}

export const store = new Store();
