// Service Worker: základní offline režim. Soubory aplikace se berou nejdřív ze sítě (vždy aktuální verze),
// a když síť není, použije se naposledy uložená kopie. Cizí adresy (Supabase, knihovny z CDN) a zápisy
// se nezachytávají: přihlášení a ukládání pokroku vyžadují připojení.
const CACHE = 'mikroekonomie-v1';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
