/**
 * Рендер спрайтов: shape, pixel, svg, emoji.
 * Возвращает JS-код для встраивания в HTML.
 */

export function spritesRuntime(): string {
  return `
// ===== SPRITES =====

function __drawSprite(ctx, sprite, x, y, cellSize, time, animName) {
  if (!sprite || sprite.type === 'none') return;

  // Анимация — трансформация
  ctx.save();
  var cx = x + cellSize / 2;
  var cy = y + cellSize / 2;
  ctx.translate(cx, cy);

  if (animName && animName !== 'none') {
    var t = time / 1000;
    if (animName === 'pulse') {
      var s = 1 + Math.sin(t * 4) * 0.08;
      ctx.scale(s, s);
    } else if (animName === 'breathe') {
      var s2 = 1 + Math.sin(t * 2) * 0.05;
      ctx.scale(s2, s2);
    } else if (animName === 'shake') {
      var sh = Math.sin(t * 20) * 2;
      ctx.translate(sh, 0);
    } else if (animName === 'rotate') {
      ctx.rotate(t * 2);
    } else if (animName === 'bounce') {
      ctx.translate(0, -Math.abs(Math.sin(t * 5)) * 4);
    } else if (animName === 'glow') {
      var glowAlpha = 0.3 + Math.abs(Math.sin(t * 3)) * 0.5;
      ctx.shadowColor = sprite.color || '#ffffff';
      ctx.shadowBlur = 15 * glowAlpha;
    }
  }

  ctx.translate(-cx, -cy);

  // Рисуем
  if (sprite.type === 'emoji') {
    __drawEmoji(ctx, sprite.emoji || '⭐', x, y, cellSize);
  } else if (sprite.type === 'shape') {
    __drawShape(ctx, sprite, x, y, cellSize);
  } else if (sprite.type === 'pixel') {
    __drawPixel(ctx, sprite, x, y, cellSize);
  } else if (sprite.type === 'svg') {
    __drawSvg(ctx, sprite, x, y, cellSize);
  }

  ctx.restore();
}

function __drawEmoji(ctx, emoji, x, y, cellSize) {
  var size = Math.round(cellSize * 0.9);
  ctx.font = size + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(emoji, x + cellSize / 2, y + cellSize / 2);
}

function __drawShape(ctx, sprite, x, y, cellSize) {
  var size = (sprite.size || 0.8) * cellSize;
  var cx = x + cellSize / 2;
  var cy = y + cellSize / 2;
  var half = size / 2;

  ctx.fillStyle = sprite.color || '#ffffff';

  if (sprite.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(cx, cy, half, 0, Math.PI * 2);
    ctx.fill();
    if (sprite.outline) {
      ctx.strokeStyle = sprite.outline.color;
      ctx.lineWidth = sprite.outline.width;
      ctx.stroke();
    }
  } else if (sprite.shape === 'square') {
    ctx.fillRect(cx - half, cy - half, size, size);
    if (sprite.outline) {
      ctx.strokeStyle = sprite.outline.color;
      ctx.lineWidth = sprite.outline.width;
      ctx.strokeRect(cx - half, cy - half, size, size);
    }
  } else if (sprite.shape === 'roundedSquare') {
    var r = size * 0.25;
    __roundRect(ctx, cx - half, cy - half, size, size, r);
    ctx.fill();
    if (sprite.outline) {
      ctx.strokeStyle = sprite.outline.color;
      ctx.lineWidth = sprite.outline.width;
      __roundRect(ctx, cx - half, cy - half, size, size, r);
      ctx.stroke();
    }
  } else if (sprite.shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy + half);
    ctx.lineTo(cx - half, cy + half);
    ctx.closePath();
    ctx.fill();
  } else if (sprite.shape === 'hexagon') {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 - Math.PI / 2;
      var px = cx + Math.cos(a) * half;
      var py = cy + Math.sin(a) * half;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (sprite.shape === 'star') {
    __star(ctx, cx, cy, 5, half, half * 0.45);
    ctx.fill();
  } else if (sprite.shape === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
    ctx.fill();
  }
}

function __drawPixel(ctx, sprite, x, y, cellSize) {
  if (!sprite.pixel) return;
  var grid = sprite.pixel.grid;
  var palette = sprite.pixel.palette || {};
  var rows = grid.length;
  var cols = grid[0] ? grid[0].length : 0;
  var pixelSize = cellSize / Math.max(rows, cols);

  for (var r = 0; r < rows; r++) {
    var row = grid[r];
    for (var c = 0; c < row.length; c++) {
      var ch = row[c];
      var color = palette[ch];
      if (!color || color === 'transparent' || ch === '.') continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        x + c * pixelSize,
        y + r * pixelSize,
        pixelSize + 0.5,
        pixelSize + 0.5
      );
    }
  }
}

var __svgCache = {};

function __drawSvg(ctx, sprite, x, y, cellSize) {
  if (!sprite.svg) return;
  var key = sprite.svg.slice(0, 40);
  if (!__svgCache[key]) {
    var img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(sprite.svg)));
    __svgCache[key] = { img: img, loaded: false };
    img.onload = function() { __svgCache[key].loaded = true; };
    return;
  }
  var cached = __svgCache[key];
  if (cached.loaded) {
    var size = (sprite.size || 0.9) * cellSize;
    try {
      ctx.drawImage(cached.img, x + (cellSize - size) / 2, y + (cellSize - size) / 2, size, size);
    } catch (e) { /* ignore */ }
  }
}

function __roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function __star(ctx, cx, cy, spikes, outerR, innerR) {
  var rot = Math.PI / 2 * 3;
  var step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (var i = 0; i < spikes; i++) {
    var x = cx + Math.cos(rot) * outerR;
    var y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}
`;
}
