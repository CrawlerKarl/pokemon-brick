'use strict';
// ============================================================
//  SKIN REGISTRY (Round S1) — a SKIN owns presentation + world data
//  (names, strings, rosters, boss identities, art); the ENGINE owns
//  mechanics (type keys, effectiveness, modes, presets, paths, the
//  upgrade web) and is shared by every skin. docs/ORIGINAL_SKIN_PLAN.md
//  is the approved design; docs/S1_SKIN_SPINE_DESIGN.md the S1 spec.
//
//  Load order matters: this file parses AFTER config.js (it needs
//  SETTINGS) and BEFORE data.js (whose tail attaches the Pokémon tables
//  to SKINS.pokemon by REFERENCE via assembleSkins — so the pokemon
//  skin stays bit-identical to the pre-skin game). Any skin missing a
//  table inherits the pokemon table until its content round lands.
//
//  Storage: per-skin state goes through storeKey(). The pokemon skin
//  keeps the LEGACY bare key names (pkbrk-run, pkbrk-dex, …) so every
//  existing save keeps working with zero migration; other skins get
//  pkbrk-<skin>-<base>. Global keys (settings/music/v) never call
//  storeKey. Switching skins reloads the page — no live swap.
// ============================================================

// resolution order: ?skin= URL param (dev/testing) → SETTINGS.skin → pokemon
const SKIN_QS = new URLSearchParams(location.search).get('skin');

const SKINS = {
  // [POKEMON-SKIN-START] — the AETHERFALL distribution build strips this
  // entry (tools/build-aetherfall-dist.js); keep the markers on their own
  // lines and keep the whole pokemon entry between them.
  pokemon: {
    id: 'pokemon',
    brand: 'WAVEBREAKER', // the big title-screen wordmark (skin identity)
    edition: 'POKÉMON EDITION',
    // setup-grid order (labels resolve at runtime via skinStarters —
    // the old config.js STARTERS literal is gone; parse order made it
    // a drift hazard, see S1 spec §2)
    starterOrder: ['fire', 'water', 'grass', 'electric', 'normal', 'flying',
      'ice', 'fighting', 'poison', 'ground', 'psychic', 'bug',
      'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'],
  },
  // [POKEMON-SKIN-END]
  // S1 stub — exists so per-skin isolation is testable. Content lands in
  // rounds S2+ (classes/world/bosses/art); until then every table
  // defaults to the pokemon set at assembly.
  aetherfall: {
    id: 'aetherfall',
    brand: 'AETHERFALL', // the world IS the brand (release identity, 2026-07-21)
    edition: 'AETHERFALL EDITION',
    starterOrder: ['fire', 'water', 'grass', 'electric', 'normal', 'flying',
      'ice', 'fighting', 'poison', 'ground', 'psychic', 'bug',
      'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'],
  },
};

// The registry is SHIP-SHAPE at any membership: a build that registers only
// one skin (the AETHERFALL distribution ships without the pokemon world)
// resolves to whatever exists — no fallback may assume pokemon is present.
function defaultSkinId() { return SKINS.pokemon ? 'pokemon' : Object.keys(SKINS)[0]; }
function activeSkinId() {
  const id = SKIN_QS || SETTINGS.skin || defaultSkinId();
  return SKINS[id] ? id : defaultSkinId();
}
let SKIN = SKINS[activeSkinId()];
// settings validation lives HERE, not config.js — config parses before
// SKINS exists. (The ?skin= override is transient and never saved.)
if (!SKINS[SETTINGS.skin]) SETTINGS.skin = defaultSkinId();

// per-skin storage keys — see the header comment for the legacy rule
function storeKey(base) {
  return SKIN.id === 'pokemon' ? 'pkbrk-' + base : 'pkbrk-' + SKIN.id + '-' + base;
}

// The 18 starter keys are ENGINE vocabulary (they are the type keys —
// storage-stable, shared by every skin). Only labels/order are skin.
const STARTER_KEYS = ['fire', 'water', 'grass', 'electric', 'normal', 'flying',
  'ice', 'fighting', 'poison', 'ground', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
if (SETTINGS.starter !== 'none' && !STARTER_KEYS.includes(SETTINGS.starter)) SETTINGS.starter = 'none';
if (SETTINGS.affinity !== 'light' && SETTINGS.affinity !== 'dark') SETTINGS.affinity = null;

// Runtime replacement for the old STARTERS literal: the setup grid's
// [{key,label}] list, derived from the active skin's roster tables.
// Cached — skin tables never change after assembly.
let _skinStarterCache = null;
function skinStarters() {
  if (!_skinStarterCache) {
    _skinStarterCache = SKIN.starterOrder.map(k => ({ key: k, label: SKIN.starterMon[k].names[0] }));
  }
  return _skinStarterCache;
}

// the title-screen skin toggle: render (drawMenuRedesign) writes the pill's
// live rect each frame; input hit-tests it. Flipping saves + reloads clean
// (the reload drops any ?skin= override so the SAVED choice rules).
let skinPillRect = null;
// a single-skin build has nothing to toggle — render skips the pill and
// input never sees a rect
function skinToggleAvailable() { return Object.keys(SKINS).length > 1; }
function toggleSkin() {
  if (!skinToggleAvailable()) return;
  const ids = Object.keys(SKINS);
  const next = ids[(ids.indexOf(SKIN.id) + 1) % ids.length];
  SETTINGS.skin = next;
  saveSettings();
  location.href = location.pathname;
}

// Evolution language is a skin voice: pokemon partners EVOLVE; aetherfall
// disciplines awaken/upgrade/synthesize (per-class discipline verb).
function skinEvolveVerb(starterKey) {
  const c = SKIN.classes && SKIN.classes[starterKey];
  if (c && SKIN.disciplines && SKIN.disciplines[c.d]) return SKIN.disciplines[c.d].verb;
  return 'EVOLVED INTO';
}

// data.js tail calls this once, after every table literal is defined:
// attach the pokemon tables by reference, then default-fill every other
// skin so a stub skin is always complete (isolation without content).
function assembleSkins(tables) {
  // pokemon-absent builds (the AETHERFALL dist) call this with engine-neutral
  // defaults only — every clause must tolerate a missing pokemon entry
  if (SKINS.pokemon) Object.assign(SKINS.pokemon, tables);
  for (const s of Object.values(SKINS)) {
    if (s === SKINS.pokemon) continue;
    for (const k of Object.keys(tables)) if (!(k in s)) s[k] = tables[k];
  }
  // per-skin derived sets refresh from each skin's OWN gens (a skin with
  // its own world must never inherit another skin's boss-only id space).
  // A skin whose world tables load LATER (aetherfall refreshes its own set
  // at load) may not have gens yet when defaults are engine-only.
  for (const s of Object.values(SKINS)) {
    if (!s.gens) continue;
    s.bossOnlyIds = new Set(s.gens.flatMap(g => [
      g.boss.id,
      ...(g.gauntlet ? g.gauntlet.subs.map(([id]) => id) : []),
      ...(g.gauntlet ? [g.gauntlet.myth[0]] : []),
    ]));
  }
}
