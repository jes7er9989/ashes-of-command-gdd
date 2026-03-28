/* ═══════════════════════════════════════════════════════════
   DASHBOARD — Cinematic Hero Landing Page
   ───────────────────────────────────────────────────────────
   Renders the default view when no chapter is selected:
   a full-viewport hero section with animated starfield,
   epigraph, game description, strategist quote, project scope,
   galactic overview map with faction homeworld dots,
   core loop phases, rogue-lite flow, faction header,
   enhanced faction cards with emblems and parallax,
   game systems grid, document structure, five differentiators,
   a command-console statistics banner, and a footer lore quote.

   Key exports:
     Dashboard.render(container) → build and inject dashboard HTML

   Dependencies:
     - DataLoader  (loads factions.json, faction-emblems.json)

   Created: 2026-03-12 | Modified: 2026-03-28
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   render(container)              | Main entry — builds full dashboard
   buildHero()                    | Full-viewport hero with starfield
   buildEpigraph()                | Unity Accord founding principles quote
   buildGameDescription()         | Full title + elevator pitch paragraph
   buildStrategistQuote()         | "Master the Crucible..." quote
   buildByTheNumbers()            | Project Scope — 6 stat cards
   buildGalaxyOverview(factions)  | SVG spiral galaxy with faction dots
   buildCoreLoop()                | Five-Phase gameplay cards
   buildRogueLiteFlow()           | Rogue-lite loop flow text
   buildFactionHeader()           | "THE SEVEN FACTIONS" section header
   buildFactionGrid(factions, e)  | Enhanced faction cards with emblems
   buildFactionCard(f, emblems)   | Single faction card with emblem
   buildStatBar(label, value, c)  | Power-curve horizontal bar
   buildGameSystems()             | Quick Navigation — 12 clickable cards
   buildDocumentStructure()       | 8 Parts · 46 Chapters · 13 Appendices
   buildFiveDifferentiators()     | What Makes It Unique — 5 cards
   buildSummary()                 | Command-console statistics readout
   buildFooterQuote()             | Iconic lore quote from the GDD
   initLoreQuoteCycler()          | Starts the rotating lore quotes
   initScrollIndicator()          | Hides arrow after user scrolls
   initParallax()                 | Subtle depth effect on faction cards
   ═══════════════════════════════════════════════════════════ */

const Dashboard = {

  /* ── Lore Quotes ──
     Rotating quotes from across the Ashes of Command universe.
     Each cycles in the hero section beneath the title.            */
  LORE_QUOTES: [
    { text: 'The galaxy burns, but we do not break.', source: 'Terran League Field Command' },
    { text: 'We were ancient when your species learned to walk upright.', source: 'Aethyn Archivist' },
    { text: 'Everything dies. Everything gets salvaged.', source: 'Scrap-Horde Philosophy' },
    { text: 'We have already won. You simply haven\'t died yet.', source: 'Necro-Legion Broadcast' },
    { text: 'One target. One moment. Seven guns.', source: 'Unity Accord Combat Doctrine' },
    { text: 'We do not negotiate. We consume. We evolve. We hunger.', source: 'Vorax Intercept' },
    { text: 'They were made to guard the Reclamation Engine. They will not yield.', source: 'Alliance Intelligence Report' },
    { text: 'The Crucible does not forgive. It does not forget. It teaches.', source: 'The Original Strategist' }
  ],

  /* ── Quote Cycling State ── */
  _quoteIndex: 0,
  _quoteTimer: null,

  /* ── Galaxy Map — Faction Homeworld Positions ──
     Each faction is placed along the spiral arms of the galaxy.
     Coordinates are percentages within the 600x600 SVG viewBox.    */
  HOMEWORLD_POSITIONS: {
    terran:    { x: 310, y: 220 },   /* Inner arm — humanity's core sector        */
    shards:    { x: 460, y: 160 },   /* Outer rim — ancient crystalline worlds     */
    horde:     { x: 180, y: 350 },   /* Scrapyard belt — debris-rich zone          */
    necro:     { x: 420, y: 380 },   /* Tomb sector — deep galactic south          */
    accord:    { x: 240, y: 150 },   /* Northern coalition space                   */
    vorax:     { x: 130, y: 470 },   /* Extra-galactic incursion point             */
    guardians: { x: 300, y: 300 }    /* Galactic center — the Nexus                */
  },

  /* ── Territory System Counts ── */
  TERRITORY_COUNTS: {
    terran:    32,
    guardians: 35,
    shards:    18,
    accord:    24,
    horde:     19,
    vorax:     28,
    necro:     14
  },

  /* ── Main Render ─────────────────────────────────────── */

  /**
   * Render the full cinematic dashboard into the given container.
   * Fetches faction data and emblems, then builds all sections.
   * @param {HTMLElement} container - The #content-area element
   * @returns {Promise<void>}
   */
  async render(container) {
    container.innerHTML = '<div class="fade-in" id="dashboard-view"></div>';
    const view = document.getElementById('dashboard-view');

    try {
      const [factions, emblems] = await Promise.all([
        DataLoader.loadFactions(),
        DataLoader.load('data/factions/faction-emblems.json')
      ]);

      view.innerHTML =
        this.buildHero() +
        this.buildEpigraph() +
        this.buildGameDescription() +
        this.buildStrategistQuote() +
        this.buildByTheNumbers() +
        this.buildGalaxyOverview(factions) +
        this.buildCoreLoop() +
        this.buildRogueLiteFlow() +
        this.buildFactionHeader() +
        this.buildFactionGrid(factions, emblems) +
        this.buildGameSystems() +
        this.buildDocumentStructure() +
        this.buildFiveDifferentiators() +
        this.buildSummary() +
        this.buildFooterQuote();

      /* Start interactive behaviors after DOM is ready */
      requestAnimationFrame(() => {
        this.initLoreQuoteCycler();
        this.initScrollIndicator();
        this.initParallax();
      });
    } catch (e) {
      view.innerHTML = `<p style="color:var(--vorax)">Error loading dashboard: ${e.message}</p>`;
    }
  },

  /* ── Hero Section ──────────────────────────────────────── */

  /**
   * Build the full-viewport hero section with CSS starfield,
   * animated title, subtitle, rotating lore quote, and scroll indicator.
   * @returns {string} HTML string
   */
  buildHero() {
    return `
      <section class="hero-section" id="hero-section">
        <div class="hero-starfield"></div>
        <div class="hero-content">
          <h1 class="hero-title">ASHES OF COMMAND</h1>
          <div class="hero-subtitle">THE RECLAMATION</div>
          <div class="hero-version">INTERACTIVE GAME DESIGN DOCUMENT v5.9.1</div>
          <div class="hero-lore-quote" id="hero-lore-quote">
            <span class="hero-lore-text" id="hero-lore-text">"${this.LORE_QUOTES[0].text}"</span>
            <span class="hero-lore-source" id="hero-lore-source">— ${this.LORE_QUOTES[0].source}</span>
          </div>
        </div>
        <div class="hero-scroll-indicator" id="hero-scroll-indicator">
          <div class="hero-scroll-arrow">▼</div>
          <div class="hero-scroll-label">SCROLL TO EXPLORE</div>
        </div>
      </section>`;
  },

  /* ── Epigraph ──────────────────────────────────────────── */

  /**
   * Build the epigraph quote — Unity Accord founding principles.
   * @returns {string} HTML string
   */
  buildEpigraph() {
    return `
      <section class="dashboard-section">
        <div class="quote-block" style="margin:32px 0;text-align:center">
          <div class="quote-text" style="font-style:italic;font-size:1rem;color:var(--text-mid);line-height:1.8">\u201CThe species that cannot share power will not survive to exercise it. Unity is not compromise \u2014 it is multiplication.\u201D</div>
          <div class="quote-attr" style="margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:0.6rem;letter-spacing:2px;color:var(--text-dim)">THE COVENANT TEXT \u2014 UNITY ACCORD FOUNDING PRINCIPLES</div>
        </div>
      </section>`;
  },

  /* ── Game Description ──────────────────────────────────── */

  /**
   * Build the document header with full title and elevator pitch.
   * @returns {string} HTML string
   */
  buildGameDescription() {
    return `
      <section class="dashboard-section">
        <div class="page-title-wrap">
          <div class="page-title">ASHES OF COMMAND: THE RECLAMATION</div>
          <div class="page-subtitle">Complete Master Game Design Document \u2014 Interactive Reference v5.9.1</div>
        </div>
        <div class="body-text" style="margin-bottom:24px;">
          A 4X grand strategy auto-battler with rogue-lite progression and deep narrative. You are a weapon \u2014 a freshly decanted clone or something stranger \u2014 created by a fallen civilization to win a war that already destroyed them once. Prove your genius across simulated galactic campaigns. When the simulation judges you ready, wake into a real galaxy being devoured from the outside by an adaptive alien swarm and guarded at its core by ancient energy gods who will destroy anyone who approaches.
        </div>
      </section>`;
  },

  /* ── Strategist Quote ──────────────────────────────────── */

  /**
   * Build the strategist quote block.
   * @returns {string} HTML string
   */
  buildStrategistQuote() {
    return `
      <section class="dashboard-section">
        <div class="quote-block">
          <div class="quote-text">\u201CMaster the Crucible. Learn what I could not teach myself. And when the simulation tells you you\u2019re ready\u2026 reunite our people. Whatever it costs.\u201D</div>
          <div class="quote-attr">\u2014 THE ORIGINAL STRATEGIST</div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── By The Numbers ────────────────────────────────────── */

  /**
   * Build the Project Scope / By the Numbers section with 6 stat cards.
   * @returns {string} HTML string
   */
  buildByTheNumbers() {
    return `
      <section class="dashboard-section">
        <div class="section-label">Project Scope</div>
        <div class="section-heading">By the Numbers</div>
        <div class="stats-grid">
          <div class="stat-block">
            <div class="stat-value" style="color:var(--terran)">7</div>
            <div class="stat-label">Factions</div>
            <div class="stat-sub">5 playable + 2 NPC</div>
          </div>
          <div class="stat-block">
            <div class="stat-value" style="color:var(--shards)">105</div>
            <div class="stat-label">Units</div>
            <div class="stat-sub">15 per faction</div>
          </div>
          <div class="stat-block">
            <div class="stat-value" style="color:var(--horde)">208</div>
            <div class="stat-label">Equipment</div>
            <div class="stat-sub">4 rarity tiers</div>
          </div>
          <div class="stat-block">
            <div class="stat-value" style="color:var(--accord)">124</div>
            <div class="stat-label">Tech Nodes</div>
            <div class="stat-sub">20 per playable \u00B7 12 per NPC</div>
          </div>
          <div class="stat-block">
            <div class="stat-value" style="color:var(--necro)">12</div>
            <div class="stat-label">Planet Types</div>
            <div class="stat-sub">Procedurally generated</div>
          </div>
          <div class="stat-block">
            <div class="stat-value" style="color:var(--guardians)">143</div>
            <div class="stat-label">Decisions</div>
            <div class="stat-sub">128 + 15 Prototype Rulings</div>
          </div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── Galactic Overview ─────────────────────────────────── */

  /**
   * Build the galactic overview section with a procedural SVG
   * spiral galaxy and glowing faction homeworld dots.
   * Includes territory system counts per faction.
   * Clicking a dot navigates to that faction's chapter.
   * @param {Array} factions - Array of faction objects
   * @returns {string} HTML string
   */
  buildGalaxyOverview(factions) {
    /* Build spiral arm paths — four arms, each a quadratic Bezier spiral */
    const spiralArms = this._buildSpiralArms();

    /* Build faction homeworld dots with system counts */
    const homeworldDots = factions.map(f => {
      const pos = this.HOMEWORLD_POSITIONS[f.key];
      if (!pos) return '';
      const systemCount = this.TERRITORY_COUNTS[f.key] || 0;
      return `
        <g class="galaxy-homeworld" data-faction="${f.key}" data-chapter="${f.chapterId}"
           onclick="location.hash='#${f.chapterId}'" style="cursor:pointer">
          <circle cx="${pos.x}" cy="${pos.y}" r="16" fill="${f.color}" opacity="0.08"
                  class="homeworld-glow-outer"/>
          <circle cx="${pos.x}" cy="${pos.y}" r="10" fill="${f.color}" opacity="0.15"
                  class="homeworld-glow-mid"/>
          <circle cx="${pos.x}" cy="${pos.y}" r="5" fill="${f.color}" opacity="0.9"
                  class="homeworld-dot"/>
          <circle cx="${pos.x}" cy="${pos.y}" r="5" fill="none" stroke="${f.color}"
                  stroke-width="1.5" opacity="0.6" class="homeworld-ping"/>
          <text x="${pos.x}" y="${pos.y - 18}" text-anchor="middle"
                class="homeworld-label" fill="${f.color}" font-size="10"
                font-family="Orbitron, sans-serif" letter-spacing="0.08em"
                opacity="0">${f.name.toUpperCase()}</text>
          <text x="${pos.x}" y="${pos.y + 22}" text-anchor="middle"
                fill="${f.color}" font-size="8" opacity="0.5"
                font-family="JetBrains Mono, monospace">${systemCount} systems</text>
        </g>`;
    }).join('');

    /* Build the central nebula glow */
    const nebulaGlow = `
      <defs>
        <radialGradient id="galaxy-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(204,68,255,0.25)"/>
          <stop offset="30%" stop-color="rgba(0,180,255,0.08)"/>
          <stop offset="70%" stop-color="rgba(0,180,255,0.02)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <radialGradient id="galaxy-arm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,180,255,0.12)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <filter id="galaxy-blur">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>
      <ellipse cx="300" cy="300" rx="280" ry="280" fill="url(#galaxy-core-glow)"/>`;

    return `
      <section class="galaxy-section">
        <div class="section-label">Galactic Overview</div>
        <div class="section-heading">Territory Control Map</div>
        <div class="galaxy-map-container">
          <svg class="galaxy-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
            ${nebulaGlow}
            <g class="galaxy-rotation">
              ${spiralArms}
              <!-- Galactic core marker -->
              <circle cx="300" cy="300" r="8" fill="rgba(204,68,255,0.4)"/>
              <circle cx="300" cy="300" r="3" fill="rgba(255,255,255,0.7)"/>
            </g>
            ${homeworldDots}
          </svg>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /**
   * Generate SVG path elements for four spiral arms.
   * Uses parametric spiral equations to create organic galaxy arms.
   * @returns {string} SVG path elements
   * @private
   */
  _buildSpiralArms() {
    const arms = [];
    const numArms = 4;
    const cx = 300;
    const cy = 300;

    for (let arm = 0; arm < numArms; arm++) {
      /* Each arm starts at a different angle (90° apart) */
      const baseAngle = (arm * Math.PI * 2) / numArms;
      let pathData = '';

      /* Trace 60 points along each spiral arm */
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        /* Logarithmic spiral: r increases with angle */
        const angle = baseAngle + t * Math.PI * 2.5;
        const radius = 20 + t * 250;
        /* Add slight wobble for organic feel */
        const wobble = Math.sin(t * Math.PI * 8) * (5 + t * 10);
        const x = cx + Math.cos(angle) * (radius + wobble);
        const y = cy + Math.sin(angle) * (radius + wobble);

        if (i === 0) {
          pathData += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        } else {
          pathData += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      }

      /* Main arm stroke — wide, semi-transparent */
      arms.push(`<path d="${pathData}" fill="none" stroke="rgba(0,180,255,0.06)"
        stroke-width="18" stroke-linecap="round" filter="url(#galaxy-blur)"/>`);

      /* Inner bright core of the arm */
      arms.push(`<path d="${pathData}" fill="none" stroke="rgba(0,180,255,0.12)"
        stroke-width="4" stroke-linecap="round"/>`);

      /* Scattered star clusters along the arm (every 8th point) */
      for (let i = 8; i <= 60; i += 8) {
        const t = i / 60;
        const angle = baseAngle + t * Math.PI * 2.5;
        const radius = 20 + t * 250;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        /* Pseudo-random offset for natural cluster scatter */
        const ox = Math.sin(arm * 100 + i * 7.3) * 15;
        const oy = Math.cos(arm * 100 + i * 11.1) * 15;
        const brightness = 0.15 + Math.random() * 0.2;
        arms.push(`<circle cx="${(x + ox).toFixed(1)}" cy="${(y + oy).toFixed(1)}"
          r="1.2" fill="rgba(180,220,255,${brightness.toFixed(2)})"/>`);
      }
    }

    return arms.join('\n');
  },

  /* ── Core Loop ─────────────────────────────────────────── */

  /**
   * Build the Five-Phase Gameplay Loop section with phase cards.
   * @returns {string} HTML string
   */
  buildCoreLoop() {
    return `
      <section class="dashboard-section">
        <div class="section-label">Core Loop</div>
        <div class="section-heading">Five-Phase Gameplay</div>
        <div class="phase-loop">
          <div class="phase-block" style="background:linear-gradient(180deg,rgba(0,180,255,0.06),transparent);border-top:2px solid rgba(0,180,255,0.5)">
            <div class="phase-num" style="color:var(--terran)">PHASE 1</div>
            <div class="phase-name">MAP</div>
            <div class="phase-desc">Galaxy overview. Move fleets. Manage economy. Build infrastructure.</div>
            <span class="phase-arrow">\u203A</span>
          </div>
          <div class="phase-block" style="background:linear-gradient(180deg,rgba(0,255,238,0.06),transparent);border-top:2px solid rgba(0,255,238,0.5)">
            <div class="phase-num" style="color:var(--shards)">PHASE 2</div>
            <div class="phase-name">ARMADA</div>
            <div class="phase-desc">Compose armies. Equip units. Select commanders. MVP: 2 Frigates starting fleet.</div>
            <span class="phase-arrow">\u203A</span>
          </div>
          <div class="phase-block" style="background:linear-gradient(180deg,rgba(255,170,34,0.06),transparent);border-top:2px solid rgba(255,170,34,0.5)">
            <div class="phase-num" style="color:var(--accord)">PHASE 3</div>
            <div class="phase-name">APPROACH</div>
            <div class="phase-desc">Choose: War, Diplomacy, or Espionage. Starting CP pool: 3.</div>
            <span class="phase-arrow">\u203A</span>
          </div>
          <div class="phase-block" style="background:linear-gradient(180deg,rgba(255,102,34,0.06),transparent);border-top:2px solid rgba(255,102,34,0.5)">
            <div class="phase-num" style="color:var(--horde)">PHASE 4</div>
            <div class="phase-name">SPACE</div>
            <div class="phase-desc">Fleet formations. Auto-battle with CP abilities. Outcome modifies ground combat.</div>
            <span class="phase-arrow">\u203A</span>
          </div>
          <div class="phase-block" style="background:linear-gradient(180deg,rgba(255,34,102,0.06),transparent);border-top:2px solid rgba(255,34,102,0.5)">
            <div class="phase-num" style="color:var(--vorax)">PHASE 5</div>
            <div class="phase-name">GROUND</div>
            <div class="phase-desc">Territory conquest. Cover system. Deployment. Reserves. 6 default units per side.</div>
          </div>
        </div>
      </section>`;
  },

  /* ── Rogue-Lite Flow ───────────────────────────────────── */

  /**
   * Build the rogue-lite loop flow text banner.
   * @returns {string} HTML string
   */
  buildRogueLiteFlow() {
    return `
      <section class="dashboard-section">
        <div class="card" style="padding:10px 18px;text-align:center;margin-bottom:32px;background:rgba(0,180,255,0.03);border-color:rgba(0,180,255,0.1)">
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;letter-spacing:2px;color:var(--text-dim)">ROGUE-LITE LOOP: MAP \u2192 ARMADA \u2192 APPROACH \u2192 SPACE \u2192 GROUND \u2192 REPEAT \u2192 VICTORY OR DEATH \u2192 NEW SIMULATION RUN</span>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── Faction Header ────────────────────────────────────── */

  /**
   * Build the "THE SEVEN FACTIONS" section header.
   * @returns {string} HTML string
   */
  buildFactionHeader() {
    return `
      <section class="dashboard-section">
        <div class="section-label">The Seven Factions</div>
        <div class="section-heading">Every Faction Plays Differently</div>
      </section>`;
  },

  /* ── Faction Grid ────────────────────────────────────── */

  /**
   * Build the responsive grid of enhanced faction cards with emblems.
   * @param {Array} factions - Array of faction objects from factions.json
   * @param {Object} emblems - Faction key → SVG emblem string map
   * @returns {string} HTML string
   */
  buildFactionGrid(factions, emblems) {
    return `
      <section class="faction-section">
        <div class="faction-grid">
          ${factions.map(f => this.buildFactionCard(f, emblems)).join('')}
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /**
   * Build a single enhanced faction card with emblem, name, description,
   * mechanic badge, meta stats, and early/mid/late power-curve bars.
   * Clicking the card navigates to that faction's chapter.
   * @param {Object} f - Faction data object
   * @param {Object} emblems - Faction key → SVG inner-content string map
   * @returns {string} HTML string
   */
  buildFactionCard(f, emblems) {
    const npc = f.npc ? `<div class="npc-badge">NPC</div>` : '';
    const emblemSvg = emblems[f.key] || '';

    /* Wrap the emblem SVG fragment in a full <svg> element with faction color */
    const emblemHtml = emblemSvg
      ? `<div class="faction-emblem" style="color:${f.color}">
           <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
                width="48" height="48">${emblemSvg}</svg>
         </div>`
      : '';

    return `
      <div class="faction-card parallax-card" style="--faction-color:${f.color}"
           onclick="location.hash='#${f.chapterId}'">
        ${npc}
        <div class="faction-card-header">
          ${emblemHtml}
          <div class="faction-card-titles">
            <div class="faction-name">${f.name}</div>
            <div class="faction-subtitle">${f.subtitle}</div>
          </div>
        </div>
        <div class="faction-mechanic">${f.mechanicName}</div>
        <div class="faction-desc">${f.desc}</div>
        <div class="faction-meta">
          <span>\u25C6 ${f.curve}</span>
          <span>\u25A3 ${f.skill}</span>
          <span>\u2B21 ${f.units} units</span>
        </div>
        <div class="stat-bars">
          ${this.buildStatBar('Early', f.early, f.color)}
          ${this.buildStatBar('Mid', f.mid, f.color)}
          ${this.buildStatBar('Late', f.late, f.color)}
        </div>
      </div>`;
  },

  /* ── Stat Bar Helper ─────────────────────────────────── */

  /**
   * Build a single horizontal stat bar (used for power-curve display).
   * @param {string} label - Bar label (e.g. 'Early', 'Mid', 'Late')
   * @param {number} value - Percentage value (0–100)
   * @param {string} color - CSS color for the fill
   * @returns {string} HTML string
   */
  buildStatBar(label, value, color) {
    const v = typeof value === 'number' ? value : 0;
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${v}%;background:${color}"></div>
        </div>
        <span class="stat-value">${v}</span>
      </div>`;
  },

  /* ── Game Systems Grid ─────────────────────────────────── */

  /**
   * Build the Game Systems Quick Navigation grid — 12 clickable cards.
   * @returns {string} HTML string
   */
  buildGameSystems() {
    return `
      <section class="dashboard-section">
        <div class="section-label">Game Systems</div>
        <div class="section-heading">Quick Navigation</div>
        <div class="systems-grid">
          <div class="system-card" onclick="location.hash='#ch17'">
            <div class="system-card-title">Auto-Battle Engine</div>
            <div class="system-card-desc">Core combat engine, unit AI scaling (5 tiers), AI role system, speed controls, visual readability</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch18'">
            <div class="system-card-title">Space Combat</div>
            <div class="system-card-desc">5 formations, 7 CP abilities, MVP ship stats, fleet compositions, spaceCombatResult schema</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch19'">
            <div class="system-card-title">Ground Combat</div>
            <div class="system-card-desc">Territory model, cover system, deployment, reserves, 7 CP abilities, 6 units per side</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch20'">
            <div class="system-card-title">Equipment System</div>
            <div class="system-card-desc">6 slot categories, variable slots by rank, 208 items, 8 MVP items, starting loadout</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch22'">
            <div class="system-card-title">General AI &amp; Chain of Command</div>
            <div class="system-card-desc">Option C kill-count promotion chain, 6 traits, coaching, loyalty, defection, autonomous command</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch12'">
            <div class="system-card-title">Galaxy Generation</div>
            <div class="system-card-desc">Procedural galaxies, 5 star types, shareable seeds, \u00A712.11 Galactic Core Layout, 2\u20135 faction homeworlds, wormholes</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch13'">
            <div class="system-card-title">Planets &amp; Biomes</div>
            <div class="system-card-desc">12 planet types, variable territories, planetary traits, Vorax terraforming</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch24'">
            <div class="system-card-title">Espionage &amp; Intelligence</div>
            <div class="system-card-desc">5 operation types, Deep Recon: 0 Intel, Sabotage: 4 Intel, 60% base success</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch25'">
            <div class="system-card-title">Alignment &amp; Win Paths</div>
            <div class="system-card-desc">Architect #44aaff / Vanguard #ff6622 / Tyrant #cc44ff, Conquest/Unification/Pragmatist</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch28'">
            <div class="system-card-title">Tech Trees</div>
            <div class="system-card-desc">124 nodes, 4 branches \u00D7 5 tiers \u00D7 5 playable + 3 branches \u00D7 4 tiers \u00D7 2 NPC</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch33'">
            <div class="system-card-title">Meta-Progression</div>
            <div class="system-card-desc">3 layers: In-Run / Archive / Account. localStorage key: 'aoc_archive'. SD awards.</div>
          </div>
          <div class="system-card" onclick="location.hash='#ch43'">
            <div class="system-card-title">DLC Roadmap</div>
            <div class="system-card-desc">Playable Vorax, Playable Guardians, Schism Wars prequel, Co-Op multiplayer</div>
          </div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── Document Structure ────────────────────────────────── */

  /**
   * Build the Document Structure section — 4-column breakdown.
   * @returns {string} HTML string
   */
  buildDocumentStructure() {
    return `
      <section class="dashboard-section">
        <div class="section-label">Document Structure</div>
        <div class="section-heading">8 Parts \u00B7 46 Chapters \u00B7 13 Appendices (incl. Appendix L &amp; M)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:32px;">
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.65rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">FACTIONS &amp; UNITS</div>
            <div style="font-size:0.8rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>7 complete faction bibles with lore, gameplay, awakening scripts</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>105 units with physical + narrative descriptions</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>208 equipment items \u2014 8 MVP items with confirmed prototype stats</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>124 tech tree nodes (20 per playable + 12 per NPC faction)</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>18 Vorax evolution templates + hybrid system</div>
            </div>
          </div>
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.65rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">SYSTEMS &amp; MECHANICS</div>
            <div style="font-size:0.8rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>5-phase gameplay loop fully specified</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Auto-battle engine with AI role system (Aggressor/Flanker/Brawler)</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>MVP ship stats locked: Interceptor / Frigate / Destroyer (Terran); Raider / Gunship / Dreadnought (Horde)</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Supply chain with degrading speed penalties (\u00A715.7\u201315.9) + canonical stat application order</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Option C rank chain: Rookie\u2192Veteran\u2192Elite\u2192Commander\u2192General (kill-count thresholds)</div>
            </div>
          </div>
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.65rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">GALAXY &amp; WORLD</div>
            <div style="font-size:0.8rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Procedural galaxy generation \u2014 \u00A712.11 Galactic Core Layout with faction homeworlds &amp; custom difficulty</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>12 planet types with variable territory counts (3\u201322)</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>5 static hazards + 5 dynamic events + Ion Storms</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Supply chain: 1\u20132 hops 100% \u2192 9+ hops 10%. Attacker/Defender penalty tables locked.</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>15 building types: Supply Depot / Relay Station / Logistics Hub (MVP locked)</div>
            </div>
          </div>
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.65rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">NARRATIVE &amp; META</div>
            <div style="font-size:0.8rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>4-act story with simulation-to-reality twist</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>4 endings + secret Unifier ending</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>3-layer meta-progression \u2014 localStorage key 'aoc_archive', SD award rates locked</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>500\u2013800 Compendium entries with 3 narrative voices</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Appendix L: 15 Prototype Rulings (Decisions 129\u2013143) \u2014 all locked values</div>
            </div>
          </div>
        </div>
      </section>`;
  },

  /* ── Five Differentiators ──────────────────────────────── */

  /**
   * Build the "What Makes It Unique" section with 5 differentiator cards.
   * @returns {string} HTML string
   */
  buildFiveDifferentiators() {
    return `
      <section class="dashboard-section">
        <div class="section-label">What Makes It Unique</div>
        <div class="section-heading">Five Differentiators</div>
        <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:32px;">
          <div class="card card-accent" style="border-left-color:var(--terran)"><strong style="color:#fff">1. The Auto-Battle General Fantasy.</strong> <span style="color:var(--text-mid)">You prepared the army, chose equipment, set the formation, positioned the deployment \u2014 now watch, intervene with CP abilities at critical moments, and commit reserves when the line breaks. You are the general at the holographic map, not the soldier in the trench.</span></div>
          <div class="card card-accent" style="border-left-color:var(--shards)"><strong style="color:#fff">2. Units That Become People.</strong> <span style="color:var(--text-mid)">Continuous promotion from anonymous Rookie to autonomous General who commands entire sectors, develops personality traits, forms rivalries, and can defect with their entire fleet if mistreated. Kill-count thresholds: Veteran=3, Elite=8, Commander=15, General=25.</span></div>
          <div class="card card-accent" style="border-left-color:var(--horde)"><strong style="color:#fff">3. Procedural Destiny.</strong> <span style="color:var(--text-mid)">Cross-run behavioral profile GENERATES the endgame galaxy. An aggressive player wakes to a militarized galaxy. A diplomatic player wakes to trade routes and alliances. The simulation shaped the reality you must survive.</span></div>
          <div class="card card-accent" style="border-left-color:var(--necro)"><strong style="color:#fff">4. The Dual-Threat Weapon Asymmetry.</strong> <span style="color:var(--text-mid)">Energy weapons work on Vorax but HEAL Core Guardians. Kinetic weapons work on Guardians but are overwhelmed by Vorax numbers. Maintain two armies, re-equip constantly, or pursue rare hybrid weapons.</span></div>
          <div class="card card-accent" style="border-left-color:var(--guardians)"><strong style="color:#fff">5. Volatile Death Chain Reactions.</strong> <span style="color:var(--text-mid)">Every Guardian that dies EXPLODES. Chain reactions cascade. The optimal strategy (spread forces) is the OPPOSITE of normal combat (concentrate force). The endgame forces players to rethink everything.</span></div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── Summary Statistics ──────────────────────────────── */

  /**
   * Build the command-console statistics readout with scanning animation.
   * Values are hardcoded to match the current GDD version.
   * @returns {string} HTML string
   */
  buildSummary() {
    const stats = [
      { num: '8', label: 'Parts' },
      { num: '46', label: 'Chapters' },
      { num: '13', label: 'Appendices' },
      { num: '7', label: 'Factions' },
      { num: '105', label: 'Units' },
      { num: '208', label: 'Equipment' }
    ];
    return `
      <section class="stats-section">
        <div class="section-heading">DOCUMENT STATUS</div>
        <div class="summary-bar console-readout">
          <div class="console-scan-line"></div>
          ${stats.map(s => `
            <div class="summary-stat">
              <div class="num">${s.num}</div>
              <div class="label">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </section>`;
  },

  /* ── Footer ──────────────────────────────────────────── */

  /**
   * Build the footer with document version line and stats.
   * @returns {string} HTML string
   */
  buildFooterQuote() {
    return `
      <section class="footer-quote-section">
        <div class="footer-quote-divider"></div>
        <div style="text-align:center;padding:12px 0 20px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--text-dim);letter-spacing:3px;text-transform:uppercase">
            Ashes of Command: The Reclamation \u2014 Complete Master GDD v5.9.1
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:rgba(255,255,255,0.08);letter-spacing:2px;margin-top:4px">
            46 Chapters \u00B7 8 Parts \u00B7 13 Appendices (incl. Appendix L &amp; M) \u00B7 143 Resolved Decisions \u00B7 15 Prototype Rulings
          </div>
        </div>
        <blockquote class="footer-quote">
          <p class="footer-quote-text">
            \u201CMaster the Crucible. Learn what I could not teach myself.
            And when the simulation tells you you are ready&hellip;
            reunite our people. Whatever it costs.\u201D
          </p>
          <cite class="footer-quote-source">\u2014 The Original Strategist</cite>
        </blockquote>
        <div class="footer-quote-divider"></div>
      </section>`;
  },

  /* ── Interactive Behaviors ─────────────────────────────── */

  /**
   * Start the lore quote cycling animation in the hero section.
   * Fades out, swaps text, fades back in every 6 seconds.
   * @returns {void}
   */
  initLoreQuoteCycler() {
    /* Clear any existing timer from a previous render */
    if (this._quoteTimer) clearInterval(this._quoteTimer);

    const textEl = document.getElementById('hero-lore-text');
    const sourceEl = document.getElementById('hero-lore-source');
    if (!textEl || !sourceEl) return;  /* Hero not in DOM */

    this._quoteIndex = 0;

    this._quoteTimer = setInterval(() => {
      /* Fade out */
      const quoteEl = document.getElementById('hero-lore-quote');
      if (!quoteEl) {
        clearInterval(this._quoteTimer);
        return;  /* Dashboard was replaced */
      }

      quoteEl.classList.add('quote-fading');

      /* Swap text after fade-out completes (500ms) */
      setTimeout(() => {
        this._quoteIndex = (this._quoteIndex + 1) % this.LORE_QUOTES.length;
        const q = this.LORE_QUOTES[this._quoteIndex];
        const currentText = document.getElementById('hero-lore-text');
        const currentSource = document.getElementById('hero-lore-source');
        if (currentText) currentText.textContent = `"${q.text}"`;
        if (currentSource) currentSource.textContent = `— ${q.source}`;

        /* Fade back in */
        const currentQuote = document.getElementById('hero-lore-quote');
        if (currentQuote) currentQuote.classList.remove('quote-fading');
      }, 500);
    }, 6000);
  },

  /**
   * Hide the scroll indicator arrow after the user scrolls down.
   * @returns {void}
   */
  initScrollIndicator() {
    const indicator = document.getElementById('hero-scroll-indicator');
    if (!indicator) return;

    const onScroll = () => {
      if (window.scrollY > 80) {
        indicator.classList.add('hidden');
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  },

  /**
   * Apply subtle parallax depth effect to faction cards on scroll.
   * Each card shifts slightly based on its position in the viewport.
   * @returns {void}
   */
  initParallax() {
    const cards = document.querySelectorAll('.parallax-card');
    if (!cards.length) return;

    const updateParallax = () => {
      const viewportHeight = window.innerHeight;
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        /* How far through the viewport the card center is (0 = top, 1 = bottom) */
        const progress = (rect.top + rect.height / 2) / viewportHeight;
        /* Subtle vertical shift — max ±8px */
        const shift = (progress - 0.5) * 16;
        card.style.transform = `translateY(${shift.toFixed(1)}px)`;
      });
    };

    window.addEventListener('scroll', updateParallax, { passive: true });
    /* Initial position */
    updateParallax();
  }
};
