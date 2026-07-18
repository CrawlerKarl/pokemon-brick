# WAVEBREAKER — World, Boss, and Finale Plan

> **Implementation status (2026-07-17).** Landed in the worktree, verified by
> suite (33/33) + screenshots: **§1 prerequisite bug** (tier-III ember radius
> clamp in `drawTypedBolt` + an all-shapes×all-tiers render test) and the
> full **§7 ending structure** — stage 27 on a real journey now enters
> `G.state = 'ending'` (never level 28), writes a versioned completion record
> to `pkbrk-victory` BEFORE the sequence plays, keeps the checkpoint intact,
> runs the five-beat Ninefold Dawn (silence → sky-crack/shatter → nine
> landmark ribbons + node stamps → DEX constellation + legendary salute →
> sun, THE WAVE IS BROKEN, stats), honours reduceFlash (gold outlined shards,
> no white flash), lets taps advance beats / veterans skip to dawn, and ends
> in the explicit **TIME SPIRAL** (old level-28 loop) vs **TITLE** choice.
> Trials/dailies keep the classic loop. Suite test: `campaign completion
> branch` (test.html). ALSO BUILT: the §5 scene-director SKY slice —
> `SCENE_SKIES` (scenery.js) authors all 27 region×stage skies (daylight
> arc, celestial bodies incl. big moon + eclipse, star gating via
> `SCENE_DARK`, daylight silhouette haze; cache keyed region+stage; title
> keeps Kanto legendary night). NOT yet built: §5 landmark/weather variants,
> mid-fight omens + telegraph subdual, region postcards; §6 boss director +
> encounter scripts, region postcards, Theater/Boss Rush, music layers, dawn
> title treatment — beat-sheet niceties still simplified (no final-shot
> interaction in beat 2, no act-emblem merge, no hold-to-skip [tap-to-skip
> for veterans instead], constellation uses capped DEX rather than per-run
> catch list).

## The intended outcome

The 27-stage campaign should feel like a journey through nine genuinely different places, not one long night with changing silhouettes. Every three-stage region should have a visible environmental story, every legendary should change the rules of play rather than only firing a differently colored pattern, and stage 27 should end in a bespoke victory sequence instead of silently looping back to Kanto.

The recommended creative spine is:

> **See a new world → watch it change → survive its legend → carry its light into the next world.**

This plan keeps the existing Canvas 2D art direction, local Pokémon sprites, three modes, readability rules, reduced-motion settings, and mobile performance constraints. It builds on the strongest systems already present rather than replacing them.

---

## 1. Current-state audit

### What is already strong

- There are nine authored landmark scenes in `js/scenery.js`: Pallet Town, Ecruteak, Sootopolis, Mt. Coronet, Castelia, Lumiose, Alola's festival grounds, Wyndon, and Mesagoza.
- Each region already has its own accent, three-color sky palette, terrain palette, ambient particle type, music root, and tempo.
- The 27 Starfighter waves already have an authored three-act motion arc: **assemble → transform → combine**.
- Every region finale is already a three-round gauntlet: sentinels, legendary, mythical.
- Legendary movement styles, entrance names, phase transitions, typed shots, and several signature attacks already exist.
- The Kanto Rift/Mew VMAX sequence proves that a visually separate arena can feel special without introducing a large bitmap pipeline.
- The effects stack already has useful high-quality primitives: cached glows, bloom, silhouettes, rings, particles, telegraphs, screen shake, hit stop, and haptics.

### Why the worlds still read as “all night”

The problem is not a lack of drawings. It is that the global treatment overwhelms their differences:

- All nine `GENS.sky` palettes are dark navy, purple, or near-black.
- `buildBackground()` always draws a moon.
- `drawBackground()` always draws the same starfield.
- `drawAtmosphere()` applies a strong dark top wash to every gameplay scene.
- A region has one cached background for all three stages; Arrival, Challenge, and Legendary do not change time, weather, lighting, or landmark state.
- Most landmarks live in the bottom 10–30% of the frame and use similarly low-contrast silhouettes. The upper playfield—the part the player watches—therefore looks similar across regions.
- Ambient effects vary, but they are small overlays on the same night composition.
- Music changes root and tempo, but every region uses the same minor progression, instruments, sequencing logic, and broad intensity rule.

### Why the bosses can still feel mechanically related

The current bosses have good names and motion identities, but most attacks resolve through a small shared vocabulary:

- aimed shot or fan;
- radial shot ring;
- warned vertical column;
- horizontal sweep/dash;
- temporary invulnerability;
- temporary global ball/time modifier.

Enemy shots also share the same spiked-orb rendering. This makes attacks legible, but it weakens the fantasy that Aeroblast, Roar of Time, Black Sun, and Dynamax Cannon are fundamentally different events.

The sentinels mostly select one typed attack from a shared type switch. Mythicals have more variety, but many are still one attack event on a cooldown rather than a small encounter with a setup, rule, and payoff.

### The ending gap is structural

There is currently no campaign victory state. Clearing stage 27 increments `G.level` to 28. Because generation lookup wraps with modulo and `buildLevel()` already calculates a full-journey cycle, the normal campaign rolls directly into a harder Kanto loop after the upgrade screen.

The existing “RUN COMPLETE” screen is the game-over summary, not a victory celebration. A real ending therefore needs:

1. a non-looping campaign-complete branch;
2. a dedicated `victory`/`ending` state;
3. persistent completion records;
4. a bespoke visual and musical sequence;
5. an explicit choice to enter New Game+ afterward.

### Small prerequisite bug found during visual inspection

A tier-III fire pilot can crash rendering in `drawTypedBolt()` because the fourth ember uses a radius that evaluates to a tiny negative floating-point number. This surfaced when jumping directly to the Paldea trial. Clamp that radius above zero before using late-game trials as the visual QA harness.

---

## 2. Design pillars

### 1. A screenshot should identify the stage

The player should be able to distinguish not just Kanto from Galar, but Kanto Arrival from Kanto Legendary, without reading the HUD.

### 2. Change the world every stage, not only every region

Each region tells a three-beat environmental story:

- **Arrival:** broad, inviting, readable, usually daytime.
- **Challenge:** weather, population, movement, or light intensifies.
- **Legendary:** the boss's power transforms the arena.

That produces 27 distinct compositions from nine reusable scene kits.

### 3. Boss identity comes from a rule, not projectile count

Every legendary gets one mechanic the player can describe in a sentence: “Mewtwo remembers where I was,” “Lugia turns wind into corridors,” “Dialga replays time,” and so on. Higher phases recombine that rule; they do not merely increase fire rate.

### 4. Threats always teach, test, then remix

Each major mechanic appears in this order:

1. a harmless or forgiving demonstration;
2. a clear single-pattern test;
3. a final combination with the boss's movement or another known attack.

### 5. Spectacle supports readability

Background motion must pause, dim, or move away from the combat focus when a lethal telegraph begins. Color is never the only warning; use shape, timing, sound, and motion together.

### 6. Completion should visibly reverse the journey's tension

The game spends its campaign accumulating storms, eclipses, rifts, and distortion. The final reward should be an unmistakable release into warmth, daylight, open space, and a quiet moment with the player's partner.

---

## 3. Reference games and transferable lessons

- [Tetris Effect: Connected](https://www.tetriseffect.game/about-the-game/) gives every Journey stage its own theme, graphics, music, and sound effects, synchronized with play. **Use here:** make the stage variant and music layer respond to arrival, challenge escalation, boss phase, and victory—not only region index.
- [Space Invaders Extreme](https://spaceinvaders.square-enix-games.com/games/space-invaders-extreme) pairs synchronized visuals and interactive sound with 16 stages, distinct attack patterns, bosses, hidden bonuses, and individual-stage practice. **Use here:** keep Trial Mode as the rapid-learning/QA surface, add score and audiovisual cues tied to boss actions, and reserve one discoverable spectacle per act.
- [Shatter's official soundtrack notes](https://sidhe.bandcamp.com/album/shatter-official-videogame-soundtrack) describe the music as developed closely with the game's evolving visuals and themes. **Use here:** give stages arrangement layers and boss stingers rather than nine transpositions of one texture.
- [Cuphead](https://studiomdhr.com/press-kits/) centers screen-filling boss battles, strange worlds, distinctive backgrounds, weapons, and secrets. **Use here:** let a phase transition alter silhouette, arena, movement, and counterplay together; it should look like the encounter has become a new scene.
- [Furi's developers](https://www.thegamebakers.com/furi-and-creating-memorable-moments/) emphasize visually unique environments that tease the next boss, music-led tension, and rest beats between intense fights. **Use here:** turn the end of Challenge into a short environmental omen, and give the player a two-to-four-second calm before each legendary round.
- [Ikaruga](https://store.steampowered.com/app/253750/Ikaruga/) makes its polarity system govern defense, damage, energy, and scoring. **Use here:** the existing type system should be boss counterplay, not only a damage multiplier; matching/resisting a signature attack can create an offensive opening.
- [Resogun](https://blog.playstation.com/2013/08/20/introducing-resogun-the-new-ps4-exclusive-from-the-super-stardust-team/) adds rescue objectives and gravity to change how a shooter arena is read. [Nex Machina](https://housemarque.com/games/nexmachina) turns destruction itself into a reward. **Use here:** add optional cancel/weak-point objectives during bosses and let boss defeat physically transform or break the arena.

The takeaway is not “add more particles.” It is to bind world, rules, sound, and reward into the same authored beat.

---

## 4. The 27-stage visual journey

### Campaign-level palette arc

- **Act I — Wonder (Kanto–Hoenn):** natural skies, recognizable landscapes, clear seasons, friendly daylight. Legendary rounds introduce the first unnatural weather.
- **Act II — Transformation (Sinnoh–Kalos):** stronger height, architecture, technology, and cosmic phenomena. Transitions become more theatrical.
- **Act III — Mastery (Alola–Paldea):** the brightest daytime colors and the darkest boss distortions. Familiar world layers combine and fracture.

Night should be a special event, not the default. Recommended baseline distribution across 27 stages:

- 10 daylight/morning stages;
- 5 golden-hour/sunset stages;
- 4 overcast or storm stages;
- 4 true night stages;
- 4 supernatural/cosmic stages.

### Region scene plan

| Region | Arrival | Challenge | Legendary arena |
| --- | --- | --- | --- |
| **Kanto** | **Pallet Sunrise.** Pale peach sky, low sun, long hill shadows, Pidgey silhouettes, windmill slowly turning. The first minute should feel safe and spacious. | **Route Stormfront.** Bright afternoon gradually clouds over; grass ripples and distant power-line flashes foreshadow the legendary birds. | **Cerulean Psychic Break.** Twilight laboratory glow rises behind the hills; the moon appears only when Mewtwo wakes. Psychic fractures bend the horizon and briefly duplicate scenery during teleports. |
| **Johto** | **Autumn Morning.** Amber foliage, drifting leaves, warm mist around Ecruteak's towers. | **Lantern Dusk.** Lanterns illuminate one tier at a time as the challenge progresses; the Burned Tower emits embers and silhouettes of the beasts cross the ridge. | **Sacred Tempest.** Moonlit clouds spiral around Bell Tower. Lugia's attacks carve bright wind corridors; defeating it clears the storm and reveals a starless silver sky. |
| **Hoenn** | **Tropical Noon.** High cyan sky, bright Sootopolis water, moving reflections, Wingull shadows, visible white crater houses. | **Monsoon Basin.** Clouds roll inward, rain hits the water, drainage falls appear on the crater walls, and occasional lightning silhouettes the whole town. | **Sky Pillar Ascent.** The arena lifts above the storm into a sunlit cloud deck. Rayquaza coils through clouds and tears open patches of stratospheric blue. |
| **Sinnoh** | **Cold Mountain Morning.** Crisp blue-white sky, snowcaps, thin cloud shadows, bright ruins. | **Coronet Whiteout.** Snow and fog close distance; ancient columns light in sequence to keep navigation readable. | **Spear Pillar Time Fracture.** Day and starfield alternate in clock-shaped wedges. Background pieces briefly rewind when Dialga uses Roar of Time. |
| **Unova** | **Castelia Day.** Blue sky, reflective river, moving bridge lights and tiny ferries; skyscrapers finally read as buildings rather than a black band. | **Neon Rush Hour.** Orange sunset descends while windows, traffic lanes, and billboards activate in musical sequence. | **City Blackout.** Zekrom kills the skyline lights; only charged rails, cloud veins, and the boss silhouette remain. Each successful counterattack re-lights one district. |
| **Kalos** | **Lumiose Rose Dawn.** Bright cream architecture and rose sky; Prism Tower catches the sunrise. | **Festival Blue Hour.** Boulevards glow, searchlights sweep high above combat, petals and prism motes share the air. | **Black Sun.** Yveltal eclipses the tower. Red wing-shaped shadows stretch over the city, while player-created safe zones restore color locally. |
| **Alola** | **Island Day.** Saturated ocean-blue sky, active palms, surf glints, festival preparations, visible snow on Lanakila. | **Fire Festival Sunset.** Torches ignite to the beat; dancers are implied with small silhouette groups outside the combat lane. | **Lunar Rite.** This is the campaign's most beautiful true night. Lunala raises a huge moon behind the stage and changes it through crescent, half, and eclipse phases. |
| **Galar** | **Overcast League Day.** Fast clouds, green outskirts, moving ferris wheel, flags and crowd color. | **Floodlight Cup.** Stadium roof closes as the sky darkens; crowd pulses and score lights respond to combos. | **Darkest Day.** The roof tears open into a red Dynamax storm. Arena panels lift into a crown and Eternatus's cannon lights the entire cloud ceiling. |
| **Paldea** | **Mesagoza Golden Morning.** Warm Mediterranean sky, academy banners, birds and drifting grass seed, clearly colored masonry. | **Treasure-Road Noon.** Bright hard light, dust devils, distant terrain layers from multiple biomes, academy clock moving toward the final hour. | **Temporal Garden.** The city gives way to luminous Area Zero-inspired crystal terraces and a dawn sky containing subtle past/future scanlines. Koraidon and Pecharunt distort the terrain; victory resolves it into the brightest sky in the game. |

### Stage-level movement budget

Every stage gets no more than three continuous background motions:

1. one large slow motion: clouds, water, sun, storm rotation;
2. one landmark motion: windmill, lanterns, bridge traffic, tower beacon, ferris wheel;
3. one particle family: leaves, rain, snow, embers, prism motes, dust.

During a major boss telegraph, the large slow motion reduces to 25% speed and landmark motion dims. The attack becomes the visual focus.

---

## 5. Background system design

### Replace one background per region with a scene director

Introduce data equivalent to:

```js
SCENE_PROFILES[region][stage] = {
  name,
  timeOfDay,
  sky,
  celestial,
  haze,
  landmarkState,
  ambient,
  musicLayer,
  transition,
  bossPhases
}
```

The director owns four inputs:

- `regionIdx(G.level)`;
- `stageIdx(G.level)`;
- normalized wave/round progress;
- boss phase or gauntlet round.

### Render layers

Use four layers so visual richness does not require per-frame redrawing of everything:

1. **Far sky cache:** gradient, sun/moon, distant clouds, cosmic fields.
2. **Far landmark cache:** mountains, skyline, town silhouettes, distant water.
3. **Dynamic midground:** a small number of animated landmark elements and parallax objects.
4. **Weather/boss overlay:** particles, storm light, phase tint, fracture, eclipse, aurora.

Cache by `region + stage + phaseBucket + viewport`. Crossfade old and new cached layers for 1.2–1.8 seconds at stage transitions. Boss overlays remain dynamic and cheap.

### Make stage progression visible inside a fight

Do not hold a scene completely static until clear. Give each stage two subtle progression cues:

- at roughly 50% remaining enemies, change one environmental state;
- when the final elite/gauntlet round arrives, trigger one omen.

Examples: Kanto clouds gather, Johto lanterns ignite, Hoenn water darkens, Unova windows turn on, Galar roof panels close.

### Improve depth without obscuring gameplay

- Add one mid-distance silhouette band around 45–65% of screen height, but keep its contrast below enemy auras.
- Reserve the central combat corridor for low-frequency shapes. Detailed windows, foliage, and lights should cluster near edges and horizon.
- Use color-temperature contrast: warm world/cool shots or cool world/warm threats. Do not solve every stage with higher saturation.
- Parallax should follow smoothed player position at different rates, not raw pointer movement.

### Region transitions

After each draft, show a 2.5-second travel postcard before the next region's first wave:

- the completed node stamps on the journey map;
- the old horizon slides down or dissolves into particles;
- the new sky color fills from the direction of travel;
- the next landmark silhouette resolves;
- one short region motif plays.

Act boundaries keep the existing evolution ceremony, then finish by revealing the new act's first sky behind the evolved partner.

---

## 6. Boss attack redesign

### The boss director

Move signature encounters from one large ID switch toward authored phase scripts:

```js
BOSS_SCRIPTS[id] = {
  rule,
  phases: [{
    move,
    attacks,
    attackOrder,
    backgroundCue,
    musicCue,
    weakPoint,
    transition
  }]
}
```

Each attack is a small state machine:

1. **Tell:** 0.6–1.4 seconds, depending on danger.
2. **Commit:** the damaging movement/pattern.
3. **Recover:** a readable punish window.

Only one major attack owns the arena at a time. Minor shots may continue only if their paths cannot erase the major attack's intended safe route.

### A richer but still readable attack vocabulary

Add reusable primitives with distinct silhouettes:

- curved wind lanes;
- crescent gates;
- expanding rings with authored gaps;
- delayed afterimages that repeat player history;
- destructible anchors/weak points;
- sweeping ground shockwaves;
- portal pairs that redirect shots;
- orbiting hazards with a clearly marked release direction;
- arena rails or cells that light before activation;
- slow fields that affect projectiles, not input latency;
- tether attacks with a visible break condition;
- temporary cover or safe beacons;
- boss-scale body trails that become hazards only after the sprite passes.

Render these by attack family rather than as the same spiked orb. Color still communicates type, while silhouette communicates behavior.

### Legendary encounter plan

| Legendary | Rule the player learns | Phase development and climax |
| --- | --- | --- |
| **Mewtwo** | **It remembers where you were.** Teleport afterimages mark the player's previous positions, then fire delayed psychic lines. | P1 teaches one afterimage. P2 creates a triangle of afterimages whose beams leave one readable interior/exterior route. P3 adds a gravity well that bends the delayed lines around it; destroying two psychic anchors opens a long damage window. The environment visibly duplicates and snaps back. |
| **Lugia** | **Wind defines the safe corridor.** Broad translucent streamlines push projectiles and gently bias the player/ball. | P1 alternates left/right Aeroblast corridors. P2 dives through the arena, leaving a curved wake with one opening. P3 combines a rotating cyclone wall with a calm eye; resisting Flying/Psychic energy charges an amplified counter-shot. |
| **Rayquaza** | **The path behind the boss becomes dangerous.** Its serpentine body paints a delayed storm trail. | P1 draws one S-curve trail. P2 calls meteors that land only outside the trail, temporarily reversing which space is safe. P3 coils around the arena to form a shrinking sky tunnel; shooting three cloud nodes widens it before the finishing pass. |
| **Dialga** | **Patterns repeat in time.** Every major attack casts a ghost preview of where it will replay. | P1 repeats a two-hand clock sweep. P2 records the last two seconds of bullets and replays them at half speed while current shots pause. P3 splits the arena into past/day and future/night wedges; only one timeline is active at a time, announced by clock chimes and lighting. |
| **Zekrom** | **Lightning follows a circuit.** Floor/sky nodes light in sequence before the strike jumps between them. | P1 teaches three-node chains. P2 blacks out the city and makes the player's position the final node, encouraging a deliberate bait-and-move. P3 builds two overlapping circuits; destroying the charged node redirects the strike into Zekrom and re-lights a skyline district. |
| **Yveltal** | **The Black Sun steals energy from marked space.** Wing-shaped shadow sectors drain Mega charge and heal the boss only if occupied when they close. | P1 uses one slow crescent sector. P2 tethers the player to a shadow seed that can be shot or bounced into. P3 creates a rotating black sun with alternating red wing gaps; breaking the seed at the correct beat turns the drain into a large punish window. |
| **Lunala** | **Moon phase changes which gates are solid.** Bright crescents and dark crescents alternate collision states. | P1 teaches one rotating crescent gate. P2 adds portal pairs that redirect one volley with a clearly drawn exit arc. P3 runs a full eclipse: the world darkens, four safe stars appear, and the active star advances with the musical count. Reduced-flash mode keeps the whole arena visible with high-contrast outlines. |
| **Eternatus** | **The arena is being assembled into a weapon.** Red crown segments lock into place and determine the cannon's path. | P1 uses one segment and one warned perspective beam. P2 drops Dynamax shards that become temporary cover/ricochet surfaces. P3 completes the crown and aims a screen-depth cannon; breaking the lit segment creates the safe wedge and causes the beam to tear open the storm ceiling. |
| **Koraidon** | **Momentum commits it to a lane.** Road markings and dust show the charge path; a missed charge destabilizes the arena. | P1 teaches a single baitable charge plus ground shockwave. P2 uses heat-mirage decoys, but the real Koraidon casts a dust wake and audible footfall. P3 chains three charges around temporal crystal gates; each miss breaks a gate until the final collision cracks the sky and begins the ending. |

### Sentinels should be team encounters

The current sentinel type attacks can remain as a base, but each regional group needs one cooperative formation mechanic:

- Kanto birds rotate ice, lightning, and fire lanes; defeating one leaves a permanent gap.
- Johto beasts run a triangular relay, passing a charge around the arena.
- Hoenn golems build a moving monolith wall with type-specific weak seams.
- Sinnoh lake trio link three psychic nodes; breaking the active link stuns all three.
- Unova swords cross lanes, then separate into distinct duels.
- Kalos's single Zygarde should assemble cells and change form instead of behaving like a one-member trio.
- Alola's Tapu group creates a totem ring with one rotating opening.
- Galar's regis make a stormfront whose element changes by leader.
- Paldea's shrine legends project four seals; each destroyed seal removes an attack property.

### Mythicals are short, playful codas

Legendary fights test survival. Mythical fights should test understanding with a twist and last 40–65% as long:

- Mew copies one player attack shape and opens a “wish” safe lane.
- Celebi rewinds its seed bloom; the second pass is predictable and score-rich.
- Jirachi turns falling-star warnings into collectible bonus stars after a clean dodge.
- Darkrai hides in one of several shadows; attacking the wrong one creates a nightmare fan.
- Victini rewards staying close behind its victory lap with a score trail.
- Diancie lets reflected shots shatter crystal facets.
- Marshadow uses rhythmic melee tells instead of another bullet fan.
- Zarude grows a destructible vine maze whose openings become the route.
- Pecharunt puppets decoys; type-resisted hits reveal the real target.

### Mode-specific adaptation

The fantasy stays the same, but counterplay must respect each mode:

| Mode | How signature attacks adapt |
| --- | --- |
| **Breaker** | Preserve the ball as the weapon. Major hazards alter ricochet space, create destructible boss bricks, change wind/ball curvature, or expose timed weak panels. Keep projectile density low. A clean return or weak-point bounce cancels the attack. |
| **Blaster** | Use moderate movement patterns and shootable anchors. Charge shots can pierce/cancel a major tell, giving the mode a deliberate risk/reward reason to charge. |
| **Starfighter** | Use the full safe-lane and movement choreography, but preserve the compact hitbox, high flock zone, and capped warning budget. Charged attacks break anchors faster; temporary type matching can turn defense into counterfire. |

### Difficulty scaling

Do not scale bosses mainly by speed or projectile count.

- Scenic: longer tells, wider safe lanes, anchors require fewer hits.
- Adventure: authored baseline.
- Ace: same rules, tighter timing, one extra remix per phase.
- One Life: no surprise patterns; difficulty comes from consistency and recovery, not unreadable overlap.

The Space Invaders Extreme lesson is useful here: patterns can adapt by difficulty while preserving recognizable strategy.

---

## 7. The big ending: **The Ninefold Dawn**

This should be the largest presentation event in the game and the first time every major visual system works together.

### Trigger

After the final Paldea mythical is defeated in a non-trial level-27 run:

- do **not** increment into level 28;
- clear hostile projectiles and freeze damage;
- enter `G.state = 'ending'`;
- preserve the final player position, partner, element, build badges, score, catches, and clear statistics;
- leave the checkpoint intact until the ending has safely recorded completion.

### 30–40 second beat sheet

#### Beat 1 — Silence after impact (0–3s)

- Pecharunt collapses into a small poison mask silhouette.
- Music, particles, and ambient motion cut to near silence.
- The final Koraidon-created crack remains in the sky.
- One small partner/pilot glow is the only moving light.

#### Beat 2 — Break the night (3–8s)

- The crack spreads like glass across the entire sky.
- Instead of darkness behind it, intense warm daylight shines through.
- The player fires or launches one final automatic shot/ball into the crack.
- The night layer breaks into hundreds of large, slow, cached glass polygons—fewer and more deliberate than ordinary particles.

This is the central surprise: the “permanent night sky” was a lid, and the player physically breaks it.

#### Beat 3 — Nine worlds return (8–20s)

- Nine vertical horizon ribbons sweep across the screen in journey order.
- Each ribbon contains the region's most recognizable landmark and its brightest daytime palette.
- The ribbons do not remain separate: hills become pagoda terraces, then water, mountain, skyline, tower, palms, stadium, and academy in one continuous impossible panorama.
- Each cleared region node stamps above the horizon with a boss-color shockwave.
- The player's final-form partner flies or rides across the panorama; Breaker/Blaster preserve their own paddle/ball identity in the foreground.

#### Beat 4 — Your journey becomes the sky (20–29s)

- Pokémon caught during the run—or a capped representative subset—rise as softly glowing sprites.
- They settle into a spiral constellation around the partner. Uncaught slots remain subtle stars, avoiding a completionist penalty on the first clear.
- The nine legendary silhouettes appear only for a one-second salute around the outer ring, then dissolve into their region colors.
- The three act emblems combine into the WAVEBREAKER mark.

#### Beat 5 — Dawn and completion (29–40s)

- The sun crests the combined horizon.
- The screen resolves into the cleanest, brightest composition in the game.
- Title: **THE WAVE IS BROKEN**
- Subtitle: **9 REGIONS · 27 STAGES · JOURNEY COMPLETE**
- Then show the player's partner, score, difficulty, mode, time, bosses defeated, catches, and favorite path.
- The music resolves the campaign progression into a major-key version of the title motif; region motifs answer one another in the final bars.

### Accessibility and control

- Reduced-flash mode replaces the white crack flash with a gold edge wipe and outlined shards.
- Reduced-shake mode uses slow camera easing, not impact jitter.
- Any input accelerates the sequence after the first four seconds.
- Hold input for 1.2 seconds to skip after the ending has been seen once.
- The completed ending becomes replayable from a new **THEATER** button on the title dashboard.

### Completion data and unlocks

Store a versioned completion record per mode/difficulty:

- clear date;
- score and duration;
- starter/final partner;
- favorite path;
- bosses and catches;
- whether the Kanto Rift was completed;
- ending seen flag.

Unlocks:

1. **Theater:** replay region transitions, evolution ceremonies, gauntlet entrances, and the ending.
2. **Boss Rush:** use the existing Trial selector and gauntlet data in a scored sequence.
3. **New Game+:** the current level-28 cycle becomes an explicit player choice called **TIME SPIRAL**, with remixed skies and advanced boss patterns.
4. **Dawn title treatment:** the title screen subtly retains a sunrise edge and a nine-region completion crown.

The first-clear reward is emotional and visual. Mechanical unlocks are optional bonuses, not required to understand that the campaign is complete.

---

## 8. Audio, haptics, and visual synchronization

### Region arrangements

Keep the procedural Web Audio approach, but give each region an arrangement identity:

- Kanto: clean square lead, light arpeggio, open fifths.
- Johto: bell/triangle timbres, slower ornamental melody.
- Hoenn: syncopated water-like delay and tom pulse.
- Sinnoh: sparse high pads, low mountain drone, clock chimes for Dialga.
- Unova: faster bass pulse and city percussion.
- Kalos: bright waltz-like accent or prism arpeggio.
- Alola: warm offbeat rhythm and hand-drum approximation.
- Galar: stadium kick, crowd pulse, broad octave lead.
- Paldea: guitar-like pluck approximation, handclap, and expansive final harmony.

Arrival, Challenge, and Legendary should enable different layers rather than restart unrelated songs. Boss phase transitions should land on the next bar whenever possible.

### Attack sound grammar

Every major attack needs:

- a unique anticipation sound;
- a countable cadence if it has multiple hits;
- a low-frequency commit sound;
- a bright counter/success sound;
- a recover-window cue.

Players should be able to dodge a learned signature attack with limited vision.

### Sync opportunities

- lanterns, stadium lights, and skyline windows can pulse on music steps;
- sentinels can change formation on bar boundaries;
- boss phase transitions can wait up to a short capped interval for a downbeat;
- the final skyline stamps align with nine motif notes;
- score/combo effects should accent the music, not constantly compete with it.

---

## 9. Attention pacing across the full campaign

### Novelty cadence

The player should receive one meaningful new beat every few minutes:

- every stage: new lighting/weather/landmark state;
- every Challenge: new motion transformation plus environmental escalation;
- every Legendary: one new boss rule and one large arena transformation;
- every region clear: stamp, travel postcard, draft, and checkpoint;
- regions 4 and 7: evolution/act ceremony;
- stage 27: campaign ending.

### Rest is part of spectacle

Avoid stacking announcement, draft, evolution, region transition, and boss entrance without breathing room.

- ordinary stage clear to draft: current fast celebration;
- region clear: 1 second calm → result stamp → draft → travel postcard;
- act boundary: ceremony replaces the postcard's first half;
- gauntlet rounds: 2–3 seconds of cleared projectiles, environmental omen, entrance;
- final victory: no upgrade draft before the ending.

### Optional objectives that do not distract from survival

- **Scenic targets:** hit a windmill vane, bridge light, crystal, or stadium sign for a small score bonus and visible response.
- **Boss counters:** cancel one signature attack through type resistance, anchor destruction, or a precise rebound.
- **Flawless region stamp:** no deaths across three stages changes the map node to gold.
- **Theater discoveries:** one hidden scenic interaction per act unlocks an alternate transition shot.

These give skilled players something to notice after the basic combat is mastered without increasing enemy density.

---

## 10. Implementation plan

### Phase 0 — Stabilize the late-game harness

**Priority: immediate · Scope: small**

- Clamp tier-III flame ember radii above zero.
- Add a test that renders all 18 pilot attack shapes at all three evolution tiers.
- Add a headless/trial helper for jumping to an exact region, stage, gauntlet round, and boss phase.
- Capture baseline desktop and mobile screenshots of all 27 stages.

**Exit criterion:** every Trial selection renders for 30 simulated seconds with no console errors.

### Phase 1 — True campaign completion

**Priority: must-have · Scope: medium**

- Add `ending` and `victorySummary` state.
- Branch the non-trial stage-27 clear before `G.level++`/draft.
- Save a versioned clear record.
- Move the current cycle behavior behind the New Game+ choice.
- Add completion invariants before building the visual ending.

**Exit criterion:** a normal clear cannot build level 28; Trial and New Game+ can still intentionally access looped difficulty.

### Phase 2 — Scene director vertical slice

**Priority: must-have · Scope: medium**

Build Kanto and Paldea first because they prove both ends of the arc:

- stage-aware cache keys and crossfades;
- sun/moon/celestial variants;
- dynamic landmark layer;
- challenge escalation cue;
- boss phase overlay;
- background motion suppression during lethal tells.

**Exit criterion:** blind screenshot review can correctly classify all six Kanto/Paldea stages at a high rate, and combat remains readable on a phone-sized viewport.

### Phase 3 — Boss director vertical slice

**Priority: must-have · Scope: large**

Implement Mewtwo, Lugia, and Koraidon first:

- afterimage/history attack;
- wind corridor attack;
- momentum/charge lane attack;
- shared tell/commit/recover state machine;
- Breaker, Blaster, and Starfighter adapters;
- cancel/weak-point rewards;
- deterministic seeded pattern tests.

**Exit criterion:** the three fights are mechanically describable without naming projectile color, and each major hit can be traced to a visible/audio tell.

### Phase 4 — Complete 27 scene variants

**Priority: must-have · Scope: large**

- author the remaining seven region stage kits;
- add stage arrangement layers and transition motifs;
- add region travel postcards;
- integrate act ceremonies with the new skies;
- tune contrast and particle caps per viewport.

### Phase 5 — Complete nine gauntlets

**Priority: must-have · Scope: large**

- author remaining legendary rules;
- add one cooperative mechanic per sentinel group;
- upgrade mythical codas;
- give each attack family a unique silhouette;
- tune per difficulty without breaking strategy.

### Phase 6 — Build The Ninefold Dawn

**Priority: must-have · Scope: large but isolated**

- scripted ending controller;
- sky-crack and shard caches;
- nine-region panorama compositor;
- caught-Pokémon constellation with strict sprite cap;
- final music arrangement and completion summary;
- Theater replay;
- reduced-motion/flash variant.

### Phase 7 — Retention extras

**Priority: should-have · Scope: medium**

- Boss Rush;
- explicit Time Spiral/New Game+;
- gold region stamps and scenic targets;
- completed title-screen treatment;
- best clear records by mode/difficulty.

---

## 11. Code ownership map

### `js/data.js`

- Add `SCENE_PROFILES`, `BOSS_SCRIPTS`, attack descriptors, region transition copy, and ending constants.
- Keep Pokémon roster and boss identity data in `GENS`; do not overload `GENS` with every render property.

### `js/scenery.js`

- Replace `bgGen` with a cache key including region, stage, phase bucket, and viewport.
- Split far sky, far scenery, dynamic landmark, and boss overlay rendering.
- Replace global moon/star assumptions with per-scene celestial data.
- Make ambient selection stage-aware.

### `js/state.js`

- Add scene director, boss director, ending, and completion state fields.
- Initialize phase scripts in `buildLevel()`.
- Preserve the existing gauntlet data and checkpoint guarantees.

### `js/update.js`

- Update scene progress and transitions.
- Run tell/commit/recover boss attack states.
- Resolve weak-point/cancel conditions by mode.
- Trigger campaign ending before level increment.
- Run the ending beat sheet and completion save.

### `js/render.js`

- Render stage layers and crossfades.
- Add attack-family tells and hazards.
- Add boss/environment phase transformations.
- Add the ending panorama and victory summary.
- Clamp the tier-III fire ember radius.

### `js/audio.js`

- Add region arrangement identities, stage layers, boss cues, and ending motif.
- Expose bar/beat information for visual synchronization without making gameplay depend on audio availability.

### `js/input.js`

- Handle ending acceleration/skip rules.
- Add Theater, Boss Rush, and Time Spiral choices after unlock.
- Prevent final boss input from leaking into the ending, similar to the trial-launch click issue observed during inspection.

### `test.html`

- Add final-clear state tests, attack tell safety tests, all-pilot render smoke tests, and scene-cache key tests.
- Add deterministic boss-script runs at 60 and 120 Hz.

---

## 12. Performance and accessibility guardrails

### Mobile performance

- No per-entity, per-frame gradients or `shadowBlur` in new attack hot loops.
- Pre-bake repeated attack sprites, cloud tiles, shard polygons, and constellation glints.
- Cache static scene layers and rebuild only on stage/phase-bucket/resize changes.
- Cap ordinary ambient particles around current levels; use fewer, larger objects for spectacle.
- The ending can temporarily use a higher effect budget because combat is disabled, but it still needs a low-effects path.
- Avoid full-canvas readbacks beyond the existing bloom path.

### Readability

- Every lethal attack has shape + motion + sound, never color alone.
- Minimum safe-lane width is based on the active mode hitbox plus input latency allowance, not a fixed desktop pixel value.
- Major tells do not overlap HUD controls or safe-area insets.
- Background luminance behind enemies stays within tested bands; add local contrast wash when needed.
- Screen shake never moves telegraph geometry relative to its actual hit zone.

### Reduced effects

- `reduceFlash`: no full-screen white frame; use color-edge wipes and persistent outlines.
- `reduceShake`: no large impact translation; use scale/easing or horizon motion.
- Add an optional **Background Motion: Full / Calm / Static** setting if the new scene motion proves distracting.
- Static mode preserves stage palette and landmark state, so it still receives the visual journey.

---

## 13. Verification and acceptance criteria

### Automated

- Clearing level 27 enters `ending`; it never calls `buildLevel(28)` in a first journey.
- Completion is saved once and is recoverable if the tab closes during the ending.
- Every boss major attack spends its configured minimum time in `tell` before damage.
- No two major attacks own the arena simultaneously unless the phase explicitly defines a tested remix.
- All safe lanes meet per-mode minimum size at supported viewport dimensions.
- Every scene profile has a valid sky, foreground contrast target, ambient cap, and reduced-effects variant.
- All 18 pilot shapes render at tiers I–III without exceptions.
- Existing flyer/wall overlap, flyer separation, asset, checkpoint, and mode invariants remain green.

### Visual QA matrix

Capture and review:

- 27 stage openings at desktop landscape;
- 27 stage openings at phone portrait/touch layout;
- 9 legendary phase-1 and last-stand frames in each mode;
- 9 mythical attack frames in Starfighter;
- every region transition;
- both evolution ceremonies;
- ending in full-effects and reduced-effects modes.

Questions for each screenshot/video:

1. Can the region and stage be identified without HUD text?
2. Is the player/ball the clearest moving subject?
3. Is the safe route visible within 250 ms of looking?
4. Does the boss mechanic read from shape and motion, not only color?
5. Does the background look alive without competing with threats?

### Playtest metrics

- stage abandonment by region;
- deaths by boss attack name;
- time to first successful counter/cancel;
- percentage of players reaching each act;
- completion rate by difficulty and mode;
- ending skip rate after first clear;
- Theater and Boss Rush use after completion.

High deaths on one named attack indicate a tell/counter problem. Broad late-campaign abandonment with stable death rate indicates pacing or repetition instead.

---

## 14. What to avoid

- Do not solve variety with denser particles or faster bullets.
- Do not make all three stages of a region the same scene under different tint overlays.
- Do not put detailed high-contrast scenery directly behind the primary enemy flock.
- Do not let background animation continue at full intensity during a lethal boss tell.
- Do not make boss phase 3 only “phase 2, but faster.”
- Do not introduce an untelegraphed surprise attack in One Life mode.
- Do not turn Breaker into a shooter to support the new bosses.
- Do not show the final panorama before stage 27; its composited nine-world image is the surprise.
- Do not delete the existing loop behavior—reframe it as the post-clear Time Spiral.

---

## 15. Recommended first delivery

The highest-value first playable release is:

1. fix the tier-III fire crash;
2. add the real level-27 victory branch;
3. implement six distinct Kanto/Paldea stage scenes;
4. rebuild Mewtwo and Koraidon through the boss director;
5. implement a first version of The Ninefold Dawn;
6. screenshot-test desktop and mobile;
7. then scale the proven scene and boss frameworks across the middle seven regions.

That slice immediately proves the opening promise, final payoff, background system, boss system, mode adapters, performance strategy, and ending state. It also prevents a long art pass from locking the project into an architecture that cannot support the full campaign.
