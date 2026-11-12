import { test } from 'node:test';
import assert from 'node:assert/strict';
import tema from '../../js/topics/tema06.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { check } from '../../js/checker.js';
import { evaluate } from '../../js/checker-core.js';

// ---------- nezávislé výpočty: hrubé prohledání, žádné vzorce z generátoru ----------
// Největší hodnota funkce na pravidelné síti 0, step, 2 step, …, hi: vrací { x, y }.
function argmax(fn, hi, step = 0.25) {
  let best = { x: 0, y: -Infinity };
  for (let x = 0; x <= hi + 1e-9; x += step) {
    const y = fn(x);
    if (y > best.y + 1e-9) best = { x, y };
  }
  return best;
}
// Nejbližší bod, kde se dvě funkce protínají (nejmenší rozdíl na síti).
function crossing(f, g, hi, step = 0.25) {
  let best = { x: 0, gap: Infinity };
  for (let x = 0; x <= hi + 1e-9; x += step) {
    const gap = Math.abs(f(x) - g(x));
    if (gap < best.gap) best = { x, gap };
  }
  return best.x;
}
// Obsah pod funkcí h na <lo, hi> středovým pravidlem (u lineární funkce přesné).
function integrate(h, lo, hi, n = 4000) {
  const dx = (hi - lo) / n; let s = 0;
  for (let i = 0; i < n; i++) s += h(lo + (i + 0.5) * dx) * dx;
  return s;
}

// monopol s konstantním MC: optimum hrubou silou přes zisk
const monoScan = ({ a, b, c, F = 0 }) => {
  const best = argmax((q) => (a - b * q) * q - F - c * q, a / b);
  return { Q: best.x, P: a - b * best.x, pi: best.y };
};
const nearlyEqual = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

const BOOK_ANO_NE = {
  'k71-a': true, 'k71-b': false, 'k71-c': false, 'k71-d': true, 'k71-e': true, 'k71-f': true, 'k71-g': true, 'k71-h': false, 'k71-i': false, 'k71-j': true,
  'k72-a': false, 'k72-b': true, 'k72-c': true, 'k72-e': false, 'k72-f': false, 'k72-g': false, 'k72-h': false, 'k72-i': true, 'k72-j': true,
  'k73-a': false, 'k73-b': false, 'k73-c': true, 'k73-d': true, 'k73-f': true, 'k73-g': true, 'k73-h': true, 'k73-i': true, 'k73-j': true,
};
const STRUCT = { s1: 'mon', s2: 'oli', s3: 'mk', s4: 'dk', s5: 'mon', s6: 'oli', s7: 'mk', s8: 'dk', s9: 'mon', s10: 'oli', s11: 'oli', s12: 'mk' };

const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));

test('téma 6: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'nedokonala-konkurence');
  assert.equal(tema.order, 6);
  assert.equal(tema.title, 'Nedokonalá konkurence');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 6: výklad obsahuje definice pro zkoušku (term), časté chyby a grafy', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
  assert.ok(tema.theory.filter((t) => t.viz && t.viz.kind === 'econ').length >= 5);
});

test('téma 6: v textech výkladu není Markdown ani podtržítko mimo vzorec', () => {
  const bare = (s) => String(s).replace(/\$[^$]*\$/g, '');
  for (const t of tema.theory) {
    for (const s of [t.heading, t.text, ...(t.mistakes || [])]) {
      assert.ok(!/\*|_/.test(bare(s)), `výklad „${t.heading}“: hvězdička nebo podtržítko v textu`);
      assert.equal((String(s).match(/\$/g) || []).length % 2, 0, `výklad „${t.heading}“: lichý počet $`);
    }
  }
});

test('téma 6: texty příkladů jsou česky bez Markdownu a bez podtržítek mimo vzorec', () => {
  const bare = (s) => String(s).replace(/\$[^$]*\$/g, '');
  for (const type of tema.types) {
    for (let seed = 1; seed <= 60; seed++) {
      const p = type.generate(makeRng(seed));
      const texts = [p.task, p.conclusion, ...p.solution.flatMap((s) => [s.title, s.text])];
      for (const s of texts) {
        assert.ok(!/\*|_/.test(bare(s)), `${type.id} seed ${seed}: hvězdička/podtržítko v textu „${s}“`);
        assert.equal((String(s).match(/\$/g) || []).length % 2, 0, `${type.id} seed ${seed}: lichý počet $`);
      }
    }
  }
});

test('téma 6: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      'mon-optimum': (p) => {
        const { a, b, c, F, ask } = p.data;
        const m = monoScan({ a, b, c, F });
        return { Q: m.Q, P: m.P, pi: m.pi }[ask];
      },
      'mon-kvadr': (p) => {
        const { a, b, v, w, F, ask } = p.data;
        const best = argmax((q) => (a - b * q) * q - (F + v * q + w * q * q), a / b);
        return { Q: best.x, P: a - b * best.x, pi: best.y }[ask];
      },
      'mr-rovnice': (p) => {
        const { form, a, b } = p.data;
        const price = (q) => (form === 'P' ? a - b * q : (a - q) / b); // inverzní poptávka
        const tr = (q) => q * price(q);
        for (const q of [1, 2.5, 4, 7]) {
          const mr = (tr(q + 1e-4) - tr(q - 1e-4)) / 2e-4; // numerická derivace TR
          const got = evaluate(p.answerSpec.value, { Q: q });
          assert.ok(Math.abs(got - mr) < 1e-5, `MR(${q}): ${got} ≠ ${mr}`);
        }
        return p.answerSpec.value;
      },
      'mon-tabulka': (p) => {
        const { a, b, v, w, F, n } = p.data;
        const rows = [];
        for (let q = 1; q <= n; q++) {
          rows.push([a * q - b * q * q, a - b * (2 * q - 1), v + w * (2 * q - 1), (a - b * q) * q - (F + v * q + w * q * q)]);
        }
        // optimum z tabulky: poslední řádek, kde MR >= MC, musí být řádek s největším ziskem
        const lastOk = rows.reduce((k, r, i) => (r[1] >= r[2] ? i : k), -1);
        const bestPi = rows.reduce((k, r, i) => (r[3] > rows[k][3] ? i : k), 0);
        assert.equal(lastOk, bestPi, 'MR ≥ MC musí určit stejný řádek jako největší zisk');
        return rows.map((r) => r.map(String));
      },
      prebytek: (p) => {
        const { a, b, c, ask } = p.data;
        const price = ask === 'monopol' ? monoScan({ a, b, c }).P : c;
        const qEnd = ask === 'monopol' ? monoScan({ a, b, c }).Q : crossing((q) => a - b * q, () => c, a / b);
        return integrate((q) => a - b * q - price, 0, qEnd);
      },
      'mrtva-ztrata': (p) => {
        const { a, b, c } = p.data;
        const qm = monoScan({ a, b, c }).Q;
        const qk = crossing((q) => a - b * q, () => c, a / b);
        return integrate((q) => a - b * q - c, qm, qk);
      },
      srovnani: (p) => {
        const { a, b, c, ask } = p.data;
        const m = monoScan({ a, b, c });
        const qk = crossing((q) => a - b * q, () => c, a / b);
        return { Qk: qk, Pk: a - b * qk, dQ: qk - m.Q, dP: m.P - (a - b * qk) }[ask];
      },
      lerner: (p) => {
        const { a, b, c, ask } = p.data;
        const m = monoScan({ a, b, c });
        const qd = (price) => (a - price) / b; // poptávané množství při ceně
        const h = 1e-3;
        const E = Math.abs((qd(m.P + h) - qd(m.P - h)) / (2 * h)) * (m.P / m.Q);
        return ask === 'E' ? E : (m.P - c) / m.P;
      },
      'strop-monopol': (p) => {
        const { a, b, c, F, Pmax, ask } = p.data;
        const profit = (q) => Math.min(a - b * q, Pmax) * q - c * q - F;
        const best = argmax(profit, a / b);
        assert.ok(Pmax > c && Pmax < monoScan({ a, b, c }).P, 'strop mezi MC a cenou monopolu');
        return ask === 'Q' ? best.x : best.y;
      },
      'dan-monopol': (p) => {
        const { a, b, c, t, ask } = p.data;
        const best = argmax((q) => (a - b * q) * q - (c + t) * q, a / b);
        return { P: a - b * best.x, Q: best.x, T: t * best.x }[ask];
      },
      kartel: (p) => {
        const { a, b, c, n, f, ask } = p.data;
        const best = argmax((q) => (a - b * q) * q - c * q - n * f, a / b);
        assert.ok(Number.isInteger(best.x / n), 'kvóta je celé číslo');
        return { Q: best.x, q: best.x / n, pi: best.y }[ask];
      },
      dominantni: (p) => {
        const { A, B, alpha, beta, c, F, ask } = p.data;
        const best = argmax((q) => (alpha - beta * q) * q - c * q - F, alpha / beta);
        const price = alpha - beta * best.x;
        const market = (A - price) / B;
        assert.ok(market > best.x, 'lem dodává kladné množství');
        return { q: best.x, p: price, lem: market - best.x, pi: best.y }[ask];
      },
      'mk-dlouhe': (p) => {
        const { b, v, k, j, ask } = p.data;
        const F = b * k * k; const a0 = v + 2 * b * k + 2 * b * j;
        const maxProfit = (a) => argmax((q) => (a - b * q) * q - F - v * q, a / b);
        // krátké období má kladný zisk, dlouhé je nejmenší poptávka s nezáporným ziskem
        assert.ok(maxProfit(a0).y > 0, 'v krátkém období zisk');
        let aLong = v;
        while (maxProfit(aLong).y < -1e-9) aLong += 0.25;
        const best = maxProfit(aLong);
        return { a: aLong, Q: best.x, P: aLong - b * best.x }[ask];
      },
      'vezen-dilema': (p) => {
        const { m } = p.data;
        const S = ['V', 'N']; const found = [];
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            let stable = true;
            for (let i2 = 0; i2 < 2; i2++) if (m[i2][j][0] > m[i][j][0]) stable = false;
            for (let j2 = 0; j2 < 2; j2++) if (m[i][j2][1] > m[i][j][1]) stable = false;
            if (stable) found.push(S[i] + S[j]);
          }
        }
        assert.equal(found.length, 1, 'právě jedna Nashova rovnováha');
        return found[0];
      },
      struktura: (p) => STRUCT[p.data.id],
      'cteni-grafu': (p) => {
        const { a, b, v, w, F, pts } = p.data;
        const best = argmax((q) => (a - b * q) * q - (F + v * q + w * q * q), a / b, 0.05);
        const hit = pts.filter((x) => Math.abs(x.x - best.x) < 0.06);
        assert.equal(hit.length, 1, 'optimu odpovídá právě jeden vyznačený bod');
        return hit[0].id;
      },
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
    },
    minDistinct: {
      'mon-optimum': 100, 'mon-kvadr': 100, 'mr-rovnice': 50, 'mon-tabulka': 50, prebytek: 100, 'mrtva-ztrata': 50, srovnani: 100, lerner: 20,
      'strop-monopol': 50, 'dan-monopol': 100, kartel: 50, dominantni: 50, 'mk-dlouhe': 50, 'vezen-dilema': 20, struktura: 10,
      'cteni-grafu': 50, 'ano-ne': 30, definice: 10, 'graf-monopol': 100, 'graf-mrtva': 50, 'graf-mk-dlouhe': 50,
    },
  });
});

test('téma 6: cvičebnice kap. 7, 7.1 (pevné příklady dávají výsledky z knihy)', () => {
  const opt = byId['mon-optimum']; const kv = byId['mon-kvadr'];
  const val = (t, d) => t.solve(d).answerSpec.value;
  // úloha 2: P = 58 − 0,001Q, TC = 100 000 + 10Q + 0,0002Q² → Q = 20 000, P = 38
  assert.equal(val(kv, { a: 58, b: 0.001, v: 10, w: 0.0002, F: 100000, ask: 'Q' }), 20000);
  assert.equal(val(kv, { a: 58, b: 0.001, v: 10, w: 0.0002, F: 100000, ask: 'P' }), 38);
  // úloha 3: MC = 9, Q = 81 − P (P = 81 − Q), FC 108 → Q 36, P 45, zisk 1188
  assert.equal(val(opt, { a: 81, b: 1, c: 9, F: 108, ask: 'Q' }), 36);
  assert.equal(val(opt, { a: 81, b: 1, c: 9, F: 108, ask: 'P' }), 45);
  assert.equal(val(opt, { a: 81, b: 1, c: 9, F: 108, ask: 'pi' }), 1188);
  assert.equal(val(byId.prebytek, { a: 81, b: 1, c: 9, ask: 'monopol' }), 648); // úloha 3b
  assert.equal(byId.lerner.solve({ a: 81, b: 1, c: 9, ask: 'E' }).answerSpec.value, 1.25); // úloha 3d
  // úloha 4: P = 3000 − 0,01Q, MC = 1000, FC 200 000 → MC = 1000, MR = 3000 − 0,02Q, Q 100 000, P 2000, zisk 99 800 000 (99 800 tis.)
  assert.equal(val(opt, { a: 3000, b: 0.01, c: 1000, F: 200000, ask: 'Q' }), 100000);
  assert.equal(val(opt, { a: 3000, b: 0.01, c: 1000, F: 200000, ask: 'P' }), 2000);
  assert.equal(val(opt, { a: 3000, b: 0.01, c: 1000, F: 200000, ask: 'pi' }), 99800000);
  assert.equal(byId.lerner.solve({ a: 3000, b: 0.01, c: 1000, ask: 'E' }).answerSpec.value, 2);
  const mr4 = byId['mr-rovnice'].solve({ form: 'P', a: 3000, b: 0.01 }).answerSpec;
  assert.equal(check(mr4, '3000 - 0,02Q').ok, true);
  assert.equal(check(mr4, '3000 - 0,01Q').ok, false);
  const mr3 = byId['mr-rovnice'].solve({ form: 'Q', a: 81, b: 1 }).answerSpec; // Q = 81 − P
  assert.equal(check(mr3, '81 - 2Q').ok, true);
  // úloha 5: AR = 98 − 5q, TC = 3q² + 2q + 4 → q 6, P 68, zisk 284, FC = 4
  assert.equal(val(kv, { a: 98, b: 5, v: 2, w: 3, F: 4, ask: 'Q' }), 6);
  assert.equal(val(kv, { a: 98, b: 5, v: 2, w: 3, F: 4, ask: 'P' }), 68);
  assert.equal(val(kv, { a: 98, b: 5, v: 2, w: 3, F: 4, ask: 'pi' }), 284);
});

test('téma 6: cvičebnice kap. 7, 7.2 oligopol (úlohy 1 a 6, graf 7.2 úlohy 2 až 5)', () => {
  const df = byId.dominantni;
  const val = (d) => df.solve(d).answerSpec.value;
  // úloha 1: P = 60 − 2Q, p = 40 − q, MC = 8, FC = 32 → q 16, p 24, lem 2, zisk 224
  const d1 = { A: 60, B: 2, alpha: 40, beta: 1, c: 8, F: 32 };
  assert.equal(val({ ...d1, ask: 'q' }), 16);
  assert.equal(val({ ...d1, ask: 'p' }), 24);
  assert.equal(val({ ...d1, ask: 'lem' }), 2);
  assert.equal(val({ ...d1, ask: 'pi' }), 224);
  // úloha 6: Q = 600 − P/2 (P = 1200 − 2Q), dominantní p = 900 − 1,5q, MC = 300, FC = 10 000 → q 200, p 600, lem 100, zisk 50 000
  const d6 = { A: 1200, B: 2, alpha: 900, beta: 1.5, c: 300, F: 10000 };
  assert.equal(val({ ...d6, ask: 'q' }), 200);
  assert.equal(val({ ...d6, ask: 'p' }), 600);
  assert.equal(val({ ...d6, ask: 'lem' }), 100);
  assert.equal(val({ ...d6, ask: 'pi' }), 50000);
  // úlohy 2 až 5 (Obr. 7.2): firma vyrábí tam, kde MR = MC (v knize množství 75, odpověď b); zde stejná logika čtení grafu
  const g = byId['cteni-grafu'].solve({ a: 60, b: 1, v: 10, w: 1, F: 20, order: [0, 1, 2, 3] });
  assert.equal(g.answerSpec.value, 'A');
});

test('téma 6: cvičebnice kap. 7, 7.3 monopolistická konkurence (úlohy 2, 3, 5; chyby knihy opraveny)', () => {
  const opt = byId['mon-optimum']; const kv = byId['mon-kvadr'];
  const val = (t, d) => t.solve(d).answerSpec.value;
  // úloha 2: P = 12 − Q, MC = 5, FC = 7 → Q 3,5, P 8,5, zisk 5,25 (kniha: 12,25 = zisk bez odečtení FC, chyba), Lerner 0,411
  assert.equal(val(opt, { a: 12, b: 1, c: 5, F: 7, ask: 'Q' }), 3.5);
  assert.equal(val(opt, { a: 12, b: 1, c: 5, F: 7, ask: 'P' }), 8.5);
  assert.equal(val(opt, { a: 12, b: 1, c: 5, F: 7, ask: 'pi' }), 5.25);
  const lern = byId.lerner.solve({ a: 12, b: 1, c: 5, ask: 'L' }).answerSpec;
  assert.ok(Math.abs(lern.value - 0.411) < 0.001);
  assert.equal(check(lern, '0,411').ok, true);
  // úloha 3: TC = 42Q² + 150Q + 6, P = 1000 − 8Q → Q 8,5, P 932, zisk 3606,5 > 0, odvětví tedy není v dlouhodobé rovnováze
  assert.equal(val(kv, { a: 1000, b: 8, v: 150, w: 42, F: 6, ask: 'Q' }), 8.5);
  assert.equal(val(kv, { a: 1000, b: 8, v: 150, w: 42, F: 6, ask: 'P' }), 932);
  assert.equal(val(kv, { a: 1000, b: 8, v: 150, w: 42, F: 6, ask: 'pi' }), 3606.5);
  // úloha 5: P = 140 − 5Q, TC = 50Q + 50 → Q 9, P 95, zisk 355 (kniha: 354,6, chyba zaokrouhlení)
  assert.equal(val(kv, { a: 140, b: 5, v: 50, w: 0, F: 50, ask: 'Q' }), 9);
  assert.equal(val(kv, { a: 140, b: 5, v: 50, w: 0, F: 50, ask: 'P' }), 95);
  assert.equal(val(kv, { a: 140, b: 5, v: 50, w: 0, F: 50, ask: 'pi' }), 355);
});

test('téma 6: ano/ne podle cvičebnice (úkoly C) mají správné odpovědi, i 7.1 i opravené', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 6: tabulka TR/MR/MC/zisk dá správné řádky a kontrolu odpovědi', () => {
  // P = 40 − 4Q (Q = 1…5), TC = 20 + 4Q + Q²: TR 36, 64, 84, 96, 100; MR 36, 28, 20, 12, 4; MC 5, 7, 9, 11, 13
  const p = byId['mon-tabulka'].solve({ a: 40, b: 4, v: 4, w: 1, F: 20, n: 5 });
  assert.deepEqual(p.answerSpec.value, [[36, 36, 5, 11], [64, 28, 7, 32], [84, 20, 9, 43], [96, 12, 11, 44], [100, 4, 13, 35]].map((r) => r.map(String)));
  assert.equal(check(p.answerSpec, p.answerSpec.value).ok, true);
  assert.equal(check(p.answerSpec, [[36, 36, 5, 11], [64, 28, 7, 32], [84, 20, 9, 43], [96, 12, 11, 44], [100, 4, 13, 34]].map((r) => r.map(String))).ok, false);
  assert.match(p.conclusion, /Q = 4/);
});

test('téma 6: strop a daň u monopolu (ověřené příklady)', () => {
  // P = 100 − Q, MC = 20: monopol Q 40, P 60. Strop 50 → Q 50, zisk (50 − 20) · 50 = 1500
  assert.equal(byId['strop-monopol'].solve({ a: 100, b: 1, c: 20, F: 0, Pmax: 50, ask: 'Q' }).answerSpec.value, 50);
  assert.equal(byId['strop-monopol'].solve({ a: 100, b: 1, c: 20, F: 0, Pmax: 50, ask: 'pi' }).answerSpec.value, 1500);
  // daň 10 na kus: MC = 30 → Q 35, P 65 (cena vzrostla o polovinu daně), výnos daně 350
  assert.equal(byId['dan-monopol'].solve({ a: 100, b: 1, c: 20, t: 10, ask: 'Q' }).answerSpec.value, 35);
  assert.equal(byId['dan-monopol'].solve({ a: 100, b: 1, c: 20, t: 10, ask: 'P' }).answerSpec.value, 65);
  assert.equal(byId['dan-monopol'].solve({ a: 100, b: 1, c: 20, t: 10, ask: 'T' }).answerSpec.value, 350);
});

test('téma 6: mrtvá ztráta, kartel a dlouhé období monopolistické konkurence', () => {
  // P = 100 − Q, MC = 20: Qm 40, Pm 60, Qk 80 → DWL = ½ · 40 · 40 = 800
  assert.equal(byId['mrtva-ztrata'].solve({ a: 100, b: 1, c: 20 }).answerSpec.value, 800);
  // kartel 4 firem: Q 40, kvóta 10, zisk (60 − 20) · 40 − 4 · 50 = 1400
  assert.equal(byId.kartel.solve({ a: 100, b: 1, c: 20, n: 4, f: 50, ask: 'q' }).answerSpec.value, 10);
  assert.equal(byId.kartel.solve({ a: 100, b: 1, c: 20, n: 4, f: 50, ask: 'pi' }).answerSpec.value, 1400);
  // MK: MC = 10, F = 9, b = 1 → a = 16, Q = 3, P = 13 (= AC = 10 + 9/3)
  const d = { b: 1, v: 10, k: 3, j: 2 };
  assert.equal(byId['mk-dlouhe'].solve({ ...d, ask: 'a' }).answerSpec.value, 16);
  assert.equal(byId['mk-dlouhe'].solve({ ...d, ask: 'Q' }).answerSpec.value, 3);
  assert.equal(byId['mk-dlouhe'].solve({ ...d, ask: 'P' }).answerSpec.value, 13);
});

test('téma 6: vězňovo dilema má Nashovu rovnováhu (N, N)', () => {
  const p = byId['vezen-dilema'].solve({ m: [[[5, 5], [1, 8]], [[8, 1], [3, 3]]] });
  assert.equal(p.answerSpec.value, 'NN');
});

test('téma 6: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId['mon-optimum'];
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 6: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-monopol', 'graf-mrtva', 'graf-mk-dlouhe']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['mon-optimum', 'mon-kvadr', 'mon-tabulka', 'dominantni', 'ano-ne']) assert.equal(part(id), 'zapocet', id);
  for (const id of ['graf-monopol', 'graf-mrtva', 'graf-mk-dlouhe']) assert.equal(byId[id].generate(makeRng(1)).answerSpec.kind, 'whiteboard', id);
});

test('téma 6: v typech jsou všechny potřebné druhy odpovědí', () => {
  const kinds = new Set(tema.types.map((t) => t.generate(makeRng(3)).answerSpec.kind));
  for (const k of ['number', 'choice', 'truefalse', 'table', 'expression', 'whiteboard']) assert.ok(kinds.has(k), k);
});
