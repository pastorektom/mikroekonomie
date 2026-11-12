import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import tema from '../../js/topics/tema01.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { drawEcon } from '../../js/viz/econ.js';

const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));

// ---------- nezávislé výpočty: čtení čísel ze zadání a hrubé prohledání, žádné vzorce z generátoru ----------
// Čísla z textu zadání (czText píše desetinnou čárku).
const numbersIn = (text) => (text.match(/\d+(?:,\d+)?/g) || []).map((s) => Number(s.replace(',', '.')));

// Čísla z tabulky v TeXu (za \hline, bez popisku řádku); tenká mezera a {,} jako u cz().
function tableRow(tex) {
  const row = tex.split('\\hline')[1].replace('\\end{array}', '');
  return row.split('&').slice(1).map((s) => Number(s.replace(/\\,/g, '').replace('{,}', '.').replace('-', '-')));
}

// Hranice Y = B(m² − X²): bod je dosažitelný, existuje-li bod hranice (x', f(x')) s x' ≥ x a f(x') ≥ y.
// Efektivní je dosažitelný bod, který nedominuje žádný dosažitelný bod hranice (víc X nebo víc Y a ne méně druhého).
function classify({ B, m }, x, y) {
  const f = (t) => B * (m * m - t * t);
  const grid = []; for (let t = 0; t <= m + 1e-9; t += 0.25) grid.push(t);
  const attainable = grid.some((t) => t >= x - 1e-9 && f(t) >= y - 1e-9);
  if (!attainable) return 'ned';
  const dominated = grid.some((t) => t >= x - 1e-9 && f(t) >= y - 1e-9 && (t > x + 1e-9 || f(t) > y + 1e-9) && f(t) >= y && t >= x);
  return dominated ? 'nef' : 'ef';
}

// Číselná derivace (centrální diference, pro kvadratickou funkci přesná).
const deriv = (fn, x, h = 0.5) => (fn(x + h) - fn(x - h)) / (2 * h);

const EVENT_EXPECT = { ropa: 'ven', technologie: 'ven', imigrace: 'ven', 'tech-jedno': 'ven', investice: 'ven', valka: 'dovnitr', zemetreseni: 'dovnitr', recese: 'uvnitr', nezamestnanost: 'uvnitr', oziveni: 'k', prerazeni: 'po', poptavka: 'po' };

// Odpovědi z části E cvičebnice, kap. 1 a 2.
const BOOK_MM = { a: 'makro', b: 'mikro', c: 'makro', d: 'makro', e: 'mikro', f: 'makro', g: 'mikro', h: 'mikro', i: 'mikro', j: 'makro' };
const BOOK_PN = { a: 'poz', b: 'norm', c: 'smis', d: 'norm', e: 'poz', f: 'norm', g: 'norm', h: 'norm', i: 'poz' };
const BOOK_CH = { a: 'cp', b: 'ph', c: 'ce' };
const BOOK_ANO_NE = {
  'kn1-a': true, 'kn1-b': false, 'kn1-c': false, 'kn1-d': true, 'kn1-e': false, 'kn1-f': true,
  'kn2-a': false, 'kn2-b': true, 'kn2-c': true, 'kn2-d': false, 'kn2-e': true, 'kn2-f': true,
};

test('téma 1: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'uvod');
  assert.equal(tema.order, 1);
  assert.equal(tema.title, 'Úvod do ekonomického studia');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10 && tema.types.length <= 14);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 1: výklad obsahuje definice pro zkoušku (term), časté chyby a grafy, které se vykreslí', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
  const graphs = tema.theory.filter((t) => t.viz);
  assert.ok(graphs.length >= 4);
  for (const t of graphs) assert.equal(drawEcon(svg(), t.viz.data), true, `graf oddílu „${t.heading}“ se nevykreslil`);
});

test('téma 1: texty bez Markdownu a bez podtržítek mimo vzorce', () => {
  const stripTex = (s) => s.replace(/\$[^$]*\$/g, 'X');
  const bad = (s, where) => {
    const t = stripTex(String(s));
    assert.ok(!/\*/.test(t), `${where}: hvězdička (Markdown) v „${t.slice(0, 60)}“`);
    assert.ok(!/_/.test(t), `${where}: podtržítko mimo vzorec v „${t.slice(0, 60)}“`);
    assert.ok(!/ {2,}/.test(t), `${where}: dvojitá mezera v „${t.slice(0, 60)}“`);
  };
  for (const t of tema.theory) {
    bad(t.heading, 'nadpis'); bad(t.text, `výklad ${t.heading}`);
    for (const m of t.mistakes || []) bad(m, `chyba ${t.heading}`);
  }
  for (const type of tema.types) {
    for (let seed = 1; seed <= 60; seed++) {
      const p = type.generate(makeRng(seed));
      const where = `${type.id}/${seed}`;
      bad(p.task, where); bad(p.conclusion || '', where);
      for (const s of p.solution) { bad(s.title, where); bad(s.text, where); }
      for (const o of p.answerSpec.options || []) bad(o.text, where);
    }
  }
});

test('téma 1: solve(data) sestaví z uložených dat týž příklad jako generate', () => {
  for (const type of tema.types) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = type.generate(makeRng(seed));
      assert.deepEqual(type.solve(p.data), p, `${type.id}/${seed}`);
    }
  }
});

test('téma 1: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'naklady-prilezitosti': (p) => {
        const [fee, wage] = [p.data.fee, p.data.wage];
        return p.data.ask === 'total' ? wage + fee : wage;
      },
      'volba-dopravy': (p) => {
        // čísla ze zadání: výdělek, jízdenka, hodiny vlaku, letenka, hodiny letadla
        const [w, t1, h1, t2, h2] = numbersIn(p.task);
        const costTrain = t1 + w * h1; const costPlane = t2 + w * h2;
        assert.notEqual(costTrain, costPlane, 'shoda nákladů');
        return costTrain < costPlane ? 'vlak' : 'letadlo';
      },
      'ppf-tabulka': (p) => {
        const { xs, ys, seg, ask } = p.data;
        // pokles Y mezi sousedními sloupci tabulky a podíl na jednotku
        const lost = ys[seg] - ys[seg + 1]; const added = xs[seg + 1] - xs[seg];
        assert.ok(lost > 0 && added > 0);
        return ask === 'celkem' ? lost : lost / added;
      },
      'ppf-bod': (p) => classify(p.data, p.data.x, p.data.y),
      'ppf-udalost': (p) => EVENT_EXPECT[p.data.eventId],
      'mezni-tabulka': (p) => {
        // čteme čísla z vykreslené tabulky v zadání
        const tot = tableRow(p.promptTex);
        const marg = []; const avg = [];
        for (let q = 1; q <= 5; q++) { marg.push(tot[q] - tot[q - 1]); avg.push(tot[q] / q); }
        return [marg.map(String), avg.map((v) => String(Math.round(v * 1e6) / 1e6))];
      },
      'mezni-derivace': (p) => {
        const { b, m, q0, ask } = p.data;
        const tr = (q) => 2 * b * m * q - b * q * q;
        if (ask === 'mr') return deriv(tr, q0);
        let best = { q: 0, v: -Infinity };
        for (let q = 0; q <= 2 * m; q += 0.5) if (tr(q) > best.v) best = { q, v: tr(q) };
        return ask === 'qmax' ? best.q : best.v;
      },
      smernice: (p) => {
        const { kind, x1, x2, y1, y2, c, d, x0, ask } = p.data;
        const f = (x) => c + d * x * x;
        if (kind === 'primka') { const k = (y2 - y1) / (x2 - x1); return ask === 'sklon' ? Math.abs(k) : k; }
        if (kind === 'tetiva') return (f(x2) - f(x1)) / (x2 - x1);
        return deriv(f, x0);
      },
      'prumer-mezni': (p) => {
        const [n, A, m] = numbersIn(p.task);
        const nw = (n * A + m) / (n + 1);
        return nw < A ? 'klesne' : nw > A ? 'vzroste' : 'nezmeni';
      },
      klasifikace: (p) => {
        const { id } = p.data;
        const key = id.slice(-1);
        if (id.startsWith('kn-mm')) return BOOK_MM[key];
        if (id.startsWith('kn-pn')) return BOOK_PN[key];
        if (id.startsWith('kn-ch')) return BOOK_CH[key];
        return p.answerSpec.value;
      },
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
      definice: (p) => 'o0',
    },
    minDistinct: {
      'naklady-prilezitosti': 100, 'volba-dopravy': 100, 'ppf-tabulka': 100, 'ppf-bod': 100, 'ppf-udalost': 10,
      'mezni-tabulka': 20, 'mezni-derivace': 40, smernice: 40, 'prumer-mezni': 40, klasifikace: 40,
      'ano-ne': 20, definice: 10, 'graf-ppf': 20, 'graf-posun': 8,
    },
  });
});

test('téma 1: cvičebnice kap. 2, příklady 1, 2 a 5 (pevné příklady dávají výsledky z knihy)', () => {
  // úloha 1: poplatky 150 000, ušlý výdělek 500 000. Kniha uvádí 500 000 (implicitní náklad), úplné ekonomické náklady jsou 650 000.
  assert.equal(byId['naklady-prilezitosti'].solve({ scenario: 'studium', fee: 150000, wage: 500000, ask: 'implicit' }).answerSpec.value, 500000);
  assert.equal(byId['naklady-prilezitosti'].solve({ scenario: 'studium', fee: 150000, wage: 500000, ask: 'total' }).answerSpec.value, 650000);
  // úloha 2: 500 Kč/h → vlak (4 800 proti 5 500), 700 Kč/h → letadlo (6 400 proti 5 700)
  const d = { t1: 800, h1: 8, t2: 5000, h2: 1 };
  assert.equal(byId['volba-dopravy'].solve({ ...d, w: 500 }).answerSpec.value, 'vlak');
  assert.equal(byId['volba-dopravy'].solve({ ...d, w: 700 }).answerSpec.value, 'letadlo');
  // úloha 5b: tabulka (0; 28), (1,5; 20), (2,2; 15), (3; 0): zvýšení automobilů z 1,5 na 2,2 mil. stojí 5 mil. hl piva
  const tab = { names: 0, xs: [0, 1.5, 2.2, 3], ys: [28, 20, 15, 0] };
  const p5 = byId['ppf-tabulka'].solve({ ...tab, seg: 1, ask: 'celkem' });
  assert.equal(p5.answerSpec.value, 5);
  assert.ok(p5.solution.length >= 3);
  assert.equal(byId['ppf-tabulka'].solve({ ...tab, seg: 0, ask: 'celkem' }).answerSpec.value, 8);
  assert.equal(byId['ppf-tabulka'].solve({ ...tab, seg: 2, ask: 'celkem' }).answerSpec.value, 15);
});

test('téma 1: cvičebnice kap. 12, příklady o mezním příjmu TR = 12Q − 2Q²', () => {
  // MR mezi Q = 1 a Q = 2 je 6, derivace v Q = 2 je 4, MR = 0 při Q = 3
  const tab = byId['mezni-tabulka'].solve({ kind: 'tr', p0: 12, k: 2 });
  assert.deepEqual(tab.answerSpec.value, [['10', '6', '2', '-2', '-6'], ['10', '8', '6', '4', '2']]);
  assert.equal(byId['mezni-derivace'].solve({ b: 2, m: 3, q0: 2, ask: 'mr' }).answerSpec.value, 4);
  assert.equal(byId['mezni-derivace'].solve({ b: 2, m: 3, q0: 2, ask: 'qmax' }).answerSpec.value, 3);
  assert.equal(byId['mezni-derivace'].solve({ b: 2, m: 3, q0: 2, ask: 'trmax' }).answerSpec.value, 18);
});

test('téma 1: klasifikace podle cvičebnice (kap. 1, úlohy 1, 2, 3) má správné odpovědi z části E', () => {
  const t = byId.klasifikace;
  for (const [k, v] of Object.entries(BOOK_MM)) assert.equal(t.solve({ id: `kn-mm-${k}` }).answerSpec.value, v, `mm-${k}`);
  for (const [k, v] of Object.entries(BOOK_PN)) assert.equal(t.solve({ id: `kn-pn-${k}` }).answerSpec.value, v, `pn-${k}`);
  for (const [k, v] of Object.entries(BOOK_CH)) assert.equal(t.solve({ id: `kn-ch-${k}` }).answerSpec.value, v, `ch-${k}`);
});

test('téma 1: ano/ne podle cvičebnice (kap. 1 a 2, úkoly a–f) mají správné odpovědi', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 1: úlohy o bodu vůči hranici dávají správnou kategorii a k pevné hranici odpovídá zadání', () => {
  const t = byId['ppf-bod'];
  // Y = 100 − X²: (6; 64) na hranici, (6; 50) uvnitř, (6; 70) vně
  assert.equal(t.solve({ B: 1, m: 10, x: 6, y: 64 }).answerSpec.value, 'ef');
  assert.equal(t.solve({ B: 1, m: 10, x: 6, y: 50 }).answerSpec.value, 'nef');
  assert.equal(t.solve({ B: 1, m: 10, x: 6, y: 70 }).answerSpec.value, 'ned');
});

test('téma 1: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['ppf-tabulka'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 1: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  assert.equal(part('definice'), 'zkouska');
  assert.equal(part('graf-ppf'), 'zkouska');
  assert.equal(part('graf-posun'), 'zkouska');
  assert.equal(part('naklady-prilezitosti'), 'zapocet');
  assert.equal(part('mezni-tabulka'), 'zapocet');
});

test('téma 1: grafové úlohy mají vzorový graf s hranicí a odpovídajícími body', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const p = byId['graf-ppf'].generate(makeRng(seed));
    const { B, m } = p.data;
    const pts = p.answerSpec.reference.data.points;
    const [e, n, u] = ['E', 'N', 'U'].map((l) => pts.find((q) => q.label === l));
    assert.equal(classify({ B, m }, e.x, e.y), 'ef', `E seed ${seed}`);
    assert.equal(classify({ B, m }, n.x, n.y), 'nef', `N seed ${seed}`);
    assert.equal(classify({ B, m }, u.x, u.y), 'ned', `U seed ${seed}`);
  }
});
