/**
 * Адаптеры хранилища.
 *
 * Выбор:
 *   - Telegram: CloudStorage (синхронизация между устройствами)
 *   - Браузер: localStorage
 *   - Fallback: in-memory
 *
 * ВАЖНО: все операции обёрнуты в короткий таймаут (1 сек), чтобы
 * не блокировать UI даже если Telegram CloudStorage не отвечает.
 */

import { tg, isTelegram } from "../tg.ts";

const TIMEOUT_MS = 1000;

export interface StorageAdapter {
  readonly name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

// ═════════════════════════════════════════════════════════════
// localStorage
// ═════════════════════════════════════════════════════════════

class LocalStorageAdapter implements StorageAdapter {
  readonly name = "localStorage";

  async get(key: string): Promise<string | null> {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  async set(key: string, value: string): Promise<void> {
    try { localStorage.setItem(key, value); } catch {}
  }
  async remove(key: string): Promise<void> {
    try { localStorage.removeItem(key); } catch {}
  }
}

// ═════════════════════════════════════════════════════════════
// Telegram CloudStorage
// ═════════════════════════════════════════════════════════════

class TelegramCloudAdapter implements StorageAdapter {
  readonly name = "tg-cloud";

  async get(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (value: string | null) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };

      if (!tg?.CloudStorage?.getItem) return done(null);

      try {
        tg.CloudStorage.getItem(key, (err, value) => {
          done(err || !value ? null : value);
        });
      } catch {
        done(null);
      }

      // Жёсткий таймаут — не ждём дольше 1 сек
      setTimeout(() => done(null), TIMEOUT_MS);
    });
  }

  async set(key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      if (!tg?.CloudStorage?.setItem) return done();

      try {
        tg.CloudStorage.setItem(key, value, () => done());
      } catch {
        done();
      }

      setTimeout(done, TIMEOUT_MS);
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      if (!tg?.CloudStorage?.removeItem) return done();

      try {
        tg.CloudStorage.removeItem(key, () => done());
      } catch {
        done();
      }

      setTimeout(done, TIMEOUT_MS);
    });
  }
}

// ═════════════════════════════════════════════════════════════
// In-memory (fallback)
// ═════════════════════════════════════════════════════════════

class MemoryAdapter implements StorageAdapter {
  readonly name = "memory";
  private map = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
}

// ═════════════════════════════════════════════════════════════
// Выбор адаптера
// ═════════════════════════════════════════════════════════════

function pickAdapter(): StorageAdapter {
  if (isTelegram && tg?.CloudStorage) {
    return new TelegramCloudAdapter();
  }
  try {
    const test = "__bgen_test__";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return new LocalStorageAdapter();
  } catch {
    return new MemoryAdapter();
  }
}

export const storage: StorageAdapter = pickAdapter();

console.log("[BGen] Storage adapter:", storage.name);
