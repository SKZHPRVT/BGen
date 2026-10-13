/**
 * Шаблон «Runner» — бесконечный бег.
 * Обновление: убраны сложные проверки, упрощён loop, добавлена отладка.
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
  #controls {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    z-index: 10;
  }
  #jumpBtn {
    width: ${Math.max(buttonSize + 20, 96)}px;
    height: ${Math.max(buttonSize + 20, 96)}px;
    border-radius: 50%;
    border: 3px solid ${colors.primary};
    background: ${colors.accent};
    color: #fff;
    font-size: ${Math.round(buttonSize * 0.5)}px;
    font-weight: bold;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
  }
  #jumpBtn:active { transform: scale(0.92); }
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
  <button id="jumpBtn">⬆</button>
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

  var W = 0, H = 0, groundY = 0;
  var player = null;
  var obstacles = [];
  var score = 0;
  var state = 'playing';
  var speed = 7;
  var spawnTimer = 0;
  var lastTick = 0;
  var startTs = performance.now();

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    __initBackground(__cfg.background, W, H);
  }

  __initAudio(__cfg.audio && __cfg.audio.enabled, __cfg.audio && __cfg.audio.volume);
  function sound(kind) {
    if (!__cfg.audio || !__cfg.audio.enabled) return;
    var type = (__cfg.audio.sounds && __cfg.audio.sounds[kind]) || 'pop';
    __playSound(type);
  }

  function reset() {
    resize();
    groundY = H * 0.75;
    var size = Math.min(W, H) * 0.09;
    player = {
      x: W * 0.2,
      y: groundY - size,
      size: size,
      vy: 0,
      onGround: true,
    };
    obstacles = [];
    score = 0;
    scoreEl.textContent = '0';
    speed = 7;
    spawnTimer = 800;
    state = 'playing';
    overlay.classList.remove('show');
  }

  function jump() {
    if (state !== 'playing') return;
    if (player.onGround) {
      player.vy = -Math.max(H * 0.028, 16);
      player.onGround = false;
      sound('tap');
    }
  }

  function spawnObstacle() {
    var size = player.size * (0.7 + Math.random() * 0.4);
    obstacles.push({
      x: W + 20,
      y: groundY - size,
      w: size,
      h: size,
    });
  }

  function step() {
    // Гравитация
    player.vy += 1;
    player.y += player.vy;

    if (player.y >= groundY - player.size) {
      player.y = groundY - player.size;
      player.vy = 0;
      player.onGround = true;
    }

    // Препятствия — движемся навстречу
    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed;
      if (obstacles[i].x + obstacles[i].w < -20) {
        obstacles.splice(i, 1);
        score += 10;
        scoreEl.textContent = String(score);
      }
    }

    // Коллизии
    for (var k = 0; k < obstacles.length; k++) {
      var o = obstacles[k];
      if (player.x + player.size > o.x && player.x < o.x + o.w &&
          player.y + player.size > o.y && player.y < o.y + o.h) {
        return gameOver();
      }
    }

    // Спавн
    spawnTimer -= 16;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(500, 1300 - score * 4);
      speed = Math.min(16, 7 + score * 0.012);
    }
  }

  function gameOver() {
    state = 'gameover';
    overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Игра окончена';
    overlayHint.textContent = 'Пробежал ' + score + ' м';
    overlay.classList.add('show');
    sound('gameOver');
  }

  function drawEmoji(emoji, x, y, size) {
    if (!emoji) return;
    ctx.font = Math.round(size) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
  }

  function render() {
    var time = performance.now() - startTs;

    __drawBackground(ctx, __cfg.background, W, H, time);

    // Земля
    ctx.fillStyle = __cfg.colors.surface;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = __cfg.colors.primary;
    ctx.fillRect(0, groundY - 4, W, 4);

    // Препятствия
    var obsSprite = __cfg.sprites && __cfg.sprites.obstacle;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (obsSprite && obsSprite.type === 'emoji' && obsSprite.emoji) {
        drawEmoji(obsSprite.emoji, o.x + o.w / 2, o.y + o.h / 2, o.h * 0.95);
      } else {
        ctx.fillStyle = __cfg.colors.accent;
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    }

    // Игрок
    var pSprite = __cfg.sprites && __cfg.sprites.player;
    if (pSprite && pSprite.type === 'emoji' && pSprite.emoji) {
      drawEmoji(pSprite.emoji, player.x + player.size / 2, player.y + player.size / 2, player.size * 1.15);
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

  // ===== INPUT =====
  var jumpBtn = document.getElementById('jumpBtn');
  jumpBtn.addEventListener('touchstart', function(e) { e.preventDefault(); jump(); }, { passive: false });
  jumpBtn.addEventListener('click', function(e) { e.preventDefault(); jump(); });
  jumpBtn.addEventListener('mousedown', function(e) { e.preventDefault(); jump(); });

  document.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); jump(); }
  });

  canvas.addEventListener('click', jump);
  canvas.addEventListener('touchstart', function(e) { e.preventDefault(); jump(); }, { passive: false });

  overlayBtn.addEventListener('click', function(e) { e.preventDefault(); reset(); });
  overlayBtn.addEventListener('touchstart', function(e) { e.preventDefault(); reset(); }, { passive: false });

  window.addEventListener('resize', function() { resize(); });
  window.addEventListener('orientationchange', function() { setTimeout(resize, 200); });

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
