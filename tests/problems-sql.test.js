import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSql, sqlString } from '../tools/problems-to-sql.mjs';

const files = [{ topic: 'trh', problems: [{ id: 'cv-3-1', type: 'posun', task: "Zadání s apostrofem ' a $ znakem" }, { id: 'cv-3-2' }] }];

test('toSql nejdřív smaže staré příklady (pořadí se po doplnění úloh mění), vše v jedné transakci', () => {
  const sql = toSql(files);
  const lines = sql.trim().split('\n');
  assert.equal(lines[1], 'begin;');
  assert.equal(lines[2], 'delete from public.problems;');
  assert.equal(lines[lines.length - 1], 'commit;');
  assert.ok(lines.indexOf('delete from public.problems;') < lines.findIndex((l) => l.startsWith('insert')));
});

test('toSql: jeden insert na příklad, pořadí od 1, typ „cviceni“ když chybí, apostrofy zdvojené', () => {
  const sql = toSql(files);
  const inserts = sql.split('\n').filter((l) => l.startsWith('insert'));
  assert.equal(inserts.length, 2);
  assert.match(inserts[0], /values \('trh', 'posun', 1, /);
  assert.match(inserts[1], /values \('trh', 'cviceni', 2, /);
  assert.match(inserts[0], /apostrofem '' a \$ znakem/);
  assert.equal(sqlString("a'b"), "'a''b'");
});

test('toSql bez příkladů nesmaže nic (prázdný soubor se seznamem se nevygeneruje jako delete)', () => {
  const sql = toSql([]);
  assert.ok(!sql.includes('delete from'));
});
