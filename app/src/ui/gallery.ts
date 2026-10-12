import { store, type GameRecord } from "../state/store.ts";

export interface GalleryElements {
  root: HTMLElement;
  list: HTMLElement;
}

export function mountGallery(): GalleryElements {
  const root = document.getElementById("gallerySection") as HTMLElement;
  const list = document.getElementById("galleryList") as HTMLElement;
  if (!root || !list) throw new Error("Gallery: missing DOM elements");
  return { root, list };
}

export function renderGallery(
  el: GalleryElements,
  history: GameRecord[],
  onSelect: (rec: GameRecord) => void,
): void {
  if (history.length === 0) {
    el.root.hidden = true;
    return;
  }
  el.root.hidden = false;
  el.list.innerHTML = "";

  for (const rec of history) {
    const item = document.createElement("div");
    item.className = "bgen-gallery-item";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = rec.prompt.slice(0, 40);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${rec.genre} · ${new Date(rec.createdAt).toLocaleDateString()}`;

    item.appendChild(title);
    item.appendChild(meta);
    item.addEventListener("click", () => onSelect(rec));
    el.list.appendChild(item);
  }
}
