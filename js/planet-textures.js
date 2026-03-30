/* ═══════════════════════════════════════════════════════════════
   PLANET TEXTURES — Procedural Canvas Texture Generator
   Generates detailed surface textures for each planet type
   using 2D canvas drawing, then returns THREE.CanvasTexture.
   ═══════════════════════════════════════════════════════════════ */

window.PlanetTextures = (function () {
  'use strict';

  const SIZE = 1024;
  const HALF = SIZE / 2;

  /* ── Noise helpers ── */
  function hash(x, y) {
    let n = x * 374761393 + y * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return (n ^ (n >> 16)) & 0x7fffffff;
  }

  function noise2d(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = hash(ix, iy) / 0x7fffffff;
    const b = hash(ix + 1, iy) / 0x7fffffff;
    const c = hash(ix, iy + 1) / 0x7fffffff;
    const d = hash(ix + 1, iy + 1) / 0x7fffffff;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, octaves) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      val += noise2d(x * freq, y * freq) * amp;
      amp *= 0.5;
      freq *= 2;
    }
    return val;
  }

  function createCanvas() {
    const c = document.createElement('canvas');
    c.width = SIZE;
    c.height = HALF;
    return c;
  }

  function toTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

  function rgb(r, g, b) { return [r, g, b]; }

  function putPixel(data, idx, r, g, b) {
    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
  }

  /* ════════════════════════════════════════
     TEXTURE GENERATORS
     ════════════════════════════════════════ */

  function capitalWorld() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 6);
        const n2 = fbm(nx * 2 + 100, ny * 2, 4);

        // Urban base — brownish-gray
        let r = 90 + n * 60;
        let g = 75 + n * 50;
        let b = 55 + n * 40;

        // Grid lines (urban planning)
        const gridX = Math.abs(Math.sin(x * 0.08)) < 0.05;
        const gridY = Math.abs(Math.sin(y * 0.12)) < 0.05;
        if (gridX || gridY) {
          r += 20; g += 18; b += 15;
        }

        // City light clusters (bright patches)
        if (n2 > 0.6) {
          const glow = (n2 - 0.6) * 8;
          r = Math.min(255, r + glow * 80);
          g = Math.min(255, g + glow * 60);
          b = Math.min(255, b + glow * 20);
        }

        // Industrial zones (darker patches)
        if (n > 0.55 && n2 < 0.4) {
          r *= 0.7; g *= 0.7; b *= 0.7;
        }

        putPixel(d, idx, r | 0, g | 0, b | 0);
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function terrestrial() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6, ny = y / HALF * 3;
        const n = fbm(nx, ny, 7);
        const elev = fbm(nx + 50, ny + 50, 5);

        // Latitude for polar ice
        const lat = Math.abs(y / HALF - 0.5) * 2;

        let r, g, b;

        if (lat > 0.88) {
          // Polar ice
          r = 220 + n * 30; g = 230 + n * 20; b = 240 + n * 15;
        } else if (n < 0.42) {
          // Deep ocean
          r = 8 + elev * 20; g = 30 + elev * 40; b = 100 + elev * 60;
        } else if (n < 0.46) {
          // Shallow water / coast
          r = 20 + elev * 30; g = 60 + elev * 50; b = 140 + elev * 40;
        } else if (n < 0.50) {
          // Beach / lowland
          r = 160 + elev * 40; g = 170 + elev * 30; b = 100 + elev * 20;
        } else if (n < 0.60) {
          // Grassland
          r = 60 + elev * 40; g = 120 + elev * 40; b = 40 + elev * 20;
        } else if (n < 0.68) {
          // Forest
          r = 30 + elev * 30; g = 80 + elev * 40; b = 25 + elev * 15;
        } else if (n < 0.76) {
          // Highland / brown
          r = 100 + elev * 50; g = 80 + elev * 40; b = 50 + elev * 30;
        } else if (n < 0.82) {
          // Mountain
          r = 120 + elev * 40; g = 110 + elev * 35; b = 95 + elev * 30;
        } else {
          // Snow cap peaks
          r = 200 + elev * 40; g = 210 + elev * 30; b = 220 + elev * 20;
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function volcanic() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 7);
        const crack = fbm(nx * 3, ny * 3, 4);
        const heat = fbm(nx * 1.5 + 30, ny * 1.5, 5);

        // Dark volcanic crust
        let r = 30 + n * 30;
        let g = 15 + n * 15;
        let b = 8 + n * 8;

        // Obsidian ridges
        if (n > 0.55) {
          r = 20 + n * 15; g = 10 + n * 8; b = 5 + n * 5;
        }

        // LAVA FLOWS — bright orange/red in cracks
        if (crack > 0.52 && crack < 0.56) {
          const lavaI = (crack - 0.52) / 0.04;
          r = lerp(r, 255, lavaI);
          g = lerp(g, 120 + heat * 80, lavaI);
          b = lerp(b, 0, lavaI);
        }

        // Lava pools (bright hotspots)
        if (heat > 0.65 && n < 0.45) {
          const poolI = (heat - 0.65) * 6;
          r = Math.min(255, r + poolI * 200);
          g = Math.min(255, g + poolI * 100);
          b = Math.min(255, b + poolI * 10);
        }

        // Volcanic vents (very bright points)
        if (heat > 0.78 && crack > 0.50) {
          r = 255; g = 200; b = 50;
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function ocean() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 6);
        const island = fbm(nx * 2 + 20, ny * 2 + 20, 5);
        const depth = fbm(nx * 0.8, ny * 0.8, 4);

        const lat = Math.abs(y / HALF - 0.5) * 2;
        let r, g, b;

        if (lat > 0.9) {
          // Polar ice
          r = 200 + n * 40; g = 215 + n * 30; b = 230 + n * 20;
        } else if (island > 0.72) {
          // Islands (green)
          const ii = (island - 0.72) * 10;
          r = 40 + ii * 20; g = 100 + ii * 40; b = 30 + ii * 15;
        } else if (island > 0.68) {
          // Reef halo (turquoise)
          r = 30; g = 150 + n * 30; b = 160 + n * 20;
        } else {
          // Ocean — varying depth
          r = 8 + depth * 15;
          g = 35 + depth * 40 + n * 20;
          b = 120 + depth * 50 + n * 30;
          // Deep trenches
          if (depth < 0.3) {
            r *= 0.5; g *= 0.6; b *= 0.8;
          }
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function jungle() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 7);
        const river = fbm(nx * 4, ny * 4, 3);
        const canopy = fbm(nx * 1.5 + 10, ny * 1.5, 5);

        let r, g, b;

        // River systems
        if (Math.abs(river - 0.5) < 0.02) {
          r = 50; g = 80; b = 130;
        } else {
          // Dense canopy — varying greens
          const dark = canopy < 0.4 ? 1 : 0;
          r = 10 + n * 30 + dark * (-5);
          g = 50 + n * 60 + canopy * 30;
          b = 8 + n * 15 + dark * (-3);

          // Lighter canopy highlights
          if (canopy > 0.6) {
            r += 15; g += 25; b += 5;
          }

          // Darker deep jungle
          if (n < 0.35) {
            r *= 0.6; g *= 0.7; b *= 0.5;
          }
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function desert() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 6);
        const dunes = fbm(nx * 3, ny * 1.5, 4);
        const mesa = fbm(nx * 1.2 + 40, ny * 1.2, 5);
        const lat = Math.abs(y / HALF - 0.5) * 2;

        let r, g, b;

        if (lat > 0.92) {
          // Polar residual ice
          r = 210 + n * 30; g = 200 + n * 25; b = 180 + n * 20;
        } else if (mesa > 0.62) {
          // Rocky mesa formations
          const mi = (mesa - 0.62) * 6;
          r = 100 + mi * 20; g = 65 + mi * 15; b = 30 + mi * 10;
        } else {
          // Sand — warm golden tones
          r = 180 + n * 50 + dunes * 20;
          g = 140 + n * 40 + dunes * 15;
          b = 80 + n * 25 + dunes * 10;

          // Dune ridge highlights
          if (dunes > 0.55) {
            r += 20; g += 15; b += 8;
          }
          // Dune shadow valleys
          if (dunes < 0.35) {
            r -= 25; g -= 20; b -= 12;
          }

          // Canyon lines
          if (Math.abs(fbm(nx * 5, ny * 5, 3) - 0.5) < 0.015) {
            r = 50; g = 28; b = 12;
          }
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function iceWorld() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 6);
        const crack = fbm(nx * 4, ny * 4, 4);
        const glacier = fbm(nx * 1.5, ny * 1.5 + 20, 5);

        // Base ice — blue-white
        let r = 150 + n * 60 + glacier * 30;
        let g = 170 + n * 50 + glacier * 25;
        let b = 210 + n * 35 + glacier * 15;

        // Glacier ridges (brighter white)
        if (glacier > 0.6) {
          r = Math.min(255, r + 40);
          g = Math.min(255, g + 35);
          b = Math.min(255, b + 20);
        }

        // Ice cracks (dark blue lines)
        if (Math.abs(crack - 0.5) < 0.015) {
          r = 25; g = 45; b = 80;
        }

        // Frozen ocean regions (darker blue-gray)
        if (n < 0.35) {
          r = 60 + n * 40; g = 90 + n * 50; b = 150 + n * 40;
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function ancientRuins() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 6);
        const grid = fbm(nx * 2 + 80, ny * 2, 4);
        const energy = fbm(nx * 5, ny * 5, 3);

        // Brownish-gray ancient surface
        let r = 55 + n * 40;
        let g = 40 + n * 30;
        let b = 28 + n * 25;

        // Geometric patterns (hex grid faint lines)
        const hexX = Math.abs(Math.sin(x * 0.05 + y * 0.03));
        const hexY = Math.abs(Math.sin(y * 0.06 - x * 0.02));
        if (hexX < 0.04 || hexY < 0.04) {
          // Grid lines — faint purple
          r += 20; g += 10; b += 40;
        }

        // Energy nodes (bright purple spots)
        if (energy > 0.75 && grid > 0.55) {
          const ei = (energy - 0.75) * 8;
          r = Math.min(255, r + ei * 60);
          g = Math.min(255, g + ei * 30);
          b = Math.min(255, b + ei * 120);
        }

        // Ancient structure foundations (darker rectangles)
        if (grid > 0.65 && n > 0.45) {
          r *= 0.6; g *= 0.6; b *= 0.7;
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function gasGiant() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6;
        // Bands are primarily latitude-based
        const bandFreq = y / HALF * 20;
        const bandNoise = fbm(nx + 10, bandFreq * 0.5, 4);
        const turbulence = fbm(nx * 3, bandFreq * 0.3 + 5, 5);
        const storm = fbm(nx * 4, y / HALF * 8, 6);

        // Band base color varies with latitude
        const bandPhase = Math.sin(bandFreq * 0.8 + bandNoise * 2);
        let r, g, b;

        if (bandPhase > 0.3) {
          // Light band (cream/amber)
          r = 200 + turbulence * 40; g = 160 + turbulence * 30; b = 80 + turbulence * 30;
        } else if (bandPhase > -0.3) {
          // Mid band (amber/brown)
          r = 160 + turbulence * 40; g = 110 + turbulence * 30; b = 50 + turbulence * 20;
        } else {
          // Dark band (deep brown)
          r = 100 + turbulence * 30; g = 65 + turbulence * 20; b = 30 + turbulence * 15;
        }

        // Turbulence distortion along band edges
        const edgeDist = Math.abs(bandPhase);
        if (edgeDist < 0.08) {
          const mix = turbulence * 30;
          r += mix; g += mix * 0.7; b += mix * 0.4;
        }

        // Great Red Storm
        const stormCx = SIZE * 0.6, stormCy = HALF * 0.45;
        const dx = x - stormCx, dy = y - stormCy;
        const stormDist = Math.sqrt(dx * dx + dy * dy * 2.5);
        if (stormDist < 40) {
          const si = 1 - stormDist / 40;
          r = Math.min(255, r + si * 80);
          g = Math.min(255, g + si * 50);
          b = Math.min(255, b + si * 20);
        }

        // Polar darkening
        const lat = Math.abs(y / HALF - 0.5) * 2;
        if (lat > 0.8) {
          const polar = (lat - 0.8) * 5;
          r *= (1 - polar * 0.4); g *= (1 - polar * 0.4); b *= (1 - polar * 0.4);
        }

        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function moon() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 10, ny = y / HALF * 5;
        const n = fbm(nx, ny, 7);
        const crater = fbm(nx * 3, ny * 3, 5);
        const maria = fbm(nx * 0.8 + 30, ny * 0.8, 4);

        // Lunar gray surface
        let val = 130 + n * 50;

        // Maria (darker basalt plains)
        if (maria < 0.4) {
          val = 80 + maria * 60 + n * 20;
        }

        // Crater impacts (round dark spots with bright rims)
        if (crater > 0.72) {
          val = 70 + n * 20; // crater floor
        } else if (crater > 0.68) {
          val = Math.min(220, val + 40); // crater rim highlight
        }

        // Ejecta rays (bright streaks)
        const ray = fbm(nx * 6, ny * 6, 2);
        if (ray > 0.78 && crater > 0.65) {
          val = Math.min(230, val + 30);
        }

        const r = val, g = val * 0.97, b = val * 0.92;
        putPixel(d, idx, Math.min(255, r | 0), Math.min(255, g | 0), Math.min(255, b | 0));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function deadWorld() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 8, ny = y / HALF * 4;
        const n = fbm(nx, ny, 6);
        const scar = fbm(nx * 2 + 60, ny * 2, 5);
        const fracture = fbm(nx * 5, ny * 5, 3);

        // Dead gray-brown
        let r = 60 + n * 30;
        let g = 52 + n * 25;
        let b = 42 + n * 18;

        // Impact scars (darker depressions)
        if (scar > 0.65) {
          const si = (scar - 0.65) * 6;
          r -= si * 20; g -= si * 18; b -= si * 15;
        }

        // Vitrified glass plains (slight sheen)
        if (n > 0.55 && scar < 0.4) {
          r += 15; g += 12; b += 10;
        }

        // Surface fractures (dark lines)
        if (Math.abs(fracture - 0.5) < 0.012) {
          r = 25; g = 20; b = 15;
        }

        // Radiation streaks
        const streak = fbm(nx * 0.5, ny * 3, 3);
        if (Math.abs(streak - 0.5) < 0.02) {
          r *= 0.7; g *= 0.7; b *= 0.7;
        }

        putPixel(d, idx, Math.max(0, Math.min(255, r | 0)), Math.max(0, Math.min(255, g | 0)), Math.max(0, Math.min(255, b | 0)));
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function clouds() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6, ny = y / HALF * 3;
        const n = fbm(nx, ny, 5);

        const alpha = n > 0.45 ? Math.min(255, (n - 0.45) * 400) : 0;
        d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255;
        d[idx + 3] = alpha | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  function ashClouds() {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, HALF);
    const d = img.data;

    for (let y = 0; y < HALF; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const nx = x / SIZE * 6, ny = y / HALF * 3;
        const n = fbm(nx + 5, ny + 5, 5);

        const alpha = n > 0.50 ? Math.min(180, (n - 0.50) * 300) : 0;
        d[idx] = 60; d[idx + 1] = 30; d[idx + 2] = 15;
        d[idx + 3] = alpha | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  /* ── Public API ── */
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
