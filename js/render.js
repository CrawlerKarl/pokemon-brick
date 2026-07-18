'use strict';
// ============================================================
//  RENDER
// ============================================================
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

function drawBackground() {
  if (G.secret && (G.secret.vmax || G.secret.rewardDraft)) {
    drawRiftBackground();
    return;
  }
  const genIdx = G.state === 'menu' || G.state === 'dex' ? 0 : regionIdx(G.level);
  buildBackground(genIdx);
  ctx.drawImage(bgSky, 0, 0, W, H);
  const par = (G.paddle.x - W / 2) / (W / 2); // parallax from paddle position
  for (const s of stars) {
    // slow, gentle twinkle — fast flicker on the title screen reads as glitching
    const tw = 0.75 + 0.25 * Math.sin(G.time * 1.2 + s.tw);
    ctx.globalAlpha = s.z * tw * 0.75;
    ctx.fillStyle = '#cfd8ff';
    ctx.fillRect(s.x - par * s.z * 14, s.y, s.z * 2.2, s.z * 2.2);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(bgScenery, -par * 12 - W * 0.015, 0, W * 1.03, H);
  if (G.state !== 'menu' && G.state !== 'dex') drawAtmosphere(genIdx); // depth wash over gameplay scenes
  drawAmbient(genIdx);
}

// armored "guardian wall" bricks shift colour as you whittle their plating down,
// fresh (cyan) → cracked (red), so their remaining hits read at a glance
const ARMOR_STEPS = ['#37e0ff', '#5cffb0', '#c6ff5a', '#ffe14d', '#ff9d3d', '#ff5a5a'];
function armorColor(br) {
  const dmg = br.maxHp - br.hp;
  const idx = br.maxHp <= ARMOR_STEPS.length
    ? Math.min(ARMOR_STEPS.length - 1, Math.floor(dmg))
    : Math.min(ARMOR_STEPS.length - 1, Math.round(dmg / br.maxHp * (ARMOR_STEPS.length - 1)));
  return ARMOR_STEPS[idx];
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

// Upgrade-draft presentation helpers. Motion is deterministic and restrained,
// with reduced-motion settings respected, so the screen feels alive without
// making card text harder to scan.
function drawDraftBackdrop(accent) {
  ctx.save();
  const motion = SETTINGS.reduceFlash ? 0.25 : 1;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.1;
  const glow = glowSprite();
  ctx.drawImage(glow, W / 2 - Math.min(W * 0.42, 340), H * 0.03,
    Math.min(W * 0.84, 680), Math.min(W * 0.84, 680));
  // A slow constellation of upgrade motes connects the title to the cards.
  for (let i = 0; i < 12; i++) {
    const x = ((i * 137.5 + W * 0.08) % Math.max(1, W - 40)) + 20;
    const lane = (i % 4) / 3;
    const y = H * (0.16 + lane * 0.68) + Math.sin(G.time * (0.35 + i % 3 * 0.08) * motion + i * 2.1) * 15;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(G.time * 1.8 * motion + i));
    ctx.globalAlpha = 0.05 + tw * 0.12;
    ctx.fillStyle = i % 3 ? '#80d8ff' : accent;
    ctx.beginPath(); ctx.arc(x, y, 1.2 + tw * 1.6, 0, Math.PI * 2); ctx.fill();
    if (i < 11) {
      const nx = (((i + 1) * 137.5 + W * 0.08) % Math.max(1, W - 40)) + 20;
      ctx.strokeStyle = accent; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, y + (lane < 0.5 ? 24 : -24)); ctx.stroke();
    }
  }
  ctx.restore();
}
function drawDraftCardEnergy(r, color, active, selected, phase = 0) {
  ctx.save();
  roundRect(r.x, r.y, r.w, r.h, 14); ctx.clip();
  // Saturated top rail and corner circuitry give every path a distinct frame.
  const rail = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  rail.addColorStop(0, color + '22'); rail.addColorStop(0.5, color); rail.addColorStop(1, color + '22');
  ctx.globalAlpha = active ? 0.9 : 0.48;
  ctx.fillStyle = rail; ctx.fillRect(r.x + 8, r.y + 2, r.w - 16, active ? 3 : 2);
  ctx.strokeStyle = color + '55'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(r.x + 10 + i * 7, r.y + 11);
    ctx.lineTo(r.x + 16 + i * 7, r.y + 17);
    ctx.lineTo(r.x + 10 + i * 7, r.y + 23);
    ctx.stroke();
  }
  if ((active || selected) && !SETTINGS.reduceFlash) {
    const sweep = ((G.time * 58 + phase * 83) % (r.w + 100)) - 50;
    const sg = ctx.createLinearGradient(r.x + sweep - 34, 0, r.x + sweep + 34, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, selected ? 'rgba(255,255,255,0.16)' : color + '18');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
  if (selected) {
    ctx.save(); ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const a = G.time * 0.9 + phase + i * Math.PI * 2 / 3;
      const px = r.x + r.w / 2 + Math.cos(a) * (r.w / 2 + 4);
      const py = r.y + r.h / 2 + Math.sin(a) * Math.min(r.h * 0.38, 42);
      ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(a * 2));
      ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
function drawDraftBadge(glyph, x, y, r, color, active = false, phase = 0) {
  const bob = SETTINGS.reduceFlash ? 0 : Math.sin(G.time * 2.4 + phase) * (active ? 2.5 : 1.2);
  const yy = y + bob;
  ctx.save();
  ctx.strokeStyle = color + (active ? 'cc' : '66');
  ctx.lineWidth = active ? 1.7 : 1;
  ctx.setLineDash([4, 5]); ctx.lineDashOffset = -G.time * (active ? 12 : 5);
  ctx.beginPath(); ctx.arc(x, yy, r + 7, G.time * 0.35 + phase, G.time * 0.35 + phase + Math.PI * 1.55); ctx.stroke();
  ctx.setLineDash([]);
  if (active) {
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(G.time * 5 + phase);
    ctx.drawImage(glowSprite(), x - r * 1.65, yy - r * 1.65, r * 3.3, r * 3.3);
    ctx.globalAlpha = 1;
  }
  blitBadge(glyph, x, yy, r, color);
  ctx.restore();
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
function drawBloom() {
  if (SETTINGS.reduceFlash || !W || !H) return;
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
  ctx.globalAlpha = 0.22;
  ctx.drawImage(bloomA, 0, 0, W, H);
  ctx.restore();
}

// ---- ATMOSPHERE: a cached per-region wash (warm horizon glow + top darken)
// that adds depth and mood over the flat scenery. Rebuilt only on region /
// resize change, never per frame.
let atmoCanvas = null, atmoKey = '';
function drawAtmosphere(genIdx) {
  const key = genIdx + 'x' + W + 'x' + H;
  if (atmoKey !== key) {
    atmoKey = key;
    atmoCanvas = document.createElement('canvas'); atmoCanvas.width = W; atmoCanvas.height = H;
    const c = atmoCanvas.getContext('2d');
    const accent = (GENS[genIdx] && GENS[genIdx].accent) || '#7ee08a';
    // horizon glow: a soft band of the region accent low on the screen
    const hg = c.createRadialGradient(W / 2, H * 0.9, 10, W / 2, H * 0.9, H * 0.7);
    hg.addColorStop(0, accent + '30'); hg.addColorStop(0.5, accent + '10'); hg.addColorStop(1, accent + '00');
    c.fillStyle = hg; c.fillRect(0, 0, W, H);
    // top darken for depth
    const tg = c.createLinearGradient(0, 0, 0, H * 0.5);
    tg.addColorStop(0, 'rgba(2,4,14,0.5)'); tg.addColorStop(1, 'rgba(2,4,14,0)');
    c.fillStyle = tg; c.fillRect(0, 0, W, H * 0.5);
  }
  ctx.drawImage(atmoCanvas, 0, 0);
}
// a spiky energy orb baked in an arbitrary type COLOR and radius — enemy shots
// now come in every type's colour (electric yellow, water blue, …) instead of
// one red. Cached per (color, r, spikes).
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
  ctx.scale(1, sclY);
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
  else drawGlyph(ctx, 'pokeball', 0, 0, br.h * 0.4, '#ffffff33');
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
  ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
  ctx.fillText((lastStand ? '💀 ' : ph === 2 ? '😡 ' : '★ ') + br.poke.n.toUpperCase() + (ph === 1 ? ' ★' : ''), x, y - hh - 26);
  ctx.shadowBlur = 0;
  const bw2 = Math.max(br.w * 0.85, 150), frac = Math.max(0, br.hp / br.maxHp);
  roundRect(x - bw2 / 2, y - hh - 16, bw2, 8, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
  if (frac > 0) {
    roundRect(x - bw2 / 2, y - hh - 16, bw2 * frac, 8, 4);
    const hg = ctx.createLinearGradient(x - bw2 / 2, 0, x + bw2 / 2, 0);
    hg.addColorStop(0, '#ff5252'); hg.addColorStop(1, '#ffd54f');
    ctx.fillStyle = hg; ctx.fill();
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
  if (MEW_VMAX_IMG.complete && MEW_VMAX_IMG.naturalWidth) {
    ctx.drawImage(MEW_VMAX_IMG, x - s / 2, yy - s / 2, s, s);
    if (br.flash > 0.35) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (br.flash - 0.35) * 0.65;
      ctx.drawImage(MEW_VMAX_IMG, x - s / 2, yy - s / 2, s, s);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = introAlpha;
    }
  } else drawGlyph(ctx, 'psychic', x, yy, s * 0.2, '#d780ff');
  const frac = Math.max(0, br.hp / br.maxHp), barW = Math.min(W * 0.55, Math.max(190, br.w * 1.12));
  const barY = Math.min(H * 0.55, y + br.h / 2 + 14);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 13px Orbitron, sans-serif';
  ctx.fillStyle = '#fff'; ctx.shadowColor = phCol; ctx.shadowBlur = 12;
  ctx.fillText('SECRET BOSS · MEW VMAX', x, barY - 14, barW + 30);
  ctx.shadowBlur = 0;
  roundRect(x - barW / 2, barY, barW, 10, 5);
  ctx.fillStyle = 'rgba(2,4,16,0.82)'; ctx.fill();
  if (frac > 0) {
    const hg = ctx.createLinearGradient(x - barW / 2, 0, x + barW / 2, 0);
    hg.addColorStop(0, '#58e7ff'); hg.addColorStop(0.55, '#d780ff'); hg.addColorStop(1, '#ff4f9a');
    roundRect(x - barW / 2, barY, barW * frac, 10, 5); ctx.fillStyle = hg; ctx.fill();
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
  const shell = ctx.createLinearGradient(x, y - hh, x, y + hh);
  shell.addColorStop(0, ph === 3 ? '#ff6b75' : mixHex(col, '#ffffff', 0.3));
  shell.addColorStop(0.18, col);
  shell.addColorStop(1, mixHex(col, '#070b19', 0.72));
  roundRect(x - hw, y - hh, br.w, br.h, 18); ctx.fillStyle = shell; ctx.fill();
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
  } else drawGlyph(ctx, 'pokeball', x, y, hh * 0.38, '#ffffff55');
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
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText('BOSS BRICK · ' + br.poke.n.toUpperCase(), x, y - hh - 29);
  ctx.shadowBlur = 0;
  const barW = Math.max(br.w * 0.9, 150), barY = y - hh - 18;
  roundRect(x - barW / 2, barY, barW, 9, 4.5);
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fill();
  if (frac > 0) {
    const hg = ctx.createLinearGradient(x - barW / 2, 0, x + barW / 2, 0);
    hg.addColorStop(0, '#ff5252'); hg.addColorStop(1, '#ffd54f');
    roundRect(x - barW / 2, barY, barW * frac, 9, 4.5); ctx.fillStyle = hg; ctx.fill();
  }
  ctx.fillStyle = 'rgba(6,9,24,0.92)';
  for (const f of [1 / 3, 2 / 3]) ctx.fillRect(x - barW / 2 + barW * f - 1, barY, 2, 9);
  ctx.restore();
}

function drawBricks() {
  const boss = G.bricks.find(b => b.isBoss && !b.dead && !b.dormant) || G.bricks.find(b => b.isBoss);
  const introOff = G.bossIntro > 0 ? -Math.pow(G.bossIntro / 1.6, 2) * (H * 0.4) : 0;
  for (const br of G.bricks) {
    if (br.dead || br.dormant) continue;
    const x = br.bx + G.fx;
    // idle bob is OFF while a brick is entering (out-of-phase bobbing on top
    // of the glide read as stutter) and eases back in once it lands (settleT)
    const bobAmp = br.entry ? 0 : (br.settleT == null ? 1 : br.settleT);
    let y = br.by + G.fy + Math.sin(G.time * 2 + br.wobble) * (br.isBoss ? 4 : 2.5) * bobAmp;
    if (br.isBoss && !br.gauntletEntering && !(G.gauntlet && G.mode === 'junkie')) y += introOff;
    const col = TYPE_COLORS[br.poke.t];
    const smallCard = br.w < 72; // mobile-sized cards get minimal overlays
    const tinyCard = br.w < 44;  // late-game horde cards: sprite + frame only
    // NB: br.flash is decayed in update() (dt-scaled) — render only READS it.
    // ---- FREE-FLYING ALIEN: broke out of its box — just the Pokémon,
    // banking through its pattern with a type-colored aura underneath.
    // Divers and once-dived (bare) blocks shattered their box too: NOTHING
    // attacks or flies as a full framed brick.
    if (bareMon(br)) {
      const img2 = getSprite(br.poke.id, br.shiny);
      ctx.save();
      ctx.globalAlpha = br.introAlpha == null ? 1 : br.introAlpha;
      const s2 = Math.min(br.w, br.h * 1.15) * 1.25 * (1 + br.flash * 0.1) * (br.introScale ?? 1);
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
          bobY = flap * 3.4;
          sclY = 1 + 0.07 * Math.sin(ph3 * 4.4);
          gaitRot = flap * 0.05;
          break;
        }
        case 'swim': // slow full-body undulation, nosing along the path
          gaitRot = Math.sin(ph3 * 1.5) * 0.12;
          bobY = Math.sin(ph3 * 0.75) * 2.4;
          break;
        case 'hover': // eerie hover: deep slow bob with a lazy roll
          bobY = Math.sin(ph3 * 0.55) * 3.8;
          gaitRot = Math.sin(ph3 * 0.38) * 0.07;
          break;
        case 'serpentine': // the whole body threads side to side
          gaitRot = Math.sin(ph3 * 1.7) * 0.16 * amp;
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
          gaitRot = Math.sin(ph3 * 2) * 0.035 * amp;
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
        ctx.scale(face * sclX, sclY);
        ctx.drawImage(img2, -s2 / 2, -s2 / 2, s2, s2);
        ctx.restore();
      } else {
        drawGlyph(ctx, 'pokeball', x, y, br.h * 0.4, '#ffffff33');
      }
      if (br.flash > 0.35) { // hit flash: white overlay pop on the sprite
        ctx.globalAlpha = (br.flash - 0.35) * 0.9;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (br.shiny) drawGlyph(ctx, 'fairy', x + s2 * 0.4, yb - s2 * 0.4, 5, '#ffd700');
      // Sentinel bosses always carry a named bar; ordinary tough flyers use a
      // compact ring once damaged. This creates a clear health hierarchy:
      // player rail → sentinel bar → legendary phase bar → elite rings.
      if (br.subBoss && br.hp > 0) {
        const frac = Math.max(0, br.hp / br.maxHp);
        const sbw = Math.max(78, s2 * 1.45), sby = yb - s2 * 0.67;
        ctx.font = '800 8px Orbitron, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8eef6';
        ctx.fillText((br.poke.n || NAMES[br.poke.id] || 'SENTINEL').toUpperCase(), x, sby - 8, sbw);
        roundRect(x - sbw / 2, sby, sbw, 6, 3);
        ctx.fillStyle = 'rgba(5,8,20,0.72)'; ctx.fill();
        if (frac > 0) {
          roundRect(x - sbw / 2, sby, sbw * frac, 6, 3);
          const sg = ctx.createLinearGradient(x - sbw / 2, 0, x + sbw / 2, 0);
          sg.addColorStop(0, col); sg.addColorStop(1, '#f5f7ff');
          ctx.fillStyle = sg; ctx.fill();
        }
      } else if (br.maxHp >= 3 && br.hp < br.maxHp && br.hp > 0) {
        const frac = Math.max(0, br.hp / br.maxHp);
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(8,12,28,0.55)';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.56, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = frac > 0.5 ? '#9ccc65' : frac > 0.25 ? '#ffd54f' : '#ff7043';
        ctx.beginPath(); ctx.arc(x, yb, s2 * 0.56, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
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
      else drawBossMon(br, x, y);
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
    // top face
    if (br.isBoss) { ctx.shadowColor = br.phase === 2 ? '#ff5252' : col; ctx.shadowBlur = br.phase === 2 ? 30 + Math.sin(G.time * 8) * 8 : 26; }
    const grad = ctx.createLinearGradient(x, y - hh, x, y + hh);
    grad.addColorStop(0, col + 'e6');
    grad.addColorStop(1, col + '66');
    roundRect(x - hw, y - hh, br.w, br.h, rad);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
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
    if (br.poke.id === -1) { // MISSINGNO. — glitched static block
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
        drawGlyph(ctx, 'pokeball', x, y, hh * 0.5, '#ffffff');
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
    if (br.isBoss) {
      ctx.font = '900 13px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = br.phase === 2 ? '#ff8a80' : '#fff';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
      ctx.fillText((br.phase === 2 ? '😡 ' : '★ ') + br.poke.n.toUpperCase() + (br.phase === 2 ? '' : ' ★'), x, y - hh - 26);
      ctx.shadowBlur = 0;
      const bw2 = br.w * 0.85, frac = Math.max(0, br.hp / br.maxHp);
      roundRect(x - bw2 / 2, y - hh - 16, bw2, 8, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      if (frac > 0) {
        roundRect(x - bw2 / 2, y - hh - 16, bw2 * frac, 8, 4);
        const hg = ctx.createLinearGradient(x - bw2 / 2, 0, x + bw2 / 2, 0);
        hg.addColorStop(0, '#ff5252'); hg.addColorStop(1, '#ffd54f');
        ctx.fillStyle = hg; ctx.fill();
      }
    } else if (br.armored) {
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
    ctx.font = '900 40px Orbitron, sans-serif';
    const col = TYPE_COLORS[boss.poke.t];
    ctx.shadowColor = col; ctx.shadowBlur = 28;
    ctx.fillStyle = col;
    ctx.fillText('★ ' + boss.poke.n.toUpperCase() + ' ★', W / 2, H * 0.42);
    ctx.shadowBlur = 0;
    ctx.font = '700 16px Orbitron, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText((boss.mythic ? 'MYTHICAL OF ' : boss.subBoss ? 'SENTINEL OF ' : 'GUARDIAN OF ') + genFor(G.level).name, W / 2, H * 0.42 + 40);
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
  if (!(volley || impact || prism || aegis || surge || bond)) return;
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
  const s = preview ? 42 + G.starterLvl * 3 : 54 + G.starterLvl * 6;
  const bob = Math.sin(G.time * 3.2) * (preview ? 1.2 : 2.5);
  const y = py + bob;
  const tilt = preview ? 0 : Math.max(-0.34, Math.min(0.34, G.paddle.speed * 0.00028));
  // element aura — the "this is you" glow
  const ag = ctx.createRadialGradient(x, y, 4, x, y, s * 0.8);
  ag.addColorStop(0, col + '3c'); ag.addColorStop(0.7, col + '14'); ag.addColorStop(1, col + '00');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); ctx.fill();
  // jet exhaust under the mon, flickering in the element color
  const fl = (preview ? 0.68 : 1) + 0.35 * Math.sin(G.time * 26) + 0.18 * Math.sin(G.time * 57);
  ctx.save();
  ctx.translate(x, y + s * 0.34);
  ctx.rotate(tilt * 0.6);
  const jg = ctx.createLinearGradient(0, 0, 0, 28 * fl);
  jg.addColorStop(0, '#ffffff'); jg.addColorStop(0.35, col); jg.addColorStop(1, col + '00');
  ctx.fillStyle = jg;
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
  const img = pil.id > 0 ? getSprite(pil.id) : null;
  const ok = !!(img && img.complete && img.naturalWidth);
  const shadow = ok ? getSilhouette(pil.id, '#060a18') : null;
  const rim = ok ? getSilhouette(pil.id, col) : null;
  const flash = ok ? getSilhouette(pil.id, '#ffffff') : null;
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
    ctx.globalAlpha = 0.3 + 0.45 * atk + (mega ? 0.2 : 0);
    const rs = s * 1.07;
    ctx.drawImage(rim, -rs / 2, -rs / 2 - 1.5, rs, rs);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.shadowColor = mega ? `hsl(${(G.time * 160) % 360},90%,60%)` : col;
  ctx.shadowBlur = mega ? 26 : 12 + 14 * atk;
  if (ok) ctx.drawImage(img, -s / 2, -s / 2, s, s);
  else {
    // Neutral training drone: a compact vector craft, never an implicit
    // Pokémon. Picking Pikachu is now an explicit, high-power choice.
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
      ctx.fillStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : frac > 0.33 ? '#ffd54f' : '#80d8ff';
      ctx.fill();
    }
    if (hot) {
      ctx.font = '700 9px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff8a80';
      ctx.fillText('OVERHEAT', x, hy + 12);
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
  const socketN = totalPathLevels();
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
    ctx.restore();
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
    const pulse = 0.5 + 0.5 * Math.sin(G.time * 3);
    const hr = pwv * 0.7 + 16 + 8 * pulse;
    const hg = ctx.createRadialGradient(x, py, 6, x, py, hr);
    hg.addColorStop(0, `rgba(255,213,79,${0.15 + 0.12 * pulse})`);
    hg.addColorStop(0.6, `rgba(255,213,79,${0.05 + 0.05 * pulse})`);
    hg.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(x, py, hr, hr * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    const tp = (G.time % 1.6) / 1.6; // one ping every 1.6s, grows and fades
    const rr = pwv * 0.5 + tp * 48;
    ctx.globalAlpha = (1 - tp) * 0.4;
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, py, rr, rr * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // SPACE JUNKIE mode: no paddle — you ARE the Pokémon
  if (G.mode === 'junkie') { drawPilotRig(x, py); ctx.restore(); return; }
  const sMon = STARTER_MON[G.starter];
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
  ctx.shadowBlur = mega ? 26 : 18;
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
  const barrels = upgN('twin') ? [-10, 10] : [0];
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
      ctx.fillStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : frac > 0.33 ? '#ffd54f' : '#80d8ff';
      ctx.fill();
    }
    if (hot) {
      ctx.font = '700 9px Orbitron, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff8a80';
      ctx.fillText('OVERHEAT', x, hy + 12);
    }
    ctx.globalAlpha = 1;
  }
  ctx.beginPath(); ctx.arc(x, py, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, py, 11, Math.PI, 0, true);
  ctx.fillStyle = '#ef5350'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#eceff1'; ctx.fill();
  ctx.strokeStyle = '#263238'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, py, 11, 0, Math.PI * 2); ctx.stroke();
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
      const hg = ctx.createRadialGradient(b.x, b.y, b.r * 0.4, b.x, b.y, hr);
      hg.addColorStop(0, hc); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.12 + bright * 0.34;
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(b.x, b.y, hr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = G.fx_fire ? '#ff5722' : (elemCol || '#90caf9');
    ctx.shadowBlur = SETTINGS.hcBall ? 0 : 16 + bright * 20;
    const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
    if (SETTINGS.hcBall) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffffff'); }
    else if (G.fx_fire) { g.addColorStop(0, '#fff3e0'); g.addColorStop(0.5, '#ffb74d'); g.addColorStop(1, '#e64a19'); }
    else if (elemCol) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, elemCol); g.addColorStop(1, elemCol); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#bbdefb'); g.addColorStop(1, '#42a5f5'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    if (SETTINGS.hcBall) { // black keyline: visible over any background
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 1, 0, Math.PI * 2); ctx.stroke();
    }
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
function drawTelegraphs() {
  for (const tg of G.telegraphs) {
    if (tg.br.dead) continue;
    const bx = tg.br.bx + G.fx, by = tg.br.by + G.fy + tg.br.h / 2;
    const prog = 1 - tg.t / tg.max;
    ctx.save();
    // BOSS shots are aimed and lethal → draw the full trajectory line. Regular
    // shots just drop straight down, so a short stub + a charging muzzle glow
    // is warning enough and keeps the board from filling with lines.
    if (tg.boss) {
      ctx.globalAlpha = 0.25 + prog * 0.45;
      ctx.setLineDash([6, 9]);
      ctx.lineDashOffset = -G.time * 70;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e1bee7';
      const ang = Math.atan2(PADDLE_Y() - by, G.paddle.x - bx);
      const len = Math.hypot(PADDLE_Y() - by, G.paddle.x - bx);
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = 0.3 + prog * 0.45;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff8a80';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 26); ctx.stroke();
    }
    // charging glow at the muzzle
    ctx.globalAlpha = 0.5 + prog * 0.5;
    ctx.fillStyle = tg.boss ? '#b388ff' : '#ff5252';
    ctx.beginPath(); ctx.arc(bx, by, 3 + prog * (tg.boss ? 7 : 4), 0, Math.PI * 2); ctx.fill();
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
      ctx.globalAlpha = 0.8 * a;
      const g = ctx.createLinearGradient(cs.x - cs.w / 2, 0, cs.x + cs.w / 2, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, col);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cs.x - cs.w / 2, 0, cs.w, FLOOR());
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
  ctx.shadowColor = col; ctx.shadowBlur = 14;
  // evolved partners hit VISIBLY harder: the whole attack scales up a step
  // per tier (geometry only — hitboxes are unchanged, generosity stays)
  const sz = 1 + (tier - 1) * 0.16;
  if (sz !== 1) { ctx.translate(L.x, L.y); ctx.scale(sz, sz); ctx.translate(-L.x, -L.y); }
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
    const g = ctx.createRadialGradient(L.x - 2, L.y - 4, 1, L.x, L.y, 13 * puls);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, col + '18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(L.x, L.y - 15 * puls);
    ctx.quadraticCurveTo(L.x + 8 * puls, L.y - 2, L.x, L.y + 12 * puls);
    ctx.quadraticCurveTo(L.x - 8 * puls, L.y - 2, L.x, L.y - 15 * puls);
    ctx.fill();
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
    const dg = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, 15);
    dg.addColorStop(0, col + '55'); dg.addColorStop(1, col + '00');
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(L.x, L.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(L.x, L.y);
    ctx.rotate(t * 16 + L.x * 0.1);
    const lg = ctx.createLinearGradient(0, -13, 0, 13);
    lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, col); lg.addColorStop(1, col);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(9, -3, 0, 13);
    ctx.quadraticCurveTo(-9, -3, 0, -13);
    ctx.fill();
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
    ctx.shadowBlur = 8;
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
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(L.x, L.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
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
    const hg2 = ctx.createRadialGradient(L.x, L.y, 1, L.x, L.y, 16);
    hg2.addColorStop(0, col + '66'); hg2.addColorStop(1, col + '00');
    ctx.fillStyle = hg2;
    ctx.beginPath(); ctx.arc(L.x, L.y, 16, 0, Math.PI * 2); ctx.fill();
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
      ctx.shadowColor = ccol; ctx.shadowBlur = 28;
      const g = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, ccol); g.addColorStop(1, ccol + '1f');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(L.x, L.y, r * 0.62, r, 0, 0, Math.PI * 2); ctx.fill();
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
      continue;
    }
    // BLASTER-mode basic bolts read as sleek energy darts (vs the classic slug)
    if (G.mode === 'blaster' && L.basic) {
      const bw4 = 5 + (L.heavy ? 3 : 0) + (L.pulse ? 2 : 0);
      const boltCol = L.nova ? '#ffccbc' : L.pulse ? PATHS.impact.color : '#4dd0e1';
      ctx.shadowColor = boltCol; ctx.shadowBlur = L.pulse ? 23 : 15;
      ctx.fillStyle = boltCol;
      roundRect(L.x - bw4 / 2, L.y - 26, bw4, 42, bw4 / 2); ctx.fill();
      ctx.fillStyle = '#e0ffff';
      roundRect(L.x - 1.3, L.y - 22, 2.6, 32, 1.3); ctx.fill();
      if (L.pulse) {
        ctx.strokeStyle = L.nova ? '#ffffff' : '#ffab91'; ctx.lineWidth = L.nova ? 2.5 : 1.5;
        ctx.beginPath(); ctx.ellipse(L.x, L.y - 4, bw4 + 4, 24, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      continue;
    }
    const pulseCol = L.nova ? '#ffccbc' : PATHS.impact.color;
    ctx.shadowColor = L.pulse ? pulseCol : L.explosive ? '#ff7043' : L.basic ? '#80d8ff' : '#ffd54f';
    ctx.shadowBlur = L.pulse ? 22 : 16;
    ctx.fillStyle = L.pulse ? pulseCol : L.explosive ? '#ff8a65' : L.basic ? '#b3e5fc' : '#fff176';
    const bw4 = 8 + (L.heavy ? 3 : 0) + (L.pulse ? 2 : 0);
    roundRect(L.x - bw4 / 2, L.y - 20, bw4, 32, 4); ctx.fill();
    // bright core
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(L.x - 1.5, L.y - 16, 3, 24, 1.5); ctx.fill();
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
    ctx.restore();
  }
  for (const m of G.missiles) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
    ctx.shadowColor = '#7986cb'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#c5cae9';
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.lineTo(-7, 11); ctx.lineTo(7, 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8a65';
    ctx.beginPath(); ctx.arc(0, 14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // enemy fire: spinning spiked hazards — deliberately NOT ball-shaped so
  // incoming shots read instantly as danger, never confused with your ball
  // enemy shots: pre-baked sprites (halo, star, outline, pupil all baked in)
  // — a Last-Stand shockwave of 30 shots costs 30 drawImages, not 60 gradient
  // allocations + 30 shadowBlur stalls, which was stuttering phones
  for (const s of G.enemyShots) {
    const r = s.r || (s.boss ? 13 : 10);
    const spin = G.time * (s.boss ? 4 : 6) + s.x * 0.05;
    const col = s.boss ? '#ff5cf0' : s.type ? TYPE_COLORS[s.type] : '#ff5252';
    // short motion tail shows travel direction (plain alpha stroke, no gradient)
    const sp = Math.hypot(s.vx || 0, s.vy || 0) || 1;
    const ux = (s.vx || 0) / sp, uy = (s.vy || 1) / sp;
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x - ux * 6, s.y - uy * 6); ctx.lineTo(s.x - ux * (s.heavy ? 30 : 24), s.y - uy * (s.heavy ? 30 : 24)); ctx.stroke();
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
    ctx.translate(s.x, s.y);
    ctx.rotate(spin);
    const img = shotSprite(col, r, s.boss ? 8 : 6);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
}

function drawPowerups() {
  for (const pu of G.powerups) {
    ctx.save();
    // gentle bob + slight tilt — calmer than the old spin
    ctx.translate(pu.x, pu.y + Math.sin(pu.rot * 1.6) * 2);
    ctx.rotate(Math.sin(pu.rot) * 0.1);
    if (pu.p.key === 'riftShard') {
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 5 + pu.shardIndex * 1.8);
      ctx.shadowColor = '#d780ff'; ctx.shadowBlur = 20 + pulse * 12;
      ctx.beginPath();
      ctx.moveTo(0, -24); ctx.lineTo(16, -4); ctx.lineTo(7, 22); ctx.lineTo(-13, 12); ctx.lineTo(-17, -8); ctx.closePath();
      const sg = ctx.createLinearGradient(-14, -20, 14, 22);
      sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#80e8ff'); sg.addColorStop(0.68, '#d780ff'); sg.addColorStop(1, '#6a1b9a');
      ctx.fillStyle = sg; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = '#32114d'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(1, 8); ctx.lineTo(16, -4); ctx.moveTo(1, 8); ctx.lineTo(-13, 12); ctx.stroke();
      ctx.globalAlpha = 1;
      drawGlyph(ctx, 'fairy', 1, 3, 5.5, '#ffffff');
    } else if (pu.p.key === 'element') {
      // element orb: small glassy sphere holding a type symbol
      const col = TYPE_COLORS[pu.p.t];
      ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8,12,30,0.85)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      ctx.shadowBlur = 0;
      drawGlyph(ctx, pu.p.t, 0, 0, 7.5, col);
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
      const hg = ctx.createLinearGradient(-12, -16, 12, 16);
      hg.addColorStop(0, '#ffd7e2'); hg.addColorStop(0.36, col); hg.addColorStop(1, '#5b1730');
      ctx.fillStyle = hg; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff0f4'; ctx.stroke();
      drawGlyph(ctx, 'heart', 0, 1, 9, '#fff');
      ctx.fillStyle = '#fff';
      ctx.fillRect(8, -12, 7, 2.5); ctx.fillRect(10.25, -14.25, 2.5, 7);
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
      const cg = ctx.createLinearGradient(0, -17, 0, 17);
      cg.addColorStop(0, col + 'd9');
      cg.addColorStop(0.55, col + '55');
      cg.addColorStop(1, 'rgba(8,12,30,0.92)');
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

function drawParticles() {
  drawRings();
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
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.font = `900 ${f.size}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
  }
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
  const y = H * 0.64;
  // entrance: the banner scales in with a soft pop instead of just appearing
  const enter = Math.min(1, (a.max - a.t) / 0.22);
  const sc = 0.93 + 0.07 * (1 - Math.pow(1 - enter, 3));
  ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.translate(-W / 2, -y);
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
function drawAnnounceStrip(a) {
  const fadeOut = a.max - a.t < 0.3 ? (a.max - a.t) / 0.3 : 1;
  const alpha = Math.min(fadeOut, a.t < 0.4 ? a.t / 0.4 : 1);
  const enter = Math.min(1, (a.max - a.t) / 0.22);
  // below the full left HUD column (type/rift/build rows) and the corner
  // buttons on phones; wide screens tuck it right under the wave title.
  // SHORT viewports (landscape phones) have no free band under the HUD —
  // the flocks fly there — so the strip uses the mid-screen gap between
  // the flock band and the ship's lane instead
  const y = H < 560 ? H * 0.42 : SAFE_T + (W < 560 ? 150 : 88);
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
  const lead = (isGlyph ? gR * 2 + 8 : 0) + (sprR ? sprR * 2 + 8 : 0);
  const pillW = Math.min(W - 12, Math.max(nameW + lead, descW) + 44);
  const pillH = a.desc ? 46 : 30;
  ctx.globalAlpha = alpha * 0.9;
  roundRect(W / 2 - pillW / 2, y - pillH / 2, pillW, pillH, 13);
  ctx.fillStyle = 'rgba(6,9,24,0.85)'; ctx.fill();
  ctx.strokeStyle = a.color + '77'; ctx.lineWidth = 1.3; ctx.stroke();
  const nameY = a.desc ? y - 9 : y;
  ctx.font = `900 ${nameSize}px Orbitron, sans-serif`;
  ctx.fillStyle = a.color;
  const half = (nameW + lead) / 2;
  let lx = W / 2 - half;
  if (sprR) {
    const spr = getSprite(a.spriteId, a.spriteShiny);
    if (spr.complete && spr.naturalWidth) {
      ctx.save();
      ctx.beginPath(); ctx.arc(lx + sprR, y, sprR - 1, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(spr, lx, y - sprR, sprR * 2, sprR * 2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(lx + sprR, y, sprR, 0, Math.PI * 2);
      ctx.strokeStyle = a.color; ctx.lineWidth = 1.5; ctx.stroke();
    }
    lx += sprR * 2 + 8;
  }
  if (isGlyph) { drawGlyph(ctx, a.icon, lx + gR, nameY, gR, a.color); lx += gR * 2 + 8; }
  ctx.textAlign = 'left';
  ctx.fillText(a.name, lx, nameY);
  if (a.desc) {
    ctx.textAlign = 'center';
    ctx.font = bodyFont(10, 700);
    ctx.fillStyle = '#dfe8f2';
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillText(a.desc, W / 2 + (sprR ? sprR + 4 : 0), y + 11, maxTextW);
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
    ctx.font = '800 15px Orbitron, sans-serif';
    const tw2 = ctx.measureText(txt).width + 44;
    const hy2 = H * 0.62;
    ctx.globalAlpha = pa;
    ctx.shadowColor = '#4dd0e1'; ctx.shadowBlur = 18;
    roundRect(W / 2 - tw2 / 2, hy2 - 19, tw2, 38, 19);
    ctx.fillStyle = 'rgba(6,14,28,0.92)'; ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#4dd0e1'; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e0f7fa';
    ctx.fillText(txt, W / 2, hy2 + 1, tw2 - 20);
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
  const a = Math.min(1, G.playT / 0.6) * (0.55 + 0.35 * Math.sin(G.time * 5));
  const text = G.mode === 'junkie'
    ? (IS_TOUCH ? (SETTINGS.autoFire ? 'DRAG TO FLY · AUTO-FIRE ON · HOLD = BIG ATTACK' : 'DRAG TO FLY · TAP ATTACK · HOLD = BIG ATTACK') : 'MOVE TO FLY · CLICK TO ATTACK · RIGHT-CLICK/SHIFT CHARGES')
    : G.mode === 'blaster'
      ? (IS_TOUCH ? (SETTINGS.autoFire ? 'DRAG TO MOVE · AUTO-FIRE ON · HOLD = CHARGE' : 'DRAG TO MOVE · TAP FIRE · HOLD = CHARGE') : 'MOVE TO STEER · CLICK TO FIRE · RIGHT-CLICK/SHIFT CHARGES')
      : (IS_TOUCH ? 'HOLD FIRE TO SHOOT' : 'HOLD CLICK TO SHOOT — MIND THE HEAT');
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = bodyFont(12, 700);
  const x = IS_TOUCH ? W / 2 : G.paddle.x;
  const y = IS_TOUCH ? FLOOR() - 168 : shipY() - (G.mode === 'junkie' ? 96 : 72);
  const tw = Math.min(W - 24, ctx.measureText(text).width + 26);
  roundRect(x - tw / 2, y - 15, tw, 30, 15);
  ctx.fillStyle = 'rgba(8,12,30,0.75)'; ctx.fill();
  ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#b3e5fc';
  ctx.fillText(text, x, y + 1, tw - 16);
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
  const by = y - 92 * (1 - settle);
  const br = 13 - settle * 3;
  blitBadge(fx.icon || 'star', x, by, br, col, 'lit');
  if (settle > 0.35) {
    const lock = Math.min(1, (settle - 0.35) / 0.65);
    const rr = 18 + lock * 34 + p * 8;
    ctx.strokeStyle = col; ctx.lineWidth = 3 - p * 1.2;
    constellationHex(x, y, rr, Math.PI / 6 + p * (SETTINGS.reduceFlash ? 0.08 : 0.32)); ctx.stroke();
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
  const styles = Object.keys(GAUNTLET_ENTRANCE_NAMES), si = Math.max(0, styles.indexOf(e.style));
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

// player health ring — our own character's vitals, styled like the enemy HP
// dials: a glowing arc over a faint track, tick-segmented per life, with the
// count in the middle. Greens → amber → red as it drains; the last life pulses.
function drawLifeRing() {
  const denom = Math.max(1, G.livesMax || G.lives);
  const R = 21, cx = W - 32, cy = 29;
  const frac = Math.max(0, Math.min(1, G.lives / denom));
  const danger = G.lives <= 1;
  const col = danger ? '#ff5252' : G.lives === 2 ? '#ffca6a' : '#5fe0a6';
  const pulse = danger ? 0.55 + 0.45 * Math.abs(Math.sin(G.time * 4)) : 1;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // disc + rim
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6,10,26,0.82)'; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
  // faint full track
  ctx.beginPath(); ctx.arc(cx, cy, R - 4, 0, Math.PI * 2);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.stroke();
  // health arc (glowing), from 12 o'clock clockwise
  ctx.save();
  ctx.shadowColor = col; ctx.shadowBlur = 9 * pulse;
  ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.arc(cx, cy, R - 4, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.stroke();
  ctx.restore();
  // notches between lives so the discrete count reads at a glance
  if (denom > 1 && denom <= 8) {
    for (let i = 0; i < denom; i++) {
      const a = -Math.PI / 2 + (i / denom) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R - 6.5), cy + Math.sin(a) * (R - 6.5));
      ctx.lineTo(cx + Math.cos(a) * (R - 1.5), cy + Math.sin(a) * (R - 1.5));
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(6,10,26,0.92)'; ctx.stroke();
    }
  }
  // centre: tiny heart + the count
  drawGlyph(ctx, 'heart', cx, cy - 6, 4.5, col);
  ctx.globalAlpha = pulse;
  ctx.font = '900 15px Orbitron, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(String(G.lives), cx, cy + 6);
  ctx.restore();
}
// Persistent segmented HP rail. The ring remains the compact count, while
// this second readout makes both maximum health and missing segments obvious
// without waiting for the temporary on-hit bar near the player.
function drawPlayerHealthBar() {
  const denom = Math.max(1, G.livesMax || G.lives);
  const lives = Math.max(0, G.lives);
  const danger = lives <= 1;
  const col = danger ? '#ff5252' : lives === 2 ? '#ffca6a' : '#5fe0a6';
  const pulse = danger ? 0.62 + 0.38 * Math.abs(Math.sin(G.time * 5)) : 1;
  const barW = W < 560 ? 112 : 154;
  const x = W - 18 - barW, y = 16, h = 25;
  const labelW = W < 560 ? 45 : 55;
  const gap = 3, segN = Math.min(6, denom);
  const segW = (barW - labelW - 12 - gap * (segN - 1)) / segN;
  ctx.save();
  ctx.globalAlpha = pulse;
  roundRect(x, y, barW, h, 9);
  ctx.fillStyle = 'rgba(6,10,26,0.8)'; ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = col + '77'; ctx.stroke();
  ctx.font = `900 ${W < 560 ? 8 : 9}px Orbitron, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = col;
  ctx.fillText('HP ' + lives + '/' + denom, x + labelW / 2 + 3, y + h / 2 + 0.5, labelW - 4);
  let sx = x + labelW + 5;
  if (denom <= 6) {
    for (let i = 0; i < denom; i++) {
      roundRect(sx, y + 7, segW, h - 14, 3);
      ctx.fillStyle = i < lives ? col : 'rgba(255,255,255,0.12)'; ctx.fill();
      if (i < lives) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        roundRect(sx + 1, y + 8, Math.max(1, segW - 2), 2, 1); ctx.fill();
      }
      sx += segW + gap;
    }
  } else {
    const railW = barW - labelW - 12;
    roundRect(sx, y + 7, railW, h - 14, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    const frac = Math.max(0, Math.min(1, lives / denom));
    if (frac > 0) { roundRect(sx, y + 7, railW * frac, h - 14, 3); ctx.fillStyle = col; ctx.fill(); }
  }
  ctx.restore();
}
function drawRiftTracker() {
  if (!secretEligible() && !G.secret.vmax) return;
  const hudElem = G.mode === 'junkie';
  const y = ((G.ballElement || hudElem) ? (G.combo > 1 ? 130 : 112) : (G.combo > 1 ? 112 : 94));
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '800 9px Orbitron, sans-serif'; ctx.fillStyle = '#b6c3d8';
  ctx.fillText('RIFT KEY', 20, y);
  for (let i = 0; i < 3; i++) {
    const x = 88 + i * 18, held = G.secret.shards[i];
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = held ? (i === 2 ? '#ffffff' : '#d780ff') : 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = held ? '#80e8ff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.3;
    ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); ctx.restore();
  }
  ctx.font = '700 8px Orbitron, sans-serif'; ctx.fillStyle = '#78909c';
  ctx.fillText(secretShardCount() + '/3', 146, y);
  ctx.restore();
}
function drawHUD() {
  // the bar absorbs the top safe-area inset (notch / Dynamic Island): the
  // backdrop grows taller and every top-anchored element shifts down with it
  const g = ctx.createLinearGradient(0, 0, 0, 56 + SAFE_T);
  g.addColorStop(0, 'rgba(5,8,25,0.92)'); g.addColorStop(1, 'rgba(5,8,25,0.4)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 56 + SAFE_T);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(0, 56 + SAFE_T); ctx.lineTo(W, 56 + SAFE_T); ctx.stroke();
  ctx.save();
  ctx.translate(0, SAFE_T);

  ctx.textBaseline = 'middle';
  ctx.font = '700 20px Orbitron, sans-serif';
  ctx.textAlign = 'left';
  // score COUNTS up, glowing gold while it ticks
  const ticking = G.scoreShown < G.score - 0.5;
  if (ticking) { ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 12; ctx.fillStyle = '#fff8d6'; }
  else ctx.fillStyle = '#fff';
  ctx.fillText(String(Math.floor(G.scoreShown)).padStart(7, '0'), 20, 28);
  ctx.shadowBlur = 0;
  if (W >= 560) { // narrow screens: row 2 belongs to the wave title
    ctx.font = '500 10px Orbitron, sans-serif';
    ctx.fillStyle = '#90a4ae';
    ctx.fillText('BEST ' + G.best, 20, 46);
  }
  // combo + ball element live just below the bar, clear of the wave title
  if (G.combo > 1) {
    // pop-scale on every kill — the combo feels alive
    const pop = G.comboPop;
    ctx.fillStyle = pop > 0.6 ? '#fff' : '#ffd54f';
    ctx.font = `700 ${13 + pop * 4}px Orbitron, sans-serif`;
    ctx.fillText('COMBO x' + G.combo, 20, 72);
  }
  const hudElem = G.mode === 'junkie'; // junkie always shows the live attack type
  if (G.ballElement || hudElem) {
    const el = hudElem ? attackElement() : G.ballElement;
    ctx.fillStyle = TYPE_COLORS[el];
    ctx.font = '700 11px Orbitron, sans-serif';
    const basePartner = G.ballElementT > 1000 && G.starter && el === G.starter;
    const tag = hudElem
      ? (G.ballElement
        ? el.toUpperCase() + ' TYPE · ITEM · ' + Math.max(1, Math.ceil(G.ballElementT)) + 's'
        : el.toUpperCase() + ' TYPE · PILOT')
      : el.toUpperCase() + (G.mode === 'classic' ? ' BALL' : ' WEAPON') + (basePartner
        ? ' · PARTNER'
        : ' · POWER-UP · ' + Math.max(1, Math.ceil(G.ballElementT)) + 's');
    ctx.fillText('⬤ ' + tag, 20, G.combo > 1 ? 90 : 72);
  }
  // skill tree at a glance — Phoenix-style: your build is always visible
  {
    const treeY = ((G.ballElement || hudElem) ? (G.combo > 1 ? 110 : 92) : (G.combo > 1 ? 92 : 74));
    const compactBuild = W < 560 || IS_TOUCH;
    if (compactBuild) {
      const ownedPaths = PATH_KEYS.filter(pk => pathLvl(pk) > 0).length;
      const ownedTiers = totalPathLevels();
      if (ownedPaths) {
        ctx.font = '700 9.5px Orbitron, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#78909c';
        ctx.fillText('BUILD ' + ownedTiers + ' · ' + ownedPaths + (ownedPaths === 1 ? ' PATH' : ' PATHS'), 20, treeY);
      }
    } else {
      let tx3 = 26;
      for (const pk of PATH_KEYS) {
        const lvl = pathLvl(pk);
        if (!lvl) continue;
        const P = PATHS[pk];
        drawGlyph(ctx, P.tiers[lvl - 1].icon, tx3, treeY, 6.5, P.color);
        ctx.font = '700 10px Orbitron, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = lvl >= 4 ? P.color : '#90a4ae';
        ctx.fillText(lvl + '/4', tx3 + 11, treeY + 1);
        tx3 += 48;
      }
    }
  }
  drawRiftTracker();
  ctx.textAlign = 'center';
  const narrow = W < 560; // phones: wave title drops to the second HUD row
  ctx.font = `900 ${Math.min(16, W / 30)}px Orbitron, sans-serif`;
  ctx.fillStyle = '#e3f2fd';
  const gen = genFor(G.level);
  const stg = stageIdx(G.level);
  const waveY = narrow ? 46 : (G.modifier ? 22 : 28);
  const waveText = G.secret.vmax ? 'SECRET RIFT · MEW VMAX'
    : (G.trial ? 'TRIAL · ' : '') + gen.name + ' ' + (stg + 1) + '/3 · ' + STAGE_NAMES[stg];
  ctx.fillText(waveText, W / 2, waveY);
  if (G.modifier && !narrow) {
    ctx.font = '700 10px Orbitron, sans-serif';
    ctx.fillStyle = G.modifier.color;
    drawGlyph(ctx, G.modifier.icon, W / 2 - ctx.measureText(G.modifier.name).width / 2 - 12, 42, 6, G.modifier.color);
    ctx.fillText(G.modifier.name, W / 2 + 4, 42);
  }
  drawPlayerHealthBar();
  ctx.restore(); // end of the top-anchored, safe-area-shifted cluster
  drawBrickBehaviorLegend();
  drawCombatNotice();
  // ---- active power-up chips: capped slots so phones stay readable ----
  const active = [];
  for (const [slot, icon, color] of [
    ['fx_fire', 'fire', '#ff7043'], ['fx_laser', 'laser', '#ffd54f'], ['fx_wide', 'wide', '#42a5f5'],
    ['fx_slow', 'slow', '#4dd0e1'], ['fx_magnet', 'magnet', '#ec407a'], ['fx_score', 'star', '#ffee58'],
    ['fx_draco', 'draco', '#5c6bc0'],
  ]) {
    if (G[slot]) active.push({ icon, color, tier: G[slot].tier, t: G[slot].t });
  }
  if (G.shieldCharges > 0) active.push({ icon: 'shield', color: '#66bb6a', tier: G.shieldCharges, t: null });
  const riftReward = SECRET_UPGRADES.find(s => G.secretUpg[s.key]);
  if (riftReward) active.push({ icon: riftReward.icon, color: riftReward.color, tier: 1, t: null, label: 'RIFT' });
  const maxSlots = (narrow || IS_TOUCH) ? 3 : 7;
  active.sort((a, b) => (a.t ?? 99) - (b.t ?? 99)); // most urgent first
  const shown = active.slice(0, maxSlots);
  let cx2 = 14;
  const cy = FLOOR() - 26;
  for (const chip of shown) {
    ctx.save();
    ctx.globalAlpha = chip.t != null && chip.t < 2 ? (0.4 + 0.6 * Math.abs(Math.sin(G.time * 6))) : 1;
    roundRect(cx2, cy - 17, 54, 34, 9);
    ctx.fillStyle = 'rgba(8,12,28,0.55)'; ctx.fill();
    ctx.strokeStyle = chip.color + '99'; ctx.lineWidth = 1.5; ctx.stroke();
    drawGlyph(ctx, chip.icon, cx2 + 15, cy, 8.5, chip.color);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '700 10px Orbitron, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(chip.label || (chip.t == null ? 'x' + chip.tier : (romanTier(chip.tier) || '·')), cx2 + 29, cy - 5);
    if (chip.t != null) {
      ctx.fillStyle = '#90a4ae';
      ctx.font = '500 9px Orbitron, sans-serif';
      ctx.fillText(Math.ceil(chip.t) + 's', cx2 + 29, cy + 7);
    }
    ctx.restore();
    cx2 += 60;
  }
  if (active.length > shown.length) {
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#90a4ae';
    ctx.fillText('+' + (active.length - shown.length), cx2 + 2, cy);
  }
  // ---- MEGA meter (desktop) or touch buttons (phones/tablets) ----
  if (G.state === 'play' || G.state === 'serve') {
    if (IS_TOUCH) drawTouchControls();
    else {
      const mw = 160, mh = 12, mx = W - mw - 20, my = FLOOR() - 28;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '900 11px Orbitron, sans-serif';
      const ready = G.mega >= 1 && G.megaT <= 0;
      ctx.fillStyle = ready ? `hsl(${(G.time * 200) % 360},90%,65%)` : '#90a4ae';
      const megaPct = Math.round(Math.min(1, G.mega) * 100) + '%';
      ctx.fillText(G.megaT > 0 ? 'MEGA ACTIVE' : ready ? 'MEGA READY — E' : 'MEGA · HITS CHARGE', mx, my - 12);
      ctx.textAlign = 'right';
      ctx.fillStyle = ready ? '#ffd54f' : '#c5b3e6';
      ctx.fillText(G.megaT > 0 ? Math.ceil(G.megaT) + 's' : megaPct, mx + mw, my - 12);
      ctx.textAlign = 'left';
      roundRect(mx, my - 4, mw, mh, 6);
      ctx.fillStyle = 'rgba(171,71,188,0.2)'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(206,147,216,0.48)'; ctx.stroke();
      const frac = G.megaT > 0 ? G.megaT / megaDur() : G.mega;
      if (frac > 0) {
        roundRect(mx, my - 4, mw * Math.min(1, frac), mh, 6);
        const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
        if (G.megaT > 0) { mg.addColorStop(0, `hsl(${(G.time * 160) % 360},90%,60%)`); mg.addColorStop(1, '#fff176'); }
        else { mg.addColorStop(0, '#7e57c2'); mg.addColorStop(1, ready ? '#ffd54f' : '#ab47bc'); }
        ctx.fillStyle = mg; ctx.fill();
      }
      if (ready) {
        ctx.save();
        ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 10 + Math.sin(G.time * 6) * 6;
        roundRect(mx, my - 4, mw, mh, 6);
        ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
    }
  }
  drawHurtHealth();
}
function drawBrickBehaviorLegend() {
  if (G.mode !== 'classic' || stageIdx(G.level) === 2 || (G.state !== 'play' && G.state !== 'serve')) return;
  const key = BRICK_BEHAVIOR_ORDER[Math.min(BRICK_BEHAVIOR_ORDER.length - 1, regionIdx(G.level))];
  const info = BRICK_BEHAVIORS[key];
  if (!info) return;
  const label = 'REGION RULE · ' + info.name.replace(' BRICKS', '').replace(' GENERATORS', '');
  ctx.save();
  ctx.font = `800 ${W < 560 ? 8.5 : 9.5}px Orbitron, sans-serif`;
  const w = Math.min(W * 0.58, Math.max(172, ctx.measureText(label).width + 38));
  const elemRows = G.ballElement || G.mode === 'junkie';
  const y = elemRows ? (G.combo > 1 ? 128 : 94) : (G.combo > 1 ? 110 : 72);
  const x = W / 2 - w / 2, h = 24;
  roundRect(x, y, w, h, 12);
  ctx.fillStyle = 'rgba(6,10,26,0.78)'; ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = info.color + 'aa'; ctx.stroke();
  drawGlyph(ctx, info.icon, x + 15, y + h / 2, 5.5, info.color);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = info.color;
  ctx.fillText(label, x + w / 2 + 7, y + h / 2 + 0.5, w - 38);
  ctx.restore();
}
function drawCombatNotice() {
  const n = G.combatNotice;
  if (!n || (G.state !== 'play' && G.state !== 'serve')) return;
  const hasRule = G.mode === 'classic' && stageIdx(G.level) !== 2;
  const elemRows = G.ballElement || G.mode === 'junkie';
  const y = hasRule ? (elemRows ? (G.combo > 1 ? 160 : 126) : (G.combo > 1 ? 142 : 104)) : 70;
  const alpha = Math.min(1, n.t / Math.min(0.25, n.max));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${W < 560 ? 10 : 11}px Orbitron, sans-serif`;
  const w = Math.min(W * 0.82, ctx.measureText(n.text).width + 34);
  roundRect(W / 2 - w / 2, y, w, 28, 14);
  ctx.fillStyle = 'rgba(5,8,22,0.9)'; ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = n.color; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = n.color;
  ctx.fillText(n.text, W / 2, y + 14.5, w - 20);
  ctx.restore();
}
// when the player is hit, their remaining health flashes as a small bar right
// above the character (plus the ring pulse from loseLife/absorbHit) — feedback
// where your eyes already are, not just the corner ring. Fades after ~2s.
function drawHurtHealth() {
  if (G.hurtHud <= 0 || (G.state !== 'play' && G.state !== 'serve')) return;
  const denom = Math.max(1, G.livesMax || G.lives), lives = Math.max(0, G.lives);
  const danger = lives <= 1;
  const col = danger ? '#ff5252' : lives === 2 ? '#ffca6a' : '#5fe0a6';
  const alpha = Math.min(1, G.hurtHud / 0.5); // hold, then fade out over the last 0.5s
  const segW = 15, segH = 7, gap = 3, heartW = 15, pad = 9;
  const barW = denom * segW + (denom - 1) * gap;
  const totalW = pad * 2 + heartW + 6 + barW;
  const cx = Math.max(totalW / 2 + 6, Math.min(W - totalW / 2 - 6, G.paddle.x));
  // well above the character — clear of the mon's head, the shield bubble
  // (r≈40/52 + pips) and the muzzle, so it never covers what you're steering
  const cy = Math.max(30, shipY() - (G.mode === 'junkie' ? 78 : 86));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  // backdrop pill (with a soft glow so it pops the moment it appears)
  ctx.shadowColor = col; ctx.shadowBlur = danger ? 12 : 7;
  roundRect(cx - totalW / 2, cy - 13, totalW, 26, 13);
  ctx.fillStyle = 'rgba(6,10,26,0.78)'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.4; ctx.strokeStyle = col + 'aa'; ctx.stroke();
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

// on-screen buttons for touch play — FIRE, MEGA ring meter, pause, sound
function drawTouchControls() {
  const B = touchButtons();
  ctx.save();
  ctx.globalAlpha = SETTINGS.buttonOpacity == null ? 0.85 : SETTINGS.buttonOpacity;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // FIRE — absent in CLASSIC until the blaster is earned (touchButtons). In the
  // shooter modes this one pad also CHARGES: holding winds up a big
  // shot, shown here as a cyan ring filling inside the heat arc.
  const hot = G.overheat > 0;
  const f = B.fire;
  if (f) {
    const charging = G.charge > 0.02, full = G.charge >= 1;
    // near the heat limit (amber) the pad WARNS before it ever locks out
    const heatWarn = !hot && !charging && G.heat > 0.7;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = hot ? 'rgba(80,30,30,0.72)' : charging ? 'rgba(16,60,72,0.78)' : 'rgba(10,16,38,0.72)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hot ? '#ff5252' : charging ? (full ? '#e0ffff' : '#4dd0e1') : heatWarn ? '#ffb74d' : '#80d8ff';
    ctx.stroke();
    // heat arc wraps the fire button
    const frac = hot ? 1 - Math.min(1, (OVERHEAT_DUR - G.overheat) / OVERHEAT_DUR) : G.heat;
    if (frac > 0.02) {
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 5, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : '#ffd54f';
      ctx.stroke();
    }
    // charge fill — an inner ring winding up as you hold
    if (charging) {
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 12, -Math.PI / 2, -Math.PI / 2 + Math.min(1, G.charge) * Math.PI * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = full ? '#e0ffff' : '#80deea'; ctx.stroke();
      if (full) {
        ctx.shadowColor = '#4dd0e1'; ctx.shadowBlur = 12 + Math.sin(G.time * 10) * 6;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.strokeStyle = '#e0ffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    drawGlyph(ctx, charging ? 'warp' : 'target', f.x, f.y - 8, 12, hot ? '#ff8a80' : charging ? (full ? '#e0ffff' : '#b2ebf2') : heatWarn ? '#ffcc80' : '#b3e5fc');
    // ONE consistent state language: the label always names the current state
    // or the next action — no bare FIRE/AUTO/HOT ambiguity mid-fight
    const shooter = G.mode !== 'classic';
    const label = hot ? 'COOLING ' + Math.ceil(G.overheat) + 's'
      : charging ? (full ? 'RELEASE!' : Math.round(Math.min(1, G.charge) * 100) + '%')
      : heatWarn ? 'HEAT HIGH'
      : shooter ? (SETTINGS.autoFire ? 'AUTO ON' : 'TAP FIRE') : 'FIRE';
    ctx.font = '900 9px Orbitron, sans-serif';
    ctx.fillStyle = hot ? '#ff8a80' : charging ? (full ? '#e0ffff' : '#80deea') : heatWarn ? '#ffb74d' : '#b3e5fc';
    ctx.fillText(label, f.x, f.y + 12, f.r * 1.7);
    // second line: what HOLDING does right now (shooter modes only)
    const sub = !shooter ? '' : hot ? 'LOCKED' : charging ? (full ? '' : 'KEEP HOLDING') : 'HOLD = CHARGE';
    if (sub) {
      ctx.font = '800 6.5px Orbitron, sans-serif';
      ctx.fillStyle = hot ? '#ff8a80' : charging ? '#b2ebf2' : heatWarn ? '#ffcc80' : '#90a4ae';
      ctx.fillText(sub, f.x, f.y + 23, f.r * 1.6);
    }
  }
  // MEGA — the button IS the meter (fills as a ring)
  const m = B.mega;
  const ready = G.mega >= 1 && G.megaT <= 0;
  const mfrac = G.megaT > 0 ? G.megaT / megaDur() : G.mega;
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,16,38,0.72)'; ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.stroke();
  if (mfrac > 0.02) {
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.min(1, mfrac) * Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = G.megaT > 0 ? `hsl(${(G.time * 160) % 360},90%,60%)` : ready ? '#ffd54f' : '#ab47bc';
    ctx.stroke();
  }
  if (ready) {
    ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 12 + Math.sin(G.time * 6) * 8;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.shadowBlur = 0;
  }
  drawGlyph(ctx, 'mega', m.x, m.y - 8, 10, ready ? '#ffd54f' : '#c5b3e6');
  ctx.font = '900 8px Orbitron, sans-serif';
  ctx.fillStyle = ready ? '#ffd54f' : '#c5b3e6';
  ctx.fillText(G.megaT > 0 ? Math.ceil(G.megaT) + 's' : ready ? 'READY' : Math.round(Math.min(1, G.mega) * 100) + '%', m.x, m.y + 8);
  ctx.font = '800 6.5px Orbitron, sans-serif';
  ctx.fillStyle = ready ? '#ffe082' : '#90a4ae';
  ctx.fillText(G.megaT > 0 ? 'MEGA' : ready ? 'TAP MEGA' : 'HITS CHARGE', m.x, m.y + 19, m.r * 1.55);
  // (charge now lives on the FIRE pad — hold; no separate pad)
  // pause + sound, top-right under the lives
  for (const [b, icon, on] of [[B.pause, 'pause', true], [B.sound, 'sound', MUSIC.on]]) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,16,38,0.6)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
    drawGlyph(ctx, icon, b.x, b.y, 8, on ? '#cfd8dc' : '#546e7a');
    if (!on) { // slash across a muted speaker
      ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x - 8, b.y + 8); ctx.lineTo(b.x + 8, b.y - 8); ctx.stroke();
    }
  }
  if (G.uiTouchPulse) {
    const p = G.uiTouchPulse, q = 1 - p.t / p.max;
    ctx.globalAlpha = Math.max(0, p.t / p.max);
    ctx.beginPath(); ctx.arc(p.x, p.y, 18 + q * 28, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    if (p.label) {
      ctx.font = '800 8px Orbitron, sans-serif'; ctx.fillStyle = '#ffffff';
      ctx.fillText('✓ ' + p.label, p.x, p.y - 28 - q * 12);
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
function drawMenu() {
  if (menuPage === 'setup') { drawSetup(); return; }
  dim(0.55);
  const L = menuLayout();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title(GAME_TITLE, L.titleY, L.titleSize, '#ffd54f');
  // the SKIN is an edition stamp under the brand — swap SKIN_EDITION
  // (config.js) to re-theme without touching the game's name
  {
    // short viewports have no room for pill + tagline — the pill takes the
    // tagline's slot and the tagline is skipped below
    const py = L.short ? L.tagY : L.titleY + L.titleSize * 1.05;
    ctx.font = `700 ${Math.max(9, L.titleSize * 0.24)}px Orbitron, sans-serif`;
    const tw = ctx.measureText('◓ ' + SKIN_EDITION).width + 26;
    const th = Math.max(16, L.titleSize * 0.44);
    roundRect(W / 2 - tw / 2, py - th / 2, tw, th, th / 2);
    ctx.fillStyle = 'rgba(255,213,79,0.09)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,213,79,0.45)'; ctx.stroke();
    ctx.fillStyle = '#ffe082';
    ctx.fillText('◓ ' + SKIN_EDITION, W / 2, py + 0.5);
  }
  const maxW = W * 0.92;
  // STARFIGHTER is the front door; the two brick modes remain clearly
  // available as alternate arcade games rather than competing co-headliners.
  if (!L.short) fitText(W < 560 ? 'FULL-FLIGHT POKÉMON COMBAT'
    : 'STARFIGHTER IS THE MAIN EVENT · TWO ARCADE MODES INCLUDED',
    L.tagY, 12 * Math.max(0.85, L.s), '650', '#e8d7ff', maxW, "Verdana, system-ui, sans-serif");
  {
    const q = L.quick, hovQ = inRect(mouseX, lastMouseY, q);
    ctx.save();
    ctx.shadowColor = '#c06cff'; ctx.shadowBlur = hovQ ? 26 : 14;
    roundRect(q.x, q.y, q.w, q.h, 12);
    const qg = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
    qg.addColorStop(0, hovQ ? '#efc8ff' : '#d79aff');
    qg.addColorStop(1, hovQ ? '#bd65f4' : '#8e3fbd');
    ctx.fillStyle = qg; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#16051f';
    ctx.font = `900 ${L.short ? 11 : 14}px Orbitron, sans-serif`;
    ctx.fillText('▶ START STARFIGHTER', q.x + q.w / 2, q.y + q.h * (L.short ? 0.5 : 0.38));
    if (!L.short) {
      ctx.font = bodyFont(9.5, 700);
      ctx.fillStyle = '#381048';
      ctx.fillText('FEATURED · FULL 27-STAGE CAMPAIGN', q.x + q.w / 2, q.y + q.h * 0.72, q.w - 18);
    }
    ctx.restore();
  }
  {
    const d = L.daily, hovD = inRect(mouseX, lastMouseY, d);
    const best = dailyBest(), streak = dailyStreak();
    ctx.save();
    ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = hovD ? 20 : 8;
    roundRect(d.x, d.y, d.w, d.h, 12);
    ctx.fillStyle = hovD ? 'rgba(128,216,255,0.3)' : 'rgba(128,216,255,0.14)'; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = `900 ${L.short ? 10 : 12}px Orbitron, sans-serif`; ctx.fillStyle = '#e0f7ff';
    ctx.fillText('★ DAILY · ' + dailyShortDate(), d.x + d.w / 2, d.y + d.h * (L.short ? 0.5 : 0.36), d.w - 10);
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
    ctx.fillStyle = 'rgba(8,13,31,0.78)'; ctx.fill();
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
    [db, '◓ POKÉDEX ' + DEX.size + '/' + dexTotal(), '#90a4ae'],
    [L.adv, '⚙ SETTINGS', '#78909c'],
  ]) {
    ctx.font = rowFont;
    ctx.fillStyle = inRect(mouseX, lastMouseY, g) ? '#ffd54f' : colBase;
    ctx.fillText(label, g.x + g.w / 2, g.y + g.h / 2, g.w - 6);
  }
  if (advOpen) drawAdvanced();
  if (trialOpen) drawTrial();
}
// a mode card as a pseudo-3D diorama: extruded slab, its own sky, a
// perspective floor grid, a BIG breathing mascot — and a LIVE DEMO of the
// mechanic playing on loop, so each button shows you what you'll be doing.
// Mascots are skin-side: Geodude holds the wall, Blastoise brings the
// cannons, Rayquaza flies the starfighter. Menu-only, so the per-frame
// gradients here are fine (never copy this into a hot loop).
const MODE_MASCOTS = { classic: 74, blaster: 9, junkie: 384 };
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
  if (junk) { g.addColorStop(0, '#0b0620'); g.addColorStop(0.55, '#241143'); g.addColorStop(1, '#3a1d5e'); }
  else if (m.key === 'blaster') { g.addColorStop(0, '#041018'); g.addColorStop(0.55, '#0a2c3c'); g.addColorStop(1, '#0e4652'); }
  else { g.addColorStop(0, '#0a1a30'); g.addColorStop(0.55, '#173a52'); g.addColorStop(1, '#1d5a46'); }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // perspective floor grid — the cheap 3D read
  const horizon = y + h * 0.68, vpx = x + w / 2;
  ctx.strokeStyle = junk ? 'rgba(171,71,188,0.35)'
    : m.key === 'blaster' ? 'rgba(77,208,225,0.3)' : 'rgba(102,187,106,0.32)';
  ctx.lineWidth = 1;
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
  ctx.globalAlpha = 1;
  // glowing horizon line
  ctx.strokeStyle = junk ? 'rgba(213,134,255,0.55)'
    : m.key === 'blaster' ? 'rgba(128,222,234,0.5)' : 'rgba(126,224,138,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, horizon); ctx.lineTo(x + w, horizon); ctx.stroke();
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
    ctx.fillStyle = 'rgba(120,80,200,0.8)';
    ctx.beginPath(); ctx.arc(px2, py2, pr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(213,134,255,0.6)'; ctx.lineWidth = 1.5;
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
  // THE MASCOT — big, breathing, grounded by a floor shadow (in STARFIGHTER
  // it IS the ship: banking with its strafe, riding an exhaust plume)
  const ms = Math.min(w, h) * (junk ? 0.6 : 0.5);
  const bob = Math.sin(t * (junk ? 1.3 : 2.1) + (junk ? 1 : 0)) * h * 0.016;
  const mx = x + w / 2 + (junk ? Math.sin(t * 0.7) * w * 0.09 : 0);
  const my = y + h * (junk ? 0.46 : 0.44) + bob;
  if (!junk) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(mx, horizon + h * 0.05, Math.max(10, ms * 0.32 - bob * 2.5), ms * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const img = getSprite(MODE_MASCOTS[m.key]);
  if (img.complete && img.naturalWidth) {
    ctx.save();
    if (junk) { ctx.translate(mx, my); ctx.rotate(Math.cos(t * 0.7) * 0.09); ctx.translate(-mx, -my); }
    const sil = getSilhouette(MODE_MASCOTS[m.key], '#04060e');
    if (sil) { ctx.globalAlpha = 0.5; ctx.drawImage(sil, mx - ms / 2 + ms * 0.05, my - ms / 2 + ms * 0.07, ms, ms); ctx.globalAlpha = 1; }
    if (hov) {
      const rim = getSilhouette(MODE_MASCOTS[m.key], m.accent);
      if (rim) { ctx.globalAlpha = 0.5; ctx.drawImage(rim, mx - ms / 2 - 2, my - ms / 2 - 2, ms + 4, ms + 4); ctx.globalAlpha = 1; }
    }
    ctx.drawImage(img, mx - ms / 2, my - ms / 2, ms, ms);
    ctx.restore();
  }
  if (junk) {
    // LIVE DEMO — the flock orbits high while the ship strafes and fires;
    // a rider flares whenever a bolt reaches the ring
    const ringCy = y + h * 0.17, rx = w * 0.3, ry = h * 0.075;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.cos(t * 0.7) * 0.09);
    const fl = 0.7 + 0.3 * Math.sin(t * 13); // exhaust flicker — slim jet, not a cone
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ce93d8';
    ctx.beginPath();
    ctx.moveTo(-ms * 0.045, ms * 0.44);
    ctx.lineTo(0, ms * (0.56 + 0.1 * fl));
    ctx.lineTo(ms * 0.045, ms * 0.44);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#f3e5f5';
    ctx.beginPath();
    ctx.moveTo(-ms * 0.02, ms * 0.44);
    ctx.lineTo(0, ms * (0.5 + 0.07 * fl));
    ctx.lineTo(ms * 0.02, ms * 0.44);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    for (let k = 0; k < 2; k++) { // typed bolts rising into the flock
      const u = (t * 1.2 + k * 0.5) % 1;
      const bx = mx + (vpx - mx) * u, by = my - ms * 0.32 + (ringCy - (my - ms * 0.32)) * u;
      ctx.fillStyle = '#e1bee7';
      ctx.shadowColor = m.accent; ctx.shadowBlur = 8;
      roundRect(bx - 2, by - 7, 4, 14, 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (u > 0.88) { // the hit — a rider flares
        const fi = Math.floor(t * 1.2 + k * 0.5) % 7;
        const a = t * 0.85 + fi * Math.PI * 2 / 7;
        const fx = vpx + Math.cos(a) * rx, fy = ringCy + Math.sin(a) * ry;
        const s2 = 5 + 7 * (u - 0.88) / 0.12;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.globalAlpha = 1 - (u - 0.88) / 0.12 * 0.6;
        ctx.beginPath();
        ctx.moveTo(fx - s2, fy); ctx.lineTo(fx + s2, fy);
        ctx.moveTo(fx, fy - s2); ctx.lineTo(fx, fy + s2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    for (let i = 0; i < 7; i++) { // the flock — tight riders on one shared ring
      const a = t * 0.85 + i * Math.PI * 2 / 7;
      const fx = vpx + Math.cos(a) * rx, fy = ringCy + Math.sin(a) * ry + Math.sin(t * 2 + i) * 2;
      const s2 = (3.2 + 0.9 * Math.sin(a)) * Math.min(1, w / 340);
      ctx.fillStyle = i % 2 ? '#ce93d8' : '#b39ddb';
      ctx.beginPath();
      ctx.moveTo(fx, fy - s2 * 1.4); ctx.lineTo(fx + s2, fy); ctx.lineTo(fx, fy + s2 * 1.4); ctx.lineTo(fx - s2, fy);
      ctx.closePath(); ctx.fill();
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
    const dw = ctx.measureText(m.desc).width + 16;
    roundRect(x + 10, y + 10, dw, 18, 9);
    ctx.fillStyle = m.accent + '26'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = m.accent + '88'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = m.accent;
    ctx.fillText(m.desc, x + 10 + dw / 2, y + 19.5);
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
    const compactCopy = m.key === 'classic' ? 'BALL FIRST · BLASTER LATER'
      : m.key === 'blaster' ? 'SHOOT · HOLD TO CHARGE' : 'FLY · DODGE · FIRE';
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
function drawSetupHeader(L, mode) {
  const step = L.step === 'pilot' ? 1 : 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title(mode.label, L.headY, L.headSize, mode.accent);
  const bb = L.back, hovBack = inRect(mouseX, lastMouseY, bb);
  ctx.textAlign = 'left'; ctx.font = `800 ${L.short ? 10 : 12}px Orbitron, sans-serif`;
  ctx.fillStyle = hovBack ? '#fff' : '#90a4ae';
  ctx.font = `800 ${L.narrow ? 18 : L.short ? 10 : 12}px Orbitron, sans-serif`;
  ctx.fillText(L.narrow ? '‹' : L.step === 'pilot' ? '‹ MODES' : '‹ PILOTS', bb.x + 6, bb.y + bb.h / 2);
  ctx.textAlign = 'center';
  const pillW = L.short ? 76 : 92, gap = 8, py = L.subY;
  for (let i = 1; i <= 2; i++) {
    const x = W / 2 + (i - 1.5) * (pillW + gap);
    roundRect(x - pillW / 2, py - (L.short ? 8 : 10), pillW, L.short ? 16 : 20, 10);
    ctx.fillStyle = i <= step ? mode.accent + (i === step ? '42' : '22') : 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = i <= step ? mode.accent : 'rgba(255,255,255,0.18)'; ctx.lineWidth = i === step ? 1.7 : 1; ctx.stroke();
    ctx.font = `800 ${L.short ? 7 : 8}px Orbitron, sans-serif`;
    ctx.fillStyle = i <= step ? '#f7eaff' : '#78909c';
    ctx.fillText(i + ' · ' + (i === 1 ? 'PARTNER' : 'CHALLENGE'), x, py + 0.5, pillW - 8);
  }
}

function drawPilotSetup(L, mode) {
  const maxW = W * 0.94;
  ctx.font = `900 ${L.narrow ? 14 : 16}px Orbitron, sans-serif`;
  ctx.fillStyle = '#f1e7f8';
  ctx.fillText(SETTINGS.mode === 'junkie' ? 'CHOOSE YOUR FLIGHT PARTNER' : 'CHOOSE YOUR PARTNER', W / 2, L.sectionY);
  if (!L.short) {
    ctx.font = bodyFont(L.narrow ? 9.5 : 11, 600); ctx.fillStyle = '#90a4ae';
    ctx.fillText('ALL 18 ARE HERE · EACH CHANGES YOUR ATTACK TYPE AND PASSIVE', W / 2, L.sectionY + 18, maxW);
  }
  for (let i = 0; i < STARTERS.length; i++) {
    const st = STARTERS[i], pg = L.starter(i), sel = SETTINGS.starter === st.key;
    const hov = inRect(mouseX, lastMouseY, pg), col = TYPE_COLORS[st.key];
    const mon = STARTER_MON[st.key], copy = starterModeCopy(st.key, SETTINGS.mode, 1);
    ctx.save();
    if (sel) { ctx.shadowColor = col; ctx.shadowBlur = 15; }
    roundRect(pg.x, pg.y, pg.w, pg.h, Math.min(12, pg.h * 0.18));
    ctx.fillStyle = sel ? col + '38' : hov ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.055)'; ctx.fill();
    ctx.lineWidth = sel ? 2.4 : 1;
    ctx.strokeStyle = sel ? col : 'rgba(255,255,255,0.2)'; ctx.stroke();
    ctx.shadowBlur = 0;
    const compact = pg.h < 56;
    const sp = Math.min(compact ? 28 : 43, pg.h * (compact ? 0.62 : 0.5), pg.w * 0.42);
    const img = getSprite(mon.ids[0]);
    const sx = pg.x + pg.w / 2 - sp / 2, sy = pg.y + (compact ? 1 : 3);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, sx, sy, sp, sp);
    else drawGlyph(ctx, st.key, pg.x + pg.w / 2, sy + sp / 2, sp * 0.3, col);
    drawGlyph(ctx, st.key, pg.x + 7, pg.y + 7, Math.min(4.8, pg.w * 0.05), col);
    if (st.key === 'electric' && pg.w > 66) {
      roundRect(pg.x + pg.w - 22, pg.y + 4, 18, 10, 4); ctx.fillStyle = '#ffd740'; ctx.fill();
      ctx.font = '900 6.5px Orbitron, sans-serif'; ctx.fillStyle = '#181100';
      ctx.fillText('OP', pg.x + pg.w - 13, pg.y + 9);
    }
    ctx.font = `900 ${Math.min(compact ? 8.5 : 10, pg.w / 9.5)}px Orbitron, sans-serif`;
    ctx.fillStyle = sel ? '#fff' : '#dce4e8';
    ctx.fillText(st.label, pg.x + pg.w / 2, pg.y + pg.h - (compact ? 8 : 18), pg.w - 5);
    if (!compact) {
      ctx.font = `800 ${Math.min(7.2, pg.w / 14)}px Orbitron, sans-serif`; ctx.fillStyle = col;
      ctx.fillText(copy.ability, pg.x + pg.w / 2, pg.y + pg.h - 7, pg.w - 5);
    }
    ctx.restore();
  }
  if (L.info.h > 12) {
    const mon = STARTER_MON[SETTINGS.starter], col = mon ? TYPE_COLORS[SETTINGS.starter] : '#90a4ae';
    roundRect(L.info.x, L.info.y, L.info.w, L.info.h, 12);
    ctx.fillStyle = 'rgba(7,11,27,0.7)'; ctx.fill(); ctx.strokeStyle = col + '66'; ctx.lineWidth = 1; ctx.stroke();
    if (mon) {
      const copy = starterModeCopy(SETTINGS.starter, SETTINGS.mode, 1);
      fitText(copy.ability + ' — ' + copy.tier, L.info.y + L.info.h * 0.38,
        L.narrow ? 10.5 : 12, '750', col, L.info.w - 18, "Verdana, system-ui, sans-serif");
      if (L.info.h > 50) fitText(mon.names.join(' → ') + ' · EVOLVES IN REGIONS 4 AND 7', L.info.y + L.info.h * 0.68,
        9.5, '550', '#90a4ae', L.info.w - 18, "Verdana, system-ui, sans-serif");
    } else fitText('TRAINING DRONE — NO TYPE ADVANTAGE OR PARTNER ABILITY', L.info.y + L.info.h / 2,
      10.5, '700', '#b0bec5', L.info.w - 18, "Verdana, system-ui, sans-serif");
  }
  {
    const pg = L.none, sel = SETTINGS.starter === 'none', hov = inRect(mouseX, lastMouseY, pg);
    roundRect(pg.x, pg.y, pg.w, pg.h, 8);
    ctx.fillStyle = sel ? 'rgba(144,164,174,0.24)' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)'; ctx.fill();
    ctx.strokeStyle = sel ? '#cfd8dc' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = sel ? 2 : 1; ctx.stroke();
    ctx.font = `800 ${L.short ? 7.5 : 8.5}px Orbitron, sans-serif`; ctx.fillStyle = sel ? '#fff' : '#90a4ae';
    ctx.fillText(SETTINGS.mode === 'junkie' ? 'FLY SOLO · TRAINING DRONE' : 'NO PARTNER · NEUTRAL START',
      pg.x + pg.w / 2, pg.y + pg.h / 2, pg.w - 8);
  }
  {
    const b = L.next, hov = inRect(mouseX, lastMouseY, b);
    ctx.save(); ctx.shadowColor = mode.accent; ctx.shadowBlur = hov ? 26 : 13;
    roundRect(b.x, b.y, b.w, b.h, 13);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, hov ? mixHex(mode.accent, '#ffffff', 0.48) : mixHex(mode.accent, '#ffffff', 0.28));
    g.addColorStop(1, mixHex(mode.accent, '#080311', 0.34)); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = `900 ${L.short ? 12 : L.narrow ? 15 : 16}px Orbitron, sans-serif`; ctx.fillStyle = '#100417';
    ctx.fillText('CONTINUE · CHOOSE CHALLENGE ›', b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 18);
    ctx.restore();
  }
}

function drawDifficultySetup(L, mode) {
  fitText('HOW INTENSE SHOULD THIS JOURNEY FEEL?', L.sectionY,
    L.narrow ? 13.5 : 16, '900', '#f1e7f8', W - 24, "Orbitron, sans-serif");
  const S = L.summary, mon = STARTER_MON[SETTINGS.starter];
  const col = mon ? TYPE_COLORS[SETTINGS.starter] : '#90a4ae';
  roundRect(S.x, S.y, S.w, S.h, 15); ctx.fillStyle = 'rgba(7,11,27,0.78)'; ctx.fill();
  ctx.strokeStyle = col + '88'; ctx.lineWidth = 1.5; ctx.stroke();
  const iconS = Math.min(S.h - 14, L.short ? 38 : 68), iconX = S.x + 10;
  if (mon) {
    const img = getSprite(mon.ids[0]);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, iconX, S.y + S.h / 2 - iconS / 2, iconS, iconS);
    else drawGlyph(ctx, SETTINGS.starter, iconX + iconS / 2, S.y + S.h / 2, iconS * 0.3, col);
  } else drawGlyph(ctx, 'normal', iconX + iconS / 2, S.y + S.h / 2, iconS * 0.3, col);
  const textX = iconX + iconS + 12, textW = Math.max(80, L.editPilot.x - textX - 8);
  ctx.textAlign = 'left';
  ctx.font = `900 ${L.short ? 10 : L.narrow ? 12 : 14}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
  ctx.fillText(mon ? mon.names[0] : 'TRAINING DRONE', textX, S.y + S.h * (L.short ? 0.42 : 0.36), textW);
  ctx.font = bodyFont(L.short ? 8.5 : 10.5, 700); ctx.fillStyle = col;
  const copy = mon ? starterModeCopy(SETTINGS.starter, SETTINGS.mode, 1) : null;
  ctx.fillText(copy ? (L.narrow ? copy.ability : copy.ability + ' · ' + copy.blurb) : 'NEUTRAL · NO PASSIVE',
    textX, S.y + S.h * (L.short ? 0.68 : 0.66), textW);
  ctx.textAlign = 'center';
  const eb = L.editPilot, hovEdit = inRect(mouseX, lastMouseY, eb);
  roundRect(eb.x, eb.y, eb.w, eb.h, 9); ctx.fillStyle = hovEdit ? col + '30' : 'rgba(255,255,255,0.06)'; ctx.fill();
  ctx.strokeStyle = hovEdit ? col : 'rgba(255,255,255,0.24)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = `800 ${L.short ? 7 : 8.5}px Orbitron, sans-serif`; ctx.fillStyle = hovEdit ? '#fff' : '#b0bec5';
  ctx.fillText(L.narrow ? 'CHANGE' : 'CHANGE PARTNER', eb.x + eb.w / 2, eb.y + eb.h / 2, eb.w - 8);

  ctx.font = `800 ${L.narrow ? 12 : 13}px Orbitron, sans-serif`; ctx.fillStyle = '#90a4ae';
  ctx.fillText('CHOOSE YOUR CHALLENGE', W / 2, L.chipsLabelY);
  const keys = Object.keys(PRESETS);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i], presetData = PRESETS[key], copy2 = DIFFICULTY_UI[key], pg = L.chip(i);
    const sel = SETTINGS.preset === key, hov = inRect(mouseX, lastMouseY, pg);
    ctx.save(); if (sel) { ctx.shadowColor = mode.accent; ctx.shadowBlur = 15; }
    roundRect(pg.x, pg.y, pg.w, pg.h, 13);
    ctx.fillStyle = sel ? mode.accent + '2f' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.055)'; ctx.fill();
    ctx.strokeStyle = sel ? mode.accent : 'rgba(255,255,255,0.23)'; ctx.lineWidth = sel ? 2.4 : 1; ctx.stroke(); ctx.shadowBlur = 0;
    if (copy2.recommended && pg.h > 65) {
      ctx.font = '900 6.5px Orbitron, sans-serif';
      const rw = Math.min(86, pg.w * 0.42); roundRect(pg.x + pg.w - rw - 7, pg.y + 7, rw, 14, 7);
      ctx.fillStyle = '#66d9c8'; ctx.fill(); ctx.fillStyle = '#041815';
      ctx.fillText('RECOMMENDED', pg.x + pg.w - rw / 2 - 7, pg.y + 14, rw - 6);
    }
    ctx.font = `900 ${Math.min(L.short ? 12 : 18, pg.w / 8)}px Orbitron, sans-serif`;
    ctx.fillStyle = sel ? '#fff' : '#dbe3ea';
    ctx.fillText(copy2.name, pg.x + pg.w / 2, pg.y + pg.h * (L.short ? 0.38 : 0.34), pg.w - 12);
    ctx.font = bodyFont(L.short ? 8.5 : L.narrow ? 10 : 10.5, 750); ctx.fillStyle = sel ? '#ead4ff' : '#9fb0bc';
    ctx.fillText(presetData.lives + ' HP · ' + copy2.tone, pg.x + pg.w / 2, pg.y + pg.h * (L.short ? 0.7 : 0.62), pg.w - 12);
    if (!L.short && pg.h > 72) {
      ctx.font = bodyFont(L.narrow ? 8.5 : 9.5, 600); ctx.fillStyle = '#78909c';
      ctx.fillText(copy2.desc, pg.x + pg.w / 2, pg.y + pg.h * 0.82, pg.w - 14);
    }
    ctx.restore();
  }
  {
    const b = L.start, hov = inRect(mouseX, lastMouseY, b);
    ctx.save(); ctx.shadowColor = mode.accent; ctx.shadowBlur = hov ? 28 : 15;
    roundRect(b.x, b.y, b.w, b.h, 14);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, hov ? mixHex(mode.accent, '#ffffff', 0.52) : mixHex(mode.accent, '#ffffff', 0.3));
    g.addColorStop(1, mixHex(mode.accent, '#05020a', 0.28)); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = `900 ${L.short ? 13 : L.narrow ? 18 : 19}px Orbitron, sans-serif`; ctx.fillStyle = '#100417';
    const label = mode.key === 'junkie' ? 'LAUNCH STARFIGHTER' : 'START ' + mode.label;
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 20); ctx.restore();
  }
  const tb = L.trial, hovTrial = inRect(mouseX, lastMouseY, tb);
  ctx.font = `750 ${L.short ? 9 : 10.5}px Orbitron, sans-serif`; ctx.fillStyle = hovTrial ? '#fff' : '#80d8ff';
  ctx.fillText('PRACTICE IN TRIAL MODE · CHOOSE ANY STAGE', tb.x + tb.w / 2, tb.y + tb.h / 2, tb.w - 6);
}

// PAGE 2 — setup is deliberately split so neither decision competes for room.
function drawSetup() {
  dim(0.55);
  const L = setupLayout(), mode = MODES.find(m => m.key === SETTINGS.mode) || MODES[0];
  drawSetupHeader(L, mode);
  if (L.step === 'pilot') drawPilotSetup(L, mode);
  else drawDifficultySetup(L, mode);
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
  const A = ACTS[c.act], t = c.t;
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
        : 'WHAT? ' + c.evo.fromName + ' IS EVOLVING!', cx, cy + ms * 0.66);
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
  for (let i = 0; i < CHEAT_ITEMS.length; i++) {
    const it = CHEAT_ITEMS[i], g2 = C2.chip(i);
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
  roundRect(T.px, T.py, T.pw, T.ph, 18);
  ctx.fillStyle = 'rgba(8,12,30,0.96)'; ctx.fill();
  ctx.strokeStyle = 'rgba(128,216,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 18px Orbitron, sans-serif';
  ctx.fillStyle = '#80d8ff';
  ctx.fillText('TRIAL MODE', T.px + T.pw / 2, T.py + 30);
  ctx.font = '500 10.5px Orbitron, sans-serif';
  ctx.fillStyle = '#90a4ae';
  ctx.fillText('JUMP INTO ANY REGION · SCORE & CATCHES NOT SAVED', T.px + T.pw / 2, T.py + 54, T.pw - 40);
  // close ✕
  const cb = T.close;
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cb.x + 10, cb.y + 10); ctx.lineTo(cb.x + cb.w - 10, cb.y + cb.h - 10);
  ctx.moveTo(cb.x + cb.w - 10, cb.y + 10); ctx.lineTo(cb.x + 10, cb.y + cb.h - 10);
  ctx.stroke();
  // region grid — each chip shows the region and its legendary
  for (let i = 0; i < GENS.length; i++) {
    const g = GENS[i], r = T.region(i), sel = trialSel.region === i;
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
    ctx.font = `900 ${Math.min(13, r.w / 8)}px Orbitron, sans-serif`;
    ctx.fillStyle = sel ? '#fff' : '#cfd8dc';
    ctx.fillText(g.name, r.x + r.w / 2, r.y + r.h / 2 - 8);
    ctx.font = '500 9px Orbitron, sans-serif';
    ctx.fillStyle = sel ? g.accent : '#78909c';
    ctx.fillText(g.boss.n.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2 + 10, r.w - 10);
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
    ctx.font = `900 ${Math.min(11, r.w / 10)}px Orbitron, sans-serif`;
    ctx.fillStyle = sel ? '#ffd54f' : '#cfd8dc';
    ctx.fillText((i + 1) + '/3 ' + STAGE_NAMES[i], r.x + r.w / 2, r.y + r.h / 2 + 1, r.w - 8);
  }
  // LEGENDARY stage → pick a gauntlet round. STARFIGHTER Kanto also exposes
  // the secret replacement fight directly so it can be practiced on demand.
  if (T.rounds) {
    const gsel = GENS[trialSel.region];
    const labels = ['FULL GAUNTLET', '★ ' + gsel.boss.n.toUpperCase(),
      gsel.gauntlet ? '✦ ' + (NAMES[gsel.gauntlet.myth[0]] || 'MYTHICAL').toUpperCase() : '✦ MYTHICAL',
      '◆ MEW VMAX · SECRET'];
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
      ctx.font = `900 ${Math.min(10, rr2.w / 11)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel2 ? (secret ? '#80d8ff' : '#ff80ab') : '#cfd8dc';
      ctx.fillText(labels[i], rr2.x + rr2.w / 2, rr2.y + rr2.h / 2 + 1, rr2.w - 8);
    }
  }
  // start button
  const b = T.start;
  const hov = inRect(mouseX, lastMouseY, b);
  ctx.save();
  ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = hov ? 22 : 10;
  roundRect(b.x, b.y, b.w, b.h, 12);
  const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  bg.addColorStop(0, hov ? '#b3e5fc' : '#80d8ff'); bg.addColorStop(1, '#0288d1');
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = '900 16px Orbitron, sans-serif';
  ctx.fillStyle = '#03202e';
  ctx.fillText('START TRIAL', b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
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
  for (let i = 0; i < 2; i++) {
    const r = A.tab(i), active = settingsPage === i;
    roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = active ? 'rgba(66,165,245,0.26)' : 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = active ? '#80d8ff' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
    ctx.font = `800 ${A.compact ? 9 : 10}px Orbitron, sans-serif`; ctx.fillStyle = active ? '#e3f2fd' : '#78909c';
    ctx.fillText(i === 0 ? 'GAME' : 'TOUCH', r.x + r.w / 2, r.y + r.h / 2);
  }
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

function drawDex() {
  dim(0.85);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // ---- scrolling region-by-region body ----
  const cellW = Math.max(72, Math.min(92, W / 5)), cellH = cellW + 16;
  const cols = Math.max(4, Math.floor(Math.min(W * 0.92, 1100) / cellW));
  const gw = cols * cellW;
  const x0 = W / 2 - gw / 2;
  let y = 142 - dexScroll;
  const headerH = 54;
  for (const g of GENS) {
    const roster = regionRoster(g);
    const caught = roster.filter(id => DEX.has(id)).length;
    const rows = Math.ceil(roster.length / cols);
    const sectionH = headerH + rows * cellH + 16;
    if (y + sectionH > 132 && y < H) { // only draw visible sections
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
        if (cy + cellH / 2 < 132 || cy - cellH / 2 > H) return;
        const has = DEX.has(id), shiny = DEXS.has(id);
        const half = cellW / 2 - 4;
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
        ctx.fillText(has ? (NAMES[id] || '#' + id).toUpperCase() : '???', cx, cy + half - 4, half * 2 - 8);
        if (shiny) drawGlyph(ctx, 'fairy', cx + half - 9, cy - half + 3, 5, '#ffd700');
      });
    }
    y += sectionH;
  }
  // clamp scroll to content
  const maxScroll = Math.max(0, (y + dexScroll) - 142 - (H - 176));
  dexScroll = Math.min(dexScroll, maxScroll);
  // ---- fixed header on top ----
  const hg = ctx.createLinearGradient(0, 0, 0, 136);
  hg.addColorStop(0, 'rgba(5,8,25,0.97)'); hg.addColorStop(0.8, 'rgba(5,8,25,0.9)'); hg.addColorStop(1, 'rgba(5,8,25,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 136);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title('POKÉDEX', 44, Math.min(34, W / (W < 560 ? 16 : 12)), '#ef5350');
  ctx.font = '700 12px Orbitron, sans-serif';
  ctx.fillStyle = '#b0bec5';
  const total = dexTotal();
  ctx.fillText(DEX.size + ' / ' + total + ' CAUGHT' + (DEXS.size ? '  ·  ' + DEXS.size + ' SHINY' : '') + '  ·  ' + (IS_TOUCH ? 'DRAG' : 'SCROLL') + ' TO BROWSE', W / 2, 82);
  const nextResearch = nextDexReward();
  if (nextResearch) {
    const prevAt = DEX_REWARDS.filter(r => r.at < nextResearch.at).reduce((n, r) => Math.max(n, r.at), 0);
    const progress = Math.max(0, Math.min(1, (DEX.size - prevAt) / Math.max(1, nextResearch.at - prevAt)));
    ctx.font = '800 9.5px Orbitron, sans-serif';
    ctx.fillStyle = nextResearch.color;
    ctx.fillText('NEXT RESEARCH REWARD · ' + nextResearch.name + ' · ' + Math.max(0, nextResearch.at - DEX.size) + ' TO GO', W / 2, 104, W * 0.84);
    const rw = Math.min(360, W * 0.72), rx = W / 2 - rw / 2;
    roundRect(rx, 118, rw, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    if (progress > 0) { roundRect(rx, 118, rw * progress, 5, 2.5); ctx.fillStyle = nextResearch.color; ctx.fill(); }
  } else {
    ctx.font = '800 10px Orbitron, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('★ ALL RESEARCH REWARDS UNLOCKED ★', W / 2, 106);
  }
  // back button
  const cb = dexCloseGeom();
  roundRect(cb.x, cb.y, cb.w, cb.h, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = '#cfd8dc';
  ctx.fillText('◀ BACK', cb.x + cb.w / 2, cb.y + cb.h / 2 + 1);
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
  ctx.font = `900 ${Math.min(T.compact ? 15 : 24, p.w / 26)}px Orbitron, sans-serif`;
  ctx.fillStyle = '#e3f2fd';
  // maxWidth keeps the title clear of the close button on phones
  ctx.fillText(G.mode === 'junkie' ? 'STARFIGHTER CONSTELLATION' : 'UPGRADE CONSTELLATION',
    p.x + p.w / 2, p.y + (T.compact ? 18 : 22), p.w - 116);
  const ownedN = totalPathLevels();
  const activeN = PATH_KEYS.filter(pk => pathLvl(pk) > 0).length;
  ctx.font = `700 ${T.compact ? 7.5 : 9.5}px Orbitron, sans-serif`; ctx.fillStyle = '#80d8ff';
  const buildLine = T.compact
    ? 'BUILD ' + ownedN + '/24 · ' + activeN + ' PATHS · 3 OFFERS GLOW'
    : 'BUILD ' + ownedN + '/24 · ' + activeN + ' ACTIVE ' + (activeN === 1 ? 'PATH' : 'PATHS') +
      ' · THREE GLOWING NODES ARE THIS STAGE’S OFFERS';
  ctx.fillText(buildLine, p.x + p.w / 2, p.y + (T.compact ? 37 : 45), p.w - 96);

  treeSel.pi = Math.max(0, Math.min(PATH_KEYS.length - 1, treeSel.pi | 0));
  treeSel.ti = Math.max(0, Math.min(3, treeSel.ti | 0));

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
      // ring names live on the EMPTY diagonal between the VOLLEY and IMPACT
      // spokes — straight up they printed across the top spoke's nodes
      const la = -Math.PI / 3;
      ctx.font = `700 ${T.compact ? 6.5 : 8}px Orbitron, sans-serif`;
      ctx.fillStyle = ti === 3 ? 'rgba(255,213,79,0.62)' : 'rgba(128,216,255,0.45)';
      ctx.fillText(ringNames[ti], C.x + Math.cos(la) * (rr + 6), C.y + Math.sin(la) * (rr + 6));
    }
  }

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

  // Nodes use shape + icon + connector state, never color alone. Only the
  // three offers pulse, keeping a full late-run map calm and scannable.
  for (let pi = 0; pi < PATH_KEYS.length; pi++) {
    const pk = PATH_KEYS[pi], P = PATHS[pk], lvl = pathLvl(pk);
    for (let ti = 0; ti < 4; ti++) {
      const tier = P.tiers[ti], owned = ti < lvl, next = ti === lvl;
      const sel = treeSel.pi === pi && treeSel.ti === ti;
      const n = T.node(pi, ti);
      const offer = choiceIndexForTreeNode(pi, ti);
      const offered = offer >= 0;
      const chosen = offered && draftSel === offer;
      const pulse = SETTINGS.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 2.5 + offer * 1.7);
      ctx.save();
      if (sel || offered) { ctx.shadowColor = offered ? '#ffffff' : P.color; ctx.shadowBlur = offered ? 14 + pulse * 10 : 15; }
      constellationHex(n.cx, n.cy, n.r + (ti === 3 ? 2 : 0));
      ctx.fillStyle = chosen ? mixHex(P.color, '#ffffff', 0.22) : owned ? mixHex(P.color, '#071022', 0.55)
        : offered ? mixHex(P.color, '#071022', 0.72) : next ? 'rgba(18,28,52,0.94)' : 'rgba(9,14,28,0.9)';
      ctx.fill();
      ctx.lineWidth = chosen ? 3 : offered ? 2.4 : sel ? 2.2 : owned ? 1.8 : 1;
      ctx.strokeStyle = chosen || sel ? '#fff' : offered || owned ? P.color : next ? P.color + 'aa' : 'rgba(255,255,255,0.14)';
      ctx.stroke();
      ctx.shadowBlur = 0;
      const iconR = Math.max(6, n.r * 0.72);
      const badge = iconBadge(tier.icon, P.color, Math.round(iconR), (owned || next || sel || offered) ? 'lit' : 'dim');
      ctx.globalAlpha = owned || next || sel || offered ? 1 : 0.52;
      ctx.drawImage(badge, n.cx - badge.width / 2, n.cy - badge.height / 2);
      ctx.globalAlpha = 1;
      if (owned) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.cx + n.r * 0.68, n.cy + n.r * 0.65, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      if (offered) {
        const hx = n.cx - n.r * 0.82, hy = n.cy - n.r * 0.86;
        ctx.beginPath(); ctx.arc(hx, hy, Math.max(7, n.r * 0.52), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.font = `900 ${Math.max(7, n.r * 0.58)}px Orbitron, sans-serif`;
        ctx.fillStyle = '#071022'; ctx.fillText(String(offer + 1), hx, hy + 0.5);
      }
      ctx.restore();
    }
    // constellation identity stays outside the busy node field
    const lb = T.label(pi);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${T.compact ? 7.5 : 10}px Orbitron, sans-serif`; ctx.fillStyle = P.color;
    ctx.fillText(P.name, lb.x, lb.y, T.compact ? 58 : 90);
    if (!T.compact) {
      ctx.font = '600 6.5px Orbitron, sans-serif'; ctx.fillStyle = '#78909c';
      ctx.fillText(pathRole(pk), lb.x, lb.y + 12, 100);
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
    blitBadge('pokeball', C.x, C.y, Math.max(12, T.inner * 0.38), '#80d8ff', 'lit');
    const sm = STARTER_MON[G.starter], img = sm && getSprite(sm.ids[G.starterLvl - 1]);
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

// Persistent node details: effect, exact state, path progress, visible rig
// tell, and the one install action. The map itself stays almost text-free.
function drawTreeDetail(T) {
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

  const iconSize = T.sideDetail ? 44 : T.compact ? 32 : 38;
  const db = iconBadge(tier.icon, P.color, Math.round(iconSize / 2), owned || offered || next ? 'lit' : 'dim');
  ctx.drawImage(db, d.x + pad, d.y + pad, iconSize, iconSize);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `800 ${T.compact ? 7.5 : 9}px Orbitron, sans-serif`; ctx.fillStyle = P.color;
  ctx.fillText(P.name + ' · TIER ' + (ti + 1) + '/4' + (ti === 3 ? ' · CAPSTONE' : ''), d.x + pad + iconSize + 9, d.y + pad + 2, d.w - pad * 2 - iconSize - 10);
  ctx.font = `900 ${T.compact ? 12 : Math.min(18, d.w / 19)}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
  ctx.fillText(junkieTierName(pk, ti), d.x + pad + iconSize + 9, d.y + pad + 17, d.w - pad * 2 - iconSize - 10);
  ctx.font = `800 ${T.compact ? 7 : 8}px Orbitron, sans-serif`; ctx.fillStyle = statusCol;
  ctx.fillText(status, d.x + pad + iconSize + 9, d.y + pad + (T.compact ? 34 : 39), d.w - pad * 2 - iconSize - 10);

  let y = d.y + pad + Math.max(iconSize + 8, 54);
  ctx.font = bodyFont(T.compact ? 9 : 11.5, 650); ctx.fillStyle = '#d8e2ee';
  const descLines = wrapText(tierDesc(pk, ti), d.w - pad * 2).slice(0, T.sideDetail ? 5 : 2);
  descLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * (T.compact ? 12 : 16), d.w - pad * 2));
  y += descLines.length * (T.compact ? 12 : 16) + (T.compact ? 5 : 10);

  ctx.font = `800 ${T.compact ? 7 : 8}px Orbitron, sans-serif`; ctx.fillStyle = P.color;
  ctx.fillText(G.mode === 'junkie' ? 'VISIBLE ON PILOT' : 'VISIBLE ON RIG', d.x + pad, y, d.w - pad * 2);
  y += T.compact ? 11 : 14;
  ctx.font = bodyFont(T.compact ? 8 : 9.5, 650); ctx.fillStyle = '#aebdca';
  const visualLines = wrapText(tier.visual || P.tell, d.w - pad * 2).slice(0, T.sideDetail ? 3 : 1);
  visualLines.forEach((line, li) => ctx.fillText(line, d.x + pad, y + li * (T.compact ? 10 : 13), d.w - pad * 2));
  y += visualLines.length * (T.compact ? 10 : 13) + 7;

  if (T.sideDetail && choice) {
    ctx.font = '800 7.5px Orbitron, sans-serif'; ctx.fillStyle = '#80d8ff';
    ctx.fillText((choice.tags || []).join('  +  '), d.x + pad, y, d.w - pad * 2);
    y += 15;
    ctx.fillStyle = '#90a4ae';
    ctx.fillText(choice.synergy || P.summary, d.x + pad, y, d.w - pad * 2);
  }

  const rr = T.reroll, canRR = !G.rerolled && !G.secret.rewardDraft;
  const hovRR = canRR && inRect(mouseX, lastMouseY, rr);
  roundRect(rr.x, rr.y, rr.w, rr.h, 11);
  ctx.fillStyle = hovRR ? 'rgba(255,213,79,0.22)' : 'rgba(255,255,255,0.07)'; ctx.fill();
  ctx.lineWidth = 1.3; ctx.strokeStyle = canRR ? (hovRR ? '#ffd54f' : 'rgba(255,213,79,0.55)') : 'rgba(255,255,255,0.15)'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${T.compact ? 8 : 9}px Orbitron, sans-serif`; ctx.fillStyle = canRR ? '#ffd54f' : '#546e7a';
  ctx.fillText(canRR ? (IS_TOUCH ? 'REROLL' : 'REROLL · R') : 'REROLLED', rr.x + rr.w / 2, rr.y + rr.h / 2 + 1, rr.w - 10);

  const cf = T.confirm, canCF = chosen;
  const hovCF = canCF && inRect(mouseX, lastMouseY, cf);
  if (canCF) { ctx.shadowColor = P.color; ctx.shadowBlur = hovCF ? 18 : 10; }
  roundRect(cf.x, cf.y, cf.w, cf.h, 11);
  ctx.fillStyle = canCF ? (hovCF ? P.color + '55' : P.color + '34') : 'rgba(255,255,255,0.06)'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = canCF ? 2 : 1.2; ctx.strokeStyle = canCF ? '#ffffff' : 'rgba(255,255,255,0.15)'; ctx.stroke();
  ctx.font = `900 ${T.compact ? 8 : 9}px Orbitron, sans-serif`; ctx.fillStyle = canCF ? '#fff' : '#607d8b';
  ctx.fillText(canCF ? (IS_TOUCH ? 'INSTALL OFFER ' + (offer + 1) : 'INSTALL · ENTER') : offered ? 'SELECT THIS NODE' : 'CHOOSE A GLOWING NODE',
    cf.x + cf.w / 2, cf.y + cf.h / 2 + 1, cf.w - 10);
}

// Compact journey map shown between every stage. Nine persistent region nodes
// make the 27-wave campaign, boss cadence, and checkpoint-sized chunks legible
// without opening another screen.
function drawJourneyMap(y, compact = false) {
  const completed = Math.min(GENS.length, Math.floor((Math.max(1, G.level) - 1) / STAGES));
  const current = Math.min(GENS.length - 1, regionIdx(Math.max(1, G.level)));
  const mapW = Math.min(W * 0.86, compact ? 470 : 650);
  const x0 = W / 2 - mapW / 2;
  const step = mapW / (GENS.length - 1);
  ctx.save();
  ctx.lineWidth = compact ? 2 : 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + mapW, y); ctx.stroke();
  for (let i = 0; i < GENS.length; i++) {
    const x = x0 + i * step;
    const done = i < completed;
    const here = i === current && completed < GENS.length;
    const col = done || here ? GENS[i].accent : '#455a64';
    if (here) { ctx.shadowColor = col; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(x, y, here ? 7 : done ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = done ? col : here ? '#eaf7ff' : '#162235'; ctx.fill();
    ctx.lineWidth = here ? 2.5 : 1.5; ctx.strokeStyle = col; ctx.stroke();
    ctx.shadowBlur = 0;
    if (done) drawGlyph(ctx, 'star', x, y, 2.6, '#fff');
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${compact ? 8.5 : 10}px Orbitron, sans-serif`;
  ctx.fillStyle = completed >= GENS.length ? '#ffd54f' : GENS[current].accent;
  ctx.fillText(completed >= GENS.length ? 'ALL 9 REGIONS CLEARED'
    : 'REGION ' + (current + 1) + '/9 · ' + GENS[current].name + ' · STAGE ' + (stageIdx(G.level) + 1) + '/3',
    W / 2, y + (compact ? 17 : 20), mapW);
  ctx.restore();
}

function drawGameOverSummary() {
  dim(0.72);
  const L = gameOverLayout(), s = G.runSummary || {
    region: genFor(G.level).name, stage: stageIdx(G.level) + 1, level: G.level, score: G.score,
    bestRally: G.bestRally, maxCombo: G.maxCombo, catches: G.caughtRun, path: 'NO PATH YET', cause: 'RUN ENDED',
  };
  ctx.save();
  roundRect(L.px, L.py, L.pw, L.ph, 22);
  ctx.fillStyle = 'rgba(7,11,28,0.97)'; ctx.fill();
  ctx.strokeStyle = s.newRecord ? '#ffd54f' : '#ff5252'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${L.narrow ? 28 : 36}px Orbitron, sans-serif`;
  ctx.fillStyle = s.newRecord ? '#ffd54f' : '#ff6e6e';
  ctx.fillText(s.newRecord ? '★ NEW RECORD ★' : (G.daily ? 'DAILY COMPLETE' : 'RUN COMPLETE'), W / 2, L.py + 38, L.pw - 28);
  ctx.font = `900 ${L.narrow ? 26 : 32}px Orbitron, sans-serif`; ctx.fillStyle = '#ffffff';
  ctx.fillText((s.score || 0).toLocaleString() + ' PTS', W / 2, L.py + 82);
  ctx.font = '800 11px Orbitron, sans-serif'; ctx.fillStyle = '#80d8ff';
  ctx.fillText(s.region + ' · STAGE ' + s.stage + '/3 · WAVE ' + s.level, W / 2, L.py + 112, L.pw - 34);
  roundRect(L.px + 20, L.py + 130, L.pw - 40, 38, 10);
  ctx.fillStyle = 'rgba(255,82,82,0.12)'; ctx.fill();
  ctx.font = '800 10px Orbitron, sans-serif'; ctx.fillStyle = '#ffab91';
  ctx.fillText('FINAL CAUSE · ' + s.cause, W / 2, L.py + 149, L.pw - 54);
  // one actionable tip matched to what actually ended the run
  const tip = /MISSED BALL/.test(s.cause) ? 'STAY UNDER THE BALL — A DRAFTED RALLY BARRIER GIVES A SECOND CHANCE'
    : /DANGER LINE/.test(s.cause) ? 'BREAK THE LOWEST ROWS FIRST TO HOLD THE LINE BACK'
    : /HEAVY/.test(s.cause) ? 'HEAVY BOLTS SPLASH ON IMPACT — DODGE WIDE, NOT CLOSE'
    : /BEAM/.test(s.cause) ? 'BEAMS TELEGRAPH FIRST — MOVE THE MOMENT THE WARNING GLOWS'
    : /ATTACK/.test(s.cause) ? 'SHOTS YOUR TYPE RESISTS BOUNCE OFF — SWAP TYPES WITH ELEMENT ORBS'
    : 'SHIELDS ABSORB ONE LETHAL HIT — DRAFT THE GUARD PATH EARLY';
  ctx.font = bodyFont(9, 700); ctx.fillStyle = '#9fb3c8';
  ctx.fillText('TIP · ' + tip, W / 2, L.py + 177, L.pw - 44);
  const metrics = [
    ['BEST RALLY', '×' + (s.bestRally || 0)], ['MAX COMBO', '×' + (s.maxCombo || 0)],
    ['BRICKS', s.bricks || 0], ['ITEMS', s.items || 0],
    ['CATCHES', s.catches || 0], ['HITS TAKEN', s.hits || 0],
  ];
  const cols = L.narrow ? 2 : 3, cellW = (L.pw - 40) / cols;
  metrics.forEach((m, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const cx = L.px + 20 + cellW * (col + 0.5), cy = L.py + 192 + row * 48;
    ctx.font = '700 8px Orbitron, sans-serif'; ctx.fillStyle = '#78909c'; ctx.fillText(m[0], cx, cy);
    ctx.font = '900 15px Orbitron, sans-serif'; ctx.fillStyle = '#e8eef6'; ctx.fillText(String(m[1]), cx, cy + 19);
  });
  const pathY = L.py + (L.narrow ? 342 : 298);
  // short landscape viewports have no room between the metrics and the button
  // row — the path summary would print straight across the buttons there
  const roomForPath = H >= 480;
  if (roomForPath) {
    ctx.font = '700 8px Orbitron, sans-serif'; ctx.fillStyle = '#78909c'; ctx.fillText('MOST-USED PATH', W / 2, pathY);
    ctx.font = '900 12px Orbitron, sans-serif'; ctx.fillStyle = '#ffd54f'; ctx.fillText(s.path, W / 2, pathY + 20, L.pw - 44);
  }
  if (G.trial) {
    ctx.font = '700 9px Orbitron, sans-serif'; ctx.fillStyle = '#80d8ff';
    if (roomForPath) ctx.fillText('TRIAL RUN · SCORE AND CATCHES WERE NOT SAVED', W / 2, pathY + 43, L.pw - 30);
  } else if (G.daily) {
    const sh = L.share, hovS = inRect(mouseX, lastMouseY, sh);
    roundRect(sh.x, sh.y, sh.w, sh.h, 12);
    ctx.fillStyle = hovS ? 'rgba(128,216,255,0.28)' : 'rgba(128,216,255,0.13)'; ctx.fill();
    ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = '800 10px Orbitron, sans-serif'; ctx.fillStyle = '#e0f7ff';
    ctx.fillText(G.shareToast > 0 ? '✓ RESULT READY' : 'SHARE DAILY RESULT', sh.x + sh.w / 2, sh.y + sh.h / 2);
  }
  const labels = ['↻ RETRY', RUN_CKPT && !G.daily && !G.trial ? '▶ CONTINUE' : '＋ NEW RUN', '⚙ TRIAL', '⌂ TITLE'];
  labels.forEach((label, i) => {
    const b = L.button(i), hov = inRect(mouseX, lastMouseY, b);
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = hov ? 'rgba(255,213,79,0.25)' : 'rgba(255,255,255,0.07)'; ctx.fill();
    ctx.strokeStyle = i === 0 ? '#ffd54f' : hov ? '#e3f2fd' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = i === 0 ? 2 : 1.2; ctx.stroke();
    ctx.font = `800 ${L.narrow ? 9 : 10}px Orbitron, sans-serif`; ctx.fillStyle = i === 0 ? '#ffd54f' : '#cfd8dc';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2, b.w - 8);
  });
  ctx.restore();
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
      const col = GENS[i].accent || '#66bb6a';
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
        const sil = getSilhouette(GENS[i].boss.id, GENS[i].accent);
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
      'PARTNER ' + (pilotInfo().id > 0 ? (NAMES[pilotInfo().id] || 'PARTNER').toUpperCase() : 'TRAINING DRONE')
        + ' · ' + (s.catches || G.caughtRun) + ' CATCHES · ' + ((G.runStats && G.runStats.bossesDefeated) || 0) + ' BOSSES',
      s.path && s.path !== 'NO PATH YET' ? 'FAVOURITE PATH · ' + s.path : null,
      G.secret && G.secret.completed ? 'KANTO RIFT · CONQUERED' : null,
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
  const img = pil.id > 0 ? getSprite(pil.id) : null;
  if (img && img.complete && img.naturalWidth) {
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    ctx.drawImage(img, x - 30, y - 30 + bob, 60, 60);
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

function drawOverlays() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (G.state === 'menu') { drawMenu(); }
  else if (G.state === 'ending') { drawEnding(); }
  else if (G.state === 'dex') { drawDex(); }
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
      jc.step === 1 ? (IS_TOUCH ? 'DRAG ANYWHERE — YOUR POKÉMON FOLLOWS' : 'MOVE THE MOUSE — YOUR POKÉMON FOLLOWS') :
      jc.step === 2 ? (IS_TOUCH ? 'TAP FIRE TO ATTACK' : 'CLICK OR SPACE — FIRE') :
      jc.step === 3 ? (IS_TOUCH ? 'HOLD FIRE TO CHARGE A BIG SHOT' : 'HOLD SHIFT OR RIGHT-CLICK — CHARGE A BIG SHOT') :
      jc.step === 4 ? ((orbFalling || hit) ? 'GRAB THE FALLING ORB — IT CHANGES YOUR ATTACK TYPE' : null) :
      jc.step === 5 ? ((megaReady || hit) ? (IS_TOUCH ? 'MEGA IS FULL — TAP THE GLOWING RING' : 'MEGA IS FULL — PRESS E') : null) : null;
    // same safe band as the compact announcements (only one shows at a time):
    // under the HUD column on portrait, mid-screen gap on short landscape
    const coachY = H < 560 ? H * 0.42 : SAFE_T + (W < 560 ? 156 : 124);
    if (txt) hintPill((hit ? '✓ ' : '') + txt, coachY, hit ? '#9df2b0' : '#ffd54f');
  } else if (G.state === 'upgrade') {
    dim(0.55);
    const draftShort = H < 520;
    const secretDraft = !!G.secret.rewardDraft;
    const wasBossStage = G.clearedStage === 2;
    const clearedGen = GENS[regionIdx(Math.max(1, G.level - 1))];
    const clearY = draftShort ? 36 : H * 0.16;
    const draftAccent = secretDraft ? '#d780ff' : wasBossStage ? clearedGen.accent : '#66bb6a';
    drawDraftBackdrop(draftAccent);
    title(secretDraft ? 'RIFT CONQUERED!' : wasBossStage ? clearedGen.name + ' CLEARED!' : 'STAGE CLEAR!',
      clearY, Math.min(draftShort ? 30 : 40, W / 12), draftAccent);
    ctx.font = '700 15px Orbitron, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(secretDraft ? '+3000 SECRET BOSS BONUS' : '+' + (300 + (G.clearedStage || 0) * 250) + ' BONUS',
      W / 2, clearY + (draftShort ? 28 : 34));
    if (secretDraft && !draftShort) {
      ctx.font = '900 12px Orbitron, sans-serif'; ctx.fillStyle = '#80e8ff';
      ctx.fillText('CHOOSE ONE FORBIDDEN UPGRADE · THE NORMAL KANTO DRAFT FOLLOWS', W / 2, clearY + 60, W * 0.92);
    } else if (stageIdx(G.level) === 0 && !draftShort) {
      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.fillStyle = genFor(G.level).accent;
      ctx.fillText('NEXT STOP: ' + genFor(G.level).name, W / 2, H * 0.16 + 62);
    }
    if (!secretDraft) drawJourneyMap(clearY + (draftShort ? 56 : 86), draftShort || W < 560);
    if (G.upgradeChoices && G.stateT > 0.8) {
      const a = Math.min(1, (G.stateT - 0.8) / 0.4);
      ctx.globalAlpha = a;
      ctx.font = '700 14px Orbitron, sans-serif';
      ctx.fillStyle = '#e3f2fd';
      const L = upgradeLayout();
      // header strip: before a selection it's the prompt; once a card is
      // inspected it becomes THAT pick's place in its path — owned tiers
      // filled, the pick glowing, future tiers dim — so the player sees the
      // upgrade path right here without flipping to the FULL TREE screen
      const headerY = L.card(0).y - (L.stacked || L.short ? 16 : 22);
      const selC = draftSel != null && G.upgradeChoices[draftSel];
      if (!selC) {
        ctx.fillText((secretDraft ? 'CHOOSE A SECRET UPGRADE' : G.mode === 'junkie' ? 'CHOOSE A HELD ITEM' : 'CHOOSE AN UPGRADE') +
          (IS_TOUCH ? ' — TAP A CARD TO INSPECT' : ' — INSPECT, THEN CONFIRM'), W / 2, headerY, W * 0.94);
      } else if (selC.secret) {
        ctx.font = '800 11px Orbitron, sans-serif'; ctx.fillStyle = selC.secret.color;
        ctx.fillText('RIFT EXCLUSIVE · ' + selC.secret.name + ' · UNAVAILABLE IN THE NORMAL TREE', W / 2, headerY, W * 0.94);
      } else if (selC.stack) {
        const owned0 = (G.stacks && G.stacks[selC.stack.key]) || 0;
        ctx.font = '800 11px Orbitron, sans-serif';
        ctx.fillStyle = selC.stack.color;
        ctx.fillText('∞ ' + selC.stack.name + ' — STACKS FOREVER · ×' + owned0 + ' → ×' + (owned0 + 1), W / 2, headerY, W * 0.94);
      } else {
        const P = selC.path, lvlSel = pathLvl(selC.pathKey);
        const chainW = Math.min(W * 0.92, 640);
        const nh = L.stacked || L.short ? 20 : 24;
        const nw = (chainW - 3 * 14) / 4;
        const x0 = W / 2 - chainW / 2, ny = headerY - nh / 2;
        ctx.font = '800 8.5px Orbitron, sans-serif';
        ctx.fillStyle = P.color;
        ctx.fillText(P.name + ' PATH · ' + pathRole(selC.pathKey), W / 2, ny - 8, chainW);
        for (let ti = 0; ti < 4; ti++) {
          const nx = x0 + ti * (nw + 14);
          const ownedT = ti < lvlSel, isPick = ti === selC.tierIdx;
          if (ti) {
            ctx.font = '800 10px Orbitron, sans-serif';
            ctx.fillStyle = ti <= lvlSel ? P.color : 'rgba(255,255,255,0.3)';
            ctx.fillText('›', nx - 8, headerY);
          }
          roundRect(nx, ny, nw, nh, 6);
          ctx.fillStyle = ownedT ? P.color + '30' : isPick ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)';
          ctx.fill();
          if (isPick) { ctx.shadowColor = P.color; ctx.shadowBlur = 10; }
          ctx.lineWidth = isPick ? 2 : 1;
          ctx.strokeStyle = ownedT ? P.color : isPick ? '#ffffff' : 'rgba(255,255,255,0.16)';
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.font = `800 ${nh < 24 ? 6.5 : 8}px Orbitron, sans-serif`;
          ctx.fillStyle = ownedT ? P.color : isPick ? '#fff' : '#78909c';
          ctx.fillText((ti === 3 ? '★ ' : '') + junkieTierName(selC.pathKey, ti), nx + nw / 2, headerY, nw - 8);
        }
      }
      for (let i = 0; i < G.upgradeChoices.length; i++) {
        const c = G.upgradeChoices[i], r = L.card(i);
        if (c.secret) {
          const scol = c.secret.color, sel = draftSel === i;
          const hov = sel || inRect(mouseX, lastMouseY, r);
          ctx.save();
          ctx.globalAlpha = a * (draftSel != null && !sel ? 0.55 : 1);
          if (hov) { ctx.shadowColor = sel ? '#ffffff' : scol; ctx.shadowBlur = sel ? 28 : 22; }
          roundRect(r.x, r.y, r.w, r.h, 14);
          ctx.fillStyle = hov ? 'rgba(31,16,61,0.98)' : 'rgba(13,8,35,0.95)'; ctx.fill();
          ctx.lineWidth = sel ? 3 : hov ? 2.5 : 1.7;
          ctx.strokeStyle = sel ? '#ffffff' : hov ? scol : scol + '88'; ctx.stroke();
          ctx.shadowBlur = 0;
          drawDraftCardEnergy(r, scol, true, sel, i);
          if (L.stacked) {
            drawDraftBadge(c.secret.icon, r.x + 35, r.y + r.h / 2, 18, scol, true, i);
            ctx.textAlign = 'left';
            ctx.font = '900 9px Orbitron, sans-serif'; ctx.fillStyle = '#80e8ff';
            ctx.fillText('SECRET · RIFT EXCLUSIVE', r.x + 66, r.y + 17, r.w - 76);
            ctx.font = '900 15px Orbitron, sans-serif'; ctx.fillStyle = '#fff';
            ctx.fillText(c.secret.name, r.x + 66, r.y + 38, r.w - 76);
            ctx.font = bodyFont(10.5, 600); ctx.fillStyle = '#e0e7f0';
            wrapText(c.secret.desc, r.w - 84).slice(0, 3).forEach((l, li) => ctx.fillText(l, r.x + 66, r.y + 58 + li * 13, r.w - 78));
          } else {
            ctx.textAlign = 'center';
            ctx.font = '900 9px Orbitron, sans-serif'; ctx.fillStyle = '#80e8ff';
            ctx.fillText('SECRET · RIFT EXCLUSIVE', r.x + r.w / 2, r.y + (L.short ? 13 : 20), r.w - 16);
            drawDraftBadge(c.secret.icon, r.x + r.w / 2, r.y + (L.short ? 43 : 70), L.short ? 16 : 24, scol, true, i);
            ctx.font = `900 ${L.short ? 12 : 18}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
            ctx.fillText(c.secret.name, r.x + r.w / 2, r.y + (L.short ? 72 : 111), r.w - 18);
            ctx.font = bodyFont(L.short ? 9 : 12.5, 600); ctx.fillStyle = '#e8eef6';
            wrapText(c.secret.desc, r.w - 28).slice(0, L.short ? 2 : 4).forEach((l, li) =>
              ctx.fillText(l, r.x + r.w / 2, r.y + (L.short ? 91 : 143) + li * (L.short ? 12 : 18), r.w - 20));
            ctx.font = '800 10px Orbitron, sans-serif'; ctx.fillStyle = sel ? '#a5d6a7' : '#78909c';
            ctx.fillText(sel ? (IS_TOUCH ? '✓ SELECTED — TAP CONFIRM' : '✓ SELECTED — ENTER CONFIRMS')
              : (IS_TOUCH ? 'TAP TO INSPECT' : 'INSPECT: CLICK OR PRESS ' + (i + 1)),
              r.x + r.w / 2, r.y + r.h - 16, r.w - 16);
          }
          ctx.restore();
          continue;
        }
        // SPACE JUNKIE stack-item card: the tree is full — these stack forever
        if (c.stack) {
          const scol = c.stack.color;
          const sel = draftSel === i;
          const hov2 = sel || inRect(mouseX, lastMouseY, r);
          const owned = (G.stacks && G.stacks[c.stack.key]) || 0;
          ctx.save();
          ctx.globalAlpha = a * (draftSel != null && !sel ? 0.55 : 1);
          if (hov2) { ctx.shadowColor = sel ? '#ffffff' : scol; ctx.shadowBlur = sel ? 26 : 22; }
          roundRect(r.x, r.y, r.w, r.h, 14);
          ctx.fillStyle = hov2 ? 'rgba(20,28,58,0.97)' : 'rgba(10,15,36,0.93)';
          ctx.fill();
          ctx.lineWidth = sel ? 3 : hov2 ? 2.5 : 1.5;
          ctx.strokeStyle = sel ? '#ffffff' : hov2 ? scol : scol + '77';
          ctx.stroke();
          ctx.shadowBlur = 0;
          drawDraftCardEnergy(r, scol, hov2, sel, i);
          if (L.stacked) {
            drawDraftBadge(c.stack.icon, r.x + 34, r.y + r.h / 2, 17, scol, hov2, i);
            ctx.textAlign = 'left';
            ctx.font = '900 9px Orbitron, sans-serif';
            ctx.fillStyle = scol;
            ctx.fillText((G.mode === 'junkie' ? 'HELD ITEM' : 'MASTERY ITEM') + ' · STACKS FOREVER' + (owned ? ' · OWNED ×' + owned : ''), r.x + 64, r.y + 15);
            ctx.font = '900 14px Orbitron, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(c.stack.name, r.x + 64, r.y + 33);
            ctx.font = bodyFont(9.5);
            ctx.fillStyle = '#b0bec5';
            wrapText(c.stack.desc, r.w - 80).forEach((l, li) => ctx.fillText(l, r.x + 64, r.y + 50 + li * 12));
          } else if (L.short) {
            ctx.textAlign = 'center';
            ctx.font = '900 8px Orbitron, sans-serif'; ctx.fillStyle = scol;
            ctx.fillText(G.mode === 'junkie' ? 'HELD ITEM' : 'MASTERY ITEM', r.x + r.w / 2, r.y + 12, r.w - 8);
            drawDraftBadge(c.stack.icon, r.x + r.w / 2, r.y + 39, 14, scol, hov2, i);
            ctx.font = '900 11px Orbitron, sans-serif'; ctx.fillStyle = '#fff';
            ctx.fillText(c.stack.name, r.x + r.w / 2, r.y + 64, r.w - 10);
            ctx.font = bodyFont(8, 600); ctx.fillStyle = '#b0bec5';
            wrapText(c.stack.desc, r.w - 14).slice(0, 2).forEach((l, li) => ctx.fillText(l, r.x + r.w / 2, r.y + 82 + li * 11));
            ctx.font = '700 7.5px Orbitron, sans-serif'; ctx.fillStyle = sel ? '#a5d6a7' : '#546e7a';
            ctx.fillText(sel ? '✓ SELECTED' : (IS_TOUCH ? 'TAP' : 'PRESS ' + (i + 1)), r.x + r.w / 2, r.y + r.h - 8);
          } else {
            ctx.textAlign = 'center';
            ctx.font = '900 10px Orbitron, sans-serif';
            ctx.fillStyle = scol;
            ctx.fillText(G.mode === 'junkie' ? 'HELD ITEM' : 'MASTERY ITEM', r.x + r.w / 2, r.y + 20);
            ctx.font = '700 10px Orbitron, sans-serif';
            ctx.fillStyle = owned ? '#fff' : '#78909c';
            ctx.fillText(owned ? 'OWNED ×' + owned : 'NEW', r.x + r.w / 2, r.y + 38);
            drawDraftBadge(c.stack.icon, r.x + r.w / 2, r.y + 72, 22, scol, hov2, i);
            ctx.font = '900 15px Orbitron, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(c.stack.name, r.x + r.w / 2, r.y + 112, r.w - 20);
            ctx.font = bodyFont(10.5);
            ctx.fillStyle = '#b0bec5';
            wrapText(c.stack.desc, r.w - 28).forEach((l, li) => ctx.fillText(l, r.x + r.w / 2, r.y + 136 + li * 16));
            ctx.font = '700 9.5px Orbitron, sans-serif';
            ctx.fillStyle = scol;
            ctx.fillText('∞ NO CAP — TAKE IT EVERY TIME', r.x + r.w / 2, r.y + r.h - 38, r.w - 16);
            ctx.fillStyle = sel ? '#a5d6a7' : '#546e7a';
            ctx.font = '700 11px Orbitron, sans-serif';
            ctx.fillText(sel ? (IS_TOUCH ? '✓ SELECTED — TAP CONFIRM' : '✓ SELECTED — ENTER CONFIRMS')
              : (IS_TOUCH ? 'TAP TO INSPECT' : 'INSPECT: CLICK OR PRESS ' + (i + 1)), r.x + r.w / 2, r.y + r.h - 16, r.w - 14);
          }
          ctx.restore();
          continue;
        }
        const col = c.path.color, tier = c.tier;
        const isCap = c.tierIdx === 3;
        const sel = draftSel === i;
        const hov = sel || inRect(mouseX, lastMouseY, r);
        ctx.save();
        ctx.globalAlpha = a * (draftSel != null && !sel ? 0.55 : 1);
        if (hov || isCap) { ctx.shadowColor = sel ? '#ffffff' : col; ctx.shadowBlur = sel ? 26 : isCap ? 26 : 22; }
        roundRect(r.x, r.y, r.w, r.h, 14);
        ctx.fillStyle = hov ? 'rgba(20,28,58,0.97)' : 'rgba(10,15,36,0.93)';
        ctx.fill();
        ctx.lineWidth = sel ? 3 : hov || isCap ? 2.5 : 1.5;
        ctx.strokeStyle = sel ? '#ffffff' : hov || isCap ? col : col + '77';
        ctx.stroke();
        ctx.shadowBlur = 0;
        drawDraftCardEnergy(r, col, hov || isCap, sel, i);
        const pips = (px2, py2) => {
          for (let d = 0; d < 4; d++) {
            ctx.beginPath(); ctx.arc(px2 - 21 + d * 14, py2, 4, 0, Math.PI * 2);
            ctx.fillStyle = d < c.tierIdx ? col : d === c.tierIdx ? '#fff' : 'rgba(255,255,255,0.16)';
            ctx.fill();
          }
        };
        if (L.stacked) { // phone: icon left, text right
          drawDraftBadge(tier.icon, r.x + 34, r.y + r.h / 2, 18, col, hov || isCap, i);
          ctx.textAlign = 'left';
          ctx.font = '900 9.5px Orbitron, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(c.path.name + ' · ' + c.tags.join(' + ') + ' · TIER ' + (c.tierIdx + 1) + '/4', r.x + 66, r.y + 16, r.w - 74);
          ctx.font = '900 15px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#fff';
          ctx.fillText(junkieTierName(c.pathKey, c.tierIdx), r.x + 66, r.y + 35, r.w - 74);
          ctx.font = bodyFont(11, 600);
          ctx.fillStyle = '#e0e7f0';
          wrapText(tierDesc(c.pathKey, c.tierIdx), r.w - 82).slice(0, 3).forEach((l, li) => ctx.fillText(l, r.x + 66, r.y + 54 + li * 13, r.w - 78));
          ctx.font = '700 7.5px Orbitron, sans-serif'; ctx.fillStyle = col;
          ctx.fillText(c.comparison, r.x + 66, r.y + r.h - 10, r.w - 76);
        } else if (L.short) { // short landscape: compact vertical card
          ctx.textAlign = 'center';
          ctx.font = '900 8.5px Orbitron, sans-serif'; ctx.fillStyle = col;
          ctx.fillText(c.path.name + ' · ' + c.tags.join('+') + (isCap ? ' · CAP' : ''), r.x + r.w / 2, r.y + 12, r.w - 8);
          pips(r.x + r.w / 2, r.y + 25);
          drawDraftBadge(tier.icon, r.x + r.w / 2, r.y + 48, 15, col, hov || isCap, i);
          ctx.font = '900 12px Orbitron, sans-serif'; ctx.fillStyle = isCap ? col : '#fff';
          ctx.fillText(junkieTierName(c.pathKey, c.tierIdx), r.x + r.w / 2, r.y + 73, r.w - 10);
          ctx.font = bodyFont(9.5, 600); ctx.fillStyle = '#e0e7f0';
          wrapText(tierDesc(c.pathKey, c.tierIdx), r.w - 16).slice(0, 2).forEach((l, li) => ctx.fillText(l, r.x + r.w / 2, r.y + 90 + li * 12, r.w - 12));
          ctx.font = '700 8px Orbitron, sans-serif'; ctx.fillStyle = sel ? '#a5d6a7' : hov ? '#cfd8dc' : '#546e7a';
          ctx.fillText(sel ? '✓ SELECTED' : (IS_TOUCH ? 'TAP' : 'PRESS ' + (i + 1)), r.x + r.w / 2, r.y + r.h - 8);
        } else { // desktop: tall card
          ctx.textAlign = 'center';
          ctx.font = '900 10px Orbitron, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(c.path.name + (isCap ? ' · CAPSTONE' : ' · TIER ' + (c.tierIdx + 1) + '/4'), r.x + r.w / 2, r.y + 17, r.w - 20);
          ctx.font = '800 8px Orbitron, sans-serif'; ctx.fillStyle = '#b3e5fc';
          ctx.fillText(c.tags.join('  +  '), r.x + r.w / 2, r.y + 34, r.w - 18);
          pips(r.x + r.w / 2, r.y + 48);
          drawDraftBadge(tier.icon, r.x + r.w / 2, r.y + 78, 22, col, hov || isCap, i);
          // the upgrade NAME — the headline
          ctx.font = '900 18px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#fff';
          ctx.fillText((isCap ? '★ ' : '') + junkieTierName(c.pathKey, c.tierIdx) + (isCap ? ' ★' : ''), r.x + r.w / 2, r.y + 113, r.w - 18);
          // what it DOES — big, high-contrast, the thing you actually read
          ctx.font = bodyFont(13, 600);
          ctx.fillStyle = '#e8eef6';
          wrapText(tierDesc(c.pathKey, c.tierIdx), r.w - 30).slice(0, 4).forEach((l, li) => ctx.fillText(l, r.x + r.w / 2, r.y + 140 + li * 18, r.w - 24));
          ctx.font = '700 8px Orbitron, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(c.comparison, r.x + r.w / 2, r.y + r.h - 48, r.w - 16);
          ctx.fillStyle = '#90a4ae';
          ctx.fillText(c.synergy, r.x + r.w / 2, r.y + r.h - 34, r.w - 16);
          ctx.fillStyle = sel ? '#a5d6a7' : hov ? '#e3f2fd' : '#607d8b';
          ctx.font = '800 11px Orbitron, sans-serif';
          ctx.fillText(sel ? (IS_TOUCH ? '✓ SELECTED — TAP CONFIRM' : '✓ SELECTED — ENTER CONFIRMS')
            : (IS_TOUCH ? 'TAP TO INSPECT' : 'INSPECT: CLICK OR PRESS ' + (i + 1)), r.x + r.w / 2, r.y + r.h - 15, r.w - 14);
        }
        ctx.restore();
      }
      // one reroll per draft — a dead hand shouldn't end the build
      const rr = L.reroll;
      const canRR = !secretDraft && !G.rerolled;
      const hovRR = canRR && inRect(mouseX, lastMouseY, rr);
      ctx.globalAlpha = a * (canRR ? 1 : 0.35);
      roundRect(rr.x, rr.y, rr.w, rr.h, 16);
      ctx.fillStyle = hovRR ? 'rgba(255,213,79,0.2)' : 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = canRR ? (hovRR ? '#ffd54f' : 'rgba(255,255,255,0.35)') : 'rgba(255,255,255,0.15)';
      ctx.stroke();
      ctx.font = '700 12px Orbitron, sans-serif';
      ctx.fillStyle = canRR ? '#ffd54f' : '#546e7a';
      ctx.fillText(secretDraft ? 'FIXED SET' : canRR ? (IS_TOUCH ? 'REROLL' : 'REROLL (R)') : 'REROLLED', rr.x + rr.w / 2, rr.y + rr.h / 2 + 1, rr.w - 10);
      // CONFIRM — the only thing that actually applies the inspected pick
      const cf = L.confirm, canCF = draftSel != null;
      const hovCF = canCF && inRect(mouseX, lastMouseY, cf);
      ctx.globalAlpha = a * (canCF ? 1 : 0.4);
      if (canCF) { ctx.shadowColor = '#66bb6a'; ctx.shadowBlur = hovCF ? 20 : 12; }
      roundRect(cf.x, cf.y, cf.w, cf.h, 16);
      ctx.fillStyle = canCF ? (hovCF ? 'rgba(102,187,106,0.38)' : 'rgba(102,187,106,0.22)') : 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = canCF ? 2 : 1.5;
      ctx.strokeStyle = canCF ? '#66bb6a' : 'rgba(255,255,255,0.15)';
      ctx.stroke();
      ctx.font = '800 12px Orbitron, sans-serif';
      ctx.fillStyle = canCF ? '#d7ffd9' : '#546e7a';
      ctx.fillText(canCF ? (IS_TOUCH ? '✓ CONFIRM' : '✓ CONFIRM (ENTER)') : 'PICK A CARD', cf.x + cf.w / 2, cf.y + cf.h / 2 + 1, cf.w - 10);
      ctx.globalAlpha = a;
      const tr = L.tree, hovTR = !secretDraft && inRect(mouseX, lastMouseY, tr);
      roundRect(tr.x, tr.y, tr.w, tr.h, 16);
      ctx.fillStyle = hovTR ? 'rgba(128,216,255,0.2)' : 'rgba(255,255,255,0.07)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = secretDraft ? 'rgba(255,255,255,0.15)' : hovTR ? '#80d8ff' : 'rgba(255,255,255,0.35)'; ctx.stroke();
      ctx.font = '700 11px Orbitron, sans-serif'; ctx.fillStyle = secretDraft ? '#546e7a' : hovTR ? '#e0f7ff' : '#80d8ff';
      ctx.fillText(secretDraft ? 'SECRET ONLY' : IS_TOUCH ? 'FULL TREE' : 'FULL TREE (T)', tr.x + tr.w / 2, tr.y + tr.h / 2 + 1, tr.w - 12);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      if (upgradeTreeOpen) drawFullUpgradeTree();
    }
  } else if (G.state === 'ceremony') {
    drawCeremony();
  } else if (G.state === 'gameover') {
    drawGameOverSummary();
  }
  if (paused) {
    dim(0.5);
    title('PAUSED', H * 0.38, 44, '#e3f2fd');
    ctx.font = '500 13px Orbitron, sans-serif';
    ctx.fillStyle = '#90a4ae';
    // CLASSIC leads with the ball — the blaster is an earned extra, not a
    // default control, so its help never promises a FIRE button
    (G.mode === 'classic'
      ? (IS_TOUCH
        ? ['DRAG — MOVE PADDLE', 'TAP THE PLAYFIELD — LAUNCH THE BALL', 'MEGA BUTTON — EVOLVE WHEN THE RING IS FULL', 'EARN A BLASTER FROM DROPS & DRAFTS']
        : ['MOUSE — MOVE PADDLE', 'CLICK / SPACE — LAUNCH THE BALL', 'E — MEGA EVOLVE WHEN METER IS FULL', 'EARN A BLASTER FROM DROPS & DRAFTS', 'M — MUSIC · P / ESC — PAUSE · Q — QUIT'])
      : (IS_TOUCH
        ? ['DRAG ANYWHERE — MOVE', SETTINGS.autoFire ? 'AUTO-FIRE — ON' : 'TAP FIRE — SHOOT', 'HOLD FIRE — CHARGE A BIG SHOT', 'MEGA BUTTON — EVOLVE WHEN THE RING IS FULL']
        : ['MOUSE — MOVE', 'CLICK / SPACE — FIRE', 'RIGHT-CLICK OR SHIFT — CHARGE A BIG SHOT', 'E — MEGA EVOLVE WHEN METER IS FULL', 'M — MUSIC · P / ESC — PAUSE · Q — QUIT'])
    ).forEach((l, i) => ctx.fillText(l, W / 2, H * 0.47 + i * 22, W * 0.92));
    pulse(IS_TOUCH ? 'TAP TO RESUME' : 'CLICK OR P TO RESUME', H * 0.64);
    // Mid-run settings remove the old dead end where changing touch controls
    // required abandoning the journey. Quit remains visually destructive.
    for (const [b, label, col, bg] of [
      [pauseSettingsGeom(), '⚙ SETTINGS', '#80d8ff', '128,216,255'],
      [pauseQuitGeom(), 'QUIT TO MENU', '#ef9a9a', '239,83,80'],
    ]) {
      const hov = inRect(mouseX, lastMouseY, b);
      ctx.save();
      roundRect(b.x, b.y, b.w, b.h, 12);
      ctx.fillStyle = `rgba(${bg},${hov ? 0.25 : 0.12})`; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = hov ? col : col + 'bb'; ctx.stroke();
      ctx.font = `900 ${W < 480 ? 12 : 15}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 12);
      ctx.restore();
    }
    // ✦ CHEAT CODES — a small ornate chip, only ever visible while paused
    {
      const cb2 = cheatBtnGeom();
      const cHov = inRect(mouseX, lastMouseY, cb2);
      ctx.save();
      const shimmer = 0.5 + 0.2 * Math.sin(G.time * 2.2);
      if (cHov) { ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 14; }
      roundRect(cb2.x, cb2.y, cb2.w, cb2.h, 15);
      ctx.fillStyle = cHov ? 'rgba(255,213,79,0.16)' : 'rgba(255,213,79,0.06)';
      ctx.fill();
      ctx.setLineDash([4, 5]); // the dashed seam marks it as OUTSIDE the rules
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = `rgba(255,213,79,${cHov ? 0.95 : shimmer})`;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.font = '800 11px Orbitron, sans-serif';
      ctx.fillStyle = cHov ? '#ffe082' : `rgba(255,213,79,${shimmer + 0.25})`;
      ctx.fillText('✦ CHEAT CODES ✦', cb2.x + cb2.w / 2, cb2.y + cb2.h / 2 + 1);
      ctx.restore();
    }
    if (cheatOpen) drawCheats();
    if (advOpen) drawAdvanced();
  }
  if (G.flashT > 0) {
    ctx.fillStyle = `rgba(255,60,60,${G.flashT * (SETTINGS.reduceFlash ? 0.18 : 0.6)})`;
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
function hintPill(text, y, color = '#a9d4ff') {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = Math.max(12, Math.min(15, W / 26));
  ctx.font = `700 ${size}px Orbitron, sans-serif`;
  const tw = Math.min(ctx.measureText(text).width, W * 0.88) + 32;
  roundRect(W / 2 - tw / 2, y - 17, tw, 34, 17);
  ctx.fillStyle = 'rgba(6,10,26,0.68)'; ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y + 1, W * 0.84);
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
  ctx.save();
  if (G.dramaticT > 0) { // last-brick slow-mo zoom
    const z = 1 + 0.035 * Math.sin(Math.min(1, (0.9 - G.dramaticT) / 0.25) * Math.PI / 2);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  }
  const shk = SETTINGS.reduceShake ? G.shake * 0.25 : G.shake;
  if (shk > 0) ctx.translate((Math.random() - 0.5) * shk, (Math.random() - 0.5) * shk);
  drawBackground();
  if (G.state !== 'menu' && G.state !== 'dex') {
    drawGauntletEntranceFx();
    drawDangerLine();
    drawRallyZone();
    drawTelegraphs();
    drawBricks();
    drawFragments();
    drawShield();
    drawPowerups();
    drawProjectiles();
    drawBalls();
    drawServeGuide();
    if (G.state !== 'gameover' && G.state !== 'upgrade') drawPaddle();
    if (G.state !== 'gameover' && G.state !== 'upgrade') drawUpgradeInstallFx();
    drawShootHint();
    drawParticles();
    drawAnnounce();
  }
  ctx.restore();
  // bloom the gameplay scene before the vignette darkens the edges
  if (G.state === 'play' || G.state === 'serve') drawBloom();
  if (vignette) ctx.drawImage(vignette, 0, 0, W, H); // may be unset pre-boot
  if (G.state !== 'menu' && G.state !== 'dex' && G.state !== 'upgrade') drawHUD();
  drawOverlays();
  if (G.state === 'menu' || G.state === 'dex') drawAnnounce(); // konami toast etc.
  drawCursor();
}
