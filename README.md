# Pokémon Invaders Breakout

A Breakout × Space Invaders/Galaga hybrid that transforms as you play: it
starts as relaxed brick-breaker in Kanto and, region by region, becomes a
Space-Junkie-style shooter where Pokémon break out of their bricks and
fly intricate patterns. Journey through 9 regions (3 stages each — Arrival,
Challenge, and a Legendary boss), draft a permanent skill tree, pick a
starter partner whose paddle ability evolves, and catch Pokémon for a
persistent Pokédex.

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
| `data.js` | `TYPE_COLORS`, `POWERS`, `EFFECTIVE`/`RESIST` charts, `MODIFIERS`, **`PATHS`** (skill tree), **`STARTER_MON`**, **`GENS`** (region/roster/boss data), `NAMES`, sprite loading, `drawGlyph` (all vector icons) |
| `scenery.js` | Per-region prerendered backgrounds (`drawScene[...]` — iconic towns), starfield, ambient weather |
| `state.js` | The `G` state object, `buildLevel()` (**the level generator — formations, flight assignment, hp, motion style**), `makeBall`, `resetRun`, `serve`, `spawnReinforcement`, particle/floater helpers, tree caps (`shieldCap`/`megaDur`/`barrierCharges`) |
| `input.js` | Mouse/keyboard/touch, `onPress` dispatch, `fireAction`, `pickUpgrade`, `touchButtons` geometry, `serveAngle` |
| `update.js` | The simulation: **flight patterns (`flightPos`), march, divers, reinforcements**, ball/laser/missile/enemy-shot physics, `damageBrick`, `bossAbility`, `loseLife` (white-out), rally/barrier, level-clear |
| `render.js` | All drawing: bricks + free-flyers, paddle (starter rigs + cannon), HUD (build strip), menus, Pokédex, upgrade-draft screen, trial panel |
| `main.js` | `requestAnimationFrame` loop (`update` then `render`; `G.freeze` = hit-stop) |

`index.html` is a 30-line shell (canvas + the 10 script tags).

---

## Game modes (`SETTINGS.mode`, picked on the menu)
- **CLASSIC** — the ball + blaster brick-breaker described below.
- **BLASTER** — a ball-less pure shooter (Space-Junkies flavour). `serve()`
  spawns no ball and drops you straight into play; you clear the wall and the
  flyers by shooting. You only lose to enemy fire (the "0 balls → loseLife"
  gate is skipped), enemies fire ~2× as often and from the first wave, bolts
  render as sleek cyan energy darts, and holding **CHARGE** (right-click /
  Shift on desktop, the CHARGE pad on touch) winds up a fat piercing shot
  (`fireCharge`, damage/pierce scale with hold time). Mega, catches, drops,
  and the skill tree all still work. Wiring: `G.mode`, `G.charge` (state.js);
  charge build/release + enemy-fire boost (update.js); charge input + touch
  pad (input.js); bolt/charge visuals (render.js `drawProjectiles`).
- **SPACE JUNKIE** — the full pure-shooter homage to the game's namesake:
  **no wall at all**. Non-boss waves arrive as 100% free-flyers (squads pour
  in from the edges straight onto patterns, built in `buildLevel`'s junkie
  block); boss waves keep their choreography but guards ride **bare**.
  Pattern unlocks come two regions early (`unlockR`), dives start at wave 2,
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
  Enemies are HALF-SIZE and ride patterns shrunk to ~55% — tight, closely
  knit flocks that live HIGH (airspace floor ~42% of the screen early,
  creeping to ~56% late; the low band belongs to the ship). Region 1 is
  calm; dives start in region 2, and from there squads periodically run
  **maneuvers** (`G.maneuver`, update.js): startle-SCATTER (the knot swells
  ~1.8× then contracts), speed SURGE (~1.8× pattern speed), and from region
  3 a RAID that dips the whole flock toward the ship band and back — capped
  so it never enters the ship's airspace.
  **Crispness:** a per-frame constraint solver keeps junkie flyers from EVER
  overlapping (the pass after the flight loop, update.js) — converging
  patterns pack into readable knots instead of blobs. **Type changes are
  temporary** there: `G.ballElement` is only ever an override that counts
  down (HUD shows `TYPE · Ns`) and reverts to the pilot's innate type;
  element orbs drop far more often (junkie branch of the orb block).
  **Held items:** the draft re-skins the same 4×4 tree as Pokémon items
  (`JUNKIE_ITEMS`, data.js), every owned tier orbits the pilot as a badge,
  and once the tree caps the draft offers `STACK_ITEMS` that stack forever
  (Life Orb dmg / Never-Melt Ice cooling / Soothe Bell score — `G.stacks`).
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
- **`flightPos(F, tAbs)`** (update.js) — the pattern library: `square` (loop
  around the bricks), `ring`/`oval` (circle/ellipse), `inf`/`falls` (figure-
  eights), `olympic`, `rose`, `diamond`, `liss`, `pulsar`, `pend`, `epi`,
  `weave` (threading sweep), `lane` (bobbing lanes), `star` (five-point
  circuit), `binary` (counter-rotating twin rings), `atom` (three crossed
  orbitals), `fountain` (rise-and-fall columns), `zigzag` (hard-cornered
  switchbacks), `vortex` (breathing spiral arms), plus wrapping
  `snake`/`helix`/`swoop` that span past both edges (wrap jump off-screen;
  off-screen flyers can't fire and are de-prioritized by `nearestBrick`).
  Every non-wrapping pattern is BOUNDED inside its |rx|,|ry| box — that is
  what keeps the non-overlap zoning provable; keep that true for new ones.
  Flyers ride nose-to-tail via `phase`; `F.spd` scales per-squad speed. The
  **`flyerRoom`** floor keeps them above the paddle (generous → ~0-crowding in
  the final region); flyers ride in screen space (`G.fx/G.fy` stripped out).
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
- **Rendered:** boxed bricks are cards (render.js `drawBricks`); flyers,
  divers and `bare` blocks are bare sprites with a type-colored aura
  (render.js, the first `if (bareMon(br))` block in the per-brick loop).

### Skill tree (`PATHS` in data.js ~423)
Four paths × four tiers, **permanent**, drafted between waves. Advancing is
`advancePath(key)`; the capstone (tier 4) is a superweapon:
- **ARSENAL** → HYPER CANNON (bolts drill 3 blocks, 2× dmg; Twin Cannon at t3)
- **AEGIS** → SUPER SHIELD (floor-shield regrows every 10s; bigger cap; wider)
- **SURGE** → APEX MEGA (8s Mega hitting for 5; rally barrier +1 & pts +50%)
- **BOND** → POKÉ REVIVE (+1 life now + per region cleared; more drops)

Draft UI (render.js, `state === 'upgrade'`) shows the **whole tree** with tier
pips and each card's "→ LEADS TO". A **HUD build strip** (top-left, render.js
`drawHUD`) shows owned paths always. Caps read via `shieldCap`/`megaDur`/
`barrierCharges` (state.js). `upgN(key)` = does the player own that tier.

### White-out (not game-over) — `loseLife()` update.js ~351
Losing all lives **burns 2 random tree levels** (`regressPath`), refills
lives, and **retries the wave**. Real game-over only when the tree is empty.

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

### Trial mode
Menu → Trial → region×stage grid. `resetRun(startLevel, trial=true)` jumps in
with authentic difficulty AND grants the tree advances you'd have earned.
Trial runs never save best score or Pokédex catches (`G.trial` flag).

---

## Tuning knobs (where to nudge balance)

- **Difficulty presets:** `PRESETS` in config.js (descent/shotRate/ballSpeed/etc.)
- **The one curve:** `diff()` in config.js — reads presets × level × adapt × modifier
- **Drop rarity:** `dropChance` in `diff()` (currently `0.06`)
- **Density budget (readability):** `buildLevel` in state.js (`cols` width-
  driven & capped 10; `flyerBudget` hard-caps moving flyers ≤20; `boxedBudget`
  shrinks the wall region by region; late-game +hp at regions 5/8)
- **Flyer patterns & non-overlap zoning:** `flightGeom`/`clampOpen` (state.js
  ~155–210), pattern math in `flightPos` (update.js ~175); `kinds` unlock list
  in `buildLevel`
- **Cycle speed:** `G.pathSpeed` (state.js). Blocks are static
  (`G.blocksStatic`); the march (update.js) runs only on boss waves
- **Blaster feel (fires freely, Space-Junkies style):** cadence `G.blasterCD`
  and heat-per-shot in `fireAction` (input.js), passive cool in `tickEffects`
  (update.js), `OVERHEAT_DUR` (state.js). Overheat is now a rare "held it
  forever" event, not a constant governor.
- **Difficulty vs the free blaster:** `BRICK_HP_MUL` in `buildLevel` (state.js)
  — the single knob to make waves tankier/snappier (currently `1.35`).
- **Enemy warnings:** telegraphs are capped (≤3 concurrent, `update.js` enemy-
  fire block) and drawn compact for non-boss shots (short stub, not a full
  line) in `drawTelegraphs` (render.js). Danger line only shows for a
  descending boxed wall (hidden on static waves).
- **Mega/barrier:** `MEGA_DUR`, `barrierCharges` (state.js)
- **Reinforcement flights:** `G.reinforce` (state.js), `spawnReinforcement`

Persisted in `localStorage`: `pkbrk-settings`, `pkbrk-best`, `pkbrk-dex`,
`pkbrk-dexs`, `pkbrk-music`, `pkbrk-run` (the region checkpoint), `pkbrk-v`
(storage version). ALWAYS go through `loadStore`/`saveStore` (setup.js) —
they survive corrupt values and full/blocked storage; raw
`JSON.parse(localStorage...)` at module scope once bricked startup.

**Region checkpoints:** every non-trial run auto-saves at each region's
first wave (`saveCheckpoint`, state.js, hooked at the end of `buildLevel`);
the title screen grows a CONTINUE button (`RUN_CKPT`), and a true game over
(empty skill tree) clears it. **Draft reroll:** one per upgrade screen
(`rerollDraft`, input.js; `rollUpgradeChoices`, update.js).

**Fonts are local** (`assets/fonts/orbitron.woff2`, variable weight 400-900,
preloaded + kicked via `document.fonts.load` in setup.js — canvas alone
doesn't trigger @font-face). Orbitron is for titles/numbers; body copy uses
`bodyFont()` (render.js) — Verdana/system stack for readability.

**Title screen fits short landscape** (`menuLayout` short/oneRow variants,
config.js): under H=560 every gap compresses and the footer links collapse
to one row. Keep both variants in mind when adding menu items.

---

## Gotchas / hard-won lessons

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

## Assets & licensing

Sprites are vendored in `assets/sprites/` (fetched by
`node tools/fetch-sprites.js` — re-run after adding Pokémon ids to `GENS`;
`sips -Z 256 assets/sprites/*.png` to shrink). `getSprite` loads local-first
with a PokeAPI fallback; shinies stay remote.

**Pokémon names/artwork are Nintendo/Creatures/GAME FREAK property.** This is
a fan project — get a licensing review before any public distribution or
monetization.
