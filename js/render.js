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

function drawBackground() {
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
  const phCol = ph === 3 ? '#ff1744' : ph === 2 ? '#ff8a65' : col;
  const t = G.time;
  const s = Math.max(br.w * 1.15, br.h * 1.9);
  // legendaries move like themselves too
  let bobY = Math.sin(t * 1.6 + br.wobble) * 5, gaitRot = Math.sin(t * 1.1 + br.wobble) * 0.03, sclY = 1;
  if (GAIT_FLAP.has(br.poke.t)) { bobY = Math.sin(t * 4.2 + br.wobble) * 6.5; sclY = 1 + 0.045 * Math.sin(t * 8.4 + br.wobble); }
  else if (GAIT_SWIM.has(br.poke.t)) { gaitRot = Math.sin(t * 2.6 + br.wobble) * 0.07; }
  const yb = y + bobY - s * 0.06;
  ctx.save();
  const phased = br.phaseT > 0 ? 0.35 + 0.1 * Math.sin(t * 6) : 1; // Lunala phases out
  ctx.globalAlpha = phased;
  // arena aura — a big breathing glow that reddens with the fight
  // (cached sprite, scaled: no per-frame gradient on the biggest fill)
  const ar = s * (0.72 + 0.05 * Math.sin(t * 2.4));
  ctx.globalAlpha = phased * (ph >= 2 ? 0.95 : 0.75);
  const bAur = auraSprite(phCol);
  ctx.drawImage(bAur, x - ar, yb - ar, ar * 2, ar * 2);
  ctx.globalAlpha = phased;
  // orbiting energy ring — two arcs, faster and angrier each phase
  const rr = s * 0.58, spin = t * (0.7 + ph * 0.4);
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = phased * (0.4 + 0.1 * ph);
    ctx.strokeStyle = phCol;
    ctx.beginPath();
    ctx.ellipse(x, yb, rr, rr * 0.42, 0, spin + i * Math.PI, spin + i * Math.PI + Math.PI * 0.55);
    ctx.stroke();
  }
  ctx.globalAlpha = phased;
  // last stand: crackling sparks around the body
  if (ph === 3) {
    ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const a2 = t * 7 + i * 2.1 + br.wobble;
      const sx2 = x + Math.cos(a2) * s * 0.42, sy2 = yb + Math.sin(a2 * 1.3) * s * 0.34;
      ctx.globalAlpha = phased * (0.3 + 0.5 * Math.abs(Math.sin(t * 11 + i * 3)));
      ctx.beginPath();
      ctx.moveTo(sx2 - 5, sy2 + 5); ctx.lineTo(sx2 + 2, sy2 - 1); ctx.lineTo(sx2 - 2, sy2 - 2); ctx.lineTo(sx2 + 5, sy2 - 8);
      ctx.stroke();
    }
    ctx.globalAlpha = phased;
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
    ctx.globalAlpha = phased * 0.35;
    ctx.drawImage(shadow, -s / 2 + 7, -s / 2 + 10, s, s * 0.97);
  }
  if (rim) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = phased * (0.42 + (ph === 3 ? 0.22 * Math.abs(Math.sin(t * 6)) : ph === 2 ? 0.14 : 0));
    const rs = s * 1.07;
    ctx.drawImage(rim, -rs / 2, -rs / 2 - 2, rs, rs);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = phased;
  // no shadowBlur on a 200px+ sprite (mobile GPU stall) — the rim-light
  // silhouette above already carries the glow
  if (ok) ctx.drawImage(img, -s / 2, -s / 2, s, s);
  else drawGlyph(ctx, 'pokeball', 0, 0, br.h * 0.4, '#ffffff33');
  if (flashS && br.flash > 0.3) { // hits light the legendary up from within
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = phased * (br.flash - 0.3) * 0.9;
    ctx.drawImage(flashS, -s / 2, -s / 2, s, s);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // name plate + segmented HP bar + phase pips — anchored to the hitbox
  const hh = br.h / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 13px Orbitron, sans-serif';
  ctx.fillStyle = ph === 3 ? '#ff8a80' : ph === 2 ? '#ffab91' : '#fff';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
  ctx.fillText((ph === 3 ? '💀 ' : ph === 2 ? '😡 ' : '★ ') + br.poke.n.toUpperCase() + (ph === 1 ? ' ★' : ''), x, y - hh - 26);
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
  // phase notches on the bar at ⅔ and ⅓, plus pips under it
  ctx.fillStyle = 'rgba(6,9,24,0.9)';
  for (const f2 of [1 / 3, 2 / 3]) ctx.fillRect(x - bw2 / 2 + bw2 * f2 - 1, y - hh - 16, 2, 8);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x - 16 + i * 16, y - hh - 3, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = i < ph ? phCol : 'rgba(255,255,255,0.2)';
    ctx.fill();
  }
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
    if (br.isBoss) y += introOff;
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
      const s2 = Math.min(br.w, br.h * 1.15) * 1.25 * (1 + br.flash * 0.1);
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
        ctx.rotate(bank + gaitRot);
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
      // durability ring on tough flyers — evolved elites take several hits,
      // and without this their remaining HP is guesswork
      if (br.maxHp >= 3 && br.hp < br.maxHp && br.hp > 0) {
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
    // the legendary gets its own full presentation — never a framed card
    if (br.isBoss) { drawBossMon(br, x, y); continue; }
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
      drawGlyph(ctx, 'laser', x + hw - 8, y - hh + 8, 4.5, '#4dd0e1');
    }
    if (!br.isBoss && br.maxHp > 1 && !tinyCard && !(smallCard && br.hp >= br.maxHp)) {
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
      const by2 = smallCard && !br.isBoss ? y + hh - bR - 3 : y - hh + bR + 5;
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
  if (G.bossIntro > 0 && boss) {
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

// ---- SPACE JUNKIE ship: no paddle at all — the pilot IS the ship. A bare
// Pokémon with an element-colored aura and jet exhaust, banking with your
// movement and free to fly vertically inside its band. A Charmeleon riding
// a grass element visibly runs green from aura to exhaust to muzzle.
function drawPilotRig(x, py) {
  const pil = pilotInfo();
  const col = TYPE_COLORS[attackElement()] || '#80d8ff';
  const mega = G.megaT > 0;
  const s = 54 + G.starterLvl * 6;
  const bob = Math.sin(G.time * 3.2) * 2.5;
  const y = py + bob;
  const tilt = Math.max(-0.34, Math.min(0.34, G.paddle.speed * 0.00028));
  // element aura — the "this is you" glow
  const ag = ctx.createRadialGradient(x, y, 4, x, y, s * 0.8);
  ag.addColorStop(0, col + '3c'); ag.addColorStop(0.7, col + '14'); ag.addColorStop(1, col + '00');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); ctx.fill();
  // jet exhaust under the mon, flickering in the element color
  const fl = 1 + 0.35 * Math.sin(G.time * 26) + 0.18 * Math.sin(G.time * 57);
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
  // ---- the pilot itself, with a pseudo-3D treatment: a soft drop shadow
  // below-right, an element-colored rim light behind, and — when firing —
  // a real ATTACK animation: the mon lunges nose-up with squash & stretch
  // and flashes from within, like a battle attack frame.
  const atk = Math.min(1, G.attackAnim);           // 1 at the shot, decays fast
  const lungeY = -9 * atk;                          // lunge upward into the shot
  const sclX = 1 - 0.09 * atk, sclY = 1 + 0.14 * atk; // stretch into the attack
  const img = getSprite(pil.id);
  const ok = img.complete && img.naturalWidth;
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
  else drawGlyph(ctx, pil.t, 0, 0, 14, col);
  ctx.shadowBlur = 0;
  if (flash && atk > 0.05) { // the attack flash — the mon lights up from within
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * atk;
    ctx.drawImage(flash, -s / 2, -s / 2, s, s);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // ---- held items orbit the pilot. One badge per PATH/stack category keeps
  // the build fantasy without allowing 24 separate icons to bury the pilot.
  // The small count preserves the exact progression information.
  {
    const badges = [];
    for (const pk of PATH_KEYS) {
      const lvl = pathLvl(pk);
      if (lvl) badges.push({ icon: PATHS[pk].tiers[lvl - 1].icon, color: PATHS[pk].color, count: lvl });
    }
    for (const si of STACK_ITEMS) {
      const n = (G.stacks && G.stacks[si.key]) || 0;
      if (n) badges.push({ icon: si.icon, color: si.color, count: n });
    }
    const maxBadges = IS_TOUCH ? 5 : 6;
    const shown = badges.slice(0, maxBadges);
    const extra = Math.max(0, badges.length - shown.length);
    if (shown.length) {
      const orbitR = s * 0.68 + 10;
      for (let i = 0; i < shown.length; i++) {
        const a2 = (i / shown.length) * Math.PI * 2 + G.time * 0.55;
        const bx2 = x + Math.cos(a2) * orbitR;
        const by2 = y + Math.sin(a2) * orbitR * 0.55; // flattened ring = orbit depth
        const behind = Math.sin(a2) < 0; // top half of the ring passes BEHIND
        ctx.save();
        ctx.globalAlpha = behind ? 0.45 : 0.95;
        ctx.beginPath(); ctx.arc(bx2, by2, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,12,28,0.85)'; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = shown[i].color; ctx.stroke();
        drawGlyph(ctx, shown[i].icon, bx2, by2, 3.8, shown[i].color);
        if (shown[i].count > 1) {
          ctx.font = '900 6.5px Orbitron, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(String(shown[i].count), bx2 + 6, by2 + 6);
        }
        ctx.restore();
      }
      if (extra > 0) {
        ctx.font = '900 9px Orbitron, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd54f';
        ctx.fillText('+' + extra, x + orbitR + 14, y);
      }
    }
  }
  // muzzle flash at the nose, in the element color
  if (G.muzzle > 0) {
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
  if (G.heat > 0.02 || G.overheat > 0) {
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
  const hull = HULLS[G.starter] || ['#e3f2fd', '#64b5f6', '#1565c0'];
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
// (flame / water jet / razor leaf / lightning), its COLOR is the CURRENT
// element — a Charmeleon riding a grass element shoots green fire.
// Rendered modern: every bolt gets a long additive light-trail, a hot white
// core, and layered glow drawn in 'lighter' so shots feel like energy.
function drawTypedBolt(L) {
  const col = TYPE_COLORS[L.element] || '#80d8ff';
  const t = G.time;
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
    // ember sparks peeling off the tail
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = col;
    for (let e = 0; e < 2; e++) {
      const ex = L.x + Math.sin(t * (23 + e * 9) + L.y * 0.2 + e * 2) * (4 + e * 3);
      ctx.beginPath(); ctx.arc(ex, L.y + h * (0.5 + e * 0.18), 2.4 - e * 0.8, 0, Math.PI * 2); ctx.fill();
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
    if (pu.p.key === 'element') {
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
    } else {
      // power-up capsule: gradient body, glass highlight, white glyph
      const col = pu.p.color;
      ctx.shadowColor = col; ctx.shadowBlur = 13 + 4 * Math.sin(G.time * 4 + pu.rot);
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
      ctx.fillText('CATCH!', pu.x, pu.y - 34);
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

// transient tutorial hint: shows until you've fired a few shots.
// on touch it points at the FIRE button instead of the paddle
// ONE contextual hint at a time, in a control-safe zone: on touch the pill
// sits well ABOVE the button row and the ship — it never competes with
// MEGA/FIRE/CHARGE or covers the pilot
function drawShootHint() {
  // Stage, trial, power-up, and evolution announcements own the centre lane.
  // Tutorials wait their turn instead of stacking a second banner over them.
  if (G.announce) return;
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
  if (G.state !== 'play' || G.shotsFired >= 3 || G.playT > 20) return;
  // CLASSIC has no blaster until it's earned — don't prompt the player to shoot
  if (G.mode === 'classic' && !blasterArmed()) return;
  const a = Math.min(1, G.playT / 0.6) * (0.55 + 0.35 * Math.sin(G.time * 5));
  const text = G.mode === 'junkie'
    ? (IS_TOUCH ? (SETTINGS.autoFire ? 'AUTO-FIRE ON · HOLD FIRE = BIG ATTACK' : 'TAP TO ATTACK · HOLD = BIG ATTACK') : 'HOLD CLICK — RIGHT-CLICK/SHIFT CHARGES AN ATTACK')
    : G.mode === 'blaster'
      ? (IS_TOUCH ? (SETTINGS.autoFire ? 'AUTO-FIRE ON · HOLD FIRE = CHARGE SHOT' : 'TAP TO FIRE · HOLD = CHARGE SHOT') : 'CLICK — FIRE · RIGHT-CLICK OR SHIFT — CHARGE SHOT')
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
function drawHUD() {
  const g = ctx.createLinearGradient(0, 0, 0, 56);
  g.addColorStop(0, 'rgba(5,8,25,0.92)'); g.addColorStop(1, 'rgba(5,8,25,0.4)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 56);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(W, 56); ctx.stroke();

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
    const tag = hudElem
      ? (G.ballElement
        ? el.toUpperCase() + ' TYPE · ' + Math.max(1, Math.ceil(G.ballElementT)) + 's'
        : el.toUpperCase() + ' TYPE · BASE')
      : el.toUpperCase() + ' BALL';
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
  ctx.textAlign = 'center';
  const narrow = W < 560; // phones: wave title drops to the second HUD row
  ctx.font = `900 ${Math.min(16, W / 30)}px Orbitron, sans-serif`;
  ctx.fillStyle = '#e3f2fd';
  const gen = genFor(G.level);
  const stg = stageIdx(G.level);
  const waveY = narrow ? 46 : (G.modifier ? 22 : 28);
  const waveText = (G.trial ? 'TRIAL · ' : '') + gen.name + ' ' + (stg + 1) + '/3 · ' + STAGE_NAMES[stg];
  ctx.fillText(waveText, W / 2, waveY);
  if (G.modifier && !narrow) {
    ctx.font = '700 10px Orbitron, sans-serif';
    ctx.fillStyle = G.modifier.color;
    drawGlyph(ctx, G.modifier.icon, W / 2 - ctx.measureText(G.modifier.name).width / 2 - 12, 42, 6, G.modifier.color);
    ctx.fillText(G.modifier.name, W / 2 + 4, 42);
  }
  drawLifeRing();
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
    ctx.fillText(chip.t == null ? 'x' + chip.tier : (romanTier(chip.tier) || '·'), cx2 + 29, cy - 5);
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
      ctx.fillText(G.megaT > 0 ? 'MEGA!' : ready ? 'MEGA READY — E' : 'MEGA', mx, my - 12);
      roundRect(mx, my - 4, mw, mh, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
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
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // FIRE — absent in CLASSIC until the blaster is earned (touchButtons). In the
  // shooter modes this one pad also CHARGES: holding winds up a big
  // shot, shown here as a cyan ring filling inside the heat arc.
  const hot = G.overheat > 0;
  const f = B.fire;
  if (f) {
    const charging = G.charge > 0.02, full = G.charge >= 1;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = hot ? 'rgba(80,30,30,0.72)' : charging ? 'rgba(16,60,72,0.78)' : 'rgba(10,16,38,0.72)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hot ? '#ff5252' : charging ? (full ? '#e0ffff' : '#4dd0e1') : '#80d8ff';
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
    drawGlyph(ctx, charging ? 'warp' : 'target', f.x, f.y - 6, 13, hot ? '#ff8a80' : charging ? (full ? '#e0ffff' : '#b2ebf2') : '#b3e5fc');
    ctx.font = '900 9px Orbitron, sans-serif';
    ctx.fillStyle = hot ? '#ff8a80' : charging ? (full ? '#e0ffff' : '#80deea') : '#b3e5fc';
    ctx.fillText(hot ? 'HOT!' : charging ? 'CHARGE' : (SETTINGS.autoFire && G.mode !== 'classic' ? 'AUTO' : 'FIRE'), f.x, f.y + 16);
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
  drawGlyph(ctx, 'mega', m.x, m.y - 4, 11, ready ? '#ffd54f' : '#b0bec5');
  ctx.font = '900 8px Orbitron, sans-serif';
  ctx.fillStyle = ready ? '#ffd54f' : '#90a4ae';
  ctx.fillText('MEGA', m.x, m.y + 13);
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
  ctx.fillText(text, W / 2, y);
}
function drawMenu() {
  if (menuPage === 'setup') { drawSetup(); return; }
  dim(0.55);
  const L = menuLayout();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title('POKÉMON', L.titleY, L.titleSize, '#ffd54f');
  title('INVADERS BREAKOUT', L.titleY + L.titleSize, L.titleSize * 0.5, '#e3f2fd');
  const maxW = W * 0.92;
  // one tagline only — the real tutorial happens in your first wave
  fitText(W < 560 ? 'CATCH POKÉMON ACROSS 9 REGIONS'
    : 'CATCH POKÉMON ACROSS 9 REGIONS · A LEGENDARY GUARDS EVERY THIRD WAVE',
    L.tagY, 12 * Math.max(0.85, L.s), '600', '#cfd8dc', maxW, "Verdana, system-ui, sans-serif");
  // First-run escape hatch from mode/starter/difficulty choice overload.
  // The full cards remain directly below for players who want to customize.
  {
    const q = L.quick, hovQ = inRect(mouseX, lastMouseY, q);
    ctx.save();
    ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = hovQ ? 24 : 12;
    roundRect(q.x, q.y, q.w, q.h, 12);
    const qg = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
    qg.addColorStop(0, hovQ ? '#fff3b0' : '#ffe082');
    qg.addColorStop(1, hovQ ? '#ffd54f' : '#f9a825');
    ctx.fillStyle = qg; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1b1305';
    ctx.font = `900 ${L.short ? 11 : 14}px Orbitron, sans-serif`;
    ctx.fillText('▶ QUICK START', q.x + q.w / 2, q.y + q.h * (L.short ? 0.5 : 0.38));
    if (!L.short) {
      ctx.font = bodyFont(9.5, 700);
      ctx.fillStyle = '#4a3506';
      ctx.fillText('RECOMMENDED · BRICK BREAKER · EASY · CHARMANDER', q.x + q.w / 2, q.y + q.h * 0.72, q.w - 18);
    }
    ctx.restore();
  }
  // the two headliner games as full-bleed pseudo-3D dioramas — Geodude
  // holds the brick-breaker world, Rayquaza rules the space one
  drawHeroPanel(MODES[0], L.card(0), 74, L);
  drawHeroPanel(MODES[1], L.card(1), 384, L);
  // the experimental third — a deliberately smaller chip
  {
    const m = MODES[2], eg = L.exp;
    const hov = inRect(mouseX, lastMouseY, eg);
    ctx.save();
    if (hov) { ctx.shadowColor = m.accent; ctx.shadowBlur = 16; }
    roundRect(eg.x, eg.y, eg.w, eg.h, 10);
    ctx.fillStyle = hov ? m.accent + '28' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]); // dashed border = "experimental"
    ctx.strokeStyle = hov ? m.accent : m.accent + '77';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.font = `900 ${L.short ? 10 : 12}px Orbitron, sans-serif`;
    ctx.fillStyle = hov ? m.accent : '#8fb8c0';
    ctx.fillText('⚗ ' + m.label + ' — EXPERIMENTAL MIX', eg.x + eg.w / 2, eg.y + eg.h * (L.short ? 0.5 : 0.36), eg.w - 16);
    if (!L.short) {
      ctx.font = bodyFont(9.5, 600);
      ctx.fillStyle = hov ? '#cfd8dc' : '#78909c';
      ctx.fillText(m.lines[0], eg.x + eg.w / 2, eg.y + eg.h * 0.72, eg.w - 16);
    }
    ctx.restore();
  }
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
  // footer: pokédex + settings — trial now lives with each game's setup page
  const db = dexBtnGeom();
  ctx.textAlign = 'center';
  const rowFont = `700 ${L.short ? 11 : 12}px Orbitron, sans-serif`;
  for (const [g, label, colBase] of [
    [db, '◓ POKÉDEX ' + DEX.size, '#90a4ae'],
    [L.adv, '⚙ SETTINGS', '#78909c'],
  ]) {
    ctx.font = rowFont;
    ctx.fillStyle = inRect(mouseX, lastMouseY, g) ? '#ffd54f' : colBase;
    ctx.fillText(label, g.x + g.w / 2, g.y + g.h / 2, g.w - 6);
  }
  if (advOpen) drawAdvanced();
  if (trialOpen) drawTrial();
}
// a headline game as a pseudo-3D diorama: extruded slab, its own sky,
// a perspective floor grid, and a BIG breathing Pokémon grounded by a
// floor shadow — Geodude for the brick world, Rayquaza for space
function drawHeroPanel(m, cg, monId, L) {
  const hov = inRect(mouseX, lastMouseY, cg);
  const junk = m.key !== 'classic';
  const lift = hov ? 4 : 0;
  const x = cg.x, y = cg.y - lift, w = cg.w, h = cg.h;
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
  else { g.addColorStop(0, '#0a1a30'); g.addColorStop(0.55, '#173a52'); g.addColorStop(1, '#1d5a46'); }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // perspective floor grid — the cheap 3D read
  const horizon = y + h * 0.68, vpx = x + w / 2;
  ctx.strokeStyle = junk ? 'rgba(171,71,188,0.35)' : 'rgba(102,187,106,0.32)';
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(vpx + i * w * 0.022, horizon);
    ctx.lineTo(vpx + i * w * 0.24, y + h);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const t = i / 4.2, gy = horizon + (y + h - horizon) * t * t;
    ctx.globalAlpha = 0.55 - t * 0.35;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // glowing horizon line
  ctx.strokeStyle = junk ? 'rgba(213,134,255,0.55)' : 'rgba(126,224,138,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, horizon); ctx.lineTo(x + w, horizon); ctx.stroke();
  if (junk) {
    // twinkling starfield + a distant ringed planet
    for (let i = 0; i < 26; i++) {
      const sx2 = x + ((i * 73.7 + 11) % w), sy2 = y + ((i * 41.3 + 7) % (horizon - y - 8));
      const tw = 0.5 + 0.5 * Math.sin(G.time * 2 + i * 1.7);
      ctx.fillStyle = `rgba(255,255,255,${0.12 + tw * 0.3})`;
      ctx.fillRect(sx2, sy2, 2, 2);
    }
    const px2 = x + w * 0.82, py2 = y + h * 0.2, pr = Math.min(w, h) * 0.07;
    ctx.fillStyle = 'rgba(120,80,200,0.8)';
    ctx.beginPath(); ctx.arc(px2, py2, pr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(213,134,255,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px2, py2, pr * 1.7, pr * 0.5, -0.3, 0, Math.PI * 2); ctx.stroke();
  } else {
    // a glossy brick arch over the mon + the ball mid-flight
    const bw2 = Math.min(60, w * 0.16), bh2 = bw2 * 0.42;
    const arc = [[-1.6, -0.1], [-0.55, -0.32], [0.55, -0.32], [1.6, -0.1]];
    for (let i = 0; i < arc.length; i++) {
      const bx2 = x + w / 2 + arc[i][0] * bw2 * 1.25 - bw2 / 2;
      const by2 = y + h * 0.24 + arc[i][1] * h * 0.3;
      roundRect(bx2, by2, bw2, bh2, 4);
      ctx.fillStyle = ['#ef9a9a', '#90caf9', '#ffe082', '#a5d6a7'][i] + 'cc';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(bx2 + 2, by2 + 2, bw2 - 4, bh2 * 0.3);
    }
    const ballA = G.time * 1.3;
    const bx3 = x + w / 2 + Math.sin(ballA) * w * 0.3, by3 = y + h * 0.14 + Math.abs(Math.cos(ballA)) * h * 0.07;
    ctx.fillStyle = '#e3f2fd';
    ctx.shadowColor = '#90caf9'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(bx3, by3, Math.min(7, w * 0.02), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // THE POKÉMON — big, breathing, grounded by a floor shadow
  const ms = Math.min(w, h) * (junk ? 0.66 : 0.52);
  const bob = Math.sin(G.time * (junk ? 1.3 : 2.1) + (junk ? 1 : 0)) * h * 0.016;
  const mx = x + w / 2, my = y + h * (junk ? 0.4 : 0.45) + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(mx, horizon + h * 0.05, Math.max(10, ms * 0.32 - bob * 2.5), ms * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  const img = getSprite(monId);
  if (img.complete && img.naturalWidth) {
    const sil = getSilhouette(monId, '#04060e');
    if (sil) { ctx.globalAlpha = 0.5; ctx.drawImage(sil, mx - ms / 2 + ms * 0.05, my - ms / 2 + ms * 0.07, ms, ms); ctx.globalAlpha = 1; }
    if (hov) {
      const rim = getSilhouette(monId, m.accent);
      if (rim) { ctx.globalAlpha = 0.5; ctx.drawImage(rim, mx - ms / 2 - 2, my - ms / 2 - 2, ms + 4, ms + 4); ctx.globalAlpha = 1; }
    }
    ctx.drawImage(img, mx - ms / 2, my - ms / 2, ms, ms);
  }
  // glass gloss sweep
  const gl = ctx.createLinearGradient(x, y, x + w * 0.55, y + h * 0.55);
  gl.addColorStop(0, 'rgba(255,255,255,0.1)');
  gl.addColorStop(0.45, 'rgba(255,255,255,0.02)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(x, y, w, h);
  // label band along the bottom
  const bandH = Math.max(42, h * 0.24);
  const bg2 = ctx.createLinearGradient(0, y + h - bandH, 0, y + h);
  bg2.addColorStop(0, 'rgba(4,7,16,0)');
  bg2.addColorStop(0.45, 'rgba(4,7,16,0.8)');
  bg2.addColorStop(1, 'rgba(4,7,16,0.94)');
  ctx.fillStyle = bg2;
  ctx.fillRect(x, y + h - bandH, w, bandH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.min(26, w / 11)}px Orbitron, sans-serif`;
  ctx.fillStyle = hov ? '#fff' : m.accent;
  ctx.fillText(m.label, x + w / 2, y + h - bandH * 0.58, w - 20);
  ctx.font = bodyFont(Math.min(11, w / 30), 600);
  ctx.fillStyle = hov ? '#e3f2fd' : '#90a4ae';
  ctx.fillText(m.lines.join(' · '), x + w / 2, y + h - bandH * 0.22, w - 24);
  ctx.restore(); // unclip
  ctx.shadowColor = m.accent; ctx.shadowBlur = hov ? 30 : 14;
  roundRect(x, y, w, h, 18);
  ctx.lineWidth = hov ? 3 : 2;
  ctx.strokeStyle = hov ? m.accent : m.accent + 'aa';
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}
// small vector icons that give each mode card an identity at a glance —
// pure strokes/fills, cheap enough to draw live (menu only, few per frame)
function drawModeIcon(key, x, y, r, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = Math.max(1.5, r * 0.13);
  if (key === 'classic') { // brick row + ball + paddle
    const bw = r * 0.85, bh = r * 0.42, g = r * 0.14;
    for (let i = -1; i <= 1; i++) {
      roundRect(i * (bw + g) - bw / 2, -r, bw, bh, 2);
      ctx.globalAlpha = 0.85; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.26, 0, Math.PI * 2); ctx.fill();
    roundRect(-r * 0.7, r * 0.75, r * 1.4, r * 0.3, r * 0.15); ctx.fill();
  } else { // junkie: a little ship with wing swept lines
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.75, r * 0.65);
    ctx.lineTo(0, r * 0.25);
    ctx.lineTo(-r * 0.75, r * 0.65);
    ctx.closePath();
    ctx.globalAlpha = 0.9; ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); // exhaust flame, tucked into the tail notch
    ctx.moveTo(-r * 0.16, r * 0.42); ctx.lineTo(0, r * 0.95); ctx.lineTo(r * 0.16, r * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// PAGE 2 — setup for the chosen mode: starter, difficulty, then START
function drawSetup() {
  dim(0.55);
  const L = setupLayout();
  const mode = MODES.find(m => m.key === SETTINGS.mode) || MODES[0];
  const maxW = W * 0.92;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // header: the game you picked, in its color
  title(mode.label, L.headY, L.headSize, mode.accent);
  if (!L.short) {
    ctx.font = bodyFont(11, 600);
    ctx.fillStyle = '#90a4ae';
    ctx.fillText(mode.lines.join(' · '), W / 2, L.headY + L.headSize * 0.85 + 8, maxW);
  }
  // ‹ back to mode select
  {
    const bb = L.back, hov = inRect(mouseX, lastMouseY, bb);
    ctx.font = '700 13px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = hov ? '#ffd54f' : '#90a4ae';
    ctx.fillText('‹ BACK', bb.x + 8, bb.y + bb.h / 2);
    ctx.textAlign = 'center';
  }
  // starter Pokémon — a partner whose paddle ability grows all game
  // (in SPACE JUNKIE the starter IS the ship, so say so)
  ctx.font = `700 ${L.narrow ? 15 : 13}px Orbitron, sans-serif`;
  ctx.fillStyle = '#90a4ae';
  ctx.fillText(SETTINGS.mode === 'junkie' ? 'CHOOSE YOUR PILOT' : 'STARTER POKÉMON', W / 2, L.startLabelY);
  for (let i = 0; i < STARTERS.length; i++) {
    const st = STARTERS[i], pg = L.starter(i), sel = SETTINGS.starter === st.key;
    const hov = inRect(mouseX, lastMouseY, pg);
    const col = st.key === 'none' ? TYPE_COLORS.electric : TYPE_COLORS[st.key];
    const mon = STARTER_MON[st.key];
    const monCopy = mon ? starterModeCopy(st.key, SETTINGS.mode, 1) : null;
    const dy = Math.min(11, pg.h * 0.13); // name / ability vertical split, scales with card
    ctx.save();
    if (sel) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    roundRect(pg.x, pg.y, pg.w, pg.h, 12);
    ctx.fillStyle = sel ? col + '38' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = sel ? 2.5 : 1;
    ctx.strokeStyle = sel ? col : 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (mon) {
      const img = getSprite(mon.ids[0]);
      const sp = Math.min(60, pg.h * 0.66);
      const spx = pg.x + Math.max(6, pg.w * 0.05);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, spx, pg.y + pg.h / 2 - sp / 2, sp, sp);
      else drawGlyph(ctx, st.key, spx + sp / 2, pg.y + pg.h / 2, sp * 0.28, col);
      const txL = spx + sp + 6;           // text column starts right of the sprite
      const txC = txL + (pg.x + pg.w - 8 - txL) / 2; // its centre
      const tw = pg.x + pg.w - 8 - txL;   // its available width
      ctx.font = `900 ${Math.min(17, pg.w / 8.5)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel ? '#fff' : '#cfd8dc';
      ctx.fillText(st.label, txC, pg.y + pg.h / 2 - dy, tw);
      ctx.font = `900 ${Math.min(12, pg.w / 12)}px Orbitron, sans-serif`;
      ctx.fillStyle = col;
      ctx.fillText(monCopy.ability, txC, pg.y + pg.h / 2 + dy, tw);
    } else {
      // "no partner" IS Pikachu — it takes the controls in SPACE JUNKIE and
      // stands in for the free-agent pick everywhere, so show the mon itself
      const img = getSprite(25);
      const sp = Math.min(60, pg.h * 0.66);
      const spx = pg.x + Math.max(6, pg.w * 0.05);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, spx, pg.y + pg.h / 2 - sp / 2, sp, sp);
      else drawGlyph(ctx, 'electric', spx + sp / 2, pg.y + pg.h / 2, sp * 0.28, col);
      const txL = spx + sp + 6;
      const txC = txL + (pg.x + pg.w - 8 - txL) / 2;
      const tw = pg.x + pg.w - 8 - txL;
      ctx.font = `900 ${Math.min(17, pg.w / 8.5)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel ? '#fff' : '#cfd8dc';
      ctx.fillText('PIKACHU', txC, pg.y + pg.h / 2 - dy, tw);
      ctx.font = `900 ${Math.min(12, pg.w / 12)}px Orbitron, sans-serif`;
      ctx.fillStyle = SETTINGS.mode === 'junkie' ? col : '#78909c';
      ctx.fillText(SETTINGS.mode === 'junkie' ? 'STATIC' : 'NO ABILITY', txC, pg.y + pg.h / 2 + dy, tw);
    }
    ctx.restore();
  }
  // what the SELECTED partner actually does — full-size, readable
  {
    const selMon = STARTER_MON[SETTINGS.starter];
    const selCopy = selMon ? starterModeCopy(SETTINGS.starter, SETTINGS.mode, 1) : null;
    const selCol = selMon ? TYPE_COLORS[SETTINGS.starter] : '#90a4ae';
    const narrowM = W < 560;
    const junkie = SETTINGS.mode === 'junkie';
    const BODY = "Verdana, system-ui, sans-serif";
    if (selMon) {
      fitText(selCopy.ability + ' — ' + selCopy.tier, L.starterInfoY, 12 * Math.max(0.85, L.s), '700', selCol, maxW, BODY);
      if (!L.short) fitText(narrowM ? 'EVOLVES AT REGIONS 4 & 7 — ABILITY GROWS'
        : (junkie ? 'YOUR STARTER FLIES THE SHIP' : 'YOUR PARTNER RIDES THE PADDLE') + ' · EVOLVES AT REGIONS 4 & 7 — THE ABILITY GROWS EACH TIME',
        L.starterInfoY + 19, 10 * Math.max(0.85, L.s), '500', '#90a4ae', maxW, BODY);
    } else if (junkie) {
      fitText(narrowM ? 'NO PICK — PIKACHU FLIES THE SHIP' : 'NO PICK — PIKACHU TAKES THE CONTROLS AND FIRES ITS OWN ATTACK',
        L.starterInfoY, 12 * Math.max(0.85, L.s), '700', '#f9cc3d', maxW, BODY);
      if (!L.short) fitText('EVOLVES AT REGIONS 4 & 7 — THE ATTACK GROWS EACH TIME',
        L.starterInfoY + 19, 10 * Math.max(0.85, L.s), '500', '#90a4ae', maxW, BODY);
    } else if (SETTINGS.mode === 'blaster') {
      fitText(narrowM ? 'NO PARTNER — NEUTRAL DEFENSE' : 'NO PARTNER — PLAIN PADDLE · NO DEFENSIVE TYPE',
        L.starterInfoY, 12 * Math.max(0.85, L.s), '700', '#90a4ae', maxW, BODY);
      if (!L.short) fitText('POWER-UPS STILL ALTER YOUR WEAPON MID-RUN',
        L.starterInfoY + 19, 10 * Math.max(0.85, L.s), '500', '#78909c', maxW, BODY);
    } else {
      fitText(narrowM ? 'NO PARTNER — PLAIN PADDLE' : 'NO PARTNER — A PLAIN PADDLE AND NO SERVE ELEMENT',
        L.starterInfoY, 12 * Math.max(0.85, L.s), '700', '#90a4ae', maxW, BODY);
      if (!L.short) fitText(narrowM ? 'POWER-UPS STILL CHANGE BALL TYPE' : 'POWER-UPS AND ELEMENT ORBS STILL CHANGE YOUR BALL TYPE MID-RUN',
        L.starterInfoY + 19, 10 * Math.max(0.85, L.s), '500', '#78909c', maxW, BODY);
    }
  }
  // difficulty presets
  ctx.font = `700 ${L.narrow ? 15 : 13}px Orbitron, sans-serif`;
  ctx.fillStyle = '#90a4ae';
  ctx.fillText('DIFFICULTY', W / 2, L.chipsLabelY);
  const keys = Object.keys(PRESETS);
  for (let i = 0; i < keys.length; i++) {
    const pg = presetGeom(i), sel = SETTINGS.preset === keys[i];
    const hov = inRect(mouseX, lastMouseY, pg);
    ctx.save();
    if (sel) { ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 16; }
    roundRect(pg.x, pg.y, pg.w, pg.h, 12);
    ctx.fillStyle = sel ? 'rgba(255,213,79,0.22)' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = sel ? 2.5 : 1;
    ctx.strokeStyle = sel ? '#ffd54f' : 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `900 ${Math.min(20, pg.w / 8)}px Orbitron, sans-serif`;
    ctx.fillStyle = sel ? '#ffd54f' : '#cfd8dc';
    ctx.fillText(PRESETS[keys[i]].label, pg.x + pg.w / 2, pg.y + pg.h / 2 + 1, pg.w - 12);
    ctx.restore();
  }
  // start button — the one big obvious thing on the screen
  const b = startBtnGeom();
  const hover = inRect(mouseX, lastMouseY, b);
  ctx.save();
  ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = hover ? 28 : 16;
  roundRect(b.x, b.y, b.w, b.h, 14);
  const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  bg.addColorStop(0, hover ? '#ffe082' : '#ffd54f'); bg.addColorStop(1, '#f9a825');
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `900 ${L.short ? 15 : L.narrow ? 24 : 20}px Orbitron, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a1205';
  ctx.fillText((typeof RUN_CKPT !== 'undefined' && RUN_CKPT ? 'NEW JOURNEY' : 'START JOURNEY'), b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 24);
  ctx.restore();
  // per-game TRIAL — jump to any stage OF THIS MODE (score/dex not saved)
  {
    const tb = L.trial, hovT = inRect(mouseX, lastMouseY, tb);
    ctx.font = `700 ${L.short ? 11 : 13}px Orbitron, sans-serif`;
    ctx.fillStyle = hovT ? '#ffd54f' : '#80d8ff';
    ctx.fillText('▶ TRIAL — JUMP TO ANY ' + mode.label + ' STAGE', tb.x + tb.w / 2, tb.y + tb.h / 2, tb.w - 8);
  }
  if (trialOpen) drawTrial();
  if (advOpen) drawAdvanced();
}

// ---- ACT-BOUNDARY CEREMONY: the game's biggest beat. The partner pulses
// white faster and faster, whites out, and is REVEALED evolved — then the
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
    // accelerating white pulses build the tension, then the white-out
    const pulse = t < 1.9 ? Math.max(0, Math.sin(t * t * 5.5)) : 1;
    const whiteout = t >= 1.9 && t < 2.45;
    const grow = t < 1.9 ? 1 + t * 0.04 : whiteout ? 1.1 + (t - 1.9) * 0.55 : 1.12;
    const sz = ms * grow;
    const bob = Math.sin(G.time * 2) * 5;
    if (img.complete && img.naturalWidth) {
      ctx.save();
      ctx.translate(cx, cy + bob);
      if (whiteout) {
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
      ctx.fillText('WHAT? ' + c.evo.fromName + ' IS EVOLVING!', cx, cy + ms * 0.66);
    } else if (showNew) {
      title(c.evo.toName + '!', cy + ms * 0.62, Math.min(30, W / 16), col);
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
  // LEGENDARY stage → pick your gauntlet round (test just Mewtwo, or Mew)
  if (T.rounds) {
    const gsel = GENS[trialSel.region];
    const labels = ['FULL GAUNTLET', '★ ' + gsel.boss.n.toUpperCase(),
      gsel.gauntlet ? '✦ ' + (NAMES[gsel.gauntlet.myth[0]] || 'MYTHICAL').toUpperCase() : '✦ MYTHICAL'];
    for (let i = 0; i < 3; i++) {
      const rr2 = T.round(i), sel2 = trialSel.round === i;
      const hov2 = inRect(mouseX, lastMouseY, rr2);
      roundRect(rr2.x, rr2.y, rr2.w, rr2.h, 9);
      ctx.fillStyle = sel2 ? 'rgba(255,128,171,0.22)' : hov2 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.lineWidth = sel2 ? 2 : 1;
      ctx.strokeStyle = sel2 ? '#ff80ab' : 'rgba(255,255,255,0.22)';
      ctx.stroke();
      ctx.font = `900 ${Math.min(10, rr2.w / 11)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel2 ? '#ff80ab' : '#cfd8dc';
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
  ctx.fillText('ADVANCED SETTINGS', A.px + A.pw / 2, A.py + 30);
  // close ✕
  const cb = A.close;
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cb.x + 10, cb.y + 10); ctx.lineTo(cb.x + cb.w - 10, cb.y + cb.h - 10);
  ctx.moveTo(cb.x + cb.w - 10, cb.y + 10); ctx.lineTo(cb.x + 10, cb.y + cb.h - 10);
  ctx.stroke();
  // sliders
  for (let i = 0; i < SLIDERS.length; i++) {
    const s = SLIDERS[i], gm = A.slider(i);
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
  for (let i = 0; i < TOGGLES.length; i++) {
    const t = TOGGLES[i], r = A.toggle(i);
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
  const total = GENS.reduce((n, g) => n + regionRoster(g).length, 0);
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

// Modal atlas for the entire authored tree. Desktop gets five readable path
// columns with full descriptions; narrow/short screens get five rows with all
// four tier nodes still visible at once. Nothing is hidden behind hover.
function drawFullUpgradeTree() {
  const T = upgradeTreeLayout(), p = T.panel;
  ctx.save();
  ctx.globalAlpha = 1;
  dim(0.74);
  ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = 24;
  roundRect(p.x, p.y, p.w, p.h, 18);
  ctx.fillStyle = 'rgba(6,10,27,0.985)'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(128,216,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.min(22, p.w / 22)}px Orbitron, sans-serif`;
  ctx.fillStyle = '#e3f2fd';
  ctx.fillText('UPGRADE TREE', p.x + p.w / 2, p.y + 24);
  ctx.font = '600 9px Orbitron, sans-serif'; ctx.fillStyle = '#80d8ff';
  ctx.fillText('EACH ROW BUILDS LEFT → RIGHT · ' + (IS_TOUCH ? 'TAP' : 'CLICK') + ' ANY UPGRADE FOR DETAILS', p.x + p.w / 2, p.y + 40, p.w - 90);
  // clamp the stored selection in case the roster/paths changed
  treeSel.pi = Math.max(0, Math.min(PATH_KEYS.length - 1, treeSel.pi | 0));
  treeSel.ti = Math.max(0, Math.min(3, treeSel.ti | 0));

  const small = T.compact;
  for (let pi = 0; pi < PATH_KEYS.length; pi++) {
    const pk = PATH_KEYS[pi], P = PATHS[pk], lvl = pathLvl(pk);
    // row label: path name + role, on the left
    const lb = T.label(pi);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${small ? 9 : 12}px Orbitron, sans-serif`; ctx.fillStyle = P.color;
    wrapText(P.name, lb.w).slice(0, 2).forEach((ln, li) => ctx.fillText(ln, lb.x, lb.y + lb.h / 2 - (small ? 8 : 10) + li * (small ? 10 : 13), lb.w));
    if (!small) { ctx.font = '600 7.5px Orbitron, sans-serif'; ctx.fillStyle = '#90a4ae'; ctx.fillText(P.role, lb.x, lb.y + lb.h / 2 + 16, lb.w); }
    // connector rail behind the row — brightens up to the owned tier
    for (let ti = 0; ti < 3; ti++) {
      const a = T.node(pi, ti), b = T.node(pi, ti + 1);
      ctx.strokeStyle = ti + 1 <= lvl ? P.color : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = ti + 1 <= lvl ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.lineTo(b.x, b.y + b.h / 2); ctx.stroke();
    }
    // the four tier tiles, left → right
    for (let ti = 0; ti < 4; ti++) {
      const tier = P.tiers[ti], owned = ti < lvl, next = ti === lvl;
      const sel = treeSel.pi === pi && treeSel.ti === ti;
      const n = T.node(pi, ti);
      ctx.save();
      if (sel) { ctx.shadowColor = P.color; ctx.shadowBlur = 18; }
      roundRect(n.x, n.y, n.w, n.h, 9);
      ctx.fillStyle = sel ? mixHex(P.color, '#0a0e1c', 0.55) : owned ? P.color + '26' : next ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.lineWidth = sel ? 2.5 : next ? 1.8 : 1;
      ctx.strokeStyle = sel ? '#fff' : owned ? P.color : next ? P.color + 'cc' : 'rgba(255,255,255,0.12)';
      ctx.stroke();
      ctx.shadowBlur = 0;
      // polished badge icon
      const iconR = Math.max(9, Math.min(small ? 13 : 17, n.h * 0.24));
      const iconCX = small ? n.x + n.w / 2 : n.x + 6 + iconR;
      const iconCY = small ? n.y + iconR + 6 : n.y + n.h * 0.32;
      const badge = iconBadge(tier.icon, P.color, Math.round(iconR), (owned || next || sel) ? 'lit' : 'dim');
      ctx.globalAlpha = owned || next || sel ? 1 : 0.7;
      ctx.drawImage(badge, iconCX - badge.width / 2, iconCY - badge.height / 2);
      ctx.globalAlpha = 1;
      // name — brighter + bolder when selected
      const nameCol = sel ? '#fff' : owned ? P.color : next ? '#e8eef6' : '#8595a0';
      const nm = (ti === 3 ? '★ ' : '') + (G.mode === 'junkie' ? JUNKIE_ITEMS[pk][ti] : tier.name);
      if (small) {
        ctx.textAlign = 'center';
        ctx.font = `${sel ? 900 : 800} ${sel ? 7.5 : 7}px Orbitron, sans-serif`; ctx.fillStyle = nameCol;
        wrapText(nm, n.w - 6).slice(0, 2).forEach((ln, li) => ctx.fillText(ln, n.x + n.w / 2, iconCY + iconR + 9 + li * 8, n.w - 4));
      } else {
        const tx = n.x + 12 + iconR * 2, tw = n.x + n.w - 8 - tx;
        ctx.textAlign = 'left';
        ctx.font = `${sel ? 900 : 800} ${sel ? 10 : 9.5}px Orbitron, sans-serif`; ctx.fillStyle = nameCol;
        ctx.fillText(nm, tx, n.y + 15, tw);
        // the description text, right in the box (bolder/brighter when selected)
        ctx.font = bodyFont(sel ? 8.5 : 8, sel ? 700 : 600);
        ctx.fillStyle = sel ? '#eef3fa' : owned || next ? '#aeb9c8' : '#6b7684';
        const maxLines = n.h >= 78 ? 3 : 2;
        wrapText(tierDesc(pk, ti), tw).slice(0, maxLines).forEach((ln, li) => ctx.fillText(ln, tx, n.y + 30 + li * 11, tw));
        // status tag, bottom-right
        ctx.textAlign = 'right'; ctx.font = '800 6.5px Orbitron, sans-serif';
        ctx.fillStyle = owned ? P.color : next ? '#cfd8dc' : '#546e7a';
        ctx.fillText(owned ? 'OWNED' : next ? 'NEXT' : 'TIER ' + (ti + 1), n.x + n.w - 8, n.y + n.h - 8);
      }
      ctx.restore();
    }
  }
  // ---- detail panel: explain the selected node in full, readable text ----
  drawTreeDetail(T);
  const cb = T.close;
  roundRect(cb.x, cb.y, cb.w, cb.h, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '900 17px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#cfd8dc';
  ctx.fillText('×', cb.x + cb.w / 2, cb.y + cb.h / 2 + 1);
  ctx.restore();
}
// the tap-to-inspect detail card at the bottom of the full tree
function drawTreeDetail(T) {
  const d = T.detail;
  const pk = PATH_KEYS[treeSel.pi], P = PATHS[pk], lvl = pathLvl(pk), ti = treeSel.ti;
  const tier = P.tiers[ti], owned = ti < lvl, next = ti === lvl;
  roundRect(d.x, d.y, d.w, d.h, 12);
  ctx.fillStyle = 'rgba(12,18,40,0.96)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = P.color + 'aa'; ctx.stroke();
  const pad = 16;
  // status pill (right)
  const status = owned ? 'OWNED' : next ? 'NEXT UP' : 'LOCKED · TIER ' + (ti + 1);
  const statusCol = owned ? P.color : next ? '#fff' : '#8595a0';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.font = '800 9px Orbitron, sans-serif'; ctx.fillStyle = statusCol;
  ctx.fillText(status, d.x + d.w - pad, d.y + 14, d.w * 0.4);
  // icon + path + tier name (left)
  const db = iconBadge(tier.icon, P.color, 17, 'lit');
  ctx.drawImage(db, d.x + pad, d.y + 8, 34, 34);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '800 9.5px Orbitron, sans-serif'; ctx.fillStyle = P.color;
  ctx.fillText(P.name + ' · TIER ' + (ti + 1) + '/4' + (ti === 3 ? ' · CAPSTONE' : ''), d.x + pad + 42, d.y + 12, d.w - 130);
  ctx.font = `900 ${Math.min(19, d.w / 22)}px Orbitron, sans-serif`; ctx.fillStyle = '#fff';
  ctx.fillText((G.mode === 'junkie' ? JUNKIE_ITEMS[pk][ti] : tier.name), d.x + pad + 42, d.y + 26, d.w - 130);
  // the full description — the whole point: readable, wrapped
  ctx.font = bodyFont(Math.min(13, d.w / 34), 600); ctx.fillStyle = '#cfd8ea';
  const descTop = d.y + 52;
  wrapText(tierDesc(pk, ti), d.w - pad * 2).slice(0, 3).forEach((line, li) =>
    ctx.fillText(line, d.x + pad, descTop + li * 17, d.w - pad * 2));
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

function drawOverlays() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (G.state === 'menu') { drawMenu(); }
  else if (G.state === 'dex') { drawDex(); }
  else if (G.state === 'serve' && !paused) {
    // The stage card owns the centre first; controls arrive immediately after
    // it clears. This turns the opening into a sequence instead of a text pile.
    if (!G.announce) {
      pulse(IS_TOUCH ? 'TAP TO LAUNCH' : 'CLICK TO LAUNCH', H * 0.7);
      // interactive first-wave tutorial: contextual hints
      if (G.level === 1) {
        hintPill(IS_TOUCH ? 'DRAG ANYWHERE — MOVE PADDLE · SLIDE WHILE LAUNCHING TO AIM'
          : 'MOVE THE MOUSE — PADDLE FOLLOWS · SLIDE WHILE LAUNCHING TO AIM', H * 0.7 + 46);
        hintPill('GET THE BALL ABOVE THE ARMORED WALL — A GOLDEN NET KEEPS IT RALLYING UP THERE', H * 0.7 + 82, '#ffd54f');
      }
    }
  } else if (G.state === 'upgrade') {
    dim(0.55);
    const draftShort = H < 520;
    const wasBossStage = G.clearedStage === 2;
    const clearedGen = GENS[regionIdx(Math.max(1, G.level - 1))];
    const clearY = draftShort ? 36 : H * 0.16;
    title(wasBossStage ? clearedGen.name + ' CLEARED!' : 'STAGE CLEAR!', clearY, Math.min(draftShort ? 30 : 40, W / 12), wasBossStage ? clearedGen.accent : '#66bb6a');
    ctx.font = '700 15px Orbitron, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('+' + (300 + (G.clearedStage || 0) * 250) + ' BONUS', W / 2, clearY + (draftShort ? 28 : 34));
    if (stageIdx(G.level) === 0 && !draftShort) {
      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.fillStyle = genFor(G.level).accent;
      ctx.fillText('NEXT STOP: ' + genFor(G.level).name, W / 2, H * 0.16 + 62);
    }
    drawJourneyMap(clearY + (draftShort ? 56 : 86), draftShort || W < 560);
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
        ctx.fillText((G.mode === 'junkie' ? 'CHOOSE A HELD ITEM' : 'CHOOSE AN UPGRADE') +
          (IS_TOUCH ? ' — TAP A CARD TO INSPECT' : ' — INSPECT, THEN CONFIRM'), W / 2, headerY, W * 0.94);
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
        ctx.fillText(P.name + ' PATH · ' + P.role, W / 2, ny - 8, chainW);
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
          if (L.stacked) {
            blitBadge(c.stack.icon, r.x + 34, r.y + r.h / 2, 17, scol);
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
            blitBadge(c.stack.icon, r.x + r.w / 2, r.y + 39, 14, scol);
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
            blitBadge(c.stack.icon, r.x + r.w / 2, r.y + 72, 22, scol);
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
        const pips = (px2, py2) => {
          for (let d = 0; d < 4; d++) {
            ctx.beginPath(); ctx.arc(px2 - 21 + d * 14, py2, 4, 0, Math.PI * 2);
            ctx.fillStyle = d < c.tierIdx ? col : d === c.tierIdx ? '#fff' : 'rgba(255,255,255,0.16)';
            ctx.fill();
          }
        };
        if (L.stacked) { // phone: icon left, text right
          blitBadge(tier.icon, r.x + 34, r.y + r.h / 2, 18, col);
          ctx.textAlign = 'left';
          ctx.font = '900 9.5px Orbitron, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(c.path.name + ' · TIER ' + (c.tierIdx + 1) + '/4' + (isCap ? ' · CAPSTONE' : ''), r.x + 66, r.y + 16, r.w - 74);
          ctx.font = '900 15px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#fff';
          ctx.fillText(junkieTierName(c.pathKey, c.tierIdx), r.x + 66, r.y + 35, r.w - 74);
          ctx.font = bodyFont(11, 600);
          ctx.fillStyle = '#e0e7f0';
          wrapText(tierDesc(c.pathKey, c.tierIdx), r.w - 82).slice(0, 3).forEach((l, li) => ctx.fillText(l, r.x + 66, r.y + 54 + li * 13, r.w - 78));
        } else if (L.short) { // short landscape: compact vertical card
          ctx.textAlign = 'center';
          ctx.font = '900 8.5px Orbitron, sans-serif'; ctx.fillStyle = col;
          ctx.fillText(c.path.name + (isCap ? ' · CAP' : ''), r.x + r.w / 2, r.y + 12, r.w - 8);
          pips(r.x + r.w / 2, r.y + 25);
          blitBadge(tier.icon, r.x + r.w / 2, r.y + 48, 15, col);
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
          ctx.fillText(c.path.name + (isCap ? ' · CAPSTONE' : ' · TIER ' + (c.tierIdx + 1) + '/4'), r.x + r.w / 2, r.y + 22, r.w - 20);
          pips(r.x + r.w / 2, r.y + 40);
          blitBadge(tier.icon, r.x + r.w / 2, r.y + 74, 24, col);
          // the upgrade NAME — the headline
          ctx.font = '900 18px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#fff';
          ctx.fillText((isCap ? '★ ' : '') + junkieTierName(c.pathKey, c.tierIdx) + (isCap ? ' ★' : ''), r.x + r.w / 2, r.y + 112, r.w - 18);
          // what it DOES — big, high-contrast, the thing you actually read
          ctx.font = bodyFont(13, 600);
          ctx.fillStyle = '#e8eef6';
          wrapText(tierDesc(c.pathKey, c.tierIdx), r.w - 30).slice(0, 4).forEach((l, li) => ctx.fillText(l, r.x + r.w / 2, r.y + 140 + li * 18, r.w - 24));
          // subtle footer: what it leads to, then the pick prompt
          ctx.font = '600 9px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#78909c';
          ctx.fillText(isCap ? 'PATH COMPLETE' : '↑ NEXT: ' + junkieTierName(c.pathKey, c.tierIdx + 1), r.x + r.w / 2, r.y + r.h - 34, r.w - 16);
          ctx.fillStyle = sel ? '#a5d6a7' : hov ? '#e3f2fd' : '#607d8b';
          ctx.font = '800 11px Orbitron, sans-serif';
          ctx.fillText(sel ? (IS_TOUCH ? '✓ SELECTED — TAP CONFIRM' : '✓ SELECTED — ENTER CONFIRMS')
            : (IS_TOUCH ? 'TAP TO INSPECT' : 'INSPECT: CLICK OR PRESS ' + (i + 1)), r.x + r.w / 2, r.y + r.h - 15, r.w - 14);
        }
        ctx.restore();
      }
      // one reroll per draft — a dead hand shouldn't end the build
      const rr = L.reroll;
      const canRR = !G.rerolled;
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
      ctx.fillText(canRR ? (IS_TOUCH ? 'REROLL' : 'REROLL (R)') : 'REROLLED', rr.x + rr.w / 2, rr.y + rr.h / 2 + 1, rr.w - 10);
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
      const tr = L.tree, hovTR = inRect(mouseX, lastMouseY, tr);
      roundRect(tr.x, tr.y, tr.w, tr.h, 16);
      ctx.fillStyle = hovTR ? 'rgba(128,216,255,0.2)' : 'rgba(255,255,255,0.07)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = hovTR ? '#80d8ff' : 'rgba(255,255,255,0.35)'; ctx.stroke();
      ctx.font = '700 11px Orbitron, sans-serif'; ctx.fillStyle = hovTR ? '#e0f7ff' : '#80d8ff';
      ctx.fillText(IS_TOUCH ? 'FULL TREE' : 'FULL TREE (T)', tr.x + tr.w / 2, tr.y + tr.h / 2 + 1, tr.w - 12);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      if (upgradeTreeOpen) drawFullUpgradeTree();
    }
  } else if (G.state === 'ceremony') {
    drawCeremony();
  } else if (G.state === 'gameover') {
    dim(0.65);
    title('GAME OVER', H * 0.34, 52, '#ff5252');
    ctx.font = '700 24px Orbitron, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('SCORE  ' + G.score, W / 2, H * 0.46);
    ctx.font = '500 15px Orbitron, sans-serif';
    ctx.fillStyle = '#b0bec5';
    ctx.fillText('JOURNEY ENDED IN ' + genFor(G.level).name + '  ·  STAGE ' + (stageIdx(G.level) + 1) + '/3  ·  WAVE ' + G.level, W / 2, H * 0.52, W * 0.94);
    ctx.fillText('MAX COMBO x' + G.maxCombo + '  ·  BEST RALLY ×' + G.bestRally + '  ·  ' + G.caughtRun + ' CAUGHT  ·  POKÉDEX ' + DEX.size, W / 2, H * 0.565, W * 0.94);
    if (G.trial) {
      ctx.fillStyle = '#80d8ff';
      ctx.fillText('TRIAL RUN — SCORE & CATCHES NOT SAVED', W / 2, H * 0.62, W * 0.9);
    } else {
      ctx.fillStyle = G.score >= G.best && G.score > 0 ? '#ffd54f' : '#90a4ae';
      ctx.fillText(G.score >= G.best && G.score > 0 ? '★ NEW BEST ★' : 'BEST  ' + G.best, W / 2, H * 0.62);
    }
    if (!G.trial && typeof RUN_CKPT !== 'undefined' && RUN_CKPT) {
      ctx.font = '700 13px Orbitron, sans-serif';
      ctx.fillStyle = '#80d8ff';
      ctx.fillText('YOUR JOURNEY IS SAFE — CONTINUE FROM ' + genFor(RUN_CKPT.lvl).name + ' ON THE TITLE SCREEN', W / 2, H * 0.6, W * 0.92);
    }
    pulse(IS_TOUCH ? 'TAP FOR TITLE SCREEN' : 'CLICK FOR TITLE SCREEN', H * 0.7);
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
    // QUIT TO MENU button — bail out of the run
    const q = pauseQuitGeom();
    const qHov = inRect(mouseX, lastMouseY, q);
    ctx.save();
    roundRect(q.x, q.y, q.w, q.h, 12);
    ctx.fillStyle = qHov ? 'rgba(239,83,80,0.25)' : 'rgba(239,83,80,0.12)';
    ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = qHov ? '#ff8a80' : '#ef5350'; ctx.stroke();
    ctx.font = '900 16px Orbitron, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = qHov ? '#ff8a80' : '#ef9a9a';
    ctx.fillText('QUIT TO MENU', q.x + q.w / 2, q.y + q.h / 2 + 1);
    ctx.restore();
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
  const size = Math.min(15, W / 30);
  ctx.font = `700 ${size}px Orbitron, sans-serif`;
  const tw = Math.min(ctx.measureText(text).width, W * 0.88) + 32;
  roundRect(W / 2 - tw / 2, y - 15, tw, 30, 15);
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
