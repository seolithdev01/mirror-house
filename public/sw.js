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
// The build stamps both placeholders (vite.config.ts → mhPostBuild): BUILD is a
// content hash of the shell + the hashed asset list, so every deploy opens its
// own cache and `activate` sweeps the previous one (no release ever leaves a
// stale 700 KB bundle behind); ASSETS is the hashed /assets/* list, precached
// at install so the house is fully offline after the FIRST visit, not the
// second. Unstamped (a raw copy of this file), both fall back harmlessly.
const BUILD = '__MH_BUILD__';
const ASSETS = ['__MH_ASSETS__'].filter((p) => p.startsWith('/assets/'));
const CACHE = `mh-${BUILD.startsWith('__') ? 'v6' : BUILD}`;
// M6/T4 — the demo venue pack rides the precache: a sponsored floor is an
// opt-in side excursion, and the pack's fetch failing offline would toast
// "venue floor unavailable" for a pack we shipped — so the shell banks it.
const PRECACHE = [
  '/', // not '/index.html': Pages 308s it to '/', and one failed entry fails the whole install
  '/manifest.webmanifest',
  '/icon.svg',
  '/venues/demo-glasshouse-cafe.json',
  ...ASSETS,
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
        if (fresh.ok && fresh.type === 'basic') cache.put(req, fresh.clone());
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
