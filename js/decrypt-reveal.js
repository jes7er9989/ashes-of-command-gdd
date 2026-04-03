/* ═══════════════════════════════════════════════════════════
   DECRYPT REVEAL — Scrambled-text entrance effect
   ───────────────────────────────────────────────────────────
   When a chapter page loads, target text elements briefly
   display as scrambled glyphs before snapping to real text.
   Also drives the "ACCESSING RECORD..." flash and the
   page-enter / page-exit fade transitions.

   Key exports:
     DecryptReveal.run(container)     → decrypt-animate visible text
     DecryptReveal.transition(cb)     → full exit→flash→enter→decrypt

   Dependencies:
     - ChapterLoader.contentArea (the content container)
   ═══════════════════════════════════════════════════════════ */

const DecryptReveal = {

  /** Scramble character pool — military/data aesthetic */
  GLYPHS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789░▓█╬╠╣║═◆◇●○■□▲△',

  /** CSS selectors for text elements to decrypt */
  SELECTORS: '.section-heading, .section-label, .page-title, .body-text',

  /** Max elements to animate (performance guard) */
  MAX_ELEMENTS: 10,

  /** Total decrypt duration in ms */
  DURATION: 150,

  /* ── Decrypt Animation ─────────────────────────────────── */

  /**
   * Run the decrypt-reveal effect on text elements inside a container.
   * Stores real text, replaces with scrambled glyphs, then progressively
   * reveals real characters over DURATION ms using rAF.
   * @param {HTMLElement} container - Parent element to search within
   */
  run(container) {
    // Skip if dev mode is active
    if (document.body.classList.contains('dev-mode-active')) return;
    if (!container) return;

    const elements = container.querySelectorAll(this.SELECTORS);
    if (!elements.length) return;

    // Limit to first N visible elements
    const targets = [];
    for (let i = 0; i < elements.length && targets.length < this.MAX_ELEMENTS; i++) {
      const el = elements[i];
      const text = el.textContent.trim();
      if (text.length > 0) {
        targets.push({ el, realText: el.textContent });
      }
    }

    if (!targets.length) return;

    // Replace all with scrambled text
    for (const t of targets) {
      t.el.textContent = this._scramble(t.realText);
      t.el.classList.add('decrypt-active');
    }

    // Animate: progressively reveal real chars over DURATION ms
    const start = performance.now();
    const duration = this.DURATION;

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      for (const t of targets) {
        const len = t.realText.length;
        const revealed = Math.floor(progress * len);
        // Build string: real chars up to `revealed`, scrambled for the rest
        let result = '';
        for (let i = 0; i < len; i++) {
          if (i < revealed) {
            result += t.realText[i];
          } else if (t.realText[i] === ' ' || t.realText[i] === '\n') {
            result += t.realText[i]; // preserve whitespace
          } else {
            result += this.GLYPHS[Math.floor(Math.random() * this.GLYPHS.length)];
          }
        }
        t.el.textContent = result;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Safety snap: ensure all text is fully restored
        for (const t of targets) {
          t.el.textContent = t.realText;
          t.el.classList.remove('decrypt-active');
        }
      }
    };

    requestAnimationFrame(step);
  },

  /**
   * Generate a scrambled version of a string, preserving whitespace.
   * @param {string} text - Original text
   * @returns {string} Scrambled text
   */
  _scramble(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ' || text[i] === '\n' || text[i] === '\t') {
        result += text[i];
      } else {
        result += this.GLYPHS[Math.floor(Math.random() * this.GLYPHS.length)];
      }
    }
    return result;
  },

  /* ── Page Transition Orchestrator ──────────────────────── */

  /**
   * Full page transition: fade-out current content, flash
   * "ACCESSING RECORD...", then call the load callback, fade-in
   * new content, and run the decrypt reveal.
   *
   * @param {HTMLElement} contentArea - The #content-area element
   * @param {Function} loadCallback - Async function that loads new content
   * @returns {Promise<void>}
   */
  async transition(contentArea, loadCallback) {
    if (!contentArea) {
      await loadCallback();
      return;
    }

    // Skip animations in dev mode — instant swap
    if (document.body.classList.contains('dev-mode-active')) {
      await loadCallback();
      return;
    }

    // ── Phase 1: Fade out current content (150ms) ──
    const inner = contentArea.querySelector('.fade-in') || contentArea.firstElementChild;
    if (inner) {
      inner.classList.add('page-exit');
      await this._wait(150);
    }

    // ── Phase 2: Show "ACCESSING RECORD..." flash ──
    contentArea.innerHTML = '';
    contentArea.style.position = 'relative';
    const flash = document.createElement('div');
    flash.className = 'accessing-record-flash';
    flash.textContent = 'ACCESSING RECORD...';
    contentArea.appendChild(flash);
    flash.offsetHeight; // force reflow
    flash.classList.add('visible');
    await this._wait(200);

    // ── Phase 3: Inject new content (replaces flash), then fade in ──
    await loadCallback();

    const newInner = contentArea.querySelector('.fade-in');
    if (newInner) {
      // Replace default fade-in animation with our controlled enter
      newInner.classList.remove('fade-in');
      newInner.classList.add('page-enter');
      newInner.offsetHeight; // force reflow
      newInner.classList.add('page-enter-active');
    }

    // ── Phase 4: Decrypt reveal (150ms) ──
    this.run(contentArea);
  },

  /**
   * Promise-based delay helper.
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/* Expose globally */
window.DecryptReveal = DecryptReveal;
