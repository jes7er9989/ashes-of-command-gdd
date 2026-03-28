/* ═══════════════════════════════════════════════════════════
   sprite-engine.js — Canvas-Based Unit Sprite Renderer
   ───────────────────────────────────────────────────────────
   Part of: Ashes of Command: The Reclamation (PWA)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: DataLoader (for cached JSON)

   Renders unit sprites in two modes:
     1. V2 SVG — if UNIT_SPRITE_V2 data has an SVG string for
        the unit name, inject it directly into the container.
     2. Legacy canvas — procedural polygon silhouette with
        chromatic aberration, scanlines, grid, and HUD overlays.

   Data sources (loaded via DataLoader):
     - data/sprites/unit-sprites.json  → SVG strings per unit
     - data/sprites/shapes.json        → polygon primitives
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════
   SpriteEngine._h32(str)                  | DJB2 hash for deterministic variation
   SpriteEngine._hexToRgb(hex)             | Hex color → [r,g,b] tuple
   SpriteEngine._hexToRgbStr(hex)          | Hex color → "r,g,b" string
   SpriteEngine._getSprites()              | Cached lookup for unit-sprites.json
   SpriteEngine._getShapes()               | Cached lookup for shapes.json
   SpriteEngine.renderUnitSprite(el,...)   | Public: render a unit sprite (SVG or canvas)
   SpriteEngine._renderSvgSprite(el,...)   | Inject V2 SVG into a container element
   SpriteEngine._renderCanvasSprite(cv,..) | Draw legacy canvas sprite
   SpriteEngine._drawGrid(ctx,...)         | Grid background lines
   SpriteEngine._drawPolys(ctx,...)        | Polygon fill with optional blur
   SpriteEngine._drawEdgeWireframe(ctx,..) | Polygon stroke outlines
   SpriteEngine._drawScanlines(ctx,...)    | Horizontal scanline overlay
   SpriteEngine._drawCornerBrackets(ctx,..)| HUD corner bracket decorations
   SpriteEngine._drawReticle(ctx,...)      | Centre hairline reticle
   SpriteEngine._drawNameTag(ctx,...)      | Unit name label (large sprites only)
   SpriteEngine._drawAmbientGlow(ctx,...)  | Radial gradient glow behind unit
   SpriteEngine.unitSpriteSm(name,color,d) | HTML string for 48px thumbnail
   SpriteEngine.unitSpriteLg(name,color,d) | HTML string for 200px portrait
   SpriteEngine.renderAllSprites(container)| Batch-render all canvas[data-usp] in DOM
   ═══════════════════════════════════════════════════════ */

const SpriteEngine = {

  /* ═══════════════════════════════════════════════════════
     HASHING & COLOR UTILITIES
     ═══════════════════════════════════════════════════════ */

  /**
   * DJB2 hash — deterministic 32-bit hash for a string.
   * Used to pick shape variants and compute per-unit offsets.
   * @param {string} str - Input string (typically a unit name)
   * @returns {number} Unsigned 32-bit integer hash
   */
  _h32(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  },

  /**
   * Parse a hex color string into an [r, g, b] array.
   * Falls back to [0, 180, 255] (Terran blue) on invalid input.
   * @param {string} hex - Hex color (e.g. '#00b4ff')
   * @returns {number[]} RGB tuple
   */
  _hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    return m
      ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
      : [0, 180, 255]; // Terran blue fallback
  },

  /**
   * Parse a hex color string into an "r,g,b" string for CSS rgba().
   * @param {string} hex - Hex color (e.g. '#00b4ff')
   * @returns {string} Comma-separated RGB (e.g. '0,180,255')
   */
  _hexToRgbStr(hex) {
    const [r, g, b] = this._hexToRgb(hex);
    return `${r},${g},${b}`;
  },

  /* ═══════════════════════════════════════════════════════
     DATA ACCESS
     ═══════════════════════════════════════════════════════ */

  /**
   * Retrieve the unit sprites SVG map from DataLoader cache.
   * @returns {Object} Map of unit name → SVG string
   */
  _getSprites() {
    return DataLoader.cache['data/sprites/unit-sprites.json'] || {};
  },

  /**
   * Retrieve the shape primitives from DataLoader cache.
   * @returns {Object} Map of domain → array of polygon arrays
   */
  _getShapes() {
    return DataLoader.cache['data/sprites/shapes.json'] || {};
  },

  /* ═══════════════════════════════════════════════════════
     PUBLIC RENDER API
     ═══════════════════════════════════════════════════════ */

  /**
   * Render a unit sprite into an element — either as V2 SVG (preferred)
   * or as a legacy canvas-drawn silhouette (fallback).
   *
   * If a V2 SVG exists for the unit, the element's innerHTML is replaced
   * with the sized SVG. Otherwise a <canvas> is created inside the element
   * and the procedural sprite is drawn onto it.
   *
   * @param {HTMLElement} el        - Container element to render into
   * @param {string}      unitName  - Exact unit name key (e.g. 'Shock-Marine')
   * @param {string}      color     - Faction hex color (e.g. '#00b4ff')
   * @param {string}      domain    - Domain: 'ground', 'air', or 'space'
   * @param {number}      size      - Pixel size (width = height)
   */
  renderUnitSprite(el, unitName, color, domain, size) {
    if (!el || !unitName) return;

    const sprites = this._getSprites();
    const svgStr = sprites[unitName];

    if (svgStr) {
      this._renderSvgSprite(el, svgStr, size);
    } else {
      this._renderCanvasFallback(el, unitName, color, domain, size);
    }
  },

  /**
   * Inject a V2 SVG string into a container, sized to fit.
   * @param {HTMLElement} el     - Container element
   * @param {string}      svg    - Full SVG markup string
   * @param {number}      size   - Target pixel size
   */
  _renderSvgSprite(el, svg, size) {
    el.innerHTML = svg;
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', size);
      svgEl.setAttribute('height', size);
      // Preserve viewBox but ensure it fills the container
      svgEl.style.display = 'block';
    }
  },

  /**
   * Create a <canvas> inside the container and draw the legacy
   * procedural sprite onto it.
   * @param {HTMLElement} el       - Container element
   * @param {string}      unitName - Unit name for hash-based variation
   * @param {string}      color    - Faction hex color
   * @param {string}      domain   - Domain: 'ground', 'air', or 'space'
   * @param {number}      size     - Pixel size
   */
  _renderCanvasFallback(el, unitName, color, domain, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.display = 'block';
    el.innerHTML = '';
    el.appendChild(canvas);
    this._renderCanvasSprite(canvas, unitName, color, domain, size);
  },

  /* ═══════════════════════════════════════════════════════
     CANVAS DRAWING — Legacy procedural sprite
     ─────────────────────────────────────────────────────
     Ported from the monolith's drawSprite() function.
     Draws a polygon silhouette with chromatic aberration,
     ambient glow, scanlines, corner brackets, and a reticle.
     ═══════════════════════════════════════════════════════ */

  /**
   * Draw a procedural unit sprite onto a canvas element.
   * Selects a polygon shape from SHAPES based on domain + name hash,
   * then layers: grid → glow → chromatic aberration → main fill →
   * wireframe → scanlines → brackets → reticle → name tag.
   *
   * @param {HTMLCanvasElement} canvas  - Target canvas
   * @param {string}            name    - Unit name (for hash)
   * @param {string}            color   - Faction hex color
   * @param {string}            domain  - 'ground', 'air', or 'space'
   * @param {number}            size    - Pixel width/height
   */
  _renderCanvasSprite(canvas, name, color, domain, size) {
    const W = size;
    const H = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const h = this._h32(name);
    const shapes = this._getShapes();
    const bank = shapes[domain] || shapes.ground || [];
    if (!bank.length) return; // No shapes loaded yet — bail

    const idx = h % bank.length;
    const polys = [bank[idx]];

    // Per-unit pixel offset for visual variation
    const ox = ((h >> 4) % 7) - 3;
    const oy = ((h >> 8) % 6) - 3;

    const rgb = this._hexToRgbStr(color);

    this._drawGrid(ctx, W, H, rgb);
    this._drawAmbientGlow(ctx, W, H, rgb);

    // Chromatic aberration layers: R ghost, B ghost, glow halo, main fill
    this._drawPolys(ctx, polys, W, H, rgb, 0.10, 0, ox + 2, oy);     // R ghost — right shift
    this._drawPolys(ctx, polys, W, H, rgb, 0.09, 0, ox - 2, oy);     // B ghost — left shift
    this._drawPolys(ctx, polys, W, H, rgb, 0.22, 3, ox, oy);         // glow halo — blurred
    this._drawPolys(ctx, polys, W, H, rgb, 0.88, 0, ox, oy);         // main fill — crisp

    this._drawEdgeWireframe(ctx, polys, W, H, rgb, ox, oy);
    this._drawScanlines(ctx, W, H);
    this._drawCornerBrackets(ctx, W, H, rgb);
    this._drawReticle(ctx, W, H, rgb);
    this._drawNameTag(ctx, name, W, H, rgb, size);
  },

  /**
   * Draw a subtle grid background on the canvas.
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} W   - Canvas width
   * @param {number} H   - Canvas height
   * @param {string} rgb - "r,g,b" string for the faction color
   */
  _drawGrid(ctx, W, H, rgb) {
    ctx.strokeStyle = `rgba(${rgb},.12)`;
    ctx.lineWidth = 0.6;
    const gs = Math.max(10, W / 10); // Grid cell size — 10% of canvas, min 10px
    for (let x = 0; x <= W; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, 0.5);
      ctx.lineTo(x, H - 0.5);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += gs) {
      ctx.beginPath();
      ctx.moveTo(0.5, y);
      ctx.lineTo(W - 0.5, y);
      ctx.stroke();
    }
  },

  /**
   * Draw a radial ambient glow behind the unit silhouette.
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} W   - Canvas width
   * @param {number} H   - Canvas height
   * @param {string} rgb - "r,g,b" faction color string
   */
  _drawAmbientGlow(ctx, W, H, rgb) {
    const grd = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.42);
    grd.addColorStop(0, `rgba(${rgb},.35)`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  },

  /**
   * Draw filled polygon shapes with optional blur.
   * Used for the main fill and chromatic aberration layers.
   * @param {CanvasRenderingContext2D} ctx   - Canvas context
   * @param {Array}  polys - Array of polygon point arrays ([[x,y], ...])
   * @param {number} W     - Canvas width
   * @param {number} H     - Canvas height
   * @param {string} rgb   - "r,g,b" faction color string
   * @param {number} alpha - Fill opacity (0–1)
   * @param {number} blurPx - Gaussian blur radius (0 = none)
   * @param {number} dx    - X translation offset
   * @param {number} dy    - Y translation offset
   */
  _drawPolys(ctx, polys, W, H, rgb, alpha, blurPx, dx, dy) {
    ctx.save();
    if (blurPx) ctx.filter = `blur(${blurPx}px)`;
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.translate(dx, dy);
    polys.forEach(poly => {
      ctx.beginPath();
      poly.forEach(([px, py], i) => {
        const x = px * W;
        const y = py * H;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  },

  /**
   * Draw thin stroke outlines around the polygon edges.
   * @param {CanvasRenderingContext2D} ctx   - Canvas context
   * @param {Array}  polys - Polygon point arrays
   * @param {number} W     - Canvas width
   * @param {number} H     - Canvas height
   * @param {string} rgb   - "r,g,b" faction color string
   * @param {number} ox    - X offset
   * @param {number} oy    - Y offset
   */
  _drawEdgeWireframe(ctx, polys, W, H, rgb, ox, oy) {
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb},.30)`;
    ctx.lineWidth = 0.8;
    ctx.translate(ox, oy);
    polys.forEach(poly => {
      ctx.beginPath();
      poly.forEach(([px, py], i) => {
        const x = px * W;
        const y = py * H;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();
    });
    ctx.restore();
  },

  /**
   * Draw horizontal scanline overlay for CRT/hologram effect.
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} W - Canvas width
   * @param {number} H - Canvas height
   */
  _drawScanlines(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    const SCANLINE_SPACING = 3; // Pixels between scanlines
    const SCANLINE_HEIGHT = 1.2;
    for (let y = 0; y < H; y += SCANLINE_SPACING) {
      ctx.fillRect(0, y, W, SCANLINE_HEIGHT);
    }
  },

  /**
   * Draw HUD-style corner bracket decorations at all four corners.
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} W   - Canvas width
   * @param {number} H   - Canvas height
   * @param {string} rgb - "r,g,b" faction color string
   */
  _drawCornerBrackets(ctx, W, H, rgb) {
    const bsz = Math.max(6, W / 14);  // Bracket arm length
    const bw = Math.max(1, W / 100);   // Bracket stroke width
    ctx.strokeStyle = `rgba(${rgb},.55)`;
    ctx.lineWidth = bw * 1.5;
    // [cornerX, cornerY, signX, signY] for each of four corners
    [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + sx * bsz, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * bsz);
      ctx.stroke();
    });
  },

  /**
   * Draw horizontal centre-cross reticle hairlines.
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} W   - Canvas width
   * @param {number} H   - Canvas height
   * @param {string} rgb - "r,g,b" faction color string
   */
  _drawReticle(ctx, W, H, rgb) {
    const hl = Math.max(8, W * 0.08); // Hairline length
    const bw = Math.max(1, W / 100);
    ctx.strokeStyle = `rgba(${rgb},.28)`;
    ctx.lineWidth = bw;
    // Left hairline
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(hl, H / 2);
    ctx.stroke();
    // Right hairline
    ctx.beginPath();
    ctx.moveTo(W, H / 2);
    ctx.lineTo(W - hl, H / 2);
    ctx.stroke();
  },

  /**
   * Draw the unit name as a label at the bottom (large sprites only).
   * @param {CanvasRenderingContext2D} ctx  - Canvas context
   * @param {string} name - Unit name string
   * @param {number} W    - Canvas width
   * @param {number} H    - Canvas height
   * @param {string} rgb  - "r,g,b" faction color string
   * @param {number} size - Original requested size (for threshold check)
   */
  _drawNameTag(ctx, name, W, H, rgb, size) {
    const MIN_SIZE_FOR_LABEL = 160; // Only label sprites ≥ 160px
    if (size < MIN_SIZE_FOR_LABEL) return;

    const fontSize = Math.max(7, W / 28);
    const MAX_CHARS = 22;
    ctx.font = `${fontSize}px 'JetBrains Mono',monospace`;
    ctx.fillStyle = `rgba(${rgb},.55)`;
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase().substring(0, MAX_CHARS), W / 2, H - 5);
  },

  /* ═══════════════════════════════════════════════════════
     HTML GENERATORS — Sprite wrapper markup
     ─────────────────────────────────────────────────────
     Generate the HTML strings for sprite containers used
     by faction-renderer to embed sprites in unit rows
     and detail panels.
     ═══════════════════════════════════════════════════════ */

  /**
   * Generate HTML for a small 48×48 sprite thumbnail (unit list rows).
   * Returns a container div with data attributes; call renderAllSprites()
   * after insertion to actually draw the sprites.
   * @param {string} name   - Unit name
   * @param {string} color  - Faction hex color
   * @param {string} domain - Domain string
   * @returns {string} HTML string
   */
  unitSpriteSm(name, color, domain) {
    const SIZE = 48;
    const h = this._h32(name);
    const breathDur = 3 + (h % 3);
    const breathDly = ((h % 2000) / 1000).toFixed(2);
    const flickDur = 5 + (h % 7);
    const rgb = this._hexToRgbStr(color);
    return `<div class="usp-wrap" style="width:${SIZE}px;height:${SIZE}px;flex-shrink:0;` +
      `border:1px dashed rgba(${rgb},.30);` +
      `background:#060a0e;margin-right:6px;` +
      `animation:uspBreathe ${breathDur}s ease-in-out ${breathDly}s infinite,` +
      `uspFlicker ${flickDur}s step-end ${breathDly}s infinite">` +
      `<div data-usp="1" data-name="${name}" data-color="${color}" data-domain="${domain || ''}" ` +
      `data-size="${SIZE}" style="width:${SIZE}px;height:${SIZE}px;overflow:hidden"></div></div>`;
  },

  /**
   * Generate HTML for a large 200×200 sprite portrait (detail panels).
   * @param {string} name   - Unit name
   * @param {string} color  - Faction hex color
   * @param {string} domain - Domain string
   * @returns {string} HTML string
   */
  unitSpriteLg(name, color, domain) {
    const SIZE = 200;
    const h = this._h32(name);
    const breathDur = 3 + (h % 3);
    const breathDly = ((h % 2000) / 1000).toFixed(2);
    const flickDur = 5 + (h % 7);
    const rgb = this._hexToRgbStr(color);
    return `<div class="usp-wrap" style="width:${SIZE}px;height:${SIZE}px;flex-shrink:0;` +
      `border:1px dashed rgba(${rgb},.30);` +
      `background:#060a0e;` +
      `animation:uspBreathe ${breathDur}s ease-in-out ${breathDly}s infinite,` +
      `uspFlicker ${flickDur}s step-end ${breathDly}s infinite">` +
      `<div data-usp="1" data-name="${name}" data-color="${color}" data-domain="${domain || ''}" ` +
      `data-size="${SIZE}" style="width:${SIZE}px;height:${SIZE}px;overflow:hidden"></div></div>`;
  },

  /**
   * Batch-render all sprite placeholders within a container.
   * Finds all elements with data-usp="1" and calls renderUnitSprite
   * on each. Call this after injecting HTML from unitSpriteSm/Lg.
   * @param {HTMLElement} container - Parent element to scan
   */
  renderAllSprites(container) {
    if (!container) return;
    container.querySelectorAll('[data-usp]').forEach(el => {
      const name = el.dataset.name;
      const color = el.dataset.color;
      const domain = el.dataset.domain;
      const size = parseInt(el.dataset.size) || 200;
      this.renderUnitSprite(el, name, color, domain, size);
    });
  },

  /* ═══════════════════════════════════════════════════════
     CSS INJECTION — Animation keyframes
     ─────────────────────────────────────────────────────
     Injects the breathing/flicker CSS once on first use.
     ═══════════════════════════════════════════════════════ */

  /** @type {boolean} Whether CSS has been injected already */
  _cssInjected: false,

  /**
   * Inject sprite animation CSS into <head> if not already present.
   * Called automatically on first render. Idempotent.
   */
  ensureCss() {
    if (this._cssInjected) return;
    const CSS_ANIM = `
      @keyframes uspBreathe{0%,100%{opacity:.80;transform:scale(1)}50%{opacity:1;transform:scale(1.015)}}
      @keyframes uspFlicker{0%,100%{opacity:1}4%{opacity:.72}5%{opacity:1}42%{opacity:1}44%{opacity:.85}45%{opacity:1}73%{opacity:1}74%{opacity:.9}75%{opacity:1}}
      .usp-wrap{display:inline-block;position:relative;overflow:hidden;border-radius:2px}
      .usp-wrap canvas{display:block}
    `;
    const st = document.createElement('style');
    st.textContent = CSS_ANIM;
    document.head.appendChild(st);
    this._cssInjected = true;
  }
};

// Inject animation CSS on load
SpriteEngine.ensureCss();
