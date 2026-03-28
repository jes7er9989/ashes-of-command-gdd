/* ═══════════════════════════════════════════════════════════
   CHAPTER LOADER - Fetch, Cache & Render Chapter HTML Fragments
   ───────────────────────────────────────────────────────────
   Loads chapter pages from /pages/chapters/<id>.html, injects
   them into the main content area, and - for faction chapters
   (ch5-ch11) - triggers the FactionRenderer to populate unit
   tables, equipment lists, tech trees, and dialogue sections.

   Key exports:
     ChapterLoader.load(chapterId)  → fetch & display a chapter
     ChapterLoader.FACTION_MAP      → chapter-to-faction mapping

   Dependencies:
     - DataLoader       (fetches JSON data for faction chapters)
     - FactionRenderer  (builds unit/equip/tech/dialogue UI)
     - Nav              (provides chapter metadata for titles)
   ═══════════════════════════════════════════════════════════ */

const ChapterLoader = {

  /** HTML cache: chapterId → raw HTML string */
  cache: {},

  /** Reference to #content-area (lazily initialized) */
  contentArea: null,

  /* ── Route Alias Map ────────────────────────────────── */

  /**
   * Maps chapter IDs that don't have their own HTML file to a
   * real page + optional scroll-to anchor. Appendices A-F all
   * live inside appendices.html; Supplementaries G-K get their
   * own stub pages.
   */
  ROUTE_ALIASES: {
    appA: { page: 'appendices', anchor: 'sec-appendices-0' },
    appB: { page: 'appendices', anchor: 'sec-appendices-1' },
    appC: { page: 'appendices', anchor: 'sec-appendices-2' },
    appD: { page: 'appendices', anchor: 'sec-appendices-3' },
    appE: { page: 'appendices', anchor: 'sec-appendices-4' },
    appF: { page: 'appendices', anchor: 'sec-appendices-5' },
  },

  /* ── Faction Chapter Mapping ─────────────────────────── */

  /**
   * Maps faction chapter IDs (ch5-ch11) to their data keys,
   * display colors, and CSS class names. Non-faction chapters
   * are not in this map and render as plain HTML only.
   */
  FACTION_MAP: {
    ch5:  { prefix: 'terran',   dataKey: 'terran-league',    color: '#00b4ff', cssVar: '--terran',   name: 'terran' },
    ch6:  { prefix: 'shards',   dataKey: 'eternal-shards',   color: '#00ffee', cssVar: '--shards',   name: 'shards' },
    ch7:  { prefix: 'horde',    dataKey: 'scrap-horde',      color: '#ff6622', cssVar: '--horde',    name: 'horde' },
    ch8:  { prefix: 'necro',    dataKey: 'necro-legion',     color: '#44ff66', cssVar: '--necro',    name: 'necro' },
    ch9:  { prefix: 'accord',   dataKey: 'unity-accord',     color: '#ffaa22', cssVar: '--accord',   name: 'accord' },
    ch10: { prefix: 'vorax',    dataKey: 'vorax',            color: '#ff2266', cssVar: '--vorax',    name: 'vorax' },
    ch11: { prefix: 'guardian',  dataKey: 'core-guardians',   color: '#cc44ff', cssVar: '--guardians', name: 'guardians' }
  },

  /* ── Initialization ──────────────────────────────────── */

  /**
   * Cache the #content-area reference. Called once at boot or
   * lazily on first load().
   */
  init() {
    this.contentArea = document.getElementById('content-area');
  },

  /* ── Core Load ───────────────────────────────────────── */

  /**
   * Fetch a chapter's HTML fragment, inject it into the content
   * area, update the page title and faction body class, and
   * initialize faction data if applicable.
   * @param {string} chapterId - Chapter ID (e.g. 'ch5', 'ch22', 'appA')
   * @returns {Promise<void>}
   */
  async load(chapterId) {
    if (!this.contentArea) this.init();

    // Check for route aliases (e.g. appA → appendices + scroll)
    const alias = this.ROUTE_ALIASES[chapterId];
    const fileId = alias ? alias.page : chapterId;

    // Fetch or use cached HTML
    let html = this.cache[fileId];
    if (!html) {
      try {
        const resp = await fetch(`pages/chapters/${fileId}.html`);
        if (!resp.ok) throw new Error(`${resp.status}`);
        html = await resp.text();
        this.cache[fileId] = html;
      } catch (e) {
        this.contentArea.innerHTML = `
          <div class="fade-in" style="padding-top:20px;">
            <h2>Failed to Load</h2>
            <p style="color:var(--text-dim);">Could not load chapter "${chapterId}": ${e.message}</p>
          </div>`;
        return;
      }
    }

    // Inject HTML with fade-in wrapper + back-to-dashboard button at bottom (centered, stylized)
    const dashBtn = `
      <div class="back-to-dashboard-wrap">
        <button class="back-to-dashboard" onclick="location.hash='#dashboard'">
          <span class="dash-btn-icon">◆</span>
          <span class="dash-btn-label">RETURN TO COMMAND DASHBOARD</span>
          <span class="dash-btn-icon">◆</span>
        </button>
      </div>`;
    this.contentArea.innerHTML = `<div class="fade-in">${html}</div>${dashBtn}`;

    // Scroll to anchor if this was an alias, otherwise scroll to top
    if (alias && alias.anchor) {
      requestAnimationFrame(() => {
        const target = document.getElementById(alias.anchor);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      });
    } else {
      const main = document.getElementById('main-content');
      if (main) main.scrollTop = 0;
      window.scrollTo({ top: 0 });
    }

    // Update document title from nav metadata
    this.updateTitle(chapterId);

    // Apply faction-specific body class (changes accent colors)
    this.applyFactionClass(chapterId);

    // For faction chapters, load and render all faction data
    const faction = this.FACTION_MAP[chapterId];
    if (faction) {
      await this.initFactionChapter(faction);
    }

    // For planet chapters (ch12/ch13), render planet cards and territory bars
    if (chapterId === 'ch12' || chapterId === 'ch13') {
      if (typeof ContentRenderers !== 'undefined') {
        if (document.getElementById('planet-list')) {
          ContentRenderers.buildPlanetCards('planet-list');
        }
        if (document.getElementById('territory-bars')) {
          ContentRenderers.buildTerritoryBars('territory-bars');
        }
      }
    }

    // For the auto-battle chapter (ch17), render formation cards
    if (chapterId === 'ch17') {
      if (typeof ContentRenderers !== 'undefined') {
        if (document.getElementById('space-formations')) {
          ContentRenderers.buildFormationCards('space-formations');
        }
      }
    }

    // Auto-link glossary terms in the loaded content
    if (typeof Glossary !== 'undefined') {
      Glossary.init(this.contentArea);
    }
  },

  /* ── Title & Theming ─────────────────────────────────── */

  /**
   * Set the browser tab title to match the loaded chapter.
   * @param {string} chapterId - Chapter ID
   */
  updateTitle(chapterId) {
    if (!Nav.navData) return;
    const ch = Nav.findChapter(chapterId);
    if (ch) {
      document.title = `Ch ${ch.num} — ${ch.title} | Ashes of Command: The Reclamation`;
    } else {
      document.title = 'Ashes of Command: The Reclamation — Interactive GDD';
    }
  },

  /**
   * Add a faction-specific class to <body> so CSS can theme
   * the page (e.g. accent-color overrides). Removes any
   * previously applied faction class first.
   * @param {string} chapterId - Chapter ID
   */
  applyFactionClass(chapterId) {
    document.body.classList.remove(
      'faction-terran', 'faction-shards', 'faction-horde',
      'faction-necro', 'faction-accord', 'faction-vorax', 'faction-guardians'
    );

    const faction = this.FACTION_MAP[chapterId];
    if (faction) {
      document.body.classList.add(`faction-${faction.name}`);
    }
  },

  /* ── Faction Data Initialization ─────────────────────── */

  /**
   * Load all data for a faction chapter (units, equipment, tech,
   * dialogue, sprites) in parallel, then pass each dataset to
   * FactionRenderer to populate the corresponding DOM containers.
   * @param {Object} faction - Entry from FACTION_MAP
   * @returns {Promise<void>}
   */
  async initFactionChapter(faction) {
    const { prefix, dataKey, color } = faction;

    // Fetch all four data types concurrently
    const [units, equipment, tech, dialogue] = await Promise.all([
      DataLoader.loadFactionUnits(dataKey).catch(() => []),
      DataLoader.loadFactionEquipment(dataKey).catch(() => []),
      DataLoader.loadFactionTech(dataKey).catch(() => []),
      DataLoader.loadFactionDialogue(dataKey).catch(() => [])
    ]);

    // Sprites and building icons are shared across all factions (single JSON files)
    let sprites = {};
    try {
      sprites = await DataLoader.load('data/sprites/unit-sprites.json');
    } catch (e) { /* sprites are optional - page works without them */ }
    try {
      await DataLoader.load('data/icons/build-icons.json');
    } catch (e) { /* building icons are optional - page works without them */ }

    // Hand off to FactionRenderer to build each UI section
    FactionRenderer.buildUnitList(units, `${prefix}-unit-list`, color, prefix, sprites);
    FactionRenderer.buildFactionBuildings(prefix, `${prefix}-buildings`, color);
    FactionRenderer.buildEquipment(equipment, `${prefix}-equipment`, color);
    FactionRenderer.buildTechTree(tech, `${prefix}-tech-tree`, color);
    FactionRenderer.buildDialogue(dialogue, `${prefix}-dialogue`, color);

    // Register global filter/sort functions that chapter HTML onclick handlers call
    FactionRenderer.registerFilterFunctions(units, prefix, color, sprites);
  }
};
