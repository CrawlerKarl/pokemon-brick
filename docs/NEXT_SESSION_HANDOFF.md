# HANDOFF — resume here

> **STATUS (2026-07-23 session closeout): ALL P0 ITEMS FROM THE BACKLOG ARE
> IMPLEMENTED, TESTED, AND LIVE** (rounds g–o in the log): AFT-005A the
> headless release gate (`npm test`), AFT-001 safe zones + fitted
> labels, AFT-003 the SURGE lexicon, AFT-004 the kinded announce queue +
> clean launches, AFT-002 the full-resolution boss reveal + HUD-lane dock,
> AFT-017 the oath evolution channels, AFT-006 save safety
> (export/import/backups/durable storage), AFT-018 frame stability
> (baked hot loops + the adaptive effects budget), and AFT-005B mobile
> scenes with fitted-label assertions + the artifact-storm ledger.
>
> **Suite: 127/127 (103 at the 07-23 closeout; AFT-021 +12, AFT-022 +7,
> AFT-009R +5). `npm test` (~30–35s headless) ran green before every
> commit.** Production art: 259 base + 259 radiant + 54 previews +
> **43 boss reveals** + 21 weapon sprites. Both sites live:
> - workshop `CrawlerKarl/pokemon-brick` → https://crawlerkarl.github.io/pokemon-brick/
> - dist `CrawlerKarl/aetherfall` → the standalone AETHERFALL build
>
> **✅ THE BOSS FRAME-RATE THREAD IS CLOSED.** The owner confirmed on
> 2026-07-23 (real device) that boss levels run smoothly after the cadence
> profiler round. The deeper rungs (3+) stay unimplemented by design; the
> storm ledger keeps accumulating the baseline every gate run.
>
> **`AETHERFALL_IMPROVEMENT_BACKLOG.md` remains the scope authority** (now
> including AFT-020 + acceptance criteria) and SUPERSEDES `FULL_GAME_ROADMAP.md`
> where they disagree — but read its status banner: its P0 list is DONE, and
> some of its status lines describe the pre-P0 world. Its **P1 ranking and
> acceptance criteria are still live and authoritative.**
>
> **AFT-020 + AFT-008 SHIPPED (2026-07-24, one autonomous program):** all
> NINE realm finales now run their authored formats (ladder / relay /
> siege / hourglass / circuit / hunt / rite / raid / chase — only
> Greenspell keeps the classic ladder), every stage carries an authored
> display title, wardbreak/lanes/bells/undercard non-attrition identities
> run in every mode, Victory Drafts deal 4/5 mastery-sized hands with a
> pinned mastered reroll, Preparation banks a Challenge benefit, realm
> crests persist, Time Spiral remixes tighten learned tells, and the
> Section-9 balance corrections (Stormbinder tempo, AEGIS restore + gated
> regen, One Life un-stacked, diminishing stacks, renewable-add
> exclusions, drop diversification) are landed with regression fixtures.
> The old-campaign baseline AND the redesigned-campaign closeout matrix
> live in docs/baselines/. Suite is at 103 invariants; the working design
> log is docs/archive/AFT020_PHASE_NOTES.md (marked COMPLETE).
>
> **Post-ship owner round (2026-07-24h, `09cea36` / dist `2efd83d`):** two
> real-phone art-pop reports fixed same day — reveal portraits + weapon
> sprites are WARMED ahead of first draw (`warmRevealArt`/`warmSetupArt`)
> and each reveal LATCHES its art source at 0.35s so nothing swaps
> mid-scene. The subsequent owner playtest is now complete; its findings are
> the AFT-021 program immediately below.
>
> **AFT-021 EXECUTED IN FULL (2026-07-24, autonomous session — log rounds
> 2026-07-24i–p, commits `6910fa6…HEAD`).** All ten playtest defects were
> locked in reproducing fixtures first, then fixed and promoted to
> permanent invariants (suite 103 → **115**; gate green end to end):
> - **A win must LOOK won**: the clear enters `G.state === 'resolve'` —
>   hostile fire dissolves at the win moment, actors play their completion
>   verb (disperse/rescue/stand-down), results wait for the field and
>   speak the verbs; `combatIsLive()` makes damage structurally impossible
>   outside live combat.
> - **One owner per screen region**: the `claimSurface` registry + per-scene
>   overlap enforcement; the goal pill owns the narrow top row; trial copy
>   finishes inside a briefing hold; results/drafts ride a static arena
>   plate; the sound circle moved to pause.
> - **The combat-safe viewport** (`combatSafeRect`): boss-class actors clamp
>   inside it (both axes); ONE active target carries the local nameplate,
>   co-actors ride the ROSTER RAIL; idle pads soften under combat.
> - **One weapon clock**: hostile slows and cinematics never touch player
>   projectiles or charge; touch holds credit from the press (full at
>   1.10s on every input/framerate); pause/background disarm charges.
> - **The measured rebalance (BASELINE GREEN, 142 scenarios, budgets
>   enforced by `npm run baseline`)**: finale work from measured per-mode
>   DPS curves (`sovereignHp`/`FINALE_WORK`/`FINALE_WORK_MODE`, state.js);
>   `journeyDmgMul` baseline weapon growth; path spread 3.8× → 1.36×
>   (Aegis retaliation, Surge afterglow, Bond/Hyper/electric trims);
>   blaster deflector core + hull plate; Ace = threat, not sponges; the
>   per-stage shield income budget (`tryShieldGain`).
> - Three DOCUMENTED calibration deviations live in `evaluateBudgets`
>   (tools/run-baseline.js): classic-bot band = human band ×1.8; ratio
>   hard cap 2.5 (1.6 target re-checked by the human pass); ≤2 blaster
>   seed-outliers tolerated outside L3/L12.
> - Open for the OWNER's real-device judgment: blaster feel at mid-realm
>   finales, Ace's threat-heavy pacing (+~2× bot duration), and the
>   1.8s trial briefing hold's feel.
>
> **AFT-022 (portrait round) and AFT-009R (the progression redesign —
> Attunement / Aether Forge / journal) BOTH SHIPPED 2026-07-24** — see
> log rounds 2026-07-24q/r and the numbered pickup list below.
>
> **AFT-023 (the STARFIGHTER improvement pass) SHIPPED 2026-07-24s** —
> draft pacing discipline (~23 picks/campaign, capped per-stage income,
> reveal/phase holds, combined banked hands), FINALE KNOCKOUT CHECKPOINTS
> (resume at the reached round/beat/segment — the 424.9s L27 replay class
> is dead; KO overhead measured 30-38s), apex identity re-forge (WAR
> MACHINE offense + plating vs CELESTIAL 14s ward cooldown; 3-seeded
> fair probes + an enforced identity budget), the rising duration curve
> (lateWaveMul from r2, reinforcement waves 1/2/3/4, Ace combo volleys,
> massive shots enter r6 with a longer telegraph), vessel normalization
> (ground/poison trims, fire kindle in shooters, dark execute, LIGHT
> Radiant Ward, UNSWORN neutral launch, Aegis overflow → bounded Surge),
> and the guided first-session vessel view + mode-correct strings +
> HIGH-CONTRAST PROJECTILES + the 320×568 fit sweep (which caught a real
> settings-panel overflow). Suite 129; gate 56 scenes; baseline
> matrix-aft023. Log round 2026-07-24s has the full detail.
>
> **AFT-024 (THE STAGE DIVIDEND) SHIPPED 2026-07-27** — upgrades now
> arrive ONE PER STAGE CLEAR (owner directive: per level, not per XP
> threshold). 3 decisions per realm = 2 stage hands + 1 Forge, 26 per
> journey; resonance repurposed from FREQUENCY to HAND WIDTH (3/4/5
> cards); the mid-wave draft path deleted outright; a RECOVERY HAND
> cashes banked resonance when you're knocked out on a finale. Suite 129.
> **NEXT: AFT-019 remainder (real-device first-session pass) + AFT-010.**

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

---

## Read these first

- `AETHERFALL_POST_AFT020_UX_PLAYTEST_REMEDIATION_PLAN.md` — **AFT-021,
  EXECUTED 2026-07-24**: post-clear correctness, combat readability,
  charge/input timing, and campaign rebalance. Still the reference for
  what each fix guarantees; matrix evidence in
  `baselines/AFT021_MATRIX_REPORT.md`.
- `AETHERFALL_IMPROVEMENT_BACKLOG.md` — **the backlog. Start here.**
- `AETHERFALL_REALM_FINALE_AND_VARIETY_PLAN.md` — **the new AFT-020
  execution plan: nine finale formats plus campaign-wide variety work.**
- `../CLAUDE.md` — workflow + the design invariants you must not regress.
- `../README.md` — file map + system tour + gotchas.
- `IMPLEMENTATION_LOG.md` — newest-first record of every shipped round and
  the reasoning behind it. Newest entries run through **2026-07-24r**.
- `FULL_GAME_ROADMAP.md` — milestone history (useful design context; the
  backlog wins on open items).
- `archive/` — historical plan docs for shipped features (see its README).

---

## The architecture in one screen

Vanilla-JS canvas game, **no build step** for the game itself. **16 JS
modules** in `js/`, loaded in order via `<script>` tags in `index.html`
(later files reference earlier):

```
setup → config → skin → audio → data → pokeworld → aetherfall
      → aetherfall-overrides.generated → aetherart → scenery
      → state → input → update → render → dev → main
```

- **Engine / world split.** `js/data.js` is now ENGINE-ONLY (shared tables,
  `STARTER_KIT` balance numbers, and the lexicon helpers `typeLabel()` /
  `typeWord()` / `pathSummary()` / `dexEntryInfo()`). The entire pokemon
  world moved to **`js/pokeworld.js`** (rosters, motion profiles, gens,
  habitat packs, boss kits, names, dex rewards, region intros, objectives)
  and calls `assembleSkins({...})` at its tail. The dist replaces
  `pokeworld.js` with a generated, name-stripped stub.
- **Two skins, one engine.** `js/skin.js` owns the `SKINS` registry and the
  live `SKIN` (resolved at boot: `?skin=` → `SETTINGS.skin` → `pokemon`).
  Presentation + world data ride `SKIN.*`; the engine (type keys,
  effectiveness, modes, paths, the 50-node web) is shared. **pokemon** keeps
  LEGACY bare storage keys (`pkbrk-*`); **aetherfall** namespaces via
  `storeKey()`. Checkpoints are schema v5 (`skin`/`affinity` since v4; attune arc + Focus + Reforge since v5).
- **AETHERFALL** (`js/aetherfall.js`) is an original sci-fi × fantasy world:
  18 classes across MAGIC/TECH/MAGITECH, 9 realms, 54 vessel lines, 27
  sentinels + 9 legendary + 9 mythic bosses cloning the M4 kit mechanics
  under original ids/names. Owns `typeNames` (the ASPECT lexicon),
  `weaponArt`, `relicDrops`, and the rift secret (LUMINE ASCENDANT).
- **Art layers.** `js/aetherart.js` draws every AETHERFALL unit procedurally
  (no image assets, baked + cached) AND hosts the production-art override
  layer that blits real PNGs over the cached canvases.
- Three modes: **classic** (BREAKER — calm, ball-only, no enemy fire, no
  paddle gun), **blaster** (BLASTER, ball-less), **junkie** (STARFIGHTER,
  the flagship flight shooter). Internal keys are storage-stable — never
  rename.

---

## THE ART PIPELINE (the user runs generation in parallel — check every session)

New finals land in `art/aetherfall-production/`. **To wire them in:**

```
python3 tools/build-aetherfall-previews.py     # 320px setup portraits from the 1254px masters
python3 tools/build-aetherfall-reveals.py      # 512px boss-reveal portraits (43 boss ids)
npm run art-overrides                          # scans final/ + preview/ + reveal/, regenerates the 5 maps
npm run build-dist                             # regenerates dist-aetherfall/ (RESIDUE must be "none")
```

**Live coverage today: 259 base + 259 radiant + 54 preview + 54
radiant-preview + 43 reveal overrides, plus 21 weapon sprites.** Procedural
art still covers any id with no override and any load gap, so a partial run
is always safe.

**At session start: `git status` — if the user dropped new finals, run
`npm run art-overrides`, verify, commit, deploy.**

### Two art-tooling rules learned the hard way

- **Never assume the chroma colour — read it off the frame.** The production
  run uses **two** screens: green for most subjects, **magenta** for
  green-heavy art (water/grass/ice/bug lines — ids 13–18, 28–30, 43–45).
  Assuming green silently left 12 vessels sitting on a solid backdrop block.
  `detect_chroma()` medians a 6px border; the despill is channel-matched.
- **Previews/reveals must match THE ID'S OWN final's framing.** The finals'
  subject ratios VARY per id (0.725–0.785), so both tools measure each id's
  final (`final_subject_ratio`) and pad to match. A fixed global ratio made
  hulls visibly GROW when the high-res art finished loading (2026-07-23
  owner report) — regenerate both sets if you touch either tool.

### Disk

`art/` is **1.1 GB** — but **1.0 GB of that is `sprites/source/`** (the
1254px editable masters) plus 31 MB of weapon art. Only `final/`(14 MB),
`preview/`(13 MB) and `weapons/final/` are referenced at runtime.
`dist-aetherfall/` is about 37.4 MiB excluding its nested Git metadata
(about 114 MB on disk including `.git`). If repo size becomes a problem, pruning
`sprites/source/` is the lever — **but ASK FIRST, it's the user's working
art.** Local same-origin files only; the no-remote-fetch rule stands.

---

## What shipped, in brief (full detail in `IMPLEMENTATION_LOG.md`)

**2026-07-24: the AFT-008 + AFT-020 program (rounds a–h)** — the finale
director + nine authored realm-finale formats in both skins and all three
modes, stage display titles ×27, four non-attrition objective identities
(wardbreak/lanes/bells/undercard), mastery-sized Victory Drafts + pinned
mastered reroll, Preparation, realm crests, authored conditions ×9, Time
Spiral remixes, the Section-9 balance corrections with fixtures, the
old/redesigned baselines (`npm run baseline`, docs/baselines/), suite
87→103, and the same-day owner art-pop fix round (warming + reveal latch).

**2026-07-22 → 07-23: all P0 items** — the headless gate (AFT-005A), safe
zones + fitted labels (001), the SURGE lexicon (003), the kinded announce
queue (004), the boss reveal scene (002), the oath evolution channels (017),
save safety (006), frame stability (018 + 018b + the cadence profiler), and
the mobile scene/label/storm harness (005B). Plus owner-reported fixes: the
trial picker overflow, the vessel size "pop", and two rounds of boss-level
performance work.

**2026-07-23d (owner feedback round):** upgrade-web labels never hide behind
nodes (late plate pass + per-spoke slots + relocated ring names), boss
reveals hand off continuously into the fight (`viaReveal`/`fxOnly` — no more
bottom re-entry after the portrait docks), draft descriptions read at body
size and fill their sheet, and vessel-select art is warmed at the title so
the hero/tiles never swap renders after a click (plus a skin gate that
stopped aetherfall previews leaking onto colliding pokemon ids).

### Earlier context — the 2026-07-22 art/identity rounds

1. **Calm BREAKER + earned Rift** (07-21 tail, deployed 07-22): classic takes
   zero enemy fire and has no paddle gun; offense paths reskin to ball power
   (TWIN ORB / WIDE ARRAY / POWER+SHATTER CORE / LASER→MULTIBALL) so no draft
   pick is dead. Kanto shards became one-shot skill tests (RIFT COURIER you
   must shoot down; a swaying one-pass fall in BREAKER), and the Mew VMAX
   reward is ONE bounty draft where you choose TWO from the same hand
   (`G.bonusPicks` + `holdBonusPick`).
2. **STARFIGHTER edge lock + MEGA scaling** — the MEGA-ready halo inflated
   `paddleW()`, which was BOTH the giant-halo bug and the movement clamp that
   pinned the ship off the screen edges. MEGA now scales with the journey
   (`megaRegions()` / `megaBoltMul()` / `megaBallDmg()`), so it stays relevant
   late.
3. **The ASPECT lexicon + the CODEX GALLERY** — Pokémon type words are gone
   from AETHERFALL (`SKIN.typeNames` → `typeLabel()`, `typeWord()` = ASPECT),
   and the codex gained a full-size sprite gallery so the art can be
   appreciated on the player's terms.
4. **Vessel showcase, Relicforge drops, the deepening oath** — a large detail
   hero on the vessel screen, dropped items restyled as relic plates + binding
   sigils (no Pokémon symbols), the oath graded by form, and high-resolution
   previews. Then the two fixes below.

### Two user-reported bugs fixed in the last round

- **"Green block behind a ship"** → the magenta-screen discovery above.
- **"The light outline is on the ship before I choose"** → a returning player
  with a saved affinity saw their radiant casting while still picking a hull.
  `drawAffinityVessel(..., neutral)` now forces the base casting on the
  vessel-select screen; the oath appears only after it is sworn.

### One reverted change — the lesson stands

A **FIRST ENCOUNTER splash** (new creature flashes larger with its name) was
built and then removed at the user's request: *"It's distracting and happens
mid-level."* **Mid-level celebration interrupts the shooter's flow — the
CODEX GALLERY is where art gets appreciated, on the player's terms.** Don't
rebuild it. (The low-band text fix that shipped alongside it was kept: in
shooter modes the announce strip and combat notices anchor above the ship
band so copy never covers the flock or the pilot.)

---

## Pick up here

### 0. ~~FIRST: confirm boss-level frame rate on a real device~~ — DONE

**Confirmed smooth on the owner's phone (2026-07-23).** The P1 track is
unblocked. Historical context below stands in case a future regression
reopens it.

- **What shipped, round 1 (AFT-018b)**: adaptive resolution (rung 2 → 75% of
  native DPR), ~0.5s ladder escalation, `fxGlow()` flattening the big
  whole-sprite blurs (pilot, paddle hull, pad rings), baked rig gradients.
- **What shipped, round 2 (cadence)**: work time alone missed the problem —
  JS was ~1ms while the COMPOSITOR fell behind, so AUTO never engaged.
  `PERF` now keeps a second ring of real `requestAnimationFrame` cadence
  (ignoring bootstrap/resume gaps and hidden-tab returns) and
  `effectsLevel()` treats it as an equal input: cadence >20ms drops bloom +
  big glows, >26ms adds emission + resolution. Freeze/hit-stop frames are
  profiled too (phase transitions are the densest boss frames).
- **How to check on device**: play a finale, then read `DEV.perf()` — it
  reports `cadenceMs`, `fps`, the active `level`, weighted `load`, and live
  effect counts. `level` should climb above 0 while it's struggling.
- **If boss lag persists**, in order: (a) a rung-3 that simplifies
  atmosphere/scenery and culls offscreen trails, (b) drop the resolution
  floor below 0.75, (c) profile the boss's own draw path (guard wings, HP
  glows, entrance fx) — the gate's boss storm gives per-frame gradient/blur
  counts to compare against, (d) a WebGL compositor (AFT-011 territory).
- **The gate now guards this**: a BOSS storm runs every `npm test` with
  machine-portable budgets (grad ≤8, blur ≤14/frame at FULL; ≤6 lean).
  Absolute ms stay advisory; state-change counts gate hard. The final
  closeout run was green in 28s: wave 1.01ms average; boss 0.87ms average /
  1.3ms P95; boss FULL 1.4 gradients + 3.9 blur writes/frame.

### Then: AFT-021 stabilization, then the P1 track

The whole AFT-008 → AFT-020 → closeout program is **COMPLETE** (log rounds
2026-07-24a–h; both sites deployed and curl-verified). The live sequence:

```
✅ AFT-007 ORBITAL RELIC
✅ AFT-008 BASELINE + SCHEMA LOCK (docs/baselines/, npm run baseline)
✅ AFT-020 NINE REALM FINALES + CAMPAIGN VARIETY (all 10 phases)
✅ AFT-008 REDESIGNED-CAMPAIGN CLOSEOUT (Section-9 corrections + matrix)
✅ AFT-021 POST-AFT-020 UX STABILIZATION + BALANCE REREAD (Phases 0–9)
→ AFT-009 constellation redesign
→ AFT-019 first-session phone pass
→ AFT-010 accessibility
→ AFT-011 loading/WebP
→ AFT-012 visual pass
```

1. **AFT-021 is DONE** (Phases 0–9, log rounds 2026-07-24i–p) and
   **AFT-022 (the portrait-mobile playtest round) is DONE** (log round
   2026-07-24q): auto-fire vents itself, must-read copy wraps, pause never
   mirrors, the ship clamps by rendered footprint, constellation taps are
   offered-first, notices dedupe — plus the seeded-launch position-
   dependence fix and the baseline TRUTH RE-ZERO it forced (see the log).
   OWNER-JUDGMENT items outstanding: blaster feel at mid-realm finales,
   Ace pacing, the 1.8s briefing hold, the fast-rite seeds (L21), and the
   two owner-flagged matrix deviations (L12-blaster-S3, rite floors).
2. **AFT-009R (mobile-first progression redesign) is DONE** (log round
   2026-07-24r): Attunement levels (Resonance-driven three-card combat
   drafts with a combat-safe queue and a curated opening), the realm
   AETHER FORGE (Refine/Link/Evolve/Reforge — ordinary stage drafts are
   GONE), the constellation as a non-installing journal with a phone
   list view, Focus Charges, checkpoint schema v5 with lossless
   migration, and knockout that never uninstalls. Suite 127/127; matrix
   GREEN at `matrix-aft009r.json`. OWNER-JUDGMENT: the attunement pacing
   feel on a real phone (22 bot-levels/journey vs the ~18 target), the
   L3-blaster floor re-fit, and the Forge's one-decision-per-realm feel.
3. **AFT-019 (first-session phone pass)** is the next backlog item.
3. **Cheap follow-ups spotted during the closeout** (noted, not started):
   - the ground vessel clears ~27% faster than the median vessel (matrix
     evidence in docs/baselines/AFT008_CLOSEOUT_REPORT.md) — candidate for
     a gentle trim if the owner confirms it feels dominant;
   - a no-build L3 blaster run showed a game-over gap in the matrix —
     verify a human can actually hit it before tuning anything;
   - retired mythic duel specs (the seven formats that no longer end on a
     mythic health bar) wait on a future Boss Rush / Trial-extra surface if
     the owner ever wants those duels back as practice.

Notes so you don't redo finished work:

- **`npm test` is the gate** (~30–35s full, `--fast` ~15s, `--suite` ~12–18s):
  syntax → assets → 115 invariants headless → both-skin + dist boots →
  vocabulary scan → RESIDUE → 22 mobile scenes × 2 viewports (44 screenshots
  → `.gate-shots/` + metadata sidecars) that each PROVE their named state via
  `expect` assertions, under the overlap + single-actor-label contracts → the
  wave AND boss storm ledgers (`.gate-report.json`). Run it before every
  commit.
- **`npm run baseline`** replays 142 deterministic autopilot scenarios
  (~70–90s) and ENFORCES the AFT-021 budgets (finale duration bands ×
  mode, mode ratios, path spread, vessel cap, shield income, heat,
  difficulty drift separation, clear rules) — violations exit red. Always
  pass `--label <provenance>`; `BASE_ONLY=<substring>` filters scenarios for
  tuning loops, **but an unlabeled BASE_ONLY run writes over the committed
  old-campaign fixtures** (this happened once — `git checkout --` restored
  them). The committed snapshots in `docs/baselines/` (old campaign +
  redesigned closeout + aft021) are FIXTURES: regenerate to compare, then
  restore; never overwrite history.
- **Tests that finish a wave must step through `G.state === 'resolve'`**
  before expecting results/draft — the resolution beat sits between clear
  and results in every mode (helpers in test.html already do this; new
  tests should reuse them).
- **`FINALE_WORK` × `FINALE_WORK_MODE` multiply** (state.js) — retune them
  together, never one in isolation, and remember boss-class actors are
  exempt from the hp≥900 unkillable-scenery convention. Any new shield
  source must route through `tryShieldGain` or it escapes the income
  budget.
- **The per-finale implementation pattern is documented** in
  `docs/archive/AFT020_PHASE_NOTES.md` (skin profiles → buildLevel block →
  director fns → damageBrick tail gate → kill hooks → summon override →
  strokes-only fx → mastery → suite test → deliberate legacy-test updates).
  Follow it for any new format work; don't invent a second pattern.
- **AFT-003's optional tail** (renaming internal `G.mega`/`megaT`) remains
  ruled out by the backlog itself — engine identifiers ship unchanged.
- **AFT-018's deeper rungs are available but unimplemented by design**:
  rung 3+ (offscreen fragment/trail culls, animation sampling) waits for
  real-device evidence; the storm ledger accumulates the baseline every run.

---

## How to work (this project's loop)

1. Plan one coherent slice; log it in `IMPLEMENTATION_LOG.md`.
2. Implement → `node --check js/<file>.js` (or `npm run check`).
3. Verify in the browser by driving the sim from the console (the preview
   throttles rAF): `DEV.launch({level, mode:'junkie', diff, seed})`, loop
   `update(1/60)`, read `G.*`; `G.freeze=999; render()` for a screenshot.
   Add `&skin=aetherfall` to any dev URL. If `!W`, force `W/H/canvas` then
   `buildStars(); buildVignette(); bgGen=-1`.
4. **Suite:** `npm test` (headless, ~30–35s; `--fast` ~15s while iterating).
   The fronted `/test.html` tab still works for interactive debugging but is
   never required. Modal boss reveals are dormant under the suite
   (`window.__SUITE`); a test that needs one sets `window.__SUITE_REVEALS`.
5. Gates: `npm run check`, `npm run verify-assets`, `npm run art-overrides`
   (if new finals), suite green, no console errors, both skins boot
   (`/?skin=aetherfall` + default), inspect 1280×720 + 390×844 + short
   landscape, docs updated, `git diff --check`.
6. Ship: commit (end-user message + `Co-Authored-By: Claude …`), push, then
   `gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds` and poll
   `.../pages/builds/latest` until `.commit == HEAD && .status == "built"`.
   Verify a changed file serves live.
7. **For the standalone:** `npm run build-dist` → confirm **RESIDUE: none** →
   commit/push inside `dist-aetherfall/` → trigger + poll that repo's Pages
   build the same way. `dist-aetherfall/` is GENERATED — never hand-edit it.

---

## Gotchas

- **`npm run art-overrides` after every new-finals batch** — otherwise the
  game keeps drawing procedural art for ids that have real PNGs.
- **`'lighter'` composite paints transparent pixels too.** The LIGHT affinity
  wash lit the sprite's whole bounding box as a glowing square until it moved
  to `'source-atop'`. Use `source-atop` for any tint over a sprite.
- **aetherfall ids numerically collide with pokemon PNG filenames on disk**
  (`assets/sprites/101.png` is Electrode). `getSprite` dispatches to
  `SKIN.spriteMaker` BEFORE the PNG path — never bypass it.
- **test.html pins `?skin=pokemon` itself** so the user's saved edition
  toggle can't leak into the bit-identity gate. Don't remove that.
- **Tests that set `SETTINGS.starter` must reset it to `'none'`** at the end —
  a partner's damage mods leak into later integer-math tests.
- **`tierDesc` reads `G.mode`, not `SETTINGS.mode`.** A test that sets only
  the latter silently checks the wrong mode's copy.
- **A Pages build POSTed while another is building can transiently `errored`**
  — just re-trigger; it's not a real failure.
- **New-repo pushes can be rejected for email privacy** — copy the workshop's
  `user.email`/`user.name`, then `git commit --amend --reset-author`.
- **The dev server occasionally dies mid-suite** — `preview_list`, restart
  with `preview_start`, re-run.
- **`gameRand()` never in a sort comparator** (desyncs seeds). The VOLLEY
  path's internal key is `arsenal`. Storage only via `loadStore`/`saveStore`
  → `storeKey`.
- **Don't poll agents with sleep loops** — background work notifies
  automatically.
- **A free-running timer that consumes `gameRand()` must be reset in
  `resetRun`** — `G.splashCD` wasn't, so a seeded run's RNG stream depended
  on how many runs preceded it in the page, and the AFT-018 sim-identity
  check went intermittently red. Fixed 2026-07-23; the AFT-008 round then
  widened this to the WHOLE clock family (`G.time`, laser/blaster/missile/
  invuln/se/enemyShot/bossShot/splash CDs, `lastChargeT`) plus a
  cross-launch aged-page determinism test. Add any new free-running
  consumer to that reset block. If a determinism test ever goes flaky,
  instrument `gameRand` call SITES (wrap it and capture
  `new Error().stack`) and diff two runs — that found this in minutes.
- **`fireAction()` per frame is how a test FINISHES a wave in any mode** —
  it launches serves AND releases stuck/dropped balls; `serve()` re-racks
  and can wedge a finish loop (the classic mode-smoke flake, fixed
  2026-07-24). Test bots in finale scenarios also want `G.lives = 99` +
  periodic strike/shot clears so a knockout can't pollute the assertion.
- **Props at `hp ≥ 900` are unkillable scenery by convention** — the
  AFT-008 workHp/BE stamps skip them (a 999-hp prop once inflated a
  stage's earned-BE to 13×). Keep any new indestructible prop at 999 hp.
- **`buildLevel` clears `G.reveal`/`G.revealDock` at build start** — a
  knockout rebuild once left a stale dock reading from the HUD lane.
- **Production art is WARMED, never first-drawn** (owner-report round 24h):
  `warmSetupArt()` on the title (roster + all 21 weapon PNGs),
  `warmRevealArt(rIdx)` in buildLevel (current + next region) and on Trial
  region tap, and every reveal LATCHES its portrait source at t ≥ 0.35
  (`revealLatch`). Any NEW PNG surface needs the same treatment or it will
  visibly swap over its fallback on a real phone.
- **Effects quality must never touch the seeded stream.** Cosmetic spawns
  ride `Math.random()`; anything gated by `effectsLevel()` must not sit in
  front of a `gameRand()` call.
- **Git worktrees don't carry gitignored files** — an agent running the gate
  in a worktree will find `serve.js`-adjacent gitignored assets missing;
  restore what the task needs or expect a red step that isn't real.
- **`migrateCheckpoint` rejects lvl<4 BY DESIGN** — checkpoints only exist
  from region boundaries; a test that hand-saves at level 2 will "fail" the
  bundle validator correctly.

---

## The release-identity terms (unchanged)

The Pokémon skin must stay playable locally — **never delete or degrade it.**
Any PUBLIC/commercial distribution of the Pokémon-branded skin still requires
the user's explicit call. AETHERFALL is the IP-clean identity and now ships
from its own repo; the workshop keeps both.
