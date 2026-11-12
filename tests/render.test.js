import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderText, renderTex, setTexEngine, splitInlineMath } from '../js/render.js';
import { mountStepper, clampStep, stepCounterText } from '../js/ui/stepper.js';
import { parseRoute, routeHref, examHref, FORMULAS_HREF } from '../js/router.js';
import { renderTheory } from '../js/ui/theory.js';
import { registerViz } from '../js/viz/index.js';

// Zkušební grafický modul: nakreslí cestu, když dostane obor; jinak nic.
registerViz('plot', {
  draw(svg, data) {
    if (!data || !data.domain) return false;
    svg.appendChild(svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path'));
    return true;
  },
});

function dom() {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  return window.document.getElementById('r');
}

test('renderText: <img onerror=x> nevytvoří element img', () => {
  const el = dom();
  renderText(el, '<img src=x onerror=alert(1)>');
  assert.equal(el.querySelectorAll('img').length, 0);
  assert.match(el.textContent, /<img src=x onerror=alert\(1\)>/);
});

test('renderText: HTML uvnitř $…$ se také nevloží jako HTML', () => {
  const el = dom();
  setTexEngine(null);
  renderText(el, 'Pozor $<b>x</b>$ a <script>x()</script>');
  assert.equal(el.querySelectorAll('b,script').length, 0);
});

test('renderText: odstavce podle prázdného řádku', () => {
  const el = dom();
  renderText(el, 'První.\n\nDruhý.');
  const ps = el.querySelectorAll('p');
  assert.equal(ps.length, 2);
  assert.equal(ps[1].textContent, 'Druhý.');
});

test('renderText: opakované volání nahradí obsah', () => {
  const el = dom();
  renderText(el, 'A');
  renderText(el, 'B');
  assert.equal(el.textContent, 'B');
});

test('renderText: tečka za vzorcem zůstane u vzorce', () => {
  const el = dom();
  setTexEngine(null);
  renderText(el, 'třeba $a^2$. Dál');
  const glue = el.querySelector('.nowrap');
  assert.ok(glue);
  assert.equal(glue.textContent, 'a^2.');
  assert.equal(el.textContent, 'třeba a^2. Dál');
});

test('splitInlineMath: text a vzorce, \\$ zůstane textem', () => {
  assert.deepEqual(splitInlineMath('Je $x^2$ kladné?'), [
    { type: 'text', value: 'Je ' },
    { type: 'math', value: 'x^2' },
    { type: 'text', value: ' kladné?' },
  ]);
  assert.deepEqual(splitInlineMath('Cena 5 \\$'), [{ type: 'text', value: 'Cena 5 $' }]);
  assert.deepEqual(splitInlineMath('neuzavřené $x'), [{ type: 'text', value: 'neuzavřené $x' }]);
});

test('renderTex: bez KaTeX zobrazí zdroj jako text', () => {
  const el = dom();
  setTexEngine(null);
  renderTex(el, '\\frac{1}{2}<img>');
  assert.equal(el.querySelectorAll('img').length, 0);
  assert.equal(el.textContent, '\\frac{1}{2}<img>');
});

test('renderTex: s KaTeX volá render s throwOnError:false a trust:false', () => {
  const el = dom();
  const calls = [];
  setTexEngine({ render: (tex, target, opts) => { calls.push({ tex, opts }); target.textContent = 'K:' + tex; } });
  renderTex(el, 'x^2', { display: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.throwOnError, false);
  assert.equal(calls[0].opts.trust, false);
  assert.equal(calls[0].opts.displayMode, true);
  assert.equal(el.textContent, 'K:x^2');
  setTexEngine(null);
});

test('stepCounterText a clampStep', () => {
  assert.equal(stepCounterText(1, 5), 'Krok 2 z 5');
  assert.equal(clampStep(-1, 5), 0);
  assert.equal(clampStep(9, 5), 4);
  assert.equal(clampStep(2, 5), 2);
  assert.equal(clampStep(0, 0), 0);
});

const STEPS = [
  { title: 'První', text: 'Popis 1' },
  { title: 'Druhý', text: 'Popis 2', tex: 'a+b' },
  { title: 'Třetí', text: 'Popis 3', board: [{ tex: 'x' }] },
];

test('mountStepper: vpřed/vzad, počítadlo, krajní tlačítka', () => {
  const el = dom();
  const s = mountStepper(el, STEPS);
  const counter = () => el.querySelector('[data-role="counter"]').textContent;
  const prev = el.querySelector('[data-role="prev"]');
  const next = el.querySelector('[data-role="next"]');
  assert.equal(counter(), 'Krok 1 z 3');
  assert.equal(prev.disabled, true);
  assert.match(el.textContent, /Popis 1/);
  next.click();
  assert.equal(counter(), 'Krok 2 z 3');
  assert.equal(s.index, 1);
  assert.match(el.querySelector('[data-role="text"]').textContent, /Popis 2/);
  next.click(); next.click();
  assert.equal(counter(), 'Krok 3 z 3');
  assert.equal(next.disabled, true);
  prev.click();
  assert.equal(counter(), 'Krok 2 z 3');
});

test('mountStepper: renderStepVisual dostane krok, index a kontejner', () => {
  const el = dom();
  const seen = [];
  const s = mountStepper(el, STEPS, {
    renderStepVisual: (target, step, i, steps) => { seen.push([step.title, i, steps.length]); target.textContent = 'V' + i; return true; },
  });
  s.go(2);
  assert.deepEqual(seen.at(-1), ['Třetí', 2, 3]);
  assert.equal(el.querySelector('[data-role="visual"]').textContent, 'V2');
});

test('mountStepper: prázdný postup nespadne', () => {
  const el = dom();
  mountStepper(el, []);
  assert.match(el.textContent, /není k dispozici/);
});

test('parseRoute', () => {
  assert.deepEqual(parseRoute(''), { name: 'home' });
  assert.deepEqual(parseRoute('#/'), { name: 'home' });
  assert.deepEqual(parseRoute('#/tema/trh/postup'), { name: 'topic', id: 'trh', tab: 'postup' });
  assert.deepEqual(parseRoute('#/tema/trh'), { name: 'topic', id: 'trh', tab: 'vyklad' });
  assert.deepEqual(parseRoute('#/tema/trh/procvicovani'), { name: 'topic', id: 'trh', tab: 'procvicovani' });
  assert.deepEqual(parseRoute('#/tema/trh/nic'), { name: 'notfound' });
  assert.deepEqual(parseRoute('#/neco'), { name: 'notfound' });
  assert.deepEqual(parseRoute('#/tema/a%20b/vyklad'), { name: 'topic', id: 'a b', tab: 'vyklad' });
});

test('routeHref', () => {
  assert.equal(routeHref(), '#/');
  assert.equal(routeHref('trh', 'postup'), '#/tema/trh/postup');
  assert.equal(routeHref('a b'), '#/tema/a%20b/vyklad');
});

test('renderTheory: nadpisy, text i vzorce, bez HTML injekce', () => {
  const el = dom();
  setTexEngine(null);
  renderTheory(el, {
    title: 'T',
    theory: [{ heading: 'Úvod<img>', text: 'Text <img>' }, { heading: 'Vzorec', tex: 'a^2', text: 'Druhá' }],
  });
  assert.equal(el.querySelectorAll('h2').length, 2);
  assert.equal(el.querySelectorAll('img').length, 0);
  assert.match(el.textContent, /a\^2/);
});

test('renderTheory: item.viz se nakreslí pod text v rámu tabule; vadná data oddíl nerozbijí', () => {
  const el = dom();
  setTexEngine(null);
  renderTheory(el, {
    title: 'T',
    theory: [
      { heading: 'Graf', text: 'Parabola', tex: 'x^2', viz: { kind: 'plot', data: { domain: [-2, 2], functions: [{ expr: 'x^2' }] } } },
      { heading: 'Vadný', text: 'Bez grafu', viz: { kind: 'plot', data: {} } },
      { heading: 'Neznámý', text: 'Nic', viz: { kind: 'nic', data: 1 } },
      { heading: 'Trh', text: 'M', viz: { kind: 'plot', data: { domain: [0, 1] } } },
    ],
  });
  const blocks = el.querySelectorAll('section.theory-block');
  assert.equal(blocks.length, 4);
  const frame = blocks[0].querySelector('.board.viz-board');
  assert.ok(frame, 'graf v rámu tabule');
  assert.ok(frame.querySelector('svg path'), 'křivka nakreslená');
  // pod textem i vzorcem
  const kids = [...blocks[0].children];
  const iViz = kids.findIndex((k) => k.contains(frame));
  assert.ok(iViz > kids.findIndex((k) => k.classList.contains('prose')));
  assert.ok(iViz > kids.findIndex((k) => k.classList.contains('formula')));
  assert.equal(blocks[1].querySelector('.viz-board'), null);
  assert.match(blocks[1].textContent, /Bez grafu/);
  assert.equal(blocks[2].querySelector('.viz-board'), null);
  assert.ok(blocks[3].querySelector('.viz-board svg'));
  // nové vykreslení (jiný pohled) staré grafy uvolní
  renderTheory(el, { theory: [{ heading: 'Bez', text: 'x' }] });
  assert.equal(el.querySelectorAll('.viz-board').length, 0);
  assert.equal(el.querySelectorAll('section.theory-block').length, 1);
});

test('parseRoute: zkouškový režim a vzorce', () => {
  assert.deepEqual(parseRoute('#/zkouska/zapocet'), { name: 'exam', kind: 'zapocet' });
  assert.deepEqual(parseRoute('#/zkouska/zkouska'), { name: 'exam', kind: 'zkouska' });
  assert.deepEqual(parseRoute('#/zkouska/nic'), { name: 'notfound' });
  assert.deepEqual(parseRoute('#/zkouska'), { name: 'notfound' });
  assert.deepEqual(parseRoute('#/vzorce'), { name: 'formulas' });
});

test('routeHref: zkouška a vzorce', () => {
  assert.equal(examHref('zapocet'), '#/zkouska/zapocet');
  assert.equal(FORMULAS_HREF, '#/vzorce');
});
