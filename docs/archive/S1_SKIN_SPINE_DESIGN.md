# Round S1 design — the skin spine + storage (executable spec)

Implements the first round of `ORIGINAL_SKIN_PLAN.md`. Goal: after S1,
the game is skin-plumbed with **zero visible change** — the Pokémon
skin is bit-identical (the full suite is the guard), storage is
namespaced, and a stub `aetherfall` skin id proves isolation. All
line refs from the S1 audit (2026-07-19); re-verify before editing.

## 1. `js/skin.js` — new module, load order

Insert `<script src="js/skin.js">` in index.html **between config.js
(line 38) and audio.js (39)**. It needs `SETTINGS`/`loadStore` (before
it) and must precede data.js so tables can become `SKINS.pokemon.*`.

```js
// resolution order: ?skin= URL param → SETTINGS.skin → 'pokemon'
const SKIN_QS = new URLSearchParams(location.search).get('skin');
const SKINS = { pokemon: {...}, aetherfall: {...stub...} };
function activeSkinId() {
  const id = SKIN_QS || SETTINGS.skin || 'pokemon';
  return SKINS[id] ? id : 'pokemon';
}
let SKIN = SKINS[activeSkinId()];
if (!SKINS[SETTINGS.skin]) SETTINGS.skin = 'pokemon'; // validation lives HERE (config can't see SKINS)
function storeKey(base) {
  return SKIN.id === 'pokemon' ? 'pkbrk-' + base : 'pkbrk-' + SKIN.id + '-' + base;
}
```

`SKINS.aetherfall` in S1 is a **minimal stub** (id/title/edition + the
pokemon tables aliased) — it exists so isolation is testable; content
arrives S2+. Switching skins reloads the page (no live swap).

## 2. Parse-order rules (the two traps)

- **config.js parses BEFORE skin.js** → config may not reference
  `SKIN`/`SKINS` at parse time. The `STARTERS` literal
  (config.js:151-161) is killed and replaced by a RUNTIME helper in
  skin.js (`skinStarters()` → `[{key, label}]` from
  `SKIN.starterLines[k].names[0]`); all five consumers are runtime
  call sites (config.js:162→moved, config.js:251, dev.js:35,
  input.js:1092, render.js:5227) — update each to call the helper.
  The `SETTINGS.starter` validation (config.js:162) MOVES into
  skin.js after SKIN resolves.
- **setup.js parses before everything** → `loadStore`/`saveStore`
  stay untouched; `storeKey` lives in skin.js and is applied AT CALL
  SITES. Every per-skin key read/write lives in files loaded after
  skin.js (verified in the audit) — no ordering hazard. The raw
  `pkbrk-v` bootstrap (setup.js:26) runs pre-skin and stays bare
  (global).

## 3. Storage namespacing

Per-skin (call sites switch to `storeKey('<base>')`): `run`
(state.js:129,142,144), `dex`/`dexs` (data.js:1547-1548,1568-1569),
`medals` (state.js:391,396), `victory` (state.js:1656,1674), `best`
(state.js:216, input.js:415, update.js:2157), `daily`
(state.js:145,166), `jcoach` (state.js:1350, update.js:3008).
Global (literals unchanged): `pkbrk-settings`, `pkbrk-music`,
`pkbrk-v`. Pokémon resolves to the LEGACY bare names — zero
migration, every existing save keeps working, and the storage-recovery
test (test.html:1758) passes unchanged.

## 4. Checkpoint schema v4

Five touches in state.js (audit §6): widen the gate `c.v <= 4` (:94);
bump both `v: 3` literals (:107, :133) to 4; migrate adds
`skin: typeof c.skin === 'string' ? c.skin : 'pokemon'`;
`saveCheckpoint` writes `skin: SKIN.id`; `resumeRun` guards
`c.skin !== SKIN.id → treat as absent` (belt-and-suspenders — the
namespaced `run` key already isolates). `migrateCheckpoint` keeps the
never-throws + idempotency contract.

## 5. The global→`SKIN.*` migration (the bulk of S1)

`SKINS.pokemon` wraps today's tables **by reference** (no copies):
data.js keeps defining them, then skin.js-time assembly happens in
data.js's tail (`SKINS.pokemon.names = NAMES;` etc.) — OR the tables
move wholesale into the skin object. Prefer the REFERENCE approach in
S1 (smallest diff): consumers keep reading the same objects; only the
lookup path changes. Migrate these consumers to `SKIN.*` (audit §2
lists every file): `SKIN_EDITION`→`SKIN.edition` (render.js:4651,
4658, 4664 + the duplicated literal at render.js:4531), `NAMES`,
`GENS`, `HABITAT_PACKS`, `TYPE_CLUSTERS`, `STARTER_MON` name fields,
`REGION_INTROS`, `STAGE_FLAVOR`, `STAGE_NAMES`, `ACTS`,
`JUNKIE_ITEMS`, `DEX_REWARDS`, `CHEAT_ITEMS` labels,
`GAUNTLET_ENTRANCE_NAMES`, boss-table `.name` fields (tables
themselves stay engine — only display names are skin-read; in S1 the
whole table rides `SKIN.bossTables` by reference so S4 can swap it).
`ADVENTURE_MUSIC` is NOT forked — audio stays index-based; titles
overlay in S2.

**Engine-side, never skinned:** type keys, EFFECTIVE/RESIST, mode +
preset + path/stack/web keys, STARTER_MON `.mods/.ability`,
`starterStage`'s `'electric'` special case, BOSS_CHANNELS
`.pattern/.params`, BOSS_STYLE strings, scene keys.

## 6. Easter-egg gating (`SKIN.id === 'pokemon'` guards)

Gate: pika chirp (update.js:762), MISSINGNO. spawn + trigger + both
render branches (state.js:938, update.js:763, render.js:1015, 1182),
Magikarp flop (update.js:3015), Ditto (state.js:940, update.js:495),
Konami Mew (input.js:388), Pidgey bonus-flock preload + copy
(update.js:2598-2602 — id and string move to a skin field).
**Move, don't gate:** the Dialga phase-2 fire-rate ×0.85
(update.js:4458) becomes data (`BOSS_ABILITIES[483].p2FireMul`) read
generically. **Do NOT touch:** `eff === -1` (update.js:4807) — that
is the type-immunity sentinel, not MISSINGNO.

## 7. Sprites (S1 = alias only)

`SKIN.sprite = getSprite` for pokemon (same `(id, shiny)` contract:
synchronous drawable, tolerate `!complete`). Call sites do NOT change
in S1 (getSprite stays global); the alias exists so S5 can override.
The PokeAPI remote fallback stays inside the pokemon loader.
`?skin=` rides `location.search`, so dev launches propagate it for
free; add `skin` to `DEV.launch` opts docs (dev.js).

## 8. Tests (suite 71 → 74 assuming M3 Round C lands first)

1. **legacy-key preservation** — `storeKey('run') === 'pkbrk-run'`
   under pokemon; `'pkbrk-aetherfall-run'` under the stub; extend the
   storage-recovery KEYS list.
2. **checkpoint v3→v4** — v3 (no skin) migrates to `v:4` +
   `skin:'pokemon'`; v4 idempotent; hostile v4 shapes never throw;
   gate accepts 4, still rejects 9.
3. **per-skin isolation** — write dex under pokemon; flip `SKIN` to
   the stub; `storeKey('dex')` reads a different (empty) key; flip
   back restores. Wrapped in try/finally restoring `SKIN`.
Plus the whole existing suite bit-identical under pokemon — THE S1
acceptance gate.

## 9. Round boundaries

S1 ships nothing visible. S2 = classes/strings/lexicon, S3 = world
data, S4 = boss identity clones (M4 duel tests re-run under the
aetherfall skin), S5 = procedural art + skin-aware verify-assets,
S6 = affinity, S7 = toggle UI. Effort ranking (audit-confirmed):
find-replace breadth in render.js is S1's densest edit; storage is
the smallest.
