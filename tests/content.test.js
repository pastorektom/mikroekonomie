import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { hydrateProblems } from '../js/content.js';
import { mountPractice } from '../js/ui/practice.js';

const topic = {
  id: 't', title: 'T', order: 1, theory: [],
  types: [{
    id: 'tf', title: 'Pravda, nebo nepravda?',
    generate: () => null,
    solve: (d) => ({ id: 'tf', topic: 't', type: 'tf', seed: 0, task: `Tvrzení ${d.n}`, answerSpec: { kind: 'truefalse', value: true }, solution: [{ title: 'a', text: 'b' }] }),
  }, {
    id: 'num',
    title: 'Číslo',
    generate: () => null,
    solve: (d) => ({ id: 'num', topic: 't', type: 'num', seed: 0, promptTex: `${d.n}+1`, answerSpec: { kind: 'number', value: d.n + 1 }, solution: [] }),
  }],
};

test('hydrateProblems zachová příklad s textovým zadáním bez vzorce (pravda/nepravda, výběr)', () => {
  const list = hydrateProblems(topic, [{ id: 'cv-3-C-a', type: 'tf', data: { n: 1 }, source: { chapter: 3, number: 'C-a' } }]);
  assert.equal(list.length, 1);
  assert.equal(list[0].task, 'Tvrzení 1');
  assert.deepEqual(list[0].source, { chapter: 3, number: 'C-a' });
  assert.equal(list[0].topic, 't');
});

test('hydrateProblems zahodí příklad bez zadání nebo bez správné odpovědi a neznámý typ', () => {
  const list = hydrateProblems(topic, [
    { id: 'a', type: 'nic' },
    { id: 'b', type: 'num', data: { n: 2 } },
    { id: 'c', type: 'tf', data: { n: 3 } },
    null, 'text',
  ]);
  assert.deepEqual(list.map((p) => p.id), ['b', 'c']);
  assert.deepEqual(hydrateProblems(topic, 'nic'), []);
});

test('procvičování: pevný příklad jen s textovým zadáním se nabídne a nemá prázdný rámeček se vzorcem', () => {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  window.HTMLCanvasElement.prototype.getContext = () => null;
  const el = window.document.getElementById('r');
  const t = { ...topic, types: [{ ...topic.types[0], generate: () => topic.types[0].solve({ n: 9 }) }] };
  const p = mountPractice(el, t, { record: () => Promise.resolve({}), navigate: () => {} });
  p.setFixed(hydrateProblems(t, [{ id: 'cv-3-C-a', type: 'tf', data: { n: 1 }, source: { chapter: 3, number: 'C-a' } }]));
  const chip = el.querySelector('[data-role="type-cviceni"]');
  assert.ok(chip, 'záložka Příklady ze cvičebnice');
  chip.click();
  assert.match(el.querySelector('.prompt').textContent, /Tvrzení 1/);
  assert.equal(el.querySelector('.prompt .formula'), null);
});
