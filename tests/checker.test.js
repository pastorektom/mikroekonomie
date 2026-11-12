import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../js/checker.js';

const ok = (spec, input) => check(spec, input).ok === true;

test('number: zaokrouhlená odpověď v toleranci je uznána, vzdálená ne', () => {
  const spec = { kind: 'number', value: 10 / 3, tol: 0.01 };
  assert.ok(ok(spec, '3,33'));
  assert.ok(ok(spec, '10/3'));
  assert.ok(!ok(spec, '3,3'));
});

test('number bez tolerance vyžaduje přesnou hodnotu, uznává ekvivalentní zápis', () => {
  const spec = { kind: 'number', value: 0.5 };
  assert.ok(ok(spec, '2/4'));
  assert.ok(ok(spec, ' 0,5 '));
  assert.ok(!ok(spec, '0,51'));
});

test('number s unit percent uznává 25, 25 % i 25%, ne 0,25', () => {
  const spec = { kind: 'number', value: 25, unit: 'percent' };
  assert.ok(ok(spec, '25'));
  assert.ok(ok(spec, '25 %'));
  assert.ok(ok(spec, '25%'));
  assert.ok(!ok(spec, '0,25'));
});

test('number s abs uznává zápornou i kladnou hodnotu (elasticita)', () => {
  const spec = { kind: 'number', value: 1.5, abs: true };
  assert.ok(ok(spec, '-1,5'));
  assert.ok(ok(spec, '1,5'));
  assert.ok(!ok(spec, '2'));
});

test('choice uzná správné id a odmítne jiné', () => {
  const spec = { kind: 'choice', value: 'b', options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }] };
  assert.ok(ok(spec, 'b'));
  assert.ok(!ok(spec, 'a'));
  assert.equal(check(spec, '').reason, 'syntax');
});

test('multichoice: pořadí nehraje roli, žádná ani příliš mnoho možností je chyba', () => {
  const spec = { kind: 'multichoice', value: ['a', 'c'], options: [] };
  assert.ok(ok(spec, ['c', 'a']));
  assert.ok(!ok(spec, ['a']));
  assert.ok(!ok(spec, ['a', 'b', 'c']));
  assert.ok(!ok(spec, []));
  assert.doesNotThrow(() => check(spec, undefined));
});

test('truefalse', () => {
  assert.ok(ok({ kind: 'truefalse', value: true }, true));
  assert.ok(!ok({ kind: 'truefalse', value: true }, false));
  assert.equal(check({ kind: 'truefalse', value: true }, 'ano').reason, 'syntax');
});

test('table: buňky se čtou jako čísla s desetinnou čárkou a tolerancí', () => {
  const spec = { kind: 'table', value: [['10', '20'], ['30', '5']], tol: 0.01 };
  assert.ok(ok(spec, [['10,0', '20'], ['30', '5']]));
  assert.ok(ok(spec, [['10', '40/2'], ['30', '5,004']]));
  assert.ok(!ok(spec, [['10', '20'], ['30', '6']]));
  assert.ok(!ok(spec, [['10', '20']]));
  assert.equal(check(spec, [['10', 'abc(('], ['30', '5']]).reason, 'syntax');
});

test('expression: ekvivalentní tvar lineární funkce je uznán', () => {
  const spec = { kind: 'expression', value: '100-2*P', variable: 'P' };
  assert.ok(ok(spec, '-2P+100'.replace('2P', '2*P')));
  assert.ok(ok(spec, '100 - 2*P'));
  assert.ok(!ok(spec, '100-3*P'));
});

test('list: množina čísel bez ohledu na pořadí', () => {
  const spec = { kind: 'list', value: [1, 3] };
  assert.ok(ok(spec, ['3', '1']));
  assert.ok(!ok(spec, ['1']));
});

test('nesmyslný nebo prázdný vstup nehodí výjimku a je syntax', () => {
  const spec = { kind: 'number', value: 1 };
  assert.deepEqual(check(spec, 'abc(('), { ok: false, reason: 'syntax' });
  assert.deepEqual(check(spec, ''), { ok: false, reason: 'syntax' });
  assert.doesNotThrow(() => check(spec, null));
  assert.doesNotThrow(() => check(null, '1'));
});

test('whiteboard a neznámý druh se nekontrolují', () => {
  assert.equal(check({ kind: 'whiteboard', reference: {} }, 'x').reason, 'unsupported');
  assert.equal(check({ kind: 'nic' }, 'x').reason, 'unsupported');
});
