// Téma 5: Firma v podmínkách dokonalé konkurence (podle skript kap. 6, prezentace 5 a cvičebnice kap. 6).
// Stejná struktura jako tema02.js: theory (výklad), types (generate + solve), každý příklad má kroky s tabulí nebo grafem.
// Nákladové funkce používají dvě rodiny s celočíselnými výsledky:
//  - kubická: VC = a·q − 2c·m·q² + c·q³, minimum AVC při q = m, FC = 2c·q0²·(q0 − m), minimum AC při q = q0,
//  - kvadratická: TC = F + a·q + b·q², F = b·k², minimum AC při q = k (cena a + 2bk).
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'dokonala-konkurence';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- pomůcky ----------
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
const nice = (v) => {
  const w = Math.max(v, 1);
  const p = 10 ** Math.floor(Math.log10(w));
  return NICE_STEPS.find((f) => f * p >= w - 1e-9) * p;
};
const lit = (x) => String(r6(x)); // číslo do výrazu pro graf

// Mnohočlen do TeXu ze dvojic [koeficient, jednočlen]; nulové členy se vynechají.
function polyTex(terms) {
  let s = '';
  for (const [k, mono] of terms) {
    if (!k) continue;
    const abs = Math.abs(k);
    const body = mono === '' ? cz(abs) : abs === 1 ? mono : `${cz(abs)}${mono}`;
    s += s === '' ? `${k < 0 ? '-' : ''}${body}` : `${k < 0 ? '-' : '+'}${body}`;
  }
  return s || '0';
}

// ---------- nákladové křivky firmy ----------
function cubicEnv({ a, c, m, q0 }) {
  const F = 2 * c * q0 * q0 * (q0 - m);
  const mc = (q) => a - 4 * c * m * q + 3 * c * q * q;
  const avc = (q) => a - 2 * c * m * q + c * q * q;
  const ac = (q) => F / q + avc(q);
  const xmax = q0 + 4;
  return {
    kind: 'cubic', a, c, m, q0, F, mc, avc, ac, xmax, pmax: nice(mc(xmax)),
    avcMin: a - c * m * m, acMin: mc(q0), qShut: m, qBreak: q0,
    mcE: `${a} - ${4 * c * m}*x + ${3 * c}*x^2`,
    avcE: `${a} - ${2 * c * m}*x + ${c}*x^2`,
    acE: `${F}/x + ${a} - ${2 * c * m}*x + ${c}*x^2`,
    tcTex: polyTex([[F, ''], [a, 'q'], [-2 * c * m, 'q^2'], [c, 'q^3']]),
    mcTex: polyTex([[a, ''], [-4 * c * m, 'q'], [3 * c, 'q^2']]),
    avcTex: polyTex([[a, ''], [-2 * c * m, 'q'], [c, 'q^2']]),
  };
}

function quadEnv({ a, b, k }) {
  const F = b * k * k;
  const mc = (q) => a + 2 * b * q;
  const avc = (q) => a + b * q;
  const ac = (q) => F / q + a + b * q;
  const xmax = 2 * k;
  return {
    kind: 'quad', a, b, k, F, mc, avc, ac, xmax, pmax: nice(mc(xmax)),
    avcMin: a, acMin: a + 2 * b * k, qShut: 0, qBreak: k,
    mcE: `${a} + ${2 * b}*x`, avcE: `${a} + ${b}*x`, acE: `${F}/x + ${a} + ${b}*x`,
    tcTex: polyTex([[F, ''], [a, 'q'], [b, 'q^2']]),
  };
}

// Graf nákladových křivek MC, AC a AVC s přídavky (cenová čára, body, plochy).
function firmViz(env, { curves = [], points = [], areas = [], alt } = {}) {
  return {
    kind: 'econ',
    data: {
      axes: { x: 'q', y: 'Kč' },
      domain: [0, env.xmax], range: [0, env.pmax],
      curves: [
        { expr: env.mcE, label: 'MC', color: 'blue' },
        { expr: env.acE, label: 'AC', color: 'chalk' },
        { expr: env.avcE, label: 'AVC', color: 'green' },
        ...curves,
      ],
      points, arrows: [], areas,
      alt: alt || 'Nákladové křivky dokonale konkurenční firmy',
    },
  };
}

const priceLine = (P, label = 'P = MR') => ({ expr: lit(P), label, color: 'accent', dashed: true });

// ---------- typ: optimální výstup z P = MC (kvadratické TC) ----------
function buildOptimum({ F, a, b, P }) {
  const q = r6((P - a) / (2 * b));
  const tc = polyTex([[F, ''], [a, 'q'], [b, 'q^2']]);
  const mcTex = polyTex([[a, ''], [2 * b, 'q']]);
  const qmax = nice(q * 2);
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'q', y: 'Kč' }, domain: [0, qmax], range: [0, nice(a + 2 * b * qmax)],
      curves: [{ expr: `${a} + ${2 * b}*x`, label: 'MC', color: 'blue' }, priceLine(P)],
      points: [{ x: q, y: P, label: 'q*', guides: true }], arrows: [], areas: [],
      alt: 'Optimální výstup v průsečíku ceny a mezních nákladů',
    },
  };
  return mk('optimum', {
    data: { F, a, b, P },
    task: `Dokonale konkurenční firma má celkové náklady TC (q je počet kusů, náklady v Kč). Cena produktu je ${czText(P)} Kč. Kolik kusů firma vyrobí, aby maximalizovala zisk?`,
    promptTex: `TC=${tc}`,
    answerSpec: { kind: 'number', value: q },
    conclusion: `Firma maximalizuje zisk při výstupu ${czText(q)} ks.`,
    source: { chapter: 6, number: 11 },
    solution: [
      { title: 'Mezní náklady', text: 'Mezní náklad je přírůstek celkových nákladů při výrobě dalšího kusu, tedy derivace $TC$ podle $q$. Fixní náklad $F$ na výstupu nezávisí, a proto zmizí.',
        board: [line(`TC=${tc}`), line(`MC=\\frac{dTC}{dq}=${mcTex}`)] },
      { title: 'Pravidlo P = MC', text: `Dokonale konkurenční firma maximalizuje zisk tam, kde se cena rovná mezním nákladům. Cena ${czText(P)} Kč je pro firmu daná, a proto za $MR$ dosadíme $P$.`,
        board: [line('P=MR=MC'), line(`${cz(P)}=${mcTex}`)] },
      { title: 'Vyřešíme rovnici', text: `Čísla převedeme na jednu stranu a dělíme koeficientem u $q$.`,
        board: [line(`${coef(2 * b, 'q')}=${cz(P)}${a === 0 ? '' : `-${cz(a)}`}`), line(`${coef(2 * b, 'q')}=${cz(P - a)}`), result(`q^*=${cz(q)}`)] },
      { title: 'Graf', text: `Vodorovná cenová čára $P=MR$ protíná rostoucí křivku $MC$ při výstupu ${czText(q)} ks. Vlevo od něj je $MR>MC$ (další kus zvyšuje zisk), vpravo $MR<MC$.`, viz: graph },
    ],
  });
}

function genOptimum(rng) {
  const b = int(rng, 1, 5); const a = pick(rng, [2, 4, 6, 8, 10, 12, 15, 20]);
  const q = int(rng, 5, 40); const F = 100 * int(rng, 1, 10);
  return buildOptimum({ F, a, b, P: a + 2 * b * q });
}

// ---------- typ: cena z daného optimálního výstupu (kubické TC) ----------
function buildCenaZVystupu({ F, a, b, c, q }) {
  const P = r6(a + 2 * b * q + 3 * c * q * q);
  const b2 = r6(2 * b); const c3 = r6(3 * c);
  const tc = polyTex([[F, ''], [a, 'q'], [b, 'q^2'], [c, 'q^3']]);
  const mcTex = polyTex([[a, ''], [b2, 'q'], [c3, 'q^2']]);
  const qmax = nice(q * 1.5);
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'q', y: 'Kč' }, domain: [0, qmax], range: [0, nice(a + b2 * qmax + c3 * qmax * qmax)],
      curves: [{ expr: `${lit(a)} + ${lit(b2)}*x + ${lit(c3)}*x^2`, label: 'MC', color: 'blue' }, priceLine(P)],
      points: [{ x: q, y: P, label: 'E', guides: true }], arrows: [], areas: [],
      alt: 'Cena je rovna mezním nákladům při optimálním výstupu',
    },
  };
  return mk('cena-z-vystupu', {
    data: { F, a, b, c, q },
    task: `Funkce celkových nákladů každé dokonale konkurenční firmy v odvětví je dána rovnicí (q je počet kusů za měsíc). Každá firma maximalizuje zisk a vyrábí ${czText(q)} ks měsíčně. Jaká je tržní cena produktu?`,
    promptTex: `TC=${tc}`,
    answerSpec: { kind: 'number', value: P },
    conclusion: `Tržní cena je ${czText(P)} Kč.`,
    source: { chapter: 6, number: 3 },
    solution: [
      { title: 'Mezní náklady', text: 'Mezní náklad je derivace celkových nákladů podle výstupu. Konstanta (fixní náklad) vypadne, mocniny se zderivují.',
        board: [line(`TC=${tc}`), line(`MC=${mcTex}`)] },
      { title: 'Podmínka maximálního zisku', text: `Firma maximalizuje zisk, když platí $P=MC$. Protože firma vyrábí ${czText(q)} ks, musí být cena rovna mezním nákladům právě při tomto výstupu.`,
        board: [line(`P=MC(${cz(q)})`)] },
      { title: 'Dosadíme výstup', text: `Do mezních nákladů dosadíme $q=${cz(q)}$.`,
        board: [line(`P=${cz(a)}+${cz(b2)}\\cdot ${cz(q)}+${cz(c3)}\\cdot ${cz(q)}^2`), line(`P=${cz(a)}+${cz(r6(b2 * q))}+${cz(r6(c3 * q * q))}`), result(`P=${cz(P)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Při ceně ${czText(P)} Kč protíná cenová čára křivku $MC$ právě při výstupu ${czText(q)} ks.`, viz: graph },
    ],
  });
}

function genCenaZVystupu(rng) {
  const [b, c] = pick(rng, [[0.1, 0.005], [0.1, 0.01], [0.2, 0.005], [0.2, 0.01], [0.3, 0.01]]);
  return buildCenaZVystupu({ F: 1000 * int(rng, 1, 5), a: int(rng, 1, 8), b, c, q: 20 * int(rng, 1, 5) });
}

// ---------- typ: zisk nebo ztráta v optimu ----------
function buildZisk({ F, a, b, P }) {
  const q = r6((P - a) / (2 * b));
  const TR = r6(P * q); const TC = r6(F + a * q + b * q * q); const pi = r6(TR - TC);
  const avc = r6(a + b * q);
  const tc = polyTex([[F, ''], [a, 'q'], [b, 'q^2']]);
  const mcTex = polyTex([[a, ''], [2 * b, 'q']]);
  return mk('zisk-ztrata', {
    data: { F, a, b, P },
    task: `Dokonale konkurenční firma má celkové náklady TC (q je počet kusů za měsíc, náklady v Kč). Cena produktu je ${czText(P)} Kč. Určete zisk firmy při optimálním výstupu (je-li výsledek záporný, jde o ztrátu).`,
    promptTex: `TC=${tc}`,
    answerSpec: { kind: 'number', value: pi },
    conclusion: pi >= 0 ? `Zisk firmy je ${czText(pi)} Kč.` : `Firma má ztrátu ${czText(-pi)} Kč, tedy zisk ${czText(pi)} Kč.`,
    source: { chapter: 6, number: 11 },
    solution: [
      { title: 'Optimální výstup z P = MC', text: 'Nejdřív najdeme výstup, který maximalizuje zisk. Mezní náklady jsou derivací $TC$ a položíme je rovné ceně.',
        board: [line(`MC=${mcTex}`), line(`${cz(P)}=${mcTex}`), line(`q^*=${cz(q)}`)] },
      { title: 'Příjem a náklady při optimu', text: `Celkový příjem je cena krát množství, celkové náklady spočteme dosazením $q^*=${czText(q)}$ do $TC$.`,
        board: [line(`TR=P\\cdot q=${cz(P)}\\cdot ${cz(q)}=${cz(TR)}`), line(`TC=${cz(F)}${a ? `+${cz(a)}\\cdot ${cz(q)}` : ''}+${cz(b)}\\cdot ${cz(q)}^2=${cz(TC)}`)] },
      { title: 'Zisk nebo ztráta', text: 'Zisk je rozdíl příjmů a nákladů. Záporný výsledek znamená ztrátu.',
        board: [line(`\\pi=TR-TC=${cz(TR)}-${cz(TC)}`), result(`\\pi=${cz(pi)}\\ \\text{Kč}`)] },
      { title: 'Vyplatí se vyrábět?', text: `Při výstupu ${czText(q)} ks jsou průměrné variabilní náklady ${czText(avc)} Kč a cena ${czText(P)} Kč je vyšší, takže příjmy pokrývají variabilní náklady a ještě část fixních. ${pi < 0 ? `Ztráta ${czText(-pi)} Kč je menší než fixní náklady ${czText(F)} Kč, které by firma ztratila, kdyby nevyráběla. ` : ''}Zisk při optimu je ${czText(pi)} Kč.`,
        board: [line(`AVC=${cz(a)}+${cz(b)}\\cdot ${cz(q)}=${cz(avc)}`), line(`P=${cz(P)}>AVC=${cz(avc)}`)] },
    ],
  });
}

function genZisk(rng) {
  const b = int(rng, 1, 3); const a = pick(rng, [4, 8, 10, 12, 16, 20]);
  const q = int(rng, 6, 30);
  const F = Math.max(50, b * q * q + 10 * int(rng, -25, 25) + pick(rng, [-3, 3, 5, -7]));
  return buildZisk({ F, a, b, P: a + 2 * b * q });
}

// ---------- typ: rozhodnutí vyrábět / ukončit ----------
const DECISION_OPTIONS = [
  { id: 'zisk', text: 'Bude vyrábět se ziskem' },
  { id: 'ztrata', text: 'Bude vyrábět se ztrátou' },
  { id: 'konec', text: 'Ukončí výrobu' },
];
const decideSR = (P, afc, avc) => (P > afc + avc ? 'zisk' : P > avc ? 'ztrata' : 'konec');
const decideLR = (P, afc, avc) => (P > afc + avc ? 'zisk' : 'konec');

function buildRozhodnuti({ P, afc, avc, horizon }) {
  const ac = afc + avc;
  const short = horizon === 'kratke';
  const ans = short ? decideSR(P, afc, avc) : decideLR(P, afc, avc);
  const verdict = { zisk: 'vyrábí se ziskem', ztrata: 'vyrábí se ztrátou', konec: 'ukončí výrobu' }[ans];
  const compareAC = P > ac ? `P=${cz(P)}>AC=${cz(ac)}` : `P=${cz(P)}<AC=${cz(ac)}`;
  const steps = [
    { title: 'Průměrné celkové náklady', text: 'Průměrné celkové náklady jsou součtem průměrných fixních a průměrných variabilních nákladů. S nimi se porovnává cena, aby se zjistil zisk na jeden kus.',
      board: [line(`AC=AFC+AVC=${cz(afc)}+${cz(avc)}=${cz(ac)}`)] },
  ];
  if (short) {
    steps.push({ title: 'Porovnání ceny s AC', text: P > ac ? `Cena je vyšší než $AC$, firma má na každém kusu zisk ${czText(P - ac)} Kč.` : `Cena je nižší než $AC$, firma má na každém kusu ztrátu ${czText(ac - P)} Kč.`,
      board: [line(compareAC), line(`P-AC=${cz(P - ac)}`)] });
    steps.push({ title: 'Porovnání ceny s AVC', text: P > avc ? 'V krátkém období firma hradí fixní náklady, ať vyrábí, nebo ne. Dokud cena pokrývá variabilní náklady (a ještě něco z fixních), je lepší vyrábět.' : 'Cena nepokryje ani variabilní náklady. Každý vyrobený kus by prohlubel ztrátu, takže je lepší nevyrábět a ztratit jen fixní náklady.',
      board: [line(`P=${cz(P)}${P > avc ? '>' : '<'}AVC=${cz(avc)}`)] });
  } else {
    steps.push({ title: 'Dlouhé období', text: 'V dlouhém období se mění všechny náklady a fixní náklady neexistují. Firma musí z ceny pokrýt celé průměrné náklady, jinak z odvětví odejde. Ztrátová výroba dlouhodobě nepřichází v úvahu.',
      board: [line(compareAC)] });
    steps.push({ title: 'Rozhodnutí', text: P > ac ? 'Cena převyšuje $AC$, takže firma má ekonomický zisk a bude vyrábět.' : 'Cena je pod $AC$, ztrátu nelze trvale snášet, a firma proto odejde z odvětví.',
      board: [line(P > ac ? `P>AC\\ \\Rightarrow\\ \\text{zisk}` : `P<AC\\ \\Rightarrow\\ \\text{odchod}`)] });
  }
  steps.push({ title: 'Závěr', text: `${short ? 'V krátkém' : 'V dlouhém'} období firma ${verdict}.`, board: [result(`\\text{${{ zisk: 'výroba se ziskem', ztrata: 'výroba se ztrátou', konec: 'ukončení výroby' }[ans]}}`)] });
  return mk('rozhodnuti', {
    data: { P, afc, avc, horizon },
    task: `Firma se pohybuje na dokonale konkurenčním trhu${short ? ' v krátkém období' : ' v dlouhém období'}. Vyrábí při průměrných fixních nákladech ${czText(afc)} Kč a průměrných variabilních nákladech ${czText(avc)} Kč. Svůj výrobek prodává za ${czText(P)} Kč. Jak se firma rozhodne?`,
    answerSpec: { kind: 'choice', value: ans, options: DECISION_OPTIONS },
    conclusion: `${short ? 'V krátkém' : 'V dlouhém'} období firma ${verdict}.`,
    source: { chapter: 6, number: short ? 9 : 10 },
    solution: steps,
  });
}

function genRozhodnuti(rng) {
  const afc = 5 * int(rng, 1, 8); const avc = 5 * int(rng, 2, 16);
  const cat = pick(rng, ['zisk', 'ztrata', 'konec']);
  const P = cat === 'zisk' ? afc + avc + int(rng, 3, 30) : cat === 'ztrata' ? avc + int(rng, 1, afc - 1) : avc - int(rng, 1, 9);
  return buildRozhodnuti({ P, afc, avc, horizon: pick(rng, ['kratke', 'dlouhe']) });
}

// ---------- typ: tabulka rozhodnutí v krátkém a dlouhém období ----------
const CODE = { 1: 'výroba se ziskem', 2: 'výroba se ztrátou', 3: 'ukončení výroby' };
const codeSR = (P, f, v) => (P > f + v ? 1 : P > v ? 2 : 3);
const codeLR = (P, L) => (P > L ? 1 : 3);

function buildTabRozh({ L, f, v, prices }) {
  const acSR = f + v;
  const rows = prices.map((P) => [codeSR(P, f, v), codeLR(P, L)]);
  return mk('tabulka-rozhodnuti', {
    data: { L, f, v, prices },
    task: `Náklady sledované firmy jsou: dlouhodobé průměrné náklady AC = ${czText(L)} Kč/ks, průměrné fixní náklady AFC = ${czText(f)} Kč/ks a průměrné variabilní náklady AVC = ${czText(v)} Kč/ks (v krátkém období). Pro ceny ${prices.map(czText).join('; ')} Kč (v tomto pořadí) určete rozhodnutí firmy. Do tabulky zapište na každý řádek dvě čísla: první sloupec krátké období, druhý dlouhé období. Kód: 1 = výroba se ziskem, 2 = výroba se ztrátou, 3 = ukončení výroby.`,
    answerSpec: { kind: 'table', value: rows.map((r) => r.map(String)) },
    conclusion: `Kódy po řádcích (krátké, dlouhé období): ${rows.map((r) => r.join(', ')).join('; ')}.`,
    source: { chapter: 6, number: 4 },
    solution: [
      { title: 'Hranice rozhodování', text: `V krátkém období je hranicí zisku průměrný celkový náklad $AC_{kr}=AFC+AVC$ a hranicí ukončení výroby $AVC$. V dlouhém období rozhoduje pouze dlouhodobý průměrný náklad ${czText(L)}.`,
        board: [line(`AC_{kr}=${cz(f)}+${cz(v)}=${cz(acSR)}`), line(`AVC=${cz(v)}`), line(`AC_{dl}=${cz(L)}`)] },
      { title: 'Krátké období', text: 'Při ceně nad $AC_{kr}$ firma vyrábí se ziskem. Při ceně mezi $AVC$ a $AC_{kr}$ vyrábí se ztrátou (kryje variabilní náklady a část fixních). Při ceně pod $AVC$ výrobu ukončí.',
        board: prices.map((P) => line(P > acSR ? `P=${cz(P)}>${cz(acSR)}\\ \\Rightarrow\\ 1` : P > v ? `${cz(v)}<P=${cz(P)}<${cz(acSR)}\\ \\Rightarrow\\ 2` : `P=${cz(P)}<${cz(v)}\\ \\Rightarrow\\ 3`)) },
      { title: 'Dlouhé období', text: `V dlouhém období firma vyrábí jen při ceně vyšší než ${czText(L)} Kč. Při nižší ceně z odvětví odejde. Ztrátová výroba tu nepřipadá v úvahu.`,
        board: prices.map((P) => line(P > L ? `P=${cz(P)}>${cz(L)}\\ \\Rightarrow\\ 1` : `P=${cz(P)}<${cz(L)}\\ \\Rightarrow\\ 3`)) },
      { title: 'Tabulka kódů', text: `Kódy po řádcích: ${rows.map((r, i) => `cena ${czText(prices[i])}: ${r[0]} a ${r[1]}`).join('; ')}.`,
        board: [result(rows.map((r) => `(${r[0]},${r[1]})`).join('\\ '))] },
    ],
  });
}

function genTabRozh(rng) {
  const v = int(rng, 10, 30); const f = int(rng, 8, 16);
  const L = v + int(rng, 2, f - 2);
  const A = v + f + int(rng, 2, 6); const B = int(rng, L + 1, v + f - 1); const C = int(rng, v + 1, L - 1);
  const lo = Math.max(3, v - 12);
  const D1 = int(rng, lo, v - 1); let D2 = int(rng, lo, v - 1);
  if (D2 === D1) D2 = D1 > lo ? D1 - 1 : D1 + 1;
  return buildTabRozh({ L, f, v, prices: shuffle(rng, [A, B, C, D1, D2]) });
}

// ---------- tabulka nákladů: dosazování do tabulek ----------
const arrayTex = (qs, label, vals) => `\\begin{array}{c|${'c'.repeat(qs.length)}}Q&${qs.join('&')}\\\\\\hline ${label}&${vals.map(cz).join('&')}\\end{array}`;

// ---------- typ: optimální objem z tabulky nákladů ----------
function buildOptTab({ fc = null, vc = null, tc = null, price }) {
  const TC = vc ? vc.map((x) => fc + x) : tc;
  const X = vc || tc; const label = vc ? 'VC' : 'TC';
  const n = TC.length;
  const mc = TC.map((t, i) => (i > 0 ? t - TC[i - 1] : fc === null ? null : t - fc));
  const profit = TC.map((t, i) => price * (i + 1) - t);
  let best = 0;
  profit.forEach((p, i) => { if (p >= profit[best]) best = i; });
  const q = best + 1;
  const tie = best > 0 && profit[best] === profit[best - 1];
  const known = mc.filter((x) => x !== null);
  const mono = known.every((x, i) => i === 0 || x >= known[i - 1]);
  const qs = Array.from({ length: n }, (_, i) => i + 1);
  const prev = (i) => (i === 0 ? (vc ? 0 : fc) : X[i - 1]);
  return mk('optimum-tabulka', {
    data: fc === null ? { tc, price } : vc ? { fc, vc, price } : { fc, tc, price },
    task: `Dokonale konkurenční firma prodává produkt za ${czText(price)} Kč za kus${fc !== null ? ` a má fixní náklady ${czText(fc)} Kč` : ''}. V tabulce jsou ${vc ? 'variabilní náklady VC' : 'celkové náklady TC'} pro jednotlivé objemy výroby Q. Určete optimální objem produkce.`,
    promptTex: arrayTex(qs, label, X),
    answerSpec: { kind: 'number', value: q },
    conclusion: `Optimální objem produkce je ${czText(q)} ks.`,
    source: { chapter: 6, number: fc !== null && vc ? 6 : 7 },
    solution: [
      { title: 'Mezní náklady z tabulky', text: `Mezní náklad je přírůstek ${vc ? 'variabilních' : 'celkových'} nákladů při výrobě dalšího kusu: rozdíl dvou sousedních hodnot v tabulce.${mc[0] === null ? ' U prvního kusu ho nelze určit, protože neznáme fixní náklady.' : ''}`,
        board: mc.map((x, i) => (x === null ? null : line(`MC_{${i + 1}}=${cz(X[i])}-${cz(prev(i))}=${cz(x)}`))).filter(Boolean) },
      { title: 'Porovnání s cenou', text: `Další kus se vyplatí vyrobit, dokud jeho mezní náklad nepřekročí cenu ${czText(price)} Kč, tedy dokud platí $MC\\le P$.${mono ? '' : ' Mezní náklady v tabulce nejdou pravidelně nahoru, proto výsledek ještě ověříme ziskem.'}`,
        board: mc.map((x, i) => (x === null ? null : line(`q=${i + 1}:\\ MC=${cz(x)}\\ ${x <= price ? '\\le' : '>'}\\ P=${cz(price)}`))).filter(Boolean) },
      { title: 'Kontrola ziskem', text: `Zisk je příjem $P\\cdot q$ minus celkové náklady.${tie ? ` Zisk při ${czText(q - 1)} i ${czText(q)} kusech je stejný (poslední kus má $MC=P$), a firma proto vyrobí větší množství ${czText(q)} ks, jak je zvykem.` : ''}`,
        board: TC.map((t, i) => line(`\\pi_{${i + 1}}=${cz(price)}\\cdot ${i + 1}-${cz(t)}=${cz(profit[i])}`)) },
      { title: 'Závěr', text: `Největší zisk ${czText(profit[best])} Kč je při výrobě ${czText(q)} ks. Optimální objem produkce je ${czText(q)} ks.`,
        board: [result(`q^*=${cz(q)}`)] },
    ],
  });
}

function genOptTab(rng) {
  const n = pick(rng, [5, 6]);
  const mc = [10 * int(rng, 2, 6)];
  for (let i = 1; i < n; i++) mc.push(mc[i - 1] + 10 * int(rng, 1, 3));
  const qStar = int(rng, 2, n - 1);
  const price = mc[qStar - 1] + 5;
  let s = 0; const vc = mc.map((x) => { s += x; return s; });
  return buildOptTab({ fc: 10 * int(rng, 2, 12), vc, price });
}

// ---------- typ: tabulka příjmů, mezních nákladů a zisku ----------
function buildTabPrijmu({ price, fc, vc }) {
  const n = vc.length;
  const rows = vc.map((x, i) => {
    const q = i + 1; const TR = price * q; const MC = x - (i === 0 ? 0 : vc[i - 1]); const pi = TR - fc - x;
    return [TR, MC, pi];
  });
  let best = 0;
  rows.forEach((r, i) => { if (r[2] >= rows[best][2]) best = i; });
  return mk('tabulka-prijmu', {
    data: { price, fc, vc },
    task: `Dokonale konkurenční firma prodává produkt za ${czText(price)} Kč za kus a má fixní náklady ${czText(fc)} Kč. V tabulce jsou variabilní náklady VC pro objemy výroby Q = 1 až ${n}. Vyplňte tabulku: pro každý objem (řádky 1 až ${n}) zapište celkový příjem TR, mezní náklad MC a zisk (záporný je ztráta). Sloupce jdou v tomto pořadí: TR, MC, zisk.`,
    promptTex: arrayTex(Array.from({ length: n }, (_, i) => i + 1), 'VC', vc),
    answerSpec: { kind: 'table', value: rows.map((r) => r.map((x) => String(r6(x)))) },
    conclusion: `Zisk je největší při ${best + 1} ks (${czText(rows[best][2])} Kč).`,
    source: { chapter: 6, number: 6 },
    solution: [
      { title: 'Celkový příjem', text: 'Cena je pro firmu daná, takže celkový příjem roste přímo úměrně s množstvím: $TR=P\\cdot q$. Mezní příjem je tedy stále rovný ceně.',
        board: rows.map((r, i) => line(`TR_{${i + 1}}=${cz(price)}\\cdot ${i + 1}=${cz(r[0])}`)) },
      { title: 'Mezní náklad', text: 'Mezní náklad je přírůstek variabilních nákladů. Fixní náklad se při změně výstupu nemění, a proto na mezním nákladu nic nemění.',
        board: rows.map((r, i) => line(`MC_{${i + 1}}=${cz(vc[i])}-${cz(i === 0 ? 0 : vc[i - 1])}=${cz(r[1])}`)) },
      { title: 'Zisk', text: 'Zisk je celkový příjem minus fixní a variabilní náklady.',
        board: rows.map((r, i) => line(`\\pi_{${i + 1}}=${cz(r[0])}-${cz(fc)}-${cz(vc[i])}=${cz(r[2])}`)) },
      { title: 'Kde je zisk největší', text: `Největší zisk ${czText(rows[best][2])} Kč je při ${best + 1} ks. Právě tam je mezní náklad ještě nejvýš roven ceně, což odpovídá pravidlu $P=MC$.`,
        board: [result(`\\pi_{max}=${cz(rows[best][2])}\\ \\text{Kč}\\ (q=${best + 1})`)] },
    ],
  });
}

function genTabPrijmu(rng) {
  const mc = [10 * int(rng, 2, 5)];
  for (let i = 1; i < 4; i++) mc.push(mc[i - 1] + 10 * int(rng, 1, 3));
  let s = 0; const vc = mc.map((x) => { s += x; return s; });
  return buildTabPrijmu({ price: 5 * int(rng, 5, 16), fc: 10 * int(rng, 2, 10), vc });
}

// ---------- typ: bod uzavření (minimum AVC, kubické náklady) ----------
function buildUzavreni({ a, c, m, q0, ask }) {
  const e = cubicEnv({ a, c, m, q0 });
  const P = r6(e.avcMin);
  const vcTex = polyTex([[a, 'q'], [-2 * c * m, 'q^2'], [c, 'q^3']]);
  const askQ = ask === 'q';
  const graph = firmViz(e, { curves: [priceLine(P, 'P')], points: [{ x: m, y: P, label: 'U', guides: true }], alt: 'Bod uzavření v minimu AVC' });
  return mk('bod-uzavreni', {
    data: { a, c, m, q0, ask },
    task: `Celkové náklady dokonale konkurenční firmy v krátkém období jsou dány funkcí TC (q je počet kusů, náklady v Kč). Určete bod uzavření firmy: ${askQ ? 'při jakém výstupu' : 'při jaké ceně'} firma ukončí výrobu, klesne-li cena?`,
    promptTex: `TC=${e.tcTex}`,
    answerSpec: { kind: 'number', value: askQ ? m : P },
    conclusion: `Bod uzavření je při výstupu ${czText(m)} ks a ceně ${czText(P)} Kč.`,
    source: { chapter: 6, number: 'D-3' },
    solution: [
      { title: 'Variabilní náklady a AVC', text: `Variabilní náklady dostaneme z celkových tím, že odebereme fixní náklad ${czText(e.F)} Kč. Průměrné variabilní náklady jsou variabilní náklady dělené výstupem.`,
        board: [line(`VC=${vcTex}`), line(`AVC=\\frac{VC}{q}=${e.avcTex}`), line(`MC=${e.mcTex}`)] },
      { title: 'Minimum AVC', text: 'Bod uzavření je v minimu $AVC$, tam kde křivka mezních nákladů protíná křivku $AVC$. Položíme $MC=AVC$ a rovnici upravíme.',
        board: [line(`${e.mcTex}=${e.avcTex}`), line(`${polyTex([[2 * c, 'q^2'], [-2 * c * m, 'q']])}=0`), line(`${coef(2 * c, 'q')}(q-${cz(m)})=0`), askQ ? result(`q=${cz(m)}`) : line(`q=${cz(m)}`)] },
      { title: 'Cena v bodě uzavření', text: `Do $AVC$ dosadíme $q=${czText(m)}$. Vyjde nejnižší cena, při které se ještě vyplatí vyrábět.`,
        board: [line(`P=AVC(${cz(m)})=${cz(a)}-${cz(2 * c * m)}\\cdot ${cz(m)}+${cz(c)}\\cdot ${cz(m)}^2`), askQ ? line(`P=${cz(P)}`) : result(`P=${cz(P)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Bod uzavření U leží v minimu křivky $AVC$ a zároveň na křivce $MC$: výstup ${czText(m)} ks, cena ${czText(P)} Kč. Při nižší ceně by firma nevyrobila nic.`, viz: graph },
    ],
  });
}

function genCubicParams(rng) {
  const c = pick(rng, [1, 2, 3]); const m = int(rng, 2, 5); const q0 = m + int(rng, 2, 4);
  return { a: 2 * c * m * m + 10 * int(rng, 1, 5), c, m, q0 };
}

// ---------- typ: bod vyrovnání (minimum AC, kvadratické náklady) ----------
function buildVyrovnani({ a, b, k, ask }) {
  const e = quadEnv({ a, b, k });
  const P = e.acMin; const askQ = ask === 'q';
  const graph = firmViz(e, { curves: [priceLine(P, 'P')], points: [{ x: k, y: P, label: 'R', guides: true }], alt: 'Bod vyrovnání v minimu AC' });
  return mk('bod-vyrovnani', {
    data: { a, b, k, ask },
    task: `Celkové náklady dokonale konkurenční firmy jsou dány funkcí TC (q je počet kusů, náklady v Kč). Firma dosáhne jen normálního zisku (nulového ekonomického zisku) v bodě vyrovnání. Určete ${askQ ? 'výstup' : 'cenu'} v tomto bodě.`,
    promptTex: `TC=${e.tcTex}`,
    answerSpec: { kind: 'number', value: askQ ? k : P },
    conclusion: `V bodě vyrovnání je výstup ${czText(k)} ks a cena ${czText(P)} Kč.`,
    source: { chapter: 6, number: 2 },
    solution: [
      { title: 'AC a MC', text: 'Průměrné celkové náklady jsou celkové náklady dělené výstupem, mezní náklady jejich derivace.',
        board: [line(`AC=\\frac{TC}{q}=\\frac{${cz(e.F)}}{q}${polyTex([[a, ''], [b, 'q']]) ? `+${polyTex([[a, ''], [b, 'q']])}` : ''}`), line(`MC=${polyTex([[a, ''], [2 * b, 'q']])}`)] },
      { title: 'Minimum AC je tam, kde MC = AC', text: 'Křivka $MC$ protíná křivku $AC$ v jejím minimu. Položíme obě rovné a odečteme stejné členy.',
        board: [line(`${polyTex([[a, ''], [2 * b, 'q']])}=\\frac{${cz(e.F)}}{q}+${polyTex([[a, ''], [b, 'q']])}`), line(`${coef(b, 'q')}=\\frac{${cz(e.F)}}{q}`), line(`q^2=\\frac{${cz(e.F)}}{${cz(b)}}=${cz(k * k)}`), askQ ? result(`q=${cz(k)}`) : line(`q=${cz(k)}`)] },
      { title: 'Cena v bodě vyrovnání', text: `V bodě vyrovnání platí $P=MC=AC$. Dosadíme $q=${czText(k)}$ do mezních nákladů.`,
        board: [line(`P=MC(${cz(k)})=${cz(a)}+${cz(2 * b)}\\cdot ${cz(k)}`), askQ ? line(`P=${cz(P)}`) : result(`P=${cz(P)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Bod R leží v minimu křivky $AC$ a protíná ho křivka $MC$: výstup ${czText(k)} ks, cena ${czText(P)} Kč. Při této ceně firma pokryje všechny náklady včetně normálního zisku.`, viz: graph },
    ],
  });
}

function genVyrovnani(rng) {
  return buildVyrovnani({ a: pick(rng, [4, 6, 8, 10, 12, 20, 30]), b: int(rng, 1, 5), k: 5 * int(rng, 1, 6), ask: pick(rng, ['P', 'q']) });
}

// ---------- typ: cenové rozpětí, v němž firma vyrábí se ztrátou ----------
function buildRozpeti({ a, c, m, q0 }) {
  const e = cubicEnv({ a, c, m, q0 });
  const lo = r6(e.avcMin); const hi = r6(e.acMin);
  const graph = firmViz(e, { points: [{ x: m, y: lo, label: 'U', guides: true }, { x: q0, y: hi, label: 'R', guides: true }], alt: 'Cenové rozpětí mezi bodem uzavření a bodem vyrovnání' });
  return mk('rozpeti-cen', {
    data: { a, c, m, q0 },
    task: `Celkové náklady dokonale konkurenční firmy v krátkém období jsou dány funkcí TC. Minimum průměrných celkových nákladů AC nastává při výstupu ${czText(q0)} ks. V jakém cenovém rozpětí firma vyrábí se ztrátou? Do tabulky zapište dolní a horní hranici rozpětí v Kč.`,
    promptTex: `TC=${e.tcTex}`,
    answerSpec: { kind: 'table', value: [[String(lo), String(hi)]] },
    conclusion: `Firma vyrábí se ztrátou při cenách od ${czText(lo)} do ${czText(hi)} Kč.`,
    source: { chapter: 6, number: 2 },
    solution: [
      { title: 'Dolní hranice: minimum AVC', text: 'Pod cenou rovnou minimu $AVC$ firma výrobu ukončí. Minimum najdeme tam, kde $MC=AVC$.',
        board: [line(`MC=${e.mcTex}`), line(`AVC=${e.avcTex}`), line(`${coef(2 * c, 'q')}(q-${cz(m)})=0\\ \\Rightarrow\\ q=${cz(m)}`), line(`AVC(${cz(m)})=${cz(a)}-${cz(2 * c * m)}\\cdot ${cz(m)}+${cz(c)}\\cdot ${cz(m)}^2=${cz(lo)}`)] },
      { title: 'Horní hranice: minimum AC', text: `Nad cenou rovnou minimu $AC$ má firma zisk. V minimu $AC$ se cena rovná mezním nákladům při výstupu ${czText(q0)} ks.`,
        board: [line(`P=MC(${cz(q0)})=${cz(a)}-${cz(4 * c * m)}\\cdot ${cz(q0)}+${cz(3 * c)}\\cdot ${cz(q0)}^2`), line(`AC(${cz(q0)})=\\frac{${cz(e.F)}}{${cz(q0)}}+${cz(r6(e.avc(q0)))}=${cz(hi)}`)] },
      { title: 'Rozpětí', text: `Firma vyrábí se ztrátou, pokud cena leží mezi minimem $AVC$ (${czText(lo)} Kč) a minimem $AC$ (${czText(hi)} Kč). Ztráta je pak menší než fixní náklady.`,
        board: [result(`${cz(lo)}<P<${cz(hi)}`)] },
      { title: 'Graf', text: `Bod U (minimum $AVC$, bod uzavření) je v ceně ${czText(lo)}, bod R (minimum $AC$, bod vyrovnání) v ceně ${czText(hi)}. Mezi těmito cenami vyrábí firma se ztrátou.`, viz: graph },
    ],
  });
}

// ---------- typ: zisk jako plocha obdélníku ----------
function buildObdelnik({ P, q, AC, cost = null }) {
  const unit = r6(P - AC); const total = r6(unit * q);
  const profit = total >= 0;
  const qmax = nice(q * 1.4); const pmax = nice(Math.max(P, AC) * 1.3);
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'q', y: 'Kč' }, domain: [0, qmax], range: [0, pmax],
      curves: [priceLine(P, 'P = MR'), { expr: lit(AC), label: 'AC*', color: 'chalk', dashed: true }],
      points: [{ x: q, y: P, label: 'q*', guides: true }, { x: q, y: AC }],
      areas: [{ between: [lit(P), lit(AC)], from: 0, to: q, label: profit ? 'zisk' : 'ztráta', color: profit ? 'green' : 'warn' }],
      arrows: [], alt: profit ? 'Zisk jako obdélník mezi cenou a průměrnými náklady' : 'Ztráta jako obdélník mezi průměrnými náklady a cenou',
    },
  };
  return mk('zisk-obdelnik', {
    data: cost ? { P, q, AC, cost } : { P, q, AC },
    task: `Dokonale konkurenční firma maximalizuje zisk při výstupu ${czText(q)} ks. Cena produktu je ${czText(P)} Kč a průměrné celkové náklady při tomto výstupu jsou ${czText(AC)} Kč na kus. Určete celkový zisk firmy (je-li výsledek záporný, jde o ztrátu).`,
    answerSpec: { kind: 'number', value: total },
    conclusion: profit ? `Celkový zisk je ${czText(total)} Kč.` : `Firma má ztrátu ${czText(-total)} Kč, tedy zisk ${czText(total)} Kč.`,
    source: { chapter: 6, number: 5 },
    solution: [
      { title: 'Zisk na jednotku', text: 'Na každém kuse firma vydělá rozdíl mezi cenou (= průměrným příjmem) a průměrnými celkovými náklady.',
        board: [line('z=AR-AC=P-AC'), line(`z=${cz(P)}-${cz(AC)}=${cz(unit)}`)] },
      { title: 'Celkový zisk', text: `Jednotkový zisk vynásobíme počtem prodaných kusů ${czText(q)}.`,
        board: [line('\\pi=(P-AC)\\cdot q^*'), result(`\\pi=${cz(unit)}\\cdot ${cz(q)}=${cz(total)}\\ \\text{Kč}`)] },
      { title: 'Zisk v grafu', text: `Celkový zisk je plocha obdélníku. Výška je rozdíl ${czText(unit)} Kč mezi cenou a $AC$, šířka je výstup ${czText(q)} ks, a plocha je tedy ${czText(total)} Kč.${profit ? '' : ' Obdélník leží nad cenou (mezi cenou a $AC$), a jde proto o ztrátu.'}`, viz: graph },
    ],
  });
}

function genObdelnik(rng) {
  const b = pick(rng, [2, 4]); const k = 10 * int(rng, 1, 4); const a = pick(rng, [5, 10, 20, 30]);
  const q = rng() < 0.5 ? 2 * k : k / 2;
  const F = b * k * k;
  return buildObdelnik({ P: a + 2 * b * q, q, AC: r6(F / q + a + b * q), cost: { a, b, k } });
}

// ---------- typ: odvětví s identickými firmami ----------
function buildOdvetvi({ N, k, m, A, s, ask }) {
  const n = N / m;
  const P = r6((s * A + n * k) / (s + n));
  const Q = r6(s * (A - P)); const q = r6(Q / N); const CS = r6((A - P) * Q / 2);
  const answer = { P, Q, CS }[ask];
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(s * A)], range: [0, nice(A)],
      curves: [{ expr: `${lit(A)} - x/${s}`, label: 'D', color: 'blue' }, { expr: `${k} + ${m}*x/${N}`, label: 'S', color: 'chalk' }],
      points: [{ x: Q, y: P, label: 'E', guides: true }], arrows: [], areas: [],
      alt: 'Rovnováha dokonale konkurenčního odvětví: poptávka odvětví a součet nabídek firem',
    },
  };
  const what = { P: 'rovnovážnou cenu', Q: 'optimální množství produkce celého odvětví', CS: 'přebytek spotřebitele v rovnováze' }[ask];
  return mk('odvetvi-rovnovaha', {
    data: { N, k, m, A, s, ask },
    task: `V dokonale konkurenčním odvětví působí ${czText(N)} identických firem. Mezní náklady každé z nich jsou $MC=${k}+${m === 1 ? '' : cz(m)}q$ (v Kč), poptávka po produkci celého odvětví je $P=${cz(A)}-Q/${cz(s)}$. Určete ${what}.`,
    answerSpec: { kind: 'number', value: answer },
    conclusion: `Rovnovážná cena je ${czText(P)} Kč, množství odvětví ${czText(Q)}, každá firma vyrábí ${czText(q)} a přebytek spotřebitele je ${czText(CS)} Kč.`,
    source: { chapter: 6, number: 12 },
    solution: [
      { title: 'Nabídka jedné firmy', text: 'Firma vyrábí tak, aby platilo $P=MC$. Z rovnice vyjádříme výstup firmy jako funkci ceny. To je její křivka nabídky.',
        board: [line(`P=${k}+${coef(m, 'q')}`), line(`q=\\frac{P-${cz(k)}}{${cz(m)}}`)] },
      { title: 'Nabídka odvětví', text: `Všechny firmy jsou stejné, a nabídku odvětví proto dostaneme vynásobením počtem firem ${czText(N)} (horizontální součet).`,
        board: [line(`Q_S=${cz(N)}\\cdot\\frac{P-${cz(k)}}{${cz(m)}}`), line(`Q_S=${cz(n)}(P-${cz(k)})`)] },
      { title: 'Poptávka odvětví', text: `Poptávku vyjádříme jako množství v závislosti na ceně: z $P=${czText(A)}-Q/${czText(s)}$ plyne $Q=${czText(s)}(${czText(A)}-P)$.`,
        board: [line(`Q_D=${cz(s)}(${cz(A)}-P)`)] },
      { title: 'Rovnováha odvětví', text: 'V krátkodobé rovnováze je trh vyčištěný: $Q_D=Q_S$. Z rovnice vyjde cena, pak množství dosazením do poptávky.',
        board: [line(`${cz(s)}(${cz(A)}-P)=${cz(n)}(P-${cz(k)})`), line(`(${cz(s + n)})P=${cz(s * A + n * k)}`), line(`P=${cz(P)}`), line(`Q=${cz(s)}(${cz(A)}-${cz(P)})=${cz(Q)}`), ask === 'P' ? result(`P=${cz(P)}\\ \\text{Kč}`) : ask === 'Q' ? result(`Q=${cz(Q)}`) : line(`Q=${cz(Q)}`)] },
      { title: 'Přebytek spotřebitele', text: `Přebytek spotřebitele je plocha trojúhelníku pod poptávkou a nad cenou: polovina základny $Q$ krát výšky $A-P$. Každá firma vyrábí ${czText(q)}.`,
        board: [line(`PS=\\frac{1}{2}\\cdot Q\\cdot (${cz(A)}-${cz(P)})`), ask === 'CS' ? result(`PS=${cz(CS)}\\ \\text{Kč}`) : line(`PS=${cz(CS)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Křivka nabídky odvětví protíná poptávku v bodě E: množství ${czText(Q)}, cena ${czText(P)} Kč. Plocha mezi poptávkou a cenou vlevo od E je přebytek spotřebitele.`, viz: graph },
    ],
  });
}

function genOdvetvi(rng) {
  const m = pick(rng, [1, 2]); const N = pick(rng, [500, 1000, 2000]);
  const k = pick(rng, [2, 4, 6]); const qf = int(rng, 2, 8);
  const P = k + m * qf; const delta = pick(rng, [2, 4, 5, 10]);
  return buildOdvetvi({ N, k, m, A: P + delta, s: (N * qf) / delta, ask: pick(rng, ['P', 'Q', 'CS']) });
}

// ---------- typ: nabídka odvětví jako horizontální součet ----------
const firmTex = (f, i) => `Q_${i + 1}=${polyTex([[f.m, 'P'], [-f.c, '']])}`;

function buildNabidkaOdv({ firms, ask, P }) {
  const M = r6(firms.reduce((s, f) => s + f.m, 0)); const C = r6(firms.reduce((s, f) => s + f.c, 0));
  const expr = `${lit(M)}*P${C === 0 ? '' : C > 0 ? ` - ${lit(C)}` : ` + ${lit(-C)}`}`;
  const eqTex = polyTex([[M, 'P'], [-C, '']]);
  const thr = firms.map((f) => f.c / f.m); const Pmin = Math.max(...thr);
  const askExpr = ask === 'expr';
  const Qat = askExpr ? null : r6(M * P - C);
  const view = askExpr ? Math.ceil(Pmin * 1.6 + 1) : Math.ceil(Math.max(P, Pmin) * 1.2);
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(M * view - C)], range: [0, nice(view)],
      curves: [
        ...firms.map((f, i) => ({ expr: `(x + ${lit(f.c)})/${lit(f.m)}`, label: `S${i + 1}`, color: ['green', 'blue', 'warn', 'chalk'][i % 4] })),
        { expr: `(x + ${lit(C)})/${lit(M)}`, label: 'S', color: 'accent' },
      ],
      points: [], arrows: [], areas: [], alt: 'Nabídka odvětví jako horizontální součet nabídek firem',
    },
  };
  const steps = [
    { title: 'Co se sčítá', text: 'Nabídka odvětví je horizontální součet nabídek jednotlivých firem: při každé ceně sečteme množství, která firmy nabídnou. Sčítá se množství, nikoli cena.',
      board: firms.map((f, i) => line(firmTex(f, i))) },
    { title: 'Součet', text: 'Členy s cenou sečteme a členy bez ceny také. Tak vznikne rovnice tržní nabídky.',
      board: [line(`Q=${firms.map((_, i) => `Q_${i + 1}`).join('+')}`), line(`Q=(${firms.map((f) => cz(f.m)).join('+')})P-(${firms.map((f) => cz(f.c)).join('+')})`), askExpr ? result(`Q=${eqTex}`) : line(`Q=${eqTex}`)] },
  ];
  if (!askExpr) {
    steps.push({ title: 'Dosadíme cenu', text: `Do rovnice tržní nabídky dosadíme cenu ${czText(P)} Kč (při ní vyrábějí všechny firmy).`,
      board: [line(`Q=${cz(M)}\\cdot ${cz(P)}-${cz(C)}`), result(`Q=${cz(Qat)}`)] });
  }
  steps.push({ title: 'Graf', text: `Každá firma nabízí od své nejnižší ceny. Křivka nabídky odvětví S je (pro ceny, při kterých vyrábějí všechny firmy) horizontálním součtem křivek $S_1$ až $S_${firms.length}$.${askExpr ? '' : ` Při ceně ${czText(P)} Kč nabídne odvětví ${czText(Qat)} jednotek.`}`, viz: graph });
  return mk('nabidka-odvetvi', {
    data: askExpr ? { firms, ask } : { firms, ask, P },
    task: `Dokonale konkurenční odvětví tvoří ${firms.length === 3 ? 'tři' : firms.length === 4 ? 'čtyři' : firms.length} firmy s individuálními nabídkami $Q_i$ (v kusech, P je cena v Kč). ${askExpr ? 'Určete rovnici tržní nabídky Q v závislosti na ceně P (předpokládejte, že cena je tak vysoká, že vyrábějí všechny firmy). Zapište ji jako výraz v P.' : `Kolik kusů nabídne celé odvětví při ceně ${czText(P)} Kč (vyrábějí všechny firmy)?`}`,
    promptTex: firms.map(firmTex).join(',\\quad '),
    answerSpec: askExpr ? { kind: 'expression', value: expr, variable: 'P' } : { kind: 'number', value: Qat },
    conclusion: askExpr ? `Tržní nabídka je Q = ${eqTex.replace(/\{,\}/g, ',')}.` : `Odvětví nabídne ${czText(Qat)} jednotek.`,
    source: { chapter: 6, number: 13 },
    solution: steps,
  });
}

function genNabidkaOdv(rng) {
  const n = pick(rng, [3, 4]);
  const firms = Array.from({ length: n }, () => ({ m: int(rng, 1, 5), c: 2 * int(rng, 1, 6) }));
  const Pmin = Math.max(...firms.map((f) => f.c / f.m));
  const ask = pick(rng, ['expr', 'q']);
  return buildNabidkaOdv({ firms, ask, P: Math.ceil(Pmin) + int(rng, 2, 12) });
}

// ---------- typ: dlouhodobá rovnováha odvětví ----------
function buildDlouha({ a, b, k, s, M, ask }) {
  const e = quadEnv({ a, b, k });
  const P = e.acMin; const Q = r6(M - s * P); const N = r6(Q / k);
  const answer = { P, q: k, N }[ask];
  const graph = firmViz(e, { curves: [priceLine(P, 'P')], points: [{ x: k, y: P, label: 'E', guides: true }], alt: 'Dlouhodobá rovnováha firmy v minimu AC' });
  const what = { P: 'dlouhodobou rovnovážnou cenu', q: 'dlouhodobý rovnovážný výstup jedné firmy', N: 'počet firem v odvětví v dlouhodobé rovnováze' }[ask];
  return mk('dlouha-rovnovaha', {
    data: { a, b, k, s, M, ask },
    task: `V dokonale konkurenčním odvětví mají všechny firmy stejné celkové náklady TC (q je počet kusů, v Kč) a vstup do odvětví je volný. Poptávka po produkci odvětví je $Q_D=${cz(M)}-${coef(s, 'P')}$. Určete ${what}.`,
    promptTex: `TC=${e.tcTex}`,
    answerSpec: { kind: 'number', value: answer },
    conclusion: `V dlouhodobé rovnováze je cena ${czText(P)} Kč, výstup firmy ${czText(k)} ks a v odvětví působí ${czText(N)} firem.`,
    source: { chapter: 6, number: 5 },
    solution: [
      { title: 'Podmínky dlouhodobé rovnováhy', text: 'Při volném vstupu a výstupu se v dlouhém období cena ustálí tak, aby žádná firma neměla ekonomický zisk ani ztrátu. Platí proto současně $P=MC$ (maximum zisku) a $P=AC$ (nulový ekonomický zisk): firma vyrábí v minimu $AC$.',
        board: [line('P=MR=MC=AC')] },
      { title: 'Výstup firmy', text: 'Z podmínky $MC=AC$ spočteme výstup firmy. Po odečtení stejných členů zbude rovnice pro $q$.',
        board: [line(`${polyTex([[a, ''], [2 * b, 'q']])}=\\frac{${cz(e.F)}}{q}+${polyTex([[a, ''], [b, 'q']])}`), line(`q^2=\\frac{${cz(e.F)}}{${cz(b)}}=${cz(k * k)}`), ask === 'q' ? result(`q=${cz(k)}`) : line(`q=${cz(k)}`)] },
      { title: 'Cena v dlouhém období', text: `Cena je rovna minimu $AC$, tedy mezním nákladům při $q=${czText(k)}$.`,
        board: [line(`P=MC(${cz(k)})=${cz(a)}+${cz(2 * b)}\\cdot ${cz(k)}`), ask === 'P' ? result(`P=${cz(P)}\\ \\text{Kč}`) : line(`P=${cz(P)}\\ \\text{Kč}`)] },
      { title: 'Množství na trhu', text: `Za tuto cenu kupující koupí množství z poptávky odvětví.`,
        board: [line(`Q=${cz(M)}-${cz(s)}\\cdot ${cz(P)}=${cz(Q)}`)] },
      { title: 'Počet firem', text: `Celkové množství rozdělíme mezi firmy, z nichž každá vyrábí ${czText(k)} ks: ${czText(Q)} : ${czText(k)} = ${czText(N)}. Při tomto počtu firem je odvětví v rovnováze, žádné další firmy nevstupují ani neodcházejí.`,
        board: [line(`N=\\frac{Q}{q}=\\frac{${cz(Q)}}{${cz(k)}}`), ask === 'N' ? result(`N=${cz(N)}`) : line(`N=${cz(N)}`)] },
      { title: 'Graf', text: `Firma vyrábí v minimu křivky $AC$ (bod E) při ceně ${czText(P)} Kč a výstupu ${czText(k)} ks.`, viz: graph },
    ],
  });
}

function genDlouha(rng) {
  const a = pick(rng, [4, 6, 8, 10, 12, 20]); const b = int(rng, 1, 4); const k = 5 * int(rng, 1, 6);
  const s = 10 * int(rng, 1, 8); const N = 5 * int(rng, 4, 20);
  return buildDlouha({ a, b, k, s, M: N * k + s * (a + 2 * b * k), ask: pick(rng, ['P', 'q', 'N']) });
}

// ---------- typ: nulový zisk (TR a AC) ----------
function buildNulovy({ TR, AC, AVC }) {
  const Q = r6(TR / AC);
  return mk('nulovy-zisk', {
    data: { TR, AC, AVC },
    task: `Celkové příjmy z prodeje výrobků dokonale konkurenční firmy jsou ${czText(TR)} Kč týdně. Průměrné celkové náklady firmy jsou ${czText(AC)} Kč a průměrné variabilní náklady ${czText(AVC)} Kč. Při jak velké produkci nemá firma ani zisk, ani ztrátu?`,
    answerSpec: { kind: 'number', value: Q },
    conclusion: `Firma nemá zisk ani ztrátu při produkci ${czText(Q)} ks.`,
    source: { chapter: 6, number: 8 },
    solution: [
      { title: 'Co znamená nulový zisk', text: 'Zisk je nulový, když se celkové příjmy rovnají celkovým nákladům. Po vydělení výstupem to znamená, že cena (průměrný příjem) se rovná průměrným celkovým nákladům.',
        board: [line('TR=TC'), line('P=AR=AC')] },
      { title: 'Cena firmy', text: `Průměrné variabilní náklady ${czText(AVC)} Kč nejsou pro tuto úlohu potřeba, protože u nulového zisku rozhodují celkové náklady. Cena je proto ${czText(AC)} Kč.`,
        board: [line(`P=AC=${cz(AC)}`)] },
      { title: 'Výstup z příjmů', text: 'Celkový příjem je cena krát množství, množství je tedy příjem dělený cenou.',
        board: [line('TR=P\\cdot Q'), line(`Q=\\frac{TR}{P}=\\frac{${cz(TR)}}{${cz(AC)}}`), result(`Q=${cz(Q)}\\ \\text{ks}`)] },
    ],
  });
}

function genNulovy(rng) {
  const AC = pick(rng, [10, 20, 25, 40, 50]); const Q = 100 * int(rng, 2, 20);
  return buildNulovy({ TR: AC * Q, AC, AVC: AC - pick(rng, [4, 5, 8, 10]) });
}

// ---------- typ: teorém pavučiny ----------
const COB_OPTIONS = [{ id: 'konv', text: 'Konvergující pavučina (trh se vrací k rovnováze)' }, { id: 'div', text: 'Divergující pavučina (trh se od rovnováhy vzdaluje)' }];

// Pavučina: kupující reagují na aktuální cenu, výrobci na cenu z minulého období.
// form 'P': poptávka P = A − BQ, nabídka P = C + DQ; form 'Q': Q = a − bP, Q = c + dP.
function cobweb(form, v) {
  let pd; let qs; let qd; let expD; let expS; let Qe; let ratio; let conv;
  if (form === 'P') {
    const [A, B, C, D] = v;
    pd = (Q) => A - B * Q; qs = (P) => (P - C) / D; qd = (P) => (A - P) / B;
    expD = `${A} - ${B}*x`; expS = `${C} + ${D}*x`; Qe = (A - C) / (B + D); ratio = B / D; conv = D > B;
  } else {
    const [a, b, c, d] = v;
    pd = (Q) => (a - Q) / b; qs = (P) => c + d * P; qd = (P) => a - b * P;
    expD = `(${a} - x)/${b}`; expS = `(x - ${c})/${d}`; const Pe0 = (a - c) / (b + d); Qe = a - b * Pe0; ratio = d / b; conv = d < b;
  }
  const Pe = pd(Qe);
  const rounds = 3;
  const delta = Math.min(0.15 * Pe, (0.6 * Pe) / Math.max(1, ratio) ** rounds);
  let P = Pe + delta; let Q = qd(P);
  const arrows = []; const xs = [Q, Qe]; const ys = [P, Pe];
  for (let i = 0; i < rounds; i++) {
    const Qn = qs(P); arrows.push({ from: [Q, P], to: [Qn, P], label: '' });
    const Pn = pd(Qn); arrows.push({ from: [Qn, P], to: [Qn, Pn], label: '' });
    xs.push(Qn); ys.push(Pn); Q = Qn; P = Pn;
  }
  const ok = xs.every((x) => x > 0) && ys.every((y) => y > 0);
  const viz = {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(Math.max(...xs) * 1.2)], range: [0, nice(Math.max(...ys) * 1.2)],
      curves: [{ expr: expD, label: 'D', color: 'blue' }, { expr: expS, label: 'S', color: 'chalk' }],
      points: [{ x: Qe, y: Pe, label: 'E' }, { x: xs[0], y: Pe + delta, label: 'P0' }],
      arrows, areas: [], alt: conv ? 'Konvergující pavučina' : 'Divergující pavučina',
    },
  };
  return { viz, conv, ratio, ok };
}

function buildPavucina({ form, v }) {
  const { viz, conv } = cobweb(form, v);
  const ans = conv ? 'konv' : 'div';
  const [rn0, rd0] = form === 'P' ? [v[1], v[3]] : [v[3], v[1]];
  const gcd = ((x, y) => { let p = x; let q = y; while (q) [p, q] = [q, p % q]; return p; })(rn0, rd0);
  const rn = rn0 / gcd; const rd = rd0 / gcd;
  const intro = 'Poptávka (kupující reagují na současnou cenu) je dána první rovnicí, nabídka (výrobci reagují na cenu z předchozího období) druhou.';
  const eqs = form === 'P'
    ? { promptTex: `P=${polyTex([[v[0], ''], [-v[1], 'Q']])},\\qquad P=${polyTex([[v[2], ''], [v[3], 'Q']])}`, text: intro }
    : { promptTex: `Q_D=${polyTex([[v[0], ''], [-v[1], 'P']])},\\qquad Q_S=${polyTex([[v[2], ''], [v[3], 'P']])}`, text: intro };
  const compare = form === 'P'
    ? [line(`\\text{sklon }D:\\ -${cz(v[1])},\\qquad \\text{sklon }S:\\ ${cz(v[3])}`), line(`|\\text{sklon }S|=${cz(v[3])}\\ ${v[3] > v[1] ? '>' : '<'}\\ ${cz(v[1])}=|\\text{sklon }D|`)]
    : [line(`\\text{reakce kupujících na cenu: }b=${cz(v[1])},\\qquad \\text{reakce výrobců: }d=${cz(v[3])}`), line(`d=${cz(v[3])}\\ ${v[3] < v[1] ? '<' : '>'}\\ ${cz(v[1])}=b`)];
  return mk('pavucina', {
    data: { form, v },
    task: `Posuďte model pavučiny. ${eqs.text} Jak se bude chovat trh po vychýlení z rovnováhy?`,
    promptTex: eqs.promptTex,
    answerSpec: { kind: 'choice', value: ans, options: COB_OPTIONS },
    conclusion: conv ? 'Pavučina je konvergující: trh se vrací k rovnováze.' : 'Pavučina je divergující: trh se od rovnováhy vzdaluje.',
    source: { chapter: 6, number: 14 },
    solution: [
      { title: 'Zpoždění nabídky', text: 'V modelu pavučiny reagují výrobci na cenu z minulého období, protože výrobu nelze změnit hned. Kupující reagují na cenu aktuální. Cena se tak v každém kole určí z poptávky podle množství, které výrobci vyrobili minule.',
        board: [line('Q_{D,t}=D(P_t)'), line('Q_{S,t}=S(P_{t-1})')] },
      { title: form === 'P' ? 'Porovnání sklonů křivek' : 'Porovnání reakcí na cenu', text: form === 'P'
        ? 'Pavučina konverguje, je-li nabídka v grafu s cenou na svislé ose strmější než poptávka. Každé kolo pak zmenší odchylku ceny od rovnováhy.'
        : 'Pavučina konverguje, reagují-li výrobci na změnu ceny méně než kupující, tedy $d<b$ (nabídka je méně elastická než poptávka). Každé kolo pak zmenší odchylku ceny.',
      board: compare },
      { title: 'Odchylka ceny v každém kole', text: `Odchylka ceny od rovnováhy se v každém kole násobí číslem $-\\frac{${rn}}{${rd}}$ (poměr sklonů křivek). ${conv ? 'Jeho absolutní hodnota je menší než 1, takže odchylky se zmenšují.' : 'Jeho absolutní hodnota je větší než 1, takže odchylky rostou.'}`,
        board: [line(`\\Delta P_t=-\\frac{${rn}}{${rd}}\\cdot\\Delta P_{t-1}`), line(`\\left|-\\frac{${rn}}{${rd}}\\right|${conv ? '<' : '>'}1`)] },
      { title: 'Graf pavučiny', text: 'Šipky ukazují, jak se cena a množství střídají. Jdou-li směrem k bodu E, pavučina konverguje, jdou-li od něj, diverguje.', viz },
      { title: 'Závěr', text: conv ? 'Pavučina je konvergující.' : 'Pavučina je divergující.', board: [result(conv ? '\\text{konvergující}' : '\\text{divergující}')] },
    ],
  });
}

function genPavucina(rng) {
  for (let i = 0; i < 300; i++) {
    const form = pick(rng, ['P', 'Q']);
    let v;
    if (form === 'P') v = [10 * int(rng, 10, 20), int(rng, 1, 4), 10 * int(rng, 0, 4), int(rng, 1, 4)];
    else v = [20 * int(rng, 5, 15), int(rng, 1, 5), 10 * int(rng, 0, 3), int(rng, 1, 5)];
    const { ratio, ok } = cobweb(form, v);
    if (ok && Math.abs(ratio - 1) >= 0.2 && ratio >= 1 / 3 && ratio <= 2) return buildPavucina({ form, v });
  }
  return buildPavucina({ form: 'P', v: [100, 1, 20, 2] });
}

// ---------- typ: předpoklady dokonalé konkurence (výběr z možností) ----------
const ASSUME_OK = [
  'Velký počet prodávajících a kupujících, z nichž žádný sám neovlivní cenu',
  'Homogenní (identický) produkt',
  'Volný vstup do odvětví a výstup z něj',
  'Dokonalá informovanost všech subjektů',
  'Firmy jsou příjemci ceny (cenu berou jako danou)',
];
const ASSUME_BAD = [
  'Každá firma vyrábí odlišený produkt s vlastní značkou',
  'Několik velkých firem ovládá většinu trhu',
  'Vstup do odvětví chrání vysoké překážky',
  'Prodávající mají víc informací než kupující',
  'Firma si sama stanovuje cenu podle svých nákladů',
  'Stát stanovuje cenu produktu',
];
const assumeText = (id) => (id[0] === 'c' ? ASSUME_OK : ASSUME_BAD)[Number(id.slice(1))];

function buildPredpoklady({ order }) {
  const options = order.map((id) => ({ id, text: assumeText(id) }));
  const good = order.filter((id) => id[0] === 'c');
  return mk('predpoklady', {
    data: { order },
    task: 'Označte všechny předpoklady modelu dokonalé konkurence.',
    answerSpec: { kind: 'multichoice', value: good, options },
    conclusion: `Předpoklady dokonalé konkurence jsou: ${good.map((id) => assumeText(id).toLowerCase()).join('; ')}.`,
    solution: [
      { title: 'Co model předpokládá', text: 'Dokonale konkurenční trh má pět znaků: velký počet malých účastníků, stejný produkt, volný vstup a výstup, dokonalé informace a firmy jako příjemce ceny.',
        board: [line('\\text{mnoho}\\ \\text{firem}\\ \\&\\ \\text{kupujících}'), line('\\text{homogenní produkt, volný vstup, informace}')] },
      { title: 'Vyřadíme nesprávné možnosti', text: `Nesprávné jsou možnosti, které popisují nedokonalou konkurenci nebo zásah státu: ${order.filter((id) => id[0] === 'w').map((id) => `„${assumeText(id)}“`).join('; ')}.`,
        board: [line('\\text{odlišený produkt, bariéry, vliv na cenu}\\ \\Rightarrow\\ \\text{nedokonalá konkurence}')] },
      { title: 'Správné možnosti', text: `Správně jsou: ${good.map((id) => `„${assumeText(id)}“`).join('; ')}.`,
        board: [result(`\\text{${good.length}}\\ \\text{správné}`)] },
    ],
  });
}

function genPredpoklady(rng) {
  const nOk = int(rng, 2, 4);
  const okIds = shuffle(rng, ASSUME_OK.map((_, i) => `c${i}`)).slice(0, nOk);
  const badIds = shuffle(rng, ASSUME_BAD.map((_, i) => `w${i}`)).slice(0, 6 - nOk);
  return buildPredpoklady({ order: shuffle(rng, [...okIds, ...badIds]) });
}

// ---------- typ: pravda, nebo nepravda ----------
// kn-* jsou úkoly ano/ne z části C cvičebnice kap. 6 (správně a: A, b: A, c: N, d: N, e: N, f: N, g: A, h: N, j: A, k: A, m: A, n: A, s: A).
const STATEMENTS = [
  { id: 'kn-a', text: 'Pokud firmy dosahují pouze normálního zisku, znamená to, že čistý ekonomický zisk je nulový.', truth: true, why: 'Normální zisk je výnos pokrývající alternativní náklady a je zahrnutý v nákladech. Ekonomický zisk je to, co zbyde navíc, a ten je nulový.' },
  { id: 'kn-b', text: 'Jestliže variabilní náklady jsou trvale vyšší než celkové příjmy, firma by měla ukončit činnost v daném odvětví.', truth: true, why: 'Příjmy nepokryjí ani variabilní náklady. Každý vyrobený kus by ztrátu prohluboval, takže firma skončí.' },
  { id: 'kn-c', text: 'Firma v dokonalé konkurenci by měla vyrábět na úrovni minimálních mezních nákladů.', truth: false, why: 'Firma vyrábí tam, kde se cena rovná mezním nákladům ($P=MC$), nikoli v minimu mezních nákladů.' },
  { id: 'kn-d', text: 'Asymetrické informace jsou nezbytnou podmínkou modelu dokonalé konkurence.', truth: false, why: 'Model naopak předpokládá dokonalou informovanost všech účastníků trhu. Asymetrické informace do něj nepatří.' },
  { id: 'kn-e', text: 'V dokonale konkurenčním odvětví nelze za žádných podmínek dosahovat kladného čistého ekonomického zisku.', truth: false, why: 'V krátkém období lze zisk dosáhnout, například při vyšší ceně. Teprve vstup nových firem ho v dlouhém období odbourá.' },
  { id: 'kn-f', text: 'Dokonalou konkurenci chápe ekonomická teorie jako tržní situaci bez zásahu státu.', truth: false, why: 'Dokonalá konkurence je tržní struktura se splněnými předpoklady (mnoho účastníků, homogenní produkt, volný vstup, dokonalé informace). Nejde jen o nepřítomnost státu.' },
  { id: 'kn-g', text: 'Při růstu poptávky cena roste nejvíce ve velmi krátkém období.', truth: true, why: 'Ve velmi krátkém období je nabídka téměř pevná, a proto se poptávka projeví hlavně v ceně. Později firmy zvýší výrobu a vstoupí noví výrobci.' },
  { id: 'kn-h', text: 'Dokonale konkurenční firma vždy usiluje o výrobu v bodě odpovídajícím minimu křivky AC.', truth: false, why: 'Firma maximalizuje zisk při $P=MC$. Minimum $AC$ je výsledek až dlouhodobé rovnováhy, nikoli cíl firmy.' },
  { id: 'kn-j', text: 'Firmy operující pod bodem vyrovnání mohou krátkodobě pokračovat v činnosti s nadějí, že nejprve ostatní firmy opustí odvětví a v důsledku toho vzroste cena.', truth: true, why: 'Pokud cena kryje variabilní náklady, je krátkodobě lepší vyrábět se ztrátou. Odchod jiných firem sníží nabídku a cena vzroste.' },
  { id: 'kn-k', text: 'Dokonale konkurenční firmy vyrábějí zcela identické výrobky (homogenní produkt).', truth: true, why: 'Homogenní produkt je jedním z předpokladů, díky němuž kupující nerozlišují mezi prodejci.' },
  { id: 'kn-m', text: 'Předpoklad dokonalé informovanosti všech subjektů je nezbytnou podmínkou modelu dokonalé konkurence.', truth: true, why: 'Všichni účastníci musí znát ceny a podmínky. Jinak by cena nebyla jednotná.' },
  { id: 'kn-n', text: 'Jestliže cena, za kterou se prodávají výrobky dokonale konkurenčního odvětví, je vyšší než dlouhodobé minimum AC, potom budou do odvětví vstupovat nové firmy.', truth: true, why: 'Nad minimem $AC$ je ekonomický zisk, který láká nové firmy. Nabídka vzroste a cena klesne zpět k minimu $AC$.' },
  { id: 'kn-s', text: 'Teorém (model) pavučiny je jednoduchý dynamický model rovnováhy trhu předpokládající zpoždění na straně nabídky.', truth: true, why: 'Výrobci reagují na cenu z minulého období, protože výrobu nelze změnit okamžitě.' },
  { id: 'own-1', text: 'Křivka poptávky po produkci jedné dokonale konkurenční firmy je vodorovná (dokonale elastická).', truth: true, why: 'Firma prodá při tržní ceně libovolné množství a při vyšší ceně nic. Cena je pro ni daná.' },
  { id: 'own-2', text: 'Mezní příjem dokonale konkurenční firmy je menší než cena produktu.', truth: false, why: 'Cena se s množstvím nemění, takže každý další kus přinese příjem rovný ceně: $MR=P$.' },
  { id: 'own-3', text: 'Křivkou nabídky dokonale konkurenční firmy v krátkém období je rostoucí část křivky MC nad minimem AVC.', truth: true, why: 'Při každé ceně firma vyrábí tam, kde $P=MC$, ale jen pokud cena pokrývá $AVC$.' },
  { id: 'own-4', text: 'Bod uzavření firmy leží v minimu průměrných celkových nákladů AC.', truth: false, why: 'Bod uzavření leží v minimu $AVC$. V minimu $AC$ je bod vyrovnání.' },
  { id: 'own-5', text: 'V dlouhodobé rovnováze mají dokonale konkurenční firmy nulový ekonomický zisk.', truth: true, why: 'Volný vstup a výstup tlačí cenu k minimu $AC$, kde příjmy právě pokryjí všechny náklady.' },
  { id: 'own-6', text: 'Pavučina diverguje, je-li poptávka méně elastická než nabídka.', truth: true, why: 'Při malé reakci kupujících na cenu vyvolá výkyv nabídky ještě větší výkyv ceny. Trh se od rovnováhy vzdaluje.' },
  { id: 'own-7', text: 'Firma s cenou mezi AVC a AC vyrábí v krátkém období se ztrátou, protože tak ztratí méně než při zavření.', truth: true, why: 'Při zavření by ztratila celé fixní náklady. Výroba část fixních nákladů pokryje.' },
  { id: 'own-8', text: 'Fixní náklady mění optimální výstup firmy v krátkém období, protože vstupují do mezních nákladů.', truth: false, why: 'Fixní náklady na výstupu nezávisí, do mezních nákladů nevstupují a rovnici $P=MC$ nezmění. Ovlivní jen výši zisku.' },
  { id: 'own-9', text: 'Dokonale konkurenční firma může zvýšit cenu produktu tím, že omezí svůj výstup.', truth: false, why: 'Firma je příjemce ceny. Její výstup je vůči trhu zanedbatelný, a cenu proto neovlivní.' },
  { id: 'own-10', text: 'Nabídka odvětví v krátkém období vznikne sečtením množství, která firmy nabízejí při dané ceně.', truth: true, why: 'Jde o horizontální součet individuálních nabídek.' },
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
    source: book ? { chapter: 6, number: `C-${id.slice(3)}` } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a najdeme pojem, na kterém stojí.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'prijemce-ceny', q: 'Co znamená, že dokonale konkurenční firma je příjemcem ceny?', right: 'Firma nemůže cenu ovlivnit a prodává za tržní cenu libovolné množství.', wrong: ['Firma stanovuje cenu podle svých nákladů.', 'Firma může cenu zvýšit omezením výstupu.', 'Cenu firmě přikazuje stát.'] },
  { id: 'mezni-prijem', q: 'Čemu se rovná mezní příjem dokonale konkurenční firmy?', right: 'Ceně produktu (MR = P = AR).', wrong: ['Součtu fixních a variabilních nákladů.', 'Polovině ceny produktu.', 'Mezním nákladům při jakémkoli výstupu.'] },
  { id: 'rovnovaha-firmy', q: 'Jaká podmínka platí v rovnováze dokonale konkurenční firmy (při maximu zisku)?', right: 'Cena se rovná mezním nákladům (P = MC).', wrong: ['Cena se rovná průměrným fixním nákladům.', 'Mezní náklady dosahují minima.', 'Celkové příjmy se rovnají fixním nákladům.'] },
  { id: 'bod-uzavreni', q: 'Co je bod uzavření firmy?', right: 'Bod, kde se cena rovná minimu průměrných variabilních nákladů (P = min AVC = MC).', wrong: ['Bod, kde se cena rovná minimu průměrných celkových nákladů.', 'Bod, kde se MC rovná nule.', 'Bod, kde jsou celkové příjmy rovny fixním nákladům.'] },
  { id: 'bod-vyrovnani', q: 'Co je bod vyrovnání firmy?', right: 'Bod, kde P = MC = min AC, tedy firma má nulový ekonomický zisk.', wrong: ['Bod, kde se cena rovná minimu AVC.', 'Bod, kde firma dosahuje maximálního zisku.', 'Bod, kde se AFC rovná AVC.'] },
  { id: 'nabidka-firmy', q: 'Jaká je křivka nabídky dokonale konkurenční firmy v krátkém období?', right: 'Rostoucí část křivky MC nad minimem AVC.', wrong: ['Celá křivka AC.', 'Křivka AVC od nuly.', 'Vodorovná čára v úrovni ceny.'] },
  { id: 'normalni-zisk', q: 'Co je normální zisk?', right: 'Výnos, který pokrývá alternativní náklady podnikatele a je součástí nákladů; ekonomický zisk je přitom nulový.', wrong: ['Zisk, který zůstane firmě po zaplacení daní.', 'Zisk nad všemi náklady včetně alternativních.', 'Příjem z prodeje jednoho kusu.'] },
  { id: 'ekonomicky-zisk', q: 'Jak se v grafu změří celkový zisk dokonale konkurenční firmy?', right: 'Obdélníkem s výškou P − AC a šířkou q (zisk = (P − AC) krát optimální množství).', wrong: ['Plochou pod křivkou MC.', 'Výškou P − AVC krát cena.', 'Vzdáleností mezi MC a AVC při optimálním množství.'] },
  { id: 'dlouha-rovnovaha', q: 'Kdy je dokonale konkurenční odvětví v dlouhodobé rovnováze?', right: 'Firmy maximalizují zisk, mají nulový ekonomický zisk (žádný vstup ani výstup firem) a produkce odpovídá poptávce.', wrong: ['Když každá firma dosahuje maximálního ekonomického zisku.', 'Když cena roste a firmy stále vstupují.', 'Když je nabídka odvětví vodorovná.'] },
  { id: 'teorem-pavuciny', q: 'Co vysvětluje teorém pavučiny?', right: 'Časový nesoulad v reakcích nabídky a poptávky na změnu ceny (nabídka reaguje se zpožděním).', wrong: ['Vztah mezi cenou a poptávkou při ceteris paribus.', 'Rovnováhu monopolu.', 'Vliv daně na rozdělení užitku.'] },
  { id: 'konverguje', q: 'Kdy pavučina konverguje?', right: 'Když je poptávka elastičtější než nabídka (nabídka je v grafu strmější než poptávka).', wrong: ['Když je poptávka méně elastická než nabídka.', 'Když jsou obě křivky rovnoběžné.', 'Když firmy reagují okamžitě na aktuální cenu.'] },
  { id: 'lis', q: 'Jak vypadá dlouhodobá křivka nabídky odvětví při konstantních cenách vstupů?', right: 'Vodorovná v úrovni minimální ceny (minima dlouhodobých AC).', wrong: ['Klesající, protože firmy vstupují.', 'Rostoucí podle MC jedné firmy.', 'Svislá v úrovni rovnovážného množství.'] },
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
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti zaměňují sousední pojmy (například $AVC$ a $AC$) nebo obracejí vztah. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function firmCase(env, situace, qs) {
  const P = r6(situace === 'uzavreni' ? env.avcMin : env.mc(qs));
  const q = situace === 'uzavreni' ? env.m : qs;
  const AC = r6(env.ac(q));
  const base = firmViz(env);
  const withP = firmViz(env, { curves: [priceLine(P)], points: [{ x: q, y: P, label: situace === 'uzavreni' ? 'U' : 'q*', guides: true }], alt: 'Cenová čára a optimální výstup' });
  const areas = situace === 'uzavreni' ? [] : [{ between: [lit(P), lit(AC)], from: 0, to: q, label: situace === 'zisk' ? 'zisk' : 'ztráta', color: situace === 'zisk' ? 'green' : 'warn' }];
  const full = firmViz(env, { curves: [priceLine(P)], points: [{ x: q, y: P, label: situace === 'uzavreni' ? 'U' : 'q*', guides: true }], areas, alt: situace === 'zisk' ? 'Firma se ziskem' : situace === 'ztrata' ? 'Firma se ztrátou' : 'Firma v bodě uzavření' });
  return { base, withP, full, P, q, AC };
}

function buildGrafFirma({ a, c, m, q0, situace, qs }) {
  const env = cubicEnv({ a, c, m, q0 });
  const g = firmCase(env, situace, qs);
  const what = {
    zisk: 'cenu nad minimem AC: vyznačte optimální výstup a plochu zisku',
    ztrata: 'cenu mezi minimem AVC a minimem AC: vyznačte optimální výstup a plochu ztráty',
    uzavreni: 'cenu v minimu AVC: vyznačte bod uzavření',
  }[situace];
  const sit = { zisk: 'se ziskem', ztrata: 'se ztrátou', uzavreni: 'v bodě uzavření' }[situace];
  return mk('graf-firma', {
    part: 'zkouska',
    points: 2,
    data: { a, c, m, q0, situace, qs },
    task: `Nakreslete do grafu s osami q (množství) a Kč nákladové křivky MC, AC a AVC dokonale konkurenční firmy a její individuální poptávkovou křivku (cenu). Zvolte ${what}. Firma je v krátkém období ${sit}.`,
    answerSpec: { kind: 'whiteboard', reference: { kind: 'econ', data: g.full.data } },
    conclusion: situace === 'zisk' ? 'Cena je nad AC při optimálním výstupu, zisk je obdélník (P − AC) krát množství.' : situace === 'ztrata' ? 'Cena je pod AC, ale nad AVC: ztráta je obdélník (AC − P) krát množství, firma vyrábí dál.' : 'Cena je rovna minimu AVC: v tomto bodě je firma na hranici ukončení výroby.',
    source: { chapter: 6, number: situace === 'zisk' ? 1 : 2 },
    solution: [
      { title: 'Nákladové křivky', text: 'Nakreslíme osy a tři křivky: U-křivky $AC$ a $AVC$ a křivku $MC$, která protíná obě v jejich minimech. $AC$ leží nad $AVC$ o průměrné fixní náklady.', viz: g.base },
      { title: situace === 'uzavreni' ? 'Cena v minimu AVC' : 'Cena a optimální výstup', text: situace === 'uzavreni' ? 'Vodorovná čára $P=MR$ se dotkne křivky $AVC$ v jejím minimu. Tam protíná i křivku $MC$ (bod U).' : 'Vodorovná čára $P=MR=AR$ je poptávka po produkci firmy. Protíná křivku $MC$ v bodě, který určuje optimální výstup $q^*$.', viz: g.withP },
      { title: situace === 'zisk' ? 'Plocha zisku' : situace === 'ztrata' ? 'Plocha ztráty' : 'Závěr: bod uzavření', text: situace === 'zisk' ? 'Při $q^*$ je cena nad $AC$. Obdélník mezi cenou a $AC$ o šířce $q^*$ je celkový zisk.' : situace === 'ztrata' ? 'Při $q^*$ je cena pod $AC$. Obdélník mezi $AC$ a cenou o šířce $q^*$ je celková ztráta. Cena je přitom nad $AVC$, takže firma ve výrobě pokračuje.' : 'Při nižší ceně by firma výrobu ukončila, při vyšší ji rozšíří po křivce $MC$.', viz: g.full },
    ],
  });
}

function genGrafFirma(rng) {
  const p = genCubicParams(rng); const situace = pick(rng, ['zisk', 'ztrata', 'uzavreni']);
  const qs = situace === 'zisk' ? p.q0 + int(rng, 1, 2) : situace === 'ztrata' ? int(rng, p.m + 1, p.q0 - 1) : p.m;
  return buildGrafFirma({ ...p, situace, qs });
}

function buildGrafNabidka({ a, c, m, q0, obdobi }) {
  const env = cubicEnv({ a, c, m, q0 });
  const short = obdobi === 'kratke';
  const from = short ? m : q0; const P0 = short ? env.avcMin : env.acMin;
  const base = firmViz(env);
  const point = { x: from, y: P0, label: short ? 'U' : 'R', guides: true };
  const withPoint = firmViz(env, { points: [point], alt: short ? 'Bod uzavření v minimu AVC' : 'Bod vyrovnání v minimu AC' });
  const full = firmViz(env, { curves: [{ expr: env.mcE, domain: [from, env.xmax], label: 'S', color: 'accent' }], points: [point], alt: 'Křivka nabídky firmy jako část MC' });
  return mk('graf-nabidka-firmy', {
    part: 'zkouska',
    points: 2,
    data: { a, c, m, q0, obdobi },
    task: `Nakreslete do grafu s osami q a Kč nákladové křivky MC, AC a AVC dokonale konkurenční firmy a vyznačte křivku nabídky firmy ${short ? 'v krátkém období a bod uzavření' : 'v dlouhém období a bod vyrovnání'}.`,
    answerSpec: { kind: 'whiteboard', reference: { kind: 'econ', data: full.data } },
    conclusion: short ? 'Nabídka firmy v krátkém období je rostoucí část MC nad minimem AVC.' : 'Nabídka firmy v dlouhém období je rostoucí část MC nad minimem AC.',
    source: { chapter: 6, number: 'D-3' },
    solution: [
      { title: 'Nákladové křivky', text: 'Nakreslíme $MC$, $AC$ a $AVC$. $MC$ protíná $AVC$ i $AC$ v jejich minimech.', viz: base },
      { title: short ? 'Bod uzavření' : 'Bod vyrovnání', text: short ? 'Bod uzavření U je v minimu $AVC$. Pod touto cenou firma nevyrábí.' : 'Bod vyrovnání R je v minimu $AC$. Pod touto cenou by firma měla v dlouhém období ztrátu a z odvětví odejde.', viz: withPoint },
      { title: 'Křivka nabídky', text: short ? 'Při každé ceně nad bodem U firma vyrábí tam, kde $P=MC$. Nabídkou je proto část $MC$ od bodu U výše.' : 'V dlouhém období nabízí firma jen při cenách nad minimem $AC$. Nabídkou je část $MC$ od bodu R výše.', viz: full },
    ],
  });
}

function genGrafNabidka(rng) {
  return buildGrafNabidka({ ...genCubicParams(rng), obdobi: pick(rng, ['kratke', 'dlouhe']) });
}

// Odvětví v dlouhém období: růst nebo pokles poptávky, vstup nebo odchod firem, vodorovná dlouhodobá nabídka.
const IND_BASE = { a: 100, b: 2, c: 10, d: 1 };
const IND_CASE = {
  rust: { dem: { a: 130, b: 2, c: 10, d: 1 }, sup: { a: 130, b: 2, c: 40, d: 1 }, B: [50, 40], C: [70, 30] },
  pokles: { dem: { a: 70, b: 2, c: 10, d: 1 }, sup: { a: 70, b: 2, c: -20, d: 1 }, B: [30, 20], C: [10, 30] },
};
function industryViz(smer, stage) {
  const k = IND_CASE[smer];
  const sx = (c) => `(x - ${lit(c)})/1`;
  const curves = [
    { expr: `(${IND_BASE.a} - x)/${IND_BASE.b}`, label: 'D0', color: 'blue' },
    { expr: sx(IND_BASE.c), label: 'S0', color: 'chalk' },
  ];
  const points = [{ x: 40, y: 30, label: 'A' }];
  if (stage >= 1) { curves.push({ expr: `(${k.dem.a} - x)/${k.dem.b}`, label: 'D1', color: 'accent', dashed: true }); points.push({ x: k.B[0], y: k.B[1], label: 'B' }); }
  if (stage >= 2) { curves.push({ expr: sx(k.sup.c), label: 'S1', color: 'warn', dashed: true }); points.push({ x: k.C[0], y: k.C[1], label: 'C' }); }
  if (stage >= 3) curves.push({ expr: '30', label: 'LIS', color: 'green', dashed: true });
  return { kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 140], range: [0, 60], curves, points, arrows: [], areas: [], alt: 'Dlouhodobá rovnováha odvětví' } };
}

function buildGrafOdvetvi({ smer }) {
  const rust = smer === 'rust';
  const full = industryViz(smer, 3);
  return mk('graf-odvetvi', {
    part: 'zkouska',
    points: 2,
    data: { smer },
    task: `Nakreslete do grafu s osami Q a P dokonale konkurenční odvětví ve výchozí rovnováze A. Zakreslete ${rust ? 'růst' : 'pokles'} poptávky, krátkodobou rovnováhu B, ${rust ? 'vstup nových firem' : 'odchod firem z odvětví'} a novou dlouhodobou rovnováhu C. Předpokládejte konstantní ceny vstupů a vyznačte dlouhodobou křivku nabídky odvětví (LIS).`,
    answerSpec: { kind: 'whiteboard', reference: { kind: 'econ', data: full.data } },
    conclusion: `Dlouhodobá křivka nabídky odvětví je vodorovná v úrovni původní ceny; množství se ${rust ? 'zvýšilo' : 'snížilo'}.`,
    source: { chapter: 6, number: 'D-1' },
    solution: [
      { title: 'Výchozí rovnováha A', text: 'Nakreslíme poptávku $D_0$ a krátkodobou nabídku $S_0$. V průsečíku je výchozí dlouhodobá rovnováha A, kde firmy mají jen normální zisk.', viz: industryViz(smer, 0) },
      { title: `${rust ? 'Růst' : 'Pokles'} poptávky: bod B`, text: `Poptávka se posune ${rust ? 'doprava' : 'doleva'} na $D_1$. Nabídka se v krátkém období nezmění, a nová krátkodobá rovnováha B má proto ${rust ? 'vyšší cenu. Firmy mají zisk' : 'nižší cenu. Firmy mají ztrátu'}.`, viz: industryViz(smer, 1) },
      { title: `${rust ? 'Vstup' : 'Odchod'} firem: bod C`, text: `${rust ? 'Zisk láká do odvětví nové firmy, nabídka se posune doprava na $S_1$' : 'Ztráta vyhání firmy z odvětví, nabídka se posune doleva na $S_1$'}. Proces končí, až je cena opět rovna minimu dlouhodobých $AC$, tedy původní ceně (bod C).`, viz: industryViz(smer, 2) },
      { title: 'Dlouhodobá křivka nabídky', text: 'Spojnice dlouhodobých rovnováh A a C je vodorovná čára LIS (při konstantních cenách vstupů). V dlouhém období se mění jen množství, cena zůstává u minima $AC$.', viz: full },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}

const types = [
  type('optimum', 'Optimální výstup z P = MC', genOptimum, buildOptimum),
  type('cena-z-vystupu', 'Cena z optimálního výstupu', genCenaZVystupu, buildCenaZVystupu),
  type('zisk-ztrata', 'Zisk nebo ztráta v optimu', genZisk, buildZisk),
  type('rozhodnuti', 'Vyrábět, nebo ukončit?', genRozhodnuti, buildRozhodnuti),
  type('tabulka-rozhodnuti', 'Tabulka rozhodnutí v krátkém a dlouhém období', genTabRozh, buildTabRozh),
  type('optimum-tabulka', 'Optimální objem z tabulky nákladů', genOptTab, buildOptTab),
  type('tabulka-prijmu', 'Tabulka příjmů, nákladů a zisku', genTabPrijmu, buildTabPrijmu),
  type('bod-uzavreni', 'Bod uzavření firmy', (rng) => buildUzavreni({ ...genCubicParams(rng), ask: pick(rng, ['P', 'q']) }), buildUzavreni),
  type('bod-vyrovnani', 'Bod vyrovnání firmy', genVyrovnani, buildVyrovnani),
  type('rozpeti-cen', 'Cenové rozpětí výroby se ztrátou', (rng) => buildRozpeti(genCubicParams(rng)), buildRozpeti),
  type('zisk-obdelnik', 'Zisk jako obdélník v grafu', genObdelnik, buildObdelnik),
  type('odvetvi-rovnovaha', 'Rovnováha odvětví s identickými firmami', genOdvetvi, buildOdvetvi),
  type('nabidka-odvetvi', 'Nabídka odvětví jako součet nabídek firem', genNabidkaOdv, buildNabidkaOdv),
  type('dlouha-rovnovaha', 'Dlouhodobá rovnováha odvětví', genDlouha, buildDlouha),
  type('nulovy-zisk', 'Nulový zisk z příjmů a nákladů', genNulovy, buildNulovy),
  type('pavucina', 'Teorém pavučiny', genPavucina, buildPavucina),
  type('predpoklady', 'Předpoklady dokonalé konkurence', (rng) => genPredpoklady(rng), buildPredpoklady),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, STATEMENTS.map((x) => x.id)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, DEFS.map((x) => x.id)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-firma', 'Nakresli firmu se ziskem, ztrátou, v bodě uzavření (zkouška)', genGrafFirma, buildGrafFirma),
  type('graf-nabidka-firmy', 'Nakresli nabídku firmy (zkouška)', genGrafNabidka, buildGrafNabidka),
  type('graf-odvetvi', 'Nakresli dlouhodobou rovnováhu odvětví (zkouška)', (rng) => buildGrafOdvetvi({ smer: pick(rng, ['rust', 'pokles']) }), buildGrafOdvetvi),
];

// ---------- výklad ----------
const DEMO = cubicEnv({ a: 40, c: 1, m: 3, q0: 6 }); // MC = 40 − 12q + 3q², AVC min 31 při q = 3, AC min 76 při q = 6
DEMO.xmax = 8; DEMO.pmax = 150;
const demoGraph = (extra = {}) => firmViz(DEMO, extra);
const demoQ = (q) => ({ P: DEMO.mc(q), AC: r6(DEMO.ac(q)) });
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 100], range: [0, 60], curves, ...extra } });

const COB_CONV = cobweb('P', [100, 1, 20, 2]);
const COB_DIV = cobweb('P', [100, 2, 40, 1]);

const theory = [
  { heading: 'Předpoklady dokonalé konkurence', term: 'Dokonalá konkurence',
    text: 'Dokonalá konkurence je modelový typ trhu, který se opírá o pět předpokladů:\n\n• velký počet prodávajících a kupujících, z nichž žádný sám nezmění cenu,\n• homogenní produkt: výrobky různých firem jsou stejné,\n• volný vstup do odvětví a výstup z něj,\n• dokonalá informovanost všech účastníků,\n• firmy jsou příjemci ceny: přijímají ji tak, jak ji určí trh.\n\nSkutečné trhy tyto podmínky splňují jen přibližně (třeba některé zemědělské komodity). Model je přesto užitečný jako srovnání pro reálné trhy a pro pochopení, jak se tvoří cena a nabídka.',
    viz: view([{ expr: '50 - x/2', label: 'D', color: 'blue' }, { expr: 'x - 10', label: 'S', color: 'chalk' }, { expr: '30', label: 'd firmy', color: 'accent', dashed: true }], { points: [{ x: 40, y: 30, label: 'E', guides: true }] }),
    mistakes: ['Dokonalá konkurence neznamená jen „stát se nevměšuje“. Musí platit všech pět předpokladů najednou.', 'Asymetrické informace do modelu nepatří. Model předpokládá dokonalou informovanost.'] },
  { heading: 'Příjem firmy: P = AR = MR', term: 'Mezní příjem',
    text: 'Cenu určuje trh jako celek (průsečík poptávky a nabídky odvětví). Jedna malá firma ji nezmění: při tržní ceně prodá libovolné množství, při vyšší ceně nic. Křivka poptávky po produkci jedné firmy je proto vodorovná (dokonale elastická).\n\nCelkový příjem roste přímo úměrně množství. Průměrný příjem je příjem na jeden kus a mezní příjem přírůstek příjmu z dalšího kusu. Oba se rovnají ceně, a v grafu proto splývají s poptávkou firmy:',
    tex: 'TR=P\\cdot q,\\qquad AR=\\frac{TR}{q}=P,\\qquad MR=\\frac{\\Delta TR}{\\Delta q}=P',
    viz: view([{ expr: '30', label: 'd = AR = MR', color: 'accent' }], { range: [0, 60], points: [{ x: 40, y: 30, label: 'P' }] }),
    mistakes: ['U monopolu je mezní příjem nižší než cena. U dokonalé konkurence se mu rovná, protože firma nemusí snižovat cenu při růstu prodeje.'] },
  { heading: 'Optimální výstup: pravidlo P = MC', term: 'Rovnováha firmy',
    text: 'Firma maximalizuje zisk, když vyrábí tak, aby se mezní příjem rovnal mezním nákladům (zlaté pravidlo). V dokonalé konkurenci je $MR=P$, takže platí:',
    tex: 'P=MR=MC',
    viz: demoGraph({ curves: [priceLine(103)], points: [{ x: 7, y: 103, label: 'q*', guides: true }], alt: 'Optimální výstup v bodě P = MC' }),
    mistakes: ['Pravidlo $P=MC$ říká, kde je zisk největší, ne zda je kladný. Zisk nebo ztrátu ukáže až porovnání $P$ s $AC$.', 'Je-li $MR>MC$, vyplatí se výrobu zvýšit, je-li $MR<MC$, snížit. Zisk je největší tam, kde se obě veličiny rovnají.'] },
  { heading: 'Zisk firmy v grafu', term: 'Ekonomický zisk',
    text: 'Zisk na jeden kus je rozdíl ceny (průměrného příjmu) a průměrných celkových nákladů, celkový zisk je jeho násobek optimálním množstvím:',
    tex: '\\pi=(P-AC)\\cdot q^*',
    viz: demoGraph({ curves: [priceLine(103)], points: [{ x: 7, y: 103, label: 'q*', guides: true }], areas: [{ between: ['103', lit(demoQ(7).AC)], from: 0, to: 7, label: 'zisk', color: 'green' }], alt: 'Zisk jako obdélník nad křivkou AC' }),
    mistakes: ['Zisk je plocha obdélníku mezi cenou a křivkou $AC$ (ne $AVC$) a osou. Výška je $P-AC$ při $q^*$, šířka $q^*$.'] },
  { heading: 'Ztráta firmy a rozhodnutí v krátkém období', term: 'Ztráta firmy',
    text: 'Je-li cena pod $AC$, ale nad $AVC$, má firma ztrátu. V krátkém období je přesto lepší vyrábět: příjmy pokryjí všechny variabilní náklady a ještě část fixních. Kdyby firma zavřela, ztratila by celé fixní náklady. Ztráta je pak obdélník mezi $AC$ a cenou.\n\nJe-li cena pod $AVC$, firma nepokryje ani variabilní náklady, každý kus by ztrátu prohluboval, a proto výrobu zastaví.',
    viz: demoGraph({ curves: [priceLine(40)], points: [{ x: 4, y: 40, label: 'q*', guides: true }], areas: [{ between: ['40', lit(demoQ(4).AC)], from: 0, to: 4, label: 'ztráta', color: 'warn' }], alt: 'Ztráta, cena nad AVC a pod AC' }),
    mistakes: ['Ztráta v krátkém období neznamená automaticky odchod. Rozhoduje, zda cena pokrývá $AVC$.'] },
  { heading: 'Bod uzavření', term: 'Bod uzavření',
    text: 'Bod uzavření je v minimu průměrných variabilních nákladů, kde $MC$ protíná $AVC$. Platí tu $P=\\min AVC=MC$. Při nižší ceně firma v krátkém období výrobu ukončí, při vyšší ji provozuje, i když má ztrátu.',
    tex: 'P=\\min AVC=MC',
    viz: demoGraph({ curves: [priceLine(31, 'P')], points: [{ x: 3, y: 31, label: 'U', guides: true }], alt: 'Bod uzavření v minimu AVC' }),
    mistakes: ['Bod uzavření není v minimu $AC$, ale v minimu $AVC$. V minimu $AC$ je bod vyrovnání.'] },
  { heading: 'Bod vyrovnání a dlouhé období', term: 'Bod vyrovnání',
    text: 'V dlouhém období jsou všechny náklady variabilní. Firma, která trvale nepokryje celé průměrné náklady, z odvětví odejde. Bod vyrovnání je v minimu $AC$. Platí tu $P=MC=AC$, firma má nulový ekonomický zisk a získává jen normální zisk: výnos, který pokrývá alternativní náklady podnikatele.',
    tex: 'P=MR=MC=AC',
    viz: demoGraph({ curves: [priceLine(76, 'P')], points: [{ x: 6, y: 76, label: 'R', guides: true }], alt: 'Bod vyrovnání v minimu AC' }),
    mistakes: ['Nulový ekonomický zisk neznamená, že firma nic nevydělá. Normální zisk je v nákladech započítaný.'] },
  { heading: 'Křivka nabídky firmy', term: 'Křivka nabídky firmy',
    text: 'Při každé ceně firma vyrábí tam, kde $P=MC$. Proto je nabídkou firmy křivka mezních nákladů, ale jen její rostoucí část nad bodem uzavření:\n\n• v krátkém období je nabídkou firmy rostoucí část $MC$ nad minimem $AVC$,\n• v dlouhém období je nabídkou firmy rostoucí část $MC$ nad minimem $AC$.',
    viz: demoGraph({ curves: [{ expr: DEMO.mcE, domain: [3, 8], label: 'S', color: 'accent' }], points: [{ x: 3, y: 31, label: 'U', guides: true }], alt: 'Křivka nabídky firmy jako část MC' }),
    mistakes: ['Celá křivka $MC$ není nabídkou firmy. Pod cenou odpovídající minimu $AVC$ firma nevyrábí nic.'] },
  { heading: 'Nabídka odvětví a krátkodobá rovnováha', term: 'Nabídka odvětví',
    text: 'Nabídka odvětví vznikne horizontálním součtem nabídek všech firem: při každé ceně sečteme množství, která jednotlivé firmy nabídnou. Sčítá se množství, nikoli cena. Poptávka odvětví je naopak součtem poptávek kupujících.\n\nV krátkém období je odvětví v rovnováze, když se poptávané množství rovná nabízenému. V tržní rovnováze pak platí, že mezní užitek kupujících se rovná mezním nákladům firem: $MU=MC$.',
    viz: view([{ expr: '10 + 2*x', label: 'S1', color: 'green' }, { expr: '10 + 4*x', label: 'S2', color: 'blue' }, { expr: '10 + 4*x/3', label: 'S', color: 'accent' }], { domain: [0, 10], range: [0, 50] }),
    mistakes: ['Individuální nabídky se sčítají vodorovně (množství při stejné ceně), ne svisle.', 'Prostý součet platí při neměnných cenách vstupů a v krátkém období, kdy se nemění počet firem.'] },
  { heading: 'Rovnováha odvětví v dlouhém období', term: 'Dlouhodobá rovnováha odvětví',
    text: 'Je-li v odvětví zisk, lákají se nové firmy, nabídka roste a cena klesá. Při ztrátě firmy odcházejí, nabídka klesá a cena roste. Proces končí, když cena dosáhne minima dlouhodobých průměrných nákladů. Pak je odvětví v dlouhodobé rovnováze, jestliže platí současně:\n\n• všechny firmy maximalizují zisk ($P=MC$),\n• žádná firma nevstupuje ani neodchází, protože ekonomický zisk je nulový ($P=AC$),\n• vyrobené množství odpovídá poptávce.\n\nPři konstantních cenách vstupů je dlouhodobá nabídka odvětví vodorovná v úrovni minima $AC$. Změna poptávky pak mění jen množství, nikoli cenu.',
    viz: industryViz('rust', 3),
    mistakes: ['Volný vstup je nezbytný: bez něj by zisk nepřitahoval nové firmy a cena by neklesla k minimu $AC$.', 'Dlouhodobá nabídka odvětví nemusí být vodorovná vždy: platí pro konstantní ceny vstupů.'] },
  { heading: 'Teorém pavučiny: konvergující pavučina', term: 'Teorém pavučiny',
    text: 'Teorém pavučiny je jednoduchý dynamický model trhu: kupující reagují na aktuální cenu, ale výrobci mají zpoždění a rozhodují se podle ceny z minulého období. Cena je proto v každém kole určená množstvím z předchozího kola.\n\nKonvergující pavučina: odchylky od rovnováhy se zmenšují a cena se spirálou přibližuje rovnovážné ceně. Nastává, když je nabídka v grafu strmější než poptávka (poptávka je elastičtější než nabídka).',
    viz: COB_CONV.viz,
    mistakes: ['Pavučina konverguje u elastické poptávky a málo elastické nabídky. Snadno se to zamění.'] },
  { heading: 'Divergující pavučina', term: 'Divergující pavučina',
    text: 'Divergující pavučina: odchylky od rovnováhy se v každém kole zvětšují a trh se od rovnováhy vzdaluje. Nastává, když je poptávka méně elastická než nabídka, tedy když křivka nabídky je v grafu plošší než křivka poptávky.\n\nKdyby byly obě stejně strmé, kmity by se nezvětšovaly ani nezmenšovaly. V praxi (např. u zemědělských komodit s dlouhým výrobním cyklem) se model používá k vysvětlení cyklických výkyvů cen.',
    viz: COB_DIV.viz,
    mistakes: ['Divergující pavučina neznamená, že trh nemá rovnováhu. Rovnováha existuje, ale trh se k ní nevrací samovolně.'] },
];
export default {
  id: 'dokonala-konkurence', title: 'Firma v podmínkách dokonalé konkurence', order: 5, theory, types,
};
