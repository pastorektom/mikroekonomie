import { test } from 'node:test';
import assert from 'node:assert/strict';
import tema from '../../js/topics/tema03.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { elasticity, incomeElasticity, crossElasticity } from '../../js/econ.js';

const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));
const solve = (id, data) => byId[id].solve(data);
const val = (id, data) => solve(id, data).answerSpec.value;
const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const r2 = (x) => Math.round(x * 100) / 100;
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const cells = (arr) => [arr.map((x) => String(r6(x)))]; // pole odpovědí tabulky jsou řetězce

// ---------- nezávislé výpočty: prohledávání, přímé dosazení, simulace ----------
// Největší hodnota f(q) na síti.
function argmax(f, lo, hi, step) {
  let best = { x: lo, y: -Infinity };
  for (let x = lo; x <= hi + 1e-9; x += step) { const y = f(x); if (y > best.y + 1e-12) best = { x, y }; }
  return best;
}

// Všechny koše s výdaji do `income`: sestaveno kartézským součinem, bez rekurze generátoru.
function allBundles(goods, income) {
  let combos = [{ q: [], cost: 0, tu: 0 }];
  for (const g of goods) {
    const next = [];
    for (const c of combos) {
      let tu = 0;
      for (let k = 0; k <= g.mu.length; k++) {
        if (k > 0) tu += g.mu[k - 1];
        const cost = c.cost + k * g.price;
        if (cost <= income) next.push({ q: [...c.q, k], cost, tu: c.tu + tu });
      }
    }
    combos = next;
  }
  return combos;
}
function optimalBundles(goods, income) {
  const all = allBundles(goods, income).filter((b) => b.cost === income);
  const maxTu = Math.max(...all.map((b) => b.tu));
  return all.filter((b) => b.tu === maxTu);
}

function applyChange(b, change) {
  const k = { 'duchod+': ['I', 2], 'duchod-': ['I', 0.5], 'cenaX+': ['px', 2], 'cenaX-': ['px', 0.5], 'cenaY+': ['py', 2], 'cenaY-': ['py', 0.5] }[change];
  const n = { ...b };
  if (change === 'vse') { n.I *= 2; n.px *= 2; n.py *= 2; } else n[k[0]] *= k[1];
  return n;
}
// Nejvyšší množství statku, které se vejde do rozpočtu (krok 0,5), a výdaje na druhý statek jsou nulové.
const fits = (income, price) => { let q = 0; while (price * (q + 0.5) <= income + 1e-9) q += 0.5; return q; };

// Simulace trhu s konstantní elasticitou: Q = k·P^(−E). Vrací, jak se změní příjem při změně ceny o 10 %.
function trChange(E, dir) {
  const P0 = 100; const P1 = dir === '+' ? 110 : 90;
  const tr = (P) => P * (10000 * P ** -E);
  const d = tr(P1) - tr(P0);
  return Math.abs(d) < 1e-6 * tr(P0) ? 'stejne' : d > 0 ? 'roste' : 'klesa';
}

const IC_EXPECT = { kava: 'primka', boty: 'uhel', voda: 'rovnobezka', zubar: 'rostouci', rukavice: 'uhel', pepsi: 'primka', chleb: 'konvexni', hudba: 'rovnobezka', jatra: 'rostouci', 'pizza-vic': 'konvexni' };
const BOOK_ANO_NE = { 'kn-a': true, 'kn-b': false, 'kn-c': false, 'kn-d': true, 'kn-e': true, 'kn-f': false, 'kn-g': true, 'kn-h': false, 'kn-i': true, 'kn-j': true, 'kn-k': false, 'kn-l': true, 'kn-m': true, 'kn-n': false, 'kn-o': true };
const EI_CLASS = (E) => (E < 0 ? 'podradny' : E < 1 ? 'normalni-nezbytny' : 'normalni-luxusni');

test('téma 3: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'spotrebitel');
  assert.equal(tema.order, 3);
  assert.equal(tema.title, 'Chování spotřebitele a formování poptávky');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
  assert.ok(tema.theory.some((t) => t.viz), 'výklad má aspoň jeden graf');
});

test('téma 3: výklad obsahuje definice pro zkoušku (term) a časté chyby', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
});

test('téma 3: texty bez Markdownu a bez podtržítka mimo vzorce', () => {
  const strip = (s) => String(s).replace(/\$[^$]*\$/g, '');
  const bad = (s, where) => {
    const t = strip(s);
    assert.ok(!t.includes('_'), `${where}: podtržítko mimo vzorec: ${t}`);
    assert.ok(!t.includes('*') && !t.includes('#'), `${where}: Markdown: ${t}`);
  };
  for (const t of tema.theory) {
    bad(t.heading, 'heading'); bad(t.text, `výklad ${t.heading}`);
    for (const m of t.mistakes || []) bad(m, 'chyba');
  }
  for (const type of tema.types) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = type.generate(makeRng(seed)); const w = `${type.id} seed ${seed}`;
      bad(p.task, `${w} zadání`); bad(p.conclusion ?? '', `${w} závěr`);
      for (const o of p.answerSpec.options || []) bad(o.text, `${w} možnost`);
      for (const s of p.solution) { bad(s.title, `${w} název kroku`); bad(s.text, `${w} text kroku`); }
      assert.ok(p.solution.length >= 3, `${w}: aspoň 3 kroky`);
      const dollars = (s) => (String(s).match(/\$/g) || []).length;
      for (const s of p.solution) assert.equal(dollars(s.text) % 2, 0, `${w}: lichý počet $ v textu kroku`);
      assert.equal(dollars(p.task), 0, `${w}: v zadání nemá být $`);
      assert.equal(dollars(p.conclusion ?? ''), 0, `${w}: v závěru nemá být $`);
    }
  }
});

test('téma 3: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'mu-derivace': (p) => {
        const { a, b, q } = p.data; const TU = (x) => a * x - b * x * x; const h = 1e-3;
        assert.ok(a - 2 * b * q > 0, 'MU kladný');
        return Math.round(((TU(q + h) - TU(q - h)) / (2 * h)) * 1e4) / 1e4;
      },
      'tu-maximum': (p) => {
        const { b, m, ask } = p.data; const a = 2 * b * m; const best = argmax((x) => a * x - b * x * x, 0, 100, 0.5);
        return ask === 'Q' ? best.x : best.y;
      },
      'mu-tabulka': (p) => cells(p.data.tu.map((t, i, arr) => (i === 0 ? t : t - arr[i - 1]))),
      'optimum-tabulka': (p) => {
        const { goods, income } = p.data;
        const opt = optimalBundles(goods, income);
        assert.equal(opt.length, 1, 'jediné optimum');
        return cells(opt[0].q);
      },
      'optimum-cobb': (p) => {
        const { px, py, H, ask } = p.data; const I = 2 * H;
        const best = argmax((x) => x * ((I - px * x) / py), 0, I / px, 0.5);
        const y = (I - px * best.x) / py;
        return ask === 'X' ? best.x : ask === 'Y' ? y : best.y;
      },
      'rozpocet-primka': (p) => {
        const { I, px, py, ask, x0 } = p.data;
        if (ask === 'x') return fits(I, px);
        if (ask === 'y') return fits(I, py);
        let y = 0; while (px * x0 + py * (y + 1) <= I) y++;
        assert.equal(px * x0 + py * y, I, 'spotřebuje se celý důchod');
        return y;
      },
      'rozpocet-z-grafu': (p) => {
        const { xMax, yMax, px, ask } = p.data;
        const I = px * xMax; let py = 0; for (let c = 1; c <= 500; c++) if (I / c === yMax) py = c;
        assert.ok(py > 0, 'cena Y nalezena');
        return ask === 'I' ? I : py;
      },
      'rozpocet-zmena': (p) => {
        const { I, px, py, change, ask } = p.data; const n = applyChange({ I, px, py }, change);
        return ask === 'x' ? fits(n.I, n.px) : fits(n.I, n.py);
      },
      mrs: (p) => {
        const d = p.data;
        if (d.mode === 'mu') return d.a / d.b;
        if (d.mode === 'presun') return Math.abs((d.y1 - d.y0) / (d.x1 - d.x0));
        // optimum: sklon rozpočtové přímky v absolutní hodnotě
        const slope = (-d.px) / d.py; return Math.abs(slope);
      },
      'rovnovaha-spotrebitele': (p) => {
        const { px, py, I, x, y, mux, muy } = p.data;
        if (mux === null) return 'nelze';
        const spent = px * x + py * y;
        if (spent < I - 1e-9) return 'vice-obou';
        const gain = mux / px - muy / py; // užitek z přesunu jedné koruny od Y k X
        return Math.abs(gain) < 1e-9 ? 'rovnovaha' : gain > 0 ? 'vice-x' : 'vice-y';
      },
      'elasticita-cenova': (p) => {
        const { p0, p1, q0, q1 } = p.data;
        return r6(Math.abs(elasticity({ q0, q1, p0, p1, midpoint: false })));
      },
      'elasticita-bodova': (p) => {
        const { a, b, q, ask } = p.data; const Q = (P) => a - b * P;
        let P = 0; for (let c = 0; c <= a / b; c += 0.5) if (Math.abs(Q(c) - q) < 1e-9) P = c;
        assert.ok(P > 0, 'cena nalezena');
        if (ask === 'TR') return P * q;
        const h = 1e-4; const slope = (Q(P + h) - Q(P - h)) / (2 * h);
        return r6(Math.abs(slope) * P / q);
      },
      'elasticita-klasifikace': (p) => {
        const E = p.data.E;
        return E === null ? 'dok-el' : E === 0 ? 'dok-neel' : Math.abs(E - 1) < 1e-12 ? 'jednot' : E > 1 ? 'el' : 'neel';
      },
      'elasticita-trzby': (p) => trChange(p.data.E, p.data.dir),
      'trzby-tabulka': (p) => cells(p.data.p.map((x, i) => x * p.data.q[i])),
      'trzby-maximum': (p) => {
        const { a, b, ask } = p.data; const best = argmax((P) => P * (a - b * P), 0, a / b, 0.25);
        return ask === 'P' ? best.x : ask === 'Q' ? a - b * best.x : best.y;
      },
      duchodova: (p) => r2(incomeElasticity({ q0: p.data.q0, q1: p.data.q1, i0: p.data.i0, i1: p.data.i1, midpoint: false })),
      'klasifikace-statku': (p) => EI_CLASS(r2(incomeElasticity({ q0: p.data.q0, q1: p.data.q1, i0: p.data.i0, i1: p.data.i1, midpoint: false }))),
      'krizova-zmena': (p) => {
        const { ec, p0, p1 } = p.data; return r6(ec * ((p1 - p0) / p0) * 100);
      },
      'krizova-vztah': (p) => {
        const { pa0, pa1, qb0, qb1 } = p.data;
        const E = crossElasticity({ q0: qb0, q1: qb1, pOther0: pa0, pOther1: pa1, midpoint: false });
        return Math.abs(E) < 1e-12 ? 'nezav' : E > 0 ? 'subst' : 'kompl';
      },
      'indiference-tvar': (p) => IC_EXPECT[p.data.id],
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
      definice: () => 'o0',
    },
    minDistinct: {
      'mu-derivace': 50, 'tu-maximum': 20, 'mu-tabulka': 100, 'optimum-tabulka': 100, 'optimum-cobb': 20, 'rozpocet-primka': 20, 'rozpocet-z-grafu': 10,
      'rozpocet-zmena': 20, mrs: 20, 'rovnovaha-spotrebitele': 50, 'elasticita-cenova': 30, 'elasticita-bodova': 10, 'elasticita-klasifikace': 8,
      'elasticita-trzby': 8, 'trzby-tabulka': 50, 'trzby-maximum': 30, duchodova: 15, 'klasifikace-statku': 15, 'krizova-zmena': 15, 'krizova-vztah': 15,
      'indiference-tvar': 8, 'test-vyber': 8, 'ano-ne': 15, definice: 8, 'graf-optimum': 8, 'graf-rozpocet-posun': 10, 'graf-engel': 2, 'graf-indiference': 4,
    },
  });
});

test('téma 3: cvičebnice kap. 4, příklady 2, 3, 4, 5 (užitek a optimum spotřebitele)', () => {
  // 2: TU = 30Q − Q², MU při Q = 8 (derivace) = 14
  assert.equal(val('mu-derivace', { a: 30, b: 1, q: 8 }), 14);
  // 3a, 3b: TU = 10Q − Q²: MU = 10 − 2Q, celkový užitek je největší při Q = 5
  assert.equal(val('tu-maximum', { b: 1, m: 5, ask: 'Q' }), 5);
  assert.equal(val('tu-maximum', { b: 1, m: 5, ask: 'TU' }), 25);
  // 4: pivo 20 Kč, lístek 200 Kč, hamburger 40 Kč, 600 Kč → 4 piva, 2 lístky, 3 hamburgery
  const goods4 = [
    { name: 'pivo', price: 20, mu: [40, 20, 8, 4, 1] },
    { name: 'lístek do kina', price: 200, mu: [40, 40, 40, 40, 40] },
    { name: 'hamburger', price: 40, mu: [40, 24, 8, 4, 1] },
  ];
  assert.deepEqual(val('optimum-tabulka', { goods: goods4, income: 600 }), cells([4, 2, 3]));
  const opt4 = optimalBundles(goods4, 600);
  assert.equal(opt4.length, 1);
  assert.deepEqual(opt4[0].q, [4, 2, 3]);
  // 5: káva 15 EUR, oblečení 75 EUR, 300 EUR → 5 balení kávy a 3 kusy oblečení; TU při 10 + 2 = 1001
  const tuCoffee = [60, 111, 156, 196, 232, 265, 295, 322, 347, 371];
  const tuCloth = [360, 630, 810, 945, 1050, 1140, 1215, 1275, 1320, 1350];
  const diff = (tu) => tu.map((t, i) => t - (i ? tu[i - 1] : 0));
  assert.deepEqual(val('mu-tabulka', { tu: tuCoffee }), cells([60, 51, 45, 40, 36, 33, 30, 27, 25, 24]));
  assert.equal(tuCoffee[9] + tuCloth[1], 1001);
  assert.deepEqual(val('optimum-tabulka', { goods: [{ name: 'káva', price: 15, mu: diff(tuCoffee) }, { name: 'oblečení', price: 75, mu: diff(tuCloth) }], income: 300 }), cells([5, 3]));
});

test('téma 3: cvičebnice kap. 4, příklad 6 (je spotřebitel v rovnováze: a–d)', () => {
  const base = { px: 5, py: 4, I: 50 };
  assert.equal(val('rovnovaha-spotrebitele', { ...base, x: 2, y: 10, mux: null, muy: null, tux: 500, tuy: 400 }), 'nelze');
  assert.equal(val('rovnovaha-spotrebitele', { ...base, x: 6, y: 5, mux: 60, muy: 30 }), 'vice-x');
  assert.equal(val('rovnovaha-spotrebitele', { ...base, x: 6, y: 5, mux: 25, muy: 20 }), 'rovnovaha');
  assert.equal(val('rovnovaha-spotrebitele', { ...base, x: 6, y: 4, mux: 25, muy: 20 }), 'vice-obou');
});

test('téma 3: cvičebnice kap. 4, příklady 8, 9 (rozpočtová přímka)', () => {
  // 8a: I = 100, PX = 10, PY = 25 → 10 jednotek X nebo 4 jednotky Y
  assert.equal(val('rozpocet-primka', { I: 100, px: 10, py: 25, ask: 'x', x0: null }), 10);
  assert.equal(val('rozpocet-primka', { I: 100, px: 10, py: 25, ask: 'y', x0: null }), 4);
  // 8c: cena Y klesne na 12,50 → 8 jednotek Y, osa X beze změny
  assert.equal(val('rozpocet-zmena', { I: 100, px: 10, py: 25, change: 'cenaY-', ask: 'y' }), 8);
  assert.equal(val('rozpocet-zmena', { I: 100, px: 10, py: 25, change: 'cenaY-', ask: 'x' }), 10);
  // 8d: 200 Kč, ceny 20 a 50: stejná přímka jako v 8a
  assert.equal(val('rozpocet-zmena', { I: 100, px: 10, py: 25, change: 'vse', ask: 'x' }), 10);
  assert.equal(val('rozpocet-zmena', { I: 100, px: 10, py: 25, change: 'vse', ask: 'y' }), 4);
  // 9: X = 50, Y = 40, PX = 20 → I = 1 000 Kč, PY = 25 Kč; 20X + 25Y = 1 000
  assert.equal(val('rozpocet-z-grafu', { xMax: 50, yMax: 40, px: 20, ask: 'I' }), 1000);
  assert.equal(val('rozpocet-z-grafu', { xMax: 50, yMax: 40, px: 20, ask: 'PY' }), 25);
  assert.equal(val('rozpocet-primka', { I: 500, px: 20, py: 25, ask: 'x', x0: null }), 25);
});

test('téma 3: cvičebnice kap. 4, příklady 13, 14, 17, 20, 16 (elasticity)', () => {
  // 13b: celkové příjmy 21; 36; 45; 48; 45; 36; 21
  const tr = val('trzby-tabulka', { p: [2.1, 1.8, 1.5, 1.2, 0.9, 0.6, 0.3], q: [10, 20, 30, 40, 50, 60, 70] })[0];
  [21, 36, 45, 48, 45, 36, 21].forEach((v, i) => close(Number(tr[i]), v));
  // 13e, 13f: příjmy jsou největší (a elasticita je 1) v polovině maximální ceny; zde Q = 240 − 2P → P = 60
  assert.equal(val('trzby-maximum', { a: 240, b: 2, m: 60, ask: 'P' }), 60);
  // 14: Q = 1 600 − 14P při 200 ks: TR = 20 000, E = 7
  assert.equal(val('elasticita-bodova', { a: 1600, b: 14, q: 200, ask: 'TR' }), 20000);
  assert.equal(val('elasticita-bodova', { a: 1600, b: 14, q: 200, ask: 'E' }), 7);
  // 17: Ekáva,čaj = 2, cena kávy 20 → 30 Kč: poptávka po čaji +100 %
  assert.equal(val('krizova-zmena', { a: 'káva', b: 'čaj', ec: 2, p0: 20, p1: 30 }), 100);
  // 20: důchod 100 → 150, výrobky A–D
  const goods = { A: [30, 40, 0.67, 'normalni-nezbytny'], B: [30, 60, 2, 'normalni-luxusni'], C: [25, 15, -0.8, 'podradny'], D: [15, 35, 2.67, 'normalni-luxusni'] };
  for (const [k, [q0, q1, E, cls]] of Object.entries(goods)) {
    const d = { i0: 100, i1: 150, q0, q1 };
    close(val('duchodova', d), E, 0.005);
    assert.equal(val('klasifikace-statku', d), cls, k);
  }
  // 16: mobil a kryt (komplementy), Pepsi a Coca-Cola (substituty), boty a žárovky (nezávislé)
  assert.equal(val('krizova-vztah', { a: 'mobil', b: 'kryt', pa0: 100, pa1: 150, qb0: 100, qb1: 80 }), 'kompl');
  assert.equal(val('krizova-vztah', { a: 'Pepsi', b: 'Cola', pa0: 20, pa1: 30, qb0: 100, qb1: 120 }), 'subst');
  assert.equal(val('krizova-vztah', { a: 'boty', b: 'žárovky', pa0: 100, pa1: 150, qb0: 100, qb1: 100 }), 'nezav');
  // elasticita z dvou bodů: cena +10 %, množství −10 % → E = 1
  assert.equal(val('elasticita-cenova', { p0: 100, p1: 110, q0: 1000, q1: 900 }), 1);
  // C-a: elastická poptávka a pokles ceny zvyšují příjem; E < 1 a růst ceny také
  assert.equal(val('elasticita-trzby', { E: 2, dir: '-' }), 'roste');
  assert.equal(val('elasticita-trzby', { E: 0.5, dir: '+' }), 'roste');
  assert.equal(val('elasticita-trzby', { E: 2, dir: '+' }), 'klesa');
});

test('téma 3: cvičebnice kap. 4, příklad 1, 10 a 12 (výběr z možností a tvar křivek)', () => {
  assert.equal(val('test-vyber', { id: 'tresne' }), 'o3'); // 1 d)
  assert.equal(val('test-vyber', { id: 'elast-roste' }), 'o3'); // 12 d)
  for (const [id, shape] of Object.entries({ kava: 'primka', voda: 'rovnobezka', boty: 'uhel', zubar: 'rostouci' })) {
    assert.equal(val('indiference-tvar', { id }), shape);
  }
});

test('téma 3: ano/ne podle cvičebnice (úkoly a–o) mají správné odpovědi', () => {
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = solve('ano-ne', { id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 3: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-optimum', 'graf-rozpocet-posun', 'graf-engel', 'graf-indiference']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['mu-derivace', 'optimum-tabulka', 'rozpocet-primka', 'elasticita-cenova', 'ano-ne']) assert.equal(part(id), 'zapocet', id);
  const wb = (id) => byId[id].generate(makeRng(3)).answerSpec.kind;
  for (const id of ['graf-optimum', 'graf-rozpocet-posun', 'graf-engel', 'graf-indiference']) assert.equal(wb(id), 'whiteboard', id);
});

test('téma 3: tabulkové úlohy mají odpověď typu table a počet polí odpovídá zadání', () => {
  for (const id of ['mu-tabulka', 'optimum-tabulka', 'trzby-tabulka']) {
    const p = byId[id].generate(makeRng(5));
    assert.equal(p.answerSpec.kind, 'table', id);
    assert.equal(p.answerSpec.value.length, 1);
    assert.ok(p.answerSpec.value[0].length >= 2, id);
  }
  assert.equal(byId['mu-tabulka'].generate(makeRng(5)).answerSpec.value[0].length, 5);
});

test('téma 3: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['mu-derivace'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});
