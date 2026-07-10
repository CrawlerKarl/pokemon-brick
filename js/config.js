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
    reduceShake: false, reduceFlash: false, hcBall: false },
  JSON.parse(localStorage.getItem('pkbrk-settings') || '{}'));
if (!PRESETS[SETTINGS.preset]) SETTINGS.preset = 'easy';
function saveSettings() { localStorage.setItem('pkbrk-settings', JSON.stringify(SETTINGS)); }
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
// one responsive layout, shared by rendering and hit-testing, so nothing
// can drift off-screen on small windows or phones
function menuLayout() {
  const s = Math.max(0.62, Math.min(1, H / 820, W / 760));
  const titleSize = Math.min(52, W / 11) * Math.max(0.8, s);
  const titleY = Math.max(54, H * 0.11);
  const lineH = 22 * s + 2;
  const infoY = titleY + titleSize * 1.55 + 14 * s;
  const chipGap = 10;
  const chipW = Math.min(126, (W - 40 - chipGap * 3) / 4), chipH = 40 * s + 4;
  const starterH = 58 * s + 6; // taller: partner sprite + ability line
  const startLabelY = infoY + 2 * lineH + 22 * s;
  const startY = startLabelY + 14;
  const starterInfoY = startY + starterH + 16; // readable ability detail lines
  const chipsLabelY = starterInfoY + 34 + 12 * s;
  const chipsY = chipsLabelY + 14;
  const btnW = Math.min(300, W * 0.84), btnH = 54 * s + 8;
  const btnY = chipsY + chipH + 44 * s;
  return {
    s, titleY, titleSize, infoY, lineH, chipsLabelY, startLabelY, starterInfoY,
    starter: i => ({ x: W / 2 - (chipW * 4 + chipGap * 3) / 2 + i * (chipW + chipGap), y: startY, w: chipW, h: starterH }),
    chip: i => ({ x: W / 2 - (chipW * 4 + chipGap * 3) / 2 + i * (chipW + chipGap), y: chipsY, w: chipW, h: chipH }),
    start: { x: W / 2 - btnW / 2, y: btnY, w: btnW, h: btnH },
    dex: { x: W / 2 - 170, y: btnY + btnH + 14, w: 340, h: 30 },
    trial: { x: W / 2 - 170, y: btnY + btnH + 48, w: 340, h: 28 },
    adv: { x: W / 2 - 130, y: btnY + btnH + 80, w: 260, h: 28 },
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
function presetGeom(i) { return menuLayout().chip(i); }
function sliderGeom(i) { return advLayout().slider(i); }
function startBtnGeom() { return menuLayout().start; }
function dexBtnGeom() { return menuLayout().dex; }
// "QUIT TO MENU" button on the pause overlay
function pauseQuitGeom() {
  const w = Math.min(260, W * 0.72), h = 46;
  return { x: W / 2 - w / 2, y: H * 0.72, w, h };
}
let dragSlider = -1;
