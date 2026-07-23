# Aetherfall improvement backlog

> ## ⚠ STATUS UPDATE (2026-07-23) — READ THIS FIRST
>
> **Every P0 in this document has since been implemented, tested, and
> deployed.** The analysis below is preserved as written (it is still the
> authority on SCOPE and acceptance criteria, and its P1/P2 ranking is the
> live plan), but several of its *status* statements are now stale:
>
> | This doc says | Reality as of 2026-07-23 |
> |---|---|
> | "`npm test` is a placeholder echo … ~20 minutes, manual" | `npm test` is the real headless gate: **~28–31s**, 85 invariants, both-skin + dist boots, vocabulary scan, 30 mobile scenes with label assertions, wave + boss storm ledgers |
> | AFT-001/002/003/004/005A/005B/006/017/018 pending | **all shipped** — see `IMPLEMENTATION_LOG.md` rounds 2026-07-22f … 2026-07-23c |
> | "boss exports are 192×192; high-res not packaged" | 43 × **512px** boss reveal portraits ship and drive the reveal scene |
> | oath on a `[0.42, 0.72, 1]` curve | replaced by per-channel `OATH_CH` curves (tint/rim/aura/fitting/blend/runes) |
>
> **The live plan is the P1 track**: AFT-007 (ORBITAL RELIC) → AFT-008
> (balance matrix) → AFT-009 (constellation) → AFT-019 → AFT-010 → AFT-011
> → AFT-012. Its acceptance criteria below are unchanged and authoritative.


Last reviewed: 2026-07-23 session closeout (runtime through `ed39d79`;
review started from documentation commit `ee0b250`)

This is the current product backlog for the standalone Aetherfall build. It
supersedes unchecked items in `FULL_GAME_ROADMAP.md` when the two disagree.
That roadmap still contains useful design history, but several of its open
items have since shipped.

## Product direction

- Optimize for phones first, especially short landscape screens. Desktop is a
  supported expansion of the phone layout, not the baseline the phone must
  squeeze into.
- Preserve the 27-stage campaign, the three game modes, the LIGHT/DARK oath,
  and the Relicforge Miniatures / Arcane Alloy art lock.
- Treat LIGHT/DARK as an evolution arc. The oath begins as a restrained mark
  on the chosen hull and becomes spectacular through Forms II and III.
- Prefer clearer presentation, safer progression, and measurable balance over
  adding more raw content.
- Keep combat readable. New art and spectacle must never cover live threats,
  the player vessel, touch controls, or objective state.
- **The engine is shared.** Skins differ in words and art, never in rules.
  Internal identifiers (`G.mega`, the `bond` path key, `pkbrk-*` storage keys)
  ship unchanged by design; every player-facing rename rides a skin-aware
  vocabulary helper. A mechanic that must behave differently per skin is a
  design smell to escalate, not implement.

## Current baseline

- The complete nine-realm campaign, bosses, ending, Time Spiral, daily run,
  trial launcher, stage medals, codex, upgrade web, and LIGHT/DARK vessel
  treatments are present.
- Production art covers 259 base sprites and 259 radiant variants, plus 54
  high-resolution vessel previews plus matching radiant previews, 43 × 512px
  boss-reveal portraits, and 21 Relicforge weapon/utility sprites. The 128px
  combat sprites remain the gameplay assets; the reveal exports serve the
  dedicated entrance scene.
- Shipped and assumed by this backlog: the complete ASPECT + SURGE vocabulary,
  codex full-size sprite gallery, neutral-until-sworn selection, and
  per-channel `OATH_CH` evolution curves for tint, rim, aura, fittings,
  radiant blend, and runes.
- The release gate passes 85/85 invariants and runs headlessly via `npm test`
  in about 28–31s. It also verifies assets, both editions, the standalone
  distribution, vocabulary/RESIDUE, 30 mobile scenes, and wave + boss stress
  ledgers.
- The standalone runtime payload is about 37.4 MiB excluding its nested Git
  metadata, with about 36.1 MiB under `dist-aetherfall/art/`.
- The constellation has six paths and only two direct weapon identities:
  VOLLEY and IMPACT. BOND (engine key `bond`) is the least active path: most
  of its value is passive pickup, score, drop-rate, and life economy that
  overlaps settings, codex rewards, and AEGIS. Redesigning it in place is
  preferable to crowding the mobile constellation with a seventh spoke.

## Evidence from the review (historical P0 findings)

- ✅ AFT-001 resolved the 667×375 HUD/text collisions with safe zones,
  `fitLabel`, shared layout geometry, and permanent containment assertions.
- ✅ AFT-002/004 resolved stacked boss/trial announcements with a prioritized
  queue, clean launch state, a separate reveal scene, and a docked HUD lane.
- ✅ Deep trial launches now show only the selected round/phase; the fully
  expanded trial picker is part of both viewport-fit and mobile-scene gates.
- ✅ AFT-003 removed the 56 Aetherfall-facing `MEGA` strings through the
  skin-aware ordered lexicon; engine identifiers remain deliberately stable.
- ✅ AFT-017 replaced the over-loud early oath with per-form material channels
  and keeps vessel selection neutral until the oath is sworn.
- ✅ AFT-018/005B replaced independent effect ceilings as the only defense with
  a weighted load budget, allocation-free hot-loop culls, cached repeated FX,
  adaptive bloom/glow/emission/resolution rungs, real-rAF cadence detection,
  and wave + boss stress fixtures. Real-phone confirmation of the latest
  cadence round is still open.
- The canvas-only interface exposes essentially no menu or game state to the
  browser accessibility tree. This remains open under AFT-010.

## Priority definitions

- **P0** — shipped foundation; visible quality, player trust, and release
  confidence work completed in the 2026-07-22/23 release-quality pass.
- **P1** — high-value expansion after the P0 foundation is stable.
- **P2** — meaningful follow-up; should not delay the P0/P1 work.
- Effort is a relative estimate: **S** (small), **M** (medium), **L** (large),
  **XL** (multi-system).
- IDs are stable references — never renumbered. AFT-005 is split into two
  stages (A/B) because its halves have opposite scheduling needs.

## Ranked backlog

| ID | Priority | Status | Improvement | Player value | Effort | Depends on |
|---|---|---|---|---|---:|---|
| AFT-005A | P0 | ✅ Shipped | Headless automated release gate (`npm test` for real) | Every later change ships against a gate instead of a 20-minute manual suite run | M | — |
| AFT-001 | P0 | ✅ Shipped | Mobile safe-zone and text-containment system | Stops clipped/overlapping copy in every screen | M | — |
| AFT-003 | P0 | ✅ Shipped | Finish the SURGE vocabulary (the MEGA half; ASPECT half shipped) | Removes the largest remaining Pokémon-era presentation leak | S–M | — |
| AFT-004 | P0 | ✅ Shipped | Clean trial/boss launch state and single-owner announcement queue | Practice starts at the selected fight without stale banners | S–M | AFT-001 |
| AFT-002 | P0 | ✅ Shipped | Full-resolution boss reveal that shrinks into combat position | Shows the boss art and creates a clean, memorable entrance | L | AFT-001, AFT-004 |
| AFT-017 | P0 | ✅ Shipped | Progressive LIGHT/DARK vessel evolution | Preserves the original early hull and makes final evolution feel dramatic | M | — |
| AFT-018 | P0 | ✅ Shipped; hardware check open | Artifact-storm frame stability and adaptive effects budget | Prevents effect-heavy combat from becoming slow or unresponsive on phones | L | AFT-005A for the permanent gate |
| AFT-005B | P0 | ✅ Shipped | Mobile visual-regression scenes and fitted-label assertions | Makes layout, terminology, and presentation regressions catchable before release | M–L | AFT-001–004, AFT-005A |
| AFT-006 | P0 | ✅ Shipped | Save export/import, versioned backup, and storage persistence | Protects a long 27-stage run against Safari storage eviction and corruption | M | — |
| AFT-007 | P1 | ⬜ Next | ORBITAL RELIC redesign of the `bond` path (same keys, new identity) | Adds a genuinely different, mobile-friendly weapon build without a seventh spoke | L–XL | AFT-003, AFT-005A |
| AFT-008 | P1 | ⬜ Open | Full-campaign balance matrix and regression budgets | Finds difficulty spikes, dead builds, and unfair mobile encounters | L | AFT-005A/B, AFT-007 |
| AFT-009 | P1 | ⬜ Open | Mobile-first constellation redesign and build identity | Makes the updated web understandable and touch-friendly | L | AFT-007 |
| AFT-019 | P1 | ⬜ Open | First-session phone experience pass | A new player's first five minutes on the public site land clean | S–M | AFT-001 |
| AFT-010 | P1 | ⬜ Open | Mobile accessibility, staged: settings first, DOM layer second | Broadens who can comfortably finish the campaign | M then L | AFT-001 |
| AFT-011 | P1 | ⬜ Open | Mobile loading, asset streaming, and WebP packaging | Faster startup and lower decoded-memory use on ordinary phones | L | AFT-005A |
| AFT-012 | P1 | ⬜ Open | Whole-game visual integration pass | Carries the locked sprite style into scale, shadows, VFX, HUD, and scenery | L | AFT-001–003, AFT-017 |
| AFT-013 | P2 | ⬜ Open | Codex boss combat dossiers (the sprite gallery already shipped) | Lets players revisit full boss art and learn counterplay | M | AFT-002 |
| AFT-014 | P2 | ⬜ Open | Run history, boss rush, endless route, and custom modifiers | Converts campaign mastery into replayability | XL | AFT-008 |
| AFT-015 | P2 | ⬜ Open | Installable/offline release package and phone lifecycle handling | Makes the phone experience app-like and resilient | L | AFT-006, AFT-011 |
| AFT-016 | P2 | ◐ Incremental | Architecture and documentation cleanup | Lowers the cost and risk of future content work | L | after feature churn |

## Detailed acceptance criteria

### AFT-005 — Automated release gate (two stages)

**Stage A — headless gate (schedule FIRST; nothing depends on the UI work).**

- Replace the placeholder `npm test` echo with a headless-browser runner that
  serves the repo, loads `test.html`, waits for `window.TEST_RESULTS`, and
  exits non-zero on any failing invariant or uncaught console error.
- Kill the 20-minute fronted-tab constraint. Headless pages are not subject to
  the same background rAF throttling, and the suite already drives the sim
  clock directly — target a full run in single-digit minutes so it can gate
  every commit, not just releases.
- One command runs, in order: `npm run check`, `npm run verify-assets`, the
  invariant suite, save/checkpoint migration round-trips, `npm run build-dist`
  with a required `RESIDUE: none`, and a smoke boot of the built dist (plus
  both skins booting in the workshop).
- Treat uncaught console errors, missing art, fallback procedural art where a
  production override exists, and forbidden Aetherfall vocabulary (see
  AFT-003) as failures.

**Stage B — visual regression (after AFT-001–004 stabilize the screens).**

- Add deterministic mobile screenshots for home, setup, settings, arrival,
  objective, boss reveal, boss combat, charge/overheat, Surge-ready, upgrade
  draft/web, results, codex, ending, and game over.
- Add semantic assertions for every fitted label: its measured bounds must be
  contained by its declared layout region (the AFT-001 primitives make this
  checkable).
- Add a deterministic artifact-storm benchmark that runs the worst realistic
  combination of group kills, projectiles, trails, fragments, rings, boss VFX,
  upgraded weapons, affinity effects, and bloom (consumed by AFT-018 as its
  permanent gate).
- Required clean viewports: 667×375, 740×360, 780×360, 844×390, 932×430,
  390×844, and the existing 1280×720 desktop reference. This list is shared
  with AFT-001 and owned here.

### AFT-001 — Mobile safe zones and text containment

Create shared layout primitives instead of fixing individual strings with
smaller hard-coded fonts.

- Define reserved mobile zones for the top HUD, objective/status banner,
  combat field, player vessel, bottom pickups, and touch controls.
- Add shared fitted-text and wrapped-text helpers with minimum readable font
  sizes, measured bounds, line limits, and ellipsis/fallback copy.
- A label must never depend on canvas `fillText(..., maxWidth)` compression as
  its only containment strategy.
- Collapse secondary HUD copy before shrinking primary copy. On short phones,
  show the wave, objective, health, and controls first; move build detail into
  a tap/hold inspection surface.
- Keep touch action labels inside their circles. Rename and shorten states
  where needed: `TAP`, `HOLD`, `READY`, `COOLING`, and `SURGE` are preferable
  to tiny multi-clause strings.
- Add a developer safe-zone overlay that shows text bounds and reports any
  draw outside its assigned rectangle.
- Build every new fitted label against the final Aetherfall copy — land the
  AFT-003 vocabulary helper before (or alongside) the label retrofit so no
  label is fitted twice.

### AFT-003 — Finish the SURGE vocabulary migration

The type half shipped 2026-07-22 (ASPECT lexicon via `typeLabel()` /
`typeWord()` / `SKIN.typeNames`). What remains is the **MEGA half**: 56
player-facing strings in the dist today. The public concept is **AETHER
SURGE**. `CHARGE` remains the held weapon shot; these are two different
systems and must never be conflated.

| Old public term | Aetherfall term |
|---|---|
| Mega / Mega Evolution | Aether Surge / Surge |
| Mega meter | Surge meter |
| Mega ready | Surge ready |
| Mega active | Surge active |
| Hits charge Mega | Hits build Surge |
| Mega duration / damage | Surge duration / damage |
| Mega button | Surge button |

- Follow the pattern that already worked for types: a skin-aware helper
  (e.g. `surgeWord()` / `SKIN.strings.surgeWord`, plus a phrase helper for
  composed copy) with the pokemon skin defaulting to MEGA. No shared UI may
  emit the raw word from either vocabulary.
- Much of the copy lives in shared engine tables (`PATHS.surge` role
  `'MEGA TEMPO'`, tier descriptions, satellite/fusion strings, coach copy,
  the touch button, results, settings). Route all of it through the helper —
  the SURGE path naming converges cleanly ("the SURGE path builds your
  Surge").
- Audit HUD, touch controls, tutorials, upgrade names/descriptions, codex,
  results, settings, announcements, logs intended for players, and README.
  Avoid a blind replacement where `charge` means the held charge shot.
- **Internal identifiers do not rename.** `G.mega`, `megaT`, `tryMega`,
  `megaDur`, stat ledger keys, and icon keys are engine vocabulary and ship
  unchanged — the same rule that keeps `br.poke` and `pkbrk-*` keys stable.
  This removes the checkpoint-migration risk entirely; there is no save
  impact, so no migration is needed.
- Acceptance: the player-facing `MEGA` grep of the dist returns zero, and the
  AFT-005A vocabulary scan enforces that permanently.

### AFT-004 — Trial and announcement sequencing

- Starting at a selected gauntlet round/phase clears banners, entrances, and
  story cards belonging to earlier rounds.
- Exactly one trial notice and one selected-boss reveal may be queued.
- Announcement panels use a single owner/priority queue; objective state,
  trial state, boss reveal, and combat tips may not all occupy the same lane.
  This queue is the surface AFT-002's reveal scene plugs into — build it
  first.
- No announcement may cover the player vessel or touch controls on required
  mobile viewports.
- Add tests for direct launches to all 27 stages, every gauntlet round, and
  every selectable boss phase (runnable under the AFT-005A gate).

### AFT-002 — Full-resolution boss reveal and clean combat transition

Use the high-resolution boss sources to make the entrance a separate scene,
not another layer inside active combat.

1. Freeze combat and clear ordinary announcements (via the AFT-004 queue).
2. Show a 512–768 px runtime boss portrait at the largest size that fits the
   phone safe area. Keep the art unobstructed; place the name, title, realm,
   phase count, and one short counterplay cue in a dedicated panel below or
   above it.
3. After a short skippable hold, animate the same art from its reveal
   rectangle into the boss's combat rectangle. Cross-fade to the 192 px combat
   sprite only after it has reached combat size.
4. Dock the combat name/health bar to a HUD lane, not to the sprite's hitbox.
   Long names such as `VELMORA, THE FIRST ORACLE` must fit without crossing the
   art or phone health display.
5. Start hostile simulation only after the transform and UI docking complete.

Additional requirements:

- Create optimized boss-reveal exports from the existing masters; do not ship
  1–2K source files directly. Reveal exports go through the existing art
  pipeline tooling and obey its two hard rules: read the chroma colour off the
  frame (green AND magenta screens exist), and match the finals' 79% subject
  framing so art never jumps size between surfaces.
- Use one entrance contract for all legendaries, mythics, sentinels, and the
  secret boss, while retaining their authored motion styles.
- Reduced-motion mode uses a dissolve/scale cut with the same information and
  no camera sweep.
- Tapping skips the hold but never skips into an undodgeable attack.
- The codex reuses the same reveal asset (AFT-013), so the extra payload
  serves two player-facing purposes.

### AFT-017 — Progressive LIGHT/DARK vessel evolution

Already live as of 2026-07-22: the form-graded `[0.42, 0.72, 1]` curve and
neutral-until-sworn on vessel select. This item is the second, deeper step:
the oath should be recognizable at Form I, developed at Form II, and
unmistakable only at Form III. It must feel as though the affinity evolves
with the vessel rather than being a complete costume applied at selection.

| Form | LIGHT treatment | DARK treatment | Shared silhouette treatment |
|---|---|---|---|
| I — oath mark | Keep the normal hull. Add a small warm rune/highlight and at most a faint gold material bias. Do not swap to the full radiant casting. | Keep the normal hull. Add a narrow violet inlay and slight cool shadow bias without blacking out the base materials. | No full rear fitting. Use a small oath clasp, shard, or 20–30% fitting reveal; almost no aura. |
| II — affinity taking hold | Blend in selected radiant materials, brighter runes, and a controlled gold rim while retaining substantial original hull colour. | Deepen selected armor zones, develop violet energy channels, and strengthen the cool rim while retaining readable original materials. | Introduce roughly half of the rear fitting and a moderate aura. The evolution ceremony should visibly grow these pieces. |
| III — completed oath | Use the true radiant casting, full sun-forged fitting, bright engraved channels, and the complete restrained gold aura. | Use the complete umbral grade, full crescent fitting, developed amethyst channels, and the complete restrained violet aura. | Full silhouette differentiation and the strongest affinity effects; this is the first form that should read as obviously LIGHT or DARK at a glance. |

- Replace the current `[0.42, 0.72, 1]` presentation curve with a much quieter
  starting curve. Initial targets are approximately `0.10 / 0.48 / 1.00` for
  tint/aura strength and `0.25 / 0.60 / 1.00` for fitting scale/opacity;
  finalize through phone-size visual testing rather than treating the numbers
  as immutable.
- Separate LIGHT's source-art choice from affinity selection: Form I uses the
  base casting, Form II may blend base and radiant treatments, and Form III
  earns the full radiant source.
- Scale fitting geometry, fitting opacity, aura radius, rim intensity, rune
  count, and material replacement independently. A single alpha multiplier is
  not enough to create an evolution arc.
- Make each evolution ceremony show the affinity growing onto the vessel. The
  new wings/fitting, runes, and material grade should resolve during the
  transformation instead of appearing before it.
- Preserve class/family recognition at every affinity. LIGHT and DARK change
  the oath treatment, not which vessel the player chose.
- Add side-by-side mobile reference captures for all 18 vessel families ×
  three forms × LIGHT/DARK. Form I must remain closer to its neutral hull than
  to Form III; Form III must be immediately distinguishable without relying
  on text or aura colour alone.
- Reduced-effects mode keeps the material and silhouette progression while
  removing only animated bloom/pulsing.

### AFT-018 — Artifact-storm frame stability

Treat frame rate as part of combat correctness. A screen full of rewards,
debris, projectiles, trails, and upgrade effects must not make steering,
dodging, charging, or touch input feel slower.

**Shipped implementation (2026-07-22/23):** allocation-free in-place culls;
baked hot-loop gradients/glows; weighted `fxLoad`; `AUTO` / `FULL` /
`REDUCED`; bloom/glow/emission/resolution fallbacks; actual rAF-cadence
profiling (including hit-stop); `DEV.perf()` FPS diagnostics; simulation
identity tests; and deterministic wave + boss storm ledgers with hard
gradient/blur budgets. AFT-018 is code-complete. The remaining action is
owner confirmation on the real phone; deeper rungs require that evidence.

- Add a lightweight frame profiler that records update time, actor drawing,
  projectile drawing, decorative effects, bloom/compositing, HUD drawing,
  total frame time, active effect counts, and garbage-collection-like spikes.
- Define at least one mid-range and one low-range phone reference. Target 60
  FPS on the mid-range device with P95 frames at or below 16.7 ms and no
  sustained run of frames above 25 ms. Set an explicit 30 FPS fallback budget
  for the low-range device instead of allowing uncontrolled degradation.
- Create deterministic stress fixtures for the real peak combinations:
  late-campaign boss patterns, maximum credible enemy fire, group destruction,
  Twin/Hypernova or the future ORBITAL RELIC path, charged detonations,
  fragments, reward pickups, affinity effects, telegraphs, and full bloom.
- Replace independent effect ceilings with one weighted visual-effects budget.
  A large blurred ring costs more than a tiny cached spark; counts alone are
  not a sufficient proxy for GPU work.
- When the moving frame-time average exceeds budget, degrade decorative work
  in this order:
  1. Reduce or skip full-frame bloom/compositing.
  2. Reduce new particle emission and shorten decorative particle lifetimes.
  3. Cull offscreen fragments, ghosts, trails, duplicate auras, and minor rim
     passes.
  4. Lower optional animation sampling before removing an authored sprite.
- Never cull hostile projectiles, telegraphs, hit feedback, objective state,
  the player vessel, boss health, or touch controls. Simulation, hitboxes,
  input sampling, and gameplay timers remain identical at every effects level.
- Remove per-frame collection churn in the hot path. Pool high-volume effect
  objects, expire them in place rather than rebuilding several arrays with
  `filter()` each frame, and reuse scratch target lists where profiling proves
  allocation pressure.
- Audit the 289 gradient/shadow references in `render.js`. Extend the existing
  baked-sprite caches (`shotSprite`, `auraSprite`, `glowSprite`, …) to cover
  repeated surfaces, replace repeated `shadowBlur` with baked sprites, and
  avoid changing canvas composite/shadow state per artifact where batching can
  do the same job.
- Keep a player-facing effects-quality option (`AUTO`, `FULL`, `REDUCED`) with
  `AUTO` as the phone default. Reduced-flash remains an accessibility choice,
  not a disguised performance toggle.
- Make the artifact-storm fixture (built in AFT-005B) part of the release
  gate. Fail on a material frame-time regression, effect-array growth beyond
  budget, uncapped trail growth, or simulation differences between effects
  levels.

### AFT-006 — Save safety

Dependency-free — schedule it early and in parallel. This is not a luxury:
Safari's Intelligent Tracking Prevention can evict script-writable storage
(including localStorage) after roughly seven days without a visit, which can
erase a mid-campaign run on exactly the platform this game targets.

- Request durable storage via `navigator.storage.persist()` where available,
  and surface whether it was granted.
- Export one versioned JSON backup containing settings, checkpoint, codex,
  medals, victories, daily history, and unlocks for Aetherfall.
- Import previews what will change and validates schema before writing.
- Keep at least one recoverable pre-import backup and one rolling autosave.
- If storage is corrupt or unavailable, explain that the session is running
  unsaved instead of silently falling back.
- Add migration and round-trip tests for every supported checkpoint version,
  runnable under the AFT-005A gate.

### AFT-007 — ORBITAL RELIC weapon path

Recommended concept: a returning Relicforge glaive/halo. It is visibly and
mechanically different from rapid VOLLEY fire and heavy IMPACT shots, yet it
needs no new phone button.

**Scope decision — this is an engine redesign riding existing keys, not a
path swap.** The upgrade web is engine; the redesign keeps the `bond` path
key and its four tier keys unchanged, and the skin layer renames the
presentation (Aetherfall: ORBITAL RELIC; the pokemon skin gets its own
fitting returning-item identity via `SKIN`). Consequences:

- No storage-key changes and no rank migration: an owned `bond` rank simply
  becomes the corresponding relic rank. A one-time notice explains the new
  effects — never silently change what an owned pick does without telling the
  player.
- Because the engine is shared, the mechanics change in BOTH skins. The
  suite's pokemon bit-identity guard exists to catch accidental drift from
  the skin split; this is intentional engine evolution, so update the suite's
  expectations deliberately in the same change — never by loosening the
  guard.

Proposed four-tier identity:

1. **RELIC GLAIVE** — every fourth attack launches a broad returning relic.
2. **RECALL EDGE** — the return pass deals bonus damage and can intercept one
   enemy projectile.
3. **TWIN ORBIT** — two relics can be active on offset arcs, covering new
   lanes without doubling single-target damage.
4. **CROWNED RELIC** — a full charge launches every banked relic in a wide
   recall pattern; boss damage is capped separately.

Mode adapters:

- Starfighter/Blaster: the normal fire cadence launches and recalls the relic;
  hold-to-charge remains unchanged.
- Breaker: rally hits bank relic arcs that sweep the upper wall and return to
  the paddle. The ball remains the primary weapon (classic stays calm: relics
  are ball-adjacent, never a gun).
- No extra aim stick or action button is required on mobile.

Required integration with the five remaining paths:

- VOLLEY — faster relic cadence / wider lane coverage.
- IMPACT — heavier outward hit and a detonating recall.
- PRISM — the relic retunes to the useful aspect on each pass.
- SURGE — active Surge accelerates orbit/recall without infinite meter gain.
- AEGIS — a returning relic may intercept fire or reinforce a shield.

Rehoming BOND's essential perks (so the spoke can become a weapon):

- Make ITEM MAGNET a baseline phone quality-of-life behavior or a setting.
- Move FORTUNE into codex/research progression or the existing drop-rate
  setting, where it is more legible.
- Move the periodic extra life into AEGIS, a mastery reward, or a permanent
  campaign unlock.
- Move BOND's score multiplier into medals/mastery so score play remains
  supported without consuming a weapon spoke.

This is still an upgrade-web redesign, not four isolated cards:

- Keep six spokes, six adjacent bridges, 15 pairwise fusions, and two apexes.
- Redesign the five `bond` pair fusions as ORBITAL RELIC synergies under
  their existing keys. Retheme and redesign its AEGIS and VOLLEY bridges.
  Rebuild CELESTIAL GUARDIAN's `bond` sector around the relic loop without
  changing the one-apex limit.
- Rehome the BOND mastery satellite and LIGHT's DAWNLIGHT satellite. Preserve
  earned stack ranks even if their effects and presentation change.
- Preserve every unaffected save key. Never silently delete an owned pick.
- Add one authored Relicforge weapon sprite, clear player/enemy silhouette
  rules, impact/return audio, and reduced-effects treatment.
- Prototype the loop in a deterministic trial scene BEFORE touching the web;
  the go/no-go on replacing BOND's identity is made on the prototype.
- Verify at least three competitive end-run archetypes use ORBITAL RELIC for
  different reasons; it must not simply be the highest-DPS choice.

### AFT-008 — Campaign balance matrix

- Use seeded AI runs and recorded human runs across three modes, four
  difficulties, all 27 stages, LIGHT/DARK, representative pilots, and at least
  eight build archetypes including the new weapon.
- Record completion rate, stage duration, damage source, knockouts, charge-shot
  share, Surge frequency, heat lockout, upgrade pick rate, boss phase time,
  and mobile frame time. The `stats*` ledger machinery already records
  per-wave combat data — build on it rather than adding a parallel recorder.
- Establish regression budgets for difficulty spikes, dead upgrades, dominant
  picks, unavoidable damage, and bosses that die before demonstrating their
  mechanics.
- Keep deterministic fixtures for every issue fixed through balance changes.

### AFT-009 — Mobile constellation and build identity

- Keep the redesigned six-path web legible without requiring precise pinch
  gestures. Do not spend mobile readability on a seventh wedge unless
  playtesting proves the in-place `bond` redesign is worse.
- Use a bottom-sheet inspector, large touch targets, snap-to-focus navigation,
  reliable `FIT`/`FOCUS`, and no tall-viewport anchor drift.
- Show owned build summary, named archetype, next synergy, lock reason, before/
  after comparison, and the exact weapon behavior in the current mode.
- Add a permanent fusion-discovery journal and one limited respec per realm.
- Provide a practice chamber that can spawn a chosen wave/boss with the current
  build without changing the real save.

### AFT-019 — First-session phone experience pass

The public Aetherfall site is many players' first contact with the game, with
no store page or manual around it. Presentation and pacing only — no new
systems.

- Cold-load the public site on a real phone with no saved data; measure and
  minimize time from first tap to first shot fired.
- Verify the three-doors title, vessel select, difficulty cards, and the
  first-wave coach at 667×375 landscape and 390×844 portrait, through the
  AFT-001 fitted-text helpers.
- Confirm the coach copy, the first-volley grace window, and the FIRE pad
  state labels teach the controls without a wall of text.
- Confirm the standalone title screen carries no dead or confusing UI (the
  edition pill is workshop-only) and that mode recipes read correctly to
  someone who has never seen the game.

### AFT-010 — Mobile accessibility (staged)

**Stage 1 — settings-level wins (S–M each, ship piecemeal):**

- Add text size, background dimming, projectile-outline strength,
  colorblind-safe threat palettes, toggle-charge, reduced hold time, and
  visual equivalents for important audio cues.
- Preserve and improve button size, opacity, follow speed, handedness,
  haptics, auto-fire, reduced shake, and reduced flash.

**Stage 2 — structural (L):**

- Add a DOM accessibility layer for menus, settings, results, codex, and the
  upgrade web. Canvas visuals can remain, but choices and state must be
  keyboard/screen-reader discoverable.
- Keyboard remapping and gamepad support remain valuable, but phone touch
  quality has priority.

### AFT-011 — Mobile loading and packaging

- Convert runtime art to WebP where alpha quality remains acceptable; retain
  PNG only when it wins visually or by size. Generate WebP from the masters in
  the existing art pipeline, not by recompressing the shipped PNGs.
- Load the current realm and prefetch the next realm instead of allowing a run
  to accumulate the entire campaign's decoded sprite memory.
- Add a visible boot/loading state and graceful missing-asset fallback (the
  procedural art layer is already the fallback — surface it deliberately).
- Profile representative low/mid-range phones at 60 and 120 Hz. Set budgets
  for first interaction, asset decode time, and peak decoded memory. Combat
  frame-time budgets are owned by AFT-018.

### AFT-012 — Visual integration pass

- Keep the production sprite library; do not restart it. Bring the remaining
  game surfaces into the same material and hierarchy rules.
- Standardize combat footprint, shadow/rim treatment, scale by enemy tier,
  projectile-to-owner relationships, hit flashes, debris, and defeat effects.
- Give each realm a controlled grade and foreground/material accent derived
  from the style bible, while keeping threats readable.
- Make weapon, pickup, projectile, and upgrade icon presentation consistently
  Relicforge rather than mixing authored miniatures with unrelated vector or
  legacy symbols.
- Review the whole campaign at phone size, including LIGHT/DARK forms, reduced
  effects, and every boss reveal.

### AFT-013 — Codex boss dossiers

The codex full-size sprite gallery shipped 2026-07-22; this item is the boss
layer on top of it.

- A per-boss dossier page reusing the AFT-002 reveal asset: name, title,
  realm, phase count, attack names, and the counterplay cue.
- Record the player's history with each boss (defeats, knockouts, fastest
  phase times from the stats ledger).
- Unlock progressively: silhouette before first encounter, full dossier after.

### AFT-015 — Installable/offline package and phone lifecycle

- Service-worker offline packaging so the game loads without a network after
  first visit; installable home-screen metadata.
- Phone lifecycle correctness: pause cleanly on `visibilitychange`, resume the
  audio context on the next gesture, and re-lay-out on orientation change
  without losing state.
- Ties into AFT-006: installed/persistent storage status shown honestly.

### AFT-014 — Run history, boss rush, endless route, custom modifiers

- Unchanged in scope; gated on a healthy AFT-008 balance matrix.

### AFT-016 — Architecture and documentation cleanup

- Unchanged in scope; do it incrementally at subsystem boundaries, not as a
  rewrite that blocks player-facing work.

## Recommended delivery sequence

### Release-quality mobile pass

AFT-005A → AFT-001 → AFT-003 → AFT-004 → AFT-002 → AFT-017 → AFT-018 → AFT-005B

with **AFT-006 in parallel at any point after AFT-005A** (it touches nothing
the UI work touches, and the storage-eviction risk is live today).

**Status: ✅ complete.** All items in this sequence, including AFT-006, are
implemented and guarded by the release gate.

The gate comes first because every subsequent item is safer and faster to ship
against `npm test` than against a 20-minute fronted-tab ritual. The vocabulary
lands before the label retrofit so text is fitted once, against final copy.
The announcement queue (AFT-004, small) lands before the boss reveal (AFT-002,
large) because the reveal scene plugs into it.

### New weapon expansion

AFT-007 trial-scene prototype → go/no-go on the `bond` redesign →
AFT-009 six-path web update → AFT-007 full integration → AFT-008 balance matrix

Prototype the returning weapon in a deterministic trial scene before changing
the web. Once the loop is fun, redesign `bond` in place under its existing
keys, rehome its essential perks, migrate the constellation presentation and
add the five pair synergies; then rebalance the whole campaign instead of
tuning one stage at a time.

### Shipping and replayability

AFT-019 → AFT-010 (stage 1, then stage 2) → AFT-011 → AFT-012 → AFT-013 →
AFT-015, with AFT-014 after the campaign matrix is healthy. Do AFT-016
incrementally at subsystem boundaries, not as a rewrite that blocks
player-facing work.

## Guardrails

- Do not put long introduction cards over live combat. Boss identity belongs in
  the reveal scene and codex; short combat warnings belong in reserved lanes.
- Performance fallback may remove decorative artifacts, but never threats,
  telegraphs, hit feedback, input responsiveness, or simulation accuracy.
- Do not add a new permanent mobile button for ORBITAL RELIC.
- Do not rename internal identifiers or storage keys — `G.mega`, path key
  `bond`, `pkbrk-*` and friends ship unchanged; player-facing vocabulary
  changes ride skin helpers.
- The engine is shared: mechanics land in both skins, words and art differ per
  skin. A mechanic that must behave differently per skin is a red flag.
- Do not enlarge visual art in a way that enlarges damage hitboxes.
- Do not reintroduce Pokémon names, terminology, glyphs, or assets into the
  standalone Aetherfall distribution.
- Do not replace the locked production sprites wholesale. Improve their
  integration and presentation first.
- Do not rebuild mid-level celebration moments (e.g. the reverted FIRST
  ENCOUNTER splash). Art gets appreciated in the codex, on the player's terms.
