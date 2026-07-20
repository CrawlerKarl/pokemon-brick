#!/usr/bin/env node
'use strict';

// Builds the production-art manifest directly from the Aetherfall world data.
// It does not load the game or depend on a DOM. The generated rows are the
// stable contract between image generation and a later implementation pass.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'js', 'aetherfall.js');
const outputDir = path.join(root, 'art', 'aetherfall-production', 'manifests');
const src = fs.readFileSync(sourcePath, 'utf8');

function extractLiteral(name, open, close) {
  const marker = `const ${name} =`;
  const markerAt = src.indexOf(marker);
  if (markerAt < 0) throw new Error(`Could not find ${marker}`);
  const start = src.indexOf(open, markerAt + marker.length);
  if (start < 0) throw new Error(`Could not find opening ${open} for ${name}`);

  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  let escaped = false;

  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed literal for ${name}`);
}

function parseLiteral(name, open, close) {
  const literal = extractLiteral(name, open, close);
  return Function(`"use strict"; return (${literal});`)();
}

function slug(value) {
  return value.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value) {
  return value.toLowerCase().replace(/(^|[\s-])\w/g, match => match.toUpperCase());
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const STARTER_KEYS = [
  'fire', 'water', 'grass', 'electric', 'normal', 'flying',
  'ice', 'fighting', 'poison', 'ground', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

const CLASSES = parseLiteral('CLASSES', '{', '}');
const REALM_LINES = parseLiteral('REALM_LINES', '[', ']');
const REALM_BOSSES = parseLiteral('REALM_BOSSES', '[', ']');
const REALM_META = parseLiteral('REALM_META', '[', ']');

const detailTiers = {
  common:    { relicforge: 0.90, arcaneAlloy: 0.10, materials: '3-4', master: 1024, gameplay: 128 },
  evolved:   { relicforge: 0.80, arcaneAlloy: 0.20, materials: '4-5', master: 1024, gameplay: 128 },
  elite:     { relicforge: 0.68, arcaneAlloy: 0.32, materials: '5-7', master: 1536, gameplay: 128 },
  pilotI:    { relicforge: 0.88, arcaneAlloy: 0.12, materials: '4-5', master: 1024, gameplay: 128 },
  pilotII:   { relicforge: 0.76, arcaneAlloy: 0.24, materials: '5-6', master: 1024, gameplay: 128 },
  pilotIII:  { relicforge: 0.60, arcaneAlloy: 0.40, materials: '6-8', master: 1536, gameplay: 128 },
  sentinel:  { relicforge: 0.55, arcaneAlloy: 0.45, materials: '6-8', master: 1536, gameplay: 192 },
  legendary: { relicforge: 0.25, arcaneAlloy: 0.75, materials: '8-12', master: 2048, gameplay: 192 },
  mythic:    { relicforge: 0.20, arcaneAlloy: 0.80, materials: '9-13', master: 2048, gameplay: 192 },
};

const core = [];

function addAsset(asset) {
  const tier = detailTiers[asset.detailTier];
  const idText = String(asset.id).padStart(3, '0');
  const stem = `af-${idText}-${slug(asset.name)}`;
  core.push({
    stableKey: `aetherfall:${asset.id}`,
    id: asset.id,
    name: asset.name,
    type: asset.type,
    group: asset.group,
    realm: asset.realm || null,
    realmName: asset.realmName || null,
    family: asset.family || null,
    form: asset.form || null,
    discipline: asset.discipline || null,
    detailTier: asset.detailTier,
    relicforgeWeight: tier.relicforge,
    arcaneAlloyWeight: tier.arcaneAlloy,
    materialZoneTarget: tier.materials,
    masterSize: tier.master,
    gameplaySize: tier.gameplay,
    sourceFile: `sprites/source/${stem}-source.png`,
    finalFile: `sprites/final/${stem}.png`,
    previewFile: `sprites/previews/${stem}-preview.png`,
    promptRecipe: `${asset.group}:${asset.detailTier}`,
    status: 'planned',
  });
}

STARTER_KEYS.forEach((type, classIndex) => {
  const classData = CLASSES[type];
  classData.n.forEach((rawName, formIndex) => {
    addAsset({
      id: 10 + classIndex * 3 + formIndex,
      name: titleCase(rawName),
      type,
      group: 'pilot',
      form: formIndex + 1,
      discipline: classData.d,
      detailTier: ['pilotI', 'pilotII', 'pilotIII'][formIndex],
    });
  });
});

REALM_LINES.forEach((lines, realmIndex) => {
  const realm = realmIndex + 1;
  const base = realm * 100;
  const realmName = REALM_META[realmIndex].name;
  lines.forEach(([names, type], familyIndex) => {
    names.forEach((name, formIndex) => {
      addAsset({
        id: base + 1 + familyIndex * 3 + formIndex,
        name,
        type,
        group: 'creature',
        realm,
        realmName,
        family: familyIndex + 1,
        form: formIndex + 1,
        detailTier: ['common', 'evolved', 'elite'][formIndex],
      });
    });
  });

  const bossData = REALM_BOSSES[realmIndex];
  bossData.sents.forEach(([name, type], sentinelIndex) => {
    addAsset({
      id: base + 90 + sentinelIndex,
      name,
      type,
      group: 'sentinel',
      realm,
      realmName,
      form: sentinelIndex + 1,
      detailTier: 'sentinel',
    });
  });
  addAsset({
    id: base + 80,
    name: bossData.leg[0],
    type: bossData.leg[1],
    group: 'legendary',
    realm,
    realmName,
    detailTier: 'legendary',
  });
  addAsset({
    id: base + 81,
    name: bossData.myth[0],
    type: bossData.myth[1],
    group: 'mythic',
    realm,
    realmName,
    detailTier: 'mythic',
  });
});

const radiant = core.map(asset => ({
  ...asset,
  stableKey: `${asset.stableKey}:radiant`,
  variant: 'radiant',
  sourceFile: asset.sourceFile.replace('-source.png', '-radiant-source.png'),
  finalFile: asset.finalFile.replace('.png', '-radiant.png'),
  previewFile: asset.previewFile.replace('-preview.png', '-radiant-preview.png'),
  status: 'planned',
}));

const manifest = {
  schemaVersion: 1,
  generatedFrom: 'js/aetherfall.js',
  styleLock: 'style-lock/aetherfall-relicforge-arcane-alloy-style-lock.png',
  counts: {
    base: core.length,
    radiant: radiant.length,
    total: core.length + radiant.length,
    byGroup: core.reduce((counts, asset) => {
      counts[asset.group] = (counts[asset.group] || 0) + 1;
      return counts;
    }, {}),
  },
  detailTiers,
  assets: [...core, ...radiant],
};

const progressPath = path.join(outputDir, 'generation-progress.json');
if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  for (const asset of manifest.assets) {
    if (progress[asset.stableKey]) Object.assign(asset, progress[asset.stableKey]);
  }
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'aetherfall-core-art-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const headers = [
  'stableKey', 'id', 'name', 'variant', 'type', 'group', 'realm', 'realmName',
  'family', 'form', 'discipline', 'detailTier', 'relicforgeWeight',
  'arcaneAlloyWeight', 'materialZoneTarget', 'masterSize', 'gameplaySize',
  'sourceFile', 'finalFile', 'previewFile', 'promptRecipe', 'status',
];
const csv = [headers.join(',')];
for (const asset of manifest.assets) {
  csv.push(headers.map(header => csvCell(asset[header])).join(','));
}
fs.writeFileSync(path.join(outputDir, 'aetherfall-core-art-manifest.csv'), csv.join('\n') + '\n');

console.log(`Wrote ${core.length} base assets and ${radiant.length} radiant variants (${manifest.counts.total} rows).`);
console.log(JSON.stringify(manifest.counts.byGroup));
