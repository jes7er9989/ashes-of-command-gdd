/* ═══════════════════════════════════════════════════════════
   GLOSSARY — Auto-Linking Glossary Terms in Chapter Content
   ───────────────────────────────────────────────────────────
   After a chapter loads, scans text nodes for glossary terms
   defined in Appendix F and wraps matches in <span> elements
   with tooltip definitions. Clicking a term navigates to the
   glossary appendix (#appF).

   Key exports:
     Glossary.init(contentEl)  → scan and link terms in contentEl

   Dependencies:
     - None (self-contained; glossary terms are embedded)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   init(contentEl)            | Scan content element and link glossary terms
   _getTerms()                | Return the glossary term/definition array
   _buildRegex(terms)         | Build a single regex matching all terms
   _walkTextNodes(root, fn)   | Iterate text nodes in a subtree
   _shouldSkip(node)          | Check if a node is inside a heading/code/link
   _wrapMatches(textNode, re) | Replace matching text with glossary spans
   _escapeRegex(s)            | Escape regex special characters
   _escapeHtml(s)             | Escape HTML special characters
   ═══════════════════════════════════════════════════════════ */

const Glossary = {

  /** Cached regex built from glossary terms */
  _regex: null,

  /** Cached map of lowercase term → definition */
  _defMap: null,

  // ───────────────────────────────────────────
  // SECTION: Initialization
  // ───────────────────────────────────────────

  /**
   * Scan a content element for glossary terms and wrap matches
   * in interactive <span> elements with tooltip definitions.
   * Safe to call repeatedly (e.g. on each chapter load).
   * @param {HTMLElement} contentEl - The content container to scan
   */
  init(contentEl) {
    if (!contentEl) return;

    // Build regex and definition map on first call
    if (!this._regex) {
      const terms = this._getTerms();
      this._regex = this._buildRegex(terms);
      this._defMap = {};
      for (const [term, def] of terms) {
        this._defMap[term.toLowerCase()] = def;
      }
    }

    // Collect text nodes first, then modify (avoids live NodeList issues)
    const textNodes = [];
    this._walkTextNodes(contentEl, (node) => {
      if (!this._shouldSkip(node)) {
        textNodes.push(node);
      }
    });

    // Process each text node for matches
    for (const node of textNodes) {
      this._wrapMatches(node, this._regex);
    }
  },

  // ───────────────────────────────────────────
  // SECTION: Glossary Data
  // ───────────────────────────────────────────

  /**
   * Return the full glossary term/definition array.
   * Sourced from Appendix F of the GDD.
   * @returns {Array<[string, string]>} Array of [term, definition] pairs
   */
  _getTerms() {
    return [
      ['Auto-Battle',         'Real-time combat where units fight autonomously; player intervenes via CP abilities'],
      ['Biomass',             'The Vorax sole resource, gained by consuming organic and inorganic matter'],
      ['Celestial Construct', 'Guardian megastructures (Dyson Spheres, Ringworlds, Hard-Light Citadels)'],
      ['Command Point',       'Resource spent on targeted abilities during auto-battles. Max 10, Starting 3, Regen 1/30s (Accord: 1/26s)'],
      ['Containment Failure', 'Core Guardian Volatile Death \u2014 energy release on destruction; radius and chain risk vary by unit type'],
      ['Creep',               'Vorax organic terrain covering conquered territory (\u221230% enemy speed, +2% Vorax HP/sec)'],
      ['Cycle',               'One abstract turn of the galactic strategic clock'],
      ['Decanting',           'Process of activating a new Commander clone, construct, or equivalent depending on faction'],
      ['Exclusion Zone',      'Core Guardian-controlled space around the Nexus Primordial (sys-nexus)'],
      ['Hive Node',           'Vorax processing facility grown on consumed planets; anchors Tendril presence'],
      ['Marked Target',       'Unity Accord Tactical Link \u2014 +15% accuracy bonus applied on first hit; propagates to all Accord units in range'],
      ['Nexus Primordial',    'The star system at the galactic center (sys-nexus) housing the Reclamation Engine \u2014 the campaign win objective'],
      ['Phase Blink',         'Eternal Shards auto-dodge \u2014 12% base chance to flicker out of reality, negating the hit'],
      ['Procedural Destiny',  'System where Commander Alignment shapes the Final War galaxy generation and ending outcomes'],
      ['Reanimation',         'Necro-Legion ability \u2014 15% base chance destroyed units self-repair and return after 5s (upgradeable)'],
      ['Scrap Stack',         'Scrap-Horde buff from any death within 150px \u2014 +3% armor +2% dmg per stack; cap 0.75; resets each battle'],
      ['Stat Application Order', 'base stats \u2192 equipment mods \u2192 supply penalty \u2192 space combat ground mod \u2192 rank mods (canonical, locked)'],
      ['Synapse',             'Vorax command organism \u2014 destroying all Synapses in range triggers Frenzy state in remaining units'],
      ['Tendril',             'A Vorax hive-fleet that enters from the galaxy edge; anchored by its Hive-Ship'],
      ['The Archive',         'Cross-run meta-progression storage persisting across simulation runs (localStorage key: aoc_archive)'],
      ['Volatile Death',      'Core Guardian explosion on unit death \u2014 damages everything nearby, chains to adjacent Guardian units'],
      ['Warden-Commander',    'Core Guardian spokesperson and interface entity for diplomatic contact attempts'],
      ['Wreckage Salvage',    'Scrap-Horde faction passive \u2014 all deaths within 150px fuel survivors with Scrap Stacks'],
    ];
  },

  // ───────────────────────────────────────────
  // SECTION: Regex Construction
  // ───────────────────────────────────────────

  /**
   * Build a single regex that matches any glossary term at word
   * boundaries. Terms are sorted longest-first so longer phrases
   * match before shorter substrings.
   * @param {Array<[string, string]>} terms - The glossary term array
   * @returns {RegExp} Compiled regex with global and case-insensitive flags
   */
  _buildRegex(terms) {
    // Sort longest-first to prioritize longer matches
    const sorted = terms
      .map(([t]) => t)
      .sort((a, b) => b.length - a.length);

    const pattern = sorted.map(t => this._escapeRegex(t)).join('|');
    return new RegExp(`\\b(${pattern})\\b`, 'gi');
  },

  // ───────────────────────────────────────────
  // SECTION: DOM Walking
  // ───────────────────────────────────────────

  /**
   * Walk all text nodes in a subtree, calling fn for each.
   * Skips nodes inside elements that already have glossary spans.
   * @param {Node} root - Root element to walk
   * @param {Function} fn - Callback receiving each text node
   */
  _walkTextNodes(root, fn) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    // Call fn after collecting to avoid mutating during walk
    for (const node of nodes) {
      fn(node);
    }
  },

  /**
   * Check if a text node should be skipped (inside headings,
   * code blocks, links, or already-wrapped glossary terms).
   * @param {Node} node - The text node to check
   * @returns {boolean} True if the node should be skipped
   */
  _shouldSkip(node) {
    let el = node.parentElement;
    while (el) {
      const tag = el.tagName;
      // Skip headings
      if (tag === 'H1' || tag === 'H2' || tag === 'H3' ||
          tag === 'H4' || tag === 'H5' || tag === 'H6') {
        return true;
      }
      // Skip code blocks
      if (tag === 'CODE' || tag === 'PRE') return true;
      // Skip links
      if (tag === 'A') return true;
      // Skip already-wrapped glossary terms
      if (el.classList && el.classList.contains('glossary-term')) return true;
      // Skip buttons and inputs
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') return true;
      // Skip page titles and section labels
      if (el.classList && (el.classList.contains('page-title') ||
          el.classList.contains('page-subtitle') ||
          el.classList.contains('section-label') ||
          el.classList.contains('section-heading') ||
          el.classList.contains('nav-chapter') ||
          el.classList.contains('ch-num'))) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  },

  // ───────────────────────────────────────────
  // SECTION: Term Wrapping
  // ───────────────────────────────────────────

  /**
   * Replace glossary term matches in a text node with interactive
   * <span class="glossary-term"> elements. Each span has a
   * data-definition attribute for the CSS tooltip and a click
   * handler that navigates to #appF.
   * @param {Text} textNode - The text node to process
   * @param {RegExp} re - The glossary term regex
   */
  _wrapMatches(textNode, re) {
    const text = textNode.nodeValue;
    if (!text || text.trim().length === 0) return;

    // Reset regex lastIndex for global matching
    re.lastIndex = 0;

    // Check if there are any matches at all
    if (!re.test(text)) return;
    re.lastIndex = 0;

    // Build a document fragment with text and glossary spans
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = re.exec(text)) !== null) {
      const matchedText = match[0];
      const def = this._defMap[matchedText.toLowerCase()];
      if (!def) continue;

      // Add text before the match
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      // Create glossary span
      const span = document.createElement('span');
      span.className = 'glossary-term';
      span.setAttribute('data-definition', def);
      span.textContent = matchedText;
      span.addEventListener('click', () => {
        location.hash = '#appF';
      });

      frag.appendChild(span);
      lastIndex = match.index + matchedText.length;
    }

    // Only replace if we found matches
    if (lastIndex === 0) return;

    // Add remaining text after last match
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    // Replace the original text node with the fragment
    textNode.parentNode.replaceChild(frag, textNode);
  },

  // ───────────────────────────────────────────
  // SECTION: Helpers
  // ───────────────────────────────────────────

  /**
   * Escape regex special characters so terms can be used in RegExp.
   * @param {string} s - Raw string
   * @returns {string} Regex-safe string
   */
  _escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * Escape HTML special characters to prevent injection.
   * @param {string} s - Raw string
   * @returns {string} HTML-safe string
   */
  _escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
