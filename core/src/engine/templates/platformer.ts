/**
 * Шаблон «Платформер».
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, spritesRuntime, audioRuntime } from "../render/index.ts";

export function buildPlatformerGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background, sprites } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Монеты";

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
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    z-index: 10;
  }
  #controls button {
    width: ${Math.max(buttonSize, 72)}px; height: ${Math.max(buttonSize, 72)}px;
    border-radius: 50%; border: 3px solid ${colors.primary};
    background: ${colors.surface}; color: ${colors.text};
    font-size: ${Math.round(buttonSize * 0.45)}px; font-weight: bold;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.08s, background 0.15s;
  }
  #controls button:active { background: ${colors.primary}; color: #fff; transform: scale(0.95); }
  #jumpBtn { background: ${colors.accent} !important; color: #fff !important; width: ${Math.max(buttonSize + 12, 88)}px !important; height: ${Math.max(buttonSize + 12, 88)}px !important; }
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
  <button id="jumpBtn" aria-label="Прыжок">⬆</button>
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

  var W = 0, H = 0, groundY = 0;
  var player = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, onGround: false };
  var keys = { left: false, right: false, jump: false };
  var platforms = [];
  var coins = [];
  var goal = { x: 0, y: 0, w: 0, h: 0 };
  var score = 0;
  var state = 'playing';
  var worldWidth = 0;
  var cameraX = 0;

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function updateSizes() {
    W = window.innerWidth;
    H = window.innerHeight;
    groundY = H - Math.max(40, H * 0.08);
    worldWidth = W * 3;
  }

  function reset() {
    updateSizes();
    player.w = W * 0.06;
    player.h = W * 0.06 * 1.2;
    player.x = 40;
    player.y = groundY - player.h;
    player.vx = 0; player.vy = 0;
    player.onGround = false;
    cameraX = 0;

    platforms = [
      { x: 0, y: groundY, w: worldWidth, h: H },
      { x: W * 0.5, y: groundY - H * 0.15, w: W * 0.25, h: 20 },
      { x: W * 1.0, y: groundY - H * 0.25, w: W * 0.25, h: 20 },
      { x: W * 1.5, y: groundY - H * 0.18, w: W * 0.22, h: 20 },
      { x: W * 2.0, y: groundY - H * 0.28, w: W * 0.25, h: 20 },
      { x: W * 2.5, y: groundY - H * 0.15, w: W * 0.3, h: 20 },
    ];
    coins = [
      { x: W * 0.6, y: groundY - H * 0.2, got: false },
      { x: W * 1.1, y: groundY - H * 0.3, got: false },
      { x: W * 1.6, y: groundY - H * 0.23, got: false },
      { x: W * 2.1, y: groundY - H * 0.33, got: false },
      { x: W * 2.6, y: groundY - H * 0.2, got: false },
    ];
    goal = { x: worldWidth - 60, y: groundY - 60, w: 40, h: 60 };

    score = 0;
    scoreEl.textContent = '0';
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
  bindBtn('jumpBtn', 'jump');

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); keys.jump = true; }
  });
  document.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') keys.jump = false;
  });

  function step() {
    var speed = 4;
    if (keys.left) player.vx = -speed;
    else if (keys.right) player.vx = speed;
    else player.vx = 0;

    if (keys.jump && player.onGround) {
      player.vy = -14;
      player.onGround = false;
    }

    player.vy += 0.8;
    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 0) player.x = 0;

    player.onGround = false;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h > p.y && player.y + player.h < p.y + p.h + player.vy + 2) {
        if (player.vy > 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }
    }

    if (player.y > H + 100) return gameOver(false);

    for (var c = 0; c < coins.length; c++) {
      var co = coins[c];
      if (co.got) continue;
      var dx = (player.x + player.w / 2) - co.x;
      var dy = (player.y + player.h / 2) - co.y;
      if (Math.sqrt(dx * dx + dy * dy) < player.w * 0.9) {
        co.got = true;
        score++;
        scoreEl.textContent = String(score);
        sound('eat');
      }
    }

    if (player.x + player.w > goal.x && player.x < goal.x + goal.w &&
        player.y + player.h > goal.y) {
      return gameOver(true);
    }

    var targetCam = Math.max(0, Math.min(worldWidth - W, player.x - W * 0.3));
    cameraX += (targetCam - cameraX) * 0.1;
  }

  function gameOver(win) {
    state = 'gameover';
    overlayTitle.textContent = win ? ((__cfg.texts && __cfg.texts.winTitle) || 'Победа!') : ((__cfg.texts && __cfg.texts.gameOverTitle) || 'Упал!');
    overlayHint.textContent = 'Монет: ' + score;
    overlay.classList.add('show');
    sound(win ? 'win' : 'gameOver');
  }

  var startTs = performance.now();
  var lastTick = 0;

  function render() {
    var time = performance.now() - startTs;
    __drawBackground(ctx, __cfg.background, W, H, time);

    ctx.save();
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = __cfg.colors.surface;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = __cfg.colors.primary;
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillStyle = __cfg.colors.surface;
    }

    var coinSprite = __cfg.sprites && __cfg.sprites.food;
    for (var c = 0; c < coins.length; c++) {
      var co = coins[c];
      if (co.got) continue;
      if (coinSprite && coinSprite.type === 'emoji' && coinSprite.emoji) {
        ctx.font = Math.round(player.w * 0.9) + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coinSprite.emoji, co.x, co.y);
      } else {
        ctx.fillStyle = __cfg.colors.accent;
        ctx.beginPath();
        ctx.arc(co.x, co.y, player.w * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.font = Math.round(goal.h * 0.9) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🏁', goal.x + goal.w / 2, goal.y + goal.h);

    var pSprite = __cfg.sprites && __cfg.sprites.player;
    if (pSprite && pSprite.type === 'emoji' && pSprite.emoji) {
      ctx.font = Math.round(player.w * 1.1) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pSprite.emoji, player.x + player.w / 2, player.y + player.h / 2);
    } else {
      ctx.fillStyle = __cfg.colors.primary;
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
