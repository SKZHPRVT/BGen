/**
 * Прелоадер BGen.
 *
 * Сценарий:
 *  1. Экран loading показывается вместо start
 *  2. Строка [BE......] анимируется внизу (B, E, E — чёрные, дальше чередуются)
 *  3. Частицы хаоса по всему экрану летят к центру и собираются в шарик BeeLine
 *  4. Когда генерация завершена — переход на экран game (или обратно на start)
 */

const YELLOW = "#ffdd00";
const BLACK = "#000000";
const WHITE = "#ffffff";

// =============================================================
// Публичный API: показать/скрыть прелоадер
// =============================================================

let currentAnimation: number | null = null;
let startTs = 0;

export function showPreloader(): void {
  const screenStart = document.getElementById("screen-start");
  const screenGame = document.getElementById("screen-game");
  const screenLoading = document.getElementById("screen-loading");

  if (!screenLoading) return;

  screenStart?.setAttribute("hidden", "");
  screenGame?.setAttribute("hidden", "");
  screenLoading.removeAttribute("hidden");

  startLoadingAnimation();
}

export function hidePreloader(): void {
  const screenLoading = document.getElementById("screen-loading");
  if (!screenLoading) return;

  // Останавливаем анимацию
  if (currentAnimation !== null) {
    cancelAnimationFrame(currentAnimation);
    currentAnimation = null;
  }

  screenLoading.setAttribute("hidden", "");
}

// =============================================================
// Анимация [BE......] внизу экрана
// =============================================================

const SEQUENCE = [
  "BE······",
  "BE·····E",
  "BEE····E",
  "BEEE···E",
  "BEEEE··E",
  "BEEEEE·E",
  "BEEEEEE·",
  "BEEEEEEE",
];

let beeInterval: number | null = null;

function startLoadingAnimation(): void {
  const lettersEl = document.getElementById("bee-letters");
  const canvas = document.getElementById("chaos-canvas") as HTMLCanvasElement | null;

  if (lettersEl) {
    // Анимация букв
    if (beeInterval !== null) clearInterval(beeInterval);
    let idx = 0;
    lettersEl.innerHTML = renderLetters(SEQUENCE[0]!);
    beeInterval = window.setInterval(() => {
      idx = (idx + 1) % SEQUENCE.length;
      lettersEl.innerHTML = renderLetters(SEQUENCE[idx]!);
    }, 220);
  }

  if (canvas) {
    startChaosAnimation(canvas);
  }
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

// =============================================================
// Canvas-анимация: пиксели хаоса собираются в шарик BeeLine
// =============================================================

interface ChaosPixel {
  // хаос
  sx: number; sy: number;
  vx: number; vy: number;
  // цель на шарике
  tx: number; ty: number;
  // текущее
  x: number;  y: number;
  color: string;
  // прогресс сбора 0..1
  t: number;
  // момент старта (мс после начала)
  startAt: number;
  duration: number;
}

function startChaosAnimation(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Ресайз под реальный размер
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

  // ====== Построение цели (шарик BeeLine) ======
  // Шарик рисуется как круг с диагональными полосами.
  // Пиксели заполняют область круга в центре экрана.

  const particles: ChaosPixel[] = [];

  function buildPixels(): void {
    particles.length = 0;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const CX = W / 2;
    // Сдвигаем центр чуть выше — чтобы освободить место под [BE......] внизу
    const CY = H * 0.42;
    const R = Math.min(W, H) * 0.28;
    const PIXEL = 4;

    // Полосы: ширина одной полосы ≈ R / 1.5
    const BAND_WIDTH = R / 1.5;

    for (let y = -R; y <= R; y += PIXEL) {
      for (let x = -R; x <= R; x += PIXEL) {
        const dist = Math.sqrt(x * x + y * y);
        if (dist > R) continue;

        const px = x + PIXEL / 2;
        const py = y + PIXEL / 2;

        // Цвет по диагональной полосе
        const diagonal = (px + py) / Math.SQRT2;
        const bandAngle = Math.atan2(py, px);
        const combined = bandAngle + Math.PI;
        const bandSeg = Math.floor((combined + diagonal * 0.005) / (Math.PI / 3)) % 2;
        const color = bandSeg === 0 ? YELLOW : BLACK;

        const targetX = CX + px;
        const targetY = CY + py;

        // Начальная позиция — хаос по всему экрану
        const startX = Math.random() * W;
        const startY = Math.random() * H;

        // Скорость хаоса (пиксели немного летают до старта сбора)
        const vx = (Math.random() - 0.5) * 0.6;
        const vy = (Math.random() - 0.5) * 0.6;

        particles.push({
          sx: startX, sy: startY,
          vx, vy,
          tx: targetX, ty: targetY,
          x: startX, y: startY,
          color,
          t: 0,
          // Разные задержки — даёт эффект "сборки из хаоса"
          startAt: Math.random() * 1500,
          duration: 1500 + Math.random() * 800,
        });
      }
    }
  }

  buildPixels();
  window.addEventListener("resize", buildPixels);

  startTs = performance.now();

  function frame(now: number): void {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const CX = W / 2;
    const CY = H * 0.42;

    ctx.clearRect(0, 0, W, H);

    const elapsed = now - startTs;

    for (const p of particles) {
      // Хаос до момента startAt
      if (elapsed < p.startAt) {
        p.x += p.vx;
        p.y += p.vy;
        // отскок от границ
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));
      } else {
        // Летим к цели
        const t = Math.min(1, (elapsed - p.startAt) / p.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        p.x = p.sx + (p.tx - p.sx) * eased;
        p.y = p.sy + (p.ty - p.sy) * eased;
      }

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
    }

    // Пульсация собранного шарика
    if (elapsed > 2600) {
      const pulse = 1 + Math.sin((elapsed - 2600) / 400) * 0.03;
      // маленький эффект — рисуем свечение
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(CX, CY, Math.min(W, H) * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    currentAnimation = requestAnimationFrame(frame);
  }

  currentAnimation = requestAnimationFrame(frame);
}
