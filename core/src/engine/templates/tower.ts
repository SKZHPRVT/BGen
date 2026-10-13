/**
 * Шаблон «Башня» — stack.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, audioRuntime } from "../render/index.ts";

export function buildTowerGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Высота";

  const bgRuntime = backgroundRuntime();
  const audRuntime = audioRuntime();

  const runtimeConfig = { colors, texts, background, audio, fontSize, buttonSize };

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
  var stack = [];  // { x, w, y }
  var current = null; // { x, w, dir, speed }
  var score = 0;
  var state = 'playing';
  var baseW = 0;
  var blockH = 0;
  var startY = 0;

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function updateSizes() {
    W = window.innerWidth;
    H = window.innerHeight;
    baseW = W * 0.5;
    blockH = Math.max(20, H * 0.04);
    startY = H * 0.8;
  }

  function reset() {
    updateSizes();
    stack = [{ x: (W - baseW) / 2, w: baseW, y: startY }];
    score = 0;
    scoreEl.textContent = '0';
    spawnBlock();
    state = 'playing';
    overlay.classList.remove('show');
  }

  function spawnBlock() {
    var prev = stack[stack.length - 1];
    current = {
      x: 0,
      w: prev.w,
      dir: 1,
      speed: 4,
    };
  }

  function drop() {
    if (state !== 'playing' || !current) return;
    var prev = stack[stack.length - 1];
    var prevLeft = prev.x;
    var prevRight = prev.x + prev.w;
    var curLeft = current.x;
    var curRight = current.x + current.w;

    var newLeft = Math.max(prevLeft, curLeft);
    var newRight = Math.min(prevRight, curRight);
    var overlap = newRight - newLeft;

    if (overlap <= 0) {
      return gameOver();
    }

    stack.push({
      x: newLeft,
      w: overlap,
      y: prev.y - blockH,
    });
    score++;
    scoreEl.textContent = String(score);
    sound('eat');

    if (stack.length > 10) stack.shift();
    spawnBlock();
  }

  document.addEventListener('touchstart', function(e) { e.preventDefault(); drop(); }, { passive: false });
  document.addEventListener('click', drop);
  document.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); drop(); }
  });

  function gameOver() {
    state = 'gameover';
    overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Игра окончена';
    overlayHint.textContent = 'Высота: ' + score;
    overlay.classList.add('show');
    sound('gameOver');
  }

  var startTs = performance.now();
  var lastTick = 0;

  function step() {
    if (!current) return;
    current.x += current.speed * current.dir;
    if (current.x <= 0) { current.x = 0; current.dir = 1; }
    if (current.x + current.w >= W) { current.x = W - current.w; current.dir = -1; }
  }

  function render() {
    var time = performance.now() - startTs;
    __drawBackground(ctx, __cfg.background, W, H, time);

    // Башня
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      var ratio = i / Math.max(1, stack.length);
      var hue = 30 + ratio * 200;
      ctx.fillStyle = 'hsl(' + hue + ', 60%, 55%)';
      ctx.fillRect(b.x, b.y, b.w, blockH);
      ctx.strokeStyle = __cfg.colors.surface;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, blockH);
    }

    // Текущий блок
    if (current && state === 'playing') {
      var prev = stack[stack.length - 1];
      ctx.fillStyle = __cfg.colors.primary;
      ctx.fillRect(current.x, prev.y - blockH, current.w, blockH);
    }
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
