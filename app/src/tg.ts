/**
 * Обёртка Telegram.WebApp.
 * Внутри Telegram — разворачивает на полный экран, выключает свайп-жесты,
 * синхронизирует высоту viewport. Вне Telegram — no-op, всё работает в браузере.
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
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableVerticalSwipes?: () => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  showAlert?: (msg: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg = window.Telegram?.WebApp;
export const isTelegram = Boolean(tg);

/** Устанавливает CSS-переменную --tg-viewport-height */
function applyViewportHeight(): void {
  if (!tg) return;
  const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
}

export function initTelegram(): void {
  if (!tg) {
    console.log("[BGen] Not in Telegram, running browser mode");
    // В браузере тоже выставим fallback высоту
    document.documentElement.style.setProperty(
      "--tg-viewport-height",
      `${window.innerHeight}px`,
    );
    window.addEventListener("resize", () => {
      document.documentElement.style.setProperty(
        "--tg-viewport-height",
        `${window.innerHeight}px`,
      );
    });
    return;
  }

  document.body.classList.add("is-telegram");

  try {
    tg.ready();
    tg.expand();
  } catch (e) {
    console.warn("[BGen] tg.ready/expand failed", e);
  }

  // Отключаем закрытие TMA свайпом вниз (Bot API 7.7+)
  try {
    tg.disableVerticalSwipes?.();
  } catch {}

  // Цвета
  try {
    tg.setHeaderColor("secondary_bg_color");
    tg.setBackgroundColor("bg_color");
  } catch {}

  // Высота viewport
  applyViewportHeight();
  try {
    tg.onEvent("viewportChanged", applyViewportHeight);
  } catch {}
  window.addEventListener("resize", applyViewportHeight);
  window.addEventListener("orientationchange", () => {
    // iOS иногда возвращает старую высоту сразу — повторим через 300мс
    setTimeout(applyViewportHeight, 300);
  });

  console.log("[BGen] Telegram WebApp initialized", {
    version: tg.version,
    platform: tg.platform,
    viewportHeight: tg.viewportHeight,
    isExpanded: tg.isExpanded,
    user: tg.initDataUnsafe?.user?.first_name,
  });
}

export function haptic(
  type: "light" | "medium" | "heavy" | "success" | "error" | "warning",
): void {
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