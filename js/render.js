'use strict';
// ============================================================
//  RENDER
// ============================================================
// ============================================================
// THE DEEP-STAGE UI KIT (AFT-029) — ONE panel language for every screen.
// The game grew surface by surface and each one invented its own boxes,
// glows and type sizes; together they read as a prototype. Every menu,
// card, sheet and dock now draws from these tokens and three primitives.
//   · a surface is a dark PANEL with a hairline edge and (optionally) one
//     accent bar — never a neon outer glow (ONE hero glow per screen, max);
//   · PRIMARY action = a solid accent slab with dark ink; everything else
//     is a quiet secondary panel-button;
//   · text is INK / SUB / MUTE; gold = reward, red = danger ONLY, cyan =
//     the player; four phone type sizes: 26 hero · 15 title · 11.5 label ·
//     10 secondary.
// Presentation only — nothing here touches the sim.
// ============================================================
const UI = Object.freeze({
  ink: '#eef3ff', sub: '#9fb2cc', mute: '#6b7c96',
  panel: 'rgba(7,11,30,0.92)', panelSoft: 'rgba(7,11,30,0.74)', panelLift: 'rgba(16,22,48,0.94)',
  line: 'rgba(255,255,255,0.11)', lineSoft: 'rgba(255,255,255,0.06)',
  gold: '#ffd54f', danger: '#ff5a5a', player: '#80d8ff', good: '#7ee0a0', dark: '#06101f',
  r: 14, gut: 16, gap: 12,
  hero: 26, title: 15, label: 11.5, small: 10,
});
// A panel. o: { r, soft, lift, accent, bar:'top'|'left'|null, sel, alpha, fill }
// `accent` alone tints the hairline; `bar` adds the 3px accent bar; `sel`
// thickens the edge in the accent (a SELECTED card). Returns nothing.
function uiPanel(x, y, w, h, o = {}) {
  const r = Math.min(o.r == null ? UI.r : o.r, w / 2, h / 2);
  const a0 = ctx.globalAlpha;
  if (o.alpha != null) ctx.globalAlpha = a0 * o.alpha;
  roundRect(x, y, w, h, r);
  ctx.fillStyle = o.fill || (o.lift ? UI.panelLift : o.soft ? UI.panelSoft : UI.panel);
  ctx.fill();
  ctx.lineWidth = o.sel ? 1.8 : 1;
  ctx.strokeStyle = o.sel && o.accent ? o.accent : o.accent ? o.accent + '55' : UI.line;
  ctx.stroke();
  if (o.accent && o.bar) {
    ctx.save();
    roundRect(x, y, w, h, r); ctx.clip();
    ctx.fillStyle = o.accent;
    if (o.bar === 'left') ctx.fillRect(x, y, 3, h); else ctx.fillRect(x, y, w, 3);
    ctx.restore();
  }
  ctx.globalAlpha = a0;
}
// A button drawn into rect R {x,y,w,h}. o: { primary, accent, sub, disabled,
// size, icon } — PRIMARY is the solid accent slab (dark ink); otherwise a
// secondary panel-button whose label takes the accent. `sub` is an optional
// second line. Labels go through fitLabel (shrink, then ellipsize).
function uiButton(R, label, o = {}) {
  const accent = o.accent || UI.player;
  const r = Math.min(o.r == null ? 12 : o.r, R.h / 2);
  const a0 = ctx.globalAlpha;
  if (o.disabled) ctx.globalAlpha = a0 * 0.42;
  roundRect(R.x, R.y, R.w, R.h, r);
  if (o.primary) { ctx.fillStyle = accent; ctx.fill(); }
  else {
    ctx.fillStyle = UI.panelLift; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = accent + '66'; ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cy = R.y + R.h / 2 + (o.sub ? -6 : 1);
  fitLabel(label, R.x + R.w / 2, cy, { size: o.size || (R.h >= 46 ? 14 : 12), min: 9, weight: 900,
    color: o.primary ? UI.dark : accent, maxW: R.w - 18 });
  if (o.sub) fitLabel(o.sub, R.x + R.w / 2, R.y + R.h / 2 + 10, { size: 9.5, min: 8, weight: 700,
    color: o.primary ? 'rgba(6,16,31,0.72)' : UI.sub, maxW: R.w - 18 });
  ctx.globalAlpha = a0;
}
// A small pill chip (status tags, counters). Returns its width.
function uiChip(x, y, text, o = {}) {
  const size = o.size || 10, pad = o.pad || 9, h = o.h || 20;
  ctx.font = `800 ${size}px Orbitron, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  roundRect(x0, y - h / 2, w, h, h / 2);
  ctx.fillStyle = o.fill || UI.panelSoft; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = (o.color || UI.sub) + '55'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || UI.sub;
  ctx.fillText(text, x0 + w / 2, y + 1);
  return w;
}
// Surface entrance: t = seconds the surface has been open → { a, dy } to
// fade it in and settle it 10px upward over 180ms. Screens that animate in
// multiply their alpha by `a` and translate by `dy`.
function uiEnter(t, dur = 0.18) {
  const k = Math.max(0, Math.min(1, (t || 0) / dur)), e = 1 - Math.pow(1 - k, 3);
  return { a: e, dy: (1 - e) * 10 };
}
// The deep backdrop every full-screen menu sits on: the same near-black
// navy as the combat stage, warming to `accent` low on the screen. Cached
// per size+accent — a menu paints ONE gradient, not a stack of washes.
function uiStage(accent) {
  const k = 'uistage_' + W + 'x' + H + '_' + (accent || '');
  let g = fxCache[k];
  if (!g) {
    g = ctx.createLinearGradient(0, 0, 0, H);
    const ac = accent || '#5a7cff';
    const ar = parseInt(ac.slice(1, 3), 16), ag = parseInt(ac.slice(3, 5), 16), ab = parseInt(ac.slice(5, 7), 16);
    g.addColorStop(0, '#03051a'); g.addColorStop(0.55, '#060a20');
    g.addColorStop(1, 'rgb(' + Math.round(6 + ar * 0.16) + ',' + Math.round(9 + ag * 0.16) + ',' + Math.round(26 + ab * 0.16) + ')');
    fxCache[k] = g;
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRiftBackground() {
  const cx = W / 2, cy = H * 0.27;
  const motion = SETTINGS.reduceFlash ? 0.22 : 1;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050216'); bg.addColorStop(0.52, '#160631'); bg.addColorStop(1, '#031422');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // A receding cyan grid makes the rift arena feel spatially unlike every
  // painted region backdrop without adding another large bitmap.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#58e7ff'; ctx.lineWidth = 1;
  const horizon = H * 0.42;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * W * 0.045, horizon); ctx.lineTo(cx + i * W * 0.14, H); ctx.stroke();
  }
  for (let i = 0; i < 11; i++) {
    const p = i / 10, y = horizon + Math.pow(p, 1.7) * (H - horizon);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Fracture lines radiate from the boss portal and drift only slightly.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI * 2 / 14 + Math.sin(G.time * 0.18) * 0.08 * motion;
    const r0 = 110 + (i % 3) * 14, r1 = Math.max(W, H) * 0.72;
    ctx.strokeStyle = i % 2 ? '#d780ff' : '#58e7ff';
    ctx.globalAlpha = 0.12 + (i % 3) * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.62);
    ctx.lineTo(cx + Math.cos(a + 0.07) * r1 * 0.55, cy + Math.sin(a + 0.07) * r1 * 0.38);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.68);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const rr = 105 + i * 38 + Math.sin(G.time * (0.55 + i * 0.12)) * 9 * motion;
    ctx.strokeStyle = i % 2 ? '#58e7ff' : '#d780ff';
    ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.46, G.time * 0.05 * (i % 2 ? -1 : 1) * motion, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// AFT-010: BACKGROUND DIMMING — an accessibility wash over the finished
// background stack (never the sprites, which draw after). One fillRect;
// menus keep their postcard look.
function bgDimWash() {
  const d = SETTINGS.bgDim || 0;
  if (d <= 0) return;
  ctx.fillStyle = 'rgba(2,4,12,' + d + ')';
  ctx.fillRect(0, 0, W, H);
}
// 0 on the ground (serve), easing to 1 once the stage has been live ~3.2s
function flightLift() {
  const u = Math.max(0, Math.min(1, (G.swayT || 0) / 3.2));
  let l = u * u * (3 - 2 * u);
  // THE LANDING: a won stage brings the realm back up under the vessel
  // while the field resolves, so the results sheet opens over the place you
  // just defended rather than over empty sky (mirror of the take-off).
  if (G.state === 'resolve') {
    const d = Math.max(0, Math.min(1, (G.stateT || 0) / 0.9));
    l *= 1 - d * d * (3 - 2 * d);
  }
  return l;
}
function drawBackground() {
  if (G.secret && (G.secret.vmax || G.secret.rewardDraft)) {
    drawRiftBackground();
    bgDimWash();
    return;
  }
  const onMenu = G.state === 'menu' || G.state === 'dex';
  const genIdx = onMenu ? 0 : regionIdx(G.level);
  // the SCENE DIRECTOR keys the sky by region AND stage — arrival daylight,
  // challenge weather, legendary transformation. The title keeps Kanto's
  // legendary night so the brand look survives.
  buildBackground(genIdx, onMenu ? 2 : stageIdx(G.level));
  // Rung 3 (AFT-025): the whole sky stack — sky, stars, scenery, wash —
  // pre-composites into ONE cached plate, so a struggling phone paints one
  // full-screen layer instead of four plus ambient motes. Twinkle and the
  // paddle parallax freeze (decorative only); the plate rebuilds only on a
  // scene or viewport change.
  if (!onMenu && effectsLevel() >= 3) {
    ctx.drawImage(backgroundPlate(), 0, 0, W, H);
    bgDimWash();
    return;
  }
  ctx.drawImage(bgSky, 0, 0, W, H);
  const par = (G.paddle.x - W / 2) / (W / 2); // parallax from paddle position
  // ---- STARFIGHTER IS A FLIGHT: once the stage is live the ground falls
  // away (the landmarks sink and fade over the first seconds — a take-off)
  // and the star field streams past, near stars racing as streaks. The
  // backdrop used to be a static postcard: nothing on screen said the
  // vessel was moving. Render-only — G.time and G.swayT are read, never
  // written, and no gameRand is involved.
  const flight = !onMenu && G.mode === 'junkie';
  const lift = flight ? flightLift() : 0;
  if (flight) { /* the star field streams OVER the deep wash — drawn below */
  } else if (SCENE_DARK > 0.05) for (const s of stars) {
    // stars only shine as dark as the scene allows — never at noon
    const tw = 0.75 + 0.25 * Math.sin(G.time * 1.2 + s.tw);
    ctx.globalAlpha = s.z * tw * 0.75 * SCENE_DARK;
    ctx.fillStyle = '#cfd8ff';
    ctx.fillRect(s.x - par * s.z * 14, s.y, s.z * 2.2, s.z * 2.2);
  }
  ctx.globalAlpha = 1;
  if (lift < 0.995) { // far range (slow) + landmarks (fast), cropped bands
    if (lift > 0) { ctx.save(); ctx.globalAlpha = 1 - lift; ctx.translate(0, lift * H * 0.42); }
    drawSceneryLayers(ctx, par);
    if (lift > 0) ctx.restore();
  }
  // combat contrast wash + atmosphere (one cached canvas since AFT-025) —
  // bright skies never swallow the sprites; the menu keeps its postcard look
  if (!onMenu && bgWash) ctx.drawImage(bgWash, 0, 0, W, H);
  if (flight) {
    ctx.fillStyle = '#dfe6ff';
    for (let pass = 0; pass < 2; pass++) for (const s of stars) {
      const z = pass ? 1.3 - s.z : s.z; // the second pass re-deals depth so the field is twice as dense
      // SURGE = WARP: while the overdrive burns, the field races and
      // every star stretches into a long streak
      const warp = G.megaT > 0 ? 2.8 : 1;
      const sp = (22 + z * z * 170) * warp;
      const y = ((s.y / 0.75 + (pass ? H * 0.37 : 0) + G.time * sp) % (H + 24)) - 12;
      const x = pass ? (s.x * 1.618 + 40) % W : s.x;
      // quiet by design: thin enemy fire must never be mistaken for the sky
      // (the first cut drew bright 2px bars up to 19px long — rain, not
      // stars, and the same shape as a micro shot). Only Surge stretches them.
      ctx.globalAlpha = Math.min(0.7, 0.14 + z * 0.4) * (0.6 + 0.4 * lift);
      ctx.fillRect(x - par * z * 12, y, z > 0.8 ? 1.6 : 1.1, (1.6 + z * z * 8 * (0.3 + 0.7 * lift)) * (warp > 1 ? 3.2 : 1));
    }
    ctx.globalAlpha = 1;
  }
  drawAmbient(genIdx);
  if (!onMenu) bgDimWash();
}
let bgPlate = null, bgPlateKey = '';
function backgroundPlate() {
  // STARFIGHTER: the plate is the flown sky (no landmarks) once airborne
  const flown = G.mode === 'junkie' && flightLift() > 0.5;
  const key = bgGen + '|' + W + 'x' + H + (flown ? '|f' : '');
  if (bgPlateKey === key && bgPlate) return bgPlate;
  bgPlateKey = key;
  bgPlate = document.createElement('canvas'); bgPlate.width = W; bgPlate.height = H;
  const c = bgPlate.getContext('2d');
  c.drawImage(bgSky, 0, 0, W, H);
  const plateStars = () => {
    c.fillStyle = '#cfd8ff';
    for (const s of stars) {
      const tw = 0.75 + 0.25 * Math.sin(s.tw); // frozen mid-twinkle
      c.globalAlpha = s.z * tw * 0.75 * (flown ? 0.8 : SCENE_DARK);
      c.fillRect(s.x, flown ? s.y / 0.75 : s.y, s.z * 2.2, s.z * 2.2);
    }
    c.globalAlpha = 1;
  };
  if (!flown && SCENE_DARK > 0.05) plateStars();
  if (!flown) drawSceneryLayers(c, 0); // the far range folds into the plate too (frozen)
  if (bgWash) c.drawImage(bgWash, 0, 0, W, H);
  if (flown) plateStars(); // the flown sky's stars sit OVER its deep wash
  return bgPlate;
}

// AFT-010: COLORBLIND-SAFE THREAT COLORS. Type identity is carried by SHAPE
// (a design invariant), so the 18 aspect colours stay put — this mode swaps
// only the SEMANTIC green "safe/healthy" poles for blues, the one confusion
// axis (red↔green) that actually erased information. Audited 2026-08-31:
// these four green sites plus the armor ramp were the only places where hue
// alone did the differentiating work.
// Keyed by SEMANTIC NAME, never by hex — grass ('#66bb6a') and bug
// ('#9ccc65') share these exact hexes as IDENTITY colours, so a hex-keyed
// map would be one careless call away from repainting a species.
const CB_SAFE_COLORS = {
  hpGood: ['#5fe0a6', '#4dd0e1'],    // healthy HP pole
  arcGood: ['#9ccc65', '#64b5f6'],   // brick/flyer HP arc "high" pole
  shieldGood: ['#66bb6a', '#4fc3f7'], // shield gain / shield icon
  shieldSoft: ['#a5d6a7', '#81d4fa'], // shield burst tint
};
function cbSafeColor(name) {
  const p = CB_SAFE_COLORS[name];
  return p ? p[SETTINGS.cbSafe ? 1 : 0] : name; // unknown values pass through
}
// armored "guardian wall" bricks shift colour as you whittle their plating down,
// fresh (cyan) → cracked (red), so their remaining hits read at a glance.
// The colorblind-safe ramp runs cold→neutral→hot (cyan→blue→white→yellow→
// orange→red) — a diverging ramp whose steps survive red-green blindness.
const ARMOR_STEPS = ['#37e0ff', '#5cffb0', '#c6ff5a', '#ffe14d', '#ff9d3d', '#ff5a5a'];
const ARMOR_STEPS_CB = ['#37e0ff', '#5a8dff', '#e8eef6', '#ffe14d', '#ff9d3d', '#ff5a5a'];
function armorColor(br) {
  const steps = SETTINGS.cbSafe ? ARMOR_STEPS_CB : ARMOR_STEPS;
  const dmg = br.maxHp - br.hp;
  const idx = br.maxHp <= steps.length
    ? Math.min(steps.length - 1, Math.floor(dmg))
    : Math.min(steps.length - 1, Math.round(dmg / br.maxHp * (steps.length - 1)));
  return steps[idx];
}

// ---- pre-rendered FX sprites: shadowBlur and per-frame gradient allocation
// are the two big mobile killers (GPU stalls + GC churn). Anything drawn
// many times per frame — enemy shots, flyer auras — is baked ONCE into an
// offscreen canvas here and drawn with a plain drawImage.
const fxCache = {};
// mix two #rrggbb colors, t=0 → a, t=1 → b
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = pa >> 16, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = pb >> 16, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
// a modern, glossy, faux-3D badge for an upgrade symbol: soft drop shadow,
// radial "lit-from-above" body, a gloss highlight, a bright rim, and the glyph
// in white on top. Baked once per (glyph, color, r, tone) — cheap to draw.
function iconBadge(glyph, color, r, tone = 'lit') {
  const ck = 'ib_' + glyph + '_' + color + '_' + r + '_' + tone;
  if (fxCache[ck]) return fxCache[ck];
  const pad = Math.ceil(r * 0.55) + 5, size = Math.ceil((r + pad) * 2);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const cc = c.getContext('2d'), cx = size / 2, cy = size / 2;
  const dim = tone === 'dim';
  // drop shadow under the disc
  cc.save();
  cc.shadowColor = 'rgba(0,0,0,0.55)'; cc.shadowBlur = r * 0.45; cc.shadowOffsetY = r * 0.2;
  cc.beginPath(); cc.arc(cx, cy, r, 0, Math.PI * 2); cc.fillStyle = color; cc.fill();
  cc.restore();
  // faux-3D body: lit from the top-left, darkening toward the bottom edge
  const g = cc.createRadialGradient(cx - r * 0.36, cy - r * 0.42, r * 0.08, cx, cy, r * 1.18);
  g.addColorStop(0, mixHex(color, '#ffffff', dim ? 0.3 : 0.6));
  g.addColorStop(0.52, dim ? mixHex(color, '#0a0e1c', 0.35) : color);
  g.addColorStop(1, mixHex(color, '#05060f', dim ? 0.7 : 0.5));
  cc.beginPath(); cc.arc(cx, cy, r, 0, Math.PI * 2); cc.fillStyle = g; cc.fill();
  // glossy top highlight
  cc.save();
  cc.beginPath(); cc.ellipse(cx, cy - r * 0.34, r * 0.64, r * 0.38, 0, 0, Math.PI * 2); cc.clip();
  const hg = cc.createLinearGradient(0, cy - r * 0.82, 0, cy + r * 0.05);
  hg.addColorStop(0, `rgba(255,255,255,${dim ? 0.3 : 0.55})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
  cc.fillStyle = hg; cc.fillRect(0, 0, size, size);
  cc.restore();
  // bright rim
  cc.beginPath(); cc.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  cc.lineWidth = Math.max(1, r * 0.08); cc.strokeStyle = `rgba(255,255,255,${dim ? 0.18 : 0.35})`; cc.stroke();
  // the symbol, white for contrast on the colored body
  drawGlyph(cc, glyph, cx, cy + r * 0.02, r * 0.6, dim ? 'rgba(255,255,255,0.72)' : '#ffffff');
  fxCache[ck] = c;
  return c;
}
// draw a badge centered at (x,y) onto the main ctx
function blitBadge(glyph, x, y, r, color, tone) {
  const b = iconBadge(glyph, color, Math.round(r), tone || 'lit');
  ctx.drawImage(b, x - b.width / 2, y - b.height / 2);
}

// a soft additive glow disc (white → transparent) for cheap emissive light
function glowSprite() {
  if (fxCache.glow) return fxCache.glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const cc = c.getContext('2d');
  const g = cc.createRadialGradient(64, 64, 1, 64, 64, 63);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  cc.fillStyle = g; cc.beginPath(); cc.arc(64, 64, 63, 0, Math.PI * 2); cc.fill();
  fxCache.glow = c; return c;
}
// a 4-point sparkle glint (drawn tinted via a temp buffer or globalAlpha)
function glintSprite() {
  if (fxCache.glint) return fxCache.glint;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const cc = c.getContext('2d'); const m = 32;
  const g = cc.createRadialGradient(m, m, 0, m, m, 8);
  g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
  cc.fillStyle = g; cc.beginPath(); cc.arc(m, m, 8, 0, Math.PI * 2); cc.fill();
  cc.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    cc.save(); cc.translate(m, m); cc.rotate(i * Math.PI / 2);
    cc.beginPath(); cc.moveTo(0, -30); cc.lineTo(2.4, 0); cc.lineTo(0, 30); cc.lineTo(-2.4, 0);
    cc.closePath(); cc.fill(); cc.restore();
  }
  fxCache.glint = c; return c;
}

// ---- BLOOM-LITE: after the world is drawn, a half-res blurred copy is
// composited back additively so bright things (ball, bolts, flashes, mega,
// kill rings) bleed a soft glow — the single biggest "modern" upgrade, and
// cheap: one canvas read + a couple of scaled drawImages. Respects the
// reduce-flashes accessibility toggle.
let bloomA = null, bloomB = null, bloomW = 0;
let bloomEase = 1; // the bloom CROSSFADES between ladder rungs — a hard
// on/off read as a rhythmic 1s darkening on marginal phones (owner report)
function drawBloom() {
  if (SETTINGS.reduceFlash || !W || !H) return;
  const target = effectsLevel() >= 1 ? 0 : 1; // AFT-018 rung 1: bloom goes first
  bloomEase += (target - bloomEase) * 0.06;   // ~0.5s glide per rendered frame
  if (bloomEase < 0.04) { if (target === 0) bloomEase = 0; return; } // skip the pass while invisible
  const bw = Math.max(2, Math.round(W / 2)), bh = Math.max(2, Math.round(H / 2));
  if (!bloomA || bloomW !== bw) {
    bloomA = document.createElement('canvas'); bloomA.width = bw; bloomA.height = bh;
    bloomB = document.createElement('canvas'); bloomB.width = Math.round(bw / 2); bloomB.height = Math.round(bh / 2);
    bloomW = bw;
  }
  const a = bloomA.getContext('2d'), b = bloomB.getContext('2d');
  a.globalCompositeOperation = 'source-over';
  a.clearRect(0, 0, bw, bh);
  a.drawImage(canvas, 0, 0, bw, bh);          // downscale the whole frame
  b.clearRect(0, 0, bloomB.width, bloomB.height);
  b.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height); // 2nd downscale = more blur
  a.drawImage(bloomB, 0, 0, bw, bh);          // back up = smeared
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';   // additive: brights bloom, darks barely lift
  ctx.globalAlpha = 0.22 * bloomEase;         // rung changes GLIDE, never pop
  ctx.drawImage(bloomA, 0, 0, W, H);
  ctx.restore();
}

// ---- ATMOSPHERE: the warm horizon glow + top darken now bakes directly
// into bgWash (scenery.js, AFT-025) so gameplay paints one combined wash
// layer per frame instead of two.
// a spiky energy orb baked in an arbitrary type COLOR and radius — enemy shots
// now come in every type's colour (electric yellow, water blue, …) instead of
// one red. Cached per (color, r, spikes).
// AFT-007: the returning relic — baked once per (skin, color) like every
// repeated projectile. The pokemon skin flies the bone boomerang; every
// other skin flies the curved relic glaive with an energy rim.
function relicGlaiveSprite(color) {
  const key = 'relic_' + SKIN.id + '_' + color;
  if (fxCache[key]) return fxCache[key];
  const size = 56;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  // baked halo — never per-frame shadowBlur
  const hg = g.createRadialGradient(0, 0, 6, 0, 0, size / 2);
  hg.addColorStop(0, color + '55'); hg.addColorStop(1, color + '00');
  g.fillStyle = hg; g.fillRect(-size / 2, -size / 2, size, size);
  if (SKIN.id === 'pokemon') {
    // BONEMERANG: a stout shaft with knobbed ends
    g.rotate(Math.PI / 4);
    g.fillStyle = '#f2ead8'; g.strokeStyle = 'rgba(58,48,38,0.9)'; g.lineWidth = 2;
    g.fillRect(-4, -14, 8, 28); g.strokeRect(-4, -14, 8, 28);
    for (const [kx, ky] of [[-5, -16], [5, -16], [-5, 16], [5, 16]]) {
      g.beginPath(); g.arc(kx, ky, 6, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  } else {
    // the RELIC GLAIVE: a crescent blade, steel core, bright energy rim
    g.beginPath();
    g.arc(0, 0, 21, -0.35, Math.PI * 0.85);
    g.arc(5, 4, 12, Math.PI * 0.85, -0.35, true);
    g.closePath();
    g.fillStyle = '#e8eaf6'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(7,12,28,0.85)'; g.stroke();
    g.beginPath(); g.arc(0, 0, 21, -0.35, Math.PI * 0.85);
    g.lineWidth = 3.5; g.lineCap = 'round'; g.strokeStyle = color; g.stroke();
    g.beginPath(); g.arc(-4, -3, 4, 0, Math.PI * 2);
    g.fillStyle = color; g.fill();
  }
  fxCache[key] = c;
  return c;
}
function shotSprite(color, r, spikes) {
  const key = 'shot_' + color + '_' + r + '_' + spikes;
  if (fxCache[key]) return fxCache[key];
  const inner = mixHex(color, '#05060f', 0.55);
  const size = Math.ceil(r * 1.35 + 13) * 2;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const cc = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  // baked halo — replaces the per-frame shadowBlur
  const hg = cc.createRadialGradient(cx, cy, r * 0.4, cx, cy, size / 2);
  hg.addColorStop(0, color + '77'); hg.addColorStop(1, color + '00');
  cc.fillStyle = hg; cc.fillRect(0, 0, size, size);
  cc.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = i * Math.PI / spikes;
    const rr = i % 2 === 0 ? r * 1.35 : r * 0.6;
    cc[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  cc.closePath();
  const g = cc.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 1, cx, cy, r * 1.35);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, color); g.addColorStop(1, inner);
  cc.fillStyle = g; cc.fill();
  cc.lineWidth = 2; cc.lineJoin = 'round';
  cc.strokeStyle = 'rgba(5,7,18,0.85)';
  cc.stroke();
  cc.beginPath(); cc.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
  cc.fillStyle = inner; cc.fill();
  fxCache[key] = c;
  return c;
}

// roundRect() paints on the global ctx; this variant takes a target context so
// the bake helpers below can build their rounded shapes on an offscreen canvas.
function roundRectP(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---- baked combat-loop art (AFT-018): the brick top-face, ball body, bolt
// glows and laser slugs used to allocate a gradient (and/or set shadowBlur)
// per entity per frame — the two mobile stutter killers. Each is baked ONCE
// into an fxCache canvas here and blitted with a plain drawImage.

// The standard brick's glossy top face: a vertical gradient inside a rounded
// rect. Baked per (color, width-bucket, height-bucket); buckets snap up to 8px
// so a wave of same-size tiles shares one canvas and the cache stays tiny.
function brickTopSprite(col, w, h) {
  const bw = Math.max(8, Math.ceil(w / 8) * 8), bh = Math.max(8, Math.ceil(h / 8) * 8);
  const key = 'brtop_' + col + '_' + bw + '_' + bh;
  if (fxCache[key]) return fxCache[key];
  const c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const cc = c.getContext('2d');
  const g = cc.createLinearGradient(0, 0, 0, bh);
  g.addColorStop(0, col + 'e6');
  g.addColorStop(1, col + '66');
  roundRectP(cc, 0, 0, bw, bh, 12);
  cc.fillStyle = g; cc.fill();
  fxCache[key] = c;
  return c;
}

// A soft radial glow disc in an arbitrary colour (bright core → transparent
// rim). Replaces per-frame createRadialGradient halos and per-entity shadowBlur
// on the ball, typed bolts, and the leaf/volt attack discs. Cached per colour.
function glowDisc(color) {
  const key = 'gdisc_' + color;
  if (fxCache[key]) return fxCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const cc = c.getContext('2d');
  const g = cc.createRadialGradient(32, 32, 1, 32, 32, 32);
  g.addColorStop(0, color);
  g.addColorStop(0.5, color + '66');
  g.addColorStop(1, color + '00');
  cc.fillStyle = g; cc.beginPath(); cc.arc(32, 32, 32, 0, Math.PI * 2); cc.fill();
  fxCache[key] = c;
  return c;
}

// A lit orb (white-hot core → colour → faint rim) used as a clipped fill for
// the water-dart body. Cached per colour; the animated teardrop path clips it.
function orbSprite(color) {
  const key = 'orb_' + color;
  if (fxCache[key]) return fxCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const cc = c.getContext('2d');
  const g = cc.createRadialGradient(32, 32, 1, 32, 32, 32);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, color + '18');
  cc.fillStyle = g; cc.fillRect(0, 0, 64, 64);
  fxCache[key] = c;
  return c;
}

// The razor-leaf blade (white tip → colour), baked once and blitted under the
// branch's live translate+rotate so it still spins — no per-bolt linear
// gradient allocation. Origin-centred: draw at (-size/2, -size/2). Per colour.
function leafBladeSprite(color) {
  const key = 'leafblade_' + color;
  if (fxCache[key]) return fxCache[key];
  const size = 40, c = document.createElement('canvas'); c.width = c.height = size;
  const cc = c.getContext('2d'), m = size / 2;
  const g = cc.createLinearGradient(m, m - 13, m, m + 13);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, color);
  cc.fillStyle = g;
  cc.beginPath();
  cc.moveTo(m, m - 13);
  cc.quadraticCurveTo(m + 9, m - 3, m, m + 13);
  cc.quadraticCurveTo(m - 9, m - 3, m, m - 13);
  cc.fill();
  fxCache[key] = c;
  return c;
}

// The player's ball body, with its emissive halo baked in place of the
// per-frame shadowBlur. Cached per (scheme, colour, radius). Schemes mirror the
// original branch set exactly: high-contrast, fire, element-tinted, default.
function ballBodySprite(scheme, col, r) {
  // AFT-010: OUTLINE STRENGTH scales the hc keyline — it joins the cache key
  // (bucketed to 0.1) so moving the slider rebakes instead of going stale
  const hcw = scheme === 'hc' ? Math.round((SETTINGS.hcStrength || 1) * 10) / 10 : 1;
  const key = 'ball_' + scheme + '_' + col + '_' + r + (scheme === 'hc' ? '_' + hcw : '');
  if (fxCache[key]) return fxCache[key];
  const pad = scheme === 'hc' ? 8 : 20;
  const size = Math.ceil(r + pad) * 2;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const cc = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  if (scheme === 'hc') {
    cc.fillStyle = '#ffffff';
    cc.beginPath(); cc.arc(cx, cy, r, 0, Math.PI * 2); cc.fill();
    cc.lineWidth = 2.5 * hcw; cc.strokeStyle = '#000';
    cc.beginPath(); cc.arc(cx, cy, r + 1, 0, Math.PI * 2); cc.stroke();
  } else {
    cc.shadowColor = scheme === 'fire' ? '#ff5722' : (col || '#90caf9');
    cc.shadowBlur = 16;
    const g = cc.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, r);
    if (scheme === 'fire') { g.addColorStop(0, '#fff3e0'); g.addColorStop(0.5, '#ffb74d'); g.addColorStop(1, '#e64a19'); }
    else if (scheme === 'elem') { g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, col); g.addColorStop(1, col); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#bbdefb'); g.addColorStop(1, '#42a5f5'); }
    cc.fillStyle = g;
    cc.beginPath(); cc.arc(cx, cy, r, 0, Math.PI * 2); cc.fill();
  }
  fxCache[key] = c;
  return c;
}

// A shooter-mode laser bolt (rounded slug + white core + baked glow). The
// per-laser shadowBlur that lit these is baked in once. The glow colour can
// differ from the body colour (the classic slug lights brighter than it fills).
// Returns {c, ax, ay}: blit at (L.x - ax, L.y - ay) so the sprite anchors on
// the bolt origin. Cached per (variant, body, core, width, glow, glow-colour).
function laserBoltSprite(variant, col, coreCol, w, glow, glowCol) {
  const gc = glowCol || col;
  const key = 'lbolt_' + variant + '_' + col + '_' + coreCol + '_' + w + '_' + glow + '_' + gc;
  if (fxCache[key]) return fxCache[key];
  let top, h, coreTop, coreH, coreW, rad;
  if (variant === 'blaster') { top = 26; h = 42; coreTop = 22; coreH = 32; coreW = 2.6; rad = w / 2; }
  else { top = 20; h = 32; coreTop = 16; coreH = 24; coreW = 3; rad = 4; }
  const pad = glow + 3;
  const cw = Math.ceil(w + pad * 2), ch = Math.ceil(h + pad * 2);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const cc = c.getContext('2d');
  const ax = cw / 2, ay = pad + top;
  cc.shadowColor = gc; cc.shadowBlur = glow;
  cc.fillStyle = col;
  roundRectP(cc, ax - w / 2, ay - top, w, h, rad); cc.fill();
  cc.shadowBlur = 0;
  cc.fillStyle = coreCol;
  roundRectP(cc, ax - coreW / 2, ay - coreTop, coreW, coreH, coreW / 2); cc.fill();
  const spr = { c, ax, ay };
  fxCache[key] = spr;
  return spr;
}

// The charged plasma slug's glowing ellipse body (white core → colour → faint),
// baked with its shadowBlur halo. Cached per (colour, radius-bucket).
function chargedSlugSprite(ccol, r) {
  const key = 'cslug_' + ccol + '_' + r;
  if (fxCache[key]) return fxCache[key];
  const pad = 28 + 4;
  const rx = r * 0.62, ry = r;
  const cw = Math.ceil(rx + pad) * 2, ch = Math.ceil(ry + pad) * 2;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const cc = c.getContext('2d');
  const cx = cw / 2, cy = ch / 2;
  cc.shadowColor = ccol; cc.shadowBlur = 28;
  const g = cc.createRadialGradient(cx, cy, 2, cx, cy, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, ccol); g.addColorStop(1, ccol + '1f');
  cc.fillStyle = g;
  cc.beginPath(); cc.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); cc.fill();
  fxCache[key] = c;
  return c;
}

// AETHERFALL's authored Relicforge sprites. Images and their restrained
// aspect-color overlays are cached once; gameplay falls back to the existing
// vector language while a PNG is still loading or in the legacy skin.
const aetherWeaponImages = {};
const aetherWeaponTints = {};
const AETHER_RELIC_SIZE = Object.freeze({
  pixel: 36, star: 38, gear: 40, gale: 40, claw: 42,
  fist: 44, quake: 44, venom: 44,
});
function aetherWeaponImage(path) {
  if (SKIN.id !== 'aetherfall' || !path) return null;
  if (!aetherWeaponImages[path]) {
    aetherWeaponImages[path] = loadAetherImage(path, 'weapon');
  }
  return aetherWeaponImages[path];
}
function aetherRelicImage(shape) {
  return aetherWeaponImage(SKIN.weaponArt && SKIN.weaponArt.shapes && SKIN.weaponArt.shapes[shape]);
}
function aetherAuxImage(key) {
  return aetherWeaponImage(SKIN.weaponArt && SKIN.weaponArt.aux && SKIN.weaponArt.aux[key]);
}
function aetherRelicForKind(kind) {
  const wa = SKIN.weaponArt;
  const shape = wa && wa.kindShape && (wa.kindShape[kind] || wa.kindShape.pellet);
  return shape ? aetherRelicImage(shape) : null;
}
function aetherWeaponTint(img, color) {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const key = img.src + '|' + color;
  if (aetherWeaponTints[key]) return aetherWeaponTints[key];
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const q = c.getContext('2d');
    q.drawImage(img, 0, 0);
    q.globalCompositeOperation = 'source-in';
    q.fillStyle = color; q.fillRect(0, 0, c.width, c.height);
    aetherWeaponTints[key] = c;
    return c;
  } catch (e) { return null; }
}
// The relic body — halo, tier echoes, and additive tint — is BAKED once per
// (image, color, tier, size-bucket) and drawn with ONE plain drawImage per
// projectile. The original path set ctx.shadowBlur per shot per frame, which
// under AETHERFALL (every enemy shot, typed bolt, and missile carries relic
// art) is exactly the per-entity GPU-blur stall the fxCache family exists to
// prevent — the pokemon skin never hit it because it takes enemyShotSprite.
// Size buckets exist because the halo ratio is size-dependent below 32px
// (blur = max(8, size*0.25)); three buckets keep small pellets glowing.
const aetherRelicBakes = {};
function aetherRelicBake(img, color, tier, size) {
  const bucket = size < 20 ? 0 : size < 32 ? 1 : 2;
  const key = img.src + '|' + color + '|' + tier + '|' + bucket;
  const hit = aetherRelicBakes[key];
  if (hit) return hit;
  const keys = Object.keys(aetherRelicBakes);
  if (keys.length > 96) for (const k of keys) delete aetherRelicBakes[k]; // rebake is cheap
  const N = img.naturalWidth; // production weapon art is 128px
  const q = bucket === 0 ? 0.5 : bucket === 1 ? 0.31 : 0.25; // halo ratio ≈ max(8, s*0.25)/s at bucket centers
  const pad = Math.ceil(N * q) + 2, S = N + pad * 2;
  const tint = aetherWeaponTint(img, color);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const b = c.getContext('2d');
  b.translate(S / 2, S / 2);
  if (tier >= 3 && tint) {
    b.globalCompositeOperation = 'lighter';
    b.globalAlpha = 0.16;
    b.drawImage(tint, -N / 2 - N * 0.16, -N / 2 + N * 0.12, N, N);
    b.drawImage(tint, -N / 2 + N * 0.16, -N / 2 + N * 0.12, N, N);
    b.globalCompositeOperation = 'source-over';
  }
  b.globalAlpha = 1;
  b.shadowColor = color; b.shadowBlur = N * q;
  b.drawImage(img, -N / 2, -N / 2, N, N);
  b.shadowBlur = 0;
  if (tint) {
    b.globalCompositeOperation = 'lighter';
    b.globalAlpha = tier >= 2 ? 0.25 : 0.18;
    b.drawImage(tint, -N / 2, -N / 2, N, N);
  }
  const rec = { c, scale: S / N };
  aetherRelicBakes[key] = rec;
  return rec;
}
function drawAetherRelic(img, x, y, size, color, tier = 1) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const bake = aetherRelicBake(img, color, tier, size);
  const total = size * bake.scale; // halo padding rides the same scale
  ctx.drawImage(bake.c, x - total / 2, y - total / 2, total, total);
  return true;
}

// Resolve and draw the chosen vessel treatment. LIGHT uses the existing true
// radiant repaint plus a sun-forged fitting; DARK shifts the base materials
// into an umbral shade and adds a visibly different crescent fitting.
// Which FORM (1-3) a vessel id represents in the active roster. The affinity
// tint grows across the three arcs, so a Form I hull is only faintly sworn and
// a Form III hull is unmistakably radiant or umbral.
function vesselForm(id) {
  const roster = SKIN.starterMon;
  if (roster) {
    for (const k of Object.keys(roster)) {
      const ids = roster[k] && roster[k].ids;
      if (ids) { const i = ids.indexOf(id); if (i >= 0) return i + 1; }
    }
  }
  return Math.max(1, Math.min(3, G.starterLvl || 1));
}
// Large portraits (setup heroes) draw a vessel far bigger than its 128px
// gameplay sprite. When a high-res preview exists, big draws use it; gameplay
// keeps the small sprite. Absent previews fall through to the final.
const aetherPreviewImages = {};
function aetherPreviewImage(id, light) {
  // the preview tables are AETHERFALL art keyed by bare numeric ids, which
  // COLLIDE with pokemon dex numbers (id 25 is both Pikachu and the
  // Aeronaut) — under any other skin they must never resolve
  if (SKIN.id !== 'aetherfall') return null;
  const table = light ? (typeof AETHERFALL_ART_PREVIEW_RADIANT !== 'undefined' && AETHERFALL_ART_PREVIEW_RADIANT)
    : (typeof AETHERFALL_ART_PREVIEW !== 'undefined' && AETHERFALL_ART_PREVIEW);
  const src = table && table[id];
  if (!src) return null;
  if (!aetherPreviewImages[src]) aetherPreviewImages[src] = loadAetherImage(src, 'preview');
  const img = aetherPreviewImages[src];
  return (img.complete && img.naturalWidth) ? img : null;
}
// The partner screen's hero card draws the high-res PREVIEW portrait while
// the shelf tiles draw the final sprite — two different renders of the same
// vessel. Both load lazily on first draw, so the first click on any tile
// showed the scaled-up tile art for a beat and then swapped to the preview
// (and the tiles themselves popped from procedural bakes to their PNGs).
// AFT-011 keeps boot honest: warm only the vessels visible on the current
// setup surface plus the selected hero. Opening BROWSE ALL intentionally
// expands that bundle; the rest of the campaign remains procedural until its
// realm is current. Weapons load on demand behind their vector fallback.
let warmedSetupArt = '';
function warmSetupArt() {
  if (SKIN.id !== 'aetherfall') return;
  const keys = (!pilotBrowseAll && pilotFreshSession())
    ? PILOT_ARCHETYPES.map(a => a.key) : Object.keys(SKIN.starterMon || {});
  if (SETTINGS.starter && SETTINGS.starter !== 'none' && !keys.includes(SETTINGS.starter)) keys.push(SETTINGS.starter);
  const warmKey = SKIN.id + '|' + keys.join(',') + '|' + SETTINGS.starter + '|' + (SETTINGS.affinity || '');
  if (warmedSetupArt === warmKey) return;
  warmedSetupArt = warmKey;
  withAetherArtBundle('VESSEL FORGE', true, () => {
    for (const k of keys) {
      const sm = SKIN.starterMon[k];
      if (sm && sm.ids) getSprite(sm.ids[0]);
    }
    const chosen = SKIN.starterMon[SETTINGS.starter];
    if (chosen && chosen.ids) {
      getSprite(chosen.ids[0]);
      aetherPreviewImage(chosen.ids[0], false);
      if (SETTINGS.affinity === 'light') aetherPreviewImage(chosen.ids[0], true);
    }
  });
}
function affinityVesselImage(id, big, forceBase) {
  if (id > 0) {
    const light = !forceBase && !!(SKIN.affinities && SETTINGS.affinity === 'light');
    return (big && aetherPreviewImage(id, light)) || getSprite(id, light);
  }
  return aetherAuxImage('trainingDrone');
}
// The vessel wears its sworn path — but the oath is an EVOLUTION ARC, not a
// costume (AFT-017). Each treatment channel has its OWN per-form curve; a
// single alpha multiplier can't make Form I read as a restrained mark and
// Form III as an unmistakable transformation. LIGHT's SOURCE ART is part of
// the arc too: Form I flies the base casting, Form II blends radiant
// materials in, only Form III earns the true radiant source. Everything is
// baked once per (id, affinity, form) — source-atop only, never 'lighter'
// (additive paints the transparent pixels and lights the bounding box).
const OATH_CH = {
  tint:  [0.10, 0.48, 1.00], // material wash strength
  rim:   [0.14, 0.52, 1.00], // warm highlight / umbral deepening
  aura:  [0.08, 0.45, 1.00], // outer glow radius
  fitS:  [0.25, 0.60, 1.00], // rear-fitting scale (20–30% reveal at Form I)
  fitA:  [0.25, 0.62, 1.00], // rear-fitting opacity
  blend: [0.00, 0.45, 1.00], // LIGHT radiant-source blend
  runes: [1, 3, 6],          // engraved oath marks on the hull
};
function oathCh(ch, form) {
  const f = Math.max(1, Math.min(3, form || G.starterLvl || 1));
  return OATH_CH[ch][f - 1];
}
function affinityVesselSprite(id, big, neutral) {
  const aff = !neutral && ((SKIN.affinities && SETTINGS.affinity) || null);
  const base = affinityVesselImage(id, big, true); // the hull as forged
  if (!base || !base.complete || !base.naturalWidth) return null;
  if (!aff) return base;
  const form = vesselForm(id);
  const blend = aff === 'light' ? oathCh('blend', form) : 0;
  const radiant = blend > 0 ? affinityVesselImage(id, big, false) : null;
  const radiantReady = !!(radiant && radiant.complete && radiant.naturalWidth && radiant !== base);
  const key = 'vessel_' + id + '_' + aff + '_' + form + '_' + base.naturalWidth + (radiantReady ? 'r' : '');
  if (fxCache[key]) return fxCache[key];
  const s = Math.max(8, base.naturalWidth);
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d');
  g.drawImage(base, 0, 0, s, s);
  if (radiantReady) { // the radiant materials TAKE HOLD by form, not at once
    if (blend >= 1) { g.clearRect(0, 0, s, s); g.drawImage(radiant, 0, 0, s, s); }
    else { g.globalAlpha = blend; g.drawImage(radiant, 0, 0, s, s); g.globalAlpha = 1; }
  }
  // material wash — the vessel's own pixels only
  g.globalCompositeOperation = 'source-atop';
  const tint = oathCh('tint', form), rim = oathCh('rim', form);
  g.fillStyle = aff === 'light' ? 'rgba(255,214,110,' + (0.26 * tint).toFixed(3) + ')'
    : 'rgba(150,96,255,' + (0.30 * tint).toFixed(3) + ')';
  g.fillRect(0, 0, s, s);
  g.fillStyle = aff === 'light' ? 'rgba(255,240,190,' + (0.14 * rim).toFixed(3) + ')'
    : 'rgba(18,6,42,' + (0.24 * rim).toFixed(3) + ')';
  g.fillRect(0, 0, s, s);
  // engraved oath runes: seeded per id, clipped to the hull by source-atop —
  // one quiet mark at Form I, a constellation by Form III
  const runeN = oathCh('runes', form);
  let seed = id * 2654435761 >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.fillStyle = aff === 'light' ? 'rgba(255,236,170,0.85)' : 'rgba(190,140,255,0.85)';
  for (let i = 0; i < runeN; i++) {
    const rx = s * (0.3 + rnd() * 0.4), ry = s * (0.34 + rnd() * 0.4);
    const rr = s * (0.008 + rnd() * 0.008);
    g.beginPath();
    g.moveTo(rx, ry - rr * 1.6); g.lineTo(rx + rr, ry); g.lineTo(rx, ry + rr * 1.6); g.lineTo(rx - rr, ry);
    g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  fxCache[key] = c;
  return c;
}
// `neutral` draws the hull as it comes out of the forge — no fitting, no
// tint, no aura. The VESSEL screen uses it: you are choosing a ship there,
// not a path, and the oath only shows once you actually swear it.
function drawAffinityVessel(id, x, y, size, neutral) {
  const big = size >= 96; // portrait-scale draws earn the high-res casting
  const img = affinityVesselSprite(id, big, neutral);
  if (!img) return false;
  ctx.save();
  const frameKey = !neutral && SKIN.affinities && SETTINGS.affinity
    ? (SETTINGS.affinity === 'light' ? 'lightFrame' : 'darkFrame') : null;
  const frame = frameKey ? aetherAuxImage(frameKey) : null;
  const form = vesselForm(id);
  if (frame && frame.complete && frame.naturalWidth) {
    // AFT-017: the rear fitting GROWS with the oath — a 20–30% reveal at
    // Form I, roughly half at Form II, the full sun/crescent only at Form III
    const fs = size * (0.75 + 0.75 * oathCh('fitS', form));
    const fa = oathCh('fitA', form);
    ctx.globalAlpha = fa;
    ctx.shadowColor = affinityColor() || '#ffffff'; ctx.shadowBlur = size * 0.16 * fa;
    ctx.drawImage(frame, x - fs / 2, y - fs / 2 + size * 0.03, fs, fs);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // an affinity-coloured aura reads at any size (the tint itself is baked in)
  const aCol = !neutral && affinityColor();
  if (aCol) {
    ctx.shadowColor = aCol;
    ctx.shadowBlur = size * 0.22 * oathCh('aura', form);
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx.shadowBlur = 0;
  }
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  return true;
}

// Typed/species projectile silhouettes. Everything expensive is baked once
// per (kind, colour, size bucket); the hot loop below remains one drawImage per
// shot. Shapes, not colour alone, make boss fire readable and accessible.
function enemyShotSprite(kind, color, radius) {
  const r = Math.max(4, Math.round(radius));
  const key = 'enemy_' + kind + '_' + color + '_' + r;
  if (fxCache[key]) return fxCache[key];
  const pad = Math.max(12, Math.ceil(r * 0.7));
  const size = Math.ceil(r * 3.4 + pad * 2);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const q = c.getContext('2d'), x = size / 2, y = size / 2;
  const inner = mixHex(color, '#071022', 0.52);
  const halo = q.createRadialGradient(x, y, r * 0.15, x, y, r * 1.72);
  halo.addColorStop(0, '#ffffff55'); halo.addColorStop(0.34, color + '77'); halo.addColorStop(1, color + '00');
  q.fillStyle = halo; q.fillRect(0, 0, size, size);
  const fill = q.createRadialGradient(x - r * 0.32, y - r * 0.36, 1, x, y, r * 1.3);
  fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.42, color); fill.addColorStop(1, inner);
  q.fillStyle = fill; q.strokeStyle = 'rgba(5,8,20,0.9)'; q.lineWidth = Math.max(1.5, r * 0.12);
  q.lineJoin = 'round'; q.lineCap = 'round';
  const poly = (n, rr = r, rot = -Math.PI / 2, squash = 1) => {
    q.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i * Math.PI * 2 / n;
      q[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr * squash);
    }
    q.closePath();
  };
  const filled = () => {
    // A near-black silhouette and a pale rim survive both bright clouds and
    // dark space. This is baked once, so the extra strokes cost nothing in
    // the projectile hot loop.
    q.save(); q.strokeStyle = 'rgba(2,5,15,0.96)'; q.lineWidth = Math.max(3, r * 0.34); q.stroke(); q.restore();
    q.fill();
    q.save(); q.strokeStyle = 'rgba(255,255,255,0.72)'; q.lineWidth = Math.max(1.15, r * 0.1); q.stroke(); q.restore();
  };
  switch (kind) {
    case 'needle': case 'stinger': case 'lance': case 'cannon':
      {
        const half = kind === 'stinger' ? 0.66 : kind === 'needle' ? 0.56 : 0.48;
        q.beginPath(); q.moveTo(x, y - r * 1.62); q.lineTo(x + r * half, y + r * 0.56);
        q.lineTo(x, y + r * 1.12); q.lineTo(x - r * half, y + r * 0.56); q.closePath(); filled();
        // Caterpie-family stingers carry two unmistakable side barbs; metal
        // lances use a cross-guard. Both remain directional at micro size.
        q.strokeStyle = '#ffffffdd'; q.lineWidth = Math.max(1.5, r * 0.12);
        q.beginPath(); q.moveTo(x, y - r * 1.18); q.lineTo(x, y + r * 0.72); q.stroke();
        if (kind === 'stinger') {
          q.strokeStyle = 'rgba(2,5,15,0.95)'; q.lineWidth = Math.max(3, r * 0.28);
          q.beginPath(); q.moveTo(x, y + r * 0.14); q.lineTo(x + r * 0.78, y + r * 0.48);
          q.moveTo(x, y + r * 0.14); q.lineTo(x - r * 0.78, y + r * 0.48); q.stroke();
          q.strokeStyle = '#ffffffcc'; q.lineWidth = Math.max(1.3, r * 0.1); q.stroke();
        } else if (kind === 'lance' || kind === 'cannon') {
          q.beginPath(); q.moveTo(x - r * 0.66, y + r * 0.48); q.lineTo(x + r * 0.66, y + r * 0.48); q.stroke();
        }
        break;
      }
    case 'ember': case 'comet':
      q.beginPath(); q.moveTo(x, y - r * 1.35);
      q.bezierCurveTo(x + r, y - r * 0.35, x + r * 0.75, y + r * 0.75, x, y + r * 1.1);
      q.bezierCurveTo(x - r * 0.75, y + r * 0.75, x - r, y - r * 0.35, x, y - r * 1.35); q.closePath(); filled();
      break;
    case 'droplet': case 'seed':
      q.beginPath(); q.moveTo(x, y - r * 1.35); q.bezierCurveTo(x + r, y, x + r * 0.75, y + r, x, y + r);
      q.bezierCurveTo(x - r * 0.75, y + r, x - r, y, x, y - r * 1.35); q.closePath(); filled(); break;
    case 'leaf': case 'tablet':
      q.beginPath(); q.moveTo(x, y - r * 1.25); q.quadraticCurveTo(x + r, y - r * 0.2, x, y + r * 1.25);
      q.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.25); q.closePath(); filled();
      q.strokeStyle = '#ffffff99'; q.lineWidth = Math.max(1, r * 0.08); q.beginPath(); q.moveTo(x, y - r); q.lineTo(x, y + r); q.stroke(); break;
    case 'crystal': case 'time': case 'prism': case 'mirage':
      poly(kind === 'prism' ? 3 : 4, r * (kind === 'time' ? 1.18 : 1.05), -Math.PI / 2, kind === 'time' ? 1.28 : 1); filled();
      q.strokeStyle = '#ffffffaa'; q.lineWidth = Math.max(1, r * 0.07);
      q.beginPath(); q.moveTo(x, y - r * 0.7); q.lineTo(x, y + r * 0.7); q.stroke(); break;
    case 'boulder': case 'snowball':
      poly(7, r * 1.08, -0.4, 0.92); filled();
      q.fillStyle = '#ffffff55'; q.beginPath(); q.arc(x - r * 0.25, y - r * 0.18, r * 0.22, 0, Math.PI * 2); q.fill(); break;
    case 'feather': case 'crescent':
      q.beginPath(); q.arc(x, y, r * 1.08, -Math.PI * 0.74, Math.PI * 0.74);
      q.quadraticCurveTo(x - r * 0.12, y, x, y - r * 1.08); q.closePath(); filled(); break;
    case 'wisp':
      q.beginPath(); q.moveTo(x, y - r * 1.25); q.bezierCurveTo(x + r, y - r * 0.35, x + r * 0.55, y + r, x, y + r * 0.75);
      q.bezierCurveTo(x - r * 0.8, y + r * 0.35, x - r * 0.25, y - r * 0.2, x, y - r * 1.25); q.closePath(); filled(); break;
    case 'fist':
      poly(6, r, -Math.PI / 2, 0.9); filled();
      q.fillStyle = '#ffffff66'; for (let i = -1; i <= 1; i++) { q.beginPath(); q.arc(x + i * r * 0.34, y - r * 0.36, r * 0.2, 0, Math.PI * 2); q.fill(); } break;
    case 'star': case 'sunwheel':
      q.beginPath();
      const pts = kind === 'sunwheel' ? 16 : 10;
      for (let i = 0; i < pts; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / pts; const rr = i % 2 ? r * 0.52 : r * 1.2;
        q[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      q.closePath(); filled(); break;
    case 'hex': case 'plasma':
      poly(6, r * 1.12, 0); filled();
      q.strokeStyle = '#ffffff99'; q.beginPath(); q.arc(x, y, r * 0.48, 0, Math.PI * 2); q.stroke(); break;
    case 'aeroring': case 'ring': case 'eclipse':
      q.beginPath(); q.arc(x, y, r * 1.12, 0, Math.PI * 2); q.fill(); q.stroke();
      q.globalCompositeOperation = 'destination-out'; q.beginPath(); q.arc(x, y, r * (kind === 'eclipse' ? 0.42 : 0.62), 0, Math.PI * 2); q.fill();
      q.globalCompositeOperation = 'source-over'; q.strokeStyle = '#ffffffaa'; q.beginPath(); q.arc(x, y, r * 0.62, 0, Math.PI * 2); q.stroke(); break;
    case 'shock':
      q.beginPath(); q.arc(x, y + r * 0.35, r * 1.15, Math.PI * 1.12, Math.PI * 1.88); q.lineWidth = r * 0.55; q.strokeStyle = color; q.stroke();
      q.lineWidth = Math.max(1.5, r * 0.1); q.strokeStyle = '#ffffffaa'; q.stroke(); break;
    case 'vine': case 'ribbon':
      q.beginPath(); q.moveTo(x, y - r * 1.25); q.bezierCurveTo(x + r, y - r * 0.45, x - r, y + r * 0.35, x, y + r * 1.25);
      q.lineWidth = Math.max(3, r * 0.48); q.strokeStyle = color; q.stroke(); q.lineWidth = Math.max(1, r * 0.1); q.strokeStyle = '#ffffff99'; q.stroke(); break;
    case 'toxic': case 'bubble': case 'mochi':
      q.beginPath(); q.arc(x, y, r * 1.05, 0, Math.PI * 2); filled();
      q.fillStyle = '#ffffff88'; q.beginPath(); q.arc(x - r * 0.32, y - r * 0.32, r * 0.2, 0, Math.PI * 2); q.fill();
      if (kind !== 'bubble') { q.fillStyle = inner; q.beginPath(); q.arc(x + r * 0.25, y + r * 0.2, r * 0.18, 0, Math.PI * 2); q.fill(); } break;
    default:
      q.beginPath(); q.arc(x, y, r, 0, Math.PI * 2); filled();
  }
  fxCache[key] = c;
  return c;
}
const SPINNING_ENEMY_SHOT = Object.freeze({
  pellet: 1, bubble: 1, toxic: 1, mochi: 1, star: 1, sunwheel: 1,
  boulder: 1, snowball: 1, hex: 1, plasma: 1, aeroring: 1, ring: 1, eclipse: 1, time: 1,
});
// Thin silhouettes receive render-only magnification. Their hit radii and
// threat budget remain untouched, so readability never makes a dodge harsher.
const ENEMY_SHOT_DRAW_SCALE = Object.freeze({
  needle: 1.28, stinger: 1.34, lance: 1.12, cannon: 1.12,
  feather: 1.14, crescent: 1.12, vine: 1.14, ribbon: 1.14,
});
function auraSprite(col) {
  const key = 'aura' + col;
  if (fxCache[key]) return fxCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const cc = c.getContext('2d');
  const g = cc.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, col + '55'); g.addColorStop(1, 'rgba(0,0,0,0)');
  cc.fillStyle = g;
  cc.beginPath(); cc.arc(64, 64, 62, 0, Math.PI * 2); cc.fill();
  fxCache[key] = c;
  return c;
}

// gait families for the free-flyers: the TYPE decides how a mon travels —
// wing-beats, swimming undulation, an eerie hover, or a padding ground gait
const GAIT_FLAP = new Set(['flying', 'dragon', 'bug']);
const GAIT_SWIM = new Set(['water', 'ice']);
const GAIT_HOVER = new Set(['ghost', 'psychic', 'fairy', 'poison']);

// ---- the LEGENDARY: no card, no frame — a huge bare Pokémon holding the
// arena. Layered like a real boss: breathing arena aura, orbiting energy
// ring that quickens per phase, silhouette shadow + rim light, gait motion,
// phase-tinted presentation with pips on the health bar, crackling sparks
// at the last stand.
function drawBossMon(br, x, y) {
  const col = TYPE_COLORS[br.poke.t];
  const ph = br.phase || 1;
  const phases = bossPhaseCount(br), lastStand = bossLastStand(br);
  const phCol = lastStand ? '#ff1744' : ph === 2 ? '#ff8a65' : col;
  const t = G.time;
  const s = Math.max(br.w * 1.15, br.h * 1.9);
  // PHASE ENRAGE garnish (br.enrageAnimT set on transition, decayed in update):
  // a scale-pulse on the silhouette + speed-lines behind it. Motion/shape only.
  const enr = Math.max(0, br.enrageAnimT || 0), enrK = enr / 0.9;
  const enrSc = 1 + 0.06 * Math.sin(t * 20) * enrK;
  // legendaries move like themselves too
  let bobY = Math.sin(t * 1.6 + br.wobble) * 5, gaitRot = Math.sin(t * 1.1 + br.wobble) * 0.03, sclY = 1;
  if (GAIT_FLAP.has(br.poke.t)) { bobY = Math.sin(t * 4.2 + br.wobble) * 6.5; sclY = 1 + 0.045 * Math.sin(t * 8.4 + br.wobble); }
  else if (GAIT_SWIM.has(br.poke.t)) { gaitRot = Math.sin(t * 2.6 + br.wobble) * 0.07; }
  const yb = y + bobY - s * 0.06;
  ctx.save();
  const phased = br.phaseT > 0 ? 0.35 + 0.1 * Math.sin(t * 6) : 1; // Lunala phases out
  const introAlpha = br.introAlpha == null ? 1 : br.introAlpha;
  ctx.globalAlpha = phased * introAlpha;
  if (br.introScale != null || br.introRot) {
    ctx.translate(x, y); ctx.rotate(br.introRot || 0); ctx.scale(br.introScale ?? 1, br.introScale ?? 1); ctx.translate(-x, -y);
  }
  // arena aura — a big breathing glow that reddens with the fight
  // (cached sprite, scaled: no per-frame gradient on the biggest fill)
  const ar = s * (0.72 + 0.05 * Math.sin(t * 2.4));
  ctx.globalAlpha = phased * introAlpha * (ph >= 2 ? 0.95 : 0.75);
  const bAur = auraSprite(phCol);
  ctx.drawImage(bAur, x - ar, yb - ar, ar * 2, ar * 2);
  ctx.globalAlpha = phased * introAlpha;
  // orbiting energy ring — two arcs, faster and angrier each phase
  const rr = s * 0.58, spin = t * (0.7 + ph * 0.4);
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = phased * introAlpha * (0.4 + 0.1 * ph);
    ctx.strokeStyle = phCol;
    ctx.beginPath();
    ctx.ellipse(x, yb, rr, rr * 0.42, 0, spin + i * Math.PI, spin + i * Math.PI + Math.PI * 0.55);
    ctx.stroke();
  }
  ctx.globalAlpha = phased * introAlpha;
  // enrage speed-lines: 8 short radial strokes fanning OUT behind the boss,
  // growing + fading as the timer decays (source-over strokes — no glow flash)
  if (enr > 0) {
    ctx.save();
    ctx.strokeStyle = phCol; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.globalAlpha = phased * introAlpha * 0.5 * enrK;
    const spin2 = t * 2, r1 = s * (0.5 + 0.12 * (1 - enrK)), r2 = s * (0.78 + 0.2 * (1 - enrK));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + spin2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r1, yb + Math.sin(a) * r1 * 0.7);
      ctx.lineTo(x + Math.cos(a) * r2, yb + Math.sin(a) * r2 * 0.7);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = phased * introAlpha;
  }
  // last stand: crackling sparks around the body
  if (lastStand) {
    ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const a2 = t * 7 + i * 2.1 + br.wobble;
      const sx2 = x + Math.cos(a2) * s * 0.42, sy2 = yb + Math.sin(a2 * 1.3) * s * 0.34;
      ctx.globalAlpha = phased * introAlpha * (0.3 + 0.5 * Math.abs(Math.sin(t * 11 + i * 3)));
      ctx.beginPath();
      ctx.moveTo(sx2 - 5, sy2 + 5); ctx.lineTo(sx2 + 2, sy2 - 1); ctx.lineTo(sx2 - 2, sy2 - 2); ctx.lineTo(sx2 + 5, sy2 - 8);
      ctx.stroke();
    }
    ctx.globalAlpha = phased * introAlpha;
  }
  // shadow → rim light → the legendary itself
  const img = getSprite(br.poke.id);
  const ok = img.complete && img.naturalWidth;
  const shadow = ok ? getSilhouette(br.poke.id, '#060a18') : null;
  const rim = ok ? getSilhouette(br.poke.id, ph >= 2 ? '#ff5252' : col) : null;
  const flashS = ok ? getSilhouette(br.poke.id, '#ffffff') : null;
  ctx.save();
  ctx.translate(x, yb);
  ctx.rotate(gaitRot);
  ctx.scale(enrSc, sclY * enrSc); // enrage scale-pulse rides the gait scale
  if (shadow) {
    ctx.globalAlpha = phased * introAlpha * 0.35;
    ctx.drawImage(shadow, -s / 2 + 7, -s / 2 + 10, s, s * 0.97);
  }
  if (rim) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = phased * introAlpha * (0.42 + (lastStand ? 0.22 * Math.abs(Math.sin(t * 6)) : ph === 2 ? 0.14 : 0));
    const rs = s * 1.07;
    ctx.drawImage(rim, -rs / 2, -rs / 2 - 2, rs, rs);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = phased * introAlpha;
  // no shadowBlur on a 200px+ sprite (mobile GPU stall) — the rim-light
  // silhouette above already carries the glow
  if (ok) ctx.drawImage(img, -s / 2, -s / 2, s, s);
  else drawGlyph(ctx, SKIN.strings.dexGlyph, 0, 0, br.h * 0.4, '#ffffff33');
  if (flashS && br.flash > 0.3) { // hits light the legendary up from within
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = phased * introAlpha * (br.flash - 0.3) * 0.9;
    ctx.drawImage(flashS, -s / 2, -s / 2, s, s);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // name plate + segmented HP bar + phase pips — anchored to the hitbox
  const hh = br.h / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 13px Orbitron, sans-serif';
  ctx.fillStyle = lastStand ? '#ff8a80' : ph === 2 ? '#ffab91' : '#fff';
  ctx.shadowColor = '#000'; ctx.shadowBlur = fxGlow(5); // the text stays; the halo yields under load
  // AFT-002: a docked boss reads from the HUD lane; AFT-021 P3: in a
  // multi-actor fight only the ACTIVE target keeps its floating plate
  if (G.revealDock !== br.poke.id && (br === frameActiveActor || frameActiveActor == null)) {
    fitLabel((lastStand ? '💀 ' : ph === 2 ? '😡 ' : '★ ') + br.poke.n.toUpperCase() + (ph === 1 ? ' ★' : ''),
      x, y - hh - 26, { size: 13, min: 10, weight: 900, maxW: Math.min(W * 0.62, Math.max(160, br.w * 1.5)), zone: 'field' });
    if (actorLabelLog) actorLabelLog.push({ x, y: y - hh - 26, w: Math.max(160, br.w * 1.5), name: br.poke.n, kind: 'boss' });
  }
  ctx.shadowBlur = 0;
  // AFT-021 P3: the local bar follows the same active-target rule as the
  // name — an inactive co-actor keeps silhouette identity only, and its
  // health reads from the roster rail pips instead
  if (br === frameActiveActor || frameActiveActor == null || G.revealDock === br.poke.id) {
    const bw2 = Math.max(br.w * 0.85, 150), frac = Math.max(0, br.hp / br.maxHp);
    roundRect(x - bw2 / 2, y - hh - 16, bw2, 8, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
    if (frac > 0) {
      roundRect(x - bw2 / 2, y - hh - 16, bw2 * frac, 8, 4);
      // cached in local space, re-mapped through the CTM (AFT-018 rule)
      let hg = fxCache.hpGradRedGold;
      if (!hg) {
        hg = ctx.createLinearGradient(0, 0, 1, 0);
        hg.addColorStop(0, '#ff5252'); hg.addColorStop(1, '#ffd54f');
        fxCache.hpGradRedGold = hg;
      }
      ctx.save();
      ctx.translate(x - bw2 / 2, 0); ctx.scale(bw2, 1);
      ctx.fillStyle = hg; ctx.fill();
      ctx.restore();
    }
    // phase notches and pips mirror this boss's authored phase count.
    ctx.fillStyle = 'rgba(6,9,24,0.9)';
    for (let i = 1; i < phases; i++) ctx.fillRect(x - bw2 / 2 + bw2 * i / phases - 1, y - hh - 16, 2, 8);
    for (let i = 0; i < phases; i++) {
      ctx.beginPath();
      ctx.arc(x - (phases - 1) * 8 + i * 16, y - hh - 3, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = i < ph ? phCol : 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawMewVmax(br, x, y) {
  const ph = br.phase || 1, t = G.time;
  const phCol = ph === 3 ? '#ff4f9a' : ph === 2 ? '#d780ff' : '#58e7ff';
  const pulse = 1 + Math.sin(t * 2.2 + br.wobble) * 0.035;
  const s = Math.min(W * 0.5, H * 0.43, Math.max(br.w * 1.35, br.h * 1.72)) * pulse;
  const yy = y + Math.sin(t * 1.7 + br.wobble) * 7;
  ctx.save();
  const introAlpha = br.introAlpha == null ? 1 : br.introAlpha;
  ctx.globalAlpha = introAlpha;
  if (br.introScale != null || br.introRot) {
    ctx.translate(x, y); ctx.rotate(br.introRot || 0); ctx.scale(br.introScale ?? 1, br.introScale ?? 1); ctx.translate(-x, -y);
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.72 * introAlpha;
  ctx.drawImage(auraSprite(phCol), x - s * 0.72, yy - s * 0.72, s * 1.44, s * 1.44);
  ctx.globalAlpha = 0.55 * introAlpha;
  ctx.strokeStyle = phCol; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const rr = s * (0.37 + i * 0.09);
    ctx.beginPath();
    ctx.ellipse(x, yy, rr, rr * 0.42, t * (i % 2 ? -0.3 : 0.24), i * 1.7, i * 1.7 + Math.PI * 1.25);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = introAlpha;
  const vimg = SKIN.id === 'pokemon' ? MEW_VMAX_IMG : getSprite(SKIN.secret.id);
  if (vimg && vimg.complete && vimg.naturalWidth) {
    ctx.drawImage(vimg, x - s / 2, yy - s / 2, s, s);
    if (br.flash > 0.35) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (br.flash - 0.35) * 0.65;
      ctx.drawImage(vimg, x - s / 2, yy - s / 2, s, s);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = introAlpha;
    }
  } else drawGlyph(ctx, 'psychic', x, yy, s * 0.2, '#d780ff');
  const frac = Math.max(0, br.hp / br.maxHp), barW = Math.min(W * 0.55, Math.max(190, br.w * 1.12));
  const barY = Math.min(H * 0.55, y + br.h / 2 + 14);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 13px Orbitron, sans-serif';
  ctx.fillStyle = '#fff'; ctx.shadowColor = phCol; ctx.shadowBlur = fxGlow(12);
  ctx.fillText('SECRET BOSS · ' + SKIN.secret.name, x, barY - 14, barW + 30);
  ctx.shadowBlur = 0;
  roundRect(x - barW / 2, barY, barW, 10, 5);
  ctx.fillStyle = 'rgba(2,4,16,0.82)'; ctx.fill();
  if (frac > 0) {
    // cached in local space, re-mapped through the CTM (AFT-018 rule)
    let hg = fxCache.vmaxBarGrad;
    if (!hg) {
      hg = ctx.createLinearGradient(0, 0, 1, 0);
      hg.addColorStop(0, '#58e7ff'); hg.addColorStop(0.55, '#d780ff'); hg.addColorStop(1, '#ff4f9a');
      fxCache.vmaxBarGrad = hg;
    }
    roundRect(x - barW / 2, barY, barW * frac, 10, 5);
    ctx.save();
    ctx.translate(x - barW / 2, 0); ctx.scale(barW, 1);
    ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(2,4,16,0.9)';
  for (const f of [1 / 3, 2 / 3]) ctx.fillRect(x - barW / 2 + barW * f - 1, barY, 2, 10);
  ctx.restore();
}

// Brick Breaker's finales stay true to the mode: the legendary is sealed in
// one oversized, animated boss brick. The brick patrols with its authored boss
// movement, changes armor at each phase, fires attacks, and calls orbiting
// brick guards in its last stand.
function drawBossBrick(br, x, y) {
  const col = TYPE_COLORS[br.poke.t];
  const ph = br.phase || 1;
  const phCol = ph === 3 ? '#ff1744' : ph === 2 ? '#ff8a65' : col;
  const hw = br.w / 2, hh = br.h / 2, depth = 12;
  const t = G.time, frac = Math.max(0, br.hp / br.maxHp);
  const phased = br.phaseT > 0 ? 0.38 + 0.12 * Math.sin(t * 7) : 1;
  ctx.save();
  ctx.globalAlpha = phased;

  // Breathing arena glow and four moving corner sentries make each phase feel
  // active while preserving an unmistakably rectangular brick silhouette.
  const ar = Math.max(br.w, br.h) * (0.72 + 0.04 * Math.sin(t * 2.5));
  ctx.globalAlpha = phased * (ph === 3 ? 0.82 : 0.55);
  ctx.drawImage(auraSprite(phCol), x - ar, y - ar, ar * 2, ar * 2);
  ctx.globalAlpha = phased;
  for (let i = 0; i < 4; i++) {
    const a = t * (0.7 + ph * 0.28) + i * Math.PI / 2;
    const px = x + Math.cos(a) * (hw + 10);
    const py = y + Math.sin(a) * (hh + 8) * 0.65;
    ctx.beginPath(); ctx.arc(px, py, ph === 3 ? 4.5 : 3.4, 0, Math.PI * 2);
    ctx.fillStyle = i < ph + 1 ? phCol : 'rgba(255,255,255,0.22)'; ctx.fill();
  }

  // Contact shadow, deep sidewall, and beveled top face.
  ctx.fillStyle = 'rgba(0,0,8,0.42)';
  roundRect(x - hw + 5, y - hh + depth + 7, br.w, br.h, 18); ctx.fill();
  roundRect(x - hw, y - hh + depth, br.w, br.h, 18);
  ctx.fillStyle = ph === 3 ? '#5b101f' : '#10162a'; ctx.fill();
  // shell bevel cached per (colour, last-stand) in local space — the boss
  // brick redraws every frame of a BREAKER finale (AFT-018 rule)
  let shell = fxCache['bossShell_' + col + '_' + (ph === 3 ? 1 : 0)];
  if (!shell) {
    shell = ctx.createLinearGradient(0, 0, 0, 1);
    shell.addColorStop(0, ph === 3 ? '#ff6b75' : mixHex(col, '#ffffff', 0.3));
    shell.addColorStop(0.18, col);
    shell.addColorStop(1, mixHex(col, '#070b19', 0.72));
    fxCache['bossShell_' + col + '_' + (ph === 3 ? 1 : 0)] = shell;
  }
  roundRect(x - hw, y - hh, br.w, br.h, 18);
  ctx.save();
  ctx.translate(0, y - hh); ctx.scale(1, br.h);
  ctx.fillStyle = shell; ctx.fill();
  ctx.restore();
  ctx.lineWidth = ph === 3 ? 4 : 3;
  ctx.strokeStyle = br.flash > 0 ? '#ffffff' : phCol;
  roundRect(x - hw, y - hh, br.w, br.h, 18); ctx.stroke();

  // Reinforced inner window: the Pokémon is artwork inside the brick, never a
  // free-floating enemy. Phase rails close inward as the armor breaks down.
  const inset = 8;
  roundRect(x - hw + inset, y - hh + inset, br.w - inset * 2, br.h - inset * 2, 12);
  ctx.fillStyle = 'rgba(5,9,24,0.68)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save();
  roundRect(x - hw + inset + 2, y - hh + inset + 2, br.w - inset * 2 - 4, br.h - inset * 2 - 4, 10);
  ctx.clip();
  const img = getSprite(br.poke.id);
  if (img.complete && img.naturalWidth) {
    const s = Math.min(br.w * 0.54, br.h * 0.92) * (1 + br.flash * 0.06);
    ctx.drawImage(img, x - s / 2, y - s / 2 - 3, s, s);
  } else drawGlyph(ctx, SKIN.strings.dexGlyph, x, y, hh * 0.38, '#ffffff55');
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.12 + br.flash * 0.34;
  ctx.drawImage(glowSprite(), x - hw, y - hh, br.w, br.h * 0.75);
  ctx.restore();

  // Segmented phase rails and deterministic crack lines tell the player how
  // dangerous the brick has become without obscuring the sprite.
  for (let i = 0; i < 3; i++) {
    const rw = (br.w - 28) / 3 - 4;
    roundRect(x - hw + 14 + i * (rw + 4), y + hh - 12, rw, 4, 2);
    ctx.fillStyle = i < ph ? phCol : 'rgba(255,255,255,0.16)'; ctx.fill();
  }
  if (ph >= 2) {
    ctx.strokeStyle = ph === 3 ? 'rgba(255,235,238,0.8)' : 'rgba(5,8,18,0.62)';
    ctx.lineWidth = ph === 3 ? 2 : 1.4;
    for (let i = 0; i < ph + 1; i++) {
      const sx = x + (i - ph / 2) * br.w * 0.16;
      ctx.beginPath();
      ctx.moveTo(sx, y - hh + 4);
      ctx.lineTo(sx + (i % 2 ? 9 : -8), y - 9);
      ctx.lineTo(sx + (i % 2 ? 2 : -1), y + hh - 5);
      ctx.stroke();
    }
  }

  // Nameplate and segmented boss health remain locked to the brick hitbox.
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 13px Orbitron, sans-serif';
  ctx.fillStyle = ph === 3 ? '#ff8a80' : '#ffffff';
  ctx.shadowColor = '#000'; ctx.shadowBlur = fxGlow(6); // text stays; halo yields under load
  if (G.revealDock !== br.poke.id) // AFT-002: a docked boss reads from the HUD lane
    fitLabel('BOSS BRICK · ' + br.poke.n.toUpperCase(), x, y - hh - 29,
      { size: 13, min: 10, weight: 900, maxW: Math.min(W * 0.62, Math.max(170, br.w * 1.3)), zone: 'field' });
  ctx.shadowBlur = 0;
  const barW = Math.max(br.w * 0.9, 150), barY = y - hh - 18;
  roundRect(x - barW / 2, barY, barW, 9, 4.5);
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fill();
  if (frac > 0) {
    // shares the cached red→gold bar gradient (AFT-018 rule)
    let hg = fxCache.hpGradRedGold;
    if (!hg) {
      hg = ctx.createLinearGradient(0, 0, 1, 0);
      hg.addColorStop(0, '#ff5252'); hg.addColorStop(1, '#ffd54f');
      fxCache.hpGradRedGold = hg;
    }
    roundRect(x - barW / 2, barY, barW * frac, 9, 4.5);
    ctx.save();
    ctx.translate(x - barW / 2, 0); ctx.scale(barW, 1);
    ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(6,9,24,0.92)';
  for (const f of [1 / 3, 2 / 3]) ctx.fillRect(x - barW / 2 + barW * f - 1, barY, 2, 9);
  ctx.restore();
}

let frameActiveActor = null; // AFT-021 P3: computed once per frame in drawBricks
function drawBricks() {
  const boss = G.bricks.find(b => b.isBoss && !b.dead && !b.dormant) || G.bricks.find(b => b.isBoss);
  const introOff = G.bossIntro > 0 ? -Math.pow(G.bossIntro / 1.6, 2) * (H * 0.4) : 0;
  frameActiveActor = activeCombatActor();
  for (const br of G.bricks) {
    if (br.dead || br.dormant) continue;
    let x = br.bx + G.fx;
    // idle bob is OFF while a brick is entering (out-of-phase bobbing on top
    // of the glide read as stutter) and eases back in once it lands (settleT).
    // A BARE flyer carries its own squad-synced gait below — stacking this
    // per-sprite bob on top of it was half of the "drunk" look.
    const bareFly = !br.isBoss && bareMon(br);
    const bobAmp = br.entry || bareFly ? 0 : (br.settleT == null ? 1 : br.settleT);
    let y = br.by + G.fy + Math.sin(G.time * 2 + br.wobble) * (br.isBoss ? 4 : 2.5) * bobAmp;
    if (br.isBoss && !br.gauntletEntering && !(G.gauntlet && G.mode === 'junkie')) y += introOff;
    const col = TYPE_COLORS[br.poke.t];
    const smallCard = br.w < 72; // mobile-sized cards get minimal overlays
    const tinyCard = br.w < 44;  // late-game horde cards: sprite + frame only
    // AFT-020 raid/hunt props carry no sprite id — they draw procedurally
    if (br.raidVine) { drawRaidVine(br, x, y); continue; }
    if (br.raidCover) { drawRaidCover(br, x, y); continue; }
    if (br.glassCell || br.lucPrison) { drawGlassCell(br, x, y); continue; }
    // AFT-021 P1: a STOOD-DOWN actor is scenery, not an enemy — the dimmed
    // silhouette stays for continuity, but every enemy affordance (aura,
    // bars, rings, guard tells, targeting) is gone. It cannot be mistaken
    // for something left to fight.
    if (br.stoodDown) {
      const img0 = getSprite(br.poke.id, br.shiny);
      if (img0.complete && img0.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        const s0 = Math.min(br.w, br.h * 1.15) * 1.1;
        ctx.drawImage(img0, x - s0 / 2, y - s0 / 2, s0, s0);
        ctx.globalAlpha = 0.5;
        drawGlyph(ctx, 'shield', x, y + s0 * 0.62, 5, '#78909c');
        ctx.restore();
      }
      continue;
    }
    // NB: br.flash is decayed in update() (dt-scaled) — render only READS it.
    // ---- FREE-FLYING ALIEN: broke out of its box — just the Pokémon,
    // banking through its pattern with a type-colored aura underneath.
    // Divers and once-dived (bare) blocks shattered their box too: NOTHING
    // attacks or flies as a full framed brick.
    if (bareMon(br)) {
      const img2 = getSprite(br.poke.id, br.shiny);
      ctx.save();
      ctx.globalAlpha = br.introAlpha == null ? 1 : br.introAlpha;
      const s2 = Math.min(br.w, br.h * 1.15) * 1.25 * (br.introScale ?? 1);
      // HIT REACTION (presentation only): the sprite is KICKED a few px along
      // the shot's direction and springs back, squashing on impact, while its
      // own silhouette flashes white. (The old reaction was a grey disc
      // painted at the sprite's centre plus a 10% scale pop — it read as the
      // enemy lurching toward its middle on every hit.)
      const hk = br.flash > 0 ? br.flash * br.flash : 0;
      if (hk > 0) { x += (br.kx || 0) * hk; y += (br.ky == null ? -4 : br.ky) * hk; }
      // ---- NATURAL LOCOMOTION: nothing floats like a stamp. All motion
      // state (velocity, facing, bank, gait phase) is computed in update()
      // with dt — render only READS it, so 60 Hz and 120 Hz look identical.
      // The gait comes from a SPECIES motion profile (type is the fallback):
      // a serpent undulates, a boulder barely bobs, a ground dragon strides.
      const face = br.face || 1;
      const ph3 = br.animPh ?? br.wobble;
      const amp = Math.min(1, (br.vspd || 0) / 42 + 0.35); // parked = breathing
      let bobY = 0, gaitRot = 0, sclX = 1, sclY = 1;
      switch (motionProfile(br.poke)) {
        case 'winged': { // wing-beats: quick flap bob, body pumping each stroke
          const flap = Math.sin(ph3 * 2.2);
          bobY = flap * 3;
          sclY = 1 + 0.05 * Math.sin(ph3 * 4.4);
          gaitRot = flap * 0.02;
          break;
        }
        case 'swim': // slow full-body undulation, nosing along the path
          gaitRot = Math.sin(ph3 * 1.5) * 0.04;
          bobY = Math.sin(ph3 * 0.75) * 2.4;
          break;
        case 'hover': // eerie hover: deep slow bob with a lazy roll
          bobY = Math.sin(ph3 * 1.1) * 3;
          gaitRot = Math.sin(ph3 * 0.55) * 0.025;
          break;
        case 'serpentine': // the whole body threads side to side
          gaitRot = Math.sin(ph3 * 1.7) * 0.07 * amp;
          sclX = 1 + 0.05 * Math.sin(ph3 * 0.85);
          bobY = Math.sin(ph3 * 0.8) * 1.6;
          break;
        case 'heavy': { // ponderous: tiny footfall, almost no roll
          const hstep = Math.abs(Math.sin(ph3 * 0.55));
          bobY = -hstep * 1.6 * amp;
          gaitRot = Math.sin(ph3 * 1.1) * 0.015;
          sclY = 0.98 + hstep * 0.03;
          break;
        }
        default: { // biped/quadruped footfall — springs off each stride
          const step = Math.abs(Math.sin(ph3));
          bobY = -step * 3.4 * amp;
          sclY = 0.95 + step * 0.07 * amp;
          sclX = 1.03 - step * 0.03 * amp;
          gaitRot = Math.sin(ph3 * 2) * 0.02 * amp;
        }
      }
      const bank = br.bank || 0;
      const yb = y + bobY;
      // cached aura sprite — one gradient per TYPE ever, not per flyer per frame
      const aur = auraSprite(col);
      const ad = s2 * 1.24;
      ctx.drawImage(aur, x - ad / 2, yb - ad / 2, ad, ad);
      if (img2.complete && img2.naturalWidth) {
        ctx.save();
        ctx.translate(x, yb);
        ctx.rotate(bank + gaitRot + (br.introRot || 0));
        ctx.scale(face * sclX * (1 + 0.12 * hk), sclY * (1 - 0.1 * hk));
        ctx.drawImage(img2, -s2 / 2, -s2 / 2, s2, s2);
        if (br.flash > 0.3) { // hit flash: the sprite's OWN shape goes white
          const sil = getSilhouette(br.poke.id, '#ffffff');
          if (sil) {
            const a0 = ctx.globalAlpha;
            ctx.globalAlpha = a0 * Math.min(0.92, (br.flash - 0.3) * 1.5);
            ctx.drawImage(sil, -s2 / 2, -s2 / 2, s2, s2);
            ctx.globalAlpha = a0;
          }
        }
        ctx.restore();
      } else {
        drawGlyph(ctx, SKIN.strings.dexGlyph, x, y, br.h * 0.4, '#ffffff33');
      }
      // SPECTRAL VEIL shimmer: a breathing dashed halo while the veil is up —
      // the readable tell that charged shots will phase through right now
      if (specVeilActive(br)) {
        ctx.globalAlpha = 0.45 + 0.25 * Math.sin(G.time * 9 + br.wobble);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#b39ddb'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      if (br.shiny) drawGlyph(ctx, 'fairy', x + s2 * 0.4, yb - s2 * 0.4, 5, '#ffd700');
      // PROTECT-objective ally: a soft wingmate-pink ring reads it as FRIENDLY
      // at a glance, with heart pips above for its remaining fhp. Strokes and
      // glyphs only — no gradients, no shadowBlur (mobile-safe, reduceFlash ok).
      if (br.friendly) {
        ctx.strokeStyle = '#ff80ab';
        ctx.globalAlpha = 0.5 + 0.22 * Math.sin(G.time * 3 + br.wobble);
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        const pips = Math.max(0, br.fhp || 0), pw = 9, py2 = yb - s2 * 0.62 - 9;
        for (let i = 0; i < pips; i++) {
          drawGlyph(ctx, 'heart', x + (i - (pips - 1) / 2) * pw, py2, 4, '#ff80ab');
        }
      }
      // Sentinel bosses carry a named bar — but only the ACTIVE TARGET keeps
      // its local label in multi-actor fights (AFT-021 P3): the rest keep
      // ring/aura identity and read from the roster rail, so three vows can
      // never stack three nameplates over the formation.
      if (br.subBoss && br.hp > 0 && br === frameActiveActor) {
        const frac = Math.max(0, br.hp / br.maxHp);
        const sbw = Math.max(78, s2 * 1.45), sby = yb - s2 * 0.67;
        ctx.font = '800 8px Orbitron, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8eef6';
        ctx.fillText((br.poke.n || SKIN.names[br.poke.id] || 'SENTINEL').toUpperCase(), x, sby - 8, sbw);
        if (actorLabelLog) actorLabelLog.push({ x, y: sby - 8, w: sbw, name: br.poke.n, kind: 'subBoss' });
        roundRect(x - sbw / 2, sby, sbw, 6, 3);
        ctx.fillStyle = 'rgba(5,8,20,0.72)'; ctx.fill();
        if (frac > 0) {
          roundRect(x - sbw / 2, sby, sbw * frac, 6, 3);
          // cached in local space, re-mapped through the CTM (AFT-018 rule)
          let sg = fxCache['sbGrad_' + col];
          if (!sg) {
            sg = ctx.createLinearGradient(0, 0, 1, 0);
            sg.addColorStop(0, col); sg.addColorStop(1, '#f5f7ff');
            fxCache['sbGrad_' + col] = sg;
          }
          ctx.save();
          ctx.translate(x - sbw / 2, 0); ctx.scale(sbw, 1);
          ctx.fillStyle = sg; ctx.fill();
          ctx.restore();
        }
      } else if (br.maxHp >= 3 && br.hp < br.maxHp && br.hp > 0) {
        const frac = Math.max(0, br.hp / br.maxHp);
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(8,12,28,0.55)';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.56, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = frac > 0.5 ? cbSafeColor('arcGood') : frac > 0.25 ? '#ffd54f' : '#ff7043';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.56, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      }
      if (br.subBoss && !(br.openT > 0)) {
        // SENTINEL GUARD tell: a steady hexagon = ×0.55 until it attacks. Pure
        // strokes (reduceFlash-safe — a SHAPE, not a luminance pulse). The ring
        // is ABSENT during the OPENING window (openT>0) when the guard is down.
        const gr = s2 * 0.66, rot = G.time * 0.25 + br.wobble;
        ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(128,216,255,0.72)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = rot + i * Math.PI / 3;
          const px = x + Math.cos(a) * gr, py = yb + Math.sin(a) * gr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
      if (br.shellArmor) {
        // SHELL ARMOR tell: a hard silver casing with a cyan charge-scan —
        // the unmistakable "charge a shot for this one" read
        const sa = 0.55 + 0.25 * Math.sin(G.time * 4 + br.wobble);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(207,216,220,${sa})`;
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(77,208,225,0.75)';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.68, G.time * 1.4 - 0.6, G.time * 1.4 + 0.6); ctx.stroke();
      }
      if (br.barrier) {
        // ROCK TOMB: heavy stone banding + the charge-only cue
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(161,136,127,0.85)';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.58, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(120,100,90,0.6)';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.64, 0.4, Math.PI - 0.4); ctx.stroke();
        drawGlyph(ctx, 'laser', x, yb - s2 * 0.74, 4.5, '#4dd0e1');
      }
      ctx.restore();
      continue;
    }
    // Brick Breaker bosses are oversized multi-phase bricks; shooter bosses
    // remain the free legendary arena centerpieces used by those modes.
    if (br.secretBoss) {
      drawMewVmax(br, x, y);
      continue;
    }
    if (br.isBoss) {
      if (G.mode === 'classic') drawBossBrick(br, x, y);
      else if (br.hourOut) {
        // an OUT-OF-HOUR actor is a pale past — ghosted until the hours trade
        ctx.save();
        ctx.globalAlpha *= 0.38;
        drawBossMon(br, x, y);
        ctx.restore();
      } else drawBossMon(br, x, y);
      continue;
    }
    ctx.save();
    const phased = br.phaseT > 0 ? 0.35 + 0.1 * Math.sin(G.time * 6) : 1; // Lunala fades out
    ctx.globalAlpha = phased;
    const hw = br.w / 2, hh = br.h / 2;
    const depth = br.isBoss ? 10 : 7;
    const rad = br.isBoss ? 18 : 12;
    // soft contact shadow
    ctx.fillStyle = 'rgba(0,0,8,0.3)';
    roundRect(x - hw + 4, y - hh + depth + 5, br.w, br.h, rad);
    ctx.fill();
    // extruded side face (3D depth)
    roundRect(x - hw, y - hh + depth, br.w, br.h, rad);
    ctx.fillStyle = col;
    ctx.fill();
    roundRect(x - hw, y - hh + depth, br.w, br.h, rad);
    ctx.fillStyle = 'rgba(0,0,10,0.5)';
    ctx.fill();
    // top face — baked per (colour, size-bucket) so no gradient is allocated
    // per brick per frame (AFT-018, the worst hot-loop violation). Non-boss
    // path only: bosses `continue` above, so the old `if (br.isBoss)` shadow
    // set that lived here was dead code and is gone.
    ctx.drawImage(brickTopSprite(col, br.w, br.h), x - hw, y - hh, br.w, br.h);
    // top edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - hw + rad, y - hh + 1.5);
    ctx.lineTo(x + hw - rad, y - hh + 1.5);
    ctx.stroke();
    // glossy sheen: a soft specular highlight catching the top of the tile,
    // so the cards read as glossy glass rather than matte (cached glow sprite)
    if (!smallCard) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16;
      ctx.drawImage(glowSprite(), x - hw * 0.75, y - hh - hh * 0.15, br.w * 0.75, br.h * 0.7);
      ctx.restore();
    }
    const aCol = br.armored ? armorColor(br) : null;
    ctx.lineWidth = br.armored ? 2.6 : br.isBoss ? 3 : 2;
    ctx.strokeStyle = br.flash > 0 ? '#ffffff' : br.shiny ? '#ffd700' : aCol ? aCol : (br.isBoss && br.phase === 2 ? '#ff8a80' : col);
    ctx.globalAlpha = 0.9 * phased;
    roundRect(x - hw, y - hh, br.w, br.h, rad);
    ctx.stroke();
    ctx.globalAlpha = phased;
    if (br.hp < br.maxHp && !br.isBoss) {
      // gentle dimming only — the HP dial carries the info, the Pokémon stays visible
      roundRect(x - hw, y - hh, br.w, br.h, rad);
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.28, 0.1 * (br.maxHp - br.hp))})`;
      ctx.fill();
    }
    if (SKIN.id === 'pokemon' && br.poke.id === -1) { // MISSINGNO. — glitched static block
      for (let gi = 0; gi < 14; gi++) {
        ctx.fillStyle = ['#dcdcdc', '#9c9c9c', '#5d5d72', '#cfcfe8'][Math.floor(Math.random() * 4)];
        ctx.fillRect(x - hw + 6 + Math.random() * (br.w - 18), y - hh + 6 + Math.random() * (br.h - 16), 5 + Math.random() * 10, 4 + Math.random() * 8);
      }
      ctx.font = '700 8px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText('MISSINGNO.', x, y + hh - 9);
    } else {
      const img = getSprite(br.poke.id, br.shiny);
      if (img.complete && img.naturalWidth) {
        const pop = 1 + br.flash * 0.08;
        if (br.isBoss) {
          // the boss is a standalone centerpiece — let it overflow dramatically
          const s = br.h * 1.12 * pop;
          ctx.drawImage(img, x - s / 2, y - s / 2 - 6, s, s);
        } else {
          // grid sprites sit fully INSIDE their card with breathing room —
          // like a rank of invaders, not artwork spilling over a frame.
          // (clip kept as a safety net for the flash "pop" scale-up)
          const s = Math.min(br.w * 0.76, br.h * 1.02) * pop;
          ctx.save();
          roundRect(x - hw + 2, y - hh + 2, br.w - 4, br.h - 4, Math.max(4, rad - 2));
          ctx.clip();
          ctx.drawImage(img, x - s / 2, y - s / 2 - br.h * 0.02, s, s);
          ctx.restore();
        }
      } else { // still loading: gently pulsing pokéball placeholder
        const pa = 0.16 + 0.08 * Math.sin(G.time * 3 + br.wobble);
        ctx.save();
        ctx.globalAlpha = phased * pa;
        drawGlyph(ctx, SKIN.strings.dexGlyph, x, y, hh * 0.5, '#ffffff');
        ctx.restore();
      }
      if (br.shiny) { // sparkle glints orbiting a shiny
        for (let si = 0; si < 2; si++) {
          const a2 = G.time * 1.8 + si * Math.PI + br.wobble;
          const gx = x + Math.cos(a2) * hw * 0.7, gy = y + Math.sin(a2) * hh * 0.62;
          const tw = 0.5 + 0.5 * Math.sin(G.time * 5 + si * 2);
          ctx.globalAlpha = tw;
          ctx.fillStyle = '#fff7c9';
          ctx.fillRect(gx - 0.8, gy - 4 * tw, 1.6, 8 * tw);
          ctx.fillRect(gx - 4 * tw, gy - 0.8, 8 * tw, 1.6);
          ctx.globalAlpha = 1;
        }
      }
    }
    if (br.flash > 0.4) {
      roundRect(x - hw, y - hh, br.w, br.h, rad);
      ctx.fillStyle = `rgba(255,255,255,${(br.flash - 0.4) * 0.8})`;
      ctx.fill();
    }
    // (bosses `continue` above — the old `if (br.isBoss)` nameplate/bar that
    // lived here was unreachable and is gone, AFT-025b)
    if (br.armored) {
      // ---- armored plating: colour-shifting tint, corner rivets, cracks ----
      // (HP itself lives in the corner dial below, off the artwork)
      roundRect(x - hw, y - hh, br.w, br.h, rad);
      ctx.fillStyle = aCol + '22'; ctx.fill();
      ctx.fillStyle = aCol;
      const rv = Math.max(1.6, br.h * 0.045);
      for (const [ox, oy] of [[1, -1], [-1, 1], [1, 1]]) { // top-left corner hosts the dial
        ctx.beginPath(); ctx.arc(x + ox * (hw - 7), y + oy * (hh - 7), rv, 0, Math.PI * 2); ctx.fill();
      }
      const dmg = br.maxHp - br.hp; // cracks radiate from the centre, one per hit
      if (dmg > 0) {
        ctx.strokeStyle = 'rgba(8,10,22,0.55)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
        for (let i = 0; i < Math.min(dmg, 4); i++) {
          const a = br.wobble * 3 + i * 2.399;
          const ox = Math.cos(a), oy = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(x + ox * hw * 0.14, y + oy * hh * 0.14);
          ctx.lineTo(x + ox * hw * 0.55 - oy * 5, y + oy * hh * 0.55 + ox * 5);
          ctx.lineTo(x + ox * hw * 0.92, y + oy * hh * 0.92);
          ctx.stroke();
        }
      }
    }
    // Region brick behavior tell: a colored corner badge plus a shape cue.
    // The brick stays visually dominant; the badge teaches the extra rule.
    if (br.behavior && BRICK_BEHAVIORS[br.behavior]) {
      const bhv = BRICK_BEHAVIORS[br.behavior];
      if (br.behavior === 'shift' || br.behavior === 'volatile') {
        ctx.strokeStyle = bhv.color + '88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(br.hx - br.w * 0.38, y + hh + 5); ctx.lineTo(br.hx + br.w * 0.38, y + hh + 5); ctx.stroke();
      }
      if (br.behavior === 'link') {
        const mate = G.bricks.find(b => !b.dead && b !== br && b.behavior === 'link' && b.linkGroup === br.linkGroup);
        if (mate) {
          ctx.setLineDash([4, 4]); ctx.strokeStyle = bhv.color + '77'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mate.bx + G.fx, mate.by + G.fy); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      ctx.beginPath(); ctx.arc(x + hw - 10, y - hh + 10, smallCard ? 7 : 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5,8,22,0.88)'; ctx.fill();
      ctx.strokeStyle = bhv.color; ctx.lineWidth = 1.5; ctx.stroke();
      drawGlyph(ctx, bhv.icon, x + hw - 10, y - hh + 10, smallCard ? 3.4 : 4.3, bhv.color);
    }
    const shieldSrc = typeof shieldGeneratorFor === 'function' ? shieldGeneratorFor(br) : null;
    if (shieldSrc) {
      ctx.save();
      ctx.shadowColor = '#66bb6a'; ctx.shadowBlur = 10;
      roundRect(x - hw - 2, y - hh - 2, br.w + 4, br.h + 4, rad + 2);
      ctx.strokeStyle = 'rgba(102,187,106,0.9)'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.restore();
    }
    // HP dial: ring + number, mirroring the type badge — corner-anchored so
    // it never covers the Pokémon. Small cards only show it once damaged;
    // horde-sized cards never do (the damage dimming carries the info).
    if (br.veil) {
      // ENERGY VEIL: a humming cyan casing — the unmistakable tell that only
      // blaster fire gets through (strokes only, no per-frame gradients)
      const va = 0.5 + 0.28 * Math.sin(G.time * 3 + br.wobble);
      ctx.save();
      roundRect(x - hw - 2.5, y - hh - 2.5, br.w + 5, br.h + 5, 9);
      ctx.strokeStyle = `rgba(77,208,225,${va})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = 'rgba(77,208,225,0.25)';
      ctx.lineWidth = 1;
      const sweep = (G.time * 36) % 16;
      for (let vx2 = -hw - 16; vx2 < hw + 16; vx2 += 16) {
        ctx.beginPath();
        ctx.moveTo(x + vx2 + sweep, y - hh);
        ctx.lineTo(x + vx2 + sweep - 9, y + hh);
        ctx.stroke();
      }
      ctx.restore();
      drawGlyph(ctx, 'laser', x - hw + 9, y + hh - 9, 4.5, '#4dd0e1');
    }
    if (!br.isBoss && br.maxHp > 1 && br.hp < br.maxHp && !tinyCard) {
      const cRad = smallCard ? 6.5 : Math.min(10, br.h * 0.22);
      const cX = x - hw + cRad + (smallCard ? 3 : 5);
      const cY = smallCard ? y + hh - cRad - 3 : y - hh + cRad + 5;
      const frac = Math.max(0, br.hp / br.maxHp);
      const hCol = aCol || '#9be7ff';
      ctx.beginPath(); ctx.arc(cX, cY, cRad, 0, Math.PI * 2);
      ctx.fillStyle = smallCard ? 'rgba(6,9,24,0.6)' : 'rgba(6,9,24,0.78)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cX, cY, cRad - 1.6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = smallCard ? 1.8 : 2.4; ctx.lineCap = 'round';
      ctx.strokeStyle = hCol;
      ctx.stroke();
      ctx.font = `900 ${Math.max(6.5, cRad * 0.95)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(Math.ceil(br.hp), cX, cY + 0.5);
    }
    // type badge: symbol + color, so matchups don't rely on card color alone.
    // On small (mobile) cards the chips shrink and drop to the BOTTOM corners
    // so they never sit over the Pokémon's face, and the 2× tag is skipped —
    // the pulsing gold ring carries that signal alone.
    if (br.poke.id !== -1) {
      // junkie: hints reflect the CURRENT attack type (base or temporary)
      const elem = G.mode === 'junkie' ? attackElement() : G.ballElement;
      const strong = elem && (EFFECTIVE[elem] || []).includes(br.poke.t);
      const weak = elem && (RESIST[elem] || []).includes(br.poke.t);
      // small cards keep the Pokémon CLEAN: the badge only appears when it
      // actually says something (your element is strong or weak here)
      if (smallCard && !br.isBoss && !strong && !weak) { ctx.restore(); continue; }
      const bR = br.isBoss ? 12 : tinyCard ? 4.5 : smallCard ? 6.5 : Math.min(10, br.h * 0.22);
      const bx2 = x + hw - bR - (smallCard ? 3 : 5);
      const by2 = br.isBoss ? y - hh + bR + 5 : y + hh - bR - (smallCard ? 3 : 5);
      ctx.beginPath(); ctx.arc(bx2, by2, bR, 0, Math.PI * 2);
      ctx.fillStyle = smallCard ? 'rgba(6,9,24,0.6)' : 'rgba(6,9,24,0.78)'; ctx.fill();
      ctx.lineWidth = strong ? 2 : 1.4;
      ctx.strokeStyle = strong ? `rgba(255,213,79,${0.65 + 0.35 * Math.sin(G.time * 6)})` : weak ? 'rgba(120,130,140,0.9)' : col;
      ctx.stroke();
      drawGlyph(ctx, br.poke.t, bx2, by2, bR * 0.58, weak ? '#78909c' : col);
      if (strong && !smallCard) { // 2× tag pulses over super-effective targets
        ctx.font = `900 ${Math.max(8, bR * 0.9)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd54f';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText('2×', bx2, by2 + bR + 8);
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }
  // boss intro banner
  if (G.bossIntro > 0 && boss && !(G.gauntlet && G.mode === 'junkie')) {
    const a = Math.min(1, (1.6 - G.bossIntro) / 0.4) * Math.min(1, G.bossIntro / 0.25);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const col = TYPE_COLORS[boss.poke.t];
    ctx.shadowColor = col; ctx.shadowBlur = 28;
    fitLabel('★ ' + boss.poke.n.toUpperCase() + ' ★', W / 2, H * 0.42,
      { size: 40, min: 20, weight: 900, color: col, maxW: W - 36, zone: 'field' });
    ctx.shadowBlur = 0;
    fitLabel((boss.mythic ? 'MYTHICAL OF ' : boss.subBoss ? 'SENTINEL OF ' : 'GUARDIAN OF ') + genFor(G.level).name,
      W / 2, H * 0.42 + 40, { size: 16, min: 10, weight: 700, color: '#fff', maxW: W - 40, zone: 'field' });
    ctx.restore();
  }
}

function drawFragments() {
  for (const f of G.fragments) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife) * 0.9;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    // tumbling card piece with shaded edge for 3D feel
    ctx.fillStyle = f.color;
    ctx.fillRect(-f.w / 2, -f.h / 2 + 3, f.w, f.h);
    ctx.fillStyle = 'rgba(0,0,10,0.45)';
    ctx.fillRect(-f.w / 2, -f.h / 2 + 3, f.w, f.h);
    ctx.fillStyle = f.color;
    ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
    ctx.restore();
  }
  for (const gh of G.ghosts) {
    const img = getSprite(gh.id, gh.shiny);
    if (!img.complete || !img.naturalWidth) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, gh.life / gh.maxLife) * 0.85;
    ctx.translate(gh.x, gh.y);
    ctx.rotate(gh.rot);
    ctx.drawImage(img, -gh.s / 2, -gh.s / 2, gh.s, gh.s);
    ctx.restore();
  }
}

// Composable STARFIGHTER hardware. Every tier changes its path's silhouette or
// count without adding another large HUD badge; fixed wing hardpoints remain
// the exact numeric record. Compatible paths occupy separate visual slots.
function drawPilotUpgradeHardware(x, y, s, preview = false) {
  const volley = pathLvl('arsenal'), impact = pathLvl('impact'), prism = pathLvl('prism');
  const aegis = pathLvl('aegis'), surge = pathLvl('surge'), bond = pathLvl('bond');
  if (!(volley || impact || prism || aegis || surge || bond || ownedWebNodeCount())) return;
  const motion = SETTINGS.reduceFlash ? 0.12 : 1;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // SURGE · core slot: ring → kill sparks → power veins → apex crown.
  if (surge) {
    // the ring is a LIVE meter: it brightens as Momentum banks Mega charge,
    // and flares for a beat when a Rally kill deposits a chunk (surgeFlash)
    const flare = Math.min(1, G.surgeFlash || 0);
    const banked = G.megaT > 0 ? 1 : Math.min(1, G.mega) * 0.6;
    const col = PATHS.surge.color, rx = s * 0.5, ry = s * 0.29;
    ctx.globalAlpha = Math.min(1, 0.34 + surge * 0.08 + banked * 0.3 + flare * 0.3);
    ctx.strokeStyle = flare > 0.4 ? '#fff9c4' : col; ctx.lineWidth = 1.3 + surge * 0.28 + flare * 1.2;
    ctx.setLineDash([5 + surge, 5]); ctx.lineDashOffset = -G.time * (12 + banked * 14) * motion;
    ctx.beginPath(); ctx.ellipse(x, y + 4, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (surge >= 2) {
      for (let i = 0; i < Math.min(4, surge + 1); i++) {
        const a = G.time * 0.7 * motion + i * Math.PI * 2 / Math.min(4, surge + 1);
        ctx.fillStyle = i % 2 ? '#fff9c4' : col;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx, y + 4 + Math.sin(a) * ry, 1.5 + (i % 2), 0, Math.PI * 2); ctx.fill();
      }
    }
    if (surge >= 3) {
      ctx.globalAlpha = 0.48;
      for (const dir of [-1, 1]) {
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + dir * 7, y + 10); ctx.lineTo(x + dir * s * 0.34, y + s * 0.25); ctx.stroke();
      }
    }
    if (surge >= 4) {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fffde7'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x - 8, y - s * 0.5); ctx.lineTo(x, y - s * 0.64); ctx.lineTo(x + 8, y - s * 0.5); ctx.stroke();
    }
  }

  // PRISM · lens slot: one facet per owned tier; tier III starts the compass.
  if (prism) {
    const col = PATHS.prism.color, turn = prism >= 3 ? G.time * 0.18 * motion : 0;
    for (let i = 0; i < prism; i++) {
      const a = turn - Math.PI / 4 + i * Math.PI / 2;
      const px = x + Math.cos(a) * s * 0.55, py = y + Math.sin(a) * s * 0.48;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 4);
      ctx.globalAlpha = prism >= 4 ? 0.72 : 0.48 + i * 0.06;
      ctx.fillStyle = col + '55'; ctx.strokeStyle = i === prism - 1 ? '#e0ffff' : col; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // AEGIS · wing/shield slot: sockets and plates remain even between shields.
  if (aegis) {
    const col = PATHS.aegis.color, rr = s * 0.64;
    for (let i = 0; i < aegis + 1; i++) {
      const a = Math.PI * (1.14 + i * (0.72 / Math.max(1, aegis)));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      ctx.globalAlpha = 0.5 + i * 0.06; ctx.fillStyle = col;
      constellationHex(px, py, 2.5 + (aegis >= 2 ? 1 : 0)); ctx.fill();
    }
    ctx.globalAlpha = 0.38 + aegis * 0.07; ctx.strokeStyle = col; ctx.lineWidth = 1.2 + aegis * 0.25;
    ctx.beginPath(); ctx.arc(x, y, rr, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    if (aegis >= 3) {
      ctx.fillStyle = col + '88';
      for (const dir of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + dir * s * 0.34, y + 5); ctx.lineTo(x + dir * s * 0.68, y + 14);
        ctx.lineTo(x + dir * s * 0.5, y + 24); ctx.closePath(); ctx.fill();
      }
    }
    if (aegis >= 4) {
      const a = Math.PI * 1.12 + ((G.time * 0.18 * motion) % 0.76) * Math.PI;
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#e8f5e9';
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // BOND · utility slot: magnet vanes → bond crest → charm → heart canister.
  if (bond) {
    const col = PATHS.bond.color;
    ctx.globalAlpha = 0.8; ctx.strokeStyle = col; ctx.lineWidth = 2.2;
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.arc(x + dir * s * 0.47, y + 8, 6, dir > 0 ? Math.PI * 0.58 : Math.PI * 1.42,
        dir > 0 ? Math.PI * 1.42 : Math.PI * 0.58, dir < 0); ctx.stroke();
    }
    const bx = x + s * 0.44, by = y + s * 0.36;
    if (bond >= 2) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 4.2, Math.PI, 0); ctx.fill();
    }
    if (bond >= 3) { ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(bx, by + 9, 2.8, 0, Math.PI * 2); ctx.fill(); }
    if (bond >= 4) drawGlyph(ctx, 'heart', x - s * 0.44, y + s * 0.36, 5, '#ff80ab');
  }

  // Weapon slots compose last, closest to the nose. VOLLEY owns muzzle count
  // and fins while IMPACT owns bore weight and charge hardware.
  const my = y - s * 0.48;
  if (impact) {
    const col = PATHS.impact.color, br = 5 + impact * 1.15;
    ctx.globalAlpha = 0.76; ctx.strokeStyle = col; ctx.lineWidth = 1.5 + impact * 0.3;
    ctx.beginPath(); ctx.arc(x, my, br, 0, Math.PI * 2); ctx.stroke();
    if (impact >= 2) {
      for (let i = 0; i < 2; i++) {
        const a = G.time * 1.2 * motion + i * Math.PI;
        ctx.fillStyle = '#ffccbc'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (br + 4), my + Math.sin(a) * (br + 4), 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (impact >= 3) {
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (br + 2), my + Math.sin(a) * (br + 2));
        ctx.lineTo(x + Math.cos(a) * (br + 5), my + Math.sin(a) * (br + 5)); ctx.stroke();
      }
    }
    if (impact >= 4) { ctx.globalAlpha = 0.52; ctx.beginPath(); ctx.arc(x, my, br + 7, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (volley) {
    const col = PATHS.arsenal.color;
    ctx.globalAlpha = 0.82; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    if (volley >= 1) { ctx.beginPath(); ctx.arc(x, my, 9 + volley, 0, Math.PI * 2); ctx.stroke(); }
    if (volley >= 2) {
      for (const dir of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + dir * 8, my - 10); ctx.lineTo(x + dir * 13, my); ctx.lineTo(x + dir * 8, my + 5); ctx.stroke();
      }
    }
    if (volley >= 3) {
      for (const dir of [-1, 1]) {
        ctx.fillStyle = '#e0f7ff'; roundRect(x + dir * 7 - 2.5, my - 9, 5, 12, 2); ctx.fill();
      }
    }
    if (volley >= 4) {
      ctx.fillStyle = col + 'aa';
      for (const dir of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + dir * 12, my + 2); ctx.lineTo(x + dir * 23, my + 8); ctx.lineTo(x + dir * 15, my + 13); ctx.closePath(); ctx.fill();
      }
    }
  }

  // ---- BRIDGE SYNERGY hardware: each bridge writes to the slot region
  // BETWEEN its two constellations' gear, so the rig reads as connected —
  // never a new orbiting ring around the pilot.
  if (upgN('calibrated')) { // twin calibration rails bridging the muzzle
    const hot = G.calibShots > 0;
    ctx.globalAlpha = hot ? 0.65 + 0.3 * Math.sin(G.time * 10 * motion) : 0.7;
    ctx.strokeStyle = hot ? '#fff8e1' : '#ffcc80'; ctx.lineWidth = 1.6;
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + dir * 4.5, my - 8); ctx.lineTo(x + dir * 4.5, my + 7); ctx.stroke();
    }
  }
  if (upgN('singularity')) { // the dark prism orb seated in the heavy bore
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#12002a';
    ctx.beginPath(); ctx.arc(x, my, 3.4, 0, Math.PI * 2); ctx.fill();
    // EVENT HORIZON: a bright accretion rim crowns the orb
    ctx.strokeStyle = upgN('horizon') ? '#ffffff' : '#b388ff';
    ctx.lineWidth = upgN('horizon') ? 1.6 : 1.1;
    ctx.stroke();
  }
  if (upgN('aurora')) { // aurora ribbon arcing between lens and power ring
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x + s * 0.34, y - s * 0.05, s * 0.34, -Math.PI * 0.7, Math.PI * 0.28); ctx.stroke();
  }
  if (upgN('reactive')) { // feed lines linking the shield arc to the core
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#dce775'; ctx.lineWidth = 1.4;
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + dir * s * 0.5, y - s * 0.12);
      ctx.quadraticCurveTo(x + dir * s * 0.3, y + 2, x + dir * 8, y + 5); ctx.stroke();
    }
  }
  if (upgN('rescue')) { // lifeline coil + heart at the shield socket
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x - s * 0.6, y - s * 0.1, 4.6, 0, Math.PI * 1.5); ctx.stroke();
    drawGlyph(ctx, 'heart', x - s * 0.6, y - s * 0.1, 2.6, '#ff8a80');
  }
  if (upgN('salvage')) { // two salvage drones docked off the magnet vanes
    ctx.globalAlpha = 0.9;
    for (const dir of [-1, 1]) {
      const dx = x + dir * s * 0.62, dy = y + s * 0.16;
      ctx.fillStyle = '#ea80fc';
      ctx.beginPath(); ctx.moveTo(dx, dy - 4); ctx.lineTo(dx + dir * 4, dy + 3); ctx.lineTo(dx - dir * 3, dy + 3); ctx.closePath(); ctx.fill();
    }
  }
  // ---- FUSION transformations: each writes to its slot with a live
  // READINESS state (stored charges, facets, seeds, stages — always visible)
  if (upgN('meteor')) { // side racks; the motes ARE the matrix charge readout
    ctx.globalAlpha = 0.85; ctx.strokeStyle = '#40c4ff'; ctx.lineWidth = 1.6;
    for (const dir of [-1, 1]) {
      roundRect(x + dir * 15 - 2.5, my - 6, 5, 12, 2); ctx.stroke();
      const a = G.time * (0.8 + (G.matrixCharge || 0) * 2) * motion + (dir > 0 ? 0 : Math.PI);
      ctx.globalAlpha = 0.3 + 0.7 * (G.matrixCharge || 0);
      ctx.fillStyle = G.matrixCharge >= 1 ? '#ffffff' : '#e1f5fe';
      ctx.beginPath(); ctx.arc(x + dir * 15 + Math.cos(a) * 6, my + Math.sin(a) * 6, 1.6 + (G.matrixCharge || 0), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85;
    }
  }
  if (upgN('prismstorm')) { // faceted lens over the muzzles; fills 0-12
    const fill = G.prismReady ? 1 : (G.prismN || 0) / 12;
    ctx.globalAlpha = 0.5 + 0.5 * fill;
    ctx.strokeStyle = G.prismReady ? '#ffffff' : '#64ffda'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const fx2 = x + (i - 2) * 5.5;
      ctx.beginPath(); ctx.moveTo(fx2, my - 12); ctx.lineTo(fx2 + 2.5, my - 7); ctx.lineTo(fx2 - 2.5, my - 7); ctx.closePath();
      if (i / 5 < fill) { ctx.fillStyle = '#64ffda88'; ctx.fill(); }
      ctx.stroke();
    }
  }
  if (upgN('hypernova')) { // heat rings count the active Mega stream stage
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < (G.novaStage || 0) ? 0.9 : 0.22;
      ctx.strokeStyle = i < (G.novaStage || 0) ? '#ffff8d' : '#fff59d';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, my, 12 + i * 3.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
  }
  if (upgN('cataclysm')) { // collapsed reactor ring; glows when the cost is banked
    const armed = G.megaT <= 0 && G.mega >= 0.5 && (G.cataCD || 0) <= 0;
    ctx.globalAlpha = armed ? 0.7 + 0.25 * Math.sin(G.time * 5 * motion) : 0.3;
    ctx.strokeStyle = armed ? '#ffab40' : '#8d6e63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, my + 2, 8, 3.2, G.time * 0.8 * motion, 0, Math.PI * 2); ctx.stroke();
  }
  if (upgN('lance')) { // shield plates rotate forward while a spend is possible
    const armed = G.shieldCharges > 0;
    ctx.globalAlpha = armed ? 0.85 : 0.3;
    ctx.fillStyle = '#d4e157';
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + dir * 6, my - 10); ctx.lineTo(x + dir * 9, my + 2); ctx.lineTo(x + dir * 3.5, my - 2); ctx.closePath(); ctx.fill();
    }
  }
  if (upgN('shepherd')) { // banked comet seeds orbit the rear rig
    for (let i = 0; i < 3; i++) {
      const a = G.time * 1.1 * motion + i * Math.PI * 2 / 3;
      const lit = i < (G.cometSeeds || 0);
      ctx.globalAlpha = lit ? 0.95 : 0.2;
      ctx.fillStyle = lit ? '#ffab91' : '#6d4c41';
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.5, y + s * 0.42 + Math.sin(a) * 5, lit ? 2.4 : 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (upgN('mirror')) { // captured facets ring the shield in their OWN types
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * (1.2 + i * 0.3);
      const t = (G.facets || [])[i];
      ctx.globalAlpha = t ? 0.95 : 0.22;
      ctx.fillStyle = t ? (TYPE_COLORS[t] || '#80cbc4') : '#455a64';
      ctx.save(); ctx.translate(x + Math.cos(a) * s * 0.72, y + Math.sin(a) * s * 0.62); ctx.rotate(a);
      ctx.fillRect(-3, -1.6, 6, 3.2); ctx.restore();
    }
  }
  if (upgN('chorus')) { // recorded type outlines gather behind the crest
    for (let i = 0; i < 3; i++) {
      const t = (G.chorusTypes || [])[i];
      ctx.globalAlpha = t ? 0.85 : 0.2;
      ctx.strokeStyle = t ? (TYPE_COLORS[t] || '#f48fb1') : '#607d8b'; ctx.lineWidth = 1.3;
      constellationHex(x + (i - 1) * 9, y + s * 0.56, 3.4, Math.PI / 6); ctx.stroke();
    }
  }
  if (upgN('formation')) { // the sync meter arcs under the power ring
    const fill = Math.min(1, (G.syncMeter || 0) / 8);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = 'rgba(255,209,128,0.25)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(x, y + 4, s * 0.58, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    if (fill > 0) {
      ctx.strokeStyle = fill >= 1 ? '#ffffff' : '#ffd180';
      ctx.beginPath(); ctx.arc(x, y + 4, s * 0.58, Math.PI * 0.15, Math.PI * (0.15 + 0.7 * fill)); ctx.stroke();
    }
    if (G.squadT > 0) { // the squadron holds its V while the call lasts
      for (const dir of [-1, 1]) {
        const wx = x + dir * s * 0.95, wy = y - s * 0.05 + Math.sin(G.time * 3 * motion + dir) * 3;
        ctx.fillStyle = '#ffd180';
        ctx.beginPath(); ctx.moveTo(wx, wy - 5); ctx.lineTo(wx + dir * 5, wy + 4); ctx.lineTo(wx - dir * 4, wy + 4); ctx.closePath(); ctx.fill();
      }
    }
  }
  // ---- APEX transformations: the rig itself changes
  if (upgN('warmachine')) { // the fold: pressure gauge + swapping silhouette
    const p = G.railPressure || 0;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = 'rgba(255,110,64,0.3)'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x - 11, my + 9); ctx.lineTo(x + 11, my + 9); ctx.stroke();
    if (p > 0) {
      ctx.strokeStyle = p > 0.6 ? '#ffab91' : '#ff6e40';
      ctx.beginPath(); ctx.moveTo(x - 11, my + 9); ctx.lineTo(x - 11 + 22 * p, my + 9); ctx.stroke();
    }
    if (p > 0.6) { // the rail form asserts itself: a long amber barrel sleeve
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ff6e40'; ctx.lineWidth = 2;
      roundRect(x - 3, my - 16, 6, 18, 2); ctx.stroke();
    }
  }
  if (upgN('celestial')) { // three halo sectors: type / shield / bond
    const secs = [[G.celT, '#18ffff'], [G.celS, '#66bb6a'], [G.celE, '#ec407a']];
    for (let i = 0; i < 3; i++) {
      const a0 = -Math.PI / 2 + i * Math.PI * 2 / 3 + 0.12;
      ctx.globalAlpha = secs[i][0] ? 0.85 : 0.22;
      ctx.strokeStyle = secs[i][0] ? secs[i][1] : '#546e7a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(x, y - s * 0.08, s * 0.66, a0, a0 + Math.PI * 2 / 3 - 0.24); ctx.stroke();
    }
  }
  if (upgN('ascension')) { // rainbow lens halo above the crown
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `hsl(${(G.time * 40 * motion + i * 72) % 360},85%,65%)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y - s * 0.7, 7 + i * 1.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
  }
  if (upgN('immortal')) { // armored reactor shell — cracked + dim once spent
    const spent = G.reactorUsed;
    ctx.globalAlpha = spent ? 0.35 : 0.8;
    ctx.strokeStyle = spent ? '#9e9d24' : '#ffea00'; ctx.lineWidth = 2;
    ctx.setLineDash(spent ? [3, 6] : [8, 4]);
    ctx.beginPath(); ctx.ellipse(x, y + 4, s * 0.56, s * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (upgN('guardian')) { // guardian sigil behind the pilot, EIGHT pips filling
    ctx.globalAlpha = G.guardPulsedWave ? 0.28 : 0.5; // spent this wave = resting
    ctx.strokeStyle = '#b9f6ca'; ctx.lineWidth = 1.6;
    constellationHex(x, y - s * 0.1, s * 0.52, Math.PI / 6); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 4;
      ctx.fillStyle = i < (G.guardCharge || 0) ? '#b9f6ca' : 'rgba(185,246,202,0.2)';
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.52, y - s * 0.1 + Math.sin(a) * s * 0.52, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (upgN('acewing')) { // two wingmate formation lights holding station
    for (const dir of [-1, 1]) {
      const wx = x + dir * s * 0.85, wy = y + s * 0.1 + Math.sin(G.time * 2.4 * motion + dir) * 3;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ff80ab';
      ctx.beginPath(); ctx.moveTo(wx, wy - 5); ctx.lineTo(wx + dir * 5, wy + 4); ctx.lineTo(wx - dir * 4, wy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(wx, wy, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ---- SPACE JUNKIE ship: no paddle at all — the pilot IS the ship. A bare
// Pokémon with an element-colored aura and jet exhaust, banking with your
// movement and free to fly vertically inside its band. A Charmeleon riding
// a grass element visibly runs green from aura to exhaust to muzzle.
function drawPilotRig(x, py, preview = false) {
  const pil = pilotInfo();
  const col = TYPE_COLORS[attackElement()] || '#80d8ff';
  const mega = G.megaT > 0;
  const s = preview ? 42 + G.starterLvl * 3 : pilotRigSize(G.starterLvl);
  const bob = Math.sin(G.time * 3.2) * (preview ? 1.2 : 2.5);
  const y = py + bob;
  const tilt = preview ? 0 : Math.max(-0.34, Math.min(0.34, G.paddle.speed * 0.00028));
  // AFT-023: friendly bloom YIELDS to incoming fire — when a hostile shot
  // is inside the ship band, the "this is you" glow dims (like padBusy())
  // so the threat, not your own aura, owns the pixels near the vessel.
  // Read-only scan; hostile art is untouched and stays on top of nothing —
  // it draws UNDER the rig, so the rig's light is what must step back.
  let threatNear = false;
  if (!preview) {
    for (const es of G.enemyShots) {
      if (es.dead) continue;
      if (Math.hypot(es.x - x, es.y - py) < s * 1.3 + 40) { threatNear = true; break; }
    }
  }
  const bloomYield = threatNear ? 0.4 : 1;
  // element aura — the "this is you" glow (AFT-018b: baked once per colour,
  // drawn in local space so one sprite serves every position/size)
  {
    const gk = 'rigaura_' + col;
    if (!fxCache[gk]) {
      const c2 = document.createElement('canvas'); c2.width = c2.height = 128;
      const q = c2.getContext('2d');
      const g2 = q.createRadialGradient(64, 64, 3, 64, 64, 62);
      g2.addColorStop(0, col + '3c'); g2.addColorStop(0.7, col + '14'); g2.addColorStop(1, col + '00');
      q.fillStyle = g2; q.beginPath(); q.arc(64, 64, 62, 0, Math.PI * 2); q.fill();
      fxCache[gk] = c2;
    }
    const d = s * 1.6;
    ctx.globalAlpha = bloomYield;
    ctx.drawImage(fxCache[gk], x - d / 2, y - d / 2, d, d);
    ctx.globalAlpha = 1;
  }
  // AFFINITY HALO (light/dark skins): the chosen path rides the pilot — a
  // slow-breathing ring in radiant gold or umbral violet, brighter under Mega
  const affCol = affinityColor();
  if (affCol && !preview) {
    // AFT-017: the halo follows the oath arc — a faint mark at Form I, the
    // full breathing ring only at Form III. Reduced-effects stills the pulse
    // but keeps the material progression.
    const auraCh = oathCh('aura', G.starterLvl);
    const breathe = SETTINGS.reduceFlash ? 0.65 : 0.55 + 0.25 * Math.sin(G.time * (mega ? 6 : 2.2));
    ctx.save();
    ctx.globalAlpha = (mega ? 0.5 : 0.3) * breathe * (0.35 + 0.65 * auraCh);
    ctx.strokeStyle = affCol; ctx.lineWidth = (mega ? 2.4 : 1.6) * (0.6 + 0.4 * auraCh);
    ctx.beginPath(); ctx.arc(x, y, s * (0.62 + 0.05 * breathe), 0, Math.PI * 2); ctx.stroke();
    if (SETTINGS.affinity === 'light' && (G.starterLvl || 1) >= 2) { // glints arrive at Form II
      ctx.fillStyle = affCol;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + (SETTINGS.reduceFlash ? 0 : G.time * 0.5);
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.64, y + Math.sin(a) * s * 0.64, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  // jet exhaust under the mon, flickering in the element color
  const fl = (preview ? 0.68 : 1) + 0.35 * Math.sin(G.time * 26) + 0.18 * Math.sin(G.time * 57);
  ctx.save();
  ctx.translate(x, y + s * 0.34);
  ctx.rotate(tilt * 0.6);
  const jk = 'rigjet_' + col + '_' + Math.round(fl * 10); // AFT-018b: ~12 buckets
  if (!fxCache[jk]) {
    const jg = ctx.createLinearGradient(0, 0, 0, 28 * (Math.round(fl * 10) / 10));
    jg.addColorStop(0, '#ffffff'); jg.addColorStop(0.35, col); jg.addColorStop(1, col + '00');
    fxCache[jk] = jg;
  }
  ctx.fillStyle = fxCache[jk];
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-4, 14 * fl, 0, 26 * fl);
  ctx.quadraticCurveTo(4, 14 * fl, 7, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  drawPilotUpgradeHardware(x, y, s, preview);
  // ---- the pilot itself, with a pseudo-3D treatment: a soft drop shadow
  // below-right, an element-colored rim light behind, and — when firing —
  // a real ATTACK animation: the mon lunges nose-up with squash & stretch
  // and flashes from within, like a battle attack frame.
  const atk = Math.min(1, G.attackAnim);           // 1 at the shot, decays fast
  const lungeY = -9 * atk;                          // lunge upward into the shot
  const sclX = 1 - 0.09 * atk, sclY = 1 + 0.14 * atk; // stretch into the attack
  const img = affinityVesselImage(pil.id);
  const ok = !!(img && img.complete && img.naturalWidth);
  const shadow = ok && pil.id > 0 ? getSilhouette(pil.id, '#060a18') : null;
  const rim = ok && pil.id > 0 ? getSilhouette(pil.id, col) : null;
  const flash = ok && pil.id > 0 ? getSilhouette(pil.id, '#ffffff') : null;
  ctx.save();
  ctx.translate(x, y + lungeY);
  ctx.rotate(tilt - 0.09 * atk);
  ctx.scale(sclX, sclY);
  if (shadow) { // depth: soft shadow cast down-right
    ctx.globalAlpha = 0.34;
    ctx.drawImage(shadow, -s / 2 + 5, -s / 2 + 7, s, s * 0.96);
    ctx.globalAlpha = 1;
  }
  if (rim) { // element rim light — brightens as the attack fires
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.3 + 0.45 * atk + (mega ? 0.2 : 0)) * bloomYield; // AFT-023: yields to nearby hostile fire
    const rs = s * 1.07;
    ctx.drawImage(rim, -rs / 2, -rs / 2 - 1.5, rs, rs);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.shadowColor = mega ? `hsl(${(G.time * 160) % 360},90%,60%)` : col;
  ctx.shadowBlur = fxGlow((mega ? 26 : 12 + 14 * atk) * bloomYield); // AFT-018b whole-sprite blur · AFT-023 yields near threats
  if (ok) drawAffinityVessel(pil.id, 0, 0, s);
  else {
    // Safe loading fallback for the authored neutral training drone.
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(22, 12); ctx.lineTo(8, 8); ctx.lineTo(0, 17);
    ctx.lineTo(-8, 8); ctx.lineTo(-22, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-12, 9); ctx.lineTo(12, 9); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  if (flash && atk > 0.05) { // the attack flash — the mon lights up from within
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * atk;
    ctx.drawImage(flash, -s / 2, -s / 2, s, s);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // ---- the WING LOADOUT DOCK. Held items used to orbit the pilot on a ring
  // that crossed the sprite every second — now they rack up as fixed
  // HARDPOINTS under the wings, ordnance-style: paths fill outward from the
  // fuselage in a stable order (a build always lives in the same slot),
  // alternating left/right, angled slightly with the ship's tilt. One chip
  // per PATH/stack category keeps 24 icons from burying the pilot, and the
  // count preserves exact progression information.
  if (!preview) {
    const badges = [];
    for (const pk of PATH_KEYS) {
      const lvl = pathLvl(pk);
      if (lvl) badges.push({ icon: PATHS[pk].tiers[lvl - 1].icon, color: PATHS[pk].color, count: lvl, capped: lvl >= 4 });
    }
    for (const si of STACK_ITEMS) {
      const n = (G.stacks && G.stacks[si.key]) || 0;
      if (n) badges.push({ icon: si.icon, color: si.color, count: n });
    }
    // bridges, fusions and the apex rack their own hardpoint chips
    for (const b of WEB_BRIDGES) if (upgN(b.key)) badges.push({ icon: b.icon, color: b.color, count: 1 });
    for (const f of WEB_FUSIONS) if (upgN(f.key)) badges.push({ icon: f.icon, color: f.color, count: 1, capped: true });
    for (const x of WEB_APEXES) if (upgN(x.key)) badges.push({ icon: x.icon, color: x.color, count: 1, capped: true });
    const maxBadges = IS_TOUCH ? 5 : 6;
    const shown = badges.slice(0, maxBadges);
    const extra = Math.max(0, badges.length - shown.length);
    if (shown.length) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.5); // the rack banks WITH the ship
      for (let i = 0; i < shown.length; i++) {
        // slots fan outward: 1st left wing, 2nd right wing, 3rd far left…
        const side = i % 2 ? 1 : -1;
        const rank = Math.floor(i / 2);
        const bx2 = side * (s * 0.42 + 12 + rank * 17);
        const by2 = s * 0.34 + 6 + rank * 3.5; // outer slots trail slightly
        const b = shown[i];
        ctx.save();
        ctx.translate(bx2, by2);
        ctx.rotate(Math.PI / 4); // diamond chip = mounted ordnance, not UI
        ctx.globalAlpha = 0.95;
        roundRect(-6.5, -6.5, 13, 13, 3);
        ctx.fillStyle = 'rgba(8,12,28,0.88)'; ctx.fill();
        ctx.lineWidth = b.capped ? 1.8 : 1.2;
        ctx.strokeStyle = b.color; ctx.stroke();
        if (b.capped) { // a mastered path's hardpoint glints
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.time * 4 + i);
          ctx.stroke();
          ctx.globalAlpha = 0.95;
        }
        ctx.rotate(-Math.PI / 4);
        drawGlyph(ctx, b.icon, 0, 0, 3.8, b.color);
        ctx.restore();
        if (b.count > 1) {
          ctx.font = '900 6.5px Orbitron, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(String(b.count), bx2 + 8, by2 + 8);
        }
      }
      if (extra > 0) {
        ctx.font = '900 8px Orbitron, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd54f';
        const lastRank = Math.floor((shown.length - 1) / 2);
        ctx.fillText('+' + extra, 0, s * 0.34 + 20 + lastRank * 3.5);
      }
      ctx.restore();
    }
  }
  // muzzle flash at the nose, in the element color
  if (!preview && G.muzzle > 0) {
    const m = G.muzzle / 0.18;
    const my = y - s * 0.55;
    const fg = ctx.createRadialGradient(x, my, 0, x, my, 16 * m);
    fg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * m).toFixed(3) + ')');
    fg.addColorStop(0.5, col + 'aa');
    fg.addColorStop(1, col + '00');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(x, my, 16 * m, 0, Math.PI * 2); ctx.fill();
  }
  // blaster heat gauge rides below the exhaust — full bar = overheat lockout
  if (!preview && (G.heat > 0.02 || G.overheat > 0)) {
    const hw2 = 46, hy = py + s * 0.62 + 12;
    const hot = G.overheat > 0;
    ctx.globalAlpha = hot ? 0.55 + 0.4 * Math.abs(Math.sin(G.time * 8)) : 0.85;
    roundRect(x - hw2 / 2, hy - 3, hw2, 6, 3);
    ctx.fillStyle = 'rgba(10,14,30,0.75)'; ctx.fill();
    const frac = hot ? 1 - Math.min(1, (OVERHEAT_DUR - G.overheat) / OVERHEAT_DUR) : G.heat;
    if (frac > 0.01) {
      roundRect(x - hw2 / 2, hy - 3, hw2 * Math.min(1, frac), 6, 3);
      // COOLANT's persistent tell lives on the gauge itself: a teal-running
      // loop while heat is managed, so the cooler curve is visibly YOURS
      ctx.fillStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : frac > 0.33 ? '#ffd54f'
        : (upgN('coolant') ? '#4dd0e1' : '#80d8ff');
      ctx.fill();
    }
    if (hot) {
      ctx.font = '700 9px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff8a80';
      ctx.fillText('OVERHEAT', x, hy + 12);
    } else if (SETTINGS.visualCues && !IS_TOUCH && SETTINGS.autoFire && G.autoVent) {
      // AFT-010: the vent state was named only on the touch FIRE pad —
      // with VISUAL SOUND CUES on, the desktop gauge says it too
      ctx.font = '700 9px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb74d';
      ctx.fillText('VENTING', x, hy + 12);
    }
    ctx.globalAlpha = 1;
  }
}

// Every permanent pick leaves hardware behind. The compact rail fits all 20
// authored tiers on a normal paddle; late mastery items orbit its ends. SPACE
// JUNKIE already expresses the same information as held-item badges around the
// Pokémon pilot, so this rail is for the two paddle modes.
function drawBuildRail(x, py, pw, ph) {
  if (G.mode === 'junkie') return;
  // web nodes (bridges + superskills) dock as DIAMOND sockets after the round
  // path sockets — same rail, so the paddle rig stays the single build record
  const webOwned = [
    ...WEB_BRIDGES.filter(b => upgN(b.key)),
    ...WEB_FUSIONS.filter(f => upgN(f.key)),
    ...WEB_APEXES.filter(x => upgN(x.key)),
  ];
  const socketN = totalPathLevels() + webOwned.length;
  if (socketN) {
    const railW = Math.min(pw - 22, Math.max(26, socketN * 7));
    const gap = socketN > 1 ? railW / (socketN - 1) : 0;
    const sy = py + ph / 2 + 3;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(225,245,254,0.35)';
    ctx.beginPath(); ctx.moveTo(x - railW / 2 - 4, sy); ctx.lineTo(x + railW / 2 + 4, sy); ctx.stroke();
    let socketI = 0;
    for (const pk of PATH_KEYS) {
      const P = PATHS[pk], lvl = pathLvl(pk);
      for (let i = 0; i < lvl; i++, socketI++) {
        const sx = socketN > 1 ? x - railW / 2 + socketI * gap : x;
        ctx.beginPath(); ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = P.color; ctx.fill();
        ctx.strokeStyle = '#102033'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    for (const node of webOwned) {
      const sx = socketN > 1 ? x - railW / 2 + socketI * gap : x;
      socketI++;
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = node.color;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeStyle = '#102033'; ctx.lineWidth = 1; ctx.strokeRect(-3, -3, 6, 6);
      ctx.restore();
    }
    ctx.restore();
  }
  // classic wingmates / stored salvage drones hover as small station lights
  if ((upgN('acewing') || G.salvageStored > 0) && G.mode === 'classic') {
    for (let i = 0; i < Math.max(G.salvageStored, upgN('acewing') ? 2 : 0); i++) {
      const lit = i < G.salvageStored;
      const dir = i % 2 ? 1 : -1;
      const wx = x + dir * (pw / 2 + 22), wy = py - 14 + Math.sin(G.time * 2.2 + i) * 2.5;
      ctx.save();
      ctx.globalAlpha = lit ? 0.95 : 0.35;
      ctx.fillStyle = '#ea80fc';
      ctx.beginPath(); ctx.moveTo(wx, wy - 4); ctx.lineTo(wx + dir * 4, wy + 3); ctx.lineTo(wx - dir * 3, wy + 3); ctx.closePath(); ctx.fill();
      if (lit) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wx, wy, 1.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }
  // Mastery stacks remain individually countable after the main tree caps.
  let mi = 0;
  for (const item of STACK_ITEMS) {
    const n = (G.stacks && G.stacks[item.key]) || 0;
    if (!n) continue;
    const side = mi % 2 ? 1 : -1;
    const mx = x + side * (pw / 2 + 10 + Math.floor(mi / 2) * 14), my = py - 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,12,28,0.9)'; ctx.fill();
    ctx.strokeStyle = item.color; ctx.lineWidth = 1.4; ctx.stroke();
    drawGlyph(ctx, item.icon, mx, my, 3.8, item.color);
    ctx.font = '900 7px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(String(n), mx, my + 11);
    ctx.restore();
    mi++;
  }
}

function drawPaddle() {
  const pw = paddleW(), py = shipY(), x = G.paddle.x; // shipY === PADDLE_Y outside junkie
  const blink = G.invuln > 0 && Math.floor(G.time * 12) % 2 === 0;
  if (blink) return;
  const sq = 1 + G.paddle.squash * 0.25; // squash & stretch on bounce
  const ph = G.paddle.h * sq, pwv = pw * (2 - sq);
  ctx.save();
  const mega = G.megaT > 0;
  // MEGA READY cue: a soft golden halo that breathes under the paddle plus a
  // slow ring "ping" — right where your eyes already are, so a full meter is
  // impossible to miss, yet gold + low-alpha + slow keeps it in the scenery
  const megaReady = !mega && G.mega >= 1 && (G.state === 'play' || G.state === 'serve');
  if (megaReady) {
    // the cue hugs the CHARACTER, never the paddle STAT — Tailwind/WIDE push
    // paddleW past 300px, which turned this halo into a screen-wide ellipse
    // over the junkie pilot (owner-reported, 2026-07-21)
    const cueW = G.mode === 'junkie' ? Math.min(pwv, 84) : pwv;
    const pulse = 0.5 + 0.5 * Math.sin(G.time * 3);
    const hr = cueW * 0.7 + 16 + 8 * pulse;
    const hg = ctx.createRadialGradient(x, py, 6, x, py, hr);
    hg.addColorStop(0, `rgba(255,213,79,${0.15 + 0.12 * pulse})`);
    hg.addColorStop(0.6, `rgba(255,213,79,${0.05 + 0.05 * pulse})`);
    hg.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(x, py, hr, hr * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    const tp = (G.time % 1.6) / 1.6; // one ping every 1.6s, grows and fades
    const rr = cueW * 0.5 + tp * 48;
    ctx.globalAlpha = (1 - tp) * 0.4;
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, py, rr, rr * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // SPACE JUNKIE mode: no paddle — you ARE the Pokémon
  if (G.mode === 'junkie') { drawPilotRig(x, py); ctx.restore(); return; }
  const sMon = SKIN.starterMon[G.starter];
  // the partner rides the left end of the paddle, growing as it evolves
  if (sMon && G.state !== 'menu') {
    const img = getSprite(sMon.ids[G.starterLvl - 1]);
    if (img.complete && img.naturalWidth) {
      const s = 26 + G.starterLvl * 5;
      const bob = Math.sin(G.time * 3) * 2;
      ctx.drawImage(img, x - pw / 2 - s * 0.35, py - s + 4 + bob, s, s);
    }
  }
  ctx.shadowColor = mega ? `hsl(${(G.time * 160) % 360},90%,60%)` : (G.fx_laser ? '#ffd54f' : (G.starter ? TYPE_COLORS[G.starter] : '#42a5f5'));
  ctx.shadowBlur = fxGlow(mega ? 26 : 18); // AFT-018b: whole-hull blur
  // hull palette matches the starter — the paddle IS your partner's rig
  const HULLS = {
    fire:  ['#ffe0b2', '#ff8a50', '#bf360c'],
    water: ['#e1f5fe', '#4fc3f7', '#01579b'],
    grass: ['#dcedc8', '#81c784', '#1b5e20'],
  };
  const baseHull = TYPE_COLORS[G.starter];
  const hull = HULLS[G.starter] || (baseHull
    ? [mixHex(baseHull, '#ffffff', 0.72), baseHull, mixHex(baseHull, '#020617', 0.55)]
    : ['#e3f2fd', '#64b5f6', '#1565c0']);
  const g = ctx.createLinearGradient(x, py - 10, x, py + 10);
  if (mega) {
    g.addColorStop(0, '#fff9c4'); g.addColorStop(0.5, `hsl(${(G.time * 160) % 360},85%,62%)`); g.addColorStop(1, '#7b1fa2');
  } else {
    g.addColorStop(0, hull[0]); g.addColorStop(0.5, hull[1]); g.addColorStop(1, hull[2]);
  }
  roundRect(x - pwv / 2, py - ph / 2, pwv, ph, 9);
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0;
  // ---- the DAMAGE CORE readout (classic): enemy fire only hurts the
  // center segment; the wings beyond it are deflector armor. Once fire is
  // part of the wave (level 2+), the vulnerable core glows warm so the
  // "small kill zone" rule is visible right on the hull. Pure fills — no
  // per-frame gradient/shadow work.
  if (G.mode === 'classic' && G.level >= 2 && (G.state === 'play' || G.state === 'serve')) {
    const coreW = Math.min(pwv, classicCoreHalf() * 2 * (2 - sq));
    const pulseC = 0.16 + 0.08 * Math.sin(G.time * 4);
    roundRect(x - coreW / 2, py - ph / 2 + 1.5, coreW, ph - 3, 7);
    ctx.fillStyle = `rgba(255,120,80,${pulseC})`; ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255,180,140,${0.4 + 0.2 * Math.sin(G.time * 4)})`;
    roundRect(x - coreW / 2, py - ph / 2 + 1.5, coreW, ph - 3, 7); ctx.stroke();
    if (pwv > coreW + 18) { // faint armor sheen on the wings when they exist
      ctx.fillStyle = 'rgba(176,227,255,0.10)';
      roundRect(x - pwv / 2 + 2, py - ph / 2 + 2, (pwv - coreW) / 2 - 5, ph - 4, 6); ctx.fill();
      roundRect(x + coreW / 2 + 3, py - ph / 2 + 2, (pwv - coreW) / 2 - 5, ph - 4, 6); ctx.fill();
    }
  }
  // ---- starter styling: the rig grows more elaborate at each evolution ----
  const sLvl = G.starterLvl;
  if (G.starter === 'fire') {
    // flickering flame tips on both ends; a crest row at final form
    for (const dir of [-1, 1]) {
      for (let f = 0; f < sLvl; f++) {
        const fx2 = x + dir * (pwv / 2 - 2 - f * 7);
        const flick = 1 + 0.3 * Math.sin(G.time * 11 + f * 2 + dir);
        const fh = (9 + sLvl * 2.5) * flick;
        ctx.fillStyle = f % 2 ? '#ffd54f' : '#ff7043';
        ctx.beginPath();
        ctx.moveTo(fx2 - 3.5, py - ph / 2 + 1);
        ctx.quadraticCurveTo(fx2 + dir * 2.5, py - ph / 2 - fh * 0.6, fx2, py - ph / 2 - fh);
        ctx.quadraticCurveTo(fx2 - dir * 2.5, py - ph / 2 - fh * 0.5, fx2 + 3.5, py - ph / 2 + 1);
        ctx.closePath(); ctx.fill();
      }
    }
  } else if (G.starter === 'water') {
    // shell end-caps; at final form the Blastoise cannons come out
    ctx.fillStyle = '#b3e5fc';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + dir * (pwv / 2 - 4), py, ph * (0.6 + sLvl * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
    if (sLvl >= 3) {
      ctx.fillStyle = '#90a4ae';
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(x + dir * pwv * 0.3, py - ph / 2);
        ctx.rotate(dir * 0.25);
        roundRect(-4, -16, 8, 16, 3); ctx.fill();
        ctx.fillStyle = '#eceff1'; ctx.fillRect(-3, -16, 6, 3); ctx.fillStyle = '#90a4ae';
        ctx.restore();
      }
    } else if (sLvl >= 2) { // water-jet nubs
      ctx.fillStyle = '#4fc3f7';
      for (const dir of [-1, 1]) roundRect(x + dir * pwv * 0.3 - 3, py - ph / 2 - 7, 6, 8, 2), ctx.fill();
    }
  } else if (G.starter === 'grass') {
    // leaf tips; petals at 2; a swaying frond crest at final form
    ctx.fillStyle = '#81c784';
    for (const dir of [-1, 1]) {
      for (let f = 0; f < Math.min(2, sLvl); f++) {
        const lx2 = x + dir * (pwv / 2 - 3 - f * 8);
        ctx.save();
        ctx.translate(lx2, py - ph / 2);
        ctx.rotate(dir * (0.5 + f * 0.3) + Math.sin(G.time * 2 + f) * 0.12);
        ctx.beginPath(); ctx.ellipse(0, -7, 3.5, 8 + sLvl * 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    if (sLvl >= 3) { // Venusaur frond crest behind the core
      ctx.fillStyle = '#66bb6a';
      for (let f = -2; f <= 2; f++) {
        ctx.save();
        ctx.translate(x + f * 9, py - ph / 2);
        ctx.rotate(f * 0.35 + Math.sin(G.time * 1.6 + f) * 0.1);
        ctx.beginPath(); ctx.ellipse(0, -11, 4, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  } else if (G.starter) {
    // Every additional type gets a readable identity even without a bespoke
    // silhouette: typed end-caps, a central crest, and one rank pip per form.
    const tcol = TYPE_COLORS[G.starter];
    ctx.fillStyle = mixHex(tcol, '#ffffff', 0.35);
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.arc(x + dir * (pwv / 2 - 5), py, 5 + sLvl, 0, Math.PI * 2); ctx.fill();
    }
    drawGlyph(ctx, G.starter, x, py, 6 + sLvl, '#ffffff');
    for (let i = 0; i < sLvl; i++) {
      ctx.fillStyle = i === sLvl - 1 ? '#ffffff' : tcol;
      ctx.beginPath(); ctx.arc(x + (i - (sLvl - 1) / 2) * 12, py + ph / 2 + 5, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // VOLLEY adds barrels/cycle fins; IMPACT thickens the amber bore. Their
  // silhouettes make the two weapon builds readable before either one fires.
  const volley = pathLvl('arsenal'), impact = pathLvl('impact');
  const barrelW = 7 + volley * 0.7 + impact * 1.1, barrelH = 12 + volley * 1.1 + impact * 1.6;
  // weapon barrels draw only when the paddle actually fires — never in calm classic
  const barrels = blasterArmed() ? (upgN('twin') ? [-10, 10] : [0]) : [];
  for (const off of barrels) {
    if (impact) { ctx.shadowColor = PATHS.impact.color; ctx.shadowBlur = 5 + impact * 1.5; }
    ctx.fillStyle = G.blasterCD > 0 ? '#546e7a' : (impact ? '#ffccbc' : '#cfd8dc');
    roundRect(x + off - barrelW / 2, py - 12 - barrelH, barrelW, barrelH, 3); ctx.fill();
    ctx.shadowBlur = 0;
    if (volley) {
      ctx.fillStyle = PATHS.arsenal.color;
      ctx.fillRect(x + off - barrelW / 2, py - 15 - barrelH, barrelW, 3);
    }
  }
  if (G.muzzle > 0) { // muzzle flash on blaster fire
    const m = G.muzzle / 0.12;
    const fg = ctx.createRadialGradient(x, py - 28, 0, x, py - 28, 14 * m);
    fg.addColorStop(0, 'rgba(255,255,220,' + 0.9 * m + ')');
    fg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(x, py - 28, 14 * m, 0, Math.PI * 2); ctx.fill();
  }
  // blaster heat gauge rides on the paddle — full bar = overheat lockout
  if (G.heat > 0.02 || G.overheat > 0) {
    const hw2 = 46, hy = py + 18;
    const hot = G.overheat > 0;
    ctx.globalAlpha = hot ? 0.55 + 0.4 * Math.abs(Math.sin(G.time * 8)) : 0.85;
    roundRect(x - hw2 / 2, hy - 3, hw2, 6, 3);
    ctx.fillStyle = 'rgba(10,14,30,0.75)'; ctx.fill();
    const frac = hot ? 1 - Math.min(1, (OVERHEAT_DUR - G.overheat) / OVERHEAT_DUR) : G.heat;
    if (frac > 0.01) {
      roundRect(x - hw2 / 2, hy - 3, hw2 * Math.min(1, frac), 6, 3);
      // COOLANT's persistent tell lives on the gauge itself: a teal-running
      // loop while heat is managed, so the cooler curve is visibly YOURS
      ctx.fillStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : frac > 0.33 ? '#ffd54f'
        : (upgN('coolant') ? '#4dd0e1' : '#80d8ff');
      ctx.fill();
    }
    if (hot) {
      ctx.font = '700 9px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff8a80';
      ctx.fillText('OVERHEAT', x, hy + 12);
    } else if (SETTINGS.visualCues && !IS_TOUCH && SETTINGS.autoFire && G.autoVent) {
      // AFT-010: mirror the touch pad's vent word on the desktop gauge too
      ctx.font = '700 9px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb74d';
      ctx.fillText('VENTING', x, hy + 12);
    }
    ctx.globalAlpha = 1;
  }
  if (SKIN.id === 'pokemon') {
    ctx.beginPath(); ctx.arc(x, py, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, py, 11, Math.PI, 0, true);
    ctx.fillStyle = '#ef5350'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#eceff1'; ctx.fill();
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, py, 11, 0, Math.PI * 2); ctx.stroke();
  } else {
    // AFT-027: every other skin carries its own hub — the AETHER CORE, a
    // faceted gem in the vessel's aspect colour (the capture-ball emblem
    // above belongs to the legacy skin and was leaking onto AETHERFALL rigs).
    // Flat fills only: no gradient, no blur.
    const cc = TYPE_COLORS[G.starter] || '#80d8ff';
    const r = 11 + 0.8 * Math.sin(G.time * 3);
    const gem = (rx, ry) => { ctx.beginPath(); ctx.moveTo(x, py - ry); ctx.lineTo(x + rx, py); ctx.lineTo(x, py + ry); ctx.lineTo(x - rx, py); ctx.closePath(); };
    gem(r + 2, r + 3); ctx.fillStyle = '#0b1026'; ctx.fill();
    ctx.strokeStyle = mixHex(cc, '#ffffff', 0.55); ctx.lineWidth = 1.6; ctx.stroke();
    gem(r - 2.5, r - 1.5); ctx.fillStyle = cc; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, py - (r - 1.5)); ctx.lineTo(x, py); ctx.lineTo(x - (r - 2.5), py); ctx.closePath();
    ctx.fillStyle = mixHex(cc, '#ffffff', 0.5); ctx.fill(); // lit upper-left facet
    ctx.beginPath(); ctx.moveTo(x, py + (r - 1.5)); ctx.lineTo(x, py); ctx.lineTo(x + (r - 2.5), py); ctx.closePath();
    ctx.fillStyle = mixHex(cc, '#020617', 0.4); ctx.fill(); // shaded lower-right facet
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 3.5, py - 4.5, 2, 2); // glint
  }
  if (G.fx_laser || mega) {
    ctx.fillStyle = '#ffd54f';
    for (const off of [-pw / 2 + 8, pw / 2 - 8]) {
      roundRect(x + off - 4, py - 20, 8, 14, 3); ctx.fill();
    }
  }
  if (G.fx_draco) {
    ctx.fillStyle = '#9fa8da';
    for (const off of [-22, 22]) {
      ctx.beginPath();
      ctx.moveTo(x + off, py - 26); ctx.lineTo(x + off - 5, py - 12); ctx.lineTo(x + off + 5, py - 12);
      ctx.closePath(); ctx.fill();
    }
  }
  drawBuildRail(x, py, pwv, ph);
  ctx.restore();
}

function drawBalls() {
  const elemCol = G.ballElement ? TYPE_COLORS[G.ballElement] : null;
  // as the board fills with cards + flyers, brighten the ball so it never gets
  // lost in the crowd: the glow swells and a soft halo grows with the clutter
  let clutter = 0;
  for (const b of G.bricks) if (!b.dead) clutter++;
  const bright = SETTINGS.hcBall ? 0 : Math.min(1, Math.max(0, (clutter - 16) / 44));
  for (const b of G.balls) {
    // modern light-ribbon trail: a tapered additive streak instead of dots
    if (b.trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const tc = G.fx_fire ? '#ff7043' : (b.ember > 0 ? '#ffab66' : (elemCol || '#90caf9'));
      for (let i = 0; i < b.trail.length - 1; i++) {
        const p0 = b.trail[i], p1 = b.trail[i + 1];
        const f = 1 - i / b.trail.length;
        ctx.globalAlpha = f * 0.28;
        ctx.lineWidth = Math.max(0.8, b.r * 1.7 * f);
        ctx.strokeStyle = tc;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    // clutter halo — a soft disc of the ball's own colour behind it, growing
    // with how much is on screen so a busy board can't swallow the ball
    if (bright > 0.04 && !b.phasing) {
      const hr = b.r + 6 + bright * 13;
      const hc = G.fx_fire ? '#ffcc80' : (elemCol || '#c5e1ff');
      // baked tinted glow disc replaces the per-frame clutter-halo gradient
      ctx.globalAlpha = 0.12 + bright * 0.34;
      ctx.drawImage(glowDisc(hc), b.x - hr, b.y - hr, hr * 2, hr * 2);
      ctx.globalAlpha = 1;
    }
    // baked ball body: its emissive halo is baked in place of the per-ball
    // shadowBlur + the radialGradient body fill (AFT-018). The hcBall keyline is
    // baked into the sprite too. Keyed per (scheme, colour, radius).
    const scheme = SETTINGS.hcBall ? 'hc' : G.fx_fire ? 'fire' : elemCol ? 'elem' : 'def';
    const bodySpr = ballBodySprite(scheme, scheme === 'elem' ? elemCol : '', Math.round(b.r));
    ctx.drawImage(bodySpr, b.x - bodySpr.width / 2, b.y - bodySpr.height / 2);
    // a ball dropping toward the paddle gets a bright ring so you never lose it
    if (!b.stuck && b.vy > 0) {
      const closeness = Math.max(0, Math.min(1, (b.y - H * 0.35) / (PADDLE_Y() - H * 0.35)));
      if (closeness > 0) {
        ctx.globalAlpha = 0.35 + closeness * 0.6;
        ctx.lineWidth = 1.5 + closeness * 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3.5 + closeness * 2, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // sky warp: comet mode while phasing up through the blocks
    if (b.phasing) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r + 4); ctx.lineTo(b.x, b.y + b.r + 26); ctx.stroke();
      ctx.globalAlpha = 0.9;
      drawGlyph(ctx, 'warp', b.x, b.y - b.r - 12, 7, '#80d8ff');
      ctx.globalAlpha = 1;
    }
    // rally aura + live counter — the visible incentive to keep the ball up top
    if (!b.stuck && b.rally >= 3) {
      ctx.shadowBlur = 0;
      const rc = b.rally >= 9 ? '#ff7043' : '#ffd54f';
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 8);
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.lineWidth = 2;
      ctx.strokeStyle = rc;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = `900 ${13 + Math.min(9, b.rally)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rc;
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText('×' + b.rally, b.x, b.y - b.r - 13);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

// dotted launch guide during serve — matches serveAngle() exactly
function drawServeGuide() {
  if (G.state !== 'serve' || paused) return;
  const b = G.balls.find(x => x.stuck);
  if (!b) return;
  const a = serveAngle();
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.12 * Math.sin(G.time * 3);
  ctx.fillStyle = '#9fd8ff';
  const len = 120;
  for (let d = 22; d < len; d += 16) {
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // arrowhead
  const tx = b.x + Math.cos(a) * (len + 8), ty = b.y + Math.sin(a) * (len + 8);
  ctx.translate(tx, ty); ctx.rotate(a + Math.PI / 2);
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-6, 3); ctx.lineTo(6, 3); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// golden shimmer along the ceiling + the barrier net under the formation
function drawRallyZone() {
  if (G.state !== 'play') return;
  let rallyFloor = -Infinity;
  for (const br of G.bricks) {
    if (br.dead || br.dormant) continue;
    if (!br.isBoss && !br.dive) rallyFloor = Math.max(rallyFloor, br.by + G.fy + br.h / 2);
  }
  rallyFloor += 14;
  if (rallyFloor <= -Infinity) return;
  const ballUp = G.balls.find(b => !b.dead && !b.stuck && b.aboveWall);
  if (!ballUp) return;
  const glow = 0.5 + 0.5 * Math.sin(G.time * 6);
  // ceiling shimmer marks the pinball zone
  const g = ctx.createLinearGradient(0, 56, 0, 56 + 46);
  g.addColorStop(0, `rgba(255,213,79,${0.16 + glow * 0.1})`);
  g.addColorStop(1, 'rgba(255,213,79,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 56, W, 46);
  ctx.fillStyle = `rgba(255,224,130,${0.5 + glow * 0.4})`;
  ctx.fillRect(0, 56, W, 2);
  // the net hangs BELOW the whole formation — it fills in for missing blocks,
  // so the ball can play off lower ranks and only gets caught at the bottom.
  // gold with charge pips while healthy, flashing red on the last, gone at 0
  const saves = ballUp.zoneSaves || 0;
  ctx.save();
  if (saves > 0) {
    const low = saves === 1;
    const a = low ? 0.35 + 0.55 * Math.abs(Math.sin(G.time * 10)) : 0.4 + glow * 0.25;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -G.time * 46;
    ctx.lineWidth = low ? 2 : 2.5;
    ctx.strokeStyle = low ? `rgba(255,110,90,${a})` : `rgba(255,213,79,${a})`;
    ctx.beginPath(); ctx.moveTo(0, rallyFloor); ctx.lineTo(W, rallyFloor); ctx.stroke();
    ctx.setLineDash([]);
    // remaining charges as diamonds on the net
    for (let i = 0; i < saves; i++) {
      const px = W / 2 + (i - (saves - 1) / 2) * 26;
      drawGlyph(ctx, 'fairy', px, rallyFloor, 6, low ? '#ff8a65' : '#ffd54f');
    }
    if (low) {
      ctx.font = '900 11px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255,138,101,${0.5 + 0.5 * Math.abs(Math.sin(G.time * 10))})`;
      ctx.fillText('BARRIER LOW', W / 2, rallyFloor + 18);
    }
  }
  ctx.restore();
}

// warning lines before enemy fire + Zekrom/Eternatus column beams
// AFT-020 THE GALE RELAY: the wind corridor (two dashed rails + downwind
// chevrons — shape and motion, never color alone) and the carrier read
// (bright core orb on the carrier, dashed gray shimmer on the other Vows).
// Strokes and fills only — nothing here allocates gradients or shadowBlur.
function drawRelayFx() {
  const F = G.finale;
  if (!F || !F.relay || F.beat !== 0 || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const rl = relayLane();
  if (rl) {
    const x0 = rl.x - rl.w / 2, x1 = rl.x + rl.w / 2;
    const yTop = SAFE_T + 92;
    const yBot = G.mode === 'junkie' ? shipY() + 44 : PADDLE_Y() - 6;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(128,216,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x0, yTop); ctx.lineTo(x0, yBot);
    ctx.moveTo(x1, yTop); ctx.lineTo(x1, yBot);
    ctx.stroke();
    ctx.setLineDash([]);
    // downwind chevrons OUTSIDE the lane — they travel with the gale
    ctx.strokeStyle = 'rgba(197,225,235,0.42)';
    ctx.lineWidth = 1.6;
    const span = Math.max(1, yBot - yTop - 80);
    for (let i = 0; i < 5; i++) {
      const yy = yTop + 40 + (i * span) / 4;
      const sway = ((G.time * 90 + i * 37) % 64);
      for (const side of [-1, 1]) {
        const bx = rl.x + side * (rl.w / 2 + 30) + rl.dir * sway * 0.7;
        ctx.beginPath();
        ctx.moveTo(bx - rl.dir * 8, yy - 5);
        ctx.lineTo(bx, yy);
        ctx.lineTo(bx - rl.dir * 8, yy + 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  const car = relayCarrierBrick();
  for (const v of relayAliveVows()) {
    const vx2 = v.bx + G.fx, vy2 = v.by + G.fy;
    const r = Math.max(v.w, v.h) * 0.6;
    ctx.save();
    if (v === car) {
      const pulse = 0.75 + 0.25 * Math.sin(G.time * 5);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(64,196,255,' + (0.55 + 0.3 * pulse) + ')';
      ctx.beginPath(); ctx.arc(vx2, vy2, r + 6, 0, Math.PI * 2); ctx.stroke();
      // the storm core itself rides above the carrier
      const oy = vy2 - v.h * 0.78;
      ctx.beginPath(); ctx.arc(vx2, oy, 7 * pulse + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(64,196,255,0.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(vx2, oy, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    } else {
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(176,190,197,0.55)';
      ctx.beginPath(); ctx.arc(vx2, vy2, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}
// AFT-020 THE FIRST COVENANT: the TRIUNE WARD linking the living Heralds
// — three make a triangle, two a strained line, one stands alone. The gap
// a fallen Herald leaves is literally visible in the shape.
function drawWardFx() {
  const F = G.finale;
  if (!F || !F.ward || F.beat !== 0 || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const heralds = G.bricks.filter(b => !b.dead && b.subBoss);
  if (heralds.length < 2) return;
  ctx.save();
  ctx.setLineDash([9, 8]);
  ctx.lineDashOffset = -(G.time * 24) % 17;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(140,224,138,0.5)';
  ctx.beginPath();
  for (let i = 0; i < heralds.length; i++) {
    const a = heralds[i], b = heralds[(i + 1) % heralds.length];
    if (heralds.length === 2 && i === 1) break; // two survivors: one strained line
    ctx.moveTo(a.bx + G.fx, a.by + G.fy);
    ctx.lineTo(b.bx + G.fx, b.by + G.fy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
// AFT-020 THE FIRST FUSION: the charge's warning band + runner streak, and
// the chains binding the linked pair (each break leaves a visible stub).
function drawChaseFx() {
  const F = G.finale;
  if (!F || F.format !== 'chase' || !F.chase || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const C = F.chase;
  const R = C.rush;
  ctx.save();
  if (R) {
    if (!R.fired) {
      const prog = Math.min(1, R.t / R.warn);
      ctx.globalAlpha = 0.16 + 0.22 * prog;
      ctx.fillStyle = '#ff8a80';
      ctx.fillRect(0, R.y - 34, W, 68);
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff8a80';
      ctx.beginPath();
      ctx.moveTo(0, R.y - 34); ctx.lineTo(W, R.y - 34);
      ctx.moveTo(0, R.y + 34); ctx.lineTo(W, R.y + 34);
      ctx.stroke();
      ctx.setLineDash([]);
      // the runner crouches at its entry edge
      const ex = R.dir > 0 ? 18 : W - 18;
      ctx.beginPath();
      ctx.moveTo(ex, R.y - 12); ctx.lineTo(ex + R.dir * 22, R.y); ctx.lineTo(ex, R.y + 12);
      ctx.closePath();
      ctx.fillStyle = '#ff8a80'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.time * 10); ctx.fill();
    } else if (R.x != null) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffcf5e';
      ctx.beginPath();
      ctx.moveTo(R.x, R.y - 16); ctx.lineTo(R.x + R.dir * 40, R.y); ctx.lineTo(R.x, R.y + 16);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillRect(R.dir > 0 ? R.x - 160 : R.x, R.y - 5, 160, 10);
    }
  }
  if (F.beat === 2) {
    const pair = G.bricks.filter(b => b.chaseLinked && !b.dead);
    if (pair.length === 2) {
      const [a, b] = pair;
      // the chains: three strands, broken ones hang as stubs
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 14;
        const broken = i < C.chains;
        ctx.lineWidth = broken ? 1.4 : 2.6;
        ctx.strokeStyle = broken ? 'rgba(176,190,197,0.3)' : 'rgba(255,207,94,0.7)';
        ctx.setLineDash(broken ? [3, 9] : [9, 6]);
        ctx.beginPath();
        ctx.moveTo(a.bx + G.fx, a.by + G.fy + off);
        if (broken) ctx.lineTo(a.bx + G.fx + (b.bx - a.bx) * 0.25, a.by + G.fy + off + 18);
        else ctx.lineTo(b.bx + G.fx, b.by + G.fy + off);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}
// AFT-020 THE ECLIPSE RITE: each totem wears its rite (the rotating
// opening's gap, the pulse flash, the growing root bar), the moon state
// reads as a FILLED vs HOLLOW crescent by the banner, and the thief
// carries the stolen power as a visible violet charge.
function drawRiteFx() {
  const F = G.finale;
  if (!F || F.format !== 'rite' || !F.rite || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const R = F.rite;
  ctx.save();
  if (F.beat === 0) {
    for (const b of G.bricks) {
      if (b.dead || !b.totem) continue;
      const bx2 = b.bx + G.fx, by2 = b.by + G.fy;
      const r = Math.max(b.w, b.h) * 0.66;
      ctx.save();
      if (!b.riteArmed) {
        ctx.globalAlpha = 0.32;
        ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#90a4ae';
        ctx.beginPath(); ctx.arc(bx2, by2, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        fitLabel('WAITING', bx2, by2 + r + 13,
          { size: 8, min: 7, weight: 800, color: '#b0bec5', maxW: 58 });
        ctx.restore();
        continue;
      }
      if (b.riteKind === 'opening') {
        const gapA = (G.time * 0.9) % (Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(90,255,195,0.6)';
        ctx.beginPath();
        ctx.arc(bx2, by2, r + 6, gapA + 0.55, gapA - 0.55 + Math.PI * 2);
        ctx.stroke();
      } else if (b.riteKind === 'pulse') {
        const on = ((F.beatT + (b.subIdx || 0)) % 1.4) < 0.38;
        ctx.lineWidth = on ? 3.4 : 1.6;
        ctx.strokeStyle = on ? 'rgba(90,255,195,0.85)' : 'rgba(90,255,195,0.3)';
        ctx.beginPath(); ctx.arc(bx2, by2, r + 6 + (on ? 3 : 0), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(124,179,66,0.8)';
        ctx.fillRect(bx2 - r, by2 + r + 6, r * 2 * Math.min(1, b.riteRoot || 0), 5);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(124,179,66,0.7)';
        ctx.strokeRect(bx2 - r, by2 + r + 6, r * 2, 5);
      }
      ctx.restore();
    }
  } else {
    // the moon: FILLED crescent = bright rules; HOLLOW = dark rules
    const mx = W / 2, my = SAFE_T + 86;
    ctx.lineWidth = 2;
    ctx.strokeStyle = R.moon === 'bright' ? '#ffe082' : '#b388ff';
    ctx.beginPath(); ctx.arc(mx, my, 10, Math.PI * 0.35, Math.PI * 1.65); ctx.stroke();
    if (R.moon === 'bright') {
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(mx, my, 10, Math.PI * 0.35, Math.PI * 1.65);
      ctx.arc(mx + 5, my, 7, Math.PI * 1.5, Math.PI * 0.5, true);
      ctx.fill();
    }
    const u = G.bricks.find(b => b.umbrix && !b.dead);
    if (u && R.stolen > 0) {
      const pulse = 0.7 + 0.3 * Math.sin(G.time * 6);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(179,136,255,' + (0.45 + 0.35 * pulse) + ')';
      ctx.beginPath(); ctx.arc(u.bx + G.fx, u.by + G.fy, Math.max(u.w, u.h) * 0.66 + 5, 0, Math.PI * 2); ctx.stroke();
      fitLabel('+' + Math.round(R.stolen * 100) + '%', u.bx + G.fx, u.by + G.fy - u.h * 0.75,
        { size: 10, min: 8.5, weight: 900, color: '#b388ff', maxW: 60 });
    }
  }
  ctx.restore();
}
// AFT-020 THE FALSE FOUNDATION: glass cells (solid truths vs dashed lies),
// the closing wing-shaped shadow sector, and the prison facet.
function drawHuntFx() {
  const F = G.finale;
  if (!F || F.format !== 'hunt' || !F.hunt || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const HT = F.hunt;
  const S = HT.sector;
  if (S) {
    const prog = Math.min(1, S.t / S.dur);
    ctx.save();
    // the wing: a wedge whose EDGES sweep closed — shape and motion cue
    const sweep = S.spread * (1 - prog * 0.55);
    ctx.globalAlpha = 0.12 + 0.16 * prog;
    ctx.fillStyle = '#7c4dff';
    ctx.beginPath();
    ctx.moveTo(S.cx, S.cy);
    ctx.arc(S.cx, S.cy, S.rad, S.ang - sweep, S.ang + sweep);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.55 + 0.3 * prog;
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#b388ff';
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(S.cx, S.cy);
    ctx.lineTo(S.cx + Math.cos(S.ang - sweep) * S.rad, S.cy + Math.sin(S.ang - sweep) * S.rad);
    ctx.moveTo(S.cx, S.cy);
    ctx.lineTo(S.cx + Math.cos(S.ang + sweep) * S.rad, S.cy + Math.sin(S.ang + sweep) * S.rad);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
// procedural glass props: a TRUE cell is solid with a bright core; a
// REFLECTION is a dashed shell with an inverted hairline (the tell); the
// prison is a larger facet holding a warm inner light.
function drawGlassCell(br, x, y) {
  ctx.save();
  ctx.translate(x, y);
  const w2 = br.w / 2, h2 = br.h / 2;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, -h2); ctx.lineTo(w2, -h2 * 0.3); ctx.lineTo(w2 * 0.7, h2);
    ctx.lineTo(-w2 * 0.7, h2); ctx.lineTo(-w2, -h2 * 0.3); ctx.closePath();
  };
  if (br.lucPrison) {
    path();
    ctx.fillStyle = 'rgba(255,158,203,0.3)'; ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#ff9ecb'; ctx.stroke();
    const pulse = 0.6 + 0.4 * Math.sin(G.time * 4);
    ctx.beginPath(); ctx.arc(0, 0, 7 * pulse + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,236,179,0.9)'; ctx.fill();
  } else if (br.reflection) {
    ctx.setLineDash([5, 5]);
    path();
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(207,216,220,0.7)'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(w2 * 0.4, -h2 * 0.5); ctx.lineTo(-w2 * 0.2, h2 * 0.5); // the INVERTED hairline
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
  } else {
    path();
    ctx.fillStyle = 'rgba(178,235,242,0.35)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#b2ebf2'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w2 * 0.4, -h2 * 0.5); ctx.lineTo(w2 * 0.2, h2 * 0.5);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
  }
  if (br.flash > 0) {
    ctx.globalAlpha = br.flash * 0.7;
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
    path(); ctx.stroke();
  }
  ctx.restore();
}
// AFT-020 THE LIVE GRID: the circuit's COMPLETE route illuminates before
// any electricity moves — a dashed polyline from the Sovereign through the
// charged terminal to the endpoint lane, with the terminal's charge ring
// filling as it's struck. The coda's Victory Flame trails a warm wake band.
function drawCircuitFx() {
  const F = G.finale;
  if (!F || F.format !== 'circuit' || !F.circuit || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const C = F.circuit;
  const A = C.active;
  if (F.beat === 1 && A && !A.fired && A.node && !A.node.dead) {
    const nx = A.node.bx + G.fx, ny = A.node.by + G.fy;
    const prog = Math.min(1, A.t / A.illum);
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -(G.time * 60) % 18; // the power FLOWS along the route
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = 'rgba(255,209,102,' + (0.35 + 0.4 * prog) + ')';
    ctx.beginPath();
    ctx.moveTo(A.from.x, A.from.y);
    ctx.lineTo(nx, ny);
    ctx.lineTo(A.endX, Math.min(H - 60, ny + (H - ny) * 0.9));
    ctx.stroke();
    ctx.setLineDash([]);
    // the charged terminal: a filling charge ring — break it to redirect
    const pulse = 0.75 + 0.25 * Math.sin(G.time * 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,209,102,' + (0.5 + 0.4 * pulse) + ')';
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(A.node.w, A.node.h) * 0.62 + 6, -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * ((A.hits || 0) / A.need));
    ctx.stroke();
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(A.node.w, A.node.h) * 0.62 + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // the endpoint lane preview (the strike itself is a warned columnStrike)
    ctx.globalAlpha = 0.3 + 0.3 * prog;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(A.endX - A.w / 2, H - 46, A.w, 8);
    ctx.restore();
  }
  if (F.beat === 2) {
    const flame = G.bricks.find(b => b.victoryFlame && !b.dead);
    if (flame) {
      const fx2 = flame.bx + G.fx, fy2 = flame.by + G.fy;
      const bandW = Math.max(120, W * 0.14);
      ctx.save();
      ctx.globalAlpha = 0.14 + 0.05 * Math.sin(G.time * 5);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(fx2 - bandW, fy2 - 20, bandW * 2, Math.max(60, H * 0.5));
      ctx.restore();
    }
  }
}
// AFT-020 THE FRACTURED HOUR: the ring read (a golden arc over whichever
// woken clock is RINGING — the Regent's open window), pale pre-echo rings
// where a replay is about to fire, and the hour banner colors.
function drawHourglassFx() {
  const F = G.finale;
  if (!F || F.format !== 'hourglass' || !F.hourglass || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const HG = F.hourglass;
  let i = 0;
  ctx.save();
  for (const b of G.bricks) {
    if (b.dead || !b.sibylAwake) continue;
    const ringing = ((F.beatT + i * 2.5) % 5) < 3;
    i++;
    const bx2 = b.bx + G.fx, by2 = b.by + G.fy;
    if (ringing && F.beat >= 1) {
      const pulse = 0.7 + 0.3 * Math.sin(G.time * 7);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,213,79,' + (0.5 + 0.35 * pulse) + ')';
      ctx.beginPath();
      ctx.arc(bx2, by2 - b.h * 0.7, 12 + 4 * pulse, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
  // pre-echo: the last 1.2s before a replay fires, a pale ring breathes at
  // the recorded origin — the preview the plan demands
  for (const r of HG.replayQ) {
    const till = r.due - F.beatT;
    if (till > 1.2) continue;
    const a = 0.5 * (1 - till / 1.2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(207,216,220,' + a + ')';
    ctx.beginPath(); ctx.arc(r.x, r.y, 18 + (1.2 - till) * 20, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
// AFT-020 SIEGE: the pressure-seal tethers (each living Colossus → the
// Sovereign) during the stations beat, then the CURRENT TRAIL — warm
// pulsing rings while it burns, faint cool ones while it rests. Shape and
// temperature of motion, never color alone (burning rings PULSE).
function drawSiegeFx() {
  const F = G.finale;
  if (!F || F.format !== 'siege' || !F.siege || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const S = F.siege;
  const sov = G.bricks.find(b => b.siegeSov && !b.dead);
  if (F.beat === 0 && sov) {
    ctx.save();
    ctx.setLineDash([9, 8]);
    ctx.lineDashOffset = -(G.time * 30) % 17;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(90,215,210,0.5)';
    for (const c of G.bricks) {
      if (c.dead || !c.siegeColossus) continue;
      ctx.beginPath();
      ctx.moveTo(c.bx + G.fx, c.by + G.fy - c.h / 2);
      ctx.lineTo(sov.bx + G.fx, sov.by + G.fy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (F.beat === 1 && S.trail.length) {
    ctx.save();
    const rr2 = S.trailR + S.weather.widen * 9;
    for (const p2 of S.trail) {
      const age = Math.min(1, p2.t / 0.5);
      if (S.burns && S.taughtT <= 0) {
        const pulse = 0.65 + 0.35 * Math.sin(G.time * 6 + p2.x * 0.02);
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = 'rgba(255,110,90,' + (0.5 * age * pulse) + ')';
        ctx.beginPath(); ctx.arc(p2.x, p2.y, rr2 * (0.8 + 0.2 * pulse), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(128,216,255,' + (0.22 * age) + ')';
        ctx.beginPath(); ctx.arc(p2.x, p2.y, rr2 * 0.8, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
// AFT-020 non-attrition objective reads: the ward triangle linking its
// three sources (wardbreak) and the live lane's rails + the marked target's
// diamond (lanes). Shape and motion cues, strokes only.
function drawObjectiveFx() {
  const O = G.objective;
  if (!O || O.done || O.failed || (G.state !== 'play' && G.state !== 'serve')) return;
  if (O.type === 'wardbreak') {
    const srcs = G.bricks.filter(b => !b.dead && b.wardSrc);
    if (!srcs.length) return;
    ctx.save();
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -(G.time * 26) % 15;
    ctx.strokeStyle = 'rgba(156,255,87,0.45)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < srcs.length; i++) {
      const a = srcs[i], b = srcs[(i + 1) % srcs.length];
      if (srcs.length === 1) break;
      ctx.moveTo(a.bx + G.fx, a.by + G.fy);
      ctx.lineTo(b.bx + G.fx, b.by + G.fy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (const s2 of srcs) {
      const r = Math.max(s2.w, s2.h) * 0.62;
      const pulse = 0.7 + 0.3 * Math.sin(G.time * 4 + s2.bx * 0.01);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(156,255,87,' + (0.4 + 0.4 * pulse) + ')';
      ctx.beginPath(); ctx.arc(s2.bx + G.fx, s2.by + G.fy, r + 5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  if (O.type === 'bells' && O.zones) {
    const yB = G.mode === 'junkie' ? shipY() + 52 : PADDLE_Y() + 26;
    for (let i = 0; i < O.zones.length; i++) {
      const zx = O.zones[i];
      const rung = i < O.rung, live = i === O.rung;
      ctx.save();
      // the bell arch: rung ones stay LIT (the scenery answers the play)
      ctx.lineWidth = live ? 3 : 2;
      ctx.strokeStyle = rung ? 'rgba(255,213,79,0.9)' : live ? 'rgba(255,213,79,0.75)' : 'rgba(176,190,197,0.35)';
      ctx.beginPath();
      ctx.arc(zx, yB, 16, Math.PI, 0);
      ctx.moveTo(zx - 5, yB); ctx.lineTo(zx - 3, yB + 7);
      ctx.moveTo(zx + 5, yB); ctx.lineTo(zx + 3, yB + 7);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(zx, yB + 8, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      if (live) {
        // the zone rails + the dwell arc filling as you hold it
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(zx - O.zoneW / 2, SAFE_T + 92); ctx.lineTo(zx - O.zoneW / 2, yB - 24);
        ctx.moveTo(zx + O.zoneW / 2, SAFE_T + 92); ctx.lineTo(zx + O.zoneW / 2, yB - 24);
        ctx.stroke();
        ctx.setLineDash([]);
        if (O.dwellT > 0) {
          ctx.lineWidth = 3.4;
          ctx.beginPath();
          ctx.arc(zx, yB, 22, -Math.PI / 2, -Math.PI / 2 + (O.dwellT / O.dwell) * Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  if (O.type === 'lanes' && O.laneX != null) {
    const x0 = O.laneX - O.laneW / 2, x1 = O.laneX + O.laneW / 2;
    const yTop = SAFE_T + 92;
    const yBot = G.mode === 'junkie' ? shipY() + 44 : PADDLE_Y() + 20;
    ctx.save();
    ctx.setLineDash([12, 9]);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(255,213,79,0.55)';
    ctx.beginPath();
    ctx.moveTo(x0, yTop); ctx.lineTo(x0, yBot);
    ctx.moveTo(x1, yTop); ctx.lineTo(x1, yBot);
    ctx.stroke();
    ctx.setLineDash([]);
    const mk = G.bricks.find(b => !b.dead && b.laneMark);
    if (mk) {
      const mx = mk.bx + G.fx, my = mk.by + G.fy - mk.h / 2 - 14 - Math.sin(G.time * 5) * 3;
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.moveTo(mx, my); ctx.lineTo(mx + 7, my - 9); ctx.lineTo(mx, my - 18); ctx.lineTo(mx - 7, my - 9);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,213,79,0.8)';
      ctx.beginPath(); ctx.arc(mx, mk.by + G.fy, Math.max(mk.w, mk.h) * 0.62 + 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
// AFT-020 THE SERAPH RAID: crown segments assemble on visible arcs over the
// Sovereign; each live segment shows BOTH clocks (outer sweep = assembly
// danger, inner bright fill = break progress) and a dashed TETHER to the
// captain powering it — shape and motion, never color alone. The bound
// mythic reads through crossed chain strokes until freed.
function drawRaidFx() {
  const F = G.finale;
  if (!F || F.format !== 'raid' || !F.raid || F.mastery.clear) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  const RD = F.raid;
  const seraph = G.bricks.find(b => b.raidSeraph && !b.dead);
  if (seraph && !RD.window) {
    const cx = seraph.bx + G.fx, cy = seraph.by + G.fy;
    const rad = Math.max(seraph.w, seraph.h) * 0.85;
    for (let i = 0; i < RD.segments.length; i++) {
      const S = RD.segments[i];
      const a0 = Math.PI + (i * Math.PI) / 3 + 0.12;
      const a1 = Math.PI + ((i + 1) * Math.PI) / 3 - 0.12;
      ctx.save();
      if (S.state === 'broken' || S.state === 'torn' || S.state === 'fizzled') {
        // a resolved slot is a visible GAP in the crown — a few shard ticks
        ctx.strokeStyle = 'rgba(176,190,197,0.35)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          const ak = a0 + ((a1 - a0) * (k + 0.5)) / 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ak) * (rad - 5), cy + Math.sin(ak) * (rad - 5));
          ctx.lineTo(cx + Math.cos(ak) * (rad + 5), cy + Math.sin(ak) * (rad + 5));
          ctx.stroke();
        }
      } else {
        const live = S.state === 'assembling';
        ctx.lineWidth = live ? 6 : 3;
        ctx.strokeStyle = live ? 'rgba(255,138,128,0.8)' : 'rgba(120,144,156,0.5)';
        ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a1); ctx.stroke();
        if (live) {
          // assembly clock sweeps the slot; break progress brightens inside it
          const asm = Math.min(1, S.t / RD.assembleDur);
          ctx.lineWidth = 8;
          ctx.strokeStyle = 'rgba(255,82,82,0.9)';
          ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + (a1 - a0) * asm); ctx.stroke();
          const brk = Math.min(1, S.broken / RD.segNeed);
          if (brk > 0) {
            ctx.lineWidth = 3.4;
            ctx.strokeStyle = '#80d8ff';
            ctx.beginPath(); ctx.arc(cx, cy, rad - 9, a0, a0 + (a1 - a0) * brk); ctx.stroke();
          }
          // the tether names the captain that powers this segment
          const owner = G.bricks.find(b => b.raidCaptain && !b.dead && b.subIdx === S.owner);
          if (owner) {
            const mid = (a0 + a1) / 2;
            ctx.setLineDash([7, 7]);
            ctx.lineDashOffset = -(G.time * 40) % 14; // energy flows captain → crown
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,138,128,0.55)';
            ctx.beginPath();
            ctx.moveTo(owner.bx + G.fx, owner.by + G.fy - owner.h / 2);
            ctx.lineTo(cx + Math.cos(mid) * rad, cy + Math.sin(mid) * rad);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
      ctx.restore();
    }
  }
  // the bound mythic: crossed chain strokes until freed
  const bnd = G.bricks.find(b => b.raidBound && !b.dead && !b.raidFreed);
  if (bnd) {
    const bx2 = bnd.bx + G.fx, by2 = bnd.by + G.fy;
    ctx.save();
    ctx.strokeStyle = 'rgba(185,246,202,0.65)';
    ctx.lineWidth = 2.4;
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(bx2 - bnd.w * 0.62, by2 - s2 * bnd.h * 0.5);
      ctx.quadraticCurveTo(bx2, by2 + s2 * bnd.h * 0.18, bx2 + bnd.w * 0.62, by2 - s2 * bnd.h * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
// procedural props (no sprite ids): the binding vines and the fallen cover
function drawRaidVine(br, x, y) {
  ctx.save();
  ctx.translate(x, y);
  const hurt = br.hp < br.maxHp;
  ctx.strokeStyle = hurt ? 'rgba(174,213,129,0.75)' : 'rgba(124,179,66,0.95)';
  ctx.lineWidth = 4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 7, br.h / 2);
    ctx.quadraticCurveTo(i * 12 + Math.sin(G.time * 2 + i) * 3, 0, i * 5, -br.h / 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#33691e';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(Math.sin(i * 2.7) * 8, -br.h / 2 + 8 + i * (br.h - 16) / 2, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (br.flash > 0) { ctx.globalAlpha = br.flash * 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-br.w / 2, -br.h / 2, br.w, br.h); }
  ctx.restore();
}
function drawRaidCover(br, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(96,125,139,0.9)';
  ctx.strokeStyle = '#cfd8dc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-br.w / 2, 4); ctx.lineTo(-br.w * 0.3, -br.h / 2); ctx.lineTo(br.w * 0.34, -br.h * 0.4);
  ctx.lineTo(br.w / 2, 6); ctx.lineTo(br.w * 0.1, br.h / 2); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawTelegraphs() {
  for (const tg of G.telegraphs) {
    if (tg.br.dead) continue;
    const bx = tg.br.bx + G.fx, by = tg.br.by + G.fy + tg.br.h / 2;
    const prog = 1 - tg.t / tg.max;
    const P = tg.pattern || null;
    const massive = P && P.classKey === 'massive';
    const aimed = tg.boss || (P && P.aimed);
    const shotCol = TYPE_COLORS[tg.br.poke.t] || (tg.boss ? '#b388ff' : '#ff5252');
    ctx.save();
    // BOSS shots are aimed and lethal → draw the full trajectory line. Regular
    // shots just drop straight down, so a short stub + a charging muzzle glow
    // is warning enough and keeps the board from filling with lines.
    if (aimed || massive) {
      ctx.globalAlpha = 0.25 + prog * 0.45;
      ctx.setLineDash(massive ? [12, 10] : [6, 9]);
      ctx.lineDashOffset = -G.time * 70;
      ctx.lineWidth = massive ? 5 : 2;
      ctx.strokeStyle = shotCol;
      const ty = shipY(), tx = P && !P.aimed ? bx : G.paddle.x;
      const ang = Math.atan2(ty - by, tx - bx);
      const len = Math.hypot(ty - by, tx - bx);
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = 0.3 + prog * 0.45;
      ctx.lineWidth = 2;
      ctx.strokeStyle = shotCol;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 26); ctx.stroke();
    }
    // charging glow at the muzzle
    ctx.globalAlpha = 0.5 + prog * 0.5;
    ctx.fillStyle = shotCol;
    const muzzleR = massive ? 8 + prog * 12 : 3 + prog * (tg.boss ? 7 : 4);
    ctx.beginPath(); ctx.arc(bx, by, muzzleR, 0, Math.PI * 2); ctx.fill();
    if (massive) {
      ctx.globalAlpha = 0.45 + prog * 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, muzzleR + 7 + prog * 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  for (const cs of G.columnStrikes) {
    ctx.save();
    const col = cs.color || '#80d8ff';
    if (cs.warn > 0) {
      const a = 0.12 + 0.07 * Math.sin(G.time * 8); // calmer pulse, less strobe
      ctx.fillStyle = `rgba(255,82,82,${a})`;
      ctx.fillRect(cs.x - cs.w / 2, 60, cs.w, FLOOR() - 60);
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = G.time * 50;
      ctx.strokeStyle = 'rgba(255,138,128,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cs.x - cs.w / 2, 60, cs.w, FLOOR() - 60);
      ctx.setLineDash([]);
      drawGlyph(ctx, 'alert', cs.x, H * 0.55, 13, '#ff8a80');
    } else {
      const a = Math.min(1, cs.strike / 0.2);
      // the soft lane wash is a flourish over the flat white CORE (the real
      // tell) — its gradient is cached per colour in local space and re-mapped
      // through the CTM per strike (a desperation channel fires 5-10 strikes
      // at once; allocating per strike per frame was a GC hitch at the worst
      // moment), and the deepest rung drops the wash entirely
      if (effectsLevel() < 3) {
        let g = fxCache['csGrad_' + col];
        if (!g) {
          g = ctx.createLinearGradient(-0.5, 0, 0.5, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, col);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          fxCache['csGrad_' + col] = g;
        }
        ctx.globalAlpha = 0.8 * a;
        ctx.save();
        ctx.translate(cs.x, 0); ctx.scale(cs.w, 1);
        ctx.fillStyle = g;
        ctx.fillRect(-0.5, 0, 1, FLOOR());
        ctx.restore();
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.fillRect(cs.x - cs.w * 0.12, 0, cs.w * 0.24, FLOOR());
    }
    ctx.restore();
  }
}

// ---- SPACE JUNKIE typed attacks: the bolt's SHAPE is the pilot's species
// family (14 signatures — flame, draco, fist, aqua, shard, gear, leaf, sting,
// venom, quake, gale, pixel, psy, star, wisp, claw, volt), its COLOR is the
// CURRENT element — a Charmeleon riding a grass element shoots green fire.
// The whole attack GROWS with the partner: tier II/III bolts scale up and
// each shape adds a signature flourish at tier III (extra fork, twin trails,
// echo blades…). Rendered modern: every bolt gets a long additive light-
// trail, a hot white core, and layered glow drawn in 'lighter'.
function drawTypedBolt(L) {
  const col = TYPE_COLORS[L.element] || '#80d8ff';
  const t = G.time;
  const tier = Math.max(1, Math.min(3, L.tier || 1));
  ctx.save();
  // 1) motion trail — soft light streak in two plain alpha strokes
  // (no per-bolt gradient allocation; this runs for every bolt every frame)
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.42; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x, L.y + 22); ctx.stroke();
  ctx.globalAlpha = 0.16; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(L.x, L.y + 20); ctx.lineTo(L.x, L.y + 40); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // evolved partners hit VISIBLY harder: the whole attack scales up a step
  // per tier (geometry only — hitboxes are unchanged, generosity stays)
  const sz = 1 + (tier - 1) * 0.16;
  if (sz !== 1) { ctx.translate(L.x, L.y); ctx.scale(sz, sz); ctx.translate(-L.x, -L.y); }
  // baked additive glow replaces the per-bolt shadowBlur (GPU-state stall);
  // drawn under the tier scale so the halo grows with the attack (AFT-018).
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(glowDisc(col), L.x - 20, L.y - 20, 40, 40);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const relic = aetherRelicImage(L.shape);
  if (drawAetherRelic(relic, L.x, L.y, AETHER_RELIC_SIZE[L.shape] || 46, col, tier)) {
    ctx.restore();
    return;
  }
  if (L.shape === 'flame') {
    // a living flame tongue — layered outer flame, inner tongue, white core
    const flick = 1 + 0.22 * Math.sin(t * 31 + L.x * 0.7);
    const h = 32 * flick, w4 = 12;
    const flame = (sc, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(L.x, L.y - h * 0.65 * sc);
      ctx.quadraticCurveTo(L.x + w4 * 0.55 * sc, L.y - h * 0.15 * sc, L.x + w4 * 0.34 * sc, L.y + h * 0.2 * sc);
      ctx.quadraticCurveTo(L.x, L.y + h * 0.45 * sc, L.x - w4 * 0.34 * sc, L.y + h * 0.2 * sc);
      ctx.quadraticCurveTo(L.x - w4 * 0.55 * sc, L.y - h * 0.15 * sc, L.x, L.y - h * 0.65 * sc);
      ctx.fill();
    };
    flame(1, col);
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
    flame(0.62, col);
    flame(0.34, 'rgba(255,255,255,0.95)');
    ctx.globalCompositeOperation = 'source-over';
    // ember sparks peeling off the tail — more of them each tier
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = col;
    for (let e = 0; e < 1 + tier; e++) {
      const ex = L.x + Math.sin(t * (23 + e * 9) + L.y * 0.2 + e * 2) * (4 + e * 3);
      // clamp: at tier III the 4th ember's radius hits float-negative zero,
      // and ctx.arc THROWS on a negative radius — this crashed fire pilots
      ctx.beginPath(); ctx.arc(ex, L.y + h * (0.5 + e * 0.18), Math.max(0.5, 2.4 - e * 0.7), 0, Math.PI * 2); ctx.fill();
    }
  } else if (L.shape === 'aqua') {
    // a sleek water dart: teardrop body, specular highlight, ripple ring
    const puls = 1 + 0.12 * Math.sin(t * 18 + L.x);
    // baked orb (white-hot core → colour) clipped to the animated teardrop —
    // no per-bolt gradient allocation (AFT-018)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(L.x, L.y - 15 * puls);
    ctx.quadraticCurveTo(L.x + 8 * puls, L.y - 2, L.x, L.y + 12 * puls);
    ctx.quadraticCurveTo(L.x - 8 * puls, L.y - 2, L.x, L.y - 15 * puls);
    ctx.clip();
    const aor = 16 * puls;
    ctx.drawImage(orbSprite(col), L.x - 2 - aor, L.y - 4 - aor, aor * 2, aor * 2);
    ctx.restore();
    ctx.shadowBlur = 0;
    // specular glint
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(L.x - 2.5, L.y - 5, 1.6, 3.4, -0.5, 0, Math.PI * 2); ctx.fill();
    // ripple ring + trailing droplets
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(L.x, L.y + 14, 5 + ((t * 30 + L.y) % 8), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(L.x + Math.sin(t * 12) * 3.4, L.y + 20, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(L.x - Math.sin(t * 15) * 3.4, L.y + 28, 1.8, 0, Math.PI * 2); ctx.fill();
    if (tier >= 3) { // tier III: a second ripple chasing the dart
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = col; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(L.x, L.y + 6, 8 + ((t * 36 + L.y) % 10), 0, Math.PI * 2); ctx.stroke();
    }
  } else if (L.shape === 'leaf') {
    // a spinning razor leaf inside a slicing light-disc
    ctx.globalCompositeOperation = 'lighter';
    // baked glow disc replaces the additive radial gradient (AFT-018)
    ctx.globalAlpha = 0.33;
    ctx.drawImage(glowDisc(col), L.x - 15, L.y - 15, 30, 30);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(L.x, L.y);
    ctx.rotate(t * 16 + L.x * 0.1);
    // baked blade blitted under the live rotate — no per-bolt linear gradient
    ctx.drawImage(leafBladeSprite(col), -20, -20);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
    // twin echo-leaf: a ghost of the previous rotation frame
    ctx.rotate(-0.6);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(9, -3, 0, 13);
    ctx.quadraticCurveTo(-9, -3, 0, -13);
    ctx.fill();
    if (tier >= 3) { // tier III: a third blade in the storm
      ctx.rotate(-0.7);
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.quadraticCurveTo(9, -3, 0, 13);
      ctx.quadraticCurveTo(-9, -3, 0, -13);
      ctx.fill();
    }
  } else if (L.shape === 'draco') {
    // DRAGON — a serpentine dragon-pulse: sinuous body riding a standing
    // wave, fanged arrowhead; tier III grows twin whisker-trails
    const len = 32, wave = 4 + tier;
    const body = (lw, color, ph, damp) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const yy = L.y - len * 0.55 + (i / 8) * len;
        const xx = L.x + Math.sin(t * 22 + i * 1.05 + ph + L.x * 0.13) * wave * (damp ? 1 - i / 10 : 1);
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    };
    body(7, col, 0, true);
    ctx.shadowBlur = 0;
    body(2.4, 'rgba(255,255,255,0.92)', 0, true);
    if (tier >= 3) {
      ctx.globalAlpha = 0.38;
      body(1.5, col, 2.2, false); body(1.5, col, 4.4, false);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffffff'; // the fanged head
    ctx.beginPath();
    ctx.moveTo(L.x, L.y - len * 0.55 - 9);
    ctx.lineTo(L.x + 5.5, L.y - len * 0.55 + 2);
    ctx.lineTo(L.x, L.y - len * 0.55 - 1);
    ctx.lineTo(L.x - 5.5, L.y - len * 0.55 + 2);
    ctx.closePath(); ctx.fill();
  } else if (L.shape === 'fist') {
    // FIGHTING — a blunt force comet: knuckle block behind a white impact
    // wedge, flanked by speed lines; tier III adds a shockwave collar
    const k = 9;
    ctx.fillStyle = col;
    roundRect(L.x - k, L.y - k * 0.7, k * 2, k * 1.5, 4); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(L.x, L.y - k * 1.5);
    ctx.lineTo(L.x + k * 0.8, L.y - k * 0.4);
    ctx.lineTo(L.x - k * 0.8, L.y - k * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.55; // speed lines trailing the punch
    for (const sx of [-k - 4, k + 4]) {
      ctx.beginPath(); ctx.moveTo(L.x + sx, L.y - 2); ctx.lineTo(L.x + sx * 0.8, L.y + 16); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (tier >= 3) {
      ctx.globalAlpha = 0.4 + 0.25 * Math.sin(t * 30);
      ctx.beginPath(); ctx.arc(L.x, L.y, k * 1.9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (L.shape === 'shard') {
    // ICE — a crystal lance: faceted diamond with a glint, frost motes in
    // tow; tier III flies with two flanking shardlets
    const h = 17, w4 = 6.5;
    const crystal = (cx2, cy2, scl, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 - h * scl);
      ctx.lineTo(cx2 + w4 * scl, cy2);
      ctx.lineTo(cx2, cy2 + h * 0.7 * scl);
      ctx.lineTo(cx2 - w4 * scl, cy2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; // lit facet
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 - h * scl);
      ctx.lineTo(cx2 + w4 * scl, cy2);
      ctx.lineTo(cx2, cy2 - h * 0.25 * scl);
      ctx.closePath(); ctx.fill();
    };
    crystal(L.x, L.y, 1, 1);
    ctx.shadowBlur = 0;
    if (tier >= 3) { crystal(L.x - 10, L.y + 9, 0.5, 0.75); crystal(L.x + 10, L.y + 9, 0.5, 0.75); }
    ctx.globalAlpha = 0.7; // frost motes
    ctx.fillStyle = '#ffffff';
    for (let e = 0; e < tier; e++) {
      const ex = L.x + Math.sin(t * 17 + e * 2.4 + L.y * 0.1) * 7;
      ctx.beginPath(); ctx.arc(ex, L.y + 14 + e * 7, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (L.shape === 'gear') {
    // STEEL — a whirring sawgear: toothed disc spinning fast, molten core;
    // tier III adds a counter-rotating outer ring
    ctx.translate(L.x, L.y);
    ctx.save();
    ctx.rotate(t * 9 + L.y * 0.05);
    ctx.fillStyle = col;
    for (let i = 0; i < 8; i++) { // teeth
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-2.2, -12.5, 4.4, 5);
    }
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    if (tier >= 3) {
      ctx.save();
      ctx.rotate(-t * 6);
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  } else if (L.shape === 'sting') {
    // BUG — a fanned volley of needle darts: 2/3/4 stingers each tier
    const n = 1 + tier;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 9;
      const drop = Math.abs(i - (n - 1) / 2) * 5;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(L.x + off, L.y - 14 + drop);
      ctx.lineTo(L.x + off + 2.6, L.y + 6 + drop);
      ctx.lineTo(L.x + off - 2.6, L.y + 6 + drop);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; // needle point
      ctx.beginPath();
      ctx.moveTo(L.x + off, L.y - 14 + drop);
      ctx.lineTo(L.x + off + 1.4, L.y - 6 + drop);
      ctx.lineTo(L.x + off - 1.4, L.y - 6 + drop);
      ctx.closePath(); ctx.fill();
    }
  } else if (L.shape === 'venom') {
    // POISON — a corrosive glob: wobbling droplet, rising toxin bubbles;
    // more bubbles each tier, a drip tail at tier III
    const wob = 1 + 0.14 * Math.sin(t * 21 + L.x);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(L.x, L.y - 13 * wob);
    ctx.quadraticCurveTo(L.x + 9, L.y + 2, L.x, L.y + 10 * wob);
    ctx.quadraticCurveTo(L.x - 9, L.y + 2, L.x, L.y - 13 * wob);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(L.x - 2.5, L.y - 4, 1.8, 3.2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.65; // toxin bubbles boiling off
    ctx.strokeStyle = col; ctx.lineWidth = 1.3;
    for (let e = 0; e < tier + 1; e++) {
      const ph = (t * 2.2 + e * 0.83) % 1;
      ctx.globalAlpha = 0.65 * (1 - ph);
      ctx.beginPath();
      ctx.arc(L.x + Math.sin(e * 2.7 + t * 3) * 8, L.y + 6 - ph * 20, 2 + ph * 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (tier >= 3) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(L.x + Math.sin(t * 9) * 2, L.y + 20, 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (L.shape === 'quake') {
    // GROUND/ROCK — a hurled boulder: tumbling faceted chunk with a dust
    // wake; tier III carries orbiting pebbles
    ctx.translate(L.x, L.y);
    ctx.rotate(t * 5.5 + L.y * 0.03);
    ctx.fillStyle = col;
    ctx.beginPath(); // irregular facet silhouette
    ctx.moveTo(0, -12); ctx.lineTo(9, -5); ctx.lineTo(11, 5); ctx.lineTo(3, 12);
    ctx.lineTo(-8, 9); ctx.lineTo(-11, -2); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; // lit facets
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, -5); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(0, -2); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
    ctx.rotate(-(t * 5.5 + L.y * 0.03));
    ctx.globalAlpha = 0.4; // dust wake
    ctx.fillStyle = col;
    for (let e = 0; e < 2; e++) {
      const ph = (t * 2.6 + e * 0.5) % 1;
      ctx.beginPath(); ctx.arc(Math.sin(e * 4 + t * 4) * 6, 13 + ph * 12, 3.5 * (1 - ph) + 1, 0, Math.PI * 2); ctx.fill();
    }
    if (tier >= 3) {
      ctx.globalAlpha = 0.85;
      for (let e = 0; e < 2; e++) {
        const a2 = t * 7 + e * Math.PI;
        ctx.beginPath(); ctx.arc(Math.cos(a2) * 15, Math.sin(a2) * 9, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (L.shape === 'gale') {
    // FLYING — an air cutter: spinning crescent blade; tier III throws a
    // crossed second crescent
    ctx.translate(L.x, L.y);
    const blades = tier >= 3 ? 2 : 1;
    for (let b = 0; b < blades; b++) {
      ctx.save();
      ctx.rotate(t * 11 + b * Math.PI / 2);
      ctx.globalAlpha = b ? 0.55 : 1;
      ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.arc(0, 0, 12, -0.4, Math.PI + 0.4); ctx.stroke();
      if (!b) { ctx.shadowBlur = 0; }
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 0.5; // slipstream streaks
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(-9, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 14); ctx.lineTo(9, 26); ctx.stroke();
  } else if (L.shape === 'pixel') {
    // NORMAL (Porygon) — a DIGITAL burst: a diamond of flickering data
    // squares that resolves more voxels each tier, white kernel at core
    const cells = tier === 1 ? [[0, -8], [0, 0], [0, 8], [-6, 0], [6, 0]]
      : tier === 2 ? [[0, -10], [0, 0], [0, 10], [-7, -4], [7, -4], [-7, 6], [7, 6]]
      : [[0, -12], [0, 0], [0, 12], [-8, -6], [8, -6], [-8, 6], [8, 6], [-13, 0], [13, 0]];
    for (let i = 0; i < cells.length; i++) {
      const flick = 0.55 + 0.45 * Math.sin(t * 26 + i * 1.9 + L.y * 0.15);
      ctx.globalAlpha = flick;
      ctx.fillStyle = col;
      ctx.fillRect(L.x + cells[i][0] - 3, L.y + cells[i][1] - 3, 6, 6);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(L.x - 2, L.y - 2, 4, 4);
  } else if (L.shape === 'psy') {
    // PSYCHIC — a warp lens: pulsing eye-dot inside expanding thought
    // rings; one more ring per tier
    ctx.shadowBlur = 0;
    ctx.strokeStyle = col;
    for (let r0 = 0; r0 < 1 + tier; r0++) {
      const ph = (t * 1.6 + r0 / (1 + tier)) % 1;
      ctx.globalAlpha = 0.8 * (1 - ph);
      ctx.lineWidth = 2.2 - ph;
      ctx.beginPath(); ctx.ellipse(L.x, L.y, 4 + ph * 15, (4 + ph * 15) * 0.72, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // eye-dot glow now comes from the bolt's baked halo (no per-bolt shadowBlur)
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(L.x, L.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(L.x, L.y, 2.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (L.shape === 'star') {
    // FAIRY — a wishing star: rotating four-point star (five at tier III)
    // shedding glitter motes
    ctx.translate(L.x, L.y);
    ctx.rotate(t * 3.2);
    const pts = tier >= 3 ? 5 : 4, R1 = 12, R2 = 4.5;
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a2 = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? R2 : R1;
      i ? ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr) : ctx.moveTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(-t * 3.2);
    ctx.fillStyle = col; // glitter shed behind
    for (let e = 0; e < tier; e++) {
      const ph = (t * 2.4 + e * 0.61) % 1;
      ctx.globalAlpha = 0.8 * (1 - ph);
      const gx = Math.sin(e * 2.6 + t * 5) * 9;
      ctx.beginPath(); ctx.arc(gx, 10 + ph * 16, 1.7, 0, Math.PI * 2); ctx.fill();
    }
  } else if (L.shape === 'wisp') {
    // GHOST — a will-o'-wisp: a wavering spectral teardrop trailing smoke
    // rings; tier III flies with two minion wisplets
    const sway = Math.sin(t * 9 + L.y * 0.12) * 3;
    const wispAt = (cx2, cy2, scl, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 - 14 * scl);
      ctx.quadraticCurveTo(cx2 + 8 * scl, cy2 - 2 * scl, cx2, cy2 + 9 * scl);
      ctx.quadraticCurveTo(cx2 - 8 * scl, cy2 - 2 * scl, cx2, cy2 - 14 * scl);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cx2, cy2 - 3 * scl, 2.6 * scl, 0, Math.PI * 2); ctx.fill();
    };
    wispAt(L.x + sway, L.y, 1, 0.95);
    ctx.shadowBlur = 0;
    if (tier >= 3) { wispAt(L.x + sway * -0.7 - 11, L.y + 10, 0.5, 0.6); wispAt(L.x + sway * -0.7 + 11, L.y + 10, 0.5, 0.6); }
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; // smoke rings left behind
    for (let e = 0; e < tier; e++) {
      const ph = (t * 1.8 + e * 0.57) % 1;
      ctx.globalAlpha = 0.55 * (1 - ph);
      ctx.beginPath(); ctx.arc(L.x - sway * 0.6, L.y + 14 + ph * 18, 3 + ph * 5, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (L.shape === 'claw') {
    // DARK — a feral slash: crossed crescent claw-marks snapping with a
    // jitter; a third gash joins at tier III
    ctx.translate(L.x, L.y);
    const jit = Math.sin(t * 47 + L.y) * 0.08;
    const slashes = tier >= 3 ? 3 : 2;
    for (let b = 0; b < slashes; b++) {
      ctx.save();
      ctx.rotate(-0.5 + b * (slashes === 3 ? 0.5 : 1) + jit);
      ctx.globalAlpha = b === slashes - 1 ? 1 : 0.7;
      ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(0, 2, 13, -Math.PI * 0.82, -Math.PI * 0.18); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 2, 13, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke();
      ctx.restore();
    }
  } else { // 'volt' — a forked lightning bolt with a halo flash
    const h = 36, seg = 6;
    ctx.globalCompositeOperation = 'lighter';
    // baked glow disc replaces the per-bolt radial halo flash (AFT-018)
    ctx.globalAlpha = 0.4;
    ctx.drawImage(glowDisc(col), L.x - 16, L.y - 16, 32, 32);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const jag = (amp, lw, color, seed) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= seg; i++) {
        const yy = L.y - h / 2 + i * h / seg;
        const xx = L.x + (i === 0 || i === seg ? 0 : (i % 2 ? -1 : 1) * (amp + 1.6 * Math.sin(t * 40 + i + seed)));
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    };
    jag(5, 5, col, 0);
    ctx.shadowBlur = 0;
    jag(5, 1.8, 'rgba(255,255,255,0.95)', 0);
    ctx.globalAlpha = 0.45; // side fork
    jag(9, 1.4, col, 3.1);
    if (tier >= 2) { ctx.globalAlpha = 0.3; jag(13, 1.2, col, 7.7); }
    if (tier >= 3) { ctx.globalAlpha = 0.22; jag(17, 1.1, col, 11.3); }
  }
  ctx.restore();
}

function drawProjectiles() {
  for (const L of G.lasers) {
    ctx.save();
    // CHARGED shot: a fat plasma slug with a white-hot core, tinted by the
    // attack element in SPACE JUNKIE mode
    if (L.charged) {
      const r = L.r || 20;
      const ccol = L.element ? (TYPE_COLORS[L.element] || '#4dd0e1') : '#4dd0e1';
      const chargedRelic = aetherRelicImage(L.shape);
      const chargedRelicReady = !!(chargedRelic && chargedRelic.complete && chargedRelic.naturalWidth);
      // baked slug body (glow + radial gradient) replaces the per-shot allocation
      const slug = chargedSlugSprite(ccol, Math.round(r));
      ctx.globalAlpha = chargedRelicReady ? 0.42 : 1;
      ctx.drawImage(slug, L.x - slug.width / 2, L.y - slug.height / 2);
      ctx.globalAlpha = 1;
      if (chargedRelicReady) drawAetherRelic(chargedRelic, L.x, L.y, Math.max(48, r * 2.25), ccol, L.tier || 1);
      // leading spark
      ctx.fillStyle = '#e0ffff';
      ctx.beginPath(); ctx.arc(L.x, L.y - r * 0.7, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
    // JUNKIE-mode typed bolts: species shape, element color. Precision pulses
    // add an amber ring without replacing the species-specific attack shape.
    if (L.shape) {
      ctx.restore(); drawTypedBolt(L);
      if (L.pulse) {
        ctx.save();
        ctx.globalAlpha = L.nova ? 0.95 : 0.65;
        ctx.strokeStyle = L.nova ? '#fff3e0' : PATHS.impact.color;
        ctx.lineWidth = L.nova ? 3 : 2;
        ctx.beginPath(); ctx.ellipse(L.x, L.y, L.heavy ? 14 : 10, L.heavy ? 24 : 19, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (L.calib) { // CALIBRATED BARRAGE: the primed attack runs white-hot
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(L.x, L.y, 12, 22, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff8e1';
        ctx.beginPath(); ctx.arc(L.x, L.y - 24, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      continue;
    }
    // BLASTER-mode basic bolts read as sleek energy darts (vs the classic slug)
    if (G.mode === 'blaster' && L.basic) {
      const bw4 = 5 + (L.heavy ? 3 : 0) + (L.pulse ? 2 : 0) + (L.calib ? 2 : 0);
      const boltCol = L.calib ? '#ffcc80' : L.nova ? '#ffccbc' : L.pulse ? PATHS.impact.color : '#4dd0e1';
      // baked bolt (body + core + glow) replaces the per-laser shadowBlur (AFT-018)
      const spr = laserBoltSprite('blaster', boltCol, '#e0ffff', bw4, L.pulse || L.calib ? 23 : 15);
      ctx.drawImage(spr.c, L.x - spr.ax, L.y - spr.ay);
      if (L.pulse) {
        ctx.strokeStyle = L.nova ? '#ffffff' : '#ffab91'; ctx.lineWidth = L.nova ? 2.5 : 1.5;
        ctx.beginPath(); ctx.ellipse(L.x, L.y - 4, bw4 + 4, 24, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      continue;
    }
    const pulseCol = L.nova ? '#ffccbc' : PATHS.impact.color;
    const glowCol = L.pulse ? pulseCol : L.explosive ? '#ff7043' : L.basic ? '#80d8ff' : '#ffd54f';
    const bodyCol = L.pulse ? pulseCol : L.explosive ? '#ff8a65' : L.basic ? '#b3e5fc' : '#fff176';
    const bw4 = 8 + (L.heavy ? 3 : 0) + (L.pulse ? 2 : 0);
    // baked slug (body + core + glow) replaces the per-laser shadowBlur (AFT-018);
    // the glow colour differs from the body fill here, so both are keyed.
    const spr = laserBoltSprite('classic', bodyCol, 'rgba(255,255,255,0.85)', bw4, L.pulse ? 22 : 16, glowCol);
    ctx.drawImage(spr.c, L.x - spr.ax, L.y - spr.ay);
    if (L.pulse) {
      ctx.strokeStyle = L.nova ? '#fff' : '#ffab91'; ctx.lineWidth = L.nova ? 2.5 : 1.5;
      ctx.beginPath(); ctx.ellipse(L.x, L.y - 4, bw4 + 3, 20, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // charge tell: a growing plasma orb at the barrel as you wind up —
  // colored by the attack element in SPACE JUNKIE mode
  if (G.charge > 0 && (G.state === 'play')) {
    const cx = G.paddle.x, cy = shipY() - (G.mode === 'junkie' ? 46 : 20), r = 4 + G.charge * 20;
    const ccol = G.mode === 'junkie' ? (TYPE_COLORS[attackElement()] || '#4dd0e1') : '#4dd0e1';
    ctx.save();
    ctx.shadowColor = ccol; ctx.shadowBlur = 10 + G.charge * 20;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, ccol); g.addColorStop(1, ccol + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // a ring that snaps bright at full charge
    if (G.charge >= 1) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 12);
      ctx.strokeStyle = '#e0ffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.stroke();
    }
    // the chosen affinity wraps the winding charge (light/dark skins)
    const chAff = affinityColor();
    if (chAff) {
      ctx.globalAlpha = 0.35 + 0.3 * G.charge;
      ctx.strokeStyle = chAff; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  for (const m of G.missiles) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
    const missile = aetherAuxImage('homingMissile');
    const missileCol = TYPE_COLORS[m.element] || '#7986cb';
    if (!drawAetherRelic(missile, 0, 0, m.comet ? 46 : 40, missileCol, m.tier || 1)) {
      // baked dart — this fallback is the EVERY-FRAME path on the pokemon
      // skin (no weaponArt), so its halo must not be a live shadowBlur
      let dart = fxCache.missileDart;
      if (!dart) {
        dart = document.createElement('canvas'); dart.width = dart.height = 72;
        const c = dart.getContext('2d');
        c.translate(36, 36);
        c.shadowColor = '#7986cb'; c.shadowBlur = 14;
        c.fillStyle = '#c5cae9';
        c.beginPath();
        c.moveTo(0, -15); c.lineTo(-7, 11); c.lineTo(7, 11);
        c.closePath(); c.fill();
        c.fillStyle = '#ff8a65'; // the nose keeps the same soft halo it always had
        c.beginPath(); c.arc(0, 14, 5, 0, Math.PI * 2); c.fill();
        fxCache.missileDart = dart;
      }
      ctx.drawImage(dart, -36, -36);
    }
    ctx.restore();
  }
  // AFT-007: the returning relic glaive — a baked sprite spun at draw time
  // plus a short velocity trail. No per-frame gradients or shadowBlur; the
  // glow is baked into the sprite once per (skin, color).
  for (const R of G.relics) {
    const col = TYPE_COLORS[R.element] || '#ec407a';
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(R.x - (R.x - R.px) * 4, R.y - (R.y - R.py) * 4);
    ctx.lineTo(R.x, R.y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.translate(R.x, R.y);
    ctx.rotate(R.spin);
    const spr = relicGlaiveSprite(col);
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
  }
  // Enemy fire: cached type/species silhouettes. Size communicates threat,
  // shape communicates identity, and the dark outline keeps all of them
  // distinct from the player's bolt and ball.
  for (const s of G.enemyShots) {
    const r = s.visualR || s.r || (s.boss ? 13 : 10);
    const spin = G.time * (s.boss ? 4 : 6) + s.x * 0.05;
    const col = s.type ? TYPE_COLORS[s.type] : s.boss ? '#ff5cf0' : '#ff5252';
    const kind = s.kind || projectileKindFor(s.species, s.type);
    // short motion tail shows travel direction (plain alpha stroke, no gradient)
    const sp = Math.hypot(s.vx || 0, s.vy || 0) || 1;
    const ux = (s.vx || 0) / sp, uy = (s.vy || 1) / sp;
    ctx.save();
    const tail = s.tail || (s.heavy ? 34 : 24);
    const tailStartX = s.x - ux * Math.min(8, r * 0.3), tailStartY = s.y - uy * Math.min(8, r * 0.3);
    // Dark under-tracer + bright element tracer: small needles remain visible
    // over pale route skies, saturated boss arenas, and the player’s own FX.
    ctx.globalAlpha = s.classKey === 'micro' ? 0.58 : 0.42;
    ctx.strokeStyle = 'rgba(2,5,15,0.96)';
    ctx.lineWidth = Math.min(16, Math.max(5, r * 0.34 + 3)); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tailStartX, tailStartY);
    ctx.lineTo(s.x - ux * tail, s.y - uy * tail); ctx.stroke();
    ctx.globalAlpha = s.classKey === 'micro' ? 0.82 : 0.5;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.min(13, Math.max(s.classKey === 'micro' ? 2.8 : 2, r * 0.34));
    ctx.beginPath(); ctx.moveTo(s.x - ux * Math.min(8, r * 0.3), s.y - uy * Math.min(8, r * 0.3));
    ctx.lineTo(s.x - ux * tail, s.y - uy * tail); ctx.stroke();
    if (s.classKey === 'micro') {
      ctx.globalAlpha = 0.68; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.15;
      ctx.beginPath(); ctx.moveTo(tailStartX, tailStartY);
      ctx.lineTo(s.x - ux * tail * 0.64, s.y - uy * tail * 0.64); ctx.stroke();
    }
    // AFT-023: HIGH-CONTRAST PROJECTILES extends beyond the ball — every
    // hostile shot gains a white keyline over a black backing ring
    // (strokes only, render-only; collision untouched)
    if (SETTINGS.hcBall) {
      const ow = SETTINGS.hcStrength || 1; // AFT-010: OUTLINE STRENGTH
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3.4 * ow;
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.72 + 2.2, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6 * ow;
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.72 + 2.2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // effectiveness telegraph vs YOUR current type: a bright pulsing ring when
    // this attack is super-effective on you, a faint dashed ring when you resist
    const eff = shotEffect(s.type);
    if (eff !== 0) {
      ctx.beginPath(); ctx.arc(s.x, s.y, r + 5, 0, Math.PI * 2);
      if (eff === 1) { ctx.strokeStyle = `rgba(255,90,90,${0.5 + 0.4 * Math.sin(G.time * 9)})`; ctx.lineWidth = 2.4; ctx.setLineDash([]); }
      else { ctx.strokeStyle = 'rgba(180,200,215,0.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // A heavy/massive shot visibly cracks as basics wear down its intercept
    // strength. The art tells the player that individual fire is working.
    if ((s.interceptMax || 1) > 1 && s.interceptHP < s.interceptMax) {
      ctx.beginPath(); ctx.arc(s.x, s.y, r + 3, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.max(0, s.interceptHP) / s.interceptMax);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.translate(s.x, s.y);
    const heading = Math.atan2(s.vy || 1, s.vx || 0) + Math.PI / 2;
    ctx.rotate(SPINNING_ENEMY_SHOT[kind] ? spin : heading + Math.sin(spin) * 0.05);
    const drawScale = ENEMY_SHOT_DRAW_SCALE[kind] || 1;
    if (s.ghost) ctx.globalAlpha = s.ghost; // AFTERIMAGE (Koraidon): low-alpha ghost render (no gradient)
    const relic = aetherRelicForKind(kind);
    if (!drawAetherRelic(relic, 0, 0, r * 3.7 * drawScale, col, s.classKey === 'massive' ? 3 : s.classKey === 'heavy' ? 2 : 1)) {
      const img = enemyShotSprite(kind, col, r);
      ctx.drawImage(img, -img.width * drawScale / 2, -img.height * drawScale / 2,
        img.width * drawScale, img.height * drawScale);
    }
    ctx.restore();
  }
}

// ---- RELICFORGE DROPS (2026-07-22) ----
// On skins with `relicDrops` (AETHERFALL) a pickup is a forged RELIC, not a
// glossy capsule: an antique-brass octagon plate over weathered steel with the
// power's rune engraved in its own colour and a restrained core glow. Colour
// still carries the gameplay read — only the material language changed.
// Flat fills + strokes only (no per-drop gradient allocation).
// The plate is BAKED once per (colour, glyph) — a boss fight drops several of
// these mid-combat, and the old path set shadowBlur twice per drop per frame.
// The pulse survives as a cheap additive breath over the baked art.
function relicPlateSprite(col, glyphKey) {
  const ck = 'relicPlate_' + col + '_' + glyphKey;
  if (fxCache[ck]) return fxCache[ck];
  const R = 17, S = 88;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.translate(S / 2, S / 2);
  c.shadowColor = col; c.shadowBlur = 13; // the mid-pulse halo, baked
  // brass octagon frame
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R, Math.sin(a) * R);
  }
  c.closePath();
  c.fillStyle = '#3a2f1c'; c.fill();          // recessed brass shadow
  c.lineWidth = 2.4; c.strokeStyle = '#c9a44c'; c.stroke();  // antique brass
  c.shadowBlur = 0;
  // weathered steel core
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74);
  }
  c.closePath();
  c.fillStyle = '#141a26'; c.fill();
  c.lineWidth = 1; c.strokeStyle = '#6b7687'; c.stroke();
  // top-left key light on the brass (the style-lock signature)
  c.globalAlpha = 0.5;
  c.lineWidth = 1.6; c.strokeStyle = '#f0dfa8';
  c.beginPath(); c.arc(0, 0, R * 0.9, Math.PI * 1.06, Math.PI * 1.5); c.stroke();
  c.globalAlpha = 1;
  // the rune core: the power's colour, glowing from within the plate
  c.shadowColor = col; c.shadowBlur = 10;
  drawGlyph(c, glyphKey, 0, 0, 9, col);
  c.shadowBlur = 0;
  // four brass rivets
  c.fillStyle = '#c9a44c';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    c.beginPath(); c.arc(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, 1.5, 0, Math.PI * 2); c.fill();
  }
  fxCache[ck] = cv;
  return cv;
}
function drawRelicPlate(col, glyphKey, pulse) {
  const cv = relicPlateSprite(col, glyphKey);
  ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.08 + 0.2 * pulse;
  ctx.drawImage(glowDisc(col), -24, -24, 48, 48);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
// the catch item as a BINDING SIGIL relic: brass hex ring, dark core, a
// crystal eye that turns gold when the quarry is radiant
// Baked once per shiny-state (same rationale as the relic plate); the eye's
// pulse rides a live additive breath + a tiny unshadowed fill.
function bindingSigilSprite(shiny) {
  const ck = 'bindSigil_' + (shiny ? 's' : 'n');
  if (fxCache[ck]) return fxCache[ck];
  const core = shiny ? '#ffd700' : '#8fd6ff';
  const R = 15, S = 84;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.translate(S / 2, S / 2);
  c.shadowColor = core; c.shadowBlur = 16; // mid-pulse halo, baked
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 - Math.PI / 2;
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R, Math.sin(a) * R);
  }
  c.closePath();
  c.fillStyle = '#181322'; c.fill();
  c.lineWidth = 2.4; c.strokeStyle = '#c9a44c'; c.stroke();
  c.shadowBlur = 0;
  // binding runes on three alternating faces
  c.lineWidth = 1.3; c.strokeStyle = '#e6cf8e'; c.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) - Math.PI / 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62);
    c.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9);
    c.stroke();
  }
  c.globalAlpha = 1;
  // the crystal eye (its glow bakes; the radius pulse draws live)
  c.shadowColor = core; c.shadowBlur = 10;
  c.beginPath(); c.arc(0, 0, 5.2, 0, Math.PI * 2);
  c.fillStyle = core; c.fill();
  c.shadowBlur = 0;
  fxCache[ck] = cv;
  return cv;
}
function drawBindingSigil(shiny, pulse) {
  const core = shiny ? '#ffd700' : '#8fd6ff';
  const cv = bindingSigilSprite(shiny);
  ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.1 + 0.22 * pulse;
  ctx.drawImage(glowDisc(core), -20, -20, 40, 40);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.arc(0, 0, 4.6 + pulse * 1.2, 0, Math.PI * 2);
  ctx.fillStyle = core; ctx.fill();
  ctx.beginPath(); ctx.arc(-1.4, -1.6, 1.7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
}
function drawPowerups() {
  for (const pu of G.powerups) {
    ctx.save();
    // gentle bob + slight tilt — calmer than the old spin
    ctx.translate(pu.x, pu.y + Math.sin(pu.rot * 1.6) * 2);
    ctx.rotate(Math.sin(pu.rot) * 0.1);
    // AFT-023: HIGH-CONTRAST PROJECTILES rings pickups too — a catchable
    // thing must read at a glance against any sky (strokes only)
    if (SETTINGS.hcBall) {
      const ow = SETTINGS.hcStrength || 1; // AFT-010: OUTLINE STRENGTH
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3 * ow;
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4 * ow;
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke();
    }
    if (pu.p.key === 'riftShard') {
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 5 + pu.shardIndex * 1.8);
      ctx.shadowColor = '#d780ff'; ctx.shadowBlur = fxGlow(20 + pulse * 12); // shard + ring stay; halo yields under load
      ctx.beginPath();
      ctx.moveTo(0, -24); ctx.lineTo(16, -4); ctx.lineTo(7, 22); ctx.lineTo(-13, 12); ctx.lineTo(-17, -8); ctx.closePath();
      // gradient cached in local space — the CTM re-maps it per pickup at paint,
      // so no gradient is allocated per drop per frame (AFT-018)
      let sg = fxCache.riftGrad;
      if (!sg) {
        sg = ctx.createLinearGradient(-14, -20, 14, 22);
        sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#80e8ff'); sg.addColorStop(0.68, '#d780ff'); sg.addColorStop(1, '#6a1b9a');
        fxCache.riftGrad = sg;
      }
      ctx.fillStyle = sg; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = '#32114d'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(1, 8); ctx.lineTo(16, -4); ctx.moveTo(1, 8); ctx.lineTo(-13, 12); ctx.stroke();
      ctx.globalAlpha = 1;
      drawGlyph(ctx, 'fairy', 1, 3, 5.5, '#ffffff');
    } else if (pu.p.key === 'wish') {
      // AFT-020 siege coda: a falling wish-star with a soft tail
      const tw = 0.8 + 0.2 * Math.sin(G.time * 5 + pu.x * 0.03);
      ctx.strokeStyle = 'rgba(255,213,79,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -10); ctx.stroke();
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + pu.rot * 0.5;
        ctx.lineTo(Math.cos(a) * 11 * tw, Math.sin(a) * 11 * tw);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * 4.5, Math.sin(a + Math.PI / 4) * 4.5);
      }
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 4 * tw, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd54f'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    } else if (pu.p.key === 'bloom') {
      // AFT-020 relay coda: a soft five-petal bloom of rewound time —
      // strokes + fills only, gentle pulse, reads on bright and dark skies
      const pulse = 0.82 + 0.18 * Math.sin(G.time * 4 + pu.x * 0.05);
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 + pu.rot * 0.4;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 7, 4, a, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(185,246,202,0.85)';
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0, 0, 5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd54f'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#e8f5e9';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
    } else if (pu.p.key === 'element') {
      // element orb: small glassy sphere holding a type symbol
      const col = TYPE_COLORS[pu.p.t];
      ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8,12,30,0.85)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      ctx.shadowBlur = 0;
      if (SKIN.relicDrops) { // an ATTUNEMENT: the orb sits in a brass collar
        ctx.lineWidth = 1.6; ctx.strokeStyle = '#c9a44c';
        ctx.beginPath(); ctx.arc(0, 0, 15.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 15.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      drawGlyph(ctx, pu.p.t, 0, 0, 7.5, col);
    } else if (pu.p.key === 'pokeball' && SKIN.relicDrops) {
      drawBindingSigil(!!pu.shiny, 0.5 + 0.5 * Math.sin(G.time * 5 + pu.rot));
    } else if (pu.p.key === 'pokeball') {
      ctx.shadowColor = pu.shiny ? '#ffd700' : '#ef5350'; ctx.shadowBlur = pu.shiny ? 20 : 14;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI, 0, true); ctx.fillStyle = pu.shiny ? '#ffd700' : '#ef5350'; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#eceff1';
      ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#263238'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
    } else if (pu.p.key === 'heal' && SKIN.relicDrops) {
      // MENDING DRAUGHT: a brass-collared phial of rose aether — the same
      // urgent pulse as the clinical capsule, in this world's materials
      const col = pu.p.color, pulse = 0.5 + 0.5 * Math.sin(G.time * 7 + pu.rot);
      ctx.shadowColor = col; ctx.shadowBlur = 16 + pulse * 10;
      ctx.beginPath(); ctx.arc(0, 0, 20 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = col + '18'; ctx.fill();
      ctx.shadowBlur = 0;
      // glass body
      roundRect(-9, -6, 18, 22, 7);
      ctx.fillStyle = '#1a1020'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#9fb0c6'; ctx.stroke();
      // the draught inside, filling from the base
      ctx.save();
      ctx.beginPath(); roundRect(-9, -6, 18, 22, 7); ctx.clip();
      ctx.fillStyle = col;
      ctx.fillRect(-9, 2 - pulse * 1.5, 18, 16);
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffd7e2';
      ctx.fillRect(-9, 2 - pulse * 1.5, 18, 2.5);
      ctx.restore();
      // brass collar + stopper
      ctx.fillStyle = '#c9a44c';
      roundRect(-7.5, -11, 15, 6, 2.5); ctx.fill();
      ctx.fillStyle = '#3a2f1c';
      roundRect(-3.5, -15, 7, 5, 2); ctx.fill();
      // engraved rune on the glass
      ctx.shadowColor = col; ctx.shadowBlur = 7;
      drawGlyph(ctx, 'heart', 0, 6, 5.5, '#fff3f7');
      ctx.shadowBlur = 0;
    } else if (pu.p.key === 'heal') {
      // Recovery item: a medical capsule with a heart core, rotating cross
      // reticle, and a stronger pulse than ordinary drops so it reads as HP.
      const col = pu.p.color, pulse = 0.5 + 0.5 * Math.sin(G.time * 7 + pu.rot);
      ctx.shadowColor = col; ctx.shadowBlur = 16 + pulse * 10;
      ctx.beginPath(); ctx.arc(0, 0, 21 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = col + '18'; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.rotate(G.time * 0.8 + pu.rot * 0.15);
      ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = col + 'bb';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#ffd6e0'; ctx.fillRect(-2, -25, 4, 8);
      }
      ctx.restore();
      roundRect(-16, -16, 32, 32, 10);
      // gradient cached per colour in local space (CTM re-maps per drop at paint)
      let hg = fxCache['healGrad_' + col];
      if (!hg) {
        hg = ctx.createLinearGradient(-12, -16, 12, 16);
        hg.addColorStop(0, '#ffd7e2'); hg.addColorStop(0.36, col); hg.addColorStop(1, '#5b1730');
        fxCache['healGrad_' + col] = hg;
      }
      ctx.fillStyle = hg; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff0f4'; ctx.stroke();
      drawGlyph(ctx, 'heart', 0, 1, 9, '#fff');
      ctx.fillStyle = '#fff';
      ctx.fillRect(8, -12, 7, 2.5); ctx.fillRect(10.25, -14.25, 2.5, 7);
    } else if (SKIN.relicDrops) {
      const col = pu.p.color;
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 4 + pu.rot);
      drawRelicPlate(col, pu.p.icon, pulse);
    } else {
      // Power-up capsule: layered halo, gradient body, glass highlight, white
      // glyph, and orbiting sparks. The icon now feels like an active device
      // instead of a flat colored square.
      const col = pu.p.color;
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 4 + pu.rot);
      ctx.shadowColor = col; ctx.shadowBlur = 13 + 7 * pulse;
      ctx.beginPath(); ctx.arc(0, 0, 21 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = col + '14'; ctx.fill();
      roundRect(-17, -17, 34, 34, 10);
      // gradient cached per colour in local space (CTM re-maps per drop at paint)
      let cg = fxCache['capGrad_' + col];
      if (!cg) {
        cg = ctx.createLinearGradient(0, -17, 0, 17);
        cg.addColorStop(0, col + 'd9');
        cg.addColorStop(0.55, col + '55');
        cg.addColorStop(1, 'rgba(8,12,30,0.92)');
        fxCache['capGrad_' + col] = cg;
      }
      ctx.fillStyle = cg; ctx.fill();
      ctx.lineWidth = 1.8; ctx.strokeStyle = col;
      roundRect(-17, -17, 34, 34, 10); ctx.stroke();
      ctx.shadowBlur = 0;
      // glass sheen across the top
      ctx.globalAlpha = 0.32;
      roundRect(-13, -14, 26, 9, 4.5);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.globalAlpha = 1;
      drawGlyph(ctx, pu.p.icon, 0, 2.5, 10, '#fff');
      // three tiny satellites rotate in the opposite direction to the bob
      for (let i = 0; i < 3; i++) {
        const a2 = -G.time * 1.4 + pu.rot * 0.25 + i * Math.PI * 2 / 3;
        ctx.fillStyle = i === 0 ? '#fff' : col;
        ctx.beginPath(); ctx.arc(Math.cos(a2) * 22, Math.sin(a2) * 22, i === 0 ? 1.8 : 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    if (pu.hint) { // first-ever drops: tell the player to catch them
      const a = 0.6 + 0.4 * Math.sin(G.time * 6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 13px Orbitron, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
      ctx.fillText(pu.p.key === 'riftShard' ? 'RIFT SHARD · ' + (pu.shardIndex + 1) + '/3'
        : pu.p.key === 'heal' ? 'RECOVER!' : 'CATCH!', pu.x, pu.y - 34);
      ctx.beginPath();
      ctx.moveTo(pu.x - 5, pu.y - 27); ctx.lineTo(pu.x + 5, pu.y - 27); ctx.lineTo(pu.x, pu.y - 20);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

// additive shockwave rings — the modern kill pop, drawn before particles
function drawRings() {
  if (!G.rings.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of G.rings) {
    const p = 1 - r.life / r.maxLife;
    const rr = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - p, 2)); // ease-out expand
    ctx.globalAlpha = (1 - p) * 0.55;
    ctx.lineWidth = Math.max(0.5, r.lw * (1 - p * 0.5));
    ctx.strokeStyle = r.color;
    ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// SINGULARITY / EVENT HORIZON wells: an IMPLODING dashed ring (it contracts —
// the visual opposite of the expanding ringFx) with a dark heart. Strokes
// only: no per-frame gradients, respects the perf rules.
// BULWARK BATTERY's hex wall is a real gameplay ZONE (it eats shots crossing
// py-84), so it draws in every mode at exactly that line — segments are the
// readiness readout, and a rebuild floor shows as a dim outline.
function drawBulwarkWall() {
  if (!upgN('battery') || (G.state !== 'play' && G.state !== 'serve')) return;
  const wy = shipY() - 84, px = G.paddle.x;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const wx = px + (i - 1) * 40;
    const lit = i < (G.wallSeg || 0);
    ctx.globalAlpha = lit ? 0.6 + 0.15 * Math.sin(G.time * 3 + i) : (G.wallCD > 0 ? 0.1 : 0.2);
    ctx.strokeStyle = lit ? '#a5d6a7' : '#546e7a';
    ctx.lineWidth = lit ? 2 : 1.2;
    constellationHex(wx, wy, 13, 0); ctx.stroke();
    if (lit) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#a5d6a7';
      constellationHex(wx, wy, 13, 0); ctx.fill();
    }
  }
  ctx.restore();
}

function drawVortexes() {
  if (!G.vortexes.length) return;
  ctx.save();
  for (const v of G.vortexes) {
    const p = Math.min(1, v.t / v.dur);
    const col = TYPE_COLORS[v.element] || (v.horizon ? '#b388ff' : '#ffab40');
    const rr = v.r * (1 - p * 0.55); // contracting rim
    ctx.globalAlpha = (1 - p) * (v.horizon ? 0.8 : 0.6);
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = G.time * (SETTINGS.reduceFlash ? -14 : -60);
    ctx.strokeStyle = col; ctx.lineWidth = v.horizon ? 3 : 2;
    ctx.beginPath(); ctx.arc(v.x, v.y, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = (1 - p) * 0.4;
    ctx.fillStyle = v.horizon ? '#12002a' : '#1a0e00';
    ctx.beginPath(); ctx.arc(v.x, v.y, rr * 0.34, 0, Math.PI * 2); ctx.fill();
    if (v.horizon) { // bright accretion rim — the EVENT HORIZON read
      ctx.globalAlpha = (1 - p) * 0.85;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(v.x, v.y, rr * 0.38, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParticles() {
  drawRings();
  drawVortexes();
  drawBulwarkWall();
  // regular particles glow additively (premium over the dark sky); sparkle
  // glints ride the cached 4-point star sprite, twinkling as they fade
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glint = glintSprite();
  for (const p of G.particles) {
    const lf = Math.max(0, p.life / p.maxLife);
    if (p.glint) {
      const s = p.r * (0.6 + lf * 0.8);
      ctx.globalAlpha = lf * (0.6 + 0.4 * Math.sin(G.time * 22 + p.rot * 7));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + G.time * 2);
      if (p.color !== '#ffffff') { // tint gold glints via a soft color wash under the white star
        ctx.globalAlpha *= 0.9; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.drawImage(glint, -s, -s, s * 2, s * 2);
      ctx.restore();
    } else {
      ctx.globalAlpha = lf * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * lf, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // the floater drop-shadow is a constant #000 / blur 6 — set it ONCE before
  // the loop, not per floater (AFT-018: no per-entity shadowBlur in a hot loop)
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  for (const f of G.floaters) {
    if (PLATE_RENDER) break; // AFT-021 P2: no combat text bakes into the arena plate
    ctx.globalAlpha = Math.min(1, f.life);
    // AFT-027: a floater POPS in (and again whenever it is refreshed/summed)
    ctx.font = `900 ${f.size}px Orbitron, sans-serif`;
    ctx.fillStyle = f.color;
    // AFT-001: floaters spawn at world coords — measure once, clamp on-screen
    if (f._w == null) f._w = ctx.measureText(f.text).width;
    if (f.pop > 0) ctx.font = `900 ${(f.size * (1 + 0.32 * f.pop)).toFixed(1)}px Orbitron, sans-serif`;
    const fhw = f._w * (f.pop > 0 ? 1 + 0.32 * f.pop : 1) / 2;
    f._cx = Math.max(fhw + 4, Math.min(W - fhw - 4, f.x));
    let fy = f.y;
    if (stripRectLive && performance.now() - stripRectAt < 150) {
      const R = stripRectLive, hh = f.size * 0.7;
      if (f._cx + fhw > R.x && f._cx - fhw < R.x + R.w && fy + hh > R.y && fy - hh < R.y + R.h) {
        fy = fy < R.y + R.h / 2 ? R.y - hh - 3 : R.y + R.h + hh + 3; // step clear, nearest side
      }
    }
    ctx.fillText(f.text, f._cx, fy);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// greedy word-wrap using the current ctx.font
function wrapText(text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawAnnounce() {
  const a = G.announce;
  if (!a) return;
  // AFT-004: the pause overlay owns the whole screen — a TRIAL MODE or boss
  // card bleeding through it is a layering bug. The card's timer is frozen
  // while paused (update is gated), so it resumes cleanly on unpause.
  if (paused && (G.state === 'play' || G.state === 'serve')) return;
  // AFT-002: the reveal scene owns the frame — its panel IS the boss card;
  // the strip would just bleed through the scrim underneath it.
  if (G.reveal) return;
  // AFT-009R P1: the draft/Forge is a full-screen decision — a stale TRIAL
  // or region card ghosting through the three-card stack is pure noise.
  // The card's timer keeps draining in update, so nothing is hoarded.
  if (G.state === 'upgrade') return;
  // LIVE COMBAT never gets a banner in the flight lane: while playing,
  // everything but a hero announcement (boss-round reveals) renders as a
  // compact strip tucked under the HUD, sliding in from the top. The centre
  // card remains for serve/menu/draft states and boss drama.
  const compact = G.state === 'play' && !a.hero;
  if (compact) { drawAnnounceStrip(a); return; }
  const fadeOut = a.max - a.t < 0.3 ? (a.max - a.t) / 0.3 : 1;
  const alpha = Math.min(fadeOut, a.t < 0.5 ? a.t / 0.5 : 1);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let y = H * 0.64;
  const maxTextW = Math.min(W - 60, 560);
  const isGlyph = a.icon && /^[a-z]+$/.test(a.icon);
  const gR = Math.min(15, W / 30);
  let nameSize = Math.min(28, W / 16);
  ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
  let nameW = ctx.measureText(a.name).width + (isGlyph ? gR * 2 + 14 : (a.icon ? ctx.measureText(a.icon + '  ').width : 0));
  if (nameW > maxTextW) { // shrink long names to fit rather than clipping
    nameSize = Math.max(13, nameSize * maxTextW / nameW);
    ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
    nameW = ctx.measureText(a.name).width + (isGlyph ? gR * 2 + 14 : (a.icon ? ctx.measureText(a.icon + '  ').width : 0));
  }
  ctx.font = bodyFont(12.5, 700);
  const descLines = wrapText(a.desc, maxTextW);
  ctx.font = bodyFont(10.5, 600);
  const subLines = a.sub ? wrapText(a.sub, maxTextW) : [];
  const descH = descLines.length * 19, subH = subLines.length * 16;
  let lineW = nameW;
  ctx.font = bodyFont(12.5, 700);
  for (const l of descLines) lineW = Math.max(lineW, ctx.measureText(l).width);
  ctx.font = bodyFont(10.5, 600);
  for (const l of subLines) lineW = Math.max(lineW, ctx.measureText(l).width);
  const pillW = Math.min(W - 16, lineW + 56);
  const pillH = 62 + descH + (subH ? subH + 6 : 0);
  // AFT-021 P2: on touch, the hero card may never sit on the control pads —
  // its bottom edge clamps above the highest control (short-landscape phones
  // put the pads well up the screen)
  if (IS_TOUCH && (G.state === 'play' || G.state === 'serve')) {
    const B = touchButtons();
    // only the BOTTOM cluster (fire/mega) constrains the card — pause rides
    // the top corner and never shares the card's centered column
    const tops = [B.fire, B.mega].filter(Boolean).map(b => b.y - b.r);
    const padTop = tops.length ? Math.min(...tops) : H;
    y = Math.max(SAFE_T + 130, Math.min(y, padTop - 12 - pillH + 32));
  }
  // entrance: the banner scales in with a soft pop instead of just appearing
  const enter = Math.min(1, (a.max - a.t) / 0.22);
  const sc = 0.93 + 0.07 * (1 - Math.pow(1 - enter, 3));
  ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.translate(-W / 2, -y);
  claimSurface('announceCard', W / 2 - pillW / 2, y - 32, pillW, pillH);
  // translucent pill behind the text so it reads over any background
  ctx.globalAlpha = alpha * 0.72;
  roundRect(W / 2 - pillW / 2, y - 32, pillW, pillH, 20);
  ctx.fillStyle = 'rgba(6,9,24,0.82)'; ctx.fill();
  ctx.strokeStyle = a.color + '66'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha = alpha * 0.95;
  ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
  ctx.shadowColor = a.color; ctx.shadowBlur = 16;
  ctx.fillStyle = a.color;
  if (isGlyph) {
    const tW = ctx.measureText(a.name).width;
    drawGlyph(ctx, a.icon, W / 2 - tW / 2 - gR - 8, y, gR, a.color);
    ctx.fillText(a.name, W / 2 + gR + 4, y);
  } else {
    ctx.fillText((a.icon ? a.icon + '  ' : '') + a.name, W / 2, y);
  }
  ctx.shadowBlur = 0;
  ctx.font = bodyFont(12.5, 700);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = alpha * 0.85;
  descLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 28 + i * 19));
  if (subLines.length) {
    ctx.font = bodyFont(10.5, 600);
    ctx.fillStyle = '#90a4ae';
    ctx.globalAlpha = alpha * 0.8;
    subLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 28 + descH + 8 + i * 16));
  }
  // a caught Pokémon rides a round portrait badge straddling the pill's top
  if (a.spriteId) {
    const spr = getSprite(a.spriteId, a.spriteShiny);
    if (spr.complete && spr.naturalWidth) {
      const r = Math.min(34, W / 12);
      const bx = W / 2, by = y - 32 - r * 0.5;
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6,9,24,0.95)'; ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(bx, by, r - 2.5, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(spr, bx - r, by - r, r * 2, r * 2);
      ctx.restore();
      ctx.lineWidth = 2.5; ctx.strokeStyle = a.color;
      ctx.shadowColor = a.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

// the in-combat variant of drawAnnounce: one tight strip under the HUD line,
// name + one detail line (+ inline portrait for catches). It slides down from
// the top so arrival messaging reads as HUD, not as a card over the pilot.
// last drawn strip rect (and when) — combat floaters read it so a call-out
// never prints across the banner (AFT-029: "HIGH GROUND" sat on top of the
// TREASURE BRICKS strip). Wall-clock stamped, presentation only.
let stripRectLive = null, stripRectAt = -1;
function drawAnnounceStrip(a) {
  const fadeOut = a.max - a.t < 0.3 ? (a.max - a.t) / 0.3 : 1;
  const alpha = Math.min(fadeOut, a.t < 0.4 ? a.t / 0.4 : 1);
  const enter = Math.min(1, (a.max - a.t) / 0.22);
  // below the full left HUD column (type/rift/build rows) and the corner
  // buttons on phones; wide screens tuck it right under the wave title.
  // SHORT viewports (landscape phones) have no free band under the HUD —
  // the flocks fly there — so the strip uses the mid-screen gap between
  // the flock band and the ship's lane instead
  // SHOOTER modes (2026-07-21): the top band is where squads ENTER and
  // bosses live — the strip was landing on the characters. It now rides the
  // LOW BAND between the formation floor and the ship's lane. Classic keeps
  // the under-HUD strip (its wall starts lower and the paddle owns the floor).
  // AFT-001: on SHORT viewports (375-tall landscape) the low-band formula
  // wraps back into the top band and lands on the objective pill and the
  // left HUD rows (combo/element/build end ~y116) — floor it below the whole
  // banner cluster. Tall screens keep the original low-band placement.
  const y = Math.max(SAFE_T + 120, G.mode !== 'classic'
    ? (G.mode === 'junkie' ? PADDLE_Y() - SHIP_BAND : PADDLE_Y()) - 78
    : H < 560 ? H * 0.42 : SAFE_T + (W < 560 ? 150 : 88));
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(0, -14 * (1 - enter) * (1 - enter));
  const isGlyph = a.icon && /^[a-z]+$/.test(a.icon);
  const gR = 8;
  const sprR = a.spriteId ? 15 : 0;
  let nameSize = Math.min(14.5, W / 30);
  ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
  const maxTextW = Math.min(W - 70, 470);
  let nameW = ctx.measureText(a.name).width;
  if (nameW > maxTextW) {
    nameSize = Math.max(10, nameSize * maxTextW / nameW);
    ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
    nameW = ctx.measureText(a.name).width;
  }
  ctx.font = bodyFont(10, 700);
  const descW = Math.min(ctx.measureText(a.desc).width, maxTextW);
  // the sprite medallion owns the strip's LEFT END and the two text lines
  // centre in what remains (it used to sit inline with the name while the
  // description centred across the whole strip — straight through it)
  const sprLead = sprR ? sprR * 2 + 12 : 0;
  const lead = isGlyph ? gR * 2 + 8 : 0;
  const pillW = Math.min(W - 12, Math.max(nameW + lead, descW) + sprLead + 44);
  const tcx = W / 2 + sprLead / 2;
  const pillH = a.desc ? 46 : 30;
  claimSurface('announceStrip', W / 2 - pillW / 2, y - pillH / 2, pillW, pillH);
  stripRectLive = { x: W / 2 - pillW / 2, y: y - pillH / 2, w: pillW, h: pillH }; stripRectAt = performance.now();
  // AFT-030: the strip is a kit panel — hairline edged in the card's colour
  // with ONE accent bar, the same language as every HUD plate
  ctx.globalAlpha = alpha;
  uiPanel(W / 2 - pillW / 2, y - pillH / 2, pillW, pillH, { r: 12, accent: a.color, bar: 'left' });
  const nameY = a.desc ? y - 9 : y;
  ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
  ctx.fillStyle = a.color;
  const half = (nameW + lead) / 2;
  let lx = tcx - half;
  if (sprR) {
    const spr = getSprite(a.spriteId, a.spriteShiny);
    const sx0 = W / 2 - pillW / 2 + 12;
    if (spr.complete && spr.naturalWidth) {
      ctx.save();
      ctx.beginPath(); ctx.arc(sx0 + sprR, y, sprR - 1, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(spr, sx0, y - sprR, sprR * 2, sprR * 2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(sx0 + sprR, y, sprR, 0, Math.PI * 2);
      ctx.strokeStyle = a.color; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  if (isGlyph) { drawGlyph(ctx, a.icon, lx + gR, nameY, gR, a.color); lx += gR * 2 + 8; }
  ctx.textAlign = 'left';
  ctx.fillText(a.name, lx, nameY);
  if (a.desc) {
    ctx.textAlign = 'center';
    ctx.font = bodyFont(10, 700);
    ctx.fillStyle = UI.ink;
    ctx.globalAlpha = alpha;
    ctx.fillText(a.desc, tcx, y + 11, Math.min(maxTextW, pillW - sprLead - 28));
  }
  ctx.restore();
}

// transient tutorial hint: shows until you've fired a few shots.
// on touch it points at the FIRE button instead of the paddle
// ONE contextual hint at a time, in a control-safe zone: on touch the pill
// sits well ABOVE the button row and the ship — it never competes with
// MEGA/FIRE/CHARGE or covers the pilot
function drawShootHint() {
  // Stage, trial, power-up, and evolution announcements own the centre lane.
  // Tutorials wait their turn instead of stacking a second banner over them.
  if (G.announce) return;
  // the STARFIGHTER first-flight coach teaches these same controls one step
  // at a time — while it runs, the generic hint stays out of the way
  if (G.jCoach) return;
  // CHARGE TUTOR: while armored/rock targets are on screen and the player has
  // NEVER fired a charged shot, a bright pulsing banner stays up until they
  // do — the one mechanic worth nagging about
  if (G.state === 'play' && G.mode !== 'classic' && !G.chargedEver && G.hurtHud <= 0 &&
      G.bricks.some(b => !b.dead && (b.shellArmor || b.barrier))) {
    const pa = 0.72 + 0.28 * Math.sin(G.time * 4);
    const txt = IS_TOUCH ? '⚡ HOLD FIRE — CHARGE A SHOT ⚡'
      : '⚡ HOLD RIGHT-CLICK / SHIFT — CHARGE A SHOT ⚡';
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tsz = W < 560 ? UI.label : UI.title;
    ctx.font = `800 ${tsz}px Orbitron, sans-serif`;
    const tw2 = Math.min(W - 24, ctx.measureText(txt).width + 44); // AFT-001: viewport cap
    // AFT-022 F6: the tutor is DOCKED in the control-adjacent band (the same
    // lane the movement hint and flight coach use), never mid-screen — at
    // H·0.62 it sat across the portrait flight lane the player fights in
    const hy2 = IS_TOUCH ? FLOOR() - 168 : shipY() - (G.mode === 'junkie' ? 96 : 72);
    claimSurface('chargeTutor', W / 2 - tw2 / 2, hy2 - 17, tw2, 34);
    // AFT-030: a kit panel with a firm cyan edge — the pulse is in its
    // alpha, never a blur glow
    ctx.globalAlpha = pa;
    uiPanel(W / 2 - tw2 / 2, hy2 - 17, tw2, 34, { r: 12, accent: '#4dd0e1', sel: true });
    fitLabel(txt, W / 2, hy2 + 1, { size: tsz, min: 9, weight: 800, color: '#e0f7fa', maxW: tw2 - 20 });
    ctx.restore();
    return; // only one tutorial banner may own the centre lane
  }
  const autoTutor = SETTINGS.autoFire && G.mode !== 'classic';
  // Auto-fire reaches three shots behind the opening announcement, which used
  // to retire this lesson before the player could ever see it. Give that mode
  // a short, guaranteed teaching window after the stage card clears.
  if (G.state !== 'play' || G.playT > (autoTutor ? 9 : 20) || (!autoTutor && G.shotsFired >= 3)) return;
  // CLASSIC has no blaster until it's earned — don't prompt the player to shoot
  if (G.mode === 'classic' && !blasterArmed()) return;
  // AFT-021 P3: the generic movement hint is FLAVOR-priority — it yields to
  // any live objective or finale meter (finale trials were opening with this
  // pill sitting across the vows)
  if (goalSurfaceLive()) return;
  const a = Math.min(1, G.playT / 0.6) * (0.55 + 0.35 * Math.sin(G.time * 5));
  const text = G.mode === 'junkie'
    ? (IS_TOUCH ? (SETTINGS.autoFire ? 'DRAG TO FLY · AUTO-FIRE ON · HOLD = BIG ATTACK' : 'DRAG TO FLY · TAP ATTACK · HOLD = BIG ATTACK') : 'MOVE TO FLY · CLICK TO ATTACK · RIGHT-CLICK/SHIFT CHARGES')
    : G.mode === 'blaster'
      ? (IS_TOUCH ? (SETTINGS.autoFire ? 'DRAG TO MOVE · AUTO-FIRE ON · HOLD = CHARGE' : 'DRAG TO MOVE · TAP FIRE · HOLD = CHARGE') : 'MOVE TO STEER · CLICK TO FIRE · RIGHT-CLICK/SHIFT CHARGES')
      : (IS_TOUCH ? 'HOLD FIRE TO SHOOT' : 'HOLD CLICK TO SHOOT — MIND THE HEAT');
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = bodyFont(UI.label, 700);
  const tw = Math.min(W - 24, ctx.measureText(text).width + 28);
  const x = IS_TOUCH ? W / 2 : Math.max(tw / 2 + 12, Math.min(W - tw / 2 - 12, G.paddle.x));
  const y = IS_TOUCH ? FLOOR() - 168 : shipY() - (G.mode === 'junkie' ? 96 : 72);
  claimSurface('moveHint', x - tw / 2, y - 15, tw, 30);
  uiPanel(x - tw / 2, y - 15, tw, 30, { r: 11, soft: true, accent: UI.player });
  fitLabel(text, x, y + 1, { size: UI.label, min: 9, weight: 700, color: '#cdeeff', maxW: tw - 16,
    family: "Verdana, 'Segoe UI', system-ui, sans-serif" });
  ctx.restore();
}

function drawShield() {
  if (G.shieldCharges <= 0 && !(G.shieldFlash > 0)) return;
  ctx.save();
  const flare = G.shieldFlash || 0;
  if (G.mode !== 'classic') {
    // shooter modes: shields are a personal barrier — a bubble riding the
    // ship/paddle that visibly eats the hit (cheap: strokes only, no blur)
    const px = G.paddle.x, py = shipY();
    const r = (G.mode === 'junkie' ? 40 : 52) + flare * 10;
    const a = Math.min(0.9, 0.3 + 0.1 * Math.sin(G.time * 4) + G.shieldCharges * 0.06 + flare * 0.5);
    ctx.strokeStyle = `rgba(165,214,167,${a})`;
    ctx.lineWidth = 2 + flare * 2.5;
    ctx.beginPath(); ctx.arc(px, py, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.strokeStyle = `rgba(102,187,106,${a * 0.55})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(px, py, r + 5, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
    // charge pips over the crown of the bubble
    for (let i = 0; i < G.shieldCharges; i++) {
      ctx.fillStyle = `rgba(165,214,167,${Math.min(1, a + 0.25)})`;
      ctx.beginPath();
      ctx.arc(px + (i - (G.shieldCharges - 1) / 2) * 10, py - r - 8, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (G.shieldCharges <= 0) { ctx.restore(); return; }
  const a = 0.25 + 0.12 * Math.sin(G.time * 4) + G.shieldCharges * 0.08 + flare * 0.4;
  const fl = FLOOR();
  const g = ctx.createLinearGradient(0, fl - 26, 0, fl);
  g.addColorStop(0, 'rgba(102,187,106,0)');
  g.addColorStop(1, `rgba(102,187,106,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, fl - 26, W, 26);
  ctx.strokeStyle = `rgba(165,214,167,${a + 0.3})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, fl - 8); ctx.lineTo(W, fl - 8); ctx.stroke();
  ctx.restore();
}

// Every permanent pick gets the same concise acquisition grammar: its glyph
// travels into the player, the matching path color locks into a hex ring, and
// one segment remains for each tier. It reads even with reduced flash enabled.
function drawUpgradeInstallFx() {
  const fx = G.upgradeFx;
  if (!fx) return;
  const p = 1 - fx.t / fx.max;
  const settle = Math.min(1, p / 0.42);
  const fade = p < 0.78 ? 1 : Math.max(0, (1 - p) / 0.22);
  const x = G.paddle.x, y = shipY();
  const col = fx.color || '#80d8ff';
  ctx.save();
  ctx.globalAlpha = fade * (SETTINGS.reduceFlash ? 0.78 : 1);
  ctx.globalCompositeOperation = SETTINGS.reduceFlash ? 'source-over' : 'lighter';
  // a superskill acquisition (fx.big) speaks the same install language,
  // drawn half again as large with a counter-rotating outer frame
  const scale = fx.big ? 1.55 : 1;
  const by = y - 92 * (1 - settle);
  const br = (13 - settle * 3) * scale;
  blitBadge(fx.icon || 'star', x, by, br, col, 'lit');
  if (settle > 0.35) {
    const lock = Math.min(1, (settle - 0.35) / 0.65);
    const rr = (18 + lock * 34 + p * 8) * scale;
    ctx.strokeStyle = col; ctx.lineWidth = 3 - p * 1.2;
    constellationHex(x, y, rr, Math.PI / 6 + p * (SETTINGS.reduceFlash ? 0.08 : 0.32)); ctx.stroke();
    if (fx.big) {
      ctx.globalAlpha *= 0.7;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
      constellationHex(x, y, rr + 9, -p * (SETTINGS.reduceFlash ? 0.06 : 0.5)); ctx.stroke();
      ctx.globalAlpha /= 0.7;
    }
    const segs = Math.max(1, Math.min(4, (fx.tierIdx | 0) + 1));
    for (let i = 0; i < segs; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / segs;
      const sx = x + Math.cos(a) * (rr + 7), sy = y + Math.sin(a) * (rr + 7);
      ctx.fillStyle = i === segs - 1 ? '#ffffff' : col;
      constellationHex(sx, sy, 3.6, Math.PI / 6); ctx.fill();
    }
  }
  ctx.restore();
}

function drawDangerLine() {
  if (G.state !== 'play') return;
  // only the boxed, descending wall can cross the danger line and cost a life;
  // flyers never do. On static waves nothing descends, so this stays hidden.
  let lowest = -Infinity;
  for (const br of G.bricks) {
    if (br.dead || br.isBoss || br.dive || (br.flight && br.flight.state >= 1)) continue;
    lowest = Math.max(lowest, br.by + G.fy + br.h / 2);
  }
  const prox = (lowest - (DANGER_Y() - 200)) / 200;
  if (prox <= 0.35) return; // only warn when genuinely close — no early-game noise
  const a = Math.min(0.5, prox * 0.5) * (0.6 + 0.4 * Math.sin(G.time * 6));
  ctx.strokeStyle = `rgba(255,82,82,${a})`;
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, DANGER_Y()); ctx.lineTo(W, DANGER_Y()); ctx.stroke();
  ctx.setLineDash([]);
}

// Each STARFIGHTER finale arrival gets a distinct arena sigil. Motion is
// authored in updateGauntletEntrance; this layer supplies the matching gate,
// storm, eclipse, shrine, or rift language without changing hitboxes.
function drawGauntletEntranceFx() {
  const e = G.gauntlet?.entry;
  if (!e || G.mode !== 'junkie') return;
  const p = Math.min(1, e.t / e.dur), pulse = Math.sin(p * Math.PI);
  const styles = Object.keys(SKIN.gauntletEntranceNames), si = Math.max(0, styles.indexOf(e.style));
  const cx = W / 2, cy = Math.min(H * 0.34, 245), col = e.color || '#80d8ff';
  const reduced = SETTINGS.reduceFlash ? 0.45 : 1;
  ctx.save();
  ctx.globalAlpha = pulse * 0.2 * reduced;
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  const spokes = 3 + si % 7, dir = si % 2 ? -1 : 1;
  const baseR = Math.min(W, H) * (0.12 + (si % 4) * 0.018) * (0.45 + p * 1.4);
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = 1.4 + si % 3;
  ctx.globalAlpha = pulse * 0.75;
  ctx.setLineDash(si % 3 === 0 ? [12, 8] : si % 3 === 1 ? [3, 7] : []);
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = dir * p * (0.8 + si * 0.035) + i * Math.PI * 2 / spokes;
    const r1 = baseR * (0.36 + (i % 2) * 0.13), r2 = baseR;
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.62);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2 * 0.62);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  for (let r = 0; r < 2 + si % 3; r++) {
    ctx.globalAlpha = pulse * (0.62 - r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, baseR * (0.5 + r * 0.24), baseR * (0.2 + r * 0.1),
      dir * p * (si % 5 + 1) * 0.24 + r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
  // The strongest motifs read instantly even before the nameplate appears.
  if (['stormfront', 'thunderhead', 'starfall'].includes(e.style)) {
    ctx.lineWidth = 3; ctx.globalAlpha = pulse;
    for (let i = -2; i <= 2; i++) {
      const x = i * W * 0.085 + Math.sin(i * 9 + p * 16) * 18;
      ctx.beginPath(); ctx.moveTo(x, -cy - 20); ctx.lineTo(x - 16, -38);
      ctx.lineTo(x + 12, 4); ctx.lineTo(x - 8, 72); ctx.stroke();
    }
  } else if (['blackwing', 'moonrise', 'nightmare', 'voidcrown'].includes(e.style)) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = pulse * 0.82; ctx.fillStyle = '#02030d';
    ctx.beginPath(); ctx.arc(0, 0, baseR * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
  } else if (['prism', 'swords', 'diamondbirth'].includes(e.style)) {
    ctx.globalAlpha = pulse * 0.7;
    for (let i = 0; i < spokes; i++) {
      const a = i * Math.PI * 2 / spokes + p;
      ctx.save(); ctx.rotate(a); ctx.beginPath();
      ctx.moveTo(0, -baseR * 0.12); ctx.lineTo(baseR * 0.7, 0);
      ctx.lineTo(0, baseR * 0.12); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  } else if (['totem', 'shrine', 'junglecall', 'toxicmask'].includes(e.style)) {
    ctx.font = `900 ${18 + si % 5 * 2}px Orbitron, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + dir * p;
      ctx.globalAlpha = pulse * (0.45 + (i % 2) * 0.25);
      ctx.fillText(i % 2 ? '◇' : '✦', Math.cos(a) * baseR * 0.72, Math.sin(a) * baseR * 0.42);
    }
  } else if (e.style === 'maxrift') {
    ctx.globalAlpha = pulse; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, -baseR); ctx.bezierCurveTo(-45, -baseR * 0.4, 50, baseR * 0.25, 0, baseR); ctx.stroke();
  } else if (e.style === 'skycoil') {
    // two interleaved serpent-coils winding UP through the sigil
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = pulse * 0.82;
    for (let c = 0; c < 2; c++) {
      ctx.beginPath();
      for (let k = 0; k <= 22; k++) {
        const yy = baseR - k / 22 * baseR * 2, xx = Math.sin(k * 0.7 + c * Math.PI + p * 6) * baseR * 0.34;
        k === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  } else if (e.style === 'suncharge') {
    // radial sun rays + low horizontal speed lines
    ctx.lineWidth = 2; ctx.globalAlpha = pulse * 0.85;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + p * 0.5, r1 = baseR * 0.3, r2 = baseR * (0.82 + 0.16 * (i % 2));
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
    }
    ctx.globalAlpha = pulse * 0.5;
    for (let i = -2; i <= 2; i++) {
      const yy = i * baseR * 0.26;
      ctx.beginPath(); ctx.moveTo(-baseR * (0.9 + p * 0.4), yy); ctx.lineTo(baseR * 0.3, yy); ctx.stroke();
    }
  } else if (e.style === 'maelstrom') {
    // double spiral of storm arcs converging on center
    ctx.lineWidth = 2.5; ctx.globalAlpha = pulse * 0.8;
    for (let s2 = 0; s2 < 2; s2++) {
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const rr2 = baseR * (1 - k / 40), a = k * 0.4 + s2 * Math.PI + dir * p * 3;
        const xx = Math.cos(a) * rr2, yy = Math.sin(a) * rr2 * 0.72;
        k === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  } else if (e.style === 'timesplit') {
    // cracked clock: offset arc fragments + tick marks
    ctx.lineWidth = 2.5; ctx.globalAlpha = pulse * 0.8;
    for (let i = 0; i < 5; i++) {
      const a0 = i * Math.PI * 2 / 5 + p * 0.4, off = (i % 2 ? 1 : -1) * baseR * 0.05;
      ctx.beginPath(); ctx.arc(off, off * 0.6, baseR * 0.72, a0, a0 + Math.PI * 2 / 5 * 0.7); ctx.stroke();
    }
    ctx.lineWidth = 2; ctx.globalAlpha = pulse * 0.65;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * baseR * 0.6, Math.sin(a) * baseR * 0.6);
      ctx.lineTo(Math.cos(a) * baseR * 0.74, Math.sin(a) * baseR * 0.74); ctx.stroke();
    }
  } else if (e.style === 'psybreak') {
    // concentric ripple rings with one (rotating) broken gap
    ctx.lineWidth = 2.5; ctx.globalAlpha = pulse * 0.8;
    const gapA = p * 2;
    for (let r = 0; r < 4; r++) {
      const rr2 = baseR * (0.3 + r * 0.22);
      ctx.beginPath(); ctx.arc(0, 0, rr2, gapA + 0.5, gapA + Math.PI * 2 - 0.5); ctx.stroke();
    }
  } else if (e.style === 'wishgate') {
    // portal arc ringed by five orbiting stars
    ctx.lineWidth = 3; ctx.globalAlpha = pulse * 0.8;
    ctx.beginPath(); ctx.arc(0, 0, baseR * 0.5, p * 2, p * 2 + Math.PI * 1.5); ctx.stroke();
    ctx.lineWidth = 2; ctx.globalAlpha = pulse * 0.9;
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + dir * p * 1.5, sx3 = Math.cos(a) * baseR * 0.82, sy3 = Math.sin(a) * baseR * 0.82 * 0.7, sr = 6;
      ctx.beginPath();
      ctx.moveTo(sx3 - sr, sy3); ctx.lineTo(sx3 + sr, sy3);
      ctx.moveTo(sx3, sy3 - sr); ctx.lineTo(sx3, sy3 + sr); ctx.stroke();
    }
  } else if (e.style === 'timebloom') {
    // petal arcs unfolding OUT from the sigil as p grows
    ctx.lineWidth = 2.5; ctx.globalAlpha = pulse * 0.8;
    const petals = 6, open = baseR * (0.28 + p * 0.5);
    for (let i = 0; i < petals; i++) {
      const a = i * Math.PI * 2 / petals + p * 0.6;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * open, Math.sin(a) * open * 0.7, baseR * 0.26, baseR * 0.12, a, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (e.style === 'victorflare') {
    // bold V flare + inner echo + rising ember dots
    ctx.lineWidth = 4; ctx.globalAlpha = pulse; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-baseR * 0.5, -baseR * 0.5); ctx.lineTo(0, baseR * 0.42); ctx.lineTo(baseR * 0.5, -baseR * 0.5); ctx.stroke();
    ctx.lineWidth = 2; ctx.globalAlpha = pulse * 0.6;
    ctx.beginPath();
    ctx.moveTo(-baseR * 0.3, -baseR * 0.5); ctx.lineTo(0, baseR * 0.25); ctx.lineTo(baseR * 0.3, -baseR * 0.5); ctx.stroke();
    ctx.globalAlpha = pulse * 0.85;
    for (let i = 0; i < 8; i++) {
      const ex = Math.sin(i * 2.3) * 0.5 * baseR, ey = baseR * 0.4 - ((i / 8 + p) % 1) * baseR * 1.2;
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (e.style === 'shadowstep') {
    // three dark echo rings stepping to one side
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) {
      const ox = -i * baseR * 0.3 * dir;
      ctx.fillStyle = '#05030f'; ctx.globalAlpha = pulse * (0.68 - i * 0.2) * reduced;
      ctx.beginPath(); ctx.ellipse(ox, 0, baseR * 0.46, baseR * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = pulse * (0.82 - i * 0.2); ctx.stroke();
    }
  } else if (e.style === 'stampede') {
    // dust chevrons marching across the sigil
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = pulse * 0.8;
    for (let row = -1; row <= 1; row++) {
      for (let i = 0; i < 4; i++) {
        const prog = (i / 4 + p + row * 0.13) % 1, xx = -baseR + prog * baseR * 2, yy = row * baseR * 0.3;
        ctx.beginPath(); ctx.moveTo(xx - 14, yy - 12); ctx.lineTo(xx, yy); ctx.lineTo(xx - 14, yy + 12); ctx.stroke();
      }
    }
  } else if (e.style === 'monolith') {
    // vertical monolith slabs of varying height
    ctx.lineWidth = 2.5; ctx.globalAlpha = pulse * 0.78;
    for (let i = -2; i <= 2; i++) {
      const xx = i * baseR * 0.32, hh = baseR * (0.7 + 0.25 * Math.sin(i * 1.3 + p * 3));
      ctx.strokeRect(xx - baseR * 0.1, -hh, baseR * 0.2, hh * 2);
    }
  } else if (e.style === 'orbit') {
    // three orbit ellipses at different tilts, each with a travelling dot
    ctx.lineWidth = 2.5; ctx.globalAlpha = pulse * 0.8;
    for (let i = 0; i < 3; i++) {
      const tilt = i * Math.PI / 3 + p * 0.5;
      ctx.beginPath(); ctx.ellipse(0, 0, baseR * 0.75, baseR * 0.28, tilt, 0, Math.PI * 2); ctx.stroke();
      const oa = dir * p * 4 + i * 2, ex = Math.cos(oa) * baseR * 0.75, ey = Math.sin(oa) * baseR * 0.28;
      const rx = ex * Math.cos(tilt) - ey * Math.sin(tilt), ry = ex * Math.sin(tilt) + ey * Math.cos(tilt);
      ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (e.style === 'cocoon') {
    // woven cocoon oval with a cross-hatch weave
    ctx.lineWidth = 2; ctx.globalAlpha = pulse * 0.78;
    const ow = baseR * 0.5, oh = baseR * 0.8;
    ctx.beginPath(); ctx.ellipse(0, 0, ow, oh, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      const yy = i * baseR * 0.2, halfW = ow * Math.sqrt(Math.max(0, 1 - (yy / oh) ** 2)), sk = Math.sin(i * 0.8 + p * 4) * 6;
      ctx.beginPath(); ctx.moveTo(-halfW, yy - sk); ctx.lineTo(halfW, yy + sk); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-halfW, yy + sk); ctx.lineTo(halfW, yy - sk); ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  const a = Math.min(1, p * 5) * Math.min(1, (1 - p) * 6 + 0.2);
  const bannerY = W < 520 ? Math.min(310, H * 0.46) : Math.max(82, Math.min(110, H * 0.145));
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const plateW = Math.min(W - 24, 560);
  roundRect(cx - plateW / 2, bannerY - 23, plateW, 58, 13);
  ctx.fillStyle = 'rgba(3,6,20,0.48)'; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = a * 0.5; ctx.stroke();
  ctx.globalAlpha = a;
  ctx.font = `900 ${Math.min(24, Math.max(15, W / 30))}px Orbitron, sans-serif`;
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.fillText('ROUND ' + e.round + ' · ' + gauntletEntranceName(e.style), cx, bannerY, W - 28);
  ctx.shadowBlur = 0;
  ctx.font = `700 ${Math.min(12, Math.max(9, W / 62))}px Orbitron, sans-serif`;
  ctx.fillStyle = '#eef7ff';
  const detail = e.role === 'sentinel' ? 'SUB-LEGENDARIES · ONE PHASE'
    : e.role === 'legendary' ? 'LEGENDARY · TWO PHASES' : e.role === 'secret' ? 'SECRET MYTHICAL · THREE PHASES' : 'MYTHICAL · THREE PHASES';
  ctx.fillText(detail, cx, bannerY + 25, W - 28);
  ctx.restore();
}

// (drawLifeRing, the old glowing life dial, was dead code — nothing called it
// since the segmented HP component took over; removed in AFT-025b.)
// ── AFT-030: THE COMBAT HUD (phone-first rebuild) ──────────────────────────
// The in-combat HUD used to be a scatter of fragments over the playfield.
// It is now THREE structural surfaces in the UI kit's one panel language:
//   1. THE TOP BAR (0 → SAFE_T + HUD_BAR_H): tabular score (left), the stage
//      breadcrumb (under the score on phones, centred on wide screens), the
//      single segmented HP component (right) — and on touch the pause
//      button lives IN the bar's right end (touchButtons owns its rect).
//   2. THE STATUS ROW directly beneath it (HUD_ROW_H): combo / rift key /
//      build on the left, the goal pill (or region rule / modifier) in the
//      centre, the docked boss lane + roster rail on the right. Every item
//      is a backed plate on ONE baseline, placed by hudStatusLayout(); when
//      the row is full the lower-priority LEFT items yield (build, then rift
//      key, then combo) — the goal never shrinks below a readable width.
//   3. THE CONTROL DOCK on the bottom edge: a backed shelf drawn UNDER the
//      world (render → drawHudDockShelf, so the vessel flies over it), with
//      the chips + resonance meter on one side and SURGE + FIRE on the other
//      (mirrored in left-handed mode). One grid: chips and pad captions share
//      row A, the resonance meter rides row B, both pads share one centre.
// combatSafeRect().y0 === SAFE_T + HUD_BAR_H + HUD_ROW_H during live combat.
// Presentation only — update() reads none of this.
const HUD_BAR_H = 56, HUD_ROW_H = 34;
function hudLive() { return G.state === 'play' || G.state === 'serve'; }
// the top bar's geometry, LOCAL to the bar (drawHUD translates by SAFE_T)
function hudBarLayout() {
  const narrow = W < 560;
  const pause = IS_TOUCH ? touchButtons().pause : null;
  const right = pause ? pause.x - pause.r - 10 : W - 14 - SAFE_R;
  const hpW = narrow ? (W < 360 ? 100 : 118) : 158;
  return { narrow, pause, right, cy: 24, crumbY: 46, scoreX: 14 + SAFE_L,
    hp: { x: right - hpW, y: 11, w: hpW, h: 26 } };
}
// SCORE — tabular numerals (every digit centred in a fixed cell, so the
// number never jitters as it counts), leading zeros quiet, the live digits
// in ink; gold while the count is still ticking up. No shadow glow.
function drawHudScore(BL) {
  const s = String(Math.floor(G.scoreShown)).padStart(7, '0');
  const sig = s.replace(/^0+(?=\d)/, '');
  const lead = s.length - sig.length;
  const maxW = BL.narrow ? BL.hp.x - 14 - BL.scoreX : 190;
  let size = UI.hero;
  ctx.font = `800 ${size}px Orbitron, sans-serif`;
  let cell = ctx.measureText('0').width * 1.04;
  if (cell * s.length > maxW) {
    size = Math.max(UI.title, size * maxW / (cell * s.length));
    ctx.font = `800 ${size}px Orbitron, sans-serif`;
    cell = ctx.measureText('0').width * 1.04;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ticking = G.scoreShown < G.score - 0.5;
  for (let i = 0; i < s.length; i++) {
    ctx.fillStyle = i < lead ? 'rgba(159,178,204,0.17)' : ticking ? UI.gold : UI.ink;
    ctx.fillText(s[i], BL.scoreX + cell * (i + 0.5), BL.cy + 1);
  }
  const w = cell * s.length;
  if (zoneLog) zoneLog.push({ x0: BL.scoreX, x1: BL.scoreX + w, w, y: BL.cy, size, text: s, zone: 'topHud' });
  return BL.scoreX + w;
}
// STAGE BREADCRUMB — phones: a quiet line under the score; wide screens:
// the centred title of the bar's first row (BEST under the score).
function drawHudTitle(BL, scoreR) {
  const gen = genFor(G.level);
  const stg = stageIdx(G.level);
  // BOSS RUSH: the title row IS rush progress — count + clock lead (must-
  // read), the finale's own title trails and is the part that yields
  const rushHead = G.rush ? rushName() + ' ' + Math.min(RUSH_FINALES, regionIdx(G.level) + 1) + '/' + RUSH_FINALES
    + ' · ' + fmtRushTime(rushTotal(), false) : null;
  const waveText = G.secret.vmax ? 'SECRET RIFT · ' + SKIN.secret.name
    : rushHead ? rushHead + ' · ' + (stageTitle(G.level) || gen.name)
    : (G.trial ? 'TRIAL · ' : '') + gen.name + ' ' + (stg + 1) + '/3 · ' + (stageTitle(G.level) || SKIN.stageNames[stg]);
  // AFT-021 P8: never ellipsize an encounter name mid-combat — if the full
  // title cannot fit at the readable floor, fall back to the authored
  // breadcrumb (realm + stage). The complete name lives in the reveal,
  // results, and codex, where it has room.
  const shortText = G.secret.vmax ? 'SECRET RIFT'
    : rushHead ? rushHead
    : (G.trial ? 'TRIAL · ' : '') + gen.name + ' ' + (stg + 1) + '/3';
  if (BL.narrow) {
    const x0 = BL.scoreX;
    const x1 = BL.pause ? BL.pause.x - BL.pause.r - 8 : W - 14 - SAFE_R;
    ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
    const t = ctx.measureText(waveText).width > (x1 - x0) ? shortText : waveText;
    const tb = fitLabel(t, x0, BL.crumbY, { size: UI.small, min: 9, weight: 800, color: UI.sub,
      align: 'left', maxW: x1 - x0, zone: 'topHud' });
    claimSurface('waveTitle', tb.x0, SAFE_T + BL.crumbY - 7, tb.w, 14);
  } else {
    const x0 = scoreR + 18, x1 = BL.hp.x - 18;
    ctx.font = `900 ${UI.title}px Orbitron, sans-serif`;
    const t = ctx.measureText(waveText).width > (x1 - x0) ? shortText : waveText;
    const tb = fitLabel(t, (x0 + x1) / 2, BL.cy + 1, { size: UI.title, min: 9.5, weight: 900, color: UI.ink,
      maxW: x1 - x0, zone: 'topHud' });
    claimSurface('waveTitle', tb.x0, SAFE_T + BL.cy - 10, tb.w, 20);
    fitLabel('BEST ' + G.best, BL.scoreX + 1, BL.crumbY, { size: UI.small, min: 9, weight: 700, color: UI.mute,
      align: 'left', maxW: Math.max(60, scoreR - BL.scoreX), zone: 'topHud' });
  }
}
// The ONE persistent HP component: a backed plate in the bar's right
// cluster — HP current/max, then one segment per life (a continuous rail
// past six). Amber at 2, red + pulse at the last life (red = danger only).
function drawPlayerHealthBar(BL) {
  BL = BL || hudBarLayout();
  const denom = Math.max(1, G.livesMax || G.lives);
  const lives = Math.max(0, G.lives);
  const danger = lives <= 1;
  const col = danger ? '#ff5252' : lives === 2 ? '#ffca6a' : cbSafeColor('hpGood');
  const pulse = danger ? 0.62 + 0.38 * Math.abs(Math.sin(G.time * 5)) : 1;
  const { x, y, w, h } = BL.hp;
  ctx.save();
  ctx.globalAlpha = pulse;
  uiPanel(x, y, w, h, { r: 9, soft: false, accent: col });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
  ctx.fillStyle = UI.sub;
  ctx.fillText('HP', x + 9, y + h / 2 + 1);
  const hw = ctx.measureText('HP').width;
  const count = lives + '/' + denom;
  ctx.font = `900 ${UI.label}px Orbitron, sans-serif`;
  ctx.fillStyle = col;
  ctx.fillText(count, x + 13 + hw, y + h / 2 + 1);
  const cw = ctx.measureText(count).width;
  const sx0 = x + 20 + hw + cw, sx1 = x + w - 9;
  const segN = Math.min(6, denom), gap = 2.5;
  const segW = (sx1 - sx0 - gap * (segN - 1)) / segN;
  const sy = y + h / 2 - 4.5, sh = 9;
  if (denom <= 6) {
    let sx = sx0;
    for (let i = 0; i < denom; i++) {
      roundRect(sx, sy, segW, sh, 2.5);
      ctx.fillStyle = i < lives ? col : 'rgba(255,255,255,0.10)'; ctx.fill();
      sx += segW + gap;
    }
  } else {
    roundRect(sx0, sy, sx1 - sx0, sh, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
    const frac = Math.max(0, Math.min(1, lives / denom));
    if (frac > 0) { roundRect(sx0, sy, (sx1 - sx0) * frac, sh, 2.5); ctx.fillStyle = col; ctx.fill(); }
  }
  ctx.restore();
  claimSurface('hpBar', x, SAFE_T + y, w, h);
}
// ── the STATUS ROW ──────────────────────────────────────────────────────────
// Content models: what the centre slot would say, independent of where it
// draws — the layout measures them, the draw paints them.
function objectiveModel() {
  const O = G.objective;
  if (!O && G.finale && G.finale.meter) return finaleMeterModel();
  // a FAILED objective draws nothing — the banner vanishing is the tell (the
  // strip notice already named the fall), and the wave is a normal clear now.
  if (!O || O.done || O.failed || !hudLive()) return null;
  let label = O.name || 'OBJECTIVE';
  let readout = '';
  if (O.type === 'survive') readout = Math.max(0, Math.ceil(O.dur - O.t)) + 's';
  else if (O.type === 'defend') readout = Math.max(0, Math.ceil(O.dur - O.t)) + 's';
  else if (O.type === 'escort') readout = Math.round((O.progress || 0) * 100) + '%';
  else if (O.type === 'wardbreak') readout = ((O.total || 0) - (O.left || 0)) + '/' + (O.total || 0);
  else if (O.type === 'lanes') readout = (O.hits || 0) + '/' + O.count;
  else if (O.type === 'bells') readout = (O.rung || 0) + '/' + O.count;
  else if (O.type === 'undercard') readout = Math.round((O.crowd || 0) * 100) + '%';
  // PROTECT objectives inline the friendly's remaining heart pips
  const fr = O.friendly;
  if (fr && !fr.dead) label += '  ·  ' + '♥'.repeat(Math.max(0, fr.fhp));
  return { kind: 'objective', icon: '◎', label, readout, progress: O.progress || 0, color: UI.gold, ink: '#ffe082' };
}
// AFT-020: the finale's shared meter rides the SAME goal slot as the wave
// objectives — one pill, one containment authority, no new lane.
function finaleMeterModel() {
  const F = G.finale;
  if (!F || !F.meter || F.mastery.clear || !hudLive()) return null;
  const M = F.meter;
  const label = M.label || 'FINALE';
  const progress = Math.max(0, Math.min(1, (M.value || 0) / (M.max || 1)));
  let readout = '';
  if (F.format === 'relay' && F.relay && F.beat === 0) {
    readout = 'PASS ' + Math.min(F.relay.need, F.relay.passes + 1) + '/' + F.relay.need;
  } else if (F.format === 'raid' && F.raid) {
    if (F.raid.window) return null; // the failing-weapon beat reads from the HUD dock
    readout = ((F.profile && F.profile.raid && F.profile.raid.segmentWord) || 'SEGMENT')
      + ' ' + Math.min(F.raid.segments.length, F.raid.seg + 1) + '/' + F.raid.segments.length;
  } else if (F.beat === 2 && F.coda) {
    readout = (F.mastery.counters.blooms || 0) + '/' + M.max;
  } else if (F.beat === 1) return null; // the boss beat reads from the HUD dock, not a meter
  return { kind: 'finale', icon: '◈', label, readout, progress, color: UI.player, ink: '#b3e5fc' };
}
// BREAKER's standing region rule (the brick legend) — it lives in the
// centre slot and yields to a live goal (the win condition outranks it).
function regionRuleModel() {
  if (G.mode !== 'classic' || stageIdx(G.level) === 2 || !hudLive()) return null;
  const key = BRICK_BEHAVIOR_ORDER[Math.min(BRICK_BEHAVIOR_ORDER.length - 1, regionIdx(G.level))];
  const info = BRICK_BEHAVIORS[key];
  if (!info) return null;
  return { label: 'REGION RULE · ' + info.name.replace(' BRICKS', '').replace(' GENERATORS', ''),
    color: info.color, icon: info.icon };
}
function modifierModel() {
  if (!G.modifier) return null;
  const m = conditionInfo(G.modifier, regionIdx(G.level));
  return { label: m.name, color: m.color, icon: m.icon };
}
let HUD_ROW = null; // this frame's status-row layout (drawHUD computes it once)
function hudStatusLayout() {
  const narrow = W < 560;
  const y = HUD_BAR_H + 5, h = 24, cy = y + h / 2; // LOCAL (inside the SAFE_T translate)
  const L = 12 + SAFE_L, R = W - 12 - SAFE_R, gap = 8;
  const S = { y, h, cy, narrow, combo: null, rift: null, build: null, centre: null, boss: null, roster: null };
  const live = hudLive();
  // RIGHT cluster: the docked boss lane (AFT-002), then the roster rail
  let rx = R;
  if (live && G.revealDock) {
    const br = G.bricks.find(b => !b.dead && b.isBoss && b.poke.id === G.revealDock);
    if (br) {
      const w = narrow ? Math.min(176, Math.round((R - L) * 0.46)) : 236;
      S.boss = { x: rx - w, w, br }; rx -= w + gap;
    }
  }
  if (live) {
    const lv = G.bricks.filter(b => !b.dead && !b.dormant && (b.isBoss || b.subBoss) && !b.stoodDown);
    if (lv.length >= 2) {
      const n = Math.min(lv.length, 7), w = n * 18 + 10;
      S.roster = { x: rx - w, w, live: lv.slice(0, n) }; rx -= w + gap;
    }
  }
  // LEFT cluster, in display order; `pri` = yield order (highest yields first)
  const lefts = [];
  if (G.combo > 1) {
    ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
    const a = ctx.measureText('COMBO').width;
    ctx.font = `900 ${UI.label}px Orbitron, sans-serif`;
    const b = ctx.measureText('×' + G.combo).width;
    lefts.push({ key: 'combo', w: Math.ceil(a + b * 1.12 + 26), pri: 1 });
  }
  if (secretEligible() || G.secret.vmax) lefts.push({ key: 'rift', w: narrow ? 122 : 150, pri: 2 });
  const ownedPaths = PATH_KEYS.filter(pk => pathLvl(pk) > 0).length;
  if (ownedPaths) {
    if (narrow || IS_TOUCH) {
      const text = 'BUILD ' + totalPathLevels() + ' · ' + ownedPaths + (ownedPaths === 1 ? ' PATH' : ' PATHS');
      ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
      lefts.push({ key: 'build', w: Math.ceil(ctx.measureText(text).width) + 20, pri: 3, text, compact: true });
    } else lefts.push({ key: 'build', w: ownedPaths * 44 + 14, pri: 3, compact: false });
  }
  // CENTRE: the goal (objective / finale meter) > region rule > modifier
  let centre = null;
  const gm = objectiveModel();
  if (gm) centre = { kind: 'goal', m: gm };
  else {
    const rm = regionRuleModel();
    if (rm) centre = { kind: 'rule', m: rm };
    else if (!narrow) { const mm = modifierModel(); if (mm) centre = { kind: 'mod', m: mm }; }
  }
  if (centre) {
    centre.size = centre.kind === 'goal' && !narrow ? UI.label : UI.small;
    ctx.font = `900 ${centre.size}px Orbitron, sans-serif`;
    const m = centre.m;
    const full = (m.icon && centre.kind === 'goal' ? m.icon + ' ' : '') + m.label + (m.readout ? '  ·  ' + m.readout : '');
    centre.want = Math.min(narrow ? R - L : 340, Math.ceil(ctx.measureText(full).width) + (centre.kind === 'goal' ? 30 : 46));
    centre.min = Math.min(centre.want, centre.kind === 'goal' ? 190 : 150);
  }
  const endOf = () => lefts.reduce((x, it) => x + it.w + gap, L); // first free x
  const free = () => rx - endOf();
  const need = centre ? centre.min : -gap;
  while (lefts.length && free() < need) {
    let k = 0;
    for (let i = 1; i < lefts.length; i++) if (lefts[i].pri > lefts[k].pri) k = i;
    lefts.splice(k, 1);
  }
  // a goal still short of room: the roster rail yields too (the docked
  // boss lane keeps its slot — the goal then takes what remains)
  if (centre && centre.kind === 'goal' && free() < need && S.roster) { rx += S.roster.w + gap; S.roster = null; }
  let x = L;
  for (const it of lefts) { S[it.key] = { x, w: it.w, text: it.text, compact: it.compact }; x += it.w + gap; }
  if (centre) {
    const s0 = x, s1 = rx;
    const w = Math.min(centre.want, s1 - s0);
    if (w >= 96) S.centre = { ...centre, x: Math.max(s0, Math.min(s1 - w, W / 2 - w / 2)), w };
  }
  return S;
}
function drawComboChip(r, S) {
  const pop = G.comboPop || 0, flare = G.comboTierT || 0;
  const col = comboColor(G.combo);
  // AFT-027: the chip warms through the combo TIERS (10/25/50/100) and its
  // edge flares for a beat when a tier is crossed — the streak has a shape
  uiPanel(r.x, S.y, r.w, S.h, { r: 9, soft: false, accent: col, sel: flare > 0.5 });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
  ctx.fillStyle = UI.sub;
  ctx.fillText('COMBO', r.x + 10, S.cy + 1);
  const a = ctx.measureText('COMBO').width;
  const sc = 1 + Math.min(0.12, pop * 0.12 + flare * 0.06); // pop-scale on every kill, inside the plate
  ctx.save();
  ctx.translate(r.x + 16 + a, S.cy + 1); ctx.scale(sc, sc);
  ctx.font = `900 ${UI.label}px Orbitron, sans-serif`;
  ctx.fillStyle = (pop > 0.6 || flare > 0.5) ? '#ffffff' : col;
  ctx.fillText('×' + G.combo, 0, 0);
  ctx.restore();
  claimSurface('comboChip', r.x, SAFE_T + S.y, r.w, S.h);
}
function drawRiftTracker(r, S) {
  if (!r) return;
  uiPanel(r.x, S.y, r.w, S.h, { r: 9, soft: false, accent: '#d780ff' });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
  ctx.fillStyle = UI.sub;
  const label = S.narrow ? 'RIFT' : 'RIFT KEY';
  ctx.fillText(label, r.x + 10, S.cy + 1);
  const x0 = r.x + 10 + ctx.measureText(label).width + 13;
  for (let i = 0; i < 3; i++) {
    const held = G.secret.shards[i];
    ctx.save(); ctx.translate(x0 + i * 15, S.cy); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = held ? (i === 2 ? '#ffffff' : '#d780ff') : 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = held ? '#80e8ff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
    ctx.fillRect(-4, -4, 8, 8); ctx.strokeRect(-4, -4, 8, 8); ctx.restore();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = UI.mute;
  ctx.fillText(secretShardCount() + '/3', r.x + r.w - 9, S.cy + 1);
  claimSurface('riftKey', r.x, SAFE_T + S.y, r.w, S.h);
}
// skill tree at a glance — Phoenix-style: your build is always visible
// (phones: a one-line count; wide screens: the path glyph rack)
function drawBuildChip(r, S) {
  if (!r) return;
  uiPanel(r.x, S.y, r.w, S.h, { r: 9, soft: false });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (r.compact) {
    ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
    ctx.fillStyle = UI.sub;
    ctx.fillText(r.text, r.x + 10, S.cy + 1);
  } else {
    let tx = r.x + 15;
    for (const pk of PATH_KEYS) {
      const lvl = pathLvl(pk);
      if (!lvl) continue;
      const P = PATHS[pk];
      drawGlyph(ctx, P.tiers[lvl - 1].icon, tx, S.cy, 6, P.color);
      ctx.font = `700 ${UI.small}px Orbitron, sans-serif`;
      ctx.fillStyle = lvl >= 4 ? P.color : UI.sub;
      ctx.fillText(lvl + '/4', tx + 10, S.cy + 1);
      tx += 44;
    }
  }
  claimSurface('buildLine', r.x, SAFE_T + S.y, r.w, S.h);
}
function drawStatusCentre(c, S) {
  if (!c) return;
  const m = c.m;
  if (c.kind === 'goal') {
    // the GOAL pill: the win condition, accent-edged, its progress filling
    // the plate from the left; the readout collapses before the name shrinks
    uiPanel(c.x, S.y, c.w, S.h, { r: 12, accent: m.color, sel: true });
    if (m.progress > 0) {
      ctx.save();
      roundRect(c.x, S.y, c.w, S.h, 12); ctx.clip();
      ctx.globalAlpha = 0.2; ctx.fillStyle = m.color;
      ctx.fillRect(c.x, S.y, c.w * Math.min(1, m.progress), S.h);
      ctx.restore();
    }
    ctx.font = `900 ${c.size}px Orbitron, sans-serif`;
    let line = m.icon + ' ' + m.label + (m.readout ? '  ·  ' + m.readout : '');
    if (m.readout && ctx.measureText(line).width > c.w - 20) line = m.icon + ' ' + m.label; // secondary copy collapses first
    ctx.textBaseline = 'middle';
    fitLabel(line, c.x + c.w / 2, S.cy + 1, { size: c.size, min: 8.5, weight: 900, color: m.ink, maxW: c.w - 20, zone: 'banner' });
    claimSurface('goalPill', c.x, SAFE_T + S.y, c.w, S.h);
  } else {
    uiPanel(c.x, S.y, c.w, S.h, { r: 9, soft: false, accent: m.color, bar: 'left' });
    drawGlyph(ctx, m.icon, c.x + 16, S.cy, 5.5, m.color);
    ctx.textBaseline = 'middle';
    fitLabel(m.label, c.x + 28, S.cy + 1, { size: c.size, min: 8.5, weight: 800, color: m.color,
      align: 'left', maxW: c.w - 38, zone: 'banner' });
    claimSurface(c.kind === 'rule' ? 'regionRule' : 'modifierChip', c.x, SAFE_T + S.y, c.w, S.h);
  }
}
// compat shims — the profiler (tools/profile-boss.js) attributes HUD cost
// by these names; each paints its slot of this frame's status row
function drawObjectiveBanner() {
  const S = HUD_ROW;
  if (S && S.centre && S.centre.kind === 'goal') drawStatusCentre(S.centre, S);
}
function drawBrickBehaviorLegend() {
  const S = HUD_ROW;
  if (S && S.centre && S.centre.kind !== 'goal') drawStatusCentre(S.centre, S);
}
function drawHUD() {
  const BL = hudBarLayout();
  // THE TOP BAR — one flat backed panel; it absorbs the top safe-area inset
  // (notch / Dynamic Island) and every top-anchored element shifts with it
  const barB = SAFE_T + HUD_BAR_H;
  ctx.fillStyle = 'rgba(5,8,24,0.9)'; ctx.fillRect(0, 0, W, barB);
  ctx.fillStyle = UI.line; ctx.fillRect(0, barB - 1, W, 1);
  ctx.save();
  ctx.translate(0, SAFE_T);
  ctx.textBaseline = 'middle';
  const scoreR = drawHudScore(BL);
  drawHudTitle(BL, scoreR);
  drawPlayerHealthBar(BL);
  // THE STATUS ROW
  const S = HUD_ROW = hudStatusLayout();
  if (S.combo) drawComboChip(S.combo, S);
  drawRiftTracker(S.rift, S);
  drawBuildChip(S.build, S);
  drawObjectiveBanner();
  drawBrickBehaviorLegend();
  drawBossLane(S.boss, S); // AFT-002: the docked boss name/health lane
  drawRosterRail(S.roster, S); // AFT-021 P3: compact pips for every co-actor in a multi-actor fight
  ctx.restore(); // end of the top-anchored, safe-area-shifted cluster
  drawCombatNotice();
  // THE CONTROL DOCK: chips + meters, then the pads (touch) or the Surge
  // meter (desktop) — live combat only
  if (hudLive()) {
    const D = hudDockLayout();
    drawHudChips(D);
    drawResonanceMeter(D); // AFT-009R P2: the attunement fill rides the HUD pass
    if (IS_TOUCH) drawTouchControls();
    else drawSurgeMeter(D.surge);
  }
  drawHurtHealth();
}
function drawCombatNotice() {
  const n = G.combatNotice;
  if (!n || !hudLive()) return;
  // AFT-021 P2: ONE transient at a time — while an announcement is on
  // screen the combat notice waits its turn (its clock pauses in update),
  // so two banners can never stack in the same band.
  if (announceLive()) return;
  // shooters: ride the LOW BAND under the announce strip, never the flock
  // zone; classic: the first free band under the status row
  const y = G.mode !== 'classic'
    ? (G.mode === 'junkie' ? PADDLE_Y() - SHIP_BAND : PADDLE_Y()) - 42
    : SAFE_T + HUD_BAR_H + HUD_ROW_H + 8;
  const alpha = Math.min(1, n.t / Math.min(0.25, n.max));
  const size = W < 560 ? UI.small : UI.label;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px Orbitron, sans-serif`;
  const w = Math.min(W * 0.86, ctx.measureText(n.text).width + 40);
  claimSurface('combatNotice', W / 2 - w / 2, y, w, 28);
  uiPanel(W / 2 - w / 2, y, w, 28, { r: 10, accent: n.color, bar: 'left' });
  ctx.textBaseline = 'middle';
  fitLabel(n.text, W / 2 + 2, y + 14.5, { size, min: 8.5, weight: 900, color: n.color, maxW: w - 26, zone: 'banner' });
  ctx.restore();
}
// ── the CONTROL DOCK ────────────────────────────────────────────────────────
// Row A (FLOOR − 22): status chips + the pads' captions. Row B (FLOOR − 50):
// the resonance meter. The chip/meter column runs from the outer edge to the
// pads (mirrored with left-handed controls); desktop has no pads, so its
// right end holds the resonance plate + the Surge meter instead.
function hudDockLayout() {
  const touch = IS_TOUCH;
  const B = touch ? touchButtons() : null;
  const left = touch && !!SETTINGS.leftHanded;
  const rowA = FLOOR() - 22, rowB = FLOOR() - 50;
  let x0 = 12 + SAFE_L, x1 = W - 12 - SAFE_R;
  let surge = null, res = null;
  if (touch) {
    const pads = [B.fire, B.mega].filter(Boolean);
    if (left) x0 = Math.max(...pads.map(p => p.x + p.r)) + 14;
    else x1 = Math.min(...pads.map(p => p.x - p.r)) - 14;
    res = { x: x0, y: rowB, w: x1 - x0 };
  } else {
    // the two plates share the row with the chips; narrow desktop windows
    // scale them down rather than letting them cross the chip column
    const colW = x1 - x0;
    const sw = Math.round(Math.min(196, colW * 0.36)), rw = Math.round(Math.min(196, colW * 0.3));
    surge = { x: x1 - sw, y: rowA - 15, w: sw, h: 30 };
    res = { x: surge.x - 10 - rw, y: rowA - 15, w: rw, h: 30 };
    x1 = res.x - 10;
  }
  return { touch, B, left, rowA, rowB, x0, x1, top: touch ? FLOOR() - 66 : FLOOR() - 44, surge, res };
}
// The shelf itself: drawn by render() right after the backdrop, UNDER the
// world — the vessel, shots and pickups all read over it; only the HUD's
// chips and pads sit on top. Gradient cached per geometry (AFT-018).
function drawHudDockShelf() {
  if (!hudLive()) return;
  const top = IS_TOUCH ? FLOOR() - 66 : FLOOR() - 44;
  const fh = 30;
  const k = 'huddock3_' + H + '_' + top;
  let g = fxCache[k];
  if (!g) {
    g = ctx.createLinearGradient(0, top - fh, 0, top);
    g.addColorStop(0, 'rgba(4,7,22,0)'); g.addColorStop(1, 'rgba(4,7,22,0.5)');
    fxCache[k] = g;
  }
  ctx.fillStyle = g; ctx.fillRect(0, top - fh, W, fh);
  ctx.fillStyle = 'rgba(4,7,22,0.78)'; ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = UI.line; ctx.fillRect(0, top, W, 1);
}
// ---- active power-up chips: the live element identity first, then the
// most urgent timers; as many as the dock column fits (+N for the rest)
function drawHudChips(D) {
  const active = [];
  const hudElem = G.mode === 'junkie'; // junkie always shows the live attack type
  // the live element identity leads the row — PILOT/partner = permanent; a
  // timed ITEM/POWER-UP override shows its remaining seconds like any timer.
  // attackElement() is null for a NO-PARTNER (neutral/typeless) pilot — the
  // readout renders that as NEUTRAL rather than a type.
  if (G.ballElement || hudElem) {
    const el = hudElem ? attackElement() : G.ballElement;
    const timed = hudElem ? !!G.ballElement : !(G.ballElementT > 1000);
    active.push({ icon: 'target', color: el ? TYPE_COLORS[el] : '#b0bec5', pin: true,
      t: timed ? G.ballElementT : null, label: typeLabel(el),
      sub: timed ? null : hudElem ? 'PILOT' : SKIN.strings.partnerWord });
  }
  // AFFINITY rides beside it on wide screens (light/dark skins): the oath is
  // permanent run identity
  const affCol = affinityColor();
  if (affCol && !D.touch && W >= 560) {
    active.push({ glyphText: SETTINGS.affinity === 'light' ? '☀' : '☾', color: affCol, pin: true,
      t: null, label: SETTINGS.affinity === 'light' ? 'LIGHT' : 'DARK', sub: 'OATH' });
  }
  for (const [slot, icon, color] of [
    ['fx_fire', 'fire', '#ff7043'], ['fx_laser', 'laser', '#ffd54f'], ['fx_wide', 'wide', '#42a5f5'],
    ['fx_slow', 'slow', '#4dd0e1'], ['fx_magnet', 'magnet', '#ec407a'], ['fx_score', 'star', '#ffee58'],
    ['fx_draco', 'draco', '#5c6bc0'],
  ]) {
    if (G[slot]) active.push({ icon, color, t: G[slot].t, label: romanTier(G[slot].tier) || 'I' });
  }
  if (G.shieldCharges > 0) active.push({ icon: 'shield', color: cbSafeColor('shieldGood'), t: null, label: '×' + G.shieldCharges, sub: 'SHIELD' });
  const riftReward = SECRET_UPGRADES.find(s => G.secretUpg[s.key]);
  if (riftReward) active.push({ icon: riftReward.icon, color: riftReward.color, t: null, label: 'RIFT' });
  if (!active.length) return;
  // identity pinned first, then most-urgent timers
  active.sort((a, b) => ((b.pin ? 1 : 0) - (a.pin ? 1 : 0)) || (a.t ?? 99) - (b.t ?? 99));
  const h = 28, gap = 6, cy = D.rowA;
  for (const c of active) {
    c.subTxt = c.t != null ? Math.max(0, Math.ceil(c.t)) + 's' : (c.sub || '');
    ctx.font = `900 ${UI.small}px Orbitron, sans-serif`;
    const lw = ctx.measureText(c.label).width;
    ctx.font = `700 ${UI.small}px Orbitron, sans-serif`;
    const sw = c.subTxt ? ctx.measureText(c.subTxt).width : 0;
    c.w = Math.ceil(Math.max(48, 34 + Math.max(lw, sw)));
  }
  // fit as many as the column holds, reserving room for a +N tag
  const colW = D.x1 - D.x0;
  const shown = [];
  let used = 0;
  for (let i = 0; i < active.length; i++) {
    const rest = active.length - i - 1;
    const add = (shown.length ? gap : 0) + active[i].w;
    // the identity chip always shows (even if that leaves no room for +N)
    if (used + add + (rest ? 34 : 0) > colW && !(i === 0 && add <= colW)) break;
    shown.push(active[i]); used += add;
  }
  const extra = active.length - shown.length;
  const tagFits = extra > 0 && used + 34 <= colW;
  const totalW = used + (tagFits ? 34 : 0);
  let x = D.left ? D.x1 - totalW : D.x0;
  if (shown.length || tagFits) claimSurface('statusChips', x, cy - h / 2, totalW, h);
  ctx.save();
  for (const c of shown) {
    ctx.globalAlpha = c.t != null && c.t < 2 ? (0.4 + 0.6 * Math.abs(Math.sin(G.time * 6))) : 1;
    uiPanel(x, cy - h / 2, c.w, h, { r: 9, soft: true, accent: c.color });
    if (c.glyphText) {
      ctx.font = `900 ${UI.label}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = c.color;
      ctx.fillText(c.glyphText, x + 15, cy + 1);
    } else drawGlyph(ctx, c.icon, x + 15, cy, 7, c.color);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${UI.small}px Orbitron, sans-serif`;
    ctx.fillStyle = UI.ink;
    ctx.fillText(c.label, x + 27, c.subTxt ? cy - 5 : cy + 1);
    if (c.subTxt) {
      ctx.font = `700 ${UI.small}px Orbitron, sans-serif`;
      ctx.fillStyle = UI.sub;
      ctx.fillText(c.subTxt, x + 27, cy + 7);
    }
    x += c.w + gap;
  }
  ctx.globalAlpha = 1;
  if (tagFits) {
    uiPanel(x, cy - h / 2, 34, h, { r: 9, soft: true });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${UI.small}px Orbitron, sans-serif`;
    ctx.fillStyle = UI.sub;
    ctx.fillText('+' + extra, x + 17, cy + 1);
  }
  ctx.restore();
}
// desktop: the Surge meter is a dock plate — label + value over a slim bar
function drawSurgeMeter(R) {
  if (!R) return;
  const ready = G.mega >= 1 && G.megaT <= 0;
  const active = G.megaT > 0;
  claimSurface('megaMeter', R.x, R.y, R.w, R.h);
  uiPanel(R.x, R.y, R.w, R.h, { r: 9, soft: true, accent: ready || active ? UI.gold : '#ab47bc' });
  if (ready) { // readiness = a pulsing gold edge (no blur)
    ctx.save();
    ctx.globalAlpha = SETTINGS.reduceFlash ? 0.8 : 0.45 + 0.45 * Math.abs(Math.sin(G.time * 4));
    roundRect(R.x, R.y, R.w, R.h, 9);
    ctx.strokeStyle = UI.gold; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  ctx.textBaseline = 'middle';
  const val = active ? Math.ceil(G.megaT) + 's' : Math.round(Math.min(1, G.mega) * 100) + '%';
  ctx.font = `900 ${UI.small}px Orbitron, sans-serif`;
  ctx.textAlign = 'right'; ctx.fillStyle = ready || active ? UI.gold : '#c5b3e6';
  ctx.fillText(val, R.x + R.w - 10, R.y + 10);
  const vw = ctx.measureText(val).width;
  fitLabel(lex(active ? 'MEGA ACTIVE' : ready ? 'MEGA READY — E' : 'MEGA · HITS CHARGE'), R.x + 10, R.y + 10,
    { size: UI.small, min: 8.5, weight: 800, color: ready || active ? UI.gold : UI.sub, align: 'left',
      maxW: R.w - 28 - vw, zone: 'controls' });
  const bx = R.x + 10, bw = R.w - 20, by = R.y + 19;
  roundRect(bx, by, bw, 5, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  const frac = active ? G.megaT / megaDur() : G.mega;
  if (frac > 0) {
    roundRect(bx, by, Math.max(4, bw * Math.min(1, frac)), 5, 2.5);
    ctx.fillStyle = active ? `hsl(${(G.time * 160) % 360},90%,62%)` : ready ? UI.gold : '#ab47bc';
    ctx.fill();
  }
}
// when the player is hit, their remaining health flashes as a small bar right
// above the character (plus the ring pulse from loseLife/absorbHit) — feedback
// where your eyes already are, not just the corner ring. Fades after ~2s.
function drawHurtHealth() {
  if (G.hurtHud <= 0 || (G.state !== 'play' && G.state !== 'serve')) return;
  const denom = Math.max(1, G.livesMax || G.lives), lives = Math.max(0, G.lives);
  const danger = lives <= 1;
  const col = danger ? '#ff5252' : lives === 2 ? '#ffca6a' : cbSafeColor('hpGood');
  const alpha = Math.min(1, G.hurtHud / 0.5); // hold, then fade out over the last 0.5s
  const segW = 15, segH = 7, gap = 3, heartW = 15, pad = 9;
  const barW = denom * segW + (denom - 1) * gap;
  const totalW = pad * 2 + heartW + 6 + barW;
  const cx = Math.max(totalW / 2 + 6, Math.min(W - totalW / 2 - 6, G.paddle.x));
  // well above the character — clear of the mon's head, the shield bubble
  // (r≈40/52 + pips) and the muzzle, so it never covers what you're steering
  let cy = Math.max(30, shipY() - (G.mode === 'junkie' ? 78 : 86));
  // AFT-030: both transients ride the band above the vessel — when an
  // announce strip is up this frame, the health pill steps above it
  // instead of printing through its text
  if (stripRectLive && performance.now() - stripRectAt < 150) {
    const R = stripRectLive;
    if (cy + 13 > R.y - 4 && cy - 13 < R.y + R.h + 4 && cx + totalW / 2 > R.x && cx - totalW / 2 < R.x + R.w) {
      cy = Math.max(SAFE_T + HUD_BAR_H + HUD_ROW_H + 18, R.y - 19);
    }
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  // backdrop pill — a kit panel edged in the health colour (AFT-030: no
  // blur glow on HUD elements; the colour and the hit flash carry the pop)
  uiPanel(cx - totalW / 2, cy - 13, totalW, 26, { r: 13, accent: col, sel: danger });
  // heart, then one segment per life
  drawGlyph(ctx, 'heart', cx - totalW / 2 + pad + heartW / 2, cy, 6, col);
  let sx = cx - totalW / 2 + pad + heartW + 6;
  for (let i = 0; i < denom; i++) {
    roundRect(sx, cy - segH / 2, segW, segH, 3);
    ctx.fillStyle = i < lives ? col : 'rgba(255,255,255,0.13)';
    ctx.fill();
    sx += segW + gap;
  }
  ctx.restore();
}

// on-screen controls for touch play — FIRE and SURGE on the dock, pause in
// the top bar. AFT-030: finished controls — a solid disc body, a hairline
// rim, the state ring, a faint track under every meter arc (heat, charge,
// Surge), the SHORT state word on the face and the clause as a caption on
// the dock's row A beneath the pad. No outer blur glows: readiness and full
// charge pulse a second ring instead.
function drawTouchControls() {
  const B = touchButtons();
  ctx.save();
  const baseA = SETTINGS.buttonOpacity == null ? 0.85 : SETTINGS.buttonOpacity;
  ctx.globalAlpha = baseA;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const rowA = FLOOR() - 22;
  const capY = p => Math.min(FLOOR() - 9, Math.max(rowA, p.y + p.r + 12));
  // caption columns: FIRE's caption owns its pad's width (inside the screen
  // edge); SURGE's stops 14px short of it, so the two clauses never read as
  // one phrase
  const fireHalf = B.fire ? Math.min(B.fire.r, Math.abs(B.fire.x - (SETTINGS.leftHanded ? SAFE_L : W - SAFE_R)) - 12) : 0;
  const megaHalf = B.fire ? Math.max(20, Math.min(B.mega.r + 2, Math.abs(B.fire.x - B.mega.x) - fireHalf - 14)) : B.mega.r + 6;
  const pulseA = SETTINGS.reduceFlash ? 0.75 : 0.45 + 0.45 * Math.abs(Math.sin(G.time * 5));
  const track = (b, rr, lw) => {
    ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.stroke();
  };
  // AFT-021 P3: when live combat passes BEHIND an idle pad, the pad softens
  // so movement stays readable — engaged states (charging, hot, Surge-ready)
  // keep full presence, and no mandatory tell ever RELIES on this fade
  // (strike lanes render full-height beside the pads).
  const padBusy = (b) => {
    if (!b) return false;
    const m = b.r + 18;
    for (const s of G.enemyShots) {
      if (!s.dead && Math.abs(s.x - b.x) < m && Math.abs(s.y - b.y) < m) return true;
    }
    for (const br of G.bricks) {
      if (br.dead || br.dormant || (!br.flight && !br.dive && !br.bare && !br.isBoss && !br.subBoss)) continue;
      if (Math.abs(br.bx + G.fx - b.x) < m && Math.abs(br.by + G.fy - b.y) < m) return true;
    }
    return false;
  };
  // FIRE — absent in CLASSIC until the blaster is earned (touchButtons). In the
  // shooter modes this one pad also CHARGES: holding winds up a big
  // shot, shown here as a cyan ring filling inside the heat arc.
  const hot = G.overheat > 0;
  const f = B.fire;
  if (f) {
    const charging = G.charge > 0.02, full = G.charge >= 1;
    if (!charging && !hot && padBusy(f)) ctx.globalAlpha = baseA * 0.5;
    // near the heat limit (amber) the pad WARNS before it ever locks out
    const heatWarn = !hot && !charging && G.heat > 0.7;
    const ringCol = hot ? UI.danger : charging ? (full ? '#e0ffff' : '#4dd0e1') : heatWarn ? '#ffb74d' : UI.player;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = hot ? 'rgba(52,14,22,0.94)' : charging ? 'rgba(8,34,46,0.94)' : 'rgba(8,13,32,0.92)';
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = UI.line; ctx.stroke();
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 1.5, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = ringCol; ctx.stroke();
    // heat arc wraps the fire button (over a faint full track)
    track(f, f.r - 7.5, 4);
    const frac = hot ? 1 - Math.min(1, (OVERHEAT_DUR - G.overheat) / OVERHEAT_DUR) : G.heat;
    if (frac > 0.02) {
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 7.5, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      // COOLANT tints the managed band teal — the cooler loop reads on the pad
      ctx.strokeStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : (upgN('coolant') && frac <= 0.33 ? '#4dd0e1' : '#ffd54f');
      ctx.stroke(); ctx.lineCap = 'butt';
    }
    // HYPER CYCLE's persistent tell: a thin spun-up cycler ring ticking
    // around inside the pad (static dashes under reduceFlash)
    if (upgN('hyper') && !hot) {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.setLineDash([3, 6]);
      ctx.lineDashOffset = SETTINGS.reduceFlash ? 0 : -G.time * 30;
      ctx.strokeStyle = UI.player; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 20, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // charge fill — an inner ring winding up as you hold
    if (charging) {
      track(f, f.r - 14, 3.5);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 14, -Math.PI / 2, -Math.PI / 2 + Math.min(1, G.charge) * Math.PI * 2);
      ctx.lineWidth = 3.5; ctx.strokeStyle = full ? '#e0ffff' : '#80deea'; ctx.stroke();
      if (full) { // full charge: a second ring pulses outside the rim (no blur)
        ctx.save();
        ctx.globalAlpha *= pulseA;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#e0ffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }
    }
    drawGlyph(ctx, charging ? 'warp' : 'target', f.x, f.y - 11, 10, hot ? '#ff8a80' : charging ? (full ? '#e0ffff' : '#b2ebf2') : heatWarn ? '#ffcc80' : '#b3e5fc');
    // ONE consistent state language: the label always names the current state
    // or the next action — no bare FIRE/AUTO/HOT ambiguity mid-fight
    const shooter = G.mode !== 'classic';
    // the full-charge label walks the resonance arc: the sweet-spot window
    // shouts RESONANT!, then plain RELEASE!, then OVERCHARGE once the barrel
    // starts cooking — the state language stays explicit at every moment
    const resonantNow = full && G.chargeFullT > 0 && G.chargeFullT <= resonanceWindow();
    const overNow = full && G.chargeFullT > 1.4;
    // AFT-001: SHORT state words on the pad face — the explanatory clause
    // lives on the caption, so nothing squishes inside the circle at any
    // buttonScale. The pad still names its state at every moment.
    // AFT-022 F1: while the auto-fire assist is venting, the pad says so —
    // a silent gun with AUTO ON on its face would read as a bug
    const venting = shooter && SETTINGS.autoFire && G.autoVent && !hot && !charging;
    const label = hot ? 'COOLING'
      : charging ? (resonantNow ? 'RESONANT!' : overNow ? 'OVERCHARGE' : full ? 'RELEASE!' : Math.round(Math.min(1, G.charge) * 100) + '%')
      : venting ? 'VENTING'
      : heatWarn ? 'HEAT HIGH'
      : shooter ? (SETTINGS.autoFire ? 'AUTO ON' : 'TAP') : 'FIRE';
    fitLabel(label, f.x, f.y + 9, { size: UI.label, min: 8, weight: 900, maxW: f.r * 1.55, zone: 'controls',
      color: hot ? '#ff8a80' : charging ? (resonantNow ? '#80ffea' : overNow ? '#ffab66' : full ? '#e0ffff' : '#80deea') : venting || heatWarn ? '#ffb74d' : '#d6f2ff' });
    // the caption: what HOLDING does right now (shooter modes only).
    // AFT-021 P4: Heavy Bolt's faster fill is a bought identity — the pad
    // names it persistently so the quicker arc reads as a feature.
    // AFT-010 toggle-charge: the pad speaks the tap grammar instead — a
    // charge in flight is released by tapping, not by lifting.
    const sub = !shooter ? '' : hot ? Math.ceil(G.overheat) + 's · LOCKED'
      : charging ? (SETTINGS.toggleCharge ? 'TAP = FIRE' : full ? '' : 'KEEP HOLDING')
      : venting ? 'AUTO COOLING'
      : SETTINGS.toggleCharge ? 'TAP = CHARGE'
      : (upgN('heavy') ? 'HOLD = FAST CHARGE' : 'HOLD = CHARGE');
    if (sub) {
      const o = { size: UI.small, min: 8, weight: 800, maxW: fireHalf * 2, maxLines: 2, zone: 'controls',
        color: hot ? '#ff8a80' : charging ? '#b2ebf2' : heatWarn ? '#ffcc80' : UI.sub };
      const n = wrapLinesNeeded(sub, o);
      fitLabelWrap(sub, f.x, capY(f) - (n - 1) * 5, o);
    }
  }
  // SURGE (engine: MEGA) — the button IS the meter (fills as a ring)
  ctx.globalAlpha = baseA;
  const m = B.mega;
  const ready = G.mega >= 1 && G.megaT <= 0;
  if (!ready && G.megaT <= 0 && padBusy(m)) ctx.globalAlpha = baseA * 0.5;
  const mfrac = G.megaT > 0 ? G.megaT / megaDur() : G.mega;
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,13,32,0.92)'; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = UI.line; ctx.stroke();
  track(m, m.r - 5, 4);
  if (mfrac > 0.02) {
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r - 5, -Math.PI / 2, -Math.PI / 2 + Math.min(1, mfrac) * Math.PI * 2);
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = G.megaT > 0 ? `hsl(${(G.time * 160) % 360},90%,60%)` : ready ? UI.gold : '#ab47bc';
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  if (ready) { // readiness: a solid gold rim + a pulsing outer ring (no blur)
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r - 1, 0, Math.PI * 2);
    ctx.strokeStyle = UI.gold; ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    ctx.globalAlpha *= pulseA;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = UI.gold; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  drawGlyph(ctx, 'mega', m.x, m.y - 7, 8.5, ready ? UI.gold : '#c5b3e6');
  fitLabel(G.megaT > 0 ? Math.ceil(G.megaT) + 's' : ready ? 'READY' : Math.round(Math.min(1, G.mega) * 100) + '%',
    m.x, m.y + 9, { size: UI.small, min: 8, weight: 900, maxW: m.r * 1.6, zone: 'controls', color: ready ? UI.gold : '#d9ccf2' });
  fitLabel(lex(G.megaT > 0 ? 'MEGA' : ready ? 'TAP MEGA' : 'HITS CHARGE'), m.x, capY(m),
    { size: UI.small, min: 8, weight: 800, maxW: megaHalf * 2, zone: 'controls', color: ready ? '#ffe082' : UI.sub });
  // (charge now lives on the FIRE pad — hold; no separate pad)
  // ONE pause target in the top bar's right end — the sound toggle lives on
  // the pause screen (AFT-021 P2: no second circle over the formation)
  {
    ctx.globalAlpha = 1;
    const b = B.pause;
    const s = Math.min(40, b.r * 2 - 4);
    uiPanel(b.x - s / 2, b.y - s / 2, s, s, { r: 10, lift: true });
    drawGlyph(ctx, 'pause', b.x, b.y, 7, UI.ink);
    claimSurface('padPause', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  if (B.fire) claimSurface('padFire', B.fire.x - B.fire.r, B.fire.y - B.fire.r, B.fire.r * 2, B.fire.r * 2);
  claimSurface('padMega', B.mega.x - B.mega.r, B.mega.y - B.mega.r, B.mega.r * 2, B.mega.r * 2);
  if (G.uiTouchPulse) {
    const p = G.uiTouchPulse, q = 1 - p.t / p.max;
    ctx.globalAlpha = Math.max(0, p.t / p.max);
    ctx.beginPath(); ctx.arc(p.x, p.y, 18 + q * 28, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    if (p.label) {
      ctx.font = `800 ${UI.small}px Orbitron, sans-serif`; ctx.fillStyle = '#ffffff';
      ctx.fillText('✓ ' + lex(p.label), p.x, p.y - 28 - q * 12);
    }
  }
  ctx.restore();
}
// Orbitron is for TITLES and numbers; body copy (descriptions, tutorials,
// upgrade text) reads far better in a humanist face at small sizes
function bodyFont(px, weight = 600) {
  return `${weight} ${px}px Verdana, 'Segoe UI', system-ui, sans-serif`;
}
// draw centered text, auto-shrinking to fit the viewport width
function fitText(text, y, baseSize, weight, color, maxW, family = 'Orbitron, sans-serif') {
  let size = baseSize;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size = Math.max(8.5, size * maxW / w);
    ctx.font = `${weight} ${size}px ${family}`;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y, maxW);
}

// ── AFT-001: SAFE ZONES + FITTED LABELS ─────────────────────────────────────
// The mobile screen is a stack of RESERVED bands; every fitted label belongs
// to one. fitLabel is the one true containment primitive: shrink toward a
// readable floor, then ELLIPSIZE — never rely on fillText's maxWidth squish
// as the only strategy (it distorts glyphs instead of reflowing). It also
// clamps its own bounds on-screen, so a world-anchored label near an edge
// slides inward instead of clipping. Returns measured bounds for callers
// (glyph placement, the dev overlay, the suite's containment assertions).
let ZONE_DEBUG = /[?&]zones\b/.test(location.search);
let zoneLog = null; // per-frame label bounds, collected only while debugging
let actorLabelLog = null; // AFT-021: local actor nameplates this frame (suite/debug only)
// ── AFT-021 P2: THE SURFACE REGISTRY — the layout/priority authority ────────
// Every named HUD/transient surface CLAIMS its rectangle as it draws. The
// registry is the enforcement side of the single-owner rule: the suite and
// the mobile scene gate assert that no two non-background claims overlap.
// The behavioral side lives at the draw sites — lower-priority copy YIELDS
// (title under a live goal, combat notices behind announcements, tutorials
// behind objectives) instead of stacking.
let surfaceLog = null; // per-frame claimed surfaces (suite/?zones only)
function claimSurface(name, x, y, w, h, opts = {}) {
  if (surfaceLog) surfaceLog.push({ name, x, y, w, h, bg: !!opts.bg });
}
// is a PRIMARY goal surface live (objective or finale meter)? — the one
// question every lower-priority surface asks before taking a lane
function goalSurfaceLive() {
  if (G.objective && !G.objective.done && !G.objective.failed) return true;
  const F = G.finale;
  return !!(F && F.meter && !F.mastery.clear);
}
// is any announcement (card or strip) currently displayed?
function announceLive() { return !!G.announce; }
// AFT-021 P2: the RESULTS/DRAFT backing plate. At settle the last resolved
// frame (a sanitized arena — every enemy departed or stood down) is captured
// once and quieted; the panels then draw over this STATIC plate instead of
// re-rendering the combat object graph every frame. Nothing live can read
// through a card, and the panels stop paying for a world they don't show.
// ── AFT-021 P3: THE COMBAT-SAFE VIEWPORT ────────────────────────────────────
// The rectangle combat is allowed to OWN: below the HUD + goal-pill band,
// inside the safe-area insets, above the floor. Touch-control geometry is
// reported alongside so spawn/settle logic can keep actors and mandatory
// tells from living underneath the pads. Bosses, sentinels, objective
// actors and docked art clamp to this — not to raw W × H.
function combatSafeRect() {
  // AFT-030: the top bar + the status row (goal pill, boss lane, chips)
  const goalBand = (G.state === 'play' || G.state === 'serve') ? HUD_ROW_H : 0;
  const y0 = SAFE_T + HUD_BAR_H + goalBand;
  const r = { x0: SAFE_L + 10, y0, x1: W - SAFE_R - 10, y1: FLOOR() - 6, controls: [] };
  if (IS_TOUCH && (G.state === 'play' || G.state === 'serve')) {
    const B = touchButtons();
    for (const b of [B.fire, B.mega, B.pause]) {
      if (b) r.controls.push({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 });
    }
  }
  return r;
}
// AFT-021 P3: THE ACTIVE TARGET — the one actor whose local nameplate and
// bar may draw. Everyone else keeps silhouette/aura identity and reads from
// the compact roster rail instead of stacking world-space labels.
function activeCombatActor() {
  // UNTOUCHABLE actors must never wear the active ring: out-of-hour pasts,
  // the raid's still-bound mythic, sealed chase vessels, stood-down scenery
  // (measured: the ring marked the bound Seraph and play stalled around it)
  const live = G.bricks.filter(b => !b.dead && !b.dormant && (b.isBoss || b.subBoss)
    && !b.stoodDown && !b.hourOut && !b.vesselSealed && !(b.raidBound && !b.raidFreed));
  if (!live.length) return null;
  const F = G.finale;
  if (F && F.relay && F.beat === 0 && F.relay.carrier != null) {
    const c = live.find(v => v.subIdx === F.relay.carrier);
    if (c) return c;
  }
  // the RAID teaches "break the crown at its owner" — while a segment
  // assembles, the ring marks THAT captain, not the distant Sovereign
  if (F && F.raid && !F.raid.window && F.raid.segments && F.raid.segments[F.raid.seg]) {
    const S = F.raid.segments[F.raid.seg];
    if (S.state === 'assembling') {
      const cap = live.find(b => b.raidCaptain && b.subIdx === S.owner);
      if (cap) return cap;
    }
  }
  const mark = live.find(b => b.laneMark);
  if (mark) return mark;
  const rank = b => (b.secretBoss ? 6 : b.mythic ? 5 : b.isBoss ? 4 : (b.hourOut ? 0 : 0) + (b.openT > 0 ? 2 : 1));
  live.sort((a, b) => rank(b) - rank(a)
    || Math.abs(a.bx + G.fx - G.paddle.x) - Math.abs(b.bx + G.fx - G.paddle.x));
  return live[0];
}
let PLATE_RENDER = false; // render() draws WORLD ONLY while set (no HUD/overlays/text)
function captureArenaPlate() {
  try {
    PLATE_RENDER = true;
    render(); // one clean world-only frame of the resolved arena
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const q = c.getContext('2d');
    q.drawImage(canvas, 0, 0);
    q.fillStyle = 'rgba(4,7,18,0.6)'; // quiet it down — panels own the contrast
    q.fillRect(0, 0, c.width, c.height);
    G.arenaPlate = c;
  } catch (e) { G.arenaPlate = null; } finally { PLATE_RENDER = false; }
}
function uiZones() {
  const hudH = HUD_BAR_H + SAFE_T;
  const bannerH = HUD_ROW_H; // AFT-030: the status row (goal pill · combo · rift key · boss lane)
  const shipTop = G.mode === 'junkie' ? PADDLE_Y() - SHIP_BAND : PADDLE_Y() - 46;
  const z = {
    topHud: { x: 0, y: 0, w: W, h: hudH },
    banner: { x: 0, y: hudH, w: W, h: bannerH },
    field: { x: 0, y: hudH + bannerH, w: W, h: Math.max(0, shipTop - hudH - bannerH) },
    ship: { x: 0, y: shipTop, w: W, h: Math.max(0, FLOOR() - shipTop) },
    controls: null,
  };
  if (IS_TOUCH) {
    const B = touchButtons();
    // the DOCK's thumb pads — pause lives inside topHud since AFT-030
    const bs = [B.fire, B.mega].filter(Boolean);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of bs) { x0 = Math.min(x0, b.x - b.r); y0 = Math.min(y0, b.y - b.r); x1 = Math.max(x1, b.x + b.r); y1 = Math.max(y1, b.y + b.r); }
    if (bs.length) z.controls = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  return z;
}
function fitLabel(text, x, y, o = {}) {
  const maxW = Math.max(24, o.maxW || W - 24);
  const min = o.min || 9;
  let size = o.size || 13;
  const family = o.family || 'Orbitron, sans-serif';
  const weight = o.weight || 800;
  ctx.font = `${weight} ${size}px ${family}`;
  let t = String(text);
  let w = ctx.measureText(t).width;
  if (w > maxW) { // 1) shrink toward the readable floor
    size = Math.max(min, size * maxW / w);
    ctx.font = `${weight} ${size}px ${family}`;
    w = ctx.measureText(t).width;
  }
  if (w > maxW && t.length > 2) { // 2) at the floor: ellipsis, never squish
    while (t.length > 1 && ctx.measureText(t.replace(/\s+$/, '') + '…').width > maxW) t = t.slice(0, -1);
    t = t.replace(/\s+$/, '') + '…';
    w = ctx.measureText(t).width;
  }
  const align = o.align || 'center';
  let ax = x; // keep the label's own bounds on-screen wherever it was anchored
  if (o.clamp !== false) {
    if (align === 'center') ax = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x));
    else if (align === 'left') ax = Math.max(4, Math.min(W - w - 4, x));
    else ax = Math.max(w + 4, Math.min(W - 4, x));
  }
  if (o.color) ctx.fillStyle = o.color;
  const pa = ctx.textAlign;
  ctx.textAlign = align;
  ctx.fillText(t, ax, y, maxW); // maxWidth stays as belt-and-braces only
  ctx.textAlign = pa;
  const x0 = align === 'center' ? ax - w / 2 : align === 'right' ? ax - w : ax;
  const b = { x0, x1: x0 + w, w, y, size, text: t };
  if (zoneLog) { b.zone = o.zone || null; zoneLog.push(b); }
  return b;
}
// AFT-022 F2: greedy word wrap at a fixed size — the shared computation
// behind fitLabelWrap and its line-count predictor (the two must agree, or
// a band sized by the predictor draws a different number of lines).
function wrapAtSize(text, size, weight, family, maxW) {
  ctx.font = `${weight} ${size}px ${family}`;
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const wd of words) {
    const cand = cur ? cur + ' ' + wd : wd;
    if (cur && ctx.measureText(cand).width > maxW) { lines.push(cur); cur = wd; }
    else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}
// How many lines fitLabelWrap will actually use for this text+options —
// callers that size a band BEFORE drawing (the reveal info panel) ask this.
function wrapLinesNeeded(text, o = {}) {
  if (!text) return 0;
  const maxW = Math.max(24, o.maxW || W - 24);
  const min = o.min || 9;
  const weight = o.weight || 800, family = o.family || 'Orbitron, sans-serif';
  ctx.font = `${weight} ${min}px ${family}`;
  if (ctx.measureText(String(text)).width <= maxW) return 1; // shrink path covers it
  return Math.min(Math.max(1, o.maxLines || 2), wrapAtSize(text, min, weight, family, maxW).length);
}
// AFT-022 F2: the wrapping variant of fitLabel for MUST-READ copy. fitLabel
// shrinks to the readable floor then ELLIPSIZES — right for identity labels,
// wrong for instructions (boss mechanic cues, next-step directions, storage
// guidance), which on narrow portrait phones were losing their second half.
// Behavior is IDENTICAL to fitLabel whenever the text fits at ≥min on one
// line; only the previously-ellipsized case changes: the text wraps onto up
// to maxLines floor-size lines extending DOWNWARD from y. Returns
// {n, lineH, size} so callers can advance their layout.
function fitLabelWrap(text, x, y, o = {}) {
  const maxW = Math.max(24, o.maxW || W - 24);
  const maxLines = Math.max(1, o.maxLines || 2);
  const min = o.min || 9;
  const weight = o.weight || 800, family = o.family || 'Orbitron, sans-serif';
  ctx.font = `${weight} ${min}px ${family}`;
  if (maxLines === 1 || ctx.measureText(String(text)).width <= maxW) {
    const b = fitLabel(text, x, y, o);
    return { n: 1, lineH: Math.round(b.size * 1.3), size: b.size, lines: [b] };
  }
  let lines = wrapAtSize(text, min, weight, family, maxW);
  if (lines.length > maxLines) { // pathological: keep every word visible in the last line's ellipsis
    lines = lines.slice(0, maxLines - 1).concat(lines.slice(maxLines - 1).join(' '));
  }
  const lineH = Math.round(min * 1.3);
  const out = lines.map((ln, i) => fitLabel(ln, x, y + i * lineH, { ...o, size: min, min }));
  return { n: lines.length, lineH, size: min, lines: out };
}
// dev overlay (?zones): zone bands + every fitted label's measured box; a
// label outside the viewport or its declared band is flagged loud red.
// NOTE: labels drawn inside the HUD's translate(0, SAFE_T) record local y.
function drawZoneOverlay() {
  if (!ZONE_DEBUG) return;
  const z = uiZones();
  const colors = { topHud: '#4dd0e1', banner: '#ffd54f', field: '#66bb6a', ship: '#ff8a65', controls: '#d780ff' };
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '700 9px monospace';
  for (const [name, r] of Object.entries(z)) {
    if (!r) continue;
    ctx.globalAlpha = 0.8; ctx.lineWidth = 1;
    ctx.strokeStyle = colors[name] || '#fff';
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.fillStyle = colors[name] || '#fff';
    ctx.fillText(name, r.x + 4, r.y + 3);
  }
  let vy = 64;
  for (const b of (zoneLog || [])) {
    const out = b.x0 < -0.5 || b.x1 > W + 0.5;
    ctx.strokeStyle = out ? '#ff1744' : 'rgba(102,187,106,0.55)';
    ctx.strokeRect(b.x0, b.y - b.size * 0.7, b.w, b.size * 1.4);
    if (out) {
      ctx.fillStyle = '#ff1744';
      ctx.fillText('OUT ' + (b.zone || '?') + ' · ' + b.text.slice(0, 30), 8, vy);
      vy += 11;
    }
  }
  ctx.restore();
}
// AFT-018b: DECORATIVE GLOW GATE — shadowBlur forces a GPU blur pass over
// the draw's whole bounding box; over a 100px+ sprite EVERY frame it is a
// fill-rate bill phones actually pay. At ladder rung ≥1 the big decorative
// glows go flat (the information — ring, colour, label — all remains).
function fxGlow(px) { return effectsLevel() >= 1 ? 0 : px; }

// ── AFT-002: THE BOSS REVEAL SCENE ──────────────────────────────────────────
// Full-resolution portrait art (AETHERFALL_ART_REVEAL 512px exports on the
// aetherfall skin; the skin's own largest sprite elsewhere), an info panel
// that NEVER overlaps the art, a skippable hold, then the portrait flies
// into the boss's combat rectangle. Reduced-effects mode dissolves in place.
const revealImgCache = {};
// Warm every reveal portrait a region can show (boss, sentinels, mythic —
// and realm 1's secret) — called from buildLevel on EVERY wave of the
// region and from the trial picker, so the 512px art has stages (or at
// least seconds) of lead time before a reveal ever draws it.
function warmRevealArt(rIdx2) {
  const gen = SKIN.gens && SKIN.gens[rIdx2];
  if (!gen) return;
  bossRevealImage(gen.boss.id);
  if (gen.gauntlet) {
    for (const [sid] of gen.gauntlet.subs) bossRevealImage(sid);
    bossRevealImage(gen.gauntlet.myth[0]);
  }
  if (rIdx2 === 0 && SKIN.secret) bossRevealImage(SKIN.secret.id);
}
function bossRevealImage(id) {
  if (revealImgCache[id]) return revealImgCache[id];
  let img = null;
  if (SKIN.id === 'aetherfall' && typeof AETHERFALL_ART_REVEAL !== 'undefined' && AETHERFALL_ART_REVEAL[id]) {
    img = loadAetherImage(AETHERFALL_ART_REVEAL[id], 'reveal');
  } else img = getSprite(id);
  revealImgCache[id] = img;
  return img;
}

// AFT-011: bound the decoded campaign library to current + next realm, plus
// the player's three-form vessel line. The production images/canvases are
// ordinary JS references, so deleting old cache entries makes them eligible
// for collection without touching anything still on the live stage.
function trimAetherfallArtCaches(currentRealm) {
  if (SKIN.id !== 'aetherfall') return;
  const nextRealm = (currentRealm + 1) % SKIN.gens.length;
  const keepIds = new Set([...realmArtIds(currentRealm), ...realmArtIds(nextRealm)]);
  const chosen = SKIN.starterMon && SKIN.starterMon[SETTINGS.starter];
  if (chosen && chosen.ids) chosen.ids.forEach(id => keepIds.add(id));
  if (SKINS.aetherfall.retainSpriteIds) SKINS.aetherfall.retainSpriteIds(keepIds);

  const keepReveal = new Set([...realmArtIds(currentRealm), ...realmArtIds(nextRealm)]);
  for (const id of Object.keys(revealImgCache)) if (!keepReveal.has(+id)) delete revealImgCache[id];

  const keepPreview = new Set();
  if (chosen && chosen.ids) {
    const tables = [typeof AETHERFALL_ART_PREVIEW !== 'undefined' && AETHERFALL_ART_PREVIEW,
      typeof AETHERFALL_ART_PREVIEW_RADIANT !== 'undefined' && AETHERFALL_ART_PREVIEW_RADIANT];
    for (const table of tables) if (table) for (const id of chosen.ids) if (table[id]) keepPreview.add(table[id]);
  }
  for (const src of Object.keys(aetherPreviewImages)) if (!keepPreview.has(src)) delete aetherPreviewImages[src];
  for (const key of Object.keys(fxCache)) {
    if (!key.startsWith('vessel_')) continue;
    const id = +(key.split('_')[1] || 0);
    if (!keepIds.has(id)) delete fxCache[key];
  }
}

function aetherArtMemoryStats() {
  const bytesFor = values => values.reduce((n, img) => {
    const w = (img && (img.naturalWidth || img.width)) || 0;
    const h = (img && (img.naturalHeight || img.height)) || 0;
    return n + w * h * 4;
  }, 0);
  const sprite = SKINS.aetherfall.spriteCacheStats ? SKINS.aetherfall.spriteCacheStats()
    : { count: 0, decodedBytes: 0 };
  const buckets = {
    sprites: sprite.decodedBytes,
    previews: bytesFor(Object.values(aetherPreviewImages)),
    reveals: bytesFor(Object.values(revealImgCache)),
    weapons: bytesFor(Object.values(aetherWeaponImages)),
  };
  const decodedBytes = Object.values(buckets).reduce((a, b) => a + b, 0);
  return {
    decodedMB: +(decodedBytes / 1048576).toFixed(2), spriteCanvases: sprite.count,
    previews: Object.keys(aetherPreviewImages).length, reveals: Object.keys(revealImgCache).length,
    weapons: Object.keys(aetherWeaponImages).length,
    bucketsMB: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, +(v / 1048576).toFixed(2)])),
    jsHeapMB: performance.memory && performance.memory.usedJSHeapSize
      ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(2) : null,
  };
}
function drawRevealPortrait(id, cx, cy, side, alpha, latch) {
  let img = bossRevealImage(id);
  const ready = !!(img && img.complete && img.naturalWidth);
  // the LATCH (owner report, 2026-07-24): the portrait's art source is
  // decided during the 0.35s fade-in and then LOCKED — a slow-loading PNG
  // may never pop in over an already-visible fallback mid-scene
  if (latch) {
    if (latch[id] === undefined) {
      if (ready) latch[id] = true;
      else if (latch.lockNow) latch[id] = false;
    }
    if (latch[id] === false) img = getSprite(id);
    else if (!ready) img = getSprite(id);
  } else if (!ready) img = getSprite(id); // load gap → live sprite
  if (!img || !(img.naturalWidth || img.width)) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const sc = Math.min(side / iw, side / ih);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, cx - iw * sc / 2, cy - ih * sc / 2, iw * sc, ih * sc);
  ctx.globalAlpha = 1;
}
function revealLatch(r) {
  if (!r.artLatch) r.artLatch = {};
  r.artLatch.lockNow = r.t >= 0.35; // past the fade, the choice is final
  return r.artLatch;
}
// AFT-022 F2: how much taller the reveal's info band runs when its copy
// wraps on narrow screens. The literal line heights are round(min·1.3) for
// each row's floor size — they must stay in lockstep with the fitLabelWrap
// calls in the hold branch, and BOTH reveal branches must use this (the art
// square is sized from the band, and the fly must start from the square the
// player was just shown).
function revealBandExtras(r) {
  const n1 = Math.max(1, wrapLinesNeeded(r.title, { min: 13, weight: 900, maxW: W - 56, maxLines: 3 }));
  const n2 = Math.max(1, wrapLinesNeeded(r.sub, { min: 9, weight: 700, maxW: W - 64, maxLines: 3 }));
  const n3 = Math.max(1, wrapLinesNeeded(r.cue, { min: 8.5, weight: 700, maxW: W - 64, maxLines: 3, family: 'Verdana, system-ui, sans-serif' }));
  return { t: (n1 - 1) * 17, s: (n2 - 1) * 12, c: (n3 - 1) * 11 };
}
function drawBossReveal() {
  const r = G.reveal;
  if (!r) return;
  const primary = r.brs[0];
  const col = TYPE_COLORS[primary.poke.t] || '#d780ff';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (r.phase === 'hold') {
    const enter = Math.min(1, r.t / 0.3);
    const a = enter;
    ctx.fillStyle = 'rgba(3,6,18,' + (0.74 * a).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    // art zone: the largest square the safe area allows, panel BELOW the art.
    // AFT-022 F2: on narrow portrait the band GROWS for wrapped copy — the
    // boss name and its mechanic cue may each take a second line instead of
    // ellipsizing, and the art square yields exactly that difference.
    const ex = revealBandExtras(r);
    const panelH = 92 + ex.t + ex.s + ex.c;
    const y0 = SAFE_T + 34;
    const side = Math.max(120, Math.min(W - 48, H - y0 - panelH - SAFE_B - 52));
    const pop = r.reduced ? 1 : 0.94 + 0.06 * (1 - Math.pow(1 - enter, 3));
    const artCy = y0 + side / 2;
    ctx.globalAlpha = a;
    // a restrained ring stage behind the art — strokes only, no gradients
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, artCy, side * 0.52 * pop, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a * 0.35;
    ctx.beginPath(); ctx.arc(W / 2, artCy, side * 0.58 * pop, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (r.kind === 'sentinels' && r.ids.length > 1) {
      // the trio must sit WHOLLY inside the frame (owner report: outer
      // herald portraits ran off phone edges) — cap each portrait by the
      // width share, then cap the spread so outer edges keep a margin
      const each = Math.min(side * (r.ids.length === 2 ? 0.62 : 0.5), (W - 32) / r.ids.length) * pop;
      const span = Math.min(W - each - 24, side * 1.3);
      r.ids.forEach((id, i) => {
        const fx2 = W / 2 + span * (i / (r.ids.length - 1) - 0.5);
        drawRevealPortrait(id, fx2, artCy, each, a, revealLatch(r));
      });
    } else {
      drawRevealPortrait(r.ids[0], W / 2, artCy, side * pop, a, revealLatch(r));
    }
    // the info panel — a dedicated band, never over the art. Title, roster
    // line and mechanic cue WRAP on narrow screens (AFT-022 F2): a boss's
    // instructions are must-read copy and may never vanish behind an
    // ellipsis. Row starts shift down by the extra lines above them.
    const py = y0 + side + 10;
    ctx.globalAlpha = a;
    fitLabelWrap(r.title, W / 2, py + 16, { size: 24, min: 13, weight: 900, color: col, maxW: W - 56, maxLines: 3 });
    fitLabelWrap(r.sub, W / 2, py + 40 + ex.t, { size: 11.5, min: 9, weight: 700, color: '#e3f2fd', maxW: W - 64, maxLines: 3 });
    ctx.font = bodyFont(11, 700);
    fitLabelWrap(r.cue, W / 2, py + 60 + ex.t + ex.s, { size: 11, min: 8.5, weight: 700, color: '#ffe082', maxW: W - 64, family: 'Verdana, system-ui, sans-serif', maxLines: 3 });
    if (r.t > 0.55) {
      ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(G.time * 4));
      fitLabel(IS_TOUCH ? 'TAP TO ENGAGE' : 'CLICK TO ENGAGE', W / 2, py + 80 + ex.t + ex.s + ex.c,
        { size: 10, min: 9, weight: 800, color: '#90a4ae', maxW: W - 80 });
    }
  } else {
    // FLY: the same art travels into the boss's combat rectangle while the
    // scrim lifts; reduced mode is a dissolve at the destination instead
    const k = Math.min(1, r.t / r.flyDur);
    const e = k * k * (3 - 2 * k); // smoothstep
    ctx.fillStyle = 'rgba(3,6,18,' + (0.74 * (1 - e)).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    // must mirror the hold branch's band height exactly, or the fly starts
    // from a different art square than the one the player was just shown
    const ex = revealBandExtras(r);
    const panelH = 92 + ex.t + ex.s + ex.c;
    const y0 = SAFE_T + 34;
    const side = Math.max(120, Math.min(W - 48, H - y0 - panelH - SAFE_B - 52));
    const artCy = y0 + side / 2;
    const fade = 1 - Math.max(0, (k - 0.62) / 0.38); // cross-fade to the live sprite
    r.brs.forEach((b, i) => {
      if (!b || b.dead) return;
      const tx = b.bx + G.fx, ty = b.by + G.fy;
      const tSide = Math.max(60, b.w * 1.12);
      let sx2 = W / 2, sSide = side;
      if (r.kind === 'sentinels' && r.ids.length > 1) {
        // mirror the hold branch's clamps so the fly starts exactly where
        // the held portraits actually sat
        sSide = Math.min(side * (r.ids.length === 2 ? 0.62 : 0.5), (W - 32) / r.ids.length);
        const span = Math.min(W - sSide - 24, side * 1.3);
        sx2 = W / 2 + span * (i / (r.ids.length - 1) - 0.5);
      }
      const cx = r.reduced ? tx : sx2 + (tx - sx2) * e;
      const cy = r.reduced ? ty : artCy + (ty - artCy) * e;
      drawRevealPortrait(b.poke.id, cx, cy, r.reduced ? tSide : sSide + (tSide - sSide) * e, fade, revealLatch(r));
    });
  }
  ctx.restore();
}
// the docked boss lane: name · phase over a slim health bar, a plate in the
// status row's right cluster — the revealed boss carries NO floating
// nameplate over its art (AFT-002). r/S come from hudStatusLayout().
function drawBossLane(r, S) {
  if (!r || !S) return;
  const br = r.br;
  const frac = Math.max(0, br.hp / br.maxHp);
  const pc = bossPhaseCount(br), ph = Math.min(pc, br.phase || 1);
  const last = ph >= pc;
  uiPanel(r.x, S.y, r.w, S.h, { r: 9, soft: false, accent: last ? UI.danger : '#ff8a65' });
  ctx.textBaseline = 'middle';
  fitLabel(br.poke.n.toUpperCase() + ' · ' + ph + '/' + pc, r.x + 10, S.cy - 3.5,
    { size: UI.small, min: 8, weight: 900, color: last ? '#ff8a80' : '#ffccbc', align: 'left', maxW: r.w - 20, zone: 'topHud' });
  roundRect(r.x + 10, S.cy + 4.5, r.w - 20, 4, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  if (frac > 0) {
    roundRect(r.x + 10, S.cy + 4.5, Math.max(4, (r.w - 20) * frac), 4, 2);
    ctx.fillStyle = last ? '#ff5252' : '#ff8a65'; ctx.fill();
  }
  claimSurface('bossLane', r.x, SAFE_T + S.y, r.w, S.h);
}
// AFT-021 P3: THE ROSTER RAIL — when a fight has two or more labeled actors
// (relay vows, raid court, siege colossi, twin timelines), only the active
// target keeps a world-space nameplate; everyone is represented HERE as a
// compact pip (type color + hp arc, the active one ringed white) on one
// plate in the status row. Identity comes from ring color + the actor's own
// aura, never from stacked labels.
function drawRosterRail(r, S) {
  if (!r || !S) return;
  uiPanel(r.x, S.y, r.w, S.h, { r: 9, soft: false });
  claimSurface('rosterRail', r.x, SAFE_T + S.y, r.w, S.h, { bg: false });
  const pr = 6;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < r.live.length; i++) {
    const b = r.live[i];
    const cx = r.x + 14 + i * 18;
    const col = TYPE_COLORS[b.poke.t] || '#90a4ae';
    const frac = Math.max(0, b.hp / b.maxHp);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(cx, S.cy, pr, 0, Math.PI * 2); ctx.stroke();
    if (frac > 0) {
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(cx, S.cy, pr, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
    if (b === frameActiveActor) { // the attackable one — a bright core + ring
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, S.cy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, S.cy, pr + 2.6, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}
// The title is the start of a journey, not a dim pause screen. A painted route
// crosses nine colourful regions behind the mode cards while a warm morning
// sky and drifting leaves keep the hub buoyant even before audio is enabled.
function drawMenuAdventureBackdrop(L) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#69c9f5'); sky.addColorStop(0.48, '#bce9ef'); sky.addColorStop(0.76, '#ffe7a8'); sky.addColorStop(1, '#85c96d');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const sunX = W * 0.82, sunY = Math.max(42, H * 0.14), sunR = Math.min(W, H) * 0.11;
  const sun = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunR * 2.8);
  sun.addColorStop(0, 'rgba(255,255,238,0.98)'); sun.addColorStop(0.28, 'rgba(255,231,132,0.72)'); sun.addColorStop(1, 'rgba(255,231,132,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H * 0.55);
  // Slow cloud banks: deterministic positions, gentle parallax, no flicker.
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.76)';
  for (let i = 0; i < 7; i++) {
    const drift = SETTINGS.reduceFlash ? 0 : (G.time * (5 + i % 3)) % (W + 220);
    const cx = ((i * 193 + 36 + drift) % (W + 220)) - 110;
    const cy = 62 + (i % 3) * 54, sc = 0.65 + (i % 4) * 0.16;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 54 * sc, 15 * sc, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 31 * sc, cy + 3, 33 * sc, 12 * sc, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 29 * sc, cy + 4, 38 * sc, 12 * sc, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 8 * sc, cy - 10 * sc, 25 * sc, 20 * sc, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Distant ridges and a winding cream route bind the nine-region campaign
  // into one continuous horizon.
  const ridgeY = H * 0.57;
  ctx.fillStyle = '#6bb27d'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 80; x += 80) ctx.lineTo(x, ridgeY - 30 - 32 * Math.sin(x * 0.014 + 0.8));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d8c65'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 70; x += 70) ctx.lineTo(x, ridgeY + 26 - 24 * Math.sin(x * 0.019 + 2.1));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,196,0.78)'; ctx.lineWidth = Math.max(5, W * 0.008); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-30, H * 0.75);
  ctx.bezierCurveTo(W * 0.25, H * 0.55, W * 0.48, H * 0.85, W * 0.69, H * 0.66);
  ctx.bezierCurveTo(W * 0.82, H * 0.56, W * 0.91, H * 0.7, W + 30, H * 0.6); ctx.stroke();
  // Region trail markers remain mostly in the side gutters behind cards.
  for (let i = 0; i < 9; i++) {
    const u = i / 8, x = 18 + u * (W - 36), y = H * (0.7 - 0.055 * Math.sin(u * Math.PI * 3));
    ctx.fillStyle = 'rgba(13,55,58,0.82)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = SKIN.gens[i].accent; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // A few wind-carried leaves make the scene feel alive without obscuring UI.
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const t = SETTINGS.reduceFlash ? i * 0.08 : (G.time * (0.035 + (i % 4) * 0.006) + i * 0.087) % 1;
    const x = -30 + t * (W + 60), y = 28 + ((i * 71) % Math.max(80, H * 0.72)) + Math.sin(G.time * 1.4 + i) * 10;
    ctx.translate(x, y); ctx.rotate(t * Math.PI * 5 + i);
    ctx.fillStyle = i % 3 ? 'rgba(55,138,82,0.52)' : 'rgba(255,199,88,0.62)';
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(-(t * Math.PI * 5 + i)); ctx.translate(-x, -y);
  }
  ctx.restore();
  // Soft glass veil immediately behind the brand keeps it readable over sky.
  const hw = Math.min(W * 0.9, 760), hh = L.short ? 62 : 86;
  roundRect(W / 2 - hw / 2, Math.max(5, L.titleY - L.titleSize * 0.72), hw, hh, 24);
  ctx.fillStyle = 'rgba(16,74,92,0.48)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}

// ============================================================
// AFT-029 THE TITLE + SETUP REBUILD (2026-11-13). Both menu surfaces sit on
// the deep-stage UI kit (top of this file): uiStage + a slow star drift,
// panels with hairlines (no neon card halos), ONE primary slab per screen,
// ONE hero glow (the wordmark). The three mode dioramas are miniature
// renders of the REAL deep stage each mode plays on — a streaming star
// field and a formation for STARFIGHTER, a boxed wall over the dark stage
// for BREAKER and BLASTER — not the old neon perspective grids.
// Presentation only: Math.random is never used here and gameRand never is.
// ============================================================
// surface entrance clock: wall-clock seconds since the surface `key` opened.
// A frozen frame (tools/shot.js, the gate's scenes) or a cold first frame
// draws fully settled, so screenshots never catch a half-faded screen.
let uiSurfKey = '', uiSurfT0 = 0, uiSurfLast = 0;
function uiSurfaceT(key) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  if (key !== uiSurfKey) {
    const live = now - uiSurfLast < 0.25 && !(G.freeze > 100) && !SETTINGS.reduceFlash;
    uiSurfT0 = live ? now : now - 10;
    uiSurfKey = key;
  }
  uiSurfLast = now;
  return now - uiSurfT0;
}
// the menus' star field: the combat `stars` set drifting slowly downward —
// the same deep space the game flies through, at a calm idle speed
function drawMenuStars(speed = 1) {
  const t = SETTINGS.reduceFlash ? 0 : G.time;
  ctx.fillStyle = '#dfe6ff';
  for (const s of stars) {
    const z = s.z;
    const y = ((s.y / 0.75 + t * (5 + z * z * 26) * speed) % (H + 20)) - 10;
    ctx.globalAlpha = 0.1 + z * 0.42;
    const big = z > 0.78;
    ctx.fillRect(s.x, y, big ? 1.8 : 1.2, big ? 1.8 + z * 3 * speed : 1.2);
  }
  ctx.globalAlpha = 1;
}
// a soft round light, baked once per colour (the one allowed hero glow, and
// the vessel pedestals) — drawn scaled, never a per-frame gradient
function uiGlowDisc(color) {
  const k = 'uiglow_' + color;
  if (fxCache[k]) return fxCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, color + 'aa'); gr.addColorStop(0.45, color + '33'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  fxCache[k] = c;
  return c;
}
// the dark stage behind a diorama — the realm-warmed deep navy, baked per
// mode + size (one drawImage per frame)
function homeDioBg(mode, w, h) {
  w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
  const k = 'homedio_' + mode.key + '_' + w + 'x' + h;
  if (fxCache[k]) return fxCache[k];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const ac = mode.accent, ar = parseInt(ac.slice(1, 3), 16), ag = parseInt(ac.slice(3, 5), 16), ab = parseInt(ac.slice(5, 7), 16);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#03051a'); gr.addColorStop(0.55, '#070b22');
  gr.addColorStop(1, 'rgb(' + Math.round(8 + ar * 0.2) + ',' + Math.round(10 + ag * 0.2) + ',' + Math.round(28 + ab * 0.2) + ')');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // the realm warmth pooling low, like the combat stage's lower third
  const hz = g.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, Math.max(w, h) * 0.7);
  hz.addColorStop(0, ac + '30'); hz.addColorStop(1, ac + '00');
  g.fillStyle = hz; g.fillRect(0, 0, w, h);
  if (mode.key !== 'junkie') { // the wall modes keep a still, faint star field
    g.fillStyle = '#cfd8ff';
    for (let i = 0; i < Math.round(w * h / 900); i++) {
      g.globalAlpha = 0.12 + ((i * 29) % 10) / 30;
      g.fillRect((i * 97.31) % w, (i * 57.17) % (h * 0.8), 1.2, 1.2);
    }
    g.globalAlpha = 1;
  }
  fxCache[k] = c;
  return c;
}
const HOME_COPY = {
  junkie: { recipe: 'YOU FLY + FIRE', line: 'Fly through enemy squadrons. Dodge, then strike back.' },
  classic: { recipe: 'BALL + PADDLE', line: 'Bounce the ball, break the wall. No enemy fire.' },
  blaster: { recipe: 'NO BALL + DIRECT FIRE', line: 'No ball. Blast the wall with volleys and charges.' },
};
const HOME_ENEMY_IDS = [16, 41, 10, 92, 19];
const HOME_WALL_IDS = [25, 74, 133, 92, 10, 1, 7, 4, 39, 52, 143, 147, 37, 41, 54, 16, 19, 21];
const HOME_WALL_TYPES = ['fire', 'water', 'grass', 'electric', 'psychic', 'rock'];
function homeHash(n) { const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); }
function homeEase(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function homeSprite(id, x, y, s, alpha) {
  const img = getSprite(id);
  if (!img.complete || !img.naturalWidth) return false;
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
  ctx.globalAlpha = 1;
  return true;
}
// STARFIGHTER: the flown deep sky — stars streaming past, one formation
// gliding as a unit, the vessel weaving low, typed bolts up, pellets down
function drawDioStarfighter(mode, r, t) {
  const cx = r.x + r.w / 2;
  ctx.fillStyle = '#dfe6ff';
  for (let i = 0; i < 30; i++) {
    const z = 0.25 + ((i * 37) % 75) / 100;
    const sp = 16 + z * z * 120;
    const sx = r.x + ((i * 89.37 + 17) % r.w);
    const sy = r.y + ((i * 53.71 + t * sp) % (r.h + 16)) - 8;
    ctx.globalAlpha = 0.14 + z * 0.46;
    ctx.fillRect(sx, sy, z > 0.7 ? 1.5 : 1, 1.5 + z * z * 8);
  }
  ctx.globalAlpha = 1;
  const es = Math.max(14, Math.min(34, r.w * 0.12, r.h * 0.13));
  const fy = r.y + r.h * 0.2;
  const ePos = (i, tt) => ({
    x: cx + Math.sin(tt * 0.55) * r.w * 0.12 + (i - 2) * es * 1.32,
    y: fy + Math.abs(i - 2) * es * 0.34,
  });
  const ps = Math.max(34, Math.min(112, r.w * 0.3, r.h * 0.3));
  const sy0 = r.y + r.h * 0.8;
  const shipX = tt => cx + Math.sin(tt * 0.9) * r.w * 0.24 + Math.sin(tt * 2.1) * r.w * 0.03;
  const starter = SKIN.starterMon[SETTINGS.starter] ? SETTINGS.starter : null;
  const boltCol = starter ? TYPE_COLORS[starter] : '#9fe8ff';
  // the player's volley: spawned every P seconds from where the ship WAS
  const P = 0.34, FL = 0.5, muzzle = sy0 - ps * 0.42;
  const flash = new Array(5).fill(0);
  const pops = [];
  for (let k = 0; k < 5; k++) {
    const st = (Math.floor(t / P) - k) * P, u = (t - st) / FL;
    const bx = shipX(st);
    if (u >= 0 && u < 1) {
      const by = muzzle - u * (muzzle - fy);
      ctx.globalAlpha = 0.35; ctx.fillStyle = boltCol;
      roundRect(bx - 3, by - 9, 6, 18, 3); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 1.1, by - 7, 2.2, 14);
    } else if (u >= 1 && u < 1.3) { // landed: the nearest flyer flashes
      let best = -1, bd = es * 0.75;
      for (let i = 0; i < 5; i++) { const d = Math.abs(ePos(i, st + FL).x - bx); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) { flash[best] = Math.max(flash[best], 1 - (u - 1) / 0.3); pops.push({ x: bx, y: ePos(best, t).y, q: (u - 1) / 0.3 }); }
    }
  }
  // the formation — ONE rigid glide, riders upright (the owner's crisp motion)
  for (let i = 0; i < 5; i++) {
    const p = ePos(i, t), id = HOME_ENEMY_IDS[i];
    if (!homeSprite(id, p.x, p.y, es)) {
      ctx.fillStyle = '#ff8a80'; ctx.beginPath(); ctx.arc(p.x, p.y, es * 0.25, 0, Math.PI * 2); ctx.fill();
    } else if (flash[i] > 0.05) {
      const sil = getSilhouette(id, '#ffffff');
      if (sil) { ctx.globalAlpha = flash[i] * 0.85; ctx.drawImage(sil, p.x - es / 2, p.y - es / 2, es, es); ctx.globalAlpha = 1; }
    }
  }
  ctx.lineWidth = 1.4; ctx.strokeStyle = '#ffffff';
  for (const p of pops) {
    ctx.globalAlpha = 1 - p.q; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + p.q * 12, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // hostile pellets, aimed at where the ship is going — movement is survival
  for (let k = 0; k < 3; k++) {
    const EP = 1.15, EF = 1.5, st = (Math.floor(t / EP) - k) * EP, u = (t - st) / EF;
    if (u < 0 || u >= 1) continue;
    const src = ePos((Math.floor(st / EP) * 3 + 1) % 5, st);
    const tx = shipX(st + EF * 0.85), ty = sy0;
    const px = src.x + (tx - src.x) * u, py = src.y + (ty - src.y) * u;
    const ang = Math.atan2(ty - src.y, tx - src.x);
    ctx.strokeStyle = 'rgba(255,90,122,0.32)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(ang) * 12, py - Math.sin(ang) * 12); ctx.stroke();
    ctx.fillStyle = '#1a0610'; ctx.beginPath(); ctx.arc(px, py, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  // the vessel: engine flame, then the hull (the player's chosen one, or a
  // rotating example) — upright, gliding, never wobbling
  const sx = shipX(t);
  const fl = 0.75 + 0.25 * Math.sin(t * 31);
  ctx.fillStyle = 'rgba(159,232,255,0.55)';
  ctx.beginPath(); ctx.moveTo(sx - ps * 0.08, sy0 + ps * 0.3); ctx.lineTo(sx, sy0 + ps * (0.3 + 0.24 * fl)); ctx.lineTo(sx + ps * 0.08, sy0 + ps * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(sx - ps * 0.035, sy0 + ps * 0.3); ctx.lineTo(sx, sy0 + ps * (0.3 + 0.12 * fl)); ctx.lineTo(sx + ps * 0.035, sy0 + ps * 0.3); ctx.closePath(); ctx.fill();
  const pilot = menuStarfighterPilot(t);
  if (!drawAffinityVessel(pilot.id, sx, sy0, ps)) drawGlyph(ctx, 'star', sx, sy0, ps * 0.2, '#ffffff');
}
// the wall both brick modes play against: boxed bricks with their flyer
// inside, over the dark stage. `gone(i)` → 0 standing … 1 broken.
function homeWall(r, topMin = 0) {
  const cols = r.w > 250 ? 6 : 5, rows = 3;
  const m = Math.max(10, r.w * 0.07), g = Math.max(3, Math.min(7, r.w * 0.018));
  const wallW = r.w - m * 2, bw = (wallW - g * (cols - 1)) / cols;
  const bh = Math.max(12, Math.min(30, bw * 0.58, r.h * 0.1));
  const wy = r.y + Math.max(r.h * 0.13, topMin);
  return { cols, rows, n: cols * rows, bw, bh, g, x0: r.x + m, y0: wy,
    rect: i => ({ x: r.x + m + (i % cols) * (bw + g), y: wy + Math.floor(i / cols) * (bh + g), w: bw, h: bh }) };
}
function drawHomeBrick(B, i, flash, gone) {
  if (gone >= 1) return;
  const b = B.rect(i), col = TYPE_COLORS[HOME_WALL_TYPES[(i * 7 + Math.floor(i / B.cols)) % HOME_WALL_TYPES.length]];
  ctx.globalAlpha = 1 - gone;
  roundRect(b.x, b.y, b.w, b.h, Math.min(6, b.h * 0.3));
  ctx.fillStyle = mixHex(col, '#0a1024', 0.58); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(b.x + 3, b.y + 2, b.w - 6, 1.5);
  homeSprite(HOME_WALL_IDS[i % HOME_WALL_IDS.length], b.x + b.w / 2, b.y + b.h / 2, Math.min(b.h * 1.05, b.w * 0.5), 1 - gone);
  if (flash > 0.02) {
    ctx.globalAlpha = flash * 0.8 * (1 - gone); ctx.fillStyle = '#ffffff';
    roundRect(b.x, b.y, b.w, b.h, Math.min(6, b.h * 0.3)); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawHomeShards(B, i, q) { // a broken brick's four shards, q 0→1
  if (q <= 0 || q >= 1) return;
  const b = B.rect(i), col = TYPE_COLORS[HOME_WALL_TYPES[(i * 7 + Math.floor(i / B.cols)) % HOME_WALL_TYPES.length]];
  ctx.fillStyle = col; ctx.globalAlpha = 1 - q;
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * 0.9;
    ctx.fillRect(b.x + b.w / 2 + Math.cos(a) * q * b.w * 0.8 - 2, b.y + b.h / 2 + Math.sin(a) * q * b.h * 1.4 + q * q * 18 - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}
function drawHomePaddle(x, y, w, accent) {
  roundRect(x - w / 2, y, w, 7, 3.5); ctx.fillStyle = accent; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - w * 0.3, y + 1.5, w * 0.6, 1.5);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 4, y + 3.5); ctx.lineTo(x, y + 10); ctx.lineTo(x - 4, y + 3.5); ctx.closePath(); ctx.fill();
}
// BREAKER: a real rally — the ball runs paddle → brick → paddle, each hit
// breaks its brick, the paddle glides to meet the return; the wall re-forms
// after nine hits
function drawDioBreaker(mode, r, t) {
  const B = homeWall(r, 38), T = 0.62, K = 9; // clear of the DAILY badge
  const padY = r.y + r.h * 0.84, padW = Math.max(40, Math.min(110, r.w * 0.26));
  const order = [];
  for (let row = B.rows - 1; row >= 0; row--) for (let c = 0; c < B.cols; c++) order.push(row * B.cols + ((c * 3 + row) % B.cols));
  const target = m => order[m % order.length];
  const catchX = m => r.x + r.w * (0.22 + 0.56 * homeHash(m));
  const brickHit = m => { const b = B.rect(target(m)); return { x: b.x + b.w / 2, y: b.y + b.h + 4 }; };
  const ballAt = tt => {
    const n = Math.floor(tt / T), u = tt / T - n, m = Math.floor(n / 2);
    const h = brickHit(m);
    if (n % 2 === 0) { const a = catchX(m); return { x: a + (h.x - a) * u, y: padY - 6 + (h.y - padY + 6) * u }; }
    const b2 = catchX(m + 1); return { x: h.x + (b2 - h.x) * u, y: h.y + (padY - 6 - h.y) * u };
  };
  const tt = Math.max(0, t), n = Math.floor(tt / T), m = Math.floor(n / 2);
  const round0 = Math.floor(m / K) * K;
  const reform = Math.min(1, (tt - round0 * 2 * T) / 0.4);
  for (let i = 0; i < B.n; i++) {
    let gone = 0, flash = 0, shard = -1, alpha = 1;
    for (let j = round0; j <= m; j++) {
      if (target(j) !== i) continue;
      const hitT = (2 * j + 1) * T;
      if (tt >= hitT) { gone = Math.min(1, (tt - hitT) / 0.12); flash = Math.max(0, 1 - (tt - hitT) / 0.12); shard = (tt - hitT) / 0.4; }
    }
    if (!gone) for (let j = Math.max(0, round0 - K); j < round0; j++) if (target(j) === i) alpha = reform;
    drawHomeBrick(B, i, flash, gone || 1 - alpha);
    if (shard >= 0) drawHomeShards(B, i, shard);
  }
  // the paddle glides from this rally's catch point to the next one
  const pu = homeEase((tt - 2 * m * T) / (2 * T * 0.9));
  const px = catchX(m) + (catchX(m + 1) - catchX(m)) * pu;
  drawHomePaddle(px, padY, padW, mode.accent);
  for (let gi = 2; gi >= 0; gi--) {
    const p = ballAt(Math.max(0, tt - gi * 0.035));
    ctx.globalAlpha = gi ? 0.16 * (3 - gi) : 1;
    ctx.fillStyle = gi ? '#9fd8ff' : '#ffffff';
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3.5, Math.min(6, r.w * 0.018)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// BLASTER: no ball — the turret sweeps and sprays volleys into the wall's
// lowest row, then plants, charges, and looses a piercing lance that
// breaks a whole column; the wall re-forms at the end of the cycle
function drawDioBlaster(mode, r, t) {
  const B = homeWall(r), C = 4.2;
  const padY = r.y + r.h * 0.84, padW = Math.max(36, Math.min(96, r.w * 0.22));
  const spot = k => r.x + r.w * (0.24 + 0.52 * homeHash(k + 7));
  const turretX = tt => {
    const k = Math.floor(tt / C), c = tt / C - k;
    return spot(k) + (spot(k + 1) - spot(k)) * homeEase(c / 0.45);
  };
  const tt = Math.max(0, t), k = Math.floor(tt / C), c = tt / C - k;
  const colAt = x => Math.max(0, Math.min(B.cols - 1, Math.floor((x - B.x0) / (B.bw + B.g))));
  const lanceCol = colAt(spot(k + 1));
  const flash = new Array(B.n).fill(0);
  const bolts = [];
  // volleys during the sweep
  const VP = 0.16, VF = 0.42, wallBot = B.y0 + B.rows * (B.bh + B.g) - B.g;
  for (let j = 0; j < 4; j++) {
    const st = (Math.floor(tt / VP) - j) * VP, sc = st / C - Math.floor(st / C);
    if (st < 0 || sc > 0.45) continue;
    const u = (tt - st) / VF, bx = turretX(st) + (Math.floor(st / VP) % 2 ? 5 : -5);
    if (u >= 0 && u < 1) bolts.push({ x: bx, y: padY - 8 - u * (padY - 8 - wallBot) });
    else if (u >= 1 && u < 1.25) flash[(B.rows - 1) * B.cols + colAt(bx)] = 1 - (u - 1) / 0.25;
  }
  // the lance: charge 0.45–0.62, flight 0.62–0.7, the column breaks at 0.7
  const hitT = 0.7;
  for (let i = 0; i < B.n; i++) {
    const inCol = i % B.cols === lanceCol;
    let gone = 0, shard = 0;
    if (inCol && c >= hitT) { gone = Math.min(1, (c - hitT) * C / 0.12); shard = (c - hitT) * C / 0.45; }
    const fl = Math.max(flash[i], inCol && c >= hitT ? Math.max(0, 1 - (c - hitT) * C / 0.12) : 0);
    if (c > 0.93) gone = gone * (1 - (c - 0.93) / 0.07);
    drawHomeBrick(B, i, fl, gone);
    if (inCol && c < 0.93) drawHomeShards(B, i, shard);
  }
  const px = turretX(tt);
  for (const b of bolts) {
    ctx.globalAlpha = 0.35; ctx.fillStyle = mode.accent;
    roundRect(b.x - 2.5, b.y - 8, 5, 16, 2.5); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x - 1, b.y - 6, 2, 12);
  }
  if (c >= 0.45 && c < 0.62) { // the charge ring fills on the muzzle
    const q = (c - 0.45) / 0.17;
    ctx.lineWidth = 3; ctx.strokeStyle = q > 0.95 ? '#ffffff' : mode.accent;
    ctx.beginPath(); ctx.arc(px, padY - 10, 9, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); ctx.stroke();
  } else if (c >= 0.62 && c < hitT) { // the lance in flight
    const u = (c - 0.62) / (hitT - 0.62), ly = padY - 12 - u * (padY - 12 - B.y0);
    ctx.globalAlpha = 0.4; ctx.fillStyle = mode.accent;
    roundRect(px - 8, ly - 20, 16, 40, 8); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
    roundRect(px - 3.5, ly - 16, 7, 32, 3.5); ctx.fill();
  }
  drawHomePaddle(px, padY, padW, mode.accent);
}
function drawHomePreview(mode, r) {
  const t = SETTINGS.reduceFlash ? (mode.key === 'junkie' ? 2.2 : 1.9) : G.time;
  const rad = Math.min(12, r.h * 0.08);
  ctx.save();
  roundRect(r.x, r.y, r.w, r.h, rad); ctx.clip();
  ctx.drawImage(homeDioBg(mode, r.w, r.h), r.x, r.y, r.w, r.h);
  if (mode.key === 'junkie') drawDioStarfighter(mode, r, t);
  else if (mode.key === 'classic') drawDioBreaker(mode, r, t);
  else drawDioBlaster(mode, r, t);
  ctx.restore();
  roundRect(r.x, r.y, r.w, r.h, rad);
  ctx.lineWidth = 1; ctx.strokeStyle = UI.lineSoft; ctx.stroke();
}
// One game, one door: the live diorama, the mode name, ONE recipe line, a
// sentence, and the play affordance. The card the player last chose wears
// the screen's single PRIMARY slab (unless CONTINUE owns it).
function drawHomeGameCard(mode, i, L, primary, enter) {
  const P = L.parts(i), r = P.card, T = P.text;
  const hov = !IS_TOUCH && inRect(mouseX, lastMouseY, r);
  const sel = mode.key === SETTINGS.mode;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * enter.a;
  ctx.save(); ctx.translate(0, enter.dy);
  uiPanel(r.x, r.y, r.w, r.h, { accent: mode.accent, sel: sel || hov, lift: hov, r: L.stacked ? 16 : 18 });
  drawHomePreview(mode, P.dio);
  const copy = HOME_COPY[mode.key] || { recipe: mode.mechanic, line: '' };
  const left = L.stacked, ax = left ? T.x : T.x + T.w / 2, al = left ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  const roomy = T.h >= (left ? 118 : 104);
  let y = T.y + (left ? 8 : 6);
  fitLabel(lex(copy.recipe), ax, y, { size: L.tight || L.short ? 9 : 10, min: 8, weight: 800, color: mode.accent, maxW: T.w, align: al });
  y += L.tight || L.short ? 17 : 22;
  fitLabel(mode.label, ax, y, { size: Math.min(L.short ? 18 : 22, T.w / (mode.label.length * 0.78)), min: 12, weight: 900, color: UI.ink, maxW: T.w, align: al });
  y += L.tight || L.short ? 18 : 24;
  const lineRoom = P.play.y - 8 - (y - 6);
  if (roomy && lineRoom >= 24) {
    const maxLines = Math.max(1, Math.min(3, Math.floor(lineRoom / 15)));
    fitLabelWrap(lex(copy.line), ax, y, { size: 11, min: 10, weight: 500, family: "Verdana, 'Segoe UI', system-ui, sans-serif",
      color: UI.sub, maxW: T.w, align: al, maxLines });
  }
  uiButton(P.play, 'PLAY  ▶', { primary, accent: mode.accent, size: 12 });
  ctx.restore();
  ctx.globalAlpha = a0;
}
function drawMenuRedesign() {
  const L = menuLayout();
  const activeIndex = Math.max(0, MODES.findIndex(m => m.key === SETTINGS.mode));
  const mode = MODES[activeIndex];
  const st = uiSurfaceT('title');
  uiStage(mode.accent);
  drawMenuStars(1);
  ctx.textBaseline = 'middle';
  const head = uiEnter(st, 0.3);
  ctx.globalAlpha = head.a;
  // ---- the logo lock-up: the screen's ONE hero glow ----
  const brandX = L.stacked ? W / 2 : L.pad;
  const brandMaxW = L.stacked ? W - L.pad * 2 : Math.max(120, (L.skin ? L.skin.x : L.dex.x) - L.pad - 12);
  ctx.save();
  ctx.shadowColor = mode.accent; ctx.shadowBlur = SETTINGS.reduceFlash ? 10 : 22;
  fitLabel(L.brand, brandX, L.titleY, { size: L.titleSize, min: 16, weight: 900, color: UI.ink,
    maxW: brandMaxW, align: L.stacked ? 'center' : 'left' });
  ctx.restore();
  // The edition pill IS the skin toggle (Round S7): tap to flip skins and
  // reload. Its rect comes from menuLayout (the tap target) and render
  // publishes it for input — one geometry. A single-skin build has none.
  if (L.skin) {
    skinPillRect = L.skin;
    const hovSkin = !IS_TOUCH && inRect(mouseX, lastMouseY, L.skin);
    const txt = SKIN.edition + '  ⇄';
    const pcx = L.stacked ? L.skin.x + L.skin.w / 2 : L.skin.x;
    uiChip(pcx, L.skin.y + L.skin.h / 2, txt, { align: L.stacked ? 'center' : 'left', h: 26, size: 9.5,
      color: hovSkin ? UI.ink : mode.accent, fill: hovSkin ? UI.panelLift : UI.panelSoft });
  } else skinPillRect = null;
  // utilities: two quiet secondary buttons (header row on wide screens,
  // the bottom row on phones)
  uiButton(L.dex, SKIN.strings.dexChar + ' ' + SKIN.strings.dexName + ' ' + DEX.size + '/' + dexTotal(), { accent: UI.sub, size: L.dex.w < 150 ? 10 : 11 });
  uiButton(L.adv, '⚙  SETTINGS', { accent: UI.sub, size: 11 });
  ctx.globalAlpha = 1;
  // ---- CONTINUE: the primary action whenever a journey is saved ----
  if (L.resume && RUN_CKPT) {
    const en = uiEnter(st - 0.05, 0.3);
    ctx.globalAlpha = en.a;
    const rmode = (MODES.find(m => m.key === RUN_CKPT.mode) || MODES[0]).label;
    uiButton({ ...L.resume, y: L.resume.y + en.dy }, '▶  CONTINUE YOUR JOURNEY', { primary: true, accent: UI.player,
      sub: genFor(RUN_CKPT.lvl).name + '  ·  WAVE ' + RUN_CKPT.lvl + '  ·  ' + rmode });
    ctx.globalAlpha = 1;
  }
  // ---- THE THREE DOORS ----
  for (let i = 0; i < MODES.length; i++) {
    drawHomeGameCard(MODES[i], i, L, !L.resume && i === activeIndex, uiEnter(st - 0.06 - i * 0.06, 0.32));
  }
  // the daily chip rides the Breaker card's diorama (it IS a Breaker run)
  {
    const d = L.daily, best = dailyBest(), hovD = !IS_TOUCH && inRect(mouseX, lastMouseY, d);
    ctx.globalAlpha = uiEnter(st - 0.2, 0.3).a;
    ctx.font = '800 9.5px Orbitron, sans-serif';
    let txt = best ? '★ DAILY · BEST ' + best : '★ DAILY CHALLENGE';
    if (ctx.measureText(txt).width + 20 > d.w) txt = best ? '★ BEST ' + best : '★ DAILY';
    uiChip(d.x + 2, d.y + Math.min(d.h / 2, 17), txt, { h: 24, size: 9.5, color: UI.gold,
      fill: hovD ? 'rgba(40,32,8,0.94)' : 'rgba(6,9,22,0.86)' });
    ctx.globalAlpha = 1;
  }
  // desktop: one calm journey line under the cards
  if (L.progress) {
    const p = L.progress, next = nextDexReward(), lvl = RUN_CKPT ? RUN_CKPT.lvl : 1;
    uiPanel(p.x, p.y, p.w, p.h, { soft: true, r: 12 });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 9.5px Orbitron, sans-serif'; ctx.fillStyle = UI.mute;
    ctx.fillText('JOURNEY', p.x + 18, p.y + p.h / 2);
    ctx.font = bodyFont(12, 600); ctx.fillStyle = UI.ink;
    ctx.fillText(genFor(lvl).name + '  ·  WAVE ' + lvl + ' OF 27', p.x + 96, p.y + p.h / 2, p.w * 0.26);
    const rx = p.x + Math.min(380, p.w * 0.36);
    ctx.font = '800 9.5px Orbitron, sans-serif'; ctx.fillStyle = UI.mute;
    ctx.fillText('RESEARCH  ' + DEX.size + '/' + dexTotal(), rx, p.y + p.h / 2);
    ctx.font = bodyFont(12, 600); ctx.fillStyle = UI.ink;
    ctx.fillText(next ? next.name + '  ·  ' + Math.max(0, next.at - DEX.size) + ' TO GO' : 'ALL REWARDS UNLOCKED', rx + 150, p.y + p.h / 2, p.w * 0.28);
    if (p.w > 900) {
      const routeX = p.x + p.w - 250, routeY = p.y + p.h / 2;
      ctx.strokeStyle = UI.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(routeX, routeY); ctx.lineTo(routeX + 218, routeY); ctx.stroke();
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i <= regionIdx(lvl) ? SKIN.gens[i].accent : '#263248';
        ctx.beginPath(); ctx.arc(routeX + i * 27.25, routeY, i === regionIdx(lvl) ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.textAlign = 'center';
  if (advOpen) drawAdvanced();
  if (trialOpen) drawTrial();
}
function drawMenu() {
  warmSetupArt(); // roster art decodes while the player reads the title
  if (menuPage === 'setup') { drawSetup(); return; }
  drawMenuRedesign();
  return;
  const L = menuLayout();
  drawMenuAdventureBackdrop(L);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.shadowColor = 'rgba(6,38,55,0.7)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  title(GAME_TITLE, L.titleY, L.titleSize, '#fff2a8'); ctx.restore();
  // the SKIN is an edition stamp under the brand — the active skin
  // (js/skin.js) re-themes it without touching the game's name
  {
    // short viewports have no room for pill + tagline — the pill takes the
    // tagline's slot and the tagline is skipped below
    const py = L.short ? L.tagY : L.titleY + L.titleSize * 1.05;
    ctx.font = `700 ${Math.max(9, L.titleSize * 0.24)}px Orbitron, sans-serif`;
    const tw = ctx.measureText('◓ ' + SKIN.edition).width + 26;
    const th = Math.max(16, L.titleSize * 0.44);
    roundRect(W / 2 - tw / 2, py - th / 2, tw, th, th / 2);
    ctx.fillStyle = 'rgba(9,61,75,0.68)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,242,168,0.7)'; ctx.stroke();
    ctx.fillStyle = '#fff2a8';
    ctx.fillText('◓ ' + SKIN.edition, W / 2, py + 0.5);
  }
  const maxW = W * 0.92;
  // Lead with the actual verbs. The first screen should explain the three
  // different games before asking the player to recognise their names.
  if (!L.short) fitText(W < 560 ? 'FLY · BOUNCE · BLAST'
    : 'THREE DIFFERENT GAMES · FLY, BOUNCE, OR BLAST',
    L.tagY, 12 * Math.max(0.85, L.s), '700', '#f7ffff', maxW, "Verdana, system-ui, sans-serif");
  {
    const q = L.quick, hovQ = inRect(mouseX, lastMouseY, q);
    ctx.save();
    ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = hovQ ? 26 : 14;
    roundRect(q.x, q.y, q.w, q.h, 12);
    const qg = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
    qg.addColorStop(0, hovQ ? '#fff4a8' : '#ffe27a');
    qg.addColorStop(1, hovQ ? '#ffbd45' : '#f3a93c');
    ctx.fillStyle = qg; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#173c3b';
    ctx.font = `900 ${L.short ? 11 : 14}px Orbitron, sans-serif`;
    ctx.fillText('▶ START STARFIGHTER', q.x + q.w / 2, q.y + q.h * (L.short ? 0.5 : 0.38));
    if (!L.short) {
      ctx.font = bodyFont(9.5, 700);
      ctx.fillStyle = '#315540';
      ctx.fillText(SKIN.strings.quickHint, q.x + q.w / 2, q.y + q.h * 0.72, q.w - 18);
    }
    ctx.restore();
  }
  {
    const d = L.daily, hovD = inRect(mouseX, lastMouseY, d);
    const best = dailyBest(), streak = dailyStreak();
    ctx.save();
    ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = hovD ? 20 : 8;
    roundRect(d.x, d.y, d.w, d.h, 12);
    ctx.fillStyle = hovD ? 'rgba(8,69,92,0.92)' : 'rgba(8,58,80,0.8)'; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = `900 ${L.short ? 10 : 12}px Orbitron, sans-serif`; ctx.fillStyle = '#f4fdff';
    ctx.fillText('★ DAILY BREAKER · ' + dailyShortDate(), d.x + d.w / 2, d.y + d.h * (L.short ? 0.5 : 0.36), d.w - 10);
    if (!L.short) {
      ctx.font = bodyFont(9.5, 700); ctx.fillStyle = '#80d8ff';
      ctx.fillText(best ? '✓ DONE · BEST ' + best + (streak ? ' · STREAK ' + streak : '')
        : 'NEW TODAY' + (streak ? ' · STREAK ' + streak : '') + ' · RESETS TOMORROW',
        d.x + d.w / 2, d.y + d.h * 0.72, d.w - 12);
    }
    ctx.restore();
  }
  // STARFIGHTER owns the large feature slot; the two alternate arcade modes
  // share the compact rail. Every card still demonstrates its mechanic.
  const hoverMode = MODES.findIndex((m, i) => inRect(mouseX, lastMouseY, L.card(i)));
  const focusMode = SETTINGS.reduceFlash ? -1 : hoverMode >= 0 ? hoverMode : 0;
  for (let i = 0; i < MODES.length; i++) drawModeCard(MODES[i], L.card(i), L, focusMode === i);
  // CONTINUE — a saved journey resumes right where its region began
  if (L.resume && typeof RUN_CKPT !== 'undefined' && RUN_CKPT) {
    const rb = L.resume, hovR = inRect(mouseX, lastMouseY, rb);
    const modeLabel = (MODES.find(m => m.key === RUN_CKPT.mode) || MODES[0]).label;
    ctx.save();
    ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = hovR ? 24 : 12;
    roundRect(rb.x, rb.y, rb.w, rb.h, 12);
    ctx.fillStyle = hovR ? 'rgba(128,216,255,0.28)' : 'rgba(128,216,255,0.16)';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#80d8ff'; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${L.short ? 12 : 15}px Orbitron, sans-serif`;
    ctx.fillStyle = '#e0f7ff';
    ctx.fillText('▶ CONTINUE', rb.x + rb.w / 2, rb.y + rb.h * (L.short ? 0.5 : 0.36));
    if (!L.short) {
      ctx.font = bodyFont(9.5, 600);
      ctx.fillStyle = '#80d8ff';
      ctx.fillText(genFor(RUN_CKPT.lvl).name + ' · WAVE ' + RUN_CKPT.lvl + ' · ' + modeLabel + ' · ' + RUN_CKPT.score + ' PTS',
        rb.x + rb.w / 2, rb.y + rb.h * 0.72, rb.w - 20);
    }
    ctx.restore();
  }
  // Persistent dashboard strip: the next meaningful goal is visible before
  // the player commits to a mode. It turns the title screen into a return hub.
  {
    const p = L.progress, next = nextDexReward(), best = dailyBest(), streak = dailyStreak();
    const journeyLevel = RUN_CKPT ? RUN_CKPT.lvl : 1;
    const journey = (RUN_CKPT ? 'CONTINUE ' : '') + genFor(journeyLevel).name + ' · WAVE ' + journeyLevel + '/27';
    const research = next ? next.name + ' · ' + Math.max(0, next.at - DEX.size) + ' TO GO' : 'ALL REWARDS UNLOCKED';
    const daily = best ? 'DONE · BEST ' + best + (streak ? ' · ×' + streak : '') : 'READY' + (streak ? ' · ×' + streak : '');
    const cells = [
      { icon: 'swift', label: 'JOURNEY', value: journey, color: '#80d8ff' },
      { icon: next ? next.icon : 'star', label: 'RESEARCH · ' + DEX.size + '/' + dexTotal(), value: research, color: next ? next.color : '#ffd54f' },
      { icon: 'star', label: 'DAILY · ' + dailyShortDate(), value: daily, color: '#b39ddb' },
    ];
    roundRect(p.x, p.y, p.w, p.h, 12);
    ctx.fillStyle = 'rgba(8,48,65,0.84)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
    const cw = p.w / cells.length;
    cells.forEach((cell, i) => {
      const cx = p.x + cw * (i + 0.5);
      if (i) {
        ctx.strokeStyle = 'rgba(255,255,255,0.11)';
        ctx.beginPath(); ctx.moveTo(p.x + cw * i, p.y + 6); ctx.lineTo(p.x + cw * i, p.y + p.h - 6); ctx.stroke();
      }
      if (L.short) {
        ctx.font = '800 7.5px Orbitron, sans-serif'; ctx.fillStyle = cell.color;
        ctx.fillText(cell.label + ' · ' + cell.value, cx, p.y + p.h / 2 + 0.5, cw - 10);
      } else {
        drawGlyph(ctx, cell.icon, cx - Math.min(46, cw * 0.31), p.y + 13, 5, cell.color);
        ctx.font = '800 8px Orbitron, sans-serif'; ctx.fillStyle = cell.color;
        ctx.fillText(cell.label, cx + 4, p.y + 13, cw - 22);
        ctx.font = bodyFont(10, 700); ctx.fillStyle = '#dce6f1';
        ctx.fillText(cell.value, cx, p.y + 30, cw - 12);
      }
    });
  }
  // footer: pokédex + settings — trial now lives with each game's setup page
  const db = dexBtnGeom();
  ctx.textAlign = 'center';
  const rowFont = `700 ${L.short ? 11 : 12}px Orbitron, sans-serif`;
  for (const [g, label, colBase] of [
    [db, SKIN.strings.dexChar + ' ' + SKIN.strings.dexName + ' ' + DEX.size + '/' + dexTotal(), '#90a4ae'],
    [L.adv, '⚙ SETTINGS', '#78909c'],
  ]) {
    const hov = inRect(mouseX, lastMouseY, g);
    roundRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6, Math.max(8, (g.h - 6) / 2));
    ctx.fillStyle = hov ? 'rgba(10,63,78,0.88)' : 'rgba(9,51,65,0.7)'; ctx.fill();
    ctx.strokeStyle = hov ? '#fff2a8' : 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = rowFont;
    ctx.fillStyle = hov ? '#fff2a8' : mixHex(colBase, '#ffffff', 0.58);
    ctx.fillText(label, g.x + g.w / 2, g.y + g.h / 2, g.w - 6);
  }
  if (advOpen) drawAdvanced();
  if (trialOpen) drawTrial();
}
// A mode card is a playable idea, not a mascot poster. BREAKER and BLASTER
// keep recognizable arcade mascots; STARFIGHTER builds a custom flight rig
// around one of the actual partner choices so the first glance says
// "I pilot a Pokémon and dodge while shooting." Menu-only gradients are fine
// here (never copy these allocations into a combat hot loop).
const MODE_MASCOTS = { classic: 74, blaster: 9 };
const MENU_PILOT_ROTATION = [25, 4, 7, 1, 137];
function menuStarfighterPilot(t) {
  const chosen = SKIN.starterMon[SETTINGS.starter];
  if (chosen) return { id: chosen.ids[0], name: chosen.names[0].toUpperCase(), chosen: true };
  const i = SETTINGS.reduceFlash ? 0 : Math.floor(t / 3.6) % MENU_PILOT_ROTATION.length;
  const id = MENU_PILOT_ROTATION[i];
  return { id, name: (SKIN.names[id] || 'POKÉMON').toUpperCase(), chosen: false };
}
function drawMenuStarfighterRig(cx, cy, size, t, accent, hov) {
  const pilot = menuStarfighterPilot(t);
  const bank = Math.cos(t * 0.72) * 0.11;
  const thrust = 0.72 + 0.28 * Math.sin(t * 14);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(bank);
  // Shield/flight halo: establishes a compact, player-owned craft silhouette.
  ctx.strokeStyle = accent + (hov ? 'cc' : '88'); ctx.lineWidth = Math.max(1.5, size * 0.012);
  ctx.shadowColor = accent; ctx.shadowBlur = hov ? 18 : 9;
  ctx.beginPath(); ctx.ellipse(0, 0, size * 0.5, size * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  // Twin wings and engine pods surround, never cover, the Pokémon sprite.
  const wing = side => {
    ctx.beginPath();
    ctx.moveTo(side * size * 0.11, -size * 0.06);
    ctx.lineTo(side * size * 0.53, size * 0.07);
    ctx.lineTo(side * size * 0.27, size * 0.2);
    ctx.lineTo(side * size * 0.08, size * 0.13);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, -size * 0.1, side * size * 0.5, size * 0.18);
    wg.addColorStop(0, '#f4e6ff'); wg.addColorStop(0.18, accent); wg.addColorStop(1, '#291342');
    ctx.fillStyle = wg; ctx.fill(); ctx.strokeStyle = '#f3e5f5aa'; ctx.lineWidth = 1; ctx.stroke();
    roundRect(side * size * 0.34 - size * 0.055, size * 0.06, size * 0.11, size * 0.19, size * 0.04);
    ctx.fillStyle = '#0b1122'; ctx.fill(); ctx.strokeStyle = accent; ctx.stroke();
    const eg = ctx.createLinearGradient(0, size * 0.18, 0, size * (0.45 + thrust * 0.08));
    eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.28, '#80d8ff'); eg.addColorStop(1, accent + '00');
    ctx.fillStyle = eg; ctx.beginPath();
    ctx.moveTo(side * size * 0.31, size * 0.2); ctx.lineTo(side * size * 0.37, size * (0.48 + thrust * 0.08));
    ctx.lineTo(side * size * 0.43, size * 0.2); ctx.closePath(); ctx.fill();
  };
  wing(-1); wing(1);
  // Central engine makes the direction of travel unambiguous.
  const cg = ctx.createLinearGradient(0, size * 0.17, 0, size * (0.57 + thrust * 0.08));
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.25, '#d1c4e9'); cg.addColorStop(1, accent + '00');
  ctx.fillStyle = cg; ctx.beginPath();
  ctx.moveTo(-size * 0.055, size * 0.18); ctx.lineTo(0, size * (0.58 + thrust * 0.08));
  ctx.lineTo(size * 0.055, size * 0.18); ctx.closePath(); ctx.fill();
  const img = affinityVesselImage(pilot.id), ps = size * 0.64;
  if (img && img.complete && img.naturalWidth) { // null-safe: a cold cache may not have baked this id yet
    const sil = getSilhouette(pilot.id, '#02040b');
    if (sil) { ctx.globalAlpha = 0.55; ctx.drawImage(sil, -ps / 2 + 4, -ps / 2 + 7, ps, ps); ctx.globalAlpha = 1; }
    drawAffinityVessel(pilot.id, 0, 0, ps);
  } else drawGlyph(ctx, 'star', 0, 0, ps * 0.22, '#ffffff');
  // Cockpit reticle says this character is the controlled player avatar.
  ctx.strokeStyle = '#ffffffbb'; ctx.lineWidth = Math.max(1, size * 0.009);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.2, -0.35, Math.PI + 0.35); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * size * 0.21, 0); ctx.lineTo(side * size * 0.29, 0); ctx.stroke();
  }
  ctx.restore();
  return pilot;
}
function drawModeCard(m, cg, L, active = false) {
  const hov = inRect(mouseX, lastMouseY, cg);
  const junk = m.key === 'junkie';
  const lift = hov ? 4 : active ? 1.5 : 0;
  const stillT = m.key === 'classic' ? 0.45 : m.key === 'blaster' ? 1.35 : 2.2;
  const x = cg.x, y = cg.y - lift, w = cg.w, h = cg.h, t = active ? G.time : stillT;
  ctx.save();
  // extrusion: a dark slab under the face makes the panel sit UP off the page
  roundRect(x + 5, y + 8 + lift, w, h, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fill();
  roundRect(x, y, w, h, 18);
  ctx.save();
  ctx.clip();
  // sky — each game is its own world
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (junk) { g.addColorStop(0, '#263e8f'); g.addColorStop(0.53, '#6d56ae'); g.addColorStop(1, '#d08287'); }
  else if (m.key === 'blaster') { g.addColorStop(0, '#0c5470'); g.addColorStop(0.55, '#168a92'); g.addColorStop(1, '#55b99e'); }
  else { g.addColorStop(0, '#3678a8'); g.addColorStop(0.55, '#4f9e89'); g.addColorStop(1, '#83bd68'); }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // A flight tunnel for STARFIGHTER; a grounded arcade floor for the two wall
  // games. Sharing one floor was pretty but made the flying game read like a
  // mascot standing in another brick-breaker arena.
  const horizon = y + h * 0.68, vpx = x + w / 2;
  ctx.strokeStyle = junk ? 'rgba(236,207,255,0.42)'
    : m.key === 'blaster' ? 'rgba(77,208,225,0.3)' : 'rgba(102,187,106,0.32)';
  ctx.lineWidth = 1;
  if (junk) {
    const tunnelY = y + h * 0.3;
    for (let i = -7; i <= 7; i++) {
      ctx.globalAlpha = 0.25 + 0.3 * (1 - Math.abs(i) / 8);
      ctx.beginPath(); ctx.moveTo(vpx + i * w * 0.008, tunnelY);
      ctx.lineTo(vpx + i * w * 0.11, y + h * 0.82); ctx.stroke();
    }
    for (let i = 1; i <= 4; i++) {
      const rr = i / 4;
      ctx.globalAlpha = 0.34 - rr * 0.16;
      ctx.beginPath(); ctx.ellipse(vpx, tunnelY, w * 0.08 + w * 0.48 * rr,
        h * 0.035 + h * 0.39 * rr, 0, 0, Math.PI * 2); ctx.stroke();
    }
  } else {
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(vpx + i * w * 0.022, horizon);
      ctx.lineTo(vpx + i * w * 0.24, y + h);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const tt = i / 4.2, gy = horizon + (y + h - horizon) * tt * tt;
      ctx.globalAlpha = 0.55 - tt * 0.35;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // glowing horizon line
  ctx.strokeStyle = junk ? 'rgba(255,226,180,0.7)'
    : m.key === 'blaster' ? 'rgba(128,222,234,0.5)' : 'rgba(126,224,138,0.5)';
  ctx.lineWidth = 1.6;
  if (junk) {
    ctx.beginPath(); ctx.ellipse(vpx, y + h * 0.3, w * 0.09, h * 0.055, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(x, horizon); ctx.lineTo(x + w, horizon); ctx.stroke();
  }
  const bandH = L.short || h < 165 ? Math.max(40, h * 0.24) : Math.max(52, h * 0.27);
  if (junk) {
    // twinkling starfield + a distant ringed planet
    for (let i = 0; i < 26; i++) {
      const sx2 = x + ((i * 73.7 + 11) % w), sy2 = y + ((i * 41.3 + 7) % (horizon - y - 8));
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = `rgba(255,255,255,${0.12 + tw * 0.3})`;
      ctx.fillRect(sx2, sy2, 2, 2);
    }
    const px2 = x + w * 0.84, py2 = y + h * 0.14, pr = Math.min(w, h) * 0.06;
    ctx.fillStyle = 'rgba(255,190,135,0.82)';
    ctx.beginPath(); ctx.arc(px2, py2, pr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,205,0.72)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px2, py2, pr * 1.7, pr * 0.5, -0.3, 0, Math.PI * 2); ctx.stroke();
  }
  // walled modes share the brick arch the demos play against
  const bw2 = Math.min(52, w * 0.15), bh2 = bw2 * 0.42;
  const arc = [[-1.6, -0.1], [-0.55, -0.32], [0.55, -0.32], [1.6, -0.1]];
  const brickX = i => x + w / 2 + arc[i][0] * bw2 * 1.25;
  const brickY = i => y + h * 0.22 + arc[i][1] * h * 0.26;
  const padY = y + h - bandH - Math.max(10, h * 0.045);
  const brickFlash = new Array(4).fill(0); // set by each demo, drawn below
  let ballDemo = null, boltDemos = [];
  if (m.key === 'classic') {
    // LIVE DEMO — a rally: the ball ping-pongs paddle ↔ wall, cycling
    // through the bricks; the struck brick flashes, the paddle meets it
    const T = 1.05; // seconds per leg (up or down)
    const leg = t / T;
    const pp = 1 - Math.abs((leg % 2) - 1); // 0 at the paddle … 1 at the wall
    const idx = Math.floor(leg / 2) % 4;    // target brick, fixed per rally
    const padX = x + w / 2 + Math.sin(t * 0.6) * w * 0.16;
    const bx = padX + (brickX(idx) - padX) * pp;
    const by = padY - 8 + (brickY(idx) + bh2 + 4 - (padY - 8)) * pp;
    brickFlash[idx] = Math.max(0, 1 - (1 - pp) * 5);
    ballDemo = { bx, by, padX, catchF: Math.max(0, 1 - pp * 5) };
  } else if (m.key === 'blaster') {
    // LIVE DEMO — the charge loop: the turret winds up (ring fills), looses
    // a fat piercing bolt, and sprays quick volleys in between
    const padX = x + w / 2;
    const c = (t % 4.2) / 4.2;
    const charge = Math.min(1, c / 0.55);
    for (let k = 0; k < 3; k++) { // rapid volley fan, three staggered bolts
      const u = (t * 1.5 + k / 3) % 1;
      const spread = (k - 1) * w * 0.11;
      const bx = padX + spread * u, by = padY - 10 + (brickY(1) + bh2 + 6 - (padY - 10)) * u;
      boltDemos.push({ bx, by, big: false, u });
      if (u > 0.86) { // flash the brick nearest where this bolt lands
        let best = 0, bd = 1e9;
        for (let i = 0; i < 4; i++) { const d = Math.abs(brickX(i) - bx); if (d < bd) { bd = d; best = i; } }
        brickFlash[best] = Math.max(brickFlash[best], (u - 0.86) / 0.14);
      }
    }
    if (c >= 0.55 && c < 0.72) { // the charged shot — big, glowing, center lane
      const u = (c - 0.55) / 0.17;
      boltDemos.push({ bx: padX, by: padY - 10 + (brickY(1) + bh2 + 6 - (padY - 10)) * u, big: true, u });
    }
    const impact = Math.max(0, 1 - Math.abs(c - 0.72) * 14); // wall-wide slam
    for (let i = 0; i < 4; i++) brickFlash[i] = Math.max(brickFlash[i], impact);
    ballDemo = { padX, charge: c < 0.55 ? charge : 0 };
  }
  if (m.key !== 'junkie') {
    // the wall, with per-brick hit flashes
    for (let i = 0; i < arc.length; i++) {
      const bx2 = brickX(i) - bw2 / 2, by2 = brickY(i);
      const f = brickFlash[i];
      if (f > 0.02) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 14 * f; }
      roundRect(bx2, by2, bw2, bh2, 4);
      ctx.fillStyle = ['#ef9a9a', '#90caf9', '#ffe082', '#a5d6a7'][i] + (f > 0.3 ? 'ff' : 'cc');
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + f * 0.55})`;
      ctx.fillRect(bx2 + 2, by2 + 2, bw2 - 4, bh2 * 0.3);
    }
  }
  // The wall games retain a large character anchor. STARFIGHTER uses an
  // actual partner inside a purpose-built flight rig and shows both incoming
  // and outgoing fire, turning the diorama into a one-glance control lesson.
  const ms = Math.min(w, h) * (junk ? 0.39 : 0.5);
  const bob = Math.sin(t * (junk ? 1.3 : 2.1) + (junk ? 1 : 0)) * h * 0.016;
  const mx = x + w / 2 + (junk ? Math.sin(t * 0.72) * w * 0.14 : 0);
  const my = y + h * (junk ? 0.49 : 0.44) + bob;
  if (!junk) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(mx, horizon + h * 0.05, Math.max(10, ms * 0.32 - bob * 2.5), ms * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    const img = getSprite(MODE_MASCOTS[m.key]);
    if (img.complete && img.naturalWidth) {
      ctx.save();
      const sil = getSilhouette(MODE_MASCOTS[m.key], '#04060e');
      if (sil) { ctx.globalAlpha = 0.5; ctx.drawImage(sil, mx - ms / 2 + ms * 0.05, my - ms / 2 + ms * 0.07, ms, ms); ctx.globalAlpha = 1; }
      if (hov) {
        const rim = getSilhouette(MODE_MASCOTS[m.key], m.accent);
        if (rim) { ctx.globalAlpha = 0.5; ctx.drawImage(rim, mx - ms / 2 - 2, my - ms / 2 - 2, ms + 4, ms + 4); ctx.globalAlpha = 1; }
      }
      ctx.drawImage(img, mx - ms / 2, my - ms / 2, ms, ms);
      ctx.restore();
    }
  }
  if (junk) {
    const enemyY = y + h * 0.17, enemyIds = [41, 16, 10, 19, 92];
    const erx = Math.min(w * 0.31, 260), es = Math.max(15, Math.min(32, h * 0.075, w * 0.052));
    // A real Pokémon squad occupies the danger end of the flight lane.
    for (let i = 0; i < enemyIds.length; i++) {
      const a = Math.PI + (i / (enemyIds.length - 1)) * Math.PI;
      const ex = vpx + Math.cos(a) * erx, ey = enemyY + Math.sin(a) * h * 0.055 + Math.sin(t * 2 + i) * 2;
      const ei = getSprite(enemyIds[i]);
      ctx.save(); ctx.globalAlpha = 0.72 + 0.18 * Math.sin(t * 1.8 + i);
      if (ei.complete && ei.naturalWidth) ctx.drawImage(ei, ex - es / 2, ey - es / 2, es, es);
      else { ctx.fillStyle = i % 2 ? '#ff8a80' : '#ce93d8'; ctx.beginPath(); ctx.arc(ex, ey, es * 0.22, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // Incoming red fire occupies side lanes; its aim trails the moving pilot,
    // visually explaining why movement is survival.
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.42 + i * 0.34) % 1;
      const side = i === 1 ? 1 : -1;
      const sx3 = vpx + side * erx * (0.42 + i * 0.13);
      const tx3 = mx + side * w * (i === 1 ? -0.08 : 0.12);
      const ex = sx3 + (tx3 - sx3) * u, ey = enemyY + es * 0.5 + (my - enemyY) * u;
      ctx.fillStyle = i === 1 ? '#ffd180' : '#ff8a80'; ctx.shadowColor = '#ff5252'; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(ex, ey, i === 1 ? 4.5 : 2.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (i === 1 && u < 0.34) {
        ctx.globalAlpha = 0.35; ctx.setLineDash([5, 7]); ctx.strokeStyle = '#ff8a80';
        ctx.beginPath(); ctx.moveTo(sx3, enemyY); ctx.lineTo(tx3, my); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    }
    // Twin basic attacks and a periodic wide charged lance travel FROM the
    // player toward the squad. The source/target relationship is unmistakable.
    for (let k = 0; k < 2; k++) {
      const u = (t * 1.15 + k * 0.52) % 1;
      const bx4 = mx + (k ? 7 : -7) * (1 - u), by4 = my - ms * 0.24 + (enemyY - my + ms * 0.24) * u;
      ctx.fillStyle = '#f3e5f5'; ctx.shadowColor = m.accent; ctx.shadowBlur = 10;
      roundRect(bx4 - 2.5, by4 - 9, 5, 18, 2.5); ctx.fill(); ctx.shadowBlur = 0;
      if (u > 0.9) {
        const q = (u - 0.9) / 0.1; ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 1 - q;
        ctx.beginPath(); ctx.arc(bx4, by4, 5 + q * 15, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const chargeCycle = (t % 4.4) / 4.4;
    if (chargeCycle > 0.64 && chargeCycle < 0.84) {
      const u = (chargeCycle - 0.64) / 0.2;
      const cy4 = my - ms * 0.28 + (enemyY - my + ms * 0.28) * u;
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#d780ff'; ctx.shadowBlur = 22;
      roundRect(mx - 6, cy4 - 18, 12, 36, 6); ctx.fill(); ctx.shadowBlur = 0;
    }
    // Dodge chevrons follow the strafe, while the rig itself contains the
    // selected (or rotating example) partner.
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 5); ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      const ax = mx + side * ms * 0.64;
      ctx.beginPath(); ctx.moveTo(ax - side * 8, my - 7); ctx.lineTo(ax, my); ctx.lineTo(ax - side * 8, my + 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const pilot = drawMenuStarfighterRig(mx, my, ms, t, m.accent, hov);
    if (h >= 175) {
      ctx.font = `800 ${Math.max(7.5, Math.min(9, w / 65))}px Orbitron, sans-serif`;
      const pilotText = 'YOU PILOT ' + pilot.name;
      const pw3 = Math.min(w - 26, ctx.measureText(pilotText).width + 18);
      roundRect(mx - pw3 / 2, my + ms * 0.43, pw3, 18, 9);
      ctx.fillStyle = 'rgba(8,10,26,0.82)'; ctx.fill(); ctx.strokeStyle = '#e1bee788'; ctx.stroke();
      ctx.fillStyle = '#f3e5f5'; ctx.textAlign = 'center'; ctx.fillText(pilotText, mx, my + ms * 0.43 + 9.5, pw3 - 8);
    }
  } else if (ballDemo) {
    // the paddle/turret at the bottom of the diorama
    const padW = Math.max(34, w * 0.16), padX2 = ballDemo.padX;
    ctx.shadowColor = m.accent; ctx.shadowBlur = ballDemo.catchF ? 6 + ballDemo.catchF * 12 : 6;
    roundRect(padX2 - padW / 2, padY, padW, Math.max(6, h * 0.03), 5);
    ctx.fillStyle = m.accent; ctx.fill();
    ctx.shadowBlur = 0;
    if (m.key === 'classic') {
      // the ball, with two motion ghosts so the rally reads at a glance
      for (let gi = 2; gi >= 0; gi--) {
        const lag = gi * 0.055;
        // clamp: a negative leg on the very first frames would floor to
        // brick index -1 (arc[-1][0] crashes the first render after load)
        const leg2 = Math.max(0, t / 1.05 - lag);
        const pp2 = 1 - Math.abs((leg2 % 2) - 1);
        const idx2 = Math.floor(leg2 / 2) % 4;
        const px3 = x + w / 2 + Math.sin((t - lag * 1.05) * 0.6) * w * 0.16;
        const bx3 = px3 + (brickX(idx2) - px3) * pp2;
        const by3 = padY - 8 + (brickY(idx2) + bh2 + 4 - (padY - 8)) * pp2;
        ctx.globalAlpha = gi ? 0.18 * (3 - gi) : 1;
        ctx.fillStyle = '#e3f2fd';
        ctx.shadowColor = '#90caf9'; ctx.shadowBlur = gi ? 0 : 10;
        ctx.beginPath(); ctx.arc(bx3, by3, Math.max(3.5, w * 0.014), 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    } else {
      // charge ring winding up on the muzzle — the HOLD TO CHARGE demo
      if (ballDemo.charge > 0.03) {
        ctx.beginPath();
        ctx.arc(padX2, padY - 9, 9, -Math.PI / 2, -Math.PI / 2 + ballDemo.charge * Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = ballDemo.charge >= 1 ? '#e0ffff' : '#4dd0e1';
        ctx.shadowColor = '#4dd0e1'; ctx.shadowBlur = ballDemo.charge >= 1 ? 12 : 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      for (const b of boltDemos) {
        ctx.fillStyle = b.big ? '#e0ffff' : '#80deea';
        ctx.shadowColor = '#4dd0e1'; ctx.shadowBlur = b.big ? 16 : 6;
        roundRect(b.bx - (b.big ? 4 : 2), b.by - (b.big ? 12 : 7), b.big ? 8 : 4, b.big ? 24 : 14, b.big ? 4 : 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
  // glass gloss sweep
  const gl = ctx.createLinearGradient(x, y, x + w * 0.55, y + h * 0.55);
  gl.addColorStop(0, 'rgba(255,255,255,0.1)');
  gl.addColorStop(0.45, 'rgba(255,255,255,0.02)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(x, y, w, h);
  // corner chip — what KIND of game this is, at a glance
  {
    ctx.font = '800 9px Orbitron, sans-serif';
    const showMechanic = w >= 330 && h >= 135;
    ctx.font = '800 7.5px Orbitron, sans-serif';
    const mw = showMechanic ? Math.min(w * 0.36, ctx.measureText(m.mechanic).width + 16) : 0;
    ctx.font = '800 9px Orbitron, sans-serif';
    const dw = Math.min(w - 20 - (showMechanic ? mw + 7 : 0), ctx.measureText(m.desc).width + 16);
    roundRect(x + 10, y + 10, dw, 18, 9);
    ctx.fillStyle = m.accent + '26'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = m.accent + '88'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = m.accent;
    ctx.fillText(m.desc, x + 10 + dw / 2, y + 19.5, dw - 8);
    if (showMechanic) {
      roundRect(x + w - 10 - mw, y + 10, mw, 18, 9);
      ctx.fillStyle = 'rgba(5,9,22,0.74)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
      ctx.font = '800 7.5px Orbitron, sans-serif'; ctx.fillStyle = '#f4f7fb';
      ctx.fillText(m.mechanic, x + w - 10 - mw / 2, y + 19.5, mw - 8);
    }
  }
  // label band along the bottom
  const bg2 = ctx.createLinearGradient(0, y + h - bandH, 0, y + h);
  bg2.addColorStop(0, 'rgba(4,7,16,0)');
  bg2.addColorStop(0.45, 'rgba(4,7,16,0.8)');
  bg2.addColorStop(1, 'rgba(4,7,16,0.94)');
  ctx.fillStyle = bg2;
  ctx.fillRect(x, y + h - bandH, w, bandH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const twoRows = bandH >= 52; // roomy cards explain on two lines
  ctx.font = `900 ${Math.min(24, w / 11)}px Orbitron, sans-serif`;
  ctx.fillStyle = hov ? '#fff' : m.accent;
  ctx.fillText(m.label, x + w / 2, y + h - bandH * (twoRows ? 0.68 : 0.58), w - 20);
  ctx.fillStyle = hov ? '#e3f2fd' : '#90a4ae';
  if (twoRows) {
    ctx.font = bodyFont(Math.max(11, Math.min(12, w / 28)), 650);
    ctx.fillText(m.lines[0], x + w / 2, y + h - bandH * 0.36, w - 24);
    ctx.fillText(m.lines[1], x + w / 2, y + h - bandH * 0.15, w - 24);
  } else {
    const compactCopy = m.key === 'classic' ? 'BOUNCE BALL · MOVE PADDLE'
      : m.key === 'blaster' ? 'NO BALL · SHOOT THE WALL' : 'FLY + DODGE · HOLD TO CHARGE';
    ctx.font = bodyFont(Math.max(11.5, Math.min(12.5, w / 27)), 700);
    ctx.fillText(compactCopy, x + w / 2, y + h - bandH * 0.22, w - 24);
  }
  ctx.restore(); // unclip
  ctx.shadowColor = m.accent; ctx.shadowBlur = hov ? 30 : active ? 20 : 8;
  roundRect(x, y, w, h, 18);
  ctx.lineWidth = hov ? 3 : active ? 2.5 : 1.5;
  ctx.strokeStyle = hov || active ? m.accent : m.accent + '88';
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}
// ---- THE SETUP WIZARD (AFT-029 rebuild): header row + step bar, one HERO
// surface carrying all the reading, a choices column, and ONE bottom bar
// (quiet secondary beside the single primary). setupLayout owns every rect.
const BODY_FAMILY = "Verdana, 'Segoe UI', system-ui, sans-serif";
function drawSetupHeader(L, mode) {
  const step = L.step === 'pilot' ? 1 : 2;
  ctx.textBaseline = 'middle';
  const bb = L.back, iconOnly = bb.w <= 48;
  uiButton(iconOnly ? bb : { ...bb, x: bb.x + 10, w: bb.w - 10 }, iconOnly ? '' : L.step === 'pilot' ? 'MODES' : SKIN.strings.partnerWord + 'S',
    { accent: UI.sub, size: 11 });
  { // a drawn chevron — Orbitron's ‹ glyph reads as a speck at phone size
    const chx = iconOnly ? bb.x + bb.w / 2 + 2 : bb.x + 22, chy = bb.y + bb.h / 2;
    ctx.strokeStyle = UI.ink; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(chx + 4, chy - 7); ctx.lineTo(chx - 3, chy); ctx.lineTo(chx + 4, chy + 7); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  fitLabel(mode.label, W / 2, L.headY, { size: L.headSize, min: 11, weight: 900, color: mode.accent,
    maxW: L.twoCol ? Math.max(80, L.stepBar.x - W / 2) * 2 - 24 : W - 2 * (L.back.x + L.back.w + 8) });
  // the two-segment step bar + its caption
  const sb = L.stepBar, sg = 6, segW = (sb.w - sg) / 2;
  for (let i = 0; i < 2; i++) {
    roundRect(sb.x + i * (segW + sg), sb.y, segW, sb.h, sb.h / 2);
    ctx.fillStyle = i < step ? mode.accent : 'rgba(255,255,255,0.1)'; ctx.fill();
  }
  const cap = 'STEP ' + step + ' OF 2  ·  ' + (step === 1 ? 'CHOOSE YOUR ' + SKIN.strings.partnerWord : 'CHOOSE YOUR CHALLENGE');
  if (L.twoCol) fitLabel(cap, sb.x + sb.w, sb.y - 11, { size: 9.5, min: 8, weight: 800, color: UI.sub, maxW: sb.w + 60, align: 'right' });
  else fitLabel(cap, W / 2, L.sectionY, { size: L.short ? 10 : 11.5, min: 8.5, weight: 800, color: UI.ink, maxW: L.contentW });
}
// a centred row of uiChips that drops trailing items rather than overflow
function uiChipRow(items, x, y, maxW, align) {
  ctx.font = '800 9.5px Orbitron, sans-serif';
  const ws = items.map(it => Math.ceil(ctx.measureText(it.text).width) + 18);
  let n = items.length, tot = () => ws.slice(0, n).reduce((a, b) => a + b, 0) + 6 * (n - 1);
  while (n > 1 && tot() > maxW) n--;
  let cx = align === 'left' ? x : x - Math.min(maxW, tot()) / 2;
  for (let i = 0; i < n; i++) {
    const it = items[i];
    if (ws[i] > maxW) { // a single over-long chip: fall back to a fitted label
      fitLabel(it.text, align === 'left' ? x : x, y, { size: 9.5, min: 8, weight: 800, color: it.color, maxW, align: align || 'center' });
      return;
    }
    uiChip(cx, y, it.text, { h: 22, size: 9.5, color: it.color });
    cx += ws[i] + 6;
  }
}
// the vessel on its pedestal: a baked glow in its colour, a floor ellipse,
// and the hull (NEUTRAL on the vessel step — the oath shows once sworn)
function drawVesselPedestal(id, key, x, y, size, col, neutral) {
  const g = uiGlowDisc(col);
  ctx.globalAlpha = 0.7; ctx.drawImage(g, x - size * 0.7, y - size * 0.62, size * 1.4, size * 1.3); ctx.globalAlpha = 1;
  ctx.strokeStyle = col + '55'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(x, y + size * 0.42, size * 0.36, size * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
  const bob = SETTINGS.reduceFlash ? 0 : Math.sin(G.time * 1.6) * Math.min(3, size * 0.015);
  if (!drawAffinityVessel(id, x, y + bob, size, neutral)) drawGlyph(ctx, key || 'normal', x, y, size * 0.26, col);
}
// what a vessel (or the solo drone) IS — name, chips, effect, form line
function vesselCopy(key) {
  const mon = SKIN.starterMon[key];
  const solo = SETTINGS.mode === 'junkie' ? 'TRAINING DRONE' : 'NO ' + SKIN.strings.partnerWord;
  if (!mon) return { id: 0, mon: null, col: '#90a4ae', name: solo, chips: [{ text: 'NEUTRAL', color: UI.sub }],
    effect: 'No passive ability. A clean, even start.', evo: '' };
  const copy = starterModeCopy(key, SETTINGS.mode, 1), col = TYPE_COLORS[key];
  const disc = mon.discipline && SKIN.disciplines && SKIN.disciplines[mon.discipline];
  const chips = [{ text: lex(copy.ability), color: col }, { text: typeLabel(key) + ' ' + typeWord(), color: UI.sub }];
  if (disc) chips.push({ text: disc.name, color: UI.mute });
  return { id: mon.ids[0], mon, col, name: mon.names[0], chips, effect: lex(copy.tier || copy.blurb || ''),
    evo: mon.names.join('  →  ') + '   ·   ' + SKIN.strings.evolvesIn,
    evoShort: mon.names.join('  →  ') };
}
// the reading surface: vertical (portrait over copy) when the panel is
// tall, side-by-side when it is wide. `opts.reserveB` leaves room at the
// bottom for a button; `opts.effect`/`opts.evo` toggle copy rows.
function drawVesselHero(R, key, opts) {
  const V = vesselCopy(key), pad = 16;
  uiPanel(R.x, R.y, R.w, R.h, { accent: V.col, bar: 'top' });
  const vertical = opts.vertical != null ? opts.vertical : R.h >= R.w * 0.62 && R.h >= 210;
  const resB = opts.reserveB || 0;
  ctx.textBaseline = 'middle';
  if (vertical) {
    const nameS = R.w < 300 ? 17 : 20;
    const textH = nameS + 14 + 28 + (opts.effect ? 34 : 0) + (opts.evo ? 18 : 0) + resB;
    const ps = Math.max(56, Math.min(R.h - textH - 34, R.w * 0.64, 320));
    // portrait + copy travel as ONE group, centred — no gulf between them
    const top0 = R.y + Math.max(14, (R.h - (ps + 20 + textH)) / 2);
    const pcy = top0 + ps / 2;
    drawVesselPedestal(V.id, key, R.x + R.w / 2, pcy, ps, V.col, opts.neutral);
    let y = top0 + ps + 20 + nameS * 0.5 - 4;
    fitLabel(V.name, R.x + R.w / 2, y, { size: nameS, min: 11, weight: 900, color: UI.ink, maxW: R.w - pad * 2 });
    y += nameS * 0.5 + 18;
    uiChipRow(V.chips, R.x + R.w / 2, y, R.w - pad * 2);
    y += 24;
    if (opts.effect) {
      fitLabelWrap(V.effect, R.x + R.w / 2, y, { size: 11.5, min: 10, weight: 500, family: BODY_FAMILY, color: UI.sub, maxW: R.w - pad * 2, maxLines: 2 });
      y += 32;
    }
    if (opts.evo && V.evo) {
      // the form line never ellipsizes: if the full sentence cannot fit at
      // the floor size, the three form names stand alone
      ctx.font = `500 8px ${BODY_FAMILY}`;
      const evoT = V.evoShort && ctx.measureText(V.evo).width > R.w - pad * 2 ? V.evoShort : V.evo;
      fitLabel(evoT, R.x + R.w / 2, y, { size: 9.5, min: 8, weight: 500, family: BODY_FAMILY, color: UI.mute, maxW: R.w - pad * 2 });
    }
  } else {
    const ps = Math.max(44, Math.min(R.h - 20, R.w * 0.4, 230));
    const px = R.x + pad + ps / 2, pcy = R.y + R.h / 2 + 2;
    drawVesselPedestal(V.id, key, px, pcy, ps * 0.92, V.col, opts.neutral);
    const tx = R.x + pad + ps + 14, tw = R.x + R.w - pad - tx - (opts.reserveR || 0);
    const small = R.h < 110;
    const nameS = small ? 14 : R.w < 380 ? 17 : 20;
    const rows = 2 + (opts.effect && !small ? 1 : 0) + (opts.evo && !small && R.h - resB >= 150 ? 1 : 0);
    const blockH = nameS + 24 + (rows > 2 ? 36 : 0) + (rows > 3 ? 18 : 0);
    let y = R.y + Math.max(16, (R.h - resB - blockH) / 2) + nameS * 0.5;
    fitLabel(V.name, tx, y, { size: nameS, min: 10, weight: 900, color: UI.ink, maxW: tw, align: 'left' });
    y += nameS * 0.5 + 16;
    uiChipRow(V.chips, tx, y, tw, 'left');
    y += 22;
    if (rows > 2) {
      const ml = tw < 200 && R.h - resB >= 150 ? 3 : 2;
      const wr = fitLabelWrap(V.effect, tx, y, { size: 11, min: 9.5, weight: 500, family: BODY_FAMILY, color: UI.sub, maxW: tw, align: 'left', maxLines: ml });
      y += Math.max(34, wr.n * wr.lineH + 8);
    }
    if (rows > 3 && V.evo) fitLabel(V.evo, tx, y, { size: 9.5, min: 8, weight: 500, family: BODY_FAMILY, color: UI.mute, maxW: tw, align: 'left' });
  }
  ctx.textAlign = 'center';
}
function drawSetupTile(r, key, label, sel, hov, compact) {
  const col = TYPE_COLORS[key], mon = SKIN.starterMon[key];
  uiPanel(r.x, r.y, r.w, r.h, { r: Math.min(12, r.h * 0.18), accent: sel ? col : null, sel, lift: sel || hov, soft: !sel && !hov,
    fill: sel ? mixHex(col, '#070b1e', 0.82) : undefined, bar: sel ? 'top' : null });
  const nameH = compact ? 12 : 15;
  const sp = Math.min(r.h - nameH - 8, r.w - 8);
  if (!mon || !drawAffinityVessel(mon.ids[0], r.x + r.w / 2, r.y + 4 + sp / 2, sp, true)) drawGlyph(ctx, key, r.x + r.w / 2, r.y + 4 + sp / 2, sp * 0.3, col);
  if (key === 'electric' && r.w > 50) { // the one legend tag we keep
    roundRect(r.x + r.w - 19, r.y + 6, 15, 9, 3); ctx.fillStyle = UI.gold; ctx.fill();
    ctx.font = '900 5.5px Orbitron, sans-serif'; ctx.fillStyle = '#181100'; ctx.textAlign = 'center';
    ctx.fillText('OP', r.x + r.w - 11.5, r.y + 10.8);
  }
  fitLabel(label, r.x + r.w / 2, r.y + r.h - nameH / 2 - 3, { maxW: r.w - 6, min: 8, size: compact ? 8 : 8.5, weight: 800,
    color: sel ? UI.ink : hov ? UI.ink : UI.sub });
}
function drawPilotSetup(L, mode) {
  drawVesselHero(L.hero, SETTINGS.starter, { neutral: true, effect: true, evo: true });
  const roster = skinStarters();
  if (L.simple) {
    // AFT-023 FIRST-SESSION VIEW: four readable archetypes + BROWSE ALL
    for (let i = 0; i < PILOT_ARCHETYPES.length; i++) {
      const A = PILOT_ARCHETYPES[i], r = L.arch(i), st = roster.find(x => x.key === A.key);
      const mon = SKIN.starterMon[A.key], col = TYPE_COLORS[A.key];
      const sel = SETTINGS.starter === A.key, hov = !IS_TOUCH && inRect(mouseX, lastMouseY, r);
      uiPanel(r.x, r.y, r.w, r.h, { accent: sel ? col : null, sel, lift: sel || hov, soft: !sel && !hov,
        fill: sel ? mixHex(col, '#070b1e', 0.84) : undefined, bar: sel ? 'left' : null });
      const sp = Math.max(28, Math.min(r.h - 14, r.w * (r.w < 170 ? 0.27 : 0.36), 132));
      if (!drawAffinityVessel(mon.ids[0], r.x + 10 + sp / 2, r.y + r.h / 2, sp, true)) drawGlyph(ctx, A.key, r.x + 10 + sp / 2, r.y + r.h / 2, sp * 0.3, col);
      const tx = r.x + sp + (r.w < 170 ? 14 : 20), tw = r.x + r.w - tx - 8;
      const rec = A.recommended && r.h >= 58;
      const big = r.h >= 90 && r.w >= 220;
      const cy = r.y + r.h / 2 + (rec ? 6 : 0);
      fitLabel(st ? st.label : A.key, tx, cy - (big ? 11 : 8), { maxW: tw, align: 'left', min: 8, size: big ? 15 : 12, weight: 900, color: UI.ink });
      fitLabel(A.tag, tx, cy + (big ? 11 : 9), { maxW: tw, align: 'left', min: 7.5, size: big ? 10.5 : 9, weight: 700, color: sel ? col : UI.sub });
      if (rec) uiChip(tx, cy - (big ? 34 : 27), 'RECOMMENDED', { h: 16, size: 7.5, pad: 7, color: UI.good });
    }
    uiButton(L.browse, 'BROWSE ALL 18 ' + SKIN.strings.partnerWord + 'S   ›', { accent: UI.sub, size: 11 });
  } else {
    // THE FULL CATALOG: three labelled shelves of six identity tiles
    const groups = SKIN.rosterGroups || [];
    for (let g = 0; g < 3; g++) {
      const sh = L.shelf(g), grp = groups[g];
      if (!grp || sh.h < 8) continue;
      const lb = fitLabel(grp.n, sh.x + 2, sh.y + sh.h / 2 - 1, { size: L.short ? 8.5 : 10, min: 7.5, weight: 800,
        color: grp.color || UI.sub, maxW: sh.w * 0.8, align: 'left' });
      ctx.strokeStyle = (grp.color || '#8494ac') + '33'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lb.x1 + 10, sh.y + sh.h / 2 - 1); ctx.lineTo(sh.x + sh.w, sh.y + sh.h / 2 - 1); ctx.stroke();
    }
    for (let i = 0; i < roster.length; i++) {
      const st = roster[i], pg = L.starter(i);
      drawSetupTile(pg, st.key, st.label, SETTINGS.starter === st.key, !IS_TOUCH && inRect(mouseX, lastMouseY, pg), pg.h < 56);
    }
  }
  // the bottom bar: the quiet solo opt-out beside the ONE primary
  {
    const r = L.none, sel = SETTINGS.starter === 'none';
    const junk = SETTINGS.mode === 'junkie';
    uiButton(r, junk ? 'FLY SOLO' : 'NO ' + SKIN.strings.partnerWord, { accent: sel ? UI.ink : UI.sub, size: 11,
      sub: r.h >= 46 ? (junk ? 'TRAINING DRONE' : 'NEUTRAL START') : null });
    if (sel) { roundRect(r.x, r.y, r.w, r.h, 12); ctx.lineWidth = 1.8; ctx.strokeStyle = UI.ink; ctx.stroke(); }
  }
  uiButton(L.next, 'CONTINUE   ›', { primary: true, accent: mode.accent, size: 15, sub: L.next.h >= 46 ? 'NEXT · CHOOSE CHALLENGE' : null });
}
function drawDifficultySetup(L, mode) {
  // the recap: the vessel you're taking, big, with a quiet CHANGE
  const S = L.summary;
  drawVesselHero(S, SETTINGS.starter, { neutral: false, effect: !L.short && S.h >= 150, evo: false, vertical: L.vertical,
    reserveB: L.vertical ? L.editPilot.h + 14 : L.showcase ? L.editPilot.h + 8 : 0, reserveR: L.showcase ? 0 : L.editPilot.w + 12 });
  uiButton(L.editPilot, L.narrow ? 'CHANGE' : 'CHANGE ' + SKIN.strings.partnerWord, { accent: UI.sub, size: 10.5 });
  // AFFINITY (skins with SKIN.affinities): the LIGHT/DARK oath is a
  // ceremonial pick — two mirrored cards that breathe until a side is
  // chosen (the launch is gated on it), plus the quiet UNSWORN third way.
  if (L.affinity) {
    const affs = ['light', 'dark'];
    const unchosen = !SETTINGS.affinity;
    const beckon = unchosen && !SETTINGS.reduceFlash ? 0.5 + 0.5 * Math.sin(G.time * 2.6) : 0;
    for (let i = 0; i < 2; i++) {
      const A = AFFINITIES[affs[i]], r = L.affinity(i);
      const sel = SETTINGS.affinity === affs[i], hovA = !IS_TOUCH && inRect(mouseX, lastMouseY, r);
      const flash = G.affinityFx && (G.affinityFx.key === affs[i] || G.affinityFx.key === 'both') && G.time < G.affinityFx.until;
      uiPanel(r.x, r.y, r.w, r.h, { accent: A.color, sel: sel || flash, lift: sel || hovA, bar: sel ? 'top' : null,
        fill: sel ? mixHex(A.color, '#070b1e', 0.84) : undefined });
      if (unchosen && beckon > 0) { // the unsworn cards breathe — a hairline, never a halo
        ctx.globalAlpha = 0.25 + beckon * 0.45; ctx.lineWidth = 1.4; ctx.strokeStyle = A.color;
        roundRect(r.x, r.y, r.w, r.h, UI.r); ctx.stroke(); ctx.globalAlpha = 1;
      }
      const glyph = affs[i] === 'light' ? '☀' : '☾';
      const tall = r.h >= 66;
      fitLabel((sel ? '◆ ' : '') + glyph + ' ' + A.name, r.x + r.w / 2, r.y + (tall ? 18 : r.h * 0.36), { size: L.short ? 12 : 14,
        min: 9, weight: 900, color: sel ? UI.ink : A.color, maxW: r.w - 14 });
      fitLabel(lex(A.tag), r.x + r.w / 2, r.y + (tall ? 36 : r.h * 0.7), { size: 8.5, min: 7, weight: 800, color: sel ? A.color : UI.sub, maxW: r.w - 12 });
      if (tall) fitLabelWrap(lex(A.desc), r.x + r.w / 2, r.y + 52, { size: 8.5, min: 8, weight: 500, family: BODY_FAMILY,
        color: UI.mute, maxW: r.w - 14, maxLines: Math.max(1, Math.min(3, Math.floor((r.h - 46) / 11))) });
      if (flash) { // the moment of commitment gets a visible ring
        const p = 1 - (G.affinityFx.until - G.time) / 0.9;
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.strokeStyle = A.color; ctx.lineWidth = 3 - 2 * p;
        roundRect(r.x - 8 * p, r.y - 8 * p, r.w + 16 * p, r.h + 16 * p, 16); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (L.affNone) {
      const r = L.affNone, selN = SETTINGS.affinity === 'none';
      uiPanel(r.x, r.y, r.w, r.h, { soft: !selN, lift: selN, sel: selN, accent: selN ? '#cfd8dc' : null });
      fitLabel((selN ? '◆ ' : '') + 'UNSWORN', r.x + r.w / 2, r.y + r.h / 2 - (r.h >= 50 ? 7 : 0), { size: 10, min: 7.5, weight: 900,
        color: selN ? UI.ink : UI.sub, maxW: r.w - 10 });
      if (r.h >= 50) fitLabel('SWEAR LATER', r.x + r.w / 2, r.y + r.h / 2 + 9, { size: 8, min: 7, weight: 700, color: UI.mute, maxW: r.w - 10 });
    }
  }
  fitLabel('DIFFICULTY', L.chipsLabelX, L.chipsLabelY, { size: 10, min: 8, weight: 800, color: UI.mute, maxW: 200, align: 'left' });
  const keys = Object.keys(PRESETS);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i], pd = PRESETS[key], c2 = DIFFICULTY_UI[key], pg = L.chip(i);
    const sel = SETTINGS.preset === key, hov = !IS_TOUCH && inRect(mouseX, lastMouseY, pg);
    uiPanel(pg.x, pg.y, pg.w, pg.h, { accent: sel ? mode.accent : null, sel, lift: sel || hov, soft: !sel && !hov,
      bar: sel ? 'top' : null, fill: sel ? mixHex(mode.accent, '#070b1e', 0.86) : undefined });
    const tall = pg.h >= 74;
    const cx = pg.x + pg.w / 2;
    const ny = pg.y + (tall ? pg.h * 0.28 + (pg.w < 240 ? 6 : 0) : pg.h * 0.36);
    fitLabel(c2.name, cx, ny, { size: L.short ? 12 : 15, min: 9, weight: 900, color: sel ? UI.ink : '#d6deea', maxW: pg.w - 14 });
    // HP as pips — the same segmented language as the combat HP readout
    const n = pd.lives, pw = Math.min(12, (pg.w - 40) / Math.max(5, n) - 3), py = ny + (tall ? 18 : 15);
    const rowW = n * pw + (n - 1) * 3;
    ctx.fillStyle = sel ? cbSafeColor('hpGood') : 'rgba(126,224,160,0.55)';
    for (let k = 0; k < n; k++) { roundRect(cx - rowW / 2 - 26 + k * (pw + 3), py - 2.5, pw, 5, 2.5); ctx.fill(); }
    fitLabel(n + ' HP', cx - rowW / 2 - 20 + rowW + 6, py + 0.5, { size: 9, min: 8, weight: 800, color: UI.sub, maxW: 44, align: 'left' });
    if (tall) {
      fitLabel(c2.tone, cx, py + 17, { size: 9, min: 7.5, weight: 800, color: sel ? mode.accent : UI.sub, maxW: pg.w - 14 });
      if (pg.h >= 88) fitLabel(c2.desc, cx, py + 32, { size: 9, min: 7.5, weight: 500, family: BODY_FAMILY, color: UI.mute, maxW: pg.w - 14 });
    }
    if (c2.recommended && tall && pg.w >= 120) { // centred above the name on narrow cards, top-right on wide ones
      const wide = pg.w >= 240;
      uiChip(wide ? pg.x + pg.w - 8 : cx, pg.y + (wide ? 13 : 10), 'RECOMMENDED', { h: 14, size: 7, pad: 6, color: UI.good, align: wide ? 'right' : 'center' });
    }
  }
  // the bottom bar: PRACTICE (the trial picker) beside the ONE primary
  uiButton(L.trial, 'PRACTICE', { accent: UI.player, size: 11, sub: L.trial.h >= 46 ? 'TRIAL · ANY STAGE' : null });
  const needAff = SKIN.affinities && !SETTINGS.affinity;
  const dn = (DIFFICULTY_UI[SETTINGS.preset] || {}).name || SETTINGS.preset;
  uiButton(L.start, needAff ? 'CHOOSE ☀ LIGHT OR ☾ DARK' : mode.key === 'junkie' ? 'LAUNCH  ▶' : 'START  ▶',
    { primary: !needAff, accent: mode.accent, size: needAff ? 12 : 15,
      sub: L.start.h >= 46 ? (needAff ? 'OR CHOOSE UNSWORN' : mode.label + '  ·  ' + dn + '  ·  ' + PRESETS[SETTINGS.preset].lives + ' HP') : null });
}

// PAGE 2 — setup is deliberately split so neither decision competes for room.
function drawSetup() {
  const L = setupLayout(), mode = MODES.find(m => m.key === SETTINGS.mode) || MODES[0];
  uiStage(mode.accent);
  drawMenuStars(0.7);
  const en = uiEnter(uiSurfaceT('setup-' + L.step + (L.simple ? '-g' : '')), 0.22);
  ctx.globalAlpha = en.a;
  ctx.save(); ctx.translate(0, en.dy);
  drawSetupHeader(L, mode);
  if (L.step === 'pilot') drawPilotSetup(L, mode);
  else drawDifficultySetup(L, mode);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  if (trialOpen) drawTrial();
  if (advOpen) drawAdvanced();
}

// ---- ACT-BOUNDARY CEREMONY: the game's biggest beat. The partner pulses
// white faster and faster, blooms into a radiant flash, and is REVEALED evolved — then the
// act title card lands: "ACT II — TRANSFORMATION". Without a partner the
// act card alone takes the stage. All state mutation happens in update();
// this only reads G.ceremony.
function drawCeremony() {
  const c = G.ceremony;
  if (!c) return;
  const A = SKIN.acts[c.act], t = c.t;
  dim(Math.min(0.8, t * 1.6));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = W / 2, cy = H * 0.36;
  const doneAt = c.evo ? 3.4 : 2.2;
  // act-colored light rays wheeling behind the stage
  const rayA = Math.min(0.22, t * 0.1);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(G.time * 0.12);
  for (let i = 0; i < 10; i++) {
    ctx.rotate(Math.PI / 5);
    const rg = Math.min(W, H) * 0.65;
    ctx.globalAlpha = rayA * (i % 2 ? 0.6 : 1);
    ctx.fillStyle = A.color;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(rg, -rg * 0.08); ctx.lineTo(rg, rg * 0.08);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (c.evo) {
    const ms = Math.min(W, H) * 0.34;
    const col = TYPE_COLORS[c.evo.type] || '#ffd54f';
    const showNew = t >= 2.45;
    const id = showNew ? c.evo.toId : c.evo.fromId;
    const img = getSprite(id);
    // accelerating white pulses build the tension, then the radiant flash
    const pulse = t < 1.9 ? Math.max(0, Math.sin(t * t * 5.5)) : 1;
    const radiantFlash = t >= 1.9 && t < 2.45;
    const grow = t < 1.9 ? 1 + t * 0.04 : radiantFlash ? 1.1 + (t - 1.9) * 0.55 : 1.12;
    const sz = ms * grow;
    const bob = Math.sin(G.time * 2) * 5;
    if (img.complete && img.naturalWidth) {
      ctx.save();
      ctx.translate(cx, cy + bob);
      if (radiantFlash) {
        const sil = getSilhouette(c.evo.fromId, '#ffffff');
        if (sil) ctx.drawImage(sil, -sz / 2, -sz / 2, sz, sz);
      } else {
        if (showNew) { // evolved: rim light + soft glow behind
          const rim = getSilhouette(c.evo.toId, col);
          if (rim) { ctx.globalAlpha = 0.6; ctx.drawImage(rim, -sz / 2 - 3, -sz / 2 - 3, sz + 6, sz + 6); ctx.globalAlpha = 1; }
        }
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
        // AFT-017: the oath RESOLVES during the transformation — the sworn
        // casting (new form's runes, materials, radiant blend) fades onto the
        // freshly ascended hull instead of appearing before it
        if (showNew && SKIN.affinities && SETTINGS.affinity) {
          const oathK = Math.min(1, (t - 2.45) / 0.8);
          const sworn = affinityVesselSprite(c.evo.toId, sz >= 96, false);
          if (oathK > 0 && sworn && sworn !== img) {
            ctx.globalAlpha = oathK;
            if (!SETTINGS.reduceFlash) {
              ctx.shadowColor = affinityColor();
              ctx.shadowBlur = sz * 0.2 * oathK * oathCh('aura', vesselForm(c.evo.toId));
            }
            ctx.drawImage(sworn, -sz / 2, -sz / 2, sz, sz);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          }
        }
        if (!showNew && pulse > 0.55) { // tension pulses: white overlay flickers
          const sil = getSilhouette(c.evo.fromId, '#ffffff');
          if (sil) { ctx.globalAlpha = (pulse - 0.55) * 1.6; ctx.drawImage(sil, -sz / 2, -sz / 2, sz, sz); ctx.globalAlpha = 1; }
        }
      }
      ctx.restore();
    }
    if (t < 1.9) {
      ctx.font = '700 13px Orbitron, sans-serif';
      ctx.fillStyle = '#e3f2fd';
      ctx.fillText(c.evo.abilityOnly ? c.evo.fromName + "'S POWER IS SURGING!"
        : SKIN.strings.evolvingLine(c.evo.fromName), cx, cy + ms * 0.66);
    } else if (showNew) {
      title(c.evo.abilityOnly ? c.evo.toName + ' · FULL POWER!' : c.evo.toName + '!',
        cy + ms * 0.62, Math.min(30, W / 16), col);
      ctx.font = bodyFont(Math.min(12, W / 46), 600);
      ctx.fillStyle = '#cfd8dc';
      ctx.fillText(c.evo.ability, cx, cy + ms * 0.62 + Math.min(30, W / 16) * 0.95, W * 0.9);
    }
  } else {
    // no partner — the act emblem holds the stage: a big ringed numeral
    const er = Math.min(W, H) * 0.16;
    ctx.save();
    ctx.shadowColor = A.color; ctx.shadowBlur = 24;
    ctx.strokeStyle = A.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = A.color + '66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, er + 10 + Math.sin(G.time * 3) * 3, 0, Math.PI * 2); ctx.stroke();
    title(A.n, cy + er * 0.08, er * 1.05, A.color);
    ctx.restore();
  }
  // the ACT title card lands after the reveal
  const tt = t - (c.evo ? 2.7 : 0.6);
  if (tt > 0) {
    const a = Math.min(1, tt / 0.45);
    const slide = (1 - a) * 24;
    ctx.globalAlpha = a;
    const ty = H * (c.evo ? 0.76 : 0.66) + slide;
    title('ACT ' + A.n + ' — ' + A.name, ty, Math.min(34, W / 14), A.color);
    ctx.font = '700 12px Orbitron, sans-serif';
    ctx.fillStyle = '#e3f2fd';
    ctx.fillText(A.gens, cx, ty + Math.min(34, W / 14) * 0.95, W * 0.9);
    ctx.font = bodyFont(11, 600);
    ctx.fillStyle = '#90a4ae';
    ctx.fillText(A.verb, cx, ty + Math.min(34, W / 14) * 0.95 + 20, W * 0.9);
    ctx.globalAlpha = 1;
  }
  if (t >= doneAt) pulse(IS_TOUCH ? 'TAP TO CONTINUE' : 'CLICK TO CONTINUE', H * 0.92);
}

// ✦ CHEAT CODES: grant any power-up combination (pause screen only).
// Deliberately ornate — gold, dashed, a little forbidden-looking.
function drawCheats() {
  const C2 = cheatLayout();
  ctx.save();
  ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 20;
  roundRect(C2.px, C2.py, C2.pw, C2.ph, 16);
  ctx.fillStyle = 'rgba(14,11,4,0.97)'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255,213,79,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 18px Orbitron, sans-serif';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('✦ CHEAT CODES ✦', C2.px + C2.pw / 2, C2.py + 32);
  ctx.font = bodyFont(10, 600);
  ctx.fillStyle = '#bfa14a';
  ctx.fillText("TAP TO GRANT · BEST SCORE WON'T BE SAVED THIS RUN", C2.px + C2.pw / 2, C2.py + 58, C2.pw - 40);
  for (let i = 0; i < SKIN.cheatItems.length; i++) {
    const it = SKIN.cheatItems[i], g2 = C2.chip(i);
    const hov = inRect(mouseX, lastMouseY, g2);
    roundRect(g2.x, g2.y, g2.w, g2.h, 10);
    ctx.fillStyle = hov ? 'rgba(255,213,79,0.2)' : 'rgba(255,213,79,0.06)';
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = hov ? '#ffd54f' : 'rgba(255,213,79,0.4)'; ctx.stroke();
    const icon = it.icon || (POWERS[it.k] && POWERS[it.k].icon) || 'star';
    drawGlyph(ctx, icon, g2.x + 20, g2.y + g2.h / 2, 8, hov ? '#ffe082' : '#d4b45a');
    ctx.font = `800 ${Math.min(10.5, g2.w / 11)}px Orbitron, sans-serif`;
    ctx.fillStyle = hov ? '#fff' : '#e6cf8f';
    ctx.fillText(it.label, g2.x + 20 + (g2.w - 26) / 2, g2.y + g2.h / 2 + 1, g2.w - 42);
  }
  const cb = C2.close;
  ctx.strokeStyle = '#bfa14a'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cb.x + 10, cb.y + 10); ctx.lineTo(cb.x + cb.w - 10, cb.y + cb.h - 10);
  ctx.moveTo(cb.x + cb.w - 10, cb.y + 10); ctx.lineTo(cb.x + 10, cb.y + cb.h - 10);
  ctx.stroke();
  ctx.restore();
}

// trial mode: pick a region + stage, dive straight in (nothing persists)
function drawTrial() {
  dim(0.6);
  const T = trialLayout();
  ctx.save();
  // AFT-029: the picker rides the deep-stage panel language
  uiPanel(T.px, T.py, T.pw, T.ph, { accent: UI.player, bar: 'top', r: 18, fill: 'rgba(7,11,30,0.97)' });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitLabel('PRACTICE · TRIAL MODE', T.px + T.pw / 2, T.py + 30, { size: 15, min: 11, weight: 900, color: UI.ink, maxW: T.pw - 100 });
  fitLabel('Jump into any region. Score and catches are not saved.', T.px + T.pw / 2, T.py + 54,
    { size: 10.5, min: 8.5, weight: 500, family: "Verdana, 'Segoe UI', system-ui, sans-serif", color: UI.sub, maxW: T.pw - 40 });
  // close ✕
  const cb = T.close;
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cb.x + 10, cb.y + 10); ctx.lineTo(cb.x + cb.w - 10, cb.y + cb.h - 10);
  ctx.moveTo(cb.x + cb.w - 10, cb.y + 10); ctx.lineTo(cb.x + 10, cb.y + cb.h - 10);
  ctx.stroke();
  // region grid — each chip shows the region and its legendary
  for (let i = 0; i < SKIN.gens.length; i++) {
    const g = SKIN.gens[i], r = T.region(i), sel = trialSel.region === i;
    const hov = inRect(mouseX, lastMouseY, r);
    ctx.save();
    if (sel) { ctx.shadowColor = g.accent; ctx.shadowBlur = 12; }
    roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = sel ? g.accent + '33' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeStyle = sel ? g.accent : 'rgba(255,255,255,0.22)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    // fitted, never overlapping (2026-07-23 user report: long realm names
    // ran across three chips) — shrink to a readable floor, then ellipsize
    fitLabel(g.name, r.x + r.w / 2, r.y + r.h / 2 - r.h * 0.18,
      { size: Math.min(13, r.w / 8), min: 7.5, weight: 900, color: sel ? '#fff' : '#cfd8dc', maxW: r.w - 12 });
    fitLabel(g.boss.n.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2 + r.h * 0.22,
      { size: 9, min: 7, weight: 500, color: sel ? g.accent : '#78909c', maxW: r.w - 10 });
    ctx.restore();
  }
  // stage picker
  for (let i = 0; i < STAGES; i++) {
    const r = T.stage(i), sel = trialSel.stage === i;
    const hov = inRect(mouseX, lastMouseY, r);
    roundRect(r.x, r.y, r.w, r.h, 9);
    ctx.fillStyle = sel ? 'rgba(255,213,79,0.22)' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeStyle = sel ? '#ffd54f' : 'rgba(255,255,255,0.22)';
    ctx.stroke();
    fitLabel((i + 1) + '/3 ' + (stageTitle(trialSel.region * STAGES + i + 1) || SKIN.stageNames[i]),
      r.x + r.w / 2, r.y + r.h / 2 + 1,
      { size: Math.min(11, r.w / 10), min: 7.5, weight: 900, color: sel ? '#ffd54f' : '#cfd8dc', maxW: r.w - 8 });
  }
  // LEGENDARY stage → pick a gauntlet round. STARFIGHTER Kanto also exposes
  // the secret replacement fight directly so it can be practiced on demand.
  if (T.rounds) {
    const gsel = SKIN.gens[trialSel.region];
    // AFT-020: the round chips carry the finale's NAMED CHAPTERS from the
    // skin's profile (title / core / coda labels), falling back to the old
    // generic wording where no profile exists
    const fpT = finaleProfile(trialSel.region);
    const chapT = i => (fpT && fpT.beats && fpT.beats[i] && fpT.beats[i].label) || null;
    const labels = [(fpT && fpT.title) || 'FULL GAUNTLET',
      '★ ' + (chapT(1) || gsel.boss.n.toUpperCase()),
      '✦ ' + (chapT(2) || (gsel.gauntlet ? (SKIN.names[gsel.gauntlet.myth[0]] || 'MYTHICAL').toUpperCase() : 'MYTHICAL')),
      '◆ ' + SKIN.secret.name + ' · SECRET'];
    for (let i = 0; i < T.roundCount; i++) {
      const rr2 = T.round(i), sel2 = trialSel.round === i;
      const hov2 = inRect(mouseX, lastMouseY, rr2);
      roundRect(rr2.x, rr2.y, rr2.w, rr2.h, 9);
      const secret = i === 3;
      ctx.fillStyle = sel2 ? (secret ? 'rgba(128,216,255,0.24)' : 'rgba(255,128,171,0.22)')
        : hov2 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.lineWidth = sel2 ? 2 : 1;
      ctx.strokeStyle = sel2 ? (secret ? '#80d8ff' : '#ff80ab') : 'rgba(255,255,255,0.22)';
      ctx.stroke();
      fitLabel(labels[i], rr2.x + rr2.w / 2, rr2.y + rr2.h / 2 + 1,
        { size: Math.min(10, rr2.w / 11), min: 7.5, weight: 900, color: sel2 ? (secret ? '#80d8ff' : '#ff80ab') : '#cfd8dc', maxW: rr2.w - 8 });
    }
  }
  // PHASE picker — practice a boss round from any phase (mid-band HP).
  if (T.phases) {
    for (let i = 0; i < T.phaseCount; i++) {
      const pr = T.phase(i), sel = trialSel.phase === i + 1;
      const hovp = inRect(mouseX, lastMouseY, pr);
      roundRect(pr.x, pr.y, pr.w, pr.h, 8);
      ctx.fillStyle = sel ? 'rgba(255,213,79,0.22)' : hovp ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeStyle = sel ? '#ffd54f' : 'rgba(255,255,255,0.22)';
      ctx.stroke();
      ctx.font = `900 ${Math.min(10, pr.w / 7)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel ? '#ffd54f' : '#cfd8dc';
      ctx.fillText('PHASE ' + (i + 1), pr.x + pr.w / 2, pr.y + pr.h / 2 + 1, pr.w - 8);
    }
  }
  // start button
  uiButton(T.start, 'START TRIAL  ▶', { primary: true, accent: UI.player, size: T.start.h >= 40 ? 14 : 12 });
  // BOSS RUSH launcher: all nine finales back to back with the CURRENT mode,
  // difficulty and partner — its line names the best time for exactly that
  // mode+difficulty pair when one exists
  {
    const rb = T.rush, hovR = inRect(mouseX, lastMouseY, rb);
    const best = rushBest(SETTINGS.mode, SETTINGS.preset);
    ctx.save();
    roundRect(rb.x, rb.y, rb.w, rb.h, 12);
    ctx.fillStyle = hovR ? 'rgba(255,213,79,0.32)' : 'rgba(255,213,79,0.16)'; ctx.fill();
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2; ctx.stroke();
    const two = rb.h >= 30;
    fitLabel(rushName(), rb.x + rb.w / 2, rb.y + rb.h / 2 - (two ? rb.h * 0.17 : 0),
      { size: rb.h >= 40 ? 14 : 12, min: 8.5, weight: 900, color: '#ffd54f', maxW: rb.w - 12 });
    if (two) {
      const modeName = ((MODES.find(m => m.key === SETTINGS.mode) || {}).label || SETTINGS.mode).toUpperCase();
      const diffName = ((DIFFICULTY_UI[SETTINGS.preset] || {}).name || SETTINGS.preset).toUpperCase();
      // phones: the time alone (the record is for the picked mode+difficulty)
      fitLabel(best ? 'BEST ' + fmtRushTime(best.best) + (rb.w >= 200 ? ' · ' + modeName + ' ' + diffName : '') : '9 ' + rushFinaleWord() + ' · TIMED',
        rb.x + rb.w / 2, rb.y + rb.h / 2 + rb.h * 0.24,
        { size: rb.h >= 40 ? 9.5 : 8.5, min: 7, weight: 700, color: best ? '#fff3c4' : '#c9b37a', maxW: rb.w - 12 });
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawAdvanced() {
  dim(0.6);
  const A = advLayout();
  ctx.save();
  roundRect(A.px, A.py, A.pw, A.ph, 18);
  ctx.fillStyle = 'rgba(8,12,30,0.96)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 18px Orbitron, sans-serif';
  ctx.fillStyle = '#e3f2fd';
  ctx.fillText('SETTINGS', A.px + A.pw / 2, A.py + 30);
  // close ✕
  const cb = A.close;
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cb.x + 10, cb.y + 10); ctx.lineTo(cb.x + cb.w - 10, cb.y + cb.h - 10);
  ctx.moveTo(cb.x + cb.w - 10, cb.y + 10); ctx.lineTo(cb.x + 10, cb.y + cb.h - 10);
  ctx.stroke();
  for (let i = 0; i < 4; i++) { // AFT-010: + the ACCESS page
    const r = A.tab(i), active = settingsPage === i;
    roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = active ? 'rgba(66,165,245,0.26)' : 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = active ? '#80d8ff' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
    ctx.font = `800 ${A.compact ? 8 : 9}px Orbitron, sans-serif`; ctx.fillStyle = active ? '#e3f2fd' : '#78909c';
    ctx.fillText(i === 0 ? 'GAME' : i === 1 ? 'TOUCH' : i === 2 ? 'SAVE' : 'ACCESS', r.x + r.w / 2, r.y + r.h / 2, r.w - 6);
  }
  // AFT-006: the SAVE page — export/import/restore + surfaced storage health
  if (settingsPage === 2) { drawSaveSettings(A); ctx.restore(); return; }
  // sliders
  for (let i = 0; i < A.sliders.length; i++) {
    const s = A.sliders[i], gm = A.slider(i);
    const frac = (SETTINGS[s.key] - s.min) / (s.max - s.min);
    ctx.font = '700 12px Orbitron, sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#90a4ae';
    ctx.fillText(s.label, gm.x, gm.y - 17);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd54f';
    ctx.fillText(s.fmt(SETTINGS[s.key]), gm.x + gm.w, gm.y - 17);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gm.x, gm.y); ctx.lineTo(gm.x + gm.w, gm.y); ctx.stroke();
    ctx.strokeStyle = '#42a5f5';
    ctx.beginPath(); ctx.moveTo(gm.x, gm.y); ctx.lineTo(gm.x + gm.w * frac, gm.y); ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#42a5f5'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(gm.x + gm.w * frac, gm.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#e3f2fd'; ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1;
  }
  // accessibility toggles
  for (let i = 0; i < A.toggles.length; i++) {
    const t = A.toggles[i], r = A.toggle(i);
    if (t.cycle) { // AFT-018: the cycle row (EFFECTS QUALITY)
      ctx.textAlign = 'left';
      ctx.font = '700 12px Orbitron, sans-serif';
      ctx.fillStyle = '#e3f2fd';
      ctx.fillText(t.label, r.x + 44, r.y + r.h / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = SETTINGS[t.key] === 'full' ? '#ffd54f'
        : SETTINGS[t.key] === 'reduced' ? '#80cbc4'
        : SETTINGS[t.key] === 'minimal' ? '#b0bec5' : '#66bb6a';
      ctx.fillText(String(SETTINGS[t.key]).toUpperCase() + ' ▸', r.x + r.w - 6, r.y + r.h / 2);
      continue;
    }
    const on = !!SETTINGS[t.key];
    ctx.textAlign = 'left';
    ctx.font = '700 12px Orbitron, sans-serif';
    ctx.fillStyle = on ? '#e3f2fd' : '#90a4ae';
    ctx.fillText(t.label, r.x + 44, r.y + r.h / 2);
    // pill switch
    const sw = { x: r.x, y: r.y + r.h / 2 - 10, w: 34, h: 20 };
    roundRect(sw.x, sw.y, sw.w, sw.h, 10);
    ctx.fillStyle = on ? '#66bb6a' : 'rgba(255,255,255,0.15)'; ctx.fill();
    ctx.beginPath();
    ctx.arc(sw.x + (on ? sw.w - 10 : 10), sw.y + 10, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#eceff1'; ctx.fill();
  }
  ctx.restore();
}

// AFT-006: export / import / restore, with the import PREVIEWED before any
// write — the summary shows exactly what changes, section by section.
function drawSaveSettings(A) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (importPreview) {
    ctx.font = `900 ${A.compact ? 11 : 13}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ffd54f';
    fitLabel('IMPORT PREVIEW — SAVED ' + String(importPreview.savedAt).slice(0, 10),
      A.px + A.pw / 2, A.saveBtn(0).y - 14, { size: A.compact ? 10 : 11, min: 8.5, weight: 900, color: '#ffd54f', maxW: A.pw - 60 });
    importPreview.summary.forEach((row, i) => {
      const y = A.saveBtn(0).y + 8 + i * (A.compact ? 18 : 22);
      ctx.font = bodyFont(A.compact ? 10 : 11, 700);
      ctx.textAlign = 'left'; ctx.fillStyle = '#90a4ae';
      ctx.fillText(row.label, A.px + 40, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#e3f2fd';
      ctx.fillText(row.cur + '  →  ' + row.inc, A.px + A.pw - 40, y);
    });
    ctx.textAlign = 'center';
    for (const [i, label, col] of [[1.6, 'CONFIRM IMPORT', '#66bb6a'], [2.6, 'CANCEL', '#ff8a65']]) {
      const r = A.saveBtn(i);
      roundRect(r.x, r.y, r.w, r.h, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `800 ${A.compact ? 10 : 12}px Orbitron, sans-serif`; ctx.fillStyle = col;
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
    }
    return;
  }
  const auto = loadStore(storeKey('autosave'), 'null');
  const rows = [
    ['EXPORT SAVE FILE', '#80d8ff'],
    ['IMPORT SAVE FILE', '#ffd54f'],
    ['RESTORE AUTOSAVE' + (auto ? '' : ' — NONE YET'), auto ? '#66bb6a' : '#546e7a'],
  ];
  rows.forEach(([label, col], i) => {
    const r = A.saveBtn(i);
    roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.font = `800 ${A.compact ? 10 : 12}px Orbitron, sans-serif`; ctx.fillStyle = col;
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  });
  // storage health, stated plainly — never a silent failure mode
  const health = !STORAGE_HEALTH.writable ? ['STORAGE BLOCKED — RUNNING UNSAVED', '#ff8a65']
    : STORAGE_HEALTH.durable === true ? ['STORAGE: DURABLE (EVICTION-PROTECTED)', '#66bb6a']
    : STORAGE_HEALTH.durable === false ? ['STORAGE: BROWSER-MANAGED (MAY EVICT WHEN IDLE — EXPORT A FILE)', '#ffd54f']
    : ['STORAGE: BROWSER-MANAGED', '#90a4ae'];
  // AFT-022 F2: the eviction guidance ("… EXPORT A FILE") is the actionable
  // half of this line — it wraps on narrow phones instead of ellipsizing,
  // and the autosave stamp below shifts down by the extra line.
  const hb = fitLabelWrap(health[0], A.px + A.pw / 2, A.saveStatusY,
    { size: A.compact ? 9 : 10, min: 8, weight: 700, color: health[1], maxW: A.pw - 48, maxLines: 2 });
  if (auto && auto.savedAt) {
    fitLabel('AUTOSAVE: ' + String(auto.savedAt).slice(0, 19).replace('T', ' '),
      A.px + A.pw / 2, A.saveStatusY + (hb.n - 1) * hb.lineH + (A.compact ? 15 : 18), { size: A.compact ? 8.5 : 9.5, min: 8, weight: 600, color: '#78909c', maxW: A.pw - 48 });
  }
}

function drawDex() {
  dim(0.85);
  dexCellRects = []; // rebuilt each frame — input hit-tests the same geometry
  dossierTileRects = [];
  const HL = dexHeadLayout(); // AFT-013: header + tab strip geometry (shared with input)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (dexTab === 'boss') drawDossierList(HL);
  else {
  // ---- scrolling region-by-region body ----
  const cellW = Math.max(72, Math.min(92, W / 5)), cellH = cellW + 16;
  const cols = Math.max(4, Math.floor(Math.min(W * 0.92, 1100) / cellW));
  const gw = cols * cellW;
  const x0 = W / 2 - gw / 2;
  let y = HL.top - dexScroll;
  const headerH = 54;
  for (const g of SKIN.gens) {
    const roster = regionRoster(g);
    const caught = roster.filter(id => DEX.has(id)).length;
    const rows = Math.ceil(roster.length / cols);
    const sectionH = headerH + rows * cellH + 16;
    if (y + sectionH > HL.top - 10 && y < H) { // only draw visible sections
      // region header + progress bar
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '900 17px Orbitron, sans-serif';
      ctx.fillStyle = g.accent;
      ctx.fillText(g.name, x0 + 4, y + 18);
      ctx.textAlign = 'right';
      ctx.font = '700 13px Orbitron, sans-serif';
      ctx.fillStyle = caught === roster.length ? '#ffd54f' : '#90a4ae';
      ctx.fillText(caught + ' / ' + roster.length + (caught === roster.length ? '  ★ COMPLETE' : ''), x0 + gw - 4, y + 18);
      roundRect(x0 + 4, y + 34, gw - 8, 5, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
      if (caught > 0) {
        roundRect(x0 + 4, y + 34, (gw - 8) * caught / roster.length, 5, 2.5);
        ctx.fillStyle = g.accent; ctx.fill();
      }
      // cells
      roster.forEach((id, i) => {
        const cx = x0 + (i % cols) * cellW + cellW / 2;
        const cy = y + headerH + Math.floor(i / cols) * cellH + cellH / 2 - 8;
        if (cy + cellH / 2 < HL.top - 10 || cy - cellH / 2 > H) return;
        const has = DEX.has(id), shiny = DEXS.has(id);
        const half = cellW / 2 - 4;
        if (has) dexCellRects.push({ id, x: cx - half, y: cy - half - 6, w: half * 2, h: half * 2 + 12 });
        roundRect(cx - half, cy - half - 6, half * 2, half * 2 + 12, 10);
        ctx.fillStyle = shiny ? 'rgba(255,215,0,0.1)' : has ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
        ctx.fill();
        ctx.strokeStyle = shiny ? '#ffd700' : has ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
        ctx.lineWidth = shiny ? 1.5 : 1;
        ctx.stroke();
        const sp = half * 2 - 22;
        if (has) {
          const img = getSprite(id, shiny);
          if (img.complete && img.naturalWidth) ctx.drawImage(img, cx - sp / 2, cy - sp / 2 - 8, sp, sp);
        } else {
          const sil = getSilhouette(id);
          if (sil) ctx.drawImage(sil, cx - sp / 2, cy - sp / 2 - 8, sp, sp);
          else { // sprite not loaded yet: dotted placeholder
            ctx.beginPath(); ctx.arc(cx, cy - 8, sp * 0.3, 0, Math.PI * 2);
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        ctx.textAlign = 'center';
        ctx.font = '700 8.5px Orbitron, sans-serif';
        ctx.fillStyle = has ? '#cfd8dc' : '#546e7a';
        ctx.fillText(has ? (SKIN.names[id] || '#' + id).toUpperCase() : '???', cx, cy + half - 4, half * 2 - 8);
        if (shiny) drawGlyph(ctx, 'fairy', cx + half - 9, cy - half + 3, 5, '#ffd700');
      });
    }
    y += sectionH;
  }
  // clamp scroll to content
  const maxScroll = Math.max(0, (y + dexScroll) - HL.top - (H - HL.top - 34));
  dexScroll = Math.min(dexScroll, maxScroll);
  }
  // ---- fixed header on top ----
  const hb = HL.top - 2;
  const hg = ctx.createLinearGradient(0, 0, 0, hb);
  hg.addColorStop(0, 'rgba(5,8,25,0.97)'); hg.addColorStop(0.86, 'rgba(5,8,25,0.92)'); hg.addColorStop(1, 'rgba(5,8,25,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, hb);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title(SKIN.strings.dexName, HL.titleY, Math.min(34, W / (W < 560 ? 16 : 12)), '#ef5350');
  drawDexTabs(HL);
  if (dexTab === 'boss') { drawDossierHeader(HL); drawDexBack(); drawDossierPage(); return; }
  ctx.font = '700 12px Orbitron, sans-serif';
  ctx.fillStyle = '#b0bec5';
  const total = dexTotal();
  // AFT-023b: the tally words are SKIN voice — 'CAUGHT'/'SHINY' are pokemon
  // vocabulary and were reaching the AETHERFALL codex as raw literals
  ctx.fillText(DEX.size + ' / ' + total + ' ' + (SKIN.strings.caughtWord || 'CAUGHT')
    + (DEXS.size ? '  ·  ' + DEXS.size + ' ' + SKIN.strings.shinyTag : '')
    + '  ·  ' + (IS_TOUCH ? 'DRAG' : 'SCROLL') + ' TO BROWSE', W / 2, HL.tallyY);
  const nextResearch = nextDexReward();
  if (nextResearch) {
    const prevAt = SKIN.dexRewards.filter(r => r.at < nextResearch.at).reduce((n, r) => Math.max(n, r.at), 0);
    const progress = Math.max(0, Math.min(1, (DEX.size - prevAt) / Math.max(1, nextResearch.at - prevAt)));
    ctx.font = '800 9.5px Orbitron, sans-serif';
    ctx.fillStyle = nextResearch.color;
    ctx.fillText('NEXT RESEARCH REWARD · ' + nextResearch.name + ' · ' + Math.max(0, nextResearch.at - DEX.size) + ' TO GO', W / 2, HL.researchY, W * 0.84);
    const rw = Math.min(360, W * 0.72), rx = W / 2 - rw / 2;
    roundRect(rx, HL.barY, rw, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    if (progress > 0) { roundRect(rx, HL.barY, rw * progress, 5, 2.5); ctx.fillStyle = nextResearch.color; ctx.fill(); }
  } else {
    ctx.font = '800 10px Orbitron, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('★ ALL RESEARCH REWARDS UNLOCKED ★', W / 2, HL.researchY + 2);
  }
  drawDexBack();
  drawDexDetail();
}
function drawDexBack() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cb = dexCloseGeom();
  roundRect(cb.x, cb.y, cb.w, cb.h, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = '#cfd8dc';
  ctx.fillText('◀ BACK', cb.x + cb.w / 2, cb.y + cb.h / 2 + 1);
}

// ── AFT-013: THE CODEX TABS + BOSS DOSSIERS ────────────────────────────────
// Tab strip (collection | dossiers), the realm-by-realm cast list (unmet =
// silhouette + ???), and the dossier page. Geometry: dexHeadLayout /
// dossierListLayout / dossierPageLayout (input.js) — render writes the
// per-frame tile + page rects, input reads them. Menu-only screen: the few
// gradients/blurs here are per-frame singletons, never per-entity.
function drawDexTabs(HL) {
  const labels = [SKIN.strings.creatures || 'COLLECTION', SKIN.strings.dossierName || 'BOSSES'];
  for (let i = 0; i < 2; i++) {
    const r = HL.tabs[i], on = (dexTab === 'boss') === (i === 1);
    roundRect(r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fillStyle = on ? 'rgba(239,83,80,0.22)' : 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = on ? '#ef5350' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
    ctx.textBaseline = 'middle';
    fitLabel(labels[i], r.x + r.w / 2, r.y + r.h / 2 + 1,
      { size: HL.compact ? 11 : 12, min: 8, weight: 800, color: on ? '#ffffff' : '#90a4ae', maxW: r.w - 16 });
  }
}
function drawDossierHeader(HL) {
  const rows = bossDossierRoster();
  let met = 0, total = 0, won = 0;
  for (const r of rows) { met += r.met; total += r.total; won += r.cast.filter(c => c.won).length; }
  ctx.textBaseline = 'middle';
  fitLabel(met + ' / ' + total + ' MET  ·  ' + won + ' DEFEATED  ·  ' + (IS_TOUCH ? 'DRAG' : 'SCROLL') + ' TO BROWSE',
    W / 2, HL.tallyY, { size: 12, min: 8, weight: 700, color: '#b0bec5', maxW: W - 32 });
  fitLabel(met ? 'TAP A MET ' + lex('LEGENDARY') + ', ' + lex('MYTHICAL') + ' OR ' + lex('SENTINEL') + ' TO READ ITS DOSSIER'
    : 'MEET A FINALE CAST TO OPEN ITS DOSSIERS',
    W / 2, HL.researchY + 2, { size: 9.5, min: 7.5, weight: 800, color: '#78909c', maxW: W - 32 });
}
function dossierShortName(c) {
  const full = String(c.role === 'secret' ? SKIN.secret.name : (SKIN.names[c.id] || '#' + c.id));
  const ci = full.indexOf(',');
  return (ci > 0 ? full.slice(0, ci) : full).replace(/^the\s+/i, '').toUpperCase();
}
const DOSSIER_ROLE_COLORS = { mythic: '#ff80ab', secret: '#d780ff' };
function drawDossierList(HL) {
  const LL = dossierListLayout();
  dexScroll = Math.min(dexScroll, LL.maxScroll);
  const rows = bossDossierRoster();
  rows.forEach((row, r) => {
    const y = LL.rowY(r);
    if (y + LL.rowH < HL.top - 10 || y > H) return;
    ctx.textBaseline = 'middle';
    fitLabel(row.name, LL.x0 + 4, y + 14, { align: 'left', size: 15, min: 10, weight: 900, color: row.accent, maxW: LL.gw * 0.62 });
    fitLabel(row.met + ' / ' + row.total + ' MET', LL.x0 + LL.gw - 4, y + 14,
      { align: 'right', size: 12, min: 9, weight: 700, color: row.met === row.total ? '#ffd54f' : '#90a4ae', maxW: LL.gw * 0.34 });
    fitLabel(row.title, LL.x0 + 4, y + 32, { align: 'left', size: 10, min: 8, weight: 700, color: '#78909c', maxW: LL.gw - 8 });
    const T = LL.tiles(row.cast, r);
    row.cast.forEach((c, i) => {
      const t = T[i];
      if (t.y + t.h < HL.top - 4 || t.y > H) return;
      dossierTileRects.push({ key: t.key, x: t.x, y: t.y, w: t.w, h: t.h, seen: c.seen });
      const big = c.role === 'legendary';
      const edge = big ? row.accent : DOSSIER_ROLE_COLORS[c.role] || 'rgba(255,255,255,0.22)';
      roundRect(t.x, t.y, t.w, t.h, 10);
      ctx.fillStyle = c.seen ? (big ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.025)';
      ctx.fill();
      ctx.globalAlpha = c.seen ? 1 : 0.45;
      ctx.strokeStyle = edge; ctx.lineWidth = big ? 1.6 : 1; ctx.stroke();
      ctx.globalAlpha = 1;
      const sp = t.w - 10, sx = t.x + 5, sy = t.y + 4;
      if (c.seen) {
        const img = getSprite(c.id);
        if (img.complete && img.naturalWidth) ctx.drawImage(img, sx, sy, sp, sp);
      } else {
        const sil = getSilhouette(c.id);
        if (sil) ctx.drawImage(sil, sx, sy, sp, sp);
        else {
          ctx.beginPath(); ctx.arc(sx + sp / 2, sy + sp / 2, sp * 0.3, 0, Math.PI * 2);
          ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke(); ctx.setLineDash([]);
        }
      }
      ctx.textBaseline = 'middle';
      fitLabelWrap(c.seen ? dossierShortName(c) : '???', t.x + t.w / 2, t.y + t.w + 2,
        { size: big ? 9 : 8.5, min: 7, weight: 700, color: c.seen ? '#cfd8dc' : '#546e7a', maxW: t.w - 4, maxLines: 2 });
      if (c.won) {
        ctx.font = '900 12px Orbitron, sans-serif'; ctx.fillStyle = '#ffd54f'; ctx.textAlign = 'center';
        ctx.fillText('★', t.x + t.w - 9, t.y + 10);
      }
    });
  });
}
let dossierModelMemo = null;
function drawDossierPage() {
  if (!dossierDetail) { dossierPageRects = null; return; }
  if (!dossierModelMemo || dossierModelMemo.ref !== dossierDetail) { // re-read on every open / step
    dossierModelMemo = { ref: dossierDetail, m: bossDossier(dossierDetail.key) };
  }
  const D = dossierModelMemo.m;
  if (!D) { dossierPageRects = null; return; }
  const P = dossierPageLayout();
  const C = P.card, A = P.art, I = P.info;
  const col = TYPE_COLORS[D.type] || '#90a4ae';
  const roleCol = D.role === 'legendary' ? D.accent : DOSSIER_ROLE_COLORS[D.role] || col;
  dim(0.72);
  ctx.save(); ctx.shadowColor = roleCol + '66'; ctx.shadowBlur = 24;
  roundRect(C.x, C.y, C.w, C.h, 20);
  ctx.fillStyle = 'rgba(6,9,24,0.97)'; ctx.fill(); ctx.restore();
  roundRect(C.x, C.y, C.w, C.h, 20);
  ctx.strokeStyle = roleCol; ctx.lineWidth = 1.6; ctx.stroke();
  // the portrait — never obstructed: info lives below (portrait) or beside it
  const acx = A.x + A.w / 2, acy = A.y + A.h / 2;
  const pg = ctx.createRadialGradient(acx, acy, 8, acx, acy, A.w * 0.6);
  pg.addColorStop(0, col + '33'); pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg; ctx.fillRect(A.x, A.y, A.w, A.h);
  const rev = bossRevealImage(D.id);
  const src = rev && rev.complete && rev.naturalWidth ? rev : getSprite(D.id);
  if (src && src.complete && src.naturalWidth) {
    const ar = (src.naturalHeight || src.height || src.naturalWidth) / src.naturalWidth;
    const dw = ar > 1 ? A.w / ar : A.w, dh = ar > 1 ? A.h : A.h * ar;
    ctx.drawImage(src, acx - dw / 2, acy - dh / 2, dw, dh);
  }
  // ---- info rows: optional rows yield first when the box is short ----
  const k = Math.max(0.88, Math.min(1.3, I.h / 340, I.w / 300));
  const rows = [];
  const add = (text, o, opt = 0) => { if (text) rows.push({ text, o, opt }); };
  const sec = (text, opt = 0) => rows.push({ text, o: { size: 8.5 * k, min: 7.5, weight: 800, color: '#78909c', gap: 7 }, opt, sec: true });
  add(D.name, { size: (P.side ? 21 : 22) * k, min: 12, weight: 900, color: '#ffffff' });
  add(D.epithet, { size: 11 * k, min: 8, weight: 800, color: roleCol });
  add(D.realmName + '  ·  ' + D.roleWord + '  ·  ' + D.typeText, { size: 10 * k, min: 8, weight: 800, color: col });
  add(D.phases, { size: 10 * k, min: 8, weight: 700, color: '#b0bec5' });
  sec(D.attacksTitle);
  for (const a of D.attacks) add(a.label + '  ·  ' + a.name, { size: 10.5 * k, min: 8, weight: 700, color: '#eceff1' });
  sec('COUNTERPLAY');
  add(D.cue, { size: 11 * k, min: 9, weight: 700, color: '#ffe082', wrap: 3, family: 'Verdana, system-ui, sans-serif' });
  sec('FINALE', 1);
  add(D.finale.title, { size: 10.5 * k, min: 8, weight: 800, color: D.accent }, 1);
  add(D.finale.beats.map(b => b.label).filter(Boolean).join('  →  '), { size: 9 * k, min: 7.5, weight: 700, color: '#90a4ae' }, 3);
  sec('YOUR RECORD');
  const R = D.record;
  add(R.metText + '  ·  ' + R.winText + '  ·  ' + R.koText, { size: 10.5 * k, min: 8, weight: 800, color: R.wins > 0 ? '#a5d6a7' : '#cfd8dc' });
  if (!R.best.length && R.wins > 0) add('FASTEST FALL · NOT YET TIMED', { size: 9.5 * k, min: 7.5, weight: 700, color: '#90a4ae' }, 2);
  for (const b of R.best) {
    add('FASTEST FALL · ' + b.label + '  ' + b.text, { size: 10 * k, min: 8, weight: 800, color: '#ffd54f' });
    if (b.phases) add(b.phases, { size: 9 * k, min: 7.5, weight: 700, color: '#90a4ae' }, 2);
  }
  if (R.rushText) add(R.rushText, { size: 9.5 * k, min: 7.5, weight: 800, color: '#80d8ff' }, 1);
  const rowH = r => {
    const o = r.o, lines = o.wrap ? Math.max(1, wrapLinesNeeded(r.text, { min: o.min, weight: o.weight, maxW: I.w, maxLines: o.wrap, family: o.family })) : 1;
    return (o.gap || 0) + (lines > 1 ? lines * Math.round(o.min * 1.3) : Math.round(o.size * 1.32) + 2);
  };
  let kept = rows.slice();
  const total = () => kept.reduce((n, r) => n + rowH(r), 0);
  for (const lvl of [3, 2, 1]) if (total() > I.h) kept = kept.filter(r => r.opt < lvl);
  // a section header never sits alone at the end of the list
  kept = kept.filter((r, i) => !r.sec || (kept[i + 1] && !kept[i + 1].sec));
  let y = I.y + (P.side ? Math.max(4, (I.h - total()) / 2) : 2);
  const ax = P.side ? I.x : I.x + I.w / 2, align = P.side ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  for (const r of kept) {
    const h = rowH(r), o = r.o;
    y += o.gap || 0;
    const first = (h - (o.gap || 0));
    const opts = { size: o.size, min: o.min, weight: o.weight, color: o.color, maxW: I.w, align, family: o.family };
    if (o.wrap) fitLabelWrap(r.text, ax, y + Math.round(o.min * 0.65), { ...opts, maxLines: o.wrap });
    else fitLabel(r.text, ax, y + first / 2, opts);
    y += first;
  }
  // ---- bottom row: ‹ · close hint · › ----
  const order = bossDossierSeenOrder();
  const many = order.length > 1;
  for (const [r, ch] of [[P.prev, '‹'], [P.next, '›']]) {
    roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = many ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'; ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = '900 22px Orbitron, sans-serif'; ctx.fillStyle = many ? '#cfd8dc' : '#455a64';
    ctx.fillText(ch, r.x + r.w / 2, r.y + r.h / 2);
  }
  const pos = Math.max(0, order.indexOf(D.key)) + 1;
  fitLabel((many ? pos + ' / ' + order.length + '  ·  ' : '') + (IS_TOUCH ? 'TAP OUTSIDE TO CLOSE' : 'CLICK OUTSIDE OR ESC TO CLOSE'),
    P.hint.x + P.hint.w / 2, P.hint.y + P.hint.h / 2, { size: 9, min: 7.5, weight: 700, color: '#78909c', maxW: P.hint.w });
  dossierPageRects = { card: C, prev: P.prev, next: P.next };
}

// ---- THE CODEX GALLERY (2026-07-21): tap a recorded entry for a full-size
// portrait — the art at 3×, a RADIANT toggle, aspect + realm identity, and
// ‹ › browsing across everything recorded. Render writes dexDetailRects;
// input hit-tests the same geometry.
function drawDexDetail() {
  if (!dexDetail) { dexDetailRects = null; return; }
  const id = dexDetail.id;
  const info = dexEntryInfo(id);
  const t = info ? info.t : 'normal';
  const col = TYPE_COLORS[t] || '#90a4ae';
  const radiantOK = DEXS.has(id);
  const shiny = dexDetail.radiant && radiantOK;
  dim(0.72);
  const cw = Math.min(W * 0.92, 520), chh = Math.min(H * 0.9, 620);
  const cx0 = W / 2 - cw / 2, cy0 = H / 2 - chh / 2;
  ctx.save(); ctx.shadowColor = shiny ? 'rgba(255,215,0,0.5)' : col + '66'; ctx.shadowBlur = 26;
  roundRect(cx0, cy0, cw, chh, 20);
  ctx.fillStyle = 'rgba(6,9,24,0.97)'; ctx.fill(); ctx.restore();
  roundRect(cx0, cy0, cw, chh, 20);
  ctx.strokeStyle = shiny ? '#ffd700' : col; ctx.lineWidth = 1.6; ctx.stroke();
  // the portrait — as big as the card allows (the whole point of the gallery)
  const sp = Math.min(cw - 70, chh - 220, 384);
  const px = W / 2, py = cy0 + 34 + sp / 2;
  const pg = ctx.createRadialGradient(px, py, 8, px, py, sp * 0.62);
  pg.addColorStop(0, (shiny ? '#ffd700' : col) + '30');
  pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.arc(px, py, sp * 0.62, 0, Math.PI * 2); ctx.fill();
  const img = getSprite(id, shiny);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, px - sp / 2, py - sp / 2, sp, sp);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let ty = py + sp / 2 + 26;
  ctx.font = `900 ${Math.min(24, cw / 14)}px Orbitron, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(((SKIN.names[id] || '#' + id) + '').toUpperCase(), W / 2, ty, cw - 40);
  ty += 28;
  ctx.font = '800 11px Orbitron, sans-serif';
  ctx.fillStyle = col;
  ctx.fillText(typeLabel(t) + ' ' + typeWord() + (info ? '  ·  ' + info.gen.name : '')
    + (info ? '  ·  FORM ' + ['I', 'II', 'III'][info.tier - 1] : ''), W / 2, ty, cw - 40);
  ty += 26;
  // RADIANT toggle — the discovery reward: preview only once recorded
  const rw = 190, rh = 30;
  const rr = { x: W / 2 - rw / 2, y: ty, w: rw, h: rh };
  roundRect(rr.x, rr.y, rw, rh, 15);
  ctx.fillStyle = shiny ? 'rgba(255,215,0,0.22)' : radiantOK ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = radiantOK ? '#ffd700' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.font = '800 10px Orbitron, sans-serif';
  ctx.fillStyle = radiantOK ? (shiny ? '#ffffff' : '#ffd700') : '#546e7a';
  ctx.fillText(radiantOK ? (shiny ? '◆ ' + SKIN.strings.shinyTag + ' FORM' : '◇ VIEW ' + SKIN.strings.shinyTag + ' FORM')
    : SKIN.strings.shinyTag + ' · NOT YET RECORDED', W / 2, rr.y + rh / 2 + 0.5, rw - 12);
  // ‹ › browse arrows riding the card's flanks
  const aw = 44, ay = cy0 + chh / 2 - aw / 2;
  const prev = { x: cx0 + 6, y: ay, w: aw, h: aw }, next = { x: cx0 + cw - aw - 6, y: ay, w: aw, h: aw };
  for (const [r, ch] of [[prev, '‹'], [next, '›']]) {
    roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
    ctx.font = '900 24px Orbitron, sans-serif'; ctx.fillStyle = '#cfd8dc';
    ctx.fillText(ch, r.x + r.w / 2, r.y + r.h / 2);
  }
  ctx.font = '700 9px Orbitron, sans-serif'; ctx.fillStyle = '#78909c';
  ctx.fillText(IS_TOUCH ? 'TAP OUTSIDE TO CLOSE' : 'CLICK OUTSIDE OR ESC TO CLOSE', W / 2, cy0 + chh - 16, cw - 30);
  dexDetailRects = { card: { x: cx0, y: cy0, w: cw, h: chh }, radiant: rr, prev, next };
}

function constellationHex(x, y, r, rot = Math.PI / 6) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + i * Math.PI / 3;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

// One state language is shared by every kind of constellation node. Only an
// OFFER is luminous/clickable now; owned nodes are steady, reachable nodes are
// deliberately muted, and locked nodes recede. Selection is an inspection
// ring and never promotes an unavailable node into looking installable.
function treeNodeVisualState(owned, offered, reachable) {
  return offered ? 'offered' : owned ? 'owned' : reachable ? 'reachable' : 'locked';
}
const TREE_NODE_ALPHA = Object.freeze({ offered: 1, owned: 0.78, reachable: 0.42, locked: 0.2 });

// Chart-space text: the constellation pans/zooms inside its own clip, so map
// labels shrink-then-ellipsize against the CHART like fitLabel does against
// the screen — but they must never viewport-clamp (the map clip is the
// containment authority here, and a pannable label dragged to the screen
// edge would detach from its wedge). Optional plate keeps a label readable
// over connectors and ring strokes at any zoom.
function treeMapLabel(text, x, y, o) {
  const maxW = Math.max(24, o.maxW);
  let size = o.size;
  const weight = o.weight || 800;
  ctx.font = `${weight} ${size}px Orbitron, sans-serif`;
  let t = String(text);
  let w = ctx.measureText(t).width;
  if (w > maxW) {
    size = Math.max(o.min || 8, size * maxW / w);
    ctx.font = `${weight} ${size}px Orbitron, sans-serif`;
    w = ctx.measureText(t).width;
  }
  if (w > maxW && t.length > 2) {
    while (t.length > 1 && ctx.measureText(t.replace(/\s+$/, '') + '…').width > maxW) t = t.slice(0, -1);
    t = t.replace(/\s+$/, '') + '…';
    w = ctx.measureText(t).width;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.plate) {
    const ph = size * 1.44 + 6;
    roundRect(x - w / 2 - 5, y - ph / 2, w + 10, ph, ph / 2);
    ctx.fillStyle = o.plate; ctx.fill();
    if (o.plateStroke) { ctx.strokeStyle = o.plateStroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  ctx.fillStyle = o.color;
  ctx.fillText(t, x, y);
  return { w, size };
}

// The constellation is both atlas and choice surface. It deliberately maps
// the current 24 save-compatible tiers before the later branching graph adds
// more nodes, so the visual redesign can ship without changing balance.
function drawFullUpgradeTree() {
  const T = upgradeTreeLayout(), p = T.panel;
  ctx.save();
  ctx.globalAlpha = 1;
  dim(0.82);
  ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = 30;
  roundRect(p.x, p.y, p.w, p.h, 22);
  const pg = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
  pg.addColorStop(0, 'rgba(8,14,38,0.992)');
  pg.addColorStop(0.55, 'rgba(5,9,27,0.992)');
  pg.addColorStop(1, 'rgba(12,7,31,0.992)');
  ctx.fillStyle = pg; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(128,216,255,0.65)'; ctx.lineWidth = 2; ctx.stroke();

  // restrained star field inside the panel: enough depth to sell a star map,
  // deterministic so it never flickers while the player is reading.
  ctx.save();
  roundRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, 20); ctx.clip();
  for (let i = 0; i < 34; i++) {
    const sx = p.x + 18 + ((i * 89.7) % Math.max(1, p.w - 36));
    const sy = p.y + 18 + ((i * 53.3) % Math.max(1, p.h - 36));
    const tw = SETTINGS.reduceFlash ? 0.45 : 0.4 + 0.25 * Math.sin(G.time * 0.8 + i);
    ctx.globalAlpha = 0.16 + tw * 0.2;
    ctx.fillStyle = i % 5 ? '#b3e5fc' : '#ffd54f';
    ctx.beginPath(); ctx.arc(sx, sy, i % 7 ? 0.8 : 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.min(T.compact ? 18 : 24, p.w / (T.compact ? 20 : 26))}px Orbitron, sans-serif`;
  ctx.fillStyle = '#e3f2fd';
  // maxWidth keeps the title clear of the close button on phones
  ctx.fillText(G.mode === 'junkie' ? 'STARFIGHTER CONSTELLATION' : 'UPGRADE CONSTELLATION',
    p.x + p.w / 2, p.y + (T.compact ? 18 : 22), p.w - 116);
  // the build count spans the whole web: 24 tiers + 6 bridges + 15 fusions
  // + 2 apexes + 3 satellites (a satellite counts once at any rank) = 50
  const satOwnedN = activeSatellites().filter(s => (G.stacks && G.stacks[s.stackKey]) > 0).length;
  const ownedN = totalBuildLevels() + satOwnedN;
  const activeN = PATH_KEYS.filter(pk => pathLvl(pk) > 0).length;
  ctx.font = `700 ${T.compact ? 9 : 9.5}px Orbitron, sans-serif`; ctx.fillStyle = '#80d8ff';
  const buildLine = T.compact
    ? 'BUILD ' + ownedN + '/50 · ' + activeN + ' PATHS · ONLY OPTION TAGS INSTALL'
    : 'BUILD ' + ownedN + '/50 · ' + activeN + ' ACTIVE ' + (activeN === 1 ? 'PATH' : 'PATHS') +
      ' · ONLY THE ' + (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][(G.upgradeChoices || []).length - 1] || 'WHITE') +
      ' WHITE OPTION TAGS CAN BE INSTALLED THIS STAGE';
  ctx.fillText(buildLine, p.x + p.w / 2, p.y + (T.compact ? 37 : 45), p.w - 96);

  if (!treeSel.kind) treeSel.kind = 'tier';
  treeSel.pi = Math.max(0, Math.min(PATH_KEYS.length - 1, treeSel.pi | 0));
  treeSel.ti = Math.max(0, Math.min(3, treeSel.ti | 0));
  if (treeSel.kind === 'bridge') treeSel.bi = Math.max(0, Math.min(WEB_BRIDGES.length - 1, treeSel.bi | 0));
  if (treeSel.kind === 'fusion') treeSel.fi = Math.max(0, Math.min(WEB_FUSIONS.length - 1, treeSel.fi | 0));
  if (treeSel.kind === 'apex') treeSel.ai = Math.max(0, Math.min(WEB_APEXES.length - 1, treeSel.ai | 0));
  if (treeSel.kind === 'sat') treeSel.si = Math.max(0, Math.min(activeSatellites().length - 1, treeSel.si | 0));

  const map = T.map, C = T.center;
  ctx.save();
  roundRect(map.x, map.y, map.w, map.h, 16); ctx.clip();
  // Four readable progression rings. They are tier rings today, not false
  // evolution locks; Form gates can later reuse the exact same geometry.
  const ringNames = ['TIER I', 'TIER II', 'TIER III', 'CAPSTONE'];
  for (let ti = 0; ti < 4; ti++) {
    const rr = T.inner + ti * T.step;
    ctx.setLineDash(ti === 3 ? [4, 7] : [2, 8]);
    ctx.lineDashOffset = -G.time * (SETTINGS.reduceFlash ? 2 : 8);
    ctx.strokeStyle = ti === 3 ? 'rgba(255,213,79,0.22)' : 'rgba(128,216,255,0.13)';
    ctx.lineWidth = ti === 3 ? 1.5 : 1;
    ctx.beginPath(); ctx.arc(C.x, C.y, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (!T.compact || ti === 3) {
      // ring names: the -60° line is not empty anymore — that BOUNDARY
      // carries a bridge node and a crown fusion (drawn later, i.e. over the
      // text). Mid-wedge placement shy of the top spoke instead; the
      // innermost ring needs a wider angle (its chord to the spoke's hex
      // shrinks with ring radius) and its slice of the boundary is empty,
      // while the outer rings must stay off the boundary's bridge/fusion.
      // Satellites dock on the other side of a spoke, so this side is safe.
      const la = -Math.PI / 2 - (ti === 0 ? 0.47 : 0.30);
      treeMapLabel(ringNames[ti], C.x + Math.cos(la) * (rr + 6), C.y + Math.sin(la) * (rr + 6), {
        size: T.compact ? 8.5 : 8, min: 7, weight: 700,
        color: ti === 3 ? 'rgba(255,213,79,0.62)' : 'rgba(128,216,255,0.45)',
        maxW: Math.max(34, T.radius * 0.22),
      });
    }
  }
  // the CROWN ring (adjacent fusions + satellites), the FUSION HALO (the
  // nine cross-web fusions) and the APEX ring beyond it
  ctx.setLineDash([2, 10]);
  ctx.lineDashOffset = -G.time * (SETTINGS.reduceFlash ? 2 : 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(C.x, C.y, T.radius * 0.93, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(C.x, C.y, T.radius * 1.16, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([3, 14]);
  ctx.strokeStyle = 'rgba(255,110,64,0.12)';
  ctx.beginPath(); ctx.arc(C.x, C.y, T.radius * 1.3, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Connectors first, behind their nodes. Owned routes are solid; an offered
  // frontier gets one slow moving light path from the nearest owned tier.
  for (let pi = 0; pi < PATH_KEYS.length; pi++) {
    const pk = PATH_KEYS[pi], P = PATHS[pk], lvl = pathLvl(pk);
    for (let ti = 0; ti < 4; ti++) {
      const b = T.node(pi, ti);
      const a = ti ? T.node(pi, ti - 1) : { cx: C.x, cy: C.y };
      const owned = ti < lvl;
      const offer = choiceIndexForTreeNode(pi, ti);
      ctx.setLineDash(owned ? [] : [4, 7]);
      ctx.lineDashOffset = offer >= 0 ? -G.time * (SETTINGS.reduceFlash ? 5 : 28) : 0;
      ctx.strokeStyle = owned ? P.color : offer >= 0 ? P.color + 'dd' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = owned ? 3 : offer >= 0 ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
      if (offer >= 0) {
        ctx.setLineDash([]); ctx.globalAlpha = 0.26;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.setLineDash([]);

  // ---- WEB connectors: each bridge ties the TIER II nodes of its two
  // wedges together (each half in that wedge's color); each superskill hangs
  // off its capstone with a faint recipe thread back to its bridge; each
  // satellite docks off its capstone. Drawn under the nodes.
  const connectTo = (from, to, col, owned, offered) => {
    ctx.setLineDash(owned ? [] : [4, 7]);
    ctx.lineDashOffset = offered ? -G.time * (SETTINGS.reduceFlash ? 5 : 28) : 0;
    ctx.strokeStyle = owned ? col : offered ? col + 'dd' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = owned ? 2.6 : offered ? 2.4 : 1.1;
    ctx.beginPath(); ctx.moveTo(from.cx, from.cy); ctx.lineTo(to.cx, to.cy); ctx.stroke();
    ctx.setLineDash([]);
  };
  for (let bi = 0; bi < WEB_BRIDGES.length; bi++) {
    const b = WEB_BRIDGES[bi], n = T.bridgeNode(bi);
    const owned = !!upgN(b.key);
    const offered = choiceIndexForSel({ kind: 'bridge', bi }) >= 0;
    for (const pk of b.paths) {
      connectTo(T.node(PATH_KEYS.indexOf(pk), 1), n, PATHS[pk].color, owned, offered);
    }
  }
  // FUSION connectors are SELECTIVE (the plan's mobile-readability rule):
  // a fusion's two prerequisite-spoke threads draw only while it is owned,
  // offered, or the selected node — never all fifteen at once.
  for (let fi = 0; fi < WEB_FUSIONS.length; fi++) {
    const f = WEB_FUSIONS[fi], n = T.fusionNode(fi);
    const owned = !!upgN(f.key);
    const offered = choiceIndexForSel({ kind: 'fusion', fi }) >= 0;
    const sel = treeSel.kind === 'fusion' && treeSel.fi === fi;
    if (!(owned || offered || sel)) continue;
    for (const pk of f.paths) {
      connectTo(T.node(PATH_KEYS.indexOf(pk), 3), n, PATHS[pk].color, owned, offered);
    }
    if (f.bridge) {
      ctx.globalAlpha = owned || offered ? 0.5 : 0.3;
      connectTo(T.bridgeNode(WEB_BRIDGE_KEYS.indexOf(f.bridge)), n, f.color, owned, offered);
      ctx.globalAlpha = 1;
    }
  }
  // an apex thread runs to each of its COMPATIBLE fusions, same selectivity
  for (let ai = 0; ai < WEB_APEXES.length; ai++) {
    const x = WEB_APEXES[ai], n = T.apexNode(ai);
    const owned = !!upgN(x.key);
    const offered = choiceIndexForSel({ kind: 'apex', ai }) >= 0;
    const sel = treeSel.kind === 'apex' && treeSel.ai === ai;
    if (!(owned || offered || sel)) continue;
    for (const f of apexCompatFusions(x)) {
      connectTo(T.fusionNode(WEB_FUSION_KEYS.indexOf(f.key)), n,
        upgN(f.key) ? f.color : 'rgba(255,255,255,0.35)', owned && upgN(f.key), offered);
    }
  }
  for (let si = 0; si < activeSatellites().length; si++) {
    const sat = activeSatellites()[si], item = stackItem(sat.stackKey);
    const rank = (G.stacks && G.stacks[sat.stackKey]) || 0;
    connectTo(T.node(PATH_KEYS.indexOf(sat.path), 3), T.satNode(si), item.color,
      rank > 0, choiceIndexForSel({ kind: 'sat', si }) >= 0);
  }

  const inspectionRing = (n, selected, offered) => {
    if (!selected || offered) return;
    ctx.save(); ctx.setLineDash([3, 4]); ctx.lineDashOffset = -G.time * 7;
    ctx.strokeStyle = 'rgba(207,216,220,0.68)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  };
  // A literal OPTION tag replaces the ambiguous numbered dot. Tags sit on
  // the centre-facing side so capstone/fusion labels remain unobstructed.
  // They are COLLECTED here and drawn in one final pass after every node so
  // no neighbouring hexagon can ever paint over a tag; each gets a dark
  // padding cushion so it reads cleanly against whatever sits behind it.
  const offerPills = [];
  const offerFlag = (n, offer, inward = false) => offerPills.push([n, offer, inward]);
  const drawOfferPill = (n, offer, inward) => {
    // AFT-022 F5: the pill's rect comes from the SHARED layout helper — the
    // tag is a real tap target now, so render may not free-hand its box
    n.pillInward = !!inward;
    const P = T.offerPillRect(n);
    const fcX = P.cx, fcY = P.cy, fw = P.fw, fh = P.fh;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // dark padding cushion — a hair larger than the tag on every side
    roundRect(P.x, P.y, P.w, P.h, P.h / 2);
    ctx.fillStyle = 'rgba(4,9,22,0.85)'; ctx.fill();
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = SETTINGS.reduceFlash ? 8 : 12;
    roundRect(fcX - fw / 2, fcY - fh / 2, fw, fh, fh / 2);
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(7,16,34,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = `900 ${Math.max(6.5, Math.min(8, n.r * 0.42))}px Orbitron, sans-serif`;
    ctx.fillStyle = '#071022';
    ctx.fillText('OPTION ' + (offer + 1), fcX, fcY + 0.5, fw - 6);
    ctx.restore();
  };

  // Nodes use shape + icon + connector state, never color alone. Only the
  // three offers pulse, keeping a full late-run map calm and scannable.
  for (let pi = 0; pi < PATH_KEYS.length; pi++) {
    const pk = PATH_KEYS[pi], P = PATHS[pk], lvl = pathLvl(pk);
    for (let ti = 0; ti < 4; ti++) {
      const tier = P.tiers[ti], owned = ti < lvl, next = ti === lvl;
      const sel = (treeSel.kind || 'tier') === 'tier' && treeSel.pi === pi && treeSel.ti === ti;
      const n = T.node(pi, ti);
      const offer = choiceIndexForTreeNode(pi, ti);
      const offered = offer >= 0;
      const chosen = offered && draftSel === offer;
      const state = treeNodeVisualState(owned, offered, next);
      const pulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 2.5 + offer * 1.7);
      ctx.save();
      if (offered) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14 + pulse * 10; }
      constellationHex(n.cx, n.cy, n.r + (ti === 3 ? 2 : 0));
      ctx.fillStyle = chosen ? mixHex(P.color, '#ffffff', 0.22) : owned ? mixHex(P.color, '#071022', 0.55)
        : offered ? mixHex(P.color, '#071022', 0.72) : next ? 'rgba(16,24,43,0.76)' : 'rgba(5,9,19,0.78)';
      ctx.fill();
      ctx.lineWidth = chosen ? 3 : offered ? 2.4 : owned ? 1.8 : next ? 1.2 : 1;
      ctx.strokeStyle = chosen ? '#fff' : offered || owned ? P.color : next ? P.color + '62' : 'rgba(255,255,255,0.08)';
      ctx.stroke();
      ctx.shadowBlur = 0;
      const iconR = Math.max(6, n.r * 0.72);
      const badge = iconBadge(tier.icon, P.color, Math.round(iconR), offered ? 'lit' : 'dim');
      ctx.globalAlpha = TREE_NODE_ALPHA[state];
      ctx.drawImage(badge, n.cx - badge.width / 2, n.cy - badge.height / 2);
      ctx.globalAlpha = 1;
      if (owned) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.cx + n.r * 0.68, n.cy + n.r * 0.65, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      inspectionRing(n, sel, offered);
      if (offered) offerFlag(n, offer, ti === 3);
      ctx.restore();
    }
  }

  // ---- WEB nodes: bridges (two-tone), superskills (double-hex crowns) and
  // mastery satellites (ranked pips). Same state language: only offers pulse.
  for (let bi = 0; bi < WEB_BRIDGES.length; bi++) {
    const b = WEB_BRIDGES[bi], n = T.bridgeNode(bi);
    const owned = !!upgN(b.key), eligible = bridgeEligible(b);
    const sel = treeSel.kind === 'bridge' && treeSel.bi === bi;
    const offer = choiceIndexForSel({ kind: 'bridge', bi });
    const offered = offer >= 0, chosen = offered && draftSel === offer;
    const state = treeNodeVisualState(owned, offered, eligible);
    const pulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 2.5 + bi * 1.3);
    const cA = PATHS[b.paths[0]].color, cB = PATHS[b.paths[1]].color;
    ctx.save();
    if (offered) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14 + pulse * 10; }
    constellationHex(n.cx, n.cy, n.r, 0); // flat-top: bridges read differently
    ctx.fillStyle = chosen ? mixHex(b.color, '#ffffff', 0.22) : owned ? mixHex(b.color, '#071022', 0.5)
      : offered ? mixHex(b.color, '#071022', 0.72) : 'rgba(9,14,28,0.9)';
    ctx.fill();
    // TWO-TONE border: a solid half in each wedge's color, never color-alone
    ctx.lineWidth = chosen ? 2.6 : owned || offered ? 2 : eligible ? 1.2 : 1;
    ctx.strokeStyle = chosen ? '#fff' : owned || offered ? cA : eligible ? cA + '62' : 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r + 2.5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = chosen ? '#fff' : owned || offered ? cB : eligible ? cB + '62' : 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r + 2.5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.shadowBlur = 0;
    const badge = iconBadge(b.icon, b.color, Math.max(6, Math.round(n.r * 0.66)), offered ? 'lit' : 'dim');
    ctx.globalAlpha = TREE_NODE_ALPHA[state];
    ctx.drawImage(badge, n.cx - badge.width / 2, n.cy - badge.height / 2);
    ctx.globalAlpha = 1;
    if (owned) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.cx + n.r * 0.7, n.cy + n.r * 0.66, 2.8, 0, Math.PI * 2); ctx.fill(); }
    inspectionRing(n, sel, offered);
    if (offered) offerFlag(n, offer);
    ctx.restore();
  }
  // FUSION nodes: compact SILHOUETTES until the player holds two ranks in
  // both paths (then they expand and reveal their recipe); double-hex crowns
  // when live. Only offers pulse. Two-tone rim = its two path colors.
  for (let fi = 0; fi < WEB_FUSIONS.length; fi++) {
    const f = WEB_FUSIONS[fi], n = T.fusionNode(fi);
    const owned = !!upgN(f.key), eligible = fusionEligible(f), visible = fusionVisible(f);
    const sel = treeSel.kind === 'fusion' && treeSel.fi === fi;
    const offer = choiceIndexForSel({ kind: 'fusion', fi });
    const offered = offer >= 0, chosen = offered && draftSel === offer;
    const state = treeNodeVisualState(owned, offered, eligible);
    const pulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 2.5 + fi * 0.9);
    ctx.save();
    if (!visible && !sel) { // locked silhouette: a small quiet marker
      ctx.globalAlpha = 0.55;
      constellationHex(n.cx, n.cy, n.r * 0.55, Math.PI / 6);
      ctx.fillStyle = 'rgba(11,16,32,0.9)'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
      ctx.restore();
      continue;
    }
    if (offered) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 15 + pulse * 10; }
    constellationHex(n.cx, n.cy, n.r + 1.5, Math.PI / 6);
    ctx.fillStyle = chosen ? mixHex(f.color, '#ffffff', 0.25) : owned ? mixHex(f.color, '#071022', 0.45)
      : offered ? mixHex(f.color, '#071022', 0.7) : 'rgba(9,14,28,0.92)';
    ctx.fill();
    // two-tone rim: each half in one of its path colors (never color alone —
    // the double hex is the fusion SHAPE)
    const cA = PATHS[f.paths[0]].color, cB = PATHS[f.paths[1]].color;
    ctx.lineWidth = chosen ? 2.6 : owned || offered ? 2.2 : eligible ? 1.2 : 1;
    ctx.strokeStyle = chosen ? '#fff' : owned || offered ? cA : eligible ? cA + '62' : 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r + 2.5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = chosen ? '#fff' : owned || offered ? cB : eligible ? cB + '62' : 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r + 2.5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    constellationHex(n.cx, n.cy, n.r + 1.5, 0);
    ctx.strokeStyle = owned || offered ? f.color : 'rgba(255,255,255,0.2)';
    ctx.globalAlpha = offered ? 0.9 : owned ? 0.7 : eligible ? 0.3 : 0.16;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    const badge = iconBadge(f.icon, f.color, Math.max(7, Math.round(n.r * 0.62)), offered ? 'lit' : 'dim');
    ctx.globalAlpha = TREE_NODE_ALPHA[state];
    ctx.drawImage(badge, n.cx - badge.width / 2, n.cy - badge.height / 2);
    ctx.globalAlpha = 1;
    if (owned) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.cx + n.r * 0.72, n.cy + n.r * 0.68, 3, 0, Math.PI * 2); ctx.fill(); }
    inspectionRing(n, sel, offered);
    if (offered) offerFlag(n, offer, true);
    ctx.restore();
  }
  // APEX nodes hold the outermost ring — triple-ring crowns, dim until two
  // compatible fusions are installed
  for (let ai = 0; ai < WEB_APEXES.length; ai++) {
    const x = WEB_APEXES[ai], n = T.apexNode(ai);
    const owned = !!upgN(x.key), eligible = apexEligible(x);
    const near = apexCompatFusions(x).filter(f => upgN(f.key)).length >= 2;
    const sel = treeSel.kind === 'apex' && treeSel.ai === ai;
    const offer = choiceIndexForSel({ kind: 'apex', ai });
    const offered = offer >= 0, chosen = offered && draftSel === offer;
    const state = treeNodeVisualState(owned, offered, eligible || near);
    const pulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 2.2 + ai * 2.4);
    ctx.save();
    if (offered) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16 + pulse * 10; }
    constellationHex(n.cx, n.cy, n.r + 2, Math.PI / 6);
    ctx.fillStyle = chosen ? mixHex(x.color, '#ffffff', 0.25) : owned ? mixHex(x.color, '#071022', 0.4)
      : offered ? mixHex(x.color, '#071022', 0.68) : 'rgba(9,14,28,0.94)';
    ctx.fill();
    ctx.lineWidth = chosen ? 2.8 : owned || offered ? 2.4 : eligible || near ? 1.2 : 1;
    ctx.strokeStyle = chosen ? '#fff' : owned || offered ? x.color : eligible || near ? x.color + '62' : 'rgba(255,255,255,0.08)';
    ctx.stroke();
    constellationHex(n.cx, n.cy, n.r + 2, 0);
    ctx.globalAlpha = offered ? 0.85 : owned ? 0.68 : near ? 0.26 : 0.12;
    ctx.stroke();
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r + 6, 0, Math.PI * 2);
    ctx.globalAlpha = owned || offered ? 0.6 : near ? 0.2 : 0.08;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    const badge = iconBadge(x.icon, x.color, Math.max(8, Math.round(n.r * 0.58)), offered ? 'lit' : 'dim');
    ctx.globalAlpha = TREE_NODE_ALPHA[state];
    ctx.drawImage(badge, n.cx - badge.width / 2, n.cy - badge.height / 2);
    ctx.globalAlpha = 1;
    if (owned) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.cx + n.r * 0.74, n.cy + n.r * 0.7, 3.2, 0, Math.PI * 2); ctx.fill(); }
    inspectionRing(n, sel, offered);
    if (offered) offerFlag(n, offer, true);
    ctx.restore();
  }
  for (let si = 0; si < activeSatellites().length; si++) {
    const sat = activeSatellites()[si], item = stackItem(sat.stackKey);
    const n = T.satNode(si);
    const rank = (G.stacks && G.stacks[sat.stackKey]) || 0;
    const unlocked = pathLvl(sat.path) >= 4;
    const sel = treeSel.kind === 'sat' && treeSel.si === si;
    const offer = choiceIndexForSel({ kind: 'sat', si });
    const offered = offer >= 0, chosen = offered && draftSel === offer;
    const state = treeNodeVisualState(rank > 0, offered, unlocked);
    const pulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 2.5 + si * 2.1);
    ctx.save();
    if (offered) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12 + pulse * 8; }
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r, 0, Math.PI * 2); // circles = repeatable
    ctx.fillStyle = chosen ? mixHex(item.color, '#ffffff', 0.22) : rank ? mixHex(item.color, '#071022', 0.5)
      : offered ? mixHex(item.color, '#071022', 0.72) : 'rgba(9,14,28,0.9)';
    ctx.fill();
    ctx.lineWidth = chosen ? 2.2 : rank || offered ? 1.8 : unlocked ? 1.1 : 1;
    ctx.strokeStyle = chosen ? '#fff' : rank || offered ? item.color : unlocked ? item.color + '62' : 'rgba(255,255,255,0.08)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    const badge = iconBadge(item.icon, item.color, Math.max(5, Math.round(n.r * 0.62)), offered ? 'lit' : 'dim');
    ctx.globalAlpha = TREE_NODE_ALPHA[state];
    ctx.drawImage(badge, n.cx - badge.width / 2, n.cy - badge.height / 2);
    ctx.globalAlpha = 1;
    if (rank > 0) { // the rank readout IS the ∞-stack record
      ctx.font = `900 ${Math.max(6.5, n.r * 0.7)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText('×' + rank, n.cx, n.cy + n.r + 8);
    }
    inspectionRing(n, sel, offered);
    if (offered) offerFlag(n, offer, true);
    ctx.restore();
  }

  // ---- wedge identity labels, AFTER every node body: they used to draw
  // inside the tier loop, so the halo fusions and apexes (painted later on
  // the same spoke axes) printed straight over the text on the outer rings.
  // The plate keeps them readable over connectors at any zoom; the role
  // sub-line only appears when the chart is roomy enough to clear the
  // capstone below it (it also lives in the detail panel's heading now).
  for (let pi = 0; pi < PATH_KEYS.length; pi++) {
    const pk = PATH_KEYS[pi], P = PATHS[pk];
    const lb = T.label(pi);
    treeMapLabel(skinPathName(pk), lb.x, lb.y, {
      size: T.compact ? 11.5 : 11, min: 8.5, weight: 900, color: P.color,
      maxW: T.labelMaxW, // shared with the layout's labelRect tap target
      plate: 'rgba(4,9,22,0.78)', plateStroke: P.color + '3d',
    });
    if (!T.compact && T.radius >= 265) {
      treeMapLabel(pathRole(pk), lb.x, lb.y + 13, { size: 6.5, min: 6, weight: 600, color: '#78909c', maxW: 100 });
    }
  }

  // The actual current build sits at the center, so installing a node has an
  // immediate visual referent instead of feeling like a detached menu choice.
  ctx.save();
  const corePulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 1.9);
  ctx.strokeStyle = `rgba(255,255,255,${0.22 + corePulse * 0.18})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(C.x, C.y, T.inner * 0.68, 0, Math.PI * 2); ctx.stroke();
  if (G.mode === 'junkie') drawPilotRig(C.x, C.y, true);
  else {
    blitBadge(SKIN.strings.dexGlyph, C.x, C.y, Math.max(12, T.inner * 0.38), '#80d8ff', 'lit');
    const sm = SKIN.starterMon[G.starter], img = sm && getSprite(sm.ids[G.starterLvl - 1]);
    if (img && img.complete && img.naturalWidth) {
      const ss = Math.max(26, T.inner * 0.72);
      ctx.drawImage(img, C.x - ss / 2, C.y - ss / 2, ss, ss);
    }
  }
  // compact maps skip the core caption — the header already carries the
  // build count, and down here it collided with the bottom spoke's offer chip
  if (!T.compact) {
    ctx.font = '900 8px Orbitron, sans-serif'; ctx.fillStyle = '#e3f2fd';
    ctx.fillText('PILOT CORE · ' + ownedN, C.x, C.y + T.inner * 0.83);
  }
  ctx.restore();
  ctx.restore();

  // OPTION tags last of all — above every hexagon and the pilot core, so the
  // three installable choices are always fully legible
  offerPills.forEach(p => drawOfferPill(p[0], p[1], p[2]));

  if (treeListMode) drawTreeList(T); // AFT-009R P4: the phone list reading covers the map
  drawTreeCameraControls(T);
  drawTreeDetail(T);
  const cb = T.close;
  roundRect(cb.x, cb.y, cb.w, cb.h, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '900 16px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#cfd8dc';
  ctx.fillText('×', cb.x + cb.w / 2, cb.y + cb.h / 2 + 1);
  ctx.restore();
}

// AFT-009R P4: THE JOURNAL LIST — every path, bridge, fusion and apex as a
// big touch row over an opaque sheet (the map keeps its camera underneath;
// LIST/MAP toggles, drag scrolls — no pinch anywhere). Filters ALL / OWNED /
// NEXT; undiscovered fusions are ??? silhouettes with their reveal
// condition as the hint; the header carries the build identity and the
// NEXT REACHABLE transformation.
function drawTreeList(T) {
  const LL = treeListLayout(T);
  ctx.save();
  roundRect(T.map.x, T.map.y, T.map.w, T.map.h, 14);
  ctx.fillStyle = 'rgba(7,12,32,0.985)'; ctx.fill();
  ctx.clip();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const ownedPaths = PATH_KEYS.filter(k => pathLvl(k) > 0);
  const idName = ownedPaths.slice().sort((a, b) => pathLvl(b) - pathLvl(a)).slice(0, 2).map(skinPathName).join(' · ');
  fitLabel((idName || 'FIRST ATTUNEMENT') + '  ·  NEXT: ' + nextReachableTransformation(),
    T.map.x + 10, T.map.y + 28, { size: 9, min: 7.5, weight: 800, color: '#9fb2c8', align: 'left', maxW: T.map.w - 20 });
  for (const ch of LL.chips) {
    const on = treeListFilter === ch.f;
    roundRect(ch.x, ch.y, ch.w, ch.h, 13);
    ctx.fillStyle = on ? 'rgba(128,216,255,0.26)' : 'rgba(255,255,255,0.06)'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = on ? '#80d8ff' : 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '800 9px Orbitron, sans-serif'; ctx.fillStyle = on ? '#e0f7ff' : '#8fa4bd';
    ctx.fillText(ch.f.toUpperCase(), ch.x + ch.w / 2, ch.y + ch.h / 2 + 1);
  }
  const entries = treeListEntries();
  for (let i = 0; i < entries.length; i++) {
    const r = LL.row(i);
    if (r.y + r.h < LL.top - 2 || r.y > T.map.y + T.map.h) continue;
    const en = entries[i];
    const sel = sameTreeSel(treeSel, en.sel);
    roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = sel ? 'rgba(26,22,56,0.95)' : 'rgba(12,16,38,0.85)'; ctx.fill();
    ctx.lineWidth = sel ? 2 : 1.1;
    ctx.strokeStyle = sel ? '#ffffff' : en.owned ? en.color : en.reachable ? en.color + '99' : 'rgba(255,255,255,0.14)';
    ctx.stroke();
    const bd = iconBadge(en.icon, en.color, 13, en.owned || en.reachable ? 'lit' : 'dim');
    ctx.globalAlpha = en.owned ? 1 : en.reachable ? 0.85 : 0.5;
    ctx.drawImage(bd, r.x + 10, r.y + r.h / 2 - bd.height / 2);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.font = '900 11px Orbitron, sans-serif';
    ctx.fillStyle = en.owned ? '#fff' : en.reachable ? '#e3f2fd' : '#7e93ad';
    ctx.fillText(en.name, r.x + 44, r.y + r.h / 2 - 9, r.w * 0.5);
    ctx.font = '800 8px Orbitron, sans-serif'; ctx.fillStyle = en.color;
    ctx.fillText(en.status, r.x + 44, r.y + r.h / 2 + 5, r.w * 0.45);
    fitLabel(en.hint || '', r.x + r.w - 10, r.y + r.h / 2 + 5,
      { size: 8.5, min: 7, weight: 600, family: 'Verdana, sans-serif', color: '#7e93ad', align: 'right', maxW: r.w * 0.42 });
  }
  ctx.restore();
}
function drawTreeCameraControls(T) {
  const controls = [[T.zoomOut, '−'], [T.zoomIn, '+'], [T.fit, 'FIT'], [T.focus, 'FOCUS'], [T.list, treeListMode ? 'MAP' : 'LIST']];
  ctx.save();
  for (const [b, label] of controls) {
    const hov = inRect(mouseX, lastMouseY, b);
    roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fillStyle = hov ? 'rgba(128,216,255,0.24)' : 'rgba(4,9,25,0.86)'; ctx.fill();
    ctx.strokeStyle = hov ? '#b3e5fc' : 'rgba(128,216,255,0.48)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${label.length > 1 ? 7.5 : 15}px Orbitron, sans-serif`;
    ctx.fillStyle = '#e3f2fd'; ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + (label === '−' ? -1 : 0));
  }
  const last = T.list;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 7.5px Orbitron, sans-serif';
  ctx.fillStyle = 'rgba(179,229,252,0.75)';
  ctx.fillText(treeListMode ? 'DRAG SCROLLS' : Math.round(treeZoom * 100) + '% · DRAG · PINCH',
    last.x + last.w + 8, last.y + last.h / 2,
    Math.max(0, T.map.x + T.map.w - (last.x + last.w + 14)));
  ctx.restore();
}

// The shared REROLL / INSTALL action row at the panel's foot — tier and web
// details both end in exactly these two actions.
function drawTreeDetailButtons(T, offered, chosen, offer, accent) {
  const rr = T.reroll, canRR = (G.focus || 0) > 0 && !G.secret.rewardDraft && !!G.upgradeChoices;
  const hovRR = canRR && inRect(mouseX, lastMouseY, rr);
  roundRect(rr.x, rr.y, rr.w, rr.h, 11);
  ctx.fillStyle = hovRR ? 'rgba(255,213,79,0.22)' : 'rgba(255,255,255,0.07)'; ctx.fill();
  ctx.lineWidth = 1.3; ctx.strokeStyle = canRR ? (hovRR ? '#ffd54f' : 'rgba(255,213,79,0.55)') : 'rgba(255,255,255,0.15)'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${T.compact ? 10 : 9}px Orbitron, sans-serif`; ctx.fillStyle = canRR ? '#ffd54f' : '#546e7a';
  ctx.fillText(canRR ? 'FOCUS ×' + G.focus + (IS_TOUCH ? '' : ' · R') : 'NO FOCUS', rr.x + rr.w / 2, rr.y + rr.h / 2 + 1, rr.w - 10);

  // AFT-009R P4: the constellation is a JOURNAL — the action slot returns
  // to the cards (the one installation surface); selecting an offer here
  // still primes the card screen's INSTALL.
  const cf = T.confirm;
  const hovCF = inRect(mouseX, lastMouseY, cf);
  const hasHand = !!G.upgradeChoices;
  if (chosen) { ctx.shadowColor = accent; ctx.shadowBlur = hovCF ? 18 : 10; }
  roundRect(cf.x, cf.y, cf.w, cf.h, 11);
  ctx.fillStyle = hovCF ? accent + '3c' : 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = chosen ? 2 : 1.3; ctx.strokeStyle = chosen ? '#ffffff' : 'rgba(255,255,255,0.3)'; ctx.stroke();
  ctx.font = `900 ${T.compact ? 10 : 9}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
  ctx.fillText(hasHand ? (chosen ? 'BACK TO CARDS — INSTALL THERE' : 'BACK TO CARDS') : 'CLOSE JOURNAL',
    cf.x + cf.w / 2, cf.y + cf.h / 2 + 1, cf.w - 10);
}

// Detail panel for the WEB nodes (bridges / superskills / satellites): name,
// exact state, effect in THIS mode, the rig tells, and — when locked — every
// unmet requirement spelled out. No guide required.
function drawTreeDetailWeb(T) {
  const d = T.detail, kind = treeSel.kind;
  const offer = choiceIndexForSel(treeSel);
  const offered = offer >= 0, chosen = offered && draftSel === offer;
  let color, icon, name, heading, desc, visual, proc, status, statusCol, locks = [];
  if (kind === 'bridge') {
    const b = WEB_BRIDGES[treeSel.bi];
    const owned = !!upgN(b.key), eligible = bridgeEligible(b);
    color = b.color; icon = b.icon; name = b.name;
    heading = 'FORM II BRIDGE · ' + PATHS[b.paths[0]].name + ' × ' + PATHS[b.paths[1]].name;
    desc = webNodeDesc(b); visual = b.visual; proc = b.proc;
    locks = owned || offered || eligible ? [] : webLockReason(b, 'bridge');
    status = owned ? 'OWNED' : offered ? 'OFFER ' + (offer + 1) + (chosen ? ' · SELECTED' : ' · AVAILABLE')
      : eligible ? 'REACHABLE · NOT OFFERED' : 'LOCKED';
    statusCol = owned ? color : offered ? '#ffffff' : eligible ? color : '#78909c';
  } else if (kind === 'fusion') {
    const f = WEB_FUSIONS[treeSel.fi];
    const owned = !!upgN(f.key), eligible = fusionEligible(f);
    color = f.color; icon = f.icon; name = f.name;
    heading = '★ FUSION · ' + f.paths.map(pk => skinPathName(pk)).join(' × ') +
      (f.bridge ? '' : ' · CROSS-WEB') + ' · ' + (f.role || '');
    desc = webNodeDesc(f);
    visual = f.visual;
    proc = (f.ready ? 'READY: ' + f.ready + ' · ' : '') + (f.proc || '') +
      (f.limit ? ' · LIMIT: ' + f.limit : '');
    locks = owned || offered || eligible ? [] : webLockReason(f, 'fusion');
    status = owned ? '★ FUSION ONLINE · SLOT ' + fusionsOwnedCount() + '/2'
      : offered ? 'OFFER ' + (offer + 1) + (chosen ? ' · SELECTED' : ' · AVAILABLE')
        : eligible ? 'RECIPE COMPLETE · NOT OFFERED' : 'LOCKED';
    statusCol = owned ? color : offered ? '#ffffff' : eligible ? color : '#78909c';
  } else if (kind === 'apex') {
    const x = WEB_APEXES[treeSel.ai];
    const owned = !!upgN(x.key), eligible = apexEligible(x);
    color = x.color; icon = x.icon; name = x.name;
    heading = '★★ APEX · ' + x.paths.map(pk => skinPathName(pk)).join(' × ') + ' · ' + (x.role || '');
    desc = webNodeDesc(x);
    visual = x.visual;
    proc = (x.ready ? 'READY: ' + x.ready + ' · ' : '') + (x.proc || '') +
      (x.limit ? ' · LIMIT: ' + x.limit : '');
    locks = owned || offered || eligible ? [] : webLockReason(x, 'apex');
    status = owned ? '★★ APEX ONLINE' : offered ? 'OFFER ' + (offer + 1) + (chosen ? ' · SELECTED' : ' · AVAILABLE')
      : eligible ? 'RECIPE COMPLETE · NOT OFFERED' : 'LOCKED';
    statusCol = owned ? color : offered ? '#ffffff' : eligible ? color : '#78909c';
  } else {
    const sat = activeSatellites()[treeSel.si], item = stackItem(sat.stackKey);
    const rank = (G.stacks && G.stacks[sat.stackKey]) || 0;
    const unlocked = pathLvl(sat.path) >= 4;
    color = item.color; icon = item.icon; name = item.name;
    heading = 'MASTERY SATELLITE · REPEATS FOREVER';
    desc = item.desc;
    visual = 'A COUNTED SATELLITE CHIP DOCKS ON THE ' + skinPathName(sat.path) + ' WEDGE';
    proc = 'ITS RANK READS OUT ON THE MAP AND THE WING RACK';
    locks = unlocked || offered || rank ? [] : webLockReason(sat, 'sat');
    status = rank ? 'OWNED ×' + rank : offered ? 'OFFER ' + (offer + 1) + (chosen ? ' · SELECTED' : ' · AVAILABLE')
      : unlocked ? 'REACHABLE · OFFERED WHEN SLOTS REMAIN' : 'LOCKED';
    statusCol = rank ? color : offered ? '#ffffff' : unlocked ? color : '#78909c';
  }
  const pad = T.compact ? 11 : 16;
  roundRect(d.x, d.y, d.w, d.h, 14);
  ctx.fillStyle = 'rgba(10,17,39,0.975)'; ctx.fill();
  ctx.lineWidth = offered ? 2 : 1.4; ctx.strokeStyle = offered ? color : color + '88'; ctx.stroke();
  const iconSize = T.sideDetail ? 44 : T.compact ? 40 : 38;
  const detailState = offered ? 'offered' : /^OWNED|ONLINE/.test(status) || status.includes('APEX ONLINE') || status.includes('FUSION ONLINE')
    ? 'owned' : status === 'LOCKED' ? 'locked' : 'reachable';
  const db = iconBadge(icon, color, Math.round(iconSize / 2), offered ? 'lit' : 'dim');
  ctx.globalAlpha = detailState === 'offered' ? 1 : detailState === 'owned' ? 0.84 : detailState === 'reachable' ? 0.6 : 0.42;
  ctx.drawImage(db, d.x + pad, d.y + pad, iconSize, iconSize);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `800 ${T.compact ? 9 : 9}px Orbitron, sans-serif`; ctx.fillStyle = color;
  ctx.fillText(heading, d.x + pad + iconSize + 9, d.y + pad + 2, d.w - pad * 2 - iconSize - 10);
  ctx.font = `900 ${T.compact ? 15 : Math.min(18, d.w / 19)}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
  ctx.fillText(name, d.x + pad + iconSize + 9, d.y + pad + 17, d.w - pad * 2 - iconSize - 10);
  ctx.font = `800 ${T.compact ? 8.5 : 8}px Orbitron, sans-serif`; ctx.fillStyle = statusCol;
  ctx.fillText(status, d.x + pad + iconSize + 9, d.y + pad + (T.compact ? 34 : 39), d.w - pad * 2 - iconSize - 10);

  let y = d.y + pad + Math.max(iconSize + 8, 54);
  // description at body size with a height-aware line budget — same rule as
  // the tier panel (the lock list below keeps first claim on its rows)
  const lineH = T.compact ? 16 : 18;
  ctx.font = bodyFont(T.compact ? 12 : 13, 650); ctx.fillStyle = '#d8e2ee';
  const rowH = T.compact ? 13 : 14;
  const reserveW = locks.length
    ? rowH + Math.min(4, locks.length) * rowH + 10
    : rowH + (T.sideDetail ? 2 : 1) * rowH + (T.sideDetail && proc ? 2 * rowH + 8 : 10);
  const maxDescW = Math.max(2, Math.floor((T.reroll.y - 10 - y - reserveW) / lineH));
  const descLines = wrapText(desc, d.w - pad * 2).slice(0, maxDescW);
  descLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * lineH, d.w - pad * 2));
  y += descLines.length * lineH + (T.compact ? 5 : 10);

  if (locks.length) {
    // exact lock reasons — the player never needs a guide to see the route
    ctx.font = `800 ${T.compact ? 8.5 : 8}px Orbitron, sans-serif`; ctx.fillStyle = '#ffab91';
    ctx.fillText('TO UNLOCK', d.x + pad, y, d.w - pad * 2);
    y += T.compact ? 13 : 14;
    ctx.font = bodyFont(10.5, 650); ctx.fillStyle = '#ffcdb8';
    for (const reason of locks.slice(0, 4)) {
      ctx.fillText('· ' + reason, d.x + pad, y, d.w - pad * 2);
      y += rowH;
    }
    y += 4;
  } else {
    ctx.font = `800 ${T.compact ? 8.5 : 8}px Orbitron, sans-serif`; ctx.fillStyle = color;
    ctx.fillText(G.mode === 'junkie' ? 'VISIBLE ON PILOT' : 'VISIBLE ON RIG', d.x + pad, y, d.w - pad * 2);
    y += T.compact ? 13 : 14;
    ctx.font = bodyFont(10.5, 650); ctx.fillStyle = '#aebdca';
    const visualLines = wrapText(visual, d.w - pad * 2).slice(0, T.sideDetail ? 2 : 1);
    visualLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * rowH, d.w - pad * 2));
    y += visualLines.length * rowH + 5;
    if (T.sideDetail && proc) {
      ctx.fillStyle = '#90a4ae';
      const procLines = wrapText('PROC · ' + proc, d.w - pad * 2).slice(0, 2);
      procLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * rowH, d.w - pad * 2));
    }
  }
  drawTreeDetailButtons(T, offered, chosen, offer, color);
}

// Persistent node details: effect, exact state, path progress, visible rig
// tell, and the one install action. The map itself stays almost text-free.
function drawTreeDetail(T) {
  if ((treeSel.kind || 'tier') !== 'tier') { drawTreeDetailWeb(T); return; }
  const d = T.detail;
  const pk = PATH_KEYS[treeSel.pi], P = PATHS[pk], lvl = pathLvl(pk), ti = treeSel.ti;
  const tier = P.tiers[ti], owned = ti < lvl, next = ti === lvl;
  const offer = choiceIndexForTreeNode(treeSel.pi, treeSel.ti);
  const offered = offer >= 0, chosen = offered && draftSel === offer;
  const status = owned ? 'OWNED' : offered ? 'OFFER ' + (offer + 1) + (chosen ? ' · SELECTED' : ' · AVAILABLE')
    : next ? 'REACHABLE · NOT OFFERED' : 'LOCKED · REQUIRES TIER ' + ti;
  const statusCol = owned ? P.color : offered ? '#ffffff' : next ? P.color : '#78909c';
  const choice = offered ? G.upgradeChoices[offer] : null;
  const pad = T.compact ? 11 : 16;
  roundRect(d.x, d.y, d.w, d.h, 14);
  ctx.fillStyle = 'rgba(10,17,39,0.975)'; ctx.fill();
  ctx.lineWidth = offered ? 2 : 1.4; ctx.strokeStyle = offered ? P.color : P.color + '88'; ctx.stroke();

  const iconSize = T.sideDetail ? 44 : T.compact ? 40 : 38;
  const detailState = treeNodeVisualState(owned, offered, next);
  const db = iconBadge(tier.icon, P.color, Math.round(iconSize / 2), offered ? 'lit' : 'dim');
  ctx.globalAlpha = detailState === 'offered' ? 1 : detailState === 'owned' ? 0.84 : 0.58;
  ctx.drawImage(db, d.x + pad, d.y + pad, iconSize, iconSize);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `800 ${T.compact ? 9 : 9}px Orbitron, sans-serif`; ctx.fillStyle = P.color;
  ctx.fillText(skinPathName(pk) + ' · ' + pathRole(pk) + ' · TIER ' + (ti + 1) + '/4' + (ti === 3 ? ' · CAPSTONE' : ''), d.x + pad + iconSize + 9, d.y + pad + 2, d.w - pad * 2 - iconSize - 10);
  ctx.font = `900 ${T.compact ? 15 : Math.min(18, d.w / 19)}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
  ctx.fillText(junkieTierName(pk, ti), d.x + pad + iconSize + 9, d.y + pad + 17, d.w - pad * 2 - iconSize - 10);
  ctx.font = `800 ${T.compact ? 8.5 : 8}px Orbitron, sans-serif`; ctx.fillStyle = statusCol;
  ctx.fillText(status, d.x + pad + iconSize + 9, d.y + pad + (T.compact ? 34 : 39), d.w - pad * 2 - iconSize - 10);

  let y = d.y + pad + Math.max(iconSize + 8, 54);
  // the description is the panel's PAYLOAD: body size, and as many lines as
  // the sheet's real height allows (tall maps reclaim a dead band into this
  // panel — the old fixed 3-line cap left that space blank)
  const lineH = T.compact ? 16 : 18;
  ctx.font = bodyFont(T.compact ? 12 : 13, 650); ctx.fillStyle = '#d8e2ee';
  const reserveT = (T.compact ? 13 : 14) + (T.sideDetail ? 3 : 1) * (T.compact ? 13 : 14) + (T.sideDetail ? 118 : 16);
  const maxDescT = Math.max(2, Math.floor((T.reroll.y - 10 - y - reserveT) / lineH));
  const descLines = wrapText(tierDesc(pk, ti), d.w - pad * 2).slice(0, maxDescT);
  descLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * lineH, d.w - pad * 2));
  y += descLines.length * lineH + (T.compact ? 5 : 10);

  ctx.font = `800 ${T.compact ? 8.5 : 8}px Orbitron, sans-serif`; ctx.fillStyle = P.color;
  ctx.fillText(G.mode === 'junkie' ? 'VISIBLE ON PILOT' : 'VISIBLE ON RIG', d.x + pad, y, d.w - pad * 2);
  y += T.compact ? 13 : 14;
  ctx.font = bodyFont(10.5, 650); ctx.fillStyle = '#aebdca';
  const visualLines = wrapText(tier.visual || P.tell, d.w - pad * 2).slice(0, T.sideDetail ? 3 : 1);
  visualLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * (T.compact ? 13 : 14), d.w - pad * 2));
  y += visualLines.length * (T.compact ? 13 : 14) + 7;

  if (T.sideDetail && choice) {
    ctx.font = '800 7.5px Orbitron, sans-serif'; ctx.fillStyle = '#80d8ff';
    ctx.fillText((choice.tags || []).join('  +  '), d.x + pad, y, d.w - pad * 2);
    y += 15;
    ctx.fillStyle = '#90a4ae';
    ctx.fillText(choice.synergy || pathSummary(pk), d.x + pad, y, d.w - pad * 2);
  }

  // ---- PATH PROGRESS: the roomy side panel's dead space now shows where
  // this node sits in its path — all four tiers as slots (owned filled,
  // this node ringed, live offers glowing, the rest dim). Render-only.
  if (T.sideDetail) {
    const stripY = T.reroll.y - 96;
    if (stripY > y + 24) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '700 8px Orbitron, sans-serif'; ctx.fillStyle = '#78909c';
      ctx.fillText('PATH PROGRESS · ' + pathLvl(pk) + '/4 OWNED', d.x + pad, stripY - 10, d.w - pad * 2);
      const gap2 = 8, cellW = (d.w - pad * 2 - gap2 * 3) / 4, cellH = 62;
      for (let tt = 0; tt < 4; tt++) {
        const cx2 = d.x + pad + tt * (cellW + gap2);
        const ownedT = tt < pathLvl(pk), isSel = tt === ti;
        const offT = choiceIndexForTreeNode(treeSel.pi, tt) >= 0;
        const reachT = tt === pathLvl(pk);
        const stripState = treeNodeVisualState(ownedT, offT, reachT);
        ctx.save();
        if (offT) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; }
        roundRect(cx2, stripY, cellW, cellH, 9);
        ctx.fillStyle = ownedT ? mixHex(P.color, '#071022', 0.6) : offT ? mixHex(P.color, '#071022', 0.72) : 'rgba(255,255,255,0.035)'; ctx.fill();
        ctx.lineWidth = offT ? 2.2 : ownedT ? 1.3 : 1;
        ctx.strokeStyle = offT ? '#ffffff' : ownedT ? P.color : reachT ? P.color + '62' : 'rgba(255,255,255,0.09)';
        ctx.stroke();
        if (isSel && !offT) {
          ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(207,216,220,0.62)'; ctx.lineWidth = 1.2;
          roundRect(cx2 + 3, stripY + 3, cellW - 6, cellH - 6, 7); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.shadowBlur = 0;
        const badge2 = iconBadge(P.tiers[tt].icon, P.color, 9, offT ? 'lit' : 'dim');
        ctx.globalAlpha = TREE_NODE_ALPHA[stripState];
        ctx.drawImage(badge2, cx2 + cellW / 2 - badge2.width / 2, stripY + 16 - badge2.height / 2);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.font = '800 7px Orbitron, sans-serif';
        ctx.fillStyle = ownedT ? P.color : '#90a4ae';
        ctx.fillText(tt === 3 ? 'CAP' : 'TIER ' + (tt + 1), cx2 + cellW / 2, stripY + 34);
        ctx.font = '600 6.5px Orbitron, sans-serif';
        ctx.fillStyle = ownedT ? '#cfd8dc' : '#607d8b';
        ctx.fillText(junkieTierName(pk, tt), cx2 + cellW / 2, stripY + 48, cellW - 8);
        ctx.restore();
      }
      ctx.textAlign = 'left';
    }
  }

  drawTreeDetailButtons(T, offered, chosen, offer, P.color);
}

// Compact journey map shown between every stage. Nine persistent region nodes
// make the 27-wave campaign, boss cadence, and checkpoint-sized chunks legible
// without opening another screen.
function drawJourneyMap(y, compact = false) {
  const completed = Math.min(SKIN.gens.length, Math.floor((Math.max(1, G.level) - 1) / STAGES));
  const current = Math.min(SKIN.gens.length - 1, regionIdx(Math.max(1, G.level)));
  const mapW = Math.min(W * 0.86, compact ? 470 : 650);
  const x0 = W / 2 - mapW / 2;
  const step = mapW / (SKIN.gens.length - 1);
  ctx.save();
  ctx.lineWidth = compact ? 2 : 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + mapW, y); ctx.stroke();
  for (let i = 0; i < SKIN.gens.length; i++) {
    const x = x0 + i * step;
    const done = i < completed;
    const here = i === current && completed < SKIN.gens.length;
    const col = done || here ? SKIN.gens[i].accent : '#455a64';
    if (here) { ctx.shadowColor = col; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(x, y, here ? 7 : done ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = done ? col : here ? '#eaf7ff' : '#162235'; ctx.fill();
    ctx.lineWidth = here ? 2.5 : 1.5; ctx.strokeStyle = col; ctx.stroke();
    ctx.shadowBlur = 0;
    if (done) drawGlyph(ctx, 'star', x, y, 2.6, '#fff');
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${compact ? 8.5 : 10}px Orbitron, sans-serif`;
  ctx.fillStyle = completed >= SKIN.gens.length ? '#ffd54f' : SKIN.gens[current].accent;
  const regWord = (SKIN.strings && SKIN.strings.regionWord) || 'REGION'; // skin-owned noun (AFT-029)
  ctx.fillText(completed >= SKIN.gens.length ? 'ALL 9 ' + regWord + 'S CLEARED'
    : regWord + ' ' + (current + 1) + '/9 · ' + SKIN.gens[current].name + ' · STAGE ' + (stageIdx(G.level) + 1) + '/3',
    W / 2, y + (compact ? 17 : 20), mapW);
  ctx.restore();
}

// PAUSE (AFT-029): one centred sheet over the frozen fight — the header,
// the controls card (input → action rows), MUSIC, SETTINGS | QUIT, the
// primary RESUME slab, and the quiet ✦ CHEAT CODES chip (it lives ONLY
// here, never on screen during play). Geometry: pauseActionLayout().
// Pause never mirrors: the sheet is centred in every handedness.
function drawPauseSheet() {
  const P = pauseActionLayout();
  dim(0.76);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  uiPanel(P.panel.x, P.panel.y, P.panel.w, P.panel.h, { r: 18, accent: UI.player, bar: 'top' });
  const Hd = P.head, compact = Hd.h < 50;
  fitLabel('PAUSED', Hd.x + Hd.w / 2, Hd.y + (compact ? 13 : 20), { size: compact ? 20 : 26, min: 14, weight: 900, color: UI.ink, maxW: Hd.w });
  const where = G.level ? genFor(G.level).name + ' · STAGE ' + (stageIdx(G.level) + 1) + '/3' : '';
  fitLabel(where, Hd.x + Hd.w / 2, Hd.y + (compact ? 32 : 46), { size: 10.5, min: 8, weight: 800, color: UI.sub, maxW: Hd.w });
  if (P.help) {
    const Hp = P.help, lines = pauseHelpLines();
    uiPanel(Hp.x, Hp.y, Hp.w, Hp.h, { r: 12, soft: true });
    const lh = (Hp.h - 14) / lines.length;
    lines.forEach((raw, i) => {
      const l = lex(raw), cut = l.indexOf(' — ');
      const inp = cut >= 0 ? l.slice(0, cut) : l, act = cut >= 0 ? l.slice(cut + 3) : '';
      const y = Hp.y + 7 + lh * (i + 0.5);
      if (i) { ctx.fillStyle = UI.lineSoft; ctx.fillRect(Hp.x + 12, Hp.y + 7 + lh * i, Hp.w - 24, 1); }
      const ib = fitLabel(inp, Hp.x + 14, y, { size: 10, min: 7.5, weight: 900, color: UI.ink, align: 'left', maxW: Hp.w * 0.38 });
      if (act) { // help is must-read: a long action WRAPS to two lines, never ellipsizes
        const ao = { size: 10, min: 8.5, weight: 600, family: "Verdana, 'Segoe UI', system-ui, sans-serif",
          color: UI.sub, align: 'right', maxW: Hp.x + Hp.w - 14 - ib.x1 - 12, maxLines: 2 };
        const n = wrapLinesNeeded(act, ao);
        fitLabelWrap(act, Hp.x + Hp.w - 14, y - (n - 1) * Math.round(8.5 * 1.3) / 2, ao);
      }
    });
  }
  // AFT-021 P2: the sound toggle lives HERE — never a circle over live combat
  const mb = P.music, on = MUSIC.on;
  uiButton(mb, on ? 'MUSIC ON' : 'MUSIC OFF', { accent: on ? UI.player : UI.mute,
    sub: (on ? 'TAP TO MUTE' : 'TAP TO PLAY') + (IS_TOUCH ? '' : ' · M') });
  drawGlyph(ctx, 'sound', mb.x + 24, mb.y + mb.h / 2, 7, on ? UI.player : UI.mute);
  if (!on) {
    ctx.strokeStyle = UI.danger; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mb.x + 17, mb.y + mb.h / 2 + 7); ctx.lineTo(mb.x + 31, mb.y + mb.h / 2 - 7); ctx.stroke();
  }
  // Mid-run settings remove the old dead end where changing touch controls
  // required abandoning the journey. Quit stays visibly destructive (red).
  uiButton(P.settings, 'SETTINGS', { accent: UI.player });
  uiButton(P.quit, 'QUIT TO MENU', { accent: UI.danger });
  uiButton(P.resume, 'RESUME', { primary: true, accent: UI.player, sub: IS_TOUCH ? 'OR TAP ANYWHERE' : 'P · ESC · CLICK' });
  // ✦ CHEAT CODES — a small dashed chip: the seam marks it OUTSIDE the rules
  {
    const cb = P.cheat, hov = !IS_TOUCH && inRect(mouseX, lastMouseY, cb);
    const ch = Math.min(30, cb.h), cy = cb.y + cb.h / 2;
    roundRect(cb.x + 10, cy - ch / 2, cb.w - 20, ch, ch / 2);
    ctx.fillStyle = hov ? 'rgba(255,213,79,0.14)' : 'rgba(255,213,79,0.05)'; ctx.fill();
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2;
    ctx.strokeStyle = hov ? UI.gold : 'rgba(255,213,79,0.55)'; ctx.stroke();
    ctx.setLineDash([]);
    fitLabel('✦ CHEAT CODES', cb.x + cb.w / 2, cy + 0.5, { size: 10, min: 8, weight: 800, color: hov ? '#ffe082' : 'rgba(255,213,79,0.85)', maxW: cb.w - 30 });
  }
  ctx.restore();
  if (cheatOpen) drawCheats();
  if (advOpen) drawAdvanced();
}

// BOSS RUSH summary — the game-over sheet's rush branch: total (combat +
// penalties), the nine splits by realm, knockouts, NEW BEST. A rush that
// ended early (true game over) reads as FAILED and records nothing.
function drawRushSummary() {
  const L = rushSummaryLayout(), R = G.rush;
  const S = R.summary || { complete: false, total: rushTotal(), newBest: false, prior: null };
  const best = rushBest(R.mode, R.preset);
  const t = G.stateT;
  const head = S.newBest ? UI.gold : S.complete ? UI.player : UI.danger;
  dim(0.78);
  ctx.save();
  ctx.globalAlpha = Math.min(1, t / 0.25);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  uiPanel(L.px, L.py, L.pw, L.ph, { r: 20, accent: head, bar: 'top' });
  const Z = 'summary', B = L.body, cx = B.x + B.w / 2;
  const modeName = ((MODES.find(m => m.key === R.mode) || {}).label || R.mode).toUpperCase();
  const diffName = ((DIFFICULTY_UI[R.preset] || {}).name || R.preset).toUpperCase();
  const info = 'COMBAT ' + fmtRushTime(R.t) + ' · ' + R.kos + ' KNOCKOUT' + (R.kos === 1 ? '' : 'S')
    + (R.penalty ? ' (+' + R.penalty + 'S)' : '') + ' · ' + modeName + ' ' + diffName
    + (S.complete && !S.newBest && best ? ' · BEST ' + fmtRushTime(best.best) : '')
    + (G.cheated ? ' · CHEATS — NOT RECORDED' : '');
  const cols = L.narrow ? 1 : 3, rows = Math.ceil(RUSH_FINALES / cols);
  const short = L.ph < 420;
  const K = stackBlocks([
    { k: 'eyebrow', h: 22, opt: 1 },
    { k: 'hero', h: short ? 30 : 38, gap: 6 },
    { k: 'total', h: short ? 30 : 40, gap: 2 },
    { k: 'info', h: 30, gap: 4 },
    { k: 'splits', h: Math.min(rows * 40, Math.max(rows * 22, B.h - 170)), gap: 10 },
  ], B.y, B.y + B.h, B.x, B.w, 0.35);
  if (K.eyebrow) uiChip(cx, K.eyebrow.y + 11, rushName(), { align: 'center', color: head, size: 9.5, h: 22 });
  uiHero(S.newBest ? '★ NEW BEST ★' : S.complete ? 'COMPLETE' : 'FAILED', cx, K.hero.y + K.hero.h / 2, L.narrow ? 26 : 30, head, B.w, Z);
  fitLabel(fmtRushTime(S.total), cx, K.total.y + K.total.h / 2, { size: short ? 24 : 32, min: 14, weight: 900, color: UI.ink, maxW: B.w, zone: Z });
  fitLabelWrap(info, cx, K.info.y + 7, { size: 10, min: 9, weight: 800, color: UI.sub, maxW: B.w, maxLines: 2, zone: Z });
  // the nine splits — one column on phones, three on wide sheets
  const Sp = K.splits, g = 6;
  const cellH = (Sp.h - (rows - 1) * g) / rows, cellW = (Sp.w - (cols - 1) * 8) / cols;
  for (let i = 0; i < RUSH_FINALES; i++) {
    const col = cols === 1 ? 0 : i % cols, row = cols === 1 ? i : Math.floor(i / cols);
    const x = Sp.x + col * (cellW + 8), y = Sp.y + row * (cellH + g);
    const sp = R.splits[i], gn = SKIN.gens[i] || {};
    const here = !sp && i === R.splits.length && !S.complete; // where a failed rush fell
    uiPanel(x, y, cellW, cellH, { r: Math.min(10, cellH / 2), soft: !sp, lift: !!sp, accent: here ? UI.danger : sp ? gn.accent : null, bar: sp || here ? 'left' : null });
    const my = y + cellH / 2;
    const tTxt = sp ? fmtRushTime(sp.t) + (sp.kos ? ' · ' + sp.kos + ' KO' : '') : here ? 'FELL HERE' : '—';
    const tb = fitLabel(tTxt, x + cellW - 10, my, { size: cellH >= 30 ? 12 : 10, min: 8, weight: 900, align: 'right',
      color: sp ? UI.ink : here ? UI.danger : UI.mute, maxW: cellW * 0.46, zone: Z });
    fitLabel((i + 1) + '  ' + (gn.name || ''), x + 12, my, { size: cellH >= 30 ? 11 : 9.5, min: 7.5, weight: 800, align: 'left',
      color: sp ? (gn.accent || UI.sub) : UI.mute, maxW: Math.max(24, cellW - 30 - tb.w), zone: Z });
  }
  ctx.restore();
  const ready = t >= 0.45; // the killing blow's tap never skips the summary
  uiButton(L.title, '⌂ TITLE', { accent: UI.sub, disabled: !ready });
  uiButton(L.retry, '↻ RETRY ' + rushName(), { primary: true, accent: head === UI.danger ? UI.gold : head, disabled: !ready });
}
// GAME OVER (AFT-029): one sheet — eyebrow, the hero line, the score, where
// the run ended, the CAUSE card (red = the one danger read) with one
// actionable tip, six stat tiles, the most-used path, then three
// secondaries above ONE primary slab (CONTINUE when a checkpoint exists —
// progress is never wiped — RETRY otherwise). gameOverLayout() owns rects.
function drawGameOverSummary() {
  if (G.rush) { drawRushSummary(); return; }
  const L = gameOverLayout(), s = G.runSummary || {
    region: genFor(G.level).name, stage: stageIdx(G.level) + 1, level: G.level, score: G.score,
    bestRally: G.bestRally, maxCombo: G.maxCombo, catches: G.caughtRun, path: 'NO PATH YET', cause: 'RUN ENDED',
  };
  const t = G.stateT;
  const head = s.newRecord ? UI.gold : (genFor(G.level) || {}).accent || UI.player;
  dim(0.78);
  ctx.save();
  ctx.globalAlpha = Math.min(1, t / 0.25);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  uiPanel(L.px, L.py, L.pw, L.ph, { r: 20, accent: head, bar: 'top' });
  const Z = 'summary', B = L.body;
  const cause = String(s.cause || 'RUN ENDED');
  // one actionable tip matched to what actually ended the run
  const tip = /MISSED BALL/.test(cause) ? 'STAY UNDER THE BALL — A DRAFTED RALLY BARRIER GIVES A SECOND CHANCE'
    : /DANGER LINE/.test(cause) ? 'BREAK THE LOWEST ROWS FIRST TO HOLD THE LINE BACK'
      : /HEAVY/.test(cause) ? 'HEAVY BOLTS SPLASH ON IMPACT — DODGE WIDE, NOT CLOSE'
        : /BEAM/.test(cause) ? 'BEAMS TELEGRAPH FIRST — MOVE THE MOMENT THE WARNING GLOWS'
          : /ATTACK/.test(cause) ? 'SHOTS YOUR TYPE RESISTS BOUNCE OFF — SWAP TYPES WITH ELEMENT ORBS'
            : 'SHIELDS ABSORB ONE LETHAL HIT — DRAFT THE GUARD PATH EARLY';
  const metrics = [
    ['BEST RALLY', '×' + (s.bestRally || 0)], ['MAX COMBO', '×' + (s.maxCombo || 0)],
    ['BRICKS', s.bricks || 0], ['ITEMS', s.items || 0],
    ['CATCHES', s.catches || 0], ['HITS TAKEN', s.hits || 0],
  ];
  const colW = L.wide ? (B.w - 20) / 2 : B.w;
  const tipLines = wrapLinesNeeded('TIP · ' + tip, { size: 10, min: 9.5, weight: 600, family: "Verdana, 'Segoe UI', system-ui, sans-serif", maxW: colW - 28, maxLines: 2 });
  const short = H < 520;
  const tileH = short ? 42 : 52;
  const left = [
    { k: 'eyebrow', h: 22, opt: 2 },
    { k: 'hero', h: short ? 30 : 38, gap: 6 },
    { k: 'score', h: short ? 28 : 38, gap: 2 },
    { k: 'where', h: 16, gap: 4 },
    { k: 'cause', h: 40 + tipLines * 13, gap: 12 },
  ];
  const right = [
    { k: 'tiles', h: tileH * 2 + 8, gap: 12 },
    { k: 'path', h: 34, gap: 12, opt: 1 },
    G.trial ? { k: 'note', h: 14, gap: 8, opt: 3 } : null,
  ];
  const K = L.wide
    ? { ...stackBlocks(left, B.y, B.y + B.h, B.x, colW, 0.5), ...stackBlocks(right, B.y, B.y + B.h, B.x + colW + 20, colW, 0.5) }
    : stackBlocks([...left, ...right], B.y, B.y + B.h, B.x, B.w, 0.35);
  const cxOf = r => r.x + r.w / 2;
  if (K.eyebrow) uiChip(cxOf(K.eyebrow), K.eyebrow.y + 11, G.daily ? 'DAILY RUN' : G.trial ? 'TRIAL RUN' : 'JOURNEY', { align: 'center', color: head, size: 9.5, h: 22 });
  uiHero(s.newRecord ? '★ NEW RECORD ★' : (G.daily ? 'DAILY COMPLETE' : 'RUN COMPLETE'), cxOf(K.hero), K.hero.y + K.hero.h / 2, L.narrow ? 26 : 32, head, K.hero.w, Z);
  fitLabel(uiCount(s.score || 0, t, 0.15, 0.6).toLocaleString() + ' PTS', cxOf(K.score), K.score.y + K.score.h / 2, { size: short ? 22 : 30, min: 14, weight: 900, color: UI.ink, maxW: K.score.w, zone: Z });
  fitLabel(s.region + ' · STAGE ' + s.stage + '/3 · WAVE ' + s.level, cxOf(K.where), K.where.y + 8, { size: 10.5, min: 8, weight: 800, color: UI.sub, maxW: K.where.w, zone: Z });
  {
    const r = K.cause;
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: true, accent: UI.danger, bar: 'left' });
    fitLabel('FINAL CAUSE', r.x + 16, r.y + 14, { size: 8.5, min: 7.5, weight: 900, color: UI.mute, align: 'left', maxW: 110, zone: Z });
    fitLabel(cause, r.x + r.w - 14, r.y + 14, { size: 11, min: 8.5, weight: 900, color: UI.danger, align: 'right', maxW: r.w - 140, zone: Z });
    fitLabelWrap('TIP · ' + tip, r.x + 16, r.y + 34, { size: 10, min: 9.5, weight: 600, family: "Verdana, 'Segoe UI', system-ui, sans-serif",
      color: UI.sub, align: 'left', maxW: r.w - 28, maxLines: 2, zone: Z });
  }
  {
    const r = K.tiles, g = 8, cw = (r.w - g * 2) / 3;
    metrics.forEach((m, i) => uiStatTile({ x: r.x + (i % 3) * (cw + g), y: r.y + Math.floor(i / 3) * (tileH + 8), w: cw, h: tileH },
      m[0], m[1], { zone: Z, size: short ? 14 : 17 }));
  }
  if (K.path) {
    const r = K.path;
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: true });
    fitLabel('MOST-USED PATH', r.x + 14, r.y + r.h / 2, { size: 8.5, min: 7.5, weight: 900, color: UI.mute, align: 'left', maxW: 120, zone: Z });
    fitLabel(s.path, r.x + r.w - 14, r.y + r.h / 2, { size: 11.5, min: 8.5, weight: 900, color: UI.gold, align: 'right', maxW: r.w - 150, zone: Z });
  }
  if (K.note) fitLabel('TRIAL RUN · SCORE AND CATCHES WERE NOT SAVED', cxOf(K.note), K.note.y + 7, { size: 9.5, min: 8, weight: 700, color: UI.mute, maxW: K.note.w, zone: Z });
  ctx.restore();
  if (G.daily) uiButton(L.share, G.shareToast > 0 ? '✓ RESULT READY' : 'SHARE DAILY RESULT', { accent: UI.player });
  const labels = ['↻ RETRY', RUN_CKPT && !G.daily && !G.trial ? '▶ CONTINUE' : '＋ NEW RUN', '⚙ TRIAL', '⌂ TITLE'];
  labels.forEach((label, i) => {
    const prim = i === L.primary;
    uiButton(L.button(i), label, prim ? { primary: true, accent: UI.player, sub: i === 1 ? 'FROM YOUR LAST CHECKPOINT' : null } : { accent: i === 0 ? UI.gold : UI.sub });
  });
}

// ============================================================
//  THE NINEFOLD DAWN — the campaign ending (WORLD_BOSS_FINALE_PLAN §7).
//  Five beats: silence → the night sky CRACKS and shatters into daylight →
//  nine region ribbons form one impossible panorama → the journey becomes a
//  constellation → dawn, THE WAVE IS BROKEN, and the explicit TIME SPIRAL /
//  TITLE choice. reduceFlash swaps the white burst for a gold edge wipe and
//  outlined shards; nothing here allocates in hot loops beyond a handful of
//  gradients on a single non-combat screen.
// ============================================================
function drawEnding() {
  const E = G.ending;
  if (!E) return;
  const t = E.t, rf = SETTINGS.reduceFlash;
  const ease = q => q * q * (3 - 2 * q);
  // ---- the DAWN behind everything: revealed as the night breaks ----
  const dawn = ctx.createLinearGradient(0, 0, 0, H);
  dawn.addColorStop(0, '#ffe9b8'); dawn.addColorStop(0.45, '#ffc98a'); dawn.addColorStop(1, '#ff9e6d');
  ctx.fillStyle = dawn; ctx.fillRect(0, 0, W, H);
  // beat-5 sun cresting the combined horizon
  if (E.beat >= 4) {
    const sp = ease(Math.min(1, Math.max(0, (t - ENDING_BEATS[2] - 4) / 8)));
    const sy = H * 0.78 - sp * H * 0.1, sr = Math.min(W, H) * (0.1 + sp * 0.06);
    const sg = ctx.createRadialGradient(W / 2, sy, 2, W / 2, sy, sr * 3.4);
    sg.addColorStop(0, 'rgba(255,255,255,0.95)'); sg.addColorStop(0.25, 'rgba(255,236,170,0.6)');
    sg.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(W / 2, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
  // ---- beat 3+: nine region ribbons — one continuous impossible panorama.
  // Each carries its region's accent palette and one recognisable landmark.
  if (E.beat >= 3) {
    const rw = W / 9;
    for (let i = 0; i < 9; i++) {
      const enter = ease(Math.min(1, Math.max(0, (t - (ENDING_BEATS[1] + i * 0.85)) / 1.1)));
      if (enter <= 0) continue;
      const x0 = i * rw, base = H * 0.74, hgt = H * (0.16 + 0.05 * Math.sin(i * 2.1)) * enter;
      const col = SKIN.gens[i].accent || '#66bb6a';
      ctx.globalAlpha = 0.85 * enter;
      const g2 = ctx.createLinearGradient(0, base - hgt, 0, base + H * 0.26);
      g2.addColorStop(0, col); g2.addColorStop(1, mixHex(col, '#331c08', 0.55));
      ctx.fillStyle = g2;
      ctx.beginPath(); // rolling silhouette band that joins its neighbours
      ctx.moveTo(x0, base + H * 0.26); ctx.lineTo(x0, base);
      ctx.quadraticCurveTo(x0 + rw * 0.5, base - hgt, x0 + rw, base);
      ctx.lineTo(x0 + rw, base + H * 0.26); ctx.closePath(); ctx.fill();
      drawEndingLandmark(i, x0 + rw / 2, base - hgt * 0.35, Math.min(rw * 0.62, 74), mixHex(col, '#140a04', 0.62), enter);
      // the cleared node stamps above its ribbon with a boss-colour ring
      const stampT = Math.min(1, Math.max(0, (t - (ENDING_BEATS[1] + 1 + i * 0.85)) / 0.5));
      if (stampT > 0) {
        ctx.globalAlpha = enter;
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x0 + rw / 2, base - hgt - 22, 6 + stampT * 8 * (rf ? 0.5 : 1), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x0 + rw / 2, base - hgt - 22, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  // ---- beat 4: the journey becomes the sky — caught Pokémon spiral in as a
  // living constellation; the nine legendaries salute for one second.
  if (E.beat >= 4) {
    const bt = t - ENDING_BEATS[2];
    const ids = Array.from(DEX).slice(0, 24);
    const ccx = W / 2, ccy = H * 0.36;
    for (let i = 0; i < ids.length; i++) {
      const a = ease(Math.min(1, Math.max(0, (bt - i * 0.18) / 0.9)));
      if (a <= 0) continue;
      const ang = i * 0.62 + bt * 0.12, rr = (26 + i * 9) * a;
      const px2 = ccx + Math.cos(ang) * rr, py2 = ccy + Math.sin(ang) * rr * 0.62;
      const spr = getSprite(ids[i]);
      ctx.globalAlpha = 0.85 * a;
      if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, px2 - 13, py2 - 13, 26, 26);
      ctx.globalAlpha = 1;
    }
    // subtle stars keep uncaught slots from reading as a penalty
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = ids.length; i < 24; i++) {
      const ang = i * 0.62 + bt * 0.12, rr = 26 + i * 9;
      ctx.fillRect(ccx + Math.cos(ang) * rr, ccy + Math.sin(ang) * rr * 0.62, 2, 2);
    }
    const salute = Math.max(0, Math.min(1, (bt - 5) / 0.4)) * Math.max(0, Math.min(1, (7 - bt) / 0.8));
    if (salute > 0) {
      for (let i = 0; i < 9; i++) {
        const sil = getSilhouette(SKIN.gens[i].boss.id, SKIN.gens[i].accent);
        if (!sil) continue;
        const ang = -Math.PI / 2 + i * Math.PI * 2 / 9;
        ctx.globalAlpha = 0.6 * salute;
        ctx.drawImage(sil, ccx + Math.cos(ang) * W * 0.3 - 20, ccy + Math.sin(ang) * H * 0.2 - 20, 40, 40);
      }
      ctx.globalAlpha = 1;
    }
  }
  // ---- the NIGHT LID on top: intact in beat 1, cracking in beat 2, then
  // breaking apart into large deliberate glass shards that fall away.
  const crackT = Math.max(0, t - ENDING_BEATS[0]);          // crack spreads 3s→6.5s
  const shatterT = Math.max(0, t - (ENDING_BEATS[0] + 3.5)); // shards fall from 6.5s
  if (E.beat <= 2 || shatterT < 6) {
    if (shatterT <= 0) {
      const night = ctx.createLinearGradient(0, 0, 0, H);
      night.addColorStop(0, '#05060f'); night.addColorStop(1, '#0c1226');
      ctx.fillStyle = night; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 137.5) % W, (i * 71.3) % (H * 0.8), 1.6, 1.6);
      // the partner's glow is the only living light in beat one
      drawEndingPartner(W / 2, H * 0.62, 1);
      // Koraidon's crack, spreading like glass from the zenith
      if (crackT > 0 || E.beat >= 1) {
        const spread = ease(Math.min(1, (E.beat === 1 ? 0.12 : 0.12 + crackT / 3.2)));
        ctx.save();
        ctx.strokeStyle = rf ? '#ffd54f' : '#fff8e1';
        ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = rf ? 4 : 14;
        for (let b2 = 0; b2 < 7; b2++) {
          const ba = Math.PI * 0.5 + (b2 - 3) * 0.42;
          const len = (H * 0.9) * spread * (0.5 + ((b2 * 73) % 10) / 18);
          ctx.lineWidth = b2 === 3 ? 3 : 1.5;
          ctx.beginPath(); ctx.moveTo(W / 2, -4);
          let px3 = W / 2, py3 = -4;
          for (let s2 = 1; s2 <= 5; s2++) {
            px3 += Math.cos(ba + Math.sin(b2 * 9 + s2 * 4) * 0.5) * len / 5;
            py3 += Math.sin(ba) * len / 5;
            ctx.lineTo(px3, py3);
          }
          ctx.stroke();
          // warm daylight bleeding through the widest cracks
          if (spread > 0.5 && !rf) {
            ctx.save(); ctx.globalAlpha = (spread - 0.5) * 1.4; ctx.lineWidth = 6;
            ctx.strokeStyle = 'rgba(255,214,130,0.35)'; ctx.stroke(); ctx.restore();
          }
        }
        ctx.restore();
      }
    } else {
      // the lid is broken: shards of night fall away over the dawn
      for (const sh of E.shards) {
        const fall = shatterT * (0.7 + sh.v);
        const sx2 = sh.u * W + sh.vx * fall, sy2 = sh.v * H + sh.vy * fall * (1 + fall * 0.4);
        if (sy2 > H + 80) continue;
        ctx.save();
        ctx.translate(sx2, sy2); ctx.rotate(sh.rot + sh.vr * fall);
        ctx.globalAlpha = Math.max(0, 1 - shatterT / 5.5);
        ctx.fillStyle = '#0a0f22';
        ctx.strokeStyle = rf ? '#ffd54f' : 'rgba(255,244,214,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < sh.sides + 2; k++) {
          const aa = k * Math.PI * 2 / (sh.sides + 2);
          const rr2 = sh.r * (0.7 + 0.3 * Math.sin(k * 2.7 + sh.u * 9));
          k ? ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2) : ctx.moveTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // one bright release the instant it breaks (gold edge wipe on reduceFlash)
      const flash = Math.max(0, 0.8 - shatterT) / 0.8;
      if (flash > 0) {
        ctx.fillStyle = rf ? `rgba(255,213,79,${flash * 0.25})` : `rgba(255,251,235,${flash * 0.75})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }
  // partner front and centre once the world has returned
  if (E.beat >= 3) drawEndingPartner(W / 2, H * 0.4 - Math.min(1, (t - ENDING_BEATS[1]) / 3) * H * 0.06, Math.min(1, (t - ENDING_BEATS[1]) / 1.2));
  // ---- beat 5: dawn and completion ----
  if (E.beat >= 5) {
    const bt = t - ENDING_BEATS[3];
    const a = ease(Math.min(1, bt / 1.2));
    ctx.globalAlpha = a;
    // dark warm title with a gold halo — pure gold washes out on the dawn sky
    const ts2 = Math.min(40, W / 14);
    ctx.font = `900 ${ts2}px Orbitron, sans-serif`;
    ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#7a3312';
    ctx.fillText('THE WAVE IS BROKEN', W / 2, H * 0.16, W * 0.94);
    ctx.shadowBlur = 0;
    ctx.font = '800 12px Orbitron, sans-serif'; ctx.fillStyle = '#7a4a12';
    ctx.fillText('9 REGIONS · 27 STAGES · JOURNEY COMPLETE', W / 2, H * 0.16 + ts2 * 0.85, W * 0.9);
    const s = G.runSummary || {};
    const modeLabel = (MODES.find(m => m.key === G.mode) || MODES[0]).label;
    const lines = [
      (s.score || G.score).toLocaleString() + ' PTS · ' + modeLabel + ' · ' + preset().label,
      SKIN.strings.partnerWord + ' ' + (pilotInfo().id > 0 ? (SKIN.names[pilotInfo().id] || SKIN.strings.partnerWord).toUpperCase() : 'TRAINING DRONE')
        + ' · ' + (s.catches || G.caughtRun) + ' CATCHES · ' + ((G.runStats && G.runStats.bossesDefeated) || 0) + ' BOSSES',
      s.path && s.path !== 'NO PATH YET' ? 'FAVOURITE PATH · ' + s.path : null,
      G.secret && G.secret.completed ? (SKIN.secret.conquered || 'KANTO RIFT · CONQUERED') : null,
    ].filter(Boolean);
    // a soft parchment panel keeps the record readable over the panorama
    const panW = Math.min(W * 0.86, 520), panH = 26 + lines.length * 22;
    roundRect(W / 2 - panW / 2, H * 0.66 - 18, panW, panH, 14);
    ctx.fillStyle = 'rgba(255,248,230,0.82)'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(122,74,18,0.45)'; ctx.stroke();
    ctx.font = bodyFont(11.5, 700);
    lines.forEach((l, i) => { ctx.fillStyle = i ? '#6b3f10' : '#4a2a08'; ctx.fillText(l, W / 2, H * 0.66 + i * 22, panW - 24); });
    ctx.globalAlpha = 1;
    if (E.done) {
      const B = endingButtons();
      for (const [b, label2, col2] of [
        [B.spiral, '↻ TIME SPIRAL', '#d780ff'],
        [B.title, '⌂ RETURN TO TITLE', '#4a2a08'],
      ]) {
        const hov = inRect(mouseX, lastMouseY, b);
        roundRect(b.x, b.y, b.w, b.h, 12);
        ctx.fillStyle = hov ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = col2; ctx.stroke();
        ctx.font = `900 ${W < 480 ? 10 : 12}px Orbitron, sans-serif`;
        ctx.fillStyle = col2;
        ctx.fillText(label2, b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 12);
      }
      ctx.font = bodyFont(9, 600); ctx.fillStyle = 'rgba(74,42,8,0.8)';
      ctx.fillText('TIME SPIRAL LOOPS THE JOURNEY WITH HARDER SKIES', W / 2, endingButtons().spiral.y - 12, W * 0.9);
    }
  } else if (t > 1.4 && !E.seenBefore) {
    ctx.font = bodyFont(9.5, 600); ctx.fillStyle = E.beat <= 2 ? 'rgba(207,216,220,0.5)' : 'rgba(74,42,8,0.55)';
    ctx.fillText('TAP TO CONTINUE', W / 2, H - 18 - SAFE_B);
  }
}
// the pilot/partner as the ending's protagonist — sprite when there is one,
// the neutral drone otherwise, always wearing its element glow
function drawEndingPartner(x, y, a) {
  const pil = pilotInfo();
  const col = TYPE_COLORS[pil.t] || '#80d8ff';
  const bob = Math.sin(G.time * 1.6) * 4;
  ctx.save();
  ctx.globalAlpha = a;
  const gg = ctx.createRadialGradient(x, y + bob, 2, x, y + bob, 54);
  gg.addColorStop(0, col + '66'); gg.addColorStop(1, col + '00');
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.arc(x, y + bob, 54, 0, Math.PI * 2); ctx.fill();
  const img = affinityVesselImage(pil.id);
  if (img && img.complete && img.naturalWidth) {
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    drawAffinityVessel(pil.id, x, y + bob, 60);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#e3f2fd';
    ctx.beginPath(); ctx.arc(x, y + bob, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// nine pocket landmarks, one per region — small vector icons that make each
// ribbon identifiable at a glance (windmill, pagoda, crater sea, mountain,
// skyline, tower, palm, stadium, academy clock)
function drawEndingLandmark(i, x, y, s, col, a) {
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, s * 0.05);
  const u = s / 2;
  if (i === 0) { // Kanto windmill
    ctx.beginPath(); ctx.moveTo(x - u * 0.16, y + u); ctx.lineTo(x, y - u * 0.1); ctx.lineTo(x + u * 0.16, y + u); ctx.closePath(); ctx.fill();
    for (let b2 = 0; b2 < 4; b2++) {
      const aa = b2 * Math.PI / 2 + Math.PI / 5;
      ctx.beginPath(); ctx.moveTo(x, y - u * 0.1); ctx.lineTo(x + Math.cos(aa) * u * 0.62, y - u * 0.1 + Math.sin(aa) * u * 0.62); ctx.stroke();
    }
  } else if (i === 1) { // Johto pagoda tiers
    for (let r2 = 0; r2 < 3; r2++) {
      const w2 = u * (1 - r2 * 0.26), y2 = y + u * 0.7 - r2 * u * 0.55;
      ctx.beginPath(); ctx.moveTo(x - w2, y2); ctx.lineTo(x + w2, y2); ctx.lineTo(x + w2 * 0.6, y2 - u * 0.34); ctx.lineTo(x - w2 * 0.6, y2 - u * 0.34); ctx.closePath(); ctx.fill();
    }
  } else if (i === 2) { // Hoenn crater sea
    ctx.beginPath(); ctx.arc(x, y + u * 0.5, u * 0.85, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - u * 0.85, y + u * 0.42, u * 1.7, u * 0.14);
  } else if (i === 3) { // Sinnoh peak
    ctx.beginPath(); ctx.moveTo(x - u, y + u); ctx.lineTo(x - u * 0.2, y - u * 0.7); ctx.lineTo(x + u * 0.25, y + u * 0.05); ctx.lineTo(x + u * 0.7, y - u * 0.25); ctx.lineTo(x + u, y + u); ctx.closePath(); ctx.fill();
  } else if (i === 4) { // Unova skyline
    for (let b2 = 0; b2 < 4; b2++) ctx.fillRect(x - u + b2 * u * 0.55, y + u - u * (0.7 + ((b2 * 37) % 5) / 6), u * 0.4, u * (0.7 + ((b2 * 37) % 5) / 6));
  } else if (i === 5) { // Kalos prism tower
    ctx.beginPath(); ctx.moveTo(x - u * 0.34, y + u); ctx.lineTo(x, y - u * 0.85); ctx.lineTo(x + u * 0.34, y + u); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - u * 0.85, u * 0.12, 0, Math.PI * 2); ctx.fill();
  } else if (i === 6) { // Alola palm
    ctx.beginPath(); ctx.moveTo(x - u * 0.08, y + u); ctx.quadraticCurveTo(x - u * 0.05, y, x + u * 0.14, y - u * 0.5); ctx.lineTo(x + u * 0.26, y - u * 0.45); ctx.quadraticCurveTo(x + u * 0.05, y + u * 0.1, x + u * 0.12, y + u); ctx.closePath(); ctx.fill();
    for (let b2 = 0; b2 < 4; b2++) {
      const aa = -Math.PI * 0.75 + b2 * 0.42;
      ctx.beginPath(); ctx.moveTo(x + u * 0.2, y - u * 0.48);
      ctx.quadraticCurveTo(x + u * 0.2 + Math.cos(aa) * u * 0.5, y - u * 0.48 + Math.sin(aa) * u * 0.5, x + u * 0.2 + Math.cos(aa) * u * 0.72, y - u * 0.48 + Math.sin(aa) * u * 0.3);
      ctx.stroke();
    }
  } else if (i === 7) { // Galar stadium arch
    ctx.lineWidth = Math.max(2, s * 0.1);
    ctx.beginPath(); ctx.arc(x, y + u * 0.8, u * 0.85, Math.PI, 0); ctx.stroke();
    ctx.fillRect(x - u * 0.95, y + u * 0.72, u * 1.9, u * 0.16);
  } else { // Paldea academy clock
    ctx.beginPath(); ctx.moveTo(x - u * 0.7, y + u); ctx.lineTo(x - u * 0.4, y - u * 0.4); ctx.lineTo(x, y - u * 0.75); ctx.lineTo(x + u * 0.4, y - u * 0.4); ctx.lineTo(x + u * 0.7, y + u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9b8';
    ctx.beginPath(); ctx.arc(x, y - u * 0.28, u * 0.16, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ============================================================
// AFT-029 BETWEEN-COMBAT PANELS — results, draft, Forge, pause, game over,
// BOSS RUSH. Everything below builds on the UI kit at the top of this file
// (uiPanel / uiButton / uiChip / uiEnter / uiStage) and lays out through
// ONE function per surface shared with input (resultsLayout,
// upgradeLayout, pauseActionLayout, gameOverLayout, rushSummaryLayout).
// Presentation only: no gameRand, no sim writes.
// ============================================================
// The deep scrim over the static arena plate: the plate stays faintly
// visible (the place you just cleared), the panels own the contrast.
function uiScrim(accent, a = 0.82) {
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * a;
  uiStage(accent);
  ctx.globalAlpha = a0;
}
// THE one glowing line a screen may carry (its hero headline).
function uiHero(text, x, y, size, color, maxW, zone) {
  ctx.save();
  if (!SETTINGS.reduceFlash) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
  const b = fitLabel(text, x, y, { size, min: Math.min(15, size), weight: 900, color, maxW, zone });
  ctx.restore();
  return b;
}
// A state disc: 'done' (filled check), 'fail' (red cross), 'open' (hollow).
function uiStateIcon(x, y, r, state, color) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (state === 'done') {
    ctx.fillStyle = color || UI.good; ctx.fill();
    ctx.strokeStyle = UI.dark; ctx.lineWidth = Math.max(1.6, r * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.42, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.34); ctx.lineTo(x + r * 0.44, y - r * 0.3); ctx.stroke();
  } else if (state === 'fail') {
    ctx.lineWidth = 1.5; ctx.strokeStyle = UI.danger; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.2);
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y - r * 0.35); ctx.lineTo(x + r * 0.35, y + r * 0.35);
    ctx.moveTo(x + r * 0.35, y - r * 0.35); ctx.lineTo(x - r * 0.35, y + r * 0.35); ctx.stroke();
  } else {
    ctx.lineWidth = 1.5; ctx.strokeStyle = UI.mute; ctx.stroke();
  }
  ctx.restore();
}
// Wrapped body copy inside a box: shrinks toward `min` before it ever
// cuts, and only then ellipsizes the last line. o: size, min, weight,
// color, align ('left'|'center'), valign ('top'|'middle'), italic.
// Returns the height used.
function uiTextBlock(text, x, y, w, maxH, o = {}) {
  if (!text || maxH < 8 || w < 20) return 0;
  const weight = o.weight || 600, minS = o.min || 9;
  let size = o.size || 11, lines, lh;
  for (;;) {
    ctx.font = (o.italic ? 'italic ' : '') + bodyFont(size, weight);
    lines = wrapText(text, w); lh = Math.round(size * 1.34);
    if (lines.length * lh <= maxH || size <= minS) break;
    size = Math.max(minS, size - 0.5);
  }
  const cap = Math.max(1, Math.floor(maxH / lh));
  if (lines.length > cap) {
    lines = lines.slice(0, cap);
    let last = lines[cap - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > w) last = last.slice(0, -1);
    lines[cap - 1] = last.replace(/\s+$/, '') + '…';
  }
  const used = lines.length * lh;
  const y0 = o.valign === 'middle' ? y + (maxH - used) / 2 : y;
  ctx.fillStyle = o.color || UI.sub;
  const pa = ctx.textAlign;
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
  const ax = o.align === 'center' ? x + w / 2 : o.align === 'right' ? x + w : x;
  lines.forEach((ln, i) => ctx.fillText(ln, ax, y0 + i * lh + lh / 2));
  ctx.textAlign = pa;
  return used;
}
// A numeral that counts up as the surface settles (presentation only).
function uiCount(target, t, delay = 0.25, dur = 0.7) {
  const k = Math.max(0, Math.min(1, (t - delay) / dur));
  return Math.round((target || 0) * (1 - Math.pow(1 - k, 3)));
}
// A stat tile: a small panel, a big numeral, a quiet caps label under it.
function uiStatTile(r, label, value, o = {}) {
  uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: !o.lift, lift: o.lift, accent: o.accent, bar: o.bar ? 'top' : null });
  const big = o.size || (r.h >= 66 ? 24 : r.h >= 50 ? 18 : 15);
  const vy = r.y + r.h * (o.label === false ? 0.5 : 0.44);
  fitLabel(String(value), r.x + r.w / 2, vy, { size: big, min: 10, weight: 900, color: o.color || UI.ink, maxW: r.w - 14, zone: o.zone });
  if (label) fitLabel(label, r.x + r.w / 2, r.y + r.h - Math.max(11, r.h * 0.2), { size: r.h >= 60 ? 10 : 9, min: 7.5, weight: 800, color: UI.mute, maxW: r.w - 12, zone: o.zone });
}
// A pill tag with a SOLID fill and dark ink (the card KIND tag). Returns w.
function uiTag(x, y, text, color, o = {}) {
  const size = o.size || 8.5, h = o.h || 15;
  ctx.font = `900 ${size}px Orbitron, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 12;
  const x0 = o.align === 'center' ? x - w / 2 : x;
  roundRect(x0, y - h / 2, w, h, h / 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = UI.dark; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x0 + w / 2, y + 0.5);
  return w;
}
function fmtClock(s) {
  s = Math.max(0, Math.round(s || 0));
  return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : s + 'S';
}

// ---- STAGE RESULTS (Milestone 1 → AFT-029): the one-tap interstitial
// between a cleared wave and the draft. Reads G.results (buildStageResults,
// state.js) and lays out through resultsLayout() (config.js): a headline,
// three stat tiles, the combat ledger, objective/finale rows, the mastery
// list with medal states, NEXT, and the CONTINUE slab. The whole screen is
// the tap target (advanceResults keeps its 0.45s dwell gate); the slab is
// the one "tap to continue" affordance.
function drawResults() {
  const R = G.results;
  if (!R) return;
  const t = G.stateT;
  const gen = SKIN.gens[regionIdx(R.lvl)] || SKIN.gens[0];
  const accent = gen.accent;
  const L = resultsLayout(), K = L.rects;
  const fade = Math.min(1, t / 0.3);
  ctx.save();
  ctx.globalAlpha = fade; uiScrim(accent, 0.8);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let idx = 0;
  const block = (k, fn) => {
    const r = K[k]; if (!r) return;
    const e = uiEnter(t - 0.06 - (idx++) * 0.045, 0.24);
    ctx.save(); ctx.globalAlpha = fade * e.a; ctx.translate(0, e.dy);
    fn(r);
    ctx.restore();
  };
  const Z = 'results';
  const si = stageIdx(R.lvl);
  const regWord = (SKIN.strings && SKIN.strings.regionWord) || 'REGION';
  block('eyebrow', r => uiChip(r.x + r.w / 2, r.y + r.h / 2,
    (R.rushSplit != null ? rushName() + ' · ' : regWord + ' ' + (regionIdx(R.lvl) + 1) + '/9 · ') + (R.stage || '') + ' · ' + (si + 1) + '/3',
    { align: 'center', color: accent, size: 9.5, h: 22 }));
  block('hero', r => uiHero('STAGE CLEAR', r.x + r.w / 2, r.y + r.h / 2 + 2,
    L.short ? 26 : Math.min(40, W / 10), accent, r.w, Z));
  block('sub', r => fitLabelWrap(resultsSubline(R), r.x + r.w / 2, r.y + 7,
    { size: 12, min: 10, weight: 700, color: UI.sub, maxW: r.w - 8, maxLines: 2, zone: Z }));
  block('tiles', r => {
    const g = 8, w3 = (r.w - g * 2) / 3;
    const T = (i) => ({ x: r.x + i * (w3 + g), y: r.y, w: w3, h: r.h });
    const timeTxt = R.rushSplit != null ? fmtRushTime(R.rushSplit) : fmtClock(uiCount(R.t, t, 0.2));
    uiStatTile(T(0), R.rushSplit != null ? 'SPLIT ' + R.rushIdx + '/' + RUSH_FINALES : 'TIME', timeTxt, { zone: Z });
    uiStatTile(T(1), 'DEFEATED', uiCount(R.kills, t, 0.28), { zone: Z });
    uiStatTile(T(2), 'SCORE', uiCount(R.score, t, 0.36).toLocaleString(), { zone: Z, color: UI.gold, lift: true, accent: UI.gold });
  });
  block('ledger', r => {
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: true });
    const hits = R.hitsTaken || 0;
    const cells = [[hits === 0 ? 'NONE' : String(hits), hits === 0 ? 'HITS TAKEN' : (R.topFam ? 'HITS · ' + String(R.topFam).toUpperCase() : 'HITS TAKEN'), hits === 0 ? UI.good : UI.danger]];
    if (G.mode === 'classic') {
      cells.push([String(R.catches || 0), 'CATCHES', UI.ink], [String(R.megas || 0), lex('MEGA'), UI.ink]);
    } else {
      cells.push([String(R.shotsN || 0), 'SHOTS', UI.ink],
        [String(R.shotsC || 0), R.overheats ? 'CHARGED · ' + R.overheats + ' OVERHEAT' + (R.overheats > 1 ? 'S' : '') : 'CHARGED', UI.ink]);
    }
    const cw = r.w / cells.length;
    cells.forEach(([v, lab, col], i) => {
      const x = r.x + cw * i;
      if (i) { ctx.fillStyle = UI.line; ctx.fillRect(x, r.y + 8, 1, r.h - 16); }
      fitLabel(v, x + cw / 2, r.y + r.h * 0.38, { size: L.short ? 12 : 14, min: 9, weight: 900, color: col, maxW: cw - 10, zone: Z });
      fitLabel(lab, x + cw / 2, r.y + r.h * 0.76, { size: 8.5, min: 7, weight: 800, color: UI.mute, maxW: cw - 10, zone: Z });
    });
  });
  // AFT-021 P1: the completion VERBS — a non-attrition win (dispersed,
  // rescued, neutralized) reads as an achievement, never as missed kills
  block('outcomes', r => {
    const oc = R.outcomes || {};
    const parts = [];
    if (oc.dispersed) parts.push(oc.dispersed + ' DISPERSED');
    if (oc.rescued) parts.push(oc.rescued + ' RESCUED');
    if (oc.neutralized) parts.push(oc.neutralized + ' NEUTRALIZED');
    fitLabel(parts.join('   ·   '), r.x + r.w / 2, r.y + r.h / 2, { size: 10.5, min: 8.5, weight: 800, color: UI.good, maxW: r.w, zone: Z });
  });
  // ENCOUNTER OBJECTIVE outcome (M3 Round C)
  block('objective', r => {
    const ok = !!R.objectiveDone;
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: true, accent: ok ? UI.good : UI.danger, bar: 'left' });
    uiStateIcon(r.x + 22, r.y + r.h / 2, 9, ok ? 'done' : 'fail');
    const chipW = 0;
    fitLabel('OBJECTIVE', r.x + 40, r.y + r.h / 2 - 7, { size: 8.5, min: 7.5, weight: 800, color: UI.mute, align: 'left', maxW: 120, zone: Z });
    fitLabel(String(R.objective).toUpperCase(), r.x + 40, r.y + r.h / 2 + 7, { size: 11.5, min: 9, weight: 800, color: UI.ink, align: 'left', maxW: r.w - 140 - chipW, zone: Z });
    fitLabel(ok ? 'COMPLETE' : 'FAILED', r.x + r.w - 14, r.y + r.h / 2, { size: 10.5, min: 8, weight: 900, color: ok ? UI.good : UI.danger, align: 'right', maxW: 90, zone: Z });
  });
  // AFT-020/021: the finale names its MASTERY as completed verbs
  block('finale', r => {
    const fc = resultsFinaleCopy(R);
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: true, accent: fc.color, bar: 'left' });
    const ty = r.y + (L.compact ? 14 : 17), ly = r.y + (L.compact ? 31 : 37);
    const vw = uiChip(r.x + r.w - 12, ty, fc.verdict, { align: 'right', color: fc.color, size: 9, h: 20 });
    fitLabel(R.finaleTitle || 'FINALE', r.x + 16, ty, { size: 12, min: 9, weight: 900, color: UI.ink, align: 'left', maxW: r.w - vw - 36, zone: Z });
    const w = fitLabelWrap(fc.line, r.x + 16, ly, { size: 10.5, min: 10, weight: 600, family: "Verdana, 'Segoe UI', system-ui, sans-serif",
      color: UI.sub, align: 'left', maxW: r.w - 30, maxLines: 2, zone: Z });
    if (R.finaleCounters) {
      const verbMap = { cleanPasses: 'CLEAN PASSES', passes: 'PASSES', blooms: 'BLOOMS', stations: 'STATIONS',
        segmentsBroken: 'SEGMENTS BROKEN', sibyls: 'CLOCKS WOKEN', marks: 'MARKS', tags: 'TAGS',
        locks: 'LOCKS BROKEN', chains: 'CHAINS BROKEN', cells: 'REAL CELLS', freed: 'FREED', redirects: 'REDIRECTS', wish: 'WISH' };
      const verbs = Object.entries(R.finaleCounters).filter(([k, v]) => verbMap[k] && v > 0).slice(0, 4).map(([k, v]) => v + ' ' + verbMap[k]);
      if (verbs.length) fitLabel(verbs.join('  ·  '), r.x + 16, ly + w.n * w.lineH + 2,
        { size: 9.5, min: 8, weight: 800, color: fc.color, align: 'left', maxW: r.w - 30, zone: Z });
    }
  });
  block('mlabel', r => {
    const n = (R.objectives || []).length, done = (R.objectives || []).filter(o => o.done).length;
    fitLabel('MASTERY OBJECTIVES', r.x + 2, r.y + r.h / 2, { size: 10, min: 8, weight: 900, color: UI.sub, align: 'left', maxW: r.w * 0.6, zone: Z });
    fitLabel(done + ' / ' + n, r.x + r.w - 2, r.y + r.h / 2, { size: 10, min: 8, weight: 900, color: done === n && n ? UI.good : UI.mute, align: 'right', maxW: r.w * 0.3, zone: Z });
  });
  (R.objectives || []).forEach((o, i) => block('obj' + i, r => {
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: !o.done, lift: o.done, accent: o.done ? UI.good : null });
    const ny = r.y + (L.compact ? 14 : 19), dy = r.y + (L.compact ? 30 : 38);
    uiStateIcon(r.x + 21, ny, 9, o.done ? 'done' : 'open');
    const badge = o.isNew ? 'NEW MEDAL' : (o.already && o.done) ? 'EARNED' : '';
    let bw = 0;
    if (badge) bw = uiChip(r.x + r.w - 10, ny, badge, { align: 'right', size: 8.5, h: 19,
      color: o.isNew ? UI.gold : UI.mute, fill: o.isNew ? 'rgba(255,213,79,0.14)' : UI.panelSoft }) + 8;
    fitLabel((o.ace ? '★ ' : '') + o.name, r.x + 40, ny, { size: 12, min: 9, weight: 900,
      color: o.done ? UI.ink : UI.sub, align: 'left', maxW: r.w - 52 - bw, zone: Z });
    fitLabelWrap(o.desc, r.x + 40, dy, { size: 10.5, min: 10, weight: 600, family: "Verdana, 'Segoe UI', system-ui, sans-serif",
      color: o.done ? '#c9e8d3' : UI.mute, align: 'left', maxW: r.w - 54, maxLines: 2, zone: Z });
  }));
  block('note', r => fitLabel(G.trial ? 'TRIAL RUN — MEDALS ARE NOT SAVED' : G.daily ? 'DAILY RUN — MEDALS ARE NOT SAVED'
    : 'CHEATS USED — MEDALS ARE NOT SAVED', r.x + r.w / 2, r.y + r.h / 2, { size: 9.5, min: 8, weight: 700, color: UI.mute, maxW: r.w, zone: Z }));
  // AFT-022 F2: the next-stage direction is MUST-READ copy — it wraps to a
  // second line before it would shrink below the readable floor
  block('next', r => {
    uiPanel(r.x, r.y, r.w, r.h, { r: 12, soft: true, accent, bar: 'left' });
    fitLabel('NEXT', r.x + 16, r.y + 14, { size: 8.5, min: 7.5, weight: 900, color: UI.mute, align: 'left', maxW: 80, zone: Z });
    fitLabelWrap(R.nextName, r.x + 16, r.y + 30, { size: 13, min: 10, weight: 800, color: accent, align: 'left', maxW: r.w - 32, maxLines: 2, zone: Z });
  });
  // the flight log: one line of expedition narrative — flavour, never a gate
  block('flavor', r => uiTextBlock(R.flavor, r.x + 8, r.y, r.w - 16, r.h,
    { size: 10.5, min: 9, italic: true, color: UI.mute, align: 'center', valign: 'middle' }));
  ctx.restore();
  // THE one "tap to continue" affordance: the CONTINUE slab, live after the
  // dwell gate, its outline breathing slowly
  const B = L.btn, ready = t >= 0.45;
  const be = uiEnter(t - 0.3, 0.24);
  ctx.save();
  ctx.globalAlpha = be.a; ctx.translate(0, be.dy);
  if (ready && !SETTINGS.reduceFlash) {
    ctx.globalAlpha = be.a * (0.25 + 0.25 * Math.sin(G.time * 2.4));
    roundRect(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 14);
    ctx.lineWidth = 1.5; ctx.strokeStyle = accent; ctx.stroke();
    ctx.globalAlpha = be.a;
  }
  uiButton(B, 'CONTINUE', { primary: true, accent, disabled: !ready,
    sub: IS_TOUCH ? 'TAP ANYWHERE' : 'CLICK · ENTER' });
  ctx.restore();
}
// AFT-009R P1 → AFT-029: THE ATTUNEMENT CARD — one anatomy for every offer
// in every orientation: KIND tag (NEW / UPGRADE / CAPSTONE / MASTERY /
// EVOLVE), name, one plain effect sentence, current → new value, and a
// synergy hint. Drawn from draftCardModel(); render never reaches into the
// choice payload for copy, so tiers, web nodes, stacks, secrets and
// reforges read identically. A wide rect draws the phone ROW card (accent
// bar left, badge left, text right); a tall rect draws the COLUMN card
// (accent bar top, centred) used on landscape and desktop.
function drawAttunementCard(c, r, i, a) {
  const m = draftCardModel(c);
  const sel = draftSel === i;
  const hov = !IS_TOUCH && inRect(mouseX, lastMouseY, r);
  const row = r.w > r.h * 1.5;
  const tierPip = (c.pathKey && c.tierIdx != null && !c.web && !c.stack && !c.secret && !c.reforge) ? c.tierIdx : -1;
  ctx.save();
  // the panel stays opaque (nothing reads through a card); an UNSELECTED
  // card's contents recede once another card is inspected
  ctx.globalAlpha = a;
  uiPanel(r.x, r.y, r.w, r.h, { accent: m.color, bar: row ? 'left' : 'top', sel, lift: sel || hov });
  ctx.globalAlpha = a * (draftSel != null && !sel ? 0.55 : 1);
  const badgeDisc = (x, y, br) => {
    ctx.beginPath(); ctx.arc(x, y, br + 6, 0, Math.PI * 2);
    ctx.fillStyle = m.color + '1c'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = m.color + '55'; ctx.stroke();
    blitBadge(m.icon, x, y, br, m.color);
  };
  const body = '#d6deeb';
  if (row) {
    const br = Math.max(12, Math.min(18, r.h * 0.18));
    const bx = r.x + 18 + br, by = r.y + r.h / 2;
    badgeDisc(bx, by, br);
    const tx = bx + br + 16, tw = r.x + r.w - 14 - tx;
    const y1 = r.y + 15;
    const tagW = uiTag(tx, y1, m.tag, m.color);
    if (r.h < 84) { // compact row (5-card hands on small phones): tag + name share
      // the first line so the effect sentence keeps two full lines
      fitLabel(m.name, tx + tagW + 8, y1, { size: 13, min: 9.5, weight: 900, color: UI.ink, align: 'left', maxW: tw - tagW - 8 - (sel ? 24 : 0) });
      uiTextBlock(m.sentence, tx, r.y + 25, tw, r.h - 29, { size: 10, min: 8.5, color: body });
      if (sel) uiStateIcon(r.x + r.w - 15, r.y + 15, 8, 'done', m.color);
      ctx.restore();
      return;
    }
    fitLabel(m.head || '', tx + tagW + 8, y1, { size: 9, min: 7.5, weight: 800, color: UI.mute, align: 'left', maxW: tw - tagW - 8 - (sel ? 24 : 0) });
    const y2 = r.y + 34;
    fitLabel(m.name, tx, y2, { size: r.h >= 90 ? 15 : 13, min: 10, weight: 900, color: UI.ink, align: 'left', maxW: tw });
    const foot = r.h >= 80 && (m.delta || m.hint);
    const yB = r.y + r.h - 12;
    uiTextBlock(m.sentence, tx, y2 + 10, tw, (foot ? yB - 8 : r.y + r.h - 6) - (y2 + 10), { size: r.h >= 112 ? 11.5 : 10.5, min: 9, color: body });
    if (foot) {
      let dx = tx;
      if (m.delta) dx = fitLabel(m.delta, tx, yB, { size: 9, min: 7.5, weight: 900, color: m.color, align: 'left', maxW: m.hint ? tw * 0.5 : tw }).x1 + 10;
      if (m.hint && tx + tw - dx > 40) fitLabel(m.hint, m.delta ? tx + tw : tx, yB, { size: 8.5, min: 7, weight: 700, color: UI.mute,
        align: m.delta ? 'right' : 'left', maxW: tx + tw - dx });
    }
  } else {
    const cx = r.x + r.w / 2, pad = r.w < 150 ? 8 : 14, iw = r.w - pad * 2;
    const compact = r.h < 236;
    let y = r.y + (compact ? 18 : 24);
    uiTag(cx, y, m.tag, m.color, { align: 'center' });
    y += compact ? 15 : 19;
    fitLabel(m.head || '', cx, y, { size: 8.5, min: 7, weight: 800, color: UI.mute, maxW: iw });
    const br = compact ? 13 : 20;
    y += br + (compact ? 14 : 20);
    badgeDisc(cx, y, br);
    y += br + 8;
    if (tierPip >= 0) {
      y += 6;
      for (let d = 0; d < 4; d++) {
        ctx.beginPath(); ctx.arc(cx - 18 + d * 12, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = d < tierPip ? m.color : d === tierPip ? UI.ink : 'rgba(255,255,255,0.16)'; ctx.fill();
      }
      y += 6;
    }
    y += compact ? 13 : 18;
    fitLabel(m.name, cx, y, { size: compact ? 12.5 : 16, min: 9, weight: 900, color: UI.ink, maxW: iw });
    const keyLine = !IS_TOUCH && !compact;
    const yKey = r.y + r.h - 13;
    const yHint = keyLine ? yKey - 17 : yKey;
    const yDelta = m.hint ? yHint - 15 : yHint;
    if (keyLine) fitLabel(sel ? '✓ SELECTED — ENTER INSTALLS' : 'PRESS ' + (i + 1), cx, yKey, { size: 8.5, min: 7, weight: 800, color: sel ? m.color : UI.mute, maxW: iw });
    if (m.hint) fitLabel(m.hint, cx, yHint, { size: 8, min: 6.5, weight: 700, color: UI.mute, maxW: iw });
    if (m.delta) fitLabel(m.delta, cx, yDelta, { size: 9, min: 7, weight: 900, color: m.color, maxW: iw });
    const sTop = y + (compact ? 9 : 13), sBot = (m.delta ? yDelta : yHint) - (compact ? 9 : 13);
    uiTextBlock(m.sentence, r.x + pad, sTop, iw, sBot - sTop, { size: compact ? 9.5 : 12, min: 8, color: body, align: 'center', valign: 'middle' });
  }
  if (sel) { // the selected card wears a check, top-right
    const kx = r.x + r.w - 15, ky = r.y + 15;
    uiStateIcon(kx, ky, 8, 'done', m.color);
  }
  ctx.restore();
}
// AFT-009R P2: THE RESONANCE METER — a slim always-on readout of the next
// attunement level. AFT-030: it lives in the CONTROL DOCK — row B of the
// chip column on touch (outer edge, mirrored with left-handed pads), a dock
// plate beside the Surge meter on desktop. Reads state only; the fill is
// contribution, so it visibly surges on kills, boss deciles, phases and
// objectives.
function drawResonanceMeter(D) {
  const A = G.attune;
  if (!A || !hudLive()) return;
  D = D || hudDockLayout();
  const frac = Math.max(0, Math.min(1, A.res / Math.max(1, A.need)));
  // AFT-024: the meter promises the NEXT STAGE HAND's width — banked levels
  // are extra cards to choose from, never an interruption mid-fight
  const extra = Math.min(2, A.pending || 0);
  const label = extra > 0 ? '+' + extra + ' CARD' + (extra > 1 ? 'S' : '') + ' NEXT STAGE' : 'RESONANCE';
  const col = A.pending > 0 ? UI.gold : UI.player;
  const R = D.res;
  ctx.save();
  ctx.textBaseline = 'middle';
  let bx, bw, by;
  if (D.touch) {
    const colW = Math.max(60, R.w);
    ctx.font = `800 ${UI.small}px Orbitron, sans-serif`;
    const lw = Math.min(ctx.measureText(label).width, colW - 46);
    bw = Math.max(36, Math.min(104, colW - lw - 10));
    by = R.y - 2.5;
    if (D.left) { // mirrored: the label hugs the pads' side, the bar the outer edge
      bx = R.x + R.w - bw;
      fitLabel(label, bx - 10, R.y + 1, { size: UI.small, min: 8, weight: 800, color: A.pending > 0 ? UI.gold : UI.sub,
        align: 'right', maxW: colW - bw - 10, zone: 'controls' });
    } else {
      bx = R.x;
      fitLabel(label, bx + bw + 10, R.y + 1, { size: UI.small, min: 8, weight: 800, color: A.pending > 0 ? UI.gold : UI.sub,
        align: 'left', maxW: colW - bw - 10, zone: 'controls' });
    }
  } else {
    uiPanel(R.x, R.y, R.w, R.h, { r: 9, soft: true, accent: col });
    fitLabel(label, R.x + 10, R.y + 10, { size: UI.small, min: 8.5, weight: 800, color: A.pending > 0 ? UI.gold : UI.sub,
      align: 'left', maxW: R.w - 20, zone: 'controls' });
    bx = R.x + 10; bw = R.w - 20; by = R.y + 19;
    claimSurface('resonance', R.x, R.y, R.w, R.h);
  }
  roundRect(bx, by, bw, 5, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  if (frac > 0.01) {
    roundRect(bx, by, Math.max(4, bw * frac), 5, 2.5);
    ctx.fillStyle = col; ctx.fill();
  }
  ctx.restore();
}
// AFT-009R P1 → AFT-029: the BUILD STRIP above the cards — four path
// SLOTS (the four-path cap's visual anchor), the current build identity,
// and the reroll resource. Reads real state only; a run grandfathered past
// four slots shows the overflow honestly. Lives in upgradeLayout().meta.
function drawBuildMetaRow(L) {
  const M = L.meta || { x: L.card(0).x, y: L.card(0).y - 30, w: L.card(0).w, h: 24 };
  const owned = PATH_KEYS.filter(k => pathLvl(k) > 0);
  const y = M.y + M.h / 2;
  ctx.save();
  uiPanel(M.x, M.y, M.w, M.h, { r: M.h / 2, soft: true });
  let x = M.x + 10;
  for (let s = 0; s < 4; s++) {
    const k = owned[s];
    ctx.beginPath(); ctx.arc(x + 5, y, 5, 0, Math.PI * 2);
    if (k) { ctx.fillStyle = PATHS[k].color; ctx.fill(); }
    else { ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke(); }
    x += 15;
  }
  if (owned.length > 4) {
    fitLabel('+' + (owned.length - 4), x + 2, y + 0.5, { size: 9, min: 8, weight: 900, color: UI.gold, align: 'left', maxW: 24 });
    x += 20;
  }
  const focusTxt = 'FOCUS ' + (G.focus || 0);
  ctx.font = '900 9px Orbitron, sans-serif';
  const fw = ctx.measureText(focusTxt).width;
  const idName = owned.slice().sort((a, b) => pathLvl(b) - pathLvl(a)).slice(0, 2).map(skinPathName).join(' · ');
  fitLabel(idName || 'FIRST ATTUNEMENT', x + 6, y + 0.5, { size: 9, min: 7.5, weight: 800, color: UI.sub, align: 'left', maxW: Math.max(30, M.x + M.w - x - fw - 34) });
  fitLabel(focusTxt, M.x + M.w - 12, y + 0.5, { size: 9, min: 7.5, weight: 900, color: (G.focus || 0) > 0 ? UI.player : UI.mute, align: 'right', maxW: fw + 4 });
  ctx.restore();
}
// AFT-009R P3 → AFT-029: THE AETHER FORGE action menu — up to four rows
// (REFINE / LINK / EVOLVE / REFORGE); unavailable actions are OMITTED. Tap
// a row to choose — the menu has no primary slab because the choice IS the
// action, and it never auto-advances (AFT-026). The realm-3 first-link
// guarantee rides a ★ FIRST LINK tag. Rects come from upgradeLayout().card.
function drawForgeMenu(L, accent) {
  if (!L || typeof L !== 'object' || !L.card) L = upgradeLayout();
  const acts = forgeActions();
  const t = G.stateT;
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i], r = L.card(i);
    const e = uiEnter(t - 0.5 - i * 0.06, 0.22);
    const hov = !IS_TOUCH && inRect(mouseX, lastMouseY, r);
    const row = r.w > r.h * 1.5;
    ctx.save();
    ctx.globalAlpha = e.a; ctx.translate(0, e.dy);
    uiPanel(r.x, r.y, r.w, r.h, { accent: a.color, bar: row ? 'left' : 'top', lift: hov, sel: hov });
    const disc = (x, y, br) => {
      ctx.beginPath(); ctx.arc(x, y, br + 6, 0, Math.PI * 2);
      ctx.fillStyle = a.color + '1c'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = a.color + '55'; ctx.stroke();
      blitBadge(a.icon, x, y, br, a.color);
    };
    if (row) {
      const br = Math.max(12, Math.min(18, r.h * 0.2));
      const bx = r.x + 18 + br, cy = r.y + r.h / 2;
      disc(bx, cy, br);
      const tx = bx + br + 16, tw = r.x + r.w - 40 - tx;
      // name + description sit as one block, centred in the row
      ctx.font = bodyFont(10.5, 600);
      const dH = Math.min(3, wrapText(a.desc, tw).length) * 14;
      const ny = r.y + Math.max(18, (r.h - (24 + dH)) / 2 + 9);
      const nb = fitLabel(a.name, tx, ny, { size: 16, min: 11, weight: 900, color: UI.ink, align: 'left', maxW: tw * 0.6 });
      if (a.first) uiTag(nb.x1 + 10, ny, '★ FIRST LINK', a.color);
      uiTextBlock(a.desc, tx, ny + 12, tw, r.y + r.h - 8 - (ny + 12), { size: 10.5, min: 9, color: '#d6deeb' });
      fitLabel('›', r.x + r.w - 18, cy, { size: 24, min: 12, weight: 900, color: a.color, maxW: 20 });
    } else {
      const cx = r.x + r.w / 2, pad = 14, iw = r.w - pad * 2;
      const br = r.h < 200 ? 15 : 22;
      let y = r.y + 22 + br;
      disc(cx, y, br);
      y += br + 24;
      fitLabel(a.name, cx, y, { size: r.h < 200 ? 14 : 18, min: 10, weight: 900, color: UI.ink, maxW: iw });
      if (a.first) { y += 20; uiTag(cx, y, '★ FIRST LINK', a.color, { align: 'center' }); }
      const yC = r.y + r.h - 16;
      fitLabel(IS_TOUCH ? 'TAP TO CHOOSE' : 'CHOOSE  ›', cx, yC, { size: 9, min: 7.5, weight: 900, color: a.color, maxW: iw });
      uiTextBlock(a.desc, r.x + pad, y + 14, iw, yC - 12 - (y + 14), { size: r.h < 200 ? 9.5 : 11.5, min: 8, color: '#d6deeb', align: 'center' });
    }
    ctx.restore();
  }
}
// THE DRAFT SHEET (AFT-029): header (what this decision is + the bonus),
// the journey map where there is room, the build strip, the cards (or the
// Forge's action rows), and ONE action bar — REROLL/BACK · INSTALL ·
// VIEW BUILD. The INSTALL slab is the only thing that applies a pick (the
// cards inspect); VIEW BUILD opens the non-installing journal. Nothing
// here advances on its own: a decision surface waits for the player.
function drawDraftSheet() {
  const secretDraft = !!G.secret.rewardDraft;
  const wasBossStage = G.clearedStage === 2;
  const clearedGen = SKIN.gens[regionIdx(Math.max(1, G.level - 1))];
  const accent = secretDraft ? '#d780ff' : wasBossStage ? clearedGen.accent : UI.good;
  const L = upgradeLayout();
  const t = G.stateT;
  const fade = Math.min(1, t / 0.3);
  ctx.save();
  ctx.globalAlpha = fade; uiScrim(accent, 0.84);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // ---- the header copy: what this decision IS
  const armory = rushArmoryHand();
  const bounty = G.bonusPicks >= 2 ? 'CHOOSE TWO' : G.bonusPicks === 1 ? 'ONE MORE PICK' : null;
  const stageBonus = '+' + (300 + (G.clearedStage || 0) * 250);
  let title, sub, bonus = null, prompt = null;
  if (G.forge) {
    title = 'THE AETHER FORGE';
    sub = clearedGen.name + ' CLEARED'; bonus = stageBonus;
    const act = G.forge.action;
    prompt = G.forge.step === 'menu' ? 'ONE DECISION SHAPES THE NEXT REALM'
      : act === 'link' ? 'LINK — CHOOSE ONE BRIDGE' : act === 'evolve' ? 'EVOLVE — CHOOSE ONE TRANSFORMATION'
        : act === 'reforge' ? 'REFORGE — CHOOSE A RANK TO REFUND' : 'REFINE — CHOOSE ONE';
  } else if (secretDraft) {
    title = 'RIFT CONQUERED'; sub = 'SECRET BOSS BONUS'; bonus = '+3000';
    prompt = 'CHOOSE ONE FORBIDDEN UPGRADE · THE NORMAL ' + (SKIN.secret.homeRegion || 'KANTO') + ' DRAFT FOLLOWS';
  } else if (armory) {
    // the armory hand is a SKIPPED stage's dividend — say which finale it arms for
    const fl = regionIdx(G.level) * STAGES + 3;
    title = 'RUSH ARMORY ' + G.rush.armoryN + '/2';
    sub = 'THE SKIPPED STAGE\'S DRAFT · NEXT: ' + (stageTitle(fl) || genFor(fl).name);
  } else if (G.recoveryDraft) {
    title = 'RECOVERY HAND'; sub = 'BANKED RESONANCE · YOUR RETRY IS READY';
  } else {
    title = bounty ? 'RIFT BOUNTY' : G.mode === 'junkie' ? lex('CHOOSE A HELD ITEM') : 'CHOOSE AN UPGRADE';
    sub = wasBossStage ? clearedGen.name + ' CLEARED' : 'STAGE CLEAR'; bonus = stageBonus;
    prompt = bounty || (stageIdx(G.level) === 0 ? 'NEXT STOP: ' + genFor(G.level).name : null);
  }
  const extra = !G.forge && (G.dividendBonus || 0) > 0
    ? '+' + G.dividendBonus + ' RESONANCE CARD' + (G.dividendBonus > 1 ? 'S' : '') : null;
  {
    const Hd = L.head, e = uiEnter(t, 0.22);
    ctx.save(); ctx.globalAlpha = fade * e.a; ctx.translate(0, e.dy);
    fitLabel(title, Hd.x + Hd.w / 2, Hd.y + (L.short ? 12 : 16), { size: L.short ? 17 : Math.min(24, W / 15), min: 12, weight: 900, color: UI.ink, maxW: Hd.w });
    // sub line + the gold bonus chip, centred as one group
    const sy = Hd.y + (L.short ? 31 : 42);
    ctx.font = '900 9.5px Orbitron, sans-serif';
    const chips = [bonus ? { t: bonus + ' BONUS', c: UI.gold } : null, extra ? { t: extra, c: UI.gold } : null].filter(Boolean);
    const chipW = chips.reduce((s, ch) => s + ctx.measureText(ch.t).width + 18 + 8, 0);
    ctx.font = '800 11px Orbitron, sans-serif';
    const subW = Math.min(ctx.measureText(sub).width, Hd.w - chipW);
    let x = Hd.x + Hd.w / 2 - (subW + chipW) / 2;
    const sb = fitLabel(sub, x, sy, { size: 11, min: 8.5, weight: 800, color: accent, align: 'left', maxW: Math.max(40, Hd.w - chipW) });
    x = sb.x1 + 8;
    for (const ch of chips) x += uiChip(x, sy, ch.t, { color: ch.c, size: 9.5, h: 20 }) + 8;
    ctx.restore();
  }
  // ---- the journey map (where there is room) + the prompt line
  let promptY = L.head.y + L.head.h + 12;
  if (L.map && !secretDraft) {
    const e = uiEnter(t - 0.1, 0.22);
    ctx.save(); ctx.globalAlpha = fade * e.a;
    drawJourneyMap(L.map.y + 16, true);
    ctx.restore();
    promptY = L.map.y + L.map.h + 10;
  }
  const firstCard = L.card(0);
  const promptRoom = Math.min(L.meta ? L.meta.y : firstCard.y, firstCard.y) - 8;
  if (prompt && promptY + 8 <= promptRoom) {
    ctx.save(); ctx.globalAlpha = fade * uiEnter(t - 0.15, 0.22).a;
    fitLabelWrap(prompt, L.head.x + L.head.w / 2, promptY, { size: 10.5, min: 9, weight: 800, color: bounty ? '#d780ff' : UI.sub,
      maxW: L.head.w, maxLines: promptY + 22 <= promptRoom ? 2 : 1 });
    ctx.restore();
  }
  ctx.restore();
  // ---- the Forge's action menu
  if (G.forge && G.forge.step === 'menu' && G.stateT > 0.5) {
    if (L.meta) { ctx.save(); ctx.globalAlpha = uiEnter(t - 0.45, 0.22).a; drawBuildMetaRow(L); ctx.restore(); }
    drawForgeMenu(L, accent);
  }
  // ---- the hand
  if (G.upgradeChoices && G.stateT > 0.8) {
    const a = Math.min(1, (G.stateT - 0.8) / 0.25);
    ctx.save();
    ctx.globalAlpha = a;
    drawBuildMetaRow(L);
    for (let i = 0; i < G.upgradeChoices.length; i++) {
      const e = uiEnter(G.stateT - 0.8 - i * 0.05, 0.22);
      ctx.save(); ctx.translate(0, e.dy);
      drawAttunementCard(G.upgradeChoices[i], L.card(i), i, a * e.a);
      ctx.restore();
    }
    // the action bar: REROLL (spends Focus) / BACK on a focused Forge step ·
    // INSTALL (primary — the only thing that applies the inspected pick) ·
    // VIEW BUILD (the journal: it inspects, never installs)
    const forgeBackBtn = G.forge && G.forge.step === 'hand' && G.forge.action !== 'refine';
    const canRR = forgeBackBtn || (!secretDraft && (G.focus || 0) > 0);
    const key = s => IS_TOUCH ? '' : ' · ' + s;
    uiButton(L.reroll, forgeBackBtn ? '‹ BACK' : secretDraft ? 'FIXED' : 'REROLL', {
      accent: forgeBackBtn ? UI.sub : UI.gold, disabled: !canRR,
      sub: forgeBackBtn ? 'FORGE MENU' : secretDraft ? 'NO REROLL' : (G.focus || 0) > 0 ? 'FOCUS ' + G.focus + key('R') : 'NO FOCUS' });
    const selC = draftSel != null && G.upgradeChoices[draftSel];
    const selM = selC ? draftCardModel(selC) : null;
    uiButton(L.confirm, selM ? 'INSTALL' : 'PICK A CARD', { primary: true, accent: selM ? selM.color : UI.player, disabled: !selM,
      sub: selM ? (IS_TOUCH ? selM.name : selM.name + ' · ENTER') : (IS_TOUCH ? 'TAP ONE TO INSPECT' : 'CLICK OR PRESS 1–' + G.upgradeChoices.length) });
    uiButton(L.tree, W < 380 ? 'BUILD' : 'VIEW BUILD', { accent: UI.player, disabled: secretDraft,
      sub: secretDraft ? 'SECRET ONLY' : 'JOURNAL' + key('T') });
    ctx.restore();
    if (upgradeTreeOpen) drawFullUpgradeTree();
  }
}
// AFT-011: an honest, non-blocking loading plate. Production art improves in
// place; the procedural/vector game underneath is complete and playable, so
// the copy says that plainly instead of trapping a phone behind a fake 100%.
function drawAetherArtLoading() {
  if (SKIN.id !== 'aetherfall') return;
  // AFT-029: the between-combat sheets anchor their ONE primary action in
  // exactly this bottom band — the plate yields there (the stream goes on)
  if (paused || G.state === 'upgrade' || G.state === 'results' || G.state === 'gameover') return;
  const s = AETHER_ART_STREAM.summary();
  if (!s || (!s.pending && !s.failed)) return;
  const compact = G.state !== 'menu';
  const w = Math.min(W - 24 - SAFE_L - SAFE_R, compact ? 292 : 356);
  const h = compact ? 44 : 62;
  const x = SAFE_L + (W - SAFE_L - SAFE_R - w) / 2;
  const y = H - SAFE_B - h - (IS_TOUCH ? 12 : 18);
  ctx.save();
  roundRect(x, y, w, h, 10);
  ctx.fillStyle = 'rgba(5,8,22,0.94)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = s.failed ? '#ff8a80' : '#80d8ff'; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '800 9px Orbitron, sans-serif'; ctx.fillStyle = '#f4f8ff';
  const label = s.pending ? s.label + ' · ' + s.settled + '/' + s.requested
    : 'PRODUCTION ART FALLBACK · ' + s.failed + ' UNAVAILABLE';
  ctx.fillText(label, x + 12, y + 15, w - 24);
  if (s.pending) {
    const p = s.requested ? s.settled / s.requested : 1;
    roundRect(x + 12, y + 27, w - 24, 5, 2.5); ctx.fillStyle = '#17243b'; ctx.fill();
    roundRect(x + 12, y + 27, (w - 24) * p, 5, 2.5); ctx.fillStyle = '#5affc3'; ctx.fill();
  }
  if (!compact) {
    ctx.font = bodyFont(9, 700); ctx.fillStyle = '#b9c8d8';
    ctx.fillText('PLAYABLE NOW · PROCEDURAL ART IS ACTIVE DURING THE STREAM', x + 12, y + 47, w - 24);
  }
  ctx.restore();
}

function drawOverlays() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (G.state === 'menu') { drawMenu(); }
  else if (G.state === 'ending') { drawEnding(); }
  else if (G.state === 'dex') { drawDex(); }
  else if (G.state === 'resolve' && !paused) {
    // AFT-021 P1: the resolution beat — the win reads on the FIELD (exits,
    // stand-downs, the catch window); one quiet pulse names it. The results
    // panel waits until the screen has visibly finished. P2: the pulse
    // YIELDS while an announcement (objective outcome card) owns the lane.
    if (G.stateT > 0.2 && !announceLive()) pulse('STAGE CLEAR', H * 0.56);
  }
  else if (G.state === 'serve' && !paused) {
    // The stage card owns the centre first; controls arrive immediately after
    // it clears. This turns the opening into a sequence instead of a text pile.
    if (!G.announce) {
      pulse(IS_TOUCH ? 'TAP TO LAUNCH' : 'CLICK TO LAUNCH', H * 0.7);
      // interactive first-wave tutorial: contextual hints
      if (G.level === 1) {
        hintPill(IS_TOUCH ? 'DRAG TO MOVE · SLIDE WHILE LAUNCHING TO AIM'
          : 'MOVE TO STEER · SLIDE WHILE LAUNCHING TO AIM', H * 0.7 + 48);
      }
    }
  } else if (G.state === 'play' && !paused && G.mode === 'classic' && G.level === 1 &&
      G.coachStep === 1 && !G.highGroundDone && G.playT < 10) {
    hintPill('NEXT: SEND THE BALL ABOVE THE WALL TO START A RALLY', H * 0.62, '#ffd54f');
  } else if (G.state === 'play' && !paused && G.jCoach && G.mode === 'junkie' && !G.announce) {
    // STARFIGHTER first-flight coach: one line at a time in the same top band
    // the compact announcements use — never over the pilot or the button row.
    // Steps 4/5 are contextual and stay silent until their moment is on screen.
    const jc = G.jCoach, hit = jc.doneT > 0;
    const megaReady = G.mega >= 1 && G.megaT <= 0;
    const orbFalling = G.powerups.some(p => p.orb);
    const txt =
      jc.step === 1 ? (IS_TOUCH ? 'DRAG ANYWHERE — ' + SKIN.strings.follows : 'MOVE THE MOUSE — ' + SKIN.strings.follows) :
      jc.step === 2 ? (IS_TOUCH ? 'TAP FIRE TO ATTACK' : 'CLICK OR SPACE — FIRE') :
      jc.step === 3 ? (IS_TOUCH ? 'HOLD FIRE TO CHARGE A BIG SHOT' : 'HOLD SHIFT OR RIGHT-CLICK — CHARGE A BIG SHOT') :
      jc.step === 4 ? ((orbFalling || hit) ? 'GRAB THE FALLING ORB — IT CHANGES YOUR ATTACK TYPE' : null) :
      jc.step === 5 ? ((megaReady || hit) ? lex(IS_TOUCH ? 'MEGA IS FULL — TAP THE GLOWING RING' : 'MEGA IS FULL — PRESS E') : null) : null;
    // AFT-021 P2: the coach is the LOWEST-priority surface — it yields to a
    // live goal pill, an urgent tell, or any announcement, and on touch it
    // anchors CONTROL-ADJACENT (just above the FIRE pad) instead of taking a
    // full-width band over the formation.
    if (txt && !goalSurfaceLive() && !announceLive()) {
      let coachY = H < 560 ? H * 0.42 : SAFE_T + (W < 560 ? 156 : 124);
      if (IS_TOUCH) {
        const B = touchButtons();
        if (B.fire) coachY = Math.max(SAFE_T + 96, B.fire.y - B.fire.r - 34);
      }
      // AFT-023: the coach never talks over a live hazard — it hides while
      // a lane strike is warned or a hostile shot flies through its band
      // (or near the vessel; the pill can wait, the dodge cannot)
      let hazard = G.columnStrikes.length > 0;
      if (!hazard) for (const es of G.enemyShots) {
        if (es.dead) continue;
        if (Math.abs(es.y - coachY) < 64 || Math.hypot(es.x - G.paddle.x, es.y - shipY()) < 150) { hazard = true; break; }
      }
      if (!hazard) hintPill((hit ? '✓ ' : '') + txt, coachY, hit ? '#9df2b0' : '#ffd54f');
    }
  } else if (G.state === 'upgrade') {
    drawDraftSheet();
  } else if (G.state === 'results') {
    drawResults();
  } else if (G.state === 'ceremony') {
    drawCeremony();
  } else if (G.state === 'gameover') {
    drawGameOverSummary();
  }
  if (paused) drawPauseSheet();
  if (G.flashT > 0) {
    ctx.fillStyle = `rgba(${G.flashCol || FLASH_HURT},${G.flashT * (SETTINGS.reduceFlash ? 0.18 : 0.6)})`;
    ctx.fillRect(0, 0, W, H);
  }
}
function dim(a) { ctx.fillStyle = `rgba(3,5,16,${a})`; ctx.fillRect(0, 0, W, H); }
function title(text, y, size, color) {
  // modern hero text: a white-hot top edge melting into the accent color
  ctx.font = `900 ${size}px Orbitron, sans-serif`;
  ctx.shadowColor = color; ctx.shadowBlur = 26;
  const tg = ctx.createLinearGradient(0, y - size * 0.6, 0, y + size * 0.5);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.4, color); tg.addColorStop(1, color);
  ctx.fillStyle = tg;
  ctx.fillText(text, W / 2, y);
  ctx.shadowBlur = 0;
}
// primary prompt: big, backed by a pill, glowing — impossible to miss
function pulse(text, y) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = Math.min(26, W / 18);
  ctx.font = `900 ${size}px Orbitron, sans-serif`;
  const tw = Math.min(ctx.measureText(text).width, W * 0.88) + 48;
  const th = size + 24;
  roundRect(W / 2 - tw / 2, y - th / 2, tw, th, th / 2);
  ctx.fillStyle = 'rgba(6,10,26,0.78)'; ctx.fill();
  // only the border breathes, gently — the text and glow stay steady so the
  // prompt doesn't read as a full-screen flicker
  ctx.globalAlpha = 0.55 + 0.2 * Math.sin(G.time * 2.5);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(159,216,255,0.7)';
  roundRect(W / 2 - tw / 2, y - th / 2, tw, th, th / 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, W / 2, y + 1, W * 0.84);
  ctx.restore();
}
// secondary hint: smaller pill, still clearly readable over any scene
// AFT-030: the coach pill is a kit panel — soft fill, a hairline in the
// coach colour and ONE left accent bar; two type sizes (label on phones,
// title on wide screens), contained by fitLabel
function hintPill(text, y, color = '#a9d4ff') {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = W < 560 ? UI.label : UI.title;
  ctx.font = `800 ${size}px Orbitron, sans-serif`;
  const tw = Math.min(ctx.measureText(text).width + 40, W - 24);
  uiPanel(W / 2 - tw / 2, y - 16, tw, 32, { r: 12, soft: true, accent: color, bar: 'left' });
  fitLabel(text, W / 2 + 2, y + 1, { size, min: 9, weight: 800, color, maxW: tw - 28 });
  ctx.restore();
}

function drawCursor() {
  if (IS_TOUCH) return; // a cursor ring under a finger just looks misaligned
  if (G.state === 'play' || G.state === 'serve') return;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(mouseX, lastMouseY, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(mouseX, lastMouseY, 2, 0, Math.PI * 2); ctx.fill();
}

function render() {
  zoneLog = ZONE_DEBUG ? [] : null; // AFT-001 dev overlay collection
  // AFT-021: world-anchored actor nameplates drawn this frame — the suite's
  // label-roster contract reads it (at most ONE local label once Phase 3
  // lands). Collected under the suite and the ?zones overlay; null in play.
  actorLabelLog = (ZONE_DEBUG || (typeof window !== 'undefined' && window.__SUITE)) ? [] : null;
  surfaceLog = actorLabelLog ? [] : null; // AFT-021 P2: the surface registry rides the same switch
  ctx.save();
  if (G.dramaticT > 0) { // last-brick slow-mo zoom
    const z = 1 + 0.035 * Math.sin(Math.min(1, (0.9 - G.dramaticT) / 0.25) * Math.PI / 2);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  }
  const shk = SETTINGS.reduceShake ? G.shake * 0.25 : G.shake;
  let shx = 0, shy = 0;
  if (shk > 0) { shx = (Math.random() - 0.5) * shk; shy = (Math.random() - 0.5) * shk; ctx.translate(shx, shy); }
  drawBackground();
  // AFT-030: the CONTROL DOCK shelf sits UNDER the world (the vessel and
  // every shot read over it) and does not shake with it — the pads above
  // it are HUD and never shake either
  if (!PLATE_RENDER) { ctx.save(); ctx.translate(-shx, -shy); drawHudDockShelf(); ctx.restore(); }
  // AFT-021 P2: results and the draft ride the static arena plate — the
  // combat object graph is neither drawn nor readable behind their panels
  if ((G.state === 'results' || G.state === 'upgrade') && G.arenaPlate) {
    ctx.drawImage(G.arenaPlate, 0, 0, W, H);
  } else if (G.state !== 'menu' && G.state !== 'dex') {
    drawGauntletEntranceFx();
    drawDangerLine();
    drawRallyZone();
    drawTelegraphs();
    drawRelayFx(); // AFT-020: the gale-relay corridor + carrier cues (under the sprites)
    drawRaidFx();  // AFT-020: the raid's crown arcs, tethers + binding read
    drawObjectiveFx(); // AFT-020: ward triangle + bells + live-lane rails/marks
    drawSiegeFx();     // AFT-020: seal tethers + the current trail
    drawWardFx();      // AFT-020: the Triune Ward between the Heralds
    drawHourglassFx(); // AFT-020: ring windows + replay pre-echoes
    drawCircuitFx();   // AFT-020: the illuminated route + the flame's wake
    drawHuntFx();      // AFT-020: the closing shadow sector
    drawRiteFx();      // AFT-020: totem rites + the moon + the thief's charge
    drawChaseFx();     // AFT-020: the charge band + the pair's chains
    drawBricks();
    drawFragments();
    drawShield();
    drawPowerups();
    drawProjectiles();
    drawBalls();
    drawServeGuide();
    if (G.state !== 'gameover' && G.state !== 'upgrade' && G.state !== 'results') drawPaddle();
    if (G.state !== 'gameover' && G.state !== 'upgrade' && G.state !== 'results') drawUpgradeInstallFx();
    drawShootHint();
    drawParticles();
    if (!PLATE_RENDER) drawAnnounce();
  }
  ctx.restore();
  if (PLATE_RENDER) return; // the arena plate is world-only — no HUD, overlays, or text
  // bloom the gameplay scene before the vignette darkens the edges
  if (G.state === 'play' || G.state === 'serve') drawBloom();
  drawZoneOverlay(); // AFT-001 (?zones) — zone bands + fitted-label bounds
  if (vignette) ctx.drawImage(vignette, 0, 0, W, H); // may be unset pre-boot
  if (G.state !== 'menu' && G.state !== 'dex' && G.state !== 'upgrade' && G.state !== 'results') drawHUD();
  drawOverlays();
  if (G.state === 'menu' || G.state === 'dex') drawAnnounce(); // konami toast etc.
  drawAetherArtLoading();
  drawBossReveal(); // AFT-002: modal, above HUD and overlays
  drawCursor();
}
