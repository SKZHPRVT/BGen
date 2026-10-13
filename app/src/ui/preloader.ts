/**
 * Стартовый прелоадер BGen.
 * 1. [BE······] — прогресс-бар буквами «жёлтый-чёрный»
 * 2. Пиксельный шарик собирается из хаоса
 * 3. Появляется GEN внизу
 * 4. Fade-out → показываем основное приложение
 *
 * Дизайн: белый фон, чёрные скобки, жёлто-чёрные буквы.
 */

const YELLOW = "#ffdd00";
const BLACK = "#000000";

const SEQUENCE = [
  // Каждое состояние: буква, цвет, позиция E
  { text: "BE······", ePos: 1, delay: 350 },
  { text: "BE·····E", ePos: 7, delay: 250 },
  { text: "BEE····E", ePos: 6, delay: 200 },
  { text: "BEEE···E", ePos: 5, delay: 180 },
  { text: "BEEEE··E", ePos: 4, delay: 160 },
  { text: "BEEEEE·E", ePos: 3, delay: 140 },
  { text: "BEEEEEE·", ePos: -1, delay: 140 },
  { text: "BEEEEEEE", ePos: -1, delay: 300 },
];

export async function runPreloader(): Promise<void> {
  const preloaderEl = document.getElementById("preloader");
  const lettersEl = document.getElementById("bee-letters");
  const genEl = document.getElementById("bee-gen");
  const ballEl = document.getElementById("bee-ball") as HTMLCanvasElement | null;
  const appEl = document.getElementById("app");

  if (!preloaderEl || !lettersEl || !genEl || !appEl) {
    // Fallback: прелоадер не нужен — сразу показываем app
    appEl?.removeAttribute("hidden");
    return;
  }

  // Запускаем анимацию шарика параллельно
  if (ballEl) startBeeBallAnimation(ballEl);

  // Анимация [BE······] → [BEEEEEEE]
  for (const step of SEQUENCE) {
    lettersEl.innerHTML = renderLetters(step.text);
    await sleep(step.delay);
  }

  // Показываем GEN
  genEl.textContent = "GEN";
  // Плавное появление буква за буквой
  await animateGenLetters(genEl);

  // Даём шарику дособраться
  await sleep(600);

  // Fade-out прелоадера
  preloaderEl.classList.add("fade-out");
  await sleep(400);
  preloaderEl.remove();

  // Показываем основное приложение
  appEl.removeAttribute("hidden");
}

/**
 * Рендерит строку в HTML: буквы E чередуются жёлтый/чёрный,
 * точки — серые, остальные — чёрные.
 */
function renderLetters(text: string): string {
  return text
    .split("")
    .map((ch, i) => {
      if (ch === "·") return `<span style="color:#ccc">·</span>`;
      if (ch === "E") {
        return `<span style="color:${i % 2 === 0 ? YELLOW : BLACK}">E</span>`;
      }
      return `<span style="color:${BLACK}">${ch}</span>`;
    })
    .join("");
}

/** Поочерёдное появление букв GEN */
async function animateGenLetters(el: HTMLElement): Promise<void> {
  el.classList.add("show");
  await sleep(500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
// Пиксельный шарик — собирается из хаоса
// ─────────────────────────────────────────────────────────────

interface Particle {
  // Стартовая позиция (хаос)
  sx: number;
  sy: number;
  // Целевая позиция (на шарике)
  tx: number;
  ty: number;
  // Текущая позиция
  x: number;
  y: number;
  // Цвет
  color: string;
  size: number;
  // Прогресс анимации 0..1
  t: number;
  // Скорость анимации
  speed: number;
}

function startBeeBallAnimation(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const CX = W / 2;
  const CY = H / 2;
  const R = Math.min(W, H) * 0.42;
  const PIXEL = 6; // размер пикселя

  // Генерируем частицы: для каждой точки внутри шарика (сетка PIXEL x PIXEL)
  const particles: Particle[] = [];
  const cols = Math.floor(R * 2 / PIXEL);
  const rows = Math.floor(R * 2 / PIXEL);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = -R + i * PIXEL + PIXEL / 2;
      const py = -R + j * PIXEL + PIXEL / 2;
      const dist = Math.sqrt(px * px + py * py);
      if (dist > R) continue; // за пределами круга

      // Определяем цвет по диагональным полоскам
      // Угол в шарике: жёлтый/чёрный чередуются по диагонали
      const angle = (Math.atan2(py, px) + Math.PI * 2) % (Math.PI * 2);
      const bandIndex = Math.floor((angle + dist * 0.02) / (Math.PI / 3));
      const color = bandIndex % 2 === 0 ? YELLOW : BLACK;

      particles.push({
        // старт в хаосе по всему полотну
        sx: Math.random() * W,
        sy: Math.random() * H,
        // цель — на шарике
        tx: CX + px,
        ty: CY + py,
        // текущая = стартовая
        x: Math.random() * W,
        y: Math.random() * H,
        color,
        size: PIXEL,
        t: 0,
        speed: 0.008 + Math.random() * 0.012,
      });
    }
  }

  // Анимация
  function frame() {
    ctx.clearRect(0, 0, W, H);

    let allDone = true;
    for (const p of particles) {
      if (p.t < 1) {
        p.t = Math.min(1, p.t + p.speed);
        allDone = false;
      }
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - p.t, 3);
      p.x = p.sx + (p.tx - p.sx) * eased;
      p.y = p.sy + (p.ty - p.sy) * eased;

      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    if (!allDone || performance.now() < 5000) {
      requestAnimationFrame(frame);
    } else {
      // Финальный рендер — статичный шарик
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.tx, p.ty, p.size, p.size);
      }
    }
  }

  requestAnimationFrame(frame);
}