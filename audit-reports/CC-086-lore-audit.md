# CC-086: LORE CONSISTENCY AUDIT

**Date:** 2026-04-04
**Scope:** pages/chapters/*.html, data/*.json, js/glossary.js, js/dashboard.js
**Status:** READ-ONLY audit — no files modified

---

## 1. STALE TERMINOLOGY

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| T1 | **CRITICAL** | `pages/chapters/appendices.html:14` | Eternal Shards unit named **"Wraith-Construct"** — evokes deprecated wraithbone terminology | Rename to `Mnemo-Construct` or `Cryst-Construct` |
| T2 | **CRITICAL** | `data/units/eternal-shards.json:127` | Unit entry `"name": "Wraith-Construct"` — same issue in data layer | Rename to match appendices fix |
| T3 | **CRITICAL** | `data/loadouts/unit-loadouts.json:2180` | Loadout key `"Wraith-Construct"` — stale name propagated to equipment data | Rename key to match |
| T4 | **CRITICAL** | `data/sprites/unit-sprites.json` | Sprite references to `Wraith-Construct` | Rename to match |
| T5 | MINOR | `pages/chapters/appendices.html:13` | Terran unit **"Wraith-Fighter"** — "Wraith" as military callsign is faction-appropriate for humans | No change required unless style guide bans "wraith" globally |
| T6 | MINOR | `data/units/terran-league.json:215,252,419` | Terran `Wraith-Fighter` entries in data | Same as T5 — Terran military naming, acceptable |

**wraithbone / wraith-bone:** Zero occurrences. Clean.
**"dozens of alien races/species":** Zero occurrences. Clean.

---

## 2. SUPREME COMMANDER REFERENCES

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | **CRITICAL** | `data/search-index.json` (entry 47, ch43-ai) | Stale text: *"An Accord caste challenges the Supreme Commander's authority"* — ch43-ai.html:121 was already corrected to reference STRATEGOS-1 autonomy, but search index not rebuilt | Rebuild search index via `build-search-index.js` |
| S2 | MAJOR | `pages/chapters/ch9.html:253` | STRATEGOS-1 boot sequence lists "Supreme Commander authority" as active constraint | Add `[HISTORICAL — CONSTRAINT VOID]` annotation, or frame as pre-abolition recording |
| S3 | MAJOR | `data/search-index.json` (entry 8, ch9) | Mirrors S2 — search index copy of boot sequence text | Will auto-fix when search index rebuilt |
| S4 | INFO | `ch9.html:255` | Speaker tag `SUPREME COMMANDER (recorded, measured):` | Correct — historical recording dialogue |
| S5 | INFO | `ch9.html:286` | Narrative references "the abolished Supreme Commander" | Correct — explicitly describes abolition |
| S6 | INFO | `ch9.html:318` | Full explanation of position abolition and STRATEGOS-1 autonomy | Correct — canonical lore passage |
| S7 | INFO | `ch9.html:371` | Timeline: "Supreme Commander killed. Position abolished." | Correct — historical timeline |
| S8 | INFO | `ch9.html:502` | "the Supreme Commander position was abolished after the civil war" | Correct — lore-aligned |

---

## 3. AETHYN CASTE MAP — CRITICAL MISMATCHES

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | **CRITICAL** | `pages/chapters/ch3.html:16` | Caste grid maps **Terran League → ENGINEER CASTE** — should be Mixed/All Castes | Change to `MIXED / ALL CASTES` |
| C2 | **CRITICAL** | `pages/chapters/ch3.html:122` | Text: *"Engineer Caste descendants who rebuilt through sheer determination"* | Change to "Mixed-caste descendants" |
| C3 | **CRITICAL** | `js/dashboard.js:302` | Prologue: *"Engineer Caste descendants who got almost nothing"* | Change to "Mixed-caste descendants" |
| C4 | **CRITICAL** | `data/search-index.json` (entry 2, ch3) | Mirrors C1/C2 — stale "Engineer Caste descendants" for Terrans | Rebuild search index after ch3 fix |
| C5 | MAJOR | `pages/chapters/ch3.html:21` | Revenant described as *"Not descended from a specific caste — adopted by machines"* — ch8.html:26 says ENGINEER CASTE (MACHINE-ADOPTED) | Update to "Engineer Caste — adopted by machines" |
| C6 | MAJOR | `js/dashboard.js:302` | Prologue: *"The Revenant — not from any specific caste, but adopted by intact Aethyn AI infrastructure"* | Update to "Engineer Caste descendants adopted by intact Aethyn AI infrastructure" |

**Consistent mappings (no issues):**
- Eternal Shards = Scholar — ch3:17, ch6:25 ✓
- Scrap-Horde = Warrior — ch3:15, ch7:25 ✓
- Unity Accord = Shepherd — ch3:18, ch9:23 ✓
- Core Guardians = Helper — ch11:29 ✓ (correctly absent from ch3 biological grid)
- Revenant = Engineer — ch8:26,33 ✓ (but ch3 and dashboard contradict)

---

## 4. FACTION CANONICITY — CHAPTER AUDIT

### Eternal Shards (ch6.html) — ALL PASS
- Scholar Caste: ch6:25 ✓
- Dying species: ch6:31-32 ✓
- Desperate harmony (not serene): ch6:725-726 ✓
- Drowning metaphor: ch6:726 ✓
- Communion = loud grief: ch6:726 ✓
- Mnemo-Cryst (no wraithbone): ch6:32,245,795 ✓

### Scrap-Horde (ch7.html) — 1 MINOR
- Warrior Caste: ch7:25 ✓
- Mineral-based biology (ARE metal): ch7:31 ✓
- Forged Construct: ch7:16,35-36 ✓

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| F1 | MINOR | `pages/chapters/ch7.html:730` | *"A Slaughter-Brute might be wearing a pristine white Unity Accord chest plate"* — "wearing" language contradicts mineral-biology framing at line 31 | Replace "might be wearing" with "might have fused" or "might be plated with" |

### Unity Accord (ch9.html) — ALL PASS
- Shepherd Caste: ch9:23 ✓
- Seven subspecies / seven moons: ch9:299,441 ✓
- Plasma = weaponized empathy: ch9:31 ✓
- STRATEGOS-1 autonomous: ch9:318,502 ✓
- Hollowed caste (soot-stained rigs vs pristine white): ch9:492 ✓

### Vorax (ch10.html) — 1 MINOR
- Extra-galactic: ch10:28-29 ✓
- Abyssal Vacuum Biology: ch10:67-68 ✓
- Anglerfish/lamprey/bioluminescent: ch10:30,71-72 ✓
- Caloric Equation (digestion not war): ch10:48-49 ✓

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| F2 | MINOR | `pages/chapters/ch10.html` (whole chapter) | Canon specifies "7 species archetypes" but no explicit enumerated list of 7 archetypes exists | Add archetype enumeration section |

### Core Guardians (ch11.html) — ALL PASS
- Helper Caste: ch11:29 ✓
- Repurposed tools (not weapons): ch11:35-41 ✓
- Warden-Commander cosmic-neutral voice: ch11:218,227-230 ✓
- Damage-type gating (Energy detonates, Kinetic/Melee vents): ch11:118-122 ✓

### Terran League (ch5.html) — ALL PASS
- Mixed/All Castes: ch5:30-31 ✓
- Strategist Aethyn fragment: ch5:31,906 ✓
- Frontier spirit: ch5:1001 ✓
- Valerius/Krell/Vane advisors: ch5:1040,1051,1062 ✓

---

## 5. CROSS-CHAPTER CONTRADICTIONS

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| X1 | MAJOR | `data/units/unity-accord.json:124` | *"Pilots come from the Fire Caste"* — Warhammer 40K/Tau term, not Accord canon | Replace with Accord-native caste (e.g., "Wrought caste" or "combat subspecies") |
| X2 | MAJOR | `data/loadouts/unit-loadouts.json:4152` | Equipment named `"Fire-Caste Protocol"` — same Tau contamination | Rename to Accord-appropriate term |
| X3 | MINOR | `pages/chapters/ch28.html:5` vs `suppG.html:4` | Ch28: "4 Branches x 5 Nodes Each" vs SuppG: "4 Branches x 4 Tiers Each" — neither multiplies to the stated 124 total | Verify intended count; align both subtitles |

---

## 6. AESTHETIC TRINITY

**No contradictions found.** Game references used consistently:
- StarCraft II → visual readability (ch1:47, ch37:11)
- Dawn of War: Dark Crusade → territory conquest (ch1:48, ch19:7)
- Dawn of War 2 → ground combat camera (appL:527)
- Stellaris → grand strategy scope (dashboard.js:872)
- Warhammer 40K → faction silhouette identity (ch1:50)

| # | Severity | File | Finding | Recommended Fix |
|---|----------|------|---------|-----------------|
| A1 | INFO | multiple | Three DoW titles referenced (Dark Crusade, Soulstorm, DoW2) for different features — intentional but undocumented | Consider adding consolidated reference table to ch37 |

---

## TOP 10 PRIORITY FIXES

| Priority | Ticket | Severity | Location | Fix |
|----------|--------|----------|----------|-----|
| 1 | C1 | CRITICAL | `ch3.html:16` | Terran caste grid: ENGINEER → MIXED/ALL CASTES |
| 2 | C2 | CRITICAL | `ch3.html:122` | Terran description: "Engineer Caste descendants" → "Mixed-caste descendants" |
| 3 | C3 | CRITICAL | `dashboard.js:302` | Prologue: "Engineer Caste descendants" → "Mixed-caste descendants" |
| 4 | T1-T4 | CRITICAL | `appendices.html:14`, `eternal-shards.json:127`, `unit-loadouts.json:2180`, `unit-sprites.json` | Rename Wraith-Construct → Mnemo-Construct across all files |
| 5 | S1 | CRITICAL | `search-index.json` (entry 47) | Rebuild search index — stale "Supreme Commander's authority" text from corrected ch43-ai |
| 6 | C5 | MAJOR | `ch3.html:21` | Revenant: "Not from a specific caste" → "Engineer Caste (machine-adopted)" |
| 7 | C6 | MAJOR | `dashboard.js:302` | Prologue Revenant: add "Engineer Caste" ancestry |
| 8 | X1-X2 | MAJOR | `unity-accord.json:124`, `unit-loadouts.json:4152` | Remove "Fire Caste" / "Fire-Caste Protocol" — replace with Accord-native terms |
| 9 | S2 | MAJOR | `ch9.html:253` | STRATEGOS-1 boot sequence: annotate "Supreme Commander authority" as historical/void |
| 10 | F1 | MINOR | `ch7.html:730` | "wearing" → "fused with" for mineral-biology consistency |

---

**Total findings:** 6 CRITICAL · 7 MAJOR · 4 MINOR · 5 INFO
**Overall assessment:** Faction chapters (ch5-ch11) are in excellent canonical shape. The main lore debt is concentrated in **ch3.html** (Aethyn origin chapter) and **dashboard.js** (prologue), which still carry the old Terran=Engineer mapping and ambiguous Revenant caste. The Wraith-Construct naming in Eternal Shards data is a straightforward find-and-replace. Search index is stale and needs a rebuild.
