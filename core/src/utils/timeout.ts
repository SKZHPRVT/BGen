export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${message} (${ms}ms)`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export function linkedSignal(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  const cancel = () => clearTimeout(timer);

  if (external) {
    if (external.aborted) {
      ctrl.abort(external.reason);
    } else {
      external.addEventListener("abort", () => ctrl.abort(external.reason), { once: true });
    }
  }

  return { signal: ctrl.signal, cancel };
}
