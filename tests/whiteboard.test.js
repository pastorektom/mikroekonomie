import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { makeRng } from '../js/rng.js';
import { createStrokeStore, mountWhiteboard, canStartStroke } from '../js/ui/whiteboard.js';
import { mountPractice } from '../js/ui/practice.js';

const stroke = (n) => ({ tool: 'pen', color: 'ink', width: 3, points: [[n, n, 0.5]] });

test('undo po dvou tazích zruší jen poslední tah', () => {
  const s = createStrokeStore();
  s.addStroke(stroke(1));
  s.addStroke(stroke(2));
  s.undo();
  assert.equal(s.strokes.length, 1);
  assert.equal(s.strokes[0].points[0][0], 1);
});

test('clear + undo vrátí smazané tahy; další undo zruší poslední tah', () => {
  const s = createStrokeStore();
  s.addStroke(stroke(1));
  s.addStroke(stroke(2));
  s.clear();
  assert.equal(s.strokes.length, 0);
  s.undo();
  assert.equal(s.strokes.length, 2);
  s.undo();
  assert.equal(s.strokes.length, 1);
  s.undo(); s.undo();
  assert.equal(s.strokes.length, 0);
  assert.equal(s.canUndo, false);
});

test('clear prázdné tabule nic nezapíše', () => {
  const s = createStrokeStore();
  s.clear();
  assert.equal(s.canUndo, false);
});

function board() {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  const el = window.document.getElementById('r');
  const changes = [];
  const wb = mountWhiteboard(el, { onChange: (c) => changes.push(c) });
  const canvas = el.querySelector('canvas');
  const fire = (type, props) => {
    const e = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerId: 1, clientX: 0, clientY: 0, pressure: 0.5, pointerType: 'mouse', button: 0 }, props);
    canvas.dispatchEvent(e);
  };
  return { window, el, wb, canvas, fire, changes };
}

test('plátno má touch-action:none a tlačítka mají české aria-label', () => {
  const { el, canvas } = board();
  assert.equal(canvas.style.touchAction, 'none');
  for (const b of el.querySelectorAll('button')) assert.ok(b.getAttribute('aria-label'), b.textContent);
  assert.ok(el.querySelector('[aria-label="Smazat vše"]'));
});

test('tah myší se zapíše a undo ho zruší; druhý ukazatel se ignoruje', () => {
  const { wb, fire, changes } = board();
  fire('pointerdown', { pointerId: 1 });
  fire('pointerdown', { pointerId: 2, clientX: 50 }); // dlaň
  fire('pointermove', { pointerId: 2, clientX: 60 });
  fire('pointermove', { pointerId: 1, clientX: 10, clientY: 10 });
  fire('pointerup', { pointerId: 2 });
  fire('pointerup', { pointerId: 1 });
  assert.equal(wb.strokeCount, 1);
  assert.equal(changes.at(-1).strokes, 1);
  wb.undo();
  assert.equal(wb.strokeCount, 0);
  wb.destroy();
});

test('exportPng bez plátna vrací řetězec', () => {
  const { wb } = board();
  assert.equal(typeof wb.exportPng(), 'string');
});

// ---- integrace do procvičování ----
function practice(types) {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  const el = window.document.getElementById('r');
  const calls = [];
  mountPractice(el, { id: 't', title: 'T', order: 1, theory: [], types }, {
    record: (a) => { calls.push(a); return Promise.resolve({}); },
    navigate() {}, rng: makeRng(3),
  });
  return { el, calls, q: (s) => el.querySelector(s) };
}
const numType = { id: 'a', title: 'A', generate: () => ({ id: 'a', topic: 't', type: 'a', seed: 0, promptTex: '1+1', answerSpec: { kind: 'number', value: 2 }, solution: [] }) };
const wbType = { id: 'w', title: 'W', generate: () => ({ id: 'w', topic: 't', type: 'w', seed: 0, promptTex: 'x', answerTex: '42', answerSpec: { kind: 'whiteboard' }, solution: [] }) };

test('Tabule: skrytí a znovu zobrazení kresbu zachová, další příklad ji smaže', () => {
  const { q } = practice([numType]);
  const btn = q('[data-role="tabule"]');
  assert.equal(q('canvas'), null);
  btn.click();
  const canvas = q('canvas');
  const fire = (type, props) => {
    const e = new canvas.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerId: 1, clientX: 5, clientY: 5, pressure: 0.5, pointerType: 'mouse', button: 0, buttons: 1 }, props);
    canvas.dispatchEvent(e);
  };
  fire('pointerdown'); fire('pointermove', { clientX: 20 }); fire('pointerup');
  assert.equal(q('[data-role="wb-clear"]').disabled, false);
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
  btn.click();
  assert.equal(q('[data-role="board"]').hidden, true);
  btn.click();
  assert.equal(q('[data-role="board"]').hidden, false);
  assert.equal(q('canvas'), canvas);
  assert.equal(q('[data-role="wb-clear"]').disabled, false);
  q('[data-role="next"]').click();
  assert.equal(q('canvas'), null);
  q('[data-role="tabule"]').click();
  assert.equal(q('[data-role="wb-clear"]').disabled, true);
  assert.ok(q('[data-role="answer"] input'));
});

test('canStartStroke: zbylý tah se zahodí, cizí ukazatel při kreslení ne', () => {
  const act = { id: 1 };
  assert.deepEqual(canStartStroke(null, { pointerId: 1 }), { start: true, stale: false });
  assert.equal(canStartStroke(act, { pointerId: 2, pointerType: 'touch' }).start, false);
  assert.equal(canStartStroke(act, { pointerId: 2, pointerType: 'mouse', buttons: 1 }).start, false);
  assert.deepEqual(canStartStroke(act, { pointerId: 1, pointerType: 'touch' }), { start: true, stale: true });
  assert.equal(canStartStroke(act, { pointerId: 2, pointerType: 'mouse', buttons: 0 }).start, true);
});

test('zmeškané pointerup: lostpointercapture tah ukončí a lze kreslit dál', () => {
  const { wb, fire, canvas, window } = board();
  fire('pointerdown', { pointerId: 1 });
  fire('pointermove', { pointerId: 1, clientX: 9 });
  canvas.dispatchEvent(Object.assign(new window.Event('lostpointercapture'), { pointerId: 1 }));
  assert.equal(wb.strokeCount, 1);
  fire('pointerdown', { pointerId: 3 }); fire('pointerup', { pointerId: 3 });
  assert.equal(wb.strokeCount, 2);
});

test('whiteboard: tabule místo pole, po „Ukaž výsledek“ dvě volby, zapíše se jediný selfGraded pokus', () => {
  const { q, calls } = practice([wbType]);
  assert.ok(q('canvas'));
  assert.equal(q('[data-role="answer"] input'), null);
  q('[data-role="reveal"]').click();
  assert.equal(calls.length, 0);
  assert.ok(q('[data-role="reveal-box"]').textContent.includes('Správný výsledek'));
  q('[data-role="self-ok"]').click();
  q('[data-role="self-bad"]')?.click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].correct, true);
  assert.equal(JSON.parse(calls[0].answer).selfGraded, true);
});

test('whiteboard: „Nezvládl jsem“ zapíše correct:false', () => {
  const { q, calls } = practice([wbType]);
  q('[data-role="reveal"]').click();
  q('[data-role="self-bad"]').click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].correct, false);
  assert.equal(JSON.parse(calls[0].answer).selfGraded, true);
});
