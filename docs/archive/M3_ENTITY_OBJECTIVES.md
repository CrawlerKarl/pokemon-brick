# M3 Round C — the friendly entity + protect objectives

Design for the entity-based objective families (roadmap M3). Builds on
the SURVIVE framework (`ENCOUNTER_OBJECTIVES` / `updateObjective` /
`drawObjectiveBanner` / the clear guard at the level-clear block) and
the `br.crosser` exclusion pattern. Junkie non-boss stages only, like
all objectives.

## 1. The FRIENDLY entity (`br.friendly`) — the one new piece of infra

A friendly is a `G.bricks` entry that lives outside every hostile
system, mirroring EVERY crosser exclusion plus two new rules:

- **Crosser-parity exclusions** (all quoted in the recon report):
  separation solver + overlap invariants (no `flight`), shooter pool,
  `blocksStatic` snap, dramatic slow-mo, level-clear condition (the
  `every(... || b.crosser)` check gains `|| b.friendly`), director
  baseline count.
- **NEW — player fire passes through:** the laser brick-collision loop
  gains `if (br.friendly) continue;` — no damage, no pierce spent, no
  lastHit. (Ball modes never see friendlies — objectives are
  junkie-gated in buildLevel.)
- **NEW — enemy fire can hit it:** a narrow collision check runs ONLY
  while a live friendly exists: enemy shots within its hitR reduce
  `friendly.fhp` by 1 and are consumed (ring + floater feedback,
  reduceFlash-safe). `fhp` starts at 3, drawn as heart pips over the
  mon (small glyphs, no gradients).
- **Enemy targeting:** while a friendly is alive, every Nth aimed
  volley from the normal shooter cadence redirects its aim at the
  friendly instead of the pilot (redirect, never add — the threat
  budget is untouched). N = 2 (alternate). Micro-class only — heavy
  fire keeps hunting the player, so interception (normal fire's job)
  is the counterplay for the friendly and dodging remains yours.
- Motion: `friendly.path` — `'cross'` (escort: enters bottom-center,
  drifts upward-across at ~55 px/s toward an exit point, gentle bob)
  or `'hold'` (relay: parks at W/2, ~38% height). Own integration
  branch beside the crosser fly-by; never enters formation logic.
- Visuals: the mon renders through the normal bare-mon path with a
  soft ally ring (the wingmate pink `#ff80ab` family) so it reads
  friendly at a glance. Faint uses the existing bareMon faint.
- **Fainting = objective FAILURE** (the first fail state):
  `O.failed = true`, the friendly faints, a strip notice names it
  (`THE TRAVELER FELL — CLEAR THE WAVE!`), the banner disappears, and
  the wave reverts to a NORMAL attrition clear (`G.objective` keeps
  `{failed:true}` for the ledger; the clear guard ignores failed
  objectives). No extra punishment — losing the bonus is the cost.

## 2. Two families on the same machinery

**ESCORT THE TRAVELER** (`type:'escort'`) — a friendly mon crosses the
combat zone bottom→top over ~20s while the swarm hunts it.
- Win-condition change: while live-and-unfailed, the wave cannot clear
  by attrition (same guard shape as survive). When the traveler
  reaches its exit: `O.done = true`, +600 score, a guaranteed potion
  drop at the exit point, the swarm DISPERSES (survive-style crosser
  conversion + `G.reinforce = 0`) and the stage clears.
- Reinforcement pressure: reuse the survive reinforcement drip
  (`spawnT` 5.5, cap 14 alive) so the escort can't be trivialized by
  pre-clearing.
- Assignment: `'3:0'` (Sinnoh arrival, lvl 10). Species: **Togepi
  (175)** — sprite exists on disk; verify NAMES covers it.

**DEFEND THE RELAY** (`type:'defend'`) — a stationary friendly
(`path:'hold'`) must survive a 22s timer.
- Identical machinery with `dur`; completion = disperse + clear (+600,
  potion at the relay). Failure = attrition clear.
- Assignment: `'5:1'` (Kalos challenge, lvl 17). Species: **Porygon
  (137)** — sprite exists on disk; verify NAMES covers it.

`ENCOUNTER_OBJECTIVES` entries carry `{type, dur, name, tip, species,
path}` — `encounterObjective` stays a pure lookup. SURVIVE (`'2:1'`)
is untouched.

## 3. Banner + ledger

- `drawObjectiveBanner` gains the friendly readout: countdown (defend)
  or a progress fill from path-traveled (escort), plus `fhp` heart
  pips inline (`◎ ESCORT THE TRAVELER · ♥♥♥ · 14s`). Failed
  objectives draw nothing (banner gone is the tell + the strip notice
  already fired).
- **Ledger bridge (new):** `statsObjective(type, outcome)` records
  `{objective: type, objectiveDone: bool}` on the current level's
  ledger entry; `buildStageResults` surfaces one line in the results
  readout (`OBJECTIVE: ESCORT — COMPLETE/FAILED`). Medal integration
  stays out of scope (M9's mastery pass owns medal design).

## 4. Out of scope this round (logged)

Capture-without-destroying and chase-the-fleeing-elite (both need the
catch system audit), defend-multiple-lanes, the lighter overlay
objectives, the remaining 7 region grammars, and the unbuilt beat
types (formation reveal / elite intervention / hazard / victory).

## Tests (suite 69 → 71)

- **`objective: escort the traveler (protect → disperse, faint → attrition)`**
  — `resetRun(10, true, {seed})`: friendly exists (`friendly`, species
  175, `fhp 3`, path cross); player laser passes through (hp
  unchanged, laser survives, no lastHit); a forced enemy shot at its
  position drops `fhp` and consumes the shot; attrition doesn't clear
  while live (survive-guard parity); force it to the exit → `O.done`,
  disperse (crossers exist, `G.reinforce === 0`), stage clears.
  Fresh run: force `fhp 0` → `O.failed`, friendly faints, banner
  suppressed, and killing everything now CLEARS the stage normally.
- **`objective: defend the relay (hold the line)`** — `resetRun(17,
  true, {seed})`: stationary friendly (137, path hold); redirected
  aimed fire targets it on the alternating cadence (some shot aims at
  the relay's x, micro class only); timer completion → disperse +
  clear; ledger records `objectiveDone`.

**Guards that must stay green:** the survive test (2:1 untouched), both
director tests (crossers/threat budget), flyer overlap invariants
(friendlies have no flight slot), the 18 duel + 2 mythic tests, junkie
choreography, boss phase harness. `verify-assets` stays OK (175/137
have local sprites; if NAMES lacks either, add the name — never a
remote fetch).
