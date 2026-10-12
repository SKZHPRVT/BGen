export interface MetricsSnapshot {
  generations: number;
  successes: number;
  cacheHits: number;
  cacheMisses: number;
  totalAttempts: number;
  repairsTriggered: number;
  avgDurationMs: number;
  byGenre: Record<string, number>;
}

export class Metrics {
  private data = {
    generations: 0,
    successes: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalAttempts: 0,
    repairsTriggered: 0,
    totalDurationMs: 0,
  };
  private byGenre: Record<string, number> = {};

  recordGeneration(genre: string, attempts: number, durationMs: number, fromCache: boolean): void {
    this.data.generations++;
    this.data.totalAttempts += attempts;
    this.data.totalDurationMs += durationMs;
    if (attempts > 1) this.data.repairsTriggered++;
    this.byGenre[genre] = (this.byGenre[genre] ?? 0) + 1;

    if (fromCache) this.data.cacheHits++;
    else this.data.successes++;
  }

  recordCacheMiss(): void { this.data.cacheMisses++; }

  snapshot(): MetricsSnapshot {
    return {
      generations: this.data.generations,
      successes: this.data.successes,
      cacheHits: this.data.cacheHits,
      cacheMisses: this.data.cacheMisses,
      totalAttempts: this.data.totalAttempts,
      repairsTriggered: this.data.repairsTriggered,
      avgDurationMs:
        this.data.generations > 0
          ? Math.round(this.data.totalDurationMs / this.data.generations)
          : 0,
      byGenre: { ...this.byGenre },
    };
  }

  reset(): void {
    this.data = {
      generations: 0, successes: 0, cacheHits: 0, cacheMisses: 0,
      totalAttempts: 0, repairsTriggered: 0, totalDurationMs: 0,
    };
    this.byGenre = {};
  }
}

export const globalMetrics = new Metrics();
