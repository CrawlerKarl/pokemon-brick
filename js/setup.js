'use strict';
// ============================================================
//  SETUP
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1, SAFE_B = 0, SAFE_T = 0, SAFE_L = 0, SAFE_R = 0;
let vignette = null;
// ---- safe persistent storage: one corrupt key must never brick the game.
// loadStore never throws (corrupt values are discarded and fall back);
// saveStore never throws (private mode / quota just means "play unsaved").
// 'pkbrk-v' marks the storage version — the hook for future migrations.
function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return JSON.parse(raw === null ? fallback : raw);
  } catch (e) {
    try { localStorage.removeItem(key); } catch (e2) { /* storage unavailable */ }
    return JSON.parse(fallback);
  }
}
function saveStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { STORAGE_HEALTH.writable = false; return false; }
}
// AFT-006: storage health is a FIRST-CLASS, surfaced fact. Safari's ITP can
// evict script storage after ~7 idle days — request durable storage where
// available, record whether it was granted, and detect blocked storage so the
// game can say "RUNNING UNSAVED" instead of silently losing a campaign.
const STORAGE_HEALTH = { writable: true, durable: null, noticed: false };
(function probeStorage() {
  try { localStorage.setItem('pkbrk-probe', '1'); localStorage.removeItem('pkbrk-probe'); }
  catch (e) { STORAGE_HEALTH.writable = false; }
  try {
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => { if (STORAGE_HEALTH.durable === null) STORAGE_HEALTH.durable = p; });
    }
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(g => { STORAGE_HEALTH.durable = g; }).catch(() => {});
    }
  } catch (e) { /* unsupported — durable stays unknown */ }
})();
try { if (!localStorage.getItem('pkbrk-v')) localStorage.setItem('pkbrk-v', '1'); } catch (e) { /* ok */ }
// canvas-only text doesn't reliably trigger @font-face loading — kick the
// local Orbitron variable font explicitly so the first frame isn't fallback
if (document.fonts && document.fonts.load) {
  for (const w of [500, 700, 900]) document.fonts.load(w + ' 16px Orbitron');
}
const IS_TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || new URLSearchParams(location.search).has('touch'); // ?touch forces mobile controls (testing)
let lastHapticAt = 0;
function haptic(kind = 'tap') {
  if (!IS_TOUCH || typeof SETTINGS === 'undefined' || !SETTINGS.haptics || !navigator.vibrate) return;
  const now = performance.now();
  if (now - lastHapticAt < (kind === 'hit' ? 45 : 80)) return;
  lastHapticAt = now;
  const patterns = { tap: 8, hit: 5, break: 12, warn: [9, 34, 14], item: [10, 25, 16], damage: [28, 35, 28], boss: [18, 28, 18, 28, 35], mega: [16, 30, 16, 30, 44] };
  navigator.vibrate(patterns[kind] || patterns.tap);
}

function resize() {
  // BOOTSTRAP GUARD: resize events can fire while later modules are still
  // parsing — buildStars/bgGen (scenery.js) don't exist yet, and calling
  // through would throw and leave the first frame blank. main.js re-runs
  // resize() once everything is loaded, so early events are safe to drop.
  if (typeof buildStars !== 'function') return;
  // visualViewport = what's actually visible (excludes mobile browser bars);
  // sizing the canvas style in px keeps touch coords 1:1 with the drawing
  const vv = window.visualViewport;
  const w = Math.round(vv ? vv.width : window.innerWidth);
  const h = Math.round(vv ? vv.height : window.innerHeight);
  if (!w || !h) return; // transient 0×0 during load/rotate
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // no-op guard: setting canvas.width blanks the canvas for a frame, so
  // spurious resize events (scrollbars, zoom, focus) must not rebuild anything
  if (w === W && h === H && dpr === DPR && canvas.width === w * dpr) return;
  DPR = dpr;
  W = w; H = h;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const probe = document.getElementById('safe-probe');
  SAFE_B = probe ? Math.round(probe.getBoundingClientRect().height) : 0;
  // top/left/right insets keep corner controls and the HUD clear of notches
  // and rounded corners (all four probes are optional — test.html omits three)
  const pT = document.getElementById('safe-probe-t');
  const pL = document.getElementById('safe-probe-l');
  const pR = document.getElementById('safe-probe-r');
  SAFE_T = pT ? Math.round(pT.getBoundingClientRect().height) : 0;
  SAFE_L = pL ? Math.round(pL.getBoundingClientRect().width) : 0;
  SAFE_R = pR ? Math.round(pR.getBoundingClientRect().width) : 0;
  buildStars();
  buildVignette();
  bgGen = -1;
}
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
function buildVignette() {
  vignette = document.createElement('canvas'); vignette.width = W; vignette.height = H;
  const c = vignette.getContext('2d');
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,12,0)');
  g.addColorStop(1, 'rgba(0,0,12,0.42)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
