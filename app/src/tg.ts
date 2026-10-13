/**
 * Обёртка Telegram.WebApp.
 * Работает в трёх режимах: telegram, web, embed.
 *
 * Fullscreen в TMA:
 *   1. tg.ready() — сообщаем Telegram, что приложение готово
 *   2. tg.expand() — разворачиваем на весь WebView
 *   3. tg.requestFullscreen() — Bot API 8.0+, разворачивает на весь экран
 *                                без шапки Telegram
 *   4. tg.disableVerticalSwipes() — отключаем закрытие TMA свайпом
 *   5. Синхронизируем --tg-viewport-height с реальной высотой
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
  isFullscreen?: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
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
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg = platform.isTelegram ? (window.Telegram?.WebApp ?? undefined) : undefined;
export const isTelegram = platform.isTelegram;

function safeCall<T>(fn: () => T): T | undefined {
  try { return fn(); } catch (e) { console.warn("[BGen] TG call failed:", e); return undefined; }
}

function applyViewportHeight(): void {
  const h = tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
  document.documentElement.style.setProperty("--real-vh", `${h}px`);
}

export function initPlatform(): void {
  if (platform.isTelegram && tg) {
    document.body.classList.add("is-telegram");

    // 1. Сообщаем что приложение готово
    safeCall(() => tg.ready());

    // 2. Разворачиваем на весь WebView (без шапки Telegram сверху)
    safeCall(() => tg.expand());

    // 3. Bot API 8.0+: полный экран без шапки Telegram
    if (typeof tg.requestFullscreen === "function") {
      try {
        tg.requestFullscreen();
        console.log("[BGen] requestFullscreen called");
      } catch (e) {
        console.log("[BGen] requestFullscreen failed:", e);
      }
    }

    // 4. Отключаем закрытие TMA свайпом вниз (Bot API 7.7+)
    safeCall(() => tg.disableVerticalSwipes?.());

    // Цвета шапки Telegram — совпадаем с фоном приложения
    safeCall(() => tg.setHeaderColor("#ffffff"));
    safeCall(() => tg.setBackgroundColor("#ffffff"));

    // Высота viewport
    applyViewportHeight();
    safeCall(() => tg.onEvent("viewportChanged", applyViewportHeight));

    // Принудительный пересчёт через таймеры — Telegram Desktop иногда
    // не отдаёт финальную высоту сразу
    window.addEventListener("resize", applyViewportHeight);
    window.addEventListener("orientationchange", () => setTimeout(applyViewportHeight, 300));
    setTimeout(applyViewportHeight, 200);
    setTimeout(applyViewportHeight, 1000);

    // visualViewport — критично для iOS, где открывается клавиатура
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", applyViewportHeight);
    }

    console.log("[BGen] Telegram WebApp initialized", {
      version: tg.version,
      platform: tg.platform,
      viewportHeight: tg.viewportHeight,
      viewportStableHeight: tg.viewportStableHeight,
      isExpanded: tg.isExpanded,
      isFullscreen: tg.isFullscreen,
    });
    return;
  }

  if (platform.isEmbed) document.body.classList.add("is-embed");
  else document.body.classList.add("is-web");

  document.documentElement.style.setProperty("--tg-viewport-height", `${window.innerHeight}px`);
  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--tg-viewport-height", `${window.innerHeight}px`);
  });

  console.log(`[BGen] Running in ${platform.kind} mode`);
}

export type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning";

export function haptic(type: HapticType): void {
  if (!tg?.HapticFeedback) {
    if (platform.isMobile && "vibrate" in navigator) {
      try { navigator.vibrate(type === "error" ? [40, 40, 40] : 20); } catch {}
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

export function getInitData(): string {
  return tg?.initData ?? "";
}
