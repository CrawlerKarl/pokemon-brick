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

## The core systems (where to look, what they do)

### Motion — the brick-breaker → Space Junkie arc
This is the heart and the most-iterated system. Assigned per-wave in
`buildLevel` (state.js ~line 250–314), executed in `update.js` (~line 425–540).

- **`G.motionStyle`** — the whole formation's shared motion, rolled from a
  region-gated pool: `march` (Galaxian sweep, only Kanto), `serpent`,
  `colwave`, `split`. Everything rides on a **march**: broad side-to-side
  sweeps that only step DOWN at walls (capped speed, gentle descent).
- **`br.flight`** — individual Pokémon that **break out of their boxes** and
  fly. `buildLevel` marks a fraction of non-armored bricks (0% Kanto → ~18%
  Johto → ~40% mid → 100% Paldea) with a `flight` object. They start
  `state:0` (boxed), peel out one by one at `swayT >= launch` (`state:1`,
  gliding onto the curve), then `state:2` (cycling). `flying(br)` gates them
  out of march/rally/danger-line logic.
- **`flightPos(F, tAbs)`** (update.js ~172) — the **12-pattern library**:
  `ring, inf, falls, liss, rose, diamond, pulsar, helix, pend, epi, snake`,
  plus `olympic` (interlocking rings). Flyers ride nose-to-tail via `phase`;
  big hordes split into counter-rotating layers.
- **`br.dive`** — Galaga peel-offs: a flyer/brick swoops at the paddle,
  fires one aimed shot at the bottom, loops home. Up to 3 concurrent
  late-game. Rendered as bare sprite; excluded from formation logic.
- **Rendered:** boxed bricks are cards (render.js `drawBricks`); flyers are
  bare sprites with a type-colored aura (render.js, the `if (br.flight ...)`
  block near the top of the per-brick loop).

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

### White-out (not game-over) — `loseLife()` update.js ~330
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
- **Columns/rows/hp per region:** `buildLevel` in state.js (`cols` capped 18 w/
  ~52px floor; late-game +hp at regions 5/8)
- **Flight breakout fraction & pattern unlocks:** `buildLevel` state.js ~250–305
- **Cycle speed:** `G.pathSpeed` (state.js), march speed cap (update.js ~486)
- **Mega/heat/barrier:** `MEGA_DUR`, `OVERHEAT_DUR`, heat-per-shot (input.js
  `fireAction`), `barrierCharges` (state.js)
- **Reinforcement flights:** `G.reinforce` (state.js), `spawnReinforcement`

Persisted in `localStorage`: `pkbrk-settings`, `pkbrk-best`, `pkbrk-dex`,
`pkbrk-dexs`, `pkbrk-music`.

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

---

## Assets & licensing

Sprites are vendored in `assets/sprites/` (fetched by
`node tools/fetch-sprites.js` — re-run after adding Pokémon ids to `GENS`;
`sips -Z 256 assets/sprites/*.png` to shrink). `getSprite` loads local-first
with a PokeAPI fallback; shinies stay remote.

**Pokémon names/artwork are Nintendo/Creatures/GAME FREAK property.** This is
a fan project — get a licensing review before any public distribution or
monetization.
