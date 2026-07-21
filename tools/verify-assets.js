#!/usr/bin/env node
'use strict';
// verify-assets.js — static roster/sprite consistency check (no deps, no DOM).
//
// Reads js/pokeworld.js (the pokemon world tables) as TEXT and cross-checks:
//   (a) every Pokémon id in the GENS rosters + boss entries has a NAMES entry
//   (b) every such id has a sprite file at assets/sprites/<id>.png
//   (c) informational: sprite files on disk referenced by no roster
// Exits 1 if (a) or (b) fail, 0 otherwise.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'js', 'pokeworld.js');
const spritesDir = path.join(root, 'assets', 'sprites');

const src = fs.readFileSync(dataPath, 'utf8');

// ---- carve out the GENS section: 'const GENS' … its closing '];' ----
function section(text, startMarker, endMarker) {
  const s = text.indexOf(startMarker);
  if (s < 0) return null;
  const e = text.indexOf(endMarker, s);
  if (e < 0) return null;
  return text.slice(s, e + endMarker.length);
}
const gensSrc = section(src, 'const GENS', '\n];');
if (!gensSrc) { console.error('FAIL: could not locate the GENS section in js/pokeworld.js'); process.exit(1); }
const namesSrc = section(src, 'const NAMES', '};');
if (!namesSrc) { console.error('FAIL: could not locate the NAMES section in js/pokeworld.js'); process.exit(1); }

// ---- roster ids: tier entries look like [19,'normal']; bosses like boss: { id: 150, ----
const rosterIds = new Set();
for (const m of gensSrc.matchAll(/\[\s*(\d+)\s*,\s*'[a-z]+'\s*\]/g)) rosterIds.add(+m[1]);
const bossIds = new Set();
for (const m of gensSrc.matchAll(/boss:\s*\{\s*id:\s*(\d+)/g)) bossIds.add(+m[1]);
const allIds = new Set([...rosterIds, ...bossIds]);

// ---- NAMES keys: entries look like 19:'Rattata' inside the object literal ----
const nameIds = new Set();
for (const m of namesSrc.matchAll(/(\d+)\s*:\s*'/g)) nameIds.add(+m[1]);

if (allIds.size === 0) { console.error('FAIL: extracted zero roster ids from GENS — regex or file shape changed'); process.exit(1); }
if (nameIds.size === 0) { console.error('FAIL: extracted zero NAMES keys — regex or file shape changed'); process.exit(1); }

// ---- sprite files on disk ----
let spriteFiles = [];
try {
  spriteFiles = fs.readdirSync(spritesDir).filter(f => /^\d+\.png$/.test(f));
} catch (e) {
  console.error('FAIL: cannot read sprites dir ' + spritesDir + ': ' + e.message);
  process.exit(1);
}
const spriteIds = new Set(spriteFiles.map(f => +f.replace('.png', '')));

// ---- checks ----
const sortNum = (a, b) => a - b;
const missingNames = [...allIds].filter(id => !nameIds.has(id)).sort(sortNum);
const missingSprites = [...allIds].filter(id => !spriteIds.has(id)).sort(sortNum);
const unreferenced = [...spriteIds].filter(id => !allIds.has(id)).sort(sortNum);

let failed = false;
if (missingNames.length) {
  failed = true;
  console.error('FAIL (a): roster/boss ids with no NAMES entry (' + missingNames.length + '):');
  console.error('  ' + missingNames.join(', '));
}
if (missingSprites.length) {
  failed = true;
  console.error('FAIL (b): roster/boss ids with no assets/sprites/<id>.png (' + missingSprites.length + '):');
  console.error('  ' + missingSprites.join(', '));
}
if (unreferenced.length) {
  console.log('info (c): ' + unreferenced.length + ' sprite file(s) on disk referenced by no roster (easter eggs, starters, etc.):');
  console.log('  ' + unreferenced.join(', '));
}

console.log('checked ' + allIds.size + ' roster/boss ids (' + rosterIds.size + ' roster + ' +
  bossIds.size + ' boss) against ' + nameIds.size + ' NAMES entries and ' + spriteIds.size + ' sprite files.');
if (failed) {
  console.error('verify-assets: FAILED');
  process.exit(1);
}
console.log('verify-assets: OK — every roster/boss id is named and has a local sprite.');
process.exit(0);
