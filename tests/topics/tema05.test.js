import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import tema from '../../js/topics/tema05.js';
import { verify } from '../helpers/verify.js';
import { makeRng } from '../../js/rng.js';
import { check } from '../../js/checker.js';
import { drawEcon } from '../../js/viz/econ.js';

const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const byId = Object.fromEntries(tema.types.map((t) => [t.id, t]));

// ---------- nezávislé výpočty: hrubé prohledávání a simulace, žádné vzorce z generátoru ----------
// Vrátí očekávanou hodnotu; je-li shodná se skutečnou v toleranci (numerické prohledávání), vrátí skutečnou.
const agree = (expected, got, tol = 1e-6) => (Math.abs(expected - got) <= tol * Math.max(1, Math.abs(got)) ? got : expected);

// Hrubé prohledání minima funkce na mřížce.
function scanMin(fn, lo, hi, step) {
  let best = { x: lo, y: Infinity };
  for (let x = lo; x <= hi + 1e-9; x += step) {
    const y = fn(x);
    if (y < best.y) best = { x, y };
  }
  return best;
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b}`);

// Kubické náklady z dat generátoru: TC = F + a·q − 2c·m·q² + c·q³, F = 2c·q0²(q0 − m).
const cubicCost = ({ a, c, m, q0 }) => {
  const F = 2 * c * q0 * q0 * (q0 - m);
  const vc = (q) => a * q - 2 * c * m * q * q + c * q ** 3;
  return { vc, tc: (q) => F + vc(q), avc: (q) => vc(q) / q, ac: (q) => (F + vc(q)) / q };
};
const quadCost = ({ a, b, k }) => {
  const F = b * k * k;
  return { tc: (q) => F + a * q + b * q * q, ac: (q) => (F + a * q + b * q * q) / q, F };
};
// Optimální výstup hrubým prohledáním zisku (zisk = P·q − TC, krok 0,5).
function argmaxProfit(P, tc, hi = 400) {
  let best = { q: 0, pi: -Infinity };
  for (let q = 0; q <= hi; q += 0.5) {
    const pi = P * q - tc(q);
    if (pi > best.pi + 1e-9) best = { q, pi };
  }
  return best;
}
// Simulace pavučiny: iterace cen s oddělenou reakcí poptávky a nabídky (bez vzorců ze zadání).
function simulateCobweb(form, v) {
  let qdOf; let qsOf; let pOfQd;
  if (form === 'P') { // P = A − B·Q, P = C + D·Q
    const [A, B, C, D] = v;
    qdOf = (P) => (A - P) / B; qsOf = (P) => (P - C) / D; pOfQd = (Q) => A - B * Q;
  } else { // Q = a − b·P, Q = c + d·P
    const [a, b, c, d] = v;
    qdOf = (P) => a - b * P; qsOf = (P) => c + d * P; pOfQd = (Q) => (a - Q) / b;
  }
  // rovnovážnou cenu najdeme půlením (poptávané množství klesá s cenou, nabízené roste)
  let lo = 0; let hi = 1e4;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (qdOf(mid) > qsOf(mid)) lo = mid; else hi = mid; }
  const Pe = (lo + hi) / 2;
  let P = Pe + 1;
  for (let t = 0; t < 12; t++) P = pOfQd(qsOf(P)); // výrobci reagují na minulou cenu
  return Math.abs(P - Pe) < 1 ? 'konv' : 'div';
}

const BOOK_ANO_NE = {
  'kn-a': true, 'kn-b': true, 'kn-c': false, 'kn-d': false, 'kn-e': false, 'kn-f': false, 'kn-g': true,
  'kn-h': false, 'kn-j': true, 'kn-k': true, 'kn-m': true, 'kn-n': true, 'kn-s': true,
};
const ASSUME_OK_TEXTS = [
  'Velký počet prodávajících a kupujících, z nichž žádný sám neovlivní cenu', 'Homogenní (identický) produkt',
  'Volný vstup do odvětví a výstup z něj', 'Dokonalá informovanost všech subjektů', 'Firmy jsou příjemci ceny (cenu berou jako danou)',
];

test('téma 5: struktura (id, pořadí, výklad, typy)', () => {
  assert.equal(tema.id, 'dokonala-konkurence');
  assert.equal(tema.order, 5);
  assert.equal(tema.title, 'Firma v podmínkách dokonalé konkurence');
  assert.ok(tema.theory.length >= 7);
  for (const t of tema.theory) assert.ok(t.heading && t.text, 'každý oddíl výkladu má nadpis a text');
  assert.ok(tema.types.length >= 10);
  assert.equal(new Set(tema.types.map((t) => t.id)).size, tema.types.length);
});

test('téma 5: výklad má definice pro zkoušku (term), časté chyby a vykreslitelné grafy', () => {
  assert.ok(tema.theory.filter((t) => t.term).length >= 7);
  assert.ok(tema.theory.filter((t) => Array.isArray(t.mistakes) && t.mistakes.length).length >= 5);
  for (const t of tema.theory) {
    if (t.viz) assert.equal(drawEcon(svg(), t.viz.data), true, `graf oddílu „${t.heading}“ se nevykreslil`);
    const all = [t.heading, t.text, ...(t.mistakes || [])].join('\n');
    assert.ok(!/\*\*|\*|(^|[^\\])_/.test(all.replace(/\$[^$]*\$/g, '')), `Markdown nebo podtržítko mimo vzorec v oddílu „${t.heading}“`);
  }
});

test('téma 5: texty příkladů nemají Markdown ani podtržítko mimo vzorec', () => {
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

test('téma 5: 300 příkladů od každého typu je použitelných a správných (nezávislý výpočet)', () => {
  verify(tema, {
    n: 300,
    independent: {
      optimum: (p) => {
        const { F, a, b, P } = p.data;
        return argmaxProfit(P, (q) => F + a * q + b * q * q).q;
      },
      'cena-z-vystupu': (p) => {
        // cena = mezní náklad = derivace TC v bodě q (centrální diference)
        const { F, a, b, c, q } = p.data;
        const tc = (x) => F + a * x + b * x * x + c * x ** 3;
        const h = 1e-3;
        return agree((tc(q + h) - tc(q - h)) / (2 * h), p.answerSpec.value, 1e-6);
      },
      'zisk-ztrata': (p) => {
        const { F, a, b, P } = p.data;
        const best = argmaxProfit(P, (q) => F + a * q + b * q * q);
        assert.ok(best.q > 0 && P > a + b * best.q, 'firma má vyrábět (P > AVC)');
        return best.pi;
      },
      rozhodnuti: (p) => {
        const { P, afc, avc, horizon } = p.data;
        const fixedLoss = afc; // ztráta při zavření (na kus)
        const lossIfProduce = afc + avc - P;
        if (horizon === 'dlouhe') return lossIfProduce < 0 ? 'zisk' : 'konec';
        if (lossIfProduce < 0) return 'zisk';
        return lossIfProduce < fixedLoss ? 'ztrata' : 'konec';
      },
      'tabulka-rozhodnuti': (p) => {
        const { L, f, v, prices } = p.data;
        const kr = prices.map((P) => {
          const lossPerUnit = f + v - P; // kladná = ztráta
          if (lossPerUnit < 0) return '1';
          return lossPerUnit < f ? '2' : '3'; // ztráta menší než AFC = lepší vyrábět
        });
        const dl = prices.map((P) => (P - L > 0 ? '1' : '3'));
        return prices.map((_, i) => [kr[i], dl[i]]);
      },
      'optimum-tabulka': (p) => {
        const { fc, vc, tc, price } = p.data;
        const costs = vc ? vc.map((x) => fc + x) : tc;
        let best = 1; let bestPi = -Infinity;
        costs.forEach((cst, i) => { const pi = price * (i + 1) - cst; if (pi >= bestPi) { bestPi = pi; best = i + 1; } });
        // druhá cesta: kdo se vyplatí vyrábět dál podle mezního nákladu (MC rostoucí v generátoru)
        let q = 0; let prev = fc;
        costs.forEach((cst, i) => { if (cst - prev <= price) q = i + 1; prev = cst; });
        assert.equal(q, best, 'MC ≤ P a maximum zisku souhlasí');
        return best;
      },
      'tabulka-prijmu': (p) => {
        const { price, fc, vc } = p.data;
        // zisk skládáme postupně: −FC + součet (P − MC)
        let pi = -fc; let prev = 0;
        return vc.map((x, i) => { const mc = x - prev; prev = x; pi += price - mc; return [String(price * (i + 1)), String(mc), String(pi)]; });
      },
      'bod-uzavreni': (p) => {
        const { a, c, m, q0, ask } = p.data;
        const { avc } = cubicCost({ a, c, m, q0 });
        const best = scanMin(avc, 0.01, q0 + 4, 0.01);
        return ask === 'q' ? agree(best.x, p.answerSpec.value, 1e-3) : agree(best.y, p.answerSpec.value, 1e-3);
      },
      'bod-vyrovnani': (p) => {
        const { a, b, k, ask } = p.data;
        const { ac } = quadCost({ a, b, k });
        const best = scanMin(ac, 0.01, 2 * k, 0.005);
        return ask === 'q' ? agree(best.x, p.answerSpec.value, 1e-3) : agree(best.y, p.answerSpec.value, 1e-3);
      },
      'rozpeti-cen': (p) => {
        const { a, c, m, q0 } = p.data;
        const { avc, ac } = cubicCost({ a, c, m, q0 });
        const lo = scanMin(avc, 0.01, q0 + 4, 0.01); const hi = scanMin(ac, 0.01, q0 + 4, 0.01);
        near(hi.x, q0, 0.02, 'minimum AC při q0');
        return [[String(agree(lo.y, Number(p.answerSpec.value[0][0]), 1e-3)), String(agree(hi.y, Number(p.answerSpec.value[0][1]), 1e-3))]];
      },
      'zisk-obdelnik': (p) => {
        const { P, q, AC, cost } = p.data;
        assert.ok(cost, 'generované příklady nesou parametry nákladů');
        const { tc } = quadCost(cost);
        near(tc(q) / q, AC, 1e-9, 'AC z nákladové funkce');
        assert.equal(P, cost.a + 2 * cost.b * q, 'P = MC při q*');
        return P * q - tc(q); // zisk z TR − TC místo (P − AC)·q
      },
      'odvetvi-rovnovaha': (p) => {
        const { N, k, m, A, s, ask } = p.data;
        const supply = (P) => (P > k ? (N * (P - k)) / m : 0);
        const demand = (P) => s * (A - P);
        let lo = 0; let hi = A;
        for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (demand(mid) > supply(mid)) lo = mid; else hi = mid; }
        const P = (lo + hi) / 2; const Q = demand(P);
        // přebytek spotřebitele integrujeme lichoběžníky po 0,001 Kč
        let cs = 0; const dp = 0.001;
        for (let x = P; x < A; x += dp) cs += (demand(x) + demand(Math.min(A, x + dp))) / 2 * dp;
        const exp = { P, Q, CS: cs }[ask];
        return agree(exp, p.answerSpec.value, 1e-4);
      },
      'nabidka-odvetvi': (p) => {
        const { firms, ask, P } = p.data;
        const total = (price) => firms.reduce((s, f) => s + f.m * price - f.c, 0);
        if (ask === 'q') return total(P);
        for (const price of [1, 7, 13, 29, 50]) {
          const got = check({ ...p.answerSpec }, p.answerSpec.value);
          assert.equal(got.ok, true);
          // hodnota výrazu v P musí souhlasit se součtem jednotlivých nabídek
          const expr = p.answerSpec.value.replace(/P/g, `(${price})`);
          const v = Function(`"use strict";return (${expr})`)();
          near(v, total(price), 1e-9, `nabídka odvětví při P = ${price}`);
        }
        for (const f of firms) assert.ok(f.c / f.m < (p.data.P ?? 1e9), 'všechny firmy vyrábějí');
        return p.answerSpec.value;
      },
      'dlouha-rovnovaha': (p) => {
        const { a, b, k, s, M, ask } = p.data;
        const { ac } = quadCost({ a, b, k });
        const best = scanMin(ac, 0.01, 3 * k, 0.005);
        const P = best.y; const q = best.x; const N = (M - s * P) / q;
        assert.ok(Math.abs(N - Math.round(N)) < 1e-3 && N > 0, 'počet firem je kladné celé číslo');
        return agree({ P, q, N }[ask], p.answerSpec.value, 1e-3);
      },
      'nulovy-zisk': (p) => {
        const { TR, AC } = p.data;
        for (let Q = 1; Q <= 100000; Q++) if (Q * AC === TR) return Q;
        throw new Error('žádné Q nevyhovuje');
      },
      pavucina: (p) => simulateCobweb(p.data.form, p.data.v),
      predpoklady: (p) => p.answerSpec.options.filter((o) => ASSUME_OK_TEXTS.includes(o.text)).map((o) => o.id),
      'ano-ne': (p) => (p.data.id in BOOK_ANO_NE ? BOOK_ANO_NE[p.data.id] : p.answerSpec.value),
    },
    minDistinct: {
      optimum: 100, 'cena-z-vystupu': 60, 'zisk-ztrata': 100, rozhodnuti: 80, 'tabulka-rozhodnuti': 100, 'optimum-tabulka': 100,
      'tabulka-prijmu': 100, 'bod-uzavreni': 60, 'bod-vyrovnani': 60, 'rozpeti-cen': 40, 'zisk-obdelnik': 20, 'odvetvi-rovnovaha': 40,
      'nabidka-odvetvi': 100, 'dlouha-rovnovaha': 100, 'nulovy-zisk': 40, pavucina: 40, predpoklady: 1, 'ano-ne': 10, definice: 6,
      'graf-firma': 10, 'graf-nabidka-firmy': 5, 'graf-odvetvi': 2,
    },
  });
});

test('téma 5: cvičebnice kap. 6, úloha 3 (TC = 2000 + 2Q + 0,1Q² + 0,005Q³, q = 100 → P = 172)', () => {
  const p = byId['cena-z-vystupu'].solve({ F: 2000, a: 2, b: 0.1, c: 0.005, q: 100 });
  assert.equal(p.answerSpec.value, 172);
});

test('téma 5: cvičebnice kap. 6, úloha 4 (tabulka rozhodnutí 6.3)', () => {
  const p = byId['tabulka-rozhodnuti'].solve({ L: 30, f: 12, v: 21, prices: [35, 10, 20, 31, 28] });
  // kód 1 = ziskem, 2 = ztrátou, 3 = ukončení; sloupce krátké a dlouhé období (Tab. 6.3)
  assert.deepEqual(p.answerSpec.value, [['1', '1'], ['3', '3'], ['3', '3'], ['2', '1'], ['2', '3']]);
  assert.equal(check(p.answerSpec, [['1', '1'], ['3', '3'], ['3', '3'], ['2', '1'], ['2', '3']]).ok, true);
  assert.equal(check(p.answerSpec, [['1', '1'], ['3', '3'], ['3', '3'], ['1', '1'], ['2', '3']]).ok, false);
});

test('téma 5: cvičebnice kap. 6, úloha 5 (zisk 700 Kč na kus, celkem 49 000 000 Kč)', () => {
  assert.equal(byId['zisk-obdelnik'].solve({ P: 2500, q: 70000, AC: 1800 }).answerSpec.value, 49000000);
});

test('téma 5: cvičebnice kap. 6, úlohy 6 a 7 (optimální objem z tabulky)', () => {
  // úloha 6: FC 40, VC 40, 110, 160, 230, 320, 420, P = 90 → Q = 5
  assert.equal(byId['optimum-tabulka'].solve({ fc: 40, vc: [40, 110, 160, 230, 320, 420], price: 90 }).answerSpec.value, 5);
  // úloha 7: TC 1 000; 1 500; 2 300; 3 300; 5 000, P = 1 000 → q = 4
  assert.equal(byId['optimum-tabulka'].solve({ tc: [1000, 1500, 2300, 3300, 5000], price: 1000 }).answerSpec.value, 4);
});

test('téma 5: cvičebnice kap. 6, úloha 8 (P = MC = AC = 20 Kč, Q = 1 000 ks)', () => {
  assert.equal(byId['nulovy-zisk'].solve({ TR: 20000, AC: 20, AVC: 10 }).answerSpec.value, 1000);
});

test('téma 5: cvičebnice kap. 6, úlohy 9 a 10 (d: vyrábět se ztrátou; c: ukončit)', () => {
  assert.equal(byId.rozhodnuti.solve({ P: 100, afc: 40, avc: 70, horizon: 'kratke' }).answerSpec.value, 'ztrata');
  assert.equal(byId.rozhodnuti.solve({ P: 100, afc: 40, avc: 70, horizon: 'dlouhe' }).answerSpec.value, 'konec');
});

test('téma 5: cvičebnice kap. 6, úloha 11 (TC = 800 + 16q + q², P = 70 → q = 27, ztráta 71 Kč)', () => {
  assert.equal(byId.optimum.solve({ F: 800, a: 16, b: 1, P: 70 }).answerSpec.value, 27);
  assert.equal(byId['zisk-ztrata'].solve({ F: 800, a: 16, b: 1, P: 70 }).answerSpec.value, -71);
});

test('téma 5: cvičebnice kap. 6, úloha 12 (2 000 firem, MC = 4 + q, P = 10 − Q/500 → Q = 2 400, P = 5,2, PS = 5 760)', () => {
  const data = { N: 2000, k: 4, m: 1, A: 10, s: 500 };
  assert.equal(byId['odvetvi-rovnovaha'].solve({ ...data, ask: 'P' }).answerSpec.value, 5.2);
  assert.equal(byId['odvetvi-rovnovaha'].solve({ ...data, ask: 'Q' }).answerSpec.value, 2400);
  assert.equal(byId['odvetvi-rovnovaha'].solve({ ...data, ask: 'CS' }).answerSpec.value, 5760);
});

test('téma 5: cvičebnice kap. 6, úloha 13 (tržní nabídka Q = 4P/5 − 14)', () => {
  const firms = [{ m: 0.25, c: 2 }, { m: 0.2, c: 3 }, { m: 0.25, c: 4 }, { m: 0.1, c: 5 }];
  const p = byId['nabidka-odvetvi'].solve({ firms, ask: 'expr' });
  assert.equal(check(p.answerSpec, '4P/5 - 14').ok, true);
  assert.equal(check(p.answerSpec, '0,8*P-14').ok, true);
  assert.equal(check(p.answerSpec, '4P/5 - 13').ok, false);
  assert.equal(byId['nabidka-odvetvi'].solve({ firms, ask: 'q', P: 60 }).answerSpec.value, 34);
});

test('téma 5: cvičebnice kap. 6, úloha 14 (b: poptávka méně elastická než nabídka → divergence)', () => {
  // Q_D = 100 − 2P (méně reaguje na cenu), Q_S = 10 + 5P (reaguje víc): d > b → diverguje
  assert.equal(byId.pavucina.solve({ form: 'Q', v: [100, 2, 10, 5] }).answerSpec.value, 'div');
  // elastická poptávka (b = 5) a málo elastická nabídka (d = 2): konverguje
  assert.equal(byId.pavucina.solve({ form: 'Q', v: [100, 5, 10, 2] }).answerSpec.value, 'konv');
  assert.equal(byId.pavucina.solve({ form: 'P', v: [100, 1, 20, 2] }).answerSpec.value, 'konv');
  assert.equal(byId.pavucina.solve({ form: 'P', v: [100, 2, 40, 1] }).answerSpec.value, 'div');
});

test('téma 5: cvičebnice kap. 6, úkoly ano/ne a–n, s (pevné odpovědi)', () => {
  const t = byId['ano-ne'];
  for (const [id, truth] of Object.entries(BOOK_ANO_NE)) {
    const p = t.solve({ id });
    assert.equal(p.answerSpec.value, truth, id);
    assert.ok(p.solution.length >= 3, id);
  }
});

test('téma 5: kubické náklady mají minimum AVC při m a minimum AC při q0 (graf i čísla sedí)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = byId['rozpeti-cen'].generate(makeRng(seed));
    const { a, c, m, q0 } = p.data;
    const { avc, ac } = cubicCost({ a, c, m, q0 });
    near(scanMin(avc, 0.01, q0 + 4, 0.01).x, m, 0.02, 'minimum AVC');
    near(scanMin(ac, 0.01, q0 + 4, 0.01).x, q0, 0.02, 'minimum AC');
    // MC protíná AC v minimu AC: MC(q0) = AC(q0)
    const mc = (q) => a - 4 * c * m * q + 3 * c * q * q;
    near(mc(q0), ac(q0), 1e-9, 'MC = AC v bodě vyrovnání');
    near(mc(m), avc(m), 1e-9, 'MC = AVC v bodě uzavření');
  }
});

test('téma 5: pavučina v zadání leží uvnitř grafu a šipky se vejdou do rozsahu', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = byId.pavucina.generate(makeRng(seed));
    const viz = p.solution.find((s) => s.viz).viz;
    const { domain, range, arrows, points } = viz.data;
    assert.ok(arrows.length >= 4);
    for (const a of arrows) {
      for (const [x, y] of [a.from, a.to]) {
        assert.ok(x > 0 && x <= domain[1] && y > 0 && y <= range[1], `šipka mimo graf (seed ${seed})`);
      }
    }
    for (const pt of points) assert.ok(pt.x > 0 && pt.x <= domain[1] && pt.y > 0 && pt.y <= range[1]);
  }
});

test('téma 5: stejný seed dá stejný příklad a různé seedy různé příklady', () => {
  const t = byId.optimum;
  assert.deepEqual(t.generate(makeRng(7)), t.generate(makeRng(7)));
  assert.notDeepEqual(t.generate(makeRng(7)).data, t.generate(makeRng(8)).data);
});

test('téma 5: zkouškové typy mají part „zkouska“, počítané „zapocet“', () => {
  const part = (id) => byId[id].generate(makeRng(1)).part;
  for (const id of ['definice', 'graf-firma', 'graf-nabidka-firmy', 'graf-odvetvi']) assert.equal(part(id), 'zkouska', id);
  for (const id of ['optimum', 'zisk-ztrata', 'pavucina', 'tabulka-rozhodnuti', 'rozhodnuti']) assert.equal(part(id), 'zapocet', id);
});

test('téma 5: grafové úlohy na tabuli mají vzorový graf, který se vykreslí, ve všech variantách', () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const id of ['graf-firma', 'graf-nabidka-firmy', 'graf-odvetvi']) {
      const p = byId[id].generate(makeRng(seed));
      assert.equal(p.answerSpec.kind, 'whiteboard');
      assert.equal(drawEcon(svg(), p.answerSpec.reference.data), true, `${id} seed ${seed}`);
    }
  }
  const situace = new Set();
  for (let seed = 1; seed <= 100; seed++) situace.add(byId['graf-firma'].generate(makeRng(seed)).data.situace);
  assert.deepEqual([...situace].sort(), ['uzavreni', 'zisk', 'ztrata']);
});
