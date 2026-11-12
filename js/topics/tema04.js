// Téma 4: Nabídka na trhu výrobků a služeb (podle skript kap. 5, prezentace 4 a cvičebnice kap. 5).
// Zisk, produkční funkce, náklady, izokvanta a izokosta, příjmy, zlaté pravidlo MR = MC a elasticita nabídky.
// Tvar souboru a pravidla viz tema02.js (theory + types, solve(data) staví celý příklad z dat).
//
// Odchylky od cvičebnice (v řešeních jsou chyby, přebírá se správná ekonomie):
//  - úkol ano/ne 5 f) (nákladové křivky jsou ekonomické, tedy včetně implicitních nákladů): kniha uvádí N, správně je A;
//  - příklad 14 c) (mezní náklady při Q = 5): kniha počítá derivaci TC (60); rozdílem TC(5) − TC(4) by vyšlo 44.
//    Úlohy v aplikaci proto výslovně říkají „mezní náklady jako derivace TC“.
import { minimumOf } from '../econ.js';
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'nabidka';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- drobné pomůcky ----------
const r2 = (x) => Math.round(x * 100) / 100;
const cell = (x) => String(r2(x)); // hodnota buňky tabulky (řetězec, kontrola s tolerancí 0,01)
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a * b) / gcd(a, b);
const arrayTex = (head, rows) => `\\begin{array}{|${head.map(() => 'c').join('|')}|}\\hline ${head.join(' & ')} \\\\ \\hline ${rows.map((r) => `${r.join(' & ')} \\\\ \\hline`).join(' ')}\\end{array}`;
const TABLE_TOL = 0.01;
const sourceOf = (number) => ({ chapter: 5, number });

// Graf grafu: osa x je množství (nebo množství vstupu), osa y peníze či jiná veličina.
const econ = (data) => ({ kind: 'econ', data });

// ---------- nákladové křivky tvaru U (TC = FC + aQ − bQ² + 0,5Q³) ----------
// Minimum AVC je v Q = b, minimum AC v Q = b + 1 (FC = (b + 1)²). Křivka MC protíná obě křivky v jejich minimech.
const costParams = (b) => ({ a: 5 * b, fc: (b + 1) ** 2 });
function costViz(b, parts = ['avc', 'ac', 'mc'], withPoints = false) {
  const { a, fc } = costParams(b);
  const avcMin = a - (b * b) / 2;
  const acMin = fc / (b + 1) + a - b * (b + 1) + 0.5 * (b + 1) ** 2;
  const all = {
    avc: { expr: `${a} - ${b}*x + 0.5*x^2`, label: 'AVC', color: 'green' },
    ac: { expr: `${fc}/x + ${a} - ${b}*x + 0.5*x^2`, label: 'AC', color: 'blue' },
    mc: { expr: `${a} - ${2 * b}*x + 1.5*x^2`, label: 'MC', color: 'accent' },
    afc: { expr: `${fc}/x`, label: 'AFC', color: 'chalk', dashed: true },
  };
  return econ({
    axes: { x: 'Q', y: 'Kč' }, domain: [0, 12], range: [0, 40],
    curves: parts.map((p) => all[p]),
    points: withPoints ? [{ x: b, y: avcMin, label: 'min AVC', guides: true }, { x: b + 1, y: acMin, label: 'min AC', guides: true }] : [],
    alt: 'Křivky MC, AC a AVC tvaru U; MC je protíná v jejich minimech',
  });
}

// ---------- produkt práce: AP = a + bL − L², MP = a + 2bL − 3L² (Q = aL + bL² − L³) ----------
function productViz(a, b, parts = ['ap', 'mp'], withPoint = false) {
  const all = {
    ap: { expr: `${a} + ${b}*x - x^2`, label: 'AP', color: 'blue' },
    mp: { expr: `${a} + ${2 * b}*x - 3*x^2`, label: 'MP', color: 'accent' },
  };
  return econ({
    axes: { x: 'L', y: 'AP, MP' }, domain: [0, 8], range: [0, 50],
    curves: parts.map((p) => all[p]),
    points: withPoint ? [{ x: b / 2, y: a + (b * b) / 4, label: 'max AP', guides: true }] : [],
    alt: 'Průměrný a mezní produkt práce: MP protíná AP v jeho maximu',
  });
}

// ---------- izokvanta Q = L·K a izokosta TC = wL + rK ----------
const isocostViz = ({ TC, w, r }, points = []) => econ({
  axes: { x: 'L', y: 'K' }, domain: [0, TC / w], range: [0, TC / r],
  curves: [{ expr: `(${TC} - ${w}*x)/${r}`, label: 'TC', color: 'accent' }],
  points, alt: 'Izokosta: všechny kombinace práce a kapitálu za dané celkové náklady',
});
function optimumViz({ TC, w, r }, parts = ['iso', 'cost', 'e']) {
  const L = TC / (2 * w); const K = TC / (2 * r); const Q = L * K;
  const curves = [];
  if (parts.includes('iso')) {
    curves.push({ expr: `${Q}/x`, label: 'Q', color: 'blue' });
    if (parts.includes('e')) {
      curves.push({ expr: `${Q / 2}/x`, label: 'Q nižší', color: 'chalk', dashed: true });
      curves.push({ expr: `${Q * 1.8}/x`, label: 'Q vyšší', color: 'chalk', dashed: true });
    }
  }
  if (parts.includes('cost')) curves.push({ expr: `(${TC} - ${w}*x)/${r}`, label: 'TC', color: 'accent' });
  return econ({
    axes: { x: 'L', y: 'K' }, domain: [0, TC / w], range: [0, TC / r],
    curves, points: parts.includes('e') ? [{ x: L, y: K, label: 'E', guides: true }] : [],
    alt: 'Nákladové optimum: izokvanta se dotýká izokosty v bodě E',
  });
}

// ---------- zlaté pravidlo (konkurence): MC = c + 2dQ, AC = fc/Q + c + dQ, MR = P ----------
const goldViz = ({ P, fc, c, d, Q }) => econ({
  axes: { x: 'Q', y: 'Kč' }, domain: [0, 2 * Q], range: [0, 2 * P],
  curves: [
    { expr: `${c} + ${2 * d}*x`, label: 'MC', color: 'accent' },
    { expr: `${fc}/x + ${c} + ${d}*x`, label: 'AC', color: 'green' },
    { expr: `${P}`, label: 'MR = P', color: 'blue' },
  ],
  points: [{ x: Q, y: P, label: 'E', guides: true }],
  alt: 'Zlaté pravidlo: výstup je v průsečíku MC a MR',
});

// =====================================================================================
// 1. účetní a ekonomický zisk
// =====================================================================================
function buildZisk({ tr, explicit, implicit, ask }) {
  const eco = ask === 'ekonomicky';
  const acct = tr - explicit;
  const profit = eco ? acct - implicit : acct;
  const meaning = profit > 0 ? 'Firma vydělává víc, než by majitel získal jinde.' : profit === 0 ? 'Firma dosahuje jen normálního zisku: pokryla všechny náklady včetně obětované příležitosti.' : 'Majitel by si jinde polepšil, protože firma nepokryla implicitní náklady.';
  return mk('ucetni-zisk', {
    data: { tr, explicit, implicit, ask },
    task: `Firma prodala za rok výrobky za ${czText(tr)} tis. Kč. Explicitní náklady (skutečně zaplacené suroviny, mzdy a nájem) činily ${czText(explicit)} tis. Kč. Majitel by za svůj čas a kapitál jinde vydělal ${czText(implicit)} tis. Kč ročně (implicitní náklady). Určete ${eco ? 'ekonomický' : 'účetní'} zisk v tis. Kč.`,
    answerSpec: { kind: 'number', value: profit },
    conclusion: `${eco ? 'Ekonomický' : 'Účetní'} zisk je ${czText(profit)} tis. Kč. ${eco ? meaning : `Ekonomický zisk by byl ${czText(acct - implicit)} tis. Kč.`}`,
    source: sourceOf(5),
    solution: [
      { title: 'Dvojí pojetí nákladů', text: 'Explicitní náklady jsou skutečné peněžní výdaje. Implicitní náklady firma nikomu neplatí: jsou to ušlé příjmy z vlastních zdrojů majitele (obětovaná příležitost).',
        board: [line(`N_{expl}=${cz(explicit)}`), line(`N_{impl}=${cz(implicit)}`)] },
      { title: 'Účetní zisk', text: 'Účetní zisk bere v úvahu jen explicitní náklady: od příjmů odečteme skutečné výdaje.',
        board: [line(`\\pi_{\\text{účetní}}=TR-N_{expl}=${cz(tr)}-${cz(explicit)}=${cz(acct)}`)] },
      { title: 'Ekonomický zisk', text: 'Ekonomický zisk odečítá i implicitní náklady, takže je o jejich velikost menší než účetní zisk.',
        board: [line(`\\pi_{\\text{ekon}}=TR-N_{expl}-N_{impl}=${cz(acct)}-${cz(implicit)}=${cz(acct - implicit)}`)] },
      { title: 'Závěr', text: `Hledaný ${eco ? 'ekonomický' : 'účetní'} zisk je ${czText(profit)} tis. Kč. ${eco ? meaning : 'Účetní zisk implicitní náklady nezahrnuje.'}`,
        board: [result(`\\pi_{\\text{${eco ? 'ekon' : 'účetní'}}}=${cz(profit)}`)] },
    ],
  });
}
function genZisk(rng) {
  const tr = 100 * int(rng, 5, 12);
  return buildZisk({ tr, explicit: tr - 10 * int(rng, 10, 30), implicit: 10 * int(rng, 5, 40), ask: pick(rng, ['ucetni', 'ekonomicky']) });
}

// =====================================================================================
// 2. mezní a průměrný produkt z tabulky (tabulka)
// =====================================================================================
function buildMezniProdukt({ tp }) {
  const n = tp.length;
  const mp = tp.map((v, i) => v - (i ? tp[i - 1] : 0));
  const ap = tp.map((v, i) => v / (i + 1));
  const rows = tp.map((_, i) => [cell(mp[i]), cell(ap[i])]);
  const Ls = tp.map((_, i) => i + 1);
  const maxAp = ap.indexOf(Math.max(...ap)) + 1;
  const firstFall = mp.findIndex((v, i) => i > 0 && v < mp[i - 1]);
  return mk('mezni-produkt', {
    data: { tp },
    task: 'Tabulka ukazuje celkový produkt TP firmy podle počtu pracovníků L (ostatní vstupy jsou fixní). Pro každý počet pracovníků vypočtěte mezní produkt MP a průměrný produkt AP. Do tabulky vyplňte v každém řádku nejprve MP, potom AP (řádky odpovídají L = 1 až ' + n + '); zaokrouhlete na dvě desetinná místa.',
    promptTex: arrayTex(['L', ...Ls.map(String)], [['TP', ...tp.map(cz)]]),
    answerSpec: { kind: 'table', value: rows, tol: TABLE_TOL },
    conclusion: `Mezní produkt: ${mp.map(czText).join('; ')}. Průměrný produkt: ${ap.map((v) => czText(r2(v))).join('; ')}.`,
    source: sourceOf(1),
    solution: [
      { title: 'Vzorce', text: 'Mezní produkt je přírůstek celkového produktu při přidání jednoho pracovníka. Průměrný produkt je celkový produkt na jednoho pracovníka.',
        board: [line('MP=\\frac{\\Delta TP}{\\Delta L}'), line('AP=\\frac{TP}{L}')] },
      { title: 'Mezní produkt', text: 'U prvního pracovníka je přírůstek celý jeho produkt (před ním firma nevyráběla nic). U dalších odečteme předchozí hodnotu TP.',
        board: tp.map((v, i) => line(i === 0 ? `MP_1=${cz(v)}-0=${cz(mp[0])}` : `MP_${i + 1}=${cz(v)}-${cz(tp[i - 1])}=${cz(mp[i])}`)) },
      { title: 'Průměrný produkt', text: 'Celkový produkt vydělíme počtem pracovníků.',
        board: tp.map((v, i) => line(`AP_${i + 1}=\\frac{${cz(v)}}{${i + 1}}=${cz(r2(ap[i]))}`)) },
      { title: 'Zákon klesajících mezních výnosů', text: `${firstFall === -1 ? 'Mezní produkt roste.' : `Mezní produkt klesá od ${firstFall + 1}. pracovníka (a také celkový produkt roste čím dál pomaleji).`} Průměrný produkt je největší u ${maxAp}. pracovníka. Dokud je MP větší než AP, průměr roste; jakmile je MP menší, průměr klesá.`,
        board: [line(`AP_{max}=${cz(r2(ap[maxAp - 1]))}\\ (L=${maxAp})`)] },
      { title: 'Výsledek', text: `Vyplněná tabulka (MP; AP): ${rows.map((r, i) => `L = ${i + 1}: ${czText(Number(r[0]))}; ${czText(Number(r[1]))}`).join(' | ')}.`,
        board: [result(`MP:\\ ${mp.map(cz).join(';\\ ')}\\quad AP:\\ ${ap.map((v) => cz(r2(v))).join(';\\ ')}`)] },
    ],
  });
}
function genMezniProdukt(rng) {
  for (let i = 0; i < 300; i++) {
    const n = pick(rng, [4, 5]);
    const ap = [int(rng, 10, 60)];
    const steps = [[5, 25], [-5, 15], [-15, 5], [-20, 0]];
    for (let k = 1; k < n; k++) ap.push(ap[k - 1] + int(rng, ...steps[k - 1]));
    const tp = ap.map((v, k) => (k + 1) * v);
    const mp = tp.map((v, k) => v - (k ? tp[k - 1] : 0));
    if (mp.every((v) => v > 0) && mp[n - 1] < mp[n - 2] && ap[n - 1] > 0) return buildMezniProdukt({ tp });
  }
  return buildMezniProdukt({ tp: [500, 1300, 1900, 2300, 2500] });
}

// =====================================================================================
// 3. produkční funkce Q = aL + bL² − cL³: mezní a průměrný produkt
// =====================================================================================
function buildProdFunkce({ a, b, c, L, ask }) {
  const mpAt = a + 2 * b * L - 3 * c * L * L;
  const apAt = a + b * L - c * L * L;
  const isMp = ask === 'MP';
  const value = isMp ? mpAt : apAt;
  const qTex = `Q=${cz(a)}L+${coef(b, 'L^2')}-${coef(c, 'L^3')}`;
  return mk('prod-polynom', {
    data: { a, b, c, L, ask },
    task: `Krátkodobá produkční funkce firmy je zadána rovnicí (Q je výstup, L množství práce). Určete ${isMp ? 'mezní produkt práce MP' : 'průměrný produkt práce AP'} při použití ${L} jednotek práce.`,
    promptTex: qTex,
    answerSpec: { kind: 'number', value },
    conclusion: `${isMp ? 'Mezní' : 'Průměrný'} produkt práce při L = ${L} je ${czText(value)}.`,
    source: sourceOf(4),
    solution: [
      { title: 'Mezní produkt jako derivace', text: 'Mezní produkt práce je přírůstek výstupu při přidání jednotky práce. U spojité funkce ho dostaneme derivací Q podle L.',
        board: [line(qTex), line(`MP=\\frac{dQ}{dL}=${cz(a)}+${coef(2 * b, 'L')}-${coef(3 * c, 'L^2')}`)] },
      { title: 'Průměrný produkt', text: 'Průměrný produkt je výstup na jednotku práce, tedy celou produkční funkci vydělíme L.',
        board: [line(`AP=\\frac{Q}{L}=${cz(a)}+${coef(b, 'L')}-${coef(c, 'L^2')}`)] },
      { title: `Dosadíme L = ${L}`, text: `Do vzorce pro ${isMp ? 'mezní' : 'průměrný'} produkt dosadíme ${L} jednotek práce.`,
        board: [line(isMp ? `MP=${cz(a)}+${cz(2 * b)}\\cdot ${L}-${cz(3 * c)}\\cdot ${L}^2` : `AP=${cz(a)}+${cz(b)}\\cdot ${L}-${cz(c)}\\cdot ${L}^2`),
          line(isMp ? `MP=${cz(a)}+${cz(2 * b * L)}-${cz(3 * c * L * L)}` : `AP=${cz(a)}+${cz(b * L)}-${cz(c * L * L)}`)] },
      { title: 'Výsledek', text: `${isMp ? 'Mezní' : 'Průměrný'} produkt práce je při ${L} jednotkách práce ${czText(value)}. Druhá veličina vychází ${isMp ? `AP = ${czText(apAt)}` : `MP = ${czText(mpAt)}`}${mpAt > apAt ? ', MP je větší než AP, takže průměrný produkt ještě roste' : ', MP je menší než AP, takže průměrný produkt už klesá'}.`,
        board: [result(`${isMp ? 'MP' : 'AP'}(${L})=${cz(value)}`)] },
    ],
  });
}
function genProdFunkce(rng) {
  for (let i = 0; i < 200; i++) {
    const a = 10 * int(rng, 5, 20); const b = 5 * int(rng, 2, 8); const c = int(rng, 1, 4); const L = int(rng, 3, 10);
    if (a + 2 * b * L - 3 * c * L * L > 0 && a + b * L - c * L * L > 0) return buildProdFunkce({ a, b, c, L, ask: pick(rng, ['MP', 'AP']) });
  }
  return buildProdFunkce({ a: 150, b: 40, c: 3, L: 6, ask: 'MP' });
}

// =====================================================================================
// 4. produkční funkce Q = m·√(L·K)
// =====================================================================================
function buildCD({ m, L, K, ask }) {
  const root = Math.round(Math.sqrt(L * K));
  const Q = m * root;
  const askQ = ask === 'Q';
  const mTex = m === 1 ? '' : String(m);
  const fTex = `Q=${mTex}\\sqrt{L\\cdot K}`;
  const value = askQ ? Q : K;
  return mk('cobb-douglas', {
    data: { m, L, K, ask },
    task: askQ
      ? `Pekárna vyrábí podle produkční funkce (Q je počet bochníků týdně, L odpracované hodiny, K strojové hodiny). Kolik bochníků vyrobí při L = ${L} a K = ${K}?`
      : `Pekárna vyrábí podle produkční funkce (Q je počet bochníků týdně, L odpracované hodiny, K strojové hodiny). Kolik strojových hodin K potřebuje na výrobu Q = ${Q} bochníků, použije-li L = ${L} hodin práce?`,
    promptTex: fTex,
    answerSpec: { kind: 'number', value },
    conclusion: askQ ? `Pekárna vyrobí ${czText(Q)} bochníků.` : `Potřebuje K = ${czText(K)} strojových hodin.`,
    source: sourceOf(5),
    solution: askQ ? [
      { title: 'Dosadíme do produkční funkce', text: 'Do produkční funkce dosadíme dané množství práce a kapitálu.',
        board: [line(fTex), line(`Q=${mTex}\\sqrt{${cz(L)}\\cdot ${cz(K)}}`)] },
      { title: 'Vynásobíme a odmocníme', text: 'Pod odmocninou je součin L a K, který je druhou mocninou celého čísla.',
        board: [line(`L\\cdot K=${cz(L * K)}`), line(`\\sqrt{${cz(L * K)}}=${cz(root)}`)] },
      { title: 'Výsledek', text: `Výstup je ${m === 1 ? '' : `${m} krát `}${czText(root)}, tedy ${czText(Q)} bochníků týdně.`,
        board: [result(`Q=${m === 1 ? '' : `${m}\\cdot `}${cz(root)}=${cz(Q)}`)] },
    ] : [
      { title: 'Dosadíme Q a L', text: 'Do produkční funkce dosadíme známý výstup a množství práce. Neznámé je K.',
        board: [line(fTex), line(`${cz(Q)}=${mTex}\\sqrt{${cz(L)}\\cdot K}`)] },
      { title: 'Osamostatníme odmocninu', text: `Rovnici vydělíme číslem ${m} (pokud je větší než 1), aby odmocnina zůstala sama.`,
        board: [line(`\\sqrt{${cz(L)}\\cdot K}=${cz(Q / m)}`)] },
      { title: 'Umocníme na druhou', text: 'Obě strany umocníme na druhou, odmocnina zmizí.',
        board: [line(`${cz(L)}\\cdot K=${cz((Q / m) ** 2)}`)] },
      { title: 'Výsledek', text: `Vydělíme číslem ${L} a dostaneme K = ${czText(K)} strojových hodin.`,
        board: [result(`K=\\frac{${cz((Q / m) ** 2)}}{${cz(L)}}=${cz(K)}`)] },
    ],
  });
}
function genCD(rng) {
  for (let i = 0; i < 100; i++) {
    const u = pick(rng, [1, 4, 9]); const s = int(rng, 2, 5); const t = int(rng, 2, 5);
    const L = u * s * s; const K = u * t * t;
    if (L <= 500 && K <= 500) return buildCD({ m: pick(rng, [1, 2, 3]), L, K, ask: pick(rng, ['Q', 'K']) });
  }
  return buildCD({ m: 2, L: 100, K: 100, ask: 'Q' });
}

// =====================================================================================
// 5. výnosy z rozsahu (výběr)
// =====================================================================================
const SCALE_OPTIONS = [
  { id: 'rost', text: 'Rostoucí výnosy z rozsahu' },
  { id: 'konst', text: 'Konstantní výnosy z rozsahu' },
  { id: 'klesa', text: 'Klesající výnosy z rozsahu' },
];
const K_WORD = { 2: 'dvakrát', 3: 'třikrát' };
function buildVynosy({ q0, k, q1 }) {
  const ratio = q1 / q0;
  const id = ratio > k + 1e-9 ? 'rost' : ratio < k - 1e-9 ? 'klesa' : 'konst';
  const word = { rost: 'větší než', konst: 'rovný', klesa: 'menší než' }[id];
  return mk('vynosy-rozsah', {
    data: { q0, k, q1 },
    task: `Firma vyrábí ${czText(q0)} kusů týdně. Když zvýšila všechny vstupy (práci i kapitál) ${K_WORD[k] ?? `${k}krát`}, výstup vzrostl na ${czText(q1)} kusů. Jaké výnosy z rozsahu firma vykazuje?`,
    answerSpec: { kind: 'choice', value: id, options: SCALE_OPTIONS },
    conclusion: `${SCALE_OPTIONS.find((o) => o.id === id).text}.`,
    source: sourceOf(7),
    solution: [
      { title: 'Co se změnilo', text: `Všechny vstupy se zvětšily ve stejném poměru, a to ${k}krát. Právě při takové změně se posuzují výnosy z rozsahu.`,
        board: [line(`\\text{vstupy}\\ \\times ${k}`)] },
      { title: 'Poměr výstupů', text: 'Vydělíme nový výstup původním a zjistíme, kolikrát vzrostl.',
        board: [line(`\\frac{Q_1}{Q_0}=\\frac{${cz(q1)}}{${cz(q0)}}=${cz(ratio)}`)] },
      { title: 'Porovnání se změnou vstupů', text: `Výstup vzrostl ${czText(ratio)}krát, vstupy ${k}krát. Poměr výstupů je ${word} poměr vstupů.`,
        board: [line(`${cz(ratio)}\\ ${id === 'rost' ? '>' : id === 'klesa' ? '<' : '='}\\ ${k}`)] },
      { title: 'Závěr', text: `Platí: ${id === 'rost' ? 'výstup roste rychleji než vstupy' : id === 'klesa' ? 'výstup roste pomaleji než vstupy' : 'výstup roste stejně jako vstupy'}. Jde tedy o ${SCALE_OPTIONS.find((o) => o.id === id).text.toLowerCase()}.`,
        board: [result(id === 'rost' ? '\\text{rostoucí}' : id === 'klesa' ? '\\text{klesající}' : '\\text{konstantní}')] },
    ],
  });
}
function genVynosy(rng) {
  const k = pick(rng, [2, 3]);
  const ratio = pick(rng, k === 2 ? [1.4, 1.6, 1.8, 2, 2.2, 2.5] : [2, 2.4, 2.7, 3, 3.3, 3.6]);
  const q0 = 100 * int(rng, 1, 4);
  return buildVynosy({ q0, k, q1: Math.round(q0 * ratio) });
}

// =====================================================================================
// 6. mezní míra technické substituce
// =====================================================================================
function buildMrts({ ask, dL, dK, mpl, mpk }) {
  const viaIso = ask === 'izokvanta';
  const value = viaIso ? dK / dL : mpl / mpk;
  return mk('mrts', {
    data: { ask, dL, dK, mpl, mpk },
    task: viaIso
      ? `Firma vyrábí na izokvantě stále stejný objem produkce. Když použije o ${dL} jednotek práce víc, může o ${dK} jednotek kapitálu ubrat. Určete mezní míru technické substituce MRTS (kapitálu prací).`
      : `V bodě na izokvantě je mezní produkt práce ${mpl} kusů a mezní produkt kapitálu ${mpk} kusů. Určete mezní míru technické substituce MRTS.`,
    answerSpec: { kind: 'number', value },
    conclusion: `MRTS = ${czText(value)}.`,
    solution: viaIso ? [
      { title: 'Co MRTS říká', text: 'MRTS je poměr, v němž lze kapitál nahrazovat prací bez změny výstupu. Je to absolutní hodnota směrnice izokvanty.',
        board: [line('MRTS=\\left|\\frac{\\Delta K}{\\Delta L}\\right|')] },
      { title: 'Změny vstupů', text: 'Práce se zvýší (kladná změna), kapitálu ubude (záporná změna).',
        board: [line(`\\Delta L=+${cz(dL)}`), line(`\\Delta K=-${cz(dK)}`)] },
      { title: 'Dosadíme', text: 'Absolutní hodnota podílu změn je hledaná MRTS. Při pohybu po izokvantě dolů MRTS klesá, a proto je izokvanta konvexní.',
        board: [line(`MRTS=\\left|\\frac{-${cz(dK)}}{${cz(dL)}}\\right|`)] },
      { title: 'Výsledek', text: `Za každou jednotku práce navíc firma ušetří ${czText(value)} jednotky kapitálu, MRTS = ${czText(value)}.`,
        board: [result(`MRTS=${cz(value)}`)] },
    ] : [
      { title: 'MRTS a mezní produkty', text: 'Přidáním práce výstup roste o MPL na jednotku, ubráním kapitálu výstup klesá o MPK na jednotku. Aby výstup zůstal stejný, musí se oba přírůstky vyrovnat.',
        board: [line('\\Delta L\\cdot MP_L=\\Delta K\\cdot MP_K')] },
      { title: 'Odvození poměru', text: 'Rovnici upravíme tak, aby vlevo vyšel podíl ΔK a ΔL, tedy MRTS.',
        board: [line('MRTS=\\left|\\frac{\\Delta K}{\\Delta L}\\right|=\\frac{MP_L}{MP_K}')] },
      { title: 'Dosadíme', text: 'Do poměru mezních produktů dosadíme zadané hodnoty.',
        board: [line(`MRTS=\\frac{${cz(mpl)}}{${cz(mpk)}}`)] },
      { title: 'Výsledek', text: `Poměr vychází ${czText(value)}.`, board: [result(`MRTS=${cz(value)}`)] },
    ],
  });
}
function genMrts(rng) {
  const r = pick(rng, [1.5, 2, 2.5, 3, 4]);
  if (rng() < 0.5) {
    for (let i = 0; i < 50; i++) {
      const dL = pick(rng, [2, 4]);
      if (Number.isInteger(dL * r)) return buildMrts({ ask: 'izokvanta', dL, dK: dL * r, mpl: 0, mpk: 0 });
    }
  }
  const mpk = pick(rng, [10, 20, 30, 40]);
  return buildMrts({ ask: 'mp', dL: 0, dK: 0, mpl: mpk * r, mpk });
}

// =====================================================================================
// 7. izokosta (číselně) a její rovnice (výraz)
// =====================================================================================
function buildIzokosta({ TC, w, r, ask, L }) {
  const askK0 = ask === 'K0'; const askL0 = ask === 'L0';
  const K0 = TC / r; const L0 = TC / w;
  const value = askK0 ? K0 : askL0 ? L0 : (TC - w * L) / r;
  const points = [{ x: 0, y: K0, label: `K=${czText(K0)}` }, { x: L0, y: 0, label: `L=${czText(L0)}` }];
  if (ask === 'K') points.push({ x: L, y: value, label: 'B' });
  const what = askK0 ? `Kolik jednotek kapitálu může firma koupit, jestliže práci nekoupí vůbec?` : askL0 ? `Kolik jednotek práce může firma koupit, jestliže kapitál nekoupí vůbec?` : `Kolik jednotek kapitálu může firma koupit při použití ${L} jednotek práce, jestliže vydá všechny peníze?`;
  return mk('izokosta-bod', {
    data: { TC, w, r, ask, L },
    task: `Firma má na nákup výrobních faktorů ${czText(TC)} Kč. Jednotka práce stojí ${czText(w)} Kč, jednotka kapitálu ${czText(r)} Kč. ${what}`,
    answerSpec: { kind: 'number', value },
    conclusion: `Firma může koupit ${czText(value)} jednotek ${askL0 ? 'práce' : 'kapitálu'}.`,
    source: sourceOf(2),
    solution: [
      { title: 'Rovnice izokosty', text: 'Izokosta (linie stejných nákladů) obsahuje všechny kombinace práce L a kapitálu K, které firma pořídí za dané celkové náklady TC.',
        board: [line('TC=w\\cdot L+r\\cdot K')] },
      { title: 'Dosadíme ceny a náklady', text: 'Za TC, cenu práce w a cenu kapitálu r dosadíme zadané hodnoty.',
        board: [line(`${cz(TC)}=${cz(w)}L+${cz(r)}K`)] },
      { title: askK0 ? 'Bez práce' : askL0 ? 'Bez kapitálu' : `Při L = ${L}`,
        text: askK0 ? 'Když práci nekoupíme, je L = 0 a všechny peníze jdou na kapitál. Dostáváme průsečík izokosty s osou kapitálu.' : askL0 ? 'Když kapitál nekoupíme, je K = 0 a všechny peníze jdou na práci. Dostáváme průsečík izokosty s osou práce.' : 'Za L dosadíme danou hodnotu a z rovnice vyjádříme K.',
        board: askK0 ? [line(`${cz(TC)}=${cz(r)}K`), result(`K=\\frac{${cz(TC)}}{${cz(r)}}=${cz(value)}`)]
          : askL0 ? [line(`${cz(TC)}=${cz(w)}L`), result(`L=\\frac{${cz(TC)}}{${cz(w)}}=${cz(value)}`)]
            : [line(`${cz(TC)}=${cz(w)}\\cdot ${cz(L)}+${cz(r)}K`), line(`${cz(r)}K=${cz(TC - w * L)}`), result(`K=\\frac{${cz(TC - w * L)}}{${cz(r)}}=${cz(value)}`)] },
      { title: 'Graf izokosty', text: `Přímka spojuje body ${czText(K0)} jednotek kapitálu na svislé ose a ${czText(L0)} jednotek práce na vodorovné. Hledaná hodnota je ${czText(value)}.`,
        viz: isocostViz({ TC, w, r }, points) },
    ],
  });
}
function genIzokosta(rng) {
  const w = pick(rng, [2, 4, 5, 10]); const r = pick(rng, [2, 4, 5, 10]);
  const TC = lcm(w, r) * int(rng, 3, 10);
  const ask = pick(rng, ['K0', 'L0', 'K']);
  const L0 = TC / w;
  const valid = [];
  for (let L = 1; L < L0; L++) if ((TC - w * L) % r === 0) valid.push(L);
  if (ask === 'K' && valid.length) return buildIzokosta({ TC, w, r, ask, L: pick(rng, valid) });
  return buildIzokosta({ TC, w, r, ask: ask === 'K' ? 'K0' : ask, L: 0 });
}

function buildIzokostaRovnice({ TC, w, r }) {
  const expr = `(${TC} - ${w}*L)/${r}`;
  return mk('izokosta-rovnice', {
    data: { TC, w, r },
    task: `Cena jednotky práce je ${czText(w)} Kč, cena jednotky kapitálu ${czText(r)} Kč a firma má celkové náklady ${czText(TC)} Kč. Zapište rovnici izokosty tak, že vyjádříte množství kapitálu K jako výraz v proměnné L (do pole napište jen pravou stranu, například $30-3L$).`,
    answerSpec: { kind: 'expression', value: expr, variable: 'L' },
    conclusion: `K = ${czText(TC / r)} − ${czText(w / r)}·L (po úpravě totéž, co (${czText(TC)} − ${czText(w)}·L)/${czText(r)}).`,
    source: sourceOf(2),
    solution: [
      { title: 'Obecná rovnice izokosty', text: 'Celkové náklady jsou součet výdajů za práci a za kapitál.',
        board: [line('TC=w\\cdot L+r\\cdot K')] },
      { title: 'Dosadíme zadané hodnoty', text: 'Za celkové náklady a obě ceny dosadíme čísla.',
        board: [line(`${cz(TC)}=${cz(w)}L+${cz(r)}K`)] },
      { title: 'Vyjádříme K', text: 'Člen s L převedeme na druhou stranu a rovnici vydělíme cenou kapitálu.',
        board: [line(`${cz(r)}K=${cz(TC)}-${cz(w)}L`), result(`K=\\frac{${cz(TC)}-${cz(w)}L}{${cz(r)}}=${cz(TC / r)}-${cz(w / r)}L`)] },
      { title: 'Graf a význam', text: `Přímka protíná osu kapitálu v hodnotě ${czText(TC / r)} a osu práce v hodnotě ${czText(TC / w)}. Směrnice je ${czText(-w / r)}, tedy záporná poměrem cen.`,
        viz: isocostViz({ TC, w, r }) },
    ],
  });
}
function genIzokostaRovnice(rng) {
  const w = pick(rng, [2, 4, 5, 10]); const r = pick(rng, [2, 4, 5, 10]);
  return buildIzokostaRovnice({ TC: lcm(w, r) * int(rng, 3, 10), w, r });
}

// =====================================================================================
// 8. nákladové optimum z tabulky poměrů MPPL/MPPK (výběr kombinace)
// =====================================================================================
const RATIO_SETS = [[4, 3.5, 3, 2.5, 2], [5, 4, 3, 2.5, 2], [3, 2.5, 2, 1.5, 1], [6, 5, 4, 3, 2], [2.5, 2, 1.5, 1, 0.5]];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
function buildOptimumKomb({ ratios, pl, pk, plNew, ask }) {
  const target = ask === 'nova' ? plNew / pk : pl / pk;
  const idx = ratios.findIndex((v) => Math.abs(v - target) < 1e-9);
  const idxOld = ratios.findIndex((v) => Math.abs(v - pl / pk) < 1e-9);
  const options = LETTERS.map((l, i) => ({ id: l, text: `Kombinace ${l} (MPPL/MPPK = ${czText(ratios[i])})` }));
  const cheaper = plNew < pl;
  return mk('optimum-kombinace', {
    data: { ratios, pl, pk, plNew, ask },
    task: `Firma si může vybrat z kombinací práce a kapitálu A až E. Poměry mezních fyzických produktů MPPL/MPPK pro jednotlivé kombinace jsou v tabulce. Cena práce je ${czText(pl)} Kč a cena kapitálu ${czText(pk)} Kč. ${ask === 'nova' ? `Potom se cena práce změní na ${czText(plNew)} Kč (cena kapitálu zůstane). Která kombinace je nyní optimální (minimalizuje náklady)?` : 'Při které kombinaci vstupů firma minimalizuje náklady?'}`,
    promptTex: arrayTex(['\\text{Kombinace}', ...LETTERS], [['\\frac{MPP_L}{MPP_K}', ...ratios.map(cz)]]),
    answerSpec: { kind: 'choice', value: LETTERS[idx], options },
    conclusion: `Optimální je kombinace ${LETTERS[idx]}.`,
    source: sourceOf(2),
    solution: [
      { title: 'Pravidlo minimalizace nákladů', text: 'Firma minimalizuje náklady, když poslední koruna utracená za práci přinese stejný výstup jako poslední koruna za kapitál. Po úpravě to znamená, že se poměr mezních produktů rovná poměru cen.',
        board: [line('\\frac{MPP_L}{P_L}=\\frac{MPP_K}{P_K}'), line('\\frac{MPP_L}{MPP_K}=\\frac{P_L}{P_K}')] },
      ...(ask === 'nova' ? [{ title: 'Původní optimum', text: `Při původních cenách je poměr cen ${czText(pl / pk)}, takže původní optimum je kombinace ${LETTERS[idxOld]}.`,
        board: [line(`\\frac{${cz(pl)}}{${cz(pk)}}=${cz(pl / pk)}\\ \\Rightarrow\\ ${LETTERS[idxOld]}`)] }] : []),
      { title: ask === 'nova' ? 'Nový poměr cen' : 'Poměr cen', text: `${ask === 'nova' ? `Cena práce ${cheaper ? 'klesla' : 'vzrostla'} na ${czText(plNew)} Kč, takže nový poměr cen je ${czText(plNew / pk)}. ${cheaper ? 'Práce zlevnila, firma ji tedy používá víc a poměr MPPL/MPPK klesne.' : 'Práce zdražila, firma ji tedy používá méně a poměr MPPL/MPPK vzroste.'}` : `Poměr cen práce a kapitálu je ${czText(pl / pk)}.`}`,
        board: [line(`\\frac{P_L}{P_K}=\\frac{${cz(ask === 'nova' ? plNew : pl)}}{${cz(pk)}}=${cz(target)}`)] },
      { title: 'Najdeme kombinaci', text: `V tabulce hledáme kombinaci, kde je MPPL/MPPK rovno ${czText(target)}. To splňuje kombinace ${LETTERS[idx]}.`,
        board: [result(`\\text{kombinace}\\ ${LETTERS[idx]}`)] },
    ],
  });
}
function genOptimumKomb(rng) {
  const ratios = pick(rng, RATIO_SETS);
  const pk = pick(rng, [2, 4]);
  const i = int(rng, 0, 4);
  let j = int(rng, 0, 4); if (j === i) j = (i + 2) % 5;
  return buildOptimumKomb({ ratios, pl: ratios[i] * pk, pk, plNew: ratios[j] * pk, ask: pick(rng, ['puvodni', 'nova']) });
}

// =====================================================================================
// 9. mezní produkt kapitálu z pravidla minimalizace nákladů
// =====================================================================================
function buildMppk({ w, r, k }) {
  const mpl = w * k; const mpk = r * k;
  return mk('mppk-pravidlo', {
    data: { w, r, k },
    task: `Mzda dělníka je ${czText(w)} Kč za hodinu, náklady na provoz stroje ${czText(r)} Kč za hodinu. Mezní fyzický produkt práce je ${czText(mpl)} kusů výrobků za hodinu. Jaký je mezní fyzický produkt stroje (v kusech za hodinu), jestliže firma minimalizuje náklady?`,
    answerSpec: { kind: 'number', value: mpk },
    conclusion: `Mezní fyzický produkt stroje je ${czText(mpk)} kusů za hodinu.`,
    source: sourceOf(3),
    solution: [
      { title: 'Pravidlo minimalizace nákladů', text: 'V nákladovém optimu přinese každá koruna utracená za práci stejný přírůstek výstupu jako každá koruna utracená za kapitál (stroj).',
        board: [line('\\frac{MPP_L}{P_L}=\\frac{MPP_K}{P_K}')] },
      { title: 'Dosadíme', text: 'Dosadíme mzdu, cenu provozu stroje a mezní produkt práce.',
        board: [line(`\\frac{${cz(mpl)}}{${cz(w)}}=\\frac{MPP_K}{${cz(r)}}`), line(`${cz(mpl / w)}=\\frac{MPP_K}{${cz(r)}}`)] },
      { title: 'Vyjádříme MPPK', text: 'Obě strany vynásobíme cenou provozu stroje.',
        board: [line(`MPP_K=${cz(mpl / w)}\\cdot ${cz(r)}`)] },
      { title: 'Výsledek', text: `Koruna práce dá ${czText(mpl / w)} kusů, stejně musí dát i koruna kapitálu. Stroj proto má mezní produkt ${czText(mpk)} kusů za hodinu.`,
        board: [result(`MPP_K=${cz(mpk)}`)] },
    ],
  });
}
function genMppk(rng) {
  return buildMppk({ w: pick(rng, [20, 30, 40, 50, 60]), r: pick(rng, [100, 150, 200, 250, 300]), k: int(rng, 2, 6) });
}

// =====================================================================================
// 10. fixní a celkové náklady z krátkodobé produkční tabulky
// =====================================================================================
function buildKratke({ K, pk, w, Ls, qs, idx, ask }) {
  const fc = K * pk; const vc = Ls[idx] * w; const tc = fc + vc;
  const askFc = ask === 'FC';
  return mk('kratke-naklady', {
    data: { K, pk, w, Ls, qs, idx, ask },
    task: `Továrna používá pevné množství kapitálu K a mění počet pracovníků L. Nájemné za jednotku kapitálu je ${czText(pk)} Kč, mzda za jednotku práce ${czText(w)} Kč. Tabulka ukazuje výstup Q při různém počtu pracovníků. ${askFc ? `Určete fixní náklady FC odpovídající výstupu Q = ${czText(qs[idx])}.` : `Určete celkové náklady TC odpovídající výstupu Q = ${czText(qs[idx])}.`}`,
    promptTex: arrayTex(['L', ...Ls.map(String)], [['K', ...Ls.map(() => String(K))], ['Q', ...qs.map(cz)]]),
    answerSpec: { kind: 'number', value: askFc ? fc : tc },
    conclusion: askFc ? `Fixní náklady jsou ${czText(fc)} Kč.` : `Celkové náklady jsou ${czText(tc)} Kč.`,
    source: sourceOf(8),
    solution: [
      { title: 'Krátké období', text: 'Kapitál je pevný, a proto jeho cena tvoří fixní náklady. Práce je variabilní, a proto její cena tvoří variabilní náklady.',
        board: [line('FC=K\\cdot P_K'), line('VC=L\\cdot P_L')] },
      { title: 'Fixní náklady', text: `Fixní náklady jsou nájemné za ${K} jednotek kapitálu. Nezávisejí na tom, kolik se vyrobí.`,
        board: [line(`FC=${cz(K)}\\cdot ${cz(pk)}=${cz(fc)}`)] },
      ...(askFc ? [] : [{ title: 'Variabilní náklady', text: `V tabulce najdeme počet pracovníků pro výstup ${czText(qs[idx])}: je to ${Ls[idx]}. Jejich mzdy jsou variabilní náklady.`,
        board: [line(`VC=${cz(Ls[idx])}\\cdot ${cz(w)}=${cz(vc)}`)] }]),
      { title: 'Výsledek', text: askFc ? `Fixní náklady jsou ${czText(fc)} Kč a při jiném výstupu by byly stejné.` : `Celkové náklady jsou součet fixních a variabilních nákladů: ${czText(fc)} + ${czText(vc)} = ${czText(tc)} Kč.`,
        board: [result(askFc ? `FC=${cz(fc)}` : `TC=FC+VC=${cz(fc)}+${cz(vc)}=${cz(tc)}`)] },
    ],
  });
}
function genKratke(rng) {
  const q1 = pick(rng, [10, 20, 30]); const q2 = q1 - pick(rng, [4, 5, 6]); const q3 = q2 - pick(rng, [2, 3]);
  const qs = [0, q1, q1 + q2, q1 + q2 + q3];
  return buildKratke({ K: pick(rng, [5, 10, 20]), pk: pick(rng, [100, 200, 300]), w: pick(rng, [20, 40, 50]), Ls: [0, 1, 2, 3], qs, idx: int(rng, 1, 3), ask: pick(rng, ['FC', 'TC']) });
}

// =====================================================================================
// 11. celkové výdaje na vstupy a pravidlo minimalizace nákladů
// =====================================================================================
const INPUT_NAMES = ['půda', 'práce', 'kapitál'];
function buildVydaje({ items }) {
  const spend = items.map((it) => it.qty * it.price);
  const tc = spend.reduce((s, v) => s + v, 0);
  const eq = items.every((it) => it.mpp * items[0].price === items[0].mpp * it.price);
  const ratioLess = (a, b) => a.mpp * b.price < b.mpp * a.price; // MPP/P a < b
  let best = items[0]; let worst = items[0];
  for (const it of items) { if (ratioLess(best, it)) best = it; if (ratioLess(it, worst)) worst = it; }
  return mk('vydaje-faktory', {
    data: { items },
    task: 'Firma vyrábí 200 jednotek zboží pomocí tří vstupů (půda, práce, kapitál). Použitá množství, ceny jednotek a mezní fyzické produkty vstupů jsou v tabulce. Určete celkové výdaje na použité faktory (TC) v Kč.',
    promptTex: arrayTex(['\\text{Vstup}', ...items.map((it) => `\\text{${it.name}}`)], [
      ['\\text{Použité množství}', ...items.map((it) => cz(it.qty))],
      ['\\text{Cena jednotky}', ...items.map((it) => cz(it.price))],
      ['MPP', ...items.map((it) => cz(it.mpp))],
    ]),
    answerSpec: { kind: 'number', value: tc },
    conclusion: `Celkové výdaje na faktory jsou ${czText(tc)} Kč. ${eq ? 'Pravidlo minimalizace nákladů je splněno.' : 'Pravidlo minimalizace nákladů splněno není.'}`,
    source: sourceOf(6),
    solution: [
      { title: 'Výdaje na každý faktor', text: 'Výdaje na faktor jsou použité množství krát cena jednotky.',
        board: items.map((it, i) => line(`\\text{${it.name}}:\\ ${cz(it.qty)}\\cdot ${cz(it.price)}=${cz(spend[i])}`)) },
      { title: 'Součet výdajů', text: 'Celkové výdaje jsou součet výdajů na všechny tři faktory.',
        board: [line(`TC=${spend.map(cz).join('+')}=${cz(tc)}`)] },
      { title: 'Pravidlo minimalizace nákladů', text: eq ? 'Poměry mezního produktu a ceny jsou u všech faktorů stejné, takže pravidlo je splněno a firma minimalizuje náklady.' : `Pravidlo by vyžadovalo stejné poměry MPP/P u všech faktorů. Tady se liší: nejvyšší poměr má faktor ${best.name}, nejnižší faktor ${worst.name}. Firma by měla používat víc faktoru ${best.name} a méně faktoru ${worst.name}.`,
        board: [line(items.map((it) => `\\frac{${cz(it.mpp)}}{${cz(it.price)}}`).join(',\\ '))] },
      { title: 'Výsledek', text: `Celkové výdaje činí ${czText(tc)} Kč.`, board: [result(`TC=${cz(tc)}\\ \\text{Kč}`)] },
    ],
  });
}
function genVydaje(rng) {
  const prices = [int(rng, 1, 5), int(rng, 1, 5), int(rng, 1, 5)];
  const k = int(rng, 1, 3);
  const balanced = rng() < 0.35;
  const items = INPUT_NAMES.map((name, i) => ({
    name, qty: 5 * int(rng, 1, 8), price: prices[i], mpp: balanced ? prices[i] * k : int(rng, 1, 6),
  }));
  return buildVydaje({ items });
}

// =====================================================================================
// 12. tabulka nákladů: VC, MC, AFC, AC, AVC (tabulka)
// =====================================================================================
function buildTabulkaNakladu({ fc, tc }) {
  const n = tc.length;
  const vc = tc.map((v) => v - fc);
  const mc = tc.map((v, i) => v - (i ? tc[i - 1] : fc));
  const rows = tc.map((v, i) => [cell(vc[i]), cell(mc[i]), cell(fc / (i + 1)), cell(v / (i + 1)), cell(vc[i] / (i + 1))]);
  return mk('naklady-tabulka', {
    data: { fc, tc },
    task: `Firma má fixní náklady FC = ${czText(fc)} Kč. Celkové náklady TC pro výstup Q = 1 až ${n} jsou v tabulce. Vyplňte tabulku: v každém řádku (Q = 1 až ${n}) zapište postupně VC, MC, AFC, AC a AVC; zaokrouhlete na dvě desetinná místa.`,
    promptTex: arrayTex(['Q', ...tc.map((_, i) => String(i + 1))], [['TC', ...tc.map(cz)]]),
    answerSpec: { kind: 'table', value: rows, tol: TABLE_TOL },
    conclusion: `VC: ${vc.map(czText).join('; ')}. MC: ${mc.map(czText).join('; ')}.`,
    source: sourceOf(9),
    solution: [
      { title: 'Variabilní náklady', text: 'Celkové náklady se skládají z fixních a variabilních, a proto VC dostaneme tak, že od TC odečteme FC.',
        board: [line('VC=TC-FC'), ...tc.map((v, i) => line(`VC_${i + 1}=${cz(v)}-${cz(fc)}=${cz(vc[i])}`))] },
      { title: 'Mezní náklady', text: `Mezní náklad je přírůstek TC při výstupu o jednotku větším. Před prvním kusem jsou celkové náklady rovny FC (${czText(fc)} Kč).`,
        board: tc.map((v, i) => line(`MC_${i + 1}=${cz(v)}-${cz(i ? tc[i - 1] : fc)}=${cz(mc[i])}`)) },
      { title: 'Průměrné náklady', text: 'Průměrné náklady jsou náklady na kus: fixní, celkové a variabilní náklady dělíme výstupem.',
        board: tc.map((v, i) => line(`Q=${i + 1}:\\ AFC=${cz(r2(fc / (i + 1)))},\\ AC=${cz(r2(v / (i + 1)))},\\ AVC=${cz(r2(vc[i] / (i + 1)))}`)) },
      { title: 'Kontrola', text: 'Pro každý řádek musí platit AC = AFC + AVC. Zároveň MC klesá a pak roste, AC a AVC mají tvar U a AFC stále klesá.',
        board: [line(`AC_1=AFC_1+AVC_1=${cz(r2(fc))}+${cz(r2(vc[0]))}=${cz(r2(tc[0]))}`)] },
      { title: 'Výsledek', text: `Řádky tabulky (VC; MC; AFC; AC; AVC): ${rows.map((r, i) => `Q = ${i + 1}: ${r.map((x) => czText(Number(x))).join('; ')}`).join(' | ')}.`,
        board: [result(`VC:\\ ${vc.map(cz).join(';\\ ')}\\quad MC:\\ ${mc.map(cz).join(';\\ ')}`)] },
    ],
  });
}
function genTabulkaNakladu(rng) {
  for (let i = 0; i < 200; i++) {
    const fc = pick(rng, [12, 24, 36, 60]);
    const avc = [int(rng, 10, 30)];
    avc.push(avc[0] - int(rng, 1, 4)); avc.push(avc[1] - int(rng, 0, 3)); avc.push(avc[2] + int(rng, 0, 3));
    const vc = avc.map((v, k) => (k + 1) * v);
    const mc = vc.map((v, k) => v - (k ? vc[k - 1] : 0));
    if (mc.every((v) => v > 0) && mc[3] >= mc[2]) return buildTabulkaNakladu({ fc, tc: vc.map((v) => fc + v) });
  }
  return buildTabulkaNakladu({ fc: 10, tc: [20, 28, 34, 42] });
}

// =====================================================================================
// 13. náklady z funkce TC = FC + aQ − bQ² + cQ³
// =====================================================================================
const COST_ASK = {
  FC: 'fixní náklady FC', VC: 'variabilní náklady VC', AFC: 'průměrné fixní náklady AFC', AC: 'průměrné náklady AC', MC: 'mezní náklady MC (jako derivaci TC podle Q)',
};
function buildNakladyPolynom({ fc, a, b, c, Q, ask }) {
  const vc = a * Q - b * Q * Q + c * Q * Q * Q;
  const values = { FC: fc, VC: vc, AFC: fc / Q, AC: (fc + vc) / Q, MC: a - 2 * b * Q + 3 * c * Q * Q };
  const value = values[ask];
  const tcTex = `TC=${cz(fc)}+${coef(a, 'Q')}-${coef(b, 'Q^2')}+${coef(c, 'Q^3')}`;
  const withQ = ask !== 'FC';
  const formula = {
    FC: line(`FC=${cz(fc)}`),
    VC: line(`VC=${coef(a, 'Q')}-${coef(b, 'Q^2')}+${coef(c, 'Q^3')}`),
    AFC: line(`AFC=\\frac{FC}{Q}=\\frac{${cz(fc)}}{Q}`),
    AC: line(`AC=\\frac{TC}{Q}=\\frac{${cz(fc)}}{Q}+${cz(a)}-${coef(b, 'Q')}+${coef(c, 'Q^2')}`),
    MC: line(`MC=\\frac{dTC}{dQ}=${cz(a)}-${coef(2 * b, 'Q')}+${coef(3 * c, 'Q^2')}`),
  }[ask];
  const subst = {
    FC: line(`FC=TC(0)=${cz(fc)}`),
    VC: line(`VC=${cz(a)}\\cdot ${cz(Q)}-${cz(b)}\\cdot ${cz(Q)}^2+${cz(c)}\\cdot ${cz(Q)}^3=${cz(value)}`),
    AFC: line(`AFC=\\frac{${cz(fc)}}{${cz(Q)}}=${cz(value)}`),
    AC: line(`AC=\\frac{${cz(fc)}}{${cz(Q)}}+${cz(a)}-${cz(b)}\\cdot ${cz(Q)}+${cz(c)}\\cdot ${cz(Q)}^2=${cz(value)}`),
    MC: line(`MC=${cz(a)}-${cz(2 * b)}\\cdot ${cz(Q)}+${cz(3 * c)}\\cdot ${cz(Q)}^2=${cz(value)}`),
  }[ask];
  return mk('naklady-polynom', {
    data: { fc, a, b, c, Q, ask },
    task: `Krátkodobá nákladová funkce závodu je dána rovnicí (Q je množství, TC v Kč). Určete ${COST_ASK[ask]}${withQ ? ` při výstupu Q = ${czText(Q)} jednotek` : ''}.`,
    promptTex: tcTex,
    answerSpec: { kind: 'number', value },
    conclusion: `${ask} ${withQ ? `při Q = ${czText(Q)} ` : ''}je ${czText(value)} Kč${ask === 'AFC' || ask === 'AC' || ask === 'MC' ? ' na jednotku' : ''}.`,
    source: sourceOf(14),
    solution: [
      { title: 'Fixní a variabilní část', text: 'Člen bez Q je fixní náklad (platí se i při nulové výrobě). Zbytek závisí na Q a tvoří variabilní náklady.',
        board: [line(tcTex), line(`FC=${cz(fc)},\\quad VC=${coef(a, 'Q')}-${coef(b, 'Q^2')}+${coef(c, 'Q^3')}`)] },
      { title: 'Vzorec pro hledanou veličinu', text: {
        FC: 'Fixní náklady jsou hodnota TC při nulovém výstupu, tedy konstantní člen.',
        VC: 'Variabilní náklady jsou celkové náklady bez fixní části.',
        AFC: 'Průměrné fixní náklady jsou fixní náklady vydělené výstupem.',
        AC: 'Průměrné náklady jsou celkové náklady na jednotku, AC = TC/Q = AFC + AVC.',
        MC: 'Mezní náklady jsou přírůstek celkových nákladů při zvýšení výstupu. U spojité funkce je to derivace TC podle Q, fixní náklady při ní vypadnou.',
      }[ask], board: [formula] },
      { title: withQ ? `Dosadíme Q = ${czText(Q)}` : 'Konstantní člen', text: withQ ? 'Do vzorce dosadíme zadaný výstup a vypočteme hodnotu.' : 'Hodnota nezávisí na výstupu, takže není co dosazovat.', board: [subst] },
      { title: 'Výsledek', text: `Výsledek je ${czText(value)} Kč${ask === 'AFC' || ask === 'AC' || ask === 'MC' ? ' na jednotku' : ''}.`, board: [result(`${ask}=${cz(value)}`)] },
    ],
  });
}
function genNakladyPolynom(rng) {
  for (let i = 0; i < 300; i++) {
    const fc = pick(rng, [600, 1000, 1200, 2000, 3000, 4000]);
    const a = 10 * int(rng, 2, 6); const b = 2 * int(rng, 3, 8); const c = int(rng, 1, 3);
    const Q = pick(rng, [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25].filter((q) => fc % q === 0));
    const mc = a - 2 * b * Q + 3 * c * Q * Q; const avc = a - b * Q + c * Q * Q;
    if (mc > 0 && avc > 0) return buildNakladyPolynom({ fc, a, b, c, Q, ask: pick(rng, ['FC', 'VC', 'AFC', 'AC', 'MC']) });
  }
  return buildNakladyPolynom({ fc: 3000, a: 30, b: 12, c: 2, Q: 5, ask: 'MC' });
}

// =====================================================================================
// 14. tabulka příjmů TR, MR, AR (tabulka)
// =====================================================================================
function buildTabulkaPrijmu({ p }) {
  const n = p.length;
  const tr = p.map((v, i) => v * (i + 1));
  const mr = tr.map((v, i) => v - (i ? tr[i - 1] : 0));
  const rows = p.map((v, i) => [cell(tr[i]), cell(mr[i]), cell(v)]);
  return mk('tabulka-prijmu', {
    data: { p },
    task: `Firma prodává při klesající poptávce: cena P závisí na prodaném množství Q (viz tabulka). Vyplňte tabulku: v každém řádku (Q = 1 až ${n}) zapište celkový příjem TR, mezní příjem MR a průměrný příjem AR.`,
    promptTex: arrayTex(['Q', ...p.map((_, i) => String(i + 1))], [['P\\ (\\text{Kč})', ...p.map(cz)]]),
    answerSpec: { kind: 'table', value: rows, tol: TABLE_TOL },
    conclusion: `TR: ${tr.map(czText).join('; ')}. MR: ${mr.map(czText).join('; ')}. AR: ${p.map(czText).join('; ')}.`,
    source: sourceOf(11),
    solution: [
      { title: 'Celkový příjem', text: 'Celkový příjem je cena krát prodané množství.',
        board: p.map((v, i) => line(`TR_${i + 1}=${cz(v)}\\cdot ${i + 1}=${cz(tr[i])}`)) },
      { title: 'Mezní příjem', text: 'Mezní příjem je přírůstek celkového příjmu při prodeji o jednotku víc. U první jednotky je roven celému příjmu.',
        board: tr.map((v, i) => line(`MR_${i + 1}=${cz(v)}-${cz(i ? tr[i - 1] : 0)}=${cz(mr[i])}`)) },
      { title: 'Průměrný příjem', text: 'Průměrný příjem je TR/Q = P, vždy se rovná ceně. Proto ho dostaneme přímo z tabulky.',
        board: [line(`AR=\\frac{TR}{Q}=P:\\ ${p.map(cz).join(';\\ ')}`)] },
      { title: 'Výsledek', text: `MR je pod cenou a klesá rychleji než cena (od druhé jednotky). Řádky (TR; MR; AR): ${rows.map((r, i) => `Q = ${i + 1}: ${r.map((x) => czText(Number(x))).join('; ')}`).join(' | ')}.`,
        board: [result(`TR:\\ ${tr.map(cz).join(';\\ ')}\\quad MR:\\ ${mr.map(cz).join(';\\ ')}`)] },
    ],
  });
}
function genTabulkaPrijmu(rng) {
  const start = 10 * int(rng, 6, 20); const step = 5 * int(rng, 1, 4);
  return buildTabulkaPrijmu({ p: [0, 1, 2, 3].map((k) => start - step * k) });
}

// =====================================================================================
// 15. průměrný příjem (výběr)
// =====================================================================================
const AR_ORDER = ['tr', 'p', 'dva', 'velke', 'nelze'];
function buildPrijem({ units, price, order }) {
  const texts = { tr: `AR = ${czText(units * price)} Kč`, p: `AR = ${czText(price)} Kč`, dva: `AR = ${czText(price * 2)} Kč`, velke: `AR = ${czText(price * 20)} Kč`, nelze: 'nelze přesně určit' };
  const ord = order && order.length === 5 ? order : AR_ORDER;
  const options = ord.map((id) => ({ id, text: texts[id] }));
  return mk('prumerny-prijem', {
    data: { units, price, order: ord },
    task: `Firma prodá za rok ${czText(units)} výrobků. Cena jednoho výrobku je ${czText(price)} Kč. Jaký bude průměrný příjem firmy?`,
    answerSpec: { kind: 'choice', value: 'p', options },
    conclusion: `Průměrný příjem je ${czText(price)} Kč, tedy roven ceně.`,
    source: sourceOf(12),
    solution: [
      { title: 'Definice průměrného příjmu', text: 'Průměrný příjem je celkový příjem na jednu prodanou jednotku.',
        board: [line('AR=\\frac{TR}{Q}')] },
      { title: 'Celkový příjem', text: `Celkový příjem je cena krát množství: ${czText(price)} · ${czText(units)} = ${czText(price * units)} Kč.`,
        board: [line(`TR=P\\cdot Q=${cz(price)}\\cdot ${cz(units)}=${cz(price * units)}`)] },
      { title: 'Dosadíme', text: 'Celkový příjem dělíme počtem prodaných kusů. Množství se vykrátí.',
        board: [line(`AR=\\frac{P\\cdot Q}{Q}=P=${cz(price)}`)] },
      { title: 'Závěr', text: 'Průměrný příjem se rovná ceně vždy, v každé tržní struktuře. Křivka AR splývá s křivkou poptávky po výrobcích firmy.',
        board: [result(`AR=P=${cz(price)}`)] },
    ],
  });
}
function genPrijem(rng) {
  return buildPrijem({ units: pick(rng, [2000, 5000, 8000, 10000]), price: pick(rng, [20, 40, 50, 80, 100]), order: shuffle(rng, AR_ORDER) });
}

// =====================================================================================
// 16. zlaté pravidlo: konkurence (P = MR, TC = FC + cQ + dQ²)
// =====================================================================================
function buildZlateKonkurence({ P, fc, c, d, ask }) {
  const Q = (P - c) / (2 * d);
  const tc = fc + c * Q + d * Q * Q;
  const profit = P * Q - tc;
  const askQ = ask === 'Q';
  const value = askQ ? Q : profit;
  const tcTex = `TC=${cz(fc)}+${coef(c, 'Q')}+${coef(d, 'Q^2')}`;
  return mk('zlate-konkurence', {
    data: { P, fc, c, d, ask },
    task: `Dokonale konkurenční firma prodává svůj výrobek za tržní cenu ${czText(P)} Kč. Celkové náklady (v Kč) jsou dány rovnicí. ${askQ ? 'Kolik kusů má firma vyrábět, aby maximalizovala zisk?' : 'Jak velký největší zisk může firma dosáhnout (v Kč)? Případná ztráta se zapíše záporným číslem.'}`,
    promptTex: tcTex,
    answerSpec: { kind: 'number', value },
    conclusion: askQ ? `Firma vyrábí ${czText(Q)} kusů.` : `Největší zisk je ${czText(profit)} Kč${profit < 0 ? ' (jde o ztrátu)' : ''}.`,
    solution: [
      { title: 'Mezní příjem a mezní náklady', text: 'V dokonalé konkurenci je mezní příjem roven ceně. Mezní náklady spočteme jako derivaci celkových nákladů podle Q.',
        board: [line(`MR=P=${cz(P)}`), line(`MC=\\frac{dTC}{dQ}=${cz(c)}+${coef(2 * d, 'Q')}`)] },
      { title: 'Zlaté pravidlo MR = MC', text: 'Zisk je největší, když se mezní příjem rovná mezním nákladům. Rovnici vyřešíme pro Q.',
        board: [line(`${cz(P)}=${cz(c)}+${coef(2 * d, 'Q')}`), line(`${cz(P - c)}=${coef(2 * d, 'Q')}`), askQ ? result(`Q^*=\\frac{${cz(P - c)}}{${cz(2 * d)}}=${cz(Q)}`) : line(`Q^*=\\frac{${cz(P - c)}}{${cz(2 * d)}}=${cz(Q)}`)] },
      ...(askQ ? [] : [{ title: 'Zisk při optimálním výstupu', text: 'Zisk je celkový příjem minus celkové náklady při optimálním výstupu.',
        board: [line(`TR=${cz(P)}\\cdot ${cz(Q)}=${cz(P * Q)}`), line(`TC=${cz(fc)}+${cz(c)}\\cdot ${cz(Q)}+${cz(d)}\\cdot ${cz(Q)}^2=${cz(tc)}`), result(`\\pi=${cz(P * Q)}-${cz(tc)}=${cz(profit)}`)] }]),
      { title: 'Graf', text: `Křivka MC protíná vodorovnou přímku MR = P v bodě E při Q = ${czText(Q)}. ${askQ ? '' : `Zisk firmy je ${czText(profit)} Kč.`}`,
        viz: goldViz({ P, fc, c, d, Q }) },
    ],
  });
}
function genZlateKonkurence(rng) {
  const d = int(rng, 1, 5); const c = pick(rng, [10, 20, 30, 40]); const Q = int(rng, 5, 40);
  return buildZlateKonkurence({ P: c + 2 * d * Q, fc: 100 * int(rng, 1, 5), c, d, ask: pick(rng, ['Q', 'zisk']) });
}

// =====================================================================================
// 17. zlaté pravidlo: firma s klesající poptávkou P = A − BQ, TC = FC + mQ + nQ²
// =====================================================================================
function buildZlateMr({ A, B, fc, m, n, ask }) {
  const Q = (A - m) / (2 * B + 2 * n);
  const P = A - B * Q;
  const tc = fc + m * Q + n * Q * Q;
  const profit = P * Q - tc;
  const value = ask === 'Q' ? Q : ask === 'P' ? P : profit;
  const demandTex = `P=${cz(A)}-${coef(B, 'Q')},\\qquad TC=${cz(fc)}+${coef(m, 'Q')}+${coef(n, 'Q^2')}`;
  const askText = { Q: 'Kolik kusů má firma vyrábět, aby maximalizovala zisk?', P: 'Jakou cenu bude firma při maximalizaci zisku účtovat?', zisk: 'Jak velký největší zisk firma dosáhne (v Kč)?' }[ask];
  return mk('zlate-mr', {
    data: { A, B, fc, m, n, ask },
    task: `Firma s klesající poptávkou po svém výrobku prodává při cenách podle první rovnice, celkové náklady jsou dány druhou rovnicí (P v Kč, Q v kusech). ${askText}`,
    promptTex: demandTex,
    answerSpec: { kind: 'number', value },
    conclusion: `Firma vyrábí ${czText(Q)} kusů za cenu ${czText(P)} Kč${ask === 'zisk' ? `, zisk je ${czText(profit)} Kč` : ''}.${ask === 'zisk' ? '' : ` Hledaná hodnota je ${czText(value)}.`}`,
    solution: [
      { title: 'Mezní příjem', text: `Celkový příjem je TR = P·Q = ${czText(A)}Q − ${czText(B)}Q². Mezní příjem je jeho derivace podle Q: u lineární poptávky klesá dvakrát rychleji než cena.`,
        board: [line(`TR=P\\cdot Q=${cz(A)}Q-${coef(B, 'Q^2')}`), line(`MR=${cz(A)}-${coef(2 * B, 'Q')}`)] },
      { title: 'Mezní náklady', text: 'Mezní náklady spočteme jako derivaci celkových nákladů podle Q (fixní náklady vypadnou).',
        board: [line(`MC=\\frac{dTC}{dQ}=${cz(m)}+${coef(2 * n, 'Q')}`)] },
      { title: 'Zlaté pravidlo MR = MC', text: 'Zisk je největší, když se MR rovná MC. Rovnici vyřešíme pro Q.',
        board: [line(`${cz(A)}-${coef(2 * B, 'Q')}=${cz(m)}+${coef(2 * n, 'Q')}`), line(`${cz(A - m)}=${cz(2 * B + 2 * n)}Q`), line(`Q^*=${cz(Q)}`)] },
      { title: 'Cena z poptávky', text: 'Cenu zjistíme z poptávkové křivky: kupující při optimálním množství zaplatí tolik, kolik říká poptávka (ne MR).',
        board: [ask === 'P' ? result(`P=${cz(A)}-${cz(B)}\\cdot ${cz(Q)}=${cz(P)}`) : line(`P=${cz(A)}-${cz(B)}\\cdot ${cz(Q)}=${cz(P)}`)] },
      ...(ask === 'zisk' ? [{ title: 'Zisk', text: 'Zisk je TR minus TC při optimálním výstupu.',
        board: [line(`TR=${cz(P)}\\cdot ${cz(Q)}=${cz(P * Q)}`), line(`TC=${cz(fc)}+${cz(m)}\\cdot ${cz(Q)}+${cz(n)}\\cdot ${cz(Q)}^2=${cz(tc)}`), result(`\\pi=${cz(P * Q - tc)}`)] }]
        : [{ title: 'Výsledek', text: `Hledaná hodnota je ${czText(value)}: firma vyrábí ${czText(Q)} kusů a prodává za ${czText(P)} Kč.`,
          board: [ask === 'Q' ? result(`Q^*=${cz(Q)}`) : line(`Q^*=${cz(Q)}`)] }]),
      { title: 'Graf', text: `MR se protíná s MC při Q = ${czText(Q)}. Cena je na poptávkové křivce D nad tímto bodem: ${czText(P)} Kč.${ask === 'zisk' ? ` Zisk firmy je ${czText(profit)} Kč.` : ''}`,
        viz: econ({
          axes: { x: 'Q', y: 'Kč' }, domain: [0, A / B], range: [0, A],
          curves: [{ expr: `${A} - ${B}*x`, label: 'D', color: 'blue' }, { expr: `${A} - ${2 * B}*x`, label: 'MR', color: 'chalk' }, { expr: `${m} + ${2 * n}*x`, label: 'MC', color: 'accent' }],
          points: [{ x: Q, y: m + 2 * n * Q, label: 'E' }, { x: Q, y: P, label: 'A', guides: true }],
          alt: 'Zlaté pravidlo u firmy s klesající poptávkou: výstup je v průsečíku MR a MC, cena na křivce D',
        }) },
    ],
  });
}
function genZlateMr(rng) {
  const Q = int(rng, 4, 30); const B = int(rng, 1, 4); const n = int(rng, 1, 3); const m = pick(rng, [10, 20, 30, 40]);
  return buildZlateMr({ A: m + 2 * (B + n) * Q, B, fc: 100 * int(rng, 1, 3), m, n, ask: pick(rng, ['Q', 'P', 'zisk']) });
}

// =====================================================================================
// 18. cenová elasticita nabídky (číslo) a její určení (výběr)
// =====================================================================================
const supplyTex = (c, d) => (c === 0 ? `Q_S=${coef(d, 'P')}` : c > 0 ? `Q_S=${cz(c)}+${coef(d, 'P')}` : `Q_S=${coef(d, 'P')}-${cz(-c)}`);
function buildElasticitaNabidky({ c, d, P }) {
  const Q = c + d * P; const E = (d * P) / Q;
  const type = E > 1 ? 'elastická (E > 1)' : E < 1 ? 'neelastická (E < 1)' : 'jednotkově elastická (E = 1)';
  return mk('elasticita-nabidky', {
    data: { c, d, P },
    task: `Nabídku statku popisuje rovnice (P je cena v Kč, Q množství v kusech). Určete bodovou cenovou elasticitu nabídky při ceně P = ${czText(P)} Kč.`,
    promptTex: supplyTex(c, d),
    answerSpec: { kind: 'number', value: E },
    conclusion: `Elasticita nabídky je ${czText(E)}: nabídka je ${type}.`,
    solution: [
      { title: 'Množství při dané ceně', text: 'Nejdřív zjistíme, kolik se nabízí při ceně P.',
        board: [line(`Q_S=${cz(c)}+${cz(d)}\\cdot ${cz(P)}=${cz(Q)}`)] },
      { title: 'Vzorec pro bodovou elasticitu', text: 'Elasticita nabídky měří, o kolik procent se změní nabízené množství při změně ceny o 1 %. U lineární nabídky je změna množství na jednotku ceny rovna koeficientu u P.',
        board: [line('E_S=\\frac{\\Delta Q/Q}{\\Delta P/P}=\\frac{\\Delta Q}{\\Delta P}\\cdot\\frac{P}{Q}'), line(`\\frac{\\Delta Q}{\\Delta P}=${cz(d)}`)] },
      { title: 'Dosadíme', text: 'Do vzorce dosadíme koeficient, cenu a množství.',
        board: [line(`E_S=${cz(d)}\\cdot\\frac{${cz(P)}}{${cz(Q)}}`)] },
      { title: 'Výsledek a graf', text: `Elasticita je ${czText(E)}, nabídka je ${type}. ${E > 1 ? 'Nabízené množství reaguje na cenu víc než proporcionálně.' : E < 1 ? 'Nabízené množství reaguje na cenu méně než proporcionálně.' : 'Množství reaguje na cenu proporcionálně.'}`,
        board: [result(`E_S=${cz(E)}`)],
        viz: econ({ axes: { x: 'Q', y: 'P' }, domain: [0, 2 * Q], range: [0, 2 * P], curves: [{ expr: `(x - ${c})/${d}`, label: 'S', color: 'chalk' }], points: [{ x: Q, y: P, label: 'bod', guides: true }], alt: 'Křivka nabídky a bod, ve kterém se počítá elasticita' }) },
    ],
  });
}
function genElasticitaNabidky(rng) {
  for (let i = 0; i < 200; i++) {
    const E = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4]);
    const d = int(rng, 1, 6); const P = 10 * int(rng, 1, 10);
    const Q = (d * P) / E;
    if (Number.isInteger(Q) && Q > 0) return buildElasticitaNabidky({ c: Q - d * P, d, P });
  }
  return buildElasticitaNabidky({ c: -20, d: 4, P: 10 });
}

const E_OPTIONS = [
  { id: 'el', text: 'Elastická nabídka (E > 1)' },
  { id: 'neel', text: 'Neelastická nabídka (E < 1)' },
  { id: 'jed', text: 'Jednotkově elastická nabídka (E = 1)' },
];
function buildElasticitaTyp({ dp, dq }) {
  const E = dq / dp;
  const id = E > 1 + 1e-9 ? 'el' : E < 1 - 1e-9 ? 'neel' : 'jed';
  return mk('elasticita-typ', {
    data: { dp, dq },
    task: `Cena statku vzrostla o ${czText(dp)} % a nabízené množství vzrostlo o ${czText(dq)} %. Jaká je při tomto přizpůsobení nabídka?`,
    answerSpec: { kind: 'choice', value: id, options: E_OPTIONS },
    conclusion: `${E_OPTIONS.find((o) => o.id === id).text}. Koeficient je ${czText(E)}.`,
    solution: [
      { title: 'Vzorec', text: 'Cenová elasticita nabídky je podíl procentní změny nabízeného množství a procentní změny ceny.',
        board: [line('E_S=\\frac{\\%\\Delta Q_S}{\\%\\Delta P}')] },
      { title: 'Dosadíme', text: 'Do vzorce dosadíme zadané procentní změny.',
        board: [line(`E_S=\\frac{${cz(dq)}}{${cz(dp)}}=${cz(E)}`)] },
      { title: 'Porovnáme s jedničkou', text: 'Je-li E větší než 1, nabídka je elastická (množství reaguje víc než cena). Je-li menší než 1, je neelastická, je-li rovno 1, je jednotkově elastická.',
        board: [line(`${cz(E)}\\ ${E > 1 ? '>' : E < 1 ? '<' : '='}\\ 1`)] },
      { title: 'Závěr', text: `Koeficient je ${czText(E)}, a nabídka je proto ${E_OPTIONS.find((o) => o.id === id).text.toLowerCase()}.`,
        board: [result(id === 'el' ? '\\text{elastická}' : id === 'neel' ? '\\text{neelastická}' : '\\text{jednotková}')] },
    ],
  });
}
function genElasticitaTyp(rng) {
  const dp = pick(rng, [10, 20]);
  return buildElasticitaTyp({ dp, dq: dp * pick(rng, [0.5, 0.8, 1, 1.5, 2, 3]) });
}

// =====================================================================================
// 19. výběr z možností (části D cvičebnice a vlastní)
// =====================================================================================
const ITEMS = [
  { id: 'zakon-klesajicich', q: 'Který výrok vystihuje působení zákona klesajících mezních výnosů? Práce je variabilní, kapitál fixní. Při zvýšení práce o jednotku:', right: ['relativní nedostatek kapitálu způsobí, že přírůstky celkové produkce se postupně snižují.'],
    wrong: ['celková produkce klesne, protože další jednotka práce bude horší kvality než předchozí.', 'náklady produkce eventuálně vzrostou, protože mzdy vzrostou kvůli vzácnější pracovní síle.', 'po nějakém čase bude potřeba méně pracovních sil v souvislosti se zvýšením produkce.', 'mezní příjmy z každé další vyrobené jednotky klesnou.'],
    why: 'Každý další pracovník má k dispozici méně kapitálu, a přírůstek produkce proto klesá. Nejde o horší kvalitu práce ani o ceny.' },
  { id: 'mc-nepravdive', q: 'Které z následujících výroků o křivce mezních nákladů v krátkém období NEJSOU pravdivé? (Označte všechny nepravdivé.)', multi: true,
    right: ['Mezní náklady nejsou ovlivněny růstem cen vstupů.', 'Mezní náklady částečně závisejí na fixních nákladech.'],
    wrong: ['Mezní náklady se rovnají průměrným nákladům, když jsou průměrné náklady na svém minimu.', 'Když průměrné náklady klesají, křivka mezních nákladů je pod křivkou průměrných nákladů.', 'Mezní náklady jsou větší než průměrné náklady, když je vyráběné množství větší než množství v minimu průměrných nákladů.'],
    why: 'Dražší variabilní vstupy zvyšují náklady, a proto mění i mezní náklady. Fixní náklady se v přírůstku celkových nákladů neobjeví, takže MC na nich nezávisí. Zbylé tři výroky platí.' },
  { id: 'mc-protinani', q: 'Ve kterých bodech protíná křivka mezních nákladů MC ostatní nákladové křivky?', right: ['V minimu křivky AC a v minimu křivky AVC.'],
    wrong: ['V minimu křivky AFC.', 'V maximu křivky TC.', 'Křivku MC žádná jiná křivka neprotíná.'],
    why: 'Mezní náklady stahují průměr dolů, dokud jsou pod ním, a zvedají ho, když jsou nad ním. Průměr proto dosáhne minima přesně tam, kde je MC protne. AFC je stále klesající a minimum nemá.' },
  { id: 'izokvanta-vlastnosti', q: 'Které z následujících vlastností platí pro izokvanty? (Označte všechny správné.)', multi: true,
    right: ['Izokvanty se navzájem neprotínají.', 'Izokvanta je klesající křivka.', 'Izokvanta je konvexní vzhledem k počátku.'],
    wrong: ['Izokvanty vzdálenější od počátku znamenají menší výstup.', 'Izokvanty se mohou protínat.'],
    why: 'Izokvanty mají stejné vlastnosti jako indiferenční křivky, jen vyjadřují výstup. Vzdálenější od počátku znamená větší výstup.' },
  { id: 'optimum-bod', q: 'Kde se nachází nákladové optimum firmy?', right: ['V bodě dotyku izokosty a izokvanty.'],
    wrong: ['V průsečíku obou os.', 'Kdekoliv na izokvantě, protože všechny body dávají stejný výstup.', 'V bodě, kde se izokvanta protíná s izokostou ve dvou bodech.'],
    why: 'V bodě dotyku mají obě křivky stejnou směrnici: MRTS = PL/PK. Jen v něm firma vyrobí daný výstup nejlevněji.' },
  { id: 'fixni-naklady', q: 'Které náklady se v krátkém období se změnou objemu výroby nemění?', right: ['Fixní náklady.'],
    wrong: ['Variabilní náklady.', 'Mezní náklady.', 'Průměrné variabilní náklady.'],
    why: 'Fixní náklady (nájem, pojištění) se platí ve stejné výši při jakémkoli výstupu včetně nuly.' },
  { id: 'kratke-dlouhe', q: 'Čím se liší dlouhé období od krátkého?', right: ['V dlouhém období jsou všechny vstupy variabilní, v krátkém je aspoň jeden fixní.'],
    wrong: ['V dlouhém období jsou všechny vstupy fixní.', 'V krátkém období nelze měnit ani výstup.', 'V dlouhém období platí zákon klesajících mezních výnosů, v krátkém výnosy z rozsahu.'],
    why: 'Délka období se určuje podle toho, co firma může měnit. V dlouhém období měnit může všechno.' },
];
const itemById = (id) => ITEMS.find((x) => x.id === id) ?? ITEMS[0];

// společný stavitel úloh s jednou nebo více správnými možnostmi; pořadí možností je pevné v datech
function choiceProblem({ typeId, part, item, order, source }) {
  const texts = [...item.right, ...item.wrong];
  const n = texts.length;
  const valid = Array.isArray(order) && order.length === n && [...order].sort((a, b) => a - b).every((v, i) => v === i);
  const ord = valid ? order : texts.map((_, i) => i);
  const options = ord.map((i) => ({ id: `o${i}`, text: texts[i] }));
  const value = item.multi ? item.right.map((_, i) => `o${i}`) : 'o0';
  return mk(typeId, {
    part,
    data: { id: item.id, order: ord },
    task: item.q,
    answerSpec: { kind: item.multi ? 'multichoice' : 'choice', value, options },
    conclusion: item.multi ? item.right.join(' ') : item.right[0],
    source,
    solution: [
      { title: 'Pojem a otázka', text: 'Najdeme klíčový pojem otázky a vybavíme si jeho definici nebo graf.', board: [line('\\text{pojem}\\ \\Rightarrow\\ \\text{definice}')] },
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti obracejí vztah nebo zaměňují pojmy. Například: „${item.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Zdůvodnění', text: item.why ?? item.right[0], board: [line('\\text{souhlasí s teorií}')] },
      { title: 'Správná odpověď', text: item.multi ? `Správně: ${item.right.join(' ')}` : item.right[0], board: [result('\\checkmark')] },
    ],
  });
}
function buildVyber({ id, order }) {
  const it = itemById(id);
  return choiceProblem({ typeId: 'vyber-teorie', part: 'zapocet', item: it, order, source: it.id === 'zakon-klesajicich' ? sourceOf('D-2') : it.id === 'mc-nepravdive' ? sourceOf('D-5') : undefined });
}
function genVyber(rng) {
  const it = pick(rng, ITEMS);
  return buildVyber({ id: it.id, order: shuffle(rng, [...it.right, ...it.wrong].map((_, i) => i)) });
}

// =====================================================================================
// 20. pravda, nebo nepravda (úkoly C cvičebnice kap. 5 a vlastní)
// =====================================================================================
// kn-a až kn-q: části C cvičebnice. U kn-f je v knize chybně N, správně je A (nákladové křivky zahrnují implicitní náklady).
const STATEMENTS = [
  { id: 'kn-a', text: 'Velikost implicitních nákladů je daná hodnotou nejhorší možné nerealizované alternativy.', truth: false, why: 'Implicitní náklady jsou náklady obětované příležitosti, tedy hodnota nejlepší nerealizované alternativy, ne nejhorší.' },
  { id: 'kn-b', text: 'Jestliže firma dosahuje pouze normálního zisku, neuhrazuje veškeré náklady spojené s výrobou.', truth: false, why: 'Normální zisk odpovídá nulovému ekonomickému zisku: firma uhradila všechny náklady včetně implicitních (obětované příležitosti).' },
  { id: 'kn-c', text: 'Pokud srovnáme výrobu jogurtů a ledniček, minimum AC bude blíže počátku u výroby jogurtů.', truth: true, why: 'Výroba ledniček vyžaduje velký kapitál a vysoké fixní náklady, a minimum průměrných nákladů nastane až při velkém objemu. U jogurtů je minimum blíž počátku.' },
  { id: 'kn-d', text: 'Průměrný příjem je roven ceně produkce pouze v případě dokonalé konkurence.', truth: false, why: 'AR = TR/Q = P·Q/Q = P platí vždy, v každé tržní struktuře.' },
  { id: 'kn-e', text: 'Pro křivku průměrných fixních nákladů je typický tvar „U“.', truth: false, why: 'AFC = FC/Q s rostoucím výstupem stále klesá. Tvar U mají AC a AVC.' },
  { id: 'kn-f', text: 'Křivky TC, AC apod. v ekonomické teorii představují celkové ekonomické náklady (tedy včetně nákladů implicitních).', truth: true, why: 'V ekonomii se do nákladů počítají i implicitní náklady, proto jsou nákladové křivky ekonomické. Pozor: ve cvičebnici je u tohoto úkolu uvedeno N, což odporuje výkladu o ekonomickém zisku.' },
  { id: 'kn-g', text: 'Jestliže výstup roste rychlejším tempem než jakým rostou proporcionálně všechny vstupy, pak dlouhodobá produkční funkce vykazuje rostoucí výnosy z rozsahu.', truth: true, why: 'Přesně tak jsou rostoucí výnosy z rozsahu definovány: dvojnásobek všech vstupů dá víc než dvojnásobek výstupu.' },
  { id: 'kn-h', text: 'Zákon klesajících výnosů platí vždy v dlouhém období.', truth: false, why: 'Zákon klesajících mezních výnosů platí v krátkém období, kdy je aspoň jeden vstup fixní. V dlouhém období se mění všechny vstupy a rozhodují výnosy z rozsahu.' },
  { id: 'kn-i', text: 'V krátkém období jsou všechny vstupy variabilní.', truth: false, why: 'V krátkém období je aspoň jeden vstup fixní (zpravidla kapitál). Všechny vstupy jsou variabilní až v dlouhém období.' },
  { id: 'kn-j', text: 'Při pohybu po izokvantě směrem dolů absolutní hodnota MRTS klesá, v důsledku čehož se izokvanta stává stále plošší (má tedy konvexní tvar).', truth: true, why: 'Klesající MRTS znamená, že směrnice izokvanty se zmenšuje, a křivka je proto konvexní k počátku.' },
  { id: 'kn-k', text: 'Pravidlo minimalizace nákladů slouží firmě jako kritérium pro volbu rovnovážné (zisk maximalizující) úrovně výstupu.', truth: false, why: 'Pravidlo minimalizace nákladů určuje kombinaci vstupů pro daný výstup. Optimální výstup se určuje podle MR = MC.' },
  { id: 'kn-l', text: 'Produkční funkce je technický název pro vztah mezi minimálním množstvím výstupu a požadovanými vstupy.', truth: false, why: 'Produkční funkce udává maximální množství výstupu, které lze vyrobit z dané kombinace vstupů při dané technologii.' },
  { id: 'kn-m', text: 'Pokud technologie vykazuje pro všechny vstupy klesající výnosy z variabilního inputu, pak v dlouhém období nemůže nastat případ rostoucích výnosů z rozsahu.', truth: false, why: 'Klesající mezní produkt jednoho vstupu (ostatní pevné) a výnosy z rozsahu (mění se všechny vstupy) jsou dva různé pojmy. Mohou platit současně.' },
  { id: 'kn-n', text: 'Pro tvar a výši nákladů jsou rozhodující vlastnosti produkční funkce a ceny vstupů.', truth: true, why: 'Produkční funkce říká, kolik vstupů je potřeba, a ceny vstupů říkají, kolik stojí.' },
  { id: 'kn-o', text: 'Křivka MC protíná křivku AFC vždy v jejím minimu.', truth: false, why: 'AFC stále klesá a žádné minimum nemá. MC protíná křivky AC a AVC v jejich minimech.' },
  { id: 'kn-p', text: 'Celkové náklady (TC, VC, FC) a jednotkové (průměrné) náklady (AC, AVC, AFC, MC) se obvykle nekreslí do jednoho grafu, neboť jsou měřeny v jiných jednotkách.', truth: true, why: 'Celkové náklady se měří v Kč, jednotkové v Kč na jednotku výstupu. Zakreslují se proto do samostatných grafů.' },
  { id: 'kn-q', text: 'Celkový zisk představuje rozdílovou položku mezi TR a TC.', truth: true, why: 'Zisk je celkový příjem minus celkové náklady.' },
  { id: 'own-1', text: 'Když je MR větší než MC, firma zvýší zisk rozšířením výroby.', truth: true, why: 'Další jednotka přidá k příjmům víc, než přidá k nákladům, a zisk proto roste.' },
  { id: 'own-2', text: 'Fixní náklady v krátkém období rostou spolu s objemem výroby.', truth: false, why: 'Fixní náklady se z definice s objemem výroby nemění.' },
  { id: 'own-3', text: 'Je-li MC pod AC, průměrné náklady rostou.', truth: false, why: 'Pod průměrem stahují mezní náklady průměr dolů, takže AC klesají.' },
  { id: 'own-4', text: 'Izokosta je přímka všech kombinací práce a kapitálu, které firma pořídí za dané celkové náklady.', truth: true, why: 'Takto je izokosta (linie stejných nákladů) definována: TC = w·L + r·K.' },
  { id: 'own-5', text: 'Při změně celkových nákladů a stejných cenách vstupů se izokosta otočí a změní sklon.', truth: false, why: 'Sklon izokosty určuje poměr cen vstupů. Změna celkových nákladů ji jen rovnoběžně posune.' },
  { id: 'own-6', text: 'V dokonalé konkurenci je mezní příjem firmy roven ceně.', truth: true, why: 'Firma prodává libovolné množství za stejnou cenu, takže každá další jednotka přidá k příjmu právě P.' },
  { id: 'own-7', text: 'Účetní zisk je vždy menší než ekonomický zisk.', truth: false, why: 'Je tomu naopak: ekonomický zisk odečítá navíc implicitní náklady, takže je menší (nebo stejný).' },
  { id: 'own-8', text: 'Je-li elasticita nabídky větší než 1, nabízené množství reaguje na změnu ceny víc než proporcionálně.', truth: true, why: 'Tak je elastická nabídka definována: procentní změna množství je větší než procentní změna ceny.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];
function buildAnoNe({ id }) {
  const s = stmtById(id);
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: id.startsWith('kn-') ? sourceOf(`C-${id.slice(3)}`) : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a vyhledáme pojem, na kterém stojí.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// =====================================================================================
// 21. definice pojmů (zkouška)
// =====================================================================================
const DEFS = [
  { id: 'produkcni-funkce', q: 'Co je produkční funkce?', right: ['Vztah, který udává maximální objem výstupu vyrobitelný z dané kombinace vstupů při dané technologii.'], wrong: ['Vztah mezi cenou výrobku a nabízeným množstvím.', 'Součet fixních a variabilních nákladů firmy.', 'Křivka, která ukazuje kombinace vstupů za stejné náklady.'] },
  { id: 'klesajici-vynosy', q: 'Co říká zákon klesajících mezních výnosů?', right: ['Při růstu množství variabilního vstupu (ostatní vstupy jsou fixní) se přírůstky výstupu od určitého bodu zmenšují.'], wrong: ['Při růstu všech vstupů ve stejném poměru roste výstup pomaleji.', 'Při růstu ceny výrobku nabízené množství klesá.', 'Celkový produkt klesá s každým dalším pracovníkem.'] },
  { id: 'explicitni', q: 'Co jsou explicitní náklady?', right: ['Náklady skutečně vynaložené na nákup nebo nájem výrobních faktorů, zaznamenané v účetnictví.'], wrong: ['Ušlý příjem majitele z vlastních zdrojů použitých ve firmě.', 'Náklady, které se s objemem výroby nemění.', 'Náklady na výrobu poslední jednotky.'] },
  { id: 'implicitni', q: 'Co jsou implicitní náklady?', right: ['Náklady obětované příležitosti: ušlé příjmy z výrobních faktorů ve vlastnictví majitele firmy.'], wrong: ['Skutečně zaplacené mzdy a nájem.', 'Náklady, které firma platí jen v krátkém období.', 'Náklady na jednotku produkce.'] },
  { id: 'ekonomicky-zisk', q: 'Jak se spočte ekonomický zisk?', right: ['Celkové příjmy minus explicitní a implicitní náklady.'], wrong: ['Celkové příjmy minus explicitní náklady.', 'Celkové příjmy minus fixní náklady.', 'Mezní příjem minus mezní náklady.'] },
  { id: 'izokvanta', q: 'Co je izokvanta?', right: ['Křivka všech kombinací práce a kapitálu, kterými lze vyrobit stejný objem produkce.'], wrong: ['Přímka všech kombinací vstupů pořízených za stejné náklady.', 'Křivka, která ukazuje, jak se mění výstup s množstvím jednoho vstupu.', 'Křivka stejného užitku spotřebitele.'] },
  { id: 'izokosta', q: 'Co je izokosta (linie stejných nákladů)?', right: ['Přímka všech kombinací práce a kapitálu, které lze pořídit za dané celkové náklady.'], wrong: ['Křivka všech kombinací vstupů se stejným výstupem.', 'Křivka, která ukazuje mezní náklady.', 'Křivka rozpočtového omezení spotřebitele.'] },
  { id: 'mrts', q: 'Co udává mezní míra technické substituce (MRTS)?', right: ['Poměr, v němž lze kapitál nahrazovat prací bez změny výstupu; absolutní hodnotu směrnice izokvanty.'], wrong: ['Poměr cen práce a kapitálu.', 'Poměr mezních příjmů a mezních nákladů.', 'Změnu nákladů při výrobě další jednotky.'] },
  { id: 'naklad-optimum', q: 'Jaká podmínka platí v nákladovém optimu firmy?', right: ['Poměr mezních produktů vstupů se rovná poměru jejich cen: MPL/MPK = w/r.'], wrong: ['Mezní příjem se rovná mezním nákladům.', 'Průměrné náklady jsou rovny ceně.', 'Izokosta protíná izokvantu ve dvou bodech.'] },
  { id: 'vynosy-rozsah', q: 'Co jsou rostoucí výnosy z rozsahu?', right: ['Při zvýšení všech vstupů ve stejném poměru výstup vzroste víc než proporcionálně.'], wrong: ['Při zvýšení jednoho vstupu roste výstup stále rychleji.', 'Při zvýšení všech vstupů výstup vzroste stejně.', 'Při zvýšení všech vstupů výstup vzroste méně než proporcionálně.'] },
  { id: 'fixni-vs-variabilni', q: 'Čím se liší fixní a variabilní náklady?', right: ['Fixní náklady se s objemem výroby nemění, variabilní se mění.'], wrong: ['Fixní náklady rostou s objemem výroby, variabilní se nemění.', 'Fixní náklady platí jen v dlouhém období.', 'Variabilní náklady jsou náklady na kapitál.'] },
  { id: 'mezni-naklady', q: 'Co jsou mezní náklady?', right: ['Přírůstek celkových nákladů vyvolaný zvýšením výstupu o jednotku.'], wrong: ['Celkové náklady dělené množstvím.', 'Fixní náklady dělené množstvím.', 'Součet fixních a variabilních nákladů.'] },
  { id: 'zlate-pravidlo', q: 'Jak zní zlaté pravidlo maximalizace zisku?', right: ['Firma maximalizuje zisk při výstupu, kde se mezní příjem rovná mezním nákladům.'], wrong: ['Firma maximalizuje zisk, když se cena rovná průměrným nákladům.', 'Firma maximalizuje zisk, když jsou fixní náklady nulové.', 'Firma maximalizuje zisk, když je mezní příjem vyšší než mezní náklady.'] },
  { id: 'prumerny-prijem', q: 'Co je průměrný příjem AR?', right: ['Celkový příjem dělený počtem prodaných jednotek, který se rovná ceně.'], wrong: ['Přírůstek celkového příjmu při prodeji další jednotky.', 'Celkové náklady dělené výstupem.', 'Cena, která se rovná mezním nákladům.'] },
  { id: 'elasticita-nabidky', q: 'Co měří cenová elasticita nabídky?', right: ['Procentní změnu nabízeného množství vyvolanou procentní změnou ceny.'], wrong: ['Změnu ceny při změně důchodu.', 'Absolutní změnu nabízeného množství při změně ceny o korunu.', 'Procentní změnu nákladů při změně výstupu.'] },
];
const defById = (id) => DEFS.find((d) => d.id === id) ?? DEFS[0];
function buildDefinice({ id, order }) {
  const df = defById(id);
  return choiceProblem({ typeId: 'definice', part: 'zkouska', item: { id: df.id, q: df.q, right: df.right, wrong: df.wrong, why: df.right[0] }, order });
}

// =====================================================================================
// 22. grafové úlohy na tabuli (zkouška)
// =====================================================================================
function buildGrafNaklady({ b }) {
  const { a, fc } = costParams(b);
  const avcMin = a - (b * b) / 2;
  const acMin = fc / (b + 1) + a - b * (b + 1) + 0.5 * (b + 1) ** 2;
  const ref = costViz(b, ['avc', 'ac', 'mc'], true);
  return mk('graf-naklady', {
    part: 'zkouska', points: 2,
    data: { b },
    task: 'Nakreslete do jednoho grafu (osa x množství Q, osa y náklady v Kč na jednotku) křivky mezních nákladů MC, průměrných nákladů AC a průměrných variabilních nákladů AVC v krátkém období. Vyznačte, že křivka MC protíná AC a AVC v jejich minimech.',
    answerSpec: { kind: 'whiteboard', reference: ref },
    conclusion: 'AVC a AC mají tvar U, AC leží nad AVC, MC klesá a potom roste a protíná AVC i AC v jejich minimech.',
    source: sourceOf('D-9'),
    solution: [
      { title: 'Křivka AVC', text: `Průměrné variabilní náklady nejdřív klesají a po dosažení minima (zde při Q = ${b}, hodnota ${czText(avcMin)}) rostou: tvar U.`,
        viz: costViz(b, ['avc']) },
      { title: 'Křivka AC', text: `AC = AFC + AVC leží nad AVC. Jejich vzdálenost je AFC, která s rostoucím Q klesá, a proto se křivky přibližují. Minimum AC je vpravo od minima AVC (zde Q = ${b + 1}, hodnota ${czText(acMin)}).`,
        viz: costViz(b, ['avc', 'ac']) },
      { title: 'Křivka MC', text: 'MC zpočátku klesá, pak roste a protne AVC v jejím minimu a AC v jejím minimu. Před průsečíkem leží pod průměrem (průměr klesá), za ním nad ním (průměr roste).',
        viz: costViz(b, ['avc', 'ac', 'mc'], true) },
    ],
  });
}
function buildGrafProdukt({ a, b }) {
  const ref = productViz(a, b, ['ap', 'mp'], true);
  return mk('graf-produkt', {
    part: 'zkouska', points: 2,
    data: { a, b },
    task: 'Nakreslete do jednoho grafu (osa x množství práce L) křivku průměrného produktu AP a křivku mezního produktu MP v krátkém období. Vyznačte, kde MP protíná AP, a vysvětlete, co platí o AP v tomto bodě.',
    answerSpec: { kind: 'whiteboard', reference: ref },
    conclusion: 'MP protíná AP v maximu AP; dokud je MP nad AP, AP roste, potom klesá.',
    solution: [
      { title: 'Křivka AP', text: 'Průměrný produkt zpočátku roste, dosáhne maxima a potom klesá.', viz: productViz(a, b, ['ap']) },
      { title: 'Křivka MP', text: 'Mezní produkt nejprve roste, dosáhne maxima a pak klesá. Dokud je nad průměrem, průměr roste. AP protíná v jeho maximu a dál je pod ním.', viz: productViz(a, b, ['ap', 'mp']) },
      { title: 'Průsečík', text: 'MP protíná AP v maximu AP. Za průsečíkem je MP pod AP, a průměr proto klesá. MP dosáhne nuly dřív, než by klesl celkový produkt.', viz: ref },
    ],
  });
}
function buildGrafIzokvanta({ w, r, TC }) {
  const L = TC / (2 * w); const K = TC / (2 * r);
  const ref = optimumViz({ TC, w, r });
  return mk('graf-izokvanta', {
    part: 'zkouska', points: 2,
    data: { w, r, TC },
    task: `Nakreslete do grafu s osami L (práce) a K (kapitál) izokvantu a izokostu pro ceny práce ${czText(w)} Kč a kapitálu ${czText(r)} Kč a celkové náklady ${czText(TC)} Kč. Vyznačte nákladové optimum firmy E.`,
    answerSpec: { kind: 'whiteboard', reference: ref },
    conclusion: `Optimum E je v bodě dotyku izokvanty a izokosty (L = ${czText(L)}, K = ${czText(K)}); platí MRTS = ${czText(w / r)} = PL/PK.`,
    source: sourceOf(2),
    solution: [
      { title: 'Izokosta', text: `Izokosta protíná osu práce v bodě ${czText(TC / w)} a osu kapitálu v bodě ${czText(TC / r)}. Směrnice je −w/r = ${czText(-w / r)}.`,
        viz: optimumViz({ TC, w, r }, ['cost']) },
      { title: 'Izokvanta', text: 'Izokvanta je klesající křivka konvexní k počátku, která představuje stejný objem výstupu.',
        viz: optimumViz({ TC, w, r }, ['iso', 'cost']) },
      { title: 'Nákladové optimum', text: `Firma s danými náklady dosáhne nejvyššího výstupu v bodě E, kde se izokvanta izokosty dotýká. Tam se směrnice rovnají: MRTS = w/r = ${czText(w / r)}. Vyšší izokvanta je pro dané náklady nedosažitelná, nižší znamená zbytečně nízký výstup.`,
        viz: ref },
    ],
  });
}
function buildGrafZlate({ P, fc, c, d }) {
  const Q = (P - c) / (2 * d);
  const ref = goldViz({ P, fc, c, d, Q });
  return mk('graf-zlate', {
    part: 'zkouska', points: 2,
    data: { P, fc, c, d },
    task: 'Nakreslete do grafu křivku mezních nákladů MC, křivku průměrných nákladů AC a mezní příjem MR dokonale konkurenční firmy. Vyznačte optimální výstup podle zlatého pravidla maximalizace zisku.',
    answerSpec: { kind: 'whiteboard', reference: ref },
    conclusion: 'Mezní příjem MR = P je vodorovná přímka. Optimální výstup je v průsečíku MC s touto přímkou.',
    solution: [
      { title: 'MR = P', text: 'V dokonalé konkurenci je mezní příjem roven ceně, a proto je to vodorovná přímka ve výšce P.',
        viz: econ({ axes: { x: 'Q', y: 'Kč' }, domain: [0, 2 * Q], range: [0, 2 * P], curves: [{ expr: `${P}`, label: 'MR = P', color: 'blue' }], alt: 'Mezní příjem dokonale konkurenční firmy' }) },
      { title: 'MC a AC', text: 'MC roste a protíná AC v jejím minimu. AC má tvar U.',
        viz: econ({ axes: { x: 'Q', y: 'Kč' }, domain: [0, 2 * Q], range: [0, 2 * P], curves: [{ expr: `${c} + ${2 * d}*x`, label: 'MC', color: 'accent' }, { expr: `${fc}/x + ${c} + ${d}*x`, label: 'AC', color: 'green' }, { expr: `${P}`, label: 'MR = P', color: 'blue' }], alt: 'Křivky MC, AC a MR' }) },
      { title: 'Zlaté pravidlo', text: 'Optimální výstup je tam, kde MR = MC. Z bodu průsečíku vedeme kolmici na osu Q. Vlevo od něj je MR nad MC a výrobu je výhodné zvyšovat, vpravo je MR pod MC a výrobu je výhodné snižovat.', viz: ref },
    ],
  });
}
const COST_B = [4, 5, 6];
const PRODUCT_PARAMS = [[20, 6], [20, 8], [30, 6], [30, 8]];

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('ucetni-zisk', 'Účetní a ekonomický zisk', genZisk, buildZisk),
  type('mezni-produkt', 'Mezní a průměrný produkt z tabulky', genMezniProdukt, buildMezniProdukt),
  type('prod-polynom', 'Produkční funkce: mezní a průměrný produkt', genProdFunkce, buildProdFunkce),
  type('cobb-douglas', 'Produkční funkce Q = m·√(L·K)', genCD, buildCD),
  type('vynosy-rozsah', 'Výnosy z rozsahu', genVynosy, buildVynosy),
  type('mrts', 'Mezní míra technické substituce', genMrts, buildMrts),
  type('izokosta-bod', 'Izokosta: kombinace vstupů', genIzokosta, buildIzokosta),
  type('izokosta-rovnice', 'Rovnice izokosty', genIzokostaRovnice, buildIzokostaRovnice),
  type('optimum-kombinace', 'Nákladové optimum: volba kombinace', genOptimumKomb, buildOptimumKomb),
  type('mppk-pravidlo', 'Pravidlo minimalizace nákladů: mezní produkt', genMppk, buildMppk),
  type('kratke-naklady', 'Fixní a celkové náklady z tabulky vstupů', genKratke, buildKratke),
  type('vydaje-faktory', 'Výdaje na faktory a minimalizace nákladů', genVydaje, buildVydaje),
  type('naklady-tabulka', 'Tabulka nákladů VC, MC, AFC, AC, AVC', genTabulkaNakladu, buildTabulkaNakladu),
  type('naklady-polynom', 'Náklady z funkce TC', genNakladyPolynom, buildNakladyPolynom),
  type('tabulka-prijmu', 'Tabulka příjmů TR, MR, AR', genTabulkaPrijmu, buildTabulkaPrijmu),
  type('prumerny-prijem', 'Průměrný příjem', genPrijem, buildPrijem),
  type('zlate-konkurence', 'Zlaté pravidlo: konkurenční firma', genZlateKonkurence, buildZlateKonkurence),
  type('zlate-mr', 'Zlaté pravidlo: klesající poptávka', genZlateMr, buildZlateMr),
  type('elasticita-nabidky', 'Cenová elasticita nabídky', genElasticitaNabidky, buildElasticitaNabidky),
  type('elasticita-typ', 'Elastická, nebo neelastická nabídka?', genElasticitaTyp, buildElasticitaTyp),
  type('vyber-teorie', 'Výběr z možností (křivky, izokvanty, období)', genVyber, buildVyber),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => {
    const df = pick(rng, DEFS);
    return buildDefinice({ id: df.id, order: shuffle(rng, [...df.right, ...df.wrong].map((_, i) => i)) });
  }, buildDefinice),
  type('graf-naklady', 'Nakresli MC, AC, AVC (zkouška)', (rng) => buildGrafNaklady({ b: pick(rng, COST_B) }), buildGrafNaklady),
  type('graf-produkt', 'Nakresli AP a MP (zkouška)', (rng) => { const [a, b] = pick(rng, PRODUCT_PARAMS); return buildGrafProdukt({ a, b }); }, buildGrafProdukt),
  type('graf-izokvanta', 'Nakresli izokvantu a izokostu (zkouška)', (rng) => {
    const w = pick(rng, [2, 4, 5, 10]); const r = pick(rng, [2, 4, 5, 10]);
    return buildGrafIzokvanta({ w, r, TC: 2 * lcm(w, r) * int(rng, 2, 6) });
  }, buildGrafIzokvanta),
  type('graf-zlate', 'Nakresli zlaté pravidlo MR = MC (zkouška)', (rng) => {
    const d = int(rng, 1, 5); const c = pick(rng, [10, 20, 30, 40]); const Q = int(rng, 5, 40);
    return buildGrafZlate({ P: c + 2 * d * Q, fc: 100 * int(rng, 1, 5), c, d });
  }, buildGrafZlate),
];

// ---------- výklad ----------
const view = (curves, extra = {}) => econ({ axes: { x: 'Q', y: 'Kč' }, domain: [0, 100], range: [0, 60], curves, ...extra });

const theory = [
  { heading: 'Zisk firmy: účetní a ekonomický', term: 'Ekonomický zisk',
    text: 'Firma se snaží maximalizovat zisk, tedy rozdíl mezi celkovými příjmy TR a celkovými náklady TC.\n\nNáklady se dají chápat dvojím způsobem. Explicitní náklady jsou skutečné peněžní výdaje: suroviny, mzdy, nájem. Zaznamenává je účetnictví. Implicitní náklady firma nikomu neplatí, jsou to náklady obětované příležitosti: příjem, který by majitel získal, kdyby svůj čas, peníze nebo majetek použil jinde (například mzda, kterou by dostal jako zaměstnanec).\n\nÚčetní zisk odečítá jen explicitní náklady. Ekonomický zisk odečítá explicitní i implicitní náklady, a je proto o implicitní náklady menší. Nulový ekonomický zisk se nazývá normální zisk: firma pokryla všechny náklady včetně obětované příležitosti a majitel nemá důvod podnikání měnit.',
    tex: '\\pi_{\\text{účetní}}=TR-N_{expl},\\qquad \\pi_{\\text{ekon}}=TR-N_{expl}-N_{impl}',
    mistakes: ['Implicitní náklady odpovídají hodnotě nejlepší nerealizované alternativy, ne nejhorší.', 'Normální zisk neznamená, že firma nevydělává nic: ekonomický zisk je nulový, ale majitel dostane tolik, kolik by získal jinde.', 'V ekonomii se nákladové křivky (TC, AC) počítají včetně implicitních nákladů.'] },
  { heading: 'Produkční funkce, krátké a dlouhé období', term: 'Produkční funkce',
    text: 'Produkční funkce udává největší objem výstupu Q, který lze vyrobit z dané kombinace vstupů (například práce L a kapitálu K) při dané úrovni technologie.\n\nO tom, co firma může měnit, rozhoduje časový horizont. V krátkém období je aspoň jeden vstup fixní (zpravidla kapitál: budovy, stroje) a firma mění jen variabilní vstupy, například počet pracovníků. V dlouhém období jsou všechny vstupy variabilní: firma může změnit i velikost provozu. Ve skriptech se jako hranice uvádí zhruba jeden rok.',
    tex: 'Q=f(L,K)',
    mistakes: ['V krátkém období nejsou všechny vstupy variabilní: aspoň jeden je fixní.', 'Produkční funkce říká největší, ne nejmenší možný výstup z daných vstupů.'] },
  { heading: 'Celkový, průměrný a mezní produkt', term: 'Zákon klesajících mezních výnosů',
    text: 'V krátkém období sledujeme, jak se výstup mění s množstvím jednoho variabilního vstupu, například práce L, zatímco kapitál zůstává pevný.\n\nCelkový produkt TP je celý výstup. Průměrný produkt je výstup na jednotku vstupu, AP = TP/L. Mezní produkt je přírůstek výstupu, který přinese jedna další jednotka vstupu, MP = ΔTP/ΔL.\n\nZákon klesajících mezních výnosů: přidáváme-li variabilní vstup k fixním vstupům, od určitého bodu se přírůstky výstupu zmenšují, takže mezní produkt klesá. Důvod: pracovníci sdílejí stejné stroje a prostor a každý další má méně kapitálu k dispozici.\n\nPro vztah MP a AP platí totéž jako pro každý mezní a průměr: dokud je MP větší než AP, průměr roste; je-li MP menší, průměr klesá. MP proto protíná AP v jeho maximu.',
    tex: 'MP=\\frac{\\Delta TP}{\\Delta L},\\qquad AP=\\frac{TP}{L}',
    viz: productViz(20, 6, ['ap', 'mp'], true),
    mistakes: ['Klesající mezní produkt neznamená klesající celkový produkt: TP dál roste, jen pomaleji (dokud je MP kladný).', 'Zákon klesajících výnosů se týká krátkého období, kdy je jeden vstup pevný. Neplatí pro výnosy z rozsahu.'] },
  { heading: 'Izokvanta a mezní míra technické substituce', term: 'Izokvanta',
    text: 'V dlouhém období firma kombinuje práci a kapitál různými způsoby. Izokvanta je křivka, která spojuje všechny kombinace práce L a kapitálu K, z nichž lze vyrobit stejný objem Q. Je to obdoba indiferenční křivky spotřebitele, výstup se však měří v kusech.\n\nVlastnosti izokvant: jsou klesající, konvexní k počátku a neprotínají se. Izokvanty vzdálenější od počátku představují větší výstup. Soubor izokvant tvoří mapu izokvant.\n\nMezní míra technické substituce MRTS udává, kolik jednotek kapitálu lze vynechat, když přidáme jednu jednotku práce, aby výstup zůstal stejný. Je to absolutní hodnota směrnice izokvanty a rovná se poměru mezních produktů. Při pohybu po izokvantě dolů klesá, a proto je izokvanta konvexní.',
    tex: 'MRTS=\\left|\\frac{\\Delta K}{\\Delta L}\\right|=\\frac{MP_L}{MP_K}',
    viz: econ({ axes: { x: 'L', y: 'K' }, domain: [0, 20], range: [0, 20], curves: [{ expr: '60/x', label: 'Q1', color: 'blue' }, { expr: '120/x', label: 'Q2', color: 'chalk', dashed: true }], alt: 'Mapa izokvant: vzdálenější izokvanta znamená větší výstup' }),
    mistakes: ['Izokvanta spojuje kombinace se stejným výstupem, ne se stejnými náklady. Stejné náklady popisuje izokosta.', 'Izokvanty se nikdy neprotínají, stejně jako indiferenční křivky.'] },
  { heading: 'Izokosta a nákladové optimum firmy', term: 'Nákladové optimum firmy',
    text: 'Izokosta (linie stejných nákladů) je přímka všech kombinací práce a kapitálu, které firma pořídí za stejné celkové náklady: TC = w·L + r·K, kde w je cena jednotky práce a r cena jednotky kapitálu. Protíná osu práce v bodě TC/w a osu kapitálu v bodě TC/r, její směrnice je −w/r. Při změně celkových nákladů se izokosta rovnoběžně posune, při změně ceny jednoho vstupu změní sklon.\n\nNákladové optimum firmy je v bodě dotyku izokvanty a izokosty: za dané náklady firma vyrobí nejvíc, resp. daný výstup vyrobí nejlevněji. V bodě dotyku se směrnice rovnají: MRTS = w/r. Po úpravě: MPL/w = MPK/r, tedy poslední koruna za práci přinese stejný výstup jako poslední koruna za kapitál.',
    tex: 'TC=wL+rK,\\qquad \\frac{MP_L}{MP_K}=\\frac{w}{r}',
    viz: optimumViz({ TC: 80, w: 2, r: 4 }),
    mistakes: ['Zlevní-li práce, izokosta se otočí a firma použije víc práce a méně kapitálu (ne naopak).', 'Pravidlo minimalizace nákladů určuje kombinaci vstupů, ne objem výroby. Ten se určuje podle MR = MC.'] },
  { heading: 'Výnosy z rozsahu', term: 'Výnosy z rozsahu',
    text: 'Výnosy z rozsahu popisují, jak se změní výstup, když všechny vstupy zvětšíme ve stejném poměru (třeba na dvojnásobek). Týkají se dlouhého období.\n\nRostoucí výnosy z rozsahu: výstup vzroste víc než vstupy (dvojnásobek vstupů dá víc než dvojnásobek výstupu), průměrné náklady klesají.\n\nKonstantní výnosy z rozsahu: výstup vzroste stejně jako vstupy.\n\nKlesající výnosy z rozsahu: výstup vzroste méně než vstupy, průměrné náklady rostou.\n\nPři nízkých výstupech bývají zpravidla rostoucí výnosy z rozsahu, při vysokých klesající, což dává dlouhodobým průměrným nákladům tvar U.',
    mistakes: ['Výnosy z rozsahu (mění se všechny vstupy) nezaměňujte se zákonem klesajících mezních výnosů (mění se jen jeden vstup). Mohou platit současně.', 'Konstantní výnosy z rozsahu neznamenají konstantní výstup, ale výstup rostoucí stejně rychle jako vstupy.'] },
  { heading: 'Náklady firmy v krátkém období', term: 'Fixní náklady',
    text: 'Celkové náklady TC se v krátkém období dělí na fixní a variabilní.\n\nFixní náklady FC se s objemem výroby nemění a firma je hradí i tehdy, když nevyrábí (nájem, pojištění majetku). Variabilní náklady VC se s výrobou mění (suroviny, mzdy). Křivka FC je vodorovná, VC vychází z nuly a TC je křivka VC posunutá nahoru o FC.\n\nJednotkové náklady jsou náklady na kus: průměrné AC = TC/Q, průměrné fixní AFC = FC/Q a průměrné variabilní AVC = VC/Q, přičemž AC = AFC + AVC. Mezní náklady MC jsou přírůstek TC při zvýšení výstupu o jednotku.',
    tex: 'TC=FC+VC,\\quad AC=\\frac{TC}{Q}=AFC+AVC,\\quad MC=\\frac{\\Delta TC}{\\Delta Q}',
    mistakes: ['Mezní náklady se počítají z přírůstku celkových nákladů, takže fixní náklady v nich nejsou. Z VC vyjde stejný výsledek, protože FC je konstanta.', 'Celkové náklady (Kč) a jednotkové náklady (Kč na kus) se kreslí do různých grafů.'] },
  { heading: 'Tvary křivek MC, AC, AVC a AFC', term: 'Mezní náklady',
    text: 'AFC s růstem výstupu stále klesá (fixní náklady se rozloží na víc kusů). AVC a AC mají typický tvar písmene U: nejdřív klesají, pak rostou. Minimum AC leží vpravo od minima AVC, protože AC = AVC + AFC a AFC ještě klesá. Mezní náklady MC nejdřív klesají a od určitého výstupu rostou.\n\nKřivka MC protíná AVC i AC v jejich minimech. Důvod je stejný jako u každého mezního a průměru: dokud je MC pod průměrem, průměr klesá, a jakmile je nad ním, průměr roste. Průměr je tedy nejmenší přesně tam, kde se oba rovnají.\n\nV dlouhém období neexistují fixní náklady a všechny náklady jsou variabilní. Křivka LTC vychází z nuly, dlouhodobé průměrné náklady LAC mají tvar U kvůli výnosům z rozsahu a křivka LMC protíná LAC v jejím minimu.',
    viz: costViz(6, ['avc', 'ac', 'mc'], true),
    mistakes: ['AFC nemá tvar U: stále klesá. Tvar U mají AC a AVC.', 'MC protíná AC a AVC v jejich minimech, ne v minimu AFC (ta minimum nemá).', 'Je-li MC pod AC, průměrné náklady klesají, i když MC už roste.'] },
  { heading: 'Příjmy firmy: TR, AR a MR', term: 'Mezní příjem',
    text: 'Celkový příjem TR je cena krát prodané množství. Průměrný příjem AR je příjem na prodanou jednotku, a protože AR = TR/Q = P, rovná se vždy ceně a jeho křivka splývá s poptávkou po výrobcích firmy. Mezní příjem MR je přírůstek TR při prodeji o jednotku víc.\n\nV dokonalé konkurenci firma prodá libovolné množství za stejnou cenu, a proto MR = AR = P (vodorovná přímka). V nedokonalé konkurenci má firma klesající poptávku: aby prodala další kus, musí snížit cenu všem kusům, a proto je MR menší než cena. U lineární poptávky P = A − BQ klesá MR dvakrát rychleji než cena: MR = A − 2BQ.',
    tex: 'TR=P\\cdot Q,\\quad AR=\\frac{TR}{Q}=P,\\quad MR=\\frac{\\Delta TR}{\\Delta Q}',
    mistakes: ['AR = P platí v každé tržní struktuře, nejen v dokonalé konkurenci.', 'MR = P platí jen v dokonalé konkurenci. S klesající poptávkou je MR pod cenou.'] },
  { heading: 'Zlaté pravidlo maximalizace zisku', term: 'Zlaté pravidlo maximalizace zisku',
    text: 'Firma maximalizuje zisk porovnáním mezních příjmů a mezních nákladů.\n\n• MR > MC: další kus přidá víc k příjmům než k nákladům, zisk roste, firma výrobu zvyšuje.\n• MR < MC: další kus stojí víc, než vynese, zisk klesá, firma výrobu snižuje.\n• MR = MC: zisk už nelze zvýšit, je největší, firma je v rovnováze.\n\nZlaté pravidlo MR = MC platí bez ohledu na typ konkurence. Optimální výstup se z něj spočte (u konkurenční firmy z P = MC) a cena se u firmy s klesající poptávkou zjistí dosazením do poptávky. Zisk potom je TR − TC.',
    tex: 'MR=MC',
    viz: view([{ expr: '10 + 2*x', label: 'MC', color: 'accent' }, { expr: '50', label: 'MR = P', color: 'blue' }], { domain: [0, 40], range: [0, 100], points: [{ x: 20, y: 50, label: 'E', guides: true }] }),
    mistakes: ['Pravidlo MR = MC určuje výstup. Pravidlo minimalizace nákladů MPL/w = MPK/r určuje jen kombinaci vstupů pro daný výstup.', 'U firmy s klesající poptávkou se cena neberou z MR, ale z poptávkové křivky při optimálním množství.'] },
  { heading: 'Cenová elasticita nabídky', term: 'Cenová elasticita nabídky',
    text: 'Cenová elasticita nabídky měří, o kolik procent se změní nabízené množství, když se cena změní o 1 %.\n\nBodově ji pro lineární nabídku Q = c + dP spočteme jako koeficient d (změna množství na jednotku ceny) krát podíl ceny a množství v daném bodě.\n\nE > 1: elastická nabídka (množství reaguje víc než cena). E < 1: neelastická nabídka. E = 1: jednotkově elastická nabídka. Elasticita nabídky je kladná, protože cena a nabízené množství rostou společně. Je větší v dlouhém období a když mají firmy volné kapacity nebo zásoby.',
    tex: 'E_S=\\frac{\\%\\Delta Q_S}{\\%\\Delta P}=\\frac{dQ}{dP}\\cdot\\frac{P}{Q}',
    mistakes: ['Elasticita a sklon křivky nejsou totéž: sklon se měří v jednotkách, elasticita v procentech, a proto se mění i po přímce.', 'Elasticita nabídky se obvykle uvádí kladná, na rozdíl od elasticity poptávky.'] },
];

export default {
  id: 'nabidka', title: 'Nabídka na trhu výrobků a služeb', order: 4, theory, types,
};

// pomocná funkce pro test (minimum konvexní funkce): zachována kvůli kontrole bodů v grafech nákladů
export const _costMinima = (b) => {
  const { a, fc } = costParams(b);
  return {
    avc: minimumOf((q) => a - b * q + 0.5 * q * q, 0.01, 20),
    ac: minimumOf((q) => fc / q + a - b * q + 0.5 * q * q, 0.01, 20),
  };
};
