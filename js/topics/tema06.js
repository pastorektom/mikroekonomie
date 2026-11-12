// Téma 6: Nedokonalá konkurence (skripta kap. 7, prezentace 6, cvičebnice kap. 7: monopol, oligopol, monopolistická konkurence).
// Konkrétní zadání ze cvičebnice jsou jen v Supabase (content/), zde jsou generátory a výklad vlastními slovy.
// Stejný tvar jako tema02.js: theory + types (generate(rng) → solve(data)).
//
// Pozor na chyby ve cvičebnici (kap. 7, část E Řešení), které se nepřebírají:
//  - 7.1 úkol C-i („Monopol vždy dosahuje monopolní zisk“): kniha má A, správně je N (monopol může mít ztrátu).
//  - 7.3 příklad 2c: zisk není 12,25, ale 5,25 (kniha zapomněla odečíst fixní náklady 7).
//  - 7.3 příklad 5b: zisk je přesně 355 (kniha uvádí 354,6).
// Úkoly C-d (7.2, kartel) a C-e (7.3, reklama) jsou sporné a v bance tvrzení nejsou.
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'nedokonala-konkurence';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 2, ...over,
});

const r9 = (x) => Math.round(x * 1e9) / 1e9;
const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
const nice = (v) => {
  const p = 10 ** Math.floor(Math.log10(v));
  return STEPS.find((f) => f * p >= v - 1e-9) * p;
};
const asked = (flag, tex) => (flag ? result(tex) : line(tex));

// ---------- zápis rovnic ----------
const demandEq = (a, b) => `P=${cz(a)}-${coef(b, 'Q')}`;
const costLin = (F, c) => `TC=${F ? `${cz(F)}+` : ''}${coef(c, 'Q')}`;
const costQuad = (F, v, w) => `TC=${F ? `${cz(F)}+` : ''}${coef(v, 'Q')}${w ? `+${coef(w, 'Q^2')}` : ''}`;
const mcQuad = (v, w) => (w ? `${cz(v)}+${coef(2 * w, 'Q')}` : cz(v));

// ---------- grafy ----------
const D = (a, b) => ({ expr: `${a} - ${b}*x`, label: 'D', color: 'blue' });
const MRc = (a, b) => ({ expr: `${a} - ${r9(2 * b)}*x`, label: 'MR', color: 'green' });
const MCc = (v, w = 0) => ({ expr: w ? `${v} + ${r9(2 * w)}*x` : `${v}`, label: 'MC', color: 'chalk' });
const ACc = (v, w = 0, F = 0) => (F || w
  ? [{ expr: `${v}${w ? ` + ${w}*x` : ''}${F ? ` + ${F}/x` : ''}`, label: 'AC', color: 'warn' }] : []);

function econViz({ a, b, curves, points = [], areas = [], alt, aMax }) {
  const top = aMax ?? a;
  return {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(top / b)], range: [0, nice(top)], curves, points, arrows: [], areas, alt,
    },
  };
}

// ---------- základ: monopol s lineární poptávkou a konstantním MC ----------
const monoLin = ({ a, b, c }) => {
  const Q = r9((a - c) / (2 * b));
  return { Q, P: r9(a - b * Q) };
};

function profitRect(P, ac, Q) {
  return [{ between: [`${P}`, `${ac}`], from: 0, to: Q, label: 'zisk', color: 'accent' }];
}

// ---------- typ: optimum monopolu (konstantní MC, fixní náklady) ----------
const ASK1 = { Q: 'množství, které monopol vyrobí', P: 'cenu, za kterou bude prodávat', pi: 'maximální zisk monopolu (v Kč)' };

function buildMonOpt({ a, b, c, F, ask }) {
  const { Q, P } = monoLin({ a, b, c });
  const TR = r9(P * Q); const TC = r9(F + c * Q); const pi = r9(TR - TC);
  const val = { Q, P, pi }[ask];
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c), ...ACc(c, 0, F)],
    points: [{ x: Q, y: P, label: 'M', guides: true }, { x: Q, y: c, label: '' }],
    areas: profitRect(P, r9(c + F / Q), Q), alt: 'Monopol: poptávka, mezní příjem, mezní náklady a zisk',
  });
  return mk('mon-optimum', {
    data: { a, b, c, F, ask },
    task: `Monopol prodává výrobek podle poptávky P = a − bQ (P v Kč, Q v kusech) a jeho celkové náklady udává druhá rovnice. Určete ${ASK1[ask]}.`,
    promptTex: `${demandEq(a, b)},\\qquad ${costLin(F, c)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Monopol vyrobí ${czText(Q)} ks, prodá je za ${czText(P)} Kč a dosáhne zisku ${czText(pi)} Kč.`,
    source: { chapter: 7, number: '7.1/3' },
    solution: [
      { title: 'Celkový a mezní příjem', text: 'Monopol musí snížit cenu všech kusů, aby prodal víc. Celkový příjem je TR = P·Q a po dosazení z poptávky je to parabola. Mezní příjem MR je přírůstek TR. U lineární poptávky má MR stejný úsek na ose P a dvojnásobný sklon než poptávka.',
        board: [line(`TR=P\\cdot Q=(${cz(a)}-${coef(b, 'Q')})\\,Q=${cz(a)}Q-${coef(b, 'Q^2')}`), line(`MR=${cz(a)}-${coef(2 * b, 'Q')}`)] },
      { title: 'Mezní náklad', text: `Každý další kus zvýší náklady o ${czText(c)} Kč, takže mezní náklad je konstantní.${F ? ` Fixní náklady ${czText(F)} Kč se na MC nepromítnou.` : ''}`,
        board: [line(`MC=${cz(c)}`)] },
      { title: 'Optimum: MR = MC', text: 'Zisk je největší tam, kde mezní příjem právě klesne na úroveň mezního nákladu. Rovnici MR = MC vyřešíme pro Q.',
        board: [line('MR=MC'), line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c)}`), line(`${coef(2 * b, 'Q')}=${cz(a - c)}`), asked(ask === 'Q', `Q_M=${cz(Q)}`)] },
      { title: 'Cena z poptávky', text: 'Cenu monopol nečte z MR, ale z poptávky: kupující za toto množství zaplatí nejvíc cenu na křivce D.',
        board: [line(`P_M=${cz(a)}-${cz(b)}\\cdot ${cz(Q)}`), asked(ask === 'P', `P_M=${cz(P)}`)] },
      { title: 'Zisk', text: 'Zisk je celkový příjem minus celkové náklady.',
        board: [line(`TR=${cz(P)}\\cdot ${cz(Q)}=${cz(TR)}`), line(`TC=${F ? `${cz(F)}+` : ''}${cz(c)}\\cdot ${cz(Q)}=${cz(TC)}`), asked(ask === 'pi', `\\pi=TR-TC=${cz(pi)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Křivka MR protíná MC v množství ${czText(Q)}. Od tohoto množství jdeme svisle nahoru k poptávce a dostaneme cenu ${czText(P)} Kč. Zisk ${czText(pi)} Kč je plocha obdélníku mezi cenou a průměrnými náklady.`, viz: graph },
    ],
  });
}

function genMonOpt(rng) {
  const b = int(rng, 1, 5); const Qm = int(rng, 4, 20); const c = int(rng, 3, 25);
  const gross = b * Qm * Qm;
  const F = rng() < 0.25 ? 0 : 10 * int(rng, 1, Math.max(1, Math.floor((gross * 0.8) / 10)));
  return buildMonOpt({ a: c + 2 * b * Qm, b, c, F, ask: pick(rng, ['Q', 'P', 'pi']) });
}

// ---------- typ: monopol s rostoucím MC (kvadratické náklady) ----------
function buildMonKvadr({ a, b, v, w, F, ask }) {
  const Q = r9((a - v) / (2 * (b + w))); const P = r9(a - b * Q);
  const MC = r9(v + 2 * w * Q); const TR = r9(P * Q); const TC = r9(F + v * Q + w * Q * Q); const pi = r9(TR - TC);
  const val = { Q, P, pi }[ask];
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(v, w), ...ACc(v, w, F)],
    points: [{ x: Q, y: P, label: 'M', guides: true }, { x: Q, y: MC, label: '' }],
    alt: 'Monopol s rostoucími mezními náklady',
  });
  return mk('mon-kvadr', {
    data: { a, b, v, w, F, ask },
    task: `Monopol prodává podle poptávky P = a − bQ (P v Kč, Q v kusech) a jeho celkové náklady udává druhá rovnice. Určete ${ASK1[ask]}.`,
    promptTex: `${demandEq(a, b)},\\qquad ${costQuad(F, v, w)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Monopol vyrobí ${czText(Q)} ks za cenu ${czText(P)} Kč a dosáhne zisku ${czText(pi)} Kč.`,
    source: { chapter: 7, number: '7.1/2 a 7.1/5' },
    solution: [
      { title: 'Mezní příjem', text: 'Z poptávky sestavíme TR = P·Q. Mezní příjem má dvojnásobný sklon než poptávka.',
        board: [line(`TR=${cz(a)}Q-${coef(b, 'Q^2')}`), line(`MR=${cz(a)}-${coef(2 * b, 'Q')}`)] },
      { title: 'Mezní náklad z nákladové funkce', text: 'Mezní náklad je přírůstek celkových nákladů. Fixní náklady v něm nejsou, lineární člen dá svůj koeficient a kvadratický člen jeho dvojnásobek krát Q.',
        board: [line(`${costQuad(F, v, w)}`), line(`MC=${mcQuad(v, w)}`)] },
      { title: 'Optimum: MR = MC', text: 'Položíme MR = MC a členy s Q převedeme na jednu stranu.',
        board: [line(`${cz(a)}-${coef(2 * b, 'Q')}=${mcQuad(v, w)}`), line(`${cz(a - v)}=${cz(2 * b + 2 * w)}Q`), asked(ask === 'Q', `Q_M=${cz(Q)}`)] },
      { title: 'Cena z poptávky', text: 'Optimální množství dosadíme do poptávky.',
        board: [line(`P_M=${cz(a)}-${cz(b)}\\cdot ${cz(Q)}`), asked(ask === 'P', `P_M=${cz(P)}`)] },
      { title: 'Zisk', text: 'Od příjmu odečteme celkové náklady při tomto množství.',
        board: [line(`TR=${cz(P)}\\cdot ${cz(Q)}=${cz(TR)}`), line(`TC=${cz(TC)}`), asked(ask === 'pi', `\\pi=${cz(TR)}-${cz(TC)}=${cz(pi)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `MR se protíná s rostoucí MC v množství ${czText(Q)}. Cena ${czText(P)} Kč leží na poptávce nad tímto množstvím. Zisk vychází ${czText(pi)} Kč.`, viz: graph },
    ],
  });
}

function genMonKvadr(rng) {
  const b = int(rng, 1, 5); const w = int(rng, 1, 4); const v = int(rng, 2, 20); const Qm = int(rng, 3, 15);
  const gross = (b + w) * Qm * Qm;
  const F = rng() < 0.2 ? 0 : 10 * int(rng, 1, Math.max(1, Math.floor((gross * 0.8) / 10)));
  return buildMonKvadr({ a: v + 2 * (b + w) * Qm, b, v, w, F, ask: pick(rng, ['Q', 'P', 'pi']) });
}

// ---------- typ: rovnice mezního příjmu ----------
function buildMrRovnice({ form, a, b }) {
  // form 'P': poptávka P = a − bQ; form 'Q': poptávka Q = a − bP (zde a je úsek v Q, b sklon v P)
  const A = form === 'P' ? a : r9(a / b); const B = form === 'P' ? b : r9(1 / b);
  const mr = `${A} - ${r9(2 * B)}*Q`;
  const demandText = form === 'P' ? `${demandEq(a, b)}` : `Q=${cz(a)}-${coef(b, 'P')}`;
  const steps = [
    ...(form === 'Q' ? [{ title: 'Poptávku vyjádříme jako P(Q)', text: 'Mezní příjem se odvozuje z ceny jako funkce množství. Rovnici proto přepíšeme tak, aby vlevo stálo P.',
      board: [line(`${coef(b, 'P')}=${cz(a)}-Q`), line(`P=${cz(A)}-${coef(B, 'Q')}`)] }] : []),
    { title: 'Celkový příjem', text: 'Celkový příjem je cena krát množství. Za cenu dosadíme z poptávky.',
      board: [line(`TR=P\\cdot Q=(${cz(A)}-${coef(B, 'Q')})\\,Q=${cz(A)}Q-${coef(B, 'Q^2')}`)] },
    { title: 'Mezní příjem', text: 'Mezní příjem je přírůstek TR. Člen s Q dá svůj koeficient a člen s Q na druhou jeho dvojnásobek krát Q. Úsek se tedy nemění, sklon se zdvojnásobí.',
      board: [result(`MR=${cz(A)}-${coef(2 * B, 'Q')}`)] },
    { title: 'Kontrola', text: `MR je vždy pod poptávkou. Obě křivky začínají na ose P ve stejné výšce ${czText(A)}, ale MR klesá dvakrát rychleji a protne osu Q v polovině.`,
      viz: econViz({ a: A, b: B, curves: [D(A, B), MRc(A, B)], alt: 'Poptávka a mezní příjem' }) },
  ];
  return mk('mr-rovnice', {
    data: { form, a, b },
    task: 'Poptávka po výrobku monopolu je dána rovnicí pod zadáním. Napište rovnici mezního příjmu MR jako funkci množství Q (zapište jen pravou stranu, například 50 - 4Q).',
    promptTex: demandText,
    answerSpec: { kind: 'expression', value: mr, variable: 'Q' },
    conclusion: `MR = ${czText(A)} − ${czText(r9(2 * B))}Q.`,
    source: { chapter: 7, number: '7.1/3 a 7.1/4' },
    solution: steps,
  });
}

function genMrRovnice(rng) {
  if (rng() < 0.5) return buildMrRovnice({ form: 'P', a: 10 * int(rng, 2, 15), b: int(rng, 1, 8) });
  const d = pick(rng, [1, 2, 4, 5]);
  return buildMrRovnice({ form: 'Q', a: d * 5 * int(rng, 4, 20), b: d });
}

// ---------- typ: tabulka TR, MR, MC, zisk ----------
const tableCalc = ({ a, b, v, w, F, n }) => {
  const P = []; const TC = [F]; const TR = [0]; const rows = [];
  for (let q = 1; q <= n; q++) {
    P[q] = a - b * q; TC[q] = F + v * q + w * q * q; TR[q] = P[q] * q;
    rows.push([TR[q], TR[q] - TR[q - 1], TC[q] - TC[q - 1], TR[q] - TC[q]]);
  }
  return { P, TC, TR, rows };
};

function buildTabulka({ a, b, v, w, F, n = 5 }) {
  const { P, TC, rows } = tableCalc({ a, b, v, w, F, n });
  let best = 1;
  rows.forEach((r, i) => { if (r[3] > rows[best - 1][3]) best = i + 1; });
  const cols = Array.from({ length: n }, (_, i) => i + 1);
  const header = `\\begin{array}{c|${'c'.repeat(n)}}Q&${cols.join('&')}\\\\\\hline P&${cols.map((q) => P[q]).join('&')}\\\\ TC&${cols.map((q) => TC[q]).join('&')}\\end{array}`;
  const answer = `\\begin{array}{c|cccc}Q&TR&MR&MC&\\pi\\\\\\hline ${rows.map((r, i) => `${i + 1}&${r.join('&')}`).join('\\\\')}\\end{array}`;
  return mk('mon-tabulka', {
    points: 3,
    data: { a, b, v, w, F, n },
    task: `Monopol zná cenu P, kterou získá při prodeji Q kusů, a své celkové náklady TC (při nulovém výstupu činí ${cz(F)} Kč, tedy fixní náklady). Vyplňte tabulku: každý řádek je jedno Q od 1 do ${n}, sloupce jsou TR, MR, MC a zisk (v tomto pořadí).`,
    promptTex: header,
    answerSpec: { kind: 'table', value: rows.map((r) => r.map(String)) },
    conclusion: `Zisk je největší při Q = ${best}: ${czText(rows[best - 1][3])} Kč. Při tomto Q je MR ještě aspoň tak velký jako MC, při dalším kusu už je MR menší než MC, a další kus proto zisk nezvýší.`,
    source: { chapter: 7, number: '7.1 (tabulky)' },
    solution: [
      { title: 'Celkový příjem TR = P · Q', text: 'U každého řádku vynásobíme cenu množstvím.',
        board: cols.map((q) => line(`TR(${q})=${P[q]}\\cdot ${q}=${rows[q - 1][0]}`)) },
      { title: 'Mezní příjem a mezní náklad', text: `MR a MC jsou přírůstky: od hodnoty při Q odečteme hodnotu při Q − 1. U nákladů začíná výpočet fixními náklady ${czText(F)} Kč při Q = 0, u příjmů nulou.`,
        board: cols.map((q) => line(`Q=${q}:\\ MR=${rows[q - 1][0]}-${q === 1 ? 0 : rows[q - 2][0]}=${rows[q - 1][1]},\\ MC=${TC[q]}-${TC[q - 1]}=${rows[q - 1][2]}`)) },
      { title: 'Zisk = TR − TC', text: 'V posledním sloupci odečteme celkové náklady od celkových příjmů.',
        board: cols.map((q) => line(`\\pi(${q})=${rows[q - 1][0]}-${TC[q]}=${rows[q - 1][3]}`)) },
      { title: 'Hotová tabulka', text: 'Takto vypadá celá tabulka.', board: [result(answer)] },
      { title: 'Optimum', text: `Monopol zvyšuje výstup, dokud MR ≥ MC. Poslední takový řádek je Q = ${best}, kde je i zisk největší: ${czText(rows[best - 1][3])} Kč.`,
        board: [line(`MR(${best})=${rows[best - 1][1]}\\ge MC(${best})=${rows[best - 1][2]}`), line(`\\pi_{max}=${rows[best - 1][3]}`)] },
    ],
  });
}

function genTabulka(rng) {
  for (let i = 0; i < 800; i++) {
    const b = int(rng, 2, 6); const w = int(rng, 1, 3); const v = int(rng, 2, 10); const F = 10 * int(rng, 1, 6);
    const a = int(rng, 4, 14) * 5 + 5;
    if (a - 5 * b <= 0) continue;
    const { rows } = tableCalc({ a, b, v, w, F, n: 5 });
    let best = 0;
    rows.forEach((r, k) => { if (r[3] > rows[best][3]) best = k; });
    const sameBest = rows.filter((r) => r[3] === rows[best][3]).length === 1;
    const noTie = rows.every((r) => r[1] !== r[2]);
    if (best >= 1 && best <= 3 && rows[best][3] > 0 && sameBest && noTie) return buildTabulka({ a, b, v, w, F });
  }
  return buildTabulka({ a: 45, b: 4, v: 4, w: 1, F: 20 });
}

// ---------- typ: přebytek spotřebitele u monopolu a při dokonalé konkurenci ----------
function buildPrebytek({ a, b, c, ask }) {
  const { Q, P } = monoLin({ a, b, c });
  const Qk = r9((a - c) / b);
  const mono = ask === 'monopol';
  const cs = mono ? r9(0.5 * (a - P) * Q) : r9(0.5 * (a - c) * Qk);
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c)],
    points: mono ? [{ x: Q, y: P, label: 'M', guides: true }] : [{ x: Qk, y: c, label: 'K', guides: true }],
    areas: mono ? [{ between: [`${a} - ${b}*x`, `${P}`], from: 0, to: Q, label: 'PS', color: 'accent' }]
      : [{ between: [`${a} - ${b}*x`, `${c}`], from: 0, to: Qk, label: 'PS', color: 'accent' }],
    alt: 'Přebytek spotřebitele',
  });
  return mk('prebytek', {
    data: { a, b, c, ask },
    task: mono ? 'Monopol má konstantní mezní náklad MC (v Kč) a čelí poptávce P = a − bQ. Určete přebytek spotřebitele (v Kč), když monopol maximalizuje zisk.'
      : 'Odvětví má konstantní mezní náklad MC (v Kč) a čelí poptávce P = a − bQ. Určete přebytek spotřebitele (v Kč) v případě dokonalé konkurence, kde se cena rovná MC.',
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: cs },
    conclusion: `Přebytek spotřebitele je ${czText(cs)} Kč.`,
    source: { chapter: 7, number: '7.1/3b' },
    solution: [
      { title: 'Rovnováha', text: mono ? 'Nejdřív najdeme množství a cenu monopolu z MR = MC a poptávky.' : 'Při dokonalé konkurenci platí P = MC. Cenu tedy známe a množství dostaneme z poptávky.',
        board: mono ? [line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c)}`), line(`Q_M=${cz(Q)},\\quad P_M=${cz(P)}`)] : [line(`P_K=MC=${cz(c)}`), line(`Q_K=\\frac{${cz(a)}-${cz(c)}}{${cz(b)}}=${cz(Qk)}`)] },
      { title: 'Co je přebytek spotřebitele', text: `Je to plocha pod poptávkou a nad cenou do daného množství. Poptávka protíná osu P ve výšce ${czText(a)}, takže plocha je trojúhelník o výšce ${mono ? 'a − P' : 'a − MC'} a základně Q.`,
        board: [line(`PS=\\tfrac12\\,(${cz(a)}-${cz(mono ? P : c)})\\cdot ${cz(mono ? Q : Qk)}`)] },
      { title: 'Výpočet', text: 'Dosadíme do vzorce pro obsah trojúhelníku.', board: [result(`PS=\\tfrac12\\cdot ${cz(a - (mono ? P : c))}\\cdot ${cz(mono ? Q : Qk)}=${cz(cs)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Šrafovaný trojúhelník má výšku ${czText(a - (mono ? P : c))} a základnu ${czText(mono ? Q : Qk)}. Obsah je ${czText(cs)} Kč.`, viz: graph },
    ],
  });
}

function genPrebytek(rng) {
  const b = int(rng, 1, 5); const Qm = 2 * int(rng, 2, 10); const c = int(rng, 2, 20);
  return buildPrebytek({ a: c + 2 * b * Qm, b, c, ask: pick(rng, ['monopol', 'konkurence']) });
}

// ---------- typ: mrtvá ztráta monopolu ----------
function buildMrtva({ a, b, c }) {
  const { Q, P } = monoLin({ a, b, c });
  const Qk = r9((a - c) / b);
  const dwl = r9(0.5 * (Qk - Q) * (P - c));
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c)],
    points: [{ x: Q, y: P, label: 'M', guides: true }, { x: Qk, y: c, label: 'K', guides: true }],
    areas: [{ between: [`${a} - ${b}*x`, `${c}`], from: Q, to: Qk, label: 'DWL', color: 'warn' }],
    alt: 'Mrtvá ztráta monopolu',
  });
  return mk('mrtva-ztrata', {
    data: { a, b, c },
    task: 'Monopol má konstantní mezní náklad MC (v Kč) a čelí poptávce P = a − bQ. Vypočtěte mrtvou ztrátu (v Kč), kterou monopol způsobí oproti dokonalé konkurenci.',
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: dwl },
    conclusion: `Mrtvá ztráta je ${czText(dwl)} Kč.`,
    source: { chapter: 7, number: 'prezentace 7' },
    solution: [
      { title: 'Monopol', text: 'Z podmínky MR = MC najdeme množství a cenu monopolu.',
        board: [line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c)}`), line(`Q_M=${cz(Q)},\\quad P_M=${cz(P)}`)] },
      { title: 'Dokonalá konkurence', text: 'Při dokonalé konkurenci by se vyrábělo tam, kde se poptávka (hodnota pro kupující) rovná MC, tedy P = MC.',
        board: [line(`${cz(a)}-${coef(b, 'Q')}=${cz(c)}`), line(`Q_K=${cz(Qk)}`)] },
      { title: 'Mrtvá ztráta', text: `Mezi množstvím ${czText(Q)} a ${czText(Qk)} leží kusy, které by kupující ocenili víc, než stojí výroba, ale monopol je nevyrobí. Ztráta společnosti je trojúhelník mezi poptávkou a MC: základna je rozdíl množství konkurence a monopolu, výška rozdíl ceny monopolu a MC.`,
        board: [result(`DWL=\\tfrac12\\,(${cz(Qk)}-${cz(Q)})(${cz(P)}-${cz(c)})=${cz(dwl)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Šrafovaný trojúhelník je mrtvá ztráta ${czText(dwl)} Kč.`, viz: graph },
    ],
  });
}

function genMrtva(rng) {
  const b = int(rng, 1, 5); const Qm = int(rng, 2, 10) * 2; const c = int(rng, 2, 25);
  return buildMrtva({ a: c + 2 * b * Qm, b, c });
}

// ---------- typ: srovnání monopolu s dokonalou konkurencí ----------
const ASK_SR = {
  Qk: 'Kolik kusů by se vyrobilo při dokonalé konkurenci (P = MC)?',
  Pk: 'Jaká by byla cena při dokonalé konkurenci (P = MC)?',
  dQ: 'O kolik kusů vyrobí dokonale konkurenční odvětví víc než monopol?',
  dP: 'O kolik Kč je cena monopolu vyšší než cena při dokonalé konkurenci?',
};

function buildSrovnani({ a, b, c, ask }) {
  const { Q, P } = monoLin({ a, b, c });
  const Qk = r9((a - c) / b);
  const val = { Qk, Pk: c, dQ: r9(Qk - Q), dP: r9(P - c) }[ask];
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c)],
    points: [{ x: Q, y: P, label: 'M', guides: true }, { x: Qk, y: c, label: 'K', guides: true }], alt: 'Monopol a dokonalá konkurence',
  });
  return mk('srovnani', {
    data: { a, b, c, ask },
    task: `Odvětví má konstantní mezní náklad MC (v Kč) a čelí poptávce P = a − bQ. ${ASK_SR[ask]}`,
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Monopol: ${czText(Q)} ks za ${czText(P)} Kč. Dokonalá konkurence: ${czText(Qk)} ks za ${czText(c)} Kč. Hledaná hodnota je ${czText(val)}.`,
    source: { chapter: 7, number: 'skripta 7.2.5' },
    solution: [
      { title: 'Monopol', text: 'Monopol řídí MR = MC a cenu bere z poptávky.',
        board: [line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c)}`), line(`Q_M=${cz(Q)},\\quad P_M=${cz(P)}`)] },
      { title: 'Dokonalá konkurence', text: 'Firma v dokonalé konkurenci je příjemce ceny a vyrábí tam, kde se cena rovná MC. Pro odvětví položíme poptávku rovnu MC.',
        board: [line(`${cz(a)}-${coef(b, 'Q')}=${cz(c)}`), line(`Q_K=${cz(Qk)},\\quad P_K=${cz(c)}`)] },
      { title: 'Porovnání', text: 'Monopol vyrábí méně a cena je vyšší než MC. U lineární poptávky a konstantního MC vyrobí dokonalá konkurence přesně dvojnásobek monopolu.',
        board: [asked(ask === 'Qk', `Q_K=${cz(Qk)}`), asked(ask === 'Pk', `P_K=${cz(c)}`), asked(ask === 'dQ', `Q_K-Q_M=${cz(Qk)}-${cz(Q)}=${cz(Qk - Q)}`), asked(ask === 'dP', `P_M-P_K=${cz(P)}-${cz(c)}=${cz(P - c)}`)] },
      { title: 'Graf', text: `Bod M (monopol) leží vlevo a výš než bod K (konkurence). Hledaná hodnota je ${czText(val)}.`, viz: graph },
    ],
  });
}

function genSrovnani(rng) {
  const b = int(rng, 1, 6); const Qm = int(rng, 3, 20); const c = int(rng, 2, 30);
  return buildSrovnani({ a: c + 2 * b * Qm, b, c, ask: pick(rng, ['Qk', 'Pk', 'dQ', 'dP']) });
}

// ---------- typ: Lernerův index a elasticita v optimu monopolu ----------
function buildLerner({ a, b, c, ask }) {
  const { Q, P } = monoLin({ a, b, c });
  const E = r9(P / (b * Q)); const L = r9((P - c) / P);
  const val = ask === 'E' ? E : L;
  const demandQ = `Q=\\frac{${cz(a)}-P}{${cz(b)}}`;
  return mk('lerner', {
    data: { a, b, c, ask },
    points: 2,
    task: `Monopol má konstantní mezní náklad MC (v Kč) a čelí poptávce P = a − bQ. ${ask === 'E' ? 'Vypočtěte absolutní hodnotu cenové elasticity poptávky v bodě maximalizace zisku.' : 'Vypočtěte Lernerův index monopolní síly v bodě maximalizace zisku (desetinné číslo).'}`,
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: val, tol: 0.005 },
    conclusion: `V optimu je Q = ${czText(Q)}, P = ${czText(P)}, elasticita ${czText(E)} a Lernerův index ${czText(L)}.`,
    source: { chapter: 7, number: '7.1/3d, 7.1/4d, 7.3/2d' },
    solution: [
      { title: 'Optimum monopolu', text: 'Nejdřív najdeme množství a cenu z MR = MC.',
        board: [line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c)}`), line(`Q_M=${cz(Q)},\\quad P_M=${cz(P)}`)] },
      { title: 'Elasticita poptávky v bodě', text: `Elasticita je (dQ/dP)·P/Q. Z poptávky Q = (a − P)/b plyne dQ/dP = −1/b. Dosadíme P a Q v optimu a bereme absolutní hodnotu.`,
        board: [line(demandQ), line(`|E|=\\frac{1}{${cz(b)}}\\cdot\\frac{${cz(P)}}{${cz(Q)}}`), asked(ask === 'E', `|E|=${cz(E)}`)] },
      { title: 'Lernerův index', text: 'Lernerův index měří monopolní sílu: je to podíl rozdílu ceny a MC na ceně. Nabývá hodnot od 0 do 1 a platí L = 1/|E|.',
        board: [line(`L=\\frac{P-MC}{P}=\\frac{${cz(P)}-${cz(c)}}{${cz(P)}}`), asked(ask === 'L', `L=${cz(L)}`), line(`\\text{kontrola: } 1/|E|=${cz(r9(1 / E))}`)] },
      { title: 'Význam', text: `Elasticita ${czText(E)} je větší než 1: monopol vždy vyrábí na elastické části poptávky, protože jen tam je MR kladný. Čím větší je Lernerův index, tím větší je monopolní síla.`,
        viz: econViz({ a, b, curves: [D(a, b), MRc(a, b), MCc(c)], points: [{ x: Q, y: P, label: 'M', guides: true }], alt: 'Optimum monopolu na elastické části poptávky' }) },
    ],
  });
}

function genLerner(rng) {
  const ask = pick(rng, ['E', 'L']);
  const E = ask === 'E' ? pick(rng, [1.5, 2, 3, 4, 5]) : pick(rng, [2, 4, 5]);
  const b = int(rng, 1, 5); const Qm = 2 * int(rng, 1, 6);
  const base = b * Qm;
  return buildLerner({ a: (E + 1) * base, b, c: (E - 1) * base, ask });
}

// ---------- typ: kartel jako monopol ----------
const ASK_KARTEL = { Q: 'celkové množství, které kartel vyrobí', q: 'kvótu (množství) jedné firmy', pi: 'celkový zisk kartelu (v Kč)' };

function buildKartel({ a, b, c, n, f, ask }) {
  const { Q, P } = monoLin({ a, b, c });
  const q = r9(Q / n); const pi = r9((P - c) * Q - n * f);
  const val = { Q, q, pi }[ask];
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c)], points: [{ x: Q, y: P, label: 'K', guides: true }],
    areas: profitRect(P, c, Q), alt: 'Kartel se chová jako monopol',
  });
  return mk('kartel', {
    data: { a, b, c, n, f, ask },
    task: `V odvětví je ${n} stejných firem. Každá má konstantní mezní náklad MC (v Kč) a fixní náklady ${cz(f)} Kč. Tržní poptávka je P = a − bQ. Firmy uzavřely kartelovou dohodu a chovají se jako jediný monopol, produkci si dělí rovným dílem. Určete ${ASK_KARTEL[ask]}.`,
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Kartel vyrobí ${czText(Q)} ks za ${czText(P)} Kč, každá firma ${czText(q)} ks, celkový zisk je ${czText(pi)} Kč.`,
    source: { chapter: 7, number: 'skripta 7.3.1' },
    solution: [
      { title: 'Kartel = monopol', text: 'Dohoda firem vede k tomu, že trh obsluhuje v podstatě monopol. Cílem je největší zisk celého odvětví, a proto použijeme pravidlo monopolu MR = MC.',
        board: [line(`MR=${cz(a)}-${coef(2 * b, 'Q')}`), line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c)}`)] },
      { title: 'Množství a cena kartelu', text: 'Z rovnice vyjde celkové množství odvětví a cena z poptávky.',
        board: [asked(ask === 'Q', `Q=${cz(Q)}`), line(`P=${cz(a)}-${cz(b)}\\cdot ${cz(Q)}=${cz(P)}`)] },
      { title: 'Kvóty', text: `Každé z ${n} firem připadne stejný díl výroby (výrobní kvóta).`,
        board: [asked(ask === 'q', `q=\\frac{${cz(Q)}}{${n}}=${cz(q)}`)] },
      { title: 'Zisk kartelu', text: `Zisk odvětví je (P − MC)·Q a odečteme fixní náklady všech ${n} firem.`,
        board: [asked(ask === 'pi', `\\pi=(${cz(P)}-${cz(c)})\\cdot ${cz(Q)}-${n}\\cdot ${cz(f)}=${cz(pi)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Kartel omezí výrobu na ${czText(Q)} ks a udrží cenu ${czText(P)} Kč. Šrafovaná plocha je zisk před odečtením fixních nákladů.`, viz: graph },
    ],
  });
}

function genKartel(rng) {
  const n = int(rng, 2, 5); const k = int(rng, 1, 5); const Qm = n * k;
  const b = int(rng, 1, 5); const c = int(rng, 2, 20);
  const gross = b * Qm * Qm;
  const f = 5 * int(rng, 1, Math.max(1, Math.floor((gross * 0.8) / (5 * n))));
  return buildKartel({ a: c + 2 * b * Qm, b, c, n, f, ask: pick(rng, ['Q', 'q', 'pi']) });
}

// ---------- typ: oligopol s dominantní firmou ----------
const ASK_DF = { q: 'množství dominantní firmy', p: 'cenu (v Kč), kterou stanoví dominantní firma', lem: 'množství, které dodá konkurenční lem', pi: 'zisk dominantní firmy (v Kč)' };

function buildDominantni({ A, B, alpha, beta, c, F, ask }) {
  const q = r9((alpha - c) / (2 * beta)); const p = r9(alpha - beta * q);
  const Q = r9((A - p) / B); const lem = r9(Q - q); const pi = r9((p - c) * q - F);
  const val = { q, p, lem, pi }[ask];
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(A / B)], range: [0, nice(Math.max(A, alpha))],
      curves: [{ expr: `${A} - ${B}*x`, label: 'D', color: 'blue' }, { expr: `${alpha} - ${beta}*x`, label: 'dDF', color: 'accent' },
        { expr: `${alpha} - ${r9(2 * beta)}*x`, label: 'MR', color: 'green' }, MCc(c)],
      points: [{ x: q, y: p, label: 'DF', guides: true }, { x: Q, y: p, label: 'Qcel' }], arrows: [], areas: [], alt: 'Oligopol s dominantní firmou a konkurenčním lemem',
    },
  };
  return mk('dominantni', {
    points: 3,
    data: { A, B, alpha, beta, c, F, ask },
    task: `Oligopol s dominantní firmou. První rovnice je tržní poptávka (P v Kč, Q množství na celém trhu), druhá poptávka po výrobě dominantní firmy (q je její množství). Dominantní firma má MC = AVC = ${cz(c)} Kč a fixní náklady ${cz(F)} Kč. Konkurenční lem přejímá cenu dominantní firmy. Určete ${ASK_DF[ask]}.`,
    promptTex: `${demandEq(A, B)},\\qquad p=${cz(alpha)}-${coef(beta, 'q')}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Dominantní firma vyrobí ${czText(q)} ks za ${czText(p)} Kč, konkurenční lem ${czText(lem)} ks, zisk dominantní firmy je ${czText(pi)} Kč.`,
    source: { chapter: 7, number: '7.2/1 a 7.2/6' },
    solution: [
      { title: 'Mezní příjem dominantní firmy', text: 'Dominantní firma bere za svou poptávku ten díl trhu, který ji zbyde po malých firmách. Rozhoduje jako monopol s touto poptávkou, a proto má mezní příjem se dvojnásobným sklonem.',
        board: [line(`p=${cz(alpha)}-${coef(beta, 'q')}`), line(`MR=${cz(alpha)}-${coef(2 * beta, 'q')}`)] },
      { title: 'Množství dominantní firmy', text: 'Použijeme zlaté pravidlo MR = MC.',
        board: [line(`${cz(alpha)}-${coef(2 * beta, 'q')}=${cz(c)}`), asked(ask === 'q', `q_{DF}=${cz(q)}`)] },
      { title: 'Cena', text: 'Cenu spočteme z poptávky dominantní firmy.',
        board: [line(`p=${cz(alpha)}-${cz(beta)}\\cdot ${cz(q)}`), asked(ask === 'p', `p_{DF}=${cz(p)}`)] },
      { title: 'Konkurenční lem', text: 'Malé firmy cenu přijmou. Při této ceně chce trh koupit celkově množství Q z tržní poptávky. Dominantní firma dodá q, zbytek patří lemu.',
        board: [line(`Q=\\frac{${cz(A)}-${cz(p)}}{${cz(B)}}=${cz(Q)}`), asked(ask === 'lem', `q_{lem}=${cz(Q)}-${cz(q)}=${cz(lem)}`)] },
      { title: 'Zisk dominantní firmy', text: 'Zisk je (cena − průměrné variabilní náklady)·množství − fixní náklady.',
        board: [asked(ask === 'pi', `\\pi=(${cz(p)}-${cz(c)})\\cdot ${cz(q)}-${cz(F)}=${cz(pi)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `MR dominantní firmy protíná MC v množství ${czText(q)}. Cena ${czText(p)} Kč protne tržní poptávku v množství ${czText(Q)}. Rozdíl ${czText(lem)} je konkurenční lem.`, viz: graph },
    ],
  });
}

function genDominantni(rng) {
  for (let i = 0; i < 500; i++) {
    const beta = pick(rng, [1, 2, 3]); const B = pick(rng, [1, 2, 4]);
    const c = int(rng, 2, 20); const q = int(rng, 4, 30);
    const alpha = c + 2 * beta * q; const p = alpha - beta * q;
    const lem = int(rng, 1, 6); const Q = q + lem;
    const A = p + B * Q;
    if (p <= c || Q <= q) continue;
    const gross = (p - c) * q;
    const F = 4 * int(rng, 1, Math.max(1, Math.floor((gross * 0.8) / 4)));
    return buildDominantni({ A, B, alpha, beta, c, F, ask: pick(rng, ['q', 'p', 'lem', 'pi']) });
  }
  return buildDominantni({ A: 60, B: 2, alpha: 40, beta: 1, c: 8, F: 32, ask: 'q' });
}

// ---------- typ: monopolistická konkurence v dlouhém období ----------
const ASK_MK = { a: 'úsek poptávky na ose P (číslo a v rovnici P = a − bQ) v dlouhém období', Q: 'množství firmy v dlouhém období', P: 'cenu (v Kč) v dlouhém období' };

function mkGeometry({ b, v, k, j }) {
  const F = b * k * k; const a = v + 2 * b * k; const a0 = a + 2 * b * j;
  return { F, a, a0 };
}

function buildMkDlouhe({ b, v, k, j, ask }) {
  const { F, a, a0 } = mkGeometry({ b, v, k, j });
  const Q0 = k + j; const P0 = a0 - b * Q0; const pi0 = r9(b * (Q0 * Q0 - k * k));
  const Q = k; const P = r9(a - b * Q);
  const val = { a, Q, P }[ask];
  const graph = econViz({
    a: a0, b, curves: [D(a, b), { ...D(a0, b), label: 'D0', color: 'accent', dashed: true }, MRc(a, b), MCc(v), ...ACc(v, 0, F)],
    points: [{ x: Q, y: P, label: 'LR', guides: true }], alt: 'Monopolistická konkurence v dlouhém období: poptávka se dotýká AC',
  });
  return mk('mk-dlouhe', {
    points: 3,
    data: { b, v, k, j, ask },
    task: `Firma v monopolistické konkurenci má celkové náklady TC = ${cz(F)} + ${coef(v, 'Q')} (tedy MC = ${cz(v)} Kč). V krátkém období má poptávku P = ${cz(a0)} − ${coef(b, 'Q')}. Zisk láká do odvětví nové firmy, poptávka po výrobku firmy se posouvá doleva (sklon b se nemění), až zisk zmizí. Určete ${ASK_MK[ask]}.`,
    promptTex: `${costLin(F, v)},\\qquad P=${cz(a0)}-${coef(b, 'Q')}\\ \\ (\\text{krátké období})`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `V dlouhém období je poptávka P = ${czText(a)} − ${czText(b)}Q, firma vyrábí ${czText(Q)} ks za ${czText(P)} Kč a má nulový zisk.`,
    source: { chapter: 7, number: '7.3 (dlouhé období)' },
    solution: [
      { title: 'Krátké období', text: `Při poptávce P = ${czText(a0)} − ${czText(b)}Q vyjde z MR = MC množství ${czText(Q0)}, cena ${czText(P0)} Kč a zisk ${czText(pi0)} Kč. Zisk je kladný, a proto vstupují nové firmy.`,
        board: [line(`${cz(a0)}-${coef(2 * b, 'Q')}=${cz(v)}\\ \\Rightarrow\\ Q=${cz(Q0)}`), line(`\\pi=${cz(P0)}\\cdot ${cz(Q0)}-(${cz(F)}+${cz(v)}\\cdot ${cz(Q0)})=${cz(pi0)}`)] },
      { title: 'Podmínka dlouhého období', text: 'Nové firmy posouvají poptávku doleva, dokud zisk neklesne na nulu. Poptávka se pak jen dotýká křivky průměrných nákladů AC (je její tečnou) v bodě, kde firma produkuje. Při poptávce P = a − bQ je největší možný zisk (a − v)²/(4b) − F.',
        board: [line(`\\pi_{max}=\\frac{(a-${cz(v)})^2}{4\\cdot ${cz(b)}}-${cz(F)}`)] },
      { title: 'Nulový zisk určuje a', text: 'Položíme maximální zisk rovný nule a odmocníme.',
        board: [line(`(a-${cz(v)})^2=4\\cdot ${cz(b)}\\cdot ${cz(F)}`), line(`a-${cz(v)}=${cz(2 * b * k)}`), asked(ask === 'a', `a=${cz(a)}`)] },
      { title: 'Množství a cena', text: 'Z MR = MC vyjde množství a z nové poptávky cena.',
        board: [line(`Q=\\frac{a-${cz(v)}}{2\\cdot ${cz(b)}}`), asked(ask === 'Q', `Q=${cz(Q)}`), asked(ask === 'P', `P=${cz(a)}-${cz(b)}\\cdot ${cz(Q)}=${cz(P)}`)] },
      { title: 'Kontrola: P = AC', text: 'Průměrný náklad při Q je mezní náklad plus fixní náklady na kus. Musí vyjít cena.',
        board: [line(`AC=${cz(v)}+\\frac{${cz(F)}}{${cz(Q)}}=${cz(v + F / Q)}=P`)] },
      { title: 'Graf', text: `Plná poptávka se v bodě LR (Q = ${czText(Q)}, P = ${czText(P)}) dotýká křivky AC. Původní poptávka D0 (čárkovaně) vedla ke kladnému zisku.`, viz: graph },
    ],
  });
}

function genMkDlouhe(rng) {
  const b = pick(rng, [1, 2, 3, 4, 5]); const k = int(rng, 2, 10); const v = int(rng, 4, 20); const j = int(rng, 1, 4);
  return buildMkDlouhe({ b, v, k, j, ask: pick(rng, ['a', 'Q', 'P']) });
}

// ---------- typ: cenový strop pro monopol ----------
function buildStrop({ a, b, c, F, Pmax, ask }) {
  const Qm = monoLin({ a, b, c });
  const Q = r9((a - Pmax) / b); const pi = r9((Pmax - c) * Q - F);
  const val = ask === 'Q' ? Q : pi;
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c), { expr: `${Pmax}`, label: 'Pmax', color: 'accent', dashed: true }],
    points: [{ x: Qm.Q, y: Qm.P, label: 'M' }, { x: Q, y: Pmax, label: 'R', guides: true }], alt: 'Cenový strop pro monopol',
  });
  return mk('strop-monopol', {
    data: { a, b, c, F, Pmax, ask },
    task: `Monopol má konstantní mezní náklad MC a fixní náklady ${cz(F)} Kč, poptávka je P = a − bQ. Stát stanovil maximální cenu ${cz(Pmax)} Kč. Určete ${ask === 'Q' ? 'množství, které monopol při regulaci vyrobí' : 'zisk monopolu při regulaci (v Kč)'}.`,
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Při ceně ${czText(Pmax)} Kč monopol vyrobí ${czText(Q)} ks a jeho zisk je ${czText(pi)} Kč.`,
    source: { chapter: 7, number: 'skripta 7.2.6' },
    solution: [
      { title: 'Monopol bez regulace', text: 'Nejdřív zjistíme, zda strop něco mění. Neregulovaný monopol vyrábí tam, kde MR = MC.',
        board: [line(`Q_M=${cz(Qm.Q)},\\quad P_M=${cz(Qm.P)}`), line(`${cz(c)}<${cz(Pmax)}<${cz(Qm.P)}`)] },
      { title: 'Strop mění mezní příjem', text: `Monopol nesmí prodávat dráž než za ${czText(Pmax)} Kč. Dokud je poptávková cena nad stropem, získá z každého dalšího kusu právě ${czText(Pmax)} Kč, takže MR je vodorovné. Protože ${czText(Pmax)} je víc než MC = ${czText(c)}, vyplatí se každý další kus, až se cena na poptávce dostane na strop.`,
        board: [line(`Q=\\frac{${cz(a)}-${cz(Pmax)}}{${cz(b)}}`), asked(ask === 'Q', `Q=${cz(Q)}`)] },
      { title: 'Zisk při regulaci', text: 'Cena je strop, náklady jsou fixní plus mezní krát množství.',
        board: [asked(ask === 'pi', `\\pi=(${cz(Pmax)}-${cz(c)})\\cdot ${cz(Q)}-${cz(F)}=${cz(pi)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Čárkovaný strop leží pod cenou monopolu. Monopol vyrobí v bodě R více (${czText(Q)} místo ${czText(Qm.Q)}) a prodá levněji. Strop mezi MC a cenou monopolu zvyšuje výstup.`, viz: graph },
    ],
  });
}

function genStrop(rng) {
  const b = int(rng, 1, 5); const Qm = int(rng, 3, 15); const c = int(rng, 3, 25);
  const Qr = int(rng, Qm + 1, 2 * Qm - 1);
  const a = c + 2 * b * Qm;
  const gross = (a - b * Qr - c) * Qr;
  const F = rng() < 0.3 ? 0 : 5 * int(rng, 1, Math.max(1, Math.floor((gross * 0.8) / 5)));
  return buildStrop({ a, b, c, F, Pmax: a - b * Qr, ask: pick(rng, ['Q', 'pi']) });
}

// ---------- typ: daň na jednotku výstupu u monopolu ----------
const ASK_DAN = { P: 'novou cenu, za kterou monopol prodává', Q: 'nové množství, které monopol vyrobí', T: 'výnos daně pro stát (v Kč)' };

function buildDan({ a, b, c, t, ask }) {
  const before = monoLin({ a, b, c }); const after = monoLin({ a, b, c: c + t });
  const T = r9(t * after.Q);
  const val = { P: after.P, Q: after.Q, T }[ask];
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c), { ...MCc(c + t), label: 'MC+t', color: 'accent', dashed: true }],
    points: [{ x: before.Q, y: before.P, label: 'M0' }, { x: after.Q, y: after.P, label: 'M1', guides: true }], alt: 'Daň na jednotku výstupu monopolu',
  });
  return mk('dan-monopol', {
    data: { a, b, c, t, ask },
    task: `Monopol má konstantní mezní náklad MC (v Kč) a čelí poptávce P = a − bQ. Stát uvalil daň ${cz(t)} Kč na každou prodanou jednotku. Určete ${ASK_DAN[ask]}.`,
    promptTex: `${demandEq(a, b)},\\qquad MC=${cz(c)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `Po zdanění monopol vyrobí ${czText(after.Q)} ks za ${czText(after.P)} Kč (dříve ${czText(before.Q)} ks za ${czText(before.P)} Kč) a stát vybere ${czText(T)} Kč.`,
    source: { chapter: 7, number: 'skripta 7.2.6' },
    solution: [
      { title: 'Daň zvyšuje mezní náklad', text: `Za každý kus musí monopol navíc odvést ${czText(t)} Kč, a proto je nový mezní náklad ${czText(c + t)} Kč. Poptávka ani MR se nemění.`,
        board: [line(`MC_1=${cz(c)}+${cz(t)}=${cz(c + t)}`), line(`MR=${cz(a)}-${coef(2 * b, 'Q')}`)] },
      { title: 'Nové optimum', text: 'Položíme MR rovno novému MC.',
        board: [line(`${cz(a)}-${coef(2 * b, 'Q')}=${cz(c + t)}`), asked(ask === 'Q', `Q_1=${cz(after.Q)}`)] },
      { title: 'Nová cena', text: `Cenu přečteme z poptávky. Cena vzrostla jen o polovinu daně: z ${czText(before.P)} na ${czText(after.P)} Kč.`,
        board: [asked(ask === 'P', `P_1=${cz(a)}-${cz(b)}\\cdot ${cz(after.Q)}=${cz(after.P)}`)] },
      { title: 'Výnos daně', text: 'Stát vybere daň z každé prodané jednotky.',
        board: [asked(ask === 'T', `T=${cz(t)}\\cdot ${cz(after.Q)}=${cz(T)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Čárkované MC+t vede ke snížení výstupu z ${czText(before.Q)} na ${czText(after.Q)} ks. Daň tak zvýší cenu a sníží množství.`, viz: graph },
    ],
  });
}

function genDan(rng) {
  const b = int(rng, 1, 5); const Q1 = int(rng, 3, 15); const c = int(rng, 2, 20); const t = 2 * int(rng, 1, 5);
  return buildDan({ a: c + t + 2 * b * Q1, b, c, t, ask: pick(rng, ['P', 'Q', 'T']) });
}

// ---------- typ: vězňovo dilema ----------
const STRAT = ['V', 'N'];
const nashCells = (m) => {
  const out = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      if (m[i][j][0] >= m[1 - i][j][0] && m[i][j][1] >= m[i][1 - j][1]) out.push(`${STRAT[i]}${STRAT[j]}`);
    }
  }
  return out;
};
const DIL_OPTIONS = [
  { id: 'VV', text: 'Obě firmy zvolí vysokou cenu (V, V)' },
  { id: 'VN', text: 'Firma A zvolí vysokou cenu, firma B nízkou (V, N)' },
  { id: 'NV', text: 'Firma A zvolí nízkou cenu, firma B vysokou (N, V)' },
  { id: 'NN', text: 'Obě firmy zvolí nízkou cenu (N, N)' },
];

function buildDilema({ m }) {
  const eq = nashCells(m)[0];
  const at = (i, j) => `(${m[i][j][0]};\\,${m[i][j][1]})`;
  const matrix = `\\begin{array}{c|cc} & B:\\ V & B:\\ N \\\\ \\hline A:\\ V & ${at(0, 0)} & ${at(0, 1)} \\\\ A:\\ N & ${at(1, 0)} & ${at(1, 1)} \\end{array}`;
  const bestA = [0, 1].map((j) => (m[0][j][0] > m[1][j][0] ? 'V' : 'N'));
  const bestB = [0, 1].map((i) => (m[i][0][1] > m[i][1][1] ? 'V' : 'N'));
  const cmpA = (j) => `${m[0][j][0]}\\ \\text{proti}\\ ${m[1][j][0]}`;
  const cmpB = (i) => `${m[i][0][1]}\\ \\text{proti}\\ ${m[i][1][1]}`;
  return mk('vezen-dilema', {
    data: { m },
    task: 'Dvě firmy v oligopolu současně volí cenu: vysokou (V) nebo nízkou (N). V tabulce je zisk firmy A a firmy B (v mil. Kč) pro každou kombinaci. Který výsledek nastane, když každá firma hledá nejlepší odpověď na volbu druhé (Nashova rovnováha)?',
    promptTex: matrix,
    answerSpec: { kind: 'choice', value: eq, options: DIL_OPTIONS },
    conclusion: `Rovnováha je (${eq[0]}, ${eq[1]}): žádná firma si změnou své volby nepolepší.`,
    source: { chapter: 7, number: 'prezentace 8' },
    solution: [
      { title: 'Nejlepší odpověď firmy A', text: 'Pro každou volbu firmy B porovnáme zisky firmy A (první číslo v závorce) v jejím řádku V a N a zvolíme větší.',
        board: [line(`B=V:\\ ${cmpA(0)}\\ \\Rightarrow\\ A=${bestA[0]}`), line(`B=N:\\ ${cmpA(1)}\\ \\Rightarrow\\ A=${bestA[1]}`)] },
      { title: 'Nejlepší odpověď firmy B', text: 'Stejně postupujeme u firmy B, která porovnává druhá čísla ve svém řádku (pro každou volbu firmy A).',
        board: [line(`A=V:\\ ${cmpB(0)}\\ \\Rightarrow\\ B=${bestB[0]}`), line(`A=N:\\ ${cmpB(1)}\\ \\Rightarrow\\ B=${bestB[1]}`)] },
      { title: 'Rovnováha', text: `Rovnováha je kombinace, ve které jsou volby obou firem vzájemně nejlepšími odpověďmi. Tady je to (${eq[0]}, ${eq[1]}) se zisky ${m[STRAT.indexOf(eq[0])][STRAT.indexOf(eq[1])].join(' a ')}. Nemusí to být výsledek, který by byl pro obě firmy nejlepší: v klasickém vězňově dilematu se firmám nevyplatí dodržet dohodu o vysoké ceně.`,
        board: [result(`(${eq[0]},\\,${eq[1]})`)] },
    ],
  });
}

function genDilema(rng) {
  for (let i = 0; i < 500; i++) {
    let m;
    if (rng() < 0.6) {
      const vals = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4).sort((x, y) => x - y);
      const [S, P, R, T] = vals;
      m = [[[R, R], [S, T]], [[T, S], [P, P]]];
    } else {
      const g = () => int(rng, 1, 9);
      m = [[[g(), g()], [g(), g()]], [[g(), g()], [g(), g()]]];
    }
    const strict = [0, 1].every((x) => [0, 1].every((y) => m[0][y][0] !== m[1][y][0] && m[x][0][1] !== m[x][1][1]));
    if (strict && nashCells(m).length === 1) return buildDilema({ m });
  }
  return buildDilema({ m: [[[3, 3], [1, 4]], [[4, 1], [2, 2]]] });
}

// ---------- typ: o jakou tržní strukturu jde ----------
const STRUCT_OPTIONS = [
  { id: 'dk', text: 'Dokonalá konkurence' }, { id: 'mon', text: 'Monopol' },
  { id: 'oli', text: 'Oligopol' }, { id: 'mk', text: 'Monopolistická konkurence' },
];
const STRUCTS = [
  { id: 's1', text: 'Na trhu je jediný prodávající, vstup dalším firmám je uzavřen a blízký substitut neexistuje.', a: 'mon', why: 'Jediný prodávající bez substitutů a s uzavřeným vstupem je monopol.' },
  { id: 's2', text: 'Na trhu působí několik málo firem a každá musí při rozhodování počítat s reakcí ostatních.', a: 'oli', why: 'Vzájemná závislost malého počtu firem je hlavním znakem oligopolu.' },
  { id: 's3', text: 'Na trhu je mnoho firem s jemně odlišenými výrobky a vstup do odvětví je volný.', a: 'mk', why: 'Mnoho firem, diferencovaný produkt a volný vstup patří k monopolistické konkurenci.' },
  { id: 's4', text: 'Mnoho firem prodává stejný (homogenní) produkt a žádná z nich nemůže ovlivnit cenu.', a: 'dk', why: 'Homogenní produkt a příjemci ceny jsou znakem dokonalé konkurence.' },
  { id: 's5', text: 'Vodu do města rozvádí jediná firma s velmi vysokými fixními náklady na potrubní síť.', a: 'mon', why: 'Vysoké fixní náklady sítě vedou k přirozenému monopolu.' },
  { id: 's6', text: 'Světový trh s ropou ovládá několik velkých producentů.', a: 'oli', why: 'Několik velkých producentů stejného produktu je typický oligopol.' },
  { id: 's7', text: 'V jedné čtvrti je mnoho restaurací, každá s trochu jiným jídelním lístkem, a noví provozovatelé mohou snadno přijít.', a: 'mk', why: 'Diferencované výrobky, mnoho firem a snadný vstup znamenají monopolistickou konkurenci.' },
  { id: 's8', text: 'Pěstitel pšenice prodává na burze, kde cenu určuje celkový trh a on ji nemůže změnit.', a: 'dk', why: 'Prodávající, který cenu nemůže ovlivnit, působí v dokonalé konkurenci.' },
  { id: 's9', text: 'Vláda udělila jediné firmě výhradní právo provozovat železniční dopravu na dané trati.', a: 'mon', why: 'Výhradní právo udělené státem je jednou z příčin vzniku monopolu.' },
  { id: 's10', text: 'Dvě největší firmy v odvětví se dohodly, že omezí produkci a rozdělí si trh.', a: 'oli', why: 'Dohoda několika málo firem o společném postupu je kartel, tedy forma oligopolu.' },
  { id: 's11', text: 'Jedna silná firma určuje cenu a několik menších firem tuto cenu jen přebírá.', a: 'oli', why: 'Oligopol s dominantní firmou: menší firmy tvoří konkurenční lem.' },
  { id: 's12', text: 'Výrobci zubních past mají poptávku vysoce elastickou, protože existuje mnoho blízkých substitutů, a velká část nákladů jde na reklamu.', a: 'mk', why: 'Výrazná reklama a blízké substituty jsou typické pro monopolistickou konkurenci.' },
];
const structById = (id) => STRUCTS.find((s) => s.id === id) ?? STRUCTS[0];

function buildStruktura({ id }) {
  const s = structById(id);
  const name = STRUCT_OPTIONS.find((o) => o.id === s.a).text;
  return mk('struktura', {
    points: 1,
    data: { id },
    task: `O jakou tržní strukturu jde? ${s.text}`,
    answerSpec: { kind: 'choice', value: s.a, options: STRUCT_OPTIONS },
    conclusion: `${name}. ${s.why}`,
    solution: [
      { title: 'Znaky ze zadání', text: 'Podle zadání určíme počet firem, druh výrobku a to, zda je vstup do odvětví volný.', board: [line('\\text{počet firem}\\ +\\ \\text{produkt}\\ +\\ \\text{vstup}')] },
      { title: 'Porovnání se čtyřmi strukturami', text: 'Jediný prodávající je monopol, několik málo je oligopol, mnoho s odlišenými výrobky je monopolistická konkurence a mnoho s totožným výrobkem je dokonalá konkurence.', board: [line('1\\ \\to\\ \\text{monopol},\\ \\ \\text{málo}\\ \\to\\ \\text{oligopol},\\ \\ \\text{mnoho}\\ \\to\\ \\text{MK nebo DK}')] },
      { title: 'Závěr', text: `${s.why}`, board: [result(`\\text{${name}}`)] },
    ],
  });
}

// ---------- typ: čtení grafu monopolu ----------
const CTENI_OPTIONS = ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `Množství označené ${id}` }));

function buildCteni({ a, b, v, w, F, order }) {
  const qm = (a - v) / (2 * (b + w)); const qk = (a - v) / (b + 2 * w); const q0 = a / (2 * b); const qmax = a / b;
  const base = [qm, qk, q0, qmax];
  const ids = ['A', 'B', 'C', 'D'];
  const pts = order.map((k, i) => ({ id: ids[i], x: r9(base[k]), kind: k }));
  const right = pts.find((p) => p.kind === 0);
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(v, w), ...ACc(v, w, F)],
    points: pts.map((p) => ({ x: p.x, y: 0, label: p.id })), alt: 'Monopol: poptávka, MR, MC, AC a označená množství',
  });
  const mcq = r9(v + 2 * w * right.x);
  return mk('cteni-grafu', {
    data: { a, b, v, w, F, order, pts },
    task: 'Graf ukazuje monopolní firmu s poptávkou D, mezním příjmem MR, mezními náklady MC a průměrnými náklady AC. Rovnice jsou pod grafem. Na ose Q jsou označena čtyři množství A až D. Při kterém z nich firma maximalizuje zisk?',
    promptTex: `${demandEq(a, b)},\\quad ${costQuad(F, v, w)}`,
    answerSpec: { kind: 'choice', value: right.id, options: CTENI_OPTIONS },
    conclusion: `Zisk je největší při množství ${right.id}, kde se kříží MR a MC.`,
    source: { chapter: 7, number: '7.1/1 a 7.2/2 až 5' },
    solution: [
      { title: 'Pravidlo pro monopol', text: 'Monopol maximalizuje zisk tam, kde se protínají křivky MR a MC. Poptávka D a křivka AC k určení výstupu nejsou potřeba (AC rozhoduje až o výši zisku).', board: [line('MR=MC')] },
      { title: 'Hledáme průsečík MR a MC', text: `V grafu najdeme křivku MR (klesá dvakrát rychleji než D) a rostoucí MC. Protínají se nad množstvím ${right.id}.`, viz: graph },
      { title: 'Co jsou ostatní možnosti', text: 'Průsečík D a MC označuje množství dokonalé konkurence (P = MC), nulový MR (úsek, kde MR protíná osu Q) je největší možný příjem a průsečík D s osou Q je největší možná poptávka. Žádné z nich není optimem monopolu.',
        board: [result(`\\text{optimum: ${right.id}}\\quad (MR=MC=${cz(mcq)})`)] },
    ],
  });
}

function genCteni(rng) {
  for (let i = 0; i < 200; i++) {
    const b = int(rng, 2, 5); const w = int(rng, 1, 2); const v = int(rng, 4, 20); const Qm = int(rng, 4, 12);
    const a = v + 2 * (b + w) * Qm;
    const qk = (a - v) / (b + 2 * w); const q0 = a / (2 * b); const qmax = a / b; const qm = Qm;
    const arr = [qm, qk, q0, qmax].sort((x, y) => x - y);
    if (!arr.every((x, k) => k === 0 || x - arr[k - 1] > 0.05 * qmax)) continue;
    const gross = (b + w) * Qm * Qm;
    const F = 5 * int(rng, 1, Math.max(1, Math.floor((gross * 0.7) / 5)));
    return buildCteni({ a, b, v, w, F, order: shuffle(rng, [0, 1, 2, 3]) });
  }
  return buildCteni({ a: 60, b: 1, v: 10, w: 1, F: 20, order: [0, 1, 2, 3] });
}

// ---------- typ: pravda, nebo nepravda ----------
// Úkoly C z cvičebnice kap. 7. Odpovědi podle knihy kromě 7.1 i (v knize A, správně N).
const STATEMENTS = [
  { id: 'k71-a', text: 'Poptávková křivka monopolu je zároveň tržní poptávkovou křivkou.', truth: true, why: 'Monopol je jediný prodávající, a jeho poptávka je proto celá tržní poptávka.' },
  { id: 'k71-b', text: 'Cena produkce monopolu je vždy nižší než mezní příjmy monopolu.', truth: false, why: 'Je tomu naopak: mezní příjem monopolu je nižší než cena, protože k prodeji dalšího kusu musí snížit cenu všech.' },
  { id: 'k71-c', text: 'Monopol při tvorbě ceny své produkce nerespektuje tržní poptávku po daném výrobku.', truth: false, why: 'Cena je odvozena z poptávky: monopol může cenu stanovit jen tak vysoko, kolik jsou kupující ochotni zaplatit.' },
  { id: 'k71-d', text: 'K určení optimální výše výstupu monopolista vždy potřebuje znát velikost mezních nákladů.', truth: true, why: 'Optimum je tam, kde MR = MC, takže bez MC ho nenajdeme.' },
  { id: 'k71-e', text: 'Monopolní sílu lze vyjádřit Lernerovým indexem.', truth: true, why: 'Lernerův index L = (P − MC)/P měří, o kolik cena převyšuje mezní náklad.' },
  { id: 'k71-f', text: 'Přirozený monopol předpokládá rostoucí výnosy z rozsahu při výrobě daného statku.', truth: true, why: 'Průměrné náklady klesají s rostoucím objemem, a jediná firma proto vyrábí nejlevněji.' },
  { id: 'k71-g', text: 'Při stejných nákladech a poptávce prodává monopol své výrobky za cenu vyšší než v dokonalé konkurenci.', truth: true, why: 'Monopol omezuje výstup a cena je nad MC, zatímco v dokonalé konkurenci se P rovná MC.' },
  { id: 'k71-h', text: 'Monopolní výrobce vyrábí takové množství produkce, které poptávka žádá.', truth: false, why: 'Monopol vyrábí méně, než by při ceně rovné mezním nákladům poptávka vyžadovala, a vzniká mrtvá ztráta.' },
  { id: 'k71-i', text: 'Monopol vždy dosahuje monopolní zisk.', truth: false, why: 'Kniha uvádí A, ale správně je N. Monopol může mít i ztrátu, když je poptávka nízká nebo náklady vysoké a cena nepokryje průměrné náklady.' },
  { id: 'k71-j', text: 'Daňová politika je nástrojem regulace monopolu.', truth: true, why: 'Daň z monopolního zisku ho snižuje a přitom neovlivní vyráběné množství.' },
  { id: 'k72-a', text: 'V oligopolním odvětví vyrábějí všechny firmy heterogenní produkt.', truth: false, why: 'Oligopol může mít homogenní i diferencovaný produkt (například ropa je homogenní).' },
  { id: 'k72-b', text: 'Má-li trh podobu oligopolu s dominantní firmou, potom při poklesu ceny dodává dominantní firma na trh větší množství než dříve.', truth: true, why: 'Při nižší ceně dodá konkurenční lem méně, a na dominantní firmu proto zbyde větší díl trhu.' },
  { id: 'k72-c', text: 'Oligopolisté se mohou snažit chovat jako monopoly.', truth: true, why: 'Kartelovou nebo tichou dohodou se mohou snažit omezit výrobu a zvýšit cenu jako monopol. Při nekooperativním chování (vězňovo dilema) se tak nechovají.' },
  { id: 'k72-e', text: 'Pro firmy v oligopolu při maximalizaci zisku neplatí zlaté pravidlo MR = MC.', truth: false, why: 'Zlaté pravidlo platí pro každou firmu, která maximalizuje zisk.' },
  { id: 'k72-f', text: 'Konkurenční lem je skupina firem, která ovlivňuje množství a cenu produkce dominantní firmy.', truth: false, why: 'Je tomu naopak: firmy lemu cenu dominantní firmy přejímají a jen doplňují trh.' },
  { id: 'k72-g', text: 'Při růstu ceny v oligopolu s dominantní firmou podíl dominantní firmy na trhu roste.', truth: false, why: 'Vyšší cena přiláká výrobu malých firem, jejich podíl roste a podíl dominantní firmy klesá.' },
  { id: 'k72-h', text: 'Firmy v oligopolu nejsou při rozhodování o množství a ceně vzájemně závislé.', truth: false, why: 'Vzájemná závislost firem je hlavním znakem oligopolu.' },
  { id: 'k72-i', text: 'Duopol představuje dvě firmy v odvětví.', truth: true, why: 'Duopol je nejjednodušší oligopol s dvěma prodávajícími.' },
  { id: 'k72-j', text: 'Vláda reguluje oligopoly prostřednictvím antitrustových zákonů.', truth: true, why: 'Antitrustové zákony zakazují například dohody o cenách a omezují slučování firem.' },
  { id: 'k73-a', text: 'Typickým znakem monopolistické konkurence je homogenní produkt.', truth: false, why: 'Produkt je diferencovaný, firmy nabízejí podobné, ale ne stejné výrobky.' },
  { id: 'k73-b', text: 'V monopolistické konkurenci existují bariéry vstupu do odvětví.', truth: false, why: 'Vstup do odvětví je volný, a právě proto zisk v dlouhém období zmizí.' },
  { id: 'k73-c', text: 'Každá firma v monopolistické konkurenci prodává za cenu vyšší, než jsou mezní náklady.', truth: true, why: 'Firma má klesající poptávku, a platí tedy P > MR = MC.' },
  { id: 'k73-d', text: 'Monopolistická konkurence vede ke značnému využívání reklamy a značek.', truth: true, why: 'Díky diferenciaci produktu se firmy snaží reklamou odlišit od konkurentů.' },
  { id: 'k73-f', text: 'Rozhodování každé firmy v monopolistické konkurenci o množství a ceně je nezávislé na ostatních firmách.', truth: true, why: 'Firem je mnoho, a žádná proto nemusí sledovat reakci jednotlivých konkurentů.' },
  { id: 'k73-g', text: 'Velké množství substitutů ovlivňuje elasticitu poptávkové křivky každé firmy.', truth: true, why: 'Čím víc blízkých substitutů, tím elastičtější (plošší) je poptávka po výrobku firmy.' },
  { id: 'k73-h', text: 'Rozhodování firmy o výstupu a ceně v krátkém období řídí zlaté pravidlo MR = MC a kritérium AVC.', truth: true, why: 'Výstup určuje MR = MC, a když firma vyrábí se ztrátou, pokračuje, jen pokud cena pokryje AVC.' },
  { id: 'k73-i', text: 'V dlouhém období firma v monopolistické konkurenci dosahuje nulový ekonomický zisk.', truth: true, why: 'Nové firmy vstupují, dokud se cena nevyrovná průměrným nákladům.' },
  { id: 'k73-j', text: 'Příchod nových firem do odvětví v monopolistické konkurenci posune poptávkovou křivku firmy doleva.', truth: true, why: 'Trh se rozdělí mezi víc firem, takže každá prodá při dané ceně méně.' },
  { id: 'own-1', text: 'Křivka mezního příjmu monopolu s lineární poptávkou klesá dvakrát strměji než poptávka.', truth: true, why: 'MR = a − 2bQ má stejný úsek a dvojnásobný sklon.' },
  { id: 'own-2', text: 'Monopol má svou křivku nabídky.', truth: false, why: 'Monopol je tvůrce ceny a množství určuje z MR = MC, takže křivka nabídky neexistuje.' },
  { id: 'own-3', text: 'Monopol maximalizující zisk vyrábí na neelastické části poptávky.', truth: false, why: 'Na neelastické části je MR záporný, a proto tam monopol vyrábět nebude. Vyrábí na elastické části.' },
  { id: 'own-4', text: 'Mrtvá ztráta monopolu vzniká, protože monopol vyrábí méně, než je společensky žádoucí.', truth: true, why: 'Kusy, které kupující oceňují víc než MC, se nevyrobí, a společnost přichází o část přebytků.' },
  { id: 'own-5', text: 'Daň z monopolního zisku sníží množství, které monopol vyrábí.', truth: false, why: 'Daň z celého zisku nemění MR ani MC, takže optimální množství zůstane stejné. Daň na jednotku výstupu by množství snížila.' },
  { id: 'own-6', text: 'Lernerův index nabývá hodnot od 0 do 1 a čím je vyšší, tím větší je monopolní síla.', truth: true, why: 'L = (P − MC)/P: při dokonalé konkurenci je nula a roste s odchylkou ceny od MC.' },
  { id: 'own-7', text: 'V dlouhém období je poptávková křivka firmy v monopolistické konkurenci tečnou ke křivce průměrných nákladů.', truth: true, why: 'Nulový zisk znamená P = AC právě v jediném bodě, v němž se křivky dotýkají.' },
  { id: 'own-8', text: 'Firma v monopolistické konkurenci vyrábí v dlouhém období na minimu průměrných nákladů.', truth: false, why: 'Tečna k poptávce je klesající, a proto se dotýká AC před minimem. Firma má nevyužitou kapacitu.' },
  { id: 'own-9', text: 'Kartel se chová jako jeden monopol a maximalizuje zisk celého odvětví.', truth: true, why: 'Členové se dohodnou na množství podle MR = MC odvětví a rozdělí si kvóty.' },
  { id: 'own-10', text: 'Při stropu ceny pod cenou monopolu je cena vždy rovna MC.', truth: false, why: 'Strop mezi MC a cenou monopolu cenu stanoví na úrovni stropu, ne MC. Teprve strop rovný MC by dal výsledek dokonalé konkurence.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];
const BOOK_CODE = (id) => `C-${id.slice(1, 2)}.${id.slice(2, 3)}${id.slice(4)}`;

function buildAnoNe({ id }) {
  const s = stmtById(id);
  const book = /^k7\d-/.test(id);
  return mk('ano-ne', {
    points: 1,
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: book ? { chapter: 7, number: BOOK_CODE(id) } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a vyhledáme pojem, na kterém stojí.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'monopol', q: 'Co je monopol?', right: 'Tržní struktura s jediným prodávajícím, bez blízkých substitutů a s uzavřeným vstupem do odvětví.', wrong: ['Tržní struktura, kde několik málo firem vzájemně ovlivňuje své chování.', 'Trh s mnoha firmami a volným vstupem.', 'Situace, kdy na trhu existuje jediný kupující.'] },
  { id: 'prirozeny-monopol', q: 'Co je přirozený monopol?', right: 'Odvětví, kde jedna firma pokryje poptávku s nižšími náklady než dvě a více firem (rostoucí výnosy z rozsahu).', wrong: ['Monopol vzniklý vlastnictvím jediného výrobního zdroje.', 'Monopol vzniklý udělením patentu státem.', 'Monopol bez jakýchkoli nákladů.'] },
  { id: 'mr-monopol', q: 'Co platí o mezním příjmu monopolu s klesající poptávkou?', right: 'Mezní příjem je nižší než cena a křivka MR klesá dvakrát rychleji než křivka poptávky.', wrong: ['Mezní příjem se rovná ceně jako v dokonalé konkurenci.', 'Mezní příjem je vyšší než cena.', 'Mezní příjem je u monopolu konstantní.'] },
  { id: 'optimum-monopol', q: 'Za jaké podmínky monopol maximalizuje zisk?', right: 'Při množství, kde se mezní příjem rovná mezním nákladům (MR = MC). Cenu pak určí poptávka.', wrong: ['Při množství, kde se cena rovná mezním nákladům (P = MC).', 'Při množství, kde se cena rovná průměrným nákladům.', 'Při množství, kde je celkový příjem nulový.'] },
  { id: 'lerner', q: 'Co měří Lernerův index?', right: 'Monopolní sílu: L = (P − MC)/P, hodnotu 0 až 1.', wrong: ['Elasticitu nabídky v bodě optima.', 'Velikost mrtvé ztráty v korunách.', 'Podíl firmy na trhu.'] },
  { id: 'mrtva-ztrata', q: 'Co je mrtvá ztráta monopolu?', right: 'Ztráta společnosti plynoucí z toho, že monopol vyrábí méně než při dokonalé konkurenci: trojúhelník mezi poptávkou a MC.', wrong: ['Zisk, který monopol získá nad normální zisk.', 'Fixní náklady monopolu.', 'Daň, kterou monopol odvede státu.'] },
  { id: 'oligopol', q: 'Co je oligopol?', right: 'Trh s několika málo prodávajícími, kteří si uvědomují vzájemnou závislost; existují bariéry vstupu.', wrong: ['Trh s jediným prodávajícím.', 'Trh s mnoha firmami a volným vstupem.', 'Trh s několika kupujícími a jedním prodávajícím.'] },
  { id: 'kartel', q: 'Co je kartel?', right: 'Skupina firem, které se dohodly a chovají se společně jako monopol (omezí výrobu a rozdělí si kvóty).', wrong: ['Skupina firem, které si navzájem tvrdě konkurují cenou.', 'Firma s výhradním právem uděleným státem.', 'Sdružení spotřebitelů, které vyjednává nižší ceny.'] },
  { id: 'dominantni-firma', q: 'Jak se chová dominantní firma v oligopolu?', right: 'Je cenový vůdce: z vlastní (zbytkové) poptávky určí množství a cenu podle MR = MC a malé firmy její cenu přebírají.', wrong: ['Přebírá cenu určenou malými firmami.', 'Vyrábí vždy tam, kde P = MC.', 'Nemá žádnou křivku poptávky.'] },
  { id: 'lem', q: 'Co je konkurenční lem?', right: 'Skupina malých firem, které přijímají cenu dominantní firmy a doplňují trh o množství, které dominantní firma nedodá.', wrong: ['Skupina firem, která určuje cenu a množství dominantní firmy.', 'Hranice, nad kterou se nesmí zvýšit cena.', 'Firmy, které opustily odvětví.'] },
  { id: 'mk', q: 'Jaké jsou základní znaky monopolistické konkurence?', right: 'Mnoho firem, jemně diferencované výrobky, volný vstup do odvětví a vysoce elastická poptávka po výrobku firmy.', wrong: ['Jediný prodávající a uzavřený vstup.', 'Několik málo firem s homogenním produktem.', 'Mnoho firem s homogenním produktem a nulovým vlivem na cenu.'] },
  { id: 'mk-dlouhe', q: 'Jaká je rovnováha firmy v monopolistické konkurenci v dlouhém období?', right: 'Poptávka je tečnou k AC, platí P = AC, ekonomický zisk je nulový a P je vyšší než MC.', wrong: ['Firma dosahuje trvale kladný ekonomický zisk.', 'Cena se rovná mezním nákladům a výroba je na minimu AC.', 'Firma vyrábí tam, kde MR je nulový.'] },
];
const defById = (id) => DEFS.find((d) => d.id === id) ?? DEFS[0];

function buildDefinice({ id, order }) {
  const df = defById(id);
  const texts = [df.right, ...df.wrong];
  const options = (order && order.length === 4 ? order : [0, 1, 2, 3]).map((i) => ({ id: `o${i}`, text: texts[i] }));
  return mk('definice', {
    part: 'zkouska',
    points: 2,
    data: { id, order: options.map((o) => Number(o.id.slice(1))) },
    task: df.q,
    answerSpec: { kind: 'choice', value: 'o0', options },
    conclusion: df.right,
    solution: [
      { title: 'Pojem', text: 'Najdeme klíčový pojem otázky a vybavíme si jeho definici nebo graf.', board: [line('\\text{pojem}\\ \\Rightarrow\\ \\text{definice}')] },
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti zaměňují struktury nebo obracejí vztah. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function buildGrafMonopol({ a, b, c, F }) {
  const { Q, P } = monoLin({ a, b, c });
  const acq = r9(c + F / Q);
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c), ...ACc(c, 0, F)],
    points: [{ x: Q, y: P, label: 'M', guides: true }, { x: Q, y: c, label: '' }],
    areas: profitRect(P, acq, Q), alt: 'Rovnováha monopolu se ziskem',
  });
  return mk('graf-monopol', {
    part: 'zkouska',
    points: 4,
    data: { a, b, c, F },
    task: 'Nakreslete do grafu s osami P a Q poptávku D, mezní příjem MR, mezní náklad MC a průměrné náklady AC monopolu. Vyznačte optimální množství, monopolní cenu a plochu zisku.',
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: 'Optimální množství je u průsečíku MR a MC, cena je na poptávce nad ním a zisk je obdélník mezi cenou a AC.',
    source: { chapter: 7, number: '7.1/1' },
    solution: [
      { title: 'Křivky', text: 'Poptávka D klesá. MR začíná ve stejném bodě na ose P a klesá dvakrát rychleji. MC je rostoucí nebo vodorovná a AC má tvar písmene U.', board: [line('MR\\ \\text{pod}\\ D')] },
      { title: 'Optimální množství', text: 'Od průsečíku MR a MC vedeme svislici dolů na osu Q: vznikne optimální množství.', board: [line('MR=MC\\ \\Rightarrow\\ Q^*')] },
      { title: 'Cena a zisk', text: 'Stejná svislice nahoru protne poptávku v monopolní ceně. Zisk je obdélník o šířce rovné optimálnímu množství a výšce rozdílu ceny a AC.', board: [line('\\pi=(P^*-AC)\\cdot Q^*')], viz: graph },
    ],
  });
}

function buildGrafMrtva({ a, b, c }) {
  const { Q, P } = monoLin({ a, b, c });
  const Qk = r9((a - c) / b);
  const graph = econViz({
    a, b, curves: [D(a, b), MRc(a, b), MCc(c)],
    points: [{ x: Q, y: P, label: 'M', guides: true }, { x: Qk, y: c, label: 'K', guides: true }],
    areas: [{ between: [`${a} - ${b}*x`, `${c}`], from: Q, to: Qk, label: 'DWL', color: 'warn' }], alt: 'Mrtvá ztráta monopolu',
  });
  return mk('graf-mrtva', {
    part: 'zkouska',
    points: 4,
    data: { a, b, c },
    task: 'Nakreslete poptávku D, mezní příjem MR a konstantní mezní náklad MC. Vyznačte rovnováhu monopolu M, rovnováhu dokonalé konkurence K a šrafováním mrtvou ztrátu.',
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: 'Mrtvá ztráta je trojúhelník mezi D a MC od Q monopolu po Q konkurence.',
    source: { chapter: 7, number: 'prezentace 7' },
    solution: [
      { title: 'Rovnováha monopolu', text: 'MR protíná MC v množství Q monopolu, cena je výš na poptávce (bod M).', board: [line('MR=MC\\ \\Rightarrow\\ Q_M,\\ P_M')] },
      { title: 'Rovnováha dokonalé konkurence', text: 'Při P = MC se poptávka protíná s MC v bodě K s větším množstvím.', board: [line('D=MC\\ \\Rightarrow\\ Q_K')] },
      { title: 'Mrtvá ztráta', text: 'Trojúhelník mezi D a MC vlevo od K a vpravo od množství monopolu je mrtvá ztráta.', board: [line('DWL=\\tfrac12(Q_K-Q_M)(P_M-MC)')], viz: graph },
    ],
  });
}

function buildGrafMk({ b, v, k, j }) {
  const { F, a, a0 } = mkGeometry({ b, v, k, j });
  const P = a - b * k;
  const graph = econViz({
    a: a0, b, curves: [D(a, b), { ...D(a0, b), label: 'D0', color: 'accent', dashed: true }, MRc(a, b), MCc(v), ...ACc(v, 0, F)],
    points: [{ x: k, y: P, label: 'LR', guides: true }], alt: 'Monopolistická konkurence v dlouhém období',
  });
  return mk('graf-mk-dlouhe', {
    part: 'zkouska',
    points: 4,
    data: { b, v, k, j },
    task: 'Nakreslete firmu v monopolistické konkurenci v dlouhém období: poptávku d, mezní příjem MR, mezní náklad MC a průměrné náklady AC. Vyznačte množství a cenu a ukažte, že firma má nulový zisk.',
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: 'Poptávka se dotýká AC v bodě, kde MR = MC. Platí P = AC, zisk je nulový.',
    source: { chapter: 7, number: '7.3/1' },
    solution: [
      { title: 'Křivky', text: 'Nakreslíme klesající poptávku d (plošší než tržní), MR pod ní a křivky MC a AC.', board: [line('d,\\ MR,\\ MC,\\ AC')] },
      { title: 'Tečna', text: 'Příchod firem posune poptávku doleva, až se dotýká křivky AC v jediném bodě. Pod tímto bodem se kříží MR a MC.', board: [line('d\\ \\text{tečná k}\\ AC')] },
      { title: 'Nulový zisk', text: 'V bodě dotyku platí P = AC a také MR = MC (vedle sebe na svislici). Firma nemá zisk ani ztrátu a cena je nad MC.', board: [line('P=AC>MC')], viz: graph },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('mon-optimum', 'Optimum monopolu (MR = MC)', genMonOpt, buildMonOpt),
  type('mon-kvadr', 'Monopol s rostoucím mezním nákladem', genMonKvadr, buildMonKvadr),
  type('mr-rovnice', 'Rovnice mezního příjmu', genMrRovnice, buildMrRovnice),
  type('mon-tabulka', 'Tabulka TR, MR, MC a zisk', genTabulka, buildTabulka),
  type('prebytek', 'Přebytek spotřebitele u monopolu', genPrebytek, buildPrebytek),
  type('mrtva-ztrata', 'Mrtvá ztráta monopolu', genMrtva, buildMrtva),
  type('srovnani', 'Monopol a dokonalá konkurence', genSrovnani, buildSrovnani),
  type('lerner', 'Lernerův index a elasticita', genLerner, buildLerner),
  type('strop-monopol', 'Maximální cena pro monopol', genStrop, buildStrop),
  type('dan-monopol', 'Daň na jednotku u monopolu', genDan, buildDan),
  type('kartel', 'Kartel jako monopol', genKartel, buildKartel),
  type('dominantni', 'Oligopol s dominantní firmou', genDominantni, buildDominantni),
  type('mk-dlouhe', 'Monopolistická konkurence v dlouhém období', genMkDlouhe, buildMkDlouhe),
  type('vezen-dilema', 'Vězňovo dilema (Nashova rovnováha)', genDilema, buildDilema),
  type('struktura', 'Která tržní struktura to je?', (rng) => buildStruktura({ id: pick(rng, ids(STRUCTS)) }), buildStruktura),
  type('cteni-grafu', 'Čtení grafu monopolu', genCteni, buildCteni),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-monopol', 'Nakresli rovnováhu monopolu (zkouška)', (rng) => {
    const d = genMonOpt(rng).data; return buildGrafMonopol({ a: d.a, b: d.b, c: d.c, F: d.F });
  }, buildGrafMonopol),
  type('graf-mrtva', 'Nakresli mrtvou ztrátu (zkouška)', (rng) => {
    const d = genMrtva(rng).data; return buildGrafMrtva(d);
  }, buildGrafMrtva),
  type('graf-mk-dlouhe', 'Nakresli monopolistickou konkurenci v dlouhém období (zkouška)', (rng) => {
    const d = genMkDlouhe(rng).data; return buildGrafMk({ b: d.b, v: d.v, k: d.k, j: d.j });
  }, buildGrafMk),
];

// ---------- výklad ----------
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 60], range: [0, 60], curves, ...extra } });
const DM = { expr: '60 - x', label: 'D', color: 'blue' };
const MRM = { expr: '60 - 2*x', label: 'MR', color: 'green' };
const MCM = { expr: '12', label: 'MC', color: 'chalk' };
const ACM = { expr: '12 + 120/x', label: 'AC', color: 'warn' };

const theory = [
  { heading: 'Nedokonalá konkurence a její formy', term: 'Nedokonalá konkurence',
    text: 'Nedokonalá konkurence je trh, na kterém má aspoň jeden prodávající (nebo kupující) moc ovlivnit cenu. Dokonale konkurenční firma cenu přijímá jako danou, kdežto firma s tržní mocí si cenu do určité míry volí sama.\n\nPodle počtu firem a podoby výrobku rozlišujeme tři formy:\n\n• monopol: jediný prodávající, žádný blízký substitut,\n• oligopol: několik málo firem, které se vzájemně ovlivňují,\n• monopolistická konkurence: mnoho firem s podobnými, ale ne stejnými výrobky a volným vstupem.\n\nZ nich vychází i otázka na zkoušce: nejdřív podle zadání určit, o kterou strukturu jde.',
    mistakes: ['Nezaměňujte monopolistickou konkurenci s monopolem. Je to opačný konec: firem je mnoho a vstup je volný.', 'Oligopol nemá vždy diferencovaný produkt. Světový trh s ropou je oligopol s homogenním produktem.'] },
  { heading: 'Monopol: znaky a příčiny vzniku', term: 'Monopol',
    text: 'Monopol je trh s jediným prodávajícím, bez blízkých substitutů, na který je vstup dalším firmám uzavřen. Monopol je tvůrce ceny: může zvolit cenu, ale jen takovou, kterou kupující ještě při daném množství zaplatí.\n\nPříčiny vzniku jsou bariéry vstupu:\n\n• nákladové podmínky: jediná firma vyrábí s nižšími náklady než několik firem (přirozený monopol),\n• vlastnictví jediného výrobního zdroje,\n• výhradní právo na výrobu udělené státem (patent, licence).\n\nPřirozený monopol má rostoucí výnosy z rozsahu: s růstem výroby klesají průměrné náklady, a nové firmy se proto do odvětví nehrnou. Typické jsou sítě: voda, kabelová televize, telekomunikace.',
    mistakes: ['Monopol nemá křivku nabídky. Množství i cenu určuje z MR = MC a poptávky, a nelze proto říct, kolik by vyrobil při dané ceně.'] },
  { heading: 'Příjmy monopolu: TR, AR a MR', term: 'Mezní příjem monopolu',
    text: 'Poptávka po výrobku monopolu je celá tržní poptávka, a proto klesá. Chce-li monopol prodat víc, musí snížit cenu všech kusů, nejen toho posledního.\n\nPrůměrný příjem AR = TR/Q se rovná ceně, a křivka AR je tedy poptávka. Mezní příjem MR je přírůstek celkového příjmu při prodeji dalšího kusu. Je vždy nižší než cena, protože nový kus sice přinese novou cenu, ale zlevní se i všechny dosud prodávané.\n\nPro lineární poptávku platí:',
    tex: 'P=a-bQ\\ \\Rightarrow\\ TR=aQ-bQ^2\\ \\Rightarrow\\ MR=a-2bQ',
    viz: view([DM, MRM], { points: [{ x: 30, y: 0, label: 'MR=0' }] }),
    mistakes: ['MR klesá dvakrát rychleji než poptávka: stejný úsek a (na ose P), ale dvojnásobný sklon 2b. Protíná osu Q v polovině toho, co poptávka.', 'MR je nižší než cena: P > MR. Opačný zápis (cena nižší než MR) je chyba.'] },
  { heading: 'Optimum monopolu a zisk', term: 'Zlaté pravidlo MR = MC',
    text: 'Monopol maximalizuje zisk jako každá firma: zvyšuje výrobu, dokud přírůstek příjmu (MR) převyšuje přírůstek nákladů (MC). Optimum je v bodě MR = MC.\n\nPostup při výpočtu: 1. najdeme MR z poptávky, 2. najdeme MC z nákladů, 3. vyřešíme MR = MC pro množství Q, 4. cenu P dosadíme z poptávky (ne z MR), 5. zisk je TR − TC, tedy (P − AC)·Q.\n\nZisk je v grafu obdélník: šířka Q, výška rozdíl ceny a průměrných nákladů při tomto množství.',
    tex: 'MR=MC\\ \\Rightarrow\\ Q^*,\\quad P^*=a-bQ^*,\\quad \\pi=(P^*-AC)\\,Q^*',
    viz: view([DM, MRM, MCM, ACM], { points: [{ x: 24, y: 36, label: 'M', guides: true }], areas: [{ between: ['36', '17'], from: 0, to: 24, label: 'zisk', color: 'accent' }] }),
    mistakes: ['Cena se nepočítá z rovnice MR = MC, ale dosadí se množství do poptávky. Zapomenout na tento poslední krok je nejčastější chyba.', 'Monopol nemá zaručený zisk: když je cena pod AC, vyrábí se ztrátou, a vyplatí se výroba jen tehdy, když cena pokryje alespoň AVC.', 'Rovnice MR = MC se píše s mezním nákladem z nákladové funkce: fixní náklady v MC nejsou.'] },
  { heading: 'Monopolní síla a Lernerův index', term: 'Lernerův index',
    text: 'Monopolní síla je schopnost firmy stanovit cenu nad mezními náklady. Měří ji Lernerův index. V optimu monopolu platí, že se rovná převrácené hodnotě absolutní elasticity poptávky, takže čím je poptávka po výrobku méně elastická (méně substitutů), tím větší je monopolní síla. Při lineární poptávce P = a − bQ vychází elasticita v bodě optima z |E| = P/(b·Q).',
    tex: 'L=\\frac{P-MC}{P}=\\frac{1}{|E|}',
    mistakes: ['Lernerův index je mezi 0 a 1. Nula znamená dokonalou konkurenci (P = MC), čím blíž jedné, tím větší monopolní síla.', 'Monopol vyrábí vždy na elastické části poptávky (|E| > 1), protože jen tam je MR kladný.'] },
  { heading: 'Mrtvá ztráta a srovnání s dokonalou konkurencí', term: 'Mrtvá ztráta',
    text: 'Při stejné poptávce a stejných nákladech vyrábí monopol méně a prodává dráž než dokonale konkurenční odvětví, kde se cena rovná MC. U lineární poptávky a konstantního MC je výstup monopolu přesně poloviční.\n\nZ vynechaných kusů by společnost měla prospěch: kupující by za ně zaplatili víc, než stojí výroba. Toto zmizelé blaho je mrtvá ztráta (DWL), trojúhelník mezi poptávkou a MC mezi množstvím monopolu a množstvím konkurence.',
    tex: 'DWL=\\tfrac12\\,(Q_K-Q_M)(P_M-MC)',
    viz: view([DM, MRM, MCM], { points: [{ x: 24, y: 36, label: 'M', guides: true }, { x: 48, y: 12, label: 'K', guides: true }], areas: [{ between: ['60 - x', '12'], from: 24, to: 48, label: 'DWL', color: 'warn' }] }),
    mistakes: ['Zisk monopolu není mrtvá ztráta. Zisk jde monopolu, mrtvá ztráta nikomu: je to ztráta celé společnosti.'] },
  { heading: 'Regulace monopolu', term: 'Regulace monopolu',
    text: 'Stát má nástroje, jak monopol omezit:\n\n• antitrustové zákony zakazují například dohody o cenách a slučování firem (u nás Úřad pro ochranu hospodářské soutěže),\n• daň z monopolního zisku sníží zisk, ale množství se nezmění (MR ani MC se nehnou),\n• daň na jednotku výstupu zvýší MC, a monopol proto sníží množství a zvýší cenu (u lineární poptávky o polovinu daně),\n• maximální cena: leží-li mezi MC a cenou monopolu, mění MR na vodorovnou čáru a monopol vyrobí víc a prodá levněji (strop rovný MC dává výsledek dokonalé konkurence),\n• státní vlastnictví nebo regulovaná cena u přirozených monopolů.',
    mistakes: ['Daň z celého zisku nesnižuje výrobu, daň na kus ano. Obě se snadno zaměňují.', 'Cenový strop pod MC by naopak vedl ke ztrátě a snížení výroby.'] },
  { heading: 'Oligopol a kartel', term: 'Kartel',
    text: 'Oligopol je trh s několika málo prodávajícími, kteří vědí, že jejich rozhodnutí ovlivní konkurenty. Typicky existují bariéry vstupu a výrobek je homogenní nebo diferencovaný.\n\nSmluvní oligopol (kartel) vznikne, když se firmy dohodnou a chovají se jako jeden monopol: odvětví vyrobí množství z MR = MC a prodá za monopolní cenu, firmám se přidělí kvóty. Příklad: dvě firmy by si rozdělily monopolní množství na dvě poloviny.\n\nVězňovo dilema vysvětluje, proč kartely často nevydrží. Každá firma má motiv porušit dohodu (snížit cenu), i když by obě společně dosáhly nejvyššího zisku při dodržení dohody. Nashova rovnováha je výsledek, v němž žádná firma nechce svou volbu jednostranně změnit.',
    mistakes: ['Kartel je dohoda firem, a taková dohoda je podle antitrustových zákonů zakázaná.', 'Rovnováha ve vězňově dilematu (obě porušují) není pro firmy nejlepší výsledek.'] },
  { heading: 'Oligopol s dominantní firmou', term: 'Konkurenční lem',
    text: 'V odvětví je jedna silná firma (cenový vůdce) a skupina malých firem, tzv. konkurenční lem. Malé firmy cenu dominantní firmy jen přijímají a doplňují trh.\n\nPostup: 1. dominantní firma dostane poptávku po svém výrobku jako zbytek tržní poptávky po odečtení lemu, 2. nalezne MR (dvojnásobný sklon) a vyřeší MR = MC pro množství q, 3. dosadí do své poptávky cenu p, 4. při této ceně spočteme celkové množství Q z tržní poptávky, 5. konkurenční lem dodá Q − q.',
    tex: 'MR_{DF}=MC\\ \\Rightarrow\\ q_{DF},\\quad p=d(q_{DF}),\\quad q_{lem}=Q(p)-q_{DF}',
    viz: { kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 30], range: [0, 60], curves: [{ expr: '60 - 2*x', label: 'D', color: 'blue' }, { expr: '40 - x', label: 'dDF', color: 'accent' }, { expr: '40 - 2*x', label: 'MR', color: 'green' }, { expr: '8', label: 'MC', color: 'chalk' }], points: [{ x: 16, y: 24, label: 'DF', guides: true }, { x: 18, y: 24, label: 'Q' }] } },
    mistakes: ['Konkurenční lem cenu neurčuje: dominantní firma cenu určí a lem ji přijme.', 'Při růstu ceny roste výroba lemu, a podíl dominantní firmy tedy klesá.'] },
  { heading: 'Monopolistická konkurence v krátkém období', term: 'Monopolistická konkurence',
    text: 'Monopolistická konkurence je trh s mnoha firmami, které nabízejí podobné, ale ne stejné výrobky (diferenciace, značky, reklama), a vstup do odvětví je volný. Každá firma je malým monopolem ve svém výrobku, ale s mnoha blízkými substituty, a proto je její poptávka vysoce elastická (plošší než u monopolu).\n\nV krátkém období rozhoduje firma jako monopol: MR = MC, cena z poptávky a zisk (P − AC)·Q. Při ztrátě pokračuje ve výrobě, jen když cena pokryje AVC.',
    viz: view([{ expr: '22 - x', label: 'd', color: 'blue' }, { expr: '22 - 2*x', label: 'MR', color: 'green' }, { expr: '10', label: 'MC', color: 'chalk' }, { expr: '10 + 9/x', label: 'AC', color: 'warn' }], { domain: [0, 22], range: [0, 24], points: [{ x: 6, y: 16, label: 'SR', guides: true }], areas: [{ between: ['16', '11.5'], from: 0, to: 6, label: 'zisk', color: 'accent' }] }),
    mistakes: ['I v krátkém období platí, že cena je nad MC, protože firma má klesající poptávku.'] },
  { heading: 'Monopolistická konkurence v dlouhém období', term: 'Dlouhodobá rovnováha monopolistické konkurence',
    text: 'Zisk láká do odvětví nové firmy. Trh se mezi ně rozdělí, a poptávka po výrobku každé firmy se proto posouvá doleva. Příchod firem trvá, dokud zisk nezmizí: poptávka se dotkne křivky AC (je její tečnou) a platí P = AC.\n\nV bodě dotyku jsou splněny dvě podmínky: P = AC (nulový ekonomický zisk) a MR = MC (optimum firmy). Cena je přitom vyšší než MC, a firma proto není alokačně efektivní, a protože tečna je klesající, vyrábí před minimem AC (nevyužitá kapacita), na rozdíl od dokonalé konkurence.',
    tex: 'P=AC,\\qquad MR=MC,\\qquad P>MC,\\qquad \\pi=0',
    viz: view([{ expr: '16 - x', label: 'd', color: 'blue' }, { expr: '16 - 2*x', label: 'MR', color: 'green' }, { expr: '10', label: 'MC', color: 'chalk' }, { expr: '10 + 9/x', label: 'AC', color: 'warn' }], { domain: [0, 16], range: [0, 16], points: [{ x: 3, y: 13, label: 'LR', guides: true }] }),
    mistakes: ['V dlouhém období platí P = AC, ale ne P = MC jako v dokonalé konkurenci.', 'Nezaměňujte tečnu s průsečíkem: poptávka se AC dotýká a neprotíná ji.'] },
];

export default {
  id: 'nedokonala-konkurence', title: 'Nedokonalá konkurence', order: 6, theory, types,
};
