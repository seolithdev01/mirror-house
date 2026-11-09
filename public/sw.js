// SPDX-License-Identifier: Apache-2.0
// Mirror House service worker (M4/T5). Hand-rolled on purpose — no dependency,
// no eval, nothing remote. The plan, exactly:
//   install   → precache the shell + skipWaiting
//   activate  → delete every cache whose name !== CACHE + clients.claim
//   fetch     → same-origin GET only:
//                 /assets/*   → cache-first (match, else fetch + put)
//                 /venues/*   → cache-first (the precached packs; match, else
//                                 fetch + put — a shipped pack survives offline)
//                 navigations → network-first, offline fallback to '/'
//                 everything else → passthrough (no respondWith at all)
const CACHE = 'mh-v5';
// M6/T4 — the demo venue pack rides the precache: a sponsored floor is an
// opt-in side excursion, and the pack's fetch failing offline would toast
// "venue floor unavailable" for a pack we shipped — so the shell banks it.
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/venues/demo-glasshouse-cafe.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // passthrough — only GET is ever ours
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // passthrough — never remote

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/venues/')) {
    // cache-first: hashed filenames are immutable, so a miss fetches and banks;
    // venue packs are precached at install and a miss (a pack we did not ship)
    // fetches and banks the same way
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    // network-first: the newest shell wins while online; offline falls back
    // to the precached '/' (index.html) and the runtime-cached /assets/
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // everything else: no respondWith — the network speaks for itself
});
