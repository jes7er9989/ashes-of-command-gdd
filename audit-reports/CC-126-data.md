# CC-126 — Data Directory Audit

**Scope:** All 48 JSON files under `data/` (units, tech, equipment, factions, nav, dialogue, audio, formations, loadouts, planets, sprites, icons, search-index, search-synonyms)
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

48 JSON files audited across 14 subdirectories. **43 findings** total: 4 CRITICAL, 10 MAJOR, 18 MINOR, 11 INFO. All files parse as valid JSON with no BOM bytes. Key issues: buildings data directory is empty (0/140 canon buildings), equipment count is 74 vs 208 canon, Revenant faction color has a 4-way mismatch across files, and camelCase is used project-wide instead of snake_case.

---

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | MAJOR | `data/factions/faction-names.json`:6 | "VORAX COLLECTIVE" is non-canonical; canon name is "Vorax" | Change value to `"VORAX"` |
| L2 | MINOR | `data/search-synonyms.json`:43 | Lists "vorax collective" as search synonym, propagating non-canonical name | Remove or keep as synonym only with a comment |
| L3 | INFO | `data/search-index.json` (ch21 entry) | "VORAX COLLECTIVE" appears in ch21 content field | Update content to use canonical "Vorax" |
| L4 | INFO | `data/factions/faction-logos.json`:4 | Key is `"The Revenant"` while all other faction files use slug keys (`revenant`) | Use slug key `"revenant"` for consistency |
| L5 | INFO | `data/dialogue/terran-league.json` | Has 5 dialogue beats while other playable factions have 4 (extra "Final War Transition") | Intentional if Terran is tutorial faction; document if so |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | CRITICAL | `data/factions/factions.json`:69, `data/factions/faction-colors.json`:5, `data/factions/faction-logos.json` SVG, `data/nav/nav-data.json`:17 | Revenant has 4 different colors across files: `#00e070`, `#44ff66`, `#44ff88`, `#AA77FF` | Pick one canonical Revenant color and unify all files |
| V2 | CRITICAL | `data/nav/nav-data.json`:17-18 | Ch8 (Revenant) uses `#AA77FF` (purple) and ch9 (Accord) uses `#44ff66` (green); neither matches canonical faction colors — appears swapped and wrong | Fix to match canonical faction colors from `faction-colors.json` |
| V3 | MAJOR | `data/equipment/terran-league.json`, `data/equipment/vorax.json` vs `data/equipment/eternal-shards.json`, `data/equipment/revenant.json`, `data/equipment/unity-accord.json` | Uncommon rarity color inconsistent: `#44ff88` (Terran, Vorax) vs `#44cc66` (Shards, Revenant, Accord) | Standardize to one hex value for Uncommon across all factions |
| V4 | MINOR | `data/factions/faction-colors.json`:6+8, `data/factions/factions.json`:90+132 | Unity Accord and Core Guardians share identical color `#ffaa22` | Verify this is intentional; if not, differentiate |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | CRITICAL | `data/buildings/` (directory) | Directory exists but contains 0 files; canon requires 140 buildings (20/faction × 7). `build-icons.json` already has 140 matching SVG icons. | Create 7 building JSON files (one per faction, 20 entries each) |
| A2 | CRITICAL | `data/equipment/*.json` | Total equipment entries = 74; canon requires 208 (shortfall of 134, only 35.6% coverage) | Add missing 134 equipment entries across factions |
| A3 | INFO | Per-faction equipment breakdown | TL:16, SH:11, Rev:10, UA:10, ES:9, Vorax:9, CG:9 — distribution uneven | Balance or document intentional asymmetry |
| A4 | MINOR | `data/planets/planets.json`:267 | Worldship planet yield is `"?... ?I ?Inf"` — placeholder value | Replace with actual yield values |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MAJOR | All `data/units/*.json` (105 units × 15+ keys) | All stat keys use camelCase (`atkDmg`, `atkSpd`, `moveSpd`, `critChance`, `critDamage`, `dmgType`, `armorType`, `leadershipRadius`, `scrapCost`, `buildCycles`, `supplyCost`, `sightRange`, `suppressResist`, `xpRate`, `abilityPower`, `bioAcid`) | Convert to snake_case if that is the project standard, or document camelCase as intentional |
| C2 | MAJOR | All `data/tech/*.json` (7 files) | `branchNum` key is camelCase | Rename to `branch_num` if snake_case is standard |
| C3 | MAJOR | All `data/equipment/*.json` (74 entries) | `rarityColor` key is camelCase | Rename to `rarity_color` |
| C4 | MAJOR | `data/equipment/terran-league.json` (8 entries) | `statBlock` key is camelCase and exists only on 8/16 Terran entries | Rename to `stat_block`; decide if other factions/entries need it |
| C5 | MAJOR | `data/factions/factions.json` | `chapterId` and `mechanicName` keys are camelCase | Rename to `chapter_id` and `mechanic_name` |
| C6 | MAJOR | `data/search-index.json` (54 entries) | `pageTitle` key is camelCase | Rename to `page_title` |
| C7 | MINOR | `data/audio/tracks.json` | 5 camelCase keys: `defaultTrack`, `fadeIn`, `fadeOut`, `loopStart`, `loopEnd` | Rename to snake_case |
| C8 | MINOR | `data/planets/planets.json` | 11 camelCase keys: `avgTerr`, `fixedTerritory`, `defenderAdvantage`, `permanentTag`, `uniqueTerrain`, `weatherEvents`, `scanDiscoveries`, `revenantSleepers`, `svgKey`, `energyYield`, `parentInfluence` | Rename to snake_case |
| C9 | MINOR | `data/loadouts/unit-loadouts.json` | `rarityColor` key is camelCase across all 105 unit entries (8 items each) | Rename to `rarity_color` |
| C10 | MINOR | `data/factions/factions.json`:116-119, 138-140 | Vorax and Core Guardians use string values (`"N/A"`, `"Var"`, `"Fixed"`) for `scrap`, `intel`, `influence`, `units` fields where all other factions use numbers — type inconsistency | Use `null` or `-1` sentinel for non-applicable numeric fields |
| C11 | MINOR | `data/units/*.json` | Line-ending inconsistency: `terran-league.json`, `vorax.json`, `core-guardians.json` use LF; other 4 use CRLF | Normalize to one line-ending style |
| C12 | MINOR | `data/tech/*.json` | Line-ending inconsistency: `eternal-shards.json`, `revenant.json` use CRLF; other 5 use LF | Normalize to one line-ending style |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MAJOR | `data/audio/tracks.json`:18,28,38,48,58,68,78,88,98 | `"composer": "TBD"` on all 9 tracks | Fill in composer names or replace with `null` |
| S2 | MINOR | `data/nav/chapter-meta.json`:260-264 | Orphaned `"placeholder"` entry (32 words, 1 min) — not referenced in nav-data or section-map | Remove orphaned entry |
| S3 | MINOR | `data/planets/planets.json`:191 | Orbital Station `special` field contains `"(PH decision...)"` design note | Remove or resolve placeholder |
| S4 | MINOR | `data/planets/planets.json`:206 | Dead World `special` field contains `"(PH system...)"` design note | Remove or resolve placeholder |
| S5 | MINOR | `data/planets/planets.json` (scattered) | Additional `"PH"` design notes embedded in prose fields throughout | Audit all prose fields and resolve |
| S6 | INFO | `data/search-index.json` (45 entries) | `"color": null` on all non-faction chapters | Appears by-design; confirm intentional |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MAJOR | `data/equipment/*.json` | `proto` and `statBlock` keys exist only on 8 of 16 Terran entries; absent from all 66 other-faction entries | Add to all entries if intended, or document as Terran-only mechanic |
| M2 | MINOR | `data/nav/chapter-meta.json` | No entries for `appA` through `appF` (nav-data references these IDs but chapter-meta has no word count/timestamp for them) | Add chapter-meta entries for each appendix |
| M3 | MINOR | `data/nav/section-map.json` | Missing section entries for: `appA`–`appF`, `ch27`, `ch28`, `ch34`, `ch35`, `ch36`, `ch38`, `ch39`, `ch42`, `ch44`, `ch45`, `suppG`–`suppK` | Add section-map entries or confirm these chapters have no sub-sections |
| M4 | MINOR | `data/search-index.json` | Individual appendix entries `appA`–`appF` absent; only a combined `"appendices"` entry exists | Add per-appendix entries for granular search |
| M5 | MINOR | `data/planets/planet-svg.json` | `Asteroid Field` and `Nebula` SVG entries exist but have no matching planet type in `planets.json` | Add planet entries or remove orphaned SVGs |
| M6 | INFO | `data/nav/nav-data.json`:77,83 | `ch43-ai` and `ch43` both use `num: "43"` — duplicate display number for distinct chapters | Use distinct display numbers or clarify with suffix |
| M7 | INFO | `data/planets/planet-svg.json` | All 21 planet SVGs use viewBox `"0 0 200 200"` (or `"26 6 108 108"` for Asteroid/Nebula); `unit-sprites.json` also uses 200×200. Only `build-icons.json` and `equip-icons.json` use the canonical `"0 0 52 52"` | Confirm 200×200 is intentional for planet/unit art vs 52×52 for icons |

---

## Clean Files (no findings)

- `data/formations/formations.json` — 5 formations, clean schema, lore-consistent
- `data/sprites/shapes.json` — 3 categories, pure numeric coordinate data, clean
- `data/sprites/unit-sprites.json` — 105 entries matching unit roster, consistent viewBox
- `data/icons/build-icons.json` — 140 entries (20/faction × 7), all `"0 0 52 52"`, clean
- `data/icons/equip-icons.json` — 882 entries, all `"0 0 52 52"`, clean
- `data/dialogue/core-guardians.json` — 4 NPC beats, clean schema, lore-consistent
- `data/dialogue/eternal-shards.json` — 4 beats, clean schema, lore-consistent
- `data/dialogue/revenant.json` — 4 beats, clean schema, lore-consistent
- `data/dialogue/scrap-horde.json` — 4 beats, clean schema, lore-consistent
- `data/dialogue/unity-accord.json` — 4 beats, clean schema, lore-consistent
- `data/dialogue/vorax.json` — 4 NPC beats, clean schema, lore-consistent

---

## Canon Count Verification

| Category | Canon | Actual | Status |
|----------|-------|--------|--------|
| Units | 105 (15/faction × 7) | 105 | PASS |
| Equipment | 208 | 74 | **FAIL — 134 missing** |
| Tech Nodes | 124 (20×5 + 12×2) | 124 | PASS |
| Buildings | 140 (20/faction × 7) | 0 (directory empty) | **FAIL — 140 missing** |
| Factions | 7 (5 playable + 2 NPC) | 7 | PASS |
| Units per faction | 15 | 15 (all 7) | PASS |
| Tech per playable | 20 | 20 (all 5) | PASS |
| Tech per NPC | 12 | 12 (both) | PASS |
| Build icons | 140 | 140 | PASS |
| Unit loadouts | 105 | 105 | PASS |
| Unit sprites | 105 | 105 | PASS |
