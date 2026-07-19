# Milestone 4 — Boss kit designs (Round A: Lugia, Dialga)

Design spec for rolling the Mewtwo boss template across the roster.
Mewtwo (M1) is the proven prototype; every major boss gets:

1. **A phase-1 signature mechanic best answered by NORMAL FIRE** (Mewtwo:
   focus orbs — 2-HP intercept targets that punish ignoring them).
2. **A low-HP CHANNEL best answered by CHARGE** (Mewtwo: Psystrike —
   interrupt with a charged bolt for a 1.5s ×1.35 stagger, or eat a
   readable punished pattern).
3. **A movement/arena identity** that makes the arena itself part of the
   fight (Mewtwo: teleport control with 0.5s anticipation).
4. **A reduced-flash variant** — every tell survives `reduceFlash` via
   shape/motion/HUD copy, never only luminance.

## Shared refactor: data-driven channels (`BOSS_CHANNELS`)

The Psystrike channel/desperation block (update.js:3755–3786) and its
interrupt (update.js:3556–3567) are hard-gated `poke.id === 150`.
Generalize before adding bosses:

- New table in data.js next to `BOSS_ABILITIES`:
  ```js
  const BOSS_CHANNELS = {
    150: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'PSYSTRIKE',  pattern: 'columns' },
    249: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'AEROBLAST',  pattern: 'sweep'   },
    483: { hpFrac: 0.15, dur: 2.8, cd: 9, name: 'ROAR OF TIME', pattern: 'clock' },
  };
  ```
- The channel block keys off `BOSS_CHANNELS[br.poke.id]` (junkie,
  `!mythic`, `!secretBoss` — same gates as today). `br.channel` gains
  `pattern`/`name` so the punish dispatch and combat notice are data-driven.
- The charged-hit interrupt stays generic (it already reads `br.channel`);
  stagger stays 1.5s / ×1.35 — these numbers are template constants, keep
  them uniform across bosses.
- Mewtwo's behavior must be BIT-IDENTICAL after the refactor (the duel
  test at test.html:2265 is the guard).

**Punish patterns** (all reuse `G.columnStrikes`; each strike keeps the
existing warn→strike lifecycle so the columns machinery stays the single
lane-danger primitive):
- `columns` — today's 5 simultaneous warned columns (Mewtwo, unchanged).
- `sweep` — 5 columns fired SEQUENTIALLY left→right (or right→left,
  mirrored by which half the boss occupies), ~0.28s apart: a traveling
  wall the pilot races. Same total danger, different read.
- `clock` — 6 columns around the arena firing clockwise in sequence with
  ONE safe lane that rotates one slot per strike; the safe lane starts at
  the pilot's current column (readable escape, matches the phase-shockwave
  escape-spoke philosophy).

---

## LUGIA — THE STORM THAT HUNTS (level 6, Johto finale)

Fantasy: pursuit, wind, lane manipulation. Style stays `infinity`
(figure-eight patrol), projectile stays `aeroring`, entrance stays
`maelstrom`. Music already authored (TIN TOWER STORM).

### Signature 1 — STORM FEATHERS (normal-fire answer, phase 1)
- On ability cadence (alternating with the gust, like Mewtwo's `orbTurn`
  toggle), Lugia sheds **3 feather spawners**: `classKey:'heavy'`
  (interceptHP 2), kind `aeroring` art scaled small, drifting DOWN slowly
  on sine paths, pushed laterally by the active wind (see below).
- A feather that reaches the ship band (`shipY()-40`) bursts into a
  **fan of 3 micro shots** aimed at the pilot. Two basic hits deny it —
  cheap for normal fire, wasteful for charge (piercing one line can't
  catch a drifting spread).
- Cap: never more than 3 live feathers; skip the turn if any survive
  (mirrors the focus-orb `s.orbit` guard).
- Implement on the existing orbit/deferred-shot lifecycle block
  (update.js:3925–3949) as a sibling `s.feather` state, NOT a new
  system: `{ t, burstAt, sway, src }`, orphan-fizzles when the summoner
  dies, excluded from nothing else (it IS an enemy shot).

### Signature 2 — TAILWIND CURRENT (lane manipulation, both phases)
- Replaces the junkie-inert `G.gustT` ability body. Sets `G.gustT = 4`,
  **`G.gustDir = ±1`** (toward whichever side has more open space, so it
  pushes the pilot's aim off-center), plus tone.
- While active **in shooter modes**: player bolts (`G.lasers`) drift
  `vx += gustDir * 150 * dt` (aim upwind to hit), and enemy micro-class
  shots drift the same amount (fair both ways). Ball modes keep the
  existing ball-curve behavior untouched. Never move the pilot's ship —
  no hidden knockback.
- Tell: existing wind streak particles get a directional lean; the
  announce strip (never the center card) names it: `TAILWIND →` /
  `← TAILWIND`. reduceFlash: streaks stay (motion, not flash), no
  screen-edge glow.

### Movement — THE HUNT (pursuit, phase 2)
- Phase 2 tightens the infinity patrol: lerp the pattern's center-x
  toward the pilot's x with a soft chase (`cx += (shipX-cx)*0.4*dt`,
  clamped to the patrol band). Lugia hunts; the pilot can no longer camp
  one lane. Guard wings already re-tether automatically.

### Desperation — AEROBLAST (charge answer)
- `BOSS_CHANNELS[249]`: ≤15% HP, roots (patrol pauses), 2.6s channel,
  pattern `sweep`. Charged interrupt → 1.5s stagger ×1.35, `channelCD 9`.
- reduceFlash: channel pulse ring gated exactly like Mewtwo's; the
  combat notice + column warns carry the info.

---

## DIALGA — THE CLOCKWORK BASTION (level 12, Sinnoh finale)

Fantasy: clockwork timing, arena control. Style stays `bastion` (locked
mid-arena), projectile stays `time`, entrance stays `timesplit`. Music
already authored (SPEAR PILLAR CLOCKWORK).

### Signature 1 — CHRONO GEARS (normal-fire answer, phase 1)
- On ability cadence (alternating turns), Dialga deploys **2 gear nodes**:
  `classKey:'heavy'` (interceptHP 2), kind `time`, each orbiting a fixed
  anchor point flanking the boss (reuse the orbit state with `src:boss`,
  fixed anchor, no launch).
- Every **metronome beat** (see TIME DILATION period) a live gear emits
  1 micro `time` shot aimed at the pilot — a steady drip that stacks up
  if ignored. Two basic hits destroy a gear; the two gears orbit in
  ANTI-PHASE (180° apart) so one charged line can't take both.
- Gears expire on their own after 9s (fizzle, no burst) so they can't
  hold a phase hostage; orphan-fizzle if Dialga dies.

### Signature 2 — TIME DILATION (arena control, replaces inert timeWarp)
- ROAR OF TIME's cadence ability now sets `G.timeWarpT = 3.2` AND drives
  a **metronome lurch** in shooter modes: while `timeWarpT > 0`, enemy
  shots move on a square wave — `TICK_PERIOD = 0.45s`, first half of each
  period velocity ×1.7, second half ×0.15 (average ≈ 0.93, no hidden
  speedup). All enemy shots lurch IN SYNC — dodge on the rhythm.
- Audible tick each period start (small click via SFX, reuse an existing
  UI tick sound — no new audio system); the announce strip names it:
  `TIME DILATION`. Ball modes keep the existing ball-slow behavior.
- reduceFlash: the lurch IS the tell (motion); no added flash. Existing
  screen flash on cast (update.js:1193) must be gated by reduceFlash if
  it isn't already.
- Implementation: a single multiplier read where enemy shots integrate
  velocity — one `enemyShotTimeScale()` helper next to `ballTimeScale()`
  (update.js:14). Never mutate the shots' stored vx/vy (that would
  desync on expiry); scale at integration time only.

### Movement — BASTION (unchanged, it's the identity)
- Dialga stays locked mid-arena; its clock-hand volleys (existing
  spawnBossFire case 483) already flip direction by phase. Phase 2 may
  tighten the volley period slightly (×0.85) — arena control comes from
  gears + dilation, not chasing.

### Desperation — ROAR OF TIME (charge answer)
- `BOSS_CHANNELS[483]`: ≤15% HP, 2.8s channel, pattern `clock` (rotating
  safe lane). Charged interrupt → standard stagger. reduceFlash as above.

---

## Tests (suite 57 → 59; clone test.html:2265's driving pattern)

**Lugia duel** (`resetRun(6,true,{seed})` → `jumpToGauntletRound(1)`):
1. Force ability: 3 feathers exist, `interceptHP === 2`.
2. Two basic laser hits deny a feather.
3. Force a feather to the ship band → exactly 3 aimed micros spawn.
4. Gust turn: `G.gustDir` set; a player bolt's x drifts over 30 frames.
5. `hp = 10%` → channel opens with `pattern:'sweep'`; charged hit breaks
   it → `staggerT > 1`; stagger damage ×1.35.
6. Uninterrupted channel → 5 columnStrikes with strictly increasing
   (or decreasing) fire times — the sweep signature.
7. Mewtwo regression: the existing duel test still passes untouched.

**Dialga duel** (`resetRun(12,true,{seed})`):
1. Gear turn: 2 gears, `interceptHP === 2`, anti-phase orbits.
2. Two basic hits destroy a gear; the other survives.
3. During TIME DILATION, an enemy shot's per-frame displacement in the
   fast half-period is > 3× its displacement in the slow half-period;
   with dilation off it's uniform.
4. Stored shot vx/vy unchanged by dilation (integration-time scaling).
5. `hp = 10%` → channel `pattern:'clock'`; uninterrupted → 6 strikes,
   exactly one safe lane per volley, safe lane rotates.
6. Charged interrupt → stagger, ×1.35.

**Invariant guards that must stay green:** projectile grammar (both kinds
already exist), junkie finale entrances/phases test, flyer overlap tests
(feathers/gears are shots, not flyers — they must not enter the
separation solver), heat-fairness band, ledger tests (`meta.source` on
any new damage path; feathers/gears pass the shot object to `loseLife`).
