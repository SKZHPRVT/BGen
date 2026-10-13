import "./styles/theme.css";
import { initPlatform, haptic } from "./tg.ts";
import { platform } from "./platform.ts";
import { generate, iterate, ApiError } from "./api.ts";
import { store, type GameRecord } from "./state/store.ts";
import {
  runBootPreloader,
  showLoadingPreloader,
  hideLoadingPreloader,
} from "./ui/preloader.ts";
import { mountSettings, type SettingsElements } from "./ui/settingsModal.ts";
import { shareGame } from "./ui/share.ts";
import { exportGame } from "./ui/export.ts";

initPlatform();

// =============================================================
// DOM
// =============================================================

const screenStart = document.getElementById("screen-start")!;
const screenGame = document.getElementById("screen-game")!;
const gameFrame = document.getElementById("gameFrame") as HTMLIFrameElement;
const settingsBtn = document.getElementById("settingsBtn") as HTMLButtonElement;

const promptInput = document.getElementById("promptInput") as HTMLTextAreaElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const allGamesBtn = document.getElementById("allGamesBtn") as HTMLButtonElement;
const gamesCount = document.getElementById("gamesCount") as HTMLSpanElement;
const startStatus = document.getElementById("startStatus") as HTMLDivElement;

const gamesModal = document.getElementById("gamesModal")!;
const gamesList = document.getElementById("gamesList")!;
const gamesClose = document.getElementById("gamesClose") as HTMLButtonElement;
const gamesNewBtn = document.getElementById("gamesNewBtn") as HTMLButtonElement;
const gamesBackdrop = gamesModal.querySelector(".modal-backdrop") as HTMLDivElement;

// =============================================================
// Экраны
// =============================================================

function showScreen(name: "start" | "game"): void {
  if (name === "start") {
    screenStart.removeAttribute("hidden");
    screenGame.setAttribute("hidden", "");
  } else {
    screenStart.setAttribute("hidden", "");
    screenGame.removeAttribute("hidden");
  }
}

// =============================================================
// Модал настроек
// =============================================================

let settingsEl: SettingsElements | null = null;
let lastGame: GameRecord | null = null;

function buildSettings(): void {
  settingsEl = mountSettings({
    onIterate: (newPrompt) => onIterate(newPrompt),
    onExport: () => onExport(),
    onShare: () => onShare(),
    onRestart: () => onRestart(),
    onFullscreen: () => onFullscreen(),
    onNewGame: () => onNewGame(),
  });
}

settingsBtn.addEventListener("click", () => {
  haptic("light");
  settingsEl?.open();
});

// =============================================================
// Стартовый экран
// =============================================================

function getSelectedAudience(): string {
  const checked = document.querySelector('input[name="audience"]:checked') as HTMLInputElement | null;
  return checked?.value ?? "default";
}

startBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    haptic("error");
    showStartStatus("Введите запрос", "error");
    return;
  }

  haptic("medium");
  hideStartStatus();

  showLoadingPreloader();

  try {
    const res = await generate({
      prompt,
      audience: getSelectedAudience(),
    });

    const game: GameRecord = {
      id: makeId(),
      prompt,
      audience: res.spec.audience,
      genre: res.spec.genre,
      html: res.html,
      createdAt: Date.now(),
      attempts: res.attempts,
      provider: res.provider,
    };

    await store.addGame(game);
    lastGame = game;
    renderGame(game);

    await sleep(600);
    hideLoadingPreloader();
    showScreen("game");

    if (settingsEl) {
      settingsEl.setMeta(`${game.genre} · ${game.audience} · ${game.provider}`);
    }

    haptic("success");
  } catch (e) {
    haptic("error");
    hideLoadingPreloader();
    showScreen("start");
    const msg = e instanceof ApiError ? e.message : (e as Error).message;
    showStartStatus(`Ошибка: ${msg}`, "error");
  }
});

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    startBtn.click();
  }
});

function showStartStatus(text: string, type: "info" | "error"): void {
  startStatus.textContent = text;
  startStatus.className = "screen-status" + (type === "error" ? " error" : "");
  startStatus.removeAttribute("hidden");
}

function hideStartStatus(): void {
  startStatus.setAttribute("hidden", "");
}

// =============================================================
// Модал «Все мои игры»
// =============================================================

allGamesBtn.addEventListener("click", () => {
  haptic("light");
  renderGamesList();
  gamesModal.removeAttribute("hidden");
});

gamesClose.addEventListener("click", () => gamesModal.setAttribute("hidden", ""));
gamesBackdrop.addEventListener("click", () => gamesModal.setAttribute("hidden", ""));
gamesNewBtn.addEventListener("click", () => {
  gamesModal.setAttribute("hidden", "");
  onNewGame();
});

function renderGamesList(): void {
  const history = store.get().history;
  gamesList.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "game-card-empty";
    empty.textContent = "Пока нет игр. Создайте первую!";
    gamesList.appendChild(empty);
    return;
  }

  for (const rec of history) {
    const card = document.createElement("button");
    card.className = "game-card";

    const preview = document.createElement("div");
    preview.className = "game-card-preview";
    preview.textContent = genreEmoji(rec.genre);

    const info = document.createElement("div");
    info.className = "game-card-info";

    const title = document.createElement("div");
    title.className = "game-card-title";
    title.textContent = rec.prompt;

    const meta = document.createElement("div");
    meta.className = "game-card-meta";
    meta.textContent = `${rec.genre} · ${rec.audience} · ${new Date(rec.createdAt).toLocaleDateString()}`;

    info.appendChild(title);
    info.appendChild(meta);
    card.appendChild(preview);
    card.appendChild(info);

    card.addEventListener("click", () => {
      gamesModal.setAttribute("hidden", "");
      lastGame = rec;
      renderGame(rec);
      showScreen("game");
      haptic("light");
      if (settingsEl) {
        settingsEl.setMeta(`${rec.genre} · ${rec.audience} · ${rec.provider}`);
      }
    });

    gamesList.appendChild(card);
  }
}

function genreEmoji(genre: string): string {
  const map: Record<string, string> = {
    snake: "🐍", clicker: "👆", platformer: "🏃", puzzle: "🧩",
    runner: "🏃‍♂️", memory: "🧠", shooter: "🎯", breakout: "🧱",
    "2048": "🔢", tower: "🏗", unknown: "🎮",
  };
  return map[genre] ?? "🎮";
}

// =============================================================
// Действия из модала настроек
// =============================================================

async function onIterate(newPrompt: string): Promise<void> {
  if (!lastGame) return;

  haptic("medium");
  settingsEl?.close();
  showLoadingPreloader();

  try {
    const res = await iterate({
      prompt: newPrompt,
      previousCode: lastGame.html,
      previousPrompt: lastGame.prompt,
    });

    const game: GameRecord = {
      id: makeId(),
      prompt: `${lastGame.prompt} → ${newPrompt}`,
      audience: res.spec.audience,
      genre: res.spec.genre,
      html: res.html,
      createdAt: Date.now(),
      attempts: res.attempts,
      provider: res.provider,
    };

    await store.addGame(game);
    lastGame = game;
    renderGame(game);

    await sleep(500);
    hideLoadingPreloader();
    showScreen("game");

    if (settingsEl) {
      settingsEl.setMeta(`${game.genre} · ${game.audience} · ${game.provider} · доработано`);
    }

    haptic("success");
  } catch (e) {
    haptic("error");
    hideLoadingPreloader();
    showScreen("game");
    console.warn("[iterate] failed", e);
  }
}

async function onExport(): Promise<void> {
  if (!lastGame) return;
  const res = await exportGame(lastGame);
  if (settingsEl && res.message) {
    settingsEl.setMeta(res.message);
  }
}

async function onShare(): Promise<void> {
  if (!lastGame) return;
  const res = await shareGame(lastGame);
  if (settingsEl && res.message) {
    settingsEl.setMeta(res.message);
  }
}

function onRestart(): void {
  if (!lastGame) return;
  const html = lastGame.html;
  gameFrame.srcdoc = "";
  requestAnimationFrame(() => {
    gameFrame.srcdoc = html;
  });
  haptic("light");
}

function onFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    gameFrame.requestFullscreen?.().catch(() => {});
  }
}

function onNewGame(): void {
  showScreen("start");
  promptInput.value = "";
  hideStartStatus();
  haptic("light");
}

// =============================================================
// Рендер игры
// =============================================================

function renderGame(game: GameRecord): void {
  gameFrame.srcdoc = game.html;
  updateGamesCount();
}

function updateGamesCount(): void {
  const n = store.get().history.length;
  gamesCount.textContent = String(n);
  gamesCount.style.display = n > 0 ? "" : "none";
}

// =============================================================
// Вспомогательные
// =============================================================

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// =============================================================
// Store subscribe
// =============================================================

store.subscribe(() => {
  updateGamesCount();
});

// =============================================================
// Boot
// =============================================================

buildSettings();

(async () => {
  await store.load();
  updateGamesCount();

  // Стартовый прелоадер
  await runBootPreloader();

  console.log(`[BGen] Ready in ${platform.kind} mode`);
})();
