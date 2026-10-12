/**
 * Превью-фрейм: iframe с srcdoc, куда вставляется HTML игры.
 * Плюс кнопки restart / fullscreen / share.
 */

export interface PreviewElements {
  frame: HTMLIFrameElement;
  meta: HTMLSpanElement;
  restartBtn: HTMLButtonElement;
  fullscreenBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement | null;
}

export function mountPreview(): PreviewElements {
  const frame = document.getElementById("gameFrame") as HTMLIFrameElement;
  const meta = document.getElementById("previewMeta") as HTMLSpanElement;
  const restartBtn = document.getElementById("restartBtn") as HTMLButtonElement;
  const fullscreenBtn = document.getElementById("fullscreenBtn") as HTMLButtonElement;
  const shareBtn = document.getElementById("shareBtn") as HTMLButtonElement | null;

  if (!frame || !meta || !restartBtn || !fullscreenBtn) {
    throw new Error("Preview: missing DOM elements");
  }

  restartBtn.addEventListener("click", () => {
    const html = frame.srcdoc;
    frame.srcdoc = "";
    requestAnimationFrame(() => {
      frame.srcdoc = html;
    });
  });

  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      frame.requestFullscreen?.().catch(() => {});
    }
  });

  return { frame, meta, restartBtn, fullscreenBtn, shareBtn };
}

export function renderGame(
  el: PreviewElements,
  html: string,
  meta: { genre: string; audience: string; provider: string; fromCache: boolean },
): void {
  el.frame.srcdoc = html;
  el.restartBtn.hidden = false;
  el.fullscreenBtn.hidden = false;
  if (el.shareBtn) el.shareBtn.hidden = false;

  const cacheTag = meta.fromCache ? " · из кэша" : "";
  el.meta.textContent = `${meta.genre} · ${meta.audience} · ${meta.provider}${cacheTag}`;
}

export function clearGame(el: PreviewElements): void {
  el.frame.srcdoc = "";
  el.restartBtn.hidden = true;
  el.fullscreenBtn.hidden = true;
  if (el.shareBtn) el.shareBtn.hidden = true;
  el.meta.textContent = "Игра появится здесь";
}