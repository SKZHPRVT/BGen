export interface PreviewElements {
  frame: HTMLIFrameElement;
  meta: HTMLSpanElement;
  restartBtn: HTMLButtonElement;
  fullscreenBtn: HTMLButtonElement;
}

export function mountPreview(): PreviewElements {
  const frame = document.getElementById("gameFrame") as HTMLIFrameElement;
  const meta = document.getElementById("previewMeta") as HTMLSpanElement;
  const restartBtn = document.getElementById("restartBtn") as HTMLButtonElement;
  const fullscreenBtn = document.getElementById("fullscreenBtn") as HTMLButtonElement;

  if (!frame || !meta || !restartBtn || !fullscreenBtn) {
    throw new Error("Preview: missing DOM elements");
  }

  restartBtn.addEventListener("click", () => {
    const html = frame.srcdoc;
    frame.srcdoc = "";
    requestAnimationFrame(() => { frame.srcdoc = html; });
  });

  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      frame.requestFullscreen?.().catch(() => {});
    }
  });

  return { frame, meta, restartBtn, fullscreenBtn };
}

export function renderGame(
  el: PreviewElements,
  html: string,
  meta: { genre: string; audience: string; provider: string; fromCache: boolean },
): void {
  el.frame.srcdoc = html;
  el.restartBtn.hidden = false;
  el.fullscreenBtn.hidden = false;
  const cacheTag = meta.fromCache ? " · из кэша" : "";
  el.meta.textContent = `${meta.genre} · ${meta.audience} · ${meta.provider}${cacheTag}`;
}
