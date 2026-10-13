/**
 * Web Audio — простые звуки без файлов.
 * Тип звука из конфига: pop, coin, beep, chime, click, fail, down, softFail, fanfare.
 */

export function audioRuntime(): string {
  return `
var __audioCtx = null;
var __audioEnabled = false;
var __audioVolume = 0.7;

function __initAudio(enabled, volume) {
  __audioEnabled = !!enabled;
  __audioVolume = typeof volume === 'number' ? volume : 0.7;
}

function __ensureAudio() {
  if (!__audioEnabled) return null;
  if (!__audioCtx) {
    try {
      __audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (__audioCtx.state === 'suspended') {
    __audioCtx.resume();
  }
  return __audioCtx;
}

function __playSound(type) {
  if (!__audioEnabled) return;
  var ac = __ensureAudio();
  if (!ac) return;

  var now = ac.currentTime;
  var osc = ac.createOscillator();
  var gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);

  var vol = __audioVolume;

  if (type === 'pop') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain.gain.setValueAtTime(0.15 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now); osc.stop(now + 0.13);
  } else if (type === 'coin') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(1046, now);
    osc.frequency.setValueAtTime(1318, now + 0.06);
    gain.gain.setValueAtTime(0.12 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.16);
  } else if (type === 'beep') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.1 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.09);
  } else if (type === 'chime') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046, now);
    osc.frequency.exponentialRampToValueAtTime(1568, now + 0.15);
    gain.gain.setValueAtTime(0.15 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.26);
  } else if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.06 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.start(now); osc.stop(now + 0.05);
  } else if (type === 'fail') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    gain.gain.setValueAtTime(0.2 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now); osc.stop(now + 0.41);
  } else if (type === 'down') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
    gain.gain.setValueAtTime(0.15 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now); osc.stop(now + 0.36);
  } else if (type === 'softFail') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
    gain.gain.setValueAtTime(0.1 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now); osc.stop(now + 0.36);
  } else if (type === 'fanfare') {
    // Три ноты
    var notes = [523, 659, 784, 1046];
    for (var i = 0; i < notes.length; i++) {
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(notes[i], now + i * 0.1);
      g.gain.setValueAtTime(0.001, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.15 * vol, now + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
      o.start(now + i * 0.1);
      o.stop(now + i * 0.1 + 0.25);
    }
    osc.disconnect();
  }
}
`;
}
