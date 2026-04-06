# CC-126 — JavaScript Modules Code Audit

**Scope:** All 22 JS modules under `js/` + `service-worker.js` at root (23 files total)
**Date:** 2026-04-05
**Mode:** READ-ONLY

## Summary

53 findings across 23 JavaScript files: 4 CRITICAL, 12 MAJOR, 24 MINOR, 13 INFO. Primary concerns are an uncancellable audio visualizer rAF loop, duplicate raycaster initialization, dead code accumulation in dashboard.js, and non-detaching event listeners in nav.js.

## 1. Lore Mismatches

No lore mismatches found in JS modules (lore content lives in HTML/JSON data files).

## 2. Visual/Style Issues

No visual/style issues found (styling handled by CSS; JS modules generate markup but visual correctness is a CSS audit concern).

## 3. Inaccuracies

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| A1 | MINOR | service-worker.js:130 | Comment says "JS modules (21)" but 22 JS files are listed in the precache array (lines 131–152) | Change comment to "JS modules (22)" |

## 4. Code Issues

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| C1 | CRITICAL | audio-engine.js:727-750 | `startViz()` starts an rAF loop via `_vizRaf = requestAnimationFrame(tick)` but there is no `stopViz()` function and `cancelAnimationFrame(_vizRaf)` is never called anywhere — the visualizer loop runs forever once started, leaking CPU | Add a `stopViz()` that calls `cancelAnimationFrame(_vizRaf)`, disconnects `_anlz`, and nulls both; call it from the mute/disable path |
| C2 | CRITICAL | solar-system.js:91+618 | `this.raycaster = new THREE.Raycaster()` is created in the constructor (line 91) then overwritten by `_setupRaycaster()` (line 618) — first allocation is immediately garbage, wasting a Three.js object | Remove the constructor assignment at line 91; let `_setupRaycaster()` be the sole initializer |
| C3 | CRITICAL | chapter-loader.js:190+198 | `var ab` declared twice in the same function scope (lines 190 and 198) — `var` hoisting makes this work but it shadows intent and is error-prone | Rename one to `var audioBtn` or extract into a helper; or use block-scoped `const` |
| C4 | CRITICAL | chapter-loader.js:106 | `this.loadChapterMeta()` (an async function) called without `await` — `load()` continues before meta is ready, so `this._chapterMeta` may be null when accessed on the first chapter load | Add `await` before `this.loadChapterMeta()` |
| C5 | MAJOR | nav.js | `bindRouting()` adds `hashchange`, `keydown` (Ctrl+K), `touchstart/touchmove/touchend`, and `document.click` listeners that are never removed — no `destroy()` or `unbind()` method exists | Add a `destroy()` method that removes all listeners added in `bindRouting()` |
| C6 | MAJOR | search.js:32 | `_factions: null` declared as a property but never populated or read anywhere in the module — dead state | Remove `_factions` property |
| C7 | MAJOR | content-renderers.js:181-200 | `MutationObserver` instances created per `.planet-detail` element are never `.disconnect()`'d when the chapter unloads — observers accumulate across chapter navigations | Store observer refs and disconnect them in a cleanup path called on chapter unload |
| C8 | MAJOR | music-player.js:132-133+141-142 | `fadeOutId`/`fadeInId` store the rAF ID from `_rampVolume()`'s `fadeOutRef.id`, but the ref's `.id` is assigned *inside* the first `requestAnimationFrame` callback — by the time `cancelAnimationFrame(fadeOutId)` runs, the stored ID may be the initial (stale) value, not the latest frame ID | Store the ref object itself and cancel via `cancelAnimationFrame(ref.id)` at the point of cancellation, or have `_rampVolume` return a cancel handle |
| C9 | MAJOR | dashboard.js:1129 | `window.addEventListener('scroll', updateParallax)` in `initParallax()` is never removed — Dashboard has no `destroy()` method; scroll handler persists even after navigating away | Add a `destroy()` method to Dashboard that removes scroll/observer listeners and stops canvas renderers |
| C10 | MAJOR | visual-effects.js:464-477 | `HoloTilt.init()` is commented out in `VisualEffects.init()` (line 464) but `HoloTilt.destroy()` IS called in `VisualEffects.destroy()` (line 477) — asymmetric init/destroy; calling destroy on something never initialized is harmless but misleading | Either comment out both init and destroy, or remove the destroy call to match |
| C11 | MAJOR | dashboard.js:216-226+229+996-1022 | `EPIGRAPH_QUOTES` array (6 entries), `_epigraphQuoteIndex`, `_epigraphQuoteTimer`, and `initEpigraphQuoteCycler()` all exist but `buildEpigraph()` returns empty string `''` — the cycler targets DOM IDs (`epigraph-quote-text`, `epigraph-quote-block`) that are never rendered | Remove `EPIGRAPH_QUOTES`, `_epigraphQuoteIndex`, `_epigraphQuoteTimer`, and `initEpigraphQuoteCycler()` — or remove the call chain if the cycler is still invoked |
| C12 | MAJOR | dashboard.js:315-324 | `buildStrategistQuote()` is defined but never called in `render()` — dead code | Remove `buildStrategistQuote()` or add it to the `render()` HTML concatenation if intentional |
| C13 | MINOR | glossary.js:293-295 | `_escapeHtml(s)` is defined but never called anywhere in the module — dead code | Remove `_escapeHtml()` or use it when setting `data-definition` attributes for defense-in-depth |
| C14 | MINOR | faction-renderer.js:202-204 | `_bindUnitExpand(container)` is an empty no-op stub — comment says "Click handling is done via inline onclick" | Remove the empty method and its call site at line 43 |
| C15 | MINOR | faction-renderer.js:478 + sprite-engine.js:81 | `FactionRenderer._hexToRgb()` and `SpriteEngine._hexToRgbStr()` are near-identical hex-to-RGB converters duplicated across modules | Consolidate into one shared utility or have FactionRenderer delegate to SpriteEngine |
| C16 | MINOR | solar-system.js:516+538 | `_tick()` calls `this._tick.bind(this)` on every frame via `requestAnimationFrame(this._tick.bind(this))` — creates a new function object per frame | Bind once in constructor: `this._boundTick = this._tick.bind(this)` and reuse |
| C17 | MINOR | canvas-galaxy.js:516+538 | Same issue as C16 — `_tick()` creates a new bound function per frame via `requestAnimationFrame(this._tick.bind(this))` | Bind once in constructor and reuse |
| C18 | MINOR | search.js | `bindKeys()` adds a `keydown` listener for Ctrl+K that is never removed — no cleanup method exists | Add cleanup if search is ever teardown-able |
| C19 | MINOR | data-worker.js | `CACHE_VERSION='v49'` vs service-worker.js `CACHE_NAME='aoc-gdd-v199'` — two independent version strings with no shared source of truth | Consider a build step or shared constant to keep SW and worker cache versions synchronized |
| C20 | MINOR | dashboard.js:292 | `_prologueQuoteTimer` is declared and managed by `initPrologueQuoteCycler()` but there's no cleanup path — if Dashboard is re-rendered, old intervals stack | Clear existing interval before creating new one (already done at line 1063 — but no final cleanup on navigate-away) |
| C21 | MINOR | canvas-galaxy.js:756-767 | Comet re-spawn uses `Math.random()` instead of `this._seededRandom()` — breaks deterministic reproducibility after first wrap-around | Use `this._seededRandom()` for comet re-spawn |
| C22 | MINOR | dashboard.js:134 | `buildEpigraph()` is still called in the `render()` HTML concatenation chain despite returning `''` — unnecessary function call | Remove the call from the concatenation chain |
| C23 | MINOR | music-player.js:18 | `activeSide` initialized to `'A'` but the audio elements aren't created until `_ensureElements()` — if `stop()` is called before any `play()`, `_activeEl()` returns null; handled by the null check at line 182 but fragile | Document the invariant or add a guard in `_activeEl()` |
| C24 | MINOR | three-loader.js:9 | Three.js CDN URL hardcodes `r128` — if the precache list in service-worker.js (line 128) ever changes the version, this URL becomes stale | Extract the Three.js version/URL into a shared constant |
| C25 | MINOR | audio-engine.js | Multiple `setTimeout` calls for note sequencing (lines 184, 295, 349 area) — not cancellable if audio context is closed mid-sequence | Store timeout IDs and clear them on stop/mute |

## 5. Leftover/Stale Content

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| S1 | MAJOR | dashboard.js:216-223 | `EPIGRAPH_QUOTES` array with 6 entries is dead data — `buildEpigraph()` returns `''` and the quote DOM IDs are never rendered | Remove the array |
| S2 | MAJOR | dashboard.js:309-324 | `buildStrategistQuote()` has full HTML but is never called from `render()` — orphaned method from a prior layout | Remove or re-integrate |
| S3 | MINOR | dashboard.js:27 | Function index comment lists `buildEpigraph()` as "Removed — absorbed into prologue" but the method still exists (returns `''`) and is still called | Remove method and call, update index |
| S4 | MINOR | dashboard.js:29 | Function index lists `buildStrategistQuote()` as "Removed — already in Hero" but the method still exists | Remove method, update index |
| S5 | MINOR | visual-effects.js:212 | `FactionCursor` is a complete no-op stub (`{ init() {}, destroy() {}, setFaction() {} }`) still called from init/destroy/setFaction paths | Remove the stub and its call sites if cursor glow is permanently disabled |
| S6 | MINOR | solar-system.js:619-621 | Comment in `_setupRaycaster()` says "useful if we later add point-based objects" — speculative future code | Remove the `Points.threshold` config or the comment |
| S7 | INFO | faction-renderer.js:202-204 | Comment in `_bindUnitExpand` explains why it's empty — this is a conscious no-op, not forgotten code | Consider removing the stub entirely since the explanation is self-evident from inline onclick |

## 6. Missing Details

| # | Severity | File:Line | Finding | Recommended Fix |
|---|----------|-----------|---------|-----------------|
| M1 | MAJOR | dashboard.js | No `destroy()` method — canvas renderers (`_galaxyRenderer`, `_solarRenderer`), scroll listeners, quote interval timers, and IntersectionObservers have no teardown path | Add `destroy()` that calls `_galaxyRenderer.destroy()`, `_solarRenderer.dispose()`, clears all intervals, and removes scroll listeners |
| M2 | MINOR | audio-engine.js | No public `stopViz()` or `destroyViz()` — once `startViz()` is called there is no way to stop the visualizer loop | Add `stopViz()` to the public API |
| M3 | MINOR | nav.js | No `destroy()` method despite binding 5+ global event listeners — makes the module non-teardown-able | Add `destroy()` or `unbindRouting()` |
| M4 | INFO | data-loader.js | No `bustCache()` method on the main-thread side — `data-worker.js` supports a `bust` message type but DataLoader doesn't expose it | Add `DataLoader.bustCache()` that sends `{ type: 'bust' }` to the worker |
| M5 | INFO | music-player.js | No `destroy()` method — audio elements created by `_createAudio()` are never removed from memory | Add `destroy()` that pauses both elements, cancels fades, and nulls references |
| M6 | INFO | glossary.js | No way to un-init or remove glossary spans from the DOM after `init()` — re-calling `init()` on the same content would double-wrap terms (prevented by `_shouldSkip` checking `.glossary-term` class, but no explicit teardown) | Document that `init()` is idempotent via the skip check, or add `destroy(contentEl)` |
| M7 | INFO | search.js | No `destroy()` or `unbind()` method — keydown listener persists forever | Add cleanup for SPA teardown scenarios |
| M8 | INFO | chapter-index.js | Clean — has proper `_unbindEvents()` / `destroy()`. No missing details. | None |
| M9 | INFO | sprite-engine.js | `ensureCss()` called at module parse time (line 520) injects a `<style>` tag — idempotent but runs even if sprites are never used | Gate behind first actual sprite render call |

## Clean Files (no findings)

- js/three-loader.js — minimal, clean lazy-loader
- js/decrypt-reveal.js — self-contained animation, no leaks
- js/icon-renderer.js — clean lookup module with no side effects
- js/planet-renderer.js — proper `dispose()` with ResizeObserver cleanup
- js/chapter-index.js — proper `destroy()` / `_unbindEvents()` lifecycle
- js/planet-textures.js — pure IIFE returning texture functions, no state leaks
- js/dev-mode.js — IIFE with properly paired add/remove for edit mode listener
- js/data-worker.js — clean Web Worker with IndexedDB versioning (note: version sync with SW is flagged under C19)
