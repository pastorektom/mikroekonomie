// Vstup aplikace: router, postranní seznam témat, obrazovky. Přihlášení (úkol 3), procvičování (úkol 4)
// a zkouškový režim (úkol 9) se doplní do těchto bodů: viewPractice, viewExam, enterApp.
import { setTexEngine, h } from './render.js';
import { parseRoute, routeHref, examHref, FORMULAS_HREF, TABS } from './router.js';
import { renderTheory } from './ui/theory.js';
import { mountStepper } from './ui/stepper.js';
import { stepVisual, disposeStepVisual } from './viz/step.js';
import { topics as courseTopics, sortTopics } from './topics/index.js';
import { makeRng, randomSeed } from './rng.js';

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

function viewHome(main) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: APP_NAME }));
  main.appendChild(h(doc, 'p', { class: 'lead', text: 'Vyberte téma. Výklad, procvičování a řešené postupy najdete uvnitř každého tématu.' }));
  const grid = h(doc, 'div', { class: 'topic-cards' });
  topics.forEach((t, i) => {
    grid.appendChild(h(doc, 'a', { class: 'topic-card', href: routeHref(t.id) }, [
      h(doc, 'span', { class: 'topic-num', text: String(i + 1) }),
      h(doc, 'span', { class: 'topic-name', text: t.title }),
    ]));
  });
  main.appendChild(grid);
  main.appendChild(h(doc, 'p', { class: 'home-links' }, [
    h(doc, 'a', { href: examHref('zapocet'), text: 'Zápočtový test' }), ' · ',
    h(doc, 'a', { href: examHref('zkouska'), text: 'Zkouška' }), ' · ',
    h(doc, 'a', { href: FORMULAS_HREF, text: 'Vzorce' }),
  ]));
}

function viewNotFound(main) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: 'Stránka neexistuje' }));
  main.appendChild(h(doc, 'p', {}, [
    'Adresa neodpovídá žádnému tématu. ',
    h(doc, 'a', { href: '#/', text: 'Zpět na seznam témat' }),
  ]));
}

function viewPlaceholder(main, title, text) {
  main.appendChild(h(doc, 'h1', { class: 'page-title', text: title }));
  main.appendChild(soon(text));
}

let activeStepper = null; // krokovač v Postupu; při novém příkladu nebo odchodu se uvolní

// Postup krok za krokem: vylosuje příklad zvoleného typu a ukáže jeho řešení na tabuli.
function viewPostup(body, topic) {
  const types = Array.isArray(topic.types) ? topic.types : [];
  if (types.length === 0) { body.appendChild(soon('Řešené postupy k tomuto tématu se připravují.')); return; }
  let type = types[0];
  const picker = h(doc, 'div', { class: 'type-picker', role: 'group', 'aria-label': 'Typ příkladu' });
  const prompt = h(doc, 'div', { class: 'prompt' });
  const stepperEl = h(doc, 'div');
  const again = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', text: 'Jiný příklad' });
  function show() {
    let problem;
    try { problem = type.solve(type.generate(makeRng(randomSeed()))); } catch {
      prompt.textContent = 'Příklad se nepodařilo vytvořit. Zkuste „Jiný příklad“.';
      stepperEl.textContent = '';
      return;
    }
    prompt.textContent = '';
    prompt.appendChild(h(doc, 'p', { class: 'prompt-label', text: type.title }));
    if (problem.task) prompt.appendChild(h(doc, 'div', { class: 'prompt-task', text: problem.task }));
    activeStepper?.destroy();
    activeStepper = mountStepper(stepperEl, problem.solution, { renderStepVisual: stepVisual, disposeStepVisual });
    [...picker.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === type.id)));
  }
  for (const t of types) {
    picker.appendChild(h(doc, 'button', {
      type: 'button', class: 'chip', 'data-type': t.id, text: t.title,
      onclick: () => { type = t; show(); },
    }));
  }
  again.addEventListener('click', show);
  body.append(...[types.length > 1 ? picker : null, prompt, stepperEl, h(doc, 'div', { class: 'actions' }, again)].filter(Boolean));
  show();
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
  else if (route.tab === 'postup') viewPostup(body, topic);
  else body.appendChild(soon('Procvičování se připravuje.')); // úkol 4: mountPractice
}

function render() {
  const route = parseRoute(location.hash);
  const main = $('#main');
  activeStepper?.destroy();
  activeStepper = null;
  main.textContent = '';
  doc.body.dataset.route = route.name;
  renderTopicList(route);
  renderExtraNav(route);
  if (route.name === 'home') viewHome(main);
  else if (route.name === 'topic') viewTopic(main, route);
  else if (route.name === 'exam') viewPlaceholder(main, route.kind === 'zapocet' ? 'Zápočtový test' : 'Zkouška', 'Zkouškový režim se připravuje.');
  else if (route.name === 'formulas') viewPlaceholder(main, 'Přehled vzorců', 'Přehled vzorců se připravuje.');
  else viewNotFound(main);
  let title = null;
  if (route.name === 'topic') title = topics.find((x) => x.id === route.id)?.title;
  else if (route.name === 'exam') title = route.kind === 'zapocet' ? 'Zápočtový test' : 'Zkouška';
  else if (route.name === 'formulas') title = 'Přehled vzorců';
  doc.title = title ? `${title} – ${APP_NAME}` : APP_NAME;
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function start() {
  try {
    const katex = await import('katex');
    setTexEngine(katex.default || katex);
  } catch {
    setTexEngine(null); // bez KaTeXu se vzorce ukážou jako text
  }
  render();
}

window.addEventListener('hashchange', render);
start();
