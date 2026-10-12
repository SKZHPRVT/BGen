export interface IterationElements {
  root: HTMLDivElement;
  input: HTMLInputElement;
  button: HTMLButtonElement;
}

export function mountIteration(): IterationElements {
  const root = document.getElementById("iterationPanel") as HTMLDivElement;
  const input = document.getElementById("iterationInput") as HTMLInputElement;
  const button = document.getElementById("iterateBtn") as HTMLButtonElement;

  if (!root || !input || !button) {
    throw new Error("Iteration: missing DOM elements");
  }

  return { root, input, button };
}

export function showIteration(el: IterationElements, show: boolean): void {
  el.root.hidden = !show;
  if (!show) el.input.value = "";
}

export function setIterationLoading(el: IterationElements, loading: boolean): void {
  el.button.disabled = loading;
  el.input.disabled = loading;
}
