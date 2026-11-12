import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import tema from '../../js/topics/tema09.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { drawEcon } from '../../js/viz/econ.js';

const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));
const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const r2 = (x) => Math.round(x * 100) / 100;

// ---------- nezávislé výpočty (jiné postupy než v generátoru) ----------
// současná hodnota: postupné dělení rokem po roce
function pvSteps(flows, r) {
  let total = 0;
  flows.forEach((c, k) => { let v = c; for (let j = 0; j <= k; j++) v /= 1 + r / 100; total += v; });
  return total;
}
// čistá současná hodnota přes exp/log
const npvExp = (I0, flows, r) => flows.reduce((s, c, k) => s + c * Math.exp(-(k + 1) * Math.log(1 + r / 100)), -I0);
// vnitřní výnosové procento půlením intervalu
function irrBisect(I0, flows) {
  let lo = 0; let hi = 1000;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (npvExp(I0, flows, mid) > 0) lo = mid; else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 1e6) / 1e6;
}
// Giniho koeficient dvojitým součtem rozdílů (průměrný absolutní rozdíl / 2 průměry), skupiny o stejné velikosti
function giniPairs(v) {
  const n = v.length; const mean = v.reduce((a, b) => a + b, 0) / n;
  let s = 0;
  for (const a of v) for (const b of v) s += Math.abs(a - b);
  return s / (2 * n * n * mean);
}
const BOOK_ANO_NE = {
  'kn-a': true, 'kn-b': false, 'kn-c': true, 'kn-d': false, 'kn-e': true, 'kn-f': false, 'kn-g': true, 'kn-h': true, 'kn-i': false, 'kn-j': true,
};

// rovnováha trhu kapitálu pro lineární křivky i = d − 0,1K a i = s + 0,1K prohledáním sítě
function scanK(d, s) {
  let best = { k: 0, gap: Infinity };
  for (let k = 0; k <= 100; k += 0.5) { const gap = Math.abs((d - 0.1 * k) - (s + 0.1 * k)); if (gap < best.gap) best = { k, gap }; }
  return best.k;
}
const CAP_BASE = { d: 10, s: 2 };
function capOutcome(curve, dir) {
  const sh = dir === '+' ? 1 : -1;
  const m = { d: CAP_BASE.d + (curve === 'D' ? 2 * sh : 0), s: CAP_BASE.s + (curve === 'S' ? -2 * sh : 0) };
  const k0 = scanK(CAP_BASE.d, CAP_BASE.s); const k1 = scanK(m.d, m.s);
  const i0 = CAP_BASE.s + 0.1 * k0; const i1 = m.s + 0.1 * k1;
  return `${i1 > i0 ? 'u' : 'd'}${k1 > k0 ? 'u' : 'd'}`;
}

test('téma 9: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'kapital');
  assert.equal(tema.order, 9);
  assert.equal(tema.title, 'Trh kapitálu a přerozdělování důchodů');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 7);
  assert.ok(tema.theory.filter((t) => t.viz).length >= 3);
});

test('téma 9: grafy ve výkladu se vykreslí', () => {
  for (const t of tema.theory.filter((x) => x.viz)) assert.equal(drawEcon(svg(), t.viz.data), true, t.heading);
});

test('téma 9: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'soucasna-hodnota': (p) => {
        const d = p.data;
        const flows = d.kind === 'jedna' ? [...Array(d.n - 1).fill(0), d.fv] : d.flows;
        const dec = d.kind === 'jedna' && d.fv < 10 ? 6 : 2;
        return Math.round(pvSteps(flows, d.r) * 10 ** dec) / 10 ** dec;
      },
      'urok-slozeny': (p) => {
        const {
          s0, i, n, m, ask,
        } = p.data;
        let bal = s0;
        for (let y = 0; y < n; y++) bal += bal * (i / 100);
        bal += (bal * (i / 100) * m) / 12;
        const clean = (x) => Math.round(Math.round(x * 1e6) / 1e6);
        return ask === 'urok' ? clean(bal - s0) : clean(bal);
      },
      'realna-urok': (p) => {
        const {
          mode, i, r, pi, t,
        } = p.data;
        const solveReal = (nom) => { // hledá r tak, aby (1 + r)(1 + pi) = 1 + nom
          let lo = -100; let hi = 100;
          for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if ((1 + mid / 100) * (1 + pi / 100) < 1 + nom / 100) lo = mid; else hi = mid; }
          return (lo + hi) / 2;
        };
        if (mode === 'priblizne') return r2(i - pi);
        if (mode === 'nominalni') return r + pi;
        if (mode === 'presne') return r2(solveReal(i));
        return r2(solveReal(i * (1 - t / 100)));
      },
      'miera-vynosu': (p) => ((p.data.Y - p.data.C) * 100) / p.data.I,
      'cena-aktiva': (p) => {
        const d = p.data;
        const yearly = d.kind === 'obligace' ? d.yearly : d.rentM * 12 - d.cost;
        return Math.round((yearly * 100) / d.i);
      },
      'npv-projekt': (p) => Math.round(npvExp(p.data.I0, p.data.flows, p.data.r)),
      'vnitrni-vynos': (p) => {
        const d = p.data;
        const flows = d.kind === 'jedna' ? [...Array(d.n - 1).fill(0), d.N] : [d.c1, d.c2];
        const ir = irrBisect(d.I0, flows);
        assert.ok(Math.abs(ir - Math.round(ir)) < 1e-6, 'IRR má vyjít celé číslo');
        return ir;
      },
      'rozhodnuti-investice': (p) => (npvExp(p.data.I0, p.data.flows, p.data.r) > 0 ? 'ano' : 'ne'),
      'porovnani-projektu': (p) => {
        const { I0, A, B, r } = p.data;
        const na = npvExp(I0, A, r); const nb = npvExp(I0, B, r);
        assert.ok(Math.max(na, nb) > 0, 'aspoň jeden projekt má kladnou NPV');
        return na > nb ? 'A' : 'B';
      },
      'lorenz-tabulka': (p) => {
        const s = [...p.data.shares].sort((a, b) => a - b);
        assert.equal(s.reduce((a, b) => a + b, 0), 100);
        const out = []; let acc = 0;
        for (const v of s) { acc += v; out.push(String(acc)); }
        assert.equal(acc, 100);
        return [out];
      },
      'gini-z-dat': (p) => Math.round(giniPairs(p.data.shares) * 1000) / 1000,
      'gini-porovnani': (p) => (giniPairs(p.data.A) < giniPairs(p.data.B) ? 'A' : 'B'),
      'prerozdeleni-davky': (p) => {
        const { y, t, ask } = p.data;
        const mean = y.reduce((a, b) => a + b, 0) / y.length;
        const tax = y.map((v) => (v * t) / 100); const transfer = tax.reduce((a, b) => a + b, 0) / y.length;
        assert.ok(Math.abs(transfer - (t / 100) * mean) < 1e-9);
        const net = y.map((v, k) => v - tax[k] + transfer);
        if (ask === 'transfer') return r2(transfer);
        if (ask === 'cisty') return r2(Math.min(...net));
        return Math.round(giniPairs(net) * 1000) / 1000;
      },
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
      'trh-kapitalu-posun': (p) => capOutcome(p.data.event.curve, p.data.event.dir),
    },
    minDistinct: {
      'soucasna-hodnota': 100, 'urok-slozeny': 100, 'realna-urok': 50, 'miera-vynosu': 50, 'cena-aktiva': 50, 'npv-projekt': 100, 'vnitrni-vynos': 20, 'rozhodnuti-investice': 100, 'porovnani-projektu': 100, 'lorenz-tabulka': 100, 'gini-z-dat': 100, 'gini-porovnani': 100, 'prerozdeleni-davky': 50, 'ano-ne': 20, 'trh-kapitalu-posun': 6, definice: 10, 'graf-trh-kapitalu': 3, 'graf-lorenz': 50,
    },
  });
});

test('téma 9: cvičebnice kap. 10 (pevné příklady dávají správné výsledky)', () => {
  // úloha 1: N0 = −80 000, N1 = 120 000, r = 10 %: PV = 109 090,91 a NPV = 29 090,91 (kniha uvádí zaokrouhleně 109 000 a 29 000)
  const p1 = byId['npv-projekt'].solve({ I0: 80000, flows: [120000], r: 10 });
  assert.equal(p1.answerSpec.value, 29091);
  assert.equal(r2(120000 / 1.1), 109090.91);
  assert.equal(byId['rozhodnuti-investice'].solve({ I0: 80000, flows: [120000], r: 10 }).answerSpec.value, 'ano');
  // úloha 2: 1 Kč za 10 let při 5 %: 0,613913
  const p2 = byId['soucasna-hodnota'].solve({ kind: 'jedna', fv: 1, r: 5, n: 10 });
  assert.equal(p2.answerSpec.value, 0.613913);
  // úloha 3: investice 100 000, výnos 20 000, náklady 10 000: míra výnosu 10 %, úvěr se vyplatí při úroku pod 10 %
  const p3 = byId['miera-vynosu'].solve({ I: 100000, Y: 20000, C: 10000, i: 8 });
  assert.equal(p3.answerSpec.value, 10);
  assert.ok(p3.conclusion.includes('vyplatí (míra výnosu je vyšší'));
  assert.ok(byId['miera-vynosu'].solve({ I: 100000, Y: 20000, C: 10000, i: 12 }).conclusion.includes('nevyplatí'));
  // úloha 4: garáž 850 Kč měsíčně, údržba 5 000, úrok 9 %: cena 57 778 Kč; výnosnost vůči kupní ceně 40 000 je 13 %
  const p4 = byId['cena-aktiva'].solve({ kind: 'najem', rentM: 850, cost: 5000, i: 9, buy: 40000 });
  assert.equal(p4.answerSpec.value, 57778);
  assert.equal(byId['miera-vynosu'].solve({ I: 40000, Y: 12 * 850, C: 5000, i: 9 }).answerSpec.value, 13);
  // úloha 6: 40 000 Kč, výnos 50 000, náklady 30 000: jednoduchá míra výnosu 50 %
  assert.equal(byId['miera-vynosu'].solve({ I: 40000, Y: 50000, C: 30000, i: 10 }).answerSpec.value, 50);
  // úloha 7: 60 000 Kč při 2 %, vklad od 1. 10. do konce 2. roku (1 rok + 3 měsíce): 61 506 Kč
  assert.equal(byId['urok-slozeny'].solve({
    s0: 60000, i: 2, n: 1, m: 3, ask: 'zustatek',
  }).answerSpec.value, 61506);
  // úloha 10: roční výnos 2 035 Kč při 11 %: 18 500 Kč
  assert.equal(byId['cena-aktiva'].solve({
    kind: 'obligace', yearly: 2035, i: 11, nominal: 10000, buy: 13500,
  }).answerSpec.value, 18500);
});

test('téma 9: ano/ne podle cvičebnice (úkoly a–j) mají správné odpovědi', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 9: Lorenzova křivka a Giniho koeficient: známé případy', () => {
  // úplná rovnost: G = 0; pět skupin 20 %
  assert.equal(giniPairs([20, 20, 20, 20, 20]), 0);
  // 10, 15, 20, 25, 30 %: kumulace 10, 25, 45, 70, 100, G = 0,2 (1 − 0,002 · součet dvojic L)
  const p = byId['gini-z-dat'].solve({ shares: [30, 10, 25, 15, 20] });
  assert.equal(p.answerSpec.value, 0.2);
  assert.deepEqual(byId['lorenz-tabulka'].solve({ shares: [30, 10, 25, 15, 20] }).answerSpec.value, [['10', '25', '45', '70', '100']]);
  // přímka rovnosti: G = (A − B)/A = 1 − 2B; pro křivku y = x² je B = 1/3, G = 1/3
  let B = 0; const N = 100000;
  for (let k = 0; k < N; k++) { const x = (k + 0.5) / N; B += (x * x) / N; }
  assert.ok(Math.abs((1 - 2 * B) - 1 / 3) < 1e-6);
  // přerozdělení: čistý důchod i Giniho koeficient (1 − t)·G_před
  const pr = byId['prerozdeleni-davky'].solve({ y: [20, 40, 60, 90, 190], t: 20, ask: 'gini-po' });
  assert.ok(Math.abs(pr.answerSpec.value - Math.round(0.8 * giniPairs([20, 40, 60, 90, 190]) * 1000) / 1000) < 1e-9);
});

test('téma 9: texty bez Markdownu a bez podtržítek mimo vzorce', () => {
  const stripMath = (s) => s.replace(/\$[^$]*\$/g, '');
  const check = (s, where) => {
    if (typeof s !== 'string') return;
    const t = stripMath(s);
    assert.ok(!/\*/.test(t), `${where}: hvězdička (Markdown) v „${s.slice(0, 60)}“`);
    assert.ok(!/_/.test(t), `${where}: podtržítko mimo vzorec v „${s.slice(0, 60)}“`);
    assert.ok(!/#/.test(t), `${where}: křížek v „${s.slice(0, 60)}“`);
    assert.equal((s.match(/\$/g) || []).length % 2, 0, `${where}: lichý počet $ v „${s.slice(0, 60)}“`);
  };
  for (const t of tema.theory) {
    check(t.heading, 'výklad'); check(t.text, t.heading); check(t.term, t.heading);
    for (const m of t.mistakes || []) check(m, t.heading);
  }
  for (const type of tema.types) {
    for (let seed = 1; seed <= 60; seed++) {
      const p = type.generate(makeRng(seed));
      const where = `${type.id}/${seed}`;
      check(p.task, where); check(p.conclusion, where);
      for (const o of p.answerSpec.options || []) check(o.text, where);
      for (const s of p.solution) { check(s.title, where); check(s.text, where); }
    }
  }
});

test('téma 9: části zkouška/zápočet a grafové úlohy mají vzorový graf', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  assert.equal(part('definice'), 'zkouska');
  assert.equal(part('graf-trh-kapitalu'), 'zkouska');
  assert.equal(part('graf-lorenz'), 'zkouska');
  assert.equal(part('npv-projekt'), 'zapocet');
  assert.equal(part('gini-z-dat'), 'zapocet');
  for (const id of ['graf-trh-kapitalu', 'graf-lorenz']) {
    const p = byId[id].generate(makeRng(3));
    assert.equal(p.answerSpec.kind, 'whiteboard');
    assert.equal(p.answerSpec.reference.kind, 'econ');
  }
  for (const kind of ['dlouhe', 'kratke', 'posun']) {
    const p = byId['graf-trh-kapitalu'].solve({ kind });
    assert.equal(drawEcon(svg(), p.answerSpec.reference.data), true, kind);
  }
});

test('téma 9: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['npv-projekt'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});
