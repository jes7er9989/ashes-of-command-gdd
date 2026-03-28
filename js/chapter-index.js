/* ═══════════════════════════════════════════════════════════
   CHAPTER INDEX — Full Document Index Overlay
   ───────────────────────────────────────────────────────────
   Builds a full collapsible tree of Parts > Chapters from
   nav-data.json and renders it in a searchable full-screen
   dark overlay. Adds a toggle button above the sidebar
   filter input. Highlights the current chapter in the tree.

   Key exports:
     ChapterIndex.init()    → build UI, bind events
     ChapterIndex.destroy() → remove UI, unbind events

   Dependencies:
     - DataLoader  (loads nav-data.json)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   init()                    | Build overlay + toggle button, bind events
   destroy()                 | Remove all DOM elements and listeners
   _buildOverlay()           | Create the overlay DOM structure
   _buildToggleButton()      | Create the sidebar toggle button
   _buildTree(data, filter)  | Render the collapsible part/chapter tree
   _bindEvents()             | Wire up keyboard, click, and hash listeners
   _unbindEvents()           | Remove all event listeners
   _open()                   | Show the index overlay
   _close()                  | Hide the index overlay
   _isOpen()                 | Check if overlay is currently visible
   _onHashChange()           | Update highlighted chapter on navigation
   _highlightCurrent()       | Apply .active to current chapter link
   _onFilterInput()          | Handle search input within the overlay
   _onKeyDown(e)             | Keyboard handler (Escape to close)
   _onOverlayClick(e)        | Close when clicking backdrop
   _escapeHtml(s)            | Sanitize strings for safe HTML insertion
   ═══════════════════════════════════════════════════════════ */

const ChapterIndex = {

  /* ── State ── */
  overlay: null,        // .chapter-index-overlay element
  toggleBtn: null,      // Sidebar toggle button element
  filterInput: null,    // Search input inside the overlay
  navData: null,        // Cached nav-data.json
  _boundKeyDown: null,  // Bound keydown handler for cleanup
  _boundHashChange: null, // Bound hashchange handler for cleanup

  // ───────────────────────────────────────────
  // SECTION: Initialization
  // ───────────────────────────────────────────

  /**
   * Build the overlay and toggle button, load nav data, and bind all
   * event listeners. Called once during the boot sequence.
   * @returns {Promise<void>}
   */
  async init() {
    this.navData = await DataLoader.loadNavData();

    this._buildOverlay();
    this._buildToggleButton();
    this._bindEvents();
  },

  /**
   * Remove all DOM elements and event listeners. Safe to call
   * multiple times; silently no-ops if not initialized.
   */
  destroy() {
    this._unbindEvents();

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.toggleBtn && this.toggleBtn.parentNode) {
      this.toggleBtn.parentNode.removeChild(this.toggleBtn);
    }

    this.overlay = null;
    this.toggleBtn = null;
    this.filterInput = null;
    this.navData = null;
  },

  // ───────────────────────────────────────────
  // SECTION: DOM Construction
  // ───────────────────────────────────────────

  /**
   * Create the full-screen overlay element and append it to <body>.
   * Contains a search input and the scrollable chapter tree.
   */
  _buildOverlay() {
    const el = document.createElement('div');
    el.className = 'chapter-index-overlay';
    el.id = 'chapter-index-overlay';

    el.innerHTML = `
      <div class="chapter-index-panel">
        <div class="chapter-index-header">
          <span class="chapter-index-title">DOCUMENT INDEX</span>
          <button class="chapter-index-close" aria-label="Close index">&times;</button>
        </div>
        <div class="chapter-index-search">
          <input type="text" id="chapter-index-filter" placeholder="Search chapters..." autocomplete="off" spellcheck="false">
        </div>
        <div class="chapter-index-tree" id="chapter-index-tree"></div>
      </div>
    `;

    document.body.appendChild(el);
    this.overlay = el;
    this.filterInput = el.querySelector('#chapter-index-filter');

    // Render initial tree
    this._buildTree(this.navData, '');
    this._highlightCurrent();

    // Close button
    el.querySelector('.chapter-index-close').addEventListener('click', () => this._close());
  },

  /**
   * Create the toggle button and insert it above the sidebar
   * filter input (inside .sidebar-filter, before the input).
   */
  _buildToggleButton() {
    const sidebarFilter = document.querySelector('.sidebar-filter');
    if (!sidebarFilter) return;

    const btn = document.createElement('button');
    btn.className = 'chapter-index-toggle';
    btn.id = 'chapter-index-toggle';
    btn.setAttribute('aria-label', 'Open document index');
    btn.title = 'Full Document Index';
    btn.innerHTML = '<span class="chapter-index-toggle-icon">☰</span> INDEX';

    btn.addEventListener('click', () => {
      if (this._isOpen()) {
        this._close();
      } else {
        this._open();
      }
    });

    // Insert before the filter input
    sidebarFilter.insertBefore(btn, sidebarFilter.firstChild);
    this.toggleBtn = btn;
  },

  /**
   * Render the collapsible part/chapter tree into the overlay container.
   * @param {Array} data - The nav-data.json array of parts
   * @param {string} filter - Optional search filter string
   */
  _buildTree(data, filter) {
    const container = document.getElementById('chapter-index-tree');
    if (!container || !data) return;

    const lc = filter.toLowerCase();
    let html = '';

    for (const part of data) {
      const chapters = part.chapters.filter(ch =>
        !lc || ch.title.toLowerCase().includes(lc) || ch.num.toLowerCase().includes(lc)
      );

      // Skip empty parts when filtering
      if (lc && chapters.length === 0) continue;

      html += `<div class="ci-part">`;
      html += `<div class="ci-part-header" data-part="${this._escapeHtml(part.part)}">`;
      html += `<span class="ci-chevron">▼</span>`;
      html += `<span class="ci-part-label">${this._escapeHtml(part.part)}</span>`;
      html += `<span class="ci-part-count">${chapters.length}</span>`;
      html += `</div>`;
      html += `<div class="ci-chapters">`;

      for (const ch of chapters) {
        const colorAttr = ch.color ? ` style="--ci-color:${ch.color}"` : '';
        html += `<a class="ci-chapter" href="#${ch.id}" data-id="${ch.id}"${colorAttr}>`;
        html += `<span class="ci-num">${this._escapeHtml(ch.num)}</span>`;
        html += `<span class="ci-title">${this._escapeHtml(ch.title)}</span>`;
        html += `</a>`;
      }

      html += `</div></div>`;
    }

    if (!html) {
      html = `<div class="ci-empty">No chapters match "${this._escapeHtml(filter)}"</div>`;
    }

    container.innerHTML = html;

    // Bind collapse toggles on part headers
    container.querySelectorAll('.ci-part-header').forEach(header => {
      header.addEventListener('click', () => {
        const chaptersEl = header.nextElementSibling;
        const isCollapsed = header.classList.toggle('collapsed');
        if (isCollapsed) {
          chaptersEl.classList.add('collapsed');
        } else {
          chaptersEl.classList.remove('collapsed');
        }
      });
    });

    // Bind chapter clicks to navigate and close
    container.querySelectorAll('.ci-chapter').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.dataset.id;
        this._close();
        location.hash = '#' + id;
      });
    });
  },

  // ───────────────────────────────────────────
  // SECTION: Event Binding
  // ───────────────────────────────────────────

  /**
   * Wire up keyboard, overlay click, hash change, and filter
   * input event listeners.
   */
  _bindEvents() {
    this._boundKeyDown = (e) => this._onKeyDown(e);
    this._boundHashChange = () => this._onHashChange();

    document.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('hashchange', this._boundHashChange);

    // Overlay backdrop click
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => this._onOverlayClick(e));
    }

    // Filter input
    if (this.filterInput) {
      let timeout;
      this.filterInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => this._onFilterInput(), 150);
      });
    }
  },

  /**
   * Remove all bound event listeners. Called by destroy().
   */
  _unbindEvents() {
    if (this._boundKeyDown) {
      document.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
    if (this._boundHashChange) {
      window.removeEventListener('hashchange', this._boundHashChange);
      this._boundHashChange = null;
    }
  },

  // ───────────────────────────────────────────
  // SECTION: Open / Close
  // ───────────────────────────────────────────

  /**
   * Show the index overlay and focus the search input.
   */
  _open() {
    if (!this.overlay) return;
    this.overlay.classList.add('active');
    this._highlightCurrent();
    if (this.filterInput) {
      this.filterInput.value = '';
      this.filterInput.focus();
    }
    // Re-render full tree in case filter was active
    this._buildTree(this.navData, '');
    this._highlightCurrent();
  },

  /**
   * Hide the index overlay and reset filter state.
   */
  _close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
  },

  /**
   * Check whether the index overlay is currently visible.
   * @returns {boolean}
   */
  _isOpen() {
    return this.overlay && this.overlay.classList.contains('active');
  },

  // ───────────────────────────────────────────
  // SECTION: Event Handlers
  // ───────────────────────────────────────────

  /**
   * Update the highlighted chapter when the URL hash changes.
   */
  _onHashChange() {
    this._highlightCurrent();
  },

  /**
   * Apply .active class to the chapter link matching the current
   * URL hash. Scrolls the active link into view within the tree.
   */
  _highlightCurrent() {
    if (!this.overlay) return;
    const hash = location.hash.slice(1) || 'dashboard';

    this.overlay.querySelectorAll('.ci-chapter').forEach(el => {
      const isActive = el.dataset.id === hash;
      el.classList.toggle('active', isActive);

      // Apply faction color to active item border
      if (isActive && el.style.getPropertyValue('--ci-color')) {
        el.style.borderLeftColor = el.style.getPropertyValue('--ci-color');
      } else if (!isActive) {
        el.style.borderLeftColor = '';
      }

      // Scroll active item into view
      if (isActive) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    });
  },

  /**
   * Handle search input: re-render the tree filtered by the
   * current input value.
   */
  _onFilterInput() {
    if (!this.filterInput || !this.navData) return;
    const filter = this.filterInput.value.trim();
    this._buildTree(this.navData, filter);
    this._highlightCurrent();
  },

  /**
   * Keyboard handler: Escape closes the overlay.
   * @param {KeyboardEvent} e - The keydown event
   */
  _onKeyDown(e) {
    if (e.key === 'Escape' && this._isOpen()) {
      e.preventDefault();
      this._close();
    }
  },

  /**
   * Close overlay when clicking the dark backdrop (not the panel).
   * @param {MouseEvent} e - The click event
   */
  _onOverlayClick(e) {
    if (e.target === this.overlay) {
      this._close();
    }
  },

  // ───────────────────────────────────────────
  // SECTION: Helpers
  // ───────────────────────────────────────────

  /**
   * Escape HTML special characters to prevent injection.
   * @param {string} s - Raw string
   * @returns {string} HTML-safe string
   */
  _escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
