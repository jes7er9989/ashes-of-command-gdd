/* ═══════════════════════════════════════════════════════════════
   PLANET TEXTURES — Procedural Canvas Texture Generator v3
   2048×1024 high-detail surface, emissive, bump, and cloud
   textures using gradient noise, turbulence, cellular/Voronoi,
   multi-frequency domain warping, and ridged fBm.
   ═══════════════════════════════════════════════════════════════ */

window.PlanetTextures = (function () {
  'use strict';

  const SIZE = 2048;
  const HALF = 1024;

  /* ──────────────────────────────────────────────────────────────
     GRADIENT NOISE  (Perlin-style, smoother than value noise)
     ────────────────────────────────────────────────────────────── */
  const PERM = new Uint8Array(512);
  const GRAD = [
    [1,1],[-1,1],[1,-1],[-1,-1],
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[-1,0],[0,-1],[1,-1]
  ];
  (function seedPerm() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // deterministic Fisher-Yates
    let seed = 12345;
    function rnd() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 1) / 0x7fffffff; }
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  })();

  function grad2(hash2, x, y) {
    const g = GRAD[hash2 & 11];
    return g[0] * x + g[1] * y;
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  function gnoise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = PERM[PERM[X] + Y],   ab = PERM[PERM[X] + Y + 1];
    const ba = PERM[PERM[X+1] + Y], bb = PERM[PERM[X+1] + Y + 1];
    const g1 = grad2(aa, xf,   yf);
    const g2 = grad2(ba, xf-1, yf);
    const g3 = grad2(ab, xf,   yf-1);
    const g4 = grad2(bb, xf-1, yf-1);
    const lx1 = g1 + u * (g2 - g1);
    const lx2 = g3 + u * (g4 - g3);
    return (lx1 + v * (lx2 - lx1)) * 0.5 + 0.5; // remap [-1,1] → [0,1]
  }

  /* ──────────────────────────────────────────────────────────────
     NOISE FUNCTIONS
     ────────────────────────────────────────────────────────────── */

  // Value noise fallback (kept for specific uses)
  function hash(x, y) {
    let n = ((x * 374761393 + y * 668265263) | 0);
    n = ((n ^ (n >> 13)) * 1274126177) | 0;
    return (n & 0x7fffffff) / 0x7fffffff;
  }

  // fBm with gradient noise — 8-10 octaves for fine detail
  function fbm(x, y, oct) {
    let v = 0, a = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      v += gnoise(x * f, y * f) * a;
      norm += a;
      a *= 0.5; f *= 2.07;
    }
    return v / norm;
  }

  // Turbulence — absolute value gives creased/folded appearance
  function turbulence(x, y, oct) {
    let v = 0, a = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      v += Math.abs(gnoise(x * f, y * f) * 2 - 1) * a;
      norm += a;
      a *= 0.5; f *= 2.07;
    }
    return 1.0 - v / norm;
  }

  // Ridged noise — inverted turbulence, sharp ridges
  function ridged(x, y, oct) {
    let v = 0, a = 0.5, f = 1, norm = 0, prev = 1;
    for (let i = 0; i < oct; i++) {
      let n = Math.abs(gnoise(x * f, y * f) * 2 - 1);
      n = (1.0 - n) * (1.0 - n) * prev;
      v += n * a;
      norm += a;
      prev = n;
      a *= 0.5; f *= 2.1;
    }
    return v / norm;
  }

  // Multi-frequency domain warp — more complex than single-layer
  function warp(x, y, oct, strength) {
    const qx = fbm(x + 0.0, y + 0.0, oct);
    const qy = fbm(x + 5.2, y + 1.3, oct);
    const rx = fbm(x + strength * qx + 1.7, y + strength * qy + 9.2, oct);
    const ry = fbm(x + strength * qx + 8.3, y + strength * qy + 2.8, oct);
    return fbm(x + strength * rx, y + strength * ry, oct);
  }

  // Cellular / Voronoi noise — returns distance to nearest feature point
  function voronoi(x, y, scale) {
    const sx = x * scale, sy = y * scale;
    const ix = Math.floor(sx), iy = Math.floor(sy);
    let minD = 1e9;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = ix + dx, cy = iy + dy;
        const px = cx + hash(cx, cy);
        const py = cy + hash(cx + 7411, cy + 3571);
        const d = Math.sqrt((sx - px) * (sx - px) + (sy - py) * (sy - py));
        if (d < minD) minD = d;
      }
    }
    return Math.min(1, minD);
  }

  // Second-closest Voronoi distance (good for cell edges/boundaries)
  function voronoiEdge(x, y, scale) {
    const sx = x * scale, sy = y * scale;
    const ix = Math.floor(sx), iy = Math.floor(sy);
    let d1 = 1e9, d2 = 1e9;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = ix + dx, cy = iy + dy;
        const px = cx + hash(cx, cy);
        const py = cy + hash(cx + 7411, cy + 3571);
        const d = Math.sqrt((sx - px) * (sx - px) + (sy - py) * (sy - py));
        if (d < d1) { d2 = d1; d1 = d; }
        else if (d < d2) { d2 = d; }
      }
    }
    return d2 - d1; // sharp at cell edges
  }

  /* ──────────────────────────────────────────────────────────────
     UTILITIES
     ────────────────────────────────────────────────────────────── */
  function createCanvas() {
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = HALF;
    return c;
  }

  function toTex(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  function clamp(v) { return Math.max(0, Math.min(255, v | 0)); }
  function lerp(a, b, t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return a + (b - a) * t; }
  function put(d, i, r, g, b, a) {
    d[i]   = clamp(r);
    d[i+1] = clamp(g);
    d[i+2] = clamp(b);
    d[i+3] = a !== undefined ? clamp(a) : 255;
  }
  function lerpColor(c1, c2, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [c1[0]+(c2[0]-c1[0])*t, c1[1]+(c2[1]-c1[1])*t, c1[2]+(c2[2]-c1[2])*t];
  }
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /* ════════════════════════════════════════════════════════════════
     CAPITAL WORLD
     Urban sprawl with Voronoi city grids, megacity glow,
     highway spines, dark water bodies, orbital ring details.
     Returns { map, emissive, bump }
     ════════════════════════════════════════════════════════════════ */
  function capitalWorld() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cE = createCanvas(), ctxE = cE.getContext('2d'), imgE = ctxE.createImageData(SIZE, HALF), dE = imgE.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 12, ny = y / HALF * 6;

        // Continent/water mask
        const land = warp(nx, ny, 9, 0.65);
        // City density field (independent of land)
        const cityDens = fbm(nx * 2.2 + 100, ny * 2.2 + 50, 8);
        const det = fbm(nx * 9, ny * 9, 6);
        const micro = fbm(nx * 20, ny * 20, 4);

        // Voronoi city blocks
        const cityGrid = voronoi(nx, ny, 3.5);
        const cityEdge = voronoiEdge(nx, ny, 3.5);

        // Fine street grid overlay
        const streetX = Math.abs(Math.sin(nx * 14.0 + cityDens * 5));
        const streetY = Math.abs(Math.sin(ny * 18.0 + cityDens * 4));
        const onStreet = streetX < 0.05 || streetY < 0.05;
        const onHighway = Math.abs(Math.sin(nx * 5 + ny * 1.8 + 0.5)) < 0.018 ||
                          Math.abs(Math.sin(nx * 2.3 - ny * 3.1)) < 0.018;

        let r, g, b, er = 0, eg = 0, eb = 0, bmp = 128;

        if (land < 0.37) {
          // Ocean / water bodies
          const wn = fbm(nx * 3 + 200, ny * 3 + 200, 6);
          const wave = fbm(nx * 15, ny * 15, 4);
          r = 8  + wn * 20 + wave * 8;
          g = 18 + wn * 28 + wave * 6;
          b = 52 + wn * 45 + wave * 10;
          // Subtle light reflection near land
          if (land > 0.33) { r += 12; g += 18; b += 20; }
          bmp = 30 + (wn * 25) | 0;
        } else if (land < 0.41) {
          // Coastal industrial / port zones
          r = 55 + det * 30; g = 48 + det * 22; b = 38 + det * 18;
          bmp = 90 + det * 40;
        } else {
          // URBAN LAND
          // Base metallic-gray city terrain
          r = 75 + land * 45 + det * 18 + micro * 8;
          g = 60 + land * 36 + det * 14 + micro * 6;
          b = 45 + land * 26 + det * 10 + micro * 4;
          bmp = 100 + land * 80 + cityDens * 40;

          // Voronoi block boundaries (district walls/parks)
          if (cityGrid < 0.12) {
            const edge = 1 - cityGrid / 0.12;
            r += edge * 18; g += edge * 16; b += edge * 12;
            bmp += edge * 30;
          }

          // Street grid lines
          if (onStreet) {
            r = r * 0.75 + 15; g = g * 0.75 + 12; b = b * 0.75 + 18;
            bmp -= 15;
          }

          // Highway network (bright)
          if (onHighway && land > 0.42) {
            r = Math.min(255, r + 50); g = Math.min(255, g + 42); b = Math.min(255, b + 28);
            er = 30; eg = 25; eb = 12;
            bmp += 20;
          }

          // Megacity cores (golden glow)
          if (cityDens > 0.60) {
            const glow = smoothstep(0.60, 0.88, cityDens);
            r = lerp(r, 255, glow * 0.75);
            g = lerp(g, 210, glow * 0.65);
            b = lerp(b, 90,  glow * 0.35);
            er = Math.max(er, glow * 220);
            eg = Math.max(eg, glow * 165);
            eb = Math.max(eb, glow * 45);
            bmp += glow * 60;
          }

          // Industrial sprawl (darker, grayer)
          if (det < 0.32 && land > 0.50) {
            r = r * 0.60 + 12; g = g * 0.60 + 10; b = b * 0.60 + 16;
            bmp -= 20;
          }

          // Green park / reservoir zones (rare)
          if (det > 0.78 && cityDens < 0.38 && land > 0.46) {
            r = r * 0.55 + 10; g = g * 0.75 + 28; b = b * 0.50 + 8;
            bmp -= 30;
          }

          // Spaceport pads (large flat bright areas)
          const port = voronoi(nx * 1.5 + 30, ny * 1.5 + 30, 1.2);
          if (port < 0.08 && cityDens > 0.45) {
            r = 165; g = 155; b = 140;
            bmp = 200;
          }

          // Orbital ring — bright dots in a latitude band
          if (lat > 0.04 && lat < 0.08) {
            const ring = Math.abs(Math.sin(nx * 80));
            if (ring > 0.94) {
              r = 230; g = 230; b = 255;
              er = 180; eg = 180; eb = 230;
            }
          }
        }

        // Atmospheric haze at poles
        if (lat > 0.88) {
          const haze = smoothstep(0.88, 1.0, lat);
          r = lerp(r, 150, haze); g = lerp(g, 135, haze); b = lerp(b, 120, haze);
          bmp = lerp(bmp, 128, haze);
        }

        put(dM, i, r, g, b);
        put(dE, i, er, eg, eb);
        put(dB, i, bmp, bmp, bmp);
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxE.putImageData(imgE, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), emissive: toTex(cE), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     TERRESTRIAL (Earth-like)
     Clear continent/ocean, mountain ranges, forests, deserts,
     continental shelves, polar ice.
     Returns { map, bump }
     ════════════════════════════════════════════════════════════════ */
  function terrestrial() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 9, ny = y / HALF * 4.5;

        const elev  = warp(nx, ny, 10, 0.55);
        const moist = fbm(nx * 1.9 + 50, ny * 1.9 + 50, 8);
        const det   = fbm(nx * 7, ny * 7, 6);
        const micro = fbm(nx * 18, ny * 18, 4);
        const ridge = ridged(nx * 2.5, ny * 2.5, 8);
        const canopy = fbm(nx * 5 + 20, ny * 5 + 20, 7);

        let r, g, b, bmp;

        if (lat > 0.92) {
          // Polar ice caps
          const iceDet = fbm(nx * 5, ny * 5, 6);
          r = 218 + iceDet * 30; g = 228 + iceDet * 22; b = 242 + iceDet * 10;
          // Crevasse tinting
          if (iceDet > 0.72) { r -= 25; g -= 15; b += 5; }
          bmp = 160 + iceDet * 70;
        } else if (lat > 0.84) {
          // Polar transition / tundra
          const blend = smoothstep(0.84, 0.92, lat);
          const tun_r = 140 + det * 30, tun_g = 145 + det * 25, tun_b = 130 + det * 20;
          r = lerp(tun_r, 218, blend); g = lerp(tun_g, 228, blend); b = lerp(tun_b, 242, blend);
          bmp = 90 + blend * 80;
        } else if (elev < 0.33) {
          // Deep abyss
          r = 3  + det * 10; g = 12 + det * 22; b = 75 + elev * 70;
          bmp = 20 + det * 30;
        } else if (elev < 0.38) {
          // Mid ocean
          const dn = (elev - 0.33) / 0.05;
          r = lerp(3,  12, dn) + det * 14; g = lerp(12, 38, dn) + det * 28; b = lerp(75, 110, dn) + det * 25;
          bmp = 30 + det * 35;
        } else if (elev < 0.425) {
          // Shallow water / continental shelf (lighter blue-green)
          const shelf = (elev - 0.38) / 0.045;
          r = lerp(12, 25, shelf)  + det * 18; g = lerp(38, 72, shelf) + det * 35; b = lerp(110, 140, shelf) + det * 30;
          bmp = 40 + shelf * 30;
        } else if (elev < 0.445) {
          // Beach / coast
          r = 175 + det * 42 + micro * 12; g = 162 + det * 32 + micro * 8; b = 105 + det * 24 + micro * 5;
          bmp = 60 + det * 40;
        } else if (elev < 0.50) {
          // Lowland
          if (moist > 0.52) {
            // Lush grassland / meadow
            r = 52  + det * 25 + canopy * 15; g = 112 + det * 32 + canopy * 22; b = 30 + det * 14 + canopy * 8;
          } else {
            // Dry savanna / scrub
            r = 142 + det * 32 + micro * 10; g = 128 + det * 22 + micro * 7; b = 58 + det * 14 + micro * 4;
          }
          bmp = 70 + elev * 80 + det * 30;
        } else if (elev < 0.58) {
          // Forest
          if (moist > 0.48) {
            // Dense forest — 4 canopy shades
            if (canopy < 0.30)      { r = 8  + det * 12; g = 28 + det * 22; b = 5  + det * 8; }
            else if (canopy < 0.50) { r = 18 + det * 16; g = 58 + det * 30; b = 12 + det * 10; }
            else if (canopy < 0.70) { r = 28 + det * 20; g = 80 + det * 36; b = 16 + det * 12; }
            else                    { r = 38 + det * 24; g = 98 + det * 40; b = 22 + det * 14; }
          } else {
            // Scrubland / chaparral
            r = 88 + det * 32; g = 82 + det * 26; b = 42 + det * 14;
          }
          bmp = 90 + canopy * 50 + elev * 60;
        } else if (elev < 0.66) {
          // Highland / upland brown
          r = 100 + ridge * 38 + det * 18; g = 80  + ridge * 28 + det * 14; b = 50  + ridge * 18 + det * 10;
          if (det > 0.68) { r += 18; g += 14; b += 10; } // rocky outcrops
          bmp = 110 + ridge * 80 + det * 30;
        } else if (elev < 0.74) {
          // Mountain — ridged gray-brown
          const mt = lerpColor([88,78,62],[148,138,125], ridge);
          r = mt[0] + det * 22; g = mt[1] + det * 16; b = mt[2] + det * 12;
          bmp = 140 + ridge * 90 + det * 20;
        } else {
          // Snow-capped peaks
          const snow = smoothstep(0.74, 0.90, elev);
          r = lerp(128, 238, snow) + det * 14 + micro * 6;
          g = lerp(118, 242, snow) + det * 10 + micro * 4;
          b = lerp(102, 250, snow) + det * 8  + micro * 3;
          bmp = lerp(150, 230, snow) + det * 20;
        }

        put(dM, i, r, g, b);
        put(dB, i, bmp, bmp, bmp);
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     VOLCANIC
     Dark basalt, lava crack networks, eruption calderas,
     lava flow channels, sulfur deposits.
     Returns { map, emissive, bump }
     ════════════════════════════════════════════════════════════════ */
  function volcanic() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cE = createCanvas(), ctxE = cE.getContext('2d'), imgE = ctxE.createImageData(SIZE, HALF), dE = imgE.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const base  = warp(nx, ny, 10, 0.75);
        const crack = ridged(nx * 3.5, ny * 3.5, 9);
        const heat  = fbm(nx * 1.6 + 30, ny * 1.6, 8);
        const det   = fbm(nx * 9, ny * 9, 6);
        const flow  = warp(nx * 2.2 + 15, ny * 2.2 + 15, 7, 0.85);
        const micro = fbm(nx * 22, ny * 22, 4);
        // Lava tube network (cellular)
        const lavaCell = voronoi(nx, ny, 2.8);

        // Dark basalt base
        let r = 22 + base * 30 + det * 12 + micro * 4;
        let g = 9  + base * 15 + det * 6  + micro * 2;
        let b = 4  + base * 8  + det * 4  + micro * 1;
        let er = 0, eg = 0, eb = 0;
        let bmp = 80 + base * 60 + det * 30;

        // Obsidian sheen (glassy black ridges)
        if (base > 0.62) { r -= 8; g -= 4; b += 4; bmp += 20; }

        // Cooled lava flow channels (dark reddish-brown)
        if (flow > 0.48 && flow < 0.56) {
          r += 28; g += 8; b -= 2;
          bmp -= 20;
        }

        // Lava tube network walls
        if (lavaCell < 0.08) {
          r = lerp(r, 180, 0.4); g = lerp(g, 55, 0.3); b = lerp(b, 8, 0.1);
          const ti = 1 - lavaCell / 0.08;
          er = Math.max(er, ti * 200); eg = Math.max(eg, ti * 80); eb = Math.max(eb, ti * 10);
          bmp -= 40;
        }

        // Crack / lava vein network
        if (crack > 0.50) {
          const lavaI = smoothstep(0.50, 0.85, crack);
          r = lerp(r, 210, lavaI * 0.5); g = lerp(g, 70, lavaI * 0.4); b = lerp(b, 12, lavaI * 0.1);
          er = Math.max(er, lavaI * 255); eg = Math.max(eg, lavaI * 130); eb = Math.max(eb, lavaI * 18);
          bmp -= lavaI * 50;
        }

        // Lava lakes (pooled in low terrain)
        if (heat > 0.66 && base < 0.42) {
          const pool = smoothstep(0.66, 0.88, heat);
          r = lerp(r, 210, pool * 0.6); g = lerp(g, 85, pool * 0.4); b = lerp(b, 12, pool * 0.1);
          er = Math.max(er, pool * 255); eg = Math.max(eg, pool * 155); eb = Math.max(eb, pool * 22);
          bmp -= pool * 60;
        }

        // Eruption calderas — white-hot centers
        if (heat > 0.80 && crack > 0.52) {
          r = 230; g = 195; b = 75;
          er = 255; eg = 230; eb = 100;
          bmp -= 80;
        }

        // Sulfur / fumarole deposits (yellowish)
        if (det > 0.72 && base > 0.40 && base < 0.58) {
          r += 32; g += 26; b -= 6;
        }

        // Pyroclastic plains (very dark, fine texture)
        if (base < 0.28 && flow < 0.38) {
          r = 14 + micro * 10; g = 6 + micro * 5; b = 3 + micro * 3;
          bmp = 40 + micro * 25;
        }

        put(dM, i, r, g, b);
        put(dE, i, er, eg, eb);
        put(dB, i, Math.max(0, bmp), Math.max(0, bmp), Math.max(0, bmp));
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxE.putImageData(imgE, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), emissive: toTex(cE), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     OCEAN / ARCHIPELAGO
     Deep ocean dominant, scattered Voronoi island chains,
     coral reefs, foam rings, shallow turquoise waters.
     Returns { map, bump }
     ════════════════════════════════════════════════════════════════ */
  function ocean() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const base  = warp(nx, ny, 9, 0.55);
        const depth = fbm(nx * 0.9, ny * 0.9, 8);
        const isle  = warp(nx * 2.8 + 20, ny * 2.8 + 20, 8, 0.45);
        const det   = fbm(nx * 7, ny * 7, 6);
        const wave  = turbulence(nx * 14, ny * 14, 5);
        // Island chain clustering via Voronoi
        const isleCluster = voronoi(nx * 0.8 + 5, ny * 0.8 + 5, 1.5);
        const micro = fbm(nx * 20, ny * 20, 4);

        let r, g, b, bmp;

        if (lat > 0.90) {
          // Polar ice sheet
          const iceDet = fbm(nx * 4, ny * 4, 6);
          r = 205 + iceDet * 42; g = 220 + iceDet * 28; b = 238 + iceDet * 14;
          bmp = 150 + iceDet * 60;
        } else if (isle > 0.78 && isleCluster < 0.55) {
          // Island interior — layered elevation
          const ii = smoothstep(0.78, 0.95, isle);
          if (ii > 0.6) {
            // Mountain/volcanic core
            r = 75 + det * 32 + ii * 20; g = 65 + det * 26 + ii * 12; b = 45 + det * 16 + ii * 8;
          } else {
            // Jungle-covered slopes
            const canopy = fbm(nx * 6 + 30, ny * 6 + 30, 6);
            r = 20 + det * 18 + canopy * 12; g = 72 + ii * 55 + det * 28; b = 15 + det * 10 + canopy * 6;
          }
          bmp = 80 + ii * 120 + det * 30;
        } else if (isle > 0.73 && isleCluster < 0.55) {
          // Beach fringe
          r = 162 + det * 38 + micro * 14; g = 150 + det * 28 + micro * 10; b = 95 + det * 20 + micro * 6;
          bmp = 60 + det * 40;
        } else if (isle > 0.68 && isleCluster < 0.55) {
          // Coral reef / turquoise shallows
          const reef = fbm(nx * 10 + 60, ny * 10 + 60, 6);
          r = 18 + det * 18 + reef * 12; g = 142 + base * 28 + reef * 20; b = 158 + base * 22 + reef * 15;
          bmp = 45 + reef * 30;
        } else if (isle > 0.62 && isleCluster < 0.55) {
          // Very shallow — light blue-green foam zone
          r = 28 + det * 20; g = 100 + det * 40; b = 150 + det * 30;
          // Foam rings
          if (wave > 0.72) { r += 40; g += 40; b += 30; }
          bmp = 35 + wave * 20;
        } else {
          // Open ocean — depth-based color
          const d2 = depth * 0.55 + base * 0.45;
          if (d2 < 0.28) {
            // Hadal abyss
            r = 2 + det * 7 + micro * 3; g = 6 + det * 14 + micro * 5; b = 42 + d2 * 70;
          } else if (d2 < 0.45) {
            // Deep ocean
            r = 4 + det * 10;  g = 15 + det * 24;  b = 75 + d2 * 72;
          } else {
            // Mid ocean
            r = 8 + det * 14;  g = 30 + det * 32;  b = 105 + d2 * 55;
          }
          // Wave texture
          if (wave > 0.68) { r += 4; g += 7; b += 10; }
          // Ocean current tinting
          const curr = fbm(nx * 1.4 + 40, ny * 0.6, 5);
          if (Math.abs(curr - 0.5) < 0.025) { g += 6; b += 9; }
          bmp = 25 + det * 18;
        }

        put(dM, i, r, g, b);
        put(dB, i, bmp, bmp, bmp);
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     JUNGLE
     Dense multi-layer canopy, winding rivers, bioluminescence,
     swamp zones, flower blooms.
     Returns { map, emissive, bump }
     ════════════════════════════════════════════════════════════════ */
  function jungle() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cE = createCanvas(), ctxE = cE.getContext('2d'), imgE = ctxE.createImageData(SIZE, HALF), dE = imgE.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const canopy = warp(nx, ny, 10, 0.65);
        const river  = warp(nx * 3.2, ny * 3.2, 6, 0.55);
        const det    = fbm(nx * 9, ny * 9, 7);
        const moist  = fbm(nx * 1.6 + 10, ny * 1.6, 8);
        const micro  = fbm(nx * 22, ny * 22, 4);
        const biospot = fbm(nx * 5 + 70, ny * 5 + 70, 6);

        let r, g, b, er = 0, eg = 0, eb = 0, bmp;

        // River and riverbank systems
        const riverDist = Math.abs(river - 0.5);
        if (riverDist < 0.014) {
          // River channel (dark blue-green)
          r = 22 + det * 18; g = 50 + det * 22; b = 95 + det * 28;
          bmp = 30 + det * 20;
        } else if (riverDist < 0.022) {
          // Muddy bank
          r = 55 + det * 22; g = 45 + det * 16; b = 20 + det * 10;
          bmp = 50 + det * 25;
        } else {
          // Canopy — 5 depth layers
          if (canopy < 0.22) {
            // Floor / deep understory
            r = 4  + det * 8  + micro * 3; g = 18 + det * 16 + micro * 5; b = 2  + det * 4  + micro * 2;
            bmp = 60 + det * 30;
          } else if (canopy < 0.38) {
            // Lower mid-canopy
            r = 8  + det * 12 + micro * 4; g = 38 + det * 24 + micro * 8; b = 5  + det * 7  + micro * 3;
            bmp = 80 + canopy * 40 + det * 20;
          } else if (canopy < 0.54) {
            // Mid canopy
            r = 14 + det * 16; g = 60 + det * 32 + moist * 14; b = 8  + det * 9;
            bmp = 100 + canopy * 50 + det * 18;
          } else if (canopy < 0.70) {
            // Upper canopy
            r = 22 + det * 20; g = 82 + det * 38 + moist * 18; b = 14 + det * 11;
            bmp = 120 + canopy * 55 + det * 15;
          } else {
            // Emergent layer / treetops
            r = 34 + det * 24 + micro * 8; g = 102 + det * 42 + moist * 14; b = 20 + det * 13 + micro * 5;
            bmp = 140 + canopy * 60 + det * 12;
          }

          // Flower blooms (occasional bright pink/red/orange spots)
          if (det > 0.84 && canopy > 0.52) {
            r += 60; g += 8; b += 35;
          }

          // Swamp zones (dark, bluish-green tinge)
          if (moist > 0.74 && canopy < 0.38) {
            r -= 3; g += 10; b += 18;
          }

          // Highland clearing (brighter)
          if (canopy > 0.75 && moist < 0.35) {
            r += 12; g += 18; b += 5;
          }
        }

        // Bioluminescent spots
        if (biospot > 0.78 && canopy > 0.42 && riverDist > 0.025) {
          er = 12; eg = 85 + biospot * 50; eb = 55 + biospot * 30;
        }

        // Polar forest fringe
        if (lat > 0.82) {
          const f = smoothstep(0.82, 0.95, lat);
          r = lerp(r, 50, f); g = lerp(g, 55, f); b = lerp(b, 35, f);
          bmp = lerp(bmp, 90, f);
        }

        put(dM, i, r, g, b);
        put(dE, i, er, eg, eb);
        put(dB, i, bmp, bmp, bmp);
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxE.putImageData(imgE, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), emissive: toTex(cE), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     DESERT
     Dune ridges, mesa formations, salt flats, dry riverbeds,
     oasis patches, polar frost.
     Returns { map, bump }
     ════════════════════════════════════════════════════════════════ */
  function desert() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const base  = warp(nx, ny, 9, 0.42);
        // Directional dune noise — stretch X significantly for ridge orientation
        const dune  = ridged(nx * 5.0, ny * 1.8, 9);
        const mesa  = warp(nx * 1.6 + 40, ny * 1.6, 8, 0.62);
        const det   = fbm(nx * 9, ny * 9, 6);
        const crack = ridged(nx * 7, ny * 7, 6);
        const micro = fbm(nx * 22, ny * 22, 4);

        let r, g, b, bmp;

        if (lat > 0.93) {
          // Polar frost / residual ice
          r = 215 + base * 28; g = 205 + base * 22; b = 182 + base * 24;
          bmp = 120 + base * 50;
        } else if (mesa > 0.68) {
          // Mesa / canyon butte rock
          const mi = smoothstep(0.68, 0.90, mesa);
          r = 108 + mi * 32 + det * 16; g = 58  + mi * 16 + det * 9;  b = 26  + mi * 9  + det * 5;
          // Cliff shading
          if (crack > 0.65) { r -= 22; g -= 14; b -= 8; }
          if (crack < 0.22) { r += 18; g += 12; b += 6; }
          bmp = 120 + mi * 100 + crack * 40;
        } else {
          // Sand terrain
          const base_r = 198 + base * 38;
          const base_g = 158 + base * 30;
          const base_b = 82  + base * 22;

          // Dune ridge crests (bright)
          if (dune > 0.62) {
            const crest = smoothstep(0.62, 0.88, dune);
            r = base_r + crest * 38; g = base_g + crest * 28; b = base_b + crest * 15;
            bmp = 160 + crest * 70;
          } else if (dune < 0.28) {
            // Dune troughs / shadow (darker, cooler)
            const shadow = smoothstep(0.28, 0.0, dune);
            r = base_r - shadow * 48; g = base_g - shadow * 36; b = base_b - shadow * 22;
            bmp = 60 - shadow * 40;
          } else {
            r = base_r; g = base_g; b = base_b;
            bmp = 100 + dune * 60;
          }

          // Fine sand grain detail
          r += det * 14 - 7 + micro * 8 - 4;
          g += det * 10 - 5 + micro * 6 - 3;
          b += det * 6  - 3 + micro * 4 - 2;

          // Dry riverbeds (meandering darker lines)
          const riverbed = warp(nx * 5.5, ny * 2.2, 5, 0.65);
          if (Math.abs(riverbed - 0.5) < 0.010) {
            r -= 42; g -= 30; b -= 15;
            bmp -= 25;
          } else if (Math.abs(riverbed - 0.5) < 0.018) {
            r -= 22; g -= 16; b -= 8;
            bmp -= 12;
          }

          // Salt flats (white, reflective)
          if (base > 0.62 && mesa < 0.38 && det > 0.58) {
            const salt = smoothstep(0.58, 0.80, det) * smoothstep(0.38, 0.62, base);
            r = lerp(r, 235, salt * 0.52); g = lerp(g, 230, salt * 0.50); b = lerp(b, 218, salt * 0.46);
            bmp = lerp(bmp, 210, salt * 0.4);
          }

          // Oasis (tiny green patches — very rare)
          if (mesa < 0.30 && det > 0.82 && base < 0.38) {
            r = 38; g = 88; b = 25;
            bmp = 90;
          }
        }

        put(dM, i, r, g, b);
        put(dB, i, clamp(bmp), clamp(bmp), clamp(bmp));
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     ICE WORLD
     Bright ice sheets, glacier crevasses (ridged), frozen ocean,
     compression ridges, crystal sparkle highlights.
     Returns { map, bump }
     ════════════════════════════════════════════════════════════════ */
  function iceWorld() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const base    = warp(nx, ny, 9, 0.42);
        const crack   = ridged(nx * 4.5, ny * 4.5, 9);
        const glacier = warp(nx * 1.6, ny * 1.6 + 20, 8, 0.52);
        const det     = fbm(nx * 9, ny * 9, 6);
        const depth   = fbm(nx * 0.9, ny * 0.9, 7);
        const micro   = fbm(nx * 22, ny * 22, 4);

        let r, g, b, bmp;

        if (base < 0.32) {
          // Frozen ocean (dark blue-gray under ice)
          r = 40  + depth * 32 + det * 12; g = 60  + depth * 42 + det * 15; b = 115 + depth * 42 + det * 18;
          if (det < 0.28) { b += 18; }
          bmp = 45 + depth * 35 + det * 20;
        } else if (base < 0.38) {
          // Pack ice edge (broken slabs)
          r = 115 + det * 32; g = 140 + det * 26; b = 178 + det * 20;
          bmp = 80 + det * 50;
        } else {
          // Ice sheet proper
          r = 158 + glacier * 52 + det * 22 + micro * 8;
          g = 172 + glacier * 46 + det * 18 + micro * 6;
          b = 212 + glacier * 28 + det * 12 + micro * 4;

          // Glacier flow striations
          if (glacier > 0.65) {
            r = Math.min(255, r + 28); g = Math.min(255, g + 22); b = Math.min(255, b + 12);
          }

          // Compression ridges (bright white raised lines)
          if (crack > 0.68) {
            const ci = smoothstep(0.68, 0.88, crack);
            r = Math.min(255, r + ci * 38); g = Math.min(255, g + ci * 32); b = Math.min(255, b + ci * 18);
            bmp = 180 + ci * 60;
          } else {
            bmp = 130 + glacier * 60 + det * 25;
          }

          // Crevasse networks (deep blue-black cracks)
          if (crack > 0.72) {
            const finecrack = fbm(nx * 6.5, ny * 6.5, 5);
            if (Math.abs(finecrack - 0.5) < 0.022) {
              r = 18; g = 30; b = 68;
              bmp = 20;
            }
          }

          // Blue ice (dense, old glacier — deeper blue tint)
          if (glacier < 0.38 && depth > 0.55) {
            b = Math.min(255, b + 20); r -= 12; g -= 6;
          }
        }

        // Crystal sparkle (rare bright pixel highlights)
        if (det > 0.90 && base > 0.38) {
          r = Math.min(255, r + 48); g = Math.min(255, g + 44); b = Math.min(255, b + 35);
          bmp = Math.min(255, bmp + 50);
        }

        put(dM, i, r, g, b);
        put(dB, i, clamp(bmp), clamp(bmp), clamp(bmp));
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     GAS GIANT
     Jupiter-like banded atmosphere with 8+ band colors,
     domain-warped turbulence, Great Red Storm spiral,
     smaller oval vortices, band-edge swirling.
     Returns { map }
     ════════════════════════════════════════════════════════════════ */
  function gasGiant() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;

    // Pre-define band color table (light zone → dark belt cycling)
    const bandColors = [
      [218, 182, 98],   // cream gold
      [192, 152, 72],   // amber
      [168, 118, 52],   // warm brown
      [145, 88,  38],   // mid brown
      [118, 65,  30],   // dark brown
      [148, 100, 45],   // orange-brown
      [175, 138, 65],   // golden
      [205, 168, 82],   // light gold
      [215, 185, 100],  // pale yellow
    ];

    for (let y = 0; y < HALF; y++) {
      const bandY = y / HALF;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8;
        const bandFreq = bandY * 28;

        // Multi-layer domain warp for band turbulence
        const turb1 = fbm(nx * 1.8 + 10, bandFreq * 0.35, 8);
        const turb2 = warp(nx * 1.4, bandFreq * 0.28 + 5, 7, 0.65);
        const turb3 = fbm(nx * 3.5 + 50, bandFreq * 0.5, 6);
        const det   = fbm(nx * 7, bandFreq * 0.9, 6);

        // Main band signal with strong warping
        const distortedBand = Math.sin(bandFreq * 0.82 + turb1 * 3.2 + turb2 * 2.0 + turb3 * 1.0);

        // Map band signal to color index
        const bandIdx = (distortedBand * 0.5 + 0.5) * (bandColors.length - 1);
        const bandFloor = Math.floor(bandIdx);
        const bandFrac  = bandIdx - bandFloor;
        const c1 = bandColors[Math.min(bandFloor, bandColors.length - 1)];
        const c2 = bandColors[Math.min(bandFloor + 1, bandColors.length - 1)];

        let r = lerp(c1[0], c2[0], bandFrac) + det * 28 - 10;
        let g = lerp(c1[1], c2[1], bandFrac) + det * 22 - 8;
        let b = lerp(c1[2], c2[2], bandFrac) + det * 15 - 5;

        // Band-edge vortex chains
        const edgeDist = Math.abs(Math.cos(bandFreq * 0.82 + turb1 * 3.2 + turb2 * 2.0));
        if (edgeDist < 0.20) {
          const swirl = fbm(nx * 5.5 + turb1 * 4, bandFreq * 0.18, 6);
          const swirlI = (1 - edgeDist / 0.20) * 0.5;
          r += (swirl * 30 - 12) * swirlI;
          g += (swirl * 22 - 8)  * swirlI;
          b += (swirl * 15 - 5)  * swirlI;
        }

        // ── Great Red Storm ──
        const stormCx = SIZE * 0.62, stormCy = HALF * 0.44;
        const stormRx = 68, stormRy = 38;
        const sdx = (x - stormCx) / stormRx, sdy = (y - stormCy) / stormRy;
        const stormDist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (stormDist < 1.0) {
          const si = smoothstep(1.0, 0.0, stormDist);
          const spiral = Math.atan2(sdy, sdx) - stormDist * 5.5 + turb1 * 2;
          const sv = Math.sin(spiral * 3) * 0.5 + 0.5;
          const innerGlow = smoothstep(0.3, 0.0, stormDist);
          r = lerp(r, 222 + sv * 28, si * 0.85);
          g = lerp(g, 98  + sv * 35, si * 0.70);
          b = lerp(b, 48  + sv * 20, si * 0.45);
          // Inner bright core
          r = lerp(r, 245, innerGlow * 0.5);
          g = lerp(g, 190, innerGlow * 0.4);
        }

        // ── Small oval storm (white) ──
        const s2cx = SIZE * 0.22, s2cy = HALF * 0.64;
        const s2dx = (x - s2cx) / 32, s2dy = (y - s2cy) / 20;
        const s2dist = Math.sqrt(s2dx * s2dx + s2dy * s2dy);
        if (s2dist < 1.0) {
          const si = smoothstep(1.0, 0.0, s2dist);
          r = lerp(r, 235, si * 0.55);
          g = lerp(g, 220, si * 0.50);
          b = lerp(b, 185, si * 0.40);
        }

        // ── Third storm (smaller, darker) ──
        const s3cx = SIZE * 0.80, s3cy = HALF * 0.30;
        const s3dx = (x - s3cx) / 22, s3dy = (y - s3cy) / 14;
        const s3dist = Math.sqrt(s3dx * s3dx + s3dy * s3dy);
        if (s3dist < 1.0) {
          const si = smoothstep(1.0, 0.0, s3dist);
          r = lerp(r, 185, si * 0.50);
          g = lerp(g, 130, si * 0.45);
          b = lerp(b, 75,  si * 0.35);
        }

        // Polar darkening / bluish polar hood
        const lat = Math.abs(bandY - 0.5) * 2;
        if (lat > 0.78) {
          const polar = smoothstep(0.78, 1.0, lat);
          r = lerp(r, 70,  polar * 0.55);
          g = lerp(g, 68,  polar * 0.52);
          b = lerp(b, 88,  polar * 0.45);
        }

        put(dM, i, r, g, b);
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    return { map: toTex(cM) };
  }

  /* ════════════════════════════════════════════════════════════════
     MOON
     Cratered gray surface — Voronoi craters at multiple scales,
     maria (dark basalt plains), ejecta ray systems, warm/cool tint.
     Returns { map, bump }
     ════════════════════════════════════════════════════════════════ */
  function moon() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 14, ny = y / HALF * 7;

        const base   = fbm(nx, ny, 10);
        const maria  = warp(nx * 0.85 + 30, ny * 0.85, 8, 0.52);
        const det    = fbm(nx * 9, ny * 9, 6);
        const micro  = fbm(nx * 22, ny * 22, 4);
        const warmth = fbm(nx * 0.5 + 20, ny * 0.5, 5);

        // Large crater field (voronoi-based)
        const bigCrater  = voronoi(nx * 0.8, ny * 0.8, 2.2);
        const midCrater  = voronoi(nx, ny, 4.5);
        const smCrater   = voronoi(nx * 1.4, ny * 1.4, 9);
        const tinyCrater = voronoi(nx * 2.0, ny * 2.0, 18);

        // Base regolith value
        let val = 132 + base * 48 + det * 16 + micro * 6;
        let bmp = 120 + base * 60 + det * 20;

        // Maria (dark basalt plains)
        if (maria < 0.36) {
          const mBlend = smoothstep(0.36, 0.30, maria);
          val = lerp(val, 65 + maria * 85 + base * 18 + det * 8, mBlend);
          bmp = lerp(bmp, 50 + maria * 50 + det * 15, mBlend);
        } else if (maria < 0.42) {
          const mEdge = smoothstep(0.42, 0.36, maria);
          val = lerp(val, 80 + base * 30 + det * 12, mEdge * 0.6);
          bmp = lerp(bmp, 70, mEdge * 0.5);
        }

        // Large impact craters
        if (bigCrater < 0.08) {
          // Crater floor (dark)
          val = 52 + det * 14;
          bmp = 30 + det * 20;
        } else if (bigCrater < 0.12) {
          // Bright rim
          val = Math.min(235, val + 55);
          bmp = 200 + det * 30;
        } else if (bigCrater < 0.16) {
          // Outer rim / ejecta blanket
          val = Math.min(218, val + 28);
          bmp = 160 + det * 25;
        }

        // Medium craters
        if (midCrater < 0.05) {
          val = lerp(val, 58 + det * 12, 0.80);
          bmp = lerp(bmp, 35, 0.80);
        } else if (midCrater < 0.08) {
          val = Math.min(225, val + 42);
          bmp = Math.min(220, bmp + 60);
        } else if (midCrater < 0.11) {
          val = Math.min(210, val + 20);
          bmp = Math.min(190, bmp + 35);
        }

        // Small craters
        if (smCrater < 0.03) {
          val = lerp(val, 62 + micro * 10, 0.65);
          bmp = lerp(bmp, 40, 0.65);
        } else if (smCrater < 0.05) {
          val = Math.min(215, val + 30);
          bmp = Math.min(195, bmp + 40);
        }

        // Tiny pockmarks
        if (tinyCrater < 0.02) {
          val -= 10;
          bmp -= 15;
        } else if (tinyCrater < 0.035) {
          val = Math.min(210, val + 14);
          bmp = Math.min(185, bmp + 18);
        }

        // Ejecta rays from large craters
        if (bigCrater > 0.10 && bigCrater < 0.45) {
          const ray = fbm(nx * 1.8 + 5, ny * 7, 5);
          if (ray > 0.78) {
            val = Math.min(228, val + 28);
            bmp = Math.min(190, bmp + 25);
          }
        }

        // Subtle warm/cool tint
        const r = val * (0.97 + warmth * 0.07);
        const g = val * (0.96 + warmth * 0.04);
        const b = val * (0.93 + warmth * 0.02);

        put(dM, i, r, g, b);
        put(dB, i, clamp(bmp), clamp(bmp), clamp(bmp));
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     DEAD WORLD
     Gray-brown barren surface, impact basins, fracture networks,
     vitrified glass plains, geometric ruin hints, residual radiation.
     Returns { map, emissive, bump }
     ════════════════════════════════════════════════════════════════ */
  function deadWorld() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cE = createCanvas(), ctxE = cE.getContext('2d'), imgE = ctxE.createImageData(SIZE, HALF), dE = imgE.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const base  = warp(nx, ny, 10, 0.52);
        const scar  = ridged(nx * 2.2 + 60, ny * 2.2, 8);
        const crack = ridged(nx * 5.5, ny * 5.5, 7);
        const det   = fbm(nx * 9, ny * 9, 6);
        const glow  = fbm(nx * 1.6 + 10, ny * 1.6 + 10, 7);
        const micro = fbm(nx * 22, ny * 22, 4);
        // Ruin grid faint overlay
        const ruinGrid = Math.min(Math.abs(Math.sin(nx * 4.2)), Math.abs(Math.sin(ny * 4.2)));

        // Lifeless gray-brown base
        let r = 52 + base * 32 + det * 12 + micro * 5;
        let g = 43 + base * 24 + det * 9  + micro * 3;
        let b = 33 + base * 18 + det * 7  + micro * 2;
        let er = 0, eg = 0, eb = 0;
        let bmp = 100 + base * 70 + det * 25;

        // Massive impact basins
        if (scar > 0.65) {
          const si = smoothstep(0.65, 0.90, scar);
          r -= si * 22; g -= si * 18; b -= si * 14;
          bmp -= si * 60;
          // Glassy impact melt (slight sheen)
          if (det > 0.62) { r += 14; g += 11; b += 9; }
        }

        // Surface fracture network
        if (crack > 0.65) {
          const fineN = fbm(nx * 7.5, ny * 7.5, 5);
          if (Math.abs(fineN - 0.5) < 0.018) {
            r = 18; g = 14; b = 10;
            bmp = 15;
          }
        }

        // Vitrified glass plains (slightly brighter/shinier)
        if (base > 0.60 && scar < 0.35) {
          r += 15; g += 12; b += 10;
          bmp += 25;
        }

        // Scorched streak shadows
        const streak = warp(nx * 0.55, ny * 3.2, 5, 0.42);
        if (Math.abs(streak - 0.5) < 0.016) {
          r = r * 0.62; g = g * 0.62; b = b * 0.62;
          bmp -= 20;
        }

        // Faint geometric ruin grid (very subtle)
        if (ruinGrid < 0.04 && det > 0.45) {
          r += 8; g += 7; b += 9;
        }

        // Residual radiation glow (faint amber-green in deepest craters)
        if (scar > 0.72 && glow > 0.62) {
          const rg = smoothstep(0.62, 0.88, glow);
          er = rg * 55; eg = rg * 32; eb = rg * 8;
        }

        put(dM, i, Math.max(0, r), Math.max(0, g), Math.max(0, b));
        put(dE, i, er, eg, eb);
        put(dB, i, clamp(bmp), clamp(bmp), clamp(bmp));
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxE.putImageData(imgE, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), emissive: toTex(cE), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     ANCIENT RUINS
     Natural brown-gray terrain with hexagonal precursor grids
     partially buried, glowing energy lines, power node bright spots.
     Returns { map, emissive, bump }
     ════════════════════════════════════════════════════════════════ */
  function ancientRuins() {
    const cM = createCanvas(), ctxM = cM.getContext('2d'), imgM = ctxM.createImageData(SIZE, HALF), dM = imgM.data;
    const cE = createCanvas(), ctxE = cE.getContext('2d'), imgE = ctxE.createImageData(SIZE, HALF), dE = imgE.data;
    const cB = createCanvas(), ctxB = cB.getContext('2d'), imgB = ctxB.createImageData(SIZE, HALF), dB = imgB.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 11, ny = y / HALF * 5.5;

        const base   = warp(nx, ny, 9, 0.52);
        const grid   = fbm(nx * 2.8 + 80, ny * 2.8, 8);
        const energy = ridged(nx * 5.5, ny * 5.5, 7);
        const det    = fbm(nx * 9, ny * 9, 6);
        const micro  = fbm(nx * 22, ny * 22, 4);
        // Voronoi for precursor district boundaries
        const distCell = voronoi(nx * 0.8, ny * 0.8, 2.2);

        // Base: weathered brown-gray ancient stone
        let r = 48 + base * 38 + det * 14 + micro * 5;
        let g = 36 + base * 30 + det * 10 + micro * 3;
        let b = 24 + base * 22 + det * 8  + micro * 2;
        let er = 0, eg = 0, eb = 0;
        let bmp = 95 + base * 75 + det * 28;

        // Voronoi district boundaries (raised structure edges)
        if (distCell < 0.08) {
          const de = smoothstep(0.08, 0.0, distCell);
          r += de * 14; g += de * 10; b += de * 22;
          bmp += de * 45;
          er = de * 12; eg = de * 8; eb = de * 28;
        }

        // Hexagonal grid pattern (precursor architecture)
        // Three overlapping sine waves at 0°, 60°, 120° relative angles
        const hexA = Math.sin(nx * 3.2 + ny * 1.85);
        const hexB = Math.sin(nx * 3.2 - ny * 1.85);
        const hexC = Math.sin(ny * 3.70);
        const hexEdge = Math.min(Math.abs(hexA), Math.abs(hexB), Math.abs(hexC));

        if (hexEdge < 0.055) {
          const hBlend = smoothstep(0.055, 0.0, hexEdge);
          // Partially buried — visibility modulated by grid noise
          const buried = 1.0 - smoothstep(0.30, 0.70, grid);
          const vis = hBlend * buried;
          r += vis * 16; g += vis * 11; b += vis * 32;
          bmp += vis * 40;
          er = Math.max(er, vis * 18); eg = Math.max(eg, vis * 12); eb = Math.max(eb, vis * 42);
        }

        // Energy conduit lines (bright purple at grid edges with power)
        if (hexEdge < 0.025 && grid > 0.52) {
          const active = smoothstep(0.52, 0.80, grid);
          er = Math.max(er, active * 65); eg = Math.max(eg, active * 30); eb = Math.max(eb, active * 95);
          r += active * 12; g += active * 6; b += active * 20;
        }

        // Power nodes (bright spots at grid intersections)
        if (energy > 0.70 && grid > 0.56) {
          const ei = smoothstep(0.70, 0.92, energy) * smoothstep(0.56, 0.80, grid);
          er = Math.max(er, ei * 155); eg = Math.max(eg, ei * 85); eb = Math.max(eb, ei * 235);
          r += ei * 28; g += ei * 14; b += ei * 48;
          bmp += ei * 60;
        }

        // Excavation pits (darker recessed areas)
        if (grid > 0.72 && base > 0.50) {
          r *= 0.48; g *= 0.48; b *= 0.52;
          bmp *= 0.45;
        }

        // Sand-drifted regions (organic overlay)
        if (base > 0.58 && grid < 0.38) {
          const sand = smoothstep(0.38, 0.0, grid) * smoothstep(0.58, 0.80, base);
          r = lerp(r, 128, sand * 0.35); g = lerp(g, 108, sand * 0.35); b = lerp(b, 68, sand * 0.32);
        }

        put(dM, i, r, g, b);
        put(dE, i, er, eg, eb);
        put(dB, i, clamp(bmp), clamp(bmp), clamp(bmp));
      }
    }
    ctxM.putImageData(imgM, 0, 0);
    ctxE.putImageData(imgE, 0, 0);
    ctxB.putImageData(imgB, 0, 0);
    return { map: toTex(cM), emissive: toTex(cE), bump: toTex(cB) };
  }

  /* ════════════════════════════════════════════════════════════════
     CLOUD TEXTURES
     ════════════════════════════════════════════════════════════════ */

  // Standard cloud layer — realistic swirling patterns, cyclone formations
  function clouds() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 7, ny = y / HALF * 3.5;

        // Multi-layer domain warp for organic swirling
        const w1 = warp(nx, ny, 8, 0.55);
        const w2 = warp(nx + 3.7, ny + 2.1, 7, 0.48);
        const det = fbm(nx * 5, ny * 5, 6);
        const fine = fbm(nx * 12, ny * 12, 5);
        const n = w1 * 0.65 + w2 * 0.35;

        let alpha = 0;

        // Main cloud bodies
        if (n > 0.44) {
          alpha = smoothstep(0.44, 0.70, n) * 240;
          // Wispy edges
          if (n < 0.52) alpha *= smoothstep(0.44, 0.52, n);
          // Detail variation
          alpha *= (0.68 + det * 0.52 + fine * 0.18);
        }

        // Cyclone / hurricane spiral
        const cycCx = SIZE * 0.35, cycCy = HALF * 0.40;
        const cycRx = 80, cycRy = 60;
        const cdx = (x - cycCx) / cycRx, cdy = (y - cycCy) / cycRy;
        const cycDist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cycDist < 1.5) {
          const spiral = Math.atan2(cdy, cdx) - cycDist * 3.5;
          const sv = Math.sin(spiral * 4) * 0.5 + 0.5;
          const eye = smoothstep(0.12, 0.30, cycDist);
          const outerFade = smoothstep(1.5, 0.5, cycDist);
          const cycAlpha = sv * eye * outerFade * 220;
          alpha = Math.max(alpha, cycAlpha);
        }

        // Cloud brightness (bright white to very light gray)
        const bright = 248 - fine * 20;
        d[i] = bright; d[i+1] = bright; d[i+2] = bright; d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  // Volcanic ash cloud layer — dark, opaque, heavy volcanic debris
  function ashClouds() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 7, ny = y / HALF * 3.5;

        const w1 = warp(nx + 5, ny + 5, 8, 0.68);
        const w2 = fbm(nx * 3 + 20, ny * 3 + 20, 6);
        const det = fbm(nx * 5, ny * 5, 5);
        const turb = turbulence(nx * 4, ny * 4, 5);
        const n = w1 * 0.60 + w2 * 0.40;

        let alpha = 0;
        if (n > 0.46) {
          alpha = smoothstep(0.46, 0.72, n) * 255;
          alpha *= (0.55 + det * 0.55 + turb * 0.20);
          // Ash billowing — turbulence adds volume
          alpha *= (0.8 + turb * 0.4);
        }

        // Dark ash coloring: sooty dark gray with brownish tinge
        const val = 40 + det * 22;
        d[i] = clamp(val + 12); d[i+1] = clamp(val + 5); d[i+2] = clamp(val); d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  // Jungle cloud layer — misty, hazy, high humidity
  function jungleClouds() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6, ny = y / HALF * 3;

        const w1 = warp(nx + 2.5, ny + 1.5, 9, 0.45);
        const mist = fbm(nx * 2, ny * 2, 7);
        const det  = fbm(nx * 8, ny * 8, 5);

        let alpha = 0;
        // Thin misty base layer (always somewhat present)
        alpha = mist * 80;
        // Denser clouds
        if (w1 > 0.42) {
          alpha = Math.max(alpha, smoothstep(0.42, 0.68, w1) * 200);
        }
        alpha *= (0.65 + det * 0.55);

        // Slightly warm/humid tint — off-white with greenish haze
        d[i] = 235; d[i+1] = 245; d[i+2] = 230; d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  // Ice cloud layer — thin wispy ice crystal cirrus
  function iceClouds() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;

        // Stretched horizontal streaks for cirrus feel
        const w1 = warp(nx, ny * 0.4, 8, 0.38);
        const streak = fbm(nx * 3, ny * 0.6, 6);
        const det = fbm(nx * 10, ny * 5, 5);

        let alpha = 0;
        if (w1 > 0.40) {
          alpha = smoothstep(0.40, 0.65, w1) * 160;
          // Very wispy edges
          if (w1 < 0.50) alpha *= smoothstep(0.40, 0.50, w1) * 0.7;
          alpha *= (0.50 + streak * 0.60 + det * 0.28);
        }

        // Icy blue-white tint
        d[i] = 230; d[i+1] = 240; d[i+2] = 255; d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  // Desert haze layer — thin sandstorm veil
  function desertHaze() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 7, ny = y / HALF * 3.5;

        // Horizontal smearing for dust storm look
        const w1 = warp(nx, ny * 0.5, 7, 0.58);
        const dust = fbm(nx * 4, ny * 1.5, 6);
        const det  = fbm(nx * 10, ny * 4, 5);

        let alpha = 0;
        // Thin persistent haze
        alpha = dust * 55;
        if (w1 > 0.45) {
          alpha = Math.max(alpha, smoothstep(0.45, 0.72, w1) * 190);
          alpha *= (0.60 + det * 0.50);
        }

        // Sandy orange-tan tint
        d[i] = 215; d[i+1] = 185; d[i+2] = 130; d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  /* ──────────────────────────────────────────────────────────────
     PUBLIC API
     ────────────────────────────────────────────────────────────── */
  return {
    capitalWorld:  capitalWorld,
    terrestrial:   terrestrial,
    volcanic:      volcanic,
    ocean:         ocean,
    jungle:        jungle,
    desert:        desert,
    iceWorld:      iceWorld,
    ancientRuins:  ancientRuins,
    gasGiant:      gasGiant,
    moon:          moon,
    deadWorld:     deadWorld,
    clouds:        clouds,
    ashClouds:     ashClouds,
    jungleClouds:  jungleClouds,
    iceClouds:     iceClouds,
    desertHaze:    desertHaze,
  };
})();
