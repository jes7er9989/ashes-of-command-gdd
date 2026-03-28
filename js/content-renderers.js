/* ═══════════════════════════════════════════════════════════
   CONTENT RENDERERS — Shared Renderers for Non-Faction Data
   ───────────────────────────────────────────────────────────
   Renders planet type cards and fleet formation cards from
   JSON data files into designated DOM containers. Called by
   ChapterLoader after loading ch12/ch13 (planets) or ch17
   (formations).

   Key exports:
     ContentRenderers.buildPlanetCards(containerId)
     ContentRenderers.buildTerritoryBars(containerId)
     ContentRenderers.buildFormationCards(containerId)

   Dependencies:
     - DataLoader (fetches JSON data)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   buildPlanetCards(containerId)     | Render planet type rows into #planet-list
   buildTerritoryBars(containerId)   | Render territory bar chart into #territory-bars
   buildFormationCards(containerId)  | Render fleet formation cards into #space-formations
   _renderPlanetRow(planet, svg)     | Build HTML for a single planet expandable row
   _renderTerritoryBar(planet)       | Build HTML for a single territory bar
   _renderFormationCard(formation)   | Build HTML for a single formation card
   _getFormationSvg(name)            | Return inline SVG diagram for a formation
   ═══════════════════════════════════════════════════════════ */

const ContentRenderers = {

  /* ───────────────────────────────────────────
     SECTION: Planet Cards
     ─────────────────────────────────────────── */

  /**
   * Fetch planet data and SVG artwork, then render expandable
   * planet type rows into the specified container.
   * @param {string} containerId - DOM element ID (e.g. 'planet-list')
   * @returns {Promise<void>}
   */
  async buildPlanetCards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let planets, planetSvgs;
    try {
      [planets, planetSvgs] = await Promise.all([
        DataLoader.load('data/planets/planets.json'),
        DataLoader.load('data/planets/planet-svg.json').catch(() => ({}))
      ]);
    } catch (e) {
      container.innerHTML = '<div style="padding:12px;color:var(--text-dim)">Failed to load planet data.</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < planets.length; i++) {
      html += this._renderPlanetRow(planets[i], planetSvgs[planets[i].name] || '', i);
    }
    container.innerHTML = html;
  },

  /**
   * Build HTML for a single planet type as an expandable row.
   * Shows name, territories, yield, encounter %, and key terrain
   * in the header row. Expands to show SVG artwork, visual desc,
   * special rules, and narrative flavor text.
   * @param {Object} planet - Planet object from planets.json
   * @param {string} svg - SVG markup string (may be empty)
   * @param {number} idx - Index for unique ID generation
   * @returns {string} HTML string
   */
  _renderPlanetRow(planet, svg, idx) {
    const id = `planet-detail-${idx}`;
    /* Truncate terrain text for the summary column */
    const terrainShort = planet.terrain.split('.')[0] + '.';

    return `
      <div class="planet-row" style="border-bottom:1px solid var(--border)">
        <div class="planet-row-header" onclick="document.getElementById('${id}').classList.toggle('planet-detail-open')" style="display:grid;grid-template-columns:150px 80px 140px 80px 1fr;padding:8px 12px;font-size:0.78rem;cursor:pointer;transition:background 0.15s ease;align-items:start" onmouseenter="this.style.background='rgba(255,255,255,0.02)'" onmouseleave="this.style.background='transparent'">
          <span style="color:${planet.color};font-weight:600">${planet.name}</span>
          <span style="color:var(--text-mid);font-family:'JetBrains Mono',monospace">${planet.territories}</span>
          <span style="color:var(--text-mid);font-family:'JetBrains Mono',monospace">${planet.yield}</span>
          <span style="color:var(--text-mid);font-family:'JetBrains Mono',monospace">${planet.encounter}</span>
          <span style="color:var(--text-dim)">${terrainShort}</span>
        </div>
        <div id="${id}" class="planet-detail">
          <div class="planet-detail-inner">
            ${svg ? `<div class="planet-svg-wrap">${svg}</div>` : ''}
            <div class="planet-detail-text">
              <div class="planet-detail-section">
                <div class="planet-detail-label" style="color:${planet.color}">TERRAIN</div>
                <div class="planet-detail-body">${planet.terrain}</div>
              </div>
              <div class="planet-detail-section">
                <div class="planet-detail-label" style="color:${planet.color}">VISUAL</div>
                <div class="planet-detail-body">${planet.visual}</div>
              </div>
              <div class="planet-detail-section">
                <div class="planet-detail-label" style="color:${planet.color}">SPECIAL RULES</div>
                <div class="planet-detail-body">${planet.special}</div>
              </div>
              <div class="planet-detail-section">
                <div class="planet-detail-label" style="color:${planet.color}">NARRATIVE</div>
                <div class="planet-detail-body" style="font-style:italic;color:var(--text-dim)">${planet.narrative}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  /* ───────────────────────────────────────────
     SECTION: Territory Bars
     ─────────────────────────────────────────── */

  /**
   * Fetch planet data and render a horizontal bar chart showing
   * average territory count per planet type.
   * @param {string} containerId - DOM element ID (e.g. 'territory-bars')
   * @returns {Promise<void>}
   */
  async buildTerritoryBars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let planets;
    try {
      planets = await DataLoader.load('data/planets/planets.json');
    } catch (e) {
      container.innerHTML = '<div style="color:var(--text-dim)">Failed to load planet data.</div>';
      return;
    }

    /* Find maximum average territory for scaling bars to 100% */
    const maxAvg = Math.max(...planets.map(p => p.avgTerr));

    let html = '';
    for (const planet of planets) {
      html += this._renderTerritoryBar(planet, maxAvg);
    }
    container.innerHTML = html;
  },

  /**
   * Build HTML for a single territory bar entry.
   * @param {Object} planet - Planet object from planets.json
   * @param {number} maxAvg - Maximum avgTerr value for scaling
   * @returns {string} HTML string
   */
  _renderTerritoryBar(planet, maxAvg) {
    const widthPct = (planet.avgTerr / maxAvg) * 100;
    return `
      <div class="territory-bar-row">
        <span class="territory-bar-label" style="color:${planet.color}">${planet.name}</span>
        <div class="territory-bar-track">
          <div class="territory-bar-fill" style="width:${widthPct}%;background:${planet.color}"></div>
        </div>
        <span class="territory-bar-value">${planet.territories}</span>
      </div>`;
  },

  /* ───────────────────────────────────────────
     SECTION: Formation Cards
     ─────────────────────────────────────────── */

  /**
   * Fetch formation data and render formation cards into the
   * specified container with name, description, strengths, and
   * weaknesses plus a visual formation diagram.
   * @param {string} containerId - DOM element ID (e.g. 'space-formations')
   * @returns {Promise<void>}
   */
  async buildFormationCards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let formations;
    try {
      formations = await DataLoader.load('data/formations/formations.json');
    } catch (e) {
      container.innerHTML = '<div style="padding:12px;color:var(--text-dim)">Failed to load formation data.</div>';
      return;
    }

    let html = '<div class="formation-grid">';
    for (const f of formations) {
      html += this._renderFormationCard(f);
    }
    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * Build HTML for a single formation card with diagram, name,
   * description, best use, and weakness.
   * @param {Object} f - Formation object from formations.json
   * @returns {string} HTML string
   */
  _renderFormationCard(f) {
    const diagram = this._getFormationSvg(f.name);
    return `
      <div class="formation-card">
        <div class="formation-diagram">${diagram}</div>
        <div class="formation-name">${f.name}</div>
        <div class="formation-desc">${f.desc}</div>
        <div class="formation-meta">
          <div class="formation-best"><span class="formation-tag formation-tag-best">BEST</span> ${f.best}</div>
          <div class="formation-weak"><span class="formation-tag formation-tag-weak">WEAK</span> ${f.weak}</div>
        </div>
      </div>`;
  },

  /**
   * Return an inline SVG diagram representing the given formation.
   * Uses simple dot/line patterns to convey ship positioning.
   * @param {string} name - Formation name (e.g. 'Wedge', 'Line')
   * @returns {string} SVG markup string
   */
  _getFormationSvg(name) {
    /* All diagrams use a 80x60 viewBox with circles for ships */
    const circleStyle = 'fill:var(--accent);opacity:0.9';
    const escortStyle = 'fill:var(--text-dim);opacity:0.7';
    const r = 3;    // Capital ship radius
    const rs = 2.2; // Escort ship radius

    switch (name) {
      case 'Wedge':
        return `<svg viewBox="0 0 80 60" class="formation-svg">
          <circle cx="40" cy="12" r="${r}" style="${circleStyle}"/>
          <circle cx="30" cy="24" r="${r}" style="${circleStyle}"/>
          <circle cx="50" cy="24" r="${r}" style="${circleStyle}"/>
          <circle cx="22" cy="38" r="${rs}" style="${escortStyle}"/>
          <circle cx="40" cy="38" r="${rs}" style="${escortStyle}"/>
          <circle cx="58" cy="38" r="${rs}" style="${escortStyle}"/>
          <circle cx="16" cy="50" r="${rs}" style="${escortStyle}"/>
          <circle cx="64" cy="50" r="${rs}" style="${escortStyle}"/>
          <line x1="40" y1="12" x2="30" y2="24" stroke="var(--accent)" stroke-opacity="0.2" stroke-width="0.5"/>
          <line x1="40" y1="12" x2="50" y2="24" stroke="var(--accent)" stroke-opacity="0.2" stroke-width="0.5"/>
        </svg>`;

      case 'Line':
        return `<svg viewBox="0 0 80 60" class="formation-svg">
          <circle cx="10" cy="28" r="${r}" style="${circleStyle}"/>
          <circle cx="24" cy="28" r="${r}" style="${circleStyle}"/>
          <circle cx="40" cy="28" r="${r}" style="${circleStyle}"/>
          <circle cx="56" cy="28" r="${r}" style="${circleStyle}"/>
          <circle cx="70" cy="28" r="${r}" style="${circleStyle}"/>
          <line x1="10" y1="28" x2="70" y2="28" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="0.5"/>
        </svg>`;

      case 'Screen':
        return `<svg viewBox="0 0 80 60" class="formation-svg">
          <circle cx="14" cy="16" r="${rs}" style="${escortStyle}"/>
          <circle cx="30" cy="16" r="${rs}" style="${escortStyle}"/>
          <circle cx="50" cy="16" r="${rs}" style="${escortStyle}"/>
          <circle cx="66" cy="16" r="${rs}" style="${escortStyle}"/>
          <circle cx="24" cy="40" r="${r}" style="${circleStyle}"/>
          <circle cx="40" cy="40" r="${r}" style="${circleStyle}"/>
          <circle cx="56" cy="40" r="${r}" style="${circleStyle}"/>
          <line x1="14" y1="16" x2="66" y2="16" stroke="var(--text-dim)" stroke-opacity="0.2" stroke-width="0.5" stroke-dasharray="2,2"/>
        </svg>`;

      case 'Encircle':
        return `<svg viewBox="0 0 80 60" class="formation-svg">
          <circle cx="12" cy="14" r="${r}" style="${circleStyle}"/>
          <circle cx="8" cy="30" r="${r}" style="${circleStyle}"/>
          <circle cx="14" cy="46" r="${rs}" style="${escortStyle}"/>
          <circle cx="68" cy="14" r="${r}" style="${circleStyle}"/>
          <circle cx="72" cy="30" r="${r}" style="${circleStyle}"/>
          <circle cx="66" cy="46" r="${rs}" style="${escortStyle}"/>
          <path d="M12,14 Q40,4 68,14" fill="none" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="0.5"/>
          <path d="M14,46 Q40,56 66,46" fill="none" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="0.5"/>
        </svg>`;

      case 'Scatter':
        return `<svg viewBox="0 0 80 60" class="formation-svg">
          <circle cx="15" cy="12" r="${r}" style="${circleStyle}"/>
          <circle cx="55" cy="8" r="${rs}" style="${escortStyle}"/>
          <circle cx="38" cy="28" r="${r}" style="${circleStyle}"/>
          <circle cx="68" cy="32" r="${rs}" style="${escortStyle}"/>
          <circle cx="12" cy="46" r="${rs}" style="${escortStyle}"/>
          <circle cx="48" cy="50" r="${r}" style="${circleStyle}"/>
          <circle cx="72" cy="52" r="${rs}" style="${escortStyle}"/>
        </svg>`;

      default:
        return `<svg viewBox="0 0 80 60" class="formation-svg">
          <circle cx="40" cy="30" r="${r}" style="${circleStyle}"/>
        </svg>`;
    }
  }
};
