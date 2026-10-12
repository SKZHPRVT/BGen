import type { CorpusEntry } from "./similarity.ts";

let cached: CorpusEntry[] | null = null;

export async function loadCorpus(dir = "core/corpus"): Promise<CorpusEntry[]> {
  if (cached) return cached;

  const entries: CorpusEntry[] = [];
  const glob = new Bun.Glob("**/*.json");

  try {
    for await (const file of glob.scan({ cwd: dir, absolute: false })) {
      if (file === "index.json") continue;
      const full = `${dir}/${file}`;
      try {
        const text = await Bun.file(full).text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          for (const e of json) entries.push(e as CorpusEntry);
        } else if (json && typeof json === "object") {
          entries.push(json as CorpusEntry);
        }
      } catch {
        /* skip broken file */
      }
    }
  } catch {
    /* dir missing — пустой корпус */
  }

  cached = entries;
  return entries;
}

export function clearCorpusCache(): void {
  cached = null;
}

export type { CorpusEntry };
