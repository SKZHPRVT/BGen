import { tg, isTelegram, haptic } from "../tg.ts";
import { platform } from "../platform.ts";
import type { GameRecord } from "../state/store.ts";

export interface ShareResult {
  ok: boolean;
  method: "telegram" | "native" | "clipboard" | "prompt" | "failed";
  message?: string;
}

/**
 * Пробует разные способы поделиться. Не падает, если что-то недоступно.
 */
export async function shareGame(game: GameRecord, botUsername?: string): Promise<ShareResult> {
  const url = buildGameUrl(game, botUsername);
  const title = `Игра: ${game.prompt}`;

  // 1. Telegram inline query
  if (isTelegram && tg?.switchInlineQuery) {
    try {
      tg.switchInlineQuery(game.prompt.slice(0, 200), ["users", "groups"]);
      haptic("success");
      return { ok: true, method: "telegram" };
    } catch (e) {
      console.warn("[share] TG switchInlineQuery failed", e);
    }
  }

  // 2. Native share (мобильный браузер)
  if (platform.hasNativeShare) {
    try {
      await (navigator as any).share({ title, text: game.prompt, url });
      haptic("success");
      return { ok: true, method: "native" };
    } catch (e) {
      // Пользователь отменил — не ошибка
      if ((e as Error).name === "AbortError") {
        return { ok: false, method: "failed", message: "Отменено" };
      }
      console.warn("[share] navigator.share failed", e);
    }
  }

  // 3. Clipboard
  if (platform.hasClipboard) {
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`);
      haptic("success");
      return { ok: true, method: "clipboard", message: "Ссылка скопирована" };
    } catch (e) {
      console.warn("[share] clipboard failed", e);
    }
  }

  // 4. Крайний fallback — показать URL
  try {
    window.prompt("Скопируйте ссылку:", url);
    return { ok: true, method: "prompt" };
  } catch {
    return { ok: false, method: "failed", message: "Не удалось поделиться" };
  }
}

function buildGameUrl(game: GameRecord, botUsername?: string): string {
  // В Telegram — deep link с startapp
  if (botUsername) {
    const param = encodeURIComponent(game.id.slice(0, 64));
    return `https://t.me/${botUsername}/app?startapp=${param}`;
  }

  // В браузере — просто URL страницы
  const base = window.location.origin + window.location.pathname;
  return `${base}#game=${encodeURIComponent(game.id)}`;
}

/**
 * Возвращает корректную ссылку для шаринга.
 * Используется в UI для отображения.
 */
export function getShareUrl(game: GameRecord, botUsername?: string): string {
  return buildGameUrl(game, botUsername);
}