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
  if (treeDrag && treeDrag.id === 'mouse') {
    if (!upgradeTreeOpen || G.state !== 'upgrade') { treeDrag = null; return; }
    const dx = e.clientX - treeDrag.x, dy = e.clientY - treeDrag.y;
    if (treeDrag.moved || Math.hypot(dx, dy) >= 7) {
      treeDrag.moved = true;
      treePan.x = treeDrag.sx + dx;
      treePan.y = treeDrag.sy + dy;
    }
  }
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
  if (G.state === 'upgrade' && upgradeTreeOpen) {
    const T = upgradeTreeLayout();
    if (inRect(e.clientX, e.clientY, T.map)) {
      treeDrag = { x: e.clientX, y: e.clientY, sx: treePan.x, sy: treePan.y, id: 'mouse', moved: false };
      return;
    }
  }
  fireHeld = true;
  onPress(e.clientX, e.clientY);
  if (treeDrag && treeDrag.id == null) treeDrag.id = 'mouse';
});
window.addEventListener('mouseup', e => {
  if (e.button === 2) { chargeHeld = false; return; }
  fireHeld = false;
  if (treeDrag && treeDrag.id === 'mouse') {
    const tap = !treeDrag.moved, tx = treeDrag.x, ty = treeDrag.y;
    treeDrag = null;
    if (tap) onPress(tx, ty);
  }
});
// right-click charges instead of opening the context menu during play
window.addEventListener('contextmenu', e => {
  if (G.state === 'play' || G.state === 'serve') e.preventDefault();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') chargeHeld = false;
});
window.addEventListener('wheel', e => {
  if (G.state === 'upgrade' && upgradeTreeOpen) {
    const T = upgradeTreeLayout();
    if (inRect(e.clientX, e.clientY, T.map)) {
      setTreeZoomAt(e.clientX, e.clientY, treeZoom * Math.exp(-e.deltaY * 0.0015));
      e.preventDefault();
      return;
    }
  }
  if (G.state === 'dex') dexScroll = Math.max(0, dexScroll + e.deltaY);
}, { passive: false });

window.addEventListener('touchstart', e => {
  audio();
  lastTouchT = performance.now();
  for (const t of e.changedTouches) {
    const x = t.clientX, y = t.clientY;
    if (G.state === 'upgrade' && upgradeTreeOpen) {
      const T = upgradeTreeLayout();
      if (inRect(x, y, T.map)) {
        treeTouches.set(t.identifier, { x, y, startX: x, startY: y });
        if (treeTouches.size === 1) {
          treeDrag = { x, y, sx: treePan.x, sy: treePan.y, id: t.identifier, moved: false };
        } else {
          const pts = Array.from(treeTouches.entries()).slice(0, 2);
          const a = pts[0][1], b = pts[1][1];
          const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
          const mx = T.map.x + T.map.w / 2, my = T.map.y + T.map.h / 2 + (T.sideDetail ? 4 : 0);
          treePinch = { ids: [pts[0][0], pts[1][0]], dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
            zoom: treeZoom, worldX: (midX - (mx + treePan.x)) / treeZoom,
            worldY: (midY - (my + treePan.y)) / treeZoom };
          treeDrag = null;
        }
        e.preventDefault();
        continue;
      }
    }
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
      // a constellation drag begun by this touch belongs to this touch
      if (treeDrag && treeDrag.id == null) treeDrag.id = t.identifier;
    }
  }
}, { passive: false });
let onPressDexTapPending = null;
window.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    const p = treeTouches.get(t.identifier);
    if (p) { p.x = t.clientX; p.y = t.clientY; }
  }
  if (treePinch && upgradeTreeOpen && G.state === 'upgrade') {
    const a = treeTouches.get(treePinch.ids[0]), b = treeTouches.get(treePinch.ids[1]);
    if (a && b) {
      const T = upgradeTreeLayout();
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      treeZoom = Math.max(0.65, Math.min(1.85,
        treePinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / treePinch.dist));
      const mx = T.map.x + T.map.w / 2, my = T.map.y + T.map.h / 2 + (T.sideDetail ? 4 : 0);
      treePan.x = midX - mx - treePinch.worldX * treeZoom;
      treePan.y = midY - my - treePinch.worldY * treeZoom;
      upgradeTreeLayout();
      e.preventDefault();
      return;
    }
  }
  for (const t of e.changedTouches) {
    if (uiTouchIds.has(t.identifier)) { claimUiTouch(t.identifier); continue; } // button touches never steer
    if (treeDrag && t.identifier === treeDrag.id) { // pan the constellation
      if (!upgradeTreeOpen || G.state !== 'upgrade') { treeDrag = null; continue; }
      const dx = t.clientX - treeDrag.x, dy = t.clientY - treeDrag.y;
      if (treeDrag.moved || Math.hypot(dx, dy) >= 7) {
        treeDrag.moved = true;
        treePan.x = treeDrag.sx + dx;
        treePan.y = treeDrag.sy + dy;
      }
      continue;
    }
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
  let endedPinch = false;
  for (const t of e.changedTouches) {
    if (treeTouches.has(t.identifier)) {
      treeTouches.delete(t.identifier);
      if (treePinch && treePinch.ids.includes(t.identifier)) { treePinch = null; endedPinch = true; }
      else if (treeDrag && t.identifier === treeDrag.id) {
        const tap = !treeDrag.moved, tx = treeDrag.x, ty = treeDrag.y;
        treeDrag = null;
        if (tap) onPress(tx, ty);
      }
      continue;
    }
    if (uiTouchIds.has(t.identifier)) claimUiTouch(t.identifier);
    uiTouchIds.delete(t.identifier);
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (t.identifier === fireTouchId) { fireTouchId = null; fireHeld = false; }
    if (t.identifier === chargeTouchId) { chargeTouchId = null; chargeHeld = false; }
    // Releasing before the hold threshold is a normal tap. Once promoted to a
    // charge, release is handled above and update() fires the built-up shot.
    if (t.identifier === touchFirePendingId) { touchFirePendingId = null; fireAction(); }
    if (treeDrag && t.identifier === treeDrag.id) treeDrag = null;
    if (G.state === 'dex' && onPressDexTapPending && Math.abs(t.clientY - dexDragStart) < 10) {
      onPress(onPressDexTapPending.x, onPressDexTapPending.y);
    }
  }
  if (endedPinch && treeTouches.size === 1) {
    const entry = Array.from(treeTouches.entries())[0];
    treeDrag = { x: entry[1].x, y: entry[1].y, sx: treePan.x, sy: treePan.y,
      id: entry[0], moved: true };
  }
  onPressDexTapPending = null; dexDragY = null;
  if (dragSlider >= 0) { dragSlider = -1; saveSettings(); }
});
// a system gesture can cancel touches without a touchend — release everything
// so autofire and paddle control can't get stuck
window.addEventListener('touchcancel', e => {
  lastTouchT = performance.now();
  let cancelledTreePinch = false;
  for (const t of e.changedTouches) {
    treeTouches.delete(t.identifier);
    if (treePinch && treePinch.ids.includes(t.identifier)) cancelledTreePinch = true;
    if (uiTouchIds.has(t.identifier)) claimUiTouch(t.identifier);
    uiTouchIds.delete(t.identifier);
    if (treeDrag && t.identifier === treeDrag.id) treeDrag = null;
    if (t.identifier === paddleTouchId) paddleTouchId = null;
    if (t.identifier === fireTouchId) { fireTouchId = null; fireHeld = false; }
    if (t.identifier === chargeTouchId) {
      chargeTouchId = null; chargeHeld = false;
      G.charge = 0; // a system-cancel is not a deliberate charged-shot release
    }
    if (t.identifier === touchFirePendingId) touchFirePendingId = null; // cancelled, no shot
  }
  if (cancelledTreePinch) treePinch = null;
  if (treeTouches.size === 0) { treeDrag = null; treePinch = null; }
  else if (!treePinch && treeTouches.size === 1) {
    const entry = Array.from(treeTouches.entries())[0];
    treeDrag = { x: entry[1].x, y: entry[1].y, sx: treePan.x, sy: treePan.y,
      id: entry[0], moved: true };
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
    else if (G.state === 'results') advanceResults();
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
  if (G.state === 'results' && (e.code === 'Enter' || e.code === 'NumpadEnter')) advanceResults();
  if (e.code === 'KeyR' && G.state === 'upgrade' && G.upgradeChoices &&
      !G.secret.rewardDraft && !G.rerolled && G.stateT > 0.8) {
    rerollDraft();
  }
  if (upgradeTreeOpen && G.state === 'upgrade' && G.stateT > 0.8 &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
    // ←/→ walk the RADIAL STACK at the cursor's angle (core → capstone →
    // satellite/fusion/apex); ↑/↓ rotate through all 12 half-positions
    // (spoke axes and wedge boundaries alternate) at a similar depth.
    let half = treeSelHalf(treeSel);
    let stack = treeStackAt(half);
    let depth = stack.findIndex(s => sameTreeSel(s, treeSel));
    if (depth < 0) depth = 0;
    if (e.code === 'ArrowLeft') depth = Math.max(0, depth - 1);
    else if (e.code === 'ArrowRight') depth = Math.min(stack.length - 1, depth + 1);
    else {
      const dir = e.code === 'ArrowDown' ? 1 : -1;
      for (let hop = 0; hop < 12; hop++) {
        half = ((half + dir) % 12 + 12) % 12;
        const next = treeStackAt(half);
        if (next.length) { stack = next; break; }
      }
      depth = Math.min(depth, stack.length - 1);
    }
    treeSel = stack[depth];
    const offer = choiceIndexForSel(treeSel);
    if (offer >= 0) draftSel = offer;
    ensureTreeSelVisible(); // the camera follows the keyboard cursor
    SFX.wall();
    e.preventDefault();
  }
  // ↑↑↓↓←→←→BA — some legends never die
  konamiIdx = e.code === KONAMI[konamiIdx] ? konamiIdx + 1 : (e.code === KONAMI[0] ? 1 : 0);
  if (konamiIdx === KONAMI.length) {
    konamiIdx = 0;
    // [POKEMON-EGG-START] — stripped from the AETHERFALL distribution
    if (SKIN.id === 'pokemon') { // Mew is pokemon-skin lore
      audio();
      addToDex(151, true);
      getSprite(151, true);
      if (G.state === 'play' || G.state === 'serve') G.mega = 1;
      SFX.mega();
      setAnnounce('fairy', '#ec407a', 'MEW APPEARED!', 'SHINY MEW REGISTERED TO POKÉDEX · MEGA CHARGED', 3);
    }
    // [POKEMON-EGG-END]
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
  SESSION_STATS.quits++;
  if (!G.trial && !G.cheated && G.score > G.best) { G.best = G.score; saveStore(storeKey('best'), G.best); }
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
// which tree node the player last tapped, so the detail panel can explain it.
// kind: 'tier' (pi,ti) · 'bridge' (bi) · 'fusion' (fi) · 'apex' (ai) · 'sat' (si)
let treeSel = { kind: 'tier', pi: 0, ti: 0 };
// ---- shared angular addressing: the chart is 12 half-positions (even = a
// spoke AXIS, odd = a wedge BOUNDARY). Layout, hit-testing and keyboard nav
// all derive angles from these, so they can never drift apart.
function bridgeHalfPos(b) {
  const s0 = WEB_SPOKE_ORDER.indexOf(b.paths[0]), s1 = WEB_SPOKE_ORDER.indexOf(b.paths[1]);
  return Math.abs(s0 - s1) === 1 ? s0 + s1 : 11; // the 5↔0 wrap boundary
}
const FUSION_OPPOSITE_SLOTS = { hypernova: 3, lance: 5, chorus: 7 }; // authored halves
function fusionHalfPos(f) {
  if (f.bridge) return bridgeHalfPos(f);
  const s0 = WEB_SPOKE_ORDER.indexOf(f.paths[0]), s1 = WEB_SPOKE_ORDER.indexOf(f.paths[1]);
  const d = Math.abs(s0 - s1);
  if (d === 2) return s0 + s1;              // the axis of the spoke between them
  if (d === 4) return (s0 + s1 + 6) % 12;   // same, across the wrap
  return FUSION_OPPOSITE_SLOTS[f.key] ?? 1; // opposite wedges: authored boundary
}
function treeSelHalf(sel) {
  const kind = sel.kind || 'tier';
  if (kind === 'bridge') return bridgeHalfPos(WEB_BRIDGES[sel.bi]);
  if (kind === 'fusion') return fusionHalfPos(WEB_FUSIONS[sel.fi]);
  if (kind === 'apex') return WEB_APEXES[sel.ai].mapSlot * 2;
  return WEB_SPOKE_ORDER.indexOf(PATH_KEYS[sel.pi]) * 2;
}
// the radial stack living at one half-position, ordered core → rim
function treeStackAt(half) {
  const list = [];
  if (half % 2 === 0) {
    const pi = Math.max(0, PATH_KEYS.indexOf(WEB_SPOKE_ORDER[half / 2]));
    for (let ti = 0; ti < 4; ti++) list.push({ kind: 'tier', pi, ti });
    const si = activeSatellites().findIndex(s => s.path === PATH_KEYS[pi]);
    if (si >= 0) list.push({ kind: 'sat', si, pi, ti: 3 });
    const fi = WEB_FUSIONS.findIndex(f => !f.bridge && fusionHalfPos(f) === half);
    if (fi >= 0) list.push({ kind: 'fusion', fi, pi, ti: 3 });
  } else {
    const bi = WEB_BRIDGES.findIndex(b => bridgeHalfPos(b) === half);
    if (bi >= 0) list.push({ kind: 'bridge', bi, pi: 0, ti: 0 });
    const afi = WEB_FUSIONS.findIndex(f => f.bridge && fusionHalfPos(f) === half);
    if (afi >= 0) list.push({ kind: 'fusion', fi: afi, pi: 0, ti: 3 });
    const dfi = WEB_FUSIONS.findIndex(f => !f.bridge && fusionHalfPos(f) === half);
    if (dfi >= 0) list.push({ kind: 'fusion', fi: dfi, pi: 0, ti: 3 });
    const ai = WEB_APEXES.findIndex(x => x.mapSlot * 2 === half);
    if (ai >= 0) list.push({ kind: 'apex', ai, pi: 0, ti: 3 });
  }
  return list;
}
function sameTreeSel(a, b) {
  if ((a.kind || 'tier') !== (b.kind || 'tier')) return false;
  const k = a.kind || 'tier';
  if (k === 'tier') return a.pi === b.pi && a.ti === b.ti;
  if (k === 'bridge') return a.bi === b.bi;
  if (k === 'fusion') return a.fi === b.fi;
  if (k === 'apex') return a.ai === b.ai;
  return a.si === b.si;
}
// The constellation is a proper camera: it starts close enough to read, pans
// from any point, pinches around the gesture midpoint, and can still zoom out
// to the complete 50-node atlas. treeZoom intentionally survives while the
// current run is alive; resetRun calls resetTreeCamera for a fresh journey.
let treePan = { x: 0, y: 0 }, treeZoom = 1.2, treeDrag = null, treePinch = null;
const treeTouches = new Map();
function defaultTreeZoom() { return (W < 720 || H < 520) ? 1.3 : 1.15; }
function resetTreeCamera() {
  treePan.x = 0; treePan.y = 0; treeZoom = defaultTreeZoom();
  treeDrag = null; treePinch = null; treeTouches.clear();
}
function setTreeZoomAt(x, y, next) {
  const old = treeZoom;
  next = Math.max(0.65, Math.min(1.85, next));
  if (Math.abs(next - old) < 0.001) return;
  const T = upgradeTreeLayout();
  const mx = T.map.x + T.map.w / 2, my = T.map.y + T.map.h / 2 + (T.sideDetail ? 4 : 0);
  const ratio = next / old;
  treePan.x = x - mx - (x - (mx + treePan.x)) * ratio;
  treePan.y = y - my - (y - (my + treePan.y)) * ratio;
  treeZoom = next;
  upgradeTreeLayout(); // clamp against the new content extent
}
function treeSelNodeRect(T) {
  const kind = treeSel.kind || 'tier';
  if (kind === 'bridge') return T.bridgeNode(treeSel.bi);
  if (kind === 'fusion') return T.fusionNode(treeSel.fi);
  if (kind === 'apex') return T.apexNode(treeSel.ai);
  if (kind === 'sat') return T.satNode(treeSel.si);
  return T.node(treeSel.pi, treeSel.ti);
}
// pan the camera just enough that the current selection sits inside the map
// box — keyboard nav and offer-sync always land on-screen
function ensureTreeSelVisible() {
  const T = upgradeTreeLayout();
  if (!T.panLim.x && !T.panLim.y) return;
  const n = treeSelNodeRect(T);
  const mcx = T.map.x + T.map.w / 2, mcy = T.map.y + T.map.h / 2;
  const mx = Math.max(40, T.map.w / 2 - 52), my = Math.max(40, T.map.h / 2 - 52);
  if (n.cx < mcx - mx) treePan.x += (mcx - mx) - n.cx;
  else if (n.cx > mcx + mx) treePan.x += (mcx + mx) - n.cx;
  if (n.cy < mcy - my) treePan.y += (mcy - my) - n.cy;
  else if (n.cy > mcy + my) treePan.y += (mcy + my) - n.cy;
}
// the draft-offer index for ANY web node (or -1) — render + input share this
function choiceIndexForTreeNode(pi, ti) {
  const pk = PATH_KEYS[pi];
  return (G.upgradeChoices || []).findIndex(c => c.pathKey === pk && c.tierIdx === ti);
}
function choiceIndexForSel(sel) {
  const cs = G.upgradeChoices || [];
  if (!sel || sel.kind === 'tier' || sel.kind == null) return choiceIndexForTreeNode(sel.pi, sel.ti);
  if (sel.kind === 'bridge') return cs.findIndex(c => c.web && c.web.key === WEB_BRIDGES[sel.bi].key);
  if (sel.kind === 'fusion') return cs.findIndex(c => c.web && c.web.key === WEB_FUSIONS[sel.fi].key);
  if (sel.kind === 'apex') return cs.findIndex(c => c.web && c.web.key === WEB_APEXES[sel.ai].key);
  if (sel.kind === 'sat') return cs.findIndex(c => c.stack && c.stack.key === activeSatellites()[sel.si].stackKey);
  return -1;
}
function treeSelForChoice(c) {
  if (!c) return null;
  if (c.pathKey) return { kind: 'tier', pi: Math.max(0, PATH_KEYS.indexOf(c.pathKey)), ti: c.tierIdx };
  if (c.web) {
    if (c.webKind === 'fusion') return { kind: 'fusion', fi: Math.max(0, WEB_FUSION_KEYS.indexOf(c.web.key)), pi: 0, ti: 3 };
    if (c.webKind === 'apex') return { kind: 'apex', ai: Math.max(0, WEB_APEX_KEYS.indexOf(c.web.key)), pi: 0, ti: 3 };
    return { kind: 'bridge', bi: Math.max(0, WEB_BRIDGE_KEYS.indexOf(c.web.key)), pi: 0, ti: 0 };
  }
  if (c.stack) {
    const si = activeSatellites().findIndex(s => s.stackKey === c.stack.key);
    if (si >= 0) return { kind: 'sat', si, pi: Math.max(0, PATH_KEYS.indexOf(activeSatellites()[si].path)), ti: 3 };
  }
  return null;
}
function selectDraftChoice(i) {
  const c = G.upgradeChoices && G.upgradeChoices[i];
  if (!c) return;
  draftSel = i;
  const sel = treeSelForChoice(c);
  if (sel) treeSel = sel;
  if (upgradeTreeOpen) ensureTreeSelVisible();
  SFX.wall();
}
function syncTreeSelectionToDraft() {
  const chosen = draftSel != null && treeSelForChoice(G.upgradeChoices?.[draftSel]);
  if (chosen) treeSel = chosen;
  else {
    let found = null;
    for (const c of G.upgradeChoices || []) {
      found = treeSelForChoice(c);
      if (found) break;
    }
    treeSel = found || { kind: 'tier', pi: 0, ti: Math.min(3, pathLvl(PATH_KEYS[0])) };
  }
  if (upgradeTreeOpen) ensureTreeSelVisible();
}
// FULL WEB: 24 anchor tiers on six spokes, six bridges between ADJACENT
// wedges (WEB_SPOKE_ORDER makes the bridge cycle adjacent), one superskill
// crowning each spoke and three mastery satellites docked on their home
// wedges — 39 addressable nodes. Render and hit-testing share these rects.
function upgradeTreeLayout() {
  const panel = { x: Math.max(8 + SAFE_L, W * 0.02), y: Math.max(8 + SAFE_T, H * 0.025),
    w: Math.min(W - 16 - SAFE_L - SAFE_R, W * 0.96), h: Math.min(H - 16 - SAFE_T - SAFE_B, H * 0.95) };
  const compact = W < 720 || H < 520;
  const pad = compact ? 10 : 16, headH = compact ? 54 : 64;
  const sideDetail = panel.w >= 700 && panel.w > panel.h * 1.12;
  const detailSize = sideDetail
    ? Math.min(350, Math.max(270, panel.w * 0.28))
    : compact
      ? Math.min(232, Math.max(196, panel.h * 0.26)) // phones: a real bottom sheet
      : Math.min(190, Math.max(150, panel.h * 0.23));
  const map = sideDetail
    ? { x: panel.x + pad, y: panel.y + headH, w: panel.w - detailSize - pad * 3, h: panel.h - headH - pad }
    : { x: panel.x + pad, y: panel.y + headH, w: panel.w - pad * 2, h: panel.h - headH - detailSize - pad * 2 };
  const detail = sideDetail
    ? { x: panel.x + panel.w - detailSize - pad, y: panel.y + headH, w: detailSize, h: panel.h - headH - pad }
    : { x: panel.x + pad, y: panel.y + panel.h - detailSize - pad, w: panel.w - pad * 2, h: detailSize };
  // the FUSION HALO (1.16r) and APEX ring (1.3r) sit beyond the capstones,
  // so the base radius leaves headroom for them on desktop
  let radius = Math.max(74, Math.min(map.w * 0.33, map.h * 0.345) - (compact ? 2 : 8));
  // MOBILE readability beats fitting: the compact chart enforces a big
  // minimum scale — it may overflow the map box; treePan (below) covers it
  if (compact) radius = Math.max(radius, 235);
  radius *= treeZoom;
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
  // clamp the camera to the chart's real extent (the apex ring); desktop
  // fits entirely, so its pan locks to zero and nothing changes there
  const contentR = radius * 1.3 + (compact ? 32 : 26);
  const panLim = {
    x: Math.max(0, contentR - map.w / 2 + 8),
    y: Math.max(0, contentR - map.h / 2 + 8),
  };
  treePan.x = Math.max(-panLim.x, Math.min(panLim.x, treePan.x));
  treePan.y = Math.max(-panLim.y, Math.min(panLim.y, treePan.y));
  const cx = map.x + map.w / 2 + treePan.x, cy = map.y + map.h / 2 + (sideDetail ? 4 : 0) + treePan.y;
  // the inner ring must clear the pilot preview (sprite + aura + hardpoint
  // rack); the CAPSTONE ring stops at 84% so the superskill/satellite crown
  // ring (93%) and the wedge labels beyond it all fit inside the chart
  const inner = Math.max(48, radius * 0.28);
  const capR = radius * 0.84;
  const step = (capR - inner) / 3;
  const drawR = Math.max(8, Math.min(compact ? 20 : 22, step * 0.4));
  const hitR = Math.max(drawR + 5, Math.min(compact ? 31 : 27, step * 0.62));
  // every path keeps its PATH_KEYS index (pi) everywhere; only the drawn
  // ANGLE follows WEB_SPOKE_ORDER, which makes each bridge's two wedges
  // adjacent on screen
  const spokeA = pi => -Math.PI / 2 + WEB_SPOKE_ORDER.indexOf(PATH_KEYS[pi]) * Math.PI / 3;
  const at = (a, rr, r2) => {
    const nx = cx + Math.cos(a) * rr, ny = cy + Math.sin(a) * rr;
    const hr = Math.max(r2 + 5, hitR);
    return { x: nx - hr, y: ny - hr, w: hr * 2, h: hr * 2, cx: nx, cy: ny, r: r2, hitR: hr, a };
  };
  const buttonH = compact ? 40 : 38;
  const buttonY = detail.y + detail.h - buttonH - 10;
  const buttonGap = 8;
  const buttonW = (detail.w - 20 - buttonGap) / 2;
  const camY = map.y + 8, camH = 30, camGap = 5;
  const camX = map.x + 8;
  return {
    panel, compact, sideDetail, map, detail, center: { x: cx, y: cy }, radius, inner, step, drawR, panLim, zoom: treeZoom,
    close: { x: panel.x + panel.w - 44, y: panel.y + 9, w: 34, h: 34 },
    zoomOut: { x: camX, y: camY, w: 30, h: camH },
    zoomIn: { x: camX + 30 + camGap, y: camY, w: 30, h: camH },
    fit: { x: camX + 60 + camGap * 2, y: camY, w: 42, h: camH },
    focus: { x: camX + 102 + camGap * 3, y: camY, w: 52, h: camH },
    reroll: { x: detail.x + 10, y: buttonY, w: buttonW, h: buttonH },
    confirm: { x: detail.x + detail.w - 10 - buttonW, y: buttonY, w: buttonW, h: buttonH },
    spokeA,
    label: pi => {
      // wedge labels sit INSIDE the fusion halo, between the crown ring and
      // the halo nodes, so nothing prints over the outer rings
      const a = spokeA(pi);
      return { x: cx + Math.cos(a) * radius * 1.01, y: cy + Math.sin(a) * radius * 1.01, a };
    },
    node: (pi, ti) => at(spokeA(pi), inner + ti * step, drawR + (ti === 3 ? 1 : 0)),
    // a bridge sits on the BOUNDARY between its two wedges at mid-ring height
    bridgeNode: bi => at(-Math.PI / 2 + bridgeHalfPos(WEB_BRIDGES[bi]) * Math.PI / 6,
      inner + 2.05 * step, drawR * 0.92),
    // fusions: adjacent pairs crown their own boundary just past the capstone
    // ring; cross-web pairs ride the FUSION HALO (axis of the spoke between
    // them, or an authored boundary for opposite pairs)
    fusionNode: fi => {
      const f = WEB_FUSIONS[fi];
      const a = -Math.PI / 2 + fusionHalfPos(f) * Math.PI / 6;
      return at(a, radius * (f.bridge ? 0.93 : 1.16), drawR + 2);
    },
    // apexes hold the outermost ring, beyond the halo
    apexNode: ai => at(-Math.PI / 2 + WEB_APEXES[ai].mapSlot * Math.PI / 3, radius * 1.3, drawR + 4),
    satNode: si => {
      const pi = Math.max(0, PATH_KEYS.indexOf(activeSatellites()[si].path));
      return at(spokeA(pi) + 0.3, radius * 0.93, Math.max(6, drawR * 0.72));
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
    reward.desc, 3, 'SECRET UPGRADE · ONLY FOUND BEYOND THE ' + (SKIN.secret.riftName || 'KANTO RIFT'));
  G.secret.lastReward = null;
}
function beginUpgradeInstallFx(icon, color, name, pathKey = null, tierIdx = 0, big = false) {
  // `big` = a superskill acquisition — the same install language, held longer
  // and drawn larger (drawUpgradeInstallFx reads the flag)
  const dur = big ? 3.4 : 2.4;
  G.upgradeFx = { icon, color, name, pathKey, tierIdx, t: dur, max: dur, big };
}
// Mew VMAX bounty: ONE draft, TWO picks. After the first install the SAME
// hand stays open minus the picked card — a single choose-2 event, never two
// chained drafts. Returns true when it kept the player in the draft.
function holdBonusPick(remaining) {
  if (!(G.bonusPicks > 1)) { G.bonusPicks = 0; return false; }
  G.bonusPicks--;
  // drop any leftover card the first install invalidated (slot caps, a path
  // capping, an apex prereq shifting) — the survivors are the real hand
  const still = (remaining || []).filter(c =>
    c.stack ? true
      : c.web ? (c.webKind === 'apex' ? apexEligible(c.web)
        : c.webKind === 'fusion' ? fusionEligible(c.web) : bridgeEligible(c.web))
        : (pathLvl(c.pathKey) < 4 && c.tierIdx === pathLvl(c.pathKey)));
  G.upgradeChoices = still.length ? still : null;
  if (!G.upgradeChoices) { rollUpgradeChoices(); } // hand emptied → deal fresh, still one event
  if (!G.upgradeChoices) { G.bonusPicks = 0; return false; } // nothing left anywhere → resume play
  G.state = 'upgrade'; G.stateT = 0;
  draftSel = null;
  upgradeTreeOpen = G.mode === 'junkie' && G.upgradeChoices.every(x => x.pathKey || x.web || x.stack);
  if (upgradeTreeOpen) syncTreeSelectionToDraft();
  return true;
}
function pickUpgrade(i) {
  const c = G.upgradeChoices && G.upgradeChoices[i];
  if (!c) return;
  // the rest of the hand, for the Mew VMAX choose-2 bounty (holdBonusPick)
  const remaining = G.upgradeChoices.filter((_, j) => j !== i);
  draftSel = null;
  if (c.secret) {
    statsUpgradePick('secret:' + (c.secret.key || c.secret.name)); // before buildLevel opens the next record
    applySecretUpgrade(c.secret);
    beginUpgradeInstallFx(c.secret.icon, c.secret.color, c.secret.name, 'secret', 3);
    G.secret.lastReward = c.secret;
    G.secret.rewardDraft = false;
    G.secret.vmax = false;
    G.upgradeChoices = G.secret.deferredChoices;
    G.secret.deferredChoices = null;
    upgradeTreeOpen = G.mode === 'junkie' && !!G.upgradeChoices && G.upgradeChoices.every(x => x.pathKey || x.web || x.stack);
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
  // WEB node pick: a Form II bridge synergy or a Final Form superskill.
  // Effects all read upgN(key) at use time, so installing is just ownership.
  if (c.web) {
    const kind = c.webKind || 'bridge';
    const big = kind === 'fusion' || kind === 'apex';
    statsUpgradePick(c.web.key);
    G.upg[c.web.key] = 1;
    beginUpgradeInstallFx(c.web.icon, c.web.color, c.web.name, kind, 3, big);
    G.upgradeChoices = null;
    upgradeTreeOpen = false;
    SFX.power();
    if (holdBonusPick(remaining)) return;
    buildLevel(G.level);
    serve();
    if (G.justEvolved) { G.justEvolved = false; return; }
    setAnnounce(c.web.icon, c.web.color,
      kind === 'apex' ? '★★ ' + c.web.name + ' ★★' : big ? '★ ' + c.web.name + ' ★' : c.web.name,
      webNodeDesc(c.web), big ? 3.4 : 2.6,
      kind === 'apex' ? 'APEX TRANSFORMATION — THE RIG ITSELF HAS CHANGED'
        : kind === 'fusion' ? 'FUSION POWER ONLINE · ' + c.web.paths.map(pk => skinPathName(pk)).join(' × ')
          : 'BRIDGE SYNERGY ONLINE · ' + PATHS[c.web.paths[0]].name + ' × ' + PATHS[c.web.paths[1]].name);
    queueSecretRewardNotice();
    if (big) SFX.mega();
    return;
  }
  // late-run mastery STACK pick (literal held item in SPACE JUNKIE)
  if (c.stack) {
    statsUpgradePick('stack:' + c.stack.key);
    G.stacks[c.stack.key] = (G.stacks[c.stack.key] || 0) + 1;
    beginUpgradeInstallFx(c.stack.icon, c.stack.color, c.stack.name, 'mastery', Math.min(3, G.stacks[c.stack.key] - 1));
    G.upgradeChoices = null;
    upgradeTreeOpen = false;
    SFX.power();
    if (holdBonusPick(remaining)) return;
    buildLevel(G.level);
    serve();
    setAnnounce(c.stack.icon, c.stack.color,
      c.stack.name + ' ×' + G.stacks[c.stack.key],
      c.stack.desc, 2.4, G.mode === 'junkie' ? 'HELD ITEM STACKED — CHECK YOUR PILOT' : 'MASTERY STACKED — CHECK YOUR BUILD RAIL');
    queueSecretRewardNotice();
    return;
  }
  const junkieName = junkieTierName(c.pathKey, c.tierIdx);
  statsUpgradePick(c.pathKey + ':' + (c.tierIdx + 1));
  const tier = advancePath(c.pathKey);
  beginUpgradeInstallFx(tier.icon, c.path.color, junkieName, c.pathKey, c.tierIdx);
  G.upgradeChoices = null;
  upgradeTreeOpen = false;
  SFX.power();
  if (holdBonusPick(remaining)) return;
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
    (G.mode === 'junkie' ? 'HELD ITEM EQUIPPED · ' : '') + skinPathName(c.pathKey) + ' PATH ' + pathLvl(c.pathKey) + '/4' + (capped ? ' — CAPSTONE UNLOCKED!' : ''));
  queueSecretRewardNotice();
  if (capped) SFX.mega();
}
// one fresh hand per draft — reroll keeps drafts from feeling dead when
// every offer misses your build
// ✦ grant a cheat item — marks the run so the best score isn't recorded
function applyCheat(i) {
  const it = SKIN.cheatItems[i];
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
  statsReroll();
  draftSel = null; // fresh hand, fresh inspection
  rollUpgradeChoices();
  if (upgradeTreeOpen) syncTreeSelectionToDraft();
  SFX.wall();
}
function dexCloseGeom() { return { x: 14, y: 14, w: 110, h: 36 }; }
// act-boundary ceremony: a tap mid-scene jumps to the reveal; once the act
// card is up, a tap moves on to the draft
// results interstitial: one tap/key moves on — to the pending act ceremony
// if one queued behind it, otherwise straight to the draft. A short dwell
// stops the killing blow's tap from skipping the screen unseen.
function advanceResults() {
  if (G.state !== 'results' || G.stateT < 0.45) return;
  G.results = null;
  if (G.ceremony) { G.state = 'ceremony'; G.stateT = 0; }
  else { G.state = 'upgrade'; G.stateT = 0; }
  SFX.wall();
}
function advanceCeremony() {
  const c = G.ceremony;
  if (!c) { G.state = 'upgrade'; G.stateT = 0; return; }
  const doneAt = c.evo ? 3.4 : 2.2;
  if (c.t >= doneAt) { G.ceremony = null; G.state = 'upgrade'; G.stateT = 0; SFX.power(); }
  else if (c.evo && c.t < 1.85) c.t = 1.85;
  else if (!c.evo) c.t = doneAt;
}
function retryFromSummary() {
  SESSION_STATS.restarts++;
  if (G.daily) startDailyRun();
  else resetRun(G.runStartLevel || 1, !!G.trial);
}
function trialFromSummary() {
  trialSel.region = regionIdx(G.level); trialSel.stage = stageIdx(G.level); trialSel.round = 0; trialSel.phase = 1;
  G.state = 'menu'; menuPage = 'setup'; setupStep = 'difficulty'; trialOpen = true;
}
function startTrialSelection() {
  trialOpen = false;
  resetRun(trialSel.region * STAGES + trialSel.stage + 1, true);
  // Legendary-stage trials can skip directly to any finale tier. Kanto's
  // fourth STARFIGHTER tile forces the Rift encounter without changing the
  // player's persistent key or rewards.
  if (trialSel.stage === 2) jumpToGauntletRound(trialSel.round, trialSel.round >= 1 ? trialSel.phase : undefined);
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
  if (G.state === 'results') { advanceResults(); return; }
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
        const zx = T.map.x + T.map.w / 2, zy = T.map.y + T.map.h / 2;
        if (inRect(x, y, T.zoomOut)) { setTreeZoomAt(zx, zy, treeZoom / 1.2); SFX.wall(); return; }
        if (inRect(x, y, T.zoomIn)) { setTreeZoomAt(zx, zy, treeZoom * 1.2); SFX.wall(); return; }
        if (inRect(x, y, T.fit)) { treeZoom = 0.65; treePan.x = 0; treePan.y = 0; upgradeTreeLayout(); SFX.wall(); return; }
        if (inRect(x, y, T.focus)) {
          treeZoom = defaultTreeZoom(); treePan.x = 0; treePan.y = 0;
          ensureTreeSelVisible(); SFX.wall(); return;
        }
        if (draftSel != null && inRect(x, y, T.confirm)) { pickUpgrade(draftSel); return; }
        if (!G.secret.rewardDraft && !G.rerolled && inRect(x, y, T.reroll)) { rerollDraft(); return; }
        // Tap a node to inspect it. Offered nodes also become the active pick,
        // but still require the dedicated INSTALL action below the details.
        // Bridges, superskills and satellites are addressable exactly like
        // tier nodes — one shared select routine keeps render + input honest.
        const selectMapNode = sel => {
          treeSel = sel;
          const offer = choiceIndexForSel(sel);
          if (offer >= 0) draftSel = offer;
          SFX.wall();
        };
        for (let pi = 0; pi < PATH_KEYS.length; pi++) {
          for (let ti = 0; ti < 4; ti++) {
            if (inRect(x, y, T.node(pi, ti))) { selectMapNode({ kind: 'tier', pi, ti }); return; }
          }
        }
        for (let fi = 0; fi < WEB_FUSIONS.length; fi++) {
          if (inRect(x, y, T.fusionNode(fi))) { selectMapNode({ kind: 'fusion', fi, pi: 0, ti: 3 }); return; }
        }
        for (let ai = 0; ai < WEB_APEXES.length; ai++) {
          if (inRect(x, y, T.apexNode(ai))) { selectMapNode({ kind: 'apex', ai, pi: 0, ti: 3 }); return; }
        }
        for (let bi = 0; bi < WEB_BRIDGES.length; bi++) {
          if (inRect(x, y, T.bridgeNode(bi))) { selectMapNode({ kind: 'bridge', bi, pi: 0, ti: 0 }); return; }
        }
        for (let si = 0; si < activeSatellites().length; si++) {
          if (inRect(x, y, T.satNode(si))) {
            selectMapNode({ kind: 'sat', si, pi: Math.max(0, PATH_KEYS.indexOf(activeSatellites()[si].path)), ti: 3 });
            return;
          }
        }
        // Map drags are resolved by the pointer/touch gesture handlers so a
        // drag may begin over a dense node without installing or selecting it.
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
      if (!G.secret.rewardDraft && inRect(x, y, L.tree)) { upgradeTreeOpen = true; syncTreeSelectionToDraft(); SFX.wall(); return; }
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
      for (let i = 0; i < SKIN.gens.length; i++) {
        if (inRect(x, y, T.region(i))) {
          trialSel.region = i;
          if (i !== 0 && trialSel.round === 3) trialSel.round = 2;
          trialSel.phase = 1; // new region = new boss — reset the practice phase
          SFX.wall(); return;
        }
      }
      for (let i = 0; i < STAGES; i++) {
        if (inRect(x, y, T.stage(i))) { trialSel.stage = i; trialSel.round = 0; trialSel.phase = 1; SFX.wall(); return; }
      }
      if (T.rounds) {
        for (let i = 0; i < T.roundCount; i++) {
          if (inRect(x, y, T.round(i))) { trialSel.round = i; trialSel.phase = 1; SFX.wall(); return; }
        }
      }
      if (T.phases) {
        for (let i = 0; i < T.phaseCount; i++) {
          if (inRect(x, y, T.phase(i))) { trialSel.phase = i + 1; SFX.wall(); return; } // chips are 1-indexed phases
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
        const roster = skinStarters();
        for (let i = 0; i < roster.length; i++) {
          if (inRect(x, y, L.starter(i))) { SETTINGS.starter = roster[i].key; saveSettings(); SFX.wall(); return; }
        }
        if (inRect(x, y, L.none)) { SETTINGS.starter = 'none'; saveSettings(); SFX.wall(); return; }
        if (inRect(x, y, L.next)) { setupStep = 'difficulty'; SFX.power(); return; }
      } else {
        if (inRect(x, y, L.editPilot)) { setupStep = 'pilot'; SFX.wall(); return; }
        if (L.affinity) {
          const affs = ['light', 'dark'];
          for (let i = 0; i < 2; i++) {
            if (inRect(x, y, L.affinity(i))) {
              // committing to a path is a MOMENT, not a toggle — you can switch
              // sides here, but you can never return to "no side"
              SETTINGS.affinity = affs[i];
              G.affinityFx = { key: affs[i], until: G.time + 0.9 };
              saveSettings(); SFX.mega(); haptic('mega'); return;
            }
          }
        }
        const keys = Object.keys(PRESETS);
        for (let i = 0; i < keys.length; i++) {
          if (inRect(x, y, presetGeom(i))) { SETTINGS.preset = keys[i]; saveSettings(); SFX.wall(); return; }
        }
        if (inRect(x, y, startBtnGeom())) {
          // affinity skins launch only with a chosen path (LIGHT or DARK)
          if (SKIN.affinities && !SETTINGS.affinity) {
            G.affinityFx = { key: 'both', until: G.time + 0.9 };
            SFX.wall();
            return;
          }
          resetRun(); return;
        }
        if (inRect(x, y, L.trial)) { trialOpen = true; SFX.wall(); return; }
      }
      return;
    }
    // PAGE 1 — select a game in the compact rail, then use the single hero
    // action to enter setup. Keeping selection and launch separate prevents a
    // stray tap from dropping players into a setup flow they did not expect.
    const L = menuLayout();
    // CONTINUE outranks the skin pill: a return-player tap in any overlap
    // zone must resume the journey, never silently flip skins + reload
    if (L.resume && inRect(x, y, L.resume)) { resumeRun(); return; }
    if (skinPillRect && inRect(x, y, skinPillRect)) { SFX.power(); toggleSkin(); return; }
    // the daily badge overlaps the Breaker card — test it first
    if (inRect(x, y, L.daily)) { startDailyRun(); return; }
    // THE THREE DOORS: tapping a game card selects it AND walks straight
    // into partner selection — one tap, one decision, Back to change it
    for (let i = 0; i < MODES.length; i++) {
      if (inRect(x, y, L.card(i))) {
        SETTINGS.mode = MODES[i].key; saveSettings();
        setupStep = 'pilot'; menuPage = 'setup'; SFX.power();
        return;
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
      for (let i = 0; i < SKIN.cheatItems.length; i++) {
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
// One heat funnel keeps basic and charged fire on the same warning language.
// Crossing 70% and 90% is deterministic — no random misfire — so skilled
// players can vent by rhythm before the two-second lockout lands.
function addWeaponHeat(amount) {
  const before = G.heat;
  G.heat = Math.min(1, G.heat + amount);
  if (before < 0.7 && G.heat >= 0.7) {
    tone(420, 0.09, 'sawtooth', 0.045, 120);
    haptic('warn');
  }
  if (before < 0.9 && G.heat >= 0.9) {
    tone(250, 0.14, 'sawtooth', 0.06, -80);
    haptic('warn');
  }
  if (G.heat >= 1 && G.overheat <= 0) {
    G.overheat = OVERHEAT_DUR;
    statsOverheat();
    addFloater(G.paddle.x, shipY() - 44, 'OVERHEATED!', '#ff7043', 15);
    noiseBurst(0.3, 0.09);
  }
}

// button. `auto` marks held-button repeat fire (no denial beep spam).
function fireAction(auto = false) {
  if (paused) { paused = false; return; }
  if (G.state === 'serve') {
    G.balls.forEach(b => { if (b.stuck) { b.stuck = false; const a = serveAngle(); const sp = ballSp(); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; } });
    // VOLLEY capstone (classic only): TWIN ORB serves a second ball on a diverging vector
    if (G.mode === 'classic' && upgN('twin') && G.balls.length === 1) {
      const b0 = G.balls[0];
      G.balls.push(makeBall(b0.x, b0.y, Math.atan2(b0.vy, b0.vx) + 0.42));
    }
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
  // HYPERNOVA CYCLE: during Mega an unbroken stream spins through 3 cadence
  // stages (the stream breaks — see tickEffects — and the stages fall away)
  let cd = (upgN('hyper') ? 0.24 : 0.3) * starterMod('fireRate', 1);
  if (upgN('hypernova') && G.megaT > 0) {
    cd *= [1, 0.94, 0.86, 0.77][G.novaStage] || 1;
    G.novaT = 0.7;
    if (++G.novaN >= 6 && G.novaStage < 3) {
      G.novaN = 0;
      G.novaStage++;
      tone(520 + G.novaStage * 180, 0.1, 'sawtooth', 0.05, 240);
      addFloater(G.paddle.x, shipY() - 64, 'HYPERNOVA STAGE ' + G.novaStage, '#ffff8d', 12);
    }
  }
  G.blasterCD = cd;
  G.shotsFired++;
  statsShotFired(false);
  G.muzzle = 0.12;
  // Heat is TIME-normalised: a faster partner fires more shots, but each shot
  // contributes proportionally less heat. On Adventure, cold uninterrupted
  // basic fire reaches overheat in about seven seconds; tapping with pauses
  // remains comfortably sustainable.
  const torrent = starterMod('heat', 1);
  const masteryCool = Math.pow(0.94, G.stacks.ice || 0);
  // HYPER CYCLE also runs the barrel cooler — without this, sustained fire is
  // heat-limited well below the faster cadence and the capstone adds no DPS
  const hyperCool = upgN('hyper') ? 0.85 : 1;
  // HYPERNOVA's upper stages run dangerously hot — the +30% sustain is real,
  // but stage three cooks the barrel (the plan's declared limiter)
  const novaHeat = G.novaStage ? [1, 1.1, 1.25, 1.5][G.novaStage] : 1;
  const heatRate = G.mode === 'junkie' ? (preset().heatBuild || 0.42) : 0.4;
  addWeaponHeat(heatRate * cd * (1 - 0.25 * upgN('coolant')) * hyperCool * torrent * masteryCool * novaHeat);
  // The shot IS the partner's attack in EVERY mode now — the SHAPE follows
  // the species, the color + type follow the current element. Classic's
  // armed blaster fires the same typed bolts the Starfighter pilot does.
  const pil = pilotInfo();
  if (G.mode === 'junkie') G.attackAnim = 1; // the pilot visibly ATTACKS — lunge + flash
  // PRISMSTORM ARRAY: the primed volley fans into five tuned lanes instead
  if (upgN('prismstorm') && G.prismReady) {
    G.prismReady = false;
    const lanes = counterElements(2);
    for (let i = 0; i < 5; i++) {
      G.lasers.push({
        x: G.paddle.x + (i - 2) * 24, y: shipY() - 16, basic: true, prism: true,
        powerMul: 0.5, mega: G.megaT > 0,
        shape: pil ? pil.shape : null,
        element: lanes[i % lanes.length] || (pil ? attackElement() : null),
        tier: pil ? G.starterLvl : 1,
      });
    }
    addFloater(G.paddle.x, shipY() - 58, 'PRISMSTORM!', '#64ffda', 13);
    SFX.laser();
    return;
  }
  const nBolts = upgN('twin') ? 2 : 1;
  const pulseEvery = upgN('impactX') ? 4 : 5;
  const pulse = !!upgN('pulse') && G.shotsFired % pulseEvery === 0;
  // CALIBRATED BARRAGE (shooter modes): a spent charge primed these volleys
  const calib = G.mode !== 'classic' && G.calibShots > 0;
  if (calib) G.calibShots--; // one prime per VOLLEY, not per bolt
  for (let i = 0; i < nBolts; i++) {
    G.lasers.push({
      x: G.paddle.x + (nBolts > 1 ? (i ? 11 : -11) : 0),
      y: shipY() - 16, basic: true, // fires from wherever the ship flies
      explosive: !!G.fx_fire, // splash is FIREBALL's identity — Mega keeps its ×bonus, not free AoE
      powerMul: nBolts > 1 ? 0.6 : 1,
      heavy: !!upgN('heavy'), pulse, nova: pulse && !!upgN('impactX'), calib,
      wall: !!(upgN('battery') && G.wallSeg > 0), // BULWARK: fire through the wall
      mega: G.megaT > 0,
      shape: pil.shape,
      element: attackElement(),
      tier: G.starterLvl, // the attack itself grows as the partner evolves
    });
  }
  SFX.blaster();
}
// shooter-mode heavy shot — a fat, piercing bolt scaled by how long you held
// the charge (c in 0..1). Distinct fat visual + a deeper report.
// resonant (Milestone 2): released inside the sweet-spot window right after
// the charge tops out — +25% power, +1 pierce, 30% less heat, its own chime.
// The timing reward, never a requirement: a plain full release stays strong.
function fireCharge(c, resonant = false) {
  if (G.state !== 'play') return;
  if (!blasterArmed()) return; // no paddle gun in classic — the charge can never fire
  G.chargedEver = true; // the charge tutor banner retires once you've done it
  statsShotFired(true);
  if (resonant) statsResonant();
  // AEGIS LANCE: while shielded, a full charge SPENDS one real shield and the
  // bolt becomes the lance — unstoppable, armor-breaking (fusion)
  let lanceShot = false;
  if (upgN('lance') && c >= 0.9 && G.shieldCharges > 0) {
    G.shieldCharges--;
    lanceShot = true;
    addFloater(G.paddle.x, shipY() - 72, 'AEGIS LANCE!', '#d4e157', 14);
    SFX.shield();
  }
  const power = (1 + Math.round(c * 4)) * (upgN('impactX') ? 1.25 : 1) * (lanceShot ? 1.5 : 1)
    * (resonant ? 1.25 : 1);
  const pierce = (lanceShot ? 99 : 1 + Math.round(c * 3)) + (resonant ? 1 : 0);  // drills through 1..4 blocks
  const pil = pilotInfo(); // every mode: the charge is the partner's big attack
  if (G.mode === 'junkie') G.attackAnim = 1.4; // charge release = the big attack animation
  G.lasers.push({
    x: G.paddle.x, y: shipY() - 18, basic: true, charged: true, lance: lanceShot,
    power, pierce, r: (12 + c * 22) * (upgN('heavy') ? 1.15 : 1),
    heavy: !!upgN('heavy'), explosive: !!G.fx_fire, mega: G.megaT > 0,
    shape: pil.shape,
    element: attackElement(),
    tier: G.starterLvl,
  });
  // the big shot dumps a decent slug of heat — a full charge is ~0.6 of the
  // bar, so leaning on the charge (or chaining them) really can overheat you.
  // WAR MACHINE spends banked rail pressure to run the shot far cooler.
  const wmSpend = upgN('warmachine') ? G.railPressure : 0;
  const heatMods = (1 - 0.25 * upgN('coolant')) * Math.pow(0.94, G.stacks.ice || 0) * starterMod('heat', 1)
    * (1 - 0.45 * wmSpend);
  addWeaponHeat((0.30 + 0.30 * c) * heatMods * (resonant ? 0.7 : 1));
  G.muzzle = 0.18;
  G.shake = Math.min(G.shake + 2 + c * 4, 12);
  if (resonant) {
    addFloater(G.paddle.x, shipY() - 72, 'RESONANT!', '#80ffea', 15);
    ringFx(G.paddle.x, shipY() - 20, '#80ffea', 5, 74, 3, 0.4);
    tone(1240, 0.16, 'sine', 0.06, 320); // the crystalline timing chime
  }
  // WAR MACHINE: the rail spend never resets the gatling's cadence — the two
  // forms flow into each other, sharing only the heat bar
  if (upgN('warmachine')) {
    G.blasterCD = 0;
    if (wmSpend > 0.2) {
      ringFx(G.paddle.x, shipY() - 20, '#ff6e40', 5, 60, 3, 0.35);
      tone(120, 0.22, 'sawtooth', 0.07, 60); // the deeper rail report
    }
    G.railPressure = 0;
  }
  // CALIBRATED BARRAGE: the spent charge primes the next three volleys
  if (upgN('calibrated')) {
    G.calibShots = 3;
    addFloater(G.paddle.x, shipY() - 58, 'CALIBRATED!', '#ffcc80', 13);
  }
  fusionChargeReleases(c); // meteor / cataclysm / shepherd / mirror / battery
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
  if (G.state === 'results') { advanceResults(); return; }
  if (G.state === 'ceremony') { advanceCeremony(); return; }
  if (G.state === 'upgrade') return;
  fireAction();
}
function tryMega() {
  if (G.state !== 'play' || G.megaT > 0 || G.mega < 1) return;
  G.megaT = megaDur(); G.mega = 0;
  statsMega();
  // the chosen path answers the transformation (light/dark skins): a radiant
  // gold or umbral violet shock rides the Mega activation
  const affCol = affinityColor();
  if (affCol) {
    ringFx(G.paddle.x, shipY(), affCol, 8, 150, 4, 0.55);
    burst(G.paddle.x, shipY(), affCol, 22, 300, 0.7);
  }
  // AURORA DRIVE: Mega opens with a typed nova against the nearest enemies
  if (upgN('aurora')) {
    const el = attackElement();
    const px = G.paddle.x, py = shipY();
    const targets = G.bricks.filter(b => !b.dead && !b.dormant && !b.barrier)
      .sort((a, b) => Math.hypot(a.bx + G.fx - px, a.by + G.fy - py) -
        Math.hypot(b.bx + G.fx - px, b.by + G.fy - py)).slice(0, 5);
    for (const br of targets) {
      const bx = br.bx + G.fx, by = br.by + G.fy;
      ringFx(bx, by, TYPE_COLORS[el] || '#ffd54f', 4, 40, 3, 0.35);
      damageBrick(br, 0.8, bx, by, el);
    }
    ringFx(px, py, TYPE_COLORS[el] || '#ffd54f', 10, 150, 5, 0.5);
  }
  // REACTIVE OVERDRIVE: entering Mega regrows one missing shield (on cooldown)
  if (upgN('reactive') && G.reactiveCD <= 0 && G.shieldCharges < shieldCap()) {
    G.shieldCharges++;
    G.reactiveCD = 20;
    addFloater(G.paddle.x, shipY() - 62, 'REACTIVE SHIELD!', '#dce775', 13);
    SFX.shield();
  }
  // ELEMENTAL ASCENSION: the retune clock starts NOW (fusion)
  if (upgN('ascension')) G.ascendT = 0.01;
  // VICTORY FORMATION: Mega at full Sync calls the partner squadron
  if (upgN('formation') && G.syncMeter >= 8) {
    G.syncMeter = 0;
    G.squadT = 8;
    G.squadCD = 0;
    addFloater(G.paddle.x, shipY() - 78, 'VICTORY FORMATION!', '#ffd180', 15);
    SFX.gotcha();
  }
  // classic is ball-first with no charge input, so every charge-released
  // fusion fires on Mega activation instead (recipes force an offense path
  // to rank 3+, so the sidearm is always armed there)
  if (G.mode === 'classic') classicFusionReleases();
  G.shake = 14;
  haptic('boss');
  SFX.mega();
  // the bang is skin voice (MEGA EVOLUTION is pokemon language); the sub is
  // mode-honest — calm classic has no guns, the shooters get support fire
  setAnnounce('mega', '#ffd54f', SKIN.strings.megaBang || 'MEGA EVOLUTION!',
    G.mode === 'classic' ? 'PIERCING OVERDRIVE BALL' : 'PIERCING BOLTS · AUTO SUPPORT FIRE', 2.5);
}
