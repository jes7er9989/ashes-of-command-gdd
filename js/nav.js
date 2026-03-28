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
    let html = '';

    for (const part of this.navData) {
      const chapters = part.chapters.filter(ch =>
        !lc || ch.title.toLowerCase().includes(lc) || ch.num.toLowerCase().includes(lc)
      );

      if (lc && chapters.length === 0) continue;

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
   * Mobile hamburger menu: toggles sidebar visibility and the
   * dark overlay behind it. Also auto-closes on chapter click.
   */
  bindHamburger() {
    const btn = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (!btn || !sidebar) return;

    const toggle = () => {
      btn.classList.toggle('open');
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    };

    btn.addEventListener('click', toggle);
    if (overlay) overlay.addEventListener('click', toggle);

    // Auto-close sidebar when a chapter link is tapped on mobile
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.nav-chapter') && window.innerWidth <= 768) {
        btn.classList.remove('open');
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      }
    });
  },

  /**
   * Listen for hash changes to trigger page navigation.
   */
  bindRouting() {
    window.addEventListener('hashchange', () => this.onHashChange());
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
  }
};
