# Implementation log

Chronological record of completed roadmap work and unresolved design
decisions. Newest entries first. Roadmap: `FULL_GAME_ROADMAP.md`.

---

## 2026-07-19 — Polish pass: UI fixes + Mew VMAX reward rebalance

Four player-reported items:
- **Results medal overlap**: the objective description ran into the NEW
  MEDAL! / EARNED badge on narrow screens. `drawResults` now measures the
  badge column first and, on phones (`narrow = W < 620`), stacks name+badge
  over the description on a taller row; desktop keeps one line with the
  badge column reserved.
- **OPTION tags covered by hexagons**: the constellation drew each OPTION
  pill inline in the node loops, so a later neighbour painted over it. Pills
  are now COLLECTED (`offerPills`) and drawn in one final pass above every
  node + the pilot core, each on a dark padding cushion.
- **"WIDE PADDLE" in Starfighter**: `wide` (and `laser`) power-ups weren't
  remapped for shooter modes, so pickup announced paddle copy. Added
  `sname`/`sdesc` to those POWERS and made `applyPower`'s announce
  mode-aware (WIDE CATCH / SUPPORT LASERS).
- **Mew VMAX reward** (user decision — two normal picks): retired the
  one-off superpowers. Victory now sets `G.secret.bonusDrafts = 1` and
  drops the rift background (`vmax = false`); the first pick chains a
  second normal draft via `chainBonusDraft` (input.js), then Johto. No
  reroll block (bonus drafts are normal, rerollable). `SECRET_UPGRADES`/
  `applySecretUpgrade` kept only for grandfathered saves. Test rewritten.

## 2026-07-19 — Milestone 2 Round A: resonance, overcharge, Spectral Veil

- **Resonant release**: `RESONANCE_WINDOW` (0.38s, state.js) after the
  charge tops out; `G.chargeFullT` clocks it (update.js charge block);
  `fireCharge(c, resonant)` applies +25% power / +1 pierce / ×0.7 heat +
  chime + `statsResonant()`. FIRE pad label walks % → RESONANT! →
  RELEASE! → OVERCHARGE.
- **Overcharge**: >1.4s on a full charge → `addWeaponHeat(dt*0.4)` — nets
  ≈ +0.12 heat/s over passive cooling, so hoarding costs.
- **Spectral Veil**: `br.specVeil` assigned in buildLevel (region 3+,
  ≤2 spirit-type flyers, junkie, non-boss; one-per-run teach card);
  `specVeilActive` cycles 2.0s on / 1.4s off; charged bolts `continue`
  through active veils in the bolt block (no pierce/lastHit spend);
  dashed-halo shimmer tell in the bareMon render path.
- **Tests** (53 → 55): resonance boost/count, plain-release contrast,
  overcharge net heat, sustained-spam overheat band [5, 10.5]s, fire-rate
  upgrades never crueller; veil active/open windows both directions.

## 2026-07-19 — Milestone 1 Round D (part 2): Kanto sky life + demo audit

- **Distant flocks** (scenery.js `updateFlocks`/`drawFlocks`): loose V
  formations of tiny stroke-drawn bird silhouettes drift across Kanto's
  high sky (≤2 flocks × 5 birds, no gradients, behind the weather layer,
  Kanto-gated). Background life with zero readability cost.
- **Kanto demo audit** (scripted bot, Normal, seed KANTO-AUDIT, fire
  starter, naive steering/dodging, blind 7s charges, no Mega): full
  Kanto in ~205s play, 2 knockouts, finished 1/4 HP, 79 kills. Damage
  taken = micro-class fire almost exclusively (fist/prism/wisp/boulder)
  + 2 Psystrike columns — the readable-danger contract holds. Boss
  clocks: Mewtwo P1 2.8s / P2 14.7s; Mew 11.4/6.1/15.6s. Spam fire →
  27 overheats / 54s locked (the heat lesson bites as designed).
- **Tuning notes for the Milestone 9 pass** (not bugs): Mewtwo P1 melts
  too fast for the focus-orb showcase to breathe (consider +P1 HP share
  or first-orb-volley-on-engage); stage-3 entry pressure can spike a
  1-HP carryover pilot (crystal/heavy at 9s) — potion pity into finales
  may deserve a nudge.
- **Milestone 1 declared COMPLETE**: results/medals/intros (A), authored
  beats (B), the Mewtwo duel (C), flight log + sky life + audited demo
  baseline (D). Remaining Kanto polish rides M2 (combat ecology) and the
  M9 balance pass.

## 2026-07-19 — Milestone 1 Round D (part 1): the flight-log narrative

- `STAGE_FLAVOR`/`stageFlavor` (data.js): one authored expedition-log line
  per stage, surfaced on the results screen (`R.flavor`, italic muted
  wrap under the next-stage tease; hidden on short viewports). Kanto's
  three lines seed the campaign voice and tease Johto; other regions get
  theirs in Milestone 9's polish pass. Zero pacing cost — it rides the
  existing one-tap interstitial.
- Still queued for Round D part 2: Kanto-specific ambient scenery motion
  (drifting flocks over the hills) + the demo polish pass.

## 2026-07-18 — Milestone 1 Round C shipped: the Mewtwo duel

- **Focus orbs** (bossAbility case 150 + `s.orbit` handling in the
  enemy-shot loop): P1 alternates teleport with a three-orb summon —
  2-HP boss shots that ride the summoner (age-frozen while orbiting, so
  the 9s ballistic cull starts at launch), deniable by basic fire,
  launching as aimed heavy shots after ~4s, fizzling if Mewtwo dies.
- **Psystrike channel** (boss block + bolt-block interrupt): <15% HP →
  rooted 2.6s channel (fire quiets, teleport cancelled, abilities pause);
  complete → five warned columns with dodge lanes; a charged hit breaks
  it → 1.5s stagger, boss fire holds, damage ×1.35 (multiplier lives in
  damageBrick next to the mastery stacks). 9s recur cooldown.
- reduceFlash: channel pulse rings are skipped; combat notices + the
  column warn phases carry the danger information.
- Suite 51 → 52 (summon/orbit/deny/launch/fizzle + channel/break/
  stagger-window/columns). Two-phase legendary contract preserved.

## 2026-07-18 — Milestone 1 Round B shipped: Kanto authored beats

- `G.beat` (buildLevel, junkie region-1 non-boss) + `updateKantoBeat`
  (update.js): Arrival's BONUS FLOCK (harmless `br.crosser` fly-bys —
  no flight slot, excluded from the shooter pool, the blocksStatic
  position snap, the dramatic slow-mo, and the clear condition; +150 and
  Mega per chain kill, escape off-screen if ignored) and Challenge's
  RAID → RECOVERY arc (early raid maneuver with warning, then a 3.4s
  fire hold + primed heal pity).
- Suite 50 → 51 (beat arcs, crosser isolation, clear exemption).
- Deliberately Kanto-scoped; Milestone 3 generalizes the grammar.

## 2026-07-18 — Milestone 1 Round A shipped: results, medals, region intros

- **Stage results interstitial**: `G.state === 'results'` between clear and
  draft. `buildStageResults` (state.js) snapshots the cleared level's
  ledger + evaluates `stageObjectives(lvl)`; `drawResults` (render.js)
  renders hero title, ledger rows, objective list with NEW MEDAL / EARNED
  states, the not-saved notice for trial/daily/cheated, and the next-stage
  tease; `advanceResults` (input.js — tap, Space, Enter, Esc; 0.45s dwell
  gate) routes results → pending act ceremony → draft. The ceremony now
  PENDS (its `G.state='ceremony'` override was removed from the clear
  block). Paddle/HUD suppressed during results; announces cleared at entry.
- **Mastery objectives + medals**: `STAGE_OBJECTIVE_SETS` +
  `DEFAULT_OBJECTIVE_SETS` (data.js), Kanto fully authored; `MEDALS` map
  persisted at `pkbrk-medals` (DAILY_RECORDS pattern); new ledger counters
  `intercepts` + `shellCracks` feed the checks.
- **Region intros**: `REGION_INTROS` (data.js) hero card + `SFX.regionIntro`
  sting on every arrival wave; junkie arrivals now grant a 3.4s
  first-volley grace (state.js) so the card honours the lane invariant —
  CLAUDE.md's hero-announcement rule updated to codify the contract.
- **Audio**: `SFX.stageClear` fanfare, `SFX.medal` sparkle, `SFX.regionIntro`.
- **Tests** (suite 48 → 50): results flow (grace window, payload identity,
  dwell gate, tap-through), medal persistence + repeat-clear EARNED
  semantics + results→ceremony→draft ordering.

## 2026-07-18 — Milestone 1 planning (Kanto vertical slice)

M1 decomposes into rounds; each ships through the full quality gates:

- **Round A (SHIPPED — see entry above):** stage-results interstitial (`G.state ===
  'results'` between wave clear and the draft, powered by the M0 ledger),
  Kanto mastery objectives + persistent medals (`pkbrk-medals`,
  `STAGE_OBJECTIVE_SETS` in data.js with per-stage-type defaults for
  unauthored regions), region-intro hero cards (`REGION_INTROS`), and the
  stage-clear/region/medal audio stings. Results must stay ONE TAP to
  continue — arcade pacing is a design invariant.
- **Round B (next):** Kanto authored encounter beats. Arrival: a scripted
  low-risk BONUS FLOCK beat (a swift crossing line of unevolved birds that
  don't fire, rewarding group destruction) when the main squad is half
  down. Challenge: a mid-stage RAID escalation with a warning strip, then
  a recovery beat (brief calm + guaranteed orb/heal drop). Implemented as
  a small Kanto-keyed beat controller (`G.beat`) — deliberately minimal,
  the seed Milestone 3 generalizes into the encounter director.
- **Round C (NEXT — design locked):** Mewtwo rebuilt as the boss-framework
  prototype (shared with Milestone 4). Keep the two-phase STARFIGHTER
  legendary contract (the boss-harness test asserts it; Mew stays the
  three-phase finale) but make the phases mechanically DISTINCT:
  - **P1 · FOCUS ORBS (normal-fire answer):** Mewtwo periodically summons
    three slow psy-orbs that orbit him (spawned as boss enemy-shots with
    `interceptHP 2`, zero velocity + orbit fields). Shot down in time =
    clean deny; ignored ~4s = they launch as aimed HEAVY shots. Teaches
    "normal fire clears the sky".
  - **P2 · PSYSTRIKE CHANNEL (charge answer / desperation):** below ~15%
    HP Mewtwo channels 2.6s behind a big telegraph; uninterrupted, it
    fires a five-column barrage (reuse `G.columnStrikes`); a CHARGED hit
    landing during the channel CANCELS it and staggers him 1.5s (bonus
    window). Implement via `br.channel {t,dur}`, cancel check in the bolt
    block where `L.charged` lands on a channelling boss.
  - Reduced-flash variants for every new effect; boss-harness tests for
    orb deny, orb launch, channel fire, channel interrupt.
- **Round D:** narrative cards + Kanto scenery motion + demo polish pass.

**Decisions:**
- Medals persist by absolute level key ('1'..'27'), so future region
  reordering would need a migration — accepted; levels are stable.
- Trials/dailies/cheated runs EVALUATE objectives on the results screen
  (labelled "not saved") but never write medals — keeps trial jumps from
  farming medals with granted builds.

## 2026-07-18 — Milestone 0 kickoff: baseline audit

**Audit findings (what already exists, to extend rather than duplicate):**
- `G.runStats` (state.js:233, reset at state.js:1309) already tracks
  bricksBroken / bossesDefeated / itemsCaught / damageTaken;
  `G.lastDamageCause` is a display string; `finalizeRun` (update.js:1597)
  snapshots `G.runSummary` for the game-over screen. This is the seed of the
  Milestone-0 stats layer.
- Seeded gameplay RNG exists: `setRunSeed`/`gameRand`/`hashSeed`
  (config.js:31-49). Daily mode uses it (`dailySeed`). Cosmetic effects
  intentionally use raw `Math.random()` so visuals don't repeat.
- Trial mode is already a debug launcher: region × stage grid + gauntlet
  round row (+ Mew VMAX secret tile), grants tree advances via
  `resetRun(startLevel, trial=true)`.
- Cheat panel (pause screen) grants power-up/shield/mega/life/element.
- `test.html` is a 45-check headless invariant suite with
  `window.TEST_RESULTS` automation output.
- README's own roadmap section lists "local balance telemetry" as wanted —
  confirming the stats layer was known-missing.

**Unresolved design decisions:**
- Release identity (fan project vs original universe) — user decision,
  parked until Milestone 10.

**Built this round (Milestone 0):**
- **Stats layer** (state.js `stats*` helpers + hooks across update.js /
  input.js): one record per wave ATTEMPT on `G.runStats.levels` — time,
  kills, damage-in by projectile family (`loseLife(cause, shot)` now takes
  the shot object), damage-out by `meta.source` on `damageBrick`
  (bolt/charge/ball/splash/other), charge uses + wasted charges (laser cull
  checks `L.charged && !bhits && !hits`), overheats + weapons-locked
  seconds, absorbs/deflects, Mega uses, draft picks + rerolls (recorded on
  the CLEARED level's record, before buildLevel opens the next), boss phase
  durations (`br.phaseClockT`, engagement-clocked), knockouts;
  `SESSION_STATS` counts restarts/quits across resets.
- **js/dev.js** (new 11th module, loaded before main.js; local-only):
  URL/console dev launches (`?dev&level=&region=&stage=&round=&mode=&diff=`
  `&starter=&seed=&upg=&real=1`), `window.DEV` API (launch/boss/grant/
  report/download/panel/seed/levels/help), the JSON balance report
  (`devRunReport` — includes why the run ended), and the F9 DOM dashboard
  overlay (deliberately DOM, not canvas: zero hot-loop cost).
- **`jumpToGauntletRound(round)`** extracted into update.js — shared by the
  trial picker, dev launches, and the boss harness.
- **gallery.html**: projectile readability audit rendered by the game's OWN
  `drawProjectiles`/`drawTypedBolt` — 18 type kinds + 43 boss silhouettes ×
  all 4 SHOT_CLASSES + 17 player bolt shapes × 3 tiers, each split
  bright-sky/dark-arena with dashed honest hitR + art-radius overlays.
- **Determinism fix**: `rollUpgradeChoices`' satellite backfill called
  `gameRand()` inside a sort comparator (engine-defined draw count —
  desyncs seeded runs across browsers); now one draw per satellite,
  precomputed. Audit confirmed ALL other sim randomness routes through
  `gameRand()` and all 33 raw `Math.random()` sites are cosmetic-only.
- **3 new tests** (suite 45 → 48): the instrumentation ledger end-to-end,
  the boss phase harness (round jumps, 2/3-phase math, timed phases,
  shockwave + escape spoke, 0.78s damage gate, last-stand adds), and
  seeded dev-launch reproducibility (same seed → identical wave).

**Decisions:**
- Stats stay run-scoped in memory (download to keep); only restart/quit
  counters persist across resets, and nothing touches localStorage — keeps
  the analytics-local guarantee trivially true.
- Boss phase clocks start on first damaging hit (engagement), not entrance
  ceremonies — that is the number balance tuning needs.
- The dashboard is a DOM overlay, not canvas UI: dev-only surface must never
  add cost or hit-test complexity to the game loop.
