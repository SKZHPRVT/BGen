/**
 * Прелоадер BGen.
 *
 * Сценарий:
 *  1. Пиксельный шарик BeeLine собирается из хаоса в центре
 *  2. Строка [BE......] — B,E,E всегда чёрные, дальше буквы чередуются жёлтый-чёрный
 *  3. E бежит к правой скобке
 *  4. GEN появляется внизу: G у левой скобки, E по центру, N у правой
 *  5. Fade-out → показывается приложение
 */

const YELLOW = "#ffdd00";
const BLACK = "#000000";

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

  // 4. Даём шарику дособраться
  await sleep(600);

  // 5. Показываем GEN — каждая буква в отдельном span,
  //    чтобы через flex space-between буквы легли:
  //    G — к левой скобке, E — по центру, N — к правой скобке.
  genEl.innerHTML =
    '<span class="bee-gen-letter">G</span>' +
    '<span class="bee-gen-letter">E</span>' +
    '<span class="bee-gen-letter">N</span>';
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
        // Первые 2 E — чёрные. Дальше — чередование.
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

interface Pixel {
  sx: number; sy: number;
  tx: number; ty: number;
  x: number; y: number;
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

  const pixels: Pixel[] = [];

  const BAND_WIDTH = R / 1.5;

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

      const targetX = CX + px;
      const targetY = CY + py;

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

  const startTime = performance.now();

  function frame(now: number) {
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
