# Aetherfall improvement backlog

Last reviewed: 2026-07-22

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

## Current baseline

- The complete nine-realm campaign, bosses, ending, Time Spiral, daily run,
  trial launcher, stage medals, codex, upgrade web, and LIGHT/DARK vessel
  treatments are present.
- Production art covers 259 base sprites and 259 radiant variants, plus 21
  Relicforge weapon/utility sprites. Boss gameplay exports are currently
  192×192; high-resolution source art exists but is not packaged as boss
  reveal art. Velmora's source, for example, is 1254×1254.
- The invariant suite currently passes 78/78, syntax checks pass, and asset
  verification passes. The suite is still launched manually in a browser.
- The standalone runtime payload is about 29 MB excluding its nested Git
  metadata, with about 28 MB of PNG art.
- The constellation has six paths and only two direct weapon identities:
  VOLLEY and IMPACT. BOND is the least active path: most of its value is
  passive pickup, score, drop-rate, and life economy that overlaps settings,
  codex rewards, and AEGIS. Its removal is preferable to crowding the mobile
  constellation with a seventh spoke.

## Evidence from the review

- On a 667×375 phone viewport, the wave title collides with the health area,
  long top text is clipped, and the touch-button copy is at the edge of
  legibility.
- Velmora's combat name and health bar sit over the boss art. Her arrival
  announcement, the gauntlet banner, the top HUD, and the attached nameplate
  can all compete for the same vertical band.
- The same underlying problem appears on other boss/trial launches: several
  queued announcement layers can cover the boss or player before the fight is
  visually settled.
- A deep trial launch can announce earlier gauntlet rounds instead of showing
  only the selected round and phase.
- Aetherfall displays some correct `SURGE` language, but shared HUD, upgrade,
  tutorial, and system copy still exposes the old `MEGA` vocabulary.
- LIGHT currently selects the full radiant casting in every form, and both
  affinities receive the same full-size rear fitting from Form I. The wash and
  aura are graded by form, but those two stronger signals make the oath read
  too loudly before the vessel evolves.
- The canvas-only interface exposes essentially no menu or game state to the
  browser accessibility tree.

## Priority definitions

- **P0** — do next; visible quality, player trust, or release confidence.
- **P1** — high-value expansion after the P0 foundation is stable.
- **P2** — meaningful follow-up; should not delay the P0/P1 work.
- Effort is a relative estimate: **S** (small), **M** (medium), **L** (large),
  **XL** (multi-system).

## Ranked backlog

| ID | Priority | Improvement | Player value | Effort | Depends on |
|---|---|---|---|---:|---|
| AFT-001 | P0 | Mobile safe-zone and text-containment system | Stops clipped/overlapping copy in every screen | M | — |
| AFT-002 | P0 | Full-resolution boss reveal that shrinks into combat position | Shows the boss art and creates a clean, memorable entrance | L | AFT-001 |
| AFT-003 | P0 | Replace the complete Aetherfall `MEGA` vocabulary with `AETHER SURGE` / `SURGE` | Removes the largest remaining Pokémon-era presentation leak | M | — |
| AFT-017 | P0 | Progressive LIGHT/DARK vessel evolution | Preserves the original early hull and makes final evolution feel dramatic | M | — |
| AFT-004 | P0 | Clean trial/boss launch state and announcement sequencing | Practice starts at the selected fight without stale banners | S–M | AFT-001 |
| AFT-005 | P0 | Automated tests plus mobile visual-regression scenes | Makes layout, terminology, save, and combat regressions catchable before release | L | AFT-001–004 |
| AFT-006 | P0 | Save export/import, versioned backup, and recovery UI | Protects a long 27-stage run and permanent unlocks | M | — |
| AFT-007 | P1 | Replace BOND with the integrated ORBITAL RELIC weapon path | Adds a genuinely different, mobile-friendly weapon build without a seventh spoke | L–XL | AFT-001, AFT-003 |
| AFT-008 | P1 | Full-campaign balance matrix and regression budgets | Finds difficulty spikes, dead builds, and unfair mobile encounters | L | AFT-005, AFT-007 |
| AFT-009 | P1 | Mobile-first constellation redesign and build identity | Makes the updated web understandable and touch-friendly | L | AFT-007 |
| AFT-010 | P1 | Mobile accessibility and input alternatives | Broadens who can comfortably finish the campaign | L | AFT-001 |
| AFT-011 | P1 | Mobile performance, asset streaming, and WebP packaging | Faster load, lower memory, steadier combat on ordinary phones | L | AFT-005 |
| AFT-012 | P1 | Whole-game visual integration pass | Carries the locked sprite style into scale, shadows, VFX, HUD, and scenery | L | AFT-001–003, AFT-017 |
| AFT-013 | P2 | Codex combat dossiers and permanent boss gallery | Lets players revisit full boss art and learn counterplay | M | AFT-002 |
| AFT-014 | P2 | Run history, boss rush, endless route, and custom modifiers | Converts campaign mastery into replayability | XL | AFT-008 |
| AFT-015 | P2 | Installable/offline release package and lifecycle handling | Makes the phone experience app-like and resilient | L | AFT-006, AFT-011 |
| AFT-016 | P2 | Architecture and documentation cleanup | Lowers the cost and risk of future content work | L | after feature churn |

## Detailed acceptance criteria

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
- Required clean viewports: 667×375, 740×360, 780×360, 844×390, 932×430,
  390×844, and the existing 1280×720 desktop reference.

### AFT-002 — Full-resolution boss reveal and clean combat transition

Use the high-resolution boss sources to make the entrance a separate scene,
not another layer inside active combat.

1. Freeze combat and clear ordinary announcements.
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
  1–2K source files directly.
- Use one entrance contract for all legendaries, mythics, sentinels, and the
  secret boss, while retaining their authored motion styles.
- Reduced-motion mode uses a dissolve/scale cut with the same information and
  no camera sweep.
- Tapping skips the hold but never skips into an undodgeable attack.
- The codex reuses the same reveal asset, so the extra payload serves two
  player-facing purposes.

### AFT-003 — Aetherfall terminology migration

The public concept is **AETHER SURGE**. `CHARGE` remains the held weapon shot;
these are two different systems and must never be conflated.

| Old public term | Aetherfall term |
|---|---|
| Mega / Mega Evolution | Aether Surge / Surge |
| Mega meter | Surge meter |
| Mega ready | Surge ready |
| Mega active | Surge active |
| Hits charge Mega | Hits build Surge |
| Mega duration / damage | Surge duration / damage |
| Mega button | Surge button |

- Audit HUD, touch controls, tutorials, upgrade names/descriptions, codex,
  results, settings, announcements, logs intended for players, and README.
- Rename `APEX MEGA` and other upgrade copy in the Aetherfall build. Avoid a
  blind replacement where `charge` means the held charge shot.
- Add skin-aware vocabulary helpers immediately so no shared UI emits the old
  term.
- Then migrate internal names (`G.mega`, `megaT`, `tryMega`, `megaDur`, stats,
  icon keys) to Surge terminology with a backward-compatible checkpoint
  migration. Old saves must load without losing meter state or upgrades.
- The standalone distribution should contain no player-facing `MEGA` string.

### AFT-017 — Progressive LIGHT/DARK vessel evolution

The oath should be recognizable at Form I, developed at Form II, and
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

### AFT-004 — Trial and announcement sequencing

- Starting at a selected gauntlet round/phase clears banners, entrances, and
  story cards belonging to earlier rounds.
- Exactly one trial notice and one selected-boss reveal may be queued.
- Announcement panels use a single owner/priority queue; objective state,
  trial state, boss reveal, and combat tips may not all occupy the same lane.
- No announcement may cover the player vessel or touch controls on required
  mobile viewports.
- Add tests for direct launches to all 27 stages, every gauntlet round, and
  every selectable boss phase.

### AFT-005 — Automated release gate

- `npm test` starts a headless browser and exits non-zero unless all invariant
  tests pass. Keep `test.html` as a readable report, but remove the manual-only
  release dependency.
- Run syntax, asset verification, the 78 existing invariants, save migrations,
  the standalone build, and a smoke load of that build in one command.
- Add deterministic mobile screenshots for home, setup, settings, arrival,
  objective, boss reveal, boss combat, charge/overheat, Surge-ready, upgrade
  draft/web, results, codex, ending, and game over.
- Add semantic assertions for every fitted label: its measured bounds must be
  contained by its declared layout region.
- Treat uncaught console errors, missing art, fallback procedural boss art,
  and forbidden Aetherfall vocabulary as failures.

### AFT-006 — Save safety

- Export one versioned JSON backup containing settings, checkpoint, codex,
  medals, victories, daily history, and unlocks for Aetherfall.
- Import previews what will change and validates schema before writing.
- Keep at least one recoverable pre-import backup and one rolling autosave.
- If storage is corrupt or unavailable, explain that the session is running
  unsaved instead of silently falling back.
- Add migration and round-trip tests for every supported checkpoint version.

### AFT-007 — ORBITAL RELIC weapon path

Recommended concept: a returning Relicforge glaive/halo. It is visibly and
mechanically different from rapid VOLLEY fire and heavy IMPACT shots, yet it
needs no new phone button.

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
  the paddle. The ball remains the primary weapon.
- No extra aim stick or action button is required on mobile.

Required integration with the five remaining paths:

- VOLLEY — faster relic cadence / wider lane coverage.
- IMPACT — heavier outward hit and a detonating recall.
- PRISM — the relic retunes to the useful aspect on each pass.
- SURGE — active Surge accelerates orbit/recall without infinite meter gain.
- AEGIS — a returning relic may intercept fire or reinforce a shield.

Preferred scope: replace **BOND**, do not add a seventh spoke. BOND is useful,
but its effects are the least moment-to-moment and have the most overlap with
systems outside the web.

- Make ITEM MAGNET a baseline phone quality-of-life behavior or a setting.
- Move FORTUNE into codex/research progression or the existing drop-rate
  setting, where it is more legible.
- Move the periodic extra life into AEGIS, a mastery reward, or a permanent
  campaign unlock.
- Move BOND's score multiplier into medals/mastery so score play remains
  supported without consuming a weapon spoke.

This is still an upgrade-web migration, not four isolated cards:

- Keep six spokes, six adjacent bridges, 15 pairwise fusions, and two apexes.
- Replace BOND's five pair fusions with five ORBITAL RELIC synergies. Retheme
  and redesign its AEGIS and VOLLEY bridges. Rebuild CELESTIAL GUARDIAN's
  BOND sector around the relic loop without changing the one-apex limit.
- Rehome the BOND mastery satellite and LIGHT's DAWNLIGHT satellite. Preserve
  earned stack ranks even if their effects and presentation change.
- Add a checkpoint schema migration that maps BOND ranks to equal ORBITAL RELIC
  ranks. Convert owned BOND web nodes to their corresponding new nodes and
  show the player a one-time migration/respec summary.
- Preserve every unaffected save key. Never silently delete an owned pick.
- Add one authored Relicforge weapon sprite, clear player/enemy silhouette
  rules, impact/return audio, and reduced-effects treatment.
- Verify at least three competitive end-run archetypes use ORBITAL RELIC for
  different reasons; it must not simply be the highest-DPS choice.

### AFT-008 — Campaign balance matrix

- Use seeded AI runs and recorded human runs across three modes, four
  difficulties, all 27 stages, LIGHT/DARK, representative pilots, and at least
  eight build archetypes including the new weapon.
- Record completion rate, stage duration, damage source, knockouts, charge-shot
  share, Surge frequency, heat lockout, upgrade pick rate, boss phase time,
  and mobile frame time.
- Establish regression budgets for difficulty spikes, dead upgrades, dominant
  picks, unavoidable damage, and bosses that die before demonstrating their
  mechanics.
- Keep deterministic fixtures for every issue fixed through balance changes.

### AFT-009 — Mobile constellation and build identity

- Keep the replacement six-path web legible without requiring precise pinch
  gestures. Do not spend mobile readability on a seventh wedge unless
  playtesting proves that replacing BOND is worse.
- Use a bottom-sheet inspector, large touch targets, snap-to-focus navigation,
  reliable `FIT`/`FOCUS`, and no tall-viewport anchor drift.
- Show owned build summary, named archetype, next synergy, lock reason, before/
  after comparison, and the exact weapon behavior in the current mode.
- Add a permanent fusion-discovery journal and one limited respec per realm.
- Provide a practice chamber that can spawn a chosen wave/boss with the current
  build without changing the real save.

### AFT-010 — Mobile accessibility

- Add text size, background dimming, projectile-outline strength,
  colorblind-safe threat palettes, toggle-charge, reduced hold time, and
  visual equivalents for important audio cues.
- Preserve and improve button size, opacity, follow speed, handedness,
  haptics, auto-fire, reduced shake, and reduced flash.
- Add a DOM accessibility layer for menus, settings, results, codex, and the
  upgrade web. Canvas visuals can remain, but choices and state must be
  keyboard/screen-reader discoverable.
- Keyboard remapping and gamepad support remain valuable, but phone touch
  quality has priority.

### AFT-011 — Mobile performance and packaging

- Convert runtime art to WebP where alpha quality remains acceptable; retain
  PNG only when it wins visually or by size.
- Load the current realm and prefetch the next realm instead of allowing a run
  to accumulate the entire campaign's decoded sprite memory.
- Add a visible boot/loading state and graceful missing-asset fallback.
- Profile representative low/mid-range phones at 60 and 120 Hz. Set budgets
  for first interaction, peak decoded memory, long frames, and boss-phase FPS.
- Audit the 289 gradient/shadow references in `render.js`; cache repeated
  surfaces and remove hot-loop blur where profiling shows a real cost.

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

## Recommended delivery sequence

### Release-quality mobile pass

AFT-001 → AFT-002 → AFT-003 → AFT-017 → AFT-004 → AFT-005 → AFT-006

This sequence fixes the visible mobile problems, proves the boss-art direction,
removes legacy language, and installs the safety rails before progression is
made larger.

### New weapon expansion

AFT-007 design prototype → BOND migration plan → AFT-009 six-path web update →
AFT-007 full integration →
AFT-008 balance matrix

Prototype the returning weapon in a deterministic trial scene before changing
the web. Once the loop is fun, replace BOND, redistribute its essential perks,
migrate the constellation and add the five pair synergies; then rebalance the
whole campaign instead of tuning one stage at a time.

### Shipping and replayability

AFT-010 → AFT-011 → AFT-012 → AFT-013 → AFT-015, with AFT-014 after the
campaign matrix is healthy. Do AFT-016 incrementally at subsystem boundaries,
not as a rewrite that blocks player-facing work.

## Guardrails

- Do not put long introduction cards over live combat. Boss identity belongs in
  the reveal scene and codex; short combat warnings belong in reserved lanes.
- Do not add a new permanent mobile button for ORBITAL RELIC.
- Do not rename or discard existing save keys without migration.
- Do not enlarge visual art in a way that enlarges damage hitboxes.
- Do not reintroduce Pokémon names, terminology, glyphs, or assets into the
  standalone Aetherfall distribution.
- Do not replace the locked production sprites wholesale. Improve their
  integration and presentation first.
