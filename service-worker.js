/* ═══════════════════════════════════════════════════════════
   service-worker.js — Offline Caching (PWA)
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-08-31
   Dependencies: none
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'aoc-gdd-v275';

// Static assets to precache on install
const PRECACHE_URLS = [

  // Core shell
  '/',
  '/index.html',
  '/manifest.json',
  '/404.html',   /* branded not-found page — without this a bad URL
                    while offline falls through to the browser's error page */

  // Chapter pages (51)
  '/pages/chapters/ch1.html',
  '/pages/chapters/ch2.html',
  '/pages/chapters/ch3.html',
  '/pages/chapters/ch4.html',
  '/pages/chapters/ch5.html',
  '/pages/chapters/ch6.html',
  '/pages/chapters/ch7.html',
  '/pages/chapters/ch8.html',
  '/pages/chapters/ch9.html',
  '/pages/chapters/ch10.html',
  '/pages/chapters/ch11.html',
  '/pages/chapters/ch12.html',
  '/pages/chapters/ch13.html',
  '/pages/chapters/ch14.html',
  '/pages/chapters/ch15.html',
  '/pages/chapters/ch16.html',
  '/pages/chapters/ch17.html',
  '/pages/chapters/ch18.html',
  '/pages/chapters/ch19.html',
  '/pages/chapters/ch20.html',
  '/pages/chapters/ch21.html',
  '/pages/chapters/ch22.html',
  '/pages/chapters/ch23.html',
  '/pages/chapters/ch24.html',
  '/pages/chapters/ch25.html',
  '/pages/chapters/ch26.html',
  '/pages/chapters/ch27.html',
  '/pages/chapters/ch28.html',
  '/pages/chapters/ch29.html',
  '/pages/chapters/ch30.html',
  '/pages/chapters/ch31.html',
  '/pages/chapters/ch32.html',
  '/pages/chapters/ch33.html',
  '/pages/chapters/ch34.html',
  '/pages/chapters/ch35.html',
  '/pages/chapters/ch36.html',
  '/pages/chapters/ch37.html',
  '/pages/chapters/ch38.html',
  '/pages/chapters/ch39.html',
  '/pages/chapters/ch40.html',
  '/pages/chapters/ch42.html',
  '/pages/chapters/ch43.html',
  '/pages/chapters/ch43-ai.html',
  '/pages/chapters/dashboard.html',
  '/pages/chapters/placeholder.html',
  '/pages/chapters/appendices.html',
  '/pages/chapters/suppG.html',
  '/pages/chapters/suppH.html',
  '/pages/chapters/suppI.html',
  '/pages/chapters/suppJ.html',
  '/pages/chapters/suppK.html',

  // Data — JSON (45)
  '/data/audio/tracks.json',
  '/data/search-index.json',
  '/data/search-synonyms.json',
  '/data/dialogue/core-guardians.json',
  '/data/dialogue/eternal-shards.json',
  '/data/dialogue/revenant.json',
  '/data/dialogue/scrap-horde.json',
  '/data/dialogue/terran-league.json',
  '/data/dialogue/unity-accord.json',
  '/data/dialogue/vorax.json',
  '/data/equipment/core-guardians.json',
  '/data/equipment/eternal-shards.json',
  '/data/equipment/revenant.json',
  '/data/equipment/scrap-horde.json',
  '/data/equipment/terran-league.json',
  '/data/equipment/unity-accord.json',
  '/data/equipment/vorax.json',
  '/data/factions/faction-colors.json',
  '/data/factions/faction-emblems.json',
  '/data/factions/faction-logos.json',
  '/data/factions/faction-names.json',
  '/data/factions/factions.json',
  '/data/formations/formations.json',
  '/data/loadouts/unit-loadouts.json',
  '/data/nav/lore-quotes.json',
  '/data/nav/nav-data.json',
  '/data/nav/chapter-meta.json',
  '/data/nav/section-map.json',
  '/data/planets/planet-svg.json',
  '/data/planets/planets.json',
  '/data/sprites/shapes.json',
  '/data/tech/core-guardians.json',
  '/data/tech/eternal-shards.json',
  '/data/tech/revenant.json',
  '/data/tech/scrap-horde.json',
  '/data/tech/terran-league.json',
  '/data/tech/unity-accord.json',
  '/data/tech/vorax.json',
  '/data/units/core-guardians.json',
  '/data/units/eternal-shards.json',
  '/data/units/revenant.json',
  '/data/units/scrap-horde.json',
  '/data/units/terran-league.json',
  '/data/units/unity-accord.json',
  '/data/units/vorax.json',

  // Three.js (local bundle only - the cdnjs fallback is fetched
  // on demand by three-loader.js; precaching a cross-origin URL
  // would make the atomic cache.addAll() fail whenever it is blocked)
  '/js/vendor/three.min.js',

  // JS modules (22)
  '/js/audio-engine.js?v=275',
  '/js/music-player.js?v=275',
  '/js/canvas-galaxy.js?v=275',
  '/js/chapter-index.js?v=275',
  '/js/chapter-loader.js?v=275',
  '/js/content-renderers.js?v=275',
  '/js/dashboard.js?v=275',
  '/js/data-loader.js?v=275',
  '/js/data-worker.js',
  '/js/decrypt-reveal.js?v=275',
  '/js/dev-mode.js?v=275',
  '/js/faction-renderer.js?v=275',
  '/js/glossary.js?v=275',
  '/js/icon-renderer.js?v=275',
  '/js/nav.js?v=275',
  '/js/planet-renderer-v2.js?v=275',
  '/js/planet-textures.js?v=275',
  '/js/search.js?v=275',
  '/js/solar-system.js?v=275',
  '/js/sprite-engine.js?v=275',
  '/js/three-loader.js?v=275',
  '/js/visual-effects.js?v=275',

  // CSS (1)
  '/css/global.css?v=275',

  // Assets (4)
  '/assets/favicon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/territory-map.svg',
];

// Files that should always try network first (CSS, JS, HTML)
const NETWORK_FIRST_EXT = ['.css', '.js', '.html'];


// ───────────────────────────────────────────
// SECTION: Install — Precache static assets
// ───────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});


// ───────────────────────────────────────────
// SECTION: Activate — Clean up old caches
// ───────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});


// ───────────────────────────────────────────
// SECTION: Fetch — Cache-first for static,
//                   network-first for JSON
// ───────────────────────────────────────────

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Navigation requests: network-first, fall back to cached index.html (SPA shell)
  // This ensures offline users always land on a branded, functional page instead
  // of the browser's default offline screen.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('/index.html') || caches.match('/'))
        )
    );
    return;
  }

  // Network-first for JSON data files — always try fresh data
  if (url.pathname.endsWith('.json') && !url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for CSS, JS, HTML — ensures updates always show
  if (NETWORK_FIRST_EXT.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (images, fonts, icons)
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }))
  );
});
