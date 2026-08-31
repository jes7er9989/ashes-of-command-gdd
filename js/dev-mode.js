/* ═══════════════════════════════════════════════════════════
   dev-mode.js — Hidden Developer Mode
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Modified: 2026-03-28
   Dependencies: AudioEngine (optional, for unlock/edit sounds)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   FUNCTION INDEX
   ═══════════════════════════════════════════════════════════
   DevMode.init()              | Attach click listener to sidebar title
   DevMode.isUnlocked()        | Return whether dev mode is active
   DevMode.toggleEditMode()    | Toggle contenteditable on page text
   DevMode.exportHTML()        | Download current DOM as standalone HTML
   ═══════════════════════════════════════════════════════════ */


// ───────────────────────────────────────────
// SECTION: Developer Mode — 10× click unlock
// ───────────────────────────────────────────

const DevMode = (() => {
  const REQUIRED_CLICKS = 10;
  const CLICK_WINDOW_MS = 4000;

  let clickCount = 0;
  let clickTimer = null;
  let devUnlocked = false;

  // ───────────────────────────────────────────
  // SECTION: FX Toggle State
  // ───────────────────────────────────────────
  const FX_STORAGE_KEY = 'dev-fx-disabled';
  let fxDisabled = false;

  // ───────────────────────────────────────────
  // SECTION: Unlock Persistence
  // ───────────────────────────────────────────
  // Dev mode used to reset on every reload, which meant re-doing the ten
  // clicks each time just to reach the dev-only chapters. The flag is
  // restored here, during module evaluation: module scripts are deferred
  // so this runs before boot() calls Nav.init(), and the sidebar is built
  // with the right set of chapters the first time instead of flashing.
  // This is convenience, not access control — the chapters are in the
  // repo and anyone reading the source can find them.
  const DEV_STORAGE_KEY = 'aoc-dev-mode';

  function _storeUnlocked(on) {
    try {
      if (on) localStorage.setItem(DEV_STORAGE_KEY, '1');
      else localStorage.removeItem(DEV_STORAGE_KEY);
    } catch (_) { /* private browsing — falls back to session-only */ }
  }

  function _wasUnlocked() {
    try { return localStorage.getItem(DEV_STORAGE_KEY) === '1'; }
    catch (_) { return false; }
  }

  if (_wasUnlocked() && document.body) {
    devUnlocked = true;
    document.body.classList.add('dev-mode-active');
  }

  // ───────────────────────────────────────────
  // SECTION: Edit Mode State
  // ───────────────────────────────────────────
  let editModeActive = false;
  let editCount = 0;

  // ───────────────────────────────────────────
  // SECTION: Toast Notification
  // ───────────────────────────────────────────
  let toast = null;

  function _createToast() {
    toast = document.createElement('div');
    toast.id = 'dev-mode-toast';
    toast.innerHTML = '<span class="toast-badge">SYS</span>SYSTEM OVERRIDE: Developer Mode Unlocked.';
    document.body.appendChild(toast);
  }

  function _showToast() {
    if (!toast) return;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ───────────────────────────────────────────
  // SECTION: Unlock Logic
  // ───────────────────────────────────────────

  /**
   * Called when user clicks on the sidebar title (.sidebar-title).
   * After 10 clicks within 4 seconds, activates developer mode.
   */
  function _onTitleClick() {
    clickCount++;

    const verEl = document.querySelector('.sidebar-title');

    // Visual feedback: start priming glow after first click
    if (clickCount === 1 && verEl) {
      verEl.classList.add('dev-priming');
    }

    // Reset timer — must complete 10 clicks within 4 seconds
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
      if (verEl) verEl.classList.remove('dev-priming');
    }, CLICK_WINDOW_MS);

    if (clickCount >= REQUIRED_CLICKS) {
      clearTimeout(clickTimer);
      clickCount = 0;
      if (verEl) verEl.classList.remove('dev-priming');
      // Same gesture both ways: ten clicks toggles dev mode off again.
      if (devUnlocked) lock(); else _unlock();
    }
  }

  /**
   * Leave developer mode and forget the stored flag. Rebuilds the chapter
   * listings so the dev-only chapters disappear again without a reload.
   */
  function lock() {
    if (!devUnlocked) return;
    devUnlocked = false;
    _storeUnlocked(false);

    document.body.classList.remove('dev-mode-active');

    const verEl = document.querySelector('.sidebar-title');
    if (verEl) {
      verEl.classList.remove('dev-unlocked', 'dev-priming');
      verEl.title = '';
    }

    // If a dev-only chapter is open, ChapterLoader.load() will bounce to
    // the dashboard as soon as we re-route below.
    try {
      if (typeof Nav !== 'undefined' && Nav.container) Nav.render();
      if (typeof ChapterIndex !== 'undefined' && ChapterIndex.refresh) ChapterIndex.refresh();
      if (typeof Nav !== 'undefined' && Nav.onHashChange) Nav.onHashChange();
    } catch (err) {
      console.warn('[DevMode] Could not refresh chapter listings:', err.message);
    }

    console.log('%c[DevMode] Developer Mode locked.', 'color:#8090a0;font-family:monospace');
  }

  function _unlock() {
    if (devUnlocked) return;
    devUnlocked = true;
    _storeUnlocked(true);

    // Play unlock fanfare if audio engine is available
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.playAction('devUnlock');
    }

    // Add body class — reveals hidden chapters & edit bar via CSS
    document.body.classList.add('dev-mode-active');

    // The sidebar, index overlay and dashboard were built while those
    // chapters were hidden, so rebuild them now that they are allowed.
    try {
      if (typeof Nav !== 'undefined' && Nav.container) Nav.render();
      if (typeof ChapterIndex !== 'undefined' && ChapterIndex.refresh) ChapterIndex.refresh();
      if (typeof Nav !== 'undefined' && Nav.onHashChange) Nav.onHashChange();
    } catch (err) {
      console.warn('[DevMode] Could not refresh chapter listings:', err.message);
    }

    // Update sidebar title appearance
    const verEl = document.querySelector('.sidebar-title');
    if (verEl) {
      verEl.classList.remove('dev-priming');
      verEl.classList.add('dev-unlocked');
      verEl.title = 'Developer Mode ACTIVE — click the title 10x to exit';
    }

    _showToast();
    _restoreFxState();

    console.log(
      '%c⚡ SYSTEM OVERRIDE: Developer Mode Unlocked.',
      'color:#AA77FF;background:#0a0510;font-family:monospace;font-size:13px;padding:4px 10px;border:1px solid #AA77FF;border-radius:2px'
    );
  }

  // ───────────────────────────────────────────
  // SECTION: FX Toggle
  // ───────────────────────────────────────────

  function _createFxToggle() {
    const btn = document.createElement('button');
    btn.id = 'dev-fx-toggle';
    btn.textContent = 'FX: ON';
    btn.addEventListener('click', _toggleFx);
    document.body.appendChild(btn);
  }

  function _toggleFx() {
    fxDisabled = !fxDisabled;
    document.body.classList.toggle('dev-fx-disabled', fxDisabled);
    const btn = document.getElementById('dev-fx-toggle');
    if (btn) btn.textContent = fxDisabled ? 'FX: OFF' : 'FX: ON';
    try { localStorage.setItem(FX_STORAGE_KEY, fxDisabled ? '1' : '0'); } catch (_) { /* private browsing */ }
  }

  function _restoreFxState() {
    try { fxDisabled = localStorage.getItem(FX_STORAGE_KEY) === '1'; } catch (_) { fxDisabled = false; }
    if (fxDisabled) {
      document.body.classList.add('dev-fx-disabled');
      const btn = document.getElementById('dev-fx-toggle');
      if (btn) btn.textContent = 'FX: OFF';
    }
  }

  // ───────────────────────────────────────────
  // SECTION: Edit Mode
  // ───────────────────────────────────────────

  /**
   * Toggle contenteditable on text elements within pages.
   * Shows/hides the edit bar and tracks modified fields.
   */
  function toggleEditMode() {
    editModeActive = !editModeActive;

    // Play edit toggle sound
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.playAction(editModeActive ? 'editOn' : 'editOff');
    }

    document.body.classList.toggle('edit-mode', editModeActive);

    const editBar = document.getElementById('edit-bar');
    if (editBar) editBar.classList.toggle('active', editModeActive);

    const btn = document.getElementById('edit-toggle');
    if (btn) {
      btn.classList.toggle('active', editModeActive);
      const label = btn.querySelector('span:last-child');
      if (label) label.textContent = editModeActive ? 'ON' : 'OFF';
    }

    // Make text elements editable on all pages
    document.querySelectorAll('.page, [id^="page-"]').forEach(page => {
      // Primary text elements
      page.querySelectorAll('.body-text, .quote-text, .section-heading, .page-title, .page-subtitle')
        .forEach(el => {
          el.setAttribute('data-editable', '');
          el.contentEditable = editModeActive;
        });

      // Card text content
      page.querySelectorAll('.card').forEach(card => {
        card.querySelectorAll('div, span').forEach(el => {
          // Skip container elements with many children
          if (el.children.length > 2 && !el.textContent.trim()) return;
          // Skip short Orbitron labels (headings, badges)
          if (el.style.fontFamily &&
              el.style.fontFamily.includes('Orbitron') &&
              el.textContent.length < 40) return;
          if (el.textContent.trim().length > 10) {
            el.setAttribute('data-editable', '');
            el.contentEditable = editModeActive;
          }
        });
      });

      // Grid cell text
      page.querySelectorAll('div[style*="display:grid"] > span, div[style*="display:grid"] > div')
        .forEach(el => {
          if (el.textContent.trim().length > 3 &&
              !el.querySelector('button') &&
              !el.querySelector('input')) {
            el.setAttribute('data-editable', '');
            el.contentEditable = editModeActive;
          }
        });
    });

    if (editModeActive) {
      editCount = 0;
      const countEl = document.getElementById('edit-count');
      if (countEl) countEl.textContent = '0 fields modified';
      document.addEventListener('input', _trackEdit);
    } else {
      document.removeEventListener('input', _trackEdit);
      document.querySelectorAll('[data-editable]').forEach(el => {
        el.contentEditable = 'false';
      });
    }
  }

  /**
   * Track individual field edits for the edit bar counter.
   */
  function _trackEdit(e) {
    if (e.target.hasAttribute('data-editable') && !e.target.dataset.modified) {
      e.target.dataset.modified = 'true';
      editCount++;
      const countEl = document.getElementById('edit-count');
      if (countEl) {
        countEl.textContent = editCount + ' field' + (editCount !== 1 ? 's' : '') + ' modified';
      }
      // Visual indicator on modified fields
      e.target.style.borderLeft = '2px solid var(--accord)';
    }
  }

  // ───────────────────────────────────────────
  // SECTION: Export HTML
  // ───────────────────────────────────────────

  /**
   * Clone the entire document, strip edit attributes, and download
   * as a standalone HTML file.
   */
  function exportHTML() {
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.playAction('export');
    }

    // Turn off edit mode before export (so contenteditable is stripped)
    const wasActive = editModeActive;
    if (wasActive) toggleEditMode();

    const clone = document.documentElement.cloneNode(true);

    // Clean up editable markers from clone
    clone.querySelectorAll('[data-editable]').forEach(el => {
      el.removeAttribute('data-editable');
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-modified');
    });

    const html = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Ashes-of-Command-GDD-Export.html';
    a.click();
    URL.revokeObjectURL(url);

    // Restore edit mode if it was on before export
    if (wasActive) toggleEditMode();
  }

  // ───────────────────────────────────────────
  // SECTION: Initialization
  // ───────────────────────────────────────────

  function init() {
    _createToast();
    _createFxToggle();

    // Restored from a previous session: apply the unlocked styling only.
    // No fanfare — the toast and sound belong to the act of unlocking.
    if (devUnlocked) {
      const restoredEl = document.querySelector('.sidebar-title');
      if (restoredEl) {
        restoredEl.classList.add('dev-unlocked');
        restoredEl.title = 'Developer Mode ACTIVE — click the title 10x to exit';
      }
    }

    // Attach click listener to sidebar title for 10-click unlock
    const verEl = document.querySelector('.sidebar-title');
    if (verEl) {
      verEl.addEventListener('click', _onTitleClick);
    }

    // Wire up edit bar buttons if they exist
    const editToggleBtn = document.getElementById('edit-toggle');
    if (editToggleBtn) {
      editToggleBtn.addEventListener('click', toggleEditMode);
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportHTML);
    }
  }

  return {
    init,
    isUnlocked: () => devUnlocked,
    lock,
    toggleEditMode,
    exportHTML,
  };
})();
