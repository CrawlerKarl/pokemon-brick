# Space Junkie Enemy Choreography and Motion Handoff

## Goal

Redesign Space Junkie mode so each wave reads as one authored aerial encounter instead of several randomly overlaid patterns. Preserve the existing Pokémon ecology, shooter controls, density caps, type combat, and the classic/blaster modes. The target feel is readable arcade choreography with modern easing, anticipation, follow-through, and sprite locomotion.

The movement language must also carry the game's three-act journey: **Act 1 = Generations 1–3**, **Act 2 = Generations 4–6**, and **Act 3 = Generations 7–9**. Each act should introduce a new kind of coordination, then let its three regions develop and culminate that idea. Progression should be visible in how enemies organize and act, not only in speed, health, density, or a larger random pattern pool.

The useful reference is the 1997 fixed shooter **Space Junkie**: distinct enemy-wave behaviors plus weapon overheat. Ubisoft's later **Space Junkies** is a zero-G VR arena shooter and is not the right structural reference. For formation language, use Galaga/Galaxian: enemies enter together, resolve into an immediately legible formation, then leave that formation in deliberate attack groups.

## What the current build is doing

The current density ramp is sound and can stay:

- Kanto–Johto: 1 squad
- Hoenn–Sinnoh: 2 squads
- Unova–Kalos: 3 squads
- Alola–Paldea: 4 squads
- Total flyers remain capped around 26.

The problem is that squad count is being treated as pattern count. In `buildLevel()` each squad independently chooses `kind` from the unlocked pattern pool (`js/state.js`, current lines 581–595). This makes multiple squads share an ecology but not a motion grammar.

Observed in the running game:

- Kanto's single arc was readable.
- Hoenn Challenge produced a full-width rank and a tight central orbit at the same time. The species were related, but the screen still read as two unrelated encounters.
- Unova Challenge produced three evolutionary tiers scattered across three unrelated shapes. The habitat was coherent; the choreography was not.
- Mewtwo's stage is the clearest failure. The guards are still the legacy two-row marching grid, Mewtwo teleports/patrols independently, and phase-3 adds orbit the location where they were summoned rather than Mewtwo's current position.

## Root causes to address

### 1. Random patterns have no compatibility rules

`kinds` grows from 5 choices in Kanto to roughly 31 by Kalos (`js/state.js`, current lines 446–457). Every squad rolls independently. There is no concept of compatible pairs, shared phase, shared anchor, foreground/background role, or one squad yielding while another attacks.

Stage 1 and Stage 2 use the same random pattern pool. The Challenge stage adds a modifier and stronger tiers, but it is not guaranteed to have more sophisticated choreography than Arrival. Newly unlocked patterns are not guaranteed to appear, so the player cannot perceive a designed progression.

### 2. Formations are individual paths, not a formation controller

Most members are placed directly by `flightPos(F, t)` (`js/update.js`, current lines 279–421). Multi-squad waves have separate centers, speeds, directions, and path types. They coexist spatially rather than behaving as one force.

Create a formation-level controller with:

- one wave clock;
- one primary anchor, or an intentional mirrored anchor pair;
- named slots for each member;
- formation-level morph/translation/rotation;
- one active attack group at a time;
- explicit entrance, hold, attack, recover, and exit states.

Individual enemies should usually occupy slots. They should only switch to a personal spline during a telegraphed dive or boss mechanic.

### 3. The separation solver is hiding invalid choreography

The 12-pass solver (`js/update.js`, current lines 900–951) prevents overlap, but every frame first resets enemies to their mathematical path and then projects them apart again. On center-crossing shapes this creates correction noise, neighbor swapping, and unstable velocity. The renderer then uses that corrected frame-to-frame delta to face and bank sprites, amplifying the visual jitter.

Keep the solver as a safety net, but authored formations should not require it during their hold state. A settled member should normally receive less than 2 px of separation correction per frame.

### 4. Entrances ease toward moving, unrelated targets

Each member starts farther off-screen and eases directly toward its current path point (`js/state.js`, current lines 607–619; `js/update.js`, current lines 887–897). This creates a loose fan of individual decelerations, not a squad entrance.

Replace it with a shared entrance spline per squad. Members follow the same curve with a time offset, then peel into their slots while preserving velocity direction. Use these beats:

1. **Ingress**: 0.9–1.4 seconds, shared spline, nose-to-tail.
2. **Settle**: 0.25–0.4 seconds, small overshoot and spring into slots.
3. **Hold**: formation moves as a body; enemies do not endlessly circulate through one another.
4. **Anticipate**: 0.25–0.5 seconds before a dive, surge, morph, or boss attack.
5. **Attack**: one squad or role acts while the rest provide a stable frame of reference.
6. **Recover**: attackers rejoin along a return spline and settle back into their slots.

### 5. Sprite locomotion is frame-rate dependent and too type-driven

The bare-enemy renderer (`js/render.js`, current lines 362–416) computes velocity as position delta × 60 and writes `br.pbx`/`br.pby` during drawing. That assumes a 60 Hz render rate and makes banking/animation change at 120 Hz or under throttling. Render should not mutate motion state.

Movement profiles are also chosen only from Pokémon type:

- flying/dragon/bug = flap;
- water/ice = swim;
- ghost/psychic/fairy/poison = hover;
- everything else = footfall.

This makes ground dragons such as Axew flap and treats many poison bipeds as hovering. Add species-aware motion profiles with type as a fallback:

- `winged`
- `hover`
- `swim`
- `serpentine`
- `biped`
- `quadruped`
- `heavy`

Update and smooth these fields in `update()` using `dt`: `visualVX`, `visualVY`, `heading`, `bank`, `bankVel`, `animPhase`, `squash`, and `anticipation`. Integrate locomotion phase from distance travelled. Use idle breathing below a speed threshold. Mirror only after horizontal direction remains changed for roughly 120–180 ms; do not flip at every curve apex.

The path tangent should drive facing and bank. Vertical velocity should affect pitch/squash, not be added directly to sideways bank. Round sharp corners in `square`/`zigzag` or keep those patterns out of normal Space Junkie holds.

### 6. Boss guards are not a Space Junkie formation

Boss stages are built as the normal grid plus a boss (`js/state.js`, current lines 323–419). The junkie branch only marks the guards bare and shrinks them (`js/state.js`, current lines 551–553). They retain the legacy march.

For Kanto, `motionTier` is 0, so guards only ride the global march while Mewtwo begins independent patrol motion in later phases (`js/update.js`, current lines 980–1057). Phase-3 adds store a fixed ring center at summon time (`js/update.js`, current lines 130–147), so Mewtwo can teleport away from its own guard ring.

Build dedicated Space Junkie boss encounters instead of reusing the grid builder. Guards should reference a boss/encounter anchor every update. Teleports may intentionally break that link for a short vanish/reform animation, but never by accident.

### 7. Reinforcements reset the visual language

`spawnReinforcement()` chooses a new habitat and a new random pattern, then chooses species independently per member (`js/state.js`, current lines 684–726). A wave can therefore change ecology, silhouette, and motion grammar halfway through.

Persist the wave's selected theme and choreography. Reinforcements should be the second beat of that wave: same motif, one or two intentionally selected species, and a harder variation of the same formation. Do not roll a new mini-wave.

## Proposed implementation model

Add a data-driven choreography layer for Space Junkie only. Keep `flightPos()` for classic/blaster flyers until the new system is proven.

Suggested concepts:

```js
const JUNKIE_CHOREOGRAPHIES = {
  kanto: {
    act: 1,
    arrival: { actBeat: 'establish', family: 'arc', entrance: 'pairedSweep', hold: 'driftingArc' },
    challenge: { actBeat: 'escalate', family: 'chevron', entrance: 'crossJoin', attack: 'pairedDive' },
    boss: { actBeat: 'climax', family: 'psychicLattice', boss: 'mewtwo' },
  },
  // ...
};
```

Each encounter should produce one `G.encounter` object:

```js
{
  id,
  act: 1,
  actBeat: 'establish',
  state: 'ingress',
  t: 0,
  anchor: { x, y, vx, vy },
  phase: 0,
  family: 'pairedEllipse',
  squads: [
    { role: 'core', members: [...], phaseOffset: 0 },
    { role: 'wing', members: [...], phaseOffset: 0.5 },
  ],
  activeAttack: null,
}
```

Members need stable `slotIndex`, `squadId`, `role`, and `motionProfile`. Formation functions return a slot position and tangent. They should not return unrelated closed paths for each squad.

Use seeded selection inside a small authored variant set. Randomize species, entry side, mirrored orientation, and attack timing; do not randomize the wave's core grammar.

## Three-act movement arc

Every region still has its own identity, but the player should be able to feel which act they are in even with the HUD hidden.

Each region follows the same dramatic rhythm:

1. **Arrival — establish:** clearly present the region's formation and the act's current movement idea.
2. **Challenge — escalate:** complicate or weaponize that idea while preserving its readable silhouette.
3. **Legendary — climax:** bind the idea to the boss, its phases, and its signature ability.

Do not reset the vocabulary at an act boundary. The new act should retain the readability learned in the prior act, then add one new structural verb.

### Act 1 — Formation: Generations 1–3

**Dramatic arc:** enemies learn to assemble and act as a unit.

- Kanto teaches a single readable formation, a shared anchor, and a basic peel-off attack.
- Johto introduces continuous circular/ribbon motion while keeping one composition.
- Hoenn introduces the first true two-squad relationship: mirroring, passing, and role exchange.
- The new verb is **assemble**. Variety comes from silhouette and entry direction.
- Use one primary anchor, at most two squads, and at most one attacking pair/group.
- Avoid full-formation morphs, center-crossing curves, simultaneous raids, and unrelated independent clocks.
- Act 1 should feel disciplined and learnable. Its bosses demonstrate that even spectacular motion can remain compositionally unified.

### Act 2 — Transformation: Generations 4–6

**Dramatic arc:** established formations begin to transform, divide roles, and attack as a system.

- Sinnoh starts with rigid lattice/clockwork shapes and makes the formation itself part of the hazard.
- Unova introduces a third coordinated role and attacks that propagate through ranks or lanes.
- Kalos culminates the act with smooth whole-formation morphs and nested structures.
- The new verb is **transform**. A familiar silhouette may open, close, rotate, exchange layers, or become another readable silhouette.
- Use two to three squads, shared phase relationships, and occasionally an intentional mirrored anchor pair.
- Introduce two-beat maneuvers: anticipate → transform/attack → recover.
- Controlled crossings are allowed only when slots have planned routes; the separation solver must not invent the choreography.
- Act 2 should feel more intelligent, not merely busier.

### Act 3 — Mastery: Generations 7–9

**Dramatic arc:** four-role formations combine, reinterpret, and finally master the movement vocabulary from the whole game.

- Alola introduces linked sub-formations and eclipse-style alignment.
- Galar rotates attack roles and makes formations react to arena-scale boss hazards.
- Paldea deliberately reprises Act 1 silhouettes and Act 2 morphs inside multi-beat encounters, then resolves them into one final unified attack.
- The new verb is **combine**. Multiple roles may coexist, but the player should always see one headline composition and one focal action.
- Use up to four squads, grouped into clear roles such as core, wing, orbit, and attacker.
- Later difficulty comes from role rotation, shorter recovery, chained authored beats, and combinations of known motifs—not random simultaneous curves.
- Act 3 can use controlled complexity, but it must remain more choreographed than Act 2, never more jumbled.
- The Paldea finale should feel like a recapitulation: arc/chevron discipline from Act 1, morphing coordination from Act 2, and four-role mastery from Act 3.

## Recommended 27-stage progression inside the three-act arc

Keep the existing squad-count ramp, but make additional squads add roles within one composition.

### Act 1 — Generations 1–3: Formation

| Region | Arrival | Challenge | Legendary |
|---|---|---|---|
| **Kanto** | **Cadet Arc** — one shallow 8-member arc; paired side entry; gentle lateral drift; no dives. | **Vanguard V** — one chevron; left/right wings breathe together; one telegraphed pair peels off and rejoins. | **Mewtwo: Psychic Lattice** — 10–12 guards in two mirrored arcs tethered to Mewtwo. On teleport, guards compress, dissolve, and reform around the new position. Phase 2 swaps the arcs once. Phase 3 forms two boss-centered counter-rotating rings; all new adds stay anchored to Mewtwo. |
| **Johto** | **Carousel** — one squad presented as an outer ring plus a small leader core, all on one anchor. | **Twin Current** — two parallel serpentine lanes treated as one ribbon; a surge travels from leader to tail. | **Lugia: Cyclone** — guards form two wing arcs around Lugia. Gust pulls both arcs through the same spiral, then restores them. No independent guard march. |
| **Hoenn** | **Paired Ellipse** — first two-squad wave; mirrored ellipses with one shared clock and opposite phase. | **Evolution Relay** — outer squad holds a dome while the elite squad passes through its center lane, then they exchange roles. No simultaneous unrelated loops. | **Rayquaza: Dragon Spiral** — guards form a non-intersecting double helix along Rayquaza's body line. During a sweep they trail behind it, then unwind back into a halo. |

### Act 2 — Generations 4–6: Transformation

| Region | Arrival | Challenge | Legendary |
|---|---|---|---|
| **Sinnoh** | **Diamond Lattice** — two squads fill alternating slots in one diamond; the whole diamond drifts. | **Pincer** — core holds center while mirrored wings open, warn, close toward a safe central gap, and recover. | **Dialga: Clockwork** — guards occupy clock-hour slots around Dialga. Time warp slows the shared formation clock and telegraphs a synchronized hand-like sweep. |
| **Unova** | **Three-Rank Echelon** — first three-squad wave; three species/tier ranks form one stepped arrow. | **Braided Lanes** — three non-crossing lanes share wavelength and speed; only one strand dives at a time. | **Zekrom: Polarity Wings** — two charged wings and one core rank swap sides along the same outer arc when lightning is prepared. |
| **Kalos** | **Nested Carousel** — three squads occupy inner/middle/outer rings on one anchor with restrained counter-rotation. | **Bloom** — one formation smoothly morphs ring → three petals → ring; slot interpolation prevents center collisions. | **Yveltal: Predator Fan** — guards form a wide V tethered to Yveltal. The V narrows during fan-shot anticipation and snaps open during release. |

### Act 3 — Generations 7–9: Mastery

| Region | Arrival | Challenge | Legendary |
|---|---|---|---|
| **Alola** | **Binary Moons** — four squads are grouped into two orbital bodies around a shared midpoint; each body remains internally stable. | **Eclipse** — inner and outer rings align, darken, then separate; one exposed quadrant attacks while the other three hold. | **Lunala: Eclipse Orbit** — guard visibility and orbit radius are driven by Lunala's phase state. Guards fade/reappear with the boss and never remain as an unrelated visible formation. |
| **Galar** | **Vortex Lanes** — four curved lanes rotate as a single vortex without crossing the center. | **Raid Carousel** — three squads hold nested arcs while the fourth performs one deep, warned raid; roles rotate after recovery. | **Eternatus: Spine** — guards form a segmented spine behind the boss. The spine bends away from the warned beam and reforms with spring follow-through. |
| **Paldea** | **Four-Wing Relay** — four mirrored wings enter in sequence and lock into one crest, echoing Kanto's first arc at a larger scale. | **Mastery Morph** — the whole formation transitions chevron → ring → phalanx across three clearly announced beats; no independent random patterns. | **Koraidon: Stampede** — phase 1 recalls Act 1's disciplined wings, phase 2 morphs them using Act 2's slot exchanges, and phase 3 pulls every role into Koraidon's wake before one final fan-out. The finale combines earlier motifs at higher tempo, not higher randomness. |

## Mewtwo vertical slice: implement this first

This is the best proof of the new architecture and directly addresses the reported problem.

1. In junkie boss waves, skip the normal `rows × cols` guard grid entirely.
2. Spawn 10–12 guards, split into `leftWing` and `rightWing`, with mirrored arc slots relative to a boss anchor.
3. Phase 1: Mewtwo and both wings drift as one composition. Guards may bob locally, but their anchor follows Mewtwo.
4. Teleport anticipation: 250 ms compression toward Mewtwo plus a psychic flash.
5. Teleport: Mewtwo and guards vanish together. Reappear at the new anchor; wings overshoot outward by about 8% and settle over 300 ms.
6. Phase 2: once per attack cycle, wings exchange sides along upper/lower semicircles. They must not pass through the same center point.
7. Phase 3: surviving guards become an outer orbit. Five adds form an inner orbit. Both derive their center from Mewtwo every update and counter-rotate slowly.
8. If Mewtwo teleports during phase 3, both rings compress/vanish/reform; do not drag them instantaneously and do not leave them at the old location.
9. Cap active divers at one during this fight. A guard cannot be part of a formation morph and a dive simultaneously.

## Modern motion polish checklist

- Move velocity/facing/bank/animation state updates out of `render.js`.
- Use exponential smoothing based on `dt`, not fixed `× 60` assumptions.
- Add sprite-specific motion-profile overrides; keep type only as fallback.
- Drive stride/flap/undulation phase from distance and speed.
- Add 250–500 ms anticipation to dives, raids, surges, boss morphs, and teleports.
- Add 200–350 ms recovery/settle after every attack.
- Use path tangents for facing and a smoothed bank. Delay horizontal mirroring at curve apices.
- Round discontinuous path corners or reserve them for deliberately mechanical enemies.
- Stretch the cached aura slightly opposite velocity for a cheap motion trail; do not allocate gradients per enemy per frame.
- Keep idle motion small and synchronized by squad with slight per-member phase offsets. Fully random bob phases make a clean rank shimmer like noise.
- Preserve readable silhouettes while shooting: attack recoil should be additive and short, not alter the formation path.

## Acceptance criteria

### Choreography

- Every non-boss wave exposes one named `motionFamily`.
- Every encounter exposes `act` (1–3) and `actBeat` (`establish`, `escalate`, or `climax`).
- Every region follows Arrival = establish, Challenge = escalate, Legendary = climax.
- Act 1 emphasizes stable assembly and introduces no unplanned center crossings.
- Act 2 visibly adds coordinated transformation and role exchange without increasing random pattern count.
- Act 3 recombines recognizable Act 1/2 motifs through four clear roles and one focal action.
- Paldea deliberately reprises at least one readable motif from each earlier act.
- Multi-squad waves use one shared clock and either one anchor or an intentional mirrored pair.
- No squad independently rolls a `kind` in Space Junkie mode.
- At most one attack group is in a dive/raid state at a time until Galar.
- Arrival and Challenge in the same region cannot roll the same choreography.
- Reinforcements reuse the wave's ecology and motion family as a harder second beat.

### Motion quality

- No settled formation member needs more than 2 px/frame of separation correction in normal hold motion.
- No visible position discontinuity except a fully covered teleport/vanish event.
- Facing does not flicker at path apices.
- Motion looks equivalent at 60 Hz and 120 Hz rendering when update `dt` is the same.
- All entrance trains finish within 2.5 seconds and settle without a one-frame bob or rotation pop.
- Dives and boss mechanics have a readable anticipation and recovery state.

### Bosses

- Boss guards remain compositionally attached to the boss anchor.
- Mewtwo's phase-3 adds remain centered on Mewtwo after every teleport.
- Junkie boss stages do not use the legacy bare two-row grid.

### Regression safety

- Classic and Blaster keep their existing `flightPos()` behavior unless changed deliberately later.
- Flyer↔wall overlap remains 0 in walled modes.
- Settled flyer↔flyer overlap stays within the existing invariant.
- Density caps and mobile performance limits remain intact.
- Add deterministic tests for choreography selection, slot uniqueness, boss-anchor following, and 60/120 Hz visual-state equivalence.

## Suggested implementation order

1. Add `G.encounter`, stable slots, shared anchors, and the ingress/settle/hold/anticipate/attack/recover state machine.
2. Build the complete Kanto vertical slice, including Mewtwo, before converting later regions.
3. Move sprite kinematics from render to update and add motion profiles.
4. Complete **Act 1** (Johto and Hoenn), validating the full assemble → mirror → role-exchange arc.
5. Build **Act 2** (Sinnoh–Kalos), adding planned formation morphs and two-/three-role attacks.
6. Build **Act 3** (Alola–Paldea), combining known motifs through clear four-role encounters and the Paldea recapitulation.
7. Rework reinforcements as the second beat of the current choreography.
8. Add deterministic tests for act selection and motion, then record short 60 Hz/120 Hz/mobile comparison captures for each act boundary.

## Scope guard for the next session

Do not try to preserve the current random combination system in Space Junkie mode. The variety should come from mirrored variants, entry side, species/ecology, attack timing, and controlled formation morphs. The core silhouette and motion family should be authored and recognizable.

Do not modify the user's existing uncommitted changes without first reviewing the current diff. At the time of this handoff, `README.md`, `js/input.js`, `js/render.js`, `js/state.js`, `js/update.js`, and `test.html` were already modified.

## References

- Space Junkie (1997) overview: https://www.mobygames.com/game/59799/space-junkie/
- Official Galaga history: https://galaga.com/en/history/galaga.php
- Official Galaga developer interview: https://galaga.com/en/special/int_vol1.php
