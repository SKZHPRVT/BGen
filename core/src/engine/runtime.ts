/**
 * Общие runtime-функции для всех игровых шаблонов.
 *
 * Возвращают JS-строку, которая встраивается в HTML игры.
 * Гарантируют: canvas на весь экран, DPR, resize, input, state machine, audio.
 */

/**
 * Runtime canvas + DPR + resize.
 */
export const RUNTIME_CANVAS = `
function __initCanvas() {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var __dpr = window.devicePixelRatio || 1;
  function resize() {
    __dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * __dpr;
    canvas.height = window.innerHeight * __dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(__dpr, 0, 0, __dpr, 0, 0);
    if (typeof onResize === 'function') onResize(window.innerWidth, window.innerHeight);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function() { setTimeout(resize, 200); });
  return { canvas: canvas, ctx: ctx };
}
`;

/**
 * Runtime аудио через Web Audio API.
 * Только простые бипы — без файлов.
 */
export const RUNTIME_AUDIO = `
function __createAudio(enabled) {
  if (!enabled) return { play: function() {} };
  var ctxA = null;
  function ensure() {
    if (!ctxA) {
      try { ctxA = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    return ctxA;
  }
  return {
    play: function(type) {
      var ac = ensure();
      if (!ac) return;
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      var now = ac.currentTime;
      if (type === 'pop' || type === 'coin') {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.13);
      } else if (type === 'fail') {
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now); osc.stop(now + 0.36);
      } else if (type === 'soft') {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
      } else {
        // beep по умолчанию
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.11);
      }
    }
  };
}
`;

/**
 * Runtime tap/dir кнопок.
 * Возвращает хелпер, который вешает обработчики на 4 кнопки управления.
 */
export const RUNTIME_CONTROLS = `
function __bindControls(setDir) {
  var ids = ['btnLeft', 'btnUp', 'btnDown', 'btnRight'];
  var dirs = ['left', 'up', 'down', 'right'];
  for (var i = 0; i < ids.length; i++) {
    (function(id, dir) {
      var el = document.getElementById(id);
      if (!el) return;
      var handler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        setDir(dir);
      };
      el.addEventListener('touchstart', handler, { passive: false });
      el.addEventListener('mousedown', handler);
    })(ids[i], dirs[i]);
  }
}
`;

/**
 * Runtime клавиатуры + свайпов.
 * setDir('up'|'down'|'left'|'right') — колбэк.
 */
export const RUNTIME_INPUT = `
function __bindKeyboard(setDir) {
  document.addEventListener('keydown', function(e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') setDir('up');
    else if (k === 'ArrowDown' || k === 's' || k === 'S') setDir('down');
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') setDir('left');
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') setDir('right');
  });
}

function __bindSwipes(setDir) {
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
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'right' : 'left');
    else setDir(dy > 0 ? 'down' : 'up');
  }, { passive: true });
}
`;
