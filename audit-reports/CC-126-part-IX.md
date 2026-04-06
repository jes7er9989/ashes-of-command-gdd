# CC-126 — Chapters 34–40, 42 Audit (Compendium → Commanders)

**Scope:** ch34.html, ch35.html, ch36.html, ch37.html, ch38.html, ch39.html, ch40.html, ch42.html
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

8 files audited across chapters 34–42 (excluding ch41). 11 findings total: 1 CRITICAL, 3 MAJOR, 5 MINOR, 2 INFO. The Revenant SpriteFactory color contradicts both the CSS variable and UI skin description. The SpriteFactory palette omits two factions entirely.

## 1. Lore Mismatches

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | MAJOR | ch37.html:26 | Revenant SpriteFactory fill is `#44ff88` (mint green) but `--revenant` CSS var is `#AA77FF` (purple), and ch37:39 describes Revenant UI as "Purple-on-black". | Change Revenant sprite fill to a purple-range color consistent with faction identity. |

## 2. Visual/Style Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| V1 | CRITICAL | ch37.html:26–27 | Revenant sprite fill `#44ff88` and Accord sprite fill `#44ff66` are nearly identical greens (ΔE < 10), violating the "triple-redundancy identification" principle stated at ch37:11. | Give Revenant a purple-range fill; keep Accord green (matches `--accord: #44ff66`). |
| V2 | MINOR | ch42.html:1 | Missing `stat-placeholder-banner` div that all other audited chapter files include at line 1. | Add the standard placeholder banner for consistency, or document that ch42 is intentionally exempt. |

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | MAJOR | ch42.html:19 | "~70 lines per commander from 400+ bank" contradicts "20-30 lines per named enemy commander" in the same paragraph. | Clarify: ~70 is likely the bank depth per trait archetype; 20-30 is the per-commander launch target. State both figures unambiguously. |
| A2 | MAJOR | ch37.html:33 | "5 Faction Skins" label omits playable Vorax ("The Swarm Unbound") and playable Guardians ("The Core Awakens"), both of which are canon playable variants that would need UI skins. | Either expand to 7 skins or add a note that Vorax/Guardian playable variants inherit a base skin. |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | INFO | ch37.html:1–56 | ch37 (`page-ch37`) contains full Diegetic UI and Audio Design sections that are also presented in separate files ch38.html (`page-ch38`) and ch39.html (`page-ch39`). If all three are injected into the SPA, content renders twice. | Verify the chapter loader only injects one version; if ch38/ch39 are canonical, trim the duplicated sections from ch37. |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MINOR | ch37.html:9 | Section heading `id="sec-ch37-0"` text includes "Diegetic UI" which is ch38's dedicated topic, suggesting this section was written before the ch38 split. | Update heading to focus on Art Direction only (e.g., "Grimdark Atmosphere · StarCraft Readability · Silhouette Design"). |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MINOR | ch37.html:16–31 | SpriteFactory Faction Color Palette lists only 5 of 7 factions — Eternal Shards and Vorax are absent. | Add Shards (cyan-range, consistent with `--shards: #00ffee`) and Vorax (red-range, consistent with `--vorax: #ff2266`) entries. |
| M2 | MINOR | ch37.html:23–30 | SpriteFactory palette entries for Revenant and Accord omit the highlight color that Terran and Horde include (e.g., Terran has `#ffffff highlight`, Horde has `#ffaa44 highlight`). | Add highlight colors for all 7 factions for completeness. |
| M3 | MINOR | ch38.html:10–16 | Diegetic UI section shows only 5 faction skins; no mention of what Vorax or Guardian playable variants see. | Add a note or placeholder for Vorax/Guardian UI treatment. |
| M4 | INFO | ch40.html:35 | "Archive SD" abbreviation used without prior definition in this chapter. | Expand on first use (e.g., "Archive Stellar Distinction" or whatever SD stands for). |

## Clean Files (no findings)

- ch34.html
- ch35.html
- ch36.html
