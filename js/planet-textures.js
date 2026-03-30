/* ═══════════════════════════════════════════════════════════════
   PLANET TEXTURES — Procedural Canvas Texture Generator v2
   High-detail surface, emissive, bump, and cloud textures
   using multi-octave fBm noise + domain warping.
   ═══════════════════════════════════════════════════════════════ */

window.PlanetTextures = (function () {
  'use strict';

  const SIZE = 1024;
  const HALF = SIZE / 2;

  /* ── Noise ── */
  function hash(x, y) {
    let n = ((x * 374761393 + y * 668265263) | 0);
    n = ((n ^ (n >> 13)) * 1274126177) | 0;
    return (n & 0x7fffffff) / 0x7fffffff;
  }

  function smoothHash(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += smoothHash(x * f, y * f) * a; a *= 0.5; f *= 2.1; }
    return v;
  }

  /* Domain warping — gives organic, swirly patterns */
  function warp(x, y, oct, strength) {
    const qx = fbm(x, y, oct);
    const qy = fbm(x + 5.2, y + 1.3, oct);
    return fbm(x + strength * qx, y + strength * qy, oct);
  }

  /* Ridged noise — good for mountains/cracks */
  function ridged(x, y, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) {
      let n = smoothHash(x * f, y * f);
      n = 1.0 - Math.abs(n * 2 - 1);
      v += n * n * a;
      a *= 0.5; f *= 2.1;
    }
    return v;
  }

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
  function lerp(a, b, t) { return a + (b - a) * (t < 0 ? 0 : t > 1 ? 1 : t); }
  function put(d, i, r, g, b, a) { d[i] = clamp(r); d[i+1] = clamp(g); d[i+2] = clamp(b); d[i+3] = a !== undefined ? clamp(a) : 255; }

  function lerpColor(c1, c2, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [c1[0]+(c2[0]-c1[0])*t, c1[1]+(c2[1]-c1[1])*t, c1[2]+(c2[2]-c1[2])*t];
  }

  /* ════════════════════════════════════════
     PLANET TEXTURES
     ════════════════════════════════════════ */

  function capitalWorld() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 6, 0.6);
        const n2 = fbm(nx * 2.5 + 100, ny * 2.5, 5);
        const det = fbm(nx * 8, ny * 8, 4);
        const grid1 = Math.abs(Math.sin(nx * 6.0 + n * 3));
        const grid2 = Math.abs(Math.sin(ny * 8.0 + n * 2));

        // Base: warm metallic terrain
        let r = 80 + n * 50, g = 65 + n * 42, b = 45 + n * 30;

        // Tectonic plates / continent edges
        if (n < 0.38) {
          // Water bodies (dark, reflective)
          r = 15 + n2 * 30; g = 25 + n2 * 35; b = 55 + n2 * 50;
        } else {
          // Urban sprawl grid
          if (grid1 < 0.06 || grid2 < 0.06) { r += 22; g += 20; b += 16; }
          if (grid1 < 0.025 && grid2 < 0.025) { r += 15; g += 12; b += 8; }

          // Megacity clusters (bright golden glow)
          if (n2 > 0.58) {
            const glow = (n2 - 0.58) * 6;
            r = lerp(r, 255, glow * 0.7);
            g = lerp(g, 210, glow * 0.6);
            b = lerp(b, 90, glow * 0.3);
          }

          // Industrial sectors (darker, grayer)
          if (det < 0.35 && n > 0.5) {
            r = r * 0.65 + 15; g = g * 0.65 + 12; b = b * 0.65 + 18;
          }

          // Parks / green zones (rare)
          if (det > 0.72 && n2 < 0.42 && n > 0.45) {
            r = r * 0.6; g = g * 0.8 + 25; b = b * 0.5;
          }

          // Highway spines (bright lines)
          const hwy = Math.abs(Math.sin(nx * 15 + ny * 3));
          if (hwy < 0.015) { r += 35; g += 30; b += 15; }
        }

        // Atmospheric haze near horizon (poles)
        const lat = Math.abs(y / HALF - 0.5) * 2;
        if (lat > 0.85) {
          const haze = (lat - 0.85) * 6;
          r = lerp(r, 160, haze); g = lerp(g, 140, haze); b = lerp(b, 120, haze);
        }

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c), emissive: capitalWorldEmissive() };
  }

  function capitalWorldEmissive() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 6, 0.6);
        const n2 = fbm(nx * 2.5 + 100, ny * 2.5, 5);
        let r = 0, g = 0, b = 0;
        if (n > 0.38 && n2 > 0.55) {
          const glow = (n2 - 0.55) * 5;
          r = glow * 180; g = glow * 140; b = glow * 40;
        }
        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  function terrestrial() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const elev = warp(nx, ny, 7, 0.5);
        const moist = fbm(nx * 1.8 + 50, ny * 1.8 + 50, 5);
        const det = fbm(nx * 6, ny * 6, 4);
        const ridge = ridged(nx * 2, ny * 2, 5);
        let r, g, b;

        if (lat > 0.90) {
          // Polar ice
          const iceN = fbm(nx * 4, ny * 4, 4);
          r = 215 + iceN * 35; g = 225 + iceN * 25; b = 240 + iceN * 15;
          // Crevasses
          if (det > 0.68) { r -= 30; g -= 20; b -= 5; }
        } else if (elev < 0.36) {
          // Deep ocean
          r = 5 + det * 15; g = 18 + det * 30; b = 80 + elev * 80;
          // Ocean floor variation
          if (det < 0.3) { b += 15; }
        } else if (elev < 0.40) {
          // Shallow water / continental shelf
          r = 15 + det * 20; g = 50 + det * 45; b = 120 + det * 40;
        } else if (elev < 0.42) {
          // Beach
          r = 175 + det * 40; g = 165 + det * 30; b = 110 + det * 25;
        } else if (elev < 0.48) {
          // Lowland — depends on moisture
          if (moist > 0.5) {
            // Lush grassland
            r = 55 + det * 25; g = 115 + det * 30; b = 35 + det * 15;
          } else {
            // Dry savanna
            r = 140 + det * 30; g = 130 + det * 20; b = 60 + det * 15;
          }
        } else if (elev < 0.56) {
          // Forest — depends on moisture
          if (moist > 0.45) {
            // Dense temperate forest
            r = 25 + det * 20; g = 70 + det * 35; b = 18 + det * 12;
          } else {
            // Scrubland
            r = 90 + det * 30; g = 85 + det * 25; b = 45 + det * 15;
          }
        } else if (elev < 0.64) {
          // Highland (brown/tan)
          r = 105 + ridge * 35; g = 85 + ridge * 25; b = 55 + ridge * 18;
          // Rocky outcrops
          if (det > 0.65) { r += 15; g += 12; b += 10; }
        } else if (elev < 0.72) {
          // Mountain
          const mtn = lerpColor([90,80,65], [150,140,130], ridge);
          r = mtn[0] + det * 20; g = mtn[1] + det * 15; b = mtn[2] + det * 12;
        } else {
          // Snow-capped peaks
          const snowAmt = (elev - 0.72) * 8;
          r = lerp(130, 235, snowAmt) + det * 15;
          g = lerp(120, 240, snowAmt) + det * 10;
          b = lerp(105, 248, snowAmt) + det * 8;
        }

        // Polar ice fade
        if (lat > 0.82 && lat <= 0.90) {
          const iceBlend = (lat - 0.82) / 0.08;
          r = lerp(r, 220, iceBlend * 0.6); g = lerp(g, 230, iceBlend * 0.6); b = lerp(b, 240, iceBlend * 0.6);
        }

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c) };
  }

  function volcanic() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    const ce = createCanvas(), ctxe = ce.getContext('2d'), imge = ctxe.createImageData(SIZE, HALF), de = imge.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 7, 0.7);
        const crack = ridged(nx * 3, ny * 3, 5);
        const heat = fbm(nx * 1.8 + 30, ny * 1.8, 6);
        const det = fbm(nx * 8, ny * 8, 4);
        const flow = warp(nx * 2 + 15, ny * 2 + 15, 5, 0.8);

        // Dark basalt crust
        let r = 28 + n * 28 + det * 10;
        let g = 12 + n * 14 + det * 5;
        let b = 6 + n * 8 + det * 3;
        let er = 0, eg = 0, eb = 0;

        // Obsidian ridges (glassy black)
        if (n > 0.58) { r -= 10; g -= 5; b += 3; }

        // Cooled lava flows (dark reddish streaks)
        if (flow > 0.50 && flow < 0.55) {
          r += 20; g += 5; b -= 2;
        }

        // Active lava veins
        if (crack > 0.55) {
          const lavaI = (crack - 0.55) * 8;
          er = lavaI * 255; eg = lavaI * 120; eb = lavaI * 15;
          r = lerp(r, 180, lavaI * 0.4);
          g = lerp(g, 60, lavaI * 0.3);
          b = lerp(b, 10, lavaI * 0.1);
        }

        // Lava lakes
        if (heat > 0.68 && n < 0.40) {
          const pool = (heat - 0.68) * 6;
          er = Math.max(er, pool * 255);
          eg = Math.max(eg, pool * 150);
          eb = Math.max(eb, pool * 20);
          r = lerp(r, 200, pool * 0.5); g = lerp(g, 80, pool * 0.3);
        }

        // Eruption calderas
        if (heat > 0.78 && crack > 0.50) {
          er = 255; eg = 220; eb = 80;
          r = 200; g = 100; b = 20;
        }

        // Sulfur deposits (yellowish patches)
        if (det > 0.70 && n > 0.42 && n < 0.55) {
          r += 25; g += 20; b -= 5;
        }

        put(d, i, r, g, b);
        put(de, i, er, eg, eb);
      }
    }
    ctx.putImageData(img, 0, 0);
    ctxe.putImageData(imge, 0, 0);
    return { map: toTex(c), emissive: toTex(ce) };
  }

  function ocean() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 6, 0.5);
        const depth = fbm(nx * 0.8, ny * 0.8, 5);
        const isle = warp(nx * 2.5 + 20, ny * 2.5 + 20, 6, 0.4);
        const det = fbm(nx * 6, ny * 6, 4);
        const wave = fbm(nx * 12, ny * 12, 3);
        let r, g, b;

        if (lat > 0.88) {
          // Polar ice
          const iceN = fbm(nx * 3, ny * 3, 4);
          r = 200 + iceN * 40; g = 218 + iceN * 30; b = 235 + iceN * 15;
        } else if (isle > 0.74) {
          // Island interiors
          const ii = (isle - 0.74) * 12;
          if (ii > 0.5) {
            // Mountain core
            r = 80 + det * 30; g = 70 + det * 25; b = 50 + det * 15;
          } else {
            // Jungle cover
            r = 25 + det * 20; g = 80 + ii * 60 + det * 20; b = 20 + det * 10;
          }
        } else if (isle > 0.70) {
          // Beach fringe
          r = 160 + det * 35; g = 155 + det * 25; b = 100 + det * 20;
        } else if (isle > 0.66) {
          // Reef / turquoise shallows
          r = 20 + det * 15; g = 140 + n * 30; b = 155 + n * 25;
        } else {
          // Open ocean
          const d2 = depth * 0.6 + n * 0.4;
          if (d2 < 0.30) {
            // Abyss (very deep)
            r = 2 + det * 8; g = 8 + det * 18; b = 50 + d2 * 80;
          } else if (d2 < 0.45) {
            // Deep ocean
            r = 5 + det * 12; g = 20 + det * 30; b = 80 + d2 * 80;
          } else {
            // Mid ocean
            r = 10 + det * 15; g = 35 + det * 35; b = 110 + d2 * 60;
          }
          // Wave highlights
          if (wave > 0.65) { r += 5; g += 8; b += 12; }
          // Ocean currents
          const curr = fbm(nx * 1.5 + 40, ny * 0.5, 3);
          if (Math.abs(curr - 0.5) < 0.03) { g += 8; b += 10; }
        }

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c) };
  }

  function jungle() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    const ce = createCanvas(), ctxe = ce.getContext('2d'), imge = ctxe.createImageData(SIZE, HALF), de = imge.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const canopy = warp(nx, ny, 7, 0.6);
        const river = warp(nx * 3, ny * 3, 4, 0.5);
        const det = fbm(nx * 8, ny * 8, 5);
        const moist = fbm(nx * 1.5 + 10, ny * 1.5, 5);
        let r, g, b, er = 0, eg = 0, eb = 0;

        // River systems (winding blue)
        if (Math.abs(river - 0.5) < 0.018) {
          r = 30 + det * 20; g = 60 + det * 25; b = 110 + det * 30;
        } else if (Math.abs(river - 0.5) < 0.025) {
          // Muddy riverbank
          r = 60 + det * 20; g = 50 + det * 15; b = 25 + det * 10;
        } else {
          // Canopy layers — 4 shades of green
          if (canopy < 0.35) {
            // Deep understory (very dark)
            r = 5 + det * 8; g = 22 + det * 18; b = 3 + det * 5;
          } else if (canopy < 0.50) {
            // Mid canopy
            r = 12 + det * 15; g = 48 + det * 30 + moist * 15; b = 8 + det * 8;
          } else if (canopy < 0.65) {
            // Upper canopy (brighter)
            r = 20 + det * 18; g = 75 + det * 35 + moist * 20; b = 12 + det * 10;
          } else {
            // Emergent layer tops (lightest green)
            r = 35 + det * 22; g = 100 + det * 40 + moist * 15; b = 20 + det * 12;
          }

          // Flower blooms (rare bright spots)
          if (det > 0.82 && canopy > 0.55) {
            r += 50; g += 10; b += 30;
          }

          // Swamp zones (dark, blue-green)
          if (moist > 0.70 && canopy < 0.40) {
            r -= 5; g += 8; b += 15;
          }
        }

        // Bioluminescence (emissive, night-side)
        if (det > 0.75 && canopy > 0.45) {
          er = 15; eg = 80 + det * 40; eb = 50 + det * 25;
        }

        put(d, i, r, g, b);
        put(de, i, er, eg, eb);
      }
    }
    ctx.putImageData(img, 0, 0);
    ctxe.putImageData(imge, 0, 0);
    return { map: toTex(c), emissive: toTex(ce) };
  }

  function desert() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      const lat = Math.abs(y / HALF - 0.5) * 2;
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 6, 0.4);
        const dune = ridged(nx * 4, ny * 1.5, 5);
        const mesa = warp(nx * 1.5 + 40, ny * 1.5, 5, 0.6);
        const det = fbm(nx * 8, ny * 8, 4);
        const crack = ridged(nx * 6, ny * 6, 4);
        let r, g, b;

        if (lat > 0.92) {
          // Polar residual ice/frost
          r = 210 + n * 30; g = 200 + n * 25; b = 175 + n * 25;
        } else if (mesa > 0.65) {
          // Mesa/canyon formations (dark red rock)
          const mi = (mesa - 0.65) * 6;
          r = 110 + mi * 30 + det * 15; g = 60 + mi * 15 + det * 8; b = 28 + mi * 8 + det * 5;
          // Cliff shadow
          if (crack > 0.60) { r -= 20; g -= 12; b -= 8; }
          // Cliff highlight
          if (crack < 0.25) { r += 15; g += 10; b += 5; }
        } else {
          // Sand — warm tones with dune structure
          const base_r = 195 + n * 40;
          const base_g = 155 + n * 35;
          const base_b = 85 + n * 25;

          // Dune ridges (bright crests)
          if (dune > 0.60) {
            const crest = (dune - 0.60) * 5;
            r = base_r + crest * 30; g = base_g + crest * 22; b = base_b + crest * 12;
          }
          // Dune shadows (dark troughs)
          else if (dune < 0.30) {
            const shadow = (0.30 - dune) * 3;
            r = base_r - shadow * 40; g = base_g - shadow * 30; b = base_b - shadow * 18;
          }
          else {
            r = base_r; g = base_g; b = base_b;
          }

          // Fine grain detail
          r += det * 12 - 6; g += det * 10 - 5; b += det * 6 - 3;

          // Dry riverbeds (darker lines)
          if (Math.abs(warp(nx * 5, ny * 2, 3, 0.6) - 0.5) < 0.012) {
            r -= 35; g -= 25; b -= 12;
          }

          // Salt flats (white patches)
          if (n > 0.60 && mesa < 0.40 && det > 0.55) {
            r = lerp(r, 230, 0.4); g = lerp(g, 225, 0.4); b = lerp(b, 210, 0.4);
          }
        }

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c) };
  }

  function iceWorld() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 6, 0.4);
        const crack = ridged(nx * 4, ny * 4, 5);
        const glacier = warp(nx * 1.5, ny * 1.5 + 20, 5, 0.5);
        const det = fbm(nx * 8, ny * 8, 4);
        const depth = fbm(nx * 0.8, ny * 0.8, 4);
        let r, g, b;

        // Frozen ocean vs ice shelf
        if (n < 0.35) {
          // Frozen ocean (dark blue-gray)
          r = 45 + depth * 30 + det * 10; g = 65 + depth * 40 + det * 12; b = 120 + depth * 40 + det * 15;
          // Under-ice variation
          if (det < 0.3) { b += 15; }
        } else if (n < 0.40) {
          // Pack ice edge (broken)
          r = 120 + det * 30; g = 145 + det * 25; b = 180 + det * 20;
        } else {
          // Ice sheet
          r = 160 + glacier * 50 + det * 20;
          g = 175 + glacier * 45 + det * 18;
          b = 215 + glacier * 25 + det * 10;

          // Glacier flow lines
          if (glacier > 0.62) {
            r = Math.min(255, r + 25); g = Math.min(255, g + 20); b = Math.min(255, b + 10);
          }

          // Compression ridges (bright white lines)
          if (crack > 0.65) {
            r = Math.min(255, r + 30); g = Math.min(255, g + 25); b = Math.min(255, b + 15);
          }

          // Crevasse networks (deep blue-black)
          if (crack > 0.70 && Math.abs(fbm(nx * 6, ny * 6, 3) - 0.5) < 0.02) {
            r = 20; g = 35; b = 70;
          }
        }

        // Frost crystal sparkle (rare bright pixels)
        if (det > 0.88) {
          r = Math.min(255, r + 40); g = Math.min(255, g + 38); b = Math.min(255, b + 30);
        }

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c) };
  }

  function ancientRuins() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    const ce = createCanvas(), ctxe = ce.getContext('2d'), imge = ctxe.createImageData(SIZE, HALF), de = imge.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 6, 0.5);
        const grid = fbm(nx * 2.5 + 80, ny * 2.5, 5);
        const energy = ridged(nx * 5, ny * 5, 4);
        const det = fbm(nx * 8, ny * 8, 4);

        // Brownish-gray ancient surface with weathering
        let r = 50 + n * 35 + det * 12;
        let g = 38 + n * 28 + det * 8;
        let b = 25 + n * 22 + det * 6;
        let er = 0, eg = 0, eb = 0;

        // Geometric hex grid (precursor architecture)
        const hexA = Math.sin(nx * 3.0 + ny * 1.73);
        const hexB = Math.sin(nx * 3.0 - ny * 1.73);
        const hexC = Math.sin(ny * 3.46);
        const hexEdge = Math.min(Math.abs(hexA), Math.abs(hexB), Math.abs(hexC));
        if (hexEdge < 0.06) {
          r += 12; g += 8; b += 25;
          er = 15; eg = 10; eb = 35;
        }

        // Energy conduit lines (brighter purple)
        if (hexEdge < 0.025 && grid > 0.5) {
          er = 50; eg = 25; eb = 80;
        }

        // Power nodes (bright purple spots)
        if (energy > 0.72 && grid > 0.55) {
          const ei = (energy - 0.72) * 6;
          er = Math.max(er, ei * 140); eg = Math.max(eg, ei * 80); eb = Math.max(eb, ei * 220);
          r += ei * 25; g += ei * 12; b += ei * 40;
        }

        // Excavation sites (darker pits)
        if (grid > 0.68 && n > 0.48) {
          r *= 0.5; g *= 0.5; b *= 0.55;
        }

        // Sand-covered regions
        if (n > 0.55 && grid < 0.40) {
          r = lerp(r, 130, 0.3); g = lerp(g, 110, 0.3); b = lerp(b, 70, 0.3);
        }

        put(d, i, r, g, b);
        put(de, i, er, eg, eb);
      }
    }
    ctx.putImageData(img, 0, 0);
    ctxe.putImageData(imge, 0, 0);
    return { map: toTex(c), emissive: toTex(ce) };
  }

  function gasGiant() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8;
        const bandY = y / HALF;
        const bandFreq = bandY * 24;

        // Band distortion (turbulence along edges)
        const turb = fbm(nx * 2 + 10, bandFreq * 0.4, 5);
        const turb2 = warp(nx * 1.5, bandFreq * 0.3 + 5, 5, 0.6);
        const det = fbm(nx * 6, bandFreq * 0.8, 4);

        // Latitude-based band selection
        const distortedBand = Math.sin(bandFreq * 0.85 + turb * 2.5 + turb2 * 1.5);
        let r, g, b;

        if (distortedBand > 0.4) {
          // Light zone (creamy gold)
          r = 210 + det * 35; g = 175 + det * 30; b = 90 + det * 35;
        } else if (distortedBand > 0.1) {
          // Light-mid transition
          r = 185 + det * 30; g = 145 + det * 25; b = 70 + det * 25;
        } else if (distortedBand > -0.1) {
          // Mid belt (amber-brown)
          r = 160 + det * 30; g = 110 + det * 25; b = 50 + det * 20;
        } else if (distortedBand > -0.4) {
          // Dark-mid transition
          r = 130 + det * 25; g = 85 + det * 20; b = 38 + det * 15;
        } else {
          // Dark belt (deep brown-red)
          r = 105 + det * 25; g = 60 + det * 18; b = 28 + det * 12;
        }

        // Band-edge vortex chains (swirling)
        const edgeDist = Math.abs(distortedBand);
        if (edgeDist < 0.12) {
          const swirl = fbm(nx * 5 + turb * 4, bandFreq * 0.2, 4);
          r += swirl * 25 - 10; g += swirl * 18 - 8; b += swirl * 12 - 5;
        }

        // Great Red Storm
        const stormCx = SIZE * 0.62, stormCy = HALF * 0.42;
        const stormRx = 55, stormRy = 30;
        const sdx = (x - stormCx) / stormRx, sdy = (y - stormCy) / stormRy;
        const stormDist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (stormDist < 1.0) {
          const si = 1 - stormDist;
          const spiral = Math.atan2(sdy, sdx) + stormDist * 4;
          const sv = Math.sin(spiral) * 0.5 + 0.5;
          r = lerp(r, 220 + sv * 30, si * 0.8);
          g = lerp(g, 130 + sv * 30, si * 0.6);
          b = lerp(b, 60 + sv * 20, si * 0.4);
        }

        // Second smaller storm
        const s2cx = SIZE * 0.25, s2cy = HALF * 0.65;
        const s2dx = (x - s2cx) / 28, s2dy = (y - s2cy) / 18;
        const s2dist = Math.sqrt(s2dx * s2dx + s2dy * s2dy);
        if (s2dist < 1.0) {
          const si = 1 - s2dist;
          r = lerp(r, 230, si * 0.5);
          g = lerp(g, 210, si * 0.4);
          b = lerp(b, 170, si * 0.3);
        }

        // Polar darkening
        const lat = Math.abs(bandY - 0.5) * 2;
        if (lat > 0.82) {
          const polar = (lat - 0.82) * 5;
          r *= (1 - polar * 0.45); g *= (1 - polar * 0.45); b *= (1 - polar * 0.35);
        }

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c) };
  }

  function moon() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 12, ny = y / HALF * 6;
        const n = fbm(nx, ny, 7);
        const maria = warp(nx * 0.8 + 30, ny * 0.8, 5, 0.5);
        const det = fbm(nx * 8, ny * 8, 5);

        // Base regolith
        let val = 135 + n * 45 + det * 15;

        // Maria (dark basalt plains)
        if (maria < 0.38) {
          val = 70 + maria * 80 + n * 20 + det * 8;
        } else if (maria < 0.42) {
          // Maria edge (transition)
          val = lerp(80, val, (maria - 0.38) / 0.04);
        }

        // Impact craters — concentric rings
        const craterN = fbm(nx * 3.5, ny * 3.5, 5);
        if (craterN > 0.72) {
          val = 60 + det * 15; // crater floor (dark)
        } else if (craterN > 0.68) {
          val = Math.min(230, val + 45); // bright rim
        } else if (craterN > 0.65) {
          val = Math.min(210, val + 20); // outer rim
        }

        // Smaller craters
        const sm = fbm(nx * 8, ny * 8, 4);
        if (sm > 0.76) { val -= 15; }
        else if (sm > 0.73) { val += 12; }

        // Ejecta rays
        const ray = fbm(nx * 2 + 5, ny * 6, 3);
        if (ray > 0.75 && craterN > 0.60) { val = Math.min(230, val + 25); }

        // Subtle color variation (warm/cool gray)
        const warmth = fbm(nx * 0.5 + 20, ny * 0.5, 3);
        const r = val * (0.98 + warmth * 0.06);
        const g = val * (0.96 + warmth * 0.04);
        const b = val * (0.92 + warmth * 0.02);

        put(d, i, r, g, b);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTex(c) };
  }

  function deadWorld() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    const ce = createCanvas(), ctxe = ce.getContext('2d'), imge = ctxe.createImageData(SIZE, HALF), de = imge.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = warp(nx, ny, 7, 0.5);
        const scar = ridged(nx * 2 + 60, ny * 2, 5);
        const crack = ridged(nx * 5, ny * 5, 4);
        const det = fbm(nx * 8, ny * 8, 4);
        const glow = fbm(nx * 1.5 + 10, ny * 1.5 + 10, 5);

        // Lifeless gray-brown
        let r = 55 + n * 30 + det * 10;
        let g = 48 + n * 22 + det * 8;
        let b = 38 + n * 18 + det * 6;
        let er = 0, eg = 0, eb = 0;

        // Massive impact basins
        if (scar > 0.62) {
          const si = (scar - 0.62) * 5;
          r -= si * 18; g -= si * 15; b -= si * 12;
          // Glassy impact melt (slight sheen)
          if (det > 0.60) { r += 10; g += 8; b += 6; }
        }

        // Surface fracture network
        if (crack > 0.62 && Math.abs(fbm(nx * 7, ny * 7, 3) - 0.5) < 0.02) {
          r = 20; g = 16; b = 12;
        }

        // Vitrified glass plains
        if (n > 0.58 && scar < 0.38) {
          r += 12; g += 10; b += 8;
        }

        // Residual radiation glow (faint emissive in deepest craters)
        if (scar > 0.70 && glow > 0.60) {
          const rg = (glow - 0.60) * 3;
          er = rg * 60; eg = rg * 35; eb = rg * 10;
        }

        // Scorched streaks
        const streak = warp(nx * 0.5, ny * 3, 3, 0.4);
        if (Math.abs(streak - 0.5) < 0.018) {
          r = r * 0.65; g = g * 0.65; b = b * 0.65;
        }

        put(d, i, Math.max(0, r), Math.max(0, g), Math.max(0, b));
        put(de, i, er, eg, eb);
      }
    }
    ctx.putImageData(img, 0, 0);
    ctxe.putImageData(imge, 0, 0);
    return { map: toTex(c), emissive: toTex(ce) };
  }

  /* ── Cloud textures ── */
  function clouds() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6, ny = y / HALF * 3;
        const n = warp(nx, ny, 6, 0.5);
        const det = fbm(nx * 4, ny * 4, 4);
        let alpha = 0;
        if (n > 0.42) {
          alpha = (n - 0.42) * 300;
          // Cloud edges are wispier
          if (n < 0.50) alpha *= 0.6;
          // Detail variation
          alpha *= (0.7 + det * 0.6);
        }
        d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  function ashClouds() {
    const c = createCanvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, HALF), d = img.data;
    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6, ny = y / HALF * 3;
        const n = warp(nx + 5, ny + 5, 6, 0.6);
        const det = fbm(nx * 4, ny * 4, 3);
        let alpha = 0;
        if (n > 0.45) {
          alpha = (n - 0.45) * 280;
          alpha *= (0.6 + det * 0.5);
        }
        d[i] = 50; d[i+1] = 25; d[i+2] = 10; d[i+3] = clamp(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  }

  return {
    capitalWorld: capitalWorld,
    terrestrial: terrestrial,
    volcanic: volcanic,
    ocean: ocean,
    jungle: jungle,
    desert: desert,
    iceWorld: iceWorld,
    ancientRuins: ancientRuins,
    gasGiant: gasGiant,
    moon: moon,
    deadWorld: deadWorld,
    clouds: clouds,
    ashClouds: ashClouds,
  };
})();
