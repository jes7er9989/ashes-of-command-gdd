/* ═══════════════════════════════════════════════════════════
   CANVAS GALAXY — HTML5 Canvas Galactic Map Renderer
   ───────────────────────────────────────────────────────────
   Replaces the CSS box-shadow galaxy with a full 60fps
   Canvas-rendered galaxy featuring spiral arms, twinkling
   stars, nebula clouds, comets, rogue planets, dust lanes,
   a pulsing galactic core with lens flare, and interactive
   faction homeworld markers.

   Key exports:
     GalaxyRenderer  (class) → window.GalaxyRenderer

   Dependencies:
     - Browser Canvas 2D API
     - DashboardRenderer.HOMEWORLD_POSITIONS (read at init)

   Created: 2026-03-28 | Modified: 2026-03-28
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   constructor(container, opts)     | Create renderer, generate data
   _initCanvas()                    | Create and size <canvas> element
   _generateStars()                 | Build spiral arm + halo star arrays
   _generateNebulae()               | Build nebula cloud data
   _generateComets()                | Build comet position/velocity data
   _generateRoguePlanets()          | Build rogue planet orbit data
   _generateDustLanes()             | Build dark dust arc data
   _loadHomeworlds(factions)        | Import faction positions + colors
   _gaussRandom()                   | Box-Muller gaussian random number
   _seededRandom(seed)              | Deterministic pseudo-random [0,1)
   start()                          | Begin requestAnimationFrame loop
   stop()                           | Cancel animation loop
   _tick(timestamp)                 | Main render loop (called per frame)
   _clear()                         | Clear canvas to black
   _drawDustLanes(rotation)         | Render dark arcs between arms
   _drawNebulae(rotation)           | Render soft gradient clouds
   _drawStars(rotation, time)       | Render all stars with twinkle
   _drawCore(time)                  | Render galactic core + lens flare
   _drawComets(dt)                  | Update + render comets with tails
   _drawRoguePlanets(time)          | Render drifting large dots
   _drawHomeworlds(time, rotation)  | Render faction markers + labels
   _handleMouseMove(e)              | Hit-test homeworlds for hover
   _handleClick(e)                  | Navigate on homeworld click
   _canvasCoords(e)                 | Convert mouse event to canvas space
   _rotatePoint(x, y, angle)        | Rotate point around canvas center
   destroy()                        | Tear down canvas and listeners
   ═══════════════════════════════════════════════════════════ */

class GalaxyRenderer {

  /* ── Constants ──────────────────────────────────────────── */

  static SIZE = 900;                           /* Canvas width & height in px             */
  static SIZE_MOBILE = 400;                    /* Canvas size on mobile (<768px)          */
  static CENTER = 450;                         /* Center coordinate (SIZE / 2)            */
  static NUM_ARMS = 4;                         /* Spiral arm count                        */
  static STARS_PER_ARM = 1000;                 /* Stars generated per arm                 */
  static STARS_PER_ARM_MOBILE = 375;           /* Reduced stars per arm on mobile         */
  static HALO_STARS = 1000;                    /* Background halo stars                   */
  static HALO_STARS_MOBILE = 250;              /* Reduced halo stars on mobile            */
  static ROTATION_PERIOD = 90;                 /* Seconds per full revolution             */
  static NEBULA_COUNT = 10;                    /* Number of nebula patches                */
  static COMET_COUNT = 5;                      /* Number of active comets                 */
  static ROGUE_COUNT = 6;                      /* Number of rogue planets                 */
  static DUST_LANE_COUNT = 8;                  /* Number of dark dust arcs                */
  static CORE_RADIUS = 80;                     /* Galactic core glow radius in px         */
  static HOMEWORLD_SCALE = 900 / 600;          /* Scale factor: 600-space → 900-space     */
  static RESIZE_DEBOUNCE_MS = 250;             /* Debounce delay for window resize        */
  static CLICK_RADIUS = 20;                    /* Hit-test radius for homeworld clicks    */

  /* Star color palette — [r, g, b] */
  static STAR_COLORS = [
    [220, 235, 255],                           /* Blue-white — hot young stars            */
    [255, 255, 240],                           /* Warm white — main-sequence              */
    [255, 240, 200],                           /* Yellow — solar-type                     */
    [255, 200, 160],                           /* Orange — K-type giants                  */
    [255, 170, 140],                           /* Orange-red — cool dwarfs                */
  ];

  /* Nebula color palette — rgba strings */
  static NEBULA_COLORS = [
    '0,140,255',                               /* Deep blue                               */
    '160,60,255',                              /* Violet                                  */
    '0,200,180',                               /* Teal                                    */
    '0,100,220',                               /* Royal blue                              */
    '120,40,220',                              /* Purple                                  */
    '0,180,200',                               /* Cyan                                    */
    '80,120,255',                              /* Periwinkle                              */
    '140,0,200',                               /* Magenta-purple                          */
    '0,160,255',                               /* Sky blue                                */
    '200,80,180',                              /* Pink                                    */
  ];

  /* Faction fallback colors (hex) — used if factions array not provided */
  static FACTION_DEFAULTS = {
    terran:    { color: '#00b4ff', name: 'TERRAN LEAGUE',   chapterId: 'ch5'  },
    shards:    { color: '#00ffee', name: 'ETERNAL SHARDS',  chapterId: 'ch6'  },
    horde:     { color: '#ff6622', name: 'SCRAP-HORDE',     chapterId: 'ch7'  },
    revenant:  { color: '#AA77FF', name: 'THE REVENANT',     chapterId: 'ch8'  },
    accord:    { color: '#44ff66', name: 'UNITY ACCORD',    chapterId: 'ch9'  },
    vorax:     { color: '#ff2266', name: 'VORAX SWARM',     chapterId: 'ch10' },
    guardians: { color: '#ffaa22', name: 'GUARDIANS',       chapterId: 'ch11' },
  };

  /* ── Constructor ────────────────────────────────────────── */

  /**
   * Create a new GalaxyRenderer.
   * Generates all star/nebula/comet data once, then waits for start().
   * @param {HTMLElement} container - DOM element to append canvas into
   * @param {Object} [opts]        - Optional overrides
   * @param {Array}  [opts.factions] - Faction objects with key, name, color, chapterId
   * @param {Object} [opts.homeworldPositions] - Override for HOMEWORLD_POSITIONS
   * @param {Object} [opts.territoryCounts]    - Override for TERRITORY_COUNTS
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.rafId = null;
    this.running = false;
    this.lastTimestamp = 0;
    this.elapsedTime = 0;
    this.hoveredHomeworld = null;
    this._resizeTimer = null;
    this._isMobile = window.innerWidth < 768;
    this._prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._lastFrameTime = 0;

    /* Seed counter for deterministic pseudo-random generation */
    this._seed = 42;

    /* Pull homeworld data from Dashboard if available, else use opts/defaults */
    this.homeworldPositions = opts.homeworldPositions
      || (typeof Dashboard !== 'undefined' ? Dashboard.HOMEWORLD_POSITIONS : null)
      || {
        terran:    { x: 310, y: 220 },
        shards:    { x: 460, y: 160 },
        horde:     { x: 180, y: 350 },
        revenant:  { x: 420, y: 380 },
        accord:    { x: 240, y: 150 },
        vorax:     { x: 130, y: 470 },
        guardians: { x: 300, y: 300 },
      };

    this.territoryCounts = opts.territoryCounts
      || (typeof Dashboard !== 'undefined' ? Dashboard.TERRITORY_COUNTS : null)
      || { terran: 32, guardians: 35, shards: 18, accord: 24, horde: 19, vorax: 28, revenant: 14 };

    /* ── Pre-generate all visual data ── */
    this.armStars = [];
    this.haloStars = [];
    this.nebulae = [];
    this.comets = [];
    this.roguePlanets = [];
    this.dustLanes = [];
    this.homeworlds = [];

    this._boundTick = this._tick.bind(this);

    this._initCanvas();
    this._generateStars();
    this._generateNebulae();
    this._generateComets();
    this._generateRoguePlanets();
    this._generateDustLanes();
    this._loadHomeworlds(opts.factions || null);

    /* ── Bind event listeners ── */
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundClick = this._handleClick.bind(this);
    this._boundResize = this._handleResize.bind(this);
    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('click', this._boundClick);
    window.addEventListener('resize', this._boundResize);
  }

  /* ── Canvas Setup ───────────────────────────────────────── */

  /**
   * Create the <canvas> element, set its size, and append it to the container.
   * Uses a 2x backing store for retina sharpness if devicePixelRatio > 1.
   */
  _initCanvas() {
    const S = this._isMobile ? GalaxyRenderer.SIZE_MOBILE : GalaxyRenderer.SIZE;
    this._currentSize = S;
    this._currentCenter = S / 2;
    this.canvas = document.createElement('canvas');
    this.canvas.width = S;
    this.canvas.height = S;
    this.canvas.style.width = '100%';
    this.canvas.style.maxWidth = S + 'px';
    this.canvas.style.aspectRatio = '1';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.borderRadius = '50%';
    this.canvas.style.cursor = 'default';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
  }

  /* ── Pseudo-Random Utilities ────────────────────────────── */

  /**
   * Deterministic pseudo-random number in [0, 1).
   * Uses mulberry32 for reproducible star placement across sessions.
   * @returns {number}
   */
  _seededRandom() {
    this._seed = (this._seed + 0x6D2B79F5) | 0;
    let t = Math.imul(this._seed ^ (this._seed >>> 15), 1 | this._seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Box-Muller transform — returns a gaussian-distributed random number.
   * Mean 0, standard deviation 1. Uses seeded random for reproducibility.
   * @returns {number}
   */
  _gaussRandom() {
    const u1 = this._seededRandom();
    const u2 = this._seededRandom();
    /* Clamp u1 away from 0 to avoid -Infinity from log(0) */
    const safeU1 = Math.max(u1, 1e-10);
    return Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION: Data Generation (run once at construction)
     ═══════════════════════════════════════════════════════════ */

  /**
   * Generate all star data: 4 spiral arms + halo background.
   * Each star: { x, y, brightness, size, r, g, b, twinklePhase, twinkleSpeed }
   * Stars are stored in canvas-center-relative coordinates (before rotation).
   */
  _generateStars() {
    const CX = this._currentCenter;
    const CY = this._currentCenter;
    const S = this._currentSize;
    const ARMS = GalaxyRenderer.NUM_ARMS;
    const PER_ARM = this._isMobile ? GalaxyRenderer.STARS_PER_ARM_MOBILE : GalaxyRenderer.STARS_PER_ARM;
    const COLORS = GalaxyRenderer.STAR_COLORS;
    const scale = S / GalaxyRenderer.SIZE;

    /* ── Spiral arm stars ── */
    for (let arm = 0; arm < ARMS; arm++) {
      const baseAngle = (arm * Math.PI * 2) / ARMS;

      for (let i = 0; i < PER_ARM; i++) {
        const t = i / PER_ARM;

        /* Logarithmic spiral: r = a * e^(b*theta) */
        const theta = baseAngle + t * Math.PI * 2.8;
        const radius = (12 + t * 340) * scale;

        /* Gaussian scatter for arm width — wider at outer edges */
        const armWidth = (6 + t * 45) * scale;
        const scatterX = this._gaussRandom() * armWidth;
        const scatterY = this._gaussRandom() * armWidth;

        const x = CX + Math.cos(theta) * radius + scatterX;
        const y = CY + Math.sin(theta) * radius + scatterY;

        /* Brightness: brighter near core, dimmer at edges */
        const baseBright = t < 0.2 ? 0.8 : (t < 0.5 ? 0.55 : 0.3);
        const brightness = baseBright + this._seededRandom() * 0.35;

        /* Size: larger near core, smaller at edges */
        const baseSize = t < 0.2 ? 2.0 : (t < 0.5 ? 1.5 : 0.8);
        const size = baseSize + this._seededRandom() * 0.8;

        /* Color: pick from palette with slight per-star variation */
        const colorIdx = Math.floor(this._seededRandom() * COLORS.length);
        const sc = COLORS[colorIdx];
        const r = Math.min(255, sc[0] + Math.floor((this._seededRandom() - 0.5) * 30));
        const g = Math.min(255, sc[1] + Math.floor((this._seededRandom() - 0.5) * 25));
        const b = Math.min(255, sc[2] + Math.floor((this._seededRandom() - 0.5) * 20));

        /* Twinkle: each star oscillates at its own phase and speed */
        const twinklePhase = this._seededRandom() * Math.PI * 2;
        const twinkleSpeed = 0.5 + this._seededRandom() * 2.5;

        this.armStars.push({ x, y, brightness, size, r, g, b, twinklePhase, twinkleSpeed });
      }
    }

    /* ── Galactic halo — scattered background stars ── */
    const HALO = this._isMobile ? GalaxyRenderer.HALO_STARS_MOBILE : GalaxyRenderer.HALO_STARS;
    for (let i = 0; i < HALO; i++) {
      /* Uniform distribution across the full canvas */
      const x = this._seededRandom() * S;
      const y = this._seededRandom() * S;

      /* Fainter and smaller than arm stars */
      const brightness = 0.08 + this._seededRandom() * 0.25;
      const size = 0.3 + this._seededRandom() * 0.9;

      const colorIdx = Math.floor(this._seededRandom() * COLORS.length);
      const sc = COLORS[colorIdx];
      const r = sc[0];
      const g = sc[1];
      const b = sc[2];

      const twinklePhase = this._seededRandom() * Math.PI * 2;
      const twinkleSpeed = 0.3 + this._seededRandom() * 1.5;

      this.haloStars.push({ x, y, brightness, size, r, g, b, twinklePhase, twinkleSpeed });
    }
  }

  /**
   * Generate nebula cloud data: 10 patches along spiral arms.
   * Each nebula: { x, y, radiusX, radiusY, rotation, color, opacity }
   */
  _generateNebulae() {
    const CX = this._currentCenter;
    const CY = this._currentCenter;
    const scale = this._currentSize / GalaxyRenderer.SIZE;
    const COLORS = GalaxyRenderer.NEBULA_COLORS;
    const COUNT = GalaxyRenderer.NEBULA_COUNT;

    for (let i = 0; i < COUNT; i++) {
      /* Place nebulae along spiral arm paths */
      const arm = i % GalaxyRenderer.NUM_ARMS;
      const baseAngle = (arm * Math.PI * 2) / GalaxyRenderer.NUM_ARMS;
      const t = 0.2 + (i / COUNT) * 0.6;
      const theta = baseAngle + t * Math.PI * 2.8;
      const radius = (12 + t * 340) * scale;

      const x = CX + Math.cos(theta) * radius + (this._seededRandom() - 0.5) * 60 * scale;
      const y = CY + Math.sin(theta) * radius + (this._seededRandom() - 0.5) * 60 * scale;

      const radiusX = (60 + this._seededRandom() * 100) * scale;
      const radiusY = (30 + this._seededRandom() * 50) * scale;
      const rotation = this._seededRandom() * Math.PI * 2;
      const color = COLORS[i % COLORS.length];
      const opacity = 0.04 + this._seededRandom() * 0.06;

      this.nebulae.push({ x, y, radiusX, radiusY, rotation, color, opacity });
    }
  }

  /**
   * Generate comet data: 5 comets with position, velocity, tail length.
   * Each comet: { x, y, vx, vy, tailLength, brightness, hue }
   */
  _generateComets() {
    const S = this._currentSize;
    const COUNT = GalaxyRenderer.COMET_COUNT;

    for (let i = 0; i < COUNT; i++) {
      /* Start from random edge positions */
      const edge = Math.floor(this._seededRandom() * 4);
      let x, y;
      if (edge === 0) { x = this._seededRandom() * S; y = -20; }         /* top    */
      else if (edge === 1) { x = S + 20; y = this._seededRandom() * S; } /* right  */
      else if (edge === 2) { x = this._seededRandom() * S; y = S + 20; } /* bottom */
      else { x = -20; y = this._seededRandom() * S; }                     /* left   */

      /* Velocity aimed roughly toward center with some spread */
      const toCenterX = this._currentCenter - x;
      const toCenterY = this._currentCenter - y;
      const dist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
      const speed = 40 + this._seededRandom() * 80;
      const spreadAngle = (this._seededRandom() - 0.5) * 1.2;
      const baseAngle = Math.atan2(toCenterY, toCenterX) + spreadAngle;

      this.comets.push({
        x, y,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        tailLength: 30 + this._seededRandom() * 60,
        brightness: 0.6 + this._seededRandom() * 0.4,
        hue: 180 + Math.floor(this._seededRandom() * 60),  /* cyan to blue range */
      });
    }
  }

  /**
   * Generate rogue planet data: 6 large dots on independent orbits.
   * Each: { angle, orbitRadius, orbitCenterX, orbitCenterY, speed, size, r, g, b }
   */
  _generateRoguePlanets() {
    const CX = this._currentCenter;
    const CY = this._currentCenter;
    const scale = this._currentSize / GalaxyRenderer.SIZE;
    const COUNT = GalaxyRenderer.ROGUE_COUNT;

    /* Muted, dark colors for rogue planets */
    const rogueColors = [
      [107, 48, 48],                           /* Dark red                                */
      [90, 74, 50],                            /* Brown                                   */
      [74, 74, 74],                            /* Dark grey                               */
      [122, 53, 53],                           /* Rust                                    */
      [92, 80, 64],                            /* Tan-brown                               */
      [60, 70, 85],                            /* Steel blue                              */
    ];

    for (let i = 0; i < COUNT; i++) {
      const angle = this._seededRandom() * Math.PI * 2;
      const orbitRadius = (80 + this._seededRandom() * 250) * scale;
      /* Offset orbit centers from galaxy center for elliptical paths */
      const orbitCenterX = CX + (this._seededRandom() - 0.5) * 100 * scale;
      const orbitCenterY = CY + (this._seededRandom() - 0.5) * 100 * scale;
      /* Speed: one orbit every 30–90 seconds */
      const speed = (Math.PI * 2) / (30 + this._seededRandom() * 60);
      const size = 3 + this._seededRandom() * 2;
      const c = rogueColors[i % rogueColors.length];

      this.roguePlanets.push({
        angle, orbitRadius, orbitCenterX, orbitCenterY,
        speed, size,
        r: c[0], g: c[1], b: c[2],
      });
    }
  }

  /**
   * Generate dust lane data: 8 dark semi-transparent arcs between spiral arms.
   * Each: { x, y, radiusX, radiusY, rotation, opacity }
   */
  _generateDustLanes() {
    const CX = this._currentCenter;
    const CY = this._currentCenter;
    const scale = this._currentSize / GalaxyRenderer.SIZE;
    const COUNT = GalaxyRenderer.DUST_LANE_COUNT;

    for (let i = 0; i < COUNT; i++) {
      /* Place dust lanes between spiral arms — offset by half an arm spacing */
      const armSpacing = (Math.PI * 2) / GalaxyRenderer.NUM_ARMS;
      const baseAngle = (i / COUNT) * Math.PI * 2 + armSpacing * 0.5;
      const t = 0.25 + (i / COUNT) * 0.5;
      const radius = (50 + t * 250) * scale;

      const x = CX + Math.cos(baseAngle) * radius;
      const y = CY + Math.sin(baseAngle) * radius;
      const radiusX = (80 + this._seededRandom() * 80) * scale;
      const radiusY = (15 + this._seededRandom() * 20) * scale;
      const rotation = baseAngle + (this._seededRandom() - 0.5) * 0.5;
      const opacity = 0.15 + this._seededRandom() * 0.15;

      this.dustLanes.push({ x, y, radiusX, radiusY, rotation, opacity });
    }
  }

  /**
   * Load homeworld data from factions array or fallback defaults.
   * Scales 600-space positions to 900-space canvas coordinates.
   * @param {Array|null} factions - Faction objects, or null for defaults
   */
  _loadHomeworlds(factions) {
    const SCALE = this._currentSize / 600;
    const defaults = GalaxyRenderer.FACTION_DEFAULTS;
    const keys = Object.keys(this.homeworldPositions);

    for (const key of keys) {
      const pos = this.homeworldPositions[key];
      const x = pos.x * SCALE;
      const y = pos.y * SCALE;

      /* Try to find this faction in the provided array */
      let factionData = null;
      if (factions) {
        factionData = factions.find(f => f.key === key);
      }

      const color = factionData ? factionData.color : (defaults[key] ? defaults[key].color : '#ffffff');
      const name = factionData ? factionData.name.toUpperCase() : (defaults[key] ? defaults[key].name : key.toUpperCase());
      const chapterId = factionData ? factionData.chapterId : (defaults[key] ? defaults[key].chapterId : '');
      const systemCount = this.territoryCounts[key] || 0;

      this.homeworlds.push({ key, x, y, color, name, chapterId, systemCount });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION: Animation Loop
     ═══════════════════════════════════════════════════════════ */

  /**
   * Start the render loop. Begins requestAnimationFrame cycle.
   */
  start() {
    if (this.running) return;  /* Already running — no-op */
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this._boundTick);
  }

  /**
   * Stop the render loop. Cancels any pending animation frame.
   */
  stop() {
    if (!this.running) return;  /* Already stopped — no-op */
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Main render tick — called every frame by requestAnimationFrame.
   * Computes delta time, updates elapsed time, then draws all layers
   * in correct z-order (back to front).
   * @param {number} timestamp - DOMHighResTimeStamp from rAF
   */
  _tick(timestamp) {
    if (!this.running) return;  /* Stopped between frames — bail */

    /* Reduced motion: throttle to ~15fps */
    if (this._prefersReducedMotion) {
      if (timestamp - this._lastFrameTime < 66) {
        this.rafId = requestAnimationFrame(this._boundTick);
        return;
      }
      this._lastFrameTime = timestamp;
    }

    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;
    this.elapsedTime += dt;

    /* Galaxy rotation angle — one full revolution per ROTATION_PERIOD */
    const rotation = (this.elapsedTime / GalaxyRenderer.ROTATION_PERIOD) * Math.PI * 2;

    this._clear();
    this._drawDustLanes(rotation);
    this._drawNebulae(rotation);
    this._drawStars(rotation, this.elapsedTime);
    this._drawCore(this.elapsedTime);
    this._drawComets(dt);
    this._drawRoguePlanets(this.elapsedTime);
    this._drawHomeworlds(this.elapsedTime, rotation);

    this.rafId = requestAnimationFrame(this._boundTick);
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION: Render Methods
     ═══════════════════════════════════════════════════════════ */

  /**
   * Clear the entire canvas to deep-space black.
   */
  _clear() {
    const ctx = this.ctx;
    const S = this._currentSize;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, S, S);
  }

  /**
   * Draw dark dust lanes between spiral arms.
   * Rotates with the galaxy. Renders as dark semi-transparent ellipses.
   * @param {number} rotation - Current galaxy rotation angle in radians
   */
  _drawDustLanes(rotation) {
    const ctx = this.ctx;
    const CX = this._currentCenter;
    const CY = this._currentCenter;

    for (const d of this.dustLanes) {
      /* Rotate dust lane center around galaxy center */
      const [rx, ry] = this._rotatePoint(d.x, d.y, rotation);

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(d.rotation + rotation);
      ctx.scale(d.radiusX / 50, d.radiusY / 50);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
      grad.addColorStop(0, `rgba(2,3,8,${d.opacity})`);
      grad.addColorStop(0.6, `rgba(2,3,8,${d.opacity * 0.5})`);
      grad.addColorStop(1, 'rgba(2,3,8,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Draw nebula clouds — large soft radial gradients in blues/purples/teals.
   * Rotates with the galaxy for coherent structure.
   * @param {number} rotation - Current galaxy rotation angle in radians
   */
  _drawNebulae(rotation) {
    const ctx = this.ctx;

    for (const n of this.nebulae) {
      const [rx, ry] = this._rotatePoint(n.x, n.y, rotation);

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(n.rotation + rotation);
      ctx.scale(n.radiusX / 60, n.radiusY / 60);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
      grad.addColorStop(0, `rgba(${n.color},${n.opacity})`);
      grad.addColorStop(0.4, `rgba(${n.color},${n.opacity * 0.5})`);
      grad.addColorStop(0.7, `rgba(${n.color},${n.opacity * 0.15})`);
      grad.addColorStop(1, `rgba(${n.color},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Draw all stars — spiral arm stars and halo background stars.
   * Arm stars rotate with the galaxy; halo stars are stationary.
   * Each star twinkles by oscillating brightness per frame.
   * @param {number} rotation - Current galaxy rotation angle in radians
   * @param {number} time     - Total elapsed time in seconds
   */
  _drawStars(rotation, time) {
    const ctx = this.ctx;

    /* ── Halo stars (stationary background) ── */
    for (const s of this.haloStars) {
      const twinkle = 0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.brightness * twinkle;

      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ── Spiral arm stars (rotate with galaxy) ── */
    for (const s of this.armStars) {
      const [rx, ry] = this._rotatePoint(s.x, s.y, rotation);

      /* Skip stars that rotated off-canvas for performance */
      if (rx < -5 || rx > this._currentSize + 5 || ry < -5 || ry > this._currentSize + 5) continue;

      const twinkle = 0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
      const alpha = Math.min(1, s.brightness * twinkle);

      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(rx, ry, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw the galactic core — bright radial gradient center with pulsing
   * glow and 4-ray lens flare effect.
   * @param {number} time - Total elapsed time in seconds
   */
  _drawCore(time) {
    const ctx = this.ctx;
    const CX = this._currentCenter;
    const CY = this._currentCenter;
    const R = GalaxyRenderer.CORE_RADIUS * (this._currentSize / GalaxyRenderer.SIZE);

    /* Pulse: subtle breathing between 0.85 and 1.0 */
    const pulse = 0.92 + 0.08 * Math.sin(time * 0.8);
    const coreR = R * pulse;

    /* ── Outer glow — large soft halo ── */
    const outerGlow = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR * 2.5);
    outerGlow.addColorStop(0, 'rgba(180,200,255,0.12)');
    outerGlow.addColorStop(0.3, 'rgba(100,140,255,0.06)');
    outerGlow.addColorStop(0.6, 'rgba(60,80,200,0.02)');
    outerGlow.addColorStop(1, 'rgba(30,40,120,0)');

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(CX, CY, coreR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    /* ── Main core gradient — white center to blue edge ── */
    const coreGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR);
    coreGrad.addColorStop(0, `rgba(255,255,255,${(0.95 * pulse).toFixed(2)})`);
    coreGrad.addColorStop(0.15, `rgba(230,240,255,${(0.7 * pulse).toFixed(2)})`);
    coreGrad.addColorStop(0.35, `rgba(140,180,255,${(0.4 * pulse).toFixed(2)})`);
    coreGrad.addColorStop(0.6, `rgba(60,100,220,${(0.15 * pulse).toFixed(2)})`);
    coreGrad.addColorStop(1, 'rgba(30,50,150,0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(CX, CY, coreR, 0, Math.PI * 2);
    ctx.fill();

    /* ── Lens flare — 4 thin bright lines extending from center ── */
    const flareLength = coreR * 2.2 * pulse;
    const flareAlpha = 0.25 * pulse;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4 + time * 0.05;  /* Slow rotation of flare */
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const grad = ctx.createLinearGradient(
        CX - cosA * flareLength, CY - sinA * flareLength,
        CX + cosA * flareLength, CY + sinA * flareLength
      );
      grad.addColorStop(0, 'rgba(140,180,255,0)');
      grad.addColorStop(0.35, `rgba(200,220,255,${(flareAlpha * 0.5).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${flareAlpha.toFixed(3)})`);
      grad.addColorStop(0.65, `rgba(200,220,255,${(flareAlpha * 0.5).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(140,180,255,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - cosA * flareLength, CY - sinA * flareLength);
      ctx.lineTo(CX + cosA * flareLength, CY + sinA * flareLength);
      ctx.stroke();
    }

    ctx.restore();

    /* ── Core hot spot — tiny bright white center ── */
    const hotGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 6);
    hotGrad.addColorStop(0, `rgba(255,255,255,${(0.98 * pulse).toFixed(2)})`);
    hotGrad.addColorStop(0.5, `rgba(255,255,255,${(0.5 * pulse).toFixed(2)})`);
    hotGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = hotGrad;
    ctx.beginPath();
    ctx.arc(CX, CY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Update comet positions and draw them with gradient tails.
   * Comets wrap around to a new random edge when they leave canvas bounds.
   * @param {number} dt - Delta time in seconds since last frame
   */
  _drawComets(dt) {
    const ctx = this.ctx;
    const S = this._currentSize;
    const MARGIN = 80;

    for (const c of this.comets) {
      /* ── Update position ── */
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      /* ── Wrap around if out of bounds ── */
      if (c.x < -MARGIN || c.x > S + MARGIN || c.y < -MARGIN || c.y > S + MARGIN) {
        /* Re-spawn from a random edge */
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { c.x = Math.random() * S; c.y = -20; }
        else if (edge === 1) { c.x = S + 20; c.y = Math.random() * S; }
        else if (edge === 2) { c.x = Math.random() * S; c.y = S + 20; }
        else { c.x = -20; c.y = Math.random() * S; }

        /* Aim roughly toward center */
        const toCenterAngle = Math.atan2(this._currentCenter - c.y, this._currentCenter - c.x);
        const spread = (Math.random() - 0.5) * 1.2;
        const speed = 40 + Math.random() * 80;
        c.vx = Math.cos(toCenterAngle + spread) * speed;
        c.vy = Math.sin(toCenterAngle + spread) * speed;
      }

      /* ── Compute tail direction (opposite to velocity) ── */
      const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      if (speed < 0.01) continue;  /* Avoid division by zero */
      const tailDirX = -c.vx / speed;
      const tailDirY = -c.vy / speed;
      const tailEndX = c.x + tailDirX * c.tailLength;
      const tailEndY = c.y + tailDirY * c.tailLength;

      /* ── Draw tail gradient ── */
      const tailGrad = ctx.createLinearGradient(c.x, c.y, tailEndX, tailEndY);
      tailGrad.addColorStop(0, `hsla(${c.hue},80%,80%,${c.brightness.toFixed(2)})`);
      tailGrad.addColorStop(0.3, `hsla(${c.hue},70%,70%,${(c.brightness * 0.4).toFixed(2)})`);
      tailGrad.addColorStop(1, `hsla(${c.hue},60%,60%,0)`);

      ctx.save();
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tailEndX, tailEndY);
      ctx.stroke();
      ctx.restore();

      /* ── Draw bright comet head ── */
      const headGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 4);
      headGrad.addColorStop(0, `hsla(${c.hue},90%,95%,${c.brightness.toFixed(2)})`);
      headGrad.addColorStop(0.5, `hsla(${c.hue},80%,80%,${(c.brightness * 0.6).toFixed(2)})`);
      headGrad.addColorStop(1, `hsla(${c.hue},70%,60%,0)`);

      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw rogue planets — larger dots on independent slow orbits.
   * Not tied to galaxy rotation — they drift on their own paths.
   * @param {number} time - Total elapsed time in seconds
   */
  _drawRoguePlanets(time) {
    const ctx = this.ctx;

    for (const rp of this.roguePlanets) {
      const angle = rp.angle + time * rp.speed;
      const x = rp.orbitCenterX + Math.cos(angle) * rp.orbitRadius;
      const y = rp.orbitCenterY + Math.sin(angle) * rp.orbitRadius * 0.6;  /* Elliptical */

      /* Soft glow around the planet */
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, rp.size * 2.5);
      glowGrad.addColorStop(0, `rgba(${rp.r},${rp.g},${rp.b},0.6)`);
      glowGrad.addColorStop(0.4, `rgba(${rp.r},${rp.g},${rp.b},0.2)`);
      glowGrad.addColorStop(1, `rgba(${rp.r},${rp.g},${rp.b},0)`);

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, rp.size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      /* Solid planet body */
      ctx.fillStyle = `rgb(${rp.r},${rp.g},${rp.b})`;
      ctx.beginPath();
      ctx.arc(x, y, rp.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw faction homeworld markers with glowing dots, pulsing rings,
   * and canvas-rendered text labels (Orbitron font).
   * Homeworlds rotate with the galaxy to stay fixed in galactic space.
   * @param {number} time     - Total elapsed time in seconds
   * @param {number} rotation - Current galaxy rotation angle in radians
   */
  _drawHomeworlds(time, rotation) {
    const ctx = this.ctx;
    const pulse = 0.7 + 0.3 * Math.sin(time * 2.0);
    const ringPulse = 0.5 + 0.5 * Math.sin(time * 1.5);

    for (const hw of this.homeworlds) {
      /* Rotate homeworld position with the galaxy */
      const [rx, ry] = this._rotatePoint(hw.x, hw.y, rotation);
      const isHovered = (this.hoveredHomeworld === hw);
      const dotRadius = isHovered ? 7 : 5;

      /* ── Pulsing outer ring ── */
      const ringRadius = 12 + ringPulse * 6;
      const ringAlpha = isHovered ? 0.7 : 0.3 + ringPulse * 0.2;
      ctx.strokeStyle = hw.color;
      ctx.globalAlpha = ringAlpha;
      ctx.lineWidth = isHovered ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(rx, ry, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* ── Second expanding ring (ping effect) ── */
      const pingPhase = (time * 0.8) % 1;
      const pingRadius = 12 + pingPhase * 25;
      const pingAlpha = (1 - pingPhase) * 0.25;
      ctx.strokeStyle = hw.color;
      ctx.globalAlpha = pingAlpha;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, pingRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* ── Glow behind the dot ── */
      const glowGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, dotRadius * 4);
      glowGrad.addColorStop(0, hw.color + 'aa');
      glowGrad.addColorStop(0.3, hw.color + '44');
      glowGrad.addColorStop(1, hw.color + '00');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(rx, ry, dotRadius * 4, 0, Math.PI * 2);
      ctx.fill();

      /* ── Bright homeworld dot ── */
      const dotGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, dotRadius);
      dotGrad.addColorStop(0, '#ffffff');
      dotGrad.addColorStop(0.3, hw.color);
      dotGrad.addColorStop(1, hw.color + '88');

      ctx.fillStyle = dotGrad;
      ctx.beginPath();
      ctx.arc(rx, ry, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      /* ── Store rotated position for hit-testing ── */
      hw._rx = rx;
      hw._ry = ry;

      /* ── Text label ── */
      const labelOffsetY = isHovered ? -28 : -22;
      ctx.save();
      ctx.font = isHovered ? 'bold 11px Orbitron, sans-serif' : '9px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      /* Text shadow for readability */
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = hw.color;
      ctx.fillText(hw.name, rx, ry + labelOffsetY);

      /* System count below the label */
      if (isHovered && hw.systemCount > 0) {
        ctx.font = '8px Orbitron, sans-serif';
        ctx.fillStyle = 'rgba(200,210,230,0.7)';
        ctx.fillText(hw.systemCount + ' systems', rx, ry + labelOffsetY + 13);
      }

      ctx.restore();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION: Mouse Interaction
     ═══════════════════════════════════════════════════════════ */

  /**
   * Convert a mouse event to canvas-relative coordinates.
   * Accounts for CSS scaling and element offset.
   * @param {MouseEvent} e
   * @returns {{ cx: number, cy: number }}
   */
  _canvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this._currentSize / rect.width;
    const scaleY = this._currentSize / rect.height;
    return {
      cx: (e.clientX - rect.left) * scaleX,
      cy: (e.clientY - rect.top) * scaleY,
    };
  }

  /**
   * Hit-test homeworlds on mouse move. Updates hoveredHomeworld state
   * and cursor style.
   * @param {MouseEvent} e
   */
  _handleMouseMove(e) {
    const { cx, cy } = this._canvasCoords(e);
    const R = GalaxyRenderer.CLICK_RADIUS;
    let found = null;

    for (const hw of this.homeworlds) {
      if (hw._rx === undefined) continue;  /* Not yet rendered */
      const dx = cx - hw._rx;
      const dy = cy - hw._ry;
      if (dx * dx + dy * dy < R * R) {
        found = hw;
        break;  /* First match wins */
      }
    }

    if (found !== this.hoveredHomeworld) {
      this.hoveredHomeworld = found;
      this.canvas.style.cursor = found ? 'pointer' : 'default';
    }
  }

  /**
   * Handle click on homeworld — navigate to faction page via hash.
   * @param {MouseEvent} e
   */
  _handleClick(e) {
    const { cx, cy } = this._canvasCoords(e);
    const R = GalaxyRenderer.CLICK_RADIUS;

    for (const hw of this.homeworlds) {
      if (hw._rx === undefined) continue;
      const dx = cx - hw._rx;
      const dy = cy - hw._ry;
      if (dx * dx + dy * dy < R * R) {
        if (hw.chapterId) {
          location.hash = '#' + hw.chapterId;
        }
        break;  /* Only navigate to first match */
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION: Utility Methods
     ═══════════════════════════════════════════════════════════ */

  /**
   * Rotate a point (x, y) around the canvas center by the given angle.
   * @param {number} x     - X coordinate
   * @param {number} y     - Y coordinate
   * @param {number} angle - Rotation angle in radians
   * @returns {[number, number]} Rotated [x, y]
   */
  _rotatePoint(x, y, angle) {
    const CX = this._currentCenter;
    const CY = this._currentCenter;
    const dx = x - CX;
    const dy = y - CY;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      CX + dx * cos - dy * sin,
      CY + dx * sin + dy * cos,
    ];
  }

  /**
   * Debounced resize handler. Rebuilds the galaxy at the appropriate
   * size when crossing the mobile/desktop breakpoint.
   */
  _handleResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      const wasMobile = this._isMobile;
      this._isMobile = window.innerWidth < 768;

      /* Only rebuild if we crossed the breakpoint */
      if (wasMobile !== this._isMobile) {
        const wasRunning = this.running;
        this.stop();

        /* Remove old canvas */
        if (this.canvas && this.canvas.parentNode) {
          this.canvas.removeEventListener('mousemove', this._boundMouseMove);
          this.canvas.removeEventListener('click', this._boundClick);
          this.canvas.parentNode.removeChild(this.canvas);
        }

        /* Reset seed and data arrays for deterministic rebuild */
        this._seed = 42;
        this.armStars = [];
        this.haloStars = [];
        this.nebulae = [];
        this.comets = [];
        this.roguePlanets = [];
        this.dustLanes = [];
        this.homeworlds = [];

        /* Rebuild canvas and all visual data */
        this._initCanvas();
        this._generateStars();
        this._generateNebulae();
        this._generateComets();
        this._generateRoguePlanets();
        this._generateDustLanes();
        this._loadHomeworlds(null);

        /* Re-bind canvas events */
        this.canvas.addEventListener('mousemove', this._boundMouseMove);
        this.canvas.addEventListener('click', this._boundClick);

        if (wasRunning) this.start();
      }
    }, GalaxyRenderer.RESIZE_DEBOUNCE_MS);
  }

  /**
   * Tear down the renderer — stop animation, remove canvas, unbind events.
   * Call this before discarding the renderer to prevent memory leaks.
   */
  destroy() {
    this.stop();
    clearTimeout(this._resizeTimer);
    window.removeEventListener('resize', this._boundResize);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this._boundMouseMove);
      this.canvas.removeEventListener('click', this._boundClick);
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
      this.ctx = null;
    }
    this.armStars = [];
    this.haloStars = [];
    this.nebulae = [];
    this.comets = [];
    this.roguePlanets = [];
    this.dustLanes = [];
    this.homeworlds = [];
  }
}

/* ── Global export ───────────────────────────────────────── */
window.GalaxyRenderer = GalaxyRenderer;
