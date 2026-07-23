'use strict';
// ============================================================
//  SETTINGS & DIFFICULTY (all knobs in one place)
// ============================================================
const PRESETS = {
  easy:     { label: 'EASY',     descent: 0.42, shotRate: 0.5,  shotSpeed: 0.65, bossHp: 0.68, brickHp: 0.9,  ballSpeed: 0.85, lives: 5, starThreat: 0.72, heatBuild: 0.39, heatCool: 0.29 },
  normal:   { label: 'NORMAL',   descent: 0.9,  shotRate: 1.0,  shotSpeed: 0.9,  bossHp: 1.12, brickHp: 1.15, ballSpeed: 0.95, lives: 4, starThreat: 1.0,  heatBuild: 0.42, heatCool: 0.28 },
  hard:     { label: 'HARD',     descent: 1.42, shotRate: 1.85, shotSpeed: 1.18, bossHp: 1.45, brickHp: 1.38, ballSpeed: 1.1,  lives: 3, starThreat: 1.24, heatBuild: 0.44, heatCool: 0.27 },
  nuzlocke: { label: 'NUZLOCKE', descent: 1.68, shotRate: 2.35, shotSpeed: 1.3,  bossHp: 1.65, brickHp: 1.55, ballSpeed: 1.18, lives: 1, starThreat: 1.36, heatBuild: 0.44, heatCool: 0.27 },
};
const DIFFICULTY_UI = {
  easy: { name: 'SCENIC', tone: 'FORGIVING', desc: 'MORE HEALTH · GENTLER FIRE' },
  normal: { name: 'ADVENTURE', tone: 'BALANCED', desc: 'THE INTENDED CAMPAIGN', recommended: true },
  hard: { name: 'ACE', tone: 'INTENSE', desc: 'FASTER · TOUGHER WAVES' },
  nuzlocke: { name: 'ONE LIFE', tone: 'EXTREME', desc: 'ONE HIT POINT · NO SAFETY NET' },
};
const STORED_SETTINGS = (v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {})(loadStore('pkbrk-settings', '{}'));
// Respect the device accessibility preference on a player's first visit.
// Explicit choices saved in SETTINGS still win on every later visit.
const PREFERS_REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const SETTINGS = Object.assign(
  { drops: 1, speed: 1, preset: 'easy', sfx: 1, music: 0.8, starter: 'none',
    reduceShake: PREFERS_REDUCED_MOTION, reduceFlash: PREFERS_REDUCED_MOTION,
    hcBall: false, autoFire: false, mode: 'junkie', skin: 'pokemon', affinity: null,
    buttonScale: 1, buttonOpacity: 0.85, touchFollow: 1,
    leftHanded: false, haptics: true },
  STORED_SETTINGS);
if (!PRESETS[SETTINGS.preset]) SETTINGS.preset = 'easy';
// Gameplay randomness can be locked for the daily challenge without making
// decorative particles and scenery repeat. Only game-state code calls this.
let RUN_RNG_STATE = null;
function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0 || 1;
}
function setRunSeed(seed) { RUN_RNG_STATE = seed == null ? null : hashSeed(String(seed)); }
function gameRand() {
  if (RUN_RNG_STATE == null) return Math.random();
  RUN_RNG_STATE ^= RUN_RNG_STATE << 13;
  RUN_RNG_STATE ^= RUN_RNG_STATE >>> 17;
  RUN_RNG_STATE ^= RUN_RNG_STATE << 5;
  return (RUN_RNG_STATE >>> 0) / 4294967296;
}
function dailyDateKey(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0');
  return y + '-' + m + '-' + String(date.getDate()).padStart(2, '0');
}
function dailySeed() { return 'WAVEBREAKER-DAILY-' + dailyDateKey(); }
// ---- BRAND vs SKIN. WAVEBREAKER is the engine's name — every mode is
// another way to break the wave, so new modes just add cards below. The
// SKIN (js/skin.js registry, resolved at boot) carries the current theme:
// edition stamp, names, world data, art — never mechanics or storage keys.
const GAME_TITLE = 'WAVEBREAKER';
// game MODE — the FIRST choice, on the title screen. Three ways to play the
// same journey (one wave engine underneath — buildLevel branches on the key):
// BREAKER is the classic ball-first brick-breaker, BLASTER trades the ball
// for pure firepower against the same walls, STARFIGHTER drops the wall and
// puts you in the cockpit. Labels are presentation only — the internal keys
// (classic / blaster / junkie) are storage-stable: saved settings, run
// checkpoints and tests reference them, so never rename a key.
const MODES = [
  { key: 'junkie',  label: 'STARFIGHTER', desc: 'POKÉMON FLIGHT SHOOTER', mechanic: 'MOVE + FIRE · HOLD TO CHARGE', accent: '#c879ff',
    summary: ['Pilot your partner through enemy squadrons', 'in a 27-wave journey across nine regions.'],
    lines: ['PILOT A POKÉMON · DODGE ENEMY FIRE', 'TAP TO ATTACK · HOLD FOR PIERCING CHARGE'] },
  { key: 'classic', label: 'BREAKER', desc: 'CLASSIC BRICK BREAKER', mechanic: 'BALL + PADDLE', accent: '#ffd54f',
    summary: ['Keep the rally alive, crack Pokémon walls,', 'and take on legendary boss battles.'],
    lines: ['BOUNCE THE BALL · BREAK EVERY BLOCK', 'MOVE THE PADDLE · BUILD RALLIES'] },
  { key: 'blaster', label: 'BLASTER', desc: 'ARCADE WALL SHOOTER', mechanic: 'MOVE + FIRE · HOLD TO CHARGE', accent: '#4de0f2',
    summary: ['Skip the ball and blast the wall directly', 'with quick volleys and piercing charge shots.'],
    lines: ['SHOOT THE BLOCK WALL DIRECTLY', 'TAP TO FIRE · HOLD FOR PIERCING CHARGE'] },
];
if (!MODES.some(m => m.key === SETTINGS.mode)) SETTINGS.mode = 'junkie';
function saveSettings() { saveStore('pkbrk-settings', SETTINGS); }
function preset() { return PRESETS[SETTINGS.preset]; }
// physics scale with the playfield — phones get a proportionally slower ball
// so it crosses the screen in the same time it would on a desktop
function speedScale() { return Math.max(0.62, Math.min(1, W / 900)); }
// the one difficulty curve — everything reads from here.
// regions are 3 waves each now, so the per-wave ramp is softened to keep
// the same difficulty-per-region as before
function diff() {
  const p = preset(), a = G.adapt, mod = G.modifier;
  const lvl = 1 + (G.level - 1) * 0.55;
  // ONE smooth journey curve shapes the pressure (replaces the old per-act
  // steps): a gentle opening third, a moderately challenging middle, and a
  // genuinely tough finale — on every preset, scaled around NORMAL
  const jr = Math.min(1, Math.floor((G.level - 1) / STAGES) / 8);
  const sm = jr * jr * (3 - 2 * jr); // smoothstep 0→1 across the 9 regions
  const curve = 0.78 + 0.62 * sm;    // ×0.78 opening → ~×1.1 middle → ×1.4 finale
  const ri = Math.max(0, Math.min(8, Math.floor((G.level - 1) / STAGES)));
  // STARFIGHTER schedules PATTERNS, not raw bullets. Early regions attack
  // more often than the old opening but use tiny, slow sparks; late regions
  // spend the same budget on either a swarm or one siege projectile. Keeping
  // these intervals separate prevents Ace/One Life's legacy shotRate scalar
  // from turning a 12-pellet visual pattern into twelve independent attacks.
  const starIntervals = [1.8, 1.62, 1.45, 1.3, 1.18, 1.08, 1.0, 0.94, 0.88];
  const starBossIntervals = [2.55, 2.48, 2.38, 2.28, 2.18, 2.08, 2.0, 1.92, 1.84];
  const starThreat = (p.starThreat || 1) * Math.max(0.82, a);
  return {
    lv: lvl,
    descent: (3 + lvl * 1.4) * p.descent * a * (mod?.key === 'swift' ? 1.35 : 1) * Math.max(0.7, Math.min(1, H / 900)),
    enemyShotInt: Math.max(1.25, 5.5 - lvl * 0.5) / (p.shotRate * a) / curve
      * (stageIdx(G.level) === 2 ? 1.35 : 1)
      / (mod?.key === 'ambush' ? 1.8 : mod?.key === 'bounty' ? 1.3 : 1),
    bossShotInt: Math.max(1.8, 4.5 - lvl * 0.2) / (p.shotRate * a) / (0.88 + 0.38 * sm),
    starShotInt: starIntervals[ri] / starThreat
      / (mod?.key === 'ambush' ? 1.18 : mod?.key === 'bounty' ? 1.08 : 1),
    starBossShotInt: starBossIntervals[ri] / starThreat,
    starThreatCap: (2.5 + ri * 0.375) * Math.sqrt(starThreat),
    ballSpeed: 520 * p.ballSpeed * speedScale(),
    shotSpeed: p.shotSpeed * speedScale() * (0.9 + 0.24 * sm),
    // drops are rare on purpose — each one should feel like an event
    dropChance: 0.06 * (G.daily ? 1 : SETTINGS.drops) * (mod?.key === 'swift' ? 1.4 : 1)
      * starterMod('drop', 1)
      * (1 + 0.5 * upgN('fortune')) // Bond path tier 3
      * (1 + 0.08 * stackN('dawn')), // DAWNLIGHT CHARM (light affinity)
    catchChance: 0.07 * (!G.daily && dexRewardActive('lucky') ? 1.25 : 1) * starterMod('catch', 1),
  };
}
const SLIDERS = [
  { key: 'drops', label: 'POWER-UP DROPS', min: 0.25, max: 2.5,
    fmt: v => v < 0.7 ? 'SPARSE' : v < 1.4 ? 'NORMAL' : v < 2 ? 'PLENTY' : 'ABUNDANT' },
  { key: 'speed', label: 'GAME SPEED', min: 0.6, max: 1.6,
    fmt: v => v < 0.8 ? 'CHILL' : v < 1.15 ? 'NORMAL' : v < 1.4 ? 'FAST' : 'TURBO' },
  { key: 'sfx', label: 'EFFECTS VOLUME', min: 0, max: 1.5,
    fmt: v => v <= 0.01 ? 'OFF' : Math.round(v * 100) + '%' },
  { key: 'music', label: 'MUSIC VOLUME', min: 0, max: 1.5,
    fmt: v => v <= 0.01 ? 'OFF' : Math.round(v * 100) + '%' },
];
const TOGGLES = [
  { key: 'reduceShake', label: 'REDUCE SCREEN SHAKE' },
  { key: 'reduceFlash', label: 'REDUCE FLASHES' },
  { key: 'hcBall', label: 'HIGH-CONTRAST BALL' },
  { key: 'autoFire', label: 'AUTO-FIRE (SHOOTER MODES)' },
];
const TOUCH_SLIDERS = [
  { key: 'buttonScale', label: 'BUTTON SIZE', min: 0.75, max: 1.35,
    fmt: v => Math.round(v * 100) + '%' },
  { key: 'buttonOpacity', label: 'BUTTON OPACITY', min: 0.35, max: 1,
    fmt: v => Math.round(v * 100) + '%' },
  { key: 'touchFollow', label: 'FOLLOW SPEED', min: 0.55, max: 1.55,
    fmt: v => v < 0.75 ? 'GENTLE' : v < 1.15 ? 'NORMAL' : v < 1.4 ? 'FAST' : 'SNAP' },
];
const TOUCH_TOGGLES = [
  { key: 'leftHanded', label: 'LEFT-HANDED BUTTONS' },
  { key: 'haptics', label: 'HAPTIC FEEDBACK' },
];
// The old STARTERS literal lived here only because config parses before
// data.js. It is GONE: the setup grid derives at runtime from the active
// skin via skinStarters() (js/skin.js), which also owns the
// SETTINGS.starter validation — keys are engine-stable type keys.
let advOpen = false; // advanced settings panel
let settingsPage = 0; // 0 = game/accessibility, 1 = touch controls
function activeSliders() { return settingsPage === 1 ? TOUCH_SLIDERS : SLIDERS; }
function activeToggles() { return settingsPage === 1 ? TOUCH_TOGGLES : TOGGLES; }
// The menu has a featured title hub followed by a two-step setup wizard:
// all partners on one screen, then challenge + launch. Anything that returns
// to the menu resets to the featured title hub.
let menuPage = 'modes';
let setupStep = 'pilot'; // setup is a two-screen flow: all pilots → challenge
// PAGE 1 — one selected-game hero. The old home screen repeated the featured
// mode as both a quick-start button and a giant card, then surrounded it with
// three dense status bands. This layout gives one idea the stage at a time:
// a readable description + action, a generous gameplay diorama, and three
// compact mode switches. Rendering and hit-testing share these rectangles.
// THE THREE DOORS (title overhaul, 2026-07-20): the home screen is three
// equal, self-explanatory game cards — tap one and you're choosing a
// partner. A slim CONTINUE band appears only when a checkpoint exists;
// everything else (daily, journey, codex, settings) is one quiet chip or
// footer line. `quick` aliases the SELECTED mode's card so the primary
// CTA contract (and its test) is unchanged; `preview`/`hero` alias the
// whole card band. Rendering and hit-testing share these rectangles.
function menuLayout() {
  const hasCkpt = typeof RUN_CKPT !== 'undefined' && !!RUN_CKPT;
  const narrow = W < 720;
  const short = H < 560 || (narrow && H < 650);
  const pad = narrow ? 12 : short ? 18 : Math.max(24, Math.min(40, W * 0.03));
  const gap = narrow ? 10 : 14;
  const headerH = short ? 38 : narrow ? 50 : 56;
  const headerY = short ? 8 : narrow ? 10 : 16;
  const titleSize = short ? Math.min(24, W / 18) : narrow ? Math.min(30, W / 11) : Math.min(34, W / 24);
  const titleY = headerY + headerH / 2;
  // footer: desktop keeps one calm journey line; phones keep two utilities
  const footerH = short ? 34 : narrow ? 52 : 42;
  const footerY = H - (short ? 8 : pad * 0.7) - footerH;
  // continue band (only with a checkpoint) sits between header and cards
  const resumeH = hasCkpt ? (short ? 30 : narrow ? 42 : 46) : 0;
  const zoneY = headerY + headerH + (short ? 6 : 12) + (hasCkpt ? resumeH + (short ? 6 : 10) : 0);
  const zone = { x: pad, y: zoneY, w: W - pad * 2, h: footerY - zoneY - (short ? 6 : 12) };
  // three equal cards: columns on wide screens, stacked rows on phones
  const stacked = narrow && W < H;
  const cardW = stacked ? zone.w : (zone.w - gap * 2) / 3;
  const cardH = stacked ? (zone.h - gap * 2) / 3 : zone.h;
  const card = i => stacked
    ? { x: zone.x, y: zone.y + i * (cardH + gap), w: cardW, h: cardH }
    : { x: zone.x + i * (cardW + gap), y: zone.y, w: cardW, h: cardH };
  const selIdx = Math.max(0, MODES.findIndex(m => m.key === SETTINGS.mode));
  // the daily chip rides the Breaker card's diorama corner (it IS a
  // Breaker run) — badge-style, like the preview badges
  const bc = card(Math.max(0, MODES.findIndex(m => m.key === 'classic')));
  const dailyH = short ? 18 : 22;
  const dailyW = Math.min(bc.w * 0.62, 170);
  const daily = { x: bc.x + bc.w - dailyW - 14, y: bc.y + 14, w: dailyW, h: dailyH };
  const utilityW = short ? 92 : 118;
  const dex = narrow
    ? { x: pad, y: footerY, w: (W - pad * 2 - gap) / 2, h: footerH }
    : { x: W - pad - utilityW * 2 - gap, y: headerY + 8, w: utilityW, h: headerH - 16 };
  const adv = narrow
    ? { x: pad + (W - pad * 2 - gap) / 2 + gap, y: footerY, w: (W - pad * 2 - gap) / 2, h: footerH }
    : { x: W - pad - utilityW, y: headerY + 8, w: utilityW, h: headerH - 16 };
  return {
    s: Math.max(0.72, Math.min(1, H / 760)), short, narrow, stacked,
    pad, gap, headerY, headerH, titleY, titleSize,
    hero: zone, preview: zone, copy: zone, modeY: zone.y,
    card,
    quick: card(selIdx),
    daily,
    resume: hasCkpt ? { x: pad, y: headerY + headerH + (short ? 6 : 12), w: W - pad * 2, h: resumeH } : null,
    progress: narrow ? null : { x: pad, y: footerY, w: Math.max(280, W - pad * 2 - 0), h: footerH },
    dex, adv,
  };
}
// PAGE 2 — a two-step setup wizard. Pilot choice gets the whole screen so all
// 18 partners are visible together; difficulty gets a separate, calmer screen
// with a selected-pilot recap, four clear intensity choices, Trial, and launch.
function setupLayout() {
  const short = H < 560;
  const narrow = W < 620;
  const compactPhone = narrow && H < 760;
  const s = Math.max(0.72, Math.min(1.1, H / 780, W / 720));
  const cx = W / 2;
  const contentW = Math.min(W - (narrow ? 20 : 36), 1120);
  const headSize = short ? Math.min(22, W / 18) : narrow ? Math.min(32, W / 10) : Math.min(42, W / 15);
  const headY = short ? 22 : narrow ? 38 : 46;
  const subY = headY + headSize * 0.78 + (short ? 4 : 9);
  const sectionY = subY + (short ? 22 : narrow ? 34 : 38);
  const back = { x: 12, y: 10, w: short ? 78 : 94, h: 34 };
  const bottomPad = short ? 8 : narrow ? 12 : 18;

  if (setupStep === 'pilot') {
    // CALM ROSTER (title overhaul): one DETAIL HERO card up top carries all
    // the reading; below it the 18 partners are three labeled SHELVES of six
    // small identity tiles (sprite + name only). Tap a tile → the hero
    // explains it. The skin names the shelves (disciplines on AETHERFALL).
    const heroW = Math.min(contentW, 860);
    const heroY = sectionY + (short ? 2 : 8);
    const nextH = short ? 38 : narrow ? 52 : 54;
    const nextW = narrow ? contentW : Math.min(420, contentW * 0.46);
    const nextY = H - bottomPad - nextH;
    const noneH = short ? 20 : 24;
    const noneY = nextY - noneH - (short ? 4 : 8);
    const gap = short ? 4 : narrow ? 6 : 8;
    const labelH = short ? 11 : 16;
    const vgap = short ? 4 : 8;
    // THE VESSEL SHOWCASE (2026-07-22): the shelves cap their tile size, so a
    // tall phone used to leave a dead band under the hero. Reserve what the
    // three shelves actually want, then hand the leftover to the HERO card —
    // the detail portrait grows instead of the emptiness.
    const tileW0h = (contentW - gap * 5) / 6;
    const tileWant = Math.max(short ? 34 : 44,
      Math.min(narrow ? 84 : 96, tileW0h * 1.35 + 14));
    const shelvesWant = 3 * (labelH + tileWant) + 2 * vgap;
    const heroRoom = noneY - (short ? 4 : 10) - heroY - (short ? 4 : 10) - shelvesWant;
    const heroH = Math.max(short ? 56 : narrow ? 102 : 122,
      Math.min(short ? 62 : narrow ? 208 : 190, heroRoom));
    const hero = { x: cx - heroW / 2, y: heroY, w: heroW, h: heroH };
    const shelfRoom = noneY - (short ? 4 : 10) - (hero.y + hero.h + (short ? 4 : 10));
    const rowH = (shelfRoom - 3 * labelH - 2 * vgap) / 3;
    const tileW0 = (contentW - gap * 5) / 6;
    const tileH = Math.max(short ? 34 : 44, Math.min(narrow ? 84 : 96, rowH, tileW0 * 1.35 + 14));
    const tileW = Math.min(tileW0, tileH * 1.15);
    const rowW = tileW * 6 + gap * 5;
    // center the shelf block in its room — tall phones breathe evenly
    // instead of leaving one dead band above the bottom-pinned actions
    const shelvesH = 3 * (labelH + tileH) + 2 * vgap;
    const shelfTop = hero.y + hero.h + (short ? 4 : 10) + Math.max(0, (shelfRoom - shelvesH) * 0.38);
    return {
      step: 'pilot', s, short, narrow, compactPhone, headY, headSize, subY, sectionY, contentW, back,
      hero, rowW, labelH, tileW, tileH,
      shelf: g => ({ x: cx - rowW / 2, y: shelfTop + g * (labelH + tileH + vgap), w: rowW, h: labelH }),
      starter: i => {
        const g = Math.floor(i / 6), col = i % 6;
        return { x: cx - rowW / 2 + col * (tileW + gap),
          y: shelfTop + g * (labelH + tileH + vgap) + labelH, w: tileW, h: tileH };
      },
      none: { x: cx - Math.min(290, contentW * 0.72) / 2, y: noneY, w: Math.min(290, contentW * 0.72), h: noneH },
      info: hero, // API alias: the hero IS the info surface now
      next: { x: cx - nextW / 2, y: nextY, w: nextW, h: nextH },
    };
  }

  const trialH = short ? 22 : 28;
  const trialY = H - bottomPad - trialH;
  const startH = short ? 42 : narrow ? 58 : 58;
  const startW = narrow ? contentW : Math.min(430, contentW * 0.48);
  const startY = trialY - startH - (short ? 5 : 9);
  const summaryY = sectionY + (short ? 10 : 20);
  const summaryW = Math.min(contentW, narrow ? contentW : 760);
  const editW = short ? 64 : narrow ? 78 : 118;
  // a skin with affinities (AETHERFALL) adds the LIGHT/DARK pick between
  // the pilot summary and the difficulty chips; other skins reserve no room
  const hasAff = typeof SKIN !== 'undefined' && !!SKIN.affinities;
  // the LIGHT/DARK choice is a REQUIRED, ceremonial pick on affinity skins —
  // two tall mirrored cards, not a slim optional toggle (2026-07-21)
  const affH = hasAff ? (short ? 40 : 58) : 0;
  const affW = Math.min(summaryW, 560);
  const cols = narrow ? 2 : 4, rows = Math.ceil(Object.keys(PRESETS).length / cols);
  const gap = short ? 7 : 12;
  const chipW = (contentW - gap * (cols - 1)) / cols;
  // THE VESSEL SHOWCASE (2026-07-22): the summary card absorbs the screen's
  // leftover height instead of leaving a dead gap above the launch button —
  // a tall card means a BIG portrait of the thing you're choosing. Space is
  // budgeted bottom-up: reserve what the affinity cards, labels and chips
  // need at a comfortable size, then hand the remainder to the card (clamped).
  const chipWant = short ? 34 : narrow ? 96 : 108;
  const gapAff = short ? 6 : 10, gapLabel = short ? 14 : 25, gapChips = short ? 10 : 20;
  const reserved = (hasAff ? affH + gapAff : 0) + gapLabel + gapChips
    + rows * chipWant + gap * (rows - 1) + (short ? 8 : 18);
  const summaryH = Math.max(short ? 54 : narrow ? 84 : 96,
    Math.min(short ? 74 : narrow ? 230 : 210, startY - summaryY - reserved));
  const affY = summaryY + summaryH + gapAff;
  const diffLabelY = summaryY + summaryH + (hasAff ? affH + (short ? 12 : 18) : 0) + gapLabel;
  const chipY = diffLabelY + gapChips;
  const chipRoom = startY - (short ? 8 : 18) - chipY;
  const chipH = Math.max(short ? 34 : 58, Math.min(narrow ? 92 : 108, (chipRoom - gap * (rows - 1)) / rows));
  return {
    step: 'difficulty', s, short, narrow, compactPhone, headY, headSize, subY, sectionY, contentW, back,
    summary: { x: cx - summaryW / 2, y: summaryY, w: summaryW, h: summaryH },
    // on a SHOWCASE card the change button drops to the bottom-right corner so
    // the identity text can use the card's full width beside the big portrait
    editPilot: { x: cx + summaryW / 2 - editW - 10,
      y: summaryH >= 130 ? summaryY + summaryH - (short ? 26 : 34) - 12
        : summaryY + summaryH / 2 - (short ? 13 : 17),
      w: editW, h: short ? 26 : 34 },
    affinity: hasAff ? i => ({ x: cx - affW / 2 + i * (affW / 2 + 5), y: affY, w: affW / 2 - 5, h: affH }) : null,
    chipsLabelY: diffLabelY,
    chip: i => { const c = i % cols, r = Math.floor(i / cols);
      return { x: cx - contentW / 2 + c * (chipW + gap), y: chipY + r * (chipH + gap), w: chipW, h: chipH }; },
    start: { x: cx - startW / 2, y: startY, w: startW, h: startH },
    trial: { x: cx - startW / 2, y: trialY, w: startW, h: trialH },
  };
}
// advanced settings overlay (sliders + accessibility toggles)
function advLayout() {
  const sliders = activeSliders(), toggles = activeToggles();
  const pw = Math.min(440, W * 0.92);
  const compact = H < 560;
  const rowH = compact ? 34 : 52, togH = compact ? 26 : 40;
  // Leave a real text row between the tabs and the first slider. Previously
  // POWER-UP DROPS visibly collided with the active tab on phone viewports.
  const top = compact ? 116 : 132, bottom = compact ? 12 : 36;
  const ph = top + sliders.length * rowH + toggles.length * togH + bottom;
  const px = W / 2 - pw / 2, py = Math.max(compact ? 8 : 20, H / 2 - ph / 2);
  return {
    px, py, pw, ph, compact, sliders, toggles,
    tab: i => ({ x: px + 24 + i * (pw - 48) / 3, y: py + (compact ? 48 : 58), w: (pw - 48) / 3 - 6, h: compact ? 30 : 36 }),
    // AFT-006: the SAVE page — three stacked action buttons + status lines
    saveBtn: i => ({ x: px + 36, y: py + (compact ? 108 : 128) + i * (compact ? 44 : 52), w: pw - 72, h: compact ? 36 : 42 }),
    saveStatusY: py + (compact ? 108 : 128) + 3 * (compact ? 44 : 52) + 10,
    slider: i => ({ x: px + 36, y: py + top + i * rowH, w: pw - 72 }),
    toggle: i => ({ x: px + 30, y: py + top + sliders.length * rowH + i * togH, w: pw - 60, h: togH - (compact ? 4 : 8) }),
    close: { x: px + pw - 44, y: py + 10, w: 34, h: 34 },
  };
}
// trial mode overlay: 3×3 region grid + stage picker + start
let trialOpen = false;
const trialSel = { region: 0, stage: 0, round: 0, phase: 1 };
function trialLayout() {
  const pw = Math.min(470, W * 0.94);
  const chipW = (pw - 60 - 20) / 3, chipH = 48, stageH = 38;
  const gridY = 96;
  // picking a LEGENDARY stage reveals a round row: jump straight to the
  // sentinels, the legendary, or the mythical of that region's gauntlet.
  // Kanto adds a fourth direct-entry tile for the Mew VMAX secret encounter.
  const rounds = trialSel.stage === 2;
  const secretRound = rounds && trialSel.region === 0 && SETTINGS.mode === 'junkie';
  const roundCount = secretRound ? 4 : 3;
  const roundH = 34, roundRows = secretRound ? 2 : 1;
  const roundGap = rounds ? roundRows * (roundH + 8) + 6 : 0;
  // Picking a BOSS round (>=1) reveals a PHASE chip row so any phase can be
  // practiced: 2 chips for the legendary (round 1), 3 for a mythic/secret.
  const phases = rounds && trialSel.round >= 1;
  const phaseCount = trialSel.round >= 2 ? 3 : 2;
  const phaseH = 30, phaseGap = phases ? phaseH + 16 : 0;
  const ph = gridY + 3 * (chipH + 10) + 30 + stageH + roundGap + phaseGap + 84;
  const px = W / 2 - pw / 2, py = Math.max(16, H / 2 - ph / 2);
  const stageY = py + gridY + 3 * (chipH + 10) + 24;
  const phaseY = stageY + stageH + 12 + roundRows * (roundH + 8) + 4;
  const phaseW = (pw - 60 - 10 * (phaseCount - 1)) / phaseCount;
  return {
    px, py, pw, ph, rounds, secretRound, roundCount, phases, phaseCount,
    region: i => ({ x: px + 30 + (i % 3) * (chipW + 10), y: py + gridY + Math.floor(i / 3) * (chipH + 10), w: chipW, h: chipH }),
    stage: i => ({ x: px + 30 + i * (chipW + 10), y: stageY, w: chipW, h: stageH }),
    round: i => secretRound
      ? ({ x: px + 30 + (i % 2) * ((pw - 70) / 2 + 10),
          y: stageY + stageH + 12 + Math.floor(i / 2) * (roundH + 8), w: (pw - 70) / 2, h: roundH })
      : ({ x: px + 30 + i * (chipW + 10), y: stageY + stageH + 12, w: chipW, h: roundH }),
    phase: i => ({ x: px + 30 + i * (phaseW + 10), y: phaseY, w: phaseW, h: phaseH }),
    start: { x: px + pw / 2 - 110, y: py + ph - 60, w: 220, h: 44 },
    close: { x: px + pw - 44, y: py + 10, w: 34, h: 34 },
  };
}
function presetGeom(i) { return setupLayout().chip(i); }
function sliderGeom(i) { return advLayout().slider(i); }
function startBtnGeom() { return setupLayout().start; }
function dexBtnGeom() { return menuLayout().dex; }
// Pause actions share one row. SETTINGS is available mid-run so touch players
// can fix follow speed / button placement without abandoning their journey.
function pauseActionLayout() {
  const gap = 12, totalW = Math.min(520, W * 0.9), h = 46;
  const w = (totalW - gap) / 2, x = W / 2 - totalW / 2, y = H * 0.72;
  return {
    settings: { x, y, w, h },
    quit: { x: x + w + gap, y, w, h },
  };
}
function pauseSettingsGeom() { return pauseActionLayout().settings; }
function pauseQuitGeom() { return pauseActionLayout().quit; }
function gameOverLayout() {
  const narrow = W < 620, pw = Math.min(620, W * 0.94);
  const ph = Math.min(H * 0.86, narrow ? 560 : 500);
  const px = W / 2 - pw / 2, py = Math.max(22, H / 2 - ph / 2);
  const gap = 10, by = py + ph - (narrow ? 116 : 62);
  const bw = narrow ? (pw - 42) / 2 : (pw - 70) / 4;
  return {
    px, py, pw, ph, narrow,
    button: i => ({ x: px + 16 + (i % (narrow ? 2 : 4)) * (bw + gap),
      y: by + Math.floor(i / (narrow ? 2 : 4)) * 50, w: bw, h: 42 }),
    share: { x: px + 16, y: py + ph - 164, w: pw - 32, h: 38 },
  };
}
// ---- CHEAT CODES: a small ornate chip on the PAUSE screen (visible when
// you go looking, never on screen during play — no temptation mid-run)
let cheatOpen = false;
function cheatBtnGeom() {
  const q = pauseQuitGeom();
  return { x: W / 2 - 84, y: Math.min(H - 44, q.y + q.h + 16), w: 168, h: 30 };
}
function cheatLayout() {
  const pw = Math.min(440, W * 0.94), cols = 3;
  const rows = Math.ceil(SKIN.cheatItems.length / cols);
  const chipW = (pw - 48 - (cols - 1) * 10) / cols, chipH = 46;
  const ph = Math.min(H - 24, 104 + rows * (chipH + 10) + 18);
  const px = W / 2 - pw / 2, py = Math.max(12, H / 2 - ph / 2);
  return {
    px, py, pw, ph, cols,
    chip: i => ({ x: px + 24 + (i % cols) * (chipW + 10), y: py + 92 + Math.floor(i / cols) * (chipH + 10), w: chipW, h: chipH }),
    close: { x: px + pw - 44, y: py + 10, w: 34, h: 34 },
  };
}
let dragSlider = -1;
