// Téma 10: Celková rovnováha a tržní efektivnost (podle skript kap. 11, prezentace 10 a cvičebnice kap. 11).
// Cvičebnice kap. 11 se věnuje hlavně Paretově efektivnosti a modelu 2x2x2; přebytky a mrtvá ztráta
// jsou doplněné podle prezentace a pojmů z kap. 3, 6 a 7 cvičebnice (příklady s čísly z knihy jsou v testech).
// Stejná struktura jako tema02.js: theory (výklad), types (generate + solve), každý příklad má kroky s tabulí nebo grafem.
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'rovnovaha';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- pomůcky ----------
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const r2 = (x) => Math.round(x * 100) / 100;
const lit = (x) => String(r6(x)); // číslo do výrazu pro graf
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
const nice = (v) => {
  const w = Math.max(v, 1e-9);
  const p = 10 ** Math.floor(Math.log10(w));
  return NICE_STEPS.find((f) => f * p >= w - 1e-9) * p;
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const invDemand = (A, B) => `P=${cz(A)}-${coef(B, 'Q')}`;
const invSupply = (C, D) => (C === 0 ? `P=${coef(D, 'Q')}` : `P=${cz(C)}+${coef(D, 'Q')}`);
const eqInv = ({ A, B, C, D }) => { const Q = r6((A - C) / (B + D)); return { Q, P: r6(A - B * Q) }; };
const dE = (A, B) => `${lit(A)} - ${lit(B)}*x`;
const sE = (C, D) => `${lit(C)} + ${lit(D)}*x`;
const cPlus = (C) => (C === 0 ? '' : `${cz(C)}+`);

// Graf trhu s křivkami P = A − B·Q (poptávka) a P = C + D·Q (nabídka); extra: další křivky, body, plochy.
function invViz({ A, B, C, D }, extra = {}) {
  const { Q, P } = eqInv({ A, B, C, D });
  return {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(A / B)], range: [0, nice(A)],
      curves: [
        { expr: dE(A, B), label: 'D', color: 'blue' },
        { expr: sE(C, D), label: 'S', color: 'chalk' },
        ...(extra.curves || []),
      ],
      points: extra.points ?? [{ x: Q, y: P, label: 'E', guides: true }],
      arrows: [], areas: extra.areas || [],
      alt: extra.alt || 'Poptávka, nabídka a tržní rovnováha',
    },
  };
}
const csArea = ({ A, B }, P, Q) => ({ between: [dE(A, B), lit(P)], from: 0, to: Q, label: 'CS', color: 'green' });
const psArea = ({ C, D }, P, Q) => ({ between: [lit(P), sE(C, D)], from: 0, to: Q, label: 'PS', color: 'accent' });

// ---------- typ: spotřebitelský, výrobcův a celkový přebytek z rovnic P = A − BQ, P = C + DQ ----------
const SURPLUS_WORD = { CS: 'spotřebitelský přebytek', PS: 'výrobcův přebytek', TS: 'celkový společenský přebytek' };

function buildPrebytky({ A, B, C, D, ask }) {
  const { Q, P } = eqInv({ A, B, C, D });
  const cs = r6(0.5 * Q * (A - P)); const ps = r6(0.5 * Q * (P - C)); const ts = r6(cs + ps);
  const val = { CS: cs, PS: ps, TS: ts }[ask];
  const word = SURPLUS_WORD[ask];
  const graph = invViz({ A, B, C, D }, { areas: [csArea({ A, B }, P, Q), psArea({ C, D }, P, Q)], alt: 'Spotřebitelský a výrobcův přebytek v rovnováze' });
  return mk('prebytky', {
    data: { A, B, C, D, ask },
    task: `Poptávku po zboží popisuje první rovnice, nabídku druhá (P je cena v Kč, Q množství v kusech). Vypočtěte ${word} v tržní rovnováze (v Kč).`,
    promptTex: `${invDemand(A, B)},\\qquad ${invSupply(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${cap(word)} je ${czText(val)} Kč.`,
    solution: [
      { title: 'Rovnováha trhu', text: 'Přebytky se počítají při rovnovážné ceně a množství, a nejdřív proto najdeme rovnováhu: pravé strany obou rovnic se rovnají.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${cPlus(C)}${coef(D, 'Q')}`), line(`Q_E=\\frac{${cz(A)}-${cz(C)}}{${cz(B)}+${cz(D)}}=${cz(Q)}`), line(`P_E=${cz(A)}-${cz(B)}\\cdot ${cz(Q)}=${cz(P)}`)] },
      { title: 'Co přebytky v grafu znamenají', text: `Spotřebitelský přebytek je rozdíl mezi nejvyšší cenou, kterou by kupující zaplatili, a cenou, kterou skutečně platí. Je to plocha pod poptávkou a nad cenou. Výrobcův přebytek je rozdíl mezi tržní cenou a nejnižší cenou, za kterou by prodávající prodali (plocha nad nabídkou a pod cenou). Obě plochy jsou trojúhelníky se základnou $Q_E$. Výška spotřebitelského trojúhelníku je ${czText(r6(A - P))} (od ceny ${czText(P)} k bodu, kde poptávka protíná osu ceny: ${czText(A)}), výška výrobcova ${czText(r6(P - C))} (od nejnižší ceny ${czText(C)} k ceně ${czText(P)}).`,
        board: [line(`P_{max}=${cz(A)},\\quad P_{min}=${cz(C)}`), line(`\\text{výška }CS=${cz(A)}-${cz(P)}=${cz(r6(A - P))}`), line(`\\text{výška }PS=${cz(P)}-${cz(C)}=${cz(r6(P - C))}`)] },
      { title: 'Spotřebitelský přebytek', text: 'Plocha trojúhelníku je polovina základny krát výška.',
        board: [ask === 'CS' ? result(`CS=\\frac12\\cdot ${cz(Q)}\\cdot ${cz(r6(A - P))}=${cz(cs)}`) : line(`CS=\\frac12\\cdot ${cz(Q)}\\cdot ${cz(r6(A - P))}=${cz(cs)}`)] },
      { title: 'Výrobcův přebytek', text: 'Stejný postup u druhého trojúhelníku.',
        board: [ask === 'PS' ? result(`PS=\\frac12\\cdot ${cz(Q)}\\cdot ${cz(r6(P - C))}=${cz(ps)}`) : line(`PS=\\frac12\\cdot ${cz(Q)}\\cdot ${cz(r6(P - C))}=${cz(ps)}`)] },
      { title: 'Celkový společenský přebytek', text: 'Celkový přebytek je součet obou přebytků. Je to plocha mezi poptávkou a nabídkou od nuly po rovnovážné množství.',
        board: [ask === 'TS' ? result(`TS=CS+PS=${cz(cs)}+${cz(ps)}=${cz(ts)}`) : line(`TS=CS+PS=${cz(cs)}+${cz(ps)}=${cz(ts)}`)] },
      { title: 'Graf', text: `V grafu je spotřebitelský přebytek CS (nad cenou ${czText(P)}) a výrobcův přebytek PS (pod cenou). Hledaný ${word} je ${czText(val)} Kč.`, viz: graph },
    ],
  });
}

function genPrebytky(rng) {
  const B = int(rng, 1, 5); const D = int(rng, 1, 5);
  const C = pick(rng, [0, 0, 5, 10, 15, 20, 30]);
  const Q = int(rng, 4, 30); const P = C + D * Q;
  return buildPrebytky({ A: P + B * Q, B, C, D, ask: pick(rng, ['CS', 'PS', 'TS']) });
}

// ---------- typ: přebytky z rovnic Q_D = a − bP, Q_S = c + dP (c < 0: výroba začíná od kladné ceny) ----------
function buildPrebytkyQP({ a, b, c, d, ask }) {
  const P = r6((a - c) / (b + d)); const Q = r6(a - b * P);
  const Pmax = r6(a / b); const Pmin = r6(-c / d);
  const cs = r6(0.5 * Q * (Pmax - P)); const ps = r6(0.5 * Q * (P - Pmin)); const ts = r6(cs + ps);
  const val = { CS: cs, PS: ps, TS: ts }[ask];
  const word = SURPLUS_WORD[ask];
  const inv = { A: Pmax, B: 1 / b, C: Pmin, D: 1 / d };
  const graph = invViz(inv, { areas: [csArea(inv, P, Q), psArea(inv, P, Q)], alt: 'Přebytky při rovnicích zadaných jako množství v závislosti na ceně' });
  const sup = c === 0 ? `Q_S=${coef(d, 'P')}` : `Q_S=${coef(d, 'P')}-${cz(-c)}`;
  return mk('prebytky-qp', {
    data: { a, b, c, d, ask },
    task: `Poptávka po zboží je dána první rovnicí a nabídka druhou (P je cena v Kč, Q množství v kusech). Vypočtěte ${word} v tržní rovnováze (v Kč).`,
    promptTex: `Q_D=${cz(a)}-${coef(b, 'P')},\\qquad ${sup}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${cap(word)} je ${czText(val)} Kč.`,
    solution: [
      { title: 'Rovnováha trhu', text: 'V rovnováze se poptávané množství rovná nabízenému. Z rovnice vyjde cena a z ní dosazením množství.',
        board: [line(`${cz(a)}-${coef(b, 'P')}=${coef(d, 'P')}-${cz(-c)}`), line(`P_E=\\frac{${cz(a)}+${cz(-c)}}{${cz(b)}+${cz(d)}}=${cz(P)}`), line(`Q_E=${cz(a)}-${cz(b)}\\cdot ${cz(P)}=${cz(Q)}`)] },
      { title: 'Rovnice převedeme na cenu', text: `Trojúhelníky přebytků potřebujeme znát v osách ceny a množství. Poptávka protíná osu ceny tam, kde $Q_D=0$, tedy v ceně $a/b=${czText(Pmax)}$: to je nejvyšší cena, kterou by někdo zaplatil. Nabídka začíná tam, kde $Q_S=0$, tedy v ceně $-c/d=${czText(Pmin)}$: pod touto cenou nikdo nenabízí.`,
        board: [line(`P_{max}=\\frac{${cz(a)}}{${cz(b)}}=${cz(Pmax)}`), line(`P_{min}=\\frac{${cz(-c)}}{${cz(d)}}=${cz(Pmin)}`)] },
      { title: 'Spotřebitelský přebytek', text: `Trojúhelník pod poptávkou a nad cenou: základna $Q_E=${czText(Q)}$, výška ${czText(Pmax)} − ${czText(P)}.`,
        board: [ask === 'CS' ? result(`CS=\\frac12\\cdot ${cz(Q)}\\cdot (${cz(Pmax)}-${cz(P)})=${cz(cs)}`) : line(`CS=\\frac12\\cdot ${cz(Q)}\\cdot (${cz(Pmax)}-${cz(P)})=${cz(cs)}`)] },
      { title: 'Výrobcův přebytek', text: `Trojúhelník nad nabídkou a pod cenou: základna $Q_E$, výška ${czText(P)} − ${czText(Pmin)}.`,
        board: [ask === 'PS' ? result(`PS=\\frac12\\cdot ${cz(Q)}\\cdot (${cz(P)}-${cz(Pmin)})=${cz(ps)}`) : line(`PS=\\frac12\\cdot ${cz(Q)}\\cdot (${cz(P)}-${cz(Pmin)})=${cz(ps)}`)] },
      { title: 'Celkový společenský přebytek', text: 'Součet obou přebytků.',
        board: [ask === 'TS' ? result(`TS=${cz(cs)}+${cz(ps)}=${cz(ts)}`) : line(`TS=${cz(cs)}+${cz(ps)}=${cz(ts)}`)] },
      { title: 'Graf', text: `Plochy CS a PS v grafu ukazují obě části. Hledaný ${word} je ${czText(val)} Kč.`, viz: graph },
    ],
  });
}

function genPrebytkyQP(rng) {
  const b = pick(rng, [1, 2, 5]); const d = pick(rng, [1, 2, 5]);
  const P = int(rng, 10, 40); const Q = int(rng, 4, Math.min(40, d * P - 1));
  return buildPrebytkyQP({ a: Q + b * P, b, c: Q - d * P, d, ask: pick(rng, ['CS', 'PS', 'TS']) });
}

// ---------- typ: mrtvá ztráta při cenovém stropu nebo prahu ----------
function buildMrtvaReg({ A, B, C, D, limit, price, ask }) {
  const { Q, P } = eqInv({ A, B, C, D });
  const strop = limit === 'strop';
  const Qr = r6(strop ? (price - C) / D : (A - price) / B);
  const pd = r6(A - B * Qr); const ps = r6(C + D * Qr);
  const gap = r6(pd - ps); const dQ = r6(Q - Qr);
  const dwl = r6(0.5 * gap * dQ);
  const ts0 = r6(0.5 * Q * (A - C)); const tsr = r6(ts0 - dwl);
  const val = ask === 'DWL' ? dwl : tsr;
  const wordAsk = ask === 'DWL' ? 'mrtvou ztrátu' : 'celkový společenský přebytek po zavedení regulace';
  const graph = invViz({ A, B, C, D }, {
    curves: [{ expr: lit(price), label: strop ? 'Pmax' : 'Pmin', color: 'accent', dashed: true }],
    points: [{ x: Q, y: P, label: 'E' }, { x: Qr, y: pd, label: 'a' }, { x: Qr, y: ps, label: 'b' }],
    areas: [{ between: [dE(A, B), sE(C, D)], from: Qr, to: Q, label: 'MZ', color: 'warn' }],
    alt: strop ? 'Mrtvá ztráta při cenovém stropu' : 'Mrtvá ztráta při cenovém prahu',
  });
  return mk('mrtva-regulace', {
    data: { A, B, C, D, limit, price, ask },
    task: `Poptávku popisuje první rovnice, nabídku druhá (P je cena v Kč, Q množství v kusech). Stát stanovil ${strop ? 'nejvyšší dovolenou cenu (strop)' : 'nejnižší dovolenou cenu (práh)'} ${czText(price)} Kč. Předpokládejte, že zboží získají kupující, kteří si ho nejvíc cení, a prodávají výrobci s nejnižšími náklady. Vypočtěte ${wordAsk} (v Kč).`,
    promptTex: `${invDemand(A, B)},\\qquad ${invSupply(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: ask === 'DWL' ? `Mrtvá ztráta je ${czText(dwl)} Kč.` : `Celkový přebytek po zavedení ${strop ? 'stropu' : 'prahu'} je ${czText(tsr)} Kč (před zásahem ${czText(ts0)} Kč, mrtvá ztráta ${czText(dwl)} Kč).`,
    solution: [
      { title: 'Rovnováha bez zásahu', text: 'Nejdřív zjistíme, kde by trh skončil sám. Bez toho nepoznáme, jestli regulace něco mění.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${cPlus(C)}${coef(D, 'Q')}`), line(`Q_E=${cz(Q)},\\quad P_E=${cz(P)}`)] },
      { title: strop ? 'Strop je pod rovnovážnou cenou' : 'Práh je nad rovnovážnou cenou', text: `Cena ${czText(price)} je ${strop ? 'nižší' : 'vyšší'} než rovnovážná ${czText(P)}, takže regulace skutečně působí. (Strop nad rovnováhou nebo práh pod ní by nic nezměnil.)`,
        board: [line(`${cz(price)}${strop ? '<' : '>'}${cz(P)}`)] },
      { title: 'Obchodované množství', text: strop ? `Při ceně ${czText(price)} nabídnou prodávající jen množství z rovnice nabídky, kupující by chtěli víc. Prodat se nedá víc, než se nabídne, a obchoduje se tedy na kratší straně trhu.` : `Při ceně ${czText(price)} koupí kupující jen množství z rovnice poptávky, prodávající by prodali víc. Koupit se nedá víc, než kupující chtějí, a obchoduje se tedy na kratší straně trhu.`,
        board: [line(strop ? `${cz(price)}=${cPlus(C)}${coef(D, 'Q_r')}\\ \\Rightarrow\\ Q_r=${cz(Qr)}` : `${cz(price)}=${cz(A)}-${coef(B, 'Q_r')}\\ \\Rightarrow\\ Q_r=${cz(Qr)}`), line(`\\text{zmizelo }${cz(Q)}-${cz(Qr)}=${cz(dQ)}\\ \\text{kusů}`)] },
      { title: 'Ceny na obou křivkách při omezeném množství', text: `Při množství ${czText(Qr)} by kupující ještě zaplatili cenu z poptávky (${czText(pd)}) a prodávající by prodali už za cenu z nabídky (${czText(ps)}). Rozdíl ${czText(gap)} Kč na kus je zisk z obchodu, který se neuskuteční, protože zákon oběma stranám zakazuje dohodnout se.`,
        board: [line(`P_D=${cz(A)}-${cz(B)}\\cdot ${cz(Qr)}=${cz(pd)}`), line(`P_S=${cPlus(C)}${cz(D)}\\cdot ${cz(Qr)}=${cz(ps)}`), line(`P_D-P_S=${cz(gap)}`)] },
      { title: 'Mrtvá ztráta', text: `Neuskutečněné výhodné obchody tvoří trojúhelník mezi poptávkou a nabídkou od množství ${czText(Qr)} do ${czText(Q)}. Základna je ${czText(dQ)} a výška ${czText(gap)}. Při jiném přidělení zboží než „nejlepším“ (fronta, losování) by byla ztráta větší.`,
        board: [ask === 'DWL' ? result(`MZ=\\frac12\\cdot ${cz(gap)}\\cdot ${cz(dQ)}=${cz(dwl)}`) : line(`MZ=\\frac12\\cdot ${cz(gap)}\\cdot ${cz(dQ)}=${cz(dwl)}`)] },
      { title: 'Celkový přebytek po zásahu', text: `Celkový přebytek bez regulace je plocha mezi křivkami do rovnovážného množství. Regulace z něj ukrojí mrtvou ztrátu.`,
        board: [line(`TS_0=\\frac12\\cdot ${cz(Q)}\\cdot (${cz(A)}-${cz(C)})=${cz(ts0)}`), ask === 'TSreg' ? result(`TS_{reg}=${cz(ts0)}-${cz(dwl)}=${cz(tsr)}`) : line(`TS_{reg}=${cz(ts0)}-${cz(dwl)}=${cz(tsr)}`)] },
      { title: 'Graf', text: `Plocha MZ je mrtvá ztráta. Hledaný výsledek: ${czText(val)} Kč.`, viz: graph },
    ],
  });
}

function genMrtvaReg(rng) {
  const B = int(rng, 1, 5); const D = int(rng, 1, 5);
  const C = pick(rng, [0, 5, 10, 20]); const Q = int(rng, 10, 40);
  const P = C + D * Q; const A = P + B * Q;
  const dQ = int(rng, 2, Math.min(8, Q - 2)); const Qr = Q - dQ;
  const strop = rng() < 0.5;
  return buildMrtvaReg({ A, B, C, D, limit: strop ? 'strop' : 'prah', price: strop ? C + D * Qr : A - B * Qr, ask: pick(rng, ['DWL', 'DWL', 'TSreg']) });
}

// ---------- typ: mrtvá ztráta daně z jednotky ----------
const TAX_ASK = { DWL: 'mrtvou ztrátu daně (v Kč)', vynos: 'výnos daně pro stát (v Kč)', Qt: 'množství, které se po zavedení daně prodá (v kusech)' };

function buildMrtvaDan({ A, B, C, D, t, ask }) {
  const { Q, P } = eqInv({ A, B, C, D });
  const Qt = r6((A - C - t) / (B + D)); const pk = r6(A - B * Qt); const pp = r6(pk - t);
  const dQ = r6(Q - Qt); const dwl = r6(0.5 * t * dQ); const rev = r6(t * Qt);
  const val = { DWL: dwl, vynos: rev, Qt }[ask];
  const unit = ask === 'Qt' ? 'ks' : 'Kč';
  const lead = { DWL: 'Mrtvá ztráta', vynos: 'Výnos daně', Qt: 'Prodané množství' }[ask];
  const graph = invViz({ A, B, C, D }, {
    curves: [{ expr: sE(C + t, D), label: 'S+t', color: 'accent', dashed: true }],
    points: [{ x: Q, y: P, label: 'E' }, { x: Qt, y: pk, label: 'Et' }],
    areas: [{ between: [dE(A, B), sE(C, D)], from: Qt, to: Q, label: 'MZ', color: 'warn' }, { between: [lit(pk), lit(pp)], from: 0, to: Qt, label: 'daň', color: 'green' }],
    alt: 'Daň z jednotky: výnos státu a mrtvá ztráta',
  });
  return mk('mrtva-dan', {
    data: { A, B, C, D, t, ask },
    task: `Poptávku po zboží popisuje první rovnice, nabídku druhá (P je cena v Kč, Q množství v kusech). Stát zavede daň ${czText(t)} Kč z každého prodaného kusu, kterou odvádějí prodávající. Vypočtěte ${TAX_ASK[ask]}.`,
    promptTex: `${invDemand(A, B)},\\qquad ${invSupply(C, D)}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `${lead} je ${czText(val)} ${unit}.`,
    solution: [
      { title: 'Rovnováha bez daně', text: 'Nejdřív najdeme výchozí rovnováhu. Mrtvá ztráta se měří proti ní.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${cPlus(C)}${coef(D, 'Q')}`), line(`Q_E=${cz(Q)},\\quad P_E=${cz(P)}`)] },
      { title: 'Daň zdvihne nabídku o t', text: `Prodávající musí z ceny, kterou dostanou od kupujících, odvést ${czText(t)} Kč. Aby jim zbylo totéž co dřív, musí kupující platit o ${czText(t)} víc. Křivka nabídky, jak ji vidí kupující, se proto posune o ${czText(t)} nahoru: $P=C+t+DQ$.`,
        board: [line(`P_K=${cPlus(C + t)}${coef(D, 'Q')}`)] },
      { title: 'Nová rovnováha', text: 'Poptávku porovnáme s posunutou nabídkou.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${cPlus(C + t)}${coef(D, 'Q')}`), ask === 'Qt' ? result(`Q_t=\\frac{${cz(A)}-${cz(C + t)}}{${cz(B)}+${cz(D)}}=${cz(Qt)}`) : line(`Q_t=\\frac{${cz(A)}-${cz(C + t)}}{${cz(B)}+${cz(D)}}=${cz(Qt)}`)] },
      { title: 'Ceny kupujících a prodávajících', text: `Kupující platí cenu z poptávky při novém množství, prodávající dostanou o daň méně. Daň tedy platí obě strany: kupující zaplatí ${czText(r6(pk - P))} Kč na kus víc, prodávající dostanou ${czText(r6(P - pp))} Kč na kus méně (kdo nese víc, závisí na sklonech křivek, nikoli na tom, kdo daň formálně odvádí).`,
        board: [line(`P_K=${cz(A)}-${cz(B)}\\cdot ${cz(Qt)}=${cz(pk)}`), line(`P_P=${cz(pk)}-${cz(t)}=${cz(pp)}`)] },
      { title: 'Výnos daně', text: 'Výnos státu je obdélník: daň na kus krát prodané množství.',
        board: [ask === 'vynos' ? result(`V=${cz(t)}\\cdot ${cz(Qt)}=${cz(rev)}`) : line(`V=${cz(t)}\\cdot ${cz(Qt)}=${cz(rev)}`)] },
      { title: 'Mrtvá ztráta', text: `Kvůli dani se neuskuteční ${czText(dQ)} kusů obchodů (z ${czText(Q)} na ${czText(Qt)}). Každý z nich by přinesl zisk z obchodu, který se ale kvůli dani ztratil. Ztráta je trojúhelník se svislou stranou ${czText(t)} (klín mezi cenami kupujících a prodávajících) a vodorovnou ${czText(dQ)}.`,
        board: [ask === 'DWL' ? result(`MZ=\\frac12\\cdot ${cz(t)}\\cdot ${cz(dQ)}=${cz(dwl)}`) : line(`MZ=\\frac12\\cdot ${cz(t)}\\cdot ${cz(dQ)}=${cz(dwl)}`)] },
      { title: 'Graf', text: `Zelený obdélník „daň“ je výnos státu, plocha MZ mrtvá ztráta. Hledaná hodnota je ${czText(val)} ${unit}.`, viz: graph },
    ],
  });
}

function genMrtvaDan(rng) {
  const B = int(rng, 1, 5); const D = int(rng, 1, 5);
  const C = pick(rng, [0, 5, 10, 20]); const Q = int(rng, 8, 40);
  const P = C + D * Q; const A = P + B * Q;
  const dQ = int(rng, 2, Math.min(10, Q - 2));
  return buildMrtvaDan({ A, B, C, D, t: (B + D) * dQ, ask: pick(rng, ['DWL', 'vynos', 'Qt']) });
}

// ---------- typ: mrtvá ztráta monopolu (MC konstantní) ----------
function buildMrtvaMonopol({ A, B, c }) {
  const Qc = r6((A - c) / B); const Qm = r6((A - c) / (2 * B)); const Pm = r6((A + c) / 2);
  const dwl = r6(0.5 * (Pm - c) * (Qc - Qm));
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'P' }, domain: [0, nice(A / B)], range: [0, nice(A)],
      curves: [{ expr: dE(A, B), label: 'D', color: 'blue' }, { expr: `${lit(A)} - ${lit(2 * B)}*x`, label: 'MR', color: 'chalk', dashed: true }, { expr: lit(c), label: 'MC', color: 'green' }],
      points: [{ x: Qm, y: Pm, label: 'M' }, { x: Qc, y: c, label: 'K' }],
      arrows: [], areas: [{ between: [dE(A, B), lit(c)], from: Qm, to: Qc, label: 'MZ', color: 'warn' }],
      alt: 'Mrtvá ztráta monopolu',
    },
  };
  return mk('mrtva-monopol', {
    data: { A, B, c },
    task: `Monopolista čelí poptávce $${invDemand(A, B)}$ a vyrábí s konstantními mezními i průměrnými náklady ${czText(c)} Kč na kus (P je cena, Q množství). Vypočtěte mrtvou ztrátu monopolu oproti dokonale konkurenčnímu trhu se stejnými náklady (v Kč).`,
    promptTex: `${invDemand(A, B)},\\qquad MC=AC=${cz(c)}`,
    answerSpec: { kind: 'number', value: dwl },
    conclusion: `Mrtvá ztráta monopolu je ${czText(dwl)} Kč.`,
    solution: [
      { title: 'Výsledek dokonalé konkurence', text: 'Dokonale konkurenční odvětví by vyrábělo tolik, kolik odpovídá ceně rovné mezním nákladům. To je efektivní množství, vůči kterému mrtvou ztrátu měříme.',
        board: [line(`P=MC:\\ ${cz(A)}-${coef(B, 'Q')}=${cz(c)}`), line(`Q_K=\\frac{${cz(A)}-${cz(c)}}{${cz(B)}}=${cz(Qc)}`)] },
      { title: 'Výsledek monopolu', text: 'Monopolista vyrábí tam, kde se mezní příjem rovná mezním nákladům. Při lineární poptávce je mezní příjem dvakrát strmější než poptávka.',
        board: [line(`MR=${cz(A)}-${coef(2 * B, 'Q')}=${cz(c)}`), line(`Q_M=\\frac{${cz(A)}-${cz(c)}}{${cz(2 * B)}}=${cz(Qm)}`), line(`P_M=${cz(A)}-${cz(B)}\\cdot ${cz(Qm)}=${cz(Pm)}`)] },
      { title: 'Neuskutečněné obchody', text: `Mezi množstvími ${czText(Qm)} a ${czText(Qc)} je cena z poptávky stále vyšší než mezní náklady (${czText(c)}). Kupující by zaplatili víc, než kolik stojí výroba, ale monopolista tyto kusy nevyrobí, protože by musel snížit cenu všem (při jednotné ceně pro všechny). Ztráta je trojúhelník: základna $Q_K-Q_M=${czText(r6(Qc - Qm))}$, výška $P_M-MC=${czText(r6(Pm - c))}$.`,
        board: [line(`Q_K-Q_M=${cz(Qc)}-${cz(Qm)}=${cz(r6(Qc - Qm))}`), line(`P_M-MC=${cz(Pm)}-${cz(c)}=${cz(r6(Pm - c))}`)] },
      { title: 'Mrtvá ztráta', text: 'Plocha trojúhelníku je polovina základny krát výška.',
        board: [result(`MZ=\\frac12\\cdot ${cz(r6(Qc - Qm))}\\cdot ${cz(r6(Pm - c))}=${cz(dwl)}`)] },
      { title: 'Graf', text: `Plocha MZ mezi poptávkou a mezními náklady od ${czText(Qm)} do ${czText(Qc)} je mrtvá ztráta ${czText(dwl)} Kč. (Platí za předpokladu, že cena rovná mezním nákladům je společensky žádoucí, tedy bez externalit.)`, viz: graph },
    ],
  });
}

function genMrtvaMonopol(rng) {
  const B = pick(rng, [1, 1, 2, 3]); const Qm = int(rng, 4, 30); const c = pick(rng, [5, 9, 10, 20]);
  return buildMrtvaMonopol({ A: c + 2 * B * Qm, B, c });
}

// ---------- typ: při jakém množství je celkový přebytek největší ----------
function buildMaxPrebytek({ A, B, C, D, qs }) {
  const { Q, P } = eqInv({ A, B, C, D });
  const ts = (q) => r6((A - C) * q - ((B + D) * q * q) / 2);
  const options = qs.map((q) => ({ id: `q${q}`, text: `Q = ${czText(q)} ks` }));
  const best = Math.max(...qs.map(ts));
  const graph = invViz({ A, B, C, D }, { areas: [{ between: [dE(A, B), sE(C, D)], from: 0, to: Q, label: 'TS', color: 'green' }], alt: 'Celkový přebytek je největší v rovnováze' });
  return mk('max-prebytek', {
    data: { A, B, C, D, qs },
    task: `Poptávka po zboží je dána první rovnicí (vyjadřuje, kolik by kupující nejvýš zaplatili za další kus), nabídka druhou (kolik stojí další kus vyrobit). Při kterém z uvedených množství bude celkový společenský přebytek největší? Předpokládejte, že výroba ani spotřeba nikomu dalšímu neškodí ani neprospívá.`,
    promptTex: `${invDemand(A, B)},\\qquad ${invSupply(C, D)}`,
    answerSpec: { kind: 'choice', value: `q${Q}`, options },
    conclusion: `Celkový přebytek je největší při množství ${czText(Q)} ks, tedy v tržní rovnováze (přebytek ${czText(ts(Q))} Kč).`,
    solution: [
      { title: 'Celkový přebytek při množství q', text: 'Každý vyrobený a spotřebovaný kus přidá společnosti rozdíl mezi tím, kolik si ho kupující cení (cena z poptávky), a tím, kolik stojí jeho výroba (cena z nabídky). Celkový přebytek je součet těchto rozdílů, tedy plocha mezi křivkami od nuly do q.',
        board: [line(`TS(q)=\\int_0^q\\left[(${cz(A)}-${coef(B, 's')})-(${cPlus(C)}${coef(D, 's')})\\right]ds`), line(`TS(q)=${cz(r6(A - C))}\\,q-\\frac{${cz(r6(B + D))}}{2}\\,q^2`)] },
      { title: 'Dosadíme zadaná množství', text: 'Pro každou možnost spočteme celkový přebytek.',
        board: qs.map((q) => line(`TS(${cz(q)})=${cz(r6(A - C))}\\cdot ${cz(q)}-${cz(r6((B + D) / 2))}\\cdot ${cz(q)}^2=${cz(ts(q))}`)) },
      { title: 'Porovnání', text: `Největší hodnotu ${czText(best)} má množství ${czText(Q)}. Je to rovnovážné množství, kde se cena z poptávky rovná ceně z nabídky. Před ním je přínos dalšího kusu pro kupující větší než náklad a výroba ještě vyplatí. Za ním už další kus stojí víc, než kupující oceňují, a celkový přebytek klesá.`,
        board: [line(`P_D(q)>P_S(q)\\ \\text{pro}\\ q<Q_E`), line(`P_D(q)<P_S(q)\\ \\text{pro}\\ q>Q_E`)] },
      { title: 'Výsledek', text: `Správné množství je ${czText(Q)} ks (rovnovážná cena ${czText(P)} Kč).`,
        board: [result(`Q=${cz(Q)}`)] },
      { title: 'Graf', text: `Plocha TS do rovnovážného množství ${czText(Q)} je největší možná.`, viz: graph },
    ],
  });
}

function genMaxPrebytek(rng) {
  const B = int(rng, 1, 5); const D = int(rng, 1, 5); const C = pick(rng, [0, 5, 10, 20]);
  const Q = int(rng, 10, 30); const d1 = int(rng, 2, 5);
  const P = C + D * Q;
  return buildMaxPrebytek({ A: P + B * Q, B, C, D, qs: shuffle(rng, [Q - d1, Q, Q + d1, Q + 2 * d1]) });
}

// ---------- typ: dílčí × celková rovnováha (dva provázané trhy) ----------
const KS = [0.5, 0.25, 0.2, 0.1, 0.4];
function solveTwo({ c1, c2, k1, k2 }) {
  const P1 = r6((c1 + k1 * c2) / (1 - k1 * k2));
  return { P1, P2: r6(c2 + k2 * P1) };
}

function buildDvaTrhy({ a1, a2, k1, k2, Q1, Q2, dQ, scenario, ask }) {
  const po = scenario === 'po';
  const Q1e = po ? Q1 + dQ : Q1;
  const c1 = r6(a1 - Q1e); const c2 = r6(a2 - Q2);
  const now = solveTwo({ c1, c2, k1, k2 });
  const before = solveTwo({ c1: r6(a1 - Q1), c2, k1, k2 });
  const val = r2(ask === 1 ? now.P1 : now.P2);
  const name = ask === 1 ? 'prvního' : 'druhého';
  const when = po ? 'po zvýšení nabídky prvního statku' : 'v krátkém období';
  return mk('dva-trhy', {
    data: { a1, a2, k1, k2, Q1, Q2, dQ, scenario, ask },
    source: { chapter: 11, number: 1 },
    task: `Dva statky jsou substituty. V krátkém období je nabídka prvního statku pevná ($Q_1=${cz(Q1)}$) a druhého také ($Q_2=${cz(Q2)}$). Poptávka po prvním statku závisí i na ceně druhého a naopak, jak ukazují rovnice. ${po ? `Nabídka prvního statku se zvýší o ${czText(dQ)} jednotek (na ${czText(Q1 + dQ)}). ` : ''}Určete rovnovážnou cenu ${name} statku ${when} (zaokrouhlete na dvě desetinná místa).`,
    promptTex: `P_1=${cz(a1)}-Q_1+${coef(k1, 'P_2')},\\qquad P_2=${cz(a2)}-Q_2+${coef(k2, 'P_1')}`,
    answerSpec: { kind: 'number', value: val, tol: 0.01 },
    conclusion: `Rovnovážná cena ${name} statku je ${czText(val)}${po ? ` (před zvýšením nabídky ${czText(r2(ask === 1 ? before.P1 : before.P2))}).` : '.'}`,
    solution: [
      { title: 'Proč nestačí dílčí analýza', text: `Cena prvního statku závisí na ceně druhého a naopak, a každý trh proto nelze řešit zvlášť. Obě rovnováhy musí platit současně: je to soustava dvou rovnic o dvou neznámých $P_1$ a $P_2$. Za $Q_1$ a $Q_2$ dosadíme pevné nabídky.`,
        board: [line(`P_1=${cz(a1)}-${cz(Q1e)}+${coef(k1, 'P_2')}=${cz(c1)}+${coef(k1, 'P_2')}`), line(`P_2=${cz(a2)}-${cz(Q2)}+${coef(k2, 'P_1')}=${cz(c2)}+${coef(k2, 'P_1')}`)] },
      { title: 'Dosadíme jednu rovnici do druhé', text: 'Druhou rovnici dosadíme za $P_2$ do první a dostaneme rovnici jen s $P_1$.',
        board: [line(`P_1=${cz(c1)}+${cz(k1)}\\,(${cz(c2)}+${cz(k2)}P_1)`), line(`P_1\\,(1-${cz(r6(k1 * k2))})=${cz(c1)}+${cz(r6(k1 * c2))}`)] },
      { title: 'Cena prvního statku', text: 'Vydělíme číslem v závorce.',
        board: [ask === 1 ? result(`P_1=\\frac{${cz(r6(c1 + k1 * c2))}}{${cz(r6(1 - k1 * k2))}}=${cz(r2(now.P1))}`) : line(`P_1=\\frac{${cz(r6(c1 + k1 * c2))}}{${cz(r6(1 - k1 * k2))}}=${cz(r2(now.P1))}`)] },
      { title: 'Cena druhého statku', text: 'Cenu prvního statku dosadíme do rovnice pro druhý.',
        board: [ask === 2 ? result(`P_2=${cz(c2)}+${cz(k2)}\\cdot ${cz(r2(now.P1))}=${cz(r2(now.P2))}`) : line(`P_2=${cz(c2)}+${cz(k2)}\\cdot ${cz(r2(now.P1))}=${cz(r2(now.P2))}`)] },
      ...(po ? [{ title: 'Srovnání s výchozí rovnováhou', text: `Před zvýšením nabídky vycházejí ceny ${czText(r2(before.P1))} a ${czText(r2(before.P2))}. Cena prvního statku klesla, protože ho je víc. Zlevnění prvního statku ale sníží i poptávku po jeho substitutu, a cena druhého statku proto také klesla (${czText(r2(before.P2))} na ${czText(r2(now.P2))}). Změna na jednom trhu se tak přenesla na druhý, což dílčí analýza nezachytí.`,
        board: [line(`P_1:\\ ${cz(r2(before.P1))}\\to ${cz(r2(now.P1))}`), line(`P_2:\\ ${cz(r2(before.P2))}\\to ${cz(r2(now.P2))}`)] }] : [{ title: 'Zkouška', text: 'Dosadíme obě ceny do obou rovnic. Obě musí vyjít.',
        board: [line(`P_1=${cz(c1)}+${cz(k1)}\\cdot ${cz(r2(now.P2))}\\approx ${cz(r2(c1 + k1 * now.P2))}`), line(`P_2=${cz(c2)}+${cz(k2)}\\cdot ${cz(r2(now.P1))}\\approx ${cz(r2(c2 + k2 * now.P1))}`)] }]),
      { title: 'Výsledek', text: `Rovnovážná cena ${name} statku je ${czText(val)}.`, board: [result(`P_${ask}=${cz(val)}`)] },
    ],
  });
}

function genDvaTrhy(rng) {
  const k1 = pick(rng, KS); const k2 = pick(rng, KS);
  const P1 = 20 * int(rng, 10, 40); const P2 = 20 * int(rng, 8, 30);
  const Q1 = pick(rng, [30, 40, 50, 60, 80]); const Q2 = pick(rng, [100, 120, 150, 180]);
  return buildDvaTrhy({ a1: r6(P1 + Q1 - k1 * P2), a2: r6(P2 + Q2 - k2 * P1), k1, k2, Q1, Q2, dQ: pick(rng, [20, 30, 40, 50, 85]), scenario: pick(rng, ['pred', 'po']), ask: pick(rng, [1, 2]) });
}

// ---------- typ: je alokace Paretovsky efektivní (Edgeworthův diagram, U = x·y u obou) ----------
const fracTex = (n, d) => `\\frac{${cz(n)}}{${cz(d)}}`;

function buildParetoAlokace({ X, Y, xA, yA }) {
  const xB = X - xA; const yB = Y - yA;
  const eff = yA * xB === yB * xA;
  const mA = r2(yA / xA); const mB = r2(yB / xB);
  const aHigh = yA * xB > yB * xA; // A si cení X víc
  const hi = aHigh ? 'A' : 'B'; const lo = aHigh ? 'B' : 'A';
  const sign = eff ? '=' : aHigh ? '>' : '<';
  return mk('pareto-alokace', {
    data: { X, Y, xA, yA },
    task: `Dva spotřebitelé, A a B, si rozdělili ${X} kusů statku X a ${Y} kusů statku Y. Každý má užitek $U=xy$ (x je jeho množství statku X, y statku Y). Spotřebitel A dostal ${xA} kusů X a ${yA} kusů Y, spotřebitel B zbytek (${xB} kusů X a ${yB} kusů Y). Je toto rozdělení Paretovsky efektivní?`,
    answerSpec: { kind: 'choice', value: eff ? 'ef' : 'nef', options: [{ id: 'ef', text: 'Ano, rozdělení je Paretovsky efektivní' }, { id: 'nef', text: 'Ne, jde provést Paretovo zlepšení' }] },
    conclusion: eff ? 'Rozdělení je Paretovsky efektivní: obě mezní míry substituce jsou stejné, leží na smluvní křivce.' : `Rozdělení není efektivní: spotřebitel ${hi} si cení statku X víc než ${lo}, a jejich výměna oběma prospěje.`,
    solution: [
      { title: 'Podmínka efektivnosti ve směně', text: 'Rozdělení statků mezi spotřebitele je efektivní, když mají oba stejnou mezní míru substituce. MRS říká, kolik kusů Y je spotřebitel ochoten vzdát za jeden kus X. Při užitku $U=xy$ je mezní užitek X roven $y$ a Y roven $x$, takže $MRS=MU_X/MU_Y=y/x$.',
        board: [line('MRS=\\frac{MU_X}{MU_Y}=\\frac{y}{x}'), line('\\text{efektivní}\\iff MRS_A=MRS_B')] },
      { title: 'Spočítáme MRS obou spotřebitelů', text: `Spotřebitel B má ${xB} kusů X a ${yB} kusů Y.`,
        board: [line(`MRS_A=${fracTex(yA, xA)}=${cz(mA)}`), line(`MRS_B=${fracTex(yB, xB)}=${cz(mB)}`), line(`MRS_A${sign}MRS_B`)] },
      eff
        ? { title: 'Závěr: nelze zlepšit', text: `Obě MRS jsou stejné, takže bod leží na smluvní křivce (křivky užitku A a B se v něm dotýkají). Jakákoli výměna, která by prospěla jednomu, druhému uškodí. Pozor: efektivnost neříká nic o spravedlnosti. I rozdělení, kde má jeden skoro všechno, může být efektivní.`,
          board: [result('\\text{Paretovsky efektivní}')] }
        : { title: 'Jaká výměna by pomohla', text: `Spotřebitel ${hi} je ochoten vzdát se víc kusů Y za jeden kus X (${cz2(Math.max(mA, mB))}) než ${lo} (${cz2(Math.min(mA, mB))}). Když ${lo} dá ${hi} jeden kus X a dostane za něj třeba ${czText(r2((mA + mB) / 2))} kusu Y (cena mezi oběma MRS), polepší si oba. Rozdělení proto není Paretovsky efektivní.`,
          board: [line(`${cz(Math.min(mA, mB))}<p<${cz(Math.max(mA, mB))}`), result('\\text{není efektivní}')] },
    ],
  });
}
const cz2 = (v) => czText(r2(v));

function genParetoAlokace(rng) {
  for (let i = 0; i < 300; i++) {
    const X = int(rng, 6, 20); const Y = int(rng, 6, 20);
    const xA = int(rng, 1, X - 1);
    const onCurve = rng() < 0.5;
    if (onCurve) {
      if ((Y * xA) % X !== 0) continue;
      const yA = (Y * xA) / X;
      if (yA < 1 || yA > Y - 1) continue;
      return buildParetoAlokace({ X, Y, xA, yA });
    }
    const yA = int(rng, 1, Y - 1);
    if (yA * (X - xA) === (Y - yA) * xA) continue;
    return buildParetoAlokace({ X, Y, xA, yA });
  }
  return buildParetoAlokace({ X: 10, Y: 10, xA: 4, yA: 4 });
}

// ---------- typ: které výměny jsou Paretovým zlepšením (tabulka) ----------
function buildParetoVymena({ mHi, mLo, hi, rates }) {
  const lo = hi === 'A' ? 'B' : 'A';
  const flags = rates.map((p) => (p > mLo && p < mHi ? 1 : 0));
  const rows = flags.map((f) => [String(f)]);
  return mk('pareto-vymena', {
    data: { mHi, mLo, hi, rates },
    task: `Spotřebitel ${hi} je ochoten vzdát se ${czText(mHi)} jednotek statku Y za jednu jednotku statku X (jeho $MRS=${cz(mHi)}$), spotřebitel ${lo} jen ${czText(mLo)} jednotek Y ($MRS=${cz(mLo)}$). Navrhují se malé výměny: ${hi} dostane od ${lo} jednu jednotku X a za ni mu dá p jednotek Y. Pro hodnoty p = ${rates.map(czText).join('; ')} (v tomto pořadí) zapište do tabulky na každý řádek 1, jestliže jde o Paretovo zlepšení (nikdo si nepohorší a aspoň jeden si polepší), jinak 0.`,
    answerSpec: { kind: 'table', value: rows },
    conclusion: `Řádky po řadě: ${flags.join(', ')}. Paretovým zlepšením je výměna s p mezi ${czText(mLo)} a ${czText(mHi)}.`,
    solution: [
      { title: 'Co MRS říká o ochotě platit', text: `MRS spotřebitele ${hi} znamená, že za další jednotku X by dal nejvýš ${czText(mHi)} jednotek Y. Spotřebitel ${lo} by za odevzdanou jednotku X chtěl aspoň ${czText(mLo)} jednotek Y.`,
        board: [line(`MRS_${hi}=${cz(mHi)},\\quad MRS_${lo}=${cz(mLo)}`)] },
      { title: 'Podmínka zlepšení', text: `Spotřebitel ${hi} si polepší, když za jednotku X zaplatí méně, než byl ochoten ($p<${czText(mHi)}$). Spotřebitel ${lo} si polepší, když dostane víc, než by si vyžádal ($p>${czText(mLo)}$). Pokud by p bylo rovné jedné z hranic, jeden by byl lhostejný: to je ještě (slabé) zlepšení, ale hodnoty v zadání na hranici nejsou.`,
        board: [line(`${cz(mLo)}<p<${cz(mHi)}`)] },
      { title: 'Posoudíme jednotlivé výměny', text: 'U každé hodnoty p zkontrolujeme obě nerovnosti. Zlepšením je výměna, kde platí obě.',
        board: rates.map((p, i) => line(`p=${cz(p)}:\\ ${cz(mLo)}<${cz(p)}<${cz(mHi)}\\ \\Rightarrow\\ ${flags[i] ? '\\text{ano}\\ (1)' : '\\text{ne}\\ (0)'}`)) },
      { title: 'Výsledek', text: `Tabulka: ${flags.join(', ')}. Výměna je výhodná pro obě strany právě tehdy, když se mezní míry substituce liší. Po ní se MRS přibližují, a směna končí, až se vyrovnají (bod smluvní křivky). Platí to pro malé výměny, protože s každou výměnou se MRS mění.`,
        board: [result(`\\text{${flags.join(',\\ ')}}`)] },
    ],
  });
}

function genParetoVymena(rng) {
  const mLo = int(rng, 1, 4); const mHi = mLo + int(rng, 2, 4);
  const inside = []; for (let p = mLo + 0.5; p < mHi; p += 1) inside.push(p);
  const outside = [mLo - 0.5, mHi + 0.5, mHi + 1.5].filter((p) => p > 0);
  const nIn = int(rng, 1, Math.min(3, inside.length));
  const rates = shuffle(rng, [...shuffle(rng, inside).slice(0, nIn), ...shuffle(rng, outside).slice(0, 4 - nIn)]);
  return buildParetoVymena({ mHi, mLo, hi: pick(rng, ['A', 'B']), rates });
}

// ---------- typ: smluvní křivka směny (číselně) ----------
// pref 'same': oba mají U = x·y, smluvní křivka je úhlopříčka; 'wB': A má U = x·y, B má U = x·y², MRS_B = y/(2x).
function contractY({ X, Y, xA, pref }) {
  return pref === 'same' ? (Y * xA) / X : (Y * xA) / (2 * X - xA);
}

function buildSmluvni({ X, Y, xA, pref }) {
  const yA = r6(contractY({ X, Y, xA, pref }));
  const xB = X - xA; const yB = r6(Y - yA);
  const same = pref === 'same';
  return mk('smluvni-krivka', {
    data: { X, Y, xA, pref },
    task: `V ekonomice je ${X} kusů statku X a ${Y} kusů statku Y. Spotřebitel A má užitek $U_A=xy$, spotřebitel B ${same ? '$U_B=xy$' : '$U_B=xy^2$'} (x je množství statku X, y statku Y). Spotřebitel A dostane ${xA} kusů statku X. Kolik kusů statku Y musí dostat, aby bylo rozdělení na smluvní křivce směny (Paretovsky efektivní)? Spotřebitel B dostane zbytek obou statků.`,
    answerSpec: { kind: 'number', value: yA },
    conclusion: `Spotřebitel A musí dostat ${czText(yA)} kusů statku Y (spotřebitel B pak ${czText(xB)} kusů X a ${czText(yB)} kusů Y).`,
    solution: [
      { title: 'Mezní míry substituce', text: same ? 'U užitku $U=xy$ je $MU_X=y$ a $MU_Y=x$, a proto $MRS=y/x$. Oba spotřebitelé mají stejné preference.' : 'U $U_A=xy$ je $MRS_A=y/x$. U $U_B=xy^2$ je $MU_X=y^2$ a $MU_Y=2xy$, a proto $MRS_B=y/(2x)$.',
        board: same ? [line('MRS_A=\\frac{y_A}{x_A},\\quad MRS_B=\\frac{y_B}{x_B}')] : [line('MRS_A=\\frac{y_A}{x_A}'), line('MRS_B=\\frac{y^2}{2xy}=\\frac{y_B}{2x_B}')] },
      { title: 'Podmínka smluvní křivky', text: `Na smluvní křivce se MRS obou spotřebitelů rovnají. Spotřebitel B dostane zbytek: $x_B=${czText(X)}-x_A$ a $y_B=${czText(Y)}-y_A$.`,
        board: [line(same ? `\\frac{y_A}{x_A}=\\frac{${cz(Y)}-y_A}{${cz(X)}-x_A}` : `\\frac{y_A}{x_A}=\\frac{${cz(Y)}-y_A}{2\\,(${cz(X)}-x_A)}`)] },
      { title: 'Vyjádříme množství Y spotřebitele A', text: 'Rovnici vynásobíme jmenovateli a členy s $y_A$ dáme na jednu stranu.',
        board: same ? [line(`y_A\\,(${cz(X)}-x_A)=(${cz(Y)}-y_A)\\,x_A`), line(`y_A\\cdot ${cz(X)}=${cz(Y)}\\,x_A`), line(`y_A=\\frac{${cz(Y)}\\,x_A}{${cz(X)}}`)]
          : [line(`2\\,y_A\\,(${cz(X)}-x_A)=(${cz(Y)}-y_A)\\,x_A`), line(`y_A\\,(2\\cdot ${cz(X)}-x_A)=${cz(Y)}\\,x_A`), line(`y_A=\\frac{${cz(Y)}\\,x_A}{2\\cdot ${cz(X)}-x_A}`)] },
      { title: 'Dosadíme', text: `Dosadíme $x_A=${czText(xA)}$.`,
        board: [result(same ? `y_A=\\frac{${cz(Y)}\\cdot ${cz(xA)}}{${cz(X)}}=${cz(yA)}` : `y_A=\\frac{${cz(Y)}\\cdot ${cz(xA)}}{${cz(2 * X - xA)}}=${cz(yA)}`)] },
      { title: 'Zkouška', text: `Spotřebitel B má ${czText(xB)} kusů X a ${czText(yB)} kusů Y. Obě MRS musí vyjít stejně. Všechny body smluvní křivky jsou Paretovsky efektivní, ale přidělují jednomu spotřebiteli víc a druhému méně. Který z nich je spravedlivý, efektivnost neříká.`,
        board: [line(`MRS_A=\\frac{${cz(yA)}}{${cz(xA)}}=${cz(r6(yA / xA))}`), line(same ? `MRS_B=\\frac{${cz(yB)}}{${cz(xB)}}=${cz(r6(yB / xB))}` : `MRS_B=\\frac{${cz(yB)}}{2\\cdot ${cz(xB)}}=${cz(r6(yB / (2 * xB)))}`)] },
    ],
  });
}

function genSmluvni(rng) {
  for (let i = 0; i < 500; i++) {
    const X = int(rng, 6, 20); const Y = int(rng, 6, 24); const xA = int(rng, 1, X - 1);
    const pref = pick(rng, ['same', 'wB']);
    const y = contractY({ X, Y, xA, pref });
    if (Number.isInteger(y) && y >= 1 && y <= Y - 1) return buildSmluvni({ X, Y, xA, pref });
  }
  return buildSmluvni({ X: 10, Y: 20, xA: 4, pref: 'same' });
}

// ---------- typ: MRS a MRPT (výrobně-spotřební efektivnost) ----------
function buildMrsMrpt({ mrs, mrpt }) {
  const val = mrs > mrpt ? 'vicX' : mrs < mrpt ? 'vicY' : 'ok';
  const text = { vicX: 'Vyrábět víc statku X a méně statku Y', vicY: 'Vyrábět víc statku Y a méně statku X', ok: 'Nic neměnit: výroba i spotřeba jsou efektivně sladěné' };
  return mk('mrs-mrpt', {
    data: { mrs, mrpt },
    task: `Ekonomika vyrábí statky X a Y. Oba spotřebitelé mají stejnou mezní míru substituce: za jednu další jednotku X jsou ochotni vzdát se ${czText(mrs)} jednotek Y ($MRS=${cz(mrs)}$). Při přesunu zdrojů ve výrobě se za jednu další jednotku X vzdá ${czText(mrpt)} jednotek Y ($MRPT=${cz(mrpt)}$). Co by měla ekonomika udělat, aby se zvýšil užitek spotřebitelů?`,
    answerSpec: { kind: 'choice', value: val, options: [{ id: 'vicX', text: text.vicX }, { id: 'vicY', text: text.vicY }, { id: 'ok', text: text.ok }] },
    conclusion: `${text[val]}.`,
    solution: [
      { title: 'Co MRS a MRPT znamenají', text: 'MRS je hodnota jedné jednotky X pro spotřebitele měřená v Y. MRPT je cena jedné jednotky X pro společnost, tedy kolik Y se kvůli ní musí obětovat ve výrobě. Výrobně-spotřební efektivnost vyžaduje $MRS=MRPT$.',
        board: [line('\\text{hodnota }X=MRS,\\quad \\text{náklad }X=MRPT')] },
      { title: 'Porovnáme', text: `${mrs === mrpt ? 'Obě hodnoty se rovnají.' : mrs > mrpt ? `Spotřebitelé si další jednotku X cení na ${czText(mrs)} jednotek Y, ale výroba je stojí jen ${czText(mrpt)} jednotek Y.` : `Spotřebitelé si další jednotku X cení jen na ${czText(mrs)} jednotek Y, ale výroba je stojí ${czText(mrpt)} jednotek Y.`}`,
        board: [line(`MRS=${cz(mrs)}\\ ${mrs > mrpt ? '>' : mrs < mrpt ? '<' : '='}\\ MRPT=${cz(mrpt)}`)] },
      { title: 'Co z toho plyne', text: mrs === mrpt ? 'Přesun zdrojů by neprospěl nikomu. Podmínka je splněna a nelze zlepšit nikoho na úkor nikoho jiného.' : mrs > mrpt ? 'Vyplatí se vyrobit jednotku X navíc: spotřebitelé z ní mají větší užitek, než kolik stojí obětované Y. Výrobu X je výhodné zvyšovat a Y snižovat, dokud se MRS (klesá) a MRPT (roste) nesrovnají.' : 'Další jednotka X stojí víc, než spotřebitelé oceňují. Výhodnější je výrobu X snížit a vyrobit víc Y, dokud se MRS a MRPT nesrovnají.',
        board: [result(mrs === mrpt ? 'MRS=MRPT' : mrs > mrpt ? '\\uparrow X,\\ \\downarrow Y' : '\\downarrow X,\\ \\uparrow Y')] },
      { title: 'V dokonalé konkurenci', text: 'Spotřebitelé volí množství tak, že MRS se rovná poměru cen. Firmy vyrábějí tak, že cena se rovná mezním nákladům, takže MRPT se rovná poměru mezních nákladů. Při dokonalé konkurenci jsou ceny rovny mezním nákladům, a obě strany tak řídí stejné ceny.',
        board: [line('MRS=\\frac{P_X}{P_Y}=\\frac{MC_X}{MC_Y}=MRPT')] },
    ],
  });
}

function genMrsMrpt(rng) {
  const mrpt = int(rng, 1, 6);
  const mrs = rng() < 0.25 ? mrpt : int(rng, 1, 6);
  return buildMrsMrpt({ mrs, mrpt });
}

// ---------- typ: MRPT z hranice produkčních možností ----------
function buildMrpt({ a, b, x1 }) {
  const ys = [0, 1, 2, 3, 4, 5].map((x) => a - b * x * x);
  const val = ys[x1] - ys[x1 + 1];
  const tbl = `\\begin{array}{|c|cccccc|}\\hline X & ${[0, 1, 2, 3, 4, 5].join(' & ')} \\\\ \\hline Y & ${ys.map(cz).join(' & ')} \\\\ \\hline\\end{array}`;
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'X', y: 'Y' }, domain: [0, nice(Math.sqrt(a / b))], range: [0, nice(a)],
      curves: [{ expr: `${lit(a)} - ${lit(b)}*x^2`, label: 'PPF', color: 'blue' }],
      points: ys.map((y, x) => ({ x, y, label: x === x1 || x === x1 + 1 ? String.fromCharCode(65 + x) : '' })),
      arrows: [], areas: [], alt: 'Hranice produkčních možností',
    },
  };
  return mk('mrpt', {
    data: { a, b, x1 },
    task: `Ekonomika vyrábí dva statky. Tabulka ukazuje, kolik kusů statku Y lze vyrobit, když se vyrobí daný počet kusů statku X (všechny zdroje jsou plně využity). O kolik kusů se musí snížit výroba statku Y, aby se mohla vyrobit ${x1 + 1}. jednotka statku X (tj. při přechodu z ${x1} na ${x1 + 1} kusů X)? To je mezní míra transformace produktu MRPT.`,
    promptTex: tbl,
    answerSpec: { kind: 'number', value: val },
    conclusion: `MRPT při přechodu z ${x1} na ${x1 + 1} kusů X je ${czText(val)}: výroba Y musí klesnout o ${czText(val)} kusů.`,
    solution: [
      { title: 'Co je MRPT', text: 'MRPT je sklon hranice produkčních možností: kolik kusů jednoho statku musíme obětovat, abychom vyrobili jednu další jednotku druhého. Je to oportunitní náklad další jednotky X měřený v Y.',
        board: [line('MRPT=\\left|\\frac{\\Delta Y}{\\Delta X}\\right|')] },
      { title: 'Změny v tabulce', text: `Přechod z ${x1} na ${x1 + 1} kusů X zvyšuje X o jedna. Y se přitom změní z ${czText(ys[x1])} na ${czText(ys[x1 + 1])}.`,
        board: [line(`\\Delta X=${x1 + 1}-${x1}=1`), line(`\\Delta Y=${cz(ys[x1 + 1])}-${cz(ys[x1])}=${cz(-val)}`)] },
      { title: 'MRPT', text: 'Vydělíme změnu Y změnou X a vezmeme absolutní hodnotu.',
        board: [result(`MRPT=\\frac{${cz(val)}}{1}=${cz(val)}`)] },
      { title: 'Rostoucí náklady', text: `Při dalším přechodu (z ${x1 + 1} na ${x1 + 2 <= 5 ? x1 + 2 : 'dalších'} kusů X) by byl náklad vyšší. Hranice je konkávní (vypouklá od počátku), a MRPT proto s rostoucí výrobou X roste. Důvodem je, že zdroje se k oběma statkům hodí různě dobře.`, viz: graph },
    ],
  });
}

function genMrpt(rng) {
  const b = int(rng, 1, 3); const a = 25 * b + int(rng, 0, 30);
  return buildMrpt({ a, b, x1: int(rng, 0, 4) });
}

// ---------- typy: výběr z možností podle zadané banky (definice, podmínky) ----------
function bankBuilder(typeId, part, bank) {
  return ({ id, order }) => {
    const it = bank.find((x) => x.id === id) ?? bank[0];
    const texts = [it.right, ...it.wrong];
    const ord = order && order.length === 4 ? order : [0, 1, 2, 3];
    const options = ord.map((i) => ({ id: `o${i}`, text: texts[i] }));
    return mk(typeId, {
      part,
      data: { id, order: ord },
      task: it.q,
      answerSpec: { kind: 'choice', value: 'o0', options },
      conclusion: it.right,
      solution: [
        { title: 'Klíčový pojem', text: `Najdeme pojem, na který se otázka ptá: ${it.key}. Vybavíme si jeho definici nebo graf.`, board: [line(`\\text{${it.key}}`)] },
        { title: 'Vyloučíme nesprávné možnosti', text: it.trap, board: [line('\\text{vyloučit chyby}')] },
        { title: 'Správná odpověď', text: it.right, board: [result('\\checkmark')] },
      ],
    });
  };
}

const COND = [
  { id: 'c-smena', key: 'efektivnost ve směně', q: 'Která podmínka musí platit pro efektivní rozdělení daných statků mezi dva spotřebitele (efektivnost ve směně)?', right: 'Mezní míry substituce obou spotřebitelů jsou stejné (MRS spotřebitele A se rovná MRS spotřebitele B).', wrong: ['Mezní míry technické substituce obou statků jsou stejné.', 'Mezní míra substituce se rovná mezní míře technické substituce.', 'Oba spotřebitelé spotřebovávají stejné množství obou statků.'], trap: 'Nesprávné možnosti zaměňují směnu s výrobou (MRTS) nebo požadují stejná množství. Efektivní je shoda MRS, nikoli stejné množství.' },
  { id: 'c-vyroba', key: 'efektivnost ve výrobě', q: 'Která podmínka musí platit pro efektivní rozdělení práce a kapitálu mezi výrobu dvou statků (efektivnost ve výrobě)?', right: 'Mezní míra technické substituce práce a kapitálu je stejná při výrobě obou statků (MRTS pro statek X se rovná MRTS pro statek Y).', wrong: ['Mezní míry substituce obou spotřebitelů jsou stejné.', 'Mezní míra substituce se rovná mezní míře transformace produktu.', 'Obě firmy používají stejné množství práce a kapitálu.'], trap: 'Ve výrobě rozhoduje MRTS (poměr, v jakém lze nahradit faktory při stejném výstupu). MRS patří do směny.' },
  { id: 'c-vs', key: 'výrobně-spotřební efektivnost', q: 'Jaká podmínka musí platit pro výrobně-spotřební efektivnost (celkovou rovnováhu)?', right: 'Společná mezní míra substituce spotřebitelů se rovná mezní míře transformace produktu (MRS = MRPT).', wrong: ['Mezní míry technické substituce obou statků jsou stejné.', 'Mezní míry substituce obou spotřebitelů jsou stejné, ale nezávisí na výrobě.', 'Cena obou statků je stejná.'], trap: 'Tato podmínka propojuje spotřebu a výrobu. MRTS a MRS samy o sobě popisují jen výrobu, respektive jen směnu.' },
  { id: 'c-sklon', key: 'smluvní křivka směny', q: 'Co platí o sklonech indiferenčních křivek obou spotřebitelů na smluvní křivce směny?', right: 'Křivky se dotýkají a mají v bodě dotyku stejný sklon (stejnou MRS).', wrong: ['Křivky se protínají pod pravým úhlem.', 'Sklon křivky spotřebitele A je opačný než sklon křivky spotřebitele B.', 'Sklony mohou být libovolné, rozhoduje jen součet užitků.'], trap: 'Stejnou MRS mají jen body dotyku křivek. V protínajících se bodech jsou sklony různé a výměna by oběma prospěla.' },
  { id: 'c-prumer', key: 'MRS při dokonalé konkurenci', q: 'Čemu se při dokonalé konkurenci a optimální volbě spotřebitele rovná mezní míra substituce statku X za Y?', right: 'Poměru cen obou statků (cena X děleno cenou Y).', wrong: ['Rozdílu cen obou statků.', 'Součinu cen obou statků.', 'Poměru množství obou statků ve spotřebním koši.'], trap: 'Spotřebitel v optimu srovnává poměr mezních užitků s poměrem cen. Množství v koši tuto rovnost nenahradí.' },
];

const DEFS = [
  { id: 'd-dilci', key: 'dílčí rovnováha', q: 'Co zkoumá analýza dílčí rovnováhy?', right: 'Jednotlivé trhy izolovaně, za předpokladu, že se ceny na ostatních trzích nemění.', wrong: ['Všechny trhy současně a jejich vzájemné vazby.', 'Pouze trh práce a kapitálu.', 'Rovnováhu na trhu peněz.'], trap: 'Alternativa o všech trzích současně popisuje celkovou (všeobecnou) rovnováhu.' },
  { id: 'd-celkova', key: 'celková rovnováha', q: 'Co zkoumá analýza celkové (všeobecné) rovnováhy?', right: 'Vzájemnou propojenost trhů a podmínky rovnováhy na všech trzích současně.', wrong: ['Rovnováhu na jednom trhu, ostatní ceny považuje za pevné.', 'Rovnováhu státního rozpočtu.', 'Chování jedné firmy v dlouhém období.'], trap: 'Rovnováha na jednom trhu při pevných ostatních cenách je dílčí analýza.' },
  { id: 'd-model', key: 'model 2x2x2', q: 'Z čeho se skládá model jednoduché ekonomiky 2x2x2?', right: 'Ze dvou spotřebitelů, dvou statků a dvou výrobních faktorů (uzavřená ekonomika, dokonalá konkurence).', wrong: ['Ze dvou firem, dvou odvětví a dvou států.', 'Ze dvou trhů, dvou cen a dvou daní.', 'Ze dvou spotřebitelů, dvou firem a dvou bank.'], trap: 'Čísla 2x2x2 označují spotřebitele, statky a výrobní faktory (práci a kapitál).' },
  { id: 'd-pareto', key: 'Paretova efektivnost', q: 'Kdy je alokace Paretovsky efektivní?', right: 'Když nelze zvýšit užitek žádného subjektu, aniž by se snížil užitek jiného.', wrong: ['Když mají všichni subjekty stejný užitek.', 'Když je součet užitků co nejvyšší při rovném rozdělení.', 'Když nikdo neplatí daně.'], trap: 'Paretova efektivnost nevyžaduje rovnost. Požaduje jen to, aby nešlo někomu pomoci bez újmy druhému.' },
  { id: 'd-zlepseni', key: 'Paretovo zlepšení', q: 'Co je Paretovo zlepšení?', right: 'Změna alokace, při které si aspoň jeden subjekt polepší a nikdo si nepohorší.', wrong: ['Změna, při které si polepší většina subjektů.', 'Změna, při které roste součet užitků, i kdyby si někdo pohoršil.', 'Změna, při které se užitky všech subjektů vyrovnají.'], trap: 'Pareto nepřipouští újmu nikomu. Zlepšení většině na úkor menšiny nebo prospěch celku nad všechny újmy je jiné kritérium (kompenzační).' },
  { id: 'd-smluvni-smena', key: 'smluvní křivka směny', q: 'Co je smluvní křivka směny?', right: 'Množina bodů Edgeworthova diagramu, v nichž se dotýkají indiferenční křivky obou spotřebitelů, tedy efektivní rozdělení dvou statků.', wrong: ['Množina bodů, kde mají oba spotřebitelé stejný užitek.', 'Množina všech možných rozdělení statků mezi spotřebitele.', 'Křivka ukazující ceny, za které spotřebitelé uzavřou smlouvu.'], trap: 'Všechna možná rozdělení (celé „krabicové schéma“) nejsou jen efektivní: efektivní jsou jen body dotyku.' },
  { id: 'd-smluvni-vyroba', key: 'smluvní křivka výroby', q: 'Co je smluvní křivka výroby?', right: 'Množina bodů, v nichž se dotýkají izokvanty obou statků, tedy efektivní rozdělení práce a kapitálu mezi výrobu dvou statků.', wrong: ['Množina bodů, v nichž se dotýkají indiferenční křivky spotřebitelů.', 'Křivka ukazující minimální náklady jedné firmy.', 'Hranice rozpočtu firmy.'], trap: 'Ve výrobě se dotýkají izokvanty (ne indiferenční křivky) a MRTS jsou stejné.' },
  { id: 'd-ppf', key: 'hranice produkčních možností', q: 'Co ukazuje hranice produkčních možností (PPF)?', right: 'Kombinace dvou statků, které lze vyrobit při plném a efektivním využití daných zdrojů.', wrong: ['Kombinace statků, které spotřebitel může koupit z daného důchodu.', 'Kombinace cen, při nichž je trh v rovnováze.', 'Minimální náklady výroby každého množství statku.'], trap: 'Rozpočtová přímka patří spotřebiteli. PPF patří ekonomice a jejím zdrojům.' },
  { id: 'd-mrpt', key: 'mezní míra transformace produktu', q: 'Co vyjadřuje mezní míra transformace produktu (MRPT)?', right: 'Kolik jednotek jednoho statku se musí obětovat, aby se mohla vyrobit další jednotka druhého statku (sklon PPF).', wrong: ['O kolik se musí zvýšit výroba jednoho statku, aby se mohla vyrobit další jednotka druhého.', 'Kolik jednotek jednoho statku je spotřebitel ochoten vzdát za druhý při stejném užitku.', 'Poměr cen výrobních faktorů práce a kapitálu.'], trap: 'Možnost o ochotě spotřebitele vzdát se statku při stejném užitku je MRS, poměr cen faktorů souvisí s MRTS. Možnost o zvýšení výroby jednoho statku navíc obrací směr (zvýšit místo obětovat).' },
  { id: 'd-cs', key: 'spotřebitelský přebytek', q: 'Co je spotřebitelský přebytek?', right: 'Rozdíl mezi nejvyšší cenou, kterou by kupující zaplatili, a cenou, kterou skutečně platí (plocha pod poptávkou a nad cenou).', wrong: ['Rozdíl mezi cenou a mezními náklady výrobce.', 'Množství, které zbude neprodané při regulované ceně.', 'Plocha pod nabídkou a nad cenou.'], trap: 'Plocha pod nabídkou a pod cenou patří výrobci. Neprodané zboží je přebytek nabídky, jiný pojem.' },
  { id: 'd-ps', key: 'výrobcův přebytek', q: 'Co je výrobcův přebytek?', right: 'Rozdíl mezi cenou, za kterou výrobci prodávají, a nejnižší cenou, za kterou by prodali (plocha nad nabídkou a pod cenou).', wrong: ['Zisk firmy po odečtení všech nákladů včetně fixních.', 'Plocha pod poptávkou a nad cenou.', 'Množství vyrobené navíc nad rovnovážné množství.'], trap: 'Výrobcův přebytek není totéž co zisk: je to tržby minus variabilní náklady, tedy zisk plus fixní náklady.' },
  { id: 'd-mz', key: 'mrtvá ztráta', q: 'Co je mrtvá ztráta?', right: 'Ztráta celkového přebytku, která vzniká, když se kvůli zásahu nebo tržní síle obchoduje jiné než efektivní množství (u daně, stropu a monopolu méně).', wrong: ['Daňový výnos státu, který se nevrátí občanům.', 'Zisk firmy, který zmizí po vstupu konkurence.', 'Rozdíl mezi cenou a průměrnými náklady při ztrátě firmy.'], trap: 'Mrtvá ztráta je společenská ztráta nevyužitých výhod z obchodu, ne ztráta jedné firmy ani příjem státu.' },
  { id: 'd-efektivnost-sprav', key: 'efektivnost a spravedlnost', q: 'Jaký je vztah mezi Paretovou efektivností a spravedlností?', right: 'Jde o různá kritéria: efektivní alokace nemusí být spravedlivá a spravedlivá nemusí být efektivní.', wrong: ['Každá efektivní alokace je automaticky spravedlivá.', 'Spravedlivá alokace musí být vždy neefektivní.', 'Efektivnost a spravedlnost jsou totéž.'], trap: 'Efektivnost je o tom, jestli nejde nikomu pomoci bez újmy druhému. O rozdělení nic neříká. Spravedlnost je hodnotové hledisko.' },
];

// ---------- typ: výběr z možností (cvičebnice 11, část B) ----------
const PICKS = [
  { id: 'v-trhy', book: 2, q: 'Kolik trhů obsahuje model 2x2x2 (dva spotřebitelé, dva statky, dva výrobní faktory)?', options: ['2', '3', '4', '5', '6'], right: 'c', why: 'Trhy jsou dva trhy statků (X a Y) a dva trhy výrobních faktorů (práce a kapitál), dohromady 4. Spotřebitelé jsou účastníky trhů, nikoli trhy.' },
  { id: 'v-nutna', book: 3, q: 'Pro dosažení celkové rovnováhy je nutná:', options: ['Efektivnost ve výrobě', 'Efektivnost ve směně', 'Výrobně-spotřební efektivnost', 'Současná efektivnost ve směně, ve výrobě a výrobně-spotřební', 'Rovnováha na jednom dílčím trhu'], right: 'd', why: 'Celková rovnováha vyžaduje všechny tři podmínky současně: efektivnost ve směně, ve výrobě i výrobně-spotřební. Jedna samotná nestačí.' },
  { id: 'v-dilci', book: 4, q: 'Teorie dílčí rovnováhy zkoumá:', options: ['Tržní systém jako celek', 'Zpětnou vazbu mezi trhy', 'Podmínky rovnováhy na všech trzích současně', 'Všechny možnosti a) až c) jsou správné', 'Žádná z možností není správná'], right: 'e', why: 'Dílčí analýza zkoumá jeden trh izolovaně při neměnných cenách jinde. Všechny tři popsané možnosti se týkají celkové rovnováhy.' },
  { id: 'v-bod', book: 5, q: 'Který popis bodu všeobecné rovnováhy je správný?', options: ['Leží na hranici produkčních možností a spotřebitelé si vyrobené množství dělí v bodě smluvní křivky směny, kde MRS = MRPT.', 'Leží uvnitř hranice produkčních možností.', 'Leží mimo smluvní křivku směny.', 'Nemusí splňovat žádnou z podmínek efektivnosti.'], right: 'a', why: 'Efektivní výroba znamená bod na PPF, efektivní rozdělení bod na smluvní křivce směny, a výrobně-spotřební efektivnost pak spojuje obě podmínky (MRS = MRPT). Cvičebnice nabízí formulaci „nebo“, ale všechny tři podmínky platí současně.' },
  { id: 'v-zlepseni', q: 'Změna alokace je Paretovým zlepšením, jestliže:', options: ['si polepší většina účastníků', 'si nikdo nepohorší a aspoň jeden polepší', 'se zvýší součet užitků všech', 'se vyrovnají užitky všech'], right: 'b', why: 'Paretovo kritérium nepřipouští újmu nikomu. Zlepšení většiny na úkor menšiny nebo růst součtu užitků je jiné kritérium.' },
  { id: 'v-cs', q: 'Která plocha v grafu trhu vyjadřuje spotřebitelský přebytek v rovnováze?', options: ['Plocha pod poptávkou a nad rovnovážnou cenou', 'Plocha pod nabídkou a nad rovnovážnou cenou', 'Plocha pod rovnovážnou cenou a nad nabídkou', 'Plocha pod poptávkou do rovnovážného množství'], right: 'a', why: 'Spotřebitelský přebytek je rozdíl mezi ochotou platit a skutečnou cenou: leží pod poptávkou a nad cenou. Plocha pod cenou a nad nabídkou je výrobcův přebytek.' },
  { id: 'v-mz', q: 'Co v grafu představuje mrtvou ztrátu při cenovém stropu pod rovnovážnou cenou?', options: ['Obdélník mezi stropem a rovnovážnou cenou', 'Trojúhelník mezi poptávkou a nabídkou od regulovaného do rovnovážného množství', 'Plochu pod nabídkou do regulovaného množství', 'Úsečku mezi množstvím poptávaným a nabízeným při regulované ceně'], right: 'b', why: 'Mrtvá ztráta jsou neuskutečněné výhodné obchody: leží mezi křivkami od omezeného množství k rovnovážnému. Úsečka mezi poptávaným a nabízeným množstvím je nedostatek, to je množství, nikoli ztráta přebytku.' },
];

function buildVyber({ id }) {
  const it = PICKS.find((x) => x.id === id) ?? PICKS[0];
  const letters = 'abcde';
  const options = it.options.map((text, i) => ({ id: letters[i], text }));
  return mk('vyber', {
    data: { id },
    source: it.book ? { chapter: 11, number: it.book } : undefined,
    task: it.q,
    answerSpec: { kind: 'choice', value: it.right, options },
    conclusion: `Správně je ${it.right}). ${it.why}`,
    solution: [
      { title: 'Pojem v otázce', text: 'Najdeme pojem, na který se otázka ptá, a vybavíme si jeho definici nebo graf.', board: [line('\\text{pojem}\\ \\Rightarrow\\ \\text{definice}')] },
      { title: 'Zdůvodnění', text: it.why, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Závěr', text: `Správná odpověď je ${it.right}).`, board: [result(`\\text{${it.right})}`)] },
    ],
  });
}

// ---------- typ: pravda, nebo nepravda ----------
// kn-a až kn-i: úkoly ano/ne z cvičebnice kap. 11 (úkol j o konfliktu efektivnosti a spravedlnosti je přepracovaný, viz own-1 a own-15);
// kn6-: úkoly z kap. 6 o přebytcích.
const STATEMENTS = [
  { id: 'kn-a', text: 'Pro dosažení celkové rovnováhy je nutná rovnost společné mezní míry substituce (MRS) a mezní míry transformace produktu (MRPT).', truth: true, why: 'Tak zní výrobně-spotřební podmínka: MRS = MRPT.' },
  { id: 'kn-b', text: 'Na smluvní křivce směny jsou sklony indiferenčních křivek obou spotřebitelů shodné.', truth: true, why: 'Body smluvní křivky jsou body dotyku indiferenčních křivek, tedy mají společnou tečnu a stejnou MRS. (Platí pro vnitřní body při hladkých, konvexních preferencích.)' },
  { id: 'kn-c', text: 'Předpoklad dokonalé konkurence na trhu práce není pro model 2x2x2 nezbytný.', truth: false, why: 'V modelu jsou všechny trhy dokonale konkurenční, včetně trhu výrobních faktorů, a výsledky efektivity na tomto předpokladu stojí.' },
  { id: 'kn-d', text: 'Alokace je efektivní tehdy, pokud není možné zvýšit užitek jednoho subjektu, aniž by se současně snížil užitek druhého.', truth: true, why: 'To je definice Paretovy efektivnosti.' },
  { id: 'kn-e', text: 'MRPT vyjadřuje, o kolik se musí zvýšit výroba jednoho statku, aby se mohla vyrobit dodatečná jednotka statku druhého.', truth: false, why: 'Výroba prvního statku se musí snížit (obětovat), aby se uvolněné zdroje daly použít na další jednotku druhého.' },
  { id: 'kn-f', text: 'Fixní množství zdrojů je v ekonomice rozděleno neefektivně tehdy, jestliže není možné vyrobit více jednoho statku, aniž by se omezila výroba druhého.', truth: false, why: 'Takto se definuje efektivní rozdělení. Neefektivní je, když lze vyrobit víc jednoho statku bez újmy druhému.' },
  { id: 'kn-g', text: 'Analýzu dílčí rovnováhy je možné provést tehdy, pokud se změny cen na jednom trhu neodrážejí na změnách cen na jiných trzích.', truth: true, why: 'Dílčí analýza předpokládá, že vazby na ostatní trhy jsou zanedbatelné a ceny jinde jsou neměnné.' },
  { id: 'kn-h', text: 'Výrobně-spotřební efektivnosti je dosaženo tehdy, když se mezní míra substituce spotřebitelů rovná poměru mezních nákladů obou statků.', truth: true, why: 'Poměr mezních nákladů je MRPT, a podmínka je tedy MRS = MRPT. Při dokonalé konkurenci se rovná i poměru cen.' },
  { id: 'kn-i', text: 'Smluvní křivka výroby představuje všechny efektivní alokace práce a kapitálu mezi výrobu dvou statků.', truth: true, why: 'Jsou to body dotyku izokvant obou statků, v nichž jsou MRTS stejné.' },
  { id: 'kn6-o', text: 'Spotřebitelský přebytek z poslední kupované jednotky je v rovnováze roven nule.', truth: true, why: 'U poslední jednotky se mezní užitek rovná ceně, a rozdíl, tedy přebytek z této jednotky, je nulový. Přebytek vzniká u předchozích jednotek.' },
  { id: 'kn6-p', text: 'Je-li mezní užitek statku větší než mezní náklady jeho výroby, je statku vyrobeno málo a efektivnost lze zvýšit přesunem zdrojů do jeho výroby.', truth: true, why: 'Další jednotka přinese víc užitku, než stojí výroba. Celkový přebytek roste, dokud se oba nevyrovnají.' },
  { id: 'kn6-r', text: 'Přebytek spotřebitele je vždy větší než přebytek výrobce.', truth: false, why: 'Záleží na sklonech křivek. Strmější poptávka dává větší spotřebitelský přebytek a strmější nabídka větší výrobcův. Bez čísel nelze říct, který je větší.' },
  { id: 'own-1', text: 'Paretova efektivnost zaručuje spravedlivé rozdělení statků.', truth: false, why: 'Efektivnost o spravedlnosti nic neříká. Spravedlnost je hodnotové hledisko a má několik různých kritérií.' },
  { id: 'own-2', text: 'Rozdělení, ve kterém jeden spotřebitel dostane všechno zboží a druhý nic, může být Paretovsky efektivní.', truth: true, why: 'Kdyby se něco přerozdělilo, druhý by si polepšil jen na úkor prvního. Takový bod je krajním bodem smluvní křivky.' },
  { id: 'own-3', text: 'Každé Paretovo zlepšení zvyšuje užitek všech zúčastněných.', truth: false, why: 'Stačí, aby si aspoň jeden polepšil a nikdo nepohoršil. Někdo může zůstat na stejné úrovni.' },
  { id: 'own-4', text: 'Mrtvá ztráta vzniká proto, že se neuskuteční některé obchody, které by byly výhodné pro obě strany.', truth: true, why: 'Kupující by zaplatil víc, než kolik prodávající potřebuje, ale zásah (strop, daň, monopol) obchod znemožní.' },
  { id: 'own-5', text: 'Daň z jednotky na trhu bez externalit snižuje součet přebytku spotřebitelů, přebytku výrobců a daňového výnosu.', truth: true, why: 'Část původního celkového přebytku zmizí jako mrtvá ztráta, i když stát celý výnos užitečně využije.' },
  { id: 'own-6', text: 'Cenový strop pod rovnovážnou cenou zvyšuje celkový společenský přebytek, protože kupující platí méně.', truth: false, why: 'Nižší cena přesouvá přebytek od výrobců ke kupujícím, ale obchoduje se méně. Celkový přebytek klesá o mrtvou ztrátu.' },
  { id: 'own-7', text: 'V dokonale konkurenční rovnováze bez externalit je celkový přebytek největší možný.', truth: true, why: 'V rovnováze se cena z poptávky rovná ceně z nabídky. Každý výhodný obchod se uskuteční a žádný ztrátový ne.' },
  { id: 'own-8', text: 'Tržní efektivnost platí i tehdy, když výroba poškozuje třetí osoby, které se trhu neúčastní.', truth: false, why: 'Při externalitách trh nezahrnuje všechny náklady a efektivnost neplatí. To je jedno z tržních selhání.' },
  { id: 'own-9', text: 'Výrobcův přebytek je totéž co zisk firmy.', truth: false, why: 'Výrobcův přebytek je tržby minus variabilní náklady, tedy zisk plus fixní náklady (v krátkém období).' },
  { id: 'own-10', text: 'Spotřebitelský přebytek se při nezměněné poptávce zvětší, když cena klesne.', truth: true, why: 'Plocha pod poptávkou a nad cenou je při nižší ceně větší (kupující platí méně a koupí víc).' },
  { id: 'own-11', text: 'Mrtvá ztráta daně je tím větší, čím méně pružné (méně elastické) jsou poptávka a nabídka.', truth: false, why: 'Je to obráceně: když je poptávka nebo nabídka málo pružná, daň změní množství jen málo a mrtvá ztráta je malá. Při velké pružnosti se množství výrazně sníží.' },
  { id: 'own-12', text: 'Celková rovnováha znamená, že rovnováha je dosažena na jednom trhu, zatímco ostatní trhy se mohou měnit.', truth: false, why: 'Celková rovnováha vyžaduje rovnováhu na všech trzích současně.' },
  { id: 'own-13', text: 'Při Paretově efektivní alokaci v Edgeworthově diagramu směny jsou mezní míry substituce obou spotřebitelů shodné (u vnitřních bodů).', truth: true, why: 'Kdyby se lišily, výměna by prospěla oběma a alokace by nebyla efektivní.' },
  { id: 'own-14', text: 'Dokonale konkurenční rovnováha je efektivní, i když na trhu existuje monopol.', truth: false, why: 'Monopol (tržní síla) porušuje předpoklady a vede k mrtvé ztrátě.' },
  { id: 'own-15', text: 'Opatření, které zvýší efektivnost, vždy zvýší i spravedlnost.', truth: false, why: 'Vztah není pevný. Opatření může zvýšit celkový přebytek, ale rozdělit ho nerovnoměrně. Efektivnost a spravedlnost se někdy dostávají do rozporu a někdy ne.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];

function buildAnoNe({ id }) {
  const s = stmtById(id);
  const kn = id.startsWith('kn');
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: kn ? { chapter: id.startsWith('kn6') ? 6 : 11, number: `C-${id.split('-')[1]}` } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a najdeme pojem, na kterém stojí. U tvrzení s „vždy“ nebo „všechny“ stačí jedna výjimka k tomu, aby bylo nepravdivé.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- Edgeworthův diagram jako graf (identické preference U = x·y) ----------
// A má počátek vlevo dole, B vpravo nahoře. Bod dotyku v x0: y0 = Y·x0/X, uA = x0·y0, uB = (X − x0)(Y − y0).
function edgeViz({ X, Y, xs }) {
  const curves = []; const points = [];
  xs.forEach((x0, i) => {
    const y0 = (Y * x0) / X; const uA = x0 * y0; const uB = (X - x0) * (Y - y0);
    curves.push({ expr: `${lit(uA)}/x`, domain: [uA / Y + 1e-6, X], label: `IA${i + 1}`, color: 'blue' });
    curves.push({ expr: `${lit(Y)} - ${lit(uB)}/(${lit(X)} - x)`, domain: [0, X - uB / Y - 1e-6], label: `IB${i + 1}`, color: 'green' });
    points.push({ x: x0, y: y0, label: i === 0 ? 'M' : 'N' });
  });
  curves.push({ expr: `${lit(Y / X)}*x`, domain: [0, X], label: 'w', color: 'accent' });
  return { kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, X], range: [0, Y], curves, points, arrows: [], areas: [], alt: 'Edgeworthův diagram směny se smluvní křivkou' } };
}

function buildGrafSmluvni({ X, Y, x0, x1 }) {
  const xs = [x0, x1];
  const y0 = r6((Y * x0) / X); const y1 = r6((Y * x1) / X);
  return mk('graf-smluvni', {
    part: 'zkouska',
    data: { X, Y, x0, x1 },
    task: `Nakreslete Edgeworthův diagram (krabicové schéma) směny dvou spotřebitelů, A a B, se stejnými preferencemi $U=xy$. Statku X je ${X} kusů a statku Y ${Y} kusů. Spotřebitel A má počátek vlevo dole, B vpravo nahoře. Zakreslete indiferenční křivky obou spotřebitelů v bodech dotyku M (A má ${x0} kusů X) a N (A má ${x1} kusů X) a smluvní křivku směny.`,
    answerSpec: { kind: 'whiteboard', reference: edgeViz({ X, Y, xs }) },
    conclusion: 'Smluvní křivka spojuje body dotyku indiferenčních křivek A a B. Při stejných preferencích je to úhlopříčka krabice.',
    solution: [
      { title: 'Krabice', text: `Krabice má šířku ${X} (celkové množství statku X) a výšku ${Y} (celkové množství statku Y). Počátek spotřebitele A je vlevo dole, počátek spotřebitele B (otočená mapa) vpravo nahoře. Každý bod uvnitř je jedno rozdělení obou statků.`,
        board: [line(`O_A=(0;\\ 0),\\quad O_B=(${cz(X)};\\ ${cz(Y)})`)] },
      { title: 'Body dotyku a křivky', text: `Pro spotřebitele A platí $y_A=u_A/x$, pro B (měřeno od jeho počátku) $y_B=u_B/x_B$. V bodě M je $x_A=${czText(x0)}$, $y_A=${czText(y0)}$, v bodě N $x_A=${czText(x1)}$, $y_A=${czText(y1)}$. V obou bodech se křivky A a B dotýkají a mají stejnou MRS.`,
        board: [line(`M=(${cz(x0)};\\ ${cz(y0)}),\\quad N=(${cz(x1)};\\ ${cz(y1)})`), line('MRS_A=MRS_B')] },
      { title: 'Hotový diagram', text: 'Smluvní křivka w spojuje všechny body dotyku (při stejných preferencích je to úhlopříčka). Každý její bod je Paretovsky efektivní. Body mimo ni nejsou efektivní, protože z nich lze přejít na bod křivky tak, že si aspoň jeden spotřebitel polepší a druhý nepohorší.', viz: edgeViz({ X, Y, xs }) },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function buildGrafPrebytky({ A, B, C, D }) {
  const { Q, P } = eqInv({ A, B, C, D });
  const full = invViz({ A, B, C, D }, { areas: [csArea({ A, B }, P, Q), psArea({ C, D }, P, Q)], alt: 'Spotřebitelský a výrobcův přebytek' });
  return mk('graf-prebytky', {
    part: 'zkouska',
    data: { A, B, C, D },
    task: 'Nakreslete do grafu křivky poptávky a nabídky, vyznačte rovnováhu E a vyšrafujte spotřebitelský přebytek CS a výrobcův přebytek PS.',
    answerSpec: { kind: 'whiteboard', reference: full },
    conclusion: 'CS je plocha pod poptávkou a nad rovnovážnou cenou, PS plocha nad nabídkou a pod cenou, obě do rovnovážného množství.',
    solution: [
      { title: 'Rovnováha', text: 'Nakreslíme osy (cena P svisle, množství Q vodorovně), klesající poptávku, rostoucí nabídku a jejich průsečík E s čárkovanými čarami k osám.', viz: invViz({ A, B, C, D }) },
      { title: 'Spotřebitelský přebytek', text: 'Je to trojúhelník mezi osou ceny, poptávkou a vodorovnou čárou rovnovážné ceny. Kupující by platili víc, než platí.', board: [line('CS:\\ \\text{pod }D,\\ \\text{nad }P_E')] },
      { title: 'Výrobcův přebytek a celek', text: 'Výrobcův přebytek je trojúhelník mezi nabídkou a rovnovážnou cenou. Oba trojúhelníky se dotýkají v bodě rovnováhy a dohromady tvoří celkový přebytek mezi křivkami.', viz: full },
    ],
  });
}

function buildGrafMrtvaDan({ A, B, C, D, t }) {
  const { Q, P } = eqInv({ A, B, C, D });
  const Qt = r6((A - C - t) / (B + D)); const pk = r6(A - B * Qt); const pp = r6(pk - t);
  const full = invViz({ A, B, C, D }, {
    curves: [{ expr: sE(C + t, D), label: 'S+t', color: 'accent', dashed: true }],
    points: [{ x: Q, y: P, label: 'E' }, { x: Qt, y: pk, label: 'Et' }],
    areas: [{ between: [dE(A, B), sE(C, D)], from: Qt, to: Q, label: 'MZ', color: 'warn' }, { between: [lit(pk), lit(pp)], from: 0, to: Qt, label: 'daň', color: 'green' }],
    alt: 'Daň z jednotky, výnos a mrtvá ztráta',
  });
  return mk('graf-mrtva-dan', {
    part: 'zkouska',
    data: { A, B, C, D, t },
    task: `Nakreslete trh s poptávkou D a nabídkou S. Stát zavede daň ${czText(t)} Kč z každého kusu. Zakreslete novou nabídku S+t, novou rovnováhu Et, cenu kupujících a prodávajících, výnos daně a mrtvou ztrátu.`,
    answerSpec: { kind: 'whiteboard', reference: full },
    conclusion: 'Daň posune nabídku nahoru o t, množství klesne, mezi cenou kupujících a prodávajících vznikne klín t. Obdélník je výnos státu, trojúhelník mrtvá ztráta.',
    solution: [
      { title: 'Výchozí trh', text: 'Nakreslíme D, S a rovnováhu E.', viz: invViz({ A, B, C, D }) },
      { title: 'Nová nabídka a rovnováha', text: `Daň z jednotky posune nabídku svisle nahoru o ${czText(t)}. Nová rovnováha Et je v průsečíku D a S+t. Množství klesne z ${czText(Q)} na ${czText(Qt)}, kupující platí ${czText(pk)}, prodávající dostanou ${czText(pp)}.`, board: [line(`P_K-P_P=${cz(pk)}-${cz(pp)}=${cz(t)}`)] },
      { title: 'Výnos a mrtvá ztráta', text: 'Výnos je obdélník o výšce t (klín mezi cenami) a šířce $Q_t$. Mrtvá ztráta je trojúhelník mezi poptávkou a původní nabídkou od $Q_t$ do $Q_E$.', viz: full },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const genGrafPrebytky = (rng) => { const p = genPrebytky(rng).data; return buildGrafPrebytky(p); };
const genGrafDan = (rng) => { const p = genMrtvaDan(rng).data; return buildGrafMrtvaDan(p); };
const genGrafSmluvni = (rng) => {
  const X = pick(rng, [8, 10, 12]); const Y = pick(rng, [6, 8, 10]);
  const x0 = int(rng, 2, Math.floor(X / 2) - 1);
  return buildGrafSmluvni({ X, Y, x0, x1: x0 + int(rng, 2, 4) });
};

const types = [
  type('prebytky', 'Přebytky z rovnic P = A − BQ', genPrebytky, buildPrebytky),
  type('prebytky-qp', 'Přebytky z rovnic Q = a − bP', genPrebytkyQP, buildPrebytkyQP),
  type('mrtva-regulace', 'Mrtvá ztráta při stropu nebo prahu', genMrtvaReg, buildMrtvaReg),
  type('mrtva-dan', 'Daň z jednotky: výnos a mrtvá ztráta', genMrtvaDan, buildMrtvaDan),
  type('mrtva-monopol', 'Mrtvá ztráta monopolu', genMrtvaMonopol, buildMrtvaMonopol),
  type('max-prebytek', 'Kdy je celkový přebytek největší?', genMaxPrebytek, buildMaxPrebytek),
  type('dva-trhy', 'Dílčí a celková rovnováha: dva provázané trhy', genDvaTrhy, buildDvaTrhy),
  type('pareto-alokace', 'Je alokace Paretovsky efektivní?', genParetoAlokace, buildParetoAlokace),
  type('pareto-vymena', 'Paretovo zlepšení při výměně', genParetoVymena, buildParetoVymena),
  type('smluvni-krivka', 'Smluvní křivka směny', genSmluvni, buildSmluvni),
  type('mrs-mrpt', 'MRS a MRPT: výrobně-spotřební efektivnost', genMrsMrpt, buildMrsMrpt),
  type('mrpt', 'MRPT z hranice produkčních možností', genMrpt, buildMrpt),
  type('podminky', 'Podmínky efektivnosti', (rng) => bankBuilder('podminky', 'zapocet', COND)({ id: pick(rng, ids(COND)), order: shuffle(rng, [0, 1, 2, 3]) }), bankBuilder('podminky', 'zapocet', COND)),
  type('vyber', 'Výběr z možností', (rng) => buildVyber({ id: pick(rng, ids(PICKS)) }), buildVyber),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => bankBuilder('definice', 'zkouska', DEFS)({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), bankBuilder('definice', 'zkouska', DEFS)),
  type('graf-prebytky', 'Nakresli přebytky v rovnováze (zkouška)', genGrafPrebytky, buildGrafPrebytky),
  type('graf-mrtva-dan', 'Nakresli daň a mrtvou ztrátu (zkouška)', genGrafDan, buildGrafMrtvaDan),
  type('graf-smluvni', 'Nakresli smluvní křivku (zkouška)', genGrafSmluvni, buildGrafSmluvni),
];

// ---------- výklad ----------
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 100], range: [0, 60], curves, ...extra } });
const DD = { expr: '50 - x/2', label: 'D', color: 'blue' };
const SS = { expr: '10 + x/2', label: 'S', color: 'chalk' };

const theory = [
  { heading: 'Dílčí a celková rovnováha', term: 'Celková (všeobecná) rovnováha',
    text: 'Dosud jsme každý trh zkoumali zvlášť. Křivky poptávky a nabídky jsme kreslili za předpokladu, že se ceny na ostatních trzích nemění. Tomu se říká analýza dílčí rovnováhy. Je to užitečné zjednodušení, které funguje dobře u trhů, jež jsou vůči zbytku ekonomiky malé.\n\nTrhy ale spolu souvisejí: zdražení ropy zvýší náklady dopravy, a tím ovlivní ceny mnoha dalších statků. Analýza celkové (všeobecné) rovnováhy proto zkoumá všechny trhy najednou a hledá ceny, při kterých je ve vzájemné rovnováze každý z nich.\n\nKdyž jsou statky provázané (substituty, komplementy), cena jednoho vstupuje do poptávky po druhém. Rovnováhu pak hledáme jako řešení soustavy rovnic.\n\nPodle Walrasova zákona je součet hodnot převisů poptávky přes všechny trhy (včetně trhu peněz) nulový, pokud všichni dodržují rozpočtová omezení. Je-li tedy v rovnováze všech trhů kromě jednoho, musí být v rovnováze i ten poslední.',
    mistakes: ['Dílčí analýza není chybná, jen předpokládá neměnné ceny jinde. U velkých trhů a silně provázaných statků je zavádějící.', 'Celková rovnováha neznamená, že se „všechno rovná všemu“. Znamená, že na všech trzích je současně poptávané množství rovno nabízenému.'] },
  { heading: 'Model jednoduché ekonomiky 2x2x2', term: 'Model 2x2x2',
    text: 'Skutečná ekonomika má miliony trhů. Abychom pochopili obecné zákonitosti, používáme zjednodušený model: dva spotřebitelé (A a B), dva statky (X a Y) a dva výrobní faktory (práce L a kapitál K). Ekonomika je uzavřená (bez zahraničního obchodu), všechny trhy jsou dokonale konkurenční a subjekty mají dokonalé informace. Spotřebitelé maximalizují užitek, firmy zisk.\n\nTrhy jsou v modelu čtyři: dva trhy statků (X a Y) a dva trhy výrobních faktorů (práce a kapitál). Spotřebitelé jsou účastníci trhů, nikoli trhy.\n\nCelková rovnováha v modelu vyžaduje tři podmínky efektivnosti současně: efektivnost ve směně, efektivnost ve výrobě a výrobně-spotřební efektivnost. Závěry modelu platí obecněji, i pro libovolný počet statků, faktorů a spotřebitelů.',
    mistakes: ['Čísla 2x2x2 neříkají „dva trhy, dvě ceny, dvě daně“, ale dva spotřebitele, dva statky a dva výrobní faktory.', 'Podmínka dokonalé konkurence se týká i trhu práce a kapitálu, nikoli jen trhů statků.'] },
  { heading: 'Paretova efektivnost a Paretovo zlepšení', term: 'Paretova efektivnost',
    text: 'Ekonomové popisují, zda jsou zdroje využity dobře, pojmem Paretova efektivnost (podle Vilfreda Pareta). Alokace (rozdělení statků nebo zdrojů) je Paretovsky efektivní, když nelze zvýšit užitek jednoho subjektu, aniž by se současně snížil užitek jiného. Jinak je neefektivní.\n\nZměna alokace, při které si aspoň jeden subjekt polepší a nikdo si nepohorší, se nazývá Paretovo zlepšení. Z neefektivní alokace je vždy nějaké Paretovo zlepšení možné. Z efektivní alokace už žádné možné není.\n\nPareto je přísné kritérium: nepřipouští, aby si někdo pohoršil, i kdyby ostatním výrazně prospělo. A je to kritérium efektivnosti, nikoli spravedlnosti: rozdělení, ve kterém má jeden spotřebitel skoro všechno, může být Paretovsky efektivní.',
    mistakes: ['Paretovo zlepšení neznamená, že si polepšili všichni. Stačí, aby si nikdo nepohoršil a aspoň jeden polepšil.', 'Efektivní neznamená „rovnoměrné“ ani „spravedlivé“.'] },
  { heading: 'Efektivnost ve směně a smluvní křivka směny', term: 'Smluvní křivka směny',
    text: 'Máme pevné množství dvou statků a dva spotřebitele. Efektivnost ve směně znamená, že žádná další výměna nemůže jednomu spotřebiteli prospět bez újmy druhému.\n\nSpotřebitelé se liší mezní mírou substituce (MRS): tím, kolik jednotek Y je spotřebitel ochoten vzdát za jednu další jednotku X při stejném užitku. Má-li spotřebitel A $MRS=2$ a spotřebitel B $MRS=1$, cení si A statku X víc. Když dá B jednu jednotku X a dostane např. 1,5 jednotky Y, polepší si oba: A zaplatí méně, než byl ochoten, a B dostane víc, než chtěl. Výměna je výhodná, dokud se MRS liší.\n\nEdgeworthův diagram (krabicové schéma) vznikne tak, že mapu indiferenčních křivek spotřebitele B otočíme o 180° a přiložíme k mapě spotřebitele A. Každý bod uvnitř krabice je jedno rozdělení obou statků. Efektivní jsou body, v nichž se indiferenční křivky obou dotýkají. Spojnice těchto bodů je smluvní křivka směny.\n\nPokud začínáme z bodu mimo smluvní křivku, dobrovolná směna skončí v bodě na smluvní křivce mezi křivkami užitku, které procházejí výchozím bodem. Z kterého bodu smluvní křivky nakonec vyjdeme, závisí na vyjednávání.',
    tex: 'MRS_A=MRS_B\\quad\\left(\\frac{MU_X}{MU_Y}\\right)_A=\\left(\\frac{MU_X}{MU_Y}\\right)_B',
    viz: edgeViz({ X: 10, Y: 10, xs: [4, 6] }),
    mistakes: ['Efektivní jsou jen body dotyku indiferenčních křivek, ne všechny body krabice.', 'Všechny body smluvní křivky jsou efektivní, ale nejsou stejně spravedlivé. Efektivnost nevybírá mezi nimi.'] },
  { heading: 'Efektivnost ve výrobě, hranice produkčních možností a MRPT', term: 'Efektivnost ve výrobě',
    text: 'Ve výrobě se rozděluje pevné množství práce a kapitálu mezi výrobu statků X a Y. Efektivní rozdělení je takové, kdy nelze vyrobit víc jednoho statku, aniž by se musela snížit výroba druhého. Rozhoduje mezní míra technické substituce (MRTS): poměr, v jakém lze nahradit jeden faktor druhým při stejném výstupu. Efektivní je stav, kdy je MRTS stejná u obou statků.\n\nStejně jako ve směně nakreslíme Edgeworthův diagram (krabicové schéma výroby) s izokvantami obou statků. Body dotyku izokvant tvoří smluvní křivku výroby.\n\nPřeneseme-li body smluvní křivky výroby do grafu množství X a Y, dostaneme hranici produkčních možností (PPF). Body na ní jsou efektivní výrobní kombinace, body pod ní jsou dosažitelné, ale neefektivní, a body nad ní nedosažitelné. Sklon PPF je mezní míra transformace produktu (MRPT): kolik jednotek jednoho statku musíme obětovat, abychom vyrobili jednu další jednotku druhého.',
    tex: 'MRTS_X=MRTS_Y,\\qquad MRPT=\\left|\\frac{\\Delta Y}{\\Delta X}\\right|',
    viz: { kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, 10], range: [0, 100], curves: [{ expr: '100 - x^2', label: 'PPF', color: 'blue' }], points: [{ x: 6, y: 64, label: 'A' }, { x: 7, y: 51, label: 'B' }, { x: 4, y: 40, label: 'C' }], arrows: [], areas: [], alt: 'Hranice produkčních možností: body na křivce a pod ní' } },
    mistakes: ['MRPT je počet jednotek, které se musí snížit (obětovat), ne zvýšit.', 'Bod pod PPF (např. C) je neefektivní: z téhož množství zdrojů lze vyrobit víc obou statků.'] },
  { heading: 'Výrobně-spotřební efektivnost', term: 'Výrobně-spotřební efektivnost',
    text: 'Efektivní výroba a efektivní směna samy o sobě nestačí. Vyrobená kombinace statků musí odpovídat tomu, co spotřebitelé chtějí. Společnost může přesunout zdroje z Y do X, jen když to vyplatí: jedna další jednotka X stojí ve výrobě MRPT jednotek Y a spotřebitelé si ji cení na MRS jednotek Y.\n\nJe-li $MRS>MRPT$, je X cennější než jeho náklad a výrobu X zvýšíme. Je-li $MRS<MRPT$, je tomu naopak. Výrobně-spotřební efektivnost nastane, když se obě hodnoty rovnají. Při dokonalé konkurenci k tomu dochází samo: spotřebitelé srovnávají MRS s poměrem cen, firmy srovnávají cenu s mezními náklady, a MRS se proto rovná MRPT.\n\nCelková rovnováha v modelu 2x2x2 tedy vyžaduje tři podmínky: $MRS_A=MRS_B$ (směna), $MRTS_X=MRTS_Y$ (výroba), $MRS=MRPT$ (výrobně-spotřební efektivnost).',
    tex: 'MRS_A=MRS_B=MRPT=\\frac{MC_X}{MC_Y}=\\frac{P_X}{P_Y}',
    mistakes: ['Mezní míra substituce je spotřebitelova hodnota statku, MRPT náklad společnosti. Nezaměňujte, kdo je který.', 'Rovnost MRS a MRPT neurčuje jednoznačně, kolik kdo dostane. Odpovídá efektivní kombinaci, ne spravedlivému rozdělení.'] },
  { heading: 'Přebytek spotřebitele a přebytek výrobce', term: 'Spotřebitelský přebytek',
    text: 'Křivka poptávky ukazuje, kolik by kupující nejvýš zaplatili za další kus. Platí-li všichni jednu tržní cenu, má každý kupující, který by byl ochoten zaplatit víc, výhodu: ušetří. Součet těchto úspor je spotřebitelský přebytek (CS). V grafu je to plocha pod poptávkou a nad cenou.\n\nKřivka nabídky ukazuje, za kolik by byli výrobci nejméně ochotni další kus prodat (mezní náklad). Výrobci, kteří by prodali i za nižší cenu, mají výhodu: výrobcův přebytek (PS). V grafu je to plocha nad nabídkou a pod cenou. Není to totéž co zisk: je to tržby minus variabilní náklady, tedy zisk plus fixní náklady.\n\nU lineárních křivek jsou přebytky trojúhelníky: základna je rovnovážné množství a výška rozdíl mezi nejvyšší cenou, kterou by někdo zaplatil (průsečík poptávky s osou ceny), a rovnovážnou cenou (u CS), případně mezi rovnovážnou cenou a nejnižší cenou nabídky (u PS). Přebytek vyjadřuje peněžní užitek přesně jen tehdy, když je důchodový efekt zanedbatelný (kvazilineární užitek, malý podíl výdajů na statek). Jinak je to dobrá aproximace.',
    tex: 'CS=\\frac12\\,Q_E\\,(P_{max}-P_E),\\qquad PS=\\frac12\\,Q_E\\,(P_E-P_{min})',
    viz: view([DD, SS], { points: [{ x: 40, y: 30, label: 'E', guides: true }], areas: [{ between: ['50 - x/2', '30'], from: 0, to: 40, label: 'CS', color: 'green' }, { between: ['30', '10 + x/2'], from: 0, to: 40, label: 'PS', color: 'accent' }] }),
    mistakes: ['Spotřebitelský přebytek není to, kolik kupující zaplatí, ale kolik ušetří oproti tomu, co by zaplatit byl ochoten.', 'Přebytek spotřebitele není automaticky větší než přebytek výrobce. Záleží na sklonech křivek.'] },
  { heading: 'Celkový společenský přebytek a tržní efektivnost', term: 'Tržní efektivnost',
    text: 'Celkový společenský přebytek je součet spotřebitelského a výrobcova přebytku: $TS=CS+PS$. Je to plocha mezi křivkou poptávky a křivkou nabídky do obchodovaného množství. Každý kus přidá rozdíl mezi tím, kolik si ho kupující cení, a tím, kolik stojí jeho výroba. Dokud je první větší než druhé, je výhodné vyrábět dál.\n\nCelkový přebytek je proto největší v bodě, kde se obě hodnoty rovnají: v rovnováze. To platí v dílčí analýze jednoho trhu bez důchodových efektů. Říká se tomu tržní efektivnost: nelze vyrobit nic navíc, co by přineslo víc užitku než nákladů.\n\nSoučet přebytků a Paretova efektivnost nejsou totéž. Obecnější tvrzení, že dokonale konkurenční všeobecná rovnováha je Paretovsky efektivní (nelze nikomu pomoci bez újmy druhému), je první teorém blahobytu.\n\nTvrzení platí za předpokladů: dokonalá konkurence (nikdo nemá tržní sílu), žádné externality (výroba ani spotřeba nepoškozuje třetí osoby), žádné veřejné statky, dokonalé informace, úplné trhy a nulové transakční náklady. Jestliže předpoklady neplatí, mluvíme o tržním selhání a trh efektivní výsledek sám nezajistí. Efektivnost je také nezávislá na tom, kdo dostane přebytek: určuje, jak velký „koláč“ je, ne jak se dělí.',
    tex: 'TS=CS+PS=\\int_0^{Q}\\bigl(P_D(q)-P_S(q)\\bigr)\\,dq',
    mistakes: ['Tržní efektivnost neplatí bez podmínek. Při externalitách, monopolu nebo asymetrických informacích je trh neefektivní.', 'Efektivní rovnováha může být velmi nerovná. Neříká nic o spravedlnosti.'] },
  { heading: 'Mrtvá ztráta', term: 'Mrtvá ztráta',
    text: 'Mrtvá ztráta je ztráta celkového přebytku z výhodných obchodů, které se neuskuteční. Vzniká, když se obchoduje jiné než efektivní množství: u daně, stropu, prahu a monopolu méně, u negativní externality nebo dotace více. V tomto výkladu se soustředíme na případy, kdy se obchoduje méně. Příčiny mohou být: cenový strop nebo práh (obchoduje se na kratší straně trhu), daň z jednotky (klín mezi cenou kupujících a prodávajících) a tržní síla (monopol vyrábí méně než konkurence).\n\nV grafu je to trojúhelník mezi poptávkou a nabídkou od skutečného množství k rovnovážnému. Jeho výška je rozdíl mezi tím, co by kupující zaplatili, a tím, co by prodávající potřebovali, a základna je počet neuskutečněných obchodů.\n\nU daně $t$ z jednotky klesne množství o $\\Delta Q$ a mrtvá ztráta je $\\tfrac12\\,t\\,\\Delta Q$. Je tím větší, čím pružnější jsou poptávka a nabídka (a roste přibližně s druhou mocninou daně). Výnos daně pro stát je obdélník $t\\cdot Q_t$ a mrtvá ztráta k němu přistupuje navíc. U stropu nebo prahu je velikost mrtvé ztráty minimální (při nejlepším přidělení). Jiné přidělení, třeba fronta, ji zvětší.',
    tex: 'MZ=\\frac12\\,t\\,(Q_E-Q_t)',
    viz: view([DD, SS, { expr: '20 + x/2', label: 'S+t', color: 'accent', dashed: true }], { points: [{ x: 40, y: 30, label: 'E' }, { x: 30, y: 35, label: 'Et' }], areas: [{ between: ['50 - x/2', '10 + x/2'], from: 30, to: 40, label: 'MZ', color: 'warn' }, { between: ['35', '25'], from: 0, to: 30, label: 'daň', color: 'green' }] }),
    mistakes: ['Mrtvá ztráta není výnos státu, ten je jiná plocha (obdélník). Je to to, co zmizí a nikdo to nezíská.', 'Nezaměňte nedostatek (rozdíl množství $Q_D-Q_S$ při regulované ceně) s mrtvou ztrátou (plocha, tedy ztráta přebytku).', 'Daň nese formálně prodávající, ale skutečné břímě se dělí podle sklonů křivek. Mrtvá ztráta na tom nezávisí.'] },
  { heading: 'Efektivnost a spravedlnost', term: 'Spravedlnost',
    text: 'Efektivní alokace je taková, ve které nelze nikomu pomoci bez újmy druhému. Spravedlivá alokace je taková, která odpovídá představě o tom, jak mají být příjmy a bohatství rozdělené. Spravedlnost je hodnotové hledisko, a existuje víc kritérií: rovnostářské (rozdělit rovným dílem), podle zásluh nebo příspěvku (tržní odměna), utilitaristické (co největší součet užitků) a Rawlsovo (zlepšit postavení těch nejhůř postavených).\n\nPareto neříká, který z mnoha efektivních bodů vybrat. Společenský blahobyt závisí i na rozdělení, zdraví, volném čase, životním prostředí a dalších faktorech. Proto může být rozumné akceptovat určitou neefektivnost za zvýšení spravedlnosti. Kolik efektivnosti stojí jednotka spravedlnosti, je ekonomický výpočet, ale rozhodnutí, kolik je správně, je hodnotové.\n\nVztah obou kritérií není pevný: opatření může zvýšit obojí (např. odstranění diskriminace), může je dostat do rozporu (vysoká daň z práce) a efektivní alokace může být zcela nespravedlivá.',
    mistakes: ['Efektivnost a spravedlnost nejsou totéž ani protiklady. Jsou to dvě různá hlediska.', 'Nespravedlivé rozdělení lze přijmout jako efektivní, a spravedlivé jako neefektivní. Pareto spravedlnost neposuzuje.'] },
  { heading: 'Jak postupovat v úlohách', term: undefined,
    text: 'U přebytků vždy nejdřív najděte rovnováhu ($Q_E$, $P_E$) a průsečíky křivek s osou ceny (nejvyšší cena poptávky a nejnižší cena nabídky). Obě plochy jsou trojúhelníky: polovina základny krát výška.\n\nU mrtvé ztráty zjistěte, o kolik klesne obchodované množství (u stropu a prahu množství na kratší straně trhu, u daně nové rovnovážné množství), a ve kterém místě jsou ceny na obou křivkách. Plocha mezi křivkami od nového množství k rovnovážnému je trojúhelník.\n\nU alokací v tabulce nebo krabici porovnávejte MRS obou spotřebitelů. Jsou-li různé, je výměna výhodná, a to s „cenou“ mezi oběma MRS. Jsou-li stejné, je alokace efektivní.' },
];

export default {
  id: 'rovnovaha', title: 'Celková rovnováha a tržní efektivnost', order: 10, theory, types,
};
