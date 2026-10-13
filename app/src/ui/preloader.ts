/**
 * Прелоадер BGen.
 *
 * Сценарий:
 *  1. Пиксельный шарик BeeLine собирается из хаоса в центре
 *  2. Строка [BE......] — B,E,E всегда чёрные, дальше буквы чередуются жёлтый-чёрный
 *  3. E бежит к правой скобке
 *  4. GEN появляется внизу большими буквами
 *  5. Fade-out → показывается приложение
 */

const YELLOW = "#ffdd00";
const BLACK = "#000000";
const DOT = "#cccccc";

const BALL_TOTAL_PIXELS = 6; // размер пикселя в координатах canvas

export async function runPreloader(): Promise<void> {
  const preloaderEl = document.getElementById("preloader");
  const lettersEl = document.getElementById("bee-letters");
  const genEl = document.getElementById("bee-gen");
  const ballEl = document.getElementById("bee-ball") as HTMLCanvasElement | null;
  const appEl = document.getElementById("app");

  if (!preloaderEl || !lettersEl || !genEl || !appEl) {
    appEl?.removeAttribute("hidden");
    return;
  }

  // 1. Запускаем сборку шарика
  if (ballEl) {
    assembleBall(ballEl);
  }

  // 2. Анимация [BE......] — показываем первую версию сразу
  lettersEl.innerHTML = renderLetters("BE······");
  await sleep(400);

  // 3. E бежит к правой скобке
  const steps = [
    "BE·····E",
    "BEE····E",
    "BEEE···E",
    "BEEEE··E",
    "BEEEEE·E",
    "BEEEEEE·",
    "BEEEEEEE",
  ];
  for (const s of steps) {
    lettersEl.innerHTML = renderLetters(s);
    await sleep(180);
  }

  // 4. Даём шарику дособраться (общая длительность ~2.4 сек)
  await sleep(600);

  // 5. Показываем GEN
  genEl.textContent = "GEN";
  genEl.classList.add("show");

  // 6. Пауза на "полюбоваться"
  await sleep(900);

  // 7. Fade-out
  preloaderEl.classList.add("fade-out");
  await sleep(500);
  preloaderEl.remove();

  // 8. Показываем приложение
  appEl.removeAttribute("hidden");
}

/**
 * Рендерит строку так:
 *  - `[` и `]` — чёрные
 *  - первая `B` — чёрная
 *  - первые две `E` (позиции 1,2) — чёрные
 *  - последующие `E` (позиции 3,4,5...) — чередуются жёлтый/чёрный
 *  - `·` — серые точки
 */
function renderLetters(text: string): string {
  let eIndex = 0;
  return text
    .split("")
    .map((ch) => {
      if (ch === "·") return `<span class="bee-dot">·</span>`;
      if (ch === "B") return `<span class="bee-black">B</span>`;
      if (ch === "E") {
        // Первые 3 буквы (B + 2 E) — чёрные. Дальше — чередование.
        const cls = eIndex < 2 ? "bee-black" : eIndex % 2 === 0 ? "bee-black" : "bee-yellow";
        eIndex++;
        return `<span class="${cls}">E</span>`;
      }
      return `<span class="bee-black">${ch}</span>`;
    })
    .join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
// Пиксельный шарик BeeLine
// ─────────────────────────────────────────────────────────────
// Рисуем аккуратный шар с диагональными полосами (жёлтый-чёрный),
// который собирается из хаоса за ~2 секунды.

interface Pixel {
  sx: number; sy: number;   // старт
  tx: number; ty: number;   // цель
  x: number;  y: number;    // текущая
  color: string;
  delay: number;            // задержка старта
  duration: number;         // длительность полёта
}

function assembleBall(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const CX = W / 2;
  const CY = H / 2;
  const R = Math.min(W, H) * 0.42;
  const PIXEL = 4; // размер пикселя в координатах canvas

  // Собираем пиксели из сетки внутри круга
  const pixels: Pixel[] = [];

  // ─────────────────────────────────────────────────────────
  // Рисуем ТОЛЬКО контур и полоски — внутренние пиксели тоже,
  // но цвет определяется формулой "диагональные полосы".
  //
  // Формула: bandIndex = floor((u + v) / bandHeight) % 2
  //   где u,v — координаты относительно центра.
  // Проецируем на диагональ 45°: d = (u + v) / sqrt(2).
  // Каждая полоса шириной BAND_WIDTH.
  // ─────────────────────────────────────────────────────────

  const BAND_WIDTH = R / 1.5; // 4 полосы на шар

  for (let y = -R; y <= R; y += PIXEL) {
    for (let x = -R; x <= R; x += PIXEL) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist > R) continue;

      // Координаты центра пикселя
      const px = x + PIXEL / 2;
      const py = y + PIXEL / 2;

      // Диагональная проекция под 45°
      const diagonal = (px + py) / Math.SQRT2;
      const bandIndex = Math.floor(diagonal / BAND_WIDTH + 10) % 2;

      // Более простая формула для полос:
      // Цвет зависит от диагонали, полосы симметричные
      const bandAngle = Math.atan2(py, px);
      const combined = bandAngle + Math.PI; // 0..2π
      const bandSeg = Math.floor((combined + diagonal * 0.005) / (Math.PI / 3)) % 2;
      const color = bandSeg === 0 ? YELLOW : BLACK;

      // Пропускаем пиксели у самого края, чтобы контур был ровный
      // (опционально, для аккуратного края)

      const targetX = CX + px;
      const targetY = CY + py;

      // Стартовая позиция — хаос по всему полотну
      const startX = Math.random() * W;
      const startY = Math.random() * H;

      pixels.push({
        sx: startX,
        sy: startY,
        tx: targetX,
        ty: targetY,
        x: startX,
        y: startY,
        color,
        delay: Math.random() * 400,
        duration: 1200 + Math.random() * 400,
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // Анимация
  // ─────────────────────────────────────────────────────────
  const startTime = performance.now();
  const totalDuration = 2400; // мс

  function frame(now: number) {
    ctx.clearRect(0, 0, W, H);

    let allDone = true;
    for (const p of pixels) {
      const t = Math.max(0, now - startTime - p.delay) / p.duration;
      const clamped = Math.min(1, t);
      if (clamped < 1) allDone = false;

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - clamped, 3);

      p.x = p.sx + (p.tx - p.sx) * eased;
      p.y = p.sy + (p.ty - p.sy) * eased;

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), PIXEL, PIXEL);
    }

    if (!allDone) {
      requestAnimationFrame(frame);
    } else {
      // Финальная отрисовка — статичный шарик
      ctx.clearRect(0, 0, W, H);
      for (const p of pixels) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.tx), Math.round(p.ty), PIXEL, PIXEL);
      }
    }
  }

  requestAnimationFrame(frame);
}