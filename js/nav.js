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
  container: null,       // #nav-container element
  searchInput: null,     // #nav-search input element
  filterBtn: null,       // #sidebar-filter-btn button
  filterDropdown: null,  // #sidebar-filter-dropdown container
  navData: null,         // Parsed nav-data.json (array of parts)
  activeCategory: 'all', // Current category filter

  /* ── Chapter → Category mapping ──────────────────────── */
  CATEGORIES: {
    lore:         ['ch1','ch2','ch3','ch4'],
    factions:     ['ch5','ch6','ch7','ch8','ch9','ch10','ch11'],
    maps:         ['ch12','ch13','ch14','ch15','ch16'],
    combat:       ['ch17','ch18','ch19','ch20','ch21','ch22','ch23'],
    strategy:     ['ch24','ch25','ch26','ch27','ch28','ch29','ch30','ch31'],
    endgame:      ['ch32','ch33','ch34','ch35','ch36'],
    presentation: ['ch37','ch38','ch39','ch40','ch42','ch43-ai'],
    business:     ['ch43','ch44','ch45','ch46'],
    reference:    ['appA','appB','appC','appD','appE','appF','appL','appM','suppG','suppH','suppI','suppJ','suppK']
  },

  /* ── Initialization ──────────────────────────────────── */

  /**
   * Boot the sidebar: fetch nav data, render the tree, wire up
   * all event listeners, then navigate to the current URL hash.
   * @returns {Promise<void>}
   */
  async init() {
    this.container = document.getElementById('nav-container');
    this.searchInput = document.getElementById('nav-search');
    this.filterBtn = document.getElementById('sidebar-filter-btn');
    this.filterDropdown = document.getElementById('sidebar-filter-dropdown');
    this.navData = await DataLoader.loadNavData();

    this.render();
    this.bindSearch();
    this.bindCategoryFilter();
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
  render() {
    const cat = this.activeCategory;
    const catIds = (cat !== 'all' && this.CATEGORIES[cat]) ? new Set(this.CATEGORIES[cat]) : null;

    let html = '';
    for (const part of this.navData) {
      const chapters = catIds
        ? part.chapters.filter(ch => catIds.has(ch.id))
        : part.chapters;

      if (chapters.length === 0) continue;

      html += `<div class="nav-part">`;
      html += `<div class="nav-part-header" data-part="${part.part}">
        <span>${part.part}</span>
        <span class="chevron">▼</span>
      </div>`;
      html += `<div class="nav-part-chapters">`;
      for (const ch of chapters) {
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
   * Debounced input handler for the sidebar search box.
   * Shows inline search results when typing, restores nav tree when cleared.
   */
  bindSearch() {
    if (!this.searchInput) return;
    let timeout;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const q = this.searchInput.value.trim();
        if (q) {
          this._showSearchResults(q);
        } else {
          this.render(); // restore nav tree with current category filter
        }
      }, 150);
    });

    // Ctrl+K also focuses this input
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.searchInput.focus();
        this.searchInput.select();
      }
    });
  },

  /**
   * Show scored search results inline in the nav container.
   * Uses the same search engine as the Ctrl+K overlay.
   */
  _showSearchResults(query) {
    const scored = this._scoreChapters(query.toLowerCase());

    if (scored.length === 0) {
      this.container.innerHTML = `<div class="nav-empty">No results for "${query}"</div>`;
      return;
    }

    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    // Get snippets from search index if available
    const indexMap = new Map();
    if (Search._index) {
      for (const entry of Search._index) {
        indexMap.set(entry.id, entry);
      }
    }

    let html = '<div class="sidebar-search-results">';
    const shown = scored.slice(0, 25);

    for (const item of shown) {
      const entry = indexMap.get(item.id);
      let snippet = '';
      if (entry && entry.content) {
        const contentLc = entry.content.toLowerCase();
        const terms = [query.toLowerCase()];
        if (item.synonymHint) terms.push(item.synonymHint);

        for (const term of terms) {
          const idx = contentLc.indexOf(term);
          if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(entry.content.length, idx + term.length + 80);
            snippet = (start > 0 ? '...' : '') +
              entry.content.substring(start, end).replace(/\s+/g, ' ') +
              (end < entry.content.length ? '...' : '');
            break;
          }
        }
      }

      const title = `${item.num} — ${item.title}`;
      const synBadge = item.synonymHint
        ? `<span class="nav-syn-hint">via ${item.synonymHint}</span>`
        : '';
      const snippetHtml = snippet
        ? `<div class="sidebar-search-result-snippet">${snippet.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(re, '<mark>$1</mark>')}</div>`
        : '';

      html += `<a class="sidebar-search-result" href="#${item.id}">
        <div class="sidebar-search-result-title">${title.replace(re, '<mark>$1</mark>')}${synBadge}</div>
        ${snippetHtml}
      </a>`;
    }

    if (scored.length > 25) {
      html += `<div class="nav-empty">${scored.length - 25} more results...</div>`;
    }

    html += '</div>';
    this.container.innerHTML = html;

    // Click handlers — navigate and close search
    this.container.querySelectorAll('.sidebar-search-result').forEach(el => {
      el.addEventListener('click', () => {
        this.searchInput.value = '';
        // Restore nav tree after a short delay (let hash change fire first)
        setTimeout(() => this.render(), 100);
      });
    });
  },

  /**
   * Wire up the category filter button and dropdown.
   */
  bindCategoryFilter() {
    if (!this.filterBtn || !this.filterDropdown) return;

    // Toggle dropdown open/close
    this.filterBtn.addEventListener('click', () => {
      this.filterBtn.classList.toggle('open');
      this.filterDropdown.classList.toggle('open');
    });

    // Category option clicks
    this.filterDropdown.querySelectorAll('.filter-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        this.activeCategory = cat;

        // Update active state
        this.filterDropdown.querySelectorAll('.filter-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update button appearance
        const label = this.filterBtn.querySelector('.filter-label');
        if (cat === 'all') {
          label.textContent = 'Filter by Category';
          this.filterBtn.classList.remove('active');
        } else {
          label.textContent = btn.textContent;
          this.filterBtn.classList.add('active');
        }

        // Close dropdown and re-render
        this.filterBtn.classList.remove('open');
        this.filterDropdown.classList.remove('open');
        this.searchInput.value = '';
        this.render();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.filterBtn.contains(e.target) && !this.filterDropdown.contains(e.target)) {
        this.filterBtn.classList.remove('open');
        this.filterDropdown.classList.remove('open');
      }
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

    btn.addEventListener('click', () => {
      toggle();
      btn.classList.add('glitch');
      setTimeout(() => btn.classList.remove('glitch'), 200);
    });
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

    // Always scroll to top on any navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;
    content.scrollTop = 0;

    if (hash === 'dashboard' || hash === '') {
      // Reset title and remove any faction body class
      document.title = 'Ashes of Command: The Reclamation — Interactive GDD';
      document.body.classList.remove(
        'faction-terran', 'faction-shards', 'faction-horde',
        'faction-revenant', 'faction-accord', 'faction-vorax', 'faction-guardians'
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

/* Expose Nav globally for inline onclick handlers (dashboard cards, etc.) */
window.Nav = Nav;
