import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Spustí sw.js v izolovaném kontextu s falešným self a caches a vrátí obslužné funkce.
function loadSw() {
  const listeners = {};
  const store = new Map();
  const cache = { put: async (r, res) => { store.set(r.url, res); }, };
  const self = {
    location: { origin: 'https://skola.github.io' },
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: () => {}, clients: { claim: async () => {} },
  };
  const caches = {
    open: async () => cache,
    keys: async () => ['starý', 'mikroekonomie-v1'],
    delete: async (k) => { store.set(`deleted:${k}`, true); return true; },
    match: async (r) => store.get(r.url),
  };
  const ctx = vm.createContext({ self, caches, URL, Promise, fetch: async () => ({ ok: false, clone() { return this; } }), console });
  vm.runInContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), ctx);
  return { listeners, store, ctx };
}
const evt = (url, method = 'GET') => { const e = { request: { url, method }, responded: null, respondWith(p) { e.responded = p; } }; return e; };

test('sw: zachytí jen GET z vlastní adresy; cizí adresy (Supabase, CDN) a zápisy nechá být', () => {
  const { listeners } = loadSw();
  for (const e of [evt('https://abc.supabase.co/rest/v1/attempts'), evt('https://cdn.jsdelivr.net/npm/katex'), evt('https://skola.github.io/x', 'POST')]) {
    listeners.fetch(e);
    assert.equal(e.responded, null, e.request.url);
  }
  const own = evt('https://skola.github.io/js/app.js');
  listeners.fetch(own);
  assert.ok(own.responded);
});

test('sw: při dostupné síti vrací čerstvou odpověď a uloží kopii, bez sítě vrátí uloženou', async () => {
  const { listeners, ctx, store } = loadSw();
  const res = { ok: true, clone() { return this; }, tag: 'čerstvá' };
  ctx.fetch = async () => res;
  const online = evt('https://skola.github.io/index.html');
  listeners.fetch(online);
  assert.equal((await online.responded).tag, 'čerstvá');
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(store.has('https://skola.github.io/index.html'), 'kopie uložena');
  ctx.fetch = async () => { throw new TypeError('offline'); };
  const offline = evt('https://skola.github.io/index.html');
  listeners.fetch(offline);
  assert.equal((await offline.responded).tag, 'čerstvá');
});

test('sw: chybová odpověď serveru (404) se neukládá', async () => {
  const { listeners, ctx, store } = loadSw();
  ctx.fetch = async () => ({ ok: false, clone() { return this; } });
  const e = evt('https://skola.github.io/nic.js');
  listeners.fetch(e);
  await e.responded;
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(!store.has('https://skola.github.io/nic.js'));
});

test('sw: při aktivaci smaže staré verze mezipaměti a nechá aktuální', async () => {
  const { listeners, store } = loadSw();
  let done;
  listeners.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.ok(store.has('deleted:starý'));
  assert.ok(!store.has('deleted:mikroekonomie-v1'));
});
