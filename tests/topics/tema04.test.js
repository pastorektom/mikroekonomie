import { test } from 'node:test';
import assert from 'node:assert/strict';
import tema, { _costMinima } from '../../js/topics/tema04.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { check } from '../../js/checker.js';
import { compileFn } from '../../js/viz/common.js';

// ---------- nezávislé výpočty (jiný postup než generátor) ----------
// Derivace polynomu Richardsonovou extrapolací ze dvou symetrických diferencí (pro polynom do 3. stupně přesná).
function derivative(f, x) {
  const D = (h) => (f(x + h) - f(x - h)) / (2 * h);
  return (4 * D(0.25) - D(0.5)) / 3;
}
const round2 = (x) => String(Math.round(x * 100) / 100);
const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));

// maximum zisku hrubým prohledáním výstupu po půlkusech
function bestQ(profit, hi = 600) {
  let best = { q: 0, pi: -Infinity };
  for (let q = 0; q <= hi; q += 0.5) {
    const pi = profit(q);
    if (pi > best.pi + 1e-9) best = { q, pi };
  }
  return best;
}

const BOOK_ANO_NE = {
  'kn-a': false, 'kn-b': false, 'kn-c': true, 'kn-d': false, 'kn-e': false,
  'kn-f': true, // kniha uvádí N, správně je A (nákladové křivky jsou ekonomické, tedy včetně implicitních nákladů)
  'kn-g': true, 'kn-h': false, 'kn-i': false, 'kn-j': true, 'kn-k': false, 'kn-l': false, 'kn-m': false, 'kn-n': true, 'kn-o': false, 'kn-p': true, 'kn-q': true,
};

test('téma 4: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'nabidka');
  assert.equal(tema.order, 4);
  assert.equal(tema.title, 'Nabídka na trhu výrobků a služeb');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 4: výklad obsahuje definice pro zkoušku (term), časté chyby a grafy', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 7);
  assert.ok(tema.theory.filter((t) => t.viz).length >= 4);
});

test('téma 4: typy úloh pokrývají čísla, tabulky, výraz, výběr, pravda/nepravda i tabuli', () => {
  const kinds = new Set(tema.types.map((t) => t.generate(makeRng(3)).answerSpec.kind));
  for (const k of ['number', 'table', 'expression', 'choice', 'multichoice', 'truefalse', 'whiteboard']) {
    const has = kinds.has(k) || tema.types.some((t) => { for (let s = 1; s < 40; s++) if (t.generate(makeRng(s)).answerSpec.kind === k) return true; return false; });
    assert.ok(has, `chybí druh odpovědi ${k}`);
  }
});

// ---------- texty: žádný Markdown, žádné podtržítko ani desetinná tečka mimo vzorec ----------
const outsideMath = (s) => String(s).replace(/\$[^$]*\$/g, '');
function checkPlain(s, where) {
  const t = outsideMath(s);
  assert.ok(!/[_*]/.test(t), `${where}: podtržítko nebo hvězdička v textu: ${t}`);
  assert.ok(!/\d\.\d/.test(t), `${where}: desetinná tečka v textu: ${t}`);
  assert.equal((String(s).match(/\$/g) || []).length % 2, 0, `${where}: nepárový znak $`);
}
test('téma 4: texty příkladů i výkladu jsou česky psané prostým textem', () => {
  for (const type of tema.types) {
    for (let seed = 1; seed <= 60; seed++) {
      const p = type.generate(makeRng(seed));
      const where = `${type.id} seed ${seed}`;
      checkPlain(p.task, `${where} zadání`);
      if (p.conclusion) checkPlain(p.conclusion, `${where} závěr`);
      for (const [i, s] of p.solution.entries()) { checkPlain(s.title, `${where} krok ${i + 1} název`); checkPlain(s.text, `${where} krok ${i + 1}`); }
      for (const o of p.answerSpec.options || []) checkPlain(o.text, `${where} možnost`);
      assert.ok(p.solution[p.solution.length - 1].text.length > 5, `${where}: poslední krok bez textu`);
    }
  }
  for (const t of tema.theory) {
    checkPlain(t.text, `výklad ${t.heading}`);
    for (const m of t.mistakes || []) checkPlain(m, `chyba ${t.heading}`);
  }
});

// ---------- hlavní ověření ----------
test('téma 4: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'ucetni-zisk': (p) => {
        const { tr, explicit, implicit, ask } = p.data;
        return ask === 'ekonomicky' ? (tr - implicit) - explicit : tr - explicit;
      },
      'mezni-produkt': (p) => {
        const tp = p.data.tp;
        const rows = [];
        let before = 0;
        for (let i = 0; i < tp.length; i++) { rows.push([round2(tp[i] - before), round2(tp[i] / (i + 1))]); before = tp[i]; }
        assert.deepEqual(p.answerSpec.value, rows);
        // součet mezních produktů musí dát celkový produkt
        assert.equal(rows.reduce((s, r) => s + Number(r[0]), 0), tp[tp.length - 1]);
        return p.answerSpec.value;
      },
      'prod-polynom': (p) => {
        const { a, b, c, L, ask } = p.data;
        const f = (x) => a * x + b * x * x - c * x * x * x;
        return ask === 'MP' ? derivative(f, L) : f(L) / L;
      },
      'cobb-douglas': (p) => {
        const { m, L, K, ask } = p.data;
        if (ask === 'Q') { for (let q = 0; q < 1e5; q++) if (q * q === m * m * L * K) return q; return null; }
        const Q = (() => { for (let q = 0; q < 1e5; q++) if (q * q === m * m * L * K) return q; return 0; })();
        for (let k = 1; k < 1e5; k++) if (m * m * L * k === Q * Q) return k;
        return null;
      },
      'vynosy-rozsah': (p) => {
        const { q0, k, q1 } = p.data;
        const outputGrowth = ((q1 - q0) / q0) * 100; const inputGrowth = (k - 1) * 100;
        return Math.abs(outputGrowth - inputGrowth) < 1e-9 ? 'konst' : outputGrowth > inputGrowth ? 'rost' : 'klesa';
      },
      mrts: (p) => {
        const { ask, dL, dK, mpl, mpk } = p.data;
        return ask === 'izokvanta' ? Math.abs(-dK / dL) : mpl / mpk;
      },
      'izokosta-bod': (p) => {
        const { TC, w, r, ask, L } = p.data;
        const maxUnits = (price) => { let k = 0; while (price * (k + 1) <= TC) k++; return k; };
        if (ask === 'K0') return maxUnits(r);
        if (ask === 'L0') return maxUnits(w);
        for (let k = 0; k <= TC / r; k++) if (w * L + r * k === TC) return k;
        return null;
      },
      'izokosta-rovnice': (p) => {
        const { TC, w, r } = p.data;
        for (const L of [0, 1, 2.5, 7, -3]) {
          const K = (TC - w * L) / r; // z TC = wL + rK
          assert.equal(check(p.answerSpec, `${TC / r} - ${w / r}*L`).ok, true);
          assert.ok(Math.abs(w * L + r * K - TC) < 1e-9);
        }
        assert.equal(check(p.answerSpec, `${TC / r} - ${w / r + 1}*L`).ok, false);
        return p.answerSpec.value;
      },
      'optimum-kombinace': (p) => {
        const { ratios, pl, pk, plNew, ask } = p.data;
        const target = (ask === 'nova' ? plNew : pl) / pk;
        let best = 0;
        for (let i = 1; i < ratios.length; i++) if (Math.abs(ratios[i] - target) < Math.abs(ratios[best] - target)) best = i;
        assert.ok(Math.abs(ratios[best] - target) < 1e-9, 'v tabulce není přesně hledaný poměr');
        return 'ABCDE'[best];
      },
      'mppk-pravidlo': (p) => {
        const { w, r } = p.data;
        const mpl = Number(/práce je (\d+) kusů/.exec(p.task)[1]);
        for (let m = 1; m < 200000; m++) if (m * w === mpl * r) return m;
        return null;
      },
      'kratke-naklady': (p) => {
        const { K, pk, w, Ls, qs, idx, ask } = p.data;
        const fixed = K * pk;
        const workers = Ls[qs.indexOf(qs[idx])];
        return ask === 'FC' ? fixed : fixed + workers * w;
      },
      'vydaje-faktory': (p) => {
        let total = 0;
        for (const it of p.data.items) total += it.qty * it.price;
        return total;
      },
      'naklady-tabulka': (p) => {
        const { fc, tc } = p.data;
        const rows = [];
        for (let q = 1; q <= tc.length; q++) {
          const total = tc[q - 1]; const prev = q === 1 ? fc : tc[q - 2];
          const vc = total - fc;
          rows.push([round2(vc), round2(total - prev), round2(fc / q), round2(total / q), round2(vc / q)]);
          assert.ok(Math.abs(fc / q + vc / q - total / q) < 1e-9, 'AC = AFC + AVC');
        }
        assert.deepEqual(p.answerSpec.value, rows);
        return p.answerSpec.value;
      },
      'naklady-polynom': (p) => {
        const { fc, a, b, c, Q, ask } = p.data;
        const tc = (x) => fc + a * x - b * x * x + c * x * x * x;
        const v = { FC: tc(0), VC: tc(Q) - tc(0), AFC: fc / Q, AC: tc(Q) / Q, MC: derivative(tc, Q) };
        return v[ask];
      },
      'tabulka-prijmu': (p) => {
        const rows = [];
        const tr = (q) => p.data.p[q - 1] * q;
        for (let q = 1; q <= p.data.p.length; q++) rows.push([String(tr(q)), String(tr(q) - (q > 1 ? tr(q - 1) : 0)), String(tr(q) / q)]);
        assert.deepEqual(p.answerSpec.value, rows);
        return p.answerSpec.value;
      },
      'prumerny-prijem': (p) => {
        const { units, price } = p.data;
        const ar = (units * price) / units;
        return p.answerSpec.options.find((o) => o.text === `AR = ${String(ar).replace('.', ',')} Kč`).id;
      },
      'zlate-konkurence': (p) => {
        const { P, fc, c, d, ask } = p.data;
        const best = bestQ((q) => P * q - (fc + c * q + d * q * q));
        return ask === 'Q' ? best.q : best.pi;
      },
      'zlate-mr': (p) => {
        const { A, B, fc, m, n, ask } = p.data;
        const best = bestQ((q) => (A - B * q) * q - (fc + m * q + n * q * q));
        return ask === 'Q' ? best.q : ask === 'P' ? A - B * best.q : best.pi;
      },
      'elasticita-nabidky': (p) => {
        const { c, d, P } = p.data;
        const qs = (price) => c + d * price;
        return ((qs(P + 1) - qs(P)) / 1) * (P / qs(P));
      },
      'elasticita-typ': (p) => {
        const { dp, dq } = p.data;
        return dq > dp ? 'el' : dq < dp ? 'neel' : 'jed';
      },
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
    },
    minDistinct: {
      'ucetni-zisk': 100, 'mezni-produkt': 50, 'prod-polynom': 100, 'cobb-douglas': 30, 'vynosy-rozsah': 20, mrts: 10, 'izokosta-bod': 20,
      'izokosta-rovnice': 10, 'optimum-kombinace': 20, 'mppk-pravidlo': 30, 'kratke-naklady': 30, 'vydaje-faktory': 100, 'naklady-tabulka': 100,
      'naklady-polynom': 50, 'tabulka-prijmu': 30, 'prumerny-prijem': 10, 'zlate-konkurence': 100, 'zlate-mr': 100, 'elasticita-nabidky': 20,
      'elasticita-typ': 6, 'vyber-teorie': 7, 'ano-ne': 15, definice: 10, 'graf-naklady': 3, 'graf-produkt': 4, 'graf-izokvanta': 10, 'graf-zlate': 50,
    },
  });
});

// ---------- pevné příklady ze cvičebnice kap. 5 (část E Řešení) ----------
test('cvičebnice kap. 5, úloha 1: mezní a průměrný produkt (Tab. 5.1)', () => {
  const p = byId['mezni-produkt'].solve({ tp: [500, 1300, 1900, 2300, 2500] });
  assert.deepEqual(p.answerSpec.value, [['500', '500'], ['800', '650'], ['600', '633.33'], ['400', '575'], ['200', '500']]);
  // kniha uvádí 633 (zaokrouhleno), tolerance 0,01 přijme 633,33, nikoli 633
  assert.equal(check(p.answerSpec, [['500', '500'], ['800', '650'], ['600', '633,33'], ['400', '575'], ['200', '500']]).ok, true);
  assert.equal(check(p.answerSpec, [['500', '500'], ['800', '650'], ['600', '633'], ['400', '575'], ['200', '500']]).ok, false);
});

test('cvičebnice kap. 5, úloha 2: nákladové optimum a izokosta', () => {
  const a = byId['optimum-kombinace'].solve({ ratios: [4, 3.5, 3, 2.5, 2], pl: 5, pk: 2, plNew: 4, ask: 'puvodni' });
  assert.equal(a.answerSpec.value, 'D');
  const b = byId['optimum-kombinace'].solve({ ratios: [4, 3.5, 3, 2.5, 2], pl: 5, pk: 2, plNew: 4, ask: 'nova' });
  assert.equal(b.answerSpec.value, 'E');
  // výklad ve skriptech má řadu 5; 4; 3; 2,5; 2 a tytéž odpovědi
  assert.equal(byId['optimum-kombinace'].solve({ ratios: [5, 4, 3, 2.5, 2], pl: 5, pk: 2, plNew: 4, ask: 'nova' }).answerSpec.value, 'E');
  // c) 5L + 2K = 100  ⇒  K = (100 − 5L)/2
  const iso = byId['izokosta-rovnice'].solve({ TC: 100, w: 5, r: 2 });
  for (const ok of ['(100-5*L)/2', '50 - 2.5*L', '50-2,5L', '(100 - 5L)/2']) assert.equal(check(iso.answerSpec, ok).ok, true, ok);
  assert.equal(check(iso.answerSpec, '100 - 5*L').ok, false);
  assert.equal(byId['izokosta-bod'].solve({ TC: 100, w: 5, r: 2, ask: 'K0', L: 0 }).answerSpec.value, 50);
  assert.equal(byId['izokosta-bod'].solve({ TC: 100, w: 5, r: 2, ask: 'L0', L: 0 }).answerSpec.value, 20);
});

test('cvičebnice kap. 5, úlohy 3, 4, 5, 6, 7, 8', () => {
  assert.equal(byId['mppk-pravidlo'].solve({ w: 60, r: 200, k: 3 }).answerSpec.value, 600); // úloha 3
  assert.equal(byId['prod-polynom'].solve({ a: 150, b: 40, c: 3, L: 6, ask: 'MP' }).answerSpec.value, 306); // 4c
  assert.equal(byId['prod-polynom'].solve({ a: 150, b: 40, c: 3, L: 6, ask: 'AP' }).answerSpec.value, 282); // APPL = 150 + 40L − 3L²
  assert.equal(byId['cobb-douglas'].solve({ m: 2, L: 100, K: 100, ask: 'Q' }).answerSpec.value, 200); // 5a
  assert.equal(byId['cobb-douglas'].solve({ m: 2, L: 25, K: 400, ask: 'K' }).answerSpec.value, 400); // 5b
  const six = byId['vydaje-faktory'].solve({ items: [{ name: 'půda', qty: 10, price: 2, mpp: 2 }, { name: 'práce', qty: 30, price: 1, mpp: 3 }, { name: 'kapitál', qty: 20, price: 3, mpp: 1 }] });
  assert.equal(six.answerSpec.value, 110); // 6a
  assert.match(six.conclusion, /splněno není/); // 6b
  assert.equal(byId['vynosy-rozsah'].solve({ q0: 58.5, k: 2, q1: 117 }).answerSpec.value, 'konst'); // 7f: TPP = 117
  assert.equal(byId['vynosy-rozsah'].solve({ q0: 54, k: 2, q1: 108 }).answerSpec.value, 'konst'); // 7e
  const tab = { K: 10, pk: 300, w: 50, Ls: [0, 1, 2], qs: [0, 10, 15] };
  assert.equal(byId['kratke-naklady'].solve({ ...tab, idx: 2, ask: 'FC' }).answerSpec.value, 3000); // 8a
  assert.equal(byId['kratke-naklady'].solve({ ...tab, idx: 1, ask: 'TC' }).answerSpec.value, 3050); // 8b
});

test('cvičebnice kap. 5, úlohy 9, 11, 12 (tabulky nákladů a příjmů, průměrný příjem)', () => {
  const t9 = byId['naklady-tabulka'].solve({ fc: 10, tc: [20, 28, 34, 42] });
  assert.deepEqual(t9.answerSpec.value, [['10', '10', '10', '20', '10'], ['18', '8', '5', '14', '9'], ['24', '6', '3.33', '11.33', '8'], ['32', '8', '2.5', '10.5', '8']]);
  const t11 = byId['tabulka-prijmu'].solve({ p: [100, 90, 80, 70] });
  assert.deepEqual(t11.answerSpec.value, [['100', '100', '100'], ['180', '80', '90'], ['240', '60', '80'], ['280', '40', '70']]);
  const t12 = byId['prumerny-prijem'].solve({ units: 5000, price: 50 });
  assert.equal(t12.answerSpec.options.find((o) => o.id === t12.answerSpec.value).text, 'AR = 50 Kč');
});

test('cvičebnice kap. 5, úloha 14: TC = 3000 + 30Q − 12Q² + 2Q³', () => {
  const d = { fc: 3000, a: 30, b: 12, c: 2 };
  assert.equal(byId['naklady-polynom'].solve({ ...d, Q: 5, ask: 'FC' }).answerSpec.value, 3000);
  assert.equal(byId['naklady-polynom'].solve({ ...d, Q: 1000, ask: 'AFC' }).answerSpec.value, 3);
  assert.equal(byId['naklady-polynom'].solve({ ...d, Q: 5, ask: 'MC' }).answerSpec.value, 60); // derivace TC (rozdíl TC(5) − TC(4) by dal 44)
  assert.equal(byId['naklady-polynom'].solve({ ...d, Q: 5, ask: 'VC' }).answerSpec.value, 100);
  // e) AC = 3000/Q + 30 − 12Q + 2Q²
  assert.equal(byId['naklady-polynom'].solve({ ...d, Q: 5, ask: 'AC' }).answerSpec.value, 3000 / 5 + 30 - 60 + 50);
});

test('cvičebnice kap. 5: úkoly ano/ne a)–q) (f) je v knize chybně N, správně A) a části D', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) assert.equal(t.solve({ id }).answerSpec.value, truth, id);
  const nepravdive = byId['vyber-teorie'].solve({ id: 'mc-nepravdive' });
  const text = (id) => nepravdive.answerSpec.options.find((o) => o.id === id).text;
  assert.deepEqual(nepravdive.answerSpec.value.map(text).sort(), [
    'Mezní náklady částečně závisejí na fixních nákladech.', 'Mezní náklady nejsou ovlivněny růstem cen vstupů.',
  ].sort()); // D5: d) a e)
  assert.equal(nepravdive.answerSpec.kind, 'multichoice');
});

// ---------- geometrie grafů ----------
test('grafy nákladů: MC protíná AVC a AC v jejich minimech (výrazy v x)', () => {
  for (const b of [4, 5, 6]) {
    const ref = byId['graf-naklady'].solve({ b }).answerSpec.reference.data;
    const f = Object.fromEntries(ref.curves.map((c) => [c.label, compileFn(c.expr)]));
    const mins = _costMinima(b);
    assert.ok(Math.abs(mins.avc.x - b) < 1e-3 && Math.abs(mins.ac.x - (b + 1)) < 1e-3, 'minima AVC a AC');
    assert.ok(Math.abs(f.MC(mins.avc.x) - f.AVC(mins.avc.x)) < 1e-3, 'MC protíná AVC v minimu');
    assert.ok(Math.abs(f.MC(mins.ac.x) - f.AC(mins.ac.x)) < 1e-3, 'MC protíná AC v minimu');
    assert.ok(f.AC(b) > f.AVC(b), 'AC leží nad AVC');
    assert.ok(f.MC(2) < f.MC(0) && f.MC(10) > f.MC(6), 'MC klesá a potom roste');
    assert.ok(Math.max(...ref.points.map((p) => p.y)) < ref.range[1]);
  }
});

test('graf izokvanty a izokosty: v bodě E se dotýkají (stejná hodnota i směrnice)', () => {
  for (const [w, r, TC] of [[2, 4, 80], [5, 2, 40], [10, 4, 120]]) {
    const ref = byId['graf-izokvanta'].solve({ w, r, TC }).answerSpec.reference.data;
    const iso = compileFn(ref.curves.find((c) => c.label === 'Q').expr);
    const cost = compileFn(ref.curves.find((c) => c.label === 'TC').expr);
    const E = ref.points[0];
    assert.ok(Math.abs(iso(E.x) - E.y) < 1e-9 && Math.abs(cost(E.x) - E.y) < 1e-9);
    const slope = (g) => (g(E.x + 1e-4) - g(E.x - 1e-4)) / 2e-4;
    assert.ok(Math.abs(slope(iso) - slope(cost)) < 1e-4, 'směrnice se rovnají');
    // jiný bod izokosty leží pod izokvantou (nižší výstup), tedy E je maximum
    assert.ok(iso(E.x + 1) > cost(E.x + 1) && iso(E.x - 1) > cost(E.x - 1));
  }
});

test('graf AP a MP: MP protíná AP v maximu AP', () => {
  for (const [a, b] of [[20, 6], [30, 8]]) {
    const ref = byId['graf-produkt'].solve({ a, b }).answerSpec.reference.data;
    const ap = compileFn(ref.curves.find((c) => c.label === 'AP').expr);
    const mp = compileFn(ref.curves.find((c) => c.label === 'MP').expr);
    const x = ref.points[0].x;
    assert.ok(Math.abs(ap(x) - mp(x)) < 1e-9);
    assert.ok(ap(x) >= ap(x - 0.5) && ap(x) >= ap(x + 0.5));
  }
});

test('téma 4: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['zlate-konkurence'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 4: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-naklady', 'graf-produkt', 'graf-izokvanta', 'graf-zlate']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['ucetni-zisk', 'naklady-polynom', 'zlate-konkurence', 'ano-ne', 'naklady-tabulka']) assert.equal(part(id), 'zapocet', id);
});
