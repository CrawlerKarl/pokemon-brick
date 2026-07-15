# Pokémon Invaders Breakout

A Breakout × Space Invaders/Galaga hybrid that transforms as you play: it
starts as relaxed brick-breaker in Kanto and, region by region, becomes a
Space-Junkie-style shooter where Pokémon break out of their bricks and
fly intricate patterns. Journey through 9 regions (3 stages each — Arrival,
Challenge, and a Legendary boss), draft a permanent skill tree, pick a
starter partner whose paddle ability evolves, and catch Pokémon for a
persistent Pokédex. Two headline modes — **BRICK BREAKER** (`classic`, ball +
blaster) and **SPACE JUNKIE** (pilot your Pokémon through all-flying waves) —
plus **BLASTER**, the experimental ball-less hybrid. Runs auto-save at each
region — pick up with CONTINUE. The journey is a three-act play (gens 1–3 /
4–6 / 7–9): each act boundary lands on a partner evolution and plays a full
evolution ceremony, and Space Junkie's wave choreography develops one
movement verb per act — ASSEMBLE, TRANSFORM, COMBINE. Every region's finale
is THE GAUNTLET: a three-round title fight (sub-legendary sentinels → the
legendary → the mythical).

**Live:** https://crawlerkarl.github.io/pokemon-brick/ (GitHub Pages, deploys
from `main` on every push — repo `CrawlerKarl/pokemon-brick`).

Pure vanilla JS + Canvas 2D. No build step, no dependencies, no framework.

---

## Running it

Multi-file, so it needs a real static server (single-file HTML previewers
won't load it):

```
node serve.js          # the repo's tiny no-cache server → localhost:8741
# or: npx serve .  /  python3 -m http.server 8741
```

Append `?touch` to force the mobile touch controls on desktop (invaluable
for testing — the browser preview reports pointer:fine).

**GitHub Pages** is already enabled (Settings → Pages → deploy from `main`,
root). `git push` redeploys; a build usually lands in ~1 min. The auto-build
sometimes doesn't fire — trigger manually with
`gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds` and poll
`.../pages/builds/latest` for `status:built` + matching `.commit`.

---

## File map (js/, loaded in this order — later files reference earlier ones)

| File | Contains |
| --- | --- |
| `setup.js` | Canvas, `resize()` (with a no-op guard — see Gotchas), DPR, safe-area, `IS_TOUCH` |
| `config.js` | `PRESETS` (difficulty), `SETTINGS`, `diff()` (the one difficulty curve), menu/advanced/trial **layout geometry** |
| `audio.js` | SFX synth (`tone`/`noiseBurst`), per-region chiptune with chord progression + echo bus (`musicTick`) |
| `data.js` | `TYPE_COLORS`, `POWERS`, `EFFECTIVE`/`RESIST` charts, `MODIFIERS`, **`PATHS`** (skill tree) + `JUNKIE_ITEMS`/`STACK_ITEMS`, **`STARTER_MON`**, **`GENS`** (region/roster/boss data) + **`HABITAT_PACKS`/`TYPE_CLUSTERS`** (wave ecology), `NAMES`, sprite loading, `drawGlyph` (all vector icons) |
| `scenery.js` | Per-region prerendered backgrounds (`drawScene[...]` — iconic towns), starfield, ambient weather |
| `state.js` | The `G` state object, `buildLevel()` (**the level generator — modes, formations, ecology, flight/squad assignment, hp**), `makeBall`, `resetRun`, `serve`, `spawnReinforcement`, checkpoints (`saveCheckpoint`/`resumeRun`), `sparkle`/`ringFx`, tree caps |
| `input.js` | Mouse/keyboard/touch, `onPress` dispatch, `fireAction`/`fireCharge`, `pickUpgrade`/`rerollDraft`, `touchButtons` geometry, `serveAngle` |
| `update.js` | The simulation: **flight patterns (`flightPos`), junkie separation + maneuvers, divers, reinforcements**, ball/laser/enemy-shot physics, `damageBrick` (+ 3-phase boss), `bossAbility`, `loseLife` (white-out), rally/barrier, level-clear |
| `render.js` | All drawing: bricks + free-flyers (gait animation), bosses (`drawBossMon`), paddle / junkie pilot rig, HUD, menus, Pokédex, draft screen; **FX sprite caches + `drawBloom`/`drawAtmosphere`** (see Graphics & performance) |
| `main.js` | `requestAnimationFrame` loop (`update` then `render`; `G.freeze` = hit-stop; a bootstrap guard retries until the viewport + vignette exist) |

`index.html` is the shell (canvas + the 10 script tags + local font). Also in
the repo: `test.html` (headless invariant suite), `package.json`
(`check`/`verify-assets`/`serve` scripts), `tools/` (`fetch-sprites.js`,
`verify-assets.js`), `assets/fonts/` (vendored Orbitron).

---

## Game modes (`SETTINGS.mode`, picked on the title screen)
The menu is TWO pages (`menuPage`, config.js): page 1 is the title + mode
select — two big cards for BRICK BREAKER and SPACE JUNKIE plus a smaller
dashed "experimental" chip for BLASTER. A prominent **QUICK START** launches
the recommended first run (Brick Breaker · Easy · Charmander) immediately;
picking a mode leads to page 2, setup (starter + difficulty + START,
`setupLayout`). Quitting/game over always lands back on page 1.
- **BRICK BREAKER** (`classic`) — the ball-first brick-breaker described
  below. The ball is THE weapon; there is **no free blaster**. Manual fire is
  gated by `blasterArmed()` (state.js) and unlocks only with a LASER power-up,
  an active Mega, or an offense-path draft (VOLLEY/IMPACT). Until then
  `fireAction` no-ops, the touch FIRE pad is hidden, and the shoot hint is
  suppressed — you serve/launch the ball by tapping the playfield.
- **BLASTER** — a ball-less pure shooter (Space-Junkies flavour). `serve()`
  spawns no ball and drops you straight into play; you clear the wall and the
  flyers by shooting. You only lose to enemy fire (the "0 balls → loseLife"
  gate is skipped), enemies fire ~2× as often and from the first wave, bolts
  render as sleek cyan energy darts, and a **CHARGE** winds up a fat piercing
  shot (`fireCharge`, damage/pierce scale with hold time). Charge is
  right-click / Shift on desktop; on touch **tap FIRE for one normal shot or
  hold FIRE to charge** — one thumb still fires AND charges, so the other stays
  free to steer. Optional AUTO-FIRE lives in Settings and yields whenever a
  charge touch begins. Mega, catches, drops, and the skill tree all still work.
  Wiring: `G.mode`, `G.charge` (state.js); hold-intent promotion (update.js,
  `touchFirePendingId`/`TOUCH_CHARGE_HOLD_MS`); charge/fire input (input.js);
  the FIRE pad's charge ring + bolt visuals (render.js).
- **SPACE JUNKIE** — the full pure-shooter homage to the game's namesake:
  **no wall at all**. Non-boss waves arrive as 100% free-flyers (squads pour
  in from the edges straight onto patterns, built in `buildLevel`'s junkie
  block); boss waves keep their choreography but guards ride **bare**.
  Pattern unlocks come one region early (`unlockR` — region 1 stays on the
  clean shapes in every mode), dives start at wave 2,
  and reinforcements from region 1. **Your starter IS the ship** (Pikachu→
  Raichu if none): `pilotInfo()`/`attackElement()` (state.js). The attack's
  SHAPE follows the pilot species — flame / water jet / razor leaf /
  lightning (`drawTypedBolt`, render.js) — while its COLOR + damage type
  follow the CURRENT element, so a Charmeleon riding a grass element shoots
  **green fire**, and `damageBrick` applies real type effectiveness (element
  orbs become the key tactical pickup; a worn-off element falls back to the
  pilot's innate type). The pilot rig (`drawPilotRig`) tints its engine wash,
  core light, muzzle and charge orb by the element. Ball-only power-ups are
  remapped at drop time (`modePower`, update.js: multi→draco, magnet→shield,
  warp→star). BLASTER's charge shot works here too; a fire pilot's spent
  charge detonates (Blaze).
  **The Space Junkie constants:** the player is a BARE Pokémon, not a paddle
  (`drawPilotRig` — aura + jet exhaust, no hull), and it flies VERTICALLY in
  a ~120px band (`G.shipYv`/`shipY()`, `SHIP_BAND` in state.js — every
  "where is the player" check asks `shipY()`, with a small mon hitbox).
  Enemies are HALF-SIZE and ride patterns shrunk to ~66% — tight but not
  CRAMPED knots (a tighter shrink made converging patterns pinch riders into
  each other) that live HIGH (airspace floor ~42% of the screen early,
  creeping to ~56% late; the low band belongs to the ship). Squad count ramps
  `1 + ⌊regionsIn/2⌋` — **ONE clean flock in region 1**, up to 4 by region 6.
  Region 1 is calm; dives start in region 2, and from there squads run
  **maneuvers** (`G.maneuver`, update.js): startle-SCATTER (the knot swells
  ~1.8× then contracts), speed SURGE (~1.8× pattern speed), and from region
  3 a RAID that dips the whole flock toward the ship band and back — capped
  so it never enters the ship's airspace.
  **Crispness:** the per-frame separation solver (now every mode — see above)
  keeps flocks from blobbing — converging patterns pack into readable knots.
  **Type changes are
  temporary** there: `G.ballElement` is only ever an override that counts
  down (HUD shows `TYPE · Ns`) and reverts to the pilot's innate type;
  element orbs drop far more often (junkie branch of the orb block).
  **Held items:** the draft re-skins the same 5×4 tree as Pokémon items
  (`JUNKIE_ITEMS`, data.js); one counted badge per owned path/stack category
  orbits the pilot,
  and late drafts offer `STACK_ITEMS` that stack forever (Life Orb damage /
  Never-Melt Ice cooling / Soothe Bell score — `G.stacks`).
  The pilot renders pseudo-3D (silhouette shadow + element rim light) and
  plays a lunge/flash ATTACK animation on every shot (`G.attackAnim`).

## The core systems (where to look, what they do)

### Motion — the brick-breaker → Space Junkie arc
This is the heart and the most-iterated system. Assigned per-wave in
`buildLevel` (state.js ~200) via `flightGeom`/`flyerRoom` (state.js ~155–210);
executed in `update.js` — `flightPos` pattern math (~175) and the per-frame
motion/march block (~495–650).

- **Static wall + moving Pokémon (the core rule).** Boxed bricks are an
  **anchored wall** — `G.blocksStatic` (set `!hasBoss` in `buildLevel`) skips
  the march, descent, and sway in `update.js`, so a non-boss wave's bricks
  never move (just a ±2.5px render bob). All motion belongs to the **flyers**,
  and their patterns are **provably disjoint from the block zone** — verified
  0 overlaps across every level/viewport. Only **boss waves** still march (the
  `!G.blocksStatic` branch) with guard rings around the legendary.
- **`br.flight`** — individual Pokémon that **break out of their boxes** and
  fly, carved into **squads** that pop together and thread onto their **own
  pattern** (`flightGeom` in state.js). `state:0` boxed → box **visibly
  shatters** (`shatterBox`) at `swayT >= launch` → `state:1` gliding on →
  `state:2` cycling. `flying(br)` / `bareMon(br)` gate them out of wall logic.
- **Non-overlap zoning** (`flightGeom` + `clampOpen`, state.js) — the wall's
  rectangle is known and fixed, so patterns are placed to never enter it:
  **`square`** loops strictly AROUND the grid (margin beyond every edge);
  every **open** pattern is clamped into the clear band BELOW the grid
  (`geo.openTop = gridBottom + ~bh`, down to the `flyerRoom` floor). Streams
  fly open patterns only and enter from the SIDES at open-zone height, so a
  trailing line never crosses the wall.
- **`flightPos(F, tAbs)`** (update.js) — the ~32-entry pattern library, in two
  families (Galaga / Galaxian canon):
  - **FORMATION-HOLDERS** — the flock keeps a crisp silhouette while the whole
    body drifts/rotates, so riders never cross: `ring`/`oval`/`olympic`
    (circle/ellipse), `lane` (bobbing lanes), `square` (loops strictly AROUND
    the brick wall), `chevron` (a V/arrowhead of wings that sways), `arc` (a
    dome/rainbow that slides), `cross` (a rotating plus), `carousel` (two
    concentric rings turning together), `phalanx` (a rigid marching grid —
    uses `flight.n`, the squad size), `fountain` (rise-and-fall columns),
    `diamond`, `pulsar` (uniformly breathing ring).
  - **BUSY CURVES** — riders pass through a shared center; the separation
    solver packs them so they stay distinct: `inf`/`falls` (figure-eights),
    `liss`, `rose`, `clover` (3-petal), `star`, `binary`, `atom`, `epi`,
    `pend`, `spiral` (pinwheel-galaxy arm), `vortex`, `butterfly`, `zigzag`.
  - plus wrapping `snake`/`helix`/`swoop` that span past both edges (wrap jump
    off-screen; off-screen flyers can't fire and are de-prioritized by
    `nearestBrick`).

  Every non-wrapping pattern is BOUNDED inside its |rx|,|ry| box — that is
  what keeps the non-overlap zoning provable; keep that true for new ones, and
  space riders EVENLY across the shape (a `sin()`-mapped span bunches them at
  the edges and they pile up — that bug bit `arc`).
  Flyers ride nose-to-tail via `phase`; `F.spd` scales per-squad speed. The
  **`flyerRoom`** floor keeps them above the paddle (generous → ~0-crowding in
  the final region); flyers ride in screen space (`G.fx/G.fy` stripped out).
- **Separation solver** (update.js, right after the flight loop) — runs in
  **every mode** (not just junkie): 12 projection passes push any two flyers to
  a minimum spacing (0.62 × sprite size), so flocks never blob. In the WALLED
  modes it also shoves any flyer a push nudged INTO the wall rect (`G.gridRect`)
  back out — **inside** the loop, so the next pass re-spreads them along the
  wall's underside instead of stacking them on one line. It must NOT clamp
  flyers into the below-band: that crushes `square`, which loops legitimately
  AROUND the wall. Every squad (wall + stream) draws a UNIQUE band slot
  (`nTotal`) so two flocks never share a center.
- **`br.dive`** — Galaga peel-offs: a flyer/brick swoops at the paddle,
  fires one aimed shot at the bottom, loops home. Up to 3 concurrent
  late-game. A boxed brick that dives **shatters its box first** and stays
  `br.bare` (rendered as a bare sprite even back in formation) — nothing
  ever attacks as a full framed brick.
- **`bareMon(br)`** (update.js) — the single source of truth for "is this a
  bare Pokémon" (flyer/diver/`bare`), used by both the renderer and the
  death effect. A boxed brick **card-shatters** (`shatterBrick` → tumbling
  fragments); a bare mon **faints** instead — no card, just the sprite
  arcing away with a spark puff (`faint` ghosts get an up-then-fall `vy`).
- **Density budget** (`buildLevel`, state.js) — the board is kept readable so
  the ball is never lost. `cols` is **width-driven, not region-driven**;
  free-flyers are **hard-capped** (`flyerBudget`, ≤20) and the boxed wall
  **shrinks** region by region (`boxedBudget`). Total on-screen holds ~22–32
  the whole journey (was 15→118). Streams spend part of the flyer budget.
  The ball's glow + halo scale with on-screen `clutter` (render.js
  `drawBalls`) so a busy board can't swallow it.
- **Rendered:** boxed bricks are glossy cards (render.js `drawBricks`); flyers,
  divers and `bare` blocks are bare sprites with a type-colored aura
  (render.js, the first `if (bareMon(br))` block in the per-brick loop).
- **Living locomotion (no floating stamps).** Each free-flyer moves like its
  species: `GAIT_FLAP` (flying/dragon/bug) beats wings, `GAIT_SWIM`
  (water/ice) undulates, `GAIT_HOVER` (ghost/psychic/fairy) drifts, everything
  else pads a footfall bounce that quickens with speed. All face + bank into
  travel (velocity from the frame delta). Junkie mons are **half-size and
  mostly UNEVOLVED**; evolved species arrive as bigger, tankier **elites**.

### Wave ecology (`HABITAT_PACKS`/`TYPE_CLUSTERS` in data.js)
Each wave draws ONE habitat so Pokémon that belong together appear together
(the episode groupings — Ash's partners, Cerulean waters, Team Rocket,
Lavender Tower, dragon dens…). `pickWaveTheme(genIdx)` rolls a curated pack
(≥60%) or a type-cluster fallback; `themedPool(gen, tier, theme)` filters each
rank/squad to it, **always falling back to the full tier** so a narrow pack
can't make an empty (crashing) pool. Pack ids are constrained to their
region's roster — `verify-assets` + the test suite catch stragglers. Packs
span evolution tiers, so an unevolved squad flies under an evolved elite of
its own line. The stage banner names the ecology.

### Space Junkie motion V2 — rigid bodies, living slots
(Design doc: `SPACE_JUNKIE_MOTION_PLAN_V2.md` — EXECUTED.) Every junkie wave
is ONE authored encounter (`JUNKIE_CHOREO`, state.js): squads never roll
their own pattern. Hold-state slots are FROZEN lattices (`flight.spd = 0`;
only `rotary` families — carousel/nested/moons/eclipse/bloom — keep a capped
slow spin). The BODY does the moving: one shared patrol glide (~14% W, 8s,
all squads on ONE phase — concentric rings must never drift apart), the
Galaga THROB (slot frame breathes ±5%, squad-synced clock), squad-synced
idle bob phases. Squads ENTER as spline trains (corner → across mid-screen
→ up into the formation edge; riders nose-to-tail 0.22s apart, firing on
the way, ease-out-back settle; `flight.entering` excludes them from the
solver + tests). The separation solver is BYPASSED for settled slot members
and returns only while a maneuver runs; concentric families startle with a
SPIN (a scatter-swollen inner ring collides with its outer). Dives veer
toward the player's LIVE position; a squad falls silent ~1.5s when its
elite dies. Kill-release is smooth: eased sep offsets (fast build, ~0.4s
drain) mean a death leaves an honest Galaga gap, never a snap.

### Charge-gated content (the charge shot always matters)
- **ENERGY VEILS** (classic challenge waves): cyan casings the BALL cannot
  crack — only blaster-family fire breaks them. Kanto 2/3 is the blaster
  tutorial (guaranteed LASER drop, BLASTER ARMED callout, emergency rescue
  drop so a wave can never soft-lock).
- **SHELL ARMOR** (junkie, region 2+ elites; 3 tutors on Kanto 2/3): normal
  bolts plink off; ONE charged shot cracks the shell. A bright persistent
  banner teaches the charge until the player's first charged shot
  (`G.chargedEver`).
- **ROCK TOMB barriers** (junkie, region 2+): drifting boulder Pokémon
  (Geodude line by act) that absorb normal bolts — charged only. They never
  block a wave clear (crumble when the last real enemy falls), drop nothing.
- Charged shots also punch THROUGH up to two enemy shots (+Interceptor).

### THE GAUNTLET — every region's finale (`gen.gauntlet`, data.js)
Three rounds, difficulty scaling: **Round 1** — the SENTINELS (Kanto: the
legendary birds; each gen has its trio + mythical authored in data.js) run a
dedicated controller cycling THREE formations (rotating triangle, sweeping
battle line, weaving sentry posts) with TYPED specials on a 4.8–7.4s cadence
(`subAbility`: Frost Fan, Bolt Strike columns, Ember Rain, Tidal Line,
Boulder Toss, Flash Cannon, Warp Pulse, Spore Burst, Dragon Pulse) — they
are OUT of the regular fire pool. The legendary lies `dormant` (parked at
x=-2000, skipped everywhere). **Round 2** — `gauntletWake()`: the legendary
descends with its wing guards. **Round 3** — `gauntletSummonMythic()`: the
mythical (0.6× HP, 0.7× fire interval, MYTHIC BLINK teleport-burst, erratic
drift). Trial mode can jump straight to any round. Fire-by-rank everywhere:
unevolved = straight bolt; evolved elites (`br.elite ≥ 2`) = AIMED heavy
splash; sentinels = aimed 3-shot fans.

### Boss arena archetypes (`BOSS_STYLE`, data.js)
Every legendary owns its arena differently: Mewtwo's still high anchor,
Lugia's mid-air figure-eight, Rayquaza's full-width serpent wave, Dialga
locked mid-arena with CLOCKWORK rotating fire, Zekrom slamming flank to
flank, Yveltal's corner-to-corner predator V, Lunala's lissajous glide,
Eternatus riding the top rim raining straight bombs, Koraidon sprinting.
Classic damps the vertical play (guard wall stays clear); wing arcs hug the
boss; low-diving styles stay above the ship band.

### Boss battles (`drawBossMon` render.js, phases in `damageBrick`)
Legendaries are **BARE** — a huge bare Pokémon holding the arena (breathing
aura, orbiting energy ring, silhouette shadow + rim light, its own gait), never
a card. **Three phases** at ⅔/⅓ HP (`br.phase`): each transition fires a
dodgeable radial **shockwave** of shots + hit-stop, widens/quickens the patrol,
and adds spread fire; the **last stand** (phase 3) also summons a ring of bare
minions (`br.addsCalled`) and halves ability cooldowns. Signature abilities are
keyed by legendary id in `BOSS_ABILITIES` (teleport, gusts, sweeps, time-warp,
column strikes, fans, phase-out…). Boss HP scales with region + journey loop.

### Graphics & performance (render.js)
**Never allocate a gradient or set `shadowBlur` per-entity per-frame** — both
are the mobile stutter killers (GC churn + GPU stalls). Repeated art is baked
ONCE into offscreen sprite caches (`fxCache`): `shotSprite`, `auraSprite`,
`glowSprite`, `glintSprite`, plus `getSilhouette`. The "lit" look is cheap:
`drawBloom` (a half-res blurred copy of the frame composited back additively —
play/serve only, respects `reduceFlash`, ~0.2ms) and `drawAtmosphere` (cached
per-region horizon-glow + top-darken wash). Kills/catches/shinies throw
`sparkle()` glints and `ringFx()` shockwaves (both capped). `br.flash` (hit
flash) decays in `update()` dt-scaled, NOT render — it gates the pierce
i-frame, so a per-render-frame decay would couple DPS to the display's refresh
rate. **Rule: mutate any field gameplay reads in `update`; render only reads.**

### Skill tree (`PATHS` in data.js ~423)
Six paths × four tiers, **permanent**, drafted between every wave. Advancing
is `advancePath(key)`. The hand guarantees an offense option and a non-offense
option while both groups remain, so damage never crowds survival/utility off
the screen:
- **VOLLEY** → HYPER CYCLE (coverage, interception, cooling, Twin Cannon;
  Twin bolts deal 65% each; the capstone is +25% fire rate AND −20% heat —
  without the heat cut, sustained fire was heat-limited and the cadence
  bonus added no real DPS). Coolant also builds charge shots 35% faster in
  the shooter modes.
- **IMPACT** (HEAVY BLAST) → NOVA ROUND. Wide heavy bolts, then **SPLASH
  CHARGE** (`demo`): a spent charged shot **detonates for AoE** — the
  element-typed blast (`chargeSplash`, update.js) supersedes the old flame-only
  detonation. Then a piercing pulse every fifth volley, and the capstone doubles
  pulse damage AND enlarges the charge blast. The charged shot itself dumps a
  big slug of heat (~0.6 of the bar at full charge), so leaning on the big shot
  can overheat you — heat now vents slower than sustained fire builds.
- **AEGIS** → SUPER SHIELD. **A shield charge absorbs a lethal hit on the
  player** (enemy shot or column strike — `absorbHit`, update.js) in every
  mode, plus the classic floor net still saves dropped balls. Tiers: start
  waves shielded / cap 3→5 / wider paddle (shooter modes: wider CATCH only —
  upgrades never grow the hurtbox) / a charge regrows every 10s. In the
  shooter modes the shield renders as a bubble riding the ship with charge
  pips (`drawShield`, render.js). Historical note: shields used to trigger
  only at the FLOOR line, *below* the player — every shot they "blocked" had
  already missed, so AEGIS did nothing in the two modes where enemy fire is
  the only way to die.
- **SURGE** → APEX MEGA (hits/kills charge Mega in every mode; 9s capstone
  window and +50% attack damage). Shooter translations: Momentum gives +0.4%
  Mega per blaster hit (no paddle returns there), Rally Master charges Mega
  ×2.5 per kill and amplifies combo score +50%.
- **BOND** → POKÉ REVIVE (+1 life now + per region cleared; more drops/score)

The draft cards lead with the upgrade NAME and a big high-contrast description
(what it does) — the readable thing — over path/tier/pips; capstones glow.
Card/tree/announce text is **mode-aware** (`tierDesc`, data.js — optional
`sdesc` per tier), so a shooter-mode player never reads about paddles or balls.
**FULL TREE** (`T` on desktop) opens a **tap-to-inspect** grid where **paths
are rows and tiers build LEFT→RIGHT** (connector rails brighten up to the owned
tier). Every node tile carries its name + description; tapping one lights it up
(brighter, bolder) and fills a detail panel across the bottom (`treeSel`,
input.js; `drawTreeDetail`, render.js). Node rects come from `upgradeTreeLayout`
so render and hit-testing can't drift. Upgrade **symbols are glossy faux-3D
badges** (`iconBadge`/`blitBadge`, render.js — baked per colour/size) used in
the tree and draft cards. A **HUD build strip** shows owned paths, every
non-junkie tier adds a colored hardware socket to the paddle, and Junkie shows
one compact orbiting badge per owned path/stack category (with a count) so the
pilot stays readable. As authored paths cap, all modes fill empty offers with small
forever-stacking mastery items instead of dead reward screens. Caps read via
`shieldCap`/`megaDur`/`barrierCharges` (state.js). `upgN(key)` = does the player
own that tier.

### White-out (not game-over) — `loseLife()` update.js ~351
Losing all lives **burns 2 random tree levels** (`regressPath`), refills
lives, and **retries the wave**. Real game-over only when the tree is empty.
Lives show top-right as a **health ring** (`drawLifeRing`, render.js) — a
glowing arc over a faint track, notched per life, greens→amber→red as it
drains, last life pulses. Denominator is `G.livesMax` (peak lives held, so a
POKÉ REVIVE grows the ring); kept at the peak in `tickEffects`. On a hit, a
matching **health bar flashes above the character** for ~2s (`drawHurtHealth`,
gated by `G.hurtHud` which `loseLife`/`absorbHit` set and `update` decays) —
feedback where your eyes already are, not just the corner ring.

### Starter partners (`STARTER_MON` data.js ~314)
Charmander/Squirtle/Bulbasaur (or none). Rides the paddle, tints its glow,
seeds the serve element, and its paddle ability grows + partner **evolves**
at regions 4 & 7 (`starterStage`). Paddle hull is themed and gets more
elaborate per evolution (render.js `drawPaddle`): flame crests / Blastoise
shoulder cannons / Venusaur fronds. Blaze (ignite returns), Torrent (cooler
blaster + rhythm shields), Overgrowth (more drops + wide catch).

### Rally / high-ground (the "pinball up top" mechanic)
Armored top row = "guardian wall" (multi-hit, color-shifting HP). Getting the
ball above it arms a **golden barrier net** under the formation (2 charges/
possession, `barrierCharges`) that bounces the ball back up in empty columns
only — it pinballs off lower blocks. `rally` counter on each ball → escalating
score + Mega charge. **Sky Warp** power-up phases balls up through blocks.

### Trial mode (per-game, with gauntlet round picker)
Trial lives on each game's SETUP page (inherits the chosen mode). Region ×
stage grid; picking a LEGENDARY stage reveals a ROUND row (FULL GAUNTLET /
★ the legendary by name / ✦ the mythical) — start jumps straight to that
round via `gauntletWake()`/`gauntletSummonMythic()`. `resetRun(startLevel,
trial=true)` grants the tree advances you'd have earned. Trial runs never
save best score or Pokédex catches (`G.trial` flag).

### Difficulty, progress safety, and cheats
- **One journey curve** (`diff()`, config.js): smoothstep across the 9
  regions — ×0.78 opening, ~×1.1 middle, ×1.4 finale — on minion fire,
  boss cadence, and shot speed. Finale stages ease minion fire ×1.35 (the
  boss is the show).
- **Progress never wipes**: the region checkpoint saves from region 1 and
  SURVIVES a true game over — CONTINUE always works. White-out still burns
  2 tree levels and retries the wave.
- **✦ CHEAT CODES** (`CHEAT_ITEMS` data.js, panel via pause screen only):
  an ornate dashed-gold chip under QUIT TO MENU grants any power-up combo
  (+shield/mega/life/element). First use sets `G.cheated` — best score is
  not recorded that run.

---

## Tuning knobs (where to nudge balance)

- **Difficulty presets:** `PRESETS` in config.js (descent/shotRate/ballSpeed/etc.)
- **The one curve:** `diff()` in config.js — reads presets × level × adapt × modifier
- **Drop rarity:** `dropChance` in `diff()` (currently `0.06`)
- **Density budget (readability):** `buildLevel` in state.js (`cols` width-
  driven & capped 10; `flyerBudget` hard-caps moving flyers ≤22; `boxedBudget`
  shrinks the wall region by region — do NOT over-fill it, a taller wall
  squeezes the flyer band below it and the flock stops fitting; junkie flock
  size `per`, capped so `nS × per ≤ 26`; late-game +hp at regions 5/8). The
  test suite caps classic at ≤40 non-boss bricks and ≤30 flyers.
- **Flyer patterns & non-overlap zoning:** `flightGeom`/`clampOpen` (state.js),
  pattern math in `flightPos` (update.js); the region-by-region `kinds` unlock
  list in `buildLevel` — front-loads the CLEAN formation-holders so early waves
  read as obvious shapes, and defers the busy center-crossing curves.
- **Cycle speed:** `G.pathSpeed` (state.js). Blocks are static
  (`G.blocksStatic`); the march (update.js) runs only on boss waves
- **Blaster feel & HEAT:** cadence `G.blasterCD` and heat-per-shot in
  `fireAction` (input.js), passive cool in `tickEffects` (update.js),
  `OVERHEAT_DUR` (state.js). Heat now vents SLOWER than sustained fire builds,
  so holding the trigger really does overheat (~5s blaster, ~11s junkie), and a
  **charged shot dumps a big slug of heat** (~0.6 of the bar at full charge, in
  `fireCharge`) — chaining big shots overheats you.
- **Difficulty:** `BRICK_HP_MUL` in `buildLevel` (state.js) — the single knob
  to make waves tankier/snappier (currently `1.35`). Note CLASSIC has no free
  blaster (see `blasterArmed`), so the ball carries early waves.
- **Enemy warnings:** telegraphs are capped (≤3 concurrent, `update.js` enemy-
  fire block) and drawn compact for non-boss shots (short stub, not a full
  line) in `drawTelegraphs` (render.js). Danger line only shows for a
  descending boxed wall (hidden on static waves).
- **Typed enemy fire:** every enemy shot carries the firing Pokémon's `type`
  and renders in that type's colour (`shotSprite` baked per colour). It has an
  effectiveness relationship to YOUR current type (`playerType`/`shotEffect`,
  state.js): a shot you resist shows a faint dashed ring and is **deflected —
  no life lost**; a super-effective shot shows a pulsing red ring. Evolved
  **elites** (`maxHp≥3`) fire a bigger, slower **HEAVY blast** — wider hit
  envelope (splash), punches through your resist, and if super-effective takes
  **an extra life**. All in the `G.enemyShots` hit block, update.js.
- **Mega/barrier:** `MEGA_DUR`, `barrierCharges` (state.js)
- **Reinforcement flights:** `G.reinforce` (state.js), `spawnReinforcement`

Persisted in `localStorage`: `pkbrk-settings`, `pkbrk-best`, `pkbrk-dex`,
`pkbrk-dexs`, `pkbrk-music`, `pkbrk-run` (the region checkpoint), `pkbrk-v`
(storage version). ALWAYS go through `loadStore`/`saveStore` (setup.js) —
they survive corrupt values and full/blocked storage; raw
`JSON.parse(localStorage...)` at module scope once bricked startup.

**Pokédex research rewards:** collection milestones at 10 / 35 / 75 / 150 /
250 catches unlock a starting shield, improved new-catch odds, starting Mega
charge, +1 starting life, and doubled shiny odds. The Pokédex header shows the
next reward and remaining catches; milestone rewards apply only to a true new
journey, never repeatedly on a checkpoint resume or trial jump.

**Region checkpoints:** every non-trial run auto-saves at each region's
first wave (`saveCheckpoint`, state.js, hooked at the end of `buildLevel`);
the title screen grows a CONTINUE button (`RUN_CKPT`), and a true game over
(empty skill tree) clears it. **Draft reroll:** one per upgrade screen
(`rerollDraft`, input.js; `rollUpgradeChoices`, update.js).

**Fonts are local** (`assets/fonts/orbitron.woff2`, variable weight 400-900,
preloaded + kicked via `document.fonts.load` in setup.js — canvas alone
doesn't trigger @font-face). Orbitron is for titles/numbers; body copy uses
`bodyFont()` (render.js) — Verdana/system stack for readability.

**Title screen fits short landscape** (`menuLayout`/`setupLayout` short/
oneRow/stacked variants, config.js): under H=560 every gap compresses and
the footer links collapse to one row; under W=520 the two mode cards stack.
Both menu pages are covered by the `menu fit across viewports` test — keep
it green when adding menu items.

---

## Gotchas / hard-won lessons

- **Power-up drops are TYPE-keyed, and the shooter remap can flood a mode.**
  `POWER_BY_TYPE` (data.js) picks the drop from the *killed enemy's* type, then
  `modePower` (update.js) swaps ball-only powers for shooter equivalents. The
  trap: `ghost`/`dark`/`poison` all map to `multi`, and `multi → draco` in the
  shooter modes — and **poison is one of the most common early types** (Zubat,
  Ekans, Nidoran, Weedle, Grimer, Koffing, Gastly…). So a "rare" homing-missile
  power ends up dropping off half the early roster in BLASTER/JUNKIE and
  trivialising waves. `fx_draco` is only ever written by `bump()` in
  `applyPower` (and `resetRun` clears it), so it IS always a real pickup — the
  bug is the drop *table*, not a phantom grant. **When remapping a power for a
  mode, check how many types feed it**, not just whether the swap makes sense.
- **`resize()` has a no-op guard** (setup.js). Setting `canvas.width` blanks
  the canvas for a frame and rebuilds the starfield; spurious resize events
  (scrollbars/zoom/focus) were causing a ~1Hz flicker. Don't remove it.
- **Mobile ghost-clicks:** a tap fires a synthetic `mousedown` ~300ms later.
  `lastTouchT` mutes the mouse path for 900ms after any touch (input.js), or
  taps would instantly un-pause / double-fire.
- **Button touches never steer the paddle:** touches starting on a UI button
  go into `uiTouchIds` and a surrounding dead-zone swallows near-misses
  (input.js touchstart). Without this, tapping FIRE dragged the paddle right.
- **`br.hx/hy` = home slot, `br.bx/by` = live drawn position.** Motion writes
  live pos; boss sweeps/teleports move the HOME so guard rings track it.
- **`flying(br)` must gate every formation query** (march bounds, danger line,
  rally floor, gap-column, enemy-shot shooter selection) — a flyer counted as
  formation breaks those.

---

## Verifying changes (no human tester)

The preview browser **throttles `requestAnimationFrame` when backgrounded**
(and auto-pauses via visibilitychange), so you can't watch real-time physics.
Instead, drive the sim deterministically from the JS console:
`update(1/60)` in a loop, set `mouseX` to steer, `paused=false; G.freeze=0` to
force-run, then read `G.*`. `G.freeze=999` freezes a frame for a screenshot.
This is how every mechanic in the git history was verified. `?touch` +
synthetic `TouchEvent`s test mobile paths.

**Automated invariants:** open `http://localhost:8741/test.html` — a
self-contained suite (startup, per-mode smoke, wall/flyer non-overlap,
density budget, roster/sprite coverage, menu fit, storage-corruption
recovery) that drives the sim headless and reports PASS/FAIL
(`window.TEST_RESULTS` for automation). `npm run check` syntax-checks all
modules; `npm run verify-assets` cross-checks rosters vs NAMES vs sprite
files (tools/verify-assets.js). Run these after any invariant-adjacent
change.

---

## Roadmap / ideas for the next session
Not committed to — a menu of high-value work, roughly by leverage. Nothing
here is started; the game is stable and shippable as-is.

**Onboarding & clarity**
- Boss identity: short named intro cards + one clear counterplay lesson each.

**Gameplay depth**
- Build synergy tags on draft cards ("Ball / Blaster / Defense / Catch").
- Seeded daily run (date-seeded, local-only leaderboard) — needs the RNG
  service below.
- Local balance telemetry (time/wave, deaths, damage source, picks, abandon
  point) — even a dev-only summary would make tuning far easier.

**Visual / UX**
- Colorblind-friendly type palette (flyers convey type by aura color alone;
  boxed cards at least show a glyph). Reuse the accessibility-toggle framework.
- Per-region color grade + animated scenery accents (the atmosphere wash is a
  start); richer boss-phase VFX.

**Architecture** (deferred on purpose — the no-build vanilla setup is a feature)
- Introduce a seeded RNG service → reproducible waves + deterministic tests.
- If files grow further, migrate incrementally to native ES modules (no
  bundler) and split `G` into `run`/`world`/`actors`/`ui`; route screen changes
  through a small scene state machine. Do this between phases, not mid-feature.
- Convert PNG sprites to WebP (≈17 MB of art); add an asset manifest that
  preloads only the current + next region.

**Known small items**
- Dead `if (br.isBoss)` branch remains in `drawBricks`' card path (bosses now
  route to `drawBossMon`) — harmless, removable.
- Latent footgun: BOND path's tier-2 upgrade key is the literal `'bond'`, same
  string as the path key (separate objects today, so no live bug).
- Very short *touch* landscape could still spawn a wall a hair past the danger
  line — a free first-crossing warning covers it, but worth a glance.

---

## Assets & licensing

Sprites are vendored in `assets/sprites/` (fetched by
`node tools/fetch-sprites.js` — re-run after adding Pokémon ids to `GENS`;
`sips -Z 256 assets/sprites/*.png` to shrink; then `npm run verify-assets`).
`getSprite` loads local-first with a PokeAPI fallback; shinies stay remote.
The Orbitron font is vendored too (`assets/fonts/orbitron.woff2`) — the game
has **no network dependency** at play time.

**Pokémon names/artwork are Nintendo/Creatures/GAME FREAK property.** This is
a fan project — get a licensing review before any public distribution or
monetization.
