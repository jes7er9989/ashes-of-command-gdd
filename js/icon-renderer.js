/* ═══════════════════════════════════════════════════════════
   icon-renderer.js — Equipment & Building Icon Lookup
   ───────────────────────────────────────────────────────────
   Part of: Ashes of Command: The Reclamation (PWA)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: DataLoader (for cached JSON)

   Provides SVG icon strings for equipment items and buildings
   by looking them up in pre-extracted JSON data files:
     - data/icons/equip-icons.json  (882 keys)
     - data/icons/build-icons.json  (140 keys)

   If a name is not found, returns a simple placeholder SVG.
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════
   IconRenderer.getEquipIcon(name)          | Look up equipment SVG by name
   IconRenderer.getBuildIcon(name)           | Look up building SVG by name
   IconRenderer._getEquipIcons()             | Cached access to equip-icons.json
   IconRenderer._getBuildIcons()             | Cached access to build-icons.json
   IconRenderer._placeholderIcon(label,color)| Generate fallback SVG placeholder
   IconRenderer.renderEquipIcon(name,size)   | Returns sized HTML wrapper for equip icon
   IconRenderer.renderBuildIcon(name,size)   | Returns sized HTML wrapper for build icon
   ═══════════════════════════════════════════════════════ */

const IconRenderer = {

  /* ═══════════════════════════════════════════════════════
     DATA ACCESS
     ═══════════════════════════════════════════════════════ */

  /**
   * Retrieve the equipment icons map from DataLoader cache.
   * @returns {Object} Map of equipment name → SVG string
   */
  _getEquipIcons() {
    return DataLoader.cache['data/icons/equip-icons.json'] || {};
  },

  /**
   * Retrieve the building icons map from DataLoader cache.
   * @returns {Object} Map of building name → SVG string
   */
  _getBuildIcons() {
    return DataLoader.cache['data/icons/build-icons.json'] || {};
  },

  /* ═══════════════════════════════════════════════════════
     PUBLIC LOOKUP API
     ═══════════════════════════════════════════════════════ */

  /**
   * Look up an equipment icon SVG string by item name.
   * Returns the full <svg>…</svg> string, or a placeholder if not found.
   * @param {string} name - Equipment item name (e.g. 'M7 Assault Rifle')
   * @returns {string} SVG markup string
   */
  getEquipIcon(name) {
    if (!name) return '';
    const icons = this._getEquipIcons();
    return icons[name] || this._placeholderIcon(name, '#8899aa');
  },

  /**
   * Look up a building icon SVG string by building name.
   * Returns the full <svg>…</svg> string, or a placeholder if not found.
   * @param {string} name - Building name (e.g. 'Terran_Scrap Mine')
   * @returns {string} SVG markup string
   */
  getBuildIcon(name) {
    if (!name) return '';
    const icons = this._getBuildIcons();
    return icons[name] || this._placeholderIcon(name, '#667788');
  },

  /* ═══════════════════════════════════════════════════════
     PLACEHOLDER FALLBACK
     ═══════════════════════════════════════════════════════ */

  /**
   * Generate a simple placeholder SVG icon when the real icon is missing.
   * Shows a rounded box with the first 1–2 characters of the name.
   * @param {string} label - Name to derive the label from
   * @param {string} color - Hex stroke/text color
   * @returns {string} SVG markup string
   */
  _placeholderIcon(label, color) {
    // Extract initials: first char of first two words, uppercase
    const words = (label || '?').replace(/[\[\]]/g, '').split(/[\s_-]+/);
    const initials = words.slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">` +
      `<rect x="6" y="6" width="40" height="40" rx="6" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>` +
      `<text x="26" y="30" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="12" fill="${color}" opacity="0.6">${initials}</text>` +
      `</svg>`;
  },

  /* ═══════════════════════════════════════════════════════
     HTML WRAPPERS — Sized icon containers
     ═══════════════════════════════════════════════════════ */

  /**
   * Return a sized HTML wrapper containing an equipment icon.
   * @param {string} name - Equipment item name
   * @param {number} [size=28] - Display size in pixels
   * @returns {string} HTML string with inline SVG
   */
  renderEquipIcon(name, size) {
    const px = size || 28;
    const svg = this.getEquipIcon(name);
    return `<span style="display:inline-block;width:${px}px;height:${px}px;vertical-align:middle;flex-shrink:0">${svg}</span>`;
  },

  /**
   * Return a sized HTML wrapper containing a building icon.
   * @param {string} name - Building name
   * @param {number} [size=36] - Display size in pixels
   * @returns {string} HTML string with inline SVG
   */
  renderBuildIcon(name, size) {
    const px = size || 36;
    const svg = this.getBuildIcon(name);
    return `<span style="display:inline-block;width:${px}px;height:${px}px;vertical-align:middle;flex-shrink:0">${svg}</span>`;
  }
};
