// Společné pomůcky grafických pomůcek (matice, Gauss, graf, tečna, tabulka znamének).
// Všechny kreslí do SVG na tmavé tabuli; data jsou čistá (čísla a řetězce vkládané přes
// textContent). Výrazy funkcí se vyhodnocují omezeným math.js z checker-core (nikdy eval).
import { parse, usesBlocked } from '../checker-core.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const COLORS = new Set(['chalk', 'accent', 'warn', 'blue', 'green']);

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const isPair = (v) => Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]) && v[0] !== v[1];
export const color = (c, fallback = 'chalk') => (COLORS.has(c) ? c : fallback);
const r1 = (v) => Math.round(v * 100) / 100;
export const px = r1;

// Funkce z řetězce: vrací (x) => číslo; nečíselný výsledek (komplexní, chyba) je NaN.
export function compileFn(expr) {
  if (typeof expr !== 'string' || !expr.trim()) return () => NaN;
  let code;
  try {
    const node = parse(expr);
    if (usesBlocked(node)) return () => NaN;
    code = node.compile();
  } catch { return () => NaN; }
  return (x) => {
    try {
      const v = code.evaluate({ x });
      return typeof v === 'number' ? v : NaN;
    } catch { return NaN; }
  };
}

// Pěkné značky na ose: kroky 1, 2, 5 × 10^k.
export function niceTicks(min, max, count = 6) {
  if (!(isNum(min) && isNum(max)) || max <= min) return [];
  const raw = (max - min) / Math.max(1, count);
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Math.round(v / step * 1e6) / 1e6 * step);
  }
  return out;
}

// České číslo: desetinná čárka, skutečné znaménko minus.
export function fmtNum(v) {
  if (!isNum(v)) return '';
  const s = String(Math.round(v * 1e6) / 1e6).replace('.', ',');
  return s.replace('-', '−');
}

export const cellText = (v) => (typeof v === 'number' ? fmtNum(v) : typeof v === 'string' ? v : v == null ? '' : String(v));

// Vytvoření SVG prvku (text jen přes textContent).
export function el(doc, parent, tag, attrs = {}, text) {
  const e = doc.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v));
  if (text != null) e.textContent = String(text);
  parent?.appendChild(e);
  return e;
}

// Příprava prázdného SVG: rozměry v souřadnicích viewBox, šířka se řídí kontejnerem.
export function setup(svg, w, h, alt) {
  svg.textContent = '';
  svg.setAttribute('viewBox', `0 0 ${px(w)} ${px(h)}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', typeof alt === 'string' && alt ? alt : 'Grafická pomůcka');
  svg.setAttribute('class', 'viz');
  return svg.ownerDocument;
}

export function reset(svg) {
  if (svg && typeof svg.replaceChildren === 'function') svg.replaceChildren();
  return false;
}

// Šipky a symboly kreslené křivkami (nezávisí na písmu). Souřadnice kolem (0,0).
export const GLYPHS = {
  '↗': 'M -9 7 L 9 -7 M 1 -8 L 9 -7 L 7 1',
  '↘': 'M -9 -7 L 9 7 M 7 -1 L 9 7 L 1 8',
  '↑': 'M 0 9 L 0 -9 M -5 -4 L 0 -9 L 5 -4',
  '↓': 'M 0 -9 L 0 9 M -5 4 L 0 9 L 5 4',
  '→': 'M -9 0 L 9 0 M 4 -5 L 9 0 L 4 5',
  '∪': 'M -10 -7 Q -10 8 0 8 Q 10 8 10 -7',
  '∩': 'M -10 7 Q -10 -8 0 -8 Q 10 -8 10 7',
};
