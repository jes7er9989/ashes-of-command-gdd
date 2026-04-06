# CC-126 — Part I Audit (Chapters 1–4)

**Scope:** `pages/chapters/ch1.html`, `pages/chapters/ch2.html`, `pages/chapters/ch3.html`, `pages/chapters/ch4.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

8 findings across 4 files (0 CRITICAL, 6 MAJOR, 2 MINOR, 0 INFO). All 4 files have at least one finding. Primary issues are non-canonical card border direction (`border-top` instead of `border-left`) and alignment color inconsistencies.

## 1. Lore Mismatches
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | MAJOR | ch4.html:118 | Accord Commander called "Military AI" in personality table, but "Consensus Engine (STRATEGOS-1)" in origin card at line 42 | Change "Military AI" to "Consensus Engine" in the personality table to match |

## 2. Visual/Style Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MAJOR | ch1.html:15–18 | Genre Fusion cards use `border-top:2px solid var(--faction)` — wrong direction (top) and wrong width (2px) vs canonical `border-left:3px solid` | Change to `border-left:3px solid var(--faction)` on all 4 cards |
| V2 | MAJOR | ch2.html:10–14 | Five Phase loop cards use `border-top:3px solid var(--faction)` — wrong direction vs canonical `border-left:3px solid` | Change `border-top` to `border-left` on all 5 cards |
| V3 | MAJOR | ch3.html:180,189 | Two-Phase Structure cards (Crucible / Final War) use `border-top:3px solid var(--faction)` — wrong direction vs canonical `border-left:3px solid` | Change `border-top` to `border-left` on both cards |
| V4 | MAJOR | ch3.html:87 vs 274 | Vanguard alignment color inconsistent within same file: `var(--horde)` in endings summary table (line 87) but `var(--vorax)` in ending detail card (line 274) | Pick one color and apply consistently; `var(--horde)` appears more thematically correct for the Vanguard alignment |
| V5 | MAJOR | ch3.html:88 vs ch4.html:142 | Tyrant alignment color inconsistent across chapters: `var(--guardians)` in ch3 endings table/card but `var(--vorax)` in ch4 alignment table | Unify to one color across both chapters |
| V6 | MINOR | ch1.html:36–39 | Core Pillar cards use faction heading colors (terran, shards, horde, guardians) but have no card border at all | Add `border-left:3px solid var(--faction)` to match other faction-colored cards |

## 3. Inaccuracies
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No findings | — |

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
| M1 | MINOR | ch4.html:8–50 | Commander Origins card section (5 faction types) has no section heading with an anchor ID; other chapters start their primary content with a `sec-chN-0` anchor | Add `<h2 class="section-heading" id="sec-ch4-0">` heading above the origins grid |

## Clean Files (no findings)
- _(none — all 4 files have findings)_
