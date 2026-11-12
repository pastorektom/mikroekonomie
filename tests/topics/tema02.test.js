import { test } from 'node:test';
import assert from 'node:assert/strict';
import tema from '../../js/topics/tema02.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';

// ---------- nezávislé výpočty: hrubé prohledání, žádné vzorce z generátoru ----------
// Najde cenu, při které se poptávané a nabízené množství shodují: nejmenší rozdíl na jemné síti.
function scanP(qd, qs, hi = 2000, step = 0.25) {
  let best = { p: 0, gap: Infinity };
  for (let p = 0; p <= hi; p += step) {
    const gap = Math.abs(qd(p) - qs(p));
    if (gap < best.gap) best = { p, gap };
  }
  return best.p;
}
// U rovnic P(Q) hledáme množství, kde se obě ceny shodují.
function scanQ(pd, ps, hi = 2000, step = 0.25) {
  let best = { q: 0, gap: Infinity };
  for (let q = 0; q <= hi; q += step) {
    const gap = Math.abs(pd(q) - ps(q));
    if (gap < best.gap) best = { q, gap };
  }
  return best.q;
}

const EVENT_RULE = { 'poptavka': ['posD', 'pohS'], 'nabidka': ['posS', 'pohD'], 'cena': ['pohD', 'pohS'] };
// Simulace trhu: Q_D = 100 − 2P, Q_S = 10 + P; změna posune křivku a spočte se nová rovnováha prohledáním.
function simulate(curve, dir) {
  const shift = dir === '+' ? 1 : -1;
  const a = 100 + (curve === 'D' ? 30 * shift : 0);
  const c = 10 + (curve === 'S' ? 20 * shift : 0);
  const p0 = scanP((p) => 100 - 2 * p, (p) => 10 + p);
  const p1 = scanP((p) => a - 2 * p, (p) => c + p);
  const q0 = 100 - 2 * p0; const q1 = a - 2 * p1;
  return `${p1 > p0 ? 'u' : 'd'}${q1 > q0 ? 'u' : 'd'}`;
}

const BOOK_ANO_NE = { 'kn-a': true, 'kn-b': false, 'kn-c': false, 'kn-d': true, 'kn-e': true, 'kn-f': true, 'kn-g': false, 'kn-h': false };

test('téma 2: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'trh');
  assert.equal(tema.order, 2);
  assert.equal(tema.title, 'Trh a tržní mechanismus');
  assert.ok(tema.theory.length >= 5);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 2: výklad obsahuje definice pro zkoušku (term) a časté chyby', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 4);
  assert.ok(tema.theory.some((t) => Array.isArray(t.mistakes) && t.mistakes.length));
});

test('téma 2: 500 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 500,
    independent: {
      rovnovaha: (p) => {
        const { a, b, c, d, ask } = p.data;
        const price = scanP((x) => a - b * x, (x) => c + d * x);
        assert.ok(price > 0 && a - b * price > 0, 'rovnováha mimo kladné hodnoty');
        return ask === 'P' ? price : a - b * price;
      },
      'rovnovaha-inv': (p) => {
        const { A, B, C, D, ask } = p.data;
        const q = scanQ((x) => A - B * x, (x) => C + D * x);
        assert.ok(q > 0 && A - B * q > 0, 'rovnováha mimo kladné hodnoty');
        return ask === 'Q' ? q : A - B * q;
      },
      regulace: (p) => {
        const { a, b, c, d, limit, price } = p.data;
        const qd = a - b * price; const qs = c + d * price;
        assert.ok(qd > 0 && qs > 0, 'množství při regulované ceně musí být kladná');
        const eq = scanP((x) => a - b * x, (x) => c + d * x);
        assert.ok(limit === 'strop' ? price < eq : price > eq, 'strop pod a práh nad rovnovážnou cenou');
        return limit === 'strop' ? qd - qs : qs - qd;
      },
      vykup: (p) => {
        const { A, B, C, D, price } = p.data;
        const qd = (A - price) / B; const qs = (price - C) / D;
        const eq = scanQ((x) => A - B * x, (x) => C + D * x);
        assert.ok(A - B * eq < price, 'výkupní cena nad rovnovážnou');
        assert.ok(Number.isInteger(qd) && Number.isInteger(qs) && qd > 0, 'celá kladná množství');
        return (qs - qd) * price;
      },
      posun: (p) => `${p.data.event.curve}${p.data.event.dir}`,
      'zmena-rovnovahy': (p) => simulate(p.data.event.curve, p.data.event.dir),
      'pohyb-posun': (p) => EVENT_RULE[p.data.event.kind],
      'subst-kompl': (p) => ({ substitut: 'up', komplement: 'down', nezavisle: 'same', normalni: 'up', podradny: 'down', neutralni: 'same' })[p.data.rel],
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
    },
    minDistinct: { rovnovaha: 100, 'rovnovaha-inv': 100, regulace: 100, vykup: 20, posun: 10, 'ano-ne': 10, definice: 6 },
  });
});

test('téma 2: cvičebnice kap. 3, úlohy 12, 14, 15, 16 (pevné příklady dávají výsledky z knihy)', () => {
  const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));
  // úloha 12: P = 80 − 4Q, P = 20 + 2Q → Q = 10, P = 40
  const p12 = byId['rovnovaha-inv'].solve({ A: 80, B: 4, C: 20, D: 2, ask: 'Q' });
  assert.equal(p12.answerSpec.value, 10);
  assert.equal(byId['rovnovaha-inv'].solve({ A: 80, B: 4, C: 20, D: 2, ask: 'P' }).answerSpec.value, 40);
  // úloha 14: P = 100 − 4Q, P = 40 + 2Q → Q = 10, P = 60
  assert.equal(byId['rovnovaha-inv'].solve({ A: 100, B: 4, C: 40, D: 2, ask: 'P' }).answerSpec.value, 60);
  // úloha 15: Q_D = 1020 − 6P, Q_S = 180 + 4P, strop 50 Kč → nedostatek 340 (rovnováha P = 84, Q = 516)
  assert.equal(byId.regulace.solve({ a: 1020, b: 6, c: 180, d: 4, limit: 'strop', price: 50 }).answerSpec.value, 340);
  assert.equal(byId.rovnovaha.solve({ a: 1020, b: 6, c: 180, d: 4, ask: 'P' }).answerSpec.value, 84);
  assert.equal(byId.rovnovaha.solve({ a: 1020, b: 6, c: 180, d: 4, ask: 'Q' }).answerSpec.value, 516);
  // úloha 16: P = 400 − Q, P = 100 + 0,5Q, výkup za 250 Kč → přebytek 150, náklady 37 500 Kč
  assert.equal(byId.vykup.solve({ A: 400, B: 1, C: 100, D: 0.5, price: 250 }).answerSpec.value, 37500);
});

test('téma 2: ano/ne podle cvičebnice (úkoly a–h) mají správné odpovědi', () => {
  const t = tema.types.find((x) => x.id === 'ano-ne');
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 2: pohyb po křivce vs. posun křivky odpovídá tabulce 3.1 (A, C, E: posun D + pohyb po S; B, D: posun S + pohyb po D)', () => {
  const t = tema.types.find((x) => x.id === 'pohyb-posun');
  const expect = {
    'subst-cena': ['posD', 'pohS'], 'technologie': ['posS', 'pohD'], 'prijmy': ['posD', 'pohS'],
    'cena-suroviny': ['posS', 'pohD'], 'moda': ['posD', 'pohS'],
  };
  for (const [id, want] of Object.entries(expect)) {
    assert.deepEqual([...t.solve({ eventId: id }).answerSpec.value].sort(), [...want].sort(), id);
  }
});

test('téma 2: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = tema.types.find((x) => x.id === 'rovnovaha');
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 2: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => tema.types.find((t) => t.id === id).generate(makeRng(1)).part;
  assert.equal(part('definice'), 'zkouska');
  assert.equal(part('graf-posun'), 'zkouska');
  assert.equal(part('graf-rovnovaha'), 'zkouska');
  assert.equal(part('rovnovaha'), 'zapocet');
  assert.equal(part('regulace'), 'zapocet');
});
