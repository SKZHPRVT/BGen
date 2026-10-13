/**
 * Рендер фона. Поддерживает: solid, gradient, particles, stars, grid.
 * Возвращает JS-строку, которая встраивается в HTML игры.
 */
import type { BackgroundConfig } from "../types.ts";

/**
 * JS-код для инициализации фона.
 * Хранит состояние частиц между кадрами.
 */
export function backgroundRuntime(): string {
  return `
var __bgState = { particles: [] };

function __initBackground(bg, W, H) {
  __bgState.particles = [];
  if (!bg) return;
  if (bg.type === 'particles' || bg.type === 'stars') {
    var count = bg.particles ? bg.particles.count : 40;
    var color = bg.particles ? bg.particles.color : '#ffffff';
    var size = bg.particles ? bg.particles.size : 2;
    var speed = bg.particles ? bg.particles.speed : 0.2;
    var shape = bg.particles ? bg.particles.shape : 'circle';
    for (var i = 0; i < count; i++) {
      __bgState.particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: size + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        color: color,
        shape: shape,
        alpha: 0.4 + Math.random() * 0.6,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
}

function __drawBackground(ctx, bg, W, H, time) {
  if (!bg) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    return;
  }

  if (bg.type === 'solid') {
    ctx.fillStyle = bg.solidColor || (bg.gradient && bg.gradient.from) || '#111111';
    ctx.fillRect(0, 0, W, H);
    return;
  }

  if (bg.type === 'gradient' && bg.gradient) {
    var angle = (bg.gradient.angle || 180) * Math.PI / 180;
    var cx = W / 2, cy = H / 2;
    var len = Math.sqrt(W * W + H * H) / 2;
    var x1 = cx - Math.cos(angle) * len;
    var y1 = cy - Math.sin(angle) * len;
    var x2 = cx + Math.cos(angle) * len;
    var y2 = cy + Math.sin(angle) * len;
    var grd = ctx.createLinearGradient(x1, y1, x2, y2);
    grd.addColorStop(0, bg.gradient.from);
    grd.addColorStop(1, bg.gradient.to);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  if (bg.type === 'particles' || bg.type === 'stars') {
    // Сплошной фон
    ctx.fillStyle = (bg.gradient && bg.gradient.from) || '#0a0a15';
    ctx.fillRect(0, 0, W, H);
    // Частицы
    for (var i = 0; i < __bgState.particles.length; i++) {
      var p = __bgState.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      var alpha = p.alpha;
      if (bg.type === 'stars') {
        alpha = 0.3 + Math.abs(Math.sin(time / 1000 + p.twinkle)) * 0.7;
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'square') {
        ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      } else if (p.shape === 'star') {
        // Простая звезда из 5 линий
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        for (var s = 0; s < 5; s++) {
          var a = s * Math.PI * 2 / 5 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * p.r * 2, Math.sin(a) * p.r * 2);
          var a2 = a + Math.PI / 5;
          ctx.lineTo(Math.cos(a2) * p.r * 0.8, Math.sin(a2) * p.r * 0.8);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (bg.type === 'grid') {
    ctx.fillStyle = (bg.gradient && bg.gradient.from) || '#111111';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = (bg.gradient && bg.gradient.to) || '#222222';
    ctx.lineWidth = 1;
    var step = 30;
    ctx.beginPath();
    for (var x = 0; x < W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (var y = 0; y < H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    return;
  }

  // Fallback
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, W, H);
}
`;
}

/**
 * Рендер фона в HTML (статические стили для контейнера).
 */
export function backgroundCSS(bg: BackgroundConfig | undefined, background: string): string {
  if (!bg) return `background: ${background};`;
  if (bg.type === "solid") return `background: ${background};`;
  if (bg.type === "gradient" && bg.gradient) {
    return `background: linear-gradient(${bg.gradient.angle ?? 180}deg, ${bg.gradient.from}, ${bg.gradient.to});`;
  }
  return `background: ${background};`;
}
