/* ═══════════════════════════════════════════════════════════
   Siena Stadtführer — Service Worker
   Strategy:
     • install  → precache every local asset
     • activate → delete stale caches, claim all tabs
     • fetch    → network-first for HTML (always fresh),
                  cache-first for images/assets (instant)
   ⚠ Bump CACHE version on every deploy that changes files.
═══════════════════════════════════════════════════════════ */

const CACHE = 'siena-v3';

/* All local assets that must work fully offline */
const PRECACHE = [
  '/',
  '/index.html',
  '/sw.js',
  '/NOLLI_PLAN_FINAL.svg',
  '/manifest.json',
  '/icon.svg',
  /* stop 0 – Banca Monte dei Paschi */
  '/img/stop0/Website-11.jpg',
  '/img/stop0/Website-6.jpg',
  /* stop 1 – Fontebranda */
  '/img/stop1/Website-5.jpg',
  '/img/stop1/Website-7.jpg',
  '/img/stop1/Website-8.jpg',
  /* stop 2 – Battistero */
  '/img/stop2/Baptisterium-1.jpg',
  '/img/stop2/Baptisterium-2.jpg',
  '/img/stop2/Baptisterium-3.jpg',
  /* stop 3 – Duomo */
  '/img/stop3/Website-13.jpg',
  '/img/stop3/Website-14.jpg',
  '/img/stop3/Website-15.jpg',
  '/img/stop3/Website-16.jpg',
  /* stop 4 – Piazza del Campo */
  '/img/stop4/Website-17.jpg',
  '/img/stop4/Website-18.jpg',
  '/img/stop4/Website-19.jpg',
  '/img/stop4/Website-20.jpg',
  '/img/stop4/Website-21.jpg',
  '/img/stop4/Website-22.jpg',
  /* stop 5 – Palazzo Pubblico */
  '/img/stop5/Website-3.jpg',
  '/img/stop5/Website-4.jpg',
  '/img/stop5/Website-24.jpg',
  '/img/stop5/Website-25.jpg',
  /* stop 6 – Piazza del Mercato */
  '/img/stop6/Website-2.jpg',
  '/img/stop6/Website-9.jpg',
  '/img/stop6/Website-10.jpg',
  /* stop 7 – Palazzo Piccolomini */
  '/img/stop7/Website-23.jpg',
  /* extra places – Neue Orte (spaces encoded as %20) */
  '/img/Neue%20Orte/PortaCamolla1.jpg',
  '/img/Neue%20Orte/PortaCamollia2.jpg',
  '/img/Neue%20Orte/SantaMariadella%20Scala.jpg',
  '/img/Neue%20Orte/SantaMariadella%20Scala2.jpg',
  '/img/Neue%20Orte/BasilicadiSanDomenico.jpg',
  '/img/Neue%20Orte/BasilicadieSanDomenico2.jpg',
  '/img/Neue%20Orte/Torredella%20Mercanzia.jpg',
  '/img/Neue%20Orte/TorredellaMercanzia2.jpg',
  '/img/Neue%20Orte/PalazzoTolomei.jpg',
  '/img/Neue%20Orte/PalazzoTolomei2.jpg',
  '/img/Neue%20Orte/LogiadellaMercanzia.jpg',
  '/img/Neue%20Orte/LoggiaDellaMercanzia.jpg',
  '/img/Neue%20Orte/PinacotecaNazionale.jpg',
  '/img/Neue%20Orte/PinacotecaNazionale2.jpg',
  '/img/Neue%20Orte/BasilicadieSanFrancesco.jpg',
  '/img/Neue%20Orte/BasilicadieSanFrancesco2.jpg',
  '/img/Neue%20Orte/OratoriodiSanBernardino.jpg',
  '/img/Neue%20Orte/OratoriodiSanBernardino2.jpg',
  '/img/Neue%20Orte/PalazzoChigiSaracini.jpg',
  '/img/Neue%20Orte/PalazzoChigiSaracini2.jpg',
  '/img/Neue%20Orte/Medici-Festung.jpg',
  '/img/Neue%20Orte/Medici-Festung2.jpg',
  '/img/Neue%20Orte/FonteGaia.jpg',
  '/img/Neue%20Orte/FonteGaia2.jpg',
  '/img/Neue%20Orte/PortaRomana.jpg',
  '/img/Neue%20Orte/PortaRomana2.jpg',
  '/img/Neue%20Orte/SantAgostino.jpg',
  '/img/Neue%20Orte/SantAgostino2.jpg',
];

/* ── Update trigger from page script ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ── Install: fetch + cache everything, activate immediately ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete ALL old caches, take control of all tabs ── */
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

  /* Skip unknown cross-origin requests */
  if (!isSameOrigin && !isGoogleFonts) return;

  /* HTML navigation: network-first — always delivers latest version.
     Falls back to cached page only when truly offline. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  /* Images, SVG, fonts, SW itself:
     cache-first — instant response, refreshed in background (stale-while-revalidate) */
  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(res => {
        if (res && res.status === 200 && isSameOrigin) {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
        }
        return res;
      });
      /* Return cached immediately; update cache silently in background */
      return cached || networkFetch.catch(() =>
        new Response('Offline – Ressource nicht verfügbar', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
      );
    })
  );
});
