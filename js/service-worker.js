/* ═══════════════════════════════════════════════════════════
   service-worker.js — Offline Caching (PWA)
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: none
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'aoc-gdd-v146';

// Static assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/global.css',
  '/js/data-loader.js',
  '/js/sprite-engine.js',
  '/js/icon-renderer.js',
  '/js/faction-renderer.js',
  '/js/decrypt-reveal.js',
  '/js/chapter-loader.js',
  '/js/dashboard.js',
  '/js/search.js',
  '/js/nav.js',
  '/js/visual-effects.js',
  '/js/dev-mode.js',
  '/js/canvas-galaxy.js',
  '/js/solar-system.js',
  '/js/data-worker.js',
  '/js/content-renderers.js',
  '/js/chapter-index.js',
  '/js/glossary.js',
  '/js/audio-engine.js',
  '/data/nav/nav-data.json',
  '/data/factions/factions.json',
  '/data/search-index.json',
  '/data/search-synonyms.json',
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
