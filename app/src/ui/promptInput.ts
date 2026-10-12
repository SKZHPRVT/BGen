import type { State } from "../state/store.ts";

export interface PromptInputElements {
  root: HTMLTextAreaElement;
  audience: HTMLSelectElement;
  generateBtn: HTMLButtonElement;
  statusBar: HTMLDivElement;
}

export function mountPromptInput(): PromptInputElements {
  const root = document.getElementById("promptInput") as HTMLTextAreaElement;
  const audience = document.getElementById("audienceSelect") as HTMLSelectElement;
  const generateBtn = document.getElementById("generateBtn") as HTMLButtonElement;
  const statusBar = document.getElementById("statusBar") as HTMLDivElement;

  if (!root || !audience || !generateBtn || !statusBar) {
    throw new Error("PromptInput: missing DOM elements");
  }

  return { root, audience, generateBtn, statusBar };
}

export function renderStatus(el: HTMLDivElement, state: State): void {
  if (!state.status) {
    el.hidden = true;
    el.textContent = "";
    el.className = "bgen-status";
    return;
  }
  el.hidden = false;
  el.textContent = state.status;
  el.className = `bgen-status ${state.statusType === "error" ? "error" : ""} ${state.statusType === "success" ? "success" : ""} ${state.loading ? "loading" : ""}`;
}

export function setLoading(el: PromptInputElements, loading: boolean): void {
  el.generateBtn.disabled = loading;
  el.root.disabled = loading;
  el.audience.disabled = loading;
}
