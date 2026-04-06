# CC-126 — MASTER AUDIT REPORT

**Generated:** 2026-04-05
**Source reports:** 16 sub-reports (Parts I–XIII, Part VI-Redo, Data, Code, Cross-Ref)
**Scope:** All chapter HTML files (ch1–ch46, appendices, supplements), 48 JSON data files, 23 JS modules, cross-reference integrity
**Mode:** READ-ONLY audit — no files modified

---

## 1. Executive Summary

| Severity | Raw Count | After De-dup | % of Total |
|----------|-----------|-------------|------------|
| CRITICAL | 28 | 25 | 12% |
| MAJOR | 67 | 58 | 27% |
| MINOR | 112 | 97 | 45% |
| INFO | 65 | 35 | 16% |
| **TOTAL** | **272** | **215** | **100%** |

**Top 5 systemic issues (by blast radius):**
1. **Canon count contradictions** — Tech nodes (16 vs 20), buildings (15 vs 20), equipment (74 vs 208) propagated across 15+ files
2. **Non-canonical card borders** — `border-top` and/or `2px` instead of canonical `border-left:3px solid` across 50+ cards in 20+ chapters
3. **camelCase in data files** — 40+ key names use camelCase instead of snake_case across all unit, tech, equipment, and search JSON files
4. **Revenant faction color** — 4 different hex values across data files, sprites, and nav; ch8/ch9 nav colors appear swapped
5. **Missing destroy()/cleanup** — 6 JS modules lack teardown methods, leaking event listeners, rAF loops, and observers

---

## 2. Tier 1 — CRITICAL Fixes

### 2.1 Canon Count Contradictions (Systemic)

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-01 | Tech tree headers read "16 Nodes" / "4 Branches x 4 Tiers" — canon is **20 nodes** per playable faction (4 Branches x 5 Tiers). Data files confirm 20. | ch5:891, ch6:686, ch7:839, ch8:888, ch9:240 | Part II A1 |
| CR-02 | "Building Catalog — 15 Types" contradicts canon of **20 buildings/faction** (140 total). Icons JSON and dashboard confirm 20/faction. | ch15:123, ch16:5 | Part IV A1, A2 |
| CR-03 | "Full 80-node tree" for Terran — should be **20-node** (same page subtitle says 20). | ch28:45 | Part VIII A1 |
| CR-04 | suppG subtitle says "4 Branches x 4 Tiers Each" (=16) — canon is 20/playable, 12/NPC. Also claims "5 Factions" but uses the all-7-faction total of 124 nodes. | suppG:4,8 | Part XII A1, A2 |
| CR-05 | "42 Features" in AI Director subtitle — actual count is **40** (verified by section enumeration). | ch43-ai:4 | Part X A1 |
| CR-06 | Appendix D heading says "All 16 Core Guardian Units" — canon is **15** per faction. Spark-Mote appears twice (solo + formation). | appendices:63 | Part XI I1 |
| CR-07 | Appendix B CROSS column total shows **16**, but column values sum to **32** (5+4+4+0+3+16). Grand total 208 only works with CROSS=32. | appendices:36 | Part XI I2 |

**Fix:** Regex sweep for stale counts, then manual verification per file. See S7 Systemic Patterns.

### 2.2 Stale/Contradictory Game Systems

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-08 | Ground CP Abilities section lists 7 generic abilities (Energy Shield, Reinforcement Drop, Artillery Barrage, Orbital Strike, etc.) that **contradict Ch21's redesigned system** of 3 universals + 6 faction-specific per faction. Orbital Strike is listed as universal but is Terran-specific per Ch21. Entire section is stale. | ch19:239-248 | Part V A1, L1, S1 |
| CR-09 | Formation change cost stated as **"1 CP"** in opening paragraph but **"PH 2 CP"** in CP Costs card — internal contradiction within same chapter. | ch18:10 vs ch18:55 | Part V A2 |
| CR-10 | Territory count ranges **disagree between Appendix E and L.9.6** for 8 of 12 planet types (Capital, Ocean, Jungle, Ice, Ruins, Gas Giant, Station, Dead World). | appendices:88-102 vs appL:374-389 | Part XI I3 |

### 2.3 Visible Untagged Placeholders

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-11 | Visible "TODO balance pass" text without `<span class="ph-tag">PH</span>` tag — Safe-Purge Cost rule. | ch13:722 | Part III S1 |
| CR-12 | Visible "TODO balance pass" text without PH tag — Loot-Table Crack Reward rule. | ch13:734 | Part III S2 |

### 2.4 Data Integrity — Missing Content

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-13 | `data/buildings/` directory exists but contains **0 files**. Canon requires 140 buildings (20/faction x 7). `build-icons.json` already has 140 matching SVG icons. | data/buildings/ | Data A1 |
| CR-14 | Total equipment entries = **74**; canon requires **208** (shortfall of 134, only 35.6% coverage). | data/equipment/*.json | Data A2 |

### 2.5 Revenant Faction Color — 4-Way Mismatch

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-15 | Revenant has **4 different colors** across data files: `#00e070` (factions.json), `#44ff66` (faction-colors.json), `#44ff88` (faction-logos.json SVG), `#AA77FF` (nav-data.json). | data/factions/*.json, data/nav/nav-data.json | Data V1 |
| CR-16 | Nav-data: ch8 (Revenant) uses `#AA77FF` (purple) and ch9 (Accord) uses `#44ff66` (green) — **neither matches canonical faction colors; appears swapped and wrong**. | data/nav/nav-data.json:17-18 | Data V2 |
| CR-17 | Revenant SpriteFactory fill `#44ff88` and Accord fill `#44ff66` are nearly identical greens (delta-E < 10), violating "triple-redundancy identification" principle. | ch37:26-27 | Part IX V1 |

### 2.6 Dead/Broken JS Functionality

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-18 | `startViz()` starts rAF loop but **no `stopViz()` exists** — `cancelAnimationFrame` never called. Visualizer loop runs forever once started, leaking CPU. | audio-engine.js:727-750 | Code C1 |
| CR-19 | `this.raycaster = new THREE.Raycaster()` created in constructor then **immediately overwritten** by `_setupRaycaster()` — wasted allocation. | solar-system.js:91+618 | Code C2 |
| CR-20 | `var ab` declared twice in same function scope (lines 190 and 198) — `var` hoisting makes it work but shadows intent and is error-prone. | chapter-loader.js:190+198 | Code C3 |
| CR-21 | `this.loadChapterMeta()` (async) called **without `await`** — `this._chapterMeta` may be null when accessed on first chapter load. | chapter-loader.js:106 | Code C4 |
| CR-22 | References "TERRAN_TECH data object (Block 18)" and renders into `#terran-tech-ch28`, but **no JS file defines `TERRAN_TECH`** — container will always be empty. | ch28:45-46 | Part VIII C1 |

### 2.7 Duplicate/Stale Content Blocks

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| CR-23 | Entire "Empire Delegation (Ch 35)" section is **duplicated** — ch35.html already contains the same cards with near-identical text. Content drift risk. | ch33:97-118 | Part VIII S1 |

---

## 3. Tier 2 — MAJOR Fixes

### 3.1 Lore Mismatches

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MJ-01 | Accord Commander called "Military AI" in personality table but "Consensus Engine (STRATEGOS-1)" in origin card. | ch4:118 vs ch4:42 | Part I L1 |
| MJ-02 | "Celestial Dominion hull plating" — not one of the 7 locked-canon factions. | ch7:730 | Part II L1 |
| MJ-03 | Guardian architecture described as "Millions of years old" contradicting "tens of thousands of years" used 4x in same file. | ch11:303 vs ch11:24,30,31,32 | Part II L2 |
| MJ-04 | "Tyrant" alignment referenced in core world notes but only 3 alignments defined in Win Conditions (Vanguard, Architect, Pragmatist) — Tyrant undefined in ch12. | ch12:229,295 | Part III L1 |
| MJ-05 | Morale Gains references "Rally CP ability" — no such universal ability exists in Ch21 redesign. | ch19:266 | Part V L2 |
| MJ-06 | Guardian leader called "the Warden" — every other chapter uses "Warden-Commander". | ch31:15 | Part VIII L1 |
| MJ-07 | Revenant SpriteFactory fill `#44ff88` (mint green) but `--revenant` CSS var is `#AA77FF` (purple), and ch37:39 describes Revenant UI as "Purple-on-black". | ch37:26 | Part IX L1 |
| MJ-08 | "VORAX COLLECTIVE" in faction-names.json — canon name is "Vorax". | data/factions/faction-names.json:6 | Data L1 |

### 3.2 Visual/Style — Significant

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MJ-09 | Genre Fusion cards use `border-top:2px solid` — wrong direction AND wrong width vs canonical `border-left:3px solid`. | ch1:15-18 | Part I V1 |
| MJ-10 | Five Phase loop cards use `border-top:3px` — wrong direction. | ch2:10-14 | Part I V2 |
| MJ-11 | Two-Phase Structure cards use `border-top:3px` — wrong direction. | ch3:180,189 | Part I V3 |
| MJ-12 | Vanguard alignment color inconsistent: `var(--horde)` in ch3 but `var(--vorax)` in ch4. | ch3:87 vs ch3:274, ch4:142 | Part I V4, V5 |
| MJ-13 | Architect doctrine card uses `border-top:3px solid var(--terran)` but stated HUD color is `--architect`. | ch25:11 | Part VII V1 |
| MJ-14 | Design inspiration cards use `border-top:2px` — wrong direction AND wrong width. | ch19b:11,15,19 | Part IV V4 |
| MJ-15 | Uncommon rarity color inconsistent across factions: `#44ff88` (Terran, Vorax) vs `#44cc66` (Shards, Revenant, Accord). | data/equipment/*.json | Data V3 |

### 3.3 Inaccuracies — Significant

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MJ-16 | CP abilities listed as flat "PH 2 CP each" but Ch21 shows varied costs (1-5 CP). | ch18:57 | Part V A3 |
| MJ-17 | Frigate HP range "200-400" but MVP Frigate HP = 120, outside range. | ch18:405 vs ch18:158 | Part V A4 |
| MJ-18 | Section labeled "S2.4.5 — Approach Phase Costs" — numbering from a different chapter. | ch18:273 | Part V A5 |
| MJ-19 | "All 6 slots available" at General rank, but only 3 types named; data files define 5; dashboard says 4. Number 6 unsubstantiated. | ch30:40 | Part VI-redo A1 |
| MJ-20 | Subtitle promises "30+ Event Templates" but only 6 random event types listed. | ch29:5 | Part VI-redo A2 |
| MJ-21 | "~70 lines per commander from 400+ bank" contradicts "20-30 lines per named enemy commander" in same paragraph. | ch42:19 | Part IX A1 |
| MJ-22 | "5 Faction Skins" omits playable Vorax and playable Guardians (canon playable variants). | ch37:33 | Part IX A2 |
| MJ-23 | appM lists Deployment/Map scenes as NOT DONE, but appL shows Godot rewrite milestones as COMPLETE. | appM:28-29 vs appL | Part XI I4 |
| MJ-24 | Meta & Business sub-chat chapter coverage disagrees between ch43 ("32-33, 36, 43-44") and ch45 ("32-36, 43"). Double-assigns ch34/35 and omits ch44. | ch45:15 vs ch43:71 | Part X A2, A3 |

### 3.4 Code Issues — Significant

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MJ-25 | Duplicate `style` attribute on 3 elements — HTML spec discards second attribute, so `padding-left:12px` never applied. | ch23:160,161,162 | Part VI-redo C1-C3 |
| MJ-26 | MVP Building table header defines 5 grid columns but data rows define 4 — columns misalign. | ch16:13-14 | Part IV C1 |
| MJ-27 | `<div id="building-list">` is empty and no JS renderer targets this ID — orphaned container. | ch15:125 | Part IV C2 |
| MJ-28 | `<div id="building-list-ch16">` same orphaned empty container. | ch16:36 | Part IV C3 |
| MJ-29 | `bindRouting()` adds hashchange, keydown, touch, click listeners never removed — no destroy() method. | nav.js | Code C5 |
| MJ-30 | `MutationObserver` instances per `.planet-detail` never disconnected on unload — accumulate. | content-renderers.js:181-200 | Code C7 |
| MJ-31 | `fadeOutId`/`fadeInId` store rAF ID but ref's `.id` assigned inside first callback — cancel may use stale ID. | music-player.js:132-142 | Code C8 |
| MJ-32 | `window.addEventListener('scroll', updateParallax)` never removed — no Dashboard destroy(). | dashboard.js:1129 | Code C9 |
| MJ-33 | `HoloTilt.init()` commented out but `HoloTilt.destroy()` still called — asymmetric lifecycle. | visual-effects.js:464-477 | Code C10 |
| MJ-34 | `EPIGRAPH_QUOTES` array + cycler + timer all exist but `buildEpigraph()` returns '' — dead code with no DOM targets. | dashboard.js:216-226+996-1022 | Code C11, S1 |
| MJ-35 | `buildStrategistQuote()` defined but never called from `render()` — dead code. | dashboard.js:315-324 | Code C12, S2 |
| MJ-36 | `_factions: null` property never populated or read — dead state. | search.js:32 | Code C6 |
| MJ-37 | "See S12.11" cross-ref points to nonexistent anchor — no `sec-ch12-11` in ch12. | ch31:11 | Part VIII C2 |
| MJ-38 | Sections L.1-L.9 lack `id` attributes (un-linkable) while L.10-L.16 have them. | appL:9-295 | Part XI C1 |
| MJ-39 | L.2 stat block cards reference outdated section numbers (L.9.2, L.9.3, L.4, L.10 don't match current layout). | appL:56-87 | Part XI S1 |
| MJ-40 | Script manifest comment says "15 files total" but 21 scripts loaded. Misnames loader, missing 6 scripts. | index.html:226-248 | Part XIII A1-A3 |
| MJ-41 | Dashboard no `destroy()` — canvas renderers, scroll listeners, quote timers, observers have no teardown. | dashboard.js | Code M1 |
| MJ-42 | `data/equipment/*.json`: `proto` and `statBlock` keys exist only on 8/16 Terran entries, absent from all 66 other-faction entries. | data/equipment/*.json | Data M1 |

---

## 4. Tier 3 — MINOR Fixes

### 4.1 Border Width Deviations (2px to 3px)

All cards below use `border-left:2px` instead of canonical `border-left:3px`:

| # | Files:Lines | Card Count | Citation |
|---|------------|------------|----------|
| MN-01 | ch12:199-307 | 10 Core World cards | Part III V1 |
| MN-02 | ch16:70,74,78 | 3 War Factory cards | Part IV V1 |
| MN-03 | ch17:12,16,20 | 3 Auto-Battle cards | Part IV V2 |
| MN-04 | ch17:92,101,110 | 3 Cover/Elevation/Garrison cards | Part IV V3 |
| MN-05 | ch22:69-75 | CP ability cards (also border-top) | Part VI-redo V2 |
| MN-06 | ch32:13-15 | Difficulty-mode cards (also border-top) | Part VIII V1 |
| MN-07 | ch43-ai:288,292,296 | 3 Simulation Layer cards | Part X V2 |

### 4.2 Border Direction Deviations (border-top to border-left)

Cards using `border-top` instead of canonical `border-left`:

| # | Files:Lines | Card Count | Citation |
|---|------------|------------|----------|
| MN-08 | ch18:526-549 | Space environment cards (also 2px) | Part V V2 |
| MN-09 | ch19:288-310 | Faction morale cards | Part V V1 |
| MN-10 | ch24:68-70 | Resource cards (also 2px) | Part VII V4 |
| MN-11 | ch25:11-13 | Doctrine cards | Part VII V6 |
| MN-12 | ch27:9-11 | Resource cards (also 2px) | Part VII V5 |
| MN-13 | ch30:12-18 | Promotion chain cards (also 2px) | Part VI-redo V3 |

### 4.3 Color/Style Inconsistencies

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MN-14 | Core Pillar cards have faction heading colors but no card border at all. | ch1:36-39 | Part I V6 |
| MN-15 | Advisor Chemistry card lacks `border-left:3px` present on sibling cards. | ch5:1073 | Part II V2 |
| MN-16 | Slaughter-Brute HP colored `var(--revenant)` instead of `var(--horde)`. | ch7:766 | Part II V3 |
| MN-17 | Orbital Strike CP cost uses `var(--vorax)` in Unity Accord's CP table. | ch9:168 | Part II V4 |
| MN-18 | Vanguard doctrine card uses `var(--horde)` instead of `var(--vanguard)` (values match but wrong semantic var). | ch25:12 | Part VII V2 |
| MN-19 | Tyrant doctrine card uses `var(--guardians)` instead of `var(--tyrant)` (values match but wrong semantic var). | ch25:13 | Part VII V3 |
| MN-20 | General rank row mixes `var(--accord)` for name with `var(--vorax)` for threshold. | ch22:39-40 | Part VI-redo V1 |
| MN-21 | Legendary rarity color `#44ff66` nearly identical to Uncommon `#44cc66` — both green. | ch20:174 | Part V V3 |
| MN-22 | Faction Comparison Matrix uses `--revenant` color for Terran attributes. | appendices:52 | Part XI V1 |
| MN-23 | L.10.8 table uses hardcoded hex instead of CSS variables; hex values don't match palette. | appL:509-513 | Part XI V2 |
| MN-24 | Sound & Atmosphere cards have no `border-left` at all (other cards on page have it). | ch43-ai:186-197 | Part X V1 |
| MN-25 | Missing `stat-placeholder-banner` on ch42 (all other chapters include it). | ch42:1 | Part IX V2 |
| MN-26 | Unity Accord and Core Guardians share identical color `#ffaa22` in data files. | data/factions/faction-colors.json | Data V4 |

### 4.4 Lore / Content Minor

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MN-27 | "Necro-Legion" used once; rest of ch13 uses "Revenant" consistently. | ch13:909 | Part III L2 |
| MN-28 | "Volatile Death chain reactions" term undefined in ch12 or cross-referenced. | ch12:322 | Part III S4 |
| MN-29 | Ch33 subtitle says "Chapters 33-34" but contains Ch 35 content too. | ch33:5 | Part VIII A2 |
| MN-30 | "vorax collective" in search-synonyms propagates non-canonical name. | data/search-synonyms.json:43 | Data L2 |

### 4.5 Stale/TBD Content

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MN-31 | Visible "TODO balance pass" without PH tag (Breach Composition). | ch13:751 | Part III S3 |
| MN-32 | "General rank stat modifier TBD" in ch15. | ch15:114 | Part IV S1 |
| MN-33 | "TBD%" for General rank stat modifier in ch20. | ch20:162 | Part V S2 |
| MN-34 | "TBD flag" for General stat modifier in ch22. | ch22:41 | Part VI-redo S1 |
| MN-35 | General stat modifier footnote repeated in ch30 (duplicate of ch22 open flag). | ch30:19 | Part VI-redo S2 |
| MN-36 | "Other 12 names TBD in Phase 3" not tagged with PH banner or flag marker. | ch23:74 | Part VI-redo S3 |
| MN-37 | "roster TBD" text not tagged with PH marker. | ch5:1118 | Part II S1 |
| MN-38 | "TBD -- OPEN FLAG" visible without placeholder tag. | ch8:829 | Part II S2 |
| MN-39 | `"composer": "TBD"` on all 9 audio tracks. | data/audio/tracks.json | Data S1 |
| MN-40 | Orphaned `"placeholder"` entry in chapter-meta (32 words, not referenced). | data/nav/chapter-meta.json:260-264 | Data S2 |
| MN-41 | Orbital Station `special` field contains `"(PH decision...)"` note. | data/planets/planets.json:191 | Data S3 |
| MN-42 | Dead World `special` field contains `"(PH system...)"` note. | data/planets/planets.json:206 | Data S4 |
| MN-43 | Additional PH notes scattered in planets.json prose fields. | data/planets/planets.json | Data S5 |
| MN-44 | L.7 items #8-9 are JS/Web Audio issues, not Godot engine gotchas. | appL:273-274 | Part XI S2 |
| MN-45 | Section heading `id="sec-ch37-0"` text includes "Diegetic UI" (ch38's topic). | ch37:9 | Part IX S1 |
| MN-46 | Worldship planet yield is `"?... ?I ?Inf"` — placeholder value. | data/planets/planets.json:267 | Data A4 |

### 4.6 Code Issues — Minor

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| MN-47 | `<circle>` uses `rx`/`ry` attributes (only valid on `<ellipse>`). | ch6:374 | Part II C1 |
| MN-48 | Mixed inline text and block `<div>` without proper wrapping. | ch9:556 | Part II C2 |
| MN-49 | Stale chapter boundary comment from legacy single-file layout. | ch11:421-423 | Part II C3 |
| MN-50 | `sec-ch13-containment-breach` anchor on inner div, not on `<h2>` like other sections. | ch13:679 | Part III C1 |
| MN-51 | Starting inventory header/data row grid column mismatch. | ch5:809-810 | Part II A2 |
| MN-52 | No section heading with anchor for ch4 Commander Origins. | ch4:8-50 | Part I M1 |
| MN-53 | No section heading with anchor for ch27 resource overview. | ch27:8 | Part VII C1 |
| MN-54 | "progress transfers to Archive (see Ch. 33)" — no link provided. | ch12:186 | Part III M1 |
| MN-55 | Containment Breach section has no proper section-label + section-heading pair. | ch13:679-791 | Part III M2 |
| MN-56 | Faction morale section covers only 5 factions; Vorax and Guardians absent. | ch19:287-313 | Part V M1 |
| MN-57 | Ch29 has only 2 sections — no "Great Reclamation" despite page title including it. | ch29:1-31 | Part VI-redo M2 |
| MN-58 | "Each Rank = +1 Equipment Slot" body doesn't enumerate slot types per rank. | ch30:34-42 | Part VI-redo M1 |
| MN-59 | Only Terran tech tree in ch28; other 6 factions have no sections. | ch28:44-47 | Part VIII M1 |
| MN-60 | "Canonical System IDs" heading lists only `sys-nexus`; plural misleading. | ch32:27 | Part VIII M2 |
| MN-61 | SpriteFactory palette lists only 5 of 7 factions (Shards, Vorax absent). | ch37:16-31 | Part IX M1 |
| MN-62 | SpriteFactory palette entries for Revenant/Accord omit highlight colors. | ch37:23-30 | Part IX M2 |
| MN-63 | Diegetic UI section shows only 5 faction skins; no Vorax/Guardian treatment. | ch38:10-16 | Part IX M3 |
| MN-64 | `_escapeHtml()` defined but never called — dead code. | glossary.js:293-295 | Code C13 |
| MN-65 | `_bindUnitExpand()` is empty no-op stub. | faction-renderer.js:202-204 | Code C14 |
| MN-66 | `_hexToRgb()` / `_hexToRgbStr()` duplicated across modules. | faction-renderer.js:478, sprite-engine.js:81 | Code C15 |
| MN-67 | `_tick()` creates new `.bind(this)` per frame in solar-system.js. | solar-system.js:516+538 | Code C16 |
| MN-68 | Same `.bind(this)` per frame in canvas-galaxy.js. | canvas-galaxy.js:516+538 | Code C17 |
| MN-69 | `bindKeys()` keydown listener never removed. | search.js | Code C18 |
| MN-70 | `CACHE_VERSION='v49'` vs `CACHE_NAME='aoc-gdd-v199'` — no shared version source. | data-worker.js vs service-worker.js | Code C19 |
| MN-71 | `_prologueQuoteTimer` — no cleanup on navigate-away; old intervals stack. | dashboard.js:292 | Code C20 |
| MN-72 | Comet re-spawn uses `Math.random()` instead of `_seededRandom()` — breaks determinism. | canvas-galaxy.js:756-767 | Code C21 |
| MN-73 | `buildEpigraph()` still called in render chain despite returning ''. | dashboard.js:134 | Code C22 |
| MN-74 | `activeSide` initialized before audio elements exist — fragile null path. | music-player.js:18 | Code C23 |
| MN-75 | Three.js CDN URL hardcodes `r128`; stale if service-worker changes. | three-loader.js:9 | Code C24 |
| MN-76 | Multiple `setTimeout` for note sequencing not cancellable on audio close. | audio-engine.js | Code C25 |
| MN-77 | `buildEpigraph()` function index says "Removed" but method still exists and is called. | dashboard.js:27 | Code S3 |
| MN-78 | `buildStrategistQuote()` index says "Removed" but method still exists. | dashboard.js:29 | Code S4 |
| MN-79 | `FactionCursor` is complete no-op stub still called from init/destroy paths. | visual-effects.js:212 | Code S5 |
| MN-80 | Comment in `_setupRaycaster()` about speculative future use. | solar-system.js:619-621 | Code S6 |
| MN-81 | `stopViz()` / `destroyViz()` missing from audio-engine public API. | audio-engine.js | Code M2 |
| MN-82 | nav.js has no `destroy()` despite binding 5+ global listeners. | nav.js | Code M3 |
| MN-83 | No chapter-meta entries for appendices appA-appF. | data/nav/chapter-meta.json | Data M2 |
| MN-84 | section-map.json missing entries for ~20 chapters/appendices/supplements. | data/nav/section-map.json | Data M3 |
| MN-85 | search-index has no per-appendix entries (only combined "appendices"). | data/search-index.json | Data M4 |
| MN-86 | Asteroid Field/Nebula SVG entries have no matching planet type in planets.json. | data/planets/planet-svg.json | Data M5 |
| MN-87 | camelCase keys in audio tracks.json (5 keys). | data/audio/tracks.json | Data C7 |
| MN-88 | camelCase keys in planets.json (11 keys). | data/planets/planets.json | Data C8 |
| MN-89 | camelCase keys in unit-loadouts.json (rarityColor). | data/loadouts/unit-loadouts.json | Data C9 |
| MN-90 | Vorax/Guardians use string values where other factions use numbers — type inconsistency. | data/factions/factions.json:116-140 | Data C10 |
| MN-91 | Line-ending inconsistency across unit JSON files (LF vs CRLF). | data/units/*.json | Data C11 |
| MN-92 | Line-ending inconsistency across tech JSON files. | data/tech/*.json | Data C12 |
| MN-93 | Service worker comment says "JS modules (21)" but 22 are listed. | service-worker.js:130 | Code A1 |
| MN-94 | `e.userChoice.then()` accessed before `prompt()` called — may silently fail. | index.html:451 | Part XIII C2 |
| MN-95 | Orphaned "Back-to-top button" comment with no surrounding code. | index.html:436 | Part XIII S1 |
| MN-96 | Script manifest references "r128" Three.js and "CDN" — neither applies. | index.html:226-248 | Part XIII S2 |
| MN-97 | `<canvas id="dashboard-canvas">` wrapper open/close tag mismatch. | dashboard.html:1 | Part XIII C1 |

---

## 5. Tier 4 — INFO Notes

| # | Finding | Files | Citation |
|---|---------|-------|----------|
| IN-01 | "Forerunner" term (Halo-associated) used for visual descriptors. | ch11:299,303 | Part II L3 |
| IN-02 | All 7 faction emblem SVGs use `viewBox="0 0 100 100"` vs canonical `52 52`. | ch5-ch11 | Part II V5 |
| IN-03 | `<clipPath>` placed outside `<defs>` — valid but non-standard. | ch5:195-197 | Part II C4 |
| IN-04 | `<clipPath>` inside `<g>` instead of `<defs>`. | ch5:450-452 | Part II C5 |
| IN-05 | `<clipPath id="uag-clip">` defined but never referenced. | ch9:51 | Part II C6 |
| IN-06 | Section `sec-ch11-6` placed after `sec-ch11-13` — broken numerical order. | ch11:401 | Part II C7 |
| IN-07 | JS-populated containers render blank if JS/data fails — no fallback. | ch5-ch11 | Part II M1 |
| IN-08 | `vorax-buildings` container relies on missing `data/buildings/vorax.json`. | ch10:279-281 | Part II M2 |
| IN-09 | Cross-refs `href="#ch13"` could use more specific section anchors. | ch14:14,22 | Part III C2 |
| IN-10 | Dashboard "15 building types" text (out of chapter audit scope). | dashboard.js:819 | Part IV A3 |
| IN-11 | Page subtitle says "Chapters 20-21" but Ch21 is CP Abilities, not equipment. | ch20:5 | Part V A6 |
| IN-12 | "Appendix L open flags" reference — verify appendix exists. | ch20:164 | Part V M2 |
| IN-13 | HARASS and RAID standing orders have near-identical descriptions. | ch22:86,90 | Part VI-redo L1 |
| IN-14 | Advisor count "15" excludes playable Vorax/Guardian variants. | ch23:5,73 | Part VI-redo L2 |
| IN-15 | "(proposed)" vs "flag proposed" — inconsistent flagging within same table. | ch22:34,40 | Part VI-redo A3 |
| IN-16 | 12 "TBD" cells in 15-advisor table (expected Phase 3). | ch23:77-80 | Part VI-redo S4 |
| IN-17 | Intro mentions fleet-command/MISSION system but no section details it. | ch22:7 | Part VI-redo M3 |
| IN-18 | Non-Terran advisor personality details deferred to Phase 3. | ch23:73 | Part VI-redo M4 |
| IN-19 | Ch24 subtitle says "Chapters 24, 26-27" but contains ch29 preview. | ch24:5 | Part VII M1 |
| IN-20 | 100% Compendium vs Artifact chain requirement interaction unclear. | ch33:92 | Part VIII M3 |
| IN-21 | Empty `#terran-tech-ch28` renders blank with no fallback. | ch28:46 | Part VIII M4 |
| IN-22 | "Archive SD" abbreviation used without definition. | ch40:35 | Part IX M4 |
| IN-23 | ch37 duplicates UI/Audio sections also in ch38/ch39 — may double-render in SPA. | ch37:1-56 | Part IX C1 |
| IN-24 | ch43 includes ch45 workflow section despite subtitle only claiming ch43-44 scope. | ch43:60-73 | Part X M1 |
| IN-25 | Footer claims "46 CHAPTERS / 8 PARTS / 13 APPENDICES" — not verified. | appendices:129 | Part XI M1 |
| IN-26 | appL has no `stat-placeholder-banner` despite containing locked stat blocks. | appL | Part XI M2 |
| IN-27 | appM subtitle says "Generated March 11, 2026" — multiple milestones completed after. | appM:3 | Part XI S3 |
| IN-28 | `"The Revenant"` key in faction-logos.json; all others use slug keys. | data/factions/faction-logos.json:4 | Data L4 |
| IN-29 | Terran has 5 dialogue beats; other factions have 4. | data/dialogue/terran-league.json | Data L5 |
| IN-30 | Per-faction equipment distribution uneven (TL:16, others:9-11). | data/equipment/*.json | Data A3 |
| IN-31 | `color: null` on all non-faction search-index entries. | data/search-index.json | Data S6 |
| IN-32 | `ch43-ai` and `ch43` both use `num: "43"` — duplicate display number. | data/nav/nav-data.json:77,83 | Data M6 |
| IN-33 | All planet SVGs use 200x200 viewBox; icons use 52x52 — confirm intentional. | data/planets/planet-svg.json | Data M7 |
| IN-34 | Glossary terms "Exclusion Zone" and "Forged Construct" have zero page references — orphaned. | js/glossary.js | Cross-ref M1, M2 |
| IN-35 | Search synonym `vorax` maps to `"vorax collective"` — not a glossary term or chapter text. | data/search-synonyms.json | Cross-ref M4 |

---

## 6. Systemic Patterns — Batch-Fixable

### 6.1 border-top to border-left (Regex Sweep)

**Pattern:** `border-top:\s*[23]px\s+solid` to `border-left:3px solid`
**Affected files:** ch1, ch2, ch3, ch18, ch19, ch19b, ch22, ch24, ch25, ch27, ch30, ch32
**Estimated card count:** 40+ cards
**Citations:** Part I V1-V3; Part IV V4; Part V V1-V2; Part VI-redo V2-V3; Part VII V4-V6; Part VIII V1

### 6.2 border-left:2px to border-left:3px (Regex Sweep)

**Pattern:** `border-left:\s*2px\s+solid` to `border-left:3px solid`
**Affected files:** ch12, ch16, ch17, ch43-ai
**Estimated card count:** 22+ cards
**Citations:** Part III V1; Part IV V1-V3; Part X V2

### 6.3 camelCase to snake_case in Data JSON (Script Sweep)

**Pattern:** Rename all camelCase keys to snake_case across JSON data files.
**Key renames needed:**
- Units (105 files x 15+ keys): `atkDmg`, `atkSpd`, `moveSpd`, `critChance`, `critDamage`, `dmgType`, `armorType`, `leadershipRadius`, `scrapCost`, `buildCycles`, `supplyCost`, `sightRange`, `suppressResist`, `xpRate`, `abilityPower`, `bioAcid`
- Tech (7 files): `branchNum`
- Equipment (74 entries): `rarityColor`, `statBlock`
- Factions: `chapterId`, `mechanicName`
- Search-index (54 entries): `pageTitle`
- Audio: `defaultTrack`, `fadeIn`, `fadeOut`, `loopStart`, `loopEnd`
- Planets (11 keys): `avgTerr`, `fixedTerritory`, `defenderAdvantage`, `permanentTag`, `uniqueTerrain`, `weatherEvents`, `scanDiscoveries`, `revenantSleepers`, `svgKey`, `energyYield`, `parentInfluence`
- Loadouts: `rarityColor`

**JS consumers must also be updated** (grep for each key name).
**Affected files:** All 48 JSON data files + consuming JS modules
**Citations:** Data C1-C9

### 6.4 Tech Node Count Corrections (Manual + Search)

**Search terms:** `16 Nodes`, `4 Branches x 4 Tiers`, `4 x 4`, `16 nodes`, `80-node`
**Correct to:** `20 Nodes` / `4 Branches x 5 Tiers` (playable), `12 Nodes` (NPC)
**Affected files:** ch5, ch6, ch7, ch8, ch9, ch28, suppG
**Citations:** Part II A1; Part VIII A1; Part XII A1

### 6.5 Building Count Corrections

**Search terms:** `15 Building`, `15 building`, `15 Types`
**Correct to:** `20` per faction / `140` total
**Affected files:** ch15, ch16, dashboard.js
**Citations:** Part IV A1, A2; Part IV A3

### 6.6 Revenant Color Unification

**Decide on one canonical Revenant hex color** (likely `#AA77FF` to match purple identity described in ch37:39).
**Update in:** factions.json, faction-colors.json, faction-logos.json SVG, nav-data.json, ch37 SpriteFactory fill, equipment uncommon rarity colors.
**Fix ch8/ch9 nav swap** at the same time.
**Citations:** Data V1, V2; Part IX L1, V1

### 6.7 General Rank Stat Modifier TBD

**Pattern:** Multiple chapters flag "General rank stat modifier TBD" with varying tag styles.
**Files:** ch8:829, ch15:114, ch20:162, ch22:41, ch30:19
**Action:** Resolve the design decision or unify all instances under a single tracked open flag with consistent formatting.
**Citations:** Part II S2; Part IV S1; Part V S2; Part VI-redo S1, S2

### 6.8 Vorax/Guardian "5 vs 7 Factions" Count

**Pattern:** Multiple sections scope to "5 Factions" or "5 Faction Skins" but omit playable Vorax and Guardian variants.
**Files:** ch23:5, ch37:33, ch38:10-16, suppG:4
**Action:** Decide project-wide whether playable NPC variants count toward faction totals and update all references.
**Citations:** Part VI-redo L2; Part IX A2, M1, M3; Part XII A2

### 6.9 Line Ending Normalization

**Pattern:** Mixed LF/CRLF across data files.
**Files:** data/units/*.json, data/tech/*.json
**Action:** Normalize all to LF.
**Citations:** Data C11, C12

### 6.10 JS Module Cleanup — Missing destroy() Methods

**Pattern:** Modules add global listeners but never remove them.
**Affected modules:** nav.js, search.js, dashboard.js, music-player.js, audio-engine.js, content-renderers.js
**Action:** Add `destroy()`/`unbind()` methods to each; call from SPA teardown path.
**Citations:** Code C5, C7, C9, M1, M2, M3, M5, M7

---

## 7. Clean Areas — No Findings

### 7.1 Clean Chapter HTML Files
- ch14.html (Part III)
- ch10.html (Part II — INFO-only; no CRITICAL/MAJOR/MINOR)
- ch26.html (Part VII)
- ch34.html (Part IX)
- ch35.html (Part IX)
- ch36.html (Part IX)
- ch44.html (Part X)
- ch46.html (Part X)
- suppH.html (Part XII)
- suppI.html (Part XII)
- suppJ.html (Part XII)
- suppK.html (Part XII)

### 7.2 Clean Data Files
- `data/formations/formations.json` — 5 formations, clean schema
- `data/sprites/shapes.json` — 3 categories, pure coordinate data
- `data/sprites/unit-sprites.json` — 105 entries matching unit roster
- `data/icons/build-icons.json` — 140 entries (20/faction x 7), all `0 0 52 52`
- `data/icons/equip-icons.json` — 882 entries, all `0 0 52 52`
- `data/dialogue/core-guardians.json` — 4 beats, clean
- `data/dialogue/eternal-shards.json` — 4 beats, clean
- `data/dialogue/revenant.json` — 4 beats, clean
- `data/dialogue/scrap-horde.json` — 4 beats, clean
- `data/dialogue/unity-accord.json` — 4 beats, clean
- `data/dialogue/vorax.json` — 4 beats, clean

### 7.3 Clean JS Modules
- `js/three-loader.js` — minimal lazy-loader
- `js/decrypt-reveal.js` — self-contained animation
- `js/icon-renderer.js` — clean lookup, no side effects
- `js/planet-renderer.js` — proper `dispose()` with ResizeObserver cleanup
- `js/chapter-index.js` — proper `destroy()` / `_unbindEvents()` lifecycle
- `js/planet-textures.js` — pure IIFE, no state leaks
- `js/dev-mode.js` — properly paired add/remove listeners
- `js/data-worker.js` — clean Worker with IndexedDB versioning

### 7.4 Cross-Reference System
- **298/298** section-map IDs in perfect 1:1 sync with HTML
- **0 broken anchors** across all `href="#sec-*"` links
- **40/42** glossary terms have at least 1 page reference

### 7.5 Canon Count Verification (Passing)

| Category | Canon | Actual | Status |
|----------|-------|--------|--------|
| Units | 105 (15x7) | 105 | PASS |
| Tech Nodes | 124 (20x5 + 12x2) | 124 | PASS |
| Factions | 7 (5+2) | 7 | PASS |
| Build Icons | 140 | 140 | PASS |
| Unit Loadouts | 105 | 105 | PASS |
| Unit Sprites | 105 | 105 | PASS |

### 7.6 Canon Count Verification (Failing)

| Category | Canon | Actual | Gap |
|----------|-------|--------|-----|
| Equipment | 208 | 74 | **-134** |
| Buildings | 140 | 0 | **-140** |

---

*End of CC-126 Master Audit Report — 215 de-duplicated findings across 16 sub-reports.*
