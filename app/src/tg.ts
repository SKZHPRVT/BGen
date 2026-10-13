/**
 * Обёртка Telegram.WebApp.
 * Работает в трёх режимах: telegram, web, embed.
 * Отвечает за: fullscreen, viewport-height, safe-area, haptic.
 *
 * Fullscreen в TMA:
 *   1. tg.ready() — сообщаем Telegram, что приложение готово
 *   2. tg.expand() — разворачиваем на весь WebView
 *   3. tg.disableVerticalSwipes() — отключаем закрытие TMA свайпом вниз
 *   4. Синхронизируем --tg-viewport-height с реальной высотой
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
}

export function initPlatform(): void {
  if (platform.isTelegram && tg) {
    document.body.classList.add("is-telegram");

    // Fullscreen цепочка
    safeCall(() => tg.ready());
    safeCall(() => tg.expand());

    // Отключаем свайп-закрытие TMA (Bot API 7.7+)
    safeCall(() => tg.disableVerticalSwipes?.());

    // Цвета шапки Telegram — совпадаем с фоном приложения
    safeCall(() => tg.setHeaderColor("#ffffff"));
    safeCall(() => tg.setBackgroundColor("#ffffff"));

    // Высота viewport
    applyViewportHeight();
    safeCall(() => tg.onEvent("viewportChanged", applyViewportHeight));
    window.addEventListener("resize", applyViewportHeight);
    window.addEventListener("orientationchange", () => setTimeout(applyViewportHeight, 300));

    // Telegram Desktop иногда не отдаёт финальную высоту сразу —
    // дергаем ещё раз через 200мс и 1с
    setTimeout(applyViewportHeight, 200);
    setTimeout(applyViewportHeight, 1000);

    console.log("[BGen] Telegram WebApp initialized", {
      version: tg.version,
      platform: tg.platform,
      viewportHeight: tg.viewportHeight,
      viewportStableHeight: tg.viewportStableHeight,
      isExpanded: tg.isExpanded,
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
