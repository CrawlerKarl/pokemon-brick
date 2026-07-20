# ORIGINAL SKIN PLAN — "AETHERFALL" (working title)

> **STATUS: APPROVED DESIGN, not yet implemented.** This is the plan for the
> Milestone-10 "release identity" decision (see `FULL_GAME_ROADMAP.md`): the
> user has chosen to build an **original sci-fi × fantasy skin** alongside the
> Pokémon skin, selectable by a runtime toggle. Four decisions are locked:
>
> 1. **Runtime skin toggle** — one deploy, a `SKINS` registry, per-skin
>    namespaced storage. Both skins stay playable.
> 2. **18 classes in 3 disciplines** — the 18-type engine survives 1:1;
>    every type key gets a class costume tagged MAGIC / TECH / MAGITECH.
> 3. **Affinity** — discipline auto-themes the upgrade web's language/VFX;
>    **LIGHT vs DARK** is the player-chosen fork every class gets.
> 4. **Art** — trimmed roster (~100 units) drawn by a parts-based
>    procedural renderer. No PNG assets in the new skin.
>
> All names in this doc (skin title, classes, realms, bosses) are
> **suggestions — tune freely during implementation.** The *structures* are
> the plan.

---

## The prime directive: internal keys never change

The engine already proves this pattern with modes: `classic/blaster/junkie`
are storage-stable internal keys; BREAKER/BLASTER/STARFIGHTER are labels.
The reskin extends that rule to everything:

- **Type keys** (`'fire'`, `'steel'`, … — `TYPE_COLORS`, `EFFECTIVE`,
  `RESIST`, `STARTER_MON`, checkpoints) — NEVER renamed. A "class" is a
  type wearing a costume. The effectiveness chart, resisted-shot
  deflection, element orbs, the PRISM path, `starterStage`'s electric
  special case: all untouched.
- **Path/stack/web keys** (`arsenal`, fusion/apex/satellite keys) — NEVER
  renamed. The web keeps its exact 50-node topology and slot caps (the
  balance spine).
- **Mode + difficulty preset keys** — unchanged, shared across skins.
- **Species ids are per-skin.** The Pokémon skin keeps national-dex ids;
  the new skin gets its own small id space. Ids only ever meet storage
  inside per-skin namespaced keys (below), so they cannot collide.

The skin owns **presentation + world data**: display names, strings, art,
region/boss identities, rosters. Logic files consume skin tables the same
way they already consume `BOSS_CHANNELS[id]` — by key, never by literal.

---

## Architecture: `js/skin.js` + the `SKINS` registry

New module loaded **after `config.js`, before `data.js`** in `index.html`.

```js
const SKINS = {
  pokemon:   { /* wraps today's tables verbatim */ },
  aetherfall:{ /* the original skin */ },
};
let SKIN = SKINS[activeSkinId()];   // resolved once at boot
```

Skin selection: `SETTINGS.skin` (global, in `pkbrk-settings`), override via
`?skin=` URL param (dev), surfaced as a toggle on the title screen (final
round). Switching skins reloads the page — no live mid-session swap.

### Shape of a skin object

| Field | Replaces / feeds | Notes |
|---|---|---|
| `id`, `title`, `edition` | `GAME_TITLE` stays; `SKIN_EDITION` → `SKIN.edition` | also `index.html` `<title>` set at boot |
| `classes[typeKey]` → `{name, discipline, blurb}` | display layer over `STARTER_MON` | 18 entries; discipline ∈ `magic/tech/magitech` |
| `disciplines[k]` → `{name, palette, treeLexicon}` | upgrade-web naming/VFX | see Affinity section |
| `starterLines[typeKey]` → `{ids, names, tierNames}` | `STARTER_MON` name fields | mods/abilities stay engine-side, shared |
| `gens[9]` | `GENS` | same shape: name/scene/sky/land/accent/boss/gauntlet/tiers |
| `names[id]`, `habitatPacks`, `typeClusters` | `NAMES`, `HABITAT_PACKS`, `TYPE_CLUSTERS` | per-skin id space |
| `bossTables` | `BOSS_ABILITIES/CHANNELS/STYLE/PROJECTILE_KIND`, entrance/battle style + name maps | new ids, **cloned kit mechanics** (see World) |
| `sprite(id, shiny)` | `getSprite` | Pokémon: PNG loader (remote fallback ONLY in this skin); Aetherfall: procedural, baked+cached |
| `glyphs` | `drawGlyph` extras | pokéball glyph → skin sigil; per-type glyphs stay keyed by type key |
| `strings` | flavor layer | dex label (`◓ POKÉDEX` → `⬢ CODEX`), ceremony verbs, ending name, coach copy, `REGION_INTROS`, `STAGE_FLAVOR`, `JUNKIE_ITEMS`/`DEX_REWARDS`/`CHEAT_ITEMS` labels, mode `desc/summary/lines`, music titles |

**Migration of existing tables:** `data.js` keeps its tables but they become
the *values* of `SKINS.pokemon`; every consumer switches from the global to
`SKIN.*` (mechanical find-replace, verified by the suite running
bit-identical on the Pokémon skin). The `STARTERS` duplicate in `config.js`
must be replaced by a skin read (it exists only because config parses before
data — `skin.js` loading after config fixes the ordering problem it solved).

**Easter-egg gating:** the ~6 hardcoded id checks (`id===25` pika chirp,
`id===-1` MISSINGNO., `id===129` Magikarp, `id===483` Dialga fire-rate
tweak, Ditto/Mew preloads) get a `SKIN.id === 'pokemon'` guard — except
483, which moves into the boss kit table where it belonged anyway.

---

## Storage: namespace before anything else ships

Today every key is un-namespaced and checkpoints don't record a skin —
toggling would corrupt saves and merge meaningless dex sets. **Round S1
fixes this before any new-skin content exists.**

- `storeKey(base)` helper inside `loadStore`/`saveStore`: per-skin keys
  become `pkbrk-<skin>-<base>`; the Pokémon skin keeps the LEGACY bare
  names (`pkbrk-run`, `pkbrk-dex`, …) so every existing save keeps working
  with zero migration.
- **Per-skin:** `run`, `dex`, `dexs`, `medals`, `victory`, `best`, `daily`,
  `jcoach`.
- **Global:** `settings` (holds the skin choice itself), `music`, `v`.
- Checkpoint schema v4: add `skin` field; `migrateCheckpoint` treats
  missing skin as `'pokemon'` (v1–v3 accepted forever, never throws —
  existing invariant).

---

## The 18 classes

Innate abilities, tier mods, and bolt mechanics are the engine's — only
names/art change. The current abilities map onto class fantasies almost 1:1
(Porygon was already a digital creature; SWARM was already drones).

The setup screen already pages the roster in **three groups of six — each
page becomes one discipline.**

| Type key | Class | Discipline | Innate (engine ability, reflavored) |
|---|---|---|---|
| fire | PYROMANCER | MAGIC | BLAZE → **KINDLE**: hits ignite |
| ice | FROSTWEAVER | MAGIC | SNOW WARNING → **STILLFROST**: KOs slow time |
| grass | DRUID | MAGIC | OVERGROWTH → **HARVEST**: more drops, wider catch |
| ghost | NECROMANCER | MAGIC | PHASE SHIFT → **SHROUD**: dodge chance |
| dark | SHADOWMANCER | MAGIC | MOXIE → **BLOODLUST**: combos amplify |
| fairy | FEYWARDEN | MAGIC | WISH → **BLESSING**: potion pity, easier catches |
| steel | ENGINEER | TECH | IRON DEFENSE → **DEFLECTOR ARRAY**: start shielded |
| bug | SWARM OPERATOR | TECH | SWARM → **DRONE UPLINK**: KOs launch extra strikes |
| poison | CHEMIST | TECH | CORROSION → **CATALYST**: repeated hits melt armor |
| flying | AERONAUT | TECH | TAILWIND → **JETWING**: wider rig, faster |
| rock | SIEGEWRIGHT | TECH | STURDY → **PLATING**: bonus max HP |
| fighting | VANGUARD | TECH | GUTS → **BERSERK PROTOCOL**: missing HP boosts damage |
| electric | STORMBINDER | MAGITECH | OVERDRIVE — **the fan-favorite OP pick**; late spike keys off `'electric'` in `starterStage`, fires in realm 5 (the grid city — thematic jackpot) |
| psychic | PSION | MAGITECH | FORESIGHT → **PRECOG TARGETING**: scheduled crits |
| dragon | WYRMRIDER | MAGITECH | DRAGONHEART → **REACTOR HEART**: start charged, longer Mega |
| ground | TERRASHAPER | MAGITECH | SAND FORCE → **SEISMIC RIG**: armor crush, quakes |
| water | FLUXWEAVER | MAGITECH | TORRENT → **COOLANT LOOP**: cooler shots, return shields |
| normal | DRIFTER | MAGITECH | ADAPTABILITY → **OMNIFRAME**: damage + score |

NO PARTNER stays the neutral **TRAINING DRONE** (already theme-clean).
Evolution language per discipline: MAGIC *awakens* (Apprentice → Adept →
Archon tier names), TECH *upgrades* (MK I → II → III), MAGITECH
*synthesizes*. `webForm()` / `starterLvl` gating untouched.

---

## Affinity: LIGHT vs DARK over discipline lexicons

Two layers, both presentation-cheap, one mechanically real:

1. **Discipline lexicon (automatic).** `SKIN.disciplines[k].treeLexicon`
   maps node keys → display name + VFX tint per discipline. VOLLEY reads
   *ARCANE BARRAGE* (magic) / *AUTOCANNON ARRAY* (tech) / *RUNIC GATLING*
   (magitech). A pure-TECH pilot never sees spell vocabulary — the
   "block magic for tech classes" requirement, satisfied by construction.
   Node **keys, effects, topology, slot caps: identical.** Only
   `drawTreeDetail`/draft-card copy and particle tints consult the lexicon.
2. **LIGHT / DARK choice (player-picked at setup**, alongside class +
   difficulty; `SETTINGS.affinity` + checkpoint field, Pokémon skin
   ignores it**).** Mechanically it is a *lean*, not a second tree:
   - 3 LIGHT satellites (shield/recovery/deflection flavor) + 3 DARK
     satellites (drain/crit/risk-reward flavor), built on the existing
     `STACK_ITEMS`/satellite machinery and gated in `rollUpgradeChoices`
     exactly like mode-gating — your affinity's three replace three
     neutral stacks in the offer pool.
   - Global VFX tint (radiant golds vs void purples) on bolt trails,
     Mega, ceremony.
   - **Never** a separate web. The 50-node graph and MAX-2-FUSION /
     MAX-1-APEX caps are the balance spine.

---

## The world: nine realms, an arc from magic to magitech

Scene keys (`hills/pagoda/waves/…` — `scenery.js` is already theme-neutral)
and music compositions (original, selected by index) are **shared**; the
skin swaps names, intros, flavor, rosters, and boss identities. The ACT
structure gains meaning: **Act 1 = the old magic world, Act 2 = the tech
ascendancy, Act 3 = the convergence.**

Every boss below **clones an existing kit row bit-for-bit** (style, channel
pattern+params, signature entities, projectile kind) under a new id + name —
the M4 mechanics are original work and carry over; only Pokémon identities
are replaced. Mythic/sentinel identity slots are left one-line open — they
are a creative round of their own.

| # | Realm (scene) | Identity | Boss (kit cloned from) |
|---|---|---|---|
| 1 | THE GREENSPELL MARCHES (hills) | pastoral magic frontier; where every journey begins | **VELMORA, THE FIRST ORACLE** — blink-teleports, focus orbs, MIND SPIKE columns *(Mewtwo kit)* |
| 2 | THE BELLTOWER REACHES (pagoda) | monastery skies, wind rites | **ZEPHYRION, WARDEN OF GALES** — figure-eight glide, storm feathers, tailwind drift, GALEBREAK sweep *(Lugia kit incl. TAILWIND)* |
| 3 | THE DROWNED EXPANSE (waves) | drowned old-world ruins; Act 1 finale | **THALASSAR, THE DEEP CURRENT** — serpent thread, wake shards, RIPTIDE ASCENT *(Rayquaza kit)* |
| 4 | THE FOUNDRY PEAKS (mountain) | the first machine city, carved into stone | **THE CLOCKWORK REGENT** — bastion heart, chrono gears, time dilation, DECREE OF HOURS clock *(Dialga kit incl. TIME DILATION)* |
| 5 | THE CHROME SPRAWL (skyline) | neon grid metropolis; Stormbinder's spike lands here | **VOLTREX, THE GRID TYRANT** — flank slams, conduits buff its fire, ARC STRIKE columns, FUSION RAIN *(Zekrom kit)* |
| 6 | THE SPIRE OF GLASS (tower) | corporate archology gone necrotech; Act 2 finale | **NYXHARROW, THE CARRION ANGEL** — corner dives, drain wisps heal it, OBLIVION FAN, ENTROPY PINCER *(Yveltal kit)* |
| 7 | THE RIFT ATOLLS (palms) | isles where ley lines pierce tech ruins | **THE PALE ECLIPSE** — lissajous phase glide, dream motes, VEILED PHASE, MOONFALL columns *(Lunala kit)* |
| 8 | THE CRUCIBLE (stadium) | the war arena where both powers collide | **OMEGA SERAPH** — rim patrol, growth cysts buff its rain, WORLDBREAKER sweep *(Eternatus kit)* |
| 9 | THE SUNDERED CRADLE (mesa) | birthplace of the split; the finale | **AURELION PRIME, THE FIRST FUSION** — full-sprint charges, afterimage launchers, COLLISION PROTOCOL bouncing sweep *(Koraidon kit)* |

Nine mythic slots clone the mythic kit rows (GENESIS WAVE → e.g. ORIGIN
PULSE-style renames); nine sentinel formations keep their entrance styles
under new names. Ending: THE NINEFOLD DAWN → **THE SUNDERING HEALED**
(placeholder). Habitat packs get original ecology names per realm
("ASH'S PARTNERS" → e.g. "THE HEDGEWITCH'S FAMILIARS").

---

## Art: ~100 units from a parts-based procedural renderer

- **Roster math:** 9 realms × ~8 base units + elites-as-variants + 9
  legendaries + 9 mythics + sentinels ≈ 100–120 distinct looks. Rosters
  keep the `[id,'type']` shape; tiers reuse base units as palette/elite
  variants (bigger + armored trim), exactly how evolved elites work today.
- **Renderer:** `SKIN.sprite(id)` composes a unit from parts — body
  archetype (serpent/biped/quadruped/hover-drone/turret/winged…), head,
  wings/limbs, emitter — with discipline design language: **magic** =
  organic flowing curves + rune accents, **tech** = angular chassis +
  thruster glows, **magitech** = chrome with glowing rune inlays. Palette
  from class type-color. **Baked once to an offscreen canvas and cached**
  (the performance invariant: no per-frame gradient/shadowBlur work) —
  same contract `getSprite` PNGs have now, so render call-sites don't
  change. `MOTION_PROFILES` gaits keyed per unit as today.
- **Verification:** extend `gallery.html` with a unit sheet per skin;
  `verify-assets` becomes skin-aware (Pokémon: id → PNG exists; Aetherfall:
  id → parts recipe exists + name). The PokeAPI remote sprite fallback is
  Pokémon-skin-only — the new skin must never touch the network.

---

## Build order (rounds, each shippable)

Follow the standard loop (implement → `node --check` → console-driven sim →
`test.html` frontal → gates → commit/push/Pages). **The Pokémon skin must
be bit-identical after every round** — the existing 65-check suite is the
regression guard; add skin checks as listed.

- **S1 — Skin spine + storage.** `js/skin.js`, `SKINS.pokemon` wrapping
  today's tables, all consumers on `SKIN.*`, `storeKey()` namespacing +
  checkpoint v4 skin field, easter-egg gating, `?skin=` param. *Zero
  visible change. New tests: legacy-key preservation, v3→v4 migration,
  per-skin isolation.*
- **S2 — Class + string layer.** `classes`/`disciplines`/`starterLines`,
  discipline lexicon plumbing (`tierDesc`, draft cards, tree detail),
  strings table (dex label, ceremony verbs, mode copy, items/rewards),
  setup-screen discipline pages. Placeholder art (tinted silhouette
  shapes) so Aetherfall is *playable-ugly* end to end.
- **S3 — World data.** `gens` (9 realms), rosters, habitat packs, region
  intros, stage flavor, objective/medal names, music title overlay.
- **S4 — Boss identities.** Clone the 9+9 kit rows under new ids/names,
  entrance style names, gauntlet flavor. *The M4 duel tests, run under
  the Aetherfall skin, are the guard that kits survived the clone.*
- **S5 — Procedural unit art.** Parts renderer + bake cache, unit sheet
  in `gallery.html`, skin-aware `verify-assets`, boss/mythic looks.
- **S6 — Affinity.** Setup pick, checkpoint field, 3+3 satellites, VFX
  tints. *Test: affinity gates offers correctly; slot caps unchanged.*
- **S7 — Toggle UI + polish.** Title-screen skin toggle, per-skin
  progression strip, `index.html` title at boot, README/CLAUDE updates.

**Effort centers, ranked (from the codebase audit):** unit art volume >
world/boss identity authoring > string layer breadth > skin plumbing >
storage. Nothing on the list is a combat-mechanics rewrite — that risk was
designed out by keeping the 18-type engine.

---

## Risks / gotchas banked up front

- `config.js` `STARTERS` duplication exists only for parse order — kill it
  in S1 by loading `skin.js` between config and data, or it WILL drift.
- `verify-assets` and `tools/fetch-sprites.js` assume PNG-per-dex-id;
  fence them per-skin in S5 or CI lies.
- The dex/codex UI sorts by id — fine per-skin, but never mix id spaces in
  one view.
- Cheat panel, dev tooling (`DEV.launch`, F9) must work under both skins —
  dev launches gain a `skin=` param in S1.
- Music `region` labels come from the skin; composition selection stays
  index-based (`musicTheme(genIdx)`) — do not fork audio code.
- The public deploy ships Pokémon PNGs regardless of toggle. If the goal
  ever becomes public/commercial distribution, flipping the *default*
  skin (and optionally lazy-loading Pokémon assets) is the switch — the
  architecture makes that a one-line change plus an asset-loading tweak.
