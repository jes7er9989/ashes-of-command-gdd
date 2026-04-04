# CC-089: UI / Functionality Audit Report

**Date:** 2026-04-04
**Branch:** dev
**Service Worker Version:** aoc-gdd-v190
**Scope:** Full PWA — index.html, pages/chapters/*.html, js/*.js, css/global.css, manifest.json, service-worker.js

---

## 1. Broken Internal Links

### 1.1 navTo() Targets
**Result: CLEAN** — All 21 unique `onclick="navTo('...')"` targets across chapter files, supplements, appendices, and dashboard resolve to existing chapter HTML files.

### 1.2 href="#..." Anchor References
**Result: CLEAN** — Cross-chapter anchor links in ch2, ch8, ch10–ch15, ch19 all reference valid chapter IDs.

### 1.3 Asset & Resource Links (index.html)
**Result: CLEAN** — All stylesheet, favicon, manifest, and script `src` attributes resolve to existing files.

### 1.4 Missing Chapter in Sequence
| Classification | File | Issue |
|---|---|---|
| **INFO** | pages/chapters/ch41.html | Missing from ch1–ch46 sequence (gap: ch40 → ch42). No code references ch41, so no broken links — but the gap is notable. |

---

## 2. Service Worker Cache Integrity

**PRECACHE_URLS covers 25 files. The application has 120+ files that could be needed offline.**

### 2.1 JS Files Loaded But NOT Precached
| Classification | Missing File | Impact |
|---|---|---|
| **CRITICAL** | `/js/planet-textures.js` | Loaded at index.html:218, required by PlanetRenderer. Offline = broken planet rendering. |
| **CRITICAL** | `/js/planet-renderer.js` | Loaded at index.html:219, required by ContentRenderers. Offline = broken planet cards. |

### 2.2 Chapter HTML Files — NONE Cached
| Classification | Missing Files | Impact |
|---|---|---|
| **CRITICAL** | All 57 files in `/pages/chapters/*.html` | ChapterLoader fetches these dynamically. Zero offline chapter access. This is the #1 offline gap. |

### 2.3 Data JSON Files — 42 of 46 Missing
| Classification | Missing Category | Count | Impact |
|---|---|---|---|
| **MAJOR** | `/data/dialogue/*.json` | 7 | Faction dialogue unavailable offline |
| **MAJOR** | `/data/equipment/*.json` | 7 | Equipment tables broken offline |
| **MAJOR** | `/data/units/*.json` | 7 | Unit lists broken offline |
| **MAJOR** | `/data/tech/*.json` | 7 | Tech trees broken offline |
| **MAJOR** | `/data/factions/faction-colors.json`, `faction-emblems.json`, `faction-logos.json`, `faction-names.json` | 4 | Faction rendering degraded offline |
| **MAJOR** | `/data/nav/section-map.json`, `lore-quotes.json` | 2 | Nav section mapping + lore quotes missing |
| **MAJOR** | `/data/formations/formations.json` | 1 | Formation cards broken offline |
| **MAJOR** | `/data/loadouts/unit-loadouts.json` | 1 | Unit loadout display broken offline |
| **MAJOR** | `/data/icons/build-icons.json`, `equip-icons.json` | 2 | Icon rendering fails offline |
| **MAJOR** | `/data/planets/planets.json`, `planet-svg.json` | 2 | Planet data unavailable offline |
| **MAJOR** | `/data/sprites/shapes.json`, `unit-sprites.json` | 2 | Sprite rendering fails offline |

**Mitigating factor:** The SW uses network-first for `.json` files, so any JSON fetched while online gets cached dynamically. But a fresh install going immediately offline will have no data.

### 2.4 Asset Files — NONE Cached
| Classification | Missing File | Impact |
|---|---|---|
| **MAJOR** | `/assets/icon-192.png` | PWA icon missing offline (manifest requirement) |
| **MAJOR** | `/assets/icon-512.png` | Splash screen / OG image missing offline |
| **MINOR** | `/assets/favicon.svg` | Favicon missing offline |
| **MINOR** | `/assets/territory-map.svg` | Territory map SVG missing offline |

### 2.5 Other Missing Files
| Classification | Missing File | Impact |
|---|---|---|
| **MINOR** | `/manifest.json` | SW explicitly excludes it (line 82), but should precache for PWA reliability |
| **INFO** | `/404.html` | Not cached; low impact for SPA |

### 2.6 Stale / Phantom Entries
**Result: CLEAN** — All 25 entries in PRECACHE_URLS point to files that exist on disk.

---

## 3. Script Loading Order

### index.html Script Tags (lines 213–232)
**Result: CLEAN** — Loading order is correct and well-documented in comments (lines 188–211).

Verified dependency chain:
```
three.min.js (CDN) → no deps
data-loader.js     → no deps
sprite-engine.js   → DataLoader ✓ (loaded after)
icon-renderer.js   → DataLoader ✓
faction-renderer.js → SpriteEngine + IconRenderer ✓
planet-textures.js → no deps
planet-renderer.js → PlanetTextures + Three.js ✓
content-renderers.js → DataLoader ✓
decrypt-reveal.js  → no deps
chapter-loader.js  → DataLoader + FactionRenderer + ContentRenderers ✓
dashboard.js       → DataLoader ✓
search.js          → DataLoader ✓
chapter-index.js   → DataLoader ✓
glossary.js        → no deps
nav.js             → DataLoader + Dashboard + ChapterLoader ✓
audio-engine.js    → no deps
visual-effects.js  → no deps
dev-mode.js        → no deps
solar-system.js    → Three.js ✓
canvas-galaxy.js   → no deps
```

### Potential Issue
| Classification | File:Line | Issue |
|---|---|---|
| **MINOR** | index.html:213 | `three.min.js` loaded from CDN (`cdnjs.cloudflare.com`). If CDN is down and not cached, SolarSystemRenderer and PlanetRenderer will fail silently. No local fallback. |

---

## 4. JavaScript Module Health

### 4.1 TODO/FIXME/XXX/HACK Comments
**Result: CLEAN** — 0 found across all 21 js/*.js files.

### 4.2 console.log Statements
**Result: ACCEPTABLE** — 11 total console statements across 6 files.
- 2 intentional boot messages (visual-effects.js:509, dev-mode.js:110–113)
- 9 error/warning handlers using `console.warn()` (data-loader.js, search.js, dashboard.js, planet-renderer.js)

None are accidental debug statements.

### 4.3 Commented-Out Code Blocks (>5 lines)
**Result: CLEAN** — 0 found.

### 4.4 Dead Code (Defined but Never Called)
**Result: CLEAN** — All defined functions have identified call sites (event handlers, module init chains, or public API exposure).

---

## 5. Manifest / PWA Completeness

### 5.1 Required Fields
| Field | Present | Value |
|---|---|---|
| `name` | ✅ | "Ashes of Command: The Reclamation — Game Design Document" |
| `short_name` | ✅ | "AoC GDD" |
| `icons` | ✅ | 192×192 + 512×512 PNG |
| `start_url` | ✅ | "/" |
| `display` | ✅ | "standalone" |
| `theme_color` | ✅ | "#07080c" |
| `background_color` | ✅ | "#07080c" |
| `description` | ✅ | Present |
| `orientation` | ✅ | "any" |
| `scope` | ✅ | "/" |

### 5.2 Icon Files
| Classification | Icon | Status |
|---|---|---|
| ✅ | `assets/icon-192.png` | Exists on disk |
| ✅ | `assets/icon-512.png` | Exists on disk |

### 5.3 Service Worker Registration
**Result: CLEAN** — Registered at index.html:448 via `navigator.serviceWorker.register('js/service-worker.js')`.

### 5.4 Minor Issues
| Classification | Issue |
|---|---|
| **MINOR** | `screenshots` array is empty — Chrome uses this for richer install UI. Not required but recommended. |
| **INFO** | `purpose: "any maskable"` on both icons — best practice is to have separate icons for "any" and "maskable" since maskable icons need safe-zone padding. |

---

## 6. Accessibility Quick Check

### 6.1 Images Without Alt Attributes
| Classification | File | Issue |
|---|---|---|
| **MAJOR** | pages/chapters/*.html (all faction chapters) | Inline SVG faction emblems lack `<title>` element or `aria-label`. Screen readers cannot describe these images. WCAG 1.1.1 failure. |

### 6.2 Buttons Without Accessible Text
| Classification | File:Line | Issue |
|---|---|---|
| ✅ | index.html:46 | Hamburger button — has `aria-label="Toggle navigation"` |
| ✅ | index.html:114 | Sidebar toggle — has `aria-label="Toggle sidebar"` |
| ✅ | index.html:144 | Audio toggle — has `aria-label="Toggle audio"` |
| ✅ | index.html:166 | Back-to-top — has `aria-label="Back to top"` |
| ✅ | index.html:462 | Theme toggle — has `aria-label="Toggle light/dark mode"` |

### 6.3 Semantic Structure Issues
| Classification | File | Issue |
|---|---|---|
| **MAJOR** | pages/chapters/*.html | Data tables implemented as `<div>` grids with `grid-template-columns` instead of semantic `<table>` elements. Screen readers cannot parse as tabular data. |

### 6.4 Links With Empty or Generic Text
**Result: CLEAN** — No "click here" or empty-text links found.

---

## 7. Responsive / Mobile Breaks

### 7.1 Body Scroll Lock on Sidebar Open
| Classification | File:Line | Issue | Recommended Fix |
|---|---|---|---|
| **CRITICAL** | css/global.css:5532–5536 | `body.sidebar-open { position: fixed; width: 100%; }` causes scroll position loss and layout shift when sidebar opens on mobile. | Use `overflow: hidden` on body instead of `position: fixed`, or save/restore `scrollTop`. |

### 7.2 iOS Viewport Height
| Classification | File:Line | Issue | Recommended Fix |
|---|---|---|---|
| **MAJOR** | css/global.css:3045 | Sidebar uses `height: 100vh` on mobile. iOS Safari's dynamic toolbar causes 100vh to exceed visible area. | Use `height: 100dvh` with `100vh` fallback. |

### 7.3 Fixed Grid Columns
| Classification | File | Issue | Recommended Fix |
|---|---|---|---|
| **MAJOR** | pages/chapters/*.html | Inline `grid-template-columns: 200px 1fr` in faction stat tables. On screens <360px, the 200px column forces horizontal overflow. | Use `minmax(120px, 200px) 1fr` or collapse to single column below 400px. |

### 7.4 Z-Index Stacking Conflicts
| Classification | File:Line | Issue |
|---|---|---|
| **MAJOR** | css/global.css (multiple) | Uncoordinated z-index values: `#dev-mode-toast` at 9999, CRT overlay at 9991, `#display-controls` at 1200, one element at 99999. Multiple elements compete at z-index 9999. |
| **MINOR** | css/global.css:4651 | Mobile `.back-to-top` at z-index 999 may conflict with audio controls panel. |

### 7.5 Hero Section Negative Margins
| Classification | File:Line | Issue | Recommended Fix |
|---|---|---|---|
| **MINOR** | css/global.css:3081 | `.hero-section { margin: -16px -16px 0; }` on mobile can cause horizontal overflow combined with padding. | Use `calc()` or ensure parent has `overflow-x: hidden`. |

### 7.6 CDN Dependency Without Fallback
| Classification | File:Line | Issue | Recommended Fix |
|---|---|---|---|
| **MINOR** | index.html:213 | Three.js loaded from `cdnjs.cloudflare.com` with no local fallback. | Add local copy or onerror fallback script tag. |

---

## TOP 10 PRIORITY FIXES

| # | Severity | Category | Issue | Fix |
|---|---|---|---|---|
| **1** | CRITICAL | SW Cache | 57 chapter HTML files not precached — zero offline chapter access | Add all `/pages/chapters/*.html` to PRECACHE_URLS |
| **2** | CRITICAL | SW Cache | `planet-textures.js` and `planet-renderer.js` loaded by index.html but missing from precache | Add both to PRECACHE_URLS |
| **3** | CRITICAL | Responsive | `body.sidebar-open { position: fixed }` causes scroll loss + layout shift on mobile | Replace with `overflow: hidden` approach |
| **4** | MAJOR | SW Cache | 42 of 46 data JSON files not precached — fresh offline install has no faction/unit/equipment data | Add all `/data/**/*.json` to PRECACHE_URLS |
| **5** | MAJOR | SW Cache | PWA icon assets (icon-192.png, icon-512.png) not precached | Add `/assets/icon-192.png` and `/assets/icon-512.png` to PRECACHE_URLS |
| **6** | MAJOR | Responsive | iOS `100vh` sidebar bug — toolbar causes content to extend below visible area | Use `100dvh` with `100vh` fallback |
| **7** | MAJOR | Accessibility | Inline SVG faction emblems in chapter files lack `<title>` elements | Add `<title>Faction Name Emblem</title>` inside each SVG |
| **8** | MAJOR | Accessibility | Data tables rendered as div grids instead of semantic `<table>` elements | Use `<table>` with `role="table"` or add ARIA table roles to div grid |
| **9** | MAJOR | Responsive | Fixed 200px grid columns in faction stat tables overflow on small screens | Use `minmax(120px, 200px) 1fr` or responsive collapse |
| **10** | MAJOR | Responsive | Z-index arms race (values up to 99999) with no coordinated stacking strategy | Define z-index scale in CSS custom properties, cap at ~100 |

---

## SCORECARD

| Category | Status |
|---|---|
| Broken Internal Links | ✅ Clean (1 INFO: missing ch41 in sequence) |
| Service Worker Cache | ❌ Severely incomplete (25/120+ files cached) |
| Script Loading Order | ✅ Clean (1 MINOR: CDN dependency) |
| JS Module Health | ✅ Excellent (no TODOs, no dead code, no debug logs) |
| Manifest/PWA | ✅ Complete (2 minor recommendations) |
| Accessibility | ⚠️ Needs work (SVG alt text, semantic tables) |
| Responsive/Mobile | ⚠️ Needs work (scroll lock, iOS vh, z-index conflicts) |
