# CC-072: Ch18 Space Combat — Ship Damage Model, Disable vs Destroy, Salvage

## Context
Expanding Ch18 with the ship damage model (HP + shields + subsystems + directed targeting), disable vs destroy engagement modes, and post-battle salvage. CC-071 added auto-battle core, ROE, and speed controls.

Read `pages/chapters/ch18.html` fully first (it will have CC-071 additions).

## Task: Add 3 New Sections to Ch18

Insert these sections AFTER the "Ship Classes" section (the last current section) and BEFORE the closing `</div><!-- /page-ch18 -->`.

### Section 1: Ship Damage Model
Section label: "Ship Damage Model"
Section heading: "Shields &rarr; Hull &rarr; Subsystems &mdash; Every Hit Matters"
ID: `sec-ch18-damage`

**Intro paragraph:** Ships aren&rsquo;t simple HP pools. Every vessel has layered defenses and targetable subsystems. Damage degrades performance before killing &mdash; a crippled dreadnought with no engines and half its guns is still dangerous, but it&rsquo;s not winning any races. Directed targeting through Rules of Engagement determines where your shots land.

**Damage Layers card (vertical flow, 3 rows):**

Row 1 — "SHIELDS" (color: var(--shards)):
Absorb incoming damage first. Regenerate over time when not taking fire. Shield strength varies by ship class. Some weapons bypass shields partially (kinetic penetrators, phase weapons). Shields can be stripped by focused fire to set up alpha strikes. EMP weapons temporarily disable shield regeneration.

Row 2 — "HULL" (color: var(--terran)):
Once shields drop, hull takes damage. Hull integrity affects all subsystems proportionally &mdash; a ship at 50% hull has degraded performance across the board. Armor type matters: ablative (good vs energy), reactive (good vs kinetic), composite (balanced). Faction armor philosophy differs (Terrans: thick ablative; Shards: crystalline regenerative; Horde: scrap-patched but redundant).

Row 3 — "SUBSYSTEMS" (color: var(--vorax)):
Five targetable subsystems degrade as hull drops OR when specifically targeted via ROE:
- **Engines** &mdash; Speed and maneuverability. At 0%: ship is dead in space.
- **Weapons** &mdash; Damage output. Degrades proportionally. At 0%: ship is defanged.
- **Shields** &mdash; Regeneration rate. Damaged shield generators regenerate slower or stop.
- **Sensors** &mdash; Detection range and targeting accuracy. Degraded sensors = more missed shots.
- **Reactor** &mdash; Powers everything. Critical reactor damage can cause chain failures or explosion. Targeting the reactor is the fastest kill but risks destroying salvageable components.

**Subsystem Status card (horizontal bar concept):** Show each subsystem as a labeled bar. Note: "Subsystem damage is NOT random. It depends on: weapon type, ROE targeting orders, hit location (based on formation angle), and critical hit chance. A skilled commander using directed targeting can surgically disable a ship without destroying it."

### Section 2: Disable vs Destroy
Section label: "Engagement Outcomes"
Section heading: "Destroy &middot; Disable &middot; Capture &mdash; Not Every Victory Needs a Kill"
ID: `sec-ch18-outcomes`

**2-column card:**

Left — "DESTROY":
Standard outcome. Ship reduced to 0 hull &mdash; explodes, leaving a debris field. Fast, decisive, no risk of the ship fighting again. Debris can be salvaged for raw materials. Reactor kills may cause area-of-effect explosion damaging nearby ships (both sides).

Right — "DISABLE":
Ship subsystems crippled but hull intact. Requires targeting engines + weapons via ROE. Slower and riskier (the ship fights back while you&rsquo;re being surgical). Rewards:
- **Capture** &mdash; Board and claim the ship. Add to your fleet or strip for advanced components.
- **Research** &mdash; Study enemy tech. Grants research points toward countering that faction.
- **Diplomacy** &mdash; Return captured ships for diplomatic favor. Especially effective with the Accord.
- **Ransom** &mdash; Demand resources for the ship&rsquo;s return.

**Warning card:** "Disabling is a luxury. In desperate battles, you won&rsquo;t have the CP or time to be surgical. Disable orders work best when you have fleet superiority and can afford the slower kill time."

### Section 3: Post-Battle Salvage
Section label: "Salvage &amp; Aftermath"
Section heading: "Debris Fields &middot; Contested Recovery &middot; Faction Bonuses"
ID: `sec-ch18-salvage`

**Intro paragraph:** Every space battle leaves a debris field. Destroyed ships become salvage; disabled ships become prizes. But salvage is contested &mdash; if you don&rsquo;t control the system after the battle, someone else will pick through your wreckage.

**Salvage Rules card grid (2x2):**

Card 1 — "DEBRIS FIELDS":
Destroyed ships leave debris proportional to their size class. Debris persists for <span class="ph-tag">PH</span> 5 turns before degrading. Collection requires a ship or station in the system. Resources recovered: raw materials, component fragments, occasionally intact tech modules.

Card 2 — "CONTESTED SALVAGE":
If you retreat after winning tactically (or get pushed out by a third party), the new system controller gets the salvage. Scrap-Horde pirates are attracted to large debris fields and may arrive to contest recovery. Denying salvage to the enemy is a valid strategic reason to stay in a system.

Card 3 — "FACTION SALVAGE BONUSES":
- **Scrap-Horde** &mdash; +<span class="ph-tag">PH</span> 50% salvage yield. Can field-repair captured ships faster. This is their economy.
- **Revenant** &mdash; Can attempt to reactivate enemy ship husks using their excavation tech. Success rate based on hull integrity.
- **Terran League** &mdash; Strip captured ships for spare parts. +<span class="ph-tag">PH</span> 25% component recovery.
- **Eternal Shards** &mdash; Psychic resonance scanning finds intact tech modules others would miss.
- **Unity Accord** &mdash; Diplomatic salvage &mdash; returning debris/ships to original faction earns favor.

Card 4 — "CAPTURED SHIPS":
Disabled ships that are boarded become yours. They retain damage until repaired. Enemy crew can be detained (diplomatic leverage) or released (Accord approval). Captured ships of a different faction tech base operate at <span class="ph-tag">PH</span> 75% effectiveness until your engineers adapt (reducible through research).

## Service Worker: bump to v179

## Rules
- Match existing ch18 visual style exactly
- All numerical values PH-tagged
- HTML entities only
- Do NOT modify CC-071 sections or any existing sections
- INSERT after the last existing section, before closing div
