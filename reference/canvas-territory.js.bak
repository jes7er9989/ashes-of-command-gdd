/* ═══════════════════════════════════════════════════════════
   canvas-territory.js — Canvas-Based Risk/Dark Crusade Territory Map
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: None (standalone Canvas2D)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   TerritoryRenderer(container)       | Constructor, creates canvas
   _buildPaths()                      | Convert territory d-strings to Path2D
   _buildConnections()                | Build land + sea route arrays
   start()                            | Begin animation loop
   stop()                             | Cancel animation loop
   _tick(timestamp)                   | Main 60fps render loop
   _drawOcean()                       | Dark ocean + animated water ripple
   _drawGridDots()                    | Faint blue dot grid (24px spacing)
   _drawTerritories()                 | Fill + stroke all territory paths
   _drawTerrainNoise(t)              | Subtle noise texture per territory
   _drawBorders()                     | Territory border strokes
   _drawLandRoutes()                  | Solid connection lines
   _drawSeaRoutes(time)              | Animated dashed sea route lines
   _drawLabels()                      | Territory names in Orbitron
   _drawHQMarker(time)               | Rotating star on Central Command
   _drawScanlines()                   | Faint horizontal lines every 4px
   _drawLegend()                      | Bottom-right legend box
   _drawTooltip()                     | Expanded info on hovered territory
   _onMouseMove(e)                    | Hit-test territories on hover
   _onClick(e)                        | Flash animation on click
   _getCanvasPos(e)                   | Convert mouse event to canvas coords
   _starPoints(cx,cy,oR,iR,n)        | Generate star polygon vertices
   _lerpColor(a,b,t)                  | Interpolate two rgba arrays
   destroy()                          | Full cleanup
   ═══════════════════════════════════════════════════════════ */


// ───────────────────────────────────────────
// SECTION: Constants
// ───────────────────────────────────────────

const CANVAS_W = 1200;
const CANVAS_H = 700;
const GRID_SPACING = 24;            /* px between dot-grid points */
const SCANLINE_SPACING = 4;         /* px between horizontal scanlines */
const OCEAN_COLOR = '#040810';
const DASH_SPEED = 40;              /* px/sec for animated dash offset */
const PARALLAX_STRENGTH = 2;        /* max px shift on mouse parallax */
const HQ_STAR_OUTER = 12;           /* HQ star outer radius */
const HQ_STAR_INNER = 5;            /* HQ star inner radius */
const HQ_STAR_POINTS = 5;           /* number of star tips */
const CONTESTED_PULSE_SPEED = 2.5;  /* oscillations per second */
const RIPPLE_AMPLITUDE = 0.6;       /* water ripple strength */
const RIPPLE_FREQUENCY = 0.04;      /* water ripple spatial freq */
const RIPPLE_SPEED = 1.2;           /* water ripple temporal speed */
const TOOLTIP_PAD = 10;             /* px padding inside tooltip box */
const FLASH_DURATION = 400;         /* ms for click-flash animation */
const TERRITORY_RESIZE_DEBOUNCE = 250; /* ms debounce for resize events */

/* Status fill colors: [r, g, b, baseAlpha] */
const STATUS_FILLS = {
  controlled: [0, 140, 255, 0.3],   /* blue — Terran held */
  neutral:    [100, 100, 120, 0.25], /* grey — unclaimed */
  contested:  [200, 50, 50, 0.3]    /* red — actively fought over */
};

/* Status border colors */
const STATUS_STROKES = {
  controlled: '#00b4ff',
  neutral:    '#555555',
  contested:  '#ff3c3c'
};

/* Continent groupings (territory indices) */
const CONTINENTS = {
  northern: [0, 1, 2, 3, 4],        /* Northern Continent */
  eastern:  [5, 6, 7, 8, 9, 10],    /* Eastern Continent */
  southern: [11, 12, 13, 14, 15]     /* Southern Islands */
};

/* Resources displayed in tooltip per territory */
const TERRITORY_RESOURCES = {
  'Northern Garrison':       ['Infantry Barracks', 'Sensor Array'],
  'Comm Array':              ['Long-Range Comms', 'Signal Intelligence'],
  'Shield Generator':        ['Orbital Shield Grid', 'Power Cells'],
  'Mountain Pass':           ['Chokepoint Defenses', 'Artillery Nests'],
  'Orbital Defense HQ':      ['Anti-Orbital Batteries', 'Radar Station'],
  'Central Command':         ['Strategic HQ', 'War Room', 'Garrison Reserve'],
  'Industrial District':     ['Munitions Factory', 'Vehicle Assembly'],
  'Power Grid Hub':          ['Fusion Reactor', 'Grid Distribution'],
  'Research Complex':        ['Weapons Lab', 'Biotech Division'],
  'Civilian Sector':         ['Population Center', 'Supply Stores'],
  'Harbor District':         ['Naval Dock', 'Trade Hub'],
  'Spaceport Alpha':         ['Launch Pads', 'Orbital Shuttle'],
  'Southern Bastion':        ['Fortified Walls', 'Siege Batteries'],
  'Western Fortifications':  ['Watchtowers', 'Minefield Perimeter'],
  'Supply Depot':            ['Fuel Reserves', 'Ammo Cache'],
  'Underground Network':     ['Tunnel System', 'Hidden Bunker']
};


// ───────────────────────────────────────────
// SECTION: Territory Data
// ───────────────────────────────────────────

/* Raw territory definitions — same layout as the SVG version.
 * d: SVG path data string (converted to Path2D at init)
 * cx/cy: label center point
 * status: controlled | neutral | contested
 * icon: Unicode icon character
 * hq: true only for Central Command
 * continent: which landmass this territory belongs to */
const TERRITORY_DATA = [
  /* ═══ NORTHERN CONTINENT (top-left, 5 territories) ═══ */
  { name: 'Northern Garrison', status: 'controlled', icon: '\u26E8',
    d: 'M80,60 C95,45 140,30 200,35 L260,42 C275,44 285,50 290,60 L295,110 C290,130 275,145 255,150 L200,165 C160,170 120,160 95,145 C75,130 65,110 70,90 Z',
    cx: 180, cy: 100, continent: 'northern' },
  { name: 'Comm Array', status: 'controlled', icon: '\u2699',
    d: 'M260,42 L340,30 C370,28 405,35 430,50 L445,65 C455,80 450,100 440,115 L420,140 C400,158 370,165 340,162 L295,155 L295,110 C290,80 280,60 290,60 L295,55 Z',
    cx: 360, cy: 95, continent: 'northern' },
  { name: 'Shield Generator', status: 'controlled', icon: '\u26E8',
    d: 'M430,50 C460,35 500,30 530,40 C555,48 570,65 560,90 L548,130 C540,155 520,170 495,175 L440,170 L420,140 C435,120 445,100 445,80 Z',
    cx: 490, cy: 105, continent: 'northern' },
  { name: 'Mountain Pass', status: 'contested', icon: '\u2694',
    d: 'M295,155 L340,162 C370,165 400,158 420,140 L440,170 L495,175 C510,180 515,200 505,220 L480,250 C460,270 430,275 400,270 L340,255 C310,248 285,232 270,210 L255,180 C250,168 252,158 255,150 Z',
    cx: 380, cy: 210, continent: 'northern' },
  { name: 'Orbital Defense HQ', status: 'controlled', icon: '\u26E8',
    d: 'M80,165 C100,160 140,165 180,170 L200,165 L255,150 C252,158 250,168 255,180 L270,210 C260,235 240,250 215,255 L160,260 C120,258 90,240 75,215 C62,195 65,175 80,165 Z',
    cx: 170, cy: 210, continent: 'northern' },

  /* ═══ EASTERN CONTINENT (right, 6 territories) ═══ */
  { name: 'Central Command', status: 'controlled', icon: '\u2605', hq: true,
    d: 'M720,120 C750,105 790,100 830,110 C860,118 880,140 875,170 L865,220 C860,250 840,270 810,280 L750,290 C720,292 695,280 680,260 L670,220 C665,190 680,160 700,140 Z',
    cx: 775, cy: 195, continent: 'eastern' },
  { name: 'Industrial District', status: 'controlled', icon: '\u2699',
    d: 'M830,60 C865,50 900,55 930,70 C955,82 970,105 965,135 L955,175 C948,200 930,215 905,220 L875,225 L875,170 C880,140 860,118 830,110 C810,104 790,100 780,105 L790,80 C800,65 815,58 830,60 Z',
    cx: 890, cy: 140, continent: 'eastern' },
  { name: 'Power Grid Hub', status: 'controlled', icon: '\u26A1',
    d: 'M955,175 C960,200 965,230 955,260 C945,285 925,305 900,315 L860,325 C835,330 815,322 800,305 L810,280 C840,270 860,250 865,220 L875,225 L905,220 C930,215 948,200 955,175 Z',
    cx: 895, cy: 265, continent: 'eastern' },
  { name: 'Research Complex', status: 'controlled', icon: '\u2697',
    d: 'M800,305 C815,322 835,330 860,325 L900,315 C910,340 905,370 890,395 C870,420 840,435 810,430 L770,420 C745,412 730,395 725,370 L730,340 C740,320 760,308 780,305 Z',
    cx: 815, cy: 370, continent: 'eastern' },
  { name: 'Civilian Sector', status: 'controlled', icon: '\u2302',
    d: 'M680,260 C695,280 720,292 750,290 L810,280 L800,305 C780,308 760,320 740,340 L730,340 L690,345 C660,342 640,325 635,300 C630,280 645,265 665,260 Z',
    cx: 720, cy: 300, continent: 'eastern' },
  { name: 'Harbor District', status: 'controlled', icon: '\u2693',
    d: 'M635,300 C640,325 660,342 690,345 L730,340 L725,370 C730,395 720,415 700,430 C675,448 645,450 620,440 L590,420 C570,405 565,380 575,355 C585,330 605,310 635,300 Z',
    cx: 660, cy: 375, continent: 'eastern' },

  /* ═══ SOUTHERN ISLANDS (bottom, 5 territories) ═══ */
  { name: 'Spaceport Alpha', status: 'controlled', icon: '\u2605',
    d: 'M180,420 C210,405 250,400 290,410 C325,418 350,440 345,470 L335,510 C325,535 300,550 270,548 L220,540 C190,535 170,515 165,490 C160,465 165,440 180,420 Z',
    cx: 255, cy: 475, continent: 'southern' },
  { name: 'Southern Bastion', status: 'contested', icon: '\u2694',
    d: 'M380,450 C405,438 435,435 465,445 C490,453 505,475 500,500 L492,535 C485,558 465,570 440,568 L395,560 C370,555 352,538 350,515 C348,490 358,465 380,450 Z',
    cx: 430, cy: 505, continent: 'southern' },
  { name: 'Western Fortifications', status: 'neutral', icon: '\u26E8',
    d: 'M50,480 C70,468 95,465 120,472 C142,478 155,498 150,520 C145,540 130,555 110,558 L80,555 C58,550 42,535 40,515 C38,498 42,488 50,480 Z',
    cx: 95, cy: 515, continent: 'southern' },
  { name: 'Supply Depot', status: 'neutral', icon: '\u2699',
    d: 'M180,570 C200,560 225,558 248,565 C268,572 280,590 275,610 C270,628 255,640 235,642 L205,638 C185,632 172,618 170,600 C168,585 172,575 180,570 Z',
    cx: 222, cy: 600, continent: 'southern' },
  { name: 'Underground Network', status: 'neutral', icon: '\u26CF',
    d: 'M470,590 C495,580 525,578 550,585 C575,592 595,610 590,635 C585,655 565,668 540,670 L505,668 C480,664 462,648 458,628 C454,608 458,598 470,590 Z',
    cx: 525, cy: 625, continent: 'southern' }
];

/* Land routes (indices into TERRITORY_DATA) — internal continent connections */
const LAND_ROUTES = [
  /* Northern continent internal */
  [0, 1], [1, 2], [0, 4], [1, 3], [2, 3], [3, 4],
  /* Eastern continent internal */
  [5, 6], [5, 9], [5, 10], [6, 7], [7, 8], [8, 9], [9, 10], [10, 8],
  /* Southern islands internal */
  [11, 12]
];

/* Sea routes — cross-ocean connections between continents */
const SEA_ROUTES = [
  [3, 5],   /* Mountain Pass → Central Command */
  [4, 10],  /* Orbital Defense → Harbor District */
  [4, 11],  /* Orbital Defense → Spaceport Alpha */
  [12, 8],  /* Southern Bastion → Research Complex */
  [14, 11], /* Western Fort → Spaceport */
  [15, 12]  /* Underground → Southern Bastion */
];


// ───────────────────────────────────────────
// SECTION: Noise Generator (simple hash-based)
// ───────────────────────────────────────────

/* Simple deterministic 2D noise for terrain texture.
 * Returns value in [0, 1]. Not crypto — just visual noise. */
function _hashNoise(x, y) {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}


// ───────────────────────────────────────────
// SECTION: TerritoryRenderer Class
// ───────────────────────────────────────────

function TerritoryRenderer(container) {
  if (!container) {
    console.error('TerritoryRenderer: container element is null');
    return;  /* no container — bail out */
  }

  /* ── Canvas setup ── */
  this.container = container;
  this.canvas = document.createElement('canvas');
  this.canvas.width = CANVAS_W;
  this.canvas.height = CANVAS_H;
  this.canvas.style.width = '100%';
  this.canvas.style.maxWidth = CANVAS_W + 'px';
  this.canvas.style.height = 'auto';
  this.canvas.style.display = 'block';
  this.canvas.style.cursor = 'default';
  this.canvas.style.borderRadius = '8px';
  container.appendChild(this.canvas);
  this.ctx = this.canvas.getContext('2d');

  /* ── State ── */
  this.animId = null;           /* requestAnimationFrame handle */
  this.running = false;
  this.hoveredIdx = -1;         /* index of hovered territory, -1 = none */
  this.mouseX = CANVAS_W / 2;  /* mouse position for parallax + tooltip */
  this.mouseY = CANVAS_H / 2;
  this.flashIdx = -1;           /* territory currently flashing from click */
  this.flashStart = 0;          /* timestamp when flash began */

  /* ── Build Path2D objects from SVG d-strings ── */
  this.territories = TERRITORY_DATA.map(function(t) {
    return {
      name: t.name,
      status: t.status,
      icon: t.icon,
      hq: !!t.hq,
      cx: t.cx,
      cy: t.cy,
      continent: t.continent,
      path: new Path2D(t.d)
    };
  });

  /* ── Pre-generate terrain noise textures (offscreen canvases) ── */
  this.noiseCanvases = this._buildNoiseTextures();

  /* ── Reduced motion detection ── */
  this._prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  this._lastFrameTime = 0;

  /* ── Bind event handlers ── */
  this._boundMouseMove = this._onMouseMove.bind(this);
  this._boundClick = this._onClick.bind(this);
  this._boundTick = this._tick.bind(this);
  this._resizeTimer = null;
  this._boundResize = this._onResize.bind(this);
  this.canvas.addEventListener('mousemove', this._boundMouseMove);
  this.canvas.addEventListener('click', this._boundClick);
  window.addEventListener('resize', this._boundResize);
}


// ───────────────────────────────────────────
// SECTION: Noise Texture Builder
// ───────────────────────────────────────────

/* Creates small offscreen canvases with noise patterns for terrain fill.
 * One per status type — controlled gets blue noise, contested red, neutral grey. */
TerritoryRenderer.prototype._buildNoiseTextures = function() {
  var textures = {};
  var size = 64; /* 64×64 repeating tile */
  var configs = {
    controlled: [0, 100, 200],   /* dark blue noise */
    neutral:    [80, 80, 90],    /* grey noise */
    contested:  [150, 40, 40]    /* dark red noise */
  };

  Object.keys(configs).forEach(function(status) {
    var offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    var octx = offscreen.getContext('2d');
    var imgData = octx.createImageData(size, size);
    var rgb = configs[status];

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var idx = (y * size + x) * 4;
        var n = _hashNoise(x, y);
        /* Very faint noise: mostly transparent, occasional brighter spots */
        imgData.data[idx]     = rgb[0];
        imgData.data[idx + 1] = rgb[1];
        imgData.data[idx + 2] = rgb[2];
        imgData.data[idx + 3] = Math.floor(n * 18); /* alpha 0-18 out of 255 */
      }
    }
    octx.putImageData(imgData, 0, 0);
    textures[status] = offscreen;
  });

  return textures;
};


// ───────────────────────────────────────────
// SECTION: Resize Handler
// ───────────────────────────────────────────

/* Debounced resize — the canvas internal resolution stays fixed (1200×700)
 * but CSS width:100% handles visual scaling. This just triggers a redraw
 * so the canvas doesn't show stale content during orientation changes. */
TerritoryRenderer.prototype._onResize = function() {
  var self = this;
  clearTimeout(this._resizeTimer);
  this._resizeTimer = setTimeout(function() {
    /* Canvas resolution is fixed; CSS handles scaling.
     * Force one redraw on next tick to update any layout-dependent rendering. */
    if (self.running && self.ctx) {
      self._tick(performance.now());
    }
  }, TERRITORY_RESIZE_DEBOUNCE);
};


// ───────────────────────────────────────────
// SECTION: Start / Stop
// ───────────────────────────────────────────

/* Begin the 60fps animation loop */
TerritoryRenderer.prototype.start = function() {
  if (this.running) return;  /* already running — no double-start */
  this.running = true;
  this.animId = requestAnimationFrame(this._boundTick);
};

/* Cancel the animation loop */
TerritoryRenderer.prototype.stop = function() {
  this.running = false;
  if (this.animId) {
    cancelAnimationFrame(this.animId);
    this.animId = null;
  }
};


// ───────────────────────────────────────────
// SECTION: Main Render Loop
// ───────────────────────────────────────────

/* Called every frame via requestAnimationFrame.
 * Draws all layers in back-to-front order. */
TerritoryRenderer.prototype._tick = function(timestamp) {
  if (!this.running) return;  /* stopped — exit cleanly */

  /* Reduced motion: throttle to ~15fps */
  if (this._prefersReducedMotion) {
    if (timestamp - this._lastFrameTime < 66) {
      this.animId = requestAnimationFrame(this._boundTick);
      return;
    }
    this._lastFrameTime = timestamp;
  }

  var ctx = this.ctx;
  var time = timestamp / 1000; /* seconds since page load */

  /* Parallax offset based on mouse position */
  var px = (this.mouseX / CANVAS_W - 0.5) * PARALLAX_STRENGTH;
  var py = (this.mouseY / CANVAS_H - 0.5) * PARALLAX_STRENGTH;

  /* Clear entire canvas */
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  /* Layer 1: Ocean background with animated ripple */
  this._drawOcean(ctx, time);

  /* Layer 2: Grid dots */
  this._drawGridDots(ctx);

  /* Apply parallax transform for all territory layers */
  ctx.save();
  ctx.translate(px, py);

  /* Layer 3: Sea routes (behind territories, animated dashes) */
  this._drawSeaRoutes(ctx, time);

  /* Layer 4: Land routes (solid dim lines) */
  this._drawLandRoutes(ctx);

  /* Layer 5: Territory fills with noise texture */
  this._drawTerritories(ctx, time);

  /* Layer 6: Territory borders */
  this._drawBorders(ctx);

  /* Layer 7: HQ star marker */
  this._drawHQMarker(ctx, time);

  /* Layer 8: Territory labels */
  this._drawLabels(ctx);

  /* Layer 9: Click flash effect */
  this._drawFlash(ctx, timestamp);

  ctx.restore(); /* remove parallax transform */

  /* Layer 10: Scanline overlay (no parallax — screen-space) */
  this._drawScanlines(ctx);

  /* Layer 11: Legend (fixed position) */
  this._drawLegend(ctx);

  /* Layer 12: Tooltip for hovered territory */
  this._drawTooltip(ctx);

  /* Schedule next frame */
  this.animId = requestAnimationFrame(this._boundTick);
};


// ───────────────────────────────────────────
// SECTION: Ocean Background
// ───────────────────────────────────────────

/* Dark ocean fill with subtle animated water ripple effect.
 * Uses sin-wave distortion on a sparse grid for performance. */
TerritoryRenderer.prototype._drawOcean = function(ctx, time) {
  /* Solid ocean base */
  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  /* Subtle radial vignette — darker edges, slightly lighter center */
  var grad = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, 100,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.6
  );
  grad.addColorStop(0, 'rgba(0,40,80,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  /* Animated water ripple — draw faint displaced lines */
  ctx.strokeStyle = 'rgba(30,80,140,0.04)';
  ctx.lineWidth = 1;
  var step = 12; /* spacing between ripple lines */
  for (var y = 0; y < CANVAS_H; y += step) {
    ctx.beginPath();
    for (var x = 0; x < CANVAS_W; x += 8) {
      var offset = Math.sin(x * RIPPLE_FREQUENCY + time * RIPPLE_SPEED + y * 0.02) * RIPPLE_AMPLITUDE;
      if (x === 0) {
        ctx.moveTo(x, y + offset);
      } else {
        ctx.lineTo(x, y + offset);
      }
    }
    ctx.stroke();
  }
};


// ───────────────────────────────────────────
// SECTION: Grid Dots
// ───────────────────────────────────────────

/* Faint blue dot grid overlaid on ocean, every GRID_SPACING px */
TerritoryRenderer.prototype._drawGridDots = function(ctx) {
  ctx.fillStyle = 'rgba(100,150,255,0.08)';
  for (var y = GRID_SPACING; y < CANVAS_H; y += GRID_SPACING) {
    for (var x = GRID_SPACING; x < CANVAS_W; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};


// ───────────────────────────────────────────
// SECTION: Territory Fills
// ───────────────────────────────────────────

/* Fill each territory path with its status color + noise texture.
 * Contested territories pulse opacity via sin wave. */
TerritoryRenderer.prototype._drawTerritories = function(ctx, time) {
  for (var i = 0; i < this.territories.length; i++) {
    var t = this.territories[i];
    var fill = STATUS_FILLS[t.status];
    var alpha = fill[3];

    /* Contested territories: pulsing opacity */
    if (t.status === 'contested') {
      alpha = fill[3] + 0.15 * Math.sin(time * CONTESTED_PULSE_SPEED * Math.PI * 2);
      alpha = Math.max(0.1, Math.min(0.5, alpha));
    }

    /* Hovered territory: brighten */
    if (i === this.hoveredIdx) {
      alpha = Math.min(alpha + 0.2, 0.7);
    }

    /* Fill with status color */
    ctx.fillStyle = 'rgba(' + fill[0] + ',' + fill[1] + ',' + fill[2] + ',' + alpha + ')';
    ctx.fill(t.path);

    /* Overlay noise texture clipped to territory shape */
    ctx.save();
    ctx.clip(t.path);
    var noiseTex = this.noiseCanvases[t.status];
    if (noiseTex) {
      var pattern = ctx.createPattern(noiseTex, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    ctx.restore();
  }
};


// ───────────────────────────────────────────
// SECTION: Territory Borders
// ───────────────────────────────────────────

/* Stroke each territory path with status color.
 * Hovered territory gets a glow effect (shadow blur). */
TerritoryRenderer.prototype._drawBorders = function(ctx) {
  for (var i = 0; i < this.territories.length; i++) {
    var t = this.territories[i];
    var strokeColor = STATUS_STROKES[t.status];
    var lineW = 2;

    /* HQ gets a thicker border */
    if (t.hq) {
      lineW = 3;
    }

    /* Hovered territory: glow effect */
    if (i === this.hoveredIdx) {
      ctx.save();
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineW + 1;
      ctx.stroke(t.path);
      ctx.restore();
    }

    /* HQ extra glow (always on) */
    if (t.hq) {
      ctx.save();
      ctx.shadowColor = '#00b4ff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = lineW;
      ctx.stroke(t.path);
      ctx.restore();
    }

    /* Normal border stroke */
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineW;
    ctx.stroke(t.path);
  }
};


// ───────────────────────────────────────────
// SECTION: Land Routes
// ───────────────────────────────────────────

/* Solid dim lines between adjacent territory centers within a continent */
TerritoryRenderer.prototype._drawLandRoutes = function(ctx) {
  ctx.strokeStyle = 'rgba(100,150,255,0.12)';
  ctx.lineWidth = 1;

  for (var i = 0; i < LAND_ROUTES.length; i++) {
    var a = this.territories[LAND_ROUTES[i][0]];
    var b = this.territories[LAND_ROUTES[i][1]];
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
  }
};


// ───────────────────────────────────────────
// SECTION: Sea Routes
// ───────────────────────────────────────────

/* Animated dashed blue lines between continents.
 * Dash offset animates to create flowing effect. */
TerritoryRenderer.prototype._drawSeaRoutes = function(ctx, time) {
  ctx.strokeStyle = 'rgba(0,180,255,0.2)';
  ctx.lineWidth = 2;
  var dashOffset = (time * DASH_SPEED) % 20;
  ctx.setLineDash([8, 12]);
  ctx.lineDashOffset = -dashOffset;

  for (var i = 0; i < SEA_ROUTES.length; i++) {
    var a = this.territories[SEA_ROUTES[i][0]];
    var b = this.territories[SEA_ROUTES[i][1]];
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
  }

  /* Reset dash state */
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
};


// ───────────────────────────────────────────
// SECTION: Territory Labels
// ───────────────────────────────────────────

/* Draws territory name + icon centered in each territory.
 * Uses Orbitron font (with fallback). Two-line layout for long names. */
TerritoryRenderer.prototype._drawLabels = function(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (var i = 0; i < this.territories.length; i++) {
    var t = this.territories[i];
    var fill = STATUS_STROKES[t.status];
    var yOff = t.hq ? -20 : -15;

    /* Icon above name */
    ctx.font = '14px "Orbitron", "Rajdhani", monospace';
    ctx.fillStyle = fill;
    ctx.fillText(t.icon, t.cx, t.cy + yOff);

    /* Territory name — split into two lines at first space */
    ctx.font = '9px "Orbitron", "Rajdhani", monospace';
    ctx.fillStyle = 'rgba(200,220,255,0.85)';
    var spaceIdx = t.name.indexOf(' ');
    if (spaceIdx > 0) {
      var line1 = t.name.substring(0, spaceIdx);
      var line2 = t.name.substring(spaceIdx + 1);
      ctx.fillText(line1, t.cx, t.cy + 1);
      ctx.fillText(line2, t.cx, t.cy + 13);
    } else {
      ctx.fillText(t.name, t.cx, t.cy + 5);
    }
  }
};


// ───────────────────────────────────────────
// SECTION: HQ Star Marker
// ───────────────────────────────────────────

/* Rotating star marker above Central Command.
 * Slowly rotates for visual interest. */
TerritoryRenderer.prototype._drawHQMarker = function(ctx, time) {
  var hq = null;
  for (var i = 0; i < this.territories.length; i++) {
    if (this.territories[i].hq) {
      hq = this.territories[i];
      break;
    }
  }
  if (!hq) return;  /* no HQ found — shouldn't happen */

  var cx = hq.cx;
  var cy = hq.cy - 32;
  var angle = time * 0.3; /* slow rotation — 0.3 radians/sec */

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  /* Star shape */
  var pts = this._starPoints(0, 0, HQ_STAR_OUTER, HQ_STAR_INNER, HQ_STAR_POINTS);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();

  /* Glow */
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#00e5ff';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
};

/* Generate star polygon vertices as array of [x, y] pairs.
 * Used for the HQ marker star shape. */
TerritoryRenderer.prototype._starPoints = function(cx, cy, outerR, innerR, numPoints) {
  var pts = [];
  for (var i = 0; i < numPoints * 2; i++) {
    var angle = (Math.PI / numPoints) * i - Math.PI / 2;
    var r = (i % 2 === 0) ? outerR : innerR;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return pts;
};


// ───────────────────────────────────────────
// SECTION: Click Flash Effect
// ───────────────────────────────────────────

/* White flash overlay on clicked territory, fading out over FLASH_DURATION ms */
TerritoryRenderer.prototype._drawFlash = function(ctx, timestamp) {
  if (this.flashIdx < 0) return;  /* no active flash */

  var elapsed = timestamp - this.flashStart;
  if (elapsed > FLASH_DURATION) {
    this.flashIdx = -1;
    return;  /* flash expired */
  }

  var progress = elapsed / FLASH_DURATION;
  var alpha = 0.5 * (1 - progress); /* fade from 0.5 to 0 */
  var t = this.territories[this.flashIdx];

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
  ctx.fill(t.path);
  ctx.restore();
};


// ───────────────────────────────────────────
// SECTION: Scanline Overlay
// ───────────────────────────────────────────

/* Faint horizontal lines every SCANLINE_SPACING px for military CRT feel.
 * Drawn in screen-space (not affected by parallax). */
TerritoryRenderer.prototype._drawScanlines = function(ctx) {
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 1;
  for (var y = 0; y < CANVAS_H; y += SCANLINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
};


// ───────────────────────────────────────────
// SECTION: Legend
// ───────────────────────────────────────────

/* Draw legend directly on canvas in the bottom-right corner.
 * Colored squares with labels for each status type + HQ. */
TerritoryRenderer.prototype._drawLegend = function(ctx) {
  var items = [
    { label: 'Controlled', color: 'rgba(0,180,255,0.35)', stroke: '#00b4ff' },
    { label: 'Neutral',    color: 'rgba(100,100,120,0.3)', stroke: '#555555' },
    { label: 'Contested',  color: 'rgba(255,60,60,0.3)',   stroke: '#ff3c3c' },
    { label: 'HQ',         color: 'rgba(0,229,255,0.5)',   stroke: '#00e5ff' }
  ];

  var boxW = 120;
  var lineH = 20;
  var boxH = items.length * lineH + 16;
  var x = CANVAS_W - boxW - 16;
  var y = CANVAS_H - boxH - 16;

  /* Background */
  ctx.fillStyle = 'rgba(4,8,16,0.75)';
  ctx.strokeStyle = 'rgba(100,150,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 4);
  ctx.fill();
  ctx.stroke();

  /* Items */
  ctx.font = '10px "Orbitron", "Rajdhani", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var iy = y + 12 + i * lineH;

    /* Color swatch */
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.stroke;
    ctx.lineWidth = 1;
    ctx.fillRect(x + 10, iy - 5, 12, 12);
    ctx.strokeRect(x + 10, iy - 5, 12, 12);

    /* Label text */
    ctx.fillStyle = 'rgba(200,220,255,0.8)';
    ctx.fillText(item.label, x + 28, iy + 1);
  }
};


// ───────────────────────────────────────────
// SECTION: Tooltip
// ───────────────────────────────────────────

/* Expanded tooltip near the hovered territory showing name, status, resources */
TerritoryRenderer.prototype._drawTooltip = function(ctx) {
  if (this.hoveredIdx < 0) return;  /* no hovered territory */

  var t = this.territories[this.hoveredIdx];
  var resources = TERRITORY_RESOURCES[t.name] || [];
  var statusLabel = t.status.charAt(0).toUpperCase() + t.status.slice(1);

  /* Tooltip dimensions */
  var lineH = 16;
  var headerH = 24;
  var tipW = 190;
  var tipH = headerH + (resources.length + 1) * lineH + TOOLTIP_PAD * 2;

  /* Position tooltip near mouse but keep on-screen */
  var tx = this.mouseX + 15;
  var ty = this.mouseY - tipH / 2;
  if (tx + tipW > CANVAS_W - 10) tx = this.mouseX - tipW - 15;
  if (ty < 10) ty = 10;
  if (ty + tipH > CANVAS_H - 10) ty = CANVAS_H - tipH - 10;

  /* Background */
  ctx.fillStyle = 'rgba(4,8,20,0.92)';
  ctx.strokeStyle = STATUS_STROKES[t.status];
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(tx, ty, tipW, tipH, 6);
  ctx.fill();
  ctx.stroke();

  /* Header: territory name */
  ctx.font = 'bold 11px "Orbitron", "Rajdhani", monospace';
  ctx.fillStyle = STATUS_STROKES[t.status];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(t.icon + ' ' + t.name, tx + TOOLTIP_PAD, ty + TOOLTIP_PAD);

  /* Status line */
  ctx.font = '9px "Orbitron", "Rajdhani", monospace';
  ctx.fillStyle = 'rgba(200,220,255,0.6)';
  var hqTag = t.hq ? ' [HQ]' : '';
  ctx.fillText('Status: ' + statusLabel + hqTag, tx + TOOLTIP_PAD, ty + TOOLTIP_PAD + headerH);

  /* Divider line */
  var divY = ty + TOOLTIP_PAD + headerH + lineH;
  ctx.strokeStyle = 'rgba(100,150,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(tx + TOOLTIP_PAD, divY);
  ctx.lineTo(tx + tipW - TOOLTIP_PAD, divY);
  ctx.stroke();

  /* Resources list */
  ctx.font = '9px "Rajdhani", monospace';
  ctx.fillStyle = 'rgba(200,220,255,0.7)';
  for (var i = 0; i < resources.length; i++) {
    ctx.fillText('• ' + resources[i], tx + TOOLTIP_PAD, divY + 6 + i * lineH);
  }
};


// ───────────────────────────────────────────
// SECTION: Mouse Interaction
// ───────────────────────────────────────────

/* Convert mouse event coordinates to canvas-space coordinates.
 * Accounts for canvas CSS scaling (responsive layout). */
TerritoryRenderer.prototype._getCanvasPos = function(e) {
  var rect = this.canvas.getBoundingClientRect();
  var scaleX = CANVAS_W / rect.width;
  var scaleY = CANVAS_H / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
};

/* Hit-test all territories on mouse move.
 * Sets hoveredIdx and updates cursor style. */
TerritoryRenderer.prototype._onMouseMove = function(e) {
  var pos = this._getCanvasPos(e);
  this.mouseX = pos.x;
  this.mouseY = pos.y;

  var prevHover = this.hoveredIdx;
  this.hoveredIdx = -1;

  for (var i = 0; i < this.territories.length; i++) {
    if (this.ctx.isPointInPath(this.territories[i].path, pos.x, pos.y)) {
      this.hoveredIdx = i;
      break;
    }
  }

  /* Update cursor */
  if (this.hoveredIdx >= 0) {
    this.canvas.style.cursor = 'pointer';
  } else {
    this.canvas.style.cursor = 'default';
  }
};

/* Flash animation on click + potential navigation.
 * Triggers a white flash overlay that fades out. */
TerritoryRenderer.prototype._onClick = function(e) {
  var pos = this._getCanvasPos(e);

  for (var i = 0; i < this.territories.length; i++) {
    if (this.ctx.isPointInPath(this.territories[i].path, pos.x, pos.y)) {
      this.flashIdx = i;
      this.flashStart = performance.now();

      /* Dispatch custom event for external navigation hooks */
      var detail = {
        name: this.territories[i].name,
        status: this.territories[i].status,
        continent: this.territories[i].continent,
        hq: this.territories[i].hq
      };
      this.canvas.dispatchEvent(new CustomEvent('territory-click', { detail: detail, bubbles: true }));
      break;
    }
  }
};


// ───────────────────────────────────────────
// SECTION: Cleanup
// ───────────────────────────────────────────

/* Full teardown — stop animation, remove listeners, detach canvas */
TerritoryRenderer.prototype.destroy = function() {
  this.stop();
  clearTimeout(this._resizeTimer);
  window.removeEventListener('resize', this._boundResize);
  this.canvas.removeEventListener('mousemove', this._boundMouseMove);
  this.canvas.removeEventListener('click', this._boundClick);
  if (this.canvas.parentNode) {
    this.canvas.parentNode.removeChild(this.canvas);
  }
  this.territories = [];
  this.noiseCanvases = {};
};


// ───────────────────────────────────────────
// SECTION: Global Export
// ───────────────────────────────────────────

window.TerritoryRenderer = TerritoryRenderer;
