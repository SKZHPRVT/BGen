/**
 * Web Audio — простые звуки без файлов.
 * Усилено: авто-resume, громкость, разблокировка по первому касанию.
 */

export function audioRuntime(): string {
  return `
var __audioCtx = null;
var __audioEnabled = false;
var __audioVolume = 0.7;
var __audioUnlocked = false;

function __initAudio(enabled, volume) {
  __audioEnabled = !!enabled;
  __audioVolume = typeof volume === 'number' ? volume : 0.7;

  // Разблокируем AudioContext при первом user gesture
  if (__audioEnabled) {
    var unlock = function() {
      var ac = __ensureAudio();
      if (ac) {
        if (ac.state === 'suspended') {
          ac.resume().then(function() { __audioUnlocked = true; }).catch(function(){});
        } else {
          __audioUnlocked = true;
        }
      }
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }
}

function __ensureAudio() {
  if (!__audioEnabled) return null;
  if (!__audioCtx) {
    try {
      __audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (__audioCtx.state === 'suspended') {
    __audioCtx.resume().catch(function(){});
  }
  return __audioCtx;
}

function __playSound(type) {
  if (!__audioEnabled) return;
  var ac = __ensureAudio();
  if (!ac) return;
  if (ac.state === 'suspended') {
    ac.resume().catch(function(){});
  }

  var now = ac.currentTime;
  var vol = __audioVolume;

  try {
    if (type === 'pop') {
      var osc1 = ac.createOscillator();
      var gain1 = ac.createGain();
      osc1.connect(gain1); gain1.connect(ac.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain1.gain.setValueAtTime(0.25 * vol, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now); osc1.stop(now + 0.16);
    } else if (type === 'coin') {
      var osc2 = ac.createOscillator();
      var gain2 = ac.createGain();
      osc2.connect(gain2); gain2.connect(ac.destination);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1046, now);
      osc2.frequency.setValueAtTime(1318, now + 0.06);
      gain2.gain.setValueAtTime(0.2 * vol, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.start(now); osc2.stop(now + 0.19);
    } else if (type === 'beep') {
      var osc3 = ac.createOscillator();
      var gain3 = ac.createGain();
      osc3.connect(gain3); gain3.connect(ac.destination);
      osc3.type = 'square';
      osc3.frequency.setValueAtTime(660, now);
      gain3.gain.setValueAtTime(0.18 * vol, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc3.start(now); osc3.stop(now + 0.11);
    } else if (type === 'chime') {
      var notes = [1046, 1318, 1568];
      for (var ci = 0; ci < notes.length; ci++) {
        var osc4 = ac.createOscillator();
        var gain4 = ac.createGain();
        osc4.connect(gain4); gain4.connect(ac.destination);
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(notes[ci], now + ci * 0.05);
        gain4.gain.setValueAtTime(0.001, now + ci * 0.05);
        gain4.gain.linearRampToValueAtTime(0.22 * vol, now + ci * 0.05 + 0.02);
        gain4.gain.exponentialRampToValueAtTime(0.001, now + ci * 0.05 + 0.25);
        osc4.start(now + ci * 0.05);
        osc4.stop(now + ci * 0.05 + 0.3);
      }
    } else if (type === 'click') {
      var osc5 = ac.createOscillator();
      var gain5 = ac.createGain();
      osc5.connect(gain5); gain5.connect(ac.destination);
      osc5.type = 'square';
      osc5.frequency.setValueAtTime(440, now);
      gain5.gain.setValueAtTime(0.12 * vol, now);
      gain5.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc5.start(now); osc5.stop(now + 0.06);
    } else if (type === 'fail') {
      var osc6 = ac.createOscillator();
      var gain6 = ac.createGain();
      osc6.connect(gain6); gain6.connect(ac.destination);
      osc6.type = 'sawtooth';
      osc6.frequency.setValueAtTime(220, now);
      osc6.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      gain6.gain.setValueAtTime(0.3 * vol, now);
      gain6.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc6.start(now); osc6.stop(now + 0.46);
    } else if (type === 'down') {
      var osc7 = ac.createOscillator();
      var gain7 = ac.createGain();
      osc7.connect(gain7); gain7.connect(ac.destination);
      osc7.type = 'triangle';
      osc7.frequency.setValueAtTime(440, now);
      osc7.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      gain7.gain.setValueAtTime(0.25 * vol, now);
      gain7.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc7.start(now); osc7.stop(now + 0.41);
    } else if (type === 'softFail') {
      var osc8 = ac.createOscillator();
      var gain8 = ac.createGain();
      osc8.connect(gain8); gain8.connect(ac.destination);
      osc8.type = 'sine';
      osc8.frequency.setValueAtTime(330, now);
      osc8.frequency.exponentialRampToValueAtTime(220, now + 0.3);
      gain8.gain.setValueAtTime(0.18 * vol, now);
      gain8.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc8.start(now); osc8.stop(now + 0.36);
    } else if (type === 'fanfare') {
      var notes2 = [523, 659, 784, 1046];
      for (var fi = 0; fi < notes2.length; fi++) {
        var osc9 = ac.createOscillator();
        var gain9 = ac.createGain();
        osc9.connect(gain9); gain9.connect(ac.destination);
        osc9.type = 'sine';
        osc9.frequency.setValueAtTime(notes2[fi], now + fi * 0.12);
        gain9.gain.setValueAtTime(0.001, now + fi * 0.12);
        gain9.gain.linearRampToValueAtTime(0.22 * vol, now + fi * 0.12 + 0.02);
        gain9.gain.exponentialRampToValueAtTime(0.001, now + fi * 0.12 + 0.22);
        osc9.start(now + fi * 0.12);
        osc9.stop(now + fi * 0.12 + 0.28);
      }
    }
  } catch (e) { /* ignore */ }
}
`;
}
