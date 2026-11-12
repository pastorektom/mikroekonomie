import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initAuth, signUp, signIn, signOut, currentUser, resetPassword, friendlyAuthError, changePassword } from '../js/auth.js';
import { initProgress, setProgressUser, recordAttempt, topicStats, recommendNext, flushQueue, pendingCount } from '../js/progress.js';
import { renderLogin, renderNewPassword } from '../js/ui/login.js';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// Falešný klient: eviduje řádky podle klíče (seed, created_at), síť lze vypnout.
function fakeClient({ allowed = ['a@x.cz'], rows = [] } = {}) {
  const c = {
    online: true, failWith: null, calls: 0, updated: null, stored: new Map(), rows, session: null,
    auth: {
      async signUp({ email }) {
        if (!allowed.includes(email.toLowerCase())) return { data: null, error: { message: 'Database error saving new user' } };
        return { data: { user: { email }, session: null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        if (password !== 'heslo123') return { data: null, error: { message: 'Invalid login credentials' } };
        c.session = { user: { id: 'u1', email } };
        return { data: c.session, error: null };
      },
      async signOut() { c.session = null; return { error: null }; },
      async getUser() { return { data: { user: c.session?.user ?? null }, error: null }; },
      async updateUser(attrs) { c.updated = attrs; return { data: { user: {} }, error: null }; },
      onAuthStateChange(cb) { c.listener = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      async resetPasswordForEmail(email) { c.reset = email; return { data: {}, error: null }; },
    },
    from(table) {
      return {
        async upsert(row) {
          c.calls++;
          if (!c.online) throw new TypeError('Failed to fetch');
          const f = c.failWith?.(row);
          if (f) return f;
          c.stored.set(`${table}|${row.seed}|${row.created_at}`, row);
          return { error: null };
        },
      };
    },
    async rpc(name) { return { data: name === 'topic_stats' ? c.rows : null, error: null }; },
  };
  return c;
}

const attempt = (over = {}) => ({ topic: 'limity', type: 'zakl', seed: 42, answer: '3', correct: true, ms: 1200, ...over });

test('nepovolený e-mail se nezaregistruje a chyba je česky', async () => {
  initAuth(fakeClient());
  const bad = await signUp('cizi@x.cz', 'heslo123');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /není na seznamu povolených/);
  const good = await signUp('a@x.cz', 'heslo123');
  assert.equal(good.ok, true);
  assert.match(good.message, /Zkontroluj e-mail a potvrď registraci/);
});

test('přihlášení, odhlášení, aktuální uživatel a reset hesla', async () => {
  const c = fakeClient();
  initAuth(c);
  const bad = await signIn('a@x.cz', 'spatne');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /E-mail nebo heslo nesedí/);
  assert.equal(await currentUser(), null);
  assert.equal((await signIn('a@x.cz', 'heslo123')).ok, true);
  assert.equal((await currentUser()).email, 'a@x.cz');
  await signOut();
  assert.equal(await currentUser(), null);
  assert.equal((await resetPassword('a@x.cz')).ok, true);
  assert.equal(c.reset, 'a@x.cz');
});

test('friendlyAuthError zná i hlášku triggeru a neznámé chyby vysvětlí česky', () => {
  assert.match(friendlyAuthError('Tento e-mail není na seznamu povolených.'), /není na seznamu/);
  assert.match(friendlyAuthError('něco jiného'), /Něco se nepovedlo/);
});

test('recommendNext: nejnižší úspěšnost s aspoň 3 pokusy, bez dat první téma', () => {
  const order = ['a', 'b', 'c'];
  assert.equal(recommendNext([], order), 'a');
  assert.equal(recommendNext([{ topic: 'b', tried: 2, correctRate: 0 }], order), 'a');
  const stats = [
    { topic: 'a', tried: 5, correctRate: 0.9 },
    { topic: 'b', tried: 4, correctRate: 0.25 },
    { topic: 'c', tried: 2, correctRate: 0 },
  ];
  assert.equal(recommendNext(stats, order), 'b');
  assert.equal(recommendNext([{ topic: 'a', tried: 3, correctRate: 0.5 }, { topic: 'b', tried: 3, correctRate: 0.5 }], order), 'a');
  assert.equal(recommendNext([]), undefined);
});

test('topicStats seskupí pokusy podle tématu', async () => {
  const c = fakeClient({ rows: [
    { topic: 'a', tried: '2', correct_count: '1' }, { topic: 'b', tried: 1, correct_count: 1 },
  ] });
  initProgress(c, memStorage()); setProgressUser('u1');
  const s = await topicStats();
  assert.deepEqual(s.find((x) => x.topic === 'a'), { topic: 'a', tried: 2, correctRate: 0.5 });
  assert.deepEqual(s.find((x) => x.topic === 'b'), { topic: 'b', tried: 1, correctRate: 1 });
});

test('recordAttempt při výpadku sítě zařadí do fronty a po obnovení zapíše jednou', async () => {
  const c = fakeClient();
  const st = memStorage();
  initProgress(c, st); setProgressUser('u1');
  c.online = false;
  const r = await recordAttempt(attempt());
  assert.equal(r.queued, true);
  assert.equal(pendingCount(), 1);
  assert.equal(c.stored.size, 0);
  c.online = true;
  await Promise.all([flushQueue(), flushQueue()]); // souběžné vyprázdnění nesmí zapsat dvakrát
  assert.equal(c.stored.size, 1);
  assert.equal(pendingCount(), 0);
  await flushQueue();
  assert.equal(c.calls, 2); // jeden neúspěšný + jeden úspěšný pokus
});

test('fronta přežije restart (localStorage) a vyprázdní se při dalším úspěšném zápisu', async () => {
  const c = fakeClient();
  const st = memStorage();
  initProgress(c, st); setProgressUser('u1');
  c.online = false;
  await recordAttempt(attempt({ seed: 1 }));
  initProgress(c, st); setProgressUser('u1'); // nové načtení stránky
  assert.equal(pendingCount(), 1);
  c.online = true;
  const r = await recordAttempt(attempt({ seed: 2 }));
  assert.equal(r.saved, true);
  assert.equal(pendingCount(), 0);
  assert.equal(c.stored.size, 2);
});

test('idempotence: stejný seed a čas se uloží jen jednou, nový čas ano', async () => {
  const c = fakeClient();
  initProgress(c, memStorage()); setProgressUser('u1');
  const a = attempt({ created_at: '2026-11-10T10:00:00.000Z' });
  await recordAttempt(a);
  await recordAttempt(a);
  assert.equal(c.stored.size, 1);
  await recordAttempt(attempt({ created_at: '2026-11-10T10:00:01.000Z' }));
  assert.equal(c.stored.size, 2);
});

test('rozbité úložiště nesmí shodit aplikaci', async () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const c = fakeClient();
  initProgress(c, bad); setProgressUser('u1');
  assert.equal((await recordAttempt(attempt())).saved, true);
});

test('bez klienta (host) se nic neukládá a nic nespadne', async () => {
  initProgress(null, memStorage());
  const r = await recordAttempt(attempt());
  assert.deepEqual([r.saved, r.queued], [false, false]);
  assert.deepEqual(await topicStats(), []);
});

test('přihlašovací obrazovka bez konfigurace nabídne pokračování bez přihlášení', () => {
  const { document } = new JSDOM('<main id="m"></main>').window;
  const m = document.getElementById('m');
  let guest = 0;
  renderLogin(m, { configured: false, onGuest: () => guest++ });
  assert.match(m.textContent, /Aplikace zatím není propojená s databází/);
  const btn = [...m.querySelectorAll('button')].find((b) => /Pokračovat bez přihlášení \(pokrok se neuloží\)/.test(b.textContent));
  assert.ok(btn);
  btn.click();
  assert.equal(guest, 1);
});

test('přihlašovací formulář zobrazí českou chybu a po úspěchu zavolá onLogin', async () => {
  const { window } = new JSDOM('<main id="m"></main>');
  const m = window.document.getElementById('m');
  initAuth(fakeClient());
  let logged = 0;
  renderLogin(m, { configured: true, onLogin: () => logged++ });
  assert.equal([...m.querySelectorAll('button')].some((b) => /bez přihlášení/.test(b.textContent)), false);
  const form = m.querySelector('form');
  const set = (n, v) => { m.querySelector(`input[name="${n}"]`).value = v; };
  const submit = async () => {
    form.dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));
  };
  set('email', 'a@x.cz'); set('password', 'spatne');
  await submit();
  assert.match(m.querySelector('[role="alert"]').textContent, /E-mail nebo heslo nesedí/);
  set('password', 'heslo123');
  await submit();
  assert.equal(logged, 1);
});

test('fronta je vázaná na uživatele: řádky A se pod B neodešlou, pod A právě jednou', async () => {
  const c = fakeClient();
  initProgress(c, memStorage());
  setProgressUser('A');
  c.online = false;
  await recordAttempt(attempt({ seed: 7 }));
  assert.equal(pendingCount(), 1);
  c.online = true;
  setProgressUser('B');
  await flushQueue();
  assert.equal(c.stored.size, 0);
  assert.equal(pendingCount(), 1);
  const rb = await recordAttempt(attempt({ seed: 8 }));
  assert.equal(rb.saved, true);
  assert.equal(c.stored.size, 1);
  assert.equal([...c.stored.values()][0].user_id, 'B');
  setProgressUser('A');
  await flushQueue();
  await flushQueue();
  assert.equal(c.stored.size, 2);
  assert.equal(pendingCount(), 0);
});

test('bez uživatele (host) se nic neposílá ani nefrontuje; ze zděděné fronty se řádky bez user_id zahodí', async () => {
  const c = fakeClient();
  const st = memStorage();
  st.setItem('mikroekonomie.fronta', JSON.stringify([{ topic: 'x', seed: 1, created_at: 't' }]));
  initProgress(c, st);
  assert.equal(pendingCount(), 0);
  const r = await recordAttempt(attempt());
  assert.deepEqual([r.saved, r.queued, c.calls], [false, false, 0]);
  await flushQueue();
  assert.equal(c.calls, 0);
});

test('trvalá chyba 400 řádek zahodí a další se odešle; 5xx a 401 zůstanou ve frontě', async () => {
  const c = fakeClient();
  initProgress(c, memStorage());
  setProgressUser('u1');
  c.online = false;
  await recordAttempt(attempt({ seed: 1 }));
  await recordAttempt(attempt({ seed: 2 }));
  c.online = true;
  c.failWith = (row) => (row.seed === 1 ? { error: { message: 'bad', code: '22P02' }, status: 400 } : null);
  const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
  await flushQueue();
  console.warn = warn;
  assert.equal(warned, 1);
  assert.equal(pendingCount(), 0);
  assert.deepEqual([...c.stored.values()].map((r) => r.seed), [2]);
  for (const status of [503, 401]) {
    c.failWith = () => ({ error: { message: 'x' }, status });
    const r = await recordAttempt(attempt({ seed: 10 + status }));
    assert.equal(r.queued, true);
  }
  assert.equal(pendingCount(), 2);
});

test('změna hesla: kontrola délky a shody, pak updateUser', async () => {
  const c = fakeClient();
  initAuth(c);
  assert.match((await changePassword('krátké', 'krátké')).error, /aspoň 8 znaků/);
  assert.match((await changePassword('dlouhe-heslo1', 'jine-heslo-12')).error, /neshodují/);
  assert.equal(c.updated, null);
  const ok = await changePassword('dlouhe-heslo1', 'dlouhe-heslo1');
  assert.equal(ok.ok, true);
  assert.deepEqual(c.updated, { password: 'dlouhe-heslo1' });
  assert.match(ok.message, /Heslo bylo změněno/);
});

test('formulář nového hesla: nesoulad ukáže chybu, po úspěchu zavolá onDone', async () => {
  const { window } = new JSDOM('<main id="m"></main>');
  const m = window.document.getElementById('m');
  initAuth(fakeClient());
  let done = 0;
  renderNewPassword(m, { onDone: () => done++ });
  assert.match(m.textContent, /Nastav nové heslo/);
  const form = m.querySelector('form');
  const submit = async (a, b) => {
    m.querySelector('input[name="password"]').value = a;
    m.querySelector('input[name="password2"]').value = b;
    form.dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));
  };
  await submit('dlouhe-heslo1', 'jine-heslo-12');
  assert.match(m.querySelector('[role="alert"]').textContent, /neshodují/);
  assert.equal(done, 0);
  await submit('dlouhe-heslo1', 'dlouhe-heslo1');
  assert.match(m.querySelector('[role="alert"]').textContent, /Heslo bylo změněno/);
  assert.equal(done, 1);
});
