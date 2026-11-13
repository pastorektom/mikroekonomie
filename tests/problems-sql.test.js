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

test('toSqlParts rozdělí SQL na části do zadané velikosti; smazání jen v první, všechny inserty zachovány, ord jedinečné', async () => {
  const { toSqlParts } = await import('../tools/problems-to-sql.mjs');
  const big = { topic: 'trh', problems: Array.from({ length: 40 }, (_, i) => ({ id: `cv-${i}`, type: 't', task: 'x'.repeat(200) })) };
  const other = { topic: 'prace', problems: Array.from({ length: 10 }, (_, i) => ({ id: `p-${i}`, type: 't', task: 'y'.repeat(200) })) };
  const parts = toSqlParts([big, other], 3000);
  assert.ok(parts.length >= 4, `málo částí: ${parts.length}`);
  assert.ok(parts[0].includes('delete from public.problems;'));
  for (const p of parts.slice(1)) assert.ok(!p.includes('delete from'));
  for (const p of parts) {
    assert.match(p, /^-- /);
    assert.ok(p.includes('begin;') && p.trim().endsWith('commit;'));
    assert.ok(p.length < 3600, `část je příliš velká: ${p.length}`);
  }
  const inserts = parts.flatMap((p) => p.split('\n').filter((l) => l.startsWith('insert')));
  assert.equal(inserts.length, 50);
  const keys = inserts.map((l) => l.match(/values \('([^']+)', '([^']+)', (\d+),/).slice(1, 4).join('|'));
  assert.equal(new Set(keys).size, 50);
  assert.deepEqual(toSqlParts([], 3000), []);
});
