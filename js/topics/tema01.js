// Téma 1: Úvod do ekonomického studia (podle skript kap. 1, 2 a 13, prezentace 1 a cvičebnice kap. 1, 2 a 12).
// Stejná struktura jako tema02.js: theory (výklad), types (generate + solve), každý příklad má kroky s tabulí nebo grafem.
// Hranice produkčních možností (PPF) je v příkladech konkávní parabola Y = B·(m² − X²) = A − B·X², A = B·m², takže
// průsečík s osou X je celé číslo m a body na hranici mají celočíselné souřadnice.
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'uvod';
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
const lit = (x) => String(r6(x));
const tabTex = (rows) => `\\begin{array}{c|${'c'.repeat(rows[0].length - 1)}}${rows[0].join('&')}\\\\\\hline ${rows.slice(1).map((r) => r.join('&')).join('\\\\')}\\end{array}`;
const csv = (arr) => arr.map(cz).join(',\\ ');

// ---------- graf hranice produkčních možností ----------
// Hranice Y = A − B·X² pro X od 0 do m (A = B·m²). Osy X a Y jsou množství dvou statků.
const ppfExpr = (A, B) => `${A} - ${B}*x^2`;
function ppfViz({ B, m, points = [], curves = [], arrows = [], alt }) {
  const A = B * m * m;
  return {
    kind: 'econ',
    data: {
      axes: { x: 'X', y: 'Y' },
      domain: [0, nice(m * 1.3)], range: [0, nice(A * 1.45)],
      curves: [{ expr: ppfExpr(A, B), label: 'PPF', color: 'blue', domain: [0, m] }, ...curves],
      points, arrows, areas: [],
      alt: alt || 'Hranice produkčních možností',
    },
  };
}
const ppfY = (B, m, x) => B * (m * m - x * x);

// ---------- typ: náklady obětované příležitosti (studium, kurz) ----------
const NAKLADY = {
  studium: {
    fmt: (f, w) => `Zvažujete roční studium na vysoké škole. Studium vás stojí ${czText(f)} Kč ročně (poplatky, učebnice), které byste při práci nevydávali. Kdybyste místo studia pracovali, vydělali byste ${czText(w)} Kč ročně.`,
    fee: 'výdaje spojené jen se studiem (poplatky, učebnice)', wage: 'ušlý výdělek z práce', thing: 'studia', name: 'studium',
  },
  kurz: {
    fmt: (f, w) => `Zvažujete čtyřtýdenní jazykový kurz. Kurzovné je ${czText(f)} Kč a po dobu kurzu byste přišli o výdělek ${czText(w)} Kč, který byste jinak získali prací.`,
    fee: 'kurzovné', wage: 'ušlý výdělek', thing: 'kurzu', name: 'kurz',
  },
};

function buildNaklady({ scenario, fee, wage, ask }) {
  const sc = NAKLADY[scenario] ?? NAKLADY.studium;
  const total = fee + wage;
  const askTotal = ask === 'total';
  const value = askTotal ? total : wage;
  const question = askTotal
    ? `Kolik Kč činí náklady obětované příležitosti ${sc.thing} v ekonomickém smyslu, tedy hodnota všeho, čeho se kvůli němu vzdáte?`
    : 'Kolik Kč činí implicitní náklad, tedy ušlý výdělek z nejlepší alternativy?';
  return mk('naklady-prilezitosti', {
    data: { scenario, fee, wage, ask },
    task: `${sc.fmt(fee, wage)} ${question}`,
    answerSpec: { kind: 'number', value },
    conclusion: askTotal
      ? `Celkové náklady obětované příležitosti jsou ${czText(total)} Kč.`
      : `Implicitní náklad (ušlý výdělek) je ${czText(wage)} Kč.`,
    source: { chapter: 2, number: 1 },
    solution: [
      { title: 'Co je nejlepší alternativa', text: `Náklady obětované příležitosti jsou hodnotou nejlepší varianty, které se rozhodnutím vzdáváme. Zde je tou variantou práce místo ${sc.thing}.`,
        board: [line(`\\text{${sc.name}}\\ \\text{vs.}\\ \\text{práce}`)] },
      { title: 'Co všechno se vzdáváme', text: `Vzdáváme se dvou věcí: ušlého výdělku (to je implicitní náklad, žádný peníz se neodevzdává, ale nezískáme ho) a ${sc.fee}, které bychom při práci neplatili (explicitní výdaj).`,
        board: [line(`\\text{${sc.wage}}=${cz(wage)}`), line(`\\text{${sc.fee}}=${cz(fee)}`)] },
      { title: askTotal ? 'Součet' : 'Implicitní náklad', text: askTotal
        ? 'Oba údaje sečteme: ekonomické náklady zahrnují jak to, co zaplatíme, tak to, co nezískáme.'
        : 'Implicitní náklad je právě ušlý výdělek z nejlepší alternativy. Poplatky jsou explicitní výdaj, a proto do implicitního nákladu nepatří.',
      board: [askTotal ? result(`${cz(wage)}+${cz(fee)}=${cz(total)}\\ \\text{Kč}`) : result(`${cz(wage)}\\ \\text{Kč}`)] },
      { title: 'Na co si dát pozor', text: 'Do nákladů obětované příležitosti patří jen to, co se rozhodnutím skutečně mění. Výdaje, které byste měli stejně (například bydlení a jídlo při práci i při studiu), se nepočítají. Také se počítá jen nejlepší alternativa, ne součet všech možných.',
        board: [line('\\text{náklady}=\\text{co zaplatíme navíc}+\\text{co nezískáme}')] },
    ],
  });
}

function genNaklady(rng) {
  if (rng() < 0.5) {
    return buildNaklady({ scenario: 'studium', fee: 10000 * int(rng, 4, 20), wage: 20000 * int(rng, 15, 30), ask: pick(rng, ['total', 'implicit']) });
  }
  return buildNaklady({ scenario: 'kurz', fee: 1000 * int(rng, 6, 30), wage: 1000 * int(rng, 10, 60), ask: pick(rng, ['total', 'implicit']) });
}

// ---------- typ: volba dopravy s časem jako nákladem ----------
function buildDoprava({ w, t1, h1, t2, h2 }) {
  const c1 = t1 + w * h1; const c2 = t2 + w * h2;
  const best = c1 < c2 ? 'vlak' : 'letadlo';
  const dh = h1 - h2; const dp = t2 - t1;
  const wBreak = dp / dh;
  return mk('volba-dopravy', {
    data: { w, t1, h1, t2, h2 },
    task: `Jste podnikatel a každá hodina práce vám vynese ${czText(w)} Kč (hodiny cesty byste mohli jinak odpracovat). Na služební cestu můžete jet vlakem (jízdenka ${czText(t1)} Kč, cesta trvá ${czText(h1)} h), nebo letět letadlem (letenka ${czText(t2)} Kč, cesta trvá ${czText(h2)} h). Který dopravní prostředek je při započtení ušlého výdělku levnější?`,
    answerSpec: { kind: 'choice', value: best, options: [{ id: 'vlak', text: 'Vlak' }, { id: 'letadlo', text: 'Letadlo' }] },
    conclusion: `Levnější je ${best === 'vlak' ? 'vlak' : 'letadlo'}: ${czText(Math.min(c1, c2))} Kč proti ${czText(Math.max(c1, c2))} Kč.`,
    source: { chapter: 2, number: 2 },
    solution: [
      { title: 'Čas má cenu', text: `Strávený čas stojí tolik, kolik bychom v něm vydělali. Hodina cesty proto stojí ${czText(w)} Kč ušlého výdělku (implicitní náklad) navíc k ceně jízdenky.`,
        board: [line('\\text{celkový náklad}=\\text{jízdenka}+w\\cdot h')] },
      { title: 'Celkový náklad vlaku', text: 'Cenu jízdenky sečteme s ušlým výdělkem za dobu cesty.',
        board: [line(`${cz(t1)}+${cz(w)}\\cdot ${cz(h1)}=${cz(c1)}`)] },
      { title: 'Celkový náklad letadla', text: 'Stejný výpočet pro letadlo.',
        board: [line(`${cz(t2)}+${cz(w)}\\cdot ${cz(h2)}=${cz(c2)}`)] },
      { title: 'Porovnání', text: `Zvolíme variantu s nižším celkovým nákladem: ${best === 'vlak' ? `vlak (${czText(c1)} < ${czText(c2)})` : `letadlo (${czText(c2)} < ${czText(c1)})`}.`,
        board: [result(best === 'vlak' ? `${cz(c1)}<${cz(c2)}\\ \\Rightarrow\\ \\text{vlak}` : `${cz(c2)}<${cz(c1)}\\ \\Rightarrow\\ \\text{letadlo}`)] },
      { title: 'Zkouška hranice', text: `Letadlo ušetří ${czText(dh)} h a stojí o ${czText(dp)} Kč víc. Vyplatí se, když ušetřený čas vyprodukuje víc než ${czText(dp)} Kč, tedy při hodinovém výdělku nad ${czText(wBreak)} Kč.`,
        board: [line(`w>\\frac{${cz(dp)}}{${cz(dh)}}=${cz(wBreak)}`)] },
    ],
  });
}

function genDoprava(rng) {
  for (let i = 0; i < 200; i++) {
    const w = 50 * int(rng, 6, 20);
    const t1 = 100 * int(rng, 5, 15); const h1 = int(rng, 5, 10);
    const t2 = 500 * int(rng, 6, 14); const h2 = int(rng, 1, 3);
    if (t1 + w * h1 !== t2 + w * h2) return buildDoprava({ w, t1, h1, t2, h2 });
  }
  return buildDoprava({ w: 500, t1: 800, h1: 8, t2: 5000, h2: 1 });
}

// ---------- typ: náklad obětované příležitosti z tabulky PPF ----------
const PPF_NAMES = [
  { xg: 'automobilů', xu: 'tis. ks', yg: 'piva', yu: 'tis. hl' },
  { xg: 'traktorů', xu: 'tis. ks', yg: 'obilí', yu: 'tis. t' },
  { xg: 'počítačů', xu: 'tis. ks', yg: 'knih', yu: 'tis. ks' },
  { xg: 'lodí', xu: 'ks', yg: 'tanků', yu: 'ks' },
];

function buildPpfTab({ names, xs, ys, seg, ask }) {
  const nm = PPF_NAMES[names] ?? PPF_NAMES[0];
  const xi = xs[seg]; const xj = xs[seg + 1]; const yi = ys[seg]; const yj = ys[seg + 1];
  const dx = r6(xj - xi); const dy = r6(yi - yj); const c = r6(dy / dx);
  const askTotal = ask === 'celkem';
  const value = askTotal ? dy : c;
  const unitCosts = xs.slice(1).map((x, k) => r6((ys[k] - ys[k + 1]) / (x - xs[k])));
  return mk('ppf-tabulka', {
    data: { names, xs, ys, seg, ask },
    task: `Tabulka udává kombinace ${nm.xg} (X, ${nm.xu}) a ${nm.yg} (Y, ${nm.yu}), které ekonomika při plném využití všech zdrojů vyrobí (body na hranici produkčních možností). Ekonomika vyrábí ${czText(xi)} ${nm.xu} ${nm.xg} a ${czText(yi)} ${nm.yu} ${nm.yg} a chce zvýšit výrobu ${nm.xg} na ${czText(xj)} ${nm.xu}. ${askTotal ? `Kolik ${nm.yu} ${nm.yg} musí obětovat?` : `Kolik ${nm.yu} ${nm.yg} musí v průměru obětovat na každý přidaný 1 ${nm.xu} ${nm.xg}?`}`,
    promptTex: tabTex([['X', ...xs.map(cz)], ['Y', ...ys.map(cz)]]),
    answerSpec: { kind: 'number', value },
    conclusion: askTotal ? `Ekonomika musí obětovat ${czText(dy)} ${nm.yu} ${nm.yg}.` : `Na každý přidaný 1 ${nm.xu} ${nm.xg} se obětuje v průměru ${czText(c)} ${nm.yu} ${nm.yg}.`,
    source: { chapter: 2, number: 5 },
    solution: [
      { title: 'Co tabulka udává', text: `Každý sloupec je jedna efektivní kombinace, tedy bod na hranici produkčních možností. Víc ${nm.xg} lze vyrobit jen tak, že se uvolní zdroje z výroby ${nm.yg}.`,
        board: [line(`(X;\\ Y):\\ (${cz(xi)};\\ ${cz(yi)})\\ \\to\\ (${cz(xj)};\\ ${cz(yj)})`)] },
      { title: 'Přírůstek výroby X', text: `Výroba ${nm.xg} vzroste o rozdíl obou hodnot X.`,
        board: [line(`\\Delta X=${cz(xj)}-${cz(xi)}=${cz(dx)}`)] },
      { title: 'Úbytek výroby Y', text: `Výroba ${nm.yg} při tom klesne. Úbytek je obětované množství, tedy náklad obětované příležitosti celého přírůstku.`,
        board: [askTotal ? result(`\\Delta Y=${cz(yi)}-${cz(yj)}=${cz(dy)}`) : line(`\\Delta Y=${cz(yi)}-${cz(yj)}=${cz(dy)}`)] },
      { title: 'Náklad na jednotku', text: `Dělením úbytku Y přírůstkem X dostaneme průměrný náklad obětované příležitosti jedné jednotky ${nm.xg} mezi oběma body (směrnici spojnice těchto bodů).`,
        board: [askTotal ? line(`\\frac{${cz(dy)}}{${cz(dx)}}=${cz(c)}`) : result(`\\frac{${cz(dy)}}{${cz(dx)}}=${cz(c)}`)] },
      { title: 'Náklady rostou', text: 'Podíváme se na všechny sousední dvojice bodů. Náklad na jednotku roste, a hranice je proto zakřivená směrem od počátku (konkávní). Čím víc jednoho statku vyrábíme, tím víc druhého musíme obětovat za každou další jednotku.',
        board: unitCosts.map((u, k) => line(`\\frac{${cz(r6(ys[k] - ys[k + 1]))}}{${cz(r6(xs[k + 1] - xs[k]))}}=${cz(u)}`)) },
    ],
  });
}

function genPpfTab(rng) {
  const names = int(rng, 0, PPF_NAMES.length - 1);
  const dx = [int(rng, 1, 3), int(rng, 1, 3), int(rng, 1, 3)];
  const c1 = int(rng, 1, 4); const c2 = c1 + int(rng, 1, 3); const c3 = c2 + int(rng, 1, 4);
  const cs = [c1, c2, c3];
  const xs = [0]; dx.forEach((d) => xs.push(xs[xs.length - 1] + d));
  const yEnd = pick(rng, [0, 0, 2, 4, 5]);
  const ys = [yEnd + cs[0] * dx[0] + cs[1] * dx[1] + cs[2] * dx[2]];
  for (let k = 0; k < 3; k++) ys.push(ys[k] - cs[k] * dx[k]);
  return buildPpfTab({ names, xs, ys, seg: int(rng, 0, 2), ask: pick(rng, ['celkem', 'za-kus']) });
}

// ---------- typ: bod na hranici, uvnitř, nebo za hranicí ----------
const POS_OPTIONS = [
  { id: 'ef', text: 'Na hranici (efektivní výroba)' },
  { id: 'nef', text: 'Uvnitř hranice (neefektivní, zdroje nejsou plně využity)' },
  { id: 'ned', text: 'Za hranicí (při daných zdrojích ji nelze vyrobit)' },
];

function buildPpfBod({ B, m, x, y }) {
  const A = B * m * m; const f = ppfY(B, m, x);
  const cls = y === f ? 'ef' : y < f ? 'nef' : 'ned';
  const word = { ef: 'leží na hranici', nef: 'leží uvnitř hranice', ned: 'leží za hranicí' }[cls];
  const rel = { ef: '=', nef: '<', ned: '>' }[cls];
  const graph = ppfViz({ B, m, points: [{ x, y, label: 'K', color: 'accent' }], alt: `Bod K ${word}` });
  return mk('ppf-bod', {
    data: { B, m, x, y },
    task: `Ekonomika vyrábí statky X a Y (obojí v tisících kusů). Hranice jejích produkčních možností je dána rovnicí vpravo. Rozhodněte, kde leží kombinace $X=${cz(x)}$, $Y=${cz(y)}$.`,
    promptTex: `Y=${cz(A)}-${coef(B, 'X')}^{2}`,
    answerSpec: { kind: 'choice', value: cls, options: POS_OPTIONS },
    conclusion: `Kombinace ${word}${cls === 'ef' ? ': je efektivní' : cls === 'nef' ? ': je neefektivní' : ': je nedosažitelná'}.`,
    source: { chapter: 2, number: 5 },
    solution: [
      { title: 'Co nám dává hranice', text: `Pro dané množství $X=${cz(x)}$ udává rovnice nejvíc, kolik statku Y lze při plném využití zdrojů vyrobit.`,
        board: [line(`Y_{max}(X)=${cz(A)}-${coef(B, 'X')}^{2}`)] },
      { title: 'Dosadíme X', text: `Za $X$ dosadíme ${czText(x)} a spočteme největší možné Y.`,
        board: [line(`Y_{max}(${cz(x)})=${cz(A)}-${cz(B)}\\cdot ${cz(x)}^{2}=${cz(f)}`)] },
      { title: 'Porovnáme se zadaným Y', text: `Zadané Y je ${czText(y)}. Je-li rovné ${czText(f)}, bod leží na hranici. Je-li menší, leží uvnitř (zdroje zůstaly nevyužity). Je-li větší, na takovou výrobu zdroje nestačí.`,
        board: [line(`Y=${cz(y)}\\ ${rel}\\ Y_{max}=${cz(f)}`)] },
      { title: 'Závěr', text: `Kombinace ${word}. ${cls === 'ef' ? 'Efektivní znamená, že nelze vyrobit víc jednoho statku, aniž bychom obětovali část druhého.' : cls === 'nef' ? 'Při stejných zdrojích by šlo vyrobit víc obou statků nebo víc jednoho z nich bez ztráty druhého.' : 'Pokud se zdroje nebo technologie nezlepší, tuto výrobu nelze uskutečnit.'}`,
        board: [result(`\\text{${{ ef: 'na hranici', nef: 'uvnitř', ned: 'za hranicí' }[cls]}}`)] },
      { title: 'Graf', text: `Bod K v grafu leží ${cls === 'ef' ? 'přímo na křivce' : cls === 'nef' ? 'pod křivkou' : 'nad křivkou'}.`, viz: graph },
    ],
  });
}

function genPpfBod(rng) {
  const B = int(rng, 1, 4); const m = int(rng, 6, 12);
  const x = int(rng, 1, m - 1); const f = ppfY(B, m, x);
  const cls = pick(rng, ['ef', 'nef', 'ned']);
  const k = int(rng, 2, Math.max(2, Math.floor(f / 3)));
  return buildPpfBod({ B, m, x, y: cls === 'ef' ? f : cls === 'nef' ? f - k : f + k });
}

// ---------- typ: co se stane s hranicí produkčních možností ----------
const EVENT_OPTIONS = [
  { id: 'po', text: 'Pohyb po hranici (jiná kombinace statků, hranice se nemění)' },
  { id: 'ven', text: 'Hranice se posune ven (ekonomika může vyrobit víc)' },
  { id: 'dovnitr', text: 'Hranice se posune dovnitř (ekonomika může vyrobit míň)' },
  { id: 'uvnitr', text: 'Ekonomika se dostane dovnitř hranice (zdroje nejsou plně využity, hranice se nemění)' },
  { id: 'k', text: 'Ekonomika se z bodu uvnitř přiblíží k hranici (zdroje se začnou využívat, hranice se nemění)' },
];
const PPF_EVENTS = [
  { id: 'ropa', text: 'Země objevila velká nová naleziště nerostných surovin.', ans: 'ven', why: 'Přibylo zdrojů, a ekonomika proto může při plném využití vyrobit víc obou statků.' },
  { id: 'technologie', text: 'Nová technologie zvýšila produktivitu ve výrobě obou statků.', ans: 'ven', why: 'S lepší technologií se z týchž zdrojů vyrobí víc, takže se celá hranice posune ven.' },
  { id: 'imigrace', text: 'V zemi vzrostl počet pracovníků, protože se přistěhovali noví lidé.', ans: 'ven', why: 'Víc práce znamená víc zdrojů a hranice se posune ven.' },
  { id: 'tech-jedno', text: 'Nová technologie zvýšila produktivitu jen ve výrobě statku X, u statku Y se nic nezměnilo.', ans: 'ven', why: 'Hranice se rozšíří ven na straně statku X (průsečík s osou X se vzdálí od počátku), průsečík s osou Y zůstane. Hranice se tedy posune ven, ale ne rovnoměrně.' },
  { id: 'investice', text: 'Země několik let investuje do strojů a zařízení místo spotřeby (hranice v budoucím období).', ans: 'ven', why: 'Vyšší zásoba kapitálu zvýší budoucí produkční možnosti. Dnes se kvůli tomu spotřebuje méně, ale hranice za několik let leží dál od počátku.' },
  { id: 'valka', text: 'Válka zničila část továren a dopravní infrastruktury.', ans: 'dovnitr', why: 'Zničením kapitálu se zdrojů ztratilo, a ekonomika může vyrobit míň, takže se hranice posune dovnitř.' },
  { id: 'zemetreseni', text: 'Zemětřesení zničilo velkou část průmyslových kapacit země.', ans: 'dovnitr', why: 'Zničené stroje a budovy jsou ztracené zdroje a hranice se zmenší.' },
  { id: 'recese', text: 'Země upadla do hluboké recese, velká část továren stojí a mnoho lidí je nezaměstnaných.', ans: 'uvnitr', why: 'Zdroje (stroje, lidé) existují, ale nepracují. Hranice se tedy nemění, ekonomika jen vyrábí v bodě pod ní.' },
  { id: 'nezamestnanost', text: 'Masová nezaměstnanost způsobila, že polovina práceschopných lidí nepracuje.', ans: 'uvnitr', why: 'Zdroje jsou nevyužity, takže se ekonomika nachází pod hranicí. Možnosti ekonomiky se ale nezmenšily.' },
  { id: 'oziveni', text: 'Po skončení recese našli nezaměstnaní práci a továrny znovu rozjely výrobu.', ans: 'k', why: 'Nevyužité zdroje se začaly využívat. Ekonomika se přesouvá k hranici a ta se nemění.' },
  { id: 'prerazeni', text: 'Vláda přesunula část zdrojů z výroby spotřebního zboží do výroby kapitálových statků (při plném využití zdrojů).', ans: 'po', why: 'Zdroje i technologie jsou stejné. Jen se mění skladba výroby, a ekonomika se proto pohybuje po hranici.' },
  { id: 'poptavka', text: 'Spotřebitelé začali víc chtít víno a méně pivo, zdroje i technologie jsou stejné a využité.', ans: 'po', why: 'Změna chuti ovlivňuje, kterou kombinaci si ekonomika vybere. Možnosti, které určují hranici, se nemění, a jde proto o pohyb po ní.' },
];
const evById = (id) => PPF_EVENTS.find((e) => e.id === id) ?? PPF_EVENTS[0];
const EVENT_SHORT = { po: 'po hranici', ven: 'ven', dovnitr: 'dovnitř', uvnitr: 'uvnitř', k: 'k hranici' };
const EVENT_BOARD = {
  po: '\\text{bod}\\ A\\ \\to\\ B\\ \\text{(po PPF)}', ven: 'PPF_0\\ \\to\\ PPF_1\\ \\text{(ven)}', dovnitr: 'PPF_0\\ \\to\\ PPF_1\\ \\text{(dovnitř)}',
  uvnitr: '\\text{bod pod PPF}', k: '\\text{bod pod PPF}\\ \\to\\ \\text{na PPF}',
};

// Pevný základ pro grafy událostí: Y = 64 − X² (m = 8).
function eventGraph(ans) {
  const base = { expr: '64 - x^2', label: ans === 'po' || ans === 'uvnitr' || ans === 'k' ? 'PPF' : 'PPF0', color: 'blue', domain: [0, 8] };
  const viewData = { axes: { x: 'X', y: 'Y' }, domain: [0, 12], range: [0, 110], areas: [] };
  if (ans === 'ven') return { kind: 'econ', data: { ...viewData, curves: [base, { expr: '100 - x^2', label: 'PPF1', color: 'accent', dashed: true, domain: [0, 10] }], points: [], arrows: [{ from: [6, 28], to: [7.3, 40], label: '' }], alt: 'Posun hranice produkčních možností ven' } };
  if (ans === 'dovnitr') return { kind: 'econ', data: { ...viewData, curves: [base, { expr: '36 - x^2', label: 'PPF1', color: 'accent', dashed: true, domain: [0, 6] }], points: [], arrows: [{ from: [6, 28], to: [4.8, 14], label: '' }], alt: 'Posun hranice produkčních možností dovnitř' } };
  if (ans === 'uvnitr') return { kind: 'econ', data: { ...viewData, curves: [base], points: [{ x: 5, y: 39, label: 'A' }, { x: 5, y: 20, label: 'B', color: 'accent' }], arrows: [{ from: [5, 39], to: [5, 22], label: '' }], alt: 'Ekonomika se dostane pod hranici' } };
  if (ans === 'k') return { kind: 'econ', data: { ...viewData, curves: [base], points: [{ x: 4, y: 30, label: 'A', color: 'accent' }, { x: 5, y: 39, label: 'B' }], arrows: [{ from: [4, 30], to: [4.9, 38], label: '' }], alt: 'Ekonomika se přibližuje k hranici' } };
  return { kind: 'econ', data: { ...viewData, curves: [base], points: [{ x: 3, y: 55, label: 'A' }, { x: 6, y: 28, label: 'B', color: 'accent' }], arrows: [{ from: [3.3, 53], to: [5.7, 30], label: '' }], alt: 'Pohyb po hranici produkčních možností' } };
}

const EVENT_RULE = 'Hranici určují zdroje a technologie. Mění-li se ony, posouvá se hranice. Mění-li se jen to, jak je ekonomika využívá, je to pohyb po hranici nebo do vnitřku (a zpět). Poptávka a vkus spotřebitelů hranici neposouvají.';

function buildPpfUdalost({ eventId }) {
  const ev = evById(eventId);
  return mk('ppf-udalost', {
    data: { eventId },
    task: `Ekonomika vyrábí dva statky. Co se stane s hranicí produkčních možností, nebo s polohou ekonomiky vůči ní, když: ${ev.text}`,
    answerSpec: { kind: 'choice', value: ev.ans, options: EVENT_OPTIONS },
    conclusion: `${EVENT_OPTIONS.find((o) => o.id === ev.ans).text}.`,
    source: { chapter: 2, number: 7 },
    solution: [
      { title: 'Co se změnilo', text: ev.why, board: [line(EVENT_BOARD[ev.ans])] },
      { title: 'Rozlišení tří možností', text: EVENT_RULE, board: [line('\\text{zdroje, technologie}\\ \\Rightarrow\\ \\text{PPF}')] },
      { title: 'Graf', text: 'Plná křivka je původní hranice. Čárkovaně je nová hranice nebo šipka znázorňuje přesun bodu.', viz: eventGraph(ev.ans) },
      { title: 'Závěr', text: `Správně: ${EVENT_OPTIONS.find((o) => o.id === ev.ans).text.toLowerCase()}.`, board: [result(`\\text{${EVENT_SHORT[ev.ans]}}`)] },
    ],
  });
}

// ---------- typ: mezní a průměrná veličina z tabulky ----------
function buildMezniTab({ kind, F, a, b, p0, k }) {
  const n = 5; const qs = [1, 2, 3, 4, 5];
  const tot = kind === 'tc' ? [F, ...qs.map((q) => F + a * q + b * q * q)] : [0, ...qs.map((q) => q * (p0 - k * q))];
  const marg = qs.map((q) => tot[q] - tot[q - 1]);
  const avg = qs.map((q) => tot[q] / q);
  const [T, M, Av] = kind === 'tc' ? ['TC', 'MC', 'AC'] : ['TR', 'MR', 'AR'];
  const textM = kind === 'tc' ? 'mezní náklady' : 'mezní příjmy';
  const textA = kind === 'tc' ? 'průměrné celkové náklady' : 'průměrné příjmy';
  const rows = [marg.map(String), avg.map((v) => String(r6(v)))];
  const trend = qs.slice(1).map((q) => {
    const prev = avg[q - 2]; const m = marg[q - 1];
    return m < prev ? `${M}_{${q}}=${cz(m)}<${Av}_{${q - 1}}=${cz(prev)}\\ \\Rightarrow\\ ${Av}\\downarrow`
      : m > prev ? `${M}_{${q}}=${cz(m)}>${Av}_{${q - 1}}=${cz(prev)}\\ \\Rightarrow\\ ${Av}\\uparrow`
        : `${M}_{${q}}=${cz(m)}=${Av}_{${q - 1}}=${cz(prev)}\\ \\Rightarrow\\ ${Av}\\ \\text{beze změny}`;
  });
  return mk('mezni-tabulka', {
    data: { kind, F, a, b, p0, k },
    task: `Tabulka udává ${kind === 'tc' ? 'celkové náklady TC (v Kč) při výrobě Q kusů; při Q = 0 jsou to fixní náklady' : 'celkový příjem TR (v Kč) při prodeji Q kusů'}. Vypočtěte ${textM} ${M} a ${textA} ${Av} pro Q = 1 až 5 a zapište je do tabulky: první řádek ${M} (Q = 1 až 5), druhý řádek ${Av} (Q = 1 až 5).`,
    promptTex: tabTex([['Q', '0', ...qs.map(String)], [T, ...tot.map(cz)]]),
    answerSpec: { kind: 'table', value: rows },
    conclusion: `${M}: ${marg.map(czText).join('; ')}. ${Av}: ${avg.map(czText).join('; ')}.`,
    source: { chapter: 12, number: 2 },
    solution: [
      { title: 'Mezní veličina', text: `Mezní veličina je přírůstek celkové veličiny při zvýšení Q o jednu jednotku, tedy rozdíl dvou sousedních hodnot ${T}.`,
        board: [line(`${M}_Q=${T}_Q-${T}_{Q-1}`), ...qs.map((q) => line(`${M}_{${q}}=${cz(tot[q])}-${cz(tot[q - 1])}=${cz(marg[q - 1])}`))] },
      { title: 'Průměrná veličina', text: `Průměrná veličina je celková veličina na jednu jednotku: ${T} dělíme množstvím Q.`,
        board: [line(`${Av}_Q=\\frac{${T}_Q}{Q}`), ...qs.map((q) => line(`${Av}_{${q}}=\\frac{${cz(tot[q])}}{${q}}=${cz(avg[q - 1])}`))] },
      { title: 'Výsledek', text: 'Obě řady zapíšeme do tabulky, první řádek mezní, druhý průměrná veličina.',
        board: [result(`${M}:\\ ${csv(marg)}`), result(`${Av}:\\ ${csv(avg)}`)] },
      { title: 'Kontrola vztahu', text: `Průměr klesá, když je mezní hodnota nižší než předchozí průměr, a roste, když je vyšší. Závisí to jen na tomto srovnání, ne na tom, zda ${M} samo roste, nebo klesá.`,
        board: trend.map((t) => line(t)) },
    ],
  });
}

function genMezniTab(rng) {
  if (rng() < 0.5) {
    return buildMezniTab({ kind: 'tc', F: 60 * int(rng, 1, 4), a: int(rng, 5, 20), b: int(rng, 1, 4) });
  }
  const k = int(rng, 1, 4);
  return buildMezniTab({ kind: 'tr', p0: int(rng, 5 * k + 5, 60), k });
}

// ---------- typ: mezní příjem derivací, maximum celkového příjmu ----------
function buildMezniDeriv({ b, m, q0, ask }) {
  const a = 2 * b * m;
  const tr = (q) => a * q - b * q * q;
  const trMax = tr(m);
  const mr = a - 2 * b * q0;
  const value = ask === 'mr' ? mr : ask === 'qmax' ? m : trMax;
  const graph = {
    kind: 'econ',
    data: {
      axes: { x: 'Q', y: 'Kč' }, domain: [0, 2 * m], range: [0, nice(Math.max(trMax, a) * 1.1)],
      curves: [{ expr: `${lit(a)}*x - ${lit(b)}*x^2`, label: 'TR', color: 'blue' }, { expr: `${lit(a)} - ${lit(2 * b)}*x`, label: 'MR', color: 'accent' }],
      points: ask === 'mr' ? [{ x: q0, y: Math.max(mr, 0), label: 'MR' }] : [{ x: m, y: trMax, label: 'max TR', guides: true }],
      arrows: [], areas: [],
      alt: 'Celkový příjem a mezní příjem',
    },
  };
  const trTex = `TR=${cz(a)}Q-${coef(b, 'Q')}^{2}`;
  const task = ask === 'mr'
    ? `Celkový příjem firmy z prodeje Q kusů je dán funkcí vpravo (v Kč). Určete mezní příjem MR při prodeji ${czText(q0)} kusů pomocí derivace.`
    : ask === 'qmax' ? 'Celkový příjem firmy z prodeje Q kusů je dán funkcí vpravo (v Kč). Při jakém množství Q je celkový příjem největší?'
      : 'Celkový příjem firmy z prodeje Q kusů je dán funkcí vpravo (v Kč). Jaký největší celkový příjem může firma dosáhnout?';
  const step = (title, text, board) => ({ title, text, board });
  const derivation = step('Derivace celkového příjmu', 'Mezní příjem je změna celkového příjmu způsobená velmi malou změnou prodaného množství, tedy derivace $TR$ podle $Q$. Člen $aQ$ dá $a$, člen $bQ^2$ dá $2bQ$.',
    [line('MR=\\frac{dTR}{dQ}'), line(`MR=${cz(a)}-${coef(2 * b, 'Q')}`)]);
  const solution = ask === 'mr' ? [
    derivation,
    step('Dosadíme množství', `Za $Q$ dosadíme ${czText(q0)}.`, [result(`MR(${cz(q0)})=${cz(a)}-${cz(2 * b)}\\cdot ${cz(q0)}=${cz(mr)}`)]),
    step('Srovnání s přírůstkem o jednu jednotku', `Přesnou hodnotu v bodě dává derivace. Přírůstek $TR$ při zvýšení prodeje z ${czText(q0 - 1)} na ${czText(q0)} kusů vyjde ${czText(tr(q0) - tr(q0 - 1))}. To je blízko hodnotě derivace, ale není stejné, protože $MR$ se uvnitř intervalu mění (přírůstek odpovídá derivaci uprostřed intervalu, v bodě ${czText(q0 - 0.5)}).`,
      [line(`TR(${cz(q0)})-TR(${cz(q0 - 1)})=${cz(tr(q0))}-${cz(tr(q0 - 1))}=${cz(tr(q0) - tr(q0 - 1))}`)]),
    step('Co znamená znaménko', mr > 0 ? 'Mezní příjem je kladný, takže další prodaná jednotka celkový příjem ještě zvyšuje.' : mr < 0 ? 'Mezní příjem je záporný, takže další prodaná jednotka celkový příjem snižuje (jsme za maximem celkového příjmu).' : 'Mezní příjem je nulový, celkový příjem je právě v maximu.', [line(`MR\\ ${mr > 0 ? '>' : mr < 0 ? '<' : '='}\\ 0`)]),
  ] : ask === 'qmax' ? [
    derivation,
    step('Podmínka maxima', 'Funkce je největší tam, kde je první derivace nulová (tečna je vodorovná). Položíme $MR=0$.', [line(`${cz(a)}-${coef(2 * b, 'Q')}=0`), line(`Q=\\frac{${cz(a)}}{${cz(2 * b)}}`), result(`Q=${cz(m)}`)]),
    step('Kontrola druhou derivací', 'Druhá derivace je záporná, a proto jde o maximum, ne o minimum. Před tímto množstvím je $MR$ kladný, za ním záporný.', [line(`\\frac{d^{2}TR}{dQ^{2}}=-${cz(2 * b)}<0`)]),
    step('Největší příjem', `Pro úplnost dosadíme $Q=${cz(m)}$ do $TR$. Největší příjem je ${czText(trMax)} Kč.`, [line(`TR(${cz(m)})=${cz(a)}\\cdot ${cz(m)}-${cz(b)}\\cdot ${cz(m)}^{2}=${cz(trMax)}`)]),
  ] : [
    derivation,
    step('Množství s maximem', 'Maximum je tam, kde $MR=0$.', [line(`${cz(a)}-${coef(2 * b, 'Q')}=0`), line(`Q=${cz(m)}`)]),
    step('Dosadíme do TR', `Množství ${czText(m)} dosadíme do funkce celkového příjmu.`, [result(`TR(${cz(m)})=${cz(a)}\\cdot ${cz(m)}-${cz(b)}\\cdot ${cz(m)}^{2}=${cz(trMax)}`)]),
    step('Kontrola', 'Druhá derivace je záporná, a jde tedy opravdu o maximum.', [line(`TR''=-${cz(2 * b)}<0`)]),
  ];
  solution.push({ title: 'Graf', text: ask === 'mr' ? `Mezní příjem je sklon křivky $TR$ v bodě $Q=${cz(q0)}$ (a na grafu klesající přímka $MR$).` : `Křivka $TR$ má vrchol v $Q=${cz(m)}$, kde $MR$ protíná vodorovnou osu.`, viz: graph });
  return mk('mezni-derivace', {
    data: { b, m, q0, ask },
    task,
    promptTex: trTex,
    answerSpec: { kind: 'number', value },
    conclusion: ask === 'mr' ? `Mezní příjem je ${czText(mr)} Kč.` : ask === 'qmax' ? `Celkový příjem je největší při množství ${czText(m)}.` : `Největší celkový příjem je ${czText(trMax)} Kč.`,
    source: { chapter: 12, number: 2 },
    solution,
  });
}

function genMezniDeriv(rng) {
  const m = int(rng, 2, 9); const b = int(rng, 1, 5);
  let q0 = int(rng, 1, 2 * m - 1);
  if (q0 === m) q0 = m - 1;
  return buildMezniDeriv({ b, m, q0, ask: pick(rng, ['mr', 'qmax', 'trmax']) });
}

// ---------- typ: směrnice a sklon (přímka, tětiva, tečna) ----------
function buildSmernice({ kind, x1, x2, y1, y2, c, d, x0, ask }) {
  const f = (x) => c + d * x * x;
  const fTex = (x) => `${cz(c)}${d < 0 ? '-' : '+'}${cz(Math.abs(d))}\\cdot ${cz(x)}^{2}`;
  const slope = kind === 'primka' ? (y2 - y1) / (x2 - x1) : kind === 'tetiva' ? (f(x2) - f(x1)) / (x2 - x1) : 2 * d * x0;
  const wantAbs = kind === 'primka' && ask === 'sklon';
  const value = wantAbs ? Math.abs(slope) : slope;
  const curveTex = `y=${cz(c)}${d < 0 ? '-' : '+'}${cz(Math.abs(d))}x^{2}`;
  let task; let viz; let steps;
  if (kind === 'primka') {
    task = `Přímka vyjadřující závislost ceny $P$ (v Kč) na množství $Q$ prochází body $(Q;\\ P)=(${cz(x1)};\\ ${cz(y1)})$ a $(${cz(x2)};\\ ${cz(y2)})$. Určete její ${wantAbs ? 'sklon (absolutní hodnotu směrnice)' : 'směrnici'}.`;
    const lo = Math.min(y1, y2);
    viz = { kind: 'econ', data: { axes: { x: 'Q', y: 'P' }, domain: [0, nice(x2 + 2)], range: [0, nice(Math.max(y1, y2) * 1.3)],
      curves: [{ expr: `${lit(y1)} + (${lit(slope)})*(x - ${lit(x1)})`, label: slope < 0 ? 'klesající' : 'rostoucí', color: 'blue' }],
      points: [{ x: x1, y: y1, label: 'A' }, { x: x2, y: y2, label: 'B' }], arrows: [], areas: [], alt: lo >= 0 ? 'Přímka procházející dvěma body' : 'Přímka' } };
    steps = [
      { title: 'Změna na obou osách', text: 'Směrnice je změna proměnné na svislé ose dělená změnou proměnné na vodorovné ose.',
        board: [line('k=\\frac{\\Delta P}{\\Delta Q}'), line(`\\Delta P=${cz(y2)}-${cz(y1)}=${cz(y2 - y1)}`), line(`\\Delta Q=${cz(x2)}-${cz(x1)}=${cz(x2 - x1)}`)] },
      { title: 'Podíl', text: 'Obě změny vydělíme. Znaménko ukazuje směr: záporná směrnice znamená klesající přímku (proměnné se mění opačně, jako u poptávky), kladná rostoucí (jako u nabídky).',
        board: [wantAbs ? line(`k=\\frac{${cz(y2 - y1)}}{${cz(x2 - x1)}}=${cz(slope)}`) : result(`k=\\frac{${cz(y2 - y1)}}{${cz(x2 - x1)}}=${cz(slope)}`)] },
      ...(wantAbs ? [{ title: 'Sklon je absolutní hodnota', text: 'Sklon udává jen strmost, bez ohledu na směr, a proto se rovná absolutní hodnotě směrnice.', board: [result(`|k|=${cz(Math.abs(slope))}`)] }] : [{ title: 'Sklon a směrnice', text: 'Sklon by byl absolutní hodnotou směrnice. Směrnice má znaménko, sklon je kladný.', board: [line(`|k|=${cz(Math.abs(slope))}`)] }]),
      { title: 'Graf', text: `Přímka spojuje body A a B. Na každou jednotku množství se cena mění o ${czText(slope)}.`, viz },
    ];
  } else if (kind === 'tetiva') {
    task = `Funkce je dána rovnicí vpravo. Určete směrnici křivky mezi body s $x=${cz(x1)}$ a $x=${cz(x2)}$, tedy směrnici spojnice těchto dvou bodů křivky.`;
    viz = { kind: 'econ', data: { axes: { x: 'x', y: 'y' }, domain: [0, nice(x2 + 2)], range: [0, nice(Math.max(f(x1), f(x2), c, 1) * 1.3)],
      curves: [{ expr: `${lit(c)} + ${lit(d)}*x^2`, label: 'f', color: 'blue' }, { expr: `${lit(f(x1))} + (${lit(slope)})*(x - ${lit(x1)})`, label: 'spojnice', color: 'accent', dashed: true, domain: [x1, x2] }],
      points: [{ x: x1, y: f(x1), label: 'A' }, { x: x2, y: f(x2), label: 'B' }], arrows: [], areas: [], alt: 'Spojnice dvou bodů křivky' } };
    steps = [
      { title: 'Hodnoty funkce v obou bodech', text: 'Nejdřív do funkce dosadíme obě hodnoty $x$.',
        board: [line(`f(${cz(x1)})=${fTex(x1)}=${cz(f(x1))}`), line(`f(${cz(x2)})=${fTex(x2)}=${cz(f(x2))}`)] },
      { title: 'Změny', text: 'Spočteme změnu hodnoty funkce a změnu $x$.',
        board: [line(`\\Delta y=${cz(f(x2))}-${cz(f(x1))}=${cz(f(x2) - f(x1))}`), line(`\\Delta x=${cz(x2)}-${cz(x1)}=${cz(x2 - x1)}`)] },
      { title: 'Směrnice spojnice', text: 'Směrnice spojnice je průměrná směrnice křivky mezi oběma body.',
        board: [result(`k=\\frac{${cz(f(x2) - f(x1))}}{${cz(x2 - x1)}}=${cz(slope)}`)] },
      { title: 'Graf', text: `Čárkovaná spojnice bodů A a B má směrnici ${czText(slope)}. Směrnice křivky se mezi body mění, spojnice ukazuje jen průměr.`, viz },
    ];
  } else {
    task = `Funkce je dána rovnicí vpravo. Určete směrnici křivky v bodě $x=${cz(x0)}$ (tedy směrnici tečny) pomocí derivace.`;
    viz = { kind: 'econ', data: { axes: { x: 'x', y: 'y' }, domain: [0, nice(x0 + 3)], range: [0, nice(Math.max(f(x0), c, 1) * 1.5)],
      curves: [{ expr: `${lit(c)} + ${lit(d)}*x^2`, label: 'f', color: 'blue' }, { expr: `${lit(f(x0))} + (${lit(slope)})*(x - ${lit(x0)})`, label: 'tečna', color: 'accent', dashed: true, domain: [Math.max(0, x0 - 2), x0 + 2] }],
      points: [{ x: x0, y: f(x0), label: 'T' }], arrows: [], areas: [], alt: 'Tečna ke křivce' } };
    steps = [
      { title: 'Derivace funkce', text: 'Směrnice křivky v bodě je směrnice tečny, a tu dává první derivace. Člen $dx^2$ se derivuje na $2dx$, konstanta na nulu.',
        board: [line(curveTex), line(`y'=${coef(2 * d, 'x')}`)] },
      { title: 'Dosazení bodu', text: `Do derivace dosadíme $x=${cz(x0)}$.`,
        board: [result(`y'(${cz(x0)})=${cz(2 * d)}\\cdot ${cz(x0)}=${cz(slope)}`)] },
      { title: 'Význam', text: slope > 0 ? 'Směrnice je kladná, křivka v tomto bodě roste.' : slope < 0 ? 'Směrnice je záporná, křivka v tomto bodě klesá.' : 'Směrnice je nulová, tečna je vodorovná.', board: [line(`k\\ ${slope > 0 ? '>' : slope < 0 ? '<' : '='}\\ 0`)] },
      { title: 'Graf', text: `Tečna se dotýká křivky v bodě T a má směrnici ${czText(slope)}. U přímky se směrnice nemění, u křivky ano, proto se musí uvést bod.`, viz },
    ];
  }
  return mk('smernice', {
    data: { kind, x1, x2, y1, y2, c, d, x0, ask },
    task,
    ...(kind === 'primka' ? {} : { promptTex: curveTex }),
    answerSpec: { kind: 'number', value },
    conclusion: `${wantAbs ? 'Sklon' : 'Směrnice'} je ${czText(value)}.`,
    source: { chapter: 12, number: 1 },
    solution: steps,
  });
}

function genSmernice(rng) {
  const kind = pick(rng, ['primka', 'tetiva', 'tecna']);
  if (kind === 'primka') {
    const s = int(rng, 1, 6) * (rng() < 0.6 ? -1 : 1); const dx = int(rng, 1, 5);
    const x1 = int(rng, 1, 5); const y1 = Math.max(20, Math.abs(s) * dx + int(rng, 5, 20));
    return buildSmernice({ kind, x1, x2: x1 + dx, y1, y2: y1 + s * dx, c: 0, d: 0, x0: 0, ask: pick(rng, ['smernice', 'sklon']) });
  }
  const d = int(rng, 1, 4) * (rng() < 0.5 ? -1 : 1); const c = d < 0 ? 300 : int(rng, 0, 20);
  if (kind === 'tetiva') {
    const x1 = int(rng, 0, 4); return buildSmernice({ kind, x1, x2: x1 + int(rng, 1, 4), y1: 0, y2: 0, c, d, x0: 0, ask: 'smernice' });
  }
  return buildSmernice({ kind, x1: 0, x2: 0, y1: 0, y2: 0, c, d, x0: int(rng, 1, 6), ask: 'smernice' });
}

// ---------- typ: vztah mezní a průměrné veličiny ----------
const PRUMER_CTX = [
  { tot: 'průměrné celkové náklady', be: 'jsou', unit: 'Kč na kus', cur: 'Kč', lead: (n) => `Při výrobě ${czText(n)} kusů`, nxt: 'Výroba dalšího kusu stojí', tail: 'Co se stane s průměrnými celkovými náklady, když firma vyrobí ještě jeden kus?' },
  { tot: 'průměrný příjem', be: 'je', unit: 'Kč na kus', cur: 'Kč', lead: (n) => `Při prodeji ${czText(n)} kusů`, nxt: 'Prodej dalšího kusu přinese', tail: 'Co se stane s průměrným příjmem na kus, když firma prodá ještě jeden kus?' },
  { tot: 'průměrná mzda', be: 'je', unit: 'tis. Kč', cur: 'tis. Kč', lead: (n) => `U ${czText(n)} zaměstnanců`, nxt: 'Přijme se další zaměstnanec s mzdou', tail: 'Co se stane s průměrnou mzdou ve firmě po jeho přijetí?' },
];
const PRUMER_OPTIONS = [
  { id: 'klesne', text: 'Průměr klesne' }, { id: 'vzroste', text: 'Průměr vzroste' }, { id: 'nezmeni', text: 'Průměr se nezmění' },
];

function buildPrumer({ ctx, A, n, j }) {
  const c = PRUMER_CTX[ctx] ?? PRUMER_CTX[0];
  const m = A + j * (n + 1);
  const newAvg = (n * A + m) / (n + 1);
  const ans = m < A ? 'klesne' : m > A ? 'vzroste' : 'nezmeni';
  const rel = m < A ? '<' : m > A ? '>' : '=';
  return mk('prumer-mezni', {
    data: { ctx, A, n, j },
    task: `${c.lead(n)} ${c.be} ${c.tot} ${czText(A)} ${c.unit}. ${c.nxt} ${czText(m)} ${c.cur}. ${c.tail}`,
    answerSpec: { kind: 'choice', value: ans, options: PRUMER_OPTIONS },
    conclusion: `Nový průměr je ${czText(newAvg)} ${c.unit}, ${ans === 'klesne' ? 'průměr tedy klesl' : ans === 'vzroste' ? 'průměr tedy vzrostl' : 'průměr se tedy nezměnil'}.`,
    source: { chapter: 12, number: 3 },
    solution: [
      { title: 'Mezní a průměrná hodnota', text: `Průměr je ${czText(A)}. Nová (mezní) hodnota je ${czText(m)}. Rozhoduje jen to, zda je nová hodnota nižší, nebo vyšší než dosavadní průměr.`,
        board: [line(`\\text{průměr}=${cz(A)},\\quad \\text{mezní}=${cz(m)}`)] },
      { title: 'Porovnání', text: m < A ? 'Nová hodnota je pod průměrem, a průměr tím tedy táhne dolů.' : m > A ? 'Nová hodnota je nad průměrem, a průměr tím tedy táhne nahoru.' : 'Nová hodnota se rovná průměru, a průměr se proto nezmění (jsme v extrému průměrné veličiny).',
        board: [line(`${cz(m)}\\ ${rel}\\ ${cz(A)}`)] },
      { title: 'Nový průměr', text: 'Celkovou hodnotu před přidáním (průměr krát počet) zvýšíme o novou hodnotu a vydělíme počtem o jedna větším.',
        board: [result(`\\frac{${cz(n)}\\cdot ${cz(A)}+${cz(m)}}{${cz(n + 1)}}=${cz(newAvg)}`)] },
      { title: 'Závěr', text: `Průměr ${ans === 'klesne' ? 'klesne' : ans === 'vzroste' ? 'vzroste' : 'se nezmění'} (z ${czText(A)} na ${czText(newAvg)}). Pravidlo: mezní pod průměrem, průměr klesá. Mezní nad průměrem, průměr roste. Mezní rovno průměru, průměr se nemění.`,
        board: [line(`${ans === 'klesne' ? 'MC<AC\\ \\Rightarrow\\ AC\\downarrow' : ans === 'vzroste' ? 'MC>AC\\ \\Rightarrow\\ AC\\uparrow' : 'MC=AC\\ \\Rightarrow\\ AC\\ \\text{beze změny}'}`)] },
    ],
  });
}

function genPrumer(rng) {
  const n = int(rng, 2, 9); const j = pick(rng, [-3, -2, -1, -1, 0, 1, 1, 2, 3]);
  return buildPrumer({ ctx: int(rng, 0, PRUMER_CTX.length - 1), A: int(rng, 15, 45) * 2 + 10, n, j });
}

// ---------- typ: klasifikace pojmů ----------
const KIND_OPTS = {
  pn: [{ id: 'poz', text: 'Pozitivní výrok' }, { id: 'norm', text: 'Normativní výrok' }, { id: 'smis', text: 'Obsahuje pozitivní i normativní část' }],
  mm: [{ id: 'mikro', text: 'Mikroekonomie' }, { id: 'makro', text: 'Makroekonomie' }],
  chyba: [{ id: 'cp', text: 'Porušení ceteris paribus' }, { id: 'ph', text: 'Omyl „poté, tedy proto“' }, { id: 'ce', text: 'Uvažování z části na celek' }],
  statek: [{ id: 'volny', text: 'Volný statek' }, { id: 'ekon', text: 'Ekonomický statek' }],
  faktor: [{ id: 'pud', text: 'Půda (přírodní zdroje)' }, { id: 'prace', text: 'Práce' }, { id: 'kap', text: 'Reálný kapitál' }, { id: 'fin', text: 'Finanční kapitál (peníze, cenné papíry)' }],
  system: [{ id: 'zvyk', text: 'Zvyková (tradiční) ekonomika' }, { id: 'prik', text: 'Příkazová (plánovaná) ekonomika' }, { id: 'trh', text: 'Tržní ekonomika' }, { id: 'smis', text: 'Smíšená ekonomika' }],
  otazka: [{ id: 'co', text: 'CO vyrábět' }, { id: 'jak', text: 'JAK vyrábět' }, { id: 'koho', text: 'PRO KOHO vyrábět' }],
};
const KIND_ASK = {
  pn: 'Je následující výrok pozitivní, normativní, nebo obsahuje obojí?',
  mm: 'Kterou částí ekonomie se zabývá následující situace?',
  chyba: 'O kterou chybu v ekonomickém uvažování jde?',
  statek: 'Jde o volný, nebo o ekonomický statek?',
  faktor: 'Do které skupiny výrobních faktorů patří?',
  system: 'Který typ ekonomiky je popsán?',
  otazka: 'Kterou ze tří základních ekonomických otázek tato situace řeší?',
};
const KIND_RULE = {
  pn: 'Pozitivní výrok popisuje, jaký svět je, a lze ho ověřit fakty (může být pravdivý, nebo nepravdivý). Normativní výrok vyjadřuje hodnotový soud o tom, jaký by svět měl být, a ověřit ho fakty nelze (typická slova: „měl by“, „nespravedlivé“, „lepší“, „nesmí“). Smíšený výrok spojuje obojí.',
  mm: 'Mikroekonomie zkoumá rozhodování jednotlivých subjektů (domácnosti, firmy, jednotlivého trhu). Makroekonomie zkoumá ekonomiku jako celek: HDP, inflaci, celkovou nezaměstnanost, agregátní spotřebu a investice. Hranice mezi nimi není ostrá, ale podle předmětu zkoumání obvykle jde rozhodnout.',
  chyba: 'Ceteris paribus: vliv jednoho činitele lze posuzovat, jen když ostatní zůstávají stejné. Omyl „poté, tedy proto“: že jedna událost nastala po druhé, neznamená, že ji způsobila. Uvažování z části na celek: co platí pro jednoho, nemusí platit, když totéž dělají všichni.',
  statek: 'Volný statek je dostupný v dané době a místě v libovolném množství za nulovou cenu, protože ho není třeba vyrábět ani si o něj konkurovat. Ekonomický statek je vzácný: vyžaduje zdroje a má cenu. Zařazení závisí na místě a čase (pitná voda ve městě je dnes statek ekonomický).',
  faktor: 'Půda jsou přírodní zdroje (pozemky, nerosty, energie). Práce je lidská činnost. Reálný kapitál jsou vyrobené prostředky k další výrobě (stroje, budovy, zásoby, know-how). Finanční kapitál (peníze, cenné papíry) sám nic nevyrábí, ale umožňuje reálné faktory nakoupit.',
  system: 'Podle toho, jak se řeší tři základní otázky: zvyková ekonomika se řídí tradicí, příkazová centrálním plánem, tržní cenami na trzích. Smíšená ekonomika kombinuje trh s hospodářskou rolí státu. Čistě tržní a čistě příkazové ekonomiky jsou spíš modely, skutečné ekonomiky jsou smíšené.',
  otazka: 'CO vyrábět je volba druhu a množství statků. JAK vyrábět je volba technologie a kombinace výrobních faktorů. PRO KOHO vyrábět je otázka, kdo vyrobené statky dostane a v jakém množství.',
};
const KIND_SHORT = {
  pn: { poz: 'pozitivní', norm: 'normativní', smis: 'smíšený' }, mm: { mikro: 'mikroekonomie', makro: 'makroekonomie' },
  chyba: { cp: 'ceteris paribus', ph: 'poté, tedy proto', ce: 'z části na celek' }, statek: { volny: 'volný', ekon: 'ekonomický' },
  faktor: { pud: 'půda', prace: 'práce', kap: 'reálný kapitál', fin: 'finanční kapitál' },
  system: { zvyk: 'zvyková', prik: 'příkazová', trh: 'tržní', smis: 'smíšená' }, otazka: { co: 'CO', jak: 'JAK', koho: 'PRO KOHO' },
};

// kn-... jsou úlohy ze cvičebnice, kap. 1 a 2 (správné odpovědi z části E).
const ITEMS = [
  { id: 'kn-pn-a', kind: 'pn', text: 'Cena ropy se více než ztrojnásobila v období let 1973 až 1974.', ans: 'poz', key: 'fakt', why: 'Tvrdí fakt o vývoji ceny, který lze ověřit statistikami.' },
  { id: 'kn-pn-b', kind: 'pn', text: 'Rozvojové země světa mají menší příjmy, než by jim mělo patřit podle jejich podílu na světové populaci.', ans: 'norm', key: 'mělo patřit', why: 'Slovo „mělo patřit“ vyjadřuje hodnotový soud o spravedlivém rozdělení, nikoli měřitelný fakt.' },
  { id: 'kn-pn-c', kind: 'pn', text: 'Rozdělení světového důchodu je nespravedlivé, protože chudé rozvojové země, ve kterých žije 60 % světové populace, obdrží jen 6 % světového důchodu.', ans: 'smis', key: 'nespravedlivé a čísla', why: 'První část („je nespravedlivé“) je normativní, druhá část (podíly 60 % a 6 %) je pozitivní.' },
  { id: 'kn-pn-d', kind: 'pn', text: 'Země západní Evropy by měly přijmout opatření ke snížení vysoké nezaměstnanosti.', ans: 'norm', key: 'by měly', why: 'Doporučení, co by se mělo udělat, je normativní.' },
  { id: 'kn-pn-e', kind: 'pn', text: 'Průměrná roční míra inflace v ČR dosáhla v roce 2024 hodnoty 2,4 %.', ans: 'poz', key: 'ověřitelný údaj', why: 'Jde o údaj, který se dá ověřit ve statistice.' },
  { id: 'kn-pn-f', kind: 'pn', text: 'Chudí lidé nemají platit vůbec žádné daně.', ans: 'norm', key: 'nemají platit', why: 'Říká, jak by to mělo být, a nepopisuje, jak to je.' },
  { id: 'kn-pn-g', kind: 'pn', text: 'Míra nezaměstnanosti nesmí nikdy překročit 5 %, neboť pak představuje základní sociální problém.', ans: 'norm', key: 'nesmí', why: 'Stanovuje hodnotové omezení a hodnotí, co je „problém“.' },
  { id: 'kn-pn-h', kind: 'pn', text: 'Z dlouhodobého hlediska je inflace vždy menším zlem než nezaměstnanost.', ans: 'norm', key: 'menší zlo', why: 'Hodnotí, co je větší a co menší zlo, a to je hodnotový soud.' },
  { id: 'kn-pn-i', kind: 'pn', text: 'Příjmy fyzických osob jsou v ČR zdaněny progresivní daní z příjmů.', ans: 'poz', key: 'popis systému', why: 'Popisuje, jak je daň nastavena. Platnost se dá ověřit v zákoně. (Pozitivní výrok může být i nepravdivý.)' },
  { id: 'pn-1', kind: 'pn', text: 'Zvýšení minimální mzdy sníží zaměstnanost nekvalifikovaných pracovníků.', ans: 'poz', key: 'předpověď', why: 'Je to věcné tvrzení o důsledcích, které lze zkoumat daty. Ekonomové se o jeho pravdivosti mohou přít, ale zůstává pozitivní.' },
  { id: 'pn-2', kind: 'pn', text: 'Stát by měl zvýšit minimální mzdu.', ans: 'norm', key: 'by měl', why: 'Doporučení vychází z hodnot a cílů, nejen z faktů.' },
  { id: 'pn-3', kind: 'pn', text: 'Je spravedlivé, aby lidé s vyššími příjmy platili vyšší procento příjmu na daních.', ans: 'norm', key: 'spravedlivé', why: 'O spravedlnosti rozhoduje hodnotový úsudek.' },
  { id: 'pn-4', kind: 'pn', text: 'Zavedení daně z cukru sníží spotřebu slazených nápojů, a proto by se měla zavést.', ans: 'smis', key: 'sníží a měla by', why: 'Předpověď dopadu je pozitivní, závěr „měla by se zavést“ je normativní.' },
  { id: 'kn-mm-a', kind: 'mm', text: 'Státy jižní Evropy čelí vysoké nezaměstnanosti.', ans: 'makro', key: 'celková nezaměstnanost', why: 'Jde o celkovou nezaměstnanost ve státech, tedy o ekonomiku jako celek.' },
  { id: 'kn-mm-b', kind: 'mm', text: 'Firma bude investovat v případě vysoké návratnosti vložených prostředků.', ans: 'mikro', key: 'rozhodnutí firmy', why: 'Jde o rozhodnutí jednoho subjektu, firmy.' },
  { id: 'kn-mm-c', kind: 'mm', text: 'HDP České republiky v roce 2024 vůči roku 2023 vzrostl.', ans: 'makro', key: 'HDP', why: 'HDP je souhrnný ukazatel celé ekonomiky.' },
  { id: 'kn-mm-d', kind: 'mm', text: 'Růst agregátních příjmů společnosti se pravděpodobně odrazí v růstu spotřeby domácností.', ans: 'makro', key: 'agregátní', why: 'Slovo „agregátní“ ukazuje na souhrn za celou ekonomiku.' },
  { id: 'kn-mm-e', kind: 'mm', text: 'Dělník, kterému se zvýší příjmy, bude pravděpodobněji kupovat luxusnější zboží.', ans: 'mikro', key: 'jeden spotřebitel', why: 'Popisuje chování jednotlivého spotřebitele.' },
  { id: 'kn-mm-f', kind: 'mm', text: 'Vyšší úroková míra v ekonomice může způsobit pokles agregátních investic.', ans: 'makro', key: 'agregátní investice', why: 'Týká se celkových investic v ekonomice, nikoli rozhodnutí jedné firmy.' },
  { id: 'kn-mm-g', kind: 'mm', text: 'Nezaměstnanost stavebních dělníků v tomto roce poklesla.', ans: 'mikro', key: 'jedno odvětví', why: 'Týká se trhu práce jednoho povolání (dílčího trhu), ne celkové nezaměstnanosti.' },
  { id: 'kn-mm-h', kind: 'mm', text: 'Zavedení vyšších spotřebních daní na alkohol způsobí jeho menší spotřebu.', ans: 'mikro', key: 'trh jednoho statku', why: 'Sleduje se trh jednoho statku, alkoholu.' },
  { id: 'kn-mm-i', kind: 'mm', text: 'Nevýhodou v podnikání fyzických osob je jejich ručení vlastním jměním.', ans: 'mikro', key: 'jednotlivý podnikatel', why: 'Týká se postavení jednotlivého podnikatele.' },
  { id: 'kn-mm-j', kind: 'mm', text: 'Devalvace české koruny podpořila zvýšení exportu českého zboží na zahraniční trhy.', ans: 'makro', key: 'kurz a export', why: 'Směnný kurz a celkový export jsou ukazatele celé ekonomiky.' },
  { id: 'mm-1', kind: 'mm', text: 'Pekárna se rozhoduje, kolik housek zítra upéct.', ans: 'mikro', key: 'jedna firma', why: 'Rozhoduje jedna firma o svém výstupu.' },
  { id: 'mm-2', kind: 'mm', text: 'Státní rozpočet je v deficitu a celková zadluženost státu roste.', ans: 'makro', key: 'stát jako celek', why: 'Jde o souhrnné veličiny celé ekonomiky.' },
  { id: 'mm-3', kind: 'mm', text: 'Po vydařené úrodě klesla cena jablek na trhu.', ans: 'mikro', key: 'trh jednoho statku', why: 'Zkoumáme jeden trh, trh jablek.' },
  { id: 'mm-4', kind: 'mm', text: 'Inflace v celé ekonomice zrychlila.', ans: 'makro', key: 'inflace', why: 'Inflace je růst celkové cenové hladiny.' },
  { id: 'kn-ch-a', kind: 'chyba', text: 'Jestliže přidáváme stále stejné jednotky dvou vstupů, pak od určitého bodu mezní výnosy klesají, což je příklad zákona klesajících výnosů.', ans: 'cp', key: 'mění se oba vstupy', why: 'Zákon klesajících mezních výnosů platí, když se zvyšuje jen jeden vstup a ostatní zůstávají stejné. Zde se mění oba, a podmínka ceteris paribus je tedy porušena.' },
  { id: 'kn-ch-b', kind: 'chyba', text: 'Fotbalový rozhodčí zapískal a na stadionu začalo ihned pršet, z toho vyplývá, že příčinou deště byl právě rozhodčí.', ans: 'ph', key: 'pískání a déšť', why: 'Že jedna událost následovala po druhé, neznamená, že ji způsobila.' },
  { id: 'kn-ch-c', kind: 'chyba', text: 'Jestliže jedna firma může získat více zaměstnanců nabídkou vyšších mezd, pak všechny ostatní firmy mohou udělat totéž.', ans: 'ce', key: 'jedna firma, všechny firmy', why: 'Co funguje pro jednu firmu, nefunguje pro všechny: když všechny zvýší mzdy, nikdo nezíská výhodu proti ostatním.' },
  { id: 'ch-1', kind: 'chyba', text: 'Kohout zakokrhal a vyšlo slunce, takže slunce vychází kvůli kokrhání.', ans: 'ph', key: 'kohout a slunce', why: 'Časová posloupnost není příčinnost.' },
  { id: 'ch-2', kind: 'chyba', text: 'Když v kině vstanu, uvidím lépe. Proto bude lépe vidět každý, když vstanou všichni.', ans: 'ce', key: 'jeden stojí, všichni stojí', why: 'Výhoda jednoho zmizí, když totéž udělají všichni.' },
  { id: 'ch-3', kind: 'chyba', text: 'Výrobce zjistil, že po zvýšení ceny jeho výrobku se prodalo víc kusů, a prohlásil, že zákon poptávky neplatí. Přitom ve stejném období prudce vzrostly důchody zákazníků.', ans: 'cp', key: 'změnil se i důchod', why: 'Mění se víc činitelů najednou (cena i důchod). Zákon poptávky platí za jinak stejných podmínek, a ty tu nejsou splněny.' },
  { id: 'ch-4', kind: 'chyba', text: 'Po zvýšení spotřební daně z piva vzrostl počet dopravních nehod, takže za nehody může daň.', ans: 'ph', key: 'daň a nehody', why: 'Souběh či následnost dvou jevů neprokazuje, že jeden způsobil druhý.' },
  { id: 'st-1', kind: 'statek', text: 'Sluneční svit při procházce venku.', ans: 'volny', key: 'volně dostupný', why: 'Je dostupný každému bez omezení a výroby, a nemá tedy cenu.' },
  { id: 'st-2', kind: 'statek', text: 'Pitná voda dodávaná vodovodem do bytu ve městě.', ans: 'ekon', key: 'vyrábí se a platí se', why: 'Voda se musí upravit a rozvést, což stojí zdroje, a proto má cenu. Dříve býval takový statek volný.' },
  { id: 'st-3', kind: 'statek', text: 'Chléb v pekárně.', ans: 'ekon', key: 'vyrábí se', why: 'Je vyráběný a vzácný, má cenu.' },
  { id: 'st-4', kind: 'statek', text: 'Vzduch k dýchání na horské louce.', ans: 'volny', key: 'běžný vzduch', why: 'V obvyklých podmínkách je k dispozici bez omezení a bez ceny. Jde o pojem závislý na místě: stlačený kyslík v nemocnici už ekonomický statek je.' },
  { id: 'st-5', kind: 'statek', text: 'Kyslík dodávaný do dýchacího přístroje v nemocnici.', ans: 'ekon', key: 'vyrábí se', why: 'Kyslík se musí vyrobit, uskladnit a dodat, a stojí tedy zdroje.' },
  { id: 'fa-1', kind: 'faktor', text: 'Pole, na kterém farmář pěstuje pšenici.', ans: 'pud', key: 'pozemek', why: 'Pozemek je přírodní zdroj.' },
  { id: 'fa-2', kind: 'faktor', text: 'Soustruh v dílně.', ans: 'kap', key: 'stroj', why: 'Stroj je vyrobený a slouží k další výrobě, jde tedy o reálný kapitál.' },
  { id: 'fa-3', kind: 'faktor', text: 'Práce programátora.', ans: 'prace', key: 'lidská činnost', why: 'Cílevědomá lidská činnost je práce.' },
  { id: 'fa-4', kind: 'faktor', text: 'Hotovost v pokladně firmy.', ans: 'fin', key: 'peníze', why: 'Peníze jsou finanční kapitál. Samy nic nevyrábějí, ale umožňují nakoupit stroje, suroviny a práci.' },
  { id: 'fa-5', kind: 'faktor', text: 'Ložisko černého uhlí.', ans: 'pud', key: 'nerost', why: 'Nerosty patří k půdě jako přírodnímu zdroji.' },
  { id: 'fa-6', kind: 'faktor', text: 'Továrna na výrobu automobilů.', ans: 'kap', key: 'budova a zařízení', why: 'Budovy a výrobní zařízení jsou reálný kapitál.' },
  { id: 'fa-7', kind: 'faktor', text: 'Akcie koupené firmou jako uložení volných peněz.', ans: 'fin', key: 'cenný papír', why: 'Cenné papíry patří k finančnímu kapitálu, nikoli k reálnému.' },
  { id: 'sy-1', kind: 'system', text: 'O tom, co a jak se vyrábí, rozhoduje tradice: syn dělá stejné řemeslo jako otec a úroda se dělí podle starých zvyklostí.', ans: 'zvyk', key: 'tradice', why: 'Rozhoduje zvyk a tradice.' },
  { id: 'sy-2', kind: 'system', text: 'Centrální plán určuje, kolik čeho se vyrobí, kterými podniky a komu se zboží přidělí.', ans: 'prik', key: 'centrální plán', why: 'Rozhoduje plánovací orgán.' },
  { id: 'sy-3', kind: 'system', text: 'O výrobě rozhodují firmy a domácnosti podle cen na trzích, stát chrání jen vlastnická práva.', ans: 'trh', key: 'ceny na trzích', why: 'Rozhodují ceny a soukromé subjekty. Takto čistá ekonomika je ale spíš model.' },
  { id: 'sy-4', kind: 'system', text: 'Většinu výroby řídí ceny na trzích, ale stát vybírá daně, poskytuje školství a zdravotnictví a reguluje některé trhy.', ans: 'smis', key: 'trh a stát', why: 'Kombinuje trh s hospodářskou rolí státu, tak fungují skutečné moderní ekonomiky včetně české.' },
  { id: 'ot-1', kind: 'otazka', text: 'Zda vyrobit víc automobilů, nebo víc bot.', ans: 'co', key: 'druh a množství', why: 'Rozhoduje se o druhu a množství vyráběných statků.' },
  { id: 'ot-2', kind: 'otazka', text: 'Zda pole sklízet kombajny, nebo ručně.', ans: 'jak', key: 'technologie', why: 'Rozhoduje se o technologii a kombinaci výrobních faktorů.' },
  { id: 'ot-3', kind: 'otazka', text: 'Kdo dostane vyrobené zboží a v jakém množství.', ans: 'koho', key: 'rozdělení', why: 'Jde o rozdělení hotových statků mezi lidi.' },
  { id: 'ot-4', kind: 'otazka', text: 'Zda elektřinu vyrábět z uhlí, nebo z větru.', ans: 'jak', key: 'zdroj výroby', why: 'Statek je stejný (elektřina), mění se způsob výroby.' },
  { id: 'ot-5', kind: 'otazka', text: 'Kolik zdrojů věnovat na zdravotnictví a kolik na zbrojení.', ans: 'co', key: 'skladba produkce', why: 'Určuje se skladba výroby.' },
];
const itemById = (id) => ITEMS.find((i) => i.id === id) ?? ITEMS[0];
const bookSource = (id) => (id.startsWith('kn-pn') ? { chapter: 1, number: 2 } : id.startsWith('kn-mm') ? { chapter: 1, number: 1 } : id.startsWith('kn-ch') ? { chapter: 1, number: 3 } : undefined);

function buildKlasifikace({ id }) {
  const it = itemById(id);
  const opts = KIND_OPTS[it.kind];
  const short = KIND_SHORT[it.kind][it.ans];
  return mk('klasifikace', {
    data: { id },
    task: `${KIND_ASK[it.kind]} ${it.text}`,
    answerSpec: { kind: 'choice', value: it.ans, options: opts },
    conclusion: `Správně: ${opts.find((o) => o.id === it.ans).text.toLowerCase()}. ${it.why}`,
    source: bookSource(id),
    solution: [
      { title: 'Rozlišovací pravidlo', text: KIND_RULE[it.kind], board: [line('\\text{pravidlo}\\ \\Rightarrow\\ \\text{znak}')] },
      { title: 'Použití na zadání', text: it.why, board: [line(`\\text{${it.key}}\\ \\Rightarrow\\ \\text{${short}}`)] },
      { title: 'Závěr', text: `Správná odpověď: ${opts.find((o) => o.id === it.ans).text}.`, board: [result(`\\text{${short}}`)] },
    ],
  });
}

// ---------- typ: pravda, nebo nepravda ----------
// kn1-* a kn2-* jsou úkoly ano/ne ze cvičebnice (kap. 1: A, N, N, A, N, A; kap. 2: N, A, A, N, A, A).
const STATEMENTS = [
  { id: 'kn1-a', text: 'Nejvýznamnější prací anglického ekonoma J. M. Keynese je „Obecná teorie zaměstnanosti, úroku a peněz“, poprvé vydaná roku 1936.', truth: true, why: 'Tak je Keynesova hlavní práce vedena a vyšla roku 1936.' },
  { id: 'kn1-b', text: 'Makroekonomie sleduje rozhodovací procesy a celou ekonomiku pouze „očima“ jednoho dílčího ekonomického subjektu, například domácnosti nebo firmy.', truth: false, why: 'To dělá mikroekonomie. Makroekonomie sleduje ekonomiku jako celek.' },
  { id: 'kn1-c', text: 'Ekonomie je věda přírodní, a proto musí vždy v co nejširší míře využívat matematický aparát.', truth: false, why: 'Ekonomie je věda společenská. Matematiku sice hojně využívá, ale není pravda, že ji musí vždy využívat co nejširší měrou.' },
  { id: 'kn1-d', text: 'Mikroekonomie si klade například otázku, kolik zdrojů má jednotlivá firma nakoupit a kolik kusů finální produkce má vyrobit za časovou jednotku.', truth: true, why: 'Rozhodování jednotlivé firmy je typickým předmětem mikroekonomie.' },
  { id: 'kn1-e', text: 'Tvrzení, že ekonomická svoboda a nezávislost je myslitelná jen v tržní ekonomice, je pozitivní výrok, neboť s ním řada ekonomů bezvýhradně souhlasí.', truth: false, why: 'O tom, zda je výrok pozitivní, nerozhoduje souhlas ekonomů, ale to, zda popisuje ověřitelný fakt. Toto tvrzení obsahuje hodnotový názor.' },
  { id: 'kn1-f', text: 'Každá ekonomická škola vychází z určité filosofie, z určitých předpokladů, na nichž buduje teorii a formuluje doporučení pro hospodářskou politiku.', truth: true, why: 'Ekonomické školy se liší předpoklady a hodnotami, a proto dospívají k různým doporučením.' },
  { id: 'kn2-a', text: 'Pod pojmem „neviditelná ruka“ chápeme vliv a interakci skrytých zájmových skupin (lobby).', truth: false, why: 'Neviditelná ruka je Smithova metafora pro to, jak se na trhu s konkurencí sledování vlastního zájmu koordinuje cenami. S lobbováním nemá nic společného.' },
  { id: 'kn2-b', text: 'Zvětšení zásoby kapitálových statků vyžaduje dočasné snížení současné spotřeby.', truth: true, why: 'Při plném využití zdrojů se musí část zdrojů přesunout od spotřebního zboží ke kapitálovým statkům. (Pokud jsou zdroje nevyužité, jde i bez obětování spotřeby.)' },
  { id: 'kn2-c', text: 'Za vzácný statek považujeme ten, který se vyskytuje v omezeném množství.', truth: true, why: 'Vzácnost znamená omezené množství vzhledem k potřebám, které jsou neomezené.' },
  { id: 'kn2-d', text: 'Půda je primárním výrobním faktorem, protože je historicky prvním používaným výrobním faktorem.', truth: false, why: 'Půda je primární proto, že je darem přírody (není vyrobená jinými faktory). Historické pořadí s tím nesouvisí.' },
  { id: 'kn2-e', text: 'Pitnou vodu ve městech můžeme označit jako ekonomický statek, který býval dříve statkem volným.', truth: true, why: 'Její úprava a rozvod stojí zdroje, a proto má cenu.' },
  { id: 'kn2-f', text: 'Z hlediska užití můžeme ekonomické statky rozdělit na kapitálové statky (meziprodukty a dlouhodobé kapitálové statky) a na statky spotřební.', truth: true, why: 'Statky se podle užití dělí na ty, které slouží k další výrobě, a na spotřební.' },
  { id: 'own-1', text: 'Pozitivní výrok musí být vždy pravdivý.', truth: false, why: 'Pozitivní výrok je ověřitelný, ale může být nepravdivý. Důležité je, že ho lze testovat fakty.' },
  { id: 'own-2', text: 'Ceteris paribus znamená, že při zkoumání vlivu jednoho činitele předpokládáme, že ostatní činitele se nemění.', truth: true, why: 'Je to myšlenkové zjednodušení, které odděluje vliv jednoho činitele od ostatních.' },
  { id: 'own-3', text: 'Náklady obětované příležitosti jsou hodnotou všech možných alternativ, kterých se rozhodnutím vzdáme.', truth: false, why: 'Jsou hodnotou jen nejlepší z alternativ, které se vzdáváme.' },
  { id: 'own-4', text: 'Bod uvnitř hranice produkčních možností znamená, že ekonomika nevyužívá všechny své zdroje, nebo je nevyužívá efektivně.', truth: true, why: 'Ze stejných zdrojů by šlo vyrobit víc.' },
  { id: 'own-5', text: 'Při daných zdrojích a technologii nelze trvale vyrábět kombinaci ležící za hranicí produkčních možností.', truth: true, why: 'Hranice vyjadřuje největší dosažitelné kombinace. Za ní chybí zdroje.' },
  { id: 'own-6', text: 'Konkávní hranice produkčních možností znamená, že náklad obětované příležitosti jednoho statku s rostoucí výrobou roste.', truth: true, why: 'Zdroje nejsou stejně vhodné pro oba statky, takže další jednotka vyžaduje obětovat stále víc druhého statku.' },
  { id: 'own-7', text: 'Když mezní náklad leží pod průměrným nákladem, průměrný náklad klesá.', truth: true, why: 'Nižší nová hodnota táhne průměr dolů.' },
  { id: 'own-8', text: 'Mezní náklad se vždy rovná průměrnému nákladu.', truth: false, why: 'Rovnají se jen v jediném bodě, v minimu průměrných nákladů.' },
  { id: 'own-9', text: 'Směrnice klesající přímky je záporná, její sklon je kladné číslo.', truth: true, why: 'Sklon je absolutní hodnota směrnice.' },
  { id: 'own-10', text: 'Za vzácný statek se považuje statek, kterého je na světě málo.', truth: false, why: 'Vzácnost je relativní: statek je vzácný, když je ho méně, než kolik by lidé chtěli při nulové ceně. Obyčejného zboží může být velké množství a přesto je vzácné.' },
  { id: 'own-11', text: 'Hotové peníze firmy jsou výrobním faktorem stejným způsobem jako její stroje.', truth: false, why: 'Peníze (finanční kapitál) sami nic nevyrábějí. Za ně se kupují reálné výrobní faktory.' },
  { id: 'own-12', text: 'Zákon klesajících mezních výnosů říká, že při zvyšování jednoho faktoru a nezměněném množství ostatních faktorů dává každá další jednotka menší přírůstek produkce.', truth: true, why: 'Tak zní zákon, a podmínkou je nezměněnost ostatních faktorů.' },
  { id: 'own-13', text: 'Když všichni zaměstnanci dostanou přidáno, nemusí si nikdo polepšit vůči ostatním.', truth: true, why: 'Relativní postavení se při souběžném růstu nemění. Jde o příklad toho, že celek není jen součtem částí.' },
  { id: 'own-14', text: 'Ve smíšené ekonomice rozhodují o výrobě výhradně firmy a trhy.', truth: false, why: 'Smíšená ekonomika kombinuje trh s rolí státu (daně, regulace, veřejné služby).' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];

function buildAnoNe({ id }) {
  const s = stmtById(id);
  const book = id.startsWith('kn');
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: book ? { chapter: Number(id[2]), number: `C-${id.slice(4)}` } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně. Hledáme pojem, na kterém stojí, a slova jako „vždy“, „pouze“, „každý“, která tvrzení zpřísňují.', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// ---------- typ: definice pojmů (zkouška) ----------
const DEFS = [
  { id: 'ekonomie', q: 'Jak lze definovat ekonomii?', right: 'Věda o tom, jak společnost využívá vzácné zdroje k výrobě užitečných statků a jak je rozděluje.', wrong: ['Věda o penězích a bankovnictví.', 'Nauka o tom, jak se vyhnout nutnosti volby mezi možnostmi.', 'Nauka o tom, jak má stát řídit všechny podniky.'] },
  { id: 'vzacnost', q: 'Co znamená vzácnost v ekonomii?', right: 'Zdroje jsou omezené, zatímco lidské potřeby jsou neomezené, takže se musíme rozhodovat.', wrong: ['Statek je drahý.', 'Statek se vyskytuje jen v jedné zemi.', 'Statek už nikdo nechce kupovat.'] },
  { id: 'ceteris', q: 'Co znamená ceteris paribus?', right: 'Za jinak stejných podmínek: zkoumáme vliv jednoho činitele a ostatní považujeme za neměnné.', wrong: ['Cena je rovna mezním nákladům.', 'Všechny činitele se mění současně.', 'Trh je v rovnováze.'] },
  { id: 'pozitivni', q: 'Co je pozitivní ekonomický výrok?', right: 'Výrok, který popisuje, jaký svět je, a lze ho ověřit fakty (může být i nepravdivý).', wrong: ['Výrok, který je vždy pravdivý.', 'Výrok vyjadřující, jaký by svět měl být.', 'Výrok, s nímž souhlasí většina ekonomů.'] },
  { id: 'normativni', q: 'Co je normativní ekonomický výrok?', right: 'Výrok obsahující hodnotový soud o tom, jaký by svět měl být.', wrong: ['Výrok popisující naměřené hodnoty.', 'Výrok, který je vždy nepravdivý.', 'Výrok o chování firem.'] },
  { id: 'mikro-makro', q: 'Jak se liší mikroekonomie a makroekonomie?', right: 'Mikroekonomie zkoumá chování jednotlivých subjektů a trhů, makroekonomie ekonomiku jako celek.', wrong: ['Mikroekonomie zkoumá menší státy, makroekonomie větší státy.', 'Mikroekonomie zkoumá minulost, makroekonomie budoucnost.', 'Mikroekonomie se zabývá jen penězi.'] },
  { id: 'oportunitni', q: 'Co jsou náklady obětované příležitosti?', right: 'Hodnota nejlepší alternativy, které se rozhodnutím vzdáváme.', wrong: ['Součet hodnot všech možných alternativ.', 'Částka, kterou jsme skutečně zaplatili.', 'Náklady, které vznikly v minulosti a nelze je vrátit.'] },
  { id: 'ppf', q: 'Co zobrazuje hranice produkčních možností?', right: 'Nejvyšší kombinace dvou statků, které lze při daných zdrojích a technologii vyrobit.', wrong: ['Kombinace statků, které si lidé nejvíc přejí.', 'Cenu obou statků při různé výrobě.', 'Maximální zisk firem při různé výrobě.'] },
  { id: 'volny-statek', q: 'Co je volný statek?', right: 'Statek dostupný v libovolném množství za nulovou cenu, který není třeba vyrábět.', wrong: ['Statek, který stát poskytuje bezplatně.', 'Každý statek, jehož cena klesla.', 'Statek, který se prodává bez daně.'] },
  { id: 'ekon-statek', q: 'Co je ekonomický statek?', right: 'Vzácný statek, který se vyrábí a vyžaduje zdroje, a proto má cenu.', wrong: ['Každý statek vyráběný firmou, i kdyby byl dostupný zdarma.', 'Statek, který stát prodává.', 'Statek, který nelze spotřebovat.'] },
  { id: 'faktory', q: 'Které jsou tři základní výrobní faktory a jak se odměňují?', right: 'Půda (renta), práce (mzda) a kapitál (úrok).', wrong: ['Peníze, zboží a služby.', 'Poptávka, nabídka a cena.', 'Cena, zisk a daň.'] },
  { id: 'tri-otazky', q: 'Které tři základní ekonomické otázky musí řešit každá společnost?', right: 'CO vyrábět, JAK vyrábět a PRO KOHO vyrábět.', wrong: ['KDY, KDE a KOLIK vyrábět.', 'KDO vyrábí, KDO platí a KDO kontroluje.', 'Za kolik vyrábět, za kolik prodávat a komu půjčovat.'] },
  { id: 'klesajici-vynosy', q: 'Co říká zákon klesajících mezních výnosů?', right: 'Při zvyšování jednoho faktoru a nezměněných ostatních dává každá další jednotka menší přírůstek produkce.', wrong: ['Při zvyšování všech faktorů současně klesá produkce.', 'S růstem produkce vždy klesá cena.', 'Každá další jednotka produkce stojí méně než předchozí.'] },
  { id: 'smernice', q: 'Co je směrnice přímky?', right: 'Změna veličiny na svislé ose dělená změnou veličiny na vodorovné ose.', wrong: ['Součin obou veličin.', 'Hodnota veličiny na svislé ose při nulové hodnotě na vodorovné.', 'Absolutní hodnota rozdílu obou veličin.'] },
  { id: 'mezni', q: 'Co je mezní veličina (například mezní náklad)?', right: 'Přírůstek celkové veličiny způsobený zvýšením množství o jednu jednotku (nebo derivace celkové funkce).', wrong: ['Celková veličina dělená množstvím.', 'Největší hodnota, které veličina dosáhne.', 'Průměr z první a poslední hodnoty.'] },
  { id: 'prumerna', q: 'Jak vypočítáme průměrnou veličinu?', right: 'Celkovou veličinu vydělíme množstvím.', wrong: ['Vydělíme přírůstek celkové veličiny přírůstkem množství.', 'Celkovou veličinu vynásobíme množstvím.', 'Odečteme od celku mezní veličinu.'] },
  { id: 'vztah', q: 'Jaký je vztah mezi mezní a průměrnou veličinou?', right: 'Leží-li mezní pod průměrnou, průměrná klesá. Leží-li nad ní, průměrná roste. Průsečík je extrém průměrné veličiny.', wrong: ['Mezní veličina je vždy rovna průměrné.', 'Průměrná veličina roste vždy, když roste mezní.', 'Mezní veličina je vždy větší než průměrná.'] },
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
function buildGrafPpf({ B, m }) {
  const e = Math.max(1, Math.floor(m / 2)); const fe = ppfY(B, m, e);
  const xn = Math.max(1, Math.round(m * 0.35)); const yn = Math.max(1, Math.round(ppfY(B, m, xn) * 0.55));
  const xu = Math.min(m - 1, Math.round(m * 0.8)); const yu = Math.ceil(ppfY(B, m, xu) * 1.4) + 1;
  const pts = [{ x: e, y: fe, label: 'E' }, { x: xn, y: yn, label: 'N', color: 'accent' }, { x: xu, y: yu, label: 'U', color: 'warn' }];
  const ref = ppfViz({ B, m, points: pts, alt: 'Hranice produkčních možností s body E, N a U' });
  return mk('graf-ppf', {
    part: 'zkouska',
    data: { B, m },
    task: 'Nakreslete hranici produkčních možností ekonomiky, která vyrábí dva statky X a Y. Vyznačte bod E (efektivní výroba), bod N (neefektivní výroba) a bod U (kombinace, kterou při daných zdrojích nelze vyrobit).',
    answerSpec: { kind: 'whiteboard', reference: ref },
    conclusion: 'Hranice je klesající a konkávní. E leží na ní, N pod ní a U nad ní.',
    source: { chapter: 2, number: 5 },
    solution: [
      { title: 'Osy', text: 'Na vodorovnou osu patří množství statku X, na svislou množství statku Y. Obě začínají v nule.', board: [line('X\\rightarrow,\\quad Y\\uparrow')] },
      { title: 'Křivka hranice', text: 'Hranice produkčních možností klesá od bodu na ose Y (jen Y) k bodu na ose X (jen X). Je konkávní, protože víc jednoho statku znamená obětovat stále víc druhého.', board: [line('PPF:\\ \\text{klesající, konkávní}')], viz: ppfViz({ B, m, alt: 'Konkávní hranice produkčních možností' }) },
      { title: 'Tři body', text: 'Bod E leží na křivce (efektivní). Bod N leží pod křivkou (zdroje nejsou plně využity). Bod U leží nad křivkou (nelze vyrobit).', board: [line('E\\in PPF,\\quad N<PPF,\\quad U>PPF')], viz: ref },
    ],
  });
}

function genGrafPpf(rng) {
  return buildGrafPpf({ B: int(rng, 1, 4), m: int(rng, 6, 12) });
}

function buildGrafPosun({ eventId }) {
  const ev = evById(eventId);
  const graph = eventGraph(ev.ans);
  return mk('graf-posun', {
    part: 'zkouska',
    data: { eventId },
    task: `Nakreslete hranici produkčních možností ekonomiky a zakreslete, jak se projeví: ${ev.text}`,
    answerSpec: { kind: 'whiteboard', reference: graph },
    conclusion: `${EVENT_OPTIONS.find((o) => o.id === ev.ans).text}.`,
    source: { chapter: 2, number: 7 },
    solution: [
      { title: 'Výchozí hranice', text: 'Nakreslíme původní hranici produkčních možností jako klesající konkávní křivku.', board: [line('PPF_0')], viz: { kind: 'econ', data: { ...graph.data, curves: [graph.data.curves[0]], points: [], arrows: [] } } },
      { title: 'Co se změnilo', text: ev.why, board: [line(EVENT_BOARD[ev.ans])] },
      { title: 'Změna v grafu', text: ev.ans === 'ven' || ev.ans === 'dovnitr' ? 'Novou hranici nakreslíme čárkovaně a šipkou naznačíme směr posunu.' : 'Hranice zůstává, mění se poloha ekonomiky vůči ní, což vyznačíme body a šipkou.', viz: graph },
      { title: 'Závěr', text: EVENT_RULE, board: [result(`\\text{${EVENT_SHORT[ev.ans]}}`)] },
    ],
  });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('naklady-prilezitosti', 'Náklady obětované příležitosti', genNaklady, buildNaklady),
  type('volba-dopravy', 'Volba dopravy: čas jako náklad', genDoprava, buildDoprava),
  type('ppf-tabulka', 'Náklad obětované příležitosti z tabulky PPF', genPpfTab, buildPpfTab),
  type('ppf-bod', 'Bod na, pod, nebo nad hranicí produkčních možností', genPpfBod, buildPpfBod),
  type('ppf-udalost', 'Posun po hranici, posun hranice, bod uvnitř', (rng) => buildPpfUdalost({ eventId: pick(rng, ids(PPF_EVENTS)) }), buildPpfUdalost),
  type('mezni-tabulka', 'Mezní a průměrná veličina z tabulky', genMezniTab, buildMezniTab),
  type('mezni-derivace', 'Mezní příjem derivací a maximum', genMezniDeriv, buildMezniDeriv),
  type('smernice', 'Směrnice a sklon přímky a křivky', genSmernice, buildSmernice),
  type('prumer-mezni', 'Vztah mezní a průměrné veličiny', genPrumer, buildPrumer),
  type('klasifikace', 'Klasifikace pojmů a výroků', (rng) => buildKlasifikace({ id: pick(rng, ids(ITEMS)) }), buildKlasifikace),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-ppf', 'Nakresli hranici produkčních možností (zkouška)', genGrafPpf, buildGrafPpf),
  type('graf-posun', 'Nakresli změnu hranice produkčních možností (zkouška)', (rng) => buildGrafPosun({ eventId: pick(rng, ids(PPF_EVENTS)) }), buildGrafPosun),
];

// ---------- výklad ----------
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'X', y: 'Y' }, domain: [0, 12], range: [0, 110], curves, ...extra } });
const PPF0 = { expr: '100 - x^2', label: 'PPF', color: 'blue', domain: [0, 10] };

const theory = [
  { heading: 'Ekonomie a vzácnost', term: 'Ekonomie',
    text: 'Ekonomie je věda o tom, jak se společnost a její členové rozhodují při využívání vzácných zdrojů a jak vyrobené statky rozdělují. Slovo samo pochází z řeckého „správa domácnosti“. Domácnost i celá společnost mají stejný problém: chtějí víc, než mohou mít.\n\nVzácnost znamená, že zdroje (půda, práce, kapitál, čas) jsou omezené vzhledem k lidským potřebám, které jsou prakticky neomezené. Statek je tedy vzácný, když ho je méně, než kolik by lidé chtěli při nulové ceně. Nezáleží na tom, zda je ho na světě „málo“: chleba je vzácný, i když ho je mnoho.\n\nDůsledkem vzácnosti je nutnost volby: když jedné věci dáme přednost, vzdáváme se jiné. Celá ekonomie vlastně zkoumá, jak se v takové situaci lidé, firmy i vlády rozhodují.',
    mistakes: ['Vzácnost neznamená „drahý“ ani „málo na světě“. Znamená omezené množství vzhledem k potřebám.', 'Vzácnost se týká i bohatých zemí. Žádná společnost nemá zdroje na splnění všech přání.'] },
  { heading: 'Pozitivní a normativní ekonomie', term: 'Pozitivní a normativní výrok',
    text: 'Pozitivní výrok popisuje, jaký svět je, nebo předpovídá, co se stane. Dá se ověřit fakty a může být pravdivý, nebo nepravdivý. Příklad: „Zvýšení spotřební daně z alkoholu sníží jeho spotřebu.“\n\nNormativní výrok vyjadřuje hodnotový soud, tedy to, jaký by svět měl být. Fakty ho samotné vyvrátit ani potvrdit nelze, protože záleží na hodnotách. Příklad: „Stát by měl zvýšit spotřební daň z alkoholu.“\n\nPoznáte je podle slov jako „měl by“, „nesmí“, „spravedlivé“, „lepší“, „horší“. Některé věty spojují obojí: například „Nerovnost je nespravedlivá, protože nejbohatší desetina má polovinu bohatství.“ První část je normativní, druhá pozitivní. Pozitivní analýza je podkladem pro normativní závěry, ale žádný normativní závěr z ní nevyplyne sám bez hodnotového úsudku.',
    mistakes: ['Pozitivní neznamená pravdivý. Pozitivní výrok může být i chybný, jen musí být ověřitelný.', 'O tom, zda je výrok pozitivní, nerozhoduje, kolik ekonomů s ním souhlasí. Rozhoduje, zda popisuje ověřitelný fakt, nebo vyjadřuje hodnocení.'] },
  { heading: 'Mikroekonomie a makroekonomie', term: 'Mikroekonomie a makroekonomie',
    text: 'Mikroekonomie zkoumá chování a rozhodování jednotlivých subjektů (domácnosti, firmy, jednotlivého trhu) a jejich vzájemné působení na konkrétních trzích. Typické otázky: kolik kusů má firma vyrobit, kolik zboží si spotřebitel koupí při dané ceně a jak se utvoří cena jablek.\n\nMakroekonomie zkoumá ekonomiku jako celek: hrubý domácí produkt (HDP), inflaci, celkovou nezaměstnanost, celkovou spotřebu a investice, rozpočet státu, směnné kurzy.\n\nHranice mezi nimi není ostrá a obě části jsou provázané. Změny v celé ekonomice jsou ve skutečnosti výsledkem rozhodnutí milionů jednotlivců a firem. Vodítkem při zařazování je slovo „agregátní“ a otázka, jestli se zkoumá jeden subjekt (nebo trh), nebo celek.',
    mistakes: ['Nezaměstnanost jednoho povolání (například stavebních dělníků) je otázka dílčího trhu, tedy mikroekonomie. Celková nezaměstnanost je makroekonomická.'] },
  { heading: 'Metoda ekonomie a chyby v uvažování', term: 'Ceteris paribus',
    text: 'Ekonomie pracuje jako ostatní vědy: pozorováním, analýzou, syntézou, statistikou a (omezeně) experimenty. Protože skutečnost je složitá, tvoří zjednodušené modely.\n\nZákladním nástrojem je ceteris paribus („za jinak stejných podmínek“): zkoumáme vliv jediného činitele a ostatní si myšlenkově zafixujeme. Je to prostředek abstrakce, ne tvrzení, že se ostatní činitele ve skutečnosti nemění.\n\nTři časté chyby v uvažování:\n\n• Porušení ceteris paribus: připisujeme změnu jednomu činiteli, ačkoli se změnilo víc věcí najednou.\n• Omyl „poté, tedy proto“ (post hoc): protože jedna událost přišla po druhé, považujeme ji za příčinu. Časová posloupnost ještě není příčinnost.\n• Uvažování z části na celek (chyba skladby): co platí pro jednoho, nemusí platit pro všechny. Když si jeden zaměstnanec vymůže vyšší mzdu, polepší si. Když ji dostanou všichni, nikdo si vůči ostatním nepolepší.\n\nPřidává se i subjektivita: ekonomové vnášejí do analýz své hodnoty, a proto mohou dospět k různým závěrům.',
    mistakes: ['Ceteris paribus neznamená, že se nic jiného nemění. Znamená, že to pro daný rozbor považujeme za neměnné.', 'Opak chyby skladby je také chybou: co platí pro celek, nemusí platit pro jednotlivce.'] },
  { heading: 'Potřeby, statky a služby', term: 'Ekonomický statek',
    text: 'Potřeba je pocit nedostatku, který si uvědomujeme a snažíme se odstranit. Potřeb je mnoho a jsou prakticky neomezené, ale zdroje na jejich uspokojení omezené.\n\nPotřeby uspokojujeme statky a službami. Služba je účelná lidská činnost uspokojující potřebu v průběhu své vlastní spotřeby (nehmotná, nelze ji skladovat).\n\nVolný statek je dostupný v dané době a místě v libovolném množství za nulovou cenu, a proto ho není třeba vyrábět. Ekonomický statek je vzácný: vyžaduje zdroje a má cenu. Rozdíl je relativní. Pitná voda ve městě je dnes ekonomický statek, ačkoli dříve se čerpala bez nákladů. Podle užití dělíme statky na spotřební a kapitálové (výrobní), které slouží k další výrobě.',
    mistakes: ['Zdarma neznamená volný statek. Statek, který nám dá někdo zdarma (reklamní vzorek), je pořád ekonomický, jen jeho výrobu zaplatil někdo jiný.'] },
  { heading: 'Výrobní faktory', term: 'Výrobní faktory',
    text: 'Výroba je přeměna vstupů na užitečné statky a služby. Vstupům se říká výrobní faktory a základní jsou tři:\n\n• Půda: přírodní zdroje (pozemky, nerosty, energie). Odměnou je renta.\n• Práce: cílevědomá lidská činnost. Odměnou je mzda.\n• Kapitál: vyrobené prostředky pro další výrobu. Odměnou je úrok. Reálný kapitál tvoří stroje, budovy, zásoby a know-how. Finanční kapitál jsou peníze a cenné papíry, které sám nic nevyrábějí, ale umožňují reálné faktory koupit.\n\nPůda a práce jsou primární faktory (nevznikly výrobou), kapitál je sekundární (vznikl působením práce a půdy). Někdy se jako čtvrtý faktor uvádějí podnikatelské schopnosti, jejichž odměnou je zisk.\n\nZákon klesajících mezních výnosů: zvyšujeme-li jeden faktor a ostatní zůstávají neměnné, každá další jednotka přidá k produkci méně než předchozí.',
    mistakes: ['Peníze nejsou výrobním faktorem samy o sobě. Faktorem je to, co se za ně koupí.', 'Zákon klesajících výnosů platí jen při neměnnosti ostatních faktorů. Zvyšují-li se všechny faktory, jde o jinou otázku (výnosy z rozsahu).'] },
  { heading: 'Náklady obětované příležitosti', term: 'Náklady obětované příležitosti',
    text: 'Každá volba má cenu v tom, čeho se vzdáváme. Náklady obětované příležitosti (alternativní, oportunitní náklady) jsou hodnotou nejlepší alternativy, které se rozhodnutím vzdáváme. Počítá se jen jedna nejlepší alternativa, ne součet všech.\n\nZahrnují explicitní náklady (platíme je) i implicitní (platit nemusíme, ale o příjem přicházíme). Příklad: rok studia stojí 150 000 Kč na poplatcích a ušlý výdělek 500 000 Kč. Implicitním nákladem je ušlý výdělek, celkově se studiem vzdáváme 650 000 Kč, počítáme-li i poplatky, které bychom při práci neplatili.\n\nStejně se hodnotí čas. Jestliže vám hodina práce vynese 500 Kč, stojí osmihodinová cesta vlakem 4 000 Kč ušlého výdělku navíc k jízdence, zatímco hodinová cesta letadlem jen 500 Kč.\n\nDo nákladů obětované příležitosti nepatří výdaje, které stejně vznikly při každé z variant, ani minulé nevratné výdaje.',
    mistakes: ['Neslučujte všechny alternativy dohromady: počítá se jen hodnota té nejlepší.', 'Náklady, které vzniknou při každé variantě (například nájem bytu při studiu i při práci), se do nákladů obětované příležitosti nepočítají.'] },
  { heading: 'Hranice produkčních možností', term: 'Hranice produkčních možností',
    text: 'Hranice produkčních možností (PPF) ukazuje největší kombinace dvou statků, které ekonomika vyrobí při daných zdrojích a technologii. Předpokládáme dva statky, daný čas, plné využití zdrojů a neměnnou technologii.\n\n• Bod na hranici: efektivní výroba, zdroje jsou plně využity. Víc jednoho statku lze získat jen za cenu menšího množství druhého.\n• Bod uvnitř: neefektivní výroba (například při nezaměstnanosti), zdroje zůstávají nevyužity. Lze vyrobit víc obou statků.\n• Bod vně: při daných zdrojích a technologii nedosažitelný.\n\nSklon hranice v bodě je náklad obětované příležitosti jednoho statku vyjádřený množstvím druhého. Hranice bývá konkávní (vyklenutá od počátku), protože zdroje nejsou stejně vhodné pro oba statky. Když přesouváme zdroje, začínáme těmi nejvhodnějšími, a proto obětujeme stále víc za každou další jednotku. Kdyby byly zdroje v obou výrobách stejně produktivní, byla by hranice přímka s konstantním nákladem příležitosti. Cvičebnice konkávnost vysvětluje zákonem klesajících výnosů; přesnější je vysvětlení proměnlivou vhodností zdrojů.\n\nEfektivní bod ještě neříká, která kombinace je nejlepší. Ta závisí na preferencích společnosti (otázka CO vyrábět).',
    viz: view([PPF0], { points: [{ x: 6, y: 64, label: 'A' }, { x: 4, y: 50, label: 'B' }, { x: 8, y: 70, label: 'C' }], alt: 'Hranice produkčních možností s body A (na hranici), B (uvnitř) a C (vně)' }),
    mistakes: ['Bod na hranici je jen produkčně efektivní, nemusí být nejlepší pro společnost.', 'Pohyb po hranici a posun hranice jsou dvě různé věci. Změna skladby výroby je pohyb po hranici. Posun vyžaduje změnu zdrojů nebo technologie.', 'Recese není posun hranice dovnitř. Zdroje jsou nevyužité, hranice zůstává a ekonomika je pod ní.'] },
  { heading: 'Růst a posun hranice produkčních možností', term: 'Ekonomický růst',
    text: 'Hranice se posune ven, když se zvětší množství zdrojů nebo zlepší technologie: objev nalezišť, přírůstek pracovní síly, investice do kapitálu, vzdělání, technický pokrok. To je ekonomický růst. Posune se dovnitř, když se zdroje zničí (válka, přírodní pohroma).\n\nNový výrobní postup může zvýšit možnosti jen u jednoho statku. Pak se hranice rozšíří na jedné ose, na druhé zůstane.\n\nVolba mezi spotřebou dnes a investicemi je dilema: kdo dnes spotřebuje méně a investuje do kapitálových statků, bude mít v budoucnu hranici dál od počátku. Země, které hodně investují, rostou rychleji. Za budoucí růst se platí menší spotřebou dnes, pokud jsou zdroje využity plně.',
    viz: view([{ ...PPF0, label: 'PPF1', color: 'accent', dashed: true }, { expr: '64 - x^2', label: 'PPF0', color: 'blue', domain: [0, 8] }], { arrows: [{ from: [6, 28], to: [7.3, 40], label: '' }] }),
    mistakes: ['Změna spotřebitelských preferencí hranici neposune, protože hranice vyjadřuje možnosti, ne přání.'] },
  { heading: 'Tři základní otázky a typy ekonomik', term: 'Tři základní ekonomické otázky',
    text: 'Každá společnost musí řešit tři základní otázky:\n\n• CO vyrábět: jaké statky a v jakém množství (která kombinace na hranici produkčních možností).\n• JAK vyrábět: jakou technologií a s jakou kombinací výrobních faktorů. Řeší se efektivnost (nejnižší náklady) i další hlediska, třeba ochrana životního prostředí.\n• PRO KOHO vyrábět: kdo vyrobené statky dostane a v jakém množství, tedy rozdělení.\n\nPodle toho, kdo je řeší, rozlišujeme typy ekonomik:\n\n• zvyková (tradiční): rozhoduje tradice,\n• příkazová (plánovaná): rozhoduje centrální plán,\n• tržní: rozhodují ceny na trzích a soukromé subjekty,\n• smíšená: kombinace trhu a hospodářské role státu.\n\nČistě tržní a čistě příkazové ekonomiky jsou modely. Skutečné ekonomiky, včetně české, jsou smíšené. Metaforou „neviditelné ruky“ vyjádřil Adam Smith myšlenku, že na konkurenčním trhu vedou ceny sledování vlastního zájmu ke koordinaci činností. Platí to za určitých podmínek (konkurence, jasná vlastnická práva, žádné externí efekty).',
    mistakes: ['Neviditelná ruka nemá nic společného s lobby ani skrytými skupinami. Je to koordinace činností cenami na trhu.'] },
  { heading: 'Funkce, směrnice a sklon', term: 'Směrnice',
    text: 'Funkce $y=f(x)$ přiřazuje každé hodnotě nezávisle proměnné $x$ jedinou hodnotu závisle proměnné $y$. Lineární funkce $y=a+bx$ má za graf přímku, nelineární (například $y=a+bx^2$) křivku.\n\nSměrnice přímky je změna veličiny na svislé ose dělená změnou na vodorovné ose. Je-li směrnice kladná, veličiny se mění stejným směrem (nabídka), je-li záporná, opačným (poptávka). Sklon je absolutní hodnota směrnice. U přímky je směrnice všude stejná.\n\nU křivky se směrnice mění. Směrnice v bodě je směrnice tečny, tedy hodnota derivace. Směrnice mezi dvěma body je směrnice spojnice (tětivy), tedy průměrná směrnice na tomto úseku.',
    tex: 'k=\\frac{\\Delta y}{\\Delta x},\\qquad k_{bod}=\\frac{dy}{dx}',
    viz: { kind: 'econ', data: { axes: { x: 'x', y: 'y' }, domain: [0, 8], range: [0, 40],
      curves: [{ expr: 'x^2/2', label: 'f', color: 'blue' }, { expr: '4*x - 8', label: 'tečna', color: 'accent', dashed: true, domain: [2, 6] }], points: [{ x: 4, y: 8, label: 'T' }], arrows: [], areas: [], alt: 'Křivka a její tečna v bodě T' } },
    mistakes: ['Směrnice klesající přímky je záporná, sklon je kladný. Nezaměňujte znaménko.', 'Svislá přímka nemá směrnici (dělení nulou), vodorovná má směrnici nulovou.'] },
  { heading: 'Mezní a průměrné veličiny', term: 'Mezní veličina',
    text: 'Mezní veličina vyjadřuje, o kolik se změní celková veličina, když se množství změní o malou jednotku. Dvě metody výpočtu:\n\n• Rozdíl: $MR_Q=TR_Q-TR_{Q-1}$, přírůstek při zvýšení o jednu jednotku (z tabulky).\n• Derivace: $MR=\\frac{dTR}{dQ}$, přesná hodnota v bodě, tedy sklon tečny celkové funkce.\n\nOba výsledky se liší, protože se mezní veličina na intervalu mění. Rozdíl odpovídá přibližně derivaci uprostřed intervalu. U $TR=12Q-2Q^2$ je přírůstek při zvýšení Q z 1 na 2 roven 6, derivace v bodě $Q=2$ je 4 (a derivace v bodě $Q=1{,}5$ je 6).\n\nPrůměrná veličina je celková veličina na jednu jednotku: $AR=TR/Q$. Graficky je to sklon přímky vedené z počátku do bodu na křivce celkové veličiny.\n\nMaximum funkce je tam, kde je první derivace nulová a druhá záporná. Celkový příjem je největší při $MR=0$.',
    tex: 'MR=\\frac{\\Delta TR}{\\Delta Q}\\ \\text{nebo}\\ \\frac{dTR}{dQ},\\qquad AR=\\frac{TR}{Q}',
    viz: view([{ expr: '12*x - 2*x^2', label: 'TR', color: 'blue' }, { expr: '12 - 4*x', label: 'MR', color: 'accent' }, { expr: '12 - 2*x', label: 'AR', color: 'green' }], { axes: { x: 'Q', y: 'Kč' }, domain: [0, 6], range: [0, 20], points: [{ x: 3, y: 18, label: 'max TR', guides: true }] }),
    mistakes: ['Mezní veličina není to samé co přírůstek celkové veličiny za jednu jednotku, jen se jí blíží. Derivace je přesná hodnota v bodě.', 'Mezní příjem celkový příjem zvyšuje jen tehdy, když je kladný. Celkový příjem je největší při $MR=0$.'] },
  { heading: 'Vztah mezní a průměrné veličiny', term: 'Vztah mezní a průměrné veličiny',
    text: 'Mezi mezní a průměrnou veličinou platí tři pravidla (jako u průměrné známky: nová známka pod průměrem průměr sníží, nad ním zvýší):\n\n• leží-li mezní veličina pod průměrnou, průměrná klesá,\n• leží-li mezní nad průměrnou, průměrná roste,\n• mezní protíná průměrnou v jejím extrému (minimu nebo maximu), kde průměrná neroste ani neklesá.\n\nPravidlo se týká srovnání mezní a průměrné hodnoty, ne toho, zda sama mezní veličina roste, nebo klesá. Průměrné náklady mohou klesat i tehdy, když mezní náklady rostou, pokud zůstanou pod průměrem. Křivka mezních nákladů protíná křivku průměrných nákladů v jejím minimu, ale minimum mezních nákladů je dřív.',
    viz: view([{ expr: '60/x + 8 + x', label: 'AC', color: 'chalk', domain: [1, 14] }, { expr: '8 + 2*x', label: 'MC', color: 'blue' }], { axes: { x: 'Q', y: 'Kč' }, domain: [0, 14], range: [0, 60], points: [{ x: 7.746, y: 23.49, label: 'min AC', guides: true }] }),
    mistakes: ['Mezní veličina neprotíná průměrnou kdekoli, ale v jejím minimu (nebo maximu).', 'Rostoucí mezní náklady neznamenají rostoucí průměrné náklady. Rozhoduje, jestli leží nad průměrem.'] },
];

export default {
  id: 'uvod', title: 'Úvod do ekonomického studia', order: 1, theory, types,
};
