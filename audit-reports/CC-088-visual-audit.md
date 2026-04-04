# CC-088: Visual & Stylistic Consistency Audit

**Date:** 2026-04-04
**Scope:** pages/chapters/*.html (53 files), index.html, css/global.css
**Mode:** READ-ONLY

---

## 1. Card Pattern Consistency

### 1A. Border Direction Inconsistency (border-top vs border-left)

The established canonical pattern is `border-left:3px solid var(--faction)`. Multiple files use `border-top:2px solid` instead.

| File | Lines (approx) | Issue | Severity |
|------|---------------|-------|----------|
| ch16.html | 70, 74, 78 | `border-top:2px solid var(--vorax)` instead of `border-left:3px` | MAJOR |
| ch17.html | 12, 16, 20, 92 | `border-top:2px solid var(--terran/revenant)` instead of `border-left:3px` | MAJOR |
| ch20.html | 12-17 | Equipment slot cards use `border-top:2px` | MAJOR |
| ch33.html | 13, 18, 29 | `border-top:3px solid var(--terran/accord/guardians)` | MAJOR |
| ch43-ai.html | 17, 21, 25, 288, 292, 296 | `border-top:2px solid` (6 cards); also 2px width instead of 3px | MAJOR |

**Estimated:** ~25 cards across 5 files use border-top instead of border-left.

### 1B. Cards Missing Border Styling Entirely

| File | Lines (approx) | Count | Context | Severity |
|------|---------------|-------|---------|----------|
| ch16.html | 43, 83, 103 | 3 | Various content cards | MAJOR |
| ch20.html | 182, 194, 213, 222 | 4 | Later content sections | MAJOR |
| ch21.html | 60, 65, 82, 99, 116, 134, 151, 209 | 8 | Faction section outer wrappers | MAJOR |
| ch23.html | 156, 169 | 2 | Alignment section cards | MINOR |
| ch24.html | 75, 182, 186 | 3 | Grid cards, span-2 card | MINOR |
| ch26.html | 42 | 1 | Content card | MINOR |
| ch27.html | 24, 25 | 2+ | Resource cards | MINOR |
| ch28.html | 9, 29, 39 | 3 | Content cards | MINOR |
| ch29.html | 11-16, 25 | 7+ | Event type grid, encounter grid | MAJOR |
| ch34.html | 12-21 | 10 | All compendium category cards | MAJOR |
| ch36.html | 18 | 1 | Content card | MINOR |
| ch37.html | 48-54 | 7 | Audio faction cards (also missing Orbitron titles) | MAJOR |
| ch39.html | 9-15 | 7 | Audio summary cards (using `<strong>` instead of Orbitron) | MAJOR |
| ch40.html | 10, 29, 33 | 3 | HUD layout cards | MINOR |
| dashboard.html | 106, 181-211 | 5 | Documentation cards | MINOR |

**Estimated:** ~65+ cards across 15 files missing border styling.

### 1C. Card Title Styling Deviations

| File | Lines (approx) | Issue | Severity |
|------|---------------|-------|----------|
| ch5.html | 30 | Title font-size `0.82rem` (standard: 0.85rem) | MINOR |
| ch37.html | 48-54 | Titles use `<span style="font-weight:600">` instead of Orbitron/letter-spacing:2px | MAJOR |
| ch39.html | 9-15 | Titles use `<strong>` instead of Orbitron/letter-spacing:2px | MAJOR |

### 1D. Body Text Color Deviations

| File | Line (approx) | Issue | Severity |
|------|--------------|-------|----------|
| ch1.html | 23 | Uses `var(--text-body)` instead of `var(--text-mid)` | INFO |

**Note:** All other body text consistently uses `var(--text-mid)`. Line-heights are within the 1.5–1.65 range across all files.

---

## 2. Color Variable Usage

### 2A. Hardcoded Faction Hex Colors in HTML (Should Use var())

| File | Line(s) | Hardcoded Value | Should Be | Severity |
|------|---------|----------------|-----------|----------|
| ch13.html | 175, 179, 183, 310, 314, 318, 389-391 | `color:#ffaa22` | `var(--guardians)` | CRITICAL |
| ch13.html | 187, 322, 362 | `color:#AA77FF` | `var(--revenant)` | CRITICAL |
| ch13.html | 191, 326, 392 | `color:#00ffee` | `var(--shards)` | CRITICAL |
| ch18.html | 320, 327 | `color:#00b4ff` | `var(--terran)` | CRITICAL |
| ch18.html | 335 | `color:#ff6622` | `var(--horde)` | CRITICAL |
| ch20.html | 174 | `color:#44ff66` | `var(--accord)` | MAJOR |
| ch23.html | 208-209 | `color:#44aaff` | New var needed (--architect?) | MAJOR |
| ch23.html | 214-215 | `color:#ff6622` | `var(--horde)` or new --vanguard | MAJOR |
| ch23.html | 220-221 | `color:#ffaa22` | `var(--guardians)` or new --tyrant | MAJOR |
| ch25.html | 11 | `color:#44aaff` | Needs alignment var | MAJOR |
| ch25.html | 12 | `color:#ff6622` | `var(--horde)` | MAJOR |
| ch25.html | 13 | `color:#ffaa22` | `var(--guardians)` | MAJOR |
| appL.html | 371 | `color:#ffaa22` | `var(--guardians)` | MAJOR |
| appL.html | 509 | `color:#00e5ff` | `var(--shards)` (shade mismatch) | MINOR |
| appL.html | 511 | `color:#ff6600` | `var(--horde)` (shade mismatch: #ff6600 vs #ff6622) | MINOR |
| appL.html | 512-513 | `color:#ff0040` | `var(--vorax)` (shade mismatch: #ff0040 vs #ff2266) | MINOR |

**Total: 41 hardcoded color instances across 6 files.**

### 2B. Hardcoded Border Colors in HTML

| File | Line(s) | Hardcoded Value | Recommendation | Severity |
|------|---------|----------------|----------------|----------|
| ch10.html | 45, 47 | `border-left:3px solid #880022` + `color:#ff4466` | Create `var(--deep-hive)` or use `var(--vorax)` | MAJOR |
| ch5.html | ~1095 | `border-left:3px solid #ff3333` | Create `var(--warning)` or `var(--error)` | MINOR |
| ch6.html | ~849 | `border-left:3px solid #ff3333` | Same as above | MINOR |
| ch7.html | ~1010 | `border-left:3px solid #ff3333` | Same as above | MINOR |
| ch8.html | ~1089 | `border-left:3px solid #ff3333` | Same as above | MINOR |
| ch9.html | ~544 | `border-left:3px solid #ff3333` | Same as above | MINOR |

### 2C. Hardcoded Colors in CSS (global.css)

| Location | Issue | Severity |
|----------|-------|----------|
| 50+ instances | `rgba(0,180,255,X)` (Terran blue) hardcoded instead of var-based | MAJOR |
| Line ~2353 | `.system-card-title { color: #fff }` → should be `var(--text-hi)` | MINOR |
| Lines ~3624-3630 | Section heading shimmer gradient uses `#fff` | MINOR |

**Recommendation:** Create opacity-level variables for Terran blue:
```css
--terran-08: rgba(0,180,255,0.08);
--terran-12: rgba(0,180,255,0.12);
--terran-15: rgba(0,180,255,0.15);
--terran-30: rgba(0,180,255,0.3);
--terran-45: rgba(0,180,255,0.45);
```

---

## 3. Font Stack Consistency

**Status: PASS**

| Font | Role | Usage |
|------|------|-------|
| Orbitron | Headings, labels, UI elements | h1–h6, .section-heading, card titles |
| JetBrains Mono | Code, stats, data displays | Technical tables, stat blocks |
| Share Tech Mono | Decorative monospace | .section-label, version tags, footers |
| Rajdhani | Body text | Default body font |

- **Zero instances** of Arial, Helvetica, Times, or generic serif in inline styles.
- All inline `font-family` declarations use approved fonts with monospace fallback.

---

## 4. Heading Structure

**Status: MOSTLY COMPLIANT**

All 46 major chapter files use proper `section-label` + `section-heading` pairs. 11 files use alternative lightweight structures (stubs, supplements, dashboard).

| File | Issue | Severity |
|------|-------|----------|
| ch18.html | Line 9: section-heading without paired section-label (first section) | MINOR |
| ch40.html | Line 27: "Save System" section-label with no corresponding section-heading | MINOR |
| ch37.html | Audio faction cards use `<span>` titles instead of section-label/heading pattern | INFO |
| ch39.html | Audio summary cards use `<strong>` titles instead of section-label/heading pattern | INFO |

**Note:** No raw h1–h6 HTML tags found anywhere. The site uses div-based heading structure exclusively (`.page-title`, `.section-heading`, `.section-label`), which is intentional and consistent.

---

## 5. SVG viewBox Consistency

### 5A. Faction Icon SVGs (ch5–ch11)

| Files | viewBox | Expected | Severity |
|-------|---------|----------|----------|
| ch5.html:7, ch6.html:5, ch7.html:5, ch8.html:5, ch9.html:4, ch10.html:4, ch11.html:4 | `0 0 100 100` | `0 0 52 52` (per locked decision) | MAJOR |

These 7 faction icon SVGs use `viewBox="0 0 100 100"` displayed at 80×80px within 100×100px containers. They do not follow the locked 52×52 standard.

### 5B. Card Illustration SVGs (ch5–ch11)

| Files | viewBox | Count | Severity |
|-------|---------|-------|----------|
| ch5–ch11 | `0 0 280 120` | 21 instances | INFO (consistent within type) |

Landscape-oriented illustration SVGs. Consistent usage across all faction chapters.

### 5C. Dashboard Territory Map

| File | viewBox | Severity |
|------|---------|----------|
| dashboard.html:66 | `0 0 680 320` | INFO (unique, appropriate) |

### 5D. Index.html Hamburger Icon

| File | viewBox | Severity |
|------|---------|----------|
| index.html:47 | `0 0 24 18` | INFO (non-standard height of 18, but functional) |

---

## 6. Responsive Grid Patterns

### 6A. CSS Class-Based Grids (Minimal Usage)

Only **3 CSS grid class instances** found across all chapter files, all in `dashboard.html`:
- `.faction-grid` (line 115)
- `.stats-grid` (line 28)
- `.systems-grid` (line 124)

**99.7% of grids use inline styles.** This is a systemic maintenance concern.

### 6B. Gap Value Inconsistency

| Gap Value | Count | Primary Use |
|-----------|-------|-------------|
| `gap:12px` | 113 | Default spacing (most common) |
| `gap:10px` | 57 | Compact grids |
| `gap:8px` | 46 | Tighter spacing |
| `gap:6px` | 44 | Fine detail |
| `gap:4px` | 12 | Minimal |
| `gap:24px` | 7 | Maximum |
| `gap:16px` | 5 | Large |
| `gap:2px` | 7 | Micro |

**Anomaly:** ch18.html:446 uses `gap:6px 10px` (2D gap) — the **only** instance of a two-value gap in the entire codebase.

| File | Line | Issue | Severity |
|------|------|-------|----------|
| ch18.html | 446 | `gap:6px 10px` — unique 2D gap value | MINOR |

### 6C. Grid-Template-Columns Sprawl

**30+ unique `grid-template-columns` patterns detected.** Top patterns:
- `1fr 1fr` (108 uses)
- `1fr 1fr 1fr` (60 uses)
- `repeat(3,1fr)` (19 uses)
- Various fixed-width table patterns (data-driven, likely intentional)

**Severity: INFO** — Grid sprawl is driven by varied content types (data tables, equipment lists, stat blocks). Most variation appears intentional.

---

## TOP 10 PRIORITY FIXES

| # | Severity | Category | Description | Files Affected | Est. Cards/Items |
|---|----------|----------|-------------|----------------|------------------|
| 1 | CRITICAL | Color Vars | ch13.html: 13 hardcoded faction hex colors in megastructure section | ch13.html | 13 instances |
| 2 | CRITICAL | Color Vars | ch18.html: 3 hardcoded Terran/Horde hex colors in ship section | ch18.html | 3 instances |
| 3 | MAJOR | Card Borders | ch29.html + ch34.html: All grid cards missing border-left styling | ch29, ch34 | ~17 cards |
| 4 | MAJOR | Card Borders | ch37.html + ch39.html: Audio faction cards missing borders AND using wrong title elements (span/strong instead of Orbitron) | ch37, ch39 | 14 cards |
| 5 | MAJOR | Card Borders | ch21.html: Faction section wrapper cards missing outer border-left | ch21.html | 8 cards |
| 6 | MAJOR | Card Borders | ch16, ch17, ch20, ch33, ch43-ai: Cards using border-top instead of border-left | 5 files | ~25 cards |
| 7 | MAJOR | Color Vars | ch23.html + ch25.html: Doctrine/alignment colors hardcoded; need new CSS variables (--architect, --vanguard, --tyrant) | ch23, ch25 | 9 instances |
| 8 | MAJOR | SVG viewBox | Faction icon SVGs use viewBox="0 0 100 100" instead of locked 52×52 standard | ch5–ch11 | 7 SVGs |
| 9 | MAJOR | Color Vars | ch10.html: Deep Hive Mind cards use hardcoded #880022/#ff4466 instead of var() | ch10.html | 2 instances |
| 10 | MAJOR | CSS Vars | global.css: 50+ instances of hardcoded rgba(0,180,255,X) should be Terran opacity variables | global.css | 50+ instances |

---

*Generated by CC-088 Visual Audit — 2026-04-04*
