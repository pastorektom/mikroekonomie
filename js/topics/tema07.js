// Téma 7: Trhy výrobních faktorů (podle skript kap. 8, prezentace 7 a cvičebnice kap. 8).
// Struktura a konvence jako u tema02.js: theory + types, generate(rng) vrací příklad, solve(data) ho staví z dat.
// Zdroje a úpravy proti knize (viz také testy): úkol ano/ne 8h je v knize chybně „ano“, příklad 9 má nekonzistentní
// cenu produktu a rostoucí MP, takže se v generátorech nepřebírá.
import {
  int, pick, shuffle, cz, czText, line, result, coef,
} from './lib.js';

const TOPIC = 'faktory';
const mk = (type, over) => ({
  id: type, topic: TOPIC, type, seed: 0, part: 'zapocet', points: 1, ...over,
});

// ---------- drobné pomůcky ----------
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const lit = (x) => String(r6(x)); // číslo do výrazu pro graf
const cell = (x) => String(r6(x)); // číslo do tabulky odpovědí
const listTex = (arr) => arr.map(cz).join(',\\ ');
const arrayTex = (header, rows) => `\\begin{array}{c|${'c'.repeat(header.length - 1)}}${header.join('&')}\\\\\\hline ${rows.map((r) => r.join('&')).join('\\\\')}\\end{array}`;
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
const nice = (v) => {
  const p = 10 ** Math.floor(Math.log10(v));
  return NICE_STEPS.find((f) => f * p >= v - 1e-9) * p;
};
const quadTex = (a, b) => `${cz(a)}A-${b === 1 ? '' : cz(b)}A^{2}`;

// ---------- grafy (osa x = množství faktoru A, osa y = Kč) ----------
function gviz({ domain, range, curves, points = [], arrows = [], areas = [], alt, axes = { x: 'A', y: 'Kč' } }) {
  return { kind: 'econ', data: { axes, domain, range, curves, points, arrows, areas, alt } };
}
const mrpExpr = (a, b, P) => `${lit(P * a)} - ${lit(2 * b * P)}*x`;
// Svislá křivka (pevná nabídka půdy): velmi strmá přímka na úzkém oboru.
const vertical = (T, label, color = 'chalk') => ({ expr: `100000*(x - ${lit(T)})`, domain: [T - 0.01, T + 0.01], label, color });

// Optimum firmy z produkční funkce Q = aA − bA²: stage 0 jen MRP, 1 + cena faktoru, 2 + bod optima, 3 + plocha přínosu.
function optViz({ a, b, P, w }, stage = 3) {
  const A = (a * P - w) / (2 * b * P);
  const curves = [{ expr: mrpExpr(a, b, P), label: 'MRP', color: 'blue' }];
  if (stage >= 1) curves.push({ expr: lit(w), label: 'MFC = w', color: 'chalk' });
  return gviz({
    domain: [0, nice(a / (2 * b))], range: [0, nice(P * a)], curves,
    points: stage >= 2 ? [{ x: A, y: w, label: 'E', guides: true }] : [],
    areas: stage >= 3 ? [{ between: [mrpExpr(a, b, P), lit(w)], from: 0, to: A, label: 'přínos', color: 'green' }] : [],
    alt: 'Optimum firmy na trhu faktoru: MRP protíná MFC rovnou ceně faktoru',
  });
}

// Monopsonie: MRP = m − nA, nabídka w = c + dA, MFC = c + 2dA. stage 0 MRP a S, 1 + MFC, 2 + optimum, 3 + srovnání s konkurencí.
function monoParams({ n, d, k, c }) {
  const Am = k * (n + d); const Ac = k * (n + 2 * d);
  const m = c + k * (n + d) * (n + 2 * d);
  return { m, Am, Ac, wm: c + d * Am, wc: c + d * Ac, mrpAm: m - n * Am };
}
function monoViz({ n, d, k, c }, stage = 3) {
  const q = monoParams({ n, d, k, c });
  const curves = [{ expr: `${lit(q.m)} - ${lit(n)}*x`, label: 'MRP', color: 'blue' }, { expr: `${lit(c)} + ${lit(d)}*x`, label: 'S', color: 'chalk' }];
  if (stage >= 1) curves.push({ expr: `${lit(c)} + ${lit(2 * d)}*x`, label: 'MFC', color: 'accent' });
  const points = [];
  if (stage >= 2) points.push({ x: q.Am, y: q.mrpAm, label: 'M', guides: true }, { x: q.Am, y: q.wm, label: 'W', guides: true });
  if (stage >= 3) points.push({ x: q.Ac, y: q.wc, label: 'C', guides: true });
  return gviz({
    domain: [0, nice(q.m / n)], range: [0, nice(q.m)], curves, points,
    alt: 'Monopsonie: MRP protíná MFC v bodě M, mzda se čte z nabídky v bodě W, bod C je dokonalá konkurence',
  });
}

// Trh půdy: poptávka R = a − bT, pevná nabídka T. stage 0 křivky, 1 + rovnováha, 2 + nová poptávka a rovnováha.
function landViz({ a, b, T, a2 }, stage = 1) {
  const R = a - b * T;
  const curves = [{ expr: `${lit(a)} - ${lit(b)}*x`, label: 'D', color: 'blue' }, vertical(T, 'S')];
  const points = [];
  if (stage >= 1) points.push({ x: T, y: R, label: 'E', guides: true });
  if (stage >= 2 && a2) {
    curves.push({ expr: `${lit(a2)} - ${lit(b)}*x`, label: 'D1', color: 'accent', dashed: true });
    points.push({ x: T, y: a2 - b * T, label: 'E1', guides: true });
  }
  const top = Math.max(a, a2 || 0);
  return gviz({
    axes: { x: 'T', y: 'R' }, domain: [0, nice(Math.max(a / b, T * 1.3))], range: [0, nice(top)], curves, points,
    alt: 'Trh půdy: klesající poptávka a svislá nabídka určují rentu',
  });
}

// Posun poptávky firmy po faktoru: základní MRP0 = 60 − 10A, cena faktoru 20 (E0: A = 4), vyšší MRP1 = 100 − 10A, nižší 40 − 10A.
const SHIFT = { '+': { mrp: '100 - 10*x', A: 8, label: 'MRP1' }, '-': { mrp: '40 - 10*x', A: 2, label: 'MRP1' } };
function shiftFactorViz(dir) {
  if (dir === '0') {
    return gviz({
      domain: [0, 10], range: [0, 100],
      curves: [{ expr: '60 - 10*x', label: 'MRP', color: 'blue' }, { expr: '30', label: 'w0', color: 'chalk' }, { expr: '20', label: 'w1', color: 'green', dashed: true }],
      points: [{ x: 3, y: 30, label: 'E0' }, { x: 4, y: 20, label: 'E1' }],
      arrows: [{ from: [3, 30], to: [4, 20], label: '' }],
      alt: 'Pokles ceny faktoru je pohyb po křivce MRP',
    });
  }
  const s = SHIFT[dir];
  return gviz({
    domain: [0, 10], range: [0, 100],
    curves: [{ expr: '60 - 10*x', label: 'MRP0', color: 'blue' }, { expr: s.mrp, label: s.label, color: 'accent', dashed: true }, { expr: '20', label: 'w', color: 'chalk' }],
    points: [{ x: 4, y: 20, label: 'E0' }, { x: s.A, y: 20, label: 'E1' }],
    arrows: [],
    alt: `Posun křivky MRP ${dir === '+' ? 'doprava' : 'doleva'}`,
  });
}

// =====================================================================================
// typ: tabulka TP → MP a MRP
// =====================================================================================
function buildMpTab({ tp, P }) {
  const n = tp.length;
  const mp = tp.map((t, i) => t - (i ? tp[i - 1] : 0));
  const mrp = mp.map((m) => P * m);
  const As = tp.map((_, i) => i + 1);
  return mk('mp-tabulka', {
    data: { tp, P },
    task: `Tabulka udává celkový produkt TP firmy podle počtu jednotek faktoru A (ostatní faktory jsou pevné a bez faktoru A se nevyrábí nic). Firma prodává produkt na dokonale konkurenčním trhu za ${czText(P)} Kč za kus. Pro každé množství A vypočtěte mezní produkt MP a příjem z mezního produktu MRP (v Kč) a zapište je do tabulky: v každém řádku nejprve MP, potom MRP (pro A = 1 až ${n}).`,
    promptTex: arrayTex(['A', ...As.map(cz)], [['TP', ...tp.map(cz)]]),
    answerSpec: { kind: 'table', value: mp.map((m, i) => [cell(m), cell(mrp[i])]) },
    conclusion: `Mezní produkt: ${mp.map(czText).join('; ')}. MRP v Kč: ${mrp.map(czText).join('; ')}.`,
    source: { chapter: 8, number: 'B-2' },
    solution: [
      { title: 'Co je mezní produkt', text: 'Mezní produkt je přírůstek celkového produktu, který přinese další jednotka faktoru. U první jednotky vycházíme z nulové produkce bez faktoru.',
        board: [line('MP_A=TP_A-TP_{A-1}'), line('MP_1=TP_1-0')] },
      { title: 'Rozdíly sousedních hodnot', text: 'Od každého celkového produktu odečteme celkový produkt o jednu jednotku faktoru nižší.',
        board: tp.map((t, i) => line(`MP_{${i + 1}}=${cz(t)}-${cz(i ? tp[i - 1] : 0)}=${cz(mp[i])}`)) },
      { title: 'Příjem z mezního produktu', text: `Na dokonale konkurenčním trhu produktu je mezní příjem roven ceně, a proto se $MRP$ rovná mezní produkt krát cena ${czText(P)} Kč.`,
        board: [line(`MRP=P\\cdot MP=${cz(P)}\\cdot MP`), ...mp.map((m, i) => line(`MRP_{${i + 1}}=${cz(P)}\\cdot ${cz(m)}=${cz(mrp[i])}`))] },
      { title: 'Výsledek', text: 'Zapíšeme obě řady v pořadí od první jednotky faktoru.',
        board: [line(`MP:\\ ${listTex(mp)}`), result(`MRP:\\ ${listTex(mrp)}`)] },
      { title: 'Kontrola', text: 'Mezní produkt klesá (zákon klesajících mezních výnosů), a proto klesá i $MRP$. Součet všech mezních produktů musí dát poslední celkový produkt.',
        board: [line(`${mp.map(cz).join('+')}=${cz(tp[n - 1])}`)] },
    ],
  });
}
function genMpTab(rng) {
  const n = pick(rng, [5, 6]);
  const mp = [int(rng, 18, 26)];
  for (let i = 1; i < n; i++) mp.push(mp[i - 1] - int(rng, 1, 3));
  let t = 0;
  return buildMpTab({ tp: mp.map((m) => { t += m; return t; }), P: pick(rng, [2, 3, 4, 5, 10]) });
}

// =====================================================================================
// typ: optimální množství faktoru z tabulky
// =====================================================================================
function buildOptTab({ tp, P, w, ask }) {
  const n = tp.length;
  const mp = tp.map((t, i) => t - (i ? tp[i - 1] : 0));
  const mrp = mp.map((m) => P * m);
  const profit = (k) => P * (k ? tp[k - 1] : 0) - w * k;
  let best = 0;
  for (let k = 1; k <= n; k++) if (profit(k) > profit(best)) best = k;
  const askA = ask === 'A';
  const around = [best - 1, best, best + 1].filter((k) => k >= 0 && k <= n);
  const As = tp.map((_, i) => i + 1);
  return mk('optimum-tabulka', {
    data: { tp, P, w, ask },
    task: `Tabulka udává celkový produkt TP firmy podle počtu jednotek faktoru A (ostatní faktory jsou pevné). Firma prodává produkt na dokonale konkurenčním trhu za ${czText(P)} Kč za kus a jednotku faktoru A kupuje na dokonale konkurenčním trhu za ${czText(w)} Kč. ${askA ? 'Kolik jednotek faktoru A firma najme?' : 'Kolik Kč činí největší příjem z prodeje produkce po odečtení nákladů na faktor A (ostatní náklady neuvažujeme)?'}`,
    promptTex: arrayTex(['A', ...As.map(cz)], [['TP', ...tp.map(cz)]]),
    answerSpec: { kind: 'number', value: askA ? best : profit(best) },
    conclusion: `Firma najme ${czText(best)} jednotek faktoru A; příjem z prodeje po odečtení nákladů na faktor je ${czText(profit(best))} Kč.`,
    source: { chapter: 8, number: 'B-2' },
    solution: [
      { title: 'Mezní produkt', text: 'Z celkového produktu spočteme mezní produkt jako rozdíl sousedních hodnot (první jednotka vychází z nuly).',
        board: [line('MP_A=TP_A-TP_{A-1}'), line(`MP:\\ ${listTex(mp)}`)] },
      { title: 'Příjem z mezního produktu', text: `Na dokonale konkurenčním trhu produktu je $MRP = P \\cdot MP$ s cenou produktu ${czText(P)} Kč.`,
        board: [line(`MRP=${cz(P)}\\cdot MP`), line(`MRP:\\ ${listTex(mrp)}`)] },
      { title: 'Porovnání s cenou faktoru', text: `Na dokonale konkurenčním trhu faktoru je $MFC = w = ${czText(w)}$ Kč. Další jednotku se vyplatí najmout, dokud je její $MRP$ větší než $MFC$.`,
        board: mrp.map((m, i) => line(`A=${i + 1}:\\ MRP=${cz(m)}${m > w ? '>' : '<'}${cz(w)}\\ \\Rightarrow\\ \\text{${m > w ? 'najmout' : 'nenajímat'}}`)) },
      { title: 'Optimální množství faktoru', text: `Vyplatí se najmout ${czText(best)} jednotek: poslední z nich má $MRP$ ještě nad cenou faktoru a následující už pod ní.`,
        board: [askA ? result(`A^{*}=${cz(best)}`) : line(`A^{*}=${cz(best)}`)] },
      { title: 'Kontrola celkovým příjmem', text: 'Příjem z prodeje produkce po odečtení nákladů na faktor je $P \\cdot TP - w \\cdot A$. Největší hodnotu musí mít zvolené množství.',
        board: around.map((k) => { const v = profit(k); const tx = `${cz(P)}\\cdot ${cz(k ? tp[k - 1] : 0)}-${cz(w)}\\cdot ${cz(k)}=${cz(v)}`; return k === best && !askA ? result(`A=${k}:\\ ${tx}`) : line(`A=${k}:\\ ${tx}`); }) },
    ],
  });
}
function genOptTab(rng) {
  const n = 6;
  const mp = [int(rng, 14, 26)];
  for (let i = 1; i < n; i++) mp.push(mp[i - 1] - int(rng, 1, 3));
  let t = 0;
  const tp = mp.map((m) => { t += m; return t; });
  const P = pick(rng, [2, 3, 4, 5]); const k = int(rng, 2, 5);
  const w = P * mp[k] + int(rng, 1, P * (mp[k - 1] - mp[k]) - 1);
  return buildOptTab({ tp, P, w, ask: pick(rng, ['A', 'zisk']) });
}

// =====================================================================================
// typ: optimum z produkční funkce Q = aA − bA²
// =====================================================================================
function buildOptFunkce({ a, b, P, w, ask }) {
  const A = (a * P - w) / (2 * b * P);
  const Q = a * A - b * A * A;
  const mpA = a - 2 * b * A;
  const askA = ask === 'A';
  const steps = [
    { title: 'Mezní produkt', text: 'Mezní produkt je přírůstek produkce z další jednotky faktoru. U spojité funkce je to derivace produkční funkce podle $A$.',
      board: [line(`Q=${quadTex(a, b)}`), line(`MP=\\frac{dQ}{dA}=${cz(a)}-${coef(2 * b, 'A')}`)] },
    { title: 'Příjem z mezního produktu', text: `Na dokonale konkurenčním trhu produktu je mezní příjem roven ceně ${czText(P)} Kč, takže $MRP = P \\cdot MP$.`,
      board: [line(`MRP=${cz(P)}\\left(${cz(a)}-${coef(2 * b, 'A')}\\right)`), line(`MRP=${cz(P * a)}-${coef(2 * b * P, 'A')}`)] },
    { title: 'Mezní náklady na faktor', text: `Firma kupuje faktor na dokonale konkurenčním trhu, bere tedy cenu ${czText(w)} Kč jako danou, a $MFC$ se jí rovná ceně faktoru.`,
      board: [line(`MFC=w=${cz(w)}`)] },
    { title: 'Podmínka optima MRP = MFC', text: 'Firma najímá faktor, dokud se příjem z mezního produktu nerovná mezním nákladům na faktor. Rovnici vyřešíme pro $A$.',
      board: [line(`${cz(P * a)}-${coef(2 * b * P, 'A')}=${cz(w)}`), line(`A=\\frac{${cz(P * a - w)}}{${cz(2 * b * P)}}`), askA ? result(`A^{*}=${cz(A)}`) : line(`A^{*}=${cz(A)}`)] },
    { title: 'Kontrola podmínek', text: `Křivka $MRP$ klesá (směrnice $-${cz(2 * b * P)}$ je záporná) a protíná $MFC$ shora, takže jde o maximum zisku. Mezní produkt ${czText(mpA)} je při tomto množství kladný.`,
      board: [line(`MP(${cz(A)})=${cz(mpA)}>0`), line(`MRP(${cz(A)})=${cz(P)}\\cdot ${cz(mpA)}=${cz(P * mpA)}=w`)] },
    ...(askA ? [] : [{ title: 'Vyrobené množství', text: `Optimální množství faktoru ${czText(A)} dosadíme do produkční funkce.`,
      board: [result(`Q=${cz(a)}\\cdot ${cz(A)}-${cz(b)}\\cdot ${cz(A)}^{2}=${cz(Q)}`)] }]),
    { title: 'Graf', text: `Křivka $MRP$ protíná vodorovnou přímku $MFC = w$ v bodě E: množství faktoru ${czText(A)}. Zelená plocha je přínos faktoru, tedy součet rozdílů $MRP - w$ všech najatých jednotek.`, viz: optViz({ a, b, P, w }) },
  ];
  return mk('optimum-funkce', {
    data: { a, b, P, w, ask },
    task: `Produkční funkce firmy je dána vztahem na řádku níže (A je množství faktoru za časovou jednotku, Q produkce; funkce platí v oblasti, kde je mezní produkt kladný). Firma maximalizuje zisk, produkt prodává na dokonale konkurenčním trhu za ${czText(P)} Kč a jednotku faktoru A kupuje za ${czText(w)} Kč na dokonale konkurenčním trhu faktoru. ${askA ? 'Kolik jednotek faktoru A firma najme?' : 'Kolik kusů produktu firma vyrobí?'}`,
    promptTex: `Q=${quadTex(a, b)}`,
    answerSpec: { kind: 'number', value: askA ? A : Q },
    conclusion: `Firma najme ${czText(A)} jednotek faktoru A a vyrobí ${czText(Q)} ks.`,
    source: { chapter: 8, number: 2 },
    solution: steps,
  });
}
function genOptFunkce(rng) {
  const b = pick(rng, [1, 2, 3]); const A = int(rng, 2, 8); const m = int(rng, 1, 6);
  const P = pick(rng, [2, 3, 4, 5, 10]);
  return buildOptFunkce({ a: 2 * b * A + m, b, P, w: P * m, ask: pick(rng, ['A', 'Q']) });
}

// =====================================================================================
// typ: optimum firmy s tržní silou na trhu produktu (MRP = MR · MP)
// =====================================================================================
function buildMrpNedok({ a, b, c, w, ask }) {
  const A = (a - w / c) / (2 * b * c);
  const Q = c * A; const P = a - b * Q; const MR = a - 2 * b * Q;
  const askA = ask === 'A';
  return mk('mrp-nedokonala', {
    data: { a, b, c, w, ask },
    task: `Firma je jediným prodejcem svého výrobku. Poptávka po výrobku a produkční funkce jsou na řádku níže (P je cena v Kč, Q množství, A množství faktoru). Faktor A firma kupuje na dokonale konkurenčním trhu za ${czText(w)} Kč za jednotku a maximalizuje zisk. ${askA ? 'Kolik jednotek faktoru A najme?' : 'Jakou cenu bude mít výrobek při optimálním množství faktoru?'}`,
    promptTex: `P=${cz(a)}-${coef(b, 'Q')},\\qquad Q=${coef(c, 'A')}`,
    answerSpec: { kind: 'number', value: askA ? A : P },
    conclusion: `Firma najme ${czText(A)} jednotek faktoru, vyrobí ${czText(Q)} ks a prodá je za ${czText(P)} Kč.`,
    solution: [
      { title: 'Mezní příjem z prodeje produktu', text: 'Firma má na trhu tržní sílu, a proto cena klesá s množstvím a mezní příjem je menší než cena. Z celkového příjmu spočteme mezní příjem derivací.',
        board: [line(`TR=P\\cdot Q=${cz(a)}Q-${coef(b, 'Q^{2}')}`), line(`MR=${cz(a)}-${coef(2 * b, 'Q')}`)] },
      { title: 'Příjem z mezního produktu', text: `Mezní produkt je konstantní ($MP=${czText(c)}$), protože $Q = ${czText(c)}A$. Mezní příjem ale s množstvím klesá, a proto klesá i $MRP = MR \\cdot MP$. Za $Q$ dosadíme $${czText(c)}A$.`,
        board: [line(`MR=${cz(a)}-${coef(2 * b * c, 'A')}`), line(`MRP=MR\\cdot MP=${cz(c)}\\left(${cz(a)}-${coef(2 * b * c, 'A')}\\right)`)] },
      { title: 'Podmínka MRP = MFC = w', text: `Na dokonale konkurenčním trhu faktoru je $MFC = w = ${czText(w)}$ Kč. Položíme $MRP = w$ a vyřešíme pro $A$.`,
        board: [line(`${cz(c)}\\left(${cz(a)}-${coef(2 * b * c, 'A')}\\right)=${cz(w)}`), line(`${cz(a)}-${coef(2 * b * c, 'A')}=${cz(w / c)}`), askA ? result(`A^{*}=${cz(A)}`) : line(`A^{*}=${cz(A)}`)] },
      { title: 'Vyrobené množství a cena', text: `Z produkční funkce dostaneme množství ${czText(Q)} ks a z poptávky cenu, kterou kupující při tomto množství zaplatí.`,
        board: [line(`Q=${cz(c)}\\cdot ${cz(A)}=${cz(Q)}`), askA ? line(`P=${cz(a)}-${cz(b)}\\cdot ${cz(Q)}=${cz(P)}`) : result(`P=${cz(a)}-${cz(b)}\\cdot ${cz(Q)}=${cz(P)}`)] },
      { title: 'Proč ne P · MP', text: `Kdyby firma brala cenu jako danou, počítala by s $P \\cdot MP = ${cz(P)} \\cdot ${cz(c)} = ${cz(P * c)}$ Kč. Skutečný příjem z další jednotky faktoru je ale jen $MRP = ${cz(MR * c)}$ Kč, protože větší produkce stlačí cenu pro všechny kusy. Správně se rozhoduje podle $MRP$.`,
        board: [line(`P\\cdot MP=${cz(P * c)}>MRP=${cz(MR * c)}=w`)] },
    ],
  });
}
function genMrpNedok(rng) {
  const c = pick(rng, [2, 4]); const b = pick(rng, [1, 2]); const A = int(rng, 3, 12); const MR = int(rng, 3, 12);
  return buildMrpNedok({ a: MR + 2 * b * c * A, b, c, w: c * MR, ask: pick(rng, ['A', 'P']) });
}

// =====================================================================================
// typ: tabulka TFC a MFC při rostoucí nabídce faktoru
// =====================================================================================
function buildMfcTab({ w }) {
  const n = w.length;
  const tfc = w.map((x, i) => x * (i + 1));
  const mfc = tfc.map((t, i) => t - (i ? tfc[i - 1] : 0));
  const As = w.map((_, i) => i + 1);
  return mk('mfc-tabulka', {
    data: { w },
    task: `Firma je jediným kupcem faktoru A, a aby získala další jednotky, musí zvýšit cenu, kterou platí za všechny jednotky stejně. Tabulka ukazuje cenu jednotky faktoru w při množství A. Vypočtěte celkové náklady na faktor TFC a mezní náklady na faktor MFC a zapište je do tabulky: v každém řádku nejprve TFC, potom MFC (pro A = 1 až ${n}).`,
    promptTex: arrayTex(['A', ...As.map(cz)], [['w', ...w.map(cz)]]),
    answerSpec: { kind: 'table', value: tfc.map((t, i) => [cell(t), cell(mfc[i])]) },
    conclusion: `TFC: ${tfc.map(czText).join('; ')}. MFC: ${mfc.map(czText).join('; ')}. Od druhé jednotky je MFC vyšší než cena w.`,
    solution: [
      { title: 'Celkové náklady na faktor', text: 'Všem najatým jednotkám se platí stejná cena, takže celkové náklady na faktor jsou cena krát množství.',
        board: [line('TFC=w\\cdot A'), ...w.map((x, i) => line(`TFC_{${i + 1}}=${cz(x)}\\cdot ${cz(i + 1)}=${cz(tfc[i])}`))] },
      { title: 'Mezní náklady na faktor', text: 'Mezní náklady jsou přírůstek celkových nákladů při najmutí další jednotky, tedy rozdíl sousedních hodnot (u první jednotky vycházíme z nuly).',
        board: [line('MFC_A=TFC_A-TFC_{A-1}'), ...tfc.map((t, i) => line(`MFC_{${i + 1}}=${cz(t)}-${cz(i ? tfc[i - 1] : 0)}=${cz(mfc[i])}`))] },
      { title: 'Výsledek', text: 'Zapíšeme obě řady v pořadí od první jednotky.',
        board: [line(`TFC:\\ ${listTex(tfc)}`), result(`MFC:\\ ${listTex(mfc)}`)] },
      { title: 'Proč je MFC vyšší než cena', text: 'Při vyšší ceně musí firma zvýšit platbu u všech dosavadních jednotek, ne jen u poslední. Proto je mezní náklad větší než cena. U firmy, která cenu ovlivnit nemůže, by se $MFC$ rovnaly ceně.',
        board: w.slice(1).map((x, i) => line(`MFC_{${i + 2}}=${cz(mfc[i + 1])}>w_{${i + 2}}=${cz(x)}`)) },
    ],
  });
}
function genMfcTab(rng) {
  const w = [int(rng, 5, 12)];
  for (let i = 1; i < 6; i++) w.push(w[i - 1] + int(rng, 1, 3));
  return buildMfcTab({ w });
}

// =====================================================================================
// typ: monopsonie (a srovnání s dokonalou konkurencí)
// =====================================================================================
const MONO_ASK = {
  A: 'Kolik jednotek faktoru monopsonista najme?',
  w: 'Jakou cenu (mzdu) za jednotku faktoru bude platit?',
  dA: 'O kolik jednotek faktoru najme méně, než by se najalo při dokonale konkurenčním trhu faktoru (při stejné nabídce a stejném MRP)?',
  dw: 'O kolik Kč je cena faktoru nižší než při dokonale konkurenčním trhu faktoru (při stejné nabídce a stejném MRP)?',
  expl: 'O kolik Kč je při optimálním množství cena faktoru nižší než MRP?',
};
function buildMonopsonie({ n, d, k, c, ask }) {
  const q = monoParams({ n, d, k, c });
  const val = { A: q.Am, w: q.wm, dA: q.Ac - q.Am, dw: q.wc - q.wm, expl: q.mrpAm - q.wm }[ask];
  const concl = {
    A: `Monopsonista najme ${czText(q.Am)} jednotek faktoru.`,
    w: `Monopsonista bude platit ${czText(q.wm)} Kč za jednotku faktoru.`,
    dA: `Monopsonista najme o ${czText(val)} jednotek méně než při dokonalé konkurenci.`,
    dw: `Cena faktoru je o ${czText(val)} Kč nižší než při dokonalé konkurenci.`,
    expl: `Cena faktoru je o ${czText(val)} Kč nižší než MRP.`,
  }[ask];
  const res = (key, tex) => (ask === key ? result(tex) : line(tex));
  return mk('monopsonie', {
    data: { n, d, k, c, ask },
    task: `Firma je jediným kupcem faktoru A (monopsonista). Nabídka faktoru je dána cenou w v Kč v závislosti na množství A a příjem firmy z mezního produktu je MRP, obojí na řádku níže. ${MONO_ASK[ask]}`,
    promptTex: `w=${cz(c)}+${coef(d, 'A')},\\qquad MRP=${cz(q.m)}-${coef(n, 'A')}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: concl,
    solution: [
      { title: 'Celkové a mezní náklady na faktor', text: 'Firma je jediný kupec, a proto čelí celé rostoucí nabídce. Aby najala víc, musí zvýšit cenu u všech jednotek. Celkové náklady jsou $TFC = w \\cdot A$ a mezní náklady jejich derivace.',
        board: [line(`TFC=w\\cdot A=${cz(c)}A+${coef(d, 'A^{2}')}`), line(`MFC=\\frac{dTFC}{dA}=${cz(c)}+${coef(2 * d, 'A')}`)] },
      { title: 'Podmínka MRP = MFC', text: 'Optimum je tam, kde se příjem z mezního produktu rovná mezním nákladům na faktor, ne ceně faktoru.',
        board: [line(`${cz(q.m)}-${coef(n, 'A')}=${cz(c)}+${coef(2 * d, 'A')}`), line(`${cz(q.m - c)}=${cz(n + 2 * d)}A`), res('A', `A_M=${cz(q.Am)}`)] },
      { title: 'Cena z křivky nabídky', text: `Množství ${czText(q.Am)} určila podmínka $MRP = MFC$, ale cenu faktoru musíme odečíst z křivky nabídky (to je cena, za kterou prodávající tolik jednotek nabídnou), nikoli z $MFC$.`,
        board: [res('w', `w_M=${cz(c)}+${cz(d)}\\cdot ${cz(q.Am)}=${cz(q.wm)}`), line(`MRP(${cz(q.Am)})=${cz(q.mrpAm)}=MFC`)] },
      { title: 'Dokonale konkurenční trh faktoru', text: 'Pro srovnání: kdyby firma byla jednou z mnoha a cenu bere jako danou, je $MFC = w$ a najímá se tam, kde se $MRP$ rovná nabídce.',
        board: [line(`${cz(q.m)}-${coef(n, 'A')}=${cz(c)}+${coef(d, 'A')}`), line(`A_C=${cz(q.Ac)},\\quad w_C=${cz(q.wc)}`)] },
      { title: 'Rozdíly proti konkurenci', text: 'Monopsonista najímá méně a platí méně. Mezi $MRP$ a cenou faktoru zůstane při jeho optimu rozdíl.',
        board: [res('dA', `A_C-A_M=${cz(q.Ac)}-${cz(q.Am)}=${cz(q.Ac - q.Am)}`), res('dw', `w_C-w_M=${cz(q.wc)}-${cz(q.wm)}=${cz(q.wc - q.wm)}`), res('expl', `MRP-w=${cz(q.mrpAm)}-${cz(q.wm)}=${cz(q.mrpAm - q.wm)}`)] },
      { title: 'Graf', text: `Bod M je průsečík $MRP$ a $MFC$ (množství ${czText(q.Am)}). Svisle pod ním leží bod W na nabídce: cena ${czText(q.wm)} Kč. Bod C je výsledek dokonalé konkurence (${czText(q.Ac)} jednotek za ${czText(q.wc)} Kč).`, viz: monoViz({ n, d, k, c }) },
    ],
  });
}
function genMonopsonie(rng) {
  return buildMonopsonie({ n: pick(rng, [1, 2, 3]), d: pick(rng, [1, 2, 3]), k: pick(rng, [1, 2]), c: pick(rng, [10, 20, 30]), ask: pick(rng, ['A', 'w', 'dA', 'dw', 'expl']) });
}

// =====================================================================================
// typ: kombinace více faktorů (MR = P / MP)
// =====================================================================================
const FNAMES = ['K', 'L', 'A'];
function buildViceFaktoru({ prices, mps, mr, ask, idx = 1 }) {
  const askMR = ask === 'MR';
  const MR = askMR ? prices[0] / mps[0] : mr;
  const mpAsk = askMR ? null : prices[idx] / mr;
  const names = FNAMES;
  const priceText = names.map((nm, i) => `${nm}: ${czText(prices[i])} Kč`).join(', ');
  return mk('vice-faktoru', {
    data: { prices, mps, mr, ask, idx },
    task: askMR
      ? `Firma používá tři faktory K, L a A a na dané úrovni výstupu maximalizuje zisk. Mezní fyzické produkty vstupů K, L a A jsou ${mps.map(czText).join(', ')} a jejich ceny ${priceText}. Faktory kupuje na dokonale konkurenčních trzích. Čemu se musí rovnat mezní příjem MR z prodeje poslední jednotky produktu (v Kč)?`
      : `Firma používá tři faktory K, L a A a na dané úrovni výstupu maximalizuje zisk. Mezní příjem z prodeje poslední jednotky produktu je ${czText(mr)} Kč a ceny vstupů jsou ${priceText}. Faktory kupuje na dokonale konkurenčních trzích. Jaký musí být mezní fyzický produkt vstupu ${names[idx]}?`,
    answerSpec: { kind: 'number', value: askMR ? MR : mpAsk },
    conclusion: askMR ? `Mezní příjem musí být ${czText(MR)} Kč.` : `Mezní produkt vstupu ${names[idx]} musí být ${czText(mpAsk)}.`,
    source: { chapter: 8, number: askMR ? 7 : 8 },
    solution: [
      { title: 'Podmínka optima pro každý faktor', text: 'Firma maximalizující zisk používá každý faktor tak, aby se jeho příjem z mezního produktu rovnal mezním nákladům na faktor. Na dokonale konkurenčním trhu faktoru je to cena faktoru.',
        board: [line('MRP_i=MR\\cdot MP_i=P_i')] },
      { title: 'Vyjádříme neznámou', text: askMR ? 'Z podmínky vyjádříme mezní příjem jako cenu faktoru dělenou jeho mezním produktem. Stejná hodnota musí vyjít pro všechny tři faktory.' : `Z podmínky vyjádříme mezní produkt vstupu ${names[idx]} jako jeho cenu dělenou mezním příjmem.`,
        board: askMR ? [line('MR=\\frac{P_i}{MP_i}')] : [line(`MP_${names[idx]}=\\frac{P_${names[idx]}}{MR}`)] },
      { title: 'Dosadíme', text: askMR ? 'Dosadíme ceny a mezní produkty všech tří faktorů. Výsledky se shodují, což potvrzuje, že firma je v optimu.' : `Dosadíme cenu vstupu ${names[idx]} a mezní příjem.`,
        board: askMR ? names.map((nm, i) => line(`MR=\\frac{${cz(prices[i])}}{${cz(mps[i])}}=${cz(prices[i] / mps[i])}\\quad(${nm})`)) : [line(`MP_${names[idx]}=\\frac{${cz(prices[idx])}}{${cz(mr)}}=${cz(mpAsk)}`)] },
      { title: 'Výsledek', text: askMR ? 'Mezní příjem je podíl ceny a mezního produktu libovolného faktoru.' : 'Mezní produkt je podíl ceny faktoru a mezního příjmu.',
        board: [result(askMR ? `MR=${cz(MR)}` : `MP_${names[idx]}=${cz(mpAsk)}`)] },
      { title: 'Význam', text: 'Rovnost poměrů mezního produktu a ceny u všech faktorů znamená, že poslední koruna vydaná za kterýkoli faktor přinese stejný přírůstek produkce. Tento poměr se rovná převrácené hodnotě mezního příjmu.',
        board: [line('\\frac{MP_K}{P_K}=\\frac{MP_L}{P_L}=\\frac{MP_A}{P_A}=\\frac{1}{MR}')] },
    ],
  });
}
function genViceFaktoru(rng) {
  const mr = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4]);
  const mps = [0, 0, 0].map(() => pick(rng, [2, 4, 6, 8, 10, 12]));
  const prices = mps.map((m) => r6(mr * m));
  return buildViceFaktoru({ prices, mps, mr, ask: pick(rng, ['MR', 'MP']), idx: int(rng, 0, 2) });
}

// =====================================================================================
// typ: výpočet MRP (MP · P, nebo MP · MR)
// =====================================================================================
function buildMrpHodnota({ mp, p, mr, regime }) {
  const konk = regime === 'konk';
  const val = konk ? mp * p : mp * mr;
  return mk('mrp-hodnota', {
    data: { mp, p, mr, regime },
    task: konk
      ? `Firma prodává svůj produkt na dokonale konkurenčním trhu za ${czText(p)} Kč za kus. Další jednotka faktoru A zvýší její produkci o ${czText(mp)} ks. Kolik Kč činí příjem z mezního produktu MRP této jednotky?`
      : `Firma má na trhu produktu tržní sílu: při současném výstupu prodává za cenu ${czText(p)} Kč, ale mezní příjem z prodeje poslední jednotky je jen ${czText(mr)} Kč. Další jednotka faktoru A zvýší její produkci o ${czText(mp)} ks. Kolik Kč činí příjem z mezního produktu MRP této jednotky?`,
    answerSpec: { kind: 'number', value: val },
    conclusion: `MRP je ${czText(val)} Kč.`,
    source: { chapter: 8, number: konk ? 4 : 5 },
    solution: [
      { title: 'Co je MRP', text: 'Příjem z mezního produktu je dodatečný příjem z prodeje produkce, kterou vyrobila právě tato další jednotka faktoru. Je to mezní produkt krát mezní příjem z prodeje produktu.',
        board: [line('MRP=MP\\cdot MR')] },
      { title: konk ? 'Dokonalá konkurence na trhu produktu' : 'Tržní síla na trhu produktu', text: konk ? `Cena je pro firmu daná, a proto se mezní příjem rovná ceně: $MR = P = ${czText(p)}$ Kč.` : `Cena kolem ${czText(p)} Kč pro rozhodování nestačí. Když firma prodá víc, musí snížit cenu všech kusů, a proto počítáme se mezním příjmem ${czText(mr)} Kč, který je nižší než cena.`,
        board: [line(konk ? `MR=P=${cz(p)}` : `MR=${cz(mr)}<P=${cz(p)}`)] },
      { title: 'Dosadíme', text: `Mezní produkt ${czText(mp)} ks vynásobíme mezním příjmem.`,
        board: [result(`MRP=${cz(mp)}\\cdot ${cz(konk ? p : mr)}=${cz(val)}`)] },
      { title: 'Poznámka', text: konk ? 'Na dokonale konkurenčním trhu produktu se $MRP$ rovná hodnotě mezního produktu $VMP = P \\cdot MP$.' : `Součin $P \\cdot MP = ${czText(p * mp)}$ Kč by příjem nadhodnotil. Správný je jen ${czText(val)} Kč, protože firma při vyšším výstupu stlačí cenu.`,
        board: [line(konk ? 'MRP=VMP=P\\cdot MP' : `MRP=${cz(val)}<VMP=${cz(p * mp)}`)] },
    ],
  });
}
function genMrpHodnota(rng) {
  const mp = int(rng, 3, 12); const p = 5 * int(rng, 2, 12);
  const konk = rng() < 0.5;
  return buildMrpHodnota({ mp, p, mr: p - int(rng, 2, Math.floor(p / 2)), regime: konk ? 'konk' : 'nedok' });
}

// =====================================================================================
// typ: vyplatí se další jednotka faktoru (stroj)?
// =====================================================================================
const STROJ_OPTIONS = [
  { id: 'ano', text: 'Další jednotku faktoru se vyplatí použít (MRP je větší než náklad na ni)' },
  { id: 'ne', text: 'Další jednotku faktoru se nevyplatí použít (MRP je menší než náklad na ni)' },
  { id: 'lhostejne', text: 'Firmě je to lhostejné (MRP se rovná nákladu na jednotku)' },
];
function buildStroj({ u, p, cost }) {
  const mrp = u * p;
  const ans = mrp > cost ? 'ano' : mrp < cost ? 'ne' : 'lhostejne';
  return mk('stroj', {
    data: { u, p, cost },
    task: `Firma prodává produkt na dokonale konkurenčním trhu za ${czText(p)} Kč za kus. Nový stroj, který si může na rok pronajmout za ${czText(cost)} Kč, zvýší její roční produkci o ${czText(u)} ks (ostatní faktory se nemění). Co je pro firmu při maximalizaci zisku správné?`,
    answerSpec: { kind: 'choice', value: ans, options: STROJ_OPTIONS },
    conclusion: ans === 'ano' ? `MRP ${czText(mrp)} Kč je větší než náklad ${czText(cost)} Kč, stroj se vyplatí.` : ans === 'ne' ? `MRP ${czText(mrp)} Kč je menší než náklad ${czText(cost)} Kč, stroj se nevyplatí.` : `MRP i náklad jsou ${czText(cost)} Kč, firma je lhostejná.`,
    source: { chapter: 8, number: 6 },
    solution: [
      { title: 'Příjem z mezního produktu stroje', text: `Stroj přidá ${czText(u)} ks produkce a každý kus se prodá za ${czText(p)} Kč. Mezní příjem se rovná ceně, protože firma je na trhu produktu příjemcem ceny.`,
        board: [line('MRP=MP\\cdot P'), line(`MRP=${cz(u)}\\cdot ${cz(p)}=${cz(mrp)}`)] },
      { title: 'Náklad na stroj', text: `Mezní náklad na faktor je cena, kterou za stroj za stejné období platíme: ${czText(cost)} Kč.`,
        board: [line(`MFC=${cz(cost)}`)] },
      { title: 'Porovnání', text: 'Další jednotku faktoru se vyplatí použít, když přinese víc, než stojí: $MRP > MFC$. Při $MRP < MFC$ by zisk klesl, při rovnosti se nezmění.',
        board: [result(`MRP=${cz(mrp)}${mrp > cost ? '>' : mrp < cost ? '<' : '='}MFC=${cz(cost)}`)] },
      { title: 'Změna zisku', text: `Zisk firmy se použitím stroje změní o rozdíl $MRP - MFC$, tedy o ${czText(mrp - cost)} Kč.`,
        board: [line(`\\Delta\\pi=MRP-MFC=${cz(mrp)}-${cz(cost)}=${cz(mrp - cost)}`)] },
    ],
  });
}
function genStroj(rng) {
  const u = int(rng, 3, 8); const p = pick(rng, [1000, 2000, 2500, 4000, 5000]); const v = u * p;
  const cat = pick(rng, ['ano', 'ano', 'ne', 'ne', 'lhostejne']);
  const cost = cat === 'ano' ? r6(v * pick(rng, [0.2, 0.4, 0.6, 0.8])) : cat === 'ne' ? r6(v * pick(rng, [1.5, 2, 3])) : v;
  return buildStroj({ u, p, cost });
}

// =====================================================================================
// typ: křivka poptávky firmy po faktoru (výraz)
// =====================================================================================
function buildOdvozena({ a, b, P }) {
  const expr = `${lit(P * a)}-${lit(2 * b * P)}*A`;
  return mk('odvozena-poptavka', {
    data: { a, b, P },
    task: `Produkční funkce firmy je na řádku níže (A je množství faktoru, Q produkce; platí pro kladný mezní produkt). Firma prodává produkt na dokonale konkurenčním trhu za ${czText(P)} Kč. Zapište křivku poptávky firmy po faktoru A, tedy cenu w, kterou je firma při množství A ochotna za jednotku zaplatit (do pole napište jen pravou stranu jako výraz v A, například $30-4A$).`,
    promptTex: `Q=${quadTex(a, b)}`,
    answerSpec: { kind: 'expression', value: expr, variable: 'A' },
    conclusion: `w = ${czText(P * a)} − ${czText(2 * b * P)}·A.`,
    source: { chapter: 8, number: '2a' },
    solution: [
      { title: 'Mezní produkt', text: 'Poptávka firmy po faktoru vychází z toho, kolik jí další jednotka faktoru přinese. Nejdřív spočteme mezní produkt jako derivaci produkční funkce.',
        board: [line(`MP=\\frac{dQ}{dA}=${cz(a)}-${coef(2 * b, 'A')}`)] },
      { title: 'Příjem z mezního produktu', text: `Na dokonale konkurenčním trhu produktu je mezní příjem roven ceně ${czText(P)} Kč, takže $MRP = P \\cdot MP$.`,
        board: [line(`MRP=${cz(P)}\\left(${cz(a)}-${coef(2 * b, 'A')}\\right)=${cz(P * a)}-${coef(2 * b * P, 'A')}`)] },
      { title: 'MRP je křivka poptávky po faktoru', text: 'Firma najme faktor tak, že cena faktoru se rovná $MRP$. Pro každou cenu $w$ tedy platí $w = MRP(A)$ a křivka $MRP$ je zároveň poptávkou firmy po faktoru (její klesající část s kladným mezním produktem).',
        board: [result(`w=${cz(P * a)}-${coef(2 * b * P, 'A')}`)] },
      { title: 'Graf', text: `Poptávka je klesající přímka, která začíná na ceně ${czText(P * a)} Kč a protíná vodorovnou osu při $A=${czText(a / (2 * b))}$, kde se mezní produkt rovná nule. Například při množství 1 je firma ochotna za jednotku faktoru zaplatit nejvýše ${czText(P * (a - 2 * b))} Kč.`,
        viz: gviz({ domain: [0, nice(a / (2 * b))], range: [0, nice(P * a)], curves: [{ expr: mrpExpr(a, b, P), label: 'D = MRP', color: 'blue' }], alt: 'Poptávka firmy po faktoru je klesající část křivky MRP' }) },
    ],
  });
}
function genOdvozena(rng) {
  return buildOdvozena({ a: int(rng, 6, 14), b: pick(rng, [1, 2]), P: pick(rng, [2, 4, 5, 10]) });
}

// =====================================================================================
// typ: pohyb po křivce, nebo posun křivky poptávky po faktoru
// =====================================================================================
const FSHIFT = [
  { id: 'cena-produktu-up', text: 'Cena produktu, který firma vyrábí (na dokonale konkurenčním trhu), vzrostla.', dir: '+', why: 'Vyšší cena produktu zvyšuje $MRP = P \\cdot MP$ při každém množství faktoru. Křivka $MRP$, a tedy poptávka po faktoru, se posune doprava.' },
  { id: 'cena-produktu-down', text: 'Klesla poptávka po finálním produktu, a tím jeho cena na dokonale konkurenčním trhu.', dir: '-', why: 'Poptávka po faktoru je odvozená od poptávky po produktu. Nižší cena produktu snižuje $MRP$ při každém množství faktoru a křivka se posune doleva.' },
  { id: 'technologie', text: 'Nová technologie zvýšila mezní produkt faktoru při každém jeho množství.', dir: '+', why: 'Vyšší $MP$ znamená vyšší $MRP = P \\cdot MP$. Křivka poptávky po faktoru se posune doprava.' },
  { id: 'mzda-down', text: 'Klesla cena faktoru (například mzdová sazba), ostatní podmínky se nezměnily.', dir: '0', why: 'Cena faktoru je na svislé ose. Její změna je pohyb po stejné křivce $MRP$: firma při nižší ceně najme víc jednotek.' },
  { id: 'min-mzda', text: 'Stát zvýšil minimální mzdu, a tím cenu práce, ostatní podmínky se nezměnily.', dir: '0', why: 'Mzda je cena faktoru práce. Změna ceny faktoru je pohyb po křivce poptávky po faktoru, nikoli její posun.' },
  { id: 'lepsi-stroje', text: 'Zaměstnanci dostali lepší vybavení, díky němuž každý z nich vyrobí víc.', dir: '+', why: 'Lepší vybavení zvyšuje mezní produkt práce, a tedy $MRP$. Křivka poptávky po práci se posune doprava.' },
  { id: 'zakaz', text: 'Úřady omezily prodej finálního produktu, takže jeho cena pro výrobce klesla.', dir: '-', why: 'Vládní zásah na trhu produktu mění jeho cenu, tedy $MRP$ při každém množství faktoru, a poptávka po faktoru se posune doleva.' },
  { id: 'poptavka-up', text: 'Vzrostla poptávka po finálním produktu a jeho cena na dokonale konkurenčním trhu stoupla.', dir: '+', why: 'Poptávka po faktoru je odvozená od poptávky po produktu. Vyšší cena produktu zvedá $MRP$ a posune křivku doprava.' },
];
const fshiftById = (id) => FSHIFT.find((e) => e.id === id) ?? FSHIFT[0];
const FSHIFT_OPTIONS = [
  { id: '+', text: 'Poptávka firmy po faktoru vzroste (posun křivky MRP doprava)' },
  { id: '-', text: 'Poptávka firmy po faktoru klesne (posun křivky MRP doleva)' },
  { id: '0', text: 'Jde o pohyb po stejné křivce poptávky po faktoru (křivka se neposune)' },
];
const fshiftWord = (dir) => (dir === '+' ? 'Poptávka firmy po faktoru vzroste, křivka se posune doprava.' : dir === '-' ? 'Poptávka firmy po faktoru klesne, křivka se posune doleva.' : 'Křivka poptávky se neposune, jde o pohyb po ní.');
function fshiftSteps(ev) {
  const ans = ev.dir;
  return [
    { title: 'Co se změnilo', text: `${ev.text} Rozhodneme, zda to mění jen cenu faktoru (svislá osa), nebo $MRP$ při každém množství faktoru.`,
      board: [line(ans === '0' ? '\\text{mění se cena faktoru}\\ w' : '\\text{mění se}\\ MRP=MP\\cdot MR')] },
    { title: 'Dopad na MRP', text: ev.why,
      board: [line(ans === '0' ? '\\Delta w\\ \\Rightarrow\\ \\text{pohyb po MRP}' : ans === '+' ? 'MRP_0\\ \\to\\ MRP_1\\quad(\\rightarrow)' : 'MRP_0\\ \\to\\ MRP_1\\quad(\\leftarrow)')] },
    { title: 'Graf', text: ans === '0' ? 'Cena faktoru se změní z $w_0$ na $w_1$ a firma se přesune z E0 do E1 po téže křivce $MRP$.' : `Původní křivka je nakreslená plně, nová čárkovaně. Při stejné ceně faktoru najme firma v bodě E1 ${ans === '+' ? 'víc' : 'méně'} jednotek než v bodě E0.`,
      viz: shiftFactorViz(ans) },
    { title: 'Závěr', text: `Správně: ${fshiftWord(ans)[0].toLowerCase()}${fshiftWord(ans).slice(1)}`,
      board: [result(ans === '0' ? '\\text{pohyb po křivce}' : ans === '+' ? 'MRP\\ \\rightarrow' : 'MRP\\ \\leftarrow')] },
  ];
}
function buildPosunFaktor({ id }) {
  const ev = fshiftById(id);
  return mk('posun-faktor', {
    data: { id, event: ev },
    task: `Firma maximalizuje zisk, používá jeden proměnný faktor a poptává ho podle své křivky MRP. Nastala změna: ${ev.text} Co se stane s poptávkou firmy po faktoru?`,
    answerSpec: { kind: 'choice', value: ev.dir, options: FSHIFT_OPTIONS },
    conclusion: fshiftWord(ev.dir),
    source: { chapter: 8, number: 'D-3' },
    solution: fshiftSteps(ev),
  });
}

// =====================================================================================
// typ: trh půdy a renta
// =====================================================================================
const LAND_ASK = {
  R: 'Jaká je rovnovážná renta za hektar?',
  celkem: 'Kolik tisíc Kč činí celková renta za všechnu půdu?',
  nova: 'Poté poptávka po půdě vzroste a bude dána rovnicí uvedenou na konci zadání. Jaká je nová rovnovážná renta za hektar?',
};
function buildRenta({ a, b, T, a2, ask }) {
  const R = a - b * T; const R2 = a2 - b * T;
  const val = { R, celkem: R * T, nova: R2 }[ask];
  const unit = ask === 'celkem' ? 'tis. Kč' : 'tis. Kč za hektar';
  return mk('renta-pudy', {
    data: { a, b, T, a2, ask },
    task: `Celková rozloha půdy v oblasti je ${czText(T)} ha a nezávisí na ceně. Poptávku po půdě popisuje rovnice níže, kde R je renta v tisících Kč za hektar a rok a T počet hektarů. ${LAND_ASK[ask]}${ask === 'nova' ? ` Nová poptávka: $R=${cz(a2)}-${coef(b, 'T')}$.` : ''} (Výsledek v ${unit}.)`,
    promptTex: `R=${cz(a)}-${coef(b, 'T')}`,
    answerSpec: { kind: 'number', value: val },
    conclusion: ask === 'R' ? `Rovnovážná renta je ${czText(R)} tis. Kč za hektar.` : ask === 'celkem' ? `Celková renta je ${czText(val)} tis. Kč.` : `Nová renta je ${czText(R2)} tis. Kč za hektar, o ${czText(R2 - R)} víc než dřív.`,
    solution: [
      { title: 'Nabídka půdy je svislá', text: `Celkové množství půdy je pevné: ${czText(T)} ha při jakékoli rentě. Křivka nabídky je proto svislá přímka v $T=${czText(T)}$ a rentu určuje jen poptávka.`,
        board: [line(`T^{S}=${cz(T)}`)] },
      { title: 'Rovnováha na trhu půdy', text: 'Množství půdy dosadíme do rovnice poptávky. Při tomto množství je renta ta, kterou jsou firmy ochotny zaplatit za poslední hektar.',
        board: [ask === 'nova' ? line(`R_0=${cz(a)}-${cz(b)}\\cdot ${cz(T)}=${cz(R)}`) : ask === 'R' ? result(`R^{*}=${cz(a)}-${cz(b)}\\cdot ${cz(T)}=${cz(R)}`) : line(`R^{*}=${cz(a)}-${cz(b)}\\cdot ${cz(T)}=${cz(R)}`)] },
      ...(ask === 'celkem' ? [{ title: 'Celková renta', text: 'Všechna půda má stejnou rentu, takže celková renta je renta za hektar krát počet hektarů.',
        board: [result(`R^{*}\\cdot T=${cz(R)}\\cdot ${cz(T)}=${cz(R * T)}`)] }] : []),
      ...(ask === 'nova' ? [{ title: 'Nová poptávka', text: `Množství půdy se nemůže zvýšit, a vyšší poptávka se proto projeví jen v rentě. Dosadíme pevné množství do nové poptávky.`,
        board: [result(`R_1=${cz(a2)}-${cz(b)}\\cdot ${cz(T)}=${cz(R2)}`), line(`R_1-R_0=${cz(R2 - R)}`)] }] : []),
      { title: 'Ekonomická renta', text: 'Půda nemá v této úloze jiné využití, takže vlastník by ji nabízel i za nulovou rentu. Celá renta je proto ekonomická renta, tedy platba nad minimum nutné k tomu, aby půdu nabízel.',
        board: [line('\\text{transferový výdělek}=0\\ \\Rightarrow\\ \\text{celá renta je ekonomická}')] },
      { title: 'Graf', text: `Poptávka protíná svislou nabídku v bodě E: renta ${czText(R)} tis. Kč za hektar${ask === 'nova' ? `. Po růstu poptávky (čárkovaně) je rovnováha v E1 s rentou ${czText(R2)} tis. Kč.` : '.'}`,
        viz: landViz({ a, b, T, a2: ask === 'nova' ? a2 : undefined }, ask === 'nova' ? 2 : 1) },
    ],
  });
}
function genRenta(rng) {
  const T = pick(rng, [20, 30, 40, 50, 60, 80]); const b = pick(rng, [0.5, 1, 2]); const R = int(rng, 4, 30);
  const a = R + b * T;
  return buildRenta({ a, b, T, a2: a + pick(rng, [5, 10, 15, 20]), ask: pick(rng, ['R', 'celkem', 'nova']) });
}

// =====================================================================================
// typ: ekonomická renta a transferový výdělek (rostoucí nabídka)
// =====================================================================================
function buildEkonRenta({ c, d, A, ask }) {
  const w = c + d * A;
  const renta = (d * A * A) / 2; const transfer = c * A + (d * A * A) / 2; const total = w * A;
  const askRenta = ask === 'renta';
  return mk('ekon-renta', {
    data: { c, d, A, ask },
    task: `Nabídka faktoru je dána cenou w v Kč v závislosti na množství A (jednotky faktoru za období), rovnice je na řádku níže. Na trhu se obchoduje ${czText(A)} jednotek za jednotnou rovnovážnou cenu. ${askRenta ? 'Jak velká je celková ekonomická renta vlastníků faktoru (v Kč)?' : 'Jak velký je celkový transferový výdělek (v Kč), tedy minimum, které vlastníci faktoru potřebují, aby ho nabídli?'}`,
    promptTex: `w=${cz(c)}+${coef(d, 'A')}`,
    answerSpec: { kind: 'number', value: askRenta ? renta : transfer },
    conclusion: `Celková platba je ${czText(total)} Kč, z toho transferový výdělek ${czText(transfer)} Kč a ekonomická renta ${czText(renta)} Kč.`,
    solution: [
      { title: 'Rovnovážná cena a celková platba', text: `Při množství ${czText(A)} je cena z křivky nabídky stejná pro všechny jednotky. Celková platba vlastníkům je cena krát množství.`,
        board: [line(`w=${cz(c)}+${cz(d)}\\cdot ${cz(A)}=${cz(w)}`), line(`w\\cdot A=${cz(w)}\\cdot ${cz(A)}=${cz(total)}`)] },
      { title: 'Transferový výdělek', text: 'Každý vlastník je ochoten nabízet od ceny, kterou ukazuje nabídková křivka při jeho jednotce. Součet těchto minim je plocha pod křivkou nabídky od nuly po množství A (lichoběžník).',
        board: [line(`\\text{plocha pod }S=\\frac{${cz(c)}+${cz(w)}}{2}\\cdot ${cz(A)}=${cz(transfer)}`)] },
      { title: 'Ekonomická renta', text: 'Ekonomická renta je celková platba minus transferový výdělek. Je to plocha trojúhelníku mezi cenou a křivkou nabídky.',
        board: [line(`\\text{renta}=${cz(total)}-${cz(transfer)}=${cz(renta)}`), askRenta ? result(`\\text{renta}=\\frac{(${cz(w)}-${cz(c)})\\cdot ${cz(A)}}{2}=${cz(renta)}`) : result(`\\text{transfer}=${cz(transfer)}`)] },
      { title: 'Význam', text: 'Čím strměji nabídka roste, tím větší část platby tvoří renta. U zcela pevné nabídky (půda bez jiného využití) je transferový výdělek nulový a celá platba je ekonomická renta.',
        board: [line('\\text{platba}=\\text{transfer}+\\text{renta}')] },
      { title: 'Graf', text: `Pod nabídkou je transferový výdělek (${czText(transfer)} Kč), nad nabídkou a pod cenou ${czText(w)} Kč je ekonomická renta (${czText(renta)} Kč).`,
        viz: gviz({ domain: [0, nice(A * 1.3)], range: [0, nice(w * 1.2)], curves: [{ expr: `${lit(c)} + ${lit(d)}*x`, label: 'S', color: 'chalk' }, { expr: lit(w), label: 'w', color: 'blue', dashed: true }],
          areas: [{ between: [lit(w), `${lit(c)} + ${lit(d)}*x`], from: 0, to: A, label: 'renta', color: 'green' }], points: [{ x: A, y: w, label: 'E', guides: true }], alt: 'Ekonomická renta je plocha mezi cenou a křivkou nabídky' }) },
    ],
  });
}
function genEkonRenta(rng) {
  return buildEkonRenta({ c: pick(rng, [10, 20, 30, 40]), d: pick(rng, [1, 2, 3]), A: 2 * int(rng, 2, 10), ask: pick(rng, ['renta', 'transfer']) });
}

// =====================================================================================
// typ: trh faktoru → cena → optimum firmy
// =====================================================================================
function buildTrhFirma({ D0, D1, S0, S1, a, b, P, ask }) {
  const At = (D0 - S0) / (D1 + S1); const w = D0 - D1 * At;
  const A = (a * P - w) / (2 * b * P); const mp = a - 2 * b * A;
  const askW = ask === 'w';
  return mk('trh-faktoru-firma', {
    data: { D0, D1, S0, S1, a, b, P, ask },
    task: `Trh faktoru A je dokonale konkurenční: tržní poptávka po faktoru a tržní nabídka jsou na prvním řádku níže (w je cena faktoru v Kč, $A_T$ množství na celém trhu). Jedna malá firma má produkční funkci na druhém řádku (platí pro kladný mezní produkt) a prodává produkt na dokonale konkurenčním trhu za ${czText(P)} Kč. ${askW ? 'Jaká je rovnovážná cena faktoru?' : 'Kolik jednotek faktoru A tato firma najme?'}`,
    promptTex: `w=${cz(D0)}-${coef(D1, 'A_T')},\\quad w=${cz(S0)}+${coef(S1, 'A_T')};\\qquad Q=${quadTex(a, b)}`,
    answerSpec: { kind: 'number', value: askW ? w : A },
    conclusion: `Rovnovážná cena faktoru je ${czText(w)} Kč (na trhu se obchoduje ${czText(At)} jednotek) a firma najme ${czText(A)} jednotek.`,
    source: { chapter: 8, number: 9 },
    solution: [
      { title: 'Rovnováha na trhu faktoru', text: 'Rovnovážná cena faktoru vznikne ve střetu tržní poptávky a nabídky. Pravé strany obou rovnic dáme do rovnosti.',
        board: [line(`${cz(D0)}-${coef(D1, 'A_T')}=${cz(S0)}+${coef(S1, 'A_T')}`), line(`A_T=\\frac{${cz(D0 - S0)}}{${cz(D1 + S1)}}=${cz(At)}`), askW ? result(`w^{*}=${cz(D0)}-${cz(D1)}\\cdot ${cz(At)}=${cz(w)}`) : line(`w^{*}=${cz(D0)}-${cz(D1)}\\cdot ${cz(At)}=${cz(w)}`)] },
      { title: 'Co z toho plyne pro firmu', text: `Firma je malá, a proto cenu ${czText(w)} Kč bere jako danou. Je to její $MFC$: $MFC = w$.`,
        board: [line(`MFC=w=${cz(w)}`)] },
      { title: 'Příjem z mezního produktu firmy', text: 'Mezní produkt je derivace produkční funkce. Na dokonale konkurenčním trhu produktu je $MRP = P \\cdot MP$.',
        board: [line(`MP=${cz(a)}-${coef(2 * b, 'A')}`), line(`MRP=${cz(P)}\\left(${cz(a)}-${coef(2 * b, 'A')}\\right)=${cz(P * a)}-${coef(2 * b * P, 'A')}`)] },
      { title: 'Podmínka MRP = MFC', text: 'Rovnici vyřešíme pro množství faktoru, které firma najme.',
        board: [line(`${cz(P * a)}-${coef(2 * b * P, 'A')}=${cz(w)}`), askW ? line(`A^{*}=${cz(A)}`) : result(`A^{*}=\\frac{${cz(P * a - w)}}{${cz(2 * b * P)}}=${cz(A)}`)] },
      { title: 'Kontrola', text: `Při množství ${czText(A)} je mezní produkt ${czText(mp)}, tedy kladný, a křivka $MRP$ klesá, takže jde o maximum zisku.`,
        board: [line(`MP(${cz(A)})=${cz(mp)}>0,\\quad MRP=${cz(P * mp)}=w`)] },
      { title: 'Graf firmy', text: `Firma čelí vodorovné nabídce na úrovni ${czText(w)} Kč a najímá tam, kde ji protne klesající $MRP$.`, viz: optViz({ a, b, P, w }) },
    ],
  });
}
function genTrhFirma(rng) {
  for (let i = 0; i < 200; i++) {
    const b = pick(rng, [1, 2, 3]); const A = int(rng, 2, 8); const m = int(rng, 1, 6); const P = pick(rng, [2, 4, 5, 10]);
    const w = P * m;
    const S1 = pick(rng, [0.5, 1, 2]); const D1 = pick(rng, [0.5, 1, 2]); const At = 4 * int(rng, 5, 20);
    const S0 = w - S1 * At;
    if (S0 < 2) continue;
    return buildTrhFirma({ D0: w + D1 * At, D1, S0, S1, a: 2 * b * A + m, b, P, ask: pick(rng, ['w', 'A']) });
  }
  return buildTrhFirma({ D0: 80, D1: 1, S0: 20, S1: 1, a: 10, b: 1, P: 5, ask: 'w' });
}

// =====================================================================================
// typ: ceny faktorů ze dvou výrob (soustava dvou rovnic)
// =====================================================================================
function buildSoustava({ xl, xt, yl, yt, cx, cy, ask }) {
  const det = xl * yt - xt * yl;
  const w = (cx * yt - xt * cy) / det; const r = (xl * cy - yl * cx) / det;
  const askW = ask === 'w';
  return mk('soustava-faktoru', {
    data: { xl, xt, yl, yt, cx, cy, ask },
    task: `Na výrobu produktu X se používá ${czText(xl)} jednotek práce a ${czText(xt)} jednotek půdy při celkových nákladech ${czText(cx)} Kč. Na výrobu produktu Y se používá ${czText(yl)} jednotek práce a ${czText(yt)} jednotek půdy při celkových nákladech ${czText(cy)} Kč. Obě výroby kupují faktory na stejných trzích za stejné ceny. ${askW ? 'Vypočtěte cenu jednotky práce (mzdovou sazbu) w v Kč.' : 'Vypočtěte cenu jednotky půdy (rentu) r v Kč.'}`,
    answerSpec: { kind: 'number', value: askW ? w : r },
    conclusion: `Mzdová sazba je ${czText(w)} Kč a renta ${czText(r)} Kč.`,
    source: { chapter: 8, number: 1 },
    solution: [
      { title: 'Sestavíme rovnice nákladů', text: 'Celkové náklady jsou množství práce krát mzdová sazba plus množství půdy krát renta. Obě výroby platí za faktory stejné ceny, takže dostaneme dvě rovnice o dvou neznámých.',
        board: [line(`${cz(xl)}w+${cz(xt)}r=${cz(cx)}`), line(`${cz(yl)}w+${cz(yt)}r=${cz(cy)}`)] },
      { title: 'Vyloučíme rentu', text: `První rovnici vynásobíme číslem ${czText(yt)} a druhou číslem ${czText(xt)}. U renty pak budou stejné koeficienty a po odečtení zmizí.`,
        board: [line(`${cz(xl * yt)}w+${cz(xt * yt)}r=${cz(cx * yt)}`), line(`${cz(yl * xt)}w+${cz(yt * xt)}r=${cz(cy * xt)}`), line(`${cz(det)}w=${cz(cx * yt - cy * xt)}`)] },
      { title: 'Mzdová sazba', text: 'Rovnici vydělíme koeficientem u mzdové sazby.',
        board: [askW ? result(`w=${cz(w)}`) : line(`w=${cz(w)}`)] },
      { title: 'Renta', text: 'Mzdovou sazbu dosadíme do první rovnice a vyřešíme ji pro rentu.',
        board: [line(`${cz(xt)}r=${cz(cx)}-${cz(xl)}\\cdot ${cz(w)}`), askW ? line(`r=${cz(r)}`) : result(`r=${cz(r)}`)] },
      { title: 'Zkouška', text: 'Obě ceny dosadíme do druhé rovnice. Musí vyjít zadané celkové náklady.',
        board: [line(`${cz(yl)}\\cdot ${cz(w)}+${cz(yt)}\\cdot ${cz(r)}=${cz(yl * w + yt * r)}`)] },
    ],
  });
}
function genSoustava(rng) {
  for (let i = 0; i < 100; i++) {
    const xl = int(rng, 1, 6); const xt = int(rng, 1, 6); const yl = int(rng, 1, 6); const yt = int(rng, 1, 6);
    if (xl * yt - xt * yl === 0) continue;
    const w = int(rng, 2, 12); const r = int(rng, 2, 12);
    return buildSoustava({ xl, xt, yl, yt, cx: xl * w + xt * r, cy: yl * w + yt * r, ask: pick(rng, ['w', 'r']) });
  }
  return buildSoustava({ xl: 4, xt: 4, yl: 6, yt: 2, cx: 56, cy: 64, ask: 'w' });
}

// =====================================================================================
// typ: pravda, nebo nepravda
// =====================================================================================
// kn-a až kn-j jsou úkoly ano/ne z části C cvičebnice kap. 8 (kniha: A, A, N, A, N, N, A, A, A, A). Úkol h má v knize
// chybné řešení „ano“: hodnota mezního produktu je MP krát cena PRODUKTU, ne cena faktoru, správně je tedy „nepravda“.
const STATEMENTS = [
  { id: 'kn-a', text: 'Změní-li se poptávka po výrobcích firmy, změní se také poptávka této firmy po výrobních faktorech.', truth: true, why: 'Poptávka po faktoru je odvozená od poptávky po produktu. Změna ceny produktu mění $MRP$ a posouvá poptávku firmy po faktoru.' },
  { id: 'kn-b', text: 'Klesá-li mezní produkt výrobního faktoru, klesá rovněž příjem z mezního produktu (MRP).', truth: true, why: 'Platí $MRP = MP \\cdot MR$. Mezní příjem MR je konstantní nebo klesající a mezní produkt klesá, a proto $MRP$ klesá také.' },
  { id: 'kn-c', text: 'Poptávka po výrobním faktoru je odvozena od ceny tohoto výrobního faktoru.', truth: false, why: 'Je odvozená od poptávky po produktu, který se z faktoru vyrábí (a od jeho produktivity). Cena faktoru jen určuje bod na křivce poptávky.' },
  { id: 'kn-d', text: 'Cena zaplacená za každý výrobní faktor se mění tak, aby se vyrovnala nabídka tohoto faktoru a poptávka po něm.', truth: true, why: 'Stejně jako na trhu zboží vede převis nabídky nebo poptávky ke změně ceny, až je trh vyrovnaný.' },
  { id: 'kn-e', text: 'Je-li MRP větší než MFC daného výrobního faktoru, potom má firma tendenci najímat tohoto faktoru méně.', truth: false, why: 'Je-li $MRP > MFC$, přinese další jednotka víc, než stojí, a firma proto najímá víc.' },
  { id: 'kn-f', text: 'Mezní náklady na faktor jsou rovny ceně tohoto faktoru.', truth: false, why: 'Platí to jen v dokonalé konkurenci na trhu faktoru. Firma s tržní silou na trhu faktoru (monopsonie) musí s množstvím zvyšovat cenu pro všechny jednotky, a $MFC$ je proto vyšší než cena.' },
  { id: 'kn-g', text: 'S růstem množství vstupů se produkční funkce zplošťuje.', truth: true, why: 'Platí zákon klesajících mezních výnosů: v oblasti, kde firma faktor najímá, mezní produkt klesá, takže produkce roste stále pomaleji.' },
  { id: 'kn-h', text: 'Hodnotu mezního produktu vstupu získáme jeho vynásobením cenou výrobního faktoru.', truth: false, why: 'Hodnota mezního produktu je $VMP = MP \\cdot P$, tedy mezní produkt krát cena PRODUKTU. Cena faktoru je s ním naopak porovnávána při rozhodování o najímání. (Kniha zde chybně uvádí pravdu.)' },
  { id: 'kn-i', text: 'Nabídková křivka vstupu pro firmu v dokonalé konkurenci je dokonale elastická.', truth: true, why: 'Firma je příjemcem ceny faktoru a koupí libovolné množství za tržní cenu. Křivka je vodorovná.' },
  { id: 'kn-j', text: 'V nedokonalé konkurenci změna najímaného množství výrobního faktoru povede ke změně jeho ceny.', truth: true, why: 'Firma s tržní silou na trhu faktoru čelí rostoucí nabídce, takže zvýšení najímaného množství zvedne cenu.' },
  { id: 'own-1', text: 'Rovnost MRP = MFC je dostatečná podmínka maxima zisku, i kdyby MRP v daném bodě rostlo.', truth: false, why: 'Rovnost je jen nutná podmínka. Je-li $MRP$ v bodě rostoucí (rostoucí $MP$), jde o minimum zisku. Maximum je tam, kde $MRP$ protíná $MFC$ shora.' },
  { id: 'own-2', text: 'Křivka MFC firmy, která je příjemcem ceny faktoru, je vodorovná v úrovni tržní ceny.', truth: true, why: 'Každá další jednotka stojí stejně: $MFC = w$.' },
  { id: 'own-3', text: 'Monopsonista platí za faktor cenu rovnou svým mezním nákladům na faktor.', truth: false, why: 'Platí cenu z křivky nabídky při zvoleném množství. Mezní náklady jsou vyšší a rozhodují jen o tom, kolik jednotek se najme.' },
  { id: 'own-4', text: 'Za jinak stejných podmínek monopsonista najme méně faktoru a zaplatí nižší cenu než firma na dokonale konkurenčním trhu faktoru.', truth: true, why: '$MFC$ leží nad nabídkou, takže průsečík s $MRP$ je při menším množství a nižší ceně z nabídky.' },
  { id: 'own-5', text: 'Při pevné celkové nabídce půdy určuje výši renty výhradně poptávka po půdě.', truth: true, why: 'Nabídka je svislá, množství se na změně renty nezmění a rovnovážná renta se řídí jen polohou poptávky.' },
  { id: 'own-6', text: 'Růst ceny produktu na dokonale konkurenčním trhu posune křivku poptávky firmy po faktoru doprava.', truth: true, why: '$MRP = P \\cdot MP$ vzroste při každém množství faktoru.' },
  { id: 'own-7', text: 'Růst mzdové sazby posune křivku poptávky firmy po práci doleva.', truth: false, why: 'Mzda je cena faktoru. Její růst znamená pohyb po stejné křivce (firma najme méně), nikoli posun křivky.' },
  { id: 'own-8', text: 'Na dokonale konkurenčním trhu produktu se MRP rovná součinu mezního produktu a ceny produktu.', truth: true, why: 'Mezní příjem se rovná ceně, takže $MRP = MP \\cdot MR = MP \\cdot P$.' },
  { id: 'own-9', text: 'Je-li mezní příjem firmy menší než cena produktu, je její MRP menší než hodnota mezního produktu VMP.', truth: true, why: '$MRP = MP \\cdot MR$, $VMP = MP \\cdot P$. Při $MR < P$ a kladném $MP$ je $MRP < VMP$.' },
  { id: 'own-10', text: 'Poptávka po faktoru nezávisí na poptávce po produktu, protože se řídí jen cenou faktoru.', truth: false, why: 'Poptávka po faktoru je odvozená, takže na poptávce po produktu závisí (přes jeho cenu a $MRP$).' },
  { id: 'own-11', text: 'Ekonomická renta je platba faktoru nad minimum nutné k tomu, aby byl v daném použití nabízen.', truth: true, why: 'Toto minimum je transferový výdělek (hodnota nejlepšího alternativního použití).' },
  { id: 'own-12', text: 'Při lineární nabídce faktoru rostou mezní náklady monopsonisty na faktor dvakrát strměji než cena z nabídky.', truth: true, why: 'Z $TFC = (c+dA)A$ plyne $MFC = c + 2dA$ a nabídka je $w = c + dA$.' },
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
    source: book ? { chapter: 8, number: `C-${id.slice(3)}` } : undefined,
    solution: [
      { title: 'Co tvrzení říká', text: 'Přečteme tvrzení pozorně a najdeme pojem, na kterém stojí (například $MRP$, $MFC$, odvozená poptávka, renta).', board: [line('\\text{tvrzení}\\ \\Rightarrow\\ ?')] },
      { title: 'Zdůvodnění', text: s.why, board: [line(s.truth ? '\\text{souhlasí s teorií}' : '\\text{odporuje teorii}')] },
      { title: 'Závěr', text: `Tvrzení je ${s.truth ? 'pravdivé' : 'nepravdivé'}.`, board: [result(s.truth ? '\\text{pravda}' : '\\text{nepravda}')] },
    ],
  });
}

// =====================================================================================
// typ: definice pojmů (zkouška)
// =====================================================================================
const DEFS = [
  { id: 'cena-faktoru', q: 'Jak se nazývá cena práce, půdy a kapitálu?', right: 'Mzda, renta a úrok.', wrong: ['Úrok, mzda a zisk.', 'Renta, daň a mzda.', 'Zisk, renta a úrok.'] },
  { id: 'odvozena', q: 'Co znamená, že poptávka po výrobním faktoru je odvozená?', right: 'Vzniká z poptávky po finálním produktu, k jehož výrobě se faktor používá.', wrong: ['Závisí jen na ceně samotného faktoru.', 'Vzniká z důchodu domácností, které faktor vlastní.', 'Stanovuje ji stát podle potřeb firem.'] },
  { id: 'mp', q: 'Co je mezní produkt faktoru?', right: 'Přírůstek produkce z další jednotky faktoru při neměnném množství ostatních faktorů.', wrong: ['Produkce dělená množstvím použitého faktoru.', 'Přírůstek nákladů z další jednotky faktoru.', 'Celková produkce všech faktorů.'] },
  { id: 'mrp', q: 'Co je příjem z mezního produktu (MRP)?', right: 'Dodatečný příjem z prodeje produkce vyrobené další jednotkou faktoru (MRP = MP krát MR).', wrong: ['Dodatečné náklady na další jednotku faktoru.', 'Cena faktoru na trhu faktorů.', 'Příjem z prodeje celé produkce firmy.'] },
  { id: 'vmp', q: 'Kdy se MRP rovná hodnotě mezního produktu VMP = P krát MP?', right: 'Když je firma na trhu produktu v dokonalé konkurenci (MR = P).', wrong: ['Když je firma monopolem na trhu produktu.', 'Když je firma monopsonistou na trhu faktoru.', 'Vždy, protože jde o dva názvy téže veličiny.'] },
  { id: 'mfc', q: 'Co jsou mezní náklady na faktor (MFC)?', right: 'Přírůstek celkových nákladů firmy při najmutí další jednotky faktoru.', wrong: ['Průměrné náklady na jednotku faktoru.', 'Příjem z prodeje produktu jedné jednotky faktoru.', 'Fixní náklady firmy na faktor.'] },
  { id: 'mfc-konkurence', q: 'Čemu se rovná MFC firmy, která je příjemcem ceny na trhu faktoru?', right: 'Ceně faktoru: MFC = w, křivka MFC je vodorovná.', wrong: ['Dvojnásobku ceny faktoru.', 'Příjmu z mezního produktu MRP.', 'Nule.'] },
  { id: 'optimum', q: 'Jaká je podmínka optimálního množství faktoru u firmy maximalizující zisk?', right: 'MRP se rovná MFC (a při dalším zvýšení množství už je MRP menší než MFC).', wrong: ['Mezní produkt se rovná ceně faktoru.', 'Cena produktu se rovná ceně faktoru.', 'MFC se rovná průměrnému produktu faktoru.'] },
  { id: 'posun-poptavky', q: 'Co posune křivku poptávky firmy po faktoru?', right: 'Změna ceny produktu nebo změna produktivity faktoru (mezního produktu).', wrong: ['Změna ceny samotného faktoru.', 'Změna počtu najatých jednotek faktoru.', 'Změna množství faktoru, které firma nabízí.'] },
  { id: 'monopsonie', q: 'Co je monopsonie na trhu faktoru?', right: 'Trh s jediným kupcem faktoru, u něhož MFC leží nad křivkou nabídky.', wrong: ['Trh s jediným prodejcem faktoru.', 'Trh s mnoha kupujícími a mnoha prodávajícími faktoru.', 'Trh, na kterém stát stanovuje cenu faktoru.'] },
  { id: 'renta', q: 'Co je ekonomická renta?', right: 'Platba faktoru nad minimum nutné k tomu, aby byl v daném použití nabízen (nad transferový výdělek).', wrong: ['Nájem, který platí nájemník vlastníkovi bytu.', 'Celková platba faktoru včetně transferového výdělku.', 'Zisk firmy nad normálním ziskem.'] },
  { id: 'transfer', q: 'Co je transferový výdělek faktoru?', right: 'Minimální platba, která udrží faktor v daném použití (to, co by vydělal v nejlepším alternativním použití).', wrong: ['Platba, kterou stát převádí vlastníkům faktoru.', 'Celková platba faktoru včetně ekonomické renty.', 'Odměna za převod pozemku mezi vlastníky.'] },
  { id: 'puda', q: 'Proč je křivka nabídky půdy jako celku svislá?', right: 'Celková rozloha půdy je pevně daná a nezávisí na ceně (rentě).', wrong: ['Půda nemá vlastníka, který by ji nabízel.', 'Poptávka po půdě je dokonale elastická.', 'Renta půdy je vždy nulová.'] },
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
      { title: 'Vyloučíme nesprávné možnosti', text: `Nesprávné možnosti zaměňují sousední pojmy (například $MRP$ a $MFC$, $MRP$ a $VMP$) nebo obracejí vztah. Například: „${df.wrong[0]}“`, board: [line('\\text{vyloučit chyby}')] },
      { title: 'Správná definice', text: df.right, board: [result('\\checkmark')] },
    ],
  });
}

// =====================================================================================
// grafové úlohy na tabuli (zkouška)
// =====================================================================================
function buildGrafOptimum({ a, b, P, w }) {
  const A = (a * P - w) / (2 * b * P);
  return mk('graf-optimum', {
    part: 'zkouska',
    points: 2,
    data: { a, b, P, w },
    task: 'Nakreslete do grafu s osami A (množství faktoru) a Kč křivku příjmu z mezního produktu MRP a mezní náklady na faktor MFC firmy, která je příjemcem ceny na trhu faktoru. Vyznačte optimální množství faktoru a plochu přínosu faktoru.',
    answerSpec: { kind: 'whiteboard', reference: optViz({ a, b, P, w }) },
    conclusion: `Optimum je v průsečíku klesající křivky MRP s vodorovnou přímkou MFC = w, množství faktoru ${czText(A)}.`,
    source: { chapter: 8, number: 'D-10' },
    solution: [
      { title: 'Křivka MRP', text: 'Nakreslíme osy a klesající křivku $MRP$ (při klesajícím mezním produktu). Je zároveň poptávkou firmy po faktoru.', viz: optViz({ a, b, P, w }, 0) },
      { title: 'Křivka MFC', text: 'Firma je příjemcem ceny faktoru, takže $MFC = w$ je vodorovná přímka v úrovni tržní ceny.', viz: optViz({ a, b, P, w }, 1) },
      { title: 'Optimum', text: 'Firma najímá, dokud je $MRP > MFC$. Maximum zisku je v průsečíku E, kde $MRP$ protíná $MFC$ shora. Z bodu E vedou čárkované čáry na osy.', viz: optViz({ a, b, P, w }, 2) },
      { title: 'Přínos faktoru', text: 'Plocha mezi $MRP$ a $MFC$ od nuly po optimální množství je součet přínosů všech najatých jednotek (rozdílů $MRP - MFC$).', viz: optViz({ a, b, P, w }, 3) },
    ],
  });
}
function genGrafOptimum(rng) {
  const g = genOptFunkce(rng).data; return buildGrafOptimum({ a: g.a, b: g.b, P: g.P, w: g.w });
}

function buildGrafMonopsonie({ n, d, k, c }) {
  const q = monoParams({ n, d, k, c });
  return mk('graf-monopsonie', {
    part: 'zkouska',
    points: 2,
    data: { n, d, k, c },
    task: 'Nakreslete do grafu s osami A a Kč křivku MRP, rostoucí nabídku faktoru S a mezní náklady na faktor MFC monopsonisty. Vyznačte optimální množství, cenu faktoru, kterou monopsonista platí, a pro srovnání výsledek dokonalé konkurence.',
    answerSpec: { kind: 'whiteboard', reference: monoViz({ n, d, k, c }) },
    conclusion: `Optimum je v průsečíku MRP a MFC (bod M), cena se čte z nabídky (bod W). Je nižší a množství menší než v bodě C (dokonalá konkurence).`,
    source: { chapter: 8, number: 'D-7' },
    solution: [
      { title: 'MRP a nabídka', text: 'Nakreslíme klesající $MRP$ a rostoucí nabídku $S$. V dokonalé konkurenci by se protly v bodě C.', viz: monoViz({ n, d, k, c }, 0) },
      { title: 'Křivka MFC', text: 'Monopsonista platí všem jednotkám stejnou cenu, a proto $MFC$ leží nad nabídkou a (u lineární nabídky) stoupá dvakrát strměji. Začíná na stejném bodě na svislé ose.', viz: monoViz({ n, d, k, c }, 1) },
      { title: 'Optimum a cena', text: `Množství určuje průsečík $MRP$ a $MFC$ (bod M, množství ${czText(q.Am)}). Cenu faktoru odečteme z nabídky svisle pod bodem M (bod W, ${czText(q.wm)} Kč).`, viz: monoViz({ n, d, k, c }, 2) },
      { title: 'Srovnání s konkurencí', text: `Bod C (průsečík $MRP$ a nabídky) ukazuje dokonalou konkurenci: ${czText(q.Ac)} jednotek za ${czText(q.wc)} Kč. Monopsonista najímá méně a platí méně.`, viz: monoViz({ n, d, k, c }, 3) },
    ],
  });
}
function genGrafMonopsonie(rng) {
  const g = genMonopsonie(rng).data; return buildGrafMonopsonie({ n: g.n, d: g.d, k: g.k, c: g.c });
}

function buildGrafPosunFaktor({ id }) {
  const ev = fshiftById(id);
  return mk('graf-posun-faktor', {
    part: 'zkouska',
    points: 2,
    data: { id, event: ev },
    task: `Nakreslete do grafu s osami A a Kč křivku poptávky firmy po faktoru (MRP) a cenu faktoru a zakreslete, co se stane při změně: ${ev.text} Vyznačte původní a novou rovnováhu firmy.`,
    answerSpec: { kind: 'whiteboard', reference: shiftFactorViz(ev.dir) },
    conclusion: ev.dir === '0' ? 'Jde o pohyb po křivce MRP, křivka se neposune.' : `Křivka MRP se posune ${ev.dir === '+' ? 'doprava' : 'doleva'}.`,
    source: { chapter: 8, number: 'D-3' },
    solution: fshiftSteps(ev),
  });
}

function buildGrafPuda({ a, b, T, a2 }) {
  const R = a - b * T;
  return mk('graf-puda', {
    part: 'zkouska',
    points: 2,
    data: { a, b, T, a2 },
    task: 'Nakreslete do grafu s osami T (množství půdy) a R (renta) trh půdy s pevnou celkovou nabídkou a klesající poptávkou. Vyznačte rovnovážnou rentu a zakreslete, co se stane s rentou, když poptávka po půdě vzroste.',
    answerSpec: { kind: 'whiteboard', reference: landViz({ a, b, T, a2 }, 2) },
    conclusion: 'Nabídka je svislá, a růst poptávky se proto projeví jen vyšší rentou, množství půdy se nezmění.',
    source: { chapter: 8, number: 'D-2' },
    solution: [
      { title: 'Poptávka a nabídka půdy', text: 'Poptávka po půdě klesá, protože při vyšší rentě firmy využijí méně hektarů. Celková nabídka půdy je pevná, a křivka je proto svislá.', viz: landViz({ a, b, T, a2 }, 0) },
      { title: 'Rovnovážná renta', text: `Průsečík poptávky se svislou nabídkou je rovnováha E. Z něj vede čárkovaná čára na osu renty: $R^{*}=${czText(R)}$.`, viz: landViz({ a, b, T, a2 }, 1) },
      { title: 'Růst poptávky', text: `Poptávka se posune doprava a nahoru (čárkovaně). Množství půdy se nezmění, a nová rovnováha E1 leží svisle nad E s vyšší rentou ${czText(a2 - b * T)}.`, viz: landViz({ a, b, T, a2 }, 2) },
    ],
  });
}
function genGrafPuda(rng) {
  const r = genRenta(rng).data; return buildGrafPuda({ a: r.a, b: r.b, T: r.T, a2: r.a2 });
}

// ---------- seznam typů ----------
function type(id, title, gen, build) {
  return { id, title, generate: (rng) => gen(rng), solve: (data) => build(data) };
}
const ids = (list) => list.map((x) => x.id);

const types = [
  type('mp-tabulka', 'Tabulka: mezní produkt a MRP', genMpTab, buildMpTab),
  type('optimum-tabulka', 'Optimální množství faktoru z tabulky', genOptTab, buildOptTab),
  type('optimum-funkce', 'Optimum firmy z produkční funkce', genOptFunkce, buildOptFunkce),
  type('mrp-nedokonala', 'Optimum firmy s tržní silou na trhu produktu', genMrpNedok, buildMrpNedok),
  type('mfc-tabulka', 'Tabulka: celkové a mezní náklady na faktor', genMfcTab, buildMfcTab),
  type('monopsonie', 'Monopsonie na trhu faktoru', genMonopsonie, buildMonopsonie),
  type('vice-faktoru', 'Optimální kombinace více faktorů', genViceFaktoru, buildViceFaktoru),
  type('mrp-hodnota', 'Příjem z mezního produktu', genMrpHodnota, buildMrpHodnota),
  type('stroj', 'Vyplatí se další jednotka faktoru?', genStroj, buildStroj),
  type('odvozena-poptavka', 'Odvozená poptávka firmy po faktoru', genOdvozena, buildOdvozena),
  type('posun-faktor', 'Pohyb po křivce, nebo posun poptávky po faktoru?', (rng) => buildPosunFaktor({ id: pick(rng, ids(FSHIFT)) }), buildPosunFaktor),
  type('renta-pudy', 'Trh půdy a renta', genRenta, buildRenta),
  type('ekon-renta', 'Ekonomická renta a transferový výdělek', genEkonRenta, buildEkonRenta),
  type('trh-faktoru-firma', 'Rovnováha na trhu faktoru a optimum firmy', genTrhFirma, buildTrhFirma),
  type('soustava-faktoru', 'Ceny faktorů z nákladů dvou výrob', genSoustava, buildSoustava),
  type('ano-ne', 'Pravda, nebo nepravda?', (rng) => buildAnoNe({ id: pick(rng, ids(STATEMENTS)) }), buildAnoNe),
  type('definice', 'Definice pojmů (zkouška)', (rng) => buildDefinice({ id: pick(rng, ids(DEFS)), order: shuffle(rng, [0, 1, 2, 3]) }), buildDefinice),
  type('graf-optimum', 'Nakresli optimum firmy na trhu faktoru (zkouška)', genGrafOptimum, buildGrafOptimum),
  type('graf-monopsonie', 'Nakresli monopsonii (zkouška)', genGrafMonopsonie, buildGrafMonopsonie),
  type('graf-posun-faktor', 'Nakresli posun poptávky po faktoru (zkouška)', (rng) => buildGrafPosunFaktor({ id: pick(rng, ids(FSHIFT)) }), buildGrafPosunFaktor),
  type('graf-puda', 'Nakresli trh půdy (zkouška)', genGrafPuda, buildGrafPuda),
];

// ---------- výklad ----------
const view = (curves, extra = {}) => ({ kind: 'econ', data: { axes: { x: 'A', y: 'Kč' }, domain: [0, 10], range: [0, 100], curves, ...extra } });

const theory = [
  { heading: 'Trh výrobního faktoru a odvozená poptávka', term: 'Odvozená poptávka',
    text: 'Výrobní faktory jsou vstupy do výroby: půda, práce a kapitál. Jejich cenou je renta (půda), mzda (práce) a úrok (kapitál). I na trzích faktorů platí poptávka a nabídka, ale strany jsou prohozené proti trhu zboží: faktory poptávají firmy, nabízejí je domácnosti jako jejich vlastníci.\n\nPoptávka firmy po faktoru je odvozená. Firma nechce faktor kvůli němu samému, ale kvůli produkci, kterou z něj vyrobí. Poptávka po práci v automobilce proto závisí na tom, kolik aut se dá prodat a za jakou cenu. Rovnovážná cena faktoru vzniká jako na trhu zboží: ve střetu tržní poptávky (součet poptávek firem) a tržní nabídky.',
    viz: view([{ expr: '90 - 10*x', label: 'D', color: 'blue' }, { expr: '30 + 5*x', label: 'S', color: 'chalk' }], { points: [{ x: 4, y: 50, label: 'E', guides: true }] }),
    mistakes: ['Poptávka po faktoru není odvozená od ceny samotného faktoru, ale od poptávky po produktu a od produktivity faktoru. Cena faktoru jen určuje, v kterém bodě křivky poptávky se firma nachází.', 'Na trhu faktorů jsou firmy na straně poptávky a domácnosti na straně nabídky. Na trhu zboží je to opačně.'] },
  { heading: 'Mezní produkt a klesající výnosy', term: 'Mezní produkt (MP)',
    text: 'Mezní produkt faktoru je přírůstek produkce, který přinese jedna další jednotka faktoru, zatímco množství ostatních faktorů se nemění. Z tabulky ho spočteme jako rozdíl sousedních hodnot celkového produktu, z produkční funkce jako její derivaci:',
    tex: 'MP=\\frac{\\Delta Q}{\\Delta A}=\\frac{dQ}{dA}',
    viz: view([{ expr: '20 - 2*x', label: 'MP', color: 'blue' }], { axes: { x: 'A', y: 'MP' }, range: [0, 20] }),
    mistakes: ['Mezní produkt není průměrný produkt. MP je přírůstek za poslední jednotku, průměrný produkt je celková produkce dělená počtem jednotek.', 'Klesající mezní produkt neznamená klesající celkovou produkci. Dokud je MP kladný, celková produkce roste, jen stále pomaleji (produkční funkce se zplošťuje).'] },
  { heading: 'Příjem z mezního produktu (MRP)', term: 'Příjem z mezního produktu (MRP)',
    text: 'Firma potřebuje vědět, kolik peněz jí další jednotka faktoru vydělá. Příjem z mezního produktu MRP je dodatečný příjem z prodeje produkce, kterou vyrobila právě tato jednotka. Je to mezní produkt krát mezní příjem z prodeje produktu:',
    tex: 'MRP=MP\\cdot MR',
    viz: view([{ expr: '100 - 10*x', label: 'VMP', color: 'blue' }, { expr: '100 - 18*x', label: 'MRP', color: 'accent' }]),
    mistakes: ['MRP se nerovná mezní příjem MR. Platí MRP = MR krát MP, takže se MRP rovná MR jen při MP rovném jedné.', 'Hodnotu mezního produktu VMP získáme vynásobením MP cenou produktu, nikoli cenou faktoru. Rovnost MRP = P krát MP platí jen při dokonalé konkurenci na trhu produktu, jinak je MRP menší než VMP.'] },
  { heading: 'Mezní náklady na faktor (MFC)', term: 'Mezní náklady na faktor (MFC)',
    text: 'Mezní náklady na faktor MFC jsou přírůstek celkových nákladů firmy při najmutí další jednotky faktoru. Záleží na tom, jak velkou váhu má firma na trhu faktoru:\n\n• Je-li firma jen jedním z mnoha malých kupců (dokonalá konkurence na trhu faktoru), bere cenu faktoru w jako danou. Každá další jednotka stojí stejně, MFC = w a křivka MFC je vodorovná. Je to zároveň nabídka, které firma čelí (dokonale elastická).\n• Je-li firma velkým nebo jediným kupcem (monopsonie), musí kvůli většímu množství zvednout cenu všem najatým jednotkám. Celkové náklady jsou TFC = w(A) krát A a mezní náklady jsou vyšší než cena:',
    tex: 'TFC=w(A)\\cdot A,\\qquad MFC=\\frac{dTFC}{dA}=w+A\\,\\frac{dw}{dA}>w',
    viz: view([{ expr: '40', label: 'MFC = w', color: 'chalk' }]),
    mistakes: ['MFC se rovná ceně faktoru jen v dokonalé konkurenci na trhu faktoru. U firmy s tržní silou (monopsonie) je MFC vyšší než cena.', 'MFC je přírůstek celkových nákladů, nikoli cena, kterou platíme za každou jednotku (té se říká průměrné náklady na faktor).'] },
  { heading: 'Optimální množství faktoru: modifikované zlaté pravidlo', term: 'Modifikované zlaté pravidlo',
    text: 'Firma maximalizující zisk najímá další jednotku faktoru, dokud přinese víc, než stojí:\n\n• MRP > MFC: další jednotka zisk zvyšuje, firma najímá víc,\n• MRP < MFC: poslední jednotka zisk snižuje, firma najímá méně,\n• MRP = MFC: zisk je největší.\n\nTo je modifikované zlaté pravidlo. Odpovídá pravidlu MR = MC z trhu produktu: tam se rozhoduje o množství produktu, zde o množství faktoru. Při dokonalé konkurenci na trhu produktu i faktoru se pravidlo zjednoduší na P krát MP = w.\n\nRovnost MRP = MFC je ale jen nutná podmínka. K maximu zisku musí navíc křivka MRP v bodě optima protínat MFC shora (MRP klesá), jinak jde o minimum zisku. Firma se také musí vyplatit vyrábět vůbec: příjem z produkce musí pokrýt variabilní náklady, mezi něž patří i náklady na tento faktor.',
    tex: 'MRP=MFC\\quad\\Big(\\text{dokonalá konkurence: }P\\cdot MP=w\\Big)',
    viz: view([{ expr: '100 - 10*x', label: 'MRP', color: 'blue' }, { expr: '60', label: 'MFC = w', color: 'chalk' }], { points: [{ x: 4, y: 60, label: 'E', guides: true }], areas: [{ between: ['100 - 10*x', '60'], from: 0, to: 4, label: 'přínos', color: 'green' }] }),
    mistakes: ['MRP = MFC je jen nutná podmínka. Při rostoucím mezním produktu může rovnost odpovídat minimu zisku. Optimum je tam, kde MRP protíná MFC shora.', 'Podmínka určuje, kolik faktoru najmout, pokud se výroba vůbec vyplatí. Při příliš nízké ceně produktu firma nevyrábí a faktor nepoptává.'] },
  { heading: 'Poptávka firmy po faktoru a její posuny', term: 'Poptávka firmy po faktoru',
    text: 'Při jednom proměnném faktoru (ostatní jsou pevné, tedy v krátkém období) je křivka MRP zároveň křivkou poptávky firmy po faktoru: při každé ceně w firma najme množství, kde MRP = w. Použitelná je jen klesající část křivky s kladným mezním produktem.\n\nZměna ceny faktoru je pohyb po křivce. Křivku posouvají jiné činitele:\n\n• změna ceny produktu (tedy poptávky po produktu): mění MRP = P krát MP,\n• změna produktivity faktoru (technologie, lepší vybavení): mění MP,\n• změna množství nebo ceny jiných faktorů, které s ním spolupracují (víc strojů zvýší MP práce).\n\nV dlouhém období se přizpůsobují všechny faktory, takže při změně ceny jednoho faktoru se mění i množství ostatních a posouvá se i jeho MRP. Poptávka po faktoru je pak elastičtější než v krátkém období a křivka MRP jednoho faktoru už neukazuje celou poptávku.',
    viz: view([{ expr: '60 - 10*x', label: 'MRP0', color: 'blue' }, { expr: '100 - 10*x', label: 'MRP1', color: 'accent', dashed: true }, { expr: '20', label: 'w', color: 'chalk' }], { points: [{ x: 4, y: 20, label: 'E0' }, { x: 8, y: 20, label: 'E1' }] }),
    mistakes: ['Změna ceny samotného faktoru křivku poptávky neposune, je to pohyb po ní.', 'Poptávkou po faktoru je jen klesající část MRP s kladným mezním produktem. Část křivky pod osou (záporné MP) žádnou poptávku neznamená.'] },
  { heading: 'Kombinace více faktorů', term: 'Optimální kombinace faktorů',
    text: 'Když firma mění více faktorů naráz (v dlouhém období), musí pro každý z nich platit MRP = MFC. Při dokonalé konkurenci na trzích faktorů to znamená MR krát MP každého faktoru = jeho cena. Po úpravě dostaneme pravidlo:',
    tex: 'MR=\\frac{P_K}{MP_K}=\\frac{P_L}{MP_L}=\\frac{P_A}{MP_A}\\ \\Leftrightarrow\\ \\frac{MP_K}{P_K}=\\frac{MP_L}{P_L}=\\frac{MP_A}{P_A}=\\frac{1}{MR}',
    mistakes: ['Neporovnáváme mezní produkty faktorů mezi sebou, ale jejich poměry k ceně. Faktor s největším MP nemusí být nejvýhodnější, může být drahý.', 'Pravidlo v této podobě platí při dokonalé konkurenci na trzích faktorů. Má-li firma tržní sílu na trhu faktoru, dosadí se místo ceny MFC.'] },
  { heading: 'Rovnováha na trhu faktoru a monopsonie', term: 'Monopsonie',
    text: 'Na trhu faktoru vzniká cena střetem tržní poptávky (součet křivek MRP firem) a tržní nabídky. Jednotlivá malá firma tržní cenu přijímá jako danou, tedy MFC = w.\n\nMonopsonie je trh s jediným kupcem faktoru (například jediný velký zaměstnavatel v malém městě). Firma čelí celé rostoucí nabídce, a proto je MFC větší než cena. Postup je dvoukrokový: množství najdeme z MRP = MFC, cenu ale odečteme z křivky nabídky při tomto množství. Monopsonista tak najímá méně faktoru a platí nižší cenu než firma na dokonale konkurenčním trhu faktoru, kde se MRP rovná nabídce. Při lineární nabídce w = c + dA je MFC = c + 2dA.',
    viz: view([{ expr: '100 - 10*x', label: 'MRP', color: 'blue' }, { expr: '10 + 10*x', label: 'S', color: 'chalk' }, { expr: '10 + 20*x', label: 'MFC', color: 'accent' }], { points: [{ x: 3, y: 70, label: 'M', guides: true }, { x: 3, y: 40, label: 'W', guides: true }, { x: 4.5, y: 55, label: 'C', guides: true }] }),
    mistakes: ['Cenu monopsonisty nečteme z MFC, ale z nabídky. MFC rozhoduje jen o tom, kolik jednotek se najme.', 'Monopsonie je jediný kupující, monopol jediný prodávající. Snadno se zaměňují.'] },
  { heading: 'Trh půdy a ekonomická renta', term: 'Ekonomická renta',
    text: 'Půda je výrobní faktor, jehož celková nabídka je dána přírodou. Křivka nabídky půdy jako celku je proto svislá: množství nezávisí na ceně. Rentu pak určuje jen poptávka: čím víc jsou firmy ochotny platit, tím vyšší renta. Při poptávce R = a − bT a pevné nabídce T je rovnovážná renta R = a − bT.\n\nPozor: pro jedno konkrétní použití (vinice, parkoviště) svislá není, protože půdu lze přesunout k jinému využití. Čím vyšší renta, tím víc půdy se nabídne tomuto využití.\n\nEkonomická renta je platba faktoru nad minimum, které je nutné k tomu, aby ho vlastník v daném použití nabízel. Toto minimum je transferový výdělek (hodnota nejlepšího alternativního použití). U půdy bez jiného využití je transferový výdělek nulový, a celá renta je proto ekonomická renta. Ekonomická renta vzniká u každého faktoru s rostoucí nabídkou: je to plocha mezi cenou a křivkou nabídky.\n\nDůsledek: při dokonale pevné nabídce půdy daň z renty množství půdy nezmění. Cena pozemku odpovídá přibližně současné hodnotě budoucích rent, při stálé rentě je to renta dělená úrokovou mírou.',
    viz: view([{ expr: '100 - 10*x', label: 'D', color: 'blue' }, vertical(6, 'S')], { axes: { x: 'T', y: 'R' }, points: [{ x: 6, y: 40, label: 'E', guides: true }] }),
    mistakes: ['Renta v ekonomii není jen nájem bytu. Je to cena půdy a také obecně platba faktoru nad nutné minimum (ekonomická renta).', 'Svislá je nabídka půdy jako celku, ne nabídka půdy pro jedno konkrétní využití.'] },
];

export default {
  id: 'faktory', title: 'Trhy výrobních faktorů', order: 7, theory, types,
};
