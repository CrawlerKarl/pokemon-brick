# CLAUDE.md — orientation for this repo

Vanilla-JS Canvas game. **Read `README.md` first** — it has the full file map,
system tour, tuning knobs, and gotchas. This file is the workflow + the
invariants you must not regress.

## What it is
Breakout × Space Invaders/Galaga hybrid, journeying through 9 Pokémon regions
(3 stages each: ARRIVAL → CHALLENGE → LEGENDARY). 10 JS modules in `js/`, loaded
in order (later reference earlier) via `<script>` tags in `index.html`. No build
step / deps / framework. `G` (state.js) is the god-object holding all runtime
state.

**Three game modes** (`SETTINGS.mode` / `G.mode`, chosen on the title screen):
- **classic** — ball-first brick-breaker (the original). The ball is THE
  weapon; there is NO free blaster. The blaster is EARNED and gated by
  `blasterArmed()` (state.js) — it arms only with a LASER power-up, Mega, or an
  offense-path draft (VOLLEY/IMPACT). While unarmed, `fireAction` no-ops, the
  touch FIRE pad is hidden, and the shoot hint is suppressed.
- **blaster** — same waves, NO ball; you clear everything by shooting. Charge
  a fat piercing shot with right-click / Shift, or on touch **hold the FIRE
  pad** (a quick tap fires one normal shot; no separate CHARGE pad). Wiring:
  `touchFirePendingId`/`TOUCH_CHARGE_HOLD_MS` (input.js), promoted to
  `chargeHeld` in update.js. Optional AUTO-FIRE pauses during charge intent.
- **junkie** (SPACE JUNKIE) — the pure-shooter homage: no wall at all, every
  wave is tight high flocks of small flyers, and **your starter IS the ship**
  (Pikachu if none), flying vertically and firing its own typed attack.

## Editing
- Everything is `js/*.js`. `index.html` is just the shell — never inline JS.
- After any edit: `node --check js/<file>.js`, then run the invariant suite.
- Storage: ALWAYS go through `loadStore`/`saveStore` (setup.js). They survive
  corrupt/blocked storage; raw `JSON.parse(localStorage…)` at module scope once
  bricked startup permanently.

## Verifying (there is no live human tester)
The preview browser throttles rAF when backgrounded, so you can't watch
real-time physics. **Drive the sim from the JS console:** loop `update(1/60)`,
set `mouseX`/`lastMouseY` to steer, `paused=false; G.freeze=0` to force-run,
read `G.*` to assert. `G.freeze=999` freezes a frame for a screenshot. Note: the
preview pane sometimes lays out at 0×0 — call `resize()` and bail if `!W`.
- **Automated invariants:** open `/test.html` (drives the sim headless, 20
  checks, sets `window.TEST_RESULTS`). Keep it green. Two overlap invariants:
  flyer↔WALL must be a strict **0** (hard geometry); flyer↔FLYER guards against
  BLOBBING (≤6 transient overlap-frames per run — a 1-frame touch between fast
  sprites is not a blob, and chasing a literal 0 across random patterns is a
  losing battle). The flyer tests pick patterns randomly — re-run a couple of
  times before trusting a pass.
- `npm run check` (syntax all modules), `npm run verify-assets` (every roster id
  is named + has a local sprite). Run after roster/data changes.
- Test mobile with `?touch` in the URL. Serve locally: `node serve.js`
  (:8741, or set `PORT=` — the preview harness assigns one via autoPort).

## Deploying (user plays via GitHub Pages)
Commit to `main`, `git push`, then trigger + verify the build:
`gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds`, poll
`.../pages/builds/latest` until `.commit` == HEAD and `.status`=="built".
Live at https://crawlerkarl.github.io/pokemon-brick/. The user tests on a real
phone — flag anything only verifiable there.

## Design invariants (don't regress without being asked)
- **Modes share one wave generator.** `buildLevel` (state.js) branches on
  `G.mode`. When touching fire / serve / the loss condition, keep all three
  working: the shooter modes (`!== 'classic'`) spawn NO ball, skip the
  "0 balls → loseLife" gate (you only die to enemy fire), and fire from
  `shipY()` (junkie) — every "where is the player" check must use `shipY()`,
  not `PADDLE_Y()`.
- **Enemy fire is TYPED and effectiveness-aware.** Each shot carries a `type`
  (firing mon's) and renders in that colour. Vs the player's `playerType()`:
  a resisted normal shot is DEFLECTED (no life lost), super-effective shows a
  red ring. Elite (`maxHp≥3`) shots are HEAVY: splash hitbox, pierce resist,
  extra life if super-effective. Keep this in the `G.enemyShots` hit block
  (update.js); typeless shots (`type` absent) must stay neutral so tests pass.
- **Classic/blaster: blocks are a STATIC wall; flyers NEVER overlap it.**
  `G.blocksStatic` (`!hasBoss`) skips march/descent/sway. `flightGeom`/
  `clampOpen` place patterns so they can't enter the grid rect (square loops
  AROUND it; open patterns stay in the band BELOW). **After any flyer-geometry
  change, re-run the overlap-count assertion (must be 0).** The `test.html`
  suite covers this (flyer↔wall AND flyer↔flyer).
- **Flyers NEVER overlap EACH OTHER either — in every mode.** The separation
  solver (update.js, 8 passes after the flight loop) runs for all modes now; in
  the walled modes it shoves any flyer its pushes nudged INTO the wall rect
  (`G.gridRect`) back out — WITHOUT touching the `square` pattern that loops
  legitimately AROUND the wall (don't reintroduce a "clamp to the below-band"
  here — it crushes `square`). Every squad (wall + stream) draws a UNIQUE band
  slot (`nTotal`, state.js) so two flocks never share a center. **ONE clean
  flock early, more later:** junkie squad count ramps `1 + ⌊regionsIn/2⌋`;
  patterns are curated CLEAN (the `kinds` unlock list front-loads non-self-
  crossing formations — ring/oval/lane/square, then fountain/weave/snake… —
  and defers center-crossing curves to later regions).
- **Junkie: tight, HIGH, non-overlapping flocks.** Small flyers, patterns
  shrunk ~55%, airspace floor high (~42%→56% late) so the low band is the
  ship's. Squads periodically run maneuvers (`G.maneuver`: scatter/surge/raid);
  raids are capped out of the ship band.
- **Junkie waves are AUTHORED encounters, never random overlays.**
  `JUNKIE_CHOREO` (state.js) names one motion FAMILY per region × stage; every
  squad's pattern/anchor/phase/role rides ONE shared clock via `G.encounter`
  (family, act 1–3, actBeat establish/escalate/climax). The controller
  (update.js) runs formation-level morphs (breathe/swapCy/bloom/eclipse/
  orbit/blend) and ONE attack group at a time (two from Galar). Junkie BOSS
  waves never use the legacy guard grid: two mirrored wing arcs tethered to
  the boss (`br.guard`), which compress/reform through teleports (Mewtwo's is
  deferred 0.5s for anticipation), swap sides in phase 2, and counter-rotate
  as boss-centered orbits in phase 3. Reinforcements reuse the wave's theme +
  family (`G.waveThemeObj`). The test suite asserts all of this.
- **Sprite kinematics live in update(), never render.** `updateSpriteKinematics`
  smooths `vvx/vvy/bank/face/animPh` with dt (60 Hz == 120 Hz); facing flips
  only after ~150 ms; gaits come from species `MOTION_PROFILES` (data.js,
  serpentine/heavy/quadruped/biped overrides) with type as fallback. Difficulty rides ONE
  smooth journey curve in `diff()` (smoothstep over the 9 regions: ×0.78
  opening → ~×1.1 middle → ×1.4 finale — replaces the per-act steps); the
  act boundary plays the evolution ceremony (`G.ceremony`, drawCeremony).
  Progress is NEVER wiped: a true game over keeps the region checkpoint
  (CONTINUE always works, saved from region 1 on). The pause screen hides
  an ornate ✦ CHEAT CODES panel (CHEAT_ITEMS, data.js) — using it sets
  `G.cheated` and the run's best score is not recorded.
- **Nothing flies/attacks as a framed brick.** `bareMon(br)` gates this. Bare
  mons (flyers, divers, junkie flyers, bosses) FAINT; boxed bricks card-shatter.
- **Every finale is a three-round GAUNTLET** (`gen.gauntlet`, data.js; the
  controller lives in update.js): sub-legendaries → the legendary (dormant
  until round 2, `br.dormant` parks it off-stage) → the mythical
  (`br.mythic`: 0.6× HP, 0.6× fire interval, generic MYTHIC BLINK ability).
  Sub-legendaries (`br.subBoss`) fire aimed 3-shot fans; evolved elites
  (`br.elite ≥ 2`) fire AIMED heavy bolts; only the unevolved rank-and-file
  keep the classic straight bolt. Junkie separation is EASED (per-rider
  sepX/sepY: fast build, ~0.4s release) so a kill never snaps neighbours;
  riders float in one by one (`flight.entering`, excluded from solver+tests).
- **Bosses are BARE legendaries** (`drawBossMon`, render.js — no card), with
  **three phases** at ⅔/⅓ HP (`br.phase`, set in `damageBrick`): each transition
  fires a shockwave, and phase 3 (last stand) summons a minion ring + faster,
  wider fire. Boss abilities keyed by id in `BOSS_ABILITIES`.
- **Wave ecology.** Each wave draws ONE habitat (`pickWaveTheme` → a curated
  `HABITAT_PACKS` pack or a `TYPE_CLUSTERS` fallback) via `themedPool`, so
  Pokémon that belong together appear together, spanning evolution tiers. Pack
  ids are constrained to their region's roster — `verify-assets` + the test
  suite catch stragglers. Evolved species are bigger + tankier elites.
- **Progression: paths + mastery + checkpoints.** Drafts advance the same
  6-path × 4-tier tree (two distinct offense paths; PRISM owns type-matchup mastery); junkie re-skins tiers as
  Pokémon items (`JUNKIE_ITEMS`). **Every tier must stay live in all three
  modes** — tiers carry an optional `sdesc` (shooter-mode text, `tierDesc`)
  and mode-aware wiring: shields ABSORB a lethal hit on the player in every
  mode (`absorbHit`, update.js — never regress them to floor-line-only),
  Momentum/Rally charge Mega off blaster hits/kills in the shooter modes, and
  upgrades never widen the shooter hurtbox. IMPACT is the heavy/charge path —
  its `demo` tier (SPLASH CHARGE) makes charged shots detonate for AoE
  (`chargeSplash`, update.js). As paths cap, every mode fills empty offers
  with forever-stacking `STACK_ITEMS` (`G.stacks`). One counted badge per
  owned path/stack category orbits the junkie pilot; paddle modes show tiers
  on the build rail. Runs auto-save at each region (`saveCheckpoint`/
  `RUN_CKPT`); a true game over clears it. One draft reroll per screen. The
  draft cards lead with the upgrade name + a big description; **FULL TREE is
  tap-to-inspect** — node rects come from `upgradeTreeLayout`, tap sets
  `treeSel`, `drawTreeDetail` explains it. Keep render + hit-test using the
  same `node(pi,ti)` rects.
- **Readability over density.** The ball/character must never get lost. Caps:
  `flyerBudget` ≤20, junkie squads ≤26, particles ≤450, rings ≤24. The ball's
  glow scales with `clutter`.

## Performance (mobile is the target — keep it smooth)
- **Never allocate gradients or set `shadowBlur` per-entity per-frame in hot
  loops.** Both are the mobile stutter killers (GC churn + GPU stalls). Repeated
  art is baked ONCE into offscreen sprite caches: `shotSprite`, `auraSprite`,
  `glowSprite`, `glintSprite`, `getSilhouette` (render.js). Enemy shots / flyer
  auras / boss aura / card gloss / sparkles all use these. Bake any new
  many-per-frame effect too.
- **Light & depth** are cheap: `drawBloom` (half-res additive re-composite of
  the whole frame — the "modern glow"; play/serve only, respects `reduceFlash`)
  and `drawAtmosphere` (cached per-region wash). Neither allocates per frame.
  Kill/catch/shiny sparkles are `sparkle()` (state.js).
- Boss phase-tint silhouettes pre-warm at wave build so enrage can't hitch.
- `br.flash` decays in `update()` (dt-scaled), NOT render — it gates the pierce
  i-frame, so a per-render-frame decay coupled DPS to refresh rate. Render only
  READS flash. Same rule for any field gameplay reads: mutate it in update.

## Working style the user likes
- Big, ambitious feature swings; commit + push each round when asked.
- Fine to delegate mechanical/analysis work to subagents; reserve top models for
  open-ended design. Verify visual work by screenshot, not just asserts.
- End-user commit messages + `Co-Authored-By: Claude ...` trailer.
