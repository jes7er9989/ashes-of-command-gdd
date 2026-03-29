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
        this.buildGalaxyOverview(factions) +
        this.buildSolarSystem() +
        this.buildTerritoryMap() +
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
    const size = 900;
    const cx = size / 2;
    const cy = size / 2;

    /* ── Generate spiral arm stars ──
       4 arms × 80 stars each = 320 stars along logarithmic spirals.
       Each star gets pseudo-random wobble, varying size and brightness
       to create an organic, dense galaxy arm appearance.              */
    const armShadows = [];
    const numArms = 4;
    const starsPerArm = 80;

    for (let arm = 0; arm < numArms; arm++) {
      const baseAngle = (arm * Math.PI * 2) / numArms;
      for (let i = 0; i < starsPerArm; i++) {
        const t = i / starsPerArm;
        const angle = baseAngle + t * Math.PI * 2.5;
        const radius = 15 + t * 210;
        /* Pseudo-random wobble for organic arm width */
        const wobbleX = Math.sin(arm * 50 + i * 7.3) * (4 + t * 14);
        const wobbleY = Math.cos(arm * 50 + i * 11.1) * (4 + t * 14);
        /* Secondary scatter — wider spread along outer arms */
        const scatterX = Math.sin(arm * 23 + i * 3.7) * (2 + t * 8);
        const scatterY = Math.cos(arm * 23 + i * 5.3) * (2 + t * 8);
        const x = cx + Math.cos(angle) * radius + wobbleX + scatterX;
        const y = cy + Math.sin(angle) * radius + wobbleY + scatterY;

        /* Varying brightness: brighter near core, dimmer at edges */
        const baseBright = t < 0.3 ? 0.6 : (t < 0.6 ? 0.45 : 0.3);
        const brightness = baseBright + (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.4;
        /* Varying size: larger near core */
        const starSize = t < 0.25 ? 1.5 : (t < 0.5 ? 1.2 : (t < 0.75 ? 1 : 0.8));
        /* Blue-white color variation along arms */
        const r = 180 + Math.floor((Math.sin(arm * 20 + i * 2.1) * 0.5 + 0.5) * 75);
        const g = 220 + Math.floor((Math.sin(arm * 20 + i * 3.3) * 0.5 + 0.5) * 35);

        armShadows.push(
          `${x.toFixed(0)}px ${y.toFixed(0)}px 0 ${starSize}px rgba(${r},${g},255,${brightness.toFixed(2)})`
        );
      }
    }

    /* ── Generate scattered background fill stars ──
       120 stars using golden-angle distribution for uniform circular spread.
       These fill the gaps between arms with dim ambient stars.         */
    const fillShadows = [];
    const fillCount = 120;
    for (let i = 0; i < fillCount; i++) {
      /* Golden angle distribution for even scatter within a circle */
      const goldenAngle = i * 2.39996323;
      const offsetAngle = Math.sin(i * 7.1) * 0.5;
      const angle = goldenAngle + offsetAngle;
      const maxR = 230;
      const r = Math.sqrt((i + 0.5) / fillCount) * maxR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const brightness = 0.12 + (Math.sin(i * 5.3) * 0.5 + 0.5) * 0.2;
      const sz = 0.4 + (Math.sin(i * 3.1) * 0.5 + 0.5) * 0.6;
      fillShadows.push(
        `${x.toFixed(0)}px ${y.toFixed(0)}px 0 ${sz.toFixed(1)}px rgba(200,220,255,${brightness.toFixed(2)})`
      );
    }

    /* ── Build faction homeworld HTML ──
       Each homeworld is an absolutely positioned div with glowing dot,
       expanding ping ring, label, and system count.
       Positions scaled from 600-space (original SVG) to 500-space.    */
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
            <div class="galaxy-nebula"></div>
            <div class="galaxy-arms">
              <div class="galaxy-stars" style="box-shadow:${armShadows.join(',')}"></div>
              <div class="galaxy-fill-stars" style="box-shadow:${fillShadows.join(',')}"></div>
              <div class="galaxy-core"></div>
              ${homeworlds}
            </div>
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
    /* Planet data: name, orbit radius (px), size (px), color, period (s), startAngle (deg) */
    const planets = [
      { name: 'Mercury',  orbit: 60,  size: 4,  color: '#b0a090',         period: 15, start: 42  },
      { name: 'Venus',    orbit: 90,  size: 6,  color: '#e8c87a',         period: 20, start: 137 },
      { name: 'Terra',    orbit: 125, size: 8,  color: 'var(--terran)',    period: 26, start: 255 },
      { name: 'Mars',     orbit: 160, size: 5,  color: '#c85a3a',         period: 32, start: 18  },
      { name: 'Jupiter',  orbit: 205, size: 8,  color: '#c8a86e',         period: 42, start: 190 },
      { name: 'Saturn',   orbit: 245, size: 7,  color: '#d4c48c',         period: 52, start: 310 },
      { name: 'Neptune',  orbit: 280, size: 5,  color: '#4488cc',         period: 60, start: 88  }
    ];

    /* Build orbit rings (dashed circles) and planet elements */
    const orbitRings = planets.map(p => `
      <div class="sol-orbit-ring" style="
        width:${p.orbit * 2}px;
        height:${p.orbit * 2}px;
        top:50%; left:50%;
        transform:translate(-50%,-50%);
      "></div>
    `).join('');

    const planetEls = planets.map(p => {
      const isTerra = p.name === 'Terra';
      const terraClass = isTerra ? ' sol-terra' : '';
      const labelClass = isTerra ? ' sol-label-terra' : '';
      return `
        <div class="sol-orbit-arm${terraClass}" style="
          width:${p.orbit * 2}px;
          height:${p.orbit * 2}px;
          top:50%; left:50%;
          transform:translate(-50%,-50%) rotate(${p.start}deg);
          animation:solOrbit ${p.period}s linear infinite;
        ">
          <div class="sol-planet${terraClass}" style="
            width:${p.size}px;
            height:${p.size}px;
            background:${p.color};
            ${isTerra ? 'box-shadow:0 0 6px var(--terran),0 0 14px var(--terran),0 0 28px rgba(0,180,255,0.4);' : `box-shadow:0 0 4px ${p.color};`}
          ">
            <div class="sol-planet-label${labelClass}" style="
              ${isTerra ? 'color:var(--terran);font-weight:700;font-size:0.55rem;' : ''}
            ">${p.name.toUpperCase()}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <section class="galaxy-section">
        <div class="section-label">Star System View</div>
        <div class="section-heading">Sol System \u2014 Terran Home</div>
        <div class="sol-system-container">
          <div class="sol-system">
            ${orbitRings}
            <div class="sol-star"></div>
            <div class="sol-star-label">SOL</div>
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
    /* ── Territory data: 16 territories with irregular polygon shapes ──
     * Layout: Northern continent (4), Central strip (4), Southern continent (4),
     * plus 4 island/outlier territories. Each territory has organic polygon points
     * on a 1000×600 SVG viewBox, a center point (cx,cy) for label placement,
     * a control status, and a resource icon. */
    const territories = [
      /* === NORTHERN CONTINENT === */
      { name: 'Northern Garrison', status: 'controlled', icon: '\u26E8',
        points: '55,15 105,9 155,8 210,12 258,22 290,35 310,50 305,75 300,100 308,132 315,158 298,180 282,198 258,212 232,220 200,218 170,216 145,210 118,202 98,192 78,178 62,160 52,140 45,115 42,92 44,68 48,45',
        cx: 178, cy: 115 },
      { name: 'Comm Array', status: 'controlled', icon: '\u2699',
        points: '318,48 350,32 382,20 415,12 445,8 475,10 505,18 530,28 542,50 548,78 540,108 535,132 538,158 540,178 528,195 510,208 488,214 462,212 438,210 415,208 392,205 370,198 352,192 340,182 328,170 322,158 315,138 310,118 308,100',
        cx: 428, cy: 112 },
      { name: 'Shield Generator', status: 'controlled', icon: '\u26E8',
        points: '538,25 568,16 600,12 632,14 660,16 690,22 718,32 745,42 755,65 758,92 752,122 748,148 740,172 732,195 720,210 700,220 678,224 658,222 635,218 612,216 595,212 572,208 555,198 548,188 542,172 540,152 538,132 542,108 548,82 552,55',
        cx: 645, cy: 118 },
      { name: 'Mountain Pass', status: 'contested', icon: '\u26E8',
        points: '752,38 780,30 808,25 835,28 858,36 878,48 892,65 900,88 898,112 895,138 890,158 882,178 875,198 865,212 850,224 832,232 815,234 795,228 778,222 765,218 750,210 740,200 735,188 738,172 742,158 748,140 752,120 758,100 762,78 758,58',
        cx: 822, cy: 130 },

      /* === ISLAND: Orbital Defense HQ (top-right) === */
      { name: 'Orbital Defense HQ', status: 'controlled', icon: '\u26E8',
        points: '925,35 945,30 962,32 978,42 988,58 992,78 990,100 985,118 978,132 968,142 955,150 940,152 928,145 920,135 916,118 914,100 916,80 918,62 920,48',
        cx: 955, cy: 92 },

      /* === ISLAND: Western Fortifications (far-left) === */
      { name: 'Western Fortifications', status: 'neutral', icon: '\u26E8',
        points: '22,258 42,250 62,246 82,248 102,255 118,262 130,275 135,292 134,312 132,332 128,352 122,368 115,380 105,390 90,395 72,392 58,388 42,380 30,368 22,352 16,335 14,318 15,300 18,280',
        cx: 75, cy: 320 },

      /* === CENTRAL STRIP === */
      { name: 'Spaceport Alpha', status: 'controlled', icon: '\u2605',
        points: '152,218 172,220 195,222 218,224 242,218 262,210 282,204 305,196 325,192 340,194 346,210 348,232 350,255 354,278 356,300 354,322 350,345 345,362 338,378 325,392 310,402 290,405 268,402 248,400 228,395 208,390 190,384 175,378 158,368 142,355 132,340 125,322 118,302 115,282 118,265 122,248 132,234',
        cx: 238, cy: 305 },
      { name: 'Central Command', status: 'controlled', icon: '\u2605',
        points: '348,195 375,202 400,208 425,212 452,215 478,216 505,214 528,208 548,200 572,208 595,215 618,210 635,206 648,215 652,235 654,258 656,282 658,305 658,328 655,352 650,372 645,390 638,405 625,416 610,422 588,426 565,430 542,430 520,428 498,426 475,424 452,422 430,420 410,416 395,410 382,402 368,392 358,378 352,362 350,340 352,318 354,298 355,278 354,258 352,238 350,218',
        cx: 502, cy: 312 },
      { name: 'Industrial District', status: 'controlled', icon: '\u2699',
        points: '640,210 660,208 682,208 705,210 725,214 745,220 765,228 785,236 805,242 825,250 842,258 855,270 860,288 862,308 862,328 858,348 852,368 845,385 835,400 822,410 808,418 790,422 770,424 750,422 732,420 715,418 700,415 685,410 670,402 660,392 652,378 648,362 646,342 648,322 650,302 652,280 655,262 656,242 648,225',
        cx: 752, cy: 315 },
      { name: 'Power Grid Hub', status: 'controlled', icon: '\u2699',
        points: '862,258 878,252 895,248 912,250 930,255 948,262 962,272 975,285 982,302 985,322 984,342 982,360 975,378 968,392 958,402 945,410 930,415 915,416 900,414 886,410 875,404 865,395 858,382 856,365 858,348 862,328 864,308 865,288 864,270',
        cx: 922, cy: 332 },

      /* === ISLAND: Supply Depot (bottom-left) === */
      { name: 'Supply Depot', status: 'controlled', icon: '\u2699',
        points: '28,458 48,452 68,448 88,448 108,452 128,458 142,468 150,482 155,498 154,515 148,532 140,545 128,555 115,562 100,566 82,564 65,560 50,552 38,542 28,530 20,515 16,498 18,480 22,468',
        cx: 88, cy: 505 },

      /* === SOUTHERN CONTINENT === */
      { name: 'Southern Bastion', status: 'contested', icon: '\u26E8',
        points: '172,390 195,394 220,398 245,402 270,405 295,408 318,410 342,412 365,413 385,415 392,430 395,448 395,468 392,488 388,508 382,528 375,542 365,555 350,565 332,572 312,576 290,578 268,575 248,572 230,568 212,562 198,555 185,545 175,535 168,522 158,508 152,492 150,475 148,460 152,442 158,425 165,410',
        cx: 275, cy: 485 },
      { name: 'Harbor District', status: 'neutral', icon: '\u2699',
        points: '398,415 418,418 440,420 462,422 485,425 508,428 530,428 552,426 575,422 595,420 610,422 614,438 615,458 614,478 610,498 605,518 598,538 590,552 578,564 565,572 548,578 528,582 508,582 488,580 468,576 448,572 432,566 418,558 408,548 400,535 394,520 390,502 388,485 390,468 392,452 394,435',
        cx: 502, cy: 498 },
      { name: 'Civilian Sector', status: 'neutral', icon: '\u2605',
        points: '618,422 638,420 660,418 682,418 702,420 722,424 742,428 758,434 772,442 785,452 795,465 800,480 802,498 800,515 795,532 788,545 778,555 765,565 750,572 732,577 712,578 692,576 672,572 655,566 640,558 628,548 620,535 615,520 612,502 614,485 616,468 618,452 618,438',
        cx: 710, cy: 496 },
      { name: 'Research Complex', status: 'controlled', icon: '\u2605',
        points: '802,415 820,410 838,408 855,410 872,414 888,420 902,428 915,440 925,454 932,470 934,488 932,508 928,525 920,540 910,552 898,560 882,568 865,572 848,572 832,568 818,562 806,552 798,540 792,525 786,510 782,495 782,478 785,462 790,448 795,435',
        cx: 858, cy: 490 },

      /* === ISLAND: Underground Network (bottom-right) === */
      { name: 'Underground Network', status: 'controlled', icon: '\u2699',
        points: '930,462 948,456 965,455 978,462 988,475 992,492 994,510 992,528 986,545 978,558 968,568 955,575 942,572 932,565 925,552 920,538 918,520 920,502 922,485 925,472',
        cx: 958, cy: 516 }
    ];

    /* ── Adjacency connections between territories ── */
    const connections = [
      [0,1], [1,2], [2,3],                         /* North continent internal */
      [0,6], [1,7], [2,7], [2,8], [3,8],           /* North → Central */
      [5,6],                                         /* Western Fort → Spaceport */
      [6,7], [7,8], [8,9],                          /* Central strip internal */
      [6,11], [7,12], [8,13], [9,14],               /* Central → South */
      [10,11],                                       /* Supply Depot → Southern Bastion */
      [11,12], [12,13], [13,14],                     /* South continent internal */
      [14,15],                                       /* Research → Underground */
      [3,4]                                          /* Mountain Pass → Orbital Defense */
    ];

    /* ── Status visual styles ── */
    const statusFill = {
      controlled: 'rgba(0,180,255,0.25)',   /* Terran blue */
      neutral:    'rgba(100,100,120,0.2)',   /* Grey */
      contested:  'rgba(255,60,60,0.2)'      /* Red */
    };
    const statusStroke = {
      controlled: '#00b4ff',
      neutral:    '#555',
      contested:  '#ff3c3c'
    };

    /* ── SVG Defs: grid dot pattern, scanline pattern ── */
    const defs = `<defs>
          <pattern id="tcm-grid-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.6" fill="rgba(255,255,255,0.07)"/>
          </pattern>
          <pattern id="tcm-scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.05)" stroke-width="1"/>
          </pattern>
        </defs>`;

    /* ── Grid dot background ── */
    const gridBg = '<rect width="1000" height="600" fill="url(#tcm-grid-dots)"/>';

    /* ── Connection routes (dashed lines between adjacent territory centers) ── */
    const routes = connections.map(([a, b]) =>
      `<line x1="${territories[a].cx}" y1="${territories[a].cy}" x2="${territories[b].cx}" y2="${territories[b].cy}" class="terr-route"/>`
    ).join('\n            ');

    /* ── Territory polygons ── */
    const polys = territories.map(t =>
      `<polygon class="terr-poly terr-poly-${t.status}" points="${t.points}"/>`
    ).join('\n            ');

    /* ── Territory labels (icon + two-line name centered in each polygon) ── */
    const labels = territories.map(t => {
      const spaceIdx = t.name.indexOf(' ');
      const line1 = t.name.substring(0, spaceIdx);
      const line2 = t.name.substring(spaceIdx + 1);
      const fill = statusStroke[t.status];
      return `<g>
              <text x="${t.cx}" y="${t.cy - 15}" text-anchor="middle" class="terr-label-icon" fill="${fill}">${t.icon}</text>
              <text x="${t.cx}" y="${t.cy + 1}" text-anchor="middle" class="terr-label-name">
                <tspan x="${t.cx}" dy="0">${line1}</tspan>
                <tspan x="${t.cx}" dy="12">${line2}</tspan>
              </text>
            </g>`;
    }).join('\n            ');

    /* ── Scanline overlay for military feel ── */
    const scanlines = '<rect width="1000" height="600" fill="url(#tcm-scanlines)" class="terr-scanline-overlay"/>';

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
        </div>`;

    return `
      <section class="galaxy-section">
        <div class="section-label">Ground Control Map</div>
        <div class="section-heading">Terra \u2014 Capital World Territory Control</div>
        <div class="terr-map-wrapper">
          <svg class="terr-svg-map" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            ${defs}
            ${gridBg}
            <g class="terr-routes-group">
              ${routes}
            </g>
            <g class="terr-regions-group">
              ${polys}
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
  }
};
