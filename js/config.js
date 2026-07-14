'use strict';
// ============================================================
//  SETTINGS & DIFFICULTY (all knobs in one place)
// ============================================================
const PRESETS = {
  easy:     { label: 'EASY',     descent: 0.42, shotRate: 0.42, shotSpeed: 0.65, bossHp: 0.6,  brickHp: 0.85, ballSpeed: 0.85, lives: 4 },
  normal:   { label: 'NORMAL',   descent: 0.85, shotRate: 0.75, shotSpeed: 0.85, bossHp: 1,    brickHp: 1,    ballSpeed: 0.95, lives: 3 },
  hard:     { label: 'HARD',     descent: 1.35, shotRate: 1.45, shotSpeed: 1.12, bossHp: 1.3,  brickHp: 1.2,  ballSpeed: 1.1,  lives: 3 },
  nuzlocke: { label: 'NUZLOCKE', descent: 1.6,  shotRate: 1.9,  shotSpeed: 1.25, bossHp: 1.5,  brickHp: 1.35, ballSpeed: 1.18, lives: 1 },
};
const SETTINGS = Object.assign(
  { drops: 1, speed: 1, preset: 'easy', sfx: 1, music: 0.8, starter: 'none',
    reduceShake: false, reduceFlash: false, hcBall: false, mode: 'classic' },
  (v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {})(loadStore('pkbrk-settings', '{}')));
if (!PRESETS[SETTINGS.preset]) SETTINGS.preset = 'easy';
// game MODE — the FIRST choice, on the title screen. Two headliners (the
// classic brick-breaker and full SPACE JUNKIE — no wall, every wave airborne,
// your starter IS the ship) plus BLASTER, the experimental hybrid: the same
// walls but no ball, cleared entirely by shooting. Difficulty + starter are
// picked on the setup page AFTER the mode.
const MODES = [
  { key: 'classic', label: 'BRICK BREAKER', desc: 'BALL + BLASTER', accent: '#ffd54f',
    lines: ['THE CLASSIC — SMASH THE WALL', 'WITH BALL AND BLASTER'] },
  { key: 'junkie',  label: 'SPACE JUNKIE', desc: 'PURE SHOOTER', accent: '#ab47bc',
    lines: ['NO WALL · PURE SHOOTER', 'YOUR POKÉMON IS THE SHIP'] },
  { key: 'blaster', label: 'BLASTER', desc: 'EXPERIMENTAL MIX', accent: '#4dd0e1',
    lines: ['BRICK WALLS, NO BALL · HOLD TO CHARGE'] },
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
  return {
    lv: lvl,
    descent: (3 + lvl * 1.4) * p.descent * a * (mod?.key === 'swift' ? 1.35 : 1) * Math.max(0.7, Math.min(1, H / 900)),
    enemyShotInt: Math.max(1.4, 5.5 - lvl * 0.5) / (p.shotRate * a) / (mod?.key === 'ambush' ? 1.8 : mod?.key === 'bounty' ? 1.3 : 1),
    bossShotInt: Math.max(1.8, 4.5 - lvl * 0.2) / (p.shotRate * a),
    ballSpeed: 520 * p.ballSpeed * speedScale(),
    shotSpeed: p.shotSpeed * speedScale(),
    // drops are rare on purpose — each one should feel like an event
    dropChance: 0.06 * SETTINGS.drops * (mod?.key === 'swift' ? 1.4 : 1)
      * (G.starter === 'grass' ? 1.2 + 0.15 * (G.starterLvl - 1) : 1) // Overgrowth
      * (1 + 0.6 * upgN('fortune')), // Bond path tier 3
    catchChance: 0.07,
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
];
const STARTERS = [
  { key: 'none', label: 'NONE' },
  { key: 'fire', label: 'CHARMANDER' },
  { key: 'water', label: 'SQUIRTLE' },
  { key: 'grass', label: 'BULBASAUR' },
];
let advOpen = false; // advanced settings panel
// the menu is TWO pages now: 'modes' (title + pick your game) then 'setup'
// (difficulty + starter for the chosen mode, then START). Anything that
// returns to the menu resets this to 'modes'.
let menuPage = 'modes';
// PAGE 1 — title + mode select. Responsive layout shared by rendering and
// hit-testing so nothing drifts off-screen. Concerns:
//  • SHORT viewports (landscape phones) compress every gap and collapse the
//    footer links into a single row — the whole page must fit H<400.
//  • NARROW phones stack the two headliner cards vertically.
//  • a saved run adds a CONTINUE button below the cards (RUN_CKPT, state.js).
function menuLayout() {
  const hasCkpt = typeof RUN_CKPT !== 'undefined' && !!RUN_CKPT;
  const short = H < 560;
  const stacked = W < 560; // headliner cards side-by-side, or stacked on phones
  const s = Math.max(0.62, Math.min(1, H / 820, W / 760));
  const titleSize = short ? Math.min(30, W / 16) : Math.min(52, W / 11) * Math.max(0.8, s);
  const titleY = short ? 24 : Math.max(54, H * 0.09);
  const tagY = short ? titleY + titleSize + 10 : titleY + titleSize * 1.4 + 12;
  const pickLabelY = tagY + (short ? 14 : 24);
  const gap = 14;
  const oneRow = short || stacked || (hasCkpt && H < 820);
  const cardW = stacked ? Math.min(430, W * 0.9) : Math.min(304, (W - 72) / 2);
  const expW = stacked ? cardW : Math.min(440, W * 0.86);
  const expH = short ? 32 : 48;
  const resumeW = Math.min(360, W * 0.86);
  const resumeH = hasCkpt ? (short ? 32 : 52) : 0;
  const footerH = oneRow ? 26 : 96; // 3 stacked links span ~96px
  const gE = short ? 8 : 16, gR = short ? 8 : 14, gF = short ? 10 : 20;
  // top-anchor the card block under the picker label, then let the cards grow
  // to fill the height (capped so two big cards never look stretched); the
  // region backdrop scenery breathes at the very bottom.
  const regionBot = H - (short ? 12 : Math.max(22, H * 0.05));
  const cardsY = pickLabelY + (short ? 10 : 18);
  const tail = gE + expH + (hasCkpt ? gR + resumeH : 0) + gF + footerH;
  const roomForCards = regionBot - cardsY - tail;
  const cardH = short ? 72
    : stacked ? Math.min(156, Math.max(112, (roomForCards - gap) / 2))
    : Math.min(196, Math.max(120, Math.min(roomForCards, 150 * s + 20)));
  const cardsH = stacked ? cardH * 2 + gap : cardH;
  const expY = cardsY + cardsH + gE;
  const resumeY = expY + expH + (hasCkpt ? gR : 0);
  const footerY = resumeY + (hasCkpt ? resumeH : 0) + gF;
  const fW = Math.min(230, (W - 56) / 3);
  return {
    s, short, stacked, oneRow, titleY, titleSize, tagY, pickLabelY,
    card: i => stacked
      ? { x: W / 2 - cardW / 2, y: cardsY + i * (cardH + gap), w: cardW, h: cardH }
      : { x: W / 2 - cardW - gap / 2 + i * (cardW + gap), y: cardsY, w: cardW, h: cardH },
    exp: { x: W / 2 - expW / 2, y: expY, w: expW, h: expH },
    resume: hasCkpt ? { x: W / 2 - resumeW / 2, y: resumeY, w: resumeW, h: resumeH } : null,
    dex: oneRow ? { x: W / 2 - fW * 1.5 - 14, y: footerY, w: fW, h: 26 }
      : { x: W / 2 - 170, y: footerY, w: 340, h: 30 },
    trial: oneRow ? { x: W / 2 - fW / 2, y: footerY, w: fW, h: 26 }
      : { x: W / 2 - 170, y: footerY + 34, w: 340, h: 28 },
    adv: oneRow ? { x: W / 2 + fW / 2 + 14, y: footerY, w: fW, h: 26 }
      : { x: W / 2 - 130, y: footerY + 66, w: 260, h: 28 },
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
  const bottomPad = short ? 10 : H * 0.05;
  const slack = (H - bottomPad) - headBottom - (starterGroup + diffGroup + btnH);
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
  };
}
// advanced settings overlay (sliders + accessibility toggles)
function advLayout() {
  const pw = Math.min(440, W * 0.92);
  const rowH = 52, togH = 40;
  const ph = 74 + SLIDERS.length * rowH + TOGGLES.length * togH + 54;
  const px = W / 2 - pw / 2, py = Math.max(20, H / 2 - ph / 2);
  return {
    px, py, pw, ph,
    slider: i => ({ x: px + 36, y: py + 88 + i * rowH, w: pw - 72 }),
    toggle: i => ({ x: px + 30, y: py + 74 + SLIDERS.length * rowH + i * togH, w: pw - 60, h: togH - 8 }),
    close: { x: px + pw - 44, y: py + 10, w: 34, h: 34 },
  };
}
// trial mode overlay: 3×3 region grid + stage picker + start
let trialOpen = false;
const trialSel = { region: 0, stage: 0 };
function trialLayout() {
  const pw = Math.min(470, W * 0.94);
  const chipW = (pw - 60 - 20) / 3, chipH = 48, stageH = 38;
  const gridY = 96;
  const ph = gridY + 3 * (chipH + 10) + 30 + stageH + 84;
  const px = W / 2 - pw / 2, py = Math.max(16, H / 2 - ph / 2);
  return {
    px, py, pw, ph,
    region: i => ({ x: px + 30 + (i % 3) * (chipW + 10), y: py + gridY + Math.floor(i / 3) * (chipH + 10), w: chipW, h: chipH }),
    stage: i => ({ x: px + 30 + i * (chipW + 10), y: py + gridY + 3 * (chipH + 10) + 24, w: chipW, h: stageH }),
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
let dragSlider = -1;
