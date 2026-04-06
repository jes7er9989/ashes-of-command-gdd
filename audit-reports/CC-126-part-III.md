# CC-126 — Part III Audit (Chapters 12–14)

**Scope:** `pages/chapters/ch12.html`, `pages/chapters/ch13.html`, `pages/chapters/ch14.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary
11 findings across 3 files (1 CRITICAL, 3 MAJOR, 5 MINOR, 2 INFO). ch14 is clean.

## 1. Lore Mismatches
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | MAJOR | ch12.html:229,295 | "Tyrant" alignment referenced in core world alignment notes (The Beacon, The Garden) but only three alignments are defined in the Win Conditions section at line 173–175: Vanguard, Architect, Pragmatist — "Tyrant" is undefined within ch12. | Either add Tyrant as a fourth alignment in the Win Conditions card, or replace "Tyrant" with "Vanguard" in the two alignment notes to match the defined set. |
| L2 | MINOR | ch13.html:909 | "Necro-Legion" used for Revenant faction flavor in Re-Origination Rule 5, while the rest of ch13 consistently uses "Revenant" (e.g. lines 541, 662, 780). Both names are valid per locked canon but the within-chapter inconsistency reads as an oversight. | Change "Necro-Legion" to "Revenant / Necro-Legion" or just "Revenant" to match surrounding usage. |

## 2. Visual/Style Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MINOR | ch12.html:199–307 | All 10 Core World cards use `border-left:2px solid var(--guardians)` — canonical card border is `border-left:3px solid var(--faction)`. | Change `2px` to `3px` on all 10 core world card styles. |

## 3. Inaccuracies
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No findings. | — |

## 4. Code Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MINOR | ch13.html:679 | `id="sec-ch13-containment-breach"` is placed on an inner Orbitron-styled `<div>` inside a `.card`, not on an `<h2 class="section-heading">` like every other section anchor in ch13. May cause inconsistent scroll-to behavior. | Move the anchor to a dedicated `<h2 class="section-heading">` element, or add a matching `<h2>` wrapper consistent with the other sections. |
| C2 | INFO | ch14.html:14,22 | Cross-references `href="#ch13"` point to the entire chapter rather than specific section anchors (`#sec-ch13-csf` for megastructures, `#sec-ch13-weather` for planetary weather). | Use precise anchors: `#sec-ch13-csf` on line 14 and `#sec-ch13-weather` on line 22. |

## 5. Leftover/Stale Content
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | CRITICAL | ch13.html:722 | Visible "TODO balance pass" text without `<span class="ph-tag">PH</span>` tag (Containment Breach Rule 2 — Safe-Purge Cost). | Add `<span class="ph-tag">PH</span>` to match the pattern used on lines 774, 786, etc. |
| S2 | CRITICAL | ch13.html:734 | Visible "TODO balance pass" text without PH tag (Containment Breach Rule 3 — Loot-Table Crack Reward). | Add `<span class="ph-tag">PH</span>` tag. |
| S3 | MAJOR | ch13.html:751 | Visible "TODO balance pass" text without PH tag (Containment Breach Rule 4 — Breach Composition). | Add `<span class="ph-tag">PH</span>` tag. |
| S4 | MINOR | ch12.html:322 | "Volatile Death chain reactions" in The Core hazard list — term is not defined in ch12 or cross-referenced. May be clear in context of Ch.11 but is opaque here. | Add a brief inline note or cross-ref to the chapter/section where Volatile Death is explained. |

## 6. Missing Details
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MINOR | ch12.html:186 | "progress transfers to the Archive (see Ch. 33)" — no anchor link provided for Ch.33, unlike other cross-refs in ch12 which use `<a href="#ch25">`. | Add `<a href="#ch33">Ch. 33</a>` link consistent with other cross-refs. |
| M2 | MAJOR | ch13.html:679–791 | Containment Breach section has 7 design rules but the section label (line 62) says "Vorax Re-Origination Recovery" — there is no section label/heading for the Containment Breach subsection itself, just an `id` on a card div. The section is large enough to warrant its own `section-label` + `section-heading` pair. | Add a proper `<div class="section-label">` and `<h2 class="section-heading">` before the Containment Breach card to match the document's structural pattern. |

## Clean Files (no findings)
- ch14.html
