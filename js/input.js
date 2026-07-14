'use strict';
// ============================================================
//  INPUT
// ============================================================
let mouseX = window.innerWidth / 2, lastMouseY = window.innerHeight / 2;
let paddleTouchId = null;

// on-screen buttons for touch play: drag anywhere moves the paddle,
// FIRE shoots, MEGA unleashes, plus pause & sound in the top corner
function touchButtons() {
  // keep the thumb pads well clear of the very bottom edge — mobile browsers
  // park a toolbar / home indicator there and were clipping the FIRE ring off
  // the bottom of the screen. Anchor the pads a comfortable margin above FLOOR.
  const base = FLOOR() - 34;
  const b = {
    mega:  { x: W - 138, y: base - 40, r: 30 }, // beside FIRE — paddle rides above both
    pause: { x: W - 28, y: 84, r: 20 },
    sound: { x: W - 72, y: 82, r: 18 },
  };
  // FIRE only when the blaster is armed — CLASSIC has none until you earn it,
  // and the ball is launched by tapping the playfield, not this pad.
  if (blasterArmed()) b.fire = { x: W - 58, y: base - 42, r: 42 };
  // shooter modes: a CHARGE pad in the far bottom-left, for the other thumb
  if (G.mode !== 'classic') b.charge = { x: 58, y: base - 42, r: 40 };
  return b;
}
function inCircle(x, y, b, slop = 8) { return Math.hypot(x - b.x, y - b.y) < b.r + slop; }

window.addEventListener('mousemove', e => {
  mouseX = e.clientX; lastMouseY = e.clientY;
  if (dragSlider >= 0) setSliderFromX(dragSlider, e.clientX);
});
window.addEventListener('mouseup', () => { if (dragSlider >= 0) { dragSlider = -1; saveSettings(); } });
// mobile browsers replay taps as synthetic mouse events ~300ms later — that
// ghost click was instantly UN-pausing right after the pause button paused.
// Any recent touch mutes the mouse path entirely.
let lastTouchT = -9999;
// Space Junkie firing: hold the button and the blaster keeps firing until
// the heat lockout stops you — release, vent on a return, resume
let fireHeld = false, fireTouchId = null;
let chargeHeld = false, chargeTouchId = null; // BLASTER mode: hold to charge a shot
const uiTouchIds = new Set(); // touches claimed by on-screen buttons
window.addEventListener('mousedown', e => {
  if (performance.now() - lastTouchT < 900) return;
  if (e.button === 2) { // right button = CHARGE (blaster mode)
    chargeHeld = true; audio();
    return;
  }
  fireHeld = true;
  onPress(e.clientX, e.clientY);
});
window.addEventListener('mouseup', e => {
  if (e.button === 2) { chargeHeld = false; return; }
  fireHeld = false;
});
// right-click charges instead of opening the context menu during play
window.addEventListener('contextmenu', e => {
  if (G.state === 'play' || G.state === 'serve') e.preventDefault();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') chargeHeld = false;
});
window.addEventListener('wheel', e => {
  if (G.state === 'dex') dexScroll = Math.max(0, dexScroll + e.deltaY);
}, { passive: true });

window.addEventListener('touchstart', e => {
  audio();
  lastTouchT = performance.now();
  for (const t of e.changedTouches) {
    const x = t.clientX, y = t.clientY;
    if (G.state === 'play' || G.state === 'serve') {
      if (paused) { // pause screen is modal: quit button, else tap resumes
        if (inRect(x, y, pauseQuitGeom())) quitToMenu(); else paused = false;
        uiTouchIds.add(t.identifier);
        continue;
      }
      const B = touchButtons();
      // touches that land on a button are UI touches — they must never be
      // adopted as paddle control, even if the finger wiggles (that was
      // yanking the paddle to the FIRE button's side of the screen)
      if (B.fire && inCircle(x, y, B.fire, 22)) { fireAction(); fireHeld = true; fireTouchId = t.identifier; uiTouchIds.add(t.identifier); continue; }
      if (B.charge && inCircle(x, y, B.charge, 20)) { chargeHeld = true; chargeTouchId = t.identifier; uiTouchIds.add(t.identifier); continue; }
      if (inCircle(x, y, B.mega, 12)) { tryMega(); uiTouchIds.add(t.identifier); continue; }
      if (inCircle(x, y, B.pause, 10)) { togglePause(); uiTouchIds.add(t.identifier); continue; }
      if (inCircle(x, y, B.sound, 10)) { toggleMusic(); uiTouchIds.add(t.identifier); continue; }
      // near-miss dead zone: a fumbled tap AROUND a button is swallowed
      // outright — under no circumstances does it become paddle control
      if ((B.fire && inCircle(x, y, B.fire, 64)) || inCircle(x, y, B.mega, 42) ||
          (B.charge && inCircle(x, y, B.charge, 60)) ||
          inCircle(x, y, B.pause, 30) || inCircle(x, y, B.sound, 30)) {
        uiTouchIds.add(t.identifier);
        continue;
      }
      // everything else is paddle control — and launches during serve
      paddleTouchId = t.identifier;
      mouseX = x; lastMouseY = y;
      if (G.state === 'serve') fireAction();
    } else if (G.state === 'dex') {
      dexDragY = y; dexDragStart = y;
      onPressDexTapPending = { x, y };
    } else {
      mouseX = x; lastMouseY = y;
      onPress(x, y);
    }
  }
}, { passive: true });
let onPressDexTapPending = null;
window.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (uiTouchIds.has(t.identifier)) continue; // button touches never steer
    if (G.state === 'dex' && dexDragY != null) {
      dexScroll = Math.max(0, dexScroll - (t.clientY - dexDragY));
      dexDragY = t.clientY;
      continue;
    }
    if (paddleTouchId === null || t.identifier === paddleTouchId) {
      mouseX = t.clientX; lastMouseY = t.clientY;
      if (dragSlider >= 0) setSliderFromX(dragSlider, t.clientX);
    }
  }
  e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', e => {
  lastTouchT = performance.now();
  for (const t of e.changedTouches) {
    uiTouchIds.delete(t.identifier);
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (t.identifier === fireTouchId) { fireTouchId = null; fireHeld = false; }
    if (t.identifier === chargeTouchId) { chargeTouchId = null; chargeHeld = false; }
    if (G.state === 'dex' && onPressDexTapPending && Math.abs(t.clientY - dexDragStart) < 10) {
      onPress(onPressDexTapPending.x, onPressDexTapPending.y);
    }
  }
  onPressDexTapPending = null; dexDragY = null;
  if (dragSlider >= 0) { dragSlider = -1; saveSettings(); }
});
// a system gesture can cancel touches without a touchend — release everything
// so autofire and paddle control can't get stuck
window.addEventListener('touchcancel', e => {
  lastTouchT = performance.now();
  for (const t of e.changedTouches) {
    uiTouchIds.delete(t.identifier);
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (t.identifier === fireTouchId) { fireTouchId = null; fireHeld = false; }
    if (t.identifier === chargeTouchId) { chargeTouchId = null; chargeHeld = false; }
  }
  onPressDexTapPending = null; dexDragY = null;
});
function toggleMusic() {
  MUSIC.on = !MUSIC.on;
  saveStore('pkbrk-music', MUSIC.on);
}
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let konamiIdx = 0;
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { primaryAction(); e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') chargeHeld = true; // charge shot
  if (e.code === 'KeyE') tryMega();
  if (e.code === 'KeyM') toggleMusic();
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyQ') quitToMenu();
  if (e.code === 'Escape') {
    if (G.state === 'upgrade' && upgradeTreeOpen) upgradeTreeOpen = false;
    else if (G.state === 'upgrade') return;
    else if (G.state === 'dex') { G.state = 'menu'; dexScroll = 0; }
    else if (trialOpen) trialOpen = false;
    else if (advOpen) { advOpen = false; saveSettings(); }
    else if (G.state === 'menu' && menuPage === 'setup') menuPage = 'modes'; // back out of setup
    else if (paused) quitToMenu(); // paused + Esc = leave the run
    else togglePause();
  }
  // 1/2/3 pick, R rerolls, T opens the complete tree between waves
  if (e.code === 'KeyT' && G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8) {
    upgradeTreeOpen = !upgradeTreeOpen; SFX.wall();
  }
  if (!upgradeTreeOpen && G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8 && /^Digit[123]$/.test(e.code)) {
    pickUpgrade(+e.code.slice(5) - 1);
  }
  if (!upgradeTreeOpen && e.code === 'KeyR' && G.state === 'upgrade' && G.upgradeChoices && !G.rerolled && G.stateT > 0.8) {
    rerollDraft();
  }
  // ↑↑↓↓←→←→BA — some legends never die
  konamiIdx = e.code === KONAMI[konamiIdx] ? konamiIdx + 1 : (e.code === KONAMI[0] ? 1 : 0);
  if (konamiIdx === KONAMI.length) {
    konamiIdx = 0;
    audio();
    addToDex(151, true);
    getSprite(151, true);
    if (G.state === 'play' || G.state === 'serve') G.mega = 1;
    SFX.mega();
    setAnnounce('fairy', '#ec407a', 'MEW APPEARED!', 'SHINY MEW REGISTERED TO POKÉDEX · MEGA CHARGED', 3);
  }
});
let paused = false;
let upgradeTreeOpen = false;
function togglePause() { if (G.state === 'play' || G.state === 'serve') paused = !paused; }
// bail out of a run straight back to the title screen (keeps your best score)
function quitToMenu() {
  if (G.state !== 'play' && G.state !== 'serve' && !paused) return;
  if (!G.trial && G.score > G.best) { G.best = G.score; saveStore('pkbrk-best', G.best); }
  paused = false;
  G.state = 'menu';
  menuPage = 'modes'; // always land on the title page, not mid-setup
  dexScroll = 0;
  SFX.wall();
}
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') paused = true; });

function setSliderFromX(i, x) {
  const s = SLIDERS[i], gm = sliderGeom(i);
  const v = Math.max(0, Math.min(1, (x - gm.x) / gm.w));
  SETTINGS[s.key] = Math.round((s.min + v * (s.max - s.min)) * 100) / 100;
}
function inRect(x, y, r) { return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h; }
// between-wave upgrade cards: 3 across on desktop, stacked rows on phones
function upgradeLayout() {
  const short = H < 520;
  const stacked = W < 560 && !short;
  if (stacked) {
    const cw = Math.min(370, W * 0.92), ch = Math.min(96, H * 0.13);
    const x = W / 2 - cw / 2, y0 = Math.min(H * 0.4, H - 3 * (ch + 14) - 60);
    const ay = Math.min(y0 + 3 * (ch + 14) + 6, H - 44), aw = Math.min(150, (W - 36) / 2);
    return { stacked, short, card: i => ({ x, y: y0 + i * (ch + 14), w: cw, h: ch }),
      reroll: { x: W / 2 - aw - 6, y: ay, w: aw, h: 32 },
      tree: { x: W / 2 + 6, y: ay, w: aw, h: 32 } };
  }
  const cw = Math.min(235, (W - 84) / 3), ch = Math.min(240, H * 0.34);
  const gap = 20, total = cw * 3 + gap * 2;
  const ay = Math.min(H * 0.4 + ch + 16, H - 48);
  return { stacked, short, card: i => ({ x: W / 2 - total / 2 + i * (cw + gap), y: H * 0.4, w: cw, h: ch }),
    reroll: { x: W / 2 - 188, y: ay, w: 176, h: 34 },
    tree: { x: W / 2 + 12, y: ay, w: 176, h: 34 } };
}
function upgradeTreeLayout() {
  const panel = { x: Math.max(10, W * 0.025), y: Math.max(10, H * 0.035),
    w: Math.min(W - 20, W * 0.95), h: Math.min(H - 20, H * 0.93) };
  return { panel, compact: W < 700,
    close: { x: panel.x + panel.w - 46, y: panel.y + 10, w: 34, h: 34 } };
}
function pickUpgrade(i) {
  const c = G.upgradeChoices && G.upgradeChoices[i];
  if (!c) return;
  // late-run mastery STACK pick (literal held item in SPACE JUNKIE)
  if (c.stack) {
    G.stacks[c.stack.key] = (G.stacks[c.stack.key] || 0) + 1;
    G.upgradeChoices = null;
    upgradeTreeOpen = false;
    SFX.power();
    buildLevel(G.level);
    serve();
    setAnnounce(c.stack.icon, c.stack.color,
      c.stack.name + ' ×' + G.stacks[c.stack.key],
      c.stack.desc, 2.4, G.mode === 'junkie' ? 'HELD ITEM STACKED — CHECK YOUR PILOT' : 'MASTERY STACKED — CHECK YOUR BUILD RAIL');
    return;
  }
  const junkieName = junkieTierName(c.pathKey, c.tierIdx);
  const tier = advancePath(c.pathKey);
  G.upgradeChoices = null;
  upgradeTreeOpen = false;
  SFX.power();
  const capped = pathLvl(c.pathKey) >= 4;
  buildLevel(G.level);
  serve();
  // confirm AFTER buildLevel so the stage banner doesn't swallow it —
  // unless the partner just evolved, which is the bigger moment
  if (G.justEvolved) { G.justEvolved = false; return; }
  const shownName = G.mode === 'junkie' ? junkieName : tier.name;
  setAnnounce(tier.icon, c.path.color,
    (capped ? '★ ' : '') + shownName + (capped ? ' ★' : ''),
    tierDesc(c.pathKey, c.tierIdx), capped ? 3 : 2.2,
    (G.mode === 'junkie' ? 'HELD ITEM EQUIPPED · ' : '') + c.path.name + ' PATH ' + pathLvl(c.pathKey) + '/4' + (capped ? ' — CAPSTONE UNLOCKED!' : ''));
  if (capped) SFX.mega();
}
// one fresh hand per draft — reroll keeps drafts from feeling dead when
// every offer misses your build
function rerollDraft() {
  G.rerolled = true;
  rollUpgradeChoices();
  SFX.wall();
}
function dexCloseGeom() { return { x: 14, y: 14, w: 110, h: 36 }; }
function onPress(x, y) {
  audio();
  if (G.state === 'dex') {
    if (inRect(x, y, dexCloseGeom())) { G.state = 'menu'; dexScroll = 0; }
    else if (!IS_TOUCH) { G.state = 'menu'; dexScroll = 0; } // desktop: click anywhere returns
    return;
  }
  if (G.state === 'upgrade') {
    if (G.upgradeChoices && G.stateT > 0.8) {
      const L = upgradeLayout();
      if (upgradeTreeOpen) {
        const T = upgradeTreeLayout();
        if (inRect(x, y, T.close) || !inRect(x, y, T.panel)) upgradeTreeOpen = false;
        return;
      }
      for (let i = 0; i < G.upgradeChoices.length; i++) {
        if (inRect(x, y, L.card(i))) { pickUpgrade(i); return; }
      }
      if (!G.rerolled && inRect(x, y, L.reroll)) { rerollDraft(); return; }
      if (inRect(x, y, L.tree)) { upgradeTreeOpen = true; SFX.wall(); return; }
    }
    return;
  }
  if (G.state === 'menu') {
    if (trialOpen) {
      const T = trialLayout();
      if (inRect(x, y, T.close) || !inRect(x, y, { x: T.px, y: T.py, w: T.pw, h: T.ph })) {
        trialOpen = false; return;
      }
      for (let i = 0; i < GENS.length; i++) {
        if (inRect(x, y, T.region(i))) { trialSel.region = i; SFX.wall(); return; }
      }
      for (let i = 0; i < STAGES; i++) {
        if (inRect(x, y, T.stage(i))) { trialSel.stage = i; SFX.wall(); return; }
      }
      if (inRect(x, y, T.start)) {
        trialOpen = false;
        resetRun(trialSel.region * STAGES + trialSel.stage + 1, true);
        return;
      }
      return;
    }
    if (advOpen) {
      const A = advLayout();
      if (inRect(x, y, A.close) || !inRect(x, y, { x: A.px, y: A.py, w: A.pw, h: A.ph })) {
        advOpen = false; saveSettings(); return;
      }
      const grab = IS_TOUCH ? 26 : 18;
      for (let i = 0; i < SLIDERS.length; i++) {
        const gm = A.slider(i);
        if (Math.abs(y - gm.y) < grab && x > gm.x - 14 && x < gm.x + gm.w + 14) {
          dragSlider = i; setSliderFromX(i, x); return;
        }
      }
      for (let i = 0; i < TOGGLES.length; i++) {
        if (inRect(x, y, A.toggle(i))) {
          SETTINGS[TOGGLES[i].key] = !SETTINGS[TOGGLES[i].key];
          saveSettings(); SFX.wall(); return;
        }
      }
      return;
    }
    // PAGE 2 — setup: starter + difficulty for the chosen mode, then START
    if (menuPage === 'setup') {
      const L = setupLayout();
      if (inRect(x, y, L.back)) { menuPage = 'modes'; SFX.wall(); return; }
      for (let i = 0; i < STARTERS.length; i++) {
        if (inRect(x, y, L.starter(i))) { SETTINGS.starter = STARTERS[i].key; saveSettings(); SFX.wall(); return; }
      }
      const keys = Object.keys(PRESETS);
      for (let i = 0; i < keys.length; i++) {
        if (inRect(x, y, presetGeom(i))) { SETTINGS.preset = keys[i]; saveSettings(); SFX.wall(); return; }
      }
      if (inRect(x, y, startBtnGeom())) { resetRun(); return; }
      return;
    }
    // PAGE 1 — pick your game: two headliner cards + the experimental chip
    const L = menuLayout();
    if (L.resume && inRect(x, y, L.resume)) { resumeRun(); return; }
    for (let i = 0; i < MODES.length; i++) {
      if (inRect(x, y, i < 2 ? L.card(i) : L.exp)) {
        SETTINGS.mode = MODES[i].key; saveSettings();
        menuPage = 'setup'; SFX.power(); return;
      }
    }
    if (inRect(x, y, dexBtnGeom())) { G.state = 'dex'; dexScroll = 0; return; }
    if (inRect(x, y, L.trial)) { trialOpen = true; return; }
    if (inRect(x, y, L.adv)) { advOpen = true; return; }
    return;
  }
  if (paused) { // pause screen is modal: quit button, else click resumes
    if (inRect(x, y, pauseQuitGeom())) quitToMenu(); else paused = false;
    return;
  }
  // mega meter click zone (bottom-right) during desktop play
  if (!IS_TOUCH && G.state === 'play' && y > FLOOR() - 56 && x > W - 210) { tryMega(); return; }
  primaryAction();
}
// serve aim: a still paddle launches straight up; sliding sideways while you
// launch tilts the shot. The dotted guide shows it before you commit.
function serveAngle() {
  return -Math.PI / 2 + Math.max(-0.45, Math.min(0.45, G.paddle.speed * 0.0004));
}
// launch stuck balls / fire the blaster — shared by click, Space and the FIRE
// button. `auto` marks held-button repeat fire (no denial beep spam).
function fireAction(auto = false) {
  if (paused) { paused = false; return; }
  if (G.state === 'serve') {
    G.balls.forEach(b => { if (b.stuck) { b.stuck = false; const a = serveAngle(); const sp = ballSp(); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; } });
    G.state = 'play';
    return;
  }
  if (G.state !== 'play') return;
  const stuck = G.balls.filter(b => b.stuck);
  if (stuck.length) {
    stuck.forEach(b => {
      b.stuck = false;
      const a = -Math.PI / 2 + ((b.x - G.paddle.x) / paddleW()) * 1.1;
      const sp = ballSp();
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
    });
    return;
  }
  // CLASSIC has no free blaster — the ball is the weapon until you EARN a
  // blaster (offense draft / LASER power-up / Mega). Pressing fire just no-ops.
  if (!blasterArmed()) return;
  if (G.overheat > 0) { if (!auto) tone(110, 0.09, 'sawtooth', 0.05, -40); return; }
  if (G.blasterCD > 0) return;
  G.blasterCD = upgN('hyper') ? 0.225 : 0.3;
  G.shotsFired++;
  G.muzzle = 0.12;
  // heat: fire freely like a shooter — a long sustained stream (~15+ shots)
  // before it overheats, and it cools fast, so the lockout is a rare "held it
  // down forever" event rather than a constant governor. Paddle returns still
  // vent it; a water partner's Torrent runs the barrel cooler still.
  const torrent = G.starter === 'water' ? 0.8 - 0.04 * (G.starterLvl - 1) : 1;
  // SPACE JUNKIE runs much cooler — you're a Pokémon using its attack, not a
  // cannon — and NEVER-MELT ICE stacks cool it further still
  const modeCool = G.mode === 'junkie' ? 0.55 : 1;
  const masteryCool = Math.pow(0.94, G.stacks.ice || 0);
  // HYPER CYCLE also runs the barrel cooler — without this, sustained fire is
  // heat-limited well below the faster cadence and the capstone adds no DPS
  const hyperCool = upgN('hyper') ? 0.8 : 1;
  G.heat = Math.min(1, G.heat + 0.13 * (1 - 0.25 * upgN('coolant')) * hyperCool * torrent * modeCool * masteryCool);
  if (G.heat >= 1) {
    G.overheat = OVERHEAT_DUR;
    addFloater(G.paddle.x, shipY() - 44, 'OVERHEATED!', '#ff7043', 15);
    noiseBurst(0.3, 0.09);
  }
  // SPACE JUNKIE mode: the shot IS the pilot's attack — the SHAPE follows the
  // species, the color + type follow the current element (green fire, etc.)
  const pil = G.mode === 'junkie' ? pilotInfo() : null;
  if (pil) G.attackAnim = 1; // the pilot visibly ATTACKS — lunge + flash
  const nBolts = upgN('twin') ? 2 : 1;
  const pulseEvery = upgN('impactX') ? 4 : 5;
  const pulse = !!upgN('pulse') && G.shotsFired % pulseEvery === 0;
  for (let i = 0; i < nBolts; i++) {
    G.lasers.push({
      x: G.paddle.x + (nBolts > 1 ? (i ? 11 : -11) : 0),
      y: shipY() - 16, basic: true, // fires from wherever the ship flies
      explosive: !!G.fx_fire || G.megaT > 0,
      powerMul: nBolts > 1 ? 0.65 : 1,
      heavy: !!upgN('heavy'), pulse, nova: pulse && !!upgN('impactX'),
      mega: G.megaT > 0,
      shape: pil ? pil.shape : null,
      element: pil ? attackElement() : null,
    });
  }
  SFX.blaster();
}
// shooter-mode heavy shot — a fat, piercing bolt scaled by how long you held
// the charge (c in 0..1). Distinct fat visual + a deeper report.
function fireCharge(c) {
  if (G.state !== 'play') return;
  const power = (1 + Math.round(c * 4)) * (upgN('impactX') ? 1.25 : 1); // 1..5, capstone +25%
  const pierce = 1 + Math.round(c * 3);  // drills through 1..4 blocks
  const pil = G.mode === 'junkie' ? pilotInfo() : null;
  if (pil) G.attackAnim = 1.4; // charge release = the big attack animation
  G.lasers.push({
    x: G.paddle.x, y: shipY() - 18, basic: true, charged: true,
    power, pierce, r: (12 + c * 22) * (upgN('heavy') ? 1.15 : 1),
    heavy: !!upgN('heavy'), explosive: !!G.fx_fire || G.megaT > 0, mega: G.megaT > 0,
    shape: pil ? pil.shape : null,
    element: pil ? attackElement() : null,
  });
  G.muzzle = 0.18;
  G.shake = Math.min(G.shake + 2 + c * 4, 12);
  SFX.blaster();
  tone(170 + c * 320, 0.2, 'sawtooth', 0.06, 300);
}
function primaryAction() {
  audio();
  // keyboard walks the two menu pages: mode select → setup → start
  if (G.state === 'menu') {
    if (!advOpen && !trialOpen) {
      if (menuPage === 'setup') resetRun();
      else menuPage = 'setup'; // fire on page 1 = take the current mode to setup
    }
    return;
  }
  if (G.state === 'gameover') { G.state = 'menu'; menuPage = 'modes'; return; }
  if (G.state === 'upgrade') return;
  fireAction();
}
function tryMega() {
  if (G.state !== 'play' || G.megaT > 0 || G.mega < 1) return;
  G.megaT = megaDur(); G.mega = 0;
  G.shake = 14;
  SFX.mega();
  setAnnounce('mega', '#ffd54f', 'MEGA EVOLUTION!', 'PIERCING BALLS · AUTO-LASERS', 2.5);
}
