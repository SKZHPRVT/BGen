/**
 * Шаблон «Runner» — бесконечный бег.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, spritesRuntime, audioRuntime } from "../render/index.ts";

export function buildRunnerGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background, sprites, animations } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Метры";
  const speedMs = cfg.speed ?? 150;

  const bgRuntime = backgroundRuntime();
  const sprRuntime = spritesRuntime();
  const audRuntime = audioRuntime();

  const runtimeConfig = {
    colors, texts, background, sprites, animations, audio, speedMs,
    fontSize, buttonSize,
  };

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<title>${title}</title>
<style>
  html, body {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    overflow: hidden;
    color: ${colors.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    touch-action: none; overscroll-behavior: none;
    user-select: none; -webkit-user-select: none;
    ${backgroundCSS(background, colors.background)}
  }
  canvas { display: block; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
  #hud {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 16px);
    left: 50%;
    transform: translateX(-50%);
    font-size: ${Math.max(fontSize + 4, 22)}px;
    font-weight: 800;
    color: ${colors.text};
    background: ${colors.surface};
    padding: 8px 22px;
    border-radius: 14px;
    z-index: 10;
    pointer-events: none;
    border: 2px solid ${colors.primary};
  }
  #jumpBtn {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    right: 24px;
    width: ${Math.max(buttonSize, 80)}px;
    height: ${Math.max(buttonSize, 80)}px;
    border-radius: 50%;
    border: 3px solid ${colors.primary};
    background: ${colors.surface};
    color: ${colors.text};
    font-size: ${Math.round(buttonSize * 0.5)}px;
    font-weight: bold;
    cursor: pointer;
    z-index: 10;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #jumpBtn:active { background: ${colors.primary}; color: #fff; transform: scale(0.95); }
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
<button id="jumpBtn">⬆</button>
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

  var groundY = 0;
  var player = { x: 0, y: 0, vy: 0, size: 0 };
  var obstacles = [];
  var score = 0;
  var state = 'playing';
  var speed = 6;
  var spawnTimer = 0;
  var lastMove = 0;

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function updateSizes() {
    var W = window.innerWidth, H = window.innerHeight;
    groundY = H * 0.75;
    player.size = Math.min(W, H) * 0.09;
    player.x = W * 0.2;
    player.y = groundY - player.size;
  }

  function reset() {
    updateSizes();
    player.vy = 0;
    player.y = groundY - player.size;
    obstacles = [];
    score = 0;
    scoreEl.textContent = '0';
    speed = 6;
    spawnTimer = 0;
    state = 'playing';
    overlay.classList.remove('show');
  }

  function jump() {
    if (state !== 'playing') return;
    if (player.y >= groundY - player.size - 1) {
      player.vy = -Math.max(window.innerHeight * 0.025, 14);
      sound('tap');
    }
  }

  document.getElementById('jumpBtn').addEventListener('touchstart', function(e) { e.preventDefault(); jump(); }, { passive: false });
  document.getElementById('jumpBtn').addEventListener('click', jump);
  document.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); jump(); }
  });
  document.addEventListener('touchstart', function(e) {
    if (e.target.id !== 'jumpBtn') jump();
  }, { passive: true });
  canvas.addEventListener('click', jump);

  function spawnObstacle() {
    var size = player.size * (0.6 + Math.random() * 0.4);
    obstacles.push({
      x: window.innerWidth + size,
      y: groundY - size,
      w: size,
      h: size,
      sprite: (__cfg.sprites && __cfg.sprites.obstacle) || null,
    });
  }

  function step() {
    player.vy += 0.8;
    player.y += player.vy;
    if (player.y >= groundY - player.size) {
      player.y = groundY - player.size;
      player.vy = 0;
    }

    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed;
      if (obstacles[i].x + obstacles[i].w < -20) {
        obstacles.splice(i, 1);
        score += 10;
        scoreEl.textContent = String(score);
      }
    }

    for (var k = 0; k < obstacles.length; k++) {
      var o = obstacles[k];
      if (player.x + player.size > o.x && player.x < o.x + o.w &&
          player.y + player.size > o.y && player.y < o.y + o.h) {
        return gameOver();
      }
    }

    spawnTimer -= speedMs;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(600, 1400 - score * 3);
      speed = Math.min(14, 6 + score * 0.01);
    }
  }

  function gameOver() {
    state = 'gameover';
    overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Игра окончена';
    overlayHint.textContent = 'Пробежал ' + score + ' м';
    overlay.classList.add('show');
    sound('gameOver');
  }

  var startTs = performance.now();
  var lastTick = 0;

  function render() {
    var W = window.innerWidth, H = window.innerHeight;
    var time = performance.now() - startTs;

    __drawBackground(ctx, __cfg.background, W, H, time);

    // Земля
    ctx.fillStyle = __cfg.colors.surface;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = __cfg.colors.primary;
    ctx.fillRect(0, groundY, W, 4);

    // Препятствия
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.sprite && o.sprite.type === 'emoji' && o.sprite.emoji) {
        ctx.font = Math.round(o.h * 0.95) + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.sprite.emoji, o.x + o.w / 2, o.y + o.h / 2);
      } else {
        ctx.fillStyle = __cfg.colors.accent;
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    }

    // Игрок
    var sp = __cfg.sprites && __cfg.sprites.player;
    if (sp && sp.type === 'emoji' && sp.emoji) {
      ctx.font = Math.round(player.size * 1.1) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.emoji, player.x + player.size / 2, player.y + player.size / 2);
    } else {
      ctx.fillStyle = __cfg.colors.primary;
      ctx.beginPath();
      ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size / 2, 0, Math.PI * 2);
      ctx.fill();
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
  window.addEventListener('resize', function() { resize(); updateSizes(); });
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
