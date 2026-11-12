// Téma 8: Trh práce (podle skript kap. 9, prezentace 8 a cvičebnice kap. 9 včetně 9.1 Nedokonalá konkurence na trhu práce).
// Generátory a výklad jsou psané vlastními slovy; konkrétní zadání ze cvičebnice se staví stejnými funkcemi solve().
// Struktura je stejná jako u js/topics/tema02.js (theory + types, generate(rng) a solve(data)).
//
// Pojmy a značení: w je mzdová sazba, L množství práce (počet pracovníků), MP mezní produkt práce,
// MRP příjem z mezního produktu (MR · MP), VMP hodnota mezního produktu (P · MP), MFC mezní náklad na práci.
import {
  int, pick, shuffle, cz, czText, line, result, coef, demandExpr, supplyExpr,
} from './lib.js';

const TOPIC = 'prace';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const ids = (list) => list.map((x) => x.id);

// ---------- společné pomůcky ----------
const niceMax = (v) => {
  const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const p = 10 ** Math.floor(Math.log10(v));
  return STEPS.find((f) => f * p >= v - 1e-9) * p;
};
// Tabulka do TeXu: první řádek je záhlaví (první sloupec názvy řádků), dál řádky stejného tvaru.
const tabTex = (rows) => `\\begin{array}{c|${'c'.repeat(rows[0].length - 1)}}${rows[0].join('&')}\\\\\\hline ${rows.slice(1).map((r) => r.join('&')).join('\\\\')}\\end{array}`;
const nums = (list) => list.map(cz);

// Graf trhu práce: vodorovná osa množství práce L, svislá mzda w.
function labViz({ curves, points = [], arrows = [], xMax, yMax, alt }) {
  return {
    kind: 'econ',
    data: {
      axes: { x: 'L', y: 'w' }, domain: [0, niceMax(xMax)], range: [0, niceMax(yMax)], curves, points, arrows, areas: [], alt,
    },
  };
}
const DL = (a, b) => ({ expr: demandExpr(a, b), label: 'DL', color: 'blue' });
const SL = (c, d) => ({ expr: supplyExpr(c, d), label: 'SL', color: 'chalk' });
const wageLine = (w, label) => ({ expr: `${r6(w)}`, label, color: 'accent', dashed: true });

// ---------- trh zadaný rovnicemi L(w): L_D = a − b·w, L_S = c + d·w (c ≤ 0) ----------
const eqLw = (a, b, c, d) => { const w = (a - c) / (b + d); return { w, L: a - b * w }; };
const lwDem = (a, b) => `L_D=${cz(a)}-${coef(b, 'w')}`;
const lwSup = (c, d) => (c === 0 ? `L_S=${coef(d, 'w')}` : `L_S=${coef(d, 'w')}-${cz(-c)}`);

function lwViz({ a, b, c, d }, extra = {}) {
  const e = eqLw(a, b, c, d);
  return labViz({
    curves: [DL(a, b), SL(c, d), ...(extra.curves || [])],
    points: extra.points || [{ x: e.L, y: e.w, label: 'E', guides: true }],
    xMax: Math.max(a, ...(extra.xs || [])) * 1.05, yMax: Math.max(a / b, ...(extra.ys || [])) * 1.05,
    alt: extra.alt || 'Poptávka po práci, nabídka práce a rovnováha',
  });
}

// Generátor: rovnovážná mzda wE celá, nabídka začíná od mzdy w0 (L_S = d·(w − w0)).
function genLw(rng) {
  const b = 10 * int(rng, 1, 5); const d = 10 * int(rng, 1, 5);
  const w0 = pick(rng, [0, 0, 5, 10, 15]);
  const wE = w0 + int(rng, 8, 40);
  const LE = d * (wE - w0);
  return { a: LE + b * wE, b, c: -d * w0, d, wE, LE };
}

// ---------- trh zadaný rovnicemi w(L): w = A − B·L (poptávka, MRP), w = C + D·L (nabídka) ----------
const wlDem = (A, B) => `w=${cz(A)}-${coef(B, 'L')}`;
const wlSup = (C, D) => (C === 0 ? `w=${coef(D, 'L')}` : `w=${cz(C)}+${coef(D, 'L')}`);
const invDem = (A, B) => ({ expr: `${A} - ${B}*x`, label: 'DL', color: 'blue' });
const invSup = (C, D) => ({ expr: `${C} + ${D}*x`, label: 'SL', color: 'chalk' });

// ---------- typ: rovnováha na trhu práce z rovnic ----------
function buildRovnovaha(p) {
  const askW = p.ask === 'w';
  if (p.form === 'Lw') {
    const { a, b, c, d } = p;
    const e = eqLw(a, b, c, d);
    const rhs = c === 0 ? '' : `+${cz(-c)}`;
    return mk('rovnovaha-prace', {
      data: { form: 'Lw', a, b, c, d, ask: p.ask },
      task: `Poptávku po práci popisuje první rovnice, nabídku práce druhá (L je počet pracovníků, w mzdová sazba v Kč za hodinu). Určete ${askW ? 'rovnovážnou mzdovou sazbu' : 'rovnovážnou zaměstnanost'}.`,
      promptTex: `${lwDem(a, b)},\\qquad ${lwSup(c, d)}`,
      answerSpec: { kind: 'number', value: askW ? e.w : e.L },
      conclusion: `Rovnovážná mzdová sazba je ${czText(e.w)} Kč za hodinu a rovnovážná zaměstnanost ${czText(e.L)} pracovníků.`,
      source: { chapter: 9, number: '1.2' },
      solution: [
        { title: 'Podmínka rovnováhy', text: 'Na trhu práce je rovnováha, když firmy chtějí zaměstnat právě tolik lidí, kolik jich práci nabízí: $L_D = L_S$. Pravé strany obou rovnic proto dáme do rovnosti.',
          board: [line('L_D=L_S'), line(`${cz(a)}-${coef(b, 'w')}=${coef(d, 'w')}${c === 0 ? '' : `-${cz(-c)}`}`)] },
        { title: 'Vyřešíme rovnici pro mzdu', text: `Členy s $w$ dáme na jednu stranu a čísla na druhou: vlevo vznikne ${cz(a - c)}, vpravo ${cz(b + d)}$w$. Pak dělíme číslem u $w$.`,
          board: [line(`${cz(a)}${rhs}=${cz(b)}w+${cz(d)}w`), line(`${cz(a - c)}=${cz(b + d)}w`), line(`w=\\frac{${cz(a - c)}}{${cz(b + d)}}`), askW ? result(`w_E=${cz(e.w)}`) : line(`w_E=${cz(e.w)}`)] },
        { title: 'Dosadíme do poptávky', text: `Rovnovážnou mzdu ${czText(e.w)} Kč dosadíme do rovnice poptávky po práci (stejně dobře jde použít nabídka) a dostaneme zaměstnanost.`,
          board: [line(`L_E=${cz(a)}-${cz(b)}\\cdot ${cz(e.w)}`), askW ? line(`L_E=${cz(e.L)}`) : result(`L_E=${cz(e.L)}`)] },
        { title: 'Zkouška správnosti', text: 'Mzdu dosadíme i do rovnice nabídky. Vyjde-li stejný počet pracovníků, počítali jsme správně.',
          board: [line(`L_S=${cz(d)}\\cdot ${cz(e.w)}${c === 0 ? '' : `-${cz(-c)}`}=${cz(e.L)}`)] },
        { title: 'Graf trhu práce', text: `V bodě rovnováhy E se kříží křivka poptávky po práci $D_L$ a nabídky práce $S_L$: mzda ${czText(e.w)} Kč za hodinu, zaměstnanost ${czText(e.L)} pracovníků.`,
          viz: lwViz({ a, b, c, d }) },
      ],
    });
  }
  const { A, B, C, D } = p;
  const L = (A - C) / (B + D); const w = A - B * L;
  return mk('rovnovaha-prace', {
    data: { form: 'wL', A, B, C, D, ask: p.ask },
    task: `Poptávka po práci (křivka příjmu z mezního produktu) je dána první rovnicí a nabídka práce druhou (w je mzdová sazba, L počet pracovníků). Určete ${askW ? 'rovnovážnou mzdovou sazbu' : 'rovnovážnou zaměstnanost'}.`,
    promptTex: `${wlDem(A, B)},\\qquad ${wlSup(C, D)}`,
    answerSpec: { kind: 'number', value: askW ? w : L },
    conclusion: `Rovnovážná zaměstnanost je ${czText(L)} a rovnovážná mzdová sazba ${czText(w)}.`,
    source: { chapter: '9.1', number: 1 },
    solution: [
      { title: 'Podmínka rovnováhy', text: 'Obě křivky jsou zapsané jako mzda v závislosti na množství práce. V rovnováze mají poptávka i nabídka při stejném množství práce stejnou mzdu, takže pravé strany porovnáme.',
        board: [line('w_D=w_S'), line(`${cz(A)}-${coef(B, 'L')}=${C === 0 ? '' : `${cz(C)}+`}${coef(D, 'L')}`)] },
      { title: 'Vyřešíme rovnici pro množství práce', text: 'Členy s $L$ dáme na jednu stranu, čísla na druhou a dělíme číslem u $L$.',
        board: [line(`${cz(A)}${C === 0 ? '' : `-${cz(C)}`}=${cz(B)}L+${cz(D)}L`), line(`${cz(A - C)}=${cz(B + D)}L`), askW ? line(`L_E=${cz(L)}`) : result(`L_E=${cz(L)}`)] },
      { title: 'Dosadíme do rovnice poptávky', text: 'Rovnovážné množství práce dosadíme do jedné z rovnic. Použijeme poptávku.',
        board: [line(`w_E=${cz(A)}-${cz(B)}\\cdot ${cz(L)}`), askW ? result(`w_E=${cz(w)}`) : line(`w_E=${cz(w)}`)] },
      { title: 'Zkouška správnosti', text: 'Mzda z rovnice nabídky musí vyjít stejně.',
        board: [line(`w_E=${C === 0 ? '' : `${cz(C)}+`}${cz(D)}\\cdot ${cz(L)}=${cz(w)}`)] },
      { title: 'Graf trhu práce', text: `Křivky se protínají v bodě E: zaměstnanost ${czText(L)}, mzda ${czText(w)}.`,
        viz: labViz({ curves: [invDem(A, B), invSup(C, D)], points: [{ x: L, y: w, label: 'E', guides: true }], xMax: A / B * 1.05, yMax: A * 1.05, alt: 'Rovnováha na trhu práce' }) },
    ],
  });
}

function genRovnovaha(rng) {
  if (rng() < 0.6) {
    const g = genLw(rng);
    return buildRovnovaha({ form: 'Lw', a: g.a, b: g.b, c: g.c, d: g.d, ask: pick(rng, ['w', 'L']) });
  }
  const B = int(rng, 1, 6); const D = int(rng, 1, 6);
  const L = int(rng, 5, 40); const C = pick(rng, [0, 10, 20, 30, 40, 50]);
  return buildRovnovaha({ form: 'wL', A: C + (B + D) * L, B, C, D, ask: pick(rng, ['w', 'L']) });
}

// ---------- typ: rovnováha z tabulky nabídky a poptávky ----------
function buildRovnTab({ ws, dem, sup, ask }) {
  const k = dem.findIndex((q, i) => q === sup[i]);
  const wE = ws[k]; const LE = dem[k];
  const bill = wE * LE;
  const askW = ask === 'w';
  const rows = ws.map((w, i) => (dem[i] > sup[i] ? `w=${cz(w)}:\\ L_D=${cz(dem[i])}>L_S=${cz(sup[i])}` : dem[i] < sup[i] ? `w=${cz(w)}:\\ L_D=${cz(dem[i])}<L_S=${cz(sup[i])}` : `w=${cz(w)}:\\ L_D=L_S=${cz(dem[i])}`));
  return mk('rovnovaha-tabulka', {
    data: { ws, dem, sup, ask },
    task: `Tabulka ukazuje poptávané a nabízené množství téhož druhu práce při různých mzdových sazbách. ${askW ? 'Určete rovnovážnou mzdovou sazbu.' : 'Určete celkovou mzdu (součet všech mezd vyplacených zaměstnancům) v rovnováze, tedy mzdová sazba krát zaměstnanost.'}`,
    promptTex: tabTex([['w', ...nums(ws)], ['L_D', ...nums(dem)], ['L_S', ...nums(sup)]]),
    answerSpec: { kind: 'number', value: askW ? wE : bill },
    conclusion: askW ? `Rovnovážná mzdová sazba je ${czText(wE)}.` : `Celková mzda je ${czText(bill)} (mzdová sazba ${czText(wE)} krát zaměstnanost ${czText(LE)}).`,
    source: { chapter: 9, number: 6 },
    solution: [
      { title: 'Porovnáme poptávku s nabídkou', text: 'U každé mzdové sazby porovnáme množství práce, které firmy poptávají, s množstvím, které lidé nabízejí. Při nízké mzdě nabídka zaostává (nedostatek pracovních sil), při vysoké převažuje (přebytek).',
        board: rows.map((r) => line(r)) },
      { title: 'Najdeme rovnováhu', text: `Poptávané a nabízené množství se rovnají jen při mzdové sazbě ${czText(wE)}. Je to rovnovážná mzda, zaměstnanost je ${czText(LE)}. Pod ní vzniká nedostatek pracovních sil, nad ní přebytek.`,
        board: [line(`w_E=${cz(wE)},\\quad L_E=${cz(LE)}`)] },
      ...(askW ? [{ title: 'Kontrola', text: 'Při mzdě o stupeň nižší je poptávané množství větší než nabízené, při mzdě o stupeň vyšší menší. Rovnováha tedy leží přesně mezi nimi.',
        board: [line(`w<w_E\\Rightarrow L_D>L_S,\\quad w>w_E\\Rightarrow L_D<L_S`), result(`w_E=${cz(wE)}`)] }]
        : [{ title: 'Celková mzda', text: 'Celková mzda je mzdová sazba krát počet zaměstnaných. Je to obdélník v grafu s rohem v bodě rovnováhy.',
          board: [result(`${cz(wE)}\\cdot ${cz(LE)}=${cz(bill)}`)] }]),
    ],
  });
}

function genRovnTab(rng) {
  for (let t = 0; t < 200; t++) {
    const step = pick(rng, [5, 10]); const w0 = pick(rng, [80, 90, 100, 120]);
    const ws = Array.from({ length: 6 }, (_, i) => w0 + step * i);
    const k = int(rng, 1, 4); const LE = 100 * int(rng, 3, 10);
    const dd = pick(rng, [100, 150, 200]);
    const dem = ws.map((_, i) => LE + dd * (k - i));
    const sup = Array(6).fill(0); sup[k] = LE;
    for (let i = k + 1; i < 6; i++) sup[i] = sup[i - 1] + 50 * int(rng, 4, 8);
    for (let i = k - 1; i >= 0; i--) sup[i] = sup[i + 1] - 50 * int(rng, 4, 8);
    if (dem.every((q) => q >= 0) && sup.every((q) => q >= 0)) return buildRovnTab({ ws, dem, sup, ask: pick(rng, ['w', 'mzdy']) });
  }
  return buildRovnTab({ ws: [100, 110, 120, 130, 140, 150], dem: [1000, 800, 600, 400, 200, 0], sup: [0, 300, 600, 1000, 1200, 1500], ask: 'w' });
}

// ---------- typ: minimální mzda ----------
function buildMinMzda({ a, b, c, d, wmin, ask }) {
  const e = eqLw(a, b, c, d);
  const binding = wmin > e.w + 1e-9;
  const LD = a - b * wmin; const LS = c + d * wmin;
  const emp = binding ? LD : e.L; const unemp = binding ? LS - LD : 0;
  const askEmp = ask === 'zam';
  const value = askEmp ? emp : unemp;
  const graph = lwViz({ a, b, c, d }, {
    curves: [wageLine(wmin, 'wmin')],
    points: binding
      ? [{ x: e.L, y: e.w, label: 'E' }, { x: LD, y: wmin, label: 'A', guides: true }, { x: LS, y: wmin, label: 'B', guides: true }]
      : [{ x: e.L, y: e.w, label: 'E', guides: true }],
    xs: [LS], ys: [wmin], alt: binding ? 'Minimální mzda nad rovnovážnou mzdou a nezaměstnanost' : 'Minimální mzda pod rovnovážnou mzdou nemá účinek',
  });
  return mk('min-mzda', {
    data: { a, b, c, d, wmin, ask },
    task: `Poptávku po práci popisuje první rovnice, nabídku práce druhá (L je počet pracovníků, w mzdová sazba v Kč za hodinu). Stát zavede minimální mzdovou sazbu ${czText(wmin)} Kč za hodinu. Určete ${askEmp ? 'zaměstnanost po zavedení minimální mzdy' : 'počet nezaměstnaných, kteří při této mzdě hledají práci (nedobrovolná nezaměstnanost)'}.`,
    promptTex: `${lwDem(a, b)},\\qquad ${lwSup(c, d)}`,
    answerSpec: { kind: 'number', value },
    conclusion: binding
      ? `Minimální mzda je nad rovnovážnou ${czText(e.w)}, zaměstnanost klesne na ${czText(LD)} a nezaměstnanost je ${czText(unemp)}.`
      : `Minimální mzda leží pod rovnovážnou ${czText(e.w)}, a nemá proto žádný účinek: zaměstnanost ${czText(e.L)}, nezaměstnanost ${czText(0)}.`,
    source: { chapter: '9.1', number: 2 },
    solution: [
      { title: 'Rovnováha bez zásahu', text: 'Nejdřív zjistíme, kde by trh skončil sám. Bez rovnovážné mzdy nepoznáme, jestli minimální mzda vůbec působí.',
        board: [line(`${cz(a)}-${coef(b, 'w')}=${coef(d, 'w')}${c === 0 ? '' : `-${cz(-c)}`}`), line(`w_E=${cz(e.w)},\\quad L_E=${cz(e.L)}`)] },
      { title: binding ? 'Minimální mzda je nad rovnováhou' : 'Minimální mzda je pod rovnováhou',
        text: binding ? `Mzda ${czText(wmin)} je vyšší než rovnovážná ${czText(e.w)}, takže zákon trh skutečně omezuje a mzda se nemůže vrátit k rovnováze.`
          : `Mzda ${czText(wmin)} je nižší než rovnovážná ${czText(e.w)}. Trh se na rovnovážné mzdě ustálí i bez zákona, takže minimální mzda nic nezmění.`,
        board: [line(`${cz(wmin)}${binding ? '>' : '<'}${cz(e.w)}`)] },
      binding
        ? { title: 'Poptávka a nabídka při minimální mzdě', text: 'Do poptávky i nabídky dosadíme minimální mzdu. Zaměstnat se může jen tolik lidí, kolik firmy poptávají (menší z obou množství), protože nikoho nelze přinutit najmout víc.',
          board: [line(`L_D=${cz(a)}-${cz(b)}\\cdot ${cz(wmin)}=${cz(LD)}`), line(`L_S=${cz(d)}\\cdot ${cz(wmin)}${c === 0 ? '' : `-${cz(-c)}`}=${cz(LS)}`)] }
        : { title: 'Zaměstnanost a nezaměstnanost', text: `Protože minimální mzda nepůsobí, zůstává zaměstnanost ${czText(e.L)}. Při rovnovážné mzdě nabízí práci právě tolik lidí, kolik jich firmy najmou, a nedobrovolná nezaměstnanost proto nevzniká.`,
          board: [line(`L=${cz(e.L)},\\quad U=${cz(0)}`)] },
      { title: askEmp ? 'Zaměstnanost' : 'Nezaměstnanost', text: binding
        ? (askEmp ? `Zaměstnanost určuje strana poptávky, tedy ${czText(LD)}. Je o ${czText(e.L - LD)} nižší než při rovnováze.` : `Práci při této mzdě chce ${czText(LS)} lidí, zaměstnaných je ${czText(LD)}. Rozdíl ${czText(unemp)} lidí práci nenajde: je to nedobrovolná nezaměstnanost.`)
        : `Výsledek: ${askEmp ? `zaměstnanost ${czText(e.L)}` : `nezaměstnanost ${czText(0)}`}.`,
      board: [result(binding ? (askEmp ? `L=${cz(LD)}` : `U=L_S-L_D=${cz(LS)}-${cz(LD)}=${cz(unemp)}`) : (askEmp ? `L=${cz(e.L)}` : `U=${cz(0)}`))] },
      { title: 'Graf', text: binding ? `Minimální mzda (čárkovaně) protíná poptávku v bodě A (zaměstnanost ${czText(LD)}) a nabídku v bodě B (${czText(LS)} lidí chce pracovat). Vzdálenost mezi A a B je nezaměstnanost.`
        : 'Čárkovaná minimální mzda leží pod rovnováhou E, a proto se v rovnováze nic nemění.', viz: graph },
    ],
  });
}

function genMinMzda(rng) {
  for (let t = 0; t < 300; t++) {
    const g = genLw(rng);
    const binding = rng() < 0.8;
    if (binding) {
      const kMax = Math.min(12, Math.floor((0.6 * g.LE) / g.b));
      if (kMax < 2) continue;
      return buildMinMzda({ a: g.a, b: g.b, c: g.c, d: g.d, wmin: g.wE + int(rng, 2, kMax), ask: pick(rng, ['zam', 'nezam']) });
    }
    return buildMinMzda({ a: g.a, b: g.b, c: g.c, d: g.d, wmin: g.wE - int(rng, 1, 5), ask: pick(rng, ['zam', 'nezam']) });
  }
  return buildMinMzda({ a: 6000, b: 40, c: 0, d: 120, wmin: 40, ask: 'nezam' });
}

// ---------- typ: dobrovolná a nedobrovolná nezaměstnanost (údaje z grafu) ----------
const UNEMP_WHAT = {
  dob0: 'počet dobrovolně nezaměstnaných v rovnováze bez regulace (lidé schopní práci vykonávat, kteří při rovnovážné mzdě nechtějí pracovat)',
  zam: 'zaměstnanost po zavedení minimální mzdy',
  nedob: 'počet nedobrovolně nezaměstnaných po zavedení minimální mzdy (chtějí pracovat za minimální mzdu, ale práci nenajdou)',
  dob1: 'počet dobrovolně nezaměstnaných po zavedení minimální mzdy (schopní práci vykonávat, kteří za minimální mzdu práci nenabízejí)',
};
function buildNezam({ N, wE, LE, wmin, LD, LS, ask }) {
  const val = { dob0: N - LE, zam: LD, nedob: LS - LD, dob1: N - LS }[ask];
  const mD = (wmin - wE) / (LD - LE); const mS = (wmin - wE) / (LS - LE);
  const line1 = (m, L0, w0) => `${r6(w0)} + ${r6(m)}*(x - ${r6(L0)})`;
  const graph = labViz({
    curves: [{ expr: line1(mD, LE, wE), label: 'DL', color: 'blue' }, { expr: line1(mS, LE, wE), label: 'SL', color: 'chalk' }, wageLine(wmin, 'wmin')],
    points: [{ x: LE, y: wE, label: 'E', guides: true }, { x: LD, y: wmin, label: 'A', guides: true }, { x: LS, y: wmin, label: 'B', guides: true }],
    xMax: N * 1.05, yMax: wmin * 1.2, alt: 'Minimální mzda, zaměstnanost a nezaměstnanost',
  });
  return mk('nezamestnanost', {
    data: { N, wE, LE, wmin, LD, LS, ask },
    task: `Práci určité profese je schopno vykonávat ${czText(N)} tisíc lidí. Z grafu trhu práce jsme odečetli: v rovnováze bez regulace je mzda ${czText(wE)} Kč a zaměstnanost ${czText(LE)} tisíc. Stát zavede minimální mzdu ${czText(wmin)} Kč. Při ní firmy poptávají ${czText(LD)} tisíc pracovníků a ${czText(LS)} tisíc lidí je ochotno pracovat. Určete ${UNEMP_WHAT[ask]} (v tisících).`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Výsledek: ${czText(val)} tisíc.`,
    source: { chapter: 9, number: 4 },
    solution: [
      { title: 'Rozlišíme tři skupiny lidí', text: 'Ze všech lidí schopných práci dělat jsou jedni zaměstnaní, druzí práci hledají a nenajdou ji (nedobrovolná nezaměstnanost) a třetí práci při dané mzdě vůbec nenabízejí (dobrovolná nezaměstnanost). Nabídka práce při dané mzdě říká, kolik lidí chce pracovat.',
        board: [line('N=L+U_{ned}+U_{dob}')] },
      { title: 'Bez regulace', text: `V rovnováze pracuje ${czText(LE)} tisíc lidí, a každý, kdo práci za mzdu ${czText(wE)} Kč nabízí, ji také najde. Zbývající ${czText(N - LE)} tisíc lidí schopných práce za tuto mzdu pracovat nechce: to je dobrovolná nezaměstnanost. Nedobrovolná nezaměstnanost neexistuje.`,
        board: [line(`U_{dob}=${cz(N)}-${cz(LE)}=${cz(N - LE)}`), line('U_{ned}=0')] },
      { title: 'S minimální mzdou', text: `Při mzdě ${czText(wmin)} Kč chce pracovat ${czText(LS)} tisíc lidí, ale firmy poptávají jen ${czText(LD)} tisíc. Zaměstnaných je tolik, kolik firmy poptávají (strana poptávky). Rozdíl mezi nabídkou a poptávkou je nedobrovolná nezaměstnanost, a zbylých ${czText(N - LS)} tisíc práci za tuto mzdu nenabízí vůbec.`,
        board: [line(`L=${cz(LD)}`), line(`U_{ned}=L_S-L_D=${cz(LS)}-${cz(LD)}=${cz(LS - LD)}`), line(`U_{dob}=N-L_S=${cz(N)}-${cz(LS)}=${cz(N - LS)}`)] },
      { title: 'Graf', text: 'Poptávka (křivka DL) protíná minimální mzdu v bodě A, nabídka (SL) v bodě B. Úsečka AB je nedobrovolná nezaměstnanost, pod bodem A je zaměstnanost.', viz: graph },
      { title: 'Výsledek', text: `Hledané číslo je ${czText(val)} tisíc.`, board: [result(`${{ dob0: 'U_{dob}', zam: 'L', nedob: 'U_{ned}', dob1: 'U_{dob}' }[ask]}=${cz(val)}\\ \\text{tis.}`)] },
    ],
  });
}

function genNezam(rng) {
  const N = pick(rng, [80, 100, 120, 150]);
  const LE = int(rng, 14, 28) * N / 40 | 0;
  const wE = 100 * int(rng, 30, 60);
  const LD = LE - 5 * int(rng, 2, 6); const LS = Math.min(N - 5, LE + 5 * int(rng, 2, 5));
  const wmin = wE + 100 * int(rng, 5, 15);
  if (!(LD > 0 && LS > LE && LE > LD)) return genNezam(rng);
  return buildNezam({ N, wE, LE, wmin, LD, LS, ask: pick(rng, ['dob0', 'zam', 'nedob', 'dob1']) });
}

// ---------- typ: ekonomická renta a transferový výdělek ----------
function buildRenta({ a, b, c, d, ask }) {
  const e = eqLw(a, b, c, d);
  const w0 = -c / d; // nejnižší mzda, při které je někdo ochoten pracovat
  const bill = e.w * e.L; const rent = 0.5 * e.L * (e.w - w0); const transfer = bill - rent;
  const val = { renta: rent, transfer, mzdy: bill }[ask];
  const what = { renta: 'celkovou ekonomickou rentu všech pracovníků', transfer: 'celkový transferový výdělek všech pracovníků', mzdy: 'celkovou mzdu vyplacenou v rovnováze' }[ask];
  const graph = lwViz({ a, b, c, d }, { points: [{ x: e.L, y: e.w, label: 'E', guides: true }, { x: 0, y: w0, label: 'w0' }], alt: 'Ekonomická renta pracovníků v rovnováze' });
  graph.data.areas = [{ between: [`${r6(e.w)}`, supplyExpr(c, d)], from: 0, to: e.L, label: 'renta', color: 'accent' }];
  return mk('renta', {
    data: { a, b, c, d, ask },
    task: `Poptávku po práci popisuje první rovnice, nabídku práce druhá (L je počet pracovníků, w mzdová sazba v Kč za hodinu). Určete ${what}.`,
    promptTex: `${lwDem(a, b)},\\qquad ${lwSup(c, d)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Výsledek: ${czText(val)} Kč za hodinu (součet přes všechny pracovníky).`,
    source: { chapter: '9.1', number: 2 },
    solution: [
      { title: 'Rovnováha trhu práce', text: 'Nejdřív najdeme rovnovážnou mzdu a zaměstnanost z podmínky $L_D = L_S$.',
        board: [line(`${cz(a)}-${coef(b, 'w')}=${coef(d, 'w')}${c === 0 ? '' : `-${cz(-c)}`}`), line(`w_E=${cz(e.w)},\\quad L_E=${cz(e.L)}`)] },
      { title: 'Celková mzda a transferový výdělek', text: `Celková mzda je mzdová sazba krát zaměstnanost. Nabídka práce ukazuje, jakou nejnižší mzdu je ještě ochoten přijmout každý další pracovník (transferový výdělek): první pracovníci práci nabídnou už od mzdy ${czText(w0)} a poslední až od rovnovážné. Transferový výdělek všech je plocha pod křivkou nabídky.`,
        board: [line(`w_E\\cdot L_E=${cz(e.w)}\\cdot ${cz(e.L)}=${cz(bill)}`), line(`\\text{transfer}=\\frac{(w_0+w_E)\\,L_E}{2}=\\frac{(${cz(w0)}+${cz(e.w)})\\cdot ${cz(e.L)}}{2}=${cz(transfer)}`)] },
      { title: 'Ekonomická renta', text: 'Ekonomická renta je část mzdy, která přesahuje transferový výdělek. Každý pracovník dostane rovnovážnou mzdu, a kdo by pracoval i za méně, získá rentu. Celková renta je plocha mezi rovnovážnou mzdou a křivkou nabídky.',
        board: [line(`\\text{renta}=w_E L_E-\\text{transfer}=${cz(bill)}-${cz(transfer)}=${cz(rent)}`), line(`\\text{renta}=\\frac{(w_E-w_0)\\,L_E}{2}=${cz(rent)}`)] },
      { title: 'Graf', text: 'Plocha mezi vodorovnou čárou rovnovážné mzdy a křivkou nabídky je ekonomická renta. Plocha pod křivkou nabídky je transferový výdělek.', viz: graph },
      { title: 'Výsledek', text: `Hledaná hodnota je ${czText(val)}.`, board: [result(`${{ renta: '\\text{renta}', transfer: '\\text{transfer}', mzdy: 'w_E L_E' }[ask]}=${cz(val)}`)] },
    ],
  });
}

function genRenta(rng) {
  const g = genLw(rng);
  const ask = pick(rng, ['renta', 'transfer', 'mzdy']);
  return buildRenta({ a: g.a, b: g.b, c: g.c, d: g.d, ask });
}

// ---------- tabulky mezního produktu ----------
function mpList(rng, n, first, lo = 2, hi = 5) {
  for (let t = 0; t < 100; t++) {
    const mp = [first];
    for (let i = 1; i < n; i++) mp.push(mp[i - 1] - int(rng, lo, hi));
    if (mp[n - 1] >= 1) return mp;
  }
  return Array.from({ length: n }, (_, i) => first - 2 * i);
}
const cumulative = (mp) => mp.reduce((acc, x) => [...acc, acc[acc.length - 1] + x], [0]);

// ---------- typ: tabulka MP a MRP z celkového produktu ----------
function buildMrpTab({ tp, P }) {
  const n = tp.length - 1;
  const mp = tp.slice(1).map((t, i) => t - tp[i]);
  const mrp = mp.map((x) => P * x);
  return mk('mrp-tabulka', {
    data: { tp, P },
    task: `Firma na dokonale konkurenčním trhu prodává svůj výrobek za ${czText(P)} Kč za kus. Tabulka udává celkový produkt TP v kusech podle počtu pracovníků. Pro 1. až ${n}. pracovníka zapište do tabulky mezní produkt MP (v kusech) a příjem z mezního produktu MRP (v Kč). Každý řádek tabulky je jeden pracovník: první sloupec MP, druhý MRP.`,
    promptTex: tabTex([['L', ...Array.from({ length: n + 1 }, (_, i) => i)], ['TP', ...nums(tp)]]),
    answerSpec: { kind: 'table', value: mp.map((x, i) => [String(x), String(mrp[i])]) },
    conclusion: `MP: ${mp.map(czText).join('; ')}. MRP: ${mrp.map(czText).join('; ')} Kč.`,
    source: { chapter: 9, number: 8 },
    solution: [
      { title: 'Mezní produkt práce', text: 'Mezní produkt je přírůstek celkového produktu, který přinese další pracovník: $MP_L = TP(L) - TP(L-1)$.',
        board: mp.map((x, i) => line(`MP_{${i + 1}}=${cz(tp[i + 1])}-${cz(tp[i])}=${cz(x)}`)) },
      { title: 'Příjem z mezního produktu', text: `Příjem z mezního produktu je hodnota toho, co další pracovník vyrobí. Při dokonalé konkurenci je cena výrobku pro firmu daná, takže $MRP_L = P \\cdot MP_L$, tedy ${czText(P)} krát mezní produkt.`,
        board: mp.map((x, i) => line(`MRP_{${i + 1}}=${cz(P)}\\cdot ${cz(x)}=${cz(mrp[i])}`)) },
      { title: 'Výsledek', text: 'Mezní produkt s přibývajícími pracovníky klesá (zákon klesajících výnosů, ostatní vstupy jsou pevné), a klesá proto i MRP. Řádky tabulky vyplníme shora dolů.',
        board: [line(`MP:\\ ${nums(mp).join(',\\ ')}`), result(`MRP:\\ ${nums(mrp).join(',\\ ')}`)] },
    ],
  });
}

function genMrpTab(rng) {
  const n = int(rng, 4, 6);
  const mp = mpList(rng, n, int(rng, 14, 28));
  return buildMrpTab({ tp: cumulative(mp), P: pick(rng, [2, 4, 5, 10, 20, 25]) });
}

// ---------- typ: optimální počet pracovníků z tabulky ----------
function buildNajemTab({ given, start = 1, mp: mpIn, tp, P, w }) {
  const mp = given === 'tp' ? tp.slice(1).map((t, i) => t - tp[i]) : mpIn;
  const first = given === 'tp' ? 1 : start;
  const mrp = mp.map((x) => P * x);
  let k = 0; while (k < mrp.length && mrp[k] >= w) k++;
  const answer = first + k - 1;
  const tie = k > 0 && mrp[k - 1] === w;
  const workers = mp.map((_, i) => first + i);
  const prompt = given === 'tp'
    ? tabTex([['L', ...Array.from({ length: tp.length }, (_, i) => i)], ['TP', ...nums(tp)]])
    : tabTex([['L', ...workers.map(String)], ['MP_L', ...nums(mp)]]);
  return mk('najem-tabulka', {
    data: given === 'tp' ? { given, tp, P, w } : { given, start, mp, P, w },
    task: `Firma na dokonale konkurenčním trhu práce i výrobků prodává výrobek za ${czText(P)} Kč za kus a platí mzdu ${czText(w)} Kč za pracovníka. ${given === 'tp' ? 'Tabulka udává celkový produkt TP v kusech podle počtu pracovníků.' : 'Tabulka udává mezní produkt MP v kusech, který přinese pracovník s daným pořadím.'} Kolik pracovníků firma při maximalizaci zisku zaměstná?${given === 'mp' && first > 1 ? ' Odpovězte pořadovým číslem posledního pracovníka, kterého ještě najme.' : ''} (Při rovnosti MRP a mzdy je firma k poslednímu pracovníkovi lhostejná; počítejte s tím, že ho najme.)`,
    promptTex: prompt,
    answerSpec: { kind: 'number', value: answer },
    conclusion: `Firma zaměstná ${czText(answer)} pracovníků.`,
    source: { chapter: 9, number: given === 'tp' ? 2 : 1 },
    solution: [
      { title: given === 'tp' ? 'Mezní produkt z celkového produktu' : 'Mezní produkt', text: given === 'tp' ? 'Mezní produkt je přírůstek celkového produktu při přijetí dalšího pracovníka.' : 'Mezní produkt je v tabulce přímo dán. Vychází z něj hodnota, kterou každý další pracovník firmě přinese.',
        board: mp.map((x, i) => line(given === 'tp' ? `MP_{${workers[i]}}=${cz(tp[i + 1])}-${cz(tp[i])}=${cz(x)}` : `MP_{${workers[i]}}=${cz(x)}`)) },
      { title: 'Příjem z mezního produktu', text: `Příjem z mezního produktu je cena výrobku krát mezní produkt: $MRP_L = P \\cdot MP_L$ s cenou ${czText(P)} Kč. Je to příjem, který firmě další pracovník přinese.`,
        board: mp.map((x, i) => line(`MRP_{${workers[i]}}=${cz(P)}\\cdot ${cz(x)}=${cz(mrp[i])}`)) },
      { title: 'Porovnání s mzdou', text: `Další pracovník se vyplatí, pokud přinese víc, než stojí: $MRP \\geq w$ s mzdou ${czText(w)} Kč. Protože MRP s dalšími pracovníky klesá, firma najímá, dokud tato podmínka platí.${tie ? ' Poslední pracovník přinese právě tolik, kolik stojí, takže firma je k jeho najmutí lhostejná; zisk se nezmění.' : ''}`,
        board: mrp.map((x, i) => line(`${cz(x)}${x >= w ? '\\geq' : '<'}${cz(w)}\\ \\ (${workers[i]}.\\ \\text{pracovník}${x >= w ? '' : ':\\ \\text{nenajme}'})`)) },
      { title: 'Optimální počet pracovníků', text: k === 0 ? 'Už první pracovník přinese méně, než stojí, a firma proto nenajme nikoho.' : k === mrp.length ? `Všichni pracovníci z tabulky přinášejí aspoň tolik, kolik stojí, takže firma zaměstná ${czText(answer)} pracovníků.` : `Pracovník s pořadím ${czText(answer + 1)} už přinese méně, než stojí, a firmě by zisk snížil. Firma proto zaměstná ${czText(answer)} pracovníků.`,
        board: [result(`L^*=${cz(answer)}`)] },
    ],
  });
}

function genNajemTab(rng) {
  const given = pick(rng, ['mp', 'tp']);
  const n = int(rng, 5, 6);
  const mp = mpList(rng, n, int(rng, 14, 28));
  const P = pick(rng, [2, 4, 5, 8, 10]);
  const mrp = mp.map((x) => P * x);
  const k = int(rng, 1, n - 1);
  const w = int(rng, mrp[k] + 1, mrp[k - 1] - 1);
  if (given === 'tp') return buildNajemTab({ given, tp: cumulative(mp), P, w });
  return buildNajemTab({ given, start: pick(rng, [1, 10, 20, 30]), mp, P, w });
}

// ---------- typ: optimum z produkční funkce Q = aL − bL² ----------
const prodTex = (a, b) => `Q=${cz(a)}L-${b === 1 ? '' : cz(b)}L^2`;
function buildNajemFce({ a, b, P, w, ask }) {
  const L = (P * a - w) / (2 * b * P);
  const Q = a * L - b * L * L;
  const askL = ask === 'L';
  const mrpAt = P * (a - 2 * b * L);
  return mk('najem-funkce', {
    data: { a, b, P, w, ask },
    task: `Dokonale konkurenční firma má krátkodobou produkční funkci (Q je výstup v kusech, L počet pracovníků). Cena výrobku je ${czText(P)} Kč a mzdová sazba ${czText(w)} Kč. ${askL ? 'Určete optimální zaměstnanost.' : 'Určete výstup, který firma při optimální zaměstnanosti vyrobí.'}`,
    promptTex: prodTex(a, b),
    answerSpec: { kind: 'number', value: askL ? L : Q },
    conclusion: askL ? `Optimální zaměstnanost je ${czText(L)} pracovníků.` : `Při optimální zaměstnanosti ${czText(L)} pracovníků firma vyrobí ${czText(Q)} kusů.`,
    source: { chapter: 9, number: 3 },
    solution: [
      { title: 'Mezní produkt práce', text: 'Mezní produkt je přírůstek výstupu při dalším pracovníkovi. Pro produkční funkci ho dostaneme jako její první derivaci podle $L$: z členu $aL$ vznikne $a$, z členu $bL^2$ vznikne $2bL$.',
        board: [line(prodTex(a, b)), line(`MP_L=${cz(a)}-${cz(2 * b)}L`)] },
      { title: 'Příjem z mezního produktu', text: `Při dokonalé konkurenci vynásobíme mezní produkt cenou výrobku ${czText(P)} Kč.`,
        board: [line(`MRP_L=${cz(P)}\\cdot (${cz(a)}-${cz(2 * b)}L)=${cz(P * a)}-${cz(2 * b * P)}L`)] },
      { title: 'Podmínka optima MRP = w', text: `Firma najímá pracovníky, dokud další přinese tolik, kolik stojí. Položíme $MRP_L = w$ s mzdou ${czText(w)} Kč a vyřešíme rovnici pro $L$. Křivka MRP je klesající, takže jde o maximum zisku.`,
        board: [line(`${cz(P * a)}-${cz(2 * b * P)}L=${cz(w)}`), line(`${cz(2 * b * P)}L=${cz(P * a - w)}`), askL ? result(`L^*=\\frac{${cz(P * a - w)}}{${cz(2 * b * P)}}=${cz(L)}`) : line(`L^*=\\frac{${cz(P * a - w)}}{${cz(2 * b * P)}}=${cz(L)}`)] },
      { title: 'Kontrola', text: `V optimu je MRP rovno ${czText(mrpAt)} Kč, tedy mzdě. Tržby ${czText(P * Q)} Kč pokrývají i mzdové náklady ${czText(w * L)} Kč, takže zaměstnávat se vyplatí.`,
        board: [line(`MRP_L(${cz(L)})=${cz(mrpAt)}=w`), line(`P\\cdot Q=${cz(P * Q)}\\ \\geq\\ w\\cdot L=${cz(w * L)}`)] },
      { title: 'Výsledek', text: askL ? `Optimální zaměstnanost je ${czText(L)} pracovníků.` : `Dosadíme $L = ${czText(L)}$ do produkční funkce a dostaneme výstup ${czText(Q)} kusů.`,
        board: askL ? [result(`L^*=${cz(L)}`)] : [line(`Q=${cz(a)}\\cdot ${cz(L)}-${cz(b)}\\cdot ${cz(L)}^2`), result(`Q=${cz(Q)}`)] },
    ],
  });
}

function genNajemFce(rng) {
  for (let t = 0; t < 200; t++) {
    const b = pick(rng, [0.25, 0.5, 0.75, 1]);
    const L = 2 * int(rng, 3, 25); const P = pick(rng, [2, 4, 5, 8, 10]);
    const a = int(rng, 30, 100);
    const mp = a - 2 * b * L;
    if (mp < 4) continue;
    return buildNajemFce({ a, b, P, w: P * mp, ask: pick(rng, ['L', 'Q']) });
  }
  return buildNajemFce({ a: 50, b: 0.45, P: 10, w: 140, ask: 'L' });
}

// ---------- typ: MRP při klesající ceně výrobku (nedokonalá konkurence na trhu výrobků) ----------
function buildMonopolMrp({ tp, price, w }) {
  const n = price.length;
  const tr = tp.map((q, i) => (i === 0 ? 0 : q * price[i - 1]));
  const mrp = tr.slice(1).map((x, i) => x - tr[i]);
  const mp = tp.slice(1).map((q, i) => q - tp[i]);
  let k = 0; while (k < n && mrp[k] >= w) k++;
  return mk('mrp-monopol', {
    data: { tp, price, w },
    task: `Firma je jediným prodejcem svého výrobku, a proto musí k prodeji většího množství snižovat cenu (cena P v Kč za kus je v tabulce). Mzda je ${czText(w)} Kč za pracovníka a firma na trhu práce neovlivňuje mzdu. Kolik pracovníků firma při maximalizaci zisku zaměstná?`,
    promptTex: tabTex([['L', ...Array.from({ length: n + 1 }, (_, i) => i)], ['TP', ...nums(tp)], ['P', '\\cdot', ...nums(price)]]),
    answerSpec: { kind: 'number', value: k },
    conclusion: `Firma zaměstná ${czText(k)} pracovníků.`,
    source: { chapter: 9, number: 8 },
    solution: [
      { title: 'Celkový příjem', text: 'Příjem firmy je cena krát prodané množství. Protože cena s množstvím klesá, každá další jednotka přinese méně než cena, za kterou se prodá.',
        board: tr.slice(1).map((x, i) => line(`TR_{${i + 1}}=${cz(price[i])}\\cdot ${cz(tp[i + 1])}=${cz(x)}`)) },
      { title: 'Příjem z mezního produktu', text: 'Příjem z mezního produktu je přírůstek celkového příjmu, který přinese další pracovník: $MRP_L = MR \\cdot MP_L = \\Delta TR$. Je menší než $P \\cdot MP_L$, protože k prodeji dalších kusů musela firma snížit cenu všech kusů.',
        board: mrp.map((x, i) => line(`MRP_{${i + 1}}=${cz(tr[i + 1])}-${cz(tr[i])}=${cz(x)}\\ \\ (<${cz(price[i])}\\cdot ${cz(mp[i])})`)) },
      { title: 'Porovnání s mzdou', text: `Pracovníka firma najme, pokud $MRP \\geq w$ s mzdou ${czText(w)} Kč. MRP s přibývajícími pracovníky klesá (klesá mezní produkt i mezní příjem).`,
        board: mrp.map((x, i) => line(`${cz(x)}${x >= w ? '\\geq' : '<'}${cz(w)}`)) },
      { title: 'Optimální počet pracovníků', text: k === 0 ? 'Už první pracovník přinese méně, než stojí.' : `Najímá se do ${czText(k)}. pracovníka včetně, další by už stál víc, než přinese.`,
        board: [result(`L^*=${cz(k)}`)] },
    ],
  });
}

function genMonopolMrp(rng) {
  for (let t = 0; t < 300; t++) {
    const n = 5;
    const dq = [int(rng, 8, 14)]; for (let i = 1; i < n; i++) dq.push(Math.max(2, dq[i - 1] - int(rng, 1, 3)));
    const tp = cumulative(dq);
    const b = pick(rng, [1, 2]);
    const A = 2 * b * tp[n] + 5 * int(rng, 1, 6);
    const price = tp.slice(1).map((q) => A - b * q);
    const tr = tp.map((q, i) => (i === 0 ? 0 : q * price[i - 1]));
    const mrp = tr.slice(1).map((x, i) => x - tr[i]);
    if (!mrp.every((x, i) => i === 0 || x < mrp[i - 1]) || mrp[n - 1] < 5) continue;
    const k = int(rng, 1, n - 1);
    const lo = mrp[k] + 1; const hi = mrp[k - 1] - 1;
    if (lo > hi) continue;
    return buildMonopolMrp({ tp, price, w: int(rng, lo, hi) });
  }
  return buildMonopolMrp({ tp: [0, 10, 19, 27, 34, 40], price: [60, 58, 56, 54, 52], w: 300 });
}

// ---------- monopson: pomocné výpočty ----------
const monopsonEq = ({ A, B, C, D }) => {
  const LM = (A - C) / (B + 2 * D); const wM = C + D * LM;
  const LC = (A - C) / (B + D); const wC = C + D * LC;
  return { LM, wM, LC, wC, mrpM: A - B * LM };
};
function monopsonViz({ A, B, C, D }, extra = {}) {
  const m = monopsonEq({ A, B, C, D });
  return labViz({
    curves: [{ expr: `${A} - ${B}*x`, label: 'MRP', color: 'blue' }, invSup(C, D), { expr: `${C} + ${2 * D}*x`, label: 'MFC', color: 'green' }, ...(extra.curves || [])],
    points: extra.points || [{ x: m.LM, y: m.mrpM, label: 'A' }, { x: m.LM, y: m.wM, label: 'W', guides: true }, { x: m.LC, y: m.wC, label: 'E' }],
    xMax: (A / B) * 1.05, yMax: A * 1.05, alt: extra.alt || 'Monopsonie: MRP, nabídka práce a mezní náklady na práci',
  });
}

// ---------- typ: monopsonie z rovnic ----------
function buildMonopson({ A, B, C, D, ask }) {
  const m = monopsonEq({ A, B, C, D });
  const gap = m.mrpM - m.wM;
  const val = { L: m.LM, w: m.wM, mezera: gap }[ask];
  const what = { L: 'zaměstnanost, kterou monopsonista zvolí', w: 'mzdovou sazbu, kterou bude monopsonista platit', mezera: 'rozdíl mezi příjmem z mezního produktu a vyplácenou mzdou v jeho optimu (MRP minus w)' }[ask];
  return mk('monopson', {
    data: { A, B, C, D, ask },
    task: `Firma je jediným zaměstnavatelem v oblasti (monopsonista) a výrobek prodává za pevnou cenu. Příjem z mezního produktu práce je dán první rovnicí, nabídka práce v oblasti druhou (w je mzdová sazba, L počet pracovníků). Určete ${what}.`,
    promptTex: `MRP_L:\\ ${wlDem(A, B)},\\qquad ${wlSup(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Monopsonista zaměstná ${czText(m.LM)} pracovníků a zaplatí mzdu ${czText(m.wM)}; MRP je ${czText(m.mrpM)}, tedy o ${czText(gap)} víc než mzda. Při dokonalé konkurenci by bylo zaměstnáno ${czText(m.LC)} pracovníků za mzdu ${czText(m.wC)}.`,
    source: { chapter: '9.1', number: 3 },
    solution: [
      { title: 'Celkové náklady na práci', text: `Monopsonista musí zvýšit mzdu všem, když chce najmout dalšího pracovníka, protože čelí rostoucí nabídce práce. Celkové náklady na práci jsou $TC = w \\cdot L$ s mzdou z křivky nabídky.`,
        board: [line(`TC=w\\cdot L=(${C === 0 ? '' : `${cz(C)}+`}${coef(D, 'L')})\\,L=${C === 0 ? '' : `${cz(C)}L+`}${D === 1 ? '' : cz(D)}L^2`)] },
      { title: 'Mezní náklad na práci', text: 'Mezní náklad na práci MFC je přírůstek celkových nákladů při dalším pracovníkovi (derivace TC podle $L$). Je vyšší než mzda, protože zahrnuje i zvýšení mzdy všem dosavadním pracovníkům. Křivka MFC proto leží nad nabídkou a je dvakrát strmější.',
        board: [line(`MFC=${C === 0 ? '' : `${cz(C)}+`}${coef(2 * D, 'L')}`), line('MFC>w')] },
      { title: 'Podmínka optima MRP = MFC', text: 'Monopsonista najímá, dokud další pracovník přinese víc, než jeho zaměstnání celkově stojí, tedy do rovnosti MRP a MFC.',
        board: [line(`${cz(A)}-${coef(B, 'L')}=${C === 0 ? '' : `${cz(C)}+`}${coef(2 * D, 'L')}`), line(`${cz(A - C)}=${cz(B + 2 * D)}L`), ask === 'L' ? result(`L_M=${cz(m.LM)}`) : line(`L_M=${cz(m.LM)}`)] },
      { title: 'Mzda se bere z nabídky', text: `Mzdu monopsonista určí tak, aby práci právě nabídlo ${czText(m.LM)} lidí: dosadí se do křivky nabídky, a ne do MRP. Mzda je proto nižší než MRP.`,
        board: [line(`w_M=${C === 0 ? '' : `${cz(C)}+`}${cz(D)}\\cdot ${cz(m.LM)}`), ask === 'w' ? result(`w_M=${cz(m.wM)}`) : line(`w_M=${cz(m.wM)}`), line(`MRP(L_M)=${cz(A)}-${cz(B)}\\cdot ${cz(m.LM)}=${cz(m.mrpM)}`)] },
      { title: 'Srovnání s dokonalou konkurencí', text: `Při dokonalé konkurenci na trhu práce by se rovnováha určila z $MRP = w$: zaměstnanost ${czText(m.LC)} při mzdě ${czText(m.wC)}. Monopsonista zaměstná méně lidí a platí nižší mzdu.`,
        board: [line(`L_C=\\frac{${cz(A - C)}}{${cz(B + D)}}=${cz(m.LC)},\\quad w_C=${cz(m.wC)}`), ...(ask === 'mezera' ? [result(`MRP-w=${cz(m.mrpM)}-${cz(m.wM)}=${cz(gap)}`)] : [])] },
      { title: 'Graf', text: 'Bod A je průsečík MRP s MFC (určuje zaměstnanost). Svisle dolů na křivku nabídky najdeme mzdu (bod W). Bod E je rovnováha dokonalé konkurence, kde se kříží MRP a nabídka.', viz: monopsonViz({ A, B, C, D }) },
    ],
  });
}

function genMonopson(rng) {
  const B = int(rng, 1, 4); const D = int(rng, 1, 4); const LM = int(rng, 5, 25);
  const C = pick(rng, [10, 20, 30, 40]);
  return buildMonopson({ A: C + (2 * D + B) * LM, B, C, D, ask: pick(rng, ['L', 'w', 'mezera']) });
}

// ---------- typ: monopsonista a tabulka (MFC z celkových nákladů) ----------
function buildMonopsonTab({ L0, ws, mrp, ask }) {
  const n = ws.length;
  const Ls = ws.map((_, i) => L0 + i);
  const tc = ws.map((w, i) => w * Ls[i]);
  const mfc = tc.slice(1).map((x, i) => x - tc[i]);
  let k = 0; while (k < n - 1 && mrp[k + 1] >= mfc[k]) k++;
  const LOpt = Ls[k]; const wOpt = ws[k];
  const tie = k > 0 && mrp[k] === mfc[k - 1];
  const val = ask === 'L' ? LOpt : wOpt;
  return mk('monopson-tab', {
    data: { L0, ws, mrp, ask },
    task: `Firma je jediným zaměstnavatelem v oblasti. Tabulka ukazuje mzdu w, kterou musí zaplatit všem při daném počtu pracovníků L, a příjem z mezního produktu MRP. Firma už zaměstnává ${czText(L0)} pracovníků. Určete ${ask === 'L' ? 'optimální zaměstnanost' : 'mzdu, kterou při optimální zaměstnanosti zaplatí'}. (Při rovnosti MRP a MFC je firma lhostejná; počítejte s vyšším počtem.)`,
    promptTex: tabTex([['L', ...nums(Ls)], ['w', ...nums(ws)], ['MRP_L', ...nums(mrp)]]),
    answerSpec: { kind: 'number', value: val },
    conclusion: `Optimální zaměstnanost je ${czText(LOpt)} pracovníků a mzda ${czText(wOpt)}.`,
    source: { chapter: 9, number: 7 },
    solution: [
      { title: 'Celkové náklady na práci', text: 'Monopsonista platí stejnou mzdu všem pracovníkům, takže celkové náklady na práci jsou mzda krát počet pracovníků.',
        board: Ls.map((L, i) => line(`TC_{${L}}=${cz(ws[i])}\\cdot ${cz(L)}=${cz(tc[i])}`)) },
      { title: 'Mezní náklad na práci', text: 'Mezní náklad na práci MFC je přírůstek celkových nákladů při dalším pracovníkovi. Je vyšší než mzda, protože s dalším pracovníkem roste mzda všem.',
        board: mfc.map((x, i) => line(`MFC_{${Ls[i + 1]}}=${cz(tc[i + 1])}-${cz(tc[i])}=${cz(x)}\\ \\ (>w=${cz(ws[i + 1])})`)) },
      { title: 'Porovnání MRP a MFC', text: `Další pracovník se vyplatí, dokud $MRP \\geq MFC$. Porovnáváme s MFC, a ne s mzdou.${tie ? ' Při posledním pracovníkovi jsou obě veličiny stejné, firma je lhostejná a podle zadání ho najme.' : ''}`,
        board: mfc.map((x, i) => line(`L=${cz(Ls[i + 1])}:\\ MRP=${cz(mrp[i + 1])}${mrp[i + 1] >= x ? '\\geq' : '<'}MFC=${cz(x)}`)) },
      { title: 'Optimum', text: `Zaměstnat se vyplatí ${czText(LOpt)} pracovníků. Mzda se bere z tabulky při tomto počtu pracovníků a je ${czText(wOpt)}.`,
        board: [ask === 'L' ? result(`L^*=${cz(LOpt)}`) : line(`L^*=${cz(LOpt)}`), ask === 'L' ? line(`w=${cz(wOpt)}`) : result(`w=${cz(wOpt)}`)] },
    ],
  });
}

function genMonopsonTab(rng) {
  for (let t = 0; t < 300; t++) {
    const L0 = int(rng, 3, 12); const s = int(rng, 1, 3); const w0 = int(rng, 8, 20);
    const ws = Array.from({ length: 5 }, (_, i) => w0 + s * i);
    const mfc = [null, ...ws.slice(1).map((w, i) => w * (L0 + i + 1) - ws[i] * (L0 + i))];
    const k = int(rng, 1, 3);
    const mrp = Array(5).fill(0);
    mrp[k] = mfc[k] + int(rng, 4, 8); mrp[k + 1] = mfc[k + 1] - int(rng, 4, 8);
    for (let i = k - 1; i >= 0; i--) mrp[i] = mrp[i + 1] + int(rng, 2, 6);
    for (let i = k + 2; i < 5; i++) mrp[i] = mrp[i - 1] - int(rng, 2, 6);
    if (mrp.every((x, i) => i === 0 || x < mrp[i - 1]) && mrp.every((x) => x > 0)) return buildMonopsonTab({ L0, ws, mrp, ask: pick(rng, ['L', 'w']) });
  }
  return buildMonopsonTab({ L0: 62, ws: [7, 8, 9], mrp: [84, 78, 72], ask: 'L' });
}

// ---------- typ: minimální mzda na monopsonním trhu ----------
function empMonopsonFloor({ A, B, C, D, wmin }) {
  const m = monopsonEq({ A, B, C, D });
  if (wmin <= m.wM) return { L: m.LM, w: m.wM, zone: 'pod' };
  if (wmin <= m.wC) return { L: (wmin - C) / D, w: wmin, zone: 'pasmo' };
  return { L: (A - wmin) / B, w: wmin, zone: 'nad' };
}
function buildMinMonopson({ A, B, C, D, wmin }) {
  const m = monopsonEq({ A, B, C, D });
  const r = empMonopsonFloor({ A, B, C, D, wmin });
  const zoneText = {
    pod: `Minimální mzda ${czText(wmin)} není vyšší než mzda monopsonisty ${czText(m.wM)}, a nic tedy nemění.`,
    pasmo: `Minimální mzda ${czText(wmin)} leží mezi mzdou monopsonisty ${czText(m.wM)} a konkurenční mzdou ${czText(m.wC)}. Tam je mzda pro firmu pevná až do množství, které za ni lidé nabídnou, a MRP je v celé té oblasti nad mzdou. Firma proto najme tolik lidí, kolik za minimální mzdu práci nabídne.`,
    nad: `Minimální mzda ${czText(wmin)} je vyšší než konkurenční mzda ${czText(m.wC)}. Pak platí stejné pravidlo jako na konkurenčním trhu: firma najme jen tolik lidí, aby MRP bylo rovno minimální mzdě.`,
  }[r.zone];
  const graph = monopsonViz({ A, B, C, D }, {
    curves: [wageLine(wmin, 'wmin')],
    points: [{ x: m.LM, y: m.wM, label: 'W' }, { x: m.LC, y: m.wC, label: 'E' }, ...(r.zone === 'pod' ? [] : [{ x: r.L, y: r.w, label: 'F', guides: true }])],
    alt: 'Minimální mzda na monopsonním trhu práce',
  });
  return mk('min-mzda-monopson', {
    data: { A, B, C, D, wmin },
    task: `Firma je jediným zaměstnavatelem v oblasti (monopsonista). Příjem z mezního produktu práce je dán první rovnicí, nabídka práce druhou (w je mzdová sazba, L počet pracovníků). Stát stanoví minimální mzdu ${czText(wmin)}. Kolik pracovníků firma zaměstná?`,
    promptTex: `MRP_L:\\ ${wlDem(A, B)},\\qquad ${wlSup(C, D)}`,
    answerSpec: { kind: 'number', value: r.L },
    conclusion: `Firma zaměstná ${czText(r.L)} pracovníků (bez minimální mzdy ${czText(m.LM)}, při dokonalé konkurenci ${czText(m.LC)}).`,
    source: { chapter: '9.1', number: 3 },
    solution: [
      { title: 'Monopsonista bez zásahu', text: 'Nejdřív najdeme optimum monopsonisty z podmínky $MRP = MFC$, kde $MFC = C + 2DL$ je dvakrát strmější než nabídka. Mzdu dosadíme z nabídky.',
        board: [line(`${cz(A)}-${coef(B, 'L')}=${cz(C)}+${coef(2 * D, 'L')}`), line(`L_M=${cz(m.LM)},\\quad w_M=${cz(C)}+${cz(D)}\\cdot ${cz(m.LM)}=${cz(m.wM)}`)] },
      { title: 'Hranice pro minimální mzdu', text: `Pro srovnání spočteme konkurenční rovnováhu z $MRP = w$. Monopsonista platí mzdu ${czText(m.wM)}, na konkurenčním trhu by byla ${czText(m.wC)}. Účinek minimální mzdy závisí na tom, kam padne mezi tyto hodnoty.`,
        board: [line(`${cz(A)}-${coef(B, 'L')}=${cz(C)}+${coef(D, 'L')}`), line(`L_C=${cz(m.LC)},\\quad w_C=${cz(m.wC)}`)] },
      { title: 'Kam minimální mzda padne', text: zoneText,
        board: [line(`w_M=${cz(m.wM)}\\ \\ ${r.zone === 'pod' ? `\\geq\\ w_{min}=${cz(wmin)}` : r.zone === 'pasmo' ? `<\\ w_{min}=${cz(wmin)}\\ \\leq\\ w_C=${cz(m.wC)}` : `<\\ w_C=${cz(m.wC)}\\ <\\ w_{min}=${cz(wmin)}`}`)] },
      { title: 'Zaměstnanost', text: r.zone === 'pod' ? `Zaměstnanost zůstává ${czText(m.LM)}.` : r.zone === 'pasmo' ? `Minimální mzdu dosadíme do nabídky práce a dostaneme počet lidí, kteří za ni práci nabídnou: ${czText(r.L)}. Zaměstnanost se proti ${czText(m.LM)} zvýšila.` : `Minimální mzdu dosadíme do rovnice MRP: ${czText(r.L)} pracovníků. Zaměstnanost je nižší než bez regulace.`,
        board: [result(r.zone === 'pod' ? `L=${cz(m.LM)}` : r.zone === 'pasmo' ? `L=\\frac{${cz(wmin)}-${cz(C)}}{${cz(D)}}=${cz(r.L)}` : `L=\\frac{${cz(A)}-${cz(wmin)}}{${cz(B)}}=${cz(r.L)}`)] },
      { title: 'Graf', text: 'Čárkovaná minimální mzda mění tvar mezních nákladů na práci: do množství, které za ni lidé nabídnou, je mezní náklad roven minimální mzdě. Průsečík MRP s tímto novým mezním nákladem určuje zaměstnanost.', viz: graph },
    ],
  });
}

function genMinMonopson(rng) {
  for (let t = 0; t < 300; t++) {
    const B = int(rng, 1, 4); const D = int(rng, 1, 4); const LM = int(rng, 6, 24);
    const C = pick(rng, [10, 20, 30, 40]);
    const A = C + (2 * D + B) * LM;
    const m = monopsonEq({ A, B, C, D });
    const zone = pick(rng, ['pod', 'pasmo', 'pasmo', 'nad']);
    if (zone === 'pod') { const wmin = m.wM - int(rng, 1, Math.max(1, Math.floor(m.wM / 4))); if (wmin > 0) return buildMinMonopson({ A, B, C, D, wmin }); }
    if (zone === 'pasmo') {
      const lo = LM + 1; const hi = Math.ceil(m.LC) - 1;
      if (lo <= hi) return buildMinMonopson({ A, B, C, D, wmin: C + D * int(rng, lo, hi) });
    }
    if (zone === 'nad') {
      const hi = Math.ceil(m.LC) - 1;
      if (hi >= 2) return buildMinMonopson({ A, B, C, D, wmin: A - B * int(rng, Math.max(1, hi - 8), hi) });
    }
  }
  return buildMinMonopson({ A: 120, B: 2, C: 0, D: 2, wmin: 50 });
}

// ---------- typ: bilaterální monopol ----------
const bilat = ({ A, B, C, D }) => {
  const Lf = (A - C) / (B + 2 * D); const wf = C + D * Lf;
  const Lu = (A - C) / (2 * B + D); const wu = A - B * Lu;
  const rent = wu * Lu - C * Lu - (D * Lu * Lu) / 2;
  return { Lf, wf, Lu, wu, rent };
};
function buildBilat({ A, B, C, D, ask }) {
  const r = bilat({ A, B, C, D });
  const table = ask === 'tab';
  const graph = labViz({
    curves: [invDem(A, B), invSup(C, D), { expr: `${C} + ${2 * D}*x`, label: 'MFC', color: 'green' }, { expr: `${A} - ${2 * B}*x`, label: 'MRu', color: 'accent', dashed: true }],
    points: [{ x: r.Lf, y: r.wf, label: 'F', guides: true }, { x: r.Lu, y: r.wu, label: 'U', guides: true }],
    xMax: (A / B) * 1.05, yMax: A * 1.05, alt: 'Bilaterální monopol: požadavky firmy a odborů',
  });
  return mk('bilat', {
    data: { A, B, C, D, ask },
    task: `Na trhu práce stojí proti sobě jediný zaměstnavatel (monopsonista) a odbory jako jediný prodejce práce. Poptávka po práci (MRP) je dána první rovnicí a nabídka práce druhou. Firma si přeje zaměstnanost a mzdu optimální pro monopsonistu, odbory chtějí maximalizovat ekonomickou rentu pracovníků. ${table ? 'Do tabulky zapište čtyři čísla v tomto pořadí: zaměstnanost požadovaná firmou, mzda požadovaná firmou, zaměstnanost požadovaná odbory, mzda požadovaná odbory.' : 'Určete ekonomickou rentu, kterou odbory dosáhnou, když firma vyhoví jejich požadavku.'}`,
    promptTex: `${wlDem(A, B)},\\qquad ${wlSup(C, D)}`,
    answerSpec: table ? { kind: 'table', value: [[r.Lf, r.wf, r.Lu, r.wu].map(String)] } : { kind: 'number', value: r.rent },
    conclusion: table
      ? `Firma chce ${czText(r.Lf)} pracovníků za mzdu ${czText(r.wf)}, odbory ${czText(r.Lu)} pracovníků za mzdu ${czText(r.wu)}.`
      : `Ekonomická renta při požadavcích odborů je ${czText(r.rent)}.`,
    source: { chapter: '9.1', number: 3 },
    solution: [
      { title: 'Požadavek firmy (monopsonista)', text: 'Firma jako jediný kupující práce hledá zaměstnanost z podmínky $MRP = MFC$, kde mezní náklad $MFC = C + 2DL$ je dvakrát strmější než nabídka. Mzdu platí z křivky nabídky.',
        board: [line(`${cz(A)}-${coef(B, 'L')}=${cz(C)}+${coef(2 * D, 'L')}`), line(`L_f=${cz(r.Lf)},\\quad w_f=${cz(C)}+${cz(D)}\\cdot ${cz(r.Lf)}=${cz(r.wf)}`)] },
      { title: 'Požadavek odborů (jediný prodejce práce)', text: 'Odbory se chovají jako monopol na straně nabídky. Firma zaměstná tolik lidí, kolik odpovídá křivce poptávky při mzdě, kterou odbory vyjednají. Odbory proto maximalizují rentu podél poptávky. Mezní příjem odborů z poptávky $w = A - BL$ je $MR_u = A - 2BL$ a mezní cena, kterou je třeba obětovat, je nabídka (transferový výdělek dalšího pracovníka). Optimum je tam, kde se tyto dvě veličiny rovnají.',
        board: [line(`${cz(A)}-${coef(2 * B, 'L')}=${cz(C)}+${coef(D, 'L')}`), line(`L_u=${cz(r.Lu)},\\quad w_u=${cz(A)}-${cz(B)}\\cdot ${cz(r.Lu)}=${cz(r.wu)}`)] },
      { title: 'Ekonomická renta odborů', text: 'Renta je celková mzda minus transferový výdělek. Celková mzda je mzda krát zaměstnanost, transferový výdělek je plocha pod křivkou nabídky do zaměstnanosti $L_u$.',
        board: [line(`\\text{mzdy}=${cz(r.wu)}\\cdot ${cz(r.Lu)}=${cz(r.wu * r.Lu)}`), line(`\\text{transfer}=${cz(C)}\\cdot ${cz(r.Lu)}+\\frac{${cz(D)}\\cdot ${cz(r.Lu)}^2}{2}=${cz(C * r.Lu + (D * r.Lu * r.Lu) / 2)}`), line(`\\text{renta}=${cz(r.rent)}`)] },
      { title: 'Graf', text: 'Bod F je optimum firmy, bod U požadavek odborů. Mzda leží na nabídce u firmy a na poptávce u odborů. Konečná dohoda není jednoznačně určena, protože záleží na vyjednávací síle stran.', viz: graph },
      { title: 'Výsledek', text: table ? `Firma požaduje zaměstnanost ${czText(r.Lf)} a mzdu ${czText(r.wf)}, odbory zaměstnanost ${czText(r.Lu)} a mzdu ${czText(r.wu)}.` : `Ekonomická renta je ${czText(r.rent)}.`,
        board: [table ? result(`(L_f,w_f,L_u,w_u)=(${cz(r.Lf)},\\ ${cz(r.wf)},\\ ${cz(r.Lu)},\\ ${cz(r.wu)})`) : result(`\\text{renta}=${cz(r.rent)}`)] },
    ],
  });
}

function genBilat(rng) {
  const B = int(rng, 1, 4); const D = rng() < 0.5 ? B : int(rng, 1, 4);
  const t = int(rng, 1, 3);
  const C = pick(rng, [0, 0, 10, 20, 30]);
  return buildBilat({ A: C + t * (B + 2 * D) * (2 * B + D), B, C, D, ask: pick(rng, ['tab', 'renta']) });
}

// ---------- typ: substituční a důchodový efekt ----------
const SD_OPTIONS = {
  prevazuje: [{ id: 'SE', text: 'Převažuje substituční efekt' }, { id: 'IE', text: 'Převažuje důchodový efekt' }, { id: 'rov', text: 'Efekty se právě vyrovnají' }],
  ktery: [{ id: 'SE', text: 'Substituční efekt' }, { id: 'IE', text: 'Důchodový efekt' }, { id: 'rov', text: 'Žádný z nich' }],
};
const SD_ITEMS = [
  { id: 'kaucuk', kind: 'prevazuje', text: 'Domorodí sběrači kaučuku se nechají najmout při mzdě 1 až 1,5 USD za hodinu. Jakmile mzda dosáhne 2 USD za hodinu, jejich zájem o práci klesne. Vysvětluje to lenost, nebo se dá najít ekonomické vysvětlení? Který efekt při mzdě kolem 2 USD převažuje?', answer: 'IE',
    why: 'Při vyšší mzdě si sběrači vydělají dost i při menším počtu hodin a část zvýšeného důchodu využijí na volný čas, který je normální statek. Důchodový efekt převáží, a proto nabízejí méně práce. Nejde o lenost, ale o racionální rozhodnutí.' },
  { id: 'zacatek', kind: 'ktery', text: 'Který efekt způsobuje, že při růstu mzdy lidé nahrazují volný čas prací, protože volný čas je dražší (je za něj obětována vyšší mzda)?', answer: 'SE',
    why: 'Mzda je cenou volného času: čím je vyšší, tím víc stojí odpočinek, a lidé proto práci nahrazují volný čas. To je substituční efekt.' },
  { id: 'duchod', kind: 'ktery', text: 'Který efekt způsobuje, že při růstu mzdy si člověk může dovolit víc spotřeby i víc volného času, a proto práci nabízí méně?', answer: 'IE',
    why: 'Vyšší mzda zvyšuje reálný důchod. Z vyššího důchodu si lidé kupují normální statky včetně volného času, takže nabízená práce klesá. To je důchodový efekt.' },
  { id: 'nizka', kind: 'prevazuje', text: 'Student při nízké mzdě odpracuje měsíčně 20 hodin. Když se mzda zvýší, přidá a odpracuje 40 hodin. Který efekt převažuje?', answer: 'SE',
    why: 'Nabízené množství práce roste s mzdou, a to je projev převahy substitučního efektu: práce se vyplatí víc než volný čas.' },
];
const sdById = (id) => SD_ITEMS.find((x) => x.id === id) ?? SD_ITEMS[0];
const SD_WORD = { SE: 'substituční', IE: 'důchodový', rov: 'oba efekty se právě vyrovnají' };

function backwardViz() {
  // Zpětně zakřivená křivka: dvě větve téže paraboly ležící na boku, w = 60 ± 15·√(16 − L).
  return {
    kind: 'econ',
    data: {
      axes: { x: 'L', y: 'w' }, domain: [0, 20], range: [0, 120],
      curves: [
        { expr: '60 - 15*sqrt(16 - x)', label: 'SE > IE', color: 'chalk', domain: [0, 16] },
        { expr: '60 + 15*sqrt(16 - x)', label: 'IE > SE', color: 'chalk', domain: [4, 16] },
      ],
      points: [{ x: 16, y: 60, label: 'w1', guides: true }], arrows: [], areas: [], alt: 'Zpětně zakřivená individuální nabídka práce',
    },
  };
}

function buildSubstDochod(p) {
  if (p.id === 'cisla') {
    const { w0, w1, h0, h1 } = p;
    const ans = h1 > h0 ? 'SE' : h1 < h0 ? 'IE' : 'rov';
    return mk('subst-dochod', {
      data: { id: 'cisla', w0, w1, h0, h1 },
      task: `Při mzdě ${czText(w0)} Kč za hodinu nabízí pracovník týdně ${czText(h0)} hodin práce. Po zvýšení mzdy na ${czText(w1)} Kč za hodinu nabízí ${czText(h1)} hodin týdně. Který efekt změny mzdy převažuje?`,
      answerSpec: { kind: 'choice', value: ans, options: SD_OPTIONS.prevazuje },
      conclusion: ans === 'rov' ? 'Efekty se právě vyrovnají.' : `Převažuje ${SD_WORD[ans]} efekt.`,
      solution: [
        { title: 'Co se stalo', text: `Mzda vzrostla z ${czText(w0)} na ${czText(w1)} Kč, nabízené množství práce se změnilo z ${czText(h0)} na ${czText(h1)} hodin. Změnu nabízeného množství práce vysvětlují dva protichůdné efekty.`,
          board: [line(`w:\\ ${cz(w0)}\\to ${cz(w1)},\\quad L:\\ ${cz(h0)}\\to ${cz(h1)}`)] },
        { title: 'Dva efekty změny mzdy', text: 'Substituční efekt: vyšší mzda zdražuje volný čas, a lidé proto práci nahrazují volný čas, nabízené množství práce roste. Důchodový efekt: vyšší mzda zvyšuje reálný důchod a lidé si kupují víc normálních statků včetně volného času, nabízené množství práce klesá.',
          board: [line('SE:\\ w\\uparrow\\Rightarrow L\\uparrow'), line('IE:\\ w\\uparrow\\Rightarrow L\\downarrow')] },
        { title: 'Který převládá', text: h1 > h0 ? 'Práce přibyla, takže silnější je substituční efekt.' : h1 < h0 ? 'Práce ubylo, takže silnější je důchodový efekt (individuální nabídka je v této oblasti zpětně zakřivená).' : 'Nabízené množství práce se nezměnilo, takže se oba efekty právě vyrovnaly.',
          board: [line(h1 > h0 ? '\\Delta L>0\\Rightarrow SE>IE' : h1 < h0 ? '\\Delta L<0\\Rightarrow IE>SE' : '\\Delta L=0\\Rightarrow SE=IE')] },
        { title: 'Graf individuální nabídky', text: 'Při nízkých mzdách převažuje substituční efekt a křivka roste. Od určité mzdy převáží důchodový efekt a křivka se zpětně zakřiví.', viz: backwardViz() },
        { title: 'Závěr', text: ans === 'rov' ? 'Efekty se právě vyrovnají.' : `Převažuje ${SD_WORD[ans]} efekt.`, board: [result(ans === 'rov' ? 'SE=IE' : ans === 'SE' ? 'SE>IE' : 'IE>SE')] },
      ],
    });
  }
  const it = sdById(p.id);
  return mk('subst-dochod', {
    data: { id: it.id },
    task: it.text,
    answerSpec: { kind: 'choice', value: it.answer, options: SD_OPTIONS[it.kind] },
    conclusion: it.why,
    source: it.id === 'kaucuk' ? { chapter: 9, number: 5 } : undefined,
    solution: [
      { title: 'Oba efekty změny mzdy', text: 'Mzda je cena volného času. Substituční efekt: vyšší mzda zdražuje volný čas, lidé ho nahrazují prací a nabízené množství práce roste. Důchodový efekt: vyšší mzda zvyšuje reálný důchod, lidé chtějí víc volného času a nabízené množství práce klesá.',
        board: [line('SE:\\ w\\uparrow\\Rightarrow L\\uparrow'), line('IE:\\ w\\uparrow\\Rightarrow L\\downarrow')] },
      { title: 'Zdůvodnění', text: it.why, board: [line(it.answer === 'SE' ? '\\text{nahrazení volného času prací}' : '\\text{víc volného času z vyššího důchodu}')] },
      { title: 'Graf individuální nabídky', text: 'Individuální nabídka práce roste, dokud převažuje substituční efekt. Od určité mzdy převáží důchodový efekt a křivka se zpětně zakřiví.', viz: backwardViz() },
      { title: 'Závěr', text: `Správně: ${SD_WORD[it.answer]} efekt.`, board: [result(it.answer === 'SE' ? '\\text{substituční efekt}' : '\\text{důchodový efekt}')] },
    ],
  });
}

function genSubstDochod(rng) {
  if (rng() < 0.6) {
    const w0 = pick(rng, [60, 80, 100, 120, 150]); const w1 = w0 + pick(rng, [20, 30, 40, 50]);
    const h0 = pick(rng, [20, 24, 30, 36, 40]); const kind = pick(rng, ['up', 'down', 'down', 'same']);
    const h1 = kind === 'up' ? h0 + pick(rng, [4, 6, 8]) : kind === 'down' ? h0 - pick(rng, [4, 6, 8]) : h0;
    return buildSubstDochod({ id: 'cisla', w0, w1, h0, h1 });
  }
  return buildSubstDochod({ id: pick(rng, ids(SD_ITEMS)) });
}

// ---------- typ: co posunulo křivku poptávky po práci nebo nabídky práce ----------
const LAB_EVENTS = [
  { id: 'cena-up', text: 'Cena výrobku, který firmy v odvětví vyrábějí, vzrostla.', ans: 'DL+', why: 'Poptávka po práci je odvozená z poptávky po výrobku. Vyšší cena zvyšuje příjem z mezního produktu $MRP = P \\cdot MP$, a firmy proto při každé mzdě najmou víc lidí.' },
  { id: 'produktivita', text: 'Vlivem nové technologie a školení vzrostla produktivita práce (mezní produkt práce).', ans: 'DL+', why: 'Vyšší mezní produkt zvyšuje příjem z mezního produktu při každé mzdě, a poptávka po práci proto roste.' },
  { id: 'cena-down', text: 'Cena výrobku, který firmy v odvětví vyrábějí, klesla.', ans: 'DL-', why: 'Nižší cena snižuje příjem z mezního produktu $MRP = P \\cdot MP$, a firmy proto při každé mzdě najmou méně lidí.' },
  { id: 'poptavka-vyrobek', text: 'Spotřebitelé se přestali zajímat o výrobky tohoto odvětví a poptávka po nich klesla.', ans: 'DL-', why: 'Poptávka po práci je odvozená z poptávky po výrobku. Klesne-li cena i prodej výrobků, klesá MRP a poptávka po práci.' },
  { id: 'imigrace', text: 'Do oboru přišla vlna imigrantů s potřebnou kvalifikací.', ans: 'SL+', why: 'Víc lidí je ochotno pracovat v oboru při každé mzdě, a nabídka práce proto roste.' },
  { id: 'absolventi', text: 'Vznikl nový studijní program a počet kvalifikovaných lidí v oboru vzrostl.', ans: 'SL+', why: 'Víc lidí je schopno práci vykonávat a nabízet při každé mzdě, a nabídka práce proto roste.' },
  { id: 'duchod', text: 'Silné ročníky kvalifikovaných pracovníků odešly do důchodu.', ans: 'SL-', why: 'Počet lidí, kteří nabízejí práci při každé mzdě, klesl, a nabídka práce proto klesá.' },
  { id: 'jiny-obor', text: 'V příbuzném oboru vzrostly mzdy a část kvalifikovaných pracovníků tam přešla.', ans: 'SL-', why: 'Alternativní příležitosti jsou lepší. V tomto oboru nabízí při každé mzdě práci méně lidí, a nabídka práce proto klesá.' },
  { id: 'min-mzda', text: 'Zákon zvýšil minimální mzdu nad rovnovážnou úroveň.', ans: 'pohyb', why: 'Mzda je na svislé ose a změna mzdy vede k pohybu po křivkách, nikoli k jejich posunu. Poptávané množství práce klesne a nabízené vzroste. Křivky zůstávají na místě.' },
];
const labEvById = (id) => LAB_EVENTS.find((e) => e.id === id) ?? LAB_EVENTS[0];
const LAB_OPTIONS = [
  { id: 'DL+', text: 'Poptávka po práci vzroste (křivka DL se posune doprava)' },
  { id: 'DL-', text: 'Poptávka po práci klesne (křivka DL se posune doleva)' },
  { id: 'SL+', text: 'Nabídka práce vzroste (křivka SL se posune doprava)' },
  { id: 'SL-', text: 'Nabídka práce klesne (křivka SL se posune doleva)' },
  { id: 'pohyb', text: 'Křivky se neposunou, jde o pohyb po křivkách' },
];
const LAB_BASE = { A: 110, B: 2, C: 20, D: 1 }; // wE = 50, LE = 30
const LAB_SHIFT = { 'DL+': { ...LAB_BASE, A: 140 }, 'DL-': { ...LAB_BASE, A: 80 }, 'SL+': { ...LAB_BASE, C: -10 }, 'SL-': { ...LAB_BASE, C: 50 } };
const labEq = ({ A, B, C, D }) => { const L = (A - C) / (B + D); return { L, w: A - B * L }; };
const LAB_OUTCOME = {
  'DL+': ['mzda roste, zaměstnanost roste', 'w\\uparrow,\\ L\\uparrow'], 'DL-': ['mzda klesá, zaměstnanost klesá', 'w\\downarrow,\\ L\\downarrow'],
  'SL+': ['mzda klesá, zaměstnanost roste', 'w\\downarrow,\\ L\\uparrow'], 'SL-': ['mzda roste, zaměstnanost klesá', 'w\\uparrow,\\ L\\downarrow'],
};
function labShiftViz(ev) {
  const e0 = labEq(LAB_BASE);
  const common = { xMax: 110, yMax: 120 };
  if (ev.ans === 'pohyb') {
    return { e0, e1: null, viz: labViz({ ...common, curves: [invDem(LAB_BASE.A, LAB_BASE.B), invSup(LAB_BASE.C, LAB_BASE.D), wageLine(70, 'wmin')],
      points: [{ x: e0.L, y: e0.w, label: 'E' }, { x: 20, y: 70, label: 'A', guides: true }, { x: 50, y: 70, label: 'B', guides: true }], alt: 'Pohyb po křivkách při minimální mzdě' }) };
  }
  const m = LAB_SHIFT[ev.ans]; const e1 = labEq(m);
  const demand = ev.ans[0] === 'D';
  const curves = demand
    ? [{ ...invDem(LAB_BASE.A, LAB_BASE.B), label: 'DL0' }, invSup(LAB_BASE.C, LAB_BASE.D), { ...invDem(m.A, m.B), label: 'DL1', color: 'accent', dashed: true }]
    : [invDem(LAB_BASE.A, LAB_BASE.B), { ...invSup(LAB_BASE.C, LAB_BASE.D), label: 'SL0' }, { ...invSup(m.C, m.D), label: 'SL1', color: 'accent', dashed: true }];
  return { e0, e1, viz: labViz({ ...common, curves, points: [{ x: e0.L, y: e0.w, label: 'E0' }, { x: e1.L, y: e1.w, label: 'E1' }], alt: `Posun křivky ${demand ? 'poptávky po práci' : 'nabídky práce'}` }) };
}

function buildVyber({ id }) {
  const ev = labEvById(id);
  const { e0, e1, viz } = labShiftViz(ev);
  const move = ev.ans === 'pohyb';
  const demand = ev.ans[0] === 'D';
  return mk('vyber-posun', {
    data: { id: ev.id, ans: ev.ans },
    task: `Na trhu práce jedné profese nastala změna: „${ev.text}“ Co se stane s křivkami poptávky po práci a nabídky práce?`,
    answerSpec: { kind: 'choice', value: ev.ans, options: LAB_OPTIONS },
    conclusion: move ? 'Křivky se neposunou, jde o pohyb po nich.' : `${demand ? 'Poptávka po práci' : 'Nabídka práce'} ${ev.ans.endsWith('+') ? 'vzroste' : 'klesne'}.`,
    solution: [
      { title: 'Kterou stranu trhu změna týká?', text: ev.why,
        board: [line(move ? 'w\\ \\text{na ose}\\Rightarrow\\ \\text{pohyb po křivce}' : demand ? '\\text{firmy}\\ \\Rightarrow\\ D_L' : '\\text{pracovníci}\\ \\Rightarrow\\ S_L')] },
      { title: move ? 'Co se děje s množstvím' : 'Jakým směrem se křivka posune?', text: move ? 'Poptávané množství práce klesá po křivce poptávky (nahoru doleva), nabízené roste po křivce nabídky. Obě křivky zůstávají na místě.' : `Při každé mzdě se ${demand ? 'poptává' : 'nabízí'} ${ev.ans.endsWith('+') ? 'víc' : 'méně'} práce, a křivka se proto posune ${ev.ans.endsWith('+') ? 'doprava' : 'doleva'}.`,
        board: [line(move ? 'L_D\\downarrow,\\ L_S\\uparrow' : `${demand ? 'D' : 'S'}_{L0}\\to ${demand ? 'D' : 'S'}_{L1}\\quad (${ev.ans.endsWith('+') ? '\\rightarrow' : '\\leftarrow'})`)] },
      { title: 'Graf', text: move ? 'Při mzdě nad rovnováhou (čárkovaně) firmy poptávají méně lidí (bod A) než jich práci nabízí (bod B). Křivky se nepohnou.'
        : `Původní křivka je plná, nová čárkovaná. Rovnováha se přesune z E0 (mzda ${czText(e0.w)}, zaměstnanost ${czText(e0.L)}) do E1 (mzda ${czText(e1.w)}, zaměstnanost ${czText(e1.L)}).`, viz },
      { title: 'Závěr', text: move ? 'Správně: jde o pohyb po křivkách, žádná se neposune.' : `Správně: ${demand ? 'poptávka po práci' : 'nabídka práce'} ${ev.ans.endsWith('+') ? 'vzroste' : 'klesne'}. Nová rovnováha: ${LAB_OUTCOME[ev.ans][0]}.`,
        board: [result(move ? '\\text{pohyb po křivkách}' : LAB_OUTCOME[ev.ans][1])] },
    ],
  });
}

// ---------- typ: pravda, nebo nepravda ----------
const STATEMENTS = [
  { id: 'kn-9a', text: 'Nutnou podmínkou maximalizace zisku firmy při nájmu práce v podmínkách dokonalé konkurence je rovnost MRP = MFC = w.', truth: true, why: 'Dokonale konkurenční firma mzdu neovlivní, a mezní náklad na práci se proto rovná mzdě. Dokud je MRP vyšší, další pracovník zisk zvyšuje. Rovnost je nutná podmínka (MRP musí být v tomto bodě klesající).' },
  { id: 'kn-9b', text: 'Zvyšování nabízeného množství práce na úkor volného času označujeme jako důchodový efekt.', truth: false, why: 'Nahrazování volného času prací při růstu mzdy je substituční efekt. Důchodový efekt působí opačně: s vyšším důchodem lidé chtějí víc volného času.' },
  { id: 'kn-9c', text: 'V dokonalé konkurenci na trhu práce se rovnovážná mzdová sazba rovná příjmu z mezního produktu práce.', truth: true, why: 'Každá firma najímá do bodu MRP = w, a při rovnovážné mzdě se tedy mzda rovná MRP.' },
  { id: 'kn-9d', text: 'Záporná směrnice křivky MRP je v podmínkách dokonalé konkurence dána zákonem klesajících výnosů.', truth: true, why: 'Při pevném množství ostatních vstupů klesá mezní produkt práce, a při konstantní ceně výrobku klesá i MRP = P · MP.' },
  { id: 'kn-9e', text: 'Je-li firma monopolem na trhu výrobků, klesá její křivka poptávky po práci i při konstantním mezním produktu.', truth: true, why: 'MRP = MR · MP. Mezní příjem monopolu s množstvím klesá, takže MRP klesá i při konstantním MP.' },
  { id: 'kn-9f', text: 'Situaci, kdy práci najímá mnoho firem, z nichž žádná nemůže ovlivnit mzdovou sazbu, nazýváme monopsonní konkurence.', truth: false, why: 'Jde o dokonalou konkurenci na trhu práce (firmy jsou příjemci mzdy). Monopsonie je opačný případ: jediný zaměstnavatel, který mzdu ovlivní.' },
  { id: 'kn-9g', text: 'Poptávka jednotlivé firmy po práci je určena příjmem z mezního produktu práce.', truth: true, why: 'Firma je ochotna zaplatit nejvýše tolik, kolik jí další pracovník přinese. Křivka MRP (její klesající část) proto vyjadřuje poptávku firmy po práci.' },
  { id: 'kn-9i', text: 'Elasticita poptávky po práci udává, o kolik procent se změní poptávané množství práce při změně mzdové sazby o jedno procento.', truth: true, why: 'Je to obecná definice cenové elasticity, v níž cenou je mzda.' },
  { id: 'kn-9j', text: 'Minimální částka potřebná k tomu, aby pracovník nabídl práci, se označuje jako transferový výdělek.', truth: true, why: 'Transferový výdělek je nejnižší odměna, za kterou ještě pracovník práci nabídne. Rozdíl mezi mzdou a transferovým výdělkem je ekonomická renta.' },
  { id: 'kn91-a', text: 'V situaci monopsonu platí, že mezní náklady na výrobní faktor jsou menší než mzdová sazba.', truth: false, why: 'Monopsonista musí s každým dalším pracovníkem zvýšit mzdu všem, a mezní náklad na práci je proto vyšší než mzda.' },
  { id: 'kn91-b', text: 'Aby byly odbory úspěšné při vyjednávání o mzdách, musí mít kontrolu nad poptávkou po práci.', truth: false, why: 'Odbory zastupují prodejce práce, a musí proto mít kontrolu nad nabídkou práce (kdo smí pracovat, kdo stávkuje).' },
  { id: 'kn91-c', text: 'Odbory nemohou mít libovolný počet členů z důvodu omezení v podobě tržní poptávky po práci pracovníků organizovaných v odborech.', truth: true, why: 'Při vyšší mzdě firmy poptávají méně práce, a zaměstnat se tak vejde jen omezený počet členů.' },
  { id: 'kn91-d', text: 'Ekonomická renta je část mzdy, která přesahuje transferový výdělek.', truth: true, why: 'Renta je rozdíl mezi skutečnou mzdou a nejnižší odměnou, za kterou by pracovník ještě práci nabídl.' },
  { id: 'kn91-e', text: 'Zaručená minimální mzda může vést k podněcování nelegální zaměstnanosti.', truth: true, why: 'Nad rovnováhou je práce nabízeno víc než poptáváno. Část lidí bez práce a část firem pak mohou hledat obejití zákona, například práci načerno za nižší mzdu.' },
  { id: 'kn91-f', text: 'Prosadí-li odbory na dokonale konkurenčním trhu práce mzdu nad rovnovážnou úrovní, zaměstnanost za jinak stejných podmínek klesne.', truth: true, why: 'Při vyšší mzdě firmy poptávají méně práce (pohyb po křivce poptávky), a zaměstnanost proto klesá.' },
  { id: 'kn91-g', text: 'K omezování nabídky práce mohou odbory využívat například administrativní kroky, které zjednodušují podmínky vstupu do oboru.', truth: false, why: 'Zjednodušení vstupu nabídku práce zvyšuje. Nabídku omezují naopak přísné podmínky vstupu (licence, kvalifikační požadavky).' },
  { id: 'kn91-h', text: 'Podpora růstu produktivity práce ze strany odborů může umožnit růst mezd bez poklesu zaměstnanosti.', truth: true, why: 'Vyšší produktivita zvyšuje MRP a posouvá poptávku po práci doprava, takže vyšší mzda je s nezměněnou zaměstnaností slučitelná.' },
  { id: 'kn91-i', text: 'Stávka je skupinové rozhodnutí o odmítnutí prodat práci.', truth: true, why: 'Stávka je kolektivní odmítnutí nabídky práce, nástroj odborů ke zvýšení vyjednávací síly.' },
  { id: 'kn91-j', text: 'Kolektivní vyjednávání je vyjednávání o pracovních podmínkách mezi odborovými svazy a zaměstnanci.', truth: false, why: 'Odbory zastupují zaměstnance a vyjednávají se zaměstnavateli, nikoli se zaměstnanci.' },
  { id: 'own-1', text: 'Minimální mzda stanovená pod rovnovážnou mzdou nemá na dokonale konkurenčním trhu práce žádný účinek.', truth: true, why: 'Trh se ustálí na rovnovážné mzdě i bez zákona, a ta je vyšší než minimální mzda, takže zákon nic neomezuje.' },
  { id: 'own-2', text: 'Minimální mzda stanovená nad rovnovážnou mzdou vede na dokonale konkurenčním trhu práce k nedobrovolné nezaměstnanosti.', truth: true, why: 'Firmy poptávají méně práce, než jí lidé při této mzdě nabízejí, a rozdíl tvoří nedobrovolně nezaměstnaní.' },
  { id: 'own-3', text: 'Na monopsonním trhu práce může minimální mzda v určitém rozmezí zaměstnanost zvýšit.', truth: true, why: 'Monopsonista drží mzdu i zaměstnanost pod konkurenční úrovní. Minimální mzda mezi jeho mzdou a konkurenční mzdou ho přiměje najmout víc lidí, protože mezní náklad práce je pak pevná mzda.' },
  { id: 'own-4', text: 'Monopsonista platí mzdu rovnou příjmu z mezního produktu práce.', truth: false, why: 'Mzda se bere z křivky nabídky práce a je nižší než MRP. V optimu se s MRP rovná mezní náklad na práci, nikoli mzda.' },
  { id: 'own-5', text: 'Monopsonista zaměstná při stejné poptávce po práci (MRP) a stejné nabídce práce méně pracovníků než firmy na dokonale konkurenčním trhu práce.', truth: true, why: 'Monopsonista se řídí podmínkou MRP = MFC, kde MFC leží nad nabídkou, a proto zaměstná méně lidí a platí nižší mzdu.' },
  { id: 'own-6', text: 'Růst ceny výrobku posune křivku poptávky po práci doprava.', truth: true, why: 'MRP = P · MP, takže vyšší cena zvyšuje příjem z mezního produktu při každé mzdě.' },
  { id: 'own-7', text: 'Růst mzdové sazby posune křivku poptávky po práci doleva.', truth: false, why: 'Mzda je na svislé ose. Její změna znamená pohyb po křivce, nikoli posun křivky.' },
  { id: 'own-8', text: 'Individuální nabídka práce může být zpětně zakřivená, protože při vysoké mzdě může převážit důchodový efekt.', truth: true, why: 'Od určité mzdy převáží poptávka po volném čase z vyššího důchodu a nabízené množství práce klesá.' },
  { id: 'own-9', text: 'Tržní nabídka práce vznikne horizontálním součtem individuálních nabídek práce.', truth: true, why: 'Při každé mzdě sečteme množství práce, které nabízejí jednotliví lidé. Tržní nabídka je přitom rostoucí, protože s růstem mzdy vstupují na trh další lidé.' },
  { id: 'own-10', text: 'Při nezaměstnanosti způsobené minimální mzdou je počet lidí ochotných za tuto mzdu pracovat větší než počet poptávaných pracovníků.', truth: true, why: 'Nabízené množství práce převyšuje poptávané a rozdíl je nedobrovolná nezaměstnanost.' },
  { id: 'own-11', text: 'Tržní poptávka po práci je prostým horizontálním součtem křivek MRP jednotlivých firem při pevné ceně výrobku.', truth: false, why: 'Když všechny firmy najmou víc pracovníků, vyrobí víc a cena výrobku klesne. MRP firem se proto posune dolů, a tržní poptávka je strmější než prostý součet.' },
  { id: 'own-12', text: 'V bilaterálním monopolu je výsledek vyjednávání o mzdě a zaměstnanosti jednoznačně určen modelem.', truth: false, why: 'Model určí jen požadavky obou stran. Výsledek leží mezi nimi a závisí na vyjednávací síle.' },
  { id: 'own-13', text: 'Ekonomická renta pracovníka je rozdíl mezi mzdou, kterou dostává, a nejnižší mzdou, za kterou by práci ještě nabízel.', truth: true, why: 'Nejnižší přijatelná mzda je transferový výdělek, a co mzda přesahuje, je renta.' },
  { id: 'own-14', text: 'Poptávka po práci je odvozená z poptávky po výrobcích, které práce pomáhá vyrábět.', truth: true, why: 'Firmy práci nepoptávají kvůli ní samé, ale kvůli výrobkům, které z ní vyrobí.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];

function buildAnoNe({ id }) {
  const s = stmtById(id);
  const book = id.startsWith('kn-');
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: id.startsWith('own') ? undefined : { chapter: book ? 9 : '9.1', number: `C-${id.split('-')[1]}` },
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a vyhledáme pojem, na kterém stojí, a podmínky, za kterých platí.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'mp', q: 'Co je mezní produkt práce?', right: 'Přírůstek výstupu, který vznikne při zaměstnání dalšího pracovníka (při pevných ostatních vstupech).', wrong: ['Celkový výstup dělený počtem pracovníků.', 'Hodnota celého výstupu firmy.', 'Mzda dalšího pracovníka.'] },
  { id: 'mrp', q: 'Co je příjem z mezního produktu práce (MRP)?', right: 'Přírůstek příjmu firmy při zaměstnání dalšího pracovníka, tedy mezní příjem krát mezní produkt práce.', wrong: ['Mzda, kterou firma dalšímu pracovníkovi zaplatí.', 'Průměrný produkt práce krát cena výrobku.', 'Celkový příjem firmy dělený počtem pracovníků.'] },
  { id: 'vmp', q: 'Co je hodnota mezního produktu práce (VMP) a kdy se rovná MRP?', right: 'Je to cena výrobku krát mezní produkt práce. Rovná se MRP, když je firma na trhu výrobků dokonale konkurenční (MR = P).', wrong: ['Je to mezní náklad krát mezní produkt práce, rovná se MRP vždy.', 'Je to mzda krát počet pracovníků, rovná se MRP při monopolu.', 'Je to celkový produkt dělený počtem pracovníků, rovná se MRP při monopsonu.'] },
  { id: 'optimum', q: 'Jaká je podmínka optimálního množství práce pro firmu maximalizující zisk?', right: 'MRP se rovná mezním nákladům na práci (MFC), při dokonalé konkurenci na trhu práce MRP = w.', wrong: ['Mezní produkt práce se rovná mzdě.', 'Celkový produkt dosáhne maxima.', 'Průměrný produkt práce se rovná mzdě.'] },
  { id: 'se', q: 'Co je substituční efekt změny mzdy na nabídku práce?', right: 'Při růstu mzdy lidé nahrazují volný čas prací, protože volný čas je dražší, a nabízené množství práce roste.', wrong: ['Při růstu mzdy lidé chtějí víc volného času, protože jsou bohatší, a nabízejí méně práce.', 'Při růstu mzdy firmy nahrazují práci kapitálem.', 'Při růstu mzdy lidé přecházejí do jiného oboru.'] },
  { id: 'ie', q: 'Co je důchodový efekt změny mzdy na nabídku práce?', right: 'Vyšší mzda zvyšuje reálný důchod, lidé chtějí víc volného času a nabízené množství práce klesá.', wrong: ['Vyšší mzda zdražuje volný čas, a nabízené množství práce roste.', 'Vyšší mzda zvyšuje daně z práce.', 'Vyšší mzda zvyšuje počet nabízejících o celý nový obor.'] },
  { id: 'zpetna', q: 'Proč může být individuální nabídka práce zpětně zakřivená?', right: 'Od určité mzdy převáží důchodový efekt nad substitučním, takže s dalším růstem mzdy se nabízené množství práce snižuje.', wrong: ['Od určité mzdy převáží substituční efekt nad důchodovým.', 'Protože firmy při vysokých mzdách propouštějí.', 'Protože tržní nabídka je horizontálním součtem.'] },
  { id: 'rovnovazna-mzda', q: 'Co je rovnovážná mzda?', right: 'Mzda, při které se množství práce nabízené rovná množství poptávanému (nevzniká přebytek ani nedostatek pracovních sil).', wrong: ['Nejnižší mzda stanovená zákonem.', 'Mzda, při které je zaměstnanost nejvyšší možná.', 'Mzda, která se rovná průměrnému produktu práce.'] },
  { id: 'min-mzda', q: 'Jak působí minimální mzda na dokonale konkurenčním trhu práce?', right: 'Je-li nad rovnovážnou mzdou, poptávané množství práce klesne pod nabízené a vznikne nedobrovolná nezaměstnanost. Je-li pod rovnovážnou, nemá účinek.', wrong: ['Vždy zvýší zaměstnanost i mzdy.', 'Vždy sníží mzdy pod rovnovážnou úroveň.', 'Nemá žádný účinek na zaměstnanost, ani když je vysoko nad rovnováhou.'] },
  { id: 'transfer', q: 'Co je transferový výdělek a co ekonomická renta?', right: 'Transferový výdělek je nejnižší odměna, za kterou je pracovník ještě ochoten práci nabízet. Ekonomická renta je část mzdy nad touto hodnotou.', wrong: ['Transferový výdělek je mzda nad rovnováhou a renta je mzda v rovnováze.', 'Transferový výdělek je zisk firmy a renta je mzda pracovníka.', 'Renta je minimální mzda stanovená státem a transferový výdělek je podpora v nezaměstnanosti.'] },
  { id: 'monopson', q: 'Co je monopsonie na trhu práce a jak ovlivňuje mzdu?', right: 'Je to trh s jediným (nebo dominantním) zaměstnavatelem. Ten čelí rostoucí nabídce práce, a platí proto nižší mzdu, než než by byla konkurenční, a zaměstnává méně lidí.', wrong: ['Je to trh s jediným prodejcem práce, kterým jsou odbory.', 'Je to trh, kde mnoho firem najímá práci za stejnou mzdu a žádná ji neovlivní.', 'Je to trh, na kterém stát stanoví minimální mzdu.'] },
  { id: 'mfc', q: 'Proč je u monopsonisty mezní náklad na práci (MFC) vyšší než mzda?', right: 'S dalším pracovníkem musí monopsonista zvýšit mzdu všem zaměstnaným, a mezní náklad proto zahrnuje i toto zvýšení.', wrong: ['Protože musí platit daně z mezd.', 'Protože mzdy zaměstnanců jsou vždy vyšší než jejich produkt.', 'Protože nabídka práce je pro něj vodorovná.'] },
  { id: 'bilat', q: 'Co je bilaterální monopol na trhu práce?', right: 'Na trhu stojí proti sobě jediný kupující práce (monopsonista) a jediný prodejce práce (odbory). Výsledek není jednoznačně určen, záleží na vyjednávání.', wrong: ['Trh se dvěma zaměstnavateli, kteří si konkurují.', 'Trh, kde stát stanoví mzdu pro obě strany.', 'Situace, kdy odbory a firmy jednají o výši cen výrobků.'] },
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
      { title: 'Pojem', text: 'Najdeme klíčový pojem otázky a vybavíme si jeho definici nebo graf.', board: [line('\\text{pojem}\\ \\Rightarrow\\ \\text{definice}')] },
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti zaměňují pojmy nebo obracejí vztah. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function buildGrafRovnovaha({ a, b, c, d }) {
  const e = eqLw(a, b, c, d);
  const g = lwViz({ a, b, c, d });
  return mk('graf-rovnovaha-prace', {
    part: 'zkouska',
    data: { a, b, c, d },
    task: 'Nakreslete do grafu s osami w (mzdová sazba) a L (množství práce) křivku poptávky po práci a křivku nabídky práce. Vyznačte rovnováhu E s rovnovážnou mzdou a zaměstnaností a zakreslete, kde vzniká přebytek a kde nedostatek pracovních sil.',
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: 'Poptávka po práci klesá, nabídka práce roste, v průsečíku je rovnováha E. Nad rovnovážnou mzdou je přebytek pracovních sil, pod ní nedostatek.',
    solution: [
      { title: 'Osy', text: 'Svislá osa je mzdová sazba w, vodorovná množství práce L (počet pracovníků). Obě začínají v nule.', board: [line('w\\uparrow,\\quad L\\rightarrow')] },
      { title: 'Křivky', text: 'Poptávka po práci $D_L$ (příjem z mezního produktu) klesá, nabídka práce $S_L$ roste.', board: [line('D_L\\searrow,\\quad S_L\\nearrow')] },
      { title: 'Rovnováha', text: `V průsečíku je rovnováha E. Z něj vedou čárkované čáry na osy: rovnovážná mzda ${czText(e.w)} a zaměstnanost ${czText(e.L)}. Nad $w_E$ nabízí práci víc lidí, než kolik jich firmy poptávají (přebytek), pod $w_E$ je tomu naopak (nedostatek).`, viz: g },
    ],
  });
}

function buildGrafMinMzda({ a, b, c, d, wmin }) {
  const e = eqLw(a, b, c, d);
  const LD = a - b * wmin; const LS = c + d * wmin;
  const g = lwViz({ a, b, c, d }, {
    curves: [wageLine(wmin, 'wmin')],
    points: [{ x: e.L, y: e.w, label: 'E' }, { x: LD, y: wmin, label: 'A', guides: true }, { x: LS, y: wmin, label: 'B', guides: true }],
    xs: [LS], ys: [wmin], alt: 'Minimální mzda nad rovnováhou a nezaměstnanost',
  });
  return mk('graf-min-mzda', {
    part: 'zkouska',
    data: { a, b, c, d, wmin },
    task: 'Nakreslete trh práce s minimální mzdou stanovenou nad rovnovážnou mzdou. Vyznačte zaměstnanost a nedobrovolnou nezaměstnanost.',
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: 'Minimální mzda nad rovnováhou: poptávané množství práce je menší než nabízené, rozdíl je nezaměstnanost.',
    source: { chapter: 9, number: 4 },
    solution: [
      { title: 'Trh bez zásahu', text: 'Nakreslíme poptávku po práci, nabídku práce a rovnováhu E s rovnovážnou mzdou.', viz: lwViz({ a, b, c, d }) },
      { title: 'Minimální mzda nad rovnováhou', text: 'Vodorovná čára nad rovnovážnou mzdou ukazuje minimální mzdu. Aby působila, musí ležet nad $w_E$ (pod rovnováhou nemá účinek).', board: [line('w_{min}>w_E')] },
      { title: 'Zaměstnanost a nezaměstnanost', text: `Čára protne poptávku v bodě A: tolik pracovníků firmy zaměstnají (${czText(LD)}). Protne nabídku v bodě B: tolik lidí chce při této mzdě pracovat (${czText(LS)}). Úsečka AB je nedobrovolná nezaměstnanost.`, viz: g },
    ],
  });
}

function buildGrafMonopson({ A, B, C, D }) {
  const g = monopsonViz({ A, B, C, D });
  const m = monopsonEq({ A, B, C, D });
  return mk('graf-monopson', {
    part: 'zkouska',
    data: { A, B, C, D },
    task: 'Nakreslete do grafu monopsonistu na trhu práce: křivku příjmu z mezního produktu, křivku nabídky práce a křivku mezních nákladů na práci. Vyznačte zaměstnanost a mzdu, kterou monopsonista zvolí, a pro srovnání konkurenční rovnováhu.',
    answerSpec: { kind: 'whiteboard', reference: g },
    conclusion: 'Zaměstnanost určuje průsečík MRP a MFC, mzda leží na křivce nabídky pod MRP. Zaměstnanost i mzda jsou nižší než při konkurenci.',
    source: { chapter: '9.1', number: 3 },
    solution: [
      { title: 'Křivky', text: 'Nakreslíme klesající MRP, rostoucí nabídku práce $S_L$ a strmější křivku mezního nákladu MFC nad nabídkou.', board: [line('MFC>w\\ \\text{(nad}\\ S_L)')] },
      { title: 'Zaměstnanost a mzda', text: `Průsečík MRP a MFC (bod A) určuje zaměstnanost ${czText(m.LM)}. Z něj svisle dolů na nabídku najdeme mzdu ${czText(m.wM)} (bod W). MRP je v tom bodě ${czText(m.mrpM)}, tedy nad mzdou.`, board: [line('MRP=MFC\\Rightarrow L_M,\\quad w_M\\ \\text{z}\\ S_L')] },
      { title: 'Srovnání s konkurencí', text: `Bod E, kde se kříží MRP s nabídkou, ukazuje konkurenční výsledek: ${czText(m.LC)} pracovníků za mzdu ${czText(m.wC)}. Monopsonista zaměstná méně a platí méně.`, viz: g },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const randomLab = (rng) => pick(rng, ids(LAB_EVENTS));

const types = [
  type('rovnovaha-prace', 'Rovnováha na trhu práce z rovnic', genRovnovaha, buildRovnovaha),
  type('rovnovaha-tabulka', 'Rovnováha z tabulky a celková mzda', genRovnTab, buildRovnTab),
  type('min-mzda', 'Minimální mzda, zaměstnanost a nezaměstnanost', genMinMzda, buildMinMzda),
  type('nezamestnanost', 'Dobrovolná a nedobrovolná nezaměstnanost', genNezam, buildNezam),
  type('renta', 'Ekonomická renta a transferový výdělek', genRenta, buildRenta),
  type('mrp-tabulka', 'Tabulka MP a MRP', genMrpTab, buildMrpTab),
  type('najem-tabulka', 'Optimální počet pracovníků z tabulky', genNajemTab, buildNajemTab),
  type('najem-funkce', 'Optimum zaměstnanosti z produkční funkce', genNajemFce, buildNajemFce),
  type('mrp-monopol', 'MRP při klesající ceně výrobku', genMonopolMrp, buildMonopolMrp),
  type('monopson', 'Monopsonie: MRP = MFC', genMonopson, buildMonopson),
  type('monopson-tab', 'Monopsonie z tabulky', genMonopsonTab, buildMonopsonTab),
  type('min-mzda-monopson', 'Minimální mzda při monopsonii', genMinMonopson, buildMinMonopson),
  type('bilat', 'Bilaterální monopol: firma a odbory', genBilat, buildBilat),
  type('subst-dochod', 'Substituční a důchodový efekt', genSubstDochod, buildSubstDochod),
  type('vyber-posun', 'Co posunulo křivku na trhu práce?', (rng) => buildVyber({ id: randomLab(rng) }), buildVyber),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-rovnovaha-prace', 'Nakresli rovnováhu na trhu práce (zkouška)', (rng) => {
    const g = genLw(rng); return buildGrafRovnovaha({ a: g.a, b: g.b, c: g.c, d: g.d });
  }, buildGrafRovnovaha),
  type('graf-min-mzda', 'Nakresli minimální mzdu a nezaměstnanost (zkouška)', (rng) => genMinMzdaGraf(rng), buildGrafMinMzda),
  type('graf-monopson', 'Nakresli monopsonii (zkouška)', (rng) => {
    const m = genMonopson(rng).data; return buildGrafMonopson({ A: m.A, B: m.B, C: m.C, D: m.D });
  }, buildGrafMonopson),
];

// Pro grafovou úlohu vždy minimální mzda nad rovnováhou.
function genMinMzdaGraf(rng) {
  for (let t = 0; t < 300; t++) {
    const g = genLw(rng);
    const kMax = Math.min(12, Math.floor((0.6 * g.LE) / g.b));
    if (kMax >= 2) return buildGrafMinMzda({ a: g.a, b: g.b, c: g.c, d: g.d, wmin: g.wE + int(rng, 2, kMax) });
  }
  return buildGrafMinMzda({ a: 6000, b: 40, c: 0, d: 120, wmin: 40 });
}

// ---------- výklad ----------
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'L', y: 'w' }, domain: [0, 100], range: [0, 120], curves, points: [], arrows: [], areas: [], ...extra } });
const D0 = { expr: '110 - 2*x', label: 'DL', color: 'blue' };
const S0 = { expr: '20 + x', label: 'SL', color: 'chalk' };

const theory = [
  { heading: 'Trh práce a odvozená poptávka', term: 'Trh práce',
    text: 'Trh práce je trh, na kterém se obchoduje s prací jako výrobním faktorem. Cenou práce je mzdová sazba $w$, množstvím počet pracovníků (nebo odpracovaných hodin) $L$. Nabídku tvoří domácnosti, protože člověk vlastní svou pracovní sílu, a poptávku firmy, které práci najímají jako vstup do výroby.\n\nPoptávka po práci je odvozená: firmy nepoptávají práci kvůli ní samé, ale kvůli výrobkům, které z ní vyrobí. Když klesne poptávka po výrobku, klesne i poptávka po práci, která ho vyrábí.',
    mistakes: ['Nezaměstnanost není jen věc nabídky. Na trhu práce záleží na obou stranách: kolik firem poptává a kolik lidí nabízí při dané mzdě.'] },
  { heading: 'Individuální nabídka práce', term: 'Substituční a důchodový efekt',
    text: 'Člověk má na den omezený čas (24 hodin) a rozděluje ho mezi práci a volný čas. Mzda je cena hodiny volného času: čím vyšší mzda, tím víc stojí odpočinek, protože při něm člověk přichází o výdělek. Změna mzdy působí dvěma protichůdnými efekty.\n\nSubstituční efekt: vyšší mzda zdražuje volný čas, a lidé proto práci nahrazují volný čas, takže nabízejí víc práce.\n\nDůchodový efekt: vyšší mzda zvyšuje reálný důchod, a člověk si může dovolit víc spotřeby i víc volného času (volný čas je normální statek), takže nabízí méně práce.\n\nPři nízkých mzdách obvykle převažuje substituční efekt a nabídka roste. Od určité mzdy může převážit důchodový efekt, a křivka se pak zpětně zakřiví (s další mzdou se nabízí méně práce).',
    viz: backwardViz(),
    mistakes: ['Substituční efekt znamená víc práce, důchodový efekt méně práce. Snadno se to zamění.', 'Nabídka práce při vyšší mzdě nemusí klesat z lenosti, jde o racionální rozhodnutí, jak naložit s vyšším důchodem.'] },
  { heading: 'Tržní nabídka práce', term: 'Tržní nabídka práce',
    text: 'Tržní nabídka práce je horizontálním součtem individuálních nabídek: při každé mzdě sečteme množství práce, které nabízejí jednotliví lidé. Na rozdíl od individuální křivky není zpětně zakřivená, ale roste při všech mzdách. Důvody jsou dva: každý člověk se zakřiví při jiné mzdě, a s růstem mzdy navíc na trh vstupují další lidé.',
    viz: view([S0]),
    mistakes: ['Tržní nabídka práce je rostoucí, i když jednotlivci mohou mít zpětně zakřivenou nabídku.'] },
  { heading: 'Poptávka firmy po práci', term: 'Příjem z mezního produktu práce (MRP)',
    text: 'Mezní produkt práce $MP_L$ je přírůstek výstupu, který přinese další pracovník (při pevných ostatních vstupech). Pro firmu je důležitá jeho peněžní hodnota, tedy příjem z mezního produktu $MRP_L$.\n\nV dokonalé konkurenci na trhu výrobků má firma pevnou cenu a platí $MRP_L = P \\cdot MP_L$ (hodnota mezního produktu VMP). V nedokonalé konkurenci musí firma k prodeji dalších kusů cenu snižovat, takže platí $MRP_L = MR \\cdot MP_L$, a MRP je menší než $P \\cdot MP_L$.\n\nKřivka MRP klesá, protože klesá mezní produkt (zákon klesajících výnosů, ostatní vstupy jsou pevné), a v nedokonalé konkurenci navíc klesá mezní příjem. Její klesající část představuje poptávku firmy po práci (v krátkém období). V dlouhém období firma může nahrazovat práci kapitálem, a poptávka po práci je proto elastičtější.',
    viz: view([{ expr: '110 - 2*x', label: 'MRP', color: 'blue' }]),
    mistakes: ['MRP v dokonalé konkurenci je $P \\cdot MP$, v nedokonalé $MR \\cdot MP$. Neplatí, že se vždy rovná $P \\cdot MP$.', 'Poptávka firmy po práci je klesající část MRP. Část, kde je MRP pod průměrným produktem (nad touto částí by firma už neměla pokrytou variabilní náklady), do poptávky nepatří.'] },
  { heading: 'Optimální množství práce firmy', term: 'Podmínka optima: MRP = MFC',
    text: 'Firma najímá další pracovníky, dokud přinášejí víc, než stojí: do rovnosti příjmu z mezního produktu a mezního nákladu na práci MFC (mezní náklad na dodatečného pracovníka).\n\nV dokonalé konkurenci na trhu práce firma mzdu neovlivní, a mezní náklad na práci je proto rovný mzdě: $MRP_L = MFC_L = w$. Pokud je mzda pevná, firma najme pracovníky do bodu, kde klesající křivka MRP protne mzdu. Při vyšší mzdě najme méně lidí (pohyb po křivce poptávky), při změně ceny výrobku nebo produktivity se křivka MRP posune.\n\nRovnost MRP = w je nutná podmínka. Musí platit na klesající části MRP, a navíc firma musí pokrýt variabilní náklady (výnos z práce nesmí být nižší než mzdy).',
    tex: 'MRP_L = MFC_L \\quad\\Rightarrow\\quad P\\cdot MP_L = w \\ \\text{(dokonalá konkurence)}',
    viz: view([{ expr: '110 - 2*x', label: 'MRP = DL', color: 'blue' }, { expr: '50', label: 'w', color: 'accent', dashed: true }], { points: [{ x: 30, y: 50, label: 'A', guides: true }] }),
    mistakes: ['V optimu se rovná MRP a mezní náklad na práci. Teprve u dokonalé konkurence na trhu práce je MFC rovno mzdě.', 'Firma nenajímá „co nejvíc pracovníků“. Zisk klesá, jakmile další pracovník přinese méně, než stojí.'] },
  { heading: 'Rovnováha na trhu práce', term: 'Rovnovážná mzda',
    text: 'Rovnováha vzniká, když se tržní poptávka po práci rovná tržní nabídce: $L_D = L_S$. Mzda, při které to nastává, je rovnovážná mzda $w_E$, a zaměstnanost $L_E$. Při ní každý, kdo za mzdu práci nabízí, ji také najde.\n\nPři mzdě nad rovnováhou vzniká přebytek pracovních sil (nabízí se víc, než se poptává) a mzda tlačí dolů. Pod rovnováhou vzniká nedostatek pracovních sil a mzda tlačí vzhůru.\n\nRovnováhu hledáme stejně jako na jiných trzích: pravé strany rovnic $L_D = L_S$ dáme do rovnosti a vyřešíme mzdu, pak dosadíme zaměstnanost.',
    tex: 'L_D = L_S \\ \\Rightarrow\\ w_E,\\ L_E',
    viz: view([D0, S0], { points: [{ x: 30, y: 50, label: 'E', guides: true }] }),
    mistakes: ['Rovnovážná zaměstnanost ještě neznamená, že pracují všichni, kdo by teoreticky mohli. Někteří při této mzdě práci nenabízejí (dobrovolná nezaměstnanost).', 'Pokud jsou rovnice zadané jako $w = \\ldots$, porovnáváme mzdy, a ne množství.'] },
  { heading: 'Minimální mzda a nezaměstnanost', term: 'Minimální mzda',
    text: 'Minimální mzda je nejnižší mzda, kterou zaměstnavatel smí zaplatit. Působí jen tehdy, když je nad rovnovážnou mzdou. Pod rovnováhou trh ustálí mzda na rovnovážné úrovni a zákon nic nemění.\n\nNad rovnováhou firmy poptávají méně práce, než jí lidé při této mzdě nabízejí. Zaměstnanost určuje strana poptávky (menší z obou množství), a rozdíl nabídky a poptávky je nedobrovolná nezaměstnanost: lidé, kteří chtějí pracovat za minimální mzdu, ale práci nenajdou. Zaměstnanost se oproti rovnováze snižuje a mzda těch, kdo práci mají, roste.\n\nPoznámka k modelu: lidé schopní práci dělat, kteří za danou mzdu nechtějí pracovat, jsou dobrovolně nezaměstnaní. Nedobrovolná nezaměstnanost vzniká jen při mzdě nad rovnováhou. Minimální mzda může také podněcovat práci načerno. V dlouhém období, kdy firmy mohou práci nahrazovat kapitálem, je pokles zaměstnanosti obvykle větší.',
    viz: view([D0, S0, { expr: '70', label: 'wmin', color: 'accent', dashed: true }], { points: [{ x: 30, y: 50, label: 'E' }, { x: 20, y: 70, label: 'A', guides: true }, { x: 50, y: 70, label: 'B', guides: true }] }),
    mistakes: ['Minimální mzda pod rovnovážnou mzdou nic nezmění. Vždy nejdřív spočtěte rovnováhu a porovnejte ji s minimální mzdou.', 'Zaměstnanost při minimální mzdě je menší z obou množství, tedy poptávané množství. Nabízené množství je počet lidí hledajících práci.', 'Na monopsonním trhu práce může minimální mzda v určitém rozmezí zaměstnanost zvýšit (viz dále), model konkurenčního trhu tu neplatí.'] },
  { heading: 'Ekonomická renta a transferový výdělek', term: 'Ekonomická renta',
    text: 'Každý pracovník je ochoten pracovat od určité nejnižší odměny. Ta se nazývá transferový výdělek (alternativní hodnota jeho času). Nabídka práce ukazuje tyto nejnižší odměny pracovníků seřazené od nejlevnějšího.\n\nV rovnováze dostanou všichni stejnou mzdu. Ekonomická renta je část mzdy, která přesahuje transferový výdělek. Celková renta je plocha mezi rovnovážnou mzdou a křivkou nabídky; plocha pod nabídkou je celkový transferový výdělek. Celková mzda je mzdová sazba krát zaměstnanost.',
    viz: { kind: 'econ', data: { axes: { x: 'L', y: 'w' }, domain: [0, 100], range: [0, 120], curves: [D0, S0], points: [{ x: 30, y: 50, label: 'E', guides: true }], arrows: [], areas: [{ between: ['50', '20 + x'], from: 0, to: 30, label: 'renta', color: 'accent' }], alt: 'Ekonomická renta pracovníků' } },
    mistakes: ['Renta není celá mzda, ale jen její část nad transferovým výdělkem.'] },
  { heading: 'Odbory: monopol na straně nabídky', term: 'Odbory',
    text: 'Odbory sdružují prodejce práce. Fungují jako monopol na straně nabídky: kdo smí pracovat a za jakých podmínek, rozhoduje společně, nikoli jednotlivec. Nástroje odborů jsou kolektivní vyjednávání se zaměstnavateli, stávka (kolektivní odmítnutí prodat práci) a omezování nabídky práce (např. přísné podmínky vstupu do oboru). Mohou také podporovat poptávku po práci: růst produktivity práce nebo poptávky po výrobcích odvětví.\n\nOdbory musí volit mezi mzdou a zaměstnaností. Na konkurenčním trhu práce vede vyšší mzda nad rovnováhou k nižší zaměstnanosti (pohyb po křivce poptávky po práci). Odbory proto mohou sledovat různé cíle: nejvyšší zaměstnanost (rovnováha), nejvyšší celkovou mzdu, nebo nejvyšší ekonomickou rentu členů. Úspěch závisí na kontrole nabídky práce, ne poptávky.',
    mistakes: ['Odbory ovlivňují především nabídku práce, ne poptávku po ní. Poptávku mohou posunout jen nepřímo (produktivita).', 'Vyšší mzda vyjednaná odbory snižuje zaměstnanost jen za jinak stejných podmínek a na trhu s konkurenčními firmami. U monopsonisty to nemusí platit.'] },
  { heading: 'Monopsonie', term: 'Monopsonie',
    text: 'Monopsonie je trh s jediným kupujícím práce (nebo dominantním zaměstnavatelem). Takový zaměstnavatel čelí celé rostoucí křivce nabídky práce: chce-li víc pracovníků, musí zvýšit mzdu, a to všem zaměstnaným. Proto je mezní náklad na práci MFC vyšší než mzda a křivka MFC leží nad nabídkou.\n\nMonopsonista najímá do rovnosti $MRP_L = MFC_L$. Mzdu potom určí z křivky nabídky práce při tomto počtu pracovníků. V důsledku platí nižší mzdu, než by byla konkurenční, a zaměstnává méně lidí. Mzda je nižší než příjem z mezního produktu.\n\nMinimální mzda na monopsonním trhu působí jinak: mezi mzdou monopsonisty a konkurenční mzdou může zaměstnanost zvýšit, nad konkurenční mzdou ji snižuje stejně jako na konkurenčním trhu. Síla monopsonisty bývá v praxi omezena mobilitou pracovníků a konkurencí jiných zaměstnavatelů.',
    tex: 'MRP_L = MFC_L,\\qquad w_M\\ \\text{z křivky}\\ S_L,\\qquad w_M < MRP_L',
    viz: { kind: 'econ', data: { axes: { x: 'L', y: 'w' }, domain: [0, 60], range: [0, 120], curves: [{ expr: '110 - 2*x', label: 'MRP', color: 'blue' }, { expr: '20 + x', label: 'SL', color: 'chalk' }, { expr: '20 + 2*x', label: 'MFC', color: 'green' }], points: [{ x: 22.5, y: 65, label: 'A' }, { x: 22.5, y: 42.5, label: 'W', guides: true }, { x: 30, y: 50, label: 'E' }], arrows: [], areas: [], alt: 'Monopsonie' } },
    mistakes: ['Mzdu monopsonisty nenajdeme z MRP, ale z křivky nabídky při zvoleném počtu pracovníků.', 'Monopsonie není to samé co monopol. Monopol je jediný prodejce, monopsonie jediný kupující.', 'MFC je u monopsonisty vyšší než mzda. Dokonale konkurenční zaměstnavatel má MFC rovno mzdě.'] },
  { heading: 'Bilaterální monopol', term: 'Bilaterální monopol',
    text: 'Bilaterální monopol vznikne, když proti sobě stojí jediný zaměstnavatel (monopsonista) a odbory jako jediný prodejce práce. Zaměstnavatel by si přál zaměstnanost a mzdu z podmínky $MRP = MFC$ (mzda na nabídce). Odbory, které maximalizují ekonomickou rentu, chtějí zaměstnanost z podmínky, kde se mezní příjem odborů z křivky poptávky rovná nabídce (mzda na poptávce).\n\nPožadavky obou stran se liší a model neurčí jednoznačný výsledek. Dohoda leží mezi nimi a záleží na vyjednávací síle stran, na tom, kdo má lepší alternativy, a na případných hrozbách (stávka, propouštění).',
    mistakes: ['V bilaterálním monopolu není výsledek jednoznačný. Model pouze vymezuje, co chce která strana.'] },
  { heading: 'Diskriminace a další nedokonalosti trhu práce', term: 'Diskriminace na trhu práce',
    text: 'Reálný trh práce se od dokonalé konkurence liší: lidé mají různou kvalifikaci a zkušenosti, práce není homogenní, zaměstnanci i firmy mají omezenou mobilitu a informace, náklady na získání kvalifikace jsou vysoké a existují nekonkurenční skupiny (odbory, profesní komory, licence). Vlivem těchto prvků se mzdy neurčují jen průsečíkem jedné křivky nabídky a poptávky.\n\nDiskriminace znamená, že se s lidmi stejné produktivity zachází odlišně (nižší mzda nebo horší přístup k práci) kvůli jejich skupinové příslušnosti, například pohlaví, původu nebo věku. Mzdy pak neodpovídají produktivitě (MRP). Na dokonale konkurenčním trhu by diskriminující zaměstnavatel byl znevýhodněn, protože by odmítal levnější a stejně produktivní pracovníky. Přetrvává proto zejména tam, kde konkurence nebo informace chybí.',
    mistakes: ['Rozdíl mezd mezi skupinami ještě neznamená diskriminaci. Může odrážet rozdíly v kvalifikaci, zkušenostech nebo odpracované době.'] },
];

export default {
  id: 'prace', title: 'Trh práce', order: 8, theory, types,
};
