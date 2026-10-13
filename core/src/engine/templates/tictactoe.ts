/**
 * Шаблон «Крестики-нолики» — играй против AI.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, audioRuntime } from "../render/index.ts";

export function buildTicTacToeGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Счёт";

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
    touch-action: manipulation; overscroll-behavior: none;
    user-select: none; -webkit-user-select: none;
    ${backgroundCSS(background, colors.background)}
  }
  canvas { display: block; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
  #hud {
    position: fixed; top: calc(env(safe-area-inset-top, 0px) + 16px);
    left: 50%; transform: translateX(-50%);
    font-size: ${Math.max(fontSize + 4, 22)}px; font-weight: 800;
    color: ${colors.text}; background: ${colors.surface};
    padding: 10px 22px; border-radius: 14px; z-index: 10;
    pointer-events: none; border: 2px solid ${colors.primary};
  }
  #board {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    width: min(88vw, 400px);
    height: min(88vw, 400px);
    z-index: 5;
  }
  .cell {
    display: flex; align-items: center; justify-content: center;
    background: ${colors.surface};
    border: 4px solid ${colors.primary};
    border-radius: 16px;
    font-size: ${Math.max(fontSize + 40, 64)}px;
    font-weight: 800;
    color: ${colors.primary};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s, background 0.2s;
  }
  .cell:active:not(.filled) { transform: scale(0.95); }
  .cell.filled { cursor: default; }
  .cell.x { color: ${colors.primary}; }
  .cell.o { color: ${colors.accent}; }
  #overlay {
    position: fixed; inset: 0; display: none;
    flex-direction: column; align-items: center; justify-content: center;
    gap: 20px; background: rgba(0,0,0,0.75); color: #fff; text-align: center;
    padding: 24px; z-index: 30;
  }
  #overlay.show { display: flex; }
  #overlay .title { font-size: ${Math.max(fontSize + 10, 32)}px; font-weight: 800; }
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
  <span style="color:${colors.primary}">✕ Ты</span> · <span style="color:${colors.accent}">◯ AI</span> · Ходы: <span id="score">0</span>
</div>
<div id="board"></div>
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

  var board = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  var grid = ['','','','','','','','',''];
  var moves = 0;
  var state = 'playing';

  function reset() {
    grid = ['','','','','','','','',''];
    moves = 0;
    scoreEl.textContent = '0';
    state = 'playing';
    overlay.classList.remove('show');
    render();
  }

  function render() {
    board.innerHTML = '';
    grid.forEach(function(v, i) {
      var el = document.createElement('div');
      el.className = 'cell' + (v ? ' filled ' + v.toLowerCase() : '');
      el.textContent = v === 'X' ? '✕' : v === 'O' ? '◯' : '';
      if (!v && state === 'playing') {
        el.addEventListener('click', function() { playerMove(i); });
      }
      board.appendChild(el);
    });
  }

  function playerMove(i) {
    if (state !== 'playing' || grid[i]) return;
    grid[i] = 'X';
    moves++;
    scoreEl.textContent = String(moves);
    sound('tap');
    render();

    var w = checkWin();
    if (w) return finish(w);
    if (moves >= 9) return finish('draw');

    setTimeout(aiMove, 400);
  }

  function aiMove() {
    if (state !== 'playing') return;

    // Простая эвристика: 1) выиграть, 2) блокировать, 3) центр, 4) угол, 5) любая
    var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var o = 0, e = 0, emptyIdx = -1;
      for (var j = 0; j < 3; j++) {
        if (grid[l[j]] === 'O') o++;
        else if (!grid[l[j]]) { e++; emptyIdx = l[j]; }
      }
      if (o === 2 && e === 1) { grid[emptyIdx] = 'O'; return afterAI(); }
    }
    for (var i2 = 0; i2 < lines.length; i2++) {
      var l2 = lines[i2];
      var x = 0, e2 = 0, emptyIdx2 = -1;
      for (var j2 = 0; j2 < 3; j2++) {
        if (grid[l2[j2]] === 'X') x++;
        else if (!grid[l2[j2]]) { e2++; emptyIdx2 = l2[j2]; }
      }
      if (x === 2 && e2 === 1) { grid[emptyIdx2] = 'O'; return afterAI(); }
    }
    if (!grid[4]) { grid[4] = 'O'; return afterAI(); }
    var corners = [0, 2, 6, 8];
    for (var c = 0; c < 4; c++) {
      if (!grid[corners[c]]) { grid[corners[c]] = 'O'; return afterAI(); }
    }
    for (var k = 0; k < 9; k++) {
      if (!grid[k]) { grid[k] = 'O'; return afterAI(); }
    }
  }

  function afterAI() {
    moves++;
    scoreEl.textContent = String(moves);
    sound('beep');
    render();
    var w = checkWin();
    if (w) return finish(w);
    if (moves >= 9) return finish('draw');
  }

  function checkWin() {
    var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (grid[l[0]] && grid[l[0]] === grid[l[1]] && grid[l[1]] === grid[l[2]]) {
        return grid[l[0]];
      }
    }
    return null;
  }

  function finish(result) {
    state = 'over';
    if (result === 'X') {
      overlayTitle.textContent = (__cfg.texts && __cfg.texts.winTitle) || 'Победа!';
      overlayHint.textContent = 'Ты обыграл AI за ' + moves + ' ходов';
      sound('win');
    } else if (result === 'O') {
      overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Поражение';
      overlayHint.textContent = 'AI оказался умнее';
      sound('gameOver');
    } else {
      overlayTitle.textContent = 'Ничья';
      overlayHint.textContent = 'Хорошая партия';
      sound('down');
    }
    overlay.classList.add('show');
  }

  var startTs = performance.now();
  function loop(now) {
    if (!now) now = performance.now();
    __drawBackground(ctx, __cfg.background, window.innerWidth, window.innerHeight, now - startTs);
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
