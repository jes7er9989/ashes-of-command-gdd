# CC-126 — Part VI (Redo) Audit: Generals, Advisors, Events, Progression

**Scope:** `pages/chapters/ch22.html` (Generals/Veterancy), `pages/chapters/ch23.html` (Advisors), `pages/chapters/ch29.html` (Narrative Events), `pages/chapters/ch30.html` (Progression)
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary
21 findings across 4 files (3 MAJOR, 10 MINOR, 8 INFO). All 4 files have findings. Ch23 has the most code-level issues (duplicate HTML attributes). Ch29 has the largest content gap (24+ missing event templates). Ch22 and ch30 are structurally solid with minor style inconsistencies.

## 1. Lore Mismatches
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | INFO | ch22.html:86,90 | Standing orders HARASS ("Raid enemy supply, avoid big fights") and RAID ("Hit-and-run enemy supply lines") have near-identical descriptions — unclear mechanical distinction. | Differentiate descriptions or merge into one order (would change "9 Orders" heading). |
| L2 | INFO | ch23.html:5,73 | Subtitle says "15 Unique Characters (5 Factions × 3)" — excludes playable Vorax ("The Swarm Unbound") and playable Guardians ("The Core Awakens"); if those variants get advisors, count should be 21. | Confirm whether playable NPC factions receive advisor trios; update count if so. |

## 2. Visual/Style Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MINOR | ch22.html:39-40 | General rank row mixes `var(--accord)` for rank name with `var(--vorax)` for threshold/stat — every other row uses a single consistent faction color across all columns. | Use one color for the entire General row (likely `var(--accord)` or a dedicated general color). |
| V2 | MINOR | ch22.html:69-75 | CP ability cards use `border-top:2px solid var(--faction)` instead of canonical `border-left:3px solid var(--faction)`. | Switch to `border-left:3px` to match canonical card border direction. |
| V3 | MINOR | ch30.html:12-18 | Promotion chain cards use `border-top:2px solid var(--faction)` — same non-canonical border direction as ch22 CP cards. | Switch to `border-left:3px` for consistency (or document border-top as intentional grid-card variant). |

## 3. Inaccuracies
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | MAJOR | ch30.html:40 | Claims "All 6 slots available" at General rank, but only 3 slot types are named in ch22/ch30 ([W], [A], [G]); data files define 5 types ([W], [A], [G], [AM], [SP]); dashboard.js:502 says "4 equipment slots per unit." The number 6 is not substantiated anywhere. | Reconcile slot count across ch22, ch30, data files, and dashboard. Either enumerate all 6 types or correct the count. |
| A2 | MAJOR | ch29.html:5 | Subtitle promises "30+ Event Templates" but only 6 random event types are listed in §29.0. | Either add the remaining 24+ event templates or revise the subtitle to match actual content (e.g., "6 Event Templates + 5 Expansion Types"). |
| A3 | INFO | ch22.html:34 | Commander threshold shows "(proposed)" label inline; General threshold (line 40) shows "⚑ proposed" with a different marker style — inconsistent flagging format within the same table. | Unify the proposed-value marker style (both "(proposed)" or both "⚑"). |

## 4. Code Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MAJOR | ch23.html:160 | Duplicate `style` attribute: `<div style="margin-bottom:4px" style="padding-left:12px">` — HTML spec discards the second attribute, so `padding-left:12px` is never applied. | Merge into single `style="margin-bottom:4px;padding-left:12px"`. |
| C2 | MAJOR | ch23.html:161 | Same duplicate `style` attribute issue (Vanguard dialogue line). | Merge into single `style` attribute. |
| C3 | MAJOR | ch23.html:162 | Same duplicate `style` attribute issue (Tyrant dialogue line). | Merge into single `style` attribute. |

## 5. Leftover/Stale Content
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MINOR | ch22.html:41 | "TBD ⚑" for General stat modifier — acknowledged open flag but still a visible TBD in production content. | No action needed if ⚑ tracking is intentional; ensure Appendix L tracks this item. |
| S2 | MINOR | ch30.html:19 | Footnote repeats the same open flag ("General stat modifier also pending. See Appendix L.") — duplicates ch22:47 open flag card. | Intentional cross-reference; no fix needed unless deduplication desired. |
| S3 | MINOR | ch23.html:74 | "Other 12 names TBD in Phase 3" — not tagged with PH banner or ⚑ flag like other open items. | Add ⚑ marker for consistency with the open-flag convention used elsewhere. |
| S4 | INFO | ch23.html:77-80 | 12 "TBD" cells in the 15-advisor table (all non-Terran names). | Expected for Phase 3 delivery; ensure tracked. |

## 6. Missing Details
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MINOR | ch30.html:34-42 | Section heading says "Each Rank = +1 Equipment Slot" but body only names [W], [A], [G] and a Terran early-unlock note — does not enumerate what slot types unlock at Elite, Commander, or General. Data files show [AM] at Commander and [SP] at General. | Add explicit slot-type names per rank to match data files. |
| M2 | MINOR | ch29.html:1-31 | Chapter has only two sections (Random Events, Expansion Encounters) — no section for "The Great Reclamation" despite the page title including it. | Add Great Reclamation content or remove it from the page title. |
| M3 | INFO | ch22.html:7 | Intro paragraph mentions "Generals can command entire sectors and fleets independently" but no section details fleet-command mechanics or the MISSION system referenced at line 42. | Consider adding a placeholder section for MISSION system or cross-ref to where it will be documented. |
| M4 | INFO | ch23.html:73 | "5 Factions × 3 Advisors — Same Archetypes, Different People" — no detail on how non-Terran advisor personalities differ from the Terran defaults beyond the faction reveal table (lines 88-97). | Phase 3 delivery; no immediate action. |

## Clean Files (no findings)
_(None — all 4 files have findings.)_
