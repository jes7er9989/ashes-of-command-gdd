# CC-126 — Cross-Reference Integrity Audit

**Scope:** All `href="#sec-*"` anchors across `pages/chapters/*.html`, `index.html`, `dashboard.html`; all `id="sec-*"` targets; `data/nav/section-map.json`; `js/glossary.js`; `data/search-synonyms.json`
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

5 findings total (0 CRITICAL, 0 MAJOR, 2 MINOR, 3 INFO). All anchor hrefs resolve correctly. Section-map.json is in perfect 1:1 sync with HTML ids. Two glossary terms have zero page references. Search-synonyms system is a content-keyword expansion layer — most entries intentionally target general content phrases rather than glossary terms.

## 1. Lore Mismatches

_No findings._

## 2. Visual/Style Issues

_No findings._

## 3. Inaccuracies

_No findings._

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | INFO | pages/chapters/ch13.html:88,172,288,375 | Only 5 static `href="#sec-*"` links exist in the entire site (all in ch13.html); remaining 294 of 298 `sec-*` ids are navigated programmatically via `js/chapter-loader.js` and `scripts/build-section-map.js` | No action — programmatic navigation is by design |

## 5. Leftover/Stale Content

_No findings._

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MINOR | js/glossary.js | Glossary term **"Exclusion Zone"** has zero references across all HTML files in `pages/chapters/`, `index.html`, and `dashboard.html` — orphaned glossary entry | Add at least one page reference or remove term if no longer in canon |
| M2 | MINOR | js/glossary.js | Glossary term **"Forged Construct"** has zero references across all HTML files in `pages/chapters/`, `index.html`, and `dashboard.html` — orphaned glossary entry | Add at least one page reference or remove term if no longer in canon |
| M3 | INFO | data/search-synonyms.json | 48 of 59 synonym entries contain zero values matching actual glossary terms — synonym targets are general content keywords (e.g., "economy", "tech tree", "infantry"), not glossary pointers | No action if search-expansion-by-content-keyword is the intended design; if synonyms should map to glossary terms, 48 entries need target updates |
| M4 | INFO | data/search-synonyms.json | Synonym key `vorax` maps to value `"vorax collective"` which is neither a glossary term nor text found in chapter HTML (glossary term is `"Vorax"`, not `"Vorax Collective"`) | Change synonym value from `"vorax collective"` to `"vorax"` to match glossary |

## Cross-Reference Verification Matrix

### A. Anchor Hrefs → Target IDs (0 broken)

| href | Source File:Line | Target ID Exists | Target File:Line |
|------|-----------------|-----------------|-----------------|
| `#sec-ch13-diegetic-warnings` | ch13.html:88 | YES | ch13.html:278 |
| `#sec-ch13-csf` | ch13.html:172,375 | YES | ch13.html:189 |
| `#sec-ch13-containment-breach` | ch13.html:288 | YES | ch13.html:679 |
| `#sec-ch13-weather` | ch13.html:375 | YES | ch13.html:75 |

### B. Section-Map.json ↔ HTML IDs (perfect sync)

- **298** unique `sec-*` ids in HTML files
- **298** unique `sec-*` ids in `data/nav/section-map.json`
- **0** ids in HTML missing from section-map
- **0** ids in section-map missing from HTML

### C. Glossary Page References (2 orphaned of 42)

| # | Term | Pages Referencing |
|---|------|-------------------|
| 1 | Exclusion Zone | 0 |
| 2 | Forged Construct | 0 |
| — | _All other 40 terms_ | ≥ 1 |

### D. Search Synonyms → Glossary Terms (9 of 59 map to glossary)

| Synonym Key | Glossary-Matching Values |
|---|---|
| death | volatile death |
| fight | auto-battle |
| battle | auto-battle |
| terran | terran league |
| shards | eternal shards |
| horde | scrap-horde |
| revenant | the revenant |
| accord | unity accord |
| guardians | core guardians |

Remaining 50 synonym entries target general content keywords only — not glossary terms.

## Clean Files (no findings)

- index.html
- dashboard.html
- pages/chapters/ch1.html – ch12.html
- pages/chapters/ch14.html – ch46.html
- pages/chapters/appendices.html
- pages/chapters/appL.html
- pages/chapters/appM.html
- data/nav/section-map.json
