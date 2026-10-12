export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashKey(parts: (string | number | undefined)[]): string {
  return parts
    .filter((p) => p !== undefined && p !== null && p !== "")
    .map((p) => String(p))
    .join("|")
    .toLowerCase()
    .trim();
}

export function shortHash(str: string): string {
  return fnv1a(str).toString(36);
}
