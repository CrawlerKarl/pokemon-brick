'use strict';
// ============================================================
//  GAME STATE
// ============================================================
const MEGA_DUR = 5;      // Mega Evolution duration in seconds
// skill-tree-aware caps (capstones raise them)
function shieldCap() { return 3 + 2 * upgN('bulwark'); }
function megaDur() { return (upgN('megaX') ? 9 : upgN('blaze') ? 7 : MEGA_DUR) + starterMod('megaDur', 0); }
function starterTierValue(key, tier) {
  const value = STARTER_MON[G.starter]?.mods?.[key];
  if (value == null) return 0;
  return Array.isArray(value) ? (value[Math.max(0, Math.min(value.length - 1, tier - 1))] || 0) : value;
}
function applyStarterTierUpgrade(fromTier, toTier) {
  const hpGain = Math.max(0, starterTierValue('bonusHp', toTier) - starterTierValue('bonusHp', fromTier));
  if (hpGain) { G.lives += hpGain; G.livesMax += hpGain; }
  const shieldGain = Math.max(0, starterTierValue('shieldStart', toTier) - starterTierValue('shieldStart', fromTier));
  if (shieldGain) G.shieldCharges = Math.min(shieldCap(), G.shieldCharges + shieldGain);
  const megaFloor = starterTierValue('megaStart', toTier);
  if (megaFloor) G.mega = Math.max(G.mega, megaFloor);
}
function barrierCharges() {
  // Kanto's first two classic walls are the learn-to-aim beats: one safety-net
  // return keeps the rally mechanic visible without letting the ball play an
  // extended possession above the wall. The full two-charge barrier begins at
  // the first boss and remains unchanged for the rest of the journey.
  const openingClassic = G.mode === 'classic' && G.level <= 2;
  return (openingClassic ? 1 : 2) + (upgN('rally') ? 1 : 0)
    + (G.mode === 'classic' && upgN('intercept') ? 1 : 0);
}
const OVERHEAT_DUR = 2.0; // blaster lockout after overheating, in seconds
// The perfect-release sweet spot: seconds after a charge tops out during
// which releasing fires the RESONANT shot (Milestone 2). Wide enough to hit
// on purpose on touch, narrow enough to stay a timing skill.
const RESONANCE_WINDOW = 0.38;
// ---- STARFIGHTER pilots: in junkie mode your starter IS the ship. Flying
// without a partner uses a neutral training drone. The attack's SHAPE follows the pilot's
// species; its COLOR + type follow the CURRENT element, so a Charmeleon
// riding a grass element shoots green fire.
const PILOT_NONE = { ids: [0, 0, 0], names: ['TRAINING DRONE', 'TRAINING DRONE', 'TRAINING DRONE'] };
function pilotInfo() {
  const sm = STARTER_MON[G.starter];
  if (sm) {
    // every type FAMILY has a signature attack silhouette (drawTypedBolt,
    // render.js) — the shape follows the pilot's species, the color follows
    // the current element, and the whole attack grows at partner tiers II/III
    const shapes = {
      fire: 'flame', dragon: 'draco', fighting: 'fist',
      water: 'aqua', ice: 'shard', steel: 'gear',
      grass: 'leaf', bug: 'sting', poison: 'venom',
      ground: 'quake', rock: 'quake', flying: 'gale',
      normal: 'pixel', psychic: 'psy', fairy: 'star',
      ghost: 'wisp', dark: 'claw',
    };
    return { id: sm.ids[G.starterLvl - 1], t: G.starter, shape: shapes[G.starter] || 'volt' };
  }
  return { id: 0, t: 'normal', shape: 'volt' };
}
function attackElement() { return G.ballElement || pilotInfo().t; }
// the player's current DEFENSIVE type — how effective an enemy's typed attack
// is against US. Junkie: the pilot's live element. Paddle modes: the ball's
// element, else the starter's innate type (no starter → typeless, all neutral).
function playerType() {
  if (G.mode === 'junkie') return attackElement();
  if (G.ballElement) return G.ballElement;
  return (G.starter && G.starter !== 'none') ? G.starter : null;
}
// +1 super-effective vs the player, -1 the player resists, 0 neutral/typeless
function shotEffect(shotType) {
  const pt = playerType();
  if (!shotType || !pt) return 0;
  if ((EFFECTIVE[shotType] || []).includes(pt)) return 1;
  if ((RESIST[shotType] || []).includes(pt)) return -1;
  return 0;
}
// SPACE JUNKIE: the ship's vertical position — everywhere the game asks
// "where is the player", it should ask shipY(), which simply equals the
// paddle line outside junkie mode. The band gives ~120px of vertical flight.
const SHIP_BAND = 120;
function shipY() { return G.mode === 'junkie' ? G.shipYv : PADDLE_Y(); }
// ---- REGION CHECKPOINTS: 27 stages is a long arcade run, so the run is
// saved at every region's doorstep. CONTINUE on the title screen resumes it;
// knockouts and true game-over retain the latest checkpoint. Trial runs never save.
// Checkpoint schema v3 (the upgrade-web era). v1 and v2 checkpoints remain
// accepted forever: migrateCheckpoint normalizes ANY prior version into v3
// and must NEVER throw — a malformed save that slipped past loadStore cannot
// be allowed to brick startup. The 24 legacy tier keys re-derive from path
// levels (the single source of truth); additive web keys (bridges /
// superskills) carry over verbatim. GRANDFATHER RULE: a web node whose
// prerequisites are missing is KEPT — never erase a player's run.
function migrateCheckpoint(c) {
  try {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    if (!(c.v >= 1 && c.v <= 3) || !(+c.lvl >= 4)) return null;
    const path = {};
    for (const k of PATH_KEYS) {
      const n = Math.max(0, Math.min(4, Math.floor(+((c.path || {})[k]) || 0)));
      if (n) path[k] = n;
    }
    const upg = {};
    for (const k of Object.keys(path)) for (let t = 0; t < path[k]; t++) upg[PATHS[k].tiers[t].key] = 1;
    for (const k of [...WEB_BRIDGE_KEYS, ...WEB_FUSION_KEYS, ...WEB_APEX_KEYS]) if (c.upg && typeof c.upg === 'object' && c.upg[k]) upg[k] = 1;
    const stacks = { orb: 0, ice: 0, bell: 0 };
    for (const k of Object.keys(stacks)) stacks[k] = Math.max(0, Math.floor(+((c.stacks && typeof c.stacks === 'object' ? c.stacks : {})[k]) || 0));
    const lives = Math.max(1, Math.floor(+c.lives) || 1);
    return {
      v: 3, lvl: Math.floor(+c.lvl), score: Math.max(0, Math.floor(+c.score) || 0),
      lives, livesMax: Math.max(lives, Math.floor(+c.livesMax) || 0),
      mode: typeof c.mode === 'string' ? c.mode : 'junkie',
      starter: typeof c.starter === 'string' ? c.starter : null,
      starterLvl: Math.max(1, Math.min(3, Math.floor(+c.starterLvl) || 1)),
      path, upg, stacks,
      catchBonus: Math.max(0, +c.catchBonus || 0), caughtRun: Math.max(0, Math.floor(+c.caughtRun) || 0),
      adapt: +c.adapt > 0 ? +c.adapt : 1, mega: Math.max(0, Math.min(1, +c.mega || 0)),
      secret: {
        shards: Array.from({ length: 3 }, (_, i) => !!(c.secret && c.secret.shards && c.secret.shards[i])),
        offered: Array.from({ length: 3 }, (_, i) => !!(c.secret && c.secret.offered && c.secret.offered[i])),
        completed: !!(c.secret && c.secret.completed),
      },
      secretUpg: {
        heart: !!(c.secretUpg && c.secretUpg.heart),
        lens: !!(c.secretUpg && c.secretUpg.lens),
        echo: !!(c.secretUpg && c.secretUpg.echo),
      },
      preset: typeof c.preset === 'string' ? c.preset : SETTINGS.preset,
    };
  } catch (e) { return null; }
}
let RUN_CKPT = migrateCheckpoint(loadStore('pkbrk-run', 'null'));
function saveCheckpoint() {
  if (G.daily) return;
  RUN_CKPT = {
    v: 3, lvl: G.level, score: G.score, lives: G.lives, livesMax: G.livesMax, mode: G.mode,
    starter: G.starter, starterLvl: G.starterLvl,
    path: { ...G.path }, upg: { ...G.upg }, stacks: { ...G.stacks },
    catchBonus: G.catchBonus, caughtRun: G.caughtRun, adapt: G.adapt,
    mega: G.mega,
    secret: { shards: G.secret.shards.slice(), offered: G.secret.offered.slice(), completed: !!G.secret.completed },
    secretUpg: { ...G.secretUpg },
    preset: SETTINGS.preset,
  };
  saveStore('pkbrk-run', RUN_CKPT);
}
function clearCheckpoint() { RUN_CKPT = null; saveStore('pkbrk-run', null); }
let DAILY_RECORDS = (v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {})(loadStore('pkbrk-daily', '{}'));
function dailyBest() { return Math.max(0, +(DAILY_RECORDS[dailyDateKey()] || 0)); }
function dailyStreak() {
  let d = new Date(), streak = 0;
  // A streak remains alive until the current day ends, so an unfinished
  // challenge still shows the run carried in from yesterday.
  if (!Math.max(0, +(DAILY_RECORDS[dailyDateKey(d)] || 0))) d.setDate(d.getDate() - 1);
  while (Math.max(0, +(DAILY_RECORDS[dailyDateKey(d)] || 0))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function dailyShortDate(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}
function recordDailyScore(score) {
  const key = dailyDateKey(), prior = Math.max(0, +(DAILY_RECORDS[key] || 0));
  if (score > prior) DAILY_RECORDS[key] = score;
  const keys = Object.keys(DAILY_RECORDS).sort().reverse();
  for (const old of keys.slice(30)) delete DAILY_RECORDS[old];
  saveStore('pkbrk-daily', DAILY_RECORDS);
  return score > prior;
}
function dailyShareText() {
  const s = G.runSummary || {};
  return 'WAVEBREAKER DAILY ' + dailyDateKey() + ' · ' + (s.score || G.score) + ' PTS · WAVE ' +
    (s.level || G.level) + ' · ' + (s.bricks || 0) + ' BRICKS · BEST RALLY ' + (s.bestRally || 0);
}
function resumeRun() {
  const c = RUN_CKPT;
  if (!c) return;
  SETTINGS.mode = MODES.some(m => m.key === c.mode) ? c.mode : 'junkie';
  SETTINGS.starter = STARTER_MON[c.starter] ? c.starter : 'none';
  if (PRESETS[c.preset]) SETTINGS.preset = c.preset;
  saveSettings();
  resetRun(c.lvl, false);
  // resetRun granted a random tree for the deep start — overwrite with the
  // REAL run state from the checkpoint
  G.score = c.score; G.lives = Math.max(1, c.lives);
  G.livesMax = Math.max(G.lives, c.livesMax || G.livesMax);
  G.path = { ...c.path }; G.upg = { ...c.upg };
  G.stacks = Object.assign({ orb: 0, ice: 0, bell: 0 }, c.stacks);
  G.catchBonus = c.catchBonus || 0; G.caughtRun = c.caughtRun || 0;
  G.adapt = c.adapt || 1; G.mega = Math.max(G.mega, c.mega || 0);
  G.starterLvl = c.starterLvl || starterStage(c.lvl, G.starter);
  G.lastDraftForm = webForm(); // resume never fakes a fresh-evolution draft
  if (c.secret) {
    G.secret.shards = Array.from({ length: 3 }, (_, i) => !!c.secret.shards?.[i]);
    G.secret.offered = Array.from({ length: 3 }, (_, i) => !!c.secret.offered?.[i] || !!c.secret.shards?.[i]);
    G.secret.completed = !!c.secret.completed;
  }
  G.secretUpg = Object.assign({ heart: false, lens: false, echo: false }, c.secretUpg);
  setAnnounce('swift', '#80d8ff', 'JOURNEY RESUMED',
    genFor(c.lvl).name + ' · WAVE ' + c.lvl + ' — WELCOME BACK', 3,
    'SAVED AT EVERY REGION · GAME OVER CLEARS THE SAVE');
}
function freshSecretState() {
  return {
    shards: [false, false, false], offered: [false, false, false], pendingShard: null,
    vmax: false, rewardDraft: false, deferredChoices: null,
    completed: false, lastReward: null,
    bonusDrafts: 0, // Mew VMAX victory grants this many EXTRA normal drafts
  };
}
function secretEligible() {
  return !G.trial && !G.daily && regionIdx(G.level) === 0 && G.level <= 3;
}
function secretShardCount() { return G.secret.shards.reduce((n, held) => n + (held ? 1 : 0), 0); }
const G = {
  state: 'menu',
  score: 0, best: Math.max(0, +loadStore('pkbrk-best', '0') || 0),
  lives: 3, livesMax: 3, level: 1, combo: 0, // livesMax = ring denominator (peak lives held)
  paddle: { x: 0, w: 130, h: 18, speed: 0, squash: 0 },
  balls: [], bricks: [], powerups: [], lasers: [], missiles: [], enemyShots: [],
  particles: [], floaters: [], fragments: [], ghosts: [], rings: [],
  scoreShown: 0, comboPop: 0, // HUD juice: counting score + combo pop-scale
  announce: null, announceQueue: [], modifier: null, combatNotice: null,
  fx: 0, fy: 0, swayT: 0,
  brickW: 0, brickH: 0,
  shake: 0, flashT: 0, stateT: 0,
  freeze: 0, dramaticT: 0, bossIntro: 0,
  laserCD: 0, blasterCD: 0, missileCD: 0, invuln: 0, seCD: 0,
  enemyShotCD: 6, bossShotCD: 4,
  lastFacetVolley: -1, wallVolleyId: -1, wallVolleyCount: 0,
  time: 0,
  adapt: 1, deathsThisWave: 0,
  mega: 0, megaT: 0,
  shotsFired: 0, playT: 0,
  maxCombo: 0, caughtRun: 0, dropHint: 0, healthDropPity: 0, megaCalloutDone: false, megaWasReady: false,
  rallyHintDone: false, bestRally: 0, barrierHintDone: false, coachStep: 0, jCoach: null,
  highGroundDone: false, waveFirstKill: false, elementOrbCD: 10,
  trial: false, daily: false, runSeed: null,
  runStats: null, runSummary: null, runStartLevel: 1, lastDamageCause: 'MISSED BALL',
  results: null, // stage-results interstitial payload (buildStageResults)
  director: null, // encounter director: the stage's authored beat script (Milestone 3)
  uiTouchPulse: null, shareToast: 0,
  upgradeFx: null, // short install animation after a permanent draft pick
  // starter partner: which one, its ability tier, Torrent's return counter
  starter: null, starterLvl: 1, torrentCount: 0, justEvolved: false,
  starterHits: 0, starterKOs: 0, starterChillT: 0,
  ceremony: null, // act-boundary evolution ceremony (end of Hoenn / Kalos)
  encounter: null, // SPACE JUNKIE choreography: one authored encounter per wave
  ending: null,        // THE NINEFOLD DAWN: campaign-victory sequence state
  guardSwapCD: 8, waveThemeObj: null,
  motionTier: 0, motionStyle: 'march',
  marchDir: 1, divers: false, diveCD: 6, gridCols: 10, pathSpeed: 0.04,
  blocksStatic: false, // boxed bricks are anchored; only the Pokémon move
  mode: 'classic',     // 'classic' (ball) or 'blaster' (ball-less pure shooter)
  charge: 0, chargeCD: 0, // BLASTER mode: hold to charge a heavy shot
  chargeFullT: 0,      // seconds sitting on a FULL charge (resonance/overcharge clock)
  shipYv: 0,           // SPACE JUNKIE: the ship flies vertically in a band
  maneuver: null, maneuverCD: 8, // SPACE JUNKIE: periodic squad maneuvers
  stacks: { orb: 0, ice: 0, bell: 0 }, // SPACE JUNKIE: infinitely-stacking held items
  attackAnim: 0,       // SPACE JUNKIE: pilot lunge/recoil timer on fire
  rerolled: false,     // one draft reroll per upgrade screen
  reinforce: 0,
  muzzle: 0, splashCD: 8, resistStreak: 0, ballElementT: 0,
  ballElement: null,
  fx_fire: null, fx_laser: null, fx_wide: null, fx_slow: null,
  fx_magnet: null, fx_score: null, fx_draco: null,
  shieldCharges: 0,
  shieldFlash: 0, surgeFlash: 0,           // shield bubble flare when a charge absorbs a hit
  hurtHud: 0,               // shows the health bar AROUND the player briefly after a hit
  // blaster heat: firing builds it, paddle returns vent it, 100% = overheat
  heat: 0, overheat: 0,
  upg: {}, path: {}, catchBonus: 0, upgradeChoices: null, clearedStage: 0,
  // ---- upgrade-web runtime (bridges / superskills / offer memory) ----
  calibReturns: 0, calibShots: 0, // CALIBRATED BARRAGE: classic return count / primed volleys left
  lensKills: 0, vortexes: [],     // SINGULARITY LENS + EVENT HORIZON gravity wells
  salvageCount: 0, salvageStored: 0, // SALVAGE DRONES pickup meter + classic stored intercepts
  rescueN: 0,                     // RESCUE CIRCUIT pickup counter (8 → +1 shield)
  reactiveCD: 0,                  // REACTIVE OVERDRIVE shield-regrow cooldown
  reactorUsed: false,             // IMMORTAL REACTOR: once per wave
  guardCharge: 0,                 // GUARDIAN ANGEL pulse meter (0..8 events)
  guardPulsedWave: false,         // GUARDIAN ANGEL: at most one pulse per wave
  meteorRain: null,               // METEOR MATRIX: an active six-strike rain
  matrixCharge: 0,                // METEOR MATRIX: lined-up hits fill the racks
  // ---- cross-web FUSION meters (FUSION_APEX_PLAN.md) ----
  prismN: 0, prismReady: false,   // PRISMSTORM ARRAY: 12-hit lens counter
  novaStage: 0, novaN: 0, novaT: 0, // HYPERNOVA CYCLE: Mega stream stages
  wallSeg: 0, wallCD: 0,          // BULWARK BATTERY: hex wall + rebuild floor
  cataCD: 0,                      // CATACLYSM CORE cooldown
  lanceT: 0,                      // AEGIS LANCE (classic): lance window timer
  cometSeeds: 0,                  // COMET SHEPHERD: banked seeds (max 3)
  facets: [],                     // MIRROR SPECTRUM: captured shot types (max 3)
  chorusTypes: [], chorusUsed: false, // BESTIARY CHORUS: recorded types, 1/wave
  syncMeter: 0, squadT: 0, squadCD: 0, // VICTORY FORMATION: sync + squadron
  railPressure: 0,                // WAR MACHINE apex: gatling→rail pressure
  celT: false, celS: false, celE: false, // CELESTIAL GUARDIAN apex sectors
  regenLockT: 0,                  // IMMORTAL REACTOR: shield-regen stall
  wingCD: 0,                      // ACE INTERCEPTOR WING patrol cadence
  ascendT: 0,                     // ELEMENTAL ASCENSION retune clock during Mega
  webSeen: {}, lastOfferKeys: [], // offer pity counters + reroll anti-repeat
  lastDraftForm: 1,               // detects a fresh evolution between drafts
  secret: freshSecretState(),
  secretUpg: { heart: false, lens: false, echo: false }, secretHit: 0,
  shieldRegenT: 10,
  telegraphs: [],           // pre-shot warning markers
  gustT: 0, timeWarpT: 0,   // Lugia / Dialga signature effects
  columnStrikes: [],        // Zekrom / Eternatus warned beams
};
function setCombatNotice(text, color, duration = 1.15) {
  G.combatNotice = { text, color, t: duration, max: duration };
}
function bossPhaseCount(br) { return Math.max(1, br?.phaseCount || 3); }
function bossLastStand(br) { return (br?.phase || 1) >= bossPhaseCount(br); }
// ============================================================
//  BALANCE INSTRUMENTATION (Milestone 0) — one compact record per wave
//  ATTEMPT, kept on G.runStats.levels and read by js/dev.js reports.
//  LOCAL-ONLY: nothing is transmitted anywhere. Helpers are no-ops when a
//  run has no stats object (menus, tests that poke systems directly), and
//  each is a single guarded push/increment — nothing here allocates in a
//  per-frame hot loop (statsPlayTick mutates one number).
// ============================================================
const SESSION_STATS = { restarts: 0, quits: 0 }; // survives resetRun
function statsCur() { return G.runStats ? G.runStats.cur : null; }
function statsBeginLevel(lv) {
  if (!G.runStats || !G.runStats.levels) return; // tolerate legacy-shaped stats

  const L = {
    lv, region: regionIdx(lv) + 1, stage: stageIdx(lv) + 1,
    t: 0, cleared: false, kills: 0, knockout: false,
    dmgInBy: {}, hits: [], absorbs: 0, deflects: 0,
    shotsN: 0, shotsC: 0, chargeHits: 0, chargeWasted: 0,
    dmgN: 0, dmgC: 0, dmgBall: 0, dmgSplash: 0, dmgOther: 0,
    overheats: 0, coolT: 0, megas: 0, rerolls: 0,
    upgrades: [], bossPhases: {},
  };
  G.runStats.levels.push(L);
  if (G.runStats.levels.length > 220) G.runStats.levels.shift(); // marathon cap
  G.runStats.cur = L;
}
// the family key answers "WHAT is hitting the player" at tuning granularity:
// e.g. "boss:prism/micro", "stinger/micro", "beam", "danger line"
function statsShotFamily(s) {
  if (!s) return null;
  return (s.boss ? 'boss:' : '') + (s.kind || 'shot') + '/' + (s.classKey || 'standard');
}
function statsDamageIn(cause, s) {
  const L = statsCur(); if (!L) return;
  const fam = statsShotFamily(s) || String(cause || 'unknown').toLowerCase();
  L.dmgInBy[fam] = (L.dmgInBy[fam] || 0) + 1;
  if (L.hits.length < 40) L.hits.push({
    t: +L.t.toFixed(1), cause, kind: s?.kind, cls: s?.classKey,
    type: s?.type, species: s?.species, boss: !!s?.boss,
  });
}
function statsAbsorb() { const L = statsCur(); if (L) L.absorbs++; }
function statsDeflect() { const L = statsCur(); if (L) L.deflects++; }
function statsShotFired(charged) { const L = statsCur(); if (L) { if (charged) L.shotsC++; else L.shotsN++; } }
function statsChargeWasted() { const L = statsCur(); if (L) L.chargeWasted++; }
function statsDmgOut(source, dmg) {
  const L = statsCur(); if (!L) return;
  if (source === 'bolt') L.dmgN += dmg;
  else if (source === 'charge') { L.dmgC += dmg; L.chargeHits++; }
  else if (source === 'ball') L.dmgBall += dmg;
  else if (source === 'splash') L.dmgSplash += dmg;
  else L.dmgOther += dmg;
}
function statsKill() { const L = statsCur(); if (L) L.kills++; }
function statsOverheat() { const L = statsCur(); if (L) L.overheats++; }
function statsCoolTick(dt) { const L = statsCur(); if (L) L.coolT += dt; }
function statsMega() { const L = statsCur(); if (L) L.megas++; }
function statsReroll() { const L = statsCur(); if (L) L.rerolls++; }
function statsUpgradePick(key) { const L = statsCur(); if (L) L.upgrades.push(key); }
function statsPlayTick(dt) { const L = statsCur(); if (L) L.t += dt; }
function statsEndLevel() { const L = statsCur(); if (L) L.cleared = true; }
function statsKnockout() {
  if (!G.runStats) return;
  G.runStats.knockouts = (G.runStats.knockouts || 0) + 1;
  const L = statsCur(); if (L) L.knockout = true;
}
function statsIntercept() { const L = statsCur(); if (L) L.intercepts = (L.intercepts || 0) + 1; }
function statsResonant() { const L = statsCur(); if (L) L.resonants = (L.resonants || 0) + 1; }
// SPECTRAL VEIL cycle: ~2s shimmering (charge phases through) / ~1.4s open.
// Deterministic per mon (phase from gameRand at build) — readable, no RNG.
function specVeilActive(br) {
  return !!br.specVeil && ((G.time + br.specVeil.ph) % 3.4) < 2.0;
}
function statsShellCrack() { const L = statsCur(); if (L) L.shellCracks = (L.shellCracks || 0) + 1; }
// ---- STAGE MEDALS (pkbrk-medals): { '<lvl>': { objectiveKey: 1 } }.
// Awarded on the results screen from stageObjectives(lvl) checks — real
// journeys only (never trial/daily/cheated). Survives corrupt storage via
// the loadStore guard, same pattern as SETTINGS.
const MEDALS = (v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {})(loadStore('pkbrk-medals', '{}'));
function medalEarned(lvl, key) { return !!(MEDALS[lvl] && MEDALS[lvl][key]); }
function awardMedal(lvl, key) {
  if (medalEarned(lvl, key)) return false;
  (MEDALS[lvl] = MEDALS[lvl] || {})[key] = 1;
  saveStore('pkbrk-medals', MEDALS);
  return true;
}
function medalCount() { let n = 0; for (const k in MEDALS) n += Object.keys(MEDALS[k]).length; return n; }
// Build the results-interstitial payload for the stage that just cleared.
// Objective checks run against the ledger record; medal persistence obeys
// the real-journey rule. Called from the level-clear block BEFORE G.level++.
function buildStageResults() {
  const L = statsCur() || {};
  const lvl = G.level;
  const objectives = stageObjectives(lvl).map(o => {
    const done = L.lv != null && !!o.check(L);
    const already = medalEarned(lvl, o.key);
    const canSave = !G.trial && !G.daily && !G.cheated;
    const isNew = done && canSave && awardMedal(lvl, o.key);
    return { key: o.key, name: o.name, desc: o.desc, ace: !!o.ace, done, isNew, already };
  });
  const hitsTaken = Object.values(L.dmgInBy || {}).reduce((a, b) => a + b, 0);
  const topFam = Object.entries(L.dmgInBy || {}).sort((a, b) => b[1] - a[1])[0];
  return {
    lvl, region: genFor(lvl).name, stage: STAGE_NAMES[stageIdx(lvl)],
    nextName: lvl >= 27 ? null
      : stageIdx(lvl) === 2 ? genFor(lvl + 1).name + ' · ' + STAGE_NAMES[0]
        : genFor(lvl).name + ' · ' + STAGE_NAMES[stageIdx(lvl) + 1],
    t: L.t || 0, kills: L.kills || 0, score: G.score,
    hitsTaken, topFam: topFam ? topFam[0] : null,
    shotsN: L.shotsN || 0, shotsC: L.shotsC || 0,
    overheats: L.overheats || 0, megas: L.megas || 0,
    catches: G.caughtRun, medalsSaved: !G.trial && !G.daily && !G.cheated,
    flavor: stageFlavor(lvl),
    objectives,
  };
}
// boss phase durations: the clock starts on the first damaging hit of each
// phase window (br.phaseClockT) — engagement time, not entrance ceremony
function statsBossPhaseMark(br, endedPhase) {
  const L = statsCur(); if (!L || br.phaseClockT == null) return;
  const name = (br.poke && (br.poke.n || br.poke.id)) || 'BOSS';
  const key = name + ' P' + endedPhase;
  L.bossPhases[key] = +((L.bossPhases[key] || 0) + (G.time - br.phaseClockT)).toFixed(1);
  br.phaseClockT = G.time;
}
let dexScroll = 0, dexDragY = null, dexDragStart = 0;
// FLOOR = bottom of the playable area, above any phone home-indicator;
// on touch screens the paddle rides higher so fingers don't cover it
const FLOOR = () => H - SAFE_B;
// on touch the paddle rides well ABOVE the corner buttons — no overlap
const PADDLE_Y = () => FLOOR() - (IS_TOUCH ? 124 : 64);
const DANGER_Y = () => PADDLE_Y() - 86;
const ballSp = () => diff().ballSpeed * (G.mode === 'classic' && upgN('coolant') ? 0.92 : 1);
// CLASSIC keeps the ball as THE weapon — the blaster is earned, never default.
// It arms only at tier 3 of an offense path, from a short LASER pickup, or
// during Mega. The shooter modes (blaster / junkie) are always armed.
function blasterArmed() {
  if (G.mode !== 'classic') return true;
  if (G.fx_laser || G.megaT > 0) return true;
  return PATH_KEYS.some(k => PATHS[k].family === 'offense' && pathLvl(k) >= 3);
}

function romanTier(t) { return t >= 3 ? 'III' : t === 2 ? 'II' : ''; }
// hero: keep the dramatic centre-card treatment even during live combat —
// reserved for boss-round reveals. Everything else renders as a compact strip
// under the HUD while playing, so no banner ever covers the pilot's lane.
function setAnnounce(icon, color, name, desc, dur = 2.0, sub = null, spriteId = null, spriteShiny = false, hero = false) {
  const next = { icon, color, name, desc, sub, t: dur, max: dur, spriteId, spriteShiny, hero };
  if (!G.announce) { G.announce = next; return; }
  if (G.announce.name === name || G.announceQueue.some(a => a.name === name)) return;
  G.announceQueue.push(next);
  if (G.announceQueue.length > 4) G.announceQueue.shift();
}

function applyPower(p, srcType) {
  if (p.key === 'pokeball') return; // handled in catch logic
  SFX.power();
  let tier = 1;
  const bump = (slot, dur) => {
    const cur = G[slot];
    if (cur) { cur.tier = Math.min(3, cur.tier + 1); cur.t = dur; tier = cur.tier; }
    else { G[slot] = { t: dur, tier: 1 }; }
  };
  switch (p.key) {
    case 'fire':   bump('fx_fire', 10); break;
    case 'laser':
      bump('fx_laser', 9);
      // First laser of a classic run explains that this is a brief side arm,
      // not a permanent replacement for the ball.
      if (G.mode === 'classic' && !G.blasterTutDone) {
        G.blasterTutDone = true;
        setAnnounce('laser', '#4dd0e1', 'TEMPORARY BLASTER!',
          '9 SECONDS OF SUPPORT FIRE · ' + (IS_TOUCH ? 'USE THE FIRE PAD' : 'HOLD CLICK'), 3.6,
          'THE BALL REMAINS YOUR PRIMARY WEAPON');
      }
      break;
    case 'wide':   bump('fx_wide', 14); break;
    case 'slow':   bump('fx_slow', 8); break;
    case 'magnet': bump('fx_magnet', 12); break;
    case 'star':   bump('fx_score', 15); break;
    case 'draco':  bump('fx_draco', 10); break;
    case 'shield':
      G.shieldCharges = Math.min(shieldCap(), G.shieldCharges + 1);
      tier = G.shieldCharges;
      SFX.shield();
      break;
    case 'heal': { // recovery pickup: restore one segment, never exceed max HP
      const before = G.lives;
      G.lives = Math.min(Math.max(1, G.livesMax || preset().lives), G.lives + 1);
      G.healthDropPity = 0;
      G.hurtHud = 2.8;
      // RESCUE CIRCUIT: recovery also restores a shield charge (heartbeat ring)
      if (upgN('rescue') && G.shieldCharges < shieldCap()) {
        G.shieldCharges++;
        ringFx(G.paddle.x, shipY(), '#ff8a80', 5, 54, 3, 0.4);
        addFloater(G.paddle.x, shipY() - 34, 'RESCUE SHIELD!', '#ff8a80', 12);
        SFX.shield();
      }
      tier = 1;
      if (G.lives === before) {
        G.score += 250;
        p = { ...p, name: 'POTION BONUS', desc: 'HP FULL · +250 POINTS' };
      } else {
        ringFx(G.paddle.x, shipY(), p.color, 8, 84, 4, 0.55);
        addFloater(G.paddle.x, shipY() - 54, '+1 HP', p.color, 22);
      }
      break;
    }
    case 'warp': // every ball phases straight up through the blocks
      for (const b of G.balls) {
        if (b.dead) continue;
        b.phasing = true; b.stuck = false;
        b.vx = 0; b.vy = -ballSp();
        b.zoneSaves = barrierCharges(); // arrive with a full barrier
      }
      G.shake = Math.min(G.shake + 5, 10);
      tone(500, 0.25, 'sine', 0.06, 600);
      break;
    case 'multi': {
      const cur = G.balls.filter(b => !b.dead);
      const add = [];
      for (const b of cur) {
        if (cur.length + add.length >= 12) break;
        const a = Math.atan2(b.vy, b.vx);
        for (const da of [-0.45, 0.45]) {
          if (cur.length + add.length >= 12) break;
          add.push(makeBall(b.x, b.y, a + da, b.stuck ? -Math.PI / 2 + da : null));
        }
      }
      add.forEach(b => { b.stuck = false; G.balls.push(b); });
      break;
    }
  }
  // ball takes on the element of the type that dropped this
  let sub = null;
  if (srcType) {
    G.ballElement = srcType;
    G.ballElementT = 20; // elements wear off — a stale bad matchup shouldn't last forever
    const strong = (EFFECTIVE[srcType] || []).slice(0, 3).join(', ').toUpperCase();
    const weak = (RESIST[srcType] || []).slice(0, 2).join(', ').toUpperCase();
    sub = srcType.toUpperCase() + ' BALL' + (strong ? ' — 2× vs ' + strong : '') + (weak ? ' · ¼× vs ' + weak : '');
  }
  // shooter modes read the paddle-free label (`sname`/`sdesc`) when a power
  // has one — a Starfighter pilot never hears about a paddle it doesn't have.
  const pName = (G.mode !== 'classic' && p.sname) ? p.sname : p.name;
  const pDesc = (G.mode !== 'classic' && p.sdesc) ? p.sdesc : p.desc;
  setAnnounce(p.icon, p.color, pName + (tier > 1 ? '  ' + romanTier(tier) : ''), pDesc, 2.0, sub);
}

// ============================================================
//  ENTITY FACTORIES
// ============================================================
function makeBall(x, y, angle, overrideAngle) {
  const sp = ballSp();
  const a = overrideAngle != null ? overrideAngle : (angle != null ? angle : -Math.PI / 2 + (gameRand() - 0.5) * 0.6);
  const radius = G.mode === 'classic' && upgN('heavy') ? 10.6 : 9;
  return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: radius, stuck: false, dead: false, trail: [], rally: 0, aboveWall: false, zoneSaves: barrierCharges(), ember: 0 };
}

// formations — pinball-shaped layouts drawn from at random, so runs differ.
// "mild" ones keep enough coverage to headline an arrival wave too.
const FORMATIONS = [
  { name: 'CHECKERBOARD', mild: true, skip: (r, c) => (r + c) % 2 === 1 },
  { name: 'DIAMOND',      skip: (r, c, rows, cols) => Math.abs(c - (cols - 1) / 2) + Math.abs(r - (rows - 1) / 2) > Math.max(rows, cols) / 2 + 0.6 },
  { name: 'TWIN PILLARS', skip: (r, c, rows, cols) => { const q = cols / 4; return Math.abs(c - q) > q * 0.8 && Math.abs(c - 3 * q) > q * 0.8; } },
  { name: 'FORTRESS',     mild: true, skip: (r, c, rows, cols) => r > 0 && r < rows - 1 && c > 0 && c < cols - 1 && (r + c) % 2 === 0 },
  // wedge pointing up — a classic invader vanguard
  { name: 'VANGUARD',     skip: (r, c, rows, cols) => Math.abs(c - (cols - 1) / 2) > (r + 0.5) * cols / (rows * 2) + 0.4 },
  // diagonal raiding stripes
  { name: 'SIDEWINDER',   mild: true, skip: (r, c) => (c + r * 2) % 4 >= 2 },
  // hollow ring — the middle is a pinball chamber
  { name: 'ARENA',        skip: (r, c, rows, cols) => r > 0 && r < rows - 1 && c > 1 && c < cols - 2 },
  // vertical canyons — clean shafts up to the high ground
  { name: 'CANYONS',      mild: true, skip: (r, c) => c % 3 === 2 },
];
const MILD_FORMS = FORMATIONS.filter(f => f.mild);
// vertical BREATHING ROOM the flyers leave above the paddle. Generous for most
// of the journey; only the final region of a cycle crowds the paddle for a
// difficulty spike (flyers never trip the danger line, so a low pattern is
// intense but fair). Blocks are static, so this only ever bounds the FLYERS.
function flyerRoom(lvl) {
  const regionInCycle = Math.floor((lvl - 1) / STAGES) % GENS.length;
  const t = Math.max(0, Math.min(1, (regionInCycle - 6) / 2)); // 0 until region 7, →1 by the last
  return Math.max(56, H * (0.19 - 0.13 * t));
}
// ---- FLYER ZONING: boxed bricks are a STATIC wall; the Pokémon own all the
// motion, in patterns that provably never enter the block zone. Two kinds:
//   • SQUARE — a loop traced strictly AROUND the grid (never inside it).
//   • OPEN patterns — everything else, confined to the clear band BELOW the
//     grid (top of the pattern clamped under the lowest rank).
// Flyers can thread past each other, but no pattern overlaps the bricks.
// ============================================================
//  SPACE JUNKIE CHOREOGRAPHY — every wave is ONE authored aerial encounter.
//  Per region × stage, an entry names the wave's motion FAMILY and lays out
//  each squad's pattern, anchor, phase and role on ONE shared clock — no
//  squad ever rolls its own pattern. Acts develop a verb: act 1 ASSEMBLES
//  (single anchors, mirrored pairs), act 2 TRANSFORMS (breathing pincers,
//  relays, blooms), act 3 COMBINES (four roles, rotation, morph reprise).
//  Units: cx = offset from centre in fractions of usable width; cy = 0..1
//  within the airspace band; rx/ry scale the family's base radius; share
//  weights the member split; role feeds elite tiers and attack-group picks.
// ============================================================
const JUNKIE_CHOREO = [
  // ---- ACT 1 · FORMATION ----
  { arrival: { family: 'cadetArc', squads: [
      { kind: 'arc', rx: 1, ry: 0.8, cy: 0.42, spd: 0.8, role: 'core' }] },
    challenge: { family: 'vanguardV', squads: [
      { kind: 'chevron', rx: 1, ry: 0.9, cy: 0.45, spd: 0.9, role: 'attacker' }] } },
  { arrival: { family: 'carousel', rotary: true, squads: [
      { kind: 'ring', rx: 1, ry: 1, cy: 0.5, spd: 0.8, role: 'wing', share: 3 },
      { kind: 'ring', rx: 0.4, ry: 0.4, cy: 0.5, spd: 0.8, ph: 0.5, role: 'core', share: 1 }] },
    challenge: { family: 'twinCurrent', squads: [
      { kind: 'lane', rx: 1, ry: 0.45, cy: 0.32, spd: 1, role: 'core' },
      { kind: 'lane', rx: 1, ry: 0.45, cy: 0.64, spd: 1, ph: 0.18, role: 'attacker' }] } },
  { arrival: { family: 'pairedEllipse', squads: [
      { kind: 'oval', rx: 0.55, ry: 0.8, cx: -0.22, cy: 0.5, dir: 1, spd: 0.85, role: 'core' },
      { kind: 'oval', rx: 0.55, ry: 0.8, cx: 0.22, cy: 0.5, dir: -1, spd: 0.85, ph: 0.5, role: 'wing' }] },
    challenge: { family: 'evolutionRelay', morph: 'swapCy', squads: [
      { kind: 'arc', rx: 1, ry: 0.7, cy: 0.28, spd: 0.9, role: 'wing', share: 2 },
      { kind: 'fountain', rx: 0.35, ry: 0.85, cy: 0.66, spd: 1, role: 'elite', share: 1 }] } },
  // ---- ACT 2 · TRANSFORMATION ----
  { arrival: { family: 'diamondLattice', squads: [
      { kind: 'diamond', rx: 1, ry: 1, cy: 0.48, spd: 0.7, role: 'core' },
      { kind: 'diamond', rx: 0.55, ry: 0.55, cy: 0.48, spd: 0.7, ph: 0.5, role: 'wing' }] },
    challenge: { family: 'pincer', morph: 'breathe', squads: [
      { kind: 'ring', rx: 0.32, ry: 0.45, cy: 0.52, spd: 0.8, role: 'core' },
      { kind: 'arc', rx: 0.5, ry: 0.55, cx: -0.28, cy: 0.4, spd: 0.9, role: 'wing' },
      { kind: 'arc', rx: 0.5, ry: 0.55, cx: 0.28, cy: 0.4, spd: 0.9, ph: 0.5, role: 'attacker' }] } },
  { arrival: { family: 'echelon', squads: [
      { kind: 'lane', rx: 0.8, ry: 0.32, cx: -0.08, cy: 0.2, spd: 1, role: 'core' },
      { kind: 'lane', rx: 0.8, ry: 0.32, cy: 0.5, spd: 1, ph: 0.33, role: 'wing' },
      { kind: 'lane', rx: 0.8, ry: 0.32, cx: 0.08, cy: 0.8, spd: 1, ph: 0.66, role: 'attacker' }] },
    challenge: { family: 'braid', squads: [
      { kind: 'lane', rx: 1, ry: 0.34, cy: 0.22, spd: 1.05, role: 'core' },
      { kind: 'lane', rx: 1, ry: 0.34, cy: 0.5, spd: 1.05, ph: 0.33, role: 'wing' },
      { kind: 'lane', rx: 1, ry: 0.34, cy: 0.78, spd: 1.05, ph: 0.66, role: 'attacker' }] } },
  { arrival: { family: 'nestedCarousel', rotary: true, squads: [
      { kind: 'ring', rx: 1, ry: 1, cy: 0.5, dir: 1, spd: 0.7, role: 'wing' },
      { kind: 'ring', rx: 0.64, ry: 0.64, cy: 0.5, dir: -1, spd: 0.7, role: 'core' },
      { kind: 'ring', rx: 0.34, ry: 0.34, cy: 0.5, dir: 1, spd: 0.7, ph: 0.5, role: 'elite' }] },
    challenge: { family: 'bloom', rotary: true, morph: 'bloom', squads: [
      { kind: 'ring', rx: 0.9, ry: 0.9, cy: 0.5, spd: 0.75, role: 'core', share: 2 },
      { kind: 'ring', rx: 0.5, ry: 0.5, cy: 0.5, dir: -1, spd: 0.75, role: 'attacker' }] } },
  // ---- ACT 3 · MASTERY ----
  { arrival: { family: 'binaryMoons', rotary: true, squads: [
      { kind: 'ring', rx: 0.42, ry: 0.6, cx: -0.24, cy: 0.42, spd: 0.9, role: 'core' },
      { kind: 'ring', rx: 0.2, ry: 0.3, cx: -0.24, cy: 0.42, dir: -1, spd: 0.9, role: 'wing' },
      { kind: 'ring', rx: 0.42, ry: 0.6, cx: 0.24, cy: 0.58, spd: 0.9, ph: 0.5, role: 'orbit' },
      { kind: 'ring', rx: 0.2, ry: 0.3, cx: 0.24, cy: 0.58, dir: -1, spd: 0.9, ph: 0.5, role: 'attacker' }] },
    challenge: { family: 'eclipse', rotary: true, morph: 'eclipse', squads: [
      { kind: 'ring', rx: 1, ry: 1, cy: 0.5, spd: 0.7, role: 'wing', share: 2 },
      { kind: 'ring', rx: 0.5, ry: 0.5, cy: 0.5, dir: -1, spd: 0.7, role: 'core' },
      { kind: 'ring', rx: 0.24, ry: 0.24, cy: 0.5, spd: 0.7, ph: 0.5, role: 'attacker' }] } },
  { arrival: { family: 'vortexLanes', morph: 'orbit', squads: [
      { kind: 'arc', rx: 0.5, ry: 0.45, cx: -0.25, cy: 0.3, spd: 0.9, role: 'core' },
      { kind: 'arc', rx: 0.5, ry: 0.45, cx: 0.25, cy: 0.3, spd: 0.9, ph: 0.25, role: 'wing' },
      { kind: 'arc', rx: 0.5, ry: 0.45, cx: -0.25, cy: 0.7, spd: 0.9, ph: 0.5, role: 'orbit' },
      { kind: 'arc', rx: 0.5, ry: 0.45, cx: 0.25, cy: 0.7, spd: 0.9, ph: 0.75, role: 'attacker' }] },
    challenge: { family: 'raidCarousel', rotateAttack: 12, squads: [
      { kind: 'arc', rx: 1, ry: 0.45, cy: 0.18, spd: 0.85, role: 'core' },
      { kind: 'arc', rx: 0.8, ry: 0.45, cy: 0.45, spd: 0.85, ph: 0.33, role: 'wing' },
      { kind: 'arc', rx: 0.6, ry: 0.45, cy: 0.72, spd: 0.85, ph: 0.66, role: 'orbit' },
      { kind: 'ring', rx: 0.28, ry: 0.4, cy: 0.45, spd: 1.1, role: 'attacker' }] } },
  { arrival: { family: 'fourWingRelay', squads: [
      { kind: 'chevron', rx: 0.45, ry: 0.5, cx: -0.26, cy: 0.3, spd: 0.9, role: 'core' },
      { kind: 'chevron', rx: 0.45, ry: 0.5, cx: 0.26, cy: 0.3, spd: 0.9, ph: 0.5, role: 'wing' },
      { kind: 'chevron', rx: 0.45, ry: 0.5, cx: -0.26, cy: 0.7, spd: 0.9, ph: 0.25, role: 'orbit' },
      { kind: 'chevron', rx: 0.45, ry: 0.5, cx: 0.26, cy: 0.7, spd: 0.9, ph: 0.75, role: 'attacker' }] },
    // the finale recapitulates: act-1 chevron discipline morphing through
    // act-2 ring exchanges into an act-3 phalanx — announced by the blend
    challenge: { family: 'masteryMorph', morph: 'blend', rotateAttack: 10, squads: [
      { kind: 'chevron', kind2: 'ring', rx: 0.9, ry: 0.75, cy: 0.42, spd: 0.8, role: 'core', share: 2 },
      { kind: 'ring', kind2: 'phalanx', rx: 0.5, ry: 0.5, cy: 0.6, dir: -1, spd: 0.8, role: 'attacker' }] } },
];

function flightGeom(kind, geo, s, nS) {
  if (kind === 'square') {
    // a rectangle loop hugging OUTSIDE the grid — margin beyond every edge,
    // so a rider on it can never touch a brick. Nested for multiple squads.
    const m = Math.max(36, geo.usable * 0.03) + s * 26;
    const ry = Math.min((geo.gridBottom - geo.gridTop) / 2 + m, geo.floorY - geo.gridCy - 6);
    return { kind, cx: geo.gridCx, cy: geo.gridCy, rx: geo.gridHW + m, ry, spd: 0.7 };
  }
  // OPEN-ZONE patterns live entirely in the clear band below the grid
  const wrap = kind === 'snake' || kind === 'helix' || kind === 'swoop';
  const halfBand = (geo.floorY - geo.openTop) / 2;
  // stack multiple open squads through the band so they don't pile up
  const cy = geo.openTop + halfBand + (nS > 1 ? (s - (nS - 1) / 2) * Math.min(42, halfBand * 0.5) : 0);
  let g;
  if (wrap) {
    g = { kind, cx: W / 2, cy, rx: W / 2 + 90, ry: Math.min(halfBand, 108), spd: 1.6 };
  } else {
    const cx = nS > 1 ? W / 2 + (s - (nS - 1) / 2) * geo.usable * 0.2 : W / 2;
    const flat = kind === 'inf' || kind === 'oval' || kind === 'lane' || kind === 'weave' || kind === 'epi';
    const round = kind === 'ring';
    const rx = round ? Math.min(halfBand, geo.usable * 0.4)
      : geo.usable * (kind === 'oval' ? 0.46 : nS > 1 ? 0.27 : 0.4);
    g = { kind, cx, cy, rx, ry: Math.min(halfBand, round ? rx : flat ? halfBand * 0.72 : halfBand),
      spd: kind === 'lane' ? 1.3 : 1 };
  }
  clampOpen(g, geo.openTop, geo.floorY);
  return g;
}
// hold an open pattern's band between the grid's underside and the paddle floor
function clampOpen(g, top, floorY) {
  const band = floorY - top;
  if (g.ry * 2 > band) g.ry = band / 2;
  g.cy = Math.max(top + g.ry, Math.min(floorY - g.ry, g.cy));
}
function assignClassicBrickBehaviors(regionsIn, stage) {
  if (G.mode !== 'classic' || stage === 2) return;
  const primary = BRICK_BEHAVIOR_ORDER[Math.min(BRICK_BEHAVIOR_ORDER.length - 1, regionsIn)];
  const candidates = G.bricks.filter(b => !b.isBoss && !b.subBoss && !b.armored && !b.flight && !b.behavior);
  if (candidates.length < 2) return;
  const shuffled = candidates.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(gameRand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const amount = Math.min(shuffled.length, 2 + (stage === 1 ? 2 : 0) + Math.floor(regionsIn / 4));
  if (primary === 'shift' || primary === 'volatile') {
    const row = shuffled[0].row;
    const rank = candidates.filter(b => b.row === row).slice(0, Math.max(3, amount));
    rank.forEach((b, i) => { b.behavior = primary; b.behaviorPhase = i * 0.65; });
  } else if (primary === 'link') {
    const linked = shuffled.slice(0, Math.max(2, amount - amount % 2));
    linked.forEach((b, i) => { b.behavior = 'link'; b.linkGroup = Math.floor(i / 2); });
  } else {
    shuffled.slice(0, amount).forEach((b, i) => {
      b.behavior = primary;
      b.behaviorPhase = i * 0.8;
      if (primary === 'regen') b.regenT = 3 + gameRand() * 2;
      if (primary === 'reactor') { b.hp += 2; b.maxHp += 2; }
    });
  }
  // Challenge waves combine the region's new rule with one familiar rule.
  if (stage === 1 && regionsIn > 1) {
    const secondary = BRICK_BEHAVIOR_ORDER[Math.max(0, regionsIn - 2)];
    const extra = shuffled.find(b => !b.behavior);
    if (extra) { extra.behavior = secondary; extra.behaviorPhase = 1.2; }
  }
  const info = BRICK_BEHAVIORS[primary];
  setAnnounce(info.icon, info.color, info.name, info.desc, 2.8,
    primary === 'shield' ? 'FOLLOW THE GREEN LINKS TO THE GENERATOR' : 'EVERY MARKED TARGET IS STILL BALL-BREAKABLE');
}
function buildLevel(lvl) {
  G.bricks = []; G.powerups = []; G.lasers = []; G.missiles = []; G.enemyShots = [];
  G.fragments = []; G.ghosts = []; G.telegraphs = []; G.columnStrikes = []; G.rings = [];
  G.fx = 0; G.fy = 0; G.swayT = 0;
  G.secret.pendingShard = null; G.secret.vmax = false; G.secret.rewardDraft = false;
  G.secret.deferredChoices = null;
  if (stageIdx(lvl) !== 2) G.gauntlet = null;
  G.gustT = 0; G.timeWarpT = 0; G.gridRect = null;
  const gen = genFor(lvl), rIdx = regionIdx(lvl), stage = stageIdx(lvl);
  // one ECOLOGY per wave: every squad and rank draws from the same habitat
  // pack or type cluster, so Pokémon that belong together appear together
  const theme = pickWaveTheme(rIdx);
  G.waveThemeObj = theme; // reinforcements arrive as the SECOND BEAT of this ecology
  G.waveTheme = theme.name;
  preloadGen(gen);
  preloadGen(genFor(lvl + STAGES));
  buildBackground(rIdx);
  const p = preset();
  const cycle = Math.floor((lvl - 1) / (GENS.length * STAGES)); // full-journey loops
  // 4-5 columns on phones, up to 11 on wide desktops — cards stay readable
  // board size grows with the journey: more columns and rows deeper in, so
  // late regions are denser campaigns rather than just faster ones
  const regionsIn = Math.floor((lvl - 1) / STAGES);
  // columns are READABILITY-driven, NOT region-driven: the board stays legible
  // so the ball is never lost among the cards. The journey adds pressure by
  // trading boxed bricks for free-flyers (see the density budget below), never
  // by piling on more and more columns.
  const cols = Math.max(6, Math.min(10, Math.floor(W / 122)));
  // wide side margins leave the formation real room to MARCH — the broad
  // Galaxian sweeps need somewhere to sweep to
  const margin = Math.max(40, W * 0.13);
  const bw = (W - margin * 2) / cols;
  // brick height also scales with VIEWPORT height — short laptop windows must
  // still leave the lower half of the screen as playable space
  const bh = Math.min(80, bw * 0.72, H * 0.07);
  const gapX = Math.max(8, bw * 0.15); // invader-style daylight between columns
  const pitchY = bh + Math.max(9, Math.min(13, bh * 0.3));
  G.brickW = bw; G.brickH = bh;
  const hasBoss = stage === 2;
  // formations normally spawn with real headroom above them for the high-ground
  // rally zone. Kanto's first two classic walls sit lower, shortening the first
  // serve and making paddle aim matter sooner; the row-safe cap keeps compact
  // viewports from losing a rank to the shift.
  let gridTop = Math.max(110, Math.min(190, Math.round(H * 0.15)));
  if (!hasBoss && regionsIn === 0 && G.mode === 'classic') {
    const openingRows = stage === 1 ? 4 : 3;
    const desiredTop = Math.max(gridTop, Math.min(230, Math.round(H * 0.24)));
    const rowSafeTop = Math.floor(H * 0.58 - openingRows * pitchY);
    gridTop = Math.max(gridTop, Math.min(desiredTop, rowSafeTop));
  }
  // ---- BOSS (legendary stage only — the finale of each region) ----
  if (hasBoss) {
    const bossW = Math.min(bw * 1.9, W * 0.4), bossH = bh * 1.75;
    const bossY = 102 + bossH / 2;
    // real boss-fight durability: three phases need room to breathe
    const bossHp = Math.max(9, Math.round((19 + rIdx * 9 + cycle * 32) * p.bossHp));
    G.bricks.push({
      bx: W / 2, by: bossY, w: bossW, h: bossH,
      hx: W / 2, hy: bossY, row: -1, col: -1,
      hp: bossHp, maxHp: bossHp, phase: 1,
      poke: { id: gen.boss.id, n: gen.boss.n, t: gen.boss.t },
      isBoss: true, roundRole: 'legendary', phaseCount: G.mode === 'junkie' && gen.gauntlet ? 2 : 3,
      flash: 0, wobble: gameRand() * Math.PI * 2,
      abilityCD: (BOSS_ABILITIES[gen.boss.id]?.cd || 8) * 0.7,
    });
    gridTop = bossY + bossH / 2 + 26;
    // ---- THE GAUNTLET: every region's finale is a three-round title fight.
    // ROUND 1 — the SUB-LEGENDARIES (Kanto: the legendary birds) hold the
    // arena while the legendary lies in wait off-stage. ROUND 2 — the
    // LEGENDARY descends (full current fight). ROUND 3 — the MYTHICAL
    // (Kanto: Mew) closes the show, faster and wilder. Difficulty scales
    // round by round; the controller lives in update.js.
    if (gen.gauntlet) {
      const legend = G.bricks[G.bricks.length - 1];
      legend.dormant = true;
      legend.bx = legend.hx = -2000; // parked off-stage until round 2
      G.gauntlet = { phase: 0, origX: W / 2, legendHp: bossHp, subT: 0, subAbilityCD: 4, entry: null };
      const subs = gen.gauntlet.subs;
      const subHp = Math.max(5, Math.round(bossHp * (subs.length === 1 ? 0.85 : 0.42)));
      for (let i = 0; i < subs.length; i++) {
        const [sid, st2] = subs[i];
        G.bricks.push({
          bx: W / 2, by: 150, hx: W / 2, hy: 150, row: -2, col: i,
          w: Math.min(92, bw * 1.25), h: Math.min(80, bh * 1.4),
          hp: subHp, maxHp: subHp, bare: true, subBoss: true, elite: 3,
          roundRole: 'sentinel', phaseCount: 1, phase: 1,
          subIdx: i, subN: subs.length,
          poke: { id: sid, t: st2, n: NAMES[sid] },
          flash: 0, wobble: i * 2.1,
        });
        getSprite(sid);
      }
      getSprite(gen.gauntlet.myth[0]);
      setAnnounce('alert', gen.accent, 'THE ' + gen.name + ' GAUNTLET',
        'ROUND 1 — THE SENTINELS: ' + subs.map(x => NAMES[x[0]].toUpperCase()).join(' · '), 3.6,
        (G.mode === 'junkie' ? gauntletEntranceName(SENTINEL_ENTRANCE_STYLES[rIdx]) + ' · ' : '') +
          'THREE ROUNDS — 1 PHASE · 2 PHASES · 3 PHASES', null, false, true);
    } else G.gauntlet = null;
    // pre-warm the boss's phase-tint silhouettes so the enrage transition
    // never pays a cache-miss hitch mid-fight
    setTimeout(() => {
      getSilhouette(gen.boss.id, '#060a18');
      getSilhouette(gen.boss.id, '#ff5252');
      getSilhouette(gen.boss.id, '#ffffff');
      getSilhouette(gen.boss.id, TYPE_COLORS[gen.boss.t]);
    }, 600);
  }
  // ---- grid ----
  // challenge waves always pull a random formation; arrivals often do too
  // (a mild one), so no two journeys through a region play quite the same
  const form = stage === 1 ? FORMATIONS[Math.floor(gameRand() * FORMATIONS.length)]
    : stage === 0 && gameRand() < 0.45 ? MILD_FORMS[Math.floor(gameRand() * MILD_FORMS.length)]
    : null;
  const maxRows = Math.max(2, Math.floor((H * 0.58 - gridTop) / pitchY));
  // ---- DENSITY BUDGET: keep the board readable so the ball is never lost.
  // Free-FLYERS (moving, individual Pokémon) are HARD-CAPPED, and the BOXED
  // wall SHRINKS as the journey shifts toward flyers — always a balance,
  // never a wall AND a swarm at once. Streams (below) are pure flyers that
  // spend part of the flyer budget, arriving already broken out.
  const classic = G.mode === 'classic';
  const streamSquads = !hasBoss && !classic && regionsIn >= 4 ? (regionsIn >= 7 ? 2 : 1) : 0;
  const streamPer = Math.min(8, 4 + Math.floor(regionsIn / 2));
  const flyerBudget = hasBoss || classic ? 0 : Math.min(22, regionsIn === 0 ? 0 : Math.round(4.5 + regionsIn * 1.85));
  const gridFlyerBudget = Math.max(0, flyerBudget - streamSquads * streamPer);
  // boxed bricks: a fuller wall early, thinning region by region — but not so
  // full it squeezes the flyer band below it (flyers need room to not overlap)
  const boxedBudget = Math.max(cols, Math.round(cols * (2.7 - regionsIn * 0.2)));
  // SPACE JUNKIE mode: non-boss waves have NO wall — the whole wave flies
  const junkie = G.mode === 'junkie';
  const rows = hasBoss
    ? Math.min(2 + Math.min(3, Math.floor(regionsIn / 3)), 8, maxRows)
    : junkie ? 0
    // challenge waves add a row for pressure — but NOT when two stream squads
    // are already pouring in (regionsIn>=7): the streams supply the density, so
    // the extra boxed row would push a wide-viewport wave over the readability
    // budget (L23 built ~44 entities; the flocks already carry the challenge)
    : Math.max(2, Math.min(Math.round((boxedBudget + gridFlyerBudget) / cols) + (stage === 1 && streamSquads < 2 ? 1 : 0), 6, maxRows));
  for (let r = 0; r < rows; r++) {
    // arrival waves lean on tier 1-2; boss waves field the elites
    const tier = hasBoss ? 3
      : r < Math.ceil(rows / 3) ? Math.min(3, 2 + stage) : r < Math.ceil(rows * 2 / 3) ? 2 : 1;
    const pool = themedPool(gen, tier, theme);
    // the very top row of a non-boss wave is an armored "guardian wall" —
    // multi-hit bricks the ball can rally against (see awardRally)
    const armored = !hasBoss && r === 0 && rows >= 2;
    // space-invaders style: every rank marches as ONE species
    const [id, t] = pool[Math.floor(gameRand() * pool.length)];
    for (let c = 0; c < cols; c++) {
      if (form && form.skip(r, c, rows, cols)) continue;
      // blocks are tougher now that the blaster fires freely — the extra HP
      // keeps waves from melting in seconds (BRICK_HP_MUL is the tuning knob)
      const BRICK_HP_MUL = 1.35;
      let hp = Math.max(1, Math.round((tier + cycle) * p.brickHp * BRICK_HP_MUL) + (regionsIn >= 4 ? 1 : 0) + (regionsIn >= 7 ? 1 : 0));
      if (armored) hp = Math.min(9, Math.max(3, Math.round((3 + Math.floor(rIdx / 2) + cycle * 2) * p.brickHp)));
      // Wave entrance: each ROW arrives as ONE line — every brick starts
      // directly above its own column (slight alternating diagonal drift per
      // row for life) and the whole rank glides down together, row after
      // row. No per-column stagger — a row that ripples in reads as stutter.
      const entry = {
        t: 0.3 + r * 0.38,
        dur: 1.15,
        sx: margin + c * bw + bw / 2 + (r % 2 ? -36 : 36),
        sy: -60 - r * 30,
      };
      const brick = {
        bx: entry.sx,
        by: entry.sy,
        hx: margin + c * bw + bw / 2,
        hy: gridTop + r * pitchY + bh / 2,
        row: r, col: c, entry,
        w: bw - gapX, h: bh,
        hp, maxHp: hp, armored, elite: !armored && tier >= 2 ? tier : 0,
        poke: { id, t },
        flash: 0, wobble: gameRand() * Math.PI * 2,
      };
      // easter eggs: glitch block > shiny (the Pokédex Shiny Charm doubles
      // its appearance rate) > ditto disguise
      const roll = gameRand();
      const shinyChance = !G.daily && dexRewardActive('shinyCharm') ? 1 / 32 : 1 / 64;
      if (roll < 1 / 220) { brick.poke = { id: -1, t: 'normal' }; brick.hp = brick.maxHp = 1; }
      else if (roll < 1 / 220 + shinyChance) { brick.shiny = true; getSprite(id, true); }
      else if (roll < 1 / 220 + shinyChance + 1 / 45) { brick.isDitto = true; }
      G.bricks.push(brick);
    }
  }
  G.enemyShotCD = 5;
  G.bossShotCD = 4;
  G.maneuver = null; G.maneuverCD = 8;
  G.deathsThisWave = 0;
  G.dangerWarned = false;
  G.heat = 0; G.overheat = 0;
  statsBeginLevel(lvl); // one balance record per wave ATTEMPT (retries too)
  G.highGroundDone = false; G.waveFirstKill = false; G.elementOrbCD = 9;
  // motionTier drives the boss guard-ring shimmer (mt>=1, regions 3+).
  G.motionTier = Math.min(3, Math.floor(regionsIn / 2) + (stage === 1 ? 1 : 0));
  // ---- FLYERS: the Space Junkie heart of the game. Boxed blocks are
  // bricks; Pokémon that BREAK OUT of their boxes become free-flying
  // aliens riding one of a dozen flight patterns, nose to tail. A few
  // break out starting in world 2; by the last regions nearly the whole
  // wave flies — brick breaker slowly becomes Space Junkie.
  // G.motionStyle only affects a region-1/2 boss's guard sway (the sole place
  // update.js reaches the style branch — non-boss walls are static, and mt>=1
  // bosses use the guard-ring instead). 'serpent' gives those guards a shimmer.
  G.motionStyle = regionsIn >= 1 && gameRand() < 0.5 ? 'serpent' : 'march';
  G.pathSpeed = 0.035 + regionsIn * 0.005; // cycle speed: flowing, never frantic
  // unlocked flight patterns grow region by region. 'square' loops around
  // the bricks; the rest weave/circle in the open space below them.
  // SPACE JUNKIE mode unlocks one region early — variety is that mode's
  // thing, but region 1 stays on the clean, obvious shapes everywhere:
  // complexity ramps gradually and peaks only by the journey's end.
  const unlockR = junkie ? regionsIn + 1 : regionsIn;
  // patterns unlock region by region, ordered so EARLY waves read as clean,
  // obvious formations that hold their shape — riders never cross, so the flock
  // never bumps itself into a blob. The busy self-crossing curves (figure-8s,
  // pretzels, roses, vortices — where riders pass through a shared center)
  // arrive later, once the separation solver's packing is expected chaos.
  const kinds = ['ring', 'oval', 'lane', 'square', 'chevron']; // clean loops, lanes & the V
  if (unlockR >= 2) kinds.push('fountain', 'weave', 'snake', 'arc');
  if (unlockR >= 3) kinds.push('diamond', 'swoop', 'pulsar', 'helix', 'cross', 'carousel');
  if (unlockR >= 4) kinds.push('inf', 'falls', 'zigzag', 'olympic', 'phalanx');
  if (unlockR >= 5) kinds.push('liss', 'star', 'binary', 'spiral');
  if (unlockR >= 6) kinds.push('rose', 'pend', 'epi', 'atom', 'vortex', 'clover', 'butterfly');
  if (G.mode === 'blaster' && !hasBoss && regionsIn >= 1) {
    // how many break out of the wall is set by the density budget (above),
    // never a runaway fraction — the boxed wall keeps a real presence
    const pool2 = G.bricks.filter(b => !b.armored && !b.isBoss);
    for (let i = pool2.length - 1; i > 0; i--) { // shuffle
      const j = Math.floor(gameRand() * (i + 1));
      [pool2[i], pool2[j]] = [pool2[j], pool2[i]];
    }
    const flyers = pool2.slice(0, Math.min(pool2.length, gridFlyerBudget));
    const usable = W - margin * 2;
    // the STATIC grid's rectangle, and the clear band below it the flyers own
    const gridBottom = gridTop + (rows - 1) * pitchY + bh; // bottom of lowest rank
    const geo = {
      usable, margin,
      gridTop, gridBottom, gridCx: W / 2, gridHW: usable / 2,
      gridCy: (gridTop + gridBottom) / 2,
      // clear gap below the wall so a flyer's sprite never grazes the bricks
      openTop: gridBottom + Math.max(34, bh * 0.85),
      floorY: PADDLE_Y() - flyerRoom(lvl),
      // 'square' needs a boxed core left to loop around
      hasCore: G.bricks.length - flyers.length >= 4,
    };
    // the static wall's rectangle — the separation solver shoves any flyer its
    // pushes nudge INTO the wall back out, without disturbing the 'square'
    // pattern that legitimately loops AROUND the wall
    G.gridRect = { top: geo.gridTop, bottom: geo.gridBottom, cx: geo.gridCx, hw: geo.gridHW };
    const pickKind = () => {
      let k = kinds[Math.floor(gameRand() * kinds.length)];
      if (k === 'square' && !geo.hasCore) k = 'oval'; // nothing to loop around
      return k;
    };
    // wall squads AND streams share ONE band, so they must draw DISTINCT slots
    // — otherwise two flocks land on the same center/curve and sit on top of
    // each other. Every squad (wall or stream) gets a unique index into nTotal.
    const wallNS = flyers.length >= 3 ? Math.max(1, Math.min(4, Math.round(flyers.length / 7))) : 0;
    const nTotal = wallNS + streamSquads;
    // ---- WALL SQUADS: flyers break out a whole SQUAD at a time — the
    // flock pops its boxes within a beat of each other and threads onto
    // its OWN pattern (each squad gets a shape, a center, a direction)
    if (wallNS > 0) {
      for (let s = 0; s < wallNS; s++) {
        const members = flyers.filter((_, i) => i % wallNS === s);
        const kind = pickKind();
        const g = flightGeom(kind, geo, s, nTotal);
        members.forEach((b, j) => {
          b.flight = {
            kind, state: 0, // 0 = still boxed in the wall, breaks out later
            launch: 2.2 + s * 2.8 + j * 0.15, // squadmates burst out together
            cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry, spd: g.spd,
            phase: j / members.length, // nose-to-tail around the curve
            n: members.length, // squad size (phalanx grid layout)
            dir: s % 2 ? -1 : 1,
            strand: j % 2, // for helix / snake / carousel row offsets
          };
        });
      }
    }
    // ---- STREAMS: the ranks the smaller grid gave up arrive ALREADY
    // broken out — a trailing line pours in from off-screen and threads
    // straight into its pattern, one behind the other
    for (let s = 0; s < streamSquads; s++) {
      const si = wallNS + s; // unique band slot, past the wall squads
      // streams fly OPEN patterns only (a 'square' would have to cross the wall
      // to reach its loop) and pour in from the SIDES at open-zone height, so
      // the trailing line never passes through the bricks
      let kind = pickKind();
      if (kind === 'square') kind = 'oval';
      const g = flightGeom(kind, geo, si, nTotal);
      const count = streamPer;
      const tierPool = themedPool(gen, 2, theme);
      const [id, t] = tierPool[Math.floor(gameRand() * tierPool.length)]; // one species — reads as a flock
      const hp = Math.max(1, Math.round((1 + Math.floor(regionsIn / 2)) * p.brickHp));
      const edge = gameRand() < 0.5 ? 'left' : 'right';
      for (let j = 0; j < count; j++) {
        const sx = edge === 'left' ? -60 - j * 44 : W + 60 + j * 44;
        const sy = geo.openTop + si * 30 + (j % 3) * 22;
        G.bricks.push({
          bx: sx, by: sy, hx: sx, hy: sy, row: 0, col: j,
          w: bw - gapX, h: bh, hp, maxHp: hp,
          poke: { id, t }, flash: 0, wobble: gameRand() * Math.PI * 2,
          flight: {
            kind, state: 1, t: -(0.4 + j * 0.16), sx, sy, // negative t = holds off-screen, then glides on
            cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry, spd: g.spd,
            phase: j / count, n: count, dir: si % 2 ? -1 : 1, strand: j % 2,
          },
        });
      }
    }
  }
  // ---- SPACE JUNKIE mode: no wall at all — the whole wave arrives as free
  // flyers, squads pouring in from the edges straight onto their patterns.
  // Boss waves keep their choreography, but the guards ride BARE (no boxes:
  // nothing in this mode is ever a framed brick).
  if (junkie && hasBoss) {
    // SPACE JUNKIE boss encounters do NOT reuse the legacy guard grid: the
    // legendary holds the arena with two mirrored WING ARCS of guards that
    // stay compositionally tethered to it — they compress and reform through
    // teleports, exchange sides in phase 2, and become counter-rotating
    // orbits in the last stand (see the guard controller in update.js).
    G.bricks = G.bricks.filter(b2 => b2.isBoss || b2.subBoss);
    const nG = Math.min(12, 10 + (regionsIn >= 5 ? 2 : 0));
    const perWing = nG / 2;
    const gw = Math.min(52, Math.max(IS_TOUCH ? 40 : 34, bw * 0.55));
    const gh = Math.min(46, Math.max(IS_TOUCH ? 35 : 30, bh * 0.78));
    const gHp = Math.max(1, Math.round((1.4 + regionsIn * 0.5 + cycle * 2) * p.brickHp));
    // one species per wing — two mirrored flocks, not a species salad
    const gPool = themedPool(gen, regionsIn >= 4 ? 2 : 1, theme);
    const wingSpecies = [gPool[Math.floor(gameRand() * gPool.length)],
      gPool[Math.floor(gameRand() * gPool.length)]];
    for (let i = 0; i < nG; i++) {
      const side = i % 2 ? 1 : -1, idx = Math.floor(i / 2);
      const [gid, gt] = wingSpecies[i % 2];
      const sx0 = W / 2 + side * (W / 2 + 70 + idx * 44);
      G.bricks.push({
        bx: sx0, by: 70 + idx * 26, hx: sx0, hy: 70 + idx * 26, row: 0, col: i,
        w: gw, h: gh, hp: gHp, maxHp: gHp, bare: true,
        guard: { side, sideF: side, targetSide: side, idx, n: perWing },
        dormant: G.gauntlet ? true : undefined, // wings wake WITH the legendary
        poke: { id: gid, t: gt }, flash: 0, wobble: gameRand() * Math.PI * 2,
      });
      getSprite(gid);
    }
    G.encounter = { family: 'bossWings', act: actIdx(lvl) + 1, actBeat: 'climax', t: 0, squads: [], attackSq: -1 };
    G.guardSwapCD = 8;
    if (G.gauntlet) {
      const sentinels = G.bricks.filter(b => b.subBoss && !b.dead);
      G.gauntlet.entry = {
        role: 'sentinel', round: 1, style: SENTINEL_ENTRANCE_STYLES[rIdx],
        t: 0, dur: 2.8, color: gen.accent,
      };
      for (let i = 0; i < sentinels.length; i++) {
        const br = sentinels[i], side = i % 2 ? -1 : 1;
        br.introFromX = side > 0 ? W + 90 + i * 34 : -90 - i * 34;
        br.introFromY = 54 + (i % 3) * 52;
        br.bx = br.hx = br.introFromX;
        br.by = br.hy = br.introFromY;
        br.introAlpha = 0;
      }
    }
  }
  if (junkie && !hasBoss) {
    const usable = W - margin * 2;
    // Space Junkie airspace: the flocks live HIGH. The floor starts around
    // 42% of the screen and only creeps down as the journey hardens — the
    // low band belongs to the ship (and, later, to divers and raids).
    const floorY = Math.max(200, Math.min(PADDLE_Y() - 170,
      H * (0.42 + Math.min(0.14, regionsIn * 0.02))));
    const geo = {
      usable, margin, gridCx: W / 2, gridHW: usable / 2,
      gridTop: 0, gridBottom: 0, gridCy: 0, hasCore: false,
      openTop: Math.max(96, Math.round(H * 0.12)),
      floorY,
    };
    // Space Junkie mons: compact but readable — and mostly UNEVOLVED.
    // Tier-1 species are the rank and file; evolved Pokémon arrive as
    // ELITES — noticeably LARGER, much tougher to shoot down, and in
    // smaller squads, so bringing one down feels like a kill that counts.
    // phones read better with chunkier mons — raise the floor on touch
    const mw = Math.min(56, Math.max(IS_TOUCH ? 42 : 36, bw * 0.58));
    const mh = Math.min(50, Math.max(IS_TOUCH ? 37 : 32, bh * 0.82));
    // ---- AUTHORED CHOREOGRAPHY: this wave is ONE encounter. The region ×
    // stage entry defines every squad's pattern/anchor/phase on one shared
    // clock — squads never roll their own pattern (JUNKIE_CHOREO above).
    const C = JUNKIE_CHOREO[rIdx][stage === 0 ? 'arrival' : 'challenge'];
    const band = geo.floorY - geo.openTop;
    const total = Math.min(26, 9 + regionsIn * 2 + (stage >= 1 ? 1 : 0));
    const sumShare = C.squads.reduce((a2, q) => a2 + (q.share || 1), 0);
    const mirror = gameRand() < 0.5 ? -1 : 1; // authored grammar, mirrored variety
    const resolved = [];
    for (let s = 0; s < C.squads.length; s++) {
      const q = C.squads[s];
      const g = {
        kind: q.kind, kind2: q.kind2 || null,
        cx: W / 2 + (q.cx || 0) * usable * mirror,
        cy: geo.openTop + (q.cy ?? 0.5) * band,
        rx: usable * 0.34 * (q.rx || 1),
        ry: band * 0.44 * (q.ry || 1),
        // RIGID BODY, LIVING SLOTS: lattice families FREEZE their slots
        // (spd 0 — the anchor, breath and entrance trains do the moving);
        // only explicitly rotary families keep a capped, slow circulation
        dir: (q.dir || 1) * mirror, spd: C.rotary ? (q.spd || 1) * 0.7 : 0,
        ph: q.ph || 0, role: q.role || 'core',
      };
      // frozen LANES are clean rows: with slots rigid, 'lane''s ry is pure
      // vertical scatter — shrink it so ranks read as ranks and two lane
      // squads can never statically interleave
      if (!C.rotary && q.kind === 'lane') g.ry *= 0.28;
      clampOpen(g, geo.openTop, geo.floorY);
      // ENTRANCE TRAIN: a swooping 3-point spline from a top corner, across
      // mid-screen, curving up into the formation's near edge — riders follow
      // nose-to-tail and peel into their slots with a spring settle
      const inSide = Math.sign(g.cx - W / 2) || (s % 2 ? 1 : -1);
      resolved.push({
        ...g, cx0: g.cx, cy0: g.cy, rx0: g.rx, ry0: g.ry,
        e0x: inSide > 0 ? W + 90 : -90, e0y: 54,
        e1x: W / 2 - inSide * W * 0.18, e1y: g.cy + band * 0.3,
        e2x: g.cx - inSide * (g.rx * 0.7 + 30), e2y: g.cy,
        inSide,
      });
      // tiers ride the ROLE: elites are the evolved, larger, tankier flocks
      const tier = g.role === 'elite' && regionsIn >= 3 ? 3
        : (g.role === 'elite' || (s === C.squads.length - 1 && regionsIn >= 2)) ? 2 : 1;
      const sizeMul = tier === 3 ? 1.5 : tier === 2 ? 1.25 : 1;
      let perS = Math.max(3, Math.round(total * (q.share || 1) / sumShare) - (tier === 3 ? 2 : 0));
      // spacing guarantee: never pack more riders than the pattern can hold
      // with clear daylight between slots. If the separation solver never
      // engages during hold, a kill leaves an honest Galaga gap — the
      // survivors don't slide into the dead rider's space.
      const minGap = Math.min(mw, mh) * sizeMul * 1.6;
      const closed = g.kind === 'ring' || g.kind === 'oval' || g.kind === 'diamond';
      // morphing families contract — size capacity for their SMALLEST frame
      const shrink = (C.morph === 'bloom' || C.morph === 'eclipse') ? 0.72 : 1;
      const span = (closed ? Math.PI * Math.sqrt(2 * (g.rx * g.rx + g.ry * g.ry))
        : g.rx * 2 * 1.6) * shrink; // open spans: width plus travel slack
      perS = Math.max(3, Math.min(perS, Math.floor(span / minGap)));
      const pool3 = themedPool(gen, tier, theme); // same ecology, tier by tier
      const [id, t] = pool3[Math.floor(gameRand() * pool3.length)]; // one species per squad
      const hp = Math.max(1, Math.round((1 + (tier - 1) * 1.9 + regionsIn * 0.45 + cycle * 2) * p.brickHp));
      const R = resolved[resolved.length - 1];
      // SHELL ARMOR: normal bolts plink off — ONE charged shot cracks it.
      // Kanto's challenge wave teaches it (3 armored rookies + a callout);
      // afterwards elites wear it, so the charge shot never stops mattering.
      const shellFor = j2 => lvl === 2 ? (s === 0 && j2 < 3)
        : regionsIn >= 1 && (tier === 3 || (tier === 2 && actIdx(lvl) >= 1));
      for (let j = 0; j < perS; j++) {
        // members are IN FORMATION from frame 0 (state 2) — spawned on their
        // actual pattern slot relative to the off-screen ingress anchor; the
        // encounter controller then glides the whole formed body on station
        // riders wait OFF-SCREEN in train order at the spline's mouth
        const sx = R.e0x + R.inSide * (30 + j * 34), sy = R.e0y + (j % 3) * 10;
        G.bricks.push({
          bx: sx, by: sy, hx: sx, hy: sy, row: s, col: j,
          w: mw * sizeMul, h: mh * sizeMul, hp, maxHp: hp,
          shellArmor: shellFor(j) || undefined, elite: tier >= 2 ? tier : 0,
          poke: { id, t }, flash: 0,
          // squad-SYNCED idle phase: random phases make a clean rank shimmer
          wobble: s * 1.3 + j * 0.35,
          flight: {
            kind: g.kind, state: 2, t: 0, sx, sy, sq: s, launch: 0, choreo: true,
            cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry, spd: g.spd,
            inDelay: s * 0.9 + j * 0.22, inDur: 2.8, entering: true,
            phase: j / perS + (g.ph || 0), n: perS, dir: g.dir, strand: j % 2,
          },
        });
      }
    }
    G.encounter = {
      family: C.family, act: actIdx(lvl) + 1,
      actBeat: stage === 0 ? 'establish' : 'escalate',
      morph: C.morph || null, rotateAttack: C.rotateAttack || 0, rotary: !!C.rotary, t: 0,
      squads: resolved, mirror,
      attackSq: resolved.findIndex(q => q.role === 'attacker'),
      openTop: geo.openTop, floorY: geo.floorY,
    };
    // ---- SPECTRAL VEIL (Milestone 2): from region 3, up to two spirit-type
    // flyers cycle a shimmer that CHARGED shots phase straight through —
    // basic fire is the answer. The counterweight to armor: charge-spraying
    // a mixed wave now wastes the big shot exactly where armor rewards it.
    if (regionsIn >= 2 && !hasBoss) {
      const spirits = G.bricks.filter(b => b.flight && ['ghost', 'psychic', 'fairy', 'dark'].includes(b.poke.t) && !b.shellArmor);
      for (let i = 0; i < Math.min(2, spirits.length); i++) {
        spirits[i].specVeil = { ph: gameRand() * 3.4 };
      }
      if (spirits.length && !G.specVeilTaught) {
        G.specVeilTaught = true;
        setAnnounce('ghost', '#b39ddb', 'SPECTRAL VEIL',
          'SHIMMERING SPIRITS — CHARGE PASSES THROUGH · USE BASIC FIRE', 3.2);
      }
    }
    // ---- ROCK TOMB barriers (region 2+): curled-up boulder Pokémon drifting
    // between the flocks and your airspace. Normal bolts shatter ON them —
    // only a CHARGED shot cracks the rock. Living cover for the enemy.
    if (regionsIn >= 1) {
      const nB = Math.min(3, 1 + Math.floor(regionsIn / 3)) + (stage >= 1 ? 1 : 0) - 1;
      const rockId = [74, 75, 76][actIdx(lvl)];
      const by0 = geo.floorY - 26;
      for (let i = 0; i < nB; i++) {
        const bxx = W * (0.25 + (i + 0.5) / Math.max(1, nB) * 0.5);
        G.bricks.push({
          bx: bxx, by: by0 + (i % 2) * 18, hx: bxx, hy: by0 + (i % 2) * 18,
          row: 90, col: i, w: 46, h: 42,
          hp: 3 + Math.floor(regionsIn / 2), maxHp: 3 + Math.floor(regionsIn / 2),
          bare: true, barrier: { vx: (i % 2 ? 1 : -1) * (22 + regionsIn * 2) },
          poke: { id: rockId, t: 'rock' }, flash: 0, wobble: gameRand() * Math.PI * 2,
        });
      }
      getSprite(rockId);
    }
  }
  // late rounds shouldn't melt: reinforcement flights extend each wave,
  // arriving as pure flyers once the first formation falls
  G.reinforce = hasBoss ? 0 : (junkie ? (regionsIn >= 3 ? 2 : 1)
    : classic ? 0 : regionsIn >= 2 ? (regionsIn >= 5 ? 2 : 1) : 0);
  G.marchDir = gameRand() < 0.5 ? -1 : 1;
  // boxed bricks are a STATIC wall on every non-boss wave — only the Pokémon
  // move (bosses keep their guard-ring choreography)
  G.blocksStatic = !hasBoss;
  if (!junkie) G.encounter = null; // the choreography layer is junkie-only
  G.gridCols = cols;
  // Galaga peel-off dives: hinted on early challenge stages, constant later.
  // SPACE JUNKIE keeps region 1 calm — the flocks just fly their patterns;
  // dives (and squad maneuvers) only start once the journey hardens
  G.divers = classic ? false : junkie ? regionsIn >= 1 : (regionsIn >= 2 || (regionsIn >= 1 && stage >= 1));
  G.diveCD = 6;
  if (upgN('guard')) G.shieldCharges = Math.max(G.shieldCharges, upgN('guard'));
  // ---- wave modifier: guaranteed on challenge stages, never on a region's arrival ----
  G.modifier = stage === 1 && lvl >= 2
    ? MODIFIERS[Math.floor(gameRand() * MODIFIERS.length)]
    : (stage === 0 && lvl > STAGES && gameRand() < 0.25
      ? MODIFIERS[Math.floor(gameRand() * MODIFIERS.length)] : null);
  // ---- stage presentation ----
  if (hasBoss) {
    // gauntlet finales announce ROUND 1 instead — the legendary's own intro
    // card plays when it actually descends (round 2)
    G.bossIntro = G.gauntlet ? (junkie ? 2.8 : 0) : 1.6;
    SFX.roar();
  } else if (stage === 0) {
    // REGION INTRO (Milestone 1): arriving in a region is a milestone beat —
    // an authored hero card (title + tagline + flavour) with its own sting,
    // not just the stage banner. Acts still announce themselves on top.
    const actTag = regionsIn % 3 === 0 ? 'ACT ' + ACTS[actIdx(lvl)].n + ': ' + ACTS[actIdx(lvl)].name : null;
    const intro = REGION_INTROS[regionsIn % REGION_INTROS.length];
    setAnnounce(null, gen.accent, gen.name, intro ? intro.tag : 'STAGE 1/3 — ARRIVAL', 3.2,
      [actTag, intro && intro.sub].filter(Boolean).join('  ·  '), null, false, true);
    SFX.regionIntro();
  } else if (G.modifier) {
    const m = G.modifier;
    setAnnounce(m.icon, m.color, m.name, m.desc, 3.2,
      [gen.name + ' 2/3', form && form.name + ' FORMATION', theme.name].filter(Boolean).join(' · '));
  } else {
    setAnnounce(null, gen.accent, gen.name, 'STAGE 2/3 — CHALLENGE', 2.4,
      [form && form.name + ' FORMATION', theme.name].filter(Boolean).join(' · '));
  }
  // hard readability cap: random form-skips + stream squads can land the
  // walled modes a brick or two over budget — trim boxed filler to the cap
  if (!hasBoss && G.mode !== 'junkie') {
    const filler = G.bricks.filter(b => !b.isBoss && !b.armored && !b.flight && !b.veil);
    while (G.bricks.filter(b => !b.isBoss).length > 40 && filler.length) {
      const i = Math.floor(gameRand() * filler.length);
      G.bricks.splice(G.bricks.indexOf(filler[i]), 1);
      filler.splice(i, 1);
    }
  }
  assignClassicBrickBehaviors(regionsIn, stage);
  // Junkie waves fire as squads float in — EXCEPT a region's arrival wave,
  // which grants a 3.4s grace so the REGION INTRO hero card never covers
  // live fire (the lane-invariant contract) and arrival reads as a beat of
  // calm before the region's pressure starts.
  if (G.mode === 'junkie' && !hasBoss) G.enemyShotCD = stage === 0 ? 3.4 : 0.9;
  // ---- ENCOUNTER DIRECTOR (Milestone 3, junkie non-boss stages). Every
  // stage runs its region's authored beat script (encounterScript, data.js);
  // the director fires beats in order at their triggers and owns a live
  // threat multiplier. Boss stages keep their gauntlet choreography.
  G.director = null;
  if (G.mode === 'junkie' && !hasBoss) {
    const beats = encounterScript(lvl).map(b => ({ ...b, fired: false }));
    G.director = { beats, baseline: G.bricks.filter(b => !b.dead && !b.barrier).length,
      t: 0, lastFireT: 0, threatMul: 1, threatT: 0 };
  }
  // ---- STARFIGHTER FIRST-FLIGHT COACH: five one-line steps taught during
  // Kanto's opening waves (fly → tap fire → hold charge → grab an orb → mega).
  // Each step advances on the ACTION it teaches (progression in update.js,
  // pill in render.js), and the whole coach runs ONCE per install — a finished
  // course sets 'pkbrk-jcoach' and never returns. Knockout retries re-arm it
  // harmlessly (same wave, same steps).
  if (G.mode === 'junkie' && lvl === 1 && !G.trial && !G.daily && !loadStore('pkbrk-jcoach', 0)) {
    G.jCoach = { step: 1, doneT: 0, moved: 0, lastX: null, lastY: null };
  }
  // SPACE JUNKIE's Kanto challenge doubles as the CHARGE-SHOT tutorial
  if (G.mode === 'junkie' && lvl === 2) {
    setAnnounce('shield', '#4dd0e1', 'SHELL ARMOR!',
      'NORMAL BOLTS BOUNCE OFF THE ARMORED ONES', 3.6,
      IS_TOUCH ? 'HOLD THE FIRE PAD TO CHARGE A SHOT'
        : 'HOLD RIGHT-CLICK OR SHIFT TO CHARGE A SHOT');
  }
  // ---- starter evolution: the partner grows with the journey ----
  const sm = STARTER_MON[G.starter];
  if (sm) {
    const sLvl = starterStage(lvl, G.starter);
    if (sLvl > G.starterLvl) {
      const priorLvl = G.starterLvl;
      applyStarterTierUpgrade(priorLvl, sLvl);
      G.starterLvl = sLvl;
      G.justEvolved = true; // outranks the stage banner this wave
      getSprite(sm.ids[sLvl - 1]);
      SFX.mega();
      const sameForm = sm.ids[priorLvl - 1] === sm.ids[sLvl - 1];
      setAnnounce(G.starter, TYPE_COLORS[G.starter], sameForm
        ? sm.names[sLvl - 1] + ' UNLEASHED ' + sm.ability + ' ' + romanTier(sLvl) + '!'
        : sm.names[priorLvl - 1] + ' EVOLVED INTO ' + sm.names[sLvl - 1] + '!',
      sm.ability + ' ' + romanTier(sLvl) + ' — ' + sm.tiers[sLvl - 1], 3.4);
    }
  }
  if (junkie && pilotInfo().id > 0) getSprite(pilotInfo().id); // the pilot rig needs its sprite ready
  // per-wave web state: the reactor re-arms, lingering wells + rains clear,
  // the guardian and chorus get their one proc back, the squadron stands down
  G.reactorUsed = false; G.vortexes = []; G.meteorRain = null;
  G.guardPulsedWave = false; G.chorusUsed = false; G.squadT = 0; G.lanceT = 0;
  // arriving at a region's doorstep checkpoints the run (post-draft state —
  // buildLevel runs after every pick, and after knockout tree burns too)
  if (!G.trial && stage === 0) saveCheckpoint();
}

// a fresh attack flight arrives after the main formation falls — pure
// flyers, swooping in and going straight into a pattern (late-game only)
function spawnReinforcement() {
  const lvl = G.level, rIdx = regionIdx(lvl), regionsIn = Math.floor((lvl - 1) / STAGES);
  const gen = genFor(lvl);
  const p = preset();
  const junkie = G.mode === 'junkie';
  // SPACE JUNKIE reinforcements are the SECOND BEAT of the same encounter:
  // same ecology, same motion family, a harder variation — never a new
  // random mini-wave that resets the wave's visual language mid-fight
  const theme = (junkie && G.waveThemeObj) ? G.waveThemeObj : pickWaveTheme(regionIdx(lvl));
  const n = Math.min(16, 8 + regionsIn);
  const usable = W * 0.76;
  const kinds = ['ring', 'lane', 'chevron', 'arc', 'cross', 'carousel', 'swoop', 'diamond', 'helix', 'spiral', 'inf', 'liss', 'epi', 'rose', 'star', 'binary', 'vortex', 'zigzag', 'fountain', 'clover', 'butterfly'];
  const kind = (junkie && G.encounter && G.encounter.squads.length)
    ? G.encounter.squads[0].kind
    : kinds[Math.floor(gameRand() * Math.max(2, Math.min(kinds.length, 1 + regionsIn)))];
  const wrap = kind === 'swoop' || kind === 'helix' || kind === 'snake';
  const bw = G.brickW || 80, bh = G.brickH || 56;
  // keep reinforcement patterns in the same breathing-room airspace —
  // in SPACE JUNKIE they arrive as a small, tight, HIGH knot like the rest
  const ry = junkie ? Math.max(56, H * 0.09) : Math.max(80, H * 0.14);
  const floorY = PADDLE_Y() - flyerRoom(lvl);
  const cy0 = junkie
    ? Math.max(84 + ry, Math.min(H * 0.38, floorY - ry))
    : Math.max(84 + ry, Math.min(floorY - ry, 150 + Math.max(70, bh * 3)));
  const rw = junkie ? Math.min(56, Math.max(36, bw * 0.58)) : bw - Math.max(8, bw * 0.15);
  const rh = junkie ? Math.min(50, Math.max(32, bh * 0.82)) : bh;
  for (let i = 0; i < n; i++) {
    const rTier = i % 3 === 0 ? 3 : 2;
    const pool = themedPool(gen, rTier, theme);
    const [id, t] = pool[Math.floor(gameRand() * pool.length)];
    // reinforcements are all EVOLVED — bigger and tankier in junkie mode
    const rMul = junkie ? (rTier === 3 ? 1.5 : 1.25) : 1;
    const hp = Math.max(2, Math.round((2 + Math.floor(regionsIn / 2)) * p.brickHp * (junkie ? (rTier === 3 ? 1.7 : 1.25) : 1)));
    G.bricks.push({
      bx: i % 2 ? -70 : W + 70, by: -50 - (i % 5) * 24,
      hx: W / 2, hy: cy0, row: 0, col: i,
      w: rw * rMul, h: rh * rMul,
      hp, maxHp: hp,
      poke: { id, t },
      flash: 0, wobble: gameRand() * Math.PI * 2,
      entry: { t: 0.2 + i * 0.14, dur: 0.9, sx: i % 2 ? -70 : W + 70, sy: -50 - (i % 5) * 24 },
      flight: {
        kind, state: 2, launch: 0, sq: 99,
        cx: W / 2, cy: cy0, rx: wrap ? W / 2 + 90 : usable * (junkie ? 0.24 : 0.4), ry,
        spd: (wrap ? 1.7 : 1) * (junkie ? 1.2 : 1),
        phase: i / n, n, dir: 1, strand: i % 2,
      },
    });
  }
  G.fy = 0; G.fx = 0;
  SFX.roar();
  setAnnounce('swift', gen.accent, 'REINFORCEMENTS!', 'A FRESH FLIGHT SWOOPS IN — FINISH THEM', 2.6);
}

function resetRun(startLevel = 1, trial = false, opts = {}) {
  if (typeof resetTreeCamera === 'function') resetTreeCamera();
  setRunSeed(opts.seed == null ? null : opts.seed);
  const p = preset();
  G.score = 0; G.scoreShown = 0; G.comboPop = 0; G.lives = p.lives; G.livesMax = p.lives; G.level = startLevel; G.combo = 0;
  G.shotsFired = 0; G.playT = 0;
  G.maxCombo = 0; G.caughtRun = 0; G.dropHint = 0; G.healthDropPity = 0; G.megaCalloutDone = false; G.megaWasReady = false;
  G.rallyHintDone = false; G.bestRally = 0; G.barrierHintDone = false; G.coachStep = 0; G.jCoach = null;
  G.adapt = 1; G.mega = 0; G.megaT = 0; G.ballElement = null;
  G.fx_fire = G.fx_laser = G.fx_wide = G.fx_slow = G.fx_magnet = G.fx_score = G.fx_draco = null;
  G.shieldCharges = 0; G.shieldFlash = 0; G.surgeFlash = 0; G.hurtHud = 0; G.announce = null; G.announceQueue = []; G.combatNotice = null;
  G.upg = {}; G.path = {}; G.catchBonus = 0; G.upgradeChoices = null;
  G.calibReturns = 0; G.calibShots = 0; G.lensKills = 0; G.vortexes = [];
  G.salvageCount = 0; G.salvageStored = 0; G.rescueN = 0; G.reactiveCD = 0; G.reactorUsed = false;
  G.guardCharge = 0; G.guardPulsedWave = false; G.wingCD = 0; G.ascendT = 0; G.meteorRain = null;
  G.matrixCharge = 0; G.prismN = 0; G.prismReady = false;
  G.novaStage = 0; G.novaN = 0; G.novaT = 0;
  G.wallSeg = 0; G.wallCD = 0; G.cataCD = 0; G.lanceT = 0; G.cometSeeds = 0;
  G.facets = []; G.lastFacetVolley = -1; G.wallVolleyId = -1; G.wallVolleyCount = 0;
  G.chorusTypes = []; G.chorusUsed = false;
  G.syncMeter = 0; G.squadT = 0; G.squadCD = 0; G.railPressure = 0;
  G.celT = false; G.celS = false; G.celE = false; G.regenLockT = 0;
  G.webSeen = {}; G.lastOfferKeys = [];
  G.lastDraftForm = 1; // re-baselined below once starterLvl is known
  G.secret = freshSecretState();
  G.secretUpg = { heart: false, lens: false, echo: false }; G.secretHit = 0;
  G.heat = 0; G.overheat = 0; G.shieldRegenT = 10;
  G.charge = 0; G.chargeCD = 0; G.chargeFullT = 0;
  G.mode = SETTINGS.mode; // classic (ball) vs blaster (ball-less shooter)
  G.shipYv = PADDLE_Y(); G.maneuver = null; G.maneuverCD = 8;
  G.stacks = { orb: 0, ice: 0, bell: 0 }; G.attackAnim = 0; G.upgradeFx = null;
  // starter partner locks in at run start; its ability tier matches how far
  // into the journey this run begins
  G.starter = STARTER_MON[SETTINGS.starter] ? SETTINGS.starter : null;
  G.starterLvl = starterStage(startLevel, G.starter);
  G.lastDraftForm = webForm(); // a deep start is not a "fresh evolution"
  G.torrentCount = 0; G.starterHits = 0; G.starterKOs = 0; G.starterChillT = 0;
  G.justEvolved = false; G.ceremony = null;
  G.encounter = null; G.waveThemeObj = null; G.ending = null; G.guardSwapCD = 8;
  G.blasterTutDone = false; G.rescueCD = 0; G.veilHintCD = 0;
  G.chargedEver = false; G.chargeHintCD = 0; G.gauntlet = null; G.cheated = false;
  G.specVeilTaught = false; // re-teach the veil once per journey
  G.daily = !!opts.daily; G.runSeed = opts.seed || null; G.runStartLevel = startLevel;
  G.runStats = { bricksBroken: 0, bossesDefeated: 0, itemsCaught: 0, damageTaken: 0,
    knockouts: 0, levels: [], cur: null };
  G.runSummary = null; G.lastDamageCause = 'MISSED BALL'; G.shareToast = 0; G.uiTouchPulse = null;
  // trial runs are a sandbox: best score and Pokédex catches don't persist
  G.trial = trial;
  // Pokédex research bonuses apply once at the start of a true new journey.
  // Region resumes and trial jumps cannot repeatedly farm the start package.
  if (!trial && !G.daily && startLevel === 1) {
    if (dexRewardActive('fieldKit')) G.shieldCharges = 1;
    if (dexRewardActive('megaSpark')) G.mega = 0.25;
    if (dexRewardActive('veteran')) { G.lives++; G.livesMax++; }
  }
  // Partner opening bonuses apply after research rewards so both packages
  // stack predictably. Rock raises maximum HP; Steel begins shielded; Dragon
  // and the intentionally overpowered Pikachu line begin with Mega charge.
  const bonusHp = starterMod('bonusHp', 0);
  if (bonusHp) { G.lives += bonusHp; G.livesMax += bonusHp; }
  G.shieldCharges = Math.min(shieldCap(), G.shieldCharges + starterMod('shieldStart', 0));
  G.mega = Math.max(G.mega, starterMod('megaStart', 0));
  // starting deep? bank the skill-tree advances you'd have earned on the way.
  // The grant walks the WEB legally (paths, then any eligible bridge or
  // superskill at the right Form) so a trial jump lands on a connected build,
  // never a sprinkle of orphaned nodes. Exactly one gameRand() per level keeps
  // seeded runs deterministic.
  let granted = 0;
  if (startLevel > 1) {
    for (let i = 1; i < startLevel; i++) {
      const eligible = [
        ...PATH_KEYS.filter(k => pathLvl(k) < 4).map(k => ({ path: k })),
        ...WEB_BRIDGES.filter(bridgeEligible).map(b => ({ web: b.key })),
        ...WEB_FUSIONS.filter(fusionEligible).map(f => ({ web: f.key })),
        ...WEB_APEXES.filter(apexEligible).map(x => ({ web: x.key })),
      ];
      if (!eligible.length) break;
      const pick = eligible[Math.floor(gameRand() * eligible.length)];
      if (pick.path) advancePath(pick.path); else G.upg[pick.web] = 1;
      granted++;
    }
  }
  buildLevel(startLevel);
  serve();
  if (trial || G.daily) {
    const encounterCards = [G.announce, ...G.announceQueue].filter(Boolean);
    G.announce = null; G.announceQueue = [];
    if (G.daily) setAnnounce('star', '#ffd54f', 'DAILY CHALLENGE · ' + dailyDateKey(),
      'SAME WALLS · DROPS · STARTER · UPGRADES FOR EVERY PLAYER', 3.4,
      'LOCAL BEST ' + dailyBest() + ' · ONE SEEDED JOURNEY');
    else setAnnounce('swift', '#80d8ff', 'TRIAL MODE',
      genFor(startLevel).name + ' · ' + STAGE_NAMES[stageIdx(startLevel)] + ' — SCORE & CATCHES NOT SAVED', 3,
      granted ? granted + ' UPGRADES GRANTED FOR THE JOURNEY SO FAR' : null);
    encounterCards.forEach(a => setAnnounce(a.icon, a.color, a.name, a.desc, a.max, a.sub, a.spriteId, a.spriteShiny));
  }
}
function startDailyRun() {
  SETTINGS.mode = 'classic'; SETTINGS.preset = 'normal'; SETTINGS.starter = 'fire';
  resetRun(1, false, { daily: true, seed: dailySeed() });
}
function serve() {
  // starter partner: its type rides the ball (or the blaster) from the start.
  // SPACE JUNKIE never seeds it: there, G.ballElement is only ever a
  // TEMPORARY override — when it expires, attackElement() falls back to the
  // pilot's innate type, so every type change reverts to base on its own.
  if (G.mode !== 'junkie' && G.starter && !G.ballElement) {
    G.ballElement = G.starter;
    G.ballElementT = 9999;
  }
  // shooter modes (BLASTER / SPACE JUNKIE): no ball at all — the wave is
  // live immediately, your fire is the whole game
  if (G.mode !== 'classic') {
    G.balls = [];
    G.charge = 0;
    G.state = 'play'; G.stateT = 0;
    return;
  }
  G.balls = [makeBall(G.paddle.x, PADDLE_Y() - 24)];
  G.balls[0].stuck = true;
  G.state = 'serve'; G.stateT = 0;
}

// ============================================================
//  PARTICLES, FLOATERS, FRAGMENTS, GHOSTS
// ============================================================
function burst(x, y, color, n = 18, speed = 260, life = 0.7) {
  for (let i = 0; i < n; i++) {
    if (G.particles.length > 450) break;
    const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.5 + Math.random() * 0.5), maxLife: life,
      color, r: 2 + Math.random() * 3.5,
    });
  }
}
function addFloater(x, y, text, color, size = 16) {
  // Nearby rewards used to print directly on top of one another (rally, type,
  // score, and power-up text could all land on the same ball). Give each local
  // burst a tiny vertical lane and cap the transient queue.
  const nearby = G.floaters.filter(f => f.life > 0.45 && Math.abs(f.x - x) < 90 && Math.abs(f.y - y) < 72).length;
  G.floaters.push({ x, y: Math.max(28, y - nearby * 20), text, color, size, life: 1.1 });
  if (G.floaters.length > 14) G.floaters.splice(0, G.floaters.length - 14);
}
// expanding shockwave ring — the modern "kill pop". Additive, cheap, capped.
function ringFx(x, y, color, r0 = 6, r1 = 40, lw = 3, life = 0.38) {
  if (G.rings.length > 24) return;
  G.rings.push({ x, y, color, r0, r1, lw, life, maxLife: life });
}
// bright 4-point sparkle glints — the premium "twinkle" on kills / catches /
// shinies. Flagged particles, drawn additively as a cached glint sprite.
function sparkle(x, y, n = 4, gold = false) {
  for (let i = 0; i < n; i++) {
    if (G.particles.length > 450) break;
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
      life: 0.4 + Math.random() * 0.4, maxLife: 0.8,
      color: gold ? '#fff3b0' : '#ffffff', r: 7 + Math.random() * 7,
      glint: true, rot: Math.random() * Math.PI,
    });
  }
}
// the box ALONE shatters — four tumbling corner fragments, no fainting
// sprite. Used when a Pokémon breaks out of its brick and flies on.
function shatterBox(br, x, y) {
  if (G.fragments.length >= 80) return;
  const col = TYPE_COLORS[br.poke.t];
  const hw = br.w / 2, hh = br.h / 2;
  for (const [ox, oy] of [[-hw / 2, -hh / 2], [hw / 2, -hh / 2], [-hw / 2, hh / 2], [hw / 2, hh / 2]]) {
    G.fragments.push({
      x: x + ox, y: y + oy, w: hw, h: hh,
      vx: ox * 6 + (Math.random() - 0.5) * 120,
      vy: oy * 6 - 140 - Math.random() * 120,
      rot: 0, vr: (Math.random() - 0.5) * 12,
      color: col, life: 0.85, maxLife: 0.85,
    });
  }
}
// a KO effect. A BOXED brick shatters its card (tumbling corner fragments) and
// the sprite faints. A BARE free-flyer has no box to break — it just FAINTS:
// the sprite spins away in an arc with a puff of sparks, no card fragments.
function shatterBrick(br, x, y, bare) {
  if (!bare) shatterBox(br, x, y);
  if (G.ghosts.length < 14 && br.poke.id > 0) {
    G.ghosts.push({
      id: br.poke.id, shiny: br.shiny, x, y,
      s: br.h * (br.isBoss ? 1.9 : 1.3), // a fainting legendary falls LARGE
      vr: (Math.random() - 0.5) * (bare ? 7 : 3), rot: 0,
      life: bare ? 0.5 : 0.6, maxLife: bare ? 0.5 : 0.6,
      faint: bare, vy: bare ? -150 : 0,
    });
  }
  if (bare) { // a puff of white/gold sparks reads as a KO, not a broken block
    for (let i = 0; i < 12; i++) {
      if (G.particles.length > 450) break;
      const a = Math.random() * Math.PI * 2, s = 130 + Math.random() * 200;
      G.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        life: 0.35 + Math.random() * 0.3, maxLife: 0.65,
        color: i % 2 ? '#ffffff' : '#fff59d', r: 1.4 + Math.random() * 2,
      });
    }
  }
}

// ============================================================
//  THE NINEFOLD DAWN — campaign completion (design: WORLD_BOSS_FINALE_PLAN)
// ============================================================
// Clearing stage 27 on a real journey ends the campaign. The completion
// record is written UP FRONT so no crash or reload can ever lose the clear,
// and the region checkpoint survives untouched until that write has landed.
let VICTORY_REC = (v => (v && typeof v === 'object') ? v : {})(loadStore('pkbrk-victory', '{}'));
function beginEnding() {
  // the arena goes still: hostile state dies instantly, damage is over
  G.enemyShots = []; G.telegraphs = []; G.columnStrikes = []; G.lasers = [];
  G.powerups = []; G.freeze = 0; G.dramaticT = 0; G.flashT = 0; G.shake = 0;
  G.announce = null; G.announceQueue = []; G.combatNotice = null;
  finalizeRun(); // snapshot score/catches/path into G.runSummary
  const s = G.runSummary || {};
  const seenBefore = !!VICTORY_REC.everSeen;
  VICTORY_REC.v = 1;
  VICTORY_REC.everSeen = true;
  VICTORY_REC[G.mode + ':' + SETTINGS.preset] = {
    date: dailyDateKey(), score: G.score, starter: G.starter || 'none',
    partnerLvl: G.starterLvl, catches: G.caughtRun,
    bosses: (G.runStats && G.runStats.bossesDefeated) || 0,
    path: s.path || null, rift: !!(G.secret && G.secret.completed),
    playT: Math.round(G.playT || 0),
  };
  saveStore('pkbrk-victory', VICTORY_REC);
  // the night sky pre-shatters into FEW, LARGE, deliberate glass shards —
  // this is a set piece, not a particle burst (deterministic, no Date/random)
  const shards = [];
  for (let i = 0; i < 40; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const h2 = Math.abs(Math.sin(i * 78.233) * 12543.8567) % 1;
    shards.push({
      u: h1, v: h2 * 0.8, // screen-fraction position
      vx: (h1 - 0.5) * 60, vy: 40 + h2 * 130, rot: h1 * Math.PI, vr: (h2 - 0.5) * 1.6,
      r: 26 + h1 * 60, sides: 3 + Math.floor(h2 * 3),
    });
  }
  G.ending = { t: 0, beat: 1, seenBefore, shards, sfx: {}, done: false };
  G.state = 'ending'; G.stateT = 0;
}
// beat boundaries in seconds — beat 5 holds until the player chooses
const ENDING_BEATS = [3, 8, 19, 27, 33];
// the explicit New Game+ choice: the old post-27 loop, now opt-in
function beginTimeSpiral() {
  G.ending = null;
  G.level = 28;
  G.state = 'upgrade'; G.stateT = 0;
  G.clearedStage = 2;
  rollUpgradeChoices();
  upgradeTreeOpen = G.mode === 'junkie' && !!G.upgradeChoices && G.upgradeChoices.every(x => x.pathKey || x.web || x.stack);
  if (upgradeTreeOpen) syncTreeSelectionToDraft();
  draftSel = null; G.rerolled = false;
  setAnnounce('warp', '#d780ff', 'TIME SPIRAL', 'THE JOURNEY LOOPS — HARDER SKIES AHEAD', 3.2);
}
// shared geometry: render draws these, input hit-tests them
function endingButtons() {
  const w = Math.min(240, W * 0.42), h = 46, gap = 14;
  const y = H * 0.84;
  return {
    spiral: { x: W / 2 - w - gap / 2, y, w, h },
    title: { x: W / 2 + gap / 2, y, w, h },
  };
}
