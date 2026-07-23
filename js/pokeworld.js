'use strict';
// ============================================================
//  POKÉMON WORLD (pokeworld.js) — every pokemon-skin world table:
//  starters, rosters (GENS), names, habitat packs, acts, boss kits,
//  entrance styles, region intros, stage flavor, objectives, sprite
//  sources, and the assembleSkins() call that attaches them all to
//  SKINS.pokemon by reference (bit-identical presentation).
//  Loads BETWEEN data.js (the shared engine — type keys, effectiveness,
//  paths, the upgrade web, STARTER_KIT balance numbers) and
//  aetherfall.js (which clones same-slot boss kits and reads these
//  tables at parse time). An AETHERFALL-only distribution replaces
//  this file with a stub that supplies equivalent tables.
// ============================================================

// ---- starter Pokémon: one three-stage partner line for every battle type.
// Each line owns a distinct, tiered gameplay hook. Pikachu is the deliberate
// exception to the three-form rule: it starts as Pikachu, evolves into an
// overpowered Raichu in region 5, then its OVERDRIVE reaches tier III later.
// Balance numbers + tier copy are ENGINE data now (STARTER_KIT, data.js);
// this table wraps them with the pokemon identity: ids, names, abilities,
// blurbs — including the per-mode ability/blurb voices for fire and water.
const STARTER_MON = {
  normal: starterLine([137, 233, 474], ['PORYGON', 'PORYGON2', 'PORYGON-Z'], 'ADAPTABILITY',
    'MORE DAMAGE · MORE SCORE', STARTER_KIT.normal.tiers, STARTER_KIT.normal.mods),
  fire: starterLine([4, 5, 6], ['CHARMANDER', 'CHARMELEON', 'CHARIZARD'], 'BLAZE',
    'RETURNS IGNITE · FIRE DAMAGE', STARTER_KIT.fire.tiers, STARTER_KIT.fire.mods, {
      classic: { ability: 'BLAZE', blurb: 'RETURNS IGNITE THE BALL', tiers: STARTER_KIT.fire.modeTiers.classic },
      blaster: { ability: 'BLAZE', blurb: 'FIRE-TYPE DAMAGE', tiers: STARTER_KIT.fire.modeTiers.blaster },
      junkie: { ability: 'BLAZE PILOT', blurb: 'FIRE ATTACKS · MORE DAMAGE', tiers: STARTER_KIT.fire.modeTiers.junkie },
    }),
  water: starterLine([7, 8, 9], ['SQUIRTLE', 'WARTORTLE', 'BLASTOISE'], 'TORRENT',
    'COOLER SHOTS · RETURN SHIELDS', STARTER_KIT.water.tiers, STARTER_KIT.water.mods, {
      classic: { ability: 'TORRENT', blurb: 'COOLER SHOTS · RETURN SHIELDS', tiers: STARTER_KIT.water.modeTiers.classic },
      blaster: { ability: 'TORRENT', blurb: 'COOLER SHOTS · WATER DEFENSE', tiers: STARTER_KIT.water.modeTiers.blaster },
      junkie: { ability: 'TORRENT PILOT', blurb: 'WATER ATTACKS · COOLER SHOTS', tiers: STARTER_KIT.water.modeTiers.junkie },
    }),
  electric: starterLine([25, 26, 26], ['PIKACHU', 'RAICHU', 'RAICHU'], 'OVERDRIVE',
    'OVERPOWERED DAMAGE · CHAIN LIGHTNING', STARTER_KIT.electric.tiers, STARTER_KIT.electric.mods),
  grass: starterLine([1, 2, 3], ['BULBASAUR', 'IVYSAUR', 'VENUSAUR'], 'OVERGROWTH',
    'MORE DROPS · EASIER PICKUPS', STARTER_KIT.grass.tiers, STARTER_KIT.grass.mods),
  ice: starterLine([363, 364, 365], ['SPHEAL', 'SEALEO', 'WALREIN'], 'SNOW WARNING',
    'KOS TRIGGER SLOW-MO', STARTER_KIT.ice.tiers, STARTER_KIT.ice.mods),
  fighting: starterLine([66, 67, 68], ['MACHOP', 'MACHOKE', 'MACHAMP'], 'GUTS',
    'MISSING HP BOOSTS DAMAGE', STARTER_KIT.fighting.tiers, STARTER_KIT.fighting.mods),
  poison: starterLine([32, 33, 34], ['NIDORAN', 'NIDORINO', 'NIDOKING'], 'CORROSION',
    'REPEATED HITS MELT ARMOR', STARTER_KIT.poison.tiers, STARTER_KIT.poison.mods),
  ground: starterLine([111, 112, 464], ['RHYHORN', 'RHYDON', 'RHYPERIOR'], 'SAND FORCE',
    'CRUSH ARMOR · TRIGGER QUAKES', STARTER_KIT.ground.tiers, STARTER_KIT.ground.mods),
  flying: starterLine([16, 17, 18], ['PIDGEY', 'PIDGEOTTO', 'PIDGEOT'], 'TAILWIND',
    'WIDER RIG · FASTER MOVEMENT', STARTER_KIT.flying.tiers, STARTER_KIT.flying.mods),
  psychic: starterLine([63, 64, 65], ['ABRA', 'KADABRA', 'ALAKAZAM'], 'FORESIGHT',
    'GUARANTEED PRECISION CRITS', STARTER_KIT.psychic.tiers, STARTER_KIT.psychic.mods),
  bug: starterLine([10, 12, 12], ['CATERPIE', 'BUTTERFREE', 'BUTTERFREE'], 'SWARM',
    'KOS SUMMON EXTRA ATTACKS', STARTER_KIT.bug.tiers, STARTER_KIT.bug.mods),
  rock: starterLine([246, 247, 248], ['LARVITAR', 'PUPITAR', 'TYRANITAR'], 'STURDY',
    'EXTRA MAXIMUM HP', STARTER_KIT.rock.tiers, STARTER_KIT.rock.mods),
  ghost: starterLine([92, 93, 94], ['GASTLY', 'HAUNTER', 'GENGAR'], 'PHASE SHIFT',
    'CHANCE TO IGNORE DAMAGE', STARTER_KIT.ghost.tiers, STARTER_KIT.ghost.mods),
  dragon: starterLine([147, 148, 149], ['DRATINI', 'DRAGONAIR', 'DRAGONITE'], 'DRAGONHEART',
    'START CHARGED · LONGER MEGA', STARTER_KIT.dragon.tiers, STARTER_KIT.dragon.mods),
  dark: starterLine([551, 552, 553], ['SANDILE', 'KROKOROK', 'KROOKODILE'], 'MOXIE',
    'COMBOS AMPLIFY DAMAGE/SCORE', STARTER_KIT.dark.tiers, STARTER_KIT.dark.mods),
  steel: starterLine([81, 82, 462], ['MAGNEMITE', 'MAGNETON', 'MAGNEZONE'], 'IRON DEFENSE',
    'START WITH SHIELDS', STARTER_KIT.steel.tiers, STARTER_KIT.steel.mods),
  fairy: starterLine([175, 176, 468], ['TOGEPI', 'TOGETIC', 'TOGEKISS'], 'WISH',
    'MORE POTIONS · EASIER CATCHES', STARTER_KIT.fairy.tiers, STARTER_KIT.fairy.mods),
};

// ---- species-aware MOTION PROFILES (type is only the fallback) ----
// A ground dragon should not flap; a serpent should undulate; a boulder
// should barely bob. Ids listed here override the type-derived gait.
const MOTION_PROFILES = {
  serpentine: [23, 24, 95, 130, 147, 148, 149, 206, 230, 336, 350, 384, 634, 635, 691, 704, 705, 706],
  heavy: [74, 75, 76, 143, 208, 306, 376, 377, 464, 486, 68, 112, 232, 248, 526],
  biped: [104, 105, 106, 107, 122, 125, 126, 236, 237, 532, 533, 534, 619, 620],
  quadruped: [58, 59, 77, 78, 111, 128, 133, 134, 135, 136, 155, 156, 157, 209, 210, 234, 261, 262, 447, 448],
};
const MOTION_BY_ID = {};
for (const [prof, ids] of Object.entries(MOTION_PROFILES)) for (const id of ids) MOTION_BY_ID[id] = prof;

// ---- SPACE JUNKIE held items: the SAME skill tree, re-skinned as the
// Pokémon items your pilot would actually hold — one per path tier, each
// appearing as a badge orbiting the ship when earned.
const JUNKIE_ITEMS = {
  arsenal: ['MYSTIC WATER', 'SCOPE LENS', 'CHOICE SPECS', 'QUICK CLAW'],
  impact:  ['MUSCLE BAND', 'BLAST SEED', 'RAZOR CLAW', 'LOADED DICE'],
  prism:   ['PRISM SCALE', 'WISE GLASSES', 'CELL BATTERY', 'LEGEND PLATE'],
  aegis:   ['FOCUS BAND', 'EVIOLITE', 'LEFTOVERS', 'ASSAULT VEST'],
  surge:   ['POWER HERB', 'METRONOME', 'CHARCOAL', 'MEGA STONE'],
  bond:    ['BONE CLUB', 'BONEMERANG', 'TWIN BONES', 'BONE RUSH'], // AFT-007: the returning-weapon identity
};

// ============================================================
//  GENERATION JOURNEY — roster, boss & region theme per gen
// ============================================================
const GENS = [
  { name: 'KANTO', scene: 'hills',
    sky: ['#081226', '#10254a', '#16324a'], land: ['#0c2e22', '#0a2118', '#06140f'], accent: '#7ee08a',
    boss: { id: 150, n: 'Mewtwo', t: 'psychic' },
    gauntlet: { subs: [[144,'ice'],[145,'electric'],[146,'fire']], myth: [151,'psychic'] },
    tiers: {
      1: [[16,'flying'],[19,'normal'],[10,'bug'],[41,'poison'],[129,'water'],[43,'grass'],[60,'water'],[74,'rock'],[133,'normal'],[25,'electric'],[7,'water'],[4,'fire'],[1,'grass'],[39,'fairy'],[54,'water'],[92,'ghost'],[52,'normal'],[23,'poison'],[109,'poison'],[35,'fairy']],
      2: [[17,'flying'],[8,'water'],[5,'fire'],[2,'grass'],[64,'psychic'],[93,'ghost'],[67,'fighting'],[61,'water'],[26,'electric'],[75,'rock'],[53,'normal'],[24,'poison'],[110,'poison'],[36,'fairy']],
      3: [[6,'fire'],[9,'water'],[3,'grass'],[65,'psychic'],[94,'ghost'],[68,'fighting'],[130,'water'],[149,'dragon'],[143,'normal'],[144,'ice'],[145,'electric'],[146,'fire']],
    } },
  { name: 'JOHTO', scene: 'pagoda',
    sky: ['#140d26', '#2a1a4a', '#3a2348'], land: ['#241433', '#1a0e26', '#100818'], accent: '#c79bff',
    boss: { id: 249, n: 'Lugia', t: 'psychic' },
    gauntlet: { subs: [[243,'electric'],[244,'fire'],[245,'water']], myth: [251,'grass'] },
    tiers: {
      1: [[152,'grass'],[155,'fire'],[158,'water'],[161,'normal'],[163,'flying'],[167,'bug'],[179,'electric'],[183,'water'],[187,'grass'],[194,'water'],[209,'fairy'],[218,'fire'],[220,'ice'],[228,'dark'],[231,'ground'],[246,'rock']],
      2: [[153,'grass'],[156,'fire'],[159,'water'],[180,'electric'],[176,'fairy'],[196,'psychic'],[197,'dark'],[198,'dark'],[210,'fairy'],[247,'rock']],
      3: [[154,'grass'],[157,'fire'],[160,'water'],[181,'electric'],[169,'poison'],[229,'dark'],[232,'ground'],[230,'dragon'],[248,'rock'],[212,'steel'],[214,'bug'],[227,'steel']],
    } },
  { name: 'HOENN', scene: 'waves',
    sky: ['#04182b', '#0a2f4d', '#0d4a5e'], land: ['#06283d', '#04202f', '#031622'], accent: '#5ad7d2',
    boss: { id: 384, n: 'Rayquaza', t: 'dragon' },
    gauntlet: { subs: [[377,'rock'],[378,'ice'],[379,'steel']], myth: [385,'psychic'] },
    tiers: {
      1: [[252,'grass'],[255,'fire'],[258,'water'],[261,'dark'],[263,'normal'],[265,'bug'],[280,'psychic'],[285,'grass'],[287,'normal'],[304,'steel'],[309,'electric'],[322,'fire'],[363,'ice'],[371,'dragon'],[278,'water'],[300,'normal']],
      2: [[253,'grass'],[256,'fire'],[259,'water'],[281,'psychic'],[286,'grass'],[305,'steel'],[310,'electric'],[323,'fire'],[364,'ice'],[372,'dragon']],
      3: [[254,'grass'],[257,'fire'],[260,'water'],[282,'psychic'],[306,'steel'],[330,'dragon'],[373,'dragon'],[376,'steel'],[350,'water'],[359,'dark'],[334,'dragon']],
    } },
  { name: 'SINNOH', scene: 'mountain',
    sky: ['#0a1126', '#15234d', '#23365e'], land: ['#1b2a4a', '#131f38', '#0c1426'], accent: '#9fb8ff',
    boss: { id: 483, n: 'Dialga', t: 'dragon' },
    gauntlet: { subs: [[480,'psychic'],[481,'psychic'],[482,'psychic']], myth: [491,'dark'] },
    tiers: {
      1: [[387,'grass'],[390,'fire'],[393,'water'],[396,'flying'],[399,'normal'],[403,'electric'],[406,'grass'],[427,'normal'],[431,'normal'],[434,'poison'],[436,'steel'],[447,'fighting'],[449,'ground'],[459,'ice'],[453,'poison'],[418,'water']],
      2: [[388,'grass'],[391,'fire'],[394,'water'],[397,'flying'],[404,'electric'],[426,'ghost'],[428,'normal'],[444,'dragon'],[448,'fighting'],[454,'poison']],
      3: [[389,'grass'],[392,'fire'],[395,'water'],[398,'flying'],[405,'electric'],[407,'grass'],[445,'dragon'],[461,'dark'],[462,'electric'],[468,'fairy'],[473,'ice'],[466,'electric']],
    } },
  { name: 'UNOVA', scene: 'skyline',
    sky: ['#0d0d1a', '#1a1a33', '#26264d'], land: ['#15152b', '#0f0f20', '#090914'], accent: '#ffd166',
    boss: { id: 644, n: 'Zekrom', t: 'electric' },
    gauntlet: { subs: [[638,'steel'],[639,'rock'],[640,'grass']], myth: [494,'fire'] },
    tiers: {
      1: [[495,'grass'],[498,'fire'],[501,'water'],[504,'normal'],[506,'normal'],[509,'dark'],[519,'flying'],[522,'electric'],[524,'rock'],[527,'psychic'],[543,'bug'],[551,'ground'],[570,'dark'],[572,'normal'],[607,'ghost'],[610,'dragon']],
      2: [[496,'grass'],[499,'fire'],[502,'water'],[507,'normal'],[523,'electric'],[552,'ground'],[571,'dark'],[608,'ghost'],[611,'dragon'],[525,'rock']],
      3: [[497,'grass'],[500,'fire'],[503,'water'],[530,'ground'],[534,'fighting'],[553,'ground'],[609,'ghost'],[612,'dragon'],[635,'dark'],[637,'bug'],[628,'flying'],[625,'dark']],
    } },
  { name: 'KALOS', scene: 'tower',
    sky: ['#160d22', '#321a40', '#4a2440'], land: ['#2a1533', '#1d0e24', '#120818'], accent: '#ff9ecb',
    boss: { id: 717, n: 'Yveltal', t: 'dark' },
    gauntlet: { subs: [[718,'dragon']], myth: [719,'fairy'] },
    tiers: {
      1: [[650,'grass'],[653,'fire'],[656,'water'],[659,'normal'],[661,'flying'],[664,'bug'],[667,'fire'],[669,'fairy'],[672,'grass'],[674,'fighting'],[677,'psychic'],[679,'steel'],[686,'dark'],[694,'electric'],[708,'ghost'],[712,'ice']],
      2: [[651,'grass'],[654,'fire'],[657,'water'],[662,'flying'],[675,'fighting'],[680,'steel'],[705,'dragon'],[700,'fairy'],[695,'electric'],[709,'ghost']],
      3: [[652,'grass'],[655,'fire'],[658,'water'],[663,'fire'],[681,'steel'],[706,'dragon'],[697,'rock'],[715,'dragon'],[713,'ice'],[701,'fighting'],[671,'fairy']],
    } },
  { name: 'ALOLA', scene: 'palms',
    sky: ['#1a0d26', '#40204d', '#6e3640'], land: ['#2e1733', '#1f0f24', '#120818'], accent: '#ffb74d',
    boss: { id: 792, n: 'Lunala', t: 'psychic' },
    gauntlet: { subs: [[785,'electric'],[786,'psychic'],[787,'grass']], myth: [802,'fighting'] },
    tiers: {
      1: [[722,'grass'],[725,'fire'],[728,'water'],[731,'flying'],[734,'normal'],[736,'bug'],[744,'rock'],[761,'grass'],[764,'fairy'],[767,'bug'],[769,'ghost'],[775,'normal'],[779,'psychic'],[781,'ghost'],[782,'dragon'],[755,'grass']],
      2: [[723,'grass'],[726,'fire'],[729,'water'],[737,'electric'],[745,'rock'],[762,'grass'],[768,'bug'],[783,'dragon'],[750,'ground'],[741,'fire']],
      3: [[724,'grass'],[727,'fire'],[730,'water'],[738,'electric'],[763,'grass'],[770,'ghost'],[784,'dragon'],[778,'ghost'],[748,'poison'],[758,'poison'],[760,'fighting'],[777,'electric']],
    } },
  { name: 'GALAR', scene: 'stadium',
    sky: ['#0d1218', '#1c2733', '#2c3e4d'], land: ['#16222e', '#101822', '#0a0f16'], accent: '#ff5e7e',
    boss: { id: 890, n: 'Eternatus', t: 'dragon' },
    gauntlet: { subs: [[894,'electric'],[895,'dragon'],[896,'ice']], myth: [893,'grass'] },
    tiers: {
      1: [[810,'grass'],[813,'fire'],[816,'water'],[819,'normal'],[821,'flying'],[824,'bug'],[827,'dark'],[831,'normal'],[835,'electric'],[837,'rock'],[840,'dragon'],[843,'ground'],[856,'psychic'],[859,'dark'],[872,'ice'],[868,'fairy']],
      2: [[811,'grass'],[814,'fire'],[817,'water'],[822,'flying'],[836,'electric'],[838,'rock'],[844,'ground'],[857,'psychic'],[860,'dark'],[825,'bug']],
      3: [[812,'grass'],[815,'fire'],[818,'water'],[823,'steel'],[839,'rock'],[841,'dragon'],[858,'psychic'],[861,'dark'],[869,'fairy'],[879,'steel'],[887,'dragon'],[849,'electric']],
    } },
  { name: 'PALDEA', scene: 'mesa',
    sky: ['#190f1f', '#3a1d33', '#5e2e33'], land: ['#33202a', '#241620', '#150c15'], accent: '#ffcf5e',
    boss: { id: 1007, n: 'Koraidon', t: 'dragon' },
    gauntlet: { subs: [[1001,'grass'],[1002,'ice'],[1003,'ground']], myth: [1025,'poison'] },
    tiers: {
      1: [[906,'grass'],[909,'fire'],[912,'water'],[915,'normal'],[917,'bug'],[919,'bug'],[921,'electric'],[926,'fairy'],[928,'grass'],[932,'rock'],[935,'fire'],[957,'fairy'],[940,'electric'],[971,'ghost'],[996,'dragon'],[978,'dragon']],
      2: [[907,'grass'],[910,'fire'],[913,'water'],[922,'electric'],[933,'rock'],[936,'fire'],[937,'ghost'],[958,'fairy'],[997,'dragon'],[972,'ghost']],
      3: [[908,'grass'],[911,'fire'],[914,'water'],[923,'electric'],[934,'rock'],[959,'fairy'],[998,'dragon'],[979,'ghost'],[983,'dark'],[1000,'steel'],[970,'rock'],[980,'poison']],
    } },
];

// Legendary, mythical, and sentinel species are encounter headliners. Keep
// them out of ordinary ranks, reinforcements, and guard pools so seeing one
// always means a boss round has begun.
const BOSS_ONLY_IDS = new Set(GENS.flatMap(g => [
  g.boss.id,
  ...(g.gauntlet ? g.gauntlet.subs.map(([id]) => id) : []),
  ...(g.gauntlet ? [g.gauntlet.myth[0]] : []),
]));

// ============================================================
//  ECOLOGY — Pokémon that BELONG together appear together.
//  Each region has curated HABITAT PACKS (the groupings you'd see in the
//  episodes: a starter trio and its trainer's partner, a route's early
//  birds and rodents, a haunted tower, an icy cavern, an elite den) —
//  every id constrained to that region's roster, and packs spanning tiers
//  so a Pidgey squad flies under a Pidgeotto elite of the SAME line.
//  Waves without a pack fall back to a TYPE-CLUSTER habitat.
// ============================================================
const HABITAT_PACKS = [
  [ // KANTO
    { n: "ASH'S PARTNERS", ids: [25, 1, 4, 7, 2, 5, 8, 3, 6, 9] },
    { n: 'TEAM ROCKET', ids: [52, 23, 109, 53, 24, 110] }, // prepare for trouble
    { n: 'ROUTE 1', ids: [16, 19, 10, 17] },
    { n: 'CERULEAN WATERS', ids: [129, 54, 60, 61, 130] },
    { n: 'LAVENDER TOWER', ids: [92, 41, 93, 94] },
    { n: 'MT. MOON', ids: [41, 74, 35, 39, 75, 36] },
    { n: 'SAFFRON DOJO', ids: [64, 67, 65, 68] },
    { n: 'INDIGO ELITE', ids: [133, 143, 130, 149, 144, 145, 146] },
  ],
  [ // JOHTO
    { n: 'NEW BARK TRIO', ids: [152, 155, 158, 153, 156, 159, 154, 157, 160] },
    { n: 'ROUTE 29', ids: [161, 163, 167, 187] },
    { n: 'ECRUTEAK NIGHT', ids: [228, 198, 196, 197, 229] },
    { n: 'FIELDS OF GOLD', ids: [179, 187, 180, 181] },
    { n: 'LAKE OF RAGE', ids: [183, 194, 158, 159, 160, 230] },
    { n: 'MT. SILVER', ids: [246, 231, 247, 212, 248, 227, 232] },
  ],
  [ // HOENN
    { n: 'LITTLEROOT TRIO', ids: [252, 255, 258, 253, 256, 259, 254, 257, 260] },
    { n: 'PETALBURG WOODS', ids: [265, 285, 263, 261, 286] },
    { n: 'COASTAL SWELL', ids: [278, 258, 259, 260, 350] },
    { n: 'MT. CHIMNEY', ids: [322, 255, 323, 256, 257] },
    { n: 'ICY CAVERN', ids: [363, 304, 364, 305, 306] },
    { n: "DRAGON'S DEN", ids: [371, 372, 373, 334, 330, 376] },
  ],
  [ // SINNOH
    { n: 'TWINLEAF TRIO', ids: [387, 390, 393, 388, 391, 394, 389, 392, 395] },
    { n: 'ROUTE 202', ids: [399, 403, 396, 404, 405, 397, 398] },
    { n: 'ETERNA FOREST', ids: [406, 427, 434, 426, 428, 407] },
    { n: 'GREAT MARSH', ids: [453, 434, 418, 454] },
    { n: 'SNOWPOINT PEAK', ids: [459, 436, 473] },
    { n: 'MT. CORONET', ids: [436, 447, 444, 448, 445, 461] },
  ],
  [ // UNOVA
    { n: 'ASPERTIA TRIO', ids: [495, 498, 501, 496, 499, 502, 497, 500, 503] },
    { n: 'ROUTE 19', ids: [504, 506, 509, 519] },
    { n: 'DESERT RESORT', ids: [551, 570, 552, 571, 553, 530] },
    { n: 'CELESTIAL TOWER', ids: [607, 527, 608, 609] },
    { n: 'CHARGESTONE CAVE', ids: [543, 522, 524, 523, 525, 637] },
    { n: 'DRAGONSPIRAL', ids: [610, 611, 612, 635] },
  ],
  [ // KALOS
    { n: 'VANIVILLE TRIO', ids: [650, 653, 656, 651, 654, 657, 652, 655, 658] },
    { n: 'SANTALUNE FOREST', ids: [664, 661, 659, 662, 650] },
    { n: 'FAIRY GARDEN', ids: [669, 677, 700, 671] },
    { n: 'WINTER WOODS', ids: [712, 708, 713, 709] },
    { n: 'SWORD & FIST', ids: [674, 679, 675, 680, 681, 701] },
    { n: 'DRAGON MARSH', ids: [705, 706, 715] },
  ],
  [ // ALOLA
    { n: 'MELEMELE TRIO', ids: [722, 725, 728, 723, 726, 729, 724, 727, 730] },
    { n: 'ROUTE 1 TRIAL', ids: [731, 734, 736, 744, 745] },
    { n: 'LUSH JUNGLE', ids: [761, 755, 764, 762, 763] },
    { n: 'HAUNTED SHORES', ids: [769, 778, 781, 770] },
    { n: "KAHUNA'S DRAGONS", ids: [782, 783, 784] },
  ],
  [ // GALAR
    { n: 'GALAR TRIO', ids: [810, 813, 816, 811, 814, 817, 812, 815, 818] },
    { n: 'ROUTE 1 GALAR', ids: [819, 821, 824, 827, 822, 825] },
    { n: 'GALAR MINE', ids: [837, 843, 838, 844, 839, 879] },
    { n: 'GLIMWOOD TANGLE', ids: [856, 859, 857, 860, 858, 861] },
    { n: 'CHAMPION CUP', ids: [887, 823, 849, 879] },
  ],
  [ // PALDEA
    { n: 'MESAGOZA TRIO', ids: [906, 909, 912, 907, 910, 913, 908, 911, 914] },
    { n: 'POCO PATH', ids: [915, 917, 919, 921] },
    { n: 'ELECTRIC RAVE', ids: [921, 940, 922, 923] },
    { n: 'GHOST HUNT', ids: [971, 972, 937, 979] },
    { n: 'FROZEN FANGS', ids: [996, 978, 997, 998] },
  ],
];

// ---- THE THREE ACTS. The journey is a three-act play: gens 1–3 teach the
// flocks to ASSEMBLE, 4–6 teach them to TRANSFORM, 7–9 COMBINE everything.
// Act boundaries land exactly on the partner evolutions (regions 4 & 7) and
// are celebrated with a full evolution ceremony between waves.
const ACTS = [
  { n: 'I',   name: 'FORMATION',      color: '#66bb6a', gens: 'GENERATIONS 1–3',
    verb: 'THE FLOCKS LEARN TO ASSEMBLE' },
  { n: 'II',  name: 'TRANSFORMATION', color: '#ffd54f', gens: 'GENERATIONS 4–6',
    verb: 'THE FORMATIONS BEGIN TO TRANSFORM' },
  { n: 'III', name: 'MASTERY',        color: '#ff8a65', gens: 'GENERATIONS 7–9',
    verb: 'EVERY MOTION THEY KNOW, COMBINED' },
];

// signature boss mechanics, keyed by legendary id
const BOSS_ABILITIES = {
  150:  { cd: 6,   name: 'TELEPORT' },        // Mewtwo blinks across the arena
  249:  { cd: 7,   name: 'AEROBLAST' },       // Lugia summons gusting winds
  384:  { cd: 8,   name: 'SKY SWEEP' },       // Rayquaza crosses the playfield
  // p2FireMul: BASTION cadence tightens in phase 2+ (was a hardcoded id
  // check in update.js — now data, so any skin's bastion boss can carry it)
  483:  { cd: 8,   name: 'ROAR OF TIME', p2FireMul: 0.85 }, // Dialga warps ball speed
  644:  { cd: 7.5, name: 'BOLT STRIKE' },     // Zekrom calls column lightning
  717:  { cd: 7,   name: 'OBLIVION WING' },   // Yveltal fires a shot fan
  792:  { cd: 8,   name: 'PHANTOM PHASE' },   // Lunala turns intangible
  890:  { cd: 8,   name: 'DYNAMAX CANNON' },  // Eternatus fires a warned beam
  1007: { cd: 7,   name: 'WILD CHARGE' },     // Koraidon dashes across the arena
};

// ---- DESPERATION CHANNELS (Milestone 4): the shared low-HP CHANNEL best
// answered by CHARGE (Mewtwo's Psystrike, rolled across the roster). Keyed by
// legendary id; the channel + charged-interrupt machinery in update.js is
// data-driven off this table (junkie, non-mythic, non-secret — same gates as
// the original Psystrike hard-gate). `pattern` selects the punish lane geometry
// (columns / sweep / clock) fired if the channel is NOT interrupted. The stagger
// (1.5s ×1.35) is a template constant held in update.js, uniform across bosses.
// `params` (optional) tunes a shared pattern per boss without new code paths:
// {count, w, gap, warnMul, bounce, color} consumed by spawnChannelPunish. An
// entry with NO params keeps today's literal behaviour BIT-IDENTICAL (Mewtwo /
// Lugia / Dialga below — their duel tests are the guard).
const BOSS_CHANNELS = {
  150: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'PSYSTRIKE',     pattern: 'columns' },
  249: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'AEROBLAST',     pattern: 'sweep'   },
  384: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'DRAGON ASCENT', pattern: 'sweep', params: { count: 6, gap: 0.24 } },
  483: { hpFrac: 0.15, dur: 2.8, cd: 9, name: 'ROAR OF TIME',  pattern: 'clock'   },
  644: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'FUSION BOLT',   pattern: 'rain', params: { count: 7, gap: 0.16, color: '#80d8ff' } },
  717: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'DARK PULSE',    pattern: 'pincer', params: { count: 6 } },
  792: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'MOONGEIST BEAM', pattern: 'columns', params: { count: 3, w: 110, warnMul: 1.3 } },
  890: { hpFrac: 0.15, dur: 2.8, cd: 9, name: 'ETERNABEAM', pattern: 'sweep', params: { count: 4, w: 90, gap: 0.34 } },
  1007: { hpFrac: 0.15, dur: 2.6, cd: 9, name: 'COLLISION COURSE', pattern: 'sweep', params: { count: 8, gap: 0.18, bounce: true } },
  // ---- Round C: the nine MYTHICS carry the template too (gauntlet round 3).
  // Shorter channels (dur 2.4); the interrupt constants (1.5s ×1.35, cd 9) stay
  // uniform. Keyed by mythic id — Mew VMAX ALSO has id 151, so the channel-open
  // gate keeps `!boss.secretBoss` to keep the secret reward channel-free.
  151: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'GENESIS WAVE',     pattern: 'rain',    params: { count: 6, gap: 0.14 } },
  251: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'LEAF STORM',       pattern: 'pincer',  params: { count: 4 } },
  385: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'MILLENNIUM COMET', pattern: 'columns', params: { count: 5, warnMul: 1.2 } },
  491: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'DARK VOID',        pattern: 'pincer',  params: { count: 6, warnMul: 1.5 } },
  494: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'V-CREATE',         pattern: 'sweep',   params: { count: 6, gap: 0.2 } },
  719: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'MOONBLAST',        pattern: 'rain',    params: { count: 5, gap: 0.2, color: '#f8bbd0' } },
  802: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'SPECTRAL THIEF',   pattern: 'clock',   params: { count: 6 } },
  893: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'POWER WHIP',       pattern: 'pincer',  params: { count: 6 } },
  1025: { hpFrac: 0.15, dur: 2.4, cd: 9, name: 'MALIGNANT CHAIN', pattern: 'rain',    params: { count: 7, gap: 0.14, color: '#ce93d8' } },
};

// ---- how each legendary OWNS its arena: a movement archetype that makes
// every fight look and feel different — not every boss looms large up top.
// 'anchor' = the classic high patrol; the rest are read by the boss patrol
// switch in update.js (and 'bastion'/'perimeter' also reshape its base fire).
const BOSS_STYLE = {
  150: 'anchor',     // Mewtwo: still, imperious — teleports do the moving
  249: 'infinity',   // Lugia: a wide figure-eight through mid-air
  384: 'serpent',    // Rayquaza: threads a long wave across the whole width
  483: 'bastion',    // Dialga: locked in the arena's heart, clockwork fire
  644: 'flank',      // Zekrom: slams between the left and right flanks
  717: 'swoop',      // Yveltal: corner-to-corner predator dives along a V
  792: 'phase',      // Lunala: dreamlike lissajous glide between moons
  890: 'perimeter',  // Eternatus: rides the top rim end to end, raining bombs
  1007: 'charge',    // Koraidon: tears back and forth at full sprint
};

const BOSS_PROJECTILE_KIND = Object.freeze({
  // Kanto — birds / Mewtwo / Mew
  144: 'crystal', 145: 'needle', 146: 'ember', 150: 'prism', 151: 'bubble',
  // Johto — beasts / Lugia / Celebi
  243: 'needle', 244: 'ember', 245: 'droplet', 249: 'aeroring', 251: 'seed',
  // Hoenn — Regis / Rayquaza / Jirachi
  377: 'boulder', 378: 'crystal', 379: 'lance', 384: 'comet', 385: 'star',
  // Sinnoh — lake trio / Dialga / Darkrai
  480: 'ring', 481: 'ribbon', 482: 'prism', 483: 'time', 491: 'wisp',
  // Unova — swords / Zekrom / Victini
  638: 'lance', 639: 'boulder', 640: 'leaf', 644: 'needle', 494: 'ember',
  // Kalos
  718: 'hex', 717: 'feather', 719: 'crystal',
  // Alola — Tapus / Lunala / Marshadow
  785: 'needle', 786: 'ring', 787: 'seed', 792: 'crescent', 802: 'fist',
  // Galar — new Regis / Glastrier / Eternatus / Zarude
  894: 'needle', 895: 'comet', 896: 'snowball', 890: 'toxic', 893: 'vine',
  // Paldea — treasures / Koraidon / Pecharunt
  1001: 'tablet', 1002: 'crystal', 1003: 'shock', 1007: 'sunwheel', 1025: 'mochi',
});

const LEGENDARY_ENTRANCE_STYLES = {
  150: 'psybreak', 249: 'maelstrom', 384: 'skycoil', 483: 'timesplit', 644: 'thunderhead',
  717: 'blackwing', 792: 'moonrise', 890: 'voidcrown', 1007: 'suncharge',
};
const MYTHIC_ENTRANCE_STYLES = {
  151: 'wishgate', 251: 'timebloom', 385: 'starfall', 491: 'nightmare', 494: 'victorflare',
  719: 'diamondbirth', 802: 'shadowstep', 893: 'junglecall', 1025: 'toxicmask',
};
const MYTHIC_BATTLE_STYLES = {
  151: 'orbit', 251: 'flutter', 385: 'starfall', 491: 'ambush', 494: 'burst',
  719: 'crystal', 802: 'brawler', 893: 'vine', 1025: 'trick',
};
const MYTHIC_ABILITIES = {
  151: { name: 'GENESIS HALO', cd: 5.0 }, 251: { name: 'TIME BLOOM', cd: 6.2 },
  385: { name: 'DOOM DESIRE', cd: 6.0 }, 491: { name: 'NIGHT TERROR', cd: 5.6 },
  494: { name: 'VICTORY BURN', cd: 5.2 }, 719: { name: 'DIAMOND STORM', cd: 6.1 },
  802: { name: 'SPECTRAL COMBO', cd: 5.0 }, 893: { name: 'JUNGLE LASH', cd: 5.8 },
  1025: { name: 'POISON PUPPET', cd: 5.4 },
};
const GAUNTLET_ENTRANCE_NAMES = {
  prism: 'PRISM DESCENT', stampede: 'BEAST STAMPEDE', monolith: 'MONOLITH RISE',
  orbit: 'LAKE ORBIT', swords: 'SACRED CROSSING', cocoon: 'COCOON BREACH',
  totem: 'ISLAND RITE', stormfront: 'CROWNED STORM', shrine: 'SHRINE PROCESSION',
  psybreak: 'PSYCHIC BREAK', maelstrom: 'MAELSTROM ASCENT', skycoil: 'SKY COIL',
  timesplit: 'TIME FRACTURE', thunderhead: 'THUNDERHEAD', blackwing: 'BLACK SUN',
  moonrise: 'MOONRISE', voidcrown: 'VOID CROWN', suncharge: 'SUN CHARGE',
  wishgate: 'WISH GATE', timebloom: 'TIME BLOOM', starfall: 'STARFALL',
  nightmare: 'NIGHTMARE STEP', victorflare: 'VICTORY FLARE', diamondbirth: 'DIAMOND BIRTH',
  shadowstep: 'SHADOW STEP', junglecall: 'JUNGLE CALL', toxicmask: 'TOXIC MASQUERADE',
  maxrift: 'MAX RIFT',
};

// names for everything in the rosters — the Pokédex shows them
const NAMES = {
  // iconic starter-partner lines not otherwise in the wave rosters
  12:'Butterfree',18:'Pidgeot',32:'Nidoran',33:'Nidorino',34:'Nidoking',63:'Abra',66:'Machop',
  81:'Magnemite',82:'Magneton',111:'Rhyhorn',112:'Rhydon',137:'Porygon',147:'Dratini',148:'Dragonair',
  175:'Togepi',233:'Porygon2',365:'Walrein',464:'Rhyperior',474:'Porygon-Z',
  243:'Raikou',244:'Entei',245:'Suicune',251:'Celebi',377:'Regirock',378:'Regice',379:'Registeel',385:'Jirachi',480:'Uxie',481:'Mesprit',482:'Azelf',491:'Darkrai',494:'Victini',638:'Cobalion',639:'Terrakion',640:'Virizion',718:'Zygarde',719:'Diancie',785:'Tapu Koko',786:'Tapu Lele',787:'Tapu Bulu',802:'Marshadow',893:'Zarude',894:'Regieleki',895:'Regidrago',896:'Glastrier',1001:'Wo-Chien',1002:'Chien-Pao',1003:'Ting-Lu',1025:'Pecharunt',
  1:'Bulbasaur',2:'Ivysaur',3:'Venusaur',4:'Charmander',5:'Charmeleon',6:'Charizard',7:'Squirtle',8:'Wartortle',9:'Blastoise',10:'Caterpie',
  16:'Pidgey',17:'Pidgeotto',19:'Rattata',23:'Ekans',24:'Arbok',25:'Pikachu',26:'Raichu',35:'Clefairy',36:'Clefable',39:'Jigglypuff',41:'Zubat',43:'Oddish',52:'Meowth',53:'Persian',54:'Psyduck',60:'Poliwag',
  61:'Poliwhirl',64:'Kadabra',65:'Alakazam',67:'Machoke',68:'Machamp',74:'Geodude',75:'Graveler',92:'Gastly',93:'Haunter',94:'Gengar',109:'Koffing',110:'Weezing',
  129:'Magikarp',130:'Gyarados',132:'Ditto',133:'Eevee',143:'Snorlax',144:'Articuno',145:'Zapdos',146:'Moltres',149:'Dragonite',150:'Mewtwo',151:'Mew',
  152:'Chikorita',153:'Bayleef',154:'Meganium',155:'Cyndaquil',156:'Quilava',157:'Typhlosion',158:'Totodile',159:'Croconaw',160:'Feraligatr',
  161:'Sentret',163:'Hoothoot',167:'Spinarak',169:'Crobat',176:'Togetic',179:'Mareep',180:'Flaaffy',181:'Ampharos',183:'Marill',187:'Hoppip',
  194:'Wooper',196:'Espeon',197:'Umbreon',198:'Murkrow',209:'Snubbull',210:'Granbull',212:'Scizor',214:'Heracross',218:'Slugma',220:'Swinub',
  227:'Skarmory',228:'Houndour',229:'Houndoom',230:'Kingdra',231:'Phanpy',232:'Donphan',246:'Larvitar',247:'Pupitar',248:'Tyranitar',249:'Lugia',
  252:'Treecko',253:'Grovyle',254:'Sceptile',255:'Torchic',256:'Combusken',257:'Blaziken',258:'Mudkip',259:'Marshtomp',260:'Swampert',
  261:'Poochyena',263:'Zigzagoon',265:'Wurmple',278:'Wingull',280:'Ralts',281:'Kirlia',282:'Gardevoir',285:'Shroomish',286:'Breloom',
  287:'Slakoth',300:'Skitty',304:'Aron',305:'Lairon',306:'Aggron',309:'Electrike',310:'Manectric',322:'Numel',323:'Camerupt',330:'Flygon',
  334:'Altaria',350:'Milotic',359:'Absol',363:'Spheal',364:'Sealeo',371:'Bagon',372:'Shelgon',373:'Salamence',376:'Metagross',384:'Rayquaza',
  387:'Turtwig',388:'Grotle',389:'Torterra',390:'Chimchar',391:'Monferno',392:'Infernape',393:'Piplup',394:'Prinplup',395:'Empoleon',
  396:'Starly',397:'Staravia',398:'Staraptor',399:'Bidoof',403:'Shinx',404:'Luxio',405:'Luxray',406:'Budew',407:'Roserade',418:'Buizel',
  426:'Drifblim',427:'Buneary',428:'Lopunny',431:'Glameow',434:'Stunky',436:'Bronzor',444:'Gabite',445:'Garchomp',447:'Riolu',448:'Lucario',
  449:'Hippopotas',453:'Croagunk',454:'Toxicroak',459:'Snover',461:'Weavile',462:'Magnezone',466:'Electivire',468:'Togekiss',473:'Mamoswine',483:'Dialga',
  495:'Snivy',496:'Servine',497:'Serperior',498:'Tepig',499:'Pignite',500:'Emboar',501:'Oshawott',502:'Dewott',503:'Samurott',504:'Patrat',
  506:'Lillipup',507:'Herdier',509:'Purrloin',519:'Pidove',522:'Blitzle',523:'Zebstrika',524:'Roggenrola',525:'Boldore',527:'Woobat',
  530:'Excadrill',534:'Conkeldurr',543:'Venipede',551:'Sandile',552:'Krokorok',553:'Krookodile',570:'Zorua',571:'Zoroark',572:'Minccino',
  607:'Litwick',608:'Lampent',609:'Chandelure',610:'Axew',611:'Fraxure',612:'Haxorus',625:'Bisharp',628:'Braviary',635:'Hydreigon',637:'Volcarona',644:'Zekrom',
  650:'Chespin',651:'Quilladin',652:'Chesnaught',653:'Fennekin',654:'Braixen',655:'Delphox',656:'Froakie',657:'Frogadier',658:'Greninja',
  659:'Bunnelby',661:'Fletchling',662:'Fletchinder',663:'Talonflame',664:'Scatterbug',667:'Litleo',669:'Flabébé',671:'Florges',672:'Skiddo',
  674:'Pancham',675:'Pangoro',677:'Espurr',679:'Honedge',680:'Doublade',681:'Aegislash',686:'Inkay',694:'Helioptile',695:'Heliolisk',
  697:'Tyrantrum',700:'Sylveon',701:'Hawlucha',705:'Sliggoo',706:'Goodra',708:'Phantump',709:'Trevenant',712:'Bergmite',713:'Avalugg',715:'Noivern',717:'Yveltal',
  722:'Rowlet',723:'Dartrix',724:'Decidueye',725:'Litten',726:'Torracat',727:'Incineroar',728:'Popplio',729:'Brionne',730:'Primarina',
  731:'Pikipek',734:'Yungoos',736:'Grubbin',737:'Charjabug',738:'Vikavolt',741:'Oricorio',744:'Rockruff',745:'Lycanroc',748:'Toxapex',
  750:'Mudsdale',755:'Morelull',758:'Salazzle',760:'Bewear',761:'Bounsweet',762:'Steenee',763:'Tsareena',764:'Comfey',767:'Wimpod',
  768:'Golisopod',769:'Sandygast',770:'Palossand',775:'Komala',777:'Togedemaru',778:'Mimikyu',779:'Bruxish',781:'Dhelmise',782:'Jangmo-o',
  783:'Hakamo-o',784:'Kommo-o',792:'Lunala',
  810:'Grookey',811:'Thwackey',812:'Rillaboom',813:'Scorbunny',814:'Raboot',815:'Cinderace',816:'Sobble',817:'Drizzile',818:'Inteleon',
  819:'Skwovet',821:'Rookidee',822:'Corvisquire',823:'Corviknight',824:'Blipbug',825:'Dottler',827:'Nickit',831:'Wooloo',835:'Yamper',
  836:'Boltund',837:'Rolycoly',838:'Carkol',839:'Coalossal',840:'Applin',841:'Flapple',843:'Silicobra',844:'Sandaconda',849:'Toxtricity',
  856:'Hatenna',857:'Hattrem',858:'Hatterene',859:'Impidimp',860:'Morgrem',861:'Grimmsnarl',868:'Milcery',869:'Alcremie',872:'Snom',
  879:'Copperajah',887:'Dragapult',890:'Eternatus',
  906:'Sprigatito',907:'Floragato',908:'Meowscarada',909:'Fuecoco',910:'Crocalor',911:'Skeledirge',912:'Quaxly',913:'Quaxwell',914:'Quaquaval',
  915:'Lechonk',917:'Tarountula',919:'Nymble',921:'Pawmi',922:'Pawmo',923:'Pawmot',926:'Fidough',928:'Smoliv',932:'Nacli',933:'Naclstack',
  934:'Garganacl',935:'Charcadet',936:'Armarouge',937:'Ceruledge',940:'Wattrel',957:'Tinkatink',958:'Tinkatuff',959:'Tinkaton',970:'Glimmora',
  971:'Greavard',972:'Houndstone',978:'Tatsugiri',979:'Annihilape',980:'Clodsire',983:'Kingambit',996:'Frigibax',997:'Arctibax',998:'Baxcalibur',
  1000:'Gholdengo',1007:'Koraidon',
};

// sprites live in the repo (assets/sprites/, fetched by tools/fetch-sprites.js);
// if a file is missing we fall back to PokeAPI's hosted artwork. shinies are
// rare jackpot moments, so those stay remote rather than doubling the repo.
const SPRITE_REMOTE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
const MEW_VMAX_IMG = new Image();
MEW_VMAX_IMG.src = 'assets/sprites/mew-vmax.png';

// Persistent research rewards turn the collection into useful progression.
// They are deliberately modest: a new player still gets the intended run,
// while long-term catches create visible, mode-agnostic advantages.
const DEX_REWARDS = [
  { at: 10,  key: 'fieldKit', name: 'FIELD KIT',    icon: 'shield', color: '#66bb6a', desc: 'NEW JOURNEYS START WITH 1 SHIELD' },
  { at: 35,  key: 'lucky',    name: 'LUCKY CHARM',  icon: 'pokeball', color: '#ef5350', desc: '+25% CHANCE TO FIND NEW POKÉMON' },
  { at: 75,  key: 'megaSpark',name: 'MEGA SPARK',   icon: 'mega', color: '#ab47bc', desc: 'NEW JOURNEYS START 25% MEGA CHARGED' },
  { at: 150, key: 'veteran',  name: 'VETERAN BADGE',icon: 'heart', color: '#ff8a65', desc: 'NEW JOURNEYS START WITH +1 LIFE' },
  { at: 250, key: 'shinyCharm', name: 'SHINY CHARM', icon: 'fairy', color: '#ffd700', desc: 'SHINY POKÉMON APPEAR TWICE AS OFTEN' },
];

// ============================================================
// STAGE MASTERY OBJECTIVES (Milestone 1) — evaluated at stage clear from
// the balance ledger (the cleared level's stats record L), shown on the
// results interstitial, and persisted as medals in pkbrk-medals (real
// journeys only — trials/dailies/cheated runs display but never save).
// Kanto ('0:x') is fully authored as the gold-standard slice; every other
// stage inherits the per-stage-type defaults until its own polish pass.
// check(L) receives the stats record; ace objectives are the ★ stretch.
// ============================================================
const STAGE_OBJECTIVE_SETS = {
  '0:0': [
    { key: 'firstflight', name: 'FIRST FLIGHT', desc: 'CLEAR WITHOUT TAKING A HIT',
      check: L => Object.values(L.dmgInBy).reduce((a, b) => a + b, 0) === 0 },
    { key: 'flockbreak', name: 'FLOCK BREAKER', desc: 'DEFEAT 12 WILD POKÉMON', check: L => L.kills >= 12 },
    { key: 'swiftwings', name: 'SWIFT WINGS', desc: 'CLEAR IN UNDER 75 SECONDS', ace: true,
      check: L => L.t > 0 && L.t < 75 },
  ],
  '0:1': [
    { key: 'shellbreak', name: 'SHELL BREAKER', desc: 'CRACK ARMOR WITH A CHARGED SHOT',
      check: L => (L.shellCracks || 0) > 0 },
    { key: 'coolhands', name: 'COOL HANDS', desc: 'CLEAR WITHOUT OVERHEATING', check: L => L.overheats === 0 },
    { key: 'interceptor', name: 'INTERCEPTOR', desc: 'SHOOT DOWN 6 ENEMY SHOTS', ace: true,
      check: L => (L.intercepts || 0) >= 6 },
  ],
  '0:2': [
    { key: 'kantolegend', name: 'KANTO LEGEND', desc: 'WIN THE GAUNTLET WITHOUT A KNOCKOUT',
      check: L => !L.knockout },
    { key: 'psydancer', name: 'PSYCHIC DANCER', desc: 'TAKE NO HITS IN THE GAUNTLET', ace: true,
      check: L => Object.values(L.dmgInBy).reduce((a, b) => a + b, 0) === 0 },
  ],
};

// ---- REGION INTROS: the arrival beat for each region's first stage — a
// short hero card, not a cutscene. Kanto's is the authored template.
const REGION_INTROS = [
  { title: 'KANTO', tag: 'WHERE EVERY JOURNEY BEGINS', sub: 'BRIGHT ROUTES · FIRST RIVALS · AN OLD LEGEND STIRRING' },
  { title: 'JOHTO', tag: 'TRADITION IN THE TWILIGHT', sub: 'BELL TOWERS · GUARDIAN BEASTS · THE SEA CALLS' },
  { title: 'HOENN', tag: 'LAND, SEA, AND SKY', sub: 'TROPICAL SQUALLS · ANCIENT TITANS · A DRAGON ABOVE ALL' },
  { title: 'SINNOH', tag: 'MYTHS OF TIME AND SPACE', sub: 'COLD PEAKS · LAKE SPIRITS · TIME ITSELF FIGHTS BACK' },
  { title: 'UNOVA', tag: 'IDEALS AGAINST TRUTH', sub: 'CITY LIGHTS · STORM WINGS · THE BLACK LIGHTNING' },
  { title: 'KALOS', tag: 'BEAUTY AND OBLIVION', sub: 'RADIANT SKIES · MIRROR FORESTS · THE WINGS OF RUIN' },
  { title: 'ALOLA', tag: 'ISLANDS OF THE GUARDIANS', sub: 'WARM TRADE WINDS · ISLAND TRIALS · THE MOON BECKONS' },
  { title: 'GALAR', tag: 'THE DARKEST DAY LOOMS', sub: 'INDUSTRIAL SPRAWL · GIGANTIC SHADOWS · ETERNITY WAITS' },
  { title: 'PALDEA', tag: 'THE FINAL FRONTIER', sub: 'CRYSTAL BADLANDS · PARADOX BEASTS · THE JOURNEY\'S END' },
];

// ---- STAGE FLAVOR (Milestone 1 Round D): one line of expedition narrative
// per stage, read aloud on the results screen — the campaign's "flight log"
// voice. Never interrupts play; absent entries simply render nothing.
// Kanto is authored (the vertical slice); other regions join in their
// polish pass (Milestone 9).
const STAGE_FLAVOR = {
  '0:0': '"THE PIDGEY FLOCKS SCATTER AT YOUR ENGINE WASH. SOMETHING HAS THEM SPOOKED."  — FLIGHT LOG, DAY 1',
  '0:1': '"ARMORED SHELLS ON ROOKIE WILDS? SOMEONE IS ORGANIZING THEM."  — FLIGHT LOG, DAY 2',
  '0:2': '"THE GENETIC POKÉMON WITHDRAWS TO THE EAST. THE BELL TOWERS OF JOHTO ARE RINGING."  — FLIGHT LOG, DAY 3',
  '1:0': '"THE BELLS RANG BEFORE I CROSSED THE RIDGE. THE MONKS KNEW I WAS COMING."  — FLIGHT LOG, DAY 4',
  '1:1': '"THE THREE BEASTS RUN AHEAD OF THE STORM, NOT FROM IT. TESTING ME, I THINK."  — FLIGHT LOG, DAY 5',
  '1:2': '"THE GUARDIAN OF THE SEAS BOWED AND DOVE. THE TRADE WINDS SMELL OF HOENN SALT."  — FLIGHT LOG, DAY 6',
  '2:0': '"SQUALL AFTER SQUALL, AND WINGULL RIDING EVERY ONE. THE SEA HERE HAS MOODS."  — FLIGHT LOG, DAY 7',
  '2:1': '"A WHOLE MIGRATION CROSSED MY LANE TODAY. YOU DON\'T FIGHT WEATHER. YOU OUTLAST IT."  — FLIGHT LOG, DAY 8',
  '2:2': '"THE SKY SERPENT UNCOILED FROM THE OZONE. AFTER THAT, MOUNTAINS SOUND RESTFUL."  — FLIGHT LOG, DAY 9',
  '3:0': '"COLD THINS THE AIR AND THE ENGINE COMPLAINS. A SMALL TRAVELER NEEDED A WING TODAY."  — FLIGHT LOG, DAY 10',
  '3:1': '"CORONET\'S SHADOW CROSSES HALF THE REGION. THE LAKES WATCH ME LIKE THREE OPEN EYES."  — FLIGHT LOG, DAY 11',
  '3:2': '"TIME HICCUPPED. MY CLOCK AND MY HEART DISAGREE BY A DAY. UNOVA\'S LIGHTS AHEAD."  — FLIGHT LOG, DAY 12',
  '4:0': '"A CITY THAT NEVER LOOKS UP. THE FLOCKS HERE FLY BETWEEN BUILDINGS, NOT OVER THEM."  — FLIGHT LOG, DAY 13',
  '4:1': '"RUSH HOUR ON THE SKYWAY. EVERY LANE CONTESTED, EVERY HORN ELECTRIC."  — FLIGHT LOG, DAY 14',
  '4:2': '"THE BLACK LIGHTNING ASKED WHAT I BELIEVE. I SHOWED IT. WEST TO KALOS."  — FLIGHT LOG, DAY 15',
  '5:0': '"GARDENS BELOW, MIRRORS ABOVE. EVEN THE AMBUSHES HERE ARE BEAUTIFUL."  — FLIGHT LOG, DAY 16',
  '5:1': '"HELD THE RELAY WHILE THE SWARM SPLIT ITS AIM. GUARD DUTY SHARPENS THE HANDS."  — FLIGHT LOG, DAY 17',
  '5:2': '"THE WING OF RUIN CAST NO SHADOW GOING DOWN. ISLANDS SING ON THE LONG BAND."  — FLIGHT LOG, DAY 18',
  '6:0': '"WARM WIND, OPEN THROTTLE, AND SOMEONE LEFT FRUIT ON MY WING AT THE LAST STOP."  — FLIGHT LOG, DAY 19',
  '6:1': '"THE TOTEMS MARKED MY PATH IN FLOWERS AND WARNING CALLS. TRIALS ARE POLITE HERE."  — FLIGHT LOG, DAY 20',
  '6:2': '"THE MOONE POKÉMON FOLDED INTO THE DARK BETWEEN STARS. GALAR\'S CHIMNEYS ON THE HORIZON."  — FLIGHT LOG, DAY 21',
  '7:0': '"EVERY TOWN HERE HAS A PITCH AND A CROWD. THEY CHEER FOR GOOD DODGES. I OBLIGE."  — FLIGHT LOG, DAY 22',
  '7:1': '"STADIUM LIGHTS AT MIDNIGHT. THE DARKEST DAY ISN\'T A STORY HERE — IT\'S A FORECAST."  — FLIGHT LOG, DAY 23',
  '7:2': '"ETERNITY BLINKED. THE CROWD WENT HOME HAPPY. ONE ROAD LEFT — SOUTH TO PALDEA."  — FLIGHT LOG, DAY 24',
  '8:0': '"CRYSTAL IN THE BADLANDS, AND WILDS THAT DON\'T MATCH ANY FIELD GUIDE I OWN."  — FLIGHT LOG, DAY 25',
  '8:1': '"PAST AND FUTURE HUNT IN THE SAME CANYON HERE. MY SHADOW FLEW AHEAD OF ME TWICE."  — FLIGHT LOG, DAY 26',
  '8:2': '"THE WINGED KING FELL AND THE SKY HELD ITS BREATH. NINE REGIONS. ONE DAWN LEFT."  — FLIGHT LOG, DAY 27',
};

// OBJECTIVE FAMILIES (Milestone 3 Round B) — a stage may declare a live
// in-wave OBJECTIVE that changes HOW you clear it, not just what you shoot.
// `survive`: you cannot clear by attrition — a migration swarm keeps coming;
// outlast the timer and the flock disperses (controller: updateObjective,
// update.js; HUD: drawObjectiveBanner, render.js). Keyed region:stage,
// junkie non-boss stages only. More families (escort/capture/…) join later.
const ENCOUNTER_OBJECTIVES = {
  '2:1': { type: 'survive', dur: 22, name: 'SURVIVE THE MIGRATION',
    tip: "OUTLAST THE SWARM — YOU DON'T HAVE TO KILL THEM ALL" },
  // ESCORT (Sinnoh arrival): a friendly TOGEPI crosses the combat zone
  // bottom→top while the swarm hunts it. Get it to the far edge (path
  // completion, ~20s) and the flock disperses. Fainting = objective failed.
  '3:0': { type: 'escort', name: 'ESCORT THE TRAVELER', species: 175, speciesT: 'fairy', path: 'cross',
    tip: 'GET THE TRAVELER ACROSS — INTERCEPT THE FIRE AIMED AT IT' },
  // DEFEND (Kalos challenge): a stationary PORYGON relay must survive a 22s
  // timer while the swarm splits aimed fire between you and it.
  '5:1': { type: 'defend', dur: 22, name: 'DEFEND THE RELAY', species: 137, speciesT: 'normal', path: 'hold',
    tip: 'KEEP THE RELAY ALIVE — SHOOT DOWN THE FIRE AIMED AT IT' },
};

// ============================================================
// SKIN ASSEMBLY (Round S1) — attach every presentation/world table to the
// pokemon skin BY REFERENCE (zero copies, bit-identical), then default-fill
// other skins so a stub skin is complete. See js/skin.js for the registry.
// Engine tables (EFFECTIVE/RESIST, SHOT_CLASSES, TYPE_PROJECTILE_KIND,
// PATHS/STACK_ITEMS, MODIFIERS, STAGE_OBJECTIVE_SETS…) stay global.
// ============================================================
assembleSkins({
  names: NAMES, gens: GENS, habitatPacks: HABITAT_PACKS, typeClusters: TYPE_CLUSTERS,
  starterMon: STARTER_MON, regionIntros: REGION_INTROS, stageFlavor: STAGE_FLAVOR,
  stageNames: STAGE_NAMES, acts: ACTS, junkieItems: JUNKIE_ITEMS,
  dexRewards: DEX_REWARDS, cheatItems: CHEAT_ITEMS,
  gauntletEntranceNames: GAUNTLET_ENTRANCE_NAMES,
  bossAbilities: BOSS_ABILITIES, bossChannels: BOSS_CHANNELS, bossStyle: BOSS_STYLE,
  bossProjectileKind: BOSS_PROJECTILE_KIND, mythicAbilities: MYTHIC_ABILITIES,
  mythicEntranceStyles: MYTHIC_ENTRANCE_STYLES, mythicBattleStyles: MYTHIC_BATTLE_STYLES,
  legendaryEntranceStyles: LEGENDARY_ENTRANCE_STYLES,
  sentinelEntranceStyles: SENTINEL_ENTRANCE_STYLES,
  motionById: MOTION_BY_ID, encounterObjectives: ENCOUNTER_OBJECTIVES,
  sprite: getSprite,
  // the Kanto bonus-flock species + reward copy (an id + strings, so the
  // beat itself stays engine — see spawnBonusFlock, update.js)
  bonusFlock: { id: 16, t: 'flying', name: 'BONUS FLOCK!',
    sub: 'SWIFT AND HARMLESS — CHAIN THEM FOR REWARDS' },
  stageObjectiveSets: STAGE_OBJECTIVE_SETS,
  // the partner screen's three shelves of six (matches starterOrder rows)
  rosterGroups: [
    { n: 'THE CLASSICS', color: '#ffd54f' },
    { n: 'WILD & FIERCE', color: '#ef5350' },
    { n: 'MYSTICS & TITANS', color: '#b388ff' },
  ],
  // display strings engine code reads through SKIN.strings — the pokemon
  // values ARE the historical literals (bit-identity is the contract)
  strings: {
    creature: 'POKÉMON', creatures: 'POKÉMON',
    dexName: 'POKÉDEX', dexGlyph: 'pokeball', dexChar: '◓',
    catchItem: 'POKÉ BALL',
    researched: ' POKÉMON RESEARCHED',
    newEntry: 'NEW! ADDED TO YOUR POKÉDEX · +100 PTS',
    dupEntry: 'ALREADY IN YOUR POKÉDEX · +250 PTS',
    shinyBang: 'SHINY POKÉMON!', shinyTag: 'SHINY',
    shinyDrop: '+500 · GUARANTEED POKÉBALL DROP',
    follows: 'YOUR POKÉMON FOLLOWS',
    evolvesIn: 'EVOLVES IN REGIONS 4 AND 7',
    evolvingLine: from => 'WHAT? ' + from + ' IS EVOLVING!',
    endingTitle: 'THE NINEFOLD DAWN',
    quickHint: 'POKÉMON FLIGHT SHOOTER · 27-STAGE CAMPAIGN',
    healName: 'MAX POTION',
    riftDesc: 'ONE OF THREE PIECES THAT REWRITES KANTO\'S FINAL ROUND',
    partnerWord: 'PARTNER',
    regionWord: 'REGION',
  },
  // the rift-secret encounter species + copy (engine flow reads SKIN.secret)
  secret: { id: 151, t: 'psychic', name: 'MEW VMAX',
    breaking: 'SECRET ROUND · MEW VMAX IS BREAKING THROUGH',
    announce: 'RIFT BREACH · MEW VMAX!',
    announceSub: 'SECRET ROUND · 3 PHASES — THE NORMAL MEW FIGHT HAS BEEN REPLACED',
    replaced: 'THE NORMAL MEW ROUND HAS BEEN REPLACED',
    hint1: 'A SECOND PIECE IS HIDDEN IN KANTO\'S CHALLENGE',
    hint2: 'THE LAST PIECE RESTS BEYOND MEWTWO',
    // the shard COURIER (shooter modes): a swift crosser that carries each
    // piece across the field once — shoot it down or the shard is gone.
    // Abra: it teleports away if it makes the far edge.
    courier: { id: 63, t: 'psychic', name: 'ABRA' } },
});
// warm the first two regions — pokemon only (PNG loads); procedural skins
// bake on demand and must never touch the network
if (SKIN.id === 'pokemon') { preloadGen(SKIN.gens[0]); preloadGen(SKIN.gens[1]); }
