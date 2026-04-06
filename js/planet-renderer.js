/* ═══════════════════════════════════════════════════════════════
   PLANET RENDERER v3 — Three.js 3D Planet Visualization
   Renders each planet type as a spinning 3D sphere with procedural
   textures, bump maps, emissive maps, atmospheric glow, and unique
   per-type lighting, atmosphere, and cloud configurations.
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

      /* Default lighting — builders will customise these references */
      this.sun = new THREE.DirectionalLight(0xffffff, 1.3);
      this.sun.position.set(3, 1.5, 4);
      this.scene.add(this.sun);

      this.fill = new THREE.DirectionalLight(0x334466, 0.2);
      this.fill.position.set(-2, -1, 2);
      this.scene.add(this.fill);

      this.ambient = new THREE.AmbientLight(0x1a1a2a, 0.35);
      this.scene.add(this.ambient);

      this._starfield();
      this._build(type);
      this.renderer.render(this.scene, this.camera);
    }

    _build(type) {
      const map = {
        'Capital World':    '_capitalWorld',
        'Terrestrial':      '_terrestrial',
        'Volcanic':         '_volcanic',
        'Ocean/Archipelago':'_ocean',
        'Jungle':           '_jungle',
        'Desert':           '_desert',
        'Ice World':        '_iceWorld',
        'Ancient Ruins':    '_ancientRuins',
        'Gas Giant':        '_gasGiant',
        'Moon':             '_moon',
        'Orbital Station':  '_orbitalStation',
        'Dead World':       '_deadWorld',
        'Ring World':       '_ringWorld',
        'Dyson Sphere':     '_dysonSphere',
        'Aethyn Nexus':     '_aethynNexus',
        'Worldship':        '_worldship',
        'Warp Gate':        '_warpGate',
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
      // Higher polygon count for better bump-map detail
      const geo = new THREE.SphereGeometry(radius, 96, 96);
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
      // Bump map support
      if (texData && texData.bump) {
        matOpts.bumpMap = texData.bump;
        matOpts.bumpScale = opts.bumpScale || 0.04;
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

    _cloudLayer(radius, speed, texture, opacity) {
      const geo = new THREE.SphereGeometry(radius, 48, 48);
      const matOpts = { transparent: true, depthWrite: false };
      if (texture) {
        matOpts.map = texture;
        matOpts.alphaMap = texture;
        matOpts.opacity = opacity !== undefined ? opacity : 0.6;
      } else {
        matOpts.color = 0xffffff;
        matOpts.opacity = opacity !== undefined ? opacity : 0.15;
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
      // Warm golden sunlight
      this.sun.color.set(0xfff0d0);
      this.sun.intensity = 1.3;
      this.fill.color.set(0x886633);
      this.fill.intensity = 0.18;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.capitalWorld() : null;
      this.planet = this._planet(1, tex, {
        shininess: 22,
        emissiveColor: 0xffcc66,
        emissiveIntensity: 1.0,
        bumpScale: 0.03,
      });
      this._addRotation(this.planet, 0.004);

      this._atmosphere(1.06, 0xd4a860, 0.10);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      this._cloudLayer(1.02, 0.002, cloudTex);

      // Orbital defense rings
      this._ring(1.35, 1.38, 0x8899aa, 0.18);
      this._ring(1.40, 1.42, 0xaabbcc, 0.10);
    }

    _terrestrial() {
      // Standard white-blue sunlight
      this.sun.color.set(0xffffff);
      this.sun.intensity = 1.3;
      this.fill.color.set(0x334488);
      this.fill.intensity = 0.20;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.terrestrial() : null;
      this.planet = this._planet(1, tex, { shininess: 35, bumpScale: 0.04 });
      this._addRotation(this.planet, 0.003);

      this._atmosphere(1.06, 0x4488cc, 0.14);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      // Two cloud layers at different heights and speeds
      this._cloudLayer(1.022, 0.003, cloudTex);
      this._cloudLayer(1.038, -0.002, cloudTex, 0.4);
    }

    _volcanic() {
      // Orange-tinted sunlight, red fill, high emissive
      this.sun.color.set(0xff8844);
      this.sun.intensity = 1.1;
      this.fill.color.set(0x441100);
      this.fill.intensity = 0.25;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.volcanic() : null;
      this.planet = this._planet(1, tex, {
        shininess: 8,
        emissiveColor: 0xff6600,
        emissiveIntensity: 2.0,
        bumpScale: 0.06,
      });
      this._addRotation(this.planet, 0.0025);

      // Inner red glow
      this._atmosphere(1.045, 0xff2200, 0.08);
      // Outer smoke haze
      this._atmosphere(1.09, 0x331100, 0.06);

      const ashTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.ashClouds() : null;
      this._cloudLayer(1.025, 0.001, ashTex);

      // Eruption glow
      this.eruption = new THREE.PointLight(0xff8800, 0.6, 3);
      this.eruption.position.set(0.5, 0.3, 0.85);
      this.planet.add(this.eruption);
    }

    _ocean() {
      // Bright white sunlight, blue fill, high shininess
      this.sun.color.set(0xffffff);
      this.sun.intensity = 1.4;
      this.fill.color.set(0x3366aa);
      this.fill.intensity = 0.22;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.ocean() : null;
      this.planet = this._planet(1, tex, { shininess: 70, bumpScale: 0.02 });
      this._addRotation(this.planet, 0.003);

      this._atmosphere(1.06, 0x4488cc, 0.16);
      const cloudTex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null;
      // Three storm cloud layers
      this._cloudLayer(1.020, 0.004, cloudTex);
      this._cloudLayer(1.034, -0.003, cloudTex, 0.45);
      this._cloudLayer(1.050, 0.002, cloudTex, 0.25);
    }

    _jungle() {
      // Slightly green-tinted sunlight, warm fill, thick atmosphere
      this.sun.color.set(0xeeffdd);
      this.sun.intensity = 1.2;
      this.fill.color.set(0x224422);
      this.fill.intensity = 0.20;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.jungle() : null;
      this.planet = this._planet(1, tex, {
        shininess: 12,
        emissiveColor: 0x22ff88,
        emissiveIntensity: 0.5,
        bumpScale: 0.05,
      });
      this._addRotation(this.planet, 0.003);

      // Thick green-tinted atmosphere
      this._atmosphere(1.06, 0x22aa44, 0.10);
      this._atmosphere(1.10, 0x44aa66, 0.15);

      const jungleTex = (typeof PlanetTextures !== 'undefined' && PlanetTextures.jungleClouds)
        ? PlanetTextures.jungleClouds()
        : (typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null);
      // Three misty cloud layers
      this._cloudLayer(1.018, 0.0035, jungleTex);
      this._cloudLayer(1.032, -0.002, jungleTex, 0.45);
      this._cloudLayer(1.048, 0.0015, jungleTex, 0.30);
    }

    _desert() {
      // Harsh white-yellow sunlight, warm amber fill, thin atmosphere
      this.sun.color.set(0xfffff0);
      this.sun.intensity = 1.5;
      this.fill.color.set(0x886622);
      this.fill.intensity = 0.15;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.desert() : null;
      this.planet = this._planet(1, tex, { shininess: 25, bumpScale: 0.05 });
      this._addRotation(this.planet, 0.002);

      // Thin atmosphere (lower opacity)
      this._atmosphere(1.05, 0xd4a850, 0.05);

      // Thin sandstorm haze
      const hazeTex = (typeof PlanetTextures !== 'undefined' && PlanetTextures.desertHaze)
        ? PlanetTextures.desertHaze()
        : null;
      const c = this._cloudLayer(1.025, 0.002, hazeTex, 0.04);
      if (!hazeTex) {
        c.material.color.set(0xd8b060);
      }
    }

    _iceWorld() {
      // Cool blue-white sunlight, blue fill, high shininess, stronger aurora
      this.sun.color.set(0xddeeff);
      this.sun.intensity = 1.2;
      this.fill.color.set(0x4466aa);
      this.fill.intensity = 0.22;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.iceWorld() : null;
      this.planet = this._planet(1, tex, { shininess: 80, bumpScale: 0.035 });
      this._addRotation(this.planet, 0.0025);

      // Blue-white inner atmosphere + faint aurora ring
      this._atmosphere(1.05, 0x88ccff, 0.12);
      this._atmosphere(1.10, 0x4488cc, 0.07);

      const iceTex = (typeof PlanetTextures !== 'undefined' && PlanetTextures.iceClouds)
        ? PlanetTextures.iceClouds()
        : (typeof PlanetTextures !== 'undefined' ? PlanetTextures.clouds() : null);
      this._cloudLayer(1.020, 0.003, iceTex, 0.50);
      this._cloudLayer(1.035, -0.002, iceTex, 0.30);

      // Stronger aurora lights
      this.aurora = new THREE.PointLight(0x44ff88, 0.35, 3);
      this.aurora.position.set(-0.3, 0.9, -0.4);
      this.scene.add(this.aurora);
      this.aurora2 = new THREE.PointLight(0x8888ff, 0.25, 2.5);
      this.aurora2.position.set(-0.5, 0.7, -0.5);
      this.scene.add(this.aurora2);
      this.aurora3 = new THREE.PointLight(0x44bbff, 0.20, 2.5);
      this.aurora3.position.set(0.4, 0.8, -0.3);
      this.scene.add(this.aurora3);
    }

    _ancientRuins() {
      // Neutral sunlight, purple-tinted fill, stronger emissive for energy lines
      this.sun.color.set(0xffffff);
      this.sun.intensity = 1.1;
      this.fill.color.set(0x442266);
      this.fill.intensity = 0.22;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.ancientRuins() : null;
      this.planet = this._planet(1, tex, {
        shininess: 10,
        emissiveColor: 0xaa88ff,
        emissiveIntensity: 1.6,
        bumpScale: 0.04,
      });
      this._addRotation(this.planet, 0.0015);

      this._atmosphere(1.06, 0x9977dd, 0.08);
    }

    _gasGiant() {
      // Warm sunlight, bands already prominent in texture
      this.sun.color.set(0xfff8e0);
      this.sun.intensity = 1.3;
      this.fill.color.set(0x554422);
      this.fill.intensity = 0.18;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.gasGiant() : null;
      this.planet = this._planet(1, tex, { shininess: 20, bumpScale: 0.02 });
      this._addRotation(this.planet, 0.006);

      // Saturn-style rings
      this._ring(1.40, 1.48, 0xd8c0a0, 0.22);
      this._ring(1.50, 1.56, 0xc8b090, 0.14);
      this._ring(1.58, 1.62, 0xb8a080, 0.08);
      this._ring(1.34, 1.39, 0xc8b890, 0.10);

      // Moons
      const moonColors = [0xc8c0b0, 0xa8a098, 0xb8b0a0];
      const moonDist   = [2.0, 2.3, 1.75];
      const moonSize   = [0.06, 0.04, 0.035];
      const moonAngle  = [0.5, 2.1, 4.2];
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
      // Harsh directional sunlight, very dark shadows (minimal fill/ambient)
      this.sun.color.set(0xffffff);
      this.sun.intensity = 1.5;
      this.fill.color.set(0x111111);
      this.fill.intensity = 0.05;
      this.ambient.color.set(0x0a0a0a);
      this.ambient.intensity = 0.15;

      // Background parent planet
      const bgGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const bgMat = new THREE.MeshPhongMaterial({ color: 0x1a3060, transparent: true, opacity: 0.12 });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      bg.position.set(4, -2, -6);
      this.scene.add(bg);

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.moon() : null;
      this.planet = this._planet(1, tex, { shininess: 6, bumpScale: 0.06 });
      this._addRotation(this.planet, 0.001);
    }

    _deadWorld() {
      // Dim sunlight, sickly yellow-green fill for toxic atmosphere hint
      this.sun.color.set(0xccbbaa);
      this.sun.intensity = 0.9;
      this.fill.color.set(0x3a4400);
      this.fill.intensity = 0.18;

      const tex = typeof PlanetTextures !== 'undefined' ? PlanetTextures.deadWorld() : null;
      this.planet = this._planet(1, tex, {
        shininess: 4,
        emissiveColor: 0x884422,
        emissiveIntensity: 0.6,
        bumpScale: 0.05,
      });
      this._addRotation(this.planet, 0.0008);

      // Thin sickly yellow-green haze
      this._atmosphere(1.05, 0x888830, 0.06);

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
      const hullMat  = new THREE.MeshPhongMaterial({ color: 0x3a3e4a, shininess: 40 });
      const darkMat  = new THREE.MeshPhongMaterial({ color: 0x1a1c24, shininess: 20 });
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
        { x: -0.5, y:  0.22, rz: 0 },
        { x: -0.5, y: -0.22, rz: 0 },
        { x:  0.5, y:  0.22, rz: 0 },
        { x:  0.5, y: -0.22, rz: 0 },
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
      const ringGeo  = new THREE.TorusGeometry(0.04, 0.005, 6, 12);
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
       MEGASTRUCTURE BUILDERS
       ════════════════════════════════════ */

    _ringWorld() {
      // Warm golden sunlight from the artificial star
      this.sun.color.set(0xfff8d0);
      this.sun.intensity = 1.0;
      this.sun.position.set(0, 0, 5);
      this.fill.color.set(0x886633);
      this.fill.intensity = 0.2;
      this.ambient.intensity = 0.3;

      this.megaGroup = new THREE.Group();

      /* ── Artificial micro-star at the center ── */
      var starGeo = new THREE.SphereGeometry(0.12, 32, 32);
      var starMat = new THREE.MeshBasicMaterial({ color: 0xfff4dd });
      this.megaGroup.add(new THREE.Mesh(starGeo, starMat));

      // Star corona layers
      var coronaSizes = [0.18, 0.26, 0.36];
      var coronaOpacities = [0.3, 0.15, 0.06];
      var coronaColors = [0xffdd88, 0xffcc66, 0xffaa44];
      for (var ci = 0; ci < 3; ci++) {
        var cGeo = new THREE.SphereGeometry(coronaSizes[ci], 24, 24);
        var cMat = new THREE.MeshBasicMaterial({
          color: coronaColors[ci], transparent: true, opacity: coronaOpacities[ci],
          depthWrite: false,
        });
        this.megaGroup.add(new THREE.Mesh(cGeo, cMat));
      }

      // Point light from artificial star
      var starLight = new THREE.PointLight(0xffeedd, 0.9, 4);
      this.megaGroup.add(starLight);

      /* ── Ring band — procedural biome texture on a flat torus ── */
      var bandCanvas = document.createElement('canvas');
      bandCanvas.width = 1024;
      bandCanvas.height = 64;
      var bctx = bandCanvas.getContext('2d');

      // Paint biome strips along the ring circumference
      var biomes = [
        { color: '#226699', len: 0.10 },  // deep ocean
        { color: '#44aa55', len: 0.08 },  // forest
        { color: '#66bb44', len: 0.06 },  // grassland
        { color: '#ccaa33', len: 0.09 },  // desert
        { color: '#44aa55', len: 0.07 },  // forest
        { color: '#1166cc', len: 0.11 },  // ocean
        { color: '#338833', len: 0.08 },  // jungle
        { color: '#cc7733', len: 0.06 },  // arid
        { color: '#44aa55', len: 0.07 },  // forest
        { color: '#2277aa', len: 0.09 },  // ocean
        { color: '#99bb44', len: 0.06 },  // plains
        { color: '#226699', len: 0.08 },  // deep ocean
        { color: '#555555', len: 0.05 },  // dead section (failed)
      ];
      var bx = 0;
      for (var bi = 0; bi < biomes.length; bi++) {
        var bw = biomes[bi].len * bandCanvas.width;
        bctx.fillStyle = biomes[bi].color;
        bctx.fillRect(bx, 0, bw, bandCanvas.height);
        // Energy barrier shimmer line between biomes
        bctx.fillStyle = 'rgba(136,204,255,0.4)';
        bctx.fillRect(bx, 0, 1.5, bandCanvas.height);
        bx += bw;
      }
      // Fill remainder
      bctx.fillStyle = '#44aa55';
      bctx.fillRect(bx, 0, bandCanvas.width - bx, bandCanvas.height);

      // Outer hull edge lines (metallic rim on top and bottom of band)
      bctx.fillStyle = '#667788';
      bctx.fillRect(0, 0, bandCanvas.width, 6);
      bctx.fillRect(0, bandCanvas.height - 6, bandCanvas.width, 6);

      var bandTex = new THREE.CanvasTexture(bandCanvas);
      bandTex.wrapS = THREE.RepeatWrapping;

      // The ring — flat band (small tube radius)
      var ringGeo = new THREE.TorusGeometry(1.0, 0.06, 16, 200);
      var ringMat = new THREE.MeshPhongMaterial({
        map: bandTex,
        shininess: 30,
        emissive: 0x222211,
        emissiveIntensity: 0.15,
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      this.megaGroup.add(ring);

      // Subtle inner glow from starlight hitting the habitat surface
      var glowGeo = new THREE.TorusGeometry(1.0, 0.065, 12, 100);
      var glowMat = new THREE.MeshBasicMaterial({
        color: 0xddeeaa, transparent: true, opacity: 0.04,
        side: THREE.DoubleSide, depthWrite: false,
      });
      this.megaGroup.add(new THREE.Mesh(glowGeo, glowMat));

      /* ── Docking spines / transit stations at rim ── */
      for (var di = 0; di < 8; di++) {
        var dAngle = (di / 8) * Math.PI * 2;
        var spGeo = new THREE.BoxGeometry(0.015, 0.005, 0.005);
        var spMat = new THREE.MeshPhongMaterial({
          color: 0x99aabb, shininess: 40,
          emissive: 0x334455, emissiveIntensity: 0.1,
        });
        var sp = new THREE.Mesh(spGeo, spMat);
        sp.position.set(Math.cos(dAngle) * 1.07, Math.sin(dAngle) * 1.07, 0);
        sp.rotation.z = dAngle;
        this.megaGroup.add(sp);
      }

      // Tilt for better viewing angle — show the ring as a band in space
      this.megaGroup.rotation.x = 0.65;
      this.megaGroup.rotation.y = 0.2;
      this.scene.add(this.megaGroup);
      this.planet = this.megaGroup;
    }

    _dysonSphere() {
      // Intense warm light from the central star
      this.sun.color.set(0xffeedd);
      this.sun.intensity = 0.6;
      this.sun.position.set(3, 2, 4);
      this.fill.color.set(0xffaa44);
      this.fill.intensity = 0.3;
      this.ambient.color.set(0x443322);
      this.ambient.intensity = 0.5;

      this.megaGroup = new THREE.Group();

      // Central star — bright emissive sphere
      var starGeo = new THREE.SphereGeometry(0.35, 32, 32);
      var starMat = new THREE.MeshBasicMaterial({
        color: 0xffdd88,
      });
      this.dysonStar = new THREE.Mesh(starGeo, starMat);
      this.megaGroup.add(this.dysonStar);

      // Star glow layers
      var glowSizes = [0.42, 0.50, 0.60];
      var glowOpacities = [0.15, 0.08, 0.04];
      for (var gi = 0; gi < glowSizes.length; gi++) {
        var sgGeo = new THREE.SphereGeometry(glowSizes[gi], 24, 24);
        var sgMat = new THREE.MeshBasicMaterial({
          color: 0xffcc66, transparent: true, opacity: glowOpacities[gi],
          side: THREE.BackSide, depthWrite: false,
        });
        this.megaGroup.add(new THREE.Mesh(sgGeo, sgMat));
      }

      // Star point light
      this.dysonStarLight = new THREE.PointLight(0xffdd88, 1.5, 5);
      this.megaGroup.add(this.dysonStarLight);

      // Lattice cage — wireframe icosahedron
      var latticeGeo = new THREE.IcosahedronGeometry(1.0, 1);
      var latticeMat = new THREE.MeshPhongMaterial({
        color: 0x556677, wireframe: true,
        emissive: 0x334455, emissiveIntensity: 0.3,
      });
      this.dysonLattice = new THREE.Mesh(latticeGeo, latticeMat);
      this.megaGroup.add(this.dysonLattice);

      // Panel segments on the lattice faces — partial coverage
      var panelGeo = new THREE.IcosahedronGeometry(0.98, 1);
      var panelMat = new THREE.MeshPhongMaterial({
        color: 0x445566, shininess: 40, transparent: true, opacity: 0.4,
        emissive: 0x223344, emissiveIntensity: 0.15,
        side: THREE.DoubleSide,
      });
      this.megaGroup.add(new THREE.Mesh(panelGeo, panelMat));

      // Energy conduit lines along edges — bright emissive overlay
      var conduitGeo = new THREE.IcosahedronGeometry(1.01, 1);
      this.dysonConduits = new THREE.LineSegments(
        new THREE.EdgesGeometry(conduitGeo),
        new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })
      );
      this.megaGroup.add(this.dysonConduits);

      // Outer energy halo
      var haloGeo = new THREE.SphereGeometry(1.08, 24, 24);
      var haloMat = new THREE.MeshBasicMaterial({
        color: 0x6699cc, transparent: true, opacity: 0.04,
        side: THREE.BackSide, depthWrite: false,
      });
      this.megaGroup.add(new THREE.Mesh(haloGeo, haloMat));

      this.scene.add(this.megaGroup);
      this.planet = this.megaGroup;
    }

    _aethynNexus() {
      // Cool blue-purple lighting
      this.sun.color.set(0xccccff);
      this.sun.intensity = 1.0;
      this.fill.color.set(0x442266);
      this.fill.intensity = 0.3;
      this.ambient.color.set(0x1a1a2e);
      this.ambient.intensity = 0.45;

      this.megaGroup = new THREE.Group();

      // Main crystalline body — icosahedron
      var bodyGeo = new THREE.IcosahedronGeometry(0.8, 1);
      var bodyMat = new THREE.MeshPhongMaterial({
        color: 0x445577, shininess: 80,
        emissive: 0x4422aa, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.85,
      });
      this.nexusBody = new THREE.Mesh(bodyGeo, bodyMat);
      this.megaGroup.add(this.nexusBody);

      // Crystalline facet edges — visible geometric pattern
      var edgeMat = new THREE.LineBasicMaterial({ color: 0x8866dd, transparent: true, opacity: 0.7 });
      this.megaGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), edgeMat));

      // Inner glow core
      var coreGeo = new THREE.IcosahedronGeometry(0.45, 2);
      var coreMat = new THREE.MeshBasicMaterial({
        color: 0x7744cc, transparent: true, opacity: 0.25,
      });
      this.nexusCore = new THREE.Mesh(coreGeo, coreMat);
      this.megaGroup.add(this.nexusCore);

      // Core point light
      this.nexusCoreLight = new THREE.PointLight(0x8855dd, 0.8, 4);
      this.megaGroup.add(this.nexusCoreLight);

      // Docking spines — thin cylinders extending outward
      var spinePositions = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1],
        [0.7, 0.7, 0], [-0.7, -0.7, 0], [0.7, 0, 0.7], [-0.7, 0, -0.7],
      ];
      for (var si = 0; si < spinePositions.length; si++) {
        var sp = spinePositions[si];
        var spineLen = 0.35 + Math.random() * 0.25;
        var spineGeo = new THREE.CylinderGeometry(0.008, 0.004, spineLen, 6);
        var spineMat = new THREE.MeshPhongMaterial({
          color: 0x556688, shininess: 30,
          emissive: 0x332255, emissiveIntensity: 0.2,
        });
        var spine = new THREE.Mesh(spineGeo, spineMat);
        var dir = new THREE.Vector3(sp[0], sp[1], sp[2]).normalize();
        spine.position.copy(dir.clone().multiplyScalar(0.8 + spineLen * 0.5));
        // Align cylinder to direction
        spine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        this.megaGroup.add(spine);

        // Docking tip light
        if (si < 6) {
          var tipGeo = new THREE.SphereGeometry(0.012, 8, 8);
          var tipMat = new THREE.MeshBasicMaterial({
            color: 0xaa66ff, transparent: true, opacity: 0.7,
          });
          var tip = new THREE.Mesh(tipGeo, tipMat);
          tip.position.copy(dir.clone().multiplyScalar(0.8 + spineLen));
          this.megaGroup.add(tip);
        }
      }

      // Crystalline growths — small irregular icosahedra on the surface
      for (var ci = 0; ci < 12; ci++) {
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.random() * Math.PI;
        var cr = 0.78;
        var cx = cr * Math.sin(phi) * Math.cos(theta);
        var cy = cr * Math.cos(phi);
        var cz = cr * Math.sin(phi) * Math.sin(theta);
        var crystalSize = 0.03 + Math.random() * 0.05;
        var crystalGeo = new THREE.OctahedronGeometry(crystalSize, 0);
        var crystalMat = new THREE.MeshPhongMaterial({
          color: 0x6644bb, shininess: 90,
          emissive: 0x5533aa, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.7,
        });
        var crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(cx, cy, cz);
        crystal.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        this.megaGroup.add(crystal);
      }

      // Outer energy aura
      var auraGeo = new THREE.IcosahedronGeometry(1.0, 2);
      var auraMat = new THREE.MeshBasicMaterial({
        color: 0x6633bb, transparent: true, opacity: 0.04,
        side: THREE.BackSide, depthWrite: false,
      });
      this.megaGroup.add(new THREE.Mesh(auraGeo, auraMat));

      this.megaGroup.rotation.x = 0.2;
      this.scene.add(this.megaGroup);
      this.planet = this.megaGroup;
    }

    _worldship() {
      // Dim, cold lighting — derelict in deep space
      this.sun.color.set(0xaabbcc);
      this.sun.intensity = 0.8;
      this.sun.position.set(3, 1, 4);
      this.fill.color.set(0x222244);
      this.fill.intensity = 0.15;
      this.ambient.color.set(0x0a0a14);
      this.ambient.intensity = 0.3;

      this.megaGroup = new THREE.Group();

      // Main hull — elongated sphere (capsule shape)
      var hullGeo = new THREE.SphereGeometry(0.6, 48, 48);
      var hullMat = new THREE.MeshPhongMaterial({
        color: 0x3a3e4a, shininess: 20,
      });
      var hull = new THREE.Mesh(hullGeo, hullMat);
      hull.scale.set(1.8, 1.0, 1.0);
      this.megaGroup.add(hull);

      // Hull plating overlay — darker panels
      var plateGeo = new THREE.SphereGeometry(0.605, 24, 24);
      var plateMat = new THREE.MeshPhongMaterial({
        color: 0x2a2e3a, shininess: 10, transparent: true, opacity: 0.6,
        wireframe: true,
      });
      var plates = new THREE.Mesh(plateGeo, plateMat);
      plates.scale.set(1.8, 1.0, 1.0);
      this.megaGroup.add(plates);

      // Engine section — rear cone
      var engineGeo = new THREE.ConeGeometry(0.35, 0.5, 16);
      var engineMat = new THREE.MeshPhongMaterial({ color: 0x2a2c34, shininess: 15 });
      var engine = new THREE.Mesh(engineGeo, engineMat);
      engine.rotation.z = -Math.PI / 2;
      engine.position.x = -1.25;
      this.megaGroup.add(engine);

      // Engine nozzles
      for (var ni = 0; ni < 6; ni++) {
        var na = (ni / 6) * Math.PI * 2;
        var nozzGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.15, 8);
        var nozzMat = new THREE.MeshPhongMaterial({ color: 0x1a1c24, shininess: 10 });
        var nozz = new THREE.Mesh(nozzGeo, nozzMat);
        nozz.rotation.z = Math.PI / 2;
        nozz.position.set(-1.48, Math.cos(na) * 0.18, Math.sin(na) * 0.18);
        this.megaGroup.add(nozz);
      }

      // Command tower — dorsal structure
      var towerGeo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
      var towerMat = new THREE.MeshPhongMaterial({ color: 0x444855, shininess: 25 });
      var tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(0.5, 0.55, 0);
      this.megaGroup.add(tower);

      // Bridge windows
      var bridgeMat = new THREE.MeshPhongMaterial({
        color: 0xaaddff, emissive: 0x4488aa, emissiveIntensity: 0.4, shininess: 60,
      });
      for (var bw = 0; bw < 5; bw++) {
        var win = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.008), bridgeMat);
        win.position.set(0.4 + bw * 0.05, 0.628, 0);
        this.megaGroup.add(win);
      }

      // Docking bays — recessed sections along the hull
      var bayMat = new THREE.MeshPhongMaterial({ color: 0x1a1c24, shininess: 5 });
      var bayPositions = [
        { x: 0.4, y: -0.3, z: 0.45 }, { x: -0.2, y: -0.3, z: 0.45 },
        { x: 0.4, y: -0.3, z: -0.45 }, { x: -0.2, y: -0.3, z: -0.45 },
      ];
      for (var bi = 0; bi < bayPositions.length; bi++) {
        var bp = bayPositions[bi];
        var bay = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.12), bayMat);
        bay.position.set(bp.x, bp.y, bp.z);
        this.megaGroup.add(bay);
      }

      // Hull damage — dark scar marks
      var scarMat = new THREE.MeshBasicMaterial({ color: 0x111118, transparent: true, opacity: 0.6 });
      for (var di = 0; di < 15; di++) {
        var scarGeo = new THREE.PlaneGeometry(0.04 + Math.random() * 0.08, 0.01 + Math.random() * 0.03);
        var scar = new THREE.Mesh(scarGeo, scarMat);
        var sTheta = Math.random() * Math.PI * 2;
        var sPhi = Math.random() * Math.PI;
        var sR = 0.61;
        scar.position.set(
          sR * Math.sin(sPhi) * Math.cos(sTheta) * 1.8,
          sR * Math.cos(sPhi),
          sR * Math.sin(sPhi) * Math.sin(sTheta)
        );
        scar.lookAt(0, 0, 0);
        this.megaGroup.add(scar);
      }

      // Running lights along the hull
      this.worldshipLights = [];
      var lightPositions = [
        [1.0, 0.2, 0], [-0.6, 0.2, 0], [0.3, 0, 0.55],
        [0.3, 0, -0.55], [-0.8, -0.1, 0.3], [-0.8, -0.1, -0.3],
        [0.7, -0.3, 0.3], [0.7, -0.3, -0.3],
      ];
      for (var li = 0; li < lightPositions.length; li++) {
        var lp = lightPositions[li];
        var lightGeo = new THREE.SphereGeometry(0.012, 6, 6);
        var lightMat = new THREE.MeshBasicMaterial({
          color: li < 4 ? 0xffccaa : 0xff4422,
          transparent: true, opacity: 0.8,
        });
        var lightMesh = new THREE.Mesh(lightGeo, lightMat);
        lightMesh.position.set(lp[0], lp[1], lp[2]);
        this.megaGroup.add(lightMesh);
        this.worldshipLights.push({ mesh: lightMesh, phase: Math.random() * 6.28, rate: 2 + Math.random() * 4 });
      }

      // Nav lights
      var navRedL = new THREE.PointLight(0xff2222, 0.3, 2);
      navRedL.position.set(-1.5, 0, 0.1);
      this.megaGroup.add(navRedL);
      this.worldshipNavRed = navRedL;

      var navGreenL = new THREE.PointLight(0x22ff22, 0.3, 2);
      navGreenL.position.set(1.1, 0, 0.1);
      this.megaGroup.add(navGreenL);
      this.worldshipNavGreen = navGreenL;

      // Slight initial tilt
      this.megaGroup.rotation.x = 0.15;
      this.megaGroup.rotation.z = 0.1;
      this.scene.add(this.megaGroup);
      this.planet = this.megaGroup;
    }

    _warpGate() {
      // Cool blue-white lighting from the warp field
      this.sun.color.set(0xddeeff);
      this.sun.intensity = 0.8;
      this.fill.color.set(0x224466);
      this.fill.intensity = 0.3;
      this.ambient.color.set(0x112233);
      this.ambient.intensity = 0.45;

      this.megaGroup = new THREE.Group();

      // Outer ring structure
      var ringGeo = new THREE.TorusGeometry(1.0, 0.08, 20, 80);
      var ringMat = new THREE.MeshPhongMaterial({
        color: 0x556677, shininess: 50,
        emissive: 0x223344, emissiveIntensity: 0.15,
      });
      this.warpRing = new THREE.Mesh(ringGeo, ringMat);
      this.megaGroup.add(this.warpRing);

      // Inner structural ring
      var innerRingGeo = new THREE.TorusGeometry(0.92, 0.03, 12, 64);
      var innerRingMat = new THREE.MeshPhongMaterial({
        color: 0x445566, shininess: 40,
        emissive: 0x334466, emissiveIntensity: 0.2,
      });
      this.megaGroup.add(new THREE.Mesh(innerRingGeo, innerRingMat));

      // Energy channel ring
      var energyRingGeo = new THREE.TorusGeometry(1.0, 0.10, 12, 80);
      var energyRingMat = new THREE.MeshBasicMaterial({
        color: 0x4488cc, transparent: true, opacity: 0.08,
        side: THREE.DoubleSide, depthWrite: false,
      });
      this.megaGroup.add(new THREE.Mesh(energyRingGeo, energyRingMat));

      // Energy field inside the ring — animated disc
      var fieldGeo = new THREE.CircleGeometry(0.88, 64);
      this.warpFieldMat = new THREE.MeshBasicMaterial({
        color: 0x4499dd, transparent: true, opacity: 0.15,
        side: THREE.DoubleSide, depthWrite: false,
      });
      this.warpField = new THREE.Mesh(fieldGeo, this.warpFieldMat);
      this.megaGroup.add(this.warpField);

      // Second energy field layer — offset for depth
      var field2Geo = new THREE.CircleGeometry(0.82, 64);
      this.warpField2Mat = new THREE.MeshBasicMaterial({
        color: 0x66bbff, transparent: true, opacity: 0.08,
        side: THREE.DoubleSide, depthWrite: false,
      });
      this.warpField2 = new THREE.Mesh(field2Geo, this.warpField2Mat);
      this.warpField2.position.z = 0.02;
      this.megaGroup.add(this.warpField2);

      // Energy field glow from inside
      this.warpGlow = new THREE.PointLight(0x4499dd, 0.6, 4);
      this.megaGroup.add(this.warpGlow);

      // Support pylons — 4 stations attached to ring exterior
      var pylonAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      for (var pi = 0; pi < pylonAngles.length; pi++) {
        var pa = pylonAngles[pi];
        var pylonGroup = new THREE.Group();

        // Main pylon body
        var pylonGeo = new THREE.BoxGeometry(0.06, 0.18, 0.06);
        var pylonMat = new THREE.MeshPhongMaterial({ color: 0x445566, shininess: 30 });
        pylonGroup.add(new THREE.Mesh(pylonGeo, pylonMat));

        // Antenna
        var antGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4);
        var antMesh = new THREE.Mesh(antGeo, pylonMat);
        antMesh.position.y = 0.15;
        pylonGroup.add(antMesh);

        // Station light
        var stLightGeo = new THREE.SphereGeometry(0.01, 6, 6);
        var stLightMat = new THREE.MeshBasicMaterial({
          color: pi % 2 === 0 ? 0xff4422 : 0x22ff44,
          transparent: true, opacity: 0.8,
        });
        var stLight = new THREE.Mesh(stLightGeo, stLightMat);
        stLight.position.y = 0.09;
        pylonGroup.add(stLight);

        // Position on the ring exterior
        pylonGroup.position.set(Math.cos(pa) * 1.12, Math.sin(pa) * 1.12, 0);
        // Point outward
        pylonGroup.rotation.z = pa - Math.PI * 0.5;
        this.megaGroup.add(pylonGroup);
      }

      // Ring edge glow lines
      var edgeGeo = new THREE.TorusGeometry(1.0, 0.085, 6, 80);
      var edgeMat = new THREE.LineBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.3 });
      this.megaGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(edgeGeo), edgeMat));

      // Tilt for viewing angle
      this.megaGroup.rotation.x = 0.35;
      this.megaGroup.rotation.y = 0.2;
      this.scene.add(this.megaGroup);
      this.planet = this.megaGroup;
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
        this.aurora.intensity = 0.18 + Math.sin(t * 0.7) * 0.17;
        this.aurora.position.x = -0.3 + Math.sin(t * 0.4) * 0.15;
      }
      if (this.aurora2) {
        this.aurora2.intensity = 0.12 + Math.sin(t * 0.5 + 1) * 0.12;
      }
      if (this.aurora3) {
        this.aurora3.intensity = 0.10 + Math.sin(t * 0.6 + 2) * 0.10;
        this.aurora3.position.z = -0.3 + Math.cos(t * 0.35) * 0.12;
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
        if (this.navRed)   this.navRed.intensity   = Math.sin(t * 3) > 0 ? 0.4 : 0.02;
        if (this.navGreen) this.navGreen.intensity  = Math.sin(t * 3) > 0 ? 0.4 : 0.02;
        if (this.beacon)   this.beacon.intensity    = Math.sin(t * 4.5) > 0.3 ? 0.3 : 0.02;
      }

      // Dead world debris
      if (this.debrisGroup) {
        this.debrisGroup.rotation.y += 0.0004;
      }

      // ── Megastructure animations ──

      // Ring World — slow rotation
      if (this.type === 'Ring World' && this.megaGroup) {
        this.megaGroup.rotation.z += 0.002;
      }

      // Dyson Sphere — lattice rotation + star pulsing
      if (this.type === 'Dyson Sphere') {
        if (this.dysonLattice) {
          this.dysonLattice.rotation.y += 0.001;
          this.dysonLattice.rotation.x += 0.0005;
        }
        if (this.dysonConduits) {
          this.dysonConduits.rotation.y += 0.001;
          this.dysonConduits.rotation.x += 0.0005;
          this.dysonConduits.material.opacity = 0.4 + Math.sin(t * 2) * 0.2;
        }
        if (this.dysonStar) {
          var starScale = 1.0 + Math.sin(t * 1.5) * 0.03;
          this.dysonStar.scale.set(starScale, starScale, starScale);
        }
        if (this.dysonStarLight) {
          this.dysonStarLight.intensity = 1.3 + Math.sin(t * 1.5) * 0.3;
        }
      }

      // Aethyn Nexus — slow rotation + pulsing core
      if (this.type === 'Aethyn Nexus') {
        if (this.nexusBody) {
          this.nexusBody.rotation.y += 0.0015;
          this.nexusBody.rotation.x += 0.0005;
          this.nexusBody.material.emissiveIntensity = 0.3 + Math.sin(t * 0.8) * 0.15;
        }
        if (this.nexusCore) {
          this.nexusCore.rotation.y -= 0.003;
          this.nexusCore.material.opacity = 0.18 + Math.sin(t * 1.2) * 0.1;
        }
        if (this.nexusCoreLight) {
          this.nexusCoreLight.intensity = 0.6 + Math.sin(t * 0.8) * 0.3;
        }
      }

      // Worldship — tumbling on two axes + flickering lights
      if (this.type === 'Worldship' && this.megaGroup) {
        this.megaGroup.rotation.y += 0.0008;
        this.megaGroup.rotation.x += 0.0003;
        if (this.worldshipLights) {
          for (var wli = 0; wli < this.worldshipLights.length; wli++) {
            var wl = this.worldshipLights[wli];
            var flicker = Math.sin(t * wl.rate + wl.phase);
            wl.mesh.material.opacity = flicker > 0.2 ? 0.8 : 0.05;
          }
        }
        if (this.worldshipNavRed) {
          this.worldshipNavRed.intensity = Math.sin(t * 2.5) > 0 ? 0.3 : 0.02;
        }
        if (this.worldshipNavGreen) {
          this.worldshipNavGreen.intensity = Math.sin(t * 2.5) > 0 ? 0.3 : 0.02;
        }
      }

      // Warp Gate — pulsing energy field
      if (this.type === 'Warp Gate') {
        if (this.warpFieldMat) {
          this.warpFieldMat.opacity = 0.10 + Math.sin(t * 1.2) * 0.06 + Math.sin(t * 3.1) * 0.03;
        }
        if (this.warpField2Mat) {
          this.warpField2Mat.opacity = 0.06 + Math.sin(t * 1.8 + 1) * 0.04;
        }
        if (this.warpField) {
          this.warpField.rotation.z += 0.005;
        }
        if (this.warpField2) {
          this.warpField2.rotation.z -= 0.003;
        }
        if (this.warpGlow) {
          this.warpGlow.intensity = 0.5 + Math.sin(t * 1.2) * 0.2;
        }
        if (this.warpRing) {
          this.warpRing.material.emissiveIntensity = 0.10 + Math.sin(t * 1.5) * 0.08;
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      if (this._resizeObs) this._resizeObs.disconnect();
      /* Remove from global instances array */
      const idx = instances.indexOf(this);
      if (idx !== -1) instances.splice(idx, 1);
      /* Dispose Three.js resources */
      this.scene.traverse(function(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map)          obj.material.map.dispose();
          if (obj.material.emissiveMap)  obj.material.emissiveMap.dispose();
          if (obj.material.bumpMap)      obj.material.bumpMap.dispose();
          if (obj.material.alphaMap)     obj.material.alphaMap.dispose();
          obj.material.dispose();
        }
      });
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      /* Stop animation loop if no instances remain */
      if (instances.length === 0) animating = false;
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
        console.warn('PlanetRenderer: WebGL failed for ' + type, e);
        /* Clean up any partial renderer */
        var canvas = container.querySelector('canvas');
        if (canvas) canvas.remove();
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
