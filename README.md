# Wavebreaker

**WAVEBREAKER** is the game's brand — skin-agnostic on purpose, and it now
ships **two complete editions behind a runtime toggle** (tap the edition
pill on the title screen):

- **POKÉMON EDITION** — the original fan skin (PNG sprites, national-dex
  rosters, legacy storage keys — every old save keeps working untouched).
- **AETHERFALL EDITION** — an original sci-fi × fantasy universe: 18
  classes across MAGIC / TECH / MAGITECH disciplines, nine realms from the
  GREENSPELL MARCHES to the SUNDERED CRADLE, ~200 creatures drawn entirely
  by a procedural parts renderer (zero image assets), original boss
  identities cloning the engine's duel kits, and a LIGHT/DARK affinity
  pick that reshapes the late-game satellite drafts.

`js/skin.js` owns the registry: presentation + world data ride `SKIN.*`,
per-skin progress goes through `storeKey()` (`pkbrk-<skin>-*`; pokemon
keeps bare legacy names), and the engine — modes, types, effectiveness,
paths, the upgrade web — is shared verbatim. UI mode labels are equally
presentation-only: **BREAKER** / **BLASTER** / **STARFIGHTER** map to the
storage-stable internal keys `classic` / `blaster` / `junkie` (docs and
code comments below still say "Space Junkie" for the junkie systems —
that's the mode's internal codename).

A shared arcade campaign with three deliberately distinct games. **BREAKER**
stays a pure brick breaker from Kanto through Paldea: every regular target is
a brick, region-specific bomb/link/split/shield/treasure/slider rules add
variety, and Legendary Pokémon appear only inside dedicated boss bricks.
**BLASTER** attacks walls directly, while **STARFIGHTER** is the primary game
and owns the full Space-Invaders/Galaga flight-pattern fantasy. Journey through 9 regions
(3 stages each — Arrival, Challenge, and a Legendary boss), draft a permanent skill tree, pick a
one of 18 typed starter partners whose ability evolves, and catch Pokémon for a
persistent Pokédex. Three modes — **BREAKER** (`classic`, a calm ball-only
brick-breaker — no gun, no enemy fire), **BLASTER** (ball-less pure firepower on the same walls),
and **STARFIGHTER** (`junkie` — pilot your Pokémon through all-flying
waves). Runs auto-save at each
region — pick up with CONTINUE. The journey is a three-act play (gens 1–3 /
4–6 / 7–9): each act boundary normally lands on a partner evolution and plays
a full evolution ceremony (Pikachu's special Raichu jump comes in region 5),
and Space Junkie's wave choreography develops one
movement verb per act — ASSEMBLE, TRANSFORM, COMBINE. Every region's finale
is THE GAUNTLET: a three-round title fight (sub-legendary sentinels → the
legendary → the mythical). Kanto also reveals one guaranteed **Rift Shard** chance in
each of its three stages — but every piece is a one-shot skill test now: in
the shooter modes a swift **Rift Courier** carries it across the field once
(shoot it down or the shard is gone), and in BREAKER the shard itself falls
fast on a swaying one-pass line you must catch. Land all three and the
ordinary Mew round is replaced by a neon-rift **Mew VMAX** secret fight;
victory opens ONE **Rift Bounty draft where you choose TWO upgrades from the
same hand** before the journey moves on.

**Live:** https://crawlerkarl.github.io/pokemon-brick/ (GitHub Pages, deploys
from `main` on every push — repo `CrawlerKarl/pokemon-brick`).

The title screen also offers a seeded daily Breaker run with fixed walls,
drops, starter, and drafts; results and daily bests stay local and can be
shared without an account. Its return-player dashboard keeps the current
journey, Pokédex/research target, dated daily status, best, and streak visible
before mode selection. Setup cards spell out starting HP and pressure, while
the in-game HUD uses one health readout, identifies permanent partner elements
versus timed items, shows Mega charge as a percentage, and keeps region rules
and type-matchup feedback in dedicated rails away from the bricks. Mobile
players can tune follow speed, button size and opacity, mirror controls for
left-handed play, and enable haptics directly from the pause screen.
During live combat no banner sits in the flight lane: non-boss announcements
render as a compact strip under the HUD (`drawAnnounceStrip`; boss-round
reveals pass `hero` to `setAnnounce` and keep the centre card). STARFIGHTER
first installs get a five-step coach (`G.jCoach`: fly → tap-fire → charge →
orb → mega, once per install via `pkbrk-jcoach`), the FIRE pad always names
its state (`TAP FIRE / AUTO ON / % / RELEASE! / HEAT HIGH / COOLING Ns` +
a `HOLD = CHARGE` subline), Mega readiness fires a distinct haptic + button
pulse every fill, and all four safe-area insets (`SAFE_T/L/R/B`) keep the
HUD and corner controls clear of notches and rounded corners. New
players who request reduced motion at the device level automatically start
with screen shake and flashes reduced; saved in-game choices still take
priority afterward.

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
| `skin.js` | **The SKIN registry** — `SKINS`/`SKIN` resolution (`?skin=` → `SETTINGS.skin`), `storeKey()` per-skin storage namespacing, `STARTER_KEYS` + `skinStarters()`, `assembleSkins()` (data.js attaches the pokemon tables by reference), the edition-pill toggle (`skinPillRect`/`toggleSkin`) |
| `audio.js` | SFX synth plus the original 18-arrangement adventure score: nine region exploration identities and nine separately authored boss arrangements (`ADVENTURE_MUSIC`, `buildMusicPattern`, `musicTick`) |
| `data.js` | **ENGINE-ONLY since 2026-07-21**: `TYPE_COLORS`, `POWERS`, `EFFECTIVE`/`RESIST` charts, `MODIFIERS`, **`BRICK_BEHAVIORS`**, **`PATHS`** (skill tree) + `STACK_ITEMS` (+ affinity satellites), **`STARTER_KIT`** (shared partner balance numbers — both skins' rosters build from it), `TYPE_CLUSTERS`, `SHOT_CLASSES`, the whole upgrade web, sprite loading (dispatches to `SKIN.spriteMaker`; PNG path otherwise), `drawGlyph` (all vector icons) |
| `pokeworld.js` | **The POKEMON WORLD** (replaced by an engine-defaults stub in the AETHERFALL distribution): `STARTER_MON`, `GENS`, `NAMES`, `HABITAT_PACKS`, `JUNKIE_ITEMS`, boss kits (`BOSS_ABILITIES`/`BOSS_CHANNELS`/`BOSS_STYLE`…), `MOTION_PROFILES`, region intros/flavor/objectives, the Mew VMAX secret strings, and the `assembleSkins()` call |
| `aetherfall.js` | **The AETHERFALL world**: 18 classes/disciplines/lexicon, nine realms + rosters + habitat packs, boss-kit clones (ids/names/strings original, mechanics same-slot identical), strings table, `SKIN.secret`, affinity flag |
| `aetherart.js` | **Procedural unit renderer (v2)**: 99 BESPOKE painters — 54 creature lines, 18 class vessels, 9 sentinels, 18 bosses — over a shared part library, finished by a universal cel-shade → rim-light → sticker-outline pipeline; deterministic, bake-once cache, `getSprite` contract, zero network |
| `scenery.js` | Per-region prerendered backgrounds (`drawScene[...]` — iconic towns), starfield, ambient weather |
| `state.js` | The `G` state object, `buildLevel()` (**the level generator — modes, formations, ecology, flight/squad assignment, hp**), `makeBall`, `resetRun`, `serve`, `spawnReinforcement`, checkpoints (`saveCheckpoint`/`resumeRun`), `sparkle`/`ringFx`, tree caps |
| `input.js` | Mouse/keyboard/touch, `onPress` dispatch, `fireAction`/`fireCharge`, `pickUpgrade`/`rerollDraft`, `touchButtons` geometry, `serveAngle` |
| `update.js` | The simulation: **flight patterns (`flightPos`), junkie separation + maneuvers, divers, reinforcements**, ball/laser/enemy-shot physics, `damageBrick` (+ tiered boss phases), `bossAbility`, `loseLife` (knockout), rally/barrier, level-clear |
| `render.js` | All drawing: bricks + free-flyers (gait animation), bosses (`drawBossMon`), paddle / junkie pilot rig, HUD, menus, Pokédex, draft screen; **FX sprite caches + `drawBloom`/`drawAtmosphere`** (see Graphics & performance) |
| `dev.js` | **Dev tooling (local-only, inert in normal play):** deterministic URL/console launches (`?dev&level=&seed=&upg=…`, `window.DEV`), build grants, the balance report + F9 dashboard overlay (see Verifying) |
| `main.js` | `requestAnimationFrame` loop (`update` then `render`; `G.freeze` = hit-stop; a bootstrap guard retries until the viewport + vignette exist) |

`index.html` is the shell (canvas + the 11 script tags + local font). Also in
the repo: `test.html` (headless invariant suite), `gallery.html` (dev
projectile-readability gallery — every shot class/type/boss silhouette over
bright AND dark backdrops with honest hitR overlays, drawn by the game's own
renderer), `package.json` (`check`/`verify-assets`/`serve` scripts), `tools/`
(`fetch-sprites.js`, `verify-assets.js`), `assets/fonts/` (vendored Orbitron),
`docs/` (`FULL_GAME_ROADMAP.md` + `IMPLEMENTATION_LOG.md` — the campaign
roadmap and per-round log — plus `NEXT_SESSION_HANDOFF.md`, the start-here
brief for resuming work).

---

## Game modes (`SETTINGS.mode`, picked on the title screen)
The opening is STARFIGHTER-first, but the home screen presents only one selected
game at a time. A large, animated gameplay diorama shows the literal loop — a
Pokémon pilot dodging crossfire, a ball rallying through a Pokémon wall, or a
turret sending volleys and a charge shot into that wall. A three-item switcher
changes the selected mode without launching it; one large **START [MODE]**
button then enters setup. This removes the old duplicate Starfighter action and
dense three-card dashboard while keeping Daily, Continue, Pokédex, Settings,
journey progress, and research visible in quieter secondary positions.

The home flow is mobile-first: phone layouts stack preview, readable mode copy,
44–50px actions, and three thumb-sized mode switches inside one surface. Partner
selection uses three cards per row on phones and six roomy columns on desktop;
challenge selection is a 2×2 phone grid. `reduceFlash` freezes the animated
previews. STARFIGHTER still rotates actual partner choices inside a custom
wing-and-thruster flight rig rather than using Rayquaza as an ambiguous mascot.

Selecting a game opens a two-step setup wizard (`setupStep`, `setupLayout`):
**1 · PARTNER** shows all 18 partners on one screen, then **2 · CHALLENGE**
recaps the choice and presents four reworded intensity options before launch.
Back/Escape moves one decision backward. Trial Mode lives on the Challenge
screen. Quitting or game over returns to the featured title screen. New players
default to STARFIGHTER; existing saved mode preferences remain respected.
- **BREAKER** (`classic`) — a **calm, pure brick-breaker** (redesigned
  2026-07-20 at the owner's request: fun and challenging, but *no enemy fire
  coming at you*). Every target stays a framed brick: no free flyers, dives, or
  attack reinforcements. Legendary encounters use moving, multi-phase **boss
  bricks** with authored patrols, armor changes, and orbiting brick guards — but
  they never shoot; you break them with the ball. **The ball is the ONLY weapon
  and the paddle has no gun** (`blasterArmed()` is always false in classic — no
  LASER auto-fire, no Mega guns, no earned blaster, no charge; the FIRE pad is
  hidden and `fireAction`/`fireCharge` no-op). **No enemy fires**, so the only
  way to lose a life is dropping the ball. Mega becomes a pure ball overdrive
  (the ball pierces + hits hard while it's up), and the OFFENSE upgrade paths are
  reskinned to ball power: TWIN ORB serves a second ball, WIDE ARRAY widens the
  paddle, POWER/SHATTER CORE add ball damage, and a LASER pickup becomes
  MULTIBALL. You serve/launch the ball by tapping the playfield.
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
- **STARFIGHTER** (`junkie`, internally "Space Junkie") — the full
  pure-shooter homage:
  **no wall at all**. Non-boss waves arrive as 100% free-flyers (squads pour
  in from the edges straight onto patterns, built in `buildLevel`'s junkie
  block); boss waves keep their choreography but guards ride **bare**.
  Pattern unlocks come one region early (`unlockR` — region 1 stays on the
  clean shapes in every mode), dives start at wave 2,
  and reinforcements from region 1. **Your starter IS the ship**; NO PARTNER
  uses a neutral training drone rather than silently assigning a Pokémon:
  `pilotInfo()`/`attackElement()` (state.js). Every partner line is an
  ICONIC species (Dratini→Dragonite for dragon, Machop for fighting,
  Gastly for ghost, Magnemite for steel, Togepi for fairy, Porygon for
  normal…). The attack's SHAPE is the type family's signature — 14 shapes:
  flame, draco (serpentine pulse), fist, aqua, shard (ice lance), gear
  (sawblade), leaf, sting (needle fan), venom (glob), quake (boulder), gale
  (air cutter), pixel (Porygon data-burst), psy (warp rings), star, wisp,
  claw, volt (`drawTypedBolt`, render.js) — each SCALES UP at partner tiers
  II/III and gains a tier-III flourish (extra fork, wisplets, echo blades…),
  while its COLOR + damage type
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
  (`JUNKIE_ITEMS`, data.js); one counted diamond chip per owned path/stack
  category docks as a fixed WING HARDPOINT under the pilot (stable slots
  filling outward left/right, banking with the ship, capped paths glint —
  replaced the old orbiting ring that crossed the sprite),
  and late drafts offer `STACK_ITEMS` that stack forever (Life Orb damage /
  Never-Melt Ice cooling / Soothe Bell score — `G.stacks`).
  The pilot renders pseudo-3D (silhouette shadow + element rim light) and
  plays a lunge/flash ATTACK animation on every shot (`G.attackAnim`).

## The core systems (where to look, what they do)

### Motion — mode-specific walls and flight
This is the heart and the most-iterated system. BREAKER keeps every target in
a frame; BLASTER mixes walls and flight; STARFIGHTER commits entirely to
flight. Motion is assigned per-wave in
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

### Charge resonance, overcharge, and the Spectral Veil (Milestone 2)
The charge shot has a full timing arc now:
- **RESONANT release**: the instant the charge tops out, a `RESONANCE_WINDOW`
  (0.38s) sweet spot opens — releasing inside it fires the resonant shot:
  +25% power, +1 pierce, 30% less heat, a crystalline chime, and its own
  ledger counter (`resonants`). The FIRE pad announces the arc explicitly:
  charge % → **RESONANT!** → RELEASE! → **OVERCHARGE**.
- **Overcharge**: sitting on a full charge past ~1.4s heats the barrel
  FASTER than passive cooling drains it (net ≈ +0.12/s) — hoarding the big
  shot has a real cost, and the suite proves sustained spam still overheats
  inside the honest 5–10s band while fire-rate upgrades can only ever make
  that band kinder.
- **SPECTRAL VEIL** (region 3+, ≤2 spirit-type flyers per wave): a cycling
  shimmer (~2s on / 1.4s off, deterministic phase, dashed violet halo tell)
  that CHARGED shots phase straight through — no damage, no pierce spent —
  while basic fire always lands. The anti-charge-spam counterweight to
  armor: mixed waves now punish "charge everything" without ever making
  charge feel weak (the open window still rewards a timed big shot).

### Charge-gated shooter content (the charge shot always matters)
- **SHELL ARMOR** (junkie, region 2+ elites; 3 tutors on Kanto 2/3): normal
  bolts crack it in three deliberate hits; ONE charged shot breaks it outright.
  A bright persistent
  banner teaches the charge until the player's first charged shot
  (`G.chargedEver`).
- **ROCK TOMB barriers** (junkie, region 2+): drifting boulder Pokémon
  (Geodude line by act) that take three normal hits or one charge. They never
  block a wave clear (crumble when the last real enemy falls), drop nothing.
- Charged shots deal three interception damage and continue through three
  ordinary threats by default (more with Interceptor); massive siege fire takes
  three basic interceptions or one charged hit.

### THE GAUNTLET — every region's finale (`gen.gauntlet`, data.js)
Three rounds, difficulty scaling: **Round 1** — the SENTINELS (Kanto: the
legendary birds; each gen has its trio + mythical authored in data.js) run a
dedicated controller cycling THREE formations (rotating triangle, sweeping
battle line, weaving sentry posts) with TYPED specials on a 4.8–7.4s cadence
(`subAbility`: Frost Fan, Bolt Strike columns, Ember Rain, Tidal Line,
Boulder Toss, Flash Cannon, Warp Pulse, Spore Burst, Dragon Pulse) — they
are OUT of the regular fire pool. In STARFIGHTER these are one-phase fights.
The legendary lies `dormant` (parked at x=-2000, skipped everywhere).
**Round 2** — `gauntletWake()`: the legendary descends with its wing guards
and runs two phases. **Round 3** — `gauntletSummonMythic()`: the mythical
(0.82× legendary HP, three phases) uses a species-specific arena path and signature
attack: Genesis Halo, Time Bloom, Doom Desire, Night Terror, Victory Burn,
Diamond Storm, Spectral Combo, Jungle Lash, or Poison Puppet. Trial mode can
jump straight to any round. Fire-by-rank everywhere:
unevolved = straight bolt; evolved elites (`br.elite ≥ 2`) = AIMED heavy
splash; sentinels = aimed 3-shot fans.

**Kanto Rift override:** Arrival and Challenge each pause their stage clear
for a one-shot shard chance; Mewtwo reveals the third between Rounds 2 and 3.
**Every piece is EARNED** (2026-07-20 — the old homing catch was nearly
missable-proof, which cheapened the secret): in the shooter modes
`spawnRiftShard` spawns a **RIFT COURIER** — a swift, shiny bare crosser
(`SKIN.secret.courier`; Abra on pokemon) that crosses the cleared field once
in ~4s. Shoot it down (2 HP) and the shard drops with the old generous homing
(the shoot-down was the test); let it reach the far edge and the rift closes.
In BREAKER (calm, brick-only — no gun, no crossers) the shard itself falls
FAST on a swaying, non-homing line at a random column: one pass, catch it or
lose it. Miss any piece and the journey continues toward the normal Mew
finale. A complete key makes `gauntletSummonMythic()` spawn Mew VMAX instead
of Mew (minimum 18 HP, custom Rift arena and sprite, readable seven-shot MAX
MIRAGE pattern). Defeating it awards +3000 and **ONE Rift Bounty draft —
CHOOSE TWO from the same hand** (`G.bonusPicks`; after the first install
`holdBonusPick` keeps the SAME hand open minus the picked card — a single
choose-2 event, never two chained drafts; the header names it) before the
journey moves on to Johto — a generous but not run-warping payoff. (The old one-off superpowers —
Paradox Heart / Rift Lens / Echo Relay — are retired for new runs;
`SECRET_UPGRADES`/`applySecretUpgrade` stay only to honour saves that already
earned one.) The completed Rift state is carried by checkpoint v2; v1 saves
remain accepted. STARFIGHTER Trial exposes Mew VMAX directly as a fourth
Kanto finale choice; that practice encounter never changes persistent Rift
progress. Daily runs preserve the normal Mew finale.

### STARFIGHTER finale entrances (`GAUNTLET_ENTRANCE_NAMES`, data.js)
Every generation has three authored arrival beats: one for its sentinels, one
for its legendary, and one for its mythical (27 distinct style keys), plus the
Kanto secret's MAX RIFT. `updateGauntletEntrance()` owns the approach path,
scale, rotation, and timing while `drawGauntletEntranceFx()` draws a matching
arena sigil and the explicit **ONE / TWO / THREE PHASES** tier card. Enemy fire
and ordinary boss patrols stay paused until the entrance completes.

### Boss arena archetypes (`BOSS_STYLE`, data.js)
Every legendary owns its arena differently: Mewtwo's still high anchor,
Lugia's mid-air figure-eight, Rayquaza's full-width serpent wave, Dialga
locked mid-arena with CLOCKWORK rotating fire, Zekrom slamming flank to
flank, Yveltal's corner-to-corner predator V, Lunala's lissajous glide,
Eternatus riding the top rim raining straight bombs, Koraidon sprinting.
Classic damps the vertical play (guard wall stays clear); wing arcs hug the
boss; low-diving styles stay above the ship band.

### The Mewtwo duel (Milestone 1 Round C — the boss-framework prototype)
STARFIGHTER's Kanto legendary now teaches BOTH weapons (BOSS_ABILITIES
case 150, update.js):
- **P1 · FOCUS ORBS (normal fire's answer):** every other ability turn
  summons three 2-HP psychic charges that orbit Mewtwo (`s.orbit` on boss
  enemy-shots). Two basic hits deny an orb; ignored ~4s each launches as
  an aimed HEAVY shot; if Mewtwo falls first they fizzle. Charge is
  wasted on 2-HP targets — spray, don't hoard.
- **P2 · PSYSTRIKE CHANNEL (charge's answer / desperation):** below 15%
  HP a rooted 2.6s channel begins behind a loud warning (pulse rings
  respect `reduceFlash`; the notice + warned columns carry the info).
  Uninterrupted → five `columnStrikes` with real dodge lanes. A CHARGED
  hit mid-channel BREAKS it: `br.staggerT` 1.5s, boss fire holds, and all
  damage lands ×1.35 (the interrupt's reward window). Recurs on a 9s
  cooldown while he lives. Abilities pause during channel/stagger.
The pattern (one move answered by normal fire, one by charge, desperation
with readable counterplay) is Milestone 4's template for every boss.

### Protect objectives: the friendly entity (Milestone 3 Round C)
STARFIGHTER's first FRIENDLY combat entity (`br.friendly`): outside
every formation system like a crosser, untouchable by your own fire
(bolts pass straight through), but the swarm hunts it — every other
aimed micro volley redirects onto it and each hit chips one of three
heart pips. **ESCORT THE TRAVELER** (Sinnoh arrival): Togepi crosses
the battle bottom-to-top over ~18s; get it to the exit and the swarm
disperses (+600, a potion at the exit). **DEFEND THE RELAY** (Kalos
challenge): Porygon holds mid-field for 22s. If the friendly faints,
the objective FAILS — the banner drops and the wave reverts to a
normal clear (the game's first objective fail state). The results
screen records the outcome.

### Round D: sentinel rhythm + presentation polish (Milestone 4)
Round 1 now has a combat read: **sentinels GUARD** (×0.55 damage behind
a hexagonal ring) and the one that just fired its typed special drops
its guard for 2.4s — full damage, first hit ×1.2, `OPENING!` — punish
the attacker. All **27 entrance styles** now have bespoke motifs in
`drawGauntletEntranceFx` (cracked-clock timesplit, serpent skycoil,
storm maelstrom, sun-ray suncharge, star-ring wishgate, …). Phase
transitions add a silhouette pulse + radial speed lines
(`br.enrageAnimT`); boss defeats add brief dramatic slow-mo + a triple
type-colored ring echo. The trial screen gained a **PHASE row**
(`jumpToGauntletRound(round, phase)` lands mid-band HP;
`DEV.boss(r, round, {phase})`). The boss score now layers by phase:
`bossMusicHeat()` 0/1/2 — heat 1 is the intense layer, heat 2 (last
stand) adds double-time hats and a denser counter pulse.

### Round C: the nine mythicals (Milestone 4 — round 3 gets teeth)
Every gauntlet's mythical now duels by the template — lighter kits than
the legendaries (shorter fights), all riding the same machinery with
params. Signatures: Mew's ECHO BUBBLES pop into halos, Celebi's BLOOM
PODS drip seeds, Jirachi's WISH STARS come due as Doom Desire lanes if
ignored (`s.orbit.launchType:'column'`), Darkrai's HAUNTING WISPS stalk
your lane (`s.feather.home`), Victini's V-SPARKS orbit and launch,
Diancie's JEWEL TURRETS add a DIAMOND STORM column each, Marshadow's
rushes drop fist afterimages, Zarude's BINDING VINES lash every other
beat, Pecharunt's MOCHI PUPPETS wobble down heavy. Channels (dur 2.4):
GENESIS WAVE / LEAF STORM / MILLENNIUM COMET / DARK VOID / V-CREATE /
MOONBLAST / SPECTRAL THIEF / POWER WHIP / MALIGNANT CHAIN. The
channel-open gate is `BOSS_CHANNELS entry + !secretBoss` — Mew VMAX
shares id 151 and stays channel-free (tested).

### Round B: the other six legendaries (Milestone 4 — template complete)
All nine finale legendaries now duel by the template. `BOSS_CHANNELS`
entries carry optional `params {count,w,gap,warnMul,bounce,color}` and two
new punish patterns exist: `rain` (distinct-lane storm) and `pincer`
(edges close inward, wider-warned center pair); `sweep` learned `bounce`
(out-and-back). Signatures (all 2-HP intercepts, deny with two basic
hits): **Rayquaza** METEOR SHARDS (accelerating calves, 4-micro burst;
phase-2 sweeps leave a comet wake) + DRAGON ASCENT sweep. **Zekrom**
CHARGE CONDUITS (each live node adds a BOLT STRIKE column at its lane) +
FUSION BOLT rain. **Yveltal** DRAIN WISPS (spiral home; an absorbed wisp
heals it +3% maxHp, clamped at the phase threshold — shoot them to
protect your progress) + DARK PULSE pincer. **Lunala** LUNAR MOTES
(manifest with PHANTOM PHASE; kill 2 to snap her veil early, survivors
convert to aimed crescents; channels always clear the veil) + MOONGEIST
BEAM wide columns. **Eternatus** VENOM CYSTS (live cysts thicken the
toxic rain 7→9) + ETERNABEAM wide slow sweep. **Koraidon** AFTERIMAGES
(dashes drop ghosted stationary launchers that fire aimed heavies after
3.5s) + COLLISION COURSE bounce sweep (16 strikes).

### Lugia and Dialga duels (Milestone 4 Round A — the template rolls out)
Desperation channels are now data-driven: `BOSS_CHANNELS` (data.js) keys
`{hpFrac, dur, cd, name, pattern}` per species and `spawnChannelPunish`
(update.js) dispatches the punish — `columns` (Mewtwo, unchanged), `sweep`
(five sequential columns, a traveling wall), `clock` (six clockwise
strikes, one rotating safe lane starting at the pilot's column). Interrupt
mechanics (charged hit → 1.5s ×1.35 stagger, cd 9) are uniform template
constants. Kit design docs live in `docs/archive/M4_BOSS_KITS.md`.
- **Lugia — THE STORM THAT HUNTS (L6):** STORM FEATHERS (three 2-HP
  `aeroring` shots drift down on the wind; each that reaches the ship band
  bursts into three aimed micros — normal fire's answer), TAILWIND CURRENT
  (`G.gustT`+`G.gustDir` drift player bolts AND enemy micros ±150/s in the
  shooter modes; the ball-curve gust is untouched; the pilot is never
  pushed), phase-2 pursuit (the infinity patrol's center hunts the pilot),
  AEROBLAST sweep channel.
- **Dialga — THE CLOCKWORK BASTION (L12):** CHRONO GEARS (two anti-phase
  2-HP `time` nodes orbit fixed flanks and drip a metronome micro each
  0.45s tick; 9s self-expiry), TIME DILATION (`enemyShotTimeScale()` —
  square-wave lurch ×1.7/×0.15 on the deterministic `G.timeWarpClock`;
  displacement scaled at integration time, stored velocities never
  mutated), phase-2 volley period ×0.85, ROAR OF TIME clock channel.

### Boss battles (`drawBossMon` render.js, phases in `damageBrick`)
Legendaries are **BARE** — a huge bare Pokémon holding the arena (breathing
aura, orbiting energy ring, silhouette shadow + rim light, its own gait), never
a card. Phase count is encounter-authored (`br.phaseCount`): STARFIGHTER
sentinels have one phase, legendaries two (50% split), and mythicals/secret
Mew VMAX three (⅔/⅓ splits). Other game modes retain their three-phase boss
structure. Each transition fires a dodgeable radial **shockwave** with one open
escape spoke + hit-stop, protects the new phase behind a short 0.78s damage gate,
widens/quickens the patrol,
and adds spread fire; the final phase also summons a ring of bare
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

### Skill tree (`PATHS` in data.js ~423) — now the hub of THE UPGRADE WEB
Six paths × four tiers, **permanent**, drafted between every wave. The 24
tiers are the save-stable ANCHOR nodes of a 50-node web (`WEB_SPOKE_ORDER`,
`WEB_BRIDGES`, `WEB_FUSIONS`, `WEB_APEXES`, `WEB_SATELLITES` in data.js;
design: `FUSION_APEX_PLAN.md`): six **Form II bridge synergies** sit
between adjacent constellations (partner evolution + one owned node each
side; real two-system mechanics with ball-first classic adapters), **15
FUSION POWERS** cover every path pair exactly once (Final Form + 3 ranks in
both paths + a capstone in either + the bridge for adjacent pairs — **max
2 per run**; the six original superskills became the adjacent fusions with
limiters: matrix-gated meteor rain, once-per-target gravity wells, a
once-per-wave guardian pulse… plus nine cross-web fusions: Prismstorm,
Hypernova, Bulwark Battery, Cataclysm, Aegis Lance, Comet Shepherd, Mirror
Spectrum, Bestiary Chorus, Victory Formation), and **2 APEX POWERS** crown
the chart (stage 24+, two compatible fusions, nine ranks — **max 1**: War
Machine's pressure-fold weapon flow, Celestial Guardian's three-sector
ward). The three mastery stacks dock as ranked **satellite nodes**. The
draft deals Commit/Adapt/Explore (`rollUpgradeChoices`, update.js) with
apex > fusion priority, ONE fusion/apex per hand, a newly-unlocked
guarantee after evolving, reroll anti-repeat and pity; knockout burns only
graph LEAVES (`webRegressibleLeaves` simulates every removal against
`webBuildLegal`) so a defeat can never break a recipe; checkpoints are
schema v3 with a never-throws v1/v2 migration (`migrateCheckpoint`,
state.js). The constellation screen addresses all 50 nodes — locked
fusions stay compact silhouettes until 2 ranks in both paths, connectors
draw only for owned/offered/selected nodes, and every locked node states
its exact unlock route. It opens at 115% zoom on desktop / 130% on touch;
drag the map to pan, wheel or pinch around the pointer/midpoint to zoom, and
use − / + / FIT / FOCUS for deterministic navigation. Advancing
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
**FULL TREE** (`T` on desktop) opens a zoomable, draggable **tap-to-inspect
constellation**. Only the three live choices carry bright white `OPTION 1/2/3`
tags; owned nodes are steady, reachable-but-not-offered nodes are muted, locked
nodes recede, and inspecting an unavailable node adds a dashed ring without
making it appear installable (`treeNodeVisualState`, render.js). The detail
panel always spells out `AVAILABLE`, `REACHABLE · NOT OFFERED`, or the exact
lock recipe. Node rects come from `upgradeTreeLayout` so render and hit-testing
can't drift. Upgrade **symbols are glossy faux-3D
badges** (`iconBadge`/`blitBadge`, render.js — baked per colour/size) used in
the tree and draft cards. A **HUD build strip** shows owned paths, every
non-junkie tier adds a colored hardware socket to the paddle, and Junkie racks
one compact wing-hardpoint chip per owned path/stack category (with a count) so
the pilot stays readable. As authored paths cap, all modes fill empty offers with small
forever-stacking mastery items instead of dead reward screens. Caps read via
`shieldCap`/`megaDur`/`barrierCharges` (state.js). `upgN(key)` = does the player
own that tier.

### Knockout (not game-over) — `loseLife()` update.js
Losing all lives **burns 2 random tree levels** (`regressPath`), refills
lives, and **retries the wave**. Real game-over only when the tree is empty.
Lives show top-right in one persistent segmented **HP rail** with its numeric
current/maximum count (`drawPlayerHealthBar`, render.js), plus a matching bar
above the character after a hit. Easy starts with 5 HP, Normal with 4. When
hurt, defeated enemies can drop a pulsing **MAX POTION**; it
restores 1 HP and a pity counter guarantees one after 10 eligible kills.
`G.livesMax` remains the maximum and POKÉ REVIVE can grow it further.

### Starter partners (`STARTER_MON` data.js ~314)
Setup uses a dedicated all-roster screen with **one three-tier partner line for
each of the 18 battle types**, plus a separate **FLY SOLO / NO PARTNER** option.
The second setup screen recaps the selected partner before difficulty. A partner
rides the paddle (or pilots STARFIGHTER), tints its rig, seeds the permanent
serve element, and improves at regions 4 & 7 (`starterStage`). Each line has
three local sprites, form names, tier copy, and distinct modifiers:

| Type | Evolution line | Ability |
| --- | --- | --- |
| Normal | Starly → Staravia → Staraptor | Adaptability: damage + score |
| Fire | Charmander → Charmeleon → Charizard | Blaze: damage + ignited returns |
| Water | Squirtle → Wartortle → Blastoise | Torrent: cooler shots + return shields |
| Electric | Pikachu → Raichu | Overdrive: OP damage, rapid fire, Mega charge, chain lightning |
| Grass | Bulbasaur → Ivysaur → Venusaur | Overgrowth: more drops + pickup reach |
| Ice | Frigibax → Arctibax → Baxcalibur | Snow Warning: KO-triggered slow motion |
| Fighting | Quaxly → Quaxwell → Quaquaval | Guts: missing-HP and boss damage |
| Poison | Gastly → Haunter → Gengar | Corrosion: repeated-hit damage stacks |
| Ground | Sandile → Krokorok → Krookodile | Sand Force: armor damage + quakes |
| Flying | Rookidee → Corvisquire → Corviknight | Tailwind: wider, faster rig |
| Psychic | Hatenna → Hattrem → Hatterene | Foresight: guaranteed precision crits |
| Bug | Grubbin → Charjabug → Vikavolt | Swarm: KO-triggered extra attacks |
| Rock | Nacli → Naclstack → Garganacl | Sturdy: extra maximum HP |
| Ghost | Litwick → Lampent → Chandelure | Phase Shift: chance to ignore damage |
| Dragon | Axew → Fraxure → Haxorus | Dragonheart: starting/passive Mega + duration |
| Dark | Impidimp → Morgrem → Grimmsnarl | Moxie: combo damage + score |
| Steel | Tinkatink → Tinkatuff → Tinkaton | Iron Defense: starting shields |
| Fairy | Ralts → Kirlia → Gardevoir | Wish: more potions + easier catches |

Pikachu is intentionally overpowered: tier I starts at +50% damage, 35% Mega,
faster shots, and chain lightning. It becomes Raichu in **region 5**; region 7
unlocks Overdrive III without pretending Raichu evolves into itself. Paddle
hulls derive a palette and crest from every chosen type, while Fire/Water/Grass
keep their bespoke flame, cannon, and frond silhouettes. NO PARTNER is neutral;
STARFIGHTER renders a vector training drone with no partner ability.

### Stage results, mastery medals, and region intros (Milestone 1)
Every cleared stage pauses on a **one-tap RESULTS interstitial**
(`G.state === 'results'`, `drawResults` render.js, payload from
`buildStageResults` state.js) before the draft: time, kills, score, the
combat ledger (hits taken by projectile family, shots normal/charged,
overheats), and the stage's **MASTERY OBJECTIVES** with medal states. The
flow order is clear → results → (act ceremony if pending) → draft
(`advanceResults`, input.js). Objectives live in `STAGE_OBJECTIVE_SETS`
(data.js) — Kanto's three stages are fully authored (First Flight / Flock
Breaker / Swift Wings ★, Shell Breaker / Cool Hands / Interceptor ★, Kanto
Legend / Psychic Dancer ★); other regions inherit per-stage-type defaults
until their polish pass. Checks read the balance ledger (including the
`intercepts`/`shellCracks` counters). Medals persist in `pkbrk-medals`
(real journeys only — trials/dailies/cheated runs evaluate and display but
never save; the screen says so). Entering a region's arrival wave plays an
authored **REGION INTRO** hero card (`REGION_INTROS`, data.js + a
`SFX.regionIntro` sting); junkie arrival waves grant a 3.4s first-volley
grace so the card never covers live fire.

### The encounter director (Milestone 3, junkie non-boss stages)
Every stage runs an authored BEAT SCRIPT (`REGION_GRAMMAR`/`encounterScript`
in data.js; controller `updateDirector`/`runBeat` in update.js, driving
`G.director`) so regions read differently without just changing enemy
counts. A beat fires ONCE at its trigger — `p` (alive/baseline progress
threshold) or `afterPrev` (seconds after the previous beat). Beat actions:
- **bonusFlock** — a swift line of harmless Pidgey crosses the mid-sky.
  Crossers (`br.crosser`) have NO flight slot: outside the formation
  system, separation solver, shooter pool, and overlap invariants; they
  never block a clear and escape if ignored. Chaining pays +150 + Mega —
  zero-risk group-destruction teaching (Kanto arrival).
- **raid** — one squad dives at the ship band behind a warning card.
- **surge** — one squad rides its pattern ~1.8× (the flock bolts).
- **recovery** — enemy fire holds ~3.4s, heal-drop pity primes, and the
  director threat budget EASES (×0.35) — a genuine breather.
- **finalPush** — the last stragglers press hard (faster fire, threat
  budget ×1.4).

The director owns `G.director.threatMul` (× `starThreatCap` via
`directorThreatMul()`) so it can ease or raise the *simultaneous* threat
instead of blindly stacking attacks. Authored grammars so far: KANTO
(teaching — bonus flock; raid → recovery), JOHTO (the hunt — surge; raid
→ recovery → final push); regions 3-9 use a default escalation → recovery
arc until their Milestone 9 pass.

**Objective families** (Milestone 3 Round B) — a stage may declare a live
in-wave OBJECTIVE (`G.objective`, from `ENCOUNTER_OBJECTIVES` in data.js;
controller `updateObjective`, banner `drawObjectiveBanner`) that changes
HOW you clear it. **SURVIVE THE MIGRATION** (Hoenn challenge): you can't
clear by attrition — a swarm keeps coming (periodic reinforcements);
outlast the timer and the flock disperses (remaining flyers become
fleeing crossers, and the crosser-exempt clear takes the wave). A gold
top banner names the objective and counts down. More families
(escort / capture / defend-lanes) join in a later round.

### HUD and first-wave coaching
The HUD identifies a permanent starter element as **PARTNER** and a temporary
override as **POWER-UP**/**ITEM** with its remaining duration. Mega shows a
percentage plus “HITS CHARGE” until ready. Classic non-boss waves keep the
current region's brick behavior in a dedicated `REGION RULE` rail; type
effectiveness uses `G.combatNotice`/`setCombatNotice` in a backed feedback rail
instead of text over the target formation. Brick corners have fixed ownership:
behavior top-right, type bottom-right, and HP top-left only after damage.
Wave 1 teaches one action at a time: move/aim while serving, then reach the
high ground after launch (`G.coachStep`).

### Rally / high-ground (the "pinball up top" mechanic)
Armored top row = "guardian wall" (multi-hit, color-shifting HP). Getting the
ball above it arms a **golden barrier net** under the formation (2 charges/
possession, `barrierCharges`) that bounces the ball back up in empty columns
only — it pinballs off lower blocks. `rally` counter on each ball → escalating
score + Mega charge. **Sky Warp** power-up phases balls up through blocks.

### Trial mode (per-game, with gauntlet round picker)
Trial lives on each game's SETUP page (inherits the chosen mode). Region ×
stage grid; picking a LEGENDARY stage reveals a ROUND row (FULL GAUNTLET /
★ the legendary by name / ✦ the mythical). STARFIGHTER Kanto adds
**◆ MEW VMAX · SECRET** as a direct practice choice. Start jumps straight to
that round via `gauntletWake()`/`gauntletSummonMythic(forceSecret)`. `resetRun(startLevel,
trial=true)` grants the tree advances you'd have earned. Trial runs never
save best score or Pokédex catches (`G.trial` flag).

### Difficulty, progress safety, and cheats
- **One journey curve** (`diff()`, config.js): smoothstep across the 9
  regions — ×0.78 opening, ~×1.1 middle, ×1.4 finale — on minion fire,
  legacy boss cadence, and shot speed. STARFIGHTER adds its own authored
  cadence (1.80s → 0.88s ordinary; 2.55s → 1.84s boss on Adventure) and an
  active threat budget (2.5 → 5.5): early regions can fire small sparks often,
  while late regions spend the larger budget on a swarm OR a siege shot, never
  an unbounded pile of both.
- **Progress never wipes**: the region checkpoint saves from region 1 and
  SURVIVES a true game over — CONTINUE always works. A knockout still burns
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
  `OVERHEAT_DUR` (state.js). Heat is time-normalised against real firing cadence:
  Normal STARFIGHTER overheats after about 7.6s of uninterrupted basic fire,
  and rapid-fire partners land in the same 5–10s band instead of bypassing it.
  Coolant greatly extends that window, making its web route strategically live. A
  **charged shot dumps a big slug of heat** (~0.6 of the bar at full charge, in
  `fireCharge`) — chaining big shots overheats you.
- **Difficulty:** `BRICK_HP_MUL` in `buildLevel` (state.js) — the single knob
  to make waves tankier/snappier (currently `1.35`). Note CLASSIC has NO paddle
  gun at all (`blasterArmed()` is always false there) and takes no enemy fire —
  the ball carries every wave, and brick HP is the whole challenge curve.
- **Enemy warnings:** ordinary telegraphs are capped by both count and active
  threat (`starThreatCap`); aimed/heavy attacks draw a line and massive attacks
  get a long warning plus an oversized muzzle tell in `drawTelegraphs`
  (render.js). Danger line only shows for a
  descending boxed wall (hidden on static waves).
- **Typed enemy fire:** every enemy shot carries the firing Pokémon's `type`
  and renders in that type's colour. `TYPE_PROJECTILE_KIND` gives rank-and-file
  attacks a type silhouette, while all 43 boss-only species have an explicit
  `BOSS_PROJECTILE_KIND`; `enemyShotSprite` bakes each shape once. It has an
  effectiveness relationship to YOUR current type (`playerType`/`shotEffect`,
  state.js): a shot you resist shows a faint dashed ring and is **deflected —
  no life lost**; a super-effective shot shows a pulsing red ring. Explicit
  elite rank can author **HEAVY** fire, but HP never silently promotes a shooter.
  Micro / standard / heavy / massive classes separate art radius from the small,
  honest collision core and cost one life per impact on Adventure. Micro fire
  uses a dark under-tracer, white hot core, and render-only scaling for thin
  silhouettes (especially `stinger`/`needle`) so early shots remain visible
  without enlarging their hitboxes. All in the
  `G.enemyShots` hit block, update.js.

### Music direction (`ADVENTURE_MUSIC`, audio.js)

The soundtrack is an original creature-adventure score built entirely from the
Web Audio synth. Every region changes scale, tempo, progression, motif, rhythm,
bass/drum grammar, instrument voice, and echo colour; most exploration routes
lean bright/major, while Sinnoh and a few other routes use adventurous modal
colour. Entering any sentinel, legendary, mythic, or gauntlet fight switches to
that region's separately authored faster boss theme. Boss phases and Mega add a
small intensity layer without replacing the region's identity. No third-party
recordings or copyrighted game melodies ship with the project.
- **Mega/barrier:** `MEGA_DUR`, `barrierCharges` (state.js)
- **Reinforcement flights:** `G.reinforce` (state.js), `spawnReinforcement`

Persisted in `localStorage`: `pkbrk-settings`, `pkbrk-best`, `pkbrk-dex`,
`pkbrk-dexs`, `pkbrk-music`, `pkbrk-daily`, `pkbrk-run` (the region
checkpoint), `pkbrk-v`
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
the title screen grows a CONTINUE button (`RUN_CKPT`). Knockouts and a true
game over retain the latest region checkpoint; starting a new journey replaces
it when the next region checkpoint is reached. **Draft reroll:** one per
upgrade screen
(`rerollDraft`, input.js; `rollUpgradeChoices`, update.js).

**Fonts are local** (`assets/fonts/orbitron.woff2`, variable weight 400-900,
preloaded + kicked via `document.fonts.load` in setup.js — canvas alone
doesn't trigger @font-face). Orbitron is for titles/numbers; body copy uses
`bodyFont()` (render.js) — Verdana/system stack for readability.

**Title and setup fit short landscape** (`menuLayout`/`setupLayout` short/
narrow variants, config.js): under H=560 gaps and typography compress; under
W=620 the featured STARFIGHTER card sits above two side-by-side arcade cards,
the partner roster becomes 3×6, and challenge cards become 2×2. Both setup
steps and six representative viewports are covered by the `menu fit across
viewports` test — keep it green when adding menu items.

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
  go into `uiTouchIds`, snap the steering target back to the actual player,
  and a surrounding dead-zone swallows near-misses (input.js touchstart).
  The same lock restores both X and Y for Space Junkie. Without this, tapping
  FIRE dragged the paddle/ship right and down to the button.
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
recovery, the balance-instrumentation ledger, the boss phase harness, and
seeded dev-launch reproducibility) that drives the sim headless and reports
PASS/FAIL (`window.TEST_RESULTS` for automation). Keep the suite tab
FOREGROUNDED — background-tab timer throttling makes it crawl.
`npm run check` syntax-checks all modules; `npm run verify-assets`
cross-checks rosters vs NAMES vs sprite files (tools/verify-assets.js). Run
these after any invariant-adjacent change.

**Balance instrumentation (Milestone 0, js/dev.js + the stats layer in
state.js).** Every run keeps one compact record per wave attempt on
`G.runStats.levels` (time, kills, damage in BY PROJECTILE FAMILY, normal vs
charge damage out, charge uses + wasted charges, overheats + weapons-locked
seconds, absorbs/deflects, Mega uses, draft picks, boss phase durations,
knockouts). All LOCAL-ONLY — nothing is transmitted. Surfaces:
- `window.DEV.report()` / `DEV.download()` — the full JSON balance report
  (also says why the run ended); `DEV.help()` lists everything.
- **F9** (or `DEV.panel()`) — live dashboard overlay; `?dev` adds a corner
  badge that toggles it on touch.
- **Deterministic launches:** `?dev&level=14&mode=junkie&diff=normal&seed=S`
  (or `region=5&stage=3&round=2`, `upg=arsenal:3,aegis:2`, `starter=fire`,
  `real=1` for a non-trial run) — same seed, same wave, every time. Console:
  `DEV.launch({...})`, `DEV.boss(region, round)`, `DEV.grant('arsenal:3')`.
- **`gallery.html`** — the projectile readability audit: all shot classes ×
  type kinds × 43 boss silhouettes × 17 player bolt shapes over bright/dark
  halves, with dashed-red honest collision cores. Check it after ANY
  projectile art change.

---

## Roadmap / ideas for the next session
Not committed to — a menu of high-value work, roughly by leverage. Nothing
here is started; the game is stable and shippable as-is.

**Onboarding & clarity**
- Boss identity: short named intro cards + one clear counterplay lesson each.

**Gameplay depth**
- Build synergy tags on draft cards ("Ball / Blaster / Defense / Catch").
- ~~Local balance telemetry~~ — SHIPPED (Milestone 0): per-level stats layer
  + `DEV.report()` + F9 dashboard + seeded dev launches; see Verifying.

**Visual / UX**
- Colorblind-friendly type palette (flyers convey type by aura color alone;
  boxed cards at least show a glyph). Reuse the accessibility-toggle framework.
- Per-region color grade + animated scenery accents (the atmosphere wash is a
  start); richer boss-phase VFX.

**Architecture** (deferred on purpose — the no-build vanilla setup is a feature)
- If files grow further, migrate incrementally to native ES modules (no
  bundler) and split `G` into `run`/`world`/`actors`/`ui`; route screen changes
  through a small scene state machine. Do this between phases, not mid-feature.
- Convert PNG sprites to WebP (≈17 MB of art); add an asset manifest that
  preloads only the current + next region.

**Known small items**
- Upgrade-web zoom anchoring can drift at unusual very-tall viewports (the
  pan clamp fights the anchor point) — cosmetic, revisit with the
  Milestone 5 constellation work; the suite asserts the canonical size.
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
monetization. The **AETHERFALL EDITION is original work** (names, world,
procedural art — no Pokémon strings, ids gated per skin, zero shared
assets): it exists so the engine has a release identity that carries no
third-party IP, per `docs/archive/ORIGINAL_SKIN_PLAN.md`.
