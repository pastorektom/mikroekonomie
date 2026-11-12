// Téma 11: Tržní selhání a mikroekonomická politika státu (podle skript kap. 12 a prezentace 11).
// Cvičebnice kapitolu o tržním selhání nemá (její kap. 12 je matematika), proto jsou všechny úlohy vlastní.
// Stejný tvar jako tema02.js: theory + types (generate(rng) vylosuje data, solve(data) postaví celý příklad).
//
// Značení: Q množství v kusech, P cena v Kč; MPB soukromý mezní prospěch (poptávka), MPC soukromé mezní náklady (nabídka),
// MEC externí mezní náklad, MSC = MPC + MEC, MEB externí mezní prospěch, MSB = MPB + MEB.
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'selhani';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- zápis rovnic a grafy ----------
const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
const nice = (v) => {
  const p = 10 ** Math.floor(Math.log10(v));
  return STEPS.find((f) => f * p >= v - 1e-9) * p;
};
const decl = (A, B) => `P=${cz(A)}-${coef(B, 'Q')}`; // klesající křivka
const incl = (C, D) => `P=${cz(C)}+${coef(D, 'Q')}`; // rostoucí křivka
const lin = (a, b) => `${a} - ${b}*x`;
const rise = (a, b) => `${a} + ${b}*x`;
const frame = (maxQ, maxP) => ({ axes: { x: 'Q', y: 'P' }, domain: [0, nice(maxQ)], range: [0, nice(maxP)] });

// Graf negativní nebo pozitivní externality s konstantním externím mezním nákladem/prospěchem e.
// neg: MPB, MPC, MSC = MPC + e; pos: MPB, MSB = MPB + e, MPC.
function extViz(mode, { A, B, C, D, e }) {
  const s = B + D;
  const neg = mode === 'neg';
  const Qm = (A - C) / s; const Qo = neg ? (A - C - e) / s : (A + e - C) / s;
  const Pm = A - B * Qm;
  const Po = neg ? A - B * Qo : C + D * Qo;
  const fr = neg ? frame(A / B, A) : frame((A + e) / B, A + e);
  const curves = neg
    ? [{ expr: lin(A, B), label: 'MPB', color: 'blue' }, { expr: rise(C, D), label: 'MPC', color: 'chalk' }, { expr: rise(C + e, D), label: 'MSC', color: 'warn' }]
    : [{ expr: lin(A, B), label: 'MPB', color: 'blue' }, { expr: lin(A + e, B), label: 'MSB', color: 'warn' }, { expr: rise(C, D), label: 'MPC', color: 'chalk' }];
  const area = neg
    ? { between: [rise(C + e, D), lin(A, B)], from: Qo, to: Qm, label: 'ztráta', color: 'warn' }
    : { between: [lin(A + e, B), rise(C, D)], from: Qm, to: Qo, label: 'ztráta', color: 'warn' };
  return {
    kind: 'econ',
    data: {
      ...fr,
      curves,
      points: [{ x: Qm, y: Pm, label: 'Etrh', guides: true }, { x: Qo, y: Po, label: 'Eopt', guides: true }],
      arrows: [],
      areas: [area],
      alt: neg ? 'Negativní externalita: MSC nad MPC, tržní množství větší než optimální, mrtvá ztráta' : 'Pozitivní externalita: MSB nad MPB, tržní množství menší než optimální, mrtvá ztráta',
    },
  };
}

// Graf Pigouovy daně. mec 'const': MSC = MPC + t (daň posune nabídku nahoru přesně na MSC);
// mec 'rising': MEC = kQ, MSC má větší sklon a daň t = kQopt posune MPC tak, aby protínala MPB v optimu.
function pigouViz({ A, B, C, D, mec, e = 0, k = 0, t }) {
  const s = B + D;
  const rising = mec === 'rising';
  const Qm = (A - C) / s;
  const Qo = rising ? (A - C) / (s + k) : (A - C - e) / s;
  const Pm = A - B * Qm; const Po = A - B * Qo;
  const taxLabel = rising ? 'MPC + t' : 'MSC = MPC + t';
  const curves = [
    { expr: lin(A, B), label: 'MPB', color: 'blue' },
    { expr: rise(C, D), label: 'MPC', color: 'chalk' },
    ...(rising ? [{ expr: rise(C, D + k), label: 'MSC', color: 'warn' }] : []),
    { expr: rise(C + t, D), label: taxLabel, color: 'accent', dashed: true },
  ];
  const x0 = Math.max(1, Math.floor(Qo / 2));
  return {
    kind: 'econ',
    data: {
      ...frame(A / B, A),
      curves,
      points: [{ x: Qm, y: Pm, label: 'Etrh', guides: true }, { x: Qo, y: Po, label: 'Eopt', guides: true }],
      arrows: [{ from: [x0, C + D * x0], to: [x0, C + t + D * x0], label: '' }],
      areas: [],
      alt: 'Pigouova daň posune nabídku nahoru a trh se přesune z tržního množství do společenského optima',
    },
  };
}

// ---------- zdroje čísel ----------
const SLOPES = [1, 2, 3];
function genExt(rng, mode) {
  const B = pick(rng, SLOPES); const D = pick(rng, SLOPES);
  const s = B + D; const k = int(rng, 2, 6); const C = pick(rng, [10, 20, 30, 40]);
  const e = s * k;
  if (mode === 'neg') {
    const Qo = int(rng, 8, 30);
    return { A: C + e + s * Qo, B, C, D, e };
  }
  const Qm = int(rng, 8, 30);
  return { A: C + s * Qm, B, C, D, e };
}

// ---------- typ: negativní externalita – množství ----------
const NEG_ASK = {
  Qopt: { noun: 'společensky optimální množství', unit: 'ks' },
  Qtrh: { noun: 'množství, které vyprodukuje trh bez zásahu státu', unit: 'ks' },
  nadprod: { noun: 'o kolik kusů trh vyprodukuje víc, než je společensky optimální', unit: 'ks' },
};

function buildNegExt({ A, B, C, D, e, ask }) {
  const s = B + D;
  const Qm = (A - C) / s; const Qo = (A - C - e) / s; const k = Qm - Qo;
  const Pm = A - B * Qm; const Po = A - B * Qo;
  const val = ask === 'Qopt' ? Qo : ask === 'Qtrh' ? Qm : k;
  const graph = extViz('neg', { A, B, C, D, e });
  return mk('neg-externalita', {
    data: { A, B, C, D, e, ask },
    task: `Výroba statku způsobuje třetím osobám externí mezní náklad ${cz(e)} Kč na každý vyrobený kus (MEC je konstantní). Soukromý mezní prospěch (poptávka) a soukromé mezní náklady (nabídka) popisují rovnice (P v Kč, Q v kusech). Určete: ${NEG_ASK[ask].noun}.`,
    promptTex: `MPB:\\ ${decl(A, B)},\\qquad MPC:\\ ${incl(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${ask === 'Qopt' ? 'Společensky optimální množství je' : ask === 'Qtrh' ? 'Trh vyprodukuje' : 'Nadprodukce činí'} ${czText(val)} ks.`,
    solution: [
      { title: 'Rovnováha trhu bez zásahu', text: 'Kupující i firmy rozhodují podle soukromých veličin a externí náklad do jejich rozhodování nevstupuje. Trh se proto ustálí tam, kde se soukromý mezní prospěch rovná soukromým mezním nákladům: $MPB=MPC$.',
        board: [line('MPB=MPC'), line(`${cz(A)}-${coef(B, 'Q')}=${cz(C)}+${coef(D, 'Q')}`), line(`${cz(A - C)}=${cz(s)}Q`), line(`Q_{trh}=${cz(Qm)}`)] },
      { title: 'Společenské mezní náklady', text: `Výroba škodí třetím osobám, a skutečné náklady pro společnost jsou proto vyšší než soukromé. Společenské mezní náklady jsou součet soukromých a externích: $MSC=MPC+MEC$. Křivka MSC leží o ${czText(e)} Kč nad křivkou MPC.`,
        board: [line('MSC=MPC+MEC'), line(`MSC:\\ ${incl(C + e, D)}`)] },
      { title: 'Společenské optimum', text: 'Z pohledu celé společnosti je množství efektivní tam, kde se mezní prospěch rovná společenským mezním nákladům: $MPB=MSC$. Poptávka tu vyjadřuje i společenský prospěch, protože u tohoto statku není externí prospěch.',
        board: [line('MPB=MSC'), line(`${cz(A)}-${coef(B, 'Q')}=${cz(C + e)}+${coef(D, 'Q')}`), line(`${cz(A - C - e)}=${cz(s)}Q`), line(`Q_{opt}=${cz(Qo)}`)] },
      { title: 'Porovnání a graf', text: `Trh vyprodukuje ${czText(Qm)} ks za cenu ${czText(Pm)} Kč, optimum je ${czText(Qo)} ks při ceně ${czText(Po)} Kč. Protože se při negativní externalitě nepočítá s externím nákladem, vzniká nadprodukce.`,
        board: [line(`Q_{trh}-Q_{opt}=${cz(Qm)}-${cz(Qo)}=${cz(k)}`)], viz: graph },
      { title: 'Závěr', text: `${ask === 'Qopt' ? 'Společensky optimální množství' : ask === 'Qtrh' ? 'Tržní množství' : 'Nadprodukce'} je ${czText(val)} ks.`,
        board: [result(ask === 'Qopt' ? `Q_{opt}=${cz(Qo)}` : ask === 'Qtrh' ? `Q_{trh}=${cz(Qm)}` : `Q_{trh}-Q_{opt}=${cz(k)}`)] },
    ],
  });
}

// ---------- typ: pozitivní externalita ----------
const POS_ASK = {
  Qopt: 'společensky optimální množství (kusů)',
  dotace: 'výši dotace na jeden kus (Kč), která množství posune do společenského optima',
  dwl: 'mrtvou ztrátu, která vzniká bez zásahu státu (Kč)',
  naklad: 'celkové náklady státu na dotaci v optimu (Kč)',
};

function buildPosExt({ A, B, C, D, e, ask }) {
  const s = B + D;
  const Qm = (A - C) / s; const Qo = (A + e - C) / s; const k = Qo - Qm;
  const dwl = (e * k) / 2; const cost = e * Qo;
  const val = { Qopt: Qo, dotace: e, dwl, naklad: cost }[ask];
  const graph = extViz('pos', { A, B, C, D, e });
  return mk('poz-externalita', {
    data: { A, B, C, D, e, ask },
    task: `Spotřeba statku přináší třetím osobám externí mezní prospěch ${cz(e)} Kč na každý kus (MEB je konstantní). Soukromý mezní prospěch (poptávka) a soukromé mezní náklady (nabídka) popisují rovnice (P v Kč, Q v kusech). Určete ${POS_ASK[ask]}.`,
    promptTex: `MPB:\\ ${decl(A, B)},\\qquad MPC:\\ ${incl(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${{ Qopt: `Společensky optimální množství je ${czText(Qo)} ks`, dotace: `Dotace je ${czText(e)} Kč na kus`, dwl: `Mrtvá ztráta je ${czText(dwl)} Kč`, naklad: `Dotace stojí stát ${czText(cost)} Kč` }[ask]}.`,
    solution: [
      { title: 'Rovnováha trhu bez zásahu', text: 'Soukromí kupující i firmy berou v úvahu jen soukromý prospěch a soukromé náklady. Trh se ustálí tam, kde $MPB=MPC$.',
        board: [line('MPB=MPC'), line(`${cz(A)}-${coef(B, 'Q')}=${cz(C)}+${coef(D, 'Q')}`), line(`${cz(A - C)}=${cz(s)}Q`), line(`Q_{trh}=${cz(Qm)}`)] },
      { title: 'Společenský mezní prospěch', text: `Spotřeba navíc prospívá i třetím osobám. Společenský mezní prospěch je součet soukromého a externího: $MSB=MPB+MEB$. Křivka MSB leží o ${czText(e)} Kč nad poptávkou.`,
        board: [line('MSB=MPB+MEB'), line(`MSB:\\ ${decl(A + e, B)}`)] },
      { title: 'Společenské optimum', text: 'Efektivní množství je tam, kde se společenský mezní prospěch rovná mezním nákladům: $MSB=MPC$. Optimum leží vpravo od tržního množství.',
        board: [line('MSB=MPC'), line(`${cz(A + e)}-${coef(B, 'Q')}=${cz(C)}+${coef(D, 'Q')}`), line(`${cz(A + e - C)}=${cz(s)}Q`), line(`Q_{opt}=${cz(Qo)}`)] },
      { title: 'Dotace a mrtvá ztráta', text: `Trh vyprodukuje o ${czText(k)} ks méně, než je optimální. Dotace rovná externímu meznímu prospěchu ${czText(e)} Kč na kus (spotřebiteli nebo výrobci) přivede množství do optima. Mrtvou ztrátu tvoří trojúhelník mezi MSB a MPC od ${czText(Qm)} do ${czText(Qo)} ks.`,
        board: [line(`s=MEB=${cz(e)}\\ \\text{Kč}`), line(`\\text{mrtvá ztráta}=\\frac{1}{2}\\cdot ${cz(e)}\\cdot ${cz(k)}=${cz(dwl)}`), line(`\\text{náklady dotace}=${cz(e)}\\cdot ${cz(Qo)}=${cz(cost)}`)], viz: graph },
      { title: 'Závěr', text: `${{ Qopt: `Společensky optimální množství je ${czText(Qo)} ks.`, dotace: `Dotace činí ${czText(e)} Kč na kus.`, dwl: `Mrtvá ztráta činí ${czText(dwl)} Kč.`, naklad: `Dotace stojí stát ${czText(cost)} Kč.` }[ask]}`,
        board: [result({ Qopt: `Q_{opt}=${cz(Qo)}`, dotace: `s=${cz(e)}\\ \\text{Kč}`, dwl: `\\text{mrtvá ztráta}=${cz(dwl)}\\ \\text{Kč}`, naklad: `s\\cdot Q_{opt}=${cz(cost)}\\ \\text{Kč}` }[ask])] },
    ],
  });
}

// ---------- typ: mrtvá ztráta externality (MSC zadaná rovnicí) ----------
function buildMrtva({ A, B, C, D, e }) {
  const s = B + D;
  const Qm = (A - C) / s; const Qo = (A - C - e) / s; const k = Qm - Qo; const dwl = (e * k) / 2;
  const graph = extViz('neg', { A, B, C, D, e });
  return mk('mrtva-ztrata', {
    data: { A, B, C, D, e },
    task: 'Znečišťující výroba má soukromý mezní prospěch (MPB), soukromé mezní náklady (MPC) a společenské mezní náklady (MSC) dané rovnicemi (P v Kč, Q v kusech). Vypočtěte mrtvou ztrátu, která vzniká tím, že trh produkuje bez zásahu státu.',
    promptTex: `MPB:\\ ${decl(A, B)},\\quad MPC:\\ ${incl(C, D)},\\quad MSC:\\ ${incl(C + e, D)}`,
    answerSpec: { kind: 'number', value: dwl },
    conclusion: `Mrtvá ztráta je ${czText(dwl)} Kč.`,
    solution: [
      { title: 'Externí mezní náklad', text: `Rozdíl MSC a MPC je externí mezní náklad: $MEC=MSC-MPC$. Obě křivky mají stejný sklon, a rozdíl je proto při každém množství stejný.`,
        board: [line('MEC=MSC-MPC'), line(`MEC=${cz(C + e)}-${cz(C)}=${cz(e)}`)] },
      { title: 'Množství trhu a optimum', text: 'Trh se ustálí v průsečíku MPB a MPC, společenské optimum je v průsečíku MPB a MSC.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${cz(C)}+${coef(D, 'Q')}\\ \\Rightarrow\\ Q_{trh}=${cz(Qm)}`), line(`${cz(A)}-${coef(B, 'Q')}=${cz(C + e)}+${coef(D, 'Q')}\\ \\Rightarrow\\ Q_{opt}=${cz(Qo)}`)] },
      { title: 'Plocha mrtvé ztráty', text: `Mrtvá ztráta je trojúhelník mezi MSC a MPB od optimálního po tržní množství. Jeho svislá strana u ${czText(Qm)} ks je právě MEC (${czText(e)} Kč), vodorovná strana je rozdíl množství ${czText(k)} ks. Každý kus mezi optimem a trhem stojí společnost víc, než přinese.`,
        board: [line(`\\Delta Q=Q_{trh}-Q_{opt}=${cz(Qm)}-${cz(Qo)}=${cz(k)}`)], viz: graph },
      { title: 'Výpočet obsahu', text: 'Obsah pravoúhlého trojúhelníku je polovina součinu odvěsen.',
        board: [result(`\\text{DWL}=\\frac{1}{2}\\cdot ${cz(e)}\\cdot ${cz(k)}=${cz(dwl)}\\ \\text{Kč}`)] },
    ],
  });
}

// ---------- typ: Pigouova daň ----------
const PIGOU_ASK = {
  t: 'sazbu Pigouovy daně na kus (Kč)',
  Pspotr: 'cenu, kterou po zavedení daně platí kupující (Kč)',
  vynos: 'celkový výnos daně (Kč)',
};

function buildPigou({ A, B, C, D, k, ask }) {
  const s = B + D;
  const Qo = (A - C) / (s + k); const t = k * Qo; const Pd = A - B * Qo; const Pp = Pd - t; const vynos = t * Qo;
  const val = { t, Pspotr: Pd, vynos }[ask];
  const graph = pigouViz({ A, B, C, D, mec: 'rising', k, t });
  return mk('pigou-dan', {
    data: { A, B, C, D, k, ask },
    task: `Soukromý mezní prospěch a soukromé mezní náklady výroby popisují rovnice (P v Kč, Q v kusech). Výroba způsobuje externí mezní náklad $MEC=${coef(k, 'Q')}$, který s množstvím roste. Stát uvalí na výrobce Pigouovu daň v pevné výši na kus, rovnou externímu meznímu nákladu při optimálním množství. Určete ${PIGOU_ASK[ask]}.`,
    promptTex: `MPB:\\ ${decl(A, B)},\\qquad MPC:\\ ${incl(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${{ t: `Sazba daně je ${czText(t)} Kč na kus`, Pspotr: `Kupující platí ${czText(Pd)} Kč`, vynos: `Výnos daně je ${czText(vynos)} Kč` }[ask]}.`,
    solution: [
      { title: 'Společenské optimum', text: 'Nejdřív najdeme množství, které je pro společnost efektivní. Společenské mezní náklady jsou $MSC=MPC+MEC$ a optimum leží tam, kde $MPB=MSC$.',
        board: [line(`MSC=${cz(C)}+${coef(D, 'Q')}+${coef(k, 'Q')}=${cz(C)}+${coef(s + k - B, 'Q')}`), line(`${cz(A)}-${coef(B, 'Q')}=${cz(C)}+${coef(D + k, 'Q')}`), line(`${cz(A - C)}=${cz(s + k)}Q`), line(`Q_{opt}=${cz(Qo)}`)] },
      { title: 'Daň = externí mezní náklad v optimu', text: `Pigouova daň má výrobce přinutit, aby zaplatil externí náklad, který způsobuje. Sazbou je proto externí mezní náklad při optimálním množství, ${czText(Qo)} ks. Při jiném množství by byla daň špatně nastavená.`,
        board: [line(`t=MEC(Q_{opt})=${coef(k, 'Q_{opt}')}`), line(`t=${cz(k)}\\cdot ${cz(Qo)}=${cz(t)}`)] },
      { title: 'Ověření: daň vede k optimu', text: 'Daň zvýší mezní náklady výrobce o $t$ na kus. Nabídka po zdanění je $P=C+t+DQ$, a protíná poptávku právě v optimálním množství.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${cz(C + t)}+${coef(D, 'Q')}`), line(`Q=\\frac{${cz(A - C - t)}}{${cz(s)}}=${cz(Qo)}`)], viz: graph },
      { title: 'Cena a výnos daně', text: `Kupující platí cenu z poptávky při množství ${czText(Qo)} ks. Výrobce z ní dostane o daň méně, tedy ${czText(Pp)} Kč, což odpovídá jeho soukromým mezním nákladům. Výnos daně je sazba krát množství.`,
        board: [line(`P_{kup}=${cz(A)}-${cz(B)}\\cdot ${cz(Qo)}=${cz(Pd)}`), line(`P_{vyr}=${cz(Pd)}-${cz(t)}=${cz(Pp)}`), line(`T=${cz(t)}\\cdot ${cz(Qo)}=${cz(vynos)}`)] },
      { title: 'Závěr', text: `${{ t: `Sazba daně je ${czText(t)} Kč na kus.`, Pspotr: `Po zavedení daně platí kupující ${czText(Pd)} Kč.`, vynos: `Výnos daně je ${czText(vynos)} Kč.` }[ask]}`,
        board: [result({ t: `t=${cz(t)}\\ \\text{Kč}`, Pspotr: `P_{kup}=${cz(Pd)}\\ \\text{Kč}`, vynos: `T=${cz(vynos)}\\ \\text{Kč}` }[ask])] },
    ],
  });
}

function genPigou(rng) {
  const B = pick(rng, SLOPES); const D = pick(rng, SLOPES); const k = int(rng, 1, 3);
  const C = pick(rng, [10, 20, 30, 40]); const Qo = int(rng, 8, 25);
  return buildPigou({ A: C + (B + D + k) * Qo, B, C, D, k, ask: pick(rng, ['t', 'Pspotr', 'vynos']) });
}

// ---------- typ: Coaseho teorém ----------
function buildCoase({ K, S, prava, ask }) {
  const mn = Math.min(K, S); const diff = Math.abs(S - K);
  const val = ask === 'naklady' ? mn : diff;
  const filter = K < S;
  const holder = prava === 'soused' ? 'Právo na čistý vzduch má sad.' : 'Právo znečišťovat má továrna.';
  let bargain;
  if (prava === 'soused') {
    bargain = filter
      ? `Továrna by musela sadu platit škodu ${czText(S)} Kč, nebo si pořídit filtr za ${czText(K)} Kč. Filtr je levnější, a továrna si ho proto pořídí.`
      : `Továrna by si pořídila filtr za ${czText(K)} Kč, nebo by sadu kompenzovala škodu ${czText(S)} Kč. Kompenzace je levnější, a továrna tedy raději škodu uhradí a filtr nepořídí.`;
  } else {
    bargain = filter
      ? `Sad snáší škodu ${czText(S)} Kč, a je proto ochoten továrně zaplatit až tolik, aby filtr instalovala. Filtr stojí ${czText(K)} Kč, takže se obě strany dohodnou: továrna filtr pořídí a sad jí přispěje.`
      : `Filtr stojí ${czText(K)} Kč, víc, než je škoda ${czText(S)} Kč. Sad by za něj nebyl ochoten zaplatit a škodu raději snáší, takže továrna filtr nepořídí.`;
  }
  return mk('coase', {
    data: { K, S, prava, ask },
    task: `Továrna znečišťuje vzduch a poškozuje sousední sad škodou ${cz(S)} Kč ročně. Filtr by škodu odstranil úplně a továrnu by stál ${cz(K)} Kč ročně. Vlastnická práva jsou jasně vymezená a transakční náklady jsou zanedbatelné. ${holder} ${ask === 'naklady' ? 'Kolik činí celkové roční náklady (filtr nebo škoda) po vyjednávání obou stran?' : 'O kolik Kč ročně jsou celkové náklady po vyjednávání nižší než v dražší z obou variant (filtr, nebo škoda)?'}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${ask === 'naklady' ? `Celkové roční náklady jsou ${czText(mn)} Kč` : `Úspora je ${czText(diff)} Kč ročně`}. Při jasných právech a nízkých transakčních nákladech výsledek nezávisí na tom, komu patří právo.`,
    solution: [
      { title: 'Dvě možná řešení', text: `Buď továrna pořídí filtr (náklad ${czText(K)} Kč), nebo se škoda ${czText(S)} Kč nechá vzniknout (a případně se hradí kompenzací). Společně obě strany nesou jen jednu z těchto dvou částek.`,
        board: [line(`\\text{filtr}:\\ ${cz(K)}\\ \\text{Kč}`), line(`\\text{škoda}:\\ ${cz(S)}\\ \\text{Kč}`)] },
      { title: 'Co by bylo efektivní', text: `Z hlediska obou stran dohromady je efektivní řešení s nižšími celkovými náklady. Zde je to ${filter ? 'filtr' : 'ponechání škody'}, protože ${czText(mn)} Kč je méně než ${czText(Math.max(K, S))} Kč.`,
        board: [line(`\\min(${cz(K)},\\,${cz(S)})=${cz(mn)}`)] },
      { title: 'Vyjednávání při daném vlastnickém právu', text: `${holder} ${bargain} Podle Coaseho teorému se strany dohodnou na efektivním řešení bez ohledu na to, komu právo patří (rozdělení nákladů se ale mezi nimi liší). Podmínkou jsou jasná vlastnická práva a nízké transakční náklady.`,
        board: [line(`\\text{náklady po dohodě}=${cz(mn)}\\ \\text{Kč}`), line(`|${cz(S)}-${cz(K)}|=${cz(diff)}\\ \\text{Kč}`)] },
      { title: 'Závěr', text: ask === 'naklady' ? `Celkové roční náklady po vyjednávání jsou ${czText(mn)} Kč.` : `Dohoda ušetří ${czText(diff)} Kč ročně proti dražší variantě.`,
        board: [result(ask === 'naklady' ? `${cz(mn)}\\ \\text{Kč}` : `${cz(diff)}\\ \\text{Kč}`)] },
    ],
  });
}

function genCoase(rng) {
  const K = int(rng, 4, 16) * 5000; let S = int(rng, 4, 16) * 5000;
  if (S === K) S += 10000;
  return buildCoase({ K, S, prava: pick(rng, ['firma', 'soused']), ask: pick(rng, ['naklady', 'rozdil']) });
}

// ---------- typ: obchodovatelná povolení ----------
const PERMIT_PAIRS = [[1, 2], [1, 3], [2, 3], [1, 4], [2, 4], [3, 5], [2, 6], [3, 6], [4, 6], [1, 5]];
const PERMIT_ASK = {
  cena: 'rovnovážnou cenu jednoho povolení (Kč za tunu)',
  xA: 'o kolik tun sníží emise firma A',
  naklady: 'celkové náklady snížení emisí obou firem (Kč)',
};

function buildPovoleni({ m1, m2, R, ask }) {
  const s = m1 + m2; const k = R / s;
  const xA = m2 * k; const xB = m1 * k; const price = m1 * xA;
  const costEff = (m1 * xA * xA + m2 * xB * xB) / 2;
  const costEq = ((m1 + m2) * (R / 2) ** 2) / 2;
  const val = { cena: price, xA, naklady: costEff }[ask];
  return mk('povoleni', {
    data: { m1, m2, R, ask },
    task: `Dvě firmy musí společně snížit emise o ${cz(R)} t ročně. Mezní náklady snížení emisí jsou u firmy A $MAC_A=${coef(m1, 'x_A')}$ a u firmy B $MAC_B=${coef(m2, 'x_B')}$ (Kč za tunu, $x$ je počet tun, o které firma emise sníží). Stát vydal povolení k emisím v takovém počtu, že se emise celkem sníží o ${cz(R)} t, a firmy s nimi mohou volně obchodovat (transakční náklady jsou zanedbatelné). Určete ${PERMIT_ASK[ask]}.`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${{ cena: `Cena povolení je ${czText(price)} Kč za tunu`, xA: `Firma A sníží emise o ${czText(xA)} t`, naklady: `Celkové náklady jsou ${czText(costEff)} Kč` }[ask]}.`,
    solution: [
      { title: 'Rovnost mezních nákladů', text: 'Firma s levnějším snížením emisí je sníží víc a prodá nepotřebná povolení. Obchod skončí, když si obě firmy snižují emise do úrovně, kde jejich mezní náklady snížení rovnají ceně povolení $p$. Proto $MAC_A=MAC_B=p$.',
        board: [line('MAC_A=MAC_B=p'), line(`x_A=\\frac{p}{${cz(m1)}},\\quad x_B=\\frac{p}{${cz(m2)}}`)] },
      { title: 'Cena povolení', text: `Součet snížení musí být ${czText(R)} t, a z toho dostaneme cenu povolení.`,
        board: [line(`\\frac{p}{${cz(m1)}}+\\frac{p}{${cz(m2)}}=${cz(R)}`), line(`p\\cdot\\frac{${cz(s)}}{${cz(m1 * m2)}}=${cz(R)}`), line(`p=${cz(price)}`)] },
      { title: 'Rozdělení snížení', text: `Z ceny povolení dopočteme, kolik tun sníží každá firma. Firma s nižšími mezními náklady (menší sklon) snižuje víc.`,
        board: [line(`x_A=\\frac{${cz(price)}}{${cz(m1)}}=${cz(xA)}`), line(`x_B=\\frac{${cz(price)}}{${cz(m2)}}=${cz(xB)}`), line(`x_A+x_B=${cz(xA + xB)}`)] },
      { title: 'Náklady snížení', text: `Celkové náklady jednotlivé firmy jsou plocha pod její křivkou MAC: $\\frac{1}{2}\\cdot m\\cdot x^2$. Při rovnoměrném rozdělení (každá firma po ${czText(R / 2)} t) by byly ${czText(costEq)} Kč, což je víc než při obchodování s povoleními.`,
        board: [line(`N_A=\\frac{1}{2}\\cdot ${cz(m1)}\\cdot ${cz(xA)}^2=${cz((m1 * xA * xA) / 2)}`), line(`N_B=\\frac{1}{2}\\cdot ${cz(m2)}\\cdot ${cz(xB)}^2=${cz((m2 * xB * xB) / 2)}`), line(`N=${cz(costEff)}`)] },
      { title: 'Závěr', text: `${{ cena: `Cena jednoho povolení je ${czText(price)} Kč za tunu.`, xA: `Firma A sníží emise o ${czText(xA)} t.`, naklady: `Celkové náklady obou firem jsou ${czText(costEff)} Kč.` }[ask]}`,
        board: [result({ cena: `p=${cz(price)}\\ \\text{Kč/t}`, xA: `x_A=${cz(xA)}\\ \\text{t}`, naklady: `N=${cz(costEff)}\\ \\text{Kč}` }[ask])] },
    ],
  });
}

function genPovoleni(rng) {
  const [m1, m2] = pick(rng, PERMIT_PAIRS);
  const s = m1 + m2;
  return buildPovoleni({ m1, m2, R: s * int(rng, 2, 8), ask: pick(rng, ['cena', 'xA', 'naklady']) });
}

// ---------- typ: druh statku podle vylučitelnosti a rivality ----------
const GOODS = [
  { text: 'jablko v obchodě', excl: true, riv: true, why: 'Kdo nezaplatí, jablko nedostane (vylučitelné), a co jednou sní jeden, nemůže sníst druhý (rivalitní).' },
  { text: 'oblečení', excl: true, riv: true, why: 'Bez zaplacení se oblečení neprodá a jeden kus může nosit jen jeden člověk.' },
  { text: 'pizza k obědu', excl: true, riv: true, why: 'Prodejce vyloučí neplatící a snědenou pizzu už nikdo jiný nesní.' },
  { text: 'ryby ve volném oceánu', excl: false, riv: true, why: 'Rybařit může v otevřeném moři prakticky kdokoli (nevylučitelné), ale každá ulovená ryba chybí ostatním (rivalitní).' },
  { text: 'společná pastvina, na které smí pást každý obyvatel obce', excl: false, riv: true, why: 'Nikoho nelze od pastvy snadno vyloučit, ale tráva spasená jedním zvířetem chybí ostatním.' },
  { text: 'přeplněná silnice bez mýta', excl: false, riv: true, why: 'Na silnici bez mýta nelze nikoho zastavit (nevylučitelné), ale při přeplnění každé další auto zpomaluje ostatní (rivalitní).' },
  { text: 'kabelová televize', excl: true, riv: false, why: 'Neplatící divák se dá odpojit (vylučitelné), a další divák přitom ostatním nic neubere (nerivalitní).' },
  { text: 'soukromý park s placeným vstupem, který není přeplněný', excl: true, riv: false, why: 'Vstup se dá zpoplatnit (vylučitelné), a dokud není plno, další návštěvník ostatním nepřekáží (nerivalitní).' },
  { text: 'předplacený streamovací kanál s filmy', excl: true, riv: false, why: 'Přístup mají jen předplatitelé (vylučitelné), ale další divák ostatním nic neubere (nerivalitní).' },
  { text: 'národní obrana', excl: false, riv: false, why: 'Ochrana území se týká všech obyvatel (nevylučitelné) a další obyvatel ochranu ostatním nezmenší (nerivalitní).' },
  { text: 'základní výzkum, jehož výsledky jsou volně dostupné', excl: false, riv: false, why: 'Poznatky nelze nikomu zakázat používat (nevylučitelné) a jejich použití jedním je neodebere ostatním (nerivalitní).' },
  { text: 'pouliční osvětlení', excl: false, riv: false, why: 'Světlo využije každý, kdo půjde kolem (nevylučitelné), a další chodec ostatním světlo neubere (nerivalitní).' },
  { text: 'maják', excl: false, riv: false, why: 'Světlo majáku vidí každá loď (nevylučitelné) a další loď ostatním neubírá (nerivalitní).' },
];
const GOOD_OPTIONS = [
  { id: 'soukromy', text: 'Soukromý statek' },
  { id: 'klubovy', text: 'Klubový statek' },
  { id: 'spolecny', text: 'Společný zdroj (společný statek)' },
  { id: 'verejny', text: 'Čistě veřejný statek' },
];
const goodClass = (g) => (g.excl ? (g.riv ? 'soukromy' : 'klubovy') : (g.riv ? 'spolecny' : 'verejny'));
const GOOD_NAME = { soukromy: 'soukromý statek', klubovy: 'klubový statek', spolecny: 'společný zdroj', verejny: 'čistě veřejný statek' };

function buildStatek({ item }) {
  const g = GOODS[item] ?? GOODS[0];
  const cls = goodClass(g);
  return mk('typ-statku', {
    data: { item, excl: g.excl, riv: g.riv },
    task: `O jaký druh statku jde: ${g.text}? Posuzujte běžné podmínky z popisu.`,
    answerSpec: { kind: 'choice', value: cls, options: GOOD_OPTIONS },
    conclusion: `Jde o ${GOOD_NAME[cls]}. ${g.why}`,
    solution: [
      { title: 'Vylučitelnost', text: `Ptáme se: lze neplatícího spotřebitele ze spotřeby snadno vyloučit? U statku „${g.text}“ ${g.excl ? 'ano, statek je vylučitelný' : 'ne, statek je nevylučitelný'}.`,
        board: [line(g.excl ? '\\text{vylučitelný}' : '\\text{nevylučitelný}')] },
      { title: 'Rivalita', text: `Ptáme se: zmenšuje spotřeba jednoho člověka množství nebo kvalitu pro ostatní? ${g.riv ? 'Ano, statek je rivalitní.' : 'Ne, statek je nerivalitní (ve skriptech „nezmenšitelný“).'}`,
        board: [line(g.riv ? '\\text{rivalitní}' : '\\text{nerivalitní}')] },
      { title: 'Zařazení do tabulky', text: `Vylučitelný a rivalitní je soukromý statek. Vylučitelný a nerivalitní je klubový statek. Nevylučitelný a rivalitní je společný zdroj. Nevylučitelný a nerivalitní je čistě veřejný statek. ${g.why}`,
        board: [line(`\\text{${g.excl ? 'vylučitelný' : 'nevylučitelný'},}\\ \\text{${g.riv ? 'rivalitní' : 'nerivalitní'}}`)] },
      { title: 'Závěr', text: `Jde o ${GOOD_NAME[cls]}.`,
        board: [result(`\\text{${GOOD_NAME[cls]}}`)] },
    ],
  });
}

// ---------- typ: asymetrické informace ----------
const ASYM_OPTIONS = [
  { id: 'nepriznivy', text: 'Nepříznivý výběr' },
  { id: 'moralni', text: 'Morální hazard' },
  { id: 'jine', text: 'Žádný z nich (jiné tržní selhání)' },
];
const ASYM_ITEMS = [
  { kind: 'nepriznivy', text: 'Na trhu s ojetými auty zná kvalitu vozu jen prodávající. Kupující proto nabídnou průměrnou cenu, kvalitní vozy se za ni neprodávají a z trhu mizí.', why: 'Informace je skrytá před uzavřením obchodu a kvalitní zboží je vytlačováno méně kvalitním.' },
  { kind: 'nepriznivy', text: 'Zdravotní pojišťovna nezná zdravotní stav žadatelů. Pojištění se proto nejvíc vyplatí těžce nemocným a ti jej uzavírají nejčastěji.', why: 'Rizikovější zájemci se pojišťují častěji a pojišťovna jejich riziko před uzavřením smlouvy nezná.' },
  { kind: 'nepriznivy', text: 'Banka nezná, které projekty jsou rizikové. Vyšší úrok odradí bezpečné žadatele a přihlásí se hlavně ti s rizikovými záměry.', why: 'Vyšší cena vyřazuje spolehlivé klienty ještě před poskytnutím úvěru.' },
  { kind: 'moralni', text: 'Řidič po sjednání havarijního pojištění jezdí méně opatrně, protože škodu uhradí pojišťovna a ta jeho chování nevidí.', why: 'Chování se změní až po uzavření smlouvy a protistrana ho nemůže pozorovat.' },
  { kind: 'moralni', text: 'Manažer najatý vlastníky firmy využívá firemní prostředky na své výhody a vlastníci nevidí, jak se skutečně rozhoduje.', why: 'Zástupce (manažer) jedná na úkor zastoupeného po uzavření smlouvy a jeho jednání nelze snadno pozorovat.' },
  { kind: 'moralni', text: 'Podnikatel, jehož půjčku by v případě krachu hradil stát (záruka), začne investovat do mnohem rizikovějších projektů než dříve.', why: 'Po zajištění proti riziku se chování změní a riziko nese druhá strana.' },
  { kind: 'moralni', text: 'Majitel domu, který se pojistil proti požáru, přestane kontrolovat elektroinstalaci.', why: 'Pojištění snižuje jeho motivaci předcházet škodě a pojišťovna jeho chování nesleduje.' },
  { kind: 'jine', text: 'Továrna vypouští do řeky odpad a znečištění poškozuje rybáře níže po proudu, který za škodu nedostane odškodné.', why: 'Jde o negativní externalitu, ne o informační problém.' },
  { kind: 'jine', text: 'Jediný dodavatel vody ve městě zvýší cenu nad mezní náklady, protože zákazníci nemají jinou možnost.', why: 'Jde o tržní sílu (monopol), ne o informační problém.' },
  { kind: 'jine', text: 'Městské osvětlení nelze zpoplatnit a mnoho lidí by raději nic neplatilo.', why: 'Jde o problém černého pasažéra u veřejného statku.' },
];
const ASYM_NAME = { nepriznivy: 'nepříznivý výběr', moralni: 'morální hazard', jine: 'jiné tržní selhání' };

function buildAsym({ item }) {
  const it = ASYM_ITEMS[item] ?? ASYM_ITEMS[0];
  return mk('asym-info', {
    data: { item, kind: it.kind },
    task: `Rozhodněte, který jev popisuje tato situace: ${it.text}`,
    answerSpec: { kind: 'choice', value: it.kind, options: ASYM_OPTIONS },
    conclusion: `Jde o ${it.kind === 'jine' ? 'jiné tržní selhání' : ASYM_NAME[it.kind]}. ${it.why}`,
    solution: [
      { title: 'Je v situaci informační nerovnováha?', text: it.kind === 'jine' ? 'Zkoumáme, zda jedna strana ví víc než druhá. Zde nejde o rozdíl ve znalostech, ale o jiný problém.' : 'Jedna strana ví víc než druhá, a jde proto o asymetrickou informaci.',
        board: [line(it.kind === 'jine' ? '\\text{asymetrie informací: ne}' : '\\text{asymetrie informací: ano}')] },
      { title: 'Kdy problém vzniká?', text: 'Nepříznivý výběr vzniká před uzavřením smlouvy: protistrana nezná skrytou vlastnost (kvalitu, riziko). Morální hazard vzniká po uzavření smlouvy: protistrana nevidí skrytou činnost (chování).',
        board: [line('\\text{před smlouvou}\\Rightarrow\\text{NV}'), line('\\text{po smlouvě}\\Rightarrow\\text{MH}')] },
      { title: 'Zařazení', text: it.why,
        board: [line(`\\text{${ASYM_NAME[it.kind]}}`)] },
      { title: 'Závěr', text: `Správně: ${ASYM_NAME[it.kind]}.`, board: [result(`\\text{${ASYM_NAME[it.kind]}}`)] },
    ],
  });
}

// ---------- typ: jaký nástroj řeší externalitu ----------
const TOOL_OPTIONS = [
  { id: 'dan', text: 'Pigouova daň' },
  { id: 'dotace', text: 'Dotace (Pigouova subvence)' },
  { id: 'coase', text: 'Dohoda stran podle Coaseho teorému' },
  { id: 'povoleni', text: 'Obchodovatelná povolení' },
  { id: 'regulace', text: 'Přímá regulace (příkaz, limit, zákaz)' },
];
const TOOL_ITEMS = [
  { tool: 'dan', text: 'Stát uloží továrnám platit pevnou částku za každou tunu vypuštěných emisí.', why: 'Platba za jednotku znečištění přenáší externí náklad na znečišťovatele: jde o Pigouovu daň.' },
  { tool: 'dan', text: 'Stát zavede poplatek za každý litr paliva v hodnotě odhadnuté škody na životním prostředí.', why: 'Poplatek rovný externímu meznímu nákladu je Pigouova daň.' },
  { tool: 'dotace', text: 'Stát platí část nákladů na očkování, protože očkovaný člověk chrání i druhé.', why: 'Aktivita s pozitivní externalitou se podporuje částkou na jednotku: jde o dotaci.' },
  { tool: 'dotace', text: 'Stát přispívá domácnostem na každý metr čtvereční zateplené fasády, protože úspora energie snižuje emise.', why: 'Příspěvek na jednotku činnosti s kladnými externími účinky je dotace.' },
  { tool: 'coase', text: 'Majitel hostince a sousedé si bez zásahu státu dohodnou kompenzaci za hluk, protože práva jsou jasná a jednání je levné.', why: 'Dobrovolná dohoda soukromých stran při jasných právech a nízkých transakčních nákladech odpovídá Coaseho teorému.' },
  { tool: 'coase', text: 'Rybáři mají jasné vlastnické právo na rybník a elektrárna jim za použití vody dobrovolně vyplácí odškodné.', why: 'Jasně vymezené právo umožňuje vyjednávání mezi stranami, a nepotřebuje se daň ani zákaz.' },
  { tool: 'povoleni', text: 'Stát vydá omezený počet povolení k emisi oxidu uhličitého a firmy je mohou mezi sebou kupovat a prodávat.', why: 'Stát určí celkové množství a trh povolení ho rozdělí k firmám s nejnižšími náklady na snížení emisí.' },
  { tool: 'regulace', text: 'Zákon stanoví nejvyšší přípustný obsah škodlivin ve výfukových plynech a za překročení hrozí pokuta.', why: 'Závazný limit pod hrozbou sankce je přímá regulace.' },
  { tool: 'regulace', text: 'Stát zakáže používání určité toxické látky ve výrobě.', why: 'Zákaz je nejpřísnější forma přímé regulace.' },
];

function buildNastroj({ item }) {
  const it = TOOL_ITEMS[item] ?? TOOL_ITEMS[0];
  const name = TOOL_OPTIONS.find((o) => o.id === it.tool).text;
  return mk('nastroj', {
    data: { item, tool: it.tool },
    task: `Který nástroj řešení externalit je popsán? ${it.text}`,
    answerSpec: { kind: 'choice', value: it.tool, options: TOOL_OPTIONS },
    conclusion: `${name}. ${it.why}`,
    solution: [
      { title: 'Jak se řeší externalita?', text: 'Externalitu lze řešit čtyřmi hlavními způsoby: tržně konformními nástroji (Pigouova daň nebo dotace, obchodovatelná povolení), přímou regulací (příkaz, limit, zákaz) a dohodou soukromých stran podle Coaseho teorému.',
        board: [line('\\text{daň / dotace / povolení / regulace / dohoda}')] },
      { title: 'Co situace popisuje', text: it.why, board: [line(`\\text{${it.tool === 'dan' ? 'cena za škodu' : it.tool === 'dotace' ? 'příspěvek za prospěch' : it.tool === 'coase' ? 'dohoda stran' : it.tool === 'povoleni' ? 'trh s právy' : 'příkaz a sankce'}}`)] },
      { title: 'Závěr', text: `Správně: ${name}.`, board: [result(`\\text{${name}}`)] },
    ],
  });
}

// ---------- typ: pravda, nebo nepravda ----------
// kn-* jsou úkoly pravda/nepravda z konce kap. 12 skript (správné odpovědi P, P, P, N, N, P, N, N, P). Úkol i) (lékař a pacient)
// se nepřebírá: spadá spíš do vztahu zmocnitel a zmocněnec a skripta ho zařazují nepřesně.
const STATEMENTS = [
  { id: 'kn-a', text: 'Účinky spotřeby nebo výroby, které dopadají na subjekty, které s danou činností nejsou přímo spojeny, se nazývají externality.', truth: true, why: 'Přesně tak je externalita definovaná: vliv na třetí osobu, který se neprojeví v tržní ceně.' },
  { id: 'kn-b', text: 'V případě pozitivní externality trh produkuje příliš málo zboží.', truth: true, why: 'Společenský prospěch je větší než soukromý, a trh bez zásahu proto vyrobí méně, než je efektivní.' },
  { id: 'kn-c', text: 'V případě negativní externality trh produkuje příliš mnoho zboží.', truth: true, why: 'Společenské náklady jsou vyšší než soukromé, a trh bez zásahu proto vyrobí víc, než je efektivní.' },
  { id: 'kn-d', text: 'Statek je nerivalitní (nezmenšitelný) tehdy, jestliže není možné nikoho vyloučit ze spotřeby, i když za statek neplatí.', truth: false, why: 'To je nevylučitelnost. Nerivalita znamená, že spotřeba jednoho nezmenšuje množství pro ostatní. Jsou to dvě různé vlastnosti.' },
  { id: 'kn-e', text: 'V podmínkách nedokonalé konkurence ceny statků a služeb vždy signalizují efektivní tržní vztahy.', truth: false, why: 'Při tržní síle je cena nad mezními náklady a produkuje se méně než efektivní množství.' },
  { id: 'kn-f', text: 'Asymetrická informace je nerovnoměrná informace mezi účastníky trhu.', truth: true, why: 'Jedna strana má o zboží nebo o situaci víc informací než druhá.' },
  { id: 'kn-g', text: 'Problém černého pasažéra patří mezi problémy asymetrických informací.', truth: false, why: 'Souvisí s nevylučitelností veřejných statků (nikdo nechce platit, když z užívání nelze vyloučit), nikoli s informacemi.' },
  { id: 'kn-h', text: 'Nepříznivý výběr na trhu může vytěsňovat kvalitní zboží z trhu méně kvalitním zbožím.', truth: true, why: 'Kupující nepoznají kvalitu a platí průměrnou cenu. Kvalitní zboží se pak neprodává a z trhu mizí.' },
  { id: 'kn-j', text: 'Důsledkem tržních selhání je produkce jiného než společensky optimálního množství.', truth: true, why: 'Tržní selhání znamená, že trh bez zásahu nedosáhne efektivní alokace, a množství je tedy příliš velké nebo příliš malé.' },
  { id: 'own-1', text: 'Coaseho teorém říká, že externalitu vždy vyřeší dohoda soukromých stran bez ohledu na transakční náklady.', truth: false, why: 'Teorém předpokládá jasná vlastnická práva a nízké transakční náklady. Při vysokých nákladech vyjednávání (mnoho poškozených) dohoda nevznikne.' },
  { id: 'own-2', text: 'Pigouova daň u negativní externality se nastavuje na úroveň externího mezního nákladu v optimálním množství.', truth: true, why: 'Daň přenese externí náklad na znečišťovatele a jeho soukromé náklady se tak vyrovnají společenským.' },
  { id: 'own-3', text: 'Optimální míra znečištění je vždy nulová.', truth: false, why: 'Efektivní je množství, kde se mezní společenský prospěch rovná mezním společenským nákladům. Snižování znečištění má také náklady, a optimum je proto obvykle nenulové.' },
  { id: 'own-4', text: 'Při pozitivní externalitě leží křivka společenského mezního prospěchu (MSB) nad křivkou soukromého mezního prospěchu (MPB).', truth: true, why: 'MSB = MPB + externí mezní prospěch, a leží tedy výš než MPB.' },
  { id: 'own-5', text: 'Čistě veřejný statek je současně nevylučitelný a nerivalitní.', truth: true, why: 'Obě vlastnosti musí platit zároveň. Statek splňující jen jednu z nich je smíšený (klubový nebo společný zdroj).' },
  { id: 'own-6', text: 'Klubový statek je nevylučitelný a rivalitní.', truth: false, why: 'Klubový statek je vylučitelný a nerivalitní (například kabelová televize). Nevylučitelný a rivalitní je společný zdroj.' },
  { id: 'own-7', text: 'Tragédie společného vzniká u společných zdrojů, protože každý uživatel nese jen část nákladů z přehnaného užívání.', truth: true, why: 'Zdroj je nevylučitelný a rivalitní, takže každý má motivaci využívat ho víc, než je pro všechny dohromady výhodné.' },
  { id: 'own-8', text: 'Morální hazard vzniká ještě před uzavřením smlouvy, kdy jedna strana nezná skrytou vlastnost druhé.', truth: false, why: 'To popisuje nepříznivý výběr. Morální hazard vzniká až po uzavření smlouvy kvůli skryté činnosti.' },
  { id: 'own-9', text: 'Volné trhy samy zajistí optimální množství veřejného statku.', truth: false, why: 'Kvůli problému černého pasažéra se na veřejný statek nikdo nechce složit, takže trh vyrobí příliš málo nebo nic.' },
  { id: 'own-10', text: 'Zásah státu do tržního selhání vždy zlepší výsledek.', truth: false, why: 'Stát může selhat: nemá úplné informace, opatření mívají časové zpoždění a mohou způsobit nové zkreslení. Zásah je výhodný jen tehdy, když jeho přínos převýší náklady.' },
  { id: 'own-11', text: 'Mrtvá ztráta negativní externality je součet rozdílů mezi společenskými mezními náklady a mezním prospěchem u kusů vyrobených nad optimální množství.', truth: true, why: 'Je to plocha trojúhelníku mezi křivkami od optima k tržnímu množství: každý kus navíc stojí víc, než přináší.' },
  { id: 'own-12', text: 'Při negativní externalitě je tržní cena nižší než při optimu a tržní množství vyšší.', truth: true, why: 'MSC leží nad MPC, a trh proto vyrobí víc za nižší cenu než společensky optimální množství.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];

function buildAnoNe({ id }) {
  const s = stmtById(id);
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: id.startsWith('kn-') ? { chapter: 12, number: `Úkoly-${id.slice(3)}` } : undefined,
    solution: [
      { title: 'Na čem tvrzení stojí', text: 'Přečteme tvrzení pozorně a najdeme pojem, o který jde (externalita, veřejný statek, informace, role státu).', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ \\text{pojem}')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'trzni-selhani', q: 'Co jsou tržní selhání?', right: 'Situace, kdy trh bez zásahu státu nevede k efektivní alokaci zdrojů (produkuje se jiné než optimální množství).', wrong: ['Situace, kdy firmy hospodaří se ztrátou.', 'Situace, kdy stát stanoví cenu pod rovnovážnou úrovní.', 'Pokles cen v důsledku vyšší nabídky.'] },
  { id: 'externalita', q: 'Co je externalita?', right: 'Vliv činnosti jednoho subjektu na jiný subjekt, který se činnosti neúčastní a který se neprojeví v tržních cenách.', wrong: ['Cena, kterou platí kupující při nákupu v zahraničí.', 'Vliv ceny statku na jeho poptávané množství.', 'Daň vybíraná od firem při vývozu.'] },
  { id: 'negativni-ext', q: 'Co je negativní externalita?', right: 'Činnost jednoho subjektu způsobuje náklady třetí osobě, které jí nikdo nehradí; společenské mezní náklady jsou vyšší než soukromé.', wrong: ['Činnost přináší třetí osobě prospěch, který nehradí; MSB je vyšší než MPB.', 'Pokles zisku firmy při růstu cen vstupů.', 'Situace, kdy kupující platí víc než prodávající požaduje.'] },
  { id: 'pozitivni-ext', q: 'Co je pozitivní externalita?', right: 'Činnost jednoho subjektu přináší prospěch třetí osobě, který se v ceně neprojeví; společenský mezní prospěch je vyšší než soukromý.', wrong: ['Činnost jednoho subjektu přináší třetí osobě náklady, které jí nikdo nehradí.', 'Zisk firmy vyšší než normální zisk.', 'Cena, která je nižší než mezní náklady.'] },
  { id: 'msc', q: 'Jak se vypočítají společenské mezní náklady (MSC) u negativní externality?', right: 'Jako součet soukromých mezních nákladů a externího mezního nákladu: MSC = MPC + MEC.', wrong: ['Jako rozdíl soukromých mezních nákladů a externího mezního nákladu.', 'Jako součet MPB a MPC.', 'Jako průměr cen kupujících a prodávajících.'] },
  { id: 'msb', q: 'Jak se vypočítá společenský mezní prospěch (MSB) u pozitivní externality?', right: 'Jako součet soukromého mezního prospěchu a externího mezního prospěchu: MSB = MPB + MEB.', wrong: ['Jako rozdíl MPB a MEB.', 'Jako součet MPC a MEC.', 'Jako součin ceny a množství.'] },
  { id: 'pigou', q: 'Co je Pigouova daň?', right: 'Daň na jednotku produkce rovná externímu meznímu nákladu v optimálním množství, která přenese externí náklad na jeho původce.', wrong: ['Jednorázová daň z příjmu právnických osob.', 'Dotace poskytovaná na jednotku produkce s pozitivní externalitou.', 'Daň z přidané hodnoty uvalená na všechny statky stejnou sazbou.'] },
  { id: 'coase', q: 'Co tvrdí Coaseho teorém?', right: 'Při jasně vymezených vlastnických právech a nízkých transakčních nákladech se strany dohodnou na efektivním řešení externality bez ohledu na to, komu právo patří.', wrong: ['Stát musí každou externalitu vyřešit daní.', 'Externality se řeší vždy zákazem činnosti.', 'Dohoda soukromých stran je efektivní i při vysokých transakčních nákladech.'] },
  { id: 'povoleni-def', q: 'Co jsou obchodovatelná emisní povolení?', right: 'Omezený počet práv na znečištění, který stát vydá a který mohou firmy mezi sebou kupovat a prodávat.', wrong: ['Daň z emisí, kterou vybírá stát.', 'Zákaz vypouštění škodlivin.', 'Dotace na čisticí zařízení.'] },
  { id: 'verejny-statek', q: 'Který statek je čistě veřejný?', right: 'Statek nevylučitelný a nerivalitní.', wrong: ['Statek vylučitelný a rivalitní.', 'Statek vylučitelný a nerivalitní.', 'Statek nevylučitelný a rivalitní.'] },
  { id: 'nevylucitelnost', q: 'Co znamená nevylučitelnost?', right: 'Neplatícího spotřebitele nelze ze spotřeby vyloučit, nebo je to příliš nákladné.', wrong: ['Spotřeba jednoho nezmenšuje množství pro ostatní.', 'Statek lze spotřebovat jen jednou.', 'Statek nemá žádnou cenu.'] },
  { id: 'nerivalita', q: 'Co znamená nerivalita (nezmenšitelnost) ve spotřebě?', right: 'Spotřeba statku jedním spotřebitelem nesnižuje množství ani užitek, který z něj mají ostatní.', wrong: ['Neplatícího spotřebitele nelze vyloučit.', 'Statek je dostupný jen za vysokou cenu.', 'Statek nemá žádné substituty.'] },
  { id: 'cerny-pasazer', q: 'V čem spočívá problém černého pasažéra?', right: 'Jednotlivec využívá veřejný statek, aniž za něj platí, protože ho nelze vyloučit a doufá, že zaplatí ostatní.', wrong: ['Firma skrývá před kupujícími kvalitu zboží.', 'Monopol zvyšuje cenu nad mezní náklady.', 'Pojištěný se po uzavření pojištění chová méně opatrně.'] },
  { id: 'spolecny-zdroj', q: 'Co je společný zdroj?', right: 'Statek nevylučitelný a rivalitní (například ryby v oceánu), u kterého hrozí nadměrné využívání.', wrong: ['Statek vylučitelný a nerivalitní.', 'Statek, který vlastní stát.', 'Statek, jehož cena je vždy nulová.'] },
  { id: 'nepriznivy-vyber', q: 'Co je nepříznivý výběr?', right: 'Situace, kdy kvůli skryté vlastnosti (kvalitě, riziku) před uzavřením obchodu jsou z trhu vytlačovány žádoucí subjekty či statky méně žádoucími.', wrong: ['Změna chování pojištěného po uzavření pojištění.', 'Situace, kdy firmy dohodnou společnou cenu.', 'Situace, kdy cena klesne pod mezní náklady.'] },
  { id: 'moralni-hazard', q: 'Co je morální hazard?', right: 'Změna chování jedné strany po uzavření smlouvy, kterou druhá strana nemůže pozorovat, na úkor druhé strany.', wrong: ['Výběr nekvalitního zboží kupujícím před nákupem.', 'Zvyšování ceny monopolem.', 'Dohoda soukromých stran o náhradě škody.'] },
  { id: 'mrtva-ztrata-ext', q: 'Co vyjadřuje mrtvá ztráta při externalitě?', right: 'Ztrátu společenského blahobytu způsobenou tím, že trh produkuje jiné než společensky optimální množství.', wrong: ['Zisk, který firma ztratí při zdanění.', 'Rozdíl mezi cenou a průměrnými náklady firmy.', 'Daň vybranou od znečišťovatele.'] },
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
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti zaměňují příbuzné pojmy nebo obracejí vztah. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function buildGrafNeg({ A, B, C, D, e }) {
  const graph = extViz('neg', { A, B, C, D, e });
  const s = B + D; const Qm = (A - C) / s; const Qo = (A - C - e) / s;
  return mk('graf-neg-ext', {
    part: 'zkouska',
    points: 2,
    data: { A, B, C, D, e },
    task: 'Nakreslete do grafu s osami P (cena) a Q (množství) trh se znečišťující výrobou: křivky MPB (poptávka), MPC (nabídka) a MSC. Vyznačte tržní a společensky optimální množství a plochu mrtvé ztráty.',
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: 'MSC leží nad MPC. Trh vyrobí Qtrh, optimum je Qopt < Qtrh a mrtvá ztráta je trojúhelník mezi nimi.',
    solution: [
      { title: 'Soukromé křivky a tržní rovnováha', text: `Nakreslíme klesající poptávku $MPB$ a rostoucí nabídku $MPC$. V jejich průsečíku je tržní rovnováha (${czText(Qm)} ks).`, viz: { kind: 'econ', data: { ...graph.data, curves: graph.data.curves.slice(0, 2), points: [graph.data.points[0]], areas: [] } } },
      { title: 'Společenské mezní náklady', text: 'Přidáme křivku $MSC$ nad $MPC$ (o externí mezní náklad). Má stejný sklon, pokud je externí náklad konstantní.', board: [line('MSC=MPC+MEC')] },
      { title: 'Optimum a mrtvá ztráta', text: `Společenské optimum je v průsečíku $MPB$ a $MSC$ (${czText(Qo)} ks), vlevo od tržního množství. Mezi optimem a tržním množstvím je trojúhelník mrtvé ztráty.`, viz: graph },
    ],
  });
}

function buildGrafPoz({ A, B, C, D, e }) {
  const graph = extViz('pos', { A, B, C, D, e });
  const s = B + D; const Qm = (A - C) / s; const Qo = (A + e - C) / s;
  return mk('graf-poz-ext', {
    part: 'zkouska',
    points: 2,
    data: { A, B, C, D, e },
    task: 'Nakreslete do grafu s osami P (cena) a Q (množství) trh se statkem, jehož spotřeba přináší pozitivní externalitu: křivky MPB (poptávka), MSB a MPC (nabídka). Vyznačte tržní a společensky optimální množství a plochu mrtvé ztráty.',
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: 'MSB leží nad MPB. Trh vyrobí Qtrh, optimum je Qopt > Qtrh a mrtvá ztráta je trojúhelník mezi nimi.',
    solution: [
      { title: 'Soukromé křivky a tržní rovnováha', text: `Nakreslíme poptávku $MPB$ a nabídku $MPC$. Trh se ustálí v jejich průsečíku (${czText(Qm)} ks).`, viz: { kind: 'econ', data: { ...graph.data, curves: [graph.data.curves[0], graph.data.curves[2]], points: [graph.data.points[0]], areas: [] } } },
      { title: 'Společenský mezní prospěch', text: 'Přidáme křivku $MSB$ nad $MPB$ (o externí mezní prospěch). Má stejný sklon, pokud je externí prospěch konstantní.', board: [line('MSB=MPB+MEB')] },
      { title: 'Optimum a mrtvá ztráta', text: `Společenské optimum je v průsečíku $MSB$ a $MPC$ (${czText(Qo)} ks), vpravo od tržního množství. Mezi tržním množstvím a optimem je trojúhelník mrtvé ztráty.`, viz: graph },
    ],
  });
}

function buildGrafPigou({ A, B, C, D, e }) {
  const graph = pigouViz({ A, B, C, D, mec: 'const', e, t: e });
  const s = B + D; const Qo = (A - C - e) / s;
  return mk('graf-pigou', {
    part: 'zkouska',
    points: 2,
    data: { A, B, C, D, e },
    task: 'Nakreslete do grafu s osami P (cena) a Q (množství) trh se znečišťující výrobou a zakreslete, jak Pigouova daň přivede trh k optimu. Vyznačte křivky MPB, MPC, MSC, posun nabídky po zavedení daně a původní a nové množství.',
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: 'Pigouova daň rovná externímu meznímu nákladu posune nabídku nahoru právě na křivku MSC, a trh se tak přesune do optima.',
    solution: [
      { title: 'Trh se znečištěním', text: 'Nakreslíme $MPB$, $MPC$ a tržní rovnováhu. Bez zásahu se vyrobí příliš mnoho.', viz: { kind: 'econ', data: { ...graph.data, curves: graph.data.curves.slice(0, 2), points: [graph.data.points[0]], arrows: [] } } },
      { title: 'Daň posune nabídku nahoru', text: 'Pigouova daň $t$ na kus zvýší mezní náklady výrobce o $t$. Je-li $t$ rovna externímu meznímu nákladu, posune se nabídka přesně na $MSC$.', board: [line('MPC+t=MSC'), line('t=MEC')] },
      { title: 'Nové množství', text: `Poptávka protíná posunutou nabídku v optimu (${czText(Qo)} ks). Cena pro kupující vzroste a množství klesne z tržního na optimální.`, viz: graph },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('neg-externalita', 'Negativní externalita: optimum a trh', (rng) => buildNegExt({ ...genExt(rng, 'neg'), ask: pick(rng, Object.keys(NEG_ASK)) }), buildNegExt),
  type('pigou-dan', 'Pigouova daň: sazba, cena a výnos', genPigou, buildPigou),
  type('mrtva-ztrata', 'Mrtvá ztráta externality', (rng) => buildMrtva(genExt(rng, 'neg')), buildMrtva),
  type('poz-externalita', 'Pozitivní externalita a dotace', (rng) => buildPosExt({ ...genExt(rng, 'pos'), ask: pick(rng, Object.keys(POS_ASK)) }), buildPosExt),
  type('coase', 'Coaseho teorém', genCoase, buildCoase),
  type('povoleni', 'Obchodovatelná povolení', genPovoleni, buildPovoleni),
  type('typ-statku', 'Druh statku (vylučitelnost a rivalita)', (rng) => buildStatek({ item: int(rng, 0, GOODS.length - 1) }), buildStatek),
  type('asym-info', 'Nepříznivý výběr, nebo morální hazard?', (rng) => buildAsym({ item: int(rng, 0, ASYM_ITEMS.length - 1) }), buildAsym),
  type('nastroj', 'Nástroj řešení externality', (rng) => buildNastroj({ item: int(rng, 0, TOOL_ITEMS.length - 1) }), buildNastroj),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-neg-ext', 'Nakresli negativní externalitu (zkouška)', (rng) => buildGrafNeg(genExt(rng, 'neg')), buildGrafNeg),
  type('graf-poz-ext', 'Nakresli pozitivní externalitu (zkouška)', (rng) => buildGrafPoz(genExt(rng, 'pos')), buildGrafPoz),
  type('graf-pigou', 'Nakresli Pigouovu daň (zkouška)', (rng) => buildGrafPigou(genExt(rng, 'neg')), buildGrafPigou),
];

// ---------- výklad ----------
// Modelové trhy v obrázcích: negativní MPB 80 − Q, MPC 20 + Q, MSC 40 + Q (Qtrh 30, Qopt 20); pozitivní MPB 60 − Q, MPC 10 + Q, MSB 80 − Q (Qtrh 25, Qopt 35).
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 100], range: [0, 60], curves, ...extra } });

const theory = [
  { heading: 'Podstata tržních selhání', term: 'Tržní selhání',
    text: 'Za ideálních podmínek (dokonalá konkurence, plná informace, všechny účinky se promítají do cen) vede trh k efektivní alokaci zdrojů: vyrobí se množství, při kterém se mezní prospěch společnosti rovná jejím mezním nákladům. Cena přitom předává správné signály.\n\nTržní selhání jsou situace, kdy tyto podmínky neplatí, cenové signály jsou zkreslené a trh bez zásahu vyrobí jiné než společensky optimální množství. Rozlišujeme čtyři skupiny:\n\n• externality (vliv na třetí osoby, který není v ceně),\n• veřejné statky (nelze vyloučit neplatící nebo spotřeba neubírá ostatním),\n• asymetrické informace (jedna strana ví víc než druhá),\n• tržní síla (firmy ovlivňují cenu, viz téma 6).\n\nExistence selhání je důvodem zásahu státu, ale ještě nezaručuje, že zásah bude správný: stát má vlastní omezení.',
    mistakes: ['Tržní selhání neznamená, že trh „nefunguje“ vůbec. Trh dál určuje ceny a množství, ale výsledek není společensky efektivní.', 'Tržní síla (monopol) je také tržní selhání, ale probírá se v tématu 6. Zde se soustředíme na externality, veřejné statky a informace.'] },
  { heading: 'Externality: soukromé a společenské veličiny', term: 'Externalita',
    text: 'Externalita je vliv činnosti jednoho subjektu na jiný subjekt, který se činnosti neúčastní a jehož náklad nebo prospěch se nepromítne do tržních cen. Výrobce nebo spotřebitel proto při rozhodování bere v úvahu jen své vlastní (soukromé) veličiny.\n\nPoužíváme čtyři křivky:\n\n• MPC: soukromé mezní náklady výrobce (nabídka),\n• MPB: soukromý mezní prospěch spotřebitele (poptávka),\n• MSC: společenské mezní náklady = MPC + externí mezní náklad MEC,\n• MSB: společenský mezní prospěch = MPB + externí mezní prospěch MEB.\n\nTrh bez zásahu se ustálí tam, kde $MPB=MPC$. Společensky efektivní množství je tam, kde $MSB=MSC$. Externalitu může způsobit výroba i spotřeba.',
    tex: 'MSC=MPC+MEC,\\qquad MSB=MPB+MEB',
    mistakes: ['Externí účinek není jen „škoda“: může být i prospěch (pozitivní externalita).', 'Externalita musí dopadat na třetí osobu mimo obchod. Škoda, kterou kupující a prodávající uvedou do ceny, externalitou není.'] },
  { heading: 'Negativní externalita', term: 'Negativní externalita',
    text: 'Při negativní externalitě činnost jednoho subjektu přináší náklady třetí osobě, a nikdo jí je nehradí (například znečištění, hluk, dopravní zácpy). Společenské mezní náklady jsou vyšší než soukromé, $MSC>MPC$, a křivka MSC leží nad MPC.\n\nTrh se ustálí v průsečíku MPB a MPC, optimum je v průsečíku MPB a MSC. Tržní množství je proto větší a cena nižší než při optimu: trh produkuje příliš mnoho.\n\nZtráta blahobytu je mrtvá ztráta: trojúhelník mezi MSC a MPB od optimálního po tržní množství. U každého kusu v tomto rozsahu je společenský náklad vyšší než prospěch. Je-li MEC konstantní a rovná $e$, platí:',
    tex: 'DWL=\\frac{1}{2}\\cdot e\\cdot (Q_{trh}-Q_{opt})',
    viz: view([{ expr: '80 - x', label: 'MPB', color: 'blue' }, { expr: '20 + x', label: 'MPC', color: 'chalk' }, { expr: '40 + x', label: 'MSC', color: 'warn' }], { domain: [0, 100], range: [0, 100], areas: [{ between: ['40 + x', '80 - x'], from: 20, to: 30, label: 'ztráta', color: 'warn' }], points: [{ x: 30, y: 50, label: 'Etrh', guides: true }, { x: 20, y: 60, label: 'Eopt', guides: true }] }),
    mistakes: ['Optimální množství při negativní externalitě není nula. Efektivní je takové, kde se MPB rovná MSC (snižování znečištění má také náklady).', 'MSC je nad MPC, ne pod ním. Externí náklady se přičítají.', 'Pozor na porovnání: tržní množství je větší než optimální a cena nižší.'] },
  { heading: 'Pozitivní externalita', term: 'Pozitivní externalita',
    text: 'Při pozitivní externalitě činnost jednoho subjektu přináší prospěch třetí osobě, která za něj neplatí (například očkování, vzdělání, včelař a sadař). Společenský mezní prospěch je vyšší než soukromý, $MSB>MPB$, a křivka MSB leží nad MPB.\n\nTrh se ustálí v průsečíku MPB a MPC, optimum je v průsečíku MSB a MPC. Tržní množství je proto menší než optimální: trh produkuje příliš málo. Mrtvá ztráta je trojúhelník mezi MSB a MPC od tržního po optimální množství. Je-li MEB konstantní a rovno $e$:',
    tex: 'Q_{opt}>Q_{trh},\\qquad DWL=\\frac{1}{2}\\cdot e\\cdot (Q_{opt}-Q_{trh})',
    viz: view([{ expr: '60 - x', label: 'MPB', color: 'blue' }, { expr: '80 - x', label: 'MSB', color: 'warn' }, { expr: '10 + x', label: 'MPC', color: 'chalk' }], { domain: [0, 100], range: [0, 100], areas: [{ between: ['80 - x', '10 + x'], from: 25, to: 35, label: 'ztráta', color: 'warn' }], points: [{ x: 25, y: 35, label: 'Etrh', guides: true }, { x: 35, y: 45, label: 'Eopt', guides: true }] }),
    mistakes: ['Pozitivní externalita ve spotřebě posouvá MSB nad MPB, pozitivní externalita ve výrobě klade MSC pod MPC. V obou případech je optimální množství větší než tržní a trh vyrobí málo.', 'Při pozitivní externalitě je tržní množství menší než optimální, ne větší.'] },
  { heading: 'Řešení externalit: Pigouova daň a dotace', term: 'Pigouova daň',
    text: 'Pigouova daň je tržně konformní nástroj: stát uvalí na jednotku produkce s negativní externalitou daň rovnou externímu meznímu nákladu v optimálním množství. Mezní náklady výrobce se tím zvýší o $t$, nabídka se posune nahoru (při konstantním MEC přesně na MSC) a trh se přesune do optima. Výrobce nyní „zaplatí“ škodu, kterou způsobuje.\n\nPři pozitivní externalitě se používá dotace (Pigouova subvence) ve výši externího mezního prospěchu na jednotku. Posune poptávku (nebo nabídku) tak, aby se trh přesunul do optima.\n\nDaň se musí rovnat MEC v optimu, ne v tržním množství. Je-li MEC rostoucí, jde o hodnotu při optimálním množství.',
    tex: 't=MEC(Q_{opt}),\\qquad s=MEB(Q_{opt})',
    viz: view([{ expr: '80 - x', label: 'MPB', color: 'blue' }, { expr: '20 + x', label: 'MPC', color: 'chalk' }, { expr: '40 + x', label: 'MSC = MPC + t', color: 'accent', dashed: true }], { domain: [0, 100], range: [0, 100], arrows: [{ from: [10, 30], to: [10, 50], label: '' }], points: [{ x: 30, y: 50, label: 'Etrh', guides: true }, { x: 20, y: 60, label: 'Eopt', guides: true }] }),
    mistakes: ['Daň nemá znečištění úplně odstranit, ale snížit na optimální úroveň.', 'Správná sazba je externí mezní náklad při optimálním množství. Při rostoucí MEC to není hodnota při tržním množství.'] },
  { heading: 'Regulace a obchodovatelná povolení', term: 'Obchodovatelná povolení',
    text: 'Přímá regulace (příkaz a kontrola) stanoví závazné pravidlo: limit emisí, zákaz látky, technickou normu. Je jednoduchá a rychlá, ale regulátor musí znát náklady jednotlivých firem. Jinak může limit vyjít zbytečně drahý, protože snížení nemusí provést ten, komu přijde nejlevněji.\n\nObchodovatelná povolení spojují oba přístupy: stát určí celkový povolený objem (například emisí) a vydá odpovídající počet povolení. Firmy s nimi mohou obchodovat. Firma s levným snížením emisí sníží víc a povolení prodá, firma s drahým snížením povolení koupí. Při zanedbatelných transakčních nákladech se snížení emisí uskuteční nejlevněji a cena povolení se rovná společnému meznímu nákladu snížení.',
    mistakes: ['U povolení rozhoduje stát o množství, trh o ceně. U daně je to naopak: stát určí cenu (sazbu) a množství se ustálí samo.', 'Povolení nemění celkový objem emisí. Mění jen to, kdo emise sníží.'] },
  { heading: 'Coaseho teorém', term: 'Coaseho teorém',
    text: 'Coaseho teorém říká: jsou-li vlastnická práva jasně vymezená a vymahatelná a transakční náklady (náklady na vyjednávání) jsou nízké, strany se mohou dohodnout na efektivním řešení externality sami, bez zásahu státu. Výsledné množství (efektivní řešení) nezávisí na tom, komu právo původně patří. Rozdělení nákladů mezi strany ale ano.\n\nPříklad: továrna znečišťuje vzduch a poškozuje sad škodou 50 000 Kč. Filtr stojí továrnu 30 000 Kč. Ať má právo továrna, nebo sad, filtr se pořídí, protože je levnější než škoda. Rozdíl je jen v tom, kdo ho zaplatí.\n\nTeorém selhává, když je poškozených mnoho (vyjednávání je drahé a znovu vzniká problém černého pasažéra), když práva nejsou jasná nebo když nelze znečišťovatele identifikovat.',
    mistakes: ['Teorém neříká, že dohoda vždy vznikne. Podmínkou jsou jasná práva a nízké transakční náklady.', 'Nezáleží na tom, komu právo patří, jen z hlediska efektivity. Rozdělení bohatství se mění.'] },
  { heading: 'Veřejné statky a klasifikace statků', term: 'Veřejný statek',
    text: 'Statky rozlišujeme podle dvou vlastností:\n\n• vylučitelnost: lze neplatícího spotřebitele vyloučit ze spotřeby? (opak je nevylučitelnost),\n• rivalita: ubírá spotřeba jednoho množství druhému? (opak je nerivalita, ve skriptech „nezmenšitelnost“).\n\nZ nich vznikají čtyři skupiny:\n\n• soukromý statek: vylučitelný a rivalitní (jablko, oblečení),\n• klubový statek: vylučitelný a nerivalitní (kabelová televize, soukromý park, dokud není přeplněný),\n• společný zdroj: nevylučitelný a rivalitní (ryby v oceánu, přeplněná silnice),\n• čistě veřejný statek: nevylučitelný a nerivalitní (národní obrana, základní výzkum).\n\nVeřejné statky jsou obvykle financovány státem z daní, protože soukromý trh by je při vysokých nákladech na výběr plateb poskytoval v nedostatečném množství. Stát je přitom nemusí sám vyrábět, může je jen financovat. Rivalita a vylučitelnost často nejsou vše nebo nic (přeplněný park, kapacita). Statek, který nesplňuje obě vlastnosti čistě veřejného statku, je smíšený.',
    mistakes: ['Nezaměňujte nevylučitelnost a nerivalitu. Jde o dvě různé vlastnosti a jejich kombinace tvoří čtyři skupiny statků.', 'Veřejný statek není totéž co statek vlastněný státem. Rozhoduje vylučitelnost a rivalita, ne vlastník.', 'Mnohé statky jsou smíšené a závisí na míře využití (park je nerivalitní, dokud není přeplněný).'] },
  { heading: 'Černý pasažér a tragédie společného', term: 'Problém černého pasažéra',
    text: 'Problém černého pasažéra vzniká u nevylučitelných statků: když nelze nikoho vyloučit, každý doufá, že zaplatí ostatní, a sám platit nechce. Pokud to tak udělá většina, statek se vůbec nevyrobí nebo se vyrobí v nedostatečném množství, i když by prospěl všem. Proto veřejné statky obvykle financuje stát z povinných daní.\n\nU společných zdrojů (ryby v moři, společná pastvina) je statek nevylučitelný, ale rivalitní. Každý uživatel nese jen malou část nákladů vyčerpání zdroje, a ten proto bývá nadměrně využíván: tzv. tragédie společného. Řešením je regulace (kvóty), jasně přidělená vlastnická práva nebo poplatky za užívání.',
    mistakes: ['Problém černého pasažéra souvisí s nevylučitelností, ne s asymetrií informací.', 'Tragédie společného nastává u rivalitních zdrojů. U čistě veřejného statku zdroj nemůže být „vyčerpán“ nadměrným užíváním.'] },
  { heading: 'Asymetrické informace: nepříznivý výběr', term: 'Nepříznivý výběr',
    text: 'Asymetrická informace znamená, že jedna strana trhu ví víc než druhá (prodávající zná kvalitu zboží, kupující ji nezná). Důvodem jsou skrytá činnost (nelze ji pozorovat) a skrytá informace (jedna strana má větší odborné znalosti).\n\nNepříznivý výběr vzniká před uzavřením smlouvy kvůli skryté vlastnosti. Kupující nepoznají kvalitu a nabízejí průměrnou cenu. Prodávající kvalitního zboží ji nepřijmou a odejdou z trhu, takže zůstává horší zboží. Příklady: trh s ojetými auty, pojištění (nejvíc se pojišťují ti s nejvyšším rizikem), úvěry.\n\nMírněním jsou záruky, certifikáty, značky, povinné zveřejnění informací nebo povinné pojištění.',
    mistakes: ['Nepříznivý výběr vytlačuje kvalitní zboží (ne nekvalitní).', 'Nepříznivý výběr vzniká před smlouvou, morální hazard až po ní.'] },
  { heading: 'Asymetrické informace: morální hazard', term: 'Morální hazard',
    text: 'Morální hazard vzniká po uzavření smlouvy kvůli skryté činnosti: jedna strana (informovaná) změní chování ve svůj prospěch na úkor druhé a druhá ho nemůže sledovat. Příklady: pojištěný řidič jezdí méně opatrně, manažer využívá firmu ve svůj prospěch a vlastník ho nevidí při práci.\n\nTypicky jde o vztah zmocnitele a zmocněnce. Zmírňují ho spoluúčast (pojištěný nese část škody), sledování a kontrola a motivace spojená s výsledkem (podíl na zisku).',
    mistakes: ['Morální hazard není nepoctivost jako taková. Je to racionální reakce na to, že riziko nese někdo jiný a chování se nesleduje.'] },
  { heading: 'Role státu, přístupy k mikroekonomické politice a jejich omezení', term: 'Mikroekonomická politika státu',
    text: 'Mikroekonomická politika státu zahrnuje zásahy do fungování jednotlivých trhů s cílem zlepšit alokaci zdrojů, ochránit konkurenci, odstranit tržní selhání a také ovlivnit rozdělení důchodů. Základní přístupy:\n\n• přímá regulace (příkazy, limity, normy, zákazy),\n• tržně konformní nástroje (daně, dotace, obchodovatelná povolení),\n• přímé poskytování nebo financování statků státem (veřejné statky),\n• antimonopolní politika proti zneužití tržní síly,\n• vytvoření a vymáhání vlastnických práv (podmínka pro Coaseho řešení) a snižování informační asymetrie.\n\nZásah státu má však omezení. Stát nemá úplné informace (nezná přesně externí náklady ani náklady firem), opatření působí se zpožděním (čas na rozpoznání problému, rozhodnutí, uplatnění a projevení účinku) a zavedená opatření mají setrvačnost: obtížně se rušejí, i když ztratí smysl. Mohou také vzniknout nová zkreslení, například vlivem lobbingu. Zásah proto dává smysl, jen když jeho přínos převýší náklady (včetně nákladů na regulaci).',
    mistakes: ['Existence tržního selhání ještě neznamená, že zásah státu zlepší situaci. Stát může selhat stejně jako trh.', 'Časové zpoždění a setrvačnost jsou důvody, proč jsou některá opatření dlouho účinná i po odeznění problému nebo naopak působí pozdě.'] },
];

export default {
  id: 'selhani', title: 'Tržní selhání a mikroekonomická politika státu', order: 11, theory, types,
};
