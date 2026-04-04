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

    let planets;
    try {
      planets = await DataLoader.load('data/planets/planets.json');
    } catch (e) {
      container.innerHTML = '<div style="padding:12px;color:var(--text-dim)">Failed to load planet data.</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < planets.length; i++) {
      html += this._renderPlanetRow(planets[i], '', i);
    }
    container.innerHTML = html;

    /* ── Subtype toggle handler ──
       Cached SVG data for variant swaps (shared with fallback renderer below). */
    var _svgDataCache = null;
    function _fetchSvgData() {
      if (_svgDataCache) return _svgDataCache;
      _svgDataCache = fetch('data/planets/planet-svg.json')
        .then(function(r) { return r.json(); })
        .catch(function() { _svgDataCache = null; return {}; });
      return _svgDataCache;
    }

    container.querySelectorAll('.planet-subtype-toggle').forEach(function(toggleWrap) {
      var planetIdx = parseInt(toggleWrap.getAttribute('data-planet-idx'), 10);
      var planet = planets[planetIdx];
      if (!planet || !planet.subtypes) return;

      toggleWrap.addEventListener('click', function(e) {
        var btn = e.target.closest('.subtype-btn');
        if (!btn) return;
        var stIdx = parseInt(btn.getAttribute('data-subtype-idx'), 10);
        var subtype = planet.subtypes[stIdx];
        if (!subtype) return;

        /* Update active button styles */
        toggleWrap.querySelectorAll('.subtype-btn').forEach(function(b, bi) {
          b.classList.remove('active');
          b.style.borderColor = '';
          b.style.color = '';
        });
        btn.classList.add('active');
        btn.style.borderColor = subtype.color;
        btn.style.color = subtype.color;

        /* Find the detail container */
        var detail = toggleWrap.closest('.planet-detail');
        if (!detail) return;

        /* Update TERRAIN and VISUAL text */
        var terrainEl = detail.querySelector('.planet-terrain-body');
        var visualEl = detail.querySelector('.planet-visual-body');
        if (terrainEl) terrainEl.innerHTML = subtype.terrain;
        if (visualEl) visualEl.innerHTML = subtype.visual;

        /* Swap planet visual */
        var wrap = detail.querySelector('.planet-svg-wrap');
        if (!wrap) return;
        var svgKey = subtype.svgKey || planet.name;

        /* If 3D renderer is active, dispose it for variant swap */
        if (wrap._planetInstance) {
          wrap._planetInstance.dispose();
          wrap._planetInstance = null;
        }

        /* Update data-planet-type for future renderer syncs */
        wrap.setAttribute('data-planet-type', svgKey);
        wrap._svgFallback = false;

        /* Inject SVG fallback for the variant */
        _fetchSvgData().then(function(svgData) {
          if (svgData && svgData[svgKey]) {
            wrap.innerHTML = svgData[svgKey];
            wrap._svgFallback = true;
          }
        });
      });
    });

    /* Initialize Three.js planet renderers on-demand.
       All platforms: planets start collapsed. Renderer created when
       detail is expanded, disposed when collapsed. Uses MutationObserver
       to watch for planet-detail-open class toggle. */
    if (typeof PlanetRenderer !== 'undefined') {
      container.querySelectorAll('.planet-detail').forEach(function(detail) {
        const wrap = detail.querySelector('.planet-svg-wrap[data-planet-type]');
        if (!wrap) return;

        function syncRenderer() {
          const type = wrap.getAttribute('data-planet-type');
          if (!type) return;
          const isOpen = detail.classList.contains('planet-detail-open');

          if (isOpen && !wrap._planetInstance) {
            /* Small delay to let max-height transition start so container has dimensions */
            setTimeout(function() {
              if (!wrap._planetInstance) {
                wrap._planetInstance = PlanetRenderer.create(wrap, type);
              }
              /* SVG fallback for megastructures or WebGL failure */
              if (!wrap._planetInstance && !wrap._svgFallback) {
                _fetchSvgData().then(function(svgData) {
                  if (svgData[type] && !wrap._planetInstance) {
                    wrap.innerHTML = svgData[type];
                    wrap._svgFallback = true;
                  }
                });
              }
            }, 50);
          } else if (!isOpen && wrap._planetInstance) {
            wrap._planetInstance.dispose();
            wrap._planetInstance = null;
          }
        }

        /* Watch for class changes (planet-detail-open toggle) */
        const mo = new MutationObserver(function() { syncRenderer(); });
        mo.observe(detail, { attributes: true, attributeFilter: ['class'] });
      });
    } else {
      /* No Three.js — use SVG fallback for all planet types */
      container.querySelectorAll('.planet-detail').forEach(function(detail) {
        var wrap = detail.querySelector('.planet-svg-wrap[data-planet-type]');
        if (!wrap) return;

        var mo = new MutationObserver(function() {
          var type = wrap.getAttribute('data-planet-type');
          if (!type) return;
          var isOpen = detail.classList.contains('planet-detail-open');
          if (isOpen && !wrap._svgFallback) {
            _fetchSvgData().then(function(svgData) {
              if (svgData[type]) { wrap.innerHTML = svgData[type]; wrap._svgFallback = true; }
            });
          }
        });
        mo.observe(detail, { attributes: true, attributeFilter: ['class'] });
      });
    }
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

    /* Build subtype toggle buttons if planet has subtypes array of objects */
    let subtypeToggle = '';
    if (Array.isArray(planet.subtypes) && planet.subtypes.length && typeof planet.subtypes[0] === 'object') {
      const btnBase = "font-family:'JetBrains Mono',monospace;font-size:0.75rem;padding:4px 10px;border:1px solid var(--border);background:transparent;color:var(--text-mid);cursor:pointer;border-radius:2px;letter-spacing:0.5px;transition:border-color 0.15s,color 0.15s";
      subtypeToggle = '<div class="planet-subtype-toggle" data-planet-idx="' + idx + '" style="display:flex;gap:6px;margin:8px 0">';
      for (let si = 0; si < planet.subtypes.length; si++) {
        const st = planet.subtypes[si];
        const isActive = si === 0;
        const activeStyle = isActive ? ';border-color:' + st.color + ';color:' + st.color : '';
        subtypeToggle += '<button class="subtype-btn' + (isActive ? ' active' : '') + '" data-subtype-idx="' + si + '" style="' + btnBase + activeStyle + '">' + st.name + '</button>';
      }
      subtypeToggle += '</div>';
    }

    return `
      <div class="planet-row" style="border-bottom:1px solid var(--border)">
        <div class="planet-row-header" onclick="document.getElementById('${id}').classList.toggle('planet-detail-open')" style="display:grid;grid-template-columns:160px 90px 150px 90px 1fr;padding:12px 16px;font-size:0.95rem;cursor:pointer;transition:background 0.15s ease;align-items:start" onmouseenter="this.style.background='rgba(255,255,255,0.02)'" onmouseleave="this.style.background='transparent'">
          <span style="color:${planet.color};font-weight:600">${planet.name}<span class="planet-expand-hint"> &mdash; click to expand &#9662;</span></span>
          <span class="planet-col-stats" style="color:var(--text-mid);font-family:'JetBrains Mono',monospace">${planet.territories}<span class="ph-tag">PH</span></span>
          <span class="planet-col-stats" style="color:var(--text-mid);font-family:'JetBrains Mono',monospace">${planet.yield}<span class="ph-tag">PH</span></span>
          <span class="planet-col-stats" style="color:var(--text-mid);font-family:'JetBrains Mono',monospace">${planet.encounter}<span class="ph-tag">PH</span></span>
          <span class="planet-col-terrain" style="color:var(--text-dim)">${terrainShort}</span>
        </div>
        <div id="${id}" class="planet-detail">
          <div class="planet-detail-inner">
            <div class="planet-svg-wrap" data-planet-type="${planet.name}"></div>
            ${subtypeToggle}
            <div class="planet-detail-text">
              <div class="planet-detail-section">
                <div class="planet-detail-label" style="color:${planet.color}">TERRAIN</div>
                <div class="planet-detail-body planet-terrain-body">${planet.terrain}</div>
              </div>
              <div class="planet-detail-section">
                <div class="planet-detail-label" style="color:${planet.color}">VISUAL</div>
                <div class="planet-detail-body planet-visual-body">${planet.visual}</div>
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
        <span class="territory-bar-value">${planet.territories}<span class="ph-tag">PH</span></span>
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
