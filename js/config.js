'use strict';
// ============================================================
//  SETTINGS & DIFFICULTY (all knobs in one place)
// ============================================================
const PRESETS = {
  easy:     { label: 'EASY',     descent: 0.42, shotRate: 0.5,  shotSpeed: 0.65, bossHp: 0.68, brickHp: 0.9,  ballSpeed: 0.85, lives: 5, starThreat: 0.72, heatBuild: 0.39, heatCool: 0.29 },
  normal:   { label: 'NORMAL',   descent: 0.9,  shotRate: 1.0,  shotSpeed: 0.9,  bossHp: 1.12, brickHp: 1.15, ballSpeed: 0.95, lives: 4, starThreat: 1.0,  heatBuild: 0.42, heatCool: 0.28 },
  // AFT-021 P7: ACE separates from ADVENTURE in THREAT, not health sponges —
  // durability sits ~11% over normal (was +29%) while pattern density and
  // recovery pressure rise (starThreat 1.24 → 1.55). Duration target ≈
  // +10–20% over Adventure with meaningfully more incoming fire.
  hard:     { label: 'HARD',     descent: 1.42, shotRate: 1.85, shotSpeed: 1.18, bossHp: 1.25, brickHp: 1.24, ballSpeed: 1.1,  lives: 3, starThreat: 1.55, heatBuild: 0.44, heatCool: 0.27 },
  // AFT-008 §9.10: ONE LIFE's identity is the one-hit/tree-burn stake — it
  // no longer ALSO runs the longest bars and fastest fire (the old
  // 1.65×/2.35× triple penalty). Ace-like patterns, one-life stakes.
  nuzlocke: { label: 'NUZLOCKE', descent: 1.68, shotRate: 1.8, shotSpeed: 1.24, bossHp: 1.35, brickHp: 1.45, ballSpeed: 1.18, lives: 1, starThreat: 1.3,  heatBuild: 0.44, heatCool: 0.27 },
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
    fx: 'auto', // AFT-018/025 effects quality: auto (phone default) | full | reduced | minimal
    buttonScale: 1, buttonOpacity: 0.85, touchFollow: 1,
    leftHanded: false, haptics: true,
    // AFT-010 stage 1 — accessibility (keys are storage-stable, never rename):
    // textScale scales every UI font through the setup.js interception;
    // bgDim darkens gameplay skies for sprite contrast; hcStrength scales
    // the high-contrast outline weight; cbSafe swaps the semantic
    // green→blue "safe/healthy" colours (type identity colours untouched —
    // shape carries identity); toggleCharge taps to start/release a charge
    // instead of holding; easyCharge shortens the charge arc and widens the
    // resonant window; visualCues mirrors key audio cues as HUD pips.
    textScale: 1, bgDim: 0, hcStrength: 1, cbSafe: false,
    toggleCharge: false, easyCharge: false, visualCues: false },
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
      // AFT-007: FORTUNE's +50% moved to RESEARCH — each claimed research
      // reward tier improves field yields by +10% (all five = the old cap)
      * (G.daily ? 1 : 1 + 0.1 * SKIN.dexRewards.filter(r => DEX.size >= r.at).length)
      * Math.min(2.2, 1 + 0.08 * effStacks(stackN('dawn'))), // DAWNLIGHT CHARM — §9.9 keeps the final chance ≤ ~13%
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
  // AFT-018: a cycle, not a boolean — AUTO degrades decorative work
  // when the moving frame average exceeds budget; FULL never degrades;
  // REDUCED always runs lean; MINIMAL (AFT-025) pins the deepest rung —
  // flattened background, deepest resolution drop — for phones that still
  // struggle. Reduce-flashes below stays an ACCESSIBILITY choice, never a
  // disguised performance toggle.
  { key: 'fx', label: 'EFFECTS QUALITY', cycle: ['auto', 'full', 'reduced', 'minimal'] },
  { key: 'reduceShake', label: 'REDUCE SCREEN SHAKE' },
  { key: 'reduceFlash', label: 'REDUCE FLASHES' },
  // AFT-023: mode-neutral label; the toggle now also boosts hostile-shot
  // and pickup contrast in the shooter modes (render-only)
  { key: 'hcBall', label: 'HIGH-CONTRAST PROJECTILES' },
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
// AFT-010 stage 1 — the ACCESS page. Its own tab (the TOUCH precedent):
// the GAME page has no landscape headroom left, and the panel paginates
// rather than scrolls.
const ACCESS_SLIDERS = [
  { key: 'textScale', label: 'TEXT SIZE', min: 1, max: 1.35,
    fmt: v => Math.round(v * 100) + '%' },
  { key: 'bgDim', label: 'BACKGROUND DIMMING', min: 0, max: 0.5,
    fmt: v => v <= 0.01 ? 'OFF' : Math.round(v * 100) + '%' },
  { key: 'hcStrength', label: 'OUTLINE STRENGTH', min: 0.6, max: 1.8,
    fmt: v => Math.round(v * 100) + '%' },
];
const ACCESS_TOGGLES = [
  { key: 'cbSafe', label: 'COLORBLIND-SAFE COLORS' },
  { key: 'toggleCharge', label: 'TAP-TOGGLE CHARGE' },
  { key: 'easyCharge', label: 'EASIER CHARGE TIMING' },
  { key: 'visualCues', label: 'VISUAL SOUND CUES' },
];
// The old STARTERS literal lived here only because config parses before
// data.js. It is GONE: the setup grid derives at runtime from the active
// skin via skinStarters() (js/skin.js), which also owns the
// SETTINGS.starter validation — keys are engine-stable type keys.
let advOpen = false; // advanced settings panel
let settingsPage = 0; // 0 = game, 1 = touch controls, 2 = save, 3 = accessibility
function activeSliders() { return settingsPage === 1 ? TOUCH_SLIDERS : settingsPage === 3 ? ACCESS_SLIDERS : SLIDERS; }
function activeToggles() { return settingsPage === 1 ? TOUCH_TOGGLES : settingsPage === 3 ? ACCESS_TOGGLES : TOGGLES; }
// The menu has a featured title hub followed by a two-step setup wizard:
// all partners on one screen, then challenge + launch. Anything that returns
// to the menu resets to the featured title hub.
let menuPage = 'modes';
let setupStep = 'pilot'; // setup is a two-screen flow: all pilots → challenge
// AFT-023 FIRST-SESSION ONBOARDING: a brand-new player (no checkpoint, no
// codex progress) meets FOUR readable archetypes + FLY SOLO, with the full
// 18-vessel catalog one deliberate tap away ("BROWSE ALL"). Returning
// players land straight on the full grid they know.
let pilotBrowseAll = false;
const PILOT_ARCHETYPES = [
  { key: 'fire', tag: 'SIMPLE DAMAGE', recommended: true },
  { key: 'rock', tag: 'EXTRA HULL' },
  { key: 'fairy', tag: 'HEALS & LUCK' },
  { key: 'electric', tag: 'EXPERT TEMPO' },
];
function pilotFreshSession() {
  return !(typeof RUN_CKPT !== 'undefined' && RUN_CKPT)
    && (typeof DEX === 'undefined' || !DEX || DEX.size === 0);
}
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
// AFT-029 TITLE REBUILD (2026-11-13): the same three doors, rebuilt on the
// deep-stage UI kit. Portrait phones stack three full-width cards (diorama
// window left, copy right) between a logo lock-up and a utility row; wide
// screens put the wordmark + utilities on one header row and stand the
// cards in three columns. Every card is ONE panel; the card the player last
// chose carries the screen's single PRIMARY slab (CONTINUE takes that role
// when a checkpoint exists). `parts(i)` hands render the diorama window,
// copy column and play slab so nothing is re-derived in the draw code.
// Render and hit-testing share every rect here (skin pill included).
function menuLayout() {
  const hasCkpt = typeof RUN_CKPT !== 'undefined' && !!RUN_CKPT;
  const narrow = W < 720;
  const stacked = narrow && W < H;           // portrait phone: stacked rows
  const short = H < 600;
  const tight = stacked && H < 700;          // small portrait (320×568…)
  const touch = typeof IS_TOUCH !== 'undefined' && IS_TOUCH;
  const pad = stacked ? (W < 360 ? 12 : 16) : short ? 16 : Math.max(24, Math.min(40, W * 0.03));
  const gap = stacked ? (tight ? 10 : 12) : short ? 10 : 16;
  const tapH = 44;
  const top = (typeof SAFE_T !== 'undefined' ? SAFE_T : 0) + (stacked ? (tight ? 10 : 18) : short ? 6 : 16);
  const botInset = (typeof SAFE_B !== 'undefined' ? SAFE_B : 0) + (stacked ? (tight ? 10 : 14) : short ? 6 : 16);
  const hasSkin = typeof skinToggleAvailable === 'function' && skinToggleAvailable();
  const brand = (typeof SKIN !== 'undefined' && SKIN.brand) || GAME_TITLE;
  let titleSize, titleY, skin = null, headerY, headerH, dex, adv, zoneTop;
  const footerH = tapH;
  let footerY = H - botInset - footerH;
  if (stacked) {
    // logo lock-up: wordmark centred, the edition pill (skin toggle) under it
    titleSize = Math.min(tight ? 30 : 40, (W - pad * 2) / (brand.length * 0.86));
    titleY = top + titleSize * 0.55;
    headerY = top; headerH = titleSize * 1.1;
    let hb = titleY + titleSize * 0.55;
    if (hasSkin) {
      skin = { x: W / 2 - 92, y: hb + (tight ? 0 : 4), w: 184, h: touch ? tapH : 32 };
      hb = skin.y + skin.h;
    }
    zoneTop = hb + (tight ? 8 : 14);
    // phones keep the two utilities as one row at the bottom
    const uw = (W - pad * 2 - gap) / 2;
    dex = { x: pad, y: footerY, w: uw, h: footerH };
    adv = { x: pad + uw + gap, y: footerY, w: uw, h: footerH };
  } else {
    // one header row: wordmark (+ pill) left, the two utilities right
    headerY = top; headerH = tapH;
    titleSize = short ? Math.min(24, W / 22) : Math.min(36, W / 26);
    titleY = headerY + headerH / 2;
    const utilityW = short ? 128 : 140;
    dex = { x: W - pad - utilityW * 2 - gap * 0.75, y: headerY, w: utilityW, h: tapH };
    adv = { x: W - pad - utilityW, y: headerY, w: utilityW, h: tapH };
    if (hasSkin) {
      let bw = brand.length * titleSize * 0.82;
      if (typeof ctx !== 'undefined' && ctx && ctx.measureText) {
        const f0 = ctx.font; ctx.font = `900 ${titleSize}px Orbitron, sans-serif`;
        bw = ctx.measureText(brand).width; ctx.font = f0;
      }
      const sw = Math.max(120, Math.min(196, dex.x - (pad + bw + 18) - 12));
      skin = { x: pad + bw + 18, y: headerY + (headerH - (touch ? tapH : 32)) / 2, w: sw, h: touch ? tapH : 32 };
    }
    zoneTop = headerY + headerH + gap;
  }
  // the CONTINUE band: the screen's primary action whenever a checkpoint exists
  const resumeH = hasCkpt ? (tight || short ? tapH : 52) : 0;
  const resume = hasCkpt ? { x: pad, y: zoneTop, w: W - pad * 2, h: resumeH } : null;
  if (hasCkpt) zoneTop += resumeH + gap;
  // desktop keeps one calm journey line under the cards
  const progress = (!narrow && !short) ? { x: pad, y: footerY, w: Math.max(280, W - pad * 2), h: footerH } : null;
  const zoneBot = stacked || progress ? footerY - gap : H - botInset;
  const zone = { x: pad, y: zoneTop, w: W - pad * 2, h: Math.max(60, zoneBot - zoneTop) };
  const cardW = stacked ? zone.w : (zone.w - gap * 2) / 3;
  const cardH = stacked ? (zone.h - gap * 2) / 3 : zone.h;
  const card = i => stacked
    ? { x: zone.x, y: zone.y + i * (cardH + gap), w: cardW, h: cardH }
    : { x: zone.x + i * (cardW + gap), y: zone.y, w: cardW, h: cardH };
  const ins = stacked ? 6 : 8;
  const parts = i => {
    const c = card(i);
    let dio, text;
    if (stacked) {
      const dw = Math.min(c.w * 0.5, (c.h - ins * 2) * 1.2);
      dio = { x: c.x + ins, y: c.y + ins, w: dw, h: c.h - ins * 2 };
      text = { x: dio.x + dio.w + 14, y: c.y + 12, w: c.x + c.w - (dio.x + dio.w + 14) - 12, h: c.h - 24 };
    } else {
      // the copy needs ~170px; the diorama takes everything else (no dead band)
      const dh = Math.max(60, short ? (c.h - ins * 2) * 0.52 : Math.max((c.h - ins * 2) * 0.6, c.h - ins - 160));
      dio = { x: c.x + ins, y: c.y + ins, w: c.w - ins * 2, h: dh };
      text = { x: c.x + 16, y: dio.y + dio.h + 10, w: c.w - 32, h: c.y + c.h - (dio.y + dio.h + 10) - 12 };
    }
    const ph = Math.min(tight || short ? 34 : 40, Math.max(28, text.h * 0.32));
    const pw = stacked ? Math.min(text.w, 150) : Math.min(text.w, 220);
    const play = stacked ? { x: text.x, y: text.y + text.h - ph, w: pw, h: ph }
      : { x: c.x + c.w / 2 - pw / 2, y: text.y + text.h - ph, w: pw, h: ph };
    return { card: c, dio, text, play };
  };
  const selIdx = Math.max(0, MODES.findIndex(m => m.key === SETTINGS.mode));
  // the daily chip rides the Breaker card's diorama corner (it IS a Breaker
  // run); its rect is a full touch target, the pill draws inside it
  const bp = parts(Math.max(0, MODES.findIndex(m => m.key === 'classic')));
  const dailyH = touch ? tapH : 34;
  const dailyW = Math.min(bp.dio.w - 8, 156);
  const daily = { x: bp.dio.x + 4, y: bp.dio.y + 2, w: dailyW, h: Math.min(dailyH, bp.dio.h * 0.5) };
  return {
    s: Math.max(0.72, Math.min(1, H / 760)), short, narrow, stacked, tight,
    pad, gap, headerY, headerH, titleY, titleSize, brand,
    hero: zone, preview: zone, copy: zone, modeY: zone.y,
    card, parts,
    quick: card(selIdx),
    daily, skin, resume, progress, dex, adv,
  };
}
// PAGE 2 — a two-step setup wizard (vessel → challenge), rebuilt on the
// deep-stage UI kit (AFT-029, 2026-11-13). One frame for both steps:
//   · a header row — a 44px BACK, the mode name, and a two-segment step bar;
//   · a HERO surface (the chosen vessel, big) and a CHOICES column — stacked
//     on portrait phones (hero on top, choices anchored to the bottom so tall
//     phones hand their slack to the portrait), side by side on landscape
//     phones and desktop (hero left, choices right);
//   · ONE bottom bar: a quiet secondary (FLY SOLO / PRACTICE) beside the
//     screen's single PRIMARY slab (CONTINUE / LAUNCH).
// Every touch target is ≥44px tall. Render and hit-testing share these rects.
function setupLayout() {
  const short = H < 560;
  const narrow = W < 620;
  const compactPhone = narrow && H < 760;
  const twoCol = W > H * 1.15 && W >= 560;
  const tapH = 44;
  const s = Math.max(0.72, Math.min(1.1, H / 780, W / 720));
  const cx = W / 2;
  const gut = W < 360 ? 12 : 16;
  const gap = short ? 8 : 12;
  const safeT = typeof SAFE_T !== 'undefined' ? SAFE_T : 0;
  const safeB = typeof SAFE_B !== 'undefined' ? SAFE_B : 0;
  const contentW = Math.min(W - gut * 2, twoCol ? 1180 : 600);
  const x0 = cx - contentW / 2;
  // header: BACK + mode name on one row; the step bar under it (portrait) or
  // at the row's right end (two-column)
  const top = safeT + (short ? 6 : 12);
  const back = { x: Math.max(6, x0 - 6), y: top, w: narrow || short ? tapH : 112, h: tapH };
  const headY = back.y + back.h / 2;
  const headSize = short ? 15 : narrow ? 17 : 22;
  const subY = twoCol ? headY : back.y + back.h + (short ? 6 : 10);
  const step = twoCol
    ? { x: x0 + contentW - Math.min(300, contentW * 0.34), y: headY - 3, w: Math.min(300, contentW * 0.34), h: 6 }
    : { x: x0, y: subY, w: contentW, h: 5 };
  const sectionY = twoCol ? headY : subY + 18; // the step caption's baseline row
  const bodyTop = twoCol ? back.y + back.h + gap : sectionY + (short ? 12 : 16);
  const bottom = H - safeB - (short ? 8 : 16);
  const barH = short ? tapH : 52;
  const barY = bottom - barH;
  const heroW = twoCol ? Math.round(contentW * (short ? 0.4 : 0.42)) : contentW;
  const colX = twoCol ? x0 + heroW + gap * 1.5 : x0;
  const colW = twoCol ? contentW - heroW - gap * 1.5 : contentW;
  const bar = { x: colX, y: barY, w: colW, h: barH };
  const secW = Math.round(Math.min(colW * 0.38, 200));
  const barSec = { x: bar.x, y: bar.y, w: secW, h: bar.h };
  const barPri = { x: bar.x + secW + gap, y: bar.y, w: bar.w - secW - gap, h: bar.h };
  const colTop = bodyTop, colBot = barY - gap;     // the choices column's room
  const base = { s, short, narrow, compactPhone, twoCol, headY, headSize, subY, sectionY, contentW, back, stepBar: step, gap, bar };

  if (setupStep === 'pilot') {
    // AFT-023: the guided FIRST-SESSION view — four archetype cards in a 2×2
    // grid plus a BROWSE ALL door, sharing the hero/none/next chrome.
    // Render and hit-testing both key off L.simple, same-geometry rule.
    if (!pilotBrowseAll && pilotFreshSession()) {
      let browse, archH, archTop, hero;
      const archW = (colW - gap) / 2;
      if (twoCol) {
        const room = colBot - colTop;
        archH = Math.max(48, Math.min(short ? 120 : 210, (room - tapH - gap * 2) / 2));
        const blockH = 2 * archH + gap + gap + tapH;
        archTop = colTop + Math.max(0, (room - blockH) * 0.4);
        browse = { x: colX, y: archTop + 2 * archH + gap * 2, w: colW, h: tapH };
        hero = { x: x0, y: bodyTop, w: heroW, h: bottom - bodyTop };
      } else {
        browse = { x: colX, y: colBot - tapH, w: colW, h: tapH };
        const room = browse.y - gap - colTop;
        const heroMin = short ? 84 : 150;
        archH = Math.max(52, Math.min(short ? 64 : 108, (room - heroMin - gap * 2) / 2));
        archTop = browse.y - gap - (2 * archH + gap);
        hero = { x: x0, y: bodyTop, w: contentW, h: archTop - gap - bodyTop };
      }
      return {
        ...base, step: 'pilot', simple: true,
        hero, info: hero,
        arch: i => ({ x: colX + (i % 2) * (archW + gap), y: archTop + Math.floor(i / 2) * (archH + gap), w: archW, h: archH }),
        browse,
        none: barSec,
        next: barPri,
      };
    }
    // THE FULL CATALOG: three labelled shelves of six identity tiles. The
    // shelves take what they need (tiles capped at a readable size) and the
    // HERO absorbs everything else — a tall phone grows the portrait, never
    // a dead band.
    const tg = short ? 5 : narrow ? 6 : 8;
    const labelH = short ? 13 : 18;
    const vg = short ? 4 : 8;
    const tileW0 = (colW - tg * 5) / 6;
    let tileH, hero, shelfTop;
    if (twoCol) {
      const room = colBot - colTop;
      tileH = Math.max(40, Math.min(tileW0 * 1.3, (room - 3 * labelH - 2 * vg) / 3, 132));
      const shelvesH = 3 * (labelH + tileH) + 2 * vg;
      shelfTop = colTop + Math.max(0, (room - shelvesH) * 0.4);
      hero = { x: x0, y: bodyTop, w: heroW, h: bottom - bodyTop };
    } else {
      const room = colBot - colTop;
      const heroMin = short ? 70 : 140;
      tileH = Math.max(40, Math.min(tileW0 * 1.3, 96, (room - heroMin - gap - 3 * labelH - 2 * vg) / 3));
      const shelvesH = 3 * (labelH + tileH) + 2 * vg;
      shelfTop = colBot - shelvesH;
      hero = { x: x0, y: bodyTop, w: contentW, h: shelfTop - gap - bodyTop };
    }
    const tileW = Math.min(tileW0, tileH * 1.1);
    const rowW = tileW * 6 + tg * 5;
    const rx = colX + (colW - rowW) / 2;
    return {
      ...base, step: 'pilot', hero, rowW, labelH, tileW, tileH,
      shelf: g => ({ x: rx, y: shelfTop + g * (labelH + tileH + vg), w: rowW, h: labelH }),
      starter: i => {
        const g = Math.floor(i / 6), col = i % 6;
        return { x: rx + col * (tileW + tg), y: shelfTop + g * (labelH + tileH + vg) + labelH, w: tileW, h: tileH };
      },
      none: barSec,
      info: hero, // API alias: the hero IS the info surface now
      next: barPri,
    };
  }

  // ---- step 2: CHALLENGE ----
  // a skin with affinities (AETHERFALL) adds the oath row: the two
  // ceremonial LIGHT/DARK cards plus the quiet UNSWORN third card (AFT-023)
  const hasAff = typeof SKIN !== 'undefined' && !!SKIN.affinities;
  const nP = Object.keys(PRESETS).length;
  const cols = twoCol && colW >= 620 ? 4 : 2, rows = Math.ceil(nP / cols);
  const chipW = (colW - gap * (cols - 1)) / cols;
  const labelH = short ? 16 : 22;
  let summary, affY, affH, chipH, chipY;
  if (twoCol) {
    summary = { x: x0, y: bodyTop, w: heroW, h: bottom - bodyTop };
    const room = colBot - colTop;
    affH = hasAff ? (short ? 50 : 76) : 0;
    const affBlock = hasAff ? affH + gap : 0;
    chipH = Math.max(tapH, Math.min(short ? 84 : 120, (room - affBlock - labelH - gap * (rows - 1)) / rows));
    const blockH = affBlock + labelH + rows * chipH + gap * (rows - 1);
    affY = colTop + Math.max(0, (room - blockH) * 0.4);
    chipY = affY + affBlock + labelH;
  } else {
    chipH = Math.max(tapH, Math.min(short ? 54 : 92, (colBot - colTop) * 0.15));
    chipY = colBot - (rows * chipH + gap * (rows - 1));
    affH = hasAff ? (short ? 50 : Math.max(58, Math.min(92, (colBot - colTop) * 0.14))) : 0;
    affY = chipY - labelH - gap - affH;
    const sTop = bodyTop, sBot = (hasAff ? affY : chipY - labelH) - gap;
    summary = { x: x0, y: sTop, w: contentW, h: Math.max(60, sBot - sTop) };
  }
  const editW = narrow ? 104 : 132;
  const showcase = summary.h >= 130;
  // the same vertical/side rule drawVesselHero uses — CHANGE sits centred
  // under a vertical recap, bottom-right on a wide one, right-centre on a slim one
  const vertical = summary.h >= summary.w * 0.9 && summary.h >= 240;
  const editPilot = vertical
    ? { x: summary.x + summary.w / 2 - editW / 2, y: summary.y + summary.h - tapH - 12, w: editW, h: tapH }
    : showcase
      ? { x: summary.x + summary.w - editW - 12, y: summary.y + summary.h - tapH - 12, w: editW, h: tapH }
      : { x: summary.x + summary.w - editW - 10, y: summary.y + summary.h / 2 - tapH / 2, w: editW, h: tapH };
  const noneW = hasAff ? Math.round(Math.max(64, Math.min(120, colW * 0.22))) : 0;
  const oathW = (colW - noneW - gap * 2) / 2;
  return {
    ...base, step: 'difficulty',
    summary, editPilot, showcase, vertical,
    affinity: hasAff ? i => ({ x: colX + i * (oathW + gap), y: affY, w: oathW, h: affH }) : null,
    affNone: hasAff ? { x: colX + 2 * (oathW + gap), y: affY, w: noneW, h: affH } : null,
    chipsLabelY: chipY - labelH / 2 - 2,
    chipsLabelX: colX,
    chip: i => { const c = i % cols, r = Math.floor(i / cols);
      return { x: colX + c * (chipW + gap), y: chipY + r * (chipH + gap), w: chipW, h: chipH }; },
    start: barPri,
    trial: barSec,
  };
}
// advanced settings overlay (sliders + accessibility toggles)
function advLayout() {
  const sliders = activeSliders(), toggles = activeToggles();
  const pw = Math.min(440, W * 0.92);
  // AFT-023: compact engages whenever the FULL-SIZE panel would overflow the
  // viewport, not only under a fixed height — a 320×568 portrait phone sat
  // exactly in the gap (full panel 576px deep on a 568px screen, found by
  // adding 320×568 to the viewport-fit sweep)
  const fullPh = 132 + sliders.length * 52 + toggles.length * 40 + 36;
  const compact = H < 560 || fullPh > H - 16;
  // AFT-018 added a fifth toggle row (EFFECTS QUALITY) — compact metrics
  // tightened so the panel still fits a 375-tall landscape phone (the
  // viewport-fit suite test guards this exact geometry).
  const rowH = compact ? 32 : 52, togH = compact ? 22 : 40;
  // Leave a real text row between the tabs and the first slider. Previously
  // POWER-UP DROPS visibly collided with the active tab on phone viewports.
  const top = compact ? 106 : 132, bottom = compact ? 8 : 36;
  const ph = top + sliders.length * rowH + toggles.length * togH + bottom;
  const px = W / 2 - pw / 2, py = Math.max(compact ? 8 : 20, H / 2 - ph / 2);
  return {
    px, py, pw, ph, compact, sliders, toggles,
    tab: i => ({ x: px + 24 + i * (pw - 48) / 4, y: py + (compact ? 48 : 58), w: (pw - 48) / 4 - 6, h: compact ? 30 : 36 }),
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
  // AFT-001 follow-up (2026-07-23, user report): the panel overflowed short
  // landscape phones once rounds+phases expanded — the fully-open picker
  // must always fit the viewport (see the AFT-029 notes below for how).
  const short = H < 560;
  // picking a LEGENDARY stage reveals a round row; Kanto junkie adds the
  // secret fourth tile. Picking a boss round reveals the PHASE row.
  const rounds = trialSel.stage === 2;
  const secretRound = rounds && trialSel.region === 0 && SETTINGS.mode === 'junkie';
  // AFT-020: formats own their beat shapes — a relay's coda is a reward
  // event with no phases, and a RAID is one continuous encounter (no round
  // jumps at all), so those rows adapt per format
  const fmtT = ((typeof finaleProfile === 'function' && finaleProfile(trialSel.region)) || {}).format || 'ladder';
  const roundCount = fmtT === 'raid' ? 1 : secretRound ? 4 : 3;
  const phases = rounds && trialSel.round >= 1 && fmtT !== 'raid'
    && !((fmtT === 'relay' || fmtT === 'siege') && trialSel.round >= 2); // reward codas have no phases
  const phaseCount = trialSel.round >= 2 ? 3 : 2;
  // AFT-029 kit pass: every chip is a ≥44px tap target at its natural size,
  // the picker sits in ONE safe-area-aware column on portrait phones and in
  // TWO columns (realm grid | stage → round → phase) on landscape/desktop,
  // with the action row (BOSS RUSH | START) spanning the foot. Section
  // labels drop first, then — only if a viewport is truly too short — the
  // chip heights squeeze by one factor. Label/squeeze decisions are taken
  // against the BUSIEST state so nothing pops while the player taps around.
  const roundRows = roundCount === 1 ? 1 : 2; // FULL on its own row, chapters in pairs
  const gut = W < 360 ? 10 : 16;
  const availW = W - SAFE_L - SAFE_R - gut * 2;
  const availH = H - SAFE_T - SAFE_B - (short ? 16 : gut * 2);
  const wide = W >= 600 && W > H * 1.2;
  const pad = W < 360 ? 12 : wide ? 20 : 16, gap = 8, sec = 12;
  const headH = H < 420 ? 52 : 70;
  const btnH = H < 520 ? 44 : 48;
  const lblH = 18;
  const nat = { region: 52, stage: 46, round: 44, phase: 44 };
  // column needs (busiest = legendary stage, two round rows, phase row)
  const rightNeed = (lbl, k, busy) => (lbl ? lblH : 0) + nat.stage * k
    + ((busy || rounds) ? sec + (lbl ? lblH : 0) + (busy ? 2 : roundRows) * (nat.round * k) + gap : 0)
    + ((busy || phases) ? sec + (lbl ? lblH : 0) + nat.phase * k : 0);
  const gridNeed = (lbl, k) => (lbl ? lblH : 0) + 3 * nat.region * k + 2 * gap;
  const bodyNeed = (lbl, k, busy) => wide
    ? Math.max(gridNeed(lbl, k), rightNeed(lbl, k, busy))
    : gridNeed(lbl, k) + sec + rightNeed(lbl, k, busy);
  const total = (lbl, k, busy) => headH + bodyNeed(lbl, k, busy) + sec + 4 + btnH + pad;
  const labels = total(true, 1, true) <= availH;
  let k = 1; // only chip heights scale — step down until the busiest state fits
  if (!labels) while (k > 0.6 && total(false, k, true) > availH) k -= 0.02;
  const rH = Math.round(nat.region * k), sH = Math.round(nat.stage * k);
  const rdH = Math.round(nat.round * k), pH = Math.round(nat.phase * k);
  const pw = Math.round(Math.min(wide ? 860 : 480, availW));
  // wide: the panel holds its busiest height (stable while rows appear);
  // portrait: it hugs the live content so START sits right under the rows
  const ph = Math.round(Math.min(availH, total(labels, k, wide)));
  const px = Math.round(SAFE_L + (W - SAFE_L - SAFE_R - pw) / 2);
  const py = Math.round(SAFE_T + Math.max(short ? 8 : gut, (H - SAFE_T - SAFE_B - ph) / 2));
  const innerX = px + pad, innerW = pw - pad * 2, bodyY = py + headH;
  const colGap = 18;
  const leftW = wide ? Math.round((innerW - colGap) * 0.5) : innerW;
  const rightX = wide ? innerX + leftW + colGap : innerX, rightW = wide ? innerW - leftW - colGap : innerW;
  const lb = labels ? lblH : 0;
  // left/top: the realm grid
  const gridY = bodyY + lb;
  const gridH = wide ? Math.max(3 * rH + 2 * gap, rightNeed(labels, k, true) - lb) : 3 * rH + 2 * gap;
  const cellH = wide ? Math.min(Math.round(nat.region * 1.3), (gridH - 2 * gap) / 3) : rH;
  const cellW = (leftW - 2 * gap) / 3;
  // right/below: stage → rounds → phases, top-down
  let y = wide ? bodyY : gridY + 3 * rH + 2 * gap + sec;
  const lblStage = { x: rightX, y, w: rightW, h: lb }; y += lb;
  const stageY = y; y += sH;
  let lblRound = null, roundY = 0, lblPhase = null, phaseY = 0;
  if (rounds) { y += sec; lblRound = { x: rightX, y, w: rightW, h: lb }; y += lb; roundY = y; y += roundRows * rdH + (roundRows - 1) * gap; }
  if (phases) { y += sec; lblPhase = { x: rightX, y, w: rightW, h: lb }; y += lb; phaseY = y; y += pH; }
  const btnY = py + ph - pad - btnH;
  const stW = (rightW - 2 * gap) / 3;
  const halfW = (rightW - gap) / 2;
  const phaseW = (rightW - gap * (phaseCount - 1)) / phaseCount;
  const actW = wide ? null : (innerW - gap) / 2;
  const closeS = IS_TOUCH ? 44 : 36;
  return {
    px, py, pw, ph, rounds, secretRound, roundCount, phases, phaseCount, wide, labels,
    head: { x: px, y: py, w: pw, h: headH },
    lblRegion: labels ? { x: innerX, y: bodyY, w: leftW, h: lb } : null,
    lblStage: labels ? lblStage : null, lblRound: labels ? lblRound : null, lblPhase: labels ? lblPhase : null,
    region: i => ({ x: innerX + (i % 3) * (cellW + gap), y: gridY + Math.floor(i / 3) * (cellH + gap), w: cellW, h: cellH }),
    stage: i => ({ x: rightX + i * (stW + gap), y: stageY, w: stW, h: sH }),
    round: i => roundCount === 1 ? { x: rightX, y: roundY, w: rightW, h: rdH }
      : secretRound
        ? { x: rightX + (i % 2) * (halfW + gap), y: roundY + Math.floor(i / 2) * (rdH + gap), w: halfW, h: rdH }
        : i === 0 ? { x: rightX, y: roundY, w: rightW, h: rdH }
          : { x: rightX + (i - 1) * (halfW + gap), y: roundY + rdH + gap, w: halfW, h: rdH },
    phase: i => ({ x: rightX + i * (phaseW + gap), y: phaseY, w: phaseW, h: pH }),
    // the foot: the quiet BOSS RUSH launcher beside the ONE primary (right)
    rush: wide ? { x: innerX, y: btnY, w: leftW, h: btnH } : { x: innerX, y: btnY, w: actW, h: btnH },
    start: wide ? { x: rightX, y: btnY, w: rightW, h: btnH } : { x: innerX + actW + gap, y: btnY, w: actW, h: btnH },
    close: { x: px + pw - closeS - (IS_TOUCH ? 6 : 10), y: py + (IS_TOUCH ? 6 : 10), w: closeS, h: closeS },
  };
}
function presetGeom(i) { return setupLayout().chip(i); }
function sliderGeom(i) { return advLayout().slider(i); }
function startBtnGeom() { return setupLayout().start; }
function dexBtnGeom() { return menuLayout().dex; }
// ── AFT-029 BETWEEN-COMBAT PANELS: the shared sheet frame ───────────────────
// Every between-combat surface (results, draft, Forge, pause, game over,
// BOSS RUSH) lays out inside ONE content column: safe-area aware, a 16px
// gutter (12 on the narrowest phones), a max width per surface. The bottom
// edge is where the single PRIMARY action anchors, above SAFE_B.
function sheetFrame(maxW = 560) {
  const gut = W < 360 ? 12 : 16, short = H < 520;
  const w = Math.max(200, Math.min(maxW, W - SAFE_L - SAFE_R - gut * 2));
  const x = SAFE_L + (W - SAFE_L - SAFE_R - w) / 2;
  const top = SAFE_T + (short ? 10 : gut), bottom = H - SAFE_B - (short ? 10 : gut);
  return { x, w, top, bottom, cx: x + w / 2, gut, short, narrow: W < 560,
    wide: W >= 600 && W > H * 1.25 };
}
// The primary slab's height: ≥44 on touch everywhere, roomier on tall phones.
function sheetBtnH() { return H < 520 ? 44 : IS_TOUCH ? 52 : 48; }
// A vertical stack layouter: blocks {k, h, gap, opt} are placed top-down in
// [top, bottom]. Optional blocks drop (highest `opt` first) until it fits,
// then gaps tighten; spare room widens the gaps a little and the rest sits
// `bias` of the way down (0 = top-weighted, 0.5 = centred). Returns k→rect.
function stackBlocks(blocks, top, bottom, x, w, bias = 0.3) {
  let list = blocks.filter(b => b && b.h > 0);
  const need = l => l.reduce((s, b, i) => s + b.h + (i ? b.gap || 0 : 0), 0);
  while (need(list) > bottom - top) {
    const opt = list.filter(b => b.opt).sort((a, b) => b.opt - a.opt)[0];
    if (!opt) break;
    list = list.filter(b => b !== opt);
  }
  let total = need(list), avail = bottom - top;
  let gapK = 1;
  if (total > avail) {
    const gaps = list.reduce((s, b, i) => s + (i ? b.gap || 0 : 0), 0);
    gapK = gaps > 0 ? Math.max(0.3, 1 - (total - avail) / gaps) : 1;
  }
  let extraGap = 0;
  if (total < avail && list.length > 1) extraGap = Math.min(16, (avail - total) / (list.length - 1) * 0.5);
  total = list.reduce((s, b, i) => s + b.h + (i ? (b.gap || 0) * gapK + extraGap : 0), 0);
  let y = top + Math.max(0, (avail - total) * bias);
  const out = {};
  list.forEach((b, i) => {
    if (i) y += (b.gap || 0) * gapK + extraGap;
    out[b.k] = { x, y, w, h: b.h };
    y += b.h;
  });
  return out;
}
// ── STAGE RESULTS layout (AFT-029): headline · 3 stat tiles · combat ledger
// · encounter/finale rows · mastery list · NEXT · the CONTINUE slab. One
// column on phones; two (summary | mastery) on landscape and desktop. The
// whole screen advances on one tap (advanceResults) — the slab is the
// affordance, so nothing here gates input; the rects exist for render and
// for the viewport sweep.
function resultsLayout() {
  const R = G.results || {};
  const F = sheetFrame(resultsSheetW());
  const short = F.short, wide = F.wide;
  // desktop: one composed block, centred — never content pinned to the
  // top edge with the action stranded at the bottom of a tall window
  if (wide && F.bottom - F.top > 560) {
    const mid = (F.top + F.bottom) / 2;
    F.top = mid - 280; F.bottom = mid + 280;
  }
  const bh = sheetBtnH();
  const colGap = 24;
  const colW = wide ? (F.w - colGap) / 2 : F.w;
  const lx = F.x, rx = wide ? F.x + colW + colGap : F.x;
  const btn = { x: rx, y: F.bottom - bh, w: colW, h: bh };
  const bodyFam = "Verdana, 'Segoe UI', system-ui, sans-serif";
  const lines = (txt, o) => (typeof wrapLinesNeeded === 'function' && txt) ? wrapLinesNeeded(txt, o) : 1;
  const subTxt = resultsSubline(R);
  const subN = lines(subTxt, { size: 12, min: 10, weight: 700, maxW: colW - 8, maxLines: 2 });
  const rowW = colW;
  const descN = (R.objectives || []).map(o => lines(o.desc, { size: 10.5, min: 10, weight: 600, family: bodyFam, maxW: rowW - 54, maxLines: 2 }));
  const outcomes = R.outcomes && (R.outcomes.dispersed || R.outcomes.rescued || R.outcomes.neutralized);
  const finN = R.finaleMastery ? lines(resultsFinaleCopy(R).line, { size: 10.5, min: 10, weight: 600, family: bodyFam, maxW: rowW - 30, maxLines: 2 }) : 0;
  const finV = !!(R.finaleCounters && Object.values(R.finaleCounters).some(v => v > 0)); // the verbs line
  const nextN = R.nextName ? lines('NEXT  ' + R.nextName, { size: 13, min: 10, weight: 800, maxW: rowW - 32, maxLines: 2 }) : 0;
  // two metric sets: the roomy one, and a COMPACT one used only when a
  // maximal payload (objective + finale + three two-line medals) would not
  // fit a small phone. Past that, optional rows drop in `opt` order (flavor
  // → note → eyebrow → outcomes → ledger); must-read rows never drop.
  const build = c => ({
    A: [ // the summary column
      { k: 'eyebrow', h: 22, opt: short || c ? 7 : 0 },
      { k: 'hero', h: c ? 34 : short ? 36 : Math.round(Math.min(40, W / 10)) + 8, gap: 4 },
      { k: 'sub', h: 15 * subN, gap: 2 },
      { k: 'tiles', h: c ? 50 : short ? 54 : 74, gap: c || short ? 8 : 14 },
      { k: 'ledger', h: c || short ? 32 : 40, gap: 8, opt: c ? 5 : 0 },
      outcomes ? { k: 'outcomes', h: 20, gap: 6, opt: c ? 6 : 0 } : null,
    ],
    B: [ // the mastery column (continues the summary on phones)
      R.objective ? { k: 'objective', h: c || short ? 34 : 40, gap: c ? 8 : 10 } : null,
      R.finaleMastery ? { k: 'finale', h: (c ? 34 : 40) + finN * 13 + (finV ? 14 : 0), gap: 8 } : null,
      (R.objectives || []).length ? { k: 'mlabel', h: 16, gap: c || short ? 8 : 14 } : null,
      ...descN.map((n, i) => ({ k: 'obj' + i, h: (c ? 26 : short ? 30 : 36) + n * 13, gap: c ? 4 : 6 })),
      !R.medalsSaved ? { k: 'note', h: 14, gap: 6, opt: 8 } : null,
    ],
    tail: [
      R.nextName ? { k: 'next', h: 26 + nextN * 14, gap: c ? 8 : 12 } : null,
      R.flavor ? { k: 'flavor', h: 34, gap: 10, opt: 9 } : null,
    ],
  });
  const minNeed = list => list.filter(b => b && !b.opt).reduce((s, b, i) => s + b.h + (i ? (b.gap || 0) * 0.3 : 0), 0);
  let S = build(false), compact = false;
  const fits = s => wide
    ? Math.max(minNeed([...s.A, ...s.tail]), minNeed(s.B)) <= btn.y - 12 - F.top
    : minNeed([...s.A, ...s.B, ...s.tail]) <= btn.y - 12 - F.top;
  if (!fits(S)) { S = build(true); compact = true; }
  const { A, B, tail } = S;
  let rects;
  if (wide) {
    const left = stackBlocks([...A, ...tail], F.top, F.bottom, lx, colW, 0.5);
    // the mastery column starts level with the stat tiles when it fits there
    const needB = B.filter(Boolean).reduce((s, b, i) => s + b.h + (i ? b.gap || 0 : 0), 0);
    const rTop = left.tiles && left.tiles.y + needB <= btn.y - 12 ? left.tiles.y : F.top;
    const right = stackBlocks(B, rTop, btn.y - 12, rx, colW, rTop === F.top ? 0.5 : 0);
    rects = { ...left, ...right };
  } else rects = stackBlocks([...A, ...B, ...tail], F.top, btn.y - 12, F.x, F.w, 0.3);
  return { F, wide, short, compact, btn, colW, rects, objN: descN.length };
}
function resultsSheetW() { return W >= 600 && W > H * 1.25 ? 1000 : 520; }
// the results copy both the layout (line counts) and render read
function resultsSubline(R) { return (R.stageTitle ? R.stageTitle + '  ·  ' : '') + (R.region || ''); }
// AFT-020: a finale clear names the MASTERY the encounter taught — countered
// (the signature answered) or mastered (every major beat)
function resultsFinaleCopy(R) {
  const m = R.finaleMastery;
  return m === 'mastered' ? { verdict: '★ MASTERED', color: '#ffd54f', line: 'EVERY MAJOR BEAT ANSWERED — YOUR REROLL WILL PIN ITS BEST OFFER' }
    : m === 'countered' ? { verdict: 'COUNTERED', color: '#80d8ff', line: 'SIGNATURE COUNTERED — A FIFTH OFFER AWAITS IN THE DRAFT' }
      : { verdict: 'CLEARED', color: '#9fb2cc', line: 'COUNTER THE SIGNATURE NEXT TIME FOR A WIDER DRAFT' };
}
// Pause help lines: the input → action rows the pause card lists. CLASSIC
// is ball-only — no gun exists, so its help never mentions one.
function pauseHelpLines() {
  return G.mode === 'classic'
    ? (IS_TOUCH
      ? ['DRAG — MOVE PADDLE', 'TAP THE PLAYFIELD — LAUNCH THE BALL', 'MEGA BUTTON — BALL OVERDRIVE WHEN THE RING IS FULL', 'THE BALL — YOUR ONLY WEAPON, KEEP IT ALIVE']
      : ['MOUSE — MOVE PADDLE', 'CLICK / SPACE — LAUNCH THE BALL', 'E — MEGA BALL OVERDRIVE WHEN METER IS FULL', 'M — MUSIC ON / OFF', 'P / ESC — PAUSE', 'Q — QUIT TO MENU'])
    : (IS_TOUCH
      ? ['DRAG ANYWHERE — MOVE', SETTINGS.autoFire ? 'AUTO-FIRE — ON' : 'TAP FIRE — SHOOT', 'HOLD FIRE — CHARGE A BIG SHOT', 'MEGA BUTTON — EVOLVE WHEN THE RING IS FULL']
      : ['MOUSE — MOVE', 'CLICK / SPACE — FIRE', 'RIGHT-CLICK / SHIFT — CHARGE A BIG SHOT', 'E — MEGA EVOLVE WHEN METER IS FULL', 'M — MUSIC ON / OFF', 'P / ESC — PAUSE', 'Q — QUIT TO MENU']);
}
// PAUSE (AFT-029): ONE centred sheet — header, the controls card, the MUSIC
// row, SETTINGS | QUIT, the primary RESUME slab, and the quiet cheat chip.
// Short landscape splits header+help | actions into two columns. A tap
// anywhere outside a control still resumes (input.js), so RESUME is the
// affordance, not a gate. SETTINGS stays available mid-run so touch players
// can fix follow speed / button placement without abandoning their journey.
function pauseActionLayout() {
  const F = sheetFrame(pauseSheetW());
  const short = F.short, wide = W > H * 1.3 && H < 560;
  const bh = IS_TOUCH ? (short ? 44 : 48) : 44, gap = short ? 8 : 10, pad = 16;
  const cheatH = IS_TOUCH ? 44 : 32;
  const nL = pauseHelpLines().length, lineH = short ? 22 : 30;
  const headH = short ? 40 : 58;
  const actH = bh * 3 + cheatH + gap * 3;
  const pw = F.w, px = F.x;
  if (wide) {
    const colW = (pw - pad * 3) / 2;
    const helpH = nL * lineH + 14;
    const ph = Math.min(F.bottom - F.top, pad * 2 + Math.max(headH + gap + helpH, actH));
    const py = F.top + Math.max(0, (F.bottom - F.top - ph) / 2);
    const ax = px + pad * 2 + colW, ay = py + pad + Math.max(0, (ph - pad * 2 - actH) / 2);
    const half = (colW - gap) / 2;
    return {
      wide, panel: { x: px, y: py, w: pw, h: ph },
      head: { x: px + pad, y: py + pad, w: colW, h: headH },
      help: { x: px + pad, y: py + pad + headH + gap, w: colW, h: Math.min(helpH, ph - pad * 2 - headH - gap) },
      music: { x: ax, y: ay, w: colW, h: bh },
      settings: { x: ax, y: ay + bh + gap, w: half, h: bh },
      quit: { x: ax + half + gap, y: ay + bh + gap, w: half, h: bh },
      resume: { x: ax, y: ay + (bh + gap) * 2, w: colW, h: bh },
      cheat: { x: ax + colW / 2 - 90, y: ay + (bh + gap) * 3, w: 180, h: cheatH },
    };
  }
  const iw = pw - pad * 2;
  let helpH = nL * lineH + 14;
  let ph = pad * 2 + headH + gap + helpH + gap + actH;
  if (ph > F.bottom - F.top) { helpH = 0; ph = pad * 2 + headH + gap + actH; }
  const py = F.top + Math.max(0, (F.bottom - F.top - ph) / 2);
  let y = py + pad + headH + gap;
  const help = helpH ? { x: px + pad, y, w: iw, h: helpH } : null;
  if (helpH) y += helpH + gap;
  const half = (iw - gap) / 2;
  return {
    wide, panel: { x: px, y: py, w: pw, h: ph },
    head: { x: px + pad, y: py + pad, w: iw, h: headH }, help,
    music: { x: px + pad, y, w: iw, h: bh },
    settings: { x: px + pad, y: y + bh + gap, w: half, h: bh },
    quit: { x: px + pad + half + gap, y: y + bh + gap, w: half, h: bh },
    resume: { x: px + pad, y: y + (bh + gap) * 2, w: iw, h: bh },
    cheat: { x: px + pw / 2 - 90, y: y + (bh + gap) * 3, w: 180, h: cheatH },
  };
}
function pauseSheetW() { return W > H * 1.3 && H < 560 ? 720 : 440; }
function pauseSettingsGeom() { return pauseActionLayout().settings; }
function pauseQuitGeom() { return pauseActionLayout().quit; }
// AFT-021 P2: the live SOUND circle moved off the combat screen — this is
// its pause-screen home (one tap to mute, same as before, minus the overlap)
function pauseMusicGeom() { return pauseActionLayout().music; }
// GAME OVER (AFT-029): one sheet — header + score, the cause card, stat
// tiles, then the action stack: three secondaries above ONE primary slab.
// The primary is CONTINUE when a journey checkpoint exists (progress is
// never lost), RETRY otherwise. button(i) keeps its index → action meaning
// (0 retry · 1 continue/new run · 2 trial · 3 title) so input never moves.
function gameOverLayout() {
  const F = sheetFrame(W >= 600 && W > H * 1.25 ? 860 : 560);
  const narrow = W < 620, wide = F.wide && H < 620 || (W >= 900 && W > H * 1.25);
  const pw = F.w, px = F.x;
  const ph = Math.min(F.bottom - F.top, wide ? 470 : 680);
  const py = F.top + Math.max(0, (F.bottom - F.top - ph) / 2);
  const pad = 16, gap = 10, bh = sheetBtnH();
  const pi = (RUN_CKPT && !G.daily && !G.trial) ? 1 : 0;
  const order = [0, 1, 2, 3].filter(i => i !== pi);
  const iw = pw - pad * 2;
  let rects = {};
  let actionsTop;
  if (wide) { // one row: three secondaries + the wider primary at the right
    const unit = (iw - gap * 3) / 4.6;
    const y = py + ph - pad - bh;
    order.forEach((i, k) => { rects[i] = { x: px + pad + k * (unit + gap), y, w: unit, h: bh }; });
    rects[pi] = { x: px + pad + 3 * (unit + gap), y, w: unit * 1.6, h: bh };
    actionsTop = y;
  } else {
    const yP = py + ph - pad - bh, yS = yP - gap - bh;
    const sw = (iw - gap * 2) / 3;
    rects[pi] = { x: px + pad, y: yP, w: iw, h: bh };
    order.forEach((i, k) => { rects[i] = { x: px + pad + k * (sw + gap), y: yS, w: sw, h: bh }; });
    actionsTop = yS;
  }
  const share = { x: px + pad, y: actionsTop - gap - 44, w: iw, h: 44 };
  return {
    px, py, pw, ph, narrow, wide, pad, primary: pi,
    button: i => rects[i],
    share,
    body: { x: px + pad, y: py + pad, w: iw, h: (G.daily ? share.y - gap : actionsTop - gap) - (py + pad) },
  };
}
// BOSS RUSH summary: the game-over sheet's frame with two actions on one
// row — ⌂ TITLE (secondary) and the primary RETRY slab; the nine splits
// live in the body above them
function rushSummaryLayout() {
  const L = gameOverLayout();
  const gap = 10, bh = sheetBtnH(), iw = L.pw - L.pad * 2;
  const by = L.py + L.ph - L.pad - bh;
  const tw = Math.min(150, iw * 0.34);
  return { ...L, retry: { x: L.px + L.pad + tw + gap, y: by, w: iw - tw - gap, h: bh },
    title: { x: L.px + L.pad, y: by, w: tw, h: bh },
    body: { x: L.px + L.pad, y: L.py + L.pad, w: iw, h: by - gap - (L.py + L.pad) } };
}
// ---- CHEAT CODES: a small ornate chip on the PAUSE screen (visible when
// you go looking, never on screen during play — no temptation mid-run).
// AFT-029: it rides the pause sheet's layout, under the RESUME slab.
let cheatOpen = false;
function cheatBtnGeom() { return pauseActionLayout().cheat; }
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
