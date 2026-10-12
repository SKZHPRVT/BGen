export interface MiniAst {
  hasCanvas: boolean;
  hasRequestAnimationFrame: boolean;
  hasSetInterval: boolean;
  hasKeydown: boolean;
  hasTouch: boolean;
  hasMouse: boolean;
  hasResize: boolean;
  hasStateMachine: boolean;
  hasRestart: boolean;
  hasWinLose: boolean;
  hasScore: boolean;
  hasLocalStorage: boolean;
  hasViewportMeta: boolean;
  hasInlineScript: boolean;
  scriptCount: number;
  styleCount: number;
  lineCount: number;
  charCount: number;
  states: string[];
}

const STATE_WORDS = [
  "start", "menu", "playing", "play", "running",
  "gameover", "game_over", "game-over", "win", "won",
  "lose", "lost", "dead", "paused", "victory",
];

export function buildMiniAst(html: string): MiniAst {
  const lower = html.toLowerCase();
  const states = STATE_WORDS.filter((s) =>
    new RegExp(`['"\`]${s}['"\`]`, "i").test(html),
  );

  return {
    hasCanvas: /<canvas[\s>]/i.test(html),
    hasRequestAnimationFrame: /requestAnimationFrame\s*\(/.test(html),
    hasSetInterval: /setInterval\s*\(/.test(html),
    hasKeydown: /addEventListener\s*\(\s*['"`]key(down|up)/.test(html),
    hasTouch: /addEventListener\s*\(\s*['"`](touchstart|touchmove|touchend)/.test(html),
    hasMouse: /addEventListener\s*\(\s*['"`](click|mousedown|pointerdown)/.test(html),
    hasResize:
      /addEventListener\s*\(\s*['"`]resize/.test(html) ||
      /innerWidth/.test(html) ||
      /clientWidth/.test(html),
    hasStateMachine: states.length >= 2,
    hasRestart:
      /(restart|reset|replay|заново|перезапуск)/i.test(html) ||
      states.includes("start"),
    hasWinLose:
      /(gameover|game over|victory|you win|победа|проигрыш|выиграл|проиграл)/i.test(lower),
    hasScore: /(score|счёт|счет|очк)/i.test(lower),
    hasLocalStorage: /localStorage/.test(html),
    hasViewportMeta:
      /<meta[^>]+name\s*=\s*['"`]viewport['"`]/i.test(html),
    hasInlineScript: /<script[^>]*>[\s\S]*?<\/script>/i.test(html),
    scriptCount: (html.match(/<script[\s>]/gi) ?? []).length,
    styleCount: (html.match(/<style[\s>]/gi) ?? []).length,
    lineCount: html.split("\n").length,
    charCount: html.length,
    states,
  };
}
