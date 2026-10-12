/**
 * Обёртка Telegram.WebApp.
 * Работает в трёх режимах:
 *   1. Внутри Telegram — все фичи доступны
 *   2. В обычном браузере — no-op с безопасными fallback
 *   3. В embed-iframe — то же, что в браузере
 */

import { platform } from "./platform.ts";

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
  CloudStorage?: {
    setItem: (key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
    getItem: (key: string, cb: (err: Error | null, value?: string) => void) => void;
    removeItem: (key: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
  };
  switchInlineQuery?: (query: string, chooseChatTypes?: string[]) => void;
  showAlert?: (msg: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg = platform.isTelegram ? (window.Telegram?.WebApp ?? undefined) : undefined;
export const isTelegram = platform.isTelegram;

/** Безопасный вызов метода tg с try/catch — вне TG просто no-op. */
function safeCall<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    console.warn("[BGen] TG call failed:", e);
    return undefined;
  }
}

/** Устанавливает CSS-переменную --tg-viewport-height */
function applyViewportHeight(): void {
  const h = tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
}

export function initPlatform(): void {
  if (platform.isTelegram && tg) {
    document.body.classList.add("is-telegram");

    safeCall(() => tg.ready());
    safeCall(() => tg.expand());
    safeCall(() => tg.disableVerticalSwipes?.());
    safeCall(() => tg.setHeaderColor("secondary_bg_color"));
    safeCall(() => tg.setBackgroundColor("bg_color"));

    applyViewportHeight();
    safeCall(() => tg.onEvent("viewportChanged", applyViewportHeight));
    window.addEventListener("resize", applyViewportHeight);
    window.addEventListener("orientationchange", () => {
      setTimeout(applyViewportHeight, 300);
    });

    console.log("[BGen] Telegram WebApp initialized", {
      version: tg.version,
      platform: tg.platform,
      viewportHeight: tg.viewportHeight,
      isExpanded: tg.isExpanded,
      user: tg.initDataUnsafe?.user?.first_name,
    });
    return;
  }

  if (platform.isEmbed) {
    document.body.classList.add("is-embed");
  } else {
    document.body.classList.add("is-web");
  }

  // Fallback: своя высота через innerHeight
  document.documentElement.style.setProperty("--tg-viewport-height", `${window.innerHeight}px`);
  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--tg-viewport-height", `${window.innerHeight}px`);
  });

  console.log(`[BGen] Running in ${platform.kind} mode (no Telegram SDK)`);
}

export type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning";

export function haptic(type: HapticType): void {
  if (!tg?.HapticFeedback) {
    // Fallback: vibration API на мобильных
    if (platform.isMobile && "vibrate" in navigator) {
      try {
        navigator.vibrate(type === "error" ? [40, 40, 40] : 20);
      } catch {}
    }
    return;
  }
  safeCall(() => {
    if (type === "light" || type === "medium" || type === "heavy") {
      tg.HapticFeedback!.impactOccurred(type);
    } else {
      tg.HapticFeedback!.notificationOccurred(type);
    }
  });
}

export function getUserId(): string {
  return String(tg?.initDataUnsafe?.user?.id ?? "local");
}

/** Экспорт для api.ts — отправка initData в заголовке, если есть */
export function getInitData(): string {
  return tg?.initData ?? "";
}