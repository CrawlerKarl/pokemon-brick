# FULL GAME ROADMAP — Starfighter to release quality

Durable roadmap for turning **STARFIGHTER** (internal key `junkie`) into a
polished, full-fledged campaign game. Work proceeds one milestone at a time;
each milestone ends with the full quality-gate checklist (bottom) and a
deployed commit. Progress notes and design decisions live in
`IMPLEMENTATION_LOG.md` next to this file.

Status legend: ✅ complete · 🔶 in progress · ⬜ not started · ◐ partial
(pre-existing systems cover part of it)

---

## Non-negotiable design principles (apply to every milestone)

- Starfighter is the primary game; Breaker/Blaster stay maintained but are
  not expanded until Starfighter reaches release quality.
- Group destruction stays satisfying: synchronized visuals, sound, particles,
  haptics.
- Charge is powerful and spectacular but never the best answer to everything.
- Normal fire, charge, movement, heat, Mega, partner type, and upgrades each
  have distinct tactical value.
- Difficulty comes from readable decisions and execution — never invisible
  hitboxes, unclear shields, unavoidable attacks, or inflated health.
- Every attack communicates danger through shape, motion, contrast, sound,
  and (where supported) haptics. Art may be enlarged for readability, but
  collision stays small and honest (`SHOT_CLASSES` split is the model).
- Music and art stay original — no commercial Pokémon recordings/melodies.
- Mobile performance first: repeated combat effects use sprite caches
  (`shotSprite`/`auraSprite`/…) — never per-frame gradients or shadowBlur.
- Respect `reduceFlash`, safe areas (`SAFE_T/L/R/B`), touch customization,
  and all current accessibility settings.
- Preserve save compatibility; add migrations (checkpoint schema is v3 with
  a never-throws v1/v2 migration — keep that pattern).
- Analytics stay local by default; any external collection is opt-in only.

---

## Milestone 0 — Baseline audit and balance instrumentation ✅
(shipped 2026-07-18, commit 56a51c8)

Build the tools needed to evaluate all later balance/design work.

Already in the repo (extend, don't duplicate):
- ◐ Seeded gameplay RNG: `setRunSeed`/`gameRand` (config.js) — used by the
  daily mode; decorative particles intentionally stay on `Math.random()`.
- ◐ Debug level/boss entry: Trial mode (region × stage × gauntlet-round
  picker, `trialLayout` config.js; grants tree advances via
  `resetRun(startLevel, trial)`).
- ◐ Cheat panel (`CHEAT_ITEMS`, pause screen) for power-up/build states.
- ◐ Minimal run stats: `G.runStats` {bricksBroken, bossesDefeated,
  itemsCaught, damageTaken} + `G.lastDamageCause` + `G.runSummary`
  (state.js:233/1309, update.js:1597).
- ◐ Headless invariant suite: `test.html` (drives `update()` directly,
  `window.TEST_RESULTS`).

To build:
- [x] **Per-level stats layer** extending `G.runStats`: per-level completion
  time, damage taken by cause (projectile kind/species/boss), normal-fire vs
  charge damage dealt, charge uses + wasted charge shots, overheats + cooling
  downtime, upgrade selections, boss phase durations, restarts/quits.
- [x] **Balance report**: dev dashboard overlay + downloadable JSON run
  report that explains why a run ended. Local-only.
- [x] **Deterministic debug launch**: URL params (`?dev`, `seed=`, `level=`,
  `mode=`, `diff=`, `upg=`, `round=`) reusing trial plumbing + `setRunSeed`
  so a level or boss reproduces from a seed.
- [x] **Projectile gallery**: `gallery.html` — every `SHOT_CLASSES` ×
  `TYPE_PROJECTILE_KIND` silhouette, all `BOSS_PROJECTILE_KIND` shapes, and
  the 14+ player `drawTypedBolt` shapes over bright AND dark backdrops, with
  art-radius vs collision-core overlay.
- [x] **Boss phase harness**: headless tests driving bosses through phase
  transitions; asserts phase math, damage gates, shockwaves.
- [x] **Regression tests for the instrumentation itself** (stats record the
  right causes; seeded runs reproduce identical waves).

Done when: a dev can reproduce a level/boss from a seed; reports identify
why a run ended; galleries expose unreadable attacks; existing tests pass.

## Milestone 1 — Gold-standard Kanto vertical slice ✅
(shipped 2026-07-19 across four rounds; tuning notes folded into M9)

Kanto's three stages become the quality template: Arrival teaches movement +
normal fire through play; Challenge teaches armor/shield openings, charge,
heat, interception, intentional dodging, with a mid-stage escalation and a
recovery beat; the finale rebuilds Mewtwo as an exceptional multi-phase boss.
Add region intro, encounter objectives, authored transitions, music
transitions, Kanto scenery motion, results presentation (score, mastery
objectives, catches, build summary, next-region anticipation), short
non-blocking narrative cards, Kanto mastery medals + optional ace objectives.

Done when: a new player learns every essential system without a manual;
Kanto could ship as a public demo; Normal stays challenging but readable.

## Milestone 2 — Normal-fire / charge / heat combat ecology 🔶
(Round A shipped 2026-07-19, commit a00b803 — core ecology in place)

Normal fire: destroys micro-projectiles, strips exposed shields, builds
combo/Mega efficiently, maintains pressure while repositioning, rewards aim.
Charge: cracks armor (SHELL ARMOR ✅), pierces formations, interrupts
authored major attacks (Psystrike ✅), big splash + feedback.

Shipped (Round A):
- [x] **Perfect-release / resonance timing** — `RESONANCE_WINDOW` 0.38s
  after the charge tops out: +25% power, +1 pierce, ×0.7 heat, its own
  chime + `resonants` ledger stat.
- [x] **Readiness / overcharge feedback** — the FIRE pad narrates the whole
  arc: charge % → RESONANT! → RELEASE! → OVERCHARGE.
- [x] **Overcharge cost** — >1.4s on a full charge nets ≈ +0.12 heat/s over
  passive cooling, so hoarding the big shot is no longer free.
- [x] **An enemy that punishes indiscriminate charging** — SPECTRAL VEIL
  (region 3+, ≤2 spirit flyers): charged bolts phase THROUGH the shimmer,
  basic fire always lands. The counterweight to armor.
- [x] **Heat fairness proven** — sustained spam overheats at 7.6s on
  Normal, and the suite asserts fire-rate upgrades can only make that band
  kinder, never crueller.

Still open (later round / M9):
- [ ] Cooling upgrades that *materially change play style* (COOLANT /
  Never-Melt Ice exist ◐ but don't yet reshape a build's rhythm).
- [ ] Heat tuning swept across every difficulty (only Normal is asserted).
- [ ] More defensive states normal fire specifically solves.

Done when: neither weapon dominates; early levels don't require charge
mastery; later levels require both; Normal overheat stays ~5–10s sustained
(currently 7.6s, asserted).

## Milestone 3 — Authored encounter director 🔶
(Rounds A+B shipped 2026-07-19, commits 1886bdd / b3c1533)

Shipped:
- [x] **Reusable beat system** — `REGION_GRAMMAR`/`encounterScript`
  (data.js) + `updateDirector`/`runBeat` (update.js) driving `G.director`.
  Beats fire once at a `p` (progress) or `afterPrev` (delay) trigger.
  Actions: bonusFlock, raid, surge, recovery, finalPush.
- [x] **Director limits simultaneous threat** — `G.director.threatMul`
  multiplies `starThreatCap` via `directorThreatMul()`; recovery eases to
  ×0.35, surge/finalPush raise to ×1.25–1.4.
- [x] **Recovery windows after intensity peaks** — the `recovery` beat
  holds fire ~3.4s, primes heal pity, and eases the threat budget.
- [x] **Distinct region grammars** — KANTO (teaching) and JOHTO (the hunt)
  authored; regions 3-9 use a default escalation→recovery arc.
- [x] **First objective family** — `G.objective`/`ENCOUNTER_OBJECTIVES` +
  `updateObjective` + `drawObjectiveBanner`. **SURVIVE THE MIGRATION**
  (Hoenn challenge) changes the win condition: no clear-by-attrition,
  outlast the timer, the swarm disperses.

Still open (Round C / M9):
- [ ] Entity-based objective families: **escort/defend a friendly**,
  **capture without destroying**, **defend multiple lanes**, **chase a
  fleeing elite** — these need a friendly/neutral entity type.
- [ ] Lighter overlay objectives: break-N-projectiles, no-overheat section,
  shield-relay sequence, weather survival.
- [ ] Author the remaining 7 region grammars (currently on the default arc).
- [ ] Beat types not yet built: formation reveal, elite intervention as a
  distinct spawn, hazard, victory.

## Milestone 4 — Full boss overhaul 🔶
(Rounds A+B+C shipped 2026-07-19 — all NINE finale legendaries AND all
NINE mythicals on the template; design doc: `M4_BOSS_KITS.md`)

Shipped (Round C — the nine mythicals):
- [x] **Channel gate opened to mythics** — the channel-open gate keys
  on a `BOSS_CHANNELS` entry + `!secretBoss` only (Mew VMAX shares id
  151 and stays channel-free; tested).
- [x] **Infra**: `s.orbit.launchType:'column'` (deferred lane strikes),
  `s.feather.home` (slow pilot-stalk), `s.feather.swayAmp`,
  `s.gear.dripEvery`, parameterized `boss.sweep.image*` drops.
- [x] **Nine light kits** (signature / channel, all dur 2.4): Mew ECHO
  BUBBLES / GENESIS WAVE rain; Celebi BLOOM PODS / LEAF STORM pincer;
  Jirachi WISH STARS (deferred Doom Desire lanes) / MILLENNIUM COMET
  columns; Darkrai HAUNTING WISPS (stalking) / DARK VOID pincer;
  Victini V-SPARKS / V-CREATE sweep; Diancie JEWEL TURRETS (+1 DIAMOND
  STORM column per live node) / MOONBLAST rain; Marshadow SHADOW SNEAK
  (rush afterimages) / SPECTRAL THIEF clock; Zarude BINDING VINES
  (every-other-beat drip) / POWER WHIP pincer; Pecharunt MOCHI PUPPETS
  / MALIGNANT CHAIN rain.
- [x] Suite 65 → 67 (two looping mythic-duel tests + VMAX exclusion);
  all nine legendary duels stand as regression guards.

Shipped (Round B — the remaining six):
- [x] **Channel params + two new punish patterns** — `BOSS_CHANNELS`
  entries carry `params {count,w,gap,warnMul,bounce,color}`;
  `spawnChannelPunish` gained `rain` (distinct-lane storm) and `pincer`
  (edges close inward), plus `bounce` on sweep. No-params entries are
  bit-identical (regression-tested).
- [x] **Rayquaza**: METEOR SHARDS (accelerating 2-HP calves, 4-micro
  burst), phase-2 sweep comet wake, DRAGON ASCENT sweep channel.
- [x] **Zekrom**: CHARGE CONDUITS (2-HP nodes that each add a BOLT
  STRIKE column), FUSION BOLT rain channel.
- [x] **Yveltal**: DRAIN WISPS (spiral home, +3% heal clamped at the
  phase threshold — deny to protect your progress), DARK PULSE pincer.
- [x] **Lunala**: LUNAR MOTES (kill 2 to snap PHANTOM PHASE early;
  survivors convert to aimed crescents), MOONGEIST BEAM wide columns;
  channels always clear `phaseT` (desperations stay interruptible).
- [x] **Eternatus**: VENOM CYSTS (live cysts thicken the toxic rain
  7→9), ETERNABEAM wide slow sweep.
- [x] **Koraidon**: AFTERIMAGES (dashes drop stationary launchers that
  fire aimed heavies), COLLISION COURSE bounce sweep (16 strikes).
- [x] Suite 59 → 65; all nine duels covered + three regression guards.

Shipped (Round A):
- [x] **Data-driven desperation channels** — `BOSS_CHANNELS` (data.js)
  replaces the `id===150` hard-gates; punish patterns dispatch through
  `spawnChannelPunish` (`columns` / `sweep` / `clock`), all riding the
  `G.columnStrikes` lane machinery. Mewtwo unchanged (tested).
- [x] **Lugia — THE STORM THAT HUNTS**: STORM FEATHERS (2-HP intercept
  shed, burst into micro fans at the ship band — the normal-fire answer),
  TAILWIND CURRENT (`G.gustDir` drifts player bolts + enemy micros in
  shooter modes — the previously ball-only gust now matters in
  STARFIGHTER), phase-2 pursuit (patrol center hunts the pilot),
  AEROBLAST sweep channel (sequential traveling wall).
- [x] **Dialga — THE CLOCKWORK BASTION**: CHRONO GEARS (2 anti-phase
  orbiting 2-HP nodes dripping metronome shots), TIME DILATION
  (`enemyShotTimeScale()` square-wave lurch, 0.45s period, displacement
  scaled at integration time only), phase-2 volley tightening ×0.85,
  ROAR OF TIME clock channel (rotating safe lane).
- [x] Both duels + the Mewtwo regression covered by the suite (57 → 59).

Shipped (Round D — sentinels + presentation polish):
- [x] **Sentinel GUARD/OPENING rhythm** — sentinels take ×0.55 while
  guarded (hex ring tell); the one that just fired its typed special
  drops guard for 2.4s (full damage, first hit ×1.2, `OPENING!` +
  once-per-wave teach strip). Round 1 is now "punish the attacker."
- [x] **All 27 entrance styles have bespoke motifs** — 13 new FX
  branches (skycoil, suncharge, maelstrom, timesplit, psybreak,
  wishgate, timebloom, victorflare, shadowstep, stampede, monolith,
  orbit, cocoon), strokes-only, reduceFlash-aware.
- [x] **Phase-transition + defeat garnish** — `br.enrageAnimT` scale
  pulse + radial speed lines on transitions; boss deaths add brief
  dramatic slow-mo + a triple type-colored ring echo.
- [x] **Practice phase selection** — `jumpToGauntletRound(round,
  phase)` (mid-band HP), trial-screen PHASE chip row (2/3 chips),
  `DEV.boss(region, round, {phase})`.
- [x] **Phase music layering** — `bossMusicHeat()` 0/1/2 ladder drives
  musicTick: heat 1 = the intense layer, heat 2 (last stand) adds
  double-time hats + a denser counter pulse. Patterns/cfg untouched.
- [x] Suite 67 → 69.

Still open (M4 tail, low-priority polish): bespoke per-species defeat
animations; VMAX enrage garnish (renders via drawMewVmax); the other
polish item: unique entrance + silhouette (◐ `GAUNTLET_ENTRANCE_NAMES`),
three distinct phases (◐ phase framework exists), species projectile family
(◐ `BOSS_PROJECTILE_KIND`), weak point/opening/interrupt, one move best
answered by normal fire + one by charge, phase-transition animation, phase
music layering (◐ boss themes exist), desperation move with counterplay,
bespoke defeat animation + reward, reduced-flash alternative, practice mode
with phase selection (◐ trial round picker is the base). Then roll across
all bosses, mythics, sentinels, gauntlets.

## Milestone 5 — Upgrade-web depth and build identity ⬜

Live previews, named build archetypes, permanent fusion-discovery journal,
practice chamber, limited respec (≈1/region), stronger pilot-rig visual
evolution, combination-specific effects, tradeoffs on top capstones/fusions,
comparison UI, search/filter/focus for the constellation, tests for
eligibility/exclusivity/migration. No filler percentages without a
threshold or playstyle change. (Foundation: 50-node web, FUSION_APEX_PLAN.)

## Milestone 6 — Narrative, campaign identity, and codex ⬜

Journey premise, recurring ally + rival, region arrival/departure beats,
short pre/post-boss dialogue, recurring friendly Pokémon, environmental
storytelling, stronger ending + NG+ setup. Codex: habitat, combat behavior,
projectile identity, weakness/resist, capture history, boss lore, mastery
objectives, discovered build interactions. Story stays short and skippable.

## Milestone 7 — Long-term progression and replayability ⬜

Trainer rank, region mastery medals, skins, trails/palettes/portraits/music
unlocks, achievements, weekly expeditions, boss rush, endless route, custom
modifier runs, run history + records, multiple save profiles + backups,
meaningful NG+, seed sharing (◐ daily shares a seed already).

## Milestone 8 — Accessibility and complete input support ⬜

Keyboard rebinding, gamepad + rebinding + full menu/constellation
navigation, device-aware prompts, separate volume channels (master/music/
combat/UI/haptics), projectile-outline strength, background dimming, text
size, colourblind-safe threat palettes, toggle-charge + reduced-hold
alternatives, auto-fire/aim assist (◐ auto-fire exists), adjustable speed /
reaction-window assists (◐ speed slider exists), mid-campaign difficulty
change without lost progress, visual equivalents for audio cues, optional
haptic equivalents, consistent focus order. Test keyboard-only, mouse,
touch, controller.

## Milestone 9 — Full campaign rollout and final balance ⬜

Apply the Kanto standard + all systems to all nine regions. Verify per
stage: encounter identity, threat budget, projectile visibility,
shield/armor counterplay, normal/charge balance, heat pressure, upgrade
usefulness, boss phases, music transitions, mobile readability,
reduced-flash, performance. Full runs on every difficulty with
representative archetypes; use Milestone-0 instrumentation to fix spikes,
dead upgrades, overused builds, easy bosses.

## Milestone 10 — Release readiness ⬜

Offline/installability, save backup + corruption recovery (◐ loadStore
survives corruption), controller cert-style testing, localization-ready
text, credits/licenses, telemetry privacy disclosure, platform integration,
low-end profiling, lifecycle handling (pause/suspend/orientation/focus),
accessibility docs, store-quality captures + demo path.

**Release identity decision (user decision — do not decide autonomously):**
this is currently a private Pokémon fan project (README already flags
licensing). Before any public/commercial distribution the user must choose
between securing authorization or converting to an original creature
universe. Mechanics work continues regardless.
**DECIDED 2026-07-19:** build an original sci-fi × fantasy skin behind a
runtime toggle — full design in `docs/ORIGINAL_SKIN_PLAN.md` (skin
registry, per-skin storage, 18 classes / 3 disciplines, LIGHT/DARK
affinity, procedural art, rounds S1–S7).

---

## Quality gates (every milestone)

1. `npm run check` · `npm run verify-assets` · full `test.html` suite green.
2. No browser console errors.
3. Inspect 1280×720 desktop, 390×844 phone, short landscape (~844×390).
4. Test every affected mode (all three, even when Starfighter is the focus).
5. Save compatibility (checkpoint migration path).
6. `reduceFlash` behavior. Touch + keyboard inputs.
7. Tests updated for every new invariant.
8. `README.md`, `CLAUDE.md`, this roadmap, and the implementation log
   updated. `git diff --check` clean.
9. Commit, push, trigger Pages build, verify deployed commit == HEAD.
