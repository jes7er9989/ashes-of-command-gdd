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
   buildGalaxyOverview(factions)  | CSS-only galaxy with faction dots
   buildSolarSystem()             | CSS-only animated Sol system with orbiting planets
   buildTerritoryMap()            | CSS-only territory control map of Terra
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
        this.buildCanvasGalaxyContainer() +
        this.buildCanvasSolarContainer() +
        this.buildCanvasTerritoryContainer() +
        this.buildCoreLoop() +
        this.buildRogueLiteFlow() +
        this.buildFactionHeader() +
        this.buildFactionGrid(factions, emblems) +
        this.buildGameSystems() +
        this.buildDocumentStructure() +
        this.buildFiveDifferentiators() +
        this.buildSummary() +
        this.buildFooterQuote();

      /* Start interactive behaviors + canvas renderers after DOM is ready */
      requestAnimationFrame(() => {
        this.initLoreQuoteCycler();
        this.initScrollIndicator();
        this.initParallax();
        this._initCanvasRenderers();
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
        <div class="quote-block" style="margin:32px auto;text-align:center">
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
    const size = 900;
    const cx = size / 2;
    const cy = size / 2;

    /* ── Generate spiral arm stars (DOUBLED density) ──
       4 arms × 160 stars each = 640 stars along logarithmic spirals.
       Multi-color: white, blue-white, yellow, orange-red for realism. */
    const armShadows = [];
    const numArms = 4;
    const starsPerArm = 160;

    /* Star color palette: [r, g, b] bases for variety */
    const starColors = [
      [220, 235, 255],  /* blue-white */
      [255, 255, 240],  /* warm white */
      [255, 240, 200],  /* yellow */
      [255, 200, 160],  /* orange */
      [255, 170, 140],  /* orange-red */
    ];

    for (let arm = 0; arm < numArms; arm++) {
      const baseAngle = (arm * Math.PI * 2) / numArms;
      for (let i = 0; i < starsPerArm; i++) {
        const t = i / starsPerArm;
        const angle = baseAngle + t * Math.PI * 2.5;
        const radius = 15 + t * 210;
        /* Pseudo-random wobble for organic arm width */
        const wobbleX = Math.sin(arm * 50 + i * 7.3) * (4 + t * 16);
        const wobbleY = Math.cos(arm * 50 + i * 11.1) * (4 + t * 16);
        /* Secondary scatter — wider spread along outer arms */
        const scatterX = Math.sin(arm * 23 + i * 3.7) * (2 + t * 10);
        const scatterY = Math.cos(arm * 23 + i * 5.3) * (2 + t * 10);
        const x = cx + Math.cos(angle) * radius + wobbleX + scatterX;
        const y = cy + Math.sin(angle) * radius + wobbleY + scatterY;

        /* Varying brightness: brighter near core, dimmer at edges */
        const baseBright = t < 0.3 ? 0.65 : (t < 0.6 ? 0.5 : 0.32);
        const brightness = baseBright + (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.4;
        /* Varying size: larger near core */
        const starSize = t < 0.25 ? 1.6 : (t < 0.5 ? 1.3 : (t < 0.75 ? 1.0 : 0.7));
        /* Pick star color based on pseudo-random index */
        const colorIdx = Math.abs(Math.floor(Math.sin(arm * 31 + i * 4.7) * 100)) % starColors.length;
        const sc = starColors[colorIdx];
        /* Slight per-star color wobble for natural variation */
        const cr = Math.min(255, sc[0] + Math.floor(Math.sin(i * 2.1) * 20));
        const cg = Math.min(255, sc[1] + Math.floor(Math.sin(i * 3.3) * 15));
        const cb = Math.min(255, sc[2] + Math.floor(Math.sin(i * 1.7) * 10));

        armShadows.push(
          `${x.toFixed(0)}px ${y.toFixed(0)}px 0 ${starSize}px rgba(${cr},${cg},${cb},${brightness.toFixed(2)})`
        );
      }
    }

    /* ── Generate scattered background fill stars ──
       180 stars (up from 120) using golden-angle distribution.        */
    const fillShadows = [];
    const fillCount = 180;
    for (let i = 0; i < fillCount; i++) {
      const goldenAngle = i * 2.39996323;
      const offsetAngle = Math.sin(i * 7.1) * 0.5;
      const angle = goldenAngle + offsetAngle;
      const maxR = 230;
      const r = Math.sqrt((i + 0.5) / fillCount) * maxR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const brightness = 0.12 + (Math.sin(i * 5.3) * 0.5 + 0.5) * 0.22;
      const sz = 0.4 + (Math.sin(i * 3.1) * 0.5 + 0.5) * 0.7;
      /* Mix in warm/cool colors for fill stars too */
      const fci = Math.abs(Math.floor(Math.sin(i * 6.7) * 100)) % starColors.length;
      const fc = starColors[fci];
      fillShadows.push(
        `${x.toFixed(0)}px ${y.toFixed(0)}px 0 ${sz.toFixed(1)}px rgba(${fc[0]},${fc[1]},${fc[2]},${brightness.toFixed(2)})`
      );
    }

    /* ── Galactic halo — faint dim stars beyond main disc ──
       60 stars scattered in the outer ring (radius 220-320px).        */
    const haloShadows = [];
    const haloCount = 60;
    for (let i = 0; i < haloCount; i++) {
      const angle = (i / haloCount) * Math.PI * 2 + Math.sin(i * 3.3) * 0.8;
      const radius = 220 + Math.sin(i * 7.7) * 40 + Math.cos(i * 4.1) * 50;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const brightness = 0.06 + (Math.sin(i * 2.9) * 0.5 + 0.5) * 0.1;
      const sz = 0.3 + (Math.sin(i * 5.1) * 0.5 + 0.5) * 0.5;
      haloShadows.push(
        `${x.toFixed(0)}px ${y.toFixed(0)}px 0 ${sz.toFixed(1)}px rgba(200,210,230,${brightness.toFixed(2)})`
      );
    }

    /* ── Nebula cloud divs — 10 elongated ellipses along spiral arms ──
       Each positioned and rotated to follow the spiral arm curves.
       Colors: blues, purples, teals at low opacity.                   */
    const nebulaData = [
      { x: 30, y: 25, w: 180, h: 60,  rot: -35, color: '0,140,255',   op: 0.08 },
      { x: 55, y: 60, w: 200, h: 70,  rot: 25,  color: '160,60,255',  op: 0.06 },
      { x: 15, y: 55, w: 160, h: 55,  rot: -60, color: '0,200,180',   op: 0.07 },
      { x: 65, y: 30, w: 190, h: 65,  rot: 50,  color: '0,100,220',   op: 0.09 },
      { x: 40, y: 70, w: 170, h: 50,  rot: -15, color: '120,40,220',  op: 0.06 },
      { x: 75, y: 55, w: 150, h: 55,  rot: 70,  color: '0,180,200',   op: 0.08 },
      { x: 20, y: 40, w: 200, h: 80,  rot: -45, color: '80,120,255',  op: 0.10 },
      { x: 60, y: 45, w: 180, h: 60,  rot: 35,  color: '140,0,200',   op: 0.05 },
      { x: 35, y: 75, w: 140, h: 50,  rot: -70, color: '0,160,255',   op: 0.07 },
      { x: 80, y: 20, w: 160, h: 55,  rot: 15,  color: '60,200,200',  op: 0.06 },
    ];
    const nebulaDivs = nebulaData.map(n => `
      <div class="galaxy-nebula-cloud" style="
        left:${n.x}%; top:${n.y}%;
        width:${n.w}px; height:${n.h}px;
        background:radial-gradient(ellipse, rgba(${n.color},${n.op}) 0%, rgba(${n.color},${n.op * 0.3}) 40%, transparent 70%);
        transform:translate(-50%,-50%) rotate(${n.rot}deg);
      "></div>`).join('');

    /* ── Dust lane divs — dark bands between spiral arms ──
       6 dark gradient strips creating contrast.                       */
    const dustData = [
      { x: 38, y: 32, w: 220, h: 40, rot: -30 },
      { x: 62, y: 65, w: 200, h: 35, rot: 30  },
      { x: 25, y: 60, w: 180, h: 30, rot: -55 },
      { x: 70, y: 38, w: 190, h: 35, rot: 55  },
      { x: 50, y: 50, w: 160, h: 30, rot: 0   },
      { x: 45, y: 22, w: 170, h: 32, rot: -20 },
    ];
    const dustDivs = dustData.map(d => `
      <div class="galaxy-dust-lane" style="
        left:${d.x}%; top:${d.y}%;
        width:${d.w}px; height:${d.h}px;
        transform:translate(-50%,-50%) rotate(${d.rot}deg);
      "></div>`).join('');

    /* ── Comet divs — 6 animated streaks across the galaxy ──
       Each comet has a bright head and gradient tail, animated
       along a diagonal path over 8-15 seconds.                       */
    const cometData = [
      { delay: 0,   dur: 10, angle: 25,  startX: -5,  startY: 20, endX: 105, endY: 60  },
      { delay: 3,   dur: 12, angle: -15, startX: 110, startY: 30, endX: -10, endY: 55  },
      { delay: 6,   dur: 9,  angle: 35,  startX: -5,  startY: 50, endX: 105, endY: 80  },
      { delay: 1.5, dur: 14, angle: -25, startX: 105, startY: 70, endX: -5,  endY: 35  },
      { delay: 8,   dur: 11, angle: 10,  startX: -5,  startY: 75, endX: 105, endY: 45  },
      { delay: 4.5, dur: 8,  angle: -40, startX: 80,  startY: -5, endX: 20,  endY: 105 },
    ];
    const cometDivs = cometData.map((c, idx) => `
      <div class="galaxy-comet" style="
        --comet-start-x:${c.startX}%;
        --comet-start-y:${c.startY}%;
        --comet-end-x:${c.endX}%;
        --comet-end-y:${c.endY}%;
        --comet-angle:${c.angle}deg;
        animation:cometFly ${c.dur}s linear ${c.delay}s infinite;
      "></div>`).join('');

    /* ── Rogue planets — 5 slowly drifting larger dots ──
       Muted colors (dark red, brown, grey), 3-5px, 30-90s orbits.   */
    const rogueData = [
      { x: 25, y: 35, size: 4, color: '#6b3030', dur: 45, dx: 120, dy: 80  },
      { x: 70, y: 25, size: 3, color: '#5a4a32', dur: 60, dx: -90, dy: 110 },
      { x: 60, y: 72, size: 5, color: '#4a4a4a', dur: 35, dx: 80,  dy: -70 },
      { x: 18, y: 65, size: 3, color: '#7a3535', dur: 75, dx: 100, dy: -60 },
      { x: 80, y: 55, size: 4, color: '#5c5040', dur: 50, dx: -70, dy: 90  },
    ];
    const rogueDivs = rogueData.map((rp, idx) => `
      <div class="galaxy-rogue-planet" style="
        left:${rp.x}%; top:${rp.y}%;
        width:${rp.size}px; height:${rp.size}px;
        background:radial-gradient(circle, ${rp.color} 30%, transparent 80%);
        --rogue-dx:${rp.dx}px; --rogue-dy:${rp.dy}px;
        animation:rogueDrift ${rp.dur}s ease-in-out infinite alternate;
      "></div>`).join('');

    /* ── Build faction homeworld HTML ──
       Each homeworld is an absolutely positioned div with glowing dot,
       expanding ping ring, label, and system count.
       Positions scaled from 600-space (original SVG) to 900-space.   */
    const homeworlds = factions.map(f => {
      const pos = this.HOMEWORLD_POSITIONS[f.key];
      if (!pos) return '';
      const x = ((pos.x / 600) * size).toFixed(0);
      const y = ((pos.y / 600) * size).toFixed(0);
      const systemCount = this.TERRITORY_COUNTS[f.key] || 0;
      return `
        <div class="galaxy-homeworld" style="left:${x}px;top:${y}px;--hw-color:${f.color}"
             onclick="location.hash='#${f.chapterId}'" data-faction="${f.key}">
          <div class="homeworld-ring"></div>
          <div class="homeworld-dot"></div>
          <div class="homeworld-label">${f.name.toUpperCase()}</div>
          <div class="homeworld-systems">${systemCount} systems</div>
        </div>`;
    }).join('');

    return `
      <section class="galaxy-section">
        <div class="section-label">Galactic Overview</div>
        <div class="section-heading">Galactic Map</div>
        <div class="galaxy-map-container">
          <div class="galaxy-map">
            <!-- Nebula cloud layer — colored gas along spiral arms -->
            <div class="galaxy-nebula"></div>
            ${nebulaDivs}
            <!-- Dust lane layer — dark contrast bands -->
            ${dustDivs}
            <!-- Galactic halo — faint outer stars beyond the disc -->
            <div class="galaxy-halo" style="box-shadow:${haloShadows.join(',')}"></div>
            <!-- Rotating arm layer: stars, core, homeworlds -->
            <div class="galaxy-arms">
              <div class="galaxy-stars" style="box-shadow:${armShadows.join(',')}"></div>
              <div class="galaxy-fill-stars" style="box-shadow:${fillShadows.join(',')}"></div>
              <div class="galaxy-core"></div>
              ${homeworlds}
            </div>
            <!-- Comet layer — streaking animated comets -->
            ${cometDivs}
            <!-- Rogue planet layer — slowly drifting objects -->
            ${rogueDivs}
          </div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── Solar System ─────────────────────────────────────── */

  /**
   * Build an animated CSS-only solar system showing Sol — the Terran
   * League home system. 7 planets orbit a central star at varying speeds.
   * Terra is highlighted with Terran blue glow and pulsing animation.
   * @returns {string} HTML string
   */
  buildSolarSystem() {
    /* ── Planet data with SVG visual definitions ──
       Each planet gets an inline SVG with radial gradients for 3D sphere shading.
       Sizes reflect real relative differences (scaled for readability).          */
    const planets = [
      { name: 'Mercury',  orbit: 70,  size: 8,  period: 15, start: 42,
        /* Small grey world with subtle crater shading */
        svgGrad: `<radialGradient id="sol-grad-mercury" cx="35%" cy="35%">
          <stop offset="0%" stop-color="#c8c0b8"/><stop offset="50%" stop-color="#a09890"/>
          <stop offset="80%" stop-color="#706860"/><stop offset="100%" stop-color="#504840"/>
        </radialGradient>`,
        glow: 'none' },
      { name: 'Venus',    orbit: 105, size: 12, period: 20, start: 137,
        /* Pale yellow-white with hazy atmosphere */
        svgGrad: `<radialGradient id="sol-grad-venus" cx="40%" cy="35%">
          <stop offset="0%" stop-color="#f0e8d0"/><stop offset="40%" stop-color="#e8d8b0"/>
          <stop offset="75%" stop-color="#c8b888"/><stop offset="100%" stop-color="#a09068"/>
        </radialGradient>`,
        glow: '0 0 6px rgba(232,200,120,0.3)' },
      { name: 'Terra',    orbit: 145, size: 14, period: 26, start: 255,
        /* Blue-green with cloud wisps, Terran blue glow ring */
        svgGrad: `<radialGradient id="sol-grad-terra" cx="38%" cy="32%">
          <stop offset="0%" stop-color="#90d8f0"/><stop offset="25%" stop-color="#40a0d0"/>
          <stop offset="55%" stop-color="#2080a0"/><stop offset="80%" stop-color="#185868"/>
          <stop offset="100%" stop-color="#0c3040"/>
        </radialGradient>`,
        glow: '0 0 6px var(--terran),0 0 14px var(--terran),0 0 28px rgba(0,180,255,0.4)',
        /* Cloud wisps as a semi-transparent white arc */
        extra: `<ellipse cx="55%" cy="40%" rx="5" ry="2.5" fill="rgba(255,255,255,0.35)" transform="rotate(-20,7,7)"/>
                <ellipse cx="35%" cy="60%" rx="4" ry="2" fill="rgba(255,255,255,0.25)" transform="rotate(15,7,7)"/>` },
      { name: 'Mars',     orbit: 185, size: 10, period: 32, start: 18,
        /* Rust red-orange */
        svgGrad: `<radialGradient id="sol-grad-mars" cx="38%" cy="35%">
          <stop offset="0%" stop-color="#e8a080"/><stop offset="40%" stop-color="#c86040"/>
          <stop offset="75%" stop-color="#a04020"/><stop offset="100%" stop-color="#602010"/>
        </radialGradient>`,
        glow: '0 0 4px rgba(200,90,58,0.4)' },
      { name: 'Jupiter',  orbit: 240, size: 22, period: 42, start: 190,
        /* Banded orange/brown/white stripes via multiple gradient stops */
        svgGrad: `<radialGradient id="sol-grad-jupiter-sphere" cx="38%" cy="30%">
          <stop offset="0%" stop-color="#e8d0a0"/><stop offset="60%" stop-color="#c8a060"/>
          <stop offset="100%" stop-color="#6a4820"/>
        </radialGradient>
        <linearGradient id="sol-grad-jupiter-bands" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(200,160,100,0.0)"/>
          <stop offset="15%" stop-color="rgba(180,120,60,0.4)"/>
          <stop offset="25%" stop-color="rgba(220,200,160,0.3)"/>
          <stop offset="35%" stop-color="rgba(160,100,40,0.5)"/>
          <stop offset="45%" stop-color="rgba(240,220,180,0.25)"/>
          <stop offset="55%" stop-color="rgba(180,110,50,0.45)"/>
          <stop offset="65%" stop-color="rgba(210,180,140,0.3)"/>
          <stop offset="75%" stop-color="rgba(150,90,30,0.5)"/>
          <stop offset="85%" stop-color="rgba(200,170,120,0.2)"/>
          <stop offset="100%" stop-color="rgba(120,70,20,0.0)"/>
        </linearGradient>`,
        glow: '0 0 6px rgba(200,160,100,0.35)',
        useBands: true },
      { name: 'Saturn',   orbit: 295, size: 20, period: 52, start: 310,
        /* Pale gold with ring system */
        svgGrad: `<radialGradient id="sol-grad-saturn" cx="38%" cy="35%">
          <stop offset="0%" stop-color="#f0e8c8"/><stop offset="40%" stop-color="#d8c890"/>
          <stop offset="75%" stop-color="#b0a060"/><stop offset="100%" stop-color="#786830"/>
        </radialGradient>`,
        glow: '0 0 5px rgba(212,196,140,0.35)',
        hasRings: true },
      { name: 'Neptune',  orbit: 355, size: 14, period: 60, start: 88,
        /* Deep blue with faint atmospheric wisps */
        svgGrad: `<radialGradient id="sol-grad-neptune" cx="38%" cy="32%">
          <stop offset="0%" stop-color="#80b8e8"/><stop offset="35%" stop-color="#4080c0"/>
          <stop offset="70%" stop-color="#204880"/><stop offset="100%" stop-color="#102040"/>
        </radialGradient>`,
        glow: '0 0 5px rgba(68,136,204,0.4)',
        extra: `<ellipse cx="55%" cy="45%" rx="4.5" ry="1.5" fill="rgba(160,200,240,0.2)" transform="rotate(-10,7,7)"/>` }
    ];

    /* ── Build orbit rings (dashed circles with faint glow) ── */
    const orbitRings = planets.map(p => `
      <div class="sol-orbit-ring" style="
        width:${p.orbit * 2}px; height:${p.orbit * 2}px;
        top:50%; left:50%; transform:translate(-50%,-50%);
      "></div>
    `).join('');

    /* ── Asteroid belt — ring of tiny dots between Mars (185) and Jupiter (240) ──
       50 tiny dots scattered along radius ~210px.                                  */
    const asteroidDots = [];
    const asteroidCount = 50;
    for (let i = 0; i < asteroidCount; i++) {
      const angle = (i / asteroidCount) * 360 + Math.sin(i * 5.7) * 8;
      const radius = 208 + Math.sin(i * 3.3) * 6 + Math.cos(i * 7.1) * 4;
      const sz = 1 + Math.sin(i * 2.1) * 0.5;
      const opacity = 0.25 + Math.sin(i * 4.7) * 0.15;
      asteroidDots.push(`
        <div class="sol-asteroid" style="
          width:${sz.toFixed(1)}px; height:${sz.toFixed(1)}px;
          top:50%; left:50%;
          transform:translate(-50%,-50%) rotate(${angle.toFixed(0)}deg) translateY(-${radius.toFixed(0)}px);
          opacity:${opacity.toFixed(2)};
        "></div>`);
    }

    /* ── Build SVG planet elements ── */
    const planetEls = planets.map(p => {
      const isTerra = p.name === 'Terra';
      const terraClass = isTerra ? ' sol-terra' : '';
      const labelClass = isTerra ? ' sol-label-terra' : '';
      const half = p.size / 2;

      /* SVG viewBox sized to the planet */
      let svgContent = `<defs>${p.svgGrad}</defs>`;
      const gradId = p.name === 'Jupiter' ? 'sol-grad-jupiter-sphere' : `sol-grad-${p.name.toLowerCase()}`;

      /* Main sphere */
      svgContent += `<circle cx="${half}" cy="${half}" r="${half}" fill="url(#${gradId})"/>`;

      /* Jupiter banding overlay */
      if (p.useBands) {
        svgContent += `<circle cx="${half}" cy="${half}" r="${half}" fill="url(#sol-grad-jupiter-bands)"/>`;
      }

      /* Saturn rings — a rotated ellipse */
      let ringsHtml = '';
      if (p.hasRings) {
        const ringW = p.size * 1.8;
        const ringH = p.size * 0.5;
        ringsHtml = `<div class="sol-saturn-ring" style="
          width:${ringW}px; height:${ringH}px;
          top:50%; left:50%;
          transform:translate(-50%,-50%) rotateX(65deg);
        "></div>`;
      }

      /* Extra features (cloud wisps, atmospheric features) */
      if (p.extra) {
        svgContent += p.extra;
      }

      return `
        <div class="sol-orbit-arm${terraClass}" style="
          width:${p.orbit * 2}px; height:${p.orbit * 2}px;
          top:50%; left:50%;
          transform:translate(-50%,-50%) rotate(${p.start}deg);
          animation:solOrbit ${p.period}s linear infinite;
        ">
          <div class="sol-planet-wrap${terraClass}" style="
            width:${p.size}px; height:${p.size}px;
            ${p.glow !== 'none' ? `box-shadow:${p.glow};` : ''}
          ">
            ${ringsHtml}
            <svg class="sol-planet-svg" viewBox="0 0 ${p.size} ${p.size}"
                 width="${p.size}" height="${p.size}">
              ${svgContent}
            </svg>
            <div class="sol-planet-label${labelClass}" style="
              ${isTerra ? 'color:var(--terran);font-weight:700;font-size:0.55rem;' : ''}
            ">${p.name.toUpperCase()}</div>
          </div>
        </div>`;
    }).join('');

    /* ── Starfield background — 80 tiny dim stars behind the system ── */
    const starfieldDots = [];
    for (let i = 0; i < 80; i++) {
      const x = (Math.sin(i * 7.3 + 1.2) * 0.5 + 0.5) * 100;
      const y = (Math.cos(i * 5.1 + 3.4) * 0.5 + 0.5) * 100;
      const sz = 0.5 + (Math.sin(i * 3.7) * 0.5 + 0.5) * 1.0;
      const opacity = 0.1 + (Math.sin(i * 4.3) * 0.5 + 0.5) * 0.15;
      starfieldDots.push(`
        <div class="sol-bg-star" style="
          left:${x.toFixed(1)}%; top:${y.toFixed(1)}%;
          width:${sz.toFixed(1)}px; height:${sz.toFixed(1)}px;
          opacity:${opacity.toFixed(2)};
        "></div>`);
    }

    return `
      <section class="galaxy-section">
        <div class="section-label">Star System View</div>
        <div class="section-heading">Sol System \u2014 Terran Home</div>
        <div class="sol-system-container">
          <div class="sol-system">
            <!-- Starfield background -->
            ${starfieldDots.join('')}
            <!-- Orbit rings -->
            ${orbitRings}
            <!-- Asteroid belt between Mars and Jupiter -->
            <div class="sol-asteroid-belt">
              ${asteroidDots.join('')}
            </div>
            <!-- Central star Sol — with corona rays -->
            <div class="sol-star">
              <div class="sol-corona-ray sol-corona-1"></div>
              <div class="sol-corona-ray sol-corona-2"></div>
              <div class="sol-corona-ray sol-corona-3"></div>
              <div class="sol-corona-ray sol-corona-4"></div>
            </div>
            <div class="sol-star-label">SOL</div>
            <!-- Planets with SVG sphere visuals -->
            ${planetEls}
          </div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* ── Territory Map ───────────────────────────────────── */

  /**
   * Build an SVG-based Dark Crusade-style territory control map
   * of Terra's surface, divided into 16 irregular polygon territories.
   * Color-coded by control status: Terran (controlled), neutral, contested.
   * @returns {string} HTML string
   */
  buildTerritoryMap() {
    /* ── Risk-style territory map: 3 continents + islands ──
     * Uses SVG <path> with bezier curves for organic coastlines.
     * Internal borders are straighter. Continents float on dark ocean.
     * ViewBox: 1200 × 700                                              */

    const territories = [
      /* ═══ NORTHERN CONTINENT (top-left, 5 territories) ═══ */
      { name: 'Northern Garrison', status: 'controlled', icon: '\u26E8',
        d: 'M80,60 C95,45 140,30 200,35 L260,42 C275,44 285,50 290,60 L295,110 C290,130 275,145 255,150 L200,165 C160,170 120,160 95,145 C75,130 65,110 70,90 Z',
        cx: 180, cy: 100 },
      { name: 'Comm Array', status: 'controlled', icon: '\u2699',
        d: 'M260,42 L340,30 C370,28 405,35 430,50 L445,65 C455,80 450,100 440,115 L420,140 C400,158 370,165 340,162 L295,155 L295,110 C290,80 280,60 290,60 L295,55 Z',
        cx: 360, cy: 95 },
      { name: 'Shield Generator', status: 'controlled', icon: '\u26E8',
        d: 'M430,50 C460,35 500,30 530,40 C555,48 570,65 560,90 L548,130 C540,155 520,170 495,175 L440,170 L420,140 C435,120 445,100 445,80 Z',
        cx: 490, cy: 105 },
      { name: 'Mountain Pass', status: 'contested', icon: '\u2694',
        d: 'M295,155 L340,162 C370,165 400,158 420,140 L440,170 L495,175 C510,180 515,200 505,220 L480,250 C460,270 430,275 400,270 L340,255 C310,248 285,232 270,210 L255,180 C250,168 252,158 255,150 Z',
        cx: 380, cy: 210 },
      { name: 'Orbital Defense HQ', status: 'controlled', icon: '\u26E8',
        d: 'M80,165 C100,160 140,165 180,170 L200,165 L255,150 C252,158 250,168 255,180 L270,210 C260,235 240,250 215,255 L160,260 C120,258 90,240 75,215 C62,195 65,175 80,165 Z',
        cx: 170, cy: 210 },

      /* ═══ EASTERN CONTINENT (right, 6 territories) ═══ */
      { name: 'Central Command', status: 'controlled', icon: '\u2605', hq: true,
        d: 'M720,120 C750,105 790,100 830,110 C860,118 880,140 875,170 L865,220 C860,250 840,270 810,280 L750,290 C720,292 695,280 680,260 L670,220 C665,190 680,160 700,140 Z',
        cx: 775, cy: 195 },
      { name: 'Industrial District', status: 'controlled', icon: '\u2699',
        d: 'M830,60 C865,50 900,55 930,70 C955,82 970,105 965,135 L955,175 C948,200 930,215 905,220 L875,225 L875,170 C880,140 860,118 830,110 C810,104 790,100 780,105 L790,80 C800,65 815,58 830,60 Z',
        cx: 890, cy: 140 },
      { name: 'Power Grid Hub', status: 'controlled', icon: '\u26A1',
        d: 'M955,175 C960,200 965,230 955,260 C945,285 925,305 900,315 L860,325 C835,330 815,322 800,305 L810,280 C840,270 860,250 865,220 L875,225 L905,220 C930,215 948,200 955,175 Z',
        cx: 895, cy: 265 },
      { name: 'Research Complex', status: 'controlled', icon: '\u2697',
        d: 'M800,305 C815,322 835,330 860,325 L900,315 C910,340 905,370 890,395 C870,420 840,435 810,430 L770,420 C745,412 730,395 725,370 L730,340 C740,320 760,308 780,305 Z',
        cx: 815, cy: 370 },
      { name: 'Civilian Sector', status: 'controlled', icon: '\u2302',
        d: 'M680,260 C695,280 720,292 750,290 L810,280 L800,305 C780,308 760,320 740,340 L730,340 L690,345 C660,342 640,325 635,300 C630,280 645,265 665,260 Z',
        cx: 720, cy: 300 },
      { name: 'Harbor District', status: 'controlled', icon: '\u2693',
        d: 'M635,300 C640,325 660,342 690,345 L730,340 L725,370 C730,395 720,415 700,430 C675,448 645,450 620,440 L590,420 C570,405 565,380 575,355 C585,330 605,310 635,300 Z',
        cx: 660, cy: 375 },

      /* ═══ SOUTHERN ISLANDS (bottom, 5 territories) ═══ */
      { name: 'Spaceport Alpha', status: 'controlled', icon: '\u2605',
        d: 'M180,420 C210,405 250,400 290,410 C325,418 350,440 345,470 L335,510 C325,535 300,550 270,548 L220,540 C190,535 170,515 165,490 C160,465 165,440 180,420 Z',
        cx: 255, cy: 475 },
      { name: 'Southern Bastion', status: 'contested', icon: '\u2694',
        d: 'M380,450 C405,438 435,435 465,445 C490,453 505,475 500,500 L492,535 C485,558 465,570 440,568 L395,560 C370,555 352,538 350,515 C348,490 358,465 380,450 Z',
        cx: 430, cy: 505 },
      { name: 'Western Fortifications', status: 'neutral', icon: '\u26E8',
        d: 'M50,480 C70,468 95,465 120,472 C142,478 155,498 150,520 C145,540 130,555 110,558 L80,555 C58,550 42,535 40,515 C38,498 42,488 50,480 Z',
        cx: 95, cy: 515 },
      { name: 'Supply Depot', status: 'neutral', icon: '\u2699',
        d: 'M180,570 C200,560 225,558 248,565 C268,572 280,590 275,610 C270,628 255,640 235,642 L205,638 C185,632 172,618 170,600 C168,585 172,575 180,570 Z',
        cx: 222, cy: 600 },
      { name: 'Underground Network', status: 'neutral', icon: '\u26CF',
        d: 'M470,590 C495,580 525,578 550,585 C575,592 595,610 590,635 C585,655 565,668 540,670 L505,668 C480,664 462,648 458,628 C454,608 458,598 470,590 Z',
        cx: 525, cy: 625 }
    ];

    /* ── Adjacency connections ── */
    const landRoutes = [
      /* Northern continent internal */
      [0,1], [1,2], [0,4], [1,3], [2,3], [3,4],
      /* Eastern continent internal */
      [5,6], [5,9], [5,10], [6,7], [7,8], [8,9], [9,10], [10,8],
      /* Southern islands internal */
      [11,12]
    ];
    /* Sea routes between continents (dashed) */
    const seaRoutes = [
      [3,5],   /* Mountain Pass → Central Command */
      [4,10],  /* Orbital Defense → Harbor District */
      [4,11],  /* Orbital Defense → Spaceport Alpha */
      [12,8],  /* Southern Bastion → Research Complex */
      [14,11], /* Western Fort → Spaceport */
      [15,12]  /* Underground → Southern Bastion */
    ];

    /* ── Status visual styles ── */
    const statusStroke = {
      controlled: '#00b4ff',
      neutral:    '#555',
      contested:  '#ff3c3c'
    };

    /* ── SVG Defs: ocean gradient, grid dots, scanlines, glow filters ── */
    const defs = `<defs>
          <radialGradient id="tcm-ocean-grad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="rgba(0,40,80,0.3)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </radialGradient>
          <pattern id="tcm-grid-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="0.5" fill="rgba(100,150,255,0.08)"/>
          </pattern>
          <pattern id="tcm-scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>
          </pattern>
          <filter id="tcm-hq-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#00b4ff" flood-opacity="0.8"/>
          </filter>
          <filter id="tcm-continent-glow">
            <feGaussianBlur stdDeviation="12" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>`;

    /* ── Ocean background ── */
    const ocean = `<rect width="1200" height="700" fill="#040810"/>
          <rect width="1200" height="700" fill="url(#tcm-ocean-grad)" opacity="0.4"/>
          <rect width="1200" height="700" fill="url(#tcm-grid-dots)"/>`;

    /* ── Land routes (solid dim lines between adjacent territory centers) ── */
    const landLines = landRoutes.map(([a, b]) =>
      `<line x1="${territories[a].cx}" y1="${territories[a].cy}" x2="${territories[b].cx}" y2="${territories[b].cy}" class="terr-route terr-land-route"/>`
    ).join('\n            ');

    /* ── Sea routes (dashed lines crossing ocean between continents) ── */
    const seaLines = seaRoutes.map(([a, b]) =>
      `<line x1="${territories[a].cx}" y1="${territories[a].cy}" x2="${territories[b].cx}" y2="${territories[b].cy}" class="terr-route terr-sea-route"/>`
    ).join('\n            ');

    /* ── Territory paths ── */
    const polys = territories.map(t => {
      const cls = `terr-poly terr-poly-${t.status}${t.hq ? ' terr-poly-hq' : ''}`;
      return `<path class="${cls}" d="${t.d}"/>`;
    }).join('\n            ');

    /* ── HQ star marker for Central Command ── */
    const hqTerritory = territories.find(t => t.hq);
    const hqMarker = `<polygon class="terr-hq-star" points="${starPoints(hqTerritory.cx, hqTerritory.cy - 30, 12, 5, 5)}" fill="#00e5ff" stroke="#fff" stroke-width="1"/>`;

    /* ── Territory labels (icon + two-line name centered in each polygon) ── */
    const labels = territories.map(t => {
      const spaceIdx = t.name.indexOf(' ');
      const line1 = t.name.substring(0, spaceIdx);
      const line2 = t.name.substring(spaceIdx + 1);
      const fill = statusStroke[t.status];
      const yOff = t.hq ? -20 : -15;
      return `<g>
              <text x="${t.cx}" y="${t.cy + yOff}" text-anchor="middle" class="terr-label-icon" fill="${fill}">${t.icon}</text>
              <text x="${t.cx}" y="${t.cy + 1}" text-anchor="middle" class="terr-label-name">
                <tspan x="${t.cx}" dy="0">${line1}</tspan>
                <tspan x="${t.cx}" dy="12">${line2}</tspan>
              </text>
            </g>`;
    }).join('\n            ');

    /* ── Scanline overlay for military feel ── */
    const scanlines = '<rect width="1200" height="700" fill="url(#tcm-scanlines)" class="terr-scanline-overlay"/>';

    /* ── Legend HTML ── */
    const legend = `<div class="terr-legend">
          <div class="terr-legend-item">
            <span class="terr-legend-swatch" style="background:rgba(0,180,255,0.35);border:1px solid #00b4ff;"></span>
            <span>Controlled</span>
          </div>
          <div class="terr-legend-item">
            <span class="terr-legend-swatch" style="background:rgba(100,100,120,0.3);border:1px solid #555;"></span>
            <span>Neutral</span>
          </div>
          <div class="terr-legend-item">
            <span class="terr-legend-swatch" style="background:rgba(255,60,60,0.3);border:1px solid #ff3c3c;"></span>
            <span>Contested</span>
          </div>
          <div class="terr-legend-item">
            <span class="terr-legend-swatch" style="background:rgba(0,229,255,0.5);border:2px solid #00e5ff;"></span>
            <span>HQ</span>
          </div>
        </div>`;

    /* ── Helper: generate 5-pointed star polygon points ── */
    function starPoints(cx, cy, outerR, innerR, numPoints) {
      const pts = [];
      for (let i = 0; i < numPoints * 2; i++) {
        const angle = (Math.PI / numPoints) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${Math.round(cx + r * Math.cos(angle))},${Math.round(cy + r * Math.sin(angle))}`);
      }
      return pts.join(' ');
    }

    return `
      <section class="galaxy-section">
        <div class="section-label">Ground Control Map</div>
        <div class="section-heading">Terra \u2014 Capital World Territory Control</div>
        <div class="terr-map-wrapper">
          <svg class="terr-svg-map" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet">
            ${defs}
            ${ocean}
            <g class="terr-routes-group">
              ${seaLines}
              ${landLines}
            </g>
            <g class="terr-regions-group">
              ${polys}
            </g>
            <g class="terr-hq-marker-group">
              ${hqMarker}
            </g>
            <g class="terr-labels-group">
              ${labels}
            </g>
            ${scanlines}
          </svg>
          ${legend}
        </div>
        <div class="divider"></div>
      </section>`;
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
        <div class="card" style="padding:16px 24px;text-align:center;margin-bottom:32px;background:rgba(0,180,255,0.06);border:1px solid rgba(0,180,255,0.2);border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,0.3)">
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.9rem;letter-spacing:3px;color:var(--accent);text-shadow:0 0 20px rgba(0,180,255,0.3)">ROGUE-LITE LOOP</span>
          <div style="font-family:'JetBrains Mono',monospace;font-size:1rem;letter-spacing:2px;color:var(--text-hi);margin-top:8px">MAP \u2192 ARMADA \u2192 APPROACH \u2192 SPACE \u2192 GROUND \u2192 REPEAT</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;letter-spacing:2px;color:var(--text-dim);margin-top:6px">VICTORY OR DEATH \u2192 NEW SIMULATION RUN</div>
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
            <div style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">FACTIONS &amp; UNITS</div>
            <div style="font-size:0.85rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>7 complete faction bibles with lore, gameplay, awakening scripts</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>105 units with physical + narrative descriptions</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>208 equipment items \u2014 8 MVP items with confirmed prototype stats</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>124 tech tree nodes (20 per playable + 12 per NPC faction)</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>18 Vorax evolution templates + hybrid system</div>
            </div>
          </div>
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">SYSTEMS &amp; MECHANICS</div>
            <div style="font-size:0.85rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>5-phase gameplay loop fully specified</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Auto-battle engine with AI role system (Aggressor/Flanker/Brawler)</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>MVP ship stats locked: Interceptor / Frigate / Destroyer (Terran); Raider / Gunship / Dreadnought (Horde)</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Supply chain with degrading speed penalties (\u00A715.7\u201315.9) + canonical stat application order</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Option C rank chain: Rookie\u2192Veteran\u2192Elite\u2192Commander\u2192General (kill-count thresholds)</div>
            </div>
          </div>
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">GALAXY &amp; WORLD</div>
            <div style="font-size:0.85rem;color:var(--text-mid);line-height:1.6">
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Procedural galaxy generation \u2014 \u00A712.11 Galactic Core Layout with faction homeworlds &amp; custom difficulty</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>12 planet types with variable territory counts (3\u201322)</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>5 static hazards + 5 dynamic events + Ion Storms</div>
              <div style="padding-left:14px;position:relative;margin-bottom:5px"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>Supply chain: 1\u20132 hops 100% \u2192 9+ hops 10%. Attacker/Defender penalty tables locked.</div>
              <div style="padding-left:14px;position:relative"><span style="position:absolute;left:0;color:rgba(0,180,255,0.3)">\u25B8</span>15 building types: Supply Depot / Relay Station / Logistics Hub (MVP locked)</div>
            </div>
          </div>
          <div class="card">
            <div style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);letter-spacing:2px;margin-bottom:12px">NARRATIVE &amp; META</div>
            <div style="font-size:0.85rem;color:var(--text-mid);line-height:1.6">
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
          <div class="card card-accent" style="border-left-color:var(--terran)"><strong style="color:#fff;font-size:1rem">1. The Auto-Battle General Fantasy.</strong> <span style="color:var(--text-mid);font-size:0.9rem">You prepared the army, chose equipment, set the formation, positioned the deployment \u2014 now watch, intervene with CP abilities at critical moments, and commit reserves when the line breaks. You are the general at the holographic map, not the soldier in the trench.</span></div>
          <div class="card card-accent" style="border-left-color:var(--shards)"><strong style="color:#fff;font-size:1rem">2. Units That Become People.</strong> <span style="color:var(--text-mid);font-size:0.9rem">Continuous promotion from anonymous Rookie to autonomous General who commands entire sectors, develops personality traits, forms rivalries, and can defect with their entire fleet if mistreated. Kill-count thresholds: Veteran=3, Elite=8, Commander=15, General=25.</span></div>
          <div class="card card-accent" style="border-left-color:var(--horde)"><strong style="color:#fff;font-size:1rem">3. Procedural Destiny.</strong> <span style="color:var(--text-mid);font-size:0.9rem">Cross-run behavioral profile GENERATES the endgame galaxy. An aggressive player wakes to a militarized galaxy. A diplomatic player wakes to trade routes and alliances. The simulation shaped the reality you must survive.</span></div>
          <div class="card card-accent" style="border-left-color:var(--necro)"><strong style="color:#fff;font-size:1rem">4. The Dual-Threat Weapon Asymmetry.</strong> <span style="color:var(--text-mid);font-size:0.9rem">Energy weapons work on Vorax but HEAL Core Guardians. Kinetic weapons work on Guardians but are overwhelmed by Vorax numbers. Maintain two armies, re-equip constantly, or pursue rare hybrid weapons.</span></div>
          <div class="card card-accent" style="border-left-color:var(--guardians)"><strong style="color:#fff;font-size:1rem">5. Volatile Death Chain Reactions.</strong> <span style="color:var(--text-mid);font-size:0.9rem">Every Guardian that dies EXPLODES. Chain reactions cascade. The optimal strategy (spread forces) is the OPPOSITE of normal combat (concentrate force). The endgame forces players to rethink everything.</span></div>
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
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-dim);letter-spacing:2px;margin-top:4px">
            <span style="color:var(--accent)">46</span> Chapters \u00B7 <span style="color:var(--accent)">8</span> Parts \u00B7 <span style="color:var(--accent)">13</span> Appendices (incl. Appendix L &amp; M) \u00B7 <span style="color:var(--accent)">143</span> Resolved Decisions \u00B7 <span style="color:var(--accent)">15</span> Prototype Rulings
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
  },

  /* ═══════════════════════════════════════════════════════════
     CANVAS RENDERER CONTAINERS + INITIALIZATION
     ═══════════════════════════════════════════════════════════ */

  /** Container for Canvas galaxy map */
  buildCanvasGalaxyContainer() {
    return `
      <section class="galaxy-section">
        <div class="section-label">Galactic Overview</div>
        <div class="section-heading">Galactic Map</div>
        <div id="canvas-galaxy-mount" style="display:flex;justify-content:center;padding:20px 0;min-height:900px"></div>
        <div class="divider"></div>
      </section>`;
  },

  /** Container for Three.js solar system */
  buildCanvasSolarContainer() {
    return `
      <section class="galaxy-section">
        <div class="section-label">Star System View</div>
        <div class="section-heading">Sol System \u2014 Terran Home</div>
        <div id="canvas-solar-mount" style="display:flex;justify-content:center;padding:20px 0;min-height:500px"></div>
        <div class="divider"></div>
      </section>`;
  },

  /** Container for SVG territory map (hand-crafted asset) */
  buildCanvasTerritoryContainer() {
    return `
      <section class="galaxy-section">
        <div class="section-label">Ground Control Map</div>
        <div class="section-heading">Terra \u2014 Capital World Territory Control</div>
        <div id="canvas-territory-mount" style="display:flex;justify-content:center;padding:20px 0">
          <object data="assets/territory-map.svg?v=6" type="image/svg+xml"
                  style="width:100%;max-width:1600px;border-radius:8px;border:1px solid rgba(0,180,255,0.1);box-shadow:0 4px 30px rgba(0,0,0,0.5)"
                  aria-label="Terra Capital World Territory Control Map">
          </object>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /** Initialize all Canvas/WebGL renderers after DOM mount */
  _initCanvasRenderers() {
    /* ── Galaxy (Canvas 2D) ── */
    const galaxyMount = document.getElementById('canvas-galaxy-mount');
    if (galaxyMount && typeof GalaxyRenderer !== 'undefined') {
      try {
        this._galaxyRenderer = new GalaxyRenderer(galaxyMount);
        this._galaxyRenderer.start();
      } catch (e) { console.warn('[Dashboard] Galaxy renderer failed:', e); }
    }

    /* ── Solar System (Three.js) ── */
    const solarMount = document.getElementById('canvas-solar-mount');
    if (solarMount && typeof SolarSystemRenderer !== 'undefined') {
      try {
        this._solarRenderer = new SolarSystemRenderer(solarMount);
        this._solarRenderer.start();
      } catch (e) { console.warn('[Dashboard] Solar system renderer failed:', e); }
    }

    /* ── Territory Map — uses hand-crafted SVG asset (assets/territory-map.svg) ──
       No Canvas renderer needed; loaded via <object> tag in buildCanvasTerritoryContainer() */
  }
};
