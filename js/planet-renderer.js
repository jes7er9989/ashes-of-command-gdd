/* ═══════════════════════════════════════════════════════════════
   PLANET RENDERER v2 — Three.js 3D Planet Visualization
   Renders each planet type as a spinning 3D sphere with procedural
   textures, emissive maps, atmospheric glow, and unique effects.
   ═══════════════════════════════════════════════════════════════ */

window.PlanetRenderer = (function () {
  'use strict';

  const instances = [];
  let animating = false;

  function tick() {
    if (!animating) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < instances.length; i++) instances[i].update(t);
    requestAnimationFrame(tick);
  }

  function startLoop() {
    if (animating) return;
    animating = true;
    requestAnimationFrame(tick);
  }

  class Planet {
    constructor(container, type) {
      this.container = container;
      this.type = type;
      this.meshes = []; // all rotating meshes {mesh, speed}

      // Use explicit container dimensions; fall back to 400 if not laid out yet
      let size = container.clientWidth || 400;
      let h = container.clientHeight || size;
      // On mobile, container may be small — floor at 200
      if (size < 200) size = 200;
      if (h < 200) h = size;

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setSize(size, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setClearColor(0x000000, 0);
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, size / h, 0.1, 100);
      this.camera.position.z = 3.2;

      // ResizeObserver for responsive layout
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObs = new ResizeObserver(function(entries) {
          for (var e of entries) {
            var w = e.contentRect.width;
            var newH = e.contentRect.height;
            if (w > 50 && newH > 50) {
              this.renderer.setSize(w, newH);
              this.camera.aspect = w / newH;
              this.camera.updateProjectionMatrix();
            }
          }
        }.bind(this));
        this._resizeObs.observe(container);
      }

      /* Lighting */
      const sun = new THREE.DirectionalLight(0xffffff, 1.3);
      sun.position.set(3, 1.5, 4);
      this.scene.add(sun);

      const fill = new THREE.DirectionalLight(0x334466, 0.2);
      fill.position.set(-2, -1, 2);
      this.scene.add(fill);

      const ambient = new THREE.AmbientLight(0x1a1a2a, 0.35);
      this.scene.add(ambient);

      this._starfield();
      this._build(type);
      this.renderer.render(this.scene, this.camera);
    }

    _build(type) {
      const map = {
        'Capital World': '_capitalWorld',
        'Terrestrial': '_terrestrial',
        'Volcanic': '_volcanic',
        'Ocean/Archipelago': '_ocean',
        'Jungle': '_jungle',
        'Desert': '_desert',
        'Ice World': '_iceWorld',
        'Ancient Ruins': '_ancientRuins',
        'Gas Giant': '_gasGiant',
        'Moon': '_moon',
        'Orbital Station': '_orbitalStation',
        'Dead World': '_deadWorld',
      };
      const fn = map[type] || '_terrestrial';
      this[fn]();
    }

    /* ── Helpers ── */
    _starfield() {
      const geo = new THREE.BufferGeometry();
      const v = [];
      for (let i = 0; i < 300; i++) {
        const r = 12 + Math.random() * 25;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI;
        v.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      const sizes = new Float32Array(300);
      for (let i = 0; i < 300; i++) sizes[i] = 0.04 + Math.random() * 0.06;
      geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
      this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.7, sizeAttenuation: true })));
    }

    _planet(radius, texData, opts) {
      opts = opts || {};
      const geo = new THREE.SphereGeometry(radius, 64, 64);
      const matOpts = {
        shininess: opts.shininess || 15,
      };
      if (texData && texData.map) {
        matOpts.map = texData.map;
      } else {
        matOpts.color = opts.color || 0x888888;
      }
      if (texData && texData.emissive) {
        matOpts.emissiveMap = texData.emissive;
        matOpts.emissive = new THREE.Color(opts.emissiveColor || 0xffffff);
        matOpts.emissiveIntensity = opts.emissiveIntensity || 0.8;
      }
      const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial(matOpts));
      this.scene.add(mesh);
      return mesh;
    }

    _addRotation(mesh, speed) {
      this.meshes.push({ mesh: mesh, speed: speed });
    }

    _atmosphere(radius, color, opacity) {
      const geo = new THREE.SphereGeometry(radius, 48, 48);
      const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
        color: color, transparent: true, opacity: opacity || 0.12,
        side: THREE.BackSide, depthWrite: false,
      }));
      this.scene.add(mesh);
      return mesh;
    }

    _cloudLayer(radius, speed, texture) {
      const geo = new THREE.SphereGeometry(radius, 48, 48);
      const matOpts = { transparent: true, depthWrite: false };
      if (texture) {
        matOpts.map = texture;
        matOpts.alphaMap = texture;
        matOpts.opacity = 0.6;
      } else {
        matOpts.color = 0xffffff;
        matOpts.opacity = 0.15;
      }
      const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial(matOpts));
      this.scene.add(mesh);
      this._addRotation(mesh, speed);
      return mesh;
    }

    _ring(innerR, outerR, color, opacity) {
      const geo = new THREE.RingGeometry(innerR, outerR, 96);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: color, side: THREE.DoubleSide, transparent: true, opacity: opacity || 0.25,
      }));
      mesh.rotation.x = Math.PI * 0.42;
      this.scene.add(mesh);
      return mesh;
    }

    /* ════════════════════════════════════
       PLANET BUILDERS
       ════════════════════════════════════ */

    _capitalWorld() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.capitalWorld() : null;
      this.planet = this._planet(1, tex, { shininess: 22, emissiveColor: 0xffcc66, emissiveIntensity: 1.0 });
      this._addRotation(this.planet, 0.004);

      this._atmosphere(1.06, 0xd4a860, 0.10);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      this._cloudLayer(1.02, 0.002, cloudTex);

      // Orbital defense ring
      this._ring(1.35, 1.38, 0x8899aa, 0.18);
      this._ring(1.40, 1.42, 0xaabbcc, 0.10);
    }

    _terrestrial() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.terrestrial() : null;
      this.planet = this._planet(1, tex, { shininess: 35 });
      this._addRotation(this.planet, 0.003);

      this._atmosphere(1.06, 0x4488cc, 0.14);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      this._cloudLayer(1.022, 0.003, cloudTex);
      this._cloudLayer(1.035, -0.002, cloudTex);
    }

    _volcanic() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.volcanic() : null;
      this.planet = this._planet(1, tex, { shininess: 8, emissiveColor: 0xff6600, emissiveIntensity: 1.5 });
      this._addRotation(this.planet, 0.0025);

      this._atmosphere(1.06, 0xff3300, 0.08);
      const ashTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.ashClouds() : null;
      this._cloudLayer(1.025, 0.001, ashTex);

      // Eruption glow
      this.eruption = new THREE.PointLight(0xff8800, 0.6, 3);
      this.eruption.position.set(0.5, 0.3, 0.85);
      this.planet.add(this.eruption);
    }

    _ocean() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.ocean() : null;
      this.planet = this._planet(1, tex, { shininess: 55 });
      this._addRotation(this.planet, 0.003);

      this._atmosphere(1.06, 0x4488cc, 0.16);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      this._cloudLayer(1.02, 0.004, cloudTex);
      this._cloudLayer(1.035, -0.003, cloudTex);
    }

    _jungle() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.jungle() : null;
      this.planet = this._planet(1, tex, { shininess: 12, emissiveColor: 0x22ff88, emissiveIntensity: 0.5 });
      this._addRotation(this.planet, 0.003);

      this._atmosphere(1.06, 0x22aa44, 0.10);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      this._cloudLayer(1.018, 0.0035, cloudTex);
      this._cloudLayer(1.03, -0.002, cloudTex);
      this._cloudLayer(1.045, 0.0015, cloudTex);
    }

    _desert() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.desert() : null;
      this.planet = this._planet(1, tex, { shininess: 25 });
      this._addRotation(this.planet, 0.002);

      this._atmosphere(1.06, 0xd4a850, 0.06);
      // Thin sandstorm haze
      const c = this._cloudLayer(1.025, 0.002, null);
      c.material.color.set(0xd8b060);
      c.material.opacity = 0.04;
    }

    _iceWorld() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.iceWorld() : null;
      this.planet = this._planet(1, tex, { shininess: 60 });
      this._addRotation(this.planet, 0.0025);

      this._atmosphere(1.06, 0x88bbee, 0.14);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      this._cloudLayer(1.02, 0.003, cloudTex);
      this._cloudLayer(1.035, -0.002, cloudTex);

      // Aurora
      this.aurora = new THREE.PointLight(0x44ff88, 0.25, 3);
      this.aurora.position.set(-0.3, 0.9, -0.4);
      this.scene.add(this.aurora);
      this.aurora2 = new THREE.PointLight(0x8888ff, 0.15, 2.5);
      this.aurora2.position.set(-0.5, 0.7, -0.5);
      this.scene.add(this.aurora2);
    }

    _ancientRuins() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.ancientRuins() : null;
      this.planet = this._planet(1, tex, { shininess: 10, emissiveColor: 0xaa88ff, emissiveIntensity: 1.2 });
      this._addRotation(this.planet, 0.0015);
      this._atmosphere(1.06, 0x9977dd, 0.08);
    }

    _gasGiant() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.gasGiant() : null;
      this.planet = this._planet(1, tex, { shininess: 20 });
      this._addRotation(this.planet, 0.006);

      // Saturn-style rings
      this._ring(1.40, 1.48, 0xd8c0a0, 0.22);
      this._ring(1.50, 1.56, 0xc8b090, 0.14);
      this._ring(1.58, 1.62, 0xb8a080, 0.08);
      this._ring(1.34, 1.39, 0xc8b890, 0.10);

      // Moons
      const moonColors = [0xc8c0b0, 0xa8a098, 0xb8b0a0];
      const moonDist = [2.0, 2.3, 1.75];
      const moonSize = [0.06, 0.04, 0.035];
      const moonAngle = [0.5, 2.1, 4.2];
      this.moons = [];
      for (let i = 0; i < 3; i++) {
        const geo = new THREE.SphereGeometry(moonSize[i], 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color: moonColors[i], shininess: 5 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(
          Math.cos(moonAngle[i]) * moonDist[i],
          Math.sin(moonAngle[i] * 0.3) * moonDist[i] * 0.2,
          Math.sin(moonAngle[i]) * moonDist[i]
        );
        this.scene.add(m);
        this.moons.push({ mesh: m, dist: moonDist[i], speed: 0.12 + i * 0.05, offset: moonAngle[i] });
      }

      this._atmosphere(1.05, 0xd4a850, 0.06);
    }

    _moon() {
      // Background parent planet
      const bgGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const bgMat = new THREE.MeshPhongMaterial({ color: 0x1a3060, transparent: true, opacity: 0.12 });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      bg.position.set(4, -2, -6);
      this.scene.add(bg);

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.moon() : null;
      this.planet = this._planet(1, tex, { shininess: 6 });
      this._addRotation(this.planet, 0.001);
    }

    _deadWorld() {
      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.deadWorld() : null;
      this.planet = this._planet(1, tex, { shininess: 4, emissiveColor: 0x884422, emissiveIntensity: 0.6 });
      this._addRotation(this.planet, 0.0008);

      // Orbiting debris field
      this.debrisGroup = new THREE.Group();
      for (let i = 0; i < 20; i++) {
        const s = 0.008 + Math.random() * 0.015;
        const geo = new THREE.BoxGeometry(s, s * 0.6, s * 0.4);
        const mat = new THREE.MeshPhongMaterial({ color: 0x585048 });
        const deb = new THREE.Mesh(geo, mat);
        const a = (i / 20) * Math.PI * 2;
        const dist = 1.25 + Math.random() * 0.35;
        deb.position.set(Math.cos(a) * dist, (Math.random() - 0.5) * 0.25, Math.sin(a) * dist);
        deb.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        this.debrisGroup.add(deb);
      }
      this.scene.add(this.debrisGroup);
    }

    /* ════════════════════════════════════
       ORBITAL STATION — Proper Space Station
       ════════════════════════════════════ */
    _orbitalStation() {
      // Background planet
      const bgGeo = new THREE.SphereGeometry(2, 32, 32);
      const bgMat = new THREE.MeshPhongMaterial({ color: 0x1a3060, transparent: true, opacity: 0.10 });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      bg.position.set(-3.5, -2, -5);
      this.scene.add(bg);

      this.station = new THREE.Group();
      const hullMat = new THREE.MeshPhongMaterial({ color: 0x3a3e4a, shininess: 40 });
      const darkMat = new THREE.MeshPhongMaterial({ color: 0x1a1c24, shininess: 20 });
      const panelMat = new THREE.MeshPhongMaterial({ color: 0x1a2840, shininess: 45, emissive: 0x112244, emissiveIntensity: 0.15 });
      const accentMat = new THREE.MeshPhongMaterial({ color: 0x556070, shininess: 30 });
      const windowMat = new THREE.MeshPhongMaterial({ color: 0xaaddff, emissive: 0x88bbee, emissiveIntensity: 0.4, shininess: 60 });

      /* Central hub — cylinder */
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16), hullMat);
      hub.rotation.z = Math.PI / 2;
      this.station.add(hub);

      /* Command module — dome on front */
      const cmdDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hullMat);
      cmdDome.rotation.z = -Math.PI / 2;
      cmdDome.position.x = 0.25;
      this.station.add(cmdDome);

      /* Window ring on command module */
      for (let i = 0; i < 6; i++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.008), windowMat);
        const a = (i / 6) * Math.PI * 2;
        w.position.set(0.28, Math.cos(a) * 0.10, Math.sin(a) * 0.10);
        this.station.add(w);
      }

      /* Engine section — tapered back */
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.3, 16), darkMat);
      engine.rotation.z = Math.PI / 2;
      engine.position.x = -0.38;
      this.station.add(engine);

      /* Engine nozzles */
      for (let i = 0; i < 4; i++) {
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.08, 8), darkMat);
        nozzle.rotation.z = Math.PI / 2;
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        nozzle.position.set(-0.56, Math.cos(a) * 0.05, Math.sin(a) * 0.05);
        this.station.add(nozzle);

        // Engine glow
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.4 });
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), glowMat);
        glow.rotation.y = Math.PI / 2;
        glow.position.set(-0.60, Math.cos(a) * 0.05, Math.sin(a) * 0.05);
        this.station.add(glow);
      }

      /* Main truss (backbone) */
      const truss = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.02), accentMat);
      this.station.add(truss);

      /* Cross-truss supports */
      for (let i = -2; i <= 2; i++) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.3, 0.008), accentMat);
        cross.position.x = i * 0.25;
        this.station.add(cross);
      }

      /* Solar panel arrays — 4 panels, 2 per side */
      const panelPositions = [
        { x: -0.5, y: 0.22, rz: 0 },
        { x: -0.5, y: -0.22, rz: 0 },
        { x: 0.5, y: 0.22, rz: 0 },
        { x: 0.5, y: -0.22, rz: 0 },
      ];
      for (let pp of panelPositions) {
        const panelGroup = new THREE.Group();

        // Main panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.005, 0.15), panelMat);
        panelGroup.add(panel);

        // Panel frame
        const frame = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(0.35, 0.006, 0.15)),
          new THREE.LineBasicMaterial({ color: 0x667788, transparent: true, opacity: 0.4 })
        );
        panelGroup.add(frame);

        // Cell grid lines on panels
        for (let cx = -3; cx <= 3; cx++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.007, 0.15), accentMat);
          line.position.x = cx * 0.05;
          panelGroup.add(line);
        }
        for (let cz = -2; cz <= 2; cz++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.007, 0.001), accentMat);
          line.position.z = cz * 0.05;
          panelGroup.add(line);
        }

        // Connecting arm
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, Math.abs(pp.y) * 1.3, 6), accentMat);
        arm.position.y = -pp.y * 0.35;
        panelGroup.add(arm);

        panelGroup.position.set(pp.x, pp.y, 0);
        this.station.add(panelGroup);
      }

      /* Habitat ring (toroidal) */
      const habRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 12, 32), hullMat);
      habRing.rotation.x = Math.PI / 2;
      this.station.add(habRing);
      this.habRing = habRing;

      // Ring spokes
      for (let i = 0; i < 6; i++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.28, 4), accentMat);
        const a = (i / 6) * Math.PI * 2;
        spoke.position.set(0, Math.cos(a) * 0.14, Math.sin(a) * 0.14);
        spoke.rotation.x = a;
        this.station.add(spoke);
      }

      // Windows on hab ring (emissive dots)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const wx = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), windowMat);
        wx.position.set(0, Math.cos(a) * 0.28, Math.sin(a) * 0.28);
        this.station.add(wx);
      }

      /* Docking modules — top and bottom */
      const dockGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
      const dockTop = new THREE.Mesh(dockGeo, hullMat);
      dockTop.position.set(0.15, 0.18, 0);
      this.station.add(dockTop);
      const dockBot = new THREE.Mesh(dockGeo, hullMat);
      dockBot.position.set(0.15, -0.18, 0);
      this.station.add(dockBot);

      // Docking port rings
      const ringGeo = new THREE.TorusGeometry(0.04, 0.005, 6, 12);
      const ringMatL = new THREE.MeshPhongMaterial({ color: 0x889988 });
      const rt = new THREE.Mesh(ringGeo, ringMatL);
      rt.position.set(0.15, 0.24, 0);
      this.station.add(rt);
      const rb = new THREE.Mesh(ringGeo, ringMatL.clone());
      rb.position.set(0.15, -0.24, 0);
      this.station.add(rb);

      /* Antenna dish */
      const dishGeo = new THREE.ConeGeometry(0.06, 0.03, 12, 1, true);
      const dish = new THREE.Mesh(dishGeo, accentMat);
      dish.position.set(0.35, 0.08, 0);
      dish.rotation.z = -Math.PI / 2;
      this.station.add(dish);

      // Antenna mast
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.15, 4), accentMat);
      mast.position.set(0.35, 0.15, 0);
      this.station.add(mast);

      /* Nav lights */
      this.navRed = new THREE.PointLight(0xff2222, 0.4, 2);
      this.navRed.position.set(-0.8, 0, 0.08);
      this.station.add(this.navRed);

      this.navGreen = new THREE.PointLight(0x22ff22, 0.4, 2);
      this.navGreen.position.set(0.8, 0, 0.08);
      this.station.add(this.navGreen);

      this.beacon = new THREE.PointLight(0xffffff, 0.3, 2);
      this.beacon.position.set(0, 0.35, 0);
      this.station.add(this.beacon);

      // Additional hull lighting
      const hullLight = new THREE.PointLight(0xaaccff, 0.2, 1.5);
      hullLight.position.set(0, 0, 0.2);
      this.station.add(hullLight);

      this.scene.add(this.station);

      // Slight tilt so it's not perfectly axis-aligned
      this.station.rotation.x = 0.15;
      this.station.rotation.z = 0.1;

      this.planet = this.station; // for update references
    }

    /* ════════════════════════════════════
       UPDATE
       ════════════════════════════════════ */
    update(t) {
      // Standard mesh rotations
      for (let i = 0; i < this.meshes.length; i++) {
        this.meshes[i].mesh.rotation.y += this.meshes[i].speed;
      }

      // Volcanic eruption flicker
      if (this.eruption) {
        this.eruption.intensity = 0.3 + Math.sin(t * 8) * 0.2 + Math.sin(t * 13) * 0.15;
      }

      // Aurora (ice world)
      if (this.aurora) {
        this.aurora.intensity = 0.12 + Math.sin(t * 0.7) * 0.12;
        this.aurora.position.x = -0.3 + Math.sin(t * 0.4) * 0.15;
      }
      if (this.aurora2) {
        this.aurora2.intensity = 0.08 + Math.sin(t * 0.5 + 1) * 0.08;
      }

      // Gas giant moons orbit
      if (this.moons) {
        for (let i = 0; i < this.moons.length; i++) {
          const m = this.moons[i];
          const a = t * m.speed + m.offset;
          m.mesh.position.set(
            Math.cos(a) * m.dist,
            Math.sin(a * 0.3) * m.dist * 0.2,
            Math.sin(a) * m.dist
          );
        }
      }

      // Orbital station
      if (this.type === 'Orbital Station') {
        this.station.rotation.y += 0.002;
        if (this.habRing) this.habRing.rotation.z += 0.01;
        if (this.navRed) this.navRed.intensity = Math.sin(t * 3) > 0 ? 0.4 : 0.02;
        if (this.navGreen) this.navGreen.intensity = Math.sin(t * 3) > 0 ? 0.4 : 0.02;
        if (this.beacon) this.beacon.intensity = Math.sin(t * 4.5) > 0.3 ? 0.3 : 0.02;
      }

      // Dead world debris
      if (this.debrisGroup) {
        this.debrisGroup.rotation.y += 0.0004;
      }

      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      if (this._resizeObs) this._resizeObs.disconnect();
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  return {
    create: function (container, type) {
      if (typeof THREE === 'undefined') { console.warn('PlanetRenderer: Three.js not loaded'); return null; }
      try {
        const planet = new Planet(container, type);
        /* Verify WebGL context was actually created */
        if (!planet.renderer || !planet.renderer.getContext()) {
          throw new Error('WebGL context unavailable');
        }
        instances.push(planet);
        startLoop();
        return planet;
      } catch (e) {
        console.warn('PlanetRenderer: WebGL failed for ' + type + ', falling back to SVG', e);
        /* Clean up any partial renderer */
        var canvas = container.querySelector('canvas');
        if (canvas) canvas.remove();
        /* Signal caller to use SVG fallback */
        container.classList.add('planet-webgl-failed');
        return null;
      }
    },
    disposeAll: function () {
      for (let i = 0; i < instances.length; i++) instances[i].dispose();
      instances.length = 0;
      animating = false;
    },
  };
})();
