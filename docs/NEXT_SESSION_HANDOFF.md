# HANDOFF — resume here

> **STATUS (2026-07-22 evening): ALL EIGHT P0s FROM THE BACKLOG ARE
> IMPLEMENTED, TESTED, AND LIVE** (rounds g–o in the log): AFT-005A the
> 31s headless release gate (`npm test`), AFT-001 safe zones + fitted
> labels, AFT-003 the SURGE lexicon, AFT-004 the kinded announce queue +
> clean launches, AFT-002 the full-resolution boss reveal + HUD-lane dock,
> AFT-017 the oath evolution channels, AFT-006 save safety
> (export/import/backups/durable storage), AFT-018 frame stability
> (baked hot loops + the adaptive effects budget), and AFT-005B mobile
> scenes with fitted-label assertions + the artifact-storm ledger.
>
> **Suite: 85/85. `npm test` (~31s headless) ran green before every
> commit.** Production art: 259 base + 259 radiant + 54 previews +
> **43 boss reveals** + 21 weapon sprites. Both sites live:
> - workshop `CrawlerKarl/pokemon-brick` → https://crawlerkarl.github.io/pokemon-brick/
> - dist `CrawlerKarl/aetherfall` → the standalone AETHERFALL build
>
> **⚠ ONE THREAD IS OPEN — START HERE: boss-level frame rate.** The owner
> reported lag on boss levels TWICE. Round one (AFT-018b) fixed the
> fill-rate causes. Round two landed the **rAF cadence profiler** (below) —
> **but it has NOT been confirmed on the owner's real phone yet.** Ask
> whether boss levels feel smooth now before starting P1 work; if not, the
> next levers are listed under "If boss lag persists".
>
> **`AETHERFALL_IMPROVEMENT_BACKLOG.md` remains the scope authority** (17
> ranked items + acceptance criteria) and SUPERSEDES `FULL_GAME_ROADMAP.md`
> where they disagree — but read its status banner: its P0 list is DONE, and
> some of its status lines describe the pre-P0 world. Its **P1 ranking and
> acceptance criteria are still live and authoritative.**

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

---

## Read these first

- `AETHERFALL_IMPROVEMENT_BACKLOG.md` — **the backlog. Start here.**
- `../CLAUDE.md` — workflow + the design invariants you must not regress.
- `../README.md` — file map + system tour + gotchas.
- `IMPLEMENTATION_LOG.md` — newest-first record of every shipped round and
  the reasoning behind it. Newest entries run through **2026-07-23b**.
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
  `storeKey()`. Checkpoints are schema v4 (`skin` + `affinity`).
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
`preview/`(9 MB) and `weapons/final/` are referenced at runtime.
`dist-aetherfall/` is 64 MB. If repo size becomes a problem, pruning
`sprites/source/` is the lever — **but ASK FIRST, it's the user's working
art.** Local same-origin files only; the no-remote-fetch rule stands.

---

## What shipped, in brief (full detail in `IMPLEMENTATION_LOG.md`)

**2026-07-22 → 07-23: all eight P0s** — the headless gate (AFT-005A), safe
zones + fitted labels (001), the SURGE lexicon (003), the kinded announce
queue (004), the boss reveal scene (002), the oath evolution channels (017),
save safety (006), frame stability (018 + 018b + the cadence profiler), and
the mobile scene/label/storm harness (005B). Plus owner-reported fixes: the
trial picker overflow, the vessel size "pop", and two rounds of boss-level
performance work.

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

### 0. FIRST: confirm boss-level frame rate on a real device

The owner reported boss lag twice; two rounds of fixes shipped, and the
second is **unconfirmed on hardware**. Everything else waits on this.

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
  Absolute ms stay advisory; state-change counts gate hard.

### Then: the P1 track

The backlog's P1 sequence, in its own order:

```
AFT-007 ORBITAL RELIC (redesign the bond path)  →  AFT-008 balance matrix
   →  AFT-009 constellation redesign  →  AFT-019 first-session phone pass
   →  AFT-010 accessibility  →  AFT-011 loading/WebP  →  AFT-012 visual pass
```

Notes so you don't redo finished work:

- **`npm test` is the gate** (~31s full, `--fast` ~15s, `--suite` alone):
  syntax → assets → 85 invariants headless → both-skin + dist boots →
  vocabulary scan → RESIDUE → 15 mobile scenes × 2 viewports with
  fitted-label assertions (30 screenshots → `.gate-shots/`) → the wave AND
  boss storm ledgers (`.gate-report.json`). Run it before every commit.
- **AFT-003's optional tail** (renaming internal `G.mega`/`megaT`) remains
  ruled out by the backlog itself — engine identifiers ship unchanged.
- **AFT-018's deeper rungs are available but unimplemented by design**:
  rung 3+ (offscreen fragment/trail culls, animation sampling) waits for
  real-device evidence; the storm ledger accumulates the baseline every run.
- **AFT-007 groundwork that already exists**: the announce queue, fitLabel,
  the gate, and `compactInPlace` are the rails the relic path will ride;
  the backlog's guardrails section (bond key stays, five pair fusions
  re-themed under existing keys) is the spec.

---

## How to work (this project's loop)

1. Plan one coherent slice; log it in `IMPLEMENTATION_LOG.md`.
2. Implement → `node --check js/<file>.js` (or `npm run check`).
3. Verify in the browser by driving the sim from the console (the preview
   throttles rAF): `DEV.launch({level, mode:'junkie', diff, seed})`, loop
   `update(1/60)`, read `G.*`; `G.freeze=999; render()` for a screenshot.
   Add `&skin=aetherfall` to any dev URL. If `!W`, force `W/H/canvas` then
   `buildStars(); buildVignette(); bgGen=-1`.
4. **Suite:** `npm test` (headless, ~31s; `--fast` ~15s while iterating).
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
  check went intermittently red. Fixed 2026-07-23. If a determinism test
  ever goes flaky, instrument `gameRand` call SITES (wrap it and capture
  `new Error().stack`) and diff two runs — that found this in minutes.
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
