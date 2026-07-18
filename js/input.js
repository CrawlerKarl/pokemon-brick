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
  // side/top safe-area insets keep every control clear of notches and
  // rounded landscape corners, matching the existing bottom treatment
  const edge = n => left ? n + SAFE_L : W - n - SAFE_R;
  const b = {
    mega:  { x: edge(138), y: base - 40, r: 30 * scale }, // beside FIRE — paddle rides above both
    pause: { x: edge(28), y: 86 + SAFE_T, r: 22 * scale }, // ≥44 px visible targets
    sound: { x: edge(74), y: 84 + SAFE_T, r: 20 * scale },
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
    else if (cheatOpen) cheatOpen = false;
    else if (G.state === 'menu' && menuPage === 'setup') {
      if (setupStep === 'difficulty') setupStep = 'pilot';
      else menuPage = 'modes';
    }
    else if (paused) quitToMenu(); // paused + Esc = leave the run
    else togglePause();
  }
  // 1/2/3 pick, R rerolls, T opens the complete tree between waves
  if (e.code === 'KeyT' && G.state === 'upgrade' && G.upgradeChoices && !G.secret.rewardDraft && G.stateT > 0.8) {
    upgradeTreeOpen = !upgradeTreeOpen;
    if (upgradeTreeOpen) syncTreeSelectionToDraft();
    SFX.wall();
  }
  if (G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8 && /^Digit[123]$/.test(e.code)) {
    // digits SELECT (inspect); Enter / the same digit again confirms
    const i = +e.code.slice(5) - 1;
    if (G.upgradeChoices[i]) {
      if (draftSel === i) pickUpgrade(i);
      else selectDraftChoice(i);
    }
  }
  if (G.state === 'upgrade' && G.upgradeChoices && G.stateT > 0.8 &&
      (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && draftSel != null) {
    pickUpgrade(draftSel);
  }
  if (e.code === 'KeyR' && G.state === 'upgrade' && G.upgradeChoices &&
      !G.secret.rewardDraft && !G.rerolled && G.stateT > 0.8) {
    rerollDraft();
  }
  if (upgradeTreeOpen && G.state === 'upgrade' && G.stateT > 0.8 &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
    if (e.code === 'ArrowLeft') treeSel.ti = Math.max(0, treeSel.ti - 1);
    if (e.code === 'ArrowRight') treeSel.ti = Math.min(3, treeSel.ti + 1);
    if (e.code === 'ArrowUp') treeSel.pi = (treeSel.pi + PATH_KEYS.length - 1) % PATH_KEYS.length;
    if (e.code === 'ArrowDown') treeSel.pi = (treeSel.pi + 1) % PATH_KEYS.length;
    const offer = choiceIndexForTreeNode(treeSel.pi, treeSel.ti);
    if (offer >= 0) draftSel = offer;
    SFX.wall();
    e.preventDefault();
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
function togglePause() {
  if (paused && (advOpen || cheatOpen)) {
    advOpen = false; cheatOpen = false; saveSettings();
    return;
  }
  if (G.state === 'play' || G.state === 'serve') paused = !paused;
}
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
function handleAdvancedPress(x, y) {
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
}
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
function choiceIndexForTreeNode(pi, ti) {
  const pk = PATH_KEYS[pi];
  return (G.upgradeChoices || []).findIndex(c => c.pathKey === pk && c.tierIdx === ti);
}
function selectDraftChoice(i) {
  const c = G.upgradeChoices && G.upgradeChoices[i];
  if (!c) return;
  draftSel = i;
  if (c.pathKey) treeSel = { pi: Math.max(0, PATH_KEYS.indexOf(c.pathKey)), ti: c.tierIdx };
  SFX.wall();
}
function syncTreeSelectionToDraft() {
  if (draftSel != null && G.upgradeChoices?.[draftSel]?.pathKey) {
    const c = G.upgradeChoices[draftSel];
    treeSel = { pi: Math.max(0, PATH_KEYS.indexOf(c.pathKey)), ti: c.tierIdx };
    return;
  }
  const first = (G.upgradeChoices || []).find(c => c.pathKey);
  if (first) treeSel = { pi: Math.max(0, PATH_KEYS.indexOf(first.pathKey)), ti: first.tierIdx };
  else treeSel = { pi: 0, ti: Math.min(3, pathLvl(PATH_KEYS[0])) };
}
// FULL TREE: the same 24 authored upgrades are arranged as a six-spoke
// constellation. The current implementation stays balance/save compatible;
// this geometry is presentation-only until the branching graph ships.
function upgradeTreeLayout() {
  const panel = { x: Math.max(8 + SAFE_L, W * 0.02), y: Math.max(8 + SAFE_T, H * 0.025),
    w: Math.min(W - 16 - SAFE_L - SAFE_R, W * 0.96), h: Math.min(H - 16 - SAFE_T - SAFE_B, H * 0.95) };
  const compact = W < 720 || H < 520;
  const pad = compact ? 10 : 16, headH = compact ? 54 : 64;
  const sideDetail = panel.w >= 700 && panel.w > panel.h * 1.12;
  const detailSize = sideDetail
    ? Math.min(350, Math.max(270, panel.w * 0.28))
    : Math.min(190, Math.max(150, panel.h * 0.23));
  const map = sideDetail
    ? { x: panel.x + pad, y: panel.y + headH, w: panel.w - detailSize - pad * 3, h: panel.h - headH - pad }
    : { x: panel.x + pad, y: panel.y + headH, w: panel.w - pad * 2, h: panel.h - headH - detailSize - pad * 2 };
  const detail = sideDetail
    ? { x: panel.x + panel.w - detailSize - pad, y: panel.y + headH, w: detailSize, h: panel.h - headH - pad }
    : { x: panel.x + pad, y: panel.y + panel.h - detailSize - pad, w: panel.w - pad * 2, h: detailSize };
  const radius = Math.max(74, Math.min(map.w * 0.39, map.h * 0.43) - (compact ? 2 : 10));
  // when the map is WIDTH-limited (tall portrait), the box is far taller than
  // the constellation — reclaim the dead band: the detail panel grows a
  // little and the map re-centers on what it actually uses
  if (!sideDetail) {
    const need = radius * 2 + (compact ? 108 : 156);
    const spare = Math.max(0, map.h - need);
    if (spare > 0) {
      const extraDetail = Math.min(spare, 84);
      map.h = need + (spare - extraDetail);
      detail.y -= extraDetail; detail.h += extraDetail;
    }
  }
  const cx = map.x + map.w / 2, cy = map.y + map.h / 2 + (sideDetail ? 4 : 0);
  // the inner ring must clear the pilot preview (sprite + aura + hardpoint
  // rack) — ring-one nodes were landing ON the pilot at landscape sizes
  const inner = Math.max(46, radius * 0.32);
  const step = (radius - inner) / 3;
  const drawR = Math.max(8, Math.min(compact ? 12 : 17, step * 0.34));
  const hitR = Math.max(drawR + 5, Math.min(22, step * 0.53));
  const buttonH = compact ? 32 : 38;
  const buttonY = detail.y + detail.h - buttonH - 10;
  const buttonGap = 8;
  const buttonW = (detail.w - 20 - buttonGap) / 2;
  return {
    panel, compact, sideDetail, map, detail, center: { x: cx, y: cy }, radius, inner, step, drawR,
    close: { x: panel.x + panel.w - 44, y: panel.y + 9, w: 34, h: 34 },
    reroll: { x: detail.x + 10, y: buttonY, w: buttonW, h: buttonH },
    confirm: { x: detail.x + detail.w - 10 - buttonW, y: buttonY, w: buttonW, h: buttonH },
    label: pi => {
      const a = -Math.PI / 2 + pi * Math.PI / 3;
      // tighter on compact maps so the top/bottom labels stay inside the box
      const lr = radius + (compact ? 15 : 42);
      return { x: cx + Math.cos(a) * lr, y: cy + Math.sin(a) * lr, a };
    },
    node: (pi, ti) => {
      const a = -Math.PI / 2 + pi * Math.PI / 3;
      const rr = inner + ti * step;
      const nx = cx + Math.cos(a) * rr, ny = cy + Math.sin(a) * rr;
      return { x: nx - hitR, y: ny - hitR, w: hitR * 2, h: hitR * 2, cx: nx, cy: ny, r: drawR, hitR, a };
    },
  };
}
function applySecretUpgrade(secret) {
  if (!secret || G.secretUpg[secret.key]) return;
  G.secretUpg[secret.key] = true;
  if (secret.key === 'heart') {
    G.livesMax = Math.max(G.livesMax || G.lives, G.lives) + 1;
    G.lives = G.livesMax;
    G.mega = 1;
  }
}
function queueSecretRewardNotice() {
  const reward = G.secret.lastReward;
  if (!reward) return;
  setAnnounce(reward.icon, reward.color, reward.name + ' EQUIPPED',
    reward.desc, 3, 'SECRET UPGRADE · ONLY FOUND BEYOND THE KANTO RIFT');
  G.secret.lastReward = null;
}
function beginUpgradeInstallFx(icon, color, name, pathKey = null, tierIdx = 0) {
  G.upgradeFx = { icon, color, name, pathKey, tierIdx, t: 2.4, max: 2.4 };
}
function pickUpgrade(i) {
  const c = G.upgradeChoices && G.upgradeChoices[i];
  if (!c) return;
  draftSel = null;
  if (c.secret) {
    applySecretUpgrade(c.secret);
    beginUpgradeInstallFx(c.secret.icon, c.secret.color, c.secret.name, 'secret', 3);
    G.secret.lastReward = c.secret;
    G.secret.rewardDraft = false;
    G.secret.vmax = false;
    G.upgradeChoices = G.secret.deferredChoices;
    G.secret.deferredChoices = null;
    upgradeTreeOpen = G.mode === 'junkie' && !!G.upgradeChoices && G.upgradeChoices.every(x => x.pathKey);
    if (upgradeTreeOpen) syncTreeSelectionToDraft();
    G.stateT = 0;
    G.rerolled = false;
    SFX.mega();
    if (!G.upgradeChoices) {
      buildLevel(G.level);
      serve();
      queueSecretRewardNotice();
    }
    return;
  }
  // late-run mastery STACK pick (literal held item in SPACE JUNKIE)
  if (c.stack) {
    G.stacks[c.stack.key] = (G.stacks[c.stack.key] || 0) + 1;
    beginUpgradeInstallFx(c.stack.icon, c.stack.color, c.stack.name, 'mastery', Math.min(3, G.stacks[c.stack.key] - 1));
    G.upgradeChoices = null;
    upgradeTreeOpen = false;
    SFX.power();
    buildLevel(G.level);
    serve();
    setAnnounce(c.stack.icon, c.stack.color,
      c.stack.name + ' ×' + G.stacks[c.stack.key],
      c.stack.desc, 2.4, G.mode === 'junkie' ? 'HELD ITEM STACKED — CHECK YOUR PILOT' : 'MASTERY STACKED — CHECK YOUR BUILD RAIL');
    queueSecretRewardNotice();
    return;
  }
  const junkieName = junkieTierName(c.pathKey, c.tierIdx);
  const tier = advancePath(c.pathKey);
  beginUpgradeInstallFx(tier.icon, c.path.color, junkieName, c.pathKey, c.tierIdx);
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
  queueSecretRewardNotice();
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
  if (upgradeTreeOpen) syncTreeSelectionToDraft();
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
  G.state = 'menu'; menuPage = 'setup'; setupStep = 'difficulty'; trialOpen = true;
}
function startTrialSelection() {
  trialOpen = false;
  resetRun(trialSel.region * STAGES + trialSel.stage + 1, true);
  // Legendary-stage trials can skip directly to any finale tier. Kanto's
  // fourth STARFIGHTER tile forces the Rift encounter without changing the
  // player's persistent key or rewards.
  if (trialSel.stage === 2 && trialSel.round > 0 && G.gauntlet) {
    for (const b of G.bricks) if (b.subBoss) b.dead = true;
    gauntletWake();
    if (trialSel.round >= 2) {
      for (const b of G.bricks) if (!b.dead && (b.isBoss || b.guard)) b.dead = true;
      gauntletSummonMythic(trialSel.round === 3);
    }
  }
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
  if (G.state === 'ending') {
    const E = G.ending;
    if (!E) { G.state = 'menu'; menuPage = 'modes'; return; }
    if (E.done) { // the two explicit choices on the final beat
      const B = endingButtons();
      if (inRect(x, y, B.spiral)) { beginTimeSpiral(); SFX.power(); return; }
      if (inRect(x, y, B.title)) { G.ending = null; G.state = 'menu'; menuPage = 'modes'; SFX.wall(); return; }
      return;
    }
    if (E.t < 1.2) return; // beat one's silence cannot be skipped into by accident
    // a tap advances one beat; a returning champion skips straight to dawn
    if (E.seenBefore) { E.beat = 5; E.t = Math.max(E.t, ENDING_BEATS[3] + 0.01); return; }
    if (E.beat < 5) { E.t = ENDING_BEATS[E.beat - 1]; E.beat++; }
    return;
  }
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
        if (draftSel != null && inRect(x, y, T.confirm)) { pickUpgrade(draftSel); return; }
        if (!G.secret.rewardDraft && !G.rerolled && inRect(x, y, T.reroll)) { rerollDraft(); return; }
        // Tap a node to inspect it. Offered nodes also become the active pick,
        // but still require the dedicated INSTALL action below the details.
        for (let pi = 0; pi < PATH_KEYS.length; pi++) {
          for (let ti = 0; ti < 4; ti++) {
            if (inRect(x, y, T.node(pi, ti))) {
              treeSel = { pi, ti };
              const offer = choiceIndexForTreeNode(pi, ti);
              if (offer >= 0) draftSel = offer;
              SFX.wall();
              return;
            }
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
      if (!G.secret.rewardDraft && !G.rerolled && inRect(x, y, L.reroll)) { rerollDraft(); return; }
      if (!G.secret.rewardDraft && inRect(x, y, L.tree)) { upgradeTreeOpen = true; treeSel = { pi: 0, ti: Math.min(3, pathLvl(PATH_KEYS[0])) }; SFX.wall(); return; }
    }
    return;
  }
  // Settings is the same modal whether it was opened from the title or from
  // pause. Slider taps must never leak through into steering or firing.
  if (advOpen && (G.state === 'menu' || paused)) {
    handleAdvancedPress(x, y);
    return;
  }
  if (G.state === 'menu') {
    if (trialOpen) {
      const T = trialLayout();
      if (inRect(x, y, T.close) || !inRect(x, y, { x: T.px, y: T.py, w: T.pw, h: T.ph })) {
        trialOpen = false; return;
      }
      for (let i = 0; i < GENS.length; i++) {
        if (inRect(x, y, T.region(i))) {
          trialSel.region = i;
          if (i !== 0 && trialSel.round === 3) trialSel.round = 2;
          SFX.wall(); return;
        }
      }
      for (let i = 0; i < STAGES; i++) {
        if (inRect(x, y, T.stage(i))) { trialSel.stage = i; trialSel.round = 0; SFX.wall(); return; }
      }
      if (T.rounds) {
        for (let i = 0; i < T.roundCount; i++) {
          if (inRect(x, y, T.round(i))) { trialSel.round = i; SFX.wall(); return; }
        }
      }
      if (inRect(x, y, T.start)) {
        startTrialSelection();
        return;
      }
      return;
    }
    // PAGE 2 — two clear decisions: all partners first, then challenge.
    if (menuPage === 'setup') {
      const L = setupLayout();
      if (inRect(x, y, L.back)) {
        if (setupStep === 'difficulty') setupStep = 'pilot';
        else menuPage = 'modes';
        SFX.wall(); return;
      }
      if (setupStep === 'pilot') {
        for (let i = 0; i < STARTERS.length; i++) {
          if (inRect(x, y, L.starter(i))) { SETTINGS.starter = STARTERS[i].key; saveSettings(); SFX.wall(); return; }
        }
        if (inRect(x, y, L.none)) { SETTINGS.starter = 'none'; saveSettings(); SFX.wall(); return; }
        if (inRect(x, y, L.next)) { setupStep = 'difficulty'; SFX.power(); return; }
      } else {
        if (inRect(x, y, L.editPilot)) { setupStep = 'pilot'; SFX.wall(); return; }
        const keys = Object.keys(PRESETS);
        for (let i = 0; i < keys.length; i++) {
          if (inRect(x, y, presetGeom(i))) { SETTINGS.preset = keys[i]; saveSettings(); SFX.wall(); return; }
        }
        if (inRect(x, y, startBtnGeom())) { resetRun(); return; }
        if (inRect(x, y, L.trial)) { trialOpen = true; SFX.wall(); return; }
      }
      return;
    }
    // PAGE 1 — pick your game: three animated mode cards
    const L = menuLayout();
    if (L.resume && inRect(x, y, L.resume)) { resumeRun(); return; }
    if (inRect(x, y, L.quick)) {
      SETTINGS.mode = 'junkie';
      saveSettings();
      setupStep = 'pilot'; menuPage = 'setup'; SFX.power();
      return;
    }
    if (inRect(x, y, L.daily)) { startDailyRun(); return; }
    for (let i = 0; i < MODES.length; i++) {
      if (inRect(x, y, L.card(i))) {
        SETTINGS.mode = MODES[i].key; saveSettings();
        setupStep = 'pilot'; menuPage = 'setup'; SFX.power(); return;
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
    if (inRect(x, y, pauseSettingsGeom())) {
      cheatOpen = false;
      // A phone player arriving from pause most likely needs pad size,
      // handedness, or follow speed; open directly on the useful tab.
      settingsPage = IS_TOUCH ? 1 : settingsPage;
      advOpen = true; SFX.wall(); return;
    }
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
  G.blasterCD = (upgN('hyper') ? 0.24 : 0.3) * starterMod('fireRate', 1);
  G.shotsFired++;
  G.muzzle = 0.12;
  // heat: fire freely like a shooter — a long sustained stream (~15+ shots)
  // before it overheats, and it cools fast, so the lockout is a rare "held it
  // down forever" event rather than a constant governor. Paddle returns still
  // vent it; a water partner's Torrent runs the barrel cooler still.
  const torrent = starterMod('heat', 1);
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
      tier: pil ? G.starterLvl : 1, // the attack itself grows as the partner evolves
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
    tier: pil ? G.starterLvl : 1,
  });
  // the big shot dumps a decent slug of heat — a full charge is ~0.6 of the
  // bar, so leaning on the charge (or chaining them) really can overheat you
  const heatMods = (1 - 0.25 * upgN('coolant')) * Math.pow(0.94, G.stacks.ice || 0) * starterMod('heat', 1);
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
      if (menuPage === 'setup') {
        if (setupStep === 'pilot') setupStep = 'difficulty';
        else resetRun();
      } else {
        SETTINGS.mode = 'junkie'; saveSettings();
        setupStep = 'pilot'; menuPage = 'setup';
      }
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
