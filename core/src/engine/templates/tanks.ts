/**
 * Шаблон «Танки».
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, audioRuntime } from "../render/index.ts";

export function buildTanksGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Очки";

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
    width: ${Math.max(buttonSize, 76)}px; height: ${Math.max(buttonSize, 76)}px;
    border-radius: 50%; border: 3px solid ${colors.primary};
    background: ${colors.surface}; color: ${colors.text};
    font-size: ${Math.round(buttonSize * 0.45)}px; font-weight: bold;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.08s, background 0.15s;
  }
  #controls button:active { background: ${colors.primary}; color: #fff; transform: scale(0.95); }
  #fireBtn { background: ${colors.accent} !important; color: #fff !important; }
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
  <button id="fireBtn" aria-label="Огонь">🔥</button>
  <button id="rightBtn" aria-label="Вправо">▶</button>
</div>
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
  var player = { x: 0, y: 0, size: 0 };
  var bullets = [];
  var enemies = [];
  var keys = { left: false, right: false };
  var score = 0;
  var state = 'playing';
  var spawnTimer = 0;
  var lastShot = 0;

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function updateSizes() {
    W = window.innerWidth;
    H = window.innerHeight;
    player.size = Math.min(W, H) * 0.1;
    player.x = W / 2 - player.size / 2;
    player.y = H - player.size - 120;
  }

  function reset() {
    updateSizes();
    bullets = [];
    enemies = [];
    score = 0;
    scoreEl.textContent = '0';
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

  document.getElementById('fireBtn').addEventListener('click', fire);
  document.getElementById('fireBtn').addEventListener('touchstart', function(e) { e.preventDefault(); fire(); }, { passive: false });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    else if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); fire(); }
  });
  document.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });

  function fire() {
    if (state !== 'playing') return;
    var now = performance.now();
    if (now - lastShot < 250) return;
    lastShot = now;
    bullets.push({
      x: player.x + player.size / 2,
      y: player.y,
      vy: -12,
      r: 4,
    });
    sound('tap');
  }

  function spawnEnemy() {
    var size = player.size * (0.7 + Math.random() * 0.3);
    enemies.push({
      x: Math.random() * (W - size),
      y: -size,
      size: size,
      speed: 1.5 + Math.random() * 2 + score * 0.005,
      hp: 2,
    });
  }

  function step() {
    if (keys.left) player.x = Math.max(0, player.x - 6);
    if (keys.right) player.x = Math.min(W - player.size, player.x + 6);

    for (var i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y += bullets[i].vy;
      if (bullets[i].y < -20) bullets.splice(i, 1);
    }

    for (var j = enemies.length - 1; j >= 0; j--) {
      var e = enemies[j];
      e.y += e.speed;
      if (e.y > H + 20) { enemies.splice(j, 1); continue; }

      if (player.x + player.size > e.x && player.x < e.x + e.size &&
          player.y + player.size > e.y && player.y < e.y + e.size) {
        return gameOver();
      }
    }

    for (var b = bullets.length - 1; b >= 0; b--) {
      var bullet = bullets[b];
      for (var k = enemies.length - 1; k >= 0; k--) {
        var en = enemies[k];
        if (bullet.x > en.x && bullet.x < en.x + en.size && bullet.y > en.y && bullet.y < en.y + en.size) {
          en.hp--;
          if (en.hp <= 0) {
            enemies.splice(k, 1);
            score += 10;
            scoreEl.textContent = String(score);
            sound('coin');
          } else {
            sound('beep');
          }
          bullets.splice(b, 1);
          break;
        }
      }
    }

    spawnTimer -= 16;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(500, 1400 - score * 3);
    }
  }

  function gameOver() {
    state = 'gameover';
    overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Танк уничтожен';
    overlayHint.textContent = 'Очки: ' + score;
    overlay.classList.add('show');
    sound('gameOver');
  }

  var startTs = performance.now();
  var lastTick = 0;

  function render() {
    var time = performance.now() - startTs;
    __drawBackground(ctx, __cfg.background, W, H, time);

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      ctx.fillStyle = __cfg.colors.accent;
      ctx.beginPath();
      ctx.arc(e.x + e.size / 2, e.y + e.size / 2, e.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = Math.round(e.size * 0.85) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👾', e.x + e.size / 2, e.y + e.size / 2);
    }

    ctx.fillStyle = '#ff0';
    for (var b = 0; b < bullets.length; b++) {
      ctx.beginPath();
      ctx.arc(bullets[b].x, bullets[b].y, bullets[b].r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = Math.round(player.size * 1.1) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀', player.x + player.size / 2, player.y + player.size / 2);
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
