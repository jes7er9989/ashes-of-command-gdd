# CC-126 — Part V Audit (Combat & Equipment Core)

**Scope:** ch18.html, ch19.html, ch20.html, ch21.html
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary
16 findings across 4 files (3 CRITICAL, 5 MAJOR, 6 MINOR, 2 INFO). Ch19 has the most issues — its Ground CP Abilities list is stale and contradicts Ch21's redesigned system. Ch18 has an internal stat contradiction. Ch20 and Ch21 are relatively clean.

## 1. Lore Mismatches
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | CRITICAL | ch19.html:241 | Orbital Strike listed as a universal Ground CP ability, but Ch21 makes it Terran-specific (starter ability #1). | Move Orbital Strike out of the generic list; mark it as Terran-specific or remove and defer to Ch21. |
| L2 | MAJOR | ch19.html:266 | Morale Gains section references "Rally CP ability" — no such universal ability exists in the Ch21 redesign. | Replace with a reference to faction-specific morale-boosting abilities or the generic "Emergency Repair." |

## 2. Visual/Style Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MINOR | ch19.html:288–310 | Faction morale cards use `border-top:3px solid var(--faction)` instead of canonical `border-left:3px solid`. | Switch to `border-left:3px solid var(--faction)` per style canon. |
| V2 | MINOR | ch18.html:526–549 | Space environment cards use `border-top:2px solid` instead of canonical `border-left:3px solid`. | Switch to `border-left:3px solid var(--faction)` and correct thickness to 3px. |
| V3 | MINOR | ch20.html:174 | Legendary rarity color `#44ff66` is nearly identical to Uncommon `#44cc66` — both green; hard to distinguish visually. | Consider gold (`#ffaa00`) or purple to differentiate Legendary from Uncommon. |

## 3. Inaccuracies
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | CRITICAL | ch19.html:239–248 | Ground CP Abilities section lists 7 generic abilities (Energy Shield, Reinforcement Drop, Artillery Barrage, Orbital Strike, etc.) that contradict Ch21's redesigned system of 3 universals + 6 faction-specific per faction. | Replace this section with a summary matching Ch21: list the 3 universals (Tactical Retreat, Scan Pulse, Emergency Repair) and reference Ch21 for faction-specific abilities. |
| A2 | CRITICAL | ch18.html:10 vs ch18.html:55 | Formation change cost is stated as "1 CP" in the opening paragraph (line 10) but "PH 2 CP" in the CP Costs card (line 55). Internal contradiction within the same chapter. | Reconcile to a single canonical value and remove the other. |
| A3 | MAJOR | ch18.html:57 | CP abilities listed as flat "PH 2 CP each" but Ch21 shows varied costs (1–5 CP). | Update to "1–5 CP (see Ch. 21)" or remove the blanket figure. |
| A4 | MAJOR | ch18.html:405 | Ship class table lists Frigate HP as "200-400" but the MVP Frigate (line 158) has HP = 120, falling well outside that range. | Either widen the class range to include MVP values or add a note that MVP prototype stats sit below full-game ranges. |
| A5 | MAJOR | ch18.html:273 | Section labeled "§2.4.5 — Approach Phase Costs" — numbering belongs to a different chapter, not Ch18. | Renumber to §18.14 or the next available §18.X slug. |
| A6 | INFO | ch20.html:5 | Page subtitle says "Chapters 20-21" but Ch21 covers CP Abilities, not equipment. | Change subtitle to "Chapter 20" only. |

## 4. Code Issues
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No code issues found. | — |

## 5. Leftover/Stale Content
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MAJOR | ch19.html:239–248 | Entire "Ground CP Abilities — 7 Targeted Abilities" section is stale post-Ch21 redesign; three abilities (Energy Shield, Reinforcement Drop, Artillery Barrage) no longer exist in the canonical system. | Rewrite section to match Ch21 or replace with a cross-reference card. |
| S2 | MINOR | ch20.html:162 | General rank stat modifier reads "TBD%" — unresolved placeholder. | Replace with confirmed value or tag with `PH` banner like other placeholders. |

## 6. Missing Details
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MINOR | ch19.html:287–313 | Faction morale behavior section covers only 5 factions; Vorax and Guardians (which have playable variants per canon) are absent. | Add morale behavior cards for Vorax and Guardians, or note they are covered in their respective faction chapters. |
| M2 | INFO | ch20.html:164 | Reference to "Appendix L open flags" — verify Appendix L exists and contains the General rank open flag. | Confirm cross-ref target exists; if not, update pointer. |

## Clean Files (no findings)
- *(none — all 4 files have at least one finding)*
