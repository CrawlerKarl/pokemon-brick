# AFT-020 execution notes (running design log)

> Working notes for the realm-finale + variety program. The authoritative
> spec is `../AETHERFALL_REALM_FINALE_AND_VARIETY_PLAN.md`; this file records
> the concrete architecture decisions made while executing it, newest last.
> Read together with `IMPLEMENTATION_LOG.md`.

## Phase 0 decisions (2026-07-24)

- **Ledger, not a parallel recorder.** All new measurement rides
  `G.runStats.levels[]`: `tProg`/`tActive` clocks (classified once per frame
  next to `statsPlayTick`), `workHp`/`beUnit` stamped at the END of
  `buildLevel` (the junkie flyer block adds population after
  `statsBeginLevel`), `dmgCat` deltas inside `damageBrick` (stacks → window →
  vessel → matchup → guard checkpoints), `surgeBy` via the new `gainMega()`
  funnel (identical clamp, plus overflow-waste attribution), `shieldBy`/
  `lifeBy` at every gain site, `dropsBy` inside `modePower()` (the one
  choke-point every type-keyed drop crosses), `killsRenew` via the
  `br.reinf` tag, channel open/break counters, and `G.runStats.offers`.
- **Classic's "active threat" is a live ball**; shooter modes count live
  hostiles or shots in flight; reveals freeze both clocks. Phase-gated
  (`phaseT > 0`) and dormant targets do not count as meaningful progress.
- **BE unit** = the realm's Sovereign HP formula
  (`(19 + rIdx*9 + cycle*32) * preset.bossHp`), stamped per wave so
  `workHp / beUnit` gives Sovereign-equivalents for ANY wave.
- **Skin-divergence bug fixed** (was silently distorting any cross-skin
  balance read): fighting/ground/dark/poison perk gates compared
  `starterPerk()` against pokemon ability NAMES; now keyed on the starter
  type. Pokemon numbers bit-identical; suite 88 guards it.
- **Baseline fixtures** land in `docs/baselines/aft008-old-campaign.json`
  (+ human summary `AFT008_BASELINE_REPORT.md`) via `npm run baseline`
  (tools/run-baseline.js, same raw-CDP pattern as the gate).

### Locked schemas (data.js)

- `FINALE_FORMATS`: ladder / relay / siege / hourglass / circuit / hunt /
  rite / raid / chase — each with three named beats. Format keys are
  engine identifiers (Trial/storage-stable).
- `ATTACK_STATES` = teach → tell → commit → resolve → recover.
- `COUNTER_VERBS` = sustain · chargeBreak · move · bait · protect · order ·
  aspect · intercept. Budget rule (≤3 finales lean on chargeBreak as
  primary) becomes a suite assertion once all nine profiles exist.
- `COUNTER_RESULTS` = taught / committed / countered / failed / skipped.
- Beat budget shape: `{ work: BE-fraction, threat: mul vs starThreatCap,
  recovery: calm seconds }`.
- `G.finale` (null outside finales): `{ realm, format, beat, beatKey,
  beatT, actors, objective, mastery, carry, reward, budgets, clocks,
  procEligibility, entry }`. `G.gauntlet` STAYS as the compatibility
  adapter until every realm + the Rift + all boss tests ride the director.
- `G.prep`: the temporary Challenge→finale Preparation benefit (Phase 3).
- `SKIN.finaleProfiles[rIdx]` (skin-owned): `{ format, title, beats:
  [{key, label, work}], mastery: [{key, name}] }` — aetherfall authors
  first; pokeworld maps the same slots to its own cast and words.
- `SKIN.stageTitles[rIdx][stageIdx]` (skin-owned display titles; the
  structural ARRIVAL/CHALLENGE/finale subtitle stays).

## Phase 1 plan (director + Greenspell, IDENTICAL behavior)

Exit criterion per the spec: Greenspell completes, rewards, resumes, and
secrets **identically** through the new director in all modes. No new
mechanics in this phase (the new Greenspell attack rules are Phase 4).

1. `SKIN.finaleProfiles[0]` in both skins: format 'ladder', beats
   opening/core/coda with skin labels (aetherfall: THE TRIUNE WARD /
   VELMORA REMEMBERS / THE FIRST DREAM; pokemon: THE SENTINELS / the
   legendary's title / the mythical's title). Other realms default to
   'ladder' via the `finaleProfile()` fallback until their phases.
2. `buildLevel`: finale stages with a gauntlet also build `G.finale`
   (realm, format, beat 0, mastery {clear:false, countered:false,
   mastered:false, counters:{}}). Non-gauntlet finales (none today) leave
   it null.
3. `update.js`: `startFinaleBeat(i)` / `completeFinaleBeat()` — called
   from `gauntletWake` (beat 0→1) and `gauntletSummonMythic` (beat 1→2)
   and the kill of the final actor (beat 2 complete → mastery.clear).
   `G.finale.beatT` ticks with the sim. The gauntlet round controller
   itself is UNTOUCHED — the director mirrors it (adapter direction:
   gauntlet drives, finale records; Phase 2 flips this for relay/raid).
4. Trial: the ROUND row shows the profile's beat LABELS (named chapters)
   instead of generic ROUND 1/2/3, same `jumpToGauntletRound` wiring and
   rects (`trialLayout` unchanged geometry). Jumping also sets
   `G.finale.beat` accordingly.
5. `DEV.finale({realm, beat, phase})` → maps beat→round for exact-beat
   launches.
6. Ledger: `L.finaleFormat` + `L.finaleBeatT = {beatKey: seconds}`.
7. New invariant: drive the realm-1 finale start→finish (junkie) and
   assert beat transitions mirror rounds 0/1/2, ledger beat clocks sum to
   play time, trial chapter labels resolve in both skins, and the Rift
   secret (round-3 replacement) still records `beatKey 'coda'`.

## Phase 2 sketch (relay + raid — the format proof)

- The director OWNS these two realms end-to-end (`G.gauntlet` still
  populated as a read-only adapter view for HUD/tests that ask "is this a
  finale"), with the attack-state controller
  (`startAttack(actor, def)` → teach/tell/commit/resolve/recover on the
  beat clock) and shared meters (`G.finale.meter`).
- Belltower (realm 2, relay): Vows carry ONE storm core (carrier flag on
  an actor; only the carrier takes meaningful damage — others ×0.15 with
  a deflect tell), three clean passes complete beat 0; Zephyrion absorbs
  the core (beat 1, corridors bend projectiles); Verdandi bloom coda
  (beat 2, reward event, no boss bar — collecting blooms upgrades the
  Victory Draft control).
- Crucible (realm 8, raid): all actors alive from the start under one
  shared work budget; Break meter fills from counter-play on the correct
  captain; crown segments expose the Seraph; Vyrakka optional unbind.
- Both ride the SAME engine machinery with skin-authored names; Breaker
  adapters: corridors → rebound rails, carrier/segments → ball-breakable;
  no enemy fire in classic (already enforced by the calm guards).
