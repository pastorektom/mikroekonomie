import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topics, sortTopics } from '../js/topics/index.js';

test('seznam má 11 témat v pořadí z Moodlu s jedinečnými id', () => {
  const sorted = sortTopics(topics);
  assert.equal(sorted.length, 11);
  assert.deepEqual(sorted.map((t) => t.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(new Set(sorted.map((t) => t.id)).size, 11);
  assert.equal(sorted[1].title, 'Trh a tržní mechanismus');
  assert.equal(sorted[10].title, 'Tržní selhání a mikroekonomická politika státu');
});

test('každé téma má theory a types jako pole', () => {
  for (const t of topics) {
    assert.ok(Array.isArray(t.theory), t.id);
    assert.ok(Array.isArray(t.types), t.id);
  }
});
