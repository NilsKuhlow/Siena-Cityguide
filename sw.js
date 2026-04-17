/* ═══════════════════════════════════════════════════════════
   Siena Stadtführer — Service Worker
   Strategy:
     • install  → precache every local asset
     • activate → delete stale caches, claim all tabs
     • fetch    → cache-first for assets, network-first for HTML
   Bump CACHE version whenever assets change.
═══════════════════════════════════════════════════════════ */

const CACHE = 'siena-v1';

/* All local assets that must work fully offline */
const PRECACHE = [
  '/',
  '/index.html',
  '/NOLLI_PLAN_FINAL.svg',
  '/manifest.json',
  '/icon.svg',
  /* stop 0 */
  '/img/stop0/Website-11.jpg',
  '/img/stop0/Website-6.jpg',
  /* stop 1 */
  '/img/stop1/Website-5.jpg',
  '/img/stop1/Website-7.jpg',
  '/img/stop1/Website-8.jpg',
  /* stop 2 */
  '/img/stop2/Baptisterium-1.jpg',
  '/img/stop2/Baptisterium-2.jpg',
  '/img/stop2/Baptisterium-3.jpg',
  /* stop 3 */
  '/img/stop3/Website-13.jpg',
  '/img/stop3/Website-14.jpg',
  '/img/stop3/Website-15.jpg',
  '/img/stop3/Website-16.jpg',
  /* stop 4 */
  '/img/stop4/Website-17.jpg',
  '/img/stop4/Website-18.jpg',
  '/img/stop4/Website-19.jpg',
  '/img/stop4/Website-20.jpg',
  '/img/stop4/Website-21.jpg',
  '/img/stop4/Website-22.jpg',
  /* stop 5 */
  '/img/stop5/Website-3.jpg',
  '/img/stop5/Website-4.jpg',
  '/img/stop5/Website-24.jpg',
  '/img/stop5/Website-25.jpg',
  /* stop 6 */
  '/img/stop6/Website-2.jpg',
  '/img/stop6/Website-9.jpg',
  '/img/stop6/Website-10.jpg',
  /* stop 7 */
  '/img/stop7/Website-23.jpg',
];

/* ── Update trigger from page script ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ── Install: fetch + cache everything ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())   /* activate immediately without waiting for old tabs to close */
  );
});

/* ── Activate: remove stale caches, take control of all tabs ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  /* Only handle GET */
  if (req.method !== 'GET') return;

  const isSameOrigin  = url.origin === self.location.origin;
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com'
                     || url.hostname === 'fonts.gstatic.com';

  /* Skip unknown cross-origin requests (analytics, etc.) */
  if (!isSameOrigin && !isGoogleFonts) return;

  /* HTML navigation: network-first so code updates propagate,
     but serve cached page when offline */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          /* Update cache in background */
          caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  /* Everything else (images, SVG, fonts, JS, CSS):
     cache-first — instant response, zero network round-trip */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        /* Only cache valid same-origin responses */
        if (!res || res.status !== 200) return res;
        caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => {
        /* Resource unavailable and not cached → nothing to serve */
        return new Response('Offline – Ressource nicht verfügbar', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
