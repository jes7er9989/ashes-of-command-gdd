# CC-019: Expand buildGameSystems()

## Task
Expand the `buildGameSystems()` function in `js/dashboard.js`. Currently it has 12 system cards with just a title and one-line description each. Make them richer.

## What to Change

For each of the 12 system cards:
1. Add a faction-colored top border (cycle through --terran, --shards, --horde, --necro, --accord, --vorax, --guardians for visual variety)
2. Add an icon/glyph before the title using unicode symbols that match the system theme
3. Expand the description to 2 sentences instead of 1 -- add what makes each system interesting or unique
4. Change `onclick="location.hash='#chNN'"` to `onclick="event.preventDefault();Nav.go('chNN')"` for smooth navigation
5. Add a small "Chapter NN" label at the bottom of each card in Share Tech Mono font, dimmed

## The 12 Systems (keep this order)
1. Auto-Battle Engine (ch17) -- icon: crossed swords or shield
2. Space Combat (ch18) -- icon: star or rocket
3. Ground Combat (ch19) -- icon: target or flag
4. Equipment System (ch20) -- icon: wrench or gear
5. Commander Promotions (ch21) -- icon: medal or crown
6. General AI & Chain of Command (ch22) -- icon: hierarchy or brain
7. Galaxy Generation (ch12) -- icon: galaxy or constellation
8. Planets & Biomes (ch13) -- icon: globe or planet
9. Espionage & Intelligence (ch24) -- icon: eye or magnifier
10. Alignment & Win Paths (ch25) -- icon: compass or path
11. Tech Trees (ch28) -- icon: tree or circuit
12. Meta-Progression (ch33) -- icon: cycle or archive

## Style Rules
- Use existing CSS class `system-card` for each card
- Use existing CSS class `system-card-title` and `system-card-desc`
- Faction color vars: --terran, --shards, --horde, --necro, --accord, --vorax, --guardians
- Use unicode escapes for special chars and icons (e.g. \u2694 for swords, \u2B50 for star)
- Keep the systems-grid class wrapper
- Add a style attribute for the border-top color on each card

## Also Do
- Bump service worker from v118 to v119 in js/service-worker.js
- Run `node --check js/dashboard.js` after editing
- Do NOT modify any other function
