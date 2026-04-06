# CC-126 — Espionage / Diplomacy / Alignment / Economy Audit

**Scope:** `pages/chapters/ch24.html`, `pages/chapters/ch25.html`, `pages/chapters/ch26.html`, `pages/chapters/ch27.html`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

8 findings across 4 files (0 CRITICAL, 1 MAJOR, 6 MINOR, 1 INFO). Primary issues are doctrine card color-variable mismatches in ch25 and non-canonical border directions on resource/doctrine cards in ch24, ch25, and ch27.

## 1. Lore Mismatches

No findings.

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | MAJOR | ch25.html:11 | Architect doctrine card uses `border-top:3px solid var(--terran)` (#00b4ff) but stated HUD color is #44aaff (`--architect`) — visually different blue. | Change to `var(--architect)`. |
| V2 | MINOR | ch25.html:12 | Vanguard card uses `var(--horde)` instead of `var(--vanguard)` for border color; values happen to match (#ff6622) but semantic variable is wrong. | Change to `var(--vanguard)` for maintainability. |
| V3 | MINOR | ch25.html:13 | Tyrant card uses `var(--guardians)` instead of `var(--tyrant)` for border color; values happen to match (#ffaa22) but semantic variable is wrong. | Change to `var(--tyrant)` for maintainability. |
| V4 | MINOR | ch24.html:68-70 | Resource cards (Scrap/Intel/Influence) use `border-top:2px solid` instead of canonical `border-left:3px solid var(--faction)`. | Align with canonical card border direction, or document as intentional exception for resource cards. |
| V5 | MINOR | ch27.html:9-11 | Same `border-top:2px solid` pattern on resource cards — mirrors ch24. | Same as V4. |
| V6 | MINOR | ch25.html:11-13 | Doctrine cards use `border-top:3px solid` instead of canonical `border-left:3px solid`. | Same pattern deviation as V4/V5; align or document. |

## 3. Inaccuracies

No findings. Cross-ref `§20.12` (ch24.html:75) verified present in ch20.html:78. Ch 29 reference (ch24.html:89) verified — ch29.html exists.

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | MINOR | ch27.html:8 | Resource overview cards (lines 8-12) have no preceding `<h2 class="section-heading">` with an id anchor, unlike equivalent sections in ch24 and ch26. | Add a `<h2>` heading with `id="sec-ch27-0"` for nav consistency. |

## 5. Leftover/Stale Content

No findings.

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | INFO | ch24.html:5 | Subtitle says "Chapters 24, 26-27" but ch24 also contains a full Random Events section labeled "(Ch 29)" at line 89; ch29 duplicates this content. | Consider whether the ch29 preview in ch24 should be noted in the subtitle, or removed in favor of a cross-ref link to ch29. |

## Clean Files (no findings)

- ch26.html
