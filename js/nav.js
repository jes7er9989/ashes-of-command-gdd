/* ═══════════════════════════════════════════════════════════
   NAV - Sidebar Navigation & Hash-Based Routing
   ───────────────────────────────────────────────────────────
   Owns the sidebar chapter tree, the quick-filter input,
   sidebar collapse/hamburger toggles, and the hash router
   that decides what content to show in the main area.

   Key exports:
     Nav.init()            → boot the sidebar (called once)
     Nav.route(hash)       → navigate to a chapter or dashboard
     Nav.findChapter(id)   → look up chapter metadata by ID

   Dependencies:
     - DataLoader   (loads nav-data.json)
     - Dashboard    (renders the landing page)
     - ChapterLoader (renders individual chapters)
   ═══════════════════════════════════════════════════════════ */

const Nav = {
  container: null,     // #nav-container element
  filterInput: null,   // #nav-filter input element
  navData: null,       // Parsed nav-data.json (array of parts)

  /* ── Initialization ──────────────────────────────────── */

  /**
   * Boot the sidebar: fetch nav data, render the tree, wire up
   * all event listeners, then navigate to the current URL hash.
   * @returns {Promise<void>}
   */
  async init() {
    this.container = document.getElementById('nav-container');
    this.filterInput = document.getElementById('nav-filter');
    this.navData = await DataLoader.loadNavData();

    this.render();
    this.bindFilter();
    this.bindToggle();
    this.bindHamburger();
    this.bindRouting();
    this.bindTouchGestures();
    this.bindBackToTop();

    // Navigate to current hash or default to dashboard
    this.onHashChange();
  },

  /* ── Rendering ───────────────────────────────────────── */

  /**
   * Build the sidebar HTML from navData, optionally filtered.
   * Parts with no matching chapters are hidden during filtering.
   * @param {string} [filter=''] - Text to filter chapters by title/number
   */
  render(filter = '') {
    const lc = filter.toLowerCase();

    /* ── No filter: render full nav tree ───────────────── */
    if (!lc) {
      let html = '';
      for (const part of this.navData) {
        html += `<div class="nav-part">`;
        html += `<div class="nav-part-header" data-part="${part.part}">
          <span>${part.part}</span>
          <span class="chevron">▼</span>
        </div>`;
        html += `<div class="nav-part-chapters">`;
        for (const ch of part.chapters) {
          const colorStyle = ch.color ? `style="--ch-color:${ch.color}"` : '';
          html += `<a class="nav-chapter" href="#${ch.id}" data-id="${ch.id}" ${colorStyle}>
            <span class="ch-num">${ch.num}</span>${ch.title}
          </a>`;
        }
        html += `</div></div>`;
      }
      this.container.innerHTML = html;
      this.bindPartHeaders();
      this.highlightActive();
      return;
    }

    /* ── Filtered: use intelligent search ──────────────── */
    const scored = this._scoreChapters(lc);

    if (scored.length === 0) {
      this.container.innerHTML = `<div class="nav-empty">No matches for "${filter}"</div>`;
      return;
    }

    // Group scored results back into their parts, preserving score order
    const partMap = new Map();
    for (const part of this.navData) {
      partMap.set(part.part, { part: part.part, chapters: [] });
    }
    for (const item of scored) {
      const group = partMap.get(item.part);
      if (group) group.chapters.push(item);
    }

    let html = '';
    for (const [, group] of partMap) {
      if (group.chapters.length === 0) continue;
      html += `<div class="nav-part">`;
      html += `<div class="nav-part-header" data-part="${group.part}">
        <span>${group.part}</span>
        <span class="chevron">▼</span>
      </div>`;
      html += `<div class="nav-part-chapters">`;
      for (const ch of group.chapters) {
        const colorStyle = ch.color ? `style="--ch-color:${ch.color}"` : '';
        const synHint = ch.synonymHint ? `<span class="nav-syn-hint">via ${ch.synonymHint}</span>` : '';
        html += `<a class="nav-chapter" href="#${ch.id}" data-id="${ch.id}" ${colorStyle}>
          <span class="ch-num">${ch.num}</span>${ch.title}${synHint}
        </a>`;
      }
      html += `</div></div>`;
    }

    this.container.innerHTML = html;
    this.bindPartHeaders();
    this.highlightActive();
  },

  /**
   * Score all chapters against a search query using the search index.
   * Falls back to simple title/number matching if index isn't loaded.
   * @param {string} query - Lowercase search query
   * @returns {Array} Scored chapter objects sorted by relevance
   */
  _scoreChapters(query) {
    const index = Search._index;
    const synonyms = Search._synonyms;

    /* ── Fallback: simple title match if index not ready ── */
    if (!index) {
      const results = [];
      for (const part of this.navData) {
        for (const ch of part.chapters) {
          if (ch.title.toLowerCase().includes(query) || ch.num.toLowerCase().includes(query)) {
            results.push({ ...ch, part: part.part, score: 1 });
          }
        }
      }
      return results;
    }

    /* ── Expand query with synonyms ────────────────────── */
    const expanded = [];
    if (synonyms) {
      const words = query.split(/\s+/);
      for (const w of words) {
        if (synonyms[w]) expanded.push(...synonyms[w].map(s => s.toLowerCase()));
      }
      if (synonyms[query]) expanded.push(...synonyms[query].map(s => s.toLowerCase()));
    }
    const allTerms = [query, ...new Set(expanded)];

    /* ── Score each indexed chapter ────────────────────── */
    const scored = [];
    for (const entry of index) {
      let bestScore = 0;
      let synonymHint = null;

      for (const term of allTerms) {
        const isSyn = term !== query;
        const mult = isSyn ? 0.7 : 1.0;
        let s = 0;

        // Title
        if (entry.title.toLowerCase().includes(term)) s += 100 * mult;
        if (entry.pageTitle && entry.pageTitle.toLowerCase().includes(term)) s += 80 * mult;
        // Subtitle
        if (entry.subtitle && entry.subtitle.toLowerCase().includes(term)) s += 60 * mult;
        // Section headings
        if (entry.sections) {
          let hits = 0;
          for (const sec of entry.sections) { if (sec.toLowerCase().includes(term)) hits++; }
          if (hits) s += 40 * Math.min(hits, 3) * mult;
        }
        // Content
        if (entry.content && entry.content.toLowerCase().includes(term)) {
          s += 10 * mult;
        }

        if (s > bestScore) {
          bestScore = s;
          synonymHint = isSyn ? term : null;
        }
      }

      if (bestScore > 0) {
        // Find the nav chapter metadata
        let navCh = null;
        let partName = '';
        for (const part of this.navData) {
          const found = part.chapters.find(c => c.id === entry.id);
          if (found) { navCh = found; partName = part.part; break; }
        }
        if (navCh) {
          scored.push({
            ...navCh,
            part: partName,
            score: bestScore,
            synonymHint
          });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  },

  /* ── Event Binding ───────────────────────────────────── */

  /**
   * Attach click listeners to part headers for collapse/expand toggling.
   */
  bindPartHeaders() {
    this.container.querySelectorAll('.nav-part-header').forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        const chapters = header.nextElementSibling;
        if (header.classList.contains('collapsed')) {
          chapters.classList.add('collapsed');
        } else {
          chapters.classList.remove('collapsed');
        }
      });
    });
  },

  /**
   * Debounced input handler for the sidebar filter box.
   * Re-renders the nav tree after 150ms of inactivity.
   */
  bindFilter() {
    if (!this.filterInput) return;
    let timeout;
    this.filterInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.render(this.filterInput.value.trim());
      }, 150);
    });
  },

  /**
   * Desktop sidebar collapse toggle (the ◀/▶ button).
   */
  bindToggle() {
    const btn = document.getElementById('sidebar-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      btn.textContent = document.body.classList.contains('sidebar-collapsed') ? '▶' : '◀';
    });
  },

  /**
   * Mobile hamburger menu: toggles sidebar visibility, dark overlay,
   * body scroll lock. Auto-closes on chapter click and hashchange.
   */
  bindHamburger() {
    const btn = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (!btn || !sidebar) return;

    this._savedScrollY = 0;

    this._openSidebar = () => {
      if (sidebar.classList.contains('mobile-open')) return;
      this._savedScrollY = window.scrollY;
      btn.classList.add('open');
      sidebar.classList.add('mobile-open');
      if (overlay) overlay.classList.add('active');
      document.body.classList.add('sidebar-open');
      document.body.style.top = `-${this._savedScrollY}px`;
    };

    this._closeSidebar = () => {
      if (!sidebar.classList.contains('mobile-open')) return;
      btn.classList.remove('open');
      sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
      document.body.style.top = '';
      window.scrollTo(0, this._savedScrollY);
    };

    const toggle = () => {
      if (sidebar.classList.contains('mobile-open')) {
        this._closeSidebar();
      } else {
        this._openSidebar();
      }
    };

    btn.addEventListener('click', toggle);
    if (overlay) overlay.addEventListener('click', () => this._closeSidebar());

    // Auto-close sidebar when a chapter link is tapped on mobile
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.nav-chapter') && window.innerWidth <= 768) {
        this._closeSidebar();
      }
    });

    // Close sidebar on hashchange (e.g. back/forward navigation)
    window.addEventListener('hashchange', () => {
      if (window.innerWidth <= 768) {
        this._closeSidebar();
      }
    });
  },

  /**
   * Listen for hash changes to trigger page navigation.
   */
  bindRouting() {
    window.addEventListener('hashchange', () => {
      // Play click sound on chapter navigation if audio is active
      var ab = document.getElementById('audio-toggle');
      if (ab && ab.getAttribute('data-on') === '1' && typeof AudioEngine !== 'undefined') {
        try { AudioEngine.playClick(); } catch(e) {}
      }
      this.onHashChange();
    });
  },

  /* ── Routing ─────────────────────────────────────────── */

  /**
   * Handle a hashchange event: highlight the active nav link
   * and route to the appropriate content.
   */
  onHashChange() {
    const hash = location.hash.slice(1) || 'dashboard';
    this.highlightActive();
    this.route(hash);
  },

  /**
   * Update the .active class on nav chapter links to match the
   * current URL hash. Faction chapters get their accent color
   * applied to the left border.
   */
  highlightActive() {
    const hash = location.hash.slice(1) || 'dashboard';
    this.container.querySelectorAll('.nav-chapter').forEach(el => {
      const isActive = el.dataset.id === hash;
      el.classList.toggle('active', isActive);

      // Apply faction-specific border color for active faction chapters
      if (isActive && el.style.getPropertyValue('--ch-color')) {
        el.style.borderLeftColor = el.style.getPropertyValue('--ch-color');
      } else if (!isActive) {
        el.style.borderLeftColor = '';
      }
    });
  },

  /**
   * Route to a page based on the URL hash.
   * 'dashboard' or empty → render the faction overview dashboard.
   * Anything else → load the corresponding chapter HTML fragment.
   * @param {string} hash - The URL hash (without the # prefix)
   */
  route(hash) {
    const content = document.getElementById('content-area');
    if (!content) return;

    if (hash === 'dashboard' || hash === '') {
      // Reset title and remove any faction body class
      document.title = 'Ashes of Command: The Reclamation — Interactive GDD';
      document.body.classList.remove(
        'faction-terran', 'faction-shards', 'faction-horde',
        'faction-necro', 'faction-accord', 'faction-vorax', 'faction-guardians'
      );
      Dashboard.render(content);
    } else {
      ChapterLoader.load(hash);
    }
  },

  /* ── Lookup ──────────────────────────────────────────── */

  /**
   * Find a chapter object by its ID across all parts.
   * @param {string} id - Chapter ID (e.g. 'ch5', 'appB')
   * @returns {Object|null} The chapter object, or null if not found
   */
  findChapter(id) {
    for (const part of this.navData) {
      for (const ch of part.chapters) {
        if (ch.id === id) return ch;
      }
    }
    return null;
  },

  /* ── Touch Gestures ────────────────────────────────────── */

  /**
   * Swipe-right from left edge opens sidebar; swipe-left on
   * sidebar closes it. Only active at <=768px.
   */
  bindTouchGestures() {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const EDGE_ZONE = 30;
    const THRESHOLD = 50;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    document.addEventListener('touchstart', (e) => {
      if (window.innerWidth > 768) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      // Track if starting from left edge OR on the open sidebar
      tracking = startX <= EDGE_ZONE || sidebar.classList.contains('mobile-open');
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      // Prevent scrolling while sidebar is open
      if (sidebar.classList.contains('mobile-open') &&
          !sidebar.contains(e.target)) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!tracking || window.innerWidth > 768) return;
      tracking = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Ignore if vertical swipe is dominant
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (dx > THRESHOLD && !sidebar.classList.contains('mobile-open') && startX <= EDGE_ZONE) {
        // Swipe right from left edge → open
        this._openSidebar();
      } else if (dx < -THRESHOLD && sidebar.classList.contains('mobile-open')) {
        // Swipe left → close
        this._closeSidebar();
      }
    }, { passive: true });
  },

  /* ── Back to Top Button ────────────────────────────────── */

  /**
   * Show/hide the back-to-top button based on scroll position.
   * Smooth-scrolls to top on tap. Active on all viewports.
   */
  bindBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    const main = document.getElementById('main-content');
    const scrollTarget = main || window;
    const getScrollTop = () => main ? main.scrollTop : window.scrollY;

    const update = () => {
      btn.classList.toggle('visible', getScrollTop() > 300);
    };

    (main || window).addEventListener('scroll', update, { passive: true });
    update();

    btn.addEventListener('click', () => {
      if (main) {
        main.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
};
