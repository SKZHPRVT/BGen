/**
 * Шаблон «Кликер».
 * Управление, механика, апгрейды — наши. Меняются цвета, эмодзи, тексты.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, spritesRuntime, audioRuntime } from "../render/index.ts";

export function buildClickerGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background, sprites, animations } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Счёт";
  const goal = 1000;

  const bgRuntime = backgroundRuntime();
  const sprRuntime = spritesRuntime();
  const audRuntime = audioRuntime();

  const runtimeConfig = {
    colors, texts, background, sprites, animations, audio, goal,
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
    touch-action: manipulation; overscroll-behavior: none;
    user-select: none; -webkit-user-select: none;
    ${backgroundCSS(background, colors.background)}
  }
  canvas {
    display: block; position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
  }
  #hud {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 16px);
    left: 50%;
    transform: translateX(-50%);
    font-size: ${Math.max(fontSize + 6, 26)}px;
    font-weight: 800;
    color: ${colors.text};
    background: rgba(0,0,0,0.4);
    padding: 10px 24px;
    border-radius: 16px;
    z-index: 10;
    pointer-events: none;
  }
  #clicker-area {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  #clicker-emoji {
    font-size: 40vmin;
    line-height: 1;
    user-select: none;
    transition: transform 0.08s ease-out;
    filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
  }
  #clicker-emoji.pressed { transform: scale(0.9); }
  #upgrades {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
    left: 12px; right: 12px;
    display: flex;
    gap: 10px;
    justify-content: center;
    z-index: 10;
    flex-wrap: wrap;
  }
  .upgrade-btn {
    padding: 12px 16px;
    font-size: ${Math.max(fontSize - 2, 14)}px;
    font-weight: 700;
    border-radius: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.15);
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    min-height: ${buttonSize}px;
    backdrop-filter: blur(6px);
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.08s;
  }
  .upgrade-btn:active { transform: scale(0.95); }
  .upgrade-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  #overlay {
    position: fixed; inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: rgba(0,0,0,0.75);
    color: #fff;
    text-align: center;
    padding: 24px;
    z-index: 30;
  }
  #overlay.show { display: flex; }
  #overlay .title {
    font-size: ${Math.max(fontSize + 10, 28)}px;
    font-weight: 800;
  }
  #overlay button {
    margin-top: 8px;
    padding: 16px 32px;
    font-size: ${Math.max(fontSize, 20)}px;
    font-weight: 700;
    border-radius: 16px;
    border: none;
    background: ${colors.primary};
    color: #000;
    min-height: ${buttonSize}px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="hud">${scorePrefix}: <span id="score">0</span></div>
<div id="clicker-area">
  <div id="clicker-emoji">👆</div>
</div>
<div id="upgrades"></div>
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

  var state = 'playing';
  var score = 0;
  var perTap = 1;
  var autoRate = 0;
  var goal = __cfg.goal || 1000;

  var upgrades = [
    { id: 'tap1', label: '+1 за тап', cost: 10, effect: function() { perTap += 1; } },
    { id: 'tap5', label: '+5 за тап', cost: 50, effect: function() { perTap += 5; } },
    { id: 'auto', label: 'Авто-тап', cost: 25, effect: function() { autoRate += 0.5; } },
    { id: 'x2', label: 'x2', cost: 100, effect: function() { perTap *= 2; } },
  ];
  var bought = {};

  var scoreEl = document.getElementById('score');
  var area = document.getElementById('clicker-area');
  var emojiEl = document.getElementById('clicker-emoji');
  var upgradesEl = document.getElementById('upgrades');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  // Спрайт игрока из конфига
  if (__cfg.sprites && __cfg.sprites.player) {
    var sp = __cfg.sprites.player;
    if (sp.type === 'emoji' && sp.emoji) emojiEl.textContent = sp.emoji;
  }

  function reset() {
    score = 0;
    perTap = 1;
    autoRate = 0;
    bought = {};
    state = 'playing';
    scoreEl.textContent = '0';
    overlay.classList.remove('show');
    renderUpgrades();
  }

  function renderUpgrades() {
    upgradesEl.innerHTML = '';
    upgrades.forEach(function(u) {
      var b = document.createElement('button');
      b.className = 'upgrade-btn';
      b.textContent = u.label + ' · ' + u.cost;
      b.disabled = score < u.cost || bought[u.id];
      b.addEventListener('click', function(e) {
        e.stopPropagation();
        if (score < u.cost || bought[u.id]) return;
        score -= u.cost;
        u.effect();
        bought[u.id] = true;
        scoreEl.textContent = String(Math.floor(score));
        renderUpgrades();
        sound('tap');
        checkWin();
      });
      upgradesEl.appendChild(b);
    });
  }

  function tap(x, y) {
    if (state !== 'playing') return;
    score += perTap;
    scoreEl.textContent = String(Math.floor(score));
    emojiEl.classList.add('pressed');
    setTimeout(function() { emojiEl.classList.remove('pressed'); }, 80);
    sound('eat');
    renderUpgrades();
    checkWin();
  }

  area.addEventListener('click', function(e) { tap(e.clientX, e.clientY); });
  area.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    tap(t.clientX, t.clientY);
  }, { passive: false });

  function checkWin() {
    if (score >= goal && state === 'playing') {
      state = 'won';
      overlayTitle.textContent = (__cfg.texts && __cfg.texts.winTitle) || 'Победа!';
      overlayHint.textContent = 'Набрано ' + Math.floor(score);
      overlay.classList.add('show');
      sound('win');
    }
  }

  var startTs = performance.now();
  var lastAutoTick = 0;

  function loop(now) {
    if (!now) now = performance.now();
    var time = now - startTs;

    if (autoRate > 0 && state === 'playing' && now - lastAutoTick >= 1000) {
      lastAutoTick = now;
      score += autoRate;
      scoreEl.textContent = String(Math.floor(score));
      checkWin();
    }

    // Фон
    __drawBackground(ctx, __cfg.background, window.innerWidth, window.innerHeight, time);

    requestAnimationFrame(loop);
  }

  overlayBtn.addEventListener('click', function(e) { e.preventDefault(); reset(); });
  overlayBtn.addEventListener('touchstart', function(e) { e.preventDefault(); reset(); }, { passive: false });

  resize();
  window.addEventListener('resize', resize);
  renderUpgrades();
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
