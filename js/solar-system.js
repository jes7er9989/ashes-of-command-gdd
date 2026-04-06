/* ═══════════════════════════════════════════════════════════
   solar-system.js — 3D Interactive Solar System Renderer
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: Three.js r128 (CDN)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   SolarSystemRenderer(container)     | Constructor — scene, camera, renderer
   _initScene()                       | Create scene, camera, renderer, lights
   _initMouseControls()               | Drag-to-rotate, scroll-to-zoom controls
   _createStarfield()                 | 500-point background star sphere
   _createSol()                       | Central star with corona quads
   _createPlanets()                   | All 7 planets with orbits and labels
   _createPlanet(cfg)                 | Single planet from config object
   _createOrbitPath(radius)           | Dashed circle orbit line
   _createNameLabel(name, color)      | Canvas-texture billboard label
   _createSaturnRing(planet)          | Tilted ring for Saturn
   _createTerraGlow(planet)           | Blue glow ring for Terra
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

const SOLAR_RENDERER_WIDTH = 800;
const SOLAR_RENDERER_HEIGHT = 500;
const SOLAR_RENDERER_MOBILE_HEIGHT = 300;
const SOLAR_RESIZE_DEBOUNCE_MS = 250;
const SOLAR_STARFIELD_COUNT = 500;
const SOLAR_STARFIELD_RADIUS = 120;
const SOLAR_ASTEROID_COUNT = 200;
const SOLAR_ASTEROID_INNER = 12;
const SOLAR_ASTEROID_OUTER = 14;
const SOLAR_SOL_RADIUS = 3;
const SOLAR_SOL_PULSE_MIN = 1.0;
const SOLAR_SOL_PULSE_MAX = 1.05;
const SOLAR_SOL_PULSE_PERIOD = 3.0; // seconds
const SOLAR_CORONA_SIZE = 8;
const SOLAR_CAMERA_INITIAL_THETA = Math.PI / 4;   // polar angle from Y axis
const SOLAR_CAMERA_INITIAL_PHI = 0;               // azimuthal angle around Y
const SOLAR_CAMERA_INITIAL_DIST = 50;
const SOLAR_CAMERA_MIN_DIST = 10;
const SOLAR_CAMERA_MAX_DIST = 100;
const SOLAR_DRAG_SENSITIVITY = 0.005;
const SOLAR_ZOOM_SENSITIVITY = 0.05;
const SOLAR_PLANET_SPIN_SPEED = 0.3; // radians per second self-rotation

// Planet definitions — each entry fully specified
const SOLAR_PLANETS = [
  { name: 'Mercury', radius: 0.3,  color: 0x888888, orbit: 5,  period: 8,  hasRing: false, hasTerraGlow: false },
  { name: 'Venus',   radius: 0.5,  color: 0xeedd88, orbit: 7,  period: 12, hasRing: false, hasTerraGlow: false },
  { name: 'Terra',   radius: 0.55, color: 0x4488ff, orbit: 9,  period: 16, hasRing: false, hasTerraGlow: true  },
  { name: 'Mars',    radius: 0.4,  color: 0xcc4422, orbit: 11, period: 20, hasRing: false, hasTerraGlow: false },
  { name: 'Jupiter', radius: 1.2,  color: 0xdd9944, orbit: 15, period: 30, hasRing: false, hasTerraGlow: false },
  { name: 'Saturn',  radius: 1.0,  color: 0xddbb66, orbit: 19, period: 40, hasRing: true,  hasTerraGlow: false },
  { name: 'Neptune', radius: 0.6,  color: 0x2244aa, orbit: 23, period: 55, hasRing: false, hasTerraGlow: false }
];

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
    this.planets = [];       // { mesh, orbitRadius, period, label, name }
    this.asteroidBelt = null;
    this.sol = null;
    this.coronaQuads = [];
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

    // Bind resize handler and tick
    this._boundResize = this._onResize.bind(this);
    this._boundTick = this._animate.bind(this);
    window.addEventListener('resize', this._boundResize);
  }

  // ───────────────────────────────────────────
  // SECTION: Scene Initialization
  // ───────────────────────────────────────────

  /**
   * Creates the Three.js scene, camera, renderer, and ambient light.
   * Appends the canvas to the container element.
   */
  _initScene() {
    this.scene = new THREE.Scene();

    var w = this._getRendererWidth();
    var h = this._getRendererHeight();

    this.camera = new THREE.PerspectiveCamera(
      50,                                                   // FOV
      w / h,                                                // aspect
      0.1,                                                  // near
      500                                                   // far
    );

    var maxDpr = this._isMobile ? 1.5 : 2;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

    // Responsive canvas styling
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.maxWidth = SOLAR_RENDERER_WIDTH + 'px';
    this.renderer.domElement.style.height = 'auto';

    this.container.appendChild(this.renderer.domElement);

    // Subtle ambient so the dark side of planets isn't pure black
    const ambient = new THREE.AmbientLight(0x222233, 0.4);
    this.scene.add(ambient);
  }

  /**
   * Returns the appropriate renderer width based on container/viewport.
   * @returns {number}
   */
  _getRendererWidth() {
    var containerW = this.container ? this.container.clientWidth : window.innerWidth;
    return Math.min(containerW, SOLAR_RENDERER_WIDTH);
  }

  /**
   * Returns the appropriate renderer height based on mobile breakpoint.
   * @returns {number}
   */
  _getRendererHeight() {
    if (this._isMobile) return SOLAR_RENDERER_MOBILE_HEIGHT;
    var w = this._getRendererWidth();
    return Math.round(w * (SOLAR_RENDERER_HEIGHT / SOLAR_RENDERER_WIDTH));
  }

  /**
   * Debounced resize handler — updates renderer size and camera aspect.
   */
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

  /**
   * Binds mouse/wheel events for drag-to-rotate and scroll-to-zoom.
   * Stores bound references so they can be cleaned up later.
   */
  _initMouseControls() {
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundWheel = this._onWheel.bind(this);
    this._boundClick = this._onClick.bind(this);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this._boundMouseDown);
    canvas.addEventListener('mousemove', this._boundMouseMove);
    canvas.addEventListener('mouseup', this._boundMouseUp);
    canvas.addEventListener('mouseleave', this._boundMouseUp);
    canvas.addEventListener('wheel', this._boundWheel, { passive: false });
    canvas.addEventListener('click', this._boundClick);
  }

  /**
   * Begin drag — record start position.
   * @param {MouseEvent} e
   */
  _onMouseDown(e) {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  /**
   * During drag — update spherical camera angles.
   * When not dragging — update hover highlight via raycaster.
   * @param {MouseEvent} e
   */
  _onMouseMove(e) {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.cameraPhi -= dx * SOLAR_DRAG_SENSITIVITY;
      // Clamp theta so camera can't flip past poles
      this.cameraTheta = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraTheta + dy * SOLAR_DRAG_SENSITIVITY));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this._updateCameraPosition();
    }

    // Update hover detection
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * End drag.
   */
  _onMouseUp() {
    this.isDragging = false;
  }

  /**
   * Scroll-to-zoom — adjusts camera distance from origin.
   * @param {WheelEvent} e
   */
  _onWheel(e) {
    e.preventDefault();
    this.cameraDist += e.deltaY * SOLAR_ZOOM_SENSITIVITY;
    this.cameraDist = Math.max(SOLAR_CAMERA_MIN_DIST, Math.min(SOLAR_CAMERA_MAX_DIST, this.cameraDist));
    this._updateCameraPosition();
  }

  /**
   * Click detection — if Terra is clicked, navigate to #ch5.
   * @param {MouseEvent} e
   */
  _onClick(e) {
    // Don't trigger navigation if user was dragging
    if (this.isDragging) return;  // safety — already false, but guard anyway

    const rect = this.renderer.domElement.getBoundingClientRect();
    const clickMouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(clickMouse, this.camera);
    const meshes = this.planets.map(function(p) { return p.mesh; });
    const hits = this.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      var hitMesh = hits[0].object;
      for (var i = 0; i < this.planets.length; i++) {
        if (this.planets[i].mesh === hitMesh && this.planets[i].name === 'Terra') {
          // Navigate to Terran League chapter
          location.hash = '#ch5';
          return;  // Terra clicked — navigate
        }
      }
    }
  }

  /**
   * Converts spherical coordinates (theta, phi, dist) to cartesian
   * and updates camera position + lookAt origin.
   */
  _updateCameraPosition() {
    var x = this.cameraDist * Math.sin(this.cameraTheta) * Math.sin(this.cameraPhi);
    var y = this.cameraDist * Math.cos(this.cameraTheta);
    var z = this.cameraDist * Math.sin(this.cameraTheta) * Math.cos(this.cameraPhi);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // ───────────────────────────────────────────
  // SECTION: Starfield Background
  // ───────────────────────────────────────────

  /**
   * Creates 500 tiny white points scattered in a large sphere
   * around the entire scene as a starfield backdrop.
   */
  _createStarfield() {
    var positions = new Float32Array(SOLAR_STARFIELD_COUNT * 3);
    for (var i = 0; i < SOLAR_STARFIELD_COUNT; i++) {
      // Uniform distribution on sphere surface
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = SOLAR_STARFIELD_RADIUS + (Math.random() - 0.5) * 20; // slight depth variation
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });

    var stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  // ───────────────────────────────────────────
  // SECTION: Sol (Central Star)
  // ───────────────────────────────────────────

  /**
   * Creates the central star Sol:
   *  - Emissive yellow-white sphere (radius 3)
   *  - PointLight at center for illumination
   *  - 4 corona billboard quads extending outward
   */
  _createSol() {
    // Star sphere
    var solGeo = new THREE.SphereGeometry(SOLAR_SOL_RADIUS, 32, 32);
    var solMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sol = new THREE.Mesh(solGeo, solMat);
    this.scene.add(this.sol);

    // Point light at star center
    var light = new THREE.PointLight(0xfff5e0, 2, 200);
    light.position.set(0, 0, 0);
    this.scene.add(light);

    // Corona — 4 thin quads billboarding around the star
    this.coronaQuads = [];
    for (var i = 0; i < 4; i++) {
      var coronaGeo = new THREE.PlaneGeometry(SOLAR_CORONA_SIZE, 0.3);
      var coronaMat = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      var quad = new THREE.Mesh(coronaGeo, coronaMat);
      // Rotate each quad 45 degrees apart around Z to form a cross/star pattern
      quad.rotation.z = (i * Math.PI) / 4;
      this.scene.add(quad);
      this.coronaQuads.push(quad);
    }
  }

  // ───────────────────────────────────────────
  // SECTION: Planets
  // ───────────────────────────────────────────

  /**
   * Creates all 7 planets from the SOLAR_PLANETS config array.
   * Each planet gets an orbit path, name label, and optional ring/glow.
   */
  _createPlanets() {
    for (var i = 0; i < SOLAR_PLANETS.length; i++) {
      this._createPlanet(SOLAR_PLANETS[i]);
    }
  }

  /**
   * Creates a single planet with its orbit path, name label, and optional features.
   * @param {Object} cfg — planet config from SOLAR_PLANETS
   */
  _createPlanet(cfg) {
    // Planet sphere
    var geo = new THREE.SphereGeometry(cfg.radius, 24, 24);
    var mat = new THREE.MeshPhongMaterial({
      color: cfg.color,
      shininess: 30,
      emissive: cfg.color,
      emissiveIntensity: 0.05
    });
    var mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);

    // Orbit path — dashed circle
    this._createOrbitPath(cfg.orbit);

    // Name label — canvas-texture billboard
    var label = this._createNameLabel(cfg.name, cfg.color);
    this.scene.add(label);

    // Saturn ring
    if (cfg.hasRing) {
      this._createSaturnRing(mesh, cfg.radius);
    }

    // Terra glow ring
    if (cfg.hasTerraGlow) {
      this._createTerraGlow(mesh, cfg.radius);
    }

    this.planets.push({
      mesh: mesh,
      orbitRadius: cfg.orbit,
      period: cfg.period,
      label: label,
      name: cfg.name,
      originalEmissiveIntensity: 0.05
    });
  }

  /**
   * Creates a dashed circle in the XZ plane showing the orbit path.
   * @param {number} radius — orbit radius
   */
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
    line.computeLineDistances(); // required for dashed material
    this.scene.add(line);
  }

  /**
   * Creates a billboard name label using a canvas texture.
   * The label always faces the camera via lookAt in the animation loop.
   * @param {string} name — planet name
   * @param {number} color — hex color for text
   * @returns {THREE.Mesh} — label mesh to add to scene
   */
  _createNameLabel(name, color) {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');

    // Convert hex to CSS color string
    var r = (color >> 16) & 0xff;
    var g = (color >> 8) & 0xff;
    var b = color & 0xff;
    var cssColor = 'rgb(' + r + ',' + g + ',' + b + ')';

    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 28px Orbitron, Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Subtle text shadow for readability
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
   * Creates Saturn's iconic ring — tilted 25 degrees.
   * @param {THREE.Mesh} planet — the Saturn mesh to attach ring near
   * @param {number} planetRadius — Saturn's sphere radius
   */
  _createSaturnRing(planet, planetRadius) {
    var innerR = planetRadius * 1.4;
    var outerR = planetRadius * 2.3;
    var ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0xccaa55,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    // Tilt 25 degrees — ring lies in XZ by default after rotation
    ring.rotation.x = -Math.PI / 2 + (25 * Math.PI / 180);
    planet.add(ring); // child of Saturn so it follows orbit
  }

  /**
   * Creates Terra's blue glow ring to make Earth visually distinct.
   * @param {THREE.Mesh} planet — the Terra mesh
   * @param {number} planetRadius — Terra's sphere radius
   */
  _createTerraGlow(planet, planetRadius) {
    var innerR = planetRadius * 1.1;
    var outerR = planetRadius * 1.6;
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
    planet.add(glow); // child of Terra so it follows orbit
  }

  // ───────────────────────────────────────────
  // SECTION: Asteroid Belt
  // ───────────────────────────────────────────

  /**
   * Scatters 200 tiny cubes between Mars and Jupiter orbits (radius 12–14).
   * All asteroids are grouped so they rotate collectively.
   */
  _createAsteroidBelt() {
    this.asteroidBelt = new THREE.Group();

    for (var i = 0; i < SOLAR_ASTEROID_COUNT; i++) {
      // Random position in the belt ring
      var angle = Math.random() * Math.PI * 2;
      var dist = SOLAR_ASTEROID_INNER + Math.random() * (SOLAR_ASTEROID_OUTER - SOLAR_ASTEROID_INNER);
      var yOffset = (Math.random() - 0.5) * 0.8; // slight vertical scatter
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
      // Random rotation so they don't all look identical
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

  /**
   * Initializes the raycaster used for hover/click detection on planets.
   * The actual raycasting happens in _onMouseMove and _onClick.
   */
  _setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    // Set threshold for point picking — not needed for mesh intersection
    // but useful if we later add point-based objects
    this.raycaster.params.Points = { threshold: 0.5 };
  }

  // ───────────────────────────────────────────
  // SECTION: Animation Loop
  // ───────────────────────────────────────────

  /**
   * Main animation loop — called every frame via requestAnimationFrame.
   * Updates planet orbits, Sol pulse, corona billboarding, asteroid rotation,
   * hover highlights, and renders the scene.
   */
  _animate() {
    this.animationId = requestAnimationFrame(this._boundTick);

    /* Reduced motion: throttle to ~15fps */
    if (this._prefersReducedMotion) {
      var now = performance.now();
      if (now - this._lastFrameTime < 66) return;
      this._lastFrameTime = now;
    }

    var elapsed = this.clock.getElapsedTime();

    // --- Sol pulse: scale oscillates between 1.0 and 1.05 ---
    var pulseT = (Math.sin((elapsed / SOLAR_SOL_PULSE_PERIOD) * Math.PI * 2) + 1) / 2;
    var pulseScale = SOLAR_SOL_PULSE_MIN + pulseT * (SOLAR_SOL_PULSE_MAX - SOLAR_SOL_PULSE_MIN);
    this.sol.scale.setScalar(pulseScale);

    // --- Corona quads always face camera (billboard) ---
    for (var c = 0; c < this.coronaQuads.length; c++) {
      this.coronaQuads[c].lookAt(this.camera.position);
      // Maintain the cross-pattern rotation after billboarding
      this.coronaQuads[c].rotateZ((c * Math.PI) / 4);
      // Pulse corona opacity subtly
      this.coronaQuads[c].material.opacity = 0.3 + pulseT * 0.2;
    }

    // --- Planet orbits and self-rotation ---
    for (var i = 0; i < this.planets.length; i++) {
      var p = this.planets[i];
      // Circular orbit in XZ plane
      var orbitAngle = (elapsed / p.period) * Math.PI * 2;
      p.mesh.position.x = Math.cos(orbitAngle) * p.orbitRadius;
      p.mesh.position.z = Math.sin(orbitAngle) * p.orbitRadius;
      p.mesh.position.y = 0;

      // Self-rotation on Y axis
      p.mesh.rotation.y += SOLAR_PLANET_SPIN_SPEED * 0.016; // ~60fps approximation

      // Label follows planet, offset above
      p.label.position.set(
        p.mesh.position.x,
        p.mesh.position.y + p.mesh.geometry.parameters.radius + 1.2,
        p.mesh.position.z
      );
      // Billboard — label always faces camera
      p.label.lookAt(this.camera.position);
    }

    // --- Asteroid belt slow collective rotation ---
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

    // Reset previous hover
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
          // Emissive boost on hover
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

  /**
   * Starts the animation loop. Safe to call multiple times.
   */
  start() {
    if (this.animationId) return;  // already running
    this.clock.start();
    this._boundTick();
  }

  /**
   * Stops the animation loop and cleans up event listeners.
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Remove resize listener
    clearTimeout(this._resizeTimer);
    window.removeEventListener('resize', this._boundResize);

    // Remove event listeners from canvas
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
