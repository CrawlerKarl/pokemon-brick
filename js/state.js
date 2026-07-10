'use strict';
// ============================================================
//  GAME STATE
// ============================================================
const MEGA_DUR = 5;      // Mega Evolution duration in seconds
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
  muzzle: 0, splashCD: 8, resistStreak: 0, ballElementT: 0,
  ballElement: null,
  fx_fire: null, fx_laser: null, fx_wide: null, fx_slow: null,
  fx_magnet: null, fx_score: null, fx_draco: null,
  shieldCharges: 0,
  // blaster heat: firing builds it, paddle returns vent it, 100% = overheat
  heat: 0, overheat: 0,
  upg: {}, catchBonus: 0, upgradeChoices: null, clearedStage: 0,
  telegraphs: [],           // pre-shot warning markers
  gustT: 0, timeWarpT: 0,   // Lugia / Dialga signature effects
  columnStrikes: [],        // Zekrom / Eternatus warned beams
};
let dexScroll = 0, dexDragY = null, dexDragStart = 0;
// FLOOR = bottom of the playable area, above any phone home-indicator;
// on touch screens the paddle rides higher so fingers don't cover it
const FLOOR = () => H - SAFE_B;
const PADDLE_Y = () => FLOOR() - (IS_TOUCH ? 96 : 64);
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
    case 'laser':  bump('fx_laser', 12); break;
    case 'wide':   bump('fx_wide', 14); break;
    case 'slow':   bump('fx_slow', 8); break;
    case 'magnet': bump('fx_magnet', 12); break;
    case 'star':   bump('fx_score', 15); break;
    case 'draco':  bump('fx_draco', 10); break;
    case 'shield':
      G.shieldCharges = Math.min(3, G.shieldCharges + 1);
      tier = G.shieldCharges;
      SFX.shield();
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
  return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, stuck: false, dead: false, trail: [] };
}

// challenge-stage formations — themed layouts instead of a plain grid
const FORMATIONS = [
  { name: 'CHECKERBOARD', skip: (r, c) => (r + c) % 2 === 1 },
  { name: 'DIAMOND',      skip: (r, c, rows, cols) => Math.abs(c - (cols - 1) / 2) + Math.abs(r - (rows - 1) / 2) > Math.max(rows, cols) / 2 + 0.6 },
  { name: 'TWIN PILLARS', skip: (r, c, rows, cols) => { const q = cols / 4; return Math.abs(c - q) > q * 0.8 && Math.abs(c - 3 * q) > q * 0.8; } },
  { name: 'FORTRESS',     skip: (r, c, rows, cols) => r > 0 && r < rows - 1 && c > 0 && c < cols - 1 && (r + c) % 2 === 0 },
];
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
  const cols = Math.max(4, Math.min(11, Math.floor(W / 110)));
  const margin = Math.min(60, W * 0.04);
  const bw = (W - margin * 2) / cols;
  // brick height also scales with VIEWPORT height — short laptop windows must
  // still leave the lower half of the screen as playable space
  const bh = Math.min(86, bw * 0.78, H * 0.075);
  G.brickW = bw; G.brickH = bh;
  const hasBoss = stage === 2;
  let gridTop = 96;
  // ---- BOSS (legendary stage only — the finale of each region) ----
  if (hasBoss) {
    const bossW = Math.min(bw * 2.1, W * 0.46), bossH = bh * 1.85;
    const bossY = 102 + bossH / 2;
    const bossHp = Math.max(6, Math.round((14 + rIdx * 7 + cycle * 26) * p.bossHp));
    G.bricks.push({
      bx: W / 2, by: bossY, w: bossW, h: bossH,
      hp: bossHp, maxHp: bossHp, phase: 1,
      poke: { id: gen.boss.id, n: gen.boss.n, t: gen.boss.t },
      isBoss: true, flash: 0, wobble: Math.random() * Math.PI * 2,
      abilityCD: (BOSS_ABILITIES[gen.boss.id]?.cd || 8) * 0.7,
    });
    gridTop = bossY + bossH / 2 + 26;
  }
  // ---- grid ----
  const form = stage === 1 ? FORMATIONS[(rIdx + cycle) % FORMATIONS.length] : null;
  const maxRows = Math.max(2, Math.floor((H * 0.55 - gridTop) / (bh + 8)));
  const baseRows = 3 + Math.floor(rIdx / 3) + cycle + (stage === 1 ? 1 : 0);
  const rows = Math.min(hasBoss ? 2 + Math.floor(rIdx / 4) : baseRows, 6, maxRows);
  for (let r = 0; r < rows; r++) {
    // arrival waves lean on tier 1-2; boss waves field the elites
    const tier = hasBoss ? 3
      : r < Math.ceil(rows / 3) ? Math.min(3, 2 + stage) : r < Math.ceil(rows * 2 / 3) ? 2 : 1;
    const pool = gen.tiers[tier];
    for (let c = 0; c < cols; c++) {
      if (form && form.skip(r, c, rows, cols)) continue;
      const [id, t] = pool[Math.floor(Math.random() * pool.length)];
      const hp = Math.max(1, Math.round((tier + cycle) * p.brickHp));
      const brick = {
        bx: margin + c * bw + bw / 2,
        by: gridTop + r * (bh + 8) + bh / 2,
        w: bw - 8, h: bh,
        hp, maxHp: hp,
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
    setAnnounce(null, gen.accent, gen.name, 'STAGE 1/3 — ARRIVAL', 2.6);
  } else if (G.modifier) {
    const m = G.modifier;
    setAnnounce(m.icon, m.color, m.name, m.desc, 3.2, form ? gen.name + ' 2/3 — ' + form.name + ' FORMATION' : null);
  } else {
    setAnnounce(null, gen.accent, gen.name, 'STAGE 2/3 — CHALLENGE', 2.4);
  }
}

function resetRun() {
  const p = preset();
  G.score = 0; G.lives = p.lives; G.level = 1; G.combo = 0;
  G.shotsFired = 0; G.playT = 0;
  G.maxCombo = 0; G.caughtRun = 0; G.dropHint = 0; G.megaCalloutDone = false;
  G.adapt = 1; G.mega = 0; G.megaT = 0; G.ballElement = null;
  G.fx_fire = G.fx_laser = G.fx_wide = G.fx_slow = G.fx_magnet = G.fx_score = G.fx_draco = null;
  G.shieldCharges = 0; G.announce = null;
  G.upg = {}; G.catchBonus = 0; G.upgradeChoices = null;
  G.heat = 0; G.overheat = 0;
  buildLevel(1);
  serve();
}
function serve() {
  G.balls = [makeBall(G.paddle.x, PADDLE_Y() - 24)];
  G.balls[0].stuck = true;
  // starter element: your chosen type rides the ball from every serve
  if (SETTINGS.starter !== 'none' && !G.ballElement) {
    G.ballElement = SETTINGS.starter;
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
