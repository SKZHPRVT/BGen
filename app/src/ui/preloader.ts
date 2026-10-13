/**
 * Прелоадеры BGen.
 *
 * 1. runBootPreloader() — стартовый прелоадер при открытии приложения.
 *    Показывает [BE......] + GEN + хаос собирается в шарик. ~2.5 сек.
 *    После — плавно скрывается и показывает экран start.
 *
 * 2. showLoadingPreloader() — прелоадер при генерации.
 *    Показывает [BE......] внизу + хаос собирается в шарик.
 *    Вызывается при старте генерации.
 *
 * 3. hideLoadingPreloader() — скрывает экран loading.
 */

const YELLOW = "#ffdd00";
const BLACK = "#000000";

// =============================================================
// СТАРТОВЫЙ ПРЕЛОАДЕР (при открытии)
// =============================================================

export async function runBootPreloader(): Promise<void> {
  const bootScreen = document.getElementById("screen-boot");
  const startScreen = document.getElementById("screen-start");
  const lettersEl = document.getElementById("boot-letters");
  const genEl = document.getElementById("boot-gen");
  const canvas = document.getElementById("boot-canvas") as HTMLCanvasElement | null;

  if (!bootScreen || !startScreen) {
    // Fallback — просто показываем старт
    startScreen?.removeAttribute("hidden");
    return;
  }

  // Запускаем анимацию шарика
  if (canvas) {
    startChaosAnimation(canvas, { showGen: false, duration: 2200 });
  }

  // Анимация [BE......]
  if (lettersEl) {
    await animateLetters(lettersEl, 220);
  }

  // GEN — большими буквами
  if (genEl) {
    genEl.innerHTML =
      '<span class="boot-gen-letter">G</span>' +
      '<span class="boot-gen-letter">E</span>' +
      '<span class="boot-gen-letter">N</span>';
    await sleep(200);
    genEl.classList.add("show");
  }

  // Даём полюбоваться
  await sleep(900);

  // Fade-out и переход на start
  bootScreen.style.transition = "opacity 0.5s ease-out";
  bootScreen.style.opacity = "0";
  await sleep(500);

  bootScreen.setAttribute("hidden", "");
  startScreen.removeAttribute("hidden");
}

// =============================================================
// ПРЕЛОАДЕР ГЕНЕРАЦИИ
// =============================================================

let loadingLettersInterval: number | null = null;

export function showLoadingPreloader(): void {
  const screenStart = document.getElementById("screen-start");
  const screenGame = document.getElementById("screen-game");
  const screenLoading = document.getElementById("screen-loading");

  if (!screenLoading) return;

  screenStart?.setAttribute("hidden", "");
  screenGame?.setAttribute("hidden", "");
  screenLoading.removeAttribute("hidden");

  const lettersEl = document.getElementById("bee-letters");
  const canvas = document.getElementById("chaos-canvas") as HTMLCanvasElement | null;

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

  // Хаос-шарик
  if (canvas) {
    startChaosAnimation(canvas, { showGen: false, duration: 2000 });
  }
}

export function hideLoadingPreloader(): void {
  const screenLoading = document.getElementById("screen-loading");
  if (!screenLoading) return;

  if (loadingLettersInterval !== null) {
    clearInterval(loadingLettersInterval);
    loadingLettersInterval = null;
  }

  screenLoading.setAttribute("hidden", "");
}

// =============================================================
// Внутренние утилиты
// =============================================================

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

/** Анимация букв [BE......] для стартового прелоадера */
async function animateLetters(lettersEl: HTMLElement, tickMs: number): Promise<void> {
  const SEQ = [
    "BE······", "BE·····E", "BEE····E", "BEEE···E",
    "BEEEE··E", "BEEEEE·E", "BEEEEEE·", "BEEEEEEE",
  ];
  for (const s of SEQ) {
    lettersEl.innerHTML = renderLetters(s);
    await sleep(tickMs);
  }
}

// =============================================================
// Canvas-анимация: хаос → шарик BeeLine
// =============================================================

interface ChaosPixel {
  sx: number; sy: number;
  vx: number; vy: number;
  tx: number; ty: number;
  x: number;  y: number;
  color: string;
  startAt: number;
  duration: number;
}

function startChaosAnimation(
  canvas: HTMLCanvasElement,
  opts: { showGen?: boolean; duration?: number } = {},
): void {
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
  window.addEventListener("resize", resize);

  const particles: ChaosPixel[] = [];

  function buildPixels(): void {
    particles.length = 0;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const CX = W / 2;
    // Центр шарика чуть выше середины — чтобы GEN и [BE......] влезли снизу
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
          startAt: Math.random() * (opts.duration ?? 1500) * 0.6,
          duration: (opts.duration ?? 1500) * 0.7 + Math.random() * 600,
        });
      }
    }
  }

  buildPixels();
  window.addEventListener("resize", buildPixels);

  const startTs = performance.now();
  let raf = 0;

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

    // Пульсация собранного шарика
    if (elapsed > 2400) {
      const pulse = 1 + Math.sin((elapsed - 2400) / 400) * 0.03;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(CX, CY, Math.min(W, H) * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
}
