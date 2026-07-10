'use strict';
// ============================================================
//  GAME STATE
// ============================================================
const MEGA_DUR = 5;      // Mega Evolution duration in seconds
// skill-tree-aware caps (capstones raise them)
function shieldCap() { return 3 + 2 * upgN('bulwark'); }
function megaDur() { return upgN('megaX') ? 8 : MEGA_DUR; }
function barrierCharges() { return 2 + (upgN('rally') ? 1 : 0); }
const OVERHEAT_DUR = 2.8; // blaster lockout after overheating, in seconds
const G = {
  state: 'menu',
  score: 0, best: +(localStorage.getItem('pkbrk-best') || 0),
  lives: 3, level: 1, combo: 0,
  paddle: { x: 0, w: 130, h: 18, speed: 0, squash: 0 },
  balls: [], bricks: [], powerups: [], lasers: [], missiles: [], enemyShots: [],
  particles: [], floaters: [], fragments: [], ghosts: [],
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
  motionTier: 0, motionStyle: 'march',
  marchDir: 1, divers: false, diveCD: 6, gridCols: 10, pathSpeed: 0.04,
  muzzle: 0, splashCD: 8, resistStreak: 0, ballElementT: 0,
  ballElement: null,
  fx_fire: null, fx_laser: null, fx_wide: null, fx_slow: null,
  fx_magnet: null, fx_score: null, fx_draco: null,
  shieldCharges: 0,
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

function romanTier(t) { return t >= 3 ? 'III' : t === 2 ? 'II' : ''; }
function setAnnounce(icon, color, name, desc, dur = 2.0, sub = null) {
  G.announce = { icon, color, name, desc, sub, t: dur, max: dur };
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
    case 'laser':  bump('fx_laser', 9); break;
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
function buildLevel(lvl) {
  G.bricks = []; G.powerups = []; G.lasers = []; G.missiles = []; G.enemyShots = [];
  G.fragments = []; G.ghosts = []; G.telegraphs = []; G.columnStrikes = [];
  G.fx = 0; G.fy = 0; G.swayT = 0;
  G.gustT = 0; G.timeWarpT = 0;
  const gen = genFor(lvl), rIdx = regionIdx(lvl), stage = stageIdx(lvl);
  preloadGen(gen);
  preloadGen(genFor(lvl + STAGES));
  buildBackground(rIdx);
  const p = preset();
  const cycle = Math.floor((lvl - 1) / (GENS.length * STAGES)); // full-journey loops
  // 4-5 columns on phones, up to 11 on wide desktops — cards stay readable
  // board size grows with the journey: more columns and rows deeper in, so
  // late regions are denser campaigns rather than just faster ones
  const regionsIn = Math.floor((lvl - 1) / STAGES);
  // the armada grows with the journey, but sprites stay READABLE: bricks
  // never shrink below ~52px slots, capping the horde at 18 columns
  const baseCols = Math.max(6, Math.min(10, Math.floor(W / 115)));
  const cols = Math.max(6, Math.min(18, Math.floor(W / 52), baseCols + regionsIn));
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
    const bossHp = Math.max(6, Math.round((14 + rIdx * 7 + cycle * 26) * p.bossHp));
    G.bricks.push({
      bx: W / 2, by: bossY, w: bossW, h: bossH,
      hx: W / 2, hy: bossY, row: -1, col: -1,
      hp: bossHp, maxHp: bossHp, phase: 1,
      poke: { id: gen.boss.id, n: gen.boss.n, t: gen.boss.t },
      isBoss: true, flash: 0, wobble: Math.random() * Math.PI * 2,
      abilityCD: (BOSS_ABILITIES[gen.boss.id]?.cd || 8) * 0.7,
    });
    gridTop = bossY + bossH / 2 + 26;
  }
  // ---- grid ----
  // challenge waves always pull a random formation; arrivals often do too
  // (a mild one), so no two journeys through a region play quite the same
  const form = stage === 1 ? FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)]
    : stage === 0 && Math.random() < 0.45 ? MILD_FORMS[Math.floor(Math.random() * MILD_FORMS.length)]
    : null;
  const maxRows = Math.max(2, Math.floor((H * 0.58 - gridTop) / pitchY));
  const baseRows = 3 + Math.min(4, Math.floor(regionsIn / 2)) + (stage === 1 ? 1 : 0);
  const rows = Math.min(hasBoss ? 2 + Math.min(3, Math.floor(regionsIn / 3)) : baseRows, 8, maxRows);
  for (let r = 0; r < rows; r++) {
    // arrival waves lean on tier 1-2; boss waves field the elites
    const tier = hasBoss ? 3
      : r < Math.ceil(rows / 3) ? Math.min(3, 2 + stage) : r < Math.ceil(rows * 2 / 3) ? 2 : 1;
    const pool = gen.tiers[tier];
    // the very top row of a non-boss wave is an armored "guardian wall" —
    // multi-hit bricks the ball can rally against (see awardRally)
    const armored = !hasBoss && r === 0 && rows >= 2;
    // space-invaders style: every rank marches as ONE species
    const [id, t] = pool[Math.floor(Math.random() * pool.length)];
    for (let c = 0; c < cols; c++) {
      if (form && form.skip(r, c, rows, cols)) continue;
      let hp = Math.max(1, Math.round((tier + cycle) * p.brickHp));
      if (armored) hp = Math.min(9, Math.max(3, Math.round((3 + Math.floor(rIdx / 2) + cycle * 2) * p.brickHp)));
      // Space Junkie entrance: ranks pour in from off-screen, swooping along
      // a curve into their slot — alternating sides per row, staggered
      const entry = {
        t: 0.25 + r * 0.28 + c * 0.04,
        dur: 0.85,
        sx: r % 2 ? -70 : W + 70,
        sy: -50 - r * 26,
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
  G.deathsThisWave = 0;
  G.dangerWarned = false;
  G.heat = 0; G.overheat = 0;
  G.highGroundDone = false; G.waveFirstKill = false; G.elementOrbCD = 9;
  // motion choreography ramps with the journey: static ranks at first, then
  // serpentine rows, traveling waves, and breathing formations late-game
  G.motionTier = Math.min(3, Math.floor(regionsIn / 2) + (stage === 1 ? 1 : 0));
  // The journey is a difficulty ARC: Kanto plays like relaxed brick breaker,
  // patterns creep in through the middle regions, and by the last regions
  // you're basically playing Space Junkie — blocks cycling closed paths
  // (rings, figure-eights, Olympic rings), following each other nose to
  // tail, with attackers spinning off.
  let styles;
  if (regionsIn === 0) styles = stage === 0 ? ['march'] : ['march', 'march', 'serpent'];
  else if (regionsIn === 1) styles = ['march', 'serpent', 'colwave'];
  else if (regionsIn === 2) styles = ['serpent', 'colwave', 'split', 'ring'];
  else if (regionsIn === 3) styles = ['colwave', 'split', 'ring', 'infinity'];
  else if (regionsIn === 4) styles = ['split', 'ring', 'infinity', 'olympic', 'free'];
  else if (regionsIn === 5) styles = ['ring', 'infinity', 'olympic', 'free', 'swirl'];
  else styles = ['infinity', 'olympic', 'ring', 'infinity', 'olympic', 'free'];
  G.motionStyle = styles[Math.floor(Math.random() * styles.length)];
  // cycle speed ramps gently with the journey — flowing, never frantic
  G.pathSpeed = 0.035 + regionsIn * 0.005;
  // ---- path assignment: everything below the armored wall rides the curve ----
  if (!hasBoss && (G.motionStyle === 'ring' || G.motionStyle === 'infinity' || G.motionStyle === 'olympic')) {
    const members = G.bricks.filter(b => !b.armored && !b.isBoss);
    const n = members.length;
    const usable = W - margin * 2;
    const cy0 = gridTop + pitchY + rows * pitchY * 0.5 + 20;
    const ryA = Math.max(70, rows * pitchY * 0.5);
    if (G.motionStyle === 'olympic') {
      // interlocking rings side by side, alternating heights
      const nR = n >= 40 ? 3 : 2;
      const counts = Array(nR).fill(0);
      members.forEach((b, i) => counts[i % nR]++);
      const seen = Array(nR).fill(0);
      members.forEach((b, i) => {
        const k = i % nR;
        b.path = {
          cx: W / 2 + (k - (nR - 1) / 2) * usable * 0.31,
          cy: cy0 + (k % 2 ? 36 : -12),
          rx: usable * 0.17, ry: ryA * 0.85,
          phase: seen[k]++ / counts[k], dir: k % 2 ? -1 : 1, fig8: false,
        };
      });
    } else {
      // one grand loop (or concentric layers when the horde is large),
      // every block trailing the one ahead of it
      const layers = Math.max(1, Math.ceil(n / 30));
      const counts = Array(layers).fill(0);
      members.forEach((b, i) => counts[i % layers]++);
      const seen = Array(layers).fill(0);
      members.forEach((b, i) => {
        const k = i % layers;
        const scale = 1 - k * 0.28;
        b.path = {
          cx: W / 2, cy: cy0,
          rx: usable * 0.4 * scale,
          ry: (G.motionStyle === 'infinity' ? ryA * 0.6 : ryA) * scale,
          phase: seen[k]++ / counts[k], dir: k % 2 ? -1 : 1,
          fig8: G.motionStyle === 'infinity',
        };
      });
    }
  }
  G.marchDir = Math.random() < 0.5 ? -1 : 1;
  G.gridCols = cols;
  // Galaga peel-off dives: hinted on early challenge stages, constant later
  G.divers = regionsIn >= 2 || (regionsIn >= 1 && stage >= 1);
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
    setAnnounce(null, gen.accent, gen.name, 'STAGE 1/3 — ARRIVAL', 2.6, form ? form.name + ' FORMATION' : null);
  } else if (G.modifier) {
    const m = G.modifier;
    setAnnounce(m.icon, m.color, m.name, m.desc, 3.2, form ? gen.name + ' 2/3 — ' + form.name + ' FORMATION' : null);
  } else {
    setAnnounce(null, gen.accent, gen.name, 'STAGE 2/3 — CHALLENGE', 2.4, form ? form.name + ' FORMATION' : null);
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
  }
}

function resetRun(startLevel = 1, trial = false) {
  const p = preset();
  G.score = 0; G.lives = p.lives; G.level = startLevel; G.combo = 0;
  G.shotsFired = 0; G.playT = 0;
  G.maxCombo = 0; G.caughtRun = 0; G.dropHint = 0; G.megaCalloutDone = false;
  G.rallyHintDone = false; G.bestRally = 0; G.barrierHintDone = false;
  G.adapt = 1; G.mega = 0; G.megaT = 0; G.ballElement = null;
  G.fx_fire = G.fx_laser = G.fx_wide = G.fx_slow = G.fx_magnet = G.fx_score = G.fx_draco = null;
  G.shieldCharges = 0; G.announce = null;
  G.upg = {}; G.path = {}; G.catchBonus = 0; G.upgradeChoices = null;
  G.heat = 0; G.overheat = 0; G.shieldRegenT = 10;
  // starter partner locks in at run start; its ability tier matches how far
  // into the journey this run begins
  G.starter = STARTER_MON[SETTINGS.starter] ? SETTINGS.starter : null;
  G.starterLvl = starterStage(startLevel);
  G.torrentCount = 0; G.justEvolved = false;
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
  G.balls = [makeBall(G.paddle.x, PADDLE_Y() - 24)];
  G.balls[0].stuck = true;
  // starter partner: its type rides the ball from every serve
  if (G.starter && !G.ballElement) {
    G.ballElement = G.starter;
    G.ballElementT = 9999;
  }
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
// 3D card-shatter: four tumbling corner fragments + the sprite "fainting"
function shatterBrick(br, x, y) {
  if (G.fragments.length < 80) {
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
  if (G.ghosts.length < 14 && br.poke.id > 0) {
    G.ghosts.push({ id: br.poke.id, shiny: br.shiny, x, y, s: br.h * (br.isBoss ? 1.1 : 1.3), vr: (Math.random() - 0.5) * 3, rot: 0, life: 0.6, maxLife: 0.6 });
  }
}
