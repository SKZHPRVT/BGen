/**
 * Определяет платформу, в которой работает приложение.
 * Всё остальное в коде читает platform.* вместо прямых проверок window.Telegram.
 *
 * Работает в трёх режимах:
 *   - web       — обычный браузер
 *   - telegram  — внутри Telegram Mini App
 *   - embed     — внутри iframe стороннего приложения (WebView Билайна и т.п.)
 */

export type PlatformKind = "telegram" | "web" | "embed";

export interface PlatformInfo {
  kind: PlatformKind;
  /** Внутри Telegram WebApp */
  isTelegram: boolean;
  /** Внутри iframe (виджет) */
  isEmbed: boolean;
  /** Мобильный (для выбора UI) */
  isMobile: boolean;
  /** Поддерживает haptic feedback */
  hasHaptic: boolean;
  /** Поддерживает native share */
  hasNativeShare: boolean;
  /** Поддерживает clipboard */
  hasClipboard: boolean;
}

function detect(): PlatformInfo {
  // Защита от SSR / Node-окружения (bun -e, тесты, сборка)
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      kind: "web",
      isTelegram: false,
      isEmbed: false,
      isMobile: false,
      hasHaptic: false,
      hasNativeShare: false,
      hasClipboard: false,
    };
  }

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      // cross-origin iframe — считаем, что внутри iframe
      return true;
    }
  })();

  const hasTelegram = Boolean(
    (window as any).Telegram?.WebApp?.initData !== undefined &&
      (window as any).Telegram?.WebApp?.platform,
  );

  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints ?? 0) > 1;

  // embed — если в iframe и НЕ в Telegram
  const isEmbed = inIframe && !hasTelegram;

  const kind: PlatformKind = hasTelegram ? "telegram" : isEmbed ? "embed" : "web";

  return {
    kind,
    isTelegram: hasTelegram,
    isEmbed,
    isMobile,
    hasHaptic: hasTelegram && Boolean((window as any).Telegram?.WebApp?.HapticFeedback),
    hasNativeShare: typeof (navigator as any).share === "function",
    hasClipboard: Boolean(navigator.clipboard?.writeText),
  };
}

export const platform: PlatformInfo = detect();

// Хелпер для дебага — печатает платформу в консоль при загрузке
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log("[BGen] platform:", platform);
}