/* ═══════════════════════════════════════════════════════════
   DATA WORKER — Off-Thread JSON Fetch + IndexedDB Cache
   ───────────────────────────────────────────────────────────
   Part of: Ashes of Command: The Reclamation (PWA)
   Created: 2026-03-29
   Dependencies: None (runs in Web Worker context)

   Handles all JSON data fetching off the main thread.
   IndexedDB provides persistent caching so repeat visits
   skip the network entirely.

   Message protocol (postMessage):
     → { type: 'load',    id, path }           Fetch one JSON file
     → { type: 'preload', id, paths[] }        Fetch multiple in parallel
     → { type: 'bust',    id, version }        Clear stale cache entries
     ← { type: 'result',  id, path, data }     Success response
     ← { type: 'batch',   id, results{} }      Preload batch response
     ← { type: 'error',   id, path, message }  Failure response
     ← { type: 'busted',  id, count }          Cache bust confirmation
   ═══════════════════════════════════════════════════════════ */

/* ── Constants ──────────────────────────────────────────── */

const DB_NAME    = 'aoc-gdd-data';
const DB_VERSION = 1;
const STORE_NAME = 'json-cache';

/* Current cache version — bump on deploy to invalidate stale data.
   Stored alongside each entry; bust command compares against this. */
const CACHE_VERSION = 'v49';

/* ── IndexedDB Helpers ──────────────────────────────────── */

let _db = null;

/**
 * Open (or create) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'path' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Read a cached entry from IndexedDB.
 * @param {string} path - JSON file path (key)
 * @returns {Promise<Object|null>} Cached entry or null
 */
async function idbGet(path) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(path);
      req.onsuccess = () => {
        const entry = req.result;
        /* Only return if version matches current deploy */
        if (entry && entry.version === CACHE_VERSION) {
          resolve(entry);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Write a cache entry to IndexedDB.
 * @param {string} path - JSON file path (key)
 * @param {*} data - Parsed JSON data
 */
async function idbPut(path, data) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put({
        path,
        data,
        version: CACHE_VERSION,
        ts: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
      tx.onabort    = () => resolve(false);
    });
  } catch {
    /* IndexedDB write failures are non-fatal */
    return false;
  }
}

/**
 * Clear all entries that don't match the current CACHE_VERSION.
 * @returns {Promise<number>} Number of stale entries removed
 */
async function idbBust() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.openCursor();
      let count   = 0;

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(count); return; }
        if (cursor.value.version !== CACHE_VERSION) {
          cursor.delete();
          count++;
        }
        cursor.continue();
      };
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/* ── In-Memory Cache (per worker session) ───────────────── */

const memCache = {};

/* ── Fetch Logic ────────────────────────────────────────── */

/**
 * Load a JSON file: memory cache → IndexedDB → network.
 * Results are stored in both caches for future requests.
 * @param {string} path - Relative path to JSON file
 * @returns {Promise<*>} Parsed JSON data
 */
async function loadJSON(path) {
  /* 1. Memory cache (instant) */
  if (memCache[path]) return memCache[path];

  /* 2. IndexedDB cache (< 5ms) */
  const cached = await idbGet(path);
  if (cached) {
    memCache[path] = cached.data;
    return cached.data;
  }

  /* 3. Network fetch — resolve path from site root, not worker location */
  const url = new URL(path, self.location.origin + '/');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${path}`);
  const data = await resp.json();

  /* Store in both caches */
  memCache[path] = data;
  await idbPut(path, data);

  return data;
}

/* ── Message Handler ────────────────────────────────────── */

self.onmessage = async function(e) {
  const { type, id, path, paths, version } = e.data;

  switch (type) {

    /* ── Single file load ── */
    case 'load': {
      try {
        const data = await loadJSON(path);
        self.postMessage({ type: 'result', id, path, data });
      } catch (err) {
        self.postMessage({ type: 'error', id, path, message: err.message });
      }
      break;
    }

    /* ── Batch preload (parallel) ── */
    case 'preload': {
      const results = {};
      const settled = await Promise.allSettled(
        paths.map(async (p) => {
          results[p] = await loadJSON(p);
        })
      );
      /* Log failures but don't block the batch */
      settled.forEach((s, i) => {
        if (s.status === 'rejected') {
          results[paths[i]] = null;
        }
      });
      self.postMessage({ type: 'batch', id, results });
      break;
    }

    /* ── Cache bust ── */
    case 'bust': {
      const count = await idbBust();
      self.postMessage({ type: 'busted', id, count });
      break;
    }

    default:
      self.postMessage({ type: 'error', id, message: `Unknown message type: ${type}` });
  }
};

/* ── Startup: auto-bust stale entries ───────────────────── */
idbBust();
