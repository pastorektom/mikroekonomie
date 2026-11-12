import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  equilibrium, elasticity, pointElasticity, incomeElasticity, crossElasticity,
  consumerSurplus, producerSurplus, mrs, budgetLine, totalCost, marginalCost, averageCost,
  profitMaxCompetitive, monopolyOptimum, minimumOf,
} from '../js/econ.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('equilibrium: Qd=100−2P, Qs=10+P → P=30, Q=40', () => {
  const e = equilibrium({ a: 100, b: 2, c: 10, d: 1 });
  near(e.P, 30);
  near(e.Q, 40);
});

test('equilibrium: dosazení rovnovážné ceny do obou rovnic dá stejné množství', () => {
  const { a, b, c, d } = { a: 83, b: 3, c: 5, d: 4 };
  const e = equilibrium({ a, b, c, d });
  near(a - b * e.P, c + d * e.P);
  near(e.Q, a - b * e.P);
});

test('equilibrium: rovnoběžné křivky (b+d=0) vrátí null, ne Infinity', () => {
  assert.equal(equilibrium({ a: 10, b: 1, c: 5, d: -1 }), null);
});

test('elasticity středovým vzorcem: Q 40→60, P 10→8 je −1,8 (ručně: (20/50)/(−2/9))', () => {
  near(elasticity({ q0: 40, q1: 60, p0: 10, p1: 8 }), -1.8);
});

test('elasticity z počátečních hodnot (midpoint:false): (20/40)/(−2/10) = −2,5', () => {
  near(elasticity({ q0: 40, q1: 60, p0: 10, p1: 8, midpoint: false }), -2.5);
});

test('elasticity při nulové změně ceny vrátí null', () => {
  assert.equal(elasticity({ q0: 40, q1: 60, p0: 10, p1: 10 }), null);
});

test('pointElasticity: Qd=100−2P v P=30 (Q=40): (dQ/dP)·P/Q = −2·30/40 = −1,5', () => {
  near(pointElasticity({ slope: -2, p: 30, q: 40 }), -1.5);
});

test('incomeElasticity a crossElasticity (středové)', () => {
  near(incomeElasticity({ q0: 100, q1: 120, i0: 1000, i1: 1100 }), (20 / 110) / (100 / 1050));
  near(crossElasticity({ q0: 50, q1: 60, pOther0: 20, pOther1: 25 }), (10 / 55) / (5 / 22.5));
});

test('consumerSurplus Qd=100−2P při P=30: 400', () => {
  near(consumerSurplus({ a: 100, b: 2, price: 30 }), 400);
});

test('consumerSurplus: cena nad cenou, kde je poptávka nulová, dává 0', () => {
  near(consumerSurplus({ a: 100, b: 2, price: 60 }), 0);
});

test('producerSurplus Qs=10+P při P=30: 750 (integrál ∫0..30 (10+p) dp)', () => {
  near(producerSurplus({ c: 10, d: 1, price: 30 }), 750);
});

test('producerSurplus Qs=−20+2P při P=30: 400 (trojúhelník od P=10)', () => {
  near(producerSurplus({ c: -20, d: 2, price: 30 }), 400);
});

test('mrs a budgetLine', () => {
  near(mrs({ muX: 6, muY: 3 }), 2);
  assert.deepEqual(budgetLine({ income: 200, px: 20, py: 50 }), { xMax: 10, yMax: 4, slope: -0.4 });
});

test('náklady: TC = FC + VC, MC = ΔTC/ΔQ, AC = TC/Q', () => {
  const tc = (q) => 100 + 10 * q + q * q;
  near(totalCost({ fixed: 100, variable: 60 }), 160);
  near(marginalCost(tc, 5), tc(5) - tc(4));
  near(averageCost(tc, 5), tc(5) / 5);
  assert.equal(averageCost(tc, 0), null);
});

test('profitMaxCompetitive: MC=2q+4, P=20 → q=8; zisk z TC', () => {
  const r = profitMaxCompetitive({ price: 20, mc: (q) => 2 * q + 4, tc: (q) => 50 + 4 * q + q * q });
  near(r.q, 8, 1e-4);
  near(r.profit, 20 * 8 - (50 + 32 + 64), 1e-3);
});

test('profitMaxCompetitive: cena pod MC(0) → q=0 (firma nevyrábí)', () => {
  assert.equal(profitMaxCompetitive({ price: 3, mc: (q) => 2 * q + 4 }).q, 0);
});

test('monopolyOptimum: P=100−Q, MC=20 → Q=40, P=60, MR=MC', () => {
  const m = monopolyOptimum({ a: 100, b: 1, mc: 20 });
  near(m.Q, 40, 1e-4);
  near(m.P, 60, 1e-4);
  near(m.MR, 20, 1e-3);
});

test('monopolyOptimum s rostoucím MC(q)=q: a−2bQ = Q → Q = 100/3 pro a=100,b=1', () => {
  const m = monopolyOptimum({ a: 100, b: 1, mc: (q) => q });
  near(m.Q, 100 / 3, 1e-3);
});

test('monopolyOptimum: MC nad MR(0) → Q=0', () => {
  assert.equal(monopolyOptimum({ a: 100, b: 1, mc: 150 }).Q, 0);
});

test('minimumOf: AC = q + 100/q má minimum v q=10, AC=20 (bod vyrovnání)', () => {
  const m = minimumOf((q) => q + 100 / q, 0.1, 100);
  near(m.x, 10, 1e-3);
  near(m.y, 20, 1e-3);
});
