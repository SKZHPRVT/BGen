/**
 * Шаблон «Memory» — найди пары.
 * Управление, коллизии, победа — наши. Меняются эмодзи, цвета, тексты.
 */
import type { GameConfig } from "../types.ts";
import { backgroundRuntime, backgroundCSS, audioRuntime } from "../render/index.ts";

export function buildMemoryGame(cfg: GameConfig): string {
  const { colors, texts, audio, fontSize, buttonSize, background } = cfg;
  const title = escapeHtml(cfg.title);
  const restartButton = texts?.restartButton ?? "Заново";
  const scorePrefix = texts?.scorePrefix ?? "Ходы";

  const bgRuntime = backgroundRuntime();
  const audRuntime = audioRuntime();

  // Эмодзи для карточек — из конфига или дефолт
  const emojiSet = pickEmojiSet(cfg);

  const runtimeConfig = { colors, texts, background, audio, emojiSet, fontSize, buttonSize };

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
    font-size: ${Math.max(fontSize + 4, 22)}px;
    font-weight: 700;
    color: ${colors.text};
    background: rgba(0,0,0,0.4);
    padding: 8px 20px;
    border-radius: 14px;
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
    gap: 10px;
    width: min(92vw, 420px);
    z-index: 5;
  }
  .card {
    aspect-ratio: 1;
    border-radius: 14px;
    background: ${colors.surface};
    border: 3px solid ${colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${Math.max(fontSize + 20, 40)}px;
    cursor: pointer;
    transition: transform 0.15s, background 0.2s;
    -webkit-tap-highlight-color: transparent;
    color: transparent;
  }
  .card.open {
    background: ${colors.primary};
    color: #fff;
    transform: scale(1.03);
  }
  .card.matched {
    background: ${colors.accent};
    color: #fff;
    opacity: 0.6;
    cursor: default;
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
  }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="hud">${scorePrefix}: <span id="moves">0</span></div>
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
  var movesEl = document.getElementById('moves');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayHint = document.getElementById('overlayHint');
  var overlayBtn = document.getElementById('overlayBtn');

  var deck = [];
  var moves = 0;
  var firstIdx = null;
  var secondIdx = null;
  var lock = false;
  var state = 'playing';

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function reset() {
    var pairs = __cfg.emojiSet.slice(0, 8);
    deck = shuffle(pairs.concat(pairs)).map(function(e) {
      return { emoji: e, open: false, matched: false };
    });
    moves = 0;
    movesEl.textContent = '0';
    firstIdx = null; secondIdx = null; lock = false;
    state = 'playing';
    overlay.classList.remove('show');
    renderBoard();
  }

  function renderBoard() {
    board.innerHTML = '';
    deck.forEach(function(card, idx) {
      var el = document.createElement('div');
      el.className = 'card';
      if (card.open) el.classList.add('open');
      if (card.matched) el.classList.add('matched');
      el.textContent = card.open || card.matched ? card.emoji : '?';
      if (!card.matched && !card.open && !lock) {
        el.addEventListener('click', function() { flip(idx); });
      }
      board.appendChild(el);
    });
  }

  function flip(idx) {
    if (lock) return;
    var card = deck[idx];
    if (card.open || card.matched) return;
    if (firstIdx === idx || secondIdx === idx) return;

    card.open = true;
    sound('tap');

    if (firstIdx === null) firstIdx = idx;
    else if (secondIdx === null) secondIdx = idx;

    renderBoard();

    if (firstIdx !== null && secondIdx !== null) {
      moves++;
      movesEl.textContent = String(moves);
      lock = true;
      var a = deck[firstIdx], b = deck[secondIdx];
      if (a.emoji === b.emoji) {
        setTimeout(function() {
          a.matched = true; b.matched = true;
          a.open = false; b.open = false;
          firstIdx = null; secondIdx = null; lock = false;
          renderBoard();
          sound('coin');
          checkWin();
        }, 300);
      } else {
        setTimeout(function() {
          a.open = false; b.open = false;
          firstIdx = null; secondIdx = null; lock = false;
          renderBoard();
        }, 900);
      }
    }
  }

  function checkWin() {
    var allMatched = deck.every(function(c) { return c.matched; });
    if (allMatched && state === 'playing') {
      state = 'won';
      overlayTitle.textContent = (__cfg.texts && __cfg.texts.winTitle) || 'Победа!';
      overlayHint.textContent = 'Ходов: ' + moves;
      overlay.classList.add('show');
      sound('win');
    }
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

function pickEmojiSet(cfg: GameConfig): string[] {
  // Если в конфиге есть эмодзи для еды — используем его как "тему"
  if (cfg.sprites?.food?.type === "emoji" && cfg.sprites.food.emoji) {
    const base = cfg.sprites.food.emoji;
    // 8 эмодзи одной темы — из дефолтного набора
    return ["🍎", "🍇", "🍊", "🍋", "🍒", "🥝", "🍓", "🍑"];
  }
  if (cfg.sprites?.player?.type === "emoji" && cfg.sprites.player.emoji) {
    return ["🐱", "🐶", "🐸", "🦊", "🐼", "🐨", "🐯", "🦁"];
  }
  return ["🍎", "🍇", "🍊", "🍋", "🍒", "🥝", "🍓", "🍑"];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
