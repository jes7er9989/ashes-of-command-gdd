/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DASHBOARD â€" Cinematic Hero Landing Page
   â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
   Renders the default view when no chapter is selected:
   a full-viewport hero section with animated starfield,
   epigraph, game description, strategist quote, project scope,
   galactic overview map with faction homeworld dots,
   core loop phases, rogue-lite flow, faction header,
   enhanced faction cards with emblems and parallax,
   game systems grid, document structure, five differentiators,
   a command-console statistics banner, and a footer lore quote.

   Key exports:
     Dashboard.render(container) â†' build and inject dashboard HTML

   Dependencies:
     - DataLoader  (loads factions.json, faction-emblems.json)

   Created: 2026-03-12 | Modified: 2026-03-28
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FUNCTION INDEX
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   render(container)              | Main entry â€" builds full dashboard
   buildHero()                    | Full-viewport hero with starfield
   buildEpigraph()                | Removed — absorbed into prologue
   buildGameDescription()         | State of the Galaxy prologue + rotating quotes
   buildStrategistQuote()         | Removed — already in Hero
   buildByTheNumbers()            | Project Scope â€" 6 stat cards
   buildCanvasGalaxyContainer()   | Mount for Canvas 2D galaxy (canvas-galaxy.js)
   buildCanvasSolarContainer()    | Mount for Three.js solar system (solar-system.js)
   buildCanvasTerritoryContainer()| Mount for SVG territory map (assets/territory-map.svg)
   buildCoreLoop()                | Five-Phase gameplay cards
   buildRogueLiteFlow()           | Rogue-lite loop flow text
   buildFactionHeader()           | "THE SEVEN FACTIONS" section header
   buildFactionGrid(factions, e)  | Enhanced faction cards with emblems
   buildFactionCard(f, emblems)   | Single faction card with emblem
   buildStatBar(label, value, c)  | Power-curve horizontal bar
   buildGameSystems()             | Quick Navigation â€" 12 clickable cards
   buildDocumentStructure()       | 8 Parts Â· 46 Chapters Â· 13 Appendices
   buildFiveDifferentiators()     | What Makes It Unique â€" 5 cards
   buildSummary()                 | Command-console statistics readout
   buildFooterQuote()             | Iconic lore quote from the GDD
   initLoreQuoteCycler()          | Starts the rotating lore quotes
   initScrollIndicator()          | Hides arrow after user scrolls
   initParallax()                 | Subtle depth effect on faction cards
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const Dashboard = {

  /* â"€â"€ Lore Quotes â"€â"€
     Rotating quotes from across the Ashes of Command universe.
     Each cycles in the hero section beneath the title.            */
  LORE_QUOTES: [
    /* ── Terran League ── */
    { text: 'The galaxy burns, but we do not break.', source: 'Terran League Field Command' },
    { text: 'We were given a broken world and told to hold it. We held it.', source: 'General Valerius, Terran League' },
    { text: 'Logistics wins wars. Heroes just get the credit.', source: 'Terran League Officer\'s Manual' },
    /* ── Eternal Shards ── */
    { text: 'We were ancient when your species learned to walk upright.', source: 'Aethyn Archivist' },
    { text: 'To preserve what remains, we must become what we feared.', source: 'Council of Resonances' },
    { text: 'Every crystal that shatters was once a mind that dreamed.', source: 'Eternal Shards Elegy' },
    /* ── Scrap-Horde ── */
    { text: 'Everything dies. Everything gets salvaged.', source: 'Scrap-Horde Philosophy' },
    { text: 'Your trash is our throne. Your dead are our arsenal.', source: 'Horde Warcaller' },
    /* ── Necro-Legion ── */
    { text: 'We have already won. You simply haven\'t died yet.', source: 'Necro-Legion Broadcast' },
    { text: 'Patience is not a virtue. It is inevitability.', source: 'Necro-Legion Strategic Archives' },
    { text: 'We remember everything. We forget nothing. We forgive less.', source: 'Reactivated Core Designation 0001' },
    /* ── Unity Accord ── */
    { text: 'One target. One moment. Seven guns.', source: 'Unity Accord Combat Doctrine' },
    { text: 'Unity is not compromise. It is multiplication.', source: 'The Covenant Text' },
    /* ── Vorax ── */
    { text: 'We do not negotiate. We consume. We evolve. We hunger.', source: 'Vorax Intercept' },
    { text: 'They adapted to our weapons in three engagements. We ran out of weapons in five.', source: 'Terran After-Action Report' },
    /* ── Core Guardians ── */
    { text: 'They were made to guard the Reclamation Engine. They will not yield.', source: 'Alliance Intelligence Report' },
    { text: 'Energy heals them. Kinetics merely anger them. Prayer does nothing.', source: 'First Contact Survivor' },
    /* ── The Crucible / Meta ── */
    { text: 'The Crucible does not forgive. It does not forget. It teaches.', source: 'The Original Strategist' },
    { text: 'You are a weapon. The simulation decides when you are sharp enough.', source: 'Crucible Activation Protocol' },
    { text: 'The simulation shaped the galaxy you must survive. Your choices built your prison.', source: 'Procedural Destiny Codex' }
  ],

  /* â"€â"€ Quote Cycling State â"€â"€ */
  _quoteIndex: 0,
  _quoteTimer: null,

  /* â"€â"€ Galaxy Map â€" Faction Homeworld Positions â"€â"€
     Each faction is placed along the spiral arms of the galaxy.
     Coordinates are percentages within the 600x600 SVG viewBox.    */
  HOMEWORLD_POSITIONS: {
    terran:    { x: 310, y: 220 },   /* Inner arm â€" humanity's core sector        */
    shards:    { x: 460, y: 160 },   /* Outer rim â€" ancient crystalline worlds     */
    horde:     { x: 180, y: 350 },   /* Scrapyard belt â€" debris-rich zone          */
    necro:     { x: 420, y: 380 },   /* Tomb sector â€" deep galactic south          */
    accord:    { x: 240, y: 150 },   /* Northern coalition space                   */
    vorax:     { x: 130, y: 470 },   /* Extra-galactic incursion point             */
    guardians: { x: 300, y: 300 }    /* Galactic center â€" the Nexus                */
  },

  /* â"€â"€ Territory System Counts â"€â"€ */
  TERRITORY_COUNTS: {
    terran:    32,
    guardians: 35,
    shards:    18,
    accord:    24,
    horde:     19,
    vorax:     28,
    necro:     14
  },

  /* â"€â"€ Main Render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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
        this.initEpigraphQuoteCycler();
        this.initPrologueQuoteCycler();
        this.initScrollIndicator();
        this.initParallax();
        this._initCanvasRenderers();
        this._syncInstallButton();
      });
    } catch (e) {
      view.innerHTML = `<p style="color:var(--vorax)">Error loading dashboard: ${e.message}</p>`;
    }
  },

  /* â"€â"€ Hero Section â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /**
   * Build the full-viewport hero section with CSS starfield,
   * animated title, subtitle, rotating lore quote, and scroll indicator.
   * @returns {string} HTML string
   */
  buildHero() {
    return `
      <section class="hero-section" id="hero-section">
        <div class="hero-starfield"></div>
        <div class="hero-nebula"></div>
        <div class="hero-content">
          <h1 class="hero-title">ASHES OF COMMAND</h1>
          <div class="hero-subtitle">THE RECLAMATION</div>
          <div class="hero-tagline">
            <span class="hero-tagline-text">4X Grand Strategy meets Auto-Battler. Rogue-Lite Progression. Deep Narrative.</span>
          </div>
          <div class="hero-tagline-expanded">
            <p class="hero-pitch">You are a weapon \u2014 a freshly decanted clone created by a fallen civilization to win a war that already destroyed them once. Prove your genius across simulated galactic campaigns. When the simulation judges you ready, wake into a real galaxy being devoured from the outside and guarded at its core by gods who will destroy anyone who approaches.</p>
            <p class="hero-pitch-sub">7 factions. One galaxy. No second chances.</p>
          </div>
          <div class="hero-version">INTERACTIVE GAME DESIGN DOCUMENT v5.9.1</div>
          <div class="hero-lore-quote" id="hero-lore-quote">
            <span class="hero-lore-text" id="hero-lore-text">"${this.LORE_QUOTES[0].text}"</span>
            <span class="hero-lore-source" id="hero-lore-source">\u2014 ${this.LORE_QUOTES[0].source}</span>
          </div>
          <div class="hero-cta-row">
            <button class="hero-cta-btn hero-cta-primary" onclick="document.getElementById('dashboard-view').querySelector('.dashboard-section').scrollIntoView({behavior:'smooth'})">Explore the GDD</button>
            <button class="hero-cta-btn hero-cta-secondary" onclick="document.querySelector('.faction-section').scrollIntoView({behavior:'smooth'})">Meet the Factions</button>
            <button class="hero-cta-btn hero-cta-secondary" onclick="document.getElementById('canvas-galaxy-mount').scrollIntoView({behavior:'smooth'})">View the Galaxy</button>
            <button class="hero-cta-btn hero-cta-install" id="pwa-install-btn" disabled onclick="window._pwaInstallPrompt && window._pwaInstallPrompt.prompt()">Install App</button>
          </div>
        </div>
        <div class="hero-scroll-indicator" id="hero-scroll-indicator">
          <div class="hero-scroll-arrow">\u25BC</div>
          <div class="hero-scroll-label">SCROLL TO EXPLORE</div>
        </div>
      </section>`;
  },

  /* â"€â"€ Epigraph â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /**
   * Build the epigraph quote â€" Unity Accord founding principles.
   * @returns {string} HTML string
   */
  /* ── Epigraph ── Rotating multi-faction thematic quotes with context */

  EPIGRAPH_QUOTES: [
    { text: 'The species that cannot share power will not survive to exercise it. Unity is not compromise \u2014 it is multiplication.', source: 'The Covenant Text \u2014 Unity Accord Founding Principles' },
    { text: 'A wave of energy blasted from the Core \u2014 ripping apart everything at the molecular level. One wave. One moment. Everything changed.', source: 'The Fracture \u2014 Ch. 3' },
    { text: 'They adapted to our weapons in three engagements. We ran out of weapons in five.', source: 'Terran After-Action Report \u2014 Vorax Contact' },
    { text: 'Every faction believes they are indigenous to their homeworld. The truth rewriting identity is the moment the player realizes these warring peoples are family.', source: 'The Buried Truth \u2014 Ch. 3' },
    { text: 'Death resets in-run progress. Blueprints, resources, lore persist across runs through the Archive. Veteran players always feel experience translating into power.', source: 'Rogue-Lite Meta-Progression \u2014 Ch. 1' },
    { text: 'Hour 1 \u2014 Captain. Hour 10 \u2014 Admiral. Hour 20 \u2014 Emperor. The emotional arc: learning, mastery, delegation, trust, consequence.', source: 'The Experience Statement \u2014 Ch. 1' }
  ],

  _epigraphQuoteIndex: 0,
  _epigraphQuoteTimer: null,

  buildEpigraph() {
    const q = this.EPIGRAPH_QUOTES[0];
    return `
      <section class="dashboard-section epigraph-section">
        <div class="epigraph-context">The Aethyn are gone. They spanned thousands of galaxies, connected worlds through intergalactic warp lanes, and existed as one psychic mind. The Vorax came. The warp lanes were cut. The Reclamation Engine fired. Five civilizations rose from the wreckage, none remembering what came before. This is the galaxy you inherit.</div>
        <div class="epigraph-quote-block" id="epigraph-quote-block">
          <div class="epigraph-quote-text" id="epigraph-quote-text">\u201C${q.text}\u201D</div>
          <div class="epigraph-quote-source" id="epigraph-quote-source">\u2014 ${q.source}</div>
        </div>
      </section>`;
  },

  /* â"€â"€ Game Description â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /**
   * Build the document header with full title and elevator pitch.
   * @returns {string} HTML string
   */
  /* ── State of the Galaxy Prologue ──
     Replaces the old Game Description and Epigraph sections.
     Provides narrative world-setting with rotating thematic quotes. */

  PROLOGUE_QUOTES: [
    { text: 'The entire species chose. All castes. All minds. Billions voting yes to their own destruction. The last act of unity was choosing to end unity.', source: 'The Fracture \u2014 Historical Record' },
    { text: 'They targeted this galaxy and cut the warp lanes. No reinforcements. No escape. No contact with the thousands of other galaxies the Aethyn had once called home.', source: 'The Vorax Crisis \u2014 Ch. 3' },
    { text: 'We did not inherit this galaxy. We woke up in its wreckage and were told to fix it.', source: 'General Valerius, Address to the Terran Senate' },
    { text: 'No faction knows they share a common ancestor. The truth is completely buried \u2014 not hidden, not suppressed, simply gone.', source: 'The Buried Truth \u2014 Ch. 3' },
    { text: 'The Reclamation Engine sleeps at the galactic core. The Guardians do not sleep. The Vorax do not stop. Time is the enemy we all share.', source: 'Council of Resonances, Emergency Session' },
    { text: 'Your simulated victories shaped the galaxy you now face. An aggressive player wakes to a militarized galaxy. A diplomatic player wakes to trade routes and alliances.', source: 'Procedural Destiny \u2014 Ch. 3' }
  ],

  _prologueQuoteIndex: 0,
  _prologueQuoteTimer: null,

  buildGameDescription() {
    const q = this.PROLOGUE_QUOTES[0];
    return `
      <section class="dashboard-section prologue-section">
        <div class="section-label">The State of the Galaxy</div>
        <div class="section-heading">A Civilization in Ruins. A War on Two Fronts.</div>
        <div class="prologue-body">
          <p class="prologue-text">Tens of thousands of years ago, the <strong style="color:var(--guardians)">Aethyn</strong> \u2014 a psychically unified species whose civilization spanned thousands of galaxies \u2014 were besieged by the <strong style="color:var(--vorax)">Vorax</strong>, extragalactic predators drawn by their psychic signal. The Vorax cut the warp lanes, sealing the galaxy. After centuries of losing war, the entire species voted to activate the <strong>Reclamation Engine</strong> \u2014 a weapon that shattered the Aethyn into scattered seeds across the galaxy and purged the Vorax completely. One wave. One moment. Everything changed.</p>
          <p class="prologue-text">Five civilizations rose from the wreckage, each believing they are indigenous to their homeworld. The <strong style="color:var(--terran)">Terran League</strong> \u2014 Engineer Caste descendants who got almost nothing and rebuilt through sheer stubborn refusal to stay broken. The <strong style="color:var(--shards)">Eternal Shards</strong> \u2014 Scholar Caste descendants who retained the strongest psychic connection to the old resonance, now a dying species fighting extinction. The <strong style="color:var(--horde)">Scrap-Horde</strong> \u2014 Warrior Caste descendants dumped in hostile space, surviving through aggression and an instinct for violence that runs deeper than memory. The <strong style="color:var(--necro)">Necro-Legion</strong> \u2014 not from any specific caste, but adopted by intact Aethyn AI infrastructure that recognized descendant DNA and began rebuilding. The <strong style="color:var(--accord)">Unity Accord</strong> \u2014 Shepherd Caste descendants whose instinct for unity persisted even when the memory of unity did not.</p>
          <p class="prologue-text">Now the <strong style="color:var(--vorax)">Vorax have returned</strong> at the galactic rim \u2014 consuming civilizations and evolving their technology into new biological weapons. At the galactic core, the <strong style="color:var(--guardians)">Core Guardians</strong> \u2014 sentient AI constructs left by the Aethyn \u2014 guard the Reclamation Engine with lethal force. Energy weapons heal them. Their deaths chain-react into cascading explosions. They will destroy anyone who approaches.</p>
          <p class="prologue-text">You are a weapon \u2014 a freshly decanted clone, or something stranger \u2014 created to win a war that already destroyed a civilization once. Prove your genius in simulation. When judged ready, wake into the real galaxy. Your simulated victories shaped the galaxy you now face. If you die here, it is permanent.</p>
        </div>
        <div class="prologue-quote-block" id="prologue-quote-block">
          <div class="prologue-quote-text" id="prologue-quote-text">\u201C${q.text}\u201D</div>
          <div class="prologue-quote-source" id="prologue-quote-source">\u2014 ${q.source}</div>
        </div>
        <div class="divider"></div>
      </section>`;
  },

  /* â"€â"€ Strategist Quote â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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

  /* â"€â"€ By The Numbers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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

  /* â"€â"€ REMOVED: Old CSS/SVG Renderers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
     buildGalaxyOverview(), buildSolarSystem(), buildTerritoryMap()
     Replaced by Canvas/Three.js/SVG-asset equivalents:
       - canvas-galaxy.js (Canvas 2D)
       - solar-system.js (Three.js)
       - assets/territory-map.svg (hand-crafted SVG asset)
     See buildCanvasGalaxyContainer(), buildCanvasSolarContainer(),
     buildCanvasTerritoryContainer() below.
     Removed: commit DEADCODE_CLEANUP
     â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /* ── Core Loop (Five Phases) ─────────────────────────── */

  /**
   * Build the Five-Phase Core Loop gameplay cards.
   * Each phase shows name, description, and faction-colored accent.
   * @returns {string} HTML string
   */
  buildCoreLoop() {
    return `
      <section class="dashboard-section">
        <div class="section-label">Core Loop</div>
        <div class="section-heading">Five-Phase Gameplay</div>
        <div class="phase-loop">

          <div class="phase-block" style="background:linear-gradient(180deg,rgba(0,180,255,0.08),transparent);border-top:2px solid rgba(0,180,255,0.5)">
            <div class="phase-num" style="color:var(--terran)">PHASE 1</div>
            <div class="phase-name">MAP</div>
            <div class="phase-tagline">The Game's Home State</div>
            <div class="phase-desc">Macro strategy layer. Build infrastructure, expand territory, manage resources, and move fleets across the galaxy. Paradox-style pause with 4 speed settings.</div>
            <div class="phase-details">
              <div class="phase-detail-item"><span class="phase-detail-label">Turns</span><span class="phase-detail-value">Simultaneous - all factions act at once</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Bottleneck</span><span class="phase-detail-value">General count limits concurrent operations</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Speed</span><span class="phase-detail-value">1\u00D7, 2\u00D7, 4\u00D7, Pause</span></div>
            </div>
            <a href="#ch2" class="phase-link">Ch. 2 \u2014 Five-Phase Loop \u203A</a>
            <span class="phase-arrow">\u203A</span>
          </div>

          <div class="phase-block" style="background:linear-gradient(180deg,rgba(0,255,238,0.08),transparent);border-top:2px solid rgba(0,255,238,0.5)">
            <div class="phase-num" style="color:var(--shards)">PHASE 2</div>
            <div class="phase-name">ARMADA</div>
            <div class="phase-tagline">Fleet Logistics Sub-Mode</div>
            <div class="phase-desc">Assemble your invasion force. Load troops, customize equipment loadouts, and assign commanders. Overlays directly on the Map Phase UI.</div>
            <div class="phase-details">
              <div class="phase-detail-item"><span class="phase-detail-label">Starting Fleet</span><span class="phase-detail-value">2\u00D7 Frigates (MVP, persistent full run)</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Ship Death</span><span class="phase-detail-value">Permanent \u2014 spliced from array, gone forever</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">HP Restore</span><span class="phase-detail-value">NO \u2014 HP not restored between battles</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Requires</span><span class="phase-detail-value">Logistics Hub for Armada access</span></div>
            </div>
            <a href="#ch20" class="phase-link">Ch. 20 \u2014 Equipment System \u203A</a>
            <span class="phase-arrow">\u203A</span>
          </div>

          <div class="phase-block" style="background:linear-gradient(180deg,rgba(255,170,34,0.08),transparent);border-top:2px solid rgba(255,170,34,0.5)">
            <div class="phase-num" style="color:var(--accord)">PHASE 3</div>
            <div class="phase-name">APPROACH</div>
            <div class="phase-tagline">The Decision Point</div>
            <div class="phase-desc">Fleet arrives at target system. Choose your strategy: Espionage (gather intel), Diplomacy (negotiate), or War (direct assault). Every choice has resource costs and trade-offs.</div>
            <div class="phase-details">
              <div class="phase-detail-item"><span class="phase-detail-label">Espionage</span><span class="phase-detail-value">Deep Recon (free) or + Sabotage (4 Intel, 60% success)</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Diplomacy</span><span class="phase-detail-value">Ceasefire (3 Influence) or Trade (5 Influence)</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">War</span><span class="phase-detail-value">With Intel (Vanguard +1) or Blind (Vanguard +2, risky)</span></div>
            </div>
            <a href="#ch24" class="phase-link">Ch. 24 \u2014 Espionage & Intelligence \u203A</a>
            <span class="phase-arrow">\u203A</span>
          </div>

          <div class="phase-block" style="background:linear-gradient(180deg,rgba(255,102,34,0.08),transparent);border-top:2px solid rgba(255,102,34,0.5)">
            <div class="phase-num" style="color:var(--horde)">PHASE 4</div>
            <div class="phase-name">SPACE COMBAT</div>
            <div class="phase-tagline">Auto-Battle in the Void</div>
            <div class="phase-desc">Fleet formations engage in automated space combat. Spend Command Points on tactical abilities. Outcome directly modifies the ground invasion that follows.</div>
            <div class="phase-details">
              <div class="phase-detail-item"><span class="phase-detail-label">Engine</span><span class="phase-detail-value">Auto-battle with CP ability interjections</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Duration</span><span class="phase-detail-value">5\u201325 minutes per battle</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Defenders</span><span class="phase-detail-value">Neutral: 2 Raiders | AI: 2R+1G | Guardian: 2G+1D</span></div>
            </div>
            <a href="#ch18" class="phase-link">Ch. 18 \u2014 Space Combat \u203A</a>
            <span class="phase-arrow">\u203A</span>
          </div>

          <div class="phase-block" style="background:linear-gradient(180deg,rgba(255,34,102,0.08),transparent);border-top:2px solid rgba(255,34,102,0.5)">
            <div class="phase-num" style="color:var(--vorax)">PHASE 5</div>
            <div class="phase-name">GROUND COMBAT</div>
            <div class="phase-tagline">Territory Conquest</div>
            <div class="phase-desc">Boots on the ground. Deploy units with cover systems, manage reserves, and conquer territory zones. Space combat outcome modifies starting conditions.</div>
            <div class="phase-details">
              <div class="phase-detail-item"><span class="phase-detail-label">Default Units</span><span class="phase-detail-value">6 per side</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Systems</span><span class="phase-detail-value">Cover, Deployment, Reserves, Garrison</span></div>
              <div class="phase-detail-item"><span class="phase-detail-label">Resolution</span><span class="phase-detail-value">Territory changes, casualties tallied, XP awarded</span></div>
            </div>
            <a href="#ch19" class="phase-link">Ch. 19 \u2014 Ground Combat \u203A</a>
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
          <div style="font-family:'JetBrains Mono',monospace;font-size:1rem;letter-spacing:2px;color:var(--text-hi);margin-top:8px">MAP → ARMADA → APPROACH → SPACE → GROUND → REPEAT</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;letter-spacing:2px;color:var(--text-dim);margin-top:6px">VICTORY OR DEATH → NEW SIMULATION RUN</div>
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
   * @param {Object} emblems - Faction key â†' SVG inner-content string map
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

  /* â"€â"€ Stat Bar Helper â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /**
   * Build a single horizontal stat bar (used for power-curve display).
   * @param {string} label - Bar label (e.g. 'Early', 'Mid', 'Late')
   * @param {number} value - Percentage value (0â€"100)
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

  /* â"€â"€ Game Systems Grid â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /**
   * Build the Game Systems Quick Navigation grid â€" 12 clickable cards.
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

  /* â"€â"€ Document Structure â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

  /**
   * Build the Document Structure section â€" 4-column breakdown.
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

  /* â"€â"€ Five Differentiators â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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

  /* â"€â"€ Summary Statistics â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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

  /* â"€â"€ Footer â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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

  /* â"€â"€ Interactive Behaviors â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

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
        if (currentSource) currentSource.textContent = `\u2014 ${q.source}`;

        /* Fade back in */
        const currentQuote = document.getElementById('hero-lore-quote');
        if (currentQuote) currentQuote.classList.remove('quote-fading');
      }, 500);
    }, 6000);
  },

  /**
   * Start the epigraph quote cycling animation.
   * Fades out, swaps text, fades back in every 7 seconds.
   * @returns {void}
   */
  initEpigraphQuoteCycler() {
    if (this._epigraphQuoteTimer) clearInterval(this._epigraphQuoteTimer);

    const textEl = document.getElementById('epigraph-quote-text');
    const sourceEl = document.getElementById('epigraph-quote-source');
    if (!textEl || !sourceEl) return;

    this._epigraphQuoteIndex = 0;

    this._epigraphQuoteTimer = setInterval(() => {
      const block = document.getElementById('epigraph-quote-block');
      if (!block) { clearInterval(this._epigraphQuoteTimer); return; }

      block.classList.add('epigraph-quote-fading');

      setTimeout(() => {
        this._epigraphQuoteIndex = (this._epigraphQuoteIndex + 1) % this.EPIGRAPH_QUOTES.length;
        const q = this.EPIGRAPH_QUOTES[this._epigraphQuoteIndex];
        const t = document.getElementById('epigraph-quote-text');
        const s = document.getElementById('epigraph-quote-source');
        if (t) t.textContent = `\u201C${q.text}\u201D`;
        if (s) s.textContent = `\u2014 ${q.source}`;

        const b = document.getElementById('epigraph-quote-block');
        if (b) b.classList.remove('epigraph-quote-fading');
      }, 500);
    }, 7000);
  },

  /**
   * Start the prologue quote cycling animation.
   * Fades out, swaps text, fades back in every 8 seconds.
   * @returns {void}
   */
  initPrologueQuoteCycler() {
    if (this._prologueQuoteTimer) clearInterval(this._prologueQuoteTimer);

    const textEl = document.getElementById('prologue-quote-text');
    const sourceEl = document.getElementById('prologue-quote-source');
    if (!textEl || !sourceEl) return;

    this._prologueQuoteIndex = 0;

    this._prologueQuoteTimer = setInterval(() => {
      const block = document.getElementById('prologue-quote-block');
      if (!block) { clearInterval(this._prologueQuoteTimer); return; }

      block.classList.add('prologue-quote-fading');

      setTimeout(() => {
        this._prologueQuoteIndex = (this._prologueQuoteIndex + 1) % this.PROLOGUE_QUOTES.length;
        const q = this.PROLOGUE_QUOTES[this._prologueQuoteIndex];
        const t = document.getElementById('prologue-quote-text');
        const s = document.getElementById('prologue-quote-source');
        if (t) t.textContent = `\u201C${q.text}\u201D`;
        if (s) s.textContent = `\u2014 ${q.source}`;

        const b = document.getElementById('prologue-quote-block');
        if (b) b.classList.remove('prologue-quote-fading');
      }, 500);
    }, 8000);
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
        /* Subtle vertical shift â€" max Â±8px */
        const shift = (progress - 0.5) * 16;
        card.style.transform = `translateY(${shift.toFixed(1)}px)`;
      });
    };

    window.addEventListener('scroll', updateParallax, { passive: true });
    /* Initial position */
    updateParallax();
  },

  /**
   * Sync the PWA install button state after dashboard renders.
   * The beforeinstallprompt event may have fired before the button existed.
   */
  _syncInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      btn.disabled = true;
      btn.textContent = 'Installed';
    } else if (window._pwaInstallReady && window._pwaInstallPrompt) {
      btn.disabled = false;
      btn.textContent = 'Install App';
    }
  },

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     CANVAS RENDERER CONTAINERS + INITIALIZATION
     â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  /** Container for Canvas galaxy map */
  buildCanvasGalaxyContainer() {
    return `
      <section class="galaxy-section">
        <div class="section-label">Galactic Overview</div>
        <div class="section-heading">Galactic Map</div>
        <div id="canvas-galaxy-mount" style="display:flex;justify-content:center;padding:20px 0;min-height:min(900px,100vw)"></div>
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
    /* â"€â"€ Galaxy (Canvas 2D) â"€â"€ */
    const galaxyMount = document.getElementById('canvas-galaxy-mount');
    if (galaxyMount && typeof GalaxyRenderer !== 'undefined') {
      try {
        this._galaxyRenderer = new GalaxyRenderer(galaxyMount);
        this._galaxyRenderer.start();
      } catch (e) { console.warn('[Dashboard] Galaxy renderer failed:', e); }
    }

    /* â"€â"€ Solar System (Three.js) â"€â"€ */
    const solarMount = document.getElementById('canvas-solar-mount');
    if (solarMount && typeof SolarSystemRenderer !== 'undefined') {
      try {
        this._solarRenderer = new SolarSystemRenderer(solarMount);
        this._solarRenderer.start();
      } catch (e) { console.warn('[Dashboard] Solar system renderer failed:', e); }
    }

    /* â"€â"€ Territory Map â€" uses hand-crafted SVG asset (assets/territory-map.svg) â"€â"€
       No Canvas renderer needed; loaded via <object> tag in buildCanvasTerritoryContainer() */
  }
};
