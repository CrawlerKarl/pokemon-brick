'use strict';
// ============================================================
//  SETTINGS & DIFFICULTY (all knobs in one place)
// ============================================================
const PRESETS = {
  easy:     { label: 'EASY',     descent: 0.42, shotRate: 0.5,  shotSpeed: 0.65, bossHp: 0.68, brickHp: 0.9,  ballSpeed: 0.85, lives: 5 },
  normal:   { label: 'NORMAL',   descent: 0.9,  shotRate: 1.0,  shotSpeed: 0.9,  bossHp: 1.12, brickHp: 1.15, ballSpeed: 0.95, lives: 4 },
  hard:     { label: 'HARD',     descent: 1.42, shotRate: 1.85, shotSpeed: 1.18, bossHp: 1.45, brickHp: 1.38, ballSpeed: 1.1,  lives: 3 },
  nuzlocke: { label: 'NUZLOCKE', descent: 1.68, shotRate: 2.35, shotSpeed: 1.3,  bossHp: 1.65, brickHp: 1.55, ballSpeed: 1.18, lives: 1 },
};
const SETTINGS = Object.assign(
  { drops: 1, speed: 1, preset: 'easy', sfx: 1, music: 0.8, starter: 'none',
    reduceShake: false, reduceFlash: false, hcBall: false, autoFire: false, mode: 'classic',
    buttonScale: 1, buttonOpacity: 0.85, touchFollow: 1,
    leftHanded: false, haptics: true },
  (v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {})(loadStore('pkbrk-settings', '{}')));
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
  { key: 'classic', label: 'BREAKER', desc: 'THE CLASSIC', accent: '#ffd54f',
    lines: ['BOUNCE THE BALL · SMASH THE WALL', 'EARN A BLASTER AS YOU GO'] },
  { key: 'blaster', label: 'BLASTER', desc: 'PURE FIREPOWER', accent: '#4dd0e1',
    lines: ['SAME WALLS · NO BALL', 'TAP TO SHOOT · HOLD TO CHARGE'] },
  { key: 'junkie',  label: 'STARFIGHTER', desc: 'FULL FLIGHT', accent: '#ab47bc',
    lines: ['NO WALL · EVERY WAVE FLIES', 'YOUR PARTNER IS THE SHIP'] },
];
if (!MODES.some(m => m.key === SETTINGS.mode)) SETTINGS.mode = 'classic';
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
  return {
    lv: lvl,
    descent: (3 + lvl * 1.4) * p.descent * a * (mod?.key === 'swift' ? 1.35 : 1) * Math.max(0.7, Math.min(1, H / 900)),
    enemyShotInt: Math.max(1.25, 5.5 - lvl * 0.5) / (p.shotRate * a) / curve
      * (stageIdx(G.level) === 2 ? 1.35 : 1)
      / (mod?.key === 'ambush' ? 1.8 : mod?.key === 'bounty' ? 1.3 : 1),
    bossShotInt: Math.max(1.8, 4.5 - lvl * 0.2) / (p.shotRate * a) / (0.88 + 0.38 * sm),
    ballSpeed: 520 * p.ballSpeed * speedScale(),
    shotSpeed: p.shotSpeed * speedScale() * (0.9 + 0.24 * sm),
    // drops are rare on purpose — each one should feel like an event
    dropChance: 0.06 * (G.daily ? 1 : SETTINGS.drops) * (mod?.key === 'swift' ? 1.4 : 1)
      * (G.starter === 'grass' ? 1.2 + 0.15 * (G.starterLvl - 1) : 1) // Overgrowth
      * (1 + 0.5 * upgN('fortune')), // Bond path tier 3
    catchChance: 0.07 * (!G.daily && dexRewardActive('lucky') ? 1.25 : 1),
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
const STARTERS = [
  { key: 'none', label: 'NONE' },
  { key: 'fire', label: 'CHARMANDER' },
  { key: 'water', label: 'SQUIRTLE' },
  { key: 'grass', label: 'BULBASAUR' },
];
let advOpen = false; // advanced settings panel
let settingsPage = 0; // 0 = game/accessibility, 1 = touch controls
function activeSliders() { return settingsPage === 1 ? TOUCH_SLIDERS : SLIDERS; }
function activeToggles() { return settingsPage === 1 ? TOUCH_TOGGLES : TOGGLES; }
// the menu is TWO pages now: 'modes' (title + pick your game) then 'setup'
// (difficulty + starter for the chosen mode, then START). Anything that
// returns to the menu resets this to 'modes'.
let menuPage = 'modes';
// PAGE 1 — title + mode select. Responsive layout shared by rendering and
// hit-testing so nothing drifts off-screen. Concerns:
//  • SHORT viewports (landscape phones) compress every gap and collapse the
//    footer links into a single row — the whole page must fit H<400.
//  • NARROW phones stack the three mode cards vertically.
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
  const footerH = short ? 22 : 28;
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
  const resumeY = footerY - (hasCkpt ? resumeH + (short ? 6 : 10) : 0);
  const cardsBot = (hasCkpt ? resumeY : footerY) - (short ? 6 : 12);
  const cardW = stacked ? Math.min(W * 0.94, 540) : (Math.min(W * 0.96, 1240) - gap * 2) / 3;
  const cardsH = Math.max(short ? 110 : 190, cardsBot - heroY);
  const cardH = stacked ? (cardsH - gap * 2) / 3 : cardsH;
  const left = stacked ? W / 2 - cardW / 2 : W / 2 - (cardW * 3 + gap * 2) / 2;
  const resumeW = Math.min(380, W * 0.86);
  const fW = Math.min(230, (W - 44) / 2);
  return {
    s, short, stacked, titleY, titleSize, tagY,
    quick: { x: W / 2 - quickRowW / 2, y: quickY, w: quickW, h: quickH },
    daily: { x: W / 2 - quickRowW / 2 + quickW + quickGap, y: quickY, w: dailyW, h: quickH },
    card: i => stacked
      ? { x: W / 2 - cardW / 2, y: heroY + i * (cardH + gap), w: cardW, h: cardH }
      : { x: left + i * (cardW + gap), y: heroY, w: cardW, h: cardH },
    resume: hasCkpt ? { x: W / 2 - resumeW / 2, y: resumeY, w: resumeW, h: resumeH } : null,
    dex: { x: W / 2 - fW - 10, y: footerY, w: fW, h: footerH },
    adv: { x: W / 2 + 10, y: footerY, w: fW, h: footerH },
  };
}
// PAGE 2 — setup for the chosen mode: starter Pokémon, difficulty, START.
// Tall portrait phones get 2×2 grids of BIG cards; the sections are then
// spread down the whole screen (even vGap) instead of crammed at the top.
function setupLayout() {
  const short = H < 560;
  const narrow = W < 620 && H >= 660; // tall portrait: 2×2 grids, big cards
  const s = Math.max(0.72, Math.min(1.1, H / 780, W / 720));
  const cx = W / 2;
  const marginX = Math.max(16, W * 0.05);
  const contentW = Math.min(W - marginX * 2, 560);
  const gap = short ? 8 : 12;
  const headSize = short ? Math.min(22, W / 16) : Math.min(46, W / 12);
  const headY = short ? 26 : Math.max(54, H * 0.085);
  const headBottom = headY + headSize * 0.6 + (short ? 12 : 30);
  // starter + difficulty grids: 2×2 on tall phones, one row otherwise
  const stCols = narrow ? 2 : 4, stRows = 4 / stCols;
  const stW = (contentW - gap * (stCols - 1)) / stCols;
  const stH = short ? 40 : narrow ? Math.min(104, Math.max(84, stW * 0.56)) : Math.min(86, stW * 0.66);
  const dfCols = narrow ? 2 : 4, dfRows = 4 / dfCols;
  const dfW = (contentW - gap * (dfCols - 1)) / dfCols;
  const dfH = short ? 32 : narrow ? 58 : 52;
  const btnW = narrow ? contentW : Math.min(340, contentW);
  const btnH = short ? 40 : narrow ? 70 : 60;
  const labelGap = short ? 20 : 32; // grid top sits below its section label
  const infoH = short ? 0 : 42;     // starter ability description block
  // three section groups distributed with an even gap that soaks up slack
  const starterGroup = labelGap + stRows * stH + (stRows - 1) * gap + infoH;
  const diffGroup = labelGap + dfRows * dfH + (dfRows - 1) * gap;
  const trialH = short ? 24 : 30; // per-game TRIAL link under START
  const bottomPad = short ? 10 : H * 0.05;
  const slack = (H - bottomPad) - headBottom - (starterGroup + diffGroup + btnH + trialH + (short ? 6 : 10));
  const vGap = Math.max(short ? 10 : 18, Math.min(slack / 3, short ? 22 : narrow ? 54 : 40));
  let y = headBottom + vGap;
  const starterGridY = y + labelGap;
  const startLabelY = starterGridY - (short ? 12 : 16);
  y = starterGridY + stRows * stH + (stRows - 1) * gap;
  const starterInfoY = short ? y + 8 : y + 18;
  y = short ? y : y + infoH;
  y += vGap;
  const chipsGridY = y + labelGap;
  const chipsLabelY = chipsGridY - (short ? 12 : 16);
  y = chipsGridY + dfRows * dfH + (dfRows - 1) * gap;
  y += vGap;
  const btnY = y;
  return {
    s, short, narrow, headY, headSize, startLabelY, starterInfoY, chipsLabelY,
    back: { x: 14, y: 14, w: 96, h: 36 },
    starter: i => { const c = i % stCols, r = Math.floor(i / stCols);
      return { x: cx - contentW / 2 + c * (stW + gap), y: starterGridY + r * (stH + gap), w: stW, h: stH }; },
    chip: i => { const c = i % dfCols, r = Math.floor(i / dfCols);
      return { x: cx - contentW / 2 + c * (dfW + gap), y: chipsGridY + r * (dfH + gap), w: dfW, h: dfH }; },
    start: { x: cx - btnW / 2, y: btnY, w: btnW, h: btnH },
    // TRIAL lives with the game it belongs to — jump to any stage OF THIS MODE
    trial: { x: cx - btnW / 2, y: btnY + btnH + (short ? 6 : 10), w: btnW, h: trialH },
  };
}
// advanced settings overlay (sliders + accessibility toggles)
function advLayout() {
  const sliders = activeSliders(), toggles = activeToggles();
  const pw = Math.min(440, W * 0.92);
  const compact = H < 560;
  const rowH = compact ? 34 : 52, togH = compact ? 26 : 40;
  const top = compact ? 102 : 112, bottom = compact ? 12 : 36;
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
  // sentinels, the legendary, or the mythical of that region's gauntlet
  const rounds = trialSel.stage === 2;
  const roundH = 34, roundGap = rounds ? roundH + 14 : 0;
  const ph = gridY + 3 * (chipH + 10) + 30 + stageH + roundGap + 84;
  const px = W / 2 - pw / 2, py = Math.max(16, H / 2 - ph / 2);
  const stageY = py + gridY + 3 * (chipH + 10) + 24;
  return {
    px, py, pw, ph, rounds,
    region: i => ({ x: px + 30 + (i % 3) * (chipW + 10), y: py + gridY + Math.floor(i / 3) * (chipH + 10), w: chipW, h: chipH }),
    stage: i => ({ x: px + 30 + i * (chipW + 10), y: stageY, w: chipW, h: stageH }),
    round: i => ({ x: px + 30 + i * (chipW + 10), y: stageY + stageH + 12, w: chipW, h: roundH }),
    start: { x: px + pw / 2 - 110, y: py + ph - 60, w: 220, h: 44 },
    close: { x: px + pw - 44, y: py + 10, w: 34, h: 34 },
  };
}
function presetGeom(i) { return setupLayout().chip(i); }
function sliderGeom(i) { return advLayout().slider(i); }
function startBtnGeom() { return setupLayout().start; }
function dexBtnGeom() { return menuLayout().dex; }
// "QUIT TO MENU" button on the pause overlay
function pauseQuitGeom() {
  const w = Math.min(260, W * 0.72), h = 46;
  return { x: W / 2 - w / 2, y: H * 0.72, w, h };
}
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
