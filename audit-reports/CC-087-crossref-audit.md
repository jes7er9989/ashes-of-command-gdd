# CC-087: Cross-Reference Audit Report

**Date:** 2026-04-04
**Branch:** dev
**Status:** READ-ONLY audit — no files modified

---

## 1. Navigation vs Chapters

**Scope:** `data/nav/section-map.json` → `pages/chapters/*.html`

All 37 chapter keys in section-map.json resolve to existing HTML files. **4 anchor issues found:**

| # | Severity | section-map Key | Missing Anchor | File | Details |
|---|----------|----------------|----------------|------|---------|
| 1 | **CRITICAL** | `ch13` | `sec-ch13-planets` | `pages/chapters/ch13.html` | Label "Standard Worlds — Detailed Profiles" — anchor ID does not exist in file |
| 2 | **CRITICAL** | `ch13` | `sec-ch13-megastructures` | `pages/chapters/ch13.html` | Label "5 Rare Discovery Types" — anchor ID does not exist in file |
| 3 | **CRITICAL** | `ch18` | `sec-ch18-10` | `pages/chapters/ch18.html` | Label "6 Types Based on Strategic Context" — file has sec-ch18-9 and sec-ch18-11 but skips 10 |
| 4 | **MAJOR** | `appendices` | `sec-appM-0` | `pages/chapters/appendices.html` | Anchor exists in `appM.html`, not `appendices.html` — nav will scroll to wrong file |

**Recommended fixes:**
1–2. Add `id="sec-ch13-planets"` and `id="sec-ch13-megastructures"` to appropriate sections in ch13.html
3. Add `id="sec-ch18-10"` to the missing section in ch18.html
4. Either move the `sec-appM-0` entry to its own `appM` key in section-map.json, or add a matching anchor in appendices.html

**Chapters in section-map.json with no issues:** ch1–ch12, ch14–ch17, ch19, ch19b, ch20–ch26, ch29–ch33, ch37, ch40, ch43, ch46, appendices (except appM-0)

---

## 2. Search Index Coverage

**Scope:** `data/search-index.json` vs `pages/chapters/*.html`

### Chapters WITH search-index entries (good): 47
ch1–ch46, ch19b, ch43-ai, appL, appM, suppG–suppK

### Chapter files MISSING from search-index.json: 2

| # | Severity | File | Details |
|---|----------|------|---------|
| 5 | **MAJOR** | `pages/chapters/appendices.html` | Main appendices hub — no search-index entry |
| 6 | **MINOR** | `pages/chapters/dashboard.html` | Dashboard view — arguably not searchable content |
| 7 | **MINOR** | `pages/chapters/placeholder.html` | Placeholder template — expected to be absent |

### Chapters in search-index but NOT in section-map.json: 18

These chapters are searchable but have no sub-section navigation:

| # | Severity | Chapter | Title |
|---|----------|---------|-------|
| 8 | **INFO** | ch27 | Economy, Trade & Piracy |
| 9 | **INFO** | ch28 | Tech Tree & Research |
| 10 | **INFO** | ch34 | The Galactic Compendium |
| 11 | **INFO** | ch35 | Empire Delegation |
| 12 | **INFO** | ch36 | Difficulty & Accessibility |
| 13 | **INFO** | ch38 | The Diegetic UI |
| 14 | **INFO** | ch39 | Audio Design |
| 15 | **INFO** | ch42 | Commanders & Dialogue |
| 16 | **INFO** | ch43-ai | The AI Director |
| 17 | **INFO** | ch44 | Development Priority Order |
| 18 | **INFO** | ch45 | Multi-Chat Workflow |
| 19 | **INFO** | appL | Prototype Implementation Log |
| 20 | **INFO** | appM | Project Development Checklist |
| 21 | **INFO** | suppG–suppK | Supplements |

**Recommended fix:** Add section-map entries for ch27, ch28, ch34–ch39, ch42–ch45 as content matures. These are INFO-level — no breakage, just incomplete sub-section nav.

---

## 3. Glossary vs Chapter Content

**Scope:** `js/glossary.js` — 23 terms defined

### Required faction terms audit:

| # | Severity | Term | In Glossary? | Notes |
|---|----------|------|-------------|-------|
| 22 | **MAJOR** | Mnemo-Cryst | NO | Core Eternal Shards mechanic (ch6, tech tree) |
| 23 | **MAJOR** | Communion | NO | Eternal Shards faction identity term |
| 24 | **MAJOR** | STRATEGOS-1 | NO | Terran League AI commander (ch5) |
| 25 | **MAJOR** | Caloric Equation | NO | Vorax core mechanic (ch10) |
| 26 | **MAJOR** | Abyssal Vacuum Biology | NO | Vorax visual signature (ch10) |
| 27 | **MAJOR** | Forged Construct | NO | Scrap-Horde key unit concept (ch7) |
| 28 | **MAJOR** | The Warmth | NO | Core Guardians faction identity (ch11) |
| 29 | **MAJOR** | Dark Space | NO | Major lore/setting concept |
| — | OK | Warden-Commander | YES | Present |
| — | OK | Tendril (singular) | YES | Present (user may search "Tendrils" plural) |

**8 of 10 checked terms are missing from the glossary.**

**Recommended fix:** Add glossary entries for all 8 missing terms. These are prominent faction-defining terms that readers will encounter repeatedly.

---

## 4. Faction Data Files

### 4a. Unit Counts

| Faction | Units | Expected | Status |
|---------|-------|----------|--------|
| Core Guardians | 15 | 15 | PASS |
| Eternal Shards | 15 | 15 | PASS |
| Revenant | 15 | 15 | PASS |
| Scrap-Horde | 15 | 15 | PASS |
| Terran League | 15 | 15 | PASS |
| Unity Accord | 15 | 15 | PASS |
| Vorax | 15 | 15 | PASS |

**All 7 factions: 15/15 units. No issues.**

### 4b. Tech Node Counts

| Faction | Type | Branches | Nodes | Expected | Status |
|---------|------|----------|-------|----------|--------|
| Core Guardians | NPC | 3 | 12 | 12 | PASS |
| Eternal Shards | Playable | 4 | 20 | 20 | PASS |
| Revenant | Playable | 4 | 20 | 20 | PASS |
| Scrap-Horde | Playable | 4 | 20 | 20 | PASS |
| Terran League | Playable | 4 | 20 | 20 | PASS |
| Unity Accord | Playable | 4 | 20 | 20 | PASS |
| Vorax | NPC | 3 | 12 | 12 | PASS |

**All 7 factions match expected counts. No issues.**

### 4c. Equipment Slot Coverage

| # | Severity | Faction | Issue |
|---|----------|---------|-------|
| 30 | **MAJOR** | Eternal Shards | Units reference `[SP]` (Special) equipment slot — no `[SP]` items defined in equipment file |
| 31 | **MAJOR** | Revenant | Same — `[SP]` slot referenced, no equipment defined |
| 32 | **MAJOR** | Scrap-Horde | Same — `[SP]` slot referenced, no equipment defined |
| 33 | **MAJOR** | Terran League | Same — `[SP]` slot referenced, no equipment defined |
| 34 | **MAJOR** | Unity Accord | Same — `[SP]` slot referenced, no equipment defined |

**All 5 playable factions reference `[SP]` slots on Super-Heavy/high-rank units but no faction has `[SP]` equipment items defined.** Either create placeholder [SP] items or mark these slots as future/planned.

### 4d. Stat Key Ordering

All 105 units use identical 23-key stat ordering. Base stats only — Equipment, Supply Penalty, Space Combat Ground Mod, and Rank Multipliers are applied at runtime. **No structural issues.**

### 4e. Equipment Cross-References (Tech → Equipment)

Tech tree equipment unlock references (e.g., Eternal Shards Branch 1 T3 → "Void Scythe") match items in corresponding equipment files. **No broken tech→equipment references found.**

---

## 5. Anchor Integrity (Internal Links)

**Scope:** All `href="#..."` and `href="page.html#..."` links in chapter files

This is a single-page application — all internal navigation uses `href="#chapterId"` with hash routing via `Nav.route()` → `ChapterLoader.load()`.

- **35 internal links** found across chapter HTML files
- **~50 links** in `js/dashboard.js` and other JS modules
- **25 unique chapter targets** referenced
- All resolve to existing HTML files or valid route aliases (appA–appF → appendices.html)
- All 6 appendix scroll anchors (`sec-appendices-0` through `sec-appendices-5`) verified present

**Broken internal links found: 0**

---

## 6. Service Worker Cache List

**Scope:** `js/service-worker.js` — `PRECACHE_URLS` array (cache version `aoc-gdd-v190`)

### 6a. Files in precache that don't exist on disk: **0** (all valid)

### 6b. Files missing from precache

**JS files missing (loaded by index.html but not precached):**

| # | Severity | File | Impact |
|---|----------|------|--------|
| 35 | **CRITICAL** | `/js/planet-renderer.js` | Planet rendering breaks offline |
| 36 | **CRITICAL** | `/js/planet-textures.js` | Planet textures break offline |

**Boot-critical data files missing:**

| # | Severity | File | Impact |
|---|----------|------|--------|
| 37 | **CRITICAL** | `/data/nav/section-map.json` | Eagerly loaded at boot alongside nav-data.json and factions.json — sub-section nav breaks offline |

**Core renderer data files missing:**

| # | Severity | File | Impact |
|---|----------|------|--------|
| 38 | **MAJOR** | `/data/sprites/unit-sprites.json` | Unit sprite rendering breaks offline |
| 39 | **MAJOR** | `/data/sprites/shapes.json` | Shape primitives break offline |
| 40 | **MAJOR** | `/data/icons/build-icons.json` | Build icons break offline |
| 41 | **MAJOR** | `/data/icons/equip-icons.json` | Equipment icons break offline |
| 42 | **MAJOR** | `/data/factions/faction-emblems.json` | Dashboard faction emblems break offline |
| 43 | **MAJOR** | `/data/planets/planets.json` | Planet card rendering breaks offline |
| 44 | **MAJOR** | `/data/planets/planet-svg.json` | Planet SVG artwork breaks offline |
| 45 | **MAJOR** | `/data/formations/formations.json` | Formation card rendering breaks offline |

**Note:** Faction-specific data files (units, equipment, tech, dialogue) are loaded on-demand and cached via fetch interception — less critical but still gaps for full offline support.

---

## 7. JS Module Loading

**Scope:** All `<script>` tags in HTML files → `js/` directory

- `index.html` loads 19 JS files + 1 CDN script (three.js) — **all exist**
- `404.html` — no script tags
- `pages/chapters/*.html` — no script tags (loaded as HTML fragments)
- `data-loader.js` spawns Web Worker from `js/data-worker.js` — **exists**

**Broken script references found: 0**

---

## TOP 10 PRIORITY FIXES

| Priority | ID | Severity | Category | Fix |
|----------|-----|----------|----------|-----|
| **1** | #35 | CRITICAL | SW Cache | Add `/js/planet-renderer.js` to PRECACHE_URLS |
| **2** | #36 | CRITICAL | SW Cache | Add `/js/planet-textures.js` to PRECACHE_URLS |
| **3** | #37 | CRITICAL | SW Cache | Add `/data/nav/section-map.json` to PRECACHE_URLS |
| **4** | #1 | CRITICAL | Nav Anchor | Add `id="sec-ch13-planets"` to ch13.html |
| **5** | #2 | CRITICAL | Nav Anchor | Add `id="sec-ch13-megastructures"` to ch13.html |
| **6** | #3 | CRITICAL | Nav Anchor | Add `id="sec-ch18-10"` to ch18.html |
| **7** | #30–34 | MAJOR | Equipment | Define `[SP]` slot equipment for all 5 playable factions |
| **8** | #22–29 | MAJOR | Glossary | Add 8 missing faction terms to glossary.js |
| **9** | #4 | MAJOR | Nav Anchor | Fix `sec-appM-0` mapping (appendices vs appM) |
| **10** | #5 | MAJOR | Search Index | Add `appendices.html` to search-index.json |

**Overall health:** The data layer is solid — all 105 units, all tech trees, and all internal links check out. The main gaps are: service worker precache missing 2 JS files and boot-critical data, 3 broken section-map anchors, missing glossary terms, and undefined [SP] equipment slots.
