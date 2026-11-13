import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { makeRng, randomSeed } from '../js/rng.js';
import { mountPractice } from '../js/ui/practice.js';
import { matrixInput } from '../js/ui/inputs.js';
import { parseRoute, routeHref } from '../js/router.js';
import { registerViz } from '../js/viz/index.js';

// Zkušební grafický modul: nakreslí cestu, když dostane obor; jinak nic.
registerViz('plot', {
  draw(svg, data) {
    if (!data || !data.domain) return false;
    svg.appendChild(svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path'));
    return true;
  },
});

function setup(extra = {}, topicOver = {}) {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  const el = window.document.getElementById('r');
  const calls = [];
  const nav = [];
  const topic = {
    id: 't', title: 'T', order: 1, theory: [],
    types: [
      { id: 'a', title: 'Typ A', generate(rng) {
        const n = 1 + Math.floor(rng() * 1000);
        return { id: `a-${n}`, topic: 't', type: 'a', seed: 0, promptTex: `${n}+2`, answerSpec: { kind: 'number', value: n + 2 }, solution: [{ title: 'k', text: 'x' }] };
      } },
      { id: 'm', title: 'Tabulka', generate() {
        return { id: 'm', topic: 't', type: 'm', seed: 0, promptTex: 'I', answerSpec: { kind: 'table', value: [['1', '0'], ['0', '1']] }, solution: [] };
      } },
    ],
    ...topicOver,
  };
  const p = mountPractice(el, topic, {
    record: (a) => { calls.push(a); return Promise.resolve({}); },
    navigate: (r) => nav.push(r),
    rng: makeRng(7),
    ...extra,
  });
  const q = (s) => el.querySelector(s);
  const type = (v) => { const i = q('[data-role="answer"] input'); i.value = v; return i; };
  const click = (role) => q(`[data-role="${role}"]`).click();
  return { window, el, calls, nav, p, q, type, click };
}

test('špatná odpověď: zapíše se correct:false a příklad zůstane', () => {
  const { calls, q, type, click } = setup();
  q('[data-role="type-a"]').click();
  const before = q('.prompt').textContent;
  type('0');
  click('check');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].correct, false);
  assert.equal(calls[0].topic, 't');
  assert.equal(calls[0].type, 'a');
  assert.equal(typeof calls[0].ms, 'number');
  assert.equal(q('.prompt').textContent, before);
  assert.match(q('[data-role="feedback"]').textContent, /Zatím ne – zkus to znovu\./);
  assert.equal(q('[data-role="feedback"]').getAttribute('aria-live'), 'polite');
});

test('správná odpověď: Správně! a zápis correct:true', () => {
  const { calls, q, type, click, p } = setup();
  q('[data-role="type-a"]').click();
  const n = Number(q('.prompt').textContent.match(/(\d+)\+2/)[1]);
  type(String(n + 2));
  click('check');
  assert.equal(calls[0].correct, true);
  assert.match(q('[data-role="feedback"]').textContent, /Správně!/);
  assert.equal(calls[0].seed, p.problem.seed);
});

test('Enter odešle odpověď', () => {
  const { calls, window, type } = setup();
  const i = type('1');
  i.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(calls.length, 1);
});

test('syntaktická chyba se nezapisuje', () => {
  const { calls, q, type, click } = setup();
  q('[data-role="type-a"]').click();
  type('2+*(');
  click('check');
  assert.equal(calls.length, 0);
  assert.match(q('[data-role="feedback"]').textContent, /Tomu zápisu nerozumím/);
});

test('prázdná odpověď se nezapisuje', () => {
  const { calls, click } = setup();
  click('check');
  assert.equal(calls.length, 0);
});

test('Ukaž výsledek: zápis jako nezodpovězený (correct:false, revealed:true), ne správně', () => {
  const { calls, q, click } = setup();
  q('[data-role="type-a"]').click();
  click('reveal');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].correct, false);
  assert.equal(JSON.parse(calls[0].answer).revealed, true);
  assert.ok(q('[data-role="reveal-box"]').textContent.length > 0);
  assert.doesNotMatch(q('[data-role="feedback"]').textContent, /Správně/);
});

test('Další příklad vytvoří nový příklad s jiným seedem', () => {
  const { p, click } = setup();
  const s1 = p.problem.seed;
  click('next');
  assert.notEqual(p.problem.seed, s1);
});

test('Ukaž postup předá téma, seed a typ', () => {
  const { p, nav, click } = setup();
  click('solution');
  assert.deepEqual(nav, [{ id: 't', seed: p.problem.seed, type: p.problem.type }]);
});

test('stejný seed dá stejný příklad (výběr typu je funkcí seedu)', () => {
  const a = setup({ rng: makeRng(5) });
  const b = setup({ rng: makeRng(5) });
  assert.equal(a.q('.prompt').textContent, b.q('.prompt').textContent);
  assert.equal(a.p.problem.seed, b.p.problem.seed);
});

test('tabulka: mřížka políček a odpověď jako pole polí', () => {
  const { calls, q, click } = setup();
  q('[data-role="type-m"]').click();
  const cells = [...q('[data-role="answer"]').querySelectorAll('input')];
  assert.equal(cells.length, 4);
  ['1', '0', '0', '1'].forEach((v, i) => { cells[i].value = v; });
  click('check');
  assert.equal(calls[0].correct, true);
});

test('matrixInput(rows, cols)', () => {
  const { window } = new JSDOM('<!doctype html><body></body>');
  const m = matrixInput(2, 3, window.document);
  const cells = m.el.querySelectorAll('input');
  assert.equal(cells.length, 6);
  cells[4].value = '7';
  assert.deepEqual(m.getValue(), [['', '', ''], ['', '7', '']]);
  for (const c of cells) {
    assert.equal(c.getAttribute('autocapitalize'), 'off');
    assert.equal(c.getAttribute('autocomplete'), 'off');
    assert.equal(c.getAttribute('spellcheck'), 'false');
  }
});


test('rng: makeRng je deterministický a v [0,1)', () => {
  const a = makeRng(42); const b = makeRng(42);
  const xs = Array.from({ length: 5 }, a); const ys = Array.from({ length: 5 }, b);
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(xs, Array.from({ length: 5 }, makeRng(43)));
  const s = randomSeed();
  assert.ok(Number.isInteger(s) && s >= 0);
});

test('router: query seed a type', () => {
  assert.deepEqual(parseRoute('#/tema/m/postup?seed=12&type=a'), { name: 'topic', id: 'm', tab: 'postup', query: { seed: 12, type: 'a' } });
  assert.deepEqual(parseRoute('#/tema/m/postup'), { name: 'topic', id: 'm', tab: 'postup' });
  assert.equal(routeHref('m', 'postup', { seed: 12, type: 'a' }), '#/tema/m/postup?seed=12&type=a');
});


test('po správné odpovědi je Ukaž výsledek zakázáno a nezapíše druhý pokus', () => {
  const { calls, q, type, click } = setup();
  q('[data-role="type-a"]').click();
  const n = Number(q('.prompt').textContent.match(/(\d+)\+2/)[1]);
  type(String(n + 2));
  click('check');
  assert.equal(q('[data-role="reveal"]').disabled, true);
  click('reveal');
  assert.equal(calls.length, 1);
  assert.equal(q('[data-role="solution"]').disabled, false);
});

test('tabulka s prázdným políčkem se nezapíše', () => {
  const { calls, q, click } = setup();
  q('[data-role="type-m"]').click();
  q('[data-role="answer"] input').value = '1';
  click('check');
  assert.equal(calls.length, 0);
  assert.match(q('[data-role="feedback"]').textContent, /Nejdřív něco zadej/);
});


test('promptViz: graf pod zadáním v rámu tabule, u dalšího příkladu se uvolní', () => {
  let n = 0;
  const { el, q, click } = setup({}, { types: [{ id: 'g', title: 'Graf', generate() {
    n++;
    const viz = n === 1 ? { kind: 'plot', data: { domain: [-2, 2], functions: [{ expr: 'x^2' }] } } : undefined;
    return { id: `g${n}`, topic: 't', type: 'g', seed: 0, promptTex: 'f(x)=x^2', answerSpec: { kind: 'number', value: 1 }, solution: [], promptViz: viz };
  } }] });
  const frame = q('.prompt .board.viz-board');
  assert.ok(frame, 'graf v zadání');
  assert.ok(frame.querySelector('svg path'));
  const kids = [...q('.prompt').children];
  assert.ok(kids.findIndex((k) => k.contains(frame)) > kids.findIndex((k) => k.classList.contains('formula')), 'pod vzorcem');
  click('next');
  assert.equal(el.querySelectorAll('.viz-board').length, 0, 'další příklad bez grafu');
});

test('promptViz: vadná data zadání nerozbijí', () => {
  const { q } = setup({}, { types: [{ id: 'g', title: 'Graf', generate() {
    return { id: 'g', topic: 't', type: 'g', seed: 0, promptTex: 'x', answerSpec: { kind: 'number', value: 1 }, solution: [], promptViz: { kind: 'plot', data: {} } };
  } }] });
  assert.equal(q('.prompt .viz-board'), null);
  assert.ok(q('.prompt .formula'));
  assert.ok(q('[data-role="answer"] input'));
});

// ---------- nové druhy odpovědí (Mikroekonomie) ----------
const typeWith = (spec, extra = {}) => ({ types: [{ id: 'k', title: 'K', generate: () => ({
  id: 'k', topic: 't', type: 'k', seed: 0, promptTex: 'Q', solution: [], answerSpec: spec, ...extra,
}) }] });
const OPTIONS = [{ id: 'a', text: 'Růst důchodu' }, { id: 'b', text: 'Pokles ceny kávy' }, { id: 'c', text: 'Změna vkusu' }];

test('choice: přepínače podle options, odpověď je id vybrané možnosti', () => {
  const { calls, q, click } = setup({}, typeWith({ kind: 'choice', value: 'b', options: OPTIONS }));
  const radios = [...q('[data-role="answer"]').querySelectorAll('input[type="radio"]')];
  assert.equal(radios.length, 3);
  assert.match(q('[data-role="answer"]').textContent, /Pokles ceny kávy/);
  click('check');
  assert.equal(calls.length, 0, 'bez výběru se nic nezapíše');
  radios[1].checked = true;
  click('check');
  assert.equal(calls[0].correct, true);
  assert.equal(calls[0].answer, 'b');
});

test('multichoice: zaškrtávací políčka, pořadí nehraje roli, špatná sada je correct:false', () => {
  const { calls, q, click } = setup({}, typeWith({ kind: 'multichoice', value: ['a', 'c'], options: OPTIONS }));
  const boxes = [...q('[data-role="answer"]').querySelectorAll('input[type="checkbox"]')];
  assert.equal(boxes.length, 3);
  boxes[0].checked = true;
  click('check');
  assert.equal(calls[0].correct, false);
  boxes[2].checked = true;
  click('check');
  assert.equal(calls[1].correct, true);
  assert.deepEqual(JSON.parse(calls[1].answer), ['a', 'c']);
});

test('truefalse: tlačítka Pravda a Nepravda, volba se zkontroluje', () => {
  const { calls, q, click } = setup({}, typeWith({ kind: 'truefalse', value: false }));
  const radios = [...q('[data-role="answer"]').querySelectorAll('input[type="radio"]')];
  assert.equal(radios.length, 2);
  assert.match(q('[data-role="answer"]').textContent, /Pravda/);
  assert.match(q('[data-role="answer"]').textContent, /Nepravda/);
  radios[1].checked = true;
  click('check');
  assert.equal(calls[0].correct, true);
});

test('number: pole je textové a Ukaž výsledek ukáže hodnotu s čárkou', () => {
  const { q, click } = setup({}, typeWith({ kind: 'number', value: 3.5 }));
  click('reveal');
  assert.match(q('[data-role="reveal-box"]').textContent, /3\{?,\}?5/);
});

test('whiteboard: selfGraded pokus nese příznak selfGraded', () => {
  const { calls, q, click } = setup({}, typeWith({ kind: 'whiteboard', reference: { kind: 'econ', data: { curves: [] } } }));
  click('reveal');
  q('[data-role="self-ok"]').click();
  assert.equal(calls[0].selfGraded, true);
  assert.equal(calls[0].correct, true);
});

test('whiteboard: po „Ukaž výsledek“ se vedle tabule nakreslí vzorový graf (reference)', () => {
  const { q, click } = setup({}, typeWith({ kind: 'whiteboard', reference: { kind: 'plot', data: { domain: [0, 1] } } }));
  assert.equal(q('[data-role="reveal-box"] .viz-board'), null);
  click('reveal');
  assert.ok(q('[data-role="reveal-box"] .viz-board svg path'), 'vzor v rámu tabule');
});

test('sourceText: zdroj z cvičebnice se zobrazí česky, ne jako objekt', async () => {
  const { sourceText } = await import('../js/ui/practice.js');
  assert.equal(sourceText({ chapter: 3, number: 15 }), 'cvičebnice, kap. 3, úloha 15');
  assert.equal(sourceText({ chapter: 6, number: 'C-d' }), 'cvičebnice, kap. 6, úloha C-d');
  assert.equal(sourceText('kap. 2'), 'kap. 2');
  assert.equal(sourceText(undefined), '');
  assert.equal(sourceText({}), '');
  assert.equal(sourceText({ chapter: 7.1, number: 3 }), 'cvičebnice, kap. 7.1, úloha 3');
});

test('fixní příklady: popisek ukáže zdroj v čitelném tvaru', () => {
  const t = { id: 't', title: 'T', order: 1, theory: [], types: [{ id: 'a', title: 'A', generate: () => ({ id: 'a', topic: 't', type: 'a', seed: 0, promptTex: '1', answerSpec: { kind: 'number', value: 1 }, solution: [] }) }] };
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  const el = window.document.getElementById('r');
  const p = mountPractice(el, t, { record: () => Promise.resolve({}), navigate: () => {} });
  p.setFixed([{ id: 'cv-3-1', type: 'a', promptTex: '1', answerSpec: { kind: 'number', value: 1 }, solution: [], source: { chapter: 3, number: 1 } }]);
  el.querySelector('[data-role="type-cviceni"]').click();
  assert.match(el.querySelector('.prompt-label').textContent, /cvičebnice, kap\. 3, úloha 1/);
  assert.doesNotMatch(el.querySelector('.prompt-label').textContent, /object/i);
});
