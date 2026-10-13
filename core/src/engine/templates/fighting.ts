/**
 * Шаблон «Файтинг» — бей противника тапами.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, audioRuntime } from "../render/index.ts";

export function buildFightingGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "HP";

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
    display: flex; gap: 20px;
  }
  #hud .you { color: ${colors.primary}; }
  #hud .enemy { color: ${colors.accent}; }
  #actions {
    position: fixed; bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    left: 12px; right: 12px;
    display: flex; gap: 12px; justify-content: center; z-index: 10;
  }
  .action {
    padding: 18px 20px; font-size: ${Math.max(fontSize + 2, 18)}px;
    font-weight: 800; border-radius: 16px;
    border: 3px solid ${colors.primary}; background: ${colors.surface};
    color: ${colors.text}; cursor: pointer; font-family: inherit;
    min-height: ${Math.max(buttonSize, 72)}px; min-width: 100px;
    -webkit-tap-highlight-color: transparent;
    flex: 1; max-width: 140px;
  }
  .action:active { background: ${colors.primary}; color: #fff; transform: scale(0.95); }
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
<div id="hud">
  <span class="you">🛡️ <span id="playerHp">100</span></span>
  <span class="enemy">👹 <span id="enemyHp">100</span></span>
</div>
<div id="actions">
  <button class="action" id="punchBtn">👊 Удар</button>
  <button class="action" id="kickBtn">🦵 Пинок</button>
  <button class="action" id="healBtn">💚 Лечить</button>
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

  var playerHp = 100;
  var enemyHp = 100;
  var playerAnim = 0;
  var enemyAnim = 0;
  var state = 'playing';
  var playerHeals = 3;
  var enemyTurnTimer = 0;
  var lastTick = 0;

  var playerHpEl = document.getElementById('playerHp');
  var enemyHpEl = document.getElementById('enemyHp');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function reset() {
    playerHp = 100;
    enemyHp = 100;
    playerHeals = 3;
    state = 'playing';
    enemyTurnTimer = 0;
    playerHpEl.textContent = '100';
    enemyHpEl.textContent = '100';
    overlay.classList.remove('show');
  }

  function updateHud() {
    playerHpEl.textContent = String(Math.max(0, Math.round(playerHp)));
    enemyHpEl.textContent = String(Math.max(0, Math.round(enemyHp)));
  }

  function playerAttack(kind) {
    if (state !== 'playing') return;
    var dmg = kind === 'kick' ? 18 : 12;
    if (Math.random() < 0.15) dmg = 0; // промах
    enemyHp -= dmg;
    updateHud();
    playerAnim = 1;
    sound('tap');
    enemyTurnTimer = 500;
    checkState();
  }

  function playerHeal() {
    if (state !== 'playing' || playerHeals <= 0) return;
    playerHeals--;
    playerHp = Math.min(100, playerHp + 30);
    updateHud();
    sound('coin');
    enemyTurnTimer = 500;
    checkState();
  }

  function enemyTurn() {
    if (state !== 'playing') return;
    var dmg = 8 + Math.random() * 10;
    playerHp -= dmg;
    updateHud();
    enemyAnim = 1;
    sound('fail');
    checkState();
  }

  function checkState() {
    if (enemyHp <= 0) {
      state = 'won';
      overlayTitle.textContent = (__cfg.texts && __cfg.texts.winTitle) || 'Победа!';
      overlayHint.textContent = 'Враг повержен';
      overlay.classList.add('show');
      sound('win');
    } else if (playerHp <= 0) {
      state = 'gameover';
      overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Поражение';
      overlayHint.textContent = 'Ты проиграл';
      overlay.classList.add('show');
      sound('gameOver');
    }
  }

  document.getElementById('punchBtn').addEventListener('click', function(e) { e.preventDefault(); playerAttack('punch'); });
  document.getElementById('punchBtn').addEventListener('touchstart', function(e) { e.preventDefault(); playerAttack('punch'); }, { passive: false });
  document.getElementById('kickBtn').addEventListener('click', function(e) { e.preventDefault(); playerAttack('kick'); });
  document.getElementById('kickBtn').addEventListener('touchstart', function(e) { e.preventDefault(); playerAttack('kick'); }, { passive: false });
  document.getElementById('healBtn').addEventListener('click', function(e) { e.preventDefault(); playerHeal(); });
  document.getElementById('healBtn').addEventListener('touchstart', function(e) { e.preventDefault(); playerHeal(); }, { passive: false });

  document.addEventListener('keydown', function(e) {
    if (e.key === '1' || e.key === 'a') playerAttack('punch');
    else if (e.key === '2' || e.key === 's') playerAttack('kick');
    else if (e.key === '3' || e.key === 'd') playerHeal();
  });

  function drawFighter(x, y, size, hp, isEnemy, anim) {
    ctx.save();
    ctx.translate(x, y);
    if (anim > 0) ctx.translate(0, -anim * size * 0.2);

    // Тело
    ctx.fillStyle = isEnemy ? __cfg.colors.accent : __cfg.colors.primary;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    var sp = isEnemy ? (__cfg.sprites && __cfg.sprites.obstacle) : (__cfg.sprites && __cfg.sprites.player);
    var emoji = sp && sp.type === 'emoji' && sp.emoji ? sp.emoji : (isEnemy ? '👹' : '🥷');
    ctx.font = Math.round(size * 0.9) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);

    // HP bar
    var barW = size;
    var barH = 8;
    var barY = -size * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    ctx.fillStyle = hp > 50 ? '#4f8' : hp > 25 ? '#fa0' : '#e33';
    ctx.fillRect(-barW / 2, barY, barW * Math.max(0, hp / 100), barH);

    ctx.restore();
  }

  var startTs = performance.now();

  function render() {
    var W = window.innerWidth, H = window.innerHeight;
    var time = performance.now() - startTs;
    __drawBackground(ctx, __cfg.background, W, H, time);

    var size = Math.min(W, H) * 0.25;
    var groundY = H * 0.55;

    // Земля
    ctx.fillStyle = __cfg.colors.surface;
    ctx.fillRect(0, groundY, W, H - groundY);

    drawFighter(W * 0.25, groundY - size / 2, size, playerHp, false, playerAnim);
    drawFighter(W * 0.75, groundY - size / 2, size, enemyHp, true, enemyAnim);
  }

  function loop(now) {
    if (!now) now = performance.now();
    var dt = now - lastTick;
    if (dt > 100) dt = 100;
    lastTick = now;

    if (state === 'playing') {
      if (enemyTurnTimer > 0) {
        enemyTurnTimer -= dt;
        if (enemyTurnTimer <= 0) enemyTurn();
      } else if (Math.random() < 0.003) {
        enemyTurn();
      }
    }

    if (playerAnim > 0) playerAnim = Math.max(0, playerAnim - dt / 200);
    if (enemyAnim > 0) enemyAnim = Math.max(0, enemyAnim - dt / 200);

    render();
    requestAnimationFrame(loop);
  }

  overlayBtn.addEventListener('click', function(e) { e.preventDefault(); reset(); });
  overlayBtn.addEventListener('touchstart', function(e) { e.preventDefault(); reset(); }, { passive: false });

  resize();
  window.addEventListener('resize', resize);
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
