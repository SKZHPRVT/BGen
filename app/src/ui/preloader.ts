/**
 * Два прелоадера BGen.
 *
 * 1. runBootPreloader() — при открытии приложения.
 * 2. showLoadingPreloader() — при генерации (минимум 2.5 секунды, чтобы увидели).
 */

const YELLOW = "#ffdd00";
const BLACK = "#000000";

let loadingTimerInterval: number | null = null;
let loadingLettersInterval: number | null = null;
let loadingShownAt = 0;

// Минимальное время показа прелоадера генерации (мс)
const MIN_LOADING_MS = 2500;

// ═════════════════════════════════════════════════════════════
// ПРЕЛОАДЕР 1 — СТАРТОВЫЙ
// ═════════════════════════════════════════════════════════════

export async function runBootPreloader(): Promise<void> {
  const preloaderEl = document.getElementById("preloader");
  const lettersEl = document.getElementById("bee-letters");
  const genEl = document.getElementById("bee-gen");
  const ballEl = document.getElementById("bee-ball") as HTMLCanvasElement | null;
  const appEl = document.getElementById("screen-start");

  if (!preloaderEl || !lettersEl || !genEl || !appEl) {
    appEl?.removeAttribute("hidden");
    preloaderEl?.remove();
    return;
  }

  if (ballEl) assembleBall(ballEl);

  lettersEl.innerHTML = renderLetters("BE······");
  await sleep(400);

  const steps = [
    "BE·····E", "BEE····E", "BEEE···E", "BEEEE··E",
    "BEEEEE·E", "BEEEEEE·", "BEEEEEEE",
  ];
  for (const s of steps) {
    lettersEl.innerHTML = renderLetters(s);
    await sleep(180);
  }

  await sleep(500);

  genEl.innerHTML =
    '<span class="bee-gen-letter">G</span>' +
    '<span class="bee-gen-letter">E</span>' +
    '<span class="bee-gen-letter">N</span>';
  genEl.classList.add("show");

  await sleep(900);

  preloaderEl.classList.add("fade-out");
  await sleep(500);
  preloaderEl.remove();
  appEl.removeAttribute("hidden");
}

// ═════════════════════════════════════════════════════════════
// ПРЕЛОАДЕР 2 — ГЕНЕРАЦИЯ
// ═════════════════════════════════════════════════════════════

export function showLoadingPreloader(): void {
  const screenStart = document.getElementById("screen-start");
  const screenGame = document.getElementById("screen-game");
  const screenLoading = document.getElementById("screen-loading");

  if (!screenLoading) return;

  loadingShownAt = Date.now();

  screenStart?.setAttribute("hidden", "");
  screenGame?.setAttribute("hidden", "");
  screenLoading.removeAttribute("hidden");

  const lettersEl = document.getElementById("loading-letters");
  const canvas = document.getElementById("chaos-canvas") as HTMLCanvasElement | null;
  const hintEl = document.querySelector(".loading-hint") as HTMLElement | null;

  // Анимация [BE......]
  if (lettersEl && loadingLettersInterval === null) {
    const SEQ = [
      "BE······", "BE·····E", "BEE····E", "BEEE···E",
      "BEEEE··E", "BEEEEE·E", "BEEEEEE·", "BEEEEEEE",
    ];
    let idx = 0;
    lettersEl.innerHTML = renderLetters(SEQ[0]!);
    loadingLettersInterval = window.setInterval(() => {
      idx = (idx + 1) % SEQ.length;
      lettersEl.innerHTML = renderLetters(SEQ[idx]!);
    }, 220);
  }

  // Таймер
  if (hintEl) {
    const start = Date.now();
    if (loadingTimerInterval !== null) clearInterval(loadingTimerInterval);
    hintEl.textContent = "Генерирую игру…";
    loadingTimerInterval = window.setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      if (sec < 5) hintEl.textContent = "Генерирую игру…";
      else if (sec < 30) hintEl.textContent = `Генерирую игру… ${sec} сек`;
      else if (sec < 60) hintEl.textContent = `GigaChat думает… ${sec} сек`;
      else if (sec < 90) hintEl.textContent = `Ещё немного… ${sec} сек`;
      else hintEl.textContent = `Долго… ${sec} сек. Попробуйте другой промпт`;
    }, 1000);
  }

  // Анимация хаоса
  if (canvas) {
    startChaosAnimation(canvas);
  }
}

/**
 * Скрывает прелоадер генерации.
 * НЕ мгновенно — ждёт, чтобы прелоадер был виден минимум MIN_LOADING_MS.
 */
export async function hideLoadingPreloader(): Promise<void> {
  const elapsed = Date.now() - loadingShownAt;

  // Если прелоадер не был показан — ничего не делаем
  if (loadingShownAt === 0) return;

  // Если показан меньше MIN_LOADING_MS — подожди до минимума
  if (elapsed < MIN_LOADING_MS) {
    await sleep(MIN_LOADING_MS - elapsed);
  }

  const screenLoading = document.getElementById("screen-loading");
  if (!screenLoading) return;

  if (loadingLettersInterval !== null) {
    clearInterval(loadingLettersInterval);
    loadingLettersInterval = null;
  }
  if (loadingTimerInterval !== null) {
    clearInterval(loadingTimerInterval);
    loadingTimerInterval = null;
  }

  screenLoading.setAttribute("hidden", "");
  loadingShownAt = 0;
}

// ═════════════════════════════════════════════════════════════
// Утилиты
// ═════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function renderLetters(text: string): string {
  let eIndex = 0;
  return text
    .split("")
    .map((ch) => {
      if (ch === "·") return `<span class="bee-dot">·</span>`;
      if (ch === "B") return `<span class="bee-black">B</span>`;
      if (ch === "E") {
        const cls = eIndex < 2 ? "bee-black" : eIndex % 2 === 0 ? "bee-black" : "bee-yellow";
        eIndex++;
        return `<span class="${cls}">E</span>`;
      }
      return `<span class="bee-black">${ch}</span>`;
    })
    .join("");
}

// ═════════════════════════════════════════════════════════════
// Пиксельный шарик (для boot)
// ═════════════════════════════════════════════════════════════

interface Pixel1 {
  sx: number; sy: number;
  tx: number; ty: number;
  x: number;  y: number;
  color: string;
  delay: number;
  duration: number;
}

function assembleBall(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const CX = W / 2;
  const CY = H / 2;
  const R = Math.min(W, H) * 0.42;
  const PIXEL = 4;

  const pixels: Pixel1[] = [];

  for (let y = -R; y <= R; y += PIXEL) {
    for (let x = -R; x <= R; x += PIXEL) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist > R) continue;

      const px = x + PIXEL / 2;
      const py = y + PIXEL / 2;

      const diagonal = (px + py) / Math.SQRT2;
      const bandAngle = Math.atan2(py, px);
      const combined = bandAngle + Math.PI;
      const bandSeg = Math.floor((combined + diagonal * 0.005) / (Math.PI / 3)) % 2;
      const color = bandSeg === 0 ? YELLOW : BLACK;

      pixels.push({
        sx: Math.random() * W,
        sy: Math.random() * H,
        tx: CX + px,
        ty: CY + py,
        x: Math.random() * W,
        y: Math.random() * H,
        color,
        delay: Math.random() * 400,
        duration: 1200 + Math.random() * 400,
      });
    }
  }

  const startTime = performance.now();

  function frame(now: number): void {
    ctx.clearRect(0, 0, W, H);

    let allDone = true;
    for (const p of pixels) {
      const t = Math.max(0, now - startTime - p.delay) / p.duration;
      const clamped = Math.min(1, t);
      if (clamped < 1) allDone = false;

      const eased = 1 - Math.pow(1 - clamped, 3);
      p.x = p.sx + (p.tx - p.sx) * eased;
      p.y = p.sy + (p.ty - p.sy) * eased;

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), PIXEL, PIXEL);
    }

    if (!allDone) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
      for (const p of pixels) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.tx), Math.round(p.ty), PIXEL, PIXEL);
      }
    }
  }

  requestAnimationFrame(frame);
}

// ═════════════════════════════════════════════════════════════
// Chaos-анимация (для loading)
// ═════════════════════════════════════════════════════════════

interface ChaosPixel {
  sx: number; sy: number;
  vx: number; vy: number;
  tx: number; ty: number;
  x: number;  y: number;
  color: string;
  startAt: number;
  duration: number;
}

function startChaosAnimation(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const particles: ChaosPixel[] = [];

  function buildPixels(): void {
    particles.length = 0;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const CX = W / 2;
    const CY = H * 0.42;
    const R = Math.min(W, H) * 0.28;
    const PIXEL = 4;

    for (let y = -R; y <= R; y += PIXEL) {
      for (let x = -R; x <= R; x += PIXEL) {
        const dist = Math.sqrt(x * x + y * y);
        if (dist > R) continue;

        const px = x + PIXEL / 2;
        const py = y + PIXEL / 2;

        const diagonal = (px + py) / Math.SQRT2;
        const bandAngle = Math.atan2(py, px);
        const combined = bandAngle + Math.PI;
        const bandSeg = Math.floor((combined + diagonal * 0.005) / (Math.PI / 3)) % 2;
        const color = bandSeg === 0 ? YELLOW : BLACK;

        particles.push({
          sx: Math.random() * W,
          sy: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          tx: CX + px,
          ty: CY + py,
          x: Math.random() * W,
          y: Math.random() * H,
          color,
          startAt: Math.random() * 900,
          duration: 1400 + Math.random() * 600,
        });
      }
    }
  }

  buildPixels();
  window.addEventListener("resize", () => { resize(); buildPixels(); });

  const startTs = performance.now();

  function frame(now: number): void {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const CX = W / 2;
    const CY = H * 0.42;

    ctx.clearRect(0, 0, W, H);
    const elapsed = now - startTs;

    for (const p of particles) {
      if (elapsed < p.startAt) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));
      } else {
        const t = Math.min(1, (elapsed - p.startAt) / p.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        p.x = p.sx + (p.tx - p.sx) * eased;
        p.y = p.sy + (p.ty - p.sy) * eased;
      }
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
    }

    if (elapsed > 2400) {
      const pulse = 1 + Math.sin((elapsed - 2400) / 400) * 0.03;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(CX, CY, Math.min(W, H) * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
