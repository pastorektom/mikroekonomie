// Ekonomický graf na tabuli: křivky D, S, MC, AC, MR…, body s vodicími čarami, plochy mezi křivkami
// (přebytky, zisk) a šipky posunu. Vodorovná osa je množství (x = Q), svislá cena nebo náklad.
//
// data = {
//   axes?: { x: 'Q', y: 'P' },               – popisky os
//   domain: [x0, x1], range: [y0, y1],       – rozsah os (povinné)
//   curves: [{ expr, label?, color?, dashed?, domain? }],   – expr = výraz v x (math.js, omezený), y = hodnota
//   points?: [{ x, y, label?, guides?, color? }],           – např. rovnováha E; guides = čárkované čáry k osám
//   areas?: [{ between: [exprA, exprB], from, to, label?, color? }],   – plocha mezi dvěma křivkami
//   arrows?: [{ from: [x, y], to: [x, y], label? }],        – posun křivky
//   alt?: string
// }
// Všechny popisky se vkládají přes textContent. Křivka se přeruší tam, kde výraz není číslo.
import { el, setup, reset, compileFn, niceTicks, fmtNum, isNum, isPair, color, px } from './common.js';

const W = 420; const H = 300;
const M = { l: 40, r: 16, t: 16, b: 34 };
const SAMPLES = 240;
let clipCounter = 0;

// Úseky křivky [[x, y], …]; mimo definiční obor a při nečíselné hodnotě se křivka přeruší.
// Hodnoty daleko mimo rozsah se ořežou (kreslení ořezává clipPath).
export function curvePoints(curve, domain, range, n = SAMPLES) {
  const f = compileFn(curve?.expr);
  const [x0, x1] = isPair(curve?.domain) ? curve.domain : domain;
  const span = Math.abs(range[1] - range[0]);
  const clampY = (y) => Math.max(range[0] - 3 * span, Math.min(range[1] + 3 * span, y));
  const segs = [];
  let cur = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = f(x);
    if (Number.isFinite(y)) cur.push([x, clampY(y)]);
    else if (cur.length) { segs.push(cur); cur = []; }
  }
  if (cur.length) segs.push(cur);
  return segs.filter((s) => s.length > 1);
}

function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!isPair(data.domain) || !isPair(data.range)) return null;
  const curves = (Array.isArray(data.curves) ? data.curves : []).filter((c) => c && typeof c.expr === 'string' && c.expr.trim());
  if (curves.length === 0) return null;
  return {
    domain: [Math.min(...data.domain), Math.max(...data.domain)],
    range: [Math.min(...data.range), Math.max(...data.range)],
    curves,
  };
}

export function draw(svg, data) {
  reset(svg);
  const v = validate(data);
  if (!v) return false;
  try { return render(svg, data, v) || reset(svg); } catch { return reset(svg); }
}
export const drawEcon = draw;

function render(svg, data, v) {
  const { domain: [x0, x1], range: [y0, y1] } = v;
  const doc = setup(svg, W, H, data.alt || 'Ekonomický graf');
  const pw = W - M.l - M.r; const ph = H - M.t - M.b;
  const sx = (x) => px(M.l + ((x - x0) / (x1 - x0)) * pw);
  const sy = (y) => px(M.t + ((y1 - y) / (y1 - y0)) * ph);
  const path = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${sx(x)} ${sy(y)}`).join(' ');

  const clipId = `econ-clip-${++clipCounter}`;
  const cp = el(doc, el(doc, svg, 'defs'), 'clipPath', { id: clipId });
  el(doc, cp, 'rect', { x: M.l, y: M.t, width: pw, height: ph });

  // mřížka, osy a značky
  const xt = niceTicks(x0, x1, 8); const yt = niceTicks(y0, y1, 6);
  const grid = el(doc, svg, 'g', { class: 'viz-grid' });
  for (const t of xt) el(doc, grid, 'line', { x1: sx(t), y1: M.t, x2: sx(t), y2: M.t + ph });
  for (const t of yt) el(doc, grid, 'line', { x1: M.l, y1: sy(t), x2: M.l + pw, y2: sy(t) });
  const ox = M.l; const oy = M.t + ph; // počátek (levý dolní roh): osy začínají v rozsahu
  const axes = el(doc, svg, 'g', { class: 'viz-axes' });
  el(doc, axes, 'line', { class: 'viz-axis', x1: ox, y1: oy, x2: M.l + pw, y2: oy });
  el(doc, axes, 'line', { class: 'viz-axis', x1: ox, y1: oy, x2: ox, y2: M.t });
  el(doc, axes, 'path', { class: 'viz-axis', d: `M ${M.l + pw - 7} ${oy - 4} L ${M.l + pw} ${oy} L ${M.l + pw - 7} ${oy + 4}` });
  el(doc, axes, 'path', { class: 'viz-axis', d: `M ${ox - 4} ${M.t + 7} L ${ox} ${M.t} L ${ox + 4} ${M.t + 7}` });
  const ticks = el(doc, svg, 'g', { class: 'viz-ticks' });
  for (const t of xt) el(doc, ticks, 'text', { x: sx(t), y: oy + 15, 'text-anchor': 'middle' }, fmtNum(t));
  for (const t of yt) el(doc, ticks, 'text', { x: ox - 5, y: sy(t) + 4, 'text-anchor': 'end' }, fmtNum(t));
  const names = data.axes && typeof data.axes === 'object' ? data.axes : {};
  el(doc, svg, 'text', { class: 'viz-label', x: M.l + pw - 4, y: oy + 29, 'text-anchor': 'end' }, typeof names.x === 'string' ? names.x : 'Q');
  el(doc, svg, 'text', { class: 'viz-label', x: ox + 8, y: M.t + 8, 'text-anchor': 'start' }, typeof names.y === 'string' ? names.y : 'P');

  const clipped = el(doc, svg, 'g', { 'clip-path': `url(#${clipId})` });

  // plochy mezi křivkami (pod křivkami, aby je čáry nepřekrývaly)
  for (const a of Array.isArray(data.areas) ? data.areas : []) {
    if (!a || !Array.isArray(a.between) || a.between.length !== 2 || !isNum(a.from) || !isNum(a.to) || a.from === a.to) continue;
    const f1 = compileFn(a.between[0]); const f2 = compileFn(a.between[1]);
    const top = []; const bottom = [];
    for (let i = 0; i <= 60; i++) {
      const x = a.from + ((a.to - a.from) * i) / 60;
      const ya = f1(x); const yb = f2(x);
      if (!Number.isFinite(ya) || !Number.isFinite(yb)) continue;
      top.push([x, ya]); bottom.push([x, yb]);
    }
    if (top.length < 2) continue;
    el(doc, clipped, 'path', { class: `viz-area viz-area-${color(a.color, 'accent')}`, d: `${path(top)} ${path(bottom.reverse()).replace('M', 'L')} Z` });
    if (typeof a.label === 'string' && a.label) {
      const mid = top[Math.floor(top.length / 2)]; const midB = bottom[bottom.length - 1 - Math.floor(top.length / 2)];
      el(doc, svg, 'text', { class: 'viz-label viz-label-accent', x: sx(mid[0]), y: sy((mid[1] + midB[1]) / 2) + 5, 'text-anchor': 'middle' }, a.label);
    }
  }

  // křivky
  let drawn = 0;
  for (const c of v.curves) {
    const segs = curvePoints(c, [x0, x1], [y0, y1]);
    if (segs.length === 0) continue;
    const col = color(c.color);
    const attrs = { class: `viz-curve viz-c-${col}`, fill: 'none', d: segs.map(path).join(' ') };
    if (c.dashed) attrs['stroke-dasharray'] = '7 5';
    el(doc, clipped, 'path', attrs);
    drawn++;
    if (typeof c.label === 'string' && c.label) {
      // popisek na konci křivky, uvnitř grafu
      const last = segs[segs.length - 1];
      let [lx, ly] = last[last.length - 1];
      let cx = sx(lx); let cy = sy(ly);
      cx = Math.min(M.l + pw - 4, cx); cy = Math.max(M.t + 14, Math.min(M.t + ph - 6, cy));
      el(doc, svg, 'text', { class: `viz-label viz-label-${col}`, x: cx - 6, y: cy - 11, 'text-anchor': 'end' }, c.label);
    }
  }
  if (drawn === 0) return false;

  // body s vodicími čarami k osám
  for (const p of Array.isArray(data.points) ? data.points : []) {
    if (!p || !isNum(p.x) || !isNum(p.y)) continue;
    if (p.guides) {
      el(doc, clipped, 'line', { class: 'viz-guide', 'stroke-dasharray': '4 4', x1: sx(p.x), y1: sy(p.y), x2: sx(p.x), y2: oy });
      el(doc, clipped, 'line', { class: 'viz-guide', 'stroke-dasharray': '4 4', x1: sx(p.x), y1: sy(p.y), x2: ox, y2: sy(p.y) });
    }
    el(doc, svg, 'circle', { class: `viz-point viz-c-${color(p.color, 'accent')}`, cx: sx(p.x), cy: sy(p.y), r: 4.5 });
    if (typeof p.label === 'string' && p.label) {
      el(doc, svg, 'text', { class: 'viz-label viz-label-accent', x: sx(p.x) + 8, y: sy(p.y) - 8, 'text-anchor': 'start' }, p.label);
    }
  }

  // šipky posunu
  for (const a of Array.isArray(data.arrows) ? data.arrows : []) {
    if (!a || !Array.isArray(a.from) || !Array.isArray(a.to) || !a.from.every(isNum) || !a.to.every(isNum)) continue;
    const [fx, fy] = [sx(a.from[0]), sy(a.from[1])]; const [tx, ty] = [sx(a.to[0]), sy(a.to[1])];
    const ang = Math.atan2(ty - fy, tx - fx); const hl = 9;
    const hx1 = tx - hl * Math.cos(ang - 0.4); const hy1 = ty - hl * Math.sin(ang - 0.4);
    const hx2 = tx - hl * Math.cos(ang + 0.4); const hy2 = ty - hl * Math.sin(ang + 0.4);
    el(doc, svg, 'path', { class: 'viz-arrow', fill: 'none', d: `M ${fx} ${fy} L ${tx} ${ty} M ${px(hx1)} ${px(hy1)} L ${tx} ${ty} L ${px(hx2)} ${px(hy2)}` });
    if (typeof a.label === 'string' && a.label) {
      el(doc, svg, 'text', { class: 'viz-label viz-label-accent', x: (fx + tx) / 2 + 6, y: (fy + ty) / 2 - 8, 'text-anchor': 'start' }, a.label);
    }
  }
  return true;
}
