// Čisté ekonomické výpočty pro generátory příkladů a jejich testy. Žádné DOM, žádná náhoda.
// Konvence: poptávka Qd = a − b·P, nabídka Qs = c + d·P (b, d > 0); inverzní poptávka P = a − b·Q (monopol).
// Funkce vrací null, když výsledek není definovaný (dělení nulou, rovnoběžné křivky).

const finite = (v) => (Number.isFinite(v) ? v : null);

// Rovnováha: a − bP = c + dP → P = (a − c)/(b + d), Q = a − bP.
export function equilibrium({ a, b, c, d }) {
  if (b + d === 0) return null;
  const P = (a - c) / (b + d);
  return { P, Q: a - b * P };
}

// Oblouková elasticita. Středový vzorec (výchozí): (ΔQ / průměr Q) / (ΔP / průměr P);
// midpoint:false počítá z počátečních hodnot: (ΔQ / Q0) / (ΔP / P0).
function arc(x0, x1, y0, y1, midpoint) {
  const dx = x1 - x0; const dy = y1 - y0;
  const bx = midpoint ? (x0 + x1) / 2 : x0;
  const by = midpoint ? (y0 + y1) / 2 : y0;
  if (dy === 0 || bx === 0 || by === 0) return null;
  return finite((dx / bx) / (dy / by));
}

// Cenová elasticita poptávky nebo nabídky: q0, q1 množství, p0, p1 ceny.
export function elasticity({ q0, q1, p0, p1, midpoint = true }) {
  return arc(p0, p1, q0, q1, midpoint) === null ? null : arc(q0, q1, p0, p1, midpoint);
}

// Bodová elasticita: (dQ/dP)·P/Q. slope je dQ/dP (u Qd = a − bP je to −b).
export function pointElasticity({ slope, p, q }) {
  return q === 0 ? null : finite(slope * p / q);
}

// Důchodová elasticita: změna množství vůči změně důchodu.
export function incomeElasticity({ q0, q1, i0, i1, midpoint = true }) {
  return arc(q0, q1, i0, i1, midpoint);
}

// Křížová elasticita: změna množství statku A vůči změně ceny statku B.
export function crossElasticity({ q0, q1, pOther0, pOther1, midpoint = true }) {
  return arc(q0, q1, pOther0, pOther1, midpoint);
}

// Přebytek spotřebitele = ∫ Qd(p) dp od P po cenu, kde je poptávka nulová (a/b).
export function consumerSurplus({ a, b, price }) {
  const pmax = a / b;
  if (!(price < pmax)) return 0;
  return a * (pmax - price) - (b * (pmax * pmax - price * price)) / 2;
}

// Přebytek výrobce = ∫ Qs(p) dp od nejnižší ceny, za niž se vyrábí (max(0, −c/d)), po cenu P.
export function producerSurplus({ c, d, price }) {
  const lo = Math.max(0, -c / d);
  if (!(price > lo)) return 0;
  return c * (price - lo) + (d * (price * price - lo * lo)) / 2;
}

// Mezní míra substituce = MU_X / MU_Y.
export function mrs({ muX, muY }) {
  return muY === 0 ? null : muX / muY;
}

// Rozpočtová přímka X·px + Y·py = důchod: průsečíky s osami a směrnice −px/py.
export function budgetLine({ income, px, py }) {
  return { xMax: income / px, yMax: income / py, slope: -px / py };
}

export const totalCost = ({ fixed, variable }) => fixed + variable;

// Mezní náklad jako přírůstek celkových nákladů při zvýšení výstupu z q−1 na q.
export const marginalCost = (tc, q) => tc(q) - tc(q - 1);

export function averageCost(tc, q) {
  return q > 0 ? tc(q) / q : null;
}

// Dokonale konkurenční firma: P = MC (MC rostoucí). Při P < MC(0) firma nevyrábí (q = 0).
export function profitMaxCompetitive({ price, mc, tc, qMax = 1e6 }) {
  let q = 0;
  if (mc(0) < price) {
    let lo = 0; let hi = qMax;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (mc(mid) < price) lo = mid; else hi = mid;
    }
    q = (lo + hi) / 2;
  }
  return { q, profit: tc ? price * q - tc(q) : undefined };
}

// Monopol s lineární poptávkou P = a − bQ: MR = a − 2bQ = MC (mc je číslo nebo rostoucí funkce).
export function monopolyOptimum({ a, b, mc }) {
  const mcOf = typeof mc === 'function' ? mc : () => mc;
  const mr = (q) => a - 2 * b * q;
  const qCap = a / (2 * b);
  let Q = 0;
  if (mr(0) > mcOf(0)) {
    if (mr(qCap) > mcOf(qCap)) Q = qCap;
    else {
      let lo = 0; let hi = qCap;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (mr(mid) > mcOf(mid)) lo = mid; else hi = mid;
      }
      Q = (lo + hi) / 2;
    }
  }
  return { Q, P: a - b * Q, MR: mr(Q), MC: mcOf(Q) };
}

// Minimum konvexní funkce na <lo, hi> (např. bod vyrovnání = minimum AC, bod uzavření = minimum AVC).
export function minimumOf(fn, lo, hi) {
  let a = lo; let b = hi;
  for (let i = 0; i < 200; i++) {
    const m1 = a + (b - a) / 3; const m2 = b - (b - a) / 3;
    if (fn(m1) < fn(m2)) b = m2; else a = m1;
  }
  const x = (a + b) / 2;
  return { x, y: fn(x) };
}
