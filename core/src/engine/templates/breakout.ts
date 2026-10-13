/**
 * Шаблон «Breakout» — сбей кирпичи.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, spritesRuntime, audioRuntime } from "../render/index.ts";

export function buildBreakoutGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background, sprites, animations } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Счёт";

  const bgRuntime = backgroundRuntime();
  const sprRuntime = spritesRuntime();
  const audRuntime = audioRuntime();

  const runtimeConfig = { colors, texts, background, sprites, animations, audio, fontSize, buttonSize };

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<title>${title}</title>
<style>
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    overflow: hidden; color: ${colors.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    touch-action: none; overscroll-behavior: none;
    user-select: none; -webkit-user-select: none;
    ${backgroundCSS(background, colors.background)}
  }
  canvas { display: block; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
  #hud {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 16px);
    left: 50%; transform: translateX(-50%);
    font-size: ${Math.max(fontSize + 4, 22)}px; font-weight: 800;
    color: ${colors.text}; background: ${colors.surface};
    padding: 8px 22px; border-radius: 14px; z-index: 10;
    pointer-events: none; border: 2px solid ${colors.primary};
  }
  #overlay {
    position: fixed; inset: 0; display: none;
    flex-direction: column; align-items: center; justify-content: center;
    gap: 20px; background: rgba(0,0,0,0.75); color: #fff; text-align: center;
    padding: 24px; z-index: 30;
  }
  #overlay.show { display: flex; }
  #overlay .title { font-size: ${Math.max(fontSize + 10, 28)}px; font-weight: 800; }
  #overlay button {
    margin-top: 8px; padding: 16px 32px; font-size: ${Math.max(fontSize, 20)}px;
    font-weight: 700; border-radius: 16px; border: none;
    background: ${colors.primary}; color: #000; min-height: ${buttonSize}px; cursor: pointer;
  }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="hud">${scorePrefix}: <span id="score">0</span></div>
<div id="overlay">
  <div class="title" id="overlayTitle"></div>
  <div id="overlayHint" style="opacity:0.8"></div>
  <button id="overlayBtn">${restartButton}</button>
</div>
<script>
${bgRuntime}
${sprRuntime}
${audRuntime}

(function() {
  var __cfg = ${JSON.stringify(runtimeConfig)};
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    __initBackground(__cfg.background, window.innerWidth, window.innerHeight);
  }

  __initAudio(__cfg.audio && __cfg.audio.enabled, __cfg.audio && __cfg.audio.volume);
  function sound(kind) {
    if (!__cfg.audio || !__cfg.audio.enabled) return;
    var type = (__cfg.audio.sounds && __cfg.audio.sounds[kind]) || 'pop';
    __playSound(type);
  }

  var W = 0, H = 0;
  var paddle = { x: 0, y: 0, w: 0, h: 0 };
  var ball = { x: 0, y: 0, vx: 0, vy: 0, r: 0 };
  var bricks = [];
  var score = 0;
  var lives = 3;
  var state = 'playing';

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function updateSizes() {
    W = window.innerWidth;
    H = window.innerHeight;
  }

  function reset() {
    updateSizes();
    paddle.w = W * 0.28;
    paddle.h = Math.max(16, H * 0.02);
    paddle.x = (W - paddle.w) / 2;
    paddle.y = H - paddle.h - 60;

    ball.r = Math.max(8, W * 0.018);
    ball.x = W / 2;
    ball.y = paddle.y - ball.r - 5;
    ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = -6;

    // Кирпичи — 5 рядов
    bricks = [];
    var cols = 6, rows = 5;
    var pad = 8;
    var bw = (W - pad * (cols + 1)) / cols;
    var bh = Math.max(20, H * 0.03);
    var offsetY = 100;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        bricks.push({
          x: pad + c * (bw + pad),
          y: offsetY + r * (bh + pad),
          w: bw, h: bh, alive: true,
        });
      }
    }

    score = 0;
    lives = 3;
    scoreEl.textContent = '0';
    state = 'playing';
    overlay.classList.remove('show');
  }

  function movePaddle(x) {
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  }

  document.addEventListener('touchmove', function(e) {
    if (!e.touches[0]) return;
    movePaddle(e.touches[0].clientX);
  }, { passive: true });
  document.addEventListener('touchstart', function(e) {
    if (!e.touches[0]) return;
    movePaddle(e.touches[0].clientX);
  }, { passive: true });
  document.addEventListener('mousemove', function(e) { movePaddle(e.clientX); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') paddle.x = Math.max(0, paddle.x - 30);
    else if (e.key === 'ArrowRight') paddle.x = Math.min(W - paddle.w, paddle.x + 30);
  });

  function step() {
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r < 0 || ball.x + ball.r > W) {
      ball.vx = -ball.vx;
      ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
    }
    if (ball.y - ball.r < 0) { ball.vy = -ball.vy; ball.y = ball.r; }

    if (ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h &&
        ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
      var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hit * 8;
      ball.vy = -Math.abs(ball.vy);
      ball.y = paddle.y - ball.r - 1;
      sound('tap');
    }

    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        b.alive = false;
        ball.vy = -ball.vy;
        score += 10;
        scoreEl.textContent = String(score);
        sound('eat');
        break;
      }
    }

    if (ball.y - ball.r > H) {
      lives--;
      if (lives <= 0) return gameOver(false);
      ball.x = W / 2;
      ball.y = paddle.y - ball.r - 5;
      ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = -6;
    }

    if (bricks.every(function(b) { return !b.alive; })) return gameOver(true);
  }

  function gameOver(win) {
    state = 'gameover';
    overlayTitle.textContent = win ? ((__cfg.texts && __cfg.texts.winTitle) || 'Победа!') : ((__cfg.texts && __cfg.texts.gameOverTitle) || 'Игра окончена');
    overlayHint.textContent = 'Счёт: ' + score;
    overlay.classList.add('show');
    sound(win ? 'win' : 'gameOver');
  }

  var startTs = performance.now();
  var lastTick = 0;

  function render() {
    var time = performance.now() - startTs;
    __drawBackground(ctx, __cfg.background, W, H, time);

    // Кирпичи
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      ctx.fillStyle = __cfg.colors.accent;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = __cfg.colors.surface;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }

    // Платформа
    ctx.fillStyle = __cfg.colors.primary;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    // Мяч
    ctx.fillStyle = __cfg.colors.text;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // Жизни — emoji или текст
    ctx.font = Math.round(Math.max(20, H * 0.025)) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = __cfg.colors.text;
    ctx.fillText('❤️ ' + lives, 20, 20);
  }

  function loop(now) {
    if (!now) now = performance.now();
    if (state === 'playing' && now - lastTick >= 16) {
      lastTick = now;
      step();
    }
    render();
    requestAnimationFrame(loop);
  }

  overlayBtn.addEventListener('click', function(e) { e.preventDefault(); reset(); });
  overlayBtn.addEventListener('touchstart', function(e) { e.preventDefault(); reset(); }, { passive: false });

  resize();
  window.addEventListener('resize', function() { resize(); reset(); });
  reset();
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
