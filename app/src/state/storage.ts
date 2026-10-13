import { tg, isTelegram } from "../tg.ts";

export interface StorageAdapter {
  readonly name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** localStorage — работает везде, кроме sandboxed iframe без allow-same-origin */
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

/** Telegram CloudStorage — синхронизация между устройствами */
class TelegramCloudAdapter implements StorageAdapter {
  readonly name = "tg-cloud";

  async get(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (val: string | null) => {
        if (resolved) return;
        resolved = true;
        resolve(val);
      };
      if (!tg?.CloudStorage?.getItem) return done(null);
      try {
        tg.CloudStorage.getItem(key, (err, value) => {
          if (err || !value) done(null);
          else done(value);
        });
      } catch { done(null); }
      // Короткий таймаут — не ждём больше секунды
      setTimeout(() => done(null), 1000);
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
      } catch { done(); }
      // Короткий таймаут — не ждём больше секунды
      setTimeout(done, 1000);
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
      } catch { done(); }
      setTimeout(done, 1000);
    });
  }
}

/** In-memory — последний рубеж, работает всегда */
class MemoryAdapter implements StorageAdapter {
  readonly name = "memory";
  private map = new Map<string, string>();
  async get(key: string): Promise<string | null> { return this.map.get(key) ?? null; }
  async set(key: string, value: string): Promise<void> { this.map.set(key, value); }
  async remove(key: string): Promise<void> { this.map.delete(key); }
}

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
