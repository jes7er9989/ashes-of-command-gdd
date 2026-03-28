/* ═══════════════════════════════════════════════════════════
   FACTION RENDERER — Build Unit/Equipment/Tech/Dialogue UI
   ───────────────────────────────────────────────────────────
   Pure rendering module: takes data arrays and injects styled
   HTML into faction chapter containers. Also registers global
   filter/sort functions that chapter HTML onclick handlers use.

   Key exports:
     FactionRenderer.buildUnitList(...)       → unit roster table
     FactionRenderer.buildEquipment(...)      → equipment list
     FactionRenderer.buildTechTree(...)       → tech tree cards
     FactionRenderer.buildDialogue(...)       → dialogue beats
     FactionRenderer.buildFactionBuildings(.) → building card grid
     FactionRenderer.registerFilterFunctions  → domain filter & sort
     FactionRenderer.toggleUnitDetail(...)    → expand/collapse unit

   Dependencies:
     - ChapterLoader.FACTION_MAP  (for reverse prefix→chapter lookup)
     - DataLoader.cache           (reads cached data for detail panels)
     - SpriteEngine               (canvas/SVG unit sprite rendering)
     - IconRenderer               (equipment & building icon lookup)
   ═══════════════════════════════════════════════════════════ */

const FactionRenderer = {

  /* ═══════════════════════════════════════════════════════
     UNIT LIST — Roster table with expandable detail panels
     ═══════════════════════════════════════════════════════ */

  /**
   * Render a sortable/filterable unit roster into a container.
   * Each row is clickable to expand a detail panel below it.
   * @param {Array}  units       - Array of unit objects
   * @param {string} containerId - DOM id of the target container
   * @param {string} color       - Faction hex color (e.g. '#00b4ff')
   * @param {string} prefix      - Faction prefix (e.g. 'terran')
   * @param {Object} sprites     - Map of unit name → SVG string
   */
  buildUnitList(units, containerId, color, prefix, sprites) {
    const el = document.getElementById(containerId);
    if (!el || !units.length) return;
    el.innerHTML = units.map((u, i) => this._unitRow(u, i, color, prefix, sprites)).join('');
    this._bindUnitExpand(el, color, prefix, sprites, units);
  },

  /**
   * Build a single unit row (grid layout with inline styles).
   * @param {Object} u      - Unit data object
   * @param {number} idx    - Index in the units array
   * @param {string} color  - Faction hex color
   * @param {string} prefix - Faction prefix
   * @param {Object} sprites - Sprite map
   * @returns {string} HTML string
   */
  _unitRow(u, idx, color, prefix, sprites) {
    const domainBadge = this._domainBadge(u.domain);
    const num = u.num != null ? u.num : idx + 1;
    return `
      <div class="unit-row" data-domain="${u.domain || ''}" data-idx="${idx}"
           style="display:grid;grid-template-columns:44px 170px 140px 130px 1fr 70px;padding:8px 12px;border-bottom:1px solid var(--border);font-size:0.72rem;color:var(--text-mid);cursor:pointer;transition:background 0.15s"
           onmouseenter="this.style.background='rgba(${this._hexToRgb(color)},0.06)'"
           onmouseleave="this.style.background=''"
           onclick="FactionRenderer.toggleUnitDetail(this,'${prefix}',${idx})">
        <span style="color:var(--text-dim);font-family:'JetBrains Mono',monospace;font-size:0.6rem">${num}</span>
        <span style="color:var(--text-hi);font-weight:600">${u.name}</span>
        <span>${u.role || ''}</span>
        <span>${u.category || ''}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-dim)">${u.slots || ''}</span>
        <span>${domainBadge}</span>
      </div>`;
  },

  /* ── Unit Detail Panel ───────────────────────────────── */

  /**
   * Toggle an expandable detail panel below a unit row.
   * Only one panel can be open per list at a time.
   * @param {HTMLElement} rowEl  - The clicked .unit-row element
   * @param {string}      prefix - Faction prefix
   * @param {number}      idx    - Unit index in the data array
   */
  toggleUnitDetail(rowEl, prefix, idx) {
    const existing = rowEl.nextElementSibling;
    if (existing && existing.classList.contains('unit-detail-panel')) {
      existing.remove();
      return;
    }
    // Collapse any other open detail panel in this list
    const parent = rowEl.parentElement;
    parent.querySelectorAll('.unit-detail-panel').forEach(p => p.remove());

    // Look up cached data (already loaded by ChapterLoader)
    const faction = ChapterLoader.FACTION_MAP[this._prefixToChapter(prefix)];
    if (!faction) return;
    const dataKey = faction.dataKey;
    const units = DataLoader.cache[`data/units/${dataKey}.json`] || [];
    const sprites = DataLoader.cache['data/sprites/unit-sprites.json'] || {};
    const u = units[idx];
    if (!u) return;

    const color = faction.color;
    const panel = document.createElement('div');
    panel.className = 'unit-detail-panel';
    panel.style.cssText = `border-bottom:1px solid var(--border);background:rgba(${this._hexToRgb(color)},0.03);padding:16px;animation:fadeIn 0.2s ease`;
    panel.innerHTML = this._unitDetail(u, color, sprites);
    rowEl.after(panel);

    // Render sprites inside the newly-inserted panel via SpriteEngine
    if (typeof SpriteEngine !== 'undefined') {
      SpriteEngine.renderAllSprites(panel);
    }
  },

  /**
   * Build the inner HTML for a unit detail panel: sprite, stat bars,
   * extra stats, cost info, physical description, and narrative text.
   * @param {Object} u       - Unit data object
   * @param {string} color   - Faction hex color
   * @param {Object} sprites - Sprite map
   * @returns {string} HTML string
   */
  _unitDetail(u, color, sprites) {
    const s = u.stats || {};
    // Use SpriteEngine to generate a 120px sprite container (rendered after insertion)
    const spriteHtml = `<div class="unit-detail-sprite" data-usp="1" data-name="${u.name}" data-color="${color}" data-domain="${u.domain || ''}" data-size="120" style="width:120px;height:120px;flex-shrink:0;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:2px;display:flex;align-items:center;justify-content:center;overflow:hidden"></div>`;

    // ── Primary stat bars ──
    const statBars = [
      { label: 'HP', value: s.hp, max: 500 },
      { label: 'Armor', value: s.armor, max: 20 },
      { label: 'Attack', value: s.atkDmg, max: 50 },
      { label: 'Range', value: s.range, max: 600 },
      { label: 'Speed', value: s.moveSpd, max: 200 },
      { label: 'Sight', value: s.sightRange, max: 600 }
    ];

    const statsHtml = statBars.map(st => {
      const v = st.value || 0;
      const pct = Math.min(100, (v / st.max) * 100);
      return `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="width:50px;font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-dim);text-align:right">${st.label}</span>
          <div style="flex:1;height:6px;background:rgba(255,255,255,0.05);border-radius:1px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:1px;transition:width 0.3s"></div>
          </div>
          <span style="width:32px;font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-mid);text-align:right">${v}</span>
        </div>`;
    }).join('');

    // ── Secondary stats (badges) ──
    const extras = [];
    if (s.shield) extras.push(`Shield: ${s.shield}`);
    if (s.dmgType) extras.push(`Dmg: ${s.dmgType}`);
    if (s.armorType) extras.push(`Armor: ${s.armorType}`);
    if (s.critChance) extras.push(`Crit: ${Math.round(s.critChance * 100)}%`);
    if (s.evasion) extras.push(`Evasion: ${Math.round(s.evasion * 100)}%`);
    if (s.accuracy) extras.push(`Acc: ${Math.round(s.accuracy * 100)}%`);
    if (s.morale) extras.push(`Morale: ${s.morale}`);
    const extrasHtml = extras.length
      ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-dim);margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${extras.map(e => `<span style="padding:2px 6px;border:1px solid var(--border);border-radius:1px">${e}</span>`).join('')}</div>`
      : '';

    // ── Production cost ──
    const costs = [];
    if (s.scrapCost) costs.push(`${s.scrapCost}⚙`);
    if (s.buildCycles) costs.push(`${s.buildCycles} cycles`);
    if (s.supplyCost) costs.push(`${s.supplyCost} supply`);
    const costHtml = costs.length
      ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:${color};margin-top:6px">Cost: ${costs.join(' · ')}</div>`
      : '';

    // ── Flavor text sections ──
    const physicalHtml = u.physical
      ? `<div style="margin-top:12px"><div style="font-family:'Orbitron',monospace;font-size:0.55rem;color:${color};letter-spacing:2px;margin-bottom:4px">PHYSICAL</div><div style="font-size:0.72rem;color:var(--text-mid);line-height:1.55">${u.physical}</div></div>`
      : '';

    const narrativeHtml = u.narrative
      ? `<div style="margin-top:10px"><div style="font-family:'Orbitron',monospace;font-size:0.55rem;color:${color};letter-spacing:2px;margin-bottom:4px">NARRATIVE</div><div style="font-size:0.72rem;color:var(--text-mid);line-height:1.55;font-style:italic">${u.narrative}</div></div>`
      : '';

    return `
      <div style="display:flex;gap:16px;align-items:flex-start">
        ${spriteHtml}
        <div style="flex:1;min-width:0">
          <div style="font-family:'Orbitron',monospace;font-size:0.75rem;color:${color};margin-bottom:2px">${u.name}</div>
          <div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:10px">${u.role || ''} · ${u.category || ''} · ${this._domainBadge(u.domain)}</div>
          ${statsHtml}
          ${extrasHtml}
          ${costHtml}
        </div>
      </div>
      ${physicalHtml}
      ${narrativeHtml}`;
  },

  /**
   * Placeholder — click handling is done via inline onclick attributes
   * on each unit row, so no additional binding is needed here.
   * @param {HTMLElement} container - The unit list container
   */
  _bindUnitExpand(container) {
    // Click handling is done via inline onclick — no extra binding needed
  },

  /* ═══════════════════════════════════════════════════════
     EQUIPMENT LIST — Flat table of faction gear
     ═══════════════════════════════════════════════════════ */

  /**
   * Render an equipment list into the given container.
   * @param {Array}  items       - Array of equipment objects
   * @param {string} containerId - DOM id of the target container
   * @param {string} color       - Faction hex color
   */
  buildEquipment(items, containerId, color) {
    const el = document.getElementById(containerId);
    if (!el || !items.length) return;
    el.innerHTML = items.map((item, i) => this._equipRow(item, i, color)).join('');
  },

  /**
   * Build a single equipment row.
   * @param {Object} item  - Equipment data object
   * @param {number} idx   - Index in the array
   * @param {string} color - Faction hex color
   * @returns {string} HTML string
   */
  _equipRow(item, idx, color) {
    const rarityStyle = item.rarityColor ? `color:${item.rarityColor}` : 'color:var(--text-dim)';
    const protoIcon = item.proto ? `<span style="color:${color};font-size:0.5rem" title="Prototype">★</span>` : '';
    // Equipment icon from IconRenderer (falls back to placeholder if missing)
    const equipIcon = (typeof IconRenderer !== 'undefined')
      ? IconRenderer.renderEquipIcon(item.name, 24)
      : '';
    return `
      <div style="display:grid;grid-template-columns:32px 28px 1fr 60px 90px 1fr;padding:6px 12px;border-bottom:1px solid var(--border);font-size:0.72rem;color:var(--text-mid);align-items:center;gap:4px;transition:background 0.15s"
           onmouseenter="this.style.background='rgba(${this._hexToRgb(color)},0.04)'"
           onmouseleave="this.style.background=''">
        <span style="text-align:center">${protoIcon}</span>
        <span style="text-align:center">${equipIcon}</span>
        <span style="color:var(--text-hi)">${item.name}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--text-dim)">${item.slot || ''}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;${rarityStyle}">${item.rarity || ''}</span>
        <span style="font-size:0.68rem">${item.effect || ''}</span>
      </div>`;
  },

  /* ═══════════════════════════════════════════════════════
     TECH TREE — Branched research display
     ═══════════════════════════════════════════════════════ */

  /**
   * Render tech tree branches as stacked cards.
   * @param {Array}  branches    - Array of tech branch objects
   * @param {string} containerId - DOM id of the target container
   * @param {string} color       - Faction hex color
   */
  buildTechTree(branches, containerId, color) {
    const el = document.getElementById(containerId);
    if (!el || !branches.length) return;
    el.innerHTML = branches.map(b => this._techBranch(b, color)).join('');
  },

  /**
   * Build a single tech branch card containing tier nodes.
   * @param {Object} branch - Tech branch object with nodes array
   * @param {string} color  - Faction hex color
   * @returns {string} HTML string
   */
  _techBranch(branch, color) {
    const nodesHtml = (branch.nodes || []).map(n => `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03)">
        <div style="flex-shrink:0;width:32px;height:32px;border:1px solid ${color};border-radius:2px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;font-size:0.55rem;color:${color};background:rgba(${this._hexToRgb(color)},0.06)">${n.tier}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.75rem;color:var(--text-hi);margin-bottom:2px">${n.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-dim);margin-bottom:4px">${n.cost || ''}</div>
          <div style="font-size:0.7rem;color:var(--text-mid);line-height:1.5">${n.effect || ''}</div>
          ${n.notes ? `<div style="font-size:0.65rem;color:var(--text-dim);font-style:italic;margin-top:3px">${n.notes}</div>` : ''}
        </div>
      </div>`).join('');

    return `
      <div class="card" style="border-left:3px solid ${color};margin-bottom:12px">
        <div style="font-family:'Orbitron',monospace;font-size:0.65rem;color:${color};letter-spacing:2px;margin-bottom:10px">
          BRANCH ${branch.branchNum || ''} — ${branch.branch || ''}
        </div>
        ${nodesHtml}
      </div>`;
  },

  /* ═══════════════════════════════════════════════════════
     DIALOGUE — Commander dialogue beats
     ═══════════════════════════════════════════════════════ */

  /**
   * Render dialogue beats as stacked cards with speaker lines.
   * @param {Array}  beats       - Array of dialogue beat objects
   * @param {string} containerId - DOM id of the target container
   * @param {string} color       - Faction hex color
   */
  buildDialogue(beats, containerId, color) {
    const el = document.getElementById(containerId);
    if (!el || !beats.length) return;
    el.innerHTML = beats.map(b => this._dialogueBeat(b, color)).join('');
  },

  /**
   * Build a single dialogue beat card.
   * @param {Object} beat  - Dialogue beat object with lines array
   * @param {string} color - Faction hex color
   * @returns {string} HTML string
   */
  _dialogueBeat(beat, color) {
    const linesHtml = (beat.lines || []).map(l => {
      const style = l.style === 'italic' ? 'font-style:italic;' : '';
      const speakerColor = l.speaker === 'Commander' ? color : 'var(--text-hi)';
      return `
        <div style="margin-bottom:8px">
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:${speakerColor};letter-spacing:1px">${l.speaker}:</span>
          <span style="font-size:0.75rem;color:var(--text-mid);line-height:1.55;${style}">${l.text}</span>
        </div>`;
    }).join('');

    return `
      <div class="card" style="border-left:3px solid ${color};margin-bottom:12px">
        <div style="font-family:'Orbitron',monospace;font-size:0.6rem;color:${color};letter-spacing:2px;margin-bottom:4px">${beat.beat || ''}</div>
        <div style="font-size:0.65rem;color:var(--text-dim);font-family:'JetBrains Mono',monospace;margin-bottom:10px">${beat.trigger || ''}</div>
        ${linesHtml}
      </div>`;
  },

  /* ═══════════════════════════════════════════════════════
     DOMAIN FILTER & SORT
     ─────────────────────────────────────────────────────
     Registers global window functions (e.g. filterTerranUnits,
     sortShardsUnits) that faction chapter HTML uses in onclick
     handlers. This is the bridge between static chapter HTML
     and dynamic JS behavior.
     ═══════════════════════════════════════════════════════ */

  /**
   * Create global filter and sort functions for a faction's unit list.
   * Called by ChapterLoader after rendering a faction chapter.
   * @param {Array}  units   - Unit data array
   * @param {string} prefix  - Faction prefix (e.g. 'terran')
   * @param {string} color   - Faction hex color
   * @param {Object} sprites - Sprite map
   */
  registerFilterFunctions(units, prefix, color, sprites) {
    const capPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const listId = `${prefix}-unit-list`;

    // Store unit data so sort can re-render from it
    this._factionUnits = this._factionUnits || {};
    this._factionUnits[prefix] = { units, color, sprites };

    /**
     * Global filter: show/hide unit rows by domain (ground/air/space).
     * Called from chapter HTML: onclick="filterTerranUnits('ground', this)"
     */
    window[`filter${capPrefix}Units`] = (domain, btnEl) => {
      const container = document.getElementById(listId);
      if (!container) return;
      container.querySelectorAll('.unit-row').forEach(row => {
        if (domain === 'all' || row.dataset.domain === domain) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
      // Update active tab styling
      if (btnEl) {
        const tabs = btnEl.parentElement;
        if (tabs) {
          tabs.querySelectorAll('.domain-tab').forEach(t => t.classList.remove('active'));
          btnEl.classList.add('active');
        }
      }
    };

    /**
     * Global sort: re-render the unit list sorted by a given field.
     * Toggles ascending/descending on repeated clicks.
     * Called from chapter HTML: onclick="sortTerranUnits('name')"
     */
    window[`sort${capPrefix}Units`] = (field) => {
      const data = this._factionUnits[prefix];
      if (!data) return;
      const sorted = [...data.units];

      // Toggle sort direction per prefix+field combination
      this._sortDir = this._sortDir || {};
      this._sortDir[prefix + field] = !(this._sortDir[prefix + field]);
      const asc = this._sortDir[prefix + field];

      sorted.sort((a, b) => {
        const va = (a[field] || '').toString().toLowerCase();
        const vb = (b[field] || '').toString().toLowerCase();
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      });

      this.buildUnitList(sorted, listId, data.color, prefix, data.sprites);
    };
  },

  /* ═══════════════════════════════════════════════════════
     FACTION BUILDINGS — Grid of building cards with icons
     ═══════════════════════════════════════════════════════ */

  /**
   * Map from lowercase faction prefix to the capitalized key prefix
   * used in build-icons.json (e.g. 'terran' → 'Terran', 'guardian' → 'Guardians').
   */
  _buildIconPrefix: {
    terran: 'Terran', shards: 'Shards', horde: 'Horde',
    necro: 'Necro', accord: 'Accord', vorax: 'Vorax', guardian: 'Guardians'
  },

  /**
   * Render all 20 faction buildings as a card grid with isometric icons.
   * Reads building SVGs from build-icons.json via IconRenderer.getBuildIcon().
   * @param {string} prefix      - Faction prefix (e.g. 'terran')
   * @param {string} containerId - DOM id of the target container (e.g. 'terran-buildings')
   * @param {string} color       - Faction hex color
   */
  buildFactionBuildings(prefix, containerId, color) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const iconPrefix = this._buildIconPrefix[prefix];
    if (!iconPrefix) return;

    // Gather all building keys for this faction from the icon map
    const allIcons = (typeof IconRenderer !== 'undefined') ? IconRenderer._getBuildIcons() : {};
    const buildingKeys = Object.keys(allIcons).filter(k => k.startsWith(iconPrefix + '_'));
    if (!buildingKeys.length) {
      el.innerHTML = '<div style="color:var(--text-dim);font-size:0.75rem;padding:12px">No building data loaded.</div>';
      return;
    }

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
        ${buildingKeys.map(key => {
          const displayName = key.substring(iconPrefix.length + 1);
          const iconHtml = IconRenderer.renderBuildIcon(key, 48);
          return `
            <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-left:3px solid ${color};transition:background 0.15s"
                 onmouseenter="this.style.background='rgba(${this._hexToRgb(color)},0.06)'"
                 onmouseleave="this.style.background=''">
              ${iconHtml}
              <span style="font-size:0.75rem;color:var(--text-hi);line-height:1.3">${displayName}</span>
            </div>`;
        }).join('')}
      </div>`;
  },

  /* ═══════════════════════════════════════════════════════
     HELPERS — Shared utility functions
     ═══════════════════════════════════════════════════════ */

  /**
   * Build a small colored badge for a unit's domain (ground/air/space).
   * @param {string} domain - Domain string
   * @returns {string} HTML string for the badge
   */
  _domainBadge(domain) {
    const colors = { ground: '#88aa44', air: '#44aaff', space: '#aa66ff' };
    const c = colors[domain] || 'var(--text-dim)';
    return `<span style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;padding:1px 6px;border:1px solid ${c};color:${c};border-radius:1px;letter-spacing:1px;text-transform:uppercase">${domain || '?'}</span>`;
  },

  /**
   * Convert a hex color string to an "r,g,b" string for use in rgba().
   * @param {string} hex - Hex color (e.g. '#00b4ff')
   * @returns {string} Comma-separated RGB values (e.g. '0,180,255')
   */
  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r},${g},${b}`;
  },

  /**
   * Reverse-map a faction prefix back to its chapter ID.
   * Used to look up FACTION_MAP entries from onclick handlers.
   * @param {string} prefix - Faction prefix (e.g. 'terran')
   * @returns {string} Chapter ID (e.g. 'ch5')
   */
  _prefixToChapter(prefix) {
    const map = {
      terran: 'ch5', shards: 'ch6', horde: 'ch7',
      necro: 'ch8', accord: 'ch9', vorax: 'ch10', guardian: 'ch11'
    };
    return map[prefix] || '';
  }
};
