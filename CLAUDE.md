# CLAUDE.md — orientation for this repo

Vanilla-JS Canvas game. **Read `README.md` first** — it has the full file map,
system tour, tuning knobs, and gotchas. This file is the workflow + the
invariants you must not regress.

## What it is
**WAVEBREAKER** — a Breakout × Space Invaders/Galaga hybrid, journeying through
9 regions (3 stages each: ARRIVAL → CHALLENGE → LEGENDARY). The brand is
skin-agnostic and now carries **TWO full skins behind a runtime toggle**
(the title-screen edition pill): **POKÉMON EDITION** (PNG sprites, legacy
bare storage keys) and **AETHERFALL EDITION** (an original sci-fi × fantasy
universe, 100% procedural art, namespaced storage). `js/skin.js` owns the
`SKINS` registry + `SKIN` (resolved at boot: `?skin=` → `SETTINGS.skin` →
pokemon); presentation/world tables ride `SKIN.*`, the engine (type keys,
effectiveness, modes, paths, web) is shared. 16 JS modules in `js/`, loaded
in order (later reference earlier) via `<script>` tags in `index.html`
(skin.js sits between config and audio; **data.js is ENGINE-ONLY since
2026-07-21 — the pokemon world lives in js/pokeworld.js, loaded right after
it** and replaced by a stub in the AETHERFALL distribution; aetherfall.js +
aetherart.js after pokeworld; dev.js is dev-only tooling, loaded
second-to-last). Shared balance numbers for the 18 partner lines live in
engine `STARTER_KIT`; both skins' rosters build from it. No build
step / deps / framework for the GAME itself; `npm run build-dist`
(tools/build-aetherfall-dist.js) assembles the pokemon-free **AETHERFALL
standalone distribution** into `dist-aetherfall/` (gitignored) — see the
release section at the bottom of this file. `G` (state.js) is the god-object holding all
runtime state. The campaign roadmap lives in `docs/FULL_GAME_ROADMAP.md`
(+ `docs/IMPLEMENTATION_LOG.md`) — consult it before starting a round.
**Resuming after a break? Start at `docs/NEXT_SESSION_HANDOFF.md`** — it
carries the current status, what to pick up next, the deploy loop, and the
gotchas worth not rediscovering.

**Three game modes** (`SETTINGS.mode` / `G.mode`, chosen on the title screen).
UI labels are presentation-only (BREAKER / BLASTER / STARFIGHTER); the internal
keys below are storage-stable — saves, checkpoints and tests reference them, so
NEVER rename a key:
- **classic** (UI: BREAKER) — a **calm, pure brick-breaker** (redesigned
  2026-07-20 per the owner: "a fun, challenging, calm game without enemy fire
  coming at you"). The ball is the ONLY weapon and the paddle carries NO gun:
  `blasterArmed()` (state.js) returns **false in classic, always** — no LASER
  auto-fire, no Mega guns, no earned blaster, no charge arc (the touch FIRE pad
  is hidden and `fireAction`/`fireCharge` no-op). **No enemy ever fires in
  classic** either: the enemy-fire director skips boss abilities, boss volleys,
  and wave fire, `spawnEnemyShot` is a hard no-op (this also neutralizes the
  phase-transition shockwave, which routes through it), and any beam column is
  cleared. **The only way to lose a life is dropping the ball.** Bosses still
  patrol (anchor-style bosses get a calm phase-1 drift since their abilities are
  off), change phase (visual shockwave only), and summon orbiting guard bricks —
  you break them with the ball. Mega is now purely a **ball overdrive** (the
  ball already pierces + deals 3–4.2× while `megaT>0`). The two OFFENSE paths are
  reskinned to ball power in classic so no draft pick is dead: VOLLEY's TWIN ORB
  (`twin`) serves a 2nd ball on launch and WIDE ARRAY (`hyper`) widens the
  paddle; IMPACT's POWER/SHATTER CORE (`pulse`/`impactX`) each add +30% ball
  damage. A dropped LASER pickup remaps to MULTIBALL (`modePower`). The shooter
  modes keep these SAME tiers as real guns via each tier's `sdesc`/`role`/
  `summary` (unchanged). Suite: 'classic calm' + 'classic offense reskin'.
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

**The title screen is THE THREE DOORS (overhauled 2026-07-20): simple,
obvious, calm.** `menuLayout()` lays out three EQUAL game cards (columns
on wide screens, stacked diorama-beside-text rows when `narrow && W<H`) —
each is its live gameplay diorama (`drawHomePreview`), the mode name, ONE
recipe line (YOU FLY + FIRE / BALL + PADDLE / NO BALL + DIRECT FIRE), and
ONE play affordance. **Tapping a card selects that game AND opens partner
selection in one step** (`drawHomeGameCard` render + the card loop in
input.js). Do NOT restore the old single-hero + copy-column + start-button
+ mode-rail + progression-bands layout — one idea per surface. The daily
chip rides the Breaker card's diorama corner (input tests it BEFORE the
cards); CONTINUE is a slim band under the header only when a checkpoint
exists and OUTRANKS the skin pill in tap order; journey/research is one
quiet desktop footer line. The edition pill (`skinPillRect`) toggles skins
and must stay clamped above the content zone on short viewports.
**The partner screen is one DETAIL HERO + three labeled shelves.** All the
reading lives in a single hero card (sprite, name, ability + type, effect,
evolution line); the 18 partners are small identity tiles (sprite + name
only) on three shelves named by `SKIN.rosterGroups` (THE CLASSICS / WILD &
FIERCE / MYSTICS & TITANS on pokemon; the MAGIC/TECH/MAGITECH disciplines
on aetherfall). Keep the opt-out **NO PARTNER** as a quiet ghost chip; keep
difficulty cards showing starting HP + pressure. Each type has a distinct
three-tier ability in `STARTER_MON`, an ICONIC species line (Dratini/dragon,
Machop/fighting, Gastly/ghost, Magnemite/steel…), and its own signature
attack silhouette (`pilotInfo().shape` → `drawTypedBolt`, 14 shapes) that
scales up at partner tiers II/III. Pikachu is an intentionally OP explicit
pick that becomes Raichu in region 5. Render and hit-testing ALWAYS share
the same layout geometry (`menuLayout`/`setupLayout`); the viewport-fit
suite test guards every rect across six sizes.

## Editing
- Everything is `js/*.js`. `index.html` is just the shell — never inline JS.
- After any edit: `node --check js/<file>.js`, then run the invariant suite.
- Storage: ALWAYS go through `loadStore`/`saveStore` (setup.js). They survive
  corrupt/blocked storage; raw `JSON.parse(localStorage…)` at module scope once
  bricked startup permanently.

## Verifying (there is no live human tester)
**`npm test` IS the release gate (AFT-005A/B, 2026-07-22): ~28–31s, fully
headless.** It runs, in order: syntax check → asset verification → the full
invariant suite (test.html driven by system Chrome over raw CDP — no deps,
Node 21+) → both-skin boot smoke → the runtime SURGE-vocabulary scan →
`build-dist` requiring RESIDUE: none → a dist boot smoke → 15 mobile scenes
at two phone viewports with FITTED-LABEL CONTAINMENT ASSERTIONS (30
screenshots → `.gate-shots/`) → the WAVE and BOSS artifact-storm benchmarks
(ms/frame plus machine-portable per-frame gradient/blur budgets, recorded in
`.gate-report.json` every run). `--fast` skips the
dist/scene/storm steps (~15s); `--suite` runs the invariants alone (~12–18s). Any
uncaught page error fails it. Run the gate before every commit — the old
"keep the tab FRONTED for 20 minutes" constraint is dead (headless Chrome
runs the suite at CPU speed; the fronted tab remains for interactive
debugging only). Modal boss reveals stay DORMANT under the suite
(`window.__SUITE`); tests that need one set `window.__SUITE_REVEALS`.

For interactive debugging, the preview browser throttles rAF when
backgrounded, so you can't watch real-time physics. **Drive the sim from the
JS console:** loop `update(1/60)`,
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
- **Automated invariants:** `npm test` (preferred) or open `/test.html`
  fronted (slow — legacy path). 86 checks; `window.TEST_RESULTS` at
  completion. Keep it green. Two overlap invariants:
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
- **Skins are labels/art over one engine — internal keys NEVER change.**
  Type keys, mode/preset keys, path/stack/web keys, scene keys,
  BOSS_CHANNELS `.pattern/.params`, BOSS_STYLE strings: engine, shared.
  A skin owns names/strings/rosters/boss identities/art via `SKIN.*`
  (assembled at pokeworld.js's tail; aetherfall.js replaces its tables).
  `data.js` is ENGINE-ONLY — shared tables, `STARTER_KIT` balance numbers,
  and the lexicon helpers. Never put world/roster data back into it.
  The pokemon skin must stay BIT-IDENTICAL (the suite is the guard) and
  keeps LEGACY bare storage keys; per-skin state goes through
  `storeKey()` (never call it for settings/music/v — those are global).
  Checkpoints are schema v4 (`skin` + `affinity`); v1–v3 accepted
  forever; a checkpoint stamped by another skin is treated as absent.
  Easter eggs gate on `SKIN.id === 'pokemon'` with rand draws kept even
  across skins. AETHERFALL ships ZERO image assets: `SKIN.spriteMaker`
  (aetherart.js) bakes deterministic canvases (seeded per line id —
  NEVER gameRand) with `.complete/.naturalWidth` set; it must never
  touch the network. Boss kits there are same-slot clones of the
  pokemon kits — mechanics identical, ids/names/strings original.
  The LIGHT/DARK affinity swaps ONLY which satellite trio fills empty
  draft offers (`activeSatellites()`); web topology and the MAX-2-FUSION
  / MAX-1-APEX caps are untouched. The edition pill on the home screen
  is the toggle (render writes `skinPillRect`, input reads it).
- **No shared UI may hardcode a type WORD.** Type keys stay engine keys, but
  every player-facing rendering goes through `typeLabel(t)` and `typeWord()`
  (data.js) so a skin can rename the whole lexicon — AETHERFALL's 18 ASPECTS
  (EMBER/TIDE/GROVE/STORM…) come from `SKIN.typeNames`, and the category noun
  from `SKIN.strings.typeWord`. Same rule for the partner noun
  (`SKIN.strings.partnerWord`) and the orb/attunement noun. Dropped items are
  skin-styled too: `SKIN.relicDrops` swaps the pickup art to relic plates +
  binding sigils (`drawRelicPlate`/`drawBindingSigil`) so no Pokémon-shaped
  symbol reaches an AETHERFALL screen. **A player-facing string that only
  reads right in one skin is a bug.**
- **A skin may reskin whole PHRASES of shared copy via `SKIN.lexicon` +
  `lex(s)` (data.js).** The overdrive is MEGA in engine copy but AETHER SURGE /
  SURGE to an AETHERFALL player. `SKIN.lexicon` is an ORDERED `[regex,
  replacement]` list (order matters — authored phrases before the bare word);
  `applyLexicon(roots)` rewrites the shared copy tables (PATHS/STARTER_KIT/
  STACK_ITEMS/webs/CHEAT_ITEMS/MODES) ONCE at boot, walking only COPY keys
  (`name/desc/sdesc/summary/role/visual/ready/limit/label/tell`), never engine
  identifiers (`key/icon/family`). Dynamic strings not in a table wrap `lex()`
  at their render site. **Two traps that make this a phrase table, not a
  `replace()`:** (1) CHARGE is the HELD WEAPON SHOT — a different system — so
  only a rule that ALSO matches MEGA may touch it; (2) every rule is
  `\b`-anchored so OMEGA SERAPH and Meganium survive. No lexicon → identity,
  which IS the pokemon presentation (bit-identity preserved; the suite's
  `skin S7` test is the guard, and it runs `applyLexicon` only on a CLONE so
  the shared tables stay pristine MEGA under the pokemon skin). The AETHERFALL
  tempo PATH is renamed `CRESCENDO` (its engine key stays `surge`) so "EVERY
  SURGE RANK ADDS +10% SURGE DAMAGE" isn't circular.
- **The LIGHT/DARK oath is an EVOLUTION ARC, not a costume.** Affinity
  treatment scales with the vessel's FORM (`vesselForm()` → grade), so Form I
  is a restrained mark and Form III is unmistakable — never apply the full
  radiant casting at selection. On the **vessel-select screen the hull is
  always NEUTRAL** (`drawAffinityVessel(..., neutral)`): a returning player
  with a saved affinity must not see the oath on a hull they have not yet
  chosen. The oath appears only once sworn. LIGHT/DARK changes the treatment,
  never which vessel the player picked — class/family recognition survives at
  every affinity.
- **Tint a sprite with `source-atop`, NEVER `'lighter'`.** `lighter` paints
  transparent pixels too, so an affinity wash lights the sprite's whole
  bounding box as a glowing square. (Cost a real bug; the fix is one line.)
- **The announce queue is kinded and prioritized (AFT-004).** Every card
  carries a `kind` (boss 5 > trial 4 > objective 3 > region 2 > info 1);
  'boss' and 'trial' are SINGLETONS (freshest replaces). Launch hygiene goes
  through `clearAnnouncements(keepKinds)` — a gauntlet round jump keeps only
  the trial notice. `drawAnnounce` yields while paused and while a reveal
  runs. Never bypass `setAnnounce` to place a card.
- **Boss rounds open on the REVEAL SCENE (AFT-002).** `beginBossReveal` from
  the shared build/wake/summon paths — one contract for sentinels (trio),
  legendary, mythic, secret. Combat is frozen (update() gates on `G.reveal`),
  the 512px portrait (`AETHERFALL_ART_REVEAL`; the skin's own sprite
  elsewhere) is never obstructed, the info panel lives BELOW the art, tap
  skips the hold but hostile sim resumes only after the fly + HUD-lane dock,
  with `enemyShotCD ≥ 1.2` grace. A docked boss (`G.revealDock`) reads from
  the HUD lane and carries NO floating nameplate. Reveals are DORMANT under
  the suite (`window.__SUITE`) — the AFT-002 test opts in; keep it that way
  or 50+ boss-timing tests shift.
- **Text containment goes through `fitLabel` (AFT-001).** Shrink to a
  readable floor, then ELLIPSIZE — never rely on fillText's maxWidth squish
  alone; world-anchored labels clamp on-screen. Zones come from `uiZones()`;
  `?zones` draws the dev overlay; the gate's mobile scenes ASSERT every
  fitted label inside the viewport. Secondary copy collapses before primary
  shrinks (objective readout first; the modifier chip yields to a live
  objective banner). The three top banners add SAFE_T themselves (they draw
  outside drawHUD's translate).
- **The oath rides `OATH_CH` channels (AFT-017), not one alpha.** tint / rim
  / aura / fitting scale / fitting opacity / radiant blend / rune count each
  have a per-form curve; LIGHT's radiant SOURCE is earned (base → 45% blend →
  full at Form III); the ceremony RESOLVES the oath onto the new hull.
  Reduced-effects stills pulses but keeps material progression. All washes
  source-atop.
- **Saves ride the versioned bundle (AFT-006).** `exportBundle` /
  `validateBundle` / `applyBundle` (state.js): imports never write an unknown
  key, never accept a checkpoint that fails `migrateCheckpoint`, always
  snapshot `storeKey('preimport')` first; every region checkpoint refreshes
  `storeKey('autosave')`. `STORAGE_HEALTH` (setup.js) is surfaced truth —
  blocked storage announces RUNNING UNSAVED once. Note `migrateCheckpoint`
  rejects lvl<4 BY DESIGN (checkpoints only exist from region boundaries).
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
- **CLASSIC takes no enemy fire at all (2026-07-20 calm redesign).** The
  paddle is never shot at — the whole enemy-fire director is skipped in classic
  and `spawnEnemyShot` no-ops (see the classic-mode bullet up top for the full
  list of guards). So the deflector-core / wing-armor system, the 8-shot wave
  ceiling, and `absorbHit`-vs-fire are all DORMANT in classic (the code remains
  for the shooter modes; `classicCoreHalf()` still exists but nothing reaches
  it). If you ever reintroduce a classic threat, it must be OPT-IN and loud —
  the owner's rule is "calm, no fire coming at you." Suite: 'classic calm'
  proves zero director fire + zero gun over a long window incl. a boss.
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
- **`br.friendly` (M3 protect objectives) = crosser exclusions PLUS two
  rules:** player fire passes through (laser loop `continue` + a
  damageBrick guard — no damage, no pierce spent, no lastHit, ever) and
  enemy shots CAN hit it (3 `fhp` heart pips, shot consumed; the
  collision runs only while a live friendly exists). Enemy targeting is
  a REDIRECT of every 2nd aimed micro volley — never additional shots
  (threat budget untouched) and never heavies (interception stays the
  counterplay, dodging stays the player's). A fainted friendly sets
  `O.failed` — the clear guard ignores done OR failed objectives, so a
  failed protect wave reverts to a normal attrition clear. Friendlies
  render with the ally-pink ring + heart pips and must never enter
  formation/solver/overlap systems.
- **Charge has a full timing arc (M2).** `RESONANCE_WINDOW` (0.38s after
  the charge tops out) → resonant release (+25% power, +1 pierce, ×0.7
  heat). Past ~1.4s the barrel OVERCHARGES (heat outpaces cooling). The
  FIRE pad must always name the current point in that arc (% → RESONANT!
  → RELEASE! → OVERCHARGE). **Heat fairness is a tested invariant:**
  sustained spam overheats in the 5–10s band on Normal (7.6s today) and a
  fire-rate upgrade may only ever make that band KINDER.
- **Boss desperation channels are data-driven (M4) — all NINE finale
  legendaries AND all NINE mythicals carry the template.** The
  channel-open gate keys on a `BOSS_CHANNELS` entry + `!boss.secretBoss`
  ONLY — Mew VMAX shares `poke.id` 151 with Mew, so the `!secretBoss`
  clause is load-bearing (tested; never re-add a `!mythic` gate, never
  drop `!secretBoss`). Mythic signatures are sibling REUSES with params
  (`s.orbit.launchType:'column'`, `s.feather.home`/`swayAmp`,
  `s.gear.dripEvery`, `boss.sweep.image*`) — defaults keep every
  legendary bit-identical. A mythic must never clone its own gauntlet's
  legendary mechanic (cross-gauntlet reuse only). `BOSS_CHANNELS` (data.js) keys the
  low-HP channel per species with optional `params {count,w,gap,warnMul,
  bounce,color}`; `spawnChannelPunish` (update.js) dispatches the punish
  (`columns`/`sweep`/`clock`/`rain`/`pincer`) — all patterns ride
  `G.columnStrikes`, the single lane-danger primitive. The charged
  interrupt, 1.5s ×1.35 stagger, and cd 9 are UNIFORM template constants —
  never tune them per boss. Channel-open clears `boss.phaseT` for every
  boss: a desperation must never be uninterruptible. Every kit pairs a
  phase-1 NORMAL-FIRE answer with the charge-answer channel; the answers
  are 2-HP intercept shots on the deferred-shot lifecycle (siblings
  orbit/feather/gear/conduit/wisp/mote + ghosted stationary launchers),
  orphan-fizzling, never flyers. Species hooks that must not regress:
  Lugia TAILWIND (`G.gustDir` drifts bolts/micros in shooter modes only,
  NEVER moves the pilot); Dialga TIME DILATION (`enemyShotTimeScale()` on
  the deterministic `G.timeWarpClock` square wave — scale displacement at
  integration time, never mutate stored vx/vy); Zekrom conduits and
  Eternatus cysts BUFF the boss's own fire while alive (BOLT STRIKE +1
  column per conduit; toxic rain 7→9); Yveltal wisps HEAL by direct hp
  mutation (never damageBrick — ledger stays clean) clamped at the
  current phase's entry threshold; Lunala motes exist only during
  PHANTOM PHASE and 2 kills snap it; Koraidon afterimages ride
  `boss.sweep` drops (`imageDrops` rider — distinct from Rayquaza's
  instant-micro `wake` rider; the two must never be conflated).
  SENTINELS (round 1) run the GUARD/OPENING rhythm (M4 Round D): ×0.55
  damage behind a hex-ring tell, and the sentinel that just fired its
  typed special is OPEN for 2.4s (full damage, first hit ×1.2) — the
  scale lives in damageBrick gated STRICTLY on `subBoss`; `openT`
  mutates in update only. All 27 entrance styles have bespoke motifs in
  `drawGauntletEntranceFx` (strokes only — no gradients/shadowBlur).
  Practice: `jumpToGauntletRound(round, phase)` lands mid-band HP; the
  trial PHASE row and hit-testing share `trialLayout` rects. Music:
  `bossMusicHeat()` (audio.js, 0/1/2) is the ONLY phase→music bridge —
  keep it pure and keep `buildMusicPattern` phase-agnostic.
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
  Pokémon items (`JUNKIE_ITEMS`). **The old BOND utility spoke is the
  ORBITAL RELIC returning-glaive WEAPON since AFT-007 (2026-07-23)** — path
  key `bond` and tier keys `magnetize/bond/fortune/revive` unchanged; the
  bond web (bridges/fusions/apex 'e' sector) keys off relic events via
  `webRelicProcs`; the displaced perks are BASELINE item drift, RESEARCH
  drop yields, the AEGIS-capstone lives, and medal-scaled score
  (`G.medalScoreBonus`). Relic damage is `meta.source 'relic'`, `noMega`,
  and deterministic (no `gameRand` anywhere in its flight). **Every tier must stay live in all three
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
  The FIRE pad must always NAME its state — never a bare unexplained label.
  Since AFT-001 the pad FACE carries the SHORT state word (TAP / AUTO ON /
  charge % / RESONANT! / RELEASE! / OVERCHARGE / HEAT HIGH / COOLING) and the
  sub-line carries the clause (HOLD = CHARGE / Ns · LOCKED), so nothing
  squishes inside the circle at any buttonScale. All
  four safe-area insets (`SAFE_T/L/R/B`, setup.js) shift the HUD bar and
  corner controls; keep new top/edge-anchored UI behind them.

## Performance (mobile is the target — keep it smooth)
- **The effects ladder reads WORK TIME *and* rAF CADENCE (AFT-018/018b).**
  `PERF` (setup.js) keeps two rings — update/render work, and the real
  `requestAnimationFrame` cadence — because on phones the compositor can fall
  behind while JS stays cheap (that was the boss-lag report; work alone never
  triggered AUTO). `effectsLevel()` escalates on the fast 30-frame window and
  de-escalates on the slow 120-frame average: rung 1 drops full-frame bloom +
  the big decorative blurs (`fxGlow`), rung 2 adds thinner emission and 75%
  render resolution (`applyRenderScale` — backing store only; CSS size,
  coordinates and hitboxes never change). **Never cull** hostile projectiles,
  telegraphs, hit feedback, objective state, the vessel, boss HP, or touch
  controls, and **simulation must stay bit-identical at every level** — which
  means nothing gated by `effectsLevel()` may sit in front of a `gameRand()`
  call, and cosmetic spawns stay on `Math.random()`.
- **A free-running timer that consumes `gameRand()` MUST be reset in
  `resetRun`.** `G.splashCD` wasn't, so a seeded run's RNG stream depended on
  how many runs preceded it in the page and the sim-identity test went
  intermittently red. Same seed → identical wave means identical *stream*.
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

## The AETHERFALL standalone release (2026-07-21)
- **Two repos, one source of truth.** This repo stays the WORKSHOP (both
  skins, tests, art pipeline, docs). The public, pokemon-free game lives in
  `CrawlerKarl/aetherfall` and is GENERATED — never hand-edited — by
  `npm run build-dist` → `dist-aetherfall/` (gitignored here). To release:
  build, copy into a checkout of the aetherfall repo, commit, push, and the
  Pages build serves it. Every gameplay change is made HERE first, gated by
  the suite, then re-built + shipped.
- **What the dist does**: pokeworld.js → an engine-defaults stub; skin.js
  loses the pokemon registry entry (the `[POKEMON-SKIN-START/END]` markers —
  keep them intact); the Mew konami egg is stripped (`[POKEMON-EGG]`
  markers); pokemon-termed comments dropped; music region labels / MODE
  defaults / fallback literals mapped to realm wording; NO assets/sprites;
  the 518 final PNGs ship. The tool node --checks every emitted module and
  prints a franchise-term RESIDUE report — a release requires RESIDUE: none.
- **Internal identifiers ship unchanged by design** (`br.poke`, `pkbrk-*`
  storage keys, the `mewVmax` flag, `SKIN.id === 'pokemon'` dead gates):
  engine vocabulary, never user-visible; renaming would fork the runtime.
- The pokemon skin must stay playable IN THIS REPO — never delete or
  degrade it; the suite's bit-identity guard still rules every refactor.
- **The art pipeline is two tools, run in this order:** `npm run
  art-overrides` (scans `final/` + `preview/`, emits the four override maps —
  259 base + 259 radiant + 54 preview + 54 radiant-preview today) and
  `python3 tools/build-aetherfall-previews.py` (re-keys the 1254px masters
  into 320px setup portraits + matching radiants). The dist ships 518 final +
  108 preview + 21 weapon PNGs. Overrides are OPTIONAL everywhere —
  procedural art covers any id with no PNG, so a partial run is always safe.
- **Never assume the chroma colour — read it off the frame.** The production
  run uses TWO screens: green for most subjects, **magenta** for green-heavy
  art (water/grass/ice/bug lines). `detect_chroma()` medians a 6px border and
  the despill is channel-matched. Assuming green silently left 12 vessels
  sitting on a solid backdrop block that shipped to the player.
- **Previews/reveals must match THE ID'S OWN final's framing** — the finals'
  subject ratios VARY per id (0.725–0.785), so both tools measure each id's
  final (`final_subject_ratio`) and pad to match it exactly. A fixed global
  ratio made hulls visibly grow when the high-res art finished loading
  (2026-07-23 user report).
- `art/` is ~1.1 GB but **1.0 GB is `sprites/source/`** (the user's editable
  masters, not referenced at runtime). Pruning it is the size lever — **ASK
  FIRST.**
