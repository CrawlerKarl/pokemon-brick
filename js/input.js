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
  const base = FLOOR() - 34, scale = SETTINGS.buttonScale || 1;
  const left = !!SETTINGS.leftHanded;
  const edge = n => left ? n : W - n;
  const b = {
    mega:  { x: edge(138), y: base - 40, r: 30 * scale }, // beside FIRE — paddle rides above both
    pause: { x: edge(28), y: 84, r: 20 * scale },
    sound: { x: edge(72), y: 82, r: 18 * scale },
  };
  // FIRE only when the blaster is armed — CLASSIC has none until you earn it,
  // and the ball is launched by tapping the playfield, not this pad. In the
  // shooter modes this ONE pad also charges when held, so there is no separate
  // CHARGE pad and the other thumb is free to fly/steer.
  if (blasterArmed()) b.fire = { x: edge(58), y: base - 42, r: 42 * scale };
  return b;
}
function inCircle(x, y, b, slop = 8) { return Math.hypot(x - b.x, y - b.y) < b.r + slop; }

window.addEventListener('mousemove', e => {
  // A touch tap can be followed by a synthetic mousemove at the same spot.
  // Ignore that replay too (not just the later mousedown), otherwise tapping
  // FIRE can move the Space Junkie pilot to the button before it shoots.
  if (performance.now() - lastTouchT < 900) return;
  mouseX = e.clientX; lastMouseY = e.clientY;
  if (dragSlider >= 0) setSliderFromX(dragSlider, e.clientX);
});
window.addEventListener('mouseup', () => { if (dragSlider >= 0) { dragSlider = -1; saveSettings(); } });
// mobile browsers replay taps as synthetic mouse events ~300ms later — that
// ghost click was instantly UN-pausing right after the pause button paused.
// Any recent touch mutes the mouse path entirely.
let lastTouchT = -9999;
// Desktop left-click and CLASSIC's earned touch blaster can repeat while held.
// Shooter-mode touch uses the tap-or-hold intent path below instead.
let fireHeld = false, fireTouchId = null;
let chargeHeld = false, chargeTouchId = null; // charge a big shot (right-click / Shift / hold FIRE)
// One thumb does it all in shooter modes: release a quick FIRE-pad tap for one
// normal shot, or keep holding past this short intent threshold to charge. The
// threshold prevents ordinary taps from becoming tiny accidental charge shots.
let touchFirePendingId = null, touchFirePendingT = 0;
const TOUCH_CHARGE_HOLD_MS = 220;
const uiTouchIds = new Set(); // touches claimed by on-screen buttons
// Pin the steering target to the player's current position whenever a UI pad
// claims a touch. This also neutralizes any pointer replay that arrived just
// before touchstart; a FIRE tap can never become a movement command.
function claimUiTouch(id, x = null, y = null, label = '') {
  uiTouchIds.add(id);
  if (x != null && y != null) {
    G.uiTouchPulse = { x, y, label, t: 0.38, max: 0.38 };
    haptic('tap');
  }
  if (paddleTouchId !== null || !G.paddle) return;
  mouseX = G.paddle.x;
  if (G.mode === 'junkie') lastMouseY = G.shipYv + (IS_TOUCH ? 85 : 0);
}
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
      if (paused) { // pause screen is modal — route taps through onPress
        onPress(x, y);
        claimUiTouch(t.identifier);
        continue;
      }
      const B = touchButtons();
      // touches that land on a button are UI touches — they must never be
      // adopted as paddle control, even if the finger wiggles (that was
      // yanking the paddle to the FIRE button's side of the screen)
      if (B.fire && inCircle(x, y, B.fire, 22)) {
        claimUiTouch(t.identifier, B.fire.x, B.fire.y, 'FIRE');
        if (G.mode !== 'classic' && G.state === 'play') {
          // Delay only shooter-mode touch fire long enough to distinguish a
          // tap from a hold. A second finger cannot steal an active FIRE touch.
          if (touchFirePendingId === null && chargeTouchId === null) {
            touchFirePendingId = t.identifier;
            touchFirePendingT = performance.now();
          }
        } else {
          // CLASSIC (and serve launch) keep their immediate press/held-fire
          // behavior exactly as before.
          fireAction(); fireHeld = true; fireTouchId = t.identifier;
        }
        continue;
      }
      if (inCircle(x, y, B.mega, 12)) { tryMega(); claimUiTouch(t.identifier, B.mega.x, B.mega.y, 'MEGA'); continue; }
      if (inCircle(x, y, B.pause, 10)) { togglePause(); claimUiTouch(t.identifier, B.pause.x, B.pause.y, 'PAUSE'); continue; }
      if (inCircle(x, y, B.sound, 10)) { toggleMusic(); claimUiTouch(t.identifier, B.sound.x, B.sound.y, 'SOUND'); continue; }
      // near-miss dead zone: a fumbled tap AROUND a button is swallowed
      // outright — under no circumstances does it become paddle control
      if ((B.fire && inCircle(x, y, B.fire, 64)) || inCircle(x, y, B.mega, 42) ||
          inCircle(x, y, B.pause, 30) || inCircle(x, y, B.sound, 30)) {
        claimUiTouch(t.identifier);
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
    if (uiTouchIds.has(t.identifier)) { claimUiTouch(t.identifier); continue; } // button touches never steer
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
    if (uiTouchIds.has(t.identifier)) claimUiTouch(t.identifier);
    uiTouchIds.delete(t.identifier);
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (t.identifier === fireTouchId) { fireTouchId = null; fireHeld = false; }
    if (t.identifier === chargeTouchId) { chargeTouchId = null; chargeHeld = false; }
    // Releasing before the hold threshold is a normal tap. Once promoted to a
    // charge, release is handled above and update() fires the built-up shot.
    if (t.identifier === touchFirePendingId) { touchFirePendingId = null; fireAction(); }
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
    if (uiTouchIds.has(t.identifier)) claimUiTouch(t.identifier);
    uiTouchIds.delete(t.identifier);
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (t.identifier === fireTouchId) { fireTouchId = null; fireHeld = false; }
    if (t.identifier === chargeTouchId) {
      chargeTouchId = null; chargeHeld = false;
      G.charge = 0; // a system-cancel is not a deliberate charged-shot release
    }
    if (t.identifier === touchFirePendingId) touchFirePendingId = null; // cancelled, no shot
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
    else if (G.state === 'ceremony') { if (G.ceremony) G.ceremony.t = 99; advanceCeremony(); }
    else if (G.state === 'dex') { G.state = 'menu'; dexScroll = 0; }
    else if (trialOpen) trialOpen = false;
    else if (advOpen) { advOpen = false; saveSettings(); }
    else if (G.state === 'menu' && menuPage === 'setup') menuPage = 'modes'; // back out of setup
    else if (paused) quitToMenu(); // paused + Esc = leave the run
    else togglePause();
  }
  // 1/2/3 pick, R rerolls, T opens the complete tree between waves
  if (e.code === 'KeyT' && G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8) {
    upgradeTreeOpen = !upgradeTreeOpen;
    if (upgradeTreeOpen) treeSel = { pi: 0, ti: Math.min(3, pathLvl(PATH_KEYS[0])) };
    SFX.wall();
  }
  if (!upgradeTreeOpen && G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8 && /^Digit[123]$/.test(e.code)) {
    // digits SELECT (inspect); Enter / the same digit again confirms
    const i = +e.code.slice(5) - 1;
    if (G.upgradeChoices[i]) {
      if (draftSel === i) pickUpgrade(i);
      else { draftSel = i; SFX.wall(); }
    }
  }
  if (!upgradeTreeOpen && G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8 &&
      (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && draftSel != null) {
    pickUpgrade(draftSel);
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
// draft pick is two-step: tap a card to INSPECT it (highlight + its path chain
// shown in place), then CONFIRM applies it — no more accidental picks while
// just reading, and no flipping to another screen for path context
let draftSel = null;
function togglePause() { if (G.state === 'play' || G.state === 'serve') paused = !paused; }
// bail out of a run straight back to the title screen (keeps your best score)
function quitToMenu() {
  if (G.state !== 'play' && G.state !== 'serve' && !paused) return;
  if (!G.trial && !G.cheated && G.score > G.best) { G.best = G.score; saveStore('pkbrk-best', G.best); }
  paused = false;
  G.state = 'menu';
  menuPage = 'modes'; // always land on the title page, not mid-setup
  dexScroll = 0;
  SFX.wall();
}
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') paused = true; });

function setSliderFromX(i, x) {
  const s = activeSliders()[i], gm = sliderGeom(i);
  const v = Math.max(0, Math.min(1, (x - gm.x) / gm.w));
  SETTINGS[s.key] = Math.round((s.min + v * (s.max - s.min)) * 100) / 100;
}
function inRect(x, y, r) { return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h; }
// between-wave upgrade cards: 3 across on desktop, stacked rows on phones
function upgradeLayout() {
  const short = H < 520;
  const stacked = W < 560 && !short;
  if (stacked) {
    const cw = Math.min(380, W * 0.92), ch = Math.min(108, H * 0.15);
    const x = W / 2 - cw / 2, y0 = Math.min(H * 0.38, H - 3 * (ch + 14) - 100);
    const ay = Math.min(y0 + 3 * (ch + 14) + 6, H - 86), aw = Math.min(150, (W - 36) / 2);
    const cbw = Math.min(240, aw * 2);
    return { stacked, short, card: i => ({ x, y: y0 + i * (ch + 14), w: cw, h: ch }),
      confirm: { x: W / 2 - cbw / 2, y: ay, w: cbw, h: 36 },
      reroll: { x: W / 2 - aw - 6, y: ay + 44, w: aw, h: 32 },
      tree: { x: W / 2 + 6, y: ay + 44, w: aw, h: 32 } };
  }
  const cw = Math.min(250, (W - 84) / 3), ch = Math.min(252, H * 0.4);
  const gap = 22, total = cw * 3 + gap * 2;
  const cy = Math.min(H * 0.4, H - ch - 60);
  const ay = Math.min(cy + ch + 16, H - 48);
  // three-button row: REROLL · CONFIRM (widest — it's the primary action) · TREE
  const bw = Math.min(150, (W - 72) / 3.5), cbw = Math.min(200, bw * 1.35), bgap = 12;
  const row = bw * 2 + cbw + bgap * 2;
  return { stacked, short, card: i => ({ x: W / 2 - total / 2 + i * (cw + gap), y: cy, w: cw, h: ch }),
    reroll: { x: W / 2 - row / 2, y: ay, w: bw, h: 34 },
    confirm: { x: W / 2 - cbw / 2, y: ay, w: cbw, h: 34 },
    tree: { x: W / 2 + row / 2 - bw, y: ay, w: bw, h: 34 } };
}
// which tree node the player last tapped, so the detail panel can explain it
let treeSel = { pi: 0, ti: 0 };
// FULL TREE: paths are ROWS, tiers march LEFT→RIGHT (tier 1 … capstone). Each
// node is a tappable tile with its name + description; the selected one lights
// up, and a detail panel across the bottom spells it out in big text.
function upgradeTreeLayout() {
  const panel = { x: Math.max(8, W * 0.02), y: Math.max(8, H * 0.03),
    w: Math.min(W - 16, W * 0.96), h: Math.min(H - 16, H * 0.94) };
  const compact = W < 720;
  const pad = compact ? 8 : 14;
  const headH = 46;
  const labelW = compact ? 62 : Math.min(120, panel.w * 0.13);
  const detailH = Math.min(150, Math.max(compact ? 100 : 116, panel.h * 0.2));
  const colGap = compact ? 5 : 8, rowGap = compact ? 5 : 8;
  const gridTop = panel.y + headH;
  const gridBot = panel.y + panel.h - detailH - 8;
  const rows = PATH_KEYS.length;
  const rowH = (gridBot - gridTop - rowGap * (rows - 1)) / rows;
  const boxesX = panel.x + pad + labelW + colGap;
  const nodeW = (panel.x + panel.w - pad - boxesX - colGap * 3) / 4;
  return {
    panel, compact, labelW, nodeW, rowH,
    close: { x: panel.x + panel.w - 44, y: panel.y + 9, w: 34, h: 34 },
    detail: { x: panel.x + pad, y: panel.y + panel.h - detailH, w: panel.w - pad * 2, h: detailH - 8 },
    label: pi => ({ x: panel.x + pad, y: gridTop + pi * (rowH + rowGap), w: labelW, h: rowH }),
    node: (pi, ti) => ({ x: boxesX + ti * (nodeW + colGap), y: gridTop + pi * (rowH + rowGap), w: nodeW, h: rowH }),
  };
}
function pickUpgrade(i) {
  const c = G.upgradeChoices && G.upgradeChoices[i];
  if (!c) return;
  draftSel = null;
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
  const shownName = junkieName;
  setAnnounce(tier.icon, c.path.color,
    (capped ? '★ ' : '') + shownName + (capped ? ' ★' : ''),
    tierDesc(c.pathKey, c.tierIdx), capped ? 3 : 2.2,
    (G.mode === 'junkie' ? 'HELD ITEM EQUIPPED · ' : '') + c.path.name + ' PATH ' + pathLvl(c.pathKey) + '/4' + (capped ? ' — CAPSTONE UNLOCKED!' : ''));
  if (capped) SFX.mega();
}
// one fresh hand per draft — reroll keeps drafts from feeling dead when
// every offer misses your build
// ✦ grant a cheat item — marks the run so the best score isn't recorded
function applyCheat(i) {
  const it = CHEAT_ITEMS[i];
  if (!it) return;
  if (!G.cheated) {
    G.cheated = true;
    setAnnounce('star', '#ffd54f', '✦ CHEATS ACTIVE ✦',
      "BEST SCORE WON'T BE SAVED THIS RUN", 2.6);
  }
  if (it.k === '_shield') { G.shieldCharges = Math.min(shieldCap(), G.shieldCharges + 1); SFX.shield(); }
  else if (it.k === '_mega') { G.mega = 1; SFX.mega(); }
  else if (it.k === '_life') { G.lives++; SFX.power(); }
  else if (it.k === '_element') {
    const ts2 = Object.keys(TYPE_COLORS);
    G.ballElement = ts2[Math.floor(gameRand() * ts2.length)];
    G.ballElementT = 30; G.resistStreak = 0;
    SFX.power();
  } else applyPower(modePower(POWERS[it.k]));
  addFloater(W / 2, H * 0.3, '✦ ' + it.label + ' ✦', '#ffd54f', 15);
}

function rerollDraft() {
  G.rerolled = true;
  draftSel = null; // fresh hand, fresh inspection
  rollUpgradeChoices();
  SFX.wall();
}
function dexCloseGeom() { return { x: 14, y: 14, w: 110, h: 36 }; }
// act-boundary ceremony: a tap mid-scene jumps to the reveal; once the act
// card is up, a tap moves on to the draft
function advanceCeremony() {
  const c = G.ceremony;
  if (!c) { G.state = 'upgrade'; G.stateT = 0; return; }
  const doneAt = c.evo ? 3.4 : 2.2;
  if (c.t >= doneAt) { G.ceremony = null; G.state = 'upgrade'; G.stateT = 0; SFX.power(); }
  else if (c.evo && c.t < 1.85) c.t = 1.85;
  else if (!c.evo) c.t = doneAt;
}
function retryFromSummary() {
  if (G.daily) startDailyRun();
  else resetRun(G.runStartLevel || 1, !!G.trial);
}
function trialFromSummary() {
  trialSel.region = regionIdx(G.level); trialSel.stage = stageIdx(G.level); trialSel.round = 0;
  G.state = 'menu'; menuPage = 'setup'; trialOpen = true;
}
async function shareDailyResult() {
  const text = dailyShareText();
  try {
    if (navigator.share) await navigator.share({ title: 'Wavebreaker Daily', text });
    else if (navigator.clipboard) await navigator.clipboard.writeText(text);
    G.shareToast = 2.2;
  } catch (e) { /* cancelled share sheet: keep the summary open */ }
}
function onPress(x, y) {
  audio();
  if (G.state === 'dex') {
    if (inRect(x, y, dexCloseGeom())) { G.state = 'menu'; dexScroll = 0; }
    else if (!IS_TOUCH) { G.state = 'menu'; dexScroll = 0; } // desktop: click anywhere returns
    return;
  }
  if (G.state === 'ceremony') { advanceCeremony(); return; }
  if (G.state === 'gameover') {
    const L = gameOverLayout();
    if (G.daily && inRect(x, y, L.share)) { shareDailyResult(); return; }
    if (inRect(x, y, L.button(0))) { retryFromSummary(); return; }
    if (inRect(x, y, L.button(1))) {
      if (RUN_CKPT && !G.daily && !G.trial) resumeRun();
      else { G.state = 'menu'; menuPage = 'modes'; }
      return;
    }
    if (inRect(x, y, L.button(2))) { trialFromSummary(); return; }
    if (inRect(x, y, L.button(3))) { G.state = 'menu'; menuPage = 'modes'; return; }
    return;
  }
  if (G.state === 'upgrade') {
    if (G.upgradeChoices && G.stateT > 0.8) {
      const L = upgradeLayout();
      if (upgradeTreeOpen) {
        const T = upgradeTreeLayout();
        if (inRect(x, y, T.close) || !inRect(x, y, T.panel)) { upgradeTreeOpen = false; return; }
        // tap a node tile → select it so the detail panel explains it
        for (let pi = 0; pi < PATH_KEYS.length; pi++) {
          for (let ti = 0; ti < 4; ti++) {
            if (inRect(x, y, T.node(pi, ti))) { treeSel = { pi, ti }; SFX.wall(); return; }
          }
        }
        return;
      }
      for (let i = 0; i < G.upgradeChoices.length; i++) {
        // first tap INSPECTS (highlight + path chain shown in place); only
        // CONFIRM applies it — no accidental picks while just reading
        if (inRect(x, y, L.card(i))) {
          if (draftSel !== i) { draftSel = i; SFX.wall(); }
          return;
        }
      }
      if (draftSel != null && inRect(x, y, L.confirm)) { pickUpgrade(draftSel); return; }
      if (!G.rerolled && inRect(x, y, L.reroll)) { rerollDraft(); return; }
      if (inRect(x, y, L.tree)) { upgradeTreeOpen = true; treeSel = { pi: 0, ti: Math.min(3, pathLvl(PATH_KEYS[0])) }; SFX.wall(); return; }
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
        if (inRect(x, y, T.stage(i))) { trialSel.stage = i; trialSel.round = 0; SFX.wall(); return; }
      }
      if (T.rounds) {
        for (let i = 0; i < 3; i++) {
          if (inRect(x, y, T.round(i))) { trialSel.round = i; SFX.wall(); return; }
        }
      }
      if (inRect(x, y, T.start)) {
        trialOpen = false;
        resetRun(trialSel.region * STAGES + trialSel.stage + 1, true);
        // jump straight to a specific gauntlet round — test just the
        // legendary (round 2) or just the mythical (round 3)
        if (trialSel.stage === 2 && trialSel.round > 0 && G.gauntlet) {
          for (const b of G.bricks) if (b.subBoss) b.dead = true;
          gauntletWake();
          if (trialSel.round === 2) {
            for (const b of G.bricks) if (!b.dead && (b.isBoss || b.guard)) b.dead = true;
            gauntletSummonMythic();
          }
        }
        return;
      }
      return;
    }
    if (advOpen) {
      const A = advLayout();
      if (inRect(x, y, A.close) || !inRect(x, y, { x: A.px, y: A.py, w: A.pw, h: A.ph })) {
        advOpen = false; saveSettings(); return;
      }
      for (let i = 0; i < 2; i++) {
        if (inRect(x, y, A.tab(i))) { settingsPage = i; dragSlider = -1; SFX.wall(); return; }
      }
      const grab = IS_TOUCH ? 26 : 18;
      for (let i = 0; i < A.sliders.length; i++) {
        const gm = A.slider(i);
        if (Math.abs(y - gm.y) < grab && x > gm.x - 14 && x < gm.x + gm.w + 14) {
          dragSlider = i; setSliderFromX(i, x); return;
        }
      }
      for (let i = 0; i < A.toggles.length; i++) {
        if (inRect(x, y, A.toggle(i))) {
          SETTINGS[A.toggles[i].key] = !SETTINGS[A.toggles[i].key];
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
      // TRIAL is per-game now — opened from the mode you're setting up
      if (inRect(x, y, L.trial)) { trialOpen = true; SFX.wall(); return; }
      return;
    }
    // PAGE 1 — pick your game: three animated mode cards
    const L = menuLayout();
    if (L.resume && inRect(x, y, L.resume)) { resumeRun(); return; }
    if (inRect(x, y, L.quick)) {
      // One confident first-run path: the most legible mode, forgiving
      // difficulty, and a partner whose ability is immediately visible.
      SETTINGS.mode = 'classic';
      SETTINGS.preset = 'easy';
      SETTINGS.starter = 'fire';
      saveSettings();
      resetRun();
      return;
    }
    if (inRect(x, y, L.daily)) { startDailyRun(); return; }
    for (let i = 0; i < MODES.length; i++) {
      if (inRect(x, y, L.card(i))) {
        SETTINGS.mode = MODES[i].key; saveSettings();
        menuPage = 'setup'; SFX.power(); return;
      }
    }
    if (inRect(x, y, dexBtnGeom())) { G.state = 'dex'; dexScroll = 0; return; }
    if (inRect(x, y, L.adv)) { advOpen = true; return; }
    return;
  }
  if (paused) { // pause screen is modal: cheats, quit, else click resumes
    if (cheatOpen) {
      const C2 = cheatLayout();
      if (inRect(x, y, C2.close) || !inRect(x, y, { x: C2.px, y: C2.py, w: C2.pw, h: C2.ph })) {
        cheatOpen = false; return;
      }
      for (let i = 0; i < CHEAT_ITEMS.length; i++) {
        if (inRect(x, y, C2.chip(i))) { applyCheat(i); return; }
      }
      return;
    }
    if (inRect(x, y, cheatBtnGeom())) { cheatOpen = true; SFX.wall(); return; }
    if (inRect(x, y, pauseQuitGeom())) { cheatOpen = false; quitToMenu(); return; }
    paused = false;
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
    if (G.level === 1 && G.mode === 'classic') G.coachStep = 1;
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
  // CLASSIC has no free blaster — the ball is the weapon until tier 3 of an
  // offense path, a short LASER pickup, or Mega. Pressing fire otherwise no-ops.
  if (!blasterArmed()) return;
  if (G.overheat > 0) { if (!auto) tone(110, 0.09, 'sawtooth', 0.05, -40); return; }
  if (G.blasterCD > 0) return;
  G.blasterCD = upgN('hyper') ? 0.24 : 0.3;
  G.shotsFired++;
  G.muzzle = 0.12;
  // heat: fire freely like a shooter — a long sustained stream (~15+ shots)
  // before it overheats, and it cools fast, so the lockout is a rare "held it
  // down forever" event rather than a constant governor. Paddle returns still
  // vent it; a water partner's Torrent runs the barrel cooler still.
  const torrent = G.starter === 'water' ? 0.8 - 0.04 * (G.starterLvl - 1) : 1;
  // SPACE JUNKIE runs much cooler — you're a Pokémon using its attack, not a
  // cannon — and NEVER-MELT ICE stacks cool it further still
  const modeCool = G.mode === 'junkie' ? 0.88 : 1; // junkie runs a bit cooler, not immune
  const masteryCool = Math.pow(0.94, G.stacks.ice || 0);
  // HYPER CYCLE also runs the barrel cooler — without this, sustained fire is
  // heat-limited well below the faster cadence and the capstone adds no DPS
  const hyperCool = upgN('hyper') ? 0.85 : 1;
  G.heat = Math.min(1, G.heat + 0.12 * (1 - 0.25 * upgN('coolant')) * hyperCool * torrent * modeCool * masteryCool);
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
      powerMul: nBolts > 1 ? 0.6 : 1,
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
  G.chargedEver = true; // the charge tutor banner retires once you've done it
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
  // the big shot dumps a decent slug of heat — a full charge is ~0.6 of the
  // bar, so leaning on the charge (or chaining them) really can overheat you
  const heatMods = (1 - 0.25 * upgN('coolant')) * Math.pow(0.94, G.stacks.ice || 0);
  G.heat = Math.min(1, G.heat + (0.30 + 0.30 * c) * heatMods);
  if (G.heat >= 1) {
    G.overheat = OVERHEAT_DUR;
    addFloater(G.paddle.x, shipY() - 44, 'OVERHEATED!', '#ff7043', 15);
    noiseBurst(0.3, 0.09);
  }
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
  if (G.state === 'gameover') { retryFromSummary(); return; }
  if (G.state === 'ceremony') { advanceCeremony(); return; }
  if (G.state === 'upgrade') return;
  fireAction();
}
function tryMega() {
  if (G.state !== 'play' || G.megaT > 0 || G.mega < 1) return;
  G.megaT = megaDur(); G.mega = 0;
  G.shake = 14;
  haptic('boss');
  SFX.mega();
  setAnnounce('mega', '#ffd54f', 'MEGA EVOLUTION!', 'PIERCING BALLS · AUTO-LASERS', 2.5);
}
