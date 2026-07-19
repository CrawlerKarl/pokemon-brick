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

## Milestone 2 — Normal-fire / charge / heat combat ecology ⬜

Normal fire: destroys micro-projectiles, strips exposed shields, builds
combo/Mega efficiently, maintains pressure while repositioning, rewards aim.
Charge: cracks armor (SHELL ARMOR exists ◐), pierces formations, interrupts
authored major attacks, big splash + feedback. Add perfect-release/resonance
timing, clear readiness/overcharge feedback, enemies that punish
indiscriminate charging, defensive states normal fire solves, armor charge
solves faster, cooling upgrades that change play style, heat tuning across
difficulties and fire-rate upgrades + tests proving fire-rate upgrades don't
make overheating unfair (heat is already time-normalised — keep it).

Done when: neither weapon dominates; early levels don't require charge
mastery; later levels require both; Normal overheat stays ~5–10s sustained
(current ~7.6s unless testing supports better).

## Milestone 3 — Authored encounter director ⬜

Reusable beat system (arrival, formation reveal, escalation, elite
intervention, hazard, recovery, final push, victory) layered on the existing
`JUNKIE_CHOREO`/`G.encounter` clock. Objective families: shield relays,
escort, migration survival, chase, multi-lane defense, capture-without-kill,
projectile-break count, no-overheat section, weather survival, ace
objectives. Every region gets a distinct encounter grammar, not just bigger
numbers. Director limits simultaneous threat (extend `starThreatCap`).

## Milestone 4 — Full boss overhaul ⬜

Prototype with Mewtwo (precision duel/teleport control), Lugia (pursuit,
wind, lane manipulation), Dialga (clockwork timing, arena control). Every
major boss: unique entrance + silhouette (◐ `GAUNTLET_ENTRANCE_NAMES`),
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
