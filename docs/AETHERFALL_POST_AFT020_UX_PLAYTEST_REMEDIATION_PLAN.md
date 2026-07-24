# AFT-021 — Aetherfall post-AFT-020 UX playtest and remediation plan

Status: ready for autonomous implementation  
Prepared: 2026-07-24  
Audited workspace head: `6cbe099`  
Scope: player-visible correctness, combat readability, input consistency,
encounter pacing, progression balance, and the tests needed to keep those
qualities from regressing.

## Executive verdict

AFT-020 successfully made the nine realm finales structurally different, and
the release gate is green at 103/103 invariants. The playtest nevertheless
found three release-blocking UX problems:

1. **The game can declare a stage complete while undefeated-looking actors
   remain visible.** This is partly intentional for objectives that disperse
   or neutralize enemies, but the clear happens before the departure animation
   can communicate that outcome. Clear-exempt crossers, friendlies, and grid
   terminals remain live objects; results and draft rendering can continue to
   show them behind translucent panels. Hostile projectiles and beam lanes are
   not comprehensively state-gated, creating a latent risk of post-clear
   damage.
2. **The combat UI has containment without composition.** Text generally
   remains inside the screen, but the stage title, objective/finale meter,
   boss labels, announcements, tutorials, and touch controls can overlap one
   another and cover enemies or the player. On phones under 560 px wide, the
   stage title is centered at `y=48` while the objective pill occupies
   approximately `y=44–70`; they are designed into the same space.
3. **The reported charge-speed inconsistency is real, although it is not a
   separate charged-projectile speed.** Every player bolt uses the same
   nominal 900 px/s vertical speed, but that speed is multiplied by Slow-Mo
   (×0.5), starter Chill (×0.7), the 0.6–1.6 game-speed setting, and dramatic
   slow motion (×0.3). Charge buildup does not use those multipliers. A shot
   can therefore travel anywhere from roughly 57 to 1,440 px/s while its
   charge fill follows a different clock. Touch also adds a 220 ms intent
   delay that desktop does not have.

The balance evidence adds a fourth concern: the campaign is currently
front-loaded. Early Breaker/Blaster finales can take several minutes or fail,
while late Starfighter stages and finales can collapse in 8–27 seconds. The
new finale mechanics exist, but late-game firepower often erases their
opportunity to be learned.

This plan treats the first three items as P0 stabilization and the pacing,
build, shield, health, and difficulty work as P1 balance. Do not begin AFT-009
until the P0 phases and their gates are complete.

## What was tested

The audit combined:

- manual browser play at 390×844 portrait, 667×375 short landscape, and
  1280×720 desktop;
- Starfighter objectives and late stages at levels 1, 14, and 23;
- the Belltower Relay and Seraph Raid reveal/combat flow;
- Breaker and Starfighter versions of the Live Grid objective;
- opening, tutorial, objective, boss, and touch-control states;
- the generated mobile scenes under `.gate-shots/`, including objective,
  charge, boss combat, relay, siege, raid, results, and draft captures;
- the full `npm test` release gate, which passed 103/103;
- the redesigned campaign matrix in
  `docs/baselines/aft008-redesigned-campaign.json`;
- source tracing through the clear guard, objective completion, charge,
  time-scale, HUD, announcement, touch-control, and projectile loops.

The deterministic autopilot is useful for relative balance and regression
evidence. It is not a substitute for human dodge, readability, or input-feel
judgment. All tuning below therefore requires both seeded measurements and a
short human acceptance pass.

## Confirmed findings

| Priority | Finding | Status | Player impact |
|---|---|---|---|
| P0 | Objective stages can enter results while dispersing actors are still on screen | Confirmed in logic and passing screenshots | The level appears to end before the player finished it |
| P0 | Clear-exempt grid terminals/friendlies remain non-dead renderable actors | Confirmed in clear/render logic | Neutral props still look like undefeated enemies |
| P0 | Enemy shots and column strikes are not comprehensively gated to live combat | Source-confirmed latent defect | A late hazard can continue simulating after the win |
| P0 | Narrow stage title and objective/finale meter occupy the same top row | Confirmed visually and geometrically | Core instructions overwrite one another |
| P0 | Trial/hero announcements and tutorials can cover live formations or the player | Confirmed at both phone orientations | The first seconds of combat are partially blind |
| P0 | Touch controls cover the player, bosses, actor labels, and telegraphs | Confirmed, worst at 667×375 | Players lose sight of what they control or must dodge |
| P0 | Multi-actor labels and bars overlap other actors | Confirmed in Relay/Raid/Siege | Targets become hard to identify and prioritize |
| P0 | Charge/projectile clocks use inconsistent time domains | Confirmed in source | Charged shots visibly lurch between speeds without a clear reason |
| P0 | Touch charge has a platform-only 220 ms delay | Confirmed in source | Tap fire feels late and full-charge timing differs from desktop |
| P1 | Results/draft panels allow too much live-world contrast through | Confirmed in generated captures | Cards compete with enemies, boss art, and old combat text |
| P1 | The mobile screenshot gate checks containment, not overlap or actor occlusion | Confirmed by green gate plus visibly bad captures | Serious layout regressions still ship green |
| P1 | The “results” mobile fixture is not reliably capturing the results state | Confirmed in generated artifact | A named release-gate surface is effectively untested |
| P1 | Finale time varies by more than 7× between modes at the same level | Confirmed in baseline | Some finales are exhausting while others evaporate |
| P1 | Late-game damage growth outruns encounter durability | Confirmed in baseline | The campaign becomes easier and less dramatic as stakes rise |
| P1 | Build paths have a roughly 3.8× duration spread in the same probe | Confirmed in baseline | Defensive choices feel like punishment; Bond dominates tempo |
| P1 | Defensive economies can erase attrition while early Blaster still collapses | Confirmed in baseline | Difficulty is inverted across the run |
| P2 | Long all-caps titles preserve bounds by shrinking/ellipsizing important words | Confirmed visually | The player cannot reliably learn the encounter name or instruction |
| P2 | The canvas UI remains absent from the accessibility tree | Known open issue | Screen-reader and non-visual navigation remain unsupported |

## Representative evidence

### Visible-clear problem

`completeNonAttrition()` and `completeProtect()` convert remaining shooter
actors into `crosser` departures. The clear guard explicitly accepts every
actor that is dead, a barrier, a crosser, friendly, or a grid terminal.
Results can therefore begin in the same update in which departure is armed.
`drawBricks()` continues to draw every non-dead, non-dormant actor outside the
menu and codex. The result is mechanically legal but visually reads as an
unfinished fight.

The same issue applies to finale-specific stood-down actors such as Circuit
grid terminals. Those terminals have high placeholder HP, are excluded from
the clear condition, and remain visually enemy-shaped.

The world update also continues to advance crossers, enemy shots, and column
strikes outside `play` in several loops. Collision branches can still call
`loseLife()` without first proving that the game is in live combat. This was
not observed as a hit during the manual pass, so record it as a
source-confirmed latent defect, not a reproduced player death.

### UI composition problem

On narrow screens:

- the wave title uses `waveY = 48`;
- the objective/finale pill begins at `SAFE_T + 44` and is 26 px tall;
- score and health occupy the first HUD row;
- element and build identity continue down the left;
- pause and sound occupy the top-right playfield;
- touch fire and Surge consume much of the lower-right playfield.

This creates a set of individually contained surfaces with no shared owner.
The 390×844 Live Grid screen showed title, objective pill, health, vessel
identity, build text, and controls stacked over the same upper band. The
667×375 Relay and Raid screens added overlapping actor names, HP bars, a
tutorial, and control rings over the live formation. The Siege capture placed
two transient instructions on top of one another while the boss sat under the
health and pause controls.

### Charge-speed problem

The current clocks are:

- touch intent: real wall time via `performance.now()`, 220 ms;
- charge fill: raw update `dt`, 1.1 s base or 0.8 s with Heavy Bolt;
- resonance/overcharge: raw update `dt`;
- player projectile movement: `900 * timeScale() * dt`;
- `timeScale()`: Slow-Mo ×0.5, starter Chill ×0.7, settings ×0.6–1.6,
  dramatic slow motion ×0.3.

The Heavy Bolt difference is intentional and documented in its upgrade
description. The unexplained variation comes from mixing the clocks and from
temporary world slow effects also slowing the player’s projectile after it
has been fired. The larger charged sprite makes this more noticeable than it
is on normal bolts.

### Balance problem

Current redesigned-campaign evidence:

- Starfighter finale sweep: L3 84.6 s, L6 63.3 s, L9 51.7 s, L12 54.2 s,
  L15 52.3 s, L18 31.8 s, L21 20.1 s, L24 13.8 s, L27 27.2 s.
- Late non-finales: L23 7.8 s, L25 18.1 s, L26 14.1 s.
- Same-finale mode probes:
  - L3: Breaker 321.2 s, Blaster game over after 164.0 s, Starfighter 61.2 s.
  - L12: Breaker 220.5 s, Blaster 405.5 s with a knockout, Starfighter 56.9 s.
  - L21: Breaker 50.6 s, Blaster 26.7 s, Starfighter 17.7 s.
- Level-15 path probes:
  - Arsenal 54.6 s, Impact 57.9 s, Prism 66.4 s;
  - Aegis 154.0 s, Surge 131.0 s, Bond 40.6 s;
  - Immortal 138.7 s, Guardian 40.6 s.
- The continuous normal Starfighter run completed all 27 stages in about
  16.4 minutes of play, took only 9 damage, had zero knockouts, and accepted
  all 26 permanent drafts.
- The Aegis economy probe earned seven shield charges, absorbed five hits,
  took zero damage, and ended at full health.
- Electric vessel sustained damage is about 45% above the median alternative
  in the current vessel probe.
- Easy/normal/hard/One Life level-15 probes all cleared with zero damage;
  normal, hard, and One Life finished within four seconds of one another.

These are not all individual “bugs.” Together they show that expected player
power, per-mode damage delivery, enemy work budgets, recovery, and authored
minimum encounter time are no longer aligned.

## Design rules for the remediation

1. A stage may be won by defeating, dispersing, rescuing, sealing, or
   outmaneuvering actors, but the screen must visibly resolve that verb before
   results appear.
2. Nothing can damage the player outside an explicitly live combat state.
3. Only one primary instruction can own a screen region at a time.
4. The objective is more important than the stage title; an urgent telegraph
   is more important than flavor copy; live actors are more important than
   all non-urgent copy.
5. Touch controls must not cover the player’s resting lane, active target
   labels, or mandatory telegraphs.
6. Player weapon timing must use named, testable time domains. Temporary enemy
   slow effects must not secretly alter player projectile travel.
7. Upgrades should change strategy and power, but no normal build should make
   the final act trivial or make a finale take several minutes.
8. Do not solve pacing with long invulnerability locks. Every authored beat
   must offer meaningful actions and at least one opportunity to use its
   counter.
9. Preserve the three modes, all nine finale formats, current storage keys,
   the skin-neutral engine, and the no-enemy-fire Breaker contract.

## Execution plan

### Phase 0 — lock reproductions and repair the audit gate

Goal: make every confirmed issue reproducible before changing behavior.

Tasks:

- Add deterministic fixtures for:
  - objective completion with five visible actors still alive;
  - Circuit completion with two live grid terminals;
  - a boss killed while a shot and a column strike are still active;
  - narrow title plus objective/finale meter;
  - Relay with three local labels;
  - Trial Mode plus tutorial plus live actors;
  - touch player parked beneath the control cluster;
  - charge at normal, Slow-Mo, Chill, dramatic slow motion, and all game-speed
    settings;
  - touch holds at 100, 200, 220, 300, 800, 1,100, and 1,400 ms at 30/60/120
    Hz.
- Fix the results scene builder so its screenshot proves
  `G.state === 'results'` before capture. Fail rather than silently capturing
  a launch announcement.
- Save state metadata beside every mobile screenshot: state, level, mode,
  viewport, active overlays, objective/finale, live actors, and controls.
- Add a temporary expected-failure group for overlap and post-clear safety.
  Remove each expected failure in the phase that fixes it.
- Correct the closeout report generator so redesigned output names and links
  the redesigned JSON rather than calling itself the old-campaign baseline.

Acceptance:

- Every issue above has a deterministic failing assertion.
- A screenshot name cannot disagree with the actual game state.
- Baseline and closeout reports identify their source JSON and commit
  correctly.

### Phase 1 — introduce an explicit stage-resolution state

Goal: make “won” visually and mechanically unambiguous.

Tasks:

- Add a short `resolve` state or equivalent stage substate between live combat
  and results.
- On entry:
  - stop hostile spawning and attack directors;
  - clear or harmlessly dissolve enemy shots, telegraphs, and column strikes;
  - grant post-clear invulnerability immediately;
  - stop accepting combat fire except an optional harmless celebration shot;
  - classify every remaining actor as defeated, dispersed, rescued,
    neutralized, or persistent scenery.
- Give each completion verb a readable 0.65–1.1 s exit:
  - defeated actors finish their shatter/faint;
  - dispersed actors accelerate out with a shared trail and sound;
  - neutral grid terminals dim, fold, or convert to abstract lights;
  - friendlies fly to safety;
  - persistent scenery loses all enemy bars, rings, and targeting.
- Transition to results only when all relevant actors are off-screen or the
  1.1 s safety timeout expires. The timeout force-retires remaining actors.
- Capture a sanitized static arena plate for results/draft, or render a
  dedicated non-live background. Do not continue drawing or simulating the
  combat object graph behind these panels.
- Add outcome language to results: for example, `18 DEFEATED · 7 DISPERSED`,
  `3 VOWS PASSED`, or `2 TERMINALS NEUTRALIZED`. Non-attrition success should
  feel rewarded rather than like missing kills.
- Gate every damage and collision path on an explicit `combatIsLive()` helper.
  Include enemy shots, column strikes, danger line, objective-friendly hits,
  and any finale rush/contact checks.

Acceptance:

- No non-dead enemy-shaped actor is visible when results become interactive.
- No call to `loseLife()` is possible in resolve, results, ceremony, upgrade,
  menu, codex, game-over, or ending states.
- Objective wins preserve score, medal, Preparation, crest, and draft rules.
- A departing actor never grants an extra kill, drop, catch, Surge, or relic
  proc.
- Last-hit pickups still receive a fair catch window, now inside a harmless
  resolution state.

### Phase 2 — replace independent overlays with one layout/priority authority

Goal: eliminate text-on-text and text-on-combat collisions.

Tasks:

- Create a screen-region occupancy model with named surfaces:
  `topStatus`, `primaryGoal`, `combatField`, `urgentTell`, `shipLane`,
  `touchControls`, and `modal`.
- Route all HUD and transient content through one priority order:
  1. modal/reveal;
  2. urgent lethal tell;
  3. primary objective/finale meter;
  4. current target state;
  5. reward/phase transition;
  6. tutorial;
  7. flavor, stage title, build summary.
- On screens under 560 px:
  - merge the realm/stage breadcrumb into the objective/finale pill, or hide it
    while a live goal exists;
  - never draw the separate wave title at `y=48` beneath that pill;
  - collapse element/build identity to small bottom-left chips or the pause
    screen when space is occupied.
- Permit only one transient banner in `urgentTell` and one in
  `primaryGoal`. Queue, coalesce, or drop lower-priority copy.
- Trial Mode must finish before live combat begins. Show it in the frozen
  pre-engage/reveal flow, then retire it.
- The generic movement/fire tutorial must yield to objectives, finale meters,
  actor labels, and urgent tells. Prefer small control-adjacent coaching
  pulses over a full-width banner.
- Move live sound control into pause/settings. Keep one 44 px pause target in
  the top HUD instead of two large circles over the formation.
- Use an opaque or strongly blurred backing plate for results and drafts.
  Prevent old boss labels, guard text, and sprites from reading through cards.

Acceptance:

- No two registered UI rectangles overlap unless the lower item is explicitly
  marked as a background.
- No tutorial or announcement intersects an active enemy/player bounding box
  on the deterministic phone scenes.
- The objective/finale name is legible without ellipsis at 390×844 and
  667×375. Secondary readouts may collapse first.
- Pause, settings, results, and draft remain fully usable with left-handed and
  135% button-size settings.

### Phase 3 — make actors and controls respect the combat-safe viewport

Goal: keep the action visible around phone controls.

Tasks:

- Derive a `combatSafeRect()` from HUD, safe-area insets, and touch-control
  geometry.
- Spawn and clamp bosses, sentinels, objective actors, world labels, and
  mandatory telegraphs to that rectangle rather than raw `W × H`.
- Reserve the lower-right control footprint from player idle position and
  lethal tell placement. A player may enter the area deliberately, but the
  game should not spawn or auto-settle them underneath it.
- Keep critical actor names out of world-space pileups:
  - show only the active/attackable actor’s local name and bar;
  - represent other members in a compact roster rail with pips;
  - use target rings and aspect colors for identification;
  - add label separation as a fallback, never as the primary solution.
- Scale oversized finale art to the safe combat field. Reveal art can remain
  large; docked combat art must not sit beneath the health bar or pause target.
- Fade non-pressed fire/Surge controls enough to see movement behind them, but
  never rely on transparency to make a mandatory telegraph readable.

Acceptance:

- The player, active boss core, active target bar, and urgent telegraph each
  retain at least 90% of their area outside control rectangles.
- Relay, Raid, Siege, Hourglass, and Chase pass dedicated three-actor
  readability scenes at both phone orientations.
- Left-handed controls mirror the exclusions and actor layout correctly.

### Phase 4 — unify charge, input, and projectile time

Goal: make the same gesture produce the same timing and explain intentional
changes.

Recommended time domains:

- `settingsScale`: the user’s explicit global speed choice;
- `hostileScale`: Slow-Mo and starter Chill, applied to enemies and hostile
  patterns, not to player weapons;
- `cinematicScale`: visual drama only; either suspend input/projectiles during
  the short beat or keep player projectiles unscaled;
- `inputClock`: wall time for tap-versus-hold intent;
- `weaponClock`: a named clock shared by charge fill, resonance, overcharge,
  heat, and player projectile travel.

Tasks:

- Remove Slow-Mo, starter Chill, and dramatic slow motion from player
  projectile displacement.
- Decide one documented rule for the game-speed setting. Recommended:
  `settingsScale` affects the weapon clock as well as the world so charge fill
  and projectile travel retain the same ratio at Chill/Turbo.
- Measure touch charge from the original press. When the 220 ms intent
  threshold promotes to charge, credit the elapsed hold instead of beginning
  charge at zero.
- Tune the intent threshold after real-device testing; target 160–200 ms if
  accidental holds remain low. Give immediate press-down visual and haptic
  feedback even though the bolt is committed on release.
- Match full-charge timing from initial press:
  - base: 1.10 s ± 0.05;
  - Heavy Bolt: 0.82 s ± 0.05;
  - same result on touch, mouse/Shift, 30/60/120 Hz, and one simulated
    long-frame hitch.
- Keep Heavy Bolt’s faster fill—it is a valuable identity—but add a persistent
  `FAST CHARGE` state cue on the fire ring and a distinct pitch/fill treatment.
- Add a short Slow-Mo/Chill chip with a clear `ENEMIES SLOWED` description so
  the benefit does not imply that the player’s weapon should crawl.
- Instrument press time, promotion time, full time, release strength,
  resonance result, projectile travel time, active time domains, and frame
  cadence in `DEV.report()`.

Acceptance:

- A charged shot’s travel time does not change when Slow-Mo, Chill, or a boss
  defeat cinematic starts.
- Touch and desktop reach the same charge percentages for equal total holds.
- Tap fire never emits a charged shot below the threshold and provides
  immediate press feedback.
- Resonance remains optional and possible at every supported frame rate.
- No input can get stuck charging after pause, visibility loss, touch cancel,
  or results transition.

### Phase 5 — establish encounter-duration and authored-beat budgets

Goal: let each finale’s distinct mechanic be seen without creating sponges.

Adventure targets:

| Surface | Starfighter | Blaster | Breaker |
|---|---:|---:|---:|
| Arrival/Challenge | 25–45 s | 30–50 s | 35–60 s |
| Finale | 55–90 s | 60–95 s | 70–110 s |
| Absolute normal-mode cap | 110 s | 120 s | 135 s |

Additional rules:

- Same-level mode duration ratio should normally remain below 1.6×.
- No late normal stage should clear below 20 s in the progressive-build sweep.
- Every finale major beat must expose at least one complete teach/tell/commit/
  resolve/recover cycle unless the player executes its authored mastery
  counter immediately.
- Power should shorten a beat by solving it efficiently, not skip its rules.

Tasks:

- Add per-mode expected-DPS curves at each realm based on baseline,
  mid-offense, and high-offense builds.
- Replace the one-size-fits-all work budget with measured mode coefficients.
  Do not change enemy attack rules between skins.
- Shorten the extreme early Breaker/Blaster health work; increase late
  durability and/or counter work where the current build deletes the format.
- Use mechanic work—stations, passes, seals, locks, chains, real cells,
  ordered rites—to set minimum meaningful duration. Avoid arbitrary immune
  timers.
- Review `workHp / beUnit` after every change so a visual actor is not carrying
  hidden health inconsistent with its role.
- Add a full nine-finales × three-modes normal matrix, not only levels
  3/12/21/27.

Acceptance:

- L3 and L12 no longer exceed the caps or game-over under the reference build.
- L21/L24/L27 each remain on screen long enough to communicate every major
  beat.
- All 27 progressive Starfighter stages clear; no non-finale is below 20 s,
  and finale duration does not monotonically collapse with progression.
- A strong build is measurably faster than baseline but cannot erase an entire
  finale format before its first counter opportunity.

### Phase 6 — rebalance player firepower and upgrade paths

Goal: preserve build identity without a dominant or punitive route.

Tasks:

- Establish a campaign-wide baseline weapon growth independent of path
  selection. Permanent drafts should specialize the weapon rather than be the
  only way its damage keeps pace with enemy durability.
- Re-run marginal path probes with identical seed, vessel, offered build, and
  active-use policy.
- Bring single-path clear times within ±25% of the median. A defense-first path
  may be up to 35% slower only if its survival gain is clear and valuable.
- Audit:
  - Volley bolt count, 60% split damage, Hyper cadence, and heat;
  - Impact width, charge fill, splash, pierce, and resonance multiplication;
  - Prism matchup/stack multipliers and aspect uptime;
  - Bond relic damage, intercept frequency, returns, and Guardian;
  - Surge uptime, gain sources, overflow, and late-window damage;
  - Aegis retaliation/lance access, regeneration, and defensive opportunity
    cost;
  - fusion/apex multiplication order.
- Reduce Bond/Guardian’s tempo dominance without removing the returning-relic
  identity. Prefer proc cadence or boss-cap tuning over a blanket damage nerf.
- Give Aegis and Surge an active, bounded damage conversion so they do not
  triple encounter time: for example, absorbed threat can bank one
  counterstrike, and intentional Surge timing can open a short damage window.
- Bring Electric vessel sustained damage to no more than about 20–25% above
  the median alternative, or add an equally visible heat/defense tradeoff.
- Record damage by base weapon, path, fusion, aspect matchup, Surge, relic,
  splash, and counter mechanic without double attribution.

Acceptance:

- Same-seed level-15 path probes fit the duration spread above.
- No vessel is a mandatory best choice across both swarm and boss scenarios.
- Normal and charged fire both remain useful; charge is not mandatory for all
  damage and normal fire cannot invalidate armored/counter mechanics.
- Heat lockout is 3–10% of active time for a deliberately aggressive normal
  build, below 15% outside an explicit overcharge playstyle.

### Phase 7 — rebalance enemy shields, health, recovery, and difficulty

Goal: produce a rising challenge curve rather than punishing the opening and
trivializing the ending.

Tasks:

- Separate enemy durability from threat. Difficulty should primarily change
  pattern density, tell length, and recovery windows; avoid turning Ace into a
  health sponge.
- Target Ace finale duration at roughly 10–20% above Adventure while raising
  meaningful threat by about 25–40%. One Life keeps the one-hit stake without
  stacking the longest bars.
- Audit shield/guard layers for clear damage feedback. Every blocked hit must
  say why it failed and how to open the target; avoid three simultaneous bar
  metaphors.
- Add a global stage shield-income ledger and soft budget across drops,
  Torrent, Guard, Regen, Rescue, Fusion, and Preparation.
- Suggested Adventure target:
  - ordinary stage: 0–2 earned shield charges;
  - finale: 1–4 earned charges depending on build;
  - Aegis specialist: more reliable access, but not seven charges plus full
    health with no tradeoff every fight.
- Do not drop a heal at full health; convert it to score, shield progress, or a
  visible pity credit. Tie heal pity to actual recent damage and act.
- Suggested human-play Adventure target:
  - skilled run: 0–1 knockouts;
  - typical first clear: 1–3 knockouts over the campaign;
  - 2–4 health segments lost per act before recovery;
  - late acts remain threatening despite a mature build.
- Add manual dodge-policy variants to the harness. The current perfect-ish
  autopilot taking zero damage on every level-15 difficulty is not a useful
  danger discriminator.
- Verify Breaker separately: it has no enemy fire, so its challenge and health
  economy must come from ball loss, formation pressure, and objective
  execution rather than shooter shield assumptions.

Acceptance:

- Difficulty probes separate in threat, damage, and recovery—not only HP.
- Aegis is valuable but cannot make all non-One-Life damage irrelevant.
- Blaster can survive L3 with the reference build while late Starfighter still
  faces meaningful danger.
- Recovery items are useful events rather than full-health clutter.

### Phase 8 — rewards, readability, accessibility, and polish

Goal: make the corrected outcomes feel satisfying and understandable.

Tasks:

- Give every completion verb its own concise result language, sound, and
  animation.
- Use sentence case or mixed-case body copy where the art direction allows;
  reserve all-caps for short labels and calls to action.
- Preserve full encounter names in reveal/results/codex. In combat, use a
  shorter authored alias rather than uncontrolled ellipsis.
- Show mastery progress as completed verbs, not only another meter:
  `3 PASSES`, `2 REAL CELLS FOUND`, `ALL LOCKS BROKEN`.
- Add optional haptic distinctions for tap fire, charge promotion, full,
  resonance, objective complete, and damage. Honor reduced-motion/feedback
  settings.
- Fold this work into AFT-010’s DOM accessibility layer: expose state,
  objective, health, charge, target, pause, results, and draft choices.
- Add a short first-session phone test under AFT-019 after the core fixes:
  launch, move, tap, charge, first objective, first results, first draft.

Acceptance:

- A new tester can explain why the stage ended and what they earned without
  reading source-specific terms.
- Essential combat state is available through the accessibility layer.
- Reduced effects/flash/shake modes preserve every cue required to play.

### Phase 9 — regression matrix, balance reread, and release

Goal: prove the fixes together and prevent a locally correct but globally
unbalanced release.

Required automated matrix:

- all 27 stages in Starfighter on Adventure with a progressive build;
- all nine finales in all three modes on Adventure;
- representative finales on Scenic, Ace, and One Life;
- baseline, offense, defense, relic, Surge, fusion, and apex builds;
- 390×844, 667×375, 740×360, 844×390, 932×430, and 1280×720;
- standard, left-handed, 75%, 100%, and 135% touch controls;
- normal/full/reduced effects and reduced flash/shake;
- touch and desktop charge timing at 30/60/120 Hz plus frame hitches;
- objective success, objective failure, pickup-held clear, knockout retry,
  results, ceremony, draft, ending, and Time Spiral.

Required human pass:

- one fresh Starfighter run through realm 1 on a real phone;
- one late-game trial each for Relay, Siege, Raid, and Chase;
- one Breaker and one Blaster finale;
- deliberate Slow-Mo/Chill/charge interactions;
- deliberate objective success with many enemies remaining;
- pause/resume and background/foreground during charge and clear.

Final balance reread:

- compare new reports against both old and redesigned baselines;
- inspect firepower, charge share, heat, path contribution, enemy work,
  shield sources, health sources, damage taken, knockouts, duration, and
  objective/mastery success;
- reject any fix that merely moves the outlier to another mode, path,
  difficulty, or act;
- update the backlog, implementation log, README/handoff, baseline report, and
  dist only after the complete matrix is green.

Release definition:

- `npm test` green with no expected failures;
- no dirty generated source;
- standalone dist rebuilt with `RESIDUE: none`;
- phone screenshots manually inspected, not merely generated;
- balance targets met or deviations documented with an explicit design reason;
- public builds deployed only after the source and dist commits are both
  identifiable in the handoff.

## Test additions that must remain permanently

1. **Combat-state safety:** property test that no damage function can reduce
   lives outside live combat.
2. **Visible-clear contract:** results cannot activate with an enemy-shaped
   clear-exempt actor inside the viewport.
3. **Overlay collision contract:** registered primary surfaces cannot overlap,
   and no non-urgent surface can cover live critical actors.
4. **Screenshot state contract:** every named screenshot asserts its expected
   state before capture and emits metadata.
5. **Charge-time contract:** equal holds produce equal charge across devices,
   frame rates, and transient world slows.
6. **Projectile-time contract:** player projectile travel is invariant under
   hostile and cinematic slow effects.
7. **Mode-duration budget:** all nine finales × three modes remain within
   approved time bands.
8. **Build-spread budget:** representative path/fusion probes remain within
   the approved median spread.
9. **Recovery budget:** shields and healing are attributed and capped by
   source/stage without breaking One Life or Breaker.
10. **Real artifact review:** release checklist requires a human signoff on
    the generated mobile scenes.

## Likely implementation surfaces

- `js/state.js`: resolution state, actor outcome classification, stage build
  budgets, ledger fields.
- `js/update.js`: clear flow, combat-state gate, time domains, finale cleanup,
  balance coefficients, shield/health budgets.
- `js/input.js`: touch intent timing, charge promotion, cancel/pause safety.
- `js/render.js`: layout authority, combat-safe rectangle, label roster,
  result/draft plate, outcome presentation.
- `js/config.js`: time-scale semantics, difficulty and duration knobs.
- `js/data.js`: path/vessel tuning only after measurement.
- `js/dev.js`: overlay/actor/charge telemetry and exact reproduction helpers.
- `test.html`: state safety, clear, layout, input, and balance invariants.
- the mobile-scene section of `tools/run-suite.js`: state assertions,
  metadata, overlap checks, and coverage.
- `tools/run-baseline.js`: full finale matrix, time-domain probes, corrected
  report provenance.

## Autonomous handoff contract

The implementing session should execute this plan from Phase 0 through Phase
9 without waiting for routine approval. It may make ordinary code,
documentation, test, build, and local-artifact changes inside the repository.
It must not deploy, push, delete user art, rewrite history, or weaken a failing
gate merely to finish. If a phase reveals that a numeric target harms play,
the session may adjust that target only after recording the evidence and
re-running all affected matrices.

At each phase:

1. reproduce and record the failing case;
2. implement the smallest shared-system fix;
3. add or convert permanent tests;
4. run focused tests;
5. run `npm test`;
6. inspect the relevant phone captures;
7. update the running implementation log;
8. proceed only when the phase has no unexplained regression.

The final report must separate:

- confirmed defects fixed;
- intentional mechanics whose communication changed;
- balance changes and before/after measurements;
- remaining risks requiring a real-device owner judgment;
- exact source and standalone build commits if release is later authorized.
