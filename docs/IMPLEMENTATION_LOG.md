# Implementation log

Chronological record of completed roadmap work and unresolved design
decisions. Newest entries first. Roadmap: `FULL_GAME_ROADMAP.md`.

---

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
