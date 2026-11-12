// Vstup aplikace: router, postranní seznam témat, obrazovky. Přihlášení (úkol 3), procvičování (úkol 4)
// a zkouškový režim (úkol 9) se doplní do těchto bodů: viewPractice, viewExam, enterApp.
import { setTexEngine, renderTex, renderText, h } from './render.js';
import { parseRoute, routeHref, examHref, FORMULAS_HREF, TABS } from './router.js';
import { renderTheory } from './ui/theory.js';
import { mountStepper } from './ui/stepper.js';
import { stepVisual, disposeStepVisual } from './viz/step.js';
import { topics as courseTopics, sortTopics } from './topics/index.js';
import { makeRng, randomSeed } from './rng.js';
import { equilibrium } from './econ.js';
import { drawEcon } from './viz/econ.js';
import { demandExpr, supplyExpr } from './topics/lib.js';
import { czText } from './topics/lib.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { initAuth, currentUser, signOut, onAuthEvent } from './auth.js';
import { initProgress, setProgressUser, flushQueue, topicStats, recommendNext, listExams } from './progress.js';
import { renderFormulas } from './ui/formulas.js';
import { initContent, loadFixedProblems } from './content.js';
import { mountPractice, buildFixedProblem, FIXED_TYPE, FIXED_TITLE } from './ui/practice.js';
import { renderLogin, renderNewPassword } from './ui/login.js';
import { mountExam } from './ui/exam.js';
import { EXAMS } from './exam.js';

const doc = document;
const $ = (sel) => doc.querySelector(sel);
const topics = sortTopics(courseTopics);
const APP_NAME = 'Mikroekonomie 1';

const TAB_ICONS = {
  vyklad: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13z',
  procvicovani: 'M15.2 4.8l4 4L9 19H5v-4zM13 7l4 4',
  postup: 'M4 19h5v-5h5V9h6M4 19v1M20 9V4',
};

function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  const path = doc.createElementNS(NS, 'path');
  path.setAttribute('d', TAB_ICONS[name]);
  svg.appendChild(path);
  return svg;
}

function renderTopicList(route) {
  const list = $('#topic-list');
  list.textContent = '';
  topics.forEach((t, i) => {
    const current = route.name === 'topic' && route.id === t.id;
    list.appendChild(h(doc, 'li', {}, [
      h(doc, 'a', { href: routeHref(t.id, current ? route.tab : 'vyklad'), 'aria-current': current ? 'page' : null }, [
        h(doc, 'span', { class: 'topic-num', text: String(i + 1) }),
        h(doc, 'span', { class: 'topic-name', text: t.title }),
      ]),
    ]));
  });
}

function renderExtraNav(route) {
  const nav = $('#extra-nav');
  nav.textContent = '';
  const items = [
    { href: examHref('zapocet'), text: 'Zápočtový test', active: route.name === 'exam' && route.kind === 'zapocet' },
    { href: examHref('zkouska'), text: 'Zkouška', active: route.name === 'exam' && route.kind === 'zkouska' },
    { href: FORMULAS_HREF, text: 'Vzorce', active: route.name === 'formulas' },
  ];
  for (const it of items) {
    nav.appendChild(h(doc, 'a', { href: it.href, text: it.text, 'aria-current': it.active ? 'page' : null }));
  }
}

// Na telefonu je to spodní lišta, na počítači řada záložek pod nadpisem tématu.
function renderTabs(route) {
  const nav = h(doc, 'nav', { class: 'tabs', 'aria-label': 'Části tématu' });
  for (const tab of TABS) {
    nav.appendChild(h(doc, 'a', {
      href: routeHref(route.id, tab.id),
      class: 'tab',
      'aria-current': route.tab === tab.id ? 'page' : null,
    }, [icon(tab.id), h(doc, 'span', { text: tab.label })]));
  }
  return nav;
}

const soon = (text) => h(doc, 'p', { class: 'empty', text });

// ---------- domů ----------
const SVG_NS = 'http://www.w3.org/2000/svg';
const BASE_MARKET = { a: 100, b: 2, c: 10, d: 1 }; // Q_D = 100 − 2P, Q_S = 10 + P → E = (Q 40, P 30)
const ZAPOCET = { date: new Date(2026, 11, 14), label: '14. 12. 2026' };

function daysUntil(date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date - today) / 86400000);
}

function remainingText(days) {
  if (days > 4) return `zbývá ${days} dní`;
  if (days > 1) return `zbývají ${days} dny`;
  if (days === 1) return 'zbývá 1 den';
  return days === 0 ? 'je dnes' : 'už proběhl';
}

const trendWord = (v) => (v === 0 ? 'beze změny' : v > 0 ? 'roste' : 'klesá');

// Živý graf: dva posuvníky posouvají poptávku a nabídku a ukazují, kam se přesune rovnováha.
function liveMarket() {
  const e0 = equilibrium(BASE_MARKET);
  const svg = doc.createElementNS(SVG_NS, 'svg');
  const box = h(doc, 'section', { class: 'live', 'aria-label': 'Živý graf trhu' });
  const plot = h(doc, 'div', { class: 'live-plot' }, svg);
  const statP = h(doc, 'div', { class: 'stat' });
  const statQ = h(doc, 'div', { class: 'stat' });

  function slider(kind, label, min, max) {
    const id = `live-${kind}`;
    const out = h(doc, 'output', { for: id, 'aria-live': 'polite', text: trendWord(0) });
    const input = h(doc, 'input', { type: 'range', id, min: String(min), max: String(max), step: '5', value: '0' });
    const row = h(doc, 'div', { class: `slider slider-${kind}` }, [
      h(doc, 'label', { for: id }, [h(doc, 'span', {}, [h(doc, 'span', { class: 'dot' }), label]), out]),
      input,
    ]);
    return { row, input, out };
  }
  const dem = slider('d', 'Poptávka', -30, 40);
  const sup = slider('s', 'Nabídka', -30, 30);

  // Čísla se ukazují na desetiny (rovnováha při posunu nemusí vyjít celá).
  const tenth = (v) => Math.round(v * 10) / 10;
  function stat(el, name, value, base) {
    const delta = tenth(value - base);
    el.textContent = '';
    el.append(h(doc, 'small', { text: name }), h(doc, 'b', { text: czText(tenth(value)) }));
    if (delta !== 0) el.append(h(doc, 'i', { text: `${delta > 0 ? '+' : '−'}${czText(Math.abs(delta))}` }));
  }

  function update() {
    const dv = Number(dem.input.value); const sv = Number(sup.input.value);
    const a = BASE_MARKET.a + dv; const c = BASE_MARKET.c + sv;
    const e = equilibrium({ a, b: BASE_MARKET.b, c, d: BASE_MARKET.d });
    const moved = dv !== 0 || sv !== 0;
    drawEcon(svg, {
      axes: { x: 'Q', y: 'P' }, domain: [0, 150], range: [0, 75],
      curves: [
        ...(moved ? [
          { expr: demandExpr(BASE_MARKET.a, BASE_MARKET.b), color: 'accent', dashed: true },
          { expr: supplyExpr(BASE_MARKET.c, BASE_MARKET.d), color: 'accent', dashed: true },
        ] : []),
        { expr: demandExpr(a, BASE_MARKET.b), label: 'D', color: 'blue' },
        { expr: supplyExpr(c, BASE_MARKET.d), label: 'S', color: 'chalk' },
      ],
      points: [{ x: e.Q, y: e.P, label: 'E', guides: true }],
      alt: `Rovnováha na trhu: cena ${czText(tenth(e.P))}, množství ${czText(tenth(e.Q))}`,
    });
    dem.out.textContent = trendWord(dv);
    sup.out.textContent = trendWord(sv);
    stat(statP, 'Rovnovážná cena', e.P, e0.P);
    stat(statQ, 'Rovnovážné množství', e.Q, e0.Q);
  }
  dem.input.addEventListener('input', update);
  sup.input.addEventListener('input', update);
  box.append(plot, h(doc, 'div', { class: 'live-controls' }, [dem.row, sup.row]), h(doc, 'div', { class: 'live-readout' }, [statP, statQ]));
  update();
  return box;
}

function viewHome(main) {
  main.appendChild(h(doc, 'header', { class: 'hero' }, [
    h(doc, 'h1', { text: APP_NAME }),
    h(doc, 'p', { text: 'Posuň poptávku nebo nabídku a sleduj, kam se přesune rovnováha. Potom si vyber téma.' }),
    liveMarket(),
  ]));

  const days = daysUntil(ZAPOCET.date);
  main.appendChild(h(doc, 'div', { class: 'exams' }, [
    h(doc, 'a', { class: 'exam-card', href: examHref('zapocet') }, [
      h(doc, 'div', { class: 'when', text: `Zápočtový test ${ZAPOCET.label}, ${remainingText(days)}` }),
      h(doc, 'div', { class: 'big' }, ['30', h(doc, 'span', { text: ' z 50 bodů' })]),
      h(doc, 'p', { text: 'Počítané příklady ze cvičení, 50 minut.' }),
    ]),
    h(doc, 'a', { class: 'exam-card', href: examHref('zkouska') }, [
      h(doc, 'div', { class: 'when', text: 'Zkouška' }),
      h(doc, 'div', { class: 'big' }, ['12', h(doc, 'span', { text: ' z 20 bodů' })]),
      h(doc, 'p', { text: 'Grafy, vztahy a definice ze všech témat, 50 minut.' }),
    ]),
  ]));

  main.appendChild(h(doc, 'h2', { class: 'section-title', text: 'Témata' }));
  const rows = h(doc, 'ul', { class: 'topic-rows' });
  topics.forEach((t, i) => {
    rows.appendChild(h(doc, 'li', {}, h(doc, 'a', { class: 'topic-row', href: routeHref(t.id) }, [
      h(doc, 'span', { class: 'topic-num', text: String(i + 1) }),
      h(doc, 'span', { class: 'topic-name', text: t.title }),
    ])));
  });
  main.appendChild(rows);
  main.appendChild(h(doc, 'p', { class: 'home-links' }, h(doc, 'a', { href: FORMULAS_HREF, text: 'Přehled vzorců' })));
  if (!isGuest) addProgress(main, rows);
}

// Přihlášený uživatel: úspěšnost po tématech, doporučení a poslední zkoušky (z databáze, jen jeho vlastní).
function addProgress(main, rows) {
  topicStats().then((stats) => {
    if (!main.isConnected || stats.length === 0) return;
    const withContent = topics.filter((t) => t.types.length > 0).map((t) => t.id);
    const links = rows.querySelectorAll('.topic-row');
    topics.forEach((t, i) => {
      const st = stats.find((x) => x.topic === t.id);
      if (!st || !links[i]) return;
      links[i].appendChild(h(doc, 'span', { class: 'topic-meta', text: `${st.tried} pokusů, ${Math.round(st.correctRate * 100)} % správně` }));
    });
    const next = topics.find((t) => t.id === recommendNext(stats, withContent));
    if (next) {
      main.insertBefore(h(doc, 'p', { class: 'recommend' }, [
        'Doporučení: procvič téma ', h(doc, 'a', { href: routeHref(next.id, 'procvicovani'), text: next.title }), '.',
      ]), main.querySelector('.section-title'));
    }
  }).catch(() => {});
  listExams().then((list) => {
    if (!main.isConnected || list.length === 0) return;
    const box = h(doc, 'section', { class: 'recent-exams' }, [h(doc, 'h2', { class: 'section-title', text: 'Poslední testy nanečisto' })]);
    for (const r of list.slice(0, 3)) {
      const when = new Date(r.created_at).toLocaleDateString('cs-CZ');
      box.appendChild(h(doc, 'p', { text: `${EXAMS[r.kind]?.title ?? r.kind}, ${when}: ${czText(Number(r.points))} z ${czText(Number(r.max_points))} b` }));
    }
    main.appendChild(box);
  }).catch(() => {});
}

function viewNotFound(main) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: 'Stránka neexistuje' }));
  main.appendChild(h(doc, 'p', {}, [
    'Adresa neodpovídá žádnému tématu. ',
    h(doc, 'a', { href: '#/', text: 'Zpět na seznam témat' }),
  ]));
}

function viewFormulas(main) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: 'Přehled vzorců' }));
  const body = h(doc, 'div', { class: 'formulas' });
  main.appendChild(body);
  renderFormulas(body);
}

function viewPlaceholder(main, title, text) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: title }));
  main.appendChild(soon(text));
}

let activeStepper = null; // krokovač v Postupu; při novém příkladu nebo odchodu se uvolní
let activeExam = null;    // rozpracovaný test; při odchodu se zastaví jeho časovač

function viewExam(main, kind) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: EXAMS[kind].title }));
  const box = h(doc, 'div', { class: 'exam' });
  main.appendChild(box);
  activeExam = mountExam(box, kind, { topics });
}

// Postup krok za krokem: příklad zvoleného typu (type.generate(rng) vrací celý příklad),
// nebo pevný příklad z cvičebnice (FIXED_TYPE, seed = pořadí v seznamu). Řešení se ukáže na tabuli.
function viewPostup(body, topic, query = {}) {
  const types = Array.isArray(topic.types) ? topic.types : [];
  if (types.length === 0) { body.appendChild(soon('Řešené postupy k tomuto tématu se připravují.')); return; }
  let type = types.find((t) => t.id === query.type) || types[0];
  let fixedMode = query.type === FIXED_TYPE;
  let fixed = [];
  let fixedIndex = fixedMode && Number.isInteger(query.seed) ? query.seed : 0;
  let fixedSeed = !fixedMode && Number.isInteger(query.seed) ? query.seed : null; // příklad z procvičování (jen poprvé)
  const picker = h(doc, 'div', { class: 'type-picker', role: 'group', 'aria-label': 'Typ příkladu' });
  const prompt = h(doc, 'div', { class: 'prompt' });
  const stepperEl = h(doc, 'div');
  const again = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', text: 'Jiný příklad' });

  function mark() {
    [...picker.children].forEach((b) => b.setAttribute('aria-pressed',
      String(fixedMode ? b.dataset.type === FIXED_TYPE : b.dataset.type === type.id)));
  }

  function show() {
    let problem;
    let label;
    try {
      if (fixedMode) {
        if (!fixed.length) { prompt.textContent = 'Načítám příklady ze cvičebnice…'; stepperEl.textContent = ''; mark(); return; }
        problem = buildFixedProblem(topic, fixed, fixedIndex);
        label = `${FIXED_TITLE}: ${problem.seed + 1} z ${fixed.length}${problem.source ? ` · ${problem.source}` : ''}`;
      } else {
        const seed = fixedSeed ?? randomSeed();
        fixedSeed = null;
        problem = type.generate(makeRng(seed));
        label = type.title;
      }
    } catch {
      prompt.textContent = 'Příklad se nepodařilo vytvořit. Zkuste „Jiný příklad“.';
      stepperEl.textContent = '';
      return;
    }
    prompt.textContent = '';
    prompt.appendChild(h(doc, 'p', { class: 'prompt-label', text: label }));
    if (problem.task) prompt.appendChild(renderText(h(doc, 'div', { class: 'prompt-task prose' }), problem.task));
    if (problem.promptTex) {
      const f = h(doc, 'div', { class: 'formula' });
      renderTex(f, problem.promptTex, { display: true });
      prompt.appendChild(f);
    }
    activeStepper?.destroy();
    activeStepper = mountStepper(stepperEl, problem.solution, { renderStepVisual: stepVisual, disposeStepVisual });
    mark();
  }
  for (const t of types) {
    picker.appendChild(h(doc, 'button', {
      type: 'button', class: 'chip', 'data-type': t.id, text: t.title,
      onclick: () => { type = t; fixedMode = false; show(); },
    }));
  }
  again.addEventListener('click', () => {
    if (fixedMode && fixed.length) fixedIndex = (fixedIndex + 1) % fixed.length;
    show();
  });
  body.append(...[types.length > 1 ? picker : null, prompt, stepperEl, h(doc, 'div', { class: 'actions' }, again)].filter(Boolean));
  show();
  // Pevné příklady ze cvičebnice (jen když nějaké jsou) přibudou jako další volba.
  loadFixedProblems(topic.id).then((list) => {
    if (!body.isConnected) return;
    fixed = list;
    if (!list.length) { if (fixedMode) { fixedMode = false; show(); } return; }
    picker.appendChild(h(doc, 'button', {
      type: 'button', class: 'chip', 'data-type': FIXED_TYPE, text: FIXED_TITLE,
      onclick: () => { fixedMode = true; fixedIndex = 0; show(); },
    }));
    if (!picker.isConnected) body.insertBefore(picker, prompt);
    if (fixedMode) show(); else mark();
  });
}

function viewTopic(main, route) {
  const topic = topics.find((t) => t.id === route.id);
  if (!topic) return viewNotFound(main);
  main.appendChild(h(doc, 'a', { href: '#/', class: 'back' }, 'Všechna témata'));
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: topic.title }));
  main.appendChild(renderTabs(route));
  const body = h(doc, 'div', { class: 'tab-body' });
  main.appendChild(body);
  if (route.tab === 'vyklad') renderTheory(body, topic);
  else if (route.tab === 'postup') viewPostup(body, topic, route.query);
  else {
    const practice = mountPractice(body, topic);
    loadFixedProblems(topic.id).then((list) => { if (body.isConnected) practice.setFixed(list); });
  }
}

function render() {
  const route = parseRoute(location.hash);
  const main = $('#main');
  activeStepper?.destroy();
  activeStepper = null;
  activeExam?.destroy();
  activeExam = null;
  main.textContent = '';
  doc.body.dataset.route = route.name;
  renderTopicList(route);
  renderExtraNav(route);
  if (route.name === 'home') viewHome(main);
  else if (route.name === 'topic') viewTopic(main, route);
  else if (route.name === 'exam') viewExam(main, route.kind);
  else if (route.name === 'formulas') viewFormulas(main);
  else viewNotFound(main);
  let title = null;
  if (route.name === 'topic') title = topics.find((x) => x.id === route.id)?.title;
  else if (route.name === 'exam') title = route.kind === 'zapocet' ? 'Zápočtový test' : 'Zkouška';
  else if (route.name === 'formulas') title = 'Přehled vzorců';
  doc.title = title ? `${title} – ${APP_NAME}` : APP_NAME;
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

let isGuest = true; // host: pokrok se neukládá

function renderAccount(user) {
  const box = $('#account');
  box.textContent = '';
  if (!user) return;
  box.append(
    h(doc, 'span', { class: 'account-mail', text: user.email }),
    h(doc, 'button', {
      type: 'button', class: 'link-btn', text: 'Odhlásit se',
      onclick: async () => { await signOut(); location.reload(); },
    }),
  );
}

function enterApp(user) {
  isGuest = !user;
  setProgressUser(user?.id ?? null); // host (null): nic se neukládá ani nefrontuje
  delete doc.body.dataset.auth;
  renderAccount(user);
  render();
}

function showNewPassword() {
  doc.body.dataset.auth = 'login';
  doc.title = `Nové heslo – ${APP_NAME}`;
  const main = $('#main');
  renderNewPassword(main, {
    onDone: async () => { location.hash = '#/'; await flushQueue(); enterApp(await currentUser()); },
  });
  main.focus({ preventScroll: true });
}

function showLogin(configured) {
  doc.body.dataset.auth = 'login';
  doc.title = `Přihlášení – ${APP_NAME}`;
  const main = $('#main');
  renderLogin(main, {
    configured,
    onLogin: async () => { const u = await currentUser(); setProgressUser(u?.id); await flushQueue(); enterApp(u); },
    onGuest: () => enterApp(null),
  });
  main.focus({ preventScroll: true });
}

// Bez vyplněného js/config.js se klient nevytváří a aplikace nabídne režim bez přihlášení.
async function setupAccount() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    initProgress(null);
    return showLogin(false);
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    initAuth(client);
    initProgress(client);
    initContent(client);
    window.addEventListener('online', flushQueue);
    let recovering = false;
    onAuthEvent((event) => { if (event === 'PASSWORD_RECOVERY') { recovering = true; showNewPassword(); } });
    const user = await currentUser();
    if (recovering) return;
    if (user) { setProgressUser(user.id); flushQueue(); return enterApp(user); }
    showLogin(true);
  } catch {
    initProgress(null);
    showLogin(false);
  }
}

async function start() {
  try {
    const katex = await import('katex');
    setTexEngine(katex.default || katex);
  } catch {
    setTexEngine(null); // bez KaTeXu se vzorce ukážou jako text
  }
  await setupAccount();
}

window.addEventListener('hashchange', () => { if (doc.body.dataset.auth !== 'login') render(); });
start();
