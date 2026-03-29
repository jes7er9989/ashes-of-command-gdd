/* ═══════════════════════════════════════════════════════════
   visual-effects.js — Visual Polish Systems
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: AudioEngine (optional, for faction sync)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   FactionBgSwitcher.apply(chId)     | Switch faction background theme
   FactionBgSwitcher.getCurrent()    | Return current faction key
   AmbientParticles.init()           | Start floating particle system
   AmbientParticles.setFaction(f)    | Change particle colors
   AmbientParticles.destroy()        | Stop and remove particles
   FactionCursor.init()              | Start custom cursor glow
   FactionCursor.setFaction(f)       | Change cursor color
   FactionCursor.destroy()           | Remove cursor effects
   FactionFlagBadge.init()           | Create faction emblem badge
   FactionFlagBadge.setFaction(f)    | Show faction emblem
   FactionFlagBadge.destroy()        | Remove badge
   LoreQuoteRotator.init()           | Start cycling lore quotes
   LoreQuoteRotator.destroy()        | Stop rotator
   HoloTilt.init()                   | Attach tilt effect to cards
   HoloTilt.destroy()                | Remove tilt listeners
   ScanlineOverlay.init()            | Create scanline overlay div
   ScanlineOverlay.destroy()         | Remove scanline overlay
   CRTEffect.init()                  | Create CRT overlay
   CRTEffect.toggle()               | Toggle CRT on/off
   CRTEffect.destroy()              | Remove CRT overlay
   VisualEffects.init()              | Initialize all visual systems
   VisualEffects.destroy()           | Tear down all visual systems
   ═══════════════════════════════════════════════════════════ */


// ───────────────────────────────────────────
// SECTION: Faction Color Map (shared)
// ───────────────────────────────────────────

const FACTION_COLORS = {
  terran:    { r: 0, g: 180, b: 255, hex: '#00b4ff' },    // Blue — disciplined military
  shards:    { r: 0, g: 255, b: 238, hex: '#00ffee' },    // Cyan — crystalline energy
  horde:     { r: 255, g: 102, b: 34, hex: '#ff6622' },   // Orange — salvaged chaos
  necro:     { r: 68, g: 255, b: 102, hex: '#44ff66' },   // Green — reanimation glow
  accord:    { r: 255, g: 170, b: 34, hex: '#ffaa22' },   // Gold — diplomatic unity
  vorax:     { r: 255, g: 34, b: 102, hex: '#ff2266' },   // Red — biological threat
  guardians: { r: 204, g: 68, b: 255, hex: '#cc44ff' },   // Purple — ancient protectors
};


// ───────────────────────────────────────────
// SECTION: Faction Background Switcher
// ───────────────────────────────────────────

const FactionBgSwitcher = (() => {
  // Maps faction-specific chapters to their faction key
  const chapterMap = {
    ch5: 'terran', ch6: 'shards', ch7: 'horde', ch8: 'necro',
    ch9: 'accord', ch10: 'vorax', ch11: 'guardians'
  };
  let currentBg = null;

  /**
   * Apply faction background theme based on current chapter.
   * Adds faction-bg-{name} class to body and updates #procedural-bg.
   * @param {string} chId — Chapter ID (e.g. 'ch5')
   */
  function apply(chId) {
    const faction = chapterMap[chId];
    const body = document.body;

    // Remove all existing faction bg classes from body
    body.className = body.className.replace(/faction-bg-\S+/g, '').trim();

    // Update #procedural-bg full-page layer (CSS-only backgrounds)
    const pbg = document.getElementById('procedural-bg');
    if (pbg) pbg.className = faction ? 'bg-' + faction : '';

    if (faction) {
      body.classList.add('faction-bg-' + faction);
      currentBg = faction;

      // Sync visual subsystems to current faction
      AmbientParticles.setFaction(faction);
      FactionCursor.setFaction(faction);
      FactionFlagBadge.setFaction(faction);

      // Tell AudioEngine which faction we're on — even if audio is off,
      // so click/hover sounds use the correct profile immediately
      if (typeof AudioEngine !== 'undefined') {
        AudioEngine.setFaction(faction);
        // Auto-play ambient if audio is already on
        const audioBtn = document.getElementById('audio-toggle');
        if (audioBtn && audioBtn.getAttribute('data-on') === '1') {
          AudioEngine.startBg(faction);
        }
      }
    } else {
      currentBg = null;
      AmbientParticles.setFaction(null);
      FactionCursor.setFaction(null);
      FactionFlagBadge.setFaction(null);
      if (typeof AudioEngine !== 'undefined') {
        AudioEngine.setFaction(null);
      }
    }
  }

  return { apply, getCurrent: () => currentBg };
})();


// ───────────────────────────────────────────
// SECTION: Ambient Particles
// ───────────────────────────────────────────

const AmbientParticles = (() => {
  let container = null;
  let animFrame = null;
  let particles = [];
  let currentFaction = null;
  const MAX_PARTICLES = 35;
  const SPAWN_INTERVAL_MS = 600;
  let lastSpawn = 0;

  function init() {
    if (container) return;
    container = document.getElementById('ambient-particles');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ambient-particles';
      document.body.appendChild(container);
    }
    _tick(performance.now());
  }

  function destroy() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
    particles = [];
    if (container) { container.innerHTML = ''; }
  }

  function setFaction(f) {
    currentFaction = f;
  }

  function _tick(now) {
    animFrame = requestAnimationFrame(_tick);
    if (!currentFaction) return;

    // Spawn new particles at regular intervals
    if (now - lastSpawn > SPAWN_INTERVAL_MS && particles.length < MAX_PARTICLES) {
      lastSpawn = now;
      _spawn();
    }

    // Clean up finished particles (CSS animation handles movement)
    particles = particles.filter(p => {
      if (now - p.born > p.life) {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        return false;
      }
      return true;
    });
  }

  function _spawn() {
    const fc = FACTION_COLORS[currentFaction];
    if (!fc || !container) return;

    const el = document.createElement('div');
    el.className = 'ambient-particle';

    const size = 2 + Math.random() * 4;
    const x = Math.random() * 100;
    const dur = 4 + Math.random() * 8;
    const drift = -30 + Math.random() * 60;
    const opacity = 0.15 + Math.random() * 0.45;

    el.style.cssText = [
      'width:' + size + 'px',
      'height:' + size + 'px',
      'left:' + x + '%',
      'bottom:-10px',
      '--drift:' + drift + 'px',
      '--dur:' + dur + 's',
      'opacity:' + opacity,
      'background:rgba(' + fc.r + ',' + fc.g + ',' + fc.b + ',0.8)',
      'box-shadow:0 0 ' + (size * 2) + 'px rgba(' + fc.r + ',' + fc.g + ',' + fc.b + ',0.4)',
    ].join(';');

    container.appendChild(el);

    const life = dur * 1000;
    particles.push({ el, born: performance.now(), life });

    // Remove after animation completes (fallback)
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, life + 500);
  }

  return { init, destroy, setFaction };
})();


// ───────────────────────────────────────────
// SECTION: Faction Cursor
// ───────────────────────────────────────────

const FactionCursor = (() => {
  let glow = null;
  let currentFaction = null;
  let listening = false;

  function init() {
    if (glow) return;
    glow = document.createElement('div');
    glow.id = 'faction-cursor-glow';
    document.body.appendChild(glow);

    if (!listening) {
      document.addEventListener('mousemove', _onMove);
      listening = true;
    }
  }

  function destroy() {
    if (listening) {
      document.removeEventListener('mousemove', _onMove);
      listening = false;
    }
    if (glow && glow.parentNode) {
      glow.parentNode.removeChild(glow);
      glow = null;
    }
  }

  function setFaction(f) {
    currentFaction = f;
    if (glow) {
      if (f && FACTION_COLORS[f]) {
        const fc = FACTION_COLORS[f];
        glow.style.background = 'radial-gradient(circle, rgba(' +
          fc.r + ',' + fc.g + ',' + fc.b + ',0.15) 0%, transparent 70%)';
        glow.style.display = 'block';
      } else {
        glow.style.display = 'none';
      }
    }
  }

  function _onMove(e) {
    if (!glow || !currentFaction) return;
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }

  return { init, destroy, setFaction };
})();


// ───────────────────────────────────────────
// SECTION: Faction Flag Badge
// ───────────────────────────────────────────

const FactionFlagBadge = (() => {
  let badge = null;

  // Faction symbol characters (Unicode / emoji-free geometric glyphs)
  const FACTION_GLYPHS = {
    terran:    '◆',   // Diamond — order and structure
    shards:    '◇',   // Open diamond — crystalline refraction
    horde:     '⬡',   // Hexagon — salvaged geometry
    necro:     '△',   // Triangle — reanimation sigil
    accord:    '○',   // Circle — unity, no edges
    vorax:     '✕',   // Cross — devouring reach
    guardians: '☆',   // Star — ancient cosmic light
  };

  function init() {
    if (badge) return;
    badge = document.createElement('div');
    badge.id = 'faction-flag-badge';
    badge.style.display = 'none';
    document.body.appendChild(badge);
  }

  function destroy() {
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
      badge = null;
    }
  }

  function setFaction(f) {
    if (!badge) return;
    if (f && FACTION_COLORS[f]) {
      const fc = FACTION_COLORS[f];
      badge.textContent = FACTION_GLYPHS[f] || '●';
      badge.style.color = fc.hex;
      badge.style.textShadow = '0 0 12px ' + fc.hex + ', 0 0 24px ' + fc.hex;
      badge.style.borderColor = fc.hex;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  return { init, destroy, setFaction };
})();


// ───────────────────────────────────────────
// SECTION: Lore Quote Rotator
// ───────────────────────────────────────────

const LoreQuoteRotator = (() => {
  let timer = null;
  let el = null;
  let index = 0;

  const QUOTES = [
    { text: '"Command is the weight that breaks or forges."', faction: 'terran' },
    { text: '"The crystal remembers what the flesh forgets."', faction: 'shards' },
    { text: '"Rust is just another word for experience."', faction: 'horde' },
    { text: '"Death is not the end — it is reassignment."', faction: 'necro' },
    { text: '"Unity demands sacrifice. Sacrifice demands unity."', faction: 'accord' },
    { text: '"Consume. Adapt. Evolve. Repeat."', faction: 'vorax' },
    { text: '"We were ancient when the stars were young."', faction: 'guardians' },
    { text: '"Every war ends. The question is who remains."', faction: 'terran' },
    { text: '"Entropy is merely a design flaw."', faction: 'shards' },
    { text: '"Break it, weld it, break it better."', faction: 'horde' },
    { text: '"Your dead serve a greater purpose now."', faction: 'necro' },
    { text: '"Diplomacy is the art of letting others lose slowly."', faction: 'accord' },
    { text: '"Hunger is the only constant."', faction: 'vorax' },
    { text: '"Witness the patience of aeons."', faction: 'guardians' },
  ];

  const ROTATE_INTERVAL_MS = 8000;

  function init() {
    el = document.getElementById('lore-quote-rotator');
    if (!el) return;
    _show();
    timer = setInterval(_rotate, ROTATE_INTERVAL_MS);
  }

  function destroy() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function _rotate() {
    if (!el) return;
    // Fade out
    el.style.opacity = '0';
    setTimeout(() => {
      index = (index + 1) % QUOTES.length;
      _show();
      el.style.opacity = '1';
    }, 400);
  }

  function _show() {
    if (!el) return;
    const q = QUOTES[index];
    const fc = FACTION_COLORS[q.faction];
    el.innerHTML = '<span style="color:' + fc.hex + '">' + q.text + '</span>' +
      '<span class="lore-quote-faction"> — ' + q.faction.toUpperCase() + '</span>';
  }

  return { init, destroy };
})();


// ───────────────────────────────────────────
// SECTION: Holo-Tilt Effect on Cards
// ───────────────────────────────────────────

const HoloTilt = (() => {
  const MAX_TILT_DEG = 4;
  let listening = false;

  function init() {
    if (listening) return;
    document.addEventListener('mousemove', _onMove);
    document.addEventListener('mouseleave', _onLeave, true);
    listening = true;
  }

  function destroy() {
    if (!listening) return;
    document.removeEventListener('mousemove', _onMove);
    document.removeEventListener('mouseleave', _onLeave, true);
    listening = false;
    // Reset any tilted cards
    document.querySelectorAll('.card, .faction-card').forEach(card => {
      card.style.transform = '';
    });
  }

  function _onMove(e) {
    const card = e.target.closest('.card, .faction-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    // Normalized position within card: -1 to 1
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    // Rotate inversely: tilt away from cursor for holographic feel
    const rotX = -y * MAX_TILT_DEG;
    const rotY = x * MAX_TILT_DEG;

    card.style.transform = 'perspective(800px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-3px)';
  }

  function _onLeave(e) {
    const card = e.target.closest('.card, .faction-card');
    if (card) {
      card.style.transform = '';
    }
  }

  return { init, destroy };
})();


// ───────────────────────────────────────────
// SECTION: Scanline Overlay
// ───────────────────────────────────────────

const ScanlineOverlay = (() => {
  let el = null;

  function init() {
    if (el) return;
    el = document.getElementById('scanline-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scanline-overlay';
      document.body.appendChild(el);
    }
  }

  function destroy() {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      el = null;
    }
  }

  return { init, destroy };
})();


// ───────────────────────────────────────────
// SECTION: CRT Effect Toggle
// ───────────────────────────────────────────

const CRTEffect = (() => {
  let el = null;
  let active = false;

  function init() {
    if (el) return;
    el = document.getElementById('crt-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'crt-overlay';
      document.body.appendChild(el);
    }
  }

  function toggle() {
    active = !active;
    if (el) {
      el.classList.toggle('active', active);
    }
    document.body.classList.toggle('crt-active', active);
    return active;
  }

  function isActive() { return active; }

  function destroy() {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      el = null;
    }
    active = false;
    document.body.classList.remove('crt-active');
  }

  return { init, toggle, isActive, destroy };
})();


// ───────────────────────────────────────────
// SECTION: Master Init / Destroy
// ───────────────────────────────────────────

const VisualEffects = (() => {
  function init() {
    FactionCursor.init();
    FactionFlagBadge.init();
    AmbientParticles.init();
    ScanlineOverlay.init();
    CRTEffect.init();
    LoreQuoteRotator.init();
    // HoloTilt disabled — Thomas prefers cards that don't pitch around
    // HoloTilt.init();

    console.log('%c[VFX] Visual effects online.', 'color:#cc44ff;font-family:monospace');
  }

  function destroy() {
    FactionCursor.destroy();
    FactionFlagBadge.destroy();
    AmbientParticles.destroy();
    ScanlineOverlay.destroy();
    CRTEffect.destroy();
    LoreQuoteRotator.destroy();
    HoloTilt.destroy();
  }

  return { init, destroy };
})();
