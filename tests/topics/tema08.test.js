import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import tema from '../../js/topics/tema08.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { drawEcon } from '../../js/viz/econ.js';

const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));
const val = (id, data) => byId[id].solve(data).answerSpec.value;
const str = (x) => String(Math.round(x * 1e6) / 1e6);

// ---------- nezávislé výpočty: hrubé prohledávání, bez vzorců z generátoru ----------
// Najde argument maxima funkce na mřížce; při shodě bere větší argument (firma je lhostejná a podle zadání najme).
function argmax(fn, lo, hi, step) {
  let best = { x: lo, y: -Infinity };
  for (let x = lo; x <= hi + 1e-9; x += step) {
    const y = fn(x);
    if (y > best.y + 1e-9 || Math.abs(y - best.y) <= 1e-9) best = { x, y };
  }
  return best;
}
// Rovnovážná mzda v modelu L_D = a − b·w, L_S = c + d·w: nejmenší rozdíl na jemné síti.
function scanW(ld, ls, hi = 400, step = 0.25) {
  let best = { w: 0, gap: Infinity };
  for (let w = 0; w <= hi; w += step) {
    const gap = Math.abs(ld(w) - ls(w));
    if (gap < best.gap) best = { w, gap };
  }
  return best.w;
}
// U rovnic w(L) hledáme množství práce, kde se obě mzdy shodují.
function scanL(wd, ws, hi = 2000, step = 0.25) {
  let best = { l: 0, gap: Infinity };
  for (let l = 0; l <= hi; l += step) {
    const gap = Math.abs(wd(l) - ws(l));
    if (gap < best.gap) best = { l, gap };
  }
  return best.l;
}
// Zisk z najímání prvních k pracovníků z tabulky přírůstků příjmu (MRP) a mzdy.
function bestHires(mrp, w) {
  const profit = (k) => mrp.slice(0, k).reduce((s, x) => s + x - w, 0);
  return argmax(profit, 0, mrp.length, 1).x;
}
const TEMA_EVENT = { 'cena-up': 'DL+', produktivita: 'DL+', 'cena-down': 'DL-', 'poptavka-vyrobek': 'DL-', imigrace: 'SL+', absolventi: 'SL+', duchod: 'SL-', 'jiny-obor': 'SL-', 'min-mzda': 'pohyb' };

// Ano/ne ze cvičebnice (kap. 9: a A, b N, c A, d A, e A, f N, g A, i A, j A; 9.1: N, N, A, A, A, A, N, A, A, N).
const BOOK_ANO_NE = {
  'kn-9a': true, 'kn-9b': false, 'kn-9c': true, 'kn-9d': true, 'kn-9e': true, 'kn-9f': false, 'kn-9g': true, 'kn-9i': true, 'kn-9j': true,
  'kn91-a': false, 'kn91-b': false, 'kn91-c': true, 'kn91-d': true, 'kn91-e': true, 'kn91-f': true, 'kn91-g': false, 'kn91-h': true, 'kn91-i': true, 'kn91-j': false,
};

test('téma 8: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'prace');
  assert.equal(tema.order, 8);
  assert.equal(tema.title, 'Trh práce');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 8: výklad má definice pro zkoušku (term), časté chyby a vykreslitelné grafy', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
  for (const t of tema.theory) {
    if (t.viz) assert.equal(drawEcon(svg(), t.viz.data), true, `graf oddílu „${t.heading}“ se nevykreslil`);
    const all = [t.heading, t.text, ...(t.mistakes || [])].join('\n');
    assert.ok(!/\*|(^|[^\\])_/.test(all.replace(/\$[^$]*\$/g, '')), `Markdown nebo podtržítko mimo vzorec v oddílu „${t.heading}“`);
    assert.equal((all.match(/\$/g) || []).length % 2, 0, `nepárové $ v oddílu „${t.heading}“`);
  }
});

test('téma 8: texty příkladů nemají Markdown ani podtržítko mimo vzorec', () => {
  for (const type of tema.types) {
    for (let seed = 1; seed <= 60; seed++) {
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

test('téma 8: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'rovnovaha-prace': (p) => {
        const d = p.data;
        if (d.form === 'Lw') {
          const w = scanW((x) => d.a - d.b * x, (x) => d.c + d.d * x);
          assert.ok(w > 0 && d.a - d.b * w > 0, 'rovnováha mimo kladné hodnoty');
          return d.ask === 'w' ? w : d.a - d.b * w;
        }
        const l = scanL((x) => d.A - d.B * x, (x) => d.C + d.D * x);
        assert.ok(l > 0 && d.A - d.B * l > 0, 'rovnováha mimo kladné hodnoty');
        return d.ask === 'L' ? l : d.A - d.B * l;
      },
      'rovnovaha-tabulka': (p) => {
        const { ws, dem, sup, ask } = p.data;
        const i = dem.findLastIndex((q, j) => q > sup[j]) + 1; // první mzda, kde poptávka už nepřevyšuje nabídku
        assert.equal(dem[i], sup[i], 'rovnováha leží na mřížce');
        assert.equal(dem.filter((q, j) => q === sup[j]).length, 1, 'právě jedna rovnováha');
        return ask === 'w' ? ws[i] : ws[i] * sup[i];
      },
      'min-mzda': (p) => {
        const { a, b, c, d, wmin, ask } = p.data;
        const wE = scanW((x) => a - b * x, (x) => c + d * x);
        const w = Math.max(wmin, wE); // minimální mzda pod rovnováhou nepůsobí
        const ld = a - b * w; const ls = c + d * w;
        assert.ok(ld > 0, 'poptávané množství při minimální mzdě je kladné');
        return ask === 'zam' ? Math.min(ld, ls) : Math.max(0, ls - ld);
      },
      nezamestnanost: (p) => {
        const { N, LE, LD, LS, ask } = p.data;
        assert.ok(LD < LE && LE < LS && LS <= N, 'poptávka při min. mzdě < rovnováha < nabídka ≤ schopní');
        return { dob0: N - LE, zam: LD, nedob: LS - LD, dob1: N - LS }[ask];
      },
      renta: (p) => {
        const { a, b, c, d, ask } = p.data;
        const wE = scanW((x) => a - b * x, (x) => c + d * x); const LE = a - b * wE;
        // integrál ze (wE − w_nabídky(L)) přes L od 0 do LE, nabídka w = (L − c)/d (středový součet)
        let rent = 0; const n = 4000;
        for (let i = 0; i < n; i++) { const L = ((i + 0.5) * LE) / n; rent += (wE - (L - c) / d) * (LE / n); }
        const bill = wE * LE;
        if (ask === 'mzdy') return bill;
        return ask === 'renta' ? Math.round(rent * 1e6) / 1e6 : Math.round((bill - rent) * 1e6) / 1e6;
      },
      'mrp-tabulka': (p) => {
        const { tp, P } = p.data;
        return tp.slice(1).map((t, i) => [String(t - tp[i]), String(P * (t - tp[i]))]);
      },
      'najem-tabulka': (p) => {
        const d = p.data;
        const mp = d.given === 'tp' ? d.tp.slice(1).map((t, i) => t - tp0(d)[i]) : d.mp;
        const hires = bestHires(mp.map((x) => d.P * x), d.w);
        return d.given === 'tp' ? hires : d.start + hires - 1;
      },
      'najem-funkce': (p) => {
        const { a, b, P, w, ask } = p.data;
        const L = argmax((x) => P * (a * x - b * x * x) - w * x, 0, 200, 0.25).x;
        return ask === 'L' ? L : a * L - b * L * L;
      },
      'mrp-monopol': (p) => {
        const { tp, price, w } = p.data;
        const tr = price.map((pr, i) => pr * tp[i + 1]);
        const profit = (k) => (k === 0 ? 0 : tr[k - 1] - w * k);
        return argmax(profit, 0, price.length, 1).x;
      },
      monopson: (p) => {
        const { A, B, C, D, ask } = p.data;
        const L = argmax((x) => A * x - (B * x * x) / 2 - x * (C + D * x), 0, 200, 0.25).x;
        const w = C + D * L;
        return { L, w, mezera: A - B * L - w }[ask];
      },
      'monopson-tab': (p) => {
        const { L0, ws, mrp, ask } = p.data;
        const profit = (k) => mrp.slice(1, k + 1).reduce((s, x) => s + x, 0) - (ws[k] * (L0 + k) - ws[0] * L0);
        const k = argmax(profit, 0, ws.length - 1, 1).x;
        return ask === 'L' ? L0 + k : ws[k];
      },
      'min-mzda-monopson': (p) => {
        const { A, B, C, D, wmin } = p.data;
        // zisk monopsonisty, který při minimální mzdě platí max(wmin, w(L)) všem pracovníkům
        const profit = (x) => A * x - (B * x * x) / 2 - x * Math.max(wmin, C + D * x);
        return argmax(profit, 0, A / B, 0.25).x;
      },
      bilat: (p) => {
        const { A, B, C, D, ask } = p.data;
        const firm = (x) => A * x - (B * x * x) / 2 - x * (C + D * x);
        const rentOf = (x) => x * (A - B * x) - (C * x + (D * x * x) / 2);
        const Lf = argmax(firm, 0, A / B, 0.25).x; const Lu = argmax(rentOf, 0, A / B, 0.25).x;
        return ask === 'tab' ? [[Lf, C + D * Lf, Lu, A - B * Lu].map(str)] : rentOf(Lu);
      },
      'subst-dochod': (p) => (p.data.id === 'cisla' ? (p.data.h1 > p.data.h0 ? 'SE' : p.data.h1 < p.data.h0 ? 'IE' : 'rov') : p.answerSpec.value),
      'vyber-posun': (p) => TEMA_EVENT[p.data.id],
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
    },
    minDistinct: {
      'rovnovaha-prace': 100, 'rovnovaha-tabulka': 80, 'min-mzda': 100, nezamestnanost: 40, renta: 80, 'mrp-tabulka': 100, 'najem-tabulka': 100,
      'najem-funkce': 60, 'mrp-monopol': 60, monopson: 60, 'monopson-tab': 60, 'min-mzda-monopson': 40, bilat: 20, 'subst-dochod': 10, 'vyber-posun': 8, 'ano-ne': 10, definice: 6,
      'graf-rovnovaha-prace': 50, 'graf-min-mzda': 50, 'graf-monopson': 30,
    },
  });
});

function tp0(d) { return d.tp; }

test('téma 8: každá z možností minimální mzdy při monopsonii (pod, pásmo, nad) se vyskytuje', () => {
  const zones = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const { A, B, C, D, wmin } = byId['min-mzda-monopson'].generate(makeRng(seed)).data;
    const wM = C + D * ((A - C) / (B + 2 * D)); const wC = C + D * ((A - C) / (B + D));
    zones.add(wmin <= wM ? 'pod' : wmin <= wC ? 'pasmo' : 'nad');
  }
  assert.deepEqual([...zones].sort(), ['nad', 'pasmo', 'pod']);
});

test('téma 8: minimální mzda se v generátoru objevuje nad i pod rovnováhou, nezaměstnanost je kladná jen nad ní', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const p = byId['min-mzda'].generate(makeRng(seed));
    const { a, b, c, d, wmin, ask } = p.data;
    const wE = (a - c) / (b + d);
    seen.add(wmin > wE ? 'nad' : 'pod');
    if (ask === 'nezam') assert.equal(p.answerSpec.value > 0, wmin > wE);
  }
  assert.deepEqual([...seen].sort(), ['nad', 'pod']);
});

test('téma 8: cvičebnice kap. 9, úloha 1 (tabulka 9.1: 22 dělníků při mzdě 70, při 110 jeden méně)', () => {
  const t = { given: 'mp', start: 20, mp: [16, 11, 7, 4, 2], P: 10 };
  assert.equal(val('najem-tabulka', { ...t, w: 70 }), 22);
  assert.equal(val('najem-tabulka', { ...t, w: 110 }), 21);
  // při rovnosti MRP a mzdy je v řešení zmíněna lhostejnost
  const p = byId['najem-tabulka'].solve({ ...t, w: 70 });
  assert.ok(p.solution.some((s) => /lhostejn/.test(s.text)));
});

test('téma 8: cvičebnice kap. 9, úloha 2 (tabulka 9.2: kniha uvádí 3 dělníky, správně při mzdě 150 jen 1)', () => {
  const tp = [0, 10, 17, 22, 25, 27];
  assert.equal(val('najem-tabulka', { given: 'tp', tp, P: 20, w: 150 }), 1); // MRP: 200, 140, 100, 60, 40
  assert.equal(val('najem-tabulka', { given: 'tp', tp, P: 20, w: 100 }), 3); // kniha má 3 jen při mzdě 100
  assert.equal(val('najem-tabulka', { given: 'tp', tp, P: 10, w: 150 }), 0); // cena na polovinu: nikdo se nevyplatí
});

test('téma 8: cvičebnice kap. 9, úloha 3 a skripta (Q = 50L − 0,45L², P = 10, w = 140 → 40; Q = 100L − 0,375L², P = 4, w = 103 → 99)', () => {
  assert.equal(val('najem-funkce', { a: 50, b: 0.45, P: 10, w: 140, ask: 'L' }), 40);
  assert.equal(val('najem-funkce', { a: 100, b: 0.375, P: 4, w: 103, ask: 'L' }), 99);
});

test('téma 8: cvičebnice kap. 9, úloha 4 (wE = 4 700, LE = 65 tis.; min. mzda 6 200 → zaměstnanost 45, nedobrovolná nezaměstnanost 30, kniha má 20)', () => {
  const d = { N: 100, wE: 4700, LE: 65, wmin: 6200, LD: 45, LS: 75 };
  assert.equal(val('nezamestnanost', { ...d, ask: 'dob0' }), 35);
  assert.equal(val('nezamestnanost', { ...d, ask: 'zam' }), 45);
  assert.equal(val('nezamestnanost', { ...d, ask: 'nedob' }), 30);
  assert.equal(val('nezamestnanost', { ...d, ask: 'dob1' }), 25);
});

test('téma 8: cvičebnice kap. 9, úloha 6 (tabulka 9.3: wE = 120, celková mzda 72 000)', () => {
  const d = { ws: [100, 110, 120, 130, 140, 150], dem: [1000, 800, 600, 400, 200, 0], sup: [0, 300, 600, 1000, 1200, 1500] };
  assert.equal(val('rovnovaha-tabulka', { ...d, ask: 'w' }), 120);
  assert.equal(val('rovnovaha-tabulka', { ...d, ask: 'mzdy' }), 72000);
});

test('téma 8: cvičebnice kap. 9, úloha 7 (tabulka 9.4: MFC 70 a 72, optimum 64; kniha uvádí 860, 880 a 77)', () => {
  const d = { L0: 62, ws: [7, 8, 9], mrp: [84, 78, 72] };
  const p = byId['monopson-tab'].solve({ ...d, ask: 'L' });
  assert.equal(p.answerSpec.value, 64);
  assert.equal(val('monopson-tab', { ...d, ask: 'w' }), 9);
  assert.ok(JSON.stringify(p.solution).includes('MFC_{63}=504-434=70'));
  assert.ok(JSON.stringify(p.solution).includes('MFC_{64}=576-504=72'));
});

test('téma 8: cvičebnice kap. 9, úloha 8 (tabulka 9.5: MP 17, 14, 12, 10, 7, 5, MRP 340 až 100, optimum 4 při MFC z knihy)', () => {
  const tp = [0, 17, 31, 43, 53, 60, 65];
  const rows = byId['mrp-tabulka'].solve({ tp, P: 20 }).answerSpec.value;
  assert.deepEqual(rows.map((r) => r[0]), ['17', '14', '12', '10', '7', '5']);
  assert.deepEqual(rows.map((r) => r[1]), ['340', '280', '240', '200', '140', '100']);
  const mfc = [170, 150, 175, 190, 220, 250];
  const hired = rows.filter((r, i) => Number(r[1]) >= mfc[i]).length;
  assert.equal(hired, 4);
  // stejný výsledek dá i hledání zisku v typu najem-tabulka s mzdou rovnou MFC pořadového pracovníka
  assert.equal(bestHires([340, 280, 240, 200, 140, 100].map((x, i) => x - mfc[i] + 190), 190), 4);
});

test('téma 8: cvičebnice kap. 9.1, úloha 1 (MRP = 500 − 3L, w = 50 + 2L → L = 90, w = 230)', () => {
  assert.equal(val('rovnovaha-prace', { form: 'wL', A: 500, B: 3, C: 50, D: 2, ask: 'L' }), 90);
  assert.equal(val('rovnovaha-prace', { form: 'wL', A: 500, B: 3, C: 50, D: 2, ask: 'w' }), 230);
});

test('téma 8: cvičebnice kap. 9.1, úloha 2 (L = −40w + 6 000, L = 120w: wE = 37,5, LE = 4 500, min. mzda 40 → LD = 4 400, U = 400, renta 84 375; kniha uvádí 50, 5 000 a 3 600, 1 200)', () => {
  const d = { a: 6000, b: 40, c: 0, d: 120 };
  assert.equal(val('rovnovaha-prace', { form: 'Lw', ...d, ask: 'w' }), 37.5);
  assert.equal(val('rovnovaha-prace', { form: 'Lw', ...d, ask: 'L' }), 4500);
  assert.equal(val('min-mzda', { ...d, wmin: 40, ask: 'zam' }), 4400);
  assert.equal(val('min-mzda', { ...d, wmin: 40, ask: 'nezam' }), 400);
  assert.equal(val('renta', { ...d, ask: 'renta' }), 84375);
  // minimální mzda 30 leží pod rovnováhou a nic nemění
  assert.equal(val('min-mzda', { ...d, wmin: 30, ask: 'nezam' }), 0);
  assert.equal(val('min-mzda', { ...d, wmin: 30, ask: 'zam' }), 4500);
});

test('téma 8: cvičebnice kap. 9.1, úloha 3 (w = 120 − 2L, w = 2L: firma L = 20, w = 40; odbory L = 20, w = 80; renta 1 200)', () => {
  const d = { A: 120, B: 2, C: 0, D: 2 };
  assert.deepEqual(val('bilat', { ...d, ask: 'tab' }), [['20', '40', '20', '80']]);
  assert.equal(val('bilat', { ...d, ask: 'renta' }), 1200);
  assert.equal(val('monopson', { ...d, ask: 'L' }), 20);
  assert.equal(val('monopson', { ...d, ask: 'w' }), 40);
});

test('téma 8: minimální mzda při monopsonii (MRP = 120 − 2L, w = 2L: wM = 40, wC = 60)', () => {
  const d = { A: 120, B: 2, C: 0, D: 2 };
  assert.equal(val('min-mzda-monopson', { ...d, wmin: 30 }), 20); // pod mzdou monopsonisty: beze změny
  assert.equal(val('min-mzda-monopson', { ...d, wmin: 50 }), 25); // v pásmu: L = 50/2 = 25 > 20
  assert.equal(val('min-mzda-monopson', { ...d, wmin: 70 }), 25); // nad konkurenční mzdou 60: L = (120 − 70)/2 = 25 < 30
  assert.equal(val('min-mzda-monopson', { ...d, wmin: 80 }), 20);
});

test('téma 8: ano/ne podle cvičebnice (kap. 9 a 9.1) mají správné odpovědi a postup', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 8: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['rovnovaha-prace'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 8: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-rovnovaha-prace', 'graf-min-mzda', 'graf-monopson']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['rovnovaha-prace', 'min-mzda', 'najem-tabulka', 'monopson', 'ano-ne', 'vyber-posun', 'subst-dochod']) assert.equal(part(id), 'zapocet', id);
});

test('téma 8: grafové úlohy na tabuli mají vzorový graf, který se vykreslí', () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const id of ['graf-rovnovaha-prace', 'graf-min-mzda', 'graf-monopson']) {
      const p = byId[id].generate(makeRng(seed));
      assert.equal(p.answerSpec.kind, 'whiteboard');
      assert.equal(drawEcon(svg(), p.answerSpec.reference.data), true, `${id} seed ${seed}`);
    }
  }
  // minimální mzda v grafové úloze vždy nad rovnovážnou
  for (let seed = 1; seed <= 100; seed++) {
    const { a, b, c, d, wmin } = byId['graf-min-mzda'].generate(makeRng(seed)).data;
    assert.ok(wmin > (a - c) / (b + d));
  }
});

test('téma 8: všechny události posunu křivky se dají vyřešit a mají správné řešení', () => {
  for (const id of Object.keys(TEMA_EVENT)) {
    const p = byId['vyber-posun'].solve({ id });
    assert.equal(p.answerSpec.value, TEMA_EVENT[id], id);
  }
});

test('téma 8: monopsonista platí mzdu pod MRP a zaměstnává méně než konkurence ve všech vygenerovaných příkladech', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { A, B, C, D } = byId.monopson.generate(makeRng(seed)).data;
    const LM = (A - C) / (B + 2 * D); const LC = (A - C) / (B + D);
    assert.ok(LM < LC);
    assert.ok(C + D * LM < A - B * LM);
  }
});
