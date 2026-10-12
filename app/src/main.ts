import "./styles/theme.css";
import { initTelegram, haptic } from "./tg.ts";
import { generate, iterate, ApiError } from "./api.ts";
import { store, type GameRecord } from "./state/store.ts";
import { mountPromptInput, renderStatus, setLoading } from "./ui/promptInput.ts";
import { mountPreview, renderGame } from "./ui/previewFrame.ts";
import { mountIteration, showIteration, setIterationLoading } from "./ui/iterationBar.ts";
import { mountGallery, renderGallery } from "./ui/gallery.ts";

initTelegram();

const promptEl = mountPromptInput();
const previewEl = mountPreview();
const iterationEl = mountIteration();
const galleryEl = mountGallery();

let lastGame: GameRecord | null = null;

// Синхронизация UI с состоянием
store.subscribe((state) => {
  renderStatus(promptEl.statusBar, state);
  setLoading(promptEl, state.loading);

  if (state.currentGame) {
    renderGame(previewEl, state.currentGame.html, {
      genre: state.currentGame.genre,
      audience: state.currentGame.audience,
      provider: state.currentGame.provider,
      fromCache: false,
    });
    lastGame = state.currentGame;
    showIteration(iterationEl, true);
  }

  renderGallery(galleryEl, state.history, (rec) => {
    lastGame = rec;
    store.set({ currentGame: rec });
    haptic("light");
  });
});

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function onGenerate(): Promise<void> {
  const prompt = promptEl.root.value.trim();
  if (!prompt) {
    haptic("error");
    store.set({ status: "Введите запрос", statusType: "error" });
    return;
  }

  haptic("medium");
  store.set({ loading: true, status: "Генерирую игру", statusType: "info" });

  try {
    const res = await generate({
      prompt,
      audience: promptEl.audience.value,
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

    haptic("success");
    const cacheMsg = res.fromCache ? " (из кэша)" : "";
    const warnMsg = res.warnings.length > 0 ? `, ${res.warnings.length} предупреждений` : "";
    store.set({
      loading: false,
      status: `Готово за ${res.durationMs}мс${cacheMsg}${warnMsg}`,
      statusType: "success",
    });
  } catch (e) {
    haptic("error");
    const msg = e instanceof ApiError ? e.message : (e as Error).message;
    store.set({ loading: false, status: `Ошибка: ${msg}`, statusType: "error" });
  }
}

async function onIterate(): Promise<void> {
  const newPrompt = iterationEl.input.value.trim();
  if (!newPrompt || !lastGame) {
    haptic("error");
    store.set({ status: "Введите, что доработать", statusType: "error" });
    return;
  }

  haptic("medium");
  store.set({ loading: true, status: "Дорабатываю игру", statusType: "info" });
  setIterationLoading(iterationEl, true);

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
    haptic("success");
    store.set({
      loading: false,
      status: `Доработано за ${res.durationMs}мс`,
      statusType: "success",
    });
  } catch (e) {
    haptic("error");
    const msg = e instanceof ApiError ? e.message : (e as Error).message;
    store.set({ loading: false, status: `Ошибка: ${msg}`, statusType: "error" });
  } finally {
    setIterationLoading(iterationEl, false);
  }
}

promptEl.generateBtn.addEventListener("click", onGenerate);
iterationEl.button.addEventListener("click", onIterate);

promptEl.root.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onGenerate();
  }
});

iterationEl.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    onIterate();
  }
});

console.log("[BGen] App initialized");
