/**
 * Обёртка Telegram.WebApp с безопасными фолбэками для локальной разработки.
 */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name?: string; username?: string };
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  CloudStorage?: {
    setItem: (key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
    getItem: (key: string, cb: (err: Error | null, value?: string) => void) => void;
    getItem: any;
    removeItem: (key: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
  };
  showAlert?: (msg: string) => void;
  showPopup?: (params: object) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg = window.Telegram?.WebApp;

export const isTelegram = Boolean(tg);

export function initTelegram(): void {
  if (!tg) {
    console.log("[BGen] Not in Telegram, running in browser mode");
    return;
  }
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor("secondary_bg_color");
    tg.setBackgroundColor("bg_color");
  } catch {
    /* older clients */
  }
  console.log("[BGen] Telegram WebApp initialized", {
    version: tg.version,
    platform: tg.platform,
    user: tg.initDataUnsafe?.user?.first_name,
  });
}

export function haptic(type: "light" | "medium" | "heavy" | "success" | "error" | "warning") {
  if (!tg?.HapticFeedback) return;
  if (type === "light" || type === "medium" || type === "heavy") {
    tg.HapticFeedback.impactOccurred(type);
  } else {
    tg.HapticFeedback.notificationOccurred(type);
  }
}

export function getUserId(): string {
  return String(tg?.initDataUnsafe?.user?.id ?? "local");
}
