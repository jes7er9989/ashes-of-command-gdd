# CC-126 — Full PWA Audit Charter

**Date:** 2026-04-05
**Scope:** Entire Ashes of Command PWA — every chapter, appendix, supplement, data file, JS module
**Mode:** READ-ONLY. No file modifications during audit. No commits.

This is a multi-wave audit. Each Claude Code session is assigned a subset of files and produces ONE markdown report at `audit-reports/CC-126-<slug>.md` (example: `CC-126-part-I.md`).

---

## Audit Axes (check every file against ALL of these)

1. **Lore Mismatches** — stale terminology, contradictions with locked canon, faction/caste errors, forbidden terms
2. **Visual/Style Issues** — card border direction (`border-left:3px solid var(--faction)` canonical), font weights, spacing, faction color misuse, aesthetic trinity (Dawn of War 2 + StarCraft 2 + Stellaris) drift
3. **Inaccuracies** — numbers that don't match GDD (unit counts, tech node counts, faction counts, stat values), broken promises ("see §X" that doesn't exist), wrong stat order (must be: Base → Equipment → Supply Penalty → Space Combat Ground Mod → Rank Multipliers)
4. **Code Issues** — broken HTML (unclosed tags, dup IDs), invalid JSON, JS syntax, dead code, unused CSS classes, dead anchor refs
5. **Leftover/Stale Content** — obsolete TODOs, "TBD" or "PLACEHOLDER" not tagged, commented-out sections, dev-only content bleeding through, old section names
6. **Missing Details** — promised content not delivered, empty placeholder sections, broken `[see §X]` cross-refs, orphaned anchors (no nav entry), missing stat blocks, incomplete tables

---

## Locked Canon (DO NOT flag as wrong)

- Name: **Ashes of Command** (never "Creation")
- 7 factions total: Terran League, Eternal Shards, Scrap-Horde, Revenant / Necro-Legion, Unity Accord, Vorax, Guardians (Core Guardians)
- 5 playable, 2 NPC (Vorax + Guardians have NPC+playable variants)
- 105 units (15/faction × 7), 208 equipment, 124 tech nodes (20×5 + 12×2), 140 buildings (20/faction × 7)
- Stat order: Base → Equipment → Supply Penalty → Space Combat Ground Mod → Rank Multipliers
- Aethyn caste map: Terran=Mixed, Shards=Scholar, Horde=Warrior, Revenant=Engineer, Accord=Shepherd
- Supreme Commander position: abolished. STRATEGOS-1 is autonomous
- Playable Vorax: "The Swarm Unbound" | Playable Guardians: "The Core Awakens"
- Revenant caste mechanic: kill-count thresholds trigger resurrection stats
- SVG viewBox: 0 0 52 52, transparent BG, unique ID prefixes
- `sec-ch13-terraforming` anchor intentionally preserved despite content rename to "Planetary Re-Origination"
- "harmonic terraforming" in Eternal Shards flavor is intentional (method word, not system name)

---

## Output Format (MANDATORY)

Every audit report MUST follow this structure:

```markdown
# CC-126 — <WAVE NAME> Audit

**Scope:** <list files audited>
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary
<1-2 sentences, total findings count by severity>

## 1. Lore Mismatches
| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| L1 | CRITICAL | file.html:42 | ... | ... |

## 2. Visual/Style Issues
(same table format)

## 3. Inaccuracies
(same table format)

## 4. Code Issues
(same table format)

## 5. Leftover/Stale Content
(same table format)

## 6. Missing Details
(same table format)

## Clean Files (no findings)
- file-x.html
- file-y.html
```

**Severity levels:** CRITICAL (breaks canon, breaks build, factual error) > MAJOR (style/consistency violation, broken link) > MINOR (nits, polish) > INFO (notes, not a defect)

---

## Rules
1. **READ-ONLY.** Do not edit any files. Do not commit.
2. **Cite precisely.** Every finding needs `file:line` or `file:id="anchor"`.
3. **Be terse.** Finding column = 1 sentence. Fix column = 1 sentence.
4. **No false positives.** If in doubt, classify as INFO or omit.
5. **List clean files** at the bottom — empty findings = clean file, note it.
6. **One report only.** Write exactly one `.md` file in `audit-reports/`.
