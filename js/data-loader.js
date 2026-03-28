/* ═══════════════════════════════════════════════════════════
   DATA LOADER — Fetch & Cache JSON Data Files
   ───────────────────────────────────────────────────────────
   Central data-access layer for the GDD browser. Every JSON
   fetch goes through DataLoader.load(), which caches results
   so repeated requests (e.g. navigating back to a faction
   chapter) are instant.

   Key exports:
     DataLoader.load(path)           → generic cached fetch
     DataLoader.loadNavData()        → navigation tree
     DataLoader.loadFactions()       → faction overview array
     DataLoader.loadFactionUnits(k)  → units for one faction
     DataLoader.loadAllUnits()       → units for ALL factions
     DataLoader.FACTION_KEYS         → canonical faction key list

   Dependencies: None (standalone; loaded first in index.html)
   ═══════════════════════════════════════════════════════════ */

const DataLoader = {

  /* ── Cache ──
     Simple path→data map. Persists for the page session so each
     JSON file is fetched at most once.                           */
  cache: {},

  /* ── Core Fetch ────────────────────────────────────────── */

  /**
   * Fetch a JSON file, returning cached data if available.
   * @param {string} path - Relative path to the JSON file (e.g. 'data/factions/factions.json')
   * @returns {Promise<Object|Array>} Parsed JSON data
   * @throws {Error} If the HTTP response is not OK
   */
  async load(path) {
    if (this.cache[path]) return this.cache[path];
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    const d = await r.json();
    this.cache[path] = d;
    return d;
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
    'necro-legion',
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
    const results = {};
    for (const key of this.FACTION_KEYS) {
      try { results[key] = await this.loadFactionEquipment(key); }
      catch (e) { results[key] = []; }
    }
    return results;
  }
};
