import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { topics } from '../js/topics/index.js';
import {
  EXAMS, gradeExam, buildExam, scoreExam, remainingMs, formatClock,
} from '../js/exam.js';

test('EXAMS: zápočet 50 b / min 30 / 50 min, zkouška 20 b / min 12 / 50 min', () => {
  assert.deepEqual([EXAMS.zapocet.max, EXAMS.zapocet.min, EXAMS.zapocet.minutes], [50, 30, 50]);
  assert.deepEqual([EXAMS.zkouska.max, EXAMS.zkouska.min, EXAMS.zkouska.minutes], [20, 12, 50]);
});

test('gradeExam zkouška: A 19–20, B 17–18, C 15–16, D 13–14, E 12, pod 12 FX', () => {
  const g = (p) => gradeExam('zkouska', p).grade;
  assert.deepEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 0].map(g), ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'E', 'FX', 'FX']);
  assert.equal(gradeExam('zkouska', 12).passed, true);
  assert.equal(gradeExam('zkouska', 11.5).passed, false);
});

test('gradeExam zápočet: 30 z 50 stačí, 29 ne; známka se nedává', () => {
  assert.equal(gradeExam('zapocet', 30).passed, true);
  assert.equal(gradeExam('zapocet', 29).passed, false);
  assert.equal(gradeExam('zapocet', 45).grade, null);
});

test('gradeExam: nesmyslné body (NaN, záporné, nad maximum) → nesplněno, bez výjimky', () => {
  for (const p of [NaN, -3, 99, undefined]) assert.equal(gradeExam('zkouska', p).passed, false);
  assert.equal(gradeExam('nic', 10).passed, false);
});

test('buildExam: součet bodů je přesně maximum a stejný seed dá stejný test', () => {
  for (const kind of ['zapocet', 'zkouska']) {
    const a = buildExam(kind, topics, makeRng(5));
    const b = buildExam(kind, topics, makeRng(5));
    assert.equal(a.reduce((s, p) => s + p.points, 0), EXAMS[kind].max, kind);
    assert.deepEqual(a, b, kind);
    assert.ok(a.length >= 8, `${kind}: málo úloh`);
    assert.ok(a.every((p) => p.part === kind), `${kind}: úloha z jiné části`);
  }
});

test('buildExam: z každého hotového tématu je aspoň jedna úloha a různé seedy dávají různé testy', () => {
  const ready = topics.filter((t) => t.types.some((ty) => ty.generate(makeRng(1)).part === 'zapocet'));
  const exam = buildExam('zapocet', topics, makeRng(11));
  for (const t of ready) assert.ok(exam.some((p) => p.topic === t.id), `chybí téma ${t.id}`);
  assert.notDeepEqual(buildExam('zapocet', topics, makeRng(1)).map((p) => p.task), buildExam('zapocet', topics, makeRng(2)).map((p) => p.task));
});

test('buildExam: témata bez příkladů (prázdné typy) se přeskočí a prázdný seznam dá prázdný test', () => {
  assert.deepEqual(buildExam('zapocet', [{ id: 'x', title: 'X', order: 1, theory: [], types: [] }], makeRng(1)), []);
  assert.deepEqual(buildExam('zapocet', [], makeRng(1)), []);
});

test('scoreExam: body jen za správné automaticky kontrolované úlohy, grafy zvlášť', () => {
  const num = (v, points) => ({ answerSpec: { kind: 'number', value: v }, points, part: 'zapocet' });
  const wb = (points) => ({ answerSpec: { kind: 'whiteboard', reference: {} }, points, part: 'zkouska' });
  const problems = [num(5, 4), num(7, 4), wb(2), wb(2)];
  const r = scoreExam('zkouska', problems, [
    { value: '5' }, { value: '8' }, { selfGraded: true, ok: true }, { selfGraded: true, ok: false },
  ]);
  assert.equal(r.points, 4);
  assert.equal(r.autoMax, 8);
  assert.equal(r.selfOk, 1);
  assert.equal(r.selfTotal, 2);
  assert.deepEqual(r.perProblem.map((p) => p.ok), [true, false, true, false]);
});

test('scoreExam: neodpovězené úlohy dají 0 a nehodí výjimku; bez automatických úloh nevznikne dělení nulou', () => {
  const num = { answerSpec: { kind: 'number', value: 1 }, points: 5, part: 'zapocet' };
  const r = scoreExam('zapocet', [num, num], [undefined, { value: '' }]);
  assert.equal(r.points, 0);
  assert.equal(r.estimate, 0);
  const onlyDraw = scoreExam('zkouska', [{ answerSpec: { kind: 'whiteboard', reference: {} }, points: 20, part: 'zkouska' }], [{ selfGraded: true, ok: true }]);
  assert.equal(onlyDraw.autoMax, 0);
  assert.equal(onlyDraw.estimate, null);
  assert.equal(onlyDraw.grade, null);
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(onlyDraw)));
});

test('scoreExam: odhad známky škáluje body z automatických úloh na maximum zkoušky', () => {
  const num = (v) => ({ answerSpec: { kind: 'number', value: v }, points: 2, part: 'zkouska' });
  const wb = { answerSpec: { kind: 'whiteboard', reference: {} }, points: 10, part: 'zkouska' };
  // 5 úloh po 2 b = 10 b automaticky; 8 b správně = 80 % → odhad 16 z 20 → C
  const r = scoreExam('zkouska', [num(1), num(1), num(1), num(1), num(1), wb], [{ value: '1' }, { value: '1' }, { value: '1' }, { value: '1' }, { value: '0' }, { selfGraded: true, ok: true }]);
  assert.equal(r.points, 8);
  assert.equal(r.estimate, 16);
  assert.equal(r.grade, 'C');
});

test('remainingMs a formatClock: odpočet z 50 minut, nikdy záporný, formát m:ss', () => {
  assert.equal(remainingMs(1000, 1000, 50), 50 * 60000);
  assert.equal(remainingMs(0, 49 * 60000 + 30000, 50), 30000);
  assert.equal(remainingMs(0, 999 * 60000, 50), 0);
  assert.equal(formatClock(50 * 60000), '50:00');
  assert.equal(formatClock(65000), '1:05');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(-5), '0:00');
});
