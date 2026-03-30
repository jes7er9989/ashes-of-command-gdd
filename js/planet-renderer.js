/* ═══════════════════════════════════════════════════════════════
   PLANET RENDERER — Three.js 3D Planet Visualization
   Renders each planet type as a spinning 3D sphere with unique
   surface materials, atmospheric effects, and animations.
   Uses shared animation loop for performance.
   Requires Three.js (loaded from CDN).
   ═══════════════════════════════════════════════════════════════ */

window.PlanetRenderer = (function () {
  'use strict';

  const instances = [];
  let animating = false;

  /* ── Shared Animation Loop ── */
  function tick() {
    if (!animating) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < instances.length; i++) {
      instances[i].update(t);
    }
    requestAnimationFrame(tick);
  }

  function startLoop() {
    if (animating) return;
    animating = true;
    requestAnimationFrame(tick);
  }

  /* ── Planet Instance ── */
  class Planet {
    constructor(container, type) {
      this.container = container;
      this.type = type;
      this.clock = 0;

      const size = container.clientWidth || 400;
      const h = container.clientHeight || size;

      /* Renderer */
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setSize(size, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000000, 0);
      container.appendChild(this.renderer.domElement);

      /* Scene + Camera */
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, size / h, 0.1, 100);
      this.camera.position.z = 3.2;

      /* Lighting */
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(3, 1, 4);
      this.scene.add(sun);
      const ambient = new THREE.AmbientLight(0x222233, 0.4);
      this.scene.add(ambient);

      /* Build planet based on type */
      this._build(type);

      /* Initial render */
      this.renderer.render(this.scene, this.camera);
    }

    _build(type) {
      const builders = {
        'Capital World': this._capitalWorld,
        'Terrestrial': this._terrestrial,
        'Volcanic': this._volcanic,
        'Ocean/Archipelago': this._ocean,
        'Jungle': this._jungle,
        'Desert': this._desert,
        'Ice World': this._iceWorld,
        'Ancient Ruins': this._ancientRuins,
        'Gas Giant': this._gasGiant,
        'Moon': this._moon,
        'Orbital Station': this._orbitalStation,
        'Dead World': this._deadWorld,
      };
      const fn = builders[type] || builders['Terrestrial'];
      fn.call(this);
    }

    /* ── Utility: create sphere with glow ── */
    _sphere(radius, color, opts) {
      const geo = new THREE.SphereGeometry(radius, 64, 64);
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: opts.shininess || 15,
        emissive: opts.emissive || 0x000000,
        emissiveIntensity: opts.emissiveIntensity || 0,
        transparent: opts.transparent || false,
        opacity: opts.opacity || 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
      return mesh;
    }

    _atmosphere(radius, color, opacity) {
      const geo = new THREE.SphereGeometry(radius, 48, 48);
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: opacity || 0.15,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
      return mesh;
    }

    _cloudLayer(radius, opacity, speed) {
      const geo = new THREE.SphereGeometry(radius, 48, 48);
      const mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: opacity || 0.2,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.rotSpeed = speed || 0.003;
      this.scene.add(mesh);
      return mesh;
    }

    _ring(innerR, outerR, color, opacity) {
      const geo = new THREE.RingGeometry(innerR, outerR, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: opacity || 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI * 0.42;
      this.scene.add(mesh);
      return mesh;
    }

    _moonObj(radius, color, dist, angle) {
      const geo = new THREE.SphereGeometry(radius, 16, 16);
      const mat = new THREE.MeshPhongMaterial({ color: color, shininess: 5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(angle) * dist, Math.sin(angle * 0.3) * dist * 0.3, Math.sin(angle) * dist);
      this.scene.add(mesh);
      return mesh;
    }

    _starfield() {
      const geo = new THREE.BufferGeometry();
      const verts = [];
      for (let i = 0; i < 200; i++) {
        const r = 15 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        verts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.6 });
      this.scene.add(new THREE.Points(geo, mat));
    }

    /* ════════════════════════════════════
       PLANET TYPE BUILDERS
       ════════════════════════════════════ */

    _capitalWorld() {
      this._starfield();
      this.planet = this._sphere(1, 0x887050, { shininess: 20, emissive: 0x221100, emissiveIntensity: 0.15 });

      /* City lights on night side — emissive spots */
      const cityGeo = new THREE.SphereGeometry(1.005, 64, 64);
      const cityMat = new THREE.MeshBasicMaterial({
        color: 0xffcc44,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      /* We'll use a custom approach — small point lights around the sphere */
      const cityPositions = [
        [0.3, 0.2, -0.9], [-0.4, -0.1, -0.85], [-0.2, 0.5, -0.8],
        [0.1, -0.4, -0.88], [-0.5, 0.3, -0.75], [0.4, -0.3, -0.82],
      ];
      this.cityLights = [];
      for (let i = 0; i < cityPositions.length; i++) {
        const p = cityPositions[i];
        const light = new THREE.PointLight(0xffcc44, 0.3, 2);
        light.position.set(p[0], p[1], p[2]);
        this.scene.add(light);
        this.cityLights.push(light);
      }

      this._atmosphere(1.08, 0xd4a860, 0.12);
      this._cloudLayer(1.02, 0.08, 0.002);

      /* Orbital ring */
      this._ring(1.4, 1.45, 0xc0c8d8, 0.25);

      this.planet.userData.rotSpeed = 0.004;
    }

    _terrestrial() {
      this._starfield();
      this.planet = this._sphere(1, 0x2266aa, { shininess: 30 });

      /* Continent patches — use a second sphere with vertex displacement illusion */
      const landGeo = new THREE.SphereGeometry(1.003, 64, 64);
      const landMat = new THREE.MeshPhongMaterial({
        color: 0x5a8a3a,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      this.land = new THREE.Mesh(landGeo, landMat);
      this.scene.add(this.land);

      this._atmosphere(1.08, 0x4488cc, 0.15);
      this.clouds = this._cloudLayer(1.025, 0.22, 0.003);
      this.clouds2 = this._cloudLayer(1.035, 0.12, -0.002);

      /* Ice caps */
      const capGeo = new THREE.SphereGeometry(1.004, 32, 8, 0, Math.PI * 2, 0, 0.3);
      const capMat = new THREE.MeshPhongMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.5, depthWrite: false });
      const northCap = new THREE.Mesh(capGeo, capMat);
      this.scene.add(northCap);
      const southCapGeo = new THREE.SphereGeometry(1.004, 32, 8, 0, Math.PI * 2, 2.9, 0.3);
      const southCap = new THREE.Mesh(southCapGeo, capMat.clone());
      this.scene.add(southCap);

      this.planet.userData.rotSpeed = 0.003;
      this.land.userData.rotSpeed = 0.003;
    }

    _volcanic() {
      this._starfield();
      this.planet = this._sphere(1, 0x2a1208, { shininess: 8, emissive: 0x331100, emissiveIntensity: 0.25 });

      /* Lava glow layer */
      const lavaGeo = new THREE.SphereGeometry(1.004, 64, 64);
      const lavaMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      });
      this.lavaLayer = new THREE.Mesh(lavaGeo, lavaMat);
      this.scene.add(this.lavaLayer);

      /* Lava veins — emissive point lights scattered */
      this.lavaLights = [];
      const lavaPos = [
        [0.5, 0.3, 0.8], [-0.3, 0.6, 0.7], [0.7, -0.2, 0.65],
        [-0.5, -0.4, 0.7], [0.2, 0.7, 0.65], [-0.6, 0.1, 0.75],
        [0.4, -0.6, 0.6], [-0.1, -0.7, 0.7], [0.6, 0.5, 0.55],
      ];
      for (let i = 0; i < lavaPos.length; i++) {
        const p = lavaPos[i];
        const light = new THREE.PointLight(0xff6600, 0.4, 1.5);
        light.position.set(p[0], p[1], p[2]);
        this.scene.add(light);
        this.lavaLights.push({ light: light, baseIntensity: 0.2 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2 });
      }

      /* Eruption point light */
      this.eruption = new THREE.PointLight(0xffdd00, 1.0, 3);
      this.eruption.position.set(0.6, 0.4, 0.75);
      this.scene.add(this.eruption);

      this._atmosphere(1.08, 0xff4400, 0.08);

      /* Ash clouds */
      this.ashClouds = this._cloudLayer(1.03, 0.10, 0.001);
      this.ashClouds.material.color.set(0x3a1808);

      this.planet.userData.rotSpeed = 0.0025;
      this.lavaLayer.userData.rotSpeed = 0.0025;
    }

    _ocean() {
      this._starfield();
      this.planet = this._sphere(1, 0x1155aa, { shininess: 50 });

      /* Deep ocean variation */
      const deepGeo = new THREE.SphereGeometry(1.002, 48, 48);
      const deepMat = new THREE.MeshPhongMaterial({ color: 0x082244, transparent: true, opacity: 0.2, depthWrite: false });
      this.deep = new THREE.Mesh(deepGeo, deepMat);
      this.scene.add(this.deep);

      /* Tiny island dots */
      const islandPos = [
        [0.4, 0.3, 0.85], [0.6, -0.1, 0.78], [0.2, -0.4, 0.88],
        [0.5, 0.5, 0.68], [-0.1, 0.3, 0.94], [0.3, -0.2, 0.92],
      ];
      for (let i = 0; i < islandPos.length; i++) {
        const p = islandPos[i];
        const geo = new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: 0x3a8838 });
        const isle = new THREE.Mesh(geo, mat);
        isle.position.set(p[0], p[1], p[2]).normalize().multiplyScalar(1.005);
        this.planet.add(isle);
      }

      this._atmosphere(1.08, 0x4488cc, 0.18);

      /* Thick cloud cover */
      this.clouds = this._cloudLayer(1.025, 0.28, 0.004);
      this.clouds2 = this._cloudLayer(1.04, 0.15, -0.003);

      /* Polar ice */
      const capGeo = new THREE.SphereGeometry(1.004, 32, 8, 0, Math.PI * 2, 0, 0.25);
      const capMat = new THREE.MeshPhongMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0.35, depthWrite: false });
      this.scene.add(new THREE.Mesh(capGeo, capMat));

      this.planet.userData.rotSpeed = 0.003;
      this.deep.userData.rotSpeed = 0.003;
    }

    _jungle() {
      this._starfield();
      this.planet = this._sphere(1, 0x144016, { shininess: 12, emissive: 0x001a04, emissiveIntensity: 0.1 });

      /* Lighter canopy highlights */
      const hiGeo = new THREE.SphereGeometry(1.003, 48, 48);
      const hiMat = new THREE.MeshPhongMaterial({ color: 0x2a7830, transparent: true, opacity: 0.3, depthWrite: false });
      this.canopyHi = new THREE.Mesh(hiGeo, hiMat);
      this.scene.add(this.canopyHi);

      /* Rivers — thin lines using cylinder geometry along surface */
      /* (simplified as emissive streaks on the surface) */

      this._atmosphere(1.08, 0x22aa44, 0.10);

      /* Very thick tropical clouds */
      this.clouds = this._cloudLayer(1.02, 0.30, 0.0035);
      this.clouds2 = this._cloudLayer(1.035, 0.18, -0.002);
      this.clouds3 = this._cloudLayer(1.05, 0.10, 0.0015);

      /* Bioluminescence — faint glow points on night side */
      this.bioLights = [];
      const bioPos = [
        [-0.4, 0.2, -0.88], [-0.6, -0.1, -0.78], [-0.3, -0.5, -0.80],
        [-0.5, 0.4, -0.72], [-0.2, -0.3, -0.92],
      ];
      for (let i = 0; i < bioPos.length; i++) {
        const p = bioPos[i];
        const light = new THREE.PointLight(0x22ff88, 0.15, 1);
        light.position.set(p[0], p[1], p[2]);
        this.scene.add(light);
        this.bioLights.push({ light: light, phase: Math.random() * Math.PI * 2 });
      }

      this.planet.userData.rotSpeed = 0.003;
      this.canopyHi.userData.rotSpeed = 0.003;
    }

    _desert() {
      this._starfield();
      this.planet = this._sphere(1, 0xb08030, { shininess: 25 });

      /* Darker mesa regions */
      const mesaGeo = new THREE.SphereGeometry(1.003, 48, 48);
      const mesaMat = new THREE.MeshPhongMaterial({ color: 0x7a5020, transparent: true, opacity: 0.25, depthWrite: false });
      this.mesa = new THREE.Mesh(mesaGeo, mesaMat);
      this.scene.add(this.mesa);

      this._atmosphere(1.08, 0xd4a850, 0.08);

      /* Thin wispy clouds / sandstorm haze */
      this.clouds = this._cloudLayer(1.025, 0.06, 0.002);
      this.clouds.material.color.set(0xd8b060);

      /* Polar residual ice */
      const capGeo = new THREE.SphereGeometry(1.004, 32, 8, 0, Math.PI * 2, 0, 0.18);
      const capMat = new THREE.MeshPhongMaterial({ color: 0xe8e0d0, transparent: true, opacity: 0.25, depthWrite: false });
      this.scene.add(new THREE.Mesh(capGeo, capMat));

      this.planet.userData.rotSpeed = 0.002;
      this.mesa.userData.rotSpeed = 0.002;
    }

    _iceWorld() {
      this._starfield();
      this.planet = this._sphere(1, 0x90c0e8, { shininess: 60 });

      /* Glacier ridges — slightly brighter overlay */
      const iceGeo = new THREE.SphereGeometry(1.003, 48, 48);
      const iceMat = new THREE.MeshPhongMaterial({ color: 0xc8ddf0, transparent: true, opacity: 0.2, depthWrite: false });
      this.iceOverlay = new THREE.Mesh(iceGeo, iceMat);
      this.scene.add(this.iceOverlay);

      this._atmosphere(1.08, 0x88bbee, 0.15);

      /* Blizzard clouds */
      this.clouds = this._cloudLayer(1.025, 0.25, 0.003);
      this.clouds2 = this._cloudLayer(1.04, 0.15, -0.002);

      /* Heavy polar caps */
      const capGeo = new THREE.SphereGeometry(1.005, 32, 8, 0, Math.PI * 2, 0, 0.5);
      const capMat = new THREE.MeshPhongMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.4, depthWrite: false });
      this.scene.add(new THREE.Mesh(capGeo, capMat));
      const sCapGeo = new THREE.SphereGeometry(1.005, 32, 8, 0, Math.PI * 2, 2.7, 0.5);
      this.scene.add(new THREE.Mesh(sCapGeo, capMat.clone()));

      /* Aurora — colored point light on night side */
      this.aurora = new THREE.PointLight(0x44ff88, 0.3, 3);
      this.aurora.position.set(-0.3, 0.9, -0.5);
      this.scene.add(this.aurora);
      this.aurora2 = new THREE.PointLight(0x8888ff, 0.2, 2.5);
      this.aurora2.position.set(-0.5, 0.7, -0.6);
      this.scene.add(this.aurora2);

      this.planet.userData.rotSpeed = 0.0025;
      this.iceOverlay.userData.rotSpeed = 0.0025;
    }

    _ancientRuins() {
      this._starfield();
      this.planet = this._sphere(1, 0x3a2818, { shininess: 10, emissive: 0x110820, emissiveIntensity: 0.15 });

      this._atmosphere(1.08, 0x9977dd, 0.10);

      /* Energy node lights — purple pulsing */
      this.energyLights = [];
      const nodePos = [
        [0.5, 0.3, 0.8], [-0.2, 0.6, 0.76], [0.3, -0.4, 0.85],
        [0.7, 0.1, 0.7], [-0.4, -0.3, 0.85], [0.1, 0.5, 0.85],
        [-0.6, 0.2, 0.75], [0.4, -0.1, 0.9],
      ];
      for (let i = 0; i < nodePos.length; i++) {
        const p = nodePos[i];
        const light = new THREE.PointLight(0xaa88ff, 0.3, 1.5);
        light.position.set(p[0], p[1], p[2]);
        this.scene.add(light);
        this.energyLights.push({ light: light, phase: i * 0.8, speed: 0.8 + Math.random() * 0.5 });
      }

      /* Faint geometric line hints */
      const lineMat = new THREE.LineBasicMaterial({ color: 0x8866cc, transparent: true, opacity: 0.15 });
      for (let i = 0; i < nodePos.length - 1; i++) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(nodePos[i][0], nodePos[i][1], nodePos[i][2]),
          new THREE.Vector3(nodePos[i + 1][0], nodePos[i + 1][1], nodePos[i + 1][2]),
        ]);
        this.planet.add(new THREE.Line(geo, lineMat));
      }

      this.planet.userData.rotSpeed = 0.0015;
    }

    _gasGiant() {
      this._starfield();

      /* Gas giant — large sphere with banded appearance */
      this.planet = this._sphere(1, 0xb88838, { shininess: 20 });

      /* Band layers — multiple overlapping transparent spheres at slight offsets */
      const bandColors = [0xc89840, 0x8a5c28, 0xd4a850, 0x9a6c30, 0xc8a040, 0x7a5020];
      this.bands = [];
      for (let i = 0; i < bandColors.length; i++) {
        const bandGeo = new THREE.SphereGeometry(1.001 + i * 0.001, 48, 48);
        const bandMat = new THREE.MeshPhongMaterial({
          color: bandColors[i],
          transparent: true,
          opacity: 0.08 + (i % 2) * 0.04,
          depthWrite: false,
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.userData.rotSpeed = 0.005 + (i % 2 === 0 ? 0.001 : -0.002) * (i + 1);
        this.scene.add(band);
        this.bands.push(band);
      }

      /* Great storm spot */
      const stormLight = new THREE.PointLight(0xf0d8a0, 0.4, 2);
      stormLight.position.set(0.6, -0.2, 0.78);
      this.planet.add(stormLight);

      /* Rings */
      this._ring(1.5, 1.55, 0xd8c0a0, 0.20);
      this._ring(1.58, 1.62, 0xc8b090, 0.12);
      this._ring(1.42, 1.48, 0xb8a080, 0.08);

      /* Moons */
      this._moonObj(0.06, 0xc8c0b0, 2.0, 0.5);
      this._moonObj(0.04, 0xa8a098, 2.3, 2.1);
      this._moonObj(0.035, 0xb8b0a0, 1.8, 4.2);

      this._atmosphere(1.06, 0xd4a850, 0.06);
      this.planet.userData.rotSpeed = 0.006;
    }

    _moon() {
      this._starfield();

      /* Parent planet in background */
      const parentGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const parentMat = new THREE.MeshPhongMaterial({ color: 0x2244aa, transparent: true, opacity: 0.15 });
      const parent = new THREE.Mesh(parentGeo, parentMat);
      parent.position.set(4, -2, -6);
      this.scene.add(parent);

      this.planet = this._sphere(1, 0x888078, { shininess: 8 });

      /* Crater geometry — darker spots with rim highlights */
      const craterPos = [
        { p: [0.3, 0.4, 0.86], r: 0.12 },
        { p: [-0.2, 0.5, 0.84], r: 0.10 },
        { p: [0.5, -0.1, 0.86], r: 0.08 },
        { p: [-0.4, -0.3, 0.86], r: 0.14 },
        { p: [0.1, -0.5, 0.86], r: 0.09 },
        { p: [0.6, 0.3, 0.74], r: 0.06 },
        { p: [-0.3, 0.1, 0.95], r: 0.07 },
        { p: [0.2, 0.2, 0.96], r: 0.05 },
      ];
      for (let i = 0; i < craterPos.length; i++) {
        const c = craterPos[i];
        const cGeo = new THREE.CircleGeometry(c.r, 16);
        const cMat = new THREE.MeshPhongMaterial({ color: 0x504840, transparent: true, opacity: 0.35, depthWrite: false });
        const crater = new THREE.Mesh(cGeo, cMat);
        const pos = new THREE.Vector3(c.p[0], c.p[1], c.p[2]).normalize();
        crater.position.copy(pos.multiplyScalar(1.002));
        crater.lookAt(0, 0, 0);
        crater.rotateY(Math.PI);
        this.planet.add(crater);
      }

      /* Maria (darker plains) */
      const mariaGeo = new THREE.SphereGeometry(1.002, 48, 48);
      const mariaMat = new THREE.MeshPhongMaterial({ color: 0x5a5448, transparent: true, opacity: 0.12, depthWrite: false });
      this.maria = new THREE.Mesh(mariaGeo, mariaMat);
      this.scene.add(this.maria);

      /* No atmosphere — sharp edge */
      this.planet.userData.rotSpeed = 0.001;
      this.maria.userData.rotSpeed = 0.001;
    }

    _orbitalStation() {
      this._starfield();

      /* Background planet */
      const bgGeo = new THREE.SphereGeometry(2, 32, 32);
      const bgMat = new THREE.MeshPhongMaterial({ color: 0x1a3060, transparent: true, opacity: 0.12 });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      bg.position.set(-3, -2.5, -5);
      this.scene.add(bg);

      /* Main hull — box */
      const hullGeo = new THREE.BoxGeometry(1.2, 0.5, 0.5);
      const hullMat = new THREE.MeshPhongMaterial({ color: 0x1a1c24, shininess: 30 });
      this.station = new THREE.Mesh(hullGeo, hullMat);
      this.scene.add(this.station);

      /* Hull edge lines */
      const edges = new THREE.EdgesGeometry(hullGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x4a5060, transparent: true, opacity: 0.5 });
      this.station.add(new THREE.LineSegments(edges, lineMat));

      /* Solar panels */
      const panelGeo = new THREE.BoxGeometry(0.6, 0.02, 0.25);
      const panelMat = new THREE.MeshPhongMaterial({ color: 0x182840, shininess: 40, emissive: 0x112244, emissiveIntensity: 0.1 });
      const leftPanel = new THREE.Mesh(panelGeo, panelMat);
      leftPanel.position.set(-0.9, 0.1, 0);
      this.station.add(leftPanel);
      const rightPanel = new THREE.Mesh(panelGeo, panelMat.clone());
      rightPanel.position.set(0.9, -0.1, 0);
      this.station.add(rightPanel);

      /* Habitat ring */
      const ringGeo = new THREE.TorusGeometry(0.6, 0.04, 8, 32);
      const ringMat = new THREE.MeshPhongMaterial({ color: 0x4a5060, shininess: 20 });
      this.habRing = new THREE.Mesh(ringGeo, ringMat);
      this.habRing.rotation.x = Math.PI / 2;
      this.station.add(this.habRing);

      /* Nav lights */
      this.navRed = new THREE.PointLight(0xff4444, 0.5, 2);
      this.navRed.position.set(-0.6, 0.25, 0.25);
      this.station.add(this.navRed);
      this.navGreen = new THREE.PointLight(0x44ff44, 0.5, 2);
      this.navGreen.position.set(0.6, 0.25, 0.25);
      this.station.add(this.navGreen);
      this.beacon = new THREE.PointLight(0xffffff, 0.4, 2);
      this.beacon.position.set(0, 0.35, 0);
      this.station.add(this.beacon);

      /* Window glow */
      const windowLight = new THREE.PointLight(0xaaccff, 0.3, 1.5);
      windowLight.position.set(0, 0, 0.3);
      this.station.add(windowLight);

      /* Slow tumble */
      this.station.userData.rotSpeed = 0.002;
      this.planet = this.station; // for update loop
    }

    _deadWorld() {
      this._starfield();
      this.planet = this._sphere(1, 0x484038, { shininess: 5, emissive: 0x080604, emissiveIntensity: 0.05 });

      /* Impact scars */
      const scarPos = [
        { p: [0.3, 0.2, 0.93], r: 0.18 },
        { p: [-0.4, 0.3, 0.86], r: 0.12 },
        { p: [0.5, -0.3, 0.81], r: 0.10 },
        { p: [-0.2, -0.5, 0.84], r: 0.15 },
        { p: [0.1, 0.6, 0.79], r: 0.08 },
      ];
      for (let i = 0; i < scarPos.length; i++) {
        const c = scarPos[i];
        const cGeo = new THREE.CircleGeometry(c.r, 16);
        const cMat = new THREE.MeshPhongMaterial({ color: 0x222018, transparent: true, opacity: 0.40, depthWrite: false });
        const scar = new THREE.Mesh(cGeo, cMat);
        const pos = new THREE.Vector3(c.p[0], c.p[1], c.p[2]).normalize();
        scar.position.copy(pos.multiplyScalar(1.002));
        scar.lookAt(0, 0, 0);
        scar.rotateY(Math.PI);
        this.planet.add(scar);
      }

      /* Radiation glow in biggest crater */
      this.radGlow = new THREE.PointLight(0x664422, 0.15, 1.5);
      this.radGlow.position.set(0.3, 0.2, 1.0);
      this.planet.add(this.radGlow);

      /* Orbiting debris */
      this.debrisGroup = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const dGeo = new THREE.BoxGeometry(0.02 + Math.random() * 0.02, 0.01, 0.01);
        const dMat = new THREE.MeshPhongMaterial({ color: 0x585048 });
        const debris = new THREE.Mesh(dGeo, dMat);
        const angle = (i / 8) * Math.PI * 2;
        const dist = 1.3 + Math.random() * 0.3;
        debris.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 0.2, Math.sin(angle) * dist);
        debris.rotation.set(Math.random(), Math.random(), Math.random());
        this.debrisGroup.add(debris);
      }
      this.scene.add(this.debrisGroup);

      /* No atmosphere */
      this.planet.userData.rotSpeed = 0.0008;
    }

    /* ════════════════════════════════════
       UPDATE — called each frame
       ════════════════════════════════════ */
    update(t) {
      const dt = 0.016; // ~60fps

      /* Planet rotation */
      if (this.planet && this.planet.userData.rotSpeed) {
        this.planet.rotation.y += this.planet.userData.rotSpeed;
      }
      if (this.land && this.land.userData.rotSpeed) {
        this.land.rotation.y += this.land.userData.rotSpeed;
      }
      if (this.canopyHi && this.canopyHi.userData.rotSpeed) {
        this.canopyHi.rotation.y += this.canopyHi.userData.rotSpeed;
      }
      if (this.maria && this.maria.userData.rotSpeed) {
        this.maria.rotation.y += this.maria.userData.rotSpeed;
      }
      if (this.mesa && this.mesa.userData.rotSpeed) {
        this.mesa.rotation.y += this.mesa.userData.rotSpeed;
      }
      if (this.iceOverlay && this.iceOverlay.userData.rotSpeed) {
        this.iceOverlay.rotation.y += this.iceOverlay.userData.rotSpeed;
      }
      if (this.deep && this.deep.userData.rotSpeed) {
        this.deep.rotation.y += this.deep.userData.rotSpeed;
      }

      /* Cloud rotation */
      if (this.clouds && this.clouds.userData.rotSpeed) {
        this.clouds.rotation.y += this.clouds.userData.rotSpeed;
      }
      if (this.clouds2 && this.clouds2.userData.rotSpeed) {
        this.clouds2.rotation.y += this.clouds2.userData.rotSpeed;
      }
      if (this.clouds3 && this.clouds3.userData.rotSpeed) {
        this.clouds3.rotation.y += this.clouds3.userData.rotSpeed;
      }
      if (this.ashClouds && this.ashClouds.userData.rotSpeed) {
        this.ashClouds.rotation.y += this.ashClouds.userData.rotSpeed;
      }

      /* Gas giant bands */
      if (this.bands) {
        for (let i = 0; i < this.bands.length; i++) {
          this.bands[i].rotation.y += this.bands[i].userData.rotSpeed;
        }
      }

      /* Lava light pulsing */
      if (this.lavaLights) {
        for (let i = 0; i < this.lavaLights.length; i++) {
          const ll = this.lavaLights[i];
          ll.light.intensity = ll.baseIntensity + Math.sin(t * 1.5 + ll.phase) * 0.2;
        }
      }
      if (this.lavaLayer) {
        this.lavaLayer.material.opacity = 0.12 + Math.sin(t * 0.8) * 0.05;
        this.lavaLayer.rotation.y += 0.0025;
      }

      /* Eruption flicker */
      if (this.eruption) {
        this.eruption.intensity = 0.5 + Math.sin(t * 8) * 0.3 + Math.sin(t * 13) * 0.2;
      }

      /* City light pulsing */
      if (this.cityLights) {
        for (let i = 0; i < this.cityLights.length; i++) {
          this.cityLights[i].intensity = 0.2 + Math.sin(t * 0.8 + i * 1.2) * 0.1;
        }
      }

      /* Bio-luminescence pulsing */
      if (this.bioLights) {
        for (let i = 0; i < this.bioLights.length; i++) {
          const bl = this.bioLights[i];
          bl.light.intensity = 0.08 + Math.sin(t * 0.6 + bl.phase) * 0.08;
        }
      }

      /* Energy node pulsing (Ancient Ruins) */
      if (this.energyLights) {
        for (let i = 0; i < this.energyLights.length; i++) {
          const el = this.energyLights[i];
          el.light.intensity = 0.15 + Math.sin(t * el.speed + el.phase) * 0.2;
        }
      }

      /* Aurora dancing (Ice World) */
      if (this.aurora) {
        this.aurora.intensity = 0.15 + Math.sin(t * 0.7) * 0.15;
        this.aurora.position.x = -0.3 + Math.sin(t * 0.4) * 0.15;
      }
      if (this.aurora2) {
        this.aurora2.intensity = 0.1 + Math.sin(t * 0.5 + 1) * 0.1;
        this.aurora2.position.x = -0.5 + Math.sin(t * 0.3 + 2) * 0.12;
      }

      /* Nav light blinking (Orbital Station) */
      if (this.navRed) {
        this.navRed.intensity = Math.sin(t * 3) > 0 ? 0.5 : 0.05;
      }
      if (this.navGreen) {
        this.navGreen.intensity = Math.sin(t * 3) > 0 ? 0.5 : 0.05;
      }
      if (this.beacon) {
        this.beacon.intensity = Math.sin(t * 4) > 0.3 ? 0.4 : 0.05;
      }
      if (this.habRing) {
        this.habRing.rotation.z += 0.01;
      }

      /* Radiation glow flicker (Dead World) */
      if (this.radGlow) {
        this.radGlow.intensity = 0.08 + Math.sin(t * 0.3) * 0.07;
      }
      if (this.debrisGroup) {
        this.debrisGroup.rotation.y += 0.0005;
      }

      /* Render */
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  /* ── Public API ── */
  return {
    /**
     * Initialize a planet renderer in a container element.
     * @param {HTMLElement} container - DOM element to render into
     * @param {string} type - Planet type name (e.g. 'Volcanic')
     */
    create: function (container, type) {
      if (typeof THREE === 'undefined') {
        console.warn('PlanetRenderer: Three.js not loaded');
        return null;
      }
      const planet = new Planet(container, type);
      instances.push(planet);
      startLoop();
      return planet;
    },

    /** Dispose all planet renderers */
    disposeAll: function () {
      for (let i = 0; i < instances.length; i++) {
        instances[i].dispose();
      }
      instances.length = 0;
      animating = false;
    },
  };
})();
