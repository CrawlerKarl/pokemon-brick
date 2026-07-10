'use strict';
// ============================================================
//  INPUT
// ============================================================
let mouseX = window.innerWidth / 2, lastMouseY = window.innerHeight / 2;
let paddleTouchId = null;

// on-screen buttons for touch play: drag anywhere moves the paddle,
// FIRE shoots, MEGA unleashes, plus pause & sound in the top corner
function touchButtons() {
  const fl = FLOOR();
  return {
    fire:  { x: W - 52, y: fl - 48, r: 42 },
    mega:  { x: W - 52, y: fl - 148, r: 30 },
    pause: { x: W - 26, y: 82, r: 18 },
    sound: { x: W - 72, y: 82, r: 18 },
  };
}
function inCircle(x, y, b, slop = 8) { return Math.hypot(x - b.x, y - b.y) < b.r + slop; }

window.addEventListener('mousemove', e => {
  mouseX = e.clientX; lastMouseY = e.clientY;
  if (dragSlider >= 0) setSliderFromX(dragSlider, e.clientX);
});
window.addEventListener('mouseup', () => { if (dragSlider >= 0) { dragSlider = -1; saveSettings(); } });
window.addEventListener('mousedown', e => onPress(e.clientX, e.clientY));
window.addEventListener('wheel', e => {
  if (G.state === 'dex') dexScroll = Math.max(0, dexScroll + e.deltaY);
}, { passive: true });

window.addEventListener('touchstart', e => {
  audio();
  for (const t of e.changedTouches) {
    const x = t.clientX, y = t.clientY;
    if (G.state === 'play' || G.state === 'serve') {
      if (paused) { // pause screen is modal: quit button, else tap resumes
        if (inRect(x, y, pauseQuitGeom())) quitToMenu(); else paused = false;
        continue;
      }
      const B = touchButtons();
      if (inCircle(x, y, B.fire)) { fireAction(); continue; }
      if (inCircle(x, y, B.mega)) { tryMega(); continue; }
      if (inCircle(x, y, B.pause)) { togglePause(); continue; }
      if (inCircle(x, y, B.sound)) { toggleMusic(); continue; }
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
  for (const t of e.changedTouches) {
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (G.state === 'dex' && onPressDexTapPending && Math.abs(t.clientY - dexDragStart) < 10) {
      onPress(onPressDexTapPending.x, onPressDexTapPending.y);
    }
  }
  onPressDexTapPending = null; dexDragY = null;
  if (dragSlider >= 0) { dragSlider = -1; saveSettings(); }
});
function toggleMusic() {
  MUSIC.on = !MUSIC.on;
  localStorage.setItem('pkbrk-music', MUSIC.on);
}
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let konamiIdx = 0;
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { primaryAction(); e.preventDefault(); }
  if (e.code === 'KeyE') tryMega();
  if (e.code === 'KeyM') toggleMusic();
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyQ') quitToMenu();
  if (e.code === 'Escape') {
    if (G.state === 'dex') { G.state = 'menu'; dexScroll = 0; }
    else if (trialOpen) trialOpen = false;
    else if (advOpen) { advOpen = false; saveSettings(); }
    else if (paused) quitToMenu(); // paused + Esc = leave the run
    else togglePause();
  }
  // 1/2/3 pick an upgrade card between waves
  if (G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8 && /^Digit[123]$/.test(e.code)) {
    pickUpgrade(+e.code.slice(5) - 1);
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
function togglePause() { if (G.state === 'play' || G.state === 'serve') paused = !paused; }
// bail out of a run straight back to the title screen (keeps your best score)
function quitToMenu() {
  if (G.state !== 'play' && G.state !== 'serve' && !paused) return;
  if (!G.trial && G.score > G.best) { G.best = G.score; localStorage.setItem('pkbrk-best', G.best); }
  paused = false;
  G.state = 'menu';
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
  const stacked = W < 560;
  if (stacked) {
    const cw = Math.min(370, W * 0.92), ch = Math.min(96, H * 0.13);
    const x = W / 2 - cw / 2, y0 = Math.min(H * 0.4, H - 3 * (ch + 14) - 60);
    return { stacked, card: i => ({ x, y: y0 + i * (ch + 14), w: cw, h: ch }) };
  }
  const cw = Math.min(235, (W - 84) / 3), ch = Math.min(240, H * 0.34);
  const gap = 20, total = cw * 3 + gap * 2;
  return { stacked, card: i => ({ x: W / 2 - total / 2 + i * (cw + gap), y: H * 0.4, w: cw, h: ch }) };
}
function pickUpgrade(i) {
  const u = G.upgradeChoices && G.upgradeChoices[i];
  if (!u) return;
  G.upg[u.key] = upgN(u.key) + 1;
  G.upgradeChoices = null;
  SFX.power();
  buildLevel(G.level);
  serve();
  // confirm AFTER buildLevel so the stage banner doesn't swallow it
  setAnnounce(u.icon, u.color, u.name + (upgN(u.key) > 1 ? ' ' + romanTier(upgN(u.key)) : ''),
    u.desc, 2.2, genFor(G.level).name + ' ' + (stageIdx(G.level) + 1) + '/3 — ' + STAGE_NAMES[stageIdx(G.level)]);
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
      for (let i = 0; i < G.upgradeChoices.length; i++) {
        if (inRect(x, y, L.card(i))) { pickUpgrade(i); return; }
      }
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
    const L = menuLayout();
    for (let i = 0; i < STARTERS.length; i++) {
      if (inRect(x, y, L.starter(i))) { SETTINGS.starter = STARTERS[i].key; saveSettings(); SFX.wall(); return; }
    }
    const keys = Object.keys(PRESETS);
    for (let i = 0; i < keys.length; i++) {
      if (inRect(x, y, presetGeom(i))) { SETTINGS.preset = keys[i]; saveSettings(); SFX.wall(); return; }
    }
    if (inRect(x, y, startBtnGeom())) { resetRun(); return; }
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
// launch stuck balls / fire the blaster — shared by click, Space and the FIRE button
function fireAction() {
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
  if (G.overheat > 0) { tone(110, 0.09, 'sawtooth', 0.05, -40); return; }
  if (G.blasterCD > 0) return;
  G.blasterCD = 0.55;
  G.shotsFired++;
  G.muzzle = 0.12;
  // heat: the blaster is a finishing tool, not a primary weapon — ~3 shots
  // overheat it. paddle returns vent it, so real breakout play keeps it cool.
  G.heat = Math.min(1, G.heat + 0.4 * (1 - 0.3 * upgN('coolant')));
  if (G.heat >= 1) {
    G.overheat = OVERHEAT_DUR;
    addFloater(G.paddle.x, PADDLE_Y() - 44, 'OVERHEATED!', '#ff7043', 15);
    noiseBurst(0.3, 0.09);
  }
  G.lasers.push({ x: G.paddle.x, y: PADDLE_Y() - 16, basic: true, explosive: !!G.fx_fire });
  SFX.blaster();
}
function primaryAction() {
  audio();
  if (G.state === 'menu') { if (!advOpen && !trialOpen) resetRun(); return; }
  if (G.state === 'gameover') { G.state = 'menu'; return; }
  if (G.state === 'upgrade') return;
  fireAction();
}
function tryMega() {
  if (G.state !== 'play' || G.megaT > 0 || G.mega < 1) return;
  G.megaT = MEGA_DUR; G.mega = 0;
  G.shake = 14;
  SFX.mega();
  setAnnounce('mega', '#ffd54f', 'MEGA EVOLUTION!', 'PIERCING BALLS · AUTO-LASERS', 2.5);
}
