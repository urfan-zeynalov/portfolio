// Shared drawing helpers for the 13 SYSTEM games. Files starting with "_" are not games.
export const C = {
  bg: '#141214', bg2: '#201C1E', grid: '#2A2426', line: '#3A3436',
  ink: '#ECE6DC', dim: '#A79F97', faint: '#5A5052',
  red: '#E0505F', redD: '#B32A3C', redDD: '#6B1E2A',
};
export const W = 640, H = 480;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const deg = r => r * 180 / Math.PI;
export const rad = d => d * Math.PI / 180;
export function rng(seed = Date.now()) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export function clear(ctx, color = C.bg) { ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }

export function text(ctx, str, x, y, { size = 14, color = C.ink, align = 'left', font = 'Silkscreen', weight = 400, baseline = 'alphabetic' } = {}) {
  ctx.font = `${weight} ${size}px ${font === 'mono' ? '"JetBrains Mono", monospace' : 'Silkscreen, monospace'}`;
  // text never uses the faint grid tone: keep labels at 4.5:1 on the dark screen
  ctx.fillStyle = color === C.faint ? '#8E857F' : color; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

export function panel(ctx, x, y, w, h, { fill = C.bg2, stroke = C.line, title } = {}) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (title) text(ctx, title, x + 8, y + 15, { size: 10, color: C.dim });
}

export function hud(ctx, items) {
  ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = C.line; ctx.fillRect(0, 30, W, 2);
  const step = W / items.length;
  items.forEach(([label, value, hot], i) => {
    text(ctx, label, i * step + 12, 20, { size: 10, color: C.dim });
    text(ctx, String(value), i * step + 12 + ctx.measureText(label).width + 8, 20, { size: 13, color: hot ? C.red : C.ink });
  });
}

export function meter(ctx, x, y, w, h, frac, { color = C.red, back = C.grid, marks } = {}) {
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  if (marks) { ctx.fillStyle = C.ink; for (const m of marks) ctx.fillRect(x + w * m - 1, y - 2, 2, h + 4); }
}

// floating "+100" style popups
export function popups() {
  const list = [];
  return {
    add(str, x, y, color = C.ink) { list.push({ str, x, y, t: 0, color }); },
    update(dt) { for (const p of list) { p.t += dt; p.y -= 30 * dt; } while (list.length && list[0].t > 1.1) list.shift(); },
    draw(ctx) { for (const p of list) { ctx.globalAlpha = Math.max(0, 1 - p.t / 1.1); text(ctx, p.str, p.x, p.y, { size: 14, color: p.color, align: 'center' }); } ctx.globalAlpha = 1; },
  };
}
