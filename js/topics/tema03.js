// Téma 3: Chování spotřebitele a formování poptávky (podle skript kap. 4, prezentace 3 a cvičebnice kap. 4).
// Pevné příklady ze cvičebnice se staví týmž solve() z uložených dat (viz tests/topics/tema03.test.js).
// Tvar modulu je stejný jako u tema02.js (theory + types, generate(rng) a solve(data)).
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'spotrebitel';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- pomůcky ----------
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const r2 = (x) => Math.round(x * 100) / 100;
const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const nice = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return STEPS.find((f) => f * p >= v - 1e-9) * p; };
const pctTex = (x) => `${x > 0 ? '+' : ''}${cz(r6(x))}\\,\\%`;
const kc = (n) => `${cz(n)}\\ \\text{Kč}`;
const divisors = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
const tabTex = (rows) => `\\begin{array}{c|${'c'.repeat(rows[0].length - 1)}}${rows[0].join('&')}\\\\\\hline ${rows.slice(1).map((r) => r.join('&')).join('\\\\')}\\end{array}`;
const cells = (arr) => [arr.map((x) => String(r6(x)))];
const listTex = (arr) => arr.map(cz).join(',\\ ');

// Graf v rovině X, Y (nebo jiných os).
const xy = (data) => ({ kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, points: [], arrows: [], areas: [], ...data } });
const budgetExpr = (I, px, py) => `(${I} - ${px}*x)/${py}`;
const hyper = (k, label, color = 'blue', xMin = 0.5, xMax = 100) => ({ expr: `${k}/x`, label, color, domain: [xMin, xMax] });

// Rozpočtová přímka (a volitelně další křivky) s osami X a Y.
function budgetViz({ I, px, py }, extra = {}) {
  const xMax = I / px; const yMax = I / py;
  const domain = [0, nice(xMax * 1.15)]; const range = [0, nice(yMax * 1.15)];
  return xy({
    domain, range,
    curves: [{ expr: budgetExpr(I, px, py), label: 'BL', color: 'chalk', domain: [0, xMax] }, ...(extra.curves || [])],
    points: extra.points || [], arrows: extra.arrows || [],
    alt: extra.alt || 'Rozpočtová přímka',
  });
}

// Optimum při užitku U = X·Y: X = I/(2 PX), Y = I/(2 PY), indiferenční křivka Y = k/X.
function optimumViz({ I, px, py }) {
  const X = I / (2 * px); const Y = I / (2 * py); const k = X * Y;
  const xMax = I / px;
  const g = budgetViz({ I, px, py }, {
    curves: [hyper(k, 'I', 'blue', xMax * 0.05, nice(xMax * 1.15))],
    points: [{ x: X, y: Y, label: 'E', guides: true }],
    alt: 'Rozpočtová přímka, indiferenční křivka a optimum spotřebitele',
  });
  return g;
}

// ---------- typ: mezní užitek z funkce celkového užitku ----------
const quad = (a, b) => `${coef(a, 'Q')}-${b === 1 ? '' : cz(b)}Q^{2}`;

function buildMuDerivace({ a, b, q }) {
  const mu = a - 2 * b * q;
  const graph = xy({
    axes: { x: 'Q', y: 'MU' }, domain: [0, a / b], range: [0, nice(a * 1.1)],
    curves: [{ expr: `${a} - ${2 * b}*x`, label: 'MU', color: 'blue' }],
    points: [{ x: q, y: mu, label: `Q=${q}`, guides: true }], alt: 'Křivka mezního užitku',
  });
  return mk('mu-derivace', {
    data: { a, b, q },
    task: `Celkový užitek ze spotřeby statku je dán funkcí na řádku níže (Q je spotřebované množství). Určete mezní užitek při spotřebě ${q}. jednotky. Mezní užitek počítejte jako derivaci celkového užitku podle množství.`,
    promptTex: `TU=${quad(a, b)}`,
    answerSpec: { kind: 'number', value: mu },
    conclusion: `Mezní užitek při Q = ${q} je ${czText(mu)}.`,
    source: { chapter: 4, number: 2 },
    solution: [
      { title: 'Mezní užitek jako derivace', text: 'Mezní užitek říká, o kolik vzroste celkový užitek při spotřebě další (nekonečně malé) jednotky. Je to derivace celkového užitku podle množství.',
        board: [line('MU=\\frac{dTU}{dQ}')] },
      { title: 'Zderivujeme funkci', text: `Člen $${coef(a, 'Q')}$ se derivuje na ${cz(a)} a člen $-${b === 1 ? '' : cz(b)}Q^2$ na $-${coef(2 * b, 'Q')}$.`,
        board: [line(`TU=${quad(a, b)}`), line(`MU=${cz(a)}-${coef(2 * b, 'Q')}`)] },
      { title: 'Dosadíme množství', text: `Do funkce mezního užitku dosadíme $Q=${q}$.`,
        board: [result(`MU(${q})=${cz(a)}-${cz(2 * b)}\\cdot ${cz(q)}=${cz(mu)}`)] },
      { title: 'Graf mezního užitku', text: `Mezní užitek s množstvím klesá (zákon klesajícího mezního užitku). Pro ${q}. jednotku má hodnotu ${czText(mu)}.`, viz: graph },
    ],
  });
}

function genMuDerivace(rng) {
  const b = int(rng, 1, 3); const q = int(rng, 2, 9);
  return buildMuDerivace({ a: 2 * b * q + int(rng, 2, 20), b, q });
}

// ---------- typ: kde je celkový užitek největší ----------
function buildTuMax({ b, m, ask }) {
  const a = 2 * b * m; const tu = b * m * m;
  const askQ = ask === 'Q';
  const graph = xy({
    axes: { x: 'Q', y: 'U' }, domain: [0, 2 * m], range: [0, nice(tu * 1.2)],
    curves: [{ expr: `${a}*x - ${b}*x^2`, label: 'TU', color: 'blue' }, { expr: `${a} - ${2 * b}*x`, label: 'MU', color: 'accent', dashed: true }],
    points: [{ x: m, y: tu, label: 'max', guides: true }], alt: 'Celkový a mezní užitek, maximum celkového užitku',
  });
  return mk('tu-maximum', {
    data: { b, m, ask },
    task: askQ ? 'Celkový užitek ze spotřeby statku je dán funkcí na řádku níže. Při jaké spotřebě Q začne celkový užitek klesat (tj. kde je největší)?'
      : 'Celkový užitek ze spotřeby statku je dán funkcí na řádku níže. Jakého největšího celkového užitku lze spotřebou tohoto statku dosáhnout?',
    promptTex: `TU=${quad(a, b)}`,
    answerSpec: { kind: 'number', value: askQ ? m : tu },
    conclusion: askQ ? `Celkový užitek je největší při Q = ${czText(m)} a poté klesá.` : `Největší celkový užitek je ${czText(tu)} (při Q = ${czText(m)}).`,
    source: { chapter: 4, number: 3 },
    solution: [
      { title: 'Mezní užitek', text: 'Celkový užitek roste, dokud je mezní užitek kladný. Mezní užitek je derivace celkového užitku.',
        board: [line(`TU=${quad(a, b)}`), line(`MU=${cz(a)}-${coef(2 * b, 'Q')}`)] },
      { title: 'Maximum: MU = 0', text: 'Celkový užitek je největší v bodě, kde se mezní užitek rovná nule (další jednotka už užitek nepřidá).',
        board: [line(`${cz(a)}-${coef(2 * b, 'Q')}=0`), line(`Q=\\frac{${cz(a)}}{${cz(2 * b)}}`), askQ ? result(`Q=${cz(m)}`) : line(`Q=${cz(m)}`)] },
      { title: 'Největší užitek', text: `Množství ${czText(m)} dosadíme do funkce celkového užitku.`,
        board: [askQ ? line(`TU(${cz(m)})=${cz(a)}\\cdot ${cz(m)}-${cz(b)}\\cdot ${cz(m)}^{2}=${cz(tu)}`) : result(`TU(${cz(m)})=${cz(a)}\\cdot ${cz(m)}-${cz(b)}\\cdot ${cz(m)}^{2}=${cz(tu)}`)] },
      { title: 'Graf', text: `Křivka TU má vrchol v množství ${czText(m)}, kde MU protíná vodorovnou osu. Dál celkový užitek klesá.`, viz: graph },
    ],
  });
}

function genTuMax(rng) {
  return buildTuMax({ b: int(rng, 1, 4), m: int(rng, 3, 12), ask: pick(rng, ['Q', 'TU']) });
}

// ---------- typ: tabulka TU → MU (tabulka k vyplnění) ----------
function buildMuTabulka({ tu }) {
  const n = tu.length;
  const mu = tu.map((t, i) => t - (i ? tu[i - 1] : 0));
  const qs = tu.map((_, i) => i + 1);
  return mk('mu-tabulka', {
    data: { tu },
    task: `Tabulka udává celkový užitek ze spotřeby ${n} různých množství statku. Vypočtěte mezní užitek pro jednotlivá množství a zapište ho do ${n} polí po řadě (pro Q = 1 až ${n}).`,
    promptTex: tabTex([['Q', ...qs.map(cz)], ['TU', ...tu.map(cz)]]),
    answerSpec: { kind: 'table', value: cells(mu) },
    conclusion: `Mezní užitek pro Q = 1 až ${n}: ${mu.map(czText).join('; ')}.`,
    source: { chapter: 4, number: 5 },
    solution: [
      { title: 'Co je mezní užitek', text: 'Mezní užitek při množství Q je přírůstek celkového užitku proti předchozímu množství. U první jednotky se rovná celkovému užitku.',
        board: [line('MU_Q=TU_Q-TU_{Q-1}'), line('MU_1=TU_1')] },
      { title: 'Rozdíly sousedních hodnot', text: 'Od každého celkového užitku odečteme celkový užitek o jednu jednotku nižší.',
        board: [line(`MU_1=${cz(tu[0])}`), ...tu.slice(1).map((t, i) => line(`MU_{${i + 2}}=${cz(t)}-${cz(tu[i])}=${cz(mu[i + 1])}`))] },
      { title: 'Výsledek', text: 'Zapíšeme všechny mezní užitky v pořadí od první jednotky.',
        board: [result(`MU:\\ ${listTex(mu)}`)] },
      { title: 'Kontrola zákona klesajícího MU', text: 'Mezní užitek s každou další jednotkou klesá, i když celkový užitek ještě roste. Součet všech MU se musí rovnat poslednímu celkovému užitku.',
        board: [line(`${mu.map(cz).join('+')}=${cz(tu[n - 1])}`)] },
    ],
  });
}

function genMuTabulka(rng) {
  const mu = [int(rng, 50, 90)];
  for (let i = 1; i < 5; i++) mu.push(mu[i - 1] - int(rng, 3, 12));
  let t = 0;
  return buildMuTabulka({ tu: mu.map((m) => { t += m; return t; }) });
}

// ---------- typ: optimální skladba nákupu z tabulky MU ----------
// goods = [{ name, price, mu: [MU 1. jednotky, MU 2. jednotky, …] }], income = přesně utracená částka.
function bestBundle(goods, income) {
  let best = null; let count = 0;
  const q = new Array(goods.length).fill(0);
  const rec = (i, spent, tu) => {
    if (i === goods.length) {
      if (spent !== income) return; // utratí se přesně zadaná částka
      if (!best || tu > best.tu + 1e-9 || (Math.abs(tu - best.tu) < 1e-9 && spent > best.spent)) { best = { q: [...q], tu, spent }; count = 1; } else if (Math.abs(tu - best.tu) < 1e-9 && spent === best.spent) count++;
      return;
    }
    const g = goods[i]; let t = 0;
    for (let k = 0; k <= g.mu.length; k++) {
      if (k > 0) t += g.mu[k - 1];
      const s = spent + k * g.price;
      if (s > income) break;
      q[i] = k; rec(i + 1, s, tu + t);
    }
    q[i] = 0;
  };
  rec(0, 0, 0);
  return { q: [], tu: 0, spent: 0, ...best, unique: count === 1 };
}

// Nejnižší MU/P mezi koupenými a nejvyšší mezi nekoupenými jednotkami.
function boundary(goods, q) {
  let lo = Infinity; let hi = -Infinity;
  goods.forEach((g, i) => g.mu.forEach((m, k) => {
    const r = r6(m / g.price);
    if (k < q[i]) lo = Math.min(lo, r); else hi = Math.max(hi, r);
  }));
  return { lo, hi };
}

function buildOptimumTabulka({ goods, income }) {
  const best = bestBundle(goods, income);
  const bd = boundary(goods, best.q);
  const nm = (g) => `\\text{${g.name}}`;
  const ratios = goods.map((g) => g.mu.map((m) => r6(m / g.price)));
  const rows = [['Q', ...goods.map((g) => `MU\\ ${nm(g)}`)]];
  const maxLen = Math.max(...goods.map((g) => g.mu.length));
  for (let k = 0; k < maxLen; k++) rows.push([cz(k + 1), ...goods.map((g) => (g.mu[k] === undefined ? '-' : cz(g.mu[k])))]);
  const priceText = goods.map((g) => `${g.name} ${czText(g.price)} Kč`).join(', ');
  return mk('optimum-tabulka', {
    data: { goods, income },
    task: `Tabulka udává mezní užitek jednotlivých jednotek statků. Ceny: ${priceText}. Určete optimální skladbu nákupu, jestliže chcete utratit přesně ${czText(income)} Kč. Do polí zapište nakupovaná množství po řadě: ${goods.map((g) => g.name).join(', ')}.`,
    promptTex: tabTex(rows),
    answerSpec: { kind: 'table', value: cells(best.q) },
    conclusion: `Optimální nákup: ${goods.map((g, i) => `${g.name} ${czText(best.q[i])} ks`).join(', ')}. Celkem se utratí ${czText(best.spent)} Kč.`,
    source: { chapter: 4, number: 4 },
    solution: [
      { title: 'Vypočteme MU/P každé jednotky', text: 'Statky mají různou cenu, proto jednotky porovnáváme podle užitku na jednu korunu, tedy podle poměru mezního užitku k ceně.',
        board: goods.map((g, i) => line(`${nm(g)}:\\ ${ratios[i].map(cz).join(';\\ ')}`)) },
      { title: 'Které jednotky koupíme', text: `V optimu koupíme jednotky s nejvyšším MU/P a pokračujeme, dokud se nevyčerpá rozpočet. Nejnižší MU/P mezi koupenými jednotkami je ${czText(bd.lo)}, nejvyšší mezi nekoupenými ${czText(bd.hi)}.`,
        board: [...goods.map((g, i) => line(best.q[i] === 0 ? `${nm(g)}:\\ \\text{nekoupí se}` : `${nm(g)}:\\ Q=${cz(best.q[i])},\\ \\text{poslední koupená jednotka}\\ \\frac{MU}{P}=${cz(ratios[i][best.q[i] - 1])}`)), line(`${cz(bd.lo)}${bd.lo > bd.hi ? '>' : '\\ge'}${cz(bd.hi)}`)] },
      { title: 'Kontrola rozpočtu', text: `Součet výdajů musí vyjít na zadanou částku ${czText(income)} Kč.`,
        board: [line(`${goods.map((g, i) => `${cz(best.q[i])}\\cdot ${cz(g.price)}`).join('+')}=${cz(best.spent)}`)] },
      { title: 'Výsledek', text: `Optimální skladba: ${goods.map((g, i) => `${g.name} ${czText(best.q[i])} ks`).join(', ')}.`,
        board: [result(`(${best.q.map(cz).join(',\\ ')})`)] },
    ],
  });
}

const GOODS = [['pivo', 'piv'], ['hamburger', 'hamburgerů'], ['kino', 'lístků'], ['káva', 'káv'], ['kniha', 'knih'], ['víno', 'sklenic'], ['čokoláda', 'tabulek']];
function genOptimumTabulka(rng) {
  const priceList = [5, 10, 20, 25, 40, 50];
  const all = Array.from({ length: 100 }, (_, i) => i);
  for (let attempt = 0; attempt < 800; attempt++) {
    const n = rng() < 0.5 ? 2 : 3;
    const len = n === 2 ? 6 : 5;
    const names = shuffle(rng, GOODS).slice(0, n);
    const goods = names.map(([name]) => {
      const vals = shuffle(rng, all.slice(1, 21).map((v) => v * 5)).slice(0, len).sort((x, y) => y - x);
      return { name, price: pick(rng, priceList), mu: vals };
    });
    const income = goods.reduce((s, g) => s + g.price * int(rng, 1, 4), 0);
    const best = bestBundle(goods, income);
    const bd = boundary(goods, best.q);
    if (best.unique && best.spent === income && bd.lo > bd.hi) return buildOptimumTabulka({ goods, income });
  }
  return buildOptimumTabulka({
    goods: [{ name: 'pivo', price: 20, mu: [40, 20, 8, 4, 1] }, { name: 'kino', price: 200, mu: [40, 40, 40, 40, 40] }, { name: 'hamburger', price: 40, mu: [40, 24, 8, 4, 1] }],
    income: 600,
  });
}

// ---------- typ: optimum při užitku U = X·Y ----------
function buildOptimumCobb({ px, py, H, ask }) {
  const I = 2 * H; const X = H / px; const Y = H / py; const U = X * Y;
  const val = ask === 'X' ? X : ask === 'Y' ? Y : U;
  const what = ask === 'X' ? 'množství statku X' : ask === 'Y' ? 'množství statku Y' : 'dosažený celkový užitek';
  const mark = (key, tex) => (ask === key ? result(tex) : line(tex));
  return mk('optimum-cobb', {
    data: { px, py, H, ask },
    task: `Spotřebitel utrácí celý důchod ${czText(I)} Kč za statky X a Y. Cena statku X je ${czText(px)} Kč, cena statku Y ${czText(py)} Kč. Jeho celkový užitek je dán součinem na řádku níže (mezní užitek X je Y, mezní užitek Y je X). Určete ${what} v optimu spotřebitele.`,
    promptTex: 'U=X\\cdot Y',
    answerSpec: { kind: 'number', value: val },
    conclusion: `V optimu spotřebitel koupí ${czText(X)} jednotek X a ${czText(Y)} jednotek Y, celkový užitek je ${czText(U)}.`,
    solution: [
      { title: 'Podmínka optima', text: 'V optimu je užitek z poslední koruny stejný u obou statků. Mezní užitky jsou $MU_X=Y$ a $MU_Y=X$.',
        board: [line('\\frac{MU_X}{P_X}=\\frac{MU_Y}{P_Y}'), line(`\\frac{Y}{${cz(px)}}=\\frac{X}{${cz(py)}}`)] },
      { title: 'Vztah mezi X a Y', text: `Rovnici převedeme na tvar, kde na obou stranách stojí výdaje: výdaje na X se rovnají výdajům na Y (každý statek dostane polovinu důchodu).`,
        board: [line(`${cz(py)}\\,Y=${cz(px)}\\,X`)] },
      { title: 'Dosadíme do rozpočtu', text: 'Do rozpočtové rovnice za výdaje na Y dosadíme výdaje na X. Dostaneme dvojnásobek výdajů na X.',
        board: [line(`${cz(px)}X+${cz(py)}Y=${cz(I)}`), line(`2\\cdot ${cz(px)}X=${cz(I)}`), mark('X', `X=${cz(X)}`)] },
      { title: 'Množství Y a užitek', text: `Y vypočteme z rozpočtu (nebo ze vztahu mezi X a Y). Užitek je součin obou množství.`,
        board: [mark('Y', `Y=\\frac{${cz(I)}-${cz(px)}\\cdot ${cz(X)}}{${cz(py)}}=${cz(Y)}`), mark('U', `U=${cz(X)}\\cdot ${cz(Y)}=${cz(U)}`)] },
      { title: 'Graf optima', text: `Indiferenční křivka se rozpočtové přímky dotýká v bodě E (X = ${czText(X)}, Y = ${czText(Y)}).`, viz: optimumViz({ I, px, py }) },
    ],
  });
}

function genOptimumCobb(rng) {
  for (let i = 0; i < 100; i++) {
    const H = pick(rng, [60, 80, 100, 120, 150, 200, 240, 300]);
    const ds = divisors(H).filter((d) => H / d >= 3 && H / d <= 25 && d >= 2);
    const px = pick(rng, ds); const py = pick(rng, ds);
    if (px === py) continue;
    return buildOptimumCobb({ px, py, H, ask: pick(rng, ['X', 'Y', 'U']) });
  }
  return buildOptimumCobb({ px: 10, py: 5, H: 100, ask: 'X' });
}

// ---------- typ: rozpočtová přímka ----------
function genBudget(rng) {
  for (let i = 0; i < 200; i++) {
    const px = pick(rng, [5, 10, 20, 25, 40]); const py = pick(rng, [10, 20, 25, 40, 50]);
    const I = pick(rng, [200, 300, 400, 500, 600, 800, 1000, 1200]);
    if (px === py || I % px || I % py) continue;
    return { I, px, py };
  }
  return { I: 1000, px: 20, py: 25 };
}

function buildRozpocet({ I, px, py, ask, x0 }) {
  const xMax = I / px; const yMax = I / py;
  const yAfter = (I - px * (x0 ?? 0)) / py;
  const val = ask === 'x' ? xMax : ask === 'y' ? yMax : yAfter;
  const task = ask === 'x' ? `Spotřebitel má na útratu ${czText(I)} Kč. Statek X stojí ${czText(px)} Kč, statek Y ${czText(py)} Kč. Kolik jednotek statku X může nejvýš koupit (průsečík rozpočtové přímky s osou X)?`
    : ask === 'y' ? `Spotřebitel má na útratu ${czText(I)} Kč. Statek X stojí ${czText(px)} Kč, statek Y ${czText(py)} Kč. Kolik jednotek statku Y může nejvýš koupit (průsečík rozpočtové přímky s osou Y)?`
      : `Spotřebitel má na útratu ${czText(I)} Kč. Statek X stojí ${czText(px)} Kč, statek Y ${czText(py)} Kč. Kolik jednotek statku Y si může koupit, jestliže koupí ${czText(x0)} jednotek statku X a utratí celý důchod?`;
  const graph = budgetViz({ I, px, py }, { points: [{ x: xMax, y: 0, label: `${czText(xMax)}` }, { x: 0, y: yMax, label: `${czText(yMax)}` }, ...(ask === 'yx' ? [{ x: x0, y: yAfter, label: 'A', guides: true }] : [])] });
  return mk('rozpocet-primka', {
    data: { I, px, py, ask, x0: x0 ?? null },
    task,
    answerSpec: { kind: 'number', value: val },
    conclusion: ask === 'x' ? `Spotřebitel může koupit nejvýš ${czText(xMax)} jednotek X.` : ask === 'y' ? `Spotřebitel může koupit nejvýš ${czText(yMax)} jednotek Y.` : `Za zbytek peněz koupí ${czText(yAfter)} jednotek Y.`,
    source: { chapter: 4, number: 8 },
    solution: [
      { title: 'Rovnice rozpočtové přímky', text: 'Výdaje na oba statky se musí rovnat důchodu. Každý statek stojí cena krát množství.',
        board: [line('I=P_X\\,X+P_Y\\,Y'), line(`${cz(I)}=${cz(px)}X+${cz(py)}Y`)] },
      ask === 'x' ? { title: 'Průsečík s osou X', text: 'Na ose X je Y = 0: celý důchod se utratí za statek X.',
        board: [line(`${cz(I)}=${cz(px)}X`), result(`X=\\frac{${cz(I)}}{${cz(px)}}=${cz(xMax)}`)] }
        : ask === 'y' ? { title: 'Průsečík s osou Y', text: 'Na ose Y je X = 0: celý důchod se utratí za statek Y.',
          board: [line(`${cz(I)}=${cz(py)}Y`), result(`Y=\\frac{${cz(I)}}{${cz(py)}}=${cz(yMax)}`)] }
          : { title: 'Dosadíme množství X', text: `Za X dosadíme ${czText(x0)} a vyřešíme rovnici pro Y.`,
            board: [line(`${cz(I)}=${cz(px)}\\cdot ${cz(x0)}+${cz(py)}Y`), line(`${cz(py)}Y=${cz(I - px * x0)}`), result(`Y=${cz(yAfter)}`)] },
      { title: 'Druhý průsečík', text: ask === 'y' ? `Pro srovnání: osu X přímka protíná v ${czText(xMax)}.` : `Pro srovnání: osu Y přímka protíná v ${czText(yMax)}.`,
        board: [line(ask === 'y' ? `X_{max}=${cz(xMax)}` : `Y_{max}=${cz(yMax)}`)] },
      { title: 'Graf', text: `Přímka spojuje průsečíky s osami (${czText(xMax)}; 0) a (0; ${czText(yMax)}). Její sklon je záporný poměr cen $-P_X/P_Y$.`, viz: graph },
    ],
  });
}

function genRozpocet(rng) {
  const b = genBudget(rng);
  const ask = pick(rng, ['x', 'y', 'yx']);
  if (ask !== 'yx') return buildRozpocet({ ...b, ask });
  const xs = [];
  for (let x0 = 1; x0 < b.I / b.px; x0++) if ((b.I - b.px * x0) % b.py === 0) xs.push(x0);
  if (xs.length === 0) return buildRozpocet({ ...b, ask: 'x' });
  return buildRozpocet({ ...b, ask, x0: pick(rng, xs) });
}

// ---------- typ: důchod a cena Y z grafu rozpočtové přímky ----------
function buildRozpocetGraf({ xMax, yMax, px, ask }) {
  const I = px * xMax; const py = I / yMax;
  const askI = ask === 'I';
  const graph = budgetViz({ I, px, py }, { points: [{ x: xMax, y: 0, label: `${czText(xMax)}` }, { x: 0, y: yMax, label: `${czText(yMax)}` }] });
  return mk('rozpocet-z-grafu', {
    data: { xMax, yMax, px, ask },
    task: `Rozpočtová přímka spotřebitele protíná osu X v bodě ${czText(xMax)} jednotek a osu Y v bodě ${czText(yMax)} jednotek. Cena statku X je ${czText(px)} Kč. ${askI ? 'Určete důchod spotřebitele (v Kč).' : 'Určete cenu statku Y (v Kč).'}`,
    answerSpec: { kind: 'number', value: askI ? I : py },
    conclusion: askI ? `Důchod je ${czText(I)} Kč.` : `Cena statku Y je ${czText(py)} Kč.`,
    source: { chapter: 4, number: 9 },
    solution: [
      { title: 'Co říká průsečík s osou X', text: 'V průsečíku s osou X spotřebitel utrácí celý důchod za statek X, takže důchod je cena X krát maximální množství X.',
        board: [line('I=P_X\\cdot X_{max}'), line(`I=${cz(px)}\\cdot ${cz(xMax)}`), askI ? result(`I=${cz(I)}`) : line(`I=${cz(I)}`)] },
      { title: 'Co říká průsečík s osou Y', text: 'Stejně na ose Y: celý důchod se utratí za statek Y, a proto je maximální množství Y rovno důchodu dělenému cenou Y.',
        board: [line(`Y_{max}=\\frac{I}{P_Y}`), line(`${cz(yMax)}=\\frac{${cz(I)}}{P_Y}`)] },
      { title: 'Cena statku Y', text: 'Z poslední rovnice vyjádříme cenu Y.',
        board: [askI ? line(`P_Y=\\frac{${cz(I)}}{${cz(yMax)}}=${cz(py)}`) : result(`P_Y=\\frac{${cz(I)}}{${cz(yMax)}}=${cz(py)}`)] },
      { title: 'Rovnice rozpočtové přímky', text: 'Obě hodnoty dosadíme do rovnice přímky a ověříme si ji v obou průsečících.',
        board: [line(`${cz(px)}X+${cz(py)}Y=${cz(I)}`)], viz: graph },
    ],
  });
}

function genRozpocetGraf(rng) {
  for (let i = 0; i < 200; i++) {
    const px = pick(rng, [10, 20, 25, 40, 50]); const xMax = pick(rng, [10, 20, 25, 30, 40, 50, 60]);
    const I = px * xMax; const yMax = pick(rng, [10, 20, 25, 30, 40, 50, 80, 100]);
    const py = I / yMax;
    if (!Number.isInteger(py) || py === px || py < 5 || py > 100) continue;
    return buildRozpocetGraf({ xMax, yMax, px, ask: pick(rng, ['I', 'PY']) });
  }
  return buildRozpocetGraf({ xMax: 50, yMax: 40, px: 20, ask: 'I' });
}

// ---------- typ: změna rozpočtové přímky ----------
const CHANGES = {
  'duchod+': { text: (b, n) => `Důchod vzroste na ${czText(n.I)} Kč, ceny se nemění.`, apply: (b) => ({ ...b, I: 2 * b.I }), kind: 'rovnobezne', short: 'důchod roste' },
  'duchod-': { text: (b, n) => `Důchod klesne na ${czText(n.I)} Kč, ceny se nemění.`, apply: (b) => ({ ...b, I: b.I / 2 }), kind: 'rovnobezne', short: 'důchod klesá' },
  'cenaX+': { text: (b, n) => `Cena statku X vzroste na ${czText(n.px)} Kč, ostatní se nemění.`, apply: (b) => ({ ...b, px: 2 * b.px }), kind: 'otoceni-y', short: 'cena X roste' },
  'cenaX-': { text: (b, n) => `Cena statku X klesne na ${czText(n.px)} Kč, ostatní se nemění.`, apply: (b) => ({ ...b, px: b.px / 2 }), kind: 'otoceni-y', short: 'cena X klesá' },
  'cenaY+': { text: (b, n) => `Cena statku Y vzroste na ${czText(n.py)} Kč, ostatní se nemění.`, apply: (b) => ({ ...b, py: 2 * b.py }), kind: 'otoceni-x', short: 'cena Y roste' },
  'cenaY-': { text: (b, n) => `Cena statku Y klesne na ${czText(n.py)} Kč, ostatní se nemění.`, apply: (b) => ({ ...b, py: b.py / 2 }), kind: 'otoceni-x', short: 'cena Y klesá' },
  vse: { text: (b, n) => `Důchod i obě ceny se zdvojnásobí (důchod ${czText(n.I)} Kč, ceny ${czText(n.px)} Kč a ${czText(n.py)} Kč).`, apply: (b) => ({ I: 2 * b.I, px: 2 * b.px, py: 2 * b.py }), kind: 'beze-zmeny', short: 'vše se zdvojnásobí' },
};
const CHANGE_WHAT = {
  rovnobezne: 'Změna důchodu při stálých cenách posune přímku rovnoběžně (sklon $-P_X/P_Y$ zůstane stejný).',
  'otoceni-y': 'Změna ceny X při stálém důchodu otočí přímku kolem průsečíku s osou Y (ten se nemění, protože závisí jen na $I$ a $P_Y$).',
  'otoceni-x': 'Změna ceny Y při stálém důchodu otočí přímku kolem průsečíku s osou X (ten se nemění, protože závisí jen na $I$ a $P_X$).',
  'beze-zmeny': 'Když se důchod i všechny ceny změní ve stejném poměru, reálný důchod se nezmění a přímka zůstane na místě.',
};

function changeGraph(b, n) {
  const g0 = budgetViz(b); const g1 = budgetViz(n);
  const domain = [0, Math.max(g0.data.domain[1], g1.data.domain[1])]; const range = [0, Math.max(g0.data.range[1], g1.data.range[1])];
  return xy({
    domain, range,
    curves: [{ expr: budgetExpr(b.I, b.px, b.py), label: 'BL0', color: 'chalk', domain: [0, b.I / b.px] },
      { expr: budgetExpr(n.I, n.px, n.py), label: 'BL1', color: 'accent', dashed: true, domain: [0, n.I / n.px] }],
    alt: 'Původní a nová rozpočtová přímka',
  });
}

function buildRozpocetZmena({ I, px, py, change, ask }) {
  const b = { I, px, py }; const n = CHANGES[change].apply(b);
  const newX = n.I / n.px; const newY = n.I / n.py;
  const askX = ask === 'x';
  const val = askX ? newX : newY;
  return mk('rozpocet-zmena', {
    data: { I, px, py, change, ask },
    task: `Spotřebitel má důchod ${czText(I)} Kč, statek X stojí ${czText(px)} Kč a statek Y ${czText(py)} Kč. Pak nastane změna: ${CHANGES[change].text(b, n)} Kolik jednotek statku ${askX ? 'X' : 'Y'} může spotřebitel po změně nejvýš koupit?`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Po změně může koupit nejvýš ${czText(val)} jednotek statku ${askX ? 'X' : 'Y'}.`,
    source: { chapter: 4, number: 8 },
    solution: [
      { title: 'Původní přímka', text: 'Nejdřív zapíšeme původní rozpočtovou přímku a její průsečíky s osami.',
        board: [line(`${cz(I)}=${cz(px)}X+${cz(py)}Y`), line(`X_{max}=${cz(I / px)},\\quad Y_{max}=${cz(I / py)}`)] },
      { title: 'Co se změnilo', text: CHANGE_WHAT[CHANGES[change].kind],
        board: [line(`I=${cz(n.I)},\\quad P_X=${cz(n.px)},\\quad P_Y=${cz(n.py)}`)] },
      { title: 'Nová přímka', text: `Průsečík s osou ${askX ? 'X' : 'Y'} je důchod dělený cenou příslušného statku.`,
        board: [result(askX ? `X_{max}=\\frac{${cz(n.I)}}{${cz(n.px)}}=${cz(newX)}` : `Y_{max}=\\frac{${cz(n.I)}}{${cz(n.py)}}=${cz(newY)}`)] },
      { title: 'Graf', text: 'Původní přímka BL0 je plná, nová BL1 čárkovaná.', viz: changeGraph(b, n) },
    ],
  });
}

function genRozpocetZmena(rng) {
  const px = pick(rng, [10, 20, 40]); const py = pick(rng, [10, 20, 40, 50]);
  const I = pick(rng, [200, 400, 600, 800, 1000]);
  return buildRozpocetZmena({ I, px, py, change: pick(rng, Object.keys(CHANGES)), ask: pick(rng, ['x', 'y']) });
}

// ---------- typ: mezní míra substituce ----------
function buildMrs({ mode, a, b, x0, y0, x1, y1, px, py }) {
  let value; let task; let steps; let concl;
  if (mode === 'mu') {
    value = r6(a / b);
    task = `V určité spotřební situaci je mezní užitek statku X roven ${czText(a)} a mezní užitek statku Y roven ${czText(b)}. Určete mezní míru substituce statku X statkem Y (kolik jednotek Y je spotřebitel ochoten vzdát za jednu další jednotku X).`;
    steps = [
      { title: 'Definice MRS', text: 'Mezní míra substituce je poměr, ve kterém spotřebitel nahrazuje jeden statek druhým při stejném celkovém užitku. Rovná se poměru mezních užitků.', board: [line('MRS_{XY}=\\frac{MU_X}{MU_Y}')] },
      { title: 'Dosadíme', text: 'Mezní užitek statku X dáme do čitatele a statku Y do jmenovatele.', board: [line(`MRS_{XY}=\\frac{${cz(a)}}{${cz(b)}}`)] },
      { title: 'Výsledek', text: `Po dělení vyjde ${czText(value)}. Spotřebitel je ochoten vzdát se ${czText(value)} jednotek Y za jednu jednotku X.`, board: [result(`MRS_{XY}=${cz(value)}`)] },
    ];
    concl = `Mezní míra substituce je ${czText(value)}.`;
  } else if (mode === 'presun') {
    value = r6((y0 - y1) / (x1 - x0));
    task = `Spotřebitel je stejně spokojený s kombinací (X = ${czText(x0)}; Y = ${czText(y0)}) jako s kombinací (X = ${czText(x1)}; Y = ${czText(y1)}). Obě kombinace leží na téže indiferenční křivce. Určete mezní míru substituce X za Y mezi těmito body (kolik jednotek Y se vzdá za jednu přírůstkovou jednotku X).`;
    steps = [
      { title: 'Změny množství', text: 'Při přesunu po indiferenční křivce spotřebitel statku X přibude a statku Y ubude. Spočteme obě změny.',
        board: [line(`\\Delta X=${cz(x1)}-${cz(x0)}=${cz(x1 - x0)}`), line(`\\Delta Y=${cz(y1)}-${cz(y0)}=${cz(y1 - y0)}`)] },
      { title: 'Poměr změn', text: 'Mezní míra substituce je absolutní hodnota směrnice indiferenční křivky, tedy poměr změn bez znaménka.',
        board: [line(`MRS_{XY}=\\left|\\frac{\\Delta Y}{\\Delta X}\\right|=\\frac{${cz(y0 - y1)}}{${cz(x1 - x0)}}`)] },
      { title: 'Výsledek', text: `Za každou přírůstkovou jednotku X se spotřebitel vzdá ${czText(value)} jednotek Y.`, board: [result(`MRS_{XY}=${cz(value)}`)] },
    ];
    concl = `Mezní míra substituce je ${czText(value)}.`;
  } else {
    value = r6(px / py);
    task = `Spotřebitel je v optimu. Cena statku X je ${czText(px)} Kč a cena statku Y ${czText(py)} Kč. Jaká je v optimu jeho mezní míra substituce X za Y?`;
    steps = [
      { title: 'Podmínka optima', text: 'V optimu platí $MU_X/P_X=MU_Y/P_Y$. Převedením na jedné straně dostaneme poměr mezních užitků.', board: [line('\\frac{MU_X}{P_X}=\\frac{MU_Y}{P_Y}'), line('\\frac{MU_X}{MU_Y}=\\frac{P_X}{P_Y}')] },
      { title: 'MRS se rovná poměru cen', text: 'Levá strana je mezní míra substituce, v optimu se tedy rovná poměru cen (sklonu rozpočtové přímky bez znaménka).', board: [line('MRS_{XY}=\\frac{P_X}{P_Y}')] },
      { title: 'Dosadíme ceny', text: `Dosadíme zadané ceny ${czText(px)} a ${czText(py)}.`, board: [result(`MRS_{XY}=\\frac{${cz(px)}}{${cz(py)}}=${cz(value)}`)] },
    ];
    concl = `Mezní míra substituce v optimu je ${czText(value)}.`;
  }
  return mk('mrs', { data: { mode, a: a ?? null, b: b ?? null, x0: x0 ?? null, y0: y0 ?? null, x1: x1 ?? null, y1: y1 ?? null, px: px ?? null, py: py ?? null }, task, answerSpec: { kind: 'number', value }, conclusion: concl, solution: steps });
}

function genMrs(rng) {
  const mode = pick(rng, ['mu', 'presun', 'optimum']);
  if (mode === 'mu') {
    const b = pick(rng, [2, 4, 10, 20]); const m = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4]);
    return buildMrs({ mode, a: m * b, b });
  }
  if (mode === 'presun') {
    const dx = int(rng, 1, 4); const m = pick(rng, [1, 1.5, 2, 2.5, 3, 4]);
    const dy = m * dx; if (!Number.isInteger(dy)) return genMrs(rng);
    const x0 = int(rng, 1, 6); const y0 = int(rng, Math.ceil(dy) + 1, Math.ceil(dy) + 10);
    return buildMrs({ mode, x0, y0, x1: x0 + dx, y1: y0 - dy });
  }
  return buildMrs({ mode, px: pick(rng, [10, 20, 30, 40, 50]), py: pick(rng, [10, 20, 40, 50]) });
}

// ---------- typ: je spotřebitel v rovnováze? ----------
const SP_OPTIONS = [
  { id: 'rovnovaha', text: 'Je v rovnováze (v optimu)' },
  { id: 'vice-x', text: 'Měl by nakupovat více X a méně Y' },
  { id: 'vice-y', text: 'Měl by nakupovat méně X a více Y' },
  { id: 'vice-obou', text: 'Měl by nakupovat více obou statků' },
  { id: 'nelze', text: 'Z údajů to nelze určit' },
];

function spVerdict({ px, py, I, x, y, mux, muy }) {
  if (mux == null || muy == null) return 'nelze';
  if (px * x + py * y < I) return 'vice-obou';
  const l = mux * py; const r = muy * px;
  return l > r ? 'vice-x' : l < r ? 'vice-y' : 'rovnovaha';
}

function buildRovnovahaSp(d) {
  const { px, py, I, x, y, mux, muy, tux, tuy } = d;
  const ans = spVerdict(d);
  const spent = px * x + py * y;
  const head = `Spotřebitel má ${czText(I)} Kč týdně. Statek X stojí ${czText(px)} Kč, statek Y ${czText(py)} Kč. Právě kupuje kombinaci X = ${czText(x)}, Y = ${czText(y)}.`;
  const info = ans === 'nelze' ? ` Celkový užitek ze statku X je ${czText(tux)} a ze statku Y ${czText(tuy)}.` : ` Mezní užitek statku X je ${czText(mux)} a statku Y ${czText(muy)}.`;
  const verdictText = { rovnovaha: 'Spotřebitel je v rovnováze.', 'vice-x': 'Spotřebitel by měl nakupovat více X a méně Y.', 'vice-y': 'Spotřebitel by měl nakupovat méně X a více Y.', 'vice-obou': 'Spotřebitel by měl nakupovat více obou statků.', nelze: 'Z uvedených údajů to nelze určit.' }[ans];
  let steps;
  if (ans === 'nelze') {
    steps = [
      { title: 'Co víme', text: 'Zadány jsou jen celkové užitky ze spotřeby obou statků.', board: [line(`TU_X=${cz(tux)},\\quad TU_Y=${cz(tuy)}`), line(`${cz(px)}\\cdot ${cz(x)}+${cz(py)}\\cdot ${cz(y)}=${cz(spent)}`)] },
      { title: 'Co bychom potřebovali', text: 'Optimum se posuzuje podle poměru mezního užitku k ceně. Celkový užitek nám o mezním užitku nic neřekne (neznáme užitek o jednu jednotku méně).', board: [line('\\frac{MU_X}{P_X}\\ \\overset{?}{=}\\ \\frac{MU_Y}{P_Y}')] },
      { title: 'Závěr', text: verdictText, board: [result('\\text{nelze určit}')] },
    ];
  } else {
    const rx = r6(mux / px); const ry = r6(muy / py);
    const cmp = rx > ry ? '>' : rx < ry ? '<' : '=';
    steps = [
      { title: 'Kolik spotřebitel utrácí', text: spent < I ? 'Výdaje jsou nižší než důchod, takže spotřebitel nevyužívá celý rozpočet.' : 'Výdaje se rovnají důchodu, rozpočet je vyčerpán.',
        board: [line(`${cz(px)}\\cdot ${cz(x)}+${cz(py)}\\cdot ${cz(y)}=${cz(spent)}`), line(`${cz(spent)}${spent < I ? '<' : '='}${cz(I)}`)] },
      { title: 'Mezní užitek na korunu', text: 'Spočteme poměr mezního užitku k ceně pro oba statky.',
        board: [line(`\\frac{MU_X}{P_X}=\\frac{${cz(mux)}}{${cz(px)}}=${cz(rx)}`), line(`\\frac{MU_Y}{P_Y}=\\frac{${cz(muy)}}{${cz(py)}}=${cz(ry)}`)] },
      { title: 'Porovnání', text: spent < I ? 'Poměry vyšly stejné, ale rozpočet není vyčerpán, takže spotřebitel ještě může koupit víc obou statků (oba přinášejí kladný užitek).'
        : rx > ry ? 'Statek X přináší víc užitku na korunu. Přesunem peněz od Y k X celkový užitek vzroste.' : rx < ry ? 'Statek Y přináší víc užitku na korunu. Přesunem peněz od X k Y celkový užitek vzroste.' : 'Poměry se rovnají a rozpočet je vyčerpán: podmínka optima je splněna.',
        board: [line(`${cz(rx)}${cmp}${cz(ry)}`)] },
      { title: 'Závěr', text: verdictText, board: [result({ rovnovaha: '\\text{rovnováha}', 'vice-x': 'X\\uparrow,\\ Y\\downarrow', 'vice-y': 'X\\downarrow,\\ Y\\uparrow', 'vice-obou': 'X\\uparrow,\\ Y\\uparrow' }[ans])] },
    ];
  }
  return mk('rovnovaha-spotrebitele', {
    data: { px, py, I, x, y, mux: mux ?? null, muy: muy ?? null, tux: tux ?? null, tuy: tuy ?? null },
    task: `${head}${info} Je spotřebitel v optimu? Pokud ne, jak má změnit nákup?`,
    answerSpec: { kind: 'choice', value: ans, options: SP_OPTIONS },
    conclusion: verdictText,
    source: { chapter: 4, number: 6 },
    solution: steps,
  });
}

function genRovnovahaSp(rng) {
  const px = pick(rng, [5, 10]); const py = pick(rng, [4, 5, 8, 10]);
  const x = int(rng, 1, 8); const y = int(rng, 1, 8);
  const scenario = pick(rng, ['rovnovaha', 'vice-x', 'vice-y', 'vice-obou', 'nelze']);
  const base = { px, py, x, y, mux: null, muy: null, tux: null, tuy: null, I: px * x + py * y };
  if (scenario === 'nelze') return buildRovnovahaSp({ ...base, tux: 100 * int(rng, 2, 9), tuy: 100 * int(rng, 2, 9) });
  const r1 = int(rng, 2, 9); let r2 = int(rng, 2, 9);
  if (scenario === 'rovnovaha' || scenario === 'vice-obou') r2 = r1;
  else if (r2 === r1) r2 = r1 === 9 ? 2 : r1 + 1;
  const [ra, rb] = scenario === 'vice-y' ? [Math.min(r1, r2), Math.max(r1, r2)] : [Math.max(r1, r2), Math.min(r1, r2)];
  return buildRovnovahaSp({ ...base, I: base.I + (scenario === 'vice-obou' ? pick(rng, [px, py, px + py, 10]) : 0), mux: ra * px, muy: rb * py });
}

// ---------- typ: cenová elasticita poptávky z dvou bodů ----------
const elClass = (E) => (E > 1 ? 'elastická' : E < 1 ? 'neelastická' : 'jednotkově elastická');

function buildElCena({ p0, p1, q0, q1 }) {
  const dp = ((p1 - p0) / p0) * 100; const dq = ((q1 - q0) / q0) * 100;
  const E = r6(Math.abs(dq / dp));
  return mk('elasticita-cenova', {
    data: { p0, p1, q0, q1 },
    task: `Cena zboží se změnila z ${czText(p0)} Kč na ${czText(p1)} Kč a poptávané množství z ${czText(q0)} ks na ${czText(q1)} ks. Určete koeficient cenové elasticity poptávky (zadejte jeho hodnotu bez znaménka; změny počítejte vzhledem k původním hodnotám).`,
    answerSpec: { kind: 'number', value: E, abs: true },
    conclusion: `Cenová elasticita poptávky je ${czText(E)}, poptávka je ${elClass(E)}.`,
    source: { chapter: 4, number: 13 },
    solution: [
      { title: 'Procentní změna ceny', text: 'Změnu ceny dělíme původní cenou a vyjádříme v procentech.',
        board: [line(`\\%\\Delta P=\\frac{${cz(p1)}-${cz(p0)}}{${cz(p0)}}\\cdot 100=${pctTex(dp)}`)] },
      { title: 'Procentní změna množství', text: 'Stejně postupujeme u poptávaného množství.',
        board: [line(`\\%\\Delta Q=\\frac{${cz(q1)}-${cz(q0)}}{${cz(q0)}}\\cdot 100=${pctTex(dq)}`)] },
      { title: 'Koeficient elasticity', text: 'Elasticita je podíl procentní změny množství a procentní změny ceny. Znaménko je záporné (cena a množství se mění opačně), proto uvádíme absolutní hodnotu.',
        board: [result(`E_D=\\left|\\frac{${cz(r6(dq))}}{${cz(r6(dp))}}\\right|=${cz(E)}`)] },
      { title: 'Zařazení', text: `Hodnota ${czText(E)} je ${E > 1 ? 'větší než 1, poptávka je elastická' : E < 1 ? 'menší než 1, poptávka je neelastická' : 'rovna 1, poptávka je jednotkově elastická'}.`,
        board: [line(`${cz(E)}${E > 1 ? '>' : E < 1 ? '<' : '='}1`)] },
    ],
  });
}

function genElCena(rng) {
  for (let i = 0; i < 500; i++) {
    const p0 = pick(rng, [20, 40, 80, 100, 200]); const q0 = pick(rng, [400, 800, 1000, 2000]);
    const dpPct = pick(rng, [10, 20, 25, 50]) * (rng() < 0.5 ? 1 : -1);
    const E = pick(rng, [0.2, 0.4, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4]);
    const p1 = r6(p0 * (1 + dpPct / 100)); const q1 = r6(q0 * (1 - (E * dpPct) / 100));
    if (!Number.isInteger(p1) || !Number.isInteger(q1) || q1 <= 0 || p1 <= 0) continue;
    return buildElCena({ p0, p1, q0, q1 });
  }
  return buildElCena({ p0: 100, p1: 120, q0: 1000, q1: 800 });
}

// ---------- typ: bodová elasticita z lineární poptávky ----------
function buildElBod({ a, b, q, ask }) {
  const P = (a - q) / b; const TR = P * q; const E = r6((b * P) / q);
  const askE = ask === 'E';
  return mk('elasticita-bodova', {
    data: { a, b, q, ask },
    task: askE ? `Poptávka po zboží je popsána rovnicí na řádku níže (P je cena v Kč, Q množství v kusech). Určete cenovou elasticitu poptávky na úrovni ${czText(q)} prodaných kusů (zadejte hodnotu bez znaménka).`
      : `Poptávka po zboží je popsána rovnicí na řádku níže (P je cena v Kč, Q množství v kusech). Jak velké jsou celkové výdaje spotřebitelů (příjmy prodejce, v Kč), jestliže se prodá ${czText(q)} kusů?`,
    promptTex: `Q=${cz(a)}-${coef(b, 'P')}`,
    answerSpec: askE ? { kind: 'number', value: E, abs: true } : { kind: 'number', value: TR },
    conclusion: askE ? `Cenová elasticita poptávky je ${czText(E)}, poptávka je ${elClass(E)}.` : `Celkové výdaje jsou ${czText(TR)} Kč.`,
    source: { chapter: 4, number: 14 },
    solution: [
      { title: 'Cena při daném množství', text: `Do rovnice poptávky dosadíme $Q=${q}$ a vyjádříme cenu.`,
        board: [line(`${cz(q)}=${cz(a)}-${coef(b, 'P')}`), line(`P=\\frac{${cz(a)}-${cz(q)}}{${cz(b)}}=${cz(P)}`)] },
      { title: 'Celkové výdaje', text: 'Celkové výdaje spotřebitelů jsou cena krát množství, což jsou zároveň příjmy prodejce.',
        board: [askE ? line(`TR=P\\cdot Q=${cz(P)}\\cdot ${cz(q)}=${cz(TR)}`) : result(`TR=P\\cdot Q=${cz(P)}\\cdot ${cz(q)}=${cz(TR)}`)] },
      { title: 'Elasticita v bodě', text: `Sklon poptávky $dQ/dP$ je $-${cz(b)}$. Bodová elasticita je sklon krát poměr ceny a množství, v absolutní hodnotě tedy $b\\cdot P/Q$.`,
        board: [askE ? result(`E_D=\\left|-${cz(b)}\\right|\\cdot \\frac{${cz(P)}}{${cz(q)}}=${cz(E)}`) : line(`E_D=${cz(b)}\\cdot \\frac{${cz(P)}}{${cz(q)}}=${cz(E)}`)] },
      { title: 'Co z toho plyne', text: E > 1 ? `Elasticita ${czText(E)} je větší než 1 (poptávka je elastická), a prodejce proto zvýší příjmy snížením ceny.` : E < 1 ? `Elasticita ${czText(E)} je menší než 1 (poptávka je neelastická), a prodejce proto zvýší příjmy zvýšením ceny.` : 'Elasticita je rovna 1: příjmy jsou největší a změna ceny je nezmění.',
        board: [line(E > 1 ? '\\text{snížit cenu}' : E < 1 ? '\\text{zvýšit cenu}' : '\\text{příjem je maximální}')] },
    ],
  });
}

function genElBod(rng) {
  for (let i = 0; i < 500; i++) {
    const b = pick(rng, [2, 3, 4, 5, 7, 10, 14]); const P0 = pick(rng, [10, 20, 25, 30, 40, 50, 100]);
    const q = pick(rng, [100, 150, 200, 250, 300, 400, 500]);
    const E = (b * P0) / q;
    if (Math.abs(E * 100 - Math.round(E * 100)) > 1e-9) continue;
    return buildElBod({ a: q + b * P0, b, q, ask: pick(rng, ['E', 'TR']) });
  }
  return buildElBod({ a: 1600, b: 14, q: 200, ask: 'E' });
}

// ---------- typ: zařazení poptávky podle elasticity ----------
const EL_OPTIONS = [
  { id: 'el', text: 'Elastická (E > 1)' },
  { id: 'jednot', text: 'Jednotkově elastická (E = 1)' },
  { id: 'neel', text: 'Neelastická (0 < E < 1)' },
  { id: 'dok-neel', text: 'Dokonale neelastická (E = 0)' },
  { id: 'dok-el', text: 'Dokonale elastická (E jde do nekonečna)' },
];
const classifyE = (E) => (E === null ? 'dok-el' : E === 0 ? 'dok-neel' : E === 1 ? 'jednot' : E > 1 ? 'el' : 'neel');
const EL_ITEMS = [
  { id: 'e25', E: 2.5, text: 'Cenová elasticita poptávky po zboží je 2,5.' },
  { id: 'e04', E: 0.4, text: 'Cenová elasticita poptávky po zboží je 0,4.' },
  { id: 'e1', E: 1, text: 'Cenová elasticita poptávky po zboží je 1.' },
  { id: 'e0', E: 0, text: 'Cenová elasticita poptávky po zboží je 0 (množství na změnu ceny vůbec nereaguje).' },
  { id: 'e7', E: 7, text: 'Zdražení o 1 % sníží poptávané množství o 7 %.' },
  { id: 'e005', E: 0.05, text: 'Zdražení o 1 % sníží poptávané množství o 0,05 %.' },
  { id: 'e1x', E: 1, text: 'Zdražení o 10 % sníží poptávané množství přesně o 10 %.' },
  { id: 'e08', E: 0.8, text: 'Když cena vzroste o 5 %, množství klesne o 4 %.' },
  { id: 'e0b', E: 0, text: 'Cena klesla z 50 Kč na 20 Kč a prodané množství se vůbec nezměnilo.' },
  { id: 'einf', E: null, text: 'Při nepatrném zvýšení ceny nad určitou úroveň klesne poptávané množství na nulu (křivka poptávky je vodorovná).' },
];
const elItem = (id) => EL_ITEMS.find((x) => x.id === id) ?? EL_ITEMS[0];

function buildElKlas({ id }) {
  const it = elItem(id); const ans = classifyE(it.E);
  const reason = { el: 'Procentní změna množství je větší než procentní změna ceny, elasticita je větší než 1.', neel: 'Procentní změna množství je menší než procentní změna ceny, elasticita je mezi 0 a 1.', jednot: 'Procentní změny jsou stejné, elasticita je přesně 1.', 'dok-neel': 'Množství na cenu vůbec nereaguje, elasticita je nula.', 'dok-el': 'Při jediné ceně je množství libovolné a při jakékoli vyšší nulové, elasticita je nekonečná.' }[ans];
  return mk('elasticita-klasifikace', {
    data: { id, E: it.E },
    task: `${it.text} O jaký druh poptávky z hlediska cenové elasticity jde?`,
    answerSpec: { kind: 'choice', value: ans, options: EL_OPTIONS },
    conclusion: EL_OPTIONS.find((o) => o.id === ans).text,
    source: { chapter: 4, number: 'C-o' },
    solution: [
      { title: 'Určíme elasticitu', text: 'Z textu zjistíme koeficient elasticity, tedy poměr procentní změny množství a procentní změny ceny (v absolutní hodnotě).',
        board: [line(it.E === null ? 'E_D\\to\\infty' : `E_D=${cz(it.E)}`)] },
      { title: 'Porovnáme s hranicemi', text: 'Hranice jsou 0 (dokonale neelastická), 1 (jednotková) a nekonečno (dokonale elastická).', board: [line('0\\ \\le\\ E_D\\ <\\ 1\\ \\text{neelastická},\\quad E_D>1\\ \\text{elastická}')] },
      { title: 'Závěr', text: reason, board: [result(`\\text{${EL_OPTIONS.find((o) => o.id === ans).text.split(' (')[0].toLowerCase()}}`)] },
    ],
  });
}

// ---------- typ: elasticita a tržby ----------
const TR_OPTIONS = [{ id: 'roste', text: 'Celkový příjem vzroste' }, { id: 'klesa', text: 'Celkový příjem klesne' }, { id: 'stejne', text: 'Celkový příjem se nezmění' }];
const trVerdict = (E, dir) => (E === 1 ? 'stejne' : (E > 1) === (dir === '-') ? 'roste' : 'klesa');

function buildElTrzby({ E, dir }) {
  const ans = trVerdict(E, dir);
  const word = dir === '+' ? 'zvýší' : 'sníží';
  const q1 = dir === '+' ? 'klesne' : 'vzroste';
  return mk('elasticita-trzby', {
    data: { E, dir },
    task: `Cenová elasticita poptávky po zboží je ${czText(E)}. Prodejce cenu ${word}. Jak se změní jeho celkový příjem?`,
    answerSpec: { kind: 'choice', value: ans, options: TR_OPTIONS },
    conclusion: ans === 'stejne' ? 'Příjem se nezmění.' : ans === 'roste' ? 'Příjem vzroste.' : 'Příjem klesne.',
    source: { chapter: 4, number: 'C-a' },
    solution: [
      { title: 'Celkový příjem', text: 'Příjem je cena krát množství. Při změně ceny se cena a množství mění opačným směrem, proto záleží na tom, která změna je větší.', board: [line('TR=P\\cdot Q')] },
      { title: 'Elastická, nebo neelastická poptávka?', text: E > 1 ? `Elasticita ${czText(E)} je větší než 1: množství reaguje na cenu víc než proporcionálně.` : E < 1 ? `Elasticita ${czText(E)} je menší než 1: množství reaguje na cenu méně než proporcionálně.` : 'Elasticita je rovna 1: obě procentní změny se vyruší.',
        board: [line(`E_D=${cz(E)}${E > 1 ? '>' : E < 1 ? '<' : '='}1`)] },
      { title: 'Co se stane s množstvím', text: `Při ${dir === '+' ? 'zvýšení' : 'snížení'} ceny o 1 % množství ${q1} zhruba o ${czText(E)} %.`, board: [line(`P\\ ${dir === '+' ? '\\uparrow' : '\\downarrow'}\\ 1\\,\\%\\ \\Rightarrow\\ Q\\ ${dir === '+' ? '\\downarrow' : '\\uparrow'}\\ ${cz(E)}\\,\\%`)] },
      { title: 'Závěr', text: ans === 'stejne' ? 'Změny se přesně vyruší, příjem zůstane stejný.' : ans === 'roste' ? (dir === '-' ? 'Množství vzroste procentuálně víc, než cena klesne, a příjem proto vzroste.' : 'Množství klesne procentuálně méně, než cena vzroste, a příjem proto vzroste.') : 'Změna množství nevyváží změnu ceny: příjem klesne.',
        board: [result(ans === 'stejne' ? 'TR\\ \\text{beze změny}' : ans === 'roste' ? 'TR\\uparrow' : 'TR\\downarrow')] },
    ],
  });
}

// ---------- typ: tabulka celkových příjmů ----------
function buildTrzbyTabulka({ p, q }) {
  const tr = p.map((x, i) => x * q[i]);
  const iMax = tr.indexOf(Math.max(...tr));
  return mk('trzby-tabulka', {
    data: { p, q },
    task: `Tabulka ukazuje poptávané množství zboží při různých cenách. Vypočtěte celkový příjem prodejce při každé ceně a zapište ho do ${p.length} polí po řadě.`,
    promptTex: tabTex([['P\\ (\\text{Kč})', ...p.map(cz)], ['Q\\ (\\text{ks})', ...q.map(cz)]]),
    answerSpec: { kind: 'table', value: cells(tr) },
    conclusion: `Celkové příjmy: ${tr.map(czText).join('; ')} Kč.`,
    source: { chapter: 4, number: 13 },
    solution: [
      { title: 'Celkový příjem', text: 'Příjem prodejce při dané ceně je cena krát prodané množství.', board: [line('TR=P\\cdot Q')] },
      { title: 'Výpočet pro každou cenu', text: 'Vynásobíme dvojice cena a množství z jednotlivých sloupců.',
        board: p.map((x, i) => line(`${cz(x)}\\cdot ${cz(q[i])}=${cz(tr[i])}`)) },
      { title: 'Výsledek', text: 'Zapíšeme příjmy v pořadí sloupců.', board: [result(`TR:\\ ${listTex(tr)}`)] },
      { title: 'Průběh příjmu', text: `Příjem je nejvyšší při ceně ${czText(p[iMax])} Kč (${czText(tr[iMax])} Kč). Příjem roste, dokud je poptávka elastická, a klesá, když je neelastická.`, board: [line(`TR_{max}=${cz(tr[iMax])}\\ \\text{Kč}`)] },
    ],
  });
}

function genTrzbyTabulka(rng) {
  const ps = pick(rng, [2, 3, 4, 5, 10]); const qs = pick(rng, [5, 10, 20]);
  const p0 = ps * 5 + int(rng, 2, 8) * ps; const q0 = int(rng, 1, 5) * qs;
  return buildTrzbyTabulka({ p: [0, 1, 2, 3, 4].map((k) => p0 - ps * k), q: [0, 1, 2, 3, 4].map((k) => q0 + qs * k) });
}

// ---------- typ: cena s maximálním příjmem ----------
function buildTrzbyMax({ b, m, ask }) {
  const a = 2 * b * m; const Q = b * m; const TR = b * m * m;
  const val = ask === 'P' ? m : ask === 'Q' ? Q : TR;
  const what = ask === 'P' ? 'Při jaké ceně' : ask === 'Q' ? 'Při jakém prodaném množství' : 'Jaký největší celkový příjem (v Kč)';
  const mark = (k, t) => (ask === k ? result(t) : line(t));
  const graph = xy({
    axes: { x: 'P', y: 'TR' }, domain: [0, a / b], range: [0, nice(TR * 1.2)],
    curves: [{ expr: `x*(${a} - ${b}*x)`, label: 'TR', color: 'blue' }],
    points: [{ x: m, y: TR, label: 'max', guides: true }], alt: 'Celkový příjem jako funkce ceny',
  });
  return mk('trzby-maximum', {
    data: { a, b, ask, m },
    task: `Poptávka po zboží je popsána rovnicí na řádku níže (P je cena v Kč, Q množství v kusech). ${what} ${ask === 'TR' ? 'může prodejce dosáhnout' : 'budou celkové příjmy prodejce největší'}?`,
    promptTex: `Q=${cz(a)}-${coef(b, 'P')}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Příjmy jsou největší při ceně ${czText(m)} Kč a množství ${czText(Q)} ks; největší příjem je ${czText(TR)} Kč. Elasticita je tam rovna 1.`,
    source: { chapter: 4, number: 13 },
    solution: [
      { title: 'Příjem jako funkce ceny', text: 'Za množství dosadíme z poptávky a dostaneme příjem jen v závislosti na ceně.',
        board: [line('TR=P\\cdot Q'), line(`TR=P\\,(${cz(a)}-${coef(b, 'P')})=${cz(a)}P-${b === 1 ? '' : cz(b)}P^{2}`)] },
      { title: 'Maximum příjmu', text: 'Příjem je největší tam, kde je derivace podle ceny nulová.',
        board: [line(`\\frac{dTR}{dP}=${cz(a)}-${coef(2 * b, 'P')}=0`), mark('P', `P=\\frac{${cz(a)}}{${cz(2 * b)}}=${cz(m)}`)] },
      { title: 'Množství a příjem', text: 'Cenu dosadíme do poptávky a do vzorce pro příjem.',
        board: [mark('Q', `Q=${cz(a)}-${cz(b)}\\cdot ${cz(m)}=${cz(Q)}`), mark('TR', `TR=${cz(m)}\\cdot ${cz(Q)}=${cz(TR)}`)] },
      { title: 'Kontrola elasticity', text: 'V bodě maximálního příjmu je elasticita rovna 1: nad touto cenou je poptávka elastická, pod ní neelastická.',
        board: [line(`E_D=\\frac{${cz(b)}\\cdot ${cz(m)}}{${cz(Q)}}=1`)], viz: graph },
    ],
  });
}

function genTrzbyMax(rng) {
  return buildTrzbyMax({ b: int(rng, 1, 5), m: int(rng, 4, 30), ask: pick(rng, ['P', 'Q', 'TR']) });
}

// ---------- typ: důchodová elasticita (hodnota) ----------
const classifyEI = (E) => (E < 0 ? 'podradny' : E < 1 ? 'normalni-nezbytny' : 'normalni-luxusni');
const EI_NAMES = { podradny: 'podřadný statek (E je záporná)', 'normalni-nezbytny': 'normální statek denní potřeby (0 < E < 1)', 'normalni-luxusni': 'normální luxusní statek (E > 1)' };
const EI_OPTIONS = Object.entries(EI_NAMES).map(([id, text]) => ({ id, text: text[0].toUpperCase() + text.slice(1) }));

function eiSteps(d, E, askValue) {
  const { i0, i1, q0, q1 } = d;
  const di = ((i1 - i0) / i0) * 100; const dq = ((q1 - q0) / q0) * 100;
  return [
    { title: 'Procentní změna důchodu', text: 'Změnu důchodu dělíme původním důchodem.', board: [line(`\\%\\Delta I=\\frac{${cz(i1)}-${cz(i0)}}{${cz(i0)}}\\cdot 100=${pctTex(di)}`)] },
    { title: 'Procentní změna spotřeby', text: 'Stejně u spotřebovaného množství.', board: [line(`\\%\\Delta Q=\\frac{${cz(q1)}-${cz(q0)}}{${cz(q0)}}\\cdot 100=${pctTex(dq)}`)] },
    { title: 'Důchodová elasticita', text: 'Je to podíl procentní změny množství a procentní změny důchodu. Znaménko se zachovává, protože u podřadných statků vychází záporně.',
      board: [askValue ? result(`E_I=\\frac{${cz(r6(dq))}}{${cz(r6(di))}}=${cz(E)}`) : line(`E_I=\\frac{${cz(r6(dq))}}{${cz(r6(di))}}=${cz(E)}`)] },
  ];
}

function buildDuchodova(d) {
  const E = r2(incomeE(d));
  return mk('duchodova', {
    data: d,
    task: `Důchod domácnosti vzrostl z ${czText(d.i0)} na ${czText(d.i1)} tisíc Kč a spotřeba výrobku se změnila z ${czText(d.q0)} na ${czText(d.q1)} jednotek. Určete důchodovou elasticitu poptávky po výrobku (změny počítejte vzhledem k původním hodnotám, výsledek zaokrouhlete na dvě desetinná místa, u záporné hodnoty zapište i znaménko minus).`,
    answerSpec: { kind: 'number', value: E, tol: 0.01 },
    conclusion: `Důchodová elasticita je ${czText(E)}, jde o ${EI_NAMES[classifyEI(E)].split(' (')[0]}.`,
    source: { chapter: 4, number: 20 },
    solution: [
      ...eiSteps(d, E, true),
      { title: 'Zařazení statku', text: `Hodnota ${czText(E)} znamená: ${EI_NAMES[classifyEI(E)]}.`, board: [line(`E_I=${cz(E)}`)] },
    ],
  });
}
const incomeE = ({ i0, i1, q0, q1 }) => ((q1 - q0) / q0) / ((i1 - i0) / i0);

function genEiData(rng) {
  for (let k = 0; k < 800; k++) {
    const i0 = pick(rng, [100, 200, 400]); const di = pick(rng, [10, 20, 25, 40, 50]);
    const E = pick(rng, [-1, -0.5, -0.4, 0.25, 0.5, 0.75, 1.5, 2, 2.5, 3]);
    const q0 = pick(rng, [20, 40, 80, 100, 200, 400]);
    const i1 = r6(i0 * (1 + di / 100)); const q1 = r6(q0 * (1 + (E * di) / 100));
    if (!Number.isInteger(i1) || !Number.isInteger(q1) || q1 <= 0) continue;
    return { i0, i1, q0, q1 };
  }
  return { i0: 100, i1: 150, q0: 30, q1: 60 };
}

// ---------- typ: o jaký statek jde (podle důchodové elasticity) ----------
function buildKlasStatku(d) {
  const E = r2(incomeE(d)); const ans = classifyEI(E);
  return mk('klasifikace-statku', {
    data: d,
    task: `Důchod domácnosti vzrostl z ${czText(d.i0)} na ${czText(d.i1)} tisíc Kč a spotřeba výrobku se změnila z ${czText(d.q0)} na ${czText(d.q1)} jednotek. O jaký druh statku jde?`,
    answerSpec: { kind: 'choice', value: ans, options: EI_OPTIONS },
    conclusion: `Důchodová elasticita je ${czText(E)}: ${EI_NAMES[ans]}.`,
    source: { chapter: 4, number: 20 },
    solution: [
      ...eiSteps(d, E, false),
      { title: 'Zařazení statku', text: 'Záporná elasticita znamená podřadný statek. U normálních statků je elasticita kladná: do 1 jde o statky denní potřeby, nad 1 o luxusní statky.',
        board: [result(`E_I=${cz(E)}:\\ \\text{${EI_NAMES[ans].split(' (')[0]}}`)] },
    ],
  });
}

// ---------- typ: křížová elasticita, změna poptávky ----------
const SUBST_PAIRS = [['káva', 'čaj'], ['máslo', 'margarín'], ['Pepsi', 'Coca-Cola'], ['vlak', 'autobus']];
const COMPL_PAIRS = [['tiskárna', 'inkoust'], ['čaj', 'citrón'], ['auta', 'benzín'], ['mobil', 'kryt na mobil']];

function buildKrizovaZmena({ a, b, ec, p0, p1 }) {
  const dp = ((p1 - p0) / p0) * 100; const dq = r6(ec * dp);
  return mk('krizova-zmena', {
    data: { a, b, ec, p0, p1 },
    task: `Křížová elasticita poptávky po zboží „${b}“ vzhledem k ceně zboží „${a}“ je ${czText(ec)}. Cena jedné jednotky zboží „${a}“ se změní z ${czText(p0)} Kč na ${czText(p1)} Kč. O kolik procent se změní poptávka po zboží „${b}“? (Zvýšení zapište kladně, snížení záporně.)`,
    answerSpec: { kind: 'number', value: dq, unit: 'percent' },
    conclusion: `Poptávka po zboží „${b}“ se změní o ${czText(dq)} %.`,
    source: { chapter: 4, number: 17 },
    solution: [
      { title: 'Procentní změna ceny', text: `Změnu ceny zboží „${a}“ dělíme původní cenou.`, board: [line(`\\%\\Delta P_A=\\frac{${cz(p1)}-${cz(p0)}}{${cz(p0)}}\\cdot 100=${pctTex(dp)}`)] },
      { title: 'Význam křížové elasticity', text: 'Křížová elasticita je podíl procentní změny množství jednoho statku a procentní změny ceny druhého, proto změnu množství dostaneme jejím vynásobením změnou ceny.',
        board: [line('E_{AB}=\\frac{\\%\\Delta Q_B}{\\%\\Delta P_A}\\ \\Rightarrow\\ \\%\\Delta Q_B=E_{AB}\\cdot \\%\\Delta P_A')] },
      { title: 'Dosadíme', text: 'Dosadíme zadanou elasticitu a spočtenou změnu ceny.', board: [result(`\\%\\Delta Q_B=${cz(ec)}\\cdot ${cz(r6(dp))}=${pctTex(dq)}`)] },
      { title: 'Interpretace', text: ec > 0 ? 'Elasticita je kladná, statky jsou substituty, a proto při zdražení jednoho poptávka po druhém roste.' : 'Elasticita je záporná, statky jsou komplementy, a proto při zdražení jednoho poptávka po druhém klesá.', board: [line(ec > 0 ? '\\text{substituty}:\\ E>0' : '\\text{komplementy}:\\ E<0')] },
    ],
  });
}

function genKrizovaZmena(rng) {
  for (let i = 0; i < 300; i++) {
    const subst = rng() < 0.6;
    const [a, b] = pick(rng, subst ? SUBST_PAIRS : COMPL_PAIRS);
    const ec = subst ? pick(rng, [0.5, 1, 2, 3]) : pick(rng, [-0.5, -1, -2]);
    const p0 = pick(rng, [20, 40, 50, 100]); const dp = pick(rng, [10, 20, 25, 50, 100]) * (rng() < 0.7 ? 1 : -1);
    const p1 = r6(p0 * (1 + dp / 100));
    if (!Number.isInteger(p1) || p1 <= 0 || p0 === p1) continue;
    return buildKrizovaZmena({ a, b, ec, p0, p1 });
  }
  return buildKrizovaZmena({ a: 'káva', b: 'čaj', ec: 2, p0: 20, p1: 30 });
}

// ---------- typ: substituty, komplementy, nezávislé podle křížové elasticity ----------
const KR_OPTIONS = [{ id: 'subst', text: 'Substituty (křížová elasticita je kladná)' }, { id: 'kompl', text: 'Komplementy (křížová elasticita je záporná)' }, { id: 'nezav', text: 'Nezávislé statky (křížová elasticita je nulová)' }];
const crossE = ({ pa0, pa1, qb0, qb1 }) => ((qb1 - qb0) / qb0) / ((pa1 - pa0) / pa0);
const classifyKr = (E) => (Math.abs(E) < 1e-12 ? 'nezav' : E > 0 ? 'subst' : 'kompl');

function buildKrizovaVztah({ a, b, pa0, pa1, qb0, qb1 }) {
  const E = r6(crossE({ pa0, pa1, qb0, qb1 })); const ans = classifyKr(E);
  const dp = ((pa1 - pa0) / pa0) * 100; const dq = ((qb1 - qb0) / qb0) * 100;
  return mk('krizova-vztah', {
    data: { a, b, pa0, pa1, qb0, qb1 },
    task: `Cena zboží „${a}“ se změnila z ${czText(pa0)} Kč na ${czText(pa1)} Kč. Poptávané množství zboží „${b}“ se přitom změnilo z ${czText(qb0)} na ${czText(qb1)} jednotek. Jaký vztah mají tyto dva statky?`,
    answerSpec: { kind: 'choice', value: ans, options: KR_OPTIONS },
    conclusion: KR_OPTIONS.find((o) => o.id === ans).text.split(' (')[0] + `, křížová elasticita je ${czText(E)}.`,
    source: { chapter: 4, number: 16 },
    solution: [
      { title: 'Změna ceny a množství', text: 'Spočteme procentní změnu ceny statku A a procentní změnu množství statku B.',
        board: [line(`\\%\\Delta P_A=${pctTex(dp)}`), line(`\\%\\Delta Q_B=${pctTex(dq)}`)] },
      { title: 'Křížová elasticita', text: 'Podíl obou změn je křížová elasticita. Důležité je znaménko.', board: [line(`E_{AB}=\\frac{${cz(r6(dq))}}{${cz(r6(dp))}}=${cz(E)}`)] },
      { title: 'Co znaménko říká', text: 'Kladná hodnota: statky se nahrazují (substituty). Záporná: používají se společně (komplementy). Nula: nesouvisejí (nezávislé statky).', board: [line('E>0\\ \\text{subst.},\\quad E<0\\ \\text{kompl.},\\quad E=0\\ \\text{nezávislé}')] },
      { title: 'Závěr', text: KR_OPTIONS.find((o) => o.id === ans).text, board: [result({ subst: '\\text{substituty}', kompl: '\\text{komplementy}', nezav: '\\text{nezávislé}' }[ans])] },
    ],
  });
}

function genKrizovaVztah(rng) {
  const rel = pick(rng, ['subst', 'kompl', 'nezav']);
  const [a, b] = rel === 'subst' ? pick(rng, SUBST_PAIRS) : rel === 'kompl' ? pick(rng, COMPL_PAIRS) : pick(rng, [['zubní pasta', 'pneumatiky'], ['sůl', 'ponožky'], ['boty', 'žárovky'], ['čaj', 'kolo']]);
  const pa0 = pick(rng, [20, 40, 50, 100]); const up = rng() < 0.5; const pa1 = up ? pa0 * 1.5 : pa0 * 0.5;
  const qb0 = pick(rng, [100, 200, 400, 800]);
  const k = pick(rng, [0.1, 0.2, 0.25, 0.5]);
  const sameDir = rel === 'subst' ? 1 : -1; // substituty: množství B jde za cenou A
  const qb1 = rel === 'nezav' ? qb0 : qb0 * (1 + sameDir * (up ? 1 : -1) * k);
  return buildKrizovaVztah({ a, b, pa0, pa1, qb0, qb1: r6(qb1) });
}

// ---------- typ: tvar indiferenční křivky ----------
const IC_OPTIONS = [
  { id: 'primka', text: 'Klesající přímka (dokonalé substituty)' },
  { id: 'uhel', text: 'Pravý úhel (dokonalé komplementy)' },
  { id: 'rovnobezka', text: 'Přímka rovnoběžná s osou (neutrální statek)' },
  { id: 'rostouci', text: 'Rostoucí křivka (nežádoucí statek)' },
  { id: 'konvexni', text: 'Klesající křivka konvexní k počátku (běžné statky)' },
];
const IC_ITEMS = [
  { id: 'kava', ans: 'primka', text: 'Instantní a mletá káva mi přinášejí stejný užitek, nedokážu je rozlišit.', why: 'Statky se nahrazují v konstantním poměru (zde 1 : 1), mezní míra substituce je stále stejná, a křivky jsou proto přímky.' },
  { id: 'boty', ans: 'uhel', text: 'Vždy potřebuji pravou i levou botu.', why: 'Statky se musí spotřebovávat společně v pevném poměru. Víc jen jednoho z nich užitek nezvýší, křivka tvoří pravý úhel.' },
  { id: 'voda', ans: 'rovnobezka', text: 'Pizzu mám rád, vodu mám zcela lhostejnou.', why: 'Užitek závisí jen na množství pizzy, takže křivka je rovnoběžná s osou, na které měříme vodu (neutrální statek).' },
  { id: 'zubar', ans: 'rostouci', text: 'Čokoládu mám rád a návštěva zubaře je mi nepříjemná.', why: 'Nežádoucí statek (zubař) musí být vyvážen větším množstvím žádoucího, aby užitek zůstal stejný. Křivka proto roste.' },
  { id: 'rukavice', ans: 'uhel', text: 'Používám jen pár levé a pravé rukavice, jednu bez druhé je k ničemu.', why: 'Dokonalé komplementy se používají v pevném poměru, křivka je pravý úhel.' },
  { id: 'pepsi', ans: 'primka', text: 'Mezi Pepsi a Coca-Colou nevidím žádný rozdíl.', why: 'Dokonalé substituty mají konstantní MRS, a křivky jsou tedy přímky.' },
  { id: 'chleb', ans: 'konvexni', text: 'Mám rád chléb i máslo a ochotně jedno nahradím druhým, ale čím víc mám jednoho, tím méně ho chci dál nahrazovat druhým.', why: 'Mezní míra substituce klesá, což dává křivku konvexní k počátku.' },
  { id: 'hudba', ans: 'rovnobezka', text: 'Mám rád hudbu, ale počet zasazených stromů v lese kolem je mi úplně jedno.', why: 'Počet stromů je neutrální statek a křivka je rovnoběžná s jeho osou.' },
  { id: 'jatra', ans: 'rostouci', text: 'Dítě má rádo koláč a považuje játra za nežádoucí.', why: 'Aby užitek zůstal stejný, musí dítě za každé další játra dostat víc koláče. Křivka roste.' },
  { id: 'pizza-vic', ans: 'konvexni', text: 'Mám rád pizzu i salát a při vyšší spotřebě jednoho jsem ochoten vzdát se víc z něj kvůli kousku druhého.', why: 'Klasický případ běžných statků s klesající mezní mírou substituce, křivka je konvexní.' },
];
const icItem = (id) => IC_ITEMS.find((x) => x.id === id) ?? IC_ITEMS[0];

function buildIcTvar({ id }) {
  const it = icItem(id); const opt = IC_OPTIONS.find((o) => o.id === it.ans);
  return mk('indiference-tvar', {
    data: { id },
    task: `${it.text} Jaký tvar mají v tomto případě indiferenční křivky?`,
    answerSpec: { kind: 'choice', value: it.ans, options: IC_OPTIONS },
    conclusion: `${opt.text}.`,
    source: { chapter: 4, number: 10 },
    solution: [
      { title: 'Jaký vztah mají statky', text: 'Zjistíme, jestli se statky nahrazují, doplňují, jestli je jeden lhostejný nebo nežádoucí.', board: [line('\\text{vztah statků}\\ \\Rightarrow\\ MRS')] },
      { title: 'Jak se chová mezní míra substituce', text: it.why, board: [line('MRS\\ \\text{určuje tvar křivky}')] },
      { title: 'Závěr', text: `Správně: ${opt.text.toLowerCase()}.`, board: [result(`\\text{${opt.text.split(' (')[0].toLowerCase()}}`)] },
    ],
  });
}

// ---------- typ: výběr z možností (cvičebnice a zkouškové otázky) ----------
// ans = index správné možnosti v poli opts.
const CHOICES = [
  { id: 'tresne', book: 1, q: 'Jestliže klesne cena třešní, spotřebitel bude nakupovat:', opts: ['méně třešní, takže jeho mezní užitek vzroste', 'méně třešní, takže jeho mezní užitek klesne', 'více třešní, takže jeho mezní užitek vzroste', 'více třešní, takže jeho mezní užitek klesne', 'neplatí žádná varianta'], ans: 3, why: 'Při nižší ceně se spotřebitel vyplatí koupit víc kusů. S každým dalším kusem ale mezní užitek klesá (zákon klesajícího mezního užitku), nakupuje tedy dokud se MU/P nevyrovná.' },
  { id: 'elast-roste', book: 12, q: 'Cenová elasticita poptávky bude mít tendenci růst:', opts: ['pokud jde o větší množství nezbytné komodity', 'během kratšího časového úseku', 'při nižší ceně', 'pokud se objeví dokonalejší substituty dané komodity', 'když se podíl daného statku na celkových výdajích spotřebitele sníží'], ans: 3, why: 'Čím snáze lze statek nahradit, tím citlivěji spotřebitelé reagují na změnu jeho ceny. Ostatní možnosti elasticitu snižují nebo nesouvisejí.' },
  { id: 'opt-podminka', q: 'Která podmínka platí v optimu spotřebitele (při vyčerpaném důchodu)?', opts: ['MU statku X se rovná MU statku Y', 'MU statku X dělený jeho cenou se rovná MU statku Y dělenému jeho cenou', 'Ceny obou statků se rovnají', 'Celkový užitek z obou statků je stejný'], ans: 1, why: 'V optimu je užitek z poslední koruny utracené za každý statek stejný, tedy platí $MU_X/P_X=MU_Y/P_Y$.' },
  { id: 'giffen', q: 'Giffenův statek je statek, u kterého:', opts: ['růst ceny vyvolá pokles poptávaného množství', 'růst ceny vyvolá růst poptávaného množství', 'růst důchodu vyvolá pokles poptávaného množství, ale zákon poptávky platí', 'poptávka na cenu vůbec nereaguje'], ans: 1, why: 'U Giffenova statku (zvláštního případu podřadného statku) převáží důchodový efekt nad substitučním, a poptávková křivka proto roste.' },
  { id: 'engel-norm', q: 'Jaký tvar má Engelova křivka normálního statku?', opts: ['Rostoucí (s růstem důchodu roste kupované množství)', 'Klesající (s růstem důchodu klesá kupované množství)', 'Vodorovná (množství nezávisí na důchodu)', 'Má tvar pravého úhlu'], ans: 0, why: 'Engelova křivka ukazuje závislost množství na důchodu. U normálního statku s důchodem množství roste.' },
  { id: 'engel-pod', q: 'Jaký tvar má Engelova křivka podřadného statku?', opts: ['Rostoucí', 'Klesající (s růstem důchodu klesá kupované množství)', 'Vodorovná', 'Svislá'], ans: 1, why: 'U podřadného statku spotřebitel při vyšším důchodu nakupuje méně, protože přechází ke kvalitnějším statkům.' },
  { id: 'bl-duchod', q: 'Co se stane s rozpočtovou přímkou, když vzroste důchod a ceny se nezmění?', opts: ['Posune se rovnoběžně směrem od počátku', 'Posune se rovnoběžně směrem k počátku', 'Otočí se kolem průsečíku s osou X', 'Otočí se kolem průsečíku s osou Y'], ans: 0, why: 'Průsečíky s osami $I/P_X$ a $I/P_Y$ vzrostou ve stejném poměru a sklon $-P_X/P_Y$ se nemění, přímka se tedy posune rovnoběžně ven.' },
  { id: 'bl-cenay', q: 'Cena statku Y klesne, důchod a cena X zůstanou. Co se stane s rozpočtovou přímkou (Y je na svislé ose)?', opts: ['Posune se rovnoběžně doprava', 'Otočí se kolem průsečíku s osou X a průsečík s osou Y vzroste', 'Otočí se kolem průsečíku s osou Y a průsečík s osou X vzroste', 'Zůstane beze změny'], ans: 1, why: 'Průsečík s osou X je $I/P_X$ a nemění se. Průsečík s osou Y je $I/P_Y$ a při nižší ceně Y vzroste, přímka se otočí kolem bodu na ose X.' },
  { id: 'sklon-bl', q: 'Sklon rozpočtové přímky (statek X na vodorovné, Y na svislé ose) je:', opts: ['důchod dělený cenou statku X', 'záporný poměr ceny X k ceně Y', 'poměr mezních užitků statku X a Y', 'záporný poměr ceny Y k ceně X'], ans: 1, why: 'Z rovnice $Y=I/P_Y-(P_X/P_Y)X$ vyplývá, že sklon je záporný poměr cen $-P_X/P_Y$.' },
  { id: 'mrs-pokles', q: 'Co platí pro mezní míru substituce při pohybu po konvexní indiferenční křivce doprava (roste množství X)?', opts: ['MRS roste', 'MRS klesá', 'MRS zůstává konstantní', 'MRS není definována'], ans: 1, why: 'Čím víc X spotřebitel má, tím méně Y je ochoten vzdát za další jednotku X, a MRS tedy klesá (to je důvod konvexního tvaru křivky).' },
  { id: 'kriz-kompl', q: 'Zdražení kávy sníží poptávku po cukru, který se do ní přidává. Křížová elasticita poptávky po cukru vzhledem k ceně kávy je:', opts: ['kladná', 'záporná', 'nulová', 'rovná jedné'], ans: 1, why: 'Káva a cukr jsou komplementy. Cena jednoho roste a poptávka po druhém klesá, takže znaménko je záporné.' },
  { id: 'cena-elast-determ', q: 'Která okolnost zvyšuje cenovou elasticitu poptávky po statku?', opts: ['Statek je nezbytný a nemá náhradu', 'Statek má mnoho blízkých substitutů', 'Statek tvoří zanedbatelnou část výdajů spotřebitele', 'Spotřebitel má jen velmi krátký čas na přizpůsobení'], ans: 1, why: 'Když se statek dá snadno nahradit, spotřebitelé při zdražení rychle přejdou k jinému a množství výrazně klesne.' },
  { id: 'tr-neel', q: 'Prodejce má neelastickou poptávku (E < 1). Jak zvýší celkový příjem?', opts: ['Snížením ceny', 'Zvýšením ceny', 'Cenu nechá beze změny', 'Zvýšením nákladů'], ans: 1, why: 'Při neelastické poptávce množství klesne procentuálně méně, než cena vzroste, a příjem proto roste při zvýšení ceny.' },
];
const choiceItem = (id) => CHOICES.find((x) => x.id === id) ?? CHOICES[0];

function buildTestVyber({ id }) {
  const c = choiceItem(id);
  const options = c.opts.map((text, i) => ({ id: `o${i}`, text }));
  return mk('test-vyber', {
    data: { id },
    task: c.q,
    answerSpec: { kind: 'choice', value: `o${c.ans}`, options },
    conclusion: `Správně: ${c.opts[c.ans]}.`,
    source: c.book ? { chapter: 4, number: c.book } : undefined,
    solution: [
      { title: 'Co otázka zjišťuje', text: 'Najdeme pojem, na kterém otázka stojí, a vybavíme si jeho definici nebo graf.', board: [line('\\text{pojem}\\ \\Rightarrow\\ \\text{pravidlo}')] },
      { title: 'Zdůvodnění', text: c.why, board: [line('\\text{vyloučit nesprávné možnosti}')] },
      { title: 'Závěr', text: `Správná odpověď: ${c.opts[c.ans]}.`, board: [result(`\\text{možnost}\\ ${'ABCDE'[c.ans]}`)] },
    ],
  });
}

// ---------- typ: pravda, nebo nepravda ----------
// kn-a až kn-o jsou úkoly ano/ne z části C cvičebnice kap. 4 (správně A, N, N, A, A, N, A, N, A, A, N, A, A, N, A).
const STATEMENTS = [
  { id: 'kn-a', text: 'Je-li poptávka po určitém zboží cenově elastická, pak celkový příjem z prodeje tohoto zboží při poklesu jeho ceny vzroste.', truth: true, why: 'U elastické poptávky množství vzroste procentuálně víc, než cena klesne, a příjem proto roste.' },
  { id: 'kn-b', text: 'Zákon klesajícího užitku znamená, že s růstem příjmů potřeba všeho klesá.', truth: false, why: 'Zákon se týká mezního užitku téhož statku: každá další jednotka přináší menší přírůstek užitku. S příjmem nesouvisí.' },
  { id: 'kn-c', text: 'Cokoliv, co zvýší celkový užitek, má za předpokladu ceteris paribus tendenci zvýšit i mezní užitek.', truth: false, why: 'Celkový užitek roste díky dalším jednotkám, ale mezní užitek přitom podle zákona klesajícího mezního užitku klesá.' },
  { id: 'kn-d', text: 'Mezní míra substituce statku Y za statek X vyjadřuje směrnici indiferenční křivky.', truth: true, why: 'MRS je v každém bodě absolutní hodnota směrnice indiferenční křivky.' },
  { id: 'kn-e', text: 'Vzácnější zboží má větší relativní hodnotu substituce.', truth: true, why: 'Čím méně statku spotřebitel má, tím víc ho cení, a za další jednotku se vzdá většího množství druhého statku (MRS je vyšší).' },
  { id: 'kn-f', text: 'Když je domácnost v rovnováze, pak mezní užitek jednoho zboží se musí rovnat mezním užitkům zboží ostatních.', truth: false, why: 'V rovnováze se rovnají poměry mezního užitku k ceně, nikoli samotné mezní užitky.' },
  { id: 'kn-g', text: 'Snížení všech absolutních cen na polovinu bude mít za následek (za jinak stejných podmínek) zdvojnásobení reálného příjmu.', truth: true, why: 'Za stejný důchod koupí spotřebitel dvakrát víc, reálný důchod se proto zdvojnásobí.' },
  { id: 'kn-h', text: 'Indiferenční křivky jednoho racionálně se chovajícího spotřebitele se mohou protínat.', truth: false, why: 'V průsečíku by spotřební koš měl dvě různé úrovně užitku zároveň, což je rozpor. Křivky se neprotínají.' },
  { id: 'kn-i', text: 'Křivku poptávky lze chápat jako množinu bodů rovnováhy spotřebitele při změnách ceny statku X, neměnném důchodu a cenách ostatních statků.', truth: true, why: 'Každá cena X dává jiné optimum spotřebitele a zde zjištěné množství leží na křivce poptávky.' },
  { id: 'kn-j', text: 'Konvexnost indiferenčních křivek vyplývá ze zákona substituce, za kterým se skrývá zákon klesajícího mezního užitku.', truth: true, why: 'Klesající MRS (způsobená klesajícím mezním užitkem) dává konvexní tvar křivky.' },
  { id: 'kn-k', text: 'Mezní užitek nikdy nemůže být negativní.', truth: false, why: 'Při přesycení další jednotka celkový užitek snižuje, mezní užitek je pak záporný.' },
  { id: 'kn-l', text: 'Když se pomocí snížení ceny z 50 Kč na 20 Kč nikterak nepodařilo zvýšit prodané množství skript, potom poptávka po skriptech je v daném cenovém intervalu dokonale neelastická.', truth: true, why: 'Množství se vůbec nezměnilo, elasticita je tedy rovna nule.' },
  { id: 'kn-m', text: 'Pokud mají všichni farmáři malou úrodu, jejich celkový příjem může stoupnout. Toto ukazuje, že poptávka po zemědělských produktech je cenově neelastická.', truth: true, why: 'Při neelastické poptávce cena vzroste procentuálně víc, než klesne množství, a příjem proto vzroste.' },
  { id: 'kn-n', text: 'Cenová elasticita poptávky je změna ceny dělená změnou v celkovém příjmu.', truth: false, why: 'Elasticita je procentní změna poptávaného množství dělená procentní změnou ceny.' },
  { id: 'kn-o', text: 'Když jednoprocentní růst ceny vyvolá menší než jednoprocentní pokles poptávaného množství, pak jde o poptávku relativně cenově neelastickou.', truth: true, why: 'Elasticita je menší než 1, což je definice neelastické poptávky.' },
  { id: 'own-1', text: 'Důchodová elasticita podřadného statku je záporná.', truth: true, why: 'S růstem důchodu klesá spotřeba podřadného statku, a podíl změn má proto záporné znaménko.' },
  { id: 'own-2', text: 'Giffenův statek má klesající křivku poptávky.', truth: false, why: 'Giffenův statek je výjimka ze zákona poptávky: růst ceny zvyšuje poptávané množství, křivka roste.' },
  { id: 'own-3', text: 'Rovnoběžný posun rozpočtové přímky od počátku znamená růst důchodu při nezměněných cenách.', truth: true, why: 'Sklon přímky (záporný poměr cen) se nemění, mění se jen důchod.' },
  { id: 'own-4', text: 'Indiferenční křivka dokonalých komplementů má tvar přímky s kladným sklonem.', truth: false, why: 'Dokonalé komplementy mají křivky ve tvaru pravého úhlu.' },
  { id: 'own-5', text: 'Je-li cenová elasticita poptávky 2, růst ceny o 1 % sníží poptávané množství přibližně o 2 %.', truth: true, why: 'Elasticita udává, o kolik procent se změní množství při změně ceny o 1 %.' },
  { id: 'own-6', text: 'Křížová elasticita dvou substitutů je záporná.', truth: false, why: 'U substitutů zdražení jednoho zvyšuje poptávku po druhém, křížová elasticita je kladná. Záporná je u komplementů.' },
  { id: 'own-7', text: 'V optimu spotřebitele se mezní míra substituce rovná poměru cen obou statků.', truth: true, why: 'Z podmínky MU/P stejného u obou statků plyne MRS rovná poměru cen, tedy sklonu rozpočtové přímky (bez znaménka).' },
  { id: 'own-8', text: 'Při jednotkové cenové elasticitě poptávky změna ceny nezmění celkový příjem prodejce.', truth: true, why: 'Procentní změny ceny a množství jsou stejné a navzájem se vyruší.' },
  { id: 'own-9', text: 'Pokles ceny statku Y otočí rozpočtovou přímku kolem jejího průsečíku s osou Y.', truth: false, why: 'Průsečík s osou X (důchod dělený cenou X) se nemění, přímka se otáčí kolem něj. Průsečík s osou Y vzroste.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];

function buildAnoNe({ id }) {
  const s = stmtById(id); const book = id.startsWith('kn-');
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: book ? { chapter: 4, number: `C-${id.slice(3)}` } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a vyhledáme pojem, na kterém stojí.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'mu', q: 'Co je mezní užitek?', right: 'Přírůstek celkového užitku získaný spotřebou další (poslední) jednotky statku.', wrong: ['Celkový užitek ze všech spotřebovaných jednotek statku.', 'Užitek z první spotřebované jednotky statku.', 'Cena, kterou je spotřebitel za jednotku ochoten zaplatit.'] },
  { id: 'zakon-mu', q: 'Co říká zákon klesajícího mezního užitku?', right: 'S růstem spotřeby téhož statku v daném období mezní užitek další jednotky klesá.', wrong: ['S růstem spotřeby téhož statku roste mezní užitek další jednotky.', 'S růstem důchodu klesá potřeba všech statků.', 'Celkový užitek klesá s každou další spotřebovanou jednotkou.'] },
  { id: 'rozpocet', q: 'Co vyjadřuje rozpočtové omezení spotřebitele?', right: 'Součet výdajů na nakupované statky (cena krát množství) nemůže přesáhnout důchod.', wrong: ['Maximální užitek, kterého spotřebitel dosáhne.', 'Kombinace statků, které přinášejí stejný užitek.', 'Podíl důchodu, který spotřebitel ušetří.'] },
  { id: 'ik', q: 'Co je indiferenční křivka?', right: 'Množina kombinací dvou statků, které spotřebiteli přinášejí stejný užitek.', wrong: ['Množina kombinací statků, které si spotřebitel může při daném důchodu koupit.', 'Křivka, která ukazuje závislost množství statku na jeho ceně.', 'Křivka, která ukazuje závislost množství na důchodu.'] },
  { id: 'mrs', q: 'Co je mezní míra substituce (MRS)?', right: 'Poměr, v jakém je spotřebitel ochoten nahrazovat jeden statek druhým při stejném celkovém užitku (absolutní hodnota sklonu indiferenční křivky).', wrong: ['Poměr cen dvou statků, který je dán trhem.', 'Rozdíl mezi celkovým užitkem dvou statků.', 'Podíl celkového důchodu a ceny statku.'] },
  { id: 'optimum', q: 'Kdy je spotřebitel v optimu?', right: 'Když vyčerpá důchod a poměr mezního užitku k ceně je u všech statků stejný (indiferenční křivka se dotýká rozpočtové přímky).', wrong: ['Když je mezní užitek všech statků stejný.', 'Když jsou ceny všech statků stejné.', 'Když spotřebitel koupí co nejvíc kusů nejlevnějšího statku.'] },
  { id: 'engel', q: 'Co zobrazuje Engelova křivka?', right: 'Závislost kupovaného množství statku na důchodu spotřebitele.', wrong: ['Závislost kupovaného množství na ceně statku.', 'Závislost celkového užitku na množství.', 'Závislost ceny na množství nabízeném výrobci.'] },
  { id: 'giffen', q: 'Co je Giffenův statek?', right: 'Statek, jehož poptávané množství roste s růstem jeho ceny (křivka poptávky je rostoucí).', wrong: ['Statek, jehož poptávané množství roste s růstem důchodu.', 'Statek, jehož poptávka je dokonale neelastická.', 'Statek, který nemá žádné substituty.'] },
  { id: 'elast-cen', q: 'Jak se definuje cenová elasticita poptávky?', right: 'Podíl procentní změny poptávaného množství a procentní změny ceny.', wrong: ['Podíl absolutní změny množství a absolutní změny ceny.', 'Podíl procentní změny ceny a procentní změny celkového příjmu.', 'Podíl změny důchodu a změny poptávaného množství.'] },
  { id: 'elast-poptavka', q: 'Kdy je poptávka cenově elastická?', right: 'Když procentní změna poptávaného množství je větší než procentní změna ceny (E > 1).', wrong: ['Když procentní změna množství je menší než procentní změna ceny.', 'Když poptávané množství na cenu vůbec nereaguje.', 'Když cena a množství rostou současně.'] },
  { id: 'elast-duch', q: 'Co udává důchodová elasticita poptávky?', right: 'Procentní změnu poptávaného množství při změně důchodu o 1 %.', wrong: ['Procentní změnu množství při změně ceny o 1 %.', 'Procentní změnu důchodu při změně ceny o 1 %.', 'Procentní změnu množství při změně ceny jiného statku o 1 %.'] },
  { id: 'elast-kriz', q: 'Co udává křížová elasticita poptávky?', right: 'Procentní změnu poptávaného množství jednoho statku při změně ceny jiného statku o 1 %.', wrong: ['Procentní změnu množství při změně vlastní ceny o 1 %.', 'Procentní změnu množství při změně důchodu o 1 %.', 'Rozdíl elasticit dvou různých statků.'] },
  { id: 'podradny', q: 'Co je podřadný statek?', right: 'Statek, jehož spotřeba s růstem důchodu klesá (důchodová elasticita je záporná).', wrong: ['Statek, jehož spotřeba s růstem důchodu roste.', 'Statek, jehož spotřeba nezávisí na ceně.', 'Statek s kladnou křížovou elasticitou.'] },
  { id: 'substituty-ik', q: 'Jaký tvar mají indiferenční křivky dokonalých substitutů?', right: 'Klesající přímky (konstantní mezní míra substituce).', wrong: ['Pravé úhly.', 'Konvexní křivky klesající k osám.', 'Rostoucí křivky.'] },
];
const defById = (id) => DEFS.find((d) => d.id === id) ?? DEFS[0];

function buildDefinice({ id, order }) {
  const df = defById(id);
  const texts = [df.right, ...df.wrong];
  const options = (order && order.length === 4 ? order : [0, 1, 2, 3]).map((i) => ({ id: `o${i}`, text: texts[i] }));
  return mk('definice', {
    part: 'zkouska',
    data: { id, order: options.map((o) => Number(o.id.slice(1))) },
    task: df.q,
    answerSpec: { kind: 'choice', value: 'o0', options },
    conclusion: df.right,
    solution: [
      { title: 'Pojem', text: 'Najdeme klíčový pojem otázky a vybavíme si jeho definici.', board: [line('\\text{pojem}\\ \\Rightarrow\\ \\text{definice}')] },
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti zaměňují pojmy nebo obracejí vztah. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function buildGrafOptimum({ I, px, py }) {
  const X = I / (2 * px); const Y = I / (2 * py);
  const g = optimumViz({ I, px, py });
  return mk('graf-optimum', {
    part: 'zkouska',
    data: { I, px, py },
    task: `Spotřebitel má důchod ${czText(I)} Kč, statek X stojí ${czText(px)} Kč a statek Y ${czText(py)} Kč. Nakreslete do grafu (X na vodorovné, Y na svislé ose) jeho rozpočtovou přímku a indiferenční křivku, která se jí dotýká, a vyznačte optimum spotřebitele E.`,
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: 'V optimu se indiferenční křivka dotýká rozpočtové přímky a sklon obou je stejný.',
    source: { chapter: 4, number: 7 },
    solution: [
      { title: 'Rozpočtová přímka', text: `Průsečík s osou X je ${czText(I / px)} (důchod dělený cenou X), průsečík s osou Y je ${czText(I / py)}. Body spojíme přímkou.`,
        board: [line(`X_{max}=\\frac{${cz(I)}}{${cz(px)}}=${cz(I / px)}`), line(`Y_{max}=\\frac{${cz(I)}}{${cz(py)}}=${cz(I / py)}`)], viz: budgetViz({ I, px, py }) },
      { title: 'Indiferenční křivka', text: 'Nakreslíme konvexní křivku klesající k osám tak, aby se přímky jen dotýkala a nikde ji neprotínala. Vyšší křivka by byla nedosažitelná, nižší by znamenala nevyužitý rozpočet.',
        board: [line('\\text{dotyk: sklon křivky}=\\text{sklon přímky}')] },
      { title: 'Optimum', text: `Bod dotyku je optimum E. V něm platí $MRS=P_X/P_Y$, v našem příkladu leží v bodě (${czText(X)}; ${czText(Y)}).`, viz: g, board: [line('MRS=\\frac{P_X}{P_Y}')] },
    ],
  });
}

function genGrafOptimum(rng) {
  const d = genOptimumCobb(rng).data;
  return buildGrafOptimum({ I: 2 * d.H, px: d.px, py: d.py });
}

const GRAF_CHANGES = ['duchod+', 'duchod-', 'cenaX+', 'cenaX-', 'cenaY+', 'cenaY-'];
function buildGrafRozpocet({ I, px, py, change }) {
  const b = { I, px, py }; const n = CHANGES[change].apply(b);
  const g = changeGraph(b, n);
  return mk('graf-rozpocet-posun', {
    part: 'zkouska',
    data: { I, px, py, change },
    task: `Spotřebitel má důchod ${czText(I)} Kč, statek X stojí ${czText(px)} Kč a statek Y ${czText(py)} Kč. Nakreslete jeho rozpočtovou přímku (X na vodorovné, Y na svislé ose) a zakreslete, jak se změní, když nastane následující: ${CHANGES[change].text(b, n)}`,
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: { rovnobezne: 'Přímka se posune rovnoběžně.', 'otoceni-x': 'Přímka se otočí kolem průsečíku s osou X.', 'otoceni-y': 'Přímka se otočí kolem průsečíku s osou Y.' }[CHANGES[change].kind],
    source: { chapter: 4, number: 8 },
    solution: [
      { title: 'Původní přímka', text: 'Nakreslíme přímku spojující průsečíky s osami. Pro důchod, ceny: $X_{max}=I/P_X$, $Y_{max}=I/P_Y$.',
        board: [line(`X_{max}=${cz(I / px)},\\quad Y_{max}=${cz(I / py)}`)], viz: budgetViz(b) },
      { title: 'Co se změní', text: CHANGE_WHAT[CHANGES[change].kind],
        board: [line(`X_{max}=${cz(n.I / n.px)},\\quad Y_{max}=${cz(n.I / n.py)}`)] },
      { title: 'Nová přímka', text: 'Původní přímka BL0 zůstává plná, nová BL1 se zakreslí čárkovaně.', viz: g },
    ],
  });
}

function genGrafRozpocet(rng) {
  const px = pick(rng, [10, 20, 40]); const py = pick(rng, [10, 20, 40, 50]);
  return buildGrafRozpocet({ I: pick(rng, [200, 400, 600, 800, 1000]), px, py, change: pick(rng, GRAF_CHANGES) });
}

function buildGrafEngel({ kind }) {
  const normal = kind === 'normalni';
  const g = xy({
    axes: { x: 'Q', y: 'I' }, domain: [0, 40], range: [0, 100],
    curves: [{ expr: normal ? '10 + 2*x' : '95 - 2*x', label: 'EC', color: 'blue', domain: normal ? [0, 40] : [5, 40] }],
    alt: normal ? 'Engelova křivka normálního statku' : 'Engelova křivka podřadného statku',
  });
  return mk('graf-engel', {
    part: 'zkouska',
    data: { kind },
    task: `Nakreslete Engelovu křivku ${normal ? 'normálního' : 'podřadného'} statku (na vodorovné ose množství statku Q, na svislé ose důchod I).`,
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: normal ? 'Křivka je rostoucí: s růstem důchodu roste kupované množství.' : 'Křivka je klesající: s růstem důchodu kupované množství klesá.',
    solution: [
      { title: 'Co křivka ukazuje', text: 'Engelova křivka spojuje důchody a množství statku, které spotřebitel při nich nakupuje (ceny se nemění).', board: [line('Q=f(I)')] },
      { title: 'Směr křivky', text: normal ? 'Normální statek: s růstem důchodu roste i kupované množství. Křivka má kladnou směrnici.' : 'Podřadný statek: s růstem důchodu se kupuje méně (spotřebitel přechází ke kvalitnějším statkům). Křivka je klesající.',
        board: [line(normal ? 'I\\uparrow\\ \\Rightarrow\\ Q\\uparrow' : 'I\\uparrow\\ \\Rightarrow\\ Q\\downarrow')] },
      { title: 'Graf', text: 'Zakreslíme osy a křivku EC.', viz: g },
    ],
  });
}

const IC_GRAPHS = {
  subst: { axes: { x: 'instantní káva', y: 'mletá káva' }, label: 'dokonalé substituty (instantní a mletá káva)', curves: [{ expr: '6 - x', label: 'I1', color: 'blue', domain: [0, 6] }, { expr: '10 - x', label: 'I2', color: 'green', domain: [0, 10] }], text: 'Statky se nahrazují 1 : 1, křivky jsou rovnoběžné klesající přímky s MRS rovnou 1.' },
  neutral: { axes: { x: 'voda', y: 'pizza' }, label: 'neutrální statek (voda) a pizza', curves: [{ expr: '3', label: 'I1', color: 'blue' }, { expr: '6', label: 'I2', color: 'green' }], text: 'Užitek závisí jen na množství pizzy, takže křivky jsou vodorovné (rovnoběžné s osou, na které je voda).' },
  bad: { axes: { x: 'játra', y: 'koláč' }, label: 'nežádoucí statek (játra) a koláč', curves: [{ expr: '2 + x/2', label: 'I1', color: 'blue' }, { expr: '5 + x/2', label: 'I2', color: 'green' }], text: 'Při větším množství nežádoucích jater musí dítě dostat víc koláče, aby zůstalo stejně spokojené. Křivky rostou a vyšší křivka znamená větší užitek.' },
  normal: { axes: { x: 'chleba', y: 'máslo' }, label: 'dva běžné statky (chleba a máslo)', curves: [{ expr: '12/x', label: 'I1', color: 'blue', domain: [1, 12] }, { expr: '30/x', label: 'I2', color: 'green', domain: [2.5, 12] }], text: 'Křivky jsou klesající a konvexní k počátku (klesající MRS), neprotínají se a vzdálenější křivka znamená větší užitek.' },
};
function buildGrafIk({ kind }) {
  const d = IC_GRAPHS[kind];
  const g = xy({ axes: d.axes, domain: [0, 12], range: [0, 12], curves: d.curves, alt: `Indiferenční křivky: ${d.label}` });
  return mk('graf-indiference', {
    part: 'zkouska',
    data: { kind },
    task: `Nakreslete dvě indiferenční křivky pro případ: ${d.label}.`,
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: d.text,
    source: { chapter: 4, number: 10 },
    solution: [
      { title: 'Vztah mezi statky', text: `Případ „${d.label}“ určuje, jak se statky nahrazují.`, board: [line('\\text{vztah statků}\\ \\Rightarrow\\ MRS')] },
      { title: 'Tvar křivky', text: d.text, board: [line('I_2\\ \\text{leží nad (vpravo od)}\\ I_1\\ \\Rightarrow\\ U_2>U_1')] },
      { title: 'Graf', text: 'Nakreslíme osy se jmény statků a dvě křivky I1 (nižší užitek) a I2 (vyšší užitek).', viz: g },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('mu-derivace', 'Mezní užitek z funkce TU', genMuDerivace, buildMuDerivace),
  type('tu-maximum', 'Kde je celkový užitek největší', genTuMax, buildTuMax),
  type('mu-tabulka', 'Tabulka TU a mezní užitek', genMuTabulka, buildMuTabulka),
  type('optimum-tabulka', 'Optimální skladba nákupu z tabulky MU', genOptimumTabulka, buildOptimumTabulka),
  type('optimum-cobb', 'Optimum spotřebitele při U = X·Y', genOptimumCobb, buildOptimumCobb),
  type('rozpocet-primka', 'Rozpočtová přímka', genRozpocet, buildRozpocet),
  type('rozpocet-z-grafu', 'Důchod a cena z rozpočtové přímky', genRozpocetGraf, buildRozpocetGraf),
  type('rozpocet-zmena', 'Změna rozpočtové přímky', genRozpocetZmena, buildRozpocetZmena),
  type('mrs', 'Mezní míra substituce', genMrs, buildMrs),
  type('rovnovaha-spotrebitele', 'Je spotřebitel v rovnováze?', genRovnovahaSp, buildRovnovahaSp),
  type('elasticita-cenova', 'Cenová elasticita z dvou bodů', genElCena, buildElCena),
  type('elasticita-bodova', 'Elasticita a výdaje z lineární poptávky', genElBod, buildElBod),
  type('elasticita-klasifikace', 'Druh poptávky podle elasticity', (rng) => buildElKlas({ id: pick(rng, ids(EL_ITEMS)) }), buildElKlas),
  type('elasticita-trzby', 'Elasticita a celkový příjem', (rng) => buildElTrzby({ E: pick(rng, [0.3, 0.5, 0.8, 1, 1.5, 2, 3, 5]), dir: pick(rng, ['+', '-']) }), buildElTrzby),
  type('trzby-tabulka', 'Tabulka celkových příjmů', genTrzbyTabulka, buildTrzbyTabulka),
  type('trzby-maximum', 'Cena s největším příjmem', genTrzbyMax, buildTrzbyMax),
  type('duchodova', 'Důchodová elasticita', (rng) => buildDuchodova(genEiData(rng)), buildDuchodova),
  type('klasifikace-statku', 'Normální, luxusní nebo podřadný statek', (rng) => buildKlasStatku(genEiData(rng)), buildKlasStatku),
  type('krizova-zmena', 'Křížová elasticita: změna poptávky', genKrizovaZmena, buildKrizovaZmena),
  type('krizova-vztah', 'Substituty, nebo komplementy?', genKrizovaVztah, buildKrizovaVztah),
  type('indiference-tvar', 'Tvar indiferenčních křivek', (rng) => buildIcTvar({ id: pick(rng, ids(IC_ITEMS)) }), buildIcTvar),
  type('test-vyber', 'Výběr z možností', (rng) => buildTestVyber({ id: pick(rng, ids(CHOICES)) }), buildTestVyber),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-optimum', 'Nakresli optimum spotřebitele (zkouška)', genGrafOptimum, buildGrafOptimum),
  type('graf-rozpocet-posun', 'Nakresli změnu rozpočtové přímky (zkouška)', genGrafRozpocet, buildGrafRozpocet),
  type('graf-engel', 'Nakresli Engelovu křivku (zkouška)', (rng) => buildGrafEngel({ kind: pick(rng, ['normalni', 'podradny']) }), buildGrafEngel),
  type('graf-indiference', 'Nakresli indiferenční křivky (zkouška)', (rng) => buildGrafIk({ kind: pick(rng, Object.keys(IC_GRAPHS)) }), buildGrafIk),
];

// ---------- výklad ----------
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, 12], range: [0, 12], curves, ...extra } });

const theory = [
  { heading: 'Užitek, celkový a mezní užitek', term: 'Mezní užitek',
    text: 'Spotřebitel kupuje statky proto, že mu přinášejí užitek, tedy uspokojení potřeb. Celkový užitek $TU$ je uspokojení ze všech spotřebovaných jednotek statku. Mezní užitek $MU$ je přírůstek celkového užitku, který přinese poslední (další) spotřebovaná jednotka.\n\nV tabulce ho počítáme jako rozdíl dvou sousedních celkových užitků, u funkce jako derivaci celkového užitku podle množství. Například funkce $TU=30Q-Q^2$ má $MU=30-2Q$.\n\nDokud je $MU$ kladný, celkový užitek roste. Největší je tam, kde $MU=0$. Za tímto bodem je $MU$ záporný, další jednotky už užitek snižují (přesycení).',
    tex: 'MU_Q=TU_Q-TU_{Q-1}\\quad\\text{nebo}\\quad MU=\\frac{dTU}{dQ}',
    viz: { kind: 'econ', data: { axes: { x: 'Q', y: 'U' }, domain: [0, 10], range: [0, 30], curves: [{ expr: '10*x - x^2', label: 'TU', color: 'blue' }, { expr: '10 - 2*x', label: 'MU', color: 'accent', dashed: true }], points: [{ x: 5, y: 25, label: 'max', guides: true }] } },
    mistakes: ['Mezní užitek není užitek ze všech jednotek, ale jen z té poslední. Celkový užitek je součet všech mezních užitků.', 'U tabulky se mezní užitek počítá z rozdílu, u funkce z derivace. Pro $TU=30Q-Q^2$ vychází pro 8. jednotku z derivace 14, z rozdílu 15. Ve cvičebnici se používá derivace.', 'Mezní užitek může být záporný, a celkový užitek se pak snižuje.'] },
  { heading: 'Zákon klesajícího mezního užitku', term: 'Zákon klesajícího mezního užitku',
    text: 'Zákon klesajícího mezního užitku říká, že s rostoucím množstvím téhož statku, které spotřebitel v daném období spotřebuje, mezní užitek další jednotky klesá. První jednotka vody po žíznivém dni přinese hodně, desátá už skoro nic.\n\nZ toho plyne:\n\n• křivka mezního užitku je klesající,\n• celkový užitek sice roste, ale stále pomaleji,\n• spotřebitel koupí další kus jen tehdy, když mu přinese víc užitku, než kolik užitku by mu přinesla koruna utracená jinak. Proto klesá poptávané množství s růstem ceny.',
    mistakes: ['Zákon se týká jednoho statku v čase. Neříká, že s růstem příjmů potřeba všeho klesá.', 'Pokles mezního užitku neznamená pokles celkového užitku. Celkový užitek klesá až při záporném mezním užitku.'] },
  { heading: 'Rozpočtové omezení', term: 'Rozpočtové omezení',
    text: 'Spotřebitel nemůže utratit víc, než má. Při důchodu $I$ a cenách $P_X$ a $P_Y$ musí platit rozpočtová rovnice. Všechny kombinace, při kterých se celý důchod utratí, leží na rozpočtové přímce.\n\nPrůsečík s osou X je $I/P_X$ (celý důchod za X), průsečík s osou Y je $I/P_Y$. Sklon přímky je záporný poměr cen $-P_X/P_Y$. Kombinace pod přímkou jsou dosažitelné, ale rozpočet nevyčerpají, nad přímkou si je spotřebitel nemůže dovolit.',
    tex: 'I=P_X\\,X+P_Y\\,Y,\\qquad Y=\\frac{I}{P_Y}-\\frac{P_X}{P_Y}X',
    viz: { kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, 60], range: [0, 50], curves: [{ expr: '(1000 - 20*x)/25', label: 'BL', color: 'chalk', domain: [0, 50] }], points: [{ x: 50, y: 0, label: '50' }, { x: 0, y: 40, label: '40' }] } },
    mistakes: ['Průsečík s osou Y počítáme s cenou Y, průsečík s osou X s cenou X. Snadno se prohodí.', 'Sklon přímky je záporný poměr cen $-P_X/P_Y$ (cena statku z vodorovné osy nahoře), nikoli opačně.'] },
  { heading: 'Změna důchodu a cen: pohyb rozpočtové přímky', term: 'Reálný důchod',
    text: 'Změna důchodu při stálých cenách posune přímku rovnoběžně: vyšší důchod ji posune od počátku, nižší k počátku. Sklon se nemění.\n\nZměna ceny jednoho statku přímku otočí kolem jejího průsečíku s osou druhého statku. Pokles ceny Y například nechá průsečík s osou X na místě a zvýší průsečík s osou Y.\n\nReálný důchod je to, kolik statků si za důchod můžeme koupit. Když se všechny ceny sníží na polovinu, reálný důchod se zdvojnásobí. Když se důchod i všechny ceny změní ve stejném poměru, přímka zůstane na místě.',
    viz: { kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, 12], range: [0, 12], curves: [{ expr: '8 - 2*x/3', label: 'BL0', color: 'chalk', domain: [0, 12] }, { expr: '11 - 11*x/12', label: 'BL1', color: 'accent', dashed: true, domain: [0, 12] }], points: [] } },
    mistakes: ['Při změně ceny jednoho statku se přímka neposouvá, ale otáčí. Rovnoběžný posun způsobí jen změna důchodu (nebo všech cen ve stejném poměru).'] },
  { heading: 'Indiferenční křivky', term: 'Indiferenční křivka',
    text: 'Indiferenční křivka spojuje všechny kombinace dvou statků, které spotřebiteli přinášejí stejný užitek (je mu jedno, kterou si vybere). Pro běžné statky platí čtyři pravidla:\n\n• křivky jsou klesající (víc jednoho statku vyváží méně druhého),\n• jsou konvexní vzhledem k počátku,\n• křivka vzdálenější od počátku znamená vyšší užitek,\n• jedním bodem prochází jen jedna křivka, křivky se neprotínají.',
    viz: view([hyper(12, 'I1', 'blue', 1, 12), hyper(30, 'I2', 'green', 2.5, 12)]),
    mistakes: ['Indiferenční křivky se neprotínají. V průsečíku by měl jeden spotřební koš dvě různé úrovně užitku.', 'Indiferenční křivka a rozpočtová přímka jsou dvě různé věci: první vyjadřuje chtění, druhá možnosti.'] },
  { heading: 'Mezní míra substituce', term: 'Mezní míra substituce',
    text: 'Mezní míra substituce (MRS) udává, kolik jednotek statku Y je spotřebitel ochoten vzdát za jednu další jednotku statku X při zachování stejného užitku. V každém bodě je to absolutní hodnota sklonu indiferenční křivky a rovná se poměru mezních užitků.\n\nPohybem po křivce doprava (víc X) MRS klesá: čím víc statku X mám, tím méně Y jsem za něj ochoten dát. Proto jsou křivky konvexní.',
    tex: 'MRS_{XY}=\\left|\\frac{\\Delta Y}{\\Delta X}\\right|=\\frac{MU_X}{MU_Y}',
    mistakes: ['MRS je poměr mezních užitků, ne jejich rozdíl. Čitatel je užitek statku z vodorovné osy.', 'U dokonalých komplementů (pravý úhel) MRS není definována.'] },
  { heading: 'Zvláštní případy indiferenčních křivek', term: 'Dokonalé substituty',
    text: 'U některých dvojic statků neplatí klesající MRS:\n\n• Dokonalé substituty (instantní a mletá káva): statky se nahrazují v pevném poměru, křivky jsou klesající přímky, MRS je konstantní.\n• Dokonalé komplementy (pravá a levá bota): spotřebovávají se společně, křivky tvoří pravý úhel.\n• Neutrální statek (voda pro někoho, kdo má rád jen pizzu): křivky jsou rovnoběžné s osou neutrálního statku.\n• Nežádoucí statek (návštěva zubaře, játra pro dítě): křivky mají kladný sklon, víc nežádoucího se musí vyvážit víc žádoucího.',
    viz: view([{ expr: '6 - x', label: 'I1', color: 'blue', domain: [0, 6] }, { expr: '10 - x', label: 'I2', color: 'green', domain: [0, 10] }]),
    mistakes: ['Pravý úhel patří komplementům, přímka substitutům. Snadno se zamění.', 'U neutrálního statku jsou křivky rovnoběžné s osou, na které je měřen neutrální statek.'] },
  { heading: 'Optimum spotřebitele', term: 'Optimum spotřebitele',
    text: 'Spotřebitel chce nejvyšší možný užitek při daném důchodu. Hledá tedy bod na rozpočtové přímce, který leží na co nejvyšší indiferenční křivce. Je to bod dotyku křivky a přímky.\n\nV optimu mají křivka i přímka stejný sklon, a proto $MRS=P_X/P_Y$. Ekvivalentně se rovná užitek z poslední koruny utracené za každý statek, a navíc se utratí celý důchod.\n\nU tabulky MU postupujeme tak: každou jednotku ohodnotíme poměrem $MU/P$, kupujeme od nejvyšší hodnoty, dokud nevyčerpáme důchod. U funkce užitku $U=X\\cdot Y$ vyjde z podmínky $Y/P_X=X/P_Y$ a z rozpočtu $X=I/(2P_X)$ a $Y=I/(2P_Y)$.',
    tex: '\\frac{MU_X}{P_X}=\\frac{MU_Y}{P_Y},\\qquad P_X X+P_Y Y=I',
    viz: { kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, 12], range: [0, 12], curves: [{ expr: '(10 - x)', label: 'BL', color: 'chalk', domain: [0, 10] }, hyper(25, 'I', 'blue', 2.2, 12)], points: [{ x: 5, y: 5, label: 'E', guides: true }] } },
    mistakes: ['V optimu se nerovnají mezní užitky, ale poměry mezního užitku k ceně.', 'Optimum musí vyčerpat celý rozpočet. I když poměry $MU/P$ vyjdou stejné, při nevyčerpaném důchodu ještě spotřebitel může koupit víc obou statků.'] },
  { heading: 'Změna důchodu, Engelova křivka a druhy statků', term: 'Engelova křivka',
    text: 'Když roste důchod při stálých cenách, posouvá se rozpočtová přímka od počátku a spotřebitel zvolí nové optimum. Engelova křivka ukazuje závislost kupovaného množství statku na důchodu.\n\n• Normální statek: s růstem důchodu se kupuje víc, křivka je rostoucí. Podle hodnoty důchodové elasticity jde o statek denní potřeby (do 1) nebo luxusní (nad 1).\n• Podřadný statek: s růstem důchodu se kupuje méně, křivka je klesající, elasticita je záporná.',
    viz: { kind: 'econ', data: { axes: { x: 'Q', y: 'I' }, domain: [0, 40], range: [0, 100], curves: [{ expr: '10 + 2*x', label: 'normální', color: 'blue' }, { expr: '95 - 2*x', label: 'podřadný', color: 'accent', domain: [5, 40] }] } },
    mistakes: ['Engelova křivka je závislost množství na důchodu, poptávková křivka závislost množství na ceně. Nezaměňovat.'] },
  { heading: 'Změna ceny, Giffenův statek', term: 'Giffenův statek',
    text: 'Změna ceny statku posune rozpočtovou přímku (otočí ji). Celkový účinek na kupované množství se dá rozložit na dva efekty:\n\n• substituční efekt: dražší statek se nahrazuje levnějším,\n• důchodový efekt: zdražením klesne reálný důchod.\n\nU běžných statků tak vzniká klesající křivka poptávky, která je množinou optim spotřebitele při různých cenách statku (důchod a ostatní ceny se nemění).\n\nU Giffenova statku (zvláštního případu podřadného statku) důchodový efekt převáží substituční: při růstu ceny roste kupované množství, křivka poptávky je rostoucí. Zákon poptávky tu neplatí.',
    viz: { kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 12], range: [0, 12], curves: [{ expr: '12 - x', label: 'běžný', color: 'blue' }, { expr: '2 + x', label: 'Giffen', color: 'accent' }] } },
    mistakes: ['Giffenův statek je extrémně vzácná výjimka. Každý podřadný statek Giffenův není, musí navíc převážit důchodový efekt.'] },
  { heading: 'Cenová elasticita poptávky', term: 'Cenová elasticita poptávky',
    text: 'Cenová elasticita poptávky udává, o kolik procent se změní poptávané množství, když se cena změní o 1 %. Je to podíl procentních změn. Protože cena a množství se pohybují opačně, bereme absolutní hodnotu.\n\n• $E>1$: poptávka je elastická (množství reaguje víc než proporcionálně),\n• $E<1$: neelastická,\n• $E=1$: jednotkově elastická,\n• $E=0$: dokonale neelastická (svislá poptávka, např. nezbytný lék),\n• $E\\to\\infty$: dokonale elastická (vodorovná poptávka).\n\nVliv na příjem: u elastické poptávky příjem roste snížením ceny, u neelastické zvýšením ceny. Příjem je největší tam, kde $E=1$. Elasticita je vyšší u statků s blízkými substituty, s velkým podílem na výdajích a v delším čase. V cvičebnici se změny počítají vzhledem k původním hodnotám, u funkce $Q=a-bP$ je v bodě $E=bP/Q$.',
    tex: 'E_D=\\left|\\frac{\\%\\Delta Q}{\\%\\Delta P}\\right|,\\qquad TR=P\\cdot Q',
    mistakes: ['Elasticita není sklon křivky. Podél přímé poptávky se sklon nemění, ale elasticita se mění (nahoře je vysoká, dole nízká).', 'Neelastická poptávka znamená $E<1$, ne $E=0$. Nulová je až dokonale neelastická.', 'Elasticita se počítá z procentních, ne absolutních změn. Nejde o změnu ceny dělenou změnou příjmu.'] },
  { heading: 'Důchodová a křížová elasticita', term: 'Křížová elasticita',
    text: 'Důchodová elasticita udává procentní změnu množství při změně důchodu o 1 %. Je kladná u normálních statků (do 1 statek denní potřeby, nad 1 luxusní) a záporná u podřadných.\n\nKřížová elasticita udává procentní změnu množství statku B při změně ceny statku A o 1 %. Je kladná u substitutů (Pepsi a Coca-Cola), záporná u komplementů (mobil a kryt na mobil) a nulová u nezávislých statků (boty a žárovky).\n\nZměnu množství spočteme z definice: $\\%\\Delta Q_B=E_{AB}\\cdot\\%\\Delta P_A$. Pro $E_{AB}=2$ a zdražení kávy o 50 % vzroste poptávka po čaji o 100 %.',
    tex: 'E_I=\\frac{\\%\\Delta Q}{\\%\\Delta I},\\qquad E_{AB}=\\frac{\\%\\Delta Q_B}{\\%\\Delta P_A}',
    mistakes: ['Znaménko křížové elasticity rozhoduje: plus znamená substituty, mínus komplementy. Statky bez vazby mají nulu.', 'U důchodové elasticity se znaménko nezahazuje. Záporná hodnota prozrazuje podřadný statek.'] },
];

export default {
  id: TOPIC, title: 'Chování spotřebitele a formování poptávky', order: 3, theory, types,
};
