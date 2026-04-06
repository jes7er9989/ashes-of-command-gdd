# CC-126 — Faction Chapters (5–11) Audit

**Scope:** pages/chapters/ch5.html, ch6.html, ch7.html, ch8.html, ch9.html, ch10.html, ch11.html
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

Audited all 7 faction chapter files across 6 axes. Found **30 findings**: 1 CRITICAL, 8 MAJOR, 7 MINOR, 14 INFO. The single most impactful issue is systemic: all 5 playable faction chapters display "16 Nodes" in the tech tree header instead of the canonical 20. One non-canon faction name ("Celestial Dominion") appears in ch7. Several minor color-bleed and stale-markup issues round out the report.

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | MAJOR | ch7.html:730 | Reference to "Celestial Dominion hull plating" — not one of the 7 locked-canon factions. | Replace "Celestial Dominion" with the correct canonical faction name (likely Revenant or Unity Accord). |
| L2 | MAJOR | ch11.html:303 | Guardian architecture described as "Millions of years old", contradicting "tens of thousands of years" used at lines 24, 30, 31, 32 in the same file. | Change to "Tens of thousands of years old" to match the chapter's own established timeline. |
| L3 | INFO | ch11.html:299,303 | The term "Forerunner" (Halo-associated) is used for visual descriptors ("Forerunner Skeleton", "Forerunner-style angular geometry"). | If intentional as a visual shorthand, no action; if IP-risk, replace with "Aethyn-era" or "ancient." |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MAJOR | ch5.html:29 | Aethyn Ancestry card uses `border-left:3px solid var(--guardians)` in a Terran League chapter; however, this same pattern is used in ch6, ch7, ch8, ch9 — appears to be an intentional cross-faction design convention for Aethyn ancestry cards. | Confirm this is intentional and document; if not, change to each faction's own `--faction` var. |
| V2 | MINOR | ch5.html:1073 | Advisor Chemistry card lacks the `border-left:3px solid var(--terran)` present on all sibling Faction Bible cards. | Add `border-left:3px solid var(--terran)` to match siblings. |
| V3 | MINOR | ch7.html:766 | Slaughter-Brute HP stat "150" is colored with `var(--revenant)` instead of `var(--horde)` or a neutral stat color. | Change `color:var(--revenant)` to `color:var(--horde)` or `color:var(--text-mid)`. |
| V4 | MINOR | ch9.html:168 | Orbital Strike CP cost "3 CP" uses `color:var(--vorax)` in the Unity Accord's CP table. | Change to `color:var(--accord)` or `color:var(--text-hi)`. |
| V5 | INFO | ch5–ch11 (all) | All 7 faction emblem SVGs use `viewBox="0 0 100 100"` with opaque backgrounds instead of the canonical `0 0 52 52` / transparent BG; this is a consistent chapter-emblem convention, likely distinct from the icon spec. | Clarify whether the canon SVG spec applies to chapter emblems; if so, update all 7 in a single sweep. |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | CRITICAL | ch5.html:891, ch6.html:686, ch7.html:839, ch8.html:888, ch9.html:240 | **Systemic across all 5 playable factions.** Tech tree headers all read "Tech Tree -- 16 Nodes" / "4 Branches x 4 Tiers", but canon requires 20 nodes per playable faction (124 total = 20×5 + 12×2). Confirmed by data files (e.g., `data/tech/revenant.json` has 20 nodes). | Change all 5 labels to "Tech Tree -- 20 Nodes" and headings to "4 Branches x 5 Tiers". |
| A2 | MINOR | ch5.html:809-810 | Starting inventory table header has 6 grid columns (`60px 1fr 60px 90px 80px 1fr`) but data rows use 5 columns (`200px 60px 90px 80px 1fr`), causing column misalignment. | Align header and data row `grid-template-columns` to match. |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MINOR | ch6.html:374 | `<circle>` element uses `rx` and `ry` attributes (`rx="11" ry="11"`) which are only valid on `<ellipse>` per SVG spec. | Change to `<ellipse>` or use `<circle r="11">`. |
| C2 | MINOR | ch9.html:556 | Mixed inline text and block-level `<div>` children inside the NPC Commanders card div without proper text wrapping. | Close the text sentence before the inner `<div>` or wrap the sentence in its own element. |
| C3 | MINOR | ch11.html:421-423 | Stale chapter boundary comment `<!-- PAGE: GALAXY GENERATION (Chapter 12) -->` from legacy single-file layout remains after closing `</div>`. | Delete lines 421-423. |
| C4 | INFO | ch5.html:195-197 | `<clipPath id="tgf-sh">` placed outside `<defs>` block; valid but non-standard SVG placement. | Move into `<defs>` for consistency. |
| C5 | INFO | ch5.html:450-452 | `<clipPath id="taf-nose-clip">` defined inside `<g>` instead of `<defs>`. | Move into `<defs>` for consistency. |
| C6 | INFO | ch9.html:51 | `<clipPath id="uag-clip">` defined but never referenced (no `clip-path="url(#uag-clip)"` usage). | Remove unused clipPath definition. |
| C7 | INFO | ch11.html:401 | Section `sec-ch11-6` placed after `sec-ch11-13`, breaking numerical ID ordering; nav mirrors this same sequence. | Cosmetic; renumber to `sec-ch11-14` for clarity, or leave as-is since anchors resolve correctly. |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MINOR | ch5.html:1118 | "roster TBD" text in NPC Commander Seeds section not tagged with `<span class="ph-tag">PH</span>` like other placeholders. | Tag with `PH` marker for consistency. |
| S2 | MINOR | ch8.html:829 | "TBD -- OPEN FLAG" text for General rank stat modifier is visible to end users without a placeholder tag. | Add `<span class="ph-tag">PH</span>` wrapper. |
| S3 | INFO | ch8.html:824 | "Proposed -- flag for review" dev-facing note in Commander rank row visible to end users. | Hide or tag with a `proto-badge`. |
| S4 | INFO | ch8.html:1062,1066,1070 | Three advisor cards show "Names and full profiles Phase 3" — deferred content, not stale. | No action if Phase 3 is planned; wrap in `proto-badge` for consistency if desired. |
| S5 | INFO | ch11.html:421-423 | Stale chapter boundary comment (see C3 above). | Delete trailing lines. |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | INFO | ch5–ch11 (all) | JS-populated containers (unit rosters, buildings, equipment, tech trees, dialogue) across all 7 chapters are empty divs hydrated at runtime; if JS/data files fail to load, sections render blank with no fallback. | Consider `<noscript>` or static fallback text for graceful degradation; verify data files separately. |
| M2 | INFO | ch10.html:279-281 | `vorax-buildings` container relies on `build-icons.json`; the `data/buildings/` directory has no structured building metadata beyond icons. | Create `data/buildings/vorax.json` if building descriptions/stats are intended; acceptable as-is if icon-only rendering is the design. |

## Clean Files (no findings)

- ch10.html — No CRITICAL, MAJOR, or MINOR findings; only INFO-level observations about JS runtime dependencies.
