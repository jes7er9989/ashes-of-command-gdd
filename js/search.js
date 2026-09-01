/* ═══════════════════════════════════════════════════════════
   SEARCH — Intelligent Command-Palette Search (Ctrl+K)
   ───────────────────────────────────────────────────────────
   Part of: Ashes of Command: The Reclamation (PWA)
   Created: 2026-03-28 | Rewritten: 2026-03-29

   Full-text search with:
     - Weighted scoring (title > sections > content)
     - Synonym expansion (search "ending" → finds "resolution")
     - Content snippet extraction with match highlighting
     - Keyboard navigation (↑/↓/Enter/Escape)

   Key exports:
     Search.init()   → build index + wire up events
     Search.open()   → show search overlay
     Search.close()  → hide search overlay

   Dependencies:
     - DataLoader  (loads search-index.json + synonyms)
   ═══════════════════════════════════════════════════════════ */

const Search = {

  /* ── State ───────────────────────────────────────────── */
  overlay: null,
  input: null,
  resultsList: null,
  selectedIndex: -1,
  items: [],
  _index: null,        // Search index data (loaded once)
  _synonyms: null,     // Synonym map (loaded once)
  _factions: null,     // Faction data for unit/equip search
  _indexReady: false,

  /* ── Scoring Weights ─────────────────────────────────── */
  WEIGHT_TITLE:     100,   // Exact title match
  WEIGHT_SUBTITLE:   60,   // Subtitle match
  WEIGHT_SECTION:    40,   // Section heading match
  WEIGHT_CONTENT:    10,   // Body text match
  WEIGHT_UNIT:       50,   // Unit name match
  WEIGHT_EQUIP:      45,   // Equipment name match
  WEIGHT_FACTION:    70,   // Faction name/mechanic match
  WEIGHT_SYNONYM:     0.7, // Multiplier for synonym-expanded matches
  MAX_RESULTS:       30,

  /* ═══════════════════════════════════════════════════════
     INITIALIZATION
     ═══════════════════════════════════════════════════════ */

  init() {
    this.overlay = document.getElementById('search-overlay');
    this.input = document.getElementById('search-input');
    this.resultsList = document.getElementById('search-results');

    this.bindKeys();
    this.bindInput();
    this.bindOverlay();

    // Warm the search index (~500 KB) once the browser is idle rather than
    // during boot. search() already awaits _loadIndex() if the index is not
    // ready, so a query issued before this fires still works - it just waits.
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => this._loadIndex(), { timeout: 5000 });
    } else {
      setTimeout(() => this._loadIndex(), 2000);
    }
  },

  /** Load search index + synonyms via DataLoader (cached by worker) */
  async _loadIndex() {
    try {
      const [index, synonyms] = await Promise.all([
        DataLoader.load('data/search-index.json'),
        DataLoader.load('data/search-synonyms.json')
      ]);
      this._index = index;
      this._synonyms = synonyms;
      this._indexReady = true;
    } catch (e) {
      console.warn('[Search] Failed to load index:', e.message);
    }
  },

  /* ═══════════════════════════════════════════════════════
     EVENT BINDING
     ═══════════════════════════════════════════════════════ */

  bindKeys() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K now handled by Nav.bindSearch() — focuses sidebar search
      if (!this.isOpen()) return;

      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.moveSelection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.moveSelection(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.selectCurrent(); }
    });
  },

  bindInput() {
    if (!this.input) return;
    let timeout;
    this.input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => this.search(this.input.value.trim()), 120);
    });
  },

  bindOverlay() {
    if (!this.overlay) return;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  },

  /* ═══════════════════════════════════════════════════════
     OPEN / CLOSE
     ═══════════════════════════════════════════════════════ */

  isOpen() { return this.overlay && this.overlay.classList.contains('active'); },

  open() {
    if (!this.overlay) return;
    this.overlay.classList.add('active');
    this.input.value = '';
    this.input.focus();
    this.resultsList.innerHTML = '<div class="search-hint">Search chapters, units, equipment, factions...</div>';
    this.selectedIndex = -1;
    this.items = [];
    if (typeof AudioEngine !== 'undefined') AudioEngine.playAction('searchOpen');
  },

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
    this.input.value = '';
    this.resultsList.innerHTML = '';
    this.selectedIndex = -1;
    if (typeof AudioEngine !== 'undefined') AudioEngine.playAction('searchClose');
  },

  /* ═══════════════════════════════════════════════════════
     SYNONYM EXPANSION
     ═══════════════════════════════════════════════════════ */

  /**
   * Expand a query into the original + synonym terms.
   * @param {string} query - User's search text (lowercase)
   * @returns {Object} { primary: string, expanded: string[] }
   */
  _expandQuery(query) {
    if (!this._synonyms) return { primary: query, expanded: [] };

    const words = query.split(/\s+/);
    const expanded = new Set();

    for (const word of words) {
      if (this._synonyms[word]) {
        for (const syn of this._synonyms[word]) {
          expanded.add(syn.toLowerCase());
        }
      }
    }

    // Also check multi-word query as a whole
    if (this._synonyms[query]) {
      for (const syn of this._synonyms[query]) {
        expanded.add(syn.toLowerCase());
      }
    }

    // Remove the original query from expanded set
    expanded.delete(query);

    return { primary: query, expanded: [...expanded] };
  },

  /* ═══════════════════════════════════════════════════════
     HELPERS — fuzzy matching, de-duplication, themed colours
     ═══════════════════════════════════════════════════════ */

  MIN_QUERY_LEN: 2,

  /** Faction hexes as they appear in the index, mapped to theme tokens so
      result rows follow light/dark instead of pinning the dark value. */
  _COLOUR_TOKEN: {
    '#00b4ff': 'var(--terran)',   '#00ffee': 'var(--shards)',
    '#ff6622': 'var(--horde)',    '#aa77ff': 'var(--revenant)',
    '#44ff66': 'var(--accord)',   '#ff2266': 'var(--vorax)',
    '#ffaa22': 'var(--guardians)'
  },
  _themed(colour) {
    if (!colour) return '';
    return this._COLOUR_TOKEN[String(colour).trim().toLowerCase()] || colour;
  },

  /** Levenshtein distance, capped — we only care about small edits. */
  _editDistance(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 99;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[b.length];
  },

  /** Is `word` a plausible typo of `target`? Stricter on short words. */
  _isTypo(word, target) {
    if (word.length < 3 || target.length < 3) return false;
    const allowed = word.length <= 4 ? 1 : 2;
    return this._editDistance(word, target) <= allowed;
  },

  /**
   * Last-resort pass, only used when a strict search finds nothing.
   * Matches query words against chapter titles with a small edit budget,
   * so "terren league" and "vorrax" resolve instead of returning a blank.
   * @returns {Array} result objects flagged isFuzzy
   */
  _fuzzySearch(query) {
    if (!this._index) return [];
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    if (!words.length) return [];
    const hits = [];
    for (const entry of this._index) {
      if (typeof ChapterLoader !== 'undefined' && ChapterLoader.isHidden(entry.id)) continue;
      const haystack = ((entry.title || '') + ' ' + (entry.pageTitle || '')).toLowerCase();
      const targets = haystack.split(/[^a-z0-9]+/).filter(Boolean);
      let best = 0;
      for (const w of words) {
        for (const t of targets) {
          if (this._isTypo(w, t)) { best = Math.max(best, this.WEIGHT_TITLE * 0.5); }
        }
      }
      if (best > 0) {
        hits.push({
          type: 'Chapter', hash: '#' + entry.id, text: entry.title,
          snippet: entry.desc || entry.subtitle || '', score: best,
          color: entry.color, part: entry.part, isFuzzy: true
        });
      }
    }
    return hits.sort((a, b) => b.score - a.score);
  },

  /* ═══════════════════════════════════════════════════════
     SEARCH ENGINE
     ═══════════════════════════════════════════════════════ */

  async search(query) {
    if (!query || query.trim().length < this.MIN_QUERY_LEN) {
      /* One character matches almost everything and just produces noise. */
      this.resultsList.innerHTML = '<div class="search-hint">Search chapters, units, equipment, factions...</div>';
      this.items = [];
      this.selectedIndex = -1;
      return;
    }

    // Ensure index is loaded
    if (!this._indexReady) await this._loadIndex();

    const lc = query.toLowerCase();
    const { primary, expanded } = this._expandQuery(lc);
    const allTerms = [primary, ...expanded];
    const results = [];

    /* ── Search the content index (chapters) ─────────── */
    if (this._index) {
      for (const entry of this._index) {
        // Dev-only chapters must not surface in search while hidden
        if (ChapterLoader.isHidden(entry.id)) continue;
        let score = 0;
        let matchedTerm = primary;
        let snippet = '';
        let isSynonym = false;

        for (const term of allTerms) {
          const isExp = term !== primary;
          const mult = isExp ? this.WEIGHT_SYNONYM : 1.0;
          let termScore = 0;

          // Title match
          if (entry.title.toLowerCase().includes(term)) {
            termScore += this.WEIGHT_TITLE * mult;
          }
          if (entry.pageTitle && entry.pageTitle.toLowerCase().includes(term)) {
            termScore += this.WEIGHT_TITLE * 0.8 * mult;
          }

          // Subtitle match
          if (entry.subtitle && entry.subtitle.toLowerCase().includes(term)) {
            termScore += this.WEIGHT_SUBTITLE * mult;
          }

          // Section heading matches
          if (entry.sections) {
            let sectionHits = 0;
            for (const sec of entry.sections) {
              if (sec.toLowerCase().includes(term)) sectionHits++;
            }
            if (sectionHits > 0) {
              termScore += this.WEIGHT_SECTION * Math.min(sectionHits, 3) * mult;
            }
          }

          // Content match
          if (entry.content) {
            const contentLc = entry.content.toLowerCase();
            const idx = contentLc.indexOf(term);
            if (idx !== -1) {
              // Count occurrences (up to 10)
              let count = 0;
              let searchFrom = 0;
              while (count < 10) {
                const found = contentLc.indexOf(term, searchFrom);
                if (found === -1) break;
                count++;
                searchFrom = found + term.length;
              }
              termScore += this.WEIGHT_CONTENT * Math.min(count, 5) * mult;

              // Extract snippet around first match
              if (!snippet || !isExp) {
                const start = Math.max(0, idx - 60);
                const end = Math.min(entry.content.length, idx + term.length + 100);
                snippet = (start > 0 ? '...' : '') +
                  entry.content.substring(start, end).replace(/\s+/g, ' ') +
                  (end < entry.content.length ? '...' : '');
              }
            }
          }

          if (termScore > score) {
            score = termScore;
            matchedTerm = term;
            isSynonym = isExp;
          }
        }

        if (score > 0) {
          results.push({
            type: 'Chapter',
            text: `${entry.num} — ${entry.title}`,
            hash: entry.id,
            score,
            snippet,
            color: entry.color,
            part: entry.part,
            isSynonym,
            matchedTerm
          });
        }
      }
    }

    /* ── Search factions ────────────────────────────────── */
    try {
      const factions = await DataLoader.loadFactions();
      for (const f of factions) {
        let score = 0;
        for (const term of allTerms) {
          const mult = term !== primary ? this.WEIGHT_SYNONYM : 1.0;
          if (f.name.toLowerCase().includes(term)) score = Math.max(score, this.WEIGHT_FACTION * mult);
          if (f.subtitle && f.subtitle.toLowerCase().includes(term)) score = Math.max(score, this.WEIGHT_FACTION * 0.8 * mult);
          if (f.mechanic && f.mechanic.toLowerCase().includes(term)) score = Math.max(score, this.WEIGHT_FACTION * 0.6 * mult);
        }
        if (score > 0) {
          results.push({
            type: 'Faction',
            text: `${f.name} — ${f.subtitle || ''}`,
            hash: f.chapterId,
            score,
            snippet: f.mechanic || '',
            color: f.color
          });
        }
      }
    } catch (e) { /* skip */ }

    /* ── Search units ───────────────────────────────────── */
    for (const key of DataLoader.FACTION_KEYS) {
      try {
        const units = await DataLoader.loadFactionUnits(key);
        if (!Array.isArray(units)) continue;
        for (const u of units) {
          const name = (u.name || u.unit || '').toLowerCase();
          let score = 0;
          for (const term of allTerms) {
            const mult = term !== primary ? this.WEIGHT_SYNONYM : 1.0;
            if (name.includes(term)) score = Math.max(score, this.WEIGHT_UNIT * mult);
          }
          if (score > 0) {
            const factionName = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            results.push({
              type: 'Unit',
              text: u.name || u.unit,
              hash: key.split('-')[0],
              score,
              snippet: factionName
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    /* ── Search equipment ───────────────────────────────── */
    for (const key of DataLoader.FACTION_KEYS) {
      try {
        const equip = await DataLoader.loadFactionEquipment(key);
        if (!Array.isArray(equip)) continue;
        for (const item of equip) {
          const name = (item.name || item.equipment || '').toLowerCase();
          let score = 0;
          for (const term of allTerms) {
            const mult = term !== primary ? this.WEIGHT_SYNONYM : 1.0;
            if (name.includes(term)) score = Math.max(score, this.WEIGHT_EQUIP * mult);
          }
          if (score > 0) {
            const factionName = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            results.push({
              type: 'Equip',
              text: item.name || item.equipment,
              hash: key.split('-')[0],
              score,
              snippet: factionName
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    /* ── Sort by score (highest first) and cap ──────────── */
    results.sort((a, b) => b.score - a.score);

    // Filter out dev-mode-only chapters when dev mode is inactive
    const devOnly = typeof ChapterLoader !== 'undefined'
      ? ChapterLoader.DEV_ONLY_CHAPTERS : [];
    const devActive = document.body.classList.contains('dev-mode-active');
    const filtered = (devOnly.length && !devActive)
      ? results.filter(r => !devOnly.includes(r.hash))
      : results;

    /* One chapter can match on several sections and eat multiple slots.
       Keep its best-scoring hit only; Unit/Equip/Faction rows are left
       alone because they are genuinely distinct entities. */
    const seenChapter = new Set();
    const deduped = filtered.filter(r => {
      /* Chapter and Faction rows both navigate to a chapter, so two of
         them for the same target are two ways of saying one thing. Unit
         and Equip rows are distinct entities and are left alone. */
      if (r.type !== 'Chapter' && r.type !== 'Faction') return true;
      const base = String(r.hash || '').replace('#', '').split('-')[0];
      if (seenChapter.has(base)) return false;
      seenChapter.add(base);
      return true;
    });

    /* Nothing matched — try again allowing small spelling errors. */
    const finalResults = deduped.length ? deduped : this._fuzzySearch(query);

    this.items = finalResults.slice(0, this.MAX_RESULTS);
    this.selectedIndex = this.items.length > 0 ? 0 : -1;
    this.renderResults(query);
  },

  /* ═══════════════════════════════════════════════════════
     RESULTS RENDERING
     ═══════════════════════════════════════════════════════ */

  renderResults(query) {
    if (this.items.length === 0) {
      this.resultsList.innerHTML = `<div class="search-empty">No results for "${this.escapeHtml(query)}"</div>`;
      return;
    }

    const re = new RegExp(`(${this.escapeRegex(query)})`, 'gi');

    this.resultsList.innerHTML = this.items.map((item, i) => {
      const typeClass = item.type.toLowerCase();
      const colorStyle = item.color ? ` style="color:${this._themed(item.color)}"` : '';
      const synonymBadge = item.isSynonym
        ? `<span class="search-synonym-badge">via "${this.escapeHtml(item.matchedTerm)}"</span>`
        : (item.isFuzzy ? '<span class="search-synonym-badge">closest match</span>' : '');
      const snippetHtml = item.snippet
        ? `<div class="search-snippet">${this.escapeHtml(item.snippet).replace(re, '<mark>$1</mark>')}</div>`
        : '';
      const partHtml = item.part
        ? `<span class="search-part">${this.escapeHtml(item.part)}</span>`
        : '';

      return `
        <div class="search-result-item${i === this.selectedIndex ? ' selected' : ''}" data-index="${i}">
          <div class="search-result-header">
            <span class="result-type result-type-${typeClass}"${colorStyle}>${item.type}</span>
            <span class="result-text">${item.text.replace(re, '<mark>$1</mark>')}</span>
            ${synonymBadge}
          </div>
          ${snippetHtml}
          ${partHtml}
        </div>`;
    }).join('');

    this.resultsList.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedIndex = parseInt(el.dataset.index);
        this.selectCurrent();
      });
    });
  },

  /* ═══════════════════════════════════════════════════════
     KEYBOARD NAVIGATION
     ═══════════════════════════════════════════════════════ */

  moveSelection(dir) {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + dir + this.items.length) % this.items.length;
    this.resultsList.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
    const selected = this.resultsList.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  },

  selectCurrent() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.items.length) return;
    const item = this.items[this.selectedIndex];
    this.close();
    if (item.hash) location.hash = '#' + item.hash;
    if (typeof AudioEngine !== 'undefined') AudioEngine.playAction('searchResult');
  },

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};
