import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initProgress, setProgressUser, recordAttempt, recordExam, listExams } from '../js/progress.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

// Falešný klient zaznamenává zápisy a vrací uložené zkoušky.
function fake({ failInsert = false } = {}) {
  const c = { attempts: [], runs: [], online: true };
  c.from = (table) => ({
    async upsert(row) { if (table === 'attempts') c.attempts.push(row); return { error: null }; },
    async insert(row) {
      if (!c.online) throw new TypeError('Failed to fetch');
      if (failInsert) return { error: { message: 'boom', code: '500' }, status: 500 };
      c.runs.push({ table, row });
      return { error: null };
    },
    select() {
      const q = { order: () => q, limit: async () => ({ data: c.runs.map((r) => r.row), error: null }) };
      return q;
    },
  });
  return c;
}

test('recordAttempt přenese selfGraded do sloupce self_graded', async () => {
  const c = fake();
  initProgress(c, mem());
  setProgressUser('u1');
  await recordAttempt({ topic: 'trh', type: 'graf', seed: 1, answer: '', correct: true, ms: 10, selfGraded: true });
  await recordAttempt({ topic: 'trh', type: 'cislo', seed: 2, answer: '5', correct: false, ms: 10 });
  assert.equal(c.attempts[0].self_graded, true);
  assert.equal(c.attempts[1].self_graded, false);
});

test('recordExam zapíše běh pod přihlášeným uživatelem do exam_runs', async () => {
  const c = fake();
  initProgress(c, mem());
  setProgressUser('u1');
  const r = await recordExam({ kind: 'zkouska', points: 14, maxPoints: 20, selfGradedOk: 2, selfGradedTotal: 3, ms: 90000 });
  assert.equal(r.saved, true);
  assert.equal(c.runs[0].table, 'exam_runs');
  assert.deepEqual(
    { ...c.runs[0].row, created_at: undefined },
    { user_id: 'u1', kind: 'zkouska', points: 14, max_points: 20, self_graded_ok: 2, self_graded_total: 3, ms: 90000, created_at: undefined },
  );
});

test('recordExam bez uživatele nebo klienta nic nezapíše a nehodí výjimku', async () => {
  initProgress(null, mem());
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: 1, maxPoints: 50 }), { saved: false });
  const c = fake();
  initProgress(c, mem());
  setProgressUser(null);
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: 1, maxPoints: 50 }), { saved: false });
  assert.equal(c.runs.length, 0);
});

test('recordExam při chybě sítě nebo serveru vrátí saved:false, ne výjimku', async () => {
  const c = fake();
  c.online = false;
  initProgress(c, mem());
  setProgressUser('u1');
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: 30, maxPoints: 50 }), { saved: false });
  const c2 = fake({ failInsert: true });
  initProgress(c2, mem());
  setProgressUser('u1');
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: 30, maxPoints: 50 }), { saved: false });
});

test('listExams vrátí běhy (nejnovější první) a při chybě prázdné pole', async () => {
  const c = fake();
  initProgress(c, mem());
  setProgressUser('u1');
  await recordExam({ kind: 'zapocet', points: 31, maxPoints: 50 });
  const list = await listExams();
  assert.equal(list.length, 1);
  assert.equal(list[0].points, 31);
  initProgress(null, mem());
  assert.deepEqual(await listExams(), []);
});

test('recordExam odmítne nesmyslné body (záporné, nad maximum, NaN)', async () => {
  const c = fake();
  initProgress(c, mem());
  setProgressUser('u1');
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: -1, maxPoints: 50 }), { saved: false });
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: 51, maxPoints: 50 }), { saved: false });
  assert.deepEqual(await recordExam({ kind: 'zapocet', points: NaN, maxPoints: 50 }), { saved: false });
  assert.deepEqual(await recordExam({ kind: 'nic', points: 1, maxPoints: 50 }), { saved: false });
  assert.equal(c.runs.length, 0);
});
