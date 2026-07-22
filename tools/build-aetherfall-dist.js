#!/usr/bin/env node
'use strict';

// ============================================================
//  AETHERFALL DISTRIBUTION BUILDER
//  Assembles the pokemon-free public game into dist-aetherfall/:
//    - js/ minus the pokemon world: pokeworld.js becomes a tiny stub that
//      seeds only engine-neutral skin defaults; skin.js loses the pokemon
//      registry entry ([POKEMON-SKIN-START/END] markers)
//    - zero pokemon assets (assets/fonts ships, assets/sprites does not)
//    - art/aetherfall-production/sprites/final (base + radiant PNGs)
//    - art/aetherfall-production/sprites/preview (high-res setup portraits)
//    - art/aetherfall-production/weapons/final (relics + ship fittings)
//    - pokemon-termed COMMENT lines dropped; pokemon-flavored DATA strings
//      in audio.js/config.js mapped to AETHERFALL equivalents
//  Internal identifiers and storage keys (br.poke, pkbrk-*, mewVmax flag)
//  are engine vocabulary and ship unchanged — they are not user-visible
//  and renaming them would fork the runtime from the main repo.
//
//  Run:  npm run build-dist   (or node tools/build-aetherfall-dist.js)
//  The output directory is a complete static site — point any static host
//  (GitHub Pages) at it.
// ============================================================

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist-aetherfall');

// pokemon-term detector for the comment scrub + the final report
const TERM = /\bpok[eé]|pikachu|raichu|mewtwo|\bmew\b|kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea|nintendo|game\s?freak|charizard|charmander|togepi|porygon|dratini|machop|gastly|magnemite|lumiose/i;
// residue report: only STRONG franchise terms (identifiers like br.poke and
// the 'pokeball' glyph key are engine vocabulary and ship intentionally)
const STRONG = /pok[eé]mon|poké|pikachu|raichu|mewtwo|\bmew\b|kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea|nintendo|lumiose|charizard|charmander|togepi|dratini|machop|gastly|magnemite/i;

// the nine music-table region labels → the nine AETHERFALL realm tags
const AUDIO_SWAPS = [
  ["region: 'KANTO'", "region: 'MARCHES'"],
  ["region: 'JOHTO'", "region: 'REACHES'"],
  ["region: 'HOENN'", "region: 'DROWNED COAST'"],
  ["region: 'SINNOH'", "region: 'FORGEHEART'"],
  ["region: 'UNOVA'", "region: 'NEON DOMINION'"],
  ["region: 'KALOS'", "region: 'GLASS COURTS'"],
  ["region: 'ALOLA'", "region: 'LEY ATOLLS'"],
  ["region: 'GALAR'", "region: 'WAR CRADLE'"],
  ["region: 'PALDEA'", "region: 'SUNDERED CRADLE'"],
  ["'LUMIOSE PROMENADE'", "'CITYGLASS PROMENADE'"],
];

// config.js parses before any skin exists, so its MODES literal carries the
// pokemon-flavored defaults (aetherfall patches them at load). The dist has
// no pokemon skin to describe — ship the neutral/aetherfall wording.
const CONFIG_SWAPS = [
  ["desc: 'POKÉMON FLIGHT SHOOTER'", "desc: 'AETHERKIN FLIGHT SHOOTER'"],
  ["'PILOT A POKÉMON · DODGE ENEMY FIRE'", "'PILOT A VESSEL · DODGE ENEMY FIRE'"],
  ["'Keep the rally alive, crack Pokémon walls,'", "'Keep the rally alive, crack aether walls,'"],
  ["skin: 'pokemon'", "skin: 'aetherfall'"],
];

// engine literals whose RUNTIME values are already skin-patched for
// aetherfall — the dist ships the aetherfall wording as the base so no
// franchise string exists in the files at all
const DATA_SWAPS = [
  ['name: "TRAINER\'S BOND"', 'name: "KEEPER\'S PACT"'],
  ["visual: 'A POKÉ BALL BOND CREST LOCKS TO THE REAR RIG'", "visual: 'A BINDING SIGIL CREST LOCKS TO THE REAR RIG'"],
  ["name: 'POKÉ REVIVE'", "name: 'AETHER REVIVE'"],
];
const INPUT_SWAPS = [
  ["(SKIN.secret.riftName || 'KANTO RIFT')", "(SKIN.secret.riftName || 'RIFT')"],
];
const UPDATE_SWAPS = [
  ["SKIN.secret.missWarn || 'MISS ANY PIECE AND KANTO KEEPS ITS NORMAL MEW FINALE'", "SKIN.secret.missWarn || 'MISS ANY PIECE AND THE NORMAL FINALE REMAINS'"],
];
const RENDER_SWAPS = [
  ["(SKIN.secret.homeRegion || 'KANTO')", "(SKIN.secret.homeRegion || 'HOME')"],
  ["|| 'POKÉMON')", "|| 'UNKNOWN')"],
  ["SKIN.secret.conquered || 'KANTO RIFT · CONQUERED'", "SKIN.secret.conquered || 'RIFT · CONQUERED'"],
];

// ---- the stub's KIT TABLES ----
// aetherfall.js builds its boss kits as same-slot clones of the legacy
// world's MECHANICS tables (Object.assign({}, KIT[srcId], {name: ...})).
// The dist has no pokeworld, so we EVALUATE the real modules in a vm and
// serialize exactly the tables aetherfall consumes — with every franchise
// `name` field stripped (aetherfall overrides them all).
function harvestKitTables() {
  const vm = require('vm');
  const noopCtx2d = new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
  const el = () => ({ getContext: () => noopCtx2d, style: {}, width: 0, height: 0,
    getBoundingClientRect: () => ({ width: 0, height: 0 }), addEventListener() {} });
  const ctx = {
    console, URLSearchParams, Set, Map,
    window: {}, location: { search: '', pathname: '/', href: '' },
    navigator: { vibrate: null },
    document: { createElement: el, getElementById: el, fonts: { load() {} }, addEventListener() {}, title: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Image: class { constructor() { this.onload = null; } set src(v) {} get src() { return ''; } },
    matchMedia: () => ({ matches: false }),
    addEventListener() {}, performance: { now: () => 0 },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const src = ['setup.js', 'config.js', 'skin.js', 'data.js', 'pokeworld.js']
    .map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n;\n');
  const tail = `;({ BOSS_ABILITIES, BOSS_CHANNELS, BOSS_STYLE, BOSS_PROJECTILE_KIND,
    MYTHIC_ABILITIES, MYTHIC_ENTRANCE_STYLES, MYTHIC_BATTLE_STYLES,
    LEGENDARY_ENTRANCE_STYLES, MOTION_BY_ID,
    STAGE_OBJECTIVE_SETS: { '0:0': STAGE_OBJECTIVE_SETS['0:0'], '0:1': STAGE_OBJECTIVE_SETS['0:1'], '0:2': STAGE_OBJECTIVE_SETS['0:2'] } })`;
  const t = vm.runInContext(src + tail, ctx, { filename: 'harvest.js' });
  // strip the franchise name fields aetherfall always overrides
  const stripNames = o => { for (const v of Object.values(o)) if (v && typeof v === 'object' && 'name' in v) delete v.name; return o; };
  stripNames(t.BOSS_ABILITIES); stripNames(t.BOSS_CHANNELS); stripNames(t.MYTHIC_ABILITIES);
  // aetherfall overrides every name/desc in the '0:0' and '0:2' objective
  // sets (its own authored copy) — ship those fields blank; '0:1' is neutral
  for (const k of ['0:0', '0:2']) for (const o of t.STAGE_OBJECTIVE_SETS[k]) { o.name = ''; o.desc = ''; }
  return t;
}

// JS serializer that keeps check-functions as source (they are closure-free)
function ser(v) {
  if (typeof v === 'function') return v.toString();
  if (Array.isArray(v)) return '[' + v.map(ser).join(', ') + ']';
  if (v && typeof v === 'object') {
    return '{ ' + Object.entries(v).map(([k, x]) =>
      (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + ser(x)).join(', ') + ' }';
  }
  return JSON.stringify(v);
}

function buildStub() {
  const t = harvestKitTables();
  const lines = Object.entries(t).map(([k, v]) => 'const ' + k + ' = ' + ser(v) + ';');
  return `'use strict';
// ============================================================
//  AETHERFALL DISTRIBUTION — generated stub (build-aetherfall-dist.js).
//  The legacy WAVEBREAKER world does not ship. This file provides:
//   1. the engine-neutral skin defaults the registry expects, and
//   2. the slot-keyed MECHANICS tables aetherfall.js clones its boss
//      kits from (numbers, patterns, params — name fields stripped;
//      aetherfall supplies every name itself).
// ============================================================
` + lines.join('\n') + `
assembleSkins({
  typeClusters: TYPE_CLUSTERS,
  stageNames: STAGE_NAMES,
  sprite: getSprite,
  sentinelEntranceStyles: SENTINEL_ENTRANCE_STYLES,
});
`;
}


function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function copy(src, dst) { mkdirp(path.dirname(dst)); fs.copyFileSync(src, dst); }

// drop full-line comments (// or block-comment continuation lines) that carry
// pokemon terms; leave code lines and inline trailing comments untouched so
// nothing structural can break. node --check validates every result below.
function scrubComments(src) {
  return src.split('\n').filter(line => {
    const t = line.trim();
    const isComment = t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
    return !(isComment && TERM.test(t));
  }).join('\n');
}

// after the full-line pass: strip TRAILING // comments that carry terms.
// Only cuts when the '//' follows whitespace (protects http://) and no
// quote or backtick appears from the cut onward (protects string content).
function scrubTrailing(src) {
  return src.split('\n').map(line => {
    const i = line.lastIndexOf('//');
    if (i <= 0) return line;
    const tail = line.slice(i);
    if (!TERM.test(tail)) return line;
    if (!/\s/.test(line[i - 1])) return line;
    if (/["'`]/.test(tail)) return line;
    return line.slice(0, i).replace(/\s+$/, '');
  }).join('\n');
}

function applySwaps(src, swaps, label) {
  for (const [from, to] of swaps) {
    if (!src.includes(from)) throw new Error(label + ': expected literal not found: ' + from);
    src = src.split(from).join(to);
  }
  return src;
}

function stripMarkedBlock(src, startMark, endMark, label) {
  const a = src.indexOf(startMark), b = src.indexOf(endMark);
  if (a < 0 || b < 0 || b < a) throw new Error(label + ': markers missing');
  const lineStart = src.lastIndexOf('\n', a) + 1;
  const lineEnd = src.indexOf('\n', b) + 1;
  return src.slice(0, lineStart) + src.slice(lineEnd);
}

// ---- build ----
// dist-aetherfall/ doubles as the checkout of the public aetherfall repo:
// clear everything EXCEPT .git so a rebuild is a clean commit, not a re-init
if (fs.existsSync(out)) {
  for (const e of fs.readdirSync(out)) if (e !== '.git') rmrf(path.join(out, e));
} else mkdirp(out);

// 1) js/ — every module, transformed
const jsDir = path.join(root, 'js');
for (const f of fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
  let src = fs.readFileSync(path.join(jsDir, f), 'utf8');
  if (f === 'pokeworld.js') { src = buildStub(); }
  else {
    if (f === 'skin.js') src = stripMarkedBlock(src, '// [POKEMON-SKIN-START]', '// [POKEMON-SKIN-END]', 'skin.js');
    if (f === 'audio.js') src = applySwaps(src, AUDIO_SWAPS, 'audio.js');
    if (f === 'config.js') src = applySwaps(src, CONFIG_SWAPS, 'config.js');
    if (f === 'data.js') src = applySwaps(src, DATA_SWAPS, 'data.js');
    if (f === 'input.js') src = applySwaps(stripMarkedBlock(src, '// [POKEMON-EGG-START]', '// [POKEMON-EGG-END]', 'input.js egg'), INPUT_SWAPS, 'input.js');
    if (f === 'update.js') src = applySwaps(src, UPDATE_SWAPS, 'update.js');
    if (f === 'render.js') src = applySwaps(src, RENDER_SWAPS, 'render.js');
    src = scrubTrailing(scrubComments(src));
  }
  mkdirp(path.join(out, 'js'));
  fs.writeFileSync(path.join(out, 'js', f), src);
}

// 2) index.html — retitle; script list is unchanged (the stub keeps the name)
{
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>AETHERFALL</title>');
  fs.writeFileSync(path.join(out, 'index.html'), html);
}

// 3) fonts only — the pokemon sprite PNGs never ship
copy(path.join(root, 'assets', 'fonts', 'orbitron.woff2'),
  path.join(out, 'assets', 'fonts', 'orbitron.woff2'));

// 4) the production art (base + radiant vessels, relics, and fittings)
const finalDir = path.join(root, 'art', 'aetherfall-production', 'sprites', 'final');
let artN = 0;
for (const f of fs.readdirSync(finalDir).filter(f => f.endsWith('.png'))) {
  copy(path.join(finalDir, f), path.join(out, 'art', 'aetherfall-production', 'sprites', 'final', f));
  artN++;
}
// high-res vessel previews (optional — the finals cover any gap)
const previewDir = path.join(root, 'art', 'aetherfall-production', 'sprites', 'preview');
let previewN = 0;
try {
  for (const f of fs.readdirSync(previewDir).filter(f => f.endsWith('.png'))) {
    copy(path.join(previewDir, f), path.join(out, 'art', 'aetherfall-production', 'sprites', 'preview', f));
    previewN++;
  }
} catch (e) { /* no preview pass in this checkout */ }
const weaponDir = path.join(root, 'art', 'aetherfall-production', 'weapons', 'final');
let weaponN = 0;
for (const f of fs.readdirSync(weaponDir).filter(f => f.endsWith('.png'))) {
  copy(path.join(weaponDir, f), path.join(out, 'art', 'aetherfall-production', 'weapons', 'final', f));
  weaponN++;
}

// 5) server + repo scaffolding
copy(path.join(root, 'serve.js'), path.join(out, 'serve.js'));
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({
  name: 'aetherfall', version: '1.0.0', private: true,
  description: 'AETHERFALL — a magitech arcade campaign: brick-breaker, wall shooter, and flight shooter across nine realms.',
  scripts: { serve: 'node serve.js' },
}, null, 2) + '\n');
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, '.gitignore'), 'node_modules/\n');
fs.writeFileSync(path.join(out, 'README.md'), `# AETHERFALL

Long ago one power split into MAGIC and TECH. Cross nine realms — the old
magic world, the tech ascendancy, and the convergence — to heal the
Sundering. Choose one of 18 classes across three disciplines
(MAGIC / TECH / MAGITECH), swear yourself to the LIGHT or the DARK, and
fight through a 27-stage campaign in three arcade games that share one
engine:

- **STARFIGHTER** — the flagship flight shooter: your vessel IS the pilot.
- **BREAKER** — a calm, pure brick-breaker. The ball is the only weapon.
- **BLASTER** — ball-less wall clearing with a piercing charge shot.

Every creature, vessel, sentinel, sovereign, weapon relic, missile, and ship
fitting ships hand-finished art in the same Relicforge style, with true
prismatic RADIANT vessel forms. 100% vanilla JS + Canvas — no build step, no
dependencies, no network calls.

## Running locally

\`\`\`
node serve.js       # → http://localhost:8741
\`\`\`

Any static file server works. The game saves locally in your browser.
`);

// ---- verify ----
const { execFileSync } = require('child_process');
let checked = 0;
for (const f of fs.readdirSync(path.join(out, 'js')).filter(f => f.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(out, 'js', f)]);
  checked++;
}
// residue report: pokemon terms surviving in shipped text (identifiers and
// storage keys are expected; anything else should be reviewed)
const residue = [];
for (const f of fs.readdirSync(path.join(out, 'js')).filter(f => f.endsWith('.js'))) {
  const lines = fs.readFileSync(path.join(out, 'js', f), 'utf8').split('\n');
  const OK = /SKIN\.id === 'pokemon'|SKINS\.pokemon|isBossOnlyPokemon|c\.skin : 'pokemon'|"kantolegend"/;
  lines.forEach((l, i) => { if (STRONG.test(l) && !OK.test(l)) residue.push(f + ':' + (i + 1) + ': ' + l.trim().slice(0, 90)); });
}
console.log('build-aetherfall-dist: ' + checked + ' js modules (all node --check clean), '
  + artN + ' vessel PNGs, ' + previewN + ' preview PNGs, ' + weaponN
  + ' weapon/fitting PNGs, fonts, index.html, serve.js → dist-aetherfall/');
console.log(residue.length
  ? 'RESIDUE (' + residue.length + ' lines carry pokemon terms — review):\n  ' + residue.join('\n  ')
  : 'RESIDUE: none — no pokemon terms in any shipped js.');
