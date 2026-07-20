# HANDOFF — Starfighter campaign build-out (next session)

> **STATUS: LIVE through M4 + the COMPLETE AETHERFALL skin (S1–S7).**
> Milestones 0/1 complete; M2 core; M3 Rounds A+B+C; M4 Rounds A–D; and
> the Milestone-10 release identity SHIPPED: the original AETHERFALL
> skin is live behind the title-screen edition toggle, alongside the
> untouched Pokémon skin. Suite **76 checks green**. Deployed at
> https://crawlerkarl.github.io/pokemon-brick/.

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

This is an **implementation** task, not another planning exercise. Continue
the campaign roadmap one milestone-round at a time: implement → verify →
test → document → commit → push → confirm the Pages build.

---

## Read these first (completely)

- `CLAUDE.md` — workflow + design invariants. **The newest invariant block
  covers the SKIN system** (registry, key stability, per-skin storage,
  checkpoint v4, procedural art rules, affinity limits, the toggle).
- `README.md` — file map (now 14 modules incl. skin.js / aetherfall.js /
  aetherart.js), system tour, gotchas.
- `docs/FULL_GAME_ROADMAP.md` — the 11-milestone plan; M10's identity
  decision is DONE (see its SHIPPED note).
- `docs/IMPLEMENTATION_LOG.md` — newest-first; the AETHERFALL S1–S7 entry
  documents every mechanism the skin added.
- `docs/ORIGINAL_SKIN_PLAN.md` + `docs/S1_SKIN_SPINE_DESIGN.md` — the
  approved design + audit the implementation followed.

---

## What the AETHERFALL arc shipped (2026-07-19)

- **`js/skin.js`** — SKINS registry; `SKIN` resolved at boot (`?skin=` →
  `SETTINGS.skin` → pokemon); `storeKey()` per-skin storage (pokemon keeps
  LEGACY bare keys, aetherfall uses `pkbrk-aetherfall-*`); `STARTER_KEYS`
  + runtime `skinStarters()`; `toggleSkin()` + `skinPillRect` (the title
  edition pill is the switch); `skinEvolveVerb()`.
- **Checkpoint v4** — `skin` + `affinity` fields; v1–v3 accepted forever;
  cross-skin checkpoints treated as absent; `freshStacks()` seeds all
  stack keys (incl. the six affinity satellites).
- **`js/aetherfall.js`** — the original universe: 18 classes (3
  disciplines), 9 realms, 54 unit lines ×3 forms (id space `r*100+n`,
  pilots 10–63, sentinels +90..92, legendary +80, mythic +81), habitat
  packs, intros/flavor/acts, boss-kit clones (same-slot mechanics,
  original names — VELMORA…AURELION PRIME), `SKIN.strings` +
  `SKIN.secret` (LUMINE VMAX), `treeLexicon` (path names per discipline
  via `skinPathName`), mode-card copy patch.
- **`js/aetherart.js`** — deterministic procedural renderer: 10 body
  archetypes + pilot VESSEL, act design language (magic organic → tech
  angular → magitech chrome+inlays), form escalation, legendary
  flourishes keyed by BOSS_STYLE, radiant hue-shift variants, bake cache
  honoring the `getSprite` contract (`SKIN.spriteMaker` dispatch).
- **Affinity (S6)** — LIGHT/DARK pick on the difficulty screen (aetherfall
  only), 3+3 satellites on STACK_ITEMS (`dawn/halo/grace` ·
  `fang/tithe/hex`) via `activeSatellites()`; effects wired at real
  chokes; web topology/caps untouched.
- **Tests 71 → 76**; gallery.html gained the AETHERFALL unit sheet;
  `verify-assets` stays pokemon-only by design (the S5 suite test IS the
  aetherfall asset audit).

## Pick up here (choose one)

### Option A — AETHERFALL polish pass (art + feel)
The skin is complete and playable end to end, but it's a first-generation
look. Worthwhile passes: richer per-line silhouette variation (the seeded
flavor switches are in place), bespoke mythic bodies, projectile tinting
by affinity, aetherfall-themed scenery accents (scenery.js is engine but
takes palettes from `SKIN.gens`), and a skin-aware daily-run label.

### Option B — M3 remaining objective families + region grammars
Capture-without-destroying, multi-lane defend, chase-the-elite; the
remaining 7 region grammars; unbuilt beat types (formation reveal, elite
intervention, hazard, victory lap). All engine work — benefits BOTH skins.

### Option C — M2 tail (cooling upgrades) or M9 balance
The proven loop applies: design → implement → fronted suite → screenshots
→ docs → deploy.

---

## How to work (this project's loop)

1. **Plan the round** — one coherent slice, logged in
   `docs/IMPLEMENTATION_LOG.md`.
2. **Implement**, then `node --check js/<file>.js`.
3. **Verify in the browser** — drive the sim from the console:
   `DEV.launch({level, mode:'junkie', diff, seed})`, loop `update(1/60)`,
   read `G.*`. Add `&skin=aetherfall` to any dev URL to test the skin
   (dev launches propagate `?skin=` automatically).
4. **Run the suite** — open `/test.html` **fronted** (~3–5 min), poll
   `window.TEST_DONE` / `window.TEST_RESULTS`. 76 checks green.
5. **Gates** — `npm run check`, `npm run verify-assets` (pokemon PNGs),
   suite green, no console errors, check BOTH skins boot
   (`/?skin=aetherfall` + default), 1280×720 + 390×844, `reduceFlash`,
   docs updated, `git diff --check` clean.
6. **Ship** — commit + push, then
   `gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds` and poll
   `.../pages/builds/latest` until `.commit == HEAD && .status == "built"`.

---

## Gotchas this arc learned (on top of the old list)

- **The browser pane's viewport is SHARED across tabs** — don't resize for
  screenshots while the suite runs.
- **aetherfall ids numerically collide with pokemon dex ids ON DISK**
  (`assets/sprites/101.png` is Electrode) — which is why `getSprite`
  dispatches to `SKIN.spriteMaker` BEFORE the PNG path. Never bypass it.
- **`skinStarters()` caches per load** — it's invalidated only by reload;
  fine because switching skins reloads.
- **Suite tests that swap `SKIN` must try/finally-restore it** — three
  existing skin tests are the pattern.
- **The stale-failure trap**: a suite run reflects the code AT LOAD; a
  fail you already fixed on disk stays red until the next run.
- Old list: agents ≠ polling loops; `gameRand()` never in comparators;
  VOLLEY's key is `arsenal`; storage via `loadStore`/`saveStore` only;
  killing a legendary mid-test advances the gauntlet (assert last).

---

## The release-identity terms (unchanged)

The Pokémon skin must remain playable locally — never delete or degrade
it. Any PUBLIC or commercial distribution of the Pokémon-branded skin
still requires the user's explicit call. The AETHERFALL skin is the
IP-clean identity; flipping the DEFAULT skin for a public build is a
one-line change (`SETTINGS.skin` default + `activeSkinId` fallback)
plus optionally lazy-loading the pokemon PNGs.
