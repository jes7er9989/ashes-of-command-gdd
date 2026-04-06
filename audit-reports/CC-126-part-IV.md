# CC-126 — Part IV Audit

**Scope:** `pages/chapters/ch15.html`, `pages/chapters/ch16.html`, `pages/chapters/ch17.html`, `pages/chapters/ch19b.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

21 findings across 4 files (0 clean). 1 CRITICAL, 4 MAJOR, 14 MINOR, 2 INFO.

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| — | — | — | No lore mismatches found. | — |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MINOR | ch16.html:70,74,78 | War Factory function cards use `border-left:2px` instead of canonical `3px`. | Change to `border-left:3px solid var(--faction)`. |
| V2 | MINOR | ch17.html:12,16,20 | Auto-Battle Principle cards use `border-left:2px` instead of canonical `3px`. | Change to `border-left:3px solid var(--faction)`. |
| V3 | MINOR | ch17.html:92,101,110 | Cover/Elevation/Garrison cards use `border-left:2px` instead of canonical `3px`. | Change to `border-left:3px solid var(--faction)`. |
| V4 | MAJOR | ch19b.html:11,15,19 | Design inspiration cards use `border-top:2px` — both wrong direction and wrong width vs canonical `border-left:3px`. | Change to `border-left:3px solid var(--faction)`. |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | CRITICAL | ch15.html:123 | "Building Catalog — 15 Types" contradicts locked canon of 20 buildings/faction (140 total); icons JSON and dashboard both confirm 20/faction. | Change heading to "Building Catalog — 20 Per Faction" or "Building Catalog — 140 Total". |
| A2 | CRITICAL | ch16.html:5 | Subtitle reads "15 Building Types" — same contradiction with the 20/faction canon. | Update subtitle to reflect 20 per faction. |
| A3 | INFO | dashboard.js:819 | Dashboard prototype summary also says "15 building types" — same stale number propagated outside audit scope. | Update dashboard text to match canon count (noted for future wave). |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MAJOR | ch16.html:13-14 | MVP Building table header defines 5 grid columns (`56px 1fr 50px 50px 1fr`) but data rows define 4 columns (`160px 70px 90px 1fr`); header columns misalign with data. | Align header grid-template-columns to match data rows (4-column layout). |
| C2 | MAJOR | ch15.html:125 | `<div id="building-list">` is empty and no JS renderer targets this ID — container is orphaned and will never display content. | Either wire up a JS renderer for this ID or remove the empty container. |
| C3 | MAJOR | ch16.html:36 | `<div id="building-list-ch16">` is empty and no JS renderer targets this ID — same orphaned container issue. | Either wire up a JS renderer or remove. |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MINOR | ch15.html:114 | Explicit TBD: "General rank stat modifier TBD — see Appendix L open flags. Resolve before implementing General AI." | Resolve the open flag or tag with a tracking ticket. |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | INFO | ch15.html:125 | Building catalog section promises a rendered list but the `building-list` div is permanently empty (see C2). | Content will appear once renderer is wired up. |

## Style Deviation Summary (MINOR — bulk)

The following cards use `border-left:2px` instead of canonical `border-left:3px`. Grouped for brevity:

| # | Severity | File:Lines | Count |
|---|----------|------------|-------|
| V5 | MINOR | ch16.html:70,74,78 | 3 cards |
| V6 | MINOR | ch17.html:12,16,20 | 3 cards |
| V7 | MINOR | ch17.html:92,101,110 | 3 cards |
| V8 | MINOR | ch19b.html:11,15,19 | 3 cards (also wrong direction: `border-top` → `border-left`) |

Total: 12 card borders deviate from the `border-left:3px solid var(--faction)` canonical form.

## Clean Files (no findings)

_(none — all 4 files have findings)_
