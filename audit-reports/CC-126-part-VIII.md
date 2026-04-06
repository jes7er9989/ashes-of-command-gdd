# CC-126 — Endgame Systems Audit (Part VIII)

**Scope:** `pages/chapters/ch28.html`, `pages/chapters/ch31.html`, `pages/chapters/ch32.html`, `pages/chapters/ch33.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

4 files audited across Chapters 28, 31, 32, 33. **13 findings**: 3 CRITICAL, 3 MAJOR, 5 MINOR, 2 INFO.

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | MAJOR | ch31.html:15 | Guardian leader called "the Warden" — every other chapter (ch4, ch5, ch6, ch9, ch11, ch12, ch32, ch43-ai) uses "Warden-Commander". | Change to "negotiate the Warden-Commander" for consistency. |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MINOR | ch32.html:13-15 | Difficulty-mode cards use `border-top:2px solid` instead of canonical `border-left:3px solid var(--faction)`. | Switch to `border-left:3px solid` to match canonical card style, or document as intentional variant for centered-text cards. |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | CRITICAL | ch28.html:45 | Claims "Full 80-node tree" for Terran League, but canon defines 20 nodes per faction (4 branches × 5 nodes) — confirmed by the subtitle on line 5 of the same page. | Change "80-node" to "20-node". |
| A2 | MINOR | ch33.html:5 | Page subtitle says "Chapters 33-34" but the page also contains an Empire Delegation section (lines 97-118) explicitly labeled "Ch 35". | Either remove the Ch 35 content (it already exists in ch35.html) or update subtitle to "Chapters 33-35". |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | CRITICAL | ch28.html:45-46 | References "TERRAN_TECH data object (Block 18)" and renders into `#terran-tech-ch28`, but no JS file defines `TERRAN_TECH` — the container will always be empty. | Either create the JS data block to populate the tech tree, or remove the empty container and the "JS Populated" claim on line 44. |
| C2 | MAJOR | ch31.html:11 | "See §12.11" cross-ref points to nonexistent anchor; ch12.html anchors are: `sec-ch12-0`, `sec-ch12-mega`, `sec-ch12-1`, `sec-ch12-core`, `sec-ch12-geo`, `sec-ch12-2`, `sec-ch12-3`. No `sec-ch12-11` exists. | Update reference to the correct ch12 anchor (likely `sec-ch12-0` or `sec-ch12-1` depending on where Vorax spawn data lives). |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | CRITICAL | ch33.html:97-118 | Entire "Empire Delegation (Ch 35)" section is duplicated content — ch35.html already contains the same Sector Command, Fleet Command, Replay Coaching, and Catastrophic Override cards with near-identical text. | Remove the duplicate section from ch33 to avoid content drift between the two copies. |
| S2 | MINOR | ch28.html:44 | Section label "Tech Tree: Terran League — JS Populated" implies dynamic rendering, but the JS data source doesn't exist; label is misleading. | Remove "— JS Populated" from the section label until the JS renderer is implemented. |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MAJOR | ch28.html:44-47 | Only Terran League tech tree is referenced; the other 6 factions (Shards, Horde, Revenant, Accord, Vorax, Guardians) have no tech tree sections despite the chapter covering all factions. | Add placeholder sections for remaining faction tech trees, or note in the chapter intro that only Terran is shown as the representative example. |
| M2 | MINOR | ch32.html:27 | Section heading "Canonical System IDs" (sec-ch32-2) promises system IDs but only provides `sys-nexus`; no other canonical system IDs are listed despite the plural heading. | Either list additional canonical system IDs or change heading to singular "Canonical Win/Loss Conditions". |
| M3 | INFO | ch33.html:92 | 100% Compendium reward grants "Unifier ending without full lore requirement" — this partially contradicts ch32:54 which requires "full Artifact chain" for Unifier; the interaction between these two systems is unclear. | Clarify whether 100% Compendium waives the Artifact chain requirement or only the lore-fragment requirement. |
| M4 | INFO | ch28.html:46 | Empty `<div id="terran-tech-ch28">` renders as blank whitespace on the page with no fallback message or loading indicator. | Add a fallback message (e.g., "Tech tree visualization pending") inside the container. |

## Clean Files (no findings)

_(none — all 4 files had findings)_
