/**
 * Шаблон «Гонки».
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, spritesRuntime, audioRuntime } from "../render/index.ts";

export function buildRacingGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background, sprites } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Метры";

  const bgRuntime = backgroundRuntime();
  const sprRuntime = spritesRuntime();
  const audRuntime = audioRuntime();

  const runtimeConfig = { colors, texts, background, sprites, audio, fontSize, buttonSize };

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
    position: fixed; top: calc(env(safe-area-inset-top, 0px) + 16px);
    left: 50%; transform: translateX(-50%);
    font-size: ${Math.max(fontSize + 4, 22)}px; font-weight: 800;
    color: ${colors.text}; background: ${colors.surface};
    padding: 8px 22px; border-radius: 14px; z-index: 10;
    pointer-events: none; border: 2px solid ${colors.primary};
  }
  #controls {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    z-index: 10;
  }
  #controls button {
    width: ${Math.max(buttonSize, 80)}px; height: ${Math.max(buttonSize, 80)}px;
    border-radius: 50%; border: 3px solid ${colors.primary};
    background: ${colors.surface}; color: ${colors.text};
    font-size: ${Math.round(buttonSize * 0.45)}px; font-weight: bold;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.08s, background 0.15s;
  }
  #controls button:active { background: ${colors.primary}; color: #fff; transform: scale(0.95); }
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
<div id="controls">
  <button id="leftBtn" aria-label="Влево">◀</button>
  <button id="rightBtn" aria-label="Вправо">▶</button>
</div>
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
  var road = { x: 0, w: 0 };
  var player = { x: 0, y: 0, w: 0, h: 0 };
  var obstacles = [];
  var keys = { left: false, right: false };
  var score = 0;
  var state = 'playing';
  var speed = 6;
  var spawnTimer = 0;
  var lines = [];

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function updateSizes() {
    W = window.innerWidth;
    H = window.innerHeight;
    road.w = Math.min(W * 0.6, 400);
    road.x = (W - road.w) / 2;
    player.w = road.w * 0.16;
    player.h = player.w * 1.6;
    player.x = W / 2 - player.w / 2;
    player.y = H - player.h - 100;
    lines = [];
    for (var i = 0; i < 10; i++) {
      lines.push({ y: i * (H / 8), offset: 0 });
    }
  }

  function reset() {
    updateSizes();
    obstacles = [];
    score = 0;
    scoreEl.textContent = '0';
    speed = 6;
    spawnTimer = 0;
    state = 'playing';
    overlay.classList.remove('show');
  }

  function bindBtn(id, key) {
    var el = document.getElementById(id);
    el.addEventListener('touchstart', function(e) { e.preventDefault(); keys[key] = true; }, { passive: false });
    el.addEventListener('touchend', function(e) { e.preventDefault(); keys[key] = false; }, { passive: false });
    el.addEventListener('mousedown', function() { keys[key] = true; });
    el.addEventListener('mouseup', function() { keys[key] = false; });
  }
  bindBtn('leftBtn', 'left');
  bindBtn('rightBtn', 'right');

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  });
  document.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });

  function spawnObstacle() {
    var w = road.w * (0.12 + Math.random() * 0.08);
    var h = w * 1.6;
    var x = road.x + Math.random() * (road.w - w);
    obstacles.push({ x: x, y: -h, w: w, h: h });
  }

  function step() {
    if (keys.left) player.x -= 5;
    if (keys.right) player.x += 5;
    if (player.x < road.x) player.x = road.x;
    if (player.x + player.w > road.x + road.w) player.x = road.x + road.w - player.w;

    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].y += speed;
      if (obstacles[i].y > H + 50) {
        obstacles.splice(i, 1);
        score += 10;
        scoreEl.textContent = String(score);
      }
    }

    for (var k = 0; k < obstacles.length; k++) {
      var o = obstacles[k];
      if (player.x + player.w > o.x && player.x < o.x + o.w &&
          player.y + player.h > o.y && player.y < o.y + o.h) {
        return gameOver();
      }
    }

    for (var l = 0; l < lines.length; l++) {
      lines[l].y += speed;
      if (lines[l].y > H) lines[l].y -= H;
    }

    spawnTimer -= 16;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(400, 1200 - score * 2);
      speed = Math.min(15, 6 + score * 0.008);
    }
  }

  function gameOver() {
    state = 'gameover';
    overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Авария!';
    overlayHint.textContent = 'Проехал ' + score + ' м';
    overlay.classList.add('show');
    sound('gameOver');
  }

  var startTs = performance.now();
  var lastTick = 0;

  function render() {
    var time = performance.now() - startTs;
    __drawBackground(ctx, __cfg.background, W, H, time);

    ctx.fillStyle = __cfg.colors.surface;
    ctx.fillRect(road.x, 0, road.w, H);
    ctx.fillStyle = __cfg.colors.primary;
    ctx.fillRect(road.x - 4, 0, 4, H);
    ctx.fillRect(road.x + road.w, 0, 4, H);

    ctx.fillStyle = __cfg.colors.accent;
    for (var i = 0; i < lines.length; i++) {
      ctx.fillRect(W / 2 - 3, lines[i].y, 6, H / 20);
    }

    var obsSprite = __cfg.sprites && __cfg.sprites.obstacle;
    for (var k = 0; k < obstacles.length; k++) {
      var o = obstacles[k];
      if (obsSprite && obsSprite.type === 'emoji' && obsSprite.emoji) {
        ctx.font = Math.round(o.w) + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obsSprite.emoji, o.x + o.w / 2, o.y + o.h / 2);
      } else {
        ctx.fillStyle = __cfg.colors.accent;
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    }

    var pSprite = __cfg.sprites && __cfg.sprites.player;
    if (pSprite && pSprite.type === 'emoji' && pSprite.emoji) {
      ctx.font = Math.round(player.w * 1.5) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pSprite.emoji, player.x + player.w / 2, player.y + player.h / 2);
    } else {
      ctx.fillStyle = __cfg.colors.primary;
      ctx.fillRect(player.x, player.y, player.w, player.h);
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
