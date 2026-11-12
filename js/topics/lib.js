// Společné pomůcky témat: losování, zápis čísel do TeXu, řádky tabule, grafy trhu.
// Všechna témata (js/topics/temaNN.js) je sdílejí, aby se postupy psaly jednotně.
import { equilibrium } from '../econ.js';

export const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// Zamíchaná kopie seznamu (Fisher–Yates, stejný seed dá stejné pořadí).
export function shuffle(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Číslo do TeXu: desetinná čárka a skutečné minus; velká čísla s tenkou mezerou po tisících.
export function cz(n) {
  const r = Math.round(n * 1e6) / 1e6;
  const [whole, frac] = String(Math.abs(r)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
  return `${r < 0 ? '-' : ''}${grouped}${frac ? `{,}${frac}` : ''}`;
}

// Číslo do prostého textu (např. text kroku): s čárkou, bez TeXu.
export const czText = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',').replace('-', '−');

// Řádky tabule. Výsledek se označí třídou bt-vysledek a dvojitě podtrhne.
export const line = (tex) => ({ tex });
export const result = (tex) => ({
  tex: `\\htmlClass{bt-vysledek}{${tex}}`,
  notes: [{ kind: 'doubleUnderline', target: 'bt-vysledek' }],
});

// Součin koeficientu a proměnné pro TeX („0“, „P“, „3P“).
export const coef = (k, v) => (k === 1 ? v : `${cz(k)}${v}`);

// ---------- grafy trhu (osa x = Q, osa y = P) ----------
// Poptávka Q_D = a − bP zapsaná jako P(Q) = (a − Q)/b, nabídka Q_S = c + dP jako P(Q) = (Q − c)/d.
export const demandExpr = (a, b) => `(${a} - x)/${b}`;
export const supplyExpr = (c, d) => `(x - ${c})/${d}`;

// Rozsah grafu pro trh s křivkami D(a,b), S(c,d): vodorovně do množství při nulové ceně poptávky, svisle do ceny
// nulového množství. Hodnoty se zaokrouhlí nahoru na pěkné číslo.
export function marketRange(markets) {
  const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
  const nice = (v) => {
    const p = 10 ** Math.floor(Math.log10(v));
    return STEPS.find((f) => f * p >= v - 1e-9) * p;
  };
  const qMax = Math.max(...markets.map((m) => m.a));
  const pMax = Math.max(...markets.map((m) => m.a / m.b));
  return { domain: [0, nice(qMax)], range: [0, nice(pMax)] };
}

// Základní graf trhu s rovnováhou E (vodicí čáry). extra: další křivky, body, šipky, plochy.
export function marketViz({ a, b, c, d }, extra = {}) {
  const e = equilibrium({ a, b, c, d });
  const { domain, range } = marketRange([{ a, b }, ...(extra.markets || [])]);
  return {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain, range,
      curves: [
        { expr: demandExpr(a, b), label: 'D', color: 'blue' },
        { expr: supplyExpr(c, d), label: 'S', color: 'chalk' },
        ...(extra.curves || []),
      ],
      points: extra.points || [{ x: e.Q, y: e.P, label: 'E', guides: true }],
      arrows: extra.arrows || [],
      areas: extra.areas || [],
      alt: extra.alt || 'Poptávka, nabídka a tržní rovnováha',
    },
  };
}

// Možnosti výběru s pevnými id a zamíchaným pořadím.
export const options = (rng, list) => shuffle(rng, list.map(([id, text]) => ({ id, text })));

// Trh zadaný rovnicemi P(Q): poptávka P = A − B·Q, nabídka P = C + D·Q. extra jako u marketViz.
export function inverseMarketViz({ A, B, C, D }, extra = {}) {
  const Q = (A - C) / (B + D);
  const P = A - B * Q;
  const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
  const nice = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return STEPS.find((f) => f * p >= v - 1e-9) * p; };
  return {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' },
      domain: [0, nice(A / B)], range: [0, nice(A)],
      curves: [
        { expr: `${A} - ${B}*x`, label: 'D', color: 'blue' },
        { expr: `${C} + ${D}*x`, label: 'S', color: 'chalk' },
        ...(extra.curves || []),
      ],
      points: extra.points || [{ x: Q, y: P, label: 'E', guides: true }],
      arrows: extra.arrows || [],
      areas: extra.areas || [],
      alt: extra.alt || 'Poptávka, nabídka a tržní rovnováha',
    },
  };
}
