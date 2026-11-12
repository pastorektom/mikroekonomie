// Téma 9: Trh kapitálu a přerozdělování důchodů (podle skript kap. 10, prezentace 9 a cvičebnice kap. 10).
// Stejná struktura jako tema02.js: theory (výklad), types (generate + solve), každý příklad má kroky s tabulí nebo grafem.
//
// Poznámky ke zdrojům:
//  - Cvičebnice kap. 10 obsahuje jen úlohy o trhu kapitálu a investicích. Lorenzova křivka a Giniho koeficient jsou v prezentaci 9
//    (G = (A − B)/A, kde A je plocha pod přímkou rovnosti a B plocha pod skutečnou Lorenzovou křivkou), úlohy na ně jsou vlastní.
//  - Chyby v řešeních cvičebnice, které se NEPŘEBÍRAJÍ: úloha 1 (PV = 109 090,91, nikoli 109 000; NPV = 29 090,91),
//    úloha 5 (výsledek 1 240 000 Kč neodpovídá zadání), úloha 6 (50 % je jednoduchá míra výnosu, nikoli vnitřní výnosové procento
//    za 10 let; to je přibližně 49,5 %). Úlohy 8 a 9 (srovnání vkladů podle zdanění) se nepřebírají.
import {
  int, pick, shuffle, cz, czText, line, result,
} from './lib.js';

const TOPIC = 'kapital';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- pomůcky ----------
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const rd = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const lit = (x) => String(r6(x)); // číslo do výrazu pro graf
const sum = (a) => a.reduce((s, v) => s + v, 0);
const cumul = (a) => a.reduce((acc, v) => { acc.push((acc.length ? acc[acc.length - 1] : 0) + v); return acc; }, []);

// Číslo do textu s nezlomitelnou mezerou po tisících a desetinnou čárkou.
function grp(x) {
  const r = Math.round(x * 1e6) / 1e6;
  const [w, f] = String(Math.abs(r)).split('.');
  return `${r < 0 ? '−' : ''}${w.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${f ? `,${f}` : ''}`;
}
const roku = (n) => (n === 1 ? 'rok' : n < 5 ? 'roky' : 'let');
const c2 = (x) => {
  const r = Math.round(x * 100) / 100;
  const [w, f] = Math.abs(r).toFixed(2).split('.');
  return `${r < 0 ? '-' : ''}${w.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,')}{,}${f}`;
};
const money = (x) => `${Number.isInteger(x) ? cz(x) : c2(x)}\\ \\text{Kč}`;
const NUM_NOM = { 3: 'tři', 4: 'čtyři', 5: 'pět' };
const NUM_GEN = { 3: 'tří', 4: 'čtyř', 5: 'pěti' };
const cap1 = (t) => t[0].toUpperCase() + t.slice(1);
const mes = (m) => (m < 5 ? 'měsíce' : 'měsíců');
const pctTex = (x) => `${cz(x)}\\,\\%`;
const tabTex = (rows) => `\\begin{array}{c|${'c'.repeat(rows[0].length - 1)}}${rows[0].join('&')}\\\\\\hline ${rows.slice(1).map((r) => r.join('&')).join('\\\\')}\\end{array}`;
const cells = (arr) => [arr.map((x) => String(r6(x)))];
const sourceOf = (number) => ({ chapter: 10, number });
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Současná hodnota toku plateb c[0], c[1], … splatných na konci 1., 2., … roku při úrokové míře r (v %).
const pvOf = (flows, r) => flows.reduce((s, c, k) => s + c / (1 + r / 100) ** (k + 1), 0);
const npvOf = (I0, flows, r) => pvOf(flows, r) - I0;

// ---------- Lorenzova křivka a Giniho koeficient (skupiny o stejné velikosti) ----------
const sortAsc = (a) => [...a].sort((x, y) => x - y);
// body Lorenzovy křivky [[podíl domácností %, podíl důchodů %], …] ze seřazených podílů (v %)
function lorenzPts(sorted) {
  const n = sorted.length; const c = cumul(sorted);
  return [[0, 0], ...c.map((v, k) => [(100 * (k + 1)) / n, v])];
}
// Giniho koeficient z podílů skupin o stejné velikosti: G = 1 − 2B, B = plocha pod lomenou čarou (lichoběžníky).
function giniGroups(shares) {
  const s = sortAsc(shares); const tot = sum(s); const n = s.length;
  const L = [0, ...cumul(s).map((v) => v / tot)];
  let B = 0;
  for (let k = 1; k <= n; k++) B += ((L[k - 1] + L[k]) / 2) / n;
  return { L, B, G: 1 - 2 * B };
}

// Přímka lomená po úsecích: každý úsek je samostatná křivka s vlastním oborem.
function polyline(pts, { color = 'blue', label, dashed = false } = {}) {
  return pts.slice(1).map(([x1, y1], k) => {
    const [x0, y0] = pts[k];
    const slope = (y1 - y0) / (x1 - x0);
    return {
      expr: `${lit(y0)} + ${lit(slope)}*(x - ${lit(x0)})`, domain: [x0, x1], color, dashed, ...(k === pts.length - 2 && label ? { label } : {}),
    };
  });
}
const LORENZ_AXES = { x: 'domácnosti (%)', y: 'důchody (%)' };
// series: [{ shares, color, label }]; areas: vystínovat plochu mezi přímkou rovnosti a první křivkou (A − B)
function lorenzViz(series, { areas = false, alt = 'Lorenzova křivka a přímka rovnosti' } = {}) {
  const curves = [{ expr: 'x', label: 'rovnost', color: 'chalk', dashed: true }];
  const areaList = []; const points = [];
  series.forEach((s, idx) => {
    const pts = lorenzPts(sortAsc(s.shares));
    const segs = polyline(pts, { color: s.color || 'blue', label: s.label, dashed: false });
    curves.push(...segs);
    if (idx === 0) {
      pts.slice(1, -1).forEach(([x, y]) => points.push({ x, y, color: 'accent' }));
      if (areas) {
        segs.forEach((c, k) => areaList.push({ between: ['x', c.expr], from: pts[k][0], to: pts[k + 1][0], color: 'accent', ...(k === Math.floor(segs.length / 2) ? { label: 'A − B' } : {}) }));
      }
    }
  });
  return { kind: 'econ', data: { axes: LORENZ_AXES, domain: [0, 100], range: [0, 100], curves, points, arrows: [], areas: areaList, alt } };
}

// Výklad: hladká Lorenzova křivka y = x²/100.
const lorenzTheoryViz = () => ({
  kind: 'econ',
  data: {
    axes: LORENZ_AXES, domain: [0, 100], range: [0, 100],
    curves: [{ expr: 'x', label: 'rovnost', color: 'chalk', dashed: true }, { expr: 'x^2/100', label: 'L', color: 'blue' }],
    areas: [{ between: ['x', 'x^2/100'], from: 0, to: 100, label: 'A − B', color: 'accent' }, { between: ['x^2/100', '0'], from: 0, to: 100, label: 'B', color: 'green' }],
    points: [], arrows: [], alt: 'Lorenzova křivka, přímka rovnosti a plochy A − B a B',
  },
});

// ---------- graf trhu kapitálu (osa x = zásoba kapitálu K, osa y = reálná úroková míra i) ----------
// D: i = 10 − 0,1K; S (dlouhé období): i = 2 + 0,1K; rovnováha K = 40, i = 6.
const D0 = '10 - 0.1*x'; const S0 = '2 + 0.1*x';
const SHORT_S = { expr: '6 + 1000*(x - 40)', domain: [39.95, 40.05], label: 'S', color: 'chalk' };
function capViz({ curves, points = [], arrows = [], alt }) {
  return {
    kind: 'econ',
    data: {
      axes: { x: 'K', y: 'i (%)' }, domain: [0, 100], range: [0, 12], curves, points, arrows, areas: [], alt,
    },
  };
}
const capLong = (extra = {}) => capViz({
  curves: [{ expr: D0, label: 'D', color: 'blue' }, { expr: S0, label: 'S', color: 'chalk' }, ...(extra.curves || [])],
  points: extra.points || [{ x: 40, y: 6, label: 'E', guides: true }], arrows: extra.arrows || [], alt: extra.alt || 'Trh kapitálu: poptávka, nabídka a rovnováha',
});
const capShort = (extra = {}) => capViz({
  curves: [{ expr: D0, label: 'D', color: 'blue' }, SHORT_S, ...(extra.curves || [])],
  points: extra.points || [{ x: 40, y: 6, label: 'E', guides: true }], arrows: extra.arrows || [], alt: extra.alt || 'Krátkodobá rovnováha na trhu kapitálu se svislou nabídkou',
});

// =====================================================================================
// typ 1: současná hodnota (diskontování)
// =====================================================================================
function buildSoucasna({
  kind, fv, flows, r, n,
}) {
  const q = 1 + r / 100;
  const single = kind === 'jedna';
  const pv = single ? fv / q ** n : pvOf(flows, r);
  const d = single && fv < 10 ? 6 : 2;
  const value = rd(pv, d);
  const prec = d === 6 ? 'šest' : 'dvě';
  const k = single ? 1 : flows.length;
  const head = single
    ? `Platba ${grp(fv)} Kč bude splatná za ${n} ${roku(n)} (na konci ${n}. roku). Tržní úroková míra je ${czText(r)} % ročně. Jaká je současná hodnota této platby?`
    : `Projekt přinese na konci každého z následujících ${k} let tyto platby (v Kč): ${flows.map(grp).join('; ')}. Tržní úroková míra je ${czText(r)} % ročně. Určete současnou hodnotu všech plateb dohromady.`;
  const steps = single ? [
    { title: 'Proč se budoucí peníze diskontují', text: 'Koruna dnes má větší hodnotu než koruna za několik let, protože dnešní peníze můžeme uložit a vydělat na nich úrok. Úroková míra $r$ je tedy výnos nejlepší alternativy. Budoucí částku přepočítáme na dnešek (diskontujeme): hledáme částku, která by uložená dnes při úrokové míře $r$ za $n$ let narostla právě na $FV$.',
      board: [line('FV=PV\\cdot(1+r)^n'), line('PV=\\frac{FV}{(1+r)^n}')] },
    { title: 'Diskontní faktor', text: `Úrokovou míru převedeme z procent na desetinné číslo ($${cz(r)}\\,\\%=${cz(r / 100)}$) a umocníme na počet let.`,
      board: [line(`(1+r)^{${n}}=(1+${cz(r / 100)})^{${n}}=${cz(r6(q ** n))}`)] },
    { title: 'Současná hodnota', text: `Budoucí platbu dělíme faktorem, a dostaneme její hodnotu dnes: ${czText(value)} Kč.`,
      board: [line(`PV=\\frac{${cz(fv)}}{${cz(r6(q ** n))}}`), result(`PV=${d === 6 ? cz(value) : money(value)}`)] },
    { title: 'Zkouška', text: 'Kdybychom dnes uložili vypočtenou částku při stejné úrokové míře, za stejnou dobu by narostla zpět na původní platbu (až na zaokrouhlení).',
      board: [line(`${cz(value)}\\cdot ${cz(r6(q ** n))}\\approx ${cz(fv)}`)] },
  ] : [
    { title: 'Každou platbu diskontujeme zvlášť', text: 'Platby přicházejí v různých letech, a každá má proto dnes jinou hodnotu. Platbu z $t$-tého roku dělíme faktorem $(1+r)^t$. Současná hodnota celého toku je součet současných hodnot jednotlivých plateb.',
      board: [line('PV=\\sum_{t=1}^{n}\\frac{c_t}{(1+r)^t}')] },
    { title: 'Současné hodnoty plateb', text: `Každou platbu vydělíme příslušnou mocninou čísla ${czText(q)}.`,
      board: flows.map((c, t) => line(`PV_{${t + 1}}=\\frac{${cz(c)}}{${cz(q)}^{${t + 1}}}=${c2(c / q ** (t + 1))}`)) },
    { title: 'Součet', text: `Sečteme současné hodnoty všech plateb (počítáme z nezaokrouhlených hodnot a výsledek zaokrouhlíme na dvě desetinná místa): ${czText(value)} Kč.`,
      board: [result(`PV=${money(value)}`)] },
  ];
  return mk('soucasna-hodnota', {
    data: single ? { kind, fv, r, n } : { kind, flows, r },
    task: `${head} Zaokrouhlete na ${prec} desetinná místa.`,
    promptTex: single ? undefined : tabTex([['t', ...flows.map((_, t) => String(t + 1))], ['c_t', ...flows.map(cz)]]),
    answerSpec: { kind: 'number', value, tol: 10 ** -d },
    conclusion: `Současná hodnota je ${czText(value)} Kč.`,
    source: single && fv === 1 ? sourceOf(2) : undefined,
    solution: steps,
  });
}
function genSoucasna(rng) {
  const r = pick(rng, [4, 5, 6, 8, 10, 12, 15]);
  if (rng() < 0.55) return buildSoucasna({ kind: 'jedna', fv: pick(rng, [5000, 10000, 20000, 50000, 100000, 250000, 500000]), r, n: int(rng, 2, 10) });
  return buildSoucasna({ kind: 'tok', flows: Array.from({ length: int(rng, 2, 4) }, () => int(rng, 5, 40) * 1000), r });
}

// =====================================================================================
// typ 2: složené úročení vkladu
// =====================================================================================
function buildUrok({
  s0, i, n, m, ask,
}) {
  const q = 1 + i / 100;
  const full = s0 * q ** n;
  const end = full * (1 + ((i / 100) * m) / 12);
  const value = ask === 'urok' ? Math.round(rd(end - s0, 6)) : Math.round(rd(end, 6));
  const period = `${n} ${roku(n)}${m ? ` a ${m} ${mes(m)}` : ''}`;
  const periodGen = `${n} ${n === 1 ? 'roku' : 'let'}${m ? ` a ${m} měsíců` : ''}`;
  const steps = [
    { title: 'Složené úročení', text: 'Úrok se připisuje jednou ročně a v dalším roce se úročí spolu s původním vkladem (úrok z úroku). Po $n$ letech proto vklad $S_0$ naroste na hodnotu, kterou dostaneme opakovaným násobením číslem $1+i$.',
      board: [line('S_n=S_0\\cdot(1+i)^n')] },
    { title: 'Zůstatek po celých letech', text: `Úrokovou míru píšeme jako desetinné číslo ($${cz(i)}\\,\\%=${cz(i / 100)}$).`,
      board: [line(`S_{${n}}=${cz(s0)}\\cdot ${cz(q)}^{${n}}=${cz(s0)}\\cdot ${cz(r6(q ** n))}=${c2(full)}`)] },
    ...(m ? [{ title: 'Neúplný rok', text: `Za ${m} ${mes(m)} se připíše úrok poměrně, tedy ${m}/12 ročního úroku ze zůstatku (jednoduché úročení za část roku).`,
      board: [line(`S=${c2(full)}\\cdot\\left(1+${cz(i / 100)}\\cdot\\frac{${m}}{12}\\right)=${c2(end)}`)] }] : []),
    { title: ask === 'urok' ? 'Úrok je rozdíl' : 'Výsledek', text: ask === 'urok' ? `Úrok je přírůstek proti původnímu vkladu: ${czText(value)} Kč (zaokrouhleno na celé koruny).` : `Na účtu bude za ${period} ${czText(value)} Kč (zaokrouhleno na celé koruny). Daň z úroku nezohledňujeme.`,
      board: ask === 'urok' ? [result(`${c2(end)}-${cz(s0)}\\approx ${money(value)}`)] : [result(`S\\approx ${money(value)}`)] },
  ];
  return mk('urok-slozeny', {
    data: {
      s0, i, n, m, ask,
    },
    task: `Na účet s úrokovou sazbou ${czText(i)} % ročně jste uložili ${grp(s0)} Kč a vklad nebudete po dobu ${periodGen} měnit. Úrok se připisuje jednou ročně na konci roku a dále se úročí (složené úročení); za neúplný rok se připíše úrok poměrně podle počtu měsíců. Daň z úroku nezohledňujte. ${ask === 'urok' ? 'Jaký úrok (v Kč) za celou dobu vklad vydělá?' : 'Kolik korun budete mít na účtu?'} Zaokrouhlete na celé koruny.`,
    answerSpec: { kind: 'number', value, tol: 1 },
    conclusion: ask === 'urok' ? `Úrok za celou dobu je ${czText(value)} Kč.` : `Na účtu bude ${czText(value)} Kč.`,
    source: sourceOf(7),
    solution: steps,
  });
}
function genUrok(rng) {
  return buildUrok({
    s0: pick(rng, [10000, 20000, 30000, 50000, 60000, 100000, 200000]), i: pick(rng, [1, 1.5, 2, 2.5, 3, 4, 5]), n: int(rng, 1, 8), m: pick(rng, [0, 0, 0, 3, 6, 9]), ask: pick(rng, ['zustatek', 'urok']),
  });
}

// =====================================================================================
// typ 3: nominální a reálná úroková míra
// =====================================================================================
const REAL_TEXT = {
  priblizne: 'Podle jednoduchého vztahu ze skript (reálná = nominální − inflace) určete reálnou úrokovou míru v procentech.',
  presne: 'Určete reálnou úrokovou míru přesným vzorcem (1 + nominální) / (1 + inflace) − 1 v procentech, zaokrouhleno na dvě desetinná místa.',
  nominalni: 'Podle jednoduchého vztahu ze skript (nominální = reálná + inflace) určete přibližnou nominální úrokovou míru v procentech.',
  'po-dani': 'Spočtěte reálnou čistou úrokovou míru: hrubý úrok nejprve zdaníte, pak očistíte od inflace přesným vzorcem. Výsledek v procentech zaokrouhlete na dvě desetinná místa.',
};
function buildRealna({
  mode, i, r, pi, t,
}) {
  let value; let tol;
  if (mode === 'priblizne') value = rd(i - pi, 6);
  else if (mode === 'presne') { value = rd(((1 + i / 100) / (1 + pi / 100) - 1) * 100, 2); tol = 0.01; } else if (mode === 'nominalni') value = rd(r + pi, 6);
  else { value = rd(((i * (1 - t / 100) - pi) / (1 + pi / 100)), 2); tol = 0.01; }
  const given = {
    priblizne: `Nominální úroková míra na vkladu je ${czText(i)} % a očekávaná inflace ${czText(pi)} %.`,
    presne: `Nominální úroková míra na vkladu je ${czText(i)} % a inflace ${czText(pi)} %.`,
    nominalni: `Reálná úroková míra má být ${czText(r)} % a očekávaná inflace je ${czText(pi)} %.`,
    'po-dani': `Hrubá úroková míra vkladu je ${czText(i)} %, daň z úroku ${czText(t)} % a inflace ${czText(pi)} %.`,
  }[mode];
  const sign = mode === 'nominalni' ? '' : value < 0 ? ' Reálná úroková míra je záporná: kupní síla úspor klesá, i když na účtu přibývá korun.' : ' Reálná úroková míra je kladná: kupní síla úspor roste.';
  const steps = {
    priblizne: [
      { title: 'Nominální a reálná míra', text: 'Nominální míra je skutečně placená (uvedená ve smlouvě) a zahrnuje inflaci. Reálná míra je očištěná od změny cenové hladiny a říká, o kolik vzroste kupní síla úspor.', board: [line('i_{nom}=i_{real}+\\pi')] },
      { title: 'Vyjádříme reálnou míru', text: 'Z přibližného vztahu odečteme inflaci od nominální míry.', board: [line('i_{real}=i_{nom}-\\pi')] },
      { title: 'Dosadíme', text: `Dosadíme ${czText(i)} % a ${czText(pi)} %.${sign}`, board: [result(`i_{real}=${cz(i)}-${cz(pi)}=${pctTex(value)}`)] },
    ],
    presne: [
      { title: 'Přesný vztah', text: 'Úspory se za rok zvětší $1+i$ krát a ceny $1+\\pi$ krát. Kupní síla proto vzroste $(1+i)/(1+\\pi)$ krát. Reálná úroková míra je tento růst minus jedna. Pro malé míry se vzorec blíží rozdílu $i-\\pi$.', board: [line('1+r=\\frac{1+i}{1+\\pi}')] },
      { title: 'Dosadíme', text: `Míry převedeme na desetinná čísla: $i=${cz(i / 100)}$, $\\pi=${cz(pi / 100)}$.`, board: [line(`1+r=\\frac{${cz(1 + i / 100)}}{${cz(1 + pi / 100)}}=${cz(r6((1 + i / 100) / (1 + pi / 100)))}`)] },
      { title: 'Reálná míra', text: `Odečteme jedničku a převedeme na procenta: ${czText(value)} %.${sign}`, board: [result(`r=${pctTex(value)}`)] },
    ],
    nominalni: [
      { title: 'Jaký vztah platí', text: 'Věřitel chce dostat reálný výnos a navíc vyrovnat zdražování. Nominální míra se proto přibližně rovná reálné míře plus očekávané inflaci (přesně: $(1+i)=(1+r)(1+\\pi)$).', board: [line('i_{nom}\\approx i_{real}+\\pi^{e}')] },
      { title: 'Dosadíme', text: `Dosadíme reálnou míru ${czText(r)} % a inflaci ${czText(pi)} %.`, board: [line(`i_{nom}\\approx ${cz(r)}+${cz(pi)}`)] },
      { title: 'Výsledek', text: `Nominální úroková míra je přibližně ${czText(value)} %. Čím vyšší je očekávaná inflace, tím vyšší nominální míru věřitelé požadují.`, board: [result(`i_{nom}\\approx ${pctTex(value)}`)] },
    ],
    'po-dani': [
      { title: 'Čistá úroková míra po dani', text: 'Z hrubého úroku odvedeme daň, takže vkladateli zůstane $(1-t)$ násobek hrubé míry.', board: [line('i_{c}=i_{h}\\cdot(1-t)')] },
      { title: 'Dosadíme', text: `Čistá míra je ${czText(rd(i * (1 - t / 100), 4))} %.`, board: [line(`i_{c}=${cz(i)}\\cdot(1-${cz(t / 100)})=${pctTex(rd(i * (1 - t / 100), 4))}`)] },
      { title: 'Očistíme od inflace', text: 'Čistou míru očistíme od inflace přesným vzorcem (stejným, jaký je v prezentaci): $r=(i_c-\\pi)/(1+\\pi)$.', board: [line(`r=\\frac{${cz(rd(i * (1 - t / 100), 4))}-${cz(pi)}}{1+${cz(pi / 100)}}`)] },
      { title: 'Výsledek', text: `Reálná čistá úroková míra je ${czText(value)} %.${sign}`, board: [result(`r=${pctTex(value)}`)] },
    ],
  }[mode];
  return mk('realna-urok', {
    data: {
      mode, i, r, pi, t,
    },
    task: `${given} ${REAL_TEXT[mode]}`,
    answerSpec: { kind: 'number', value, unit: 'percent', ...(tol ? { tol } : {}) },
    conclusion: mode === 'nominalni' ? `Nominální úroková míra je přibližně ${czText(value)} %.` : `Reálná úroková míra je ${czText(value)} %.`,
    solution: steps,
  });
}
function genRealna(rng) {
  const mode = pick(rng, ['priblizne', 'presne', 'nominalni', 'po-dani']);
  return buildRealna({
    mode,
    i: mode === 'po-dani' ? pick(rng, [3, 4, 5, 6, 8]) : pick(rng, [3, 4, 5, 6, 7, 8, 10, 12]),
    r: pick(rng, [1, 1.5, 2, 2.5, 3, 4, 5]),
    pi: pick(rng, [1, 1.5, 2, 2.5, 3, 4, 5, 6]),
    t: pick(rng, [15, 19, 20, 25]),
  });
}

// =====================================================================================
// typ 4: míra výnosu z kapitálového aktiva
// =====================================================================================
function buildMiera({
  I, Y, C, i,
}) {
  const net = Y - C; const value = rd((net / I) * 100, 6);
  const ok = value > i;
  return mk('miera-vynosu', {
    data: {
      I, Y, C, i,
    },
    task: `Kapitálové aktivum stojí ${grp(I)} Kč a ročně přinese celkový výnos ${grp(Y)} Kč; roční provozní náklady jsou ${grp(C)} Kč. Určete míru výnosu v procentech (čistý roční výnos vůči pořizovací ceně). Dále se rozhodněte, zda by se firmě vyplatilo koupit aktivum na bankovní úvěr s úrokovou sazbou ${czText(i)} % ročně (výnos považujte za trvalý).`,
    answerSpec: { kind: 'number', value, unit: 'percent' },
    conclusion: `Míra výnosu je ${czText(value)} %. Úrok z úvěru je ${czText(i)} %, takže se úvěr ${ok ? 'vyplatí (míra výnosu je vyšší než úrok)' : 'nevyplatí (míra výnosu není vyšší než úrok)'}.`,
    source: sourceOf(3),
    solution: [
      { title: 'Čistý roční výnos', text: 'Z celkového výnosu odečteme roční náklady na provoz. Zbude čistý výnos, který aktivum skutečně vydělá.', board: [line(`Y_{\\text{č}}=${cz(Y)}-${cz(C)}=${cz(net)}`)] },
      { title: 'Míra výnosu', text: 'Míru výnosu dostaneme, když čistý roční výnos vydělíme pořizovací cenou (kapitálem, který jsme vložili).', board: [line('r=\\frac{Y_{\\text{č}}}{I}'), result(`r=\\frac{${cz(net)}}{${cz(I)}}=${pctTex(value)}`)] },
      { title: 'Porovnání s úrokem', text: `Úvěr je výhodný jen tehdy, když aktivum vydělá víc, než firma zaplatí bance na úrocích. Míra výnosu ${czText(value)} % ${ok ? 'je vyšší než' : 'není vyšší než'} úroková sazba ${czText(i)} %.`, board: [line(`${cz(value)}\\,\\%${ok ? '>' : '\\le'}${cz(i)}\\,\\%`)] },
      { title: 'Závěr a předpoklady', text: `Úvěr se ${ok ? 'vyplatí' : 'nevyplatí'}. Je to zjednodušený úsudek: míra výnosu je jednoduchý poměr za rok a nepočítá s opotřebením aktiva, s daněmi ani s rizikem.`, board: [line(ok ? 'r>i\\ \\Rightarrow\\ \\text{úvěr se vyplatí}' : 'r\\le i\\ \\Rightarrow\\ \\text{úvěr se nevyplatí}')] },
    ],
  });
}
function genMiera(rng) {
  const I = pick(rng, [40000, 50000, 80000, 100000, 200000, 250000]);
  const rate = int(rng, 4, 30);
  const C = pick(rng, [3000, 5000, 8000, 10000, 15000]);
  const delta = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
  return buildMiera({
    I, Y: (I * rate) / 100 + C, C, i: Math.max(1, rate + delta),
  });
}

// =====================================================================================
// typ 5: cena aktiva z kapitalizovaného výnosu
// =====================================================================================
function buildCena({
  kind, rentM, cost, i, buy, yearly, nominal,
}) {
  const bond = kind === 'obligace';
  const net = bond ? yearly : 12 * rentM - cost;
  const value = Math.round(net / (i / 100));
  const steps = bond ? [
    { title: 'Co rozhoduje o ceně', text: `Pořizovací cena (${grp(buy)} Kč) je už zaplacená a nominální hodnota (${grp(nominal)} Kč) na dnešní hodnotu trvalého výnosu nic nemění. Kupující zaplatí tolik, kolik odpovídá výnosu, který cenný papír každý rok přinese, při dnešní úrokové míře.`, board: [line('Y=\\text{roční výnos}')] },
    { title: 'Kapitalizace výnosu', text: 'Trvalý stejný roční výnos $Y$ by přinesl vklad $P$ při úrokové míře $i$, pro který platí $Y=i\\cdot P$. Cena aktiva je tedy rovna výnosu dělenému úrokovou mírou.', board: [line('P=\\frac{Y}{i}')] },
    { title: 'Dosadíme', text: `Úrokovou míru ${czText(i)} % píšeme jako ${czText(i / 100)}.`, board: [result(`P=\\frac{${cz(yearly)}}{${cz(i / 100)}}=${money(value)}`)] },
    { title: 'Poznámka k předpokladům', text: 'Vzorec platí pro výnos, který se nemění a trvá donekonečna. U cenného papíru s pevnou splatností by se do ceny započítalo i splacení nominální hodnoty. Zde jde o zjednodušení ze zadání.', board: [line('P=\\frac{Y}{i}\\ \\text{(trvalý stejný výnos)}')] },
  ] : [
    { title: 'Čistý roční výnos', text: `Měsíční nájem ${grp(rentM)} Kč vynásobíme dvanácti a odečteme roční náklady na údržbu.`, board: [line(`Y=12\\cdot ${cz(rentM)}-${cz(cost)}=${cz(net)}`)] },
    { title: 'Kapitalizace výnosu', text: 'Cena aktiva je taková částka, která by při dané úrokové míře uložená v bance přinesla stejný roční výnos. Proto cena je čistý roční výnos dělený úrokovou mírou.', board: [line('P=\\frac{Y}{i}')] },
    { title: 'Dosadíme', text: `Úrokovou míru ${czText(i)} % píšeme jako ${czText(i / 100)}.`, board: [result(`P=\\frac{${cz(net)}}{${cz(i / 100)}}=${money(value)}`)] },
    { title: 'Výnosnost vůči kupní ceně', text: `Kupní cena ${grp(buy)} Kč je minulost a do prodejní ceny nevstupuje. Slouží jen k výpočtu roční výnosnosti kapitálu: ${czText(rd((net / buy) * 100, 2))} %. Výpočet platí pro výnos, který trvá stále stejný.`, board: [line(`\\frac{${cz(net)}}{${cz(buy)}}=${pctTex(rd((net / buy) * 100, 2))}`)] },
  ];
  return mk('cena-aktiva', {
    data: {
      kind, rentM, cost, i, buy, yearly, nominal,
    },
    task: bond
      ? `Pan Novák vlastní cenný papír, který mu trvale přináší stejný roční výnos ${grp(yearly)} Kč (nominální hodnota je ${grp(nominal)} Kč a koupil ho za ${grp(buy)} Kč). Za kolik korun ho má prodat při roční úrokové míře ${czText(i)} %? Zaokrouhlete na celé koruny.`
      : `Garáž se pronajímá za ${grp(rentM)} Kč měsíčně, roční náklady na údržbu jsou ${grp(cost)} Kč. Úroková míra na roční vklad je ${czText(i)} %. Garáž byla koupena za ${grp(buy)} Kč. Určete její prodejní cenu (cenu odpovídající kapitalizovanému čistému výnosu), zaokrouhleno na celé koruny.`,
    answerSpec: { kind: 'number', value, tol: 1 },
    conclusion: `Cena je ${czText(value)} Kč.`,
    source: sourceOf(bond ? 10 : 4),
    solution: steps,
  });
}
function genCena(rng) {
  if (rng() < 0.35) {
    return buildCena({
      kind: 'obligace', yearly: int(rng, 30, 60) * 50, i: pick(rng, [4, 5, 8, 10, 11]), nominal: pick(rng, [5000, 10000, 20000]), buy: pick(rng, [8000, 12000, 13500, 25000]),
    });
  }
  for (let t = 0; t < 100; t++) {
    const rentM = int(rng, 10, 60) * 50; const cost = int(rng, 3, 12) * 1000;
    const net = 12 * rentM - cost;
    const buy = Math.round(net / pick(rng, [0.06, 0.08, 0.1, 0.12, 0.13, 0.15]) / 1000) * 1000;
    if (net > 0 && buy >= 10000) return buildCena({ kind: 'najem', rentM, cost, i: pick(rng, [4, 5, 6, 8, 9, 10]), buy });
  }
  return buildCena({ kind: 'najem', rentM: 850, cost: 5000, i: 9, buy: 40000 });
}

// =====================================================================================
// typ 6: čistá současná hodnota (NPV)
// =====================================================================================
const flowsTex = (I0, flows) => tabTex([['t', '0', ...flows.map((_, t) => String(t + 1))], ['c_t', cz(-I0), ...flows.map(cz)]]);
function buildNpv({ I0, flows, r }) {
  const q = 1 + r / 100;
  const npv = npvOf(I0, flows, r); const value = Math.round(npv);
  const verdict = npv > 0 ? 'Čistá současná hodnota je kladná, a investice se proto vyplatí.' : npv < 0 ? 'Čistá současná hodnota je záporná, a investice se proto nevyplatí.' : 'Čistá současná hodnota je nulová, investice je právě na hranici výhodnosti.';
  return mk('npv-projekt', {
    data: { I0, flows, r },
    task: `Firma zvažuje investici ${grp(I0)} Kč, která přinese na konci každého z následujících ${flows.length} let tyto výnosy (v Kč): ${flows.map(grp).join('; ')}. Požadovaná výnosnost (tržní úroková míra) je ${czText(r)} % ročně. Vypočtěte čistou současnou hodnotu investice zaokrouhlenou na celé koruny.`,
    promptTex: flowsTex(I0, flows),
    answerSpec: { kind: 'number', value, tol: 1 },
    conclusion: `Čistá současná hodnota je ${czText(value)} Kč. ${verdict}`,
    source: flows.length === 1 && I0 === 80000 ? sourceOf(1) : undefined,
    solution: [
      { title: 'Vzorec čisté současné hodnoty', text: 'Čistá současná hodnota $NPV$ je součet současných hodnot všech výnosů minus počáteční výdaj. Výdaj v čase 0 se nediskontuje, výnosy z $t$-tého roku dělíme $(1+r)^t$.', board: [line('NPV=-I_0+\\sum_{t=1}^{n}\\frac{c_t}{(1+r)^t}')] },
      { title: 'Současné hodnoty výnosů', text: `Každý výnos diskontujeme sazbou ${czText(r)} % (faktor ${czText(q)} za rok).`,
        board: flows.map((c, t) => line(`PV_{${t + 1}}=\\frac{${cz(c)}}{${cz(q)}^{${t + 1}}}=${c2(c / q ** (t + 1))}`)) },
      { title: 'Součet výnosů dnes', text: `Sečtením získáme dnešní hodnotu všech výnosů: ${czText(rd(pvOf(flows, r), 2))} Kč.`, board: [line(`\\sum PV_t=${c2(pvOf(flows, r))}`)] },
      { title: 'Odečteme výdaj', text: `Od dnešní hodnoty výnosů odečteme výdaj ${grp(I0)} Kč. ${verdict}`, board: [result(`NPV=${c2(pvOf(flows, r))}-${cz(I0)}\\approx ${money(value)}`)] },
    ],
  });
}
function genFlows(rng, I0, lo = 1.05, hi = 1.55) {
  const k = int(rng, 2, 4);
  const total = I0 * (lo + rng() * (hi - lo));
  const w = Array.from({ length: k }, () => int(rng, 1, 5)); const ws = sum(w);
  return w.map((x) => Math.max(1000, Math.round((total * x) / ws / 1000) * 1000));
}
function genNpv(rng) {
  const I0 = pick(rng, [50000, 80000, 100000, 150000, 200000, 500000]);
  return buildNpv({ I0, flows: genFlows(rng, I0), r: pick(rng, [4, 5, 6, 8, 10, 12]) });
}

// =====================================================================================
// typ 7: vnitřní výnosové procento (IRR)
// =====================================================================================
function buildIrr({
  kind, I0, N, n, c1, c2, ir, i,
}) {
  const ok = ir > i;
  const flows = kind === 'jedna' ? [...Array(n - 1).fill(0), N] : [c1, c2];
  const first = kind === 'jedna' ? [
    { title: 'Co je vnitřní výnosové procento', text: 'Vnitřní výnosové procento (IRR) je takové $r$, při kterém je čistá současná hodnota investice nulová: dnešní hodnota výnosů se právě rovná výdaji.', board: [line('NPV(r)=-I_0+\\frac{N}{(1+r)^n}=0')] },
    { title: 'Vyjádříme r', text: `Investice přinese jedinou platbu $N$ za ${n} ${roku(n)}. Z rovnice vyplývá $(1+r)^n=N/I_0$, a tedy $r$ získáme odmocněním.`,
      board: [line(`(1+r)^{${n}}=\\frac{${cz(N)}}{${cz(I0)}}=${cz(r6(N / I0))}`), line(`1+r=\\sqrt[${n}]{${cz(r6(N / I0))}}=${cz(r6(1 + ir / 100))}`)] },
    { title: 'Výsledek', text: `Vnitřní výnosové procento je ${czText(ir)} %.`, board: [result(`r^{*}=${pctTex(ir)}`)] },
  ] : [
    { title: 'Co je vnitřní výnosové procento', text: 'Vnitřní výnosové procento (IRR) je takové $r$, při kterém je čistá současná hodnota nulová. Zavedeme $q=1/(1+r)$ (diskontní faktor za jeden rok), takže rovnice je kvadratická v $q$.', board: [line('-I_0+c_1q+c_2q^2=0')] },
    { title: 'Kvadratická rovnice', text: `Dosadíme platby. Z kořenů bereme kladný, protože diskontní faktor je kladný.`,
      board: [line(`${cz(c2)}q^2+${cz(c1)}q-${cz(I0)}=0`), line(`q=\\frac{-${cz(c1)}+\\sqrt{${cz(c1)}^2+4\\cdot ${cz(c2)}\\cdot ${cz(I0)}}}{2\\cdot ${cz(c2)}}=${cz(r6(1 / (1 + ir / 100)))}`)] },
    { title: 'Vnitřní výnosové procento', text: `Z $q$ spočteme $r=1/q-1$: ${czText(ir)} %.`, board: [result(`r^{*}=\\frac{1}{q}-1=${pctTex(ir)}`)] },
  ];
  return mk('vnitrni-vynos', {
    data: {
      kind, I0, N, n, c1, c2, ir, i,
    },
    task: kind === 'jedna'
      ? `Investice ${grp(I0)} Kč přinese jedinou platbu ${grp(N)} Kč za ${n} ${roku(n)}. Určete vnitřní výnosové procento v procentech. Rozhodněte, zda se investice vyplatí, když tržní úroková míra je ${czText(i)} %.`
      : `Investice ${grp(I0)} Kč přinese na konci prvního roku ${grp(c1)} Kč a na konci druhého roku ${grp(c2)} Kč. Určete vnitřní výnosové procento v procentech. Rozhodněte, zda se investice vyplatí, když tržní úroková míra je ${czText(i)} %.`,
    promptTex: flowsTex(I0, flows),
    answerSpec: { kind: 'number', value: ir, unit: 'percent' },
    conclusion: `Vnitřní výnosové procento je ${czText(ir)} %. Tržní úroková míra je ${czText(i)} %, a investice se proto ${ok ? 'vyplatí' : 'nevyplatí'}.`,
    solution: [
      ...first,
      { title: 'Zkouška a rozhodnutí', text: `Při $r=${cz(ir)}\\,\\%$ je $NPV=0$. Investice (s jedním výdajem a následnými příjmy) se vyplatí, je-li IRR vyšší než tržní úroková míra, tedy než cena peněz. Zde ${ok ? `je ${czText(ir)} % víc než ${czText(i)} %` : `${czText(ir)} % není víc než ${czText(i)} %`}.`,
        board: [line(`NPV(${cz(ir)}\\,\\%)=0`), line(`${cz(ir)}\\,\\%${ok ? '>' : '\\le'}${cz(i)}\\,\\%\\ \\Rightarrow\\ \\text{${ok ? 'vyplatí se' : 'nevyplatí se'}}`)] },
    ],
  });
}
function genIrr(rng) {
  for (let t = 0; t < 100; t++) {
    const I0 = pick(rng, [10000, 20000, 50000, 100000]);
    const delta = pick(rng, [-3, -2, -1, 1, 2, 3]);
    if (rng() < 0.6) {
      const n = int(rng, 1, 4);
      const r = n <= 2 ? pick(rng, [5, 8, 10, 12, 15, 20, 25, 50]) : pick(rng, [10, 20, 50]);
      const N = I0 * (1 + r / 100) ** n;
      if (Math.abs(N - Math.round(N)) > 1e-6) continue;
      return buildIrr({
        kind: 'jedna', I0, N: Math.round(N), n, ir: r, i: Math.max(1, r + delta),
      });
    }
    const r = pick(rng, [10, 20, 25]);
    const a = int(rng, 2, 10) * 400; const b = int(rng, 2, 10) * 400;
    const c1 = a * (1 + r / 100); const c2 = b * (1 + r / 100) ** 2;
    if (!Number.isInteger(r6(c1)) || !Number.isInteger(r6(c2))) continue;
    return buildIrr({
      kind: 'dve', I0: a + b, c1: Math.round(c1), c2: Math.round(c2), ir: r, i: Math.max(1, r + delta),
    });
  }
  return buildIrr({
    kind: 'jedna', I0: 10000, N: 12100, n: 2, ir: 10, i: 8,
  });
}

// =====================================================================================
// typ 8: rozhodnutí o investici podle NPV
// =====================================================================================
const YESNO = [{ id: 'ano', text: 'Investici realizovat' }, { id: 'ne', text: 'Investici nerealizovat' }];
function buildRozhodnuti({ I0, flows, r }) {
  const q = 1 + r / 100;
  const npv = npvOf(I0, flows, r); const go = npv > 0;
  const total = sum(flows);
  return mk('rozhodnuti-investice', {
    data: { I0, flows, r },
    task: `Firma zvažuje jednorázový výdaj ${grp(I0)} Kč na investici. Ta přinese na konci každého z následujících ${flows.length} ${flows.length === 1 ? 'roku' : 'let'} výnosy (v Kč): ${flows.map(grp).join('; ')}. Tržní úroková míra je ${czText(r)} % ročně a firma může peníze půjčit nebo si půjčit za tuto sazbu. Má firma investici realizovat?`,
    promptTex: flowsTex(I0, flows),
    answerSpec: { kind: 'choice', value: go ? 'ano' : 'ne', options: YESNO },
    conclusion: go ? `NPV = ${czText(rd(npv, 2))} Kč je kladná, investice se vyplatí.` : `NPV = ${czText(rd(npv, 2))} Kč není kladná, investice se nevyplatí.`,
    source: flows.length === 1 && I0 === 80000 ? sourceOf(1) : undefined,
    solution: [
      { title: 'Správné srovnání peněz v čase', text: `Součet výnosů ${grp(total)} Kč je ${total > I0 ? 'větší' : 'menší nebo rovný'} než výdaj ${grp(I0)} Kč, ale to nestačí: peníze z různých let nelze sčítat, protože dnešní koruna je víc než zítřejší. Proto výnosy diskontujeme tržní úrokovou mírou a srovnáváme je s výdajem v dnešních penězích.`, board: [line('NPV=-I_0+\\sum_{t}\\frac{c_t}{(1+r)^t}')] },
      { title: 'Diskontujeme výnosy', text: `Faktor za jeden rok je ${czText(q)}.`, board: flows.map((c, t) => line(`PV_{${t + 1}}=\\frac{${cz(c)}}{${cz(q)}^{${t + 1}}}=${c2(c / q ** (t + 1))}`)) },
      { title: 'Čistá současná hodnota', text: `Součet současných hodnot výnosů je ${czText(rd(pvOf(flows, r), 2))} Kč. Po odečtení výdaje vychází čistá současná hodnota ${czText(rd(npv, 2))} Kč.`, board: [result(`NPV=${c2(pvOf(flows, r))}-${cz(I0)}=${money(rd(npv, 2))}`)] },
      { title: 'Rozhodnutí', text: go ? 'Čistá současná hodnota je kladná: investice vydělá víc, než by vydělala půjčka peněz za tržní sazbu. Firma ji má realizovat.' : 'Čistá současná hodnota není kladná: stejné peníze vydělají při tržní sazbě aspoň tolik. Firma investici nemá realizovat.', board: [line(go ? 'NPV>0\\ \\Rightarrow\\ \\text{realizovat}' : 'NPV\\le 0\\ \\Rightarrow\\ \\text{nerealizovat}')] },
    ],
  });
}
function genRozhodnuti(rng) {
  for (let t = 0; t < 100; t++) {
    const I0 = pick(rng, [50000, 80000, 100000, 150000, 200000]);
    const flows = genFlows(rng, I0, 0.95, 1.5); const r = pick(rng, [4, 5, 6, 8, 10, 12]);
    if (Math.abs(npvOf(I0, flows, r)) >= 0.03 * I0) return buildRozhodnuti({ I0, flows, r });
  }
  return buildRozhodnuti({ I0: 80000, flows: [120000], r: 10 });
}

// =====================================================================================
// typ 9: porovnání dvou investic
// =====================================================================================
function buildPorovnani({ I0, A, B, r }) {
  const q = 1 + r / 100;
  const na = npvOf(I0, A, r); const nb = npvOf(I0, B, r);
  const best = na > nb ? 'A' : 'B';
  return mk('porovnani-projektu', {
    data: { I0, A, B, r },
    task: `Firma si může vybrat jen jeden ze dvou projektů se stejným výdajem ${grp(I0)} Kč. Projekt A přinese na konci jednotlivých let výnosy ${A.map(grp).join('; ')} Kč, projekt B ${B.map(grp).join('; ')} Kč. Tržní úroková míra je ${czText(r)} %. Který projekt je výhodnější?`,
    promptTex: tabTex([['t', '0', ...A.map((_, t) => String(t + 1))], ['A', cz(-I0), ...A.map(cz)], ['B', cz(-I0), ...B.map(cz)]]),
    answerSpec: { kind: 'choice', value: best, options: [{ id: 'A', text: 'Projekt A' }, { id: 'B', text: 'Projekt B' }] },
    conclusion: `NPV projektu A je ${czText(rd(na, 2))} Kč a projektu B ${czText(rd(nb, 2))} Kč. Výhodnější je projekt ${best}.`,
    solution: [
      { title: 'Pravidlo pro vzájemně se vylučující projekty', text: 'Projekty se vylučují a mají stejný rozsah (stejný výdaj). Vybíráme ten s vyšší čistou současnou hodnotou, protože ta měří, o kolik vydělá víc než tržní alternativa. Rozhodují dnešní hodnoty, ne prostý součet výnosů.', board: [line('NPV=-I_0+\\sum_{t}\\frac{c_t}{(1+r)^t}')] },
      { title: 'NPV projektu A', text: `Výnosy projektu A diskontujeme faktorem ${czText(q)} za rok.`, board: [...A.map((c, t) => line(`PV_{${t + 1}}=\\frac{${cz(c)}}{${cz(q)}^{${t + 1}}}=${c2(c / q ** (t + 1))}`)), line(`NPV_A=${c2(pvOf(A, r))}-${cz(I0)}=${c2(na)}`)] },
      { title: 'NPV projektu B', text: 'Stejným postupem spočteme projekt B.', board: [...B.map((c, t) => line(`PV_{${t + 1}}=\\frac{${cz(c)}}{${cz(q)}^{${t + 1}}}=${c2(c / q ** (t + 1))}`)), line(`NPV_B=${c2(pvOf(B, r))}-${cz(I0)}=${c2(nb)}`)] },
      { title: 'Porovnání', text: `Projekt ${best} má vyšší čistou současnou hodnotu (${czText(rd(Math.max(na, nb), 2))} Kč proti ${czText(rd(Math.min(na, nb), 2))} Kč), a je proto výhodnější.`, board: [result(`NPV_{${best}}>NPV_{${best === 'A' ? 'B' : 'A'}}\\ \\Rightarrow\\ \\text{projekt }${best}`)] },
    ],
  });
}
function genPorovnani(rng) {
  for (let t = 0; t < 200; t++) {
    const I0 = pick(rng, [50000, 100000, 150000]);
    const k = 3; const r = pick(rng, [5, 8, 10, 12]);
    const mkFlows = () => Array.from({ length: k }, () => int(rng, 2, 9) * 5000 * (I0 / 100000)).map((x) => Math.round(x / 1000) * 1000);
    const A = mkFlows(); const B = mkFlows();
    const na = npvOf(I0, A, r); const nb = npvOf(I0, B, r);
    if (Math.abs(na - nb) >= 0.03 * I0 && Math.max(na, nb) > 0) return buildPorovnani({ I0, A, B, r });
  }
  return buildPorovnani({ I0: 100000, A: [60000, 40000, 20000], B: [20000, 40000, 70000], r: 10 });
}

// =====================================================================================
// typ 10: Lorenzova křivka z tabulky skupin (kumulativní podíly)
// =====================================================================================
// podíly skupin domácností o stejné velikosti na celkovém důchodu (v %), součet 100
function genShares(rng, n = 5) {
  for (let t = 0; t < 200; t++) {
    const e = pick(rng, [1, 1.3, 1.6, 2]);
    const raw = Array.from({ length: n }, () => Math.round(int(rng, 3, 40) ** e)).sort((a, b) => a - b);
    const tot = sum(raw);
    const sh = raw.map((v) => Math.floor((v * 100) / tot));
    sh[n - 1] += 100 - sum(sh);
    if (sh[0] >= 2 && sh[n - 1] >= sh[0] + 4 && sh.every((v, k) => k === 0 || v >= sh[k - 1])) return sh;
  }
  return [6, 11, 16, 24, 43];
}
const sharesTex = (shares) => tabTex([['\\text{skupina}', ...shares.map((_, k) => GROUPS[k])], ['\\text{podíl na důchodu}\\ (\\%)', ...shares.map(cz)]]);

function buildLorenzTab({ shares }) {
  const sorted = sortAsc(shares); const n = sorted.length; const c = cumul(sorted);
  const step = 100 / n;
  const was = shares.some((v, k) => v !== sorted[k]);
  return mk('lorenz-tabulka', {
    data: { shares },
    task: `Domácnosti jsou rozdělené do ${NUM_GEN[n] ?? n} stejně velkých skupin (každá tvoří ${czText(step)} % domácností). Tabulka ukazuje podíl každé skupiny na celkovém důchodu ekonomiky${was ? ' (skupiny nejsou seřazené podle důchodu)' : ''}. Vypočtěte souřadnice Lorenzovy křivky: kumulativní podíl na důchodu (v %) pro ${sorted.map((_, k) => czText(step * (k + 1))).join('; ')} % domácností (od nejchudších). Zapište ${NUM_NOM[n] ?? n} hodnot po řadě.`,
    promptTex: sharesTex(shares),
    answerSpec: { kind: 'table', value: cells(c) },
    conclusion: `Body Lorenzovy křivky: ${sorted.map((_, k) => `${czText(step * (k + 1))} % domácností má ${czText(c[k])} % důchodů`).join('; ')}.`,
    solution: [
      { title: 'Seřadíme od nejchudších', text: was ? 'Lorenzova křivka se vždy kreslí tak, že domácnosti seřadíme od nejchudších k nejbohatším. Podíly proto seřadíme vzestupně.' : 'Domácnosti musí být seřazené od nejchudších k nejbohatším. Podíly jsou už vzestupně, takže stačí pokračovat.',
        board: [line(`\\text{podíly vzestupně: }${sorted.map(cz).join(',\\ ')}`)] },
      { title: 'Kumulujeme podíly', text: 'Každý bod křivky je součet podílů všech skupin od nejchudší až po danou skupinu. Poslední hodnota musí vyjít 100 %.',
        board: sorted.map((v, k) => line(k === 0 ? `L_1=${cz(v)}` : `L_{${k + 1}}=L_{${k}}+${cz(v)}=${cz(c[k])}`)) },
      { title: 'Souřadnice bodů', text: `Křivka prochází bodem (0; 0), body (podíl domácností; podíl důchodů) a končí v bodě (100; 100).`,
        board: [result(`(0;0),\\ ${c.map((v, k) => `(${cz(step * (k + 1))};${cz(v)})`).join(',\\ ')}`)] },
      { title: 'Lorenzova křivka v grafu', text: 'Body spojíme úsečkami. Křivka leží pod přímkou rovnosti, a čím je od ní dál, tím nerovnější je rozdělení důchodů.', viz: lorenzViz([{ shares: sorted, label: 'L' }], { areas: true }) },
    ],
  });
}
function genLorenzTab(rng) {
  const s = genShares(rng); return buildLorenzTab({ shares: rng() < 0.5 ? shuffle(rng, s) : s });
}

// =====================================================================================
// typ 11: Giniho koeficient z dat
// =====================================================================================
function giniRows(sorted) {
  const c = cumul(sorted); const n = sorted.length;
  const L = [0, ...c].map((v) => v / 100);
  const terms = sorted.map((_, k) => ((L[k] + L[k + 1]) / 2) / n);
  return { c, L, terms, B: sum(terms) };
}
function buildGini({ shares }) {
  const sorted = sortAsc(shares); const n = sorted.length;
  const { c, L, terms, B } = giniRows(sorted);
  const G = rd(1 - 2 * B, 3);
  return mk('gini-z-dat', {
    data: { shares },
    task: `Domácnosti jsou rozdělené do ${NUM_GEN[n] ?? n} stejně velkých skupin. Tabulka ukazuje podíl každé skupiny na celkovém důchodu. Vypočtěte Giniho koeficient (číslo od 0 do 1, na tři desetinná místa). Plochu pod Lorenzovou křivkou počítejte po lichoběžnících mezi sousedními body.`,
    promptTex: sharesTex(shares),
    answerSpec: { kind: 'number', value: G, tol: 0.001 },
    conclusion: `Giniho koeficient je ${czText(G)}.`,
    solution: [
      { title: 'Kumulativní podíly (body Lorenzovy křivky)', text: 'Skupiny seřadíme od nejchudších a podíly sečteme postupně. Dostaneme body Lorenzovy křivky, tentokrát jako desetinná čísla (1 = 100 %).',
        board: [line(`L_0=0,\\ ${L.slice(1).map((v, k) => `L_{${k + 1}}=${cz(rd(v, 4))}`).join(',\\ ')}`)] },
      { title: 'Plocha B pod Lorenzovou křivkou', text: `Každý úsek křivky tvoří spolu s osou x lichoběžník. Jeho šířka je ${czText(1 / n)} (podíl domácností) a výška je průměr hodnot $L$ na obou koncích. Plochy sečteme.`,
        board: [...terms.map((tm, k) => line(`B_{${k + 1}}=${cz(rd(1 / n, 4))}\\cdot\\frac{${cz(rd(L[k], 4))}+${cz(rd(L[k + 1], 4))}}{2}=${cz(rd(tm, 5))}`)), line(`B=${cz(rd(B, 5))}`)] },
      { title: 'Giniho koeficient', text: 'Při osách v podílech je plocha pod přímkou rovnosti $A=0{,}5$. Giniho koeficient je podíl plochy mezi přímkou a křivkou na celé ploše $A$.',
        board: [line('G=\\frac{A-B}{A}=1-2B'), result(`G=\\frac{0{,}5-${cz(rd(B, 5))}}{0{,}5}=${cz(G)}`)] },
      { title: 'Význam výsledku', text: `Hodnota ${czText(G)} leží mezi 0 (úplná rovnost) a 1 (jedna domácnost má všechno). Čím je vyšší, tím nerovnější je rozdělení. Z dat po skupinách vychází spíše dolní odhad, protože uvnitř skupin se předpokládá rovnost.`, viz: lorenzViz([{ shares: sorted, label: 'L' }], { areas: true }) },
    ],
  });
}
function genGini(rng) { const s = genShares(rng); return buildGini({ shares: rng() < 0.5 ? shuffle(rng, s) : s }); }

// =====================================================================================
// typ 12: porovnání nerovnosti dvou zemí
// =====================================================================================
function buildGiniPorov({ A, B }) {
  const sa = sortAsc(A); const sb = sortAsc(B);
  const ga = rd(1 - 2 * giniRows(sa).B, 3); const gb = rd(1 - 2 * giniRows(sb).B, 3);
  const eq = ga < gb ? 'A' : 'B';
  const row = (name, sh, g) => {
    const { c, B: area } = giniRows(sh);
    return [line(`\\text{${name}: }L=${c.map((v) => cz(v / 100)).join(',\\ ')}`), line(`B_{${name}}=${cz(rd(area, 5))}\\ \\Rightarrow\\ G_{${name}}=1-2\\cdot ${cz(rd(area, 5))}=${cz(rd(1 - 2 * area, 3))}`)];
  };
  return mk('gini-porovnani', {
    data: { A, B },
    task: 'Podíly pěti stejně velkých skupin domácností (od nejchudší po nejbohatší) na celkovém důchodu jsou ve dvou zemích dány tabulkou. Ve které zemi je podle Giniho koeficientu rozdělení důchodů rovnoměrnější?',
    promptTex: tabTex([['\\text{skupina}', ...sa.map((_, k) => String(k + 1))], ['\\text{země A}\\ (\\%)', ...sa.map(cz)], ['\\text{země B}\\ (\\%)', ...sb.map(cz)]]),
    answerSpec: { kind: 'choice', value: eq, options: [{ id: 'A', text: 'Rovnoměrnější je rozdělení v zemi A' }, { id: 'B', text: 'Rovnoměrnější je rozdělení v zemi B' }] },
    conclusion: `Giniho koeficient země A je ${czText(ga)} a země B ${czText(gb)}. Rovnoměrnější (s nižším G) je země ${eq}.`,
    solution: [
      { title: 'Co porovnáváme', text: 'Giniho koeficient měří odchylku Lorenzovy křivky od přímky rovnosti. Čím nižší, tím rovnoměrnější rozdělení. Obě země proto spočteme stejným postupem.', board: [line('G=1-2B,\\quad B=\\sum\\frac{L_{k-1}+L_k}{2}\\cdot\\frac{1}{5}')] },
      { title: 'Země A', text: 'Kumulativní podíly a plocha pod křivkou země A.', board: row('A', sa) },
      { title: 'Země B', text: 'Totéž pro zemi B.', board: row('B', sb) },
      { title: 'Porovnání', text: `Nižší Giniho koeficient má země ${eq} (${czText(Math.min(ga, gb))} proti ${czText(Math.max(ga, gb))}), její Lorenzova křivka je blíž přímce rovnosti. Při protínajících se Lorenzových křivkách se pořadí zemí může lišit podle zvolené míry nerovnosti; Gini je jen jedna z nich.`,
        board: [result(`G_{${eq}}<G_{${eq === 'A' ? 'B' : 'A'}}`)], viz: lorenzViz([{ shares: sa, label: 'A', color: 'blue' }, { shares: sb, label: 'B', color: 'green' }], { alt: 'Lorenzovy křivky dvou zemí' }) },
    ],
  });
}
function genGiniPorov(rng) {
  for (let t = 0; t < 200; t++) {
    const A = genShares(rng); const B = genShares(rng);
    if (Math.abs(giniRows(A).B - giniRows(B).B) >= 0.02) return buildGiniPorov({ A, B });
  }
  return buildGiniPorov({ A: [10, 14, 18, 24, 34], B: [4, 8, 13, 22, 53] });
}

// =====================================================================================
// typ 13: přerozdělení daní a transferů
// =====================================================================================
function buildPrerozdeleni({ y, t, ask }) {
  const n = y.length; const s = sortAsc(y);
  const mean = sum(s) / n; const T = (t / 100) * mean;
  const net = s.map((v) => rd(v * (1 - t / 100) + T, 6));
  const g0 = 1 - 2 * giniRows(s.map((v) => (v / sum(s)) * 100)).B;
  const g1 = (1 - t / 100) * g0;
  const value = ask === 'transfer' ? rd(T, 2) : ask === 'cisty' ? rd(net[0], 2) : rd(g1, 3);
  const unit = 'tis. Kč měsíčně';
  const what = { transfer: 'Jak velký transfer (v tis. Kč měsíčně) dostane každá skupina?', cisty: 'Jaký je výsledný čistý důchod nejchudší skupiny (v tis. Kč měsíčně)?', 'gini-po': 'Jaký je Giniho koeficient čistých důchodů po zdanění a transferech (na tři desetinná místa)?' }[ask];
  const lines = [
    { title: 'Průměrný důchod a transfer', text: `Průměr získáme dělením součtu důchodů počtem skupin. Daň ${czText(t)} % z průměru je výnos daně na jednu skupinu. Protože se celý výnos rozdělí rovným dílem, transfer je stejný.`,
      board: [line(`\\bar y=\\frac{${s.map(cz).join('+')}}{${n}}=${cz(rd(mean, 4))}`), line(`T=t\\cdot\\bar y=${cz(t / 100)}\\cdot ${cz(rd(mean, 4))}=${cz(rd(T, 4))}`)] },
    { title: 'Čisté důchody', text: 'Čistý důchod je hrubý důchod po odvedení daně plus transfer.', board: [line('y^{\\text{č}}=y(1-t)+T'), ...s.map((v, k) => line(`${GROUPS[k]}:\\ ${cz(v)}\\cdot ${cz(1 - t / 100)}+${cz(rd(T, 4))}=${cz(rd(net[k], 4))}`))] },
    ...(ask === 'gini-po' ? [{ title: 'Giniho koeficient před přerozdělením', text: 'Nejdřív spočteme Gini hrubých důchodů z kumulativních podílů (lichoběžníky pod Lorenzovou křivkou).',
      board: [line(`L=${giniRows(s.map((v) => (v / sum(s)) * 100)).L.slice(1).map((v) => cz(rd(v, 4))).join(',\\ ')}`), line(`G_{\\text{před}}=1-2B=${cz(rd(g0, 4))}`)] },
    { title: 'Vliv daně a rovného transferu', text: 'Všechny čisté důchody se od průměru liší o $(1-t)$ krát původní rozdíl, protože se průměr nemění. Proporcionální daň s rovným transferem proto zmenší Giniho koeficient na $(1-t)$ násobek.', board: [line('G_{\\text{po}}=(1-t)\\,G_{\\text{před}}'), result(`G_{\\text{po}}=${cz(1 - t / 100)}\\cdot ${cz(rd(g0, 4))}=${cz(value)}`)] }]
      : [{ title: ask === 'transfer' ? 'Transfer' : 'Čistý důchod nejchudší skupiny', text: ask === 'transfer' ? `Každá skupina dostane transfer ${czText(value)} tis. Kč měsíčně.` : `Nejchudší skupina (${GROUPS[0]}) má po zdanění a transferu ${czText(value)} tis. Kč měsíčně, ač původně ${czText(s[0])}.`,
        board: [result(ask === 'transfer' ? `T=${cz(value)}\\ \\text{tis. Kč}` : `y_{${GROUPS[0]}}^{\\text{č}}=${cz(value)}\\ \\text{tis. Kč}`)] }]),
    { title: 'Lorenzovy křivky před a po', text: `Po přerozdělení se křivka čistých důchodů (zeleně) přiblíží přímce rovnosti. Skupina s nejnižším důchodem zlepšila podíl z ${czText(rd((s[0] / sum(s)) * 100, 1))} % na ${czText(rd((net[0] / sum(net)) * 100, 1))} %.`,
      viz: lorenzViz([{ shares: s, label: 'před', color: 'blue' }, { shares: net, label: 'po', color: 'green' }], { alt: 'Lorenzova křivka před a po přerozdělení daní a transferů' }) },
  ];
  return mk('prerozdeleni-davky', {
    data: { y, t, ask },
    task: `${cap1(NUM_NOM[n] ?? String(n))} stejně velkých skupin domácností má před zdaněním tyto měsíční důchody (v tis. Kč na domácnost). Stát vybere z každého důchodu daň ve stejné sazbě ${czText(t)} % a celý výnos rozdělí rovným dílem jako transfer mezi všechny skupiny. ${what}`,
    promptTex: tabTex([['\\text{skupina}', ...y.map((_, k) => GROUPS[k])], ['y\\ (\\text{tis. Kč})', ...y.map(cz)]]),
    answerSpec: { kind: 'number', value, ...(ask === 'gini-po' ? { tol: 0.001 } : {}) },
    conclusion: ask === 'transfer' ? `Transfer je ${czText(value)} ${unit}.` : ask === 'cisty' ? `Čistý důchod nejchudší skupiny je ${czText(value)} ${unit}.` : `Giniho koeficient po přerozdělení je ${czText(value)} (před ním ${czText(rd(g0, 3))}).`,
    solution: lines,
  });
}
function genPrerozdeleni(rng) {
  for (let k = 0; k < 100; k++) {
    const y = Array.from({ length: 5 }, () => int(rng, 1, 15) * 10);
    const s = sortAsc(y);
    const tt = pick(rng, [10, 20, 25, 30, 40]); const ask = pick(rng, ['transfer', 'cisty', 'gini-po']);
    const g3 = (1 - tt / 100) * (1 - 2 * giniRows(s.map((v) => (v / sum(s)) * 100)).B) * 1000;
    if (Math.abs(g3 - Math.floor(g3) - 0.5) < 1e-6) continue; // zaokrouhlení na pomezí: nejednoznačné
    if (s[4] >= 3 * s[0] && s[4] > s[3]) return buildPrerozdeleni({ y: rng() < 0.5 ? s : y, t: tt, ask });
  }
  return buildPrerozdeleni({ y: [20, 40, 60, 90, 190], t: 20, ask: 'cisty' });
}

// =====================================================================================
// typ 14: pravda, nebo nepravda
// =====================================================================================
// kn-a až kn-j jsou úkoly ano/ne z části C cvičebnice kap. 10 (správné odpovědi A, N, A, N, A, N, A, A, N, A).
const STATEMENTS = [
  { id: 'kn-a', text: 'Když je úroková míra nad rovnovážnou úrovní, budou na trhu kapitálu úspory větší než investice.', truth: true, why: 'Při vysoké úrokové míře se firmám vyplatí investovat jen málo, zatímco domácnosti spoří hodně, a vzniká přebytek úspor. Míra výnosu z kapitálu určuje poptávku po investicích: při vysoké úrokové míře se vyplatí jen projekty s vysokým výnosem. Úroková míra nad rovnovážnou úrovní pak klesá.' },
  { id: 'kn-b', text: 'Když roste úroková míra, budou ti, kdo spoří, za jinak nezměněných okolností snižovat objem svých úspor.', truth: false, why: 'Podle skript růst úrokové míry úspory zvyšuje, protože odložená spotřeba se víc vyplatí (substituční efekt). Teoreticky může u některých lidí převážit důchodový efekt, ale obecným pravidlem to není.' },
  { id: 'kn-c', text: 'Nominální úroková míra se od reálné úrokové míry odlišuje o očekávanou míru inflace.', truth: true, why: 'Nominální míra zahrnuje inflaci. Přibližně platí nominální = reálná + inflace, přesně (1 + nominální) = (1 + reálná)(1 + inflace).' },
  { id: 'kn-d', text: 'Velikost nabídky kapitálu na jednotlivých kapitálových trzích nezávisí na velikosti úrokové míry.', truth: false, why: 'Nabídku kapitálu tvoří úspory a ty závisejí na reálné úrokové míře: v dlouhém období je nabídková křivka rostoucí.' },
  { id: 'kn-e', text: 'Poptávka na trhu kapitálu závisí na reálné úrokové míře.', truth: true, why: 'Firmy investují, dokud příjem z mezního produktu kapitálu pokrývá cenu kapitálu (úrok). Poptávka je klesající funkcí reálné úrokové míry.' },
  { id: 'kn-f', text: 'Nabídka na trhu kapitálu je funkcí úspor a v krátkém období je dokonale elastická.', truth: false, why: 'Funkcí úspor je, ale v krátkém období je zásoba kapitálu dána, a křivka nabídky je proto dokonale neelastická (svislá), nikoli elastická.' },
  { id: 'kn-g', text: 'Když roste úroková míra, budoucí hodnota aktiv se za jinak nezměněných okolností zvyšuje.', truth: true, why: 'Budoucí hodnota je $PV(1+r)^n$, takže s růstem $r$ roste.' },
  { id: 'kn-h', text: 'Když roste úroková míra, současná hodnota aktiv se za jinak nezměněných okolností snižuje.', truth: true, why: 'Současná hodnota je budoucí platba dělená $(1+r)^n$, takže s růstem $r$ klesá.' },
  { id: 'kn-i', text: 'Platba za použití kapitálových statků se nazývá úrok.', truth: false, why: 'Za použití kapitálových statků (strojů, budov) se platí nájemné. Úrok je platba za použití kapitálu v podobě peněz.' },
  { id: 'kn-j', text: 'Platba za použití kapitálu v podobě finančních prostředků se nazývá úrok.', truth: true, why: 'Úrok je cena za zapůjčení peněz (finančního kapitálu).' },
  { id: 'own-1', text: 'Čistá současná hodnota investice je součet diskontovaných budoucích výnosů mínus počáteční výdaj.', truth: true, why: 'To je definice NPV: výnosy z různých let se převedou na dnešek a porovnají s výdajem.' },
  { id: 'own-2', text: 'Samostatný projekt s kladnou čistou současnou hodnotou (při tržní úrokové míře jako diskontní sazbě) je výhodné realizovat.', truth: true, why: 'Kladná NPV znamená, že projekt vydělá víc než půjčení peněz za tržní sazbu.' },
  { id: 'own-3', text: 'Vnitřní výnosové procento je úroková míra, při které je čistá současná hodnota projektu rovna nule.', truth: true, why: 'Tak je IRR definováno. Projekt s jedním výdajem a následnými příjmy se vyplatí, je-li IRR vyšší než tržní úroková míra.' },
  { id: 'own-4', text: 'Je-li součet nominálních výnosů investice větší než její výdaj, je investice vždy výhodná.', truth: false, why: 'Výnosy v pozdějších letech mají nižší současnou hodnotu. Rozhoduje čistá současná hodnota, ne prostý součet.' },
  { id: 'own-5', text: 'Reálná úroková míra je vždy nižší než nominální.', truth: false, why: 'Platí to jen při kladné inflaci. Při deflaci je reálná míra vyšší než nominální.' },
  { id: 'own-6', text: 'Při nominální úrokové míře 5 % a inflaci 7 % vkladatel přichází o část kupní síly svých úspor.', truth: true, why: 'Reálná míra vychází přibližně −2 %, takže kupní síla úspor klesá, i když na účtu přibývá korun.' },
  { id: 'own-7', text: 'Kapitál je tokovou veličinou a investice stavovou veličinou.', truth: false, why: 'Je to naopak: kapitál je zásoba k určitému okamžiku (stav) a investice je jeho změna za období (tok).' },
  { id: 'own-8', text: 'Hrubé investice se rovnají čistým investicím plus obnovovacím investicím, které nahrazují opotřebený kapitál.', truth: true, why: 'Platí $I_B=I_N+I_R$: čisté investice zvyšují zásobu kapitálu, obnovovací jen nahrazují amortizaci.' },
  { id: 'own-9', text: 'Poptávka po kapitálu je klesající funkcí úrokové míry, protože mezní produkt kapitálu klesá.', truth: true, why: 'Při větším množství kapitálu klesá příjem z mezního produktu kapitálu, a firmy proto jsou ochotny platit za další kapitál jen nižší úrok.' },
  { id: 'own-10', text: 'Giniho koeficient je roven nule, když všechny domácnosti mají stejný důchod.', truth: true, why: 'Lorenzova křivka je pak přímka rovnosti, plocha mezi nimi je nulová a G = 0.' },
  { id: 'own-11', text: 'Čím dál je Lorenzova křivka od přímky rovnosti, tím rovnoměrnější je rozdělení důchodů.', truth: false, why: 'Čím je křivka dál od přímky, tím je nerovnost větší a Giniho koeficient vyšší.' },
  { id: 'own-12', text: 'Zdvojnásobení důchodů všech domácností v ekonomice změní Giniho koeficient.', truth: false, why: 'Giniho koeficient měří relativní rozdělení (podíly), takže při proporcionální změně všech důchodů zůstane stejný.' },
  { id: 'own-13', text: 'Důchod je tokový ukazatel za určité období, bohatství je stavový ukazatel k určitému okamžiku.', truth: true, why: 'Důchod je peníze získané za období (např. za rok), bohatství je čistá hodnota majetku v daném okamžiku.' },
  { id: 'own-14', text: 'Druhotné rozdělení důchodů vzniká tím, že stát bere část důchodů prostřednictvím státního rozpočtu (daně, poplatky).', truth: true, why: 'Prvotní rozdělení vzniká na trzích (mzdy, úroky, zisky, renta), druhotné prostřednictvím daní a poplatků a konečné po přičtení transferů. Učebnice terminologii mírně liší, zde se transfery řadí až ke konečnému rozdělení.' },
  { id: 'own-15', text: 'Přechod k progresivnějšímu zdanění, jehož výnos financuje transfery chudším domácnostem, posune Lorenzovu křivku čistých důchodů k přímce rovnosti.', truth: true, why: 'Bohatší domácnosti odvedou na daních větší část důchodu a chudší získají transfery, takže podíl chudších na čistých důchodech roste.' },
  { id: 'own-16', text: 'Dividenda je jediný výnos, který může akcionář získat z akcie.', truth: false, why: 'Výnosem je i kapitálový zisk, tj. růst tržní ceny akcie. Celkový výnos je dividenda plus kapitálový zisk.' },
  { id: 'own-17', text: 'Majitel dluhopisu je věřitel společnosti, nikoli její vlastník.', truth: true, why: 'Dluhopis je dlužní úpis: emitent slibuje splatit půjčku. Vlastnický podíl dává až akcie.' },
];
const stmtById = (id) => STATEMENTS.find((s) => s.id === id) ?? STATEMENTS[0];
function buildAnoNe({ id }) {
  const s = stmtById(id); const book = id.startsWith('kn-');
  return mk('ano-ne', {
    data: { id },
    task: `Je toto tvrzení pravdivé? ${s.text}`,
    answerSpec: { kind: 'truefalse', value: s.truth },
    conclusion: `${s.truth ? 'Pravda' : 'Nepravda'}. ${s.why}`,
    source: book ? sourceOf(`C-${id.slice(3)}`) : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a najdeme pojem, na kterém stojí (úroková míra, současná hodnota, Lorenzova křivka a podobně).', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// =====================================================================================
// typ 15: jak se změní rovnováha na trhu kapitálu
// =====================================================================================
const CAP_EVENTS = [
  { id: 'technologie', text: 'Nová technologie zvýšila mezní produkt kapitálu: stejné stroje teď vyrobí víc.', curve: 'D', dir: '+', why: 'Vyšší příjem z mezního produktu kapitálu znamená, že firmy jsou při každé úrokové míře ochotné investovat víc.' },
  { id: 'poptavka-vyrobku', text: 'Vzrostla poptávka po finálních výrobcích, které se vyrábějí pomocí kapitálu.', curve: 'D', dir: '+', why: 'Poptávka po kapitálu je odvozená od poptávky po produkci, k jejíž výrobě se kapitál používá, a proto roste i ona.' },
  { id: 'recese', text: 'Firmy očekávají slabý odbyt a omezují investiční plány.', curve: 'D', dir: '-', why: 'Nižší očekávaný příjem z mezního produktu kapitálu snižuje investiční poptávku při každé úrokové míře.' },
  { id: 'sporeni', text: 'Domácnosti se rozhodly víc spořit (vzrostla jejich ochota spořit při každé úrokové míře).', curve: 'S', dir: '+', why: 'Úspory tvoří nabídku na trhu kapitálu, a proto nabídka při každé úrokové míře roste.' },
  { id: 'dan-uroku', text: 'Stát zvýšil daň z úroků, takže se spoření při dané hrubé úrokové míře méně vyplácí.', curve: 'S', dir: '-', why: 'Čistý výnos ze spoření klesl, a nabídka úspor při dané úrokové míře proto klesá.' },
  { id: 'spotreba', text: 'Domácnosti zvýšily spotřebu na úkor spoření.', curve: 'S', dir: '-', why: 'Úspory jsou ta část důchodu, která se nespotřebuje, a proto při vyšší spotřebě nabídka kapitálu klesá.' },
];
const capEventById = (id) => CAP_EVENTS.find((e) => e.id === id) ?? CAP_EVENTS[0];
const CAP_SHIFT = { 'D+': { d: 12, s: 2 }, 'D-': { d: 8, s: 2 }, 'S+': { d: 10, s: 0 }, 'S-': { d: 10, s: 4 } };
const CAP_OUT = { 'D+': 'uu', 'D-': 'dd', 'S+': 'du', 'S-': 'ud' };
const CAP_OUT_TEXT = {
  uu: 'úroková míra roste, množství kapitálu roste', ud: 'úroková míra roste, množství kapitálu klesá', du: 'úroková míra klesá, množství kapitálu roste', dd: 'úroková míra klesá, množství kapitálu klesá',
};
const CAP_OUT_TEX = { uu: 'i\\uparrow,\\ K\\uparrow', ud: 'i\\uparrow,\\ K\\downarrow', du: 'i\\downarrow,\\ K\\uparrow', dd: 'i\\downarrow,\\ K\\downarrow' };
const CAP_OPTIONS = Object.entries(CAP_OUT_TEXT).map(([id, text]) => ({ id, text: text[0].toUpperCase() + text.slice(1) }));
// křivky po posunu a nová rovnováha spočtená z rovnic i = d − 0,1K a i = s + 0,1K
function capShiftGraph(ev) {
  const sh = CAP_SHIFT[`${ev.curve}${ev.dir}`];
  const K1 = (sh.d - sh.s) / 0.2; const i1 = sh.s + 0.1 * K1;
  const dem = ev.curve === 'D';
  const curves = [{ expr: dem ? `${sh.d} - 0.1*x` : `${sh.s} + 0.1*x`, label: dem ? 'D1' : 'S1', color: 'accent', dashed: true }];
  const atI = dem ? (sh.d - 6) / 0.1 : (6 - sh.s) / 0.1;
  const base = capLong({ curves, points: [{ x: 40, y: 6, label: 'E0' }, { x: K1, y: i1, label: 'E1' }], arrows: [{ from: [40, 6], to: [atI, 6], label: '' }], alt: `Posun křivky ${dem ? 'poptávky' : 'nabídky'} na trhu kapitálu` });
  base.data.curves[0].label = dem ? 'D0' : 'D';
  base.data.curves[1].label = dem ? 'S' : 'S0';
  return { viz: base, K1, i1 };
}
function buildCapPosun({ eventId }) {
  const ev = capEventById(eventId);
  const key = `${ev.curve}${ev.dir}`; const out = CAP_OUT[key];
  const { viz, K1, i1 } = capShiftGraph(ev);
  const dem = ev.curve === 'D'; const dirWord = ev.dir === '+' ? 'doprava' : 'doleva';
  return mk('trh-kapitalu-posun', {
    data: { eventId, event: ev },
    task: `Na trhu kapitálu (osa x je zásoba kapitálu, osa y reálná úroková míra) nastala změna: „${ev.text}“ Jak se změní rovnovážná úroková míra a množství kapitálu v dlouhém období (nabídka kapitálu je rostoucí, poptávka klesající)?`,
    answerSpec: { kind: 'choice', value: out, options: CAP_OPTIONS },
    conclusion: `${CAP_OUT_TEXT[out][0].toUpperCase()}${CAP_OUT_TEXT[out].slice(1)}.`,
    solution: [
      { title: 'Kterou stranu trhu změna zasáhla', text: `${ev.why} Posune se proto křivka ${dem ? 'poptávky (investice firem)' : 'nabídky (úspory domácností)'} ${dirWord}.`, board: [line(`${dem ? 'D' : 'S'}\\ ${ev.dir === '+' ? '\\rightarrow' : '\\leftarrow'}`)] },
      { title: 'Nová rovnováha', text: `Použijeme pomocný trh s poptávkou $i=10-0{,}1K$ a nabídkou $i=2+0{,}1K$. Původní rovnováha je $K=40$, $i=6$. Po posunu vychází $K=${cz(K1)}$, $i=${cz(i1)}$.`,
        board: [line('E_0:\\ K=40,\\ i=6'), line(`E_1:\\ K=${cz(K1)},\\ i=${cz(i1)}`)] },
      { title: 'Porovnání bodů E0 a E1', text: `Úroková míra ${i1 > 6 ? 'roste' : 'klesá'} a množství kapitálu ${K1 > 40 ? 'roste' : 'klesá'}. V krátkém období je zásoba kapitálu pevná (svislá nabídka), takže by se změnila jen úroková míra.`, board: [result(CAP_OUT_TEX[out])] },
      { title: 'Graf', text: 'Původní křivka je plná, nová čárkovaná. Druhá křivka zůstává na místě.', viz },
    ],
  });
}

// =====================================================================================
// typ 16: definice pojmů (zkouška)
// =====================================================================================
const DEFS = [
  { id: 'kapital', q: 'Co je kapitál ve smyslu výrobního faktoru?', right: 'Vyrobený (sekundární) výrobní faktor, který se opět používá při výrobě a přináší v budoucnu dodatečný příjem nebo užitek.', wrong: ['Peníze uložené v hotovosti, které se nikdy nepoužívají.', 'Původní (primární) výrobní faktor, který nevznikl výrobou.', 'Pouze budovy a stroje, které vlastní stát.'] },
  { id: 'investice', q: 'Co jsou investice?', right: 'Tokový údaj: změna zásoby kapitálu za období, tedy odložení spotřeby a zvýšení kapitálu.', wrong: ['Stavový údaj: celková zásoba kapitálu v daném okamžiku.', 'Platba za použití kapitálu v podobě peněz.', 'Pokles hodnoty kapitálu při jeho používání.'] },
  { id: 'hrube-investice', q: 'Jaký vztah platí mezi hrubými, čistými a obnovovacími investicemi?', right: 'Hrubé investice se rovnají čistým investicím plus obnovovacím investicím.', wrong: ['Čisté investice se rovnají hrubým investicím plus amortizaci.', 'Obnovovací investice se rovnají čistým investicím plus hrubým.', 'Hrubé investice jsou vždy nižší než čisté.'] },
  { id: 'urok', q: 'Co je úrok a co úroková míra?', right: 'Úrok je výnos z uspořené částky v absolutní výši, úroková míra je poměr úroku za období (zpravidla rok) k uspořené částce.', wrong: ['Úrok je poměr výnosu k částce, úroková míra je výnos v Kč.', 'Úrok je nájemné za použití strojů, úroková míra je míra inflace.', 'Úrok je část důchodu, kterou domácnost spotřebuje.'] },
  { id: 'realna-mira', q: 'Co je reálná úroková míra?', right: 'Úroková míra očištěná od inflace; přibližně nominální míra minus míra inflace.', wrong: ['Úroková míra skutečně uvedená ve smlouvě o vkladu.', 'Nominální míra plus míra inflace.', 'Úroková míra před zdaněním výnosu.'] },
  { id: 'zlate-pravidlo', q: 'Jaká je podmínka rovnováhy firmy na trhu kapitálu (zlaté pravidlo)?', right: 'Příjem z mezního produktu kapitálu se rovná mezním nákladům na kapitál ($MRP_K=MFC_K$), v dokonalé konkurenci úroku.', wrong: ['Průměrný produkt kapitálu se rovná mzdě.', 'Mezní náklady na kapitál se rovnají celkovému příjmu firmy.', 'Příjem z mezního produktu kapitálu je nulový.'] },
  { id: 'rovnovazna-miera', q: 'Co je rovnovážná úroková míra?', right: 'Míra, při které se nabídka kapitálu (úspory) rovná poptávce po kapitálu (investicím).', wrong: ['Míra, kterou stanoví stát, aby byly úspory vyšší než investice.', 'Nejvyšší úroková míra, kterou banky nabízejí.', 'Míra rovná míře inflace.'] },
  { id: 'soucasna-hodnota', q: 'Co je současná hodnota budoucí platby?', right: 'Částka, která by uložená dnes při dané úrokové míře narostla právě na budoucí platbu; platba se dělí $(1+r)^n$.', wrong: ['Budoucí platba vynásobená $(1+r)^n$.', 'Součet všech budoucích plateb bez diskontování.', 'Cena, za kterou byl kapitálový statek pořízen v minulosti.'] },
  { id: 'npv', q: 'Co je čistá současná hodnota (NPV) investice a kdy se investice vyplatí?', right: 'Součet diskontovaných výnosů minus počáteční výdaj; investice se vyplatí, je-li NPV kladná.', wrong: ['Součet nediskontovaných výnosů; investice se vyplatí, je-li větší než výdaj.', 'Úroková míra, při které je NPV nulová; investice se vyplatí, je-li NPV záporná.', 'Rozdíl mezi nominální a reálnou úrokovou mírou.'] },
  { id: 'irr', q: 'Co je vnitřní výnosové procento (IRR)?', right: 'Úroková míra, při které je čistá současná hodnota projektu rovna nule.', wrong: ['Úroková míra, kterou stanoví centrální banka.', 'Poměr nominálních výnosů k výdaji.', 'Míra inflace očekávaná během trvání projektu.'] },
  { id: 'lorenz', q: 'Co zachycuje Lorenzova křivka?', right: 'Kumulativní podíl na celkovém důchodu (osa y) připadající na kumulativní podíl domácností seřazených od nejchudších (osa x).', wrong: ['Závislost mezi inflací a nezaměstnaností.', 'Závislost poptávaného množství na ceně.', 'Rozdělení majetku mezi firmy v odvětví.'] },
  { id: 'gini', q: 'Jak se vypočte Giniho koeficient a co vyjadřuje?', right: 'G = (A − B)/A, kde A je plocha pod přímkou rovnosti a B pod Lorenzovou křivkou; 0 je úplná rovnost, vyšší hodnota větší nerovnost.', wrong: ['G = B/A; vyšší hodnota znamená větší rovnost.', 'Je to podíl nejbohatších 10 % domácností na celkovém důchodu.', 'Je to míra inflace očištěná o růst důchodů.'] },
  { id: 'rozdeleni', q: 'Co je druhotné rozdělení důchodů?', right: 'Přerozdělení důchodů prostřednictvím státního rozpočtu (daně, poplatky).', wrong: ['Rozdělení mezd, úroků, zisků a renty na trzích výrobních faktorů.', 'Zvýšení důchodů domácnosti o transferové platby.', 'Rozdělení majetku dědictvím.'] },
  { id: 'dluhopis', q: 'Co je dluhopis a kdo je jeho majitel?', right: 'Dlužní úpis, písemný slib splacení půjčky; majitel dluhopisu je věřitel emitenta.', wrong: ['Vlastnický podíl na společnosti; majitel je spoluvlastník.', 'Podíl na zisku vyplácený na každou akcii.', 'Platba za použití strojů; majitel je nájemce.'] },
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
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti obracejí vztah nebo zaměňují pojmy. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// =====================================================================================
// typy 17 a 18: grafy na tabuli (zkouška)
// =====================================================================================
const CAPG = {
  dlouhe: { title: 'Trh kapitálu v dlouhém období', task: 'Nakreslete do grafu s osami K (zásoba kapitálu) a i (reálná úroková míra) křivku poptávky po kapitálu a dlouhodobou křivku nabídky kapitálu. Vyznačte rovnováhu E a k ní rovnovážnou úrokovou míru iE a množství kapitálu KE.' },
  kratke: { title: 'Trh kapitálu v krátkém období', task: 'Nakreslete do grafu s osami K (zásoba kapitálu) a i (reálná úroková míra) poptávku po kapitálu a krátkodobou nabídku kapitálu (zásoba je pevná). Vyznačte rovnováhu E, rovnovážnou úrokovou míru iE a zásobu KE.' },
  posun: { title: 'Růst poptávky po kapitálu', task: 'Nakreslete do grafu s osami K a i trh kapitálu v dlouhém období (D a S) a zakreslete, jak se změní rovnováha, když vzroste poptávka po kapitálu (například kvůli lepší technologii). Vyznačte původní a novou rovnováhu.' },
};
function buildGrafKapital({ kind }) {
  const g = CAPG[kind];
  const sh = capShiftGraph({ curve: 'D', dir: '+' });
  const full = kind === 'kratke' ? capShort() : kind === 'dlouhe' ? capLong() : sh.viz;
  const first = kind === 'kratke' ? capShort({ points: [] }) : capLong({ points: [] });
  return mk('graf-trh-kapitalu', {
    part: 'zkouska', points: 2,
    data: { kind },
    task: g.task,
    answerSpec: { kind: 'whiteboard', reference: { kind: 'econ', data: full.data } },
    conclusion: kind === 'kratke' ? 'Krátkodobá nabídka je svislá, poptávka klesá. Úroková míra v průsečíku vyrovnává úspory s investicemi.' : kind === 'dlouhe' ? 'Poptávka klesá, dlouhodobá nabídka roste. V průsečíku E je rovnovážná úroková míra iE a zásoba kapitálu KE.' : 'Růst poptávky posune křivku D doprava: rovnovážná úroková míra i množství kapitálu vzrostou.',
    solution: kind === 'posun' ? [
      { title: 'Výchozí trh', text: 'Nakreslíme klesající poptávku D a rostoucí nabídku S. V průsečíku je rovnováha E0.', viz: capLong() },
      { title: 'Posun poptávky', text: 'Růst poptávky po kapitálu posune celou křivku D doprava (při každé úrokové míře firmy investují víc). Nová křivka D1 se kreslí čárkovaně.', board: [line('D_0\\ \\to\\ D_1\\ (\\rightarrow)')] },
      { title: 'Nová rovnováha', text: 'Nabídka zůstává, rovnováha se přesune po křivce S nahoru a doprava do E1. Úroková míra i zásoba kapitálu vzrostly.', viz: sh.viz },
    ] : [
      { title: 'Osy a poptávka', text: 'Na vodorovnou osu zakreslíme zásobu kapitálu K, na svislou reálnou úrokovou míru i. Poptávka po kapitálu klesá: při nižší úrokové míře se vyplatí víc investic.', viz: capViz({ curves: [{ expr: D0, label: 'D', color: 'blue' }], alt: 'Klesající poptávka po kapitálu' }) },
      { title: kind === 'kratke' ? 'Svislá nabídka' : 'Rostoucí nabídka', text: kind === 'kratke' ? 'V krátkém období je zásoba kapitálu (úspory) dána, a nabídka je proto svislá přímka v zásobě $K_E$.' : 'V dlouhém období roste nabídka s úrokovou mírou, protože vyšší úrok láká k většímu spoření.', viz: first },
      { title: 'Rovnováha', text: 'V průsečíku je rovnováha E. Z ní vedeme čárkované čáry na osy: rovnovážná úroková míra iE a zásoba kapitálu KE. Nad iE je přebytek úspor a úrok klesá, pod iE je nedostatek úspor a úrok roste.', viz: full },
    ],
  });
}

function buildGrafLorenz({ shares }) {
  const sorted = sortAsc(shares); const { B } = giniRows(sorted); const G = rd(1 - 2 * B, 3);
  const base = lorenzViz([{ shares: sorted, label: 'L' }], { areas: false });
  const full = lorenzViz([{ shares: sorted, label: 'L' }], { areas: true });
  return mk('graf-lorenz', {
    part: 'zkouska', points: 2,
    data: { shares },
    task: 'Podíly pěti stejně velkých skupin domácností (od nejchudší po nejbohatší) na celkovém důchodu udává tabulka. Nakreslete do grafu přímku rovnosti a Lorenzovu křivku a vyznačte plochu, ze které se počítá Giniho koeficient.',
    promptTex: sharesTex(sorted),
    answerSpec: { kind: 'whiteboard', reference: full },
    conclusion: `Lorenzova křivka leží pod přímkou rovnosti. Plocha mezi nimi je A − B a Giniho koeficient vychází ${czText(G)}.`,
    solution: [
      { title: 'Osy a přímka rovnosti', text: 'Obě osy jdou od 0 do 100 %. Na ose x je kumulativní podíl domácností od nejchudších, na ose y kumulativní podíl důchodů. Přímka rovnosti vede z bodu (0; 0) do (100; 100): ukazuje, že každá skupina má podíl odpovídající počtu domácností.', viz: lorenzViz([], { alt: 'Osy a přímka rovnosti' }) },
      { title: 'Body Lorenzovy křivky', text: `Kumulujeme podíly: ${cumul(sorted).map((v, k) => `${czText(20 * (k + 1))} % domácností má ${czText(v)} % důchodů`).join('; ')}. Body spojíme úsečkami.`, board: [line(`L=${cumul(sorted).map(cz).join(',\\ ')}`)], viz: base },
      { title: 'Plocha pro Giniho koeficient', text: 'Plocha mezi přímkou rovnosti a Lorenzovou křivkou je $A-B$ (A je plocha pod přímkou, B plocha pod křivkou). Čím je větší, tím je nerovnost větší.', viz: full },
      { title: 'Giniho koeficient', text: `Podíl plochy mezi přímkou a křivkou a plochy pod přímkou udává Giniho koeficient: ${czText(G)}.`, board: [result(`G=\\frac{A-B}{A}=${cz(G)}`)] },
    ],
  });
}

// =====================================================================================
// seznam typů
// =====================================================================================
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('soucasna-hodnota', 'Současná hodnota (diskontování)', genSoucasna, buildSoucasna),
  type('urok-slozeny', 'Složené úročení vkladu', genUrok, buildUrok),
  type('realna-urok', 'Nominální a reálná úroková míra', genRealna, buildRealna),
  type('miera-vynosu', 'Míra výnosu z kapitálu a úvěr', genMiera, buildMiera),
  type('cena-aktiva', 'Cena aktiva z kapitalizovaného výnosu', genCena, buildCena),
  type('npv-projekt', 'Čistá současná hodnota investice (NPV)', genNpv, buildNpv),
  type('vnitrni-vynos', 'Vnitřní výnosové procento (IRR)', genIrr, buildIrr),
  type('rozhodnuti-investice', 'Rozhodnutí o investici', genRozhodnuti, buildRozhodnuti),
  type('porovnani-projektu', 'Porovnání dvou investičních projektů', genPorovnani, buildPorovnani),
  type('lorenz-tabulka', 'Lorenzova křivka z tabulky skupin', genLorenzTab, buildLorenzTab),
  type('gini-z-dat', 'Giniho koeficient z dat', genGini, buildGini),
  type('gini-porovnani', 'Porovnání nerovnosti dvou zemí', genGiniPorov, buildGiniPorov),
  type('prerozdeleni-davky', 'Přerozdělení daní a transferů', genPrerozdeleni, buildPrerozdeleni),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('trh-kapitalu-posun', 'Jak se změní rovnováha na trhu kapitálu?', (rng) => buildCapPosun({ eventId: pick(rng, ids(CAP_EVENTS)) }), buildCapPosun),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-trh-kapitalu', 'Nakresli trh kapitálu (zkouška)', (rng) => buildGrafKapital({ kind: pick(rng, ['dlouhe', 'kratke', 'posun']) }), buildGrafKapital),
  type('graf-lorenz', 'Nakresli Lorenzovu křivku (zkouška)', (rng) => buildGrafLorenz({ shares: genShares(rng) }), buildGrafLorenz),
];

// =====================================================================================
// výklad
// =====================================================================================
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'K', y: 'i (%)' }, domain: [0, 100], range: [0, 12], curves, ...extra } });
const pvGraph = () => ({ kind: 'econ', data: { axes: { x: 'roky n', y: 'PV z 1 000 Kč' }, domain: [0, 20], range: [0, 1000], curves: [{ expr: '1000/1.05^x', label: '5 %', color: 'blue' }, { expr: '1000/1.1^x', label: '10 %', color: 'green' }], points: [], arrows: [], areas: [], alt: 'Současná hodnota 1 000 Kč při úrokové míře 5 % a 10 % v závislosti na počtu let' } });

const theory = [
  { heading: 'Kapitál a jeho podoby', term: 'Kapitál',
    text: 'Kapitál je vyrobený (sekundární) výrobní faktor: vzniká ve výrobě jako výsledek práce a přírodních zdrojů a pak se zase používá jako vstup do další výroby. Je vzácný, a proto má cenu.\n\nPodoby kapitálu:\n\n• hmotný kapitál: kapitálové statky (reálná aktiva) jako budovy, stroje a zařízení, jejichž vlastníkem může být domácnost, firma i stát,\n• finanční kapitál: peníze a jiná finanční aktiva (cenné papíry), za které se kapitálové statky pořizují,\n• nehmotný kapitál: licence, patenty, know-how,\n• lidský kapitál: znalosti a dovednosti pracovníků.\n\nSpolečný znak všech podob: ten, kdo na jejich získání vynaložil zdroje, z nich v budoucnu získá dodatečný příjem nebo užitek.',
    mistakes: ['Kapitál není totéž co peníze. Peníze jsou jen jedna z podob (finanční kapitál), skutečným výrobním faktorem jsou hlavně kapitálové statky.', 'Kapitál je sekundární faktor, protože vzniká výrobou. Primární faktory jsou práce a půda.'] },
  { heading: 'Kapitál a investice: stav a tok', term: 'Investice',
    text: 'Kapitál je stavová veličina: říká, kolik kapitálu je v určitém okamžiku. Investice je toková veličina: změna zásoby kapitálu za určité období. Investovat znamená odložit dnešní spotřebu, aby bylo v budoucnu víc.\n\nZdrojem investic jsou úspory, tedy ta část disponibilního důchodu, která se nespotřebuje. Úspory se přes banky a jiné finanční zprostředkovatele dostávají k firmám a ty za ně kupují kapitálové statky.\n\nCelkový nový kapitál za období jsou hrubé investice. Část z nich jen nahrazuje opotřebený kapitál (amortizaci), to jsou obnovovací investice. Zbytek zvyšuje zásobu kapitálu, to jsou čisté investice:',
    tex: 'I_B=I_N+I_R',
    mistakes: ['Nezaměňujte stav a tok: kapitál je zásoba, investice je její přírůstek za období.', 'Čisté investice jsou hrubé investice minus amortizace. Při nulových čistých investicích se zásoba kapitálu nemění, i když se investuje.'] },
  { heading: 'Úrok a úroková míra', term: 'Úroková míra',
    text: 'Domácnosti spoří, protože za odložení spotřeby chtějí odměnu. Odměna v korunách je úrok (výnos z uspořené částky v absolutní výši, cena za použití peněz). Úroková míra je poměr úroku za určité období (zpravidla rok) k uspořené částce:',
    tex: 'i=\\frac{S_1-S_0}{S_0}',
    mistakes: ['Za použití peněz (finančního kapitálu) se platí úrok. Za použití kapitálových statků, například stroje, se platí nájemné.', 'Úroková míra se do vzorců dosazuje jako desetinné číslo: 5 % je 0,05.'] },
  { heading: 'Nominální a reálná úroková míra', term: 'Reálná úroková míra',
    text: 'Nominální úroková míra je ta, která je skutečně placená a uvedená ve smlouvě. Zahrnuje i vliv růstu cen. Reálná úroková míra je očištěná od inflace a říká, o kolik skutečně vzroste kupní síla úspor.\n\nPřibližně platí (skripta):\n\n$i_{nom}\\approx i_{real}+\\pi$, tedy $i_{real}\\approx i_{nom}-\\pi$.\n\nPřesný vztah vychází z toho, že úspory vzrostou $1+i$ krát a ceny $1+\\pi$ krát:',
    tex: '1+r=\\frac{1+i}{1+\\pi},\\qquad r=\\frac{i-\\pi}{1+\\pi}',
    mistakes: ['Reálná míra není vždy nižší než nominální: při záporné inflaci (deflaci) je vyšší.', 'Je-li reálná míra záporná, vkladatel přichází o kupní sílu, i když na účtu přibývá korun.', 'Podle prezentace se nejdřív úrok zdaní, a až potom očistí od inflace: $i_c=i_h(1-t)$, $r=(i_c-\\pi)/(1+\\pi)$.'] },
  { heading: 'Nabídka a poptávka na trhu kapitálu', term: 'Poptávka na trhu kapitálu',
    text: 'Jde o zjednodušený model: na vodorovné ose je zásoba kapitálu $K$ (stav), a proto poptávka znamená poptávku po kapitálu (po službách kapitálu) a nabídka je nabídka kapitálu, tedy zásoba, kterou domácnosti (a další subjekty) ochotně financují svým spořením. Nabídka závisí na reálné úrokové míře. V krátkém období je zásoba kapitálu daná, a nabídka je proto svislá (dokonale neelastická). V dlouhém období platí, že vyšší úrok vede k větším úsporám, a křivka nabídky je rostoucí. Tento předpoklad je obecným pravidlem, i když u jednotlivých lidí může růst úroku působit i opačně: stejného cíle lze dosáhnout menším spořením (důchodový efekt).\n\nPoptávku po kapitálu tvoří firmy, které kapitál využívají a pořizují ho investicemi. Je odvozená od poptávky po produkci, k jejíž výrobě se kapitál používá. Firma investuje, dokud příjem z mezního produktu kapitálu pokrývá mezní náklady na kapitál, v dokonalé konkurenci tedy úrok (zlaté pravidlo):',
    tex: 'MRP_K=MFC_K=i',
    viz: view([{ expr: D0, label: 'D', color: 'blue' }, { expr: S0, label: 'S', color: 'chalk' }], { points: [{ x: 40, y: 6, label: 'E', guides: true }] }),
    mistakes: ['Poptávka po kapitálu klesá, protože mezní produkt kapitálu klesá: pro další kapitál se vyplatí jen nižší úrok.', 'Úroková míra na svislé ose je reálná, nikoli nominální.'] },
  { heading: 'Rovnováha na trhu kapitálu', term: 'Rovnovážná úroková míra',
    text: 'Rovnováha na trhu kapitálu je v průsečíku poptávky po kapitálu a nabídky kapitálu (jde o zjednodušený model, v němž se zásoba kapitálu vyrovnává s ochotou ji financovat). Rovnovážná úroková míra $i_E$ vyrovnává úspory s investicemi. Úroková míra tu hraje roli ceny zapůjčeného kapitálu (peněz); cenou služeb reálného kapitálu, například stroje, je nájemné.\n\nNad $i_E$ je přebytek úspor (domácnosti nabízejí víc, než firmy chtějí investovat), a úroková míra proto klesá. Pod $i_E$ je nedostatek úspor, a úroková míra proto roste.\n\nV krátkém období je nabídka svislá, takže posun poptávky změní jen úrokovou míru. V dlouhém období se mění úroková míra i množství kapitálu. Růst poptávky zvyšuje úrok i kapitál, růst nabídky úrok snižuje a kapitál zvyšuje.',
    viz: view([{ expr: D0, label: 'D', color: 'blue' }, SHORT_S, { expr: '12 - 0.1*x', label: 'D1', color: 'accent', dashed: true }], { points: [{ x: 40, y: 6, label: 'E0' }, { x: 40, y: 8, label: 'E1' }] }),
    mistakes: ['V krátkém období se kapitál při změně poptávky nezvětší, zásoba je pevná. Mění se jen úroková míra.', 'Přebytek úspor znamená, že úroková míra je nad rovnováhou (ne pod ní).'] },
  { heading: 'Současná hodnota: diskontování', term: 'Současná hodnota',
    text: 'Dnešní koruna je víc než koruna za rok, protože ji lze uložit a vydělat na ní úrok. Naopak budoucí platbu musíme pro srovnání přepočítat na dnešek, tedy diskontovat. Úroková míra $r$ je přitom výnos nejlepší alternativy.\n\nBudoucí hodnota částky $PV$ po $n$ letech při složeném úročení je $FV=PV(1+r)^n$. Obrácením dostaneme současnou hodnotu platby splatné na konci $n$-tého roku:',
    tex: 'PV=\\frac{FV}{(1+r)^n},\\qquad PV=\\sum_{t=1}^{n}\\frac{c_t}{(1+r)^t}',
    viz: pvGraph(),
    mistakes: ['S rostoucí úrokovou mírou současná hodnota klesá, budoucí hodnota roste.', 'Vzorec předpokládá platby na konci období a stálou úrokovou míru.', 'Nesčítejte nediskontované platby z různých let: patří do různých okamžiků.'] },
  { heading: 'Čistá současná hodnota (NPV)', term: 'Čistá současná hodnota',
    text: 'Investice je výdaj dnes výměnou za výnosy v budoucnu. Čistá současná hodnota (NPV) je součet současných hodnot všech výnosů minus počáteční výdaj. Měří, o kolik dnešních korun projekt vydělá víc než půjčení stejných peněz za tržní úrokovou míru. Rozhodovací pravidlo: samostatný projekt s $NPV>0$ se vyplatí, projekt s $NPV<0$ ne.',
    tex: 'NPV=-I_0+\\sum_{t=1}^{n}\\frac{c_t}{(1+r)^t}',
    mistakes: ['Samostatný projekt se vyplatí při $NPV>0$ (diskontní sazbou je tržní úroková míra). Při výběru jednoho z více projektů, které se vylučují, se bere ten s nejvyšší NPV.', 'Výdaj v čase 0 se nediskontuje.', 'Součet nominálních výnosů větší než výdaj ještě neznamená, že se investice vyplatí.'] },
  { heading: 'Vnitřní výnosové procento (IRR)', term: 'Vnitřní výnosové procento',
    text: 'Vnitřní výnosové procento $r^*$ je úroková míra, při které je čistá současná hodnota projektu nulová:\n\n$NPV(r^*)=0$.\n\nU projektu s výdajem dnes a pozdějšími výnosy se investice vyplatí, je-li $r^*$ vyšší než tržní úroková míra. U jediné platby $N$ za $n$ let je $r^*=\\sqrt[n]{N/I_0}-1$.\n\nIRR a NPV spolu obvykle souhlasí. U projektů, které se vylučují a liší se rozsahem nebo časováním výnosů, mohou dát různé pořadí, a rozhoduje potom NPV. Projekt, u kterého se střídá více příjmů a výdajů, může mít i více vnitřních výnosových procent.',
    mistakes: ['IRR není $(\\text{součet výnosů}-I_0)/I_0$, taková míra nebere v úvahu dobu, kdy výnosy přijdou.', 'IRR se porovnává s tržní úrokovou mírou (cenou peněz), nikoli s inflací.'] },
  { heading: 'Cena aktiva a míra výnosu', term: 'Kapitalizace',
    text: 'Míra výnosu z kapitálového aktiva je poměr čistého ročního výnosu (výnosy minus provozní náklady) k pořizovací ceně. Úvěr na koupi aktiva se vyplatí, jen když je míra výnosu vyšší než úroková sazba úvěru.\n\nKapitalizace: aktivum, které přináší trvale stejný čistý roční výnos $Y$, má při úrokové míře $i$ cenu, za kterou by stejný výnos přinesl bankovní vklad:',
    tex: 'P=\\frac{Y}{i}',
    mistakes: ['Vzorec platí pro trvalý stejný výnos. U aktiva s konečnou životností nebo s měnícím se výnosem je cenou součet diskontovaných výnosů.', 'Pořizovací cena z minulosti na dnešní cenu aktiva nic nemění. Do vzorce se dosazuje čistý výnos, tedy po odečtení nákladů.'] },
  { heading: 'Finanční trhy: akcie a dluhopisy', term: 'Dluhopis',
    text: 'Na trhu cenných papírů se obchoduje s akciemi a dluhopisy. Akcie je vlastnický podíl na společnosti. Výnosem je dividenda (část zisku vyplácená na akcii) a kapitálový zisk (růst tržní ceny akcie):\n\ncelkový výnos = dividenda + kapitálový zisk.\n\nDluhopis je dlužní úpis, slib splacení půjčky. Majitel je věřitel emitenta, nikoli vlastník. Dluhopisy vydávají firmy, obce, vláda. Při růstu tržních úrokových měr se současná hodnota budoucích plateb snižuje, a ceny dluhopisů proto klesají.\n\nFinanční zprostředkovatelé (banky a další instituce) snižují náklady na hledání informací i na přesun peněz od střadatelů k těm, kdo je využijí k investicím. Ceny akcií se pohybují podle očekávání, nových informací a šoků.',
    mistakes: ['Celkový výnos z akcie není jen dividenda. Zahrnuje i kapitálový zisk.', 'Majitel dluhopisu je věřitel, majitel akcie spoluvlastník.'] },
  { heading: 'Důchod, bohatství a zdroje nerovnosti', term: 'Důchod',
    text: 'Důchod je množství peněz, které člověk nebo domácnost získá za určité období (tok). Bohatství je čistá hodnota majetku k určitému okamžiku (stav).\n\nSložky důchodu: pracovní důchody (mzda), důchody z vlastnictví půdy a kapitálu (renta, úrok, dividenda) a transferové platby od státu.\n\nNerovnost v pracovních důchodech vzniká z rozdílů v množství prodané práce a ve mzdových sazbách (schopnosti, vzdělání, povolání, diskriminace). Nerovnost ve vlastnických důchodech vychází z rozdílného majetku, který domácnosti získaly dědictvím a dary, spořením nebo podnikáním.',
    mistakes: ['Nezaměňujte důchod (tok za období) a bohatství (zásoba k okamžiku). Nerovnost bohatství bývá větší než nerovnost důchodů.'] },
  { heading: 'Lorenzova křivka', term: 'Lorenzova křivka',
    text: 'Lorenzova křivka ukazuje rozdělení důchodů v ekonomice. Domácnosti seřadíme od nejchudších k nejbohatším. Na vodorovné ose je kumulativní podíl domácností, na svislé kumulativní podíl na celkovém důchodu. Např. bod (40; 15) říká, že nejchudších 40 % domácností má 15 % všech důchodů.\n\nPřímka rovnosti (ideální Lorenzova křivka) odpovídá případu, kdy má každá skupina podíl na důchodu stejný jako podíl na počtu domácností. Skutečná křivka leží pod ní a je konvexní. Čím je od přímky vzdálenější, tím je nerovnost větší.\n\nBody křivky počítáme kumulací podílů skupin seřazených vzestupně. Poslední bod je vždy (100; 100).',
    viz: lorenzTheoryViz(),
    mistakes: ['Skupiny se musí řadit od nejchudších. Při jiném pořadí vyjde špatná křivka.', 'Lorenzova křivka nikdy neleží nad přímkou rovnosti.', 'Pokud se dvě Lorenzovy křivky protínají, nelze jednoznačně říct, která z nich odpovídá větší nerovnosti. Pak se porovnává Giniho koeficient.'] },
  { heading: 'Giniho koeficient', term: 'Giniho koeficient',
    text: 'Giniho koeficient poměřuje skutečnou Lorenzovu křivku s přímkou rovnosti. Podle prezentace označíme A plochu pod přímkou rovnosti a B plochu pod skutečnou Lorenzovou křivkou. Rozdíl A − B je plocha mezi nimi. Koeficient je nula při úplné rovnosti (křivka splývá s přímkou) a roste s nerovností směrem k jedné (jedna domácnost má celý důchod):',
    tex: 'G=\\frac{A-B}{A}',
    viz: lorenzTheoryViz(),
    mistakes: ['Osy v podílech: $A=0{,}5$, a proto $G=1-2B$. Při osách v procentech je $A=5\\,000$.', 'Hodnoty jsou od 0 (úplná rovnost) po 1 (jedna domácnost má vše). Čím vyšší G, tím větší nerovnost. Ve skutečných datech nedosahuje hodnoty 1.', 'Někdy se označení ploch používá obráceně (A mezi přímkou a křivkou, B pod křivkou), pak je $G=A/(A+B)$. Jde o totéž.', 'Giniho koeficient nezávisí na úrovni důchodů, jen na jejich rozdělení: při zdvojnásobení všech důchodů se nezmění. Výpočet z důchodů po skupinách dává spíše dolní odhad.'] },
  { heading: 'Přerozdělování důchodů: daně a transfery', term: 'Přerozdělování důchodů',
    text: 'Rozdělení důchodů se děje ve třech krocích (učebnice terminologii mírně liší, zde se drží členění cvičebnice):\n\n• prvotní rozdělení: trhy výrobních faktorů rozdělí mzdy, úroky, zisky a rentu mezi domácnosti,\n• druhotné rozdělení: stát bere část důchodů prostřednictvím státního rozpočtu (daně, poplatky),\n• konečné rozdělení: důchody domácností se zvýší o transferové platby.\n\nDaň je progresivní, když průměrná sazba roste s důchodem, proporcionální při stejné sazbě a regresivní, když s důchodem klesá. Přerozdělení, které bere víc bohatším a dává víc chudším, přibližuje Lorenzovu křivku k přímce rovnosti a snižuje Giniho koeficient.\n\nPříklad: proporcionální daň se sazbou $t$ a výnos rozdělený rovným dílem každému. Čistý důchod je $y(1-t)+t\\bar y$, tedy rozdíly mezi důchody se zmenší na $(1-t)$ násobek a Giniho koeficient je $G_{\\text{po}}=(1-t)G_{\\text{před}}$.',
    mistakes: ['Samotná proporcionální daň relativní rozdělení nezmění. Nerovnost snižuje až spolu s transfery, které jsou pro všechny stejné.', 'Přerozdělování má cenu: může oslabovat motivaci pracovat a investovat. Jak velká nerovnost je spravedlivá, není otázka čisté ekonomie, jde o hodnotový soud.'] },
];

export default {
  id: 'kapital', title: 'Trh kapitálu a přerozdělování důchodů', order: 9, theory, types,
};
