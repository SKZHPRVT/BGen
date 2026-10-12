import type { CacheEntry, GameSpec } from "../types.ts";
import { hashKey } from "../utils/hash.ts";

export interface SemanticCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
}

export class SemanticCache {
  private map = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(opts: SemanticCacheOptions = {}) {
    this.maxEntries = opts.maxEntries ?? 100;
    this.ttlMs = opts.ttlMs ?? 24 * 60 * 60 * 1000;
  }

  key(spec: GameSpec): string {
    return hashKey([
      spec.genre,
      spec.audience,
      spec.theme ?? "",
      [...spec.mechanics].sort().join("+"),
    ]);
  }

  get(spec: GameSpec): string | null {
    const k = this.key(spec);
    const hit = this.map.get(k);
    if (!hit) return null;

    if (Date.now() - hit.createdAt > this.ttlMs) {
      this.map.delete(k);
      return null;
    }

    hit.hits++;
    // LRU: переставляем в конец
    this.map.delete(k);
    this.map.set(k, hit);
    return hit.html;
  }

  set(spec: GameSpec, html: string): void {
    const k = this.key(spec);
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(k, { html, spec, createdAt: Date.now(), hits: 0 });
  }

  size(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
  stats(): { size: number; totalHits: number } {
    let totalHits = 0;
    for (const e of this.map.values()) totalHits += e.hits;
    return { size: this.map.size, totalHits };
  }
}
