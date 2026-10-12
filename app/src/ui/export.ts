/**
 * Экспорт сгенерированной игры как standalone .html-файла.
 * Работает в трёх режимах:
 *   - Telegram: шарим файл через tg-API или отправляем в Saved Messages
 *   - Browser: скачиваем файл через Blob + a[download]
 *   - Embed: fallback на скачивание
 *
 * Файл содержит только HTML игры, без зависимостей от нашего UI.
 */

import { tg, isTelegram, haptic } from "../tg.ts";
import { platform } from "../platform.ts";
import type { GameRecord } from "../state/store.ts";

export interface ExportResult {
  ok: boolean;
  method: "download" | "telegram-share" | "clipboard" | "failed";
  filename?: string;
  message?: string;
}

/** Собирает безопасное имя файла из жанра и timestamp */
function buildFilename(game: GameRecord): string {
  const safeGenre = (game.genre || "game").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const ts = new Date(game.createdAt)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  return `bgen-${safeGenre}-${ts}.html`;
}

/** Создаёт Blob и инициирует скачивание */
function triggerDownload(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Отложенный revoke, чтобы браузер успел скачать
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Экспортирует игру в файл.
 * Пытается сначала Telegram share, потом download.
 */
export async function exportGame(game: GameRecord): Promise<ExportResult> {
  const filename = buildFilename(game);

  // 1. В Telegram — пробуем через Clipboard, т.к. Telegram не умеет
  // напрямую отдавать файлы из WebApp. Пользователь вставит в чат.
  if (isTelegram) {
    try {
      // Сохраняем HTML в clipboard, чтобы пользователь мог вставить
      // как файл в любой чат (Telegram Desktop понимает HTML-вставку)
      const htmlAsDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(game.html)}`;
      await navigator.clipboard.writeText(htmlAsDataUrl);
      haptic("success");
      return {
        ok: true,
        method: "telegram-share",
        filename,
        message: `Скопировано в буфер. Вставь в чат с ботом — получишь файл.`,
      };
    } catch (e) {
      console.warn("[export] tg clipboard failed, falling back to download", e);
      // Telegram Desktop всё равно позволяет скачивать — пробуем download
    }
  }

  // 2. Обычный download (работает в браузере и в Telegram Desktop)
  try {
    triggerDownload(game.html, filename);
    haptic("success");
    return {
      ok: true,
      method: "download",
      filename,
      message: `Файл ${filename} скачан`,
    };
  } catch (e) {
    console.warn("[export] download failed", e);
  }

  // 3. Крайний fallback — clipboard
  try {
    await navigator.clipboard.writeText(game.html);
    return {
      ok: true,
      method: "clipboard",
      message: "HTML игры скопирован в буфер",
    };
  } catch (e) {
    console.warn("[export] clipboard failed", e);
  }

  return { ok: false, method: "failed", message: "Не удалось экспортировать" };
}

/**
 * Генерирует data URL для inline-скачивания (используется в веб-версии).
 */
export function buildDataUrl(game: GameRecord): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(game.html)}`;
}