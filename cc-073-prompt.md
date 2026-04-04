# CC-073: Ch18 Space Combat — Space Environment, Orbital Bombardment, Victory Conditions Expansion

## Context
Expanding Ch18 with space environment terrain (hazards, structures, warp lanes), orbital bombardment mechanics, and expanded variable victory conditions. CC-071 added auto-battle core/ROE, CC-072 added ship damage/salvage.

Read `pages/chapters/ch18.html` fully first (will have CC-071 and CC-072 additions).

## Task: Add 3 New Sections to Ch18

Insert AFTER the CC-072 salvage section and BEFORE the closing `</div><!-- /page-ch18 -->`.

### Section 1: Space Environment
Section label: "Space Environment"
Section heading: "Asteroids &middot; Nebulae &middot; Warp Lanes &middot; Structures &mdash; Space Has Terrain"
ID: `sec-ch18-environment`

**Intro paragraph:** Space isn&rsquo;t empty. Where you fight matters as much as what you bring. Environmental hazards, pre-built structures, and warp lane positioning create a tactical landscape that rewards preparation and punishes recklessness.

**Environment card grid (2x3):**

Card 1 — "ASTEROID FIELDS" (border-top: var(--horde)):
Block line of sight and movement. Ships can use them as cover (reduced incoming accuracy). Collisions damage ships that maneuver carelessly at high speed. Some asteroids contain mineable resources. Scrap-Horde excels at fighting in asteroid fields.

Card 2 — "NEBULAE" (border-top: var(--shards)):
Reduce sensor range for all ships inside. Shields regenerate slower. Energy weapons lose range. Perfect for ambushes &mdash; hide your fleet inside, enemy can&rsquo;t scan you until they&rsquo;re close. Eternal Shards&rsquo; psychic sensors partially bypass nebula interference.

Card 3 — "STAR PROXIMITY" (border-top: var(--vorax)):
Fighting near a star damages shields over time (solar radiation). Closer = more damage. Some weapons gain bonus damage from solar energy. Ships can slingshot around stars for speed boosts but risk hull damage. Solar flares are periodic events that spike radiation.

Card 4 — "ORBITAL STRUCTURES" (border-top: var(--terran)):
Defense platforms, orbital stations, minefields. Defenders can pre-build these in systems they control. Attackers must deal with them during the engagement. Stations can be captured (see Ch. 13 Orbital Station) or destroyed. Minefields damage ships entering the area &mdash; can be swept by fast ships or detonated by expendable craft.

Card 5 — "WARP LANE POSITIONS" (border-top: var(--guardians)):
Fighting at a warp lane entrance gives the defender &ldquo;gate advantage&rdquo; &mdash; attackers arrive in a predictable formation and face concentrated fire. Controlling a warp lane chokepoint is one of the most powerful defensive positions in the game. Flanking through a secondary lane (if one exists) negates gate advantage.

Card 6 — "DEBRIS FROM PRIOR BATTLES":
Old battlefields leave debris fields that affect new engagements. Reduced visibility, collision hazards, and potential salvage. Fighting in your own old debris field means navigating your own dead ships. Debris clears over time (<span class="ph-tag">PH</span> 5 turns).

### Section 2: Orbital Bombardment
Section label: "Orbital Bombardment"
Section heading: "Precision Strikes &middot; Carpet Bombing &middot; Diplomatic Consequences"
ID: `sec-ch18-bombardment`

**Intro paragraph:** If you control space, you can bombard the planet below without committing ground forces. This softens defenses, destroys fortifications, and demoralizes defenders &mdash; but at a cost. Infrastructure damage reduces the planet&rsquo;s value, and other factions are watching.

**Bombardment Tiers card (3-column):**

Card 1 — "SURGICAL STRIKE" (border-top: var(--terran)):
Expensive, precise. Targets specific fortifications, anti-air, or military targets. Minimal collateral damage. Infrastructure preserved. Diplomatic penalty: <span class="ph-tag">PH</span> Minor. Requires good intel (scanning tier affects accuracy). Best for planets you want to capture intact.

Card 2 — "STANDARD BOMBARDMENT" (border-top: var(--horde)):
Moderate cost. Area targeting. Destroys fortifications and some infrastructure. Defender ground forces take <span class="ph-tag">PH</span> 15-25% casualties before invasion begins. Diplomatic penalty: <span class="ph-tag">PH</span> Moderate. The practical middle ground.

Card 3 — "CARPET BOMBARDMENT" (border-top: var(--vorax)):
Cheap, devastating. Destroys most surface structures, heavy defender casualties (<span class="ph-tag">PH</span> 40-60%). Infrastructure severely damaged &mdash; you&rsquo;re conquering rubble. Diplomatic penalty: <span class="ph-tag">PH</span> Severe. Unity Accord treats this as an atrocity. Other factions judge you. May trigger Guardian intervention on Core Worlds.

**Consequences card (2-column):**

Left — "WHAT BOMBARDMENT DESTROYS":
Fortifications (turrets, bunkers, minefields), anti-air defenses, supply depots, production facilities, civilian infrastructure (higher tiers). Revenant sleeper caches on the surface can be damaged or destroyed. Ancient ruins tech can be lost permanently.

Right — "DIPLOMATIC FALLOUT":
All factions track bombardment use. Unity Accord reacts most strongly &mdash; carpet bombing triggers alignment penalties and potential Accord hostility. Even standard bombardment affects relations. Surgical strikes are mostly tolerated. Bombardment of Core Worlds may trigger Nexus Guardian retaliation regardless of tier.

### Section 3: Variable Victory Conditions (Expansion)
Section label: "Variable Victory Conditions"
Section heading: "6+ Battle End Conditions &mdash; Not Every Fight Is a Deathmatch"
ID: `sec-ch18-victory`

NOTE: There is already a "Variable Victory Conditions" section in ch18. Find it and REPLACE its content with this expanded version. Keep the same position in the file.

**Intro paragraph:** Space battles end differently based on context. The objective determines when the battle is won or lost. Some battles are fights to the death. Others are timed holds, escort missions, or desperate retreats. Victory conditions are determined by the conflict type and communicated to the player in the Pre-Battle Window.

**Victory Condition cards (3x2 grid):**

Card 1 — "ANNIHILATION": Destroy or rout the enemy fleet. Classic engagement. Winner controls the system.

Card 2 — "SYSTEM CONTROL": Hold the primary orbital position for <span class="ph-tag">PH</span> X minutes. Defender must dislodge the attacker. Attacker must survive the timer.

Card 3 — "ESCORT/CONVOY": Protect a transport fleet through the system. Attacker wins if <span class="ph-tag">PH</span> 50%+ transports survive. Defender wins by destroying enough transports.

Card 4 — "STATION ASSAULT": Capture or destroy an orbital station. Boarding actions possible (infantry in space). Station has its own weapons and shields.

Card 5 — "BLOCKADE BREAK": Attacker must punch through a blockade fleet to reach the planet. Doesn&rsquo;t need to destroy the blockade &mdash; just get enough ships through.

Card 6 — "RETREAT/EXTRACTION": One side is trying to withdraw. Winner is determined by how many ships escape vs how many the pursuer destroys. Fighting retreat with rear-guard actions.

Card 7 — "HAZARD SURVIVAL": Both fleets fighting near a collapsing star, in a dense asteroid field, or during a Vorax incursion. Survive the environment longer than the enemy. Sometimes both sides lose.

**Note card:** "Victory conditions can shift mid-battle. An annihilation fight becomes an extraction when your fleet takes catastrophic losses. A blockade break becomes a fighting retreat. The auto-battle adapts; your ROE should account for contingencies."

## Service Worker: bump to v180

## Rules
- Match existing ch18 visual style
- All numerical values PH-tagged
- HTML entities only
- The existing "Variable Victory Conditions" section should be REPLACED with the expanded version (same position)
- New sections (Environment, Bombardment) inserted after salvage, before closing div
