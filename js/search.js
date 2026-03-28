/* ═══════════════════════════════════════════════════════════
   SEARCH — Global Command-Palette Search (Ctrl+K / Cmd+K)
   ───────────────────────────────────────────────────────────
   Full-text search overlay that queries chapters, factions,
   units, and equipment from the DataLoader cache. Supports
   keyboard navigation (↑/↓/Enter/Escape).

   Key exports:
     Search.init()   → wire up keyboard shortcuts & DOM refs
     Search.open()   → show the search overlay
     Search.close()  → hide the search overlay

   Dependencies:
     - DataLoader  (provides all searchable data)
   ═══════════════════════════════════════════════════════════ */

const Search = {
  overlay: null,       // .search-overlay element
  input: null,         // #search-input element
  resultsList: null,   // #search-results container
  selectedIndex: -1,   // Currently highlighted result (-1 = none)
  items: [],           // Current result set

  /* ── Initialization ──────────────────────────────────── */

  /**
   * Cache DOM references and bind all event listeners.
   * Called once during the boot sequence in index.html.
   */
  init() {
    this.overlay = document.getElementById('search-overlay');
    this.input = document.getElementById('search-input');
    this.resultsList = document.getElementById('search-results');

    this.bindKeys();
    this.bindInput();
    this.bindOverlay();
  },

  /* ── Event Binding ───────────────────────────────────── */

  /**
   * Global keyboard handler: Ctrl/Cmd+K opens search;
   * Escape, Arrow keys, and Enter navigate within it.
   */
  bindKeys() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
        return;
      }

      if (!this.isOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectCurrent();
      }
    });
  },

  /**
   * Debounced input handler — triggers a search 100ms after
   * the user stops typing.
   */
  bindInput() {
    if (!this.input) return;
    let timeout;
    this.input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => this.search(this.input.value.trim()), 100);
    });
  },

  /**
   * Close the overlay when the user clicks outside the search box.
   */
  bindOverlay() {
    if (!this.overlay) return;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  },

  /* ── Open / Close ────────────────────────────────────── */

  /**
   * Check whether the search overlay is currently visible.
   * @returns {boolean}
   */
  isOpen() {
    return this.overlay && this.overlay.classList.contains('active');
  },

  /**
   * Show the search overlay, clear previous state, and focus the input.
   */
  open() {
    if (!this.overlay) return;
    this.overlay.classList.add('active');
    this.input.value = '';
    this.input.focus();
    this.resultsList.innerHTML = '';
    this.selectedIndex = -1;
    this.items = [];
  },

  /**
   * Hide the search overlay and reset all state.
   */
  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
    this.input.value = '';
    this.resultsList.innerHTML = '';
    this.selectedIndex = -1;
  },

  /* ── Search Logic ────────────────────────────────────── */

  /**
   * Run a search across all data sources and display results.
   * Searches chapters, factions, units, and equipment in that order.
   * Results are capped at 30 items.
   * @param {string} query - The user's search text
   * @returns {Promise<void>}
   */
  async search(query) {
    if (!query) {
      this.resultsList.innerHTML = '';
      this.items = [];
      this.selectedIndex = -1;
      return;
    }

    const lc = query.toLowerCase();
    const results = [];

    // ── Search nav chapters ──
    try {
      const navData = await DataLoader.loadNavData();
      for (const part of navData) {
        for (const ch of part.chapters) {
          if (ch.title.toLowerCase().includes(lc) || ch.num.toLowerCase().includes(lc)) {
            results.push({ type: 'Chapter', text: `${ch.num} — ${ch.title}`, hash: ch.id });
          }
        }
      }
    } catch (e) { /* skip */ }

    // ── Search factions ──
    try {
      const factions = await DataLoader.loadFactions();
      for (const f of factions) {
        if (f.name.toLowerCase().includes(lc) || f.subtitle.toLowerCase().includes(lc) ||
            f.mechanic.toLowerCase().includes(lc)) {
          results.push({ type: 'Faction', text: `${f.name} — ${f.subtitle}`, hash: f.chapterId, color: f.color });
        }
      }
    } catch (e) { /* skip */ }

    // ── Search units (per-faction) ──
    for (const key of DataLoader.FACTION_KEYS) {
      try {
        const units = await DataLoader.loadFactionUnits(key);
        if (Array.isArray(units)) {
          for (const u of units) {
            const name = u.name || u.unit || '';
            if (name.toLowerCase().includes(lc)) {
              results.push({ type: 'Unit', text: name, hash: key.split('-')[0] });
            }
          }
        }
      } catch (e) { /* skip */ }
    }

    // ── Search equipment (per-faction) ──
    for (const key of DataLoader.FACTION_KEYS) {
      try {
        const equip = await DataLoader.loadFactionEquipment(key);
        if (Array.isArray(equip)) {
          for (const item of equip) {
            const name = item.name || item.equipment || '';
            if (name.toLowerCase().includes(lc)) {
              results.push({ type: 'Equip', text: name, hash: key.split('-')[0] });
            }
          }
        }
      } catch (e) { /* skip */ }
    }

    // Cap at 30 results to keep the UI responsive
    this.items = results.slice(0, 30);
    this.selectedIndex = this.items.length > 0 ? 0 : -1;
    this.renderResults(query);
  },

  /* ── Results Rendering ───────────────────────────────── */

  /**
   * Render the current result set into the results container.
   * Highlights matching text via <mark> tags.
   * @param {string} query - Original query (for highlighting)
   */
  renderResults(query) {
    if (this.items.length === 0) {
      this.resultsList.innerHTML = `<div class="search-empty">No results for "${this.escapeHtml(query)}"</div>`;
      return;
    }

    const re = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    this.resultsList.innerHTML = this.items.map((item, i) => `
      <div class="search-result-item${i === this.selectedIndex ? ' selected' : ''}" data-index="${i}">
        <span class="result-type"${item.color ? ` style="color:${item.color}"` : ''}>${item.type}</span>
        <span class="result-text">${item.text.replace(re, '<mark>$1</mark>')}</span>
      </div>
    `).join('');

    this.resultsList.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedIndex = parseInt(el.dataset.index);
        this.selectCurrent();
      });
    });
  },

  /* ── Keyboard Navigation ─────────────────────────────── */

  /**
   * Move the highlighted selection up or down, wrapping around.
   * @param {number} dir - Direction: +1 for down, -1 for up
   */
  moveSelection(dir) {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + dir + this.items.length) % this.items.length;
    this.resultsList.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
    // Keep the selected item visible in the scrollable list
    const selected = this.resultsList.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  },

  /**
   * Navigate to the currently highlighted result and close search.
   */
  selectCurrent() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.items.length) return;
    const item = this.items[this.selectedIndex];
    this.close();
    if (item.hash) {
      location.hash = '#' + item.hash;
    }
  },

  /* ── Helpers ─────────────────────────────────────────── */

  /**
   * Escape HTML special characters to prevent XSS in result display.
   * @param {string} s - Raw string
   * @returns {string} HTML-safe string
   */
  escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /**
   * Escape regex special characters so user input can be used in RegExp.
   * @param {string} s - Raw string
   * @returns {string} Regex-safe string
   */
  escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};
