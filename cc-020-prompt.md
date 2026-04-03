# CC-020: Expand Five Differentiators + Summary + Footer

## Task
Three small improvements in `js/dashboard.js`. Do all three.

### 1. Five Differentiators - Add 5th Card
The `buildFiveDifferentiators()` function currently has 4 cards. Add a 5th card to make it truly "Five Differentiators" again.

The 5th differentiator should be about **The Galactic Compendium** -- the living document that fills as you play, with 500-800 entries across 3 narrative voices (Commander Notes, AI Data Entries, Advisor Commentary). It persists across all campaigns and becomes a personal record of everything discovered, fought, and survived.

Use `border-left-color:var(--guardians)` for the new card. Format it exactly like the existing 4 cards (strong title + span description). Number it as "5."

Also update the section heading from "Five Differentiators" to just keep it as is (it will be accurate again with 5 cards).

### 2. Summary - Add More Stats
In `buildSummary()`, add these stats to the existing array:
- 124 Tech Nodes
- 140 Buildings  
- 12 Planet Types
- 5 Endings

Keep the existing 6 stats, add these 4 after them. Total: 10 stats.

### 3. Footer - Add Version Date
In `buildFooterQuote()`, after the existing stats line, add a small line:
"Last Updated: April 2026" in Share Tech Mono, font-size 0.5rem, color var(--text-dim), letter-spacing 2px.

## Rules
- Use unicode escapes for special chars (\u2014 for em dash, \u00B7 for middle dot, etc.)
- Do NOT modify any other functions
- Bump service worker from v119 to v120 in js/service-worker.js
- Run `node --check js/dashboard.js` to verify syntax
