import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import tema from '../../js/topics/tema11.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { drawEcon } from '../../js/viz/econ.js';

const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));

// ---------- nezávislé výpočty: hrubé prohledání mřížky a numerická integrace, žádné vzorce z generátoru ----------
const STEP = 0.25;
// Množství na mřížce, kde jsou si dvě funkce ceny nejblíž (průsečík křivek).
function cross(f, g, hi = 400, strict = true) {
  let best = { q: 0, gap: Infinity };
  for (let q = 0; q <= hi; q += STEP) {
    const gap = Math.abs(f(q) - g(q));
    if (gap < best.gap) best = { q, gap };
  }
  if (strict) assert.ok(best.gap < 1e-9, 'křivky se na mřížce neprotínají přesně');
  return best.q;
}
// Plocha mezi dvěma funkcemi od a do b (součet obdélníků ve středech, pro lineární funkce přesný).
function areaBetween(top, bottom, a, b) {
  let s = 0;
  for (let q = a; q < b - 1e-12; q += STEP) s += (top(q + STEP / 2) - bottom(q + STEP / 2)) * STEP;
  return s;
}

// Skripta kap. 12, úkoly pravda/nepravda (úkol i se nepřebírá): a P, b P, c P, d N, e N, f P, g N, h P (viz poznámka o chybě skript), j P.
const BOOK = { 'kn-a': true, 'kn-b': true, 'kn-c': true, 'kn-d': false, 'kn-e': false, 'kn-f': true, 'kn-g': false, 'kn-h': true, 'kn-j': true };

// Text mimo vzorce $…$ nesmí obsahovat Markdown ani podtržítko.
const plain = (s) => String(s ?? '').replace(/\$[^$]*\$/g, '');
const badText = (s) => /\*|_|undefined|NaN/.test(plain(s));
const proseOf = (p) => [p.task, p.conclusion, ...p.solution.flatMap((st) => [st.title, st.text])];
function allOptionTexts(p) { return (p.answerSpec.options || []).map((o) => o.text); }

test('téma 11: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'selhani');
  assert.equal(tema.order, 11);
  assert.equal(tema.title, 'Tržní selhání a mikroekonomická politika státu');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10 && tema.types.length <= 14);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 11: výklad obsahuje definice (term), časté chyby a vykreslitelné grafy', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
  for (const t of tema.theory) {
    if (t.viz) assert.equal(drawEcon(svg(), t.viz.data), true, `graf oddílu „${t.heading}“ se nevykreslil`);
    assert.ok(!/\*\*|_/.test(plain(t.text)), `oddíl „${t.heading}“: Markdown nebo podtržítko v textu`);
    assert.ok(!/\*\*/.test(t.text), 'výklad bez tučného písma');
  }
});

test('téma 11: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'neg-externalita': (p) => {
        const { A, B, C, D, e, ask } = p.data;
        const Qm = cross((q) => A - B * q, (q) => C + D * q);
        const Qo = cross((q) => A - B * q, (q) => C + e + D * q);
        assert.ok(Qo > 0 && Qm > Qo);
        return { Qopt: Qo, Qtrh: Qm, nadprod: Qm - Qo }[ask];
      },
      'pigou-dan': (p) => {
        const { A, B, C, D, k, ask } = p.data;
        const Qo = cross((q) => A - B * q, (q) => C + D * q + k * q);
        const t = k * Qo; // externí mezní náklad MEC = kQ v optimu
        // ověření simulací: po zavedení daně t trh skutečně skončí v optimu
        const Qtax = cross((q) => A - B * q, (q) => C + t + D * q);
        assert.equal(Qtax, Qo, 'daň nevede k optimu');
        return { t, Pspotr: A - B * Qo, vynos: t * Qo }[ask];
      },
      'mrtva-ztrata': (p) => {
        const { A, B, C, D, e } = p.data;
        const mpb = (q) => A - B * q; const msc = (q) => C + e + D * q; const mpc = (q) => C + D * q;
        const Qm = cross(mpb, mpc); const Qo = cross(mpb, msc);
        return areaBetween(msc, mpb, Qo, Qm);
      },
      'poz-externalita': (p) => {
        const { A, B, C, D, e, ask } = p.data;
        const mpb = (q) => A - B * q; const msb = (q) => A + e - B * q; const mpc = (q) => C + D * q;
        const Qm = cross(mpb, mpc); const Qo = cross(msb, mpc);
        assert.ok(Qo > Qm);
        // dotace: nejmenší s, při které poptávka a nabídka snížená o s protnou na Qo
        let sub = null;
        const eqQ = (s) => { let best = { q: 0, gap: Infinity }; for (let q = 0; q <= 80; q += 0.05) { const gap = Math.abs(mpb(q) - (C - s + D * q)); if (gap < best.gap) best = { q, gap }; } return best.q; };
        for (let s = 0; s <= 150 && sub === null; s += 1) if (Math.abs(eqQ(s) - Qo) < 0.025) sub = s;
        assert.notEqual(sub, null);
        return { Qopt: Qo, dotace: sub, dwl: areaBetween(msb, mpc, Qm, Qo), naklad: sub * Qo }[ask];
      },
      coase: (p) => {
        const { K, S, ask } = p.data;
        // dvě varianty: filtr (náklad K), nebo škoda (náklad S); efektivní je levnější
        const options = [K, S].sort((x, y) => x - y);
        return ask === 'naklady' ? options[0] : options[1] - options[0];
      },
      povoleni: (p) => {
        const { m1, m2, R, ask } = p.data;
        // minimalizace celkových nákladů ½·m1·xA² + ½·m2·(R − xA)² prohledáním
        let best = { x: 0, c: Infinity };
        for (let x = 0; x <= R; x += 0.5) {
          const c = (m1 * x * x) / 2 + (m2 * (R - x) * (R - x)) / 2;
          if (c < best.c) best = { x, c };
        }
        return { cena: m1 * best.x, xA: best.x, naklady: best.c }[ask];
      },
      'typ-statku': (p) => {
        const { excl, riv } = p.data;
        if (excl && riv) return 'soukromy';
        if (excl) return 'klubovy';
        return riv ? 'spolecny' : 'verejny';
      },
      'asym-info': (p) => p.data.kind,
      nastroj: (p) => p.data.tool,
      'ano-ne': (p) => (p.data.id in BOOK ? BOOK[p.data.id] : p.answerSpec.value),
    },
    minDistinct: {
      'neg-externalita': 100, 'pigou-dan': 100, 'mrtva-ztrata': 50, 'poz-externalita': 100, coase: 60, povoleni: 40,
      'typ-statku': 10, 'asym-info': 8, nastroj: 8, 'ano-ne': 15, definice: 10, 'graf-neg-ext': 50, 'graf-poz-ext': 50, 'graf-pigou': 50,
    },
  });
});

test('téma 11: české texty bez Markdownu a podtržítek mimo vzorce, každý příklad má aspoň 3 kroky', () => {
  for (const type of tema.types) {
    for (let seed = 1; seed <= 100; seed++) {
      const p = type.generate(makeRng(seed));
      const where = `${type.id} seed ${seed}`;
      assert.ok(p.solution.length >= 3, `${where}: méně než 3 kroky`);
      for (const text of [...proseOf(p), ...allOptionTexts(p)]) assert.ok(!badText(text), `${where}: nepovolený znak v textu: ${text}`);
      const last = p.solution[p.solution.length - 1];
      assert.ok(last.board?.some((l) => l.notes?.length) || p.answerSpec.kind === 'whiteboard' || p.solution.some((st) => st.board?.some((l) => l.notes?.length)), `${where}: poslední krok bez výsledku`);
    }
  }
});

test('téma 11: ruční kontrola pevných příkladů', () => {
  // negativní externalita: MPB P = 80 − Q, MPC P = 20 + Q, MEC = 20 → Qtrh 30, Qopt 20, nadprodukce 10, DWL ½·20·10 = 100
  assert.equal(byId['neg-externalita'].solve({ A: 80, B: 1, C: 20, D: 1, e: 20, ask: 'Qtrh' }).answerSpec.value, 30);
  assert.equal(byId['neg-externalita'].solve({ A: 80, B: 1, C: 20, D: 1, e: 20, ask: 'Qopt' }).answerSpec.value, 20);
  assert.equal(byId['neg-externalita'].solve({ A: 80, B: 1, C: 20, D: 1, e: 20, ask: 'nadprod' }).answerSpec.value, 10);
  assert.equal(byId['mrtva-ztrata'].solve({ A: 80, B: 1, C: 20, D: 1, e: 20 }).answerSpec.value, 100);
  // pozitivní externalita: MPB P = 60 − Q, MPC P = 10 + Q, MEB = 20 → Qtrh 25, Qopt 35, DWL 100, dotace 20, náklad 700
  assert.equal(byId['poz-externalita'].solve({ A: 60, B: 1, C: 10, D: 1, e: 20, ask: 'Qopt' }).answerSpec.value, 35);
  assert.equal(byId['poz-externalita'].solve({ A: 60, B: 1, C: 10, D: 1, e: 20, ask: 'dwl' }).answerSpec.value, 100);
  assert.equal(byId['poz-externalita'].solve({ A: 60, B: 1, C: 10, D: 1, e: 20, ask: 'naklad' }).answerSpec.value, 700);
  // Pigouova daň s MEC = Q: MPB P = 70 − Q, MPC P = 10 + Q; MSC = 10 + 2Q → Qopt 20, t = 20, P kupující 50, výnos 400
  assert.equal(byId['pigou-dan'].solve({ A: 70, B: 1, C: 10, D: 1, k: 1, ask: 't' }).answerSpec.value, 20);
  assert.equal(byId['pigou-dan'].solve({ A: 70, B: 1, C: 10, D: 1, k: 1, ask: 'Pspotr' }).answerSpec.value, 50);
  assert.equal(byId['pigou-dan'].solve({ A: 70, B: 1, C: 10, D: 1, k: 1, ask: 'vynos' }).answerSpec.value, 400);
  // Coase: filtr 30 000, škoda 50 000 → náklady 30 000, úspora 20 000, bez ohledu na držitele práva
  for (const prava of ['firma', 'soused']) {
    assert.equal(byId.coase.solve({ K: 30000, S: 50000, prava, ask: 'naklady' }).answerSpec.value, 30000);
    assert.equal(byId.coase.solve({ K: 50000, S: 30000, prava, ask: 'naklady' }).answerSpec.value, 30000);
  }
  // povolení: MAC_A = 2x, MAC_B = 3x, R = 10 → x_A = 6, x_B = 4, cena 12, náklady ½·2·36 + ½·3·16 = 60
  assert.equal(byId.povoleni.solve({ m1: 2, m2: 3, R: 10, ask: 'cena' }).answerSpec.value, 12);
  assert.equal(byId.povoleni.solve({ m1: 2, m2: 3, R: 10, ask: 'xA' }).answerSpec.value, 6);
  assert.equal(byId.povoleni.solve({ m1: 2, m2: 3, R: 10, ask: 'naklady' }).answerSpec.value, 60);
});

test('téma 11: klasifikace statků podle tabulky 2×2 (příklady z prezentace)', () => {
  const t = byId['typ-statku'];
  const find = (needle) => {
    for (let i = 0; i < 30; i++) {
      const p = t.solve({ item: i });
      if (p.task && p.task.includes(needle)) return p.answerSpec.value;
    }
    return null;
  };
  assert.equal(find('jablko'), 'soukromy');
  assert.equal(find('ryby ve volném oceánu'), 'spolecny');
  assert.equal(find('přeplněná silnice'), 'spolecny');
  assert.equal(find('kabelová televize'), 'klubovy');
  assert.equal(find('soukromý park'), 'klubovy');
  assert.equal(find('národní obrana'), 'verejny');
  assert.equal(find('základní výzkum'), 'verejny');
});

test('téma 11: ano/ne podle skript (úkoly a–h, j) mají správné odpovědi', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 11: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['pigou-dan'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 11: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-neg-ext', 'graf-poz-ext', 'graf-pigou']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['neg-externalita', 'pigou-dan', 'mrtva-ztrata', 'poz-externalita', 'coase', 'povoleni', 'typ-statku', 'asym-info', 'nastroj', 'ano-ne']) assert.equal(part(id), 'zapocet', id);
});

test('téma 11: grafové úlohy mají vzorový graf se správným pořadím křivek (MSC nad MPC, MSB nad MPB)', () => {
  const neg = byId['graf-neg-ext'].generate(makeRng(3));
  const labels = neg.answerSpec.reference.data.curves.map((c) => c.label);
  assert.deepEqual(labels, ['MPB', 'MPC', 'MSC']);
  const poz = byId['graf-poz-ext'].generate(makeRng(3));
  assert.deepEqual(poz.answerSpec.reference.data.curves.map((c) => c.label), ['MPB', 'MSB', 'MPC']);
  const pig = byId['graf-pigou'].generate(makeRng(3));
  assert.ok(pig.answerSpec.reference.data.curves.some((c) => /MSC/.test(c.label)));
  assert.equal(pig.answerSpec.reference.data.arrows.length, 1);
});
