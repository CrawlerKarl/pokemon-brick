# HANDOFF — resume here

> **STATUS (2026-07-20): the campaign is complete through Milestone 4, the
> AETHERFALL original skin is fully shipped (S1–S7), the sprite art is
> production-quality, two balance rounds and a full title-screen overhaul
> are live, and the campaign has an authored narrative + pacing voice for
> all 27 stages in both skins.** Live at
> https://crawlerkarl.github.io/pokemon-brick/ (GitHub Pages, deploys from
> `main`). Repo `CrawlerKarl/pokemon-brick`.
>
> **NEWEST (2026-07-21): AETHERFALL IS A STANDALONE GAME.** The owner's
> release-identity move landed: radiant art for all 259 ids (base+radiant
> override maps, real prismatic shiny), every pokemon leak in the aetherfall
> runtime skin-routed (incl. LUMINE VMAX → LUMINE ASCENDANT), data.js split
> into engine + js/pokeworld.js (STARTER_KIT carries shared balance
> numbers; suite-verified deep-equal), the skin registry is single-skin
> capable with SKIN.brand wordmarks, the LIGHT/DARK affinity is a REQUIRED
> ceremonial pick with combat VFX (halo/charge ring/Mega shock/HUD chip),
> and `npm run build-dist` generates the pokemon-free distribution
> (dist-aetherfall/, RESIDUE: none) which deploys to the
> **CrawlerKarl/aetherfall** repo + Pages site. See CLAUDE.md's release
> section for the two-repo flow. THIS repo remains the workshop.
>
> **PREVIOUS (2026-07-20b): the Rift is EARNED.** Kanto's shards are one-shot
> skill tests now — shooter modes get a swift RIFT COURIER crosser you must
> shoot down before it exits (escape = shard lost; `SKIN.secret.courier`),
> BREAKER gets a fast swaying one-pass fall you must paddle-catch. And the
> Mew VMAX reward is ONE bounty draft where you CHOOSE TWO from the same hand
> (`G.bonusPicks` + `holdBonusPick`, input.js — replaced
> `G.secret.bonusDrafts`/`chainBonusDraft`'s two chained drafts). See the
> implementation log.
>
> **ALSO (2026-07-20): BREAKER (classic) is now a CALM ball-only game** —
> the owner asked to remove enemy fire and the paddle gun from the "normal
> brick breaker game." Classic now takes **zero enemy fire** (director skipped
> + `spawnEnemyShot` no-op + columns cleared) and has **no paddle gun**
> (`blasterArmed()` false in classic; `fireCharge` guarded). The only way to
> lose a life is dropping the ball. Bosses still move/phase/summon guard bricks
> but never shoot. The OFFENSE paths reskin to ball power in classic (TWIN ORB
> multiball, WIDE ARRAY paddle, POWER/SHATTER CORE ball damage, LASER→MULTIBALL)
> so no draft pick is dead; shooter modes keep the same tiers as guns via
> `sdesc`. See the implementation log + the classic-mode bullet in CLAUDE.md.
> The 'classic calm' + 'classic offense reskin' suite tests replaced the
> obsolete 'classic deflector core' / 'classic guns' tests.
>
> **GATE: GREEN.** The full invariant suite (`/test.html`, 78 checks) ran to
> completion after BOTH rounds (calm classic + earned rift/choose-2 bounty) —
> **78/78 PASSED**, 0 fails, including the new 'classic calm', 'classic
> offense reskin', extended 'Kanto Rift Key' (courier), and 'Mew VMAX bounty'
> tests. Along the way the courier test exposed a REAL bug — `resetRun` never
> cleared `G.dramaticT`/`G.freeze`, so a fresh run could open in ×0.3 slow-mo —
> now fixed. Committed and deployed (owner-approved), together with the art
> pipeline's realms 5–9 finals sweep (220 overrides live).

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

---

## Read these first

- `../CLAUDE.md` — workflow + the design invariants you must not regress.
  The newest ones cover the SKIN system, the classic deflector-core, the
  partner-typed classic guns, and THE THREE DOORS title layout.
- `../README.md` — file map (14 JS modules now) + system tour + gotchas.
- `FULL_GAME_ROADMAP.md` — milestone status (M10 identity = SHIPPED).
- `IMPLEMENTATION_LOG.md` — newest-first record of every shipped round,
  including all of this session's work with the reasoning behind it.
- `archive/` — historical plan docs for shipped features (see its README).

---

## The architecture in one screen

Vanilla-JS canvas game, no build step. 14 JS modules in `js/`, loaded in
order via `<script>` tags in `index.html` (later files reference earlier):
`setup → config → skin → audio → data → aetherfall → aetherfall-overrides.generated
→ aetherart → scenery → state → input → update → render → dev → main`.

- **Two skins, one engine.** `js/skin.js` owns the `SKINS` registry and
  the live `SKIN` (resolved at boot: `?skin=` → `SETTINGS.skin` →
  `pokemon`). Presentation + world data ride `SKIN.*`; the engine (type
  keys, effectiveness, modes, paths, the 50-node web) is shared. The
  **pokemon** skin keeps LEGACY bare storage keys (`pkbrk-*`) — zero
  migration; **aetherfall** namespaces to `pkbrk-aetherfall-*` via
  `storeKey()`. Checkpoints are schema v4 (`skin` + `affinity` fields).
  The edition pill on the home screen toggles skins (saves + reloads).
- **AETHERFALL** (`js/aetherfall.js`) is an original sci-fi × fantasy
  world: 18 classes across MAGIC/TECH/MAGITECH, 9 realms, 54 unit lines,
  27 sentinels + 9 legendary + 9 mythic bosses that CLONE the M4 kit
  mechanics under original ids/names. Strings, lexicon, roster-group
  shelf names, and a rift secret (LUMINE VMAX) all live here.
- **Procedural art** (`js/aetherart.js`) draws every AETHERFALL unit
  from bespoke per-line painters (no image assets), baked once + cached.
  It ALSO hosts the **production-art override layer** (see below).
- Three modes: **classic** (BREAKER, ball+earned blaster), **blaster**
  (BLASTER, ball-less), **junkie** (STARFIGHTER, the flagship flight
  shooter). Internal keys are storage-stable — never rename.

---

## THE ART PIPELINE (the user runs this in parallel — check it every session)

The user generates production sprites in a separate workflow into
`art/aetherfall-production/sprites/final/` as `af-<id>-<slug>.png`.
**To wire new art into the game:**

```
npm run art-overrides     # scans final/, regenerates js/aetherfall-overrides.generated.js
```

`aetherart.js` blits each override PNG onto its cached procedural canvas
on load (same object identity → every reference upgrades in place;
procedural art covers any id with no override, and any load gap). As of
2026-07-20 (evening sweep) there are **220 overrides live** — all 18
vessels ×3 forms, ALL realms 1–9 creatures, and the heralds; the
remaining gap is bosses/sentinels. **At session start: `git status` — if
the user dropped new finals, run `npm run art-overrides`, commit,
deploy.**

- Local same-origin files only — the no-remote-fetch rule stands.
- `art/` is ~253 MB / 265 PNGs (128px finals + 1024px source masters +
  previews). The masters/sources are the user's editable originals; they
  are NOT needed at runtime (only `final/` is referenced). If repo size
  becomes a problem, pruning `sprites/source/` + `sprites/previews/` is
  the lever — but ASK FIRST, it's the user's working art.

---

## What shipped this session (2026-07-20) — all live

1. **AETHERFALL skin, rounds S1–S7** — the whole original edition
   (registry, storage, classes, world, boss clones, procedural art,
   affinity, toggle). Suite guarded the pokemon skin bit-identical.
2. **Sprite art v2** — replaced 10 generic archetypes with 99 bespoke
   painters (259 baked looks) + a cel-shade/rim-light/sticker-outline
   finish pipeline. Then the production-art override layer.
3. **BREAKER deflector core** — enemy fire/beams damage only a FIXED
   center core (`classicCoreHalf`); paddle wings deflect free; width is
   pure upgrade again; wave fire capped at 8 live shots.
4. **BREAKER guns = partner support arm** — classic bolts are now the
   partner's typed attack (Starfighter shapes/element/tier); support
   cadence relaxed + 0.7 power; `explosive` only from FIREBALL, never a
   free Mega fireball carpet; charge arc runs in classic while armed.
5. **THE THREE DOORS title overhaul** — home is three big self-
   explanatory game cards (tap → partner select in one step); the
   partner screen is one detail hero + three labeled shelves of small
   tiles (`SKIN.rosterGroups`; disciplines on aetherfall).
6. **The voice & pacing pass** — flight-log flavor for all 27 stages ×
   both skins (`STAGE_FLAVOR` / aetherfall `stageFlavor`), and all nine
   `REGION_GRAMMAR` entries authored (was 2 + a default).
7. **Adversarial review + 2 fixes** — an Opus multi-agent review caught
   two real defects: no-partner classic bolts were type-`normal`
   (stealth resist nerf) → `attackElement()` now returns `null` for a
   partnerless player, symmetric with `playerType()`; and the skin pill
   overlapped/out-prioritized CONTINUE on landscape phones → clamped +
   input reordered (CONTINUE outranks the pill).

---

## Pick up here (options, roughly highest-value first)

- **Run the suite + close the open gate** (5 min of your attention, 20
  min wall): open `/test.html` fronted, confirm 78/78, note it in the
  log. Do this before shipping anything new.
- **Finish the production art** — the user's pipeline is ~130/259 ids
  in. Keep sweeping new finals (`npm run art-overrides`); the remaining
  work is realms 6–9 creatures + the 27 bosses/sentinels. Bosses are
  192px and want more ornament per the style bible.
- **AETHERFALL polish** — bespoke mythic bodies in the procedural
  fallback, affinity VFX tints on bolts/Mega, aetherfall-themed scenery
  accents (scenery.js takes palettes from `SKIN.gens`).
- **M3 remaining objective families** — capture-without-destroying,
  multi-lane defend, chase-the-elite; the friendly-entity infra exists.
- **M2 tail** — cooling upgrades that reshape play; heat swept across
  difficulties.

---

## How to work (this project's loop)

1. Plan one coherent slice; log it in `IMPLEMENTATION_LOG.md`.
2. Implement → `node --check js/<file>.js` (or `npm run check`).
3. Verify in the browser by driving the sim from the console (the
   preview throttles rAF): `DEV.launch({level, mode:'junkie', diff,
   seed})`, loop `update(1/60)`, read `G.*`; `G.freeze=999; render()`
   for a screenshot. Add `&skin=aetherfall` to any dev URL to test the
   skin. If `!W`, force `W/H/canvas` then `buildStars(); buildVignette()`.
4. **Suite:** open `/test.html`, keep the tab FRONTED (background
   throttling makes it crawl — a full run is ~20 min), poll
   `window.TEST_DONE` / `window.TEST_RESULTS`.
5. Gates: `npm run check`, `npm run verify-assets` (pokemon PNGs),
   `npm run art-overrides` (if new finals), suite green, no console
   errors, both skins boot (`/?skin=aetherfall` + default), inspect
   1280×720 + 390×844 + short landscape, docs updated, `git diff --check`.
6. Ship: commit (end-user message + `Co-Authored-By: Claude …`), push,
   then `gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds` and
   poll `.../pages/builds/latest` until `.commit == HEAD && .status ==
   "built"`. Verify a changed file serves live.

---

## Gotchas this session learned the hard way

- **`npm run art-overrides` after every new-finals batch** — otherwise
  the game keeps drawing procedural art for ids that have real PNGs.
- **aetherfall ids numerically collide with pokemon PNG filenames on
  disk** (`assets/sprites/101.png` is Electrode). `getSprite` dispatches
  to `SKIN.spriteMaker` BEFORE the PNG path — never bypass it.
- **test.html pins `?skin=pokemon` itself** so the user's saved edition
  toggle can't leak into the bit-identity gate. Don't remove that.
- **Tests that set `SETTINGS.starter` must reset it to `'none'`** at the
  end — a partner's damage mods leak into later integer-math tests.
- **A Pages build POSTed while another is building can transiently
  `errored`** — just re-trigger; it's not a real failure.
- **The dev server occasionally dies mid-suite** (every-id-missing fetch
  failures) — `preview_list`, restart with `preview_start`, re-run.
- **`gameRand()` never in a sort comparator** (desyncs seeds). The
  VOLLEY path's internal key is `arsenal`. Storage only via
  `loadStore`/`saveStore` → `storeKey`.
- **Don't poll agents with sleep loops** — background work notifies
  automatically. (An ultracode review this session interrupted on Stop
  left orphaned agent transcripts; a fresh relaunch is cheaper than a
  resume when nothing completed.)

---

## The release-identity terms (unchanged)

The Pokémon skin must stay playable locally — never delete or degrade
it. Any PUBLIC/commercial distribution of the Pokémon-branded skin still
requires the user's explicit call. AETHERFALL is the IP-clean identity;
flipping the DEFAULT skin for a public build is a one-line change
(`SETTINGS.skin` default + `activeSkinId` fallback) plus optionally
lazy-loading the pokemon PNGs.
