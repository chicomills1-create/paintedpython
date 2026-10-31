/* Painted Python — service worker, PWA Stage 0.
   Honest scope: cache the app shell + the static assets we have actually
   seen, so the installed front door opens offline. The app itself is
   localStorage-driven, so with the shell cached it keeps working.
   Not promised here: push, background sync, offline form posts.
   Rules: GET only, same-origin only, POST and cross-origin are never
   touched. Pages are network-first; static assets are cache-first. */
const CACHE = 'pp-shell-v51';
const CORE = ['/', '/index.html', '/app.js?v=51', '/styles.css?v=51', '/manifest.webmanifest'];
const ASSETS = ['/icon-192.png', '/icon-512.png', '/maskable-512.png',
  '/apple-touch-icon.png', '/assets/scales-bg-ballpython.jpg', '/assets/tile-painting.webp', '/assets/tile-digital.webp', '/assets/tile-illustration.webp', '/assets/tile-photography.webp', '/assets/tile-sculpture.webp', '/assets/tile-mixed.webp', '/assets/tile-portraits.webp', '/assets/tile-pets.webp', '/assets/tile-all.webp', '/assets/hero-plate.webp',
  '/assets/painty-evolved.webp', '/assets/founders-plate.webp', '/assets/plate-pandora.webp',
  '/assets/plate-grotto.webp', '/assets/piece-serpent.webp', '/assets/piece-universe.webp',
  '/assets/piece-golden.webp', '/assets/piece-botanica.webp', '/assets/piece-bloom.webp',
  '/assets/piece-otherworld.webp', '/assets/logo-emblem.webp', '/assets/logo-mark.webp', '/assets/piece-electric.webp', '/assets/piece-current.webp'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(CORE).then(function () {
      // Best-effort: one missing asset must not sink the whole install.
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      return k === CACHE ? null : caches.delete(k); // retire old shell versions
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;              // never cache or intercept POST
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin: network only
  if (req.mode === 'navigate') {
    // Pages: fresh from the network first; the cached shell when offline.
    e.respondWith(fetch(req).catch(function () {
      return caches.match('/index.html').then(function (r) {
        return r || caches.match('/');
      });
    }));
    return;
  }
  // Static, same-origin: cache first, then network — and keep what we fetched
  // so the offline shell holds the last-seen assets.
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});
