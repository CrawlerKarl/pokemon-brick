'use strict';
// ============================================================
//  GAME STATE
// ============================================================
const MEGA_DUR = 5;      // Mega Evolution duration in seconds
// skill-tree-aware caps (capstones raise them)
function shieldCap() { return 3 + 2 * upgN('bulwark'); }
function megaDur() { return upgN('megaX') ? 9 : upgN('blaze') ? 7 : MEGA_DUR; }
function barrierCharges() { return 2 + (upgN('rally') ? 1 : 0); }
const OVERHEAT_DUR = 2.0; // blaster lockout after overheating, in seconds
// ---- SPACE JUNKIE pilots: in junkie mode your starter IS the ship (Pikachu
// if you fly without a partner). The attack's SHAPE follows the pilot's
// species; its COLOR + type follow the CURRENT element, so a Charmeleon
// riding a grass element shoots green fire.
const PILOT_NONE = { ids: [25, 25, 26], names: ['PIKACHU', 'PIKACHU', 'RAICHU'] };
function pilotInfo() {
  const sm = STARTER_MON[G.starter];
  if (sm) return { id: sm.ids[G.starterLvl - 1], t: G.starter,
    shape: G.starter === 'fire' ? 'flame' : G.starter === 'water' ? 'aqua' : 'leaf' };
  return { id: PILOT_NONE.ids[G.starterLvl - 1], t: 'electric', shape: 'volt' };
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
// a true game-over (empty skill tree) clears it. Trial runs never save.
let RUN_CKPT = (v => (v && typeof v === 'object' && v.v === 1 && v.lvl >= 4) ? v : null)(loadStore('pkbrk-run', 'null'));
function saveCheckpoint() {
  RUN_CKPT = {
    v: 1, lvl: G.level, score: G.score, lives: G.lives, mode: G.mode,
    starter: G.starter, starterLvl: G.starterLvl,
    path: { ...G.path }, upg: { ...G.upg }, stacks: { ...G.stacks },
    catchBonus: G.catchBonus, caughtRun: G.caughtRun, adapt: G.adapt,
    preset: SETTINGS.preset,
  };
  saveStore('pkbrk-run', RUN_CKPT);
}
function clearCheckpoint() { RUN_CKPT = null; saveStore('pkbrk-run', null); }
function resumeRun() {
  const c = RUN_CKPT;
  if (!c) return;
  SETTINGS.mode = MODES.some(m => m.key === c.mode) ? c.mode : 'classic';
  SETTINGS.starter = STARTER_MON[c.starter] ? c.starter : 'none';
  if (PRESETS[c.preset]) SETTINGS.preset = c.preset;
  saveSettings();
  resetRun(c.lvl, false);
  // resetRun granted a random tree for the deep start — overwrite with the
  // REAL run state from the checkpoint
  G.score = c.score; G.lives = Math.max(1, c.lives);
  G.path = { ...c.path }; G.upg = { ...c.upg };
  G.stacks = Object.assign({ orb: 0, ice: 0, bell: 0 }, c.stacks);
  G.catchBonus = c.catchBonus || 0; G.caughtRun = c.caughtRun || 0;
  G.adapt = c.adapt || 1; G.starterLvl = c.starterLvl || starterStage(c.lvl);
  setAnnounce('swift', '#80d8ff', 'JOURNEY RESUMED',
    genFor(c.lvl).name + ' · WAVE ' + c.lvl + ' — WELCOME BACK', 3,
    'SAVED AT EVERY REGION · GAME OVER CLEARS THE SAVE');
}
const G = {
  state: 'menu',
  score: 0, best: Math.max(0, +loadStore('pkbrk-best', '0') || 0),
  lives: 3, livesMax: 3, level: 1, combo: 0, // livesMax = ring denominator (peak lives held)
  paddle: { x: 0, w: 130, h: 18, speed: 0, squash: 0 },
  balls: [], bricks: [], powerups: [], lasers: [], missiles: [], enemyShots: [],
  particles: [], floaters: [], fragments: [], ghosts: [], rings: [],
  scoreShown: 0, comboPop: 0, // HUD juice: counting score + combo pop-scale
  announce: null, modifier: null,
  fx: 0, fy: 0, swayT: 0,
  brickW: 0, brickH: 0,
  shake: 0, flashT: 0, stateT: 0,
  freeze: 0, dramaticT: 0, bossIntro: 0,
  laserCD: 0, blasterCD: 0, missileCD: 0, invuln: 0, seCD: 0,
  enemyShotCD: 6, bossShotCD: 4,
  time: 0,
  adapt: 1, deathsThisWave: 0,
  mega: 0, megaT: 0,
  shotsFired: 0, playT: 0,
  maxCombo: 0, caughtRun: 0, dropHint: 0, megaCalloutDone: false,
  rallyHintDone: false, bestRally: 0, barrierHintDone: false,
  highGroundDone: false, waveFirstKill: false, elementOrbCD: 10,
  trial: false,
  // starter partner: which one, its ability tier, Torrent's return counter
  starter: null, starterLvl: 1, torrentCount: 0, justEvolved: false,
  ceremony: null, // act-boundary evolution ceremony (end of Hoenn / Kalos)
  encounter: null, // SPACE JUNKIE choreography: one authored encounter per wave
  guardSwapCD: 8, waveThemeObj: null,
  motionTier: 0, motionStyle: 'march',
  marchDir: 1, divers: false, diveCD: 6, gridCols: 10, pathSpeed: 0.04,
  blocksStatic: false, // boxed bricks are anchored; only the Pokémon move
  mode: 'classic',     // 'classic' (ball) or 'blaster' (ball-less pure shooter)
  charge: 0, chargeCD: 0, // BLASTER mode: hold to charge a heavy shot
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
  shieldFlash: 0,           // shield bubble flare when a charge absorbs a hit
  hurtHud: 0,               // shows the health bar AROUND the player briefly after a hit
  // blaster heat: firing builds it, paddle returns vent it, 100% = overheat
  heat: 0, overheat: 0,
  upg: {}, path: {}, catchBonus: 0, upgradeChoices: null, clearedStage: 0,
  shieldRegenT: 10,
  telegraphs: [],           // pre-shot warning markers
  gustT: 0, timeWarpT: 0,   // Lugia / Dialga signature effects
  columnStrikes: [],        // Zekrom / Eternatus warned beams
};
let dexScroll = 0, dexDragY = null, dexDragStart = 0;
// FLOOR = bottom of the playable area, above any phone home-indicator;
// on touch screens the paddle rides higher so fingers don't cover it
const FLOOR = () => H - SAFE_B;
// on touch the paddle rides well ABOVE the corner buttons — no overlap
const PADDLE_Y = () => FLOOR() - (IS_TOUCH ? 124 : 64);
const DANGER_Y = () => PADDLE_Y() - 86;
const ballSp = () => diff().ballSpeed;
// CLASSIC keeps the ball as THE weapon — the blaster is earned, never default.
// It arms only once you draft an offense path (VOLLEY / IMPACT), grab a LASER
// power-up, or pop Mega. The shooter modes (blaster / junkie) are always armed.
function blasterArmed() {
  if (G.mode !== 'classic') return true;
  if (G.fx_laser || G.megaT > 0) return true;
  return PATH_KEYS.some(k => PATHS[k].family === 'offense' && pathLvl(k) > 0);
}

function romanTier(t) { return t >= 3 ? 'III' : t === 2 ? 'II' : ''; }
function setAnnounce(icon, color, name, desc, dur = 2.0, sub = null, spriteId = null, spriteShiny = false) {
  G.announce = { icon, color, name, desc, sub, t: dur, max: dur, spriteId, spriteShiny };
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
      // first laser of a classic run = the blaster tutorial moment
      if (G.mode === 'classic' && !G.blasterTutDone) {
        G.blasterTutDone = true;
        setAnnounce('laser', '#4dd0e1', 'BLASTER ARMED!',
          (IS_TOUCH ? 'HOLD THE FIRE PAD' : 'HOLD CLICK') + ' — BOLTS BREAK THE ENERGY VEILS', 3.6);
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
  setAnnounce(p.icon, p.color, p.name + (tier > 1 ? '  ' + romanTier(tier) : ''), p.desc, 2.0, sub);
}

// ============================================================
//  ENTITY FACTORIES
// ============================================================
function makeBall(x, y, angle, overrideAngle) {
  const sp = ballSp();
  const a = overrideAngle != null ? overrideAngle : (angle != null ? angle : -Math.PI / 2 + (Math.random() - 0.5) * 0.6);
  return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, stuck: false, dead: false, trail: [], rally: 0, aboveWall: false, zoneSaves: barrierCharges(), ember: 0 };
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
  { arrival: { family: 'carousel', squads: [
      { kind: 'ring', rx: 1, ry: 1, cy: 0.5, spd: 0.8, role: 'wing', share: 3 },
      { kind: 'ring', rx: 0.4, ry: 0.4, cy: 0.5, spd: 0.8, ph: 0.5, role: 'core', share: 1 }] },
    challenge: { family: 'twinCurrent', squads: [
      { kind: 'weave', rx: 1, ry: 0.45, cy: 0.32, spd: 1, role: 'core' },
      { kind: 'weave', rx: 1, ry: 0.45, cy: 0.64, spd: 1, ph: 0.18, role: 'attacker' }] } },
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
      { kind: 'weave', rx: 1, ry: 0.34, cy: 0.22, spd: 1.05, role: 'core' },
      { kind: 'weave', rx: 1, ry: 0.34, cy: 0.5, spd: 1.05, ph: 0.33, role: 'wing' },
      { kind: 'weave', rx: 1, ry: 0.34, cy: 0.78, spd: 1.05, ph: 0.66, role: 'attacker' }] } },
  { arrival: { family: 'nestedCarousel', squads: [
      { kind: 'ring', rx: 1, ry: 1, cy: 0.5, dir: 1, spd: 0.7, role: 'wing' },
      { kind: 'ring', rx: 0.64, ry: 0.64, cy: 0.5, dir: -1, spd: 0.7, role: 'core' },
      { kind: 'ring', rx: 0.34, ry: 0.34, cy: 0.5, dir: 1, spd: 0.7, ph: 0.5, role: 'elite' }] },
    challenge: { family: 'bloom', morph: 'bloom', squads: [
      { kind: 'ring', rx: 0.9, ry: 0.9, cy: 0.5, spd: 0.75, role: 'core', share: 2 },
      { kind: 'ring', rx: 0.5, ry: 0.5, cy: 0.5, dir: -1, spd: 0.75, role: 'attacker' }] } },
  // ---- ACT 3 · MASTERY ----
  { arrival: { family: 'binaryMoons', squads: [
      { kind: 'ring', rx: 0.42, ry: 0.6, cx: -0.24, cy: 0.42, spd: 0.9, role: 'core' },
      { kind: 'ring', rx: 0.2, ry: 0.3, cx: -0.24, cy: 0.42, dir: -1, spd: 0.9, role: 'wing' },
      { kind: 'ring', rx: 0.42, ry: 0.6, cx: 0.24, cy: 0.58, spd: 0.9, ph: 0.5, role: 'orbit' },
      { kind: 'ring', rx: 0.2, ry: 0.3, cx: 0.24, cy: 0.58, dir: -1, spd: 0.9, ph: 0.5, role: 'attacker' }] },
    challenge: { family: 'eclipse', morph: 'eclipse', squads: [
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
function buildLevel(lvl) {
  G.bricks = []; G.powerups = []; G.lasers = []; G.missiles = []; G.enemyShots = [];
  G.fragments = []; G.ghosts = []; G.telegraphs = []; G.columnStrikes = []; G.rings = [];
  G.fx = 0; G.fy = 0; G.swayT = 0;
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
  // formation spawns with real headroom above it — the high-ground rally zone
  // is a playable space from the first serve, not something you wait for
  let gridTop = Math.max(110, Math.min(190, Math.round(H * 0.15)));
  // ---- BOSS (legendary stage only — the finale of each region) ----
  if (hasBoss) {
    const bossW = Math.min(bw * 2.1, W * 0.46), bossH = bh * 1.85;
    const bossY = 102 + bossH / 2;
    // real boss-fight durability: three phases need room to breathe
    const bossHp = Math.max(9, Math.round((19 + rIdx * 9 + cycle * 32) * p.bossHp));
    G.bricks.push({
      bx: W / 2, by: bossY, w: bossW, h: bossH,
      hx: W / 2, hy: bossY, row: -1, col: -1,
      hp: bossHp, maxHp: bossHp, phase: 1,
      poke: { id: gen.boss.id, n: gen.boss.n, t: gen.boss.t },
      isBoss: true, flash: 0, wobble: Math.random() * Math.PI * 2,
      abilityCD: (BOSS_ABILITIES[gen.boss.id]?.cd || 8) * 0.7,
    });
    gridTop = bossY + bossH / 2 + 26;
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
  const form = stage === 1 ? FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)]
    : stage === 0 && Math.random() < 0.45 ? MILD_FORMS[Math.floor(Math.random() * MILD_FORMS.length)]
    : null;
  const maxRows = Math.max(2, Math.floor((H * 0.58 - gridTop) / pitchY));
  // ---- DENSITY BUDGET: keep the board readable so the ball is never lost.
  // Free-FLYERS (moving, individual Pokémon) are HARD-CAPPED, and the BOXED
  // wall SHRINKS as the journey shifts toward flyers — always a balance,
  // never a wall AND a swarm at once. Streams (below) are pure flyers that
  // spend part of the flyer budget, arriving already broken out.
  const streamSquads = !hasBoss && regionsIn >= 4 ? (regionsIn >= 7 ? 2 : 1) : 0;
  const streamPer = Math.min(8, 4 + Math.floor(regionsIn / 2));
  const flyerBudget = hasBoss ? 0 : Math.min(22, regionsIn === 0 ? 0 : Math.round(4.5 + regionsIn * 1.85));
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
    const [id, t] = pool[Math.floor(Math.random() * pool.length)];
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
        hp, maxHp: hp, armored,
        poke: { id, t },
        flash: 0, wobble: Math.random() * Math.PI * 2,
      };
      // easter eggs: glitch block (very rare) > shiny (1/64) > ditto disguise (1/45)
      const roll = Math.random();
      if (roll < 1 / 220) { brick.poke = { id: -1, t: 'normal' }; brick.hp = brick.maxHp = 1; }
      else if (roll < 1 / 220 + 1 / 64) { brick.shiny = true; getSprite(id, true); }
      else if (roll < 1 / 220 + 1 / 64 + 1 / 45) { brick.isDitto = true; }
      G.bricks.push(brick);
    }
  }
  G.enemyShotCD = 5;
  G.bossShotCD = 4;
  G.maneuver = null; G.maneuverCD = 8;
  G.deathsThisWave = 0;
  G.dangerWarned = false;
  G.heat = 0; G.overheat = 0;
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
  G.motionStyle = regionsIn >= 1 && Math.random() < 0.5 ? 'serpent' : 'march';
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
  if (!junkie && !hasBoss && regionsIn >= 1) {
    // how many break out of the wall is set by the density budget (above),
    // never a runaway fraction — the boxed wall keeps a real presence
    const pool2 = G.bricks.filter(b => !b.armored && !b.isBoss);
    for (let i = pool2.length - 1; i > 0; i--) { // shuffle
      const j = Math.floor(Math.random() * (i + 1));
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
      let k = kinds[Math.floor(Math.random() * kinds.length)];
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
      const [id, t] = tierPool[Math.floor(Math.random() * tierPool.length)]; // one species — reads as a flock
      const hp = Math.max(1, Math.round((1 + Math.floor(regionsIn / 2)) * p.brickHp));
      const edge = Math.random() < 0.5 ? 'left' : 'right';
      for (let j = 0; j < count; j++) {
        const sx = edge === 'left' ? -60 - j * 44 : W + 60 + j * 44;
        const sy = geo.openTop + si * 30 + (j % 3) * 22;
        G.bricks.push({
          bx: sx, by: sy, hx: sx, hy: sy, row: 0, col: j,
          w: bw - gapX, h: bh, hp, maxHp: hp,
          poke: { id, t }, flash: 0, wobble: Math.random() * Math.PI * 2,
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
    G.bricks = G.bricks.filter(b2 => b2.isBoss);
    const nG = Math.min(12, 10 + (regionsIn >= 5 ? 2 : 0));
    const perWing = nG / 2;
    const gw = Math.min(52, Math.max(IS_TOUCH ? 40 : 34, bw * 0.55));
    const gh = Math.min(46, Math.max(IS_TOUCH ? 35 : 30, bh * 0.78));
    const gHp = Math.max(1, Math.round((1.4 + regionsIn * 0.5 + cycle * 2) * p.brickHp));
    // one species per wing — two mirrored flocks, not a species salad
    const gPool = themedPool(gen, regionsIn >= 4 ? 2 : 1, theme);
    const wingSpecies = [gPool[Math.floor(Math.random() * gPool.length)],
      gPool[Math.floor(Math.random() * gPool.length)]];
    for (let i = 0; i < nG; i++) {
      const side = i % 2 ? 1 : -1, idx = Math.floor(i / 2);
      const [gid, gt] = wingSpecies[i % 2];
      const sx0 = W / 2 + side * (W / 2 + 70 + idx * 44);
      G.bricks.push({
        bx: sx0, by: 70 + idx * 26, hx: sx0, hy: 70 + idx * 26, row: 0, col: i,
        w: gw, h: gh, hp: gHp, maxHp: gHp, bare: true,
        guard: { side, sideF: side, targetSide: side, idx, n: perWing },
        poke: { id: gid, t: gt }, flash: 0, wobble: Math.random() * Math.PI * 2,
      });
      getSprite(gid);
    }
    G.encounter = { family: 'bossWings', act: actIdx(lvl) + 1, actBeat: 'climax', t: 0, squads: [], attackSq: -1 };
    G.guardSwapCD = 8;
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
    const mirror = Math.random() < 0.5 ? -1 : 1; // authored grammar, mirrored variety
    const resolved = [];
    for (let s = 0; s < C.squads.length; s++) {
      const q = C.squads[s];
      const g = {
        kind: q.kind, kind2: q.kind2 || null,
        cx: W / 2 + (q.cx || 0) * usable * mirror,
        cy: geo.openTop + (q.cy ?? 0.5) * band,
        rx: usable * 0.34 * (q.rx || 1),
        ry: band * 0.48 * (q.ry || 1),
        dir: (q.dir || 1) * mirror, spd: q.spd || 1, ph: q.ph || 0, role: q.role || 'core',
      };
      clampOpen(g, geo.openTop, geo.floorY);
      // squad-level INGRESS: the whole formation floats in as ONE body —
      // members hold their pattern slots the entire way (like a flight of
      // ships arriving already in formation), no per-rider pile-up + shove
      const inSide = Math.sign(g.cx - W / 2) || (s % 2 ? 1 : -1);
      resolved.push({
        ...g, cx0: g.cx, cy0: g.cy, rx0: g.rx, ry0: g.ry,
        inDx: inSide * (W / 2 + g.rx + 140), inDy: -70 - s * 24,
        inDelay: s * 0.55, inDur: 1.8,
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
      const minGap = Math.min(mw, mh) * sizeMul * 1.45;
      const closed = g.kind === 'ring' || g.kind === 'oval' || g.kind === 'diamond';
      const span = closed ? Math.PI * Math.sqrt(2 * (g.rx * g.rx + g.ry * g.ry))
        : g.rx * 2 * 1.6; // open spans: width plus travel slack
      perS = Math.max(3, Math.min(perS, Math.floor(span / minGap)));
      const pool3 = themedPool(gen, tier, theme); // same ecology, tier by tier
      const [id, t] = pool3[Math.floor(Math.random() * pool3.length)]; // one species per squad
      const hp = Math.max(1, Math.round((1 + (tier - 1) * 1.6 + regionsIn * 0.45 + cycle * 2) * p.brickHp));
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
        const p0 = flightPos({
          kind: g.kind, cx: g.cx + R.inDx, cy: Math.max(40, g.cy + R.inDy),
          rx: g.rx, ry: g.ry, spd: g.spd,
          phase: j / perS + (g.ph || 0), n: perS, dir: g.dir, strand: j % 2,
        }, 0);
        const sx = p0.x, sy = p0.y;
        G.bricks.push({
          bx: sx, by: sy, hx: sx, hy: sy, row: s, col: j,
          w: mw * sizeMul, h: mh * sizeMul, hp, maxHp: hp,
          shellArmor: shellFor(j) || undefined,
          poke: { id, t }, flash: 0, wobble: Math.random() * Math.PI * 2,
          flight: {
            kind: g.kind, state: 2, t: 0, sx, sy, sq: s, launch: 0,
            cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry, spd: g.spd,
            phase: j / perS + (g.ph || 0), n: perS, dir: g.dir, strand: j % 2,
          },
        });
      }
    }
    G.encounter = {
      family: C.family, act: actIdx(lvl) + 1,
      actBeat: stage === 0 ? 'establish' : 'escalate',
      morph: C.morph || null, rotateAttack: C.rotateAttack || 0, t: 0,
      squads: resolved, mirror,
      attackSq: resolved.findIndex(q => q.role === 'attacker'),
      openTop: geo.openTop, floorY: geo.floorY,
    };
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
          poke: { id: rockId, t: 'rock' }, flash: 0, wobble: Math.random() * Math.PI * 2,
        });
      }
      getSprite(rockId);
    }
  }
  // late rounds shouldn't melt: reinforcement flights extend each wave,
  // arriving as pure flyers once the first formation falls
  G.reinforce = !hasBoss && (junkie ? (regionsIn >= 3 ? 2 : 1)
    : regionsIn >= 2 ? (regionsIn >= 5 ? 2 : 1) : 0);
  G.marchDir = Math.random() < 0.5 ? -1 : 1;
  // boxed bricks are a STATIC wall on every non-boss wave — only the Pokémon
  // move (bosses keep their guard-ring choreography)
  G.blocksStatic = !hasBoss;
  if (!junkie) G.encounter = null; // the choreography layer is junkie-only
  G.gridCols = cols;
  // Galaga peel-off dives: hinted on early challenge stages, constant later.
  // SPACE JUNKIE keeps region 1 calm — the flocks just fly their patterns;
  // dives (and squad maneuvers) only start once the journey hardens
  G.divers = junkie ? regionsIn >= 1 : (regionsIn >= 2 || (regionsIn >= 1 && stage >= 1));
  G.diveCD = 6;
  if (upgN('guard')) G.shieldCharges = Math.max(G.shieldCharges, upgN('guard'));
  // ---- wave modifier: guaranteed on challenge stages, never on a region's arrival ----
  G.modifier = stage === 1 && lvl >= 2
    ? MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)]
    : (stage === 0 && lvl > STAGES && Math.random() < 0.25
      ? MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)] : null);
  // ---- stage presentation ----
  if (hasBoss) {
    G.bossIntro = 1.6;
    SFX.roar();
  } else if (stage === 0) {
    // a region that OPENS an act carries the act name on its banner
    const actTag = regionsIn % 3 === 0 ? 'ACT ' + ACTS[actIdx(lvl)].n + ': ' + ACTS[actIdx(lvl)].name : null;
    setAnnounce(null, gen.accent, gen.name, 'STAGE 1/3 — ARRIVAL', 2.6,
      [actTag, form && form.name + ' FORMATION', theme.name].filter(Boolean).join(' · '));
  } else if (G.modifier) {
    const m = G.modifier;
    setAnnounce(m.icon, m.color, m.name, m.desc, 3.2,
      [gen.name + ' 2/3', form && form.name + ' FORMATION', theme.name].filter(Boolean).join(' · '));
  } else {
    setAnnounce(null, gen.accent, gen.name, 'STAGE 2/3 — CHALLENGE', 2.4,
      [form && form.name + ' FORMATION', theme.name].filter(Boolean).join(' · '));
  }
  // ---- ENERGY VEILS (classic challenge waves): cyan casings the BALL can't
  // crack — only blaster-family fire (bolts, support lasers, missiles) breaks
  // them. Kanto's challenge wave doubles as the blaster tutorial: it always
  // seeds a LASER drop (damageBrick) and an emergency one if you're stranded.
  if (G.mode === 'classic' && !hasBoss && stage === 1) {
    const vPool = G.bricks.filter(b => !b.isBoss && !b.armored && !b.flight);
    for (let i = vPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vPool[i], vPool[j]] = [vPool[j], vPool[i]];
    }
    const nV = Math.min(vPool.length, lvl === 2 ? 3 : Math.min(6, 2 + Math.floor(regionsIn / 2)));
    for (let i = 0; i < nV; i++) vPool[i].veil = true;
    if (lvl === 2) setAnnounce('laser', '#4dd0e1', 'ENERGY VEILS!',
      'THE BALL BOUNCES OFF THE GLOWING CASINGS', 3.4,
      'CATCH A LASER DROP — ARM YOUR BLASTER TO BREAK THEM');
  }
  // SPACE JUNKIE's Kanto challenge doubles as the CHARGE-SHOT tutorial
  if (G.mode === 'junkie' && lvl === 2) {
    setAnnounce('shield', '#4dd0e1', 'SHELL ARMOR!',
      'NORMAL BOLTS BOUNCE OFF THE ARMORED ONES', 3.6,
      IS_TOUCH ? 'DOUBLE-TAP + HOLD THE FIRE PAD TO CHARGE A SHOT'
        : 'HOLD RIGHT-CLICK OR SHIFT TO CHARGE A SHOT');
  }
  // ---- starter evolution: the partner grows with the journey ----
  const sm = STARTER_MON[G.starter];
  if (sm) {
    const sLvl = starterStage(lvl);
    if (sLvl > G.starterLvl) {
      G.starterLvl = sLvl;
      G.justEvolved = true; // outranks the stage banner this wave
      getSprite(sm.ids[sLvl - 1]);
      SFX.mega();
      setAnnounce(G.starter, TYPE_COLORS[G.starter],
        sm.names[sLvl - 2] + ' EVOLVED INTO ' + sm.names[sLvl - 1] + '!',
        sm.ability + ' ' + romanTier(sLvl) + ' — ' + sm.tiers[sLvl - 1], 3.4);
    }
  } else if (junkie) {
    G.starterLvl = starterStage(lvl); // the default pilot still grows (Pikachu → Raichu)
  }
  if (junkie) getSprite(pilotInfo().id); // the pilot rig needs its sprite ready
  // arriving at a region's doorstep checkpoints the run (post-draft state —
  // buildLevel runs after every pick, and after white-out tree burns too)
  if (!G.trial && stage === 0 && lvl >= 4) saveCheckpoint();
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
    : kinds[Math.floor(Math.random() * Math.max(2, Math.min(kinds.length, 1 + regionsIn)))];
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
    const [id, t] = pool[Math.floor(Math.random() * pool.length)];
    // reinforcements are all EVOLVED — bigger and tankier in junkie mode
    const rMul = junkie ? (rTier === 3 ? 1.5 : 1.25) : 1;
    const hp = Math.max(2, Math.round((2 + Math.floor(regionsIn / 2)) * p.brickHp * (junkie ? (rTier === 3 ? 1.7 : 1.25) : 1)));
    G.bricks.push({
      bx: i % 2 ? -70 : W + 70, by: -50 - (i % 5) * 24,
      hx: W / 2, hy: cy0, row: 0, col: i,
      w: rw * rMul, h: rh * rMul,
      hp, maxHp: hp,
      poke: { id, t },
      flash: 0, wobble: Math.random() * Math.PI * 2,
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

function resetRun(startLevel = 1, trial = false) {
  const p = preset();
  G.score = 0; G.scoreShown = 0; G.comboPop = 0; G.lives = p.lives; G.livesMax = p.lives; G.level = startLevel; G.combo = 0;
  G.shotsFired = 0; G.playT = 0;
  G.maxCombo = 0; G.caughtRun = 0; G.dropHint = 0; G.megaCalloutDone = false;
  G.rallyHintDone = false; G.bestRally = 0; G.barrierHintDone = false;
  G.adapt = 1; G.mega = 0; G.megaT = 0; G.ballElement = null;
  G.fx_fire = G.fx_laser = G.fx_wide = G.fx_slow = G.fx_magnet = G.fx_score = G.fx_draco = null;
  G.shieldCharges = 0; G.shieldFlash = 0; G.hurtHud = 0; G.announce = null;
  G.upg = {}; G.path = {}; G.catchBonus = 0; G.upgradeChoices = null;
  G.heat = 0; G.overheat = 0; G.shieldRegenT = 10;
  G.charge = 0; G.chargeCD = 0;
  G.mode = SETTINGS.mode; // classic (ball) vs blaster (ball-less shooter)
  G.shipYv = PADDLE_Y(); G.maneuver = null; G.maneuverCD = 8;
  G.stacks = { orb: 0, ice: 0, bell: 0 }; G.attackAnim = 0;
  // starter partner locks in at run start; its ability tier matches how far
  // into the journey this run begins
  G.starter = STARTER_MON[SETTINGS.starter] ? SETTINGS.starter : null;
  G.starterLvl = starterStage(startLevel);
  G.torrentCount = 0; G.justEvolved = false; G.ceremony = null;
  G.encounter = null; G.waveThemeObj = null; G.guardSwapCD = 8;
  G.blasterTutDone = false; G.rescueCD = 0; G.veilHintCD = 0;
  // trial runs are a sandbox: best score and Pokédex catches don't persist
  G.trial = trial;
  // starting deep? bank the skill-tree advances you'd have earned on the way
  let granted = 0;
  if (startLevel > 1) {
    for (let i = 1; i < startLevel; i++) {
      const eligible = PATH_KEYS.filter(k => pathLvl(k) < 4);
      if (!eligible.length) break;
      advancePath(eligible[Math.floor(Math.random() * eligible.length)]);
      granted++;
    }
  }
  buildLevel(startLevel);
  serve();
  if (trial) setAnnounce('swift', '#80d8ff', 'TRIAL MODE',
    genFor(startLevel).name + ' · ' + STAGE_NAMES[stageIdx(startLevel)] + ' — SCORE & CATCHES NOT SAVED', 3,
    granted ? granted + ' UPGRADES GRANTED FOR THE JOURNEY SO FAR' : null);
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
  G.floaters.push({ x, y, text, color, size, life: 1.1 });
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
