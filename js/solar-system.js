/* ═══════════════════════════════════════════════════════════
   solar-system.js — 3D Interactive Solar System Renderer
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-04-05
   Dependencies: Three.js r128 (CDN)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   SolarTextures                      | Canvas-based procedural texture generator
   SolarSystemRenderer(container)     | Constructor — scene, camera, renderer
   _initScene()                       | Create scene, camera, renderer, lights
   _initMouseControls()               | Drag-to-rotate, scroll-to-zoom controls
   _createStarfield()                 | Enhanced starfield with varied sizes/colors
   _createSol()                       | Layered star: core + atmosphere + corona + CMEs + glow
   _createPlanets()                   | All 7 planets with procedural textures
   _createPlanet(cfg)                 | Single planet from config object
   _createOrbitPath(radius)           | Dashed circle orbit line
   _createNameLabel(name, color)      | Canvas-texture billboard label
   _createSaturnRing(planet)          | Detailed ring with Cassini division
   _createTerraGlow(planet)           | Blue atmospheric glow for Terra
   _createAsteroidBelt()              | 200 scattered rocks between Mars/Jupiter
   _setupRaycaster()                  | Click/hover detection on planets
   _onMouseDown(e)                    | Begin camera drag
   _onMouseMove(e)                    | Camera drag + hover highlight
   _onMouseUp(e)                      | End camera drag
   _onWheel(e)                        | Zoom in/out
   _onClick(e)                        | Raycaster click — navigate on Terra
   _animate()                         | Main render loop
   _updateCameraPosition()            | Spherical coords → cartesian
   start()                            | Begin animation loop
   stop()                             | Cancel animation loop
   ═══════════════════════════════════════════════════════════ */

// ───────────────────────────────────────────
// SECTION: Constants
// ───────────────────────────────────────────

var SOLAR_RENDERER_WIDTH = 800;
var SOLAR_RENDERER_HEIGHT = 500;
var SOLAR_RENDERER_MOBILE_HEIGHT = 300;
var SOLAR_RESIZE_DEBOUNCE_MS = 250;
var SOLAR_STARFIELD_COUNT = 800;
var SOLAR_STARFIELD_RADIUS = 120;
var SOLAR_ASTEROID_COUNT = 200;
var SOLAR_ASTEROID_INNER = 12;
var SOLAR_ASTEROID_OUTER = 14;
var SOLAR_SOL_RADIUS = 3;
var SOLAR_SOL_PULSE_MIN = 1.0;
var SOLAR_SOL_PULSE_MAX = 1.06;
var SOLAR_SOL_PULSE_PERIOD = 3.0;
var SOLAR_CORONA_SIZE = 9;
var SOLAR_CAMERA_INITIAL_THETA = Math.PI / 4;
var SOLAR_CAMERA_INITIAL_PHI = 0;
var SOLAR_CAMERA_INITIAL_DIST = 50;
var SOLAR_CAMERA_MIN_DIST = 10;
var SOLAR_CAMERA_MAX_DIST = 100;
var SOLAR_DRAG_SENSITIVITY = 0.005;
var SOLAR_ZOOM_SENSITIVITY = 0.05;
var SOLAR_PLANET_SPIN_SPEED = 0.3;
var SOLAR_CME_COUNT = 3;

// Planet definitions
var SOLAR_PLANETS = [
  { name: 'Mercury', radius: 0.3,  color: 0x888888, orbit: 5,  period: 8,  hasRing: false, hasTerraGlow: false },
  { name: 'Venus',   radius: 0.5,  color: 0xeedd88, orbit: 7,  period: 12, hasRing: false, hasTerraGlow: false },
  { name: 'Terra',   radius: 0.55, color: 0x4488ff, orbit: 9,  period: 16, hasRing: false, hasTerraGlow: true  },
  { name: 'Mars',    radius: 0.4,  color: 0xcc4422, orbit: 11, period: 20, hasRing: false, hasTerraGlow: false },
  { name: 'Jupiter', radius: 1.2,  color: 0xdd9944, orbit: 15, period: 30, hasRing: false, hasTerraGlow: false },
  { name: 'Saturn',  radius: 1.0,  color: 0xddbb66, orbit: 19, period: 40, hasRing: true,  hasTerraGlow: false },
  { name: 'Neptune', radius: 0.6,  color: 0x2244aa, orbit: 23, period: 55, hasRing: false, hasTerraGlow: false }
];

// ───────────────────────────────────────────
// SECTION: SolarTextures — Procedural Canvas Textures
// ───────────────────────────────────────────

var SolarTextures = {

  /**
   * Simple seeded pseudo-random for deterministic textures.
   */
  _seededRandom: function(seed) {
    var x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  },

  /**
   * 2D value noise using bilinear interpolation.
   */
  _noise2D: function(x, y, seed) {
    var ix = Math.floor(x);
    var iy = Math.floor(y);
    var fx = x - ix;
    var fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);

    var a = this._seededRandom(ix + iy * 57 + seed);
    var b = this._seededRandom(ix + 1 + iy * 57 + seed);
    var c = this._seededRandom(ix + (iy + 1) * 57 + seed);
    var d = this._seededRandom(ix + 1 + (iy + 1) * 57 + seed);

    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  },

  /**
   * Fractal Brownian Motion — layered noise.
   */
  _fbm: function(x, y, octaves, seed) {
    var val = 0;
    var amp = 0.5;
    var freq = 1;
    for (var i = 0; i < octaves; i++) {
      val += amp * this._noise2D(x * freq, y * freq, seed + i * 100);
      amp *= 0.5;
      freq *= 2;
    }
    return val;
  },

  /**
   * Sol surface: churning plasma with hotspots and granulation.
   */
  createSolTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 8;
        var ny = y / size * 4;

        var n1 = this._fbm(nx, ny, 5, 42);
        var n2 = this._fbm(nx * 2 + 3.7, ny * 2 + 1.3, 4, 99);
        var n3 = this._fbm(nx * 0.5, ny * 0.5, 3, 7);

        // Base plasma: deep orange to bright yellow-white
        var hotspot = n2 * n2;
        var granulation = n1 * 0.4;
        var intensity = 0.5 + n3 * 0.3 + hotspot * 0.3 - granulation;
        intensity = Math.max(0, Math.min(1, intensity));

        // Color: dark orange-red → orange → yellow-white
        var r = Math.floor(180 + intensity * 75);
        var g = Math.floor(80 + intensity * 150);
        var b = Math.floor(10 + intensity * 100);

        // Sunspot regions — darker areas
        if (n1 > 0.65 && n2 < 0.35) {
          r = Math.floor(r * 0.5);
          g = Math.floor(g * 0.35);
          b = Math.floor(b * 0.2);
        }

        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }

    return canvas;
  },

  /**
   * Mercury: gray cratered surface.
   */
  createMercuryTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 10;
        var ny = y / size * 5;
        var base = this._fbm(nx, ny, 5, 11);

        // Crater simulation: sharp dark circles via noise
        var crater = this._noise2D(nx * 3, ny * 3, 200);
        crater = crater > 0.72 ? (crater - 0.72) * 5 : 0;

        var val = base * 0.7 - crater * 0.3;
        val = Math.max(0, Math.min(1, val));

        var gray = Math.floor(90 + val * 90);
        ctx.fillStyle = 'rgb(' + gray + ',' + gray + ',' + (gray - 5) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Venus: thick yellow-orange cloudy atmosphere.
   */
  createVenusTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 6;
        var ny = y / size * 3;

        // Swirling cloud bands
        var cloud1 = this._fbm(nx + ny * 0.5, ny, 5, 22);
        var cloud2 = this._fbm(nx * 0.7, ny * 2, 4, 55);
        var val = cloud1 * 0.6 + cloud2 * 0.4;

        var r = Math.floor(200 + val * 50);
        var g = Math.floor(160 + val * 50);
        var b = Math.floor(60 + val * 30);

        ctx.fillStyle = 'rgb(' + Math.min(r, 255) + ',' + Math.min(g, 255) + ',' + b + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Terra: blue oceans, green/brown continents, white cloud wisps.
   */
  createTerraTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 8;
        var ny = y / size * 4;

        // Continent shape from noise
        var land = this._fbm(nx, ny, 6, 33);
        // Latitude factor: more ice at poles
        var lat = Math.abs(y / size - 0.5) * 2;

        var r, g, b;

        if (land > 0.52) {
          // Land: green near equator, brown towards poles
          var landDetail = this._fbm(nx * 2, ny * 2, 3, 77);
          if (lat > 0.85) {
            // Polar caps — white
            r = 230; g = 235; b = 240;
          } else {
            var greenFactor = Math.max(0, 1 - lat * 1.2);
            r = Math.floor(60 + landDetail * 50 + (1 - greenFactor) * 80);
            g = Math.floor(90 + greenFactor * 60 + landDetail * 30);
            b = Math.floor(30 + landDetail * 20);
          }
        } else {
          // Ocean — varying depth
          var depth = (0.52 - land) * 5;
          r = Math.floor(20 + depth * 15);
          g = Math.floor(50 + depth * 30);
          b = Math.floor(140 + depth * 40);
        }

        // Cloud wisps overlay
        var cloud = this._fbm(nx * 1.5 + 100, ny * 1.5, 4, 88);
        if (cloud > 0.58) {
          var cloudAlpha = (cloud - 0.58) * 4;
          cloudAlpha = Math.min(cloudAlpha, 0.7);
          r = Math.floor(r + (240 - r) * cloudAlpha);
          g = Math.floor(g + (245 - g) * cloudAlpha);
          b = Math.floor(b + (250 - b) * cloudAlpha);
        }

        ctx.fillStyle = 'rgb(' + Math.min(r, 255) + ',' + Math.min(g, 255) + ',' + Math.min(b, 255) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Mars: rusty red with darker regions and white polar caps.
   */
  createMarsTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 8;
        var ny = y / size * 4;

        var terrain = this._fbm(nx, ny, 5, 44);
        var detail = this._fbm(nx * 3, ny * 3, 3, 66);
        var lat = Math.abs(y / size - 0.5) * 2;

        var r, g, b;

        if (lat > 0.88) {
          // Polar ice caps
          var ice = 0.6 + detail * 0.4;
          r = Math.floor(200 + ice * 50);
          g = Math.floor(200 + ice * 45);
          b = Math.floor(210 + ice * 40);
        } else {
          // Rusty surface — darker regions from terrain noise
          var base = terrain * 0.6 + detail * 0.4;
          r = Math.floor(150 + base * 60);
          g = Math.floor(60 + base * 40);
          b = Math.floor(25 + base * 25);

          // Darker volcanic regions
          if (terrain < 0.35) {
            r = Math.floor(r * 0.65);
            g = Math.floor(g * 0.55);
            b = Math.floor(b * 0.5);
          }
        }

        ctx.fillStyle = 'rgb(' + Math.min(r, 255) + ',' + Math.min(g, 255) + ',' + Math.min(b, 255) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Jupiter: banded atmosphere with brown/tan/cream stripes and storm spot.
   */
  createJupiterTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 8;
        var ny = y / size;

        // Latitude-based banding
        var band = Math.sin(ny * Math.PI * 12) * 0.5 + 0.5;
        var turbulence = this._fbm(nx + band * 0.5, ny * 6, 4, 55);
        var detail = this._noise2D(nx * 4, ny * 20, 123);

        var val = band * 0.5 + turbulence * 0.3 + detail * 0.2;

        // Band colors: cream, tan, brown alternating
        var r, g, b;
        if (val > 0.65) {
          // Cream/white bands
          r = Math.floor(220 + val * 30);
          g = Math.floor(200 + val * 30);
          b = Math.floor(160 + val * 30);
        } else if (val > 0.4) {
          // Tan/orange bands
          r = Math.floor(190 + val * 40);
          g = Math.floor(140 + val * 40);
          b = Math.floor(80 + val * 20);
        } else {
          // Dark brown bands
          r = Math.floor(130 + val * 50);
          g = Math.floor(90 + val * 40);
          b = Math.floor(50 + val * 20);
        }

        // Great Red Spot — ellipse at ~22% from bottom, ~30% from left
        var spotX = (nx / 8 - 0.3);
        var spotY = (ny - 0.72);
        var spotDist = (spotX * spotX) / (0.04 * 0.04) + (spotY * spotY) / (0.025 * 0.025);
        if (spotDist < 1) {
          var spotFade = 1 - spotDist;
          var spotNoise = this._noise2D(nx * 8, ny * 8, 300);
          r = Math.floor(r + (180 - r) * spotFade * 0.8);
          g = Math.floor(g * (1 - spotFade * 0.5));
          b = Math.floor(b * (1 - spotFade * 0.6) + spotNoise * 10);
        }

        ctx.fillStyle = 'rgb(' + Math.min(r, 255) + ',' + Math.min(g, 255) + ',' + Math.min(b, 255) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Saturn: golden banded atmosphere.
   */
  createSaturnTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 8;
        var ny = y / size;

        var band = Math.sin(ny * Math.PI * 10) * 0.5 + 0.5;
        var turb = this._fbm(nx + band * 0.3, ny * 5, 4, 77);

        var val = band * 0.5 + turb * 0.5;

        // Golden palette
        var r = Math.floor(190 + val * 55);
        var g = Math.floor(165 + val * 50);
        var b = Math.floor(90 + val * 40);

        ctx.fillStyle = 'rgb(' + Math.min(r, 255) + ',' + Math.min(g, 255) + ',' + Math.min(b, 255) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Neptune: deep blue with subtle banding.
   */
  createNeptuneTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * 6;
        var ny = y / size;

        var band = Math.sin(ny * Math.PI * 8) * 0.5 + 0.5;
        var turb = this._fbm(nx, ny * 4, 4, 88);
        var val = band * 0.4 + turb * 0.6;

        var r = Math.floor(20 + val * 25);
        var g = Math.floor(40 + val * 50);
        var b = Math.floor(130 + val * 80);

        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + Math.min(b, 255) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Saturn ring texture: transparency gradient with Cassini division.
   */
  createSaturnRingTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');

    for (var x = 0; x < size; x++) {
      var t = x / size; // 0 = inner, 1 = outer

      // Ring density: varies with radius, zero at Cassini division
      var density = 0.8;

      // Cassini division: gap at ~60% of ring width
      var cassiniDist = Math.abs(t - 0.6);
      if (cassiniDist < 0.03) {
        density *= cassiniDist / 0.03;
      }

      // Outer edge fades, inner edge somewhat sharp
      density *= Math.min(1, t * 5);           // inner fade
      density *= Math.min(1, (1 - t) * 3);     // outer fade

      // Sub-ring structure from noise
      var noise = SolarTextures._noise2D(t * 40, 0, 500);
      density *= 0.7 + noise * 0.3;

      var alpha = Math.max(0, Math.min(1, density));

      // Color: warm gold/tan
      var r = Math.floor(200 + noise * 40);
      var g = Math.floor(175 + noise * 35);
      var b = Math.floor(120 + noise * 20);

      for (var y = 0; y < 64; y++) {
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  },

  /**
   * Sol corona gradient for billboard quads.
   */
  createCoronaTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    var cx = size / 2;
    var cy = size / 2;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    grad.addColorStop(0, 'rgba(255, 240, 180, 0.6)');
    grad.addColorStop(0.2, 'rgba(255, 200, 80, 0.4)');
    grad.addColorStop(0.5, 'rgba(255, 160, 40, 0.15)');
    grad.addColorStop(0.8, 'rgba(255, 100, 20, 0.05)');
    grad.addColorStop(1, 'rgba(255, 60, 10, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  },

  /**
   * Sol glow halo texture.
   */
  createGlowTexture: function(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    var cx = size / 2;
    var cy = size / 2;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    grad.addColorStop(0, 'rgba(255, 220, 130, 0.35)');
    grad.addColorStop(0.3, 'rgba(255, 180, 60, 0.15)');
    grad.addColorStop(0.6, 'rgba(255, 120, 30, 0.05)');
    grad.addColorStop(1, 'rgba(255, 80, 10, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  },

  /**
   * Get the texture-creation function name for a planet.
   */
  getTextureForPlanet: function(name) {
    var map = {
      'Mercury': 'createMercuryTexture',
      'Venus': 'createVenusTexture',
      'Terra': 'createTerraTexture',
      'Mars': 'createMarsTexture',
      'Jupiter': 'createJupiterTexture',
      'Saturn': 'createSaturnTexture',
      'Neptune': 'createNeptuneTexture'
    };
    return map[name] || null;
  }
};

// ───────────────────────────────────────────
// SECTION: SolarSystemRenderer Class
// ───────────────────────────────────────────

class SolarSystemRenderer {
  /**
   * Creates a new solar system renderer inside the given container element.
   * @param {HTMLElement} container — DOM element to append the canvas to
   */
  constructor(container) {
    this.container = container;
    this.animationId = null;
    this.clock = new THREE.Clock();
    this.planets = [];
    this.asteroidBelt = null;
    this.sol = null;
    this.solAtmosphere = null;
    this.solGlow = null;
    this.coronaQuads = [];
    this.cmeArcs = [];
    this.hoveredPlanet = null;
    this.mouse = new THREE.Vector2();
    this._resizeTimer = null;
    this._isMobile = window.innerWidth < 768;
    this._prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._lastFrameTime = 0;

    // Camera spherical coordinates
    this.cameraTheta = SOLAR_CAMERA_INITIAL_THETA;
    this.cameraPhi = SOLAR_CAMERA_INITIAL_PHI;
    this.cameraDist = SOLAR_CAMERA_INITIAL_DIST;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this._initScene();
    this._createStarfield();
    this._createSol();
    this._createPlanets();
    this._createAsteroidBelt();
    this._setupRaycaster();
    this._initMouseControls();
    this._updateCameraPosition();

    this._boundResize = this._onResize.bind(this);
    this._boundTick = this._animate.bind(this);
    window.addEventListener('resize', this._boundResize);
  }

  // ───────────────────────────────────────────
  // SECTION: Scene Initialization
  // ───────────────────────────────────────────

  _initScene() {
    this.scene = new THREE.Scene();

    var w = this._getRendererWidth();
    var h = this._getRendererHeight();

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);

    var maxDpr = this._isMobile ? 1.5 : 2;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.maxWidth = SOLAR_RENDERER_WIDTH + 'px';
    this.renderer.domElement.style.height = 'auto';

    this.container.appendChild(this.renderer.domElement);

    // Subtle ambient so the dark side of planets isn't pure black
    var ambient = new THREE.AmbientLight(0x222233, 0.4);
    this.scene.add(ambient);
  }

  _getRendererWidth() {
    var containerW = this.container ? this.container.clientWidth : window.innerWidth;
    return Math.min(containerW, SOLAR_RENDERER_WIDTH);
  }

  _getRendererHeight() {
    if (this._isMobile) return SOLAR_RENDERER_MOBILE_HEIGHT;
    var w = this._getRendererWidth();
    return Math.round(w * (SOLAR_RENDERER_HEIGHT / SOLAR_RENDERER_WIDTH));
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(function() {
      this._isMobile = window.innerWidth < 768;
      var w = this._getRendererWidth();
      var h = this._getRendererHeight();
      var maxDpr = this._isMobile ? 1.5 : 2;

      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.maxWidth = SOLAR_RENDERER_WIDTH + 'px';
      this.renderer.domElement.style.height = 'auto';

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }.bind(this), SOLAR_RESIZE_DEBOUNCE_MS);
  }

  // ───────────────────────────────────────────
  // SECTION: Mouse Controls (Orbit Camera)
  // ───────────────────────────────────────────

  _initMouseControls() {
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundWheel = this._onWheel.bind(this);
    this._boundClick = this._onClick.bind(this);

    var canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this._boundMouseDown);
    canvas.addEventListener('mousemove', this._boundMouseMove);
    canvas.addEventListener('mouseup', this._boundMouseUp);
    canvas.addEventListener('mouseleave', this._boundMouseUp);
    canvas.addEventListener('wheel', this._boundWheel, { passive: false });
    canvas.addEventListener('click', this._boundClick);
  }

  _onMouseDown(e) {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  _onMouseMove(e) {
    if (this.isDragging) {
      var dx = e.clientX - this.lastMouseX;
      var dy = e.clientY - this.lastMouseY;
      this.cameraPhi -= dx * SOLAR_DRAG_SENSITIVITY;
      this.cameraTheta = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraTheta + dy * SOLAR_DRAG_SENSITIVITY));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this._updateCameraPosition();
    }

    var rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onMouseUp() {
    this.isDragging = false;
  }

  _onWheel(e) {
    e.preventDefault();
    this.cameraDist += e.deltaY * SOLAR_ZOOM_SENSITIVITY;
    this.cameraDist = Math.max(SOLAR_CAMERA_MIN_DIST, Math.min(SOLAR_CAMERA_MAX_DIST, this.cameraDist));
    this._updateCameraPosition();
  }

  _onClick(e) {
    if (this.isDragging) return;

    var rect = this.renderer.domElement.getBoundingClientRect();
    var clickMouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(clickMouse, this.camera);
    var meshes = this.planets.map(function(p) { return p.mesh; });
    var hits = this.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      var hitMesh = hits[0].object;
      for (var i = 0; i < this.planets.length; i++) {
        if (this.planets[i].mesh === hitMesh && this.planets[i].name === 'Terra') {
          location.hash = '#ch5';
          return;
        }
      }
    }
  }

  _updateCameraPosition() {
    var x = this.cameraDist * Math.sin(this.cameraTheta) * Math.sin(this.cameraPhi);
    var y = this.cameraDist * Math.cos(this.cameraTheta);
    var z = this.cameraDist * Math.sin(this.cameraTheta) * Math.cos(this.cameraPhi);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // ───────────────────────────────────────────
  // SECTION: Enhanced Starfield
  // ───────────────────────────────────────────

  _createStarfield() {
    var count = SOLAR_STARFIELD_COUNT;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var sizes = new Float32Array(count);

    for (var i = 0; i < count; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = SOLAR_STARFIELD_RADIUS + (Math.random() - 0.5) * 20;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Varied sizes: most small, a few larger
      sizes[i] = 0.15 + Math.random() * 0.25;
      if (Math.random() < 0.05) sizes[i] = 0.5 + Math.random() * 0.3; // bright stars

      // Most stars white, some colored
      var roll = Math.random();
      if (roll < 0.04) {
        // Blue star
        colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 1.0;
      } else if (roll < 0.08) {
        // Red star
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.5; colors[i * 3 + 2] = 0.4;
      } else if (roll < 0.11) {
        // Yellow star
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.7;
      } else {
        // White
        var bright = 0.7 + Math.random() * 0.3;
        colors[i * 3] = bright; colors[i * 3 + 1] = bright; colors[i * 3 + 2] = bright;
      }
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    var material = new THREE.PointsMaterial({
      size: 0.3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      vertexColors: true
    });

    var stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  // ───────────────────────────────────────────
  // SECTION: Sol (Central Star) — Multi-Layered
  // ───────────────────────────────────────────

  _createSol() {
    var texSize = this._isMobile ? 256 : 512;

    // --- Layer 1: Inner bright core with procedural texture ---
    var solCanvas = SolarTextures.createSolTexture(texSize);
    var solTexture = new THREE.CanvasTexture(solCanvas);
    solTexture.needsUpdate = true;

    var solGeo = new THREE.SphereGeometry(SOLAR_SOL_RADIUS, 48, 48);
    var solMat = new THREE.MeshBasicMaterial({
      map: solTexture,
      color: 0xffffff
    });
    this.sol = new THREE.Mesh(solGeo, solMat);
    this.scene.add(this.sol);

    // --- Layer 2: Semi-transparent atmosphere shell ---
    var atmosGeo = new THREE.SphereGeometry(SOLAR_SOL_RADIUS * 1.08, 48, 48);
    var atmosMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.15,
      side: THREE.FrontSide,
      depthWrite: false
    });
    this.solAtmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    this.scene.add(this.solAtmosphere);

    // --- Layer 3: Soft glow halo (additive-blended oversized sphere) ---
    var glowCanvas = SolarTextures.createGlowTexture(256);
    var glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.needsUpdate = true;

    var glowGeo = new THREE.PlaneGeometry(SOLAR_SOL_RADIUS * 6, SOLAR_SOL_RADIUS * 6);
    var glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.solGlow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.solGlow);

    // --- Point light at star center ---
    var light = new THREE.PointLight(0xfff0d0, 2.0, 200);
    light.position.set(0, 0, 0);
    this.scene.add(light);

    // Secondary warmer close-range light
    var light2 = new THREE.PointLight(0xffaa44, 0.8, 30);
    light2.position.set(0, 0, 0);
    this.scene.add(light2);

    // --- Layer 4: Corona billboard quads with gradient textures ---
    var coronaCanvas = SolarTextures.createCoronaTexture(256);
    var coronaTexture = new THREE.CanvasTexture(coronaCanvas);
    coronaTexture.needsUpdate = true;

    this.coronaQuads = [];
    for (var i = 0; i < 6; i++) {
      var coronaGeo = new THREE.PlaneGeometry(SOLAR_CORONA_SIZE, SOLAR_CORONA_SIZE);
      var coronaMat = new THREE.MeshBasicMaterial({
        map: coronaTexture,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var quad = new THREE.Mesh(coronaGeo, coronaMat);
      quad.rotation.z = (i * Math.PI) / 6;
      this.scene.add(quad);
      this.coronaQuads.push(quad);
    }

    // --- Layer 5: Coronal mass ejection arcs ---
    this.cmeArcs = [];
    for (var j = 0; j < SOLAR_CME_COUNT; j++) {
      var cmeData = this._createCMEArc(j);
      this.cmeArcs.push(cmeData);
    }
  }

  /**
   * Creates a single coronal mass ejection arc using CatmullRomCurve3.
   */
  _createCMEArc(index) {
    var baseAngle = (index / SOLAR_CME_COUNT) * Math.PI * 2 + 0.5;
    var elevAngle = (Math.random() - 0.5) * Math.PI * 0.5;

    // Arc points from surface outward in a curve
    var startR = SOLAR_SOL_RADIUS * 1.0;
    var midR = SOLAR_SOL_RADIUS * 1.8 + Math.random() * 1.5;
    var endR = SOLAR_SOL_RADIUS * 1.1;

    var startAngle = baseAngle - 0.2;
    var midAngle = baseAngle;
    var endAngle = baseAngle + 0.2;

    var points = [
      new THREE.Vector3(
        Math.cos(startAngle) * Math.cos(elevAngle) * startR,
        Math.sin(elevAngle) * startR,
        Math.sin(startAngle) * Math.cos(elevAngle) * startR
      ),
      new THREE.Vector3(
        Math.cos(midAngle) * Math.cos(elevAngle) * midR,
        Math.sin(elevAngle) * midR + 1.0,
        Math.sin(midAngle) * Math.cos(elevAngle) * midR
      ),
      new THREE.Vector3(
        Math.cos(endAngle) * Math.cos(elevAngle) * endR,
        Math.sin(elevAngle) * endR,
        Math.sin(endAngle) * Math.cos(elevAngle) * endR
      )
    ];

    var curve = new THREE.CatmullRomCurve3(points);
    var tubeGeo = new THREE.TubeGeometry(curve, 20, 0.12, 6, false);
    var tubeMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var tube = new THREE.Mesh(tubeGeo, tubeMat);
    this.scene.add(tube);

    return {
      mesh: tube,
      baseAngle: baseAngle,
      elevAngle: elevAngle,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4
    };
  }

  // ───────────────────────────────────────────
  // SECTION: Planets with Procedural Textures
  // ───────────────────────────────────────────

  _createPlanets() {
    for (var i = 0; i < SOLAR_PLANETS.length; i++) {
      this._createPlanet(SOLAR_PLANETS[i]);
    }
  }

  _createPlanet(cfg) {
    var geo = new THREE.SphereGeometry(cfg.radius, 32, 32);

    // Generate procedural texture if available
    var texFn = SolarTextures.getTextureForPlanet(cfg.name);
    var mat;
    if (texFn) {
      var texSize = this._isMobile ? 128 : 256;
      var canvas = SolarTextures[texFn](texSize);
      var texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      mat = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 25,
        emissive: cfg.color,
        emissiveIntensity: 0.03
      });
    } else {
      mat = new THREE.MeshPhongMaterial({
        color: cfg.color,
        shininess: 30,
        emissive: cfg.color,
        emissiveIntensity: 0.05
      });
    }

    var mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);

    this._createOrbitPath(cfg.orbit);

    var label = this._createNameLabel(cfg.name, cfg.color);
    this.scene.add(label);

    if (cfg.hasRing) {
      this._createSaturnRing(mesh, cfg.radius);
    }

    if (cfg.hasTerraGlow) {
      this._createTerraGlow(mesh, cfg.radius);
    }

    // Neptune faint ring
    if (cfg.name === 'Neptune') {
      this._createNeptuneRing(mesh, cfg.radius);
    }

    this.planets.push({
      mesh: mesh,
      orbitRadius: cfg.orbit,
      period: cfg.period,
      label: label,
      name: cfg.name,
      originalEmissiveIntensity: 0.03
    });
  }

  _createOrbitPath(radius) {
    var segments = 128;
    var points = [];
    for (var i = 0; i <= segments; i++) {
      var angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }

    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var material = new THREE.LineDashedMaterial({
      color: 0x334455,
      dashSize: 0.5,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.4
    });

    var line = new THREE.LineLoop(geometry, material);
    line.computeLineDistances();
    this.scene.add(line);
  }

  _createNameLabel(name, color) {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');

    var r = (color >> 16) & 0xff;
    var g = (color >> 8) & 0xff;
    var b = color & 0xff;
    var cssColor = 'rgb(' + r + ',' + g + ',' + b + ')';

    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 28px Orbitron, Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = cssColor;
    ctx.fillText(name.toUpperCase(), 128, 32);

    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    var labelGeo = new THREE.PlaneGeometry(4, 1);
    var labelMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    var label = new THREE.Mesh(labelGeo, labelMat);
    return label;
  }

  /**
   * Detailed Saturn ring with procedural texture, Cassini division, transparency gradient.
   */
  _createSaturnRing(planet, planetRadius) {
    var innerR = planetRadius * 1.4;
    var outerR = planetRadius * 2.4;
    var ringGeo = new THREE.RingGeometry(innerR, outerR, 96, 1);

    // Map UV.x to radial position for the ring texture
    var pos = ringGeo.attributes.position;
    var uv = ringGeo.attributes.uv;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var z = pos.getY(i); // RingGeometry lies in XY plane
      var dist = Math.sqrt(x * x + z * z);
      var t = (dist - innerR) / (outerR - innerR);
      uv.setXY(i, t, 0.5);
    }

    var ringCanvas = SolarTextures.createSaturnRingTexture(512);
    var ringTexture = new THREE.CanvasTexture(ringCanvas);
    ringTexture.needsUpdate = true;

    var ringMat = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false
    });

    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2 + (25 * Math.PI / 180);
    planet.add(ring);
  }

  _createTerraGlow(planet, planetRadius) {
    var innerR = planetRadius * 1.05;
    var outerR = planetRadius * 1.5;
    var glowGeo = new THREE.RingGeometry(innerR, outerR, 32);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    planet.add(glow);

    // Additional atmospheric halo sprite
    var atmosGeo = new THREE.SphereGeometry(planetRadius * 1.15, 24, 24);
    var atmosMat = new THREE.MeshBasicMaterial({
      color: 0x6699ff,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.BackSide
    });
    var atmos = new THREE.Mesh(atmosGeo, atmosMat);
    planet.add(atmos);
  }

  /**
   * Faint ring for Neptune.
   */
  _createNeptuneRing(planet, planetRadius) {
    var innerR = planetRadius * 1.6;
    var outerR = planetRadius * 2.0;
    var ringGeo = new THREE.RingGeometry(innerR, outerR, 48);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0x4466aa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    planet.add(ring);
  }

  // ───────────────────────────────────────────
  // SECTION: Asteroid Belt
  // ───────────────────────────────────────────

  _createAsteroidBelt() {
    this.asteroidBelt = new THREE.Group();

    for (var i = 0; i < SOLAR_ASTEROID_COUNT; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = SOLAR_ASTEROID_INNER + Math.random() * (SOLAR_ASTEROID_OUTER - SOLAR_ASTEROID_INNER);
      var yOffset = (Math.random() - 0.5) * 0.8;
      var size = 0.05 + Math.random() * 0.1;

      var geo = new THREE.BoxGeometry(size, size, size);
      var mat = new THREE.MeshPhongMaterial({
        color: 0x666666,
        shininess: 5
      });
      var asteroid = new THREE.Mesh(geo, mat);

      asteroid.position.set(
        Math.cos(angle) * dist,
        yOffset,
        Math.sin(angle) * dist
      );
      asteroid.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.asteroidBelt.add(asteroid);
    }

    this.scene.add(this.asteroidBelt);
  }

  // ───────────────────────────────────────────
  // SECTION: Raycaster Setup
  // ───────────────────────────────────────────

  _setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.5 };
  }

  // ───────────────────────────────────────────
  // SECTION: Animation Loop
  // ───────────────────────────────────────────

  _animate() {
    this.animationId = requestAnimationFrame(this._boundTick);

    if (this._prefersReducedMotion) {
      var now = performance.now();
      if (now - this._lastFrameTime < 66) return;
      this._lastFrameTime = now;
    }

    var elapsed = this.clock.getElapsedTime();

    // --- Sol pulse: enhanced scale + atmosphere breathing ---
    var pulseT = (Math.sin((elapsed / SOLAR_SOL_PULSE_PERIOD) * Math.PI * 2) + 1) / 2;
    var pulseScale = SOLAR_SOL_PULSE_MIN + pulseT * (SOLAR_SOL_PULSE_MAX - SOLAR_SOL_PULSE_MIN);
    this.sol.scale.setScalar(pulseScale);

    // Atmosphere breathes inversely
    if (this.solAtmosphere) {
      this.solAtmosphere.scale.setScalar(pulseScale * 1.02);
      this.solAtmosphere.material.opacity = 0.1 + pulseT * 0.1;
    }

    // Slowly rotate sol surface to simulate plasma churning
    this.sol.rotation.y += 0.001;

    // Glow billboard faces camera
    if (this.solGlow) {
      this.solGlow.lookAt(this.camera.position);
      this.solGlow.material.opacity = 0.7 + pulseT * 0.2;
    }

    // --- Corona quads: billboard + pulse + shimmer ---
    for (var c = 0; c < this.coronaQuads.length; c++) {
      this.coronaQuads[c].lookAt(this.camera.position);
      this.coronaQuads[c].rotateZ((c * Math.PI) / 6);

      // Each quad shimmers at slightly different rate
      var shimmer = Math.sin(elapsed * 1.5 + c * 1.2) * 0.15;
      this.coronaQuads[c].material.opacity = 0.25 + pulseT * 0.2 + shimmer;

      // Subtle scale variation
      var coronaScale = 1.0 + Math.sin(elapsed * 0.8 + c * 0.7) * 0.05;
      this.coronaQuads[c].scale.setScalar(coronaScale);
    }

    // --- CME arcs: animate scale and opacity ---
    for (var m = 0; m < this.cmeArcs.length; m++) {
      var cme = this.cmeArcs[m];
      var cmeT = (Math.sin(elapsed * cme.speed + cme.phase) + 1) / 2;
      cme.mesh.material.opacity = 0.2 + cmeT * 0.5;
      var cmeScale = 0.7 + cmeT * 0.5;
      cme.mesh.scale.setScalar(cmeScale);
      // Slow rotation around Y to sweep the ejection around
      cme.mesh.rotation.y += 0.002;
    }

    // --- Planet orbits and self-rotation ---
    for (var i = 0; i < this.planets.length; i++) {
      var p = this.planets[i];
      var orbitAngle = (elapsed / p.period) * Math.PI * 2;
      p.mesh.position.x = Math.cos(orbitAngle) * p.orbitRadius;
      p.mesh.position.z = Math.sin(orbitAngle) * p.orbitRadius;
      p.mesh.position.y = 0;

      p.mesh.rotation.y += SOLAR_PLANET_SPIN_SPEED * 0.016;

      p.label.position.set(
        p.mesh.position.x,
        p.mesh.position.y + p.mesh.geometry.parameters.radius + 1.2,
        p.mesh.position.z
      );
      p.label.lookAt(this.camera.position);
    }

    // --- Asteroid belt slow rotation ---
    if (this.asteroidBelt) {
      this.asteroidBelt.rotation.y += 0.0002;
    }

    // --- Hover highlight via raycaster ---
    this.raycaster.setFromCamera(this.mouse, this.camera);
    var meshes = [];
    for (var j = 0; j < this.planets.length; j++) {
      meshes.push(this.planets[j].mesh);
    }
    var intersects = this.raycaster.intersectObjects(meshes);

    if (this.hoveredPlanet) {
      this.hoveredPlanet.mesh.material.emissiveIntensity = this.hoveredPlanet.originalEmissiveIntensity;
      this.renderer.domElement.style.cursor = 'grab';
      this.hoveredPlanet = null;
    }

    if (intersects.length > 0) {
      var hitMesh = intersects[0].object;
      for (var k = 0; k < this.planets.length; k++) {
        if (this.planets[k].mesh === hitMesh) {
          this.hoveredPlanet = this.planets[k];
          this.hoveredPlanet.mesh.material.emissiveIntensity = 0.4;
          this.renderer.domElement.style.cursor = 'pointer';
          break;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ───────────────────────────────────────────
  // SECTION: Public API
  // ───────────────────────────────────────────

  start() {
    if (this.animationId) return;
    this.clock.start();
    this._boundTick();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    clearTimeout(this._resizeTimer);
    window.removeEventListener('resize', this._boundResize);

    var canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this._boundMouseDown);
    canvas.removeEventListener('mousemove', this._boundMouseMove);
    canvas.removeEventListener('mouseup', this._boundMouseUp);
    canvas.removeEventListener('mouseleave', this._boundMouseUp);
    canvas.removeEventListener('wheel', this._boundWheel);
    canvas.removeEventListener('click', this._boundClick);
  }
}

// ───────────────────────────────────────────
// SECTION: Global Export
// ───────────────────────────────────────────
window.SolarSystemRenderer = SolarSystemRenderer;
