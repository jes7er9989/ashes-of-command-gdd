# CC-102: Dead Code + Unused Files Audit
**Date:** 2026-04-04
**Scope:** Full PWA codebase (excluding `reference/`, `audit-reports/`, `.git/`, `node_modules/`, `prompts/`)

## Summary
- **26 unused JS functions/methods** across 8 files
- **48 orphaned CSS selectors** in `global.css`
- **6 unreferenced data files** + 2 with broken cache patterns + 1 preloaded but unconsumed
- **0 orphaned chapter pages** (all properly referenced)
- **1 commented-out code block** + 1 dead-code early-return
- **2 debug console.log** statements in production JS
- **0 TODO/FIXME/XXX/HACK** markers
- **12 dead data keys** across unit/equipment JSON (spot-check)
- **6 one-time build scripts** that can be archived

---

## 1. Unused JavaScript Functions

### 1a. Dead Methods in Production JS

| File | Function/Method | Notes | Severity |
|------|----------------|-------|----------|
| `js/audio-engine.js` | `playAccordion()` | Never called; accordion sounds use `playAction()` instead | MEDIUM |
| `js/audio-engine.js` | `playRarity()` | No consumer anywhere | MEDIUM |
| `js/audio-engine.js` | `startViz()` | Audio visualizer never wired up | MEDIUM |
| `js/audio-engine.js` | `stopBg()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `getMusicVol()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `duck()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `setBpm()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `toggleBitcrush()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `isBitcrushOn()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `setTrack()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `toggleHum()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `toggleReverb()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `crossfadeToCategory()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `startCategoryBg()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `stopCategoryBg()` | Backward-compat stub, zero callers | LOW |
| `js/audio-engine.js` | `onScroll()` | Backward-compat stub, zero callers | LOW |
| `js/data-loader.js` | `loadAllUnits()` | Never called externally | MEDIUM |
| `js/data-loader.js` | `loadAllEquipment()` | Never called externally | MEDIUM |
| `js/chapter-index.js` | `destroy()` | No teardown path exists | LOW |
| `js/dev-mode.js` | `isUnlocked()` | Exported but never read externally | LOW |
| `js/planet-renderer.js` | `disposeAll()` | Never called; individual `.dispose()` used instead | LOW |
| `js/search.js` | `open()` | Ctrl+K redirected to sidebar search; overlay methods orphaned | MEDIUM |
| `js/search.js` | `close()` | Same as above | MEDIUM |
| `js/visual-effects.js` | `FactionBgSwitcher.getCurrent()` | Zero external callers | LOW |
| `js/visual-effects.js` | `FactionCursor` (entire module) | `init()` contains only `return;` -- fully disabled dead code | MEDIUM |
| `js/visual-effects.js` | `CRTEffect.toggle()` / `.isActive` | No UI button wired to toggle CRT | LOW |
| `js/visual-effects.js` | `VisualEffects.destroy()` | No teardown path exists | LOW |

### 1b. One-Time Build Scripts (Archival Candidates)

These scripts reference the monolith GDD HTML and were used during initial project extraction. They have no ongoing purpose.

| File | Purpose | Severity |
|------|---------|----------|
| `extract-chapters.js` | One-time chapter extraction from monolith | LOW |
| `extract-data.js` | One-time data extraction from monolith | LOW |
| `fix-encoding.js` | One-time UTF-8 mojibake fix | LOW |
| `fix-guardians.js` | One-time guardian data extraction | LOW |
| `generate-icons.js` | One-time PWA icon generation | LOW |
| `re-extract.js` | One-time re-extraction of equip/tech | LOW |

**Keep:** `audit-chapters.js` (reusable), `build-search-index.js` (required for content updates)

---

## 2. Orphaned CSS Selectors

**Total selectors in `global.css`:** 359 (341 classes + 18 IDs)
**Used:** 311 | **Orphaned:** 48

### 2a. Galaxy Map SVG Block (19 selectors) -- HIGH

Remnants of SVG-based galaxy map replaced by canvas implementation (`js/canvas-galaxy.js`).

| Selector | CSS Line |
|----------|----------|
| `.galaxy-map` | ~L1345 |
| `.galaxy-map-container` | ~L1345 |
| `.galaxy-nebula` | ~L1363 |
| `.galaxy-nebula-cloud` | ~L1378 |
| `.galaxy-dust-lane` | ~L1387 |
| `.galaxy-halo` | ~L1396 |
| `.galaxy-arms` | ~L1409 |
| `.galaxy-stars` | ~L1423 |
| `.galaxy-fill-stars` | ~L1424 |
| `.galaxy-core` | ~L1435 |
| `.galaxy-homeworld` | ~L1480 |
| `.homeworld-dot` | ~L1497 |
| `.homeworld-ring` | ~L1510 |
| `.homeworld-label` | ~L1534 |
| `.homeworld-systems` | ~L1549 |
| `.galaxy-comet` | ~L1570 |
| `.galaxy-rogue-planet` | ~L1602 |
| `.sol-system-legacy-removed` | ~L1630 |
| `.galaxy-svg` | ~L3156 |

### 2b. Page Background Theme Classes (5 selectors) -- MEDIUM

Define `--fc` properties but are never applied. Note: `.bg-combat` etc. (without `page-` prefix) ARE used.

| Selector | CSS Line |
|----------|----------|
| `.page-bg-combat` | ~L3724 |
| `.page-bg-cosmic` | ~L3722 |
| `.page-bg-foundation` | ~L3722 |
| `.page-bg-galactic` | ~L3723 |
| `.page-bg-strategy` | ~L3725 |

### 2c. Sidebar Search Sub-components (3 selectors) -- MEDIUM

Richer search layout was simplified; only `-title` and `-snippet` variants remain in use.

| Selector | CSS Line |
|----------|----------|
| `.sidebar-search-result-meta` | ~L444 |
| `.sidebar-search-result-part` | ~L470 |
| `.sidebar-search-result-type` | ~L451 |

### 2d. Epigraph / Misc (5 selectors) -- LOW

| Selector | CSS Line |
|----------|----------|
| `.epigraph-context` | ~L1227 |
| `.epigraph-section` | ~L1227 |
| `.subtitle-reclamation` | ~L272 |
| `.tech-mono` | ~L197 |
| `.phase-link` | ~L2247 |

### 2e. Data/Equipment/Grid Display (12 selectors) -- MEDIUM

Pre-built component styles for content not yet authored or since removed.

| Selector | CSS Line |
|----------|----------|
| `.power-bar-fill` | ~L3661 |
| `.stat-comparison` | ~L5776 |
| `.unit-stats-table` | ~L5775 |
| `.data-grid` | ~L5783 |
| `.data-row` | ~L3703 |
| `.data-table` | ~L5754 |
| `.equipment-grid` | ~L5762 |
| `.equipment-icons` | ~L5851 |
| `.icon-grid` | ~L5763 |
| `.item-icon-grid` | ~L5852 |
| `.tech-grid` | ~L5770 |
| `.tech-tree-grid` | ~L5769 |

### 2f. UI Components (3 selectors) -- MEDIUM

| Selector | CSS Line |
|----------|----------|
| `.accordion-header` | ~L5788 |
| `.expandable-header` | ~L5789 |
| `.swipe-scroll` | ~L5892 |

### 2g. Visual Effect ID (1 selector) -- LOW

| Selector | CSS Line |
|----------|----------|
| `#faction-cursor-glow` | ~L3775 |

---

## 3. Unreferenced Data Files

### 3a. Never Fetched at Runtime -- HIGH

| Data File | In SW Cache | Notes |
|-----------|-------------|-------|
| `data/factions/faction-colors.json` | Yes | Extracted but never loaded by any JS |
| `data/factions/faction-logos.json` | Yes | Extracted but never loaded by any JS |
| `data/factions/faction-names.json` | Yes | Extracted but never loaded by any JS |
| `data/loadouts/unit-loadouts.json` | Yes | Extracted but never loaded by any JS |
| `data/nav/lore-quotes.json` | Yes | Superseded by hardcoded array in `dashboard.js:55-79` |
| `data/buildings/` | N/A | **Empty directory** -- no files, no references |

### 3b. Broken Cache Access Pattern -- HIGH

These files are read from `DataLoader.cache[]` but never loaded via `DataLoader.load()`, so the cache read always returns `{}`.

| Data File | Read By | Issue |
|-----------|---------|-------|
| `data/icons/equip-icons.json` | `icon-renderer.js:39` | Never loaded into `DataLoader.cache` |
| `data/sprites/shapes.json` | `sprite-engine.js:103` | Never loaded into `DataLoader.cache` |

### 3c. Preloaded but Unconsumed -- MEDIUM

| Data File | Loaded By | Issue |
|-----------|-----------|-------|
| `data/nav/section-map.json` | `data-loader.js:99` (boot preload) | No code ever reads it from cache |

---

## 4. Orphaned Chapter Pages

**No truly orphaned chapter pages found.**

- All `pages/chapters/*.html` files are referenced in `nav-data.json`, route aliases, or serve as utility pages
- `dashboard.html` -- landing page (not a chapter)
- `placeholder.html` -- fallback stub
- `ch41.html` absent by design -- `ch40.html` covers chapters 40-41 (`"num": "40-41"` in nav-data)
- 18 chapters lack `section-map.json` entries (no in-page section nav), which may need populating if section navigation is wired up

---

## 5. Commented-Out Code Blocks

| File | Line(s) | Description | Severity |
|------|---------|-------------|----------|
| `js/visual-effects.js` | 506-507 | `// HoloTilt.init();` with explanation comment | LOW |
| `js/visual-effects.js` | 217-219 | `FactionCursor.init()` body is `return;` (early-return dead code, not commented) | MEDIUM |

---

## 6. Console.log / Debugger Statements

### Debug Logs (removal candidates)

| File:Line | Statement | Severity |
|-----------|-----------|----------|
| `js/visual-effects.js:509` | `console.log('%c[VFX] Visual effects online.', ...)` -- styled startup banner | LOW |
| `js/data-loader.js:82` | `console.log('[DataLoader] IndexedDB cache: ${count} stale entries cleared')` | LOW |

### Legitimate Warnings (keep)

| File:Line | Statement |
|-----------|-----------|
| `js/data-loader.js:91` | `console.warn('[DataLoader] Worker error, falling back...')` |
| `js/data-loader.js:103` | `console.warn('[DataLoader] Worker init failed...')` |
| `js/data-loader.js:143` | `console.warn('[DataLoader] Worker load failed...')` |
| `js/data-loader.js:171` | `console.warn('[DataLoader] Worker preload failed...')` |
| `js/dashboard.js:1201` | `console.warn('[Dashboard] Galaxy renderer failed...')` |
| `js/dashboard.js:1210` | `console.warn('[Dashboard] Solar system renderer failed...')` |
| `js/search.js:74` | `console.warn('[Search] Failed to load index...')` |
| `js/planet-renderer.js:627` | `console.warn('PlanetRenderer: Three.js not loaded')` |
| `js/planet-renderer.js:638` | `console.warn('PlanetRenderer: WebGL failed...')` |

### Intentional (dev feature)

| File:Line | Statement |
|-----------|-----------|
| `js/dev-mode.js:110` | `console.log('SYSTEM OVERRIDE: Developer Mode Unlocked.')` -- fires only on 10-click unlock |

**Debugger statements:** None found.

---

## 7. TODO / FIXME / XXX / HACK Markers

**None found** across all scanned source files. Codebase is clean.

---

## 8. Dead Data Keys (Spot-Check)

Sampled: `data/units/{terran-league,vorax,revenant}.json`, `data/equipment/{terran-league,vorax,core-guardians}.json`

### Unit JSON -- Unreferenced Fields

| Field | Present On | Notes | Severity |
|-------|-----------|-------|----------|
| `proto` (unit-level) | 2 Terran units | Only checked in `_equipRow()`, never in unit rendering | LOW |
| `stats.atkSpd` | All units | Never rendered | MEDIUM |
| `stats.abilityPower` | All units | Never rendered | MEDIUM |
| `stats.critDamage` | All units | Never rendered | MEDIUM |
| `stats.suppressResist` | All units | Never rendered | MEDIUM |
| `stats.leadershipRadius` | All units | Never rendered | MEDIUM |
| `stats.xpRate` | All units | Never rendered | MEDIUM |
| `stats.resistances` | All units | Entire sub-object (5 keys) never rendered | MEDIUM |
| `repair` | All Terran units | Never rendered | LOW |
| `rankNote` | Revenant Legionnaire | Never rendered | LOW |
| `voraxNote` | 4 Vorax units | Never rendered | LOW |

### Equipment JSON -- Unreferenced Fields

| Field | Present On | Notes | Severity |
|-------|-----------|-------|----------|
| `statBlock` | 8 of 15 Terran items | Short stat summary, never rendered | LOW |

These fields appear to be game-design reference data included for completeness but not yet wired into the UI. They contribute to JSON payload size (~15-20% of unit data) without being displayed.

---

## Severity Classification

### CRITICAL (0 items)
No findings break functionality.

### HIGH (8 items -- wastes bandwidth / load time)
- 6 unreferenced data files cached by service worker (~20-50KB wasted cache)
- 2 files with broken `DataLoader.cache` access pattern (equip-icons, shapes) -- **these silently fail**, meaning icon/sprite features may be degraded
- 19 galaxy-map CSS selectors (~280 lines of dead CSS)

### MEDIUM (37 items -- code quality / readability)
- 7 unused JS functions with real implementation (`playAccordion`, `playRarity`, `startViz`, `loadAllUnits`, `loadAllEquipment`, `Search.open/close`)
- `FactionCursor` module entirely dead (early-return no-op)
- 1 preloaded-but-unconsumed data file (`section-map.json`)
- 5 orphaned page-bg theme classes
- 3 orphaned sidebar search sub-component selectors
- 12 orphaned data/grid display selectors
- 3 orphaned UI component selectors
- 7 dead unit stat keys rendered nowhere (`atkSpd`, `abilityPower`, `critDamage`, `suppressResist`, `leadershipRadius`, `xpRate`, `resistances`)

### LOW (39 items -- minor cleanup)
- 12 backward-compat audio stubs with zero callers
- 4 unused teardown/utility methods (`destroy`, `isUnlocked`, `disposeAll`, `getCurrent`)
- 2 unused CRT toggle methods
- 6 one-time build scripts (archival candidates)
- 5 orphaned epigraph/misc CSS selectors
- 1 orphaned `#faction-cursor-glow` ID selector
- 2 debug `console.log` statements
- 1 commented-out `HoloTilt.init()` call
- 4 dead unit note/proto fields
- 1 dead equipment `statBlock` field
- 1 empty `data/buildings/` directory
