# CLAUDE.md — orientation for this repo

Vanilla-JS Canvas game. **Read `README.md` first** — it has the full file map,
system tour, tuning knobs, and gotchas. This file is the workflow + the
invariants you must not regress.

## What it is
**WAVEBREAKER** — a Breakout × Space Invaders/Galaga hybrid, journeying through
9 Pokémon regions (3 stages each: ARRIVAL → CHALLENGE → LEGENDARY). The brand
is skin-agnostic: `GAME_TITLE` + `SKIN_EDITION` (config.js) split the engine
name from the current theme ("POKÉMON EDITION"), so future modes add cards and
future skins swap strings/art without touching mechanics. 11 JS modules in
`js/`, loaded in order (later reference earlier) via `<script>` tags in
`index.html` (dev.js is dev-only tooling, loaded second-to-last). No build
step / deps / framework. `G` (state.js) is the god-object holding all
runtime state. The campaign roadmap lives in `docs/FULL_GAME_ROADMAP.md`
(+ `docs/IMPLEMENTATION_LOG.md`) — consult it before starting a round.
**Resuming after a break? Start at `docs/NEXT_SESSION_HANDOFF.md`** — it
carries the current status, what to pick up next, the deploy loop, and the
gotchas worth not rediscovering.

**Three game modes** (`SETTINGS.mode` / `G.mode`, chosen on the title screen).
UI labels are presentation-only (BREAKER / BLASTER / STARFIGHTER); the internal
keys below are storage-stable — saves, checkpoints and tests reference them, so
NEVER rename a key:
- **classic** (UI: BREAKER) — ball-first brick-breaker (the original). The ball is THE
  weapon; there is NO free blaster. The blaster is EARNED and gated by
  `blasterArmed()` (state.js) — it arms only with a LASER power-up, Mega, or
  tier 3 of an offense path (VOLLEY/IMPACT). While unarmed, `fireAction` no-ops, the
  touch FIRE pad is hidden, and the shoot hint is suppressed.
- **blaster** (UI: BLASTER) — same waves, NO ball; you clear everything by shooting. Charge
  a fat piercing shot with right-click / Shift, or on touch **hold the FIRE
  pad** (a quick tap fires one normal shot; no separate CHARGE pad). Wiring:
  `touchFirePendingId`/`TOUCH_CHARGE_HOLD_MS` (input.js), promoted to
  `chargeHeld` in update.js. Optional AUTO-FIRE pauses during charge intent.
- **junkie** (UI: STARFIGHTER; internal codename "Space Junkie" throughout
  code + docs) — the pure-shooter homage: no wall at all, every
  wave is tight high flocks of small flyers, and **your starter IS the ship**
  (NO PARTNER uses a neutral vector training drone), flying vertically and
  firing its own typed attack.

**The title screen is a return-player dashboard, not just a mode picker.**
`menuLayout()` reserves a progression strip for journey/checkpoint, Pokédex
research, and dated Daily best/completion/streak state. All three mode cards
sit over `drawMenuAdventureBackdrop` (bright route sky, hills, nine journey
markers, moving clouds/leaves); do not restore the old full-screen dark dimmer.
remain visible, but only the hovered card (or one rotating focus card on
touch/idle) animates; `reduceFlash` freezes them. Setup calls the opt-out
**NO PARTNER**, shows starting HP + pressure on difficulty cards, and pages an
18-type starter roster in three groups of six. The title card puts an actual
partner inside the custom STARFIGHTER flight rig — never a legendary mascot.
Mode cards must lead with their literal recipes: YOU FLY + FIRE, BALL + PADDLE,
or NO BALL + DIRECT FIRE. Each type has a distinct
three-tier ability in `STARTER_MON`, an ICONIC species line (Dratini/dragon,
Machop/fighting, Gastly/ghost, Magnemite/steel…), and its own signature
attack silhouette (`pilotInfo().shape` → `drawTypedBolt`, 14 shapes) that
scales up + gains a flourish at partner tiers II/III (`L.tier`). Pikachu is
an intentionally OP explicit pick that becomes Raichu in region 5. Keep
render and hit-testing on the same layout geometry.

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
- **Dev launches are the fast path to any content** (js/dev.js):
  `?dev&level=14&mode=junkie&diff=normal&seed=S` (or `region=&stage=&round=`,
  `upg=arsenal:3,vshred`) opens a seeded trial run directly; console
  `DEV.launch/boss/grant/report/download`, F9 = live balance dashboard.
  Same seed → identical wave (all sim randomness routes through `gameRand()`;
  keep it that way — NEVER call `gameRand()` inside a sort comparator, and
  keep cosmetic effects on `Math.random()` so they don't desync seeds).
- **Balance stats are part of the game contract now:** the `stats*` helpers
  (state.js) record per-wave-attempt combat ledgers into `G.runStats.levels`
  (damage in by projectile family via `loseLife(cause, shot)`, damage out by
  `meta.source` on `damageBrick`, charge waste at the laser cull, overheat
  downtime, boss phase durations via `br.phaseClockT`). When adding a new
  damage path or weapon, wire it into the ledger (`meta.source`, and pass the
  shot object to `loseLife`) — the test suite asserts the ledger works.
- **`gallery.html`** renders every projectile through the real renderer over
  bright/dark backdrops with honest hitR overlays — check it after any
  projectile art change (readability is a design invariant).
- **Automated invariants:** open `/test.html` (drives the sim headless, 57
  checks, sets `window.TEST_RESULTS`; keep the tab FRONTED — background
  timer throttling makes it crawl). Keep it green. Two overlap invariants:
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
  (firing mon's) and renders in that colour. `SHOT_CLASSES` keeps visual size,
  collision size, interception HP, and threat independent; micro / standard /
  heavy / massive volleys are budgeted by `starThreatCap`. Rank is explicit
  (`attackRank` / `elite`) and NEVER inferred from maximum HP. Vs the player's
  `playerType()`, a resisted normal shot is DEFLECTED; heavy fire pierces the
  resist. Every landed projectile costs exactly ONE life on Adventure — type
  advantage changes feedback, never surprise damage. Boss projectile kinds are
  keyed by species in `BOSS_PROJECTILE_KIND`; typeless legacy shots stay neutral.
- **Thin enemy fire must stay visible without dishonest collision.** Micro shots
  keep an 8px art radius, 3.5px collision core, long dark/bright tracer, and
  render-only multipliers in `ENEMY_SHOT_DRAW_SCALE`. Caterpie-family `stinger`
  and electric `needle` silhouettes must retain their white spine and outline.
  Never grow `hitR` merely to match visibility art.
- **Upgrade-web luminance means installability.** Only nodes in the current
  three-choice draft use a lit badge, white halo, and literal `OPTION N` tag.
  Owned nodes are steady, reachable nodes muted, locked nodes very dim; tapping
  an unavailable node may add the dashed inspection ring but must not brighten
  its fill/icon. Keep all node types routed through `treeNodeVisualState` and
  preserve the strict `TREE_NODE_ALPHA` ordering.
- **Music is original and scene-authored.** `ADVENTURE_MUSIC` contains nine
  exploration identities and nine boss overrides. A regional change must vary
  more than pitch: preserve unique scale/motif/rhythm/voice signatures, and do
  not add ripped recordings or recognisable melodies from commercial games.
- **Classic is brick-only; Blaster may mix a STATIC wall with flyers.** Classic
  must never create free flyers, dives, or attack reinforcements. Where Blaster
  has both populations, flyers NEVER overlap the wall.
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
- **The ENCOUNTER DIRECTOR owns stage pacing (M3).** Every junkie non-boss
  stage runs an authored beat script: `REGION_GRAMMAR`/`encounterScript`
  (data.js) → `G.director` (buildLevel) → `updateDirector`/`runBeat`
  (update.js). A beat fires ONCE at a `p` (alive/baseline progress) or
  `afterPrev` (seconds after the previous beat) trigger, in list order.
  Beat actions reuse existing machinery only — bonusFlock / raid / surge /
  recovery / finalPush. **Regions must read differently by GRAMMAR, not by
  bigger numbers.** `G.director.threatMul` (× `starThreatCap` via
  `directorThreatMul()`) is the one knob for *simultaneous* threat —
  recovery eases it, surge/finalPush raise it; never stack blind danger.
- **Objective families may change the WIN CONDITION (M3).** `G.objective`
  (`ENCOUNTER_OBJECTIVES`, data.js) + `updateObjective` (update.js) +
  `drawObjectiveBanner` (render.js — an objective must always be readable
  from a UI cue, not just an announce card). SURVIVE holds the wave open
  via a clear guard, keeps the swarm dense with reinforcements, and on
  completion DISPERSES survivors into fleeing crossers and zeroes
  `G.reinforce` so outlasting ends the stage instead of spawning a grind
  wave.
- **`br.crosser` entities live OUTSIDE every formation system.** Bonus
  flocks and dispersing swarms have no flight slot: excluded from the
  separation solver, the overlap invariants, the shooter pool, the
  `blocksStatic` position snap, the dramatic slow-mo, AND the level-clear
  condition. Never let a crosser hold a wave hostage.
- **Charge has a full timing arc (M2).** `RESONANCE_WINDOW` (0.38s after
  the charge tops out) → resonant release (+25% power, +1 pierce, ×0.7
  heat). Past ~1.4s the barrel OVERCHARGES (heat outpaces cooling). The
  FIRE pad must always name the current point in that arc (% → RESONANT!
  → RELEASE! → OVERCHARGE). **Heat fairness is a tested invariant:**
  sustained spam overheats in the 5–10s band on Normal (7.6s today) and a
  fire-rate upgrade may only ever make that band KINDER.
- **Boss desperation channels are data-driven (M4).** `BOSS_CHANNELS`
  (data.js) keys the low-HP channel per species; `spawnChannelPunish`
  (update.js) dispatches the punish pattern (`columns`/`sweep`/`clock`) —
  all patterns ride `G.columnStrikes`, the single lane-danger primitive.
  The charged interrupt, 1.5s ×1.35 stagger, and cd 9 are UNIFORM template
  constants — never tune them per boss. Every finale legendary kit needs a
  phase-1 normal-fire answer (Mewtwo focus orbs / Lugia STORM FEATHERS /
  Dialga CHRONO GEARS — all 2-HP intercept shots on the deferred-shot
  lifecycle, orphan-fizzling, never flyers) + a channel. Lugia's TAILWIND
  (`G.gustDir`) drifts bolts/micros in shooter modes only and NEVER moves
  the pilot; Dialga's TIME DILATION (`enemyShotTimeScale()`, deterministic
  `G.timeWarpClock` square wave) scales displacement at integration time
  only — never mutate a shot's stored vx/vy.
- **Armor and veil are a matched pair.** SHELL ARMOR rewards the charged
  shot; **SPECTRAL VEIL** (`br.specVeil`/`specVeilActive`, region 3+, ≤2
  spirit flyers) punishes charge-spraying — charged bolts phase THROUGH
  the shimmer (no damage, no pierce spent) while basic fire always lands.
  Keep both alive so neither weapon dominates a mixed wave.
- **Every stage clear passes through RESULTS (M1).** `G.state ===
  'results'` sits between the wave clear and the draft: ledger readout +
  mastery objectives + medals, ONE tap to continue (`advanceResults`,
  input.js — mouse, touch, Space, Enter, Esc; a 0.45s dwell gate stops the
  killing blow from skipping it). A pending act ceremony chains AFTER
  results, then the draft. Tests that expect the draft right after a clear
  must step through it (`skipResults()` in test.html). Medals persist in
  `pkbrk-medals` for REAL journeys only — trials/dailies/cheated runs
  evaluate and display but never save.
- **Sprite kinematics live in update(), never render.** `updateSpriteKinematics`
  smooths `vvx/vvy/bank/face/animPh` with dt (60 Hz == 120 Hz); facing flips
  only after ~150 ms; gaits come from species `MOTION_PROFILES` (data.js,
  serpentine/heavy/quadruped/biped overrides) with type as fallback. Difficulty rides ONE
  smooth journey curve in `diff()` (smoothstep over the 9 regions: ×0.78
  opening → ~×1.1 middle → ×1.4 finale — replaces the per-act steps); the
  act boundary plays the evolution ceremony (`G.ceremony`, drawCeremony).
  **Clearing stage 27 on a real run ends the campaign**: `beginEnding()`
  (state.js) → `G.state = 'ending'` (THE NINEFOLD DAWN, drawEnding) — it must
  NEVER silently roll into level 28. The completion record (`pkbrk-victory`)
  is written before the sequence plays and the checkpoint survives; the old
  28+ loop lives on only as the explicit TIME SPIRAL choice
  (`beginTimeSpiral`). Trials/dailies keep the classic loop.
  Progress is NEVER wiped by knockout or game over: the latest region checkpoint
  remains available through CONTINUE. The pause screen hides
  an ornate ✦ CHEAT CODES panel (CHEAT_ITEMS, data.js) — using it sets
  `G.cheated` and the run's best score is not recorded.
- **Nothing flies/attacks as a framed brick.** `bareMon(br)` gates this. Bare
  mons (flyers, divers, junkie flyers, bosses) FAINT; boxed bricks card-shatter.
- **Every finale is a three-round GAUNTLET** (`gen.gauntlet`, data.js; the
  controller lives in update.js): sub-legendaries → the legendary (dormant
  until round 2, `br.dormant` parks it off-stage) → the mythical
  (`br.mythic`: 0.82× legendary HP in STARFIGHTER, legacy 0.6× elsewhere,
  with species-specific movement, fire, and signature ability).
  Sub-legendaries (`br.subBoss`) fire aimed 3-shot fans; evolved elites
  (`br.elite ≥ 2`) fire AIMED heavy bolts; only the unevolved rank-and-file
  keep the classic straight bolt. Junkie separation is EASED (per-rider
  sepX/sepY: fast build, ~0.4s release) so a kill never snaps neighbours;
  riders float in one by one (`flight.entering`, excluded from solver+tests).
- **Boss presentation is mode-specific.** BREAKER finales use oversized,
  moving **boss bricks** (`drawBossBrick`) and brick guards; BLASTER and
  STARFIGHTER use bare legendaries (`drawBossMon`). All share **three phases**
  at ⅔/⅓ HP (`br.phase`, set in `damageBrick`): each transition
  fires a shockwave with one readable escape spoke, applies a 0.78s damage gate,
  and phase 3 (last stand) summons a minion ring + faster, wider fire. Boss
  abilities keyed by id in `BOSS_ABILITIES`; regular volleys are also authored
  per species by `spawnBossFire`.
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
  owned path/stack category docks as a fixed wing HARDPOINT chip under the
  junkie pilot (stable slots, never crossing the sprite); paddle modes show tiers
  on the build rail. Runs auto-save at each region (`saveCheckpoint`/
  `RUN_CKPT`); knockout and true game over retain the latest checkpoint. One draft reroll per screen. The
  draft cards lead with the upgrade name + a big description; **FULL TREE is
  tap-to-inspect** — node rects come from `upgradeTreeLayout`, tap sets
  `treeSel`, `drawTreeDetail` explains it. Keep render + hit-test using the
  same `node(pi,ti)` rects.
- **The upgrade WEB is additive and graph-safe.** The 24 tiers are anchor
  nodes with unchanged keys; `WEB_BRIDGES`/`WEB_FUSIONS`/`WEB_APEXES`/
  `WEB_SATELLITES` (data.js; design: FUSION_APEX_PLAN.md) add 26 more —
  all additive `G.upg` keys (satellites reuse the stable `G.stacks` keys).
  Gates read REAL state: `webForm()` = `G.starterLvl` (NO PARTNER's drone
  and Pikachu's region-5 Raichu included). A bridge needs Form II + one
  owned node each side. A FUSION (15 — every path pair exactly once; the
  six former superskills kept their keys) needs Final Form + 3 ranks in
  BOTH paths + a capstone in EITHER + the bridge (adjacent pairs) + a free
  slot — **MAX 2 FUSIONS PER RUN**. An APEX (warmachine/celestial) needs
  stage 24+, two compatible installed Fusions, nine ranks across its three
  paths — **MAX 1 PER RUN**. These slot caps are the balance spine — never
  lift them. Knockout burns only `webRegressibleLeaves()`, which SIMULATES
  each removal against `webBuildLegal()` — a burn can never break a recipe
  (grandfathered-illegal saves burn freely). Checkpoints are schema v3:
  `migrateCheckpoint` (state.js) accepts v1/v2 forever, NEVER throws, and
  grandfathers unknown-prereq nodes. `rollUpgradeChoices` deals Commit/
  Adapt/Explore (apex > fusion > bridge priority, ONE fusion/apex per hand,
  post-evolution guarantee, reroll anti-repeat, pity, low-health rescue,
  offense/non-offense guard); satellites only fill EMPTY slots. Proc
  hygiene: primed lanes/echoes/reflections never feed hit meters, meteors
  can't call meteors, fusion area damage passes `meta.noMega`. Classic
  stays ball-first (charge-released fusions fire on Mega activation there;
  wingmates intercept-only) and every mechanic reads `upgN(key)` at use
  time so removal shuts it down cleanly. The map addresses all 50 nodes
  (`node`/`bridgeNode`/`fusionNode`/`apexNode`/`satNode` — render and
  hit-testing share the rects); locked fusions stay compact silhouettes
  until 2 ranks in both paths, connectors draw ONLY for owned/offered/
  selected fusions, and the detail panel states exact lock reasons.
- **The upgrade web owns a real camera.** `treeZoom` starts at 1.15 desktop /
  1.30 touch and clamps to 0.65–1.85. Drag anywhere on the map to pan; wheel or
  two-finger pinch zooms around the pointer/midpoint. The − / + / FIT / FOCUS
  controls are part of the shared `upgradeTreeLayout`, so rendering and hit
  testing must remain camera-consistent.
- **Readability over density.** The ball/character must never get lost. Caps:
  `flyerBudget` ≤20, junkie squads ≤26, particles ≤450, rings ≤24. The ball's
  glow scales with `clutter`.
- **HUD information has fixed ownership.** Player health is one segmented
  `HP current/max` component plus the temporary on-hit bar—do not redraw the
  old separate life ring. Element copy distinguishes permanent PARTNER/PILOT
  types from timed POWER-UP/ITEM overrides. Mega always exposes percentage or
  remaining duration. Classic's region rule and type-matchup combat feedback
  live in dedicated backed rails, not over bricks. Brick corners are behavior
  top-right, type bottom-right, and damaged HP top-left. First-wave coaching is
  sequential (`G.coachStep`): aim during serve, high-ground goal after launch;
  STARFIGHTER has its own five-step first-install coach (`G.jCoach`,
  progression in update.js, pill in render.js, once-ever via `pkbrk-jcoach`).
  During live combat (`G.state === 'play'`) only `hero` announcements may use
  the centre card, and ONLY when a fire-free window covers them: boss-round
  reveals (entrances pause fire) and REGION INTRO cards (arrival waves grant
  a 3.4s junkie first-volley grace, state.js — keep card duration ≤ grace).
  Everything else renders as the compact top strip (`drawAnnounceStrip`), so
  no banner ever covers the pilot's lane under fire.
  The FIRE pad must always NAME its state (TAP FIRE / AUTO ON / charge % /
  RELEASE! / HEAT HIGH / COOLING Ns) — never a bare unexplained label. All
  four safe-area insets (`SAFE_T/L/R/B`, setup.js) shift the HUD bar and
  corner controls; keep new top/edge-anchored UI behind them.

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
