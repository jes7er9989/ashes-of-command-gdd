# CC-104: Data Integrity + Rendering Completeness Audit
**Date:** 2026-04-04
**Branch:** dev
**Status:** READ-ONLY audit — no files modified

---

## Summary

| Category | Status | Issues |
|----------|--------|--------|
| Faction unit files (7×15) | **PASS** | 105/105 units present |
| Unit loadouts | **PASS** | 105/105 mapped |
| Unit sprites | **PASS** | 105/105 mapped |
| Unit icons file | **FAIL** | `data/icons/unit-icons.json` does not exist |
| Tech trees | **PASS** | 20 nodes × 5 playable, 12 nodes × 2 NPC |
| Equipment definitions | **PASS** | 74 items across 7 factions |
| Equipment ↔ loadout cross-ref | **WARN** | 67/74 equipment-definition items not referenced by any loadout |
| Equipment icons | **WARN** | 2 items missing icons (smart-quote key mismatch) |
| Building data | **FAIL** | 0/140 building JSON files exist (icons ready: 140/140) |
| Nav ↔ HTML pages | **WARN** | 6 nav entries have no HTML; 1 HTML not in nav |
| Section map completeness | **WARN** | 2 orphaned anchors; ~60+ HTML section IDs missing from map |
| Search index coverage | **PASS** | All existing HTML chapters covered |
| Glossary coverage | **WARN** | 0/7 faction names, 0/3 commanders in glossary |
| Placeholders / TBD | **WARN** | 38 stat-placeholder-banners, 4 standalone PLACEHOLDERs, 12+ TBD markers |
| JSON validity | **FAIL** | 7/44 files fail parse (BOM in all equipment JSONs) |

---

## 1. Faction Data Completeness

### Unit Files — ALL PASS (15 units each)

| Faction | File | Units |
|---------|------|-------|
| Terran League | `data/units/terran-league.json` | 15 |
| Eternal Shards | `data/units/eternal-shards.json` | 15 |
| Scrap Horde | `data/units/scrap-horde.json` | 15 |
| Revenant | `data/units/revenant.json` | 15 |
| Unity Accord | `data/units/unity-accord.json` | 15 |
| Vorax | `data/units/vorax.json` | 15 |
| Core Guardians | `data/units/core-guardians.json` | 15 |

### Tech Trees — ALL PASS

| Faction | Type | Nodes | Expected | Status |
|---------|------|-------|----------|--------|
| Terran League | Playable | 20 (4 tiers × 5) | 20 | PASS |
| Eternal Shards | Playable | 20 | 20 | PASS |
| Scrap Horde | Playable | 20 | 20 | PASS |
| Revenant | Playable | 20 | 20 | PASS |
| Unity Accord | Playable | 20 | 20 | PASS |
| Vorax | NPC | 12 (3 tiers × 4) | 12 | PASS |
| Core Guardians | NPC | 12 | 12 | PASS |

### Equipment File Counts

| Faction | Items |
|---------|-------|
| Terran League | 16 |
| Scrap Horde | 11 |
| Revenant | 10 |
| Unity Accord | 10 |
| Eternal Shards | 9 |
| Vorax | 9 |
| Core Guardians | 9 |
| **Total** | **74** |

---

## 2. Unit–Loadout Cross-Reference

- **Loadouts (`data/loadouts/unit-loadouts.json`):** 105 entries — all 105 units mapped. **PASS.**
- **Sprites (`data/sprites/unit-sprites.json`):** 105 entries — all 105 units mapped. **PASS.**
- **Unit Icons (`data/icons/unit-icons.json`):** File **does not exist**. **FAIL.**

---

## 3. Equipment Cross-Reference

### Equipment → Loadout Mapping

Only **7 of 74** equipment-definition items appear in any unit loadout. The loadouts contain **805 unit-specific items** (vehicle weapons, ship systems, etc.) that exist only in loadout data, not in equipment definition files.

**Orphaned equipment (67 items — not referenced by any loadout):**

- **Eternal Shards:** ALL 9 orphaned (Psychic-Edge Halberd, Mind-Shatter Projector, Void Scythe, Phase-Shift Weave, Soul-Stone Ward, Phase Jump Pack, Warp-Laced Rounds, Hybrid Crystal/Kinetic Slugs, Chronal Accelerator)
- **Revenant:** ALL 10 orphaned (Gauss Flayer, Void Blade, Staff of the Overlord, Necrodermis Shell, Resurrection Shroud, Resurrection Orb, Chronometron, Entropic Charge, Hybrid Gauss/Kinetic Slug, Temporal Stasis Field)
- **Vorax:** ALL 9 orphaned (Rending Talons, Acid Launcher, Spine Barrage, Chitinous Carapace, Regeneration Membrane, Spore Grenade, Synapse Relay Node, Venom-Tipped Rounds, Hive-Link Transmitter)
- **Core Guardians:** ALL 9 orphaned (Null-Lance, Arc Cannon, Verdict Pulse, Resonance Field, Ancient Plate, Stasis Sphere, Dimensional Anchor, Void-Charged Rounds, Warden Network)
- **Terran League:** 11 orphaned (Plasma Pistol, Fortress Plate, Frag Grenade Pack, Repair Kit, 'Thumper' Grenade Launcher, Magnetic Accelerator (Vehicle), Spinal MAC Gun (Ship), Repair Drone Beacon, Hybrid Rounds, TL-99 Marksman Rifle, Command Uplink)
- **Scrap Horde:** 10 orphaned ("Da Big Choppa", Nuclear Scrap Bomb, Spiked Armor, "Lucky Plate", Grog Flask, Waaagh! Banner, Acid-Dipped (Vorax salvage), Boom-Stick, Scrap-Weave Hide, Salvage Magnet)
- **Unity Accord:** 9 orphaned (Rail Rifle, Ion Accelerator, Shield Generator, Stealth Coating, Marker Light, Tactical Network Hub, Solid-State Tungsten, Seeker Rounds, Predictive Targeting AI)

### Equipment → Icon Mapping

`data/icons/equip-icons.json` has **877 entries** (covering both equipment-definition and loadout-only items).

**2 equipment items missing icons (smart-quote key mismatch):**
1. `"Da Big Choppa"` (scrap-horde) — curly quotes vs straight quotes
2. `"Lucky Plate"` (scrap-horde) — curly quotes vs straight quotes

---

## 4. Building Data

### CRITICAL GAP

- `data/buildings/` directory exists but is **empty** — 0 JSON files.
- Expected: 7 faction files with 20 buildings each (140 total).
- `data/icons/build-icons.json` is fully populated with **140 entries** (20 per faction × 7).

**Icons are ready; data files are completely missing.**

---

## 5. Search Index Coverage

- `data/search-index.json` contains **60 entries**.
- All existing HTML chapter files have corresponding search-index entries. **PASS.**
- 6 appendices (appA–appF) have nav-data entries but no HTML files and no search-index entries (see §6).
- All 7 faction chapters (ch5–ch11) are indexed.

---

## 6. Nav Data vs Actual Pages

### Nav entries with NO corresponding HTML file (6):
| Nav ID | Title |
|--------|-------|
| appA | Appendix A — Unit Roster Quick-Reference |
| appB | Appendix B — Equipment Catalog Reference |
| appC | Appendix C — Faction Comparison Matrix |
| appD | Appendix D — Volatile Death Reference |
| appE | Appendix E — Planetary Type Reference |
| appF | Appendix F — Glossary of Terms |

### HTML files NOT in nav-data (1):
| File | Notes |
|------|-------|
| `pages/chapters/appendices.html` | Appears to consolidate appA–appF content |

Also present but not in nav (expected): `placeholder.html`, `dashboard.html`.

---

## 7. Section Map Completeness

### Orphaned section-map entries (IDs in map but NOT in HTML) — 2:
| ID | Chapter | Notes |
|----|---------|-------|
| `sec-ch13-planets` | ch13 | Previously flagged (commit 8a77bc8) |
| `sec-ch13-megastructures` | ch13 | Previously flagged (commit 8a77bc8) |

### Chapters with NO section-map entry at all (despite having section IDs in HTML):
ch27, ch28, ch34, ch35, ch36, ch38, ch39, ch42, **ch43-ai** (12 sections), ch44, ch45, appL, appM, suppG–suppK

### HTML section IDs missing from section-map (~60+ total):

| Chapter | Missing IDs |
|---------|-------------|
| ch3 | `sec-ch3-aethyn`, `sec-ch3-fracture`, `sec-ch3-scattering`, `sec-ch3-timeline`, `sec-ch3-strategist` |
| ch5 | `sec-ch5-buildings` |
| ch6 | `sec-ch6-buildings` |
| ch7 | `sec-ch7-buildings` |
| ch8 | `sec-ch8-buildings` |
| ch9 | `sec-ch9-buildings`, `sec-ch9-bible`, `sec-ch9-bible-species`, `sec-ch9-bible-advisors`, `sec-ch9-bible-ai` |
| ch10 | `sec-ch10-intel`, `sec-ch10-buildings`, `sec-ch10-eq`, `sec-ch10-tech`, `sec-ch10-dial` |
| ch11 | `sec-ch11-buildings`, `sec-ch11-eq`, `sec-ch11-tech`, `sec-ch11-dial` |
| ch12 | `sec-ch12-mega`, `sec-ch12-core`, `sec-ch12-geo` |
| ch18 | `sec-ch18-auto`, `sec-ch18-roe`, `sec-ch18-speed`, `sec-ch18-damage`, `sec-ch18-outcomes`, `sec-ch18-salvage`, `sec-ch18-environment`, `sec-ch18-bombardment` |
| ch19 | `sec-ch19-flow`, `sec-ch19-generals`, `sec-ch19-roe`, `sec-ch19-victory`, `sec-ch19-morale`, `sec-ch19-veterancy`, `sec-ch19-terrain`, `sec-ch19-fog`, `sec-ch19-reinforcements`, `sec-ch19-retreat`, `sec-ch19-fortification`, `sec-ch19-aar` |
| ch43-ai | `sec-ch43ai-0` through `sec-ch43ai-11` (12 total) |
| appM | `sec-appM-1` through `sec-appM-4` (4 total; only `sec-appM-0` is mapped, under "appendices" key) |

### Label Mismatch
- `sec-ch3-2` in section-map: "Fragments of the Original Strategist's Life" — HTML heading reads: "Artifacts System"

---

## 8. Glossary Coverage

Glossary lives in `js/glossary.js` (embedded array, 31 terms). No `data/glossary.json` exists.

### Faction Names — 0/7 present
None of the 7 faction names (Terran League, Eternal Shards, Scrap Horde, Revenant, Unity Accord, Vorax, Core Guardians) are glossary entries.

### Core Mechanics — 7/7 present
| Term | Status |
|------|--------|
| Reanimation | PRESENT |
| Mnemo-Cryst | PRESENT |
| The Warmth | PRESENT |
| Caloric Equation | PRESENT |
| Abyssal Vacuum Biology | PRESENT |
| Forged Construct | PRESENT |
| Dark Space | PRESENT |

### Commander Names — 0/3 present
Valerius, Krell, and Vane are all absent from the glossary.

**Total missing: 10 entries (7 faction names + 3 commanders)**

---

## 9. Placeholder / Banner Text

### `stat-placeholder-banner` — 38 occurrences across 36 files
Present in: appendices, ch5–ch13, ch14–ch40 (excluding ch1–ch4, ch42–ch46).
`ch13.html` has **2 banners** (line 1 and line 490 for terraforming section).

### Standalone PLACEHOLDER — 4 occurrences
| File | Line | Context |
|------|------|---------|
| `data/planets/planets.json` | 191 | Space Station costs/requirements placeholder |
| `data/planets/planets.json` | 206 | Dead World costs/timelines placeholder |
| `pages/chapters/appM.html` | 84 | "PAGE: PLACEHOLDER (module not yet built)" |
| `pages/chapters/placeholder.html` | 1–3 | Entire file is a placeholder stub |

### TBD — 12+ occurrences
| File | Line | Context |
|------|------|---------|
| `ch5.html` | 1118 | "roster TBD" — AI commander name pool |
| `ch8.html` | 829 | "TBD -- OPEN FLAG" |
| `ch15.html` | 114 | "General rank stat modifier TBD" |
| `ch20.html` | 162 | "All slots + Autonomy. TBD%." |
| `ch22.html` | 41 | "TBD" — Vorax flag |
| `ch23.html` | 74 | "Other 12 names TBD in Phase 3" |
| `ch23.html` | 78–80 | 12× TBD in advisor matrix (Architect/Vanguard/Tyrant × 4 factions) |
| `ch30.html` | 17 | "Full autonomy. TBD%." |
| `search-index.json` | — | Mirrors chapter TBD content in index text |

### TODO — 0 occurrences ✓

---

## 10. JSON Validity

**37 PASS, 7 FAIL** (44 total files)

### Failures — All 7 equipment files (BOM character)
| File | Error |
|------|-------|
| `data/equipment/core-guardians.json` | Unexpected token U+FEFF at position 0 |
| `data/equipment/eternal-shards.json` | Unexpected token U+FEFF at position 0 |
| `data/equipment/revenant.json` | Unexpected token U+FEFF at position 0 |
| `data/equipment/scrap-horde.json` | Unexpected token U+FEFF at position 0 |
| `data/equipment/terran-league.json` | Unexpected token U+FEFF at position 0 |
| `data/equipment/unity-accord.json` | Unexpected token U+FEFF at position 0 |
| `data/equipment/vorax.json` | Unexpected token U+FEFF at position 0 |

**Root cause:** UTF-8 BOM (`EF BB BF` / `U+FEFF`) at byte 0 of each file. JSON content is structurally valid; only the BOM prevents `JSON.parse()`.

---

## Critical Gaps (player-facing impact)

| # | Issue | Impact | Severity |
|---|-------|--------|----------|
| 1 | **Building data missing** (0/140 files) | Building pages/cards cannot render from data | **CRITICAL** |
| 2 | **7 equipment JSONs fail JSON.parse** (BOM) | Any JS that fetches equipment data will crash | **CRITICAL** |
| 3 | **unit-icons.json missing** | No unit icon rendering possible | **HIGH** |
| 4 | **6 appendix pages missing** (appA–appF) | Nav links lead to 404 | **HIGH** |
| 5 | **38 stat-placeholder-banners** active | Visible "stats are placeholder" warnings on most chapter pages | **MEDIUM** |
| 6 | **12+ TBD markers** in chapter content | Incomplete data visible to readers | **MEDIUM** |
| 7 | **2 equip-icon mismatches** (smart quotes) | "Da Big Choppa" and "Lucky Plate" icons won't resolve | **MEDIUM** |
| 8 | **~60+ section IDs missing from section-map** | Sub-navigation won't jump to these sections | **MEDIUM** |
| 9 | **2 orphaned section-map anchors** (ch13) | Section nav points to non-existent content | **LOW** |
| 10 | **10 glossary entries missing** (factions + commanders) | Glossary tooltips won't appear for these terms | **LOW** |
| 11 | **67/74 equipment items orphaned** from loadouts | Equipment catalog items not used in any unit build | **INFO** |
