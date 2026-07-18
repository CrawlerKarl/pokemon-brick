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
    hcBall: false, autoFire: false, mode: 'junkie',
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
// SKIN carries the current theme (today: Pokémon); a future re-theme swaps
// these strings + the art without touching mechanics or storage keys.
const GAME_TITLE = 'WAVEBREAKER';
const SKIN_EDITION = 'POKÉMON EDITION';
// game MODE — the FIRST choice, on the title screen. Three ways to play the
// same journey (one wave engine underneath — buildLevel branches on the key):
// BREAKER is the classic ball-first brick-breaker, BLASTER trades the ball
// for pure firepower against the same walls, STARFIGHTER drops the wall and
// puts you in the cockpit. Labels are presentation only — the internal keys
// (classic / blaster / junkie) are storage-stable: saved settings, run
// checkpoints and tests reference them, so never rename a key.
const MODES = [
  { key: 'junkie',  label: 'STARFIGHTER', desc: '★ FEATURED · FLYING SHOOTER', mechanic: 'YOU FLY + FIRE', accent: '#c06cff',
    lines: ['PILOT A POKÉMON · DODGE ENEMY FIRE', 'TAP TO ATTACK · HOLD FOR PIERCING CHARGE'] },
  { key: 'classic', label: 'BREAKER', desc: 'CLASSIC · BRICK BREAKER', mechanic: 'BALL + PADDLE', accent: '#ffd54f',
    lines: ['BOUNCE THE BALL · BREAK EVERY BLOCK', 'MOVE THE PADDLE · BUILD RALLIES'] },
  { key: 'blaster', label: 'BLASTER', desc: 'ARCADE · WALL SHOOTER', mechanic: 'NO BALL · DIRECT FIRE', accent: '#4dd0e1',
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
      * (1 + 0.5 * upgN('fortune')), // Bond path tier 3
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
// labels MUST match STARTER_MON's tier-1 names (data.js) — config.js parses
// before data.js, so they can't be derived here; keep the two in sync
const STARTERS = [
  { key: 'fire', label: 'CHARMANDER' }, { key: 'water', label: 'SQUIRTLE' },
  { key: 'grass', label: 'BULBASAUR' }, { key: 'electric', label: 'PIKACHU' },
  { key: 'normal', label: 'PORYGON' }, { key: 'flying', label: 'PIDGEY' },
  { key: 'ice', label: 'SPHEAL' }, { key: 'fighting', label: 'MACHOP' },
  { key: 'poison', label: 'NIDORAN' }, { key: 'ground', label: 'RHYHORN' },
  { key: 'psychic', label: 'ABRA' }, { key: 'bug', label: 'CATERPIE' },
  { key: 'rock', label: 'LARVITAR' }, { key: 'ghost', label: 'GASTLY' },
  { key: 'dragon', label: 'DRATINI' }, { key: 'dark', label: 'SANDILE' },
  { key: 'steel', label: 'MAGNEMITE' }, { key: 'fairy', label: 'TOGEPI' },
];
if (SETTINGS.starter !== 'none' && !STARTERS.some(s => s.key === SETTINGS.starter)) SETTINGS.starter = 'none';
let advOpen = false; // advanced settings panel
let settingsPage = 0; // 0 = game/accessibility, 1 = touch controls
function activeSliders() { return settingsPage === 1 ? TOUCH_SLIDERS : SLIDERS; }
function activeToggles() { return settingsPage === 1 ? TOUCH_TOGGLES : TOGGLES; }
// The menu has a featured title hub followed by a two-step setup wizard:
// all partners on one screen, then challenge + launch. Anything that returns
// to the menu resets to the featured title hub.
let menuPage = 'modes';
let setupStep = 'pilot'; // setup is a two-screen flow: all pilots → challenge
// PAGE 1 — title + mode select. Responsive layout shared by rendering and
// hit-testing so nothing drifts off-screen. Concerns:
//  • SHORT viewports (landscape phones) compress every gap and collapse the
//    footer links into a single row — the whole page must fit H<400.
//  • NARROW phones stack the STARFIGHTER hero above two arcade cards.
//  • a saved run adds a CONTINUE button below the cards (RUN_CKPT, state.js).
function menuLayout() {
  const hasCkpt = typeof RUN_CKPT !== 'undefined' && !!RUN_CKPT;
  const short = H < 560;
  const stacked = W < 620; // three cards in a row, or a column on phones
  const s = Math.max(0.62, Math.min(1, H / 820, W / 760));
  const titleSize = short ? Math.min(24, W / 18) : Math.min(44, W / 13) * Math.max(0.8, s);
  const titleY = short ? 18 : Math.max(36, H * 0.055);
  const tagY = titleY + titleSize * (short ? 1.05 : 1.42) + (short ? 4 : 8);
  // the three mode cards FILL everything between the title band and the
  // bottom stack (continue → footer row) — no dead space
  const gap = short ? 10 : 16;
  const resumeH = hasCkpt ? (short ? 30 : 44) : 0;
  const footerH = short ? 28 : 34;
  const progressH = short ? 28 : 42;
  const padB = short ? 6 : 14;
  const cardsY = tagY + (short ? 10 : 16);
  const quickH = short ? 28 : 40;
  const quickRowW = Math.min(440, W * 0.92), quickGap = short ? 7 : 10;
  const quickW = (quickRowW - quickGap) * 0.58;
  const dailyW = quickRowW - quickGap - quickW;
  const quickY = cardsY;
  const heroY = quickY + quickH + (short ? 7 : 10);
  const bottom = H - padB;
  const footerY = bottom - footerH;
  const progressY = footerY - progressH - (short ? 5 : 8);
  const resumeY = progressY - (hasCkpt ? resumeH + (short ? 6 : 10) : 0);
  const cardsBot = (hasCkpt ? resumeY : progressY) - (short ? 6 : 12);
  const modesW = Math.min(W * 0.96, 1240);
  const cardW = stacked ? Math.min(W * 0.94, 540) : modesW;
  const cardsH = Math.max(short ? 110 : 190, cardsBot - heroY);
  const primaryH = stacked ? Math.max(cardsH * 0.58, short ? 70 : 150) : cardsH;
  const secondaryH = stacked ? Math.max(48, cardsH - primaryH - gap) : (cardsH - gap) / 2;
  const primaryW = stacked ? cardW : modesW * 0.66;
  const secondaryW = stacked ? (cardW - gap) / 2 : modesW - primaryW - gap;
  const left = W / 2 - cardW / 2;
  const desktopLeft = W / 2 - modesW / 2;
  const resumeW = Math.min(380, W * 0.86);
  const fW = Math.min(230, (W - 44) / 2);
  return {
    s, short, stacked, titleY, titleSize, tagY,
    quick: { x: W / 2 - quickRowW / 2, y: quickY, w: quickW, h: quickH },
    daily: { x: W / 2 - quickRowW / 2 + quickW + quickGap, y: quickY, w: dailyW, h: quickH },
    card: i => stacked
      ? i === 0
        ? { x: left, y: heroY, w: cardW, h: primaryH }
        : { x: left + (i - 1) * (secondaryW + gap), y: heroY + primaryH + gap, w: secondaryW, h: secondaryH }
      : i === 0
        ? { x: desktopLeft, y: heroY, w: primaryW, h: cardsH }
        : { x: desktopLeft + primaryW + gap, y: heroY + (i - 1) * (secondaryH + gap), w: secondaryW, h: secondaryH },
    resume: hasCkpt ? { x: W / 2 - resumeW / 2, y: resumeY, w: resumeW, h: resumeH } : null,
    progress: { x: Math.max(10, W / 2 - Math.min(920, W * 0.94) / 2), y: progressY,
      w: Math.min(920, W * 0.94), h: progressH },
    dex: { x: W / 2 - fW - 10, y: footerY, w: fW, h: footerH },
    adv: { x: W / 2 + 10, y: footerY, w: fW, h: footerH },
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
    const cols = narrow ? 3 : W < 900 ? 6 : 9;
    const rows = Math.ceil(STARTERS.length / cols);
    const gap = short ? 5 : narrow ? 7 : 10;
    const gridY = sectionY + (short ? 14 : 24);
    const nextH = short ? 40 : narrow ? 52 : 54;
    const nextW = narrow ? contentW : Math.min(420, contentW * 0.46);
    const nextY = H - bottomPad - nextH;
    const noneH = short ? 22 : 26;
    const noneY = nextY - noneH - (short ? 5 : 8);
    const minInfo = short ? 0 : narrow ? 30 : 74;
    const gridRoom = noneY - minInfo - (short ? 5 : 12) - gridY;
    const maxCardH = short ? 54 : narrow ? 88 : 108;
    const cardH = Math.max(short ? 36 : 48,
      Math.min(maxCardH, (gridRoom - gap * (rows - 1)) / rows));
    const cardW = (contentW - gap * (cols - 1)) / cols;
    const gridH = rows * cardH + (rows - 1) * gap;
    const infoY = gridY + gridH + (short ? 4 : 10);
    const infoH = Math.max(0, Math.min(narrow ? 54 : 96, noneY - infoY - (short ? 4 : 8)));
    return {
      step: 'pilot', s, short, narrow, compactPhone, headY, headSize, subY, sectionY, contentW, back,
      starter: i => { const c = i % cols, r = Math.floor(i / cols);
        return { x: cx - contentW / 2 + c * (cardW + gap), y: gridY + r * (cardH + gap), w: cardW, h: cardH }; },
      none: { x: cx - Math.min(290, contentW * 0.72) / 2, y: noneY, w: Math.min(290, contentW * 0.72), h: noneH },
      info: { x: cx - Math.min(contentW, 760) / 2, y: infoY, w: Math.min(contentW, 760), h: infoH },
      next: { x: cx - nextW / 2, y: nextY, w: nextW, h: nextH },
    };
  }

  const trialH = short ? 22 : 28;
  const trialY = H - bottomPad - trialH;
  const startH = short ? 42 : narrow ? 58 : 58;
  const startW = narrow ? contentW : Math.min(430, contentW * 0.48);
  const startY = trialY - startH - (short ? 5 : 9);
  const summaryY = sectionY + (short ? 10 : 20);
  const summaryH = short ? 54 : narrow ? 84 : 96;
  const summaryW = Math.min(contentW, narrow ? contentW : 760);
  const editW = short ? 64 : narrow ? 78 : 118;
  const diffLabelY = summaryY + summaryH + (short ? 14 : 25);
  const chipY = diffLabelY + (short ? 10 : 20);
  const cols = narrow ? 2 : 4, rows = Math.ceil(Object.keys(PRESETS).length / cols);
  const gap = short ? 7 : 12;
  const chipW = (contentW - gap * (cols - 1)) / cols;
  const chipRoom = startY - (short ? 8 : 18) - chipY;
  const chipH = Math.max(short ? 34 : 58, Math.min(narrow ? 92 : 108, (chipRoom - gap * (rows - 1)) / rows));
  return {
    step: 'difficulty', s, short, narrow, compactPhone, headY, headSize, subY, sectionY, contentW, back,
    summary: { x: cx - summaryW / 2, y: summaryY, w: summaryW, h: summaryH },
    editPilot: { x: cx + summaryW / 2 - editW - 10, y: summaryY + summaryH / 2 - (short ? 13 : 17), w: editW, h: short ? 26 : 34 },
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
    tab: i => ({ x: px + 28 + i * (pw - 56) / 2, y: py + (compact ? 48 : 58), w: (pw - 56) / 2, h: compact ? 30 : 36 }),
    slider: i => ({ x: px + 36, y: py + top + i * rowH, w: pw - 72 }),
    toggle: i => ({ x: px + 30, y: py + top + sliders.length * rowH + i * togH, w: pw - 60, h: togH - (compact ? 4 : 8) }),
    close: { x: px + pw - 44, y: py + 10, w: 34, h: 34 },
  };
}
// trial mode overlay: 3×3 region grid + stage picker + start
let trialOpen = false;
const trialSel = { region: 0, stage: 0, round: 0 };
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
  const ph = gridY + 3 * (chipH + 10) + 30 + stageH + roundGap + 84;
  const px = W / 2 - pw / 2, py = Math.max(16, H / 2 - ph / 2);
  const stageY = py + gridY + 3 * (chipH + 10) + 24;
  return {
    px, py, pw, ph, rounds, secretRound, roundCount,
    region: i => ({ x: px + 30 + (i % 3) * (chipW + 10), y: py + gridY + Math.floor(i / 3) * (chipH + 10), w: chipW, h: chipH }),
    stage: i => ({ x: px + 30 + i * (chipW + 10), y: stageY, w: chipW, h: stageH }),
    round: i => secretRound
      ? ({ x: px + 30 + (i % 2) * ((pw - 70) / 2 + 10),
          y: stageY + stageH + 12 + Math.floor(i / 2) * (roundH + 8), w: (pw - 70) / 2, h: roundH })
      : ({ x: px + 30 + i * (chipW + 10), y: stageY + stageH + 12, w: chipW, h: roundH }),
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
  const rows = Math.ceil(CHEAT_ITEMS.length / cols);
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
