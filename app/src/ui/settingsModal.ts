/**
 * Модал настроек: показывается по тапу на ⚙ в правом верхнем углу игры.
 * Содержит: мета, итерацию, экспорт, share, рестарт, fullscreen, создать новую.
 */

export interface SettingsCallbacks {
  onIterate: (newPrompt: string) => void;
  onExport: () => void;
  onShare: () => void;
  onRestart: () => void;
  onFullscreen: () => void;
  onNewGame: () => void;
}

export interface SettingsElements {
  modal: HTMLDivElement;
  meta: HTMLDivElement;
  iterateInput: HTMLTextAreaElement;
  iterateBtn: HTMLButtonElement;
  exportBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  restartBtn: HTMLButtonElement;
  fullscreenBtn: HTMLButtonElement;
  newGameBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
  backdrop: HTMLDivElement;
  open: () => void;
  close: () => void;
  setMeta: (text: string) => void;
  setLoading: (loading: boolean) => void;
}

export function mountSettings(callbacks: SettingsCallbacks): SettingsElements | null {
  const modal = document.getElementById("settingsModal") as HTMLDivElement | null;
  const meta = document.getElementById("modalMeta") as HTMLDivElement | null;
  const iterateInput = document.getElementById("iterateInput") as HTMLTextAreaElement | null;
  const iterateBtn = document.getElementById("iterateBtn") as HTMLButtonElement | null;
  const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement | null;
  const shareBtn = document.getElementById("shareBtn") as HTMLButtonElement | null;
  const restartBtn = document.getElementById("restartBtn") as HTMLButtonElement | null;
  const fullscreenBtn = document.getElementById("fullscreenBtn") as HTMLButtonElement | null;
  const newGameBtn = document.getElementById("newGameBtn") as HTMLButtonElement | null;
  const closeBtn = document.getElementById("modalClose") as HTMLButtonElement | null;
  const backdrop = modal?.querySelector(".modal-backdrop") as HTMLDivElement | null;

  if (!modal || !meta || !iterateInput || !iterateBtn || !exportBtn || !shareBtn ||
      !restartBtn || !fullscreenBtn || !newGameBtn || !closeBtn || !backdrop) {
    console.warn("[settings] missing DOM elements");
    return null;
  }

  function open(): void {
    modal!.removeAttribute("hidden");
  }

  function close(): void {
    modal!.setAttribute("hidden", "");
    iterateInput!.value = "";
  }

  function setMeta(text: string): void {
    meta!.textContent = text;
  }

  function setLoading(loading: boolean): void {
    iterateBtn!.disabled = loading;
    iterateInput!.disabled = loading;
    exportBtn!.disabled = loading;
    shareBtn!.disabled = loading;
    restartBtn!.disabled = loading;
    fullscreenBtn!.disabled = loading;
    newGameBtn!.disabled = loading;
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  iterateBtn.addEventListener("click", () => {
    const v = iterateInput.value.trim();
    if (!v) return;
    callbacks.onIterate(v);
  });

  iterateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const v = iterateInput.value.trim();
      if (v) callbacks.onIterate(v);
    }
  });

  exportBtn.addEventListener("click", callbacks.onExport);
  shareBtn.addEventListener("click", callbacks.onShare);

  restartBtn.addEventListener("click", () => {
    callbacks.onRestart();
    close();
  });

  fullscreenBtn.addEventListener("click", () => {
    callbacks.onFullscreen();
    close();
  });

  newGameBtn.addEventListener("click", () => {
    callbacks.onNewGame();
    close();
  });

  return {
    modal,
    meta,
    iterateInput,
    iterateBtn,
    exportBtn,
    shareBtn,
    restartBtn,
    fullscreenBtn,
    newGameBtn,
    closeBtn,
    backdrop,
    open,
    close,
    setMeta,
    setLoading,
  };
}
