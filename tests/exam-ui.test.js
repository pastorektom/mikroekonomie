import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { makeRng } from '../js/rng.js';
import { mountExam } from '../js/ui/exam.js';

const num = (value, points = 5) => ({ id: `n${value}`, topic: 't', type: 'n', seed: 0, part: 'zapocet', points, task: `Kolik je ${value}?`, promptTex: `${value}`, answerSpec: { kind: 'number', value }, solution: [] });
const wb = (points = 5) => ({ id: 'w', topic: 't', type: 'w', seed: 0, part: 'zapocet', points, task: 'Nakresli graf', answerSpec: { kind: 'whiteboard', reference: { kind: 'x', data: {} } }, solution: [] });

function setup({ problems = [num(3), num(4), wb()], kind = 'zapocet', start = 1000 } = {}) {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  window.HTMLCanvasElement.prototype.getContext = () => null; // jsdom nemá canvas
  const el = window.document.getElementById('r');
  const state = { t: start, ticks: [], recorded: [], stopped: 0 };
  const exam = mountExam(el, kind, {
    topics: [], rng: makeRng(1), build: () => problems,
    now: () => state.t,
    schedule: (fn) => { state.ticks.push(fn); return () => { state.stopped++; }; },
    record: (r) => { state.recorded.push(r); return Promise.resolve({ saved: true }); },
  });
  const q = (s) => el.querySelector(s);
  const click = (role) => q(`[data-role="${role}"]`).click();
  const answer = (i, v) => { const input = el.querySelectorAll('[data-q]')[i].querySelector('input'); input.value = v; };
  return { el, state, exam, q, click, answer };
}

test('úvod ukazuje pravidla zápočtu a tlačítko Začít; časovač ještě neběží', () => {
  const { el, q, state } = setup();
  assert.match(el.textContent, /50 bodů/);
  assert.match(el.textContent, /30 bodů/);
  assert.match(el.textContent, /50 minut/);
  assert.ok(q('[data-role="start"]'));
  assert.equal(state.ticks.length, 0);
});

test('po Začít běží časovač 50:00, je vidět první úloha a počet úloh', () => {
  const { q, click, state } = setup();
  click('start');
  assert.equal(state.ticks.length, 1);
  assert.equal(q('[data-role="clock"]').textContent, '50:00');
  assert.match(q('[data-role="position"]').textContent, /Úloha 1 z 3/);
  assert.match(q('[data-role="current"]').textContent, /Kolik je 3\?/);
});

test('časovač odpočítává a ukazuje zbývající čas', () => {
  const { q, click, state } = setup();
  click('start');
  state.t += 49 * 60000 + 30000;
  state.ticks[0]();
  assert.equal(q('[data-role="clock"]').textContent, '0:30');
});

test('navigace Další/Předchozí zachová psanou odpověď', () => {
  const { q, click, answer, el } = setup();
  click('start');
  answer(0, '3');
  click('next');
  assert.match(q('[data-role="position"]').textContent, /Úloha 2 z 3/);
  click('prev');
  assert.equal(el.querySelectorAll('[data-q]')[0].querySelector('input').value, '3');
});

test('Odevzdat: přehled s body, odhadem a zápisem výsledku (kreslený graf mimo body)', async () => {
  const { q, click, answer, state, el } = setup();
  click('start');
  answer(0, '3'); // správně 5 b
  answer(1, '9'); // špatně
  state.t += 12 * 60000;
  click('finish');
  assert.match(q('[data-role="review"]').textContent, /5 z 10 b/);
  assert.match(q('[data-role="estimate"]').textContent, /25/);
  assert.match(q('[data-role="estimate"]').textContent, /nesplněn/i);
  assert.equal(state.stopped, 1, 'časovač se zastaví');
  q('[data-role="self-ok"]').click();
  assert.match(q('[data-role="self-total"]').textContent, /1 z 1/);
  click('save');
  await Promise.resolve();
  assert.equal(state.recorded.length, 1);
  assert.deepEqual(
    { kind: state.recorded[0].kind, points: state.recorded[0].points, maxPoints: state.recorded[0].maxPoints, ok: state.recorded[0].selfGradedOk, total: state.recorded[0].selfGradedTotal, ms: state.recorded[0].ms },
    { kind: 'zapocet', points: 25, maxPoints: 50, ok: 1, total: 1, ms: 12 * 60000 },
  );
  click('save');
  assert.equal(state.recorded.length, 1, 'druhé uložení se neprovede');
  assert.ok(el.querySelector('[data-role="wrong"]'), 'výpis chybných úloh');
});

test('vypršení času odevzdá test automaticky a neodpovězené úlohy dají 0', () => {
  const { q, click, state } = setup();
  click('start');
  state.t += 51 * 60000;
  state.ticks[0]();
  assert.ok(q('[data-role="review"]'));
  assert.match(q('[data-role="review"]').textContent, /0 z 10 b/);
  assert.equal(state.stopped, 1);
  state.ticks[0]();
  assert.equal(state.stopped, 1, 'druhý tik nic nedělá');
});

test('test bez automaticky kontrolovaných úloh nehodí výjimku ani NaN', () => {
  const { q, click } = setup({ problems: [wb(10), wb(10)], kind: 'zkouska' });
  click('start');
  click('finish');
  assert.ok(!/NaN|Infinity|undefined/.test(q('[data-role="review"]').textContent));
  assert.match(q('[data-role="estimate"]').textContent, /nelze/i);
});

test('prázdný test (žádné hotové téma) ukáže vysvětlení a žádné tlačítko Začít', () => {
  const { q, el } = setup({ problems: [] });
  assert.equal(q('[data-role="start"]'), null);
  assert.match(el.textContent, /zatím nejsou/i);
});

test('destroy zastaví časovač', () => {
  const { click, exam, state } = setup();
  click('start');
  exam.destroy();
  assert.equal(state.stopped, 1);
});
