// Téma 2: Trh a tržní mechanismus (podle skript kap. 3, prezentace 2 a cvičebnice kap. 3).
// Konkrétní zadání ze cvičebnice jsou jen v Supabase (content/), zde jsou generátory a výklad vlastními slovy.
//
// VZOR PRO DALŠÍ TÉMATA (stejný tvar jako v Matice):
//  - theory: [{ heading, text, tex?, term?, viz?, mistakes?: string[] }]
//      term = pojem, jehož definici se student musí umět vybavit u zkoušky;
//      viz = { kind: 'econ', data } graf pod textem (js/viz/econ.js).
//  - types: [{ id, title, generate(rng), solve(data) }]
//      generate(rng) vylosuje data a vrátí solve(data); solve(data) z uložených dat sestaví celý příklad:
//      { id, topic, type, seed, part: 'zapocet'|'zkouska', points, data, task, promptTex?, hint?,
//        answerSpec, conclusion?, source?, solution: Step[] }.
//      Stejný solve() staví i pevné příklady ze cvičebnice (content/problems/trh.json).
//  - Step = { title, text, board?: BoardLine[], viz? }. Co popisuje text, musí být vidět na tabuli nebo v grafu.
//    Výsledek je řádek s dvojitým podtržením (result z lib.js).
import { equilibrium } from '../econ.js';
import {
  int, pick, shuffle, cz, czText, line, result, coef, supplyExpr, demandExpr, marketViz, inverseMarketViz,
} from './lib.js';

const TOPIC = 'trh';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- zápis rovnic ----------
const demandEq = (a, b) => `Q_D=${cz(a)}-${coef(b, 'P')}`;
const supplyEq = (c, d) => (c === 0 ? `Q_S=${coef(d, 'P')}` : c > 0 ? `Q_S=${cz(c)}+${coef(d, 'P')}` : `Q_S=${coef(d, 'P')}-${cz(-c)}`);
const invDemandEq = (A, B) => `P=${cz(A)}-${coef(B, 'Q')}`;
const invSupplyEq = (C, D) => (C === 0 ? `P=${coef(D, 'Q')}` : `P=${cz(C)}+${coef(D, 'Q')}`);

// ---------- události na trhu (posun křivky) ----------
// curve: která křivka se posune (D poptávka, S nabídka), dir: + doprava (růst), − doleva (pokles).
// Čísla ve cvičebnici: úlohy 2, 3, 4 a 6 (odpovědi v části E); úloha 3e tam má v řešení chybu a nepřebírá se.
const EVENTS = [
  { id: 'olymp', market: 'novin', text: 'Začaly olympijské hry.', curve: 'D', dir: '+', why: 'Lidé chtějí víc číst o sportu, a tak při každé ceně koupí víc novin.' },
  { id: 'slevy', market: 'novin', text: 'Vydavatelé zavedli zvláštní slevu pro předplatitele.', curve: 'D', dir: '+', why: 'Předplatné je levnější, takže při dané ceně výtisku bude poptávka větší.' },
  { id: 'papir', market: 'novin', text: 'Zvýšila se cena tiskařského papíru.', curve: 'S', dir: '-', why: 'Papír je vstup do výroby. Dražší vstupy zvyšují náklady, a vydavatelé proto při každé ceně nabídnou méně.' },
  { id: 'dan', market: 'novin', text: 'Stát uvalil na noviny zvláštní daň.', curve: 'S', dir: '-', why: 'Daň z prodeje zvyšuje náklady prodávajících, takže při každé ceně nabídnou méně.' },
  { id: 'konkurence', market: 'novin', text: 'Mezi vydavateli novin se zvýšila konkurence (přišli noví vydavatelé).', curve: 'S', dir: '+', why: 'Víc výrobců znamená větší celkovou nabídku při každé ceně.' },
  { id: 'roboti', market: 'nových aut', text: 'Automobilky zavedly roboty, které šetří náklady.', curve: 'S', dir: '+', why: 'Nižší náklady umožní vyrábět víc aut při každé ceně.' },
  { id: 'mzdy', market: 'nových aut', text: 'V automobilkách vzrostly mzdy.', curve: 'S', dir: '-', why: 'Práce je výrobní faktor. Dražší práce zvyšuje náklady, a nabídka proto klesá.' },
  { id: 'jizdne', market: 'nových aut', text: 'Zdražilo se jízdné v autobusech.', curve: 'D', dir: '+', why: 'Autobus je substitut auta. Když zdraží, někteří lidé přejdou k autům a poptávka po nich vzroste.' },
  { id: 'duchod', market: 'nových aut', text: 'Vzrostla úroveň důchodů obyvatel.', curve: 'D', dir: '+', why: 'Nová auta jsou normální statek: s růstem důchodu poptávka po nich roste.' },
  { id: 'topeni', market: 'bytů', text: 'Nedostatečné možnosti topení snížily počet vhodných bytů.', curve: 'S', dir: '-', why: 'Méně bytů vhodných k pronájmu znamená menší nabídku při každé ceně nájmu.' },
  { id: 'vzdalenost', market: 'bytů', text: 'Pracoviště nájemníků jsou dál od bytů.', curve: 'D', dir: '-', why: 'Byty jsou méně atraktivní, takže při dané ceně je o ně menší zájem.' },
  { id: 'prijmy-bydleni', market: 'bytů', text: 'Vzrostly příjmy lidí, kteří bydlí v dané lokalitě.', curve: 'D', dir: '+', why: 'Bydlení je normální statek: s vyššími příjmy lidé chtějí víc bydlet.' },
  { id: 'investor', market: 'bytů', text: 'Velký zahraniční investor přesunul výrobu do dané lokality.', curve: 'D', dir: '+', why: 'Přibudou zaměstnanci, kteří potřebují bydlet, takže poptávka po bytech vzroste.' },
  { id: 'vkus', market: 'zboží X', text: 'Spotřebitelé změnili vkus v neprospěch zboží X.', curve: 'D', dir: '-', why: 'Změna preferencí snižuje ochotu kupovat, takže poptávka při každé ceně klesá.' },
  { id: 'naklady-x', market: 'zboží X', text: 'Výrobní náklady zboží X prudce vzrostly.', curve: 'S', dir: '-', why: 'Vyšší náklady snižují ochotu vyrábět, takže nabídka při každé ceně klesá.' },
  { id: 'cla', market: 'zboží X', text: 'Vláda zcela zrušila tarify (cla) na dovoz zboží X.', curve: 'S', dir: '+', why: 'Dovoz zvětšuje nabídku na domácím trhu při každé ceně.' },
  { id: 'urody', market: 'obilí', text: 'Přišla vydařená úroda.', curve: 'S', dir: '+', why: 'Farmáři mají víc obilí k prodeji při každé ceně.' },
  { id: 'nebyl-benzin', market: 'nových aut', text: 'Zdražil se benzín.', curve: 'D', dir: '-', why: 'Benzín je komplement automobilu. Dražší provoz snižuje ochotu auta kupovat.' },
];
const eventById = (id) => EVENTS.find((e) => e.id === id) ?? EVENTS[0];
const DIR_WORD = { '+': 'doprava', '-': 'doleva' };
const CURVE_WORD = { D: 'poptávky', S: 'nabídky' };

// Základní trh pro grafy posunů: Q_D = 100 − 2P, Q_S = 10 + P → E0 = (Q 40, P 30).
const BASE = { a: 100, b: 2, c: 10, d: 1 };
const SHIFTED = { 'D+': { ...BASE, a: 130 }, 'D-': { ...BASE, a: 70 }, 'S+': { ...BASE, c: 40 }, 'S-': { ...BASE, c: -20 } };

function shiftGraph(ev) {
  const m = SHIFTED[`${ev.curve}${ev.dir}`];
  const e0 = equilibrium(BASE); const e1 = equilibrium(m);
  const demand = ev.curve === 'D';
  const curves = demand
    ? [{ expr: demandExpr(m.a, m.b), label: 'D1', color: 'accent', dashed: true }]
    : [{ expr: supplyExpr(m.c, m.d), label: 'S1', color: 'accent', dashed: true }];
  const at30 = demand ? m.a - m.b * 30 : m.c + m.d * 30; // množství na posunuté křivce při ceně 30
  const base = marketViz(BASE, { markets: [m], curves, points: [{ x: e0.Q, y: e0.P, label: 'E0' }, { x: e1.Q, y: e1.P, label: 'E1' }],
    arrows: [{ from: [e0.Q, 30], to: [at30, 30], label: '' }], alt: `Posun křivky ${CURVE_WORD[ev.curve]} ${DIR_WORD[ev.dir]}` });
  // původní křivky dostanou popisky D0 / S0 podle toho, která se posouvá
  base.data.curves[0].label = demand ? 'D0' : 'D';
  base.data.curves[1].label = demand ? 'S' : 'S0';
  return { viz: base, e0, e1 };
}

const OUTCOME = { 'D+': 'uu', 'D-': 'dd', 'S+': 'du', 'S-': 'ud' };
const OUTCOME_TEXT = {
  uu: 'cena roste, množství roste', ud: 'cena roste, množství klesá', du: 'cena klesá, množství roste', dd: 'cena klesá, množství klesá',
};
const OUTCOME_TEX = { uu: 'P\\uparrow,\\ Q\\uparrow', ud: 'P\\uparrow,\\ Q\\downarrow', du: 'P\\downarrow,\\ Q\\uparrow', dd: 'P\\downarrow,\\ Q\\downarrow' };

// ---------- typ: rovnováha z Q_D = a − bP a Q_S = c + dP ----------
function buildRovnovaha({ a, b, c, d, ask }) {
  const e = equilibrium({ a, b, c, d });
  const P = e.P; const Q = e.Q;
  const askP = ask === 'P';
  return mk('rovnovaha', {
    data: { a, b, c, d, ask },
    task: `Poptávku po zboží popisuje první rovnice, nabídku druhá (P je cena v Kč, Q množství v kusech). Určete ${askP ? 'rovnovážnou cenu' : 'rovnovážné množství'}.`,
    promptTex: `${demandEq(a, b)},\\qquad ${supplyEq(c, d)}`,
    answerSpec: { kind: 'number', value: askP ? P : Q },
    conclusion: `Rovnovážná cena je ${czText(P)} Kč, rovnovážné množství ${czText(Q)} ks.`,
    source: { chapter: 3, number: 12 },
    solution: [
      { title: 'Podmínka rovnováhy', text: 'Na trhu je rovnováha, když se množství, které chtějí kupující koupit, rovná množství, které chtějí prodávající prodat: $Q_D = Q_S$. Pravé strany rovnic proto dáme do rovnosti.',
        board: [line('Q_D=Q_S'), line(`${cz(a)}-${coef(b, 'P')}=${c === 0 ? '' : `${cz(c)}+`}${coef(d, 'P')}`)] },
      { title: 'Vyřešíme rovnici pro cenu', text: `Členy s $P$ převedeme na jednu stranu, čísla na druhou: vlevo zůstane ${cz(a - c)}, vpravo ${cz(b + d)}$P$. Pak dělíme číslem u $P$.`,
        board: [line(`${cz(a)}${c === 0 ? '' : `-${cz(c)}`}=${cz(b)}P+${cz(d)}P`), line(`${cz(a - c)}=${cz(b + d)}P`), line(`P=\\frac{${cz(a - c)}}{${cz(b + d)}}`), askP ? result(`P_E=${cz(P)}`) : line(`P_E=${cz(P)}`)] },
      { title: 'Dosadíme do poptávky', text: `Rovnovážnou cenu ${czText(P)} dosadíme do rovnice poptávky (stejně dobře jde použít nabídku) a dostaneme rovnovážné množství.`,
        board: [line(`Q_E=${cz(a)}-${cz(b)}\\cdot ${cz(P)}`), askP ? line(`Q_E=${cz(Q)}`) : result(`Q_E=${cz(Q)}`)] },
      { title: 'Zkouška správnosti', text: 'Dosadíme cenu i do druhé rovnice. Pokud vyjde stejné množství, počítali jsme správně.',
        board: [line(`Q_S=${c === 0 ? '' : `${cz(c)}+`}${cz(d)}\\cdot ${cz(P)}=${cz(Q)}`)] },
      { title: 'Graf trhu', text: `Obě křivky se protínají v bodě rovnováhy E: rovnovážná cena je ${czText(P)} Kč a rovnovážné množství ${czText(Q)} ks.`,
        viz: marketViz({ a, b, c, d }) },
    ],
  });
}

function genRovnovaha(rng) {
  const d = int(rng, 1, 5); const b = int(rng, 1, 5);
  const c = pick(rng, [0, 10, 20, 30, 40, 50, 60]);
  const P = int(rng, 5, 40);
  const Q = c + d * P;
  return buildRovnovaha({ a: Q + b * P, b, c, d, ask: pick(rng, ['P', 'Q']) });
}

// ---------- typ: rovnováha z rovnic P = A − BQ a P = C + DQ ----------
function buildRovnovahaInv({ A, B, C, D, ask }) {
  const Q = (A - C) / (B + D); const P = A - B * Q;
  const askQ = ask === 'Q';
  return mk('rovnovaha-inv', {
    data: { A, B, C, D, ask },
    task: `Poptávka je dána první rovnicí a nabídka druhou (P je cena, Q množství). Určete ${askQ ? 'rovnovážné množství' : 'rovnovážnou cenu'}.`,
    promptTex: `${invDemandEq(A, B)},\\qquad ${invSupplyEq(C, D)}`,
    answerSpec: { kind: 'number', value: askQ ? Q : P },
    conclusion: `Rovnovážné množství je ${czText(Q)} a rovnovážná cena ${czText(P)}.`,
    source: { chapter: 3, number: 14 },
    solution: [
      { title: 'Podmínka rovnováhy', text: 'Tentokrát jsou obě křivky zapsané jako cena v závislosti na množství. V rovnováze mají poptávka i nabídka stejnou cenu při stejném množství, takže pravé strany porovnáme.',
        board: [line('P_D=P_S'), line(`${cz(A)}-${coef(B, 'Q')}=${C === 0 ? '' : `${cz(C)}+`}${coef(D, 'Q')}`)] },
      { title: 'Vyřešíme rovnici pro množství', text: 'Členy s $Q$ dáme na jednu stranu, čísla na druhou a dělíme číslem u $Q$.',
        board: [line(`${cz(A)}${C === 0 ? '' : `-${cz(C)}`}=${cz(B)}Q+${cz(D)}Q`), line(`${cz(A - C)}=${cz(B + D)}Q`), askQ ? result(`Q_E=${cz(Q)}`) : line(`Q_E=${cz(Q)}`)] },
      { title: 'Dosadíme do rovnice poptávky', text: 'Rovnovážné množství dosadíme do jedné z rovnic. Použijeme poptávku.',
        board: [line(`P_E=${cz(A)}-${cz(B)}\\cdot ${cz(Q)}`), askQ ? line(`P_E=${cz(P)}`) : result(`P_E=${cz(P)}`)] },
      { title: 'Zkouška správnosti', text: 'Cena z nabídky musí vyjít stejně.',
        board: [line(`P_E=${C === 0 ? '' : `${cz(C)}+`}${cz(D)}\\cdot ${cz(Q)}=${cz(P)}`)] },
      { title: 'Graf trhu', text: `Křivky se protínají v bodě E: množství ${czText(Q)}, cena ${czText(P)}.`, viz: inverseMarketViz({ A, B, C, D }) },
    ],
  });
}

function genRovnovahaInv(rng) {
  const B = int(rng, 1, 5); const D = int(rng, 1, 5);
  const Q = int(rng, 4, 20); const C = pick(rng, [10, 15, 20, 25, 30, 40]);
  return buildRovnovahaInv({ A: C + (B + D) * Q, B, C, D, ask: pick(rng, ['P', 'Q']) });
}

// ---------- typ: cenový strop a cenový práh ----------
function buildRegulace({ a, b, c, d, limit, price }) {
  const e = equilibrium({ a, b, c, d });
  const qd = a - b * price; const qs = c + d * price;
  const strop = limit === 'strop';
  const gap = strop ? qd - qs : qs - qd;
  const word = strop ? 'nedostatek (převis poptávky)' : 'přebytek (převis nabídky)';
  const graph = marketViz({ a, b, c, d }, {
    curves: [{ expr: `${price}`, label: strop ? 'Pmax' : 'Pmin', color: 'accent', dashed: true }],
    points: [{ x: e.Q, y: e.P, label: 'E' }, { x: qs, y: price, label: 'QS' }, { x: qd, y: price, label: 'QD' }],
    alt: strop ? 'Cenový strop pod rovnovážnou cenou a nedostatek' : 'Cenový práh nad rovnovážnou cenou a přebytek',
  });
  return mk('regulace', {
    data: { a, b, c, d, limit, price },
    task: `Poptávku popisuje první rovnice, nabídku druhá. Vláda stanovila ${strop ? 'maximální (strop)' : 'minimální (práh)'} cenu ${cz(price)} Kč. Určete ${word}.`,
    promptTex: `${demandEq(a, b)},\\qquad ${supplyEq(c, d)}`,
    answerSpec: { kind: 'number', value: gap },
    conclusion: `${strop ? 'Vznikne nedostatek' : 'Vznikne přebytek'} ${czText(gap)} ks.`,
    source: { chapter: 3, number: 15 },
    solution: [
      { title: 'Rovnováha bez zásahu', text: 'Nejdřív zjistíme, kde by trh skončil sám. Bez ní nepoznáme, jestli regulace působí.',
        board: [line(`${cz(a)}-${coef(b, 'P')}=${c === 0 ? '' : `${cz(c)}+`}${coef(d, 'P')}`), line(`P_E=${cz(e.P)},\\quad Q_E=${cz(e.Q)}`)] },
      { title: strop ? 'Strop je pod rovnovážnou cenou' : 'Práh je nad rovnovážnou cenou',
        text: strop ? `Cena ${czText(price)} je nižší než rovnovážná ${czText(e.P)}, takže strop trh skutečně omezuje.` : `Cena ${czText(price)} je vyšší než rovnovážná ${czText(e.P)}, takže práh trh skutečně omezuje.`,
        board: [line(`${cz(price)}${strop ? '<' : '>'}${cz(e.P)}`)] },
      { title: 'Množství při regulované ceně', text: 'Do poptávky i do nabídky dosadíme regulovanou cenu. Obchodovat se pak může jen menší z obou množství.',
        board: [line(`Q_D=${cz(a)}-${cz(b)}\\cdot ${cz(price)}=${cz(qd)}`), line(`Q_S=${c === 0 ? '' : `${cz(c)}+`}${cz(d)}\\cdot ${cz(price)}=${cz(qs)}`)] },
      { title: strop ? 'Nedostatek = Q_D − Q_S' : 'Přebytek = Q_S − Q_D', text: strop ? 'Kupující by chtěli víc, než prodávající za tuto cenu nabídnou, a rozdíl je nedostatek.' : 'Prodávající by nabídli víc, než kupující za tuto cenu koupí, a rozdíl je přebytek.',
        board: [result(strop ? `${cz(qd)}-${cz(qs)}=${cz(gap)}` : `${cz(qs)}-${cz(qd)}=${cz(gap)}`)] },
      { title: 'Graf', text: `Při ceně ${czText(price)} leží křivka nabídky v množství ${czText(qs)} a poptávky v ${czText(qd)}; vzdálenost mezi nimi je ${strop ? 'nedostatek' : 'přebytek'} ${czText(gap)}.`, viz: graph },
    ],
  });
}

function genRegulace(rng) {
  for (let i = 0; i < 100; i++) {
    const b = int(rng, 2, 6); const d = int(rng, 2, 6);
    const c = pick(rng, [0, 20, 40, 60, 80, 100]);
    const P = int(rng, 20, 80); const Q = c + d * P; const a = Q + b * P;
    const strop = rng() < 0.5; const k = int(rng, 5, 15);
    const price = strop ? P - k : P + k;
    if (a - b * price <= 0 || c + d * price <= 0) continue;
    return buildRegulace({ a, b, c, d, limit: strop ? 'strop' : 'prah', price });
  }
  return buildRegulace({ a: 1020, b: 6, c: 180, d: 4, limit: 'strop', price: 50 });
}

// ---------- typ: výkup přebytků státem ----------
function buildVykup({ A, B, C, D, price }) {
  const Q = (A - C) / (B + D); const P = A - B * Q;
  const qd = (A - price) / B; const qs = (price - C) / D;
  const surplus = qs - qd; const cost = surplus * price;
  const graph = inverseMarketViz({ A, B, C, D }, {
    curves: [{ expr: `${price}`, label: 'Pv', color: 'accent', dashed: true }],
    points: [{ x: Q, y: P, label: 'E' }, { x: qd, y: price, label: 'QD' }, { x: qs, y: price, label: 'QS' }],
    alt: 'Výkupní cena nad rovnováhou a přebytek vykoupený státem',
  });
  return mk('vykup', {
    data: { A, B, C, D, price },
    task: `Poptávka je dána první rovnicí, nabídka druhou (P v Kč za jednotku, Q v jednotkách). Vláda stanovila výkupní cenu ${cz(price)} Kč a zavázala se vykoupit všechny přebytky, které při ní vzniknou. Kolik Kč stát zaplatí?`,
    promptTex: `${invDemandEq(A, B)},\\qquad ${invSupplyEq(C, D)}`,
    answerSpec: { kind: 'number', value: cost, tol: 0.5 },
    conclusion: `Stát zaplatí ${czText(cost)} Kč.`,
    source: { chapter: 3, number: 16 },
    solution: [
      { title: 'Rovnováha bez zásahu', text: 'Zjistíme, kde by trh skončil sám. Výkupní cena má smysl jen tehdy, když je vyšší.',
        board: [line(`${cz(A)}-${coef(B, 'Q')}=${C === 0 ? '' : `${cz(C)}+`}${coef(D, 'Q')}`), line(`Q_E=${cz(Q)},\\quad P_E=${cz(P)}`), line(`${cz(price)}>${cz(P)}`)] },
      { title: 'Množství při výkupní ceně', text: 'Při výkupní ceně vyjádříme z obou rovnic množství. Z poptávky $Q=(A-P)/B$, z nabídky $Q=(P-C)/D$.',
        board: [line(`Q_D=\\frac{${cz(A)}-${cz(price)}}{${cz(B)}}=${cz(qd)}`), line(`Q_S=\\frac{${cz(price)}-${C === 0 ? '0' : cz(C)}}{${cz(D)}}=${cz(qs)}`)] },
      { title: 'Přebytek', text: 'Prodávající nabízejí víc, než kupující při této ceně koupí. Rozdíl je přebytek, který vykoupí stát.',
        board: [line(`${cz(qs)}-${cz(qd)}=${cz(surplus)}`)] },
      { title: 'Náklady státu', text: 'Stát nakoupí celý přebytek za výkupní cenu, a náklady jsou tedy přebytek krát cena.',
        board: [result(`${cz(surplus)}\\cdot ${cz(price)}=${cz(cost)}\\ \\text{Kč}`)] },
      { title: 'Graf', text: `Při výkupní ceně je poptávané množství ${czText(qd)} a nabízené ${czText(qs)}. Stát odkoupí rozdíl ${czText(surplus)} jednotek, náklady jsou ${czText(cost)} Kč.`, viz: graph },
    ],
  });
}

function genVykup(rng) {
  const B = pick(rng, [1, 2]); const D = pick(rng, [1, 2]);
  const Q = pick(rng, [40, 50, 60, 70, 80, 90, 100]); const C = pick(rng, [50, 60, 80, 100, 120]);
  const P = C + D * Q; const A = P + B * Q;
  return buildVykup({ A, B, C, D, price: P + 10 * int(rng, 1, 3) });
}

// ---------- typ: co posunulo křivku ----------
const SHIFT_OPTIONS = [
  { id: 'D+', text: 'Poptávka vzroste (křivka D se posune doprava)' },
  { id: 'D-', text: 'Poptávka klesne (křivka D se posune doleva)' },
  { id: 'S+', text: 'Nabídka vzroste (křivka S se posune doprava)' },
  { id: 'S-', text: 'Nabídka klesne (křivka S se posune doleva)' },
];

function shiftSteps(ev, { conclusion = true } = {}) {
  const { viz, e0, e1 } = shiftGraph(ev);
  const demand = ev.curve === 'D';
  return [
    { title: 'Kterou stranu trhu změna týká?', text: `${ev.why} Změnu proto zakreslíme jako změnu ${demand ? 'poptávky (kupující)' : 'nabídky (prodávající)'}.`,
      board: [line(demand ? '\\text{kupující}\\ \\Rightarrow\\ D' : '\\text{prodávající}\\ \\Rightarrow\\ S')] },
    { title: 'Jakým směrem se křivka posune?', text: `Při každé ceně se ${demand ? 'poptává' : 'nabízí'} ${ev.dir === '+' ? 'víc' : 'méně'}, a křivka ${CURVE_WORD[ev.curve]} se proto posune ${DIR_WORD[ev.dir]}.`,
      board: [line(`${demand ? 'D' : 'S'}_0\\ \\to\\ ${demand ? 'D' : 'S'}_1\\quad (${ev.dir === '+' ? '\\rightarrow' : '\\leftarrow'})`)] },
    { title: 'Posun křivky v grafu', text: `Původní křivka je nakreslená plně, nová čárkovaně. Rovnováha se přesune z E0 (cena ${czText(e0.P)}, množství ${czText(e0.Q)}) do E1 (cena ${czText(e1.P)}, množství ${czText(e1.Q)}).`, viz },
    ...(conclusion ? [{ title: 'Závěr', text: `Správná odpověď: ${ev.curve === 'D' ? 'poptávka' : 'nabídka'} ${ev.dir === '+' ? 'vzroste' : 'klesne'}, křivka se posune ${DIR_WORD[ev.dir]}. Při tom zůstává druhá křivka na místě.`,
      board: [result(`${demand ? 'D' : 'S'}\\ ${ev.dir === '+' ? '\\rightarrow' : '\\leftarrow'}`)] }] : []),
  ];
}

function buildPosun({ eventId }) {
  const ev = eventById(eventId);
  return mk('posun', {
    data: { eventId, event: ev },
    task: `Na trhu ${ev.market} nastala změna: „${ev.text}“ Co se stane s křivkou poptávky nebo nabídky?`,
    answerSpec: { kind: 'choice', value: `${ev.curve}${ev.dir}`, options: SHIFT_OPTIONS },
    conclusion: `${ev.curve === 'D' ? 'Poptávka' : 'Nabídka'} ${ev.dir === '+' ? 'vzroste' : 'klesne'}.`,
    source: { chapter: 3, number: 2 },
    solution: shiftSteps(ev),
  });
}

// ---------- typ: jak se změní rovnováha ----------
const OUTCOME_OPTIONS = Object.entries(OUTCOME_TEXT).map(([id, text]) => ({ id, text: text[0].toUpperCase() + text.slice(1) }));

function buildZmena({ eventId }) {
  const ev = eventById(eventId);
  const { viz, e0, e1 } = shiftGraph(ev);
  const out = OUTCOME[`${ev.curve}${ev.dir}`];
  const demand = ev.curve === 'D';
  return mk('zmena-rovnovahy', {
    data: { eventId, event: ev },
    task: `Na trhu ${ev.market} nastala změna: „${ev.text}“ Jak se změní rovnovážná cena a rovnovážné množství?`,
    answerSpec: { kind: 'choice', value: out, options: OUTCOME_OPTIONS },
    conclusion: `${OUTCOME_TEXT[out][0].toUpperCase()}${OUTCOME_TEXT[out].slice(1)}.`,
    source: { chapter: 3, number: 6 },
    solution: [
      { title: 'Určíme, která křivka se posune', text: `${ev.why} Posune se tedy křivka ${CURVE_WORD[ev.curve]} ${DIR_WORD[ev.dir]}.`,
        board: [line(`${demand ? 'D' : 'S'}\\ ${ev.dir === '+' ? '\\rightarrow' : '\\leftarrow'}`)] },
      { title: 'Nová rovnováha na příkladu', text: `Použijeme pomocný trh $Q_D=100-2P$, $Q_S=10+P$ s rovnováhou E0. Po posunu spočteme novou rovnováhu E1 stejným postupem.`,
        board: [line(`E_0:\\ P=${cz(e0.P)},\\ Q=${cz(e0.Q)}`), line(`E_1:\\ P=${cz(e1.P)},\\ Q=${cz(e1.Q)}`)] },
      { title: 'Porovnáme E0 a E1', text: `Cena se změnila z ${czText(e0.P)} na ${czText(e1.P)} a množství z ${czText(e0.Q)} na ${czText(e1.Q)}.`,
        board: [result(OUTCOME_TEX[out])] },
      { title: 'Pravidlo na zapamatování', text: 'Růst poptávky zvyšuje cenu i množství, pokles poptávky obojí snižuje. Růst nabídky snižuje cenu a zvyšuje množství, pokles nabídky zvyšuje cenu a snižuje množství.', viz },
    ],
  });
}

// ---------- typ: posun křivky, nebo pohyb po křivce ----------
const MOVE_EVENTS = [
  { id: 'subst-cena', text: 'Změna ceny substitutu', kind: 'poptavka', why: 'Cena substitutu je necenový činitel poptávky (cena samotného statku se nezměnila).' },
  { id: 'technologie', text: 'Zavedení nové technologie', kind: 'nabidka', why: 'Technologie ovlivní náklady, tedy nabídku při každé ceně.' },
  { id: 'prijmy', text: 'Změna příjmů domácností', kind: 'poptavka', why: 'Příjem je necenový činitel poptávky.' },
  { id: 'cena-suroviny', text: 'Změna ceny suroviny', kind: 'nabidka', why: 'Surovina je výrobní vstup, takže se změní náklady a tedy nabídka při každé ceně.' },
  { id: 'moda', text: 'Změna módního trendu', kind: 'poptavka', why: 'Vkus a móda jsou preference, tedy necenový činitel poptávky.' },
  { id: 'cena-sama', text: 'Změna ceny samotného statku (ostatní podmínky se nemění)', kind: 'cena', why: 'Změna ceny samotného statku nikdy neposouvá křivky, jen vede k pohybu po nich.' },
];
const moveById = (id) => MOVE_EVENTS.find((e) => e.id === id) ?? MOVE_EVENTS[0];
const MOVE_OPTIONS = [
  { id: 'posD', text: 'Posun poptávkové křivky' },
  { id: 'pohD', text: 'Pohyb po poptávkové křivce' },
  { id: 'posS', text: 'Posun nabídkové křivky' },
  { id: 'pohS', text: 'Pohyb po nabídkové křivce' },
];
const MOVE_ANSWER = { poptavka: ['posD', 'pohS'], nabidka: ['posS', 'pohD'], cena: ['pohD', 'pohS'] };

function buildPohyb({ eventId }) {
  const ev = moveById(eventId);
  const answer = MOVE_ANSWER[ev.kind];
  let graph;
  if (ev.kind === 'cena') {
    // vyšší cena 40 při rovnováze 30: pohyb po D k menšímu a po S k většímu množství
    graph = marketViz(BASE, { curves: [{ expr: '40', label: 'P1', color: 'accent', dashed: true }],
      points: [{ x: 40, y: 30, label: 'E' }, { x: 20, y: 40, label: 'QD' }, { x: 50, y: 40, label: 'QS' }], alt: 'Pohyb po obou křivkách při změně ceny' });
  } else {
    const key = ev.kind === 'poptavka' ? 'D+' : 'S+';
    graph = shiftGraph({ curve: key[0], dir: '+' }).viz;
  }
  const first = ev.kind === 'poptavka' ? 'poptávky' : ev.kind === 'nabidka' ? 'nabídky' : '';
  return mk('pohyb-posun', {
    data: { eventId, event: ev },
    task: `Označte, co se stane na trhu při změně: „${ev.text}“ Správné jsou dvě možnosti: jedna pro křivku, která se posune (nebo po které se jde), a druhá pro druhou křivku.`,
    answerSpec: { kind: 'multichoice', value: answer, options: MOVE_OPTIONS },
    conclusion: ev.kind === 'cena' ? 'Obě křivky zůstanou na místě, jde o pohyb po obou.' : `Posune se křivka ${first}, po druhé křivce se jen pohne bod rovnováhy.`,
    source: { chapter: 3, number: 1 },
    solution: [
      { title: 'Co je příčinou změny?', text: ev.why,
        board: [line(ev.kind === 'cena' ? 'P\\ \\text{statku}\\ \\Rightarrow\\ \\text{pohyb}' : ev.kind === 'poptavka' ? '\\text{necenový činitel}\\ D' : '\\text{necenový činitel}\\ S')] },
      { title: ev.kind === 'cena' ? 'Obě křivky zůstávají' : `Posune se křivka ${first}`, text: ev.kind === 'cena' ? 'Cena statku je na svislé ose. Změna ceny proto znamená přesun bodu po křivce, ne posun křivky. Poptávané množství klesne a nabízené vzroste (nebo naopak).' : 'Necenový činitel mění množství při každé ceně, a posune se proto celá křivka.',
        board: [line(ev.kind === 'cena' ? '\\text{po } D\\ \\text{i po } S' : ev.kind === 'poptavka' ? 'D_0\\to D_1' : 'S_0\\to S_1')] },
      { title: ev.kind === 'cena' ? 'Graf' : 'Druhá křivka se nepohne', text: ev.kind === 'cena' ? 'Při vyšší ceně P1 chtějí kupující méně (QD) a prodávající nabídnou víc (QS).' : 'Druhá křivka zůstane, ale bod rovnováhy se po ní přesune. Jde tedy o pohyb po ní.', viz: graph },
      { title: 'Závěr', text: `Správně: ${answer.map((id) => MOVE_OPTIONS.find((o) => o.id === id).text.toLowerCase()).join(' a ')}.`,
        board: [result(answer.join('\\ +\\ ').replace(/pos/g, '\\mathrm{pos}').replace(/poh/g, '\\mathrm{poh}'))] },
    ],
  });
}

// ---------- typ: substituty, komplementy a důchod ----------
const REL_ITEMS = [
  { rel: 'substitut', text: 'Cena másla vzroste. Jak se změní poptávka po margarínu?', pair: ['máslo', 'margarín'] },
  { rel: 'substitut', text: 'Cena kávy vzroste. Jak se změní poptávka po čaji?', pair: ['káva', 'čaj'] },
  { rel: 'substitut', text: 'Cena jízdenky na vlak vzroste. Jak se změní poptávka po jízdenkách na autobus?', pair: ['vlak', 'autobus'] },
  { rel: 'komplement', text: 'Cena čaje vzroste. Jak se změní poptávka po citrónu?', pair: ['čaj', 'citrón'] },
  { rel: 'komplement', text: 'Cena tiskáren vzroste. Jak se změní poptávka po inkoustu do nich?', pair: ['tiskárny', 'inkoust'] },
  { rel: 'komplement', text: 'Cena benzínu vzroste. Jak se změní poptávka po velkých autech?', pair: ['benzín', 'auta'] },
  { rel: 'nezavisle', text: 'Cena čaje vzroste. Jak se změní poptávka po soli?', pair: ['čaj', 'sůl'] },
  { rel: 'nezavisle', text: 'Cena zubní pasty vzroste. Jak se změní poptávka po pneumatikách?', pair: ['pasta', 'pneumatiky'] },
  { rel: 'normalni', text: 'Důchody domácností vzrostou. Jak se změní poptávka po rodinných domech?', pair: ['důchod', 'domy'] },
  { rel: 'normalni', text: 'Důchody domácností vzrostou. Jak se změní poptávka po luxusních automobilech?', pair: ['důchod', 'luxusní auta'] },
  { rel: 'podradny', text: 'Důchody domácností vzrostou. Jak se změní poptávka po ojetých automobilech?', pair: ['důchod', 'ojetá auta'] },
  { rel: 'podradny', text: 'Důchody domácností vzrostou. Jak se změní poptávka po velmi levných instantních polévkách?', pair: ['důchod', 'instantní polévky'] },
  { rel: 'neutralni', text: 'Důchody domácností vzrostou. Jak se změní poptávka po soli?', pair: ['důchod', 'sůl'] },
];
const REL_ANSWER = { substitut: 'up', komplement: 'down', nezavisle: 'same', normalni: 'up', podradny: 'down', neutralni: 'same' };
const REL_EXPLAIN = {
  substitut: 'Máslo a margarín (stejně jako káva a čaj) jsou substituty: nahrazují se. Když zdraží jeden, lidé přejdou k druhému, a poptávka po něm proto vzroste.',
  komplement: 'Statky se používají společně. Když se zdraží jeden, lidé ho koupí méně, a proto sníží i poptávku po druhém.',
  nezavisle: 'Mezi statky není žádná souvislost (nenahrazují se ani nejsou potřeba společně), takže změna ceny jednoho druhý statek neovlivní.',
  normalni: 'Jde o normální statek: s růstem důchodu poptávka po něm roste.',
  podradny: 'Jde o podřadný statek: s růstem důchodu ho lidé nahrazují kvalitnějšími, takže poptávka po něm klesá.',
  neutralni: 'Na statek s malým podílem na výdajích a bez náhrady (jako je sůl) růst důchodu nemá vliv.',
};
const REL_BOARD = {
  substitut: 'P_X\\uparrow\\ \\Rightarrow\\ D_Y\\uparrow', komplement: 'P_X\\uparrow\\ \\Rightarrow\\ D_Y\\downarrow', nezavisle: 'P_X\\uparrow\\ \\Rightarrow\\ D_Y=\\text{beze změny}',
  normalni: 'I\\uparrow\\ \\Rightarrow\\ D\\uparrow', podradny: 'I\\uparrow\\ \\Rightarrow\\ D\\downarrow', neutralni: 'I\\uparrow\\ \\Rightarrow\\ D=\\text{beze změny}',
};
const REL_OPTIONS = [
  { id: 'up', text: 'Poptávka vzroste' }, { id: 'down', text: 'Poptávka klesne' }, { id: 'same', text: 'Poptávka se nezmění' },
];
const REL_RESULT = { up: 'D\\uparrow', down: 'D\\downarrow', same: 'D\\ \\text{beze změny}' };
const REL_PLAIN = { up: 'vzroste', down: 'klesne', same: 'se nezmění' };

function buildRel({ item }) {
  const it = REL_ITEMS[item] ?? REL_ITEMS[0];
  const ans = REL_ANSWER[it.rel];
  const income = it.rel === 'normalni' || it.rel === 'podradny' || it.rel === 'neutralni';
  return mk('subst-kompl', {
    data: { item, rel: it.rel },
    task: it.text,
    answerSpec: { kind: 'choice', value: ans, options: REL_OPTIONS },
    conclusion: `Poptávka ${REL_PLAIN[ans]}.`,
    source: { chapter: 3, number: income ? 10 : 9 },
    solution: [
      { title: income ? 'Co se mění?' : 'Jaký vztah mají statky?', text: income ? 'Změnil se důchod. Poptávka po statku závisí na tom, jak na důchod statek reaguje.' : 'Změnila se cena jednoho statku. Dopad na poptávku po druhém závisí na tom, jak spolu statky souvisejí.',
        board: [line(income ? 'I\\uparrow' : 'P_X\\uparrow')] },
      { title: 'Rozhodující vztah', text: REL_EXPLAIN[it.rel], board: [line(REL_BOARD[it.rel])] },
      { title: 'Závěr', text: `Poptávka ${REL_PLAIN[ans]}.`, board: [result(REL_RESULT[ans])] },
    ],
  });
}

// ---------- typ: pravda, nebo nepravda ----------
// kn-a až kn-h jsou úkoly ano/ne z části C cvičebnice kap. 3 (správné odpovědi A, N, N, A, A, A, N, N).
const STATEMENTS = [
  { id: 'kn-a', text: 'Velkou předností trhu je, že se informace a koordinace činností šíří automaticky.', truth: true, why: 'Ceny na trhu samy předávají informaci o vzácnosti, a lidé proto nemusejí nic plánovat centrálně.' },
  { id: 'kn-b', text: 'Když vláda sníží cla na dovážené automobily, cena vozů domácí výroby stoupne.', truth: false, why: 'Levnější dovezená auta jsou substituty domácích. Poptávka po domácích autech klesne, a jejich cena proto spíš klesne.' },
  { id: 'kn-c', text: 'U všech statků platí, že s růstem důchodu roste poptávka po nich.', truth: false, why: 'To platí jen pro normální statky. U podřadných statků poptávka s růstem důchodu klesá.' },
  { id: 'kn-d', text: 'Princip „neviditelné ruky“ tvrdí, že sledování vlastního zájmu jednotlivců na konkurenčním trhu vede k prospěchu všech.', truth: true, why: 'Přesně to Adam Smith tvrdil: konkurence nasměruje sobecké jednání ke společnému prospěchu.' },
  { id: 'kn-e', text: 'Důchodový efekt cenové změny je změna poptávaného množství vyvolaná tím, že změna ceny statku změní reálný důchod spotřebitele.', truth: true, why: 'Zdražení statku snižuje kupní sílu důchodu, a spotřebitel proto může koupit méně.' },
  { id: 'kn-f', text: 'Poptávková funkce udává vztah mezi cenou statku a kupovaným množstvím.', truth: true, why: 'Přesně tak je poptávka definovaná: jak se mění poptávané množství při různých cenách.' },
  { id: 'kn-g', text: 'Křivka nabídky druhotných surovin je strmější než křivka nabídky lístků na finále tenisového turnaje.', truth: false, why: 'Lístků na finále je pevný počet (kapacita stadionu), a nabídka je tedy téměř svislá. Strmější je tedy nabídka lístků, nikoli surovin.' },
  { id: 'kn-h', text: 'Neúroda kávy v Brazílii sníží ceny kakaa, čaje, citronů a cukru.', truth: false, why: 'Káva zdraží. Čaj a kakao jsou její substituty, jejich poptávka vzroste, a ceny také vzrostou. Jen u komplementů (cukr, citron) by ceny spíš klesly, takže tvrzení neplatí pro všechny.' },
  { id: 'own-1', text: 'Změna ceny statku způsobí pohyb po křivce poptávky, nikoli její posun.', truth: true, why: 'Cena je na svislé ose. Mění-li se jen cena, měníme bod na stejné křivce.' },
  { id: 'own-2', text: 'Růst cen vstupů posune křivku nabídky doprava.', truth: false, why: 'Dražší vstupy zvyšují náklady a nabídka klesá, křivka se tedy posune doleva.' },
  { id: 'own-3', text: 'Cenový strop stanovený pod rovnovážnou cenou způsobí nedostatek.', truth: true, why: 'Při nižší ceně kupující chtějí víc a prodávající nabízejí méně, takže poptávané množství převyšuje nabízené.' },
  { id: 'own-4', text: 'V rovnováze se poptávané množství rovná nabízenému množství.', truth: true, why: 'Tak je rovnováha definovaná: žádná strana nemá důvod cenu měnit.' },
  { id: 'own-5', text: 'Zlepšení technologie posune křivku nabídky doleva.', truth: false, why: 'Lepší technologie snižuje náklady a nabídka roste. Křivka se posune doprava.' },
  { id: 'own-6', text: 'Substituty jsou statky, které se používají společně.', truth: false, why: 'To jsou komplementy. Substituty se navzájem nahrazují.' },
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
    source: book ? { chapter: 3, number: `C-${id.slice(3)}` } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a vyhledáme pojem, na kterém stojí.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'zakon-poptavky', q: 'Co říká zákon poptávky?', right: 'Za jinak stejných podmínek růst ceny vyvolává pokles poptávaného množství.', wrong: ['Za jinak stejných podmínek růst ceny vyvolává růst poptávaného množství.', 'Poptávané množství nezávisí na ceně, ale jen na důchodu.', 'Za jinak stejných podmínek růst důchodu vždy sníží poptávané množství.'] },
  { id: 'zakon-nabidky', q: 'Co říká zákon nabídky?', right: 'Za jinak stejných podmínek růst ceny vyvolává růst nabízeného množství.', wrong: ['Za jinak stejných podmínek růst ceny vyvolává pokles nabízeného množství.', 'Nabízené množství roste s klesající cenou.', 'Nabídka se při změně ceny posune doleva.'] },
  { id: 'rovnovazna-cena', q: 'Co je rovnovážná cena?', right: 'Cena, při které se poptávané množství rovná nabízenému množství.', wrong: ['Nejnižší cena, kterou je prodávající ochoten akceptovat.', 'Cena stanovená státem, aby trh nebyl v nerovnováze.', 'Cena, při které je největší zisk výrobců.'] },
  { id: 'previs-nabidky', q: 'Co je převis nabídky?', right: 'Situace, kdy je nabízené množství větší než poptávané (cena je nad rovnovážnou).', wrong: ['Situace, kdy je poptávané množství větší než nabízené.', 'Situace, kdy je cena rovna rovnovážné ceně.', 'Posun křivky nabídky doprava.'] },
  { id: 'nedostatek', q: 'Kdy vzniká nedostatek (převis poptávky)?', right: 'Když je cena pod rovnovážnou úrovní, a poptávané množství proto převyšuje nabízené.', wrong: ['Když je cena nad rovnovážnou úrovní.', 'Když se křivka nabídky posune doprava.', 'Když poptávka klesne při stejné nabídce.'] },
  { id: 'substituty', q: 'Co jsou substituty?', right: 'Statky, které se vzájemně nahrazují, a zdražení jednoho zvyšuje poptávku po druhém.', wrong: ['Statky, které se spotřebovávají společně.', 'Statky, jejichž poptávka klesá s růstem důchodu.', 'Statky, které nikdo nepotřebuje.'] },
  { id: 'komplementy', q: 'Co jsou komplementy?', right: 'Statky, které se používají společně, takže zdražení jednoho snižuje poptávku po druhém.', wrong: ['Statky, které se vzájemně nahrazují.', 'Statky, jejichž nabídka klesá s cenou.', 'Statky s nulovou cenou.'] },
  { id: 'normalni-statek', q: 'Co je normální statek?', right: 'Statek, jehož poptávané množství s růstem důchodu roste.', wrong: ['Statek, jehož poptávané množství s růstem důchodu klesá.', 'Statek, který je vždy levný.', 'Statek, jehož cena se nikdy nemění.'] },
  { id: 'podradny-statek', q: 'Co je podřadný statek?', right: 'Statek, jehož poptávané množství s růstem důchodu klesá.', wrong: ['Statek, jehož poptávané množství s růstem důchodu roste.', 'Statek špatné kvality, který nikdo nekupuje.', 'Statek, který nemá žádný substitut.'] },
  { id: 'cenovy-strop', q: 'Co je cenový strop?', right: 'Nejvyšší cena stanovená státem; je-li pod rovnovážnou cenou, vzniká nedostatek.', wrong: ['Nejnižší cena stanovená státem, pod kterou se nesmí prodávat.', 'Cena, při které se trh nachází v rovnováze.', 'Cena, kterou stanovují sami výrobci.'] },
  { id: 'cenovy-prah', q: 'Co je cenový práh?', right: 'Nejnižší cena stanovená státem; je-li nad rovnovážnou cenou, vzniká přebytek.', wrong: ['Nejvyšší cena stanovená státem, nad kterou se nesmí prodávat.', 'Rovnovážná cena po posunu poptávky.', 'Cena, kterou platí stát za nákup výrobních faktorů.'] },
  { id: 'posun-vs-pohyb', q: 'Co způsobí změna ceny samotného statku (ceteris paribus)?', right: 'Pohyb po křivce poptávky (a po křivce nabídky), křivky se neposunou.', wrong: ['Posun křivky poptávky.', 'Posun křivky nabídky.', 'Posun obou křivek doprava.'] },
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
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti buď obracejí vztah (růst místo poklesu), nebo zaměňují pojmy. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// ---------- grafové úlohy na tabuli (zkouška) ----------
function buildGrafPosun({ eventId }) {
  const ev = eventById(eventId);
  const { viz } = shiftGraph(ev);
  return mk('graf-posun', {
    part: 'zkouska',
    data: { eventId, event: ev },
    task: `Nakreslete do grafu s osami P (cena) a Q (množství) poptávku a nabídku na trhu ${ev.market} a zakreslete, jak se projeví: „${ev.text}“ Vyznačte původní a novou rovnováhu.`,
    answerSpec: { kind: 'whiteboard', reference: viz.data && { kind: 'econ', data: viz.data } },
    conclusion: `Správně se posouvá křivka ${CURVE_WORD[ev.curve]} ${DIR_WORD[ev.dir]}.`,
    source: { chapter: 3, number: 2 },
    solution: shiftSteps(ev),
  });
}

function buildGrafRovnovaha({ a, b, c, d }) {
  const e = equilibrium({ a, b, c, d });
  return mk('graf-rovnovaha', {
    part: 'zkouska',
    data: { a, b, c, d },
    task: 'Nakreslete do jednoho grafu křivku poptávky a křivku nabídky. Vyznačte bod rovnováhy E a k němu rovnovážnou cenu PE a množství QE.',
    answerSpec: { kind: 'whiteboard', reference: marketViz({ a, b, c, d }, { points: [{ x: e.Q, y: e.P, label: 'E', guides: true }] }) },
    conclusion: 'Poptávka klesá, nabídka roste, protínají se v bodě E.',
    solution: [
      { title: 'Osy', text: 'Svislá osa je cena P, vodorovná množství Q. Obě začínají v nule.', board: [line('P\\uparrow,\\quad Q\\rightarrow')] },
      { title: 'Křivky', text: 'Poptávka D klesá zleva doprava (zákon poptávky), nabídka S roste (zákon nabídky).', board: [line('D\\searrow,\\quad S\\nearrow')] },
      { title: 'Rovnováha', text: 'V průsečíku je rovnováha E. Z něj vedou čárkované čáry na osy: rovnovážná cena PE a množství QE.', viz: marketViz({ a, b, c, d }) },
    ],
  });
}

function buildGrafRegulace({ a, b, c, d, limit }) {
  const e = equilibrium({ a, b, c, d });
  const strop = limit === 'strop';
  const price = strop ? e.P * 0.7 : e.P * 1.3;
  const qd = a - b * price; const qs = c + d * price;
  const graph = marketViz({ a, b, c, d }, {
    curves: [{ expr: `${price}`, label: strop ? 'Pmax' : 'Pmin', color: 'accent', dashed: true }],
    points: [{ x: e.Q, y: e.P, label: 'E' }, { x: qs, y: price, label: 'QS' }, { x: qd, y: price, label: 'QD' }],
  });
  return mk('graf-regulace', {
    part: 'zkouska',
    data: { a, b, c, d, limit },
    task: `Nakreslete trh a vyznačte ${strop ? 'cenový strop pod rovnovážnou cenou a vzniklý nedostatek' : 'cenový práh nad rovnovážnou cenou a vzniklý přebytek'}.`,
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: strop ? 'Při stropu pod rovnováhou je QD větší než QS: nedostatek.' : 'Při prahu nad rovnováhou je QS větší než QD: přebytek.',
    source: { chapter: 3, number: strop ? 15 : 16 },
    solution: [
      { title: 'Trh bez zásahu', text: 'Nakreslíme poptávku, nabídku a rovnováhu E.', viz: marketViz({ a, b, c, d }) },
      { title: strop ? 'Strop pod rovnováhou' : 'Práh nad rovnováhou', text: `Vodorovná čára ve výšce ${strop ? 'pod' : 'nad'} rovnovážnou cenou ukazuje regulovanou cenu.`, board: [line(strop ? 'P_{max}<P_E' : 'P_{min}>P_E')] },
      { title: strop ? 'Nedostatek' : 'Přebytek', text: `Čára protne obě křivky. Vzdálenost mezi QS a QD je ${strop ? 'nedostatek (QD > QS)' : 'přebytek (QS > QD)'}.`, viz: graph },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);
const randomEvent = (rng) => pick(rng, EVENTS).id;

const types = [
  type('rovnovaha', 'Rovnováha z rovnic Q = a − bP', genRovnovaha, buildRovnovaha),
  type('rovnovaha-inv', 'Rovnováha z rovnic P = A − BQ', genRovnovahaInv, buildRovnovahaInv),
  type('regulace', 'Cenový strop a cenový práh', genRegulace, buildRegulace),
  type('vykup', 'Výkup přebytků státem', genVykup, buildVykup),
  type('posun', 'Co posunulo křivku?', (rng) => buildPosun({ eventId: randomEvent(rng) }), buildPosun),
  type('zmena-rovnovahy', 'Jak se změní rovnováha?', (rng) => buildZmena({ eventId: randomEvent(rng) }), buildZmena),
  type('pohyb-posun', 'Posun křivky, nebo pohyb po křivce?', (rng) => buildPohyb({ eventId: pick(rng, ids(MOVE_EVENTS)) }), buildPohyb),
  type('subst-kompl', 'Substituty, komplementy a důchod', (rng) => buildRel({ item: int(rng, 0, REL_ITEMS.length - 1) }), buildRel),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-posun', 'Nakresli posun křivky (zkouška)', (rng) => buildGrafPosun({ eventId: randomEvent(rng) }), buildGrafPosun),
  type('graf-rovnovaha', 'Nakresli tržní rovnováhu (zkouška)', (rng) => {
    const e = genRovnovaha(rng).data; return buildGrafRovnovaha({ a: e.a, b: e.b, c: e.c, d: e.d });
  }, buildGrafRovnovaha),
  type('graf-regulace', 'Nakresli strop nebo práh (zkouška)', (rng) => {
    const r = genRegulace(rng).data; return buildGrafRegulace({ a: r.a, b: r.b, c: r.c, d: r.d, limit: r.limit });
  }, buildGrafRegulace),
];

// ---------- výklad ----------
const D0 = { expr: '50 - x/2', label: 'D', color: 'blue' };
const S0 = { expr: 'x - 10', label: 'S', color: 'chalk' };
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, 100], range: [0, 60], curves, ...extra } });

const theory = [
  { heading: 'Trh, kupující a prodávající', term: 'Trh',
    text: 'Trh je místo (nebo způsob), kde se potkávají kupující a prodávající a vzájemně směňují statky a služby za peníze. Na trhu vstupují do hry dva subjekty: spotřebitelé (domácnosti) tvoří stranu poptávky, firmy stranu nabídky.\n\nCena na trhu vzniká střetem obou stran: žádná z nich ji sama nestanoví, vzájemně se přizpůsobují.\n\nU každé úlohy musíte vždy rozhodnout, jestli se změna týká kupujících (poptávka), nebo prodávajících (nabídka).',
    mistakes: ['Nezaměňujte „poptávku“ (celá křivka) a „poptávané množství“ (jeden bod na křivce při určité ceně).'] },
  { heading: 'Poptávka a zákon poptávky', term: 'Zákon poptávky',
    text: 'Křivka poptávky ukazuje, kolik kusů statku chtějí kupující koupit při různých cenách. Na svislé ose je cena P, na vodorovné množství Q.\n\nZákon poptávky: za jinak stejných podmínek (ceteris paribus) růst ceny vyvolává pokles poptávaného množství. Křivka poptávky proto klesá.\n\nDůvody jsou dva: substituční efekt (při vyšší ceně lidé nahradí statek levnějším) a důchodový efekt (při vyšší ceně lidem stačí důchod na méně kusů).',
    viz: view([D0]), mistakes: ['Zákon poptávky platí „za jinak stejných podmínek“. Když se současně změní důchod nebo ceny jiných statků, může se křivka posunout, a zdánlivě pak zákon nesedí.'] },
  { heading: 'Co posouvá křivku poptávky', term: 'Změna poptávky',
    text: 'Změna ceny samotného statku vede jen k pohybu po křivce, protože cena je na ose. Celou křivku posouvají jiné činitele, tzv. necenové determinanty poptávky:\n\n• důchod: u normálního statku roste poptávka s růstem důchodu, u podřadného klesá,\n• ceny substitutů (zdražení substitutu zvýší poptávku) a komplementů (zdražení komplementu poptávku sníží),\n• vkus, móda, preference,\n• očekávání budoucího vývoje (cen, důchodu),\n• počet kupujících.\n\nPosun doprava znamená růst poptávky (při každé ceně se koupí víc), posun doleva pokles.',
    viz: view([{ ...D0, label: 'D0' }, { expr: '70 - x/2', label: 'D1', color: 'accent', dashed: true }, { expr: '30 - x/2', label: 'D2', color: 'green', dashed: true }], { arrows: [{ from: [20, 40], to: [40, 40], label: '' }] }),
    mistakes: ['Změna ceny statku neposune křivku poptávky. Pohyb po křivce a posun křivky jsou dvě různé věci.', 'Zdražení komplementu poptávku po statku snižuje, zdražení substitutu ji zvyšuje. Snadno se to zamění.'] },
  { heading: 'Nabídka a zákon nabídky', term: 'Zákon nabídky',
    text: 'Křivka nabídky ukazuje, kolik kusů jsou prodávající ochotni nabídnout při různých cenách.\n\nZákon nabídky: za jinak stejných podmínek růst ceny vyvolává růst nabízeného množství. Křivka nabídky proto roste.\n\nVyšší cena firmám umožní pokrýt vyšší náklady dalších kusů a láká do odvětví další výrobce.',
    viz: view([S0]) },
  { heading: 'Co posouvá křivku nabídky', term: 'Změna nabídky',
    text: 'Opět platí: změna ceny statku znamená pohyb po křivce nabídky, ostatní činitele křivku posouvají:\n\n• ceny výrobních faktorů (dražší práce nebo suroviny nabídku snižují),\n• technologie (lepší technologie nabídku zvyšuje),\n• daně a dotace (daň nabídku snižuje, dotace zvyšuje),\n• počet výrobců a konkurence,\n• očekávání, počasí u zemědělských statků.\n\nPosun doprava znamená růst nabídky, posun doleva pokles.',
    viz: view([{ ...S0, label: 'S0' }, { expr: 'x - 30', label: 'S1', color: 'accent', dashed: true }, { expr: 'x + 10', label: 'S2', color: 'green', dashed: true }], { arrows: [{ from: [30, 20], to: [50, 20], label: '' }] }),
    mistakes: ['Dražší vstupy posouvají nabídku doleva (ne doprava): náklady rostou, nabízí se méně.', 'Zlepšení technologie nabídku zvyšuje, křivka se posune doprava (dolů).'] },
  { heading: 'Tržní rovnováha', term: 'Rovnovážná cena',
    text: 'V bodě, kde se kříží poptávka a nabídka, je tržní rovnováha E. Cena $P_E$ se nazývá rovnovážná (též cena čistící trh) a množství $Q_E$ rovnovážné. Právě při této ceně chtějí kupující koupit stejně, kolik prodávající chtějí prodat.\n\nPro lineární křivky $Q_D = a - bP$ a $Q_S = c + dP$ dostaneme rovnováhu z podmínky $Q_D = Q_S$:',
    tex: 'P_E=\\frac{a-c}{b+d},\\qquad Q_E=a-b\\,P_E',
    viz: view([D0, S0], { points: [{ x: 40, y: 30, label: 'E', guides: true }] }),
    mistakes: ['Po výpočtu ceny nezapomeňte spočítat i množství (dosazením do jedné z rovnic).', 'Při rovnicích tvaru P = … (cena jako funkce množství) se v rovnováze porovnávají ceny, ne množství.'] },
  { heading: 'Nerovnováha: nedostatek a převis nabídky', term: 'Převis nabídky',
    text: 'Je-li cena nad rovnovážnou, nabízejí prodávající víc, než kupující koupí: vzniká převis nabídky (přebytek). Prodávající pak snižují cenu, až se vrátí k rovnováze.\n\nJe-li cena pod rovnovážnou, kupující chtějí víc, než prodávající nabídnou: vzniká převis poptávky (nedostatek). Cena pak tlačí vzhůru k rovnováze.\n\nVe výpočtu stačí do obou rovnic dosadit danou cenu a odečíst menší množství od většího.',
    viz: view([D0, S0], { points: [{ x: 40, y: 30, label: 'E' }, { x: 30, y: 40, label: 'QD' }, { x: 50, y: 40, label: 'QS' }] }),
    mistakes: ['Při ceně nad rovnovážnou je přebytek (nabídka), při ceně pod rovnovážnou nedostatek. Obráceně to zní logicky, ale není to tak.'] },
  { heading: 'Zásahy státu do ceny: strop a práh', term: 'Cenový strop',
    text: 'Cenový strop je nejvyšší cena, kterou stát dovolí. Má-li účinek, musí být pod rovnovážnou cenou. Důsledkem je nedostatek, např. při regulovaném nájemném.\n\nCenový práh (minimální cena) je nejnižší cena. Má-li účinek, musí být nad rovnovážnou. Důsledkem je přebytek, např. u výkupu zemědělských produktů. Stát přebytek někdy vykupuje; náklady jsou přebytek krát výkupní cena.\n\nRegulace mimo rovnováhu (strop nad rovnováhou nebo práh pod ní) žádný účinek nemá.',
    mistakes: ['Strop nad rovnovážnou cenou nic nezmění. Vždy nejdřív spočítejte rovnováhu a porovnejte ji s regulovanou cenou.'] },
];
// poslední oddíl: graf s vodorovnou čárou stropu pod rovnováhou
theory[theory.length - 1].viz = view([D0, S0, { expr: '20', label: 'Pmax', color: 'accent', dashed: true }], { points: [{ x: 40, y: 30, label: 'E' }, { x: 30, y: 20, label: 'QS' }, { x: 60, y: 20, label: 'QD' }] });

export default {
  id: 'trh', title: 'Trh a tržní mechanismus', order: 2, theory, types,
};
