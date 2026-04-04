/* ═══════════════════════════════════════════════════════════
   DATA LOADER — Fetch & Cache JSON Data Files
   ───────────────────────────────────────────────────────────
   Part of: Ashes of Command: The Reclamation (PWA)
   Created: 2026-03-28 | Modified: 2026-03-29
   Dependencies: js/data-worker.js (Web Worker, optional)

   Central data-access layer for the GDD browser. All JSON
   fetches go through DataLoader.load().

   Architecture:
     - If Web Workers are supported, all fetching + parsing
       happens off the main thread via data-worker.js.
     - The worker uses IndexedDB for persistent caching, so
       repeat visits skip the network entirely.
     - If Workers aren't available, falls back to direct
       fetch() with in-memory caching (original behavior).

   Key exports:
     DataLoader.load(path)           → generic cached fetch
     DataLoader.preload(paths)       → batch-load critical data
     DataLoader.loadNavData()        → navigation tree
     DataLoader.loadFactions()       → faction overview array
     DataLoader.loadFactionUnits(k)  → units for one faction
     DataLoader.loadAllUnits()       → units for ALL factions
     DataLoader.FACTION_KEYS         → canonical faction key list
   ═══════════════════════════════════════════════════════════ */

const DataLoader = {

  /* ── Cache (fallback + fast-path for already-loaded data) ── */
  cache: {},

  /* ── Worker State ─────────────────────────────────────── */
  _worker: null,
  _pending: {},
  _msgId: 0,
  _workerReady: false,

  /* ── Initialization ───────────────────────────────────── */

  /**
   * Boot the Web Worker if supported. Called once on app start.
   * Non-blocking — if worker creation fails, we fall back to
   * direct fetch silently.
   */
  init() {
    if (typeof Worker === 'undefined') return;
    try {
      this._worker = new Worker('js/data-worker.js');
      this._workerReady = true;

      this._worker.onmessage = (e) => {
        const { type, id, path, data, results, message, count } = e.data;

        switch (type) {
          case 'result': {
            /* Single file loaded — cache locally + resolve */
            this.cache[path] = data;
            const p = this._pending[id];
            if (p) { p.resolve(data); delete this._pending[id]; }
            break;
          }
          case 'batch': {
            /* Preload batch — cache all results + resolve */
            for (const [p, d] of Object.entries(results)) {
              if (d !== null) this.cache[p] = d;
            }
            const pb = this._pending[id];
            if (pb) { pb.resolve(results); delete this._pending[id]; }
            break;
          }
          case 'error': {
            const pe = this._pending[id];
            if (pe) {
              pe.reject(new Error(message || `Worker error: ${path}`));
              delete this._pending[id];
            }
            break;
          }
          case 'busted': {
            console.log(`[DataLoader] IndexedDB cache: ${count} stale entries cleared`);
            const pbu = this._pending[id];
            if (pbu) { pbu.resolve(count); delete this._pending[id]; }
            break;
          }
        }
      };

      this._worker.onerror = (err) => {
        console.warn('[DataLoader] Worker error, falling back to direct fetch:', err.message);
        this._workerReady = false;
      };

      /* Preload critical data for first paint */
      this.preload([
        'data/nav/nav-data.json',
        'data/factions/factions.json',
        'data/nav/section-map.json',
        'data/icons/equip-icons.json',
        'data/icons/build-icons.json',
        'data/sprites/unit-sprites.json',
        'data/sprites/shapes.json'
      ]);

    } catch (err) {
      console.warn('[DataLoader] Worker init failed:', err.message);
      this._workerReady = false;
    }
  },

  /* ── Worker Communication ─────────────────────────────── */

  /**
   * Send a message to the worker and return a Promise for the response.
   * @param {Object} msg - Message payload (type, path, etc.)
   * @returns {Promise<*>}
   */
  _send(msg) {
    return new Promise((resolve, reject) => {
      const id = ++this._msgId;
      this._pending[id] = { resolve, reject };
      this._worker.postMessage({ ...msg, id });
    });
  },

  /* ── Core Fetch ────────────────────────────────────────── */

  /**
   * Fetch a JSON file, returning cached data if available.
   * Routes through Web Worker when available, with IndexedDB
   * persistent caching. Falls back to direct fetch().
   *
   * @param {string} path - Relative path to the JSON file
   * @returns {Promise<Object|Array>} Parsed JSON data
   * @throws {Error} If the fetch fails
   */
  async load(path) {
    /* 1. In-memory cache (instant, no worker roundtrip) */
    if (this.cache[path]) return this.cache[path];

    /* 2. Worker path (off-thread fetch + IndexedDB) */
    if (this._workerReady) {
      try {
        return await this._send({ type: 'load', path });
      } catch (err) {
        console.warn(`[DataLoader] Worker load failed for ${path}, falling back:`, err.message);
        /* Fall through to direct fetch */
      }
    }

    /* 3. Direct fetch fallback */
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    const d = await r.json();
    this.cache[path] = d;
    return d;
  },

  /**
   * Batch-preload multiple JSON files in parallel.
   * Useful for warming the cache on app boot.
   * @param {string[]} paths - Array of JSON file paths
   * @returns {Promise<Object>} Map of path → data
   */
  async preload(paths) {
    /* Filter out already-cached paths */
    const needed = paths.filter(p => !this.cache[p]);
    if (needed.length === 0) return {};

    if (this._workerReady) {
      try {
        return await this._send({ type: 'preload', paths: needed });
      } catch (err) {
        console.warn('[DataLoader] Worker preload failed, falling back:', err.message);
      }
    }

    /* Fallback: parallel direct fetches */
    const results = {};
    await Promise.allSettled(needed.map(async (p) => {
      try {
        const r = await fetch(p);
        if (r.ok) {
          const d = await r.json();
          this.cache[p] = d;
          results[p] = d;
        }
      } catch { /* non-fatal */ }
    }));
    return results;
  },

  /* ── Convenience Loaders ──────────────────────────────── */

  /**
   * Load the sidebar navigation tree (parts → chapters).
   * @returns {Promise<Array>} Array of part objects with nested chapter arrays
   */
  async loadNavData() {
    return this.load('data/nav/nav-data.json');
  },

  /**
   * Load the master faction overview list (names, colors, stats).
   * @returns {Promise<Array>} Array of faction summary objects
   */
  async loadFactions() {
    return this.load('data/factions/factions.json');
  },

  /**
   * Load the unit roster for a single faction.
   * @param {string} key - Faction key (e.g. 'terran-league', 'scrap-horde')
   * @returns {Promise<Array>} Array of unit objects
   */
  async loadFactionUnits(key) {
    return this.load(`data/units/${key}.json`);
  },

  /**
   * Load the equipment list for a single faction.
   * @param {string} key - Faction key
   * @returns {Promise<Array>} Array of equipment objects
   */
  async loadFactionEquipment(key) {
    return this.load(`data/equipment/${key}.json`);
  },

  /**
   * Load the tech tree for a single faction.
   * @param {string} key - Faction key
   * @returns {Promise<Array>} Array of tech branch objects
   */
  async loadFactionTech(key) {
    return this.load(`data/tech/${key}.json`);
  },

  /**
   * Load the dialogue beats for a single faction.
   * @param {string} key - Faction key
   * @returns {Promise<Array>} Array of dialogue beat objects
   */
  async loadFactionDialogue(key) {
    return this.load(`data/dialogue/${key}.json`);
  },

  /* ── Faction Key Registry ─────────────────────────────── */

  /** Canonical list of all faction data-folder keys, in display order. */
  FACTION_KEYS: [
    'terran-league',
    'eternal-shards',
    'scrap-horde',
    'revenant',
    'unity-accord',
    'vorax',
    'core-guardians'
  ],

  /* ── Bulk Loaders ─────────────────────────────────────── */

  /**
   * Load units for every faction. Failures are silently replaced
   * with empty arrays so one missing file doesn't break the whole set.
   * @returns {Promise<Object>} Map of factionKey → unit array
   */
  async loadAllUnits() {
    /* Preload all unit files in parallel for speed */
    const paths = this.FACTION_KEYS.map(k => `data/units/${k}.json`);
    await this.preload(paths);

    const results = {};
    for (const key of this.FACTION_KEYS) {
      try { results[key] = await this.loadFactionUnits(key); }
      catch (e) { results[key] = []; }
    }
    return results;
  },

  /**
   * Load equipment for every faction (same error-tolerance as loadAllUnits).
   * @returns {Promise<Object>} Map of factionKey → equipment array
   */
  async loadAllEquipment() {
    const paths = this.FACTION_KEYS.map(k => `data/equipment/${k}.json`);
    await this.preload(paths);

    const results = {};
    for (const key of this.FACTION_KEYS) {
      try { results[key] = await this.loadFactionEquipment(key); }
      catch (e) { results[key] = []; }
    }
    return results;
  }
};
