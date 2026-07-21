'use strict';
// ============================================================
//  AETHERFALL — the original sci-fi × fantasy skin.
//  Design: docs/ORIGINAL_SKIN_PLAN.md (approved). Loads AFTER data.js
//  (engine) + pokeworld.js (pokemon world): the tables exist and
//  assembleSkins() (pokeworld.js tail) has already default-filled
//  SKINS.aetherfall with pokemon aliases — this file REPLACES the content
//  tables with the original universe and refreshes the derived sets.
//  The pokemon skin is never touched.
//
//  THE WORLD: long ago one power split into MAGIC and TECH. The player
//  crosses nine realms — the old magic world (act I), the tech ascendancy
//  (act II), and the convergence (act III) — to heal the Sundering.
//
//  ID SPACE (aetherfall-private; ids only ever meet storage inside
//  pkbrk-aetherfall-* keys):
//    10–63    pilot vessels (18 classes × 3 forms, STARTER_KEYS order)
//    r*100+n  realm r units — lines of 3 forms: n=1..18
//    r*100+80 realm legendary · +81 realm mythic · +90..92 sentinels
//  Every unit is drawn by the procedural parts renderer (aetherart.js);
//  no network assets exist in this skin.
// ============================================================
(() => {
  const AF = SKINS.aetherfall;

  // ---------- S2 · THE 18 CLASSES (three disciplines of six) ----------
  // Engine abilities/mods are shared verbatim with the pokemon skin
  // (STARTER_KIT, data.js, is the single source of truth for numbers);
  // only names, blurbs and flavor change. Discipline drives evolution
  // language + the upgrade-web lexicon.
  const CLASSES = {
    //            forms (I → II → III)                                    ability            discipline
    fire:     { n: ['PYROMANCER', 'INFERNOMANCER', 'SUNCALLER'],       ab: 'KINDLE',            d: 'magic',
      blurb: 'FLAME ATTACKS · MORE DAMAGE' },
    ice:      { n: ['FROSTWEAVER', 'GLACIMANCER', 'WINTERSAGE'],       ab: 'STILLFROST',        d: 'magic',
      blurb: 'KOS FREEZE TIME ITSELF' },
    grass:    { n: ['DRUID', 'GROVEKEEPER', 'WILDSPEAKER'],            ab: 'HARVEST',           d: 'magic',
      blurb: 'MORE DROPS · EASIER PICKUPS' },
    ghost:    { n: ['NECROMANCER', 'GRAVECALLER', 'DEATHSINGER'],      ab: 'SHROUD',            d: 'magic',
      blurb: 'CHANCE TO SLIP THROUGH DAMAGE' },
    dark:     { n: ['SHADOWMANCER', 'NIGHTBLADE', 'VOIDDANCER'],       ab: 'BLOODLUST',         d: 'magic',
      blurb: 'COMBOS AMPLIFY DAMAGE/SCORE' },
    fairy:    { n: ['FEYWARDEN', 'FEYKNIGHT', 'COURTSOVEREIGN'],       ab: 'BLESSING',          d: 'magic',
      blurb: 'MORE MENDING · EASIER BINDINGS' },
    steel:    { n: ['ENGINEER', 'ARMORWRIGHT', 'BASTIONSMITH'],        ab: 'DEFLECTOR ARRAY',   d: 'tech',
      blurb: 'LAUNCH WITH SHIELDS RAISED' },
    bug:      { n: ['SWARM OPERATOR', 'DRONEMASTER', 'HIVEMARSHAL'],   ab: 'DRONE UPLINK',      d: 'tech',
      blurb: 'KOS LAUNCH EXTRA STRIKES' },
    poison:   { n: ['CHEMIST', 'VENOMSMITH', 'TOXIN BARON'],           ab: 'CATALYST',          d: 'tech',
      blurb: 'REPEATED HITS MELT ARMOR' },
    flying:   { n: ['AERONAUT', 'JETCORSAIR', 'SKYMARSHAL'],           ab: 'JETWING',           d: 'tech',
      blurb: 'WIDER RIG · FASTER MOVEMENT' },
    rock:     { n: ['SIEGEWRIGHT', 'BULWARKWRIGHT', 'CITADEL PRIME'],  ab: 'PLATING',           d: 'tech',
      blurb: 'EXTRA MAXIMUM HP' },
    fighting: { n: ['VANGUARD', 'SHOCKTROOPER', 'WARMASTER'],          ab: 'BERSERK PROTOCOL',  d: 'tech',
      blurb: 'MISSING HP BOOSTS DAMAGE' },
    electric: { n: ['STORMBINDER', 'TEMPESTBINDER', 'THUNDERSOVEREIGN'], ab: 'OVERDRIVE',       d: 'magitech',
      blurb: 'OVERPOWERED DAMAGE · CHAIN LIGHTNING' },
    psychic:  { n: ['PSION', 'FARSEER', 'OMNIMIND'],                   ab: 'PRECOG TARGETING',  d: 'magitech',
      blurb: 'GUARANTEED PRECISION CRITS' },
    dragon:   { n: ['WYRMRIDER', 'DRAKEKNIGHT', 'WYRMMARSHAL'],        ab: 'REACTOR HEART',     d: 'magitech',
      blurb: 'START CHARGED · LONGER SURGE' },
    ground:   { n: ['TERRASHAPER', 'QUAKEBINDER', 'WORLDCARVER'],      ab: 'SEISMIC RIG',       d: 'magitech',
      blurb: 'CRUSH ARMOR · TRIGGER QUAKES' },
    water:    { n: ['FLUXWEAVER', 'TIDEBINDER', 'DEEPCALLER'],         ab: 'COOLANT LOOP',      d: 'magitech',
      blurb: 'COOLER SHOTS · RETURN SHIELDS' },
    normal:   { n: ['DRIFTER', 'WAYFINDER', 'PARAGON'],                ab: 'OMNIFRAME',         d: 'magitech',
      blurb: 'MORE DAMAGE · MORE SCORE' },
  };
  const DISCIPLINES = {
    magic:    { name: 'MAGIC',    tag: 'THE OLD WAYS',    verb: 'AWAKENS AS',      color: '#c879ff' },
    tech:     { name: 'TECH',     tag: 'THE ASCENDANCY',  verb: 'UPGRADES TO',     color: '#4de0f2' },
    magitech: { name: 'MAGITECH', tag: 'THE CONVERGENCE', verb: 'SYNTHESIZES INTO', color: '#ffd166' },
  };
  // upgrade-web lexicon: the six path names in each discipline's voice.
  // Node keys/effects/topology never change — this is language only.
  const TREE_LEXICON = {
    arsenal: { magic: 'ARCANE BARRAGE', tech: 'AUTOCANNON ARRAY', magitech: 'RUNIC GATLING' },
    impact:  { magic: 'CATACLYSM',      tech: 'SIEGE ORDNANCE',   magitech: 'RUNEBREAKER' },
    prism:   { magic: 'ELEMENTAL LORE', tech: 'SPECTRUM LAB',     magitech: 'PRISM MATRIX' },
    aegis:   { magic: 'WARDING CIRCLE', tech: 'BULWARK SYSTEMS',  magitech: 'AEGIS LATTICE' },
    surge:   { magic: 'MANA TIDE',      tech: 'OVERCLOCK',        magitech: 'FLUX SURGE' },
    bond:    { magic: 'SOULBOND',       tech: 'SUPPORT UPLINK',   magitech: 'SYMBIOSIS' },
  };

  // pilot-vessel ids: class i (STARTER_KEYS order) → [10+3i, 11+3i, 12+3i]
  const pilotIds = {};
  STARTER_KEYS.forEach((k, i) => { pilotIds[k] = [10 + i * 3, 11 + i * 3, 12 + i * 3]; });

  // starterMon: engine numbers by reference (STARTER_KIT), display fields
  // replaced. modeTiers text carries over verbatim (pure numbers, no lore).
  const starterMon = {};
  for (const k of STARTER_KEYS) {
    const kit = STARTER_KIT[k], c = CLASSES[k];
    const modeCopy = {};
    for (const [mode, tiers] of Object.entries(kit.modeTiers)) {
      modeCopy[mode] = { ability: c.ab, blurb: c.blurb, tiers };
    }
    starterMon[k] = {
      ids: pilotIds[k], names: c.n, ability: c.ab, blurb: c.blurb,
      tiers: kit.tiers, mods: kit.mods, modeCopy,
      discipline: c.d,
    };
  }

  // ---------- S3 · THE NINE REALMS ----------
  // Scene keys and music are engine (shared compositions, index-selected);
  // the skin owns identity: names, palettes, rosters, bosses, ecology.
  // U(line): three forms of one unit line — [baseId, type] triplets land in
  // tiers 1/2/3 exactly like evolution families do on the pokemon skin.
  const NAMES = {};
  const nm = (id, name) => { NAMES[id] = name; return id; };

  // -- pilot vessel names (the class forms ARE the vessels)
  for (const k of STARTER_KEYS) CLASSES[k].n.forEach((n, f) => nm(pilotIds[k][f], titleCase(n)));

  function titleCase(s) {
    return s.toLowerCase().replace(/(^|[\s-])\w/g, m => m.toUpperCase());
  }

  // -- realm unit lines: [names ×3, type]; ids derive from realm base + slot
  const REALM_LINES = [
    [ // R1 · THE GREENSPELL MARCHES — pastoral magic frontier
      [['Thistling', 'Briarkin', 'Thornwarden'], 'grass'],
      [['Pipkin', 'Glimmerkin', 'Courtglimmer'], 'fairy'],
      [['Flittern', 'Galefinch', 'Stormplume'], 'flying'],
      [['Meadowkit', 'Prancelet', 'Soverelk'], 'normal'],
      [['Mothling', 'Duskwing', 'Spellmoth'], 'bug'],
      [['Rillet', 'Brooksprite', 'Riverlord'], 'water'],
    ],
    [ // R2 · THE BELLTOWER REACHES — monastery skies, wind rites
      [['Zephyrkin', 'Galemonk', 'Windabbot'], 'flying'],
      [['Fistling', 'Ironpalm', 'Skyfist Sage'], 'fighting'],
      [['Chimeling', 'Bellsage', 'Resonarch'], 'psychic'],
      [['Vesperling', 'Tollgeist', 'Knellwraith'], 'ghost'],
      [['Sprigling', 'Teawarden', 'Groveabbot'], 'grass'],
      [['Bellkit', 'Chantling', 'Hymnkeeper'], 'normal'],
    ],
    [ // R3 · THE DROWNED EXPANSE — old-world ruins under the sea (Act I finale)
      [['Saltling', 'Brinekin', 'Tidemarshal'], 'water'],
      [['Floeling', 'Glacikin', 'Bergsovereign'], 'ice'],
      [['Dredgling', 'Gloomeel', 'Abysswarden'], 'dark'],
      [['Driftgeist', 'Wreckwraith', 'Drowned King'], 'ghost'],
      [['Finwyrm', 'Seawyrm', 'Maelstrom Wyrm'], 'dragon'],
      [['Kelpling', 'Wrackweed', 'Sargasso Shade'], 'grass'],
    ],
    [ // R4 · THE FOUNDRY PEAKS — the first machine city, carved into stone
      [['Cogling', 'Gearwright', 'Foundry Warden'], 'steel'],
      [['Slagling', 'Cindergolem', 'Basalt Engine'], 'rock'],
      [['Forgeling', 'Cruciburn', 'Smeltlord'], 'fire'],
      [['Drillkin', 'Boreback', 'Quarry Titan'], 'ground'],
      [['Sparkrivet', 'Voltwrench', 'Dynamo Sage'], 'electric'],
      [['Fumeling', 'Sootbelch', 'Smogreeve'], 'poison'],
    ],
    [ // R5 · THE CHROME SPRAWL — neon grid metropolis
      [['Ampling', 'Surgehound', 'Gridalpha'], 'electric'],
      [['Chromekit', 'Platedrone', 'Skyrise Sentry'], 'steel'],
      [['Shadelurk', 'Neonprowler', 'Noir Baron'], 'dark'],
      [['Adsprite', 'Mindcaster', 'Broadcast Seer'], 'psychic'],
      [['Sludgeling', 'Ventcrawler', 'Toxin Mogul'], 'poison'],
      [['Straykit', 'Alleyrunner', 'Metro Kingpin'], 'normal'],
    ],
    [ // R6 · THE SPIRE OF GLASS — corporate archology gone necrotech (Act II finale)
      [['Glassgeist', 'Panewraith', 'Atrium Phantom'], 'ghost'],
      [['Umbreling', 'Nightglass', 'Eclipse Magnate'], 'dark'],
      [['Seepling', 'Chemwraith', 'Miasma Don'], 'poison'],
      [['Prismkin', 'Chandelia', 'Aurora Regent'], 'fairy'],
      [['Oracling', 'Glassmind', 'Spire Sage'], 'psychic'],
      [['Shardling', 'Latticeknight', 'Facade Warden'], 'steel'],
    ],
    [ // R7 · THE RIFT ATOLLS — isles where ley lines pierce tech ruins
      [['Leyling', 'Riftseer', 'Atoll Oracle'], 'psychic'],
      [['Lagoonkit', 'Reefdancer', 'Tsunami Caller'], 'water'],
      [['Palmling', 'Frondweaver', 'Canopy Warden'], 'grass'],
      [['Statickit', 'Ionray', 'Stormconduit'], 'electric'],
      [['Mirageling', 'Echowraith', 'Rift Revenant'], 'ghost'],
      [['Ripplewyrm', 'Leywyrm', 'Horizon Wyrm'], 'dragon'],
    ],
    [ // R8 · THE CRUCIBLE — the war arena where both powers collide
      [['Sparrling', 'Pit Brawler', 'Arena Warlord'], 'fighting'],
      [['Rubblekin', 'Rampartgolem', 'Siege Monolith'], 'rock'],
      [['Torchkin', 'Pyrehound', 'Inferno Champion'], 'fire'],
      [['Bladeling', 'Warframe', 'Warforge Colossus'], 'steel'],
      [['Jeerling', 'Mobraiser', 'Riot Baron'], 'dark'],
      [['Scaleling', 'Warwyrm', 'Crucible Drake'], 'dragon'],
    ],
    [ // R9 · THE SUNDERED CRADLE — birthplace of the split; the finale
      [['Cradlewyrm', 'Riftdrake', 'Sunder Sovereign'], 'dragon'],
      [['Dawnmote', 'Lumenkin', 'Radiant Warden'], 'fairy'],
      [['Relicframe', 'Vaultkeeper', 'Epoch Engine'], 'steel'],
      [['Dustkin', 'Mesashaper', 'Cradle Titan'], 'ground'],
      [['Agewraith', 'Eonshade', 'Memory King'], 'ghost'],
      [['Pulseling', 'Riftspark', 'Genesis Coil'], 'electric'],
    ],
  ];

  // -- bosses: every kit row clones the same-slot pokemon kit bit-for-bit
  // (style, channel pattern+params, signature entities, projectile kind);
  // only ids, names and display strings are new. Types match the source
  // boss so matchups play identically. srcId is the pokemon kit to clone.
  const REALM_BOSSES = [
    { leg: ['Velmora, the First Oracle', 'psychic', 150], myth: ['Lumine, the First Dream', 'psychic', 151],
      sents: [['The Frost Herald', 'ice', 144], ['The Storm Herald', 'electric', 145], ['The Ember Herald', 'fire', 146]],
      abName: 'BLINK STEP', chName: 'MIND SPIKE', mythAb: 'DREAM HALO', mythCh: 'DAWNBREAK WAVE' },
    { leg: ['Zephyrion, Warden of Gales', 'psychic', 249], myth: ['Verdandi, the Hourseed', 'grass', 251],
      sents: [['The Storm Vow', 'electric', 243], ['The Ember Vow', 'fire', 244], ['The Tide Vow', 'water', 245]],
      abName: 'GALE RITE', chName: 'GALEBREAK', mythAb: 'TIME BLOOM', mythCh: 'VERDANT STORM' },
    { leg: ['Thalassar, the Deep Current', 'dragon', 384], myth: ['Mirajin, the Wishing Star', 'psychic', 385],
      sents: [['The Tide Colossus', 'rock', 377], ['The Frost Colossus', 'ice', 378], ['The Hull Colossus', 'steel', 379]],
      abName: 'CURRENT CROSS', chName: 'RIPTIDE ASCENT', mythAb: 'FATE ENGINE', mythCh: 'STARFALL DECREE' },
    { leg: ['The Clockwork Regent', 'dragon', 483], myth: ['Nocthern, the Still Hour', 'dark', 491],
      sents: [['The Anvil Sibyl', 'psychic', 480], ['The Piston Sibyl', 'psychic', 481], ['The Furnace Sibyl', 'psychic', 482]],
      abName: 'CHRONO LOCK', chName: 'DECREE OF HOURS', mythAb: 'NIGHT TERROR', mythCh: 'MIDNIGHT VOID' },
    { leg: ['Voltrex, the Grid Tyrant', 'electric', 644], myth: ['Ignivar, the Victory Flame', 'fire', 494],
      sents: [['The Chrome Paladin', 'steel', 638], ['The Granite Paladin', 'rock', 639], ['The Verdant Paladin', 'grass', 640]],
      abName: 'ARC STRIKE', chName: 'FUSION RAIN', mythAb: 'VICTORY BURN', mythCh: 'TRIUMPH BLAZE' },
    { leg: ['Nyxharrow, the Carrion Angel', 'dark', 717], myth: ['Lucerna, the Glass Saint', 'fairy', 719],
      sents: [['The Foundation Serpent', 'dragon', 718]],
      abName: 'OBLIVION FAN', chName: 'ENTROPY PINCER', mythAb: 'PRISM STORM', mythCh: 'RADIANT RAIN' },
    { leg: ['The Pale Eclipse', 'psychic', 792], myth: ['Umbrix, the Stolen Shadow', 'fighting', 802],
      sents: [['The Storm Totem', 'electric', 785], ['The Dream Totem', 'psychic', 786], ['The Grove Totem', 'grass', 787]],
      abName: 'VEILED PHASE', chName: 'MOONFALL', mythAb: 'SPECTRAL COMBO', mythCh: 'SHADOW HEIST' },
    { leg: ['Omega Seraph', 'dragon', 890], myth: ['Vyrakka, the Feral Law', 'grass', 893],
      sents: [['The Volt Engine', 'electric', 894], ['The Drake Engine', 'dragon', 895], ['The Frost Destrier', 'ice', 896]],
      abName: 'SERAPH LANCE', chName: 'WORLDBREAKER', mythAb: 'JUNGLE LASH', mythCh: 'VERDANT SIEGE' },
    { leg: ['Aurelion Prime, the First Fusion', 'dragon', 1007], myth: ['Marionne, the Hollow Crown', 'poison', 1025],
      sents: [['The Vessel of Moss', 'grass', 1001], ['The Vessel of Snow', 'ice', 1002], ['The Vessel of Earth', 'ground', 1003]],
      abName: 'OVERRUN', chName: 'COLLISION PROTOCOL', mythAb: 'POISON PUPPET', mythCh: 'PUPPET CHAINS' },
  ];

  const REALM_META = [
    { name: 'GREENSPELL MARCHES', scene: 'hills',
      sky: ['#0a1a22', '#12324a', '#1b4a44'], land: ['#0e3322', '#0a2418', '#06160e'], accent: '#8ce08a' },
    { name: 'BELLTOWER REACHES', scene: 'pagoda',
      sky: ['#140d28', '#2c1a4e', '#3d2350'], land: ['#261440', '#1b0e2c', '#10081a'], accent: '#c79bff' },
    { name: 'DROWNED EXPANSE', scene: 'waves',
      sky: ['#041a2e', '#083350', '#0b5062'], land: ['#062a40', '#042232', '#031724'], accent: '#5ad7d2' },
    { name: 'FOUNDRY PEAKS', scene: 'mountain',
      sky: ['#160f14', '#33202a', '#552f26'], land: ['#2c1c22', '#1e1318', '#120a0e'], accent: '#ffab6b' },
    { name: 'CHROME SPRAWL', scene: 'skyline',
      sky: ['#0b0d1c', '#161a38', '#232855'], land: ['#131530', '#0d0f22', '#080914'], accent: '#ffd166' },
    { name: 'SPIRE OF GLASS', scene: 'tower',
      sky: ['#160d24', '#2f1a46', '#4a2449'], land: ['#291538', '#1c0e27', '#110819'], accent: '#ff9ecb' },
    { name: 'RIFT ATOLLS', scene: 'palms',
      sky: ['#0d1626', '#1c3550', '#2a5f66'], land: ['#12283a', '#0d1e2c', '#08131e'], accent: '#5affc3' },
    { name: 'THE CRUCIBLE', scene: 'stadium',
      sky: ['#170d12', '#331522', '#551f2c'], land: ['#2a121c', '#1d0c14', '#12070c'], accent: '#ff5e7e' },
    { name: 'SUNDERED CRADLE', scene: 'mesa',
      sky: ['#141020', '#332044', '#5e3a3a'], land: ['#302433', '#221826', '#140d16'], accent: '#ffcf5e' },
  ];

  // assemble gens + names + kit clones
  const gens = [];
  const bossAbilities = {}, bossChannels = {}, bossStyle = {}, bossProjectileKind = {};
  const mythicAbilities = {}, mythicEntranceStyles = {}, mythicBattleStyles = {}, legendaryEntranceStyles = {};
  const motionById = {};
  // serpents/heavies/hovers by DESIGN: dragon lines slither, golem lines are
  // heavy, spirits hover — the parts renderer and gait system read this.
  const LINE_MOTION = { dragon: 'serpentine', rock: 'heavy', ground: 'heavy', steel: 'heavy', ghost: 'hover', fairy: 'hover', psychic: 'hover', poison: 'hover' };

  REALM_LINES.forEach((lines, r) => {
    const base = (r + 1) * 100;
    const B = REALM_BOSSES[r], M = REALM_META[r];
    const legId = base + 80, mythId = base + 81;
    const t1 = [], t2 = [], t3 = [];
    lines.forEach(([names, type], li) => {
      const ids = [base + 1 + li * 3, base + 2 + li * 3, base + 3 + li * 3];
      names.forEach((n2, f) => nm(ids[f], n2));
      t1.push([ids[0], type]); t2.push([ids[1], type]); t3.push([ids[2], type]);
      // heavier gaits for the mid/apex forms of stone/metal lines only
      const prof = LINE_MOTION[type];
      if (prof) ids.forEach(id => { motionById[id] = prof; });
    });
    // sentinels join tier 3 (boss-only filtering keeps them out of waves)
    const sents = B.sents.map(([n2, t], si) => {
      const id = base + 90 + si; nm(id, n2); return [id, t];
    });
    t3.push(...sents);
    nm(legId, B.leg[0]); nm(mythId, B.myth[0]);

    gens.push({
      name: M.name, scene: M.scene, sky: M.sky, land: M.land, accent: M.accent,
      boss: { id: legId, n: B.leg[0].split(',')[0], t: B.leg[1] },
      gauntlet: { subs: sents, myth: [mythId, B.myth[1]] },
      tiers: { 1: t1, 2: t2, 3: t3 },
    });

    // ---- S4 · boss kit clones (same-slot source, bit-for-bit mechanics)
    const srcLeg = B.leg[2], srcMyth = B.myth[2];
    bossAbilities[legId] = Object.assign({}, BOSS_ABILITIES[srcLeg], { name: B.abName });
    bossChannels[legId] = Object.assign({}, BOSS_CHANNELS[srcLeg], { name: B.chName });
    bossStyle[legId] = BOSS_STYLE[srcLeg];
    bossProjectileKind[legId] = BOSS_PROJECTILE_KIND[srcLeg];
    legendaryEntranceStyles[legId] = LEGENDARY_ENTRANCE_STYLES[srcLeg];
    mythicAbilities[mythId] = Object.assign({}, MYTHIC_ABILITIES[srcMyth], { name: B.mythAb });
    bossChannels[mythId] = Object.assign({}, BOSS_CHANNELS[srcMyth], { name: B.mythCh });
    mythicEntranceStyles[mythId] = MYTHIC_ENTRANCE_STYLES[srcMyth];
    mythicBattleStyles[mythId] = MYTHIC_BATTLE_STYLES[srcMyth];
    bossProjectileKind[mythId] = BOSS_PROJECTILE_KIND[srcMyth];
    B.sents.forEach(([, , srcId], si) => {
      const id = base + 90 + si;
      if (BOSS_PROJECTILE_KIND[srcId]) bossProjectileKind[id] = BOSS_PROJECTILE_KIND[srcId];
    });
    // boss + mythic motion: legendaries mirror their source archetype
    motionById[legId] = MOTION_BY_ID[srcLeg] || (B.leg[1] === 'dragon' ? 'serpentine' : undefined);
    if (!motionById[legId]) delete motionById[legId];
  });

  // the 27 entrance styles keep their engine keys; display names are ours
  const gauntletEntranceNames = {
    prism: "HERALDS' DESCENT", stampede: 'VOWS UNBOUND', monolith: 'COLOSSI RISING',
    orbit: 'SIBYL ORBIT', swords: 'BLADES UPRIGHT', cocoon: 'FOUNDATION BREACH',
    totem: 'TOTEM RITE', stormfront: 'ENGINES OF WAR', shrine: 'RUIN PROCESSION',
    psybreak: "ORACLE'S WAKING", maelstrom: 'GALE ASCENSION', skycoil: 'DEEP CURRENT RISING',
    timesplit: 'THE HOUR FRACTURES', thunderhead: 'GRID BLACKOUT', blackwing: 'CARRION SHADOW',
    moonrise: 'THE PALE RISING', voidcrown: 'SERAPH DESCENT', suncharge: 'PRIME IGNITION',
    wishgate: 'THE FIRST DREAM', timebloom: 'HOURSEED BLOOM', starfall: 'WISHFALL',
    nightmare: 'THE STILL HOUR', victorflare: 'VICTORY FLAME', diamondbirth: 'GLASS COMMUNION',
    shadowstep: 'STOLEN SHADOW', junglecall: 'FERAL SUMMONS', toxicmask: 'THE HOLLOW COURT',
    maxrift: 'RIFT SURGE',
  };

  // ---- ecology: habitat packs per realm (ids constrained to that realm)
  const habitatPacks = [
    [ // GREENSPELL
      { n: "THE HEDGEWITCH'S FAMILIARS", ids: [101, 104, 113, 102, 105, 114] },
      { n: 'OLD ROAD PATROL', ids: [107, 110, 116, 108, 111] },
      { n: 'MILLBROOK COMMONS', ids: [116, 110, 101, 117, 112] },
      { n: "THE WARDENS' COURT", ids: [103, 106, 118, 115, 117] },
    ],
    [ // BELLTOWER
      { n: 'THE NOVICE YARD', ids: [204, 216, 201, 205, 217] },
      { n: 'EVENSONG RITES', ids: [207, 210, 208, 211, 218] },
      { n: 'THE TEA GARDENS', ids: [213, 216, 201, 214, 202] },
      { n: 'MASTERS OF THE PEAK', ids: [206, 209, 212, 215, 203] },
    ],
    [ // DROWNED EXPANSE
      { n: 'THE SHALLOWS', ids: [301, 316, 304, 302, 317] },
      { n: 'WRECK OF THE VOW', ids: [310, 307, 311, 308, 312] },
      { n: 'BLACK TRENCH', ids: [307, 313, 308, 314, 309] },
      { n: 'COURT OF THE DROWNED', ids: [312, 315, 318, 303, 306] },
    ],
    [ // FOUNDRY PEAKS
      { n: 'THE APPRENTICE LINE', ids: [401, 413, 404, 402, 414] },
      { n: 'CRUCIBLE SHIFT', ids: [407, 404, 408, 405, 409] },
      { n: 'THE DEEP BORES', ids: [410, 416, 411, 417, 412] },
      { n: 'MASTERS OF THE FORGE', ids: [403, 406, 415, 409, 418] },
    ],
    [ // CHROME SPRAWL
      { n: 'RUSH HOUR', ids: [501, 516, 504, 502, 517] },
      { n: 'THE NEON MILE', ids: [507, 510, 508, 511, 513] },
      { n: 'UNDERCITY VENTS', ids: [513, 507, 514, 508, 515] },
      { n: 'PENTHOUSE SYNDICATE', ids: [509, 512, 518, 503, 506] },
    ],
    [ // SPIRE OF GLASS
      { n: 'LOBBY APPARITIONS', ids: [601, 616, 604, 602, 617] },
      { n: 'THE GLASS GARDENS', ids: [610, 613, 611, 614, 605] },
      { n: 'SUBLEVEL LEAK', ids: [607, 601, 608, 602, 609] },
      { n: 'THE BOARD OF NIGHT', ids: [603, 606, 615, 618, 612] },
    ],
    [ // RIFT ATOLLS
      { n: 'TIDEPOOL SPIRITS', ids: [704, 701, 705, 702, 707] },
      { n: 'THE LEY CROSSING', ids: [701, 710, 713, 702, 711] },
      { n: 'JUNGLE SIGNALS', ids: [707, 710, 708, 711, 709] },
      { n: 'HORIZON RIDERS', ids: [716, 717, 703, 712, 718] },
    ],
    [ // CRUCIBLE
      { n: 'THE UNDERCARD', ids: [801, 813, 804, 802, 814] },
      { n: 'PIT CREWS', ids: [810, 804, 811, 805, 807] },
      { n: 'FIRE ROW', ids: [807, 801, 808, 802, 809] },
      { n: 'CHAMPIONS OF THE PIT', ids: [803, 806, 812, 818, 815] },
    ],
    [ // SUNDERED CRADLE
      { n: 'DAWN PILGRIMS', ids: [904, 916, 901, 905, 917] },
      { n: 'THE OLD VAULTS', ids: [907, 913, 908, 914, 910] },
      { n: 'ECHOES OF THE SPLIT', ids: [913, 916, 914, 917, 918] },
      { n: 'KEEPERS OF THE CRADLE', ids: [903, 906, 909, 912, 915] },
    ],
  ];

  // ---- act + intro + flavor strings
  const acts = [
    { n: 'I', name: 'THE OLD MAGIC', color: '#c879ff', gens: 'REALMS 1–3',
      verb: 'THE OLD WORLD WAKES AND ASSEMBLES' },
    { n: 'II', name: 'THE ASCENDANCY', color: '#4de0f2', gens: 'REALMS 4–6',
      verb: 'THE MACHINES LEARN TO TRANSFORM' },
    { n: 'III', name: 'THE CONVERGENCE', color: '#ffd166', gens: 'REALMS 7–9',
      verb: 'MAGIC AND MACHINE, COMBINED AT LAST' },
  ];
  const regionIntros = [
    { title: 'GREENSPELL MARCHES', tag: 'WHERE THE OLD MAGIC LINGERS', sub: 'HEDGEROW SPIRITS · WANDERING WARDS · AN ORACLE STIRRING' },
    { title: 'BELLTOWER REACHES', tag: 'RITES ON THE MOUNTAIN WIND', sub: 'SKY MONASTERIES · SWORN GUARDIANS · THE GALES GATHER' },
    { title: 'DROWNED EXPANSE', tag: 'THE OLD WORLD SLEEPS BELOW', sub: 'SUNKEN SPIRES · PATIENT COLOSSI · THE DEEP CURRENT TURNS' },
    { title: 'FOUNDRY PEAKS', tag: 'THE FIRST MACHINE CITY', sub: 'STONE FURNACES · CLOCKWORK LAW · EVERY HOUR ACCOUNTED FOR' },
    { title: 'CHROME SPRAWL', tag: 'THE GRID NEVER SLEEPS', sub: 'NEON CANYONS · LIVE WIRES · A TYRANT ON THE THRONE OF LIGHT' },
    { title: 'SPIRE OF GLASS', tag: 'BEAUTY, INCORPORATED', sub: 'MIRROR ATRIUMS · QUIET MERGERS · SOMETHING FEEDS ON THE LIGHT' },
    { title: 'RIFT ATOLLS', tag: 'WHERE THE LEY LINES SURFACE', sub: 'DROWNED SATELLITES · SINGING REEFS · TWO POWERS TOUCHING' },
    { title: 'THE CRUCIBLE', tag: 'THE WAR THAT NEVER ENDED', sub: 'ARENA BANNERS · ENGINES OF RUIN · THE SERAPH DESCENDS' },
    { title: 'SUNDERED CRADLE', tag: 'WHERE ONE POWER BECAME TWO', sub: 'GOLDEN BADLANDS · MEMORY GHOSTS · THE FIRST FUSION WAITS' },
  ];
  const stageFlavor = {
    '0:0': '"THE HEDGEROWS EMPTIED THE MOMENT MY SHADOW CROSSED THEM. SOMETHING OLD HAS THE MARCHES SPOOKED."  — EXPEDITION LOG, DAY 1',
    '0:1': '"WARDS ON COMMON FIELD SPIRITS? SOMEONE IS ARMING THE COUNTRYSIDE."  — EXPEDITION LOG, DAY 2',
    '0:2': '"THE FIRST ORACLE WITHDRAWS EAST. THE BELLTOWERS ARE ALREADY RINGING HER WARNING."  — EXPEDITION LOG, DAY 3',
    '1:0': '"PRAYER STREAMERS ALL POINT UPWIND HERE. THE MONKS SAY THE GALES ARE VOWS KEPT."  — EXPEDITION LOG, DAY 4',
    '1:1': '"THE SWORN ONES CIRCLED ME THREE TIMES BEFORE STRIKING. RITUAL, NOT MALICE."  — EXPEDITION LOG, DAY 5',
    '1:2': '"THE WARDEN OF GALES LET ME PASS. BELOW THE CLIFFS, THE DROWNED WORLD GLOWS."  — EXPEDITION LOG, DAY 6',
    '2:0': '"SPIRES UNDER THE SWELL — WHOLE STREETS OF THE OLD WORLD, STILL LIT."  — EXPEDITION LOG, DAY 7',
    '2:1': '"A MIGRATION OF THE DEEP CROSSED MY LANE FOR AN HOUR. YOU DON\'T FIGHT A TIDE. YOU OUTLAST IT."  — EXPEDITION LOG, DAY 8',
    '2:2': '"THE DEEP CURRENT ROSE, LOOKED, AND RETURNED TO ITS PATIENCE. THE FORGES OF THE PEAKS CALL."  — EXPEDITION LOG, DAY 9',
    '3:0': '"EVERY HOUR HERE IS RUNG, STAMPED AND FILED. A LOST COURIER NEEDED AN ESCORT TODAY."  — EXPEDITION LOG, DAY 10',
    '3:1': '"THE SIBYLS READ MY FATE IN BOILER PRESSURE. THEY WOULD NOT TELL ME THE ENDING."  — EXPEDITION LOG, DAY 11',
    '3:2': '"THE REGENT\'S PENDULUM SKIPPED A BEAT — MY GAIN. THE GRID\'S GLOW WASHES OUT THE STARS AHEAD."  — EXPEDITION LOG, DAY 12',
    '4:0': '"THE SPRAWL NEVER SLEEPS; IT ONLY DIMS TO ADVERTISE. THE STRAYS HERE ARE HALF MACHINE."  — EXPEDITION LOG, DAY 13',
    '4:1': '"RUSH HOUR ON THE CURRENT-WAYS. EVERY LANE LIVE, EVERY SIGN WATCHING."  — EXPEDITION LOG, DAY 14',
    '4:2': '"THE GRID TYRANT\'S CROWN BURNED OUT MAGNIFICENTLY. WEST, THE GLASS SPIRE PRETENDS TO BE A STAR."  — EXPEDITION LOG, DAY 15',
    '5:0': '"AN ARCHOLOGY OF MIRRORS. THE LOBBY GHOSTS CHECKED ME IN WITHOUT ASKING."  — EXPEDITION LOG, DAY 16',
    '5:1': '"KEPT THE BEACON LIT WHILE THE NIGHT BOARD VOTED ON MY REMOVAL. MOTION DENIED."  — EXPEDITION LOG, DAY 17',
    '5:2': '"THE CARRION ANGEL FOLDED ITS SIX WINGS AND THE TOWER WENT HONEST DARK. SALT AIR AHEAD."  — EXPEDITION LOG, DAY 18',
    '6:0': '"LEY LINES SURFACE HERE LIKE WHALES. THE REEFS SING BACK AT MY ENGINE."  — EXPEDITION LOG, DAY 19',
    '6:1': '"THE TOTEMS MARKED MY WINGS WITH LIGHT. TWO POWERS TOUCH HERE, AND NEITHER FLINCHES."  — EXPEDITION LOG, DAY 20',
    '6:2': '"THE PALE ECLIPSE WANED POLITELY, LIKE A HOST ENDING AN EVENING. WAR DRUMS ON THE BAND."  — EXPEDITION LOG, DAY 21',
    '7:0': '"THE CRUCIBLE SELLS TICKETS TO ITS OWN WAR. GOOD DODGES GET APPLAUSE."  — EXPEDITION LOG, DAY 22',
    '7:1': '"ENGINES OF RUIN ON PARADE AT MIDNIGHT. THE ARENA LIGHTS NEVER FLICKER."  — EXPEDITION LOG, DAY 23',
    '7:2': '"THE OMEGA SERAPH FOLDED ITS BLADES AND THE CROWD FINALLY EXHALED. ONE ROAD LEFT."  — EXPEDITION LOG, DAY 24',
    '8:0': '"GOLD DUST ON EVERYTHING. THE CRADLE REMEMBERS BEING ONE POWER, AND SO DO ITS GHOSTS."  — EXPEDITION LOG, DAY 25',
    '8:1': '"MY OWN MEMORY FLEW BESIDE ME FOR A MILE — A PHOTOGRAPH WITH WINGS. I DIDN\'T LOOK TWICE."  — EXPEDITION LOG, DAY 26',
    '8:2': '"THE FIRST FUSION FELL, AND THE SEAM IN THE WORLD BEGAN TO CLOSE. ONE DAWN LEFT TO HEAL."  — EXPEDITION LOG, DAY 27',
  };

  // ---- research rewards (keys are engine; names/copy are ours)
  const dexRewards = [
    { at: 10, key: 'fieldKit', name: 'WARD CHARM', icon: 'shield', color: '#66bb6a', desc: 'NEW EXPEDITIONS START WITH 1 SHIELD' },
    { at: 35, key: 'lucky', name: "SEEKER'S CHARM", icon: 'pokeball', color: '#ef5350', desc: '+25% CHANCE TO FIND NEW AETHERKIN' },
    { at: 75, key: 'megaSpark', name: 'SURGE CHARM', icon: 'mega', color: '#ab47bc', desc: 'NEW EXPEDITIONS START 25% SURGE CHARGED' },
    { at: 150, key: 'veteran', name: 'VETERAN SIGIL', icon: 'heart', color: '#ff8a65', desc: 'NEW EXPEDITIONS START WITH +1 LIFE' },
    { at: 250, key: 'shinyCharm', name: 'RADIANT CHARM', icon: 'fairy', color: '#ffd700', desc: 'RADIANT AETHERKIN APPEAR TWICE AS OFTEN' },
  ];

  // ---- cheat panel labels (keys engine, labels ours)
  const cheatItems = [
    { k: 'fire', label: 'FIREBRAND' }, { k: 'laser', label: 'ARC BEAM' },
    { k: 'wide', label: 'WIDE RIG' }, { k: 'slow', label: 'TIME DRAG' },
    { k: 'multi', label: 'ECHO SPHERES' }, { k: 'star', label: 'FORTUNE STAR' },
    { k: 'draco', label: 'WYRMFIRE' }, { k: 'magnet', label: 'LODESTONE' },
    { k: '_shield', label: 'SHIELD +1', icon: 'shield' },
    { k: '_mega', label: 'FULL SURGE', icon: 'mega' },
    { k: '_life', label: '+1 LIFE', icon: 'heart' },
    { k: '_element', label: 'ATTUNE', icon: 'fairy' },
  ];

  // ---- junkie draft items (path tiers as expedition loot)
  const junkieItems = {
    arsenal: ['AETHER CELL', 'SCRYING LENS', 'TWIN COILGUN', 'SWIFT SERVO'],
    impact: ['RAM PLATING', 'BLAST CORE', 'RAZOR FLUX', 'HEAVY DIE'],
    prism: ['PRISM SHARD', 'LOREKEEPER GLASS', 'FLUX BATTERY', 'THE OMNIPLATE'],
    aegis: ['WARD BAND', 'GUARDIAN SHELL', 'MENDING LOOP', 'BASTION VEST'],
    surge: ['CHARGE HERB', 'TEMPO GYRO', 'EMBER COIL', 'SURGE STONE'],
    bond: ['SOOTHING CHIME', 'FORTUNE COIN', 'LODESTAR COMPASS', 'PHOENIX CORE'],
  };

  // ---- objective families: species remapped into this id space
  const encounterObjectives = {
    '2:1': { type: 'survive', dur: 22, name: 'SURVIVE THE MIGRATION',
      tip: "OUTLAST THE SWARM — YOU DON'T HAVE TO KILL THEM ALL" },
    '3:0': { type: 'escort', name: 'ESCORT THE COURIER', species: 401, speciesT: 'steel', path: 'cross',
      tip: 'GET THE COURIER ACROSS — INTERCEPT THE FIRE AIMED AT IT' },
    '5:1': { type: 'defend', dur: 22, name: 'DEFEND THE BEACON', species: 616, speciesT: 'steel', path: 'hold',
      tip: 'KEEP THE BEACON ALIVE — SHOOT DOWN THE FIRE AIMED AT IT' },
  };

  // ---- mastery objective text (check functions shared with the engine)
  const stageObjectiveSets = {
    '0:0': [
      Object.assign({}, STAGE_OBJECTIVE_SETS['0:0'][0], { name: 'FIRST FLIGHT', desc: 'CLEAR WITHOUT TAKING A HIT' }),
      Object.assign({}, STAGE_OBJECTIVE_SETS['0:0'][1], { name: 'HEDGE BREAKER', desc: 'DEFEAT 12 WILD AETHERKIN' }),
      Object.assign({}, STAGE_OBJECTIVE_SETS['0:0'][2], { name: 'SWIFT WINGS', desc: 'CLEAR IN UNDER 75 SECONDS' }),
    ],
    '0:1': STAGE_OBJECTIVE_SETS['0:1'],
    '0:2': [
      Object.assign({}, STAGE_OBJECTIVE_SETS['0:2'][0], { name: 'MARCHES LEGEND', desc: 'WIN THE GAUNTLET WITHOUT A KNOCKOUT' }),
      Object.assign({}, STAGE_OBJECTIVE_SETS['0:2'][1], { name: 'ORACLE DANCER', desc: 'TAKE NO HITS IN THE GAUNTLET' }),
    ],
  };

  // ---- the bonus flock: swift harmless crossers, realm-1 skylarks
  const bonusFlock = { id: 107, t: 'flying', name: 'BONUS FLIGHT!',
    sub: 'SWIFT AND HARMLESS — CHAIN THEM FOR REWARDS' };

  // ---- strings consumed by engine code (S2 plumbing reads SKIN.strings)
  const strings = {
    creature: 'AETHERKIN', creatures: 'AETHERKIN',
    dexName: 'CODEX', dexGlyph: 'sigil', dexChar: '⬢',
    catchItem: 'BINDING SIGIL',
    researched: ' AETHERKIN RECORDED',
    newEntry: 'NEW! ADDED TO YOUR CODEX · +100 PTS',
    dupEntry: 'ALREADY IN YOUR CODEX · +250 PTS',
    shinyBang: 'RADIANT AETHERKIN!', shinyTag: 'RADIANT',
    shinyDrop: '+500 · GUARANTEED SIGIL DROP',
    follows: 'YOUR VESSEL FOLLOWS',
    evolvesIn: 'ASCENDS IN REALMS 4 AND 7',
    evolvingLine: from => 'THE AETHER STIRS — ' + from + ' IS ASCENDING!',
    endingTitle: 'THE SUNDERING HEALED',
    quickHint: 'AETHERKIN FLIGHT SHOOTER · 27-STAGE CAMPAIGN',
    healName: 'MENDING DRAUGHT',
    megaBang: 'AETHER SURGE!', // the Mega bang in this world's voice
    riftDesc: "ONE OF THREE PIECES THAT REWRITES THE MARCHES' FINAL ROUND",
    partnerWord: 'VESSEL',
    regionWord: 'REALM',
  };

  // the rift-secret encounter (engine flow; species + copy are skin data)
  const secret = {
    // ASCENDANT, not "VMAX" — that suffix is Pokémon TCG language and has no
    // place in the IP-clean identity
    id: 181, t: 'psychic', name: 'LUMINE ASCENDANT',
    breaking: 'SECRET ROUND · LUMINE ASCENDANT IS BREAKING THROUGH',
    announce: 'RIFT BREACH · LUMINE ASCENDANT!',
    riftName: 'MARCHES RIFT',
    homeRegion: 'MARCHES',
    missWarn: 'MISS ANY PIECE AND THE MARCHES KEEP THEIR NORMAL FINALE',
    announceSub: 'SECRET ROUND · 3 PHASES — THE NORMAL LUMINE FIGHT HAS BEEN REPLACED',
    replaced: 'THE NORMAL LUMINE ROUND HAS BEEN REPLACED',
    hint1: "A SECOND PIECE IS HIDDEN IN THE MARCHES' CHALLENGE",
    hint2: 'THE LAST PIECE RESTS BEYOND VELMORA',
    conquered: 'MARCHES RIFT · CONQUERED',
    // shard courier (shooter modes): the bonus-flight species doubles as the
    // rift's swift carrier — its sprite is guaranteed by the same painter
    courier: { id: 107, t: 'psychic', name: 'RIFT COURIER' },
  };

  // ---- mode-card copy: config.js parses pre-skin, so patch at load
  const MODE_COPY = {
    junkie: { desc: 'AETHERKIN FLIGHT SHOOTER',
      summary: ['Pilot your vessel through enemy squadrons', 'in a 27-wave journey across nine realms.'],
      lines: ['PILOT A VESSEL · DODGE ENEMY FIRE', 'TAP TO ATTACK · HOLD FOR PIERCING CHARGE'] },
    classic: { desc: 'CLASSIC BRICK BREAKER',
      summary: ['Keep the rally alive, crack aether walls,', 'and take on sovereign boss battles.'],
      lines: ['BOUNCE THE BALL · BREAK EVERY BLOCK', 'MOVE THE PADDLE · BUILD RALLIES'] },
    blaster: { desc: 'ARCADE WALL SHOOTER',
      summary: ['Skip the ball and blast the wall directly', 'with quick volleys and piercing charge shots.'],
      lines: ['SHOOT THE BLOCK WALL DIRECTLY', 'TAP TO FIRE · HOLD FOR PIERCING CHARGE'] },
  };

  // ---------- assembly ----------
  Object.assign(AF, {
    edition: 'AETHERFALL EDITION',
    affinities: true, // unlocks the LIGHT/DARK setup pick (Round S6)
    rosterGroups: [
      { n: 'MAGIC · THE OLD WAYS', color: '#c879ff' },
      { n: 'TECH · THE ASCENDANCY', color: '#4de0f2' },
      { n: 'MAGITECH · THE CONVERGENCE', color: '#ffd166' },
    ],
    starterOrder: ['fire', 'ice', 'grass', 'ghost', 'dark', 'fairy',       // MAGIC
      'steel', 'bug', 'poison', 'flying', 'rock', 'fighting',              // TECH
      'electric', 'psychic', 'dragon', 'ground', 'water', 'normal'],       // MAGITECH
    classes: CLASSES, disciplines: DISCIPLINES, treeLexicon: TREE_LEXICON,
    starterMon, names: NAMES, gens, habitatPacks,
    regionIntros, stageFlavor, acts,
    junkieItems, dexRewards, cheatItems, gauntletEntranceNames,
    bossAbilities, bossChannels, bossStyle, bossProjectileKind,
    mythicAbilities, mythicEntranceStyles, mythicBattleStyles, legendaryEntranceStyles,
    motionById, encounterObjectives, stageObjectiveSets, bonusFlock,
    strings, secret,
  });
  // derived sets refresh from the REAL gens (assembly ran on the stub)
  AF.bossOnlyIds = new Set(AF.gens.flatMap(g => [
    g.boss.id,
    ...(g.gauntlet ? g.gauntlet.subs.map(([id]) => id) : []),
    ...(g.gauntlet ? [g.gauntlet.myth[0]] : []),
  ]));
  // active-skin hooks: patch parse-before-skin surfaces (mode cards, and the
  // few shared PATHS labels that carried pokemon flavor — classic/blaster
  // read tier.name/visual directly, junkie already rides SKIN.junkieItems)
  if (SKIN === AF) {
    for (const m of MODES) if (MODE_COPY[m.key]) Object.assign(m, MODE_COPY[m.key]);
    Object.assign(PATHS.bond.tiers[1], { name: "KEEPER'S PACT",
      visual: 'A BINDING SIGIL CREST LOCKS TO THE REAR RIG' });
    Object.assign(PATHS.bond.tiers[3], { name: 'AETHER REVIVE' });
    document.title = 'AETHERFALL'; // the world is the brand (2026-07-21)
  }
})();
