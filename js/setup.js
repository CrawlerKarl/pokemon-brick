'use strict';
// ============================================================
//  SETUP
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// AFT-010: TEXT SIZE — one interception point scales every UI font set on
// the MAIN context. fitLabel (AFT-001) measures through the same scaled
// font, so its containment logic keeps enlarged text inside its zones
// automatically (tight boxes shrink back toward fit; roomy ones actually
// grow). Offscreen bake contexts are untouched — sprite art never rescales.
// At the default scale the setter passes straight through. Every scaled
// string is remembered so it can never be scaled twice, and nothing in the
// codebase reads ctx.font back (verified), so no compounding path exists.
const FONT_SCALE = { scale: 1, map: new Map(), out: new Set() };
// (guarded: the dist builder harvests these modules in a Node vm whose fake
// DOM has no CanvasRenderingContext2D — the interception is browser-only)
if (typeof CanvasRenderingContext2D !== 'undefined'
  && Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font')) {
  const fd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
  Object.defineProperty(ctx, 'font', {
    set(v) {
      const s = (typeof SETTINGS !== 'undefined' && SETTINGS.textScale) || 1;
      if (s === 1 || FONT_SCALE.out.has(v)) { fd.set.call(this, v); return; }
      if (FONT_SCALE.scale !== s) { FONT_SCALE.scale = s; FONT_SCALE.map.clear(); FONT_SCALE.out.clear(); }
      let sv = FONT_SCALE.map.get(v);
      if (sv === undefined) {
        sv = String(v).replace(/(\d+(?:\.\d+)?)px/, (m, n) => (Math.round(n * s * 10) / 10) + 'px');
        if (FONT_SCALE.map.size > 600) { FONT_SCALE.map.clear(); FONT_SCALE.out.clear(); }
        FONT_SCALE.map.set(v, sv); FONT_SCALE.out.add(sv);
      }
      fd.set.call(this, sv);
    },
    get() { return fd.get.call(this); },
  });
}
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

// AFT-018: the frame profiler — fixed rings for the last 120 frames' update /
// render work AND the actual requestAnimationFrame cadence, written by main.js
// and read by the adaptive effects budget + F9 dev panel. The cadence ring is
// separate because test/dev callers can drive update+render synchronously.
// Typed arrays + in-place writes: profiling must never allocate in the hot path.
const PERF = {
  u: new Float32Array(120), r: new Float32Array(120), i: 0, n: 0,
  c: new Float32Array(120), ci: 0, cn: 0,
  push(u, r, cadenceMs) {
    this.u[this.i] = u; this.r[this.i] = r;
    this.i = (this.i + 1) % 120; if (this.n < 120) this.n++;
    // Ignore bootstrap/resume gaps and implausibly short callbacks. A hidden
    // tab must not return in reduced quality, while sustained 20–40ms frames
    // during a boss fight absolutely must reach the adaptive ladder.
    if (Number.isFinite(cadenceMs) && cadenceMs >= 4 && cadenceMs <= 100) {
      this.c[this.ci] = cadenceMs;
      this.ci = (this.ci + 1) % 120; if (this.cn < 120) this.cn++;
    }
  },
  avg() { // moving total-frame average (ms) across the window
    let s = 0;
    for (let k = 0; k < this.n; k++) s += this.u[k] + this.r[k];
    return this.n ? s / this.n : 0;
  },
  recent(n = 30) { // the FAST window — escalation reacts in ~0.5s, not 2s
    const m = Math.min(n, this.n);
    if (!m) return 0;
    let s = 0;
    for (let k = 0; k < m; k++) {
      const idx = (this.i - 1 - k + 120) % 120;
      s += this.u[idx] + this.r[idx];
    }
    return s / m;
  },
  cadenceAvg() {
    let s = 0;
    for (let k = 0; k < this.cn; k++) s += this.c[k];
    return this.cn ? s / this.cn : 0;
  },
  cadenceRecent(n = 30) {
    const m = Math.min(n, this.cn);
    if (!m) return 0;
    let s = 0;
    for (let k = 0; k < m; k++) {
      const idx = (this.ci - 1 - k + 120) % 120;
      s += this.c[idx];
    }
    return s / m;
  },
  p95() { // dev/tests only — allocates a scratch copy, never call per frame
    if (!this.n) return 0;
    const t = [];
    for (let k = 0; k < this.n; k++) t.push(this.u[k] + this.r[k]);
    t.sort((a, b) => a - b);
    return t[Math.floor(t.length * 0.95)];
  },
};
// AFT-018b: ADAPTIVE RESOLUTION — the single biggest phone-GPU lever. The
// canvas backing store drops to 75% of native DPR under sustained load
// (≈44% fewer pixels for bloom, atmosphere, vignette, and every sprite
// composite) while the CSS size — and therefore every coordinate, hitbox,
// and layout — is untouched. Render-only by construction.
let RENDER_SCALE = 1;
function applyRenderScale(scale) {
  if (scale === RENDER_SCALE || !W || !H || !canvas) return;
  RENDER_SCALE = scale;
  const eff = DPR * RENDER_SCALE;
  canvas.width = Math.round(W * eff); canvas.height = Math.round(H * eff);
  ctx.setTransform(eff, 0, 0, eff, 0, 0);
}
try { if (!localStorage.getItem('pkbrk-v')) localStorage.setItem('pkbrk-v', '1'); } catch (e) { /* ok */ }
// canvas-only text doesn't reliably trigger @font-face loading — kick the
// local Orbitron variable font explicitly so the first frame isn't fallback
if (document.fonts && document.fonts.load) {
  for (const w of [500, 700, 900]) document.fonts.load(w + ' 16px Orbitron');
}
const IS_TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || new URLSearchParams(location.search).has('touch'); // ?touch forces mobile controls (testing)
// Keep touch feedback legible without letting rapid-fire combat turn into a
// continuous buzz. Routine actions are a light tick; important states retain
// a short, distinct rhythm. The global floor prevents different event types
// from stacking, while per-kind cooldowns tame repeated hits and pickups.
const HAPTIC_GLOBAL_COOLDOWN = 120;
const HAPTIC_PATTERNS = Object.freeze({
  tap: 4,
  hit: 3,
  break: 6,
  warn: [5, 45, 8],
  item: [5, 36, 7],
  damage: [12, 48, 14],
  boss: [8, 42, 11],
  mega: [8, 38, 9, 56, 15],
  // AFT-021 P8: promotion, full charge, and release remain distinct,
  // but no longer dominate the player's grip.
  promote: [4, 30, 6],
  full: [7, 36, 10],
  resonant: [6, 32, 7, 48, 12],
});
const HAPTIC_COOLDOWNS = Object.freeze({
  tap: 220,
  hit: 160,
  break: 220,
  warn: 320,
  item: 260,
  damage: 380,
  boss: 440,
  mega: 520,
  promote: 320,
  full: 380,
  resonant: 480,
});
let lastHapticAt = -Infinity;
const lastHapticByKind = Object.create(null);
function haptic(kind = 'tap') {
  if (!IS_TOUCH || typeof SETTINGS === 'undefined' || !SETTINGS.haptics || !navigator.vibrate) return;
  const now = performance.now();
  const resolvedKind = HAPTIC_PATTERNS[kind] ? kind : 'tap';
  const lastKindAt = lastHapticByKind[resolvedKind] ?? -Infinity;
  if (now - lastHapticAt < HAPTIC_GLOBAL_COOLDOWN
    || now - lastKindAt < HAPTIC_COOLDOWNS[resolvedKind]) return;
  lastHapticAt = now;
  lastHapticByKind[resolvedKind] = now;
  navigator.vibrate(HAPTIC_PATTERNS[resolvedKind]);
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
  if (w === W && h === H && dpr === DPR && canvas.width === Math.round(w * dpr * RENDER_SCALE)) return;
  DPR = dpr;
  W = w; H = h;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = Math.round(W * DPR * RENDER_SCALE); canvas.height = Math.round(H * DPR * RENDER_SCALE);
  ctx.setTransform(DPR * RENDER_SCALE, 0, 0, DPR * RENDER_SCALE, 0, 0);
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
