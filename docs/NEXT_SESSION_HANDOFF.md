# HANDOFF — resume here

> **STATUS (2026-07-22): AETHERFALL is a shipped standalone game with its own
> repo + Pages site, and this repo is the WORKSHOP that generates it.** The
> 27-stage campaign is complete through Milestone 4 in both skins; production
> art covers all 259 ids (base + radiant) plus 54 high-res vessel previews and
> 21 Relicforge weapon sprites; the LIGHT/DARK oath is a real progression arc.
>
> **Suite: 78/78 PASSED.** Both sites live and verified (last GAMEPLAY
> commit in each — later docs-only commits don't change the build):
> - workshop `CrawlerKarl/pokemon-brick` @ `06b1714` → https://crawlerkarl.github.io/pokemon-brick/
> - dist `CrawlerKarl/aetherfall` @ `ad9e906` → the standalone AETHERFALL build
>
> **START WITH `AETHERFALL_IMPROVEMENT_BACKLOG.md`.** It is the current
> product backlog (17 ranked items, acceptance criteria, delivery sequence)
> and it SUPERSEDES unchecked items in `FULL_GAME_ROADMAP.md` where the two
> disagree. It was authored against the code as it stands today, so its P0
> list is the real "what's next" — not the older roadmap milestones.

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

---

## Read these first

- `AETHERFALL_IMPROVEMENT_BACKLOG.md` — **the backlog. Start here.**
- `../CLAUDE.md` — workflow + the design invariants you must not regress.
- `../README.md` — file map + system tour + gotchas.
- `IMPLEMENTATION_LOG.md` — newest-first record of every shipped round and
  the reasoning behind it. Newest entries: 2026-07-22a–d.
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
npm run art-overrides                          # scans final/ + preview/, regenerates the maps
python3 tools/build-aetherfall-previews.py     # 320px setup portraits from the 1254px masters
npm run build-dist                             # regenerates dist-aetherfall/ (RESIDUE must be "none")
```

**Live coverage today: 259 base + 259 radiant + 54 preview + 54
radiant-preview overrides, plus 21 weapon sprites.** Procedural art still
covers any id with no override and any load gap, so a partial run is always
safe.

**At session start: `git status` — if the user dropped new finals, run
`npm run art-overrides`, verify, commit, deploy.**

### Two art-tooling rules learned the hard way

- **Never assume the chroma colour — read it off the frame.** The production
  run uses **two** screens: green for most subjects, **magenta** for
  green-heavy art (water/grass/ice/bug lines — ids 13–18, 28–30, 43–45).
  Assuming green silently left 12 vessels sitting on a solid backdrop block.
  `detect_chroma()` medians a 6px border; the despill is channel-matched.
- **Previews must match the finals' framing (79% subject ratio,
  `pad = side * 0.134`).** Otherwise a hull visibly jumps size whenever the
  game swaps between a preview and its fallback final.

### Disk

`art/` is **1.1 GB** — but **1.0 GB of that is `sprites/source/`** (the
1254px editable masters) plus 31 MB of weapon art. Only `final/`(14 MB),
`preview/`(9 MB) and `weapons/final/` are referenced at runtime.
`dist-aetherfall/` is 64 MB. If repo size becomes a problem, pruning
`sprites/source/` is the lever — **but ASK FIRST, it's the user's working
art.** Local same-origin files only; the no-remote-fetch rule stands.

---

## What shipped 2026-07-22 (four rounds, all live)

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

**The backlog's P0 sequence is the recommended path:**

```
AFT-001 mobile safe zones  →  AFT-002 boss reveal  →  AFT-003 terminology
   →  AFT-017 oath evolution  →  AFT-004 trial sequencing
   →  AFT-005 release gate    →  AFT-006 save safety
```

Two notes so you don't redo finished work:

- **AFT-003 is half-done.** The TYPE half shipped (ASPECT lexicon,
  `typeLabel`/`typeWord`, `SKIN.strings.typeWord`). What remains is the
  **MEGA → AETHER SURGE** vocabulary: **56 player-facing `MEGA` strings still
  ship in the dist** (`grep -o "'[^']*MEGA[^']*'" dist-aetherfall/js/*.js`).
  Do the skin-aware vocabulary helper first so shared UI can't emit the old
  term; migrate internals (`G.mega`, `megaT`, `tryMega`) after, with a
  backward-compatible checkpoint migration. **`CHARGE` is a different system
  — never conflate it with SURGE.**
- **AFT-017 builds on what just shipped.** The form-graded curve
  (`[0.42, 0.72, 1]`) and neutral-until-sworn are live; the backlog asks for
  a much quieter start (~`0.10 / 0.48 / 1.00`), independently scaled fitting
  geometry/opacity/aura/rim rather than one alpha multiplier, and the oath
  resolving *during* the evolution ceremony.

The single highest-leverage structural item is **AFT-005 (automated release
gate)** — the 78-check suite still requires a human to front a browser tab
for ~20 minutes, which is the main brake on shipping confidently.

---

## How to work (this project's loop)

1. Plan one coherent slice; log it in `IMPLEMENTATION_LOG.md`.
2. Implement → `node --check js/<file>.js` (or `npm run check`).
3. Verify in the browser by driving the sim from the console (the preview
   throttles rAF): `DEV.launch({level, mode:'junkie', diff, seed})`, loop
   `update(1/60)`, read `G.*`; `G.freeze=999; render()` for a screenshot.
   Add `&skin=aetherfall` to any dev URL. If `!W`, force `W/H/canvas` then
   `buildStars(); buildVignette(); bgGen=-1`.
4. **Suite:** open `/test.html`, keep the tab **FRONTED** (background
   throttling makes it crawl — a full run is ~20 min). `TEST_RESULTS` only
   populates at completion, so poll the DOM table for live progress.
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

---

## The release-identity terms (unchanged)

The Pokémon skin must stay playable locally — **never delete or degrade it.**
Any PUBLIC/commercial distribution of the Pokémon-branded skin still requires
the user's explicit call. AETHERFALL is the IP-clean identity and now ships
from its own repo; the workshop keeps both.
