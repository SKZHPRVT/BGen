/**
 * Шаблон «2048».
 * Полностью наша механика: свайпы, слияния, победа/поражение.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, audioRuntime } from "../render/index.ts";

export function build2048Game(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, background } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Очки";

  const bgRuntime = backgroundRuntime();
  const audRuntime = audioRuntime();

  const runtimeConfig = { colors, texts, background, audio, fontSize };

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
    font-size: ${Math.max(fontSize + 8, 28)}px;
    font-weight: 800;
    color: ${colors.text};
    background: rgba(0,0,0,0.4);
    padding: 10px 24px;
    border-radius: 16px;
    z-index: 10;
    pointer-events: none;
  }
  #board {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 10px;
    width: min(92vw, 460px);
    height: min(92vw, 460px);
    padding: 12px;
    border-radius: 16px;
    background: ${colors.surface};
    z-index: 5;
    box-sizing: border-box;
  }
  .tile {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    color: #fff;
    font-size: ${Math.max(fontSize + 6, 26)}px;
    transition: background 0.15s, color 0.15s;
  }
  .tile[data-v="2"] { background: #eee4da; color: #776e65; }
  .tile[data-v="4"] { background: #ede0c8; color: #776e65; }
  .tile[data-v="8"] { background: #f2b179; color: #fff; }
  .tile[data-v="16"] { background: #f59563; color: #fff; }
  .tile[data-v="32"] { background: #f67c5f; color: #fff; }
  .tile[data-v="64"] { background: #f65e3b; color: #fff; }
  .tile[data-v="128"] { background: #edcf72; color: #fff; }
  .tile[data-v="256"] { background: #edcc61; color: #fff; }
  .tile[data-v="512"] { background: #edc850; color: #fff; }
  .tile[data-v="1024"] { background: #edc53f; color: #fff; font-size: ${Math.max(fontSize, 20)}px; }
  .tile[data-v="2048"] { background: #edc22e; color: #fff; font-size: ${Math.max(fontSize, 20)}px; }
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
  #overlay .title { font-size: ${Math.max(fontSize + 12, 32)}px; font-weight: 800; }
  #overlay button {
    margin-top: 8px;
    padding: 16px 32px;
    font-size: ${Math.max(fontSize, 20)}px;
    font-weight: 700;
    border-radius: 16px;
    border: none;
    background: ${colors.primary};
    color: #000;
    cursor: pointer;
  }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="hud">${scorePrefix}: <span id="score">0</span></div>
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

  var SIZE = 4;
  var grid = [];
  var score = 0;
  var state = 'playing';
  var won = false;

  function emptyGrid() {
    var g = [];
    for (var i = 0; i < SIZE; i++) {
      var row = [];
      for (var j = 0; j < SIZE; j++) row.push(0);
      g.push(row);
    }
    return g;
  }

  function addTile() {
    var empties = [];
    for (var i = 0; i < SIZE; i++)
      for (var j = 0; j < SIZE; j++)
        if (grid[i][j] === 0) empties.push({ i: i, j: j });
    if (empties.length === 0) return;
    var p = empties[Math.floor(Math.random() * empties.length)];
    grid[p.i][p.j] = Math.random() < 0.9 ? 2 : 4;
  }

  function reset() {
    grid = emptyGrid();
    score = 0;
    state = 'playing';
    won = false;
    scoreEl.textContent = '0';
    overlay.classList.remove('show');
    addTile();
    addTile();
    renderBoard();
  }

  function renderBoard() {
    board.innerHTML = '';
    for (var i = 0; i < SIZE; i++) {
      for (var j = 0; j < SIZE; j++) {
        var v = grid[i][j];
        var t = document.createElement('div');
        t.className = 'tile';
        if (v > 0) {
          t.dataset.v = String(v);
          t.textContent = String(v);
        }
        board.appendChild(t);
      }
    }
  }

  function slideRow(row) {
    var filtered = row.filter(function(v) { return v > 0; });
    var result = [];
    var gained = 0;
    for (var i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        var merged = filtered[i] * 2;
        result.push(merged);
        gained += merged;
        if (merged === 2048) won = true;
        i++;
      } else {
        result.push(filtered[i]);
      }
    }
    while (result.length < SIZE) result.push(0);
    return { row: result, gained: gained };
  }

  function move(dir) {
    if (state !== 'playing') return;
    var before = JSON.stringify(grid);
    var gained = 0;

    function processLine(line) {
      var r = slideRow(line);
      gained += r.gained;
      return r.row;
    }

    if (dir === 'left') {
      for (var i = 0; i < SIZE; i++) grid[i] = processLine(grid[i]);
    } else if (dir === 'right') {
      for (var i = 0; i < SIZE; i++) grid[i] = processLine(grid[i].slice().reverse()).reverse();
    } else if (dir === 'up') {
      for (var j = 0; j < SIZE; j++) {
        var col = [];
        for (var i = 0; i < SIZE; i++) col.push(grid[i][j]);
        var res = processLine(col);
        for (var i = 0; i < SIZE; i++) grid[i][j] = res[i];
      }
    } else if (dir === 'down') {
      for (var j = 0; j < SIZE; j++) {
        var col = [];
        for (var i = 0; i < SIZE; i++) col.push(grid[i][j]);
        var res = processLine(col.slice().reverse()).reverse();
        for (var i = 0; i < SIZE; i++) grid[i][j] = res[i];
      }
    }

    if (JSON.stringify(grid) !== before) {
      score += gained;
      scoreEl.textContent = String(score);
      if (gained > 0) sound('eat');
      addTile();
      renderBoard();
      if (won && !overlay.classList.contains('show')) {
        state = 'won';
        overlayTitle.textContent = (__cfg.texts && __cfg.texts.winTitle) || 'Победа!';
        overlayHint.textContent = 'Достигли 2048';
        overlay.classList.add('show');
        sound('win');
      } else if (isGameOver()) {
        state = 'gameover';
        overlayTitle.textContent = (__cfg.texts && __cfg.texts.gameOverTitle) || 'Игра окончена';
        overlayHint.textContent = 'Счёт: ' + score;
        overlay.classList.add('show');
        sound('gameOver');
      }
    }
  }

  function isGameOver() {
    for (var i = 0; i < SIZE; i++)
      for (var j = 0; j < SIZE; j++) {
        if (grid[i][j] === 0) return false;
        if (i + 1 < SIZE && grid[i][j] === grid[i + 1][j]) return false;
        if (j + 1 < SIZE && grid[i][j] === grid[i][j + 1]) return false;
      }
    return true;
  }

  // Управление свайпами
  var tx = 0, ty = 0, moved = false;
  document.addEventListener('touchstart', function(e) {
    if (!e.touches[0]) return;
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
    moved = false;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (moved) return;
    var t = e.touches[0];
    if (!t) return;
    var dx = t.clientX - tx;
    var dy = t.clientY - ty;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    moved = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') move('left');
    else if (e.key === 'ArrowRight' || e.key === 'd') move('right');
    else if (e.key === 'ArrowUp' || e.key === 'w') move('up');
    else if (e.key === 'ArrowDown' || e.key === 's') move('down');
  });

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
