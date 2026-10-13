/**
 * Шаблон игры «Змейка».
 * Управление, физика, коллизии — наши. Меняются только цвета, скорость, эмодзи.
 */
import type { GameConfig } from "../types.ts";

export function buildSnakeGame(cfg: GameConfig): string {
  const { colors, texts, emojis, audio, speed, fontSize, buttonSize } = cfg;
  const gridSize = cfg.gridSize ?? 18;
  const title = escapeHtml(cfg.title);
  const startHint = texts?.startHint ?? "Тапни чтобы начать";
  const gameOverTitle = texts?.gameOverTitle ?? "Игра окончена";
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Счёт";
  const audioEnabled = audio?.enabled === true;
  const eatSound = audio?.onEat ?? "pop";
  const overSound = audio?.onGameOver ?? "fail";
  const foodEmoji = emojis?.food ?? "";
  const playerEmoji = emojis?.player ?? "";

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
    background: ${colors.background};
    color: ${colors.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    touch-action: none; overscroll-behavior: none;
    user-select: none; -webkit-user-select: none;
  }
  canvas {
    display: block; position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: ${colors.background};
  }
  #hud {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 16px);
    left: 50%;
    transform: translateX(-50%);
    font-size: ${Math.max(fontSize, 20)}px;
    font-weight: 700;
    color: ${colors.text};
    background: rgba(0,0,0,0.35);
    padding: 8px 20px;
    border-radius: 14px;
    z-index: 10;
    pointer-events: none;
  }
  #controls {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 14px;
    z-index: 10;
  }
  #controls button {
    width: ${buttonSize}px;
    height: ${buttonSize}px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.15);
    color: #fff;
    font-size: ${Math.round(buttonSize * 0.45)}px;
    font-weight: bold;
    touch-action: manipulation;
    user-select: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
  }
  #controls button:active {
    background: ${colors.primary};
    transform: scale(0.92);
  }
  #overlay {
    position: fixed; inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: rgba(0,0,0,0.75);
    color: #fff;
    text-align: center;
    padding: 24px;
    z-index: 30;
    display: none;
  }
  #overlay.show { display: flex; }
  #overlay .title {
    font-size: ${Math.max(fontSize + 10, 28)}px;
    font-weight: 800;
  }
  #overlay .hint {
    font-size: ${fontSize}px;
    opacity: 0.8;
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
    min-width: 180px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  #overlay button:active {
    transform: scale(0.96);
  }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="hud">${scorePrefix}: <span id="score">0</span></div>
<div id="controls">
  <button id="btnLeft" aria-label="Влево">◀</button>
  <button id="btnUp" aria-label="Вверх">▲</button>
  <button id="btnDown" aria-label="Вниз">▼</button>
  <button id="btnRight" aria-label="Вправо">▶</button>
</div>
<div id="overlay">
  <div class="title" id="overlayTitle">${gameOverTitle}</div>
  <div class="hint" id="overlayHint"></div>
  <button id="overlayBtn">${restartButton}</button>
</div>
<script>
(function() {
  var __ctx = ${JSON.stringify({
    speed,
    gridSize,
    colors,
    texts,
    audioEnabled,
    eatSound,
    overSound,
    foodEmoji,
    playerEmoji,
  })};

  // ==== CANVAS ====
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeGrid();
  }

  var CELL = 20;
  var COLS = 0, ROWS = 0, OFF_X = 0, OFF_Y = 0;

  function computeGrid() {
    var W = window.innerWidth;
    var H = window.innerHeight;
    var topPad = 70;
    var botPad = 130;
    var availH = Math.max(200, H - topPad - botPad);
    var size = Math.min(W, availH);
    COLS = __ctx.gridSize;
    ROWS = Math.floor(COLS * availH / size) || __ctx.gridSize;
    CELL = Math.floor(Math.min(W / COLS, availH / ROWS));
    OFF_X = Math.floor((W - CELL * COLS) / 2);
    OFF_Y = topPad + Math.floor((availH - CELL * ROWS) / 2);
  }

  // ==== AUDIO ====
  var audioCtx = null;
  function ensureAudio() {
    if (!__ctx.audioEnabled) return null;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    return audioCtx;
  }
  function playSound(kind) {
    if (!__ctx.audioEnabled) return;
    var ac = ensureAudio();
    if (!ac) return;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    var now = ac.currentTime;
    if (kind === 'pop' || kind === 'coin' || kind === 'beep') {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now); osc.stop(now + 0.13);
    } else if (kind === 'fail') {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.36);
    } else if (kind === 'soft') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now); osc.stop(now + 0.22);
    }
  }

  // ==== STATE ====
  var state = 'start';
  var snake = [];
  var dir = { x: 1, y: 0 };
  var pendingDir = { x: 1, y: 0 };
  var food = { x: 0, y: 0 };
  var score = 0;
  var lastMove = 0;
  var speedMs = __ctx.speed;

  var scoreEl = document.getElementById('score');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  function reset() {
    snake = [
      { x: 3, y: Math.floor(ROWS / 2) },
      { x: 2, y: Math.floor(ROWS / 2) },
      { x: 1, y: Math.floor(ROWS / 2) },
    ];
    dir = { x: 1, y: 0 };
    pendingDir = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = '0';
    lastMove = 0;
    placeFood();
    state = 'playing';
    overlay.classList.remove('show');
  }

  function placeFood() {
    var attempts = 0;
    while (attempts < 200) {
      var fx = Math.floor(Math.random() * COLS);
      var fy = Math.floor(Math.random() * ROWS);
      var taken = false;
      for (var i = 0; i < snake.length; i++) {
        if (snake[i].x === fx && snake[i].y === fy) { taken = true; break; }
      }
      if (!taken) { food = { x: fx, y: fy }; return; }
      attempts++;
    }
  }

  function setDir(name) {
    if (state !== 'playing') return;
    var nx = 0, ny = 0;
    if (name === 'up') ny = -1;
    else if (name === 'down') ny = 1;
    else if (name === 'left') nx = -1;
    else if (name === 'right') nx = 1;
    else return;
    // нельзя на 180°
    if (dir.x === -nx && dir.y === -ny) return;
    pendingDir = { x: nx, y: ny };
  }

  function step() {
    dir = pendingDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // столкновение со стеной
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      return gameOver();
    }
    // столкновение с хвостом
    for (var i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return gameOver();
      }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = String(score);
      playSound(__ctx.eatSound);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    state = 'gameover';
    overlayTitle.textContent = ${JSON.stringify(gameOverTitle)};
    overlayHint.textContent = ${JSON.stringify(scorePrefix)} + ': ' + score;
    overlay.classList.add('show');
    playSound(__ctx.overSound);
  }

  function render() {
    var W = window.innerWidth;
    var H = window.innerHeight;
    ctx.fillStyle = __ctx.colors.background;
    ctx.fillRect(0, 0, W, H);

    // игровое поле
    ctx.fillStyle = __ctx.colors.surface;
    ctx.fillRect(OFF_X, OFF_Y, CELL * COLS, CELL * ROWS);

    // сетка
    if (__ctx.colors.grid) {
      ctx.strokeStyle = __ctx.colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i <= COLS; i++) {
        ctx.moveTo(OFF_X + i * CELL, OFF_Y);
        ctx.lineTo(OFF_X + i * CELL, OFF_Y + ROWS * CELL);
      }
      for (var j = 0; j <= ROWS; j++) {
        ctx.moveTo(OFF_X, OFF_Y + j * CELL);
        ctx.lineTo(OFF_X + COLS * CELL, OFF_Y + j * CELL);
      }
      ctx.stroke();
    }

    // еда
    var fx = OFF_X + food.x * CELL;
    var fy = OFF_Y + food.y * CELL;
    if (__ctx.foodEmoji) {
      ctx.font = Math.round(CELL * 0.9) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(__ctx.foodEmoji, fx + CELL / 2, fy + CELL / 2);
    } else {
      ctx.fillStyle = __ctx.colors.accent;
      ctx.beginPath();
      ctx.arc(fx + CELL / 2, fy + CELL / 2, CELL * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // змейка
    for (var k = 0; k < snake.length; k++) {
      var sx = OFF_X + snake[k].x * CELL;
      var sy = OFF_Y + snake[k].y * CELL;
      var isHead = k === 0;
      var fill = isHead ? __ctx.colors.primary : __ctx.colors.primary + 'cc';
      if (__ctx.playerEmoji && isHead) {
        ctx.font = Math.round(CELL * 0.9) + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(__ctx.playerEmoji, sx + CELL / 2, sy + CELL / 2);
      } else {
        ctx.fillStyle = fill;
        ctx.fillRect(sx + 1, sy + 1, CELL - 2, CELL - 2);
      }
    }

    if (state === 'start') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(Math.max(20, CELL * 0.9)) + 'px sans-serif';
      ctx.fillText(${JSON.stringify(startHint)}, W / 2, H / 2);
    }
  }

  var lastFrame = 0;
  function loop(now) {
    if (!now) now = performance.now();
    if (state === 'playing' && now - lastMove >= speedMs) {
      lastMove = now;
      step();
    }
    render();
    requestAnimationFrame(loop);
  }

  // ==== INPUT ====
  function bindDir(dirName) {
    var el = document.getElementById('btn' + dirName.charAt(0).toUpperCase() + dirName.slice(1));
    if (!el) return;
    var handler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      setDir(dirName);
    };
    el.addEventListener('touchstart', handler, { passive: false });
    el.addEventListener('mousedown', handler);
  }
  bindDir('left');
  bindDir('up');
  bindDir('down');
  bindDir('right');

  document.addEventListener('keydown', function(e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') setDir('up');
    else if (k === 'ArrowDown' || k === 's' || k === 'S') setDir('down');
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') setDir('left');
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') setDir('right');
  });

  var tx = 0, ty = 0;
  document.addEventListener('touchstart', function(e) {
    if (!e.touches[0]) return;
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function(e) {
    var t = e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      // тап — старт, если ещё не играем
      if (state === 'start') reset();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'right' : 'left');
    else setDir(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  canvas.addEventListener('click', function() {
    if (state === 'start') reset();
  });

  overlayBtn.addEventListener('click', function(e) {
    e.preventDefault();
    reset();
  });
  overlayBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    reset();
  }, { passive: false });

  // ==== INIT ====
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function() { setTimeout(resize, 200); });
  placeFood();
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
