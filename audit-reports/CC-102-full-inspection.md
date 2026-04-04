# CC-102/103/104: Full PWA Inspection — Master Report
**Date:** 2026-04-04
**Scope:** Full codebase audit (dead code, code quality, data integrity) + live browser inspection
**Branch:** dev @ b5076e9

---

## TL;DR

The PWA is **architecturally sound** and **documentation-excellent** — 21/21 JS files have headers, ~100% JSDoc coverage, CSS has 19 labeled sections with 196 comment blocks, and SVG accessibility titles are already in place. Search, nav, chapter loading, and service worker registration all function.

There are **3 CRITICAL bugs** that likely degrade functionality silently, plus **~100 smaller issues** across dead code, orphaned CSS, and data gaps.

| Severity | Count | Category |
|---|---|---|
| **CRITICAL** | 3 | Functional (SW scope, equipment BOM, buildings data) |
| **HIGH** | 11 | A11y, broken cache patterns, missing pages |
| **MEDIUM** | 48 | Code quality, orphaned selectors, long functions |
| **LOW** | 42 | Naming, minor polish, archival candidates |

---

## CRITICAL — Silent Failures (Fix First)

### C1. Service Worker Scope Bug — OFFLINE BROKEN
**File:** `index.html:448`
**Code:** `navigator.serviceWorker.register('js/service-worker.js')`
**Problem:** No explicit scope is provided, so the SW is scoped to `/js/` by default. This means the SW's fetch handler **never intercepts** requests for chapters, data JSONs, CSS, or index.html — everything outside `/js/`.
**Evidence:** Console log on page load: `[SW] Registered (scope: http://localhost:8765/js/)`.
**Impact:** The 131-entry precache (built in CC-094) is installed but never served from cache. PWA offline mode, install-to-desktop, and fast revisits are all silently broken.
**Fix options:**
- (A) Move `js/service-worker.js` → `service-worker.js` and register as `/service-worker.js` (recommended; static-host friendly).
- (B) Keep location, add `{scope: '/'}` to register() **and** configure server to send `Service-Worker-Allowed: /` header.

### C2. Equipment JSONs fail JSON.parse (UTF-8 BOM)
**Files:** All 7 `data/equipment/*.json`
**Problem:** Each file starts with `EF BB BF` (BOM). Native `JSON.parse()` throws `Unexpected token U+FEFF at position 0`.
**Impact:** Any `fetch().json()` call against equipment data crashes. The content itself is valid — only the BOM is the problem.
**Fix:** Strip the BOM from all 7 files. Auto-fixable.

### C3. Building data directory EMPTY
**Path:** `data/buildings/`
**Problem:** Directory exists but contains zero files. Expected: 7 faction files × 20 buildings = 140 entries.
**Evidence:** Icons are ready — `data/icons/build-icons.json` has all 140 entries. Data authoring just hasn't happened.
**Impact:** Any future building page/card rendering has nothing to render.
**Fix:** Scoped authoring task, not a bug. Flag only.

---

## HIGH — Functional & Accessibility

### H1. `DataLoader.cache` Broken Access Pattern (2 files)
- `js/icon-renderer.js:39` reads `DataLoader.cache['equip-icons']` — but `equip-icons.json` is never loaded via `DataLoader.load()`, so the cache returns `{}` and icons silently fall back.
- `js/sprite-engine.js:103` reads `DataLoader.cache['shapes']` — same problem.
**Fix:** Either preload these in the DataLoader boot sequence, or replace with direct fetch.

### H2. `data/icons/unit-icons.json` missing
Expected for the unit-icon rendering pipeline but the file doesn't exist.

### H3. 6 Appendix Pages 404
Nav-data references `appA`–`appF` but no HTML files exist. The `appendices.html` file consolidates their content but isn't wired to the nav route aliases.
**Fix:** Either create 6 thin wrapper pages that pull from `appendices.html`, or add route aliases so `appA`–`appF` all map to `appendices.html`.

### H4. 6 Form Inputs Lack Label Association (index.html)
Search inputs (`#nav-search`, `#search-input`), 3 volume sliders, and brightness slider have no `for=`/`aria-label` connection. Screen readers miss them.

### H5. No Skip-to-Main-Content Link
WCAG requires a skip link as the first focusable element for keyboard users.

### H6. Chapter Headings Use `<div>` Instead of `<h1>`–`<h6>`
All ~57 chapter files use `<div class="page-title">` / `<div class="section-heading">`. Screen readers cannot build a document outline. This is the largest a11y gap.

### H7. 19 Dead Galaxy-Map CSS Selectors (~280 lines)
Remnants of SVG galaxy map, replaced by `canvas-galaxy.js`. Safe to delete.

### H8. 6 Unreferenced Data Files in SW Cache
`faction-colors.json`, `faction-logos.json`, `faction-names.json`, `unit-loadouts.json`, `lore-quotes.json` (superseded by hardcoded dashboard array), and the empty `buildings/` directory. All precached, none fetched.

### H9. favicon.ico 404
Minor — every page load logs a 404 in console. Solved by adding a 16×16 `favicon.ico` at root.

---

## MEDIUM — Code Quality & Polish

### M1. 7 Unused JS Functions (real implementations)
`playAccordion`, `playRarity`, `startViz`, `loadAllUnits`, `loadAllEquipment`, `Search.open()`, `Search.close()` — all have full code but zero callers.

### M2. `FactionCursor` Module Is Dead
`js/visual-effects.js` — `FactionCursor.init()` body is just `return;`. The whole module is a no-op.

### M3. 7 Long Functions (>60 lines)
Worst: `audio-engine.js:playAction()` at ~300 lines (30+ case switch). Candidates for lookup-table refactor: `search()`, `buildPlanetCards()`, `chapter-loader.load()`.

### M4. ~30 Magic Numbers
Concentrated in `audio-engine.js` (FDN reverb tap primes), `solar-system.js` (renderer dimensions), `search.js` (scoring weights — named but not `const`).

### M5. ~60+ Section IDs Missing From section-map.json
Sub-navigation doesn't jump to these. Worst: ch43-ai (12 missing), ch19 (12 missing), ch18 (8 missing).

### M6. 12 Orphaned Data/Grid CSS Selectors
Pre-built component styles for content not yet authored. Keep or delete based on Thomas's call.

### M7. 10 Missing Glossary Entries
All 7 faction names (Terran League, Eternal Shards, Scrap-Horde, Revenant, Unity Accord, Vorax, Core Guardians) + 3 commanders (Valerius, Krell, Vane) missing from `js/glossary.js`.

### M8. 7 Dead Unit Stat Keys
`atkSpd`, `abilityPower`, `critDamage`, `suppressResist`, `leadershipRadius`, `xpRate`, `resistances` (+5 sub-keys) present in all 105 units but rendered nowhere. ~15-20% JSON payload bloat.

### M9. CSS Section Numbering Duplicates
Sections 15 and 16 each appear twice in global.css. Renumber for clarity.

### M10. 2 Smart-Quote Icon Mismatches
`"Da Big Choppa"` and `"Lucky Plate"` (scrap-horde) — icon keys use curly quotes, equipment definitions use straight quotes. Icons won't resolve.

### M11. 38 stat-placeholder-banner Active
Chapter visual reminders that numbers are TBD. Expected at current build phase, noted for balance-pass.

### M12. 12+ TBD Markers in Chapter Content
ch5, ch8, ch15, ch20, ch22, ch23, ch30 have "TBD" text still visible to readers.

---

## LOW — Minor Cleanup

- 12 backward-compat audio stubs (zero callers)
- 6 one-time build scripts in root (`extract-chapters.js`, `extract-data.js`, `fix-encoding.js`, `fix-guardians.js`, `generate-icons.js`, `re-extract.js`) — move to `scripts/archive/`
- 4 unused teardown methods (`destroy`, `disposeAll`)
- 2 debug `console.log` statements (VFX banner, IDB clear message)
- 1 commented-out `// HoloTilt.init();`
- 5 orphaned page-bg theme classes (`.page-bg-combat` etc.)
- 3 orphaned sidebar search sub-component selectors
- 1 section-map label mismatch (ch3-2)
- 1 HTML file not in nav (`appendices.html` — intentional if used as source for appA–appF)

---

## 20 Improvements (Beyond Bug Fixes)

These are enhancement opportunities, not fixes. Prioritized by value-per-effort.

### Performance & Architecture

1. **Lazy-load planet-renderer.js + three.js** — Only load on chapters that actually use 3D renders (ch13, maybe ch12). Saves ~200KB on initial load for 90% of pages.

2. **Move service worker to root + fix scope** — Unlocks the entire 131-entry precache built in CC-094. Huge offline-UX win.

3. **Bundle data JSONs into a single `/data/bundle.json`** — Currently the DataLoader fetches 40+ JSONs serially on boot. One bundle = one fetch = faster cold start. Keep individual files as source-of-truth; generate bundle via build-search-index-style script.

4. **Add HTTP cache headers guidance in README** — PWA's static assets benefit hugely from `Cache-Control: max-age=31536000, immutable` for hashed files. Document the expected server config.

5. **Audit unit JSON payload — strip unrendered keys** — 7 unrendered stat fields across 105 units = ~15-20% payload reduction. Either render them or move them to a reference sub-object.

### Code Quality

6. **Refactor `playAction()` into a sound-map lookup table** — 300 lines → ~40 lines. Easier to add sounds, easier to test, easier to auto-generate from a CSV.

7. **Extract audio DSP constants into named exports** — FDN reverb tap primes, feedback/damping/mix gains become documented constants. Makes audio tuning collaborative.

8. **Split `chapter-loader.js:load()` into phases** — Currently 123 lines doing fetch + inject + faction sync + glossary wiring. Four clear phases → four methods → easier to debug "the chapter loaded but glossary didn't highlight."

9. **Standardize abbreviation conventions** — Pick `el` or `element`, `ch` or `chapter`, `f` or `faction`, and apply project-wide. Document the rule in a short `workspace/conventions.md`.

10. **Document the `build*()` (public) vs `_render*()` (private) convention** — Currently implicit. One comment at the top of `faction-renderer.js` would make it explicit.

### Accessibility

11. **Semantic heading overhaul** — Replace `<div class="page-title">` with `<h1>`, `.section-heading` with `<h2>`, `.section-label` with `<h3>` across all chapter files. Best done via scripted regex pass. Screen-reader users can't navigate the GDD currently.

12. **Add skip-to-main-content link + form labels** — ~30 minutes of work. Fixes 6 HIGH a11y findings.

13. **Add reduced-motion media query** — Respect `prefers-reduced-motion: reduce` to disable CRT scan lines, particle effects, background animations. Small but shows polish.

14. **Keyboard navigation docs** — Thomas hits Ctrl+K for search. Add a `?` keyboard-shortcut overlay listing all hotkeys (toggle sidebar, search, filter, dev mode, etc.). Discoverability.

### Visual / UX

15. **Animate chapter-index active indicator on route change** — The 3px left border now jumps instantly. A 150ms slide would feel premium.

16. **Add a subtle scroll-progress bar at top of chapter pages** — On long chapters like ch12 (galaxy gen) or ch19 (ground combat), readers lose orientation. 2px progress indicator helps.

17. **Auto-collapse chapter index on mobile when a chapter loads** — Currently on small screens, the index stays open and covers the content. Click-to-collapse.

18. **Factionless chapter headers need a default accent color** — ch1–ch4, ch12+ have no faction color. Currently they use `--text-dim` via the chapter-index. Consider assigning each PART (I, II, III, IV, V) its own subtle hue.

### Data / Content

19. **Extract inline glossary terms to `data/glossary.json`** — Currently `js/glossary.js` has 31 entries embedded. External JSON = easier to edit, easier to add faction names + commanders without touching JS.

20. **Build an automated "sync audit" script** — A Node script that runs all cross-ref checks from CC-104 (nav ↔ HTML ↔ section-map ↔ search-index ↔ glossary) and fails CI/pre-commit if drift is detected. Thomas's zero-defect mentality rewarded with automation.

### Bonus Improvements (21-25)

21. **Versioned audit reports index** — `audit-reports/README.md` listing all reports with dates, scope, and current status. Makes "what have we audited?" answerable at a glance.

22. **Chapter link preview cards on hover** — When hovering a chapter in the index, show a 3-line preview (first paragraph or subtitle). Similar to Wikipedia hover cards.

23. **Export chapter to PDF feature** — Each chapter already has a clean layout. One-click "Download this chapter as PDF" could be a Kickstarter-backer perk.

24. **Version banner in CRT overlay** — Show game version + build date + commit hash in dev mode, so screenshots always carry attribution.

25. **Component/design-token style guide page** — A new `/pages/style-guide.html` showing all buttons, cards, stat pills, faction accents, etc. Catches visual drift early.

---

## Trivial Safe Fixes (Auto-Applying)

The following are unambiguous and low-risk — Bob is applying them automatically:

1. Strip UTF-8 BOM from 7 equipment JSONs (C2)
2. Fix 2 smart-quote icon key mismatches (M10)
3. Remove 2 debug `console.log` statements (low-5)
4. Remove commented-out `// HoloTilt.init();` (low-6)
5. Add empty `favicon.ico` at root (H9)

Everything else requires Thomas's go-ahead because scope / architectural impact / design intent is involved.

---

## Full Audit Reports

- `audit-reports/CC-102-dead-code-audit.md` — 13.5KB, 112 findings
- `audit-reports/CC-103-code-quality-audit.md` — 14.1KB, docs + readability
- `audit-reports/CC-104-data-integrity-audit.md` — 12.6KB, data cross-ref

---

*Generated by Bob — CC-102/103/104 master synthesis. Read-only audits; only trivial fixes applied.*
