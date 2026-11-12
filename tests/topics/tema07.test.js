import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { evaluate } from 'mathjs';
import tema from '../../js/topics/tema07.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { check } from '../../js/checker.js';
import { drawEcon } from '../../js/viz/econ.js';

const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));

// ---------- nezávislé výpočty: hrubé prohledávání zisku, žádné vzorce z generátoru ----------
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b}`);
// Nejlepší A z mřížky: maximum funkce zisku (u shodných hodnot bere první).
function argmax(fn, hi, step = 0.25) {
  let best = { x: 0, y: -Infinity };
  for (let x = 0; x <= hi + 1e-9; x += step) { const y = fn(x); if (y > best.y + 1e-9) best = { x, y }; }
  return best;
}
// Kořen rozdílu g(x) = 0 prohledáním mřížky (nejmenší |g|).
function scanRoot(g, hi, step = 0.25) {
  let best = { x: 0, gap: Infinity };
  for (let x = 0; x <= hi + 1e-9; x += step) { const gap = Math.abs(g(x)); if (gap < best.gap - 1e-12) best = { x, gap }; }
  return best.x;
}

const BOOK_ANO_NE = { 'kn-a': true, 'kn-b': true, 'kn-c': false, 'kn-d': true, 'kn-e': false, 'kn-f': false, 'kn-g': true, 'kn-h': false, 'kn-i': true, 'kn-j': true };
const OWN_ANO_NE = {
  'own-1': false, 'own-2': true, 'own-3': false, 'own-4': true, 'own-5': true, 'own-6': true, 'own-7': false,
  'own-8': true, 'own-9': true, 'own-10': false, 'own-11': true, 'own-12': true,
};

// Událost → který parametr se mění (nezávisle na generátoru); tvar křivky MRP(A) = P·(a − 2bA).
const SHIFT_EVENT = {
  'cena-produktu-up': { P: 7 }, 'cena-produktu-down': { P: 3 }, technologie: { a: 16 }, 'mzda-down': { w: 15 }, 'min-mzda': { w: 25 },
  'lepsi-stroje': { a: 16 }, zakaz: { P: 3 }, 'poptavka-up': { P: 7 },
};
function simulateShift(id) {
  const base = { a: 12, b: 1, P: 5, w: 20 };
  const next = { ...base, ...SHIFT_EVENT[id] };
  const mrp = (s, A) => s.P * (s.a - 2 * s.b * A);
  let moved = false; let dir = 0;
  for (let A = 0; A <= 5; A += 0.5) {
    const d = mrp(next, A) - mrp(base, A);
    if (Math.abs(d) > 1e-9) { moved = true; dir = Math.sign(d); }
  }
  return moved ? (dir > 0 ? '+' : '-') : '0';
}

test('téma 7: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'faktory');
  assert.equal(tema.order, 7);
  assert.equal(tema.title, 'Trhy výrobních faktorů');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 7: výklad má definice pro zkoušku (term), časté chyby a vykreslitelné grafy', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 7);
  assert.ok(tema.theory.filter((t) => t.viz).length >= 6);
  for (const t of tema.theory) {
    if (t.viz) assert.equal(drawEcon(svg(), t.viz.data), true, `graf oddílu „${t.heading}“ se nevykreslil`);
    const all = [t.heading, t.text, ...(t.mistakes || [])].join('\n');
    assert.ok(!/\*\*|\*|(^|[^\\])_/.test(all.replace(/\$[^$]*\$/g, '')), `Markdown nebo podtržítko mimo vzorec v oddílu „${t.heading}“`);
    assert.equal((all.match(/\$/g) || []).length % 2, 0, `nepárové $ v oddílu „${t.heading}“`);
  }
});

test('téma 7: texty příkladů nemají Markdown ani podtržítko mimo vzorec a mají párová $', () => {
  for (const type of tema.types) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = type.generate(makeRng(seed));
      const texts = [p.task, p.conclusion, ...p.solution.flatMap((s) => [s.title, s.text])].filter(Boolean);
      for (const tx of texts) {
        const plain = tx.replace(/\$[^$]*\$/g, '');
        assert.ok(!/\*|_/.test(plain), `${type.id} seed ${seed}: Markdown/podtržítko v textu: ${tx}`);
        assert.equal((tx.match(/\$/g) || []).length % 2, 0, `${type.id} seed ${seed}: nepárové $ v textu`);
      }
    }
  }
});

test('téma 7: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'mp-tabulka': (p) => {
        const { tp, P } = p.data;
        // MP z funkce TP(A) a hodnota MRP ze zisku: přírůstek P·TP při jedné další jednotce
        const TP = (k) => (k === 0 ? 0 : tp[k - 1]);
        const rows = tp.map((_, i) => {
          const mp = TP(i + 1) - TP(i);
          return [String(mp), String(P * TP(i + 1) - P * TP(i))];
        });
        assert.equal(rows.reduce((s, r) => s + Number(r[0]), 0), tp[tp.length - 1], 'součet MP = TP');
        for (let i = 1; i < rows.length; i++) assert.ok(Number(rows[i][0]) < Number(rows[i - 1][0]), 'MP klesá');
        return rows;
      },
      'optimum-tabulka': (p) => {
        const { tp, P, w, ask } = p.data;
        const profit = (k) => P * (k ? tp[k - 1] : 0) - w * k;
        const vals = tp.map((_, i) => profit(i + 1)); vals.unshift(0);
        const max = Math.max(...vals);
        assert.equal(vals.filter((v) => v === max).length, 1, 'jediné maximum zisku');
        return ask === 'A' ? vals.indexOf(max) : max;
      },
      'optimum-funkce': (p) => {
        const { a, b, P, w, ask } = p.data;
        const best = argmax((A) => P * (a * A - b * A * A) - w * A, a / b);
        assert.ok(a - 2 * b * best.x > 0, 'mezní produkt je v optimu kladný');
        return ask === 'A' ? best.x : a * best.x - b * best.x * best.x;
      },
      'mrp-nedokonala': (p) => {
        const { a, b, c, w, ask } = p.data;
        const profit = (A) => (a - b * c * A) * c * A - w * A;
        const best = argmax(profit, a / (b * c));
        assert.ok(a - b * c * best.x > 0, 'cena je kladná');
        return ask === 'A' ? best.x : a - b * c * best.x;
      },
      'mfc-tabulka': (p) => {
        const { w } = p.data;
        const tfc = (k) => (k === 0 ? 0 : k * w[k - 1]);
        const rows = w.map((_, i) => [String(tfc(i + 1)), String(tfc(i + 1) - tfc(i))]);
        for (let i = 1; i < rows.length; i++) assert.ok(Number(rows[i][1]) > w[i], 'MFC je vyšší než cena');
        return rows;
      },
      monopsonie: (p) => {
        const { n, d, k, c, ask } = p.data;
        const m = c + k * (n + d) * (n + 2 * d);
        // zisk monopsonisty = součet příjmů z mezního produktu (plocha pod MRP) − platba w(A)·A
        const profit = (A) => m * A - (n * A * A) / 2 - (c + d * A) * A;
        const mono = argmax(profit, m / n);
        const comp = scanRoot((A) => (m - n * A) - (c + d * A), m / n);
        const wm = c + d * mono.x; const wc = c + d * comp;
        return { A: mono.x, w: wm, dA: comp - mono.x, dw: wc - wm, expl: (m - n * mono.x) - wm }[ask];
      },
      'vice-faktoru': (p) => {
        const { prices, mps, mr, ask, idx } = p.data;
        if (ask === 'MR') {
          let best = { m: 0, err: Infinity };
          for (let m = 0.05; m <= 10; m += 0.05) {
            const err = prices.reduce((s, pr, i) => s + Math.abs(m * mps[i] - pr), 0);
            if (err < best.err - 1e-9) best = { m, err };
          }
          assert.ok(best.err < 1e-6, 'všechny faktory dávají stejné MR');
          return best.m;
        }
        let mp = null;
        for (let x = 0.25; x <= 100; x += 0.25) if (Math.abs(mr * x - prices[idx]) < 1e-9) mp = x;
        return mp;
      },
      'mrp-hodnota': (p) => {
        const { mp, p: price, mr, regime } = p.data;
        // celkový příjem z větší produkce: přírůstek TR při přírůstku produkce o mp kusů
        const slope = regime === 'konk' ? price : mr;
        assert.ok(regime === 'konk' || mr < price, 'MR < P při tržní síle');
        return (100 + mp) * slope - 100 * slope;
      },
      stroj: (p) => {
        const { u, p: price, cost } = p.data;
        const gain = u * price - cost; // změna zisku při použití stroje
        return gain > 0 ? 'ano' : gain < 0 ? 'ne' : 'lhostejne';
      },
      'odvozena-poptavka': (p) => {
        const { a, b, P } = p.data;
        const Q = (A) => a * A - b * A * A;
        const h = 1e-4;
        for (const A of [0.5, 1, 1.7, 2.3]) {
          const mrp = P * (Q(A + h) - Q(A - h)) / (2 * h); // MRP z číselné derivace
          near(evaluate(p.answerSpec.value, { A }), mrp, 1e-6, `křivka poptávky v A = ${A}`);
        }
        assert.equal(check(p.answerSpec, `${P * a}-${2 * b * P}*A`).ok, true);
        return p.answerSpec.value;
      },
      'posun-faktor': (p) => simulateShift(p.data.id),
      'renta-pudy': (p) => {
        const { a, b, T, a2, ask } = p.data;
        const rentFor = (inter) => {
          let best = { R: 0, gap: Infinity };
          for (let R = 0; R <= inter; R += 0.01) {
            const gap = Math.abs((inter - R) / b - T); // poptávané množství půdy při renta R
            if (gap < best.gap - 1e-12) best = { R, gap };
          }
          return best.R;
        };
        const R = rentFor(a);
        return { R, celkem: R * T, nova: rentFor(a2) }[ask];
      },
      'ekon-renta': (p) => {
        const { c, d, A, ask } = p.data;
        const w = c + d * A;
        let area = 0; const dx = 0.001; // plocha pod nabídkou lichoběžníky
        for (let x = 0; x < A - 1e-9; x += dx) area += ((c + d * x) + (c + d * (x + dx))) / 2 * dx;
        return ask === 'renta' ? w * A - area : area;
      },
      'trh-faktoru-firma': (p) => {
        const { D0, D1, S0, S1, a, b, P, ask } = p.data;
        const At = scanRoot((x) => (D0 - D1 * x) - (S0 + S1 * x), D0 / D1, 0.25);
        const w = D0 - D1 * At;
        near(At, (D0 - S0) / (D1 + S1), 0.2, 'množství na trhu faktoru');
        const best = argmax((A) => P * (a * A - b * A * A) - w * A, a / b);
        return ask === 'w' ? w : best.x;
      },
      'soustava-faktoru': (p) => {
        const { xl, xt, yl, yt, cx, cy, ask } = p.data;
        const sols = [];
        for (let w = 0; w <= 40; w++) for (let r = 0; r <= 40; r++) if (xl * w + xt * r === cx && yl * w + yt * r === cy) sols.push([w, r]);
        assert.equal(sols.length, 1, 'jediné řešení soustavy');
        return ask === 'w' ? sols[0][0] : sols[0][1];
      },
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : OWN_ANO_NE[p.data.id]),
    },
    minDistinct: {
      'mp-tabulka': 100, 'optimum-tabulka': 100, 'optimum-funkce': 100, 'mrp-nedokonala': 100, 'mfc-tabulka': 100, monopsonie: 80,
      'vice-faktoru': 100, 'mrp-hodnota': 100, stroj: 50, 'odvozena-poptavka': 40, 'posun-faktor': 8, 'renta-pudy': 80, 'ekon-renta': 60,
      'trh-faktoru-firma': 60, 'soustava-faktoru': 100, 'ano-ne': 10, definice: 6, 'graf-optimum': 50, 'graf-monopsonie': 40,
      'graf-posun-faktor': 8, 'graf-puda': 50,
    },
  });
});

test('téma 7: cvičebnice kap. 8, úloha 1 (4L + 4T = 56, 6L + 2T = 64 → mzda 9, renta 5)', () => {
  const data = { xl: 4, xt: 4, yl: 6, yt: 2, cx: 56, cy: 64 };
  assert.equal(byId['soustava-faktoru'].solve({ ...data, ask: 'w' }).answerSpec.value, 9);
  assert.equal(byId['soustava-faktoru'].solve({ ...data, ask: 'r' }).answerSpec.value, 5);
});

test('téma 7: cvičebnice kap. 8, úloha 2 (Q = 8A − A², P = 10, cena A 20 → 3 jednotky; poptávka 80 − 20A)', () => {
  assert.equal(byId['optimum-funkce'].solve({ a: 8, b: 1, P: 10, w: 20, ask: 'A' }).answerSpec.value, 3);
  assert.equal(byId['optimum-funkce'].solve({ a: 8, b: 1, P: 10, w: 20, ask: 'Q' }).answerSpec.value, 15);
  const d = byId['odvozena-poptavka'].solve({ a: 8, b: 1, P: 10 });
  assert.equal(check(d.answerSpec, '80 - 20*A').ok, true);
  assert.equal(check(d.answerSpec, '80 - 10*A').ok, false);
  // diskrétní kontrola: při A = 0..5 má zisk P·Q − 20A maximum v A = 3
  const profit = (A) => 10 * (8 * A - A * A) - 20 * A;
  assert.equal([0, 1, 2, 3, 4, 5].reduce((m, A) => (profit(A) > profit(m) ? A : m), 0), 3);
});

test('téma 7: cvičebnice kap. 8, úloha 3 (MFC < MRP → firma najímá víc) a úloha 4 (MR < P)', () => {
  assert.equal(byId.stroj.solve({ u: 4, p: 100, cost: 300 }).answerSpec.value, 'ano');
  const p = byId['mrp-hodnota'].solve({ mp: 6, p: 20, mr: 12, regime: 'nedok' });
  assert.equal(p.answerSpec.value, 72, 'MRP = MP · MR, nikoli MP · P');
  assert.ok(12 < 20);
  assert.equal(byId['mrp-hodnota'].solve({ mp: 6, p: 20, mr: 12, regime: 'konk' }).answerSpec.value, 120);
});

test('téma 7: cvičebnice kap. 8, úloha 6 (stroj: MRP = 5 · 5 000 = 25 000 > 10 000 → použít)', () => {
  const p = byId.stroj.solve({ u: 5, p: 5000, cost: 10000 });
  assert.equal(p.answerSpec.value, 'ano');
  assert.ok(p.conclusion.includes('25 000') || p.conclusion.includes('25000'), p.conclusion);
});

test('téma 7: cvičebnice kap. 8, úlohy 7 a 8 (MR = 0,5; MP_L = 2)', () => {
  assert.equal(byId['vice-faktoru'].solve({ prices: [6, 5, 2], mps: [12, 10, 4], ask: 'MR' }).answerSpec.value, 0.5);
  assert.equal(byId['vice-faktoru'].solve({ prices: [9, 6, 12], mr: 3, ask: 'MP', idx: 1 }).answerSpec.value, 2);
});

test('téma 7: cvičebnice kap. 8, úloha 9 (trh faktoru: A = 1 000, cena 2 000 Kč, jak v knize)', () => {
  // tržní část: 4000 − 2A = 500 + 1,5A → A = 1000, P_A = 2000 (soulad s knihou)
  const p = byId['trh-faktoru-firma'].solve({ D0: 4000, D1: 2, S0: 500, S1: 1.5, a: 244, b: 2, P: 10, ask: 'w' });
  assert.equal(p.answerSpec.value, 2000);
  assert.equal(byId['trh-faktoru-firma'].solve({ D0: 4000, D1: 2, S0: 500, S1: 1.5, a: 244, b: 2, P: 10, ask: 'A' }).answerSpec.value, 11);
});

test('téma 7: chyby v knize u úlohy 9 (cena produktu vychází 8, ne 10; MP je rostoucí → A = 14 je minimum zisku)', () => {
  // P = 20 − 2Q a Q_S = 2P − 10: rovnováha hrubým prohledáním cen
  let best = { P: 0, gap: Infinity };
  for (let P = 0; P <= 20; P += 0.01) { const gap = Math.abs((20 - P) / 2 - (2 * P - 10)); if (gap < best.gap) best = { P, gap }; }
  near(best.P, 8, 0.011, 'rovnovážná cena produktu v zadání');
  // Q = 144A + 2A² má rostoucí MP = 144 + 4A; při P = 10 a w = 2000 je MRP = w v A = 14, ale zisk je tam MINIMUM
  const profit = (A) => 10 * (144 * A + 2 * A * A) - 2000 * A;
  assert.ok(profit(14) < profit(13) && profit(14) < profit(15), 'A = 14 je minimum zisku');
});

test('téma 7: cvičebnice kap. 8, úkoly ano/ne a–j (pevné odpovědi; h opravena na nepravdu)', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries({ ...BOOK_ANO_NE, ...OWN_ANO_NE })) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 7: monopsonie z knihy-like zadání (MRP = 34 − 2A, w = 10 + A) dává A = 6, w = 16 (konkurence 8 a 18)', () => {
  const data = { n: 2, d: 1, k: 2, c: 10 };
  assert.equal(byId.monopsonie.solve({ ...data, ask: 'A' }).answerSpec.value, 6);
  assert.equal(byId.monopsonie.solve({ ...data, ask: 'w' }).answerSpec.value, 16);
  assert.equal(byId.monopsonie.solve({ ...data, ask: 'dA' }).answerSpec.value, 2);
  assert.equal(byId.monopsonie.solve({ ...data, ask: 'dw' }).answerSpec.value, 2);
});

test('téma 7: MFC tabulka a ekonomická renta (pevné příklady)', () => {
  const p = byId['mfc-tabulka'].solve({ w: [5, 6, 7, 8, 9, 10] });
  assert.deepEqual(p.answerSpec.value, [['5', '5'], ['12', '7'], ['21', '9'], ['32', '11'], ['45', '13'], ['60', '15']]);
  assert.equal(byId['ekon-renta'].solve({ c: 10, d: 2, A: 10, ask: 'renta' }).answerSpec.value, 100);
  assert.equal(byId['ekon-renta'].solve({ c: 10, d: 2, A: 10, ask: 'transfer' }).answerSpec.value, 200);
  assert.equal(byId['renta-pudy'].solve({ a: 50, b: 1, T: 30, a2: 60, ask: 'R' }).answerSpec.value, 20);
  assert.equal(byId['renta-pudy'].solve({ a: 50, b: 1, T: 30, a2: 60, ask: 'celkem' }).answerSpec.value, 600);
  assert.equal(byId['renta-pudy'].solve({ a: 50, b: 1, T: 30, a2: 60, ask: 'nova' }).answerSpec.value, 30);
});

test('téma 7: tabulky MP/MRP a optimum z tabulky (pevné příklady)', () => {
  const p = byId['mp-tabulka'].solve({ tp: [10, 19, 27, 34, 40], P: 3 });
  assert.deepEqual(p.answerSpec.value, [['10', '30'], ['9', '27'], ['8', '24'], ['7', '21'], ['6', '18']]);
  assert.equal(check(p.answerSpec, [['10', '30'], ['9', '27'], ['8', '24'], ['7', '21'], ['6', '18']]).ok, true);
  assert.equal(check(p.answerSpec, [['10', '30'], ['9', '27'], ['8', '24'], ['7', '21'], ['6', '19']]).ok, false);
  // w = 22: MRP 30, 27, 24 jsou nad 22, 21 a 18 pod → 3 jednotky
  assert.equal(byId['optimum-tabulka'].solve({ tp: [10, 19, 27, 34, 40], P: 3, w: 22, ask: 'A' }).answerSpec.value, 3);
  assert.equal(byId['optimum-tabulka'].solve({ tp: [10, 19, 27, 34, 40], P: 3, w: 22, ask: 'zisk' }).answerSpec.value, 3 * 27 - 22 * 3);
});

test('téma 7: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['optimum-funkce'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 7: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-optimum', 'graf-monopsonie', 'graf-posun-faktor', 'graf-puda']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['mp-tabulka', 'optimum-funkce', 'monopsonie', 'renta-pudy']) assert.equal(part(id), 'zapocet', id);
});

test('téma 7: grafy v krocích grafových úloh a posunu se vykreslí (včetně svislé nabídky půdy)', () => {
  for (const id of ['graf-optimum', 'graf-monopsonie', 'graf-posun-faktor', 'graf-puda']) {
    for (let seed = 1; seed <= 30; seed++) {
      const p = byId[id].generate(makeRng(seed));
      assert.equal(p.answerSpec.kind, 'whiteboard');
      assert.ok(p.solution.filter((s) => s.viz).length >= (id === 'graf-posun-faktor' ? 1 : 3), `${id}: málo grafových kroků`);
      for (const s of p.solution) if (s.viz) assert.equal(drawEcon(svg(), s.viz.data), true, `${id} seed ${seed}`);
    }
  }
});
