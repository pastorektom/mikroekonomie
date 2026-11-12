import { test } from 'node:test';
import assert from 'node:assert/strict';
import tema from '../../js/topics/tema10.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';

const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));
const rnd = (x, k = 1e6) => Math.round(x * k) / k;

// ---------- nezávislé výpočty: půlení intervalu a numerická integrace, žádné vzorce z generátoru ----------
function bisect(f, lo, hi) { // f(lo) a f(hi) mají opačné znaménko
  let a = lo; let b = hi; const sa = Math.sign(f(a));
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (Math.sign(f(m)) === sa) a = m; else b = m;
  }
  return (a + b) / 2;
}
function integrate(f, a, b, n = 2000) { // Simpsonovo pravidlo
  if (b <= a) return 0;
  const h = (b - a) / n; let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}
const curvesInv = ({ A, B, C, D }) => ({ pd: (q) => A - B * q, ps: (q) => C + D * q });
const eqQ = (pd, ps) => bisect((q) => pd(q) - ps(q), 0, 1e6);

function surplusInv(p) {
  const { pd, ps } = curvesInv(p.data);
  const Q = eqQ(pd, ps); const P = pd(Q);
  const cs = integrate((q) => pd(q) - P, 0, Q); const pS = integrate((q) => P - ps(q), 0, Q);
  return { CS: rnd(cs), PS: rnd(pS), TS: rnd(cs + pS) }[p.data.ask];
}
function surplusQP(p) {
  const { a, b, c, d, ask } = p.data;
  const qd = (x) => a - b * x; const qs = (x) => c + d * x;
  const P = bisect((x) => qd(x) - qs(x), 0, 1e5);
  const Pmax = bisect(qd, 0, 1e5); const P0 = bisect(qs, -1e5, 1e5);
  assert.ok(P0 > 0 && P0 < P, 'nabídka začíná od kladné ceny pod rovnováhou');
  const cs = integrate(qd, P, Pmax); const ps = integrate(qs, P0, P);
  return { CS: rnd(cs), PS: rnd(ps), TS: rnd(cs + ps) }[ask];
}
function regulation(p) {
  const { A, B, C, D, limit, price, ask } = p.data;
  const { pd, ps } = curvesInv(p.data);
  const Q = eqQ(pd, ps); const P = pd(Q);
  assert.ok(limit === 'strop' ? price < P : price > P, 'regulace musí působit');
  const qd = (A - price) / B; const qs = (price - C) / D;
  const Qr = Math.min(qd, qs); // obchoduje se na kratší straně trhu
  const dwl = integrate((q) => pd(q) - ps(q), Qr, Q);
  const tsr = integrate((q) => pd(q) - ps(q), 0, Qr);
  return ask === 'DWL' ? rnd(dwl) : rnd(tsr);
}
function tax(p) {
  const { t, ask } = p.data;
  const { pd, ps } = curvesInv(p.data);
  const Q = eqQ(pd, ps);
  const Qt = eqQ(pd, (q) => ps(q) + t);
  if (ask === 'Qt') return rnd(Qt);
  const pk = pd(Qt); const pp = pk - t;
  const total0 = integrate((q) => pd(q) - ps(q), 0, Q);
  const cs = integrate((q) => pd(q) - pk, 0, Qt); const prod = integrate((q) => pp - ps(q), 0, Qt);
  const rev = t * Qt;
  return ask === 'vynos' ? rnd(rev) : rnd(total0 - (cs + prod + rev)); // mrtvá ztráta = ztráta součtu přebytků a výnosu
}
function monopoly(p) {
  const { A, B, c } = p.data;
  const pd = (q) => A - B * q;
  let best = { q: 0, pi: -Infinity };
  for (let q = 0; q <= A / B; q += 0.25) { const pi = q * pd(q) - c * q; if (pi > best.pi + 1e-9) best = { q, pi }; }
  const Qc = bisect((q) => pd(q) - c, 0, 1e5);
  return rnd(integrate((q) => pd(q) - c, best.q, Qc));
}
function maxSurplus(p) {
  const { pd, ps } = curvesInv(p.data);
  const ts = (q) => integrate((x) => pd(x) - ps(x), 0, q);
  const best = p.data.qs.reduce((b, q) => (ts(q) > ts(b) ? q : b));
  return `q${best}`;
}
function twoMarkets(p) {
  const { a1, a2, k1, k2, Q1, Q2, dQ, scenario, ask } = p.data;
  const Q1e = scenario === 'po' ? Q1 + dQ : Q1;
  let P1 = 0; let P2 = 0;
  for (let i = 0; i < 300; i++) { P1 = a1 - Q1e + k1 * P2; P2 = a2 - Q2 + k2 * P1; } // iterace cen z rovnic poptávky
  return rnd(ask === 1 ? P1 : P2, 100);
}

// Užitkové funkce a numerické mezní míry substituce (centrální diference).
const dU = (U, x, y, wrt) => { const h = 1e-6; return wrt === 'x' ? (U(x + h, y) - U(x - h, y)) / (2 * h) : (U(x, y + h) - U(x, y - h)) / (2 * h); };
const mrsOf = (U, x, y) => dU(U, x, y, 'x') / dU(U, x, y, 'y');
const UA = (x, y) => x * y;

function paretoAlloc(p) {
  const { X, Y, xA, yA } = p.data;
  const xB = X - xA; const yB = Y - yA;
  const mA = mrsOf(UA, xA, yA); const mB = mrsOf(UA, xB, yB);
  if (Math.abs(mA - mB) < 1e-6) return 'ef';
  // potvrzení: malá výměna mezi MRS oběma prospěje
  const hi = mA > mB ? 'A' : 'B'; const eps = 1e-4; const price = (mA + mB) / 2;
  const gain = (x, y, dx, dy) => UA(x + dx, y + dy) - UA(x, y);
  const gA = hi === 'A' ? gain(xA, yA, eps, -price * eps) : gain(xA, yA, -eps, price * eps);
  const gB = hi === 'A' ? gain(xB, yB, -eps, price * eps) : gain(xB, yB, eps, -price * eps);
  assert.ok(gA > 0 && gB > 0, 'při rozdílných MRS musí výměna prospět oběma');
  return 'nef';
}
function paretoTrade(p) {
  const { mHi, mLo, rates } = p.data;
  return rates.map((r) => { // první řád změn užitku při malé výměně
    const gainHi = mHi - r; const gainLo = r - mLo;
    return [gainHi >= 0 && gainLo >= 0 && (gainHi > 0 || gainLo > 0) ? '1' : '0'];
  });
}
function contract(p) {
  const { X, Y, xA, pref } = p.data;
  const UB = pref === 'same' ? (x, y) => x * y : (x, y) => x * y * y;
  const f = (yA) => mrsOf(UA, xA, yA) - mrsOf(UB, X - xA, Y - yA);
  return rnd(bisect(f, 0.01, Y - 0.01), 1000);
}

const BOOK_ANO_NE = { 'kn-a': true, 'kn-b': true, 'kn-c': false, 'kn-d': true, 'kn-e': false, 'kn-f': false, 'kn-g': true, 'kn-h': true, 'kn-i': true, 'kn6-o': true, 'kn6-p': true, 'kn6-r': false };
const PICK_ANSWER = { 'v-trhy': 'c', 'v-nutna': 'd', 'v-dilci': 'e', 'v-bod': 'a', 'v-zlepseni': 'b', 'v-cs': 'a', 'v-mz': 'b' };

test('téma 10: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'rovnovaha');
  assert.equal(tema.order, 10);
  assert.equal(tema.title, 'Celková rovnováha a tržní efektivnost');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 10: výklad obsahuje definice pro zkoušku (term), grafy a časté chyby', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
  assert.ok(tema.theory.filter((t) => t.viz).length >= 3);
});

test('téma 10: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      prebytky: surplusInv,
      'prebytky-qp': surplusQP,
      'mrtva-regulace': regulation,
      'mrtva-dan': tax,
      'mrtva-monopol': monopoly,
      'max-prebytek': maxSurplus,
      'dva-trhy': twoMarkets,
      'pareto-alokace': paretoAlloc,
      'pareto-vymena': paretoTrade,
      'smluvni-krivka': contract,
      'mrs-mrpt': (p) => { const g = p.data.mrs - p.data.mrpt; return g > 0 ? 'vicX' : g < 0 ? 'vicY' : 'ok'; },
      mrpt: (p) => { const { a, b, x1 } = p.data; const Y = (x) => a - b * x * x; return Y(x1) - Y(x1 + 1); },
      vyber: (p) => PICK_ANSWER[p.data.id],
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
    },
    minDistinct: {
      prebytky: 100, 'prebytky-qp': 60, 'mrtva-regulace': 100, 'mrtva-dan': 100, 'mrtva-monopol': 60, 'max-prebytek': 60,
      'dva-trhy': 100, 'pareto-alokace': 60, 'pareto-vymena': 30, 'smluvni-krivka': 20, 'mrs-mrpt': 20, mrpt: 15,
      podminky: 5, vyber: 6, 'ano-ne': 20, definice: 12, 'graf-prebytky': 50, 'graf-mrtva-dan': 50, 'graf-smluvni': 8,
    },
  });
});

test('téma 10: pevné příklady z cvičebnice (kap. 6, 7, 11) dávají výsledky z knihy', () => {
  // kap. 11, úloha 1a: P_Z = 700 − Q_Z + 0,5 P_S, P_S = 450 − Q_S + 0,2 P_Z, Q_Z = 50, Q_S = 150 → P_Z = 888,89, P_S = 477,78 (kniha 477,77 je zaokrouhlení)
  const base = { a1: 700, a2: 450, k1: 0.5, k2: 0.2, Q1: 50, Q2: 150, dQ: 85, scenario: 'pred' };
  assert.equal(byId['dva-trhy'].solve({ ...base, ask: 1 }).answerSpec.value, 888.89);
  assert.equal(byId['dva-trhy'].solve({ ...base, ask: 2 }).answerSpec.value, 477.78);
  // úloha 1b: nabídka zlata vzroste o 85 jednotek (Q_Z = 135) → 794,44 a 458,89
  assert.equal(byId['dva-trhy'].solve({ ...base, scenario: 'po', ask: 1 }).answerSpec.value, 794.44);
  assert.equal(byId['dva-trhy'].solve({ ...base, scenario: 'po', ask: 2 }).answerSpec.value, 458.89);
  // Chyba v řešení knihy: 833,34 a 466,67 odpovídají nárůstu o 50 jednotek (Q_Z = 100), nikoli o 85.
  assert.equal(byId['dva-trhy'].solve({ ...base, dQ: 50, scenario: 'po', ask: 1 }).answerSpec.value, 833.33);
  assert.equal(byId['dva-trhy'].solve({ ...base, dQ: 50, scenario: 'po', ask: 2 }).answerSpec.value, 466.67);
  // kap. 6, úloha 12: P = 10 − 4Q/2000, MC firmy = 4 + q (2000 firem → P = 4 + Q/2000): Q = 2400, P = 5,2, přebytek spotřebitele 5760
  // (kniha označuje 5760 jako PS, ale jde o spotřebitelský přebytek CS; výrobcův přebytek je 1440)
  const k6 = { A: 10, B: 0.002, C: 4, D: 0.0005 };
  assert.equal(byId.prebytky.solve({ ...k6, ask: 'CS' }).answerSpec.value, 5760);
  assert.equal(byId.prebytky.solve({ ...k6, ask: 'PS' }).answerSpec.value, 1440);
  assert.equal(byId.prebytky.solve({ ...k6, ask: 'TS' }).answerSpec.value, 7200);
  // kap. 7, úloha 3: Q = 81 − P, MC = 9 → Q_M = 36, P_M = 45, CS = 648 (monopol), mrtvá ztráta 648
  assert.equal(byId['mrtva-monopol'].solve({ A: 81, B: 1, c: 9 }).answerSpec.value, 648);
  // kap. 3, úloha 16: P = 400 − Q, P = 100 + 0,5Q, minimální cena 250 → Q_D = 150, Q_S = 300; mrtvá ztráta 1875
  assert.equal(byId['mrtva-regulace'].solve({ A: 400, B: 1, C: 100, D: 0.5, limit: 'prah', price: 250, ask: 'DWL' }).answerSpec.value, 1875);
});

test('téma 10: ano/ne a výběr podle cvičebnice kap. 11 mají správné odpovědi', () => {
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = byId['ano-ne'].solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
  for (const [id, ans] of Object.entries(PICK_ANSWER)) {
    const p = byId.vyber.solve({ id });
    assert.equal(p.answerSpec.value, ans, id);
    assert.ok(p.answerSpec.options.some((o) => o.id === ans), id);
  }
});

test('téma 10: tabulka Paretových zlepšení a efektivnost alokace dávají očekávané hodnoty', () => {
  // MRS_A = 3, MRS_B = 1: zlepšením je p mezi 1 a 3
  const t = byId['pareto-vymena'].solve({ mHi: 3, mLo: 1, hi: 'A', rates: [0.5, 1.5, 2.5, 3.5] });
  assert.deepEqual(t.answerSpec.value, [['0'], ['1'], ['1'], ['0']]);
  // úhlopříčka krabice při U = xy: A (4, 6) z (10, 15) je efektivní, (4, 5) ne
  assert.equal(byId['pareto-alokace'].solve({ X: 10, Y: 15, xA: 4, yA: 6 }).answerSpec.value, 'ef');
  assert.equal(byId['pareto-alokace'].solve({ X: 10, Y: 15, xA: 4, yA: 5 }).answerSpec.value, 'nef');
  // smluvní křivka při U_A = xy, U_B = xy²: y_A = Y·x_A/(2X − x_A) = 20·4/16 = 5
  assert.equal(byId['smluvni-krivka'].solve({ X: 10, Y: 20, xA: 4, pref: 'wB' }).answerSpec.value, 5);
});

// ---------- kontrola textů: bez Markdownu, bez „_“ mimo vzorec, bez $ v prostém textu ----------
const stripMath = (s) => s.replace(/\$[^$]*\$/g, '');
function checkPlain(s, where) {
  assert.equal((s.match(/\$/g) || []).length % 2, 0, `${where}: nepárový $`);
  const rest = stripMath(s);
  assert.ok(!/_/.test(rest), `${where}: „_“ mimo vzorec: ${rest}`);
  assert.ok(!/\*/.test(rest) && !/`/.test(rest) && !/^#/m.test(rest), `${where}: Markdown`);
}

test('téma 10: texty výkladu a příkladů nemají Markdown ani „_“ mimo vzorec; závěr a možnosti jsou prostý text', () => {
  for (const t of tema.theory) {
    checkPlain(t.heading, `výklad ${t.heading}`);
    checkPlain(t.text, `výklad ${t.heading}`);
    for (const m of t.mistakes || []) checkPlain(m, `chyba ${t.heading}`);
  }
  for (const type of tema.types) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = type.generate(makeRng(seed));
      const where = `${type.id}/${seed}`;
      checkPlain(p.task, where);
      assert.ok(!/\$/.test(p.conclusion || ''), `${where}: závěr obsahuje $`);
      for (const o of p.answerSpec.options || []) assert.ok(!/\$/.test(o.text), `${where}: možnost obsahuje $`);
      for (const s of p.solution) { checkPlain(s.title, `${where} titulek`); checkPlain(s.text, `${where} krok`); }
    }
  }
  for (const id of Object.keys(PICK_ANSWER)) { const p = byId.vyber.solve({ id }); assert.ok(!/\$/.test(p.conclusion)); }
  for (const id of Object.keys(BOOK_ANO_NE)) { const p = byId['ano-ne'].solve({ id }); assert.ok(!/\$/.test(p.conclusion), id); }
});

test('téma 10: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId.prebytky;
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 10: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-prebytky', 'graf-mrtva-dan', 'graf-smluvni']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['prebytky', 'prebytky-qp', 'mrtva-regulace', 'mrtva-dan', 'pareto-alokace', 'dva-trhy']) assert.equal(part(id), 'zapocet', id);
  for (const id of ['graf-prebytky', 'graf-mrtva-dan', 'graf-smluvni']) assert.equal(byId[id].generate(makeRng(3)).answerSpec.kind, 'whiteboard');
});
