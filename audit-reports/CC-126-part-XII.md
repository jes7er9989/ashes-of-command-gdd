# CC-126 — Supplements G–K Audit

**Scope:** `pages/chapters/suppG.html`, `pages/chapters/suppH.html`, `pages/chapters/suppI.html`, `pages/chapters/suppJ.html`, `pages/chapters/suppK.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

5 supplement placeholder pages audited. 3 findings total (1 CRITICAL, 1 MAJOR, 1 MINOR). All five files are structurally identical "COMING SOON" stubs with valid cross-references. The only substantive issues are in suppG where the tech-tree node math contradicts locked canon.

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No findings | — |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No findings | — |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | CRITICAL | suppG.html:4 | Subtitle says "4 Branches × 4 Tiers Each" (=16/faction); canon is 20 nodes per playable faction and 12 per NPC faction — no 4×4 decomposition yields those numbers. | Update branch/tier breakdown to match the actual GDD structure (e.g., 5 branches × 4 tiers = 20). |
| A2 | MAJOR | suppG.html:4,8 | Subtitle and body both scope to "5 Factions" but claim the canon total of 124 nodes, which includes all 7 factions (20×5 + 12×2 = 124); 5 playable factions alone account for only 100 nodes. | Either expand scope to all 7 factions and say "7 Factions · 124 Nodes", or narrow the count to "100 Nodes · 5 Playable Factions". |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No findings | — |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No findings | — |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MINOR | suppG–K (all) | All five supplements are "COMING SOON" placeholders with no actual data content; this is expected for migration-in-progress but worth tracking. | No immediate action — ensure these are on the migration backlog. |

## Clean Files (no findings)

- suppH.html
- suppI.html
- suppJ.html
- suppK.html
