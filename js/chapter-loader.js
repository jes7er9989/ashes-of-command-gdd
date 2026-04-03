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
    ch8:  { prefix: 'revenant', dataKey: 'revenant',          color: '#AA77FF', cssVar: '--revenant', name: 'revenant' },
    ch9:  { prefix: 'accord',   dataKey: 'unity-accord',     color: '#44ff66', cssVar: '--accord',   name: 'accord' },
    ch10: { prefix: 'vorax',    dataKey: 'vorax',            color: '#ff2266', cssVar: '--vorax',    name: 'vorax' },
    ch11: { prefix: 'guardian',  dataKey: 'core-guardians',   color: '#ffaa22', cssVar: '--guardians', name: 'guardians' }
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

    // Use page transition if DecryptReveal is available
    const contentArea = this.contentArea;
    const self = this;

    const injectContent = () => {
      const dashBtn = `
        <div class="back-to-dashboard-wrap">
          <button class="back-to-dashboard" onclick="location.hash='#dashboard'">
            <span class="dash-btn-icon">◆</span>
            <span class="dash-btn-label">RETURN TO COMMAND DASHBOARD</span>
            <span class="dash-btn-icon">◆</span>
          </button>
        </div>`;
      contentArea.innerHTML = `${dashBtn}<div class="fade-in">${html}</div>${dashBtn}`;
    };

    if (typeof DecryptReveal !== 'undefined') {
      await DecryptReveal.transition(contentArea, injectContent);
    } else {
      injectContent();
    }

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
      // Force all scrollable containers to top
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.getElementById('main-content');
      if (main) main.scrollTop = 0;
      if (this.contentArea) this.contentArea.scrollTop = 0;
    }

    // Update document title from nav metadata
    this.updateTitle(chapterId);

    // Apply faction-specific body class (changes accent colors)
    this.applyFactionClass(chapterId);

    // Sync visual subsystems (ambient particles, cursor, badge, audio)
    if (typeof FactionBgSwitcher !== 'undefined') {
      FactionBgSwitcher.apply(chapterId);
    }

    // Switch audio engine faction theme if audio is active
    const factionAudio = this.FACTION_MAP[chapterId];
    if (factionAudio && typeof AudioEngine !== 'undefined') {
      AudioEngine.setFaction(factionAudio.name);
      // Play faction entrance sting if audio is on
      var ab = document.getElementById('audio-toggle');
      if (ab && ab.getAttribute('data-on') === '1') {
        try { AudioEngine.playAction('factionEnter'); } catch(e) {}
      }
    }

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

    /* Wrap tables and fixed-column grids in scroll containers for mobile.
       Runs AFTER all dynamic content (factions, planets, formations) renders. */
    this._wrapOverflowElements();
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
   * Chapter-to-part background mapping for non-faction chapters.
   * Keys are chapter IDs, values are #procedural-bg CSS classes.
   */
  PART_BG_MAP: {
    ch1: 'bg-foundation', ch2: 'bg-foundation', ch3: 'bg-foundation', ch4: 'bg-foundation',
    ch12: 'bg-galactic', ch13: 'bg-galactic', ch14: 'bg-galactic', ch15: 'bg-galactic', ch16: 'bg-galactic',
    ch17: 'bg-combat', ch18: 'bg-combat', ch19: 'bg-combat', ch20: 'bg-combat',
    ch21: 'bg-combat', ch22: 'bg-combat', ch23: 'bg-combat',
    ch24: 'bg-strategy', ch25: 'bg-strategy', ch26: 'bg-strategy', ch27: 'bg-strategy',
    ch28: 'bg-strategy', ch29: 'bg-strategy', ch30: 'bg-strategy', ch31: 'bg-strategy',
    ch32: 'bg-finalwar', ch33: 'bg-finalwar', ch34: 'bg-finalwar',
    ch35: 'bg-presentation', ch36: 'bg-presentation', ch37: 'bg-presentation',
    appendices: 'bg-appendix',
    appA: 'bg-appendix', appB: 'bg-appendix', appC: 'bg-appendix',
    appD: 'bg-appendix', appE: 'bg-appendix', appF: 'bg-appendix',
  },

  /** All procedural-bg CSS classes that can be applied */
  ALL_BG_CLASSES: [
    'bg-terran', 'bg-shards', 'bg-horde', 'bg-revenant', 'bg-accord', 'bg-vorax', 'bg-guardians',
    'bg-foundation', 'bg-galactic', 'bg-combat', 'bg-strategy', 'bg-finalwar', 'bg-presentation', 'bg-appendix', 'bg-cosmic'
  ],

  applyFactionClass(chapterId) {
    // Remove all faction classes from body
    document.body.classList.remove(
      'faction-terran', 'faction-shards', 'faction-horde',
      'faction-revenant', 'faction-accord', 'faction-vorax', 'faction-guardians',
      'faction-bg-terran', 'faction-bg-shards', 'faction-bg-horde',
      'faction-bg-revenant', 'faction-bg-accord', 'faction-bg-vorax', 'faction-bg-guardians'
    );

    // Get #procedural-bg element
    const procBg = document.getElementById('procedural-bg');
    if (procBg) {
      this.ALL_BG_CLASSES.forEach(cls => procBg.classList.remove(cls));
    }

    const faction = this.FACTION_MAP[chapterId];
    if (faction) {
      // Faction chapter — apply both class patterns for CSS compatibility
      document.body.classList.add(`faction-${faction.name}`);
      document.body.classList.add(`faction-bg-${faction.name}`);
      if (procBg) procBg.classList.add(`bg-${faction.name}`);
    } else {
      // Non-faction chapter — apply part-specific background
      const partBg = this.PART_BG_MAP[chapterId];
      if (procBg && partBg) procBg.classList.add(partBg);
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
  },

  /* ── Mobile Overflow Wrappers ────────────────────────── */

  /**
   * Wrap tables and fixed-column grids in horizontally scrollable
   * containers so they don't break layout on narrow viewports.
   * Only runs when viewport is <= 768px.
   */
  _wrapOverflowElements() {
    if (window.innerWidth > 768) return;
    if (!this.contentArea) return;

    // Wrap <table> elements
    this.contentArea.querySelectorAll('table').forEach(function(table) {
      if (table.parentNode.classList.contains('table-scroll-wrap')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-scroll-wrap';
      wrapper.style.cssText = 'overflow-x:auto;-webkit-overflow-scrolling:touch;margin:12px 0;max-width:100%';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });

    // Wrap inline-styled grid divs with fixed-pixel columns (e.g. "200px 60px 90px")
    this.contentArea.querySelectorAll('[style*="grid-template-columns"]').forEach(function(el) {
      var style = el.getAttribute('style') || '';
      // Only wrap if it has pixel-based columns (not 1fr-only grids)
      if (!/grid-template-columns[^;]*\d+px/.test(style)) return;
      if (el.parentNode.classList.contains('table-scroll-wrap')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-scroll-wrap';
      wrapper.style.cssText = 'overflow-x:auto;-webkit-overflow-scrolling:touch;margin:4px 0;max-width:100%';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    });
  }
};
