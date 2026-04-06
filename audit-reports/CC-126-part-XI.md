# CC-126 — Appendices & Implementation Log Audit

**Scope:** `pages/chapters/appendices.html`, `pages/chapters/appL.html`, `pages/chapters/appM.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

14 findings across 3 files (3 CRITICAL, 4 MAJOR, 4 MINOR, 3 INFO). The equipment catalog CROSS column total is arithmetically wrong (shows 16, should be 32), Appendix D overcounts Guardian units as 16 instead of 15, and territory count ranges disagree between Appendix E and L.9.6 for 8 of 12 planet types. appM checklist is stale relative to Godot rewrite completions in appL.

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| | | | No findings | |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MINOR | appendices.html:52 | Faction Comparison Matrix uses `--revenant` color for Terran "Beginner" skill floor and "Kinetic native" entries — colors a Terran attribute with another faction's palette | Use `--terran` or a neutral semantic color for non-faction-specific advantage/difficulty indicators |
| V2 | MINOR | appL.html:509-513 | L.10.8 faction-specific phenomena table uses hardcoded hex colors (`#00e5ff`, `#ff6600`, `#ff0040`) instead of CSS variables; these hex values differ from the palette defined in L.9.5 (`--shards=#00ffcc`, `--horde=#ff8800`, `--vorax=#ff2266`) | Replace hardcoded hex with `var(--shards)`, `var(--horde)`, `var(--vorax)` |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| I1 | CRITICAL | appendices.html:63 | Appendix D heading says "All 16 Core Guardian Units" but canon defines 15 units per faction (15 x 7 = 105); the table has 16 rows because Spark-Mote appears twice (solo + formation detonation profiles) | Change to "15 Core Guardian Units · 16 Detonation Profiles" or "All 15 Core Guardian Units" |
| I2 | CRITICAL | appendices.html:36 | Appendix B TOTAL row shows CROSS column = 16, but the column values sum to 32 (5+4+4+0+3+16); consequently 36+35+35+35+35+16 = 192, not the displayed grand total of 208 | Change CROSS total from 16 to 32 so the row sums correctly to 208 |
| I3 | CRITICAL | appendices.html:88-102 vs appL.html:374-389 | Territory count ranges disagree between Appendix E and L.9.6 for 8 of 12 planet types: Capital (E: 8-22+ vs L: 18-22), Ocean (8-12 vs 6-10), Jungle (10-16 vs 10-14), Ice (6-10 vs 8-10), Ruins (6-10 vs 8-12), Gas Giant (4-6 vs 6-8), Station (2-4 vs 1-3), Dead World (3-6 vs 4-8) | Reconcile both tables against Ch13 source of truth and unify ranges |
| I4 | MAJOR | appM.html:28-29 | M.2 lists Deployment scene and Map Phase scene as NOT DONE, but appL L.1 shows G7 (DeploymentScene) and G4+G14 (MapScene + Turn Phase Pipeline) as COMPLETE | Update M.2 status to reflect Godot rewrite track completions |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MAJOR | appL.html:9-295 | Sections L.1 through L.9 (and all subsections L.3.1, L.4.1, L.4.2, L.5.1, L.9.1-L.9.6) lack `id` attributes on their section-label divs, while L.10-L.16 have `id="sec-appL-X"` — L.1-L.9 are un-linkable from navigation | Add `id="sec-appL-0"` through `id="sec-appL-9"` (and subsection IDs) matching the pattern used by L.10-L.16 |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MAJOR | appL.html:56-87 | L.2 stat block cards reference outdated section numbers: "L.9.2 TERRAN SHIPS" (actual L.9.2 = Homeworlds), "L.9.3 HORDE / ENEMY SHIPS" (actual L.9.3 = Generation Pipeline), "L.4 THREE-ZOOM MAP" (actual L.4 = BattleManager), "L.10 DEFERRED SYSTEMS" (actual L.10 = Living Universe) | Re-label cards to match current section numbering or use descriptive titles without section numbers |
| S2 | MINOR | appL.html:273-274 | L.7 "Godot 4.4 Engine Gotchas" items #8-9 are JavaScript/Web Audio issues (exponentialRampToValueAtTime, e.target.closest), not Godot engine gotchas | Move items #8-9 to a separate "Web/JS Gotchas" subsection or retitle the section |
| S3 | INFO | appM.html:3 | Subtitle reads "Generated March 11, 2026" but multiple Godot rewrite milestones (G7 DeploymentScene, G14 Turn Pipeline, G15 Mouse Drag, G16 Warning Fixes) completed after that date are not reflected | Re-generate or manually update the checklist to current status |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | INFO | appendices.html:129 | Footer claims "46 CHAPTERS · 8 PARTS · 13 APPENDICES" — chapter/part counts not verified in this audit wave | Verify against actual chapter file count in a separate audit pass |
| M2 | INFO | appL.html:1-919 | No `stat-placeholder-banner` present on appL despite containing locked stat blocks (L.2, L.5) and balance-pending values (L.8) | Consider whether locked-but-placeholder stats should carry the PH banner for consistency with other chapters |

## Clean Files (no findings)

_(none — all 3 files have findings)_
