/**
 * Солонка — панель управления поверх игры.
 * Показывается когда активен экран game.
 * Отправляет postMessage внутрь iframe игры.
 *
 * Схема:
 *   ◀ ▲ ▼ ▶ (directional)  |  [Тап] (для кликеров)  |  ⟳ (рестарт)
 *
 * Всегда 4 стрелки + опционально Тап. Рестарт — отдельно.
 */

export interface GameControlsCallbacks {
  onRestart: () => void;
}

export interface GameControlsElements {
  root: HTMLElement;
  left: HTMLButtonElement;
  up: HTMLButtonElement;
  down: HTMLButtonElement;
  right: HTMLButtonElement;
  tap: HTMLButtonElement;
  restart: HTMLButtonElement;
  hide: () => void;
  show: () => void;
  setMode: (mode: 'directional' | 'tap' | 'both') => void;
}

let currentGameFrame: HTMLIFrameElement | null = null;

/** Отправить команду в iframe игры */
export function sendGameInput(action: string): void {
  if (!currentGameFrame?.contentWindow) return;
  try {
    currentGameFrame.contentWindow.postMessage(
      { type: 'bgen:input', action },
      '*',
    );
  } catch (e) {
    console.warn('[gameControls] postMessage failed', e);
  }
}

export function mountGameControls(callbacks: GameControlsCallbacks): GameControlsElements | null {
  const root = document.getElementById('gameControls') as HTMLElement | null;
  const left = document.getElementById('ctrlLeft') as HTMLButtonElement | null;
  const up = document.getElementById('ctrlUp') as HTMLButtonElement | null;
  const down = document.getElementById('ctrlDown') as HTMLButtonElement | null;
  const right = document.getElementById('ctrlRight') as HTMLButtonElement | null;
  const tap = document.getElementById('ctrlTap') as HTMLButtonElement | null;
  const restart = document.getElementById('ctrlRestart') as HTMLButtonElement | null;

  if (!root || !left || !up || !down || !right || !tap || !restart) {
    console.warn('[gameControls] missing DOM elements');
    return null;
  }

  // Кнопки направления
  left.addEventListener('click', () => sendGameInput('left'));
  up.addEventListener('click', () => sendGameInput('up'));
  down.addEventListener('click', () => sendGameInput('down'));
  right.addEventListener('click', () => sendGameInput('right'));
  tap.addEventListener('click', () => sendGameInput('tap'));
  restart.addEventListener('click', () => {
    sendGameInput('restart');
    callbacks.onRestart();
  });

  // Touch для мгновенного отклика (не ждём 300ms click delay)
  const touchHandlers: Array<[HTMLButtonElement, string]> = [
    [left, 'left'],
    [up, 'up'],
    [down, 'down'],
    [right, 'right'],
    [tap, 'tap'],
  ];

  for (const [btn, action] of touchHandlers) {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      sendGameInput(action);
    }, { passive: false });
  }

  function hide(): void {
    root!.style.display = 'none';
  }

  function show(): void {
    root!.style.display = 'flex';
  }

  function setMode(mode: 'directional' | 'tap' | 'both'): void {
    if (mode === 'directional') {
      root!.classList.remove('has-tap');
      root!.classList.add('has-dpad');
    } else if (mode === 'tap') {
      root!.classList.remove('has-dpad');
      root!.classList.add('has-tap');
    } else {
      root!.classList.add('has-dpad');
      root!.classList.add('has-tap');
    }
  }

  return { root, left, up, down, right, tap, restart, hide, show, setMode };
}

/** Устанавливает iframe, в который слать postMessage */
export function setGameFrame(frame: HTMLIFrameElement): void {
  currentGameFrame = frame;
}

/**
 * Определяет нужный режим управления по жанру игры.
 */
export function pickControlsMode(genre: string): 'directional' | 'tap' | 'both' {
  switch (genre) {
    case 'clicker':
    case 'tower':
    case 'memory':
    case 'puzzle':
      return 'tap';
    case 'snake':
    case 'runner':
    case 'platformer':
    case 'breakout':
    case '2048':
    case 'shooter':
      return 'directional';
    default:
      return 'both';
  }
}
