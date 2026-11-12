'use strict';
// ============================================================
//  REGION BACKGROUNDS (prerendered per gen)
// ============================================================
// The backdrop is a DEPTH STACK, every layer baked once per scene (and on
// resize — setup.js resets bgGen):
//   bgSky     full screen — sky gradient, celestial body, horizon clouds, aurora
//   bgFar     CROPPED band — the distant silhouette range, hazed toward the
//             horizon colour, slow parallax (drawn at bgFarTop)
//   bgScenery CROPPED band — the realm's landmark silhouettes, fast parallax
//             (drawn at bgSceneryTop; rows above its content are empty, so the
//             crop is pixel-identical and saves the painted area)
//   bgWash    full screen — combat contrast + atmosphere (gameplay only)
// Everything here uses its own seeded sRand or Math.random — NEVER gameRand.
let bgSky = null, bgScenery = null, bgWash = null, bgGen = -1;
let bgFar = null, bgFarTop = 0, bgSceneryTop = 0;
// how dark the current sky is (0 bright day … 1 true night) — the starfield
// and other night-only dressing read this so stars never shine at noon
let SCENE_DARK = 1;
// how lit the windows are: dim by day, glowing at dusk/night, dead in a blackout
let SCENE_LIT = 1;
function sRand(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
// ---- THE SCENE DIRECTOR (WORLD_BOSS_FINALE_PLAN §4-5, sky slice). Night is
// now a special event, not the default: every region tells a three-beat
// environmental story — Arrival (broad, inviting, usually daylight),
// Challenge (weather/light intensifies), Legendary (the boss transforms the
// sky). Each entry: sky [zenith, mid, horizon], celestial body, darkness,
// plus optional dressing: cloud (0..1 horizon cloud-bank density), low
// (cloud SEA below the viewer), aurora (night ribbons), blackout (no lights).
const SCENE_SKIES = [
  [ { sky: ['#9fc4e8', '#ffd0a0', '#ffe9c0'], cel: 'sunrise', dark: 0 },     // Kanto — Pallet Sunrise
    { sky: ['#7fb2df', '#9fb4c4', '#c8ccc9'], cel: 'noon', dark: 0, cloud: 0.8 },        // Route Stormfront
    { sky: ['#1a2450', '#33306b', '#5a3f6e'], cel: 'moon', dark: 0.8 } ],    // Cerulean Psychic Break
  [ { sky: ['#a8c8e8', '#e8c9a0', '#f4e0b8'], cel: 'sunrise', dark: 0, cloud: 0.25 },     // Johto — Autumn Morning
    { sky: ['#3d3358', '#7a4a63', '#c96f4a'], cel: 'sunset', dark: 0.25, cloud: 0.4 },   // Lantern Dusk
    { sky: ['#141b3d', '#243057', '#3c4a72'], cel: 'moon', dark: 0.9, cloud: 1 } ],    // Sacred Tempest
  [ { sky: ['#3fa9e8', '#7fc9ef', '#c9ecf7'], cel: 'noon', dark: 0, cloud: 0.3 },        // Hoenn — Tropical Noon
    { sky: ['#4a5f78', '#5d7186', '#8195a3'], cel: 'none', dark: 0.15, cloud: 1 },     // Monsoon Basin
    { sky: ['#7fb8e8', '#ffd9a0', '#f0f4f7'], cel: 'noon', dark: 0, cloud: 0.8, low: true } ],      // Sky Pillar (above the storm)
  [ { sky: ['#bcd8ef', '#dce9f4', '#f0f6fa'], cel: 'noon', dark: 0 },        // Sinnoh — Cold Mountain Morning
    { sky: ['#9fb2c4', '#c3cedb', '#e8edf2'], cel: 'none', dark: 0.05, cloud: 0.9 },     // Coronet Whiteout
    { sky: ['#1a1440', '#3d2f68', '#7a5a9e'], cel: 'moon', dark: 0.85, aurora: true } ],   // Spear Pillar Time Fracture
  [ { sky: ['#5fb0e8', '#90cbef', '#cfe9f7'], cel: 'noon', dark: 0 },        // Unova — Castelia Day
    { sky: ['#4a3468', '#b85a7a', '#ff9d5c'], cel: 'sunset', dark: 0.2, cloud: 0.35 },    // Neon Rush Hour
    { sky: ['#05070f', '#0a0f1e', '#141a2e'], cel: 'none', dark: 1, blackout: true } ],      // City Blackout
  [ { sky: ['#c9d4f0', '#f4c9d4', '#ffe4d0'], cel: 'sunrise', dark: 0, cloud: 0.3 },     // Kalos — Lumiose Rose Dawn
    { sky: ['#2d3a6e', '#4a5a9e', '#8a7ab8'], cel: 'none', dark: 0.5 },      // Festival Blue Hour
    { sky: ['#3d1020', '#571626', '#7a1e2e'], cel: 'eclipse', dark: 0.6, cloud: 0.5 } ], // Black Sun
  [ { sky: ['#2f9fe8', '#6fc4ef', '#b8e8f7'], cel: 'noon', dark: 0, cloud: 0.3 },        // Alola — Island Day
    { sky: ['#5a2d4a', '#c4523d', '#ff9d4a'], cel: 'sunset', dark: 0.15, cloud: 0.4 },   // Fire Festival Sunset
    { sky: ['#0d1333', '#1e2a57', '#3d4a7a'], cel: 'bigmoon', dark: 1, aurora: true } ],   // Lunar Rite
  [ { sky: ['#8fa8bc', '#b0c3d1', '#d5dfe6'], cel: 'none', dark: 0.05, cloud: 0.8 },     // Galar — Overcast League Day
    { sky: ['#2d3550', '#40507a', '#5a6f9e'], cel: 'none', dark: 0.35, cloud: 0.6 },     // Floodlight Cup
    { sky: ['#2e0d16', '#571626', '#8a2432'], cel: 'eclipse', dark: 0.7, cloud: 0.8 } ], // Darkest Day
  [ { sky: ['#7fb8e8', '#ffce8a', '#ffe9c0'], cel: 'sunrise', dark: 0 },     // Paldea — Mesagoza Golden Morning
    { sky: ['#3f9fe8', '#8fc9ef', '#e8d9b0'], cel: 'noon', dark: 0, cloud: 0.3 },        // Treasure-Road Noon
    { sky: ['#4a3d8a', '#8a5ab8', '#ffb88a'], cel: 'sunrise', dark: 0.45, aurora: true } ],// Temporal Garden dawn
];
// ---- colour helpers (bake-time only) ----
function hexRgb(h) {
  const n = parseInt(String(h).slice(1, 7), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function mixCol(a, b, t) {
  const pa = hexRgb(a), pb = hexRgb(b);
  const m = i => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return '#' + ((1 << 24) | (m(0) << 16) | (m(1) << 8) | m(2)).toString(16).slice(1);
}
function rgbaOf(h, a) { const p = hexRgb(h); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
// Crop a full-viewport bake down to the rows that actually hold pixels — the
// gate budgets PAINTED SCREENS, and most scenery lives in the lower half.
// Reads alpha once at bake time, in row chunks, stopping at the first content.
function cropToContent(cv) {
  let top = 0;
  try {
    const cc = cv.getContext('2d'), CH = 24;
    scan: for (let y0 = 0; y0 < cv.height; y0 += CH) {
      const h = Math.min(CH, cv.height - y0);
      const d = cc.getImageData(0, y0, cv.width, h).data;
      for (let i = 3; i < d.length; i += 4) if (d[i]) { top = y0 + Math.floor((i >> 2) / cv.width); break scan; }
      top = y0 + h;
    }
  } catch (e) { return { cv, top: 0 }; }
  top = Math.max(0, Math.min(cv.height - 1, top - 2));
  if (top < 4) return { cv, top: 0 };
  const out = document.createElement('canvas');
  out.width = cv.width; out.height = cv.height - top;
  out.getContext('2d').drawImage(cv, 0, -top);
  return { cv: out, top };
}
// ---- CELESTIAL BODIES: soft halo, limb shading, craters, corona — baked
// straight into the (cached) sky canvas, so they cost nothing per frame.
function paintSun(sc, x, y, r, low, warm) {
  const edge = warm ? '#ff9a52' : (low ? '#ffc070' : '#ffe6a0');
  let g = sc.createRadialGradient(x, y, r * 0.6, x, y, r * 7);
  g.addColorStop(0, 'rgba(255,238,205,0.34)'); g.addColorStop(0.3, 'rgba(255,226,180,0.11)');
  g.addColorStop(1, 'rgba(255,220,170,0)');
  sc.fillStyle = g; sc.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
  if (low) { // the sun's light pooled along the horizon
    sc.save(); sc.translate(x, y); sc.scale(3.4, 0.5);
    g = sc.createRadialGradient(0, 0, 0, 0, 0, r * 4.5);
    g.addColorStop(0, rgbaOf(edge, 0.3)); g.addColorStop(1, rgbaOf(edge, 0));
    sc.fillStyle = g; sc.beginPath(); sc.arc(0, 0, r * 4.5, 0, Math.PI * 2); sc.fill();
    sc.restore();
  }
  g = sc.createRadialGradient(x, y, r * 0.85, x, y, r * 1.9);
  g.addColorStop(0, 'rgba(255,246,222,0.45)'); g.addColorStop(1, 'rgba(255,246,222,0)');
  sc.fillStyle = g; sc.beginPath(); sc.arc(x, y, r * 1.9, 0, Math.PI * 2); sc.fill();
  // limb darkening: a hot white core falling off to a warmer rim
  g = sc.createRadialGradient(x - r * 0.12, y - r * 0.12, 0, x, y, r);
  g.addColorStop(0, '#fffdf3'); g.addColorStop(0.6, '#fff1c8'); g.addColorStop(1, edge);
  sc.fillStyle = g;
  sc.beginPath(); sc.ellipse(x, y, r, low ? r * 0.93 : r, 0, 0, Math.PI * 2); sc.fill();
}
function paintMoon(sc, rnd, x, y, r, alpha) {
  let g = sc.createRadialGradient(x, y, r * 0.9, x, y, r * 3.2);
  g.addColorStop(0, 'rgba(214,222,255,0.17)'); g.addColorStop(0.35, 'rgba(200,210,250,0.06)');
  g.addColorStop(1, 'rgba(200,210,250,0)');
  sc.fillStyle = g; sc.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  sc.save();
  sc.globalAlpha = alpha;
  sc.beginPath(); sc.arc(x, y, r, 0, Math.PI * 2); sc.clip();
  // lit from the upper left — a sphere, not a sticker
  g = sc.createRadialGradient(x - r * 0.38, y - r * 0.38, r * 0.05, x, y, r * 1.08);
  g.addColorStop(0, '#f4f5fb'); g.addColorStop(0.55, '#cfd3e6'); g.addColorStop(1, '#8a90ad');
  sc.fillStyle = g; sc.fillRect(x - r, y - r, r * 2, r * 2);
  // maria — soft dark seas
  sc.fillStyle = 'rgba(112,120,154,0.3)';
  for (const [mx, my, mr] of [[-0.3, -0.2, 0.3], [0.2, 0.12, 0.24], [-0.05, 0.4, 0.17], [0.32, -0.32, 0.14]]) {
    sc.beginPath(); sc.ellipse(x + mx * r, y + my * r, mr * r * 1.15, mr * r * 0.85, rnd() * 3, 0, Math.PI * 2); sc.fill();
  }
  // craters with a lit lower rim
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.78, cr = r * (0.05 + rnd() * 0.08);
    const ccx = x + Math.cos(a) * d, ccy = y + Math.sin(a) * d;
    sc.fillStyle = 'rgba(96,104,138,0.32)';
    sc.beginPath(); sc.arc(ccx, ccy, cr, 0, Math.PI * 2); sc.fill();
    sc.strokeStyle = 'rgba(255,255,255,0.22)'; sc.lineWidth = Math.max(0.8, cr * 0.25);
    sc.beginPath(); sc.arc(ccx, ccy, cr, 0.2, Math.PI - 0.2); sc.stroke();
  }
  // a soft terminator: waxing gibbous, the night side falling away to the right
  g = sc.createLinearGradient(x + r * 0.25, 0, x + r * 1.05, 0);
  g.addColorStop(0, 'rgba(12,16,40,0)'); g.addColorStop(1, 'rgba(12,16,40,0.62)');
  sc.fillStyle = g; sc.fillRect(x - r, y - r, r * 2, r * 2);
  sc.restore();
  // thin bright limb on the lit side
  sc.save(); sc.globalAlpha = alpha * 0.7;
  sc.strokeStyle = 'rgba(240,244,255,0.55)'; sc.lineWidth = Math.max(1, r * 0.035);
  sc.beginPath(); sc.arc(x, y, r - sc.lineWidth / 2, Math.PI * 0.75, Math.PI * 1.6); sc.stroke();
  sc.restore();
}
function paintEclipse(sc, rnd, x, y, r) {
  // corona streamers — thin, faint, uneven, like the real thing
  sc.save(); sc.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + (rnd() - 0.5) * 0.12;
    const len = r * (1.35 + rnd() * rnd() * 1.9 + (Math.abs(Math.cos(a)) > 0.8 ? 0.6 : 0));
    sc.strokeStyle = 'rgba(255,' + (150 + Math.floor(rnd() * 60)) + ',120,' + (0.06 + rnd() * 0.12).toFixed(3) + ')';
    sc.lineWidth = 1 + rnd() * 2.6;
    sc.beginPath(); sc.moveTo(x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96);
    sc.quadraticCurveTo(x + Math.cos(a + 0.05) * len * 0.7, y + Math.sin(a + 0.05) * len * 0.7, x + Math.cos(a) * len, y + Math.sin(a) * len);
    sc.stroke();
  }
  sc.restore();
  let g = sc.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
  g.addColorStop(0, 'rgba(255,120,80,0.5)'); g.addColorStop(0.4, 'rgba(255,110,80,0.14)'); g.addColorStop(1, 'rgba(255,120,80,0)');
  sc.fillStyle = g; sc.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  sc.fillStyle = 'rgba(10,6,10,0.97)';
  sc.beginPath(); sc.arc(x, y, r, 0, Math.PI * 2); sc.fill();
  sc.strokeStyle = 'rgba(255,170,110,0.9)'; sc.lineWidth = 2.5;
  sc.beginPath(); sc.arc(x, y, r, 0, Math.PI * 2); sc.stroke();
  // the diamond-ring bead where the last light slips past the limb
  const ba = -0.75, bx = x + Math.cos(ba) * r, by = y + Math.sin(ba) * r;
  g = sc.createRadialGradient(bx, by, 0, bx, by, r * 0.55);
  g.addColorStop(0, 'rgba(255,236,214,0.8)'); g.addColorStop(0.25, 'rgba(255,200,160,0.22)'); g.addColorStop(1, 'rgba(255,190,150,0)');
  sc.fillStyle = g; sc.beginPath(); sc.arc(bx, by, r * 0.55, 0, Math.PI * 2); sc.fill();
}
// horizon cloud banks: one path per bank (puffs union, no alpha stacking),
// a shadowed body and a lit crown. Low-contrast — they sit at the horizon
// behind the far range, never up where the flocks fight.
function paintClouds(sc, rnd, scene) {
  const n = Math.round(scene.cloud * 6) + 1;
  const hz = scene.sky[2], mid = scene.sky[1];
  const night = scene.dark > 0.3;
  const body = mixCol(mixCol(hz, mid, 0.55), '#05070f', scene.low ? 0.04 : night ? 0.38 : 0.18);
  const lit = mixCol(hz, '#ffffff', night ? 0.04 : 0.3);
  const y0 = scene.low ? H * 0.7 : H * 0.6, y1 = scene.low ? H * 0.8 : H * 0.74;
  for (let b = 0; b < n; b++) {
    const cx = rnd() * W, cy = y0 + rnd() * (y1 - y0), w = W * (0.28 + rnd() * 0.34);
    const puffs = 6 + Math.floor(rnd() * 3), rx0 = w / puffs * 1.25, hump = rx0 * (0.6 + rnd() * 0.5);
    const pts = [];
    for (let k = 0; k < puffs; k++) {
      const t = k / (puffs - 1);
      pts.push([cx + (t - 0.5) * w, cy - Math.sin(Math.PI * t) * hump, rx0 * (0.75 + rnd() * 0.5)]);
    }
    for (const [col, dy, s, a] of [[body, 0, 1, 0.44], [lit, -0.16, 0.78, night ? 0.16 : 0.26]]) {
      sc.globalAlpha = a * (0.65 + scene.cloud * 0.35);
      sc.fillStyle = col; sc.beginPath();
      for (const [px, py, pr] of pts) { sc.moveTo(px + pr * s, py + dy * pr); sc.ellipse(px, py + dy * pr, pr * s, pr * s * 0.55, 0, 0, Math.PI * 2); }
      sc.fill();
    }
  }
  sc.globalAlpha = 1;
}
// night ribbons — each a smooth wavy curtain of vertical strokes under ONE
// gradient (bright lower hem fading upward), its ends tapered in chunks
function paintAurora(sc, rnd, col) {
  sc.save(); sc.lineWidth = 3.2;
  for (let r = 0; r < 2; r++) {
    const hem = H * (0.3 + rnd() * 0.12), len = H * (0.09 + rnd() * 0.05), amp = H * (0.02 + rnd() * 0.02);
    const f = (0.5 + rnd() * 0.6) * Math.PI * 2 / W, p = rnd() * 6.28;
    const g = sc.createLinearGradient(0, hem - amp - len, 0, hem + amp);
    g.addColorStop(0, rgbaOf(col, 0)); g.addColorStop(0.75, rgbaOf(col, 0.07 - r * 0.02));
    g.addColorStop(1, rgbaOf(col, 0));
    sc.strokeStyle = g;
    const x0 = W * (rnd() * 0.25), x1 = W * (0.75 + rnd() * 0.25), CH = 10;
    for (let k = 0; k < CH; k++) {
      sc.globalAlpha = Math.sin(Math.PI * (k + 0.5) / CH);
      sc.beginPath();
      for (let x = x0 + (x1 - x0) * k / CH; x < x0 + (x1 - x0) * (k + 1) / CH; x += 4) {
        const y = hem + Math.sin(x * f + p) * amp;
        sc.moveTo(x, y); sc.lineTo(x, y - len);
      }
      sc.stroke();
    }
  }
  sc.restore();
}
function buildBackground(genIdx, stage) {
  // a caller that omits the stage (the wave builder's pre-warm) means "the
  // stage being built" — defaulting to the finale made every ordinary wave
  // bake its scene twice (finale here, real stage on the first frame)
  if (stage === undefined) {
    stage = (typeof G !== 'undefined' && G && G.level && regionIdx(G.level) === genIdx) ? stageIdx(G.level) : 2;
  }
  // STARFIGHTER bakes its own (much deeper) combat wash — see FLIGHT below —
  // so the mode is part of the cache key
  const flightSky = typeof G !== 'undefined' && G && G.mode === 'junkie';
  const key = genIdx * 3 + stage + (flightSky ? 100 : 0);
  if (bgGen === key && bgSky) return;
  bgGen = key;
  const g = SKIN.gens[genIdx];
  const scene = (SCENE_SKIES[genIdx] && SCENE_SKIES[genIdx][stage]) || { sky: g.sky, cel: 'moon', dark: 1 };
  SCENE_DARK = scene.dark;
  SCENE_LIT = scene.blackout ? 0.12 : 0.4 + 0.6 * Math.min(1, scene.dark / 0.8);
  bgSky = document.createElement('canvas'); bgSky.width = W; bgSky.height = H;
  const sc = bgSky.getContext('2d');
  const grad = sc.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, scene.sky[0]); grad.addColorStop(0.55, scene.sky[1]); grad.addColorStop(1, scene.sky[2]);
  sc.fillStyle = grad; sc.fillRect(0, 0, W, H);
  const rg = sc.createRadialGradient(W / 2, H * 0.95, 0, W / 2, H * 0.95, W * 0.6);
  rg.addColorStop(0, g.accent + '22'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sc.fillStyle = rg; sc.fillRect(0, 0, W, H);
  const crnd = sRand(genIdx * 7919 + stage * 131 + 3);
  if (scene.aurora) paintAurora(sc, crnd, g.accent || '#7ee08a');
  // ---- the celestial body sells the time of day at a glance ----
  const cx = W * (0.16 + ((genIdx * 0.23) % 0.68));
  if (scene.cel === 'moon' || scene.cel === 'bigmoon') {
    const big = scene.cel === 'bigmoon';
    const my = H * (0.1 + (genIdx % 3) * 0.05), mr = (26 + (genIdx % 3) * 9) * (big ? 2.4 : 1);
    paintMoon(sc, crnd, big ? W * 0.5 : cx, my, mr, big ? 0.52 : 0.42);
  } else if (scene.cel === 'sunrise' || scene.cel === 'sunset' || scene.cel === 'noon') {
    // a low sun sits ON the horizon, half behind the far range — it used to
    // hang at 58% height, a bright blob right behind the combat field
    const low = scene.cel !== 'noon';
    paintSun(sc, cx, low ? H * 0.76 : H * 0.14, low ? 34 : 22, low, scene.cel === 'sunset');
  } else if (scene.cel === 'eclipse') {
    paintEclipse(sc, crnd, cx, H * 0.18, 34);
  }
  if (scene.cloud) paintClouds(sc, crnd, scene);

  // ---- FAR RANGE: atmospheric perspective — paler toward the horizon
  // colour, simpler shapes, slower parallax than the landmarks
  {
    const fv = document.createElement('canvas'); fv.width = W; fv.height = H;
    const fc = fv.getContext('2d');
    const hz = scene.sky[2], day = scene.dark < 0.4;
    const f1 = mixCol(g.land[0], hz, day ? 0.62 : 0.4), f2 = mixCol(g.land[0], hz, day ? 0.44 : 0.26);
    const painter = drawFar[g.scene];
    if (painter) painter(fc, sRand(genIdx * 4241 + 11), g, f1, f2, scene);
    // valley mist: the base of the range dissolves into the horizon light
    fc.globalCompositeOperation = 'source-atop';
    const mg = fc.createLinearGradient(0, H * 0.7, 0, H * 0.95);
    mg.addColorStop(0, rgbaOf(hz, 0)); mg.addColorStop(1, rgbaOf(hz, day ? 0.4 : 0.26));
    fc.fillStyle = mg; fc.fillRect(0, H * 0.7, W, H * 0.3);
    fc.globalCompositeOperation = 'source-over';
    const fr = cropToContent(fv);
    bgFar = fr.cv; bgFarTop = fr.top;
  }

  const nv = document.createElement('canvas'); nv.width = W; nv.height = H;
  const c = nv.getContext('2d');
  const rnd = sRand(genIdx * 1337 + 7);
  drawScene[g.scene](c, rnd, g);
  if (stage === 2) finaleAccent(c, g, scene); // the landmark answers the legend
  // daylight scenes ground the silhouettes with atmospheric haze instead of
  // letting night-tuned art float on a bright sky
  if (scene.dark < 0.4) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(255,240,215,' + (0.16 * (1 - scene.dark)).toFixed(3) + ')';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }
  const nr = cropToContent(nv);
  bgScenery = nr.cv; bgSceneryTop = nr.top;
  // ---- COMBAT CONTRAST WASH: the brighter the authored sky, the harder the
  // sprites fight it — so gameplay lays a deep-navy wash over the whole scene,
  // strongest in the TOP band where the flocks fly, easing toward the ship's
  // lane. Baked once per scene (a cached canvas, zero per-frame cost); the
  // menu never draws it, so the title keeps its postcard look.
  // The ATMOSPHERE wash (warm horizon glow + top darken, formerly its own
  // per-frame full-screen layer in render.js) bakes into the SAME canvas —
  // "over" is associative, so one pre-composited layer is pixel-identical to
  // drawing the two in sequence, and a phone paints one less full screen
  // every frame. The menu never draws this canvas, as before.
  bgWash = document.createElement('canvas'); bgWash.width = W; bgWash.height = H;
  const wc = bgWash.getContext('2d');
  if (flightSky) {
    // FLIGHT (owner: "really rough" — the washed daytime skies swallowed
    // every sprite and nothing said you were FLYING): STARFIGHTER plays over
    // a deep stage. The realm's sky survives as a tint, the accent glow
    // below still names the realm, and the scrolling star field
    // (drawBackground) supplies the motion.
    // near-opaque: a translucent wash over a beige day sky went muddy olive.
    // The lower third carries the REALM ACCENT instead, so every realm
    // still flies under its own colour.
    const ac = g.accent || '#7ee08a';
    const ar = parseInt(ac.slice(1, 3), 16), ag = parseInt(ac.slice(3, 5), 16), ab = parseInt(ac.slice(5, 7), 16);
    const mix = k => 'rgba(' + Math.round(5 + ar * k) + ',' + Math.round(8 + ag * k) + ',' + Math.round(26 + ab * k) + ',';
    const fg = wc.createLinearGradient(0, 0, 0, H);
    fg.addColorStop(0, 'rgba(3,5,18,0.95)');
    fg.addColorStop(0.5, mix(0.03) + '0.93)');
    fg.addColorStop(0.82, mix(0.1) + '0.9)');
    fg.addColorStop(1, mix(0.2) + '0.88)');
    wc.fillStyle = fg; wc.fillRect(0, 0, W, H);
  } else if (scene.dark < 0.85) {
    const base = 0.44 * Math.pow(1 - scene.dark, 1.15);
    const wg = wc.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, 'rgba(6,11,30,' + Math.min(0.6, base * 1.2).toFixed(3) + ')');
    wg.addColorStop(0.55, 'rgba(6,11,30,' + base.toFixed(3) + ')');
    wg.addColorStop(1, 'rgba(6,11,30,' + (base * 0.6).toFixed(3) + ')');
    wc.fillStyle = wg; wc.fillRect(0, 0, W, H);
  }
  const accent = g.accent || '#7ee08a';
  // horizon glow: a soft band of the region accent low on the screen
  const hg = wc.createRadialGradient(W / 2, H * 0.9, 10, W / 2, H * 0.9, H * 0.7);
  hg.addColorStop(0, accent + '30'); hg.addColorStop(0.5, accent + '10'); hg.addColorStop(1, accent + '00');
  wc.fillStyle = hg; wc.fillRect(0, 0, W, H);
  // top darken for depth
  const tg = wc.createLinearGradient(0, 0, 0, H * 0.5);
  tg.addColorStop(0, 'rgba(2,4,14,0.5)'); tg.addColorStop(1, 'rgba(2,4,14,0)');
  wc.fillStyle = tg; wc.fillRect(0, 0, W, H * 0.5);
}
// ---- the far-range painters (screen coords on a full-height bake; the
// result is cropped). f1 = the most distant tone, f2 = one step nearer.
// A noisy ridge line; returns its profile so dressing can sit ON it.
function farRidge(c, rnd, baseY, amp, o) {
  o = o || {};
  const f = (o.freq || 1) * Math.PI * 2 / W, p1 = rnd() * 6.283, p2 = rnd() * 6.283, p3 = rnd() * 6.283;
  const prof = x => {
    const u = x * f;
    let h;
    if (o.ridged) h = 0.72 * (1 - Math.abs(Math.sin(u * 0.5 + p1))) + 0.22 * (0.5 + 0.5 * Math.sin(u * 1.7 + p2)) + 0.06 * Math.sin(u * 9 + p3);
    else h = 0.5 + 0.5 * (Math.sin(u + p1) * 0.6 + Math.sin(u * 2.3 + p2) * 0.28 + Math.sin(u * 5.3 + p3) * 0.12);
    return baseY - h * amp;
  };
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W + 4; x += 4) c.lineTo(x, prof(x));
  c.lineTo(W + 4, H); c.closePath(); c.fill();
  return prof;
}
// a snowline / sunlit crest: lighten the top slice of everything drawn so far
function farCrest(c, y0, y1, col) {
  c.save(); c.globalCompositeOperation = 'source-atop';
  c.fillStyle = col; c.fillRect(0, y0, W, y1 - y0);
  c.restore();
}
function farBlocks(c, rnd, baseY, hMin, hMax, wMin, wMax, gapMax, spires) {
  const tops = [];
  let x = -rnd() * 20;
  while (x < W) {
    const bw = wMin + rnd() * (wMax - wMin), bh = hMin + rnd() * (hMax - hMin);
    c.fillRect(x, baseY - bh, bw, bh + (H - baseY));
    if (rnd() < 0.35) c.fillRect(x + bw * 0.2, baseY - bh - bh * 0.12, bw * 0.6, bh * 0.12 + 1); // setback
    if (spires && rnd() < spires) c.fillRect(x + bw / 2 - 1, baseY - bh - 16, 2, 16);
    tops.push([x, baseY - bh, bw, bh]);
    x += bw + rnd() * gapMax;
  }
  return tops;
}
const drawFar = {
  hills(c, rnd, g, f1, f2, scene) {
    c.fillStyle = f1; farRidge(c, rnd, H * 0.84, H * 0.11, { freq: 1.2, ridged: true });
    c.fillStyle = f2;
    const prof = farRidge(c, rnd, H * 0.865, H * 0.035, { freq: 2.2 });
    for (let i = 0; i < 11; i++) { // copses along the rolling crest
      const tx = rnd() * W, ty = prof(tx), r = 2.5 + rnd() * 3;
      c.beginPath(); c.arc(tx, ty - r * 0.6, r, 0, Math.PI * 2); c.fill();
    }
  },
  pagoda(c, rnd, g, f1, f2) {
    c.fillStyle = f1; farRidge(c, rnd, H * 0.85, H * 0.13, { freq: 1.1 });
    c.fillStyle = f2;
    const prof = farRidge(c, rnd, H * 0.9, H * 0.035, { freq: 1.8 });
    for (const [px, s] of [[W * 0.12, 0.5], [W * 0.9, 0.4]]) { // distant pagodas
      const by = prof(px) + 2;
      for (let t = 0; t < 4; t++) {
        const w = 40 * s * (1 - t * 0.16), y = by - t * 15 * s;
        c.fillRect(px - w * 0.3, y - 8 * s, w * 0.6, 8 * s);
        c.beginPath(); c.moveTo(px - w * 0.6, y - 7 * s); c.quadraticCurveTo(px, y - 15 * s, px + w * 0.6, y - 7 * s); c.closePath(); c.fill();
      }
      c.fillRect(px - 1, by - 72 * s, 2, 14 * s);
    }
  },
  waves(c, rnd, g, f1, f2) {
    // the far crater rim across the bay, and a sea stack in the haze
    c.fillStyle = f1; farRidge(c, rnd, H * 0.9, H * 0.07, { freq: 2.2, ridged: true });
    c.fillStyle = f2;
    c.beginPath(); c.moveTo(W * 0.3, H * 0.905); c.quadraticCurveTo(W * 0.36, H * 0.855, W * 0.4, H * 0.86);
    c.quadraticCurveTo(W * 0.44, H * 0.87, W * 0.47, H * 0.905); c.closePath(); c.fill();
  },
  mountain(c, rnd, g, f1, f2, scene) {
    c.fillStyle = f1; farRidge(c, rnd, H * 0.74, H * 0.17, { freq: 1.5, ridged: true });
    farCrest(c, H * 0.57, H * 0.62, scene.dark < 0.4 ? 'rgba(244,248,255,0.32)' : 'rgba(200,210,240,0.16)');
    c.fillStyle = f2; farRidge(c, rnd, H * 0.8, H * 0.09, { freq: 2.4, ridged: true });
  },
  skyline(c, rnd, g, f1, f2, scene) {
    c.fillStyle = f1;
    const tops = farBlocks(c, rnd, H * 0.86, H * 0.05, H * 0.19, 14, 34, 6, 0.3);
    // a few window pricks and roof beacons (none in a blackout)
    if (!scene.blackout) {
      c.fillStyle = rgbaOf(g.accent, (0.12 + 0.28 * SCENE_LIT).toFixed(3));
      for (const [x, y, w, h] of tops)
        for (let wy = y + 6; wy < H * 0.86; wy += 9)
          for (let wx = x + 3; wx < x + w - 3; wx += 6) if (rnd() < 0.14 * SCENE_LIT) c.fillRect(wx, wy, 1.5, 2);
    }
    c.fillStyle = f2;
    farBlocks(c, rnd, H * 0.9, H * 0.03, H * 0.09, 20, 46, 4, 0);
  },
  tower(c, rnd, g, f1, f2) {
    c.fillStyle = f1; farRidge(c, rnd, H * 0.87, H * 0.06, { freq: 1.4 });
    c.fillStyle = f2;
    farBlocks(c, rnd, H * 0.92, H * 0.02, H * 0.045, 26, 60, 6, 0.25);
    for (const [dx, dr] of [[W * 0.2, 16], [W * 0.82, 12]]) { // distant domes
      c.beginPath(); c.arc(dx, H * 0.905, dr, Math.PI, 0); c.fill();
      c.fillRect(dx - dr - 2, H * 0.905, dr * 2 + 4, H * 0.02);
      c.fillRect(dx - 1.5, H * 0.905 - dr - 9, 3, 10);
    }
  },
  palms(c, rnd, g, f1, f2, scene) {
    // volcanic islands on the horizon, then the open sea in front of them
    c.fillStyle = f1;
    for (const [ix, iw, ih] of [[W * 0.18, W * 0.22, H * 0.05], [W * 0.46, W * 0.12, H * 0.025], [W * 0.62, W * 0.16, H * 0.035]]) {
      c.beginPath(); c.moveTo(ix - iw / 2, H * 0.885);
      c.quadraticCurveTo(ix - iw * 0.12, H * 0.885 - ih * 1.7, ix, H * 0.885 - ih);
      c.quadraticCurveTo(ix + iw * 0.15, H * 0.885 - ih * 1.5, ix + iw / 2, H * 0.885);
      c.closePath(); c.fill();
    }
    c.fillStyle = mixCol(scene.sky[2], g.land[2], scene.dark < 0.4 ? 0.3 : 0.5);
    c.fillRect(0, H * 0.884, W, H * 0.116);
    c.fillStyle = rgbaOf(scene.dark < 0.4 ? '#ffffff' : g.accent, 0.16);
    for (let i = 0; i < 16; i++) c.fillRect(rnd() * W, H * (0.89 + rnd() * 0.05), 10 + rnd() * 30, 1.2);
  },
  stadium(c, rnd, g, f1, f2) {
    c.fillStyle = f1; farRidge(c, rnd, H * 0.89, H * 0.05, { freq: 1.6 });
    c.fillStyle = f2;
    farBlocks(c, rnd, H * 0.93, H * 0.015, H * 0.04, 18, 50, 10, 0);
    for (let i = 0; i < 5; i++) { // mill chimneys of the old industrial towns
      const x = W * (0.05 + rnd() * 0.9), h = H * (0.05 + rnd() * 0.04);
      c.fillRect(x, H * 0.93 - h, 5, h);
      c.fillRect(x - 1, H * 0.93 - h, 7, 3);
    }
  },
  mesa(c, rnd, g, f1, f2) {
    // tall pale buttes far across the plateau
    c.fillStyle = f1;
    let x = -rnd() * 60;
    c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * 0.82);
    while (x < W) {
      const flat = 30 + rnd() * 90, gap = 30 + rnd() * 90, mh = H * (0.03 + rnd() * 0.045), sl = 8 + rnd() * 14;
      c.lineTo(x, H * 0.82); c.lineTo(x + sl, H * 0.82 - mh); c.lineTo(x + sl + flat, H * 0.82 - mh * (0.9 + rnd() * 0.2)); c.lineTo(x + sl * 2 + flat, H * 0.82);
      x += sl * 2 + flat + gap;
    }
    c.lineTo(W, H * 0.82); c.lineTo(W, H); c.closePath(); c.fill();
    c.fillStyle = f2; farRidge(c, rnd, H * 0.85, H * 0.035, { freq: 1.6 });
  },
};
// ---- FINALE ACCENT: on a realm's legendary stage the landmark is lit from
// behind — a soft accent glow slipped BEHIND the silhouettes
// (destination-over), so the skyline reads backlit rather than painted over.
// A blackout gets the opposite: dead towers, only red aviation lamps.
const FINALE_LANDMARK = {
  hills: [0.76, 0.86], pagoda: [0.7, 0.8], waves: [0.5, 0.87], mountain: [0.5, 0.66],
  skyline: [0.5, 0.86], tower: [0.5, 0.88], palms: [0.42, 0.89], stadium: [0.5, 0.92], mesa: [0.5, 0.89],
};
function finaleAccent(c, g, scene) {
  const lm = FINALE_LANDMARK[g.scene];
  if (!lm) return;
  if (scene.blackout) return; // the skyline painter handles its own dead city
  const x = W * lm[0], y = H * lm[1], r = Math.min(W, H) * 0.3;
  c.save(); c.globalCompositeOperation = 'destination-over';
  const gg = c.createRadialGradient(x, y, 0, x, y, r);
  gg.addColorStop(0, rgbaOf(g.accent, 0.2)); gg.addColorStop(0.45, rgbaOf(g.accent, 0.07)); gg.addColorStop(1, rgbaOf(g.accent, 0));
  c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}
// Draw the two parallax silhouette bands. Each band is overscanned by at least
// its parallax travel, so a paddle at either wall never exposes a bare strip
// at the screen edge (the old fixed 1.5% overscan was 6px short on a phone).
// Only the cropped band height is painted — the rows above it were empty.
function drawSceneryLayers(c, par) {
  if (bgFar) {
    const P = 5, o = Math.max(W * 0.008, P + 1);
    c.drawImage(bgFar, -par * P - o, bgFarTop, W + o * 2, bgFar.height);
  }
  if (bgScenery) {
    const P = 12, o = Math.max(W * 0.015, P + 1);
    c.drawImage(bgScenery, -par * P - o, bgSceneryTop, W + o * 2, bgScenery.height);
  }
}
function silhouetteBase(c, color, baseY) {
  c.fillStyle = color;
  c.fillRect(0, baseY, W, H - baseY);
}
// scatter lit windows over a building silhouette (restores fillStyle after).
// SCENE_LIT dims them by day and lights more of them at dusk and night; the
// rnd() draw count never changes, so the rest of the scene stays put.
function bWindows(c, rnd, x, y, w, h, col, chance = 0.45, sz = 3.5, gap = 10) {
  const prev = c.fillStyle, pa = c.globalAlpha;
  c.fillStyle = col;
  c.globalAlpha = pa * Math.min(1, 0.35 + SCENE_LIT * 0.75);
  const ch = chance * (0.7 + 0.5 * SCENE_LIT);
  for (let wy = y + 5; wy < y + h - 5; wy += gap)
    for (let wx = x + 5; wx < x + w - 7; wx += gap)
      if (rnd() < ch) c.fillRect(wx, wy, sz, sz + 1);
  c.fillStyle = prev; c.globalAlpha = pa;
}
const drawScene = {
  // KANTO — Pallet Town: cottages, a picket fence, and Oak's lab with its windmill
  hills(c, rnd, g) {
    [[g.land[0], H * 0.84, 36, 0.004], [g.land[1], H * 0.89, 26, 0.007], [g.land[2], H * 0.94, 18, 0.011]].forEach(([col, baseY, amp, f], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, baseY + Math.sin(x * f + li * 2) * amp);
      c.lineTo(W, H); c.closePath(); c.fill();
      if (li === 0) for (let i = 0; i < 5; i++) { // trees on the far hill
        const tx = rnd() * W, ty = baseY + Math.sin(tx * f) * amp;
        c.beginPath(); c.arc(tx, ty - 10, 8 + rnd() * 7, 0, Math.PI * 2); c.fill();
        c.fillRect(tx - 2, ty - 8, 4, 12);
      }
    });
    // Oak's lab on the right rise — wide hall + roof + windmill
    const lx = W * 0.76, ly = H * 0.9;
    c.fillStyle = g.land[2];
    c.fillRect(lx - 66, ly - 48, 132, 48);
    c.beginPath(); c.moveTo(lx - 74, ly - 48); c.lineTo(lx, ly - 78); c.lineTo(lx + 74, ly - 48); c.closePath(); c.fill();
    bWindows(c, rnd, lx - 60, ly - 42, 120, 36, g.accent + '66', 0.4);
    const wx = lx - 104, wy = ly - 62;
    c.strokeStyle = g.land[2]; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(wx, ly); c.lineTo(wx, wy); c.stroke();
    c.lineWidth = 3.4;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.5;
      c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + Math.cos(a) * 32, wy + Math.sin(a) * 32); c.stroke();
    }
    // little cottages on the left
    for (const [hx, s] of [[W * 0.13, 1], [W * 0.29, 0.82]]) {
      const hy = H * 0.905, hw = 52 * s, hh = 32 * s;
      c.fillStyle = g.land[1];
      c.fillRect(hx - hw / 2, hy - hh, hw, hh);
      c.fillStyle = g.land[2];
      c.beginPath(); c.moveTo(hx - hw * 0.62, hy - hh); c.lineTo(hx, hy - hh - 20 * s); c.lineTo(hx + hw * 0.62, hy - hh); c.closePath(); c.fill();
      c.fillStyle = g.accent + '77';
      c.fillRect(hx - 6 * s, hy - hh + 8 * s, 9 * s, 9 * s);
    }
    // picket fence between the cottages
    c.fillStyle = g.land[2];
    for (let fx = W * 0.05; fx < W * 0.4; fx += 14) c.fillRect(fx, H * 0.925, 3, 13);
    c.fillRect(W * 0.05, H * 0.932, W * 0.35, 2.4);
  },
  // JOHTO — Ecruteak City: the Bell Tower, the Burned Tower and a torii gate
  pagoda(c, rnd, g) {
    silhouetteBase(c, g.land[2], H * 0.93);
    c.fillStyle = g.land[1]; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) c.lineTo(x, H * 0.9 + Math.sin(x * 0.006) * 20);
    c.lineTo(W, H); c.closePath(); c.fill();
    const tower = (px, scale, tiers, col, broken) => {
      const bw = 88 * scale, th = 30 * scale, baseY = H * 0.92;
      c.fillStyle = col;
      for (let t = 0; t < tiers; t++) {
        const w = bw * (1 - t * 0.13), y = baseY - t * th;
        c.fillRect(px - w * 0.32, y - th * 0.55, w * 0.64, th * 0.6);
        c.beginPath();
        c.moveTo(px - w * 0.58, y - th * 0.5);
        c.quadraticCurveTo(px, y - th * 1.02, px + w * 0.58, y - th * 0.5);
        c.lineTo(px + w * 0.38, y - th * 0.66); c.lineTo(px - w * 0.38, y - th * 0.66);
        c.closePath(); c.fill();
        if (!broken && t < tiers - 1) { // warm lantern glow on each floor
          c.fillStyle = g.accent + '55';
          c.fillRect(px - 2.5 * scale, y - th * 0.34, 5 * scale, 5 * scale);
          c.fillStyle = col;
        }
      }
      const yTop = baseY - tiers * th;
      if (broken) { // Burned Tower: jagged, roofless
        c.beginPath();
        c.moveTo(px - bw * 0.24, yTop + th * 0.4);
        c.lineTo(px - bw * 0.1, yTop - 12 * scale); c.lineTo(px, yTop);
        c.lineTo(px + bw * 0.12, yTop - 17 * scale); c.lineTo(px + bw * 0.24, yTop + th * 0.4);
        c.closePath(); c.fill();
      } else { // Bell Tower spire + finial
        c.fillRect(px - 2.5 * scale, yTop - 18 * scale, 5 * scale, 20 * scale);
        c.fillStyle = g.accent + '99';
        c.beginPath(); c.arc(px, yTop - 22 * scale, 3.5 * scale, 0, Math.PI * 2); c.fill();
        c.fillStyle = col;
      }
    };
    tower(W * 0.7, 1.45, 6, g.land[0], false);
    tower(W * 0.23, 1.05, 3, g.land[1], true);
    // torii gate on the path between them
    const gx = W * 0.47, gy = H * 0.928, gs = 30;
    c.strokeStyle = g.land[0]; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(gx - gs * 0.6, gy); c.lineTo(gx - gs * 0.48, gy - gs); c.stroke();
    c.beginPath(); c.moveTo(gx + gs * 0.6, gy); c.lineTo(gx + gs * 0.48, gy - gs); c.stroke();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(gx - gs * 0.85, gy - gs); c.lineTo(gx + gs * 0.85, gy - gs); c.stroke();
    c.beginPath(); c.moveTo(gx - gs * 0.58, gy - gs * 0.7); c.lineTo(gx + gs * 0.58, gy - gs * 0.7); c.stroke();
  },
  // HOENN — Sootopolis City: the crater town, houses terraced down to still water
  waves(c, rnd, g) {
    // still crater water
    c.fillStyle = g.land[2];
    c.fillRect(0, H * 0.9, W, H * 0.1);
    c.fillStyle = g.accent + '35';
    for (let i = 0; i < 12; i++) c.fillRect(W * (0.28 + rnd() * 0.44), H * (0.905 + rnd() * 0.07), 26 + rnd() * 44, 1.6);
    // crater rim walls sweeping down from both edges
    for (const dir of [-1, 1]) {
      c.fillStyle = g.land[0];
      c.beginPath();
      c.moveTo(W / 2 + dir * W * 0.6, H);
      c.lineTo(W / 2 + dir * W * 0.6, H * 0.52);
      c.quadraticCurveTo(W / 2 + dir * W * 0.3, H * 0.56, W / 2 + dir * W * 0.1, H * 0.93);
      c.lineTo(W / 2 + dir * W * 0.6, H);
      c.closePath(); c.fill();
      // inner wall highlight ridge
      c.strokeStyle = g.land[1]; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(W / 2 + dir * W * 0.52, H * 0.58);
      c.quadraticCurveTo(W / 2 + dir * W * 0.28, H * 0.62, W / 2 + dir * W * 0.12, H * 0.92);
      c.stroke();
      // white terraced houses stacked up the inner slope
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const bx = W / 2 + dir * (W * 0.135 + t * W * 0.3);
        const by = H * (0.895 - t * 0.21);
        const s = 11 + t * 9;
        c.fillStyle = g.land[1];
        c.fillRect(bx - s / 2, by - s, s, s);
        c.beginPath(); c.arc(bx, by - s, s / 2, Math.PI, 0); c.fill(); // domed roof
        if (rnd() < 0.75) { c.fillStyle = g.accent + '88'; c.fillRect(bx - 1.5, by - s * 0.6, 3, 3); }
      }
    }
    // the Cave of Origin mouth at the waterline
    c.fillStyle = g.land[0];
    c.beginPath(); c.moveTo(W * 0.44, H * 0.9); c.quadraticCurveTo(W * 0.5, H * 0.82, W * 0.56, H * 0.9); c.closePath(); c.fill();
  },
  // SINNOH — Mt. Coronet: the Spear Pillar ruins crown the central summit
  mountain(c, rnd, g) {
    [[g.land[0], H * 0.78, 5], [g.land[1], H * 0.86, 4], [g.land[2], H * 0.94, 3]].forEach(([col, baseY, peaks], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      let x = 0;
      for (let p = 0; p <= peaks; p++) {
        const nx = (p + 0.5) * W / peaks + (rnd() - 0.5) * 60;
        const py = baseY - (60 + rnd() * 90) * (1 - li * 0.22);
        c.lineTo(x, baseY); c.lineTo((x + nx) / 2, py);
        if (li === 0) {
          c.save(); c.fillStyle = '#dde7ff44';
          c.fillRect((x + nx) / 2 - 8, py, 16, 8); c.restore();
        }
        x = nx;
      }
      c.lineTo(W, baseY); c.lineTo(W, H); c.closePath(); c.fill();
    });
    // Mt. Coronet rises above them all
    c.fillStyle = g.land[0];
    c.beginPath(); c.moveTo(W * 0.3, H); c.lineTo(W * 0.44, H * 0.68); c.lineTo(W * 0.5, H * 0.645);
    c.lineTo(W * 0.56, H * 0.68); c.lineTo(W * 0.7, H); c.closePath(); c.fill();
    c.fillStyle = '#dde7ff33';
    c.beginPath(); c.moveTo(W * 0.44, H * 0.68); c.lineTo(W * 0.5, H * 0.645); c.lineTo(W * 0.56, H * 0.68);
    c.lineTo(W * 0.53, H * 0.7); c.lineTo(W * 0.47, H * 0.7); c.closePath(); c.fill();
    // Spear Pillar: broken columns + a fallen lintel on the summit plateau
    const px = W * 0.5, py = H * 0.66;
    c.fillStyle = g.land[1];
    c.fillRect(px - 66, py, 132, 9);
    for (const [ox, ch] of [[-50, 30], [-25, 40], [1, 37], [27, 22], [50, 40]]) {
      c.fillRect(px + ox - 5, py - ch, 10, ch);
      c.fillRect(px + ox - 7, py - ch - 4, 14, 4.5); // capital
    }
    c.fillRect(px - 32, py - 45, 40, 4.5); // surviving lintel
    // a faint glow where Dialga was summoned
    const sg = c.createRadialGradient(px, py - 20, 0, px, py - 20, 60);
    sg.addColorStop(0, g.accent + '30'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(px - 60, py - 80, 120, 100);
  },
  // UNOVA — Castelia City's skyscrapers behind the Skyarrow Bridge
  skyline(c, rnd, g) {
    [[g.land[0], H * 0.82], [g.land[1], H * 0.88]].forEach(([col, baseY], li) => {
      c.fillStyle = col;
      let x = 0;
      while (x < W) {
        const bw = 28 + rnd() * 60, bh = 40 + rnd() * (130 - li * 50);
        c.fillRect(x, baseY - bh, bw, bh + (H - baseY));
        const mast = rnd() < 0.3;
        if (mast) c.fillRect(x + bw / 2 - 1.5, baseY - bh - 14, 3, 14);
        c.save(); c.fillStyle = g.accent + (li ? '26' : '40');
        const dead = SCENE_LIT < 0.2; // blackout: a few candle-lit flats, nothing more
        c.globalAlpha = dead ? 0.45 : Math.min(1, 0.35 + SCENE_LIT * 0.75);
        const wch = dead ? 0.04 : 0.32 * (0.7 + 0.5 * SCENE_LIT);
        for (let wy = baseY - bh + 8; wy < baseY - 8; wy += 14)
          for (let wx = x + 5; wx < x + bw - 6; wx += 12) if (rnd() < wch) c.fillRect(wx, wy, 4, 5);
        // a blackout leaves only the battery-powered aviation lamps on the masts
        if (SCENE_LIT < 0.2 && mast && li === 0) {
          c.globalAlpha = 1; c.fillStyle = 'rgba(255,70,70,0.75)';
          c.fillRect(x + bw / 2 - 1.5, baseY - bh - 16, 3, 3);
        }
        c.restore();
        x += bw + 6 + rnd() * 18;
      }
    });
    silhouetteBase(c, g.land[2], H * 0.95);
    // Skyarrow Bridge across the bay
    const dy = H * 0.912, t1 = W * 0.28, t2 = W * 0.72, th = H * 0.105;
    c.fillStyle = g.land[2];
    for (const tx of [t1, t2]) { c.fillRect(tx - 4.5, dy - th, 9, th); c.fillRect(tx - 7, dy - th - 5, 14, 5); }
    c.fillRect(0, dy - 3, W, 7); // deck
    const cableY = t => { // quadratic sag between the two towers
      const u = (t - t1) / (t2 - t1);
      return (1 - u) * (1 - u) * (dy - th) + 2 * (1 - u) * u * (dy - 6) + u * u * (dy - th);
    };
    c.strokeStyle = g.accent + (SCENE_LIT < 0.2 ? '3a' : '99'); c.lineWidth = 2;
    c.beginPath(); c.moveTo(t1, dy - th); c.quadraticCurveTo(W / 2, dy - 6, t2, dy - th); c.stroke();
    c.beginPath(); c.moveTo(0, dy - 4); c.quadraticCurveTo(t1 * 0.55, dy - th * 0.9, t1, dy - th); c.stroke();
    c.beginPath(); c.moveTo(W, dy - 4); c.quadraticCurveTo(W - (W - t2) * 0.55, dy - th * 0.9, t2, dy - th); c.stroke();
    c.lineWidth = 1.2; // hangers
    for (let hx = t1 + 36; hx < t2 - 20; hx += 36) {
      c.beginPath(); c.moveTo(hx, cableY(hx)); c.lineTo(hx, dy - 3); c.stroke();
    }
    c.fillStyle = SCENE_LIT < 0.2 ? 'rgba(255,70,70,0.55)' : g.accent + 'bb'; // deck lights (red emergency lamps in a blackout)
    for (let lx = 24; lx < W; lx += 60) c.fillRect(lx, dy - 6, 2.5, 2.5);
  },
  // KALOS — Lumiose City: Prism Tower rising over Haussmann boulevards
  tower(c, rnd, g) {
    silhouetteBase(c, g.land[2], H * 0.94);
    // uniform Parisian terraces, leaving the central plaza open
    let bx = 0;
    while (bx < W) {
      const bw = 64 + rnd() * 46, bh = 44 + rnd() * 16;
      if (Math.abs(bx + bw / 2 - W / 2) > W * 0.14) {
        c.fillStyle = g.land[1];
        c.fillRect(bx, H * 0.94 - bh, bw, bh);
        c.fillStyle = g.land[0];
        c.fillRect(bx + 2, H * 0.94 - bh - 6, bw - 4, 7); // mansard roofline
        bWindows(c, rnd, bx, H * 0.94 - bh + 6, bw, bh - 8, g.accent + '4d', 0.45, 3, 9);
      }
      bx += bw + 8;
    }
    // Prism Tower — flared lattice legs, platforms, beacon
    const tx = W * 0.5, baseY = H * 0.94, th = H * 0.4;
    c.fillStyle = g.land[0];
    c.beginPath();
    c.moveTo(tx - 62, baseY);
    c.quadraticCurveTo(tx - 20, baseY - th * 0.5, tx - 9, baseY - th);
    c.lineTo(tx + 9, baseY - th);
    c.quadraticCurveTo(tx + 20, baseY - th * 0.5, tx + 62, baseY);
    c.closePath(); c.fill();
    // arch cut out between the legs
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(tx - 20, baseY); c.quadraticCurveTo(tx, baseY - 48, tx + 20, baseY); c.closePath(); c.fill();
    c.restore();
    // platforms + lattice hint
    c.fillStyle = g.land[2];
    for (const f of [0.32, 0.6, 0.85]) {
      const y = baseY - th * f, w = 62 * (1 - f * 0.72) + 12;
      c.fillRect(tx - w, y - 3, w * 2, 6);
    }
    c.strokeStyle = g.land[2]; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(tx - 34, baseY - th * 0.16); c.lineTo(tx + 16, baseY - th * 0.52); c.stroke();
    c.beginPath(); c.moveTo(tx + 34, baseY - th * 0.16); c.lineTo(tx - 16, baseY - th * 0.52); c.stroke();
    // crown + glowing beacon
    c.fillStyle = g.land[0];
    c.fillRect(tx - 13, baseY - th - 10, 26, 12);
    const by = baseY - th - 17;
    const bg = c.createRadialGradient(tx, by, 0, tx, by, 42);
    bg.addColorStop(0, g.accent + '66'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = bg; c.fillRect(tx - 42, by - 42, 84, 84);
    c.fillStyle = g.accent + 'dd';
    c.beginPath(); c.arc(tx, by, 5, 0, Math.PI * 2); c.fill();
  },
  // ALOLA — Iki Town: the festival stage and its torches under Mount Lanakila
  palms(c, rnd, g) {
    c.fillStyle = g.land[0];
    c.beginPath(); c.moveTo(W * 0.6, H * 0.9); c.lineTo(W * 0.75, H * 0.66); c.lineTo(W * 0.79, H * 0.66); c.lineTo(W * 0.94, H * 0.9); c.closePath(); c.fill();
    c.fillStyle = '#dde7ff2e'; // snow on Lanakila's peak
    c.beginPath(); c.moveTo(W * 0.75, H * 0.66); c.lineTo(W * 0.79, H * 0.66); c.lineTo(W * 0.81, H * 0.7); c.lineTo(W * 0.73, H * 0.7); c.closePath(); c.fill();
    [[g.land[1], H * 0.92], [g.land[2], H * 0.96]].forEach(([col, baseY], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, baseY + Math.sin(x * 0.015 + li) * 5);
      c.lineTo(W, H); c.closePath(); c.fill();
    });
    // the festival stage — raised deck, arched roof, flanking torches
    const sx = W * 0.42, sy = H * 0.93;
    c.fillStyle = g.land[1];
    c.fillRect(sx - 72, sy - 18, 144, 10);
    for (const px of [-60, -22, 22, 60]) c.fillRect(sx + px - 3, sy - 9, 6, 16);
    c.strokeStyle = g.land[0]; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx - 54, sy - 18); c.lineTo(sx - 44, sy - 58); c.stroke();
    c.beginPath(); c.moveTo(sx + 54, sy - 18); c.lineTo(sx + 44, sy - 58); c.stroke();
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(sx - 52, sy - 56); c.quadraticCurveTo(sx, sy - 74, sx + 52, sy - 56); c.stroke();
    for (const tdir of [-1, 1]) { // tiki torches with living flames
      const tx = sx + tdir * 96;
      c.fillStyle = g.land[2]; c.fillRect(tx - 2.5, sy - 40, 5, 40);
      const fg = c.createRadialGradient(tx, sy - 48, 0, tx, sy - 48, 16);
      fg.addColorStop(0, g.accent + 'ee'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fg; c.beginPath(); c.arc(tx, sy - 48, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = g.accent;
      c.beginPath(); c.ellipse(tx, sy - 48, 3.5, 6.5, 0, 0, Math.PI * 2); c.fill();
    }
    // palms framing the scene
    for (const [px, lean, s] of [[W * 0.09, 0.3, 1], [W * 0.9, -0.35, 1.1]]) {
      const baseY = H * 0.94, top = baseY - 110 * s;
      c.strokeStyle = g.land[2]; c.lineWidth = 9 * s;
      c.beginPath(); c.moveTo(px, baseY);
      c.quadraticCurveTo(px + lean * 50, baseY - 60 * s, px + lean * 80, top); c.stroke();
      c.lineWidth = 5 * s;
      for (let fdir = 0; fdir < 6; fdir++) {
        const a = -Math.PI / 2 + (fdir - 2.5) * 0.5;
        c.beginPath(); c.moveTo(px + lean * 80, top);
        c.quadraticCurveTo(px + lean * 80 + Math.cos(a) * 45 * s, top + Math.sin(a) * 45 * s - 12,
          px + lean * 80 + Math.cos(a) * 78 * s, top + Math.sin(a) * 78 * s + 22 * s);
        c.stroke();
      }
    }
  },
  // GALAR — Wyndon: Rose of the Rondelands stadium + the great ferris wheel
  stadium(c, rnd, g) {
    silhouetteBase(c, g.land[2], H * 0.95);
    c.fillStyle = g.land[1];
    let x = 0;
    while (x < W) { const bw = 40 + rnd() * 70, bh = 24 + rnd() * 46; c.fillRect(x, H * 0.95 - bh, bw, bh); x += bw + 10 + rnd() * 30; }
    // floodlight towers
    for (const sx of [W * 0.1, W * 0.32]) {
      c.fillRect(sx, H * 0.95 - 104, 14, 104);
      c.fillStyle = g.land[0] + '88';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sx + 7 + i * 8, H * 0.95 - 114 - i * 15, 7 + i * 4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = g.land[1];
    }
    // the stadium dome, energy arcing over it
    const dx = W * 0.5, dy = H * 0.95, dr = Math.min(W * 0.19, 200);
    c.fillStyle = g.land[0];
    c.beginPath(); c.arc(dx, dy, dr, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = g.accent + '4d'; c.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      c.beginPath(); c.arc(dx, dy, dr * i / 6, Math.PI, 0); c.stroke();
    }
    c.fillStyle = g.accent + '33';
    c.fillRect(dx - dr, dy - 4, dr * 2, 4);
    // Wyndon's ferris wheel on the riverside
    const wx = W * 0.85, wr = Math.min(H * 0.13, 105), wy = H * 0.95, cy = wy - wr - 16;
    c.strokeStyle = g.land[1]; c.lineWidth = 5;
    c.beginPath(); c.moveTo(wx - wr * 0.5, wy); c.lineTo(wx, cy); c.lineTo(wx + wr * 0.5, wy); c.stroke(); // A-frame
    c.lineWidth = 3;
    c.beginPath(); c.arc(wx, cy, wr, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      c.beginPath(); c.moveTo(wx, cy); c.lineTo(wx + Math.cos(a) * wr, cy + Math.sin(a) * wr); c.stroke();
    }
    for (let i = 0; i < 12; i++) { // lit cabins around the rim
      const a = i * Math.PI / 6 + 0.26;
      c.fillStyle = i % 3 ? g.accent + 'aa' : g.land[1];
      c.fillRect(wx + Math.cos(a) * wr - 3, cy + Math.sin(a) * wr - 1, 6, 8);
    }
  },
  // PALDEA — Mesagoza: the city wall, its grand gate and the Academy above
  mesa(c, rnd, g) {
    const rg = c.createRadialGradient(W / 2, H * 0.98, 10, W / 2, H * 0.98, W * 0.3);
    rg.addColorStop(0, g.accent + '40'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, H * 0.5, W, H * 0.5);
    // distant mesas
    [[g.land[0], H * 0.82], [g.land[1], H * 0.88]].forEach(([col, baseY]) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      let x = 0; c.lineTo(0, baseY);
      while (x < W) {
        const flat = 60 + rnd() * 130, gap = 40 + rnd() * 80, mh = 30 + rnd() * 44;
        c.lineTo(x + 14, baseY - mh); c.lineTo(x + flat - 14, baseY - mh); c.lineTo(x + flat, baseY);
        x += flat + gap; c.lineTo(Math.min(x, W), baseY);
      }
      c.lineTo(W, H); c.closePath(); c.fill();
    });
    // Mesagoza's city wall with lit houses along the top
    c.fillStyle = g.land[2];
    c.fillRect(0, H * 0.945, W, H * 0.055);
    for (let hx = 12; hx < W - 30; hx += 46 + rnd() * 40) {
      if (Math.abs(hx - W / 2) < 120) continue; // keep the gate clear
      const hw = 22 + rnd() * 18, hh = 12 + rnd() * 10;
      c.fillRect(hx, H * 0.945 - hh, hw, hh);
      if (rnd() < 0.6) { c.fillStyle = g.accent + '66'; c.fillRect(hx + hw / 2 - 2, H * 0.945 - hh + 3, 4, 4); c.fillStyle = g.land[2]; }
    }
    // the grand gate
    const gx = W / 2, gy = H * 0.945;
    c.fillStyle = g.land[2];
    c.fillRect(gx - 92, gy - 36, 184, 36);
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(gx - 26, gy); c.lineTo(gx - 26, gy - 12); c.quadraticCurveTo(gx, gy - 40, gx + 26, gy - 12); c.lineTo(gx + 26, gy); c.closePath(); c.fill();
    c.restore();
    // the Academy crowning the city — hall, twin turrets, clock tower + dome
    c.fillStyle = g.land[1];
    c.fillRect(gx - 72, gy - 74, 144, 40);
    bWindows(c, rnd, gx - 66, gy - 70, 132, 32, g.accent + '55', 0.4, 3, 9);
    c.fillStyle = g.land[0];
    for (const ox of [-56, 56]) {
      c.fillRect(gx + ox - 9, gy - 94, 18, 60);
      c.beginPath(); c.moveTo(gx + ox - 11, gy - 94); c.lineTo(gx + ox, gy - 107); c.lineTo(gx + ox + 11, gy - 94); c.closePath(); c.fill();
    }
    c.fillRect(gx - 13, gy - 120, 26, 88);
    c.beginPath(); c.arc(gx, gy - 120, 14, Math.PI, 0); c.fill();
    c.fillStyle = g.accent + 'cc';
    c.beginPath(); c.arc(gx, gy - 102, 5.5, 0, Math.PI * 2); c.fill(); // the clock face
  },
};

// ============================================================
//  STARFIELD
// ============================================================
let stars = [];
function buildStars() {
  stars = [];
  const n = Math.floor((W * H) / 5200);
  for (let i = 0; i < n; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.75, z: 0.3 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2 });
  }
}

// ---- per-region ambient weather + shooting stars ----
// The region's signature weather (AMBIENT_TYPES) is now a per-STAGE recipe:
// the three stages read as three moments — arrival calm, challenge weather
// (more of it, wind-driven), and a finale mood. Each layer: kind, cap, spawn
// rate, wind (px/s added to drift), optional y band [0..1] and colour.
const AMBIENT_TYPES = ['firefly', 'petal', 'rain', 'snow', 'neon', 'sparkle', 'ember', 'mist', 'dust'];
const AMBIENT_STAGES = [
  [ [{ k: 'dust', cap: 14, rate: 6, band: [0.45, 0.95] }],                                 // Kanto: sunrise pollen
    [{ k: 'rain', cap: 44, rate: 44, wind: -90 }],                                          //   stormfront showers
    [{ k: 'firefly', cap: 34, rate: 14 }] ],                                               //   psychic night (title)
  [ [{ k: 'leaf', cap: 20, rate: 8 }],                                                      // Johto: autumn leaves
    [{ k: 'ember', cap: 12, rate: 4, col: '#ffcf7a' }, { k: 'leaf', cap: 10, rate: 4, wind: 20 }], // lantern sparks
    [{ k: 'rain', cap: 80, rate: 75, wind: -150 }, { k: 'leaf', cap: 10, rate: 5, wind: -70 }] ],  // sacred tempest
  [ [{ k: 'sparkle', cap: 10, rate: 6, band: [0.84, 0.98], col: '#eafcff' }],               // Hoenn: sea glints
    [{ k: 'rain', cap: 90, rate: 90, wind: -40 }, { k: 'mist', cap: 6, rate: 3 }],          //   monsoon
    [{ k: 'mist', cap: 10, rate: 5 }, { k: 'sparkle', cap: 8, rate: 4, col: '#fff4d6' }] ], //   above the storm
  [ [{ k: 'snow', cap: 18, rate: 8 }],                                                      // Sinnoh: light snow
    [{ k: 'snow', cap: 60, rate: 40, wind: 70 }, { k: 'mist', cap: 8, rate: 4 }],           //   whiteout
    [{ k: 'snow', cap: 12, rate: 6 }, { k: 'sparkle', cap: 10, rate: 5, col: '#cdd8ff' }] ], //  time fracture
  [ [{ k: 'dust', cap: 12, rate: 5 }],                                                      // Unova: city haze
    [{ k: 'neon', cap: 30, rate: 14 }],                                                     //   rush hour
    [{ k: 'rain', cap: 50, rate: 50, wind: -50 }, { k: 'neon', cap: 5, rate: 2 }] ],        //   blackout rain
  [ [{ k: 'petal', cap: 24, rate: 10 }],                                                    // Kalos: rose petals
    [{ k: 'sparkle', cap: 30, rate: 14 }],                                                  //   festival
    [{ k: 'ash', cap: 30, rate: 12 }] ],                                                    //   black-sun ash
  [ [{ k: 'sparkle', cap: 10, rate: 6, band: [0.86, 0.98], col: '#eafcff' }],               // Alola: sea glints
    [{ k: 'ember', cap: 40, rate: 20 }],                                                    //   fire festival
    [{ k: 'firefly', cap: 22, rate: 10 }, { k: 'sparkle', cap: 10, rate: 5, col: '#dfe6ff' }] ], // lunar rite
  [ [{ k: 'mist', cap: 10, rate: 14 }],                                                     // Galar: overcast
    [{ k: 'rain', cap: 40, rate: 40, wind: -30 }, { k: 'mist', cap: 6, rate: 3 }],          //   floodlit drizzle
    [{ k: 'neon', cap: 30, rate: 14 }] ],                                                   //   darkest-day energy
  [ [{ k: 'dust', cap: 24, rate: 10 }],                                                     // Paldea: golden dust
    [{ k: 'dust', cap: 40, rate: 18, wind: 40 }],                                           //   treasure-road wind
    [{ k: 'sparkle', cap: 16, rate: 8, col: '#ffe9b0' }, { k: 'firefly', cap: 16, rate: 8 }] ], // temporal garden
];
let ambient = [], ambientGen = -1, shootStars = [];
const ambientCount = {};
// KANTO DISTANT FLOCKS (Milestone 1): every so often a loose V of tiny bird
// silhouettes drifts across the high sky over the hills — pure background
// life. Cheap on purpose: ≤2 flocks × 5 birds, two strokes per bird, no
// gradients, drawn behind everything with low alpha. Daylight only — dark
// birds on a night sky were invisible anyway.
let flocks = [], flockCD = 6;
function updateFlocks(dt, genIdx) {
  if (genIdx !== 0 || SCENE_DARK >= 0.5) { flocks = []; return; }
  flockCD -= dt;
  if (flockCD <= 0 && flocks.length < 2) {
    flockCD = 14 + Math.random() * 12;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = H * (0.1 + Math.random() * 0.16);
    const x0 = dir > 0 ? -70 : W + 70;
    const n = 4 + Math.floor(Math.random() * 2);
    const birds = [];
    for (let i = 0; i < n; i++) {
      // a loose trailing V: alternate sides, fall back with rank
      const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      birds.push({ ox: -dir * rank * 14, oy: side * rank * 6 + (Math.random() - 0.5) * 3, ph: Math.random() * Math.PI * 2 });
    }
    flocks.push({ x: x0, y: y0, vx: dir * (26 + Math.random() * 12), birds, t: 0 });
  }
  for (const f of flocks) { f.t += dt; f.x += f.vx * dt; f.y += Math.sin(f.t * 0.5) * 2.5 * dt; }
  flocks = flocks.filter(f => f.x > -140 && f.x < W + 140);
}
function drawFlocks() {
  if (!flocks.length) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(10,18,34,0.5)';
  ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (const f of flocks) {
    for (const b of f.birds) {
      const bx = f.x + b.ox, by = f.y + b.oy;
      const flap = Math.sin(f.t * 7 + b.ph) * 2.6; // wingbeat
      ctx.beginPath();
      ctx.moveTo(bx - 3.6, by - flap);
      ctx.quadraticCurveTo(bx, by + 1.2, bx + 3.6, by - flap);
      ctx.stroke();
    }
  }
  ctx.restore();
}
// the scene key the renderer last baked (region*3 + stage) — the weather
// follows it so the sim-side caller needs no stage argument
function ambientRecipe(genIdx) {
  const st = (bgGen >= 0 && Math.floor(bgGen / 3) === genIdx) ? bgGen % 3 : 0;
  const row = AMBIENT_STAGES[genIdx] || AMBIENT_STAGES[0];
  return { key: genIdx * 3 + st, layers: row[st] || row[0] };
}
function spawnAmbient(L) {
  const a = { k: L.k, ph: Math.random() * Math.PI * 2, r: 1 + Math.random() * 2, col: L.col || null };
  const wind = L.wind || 0;
  switch (L.k) {
    case 'firefly': a.x = Math.random() * W; a.y = H * (0.55 + Math.random() * 0.4); a.vx = (Math.random() - 0.5) * 18; a.vy = (Math.random() - 0.5) * 12; break;
    case 'petal': case 'leaf': case 'snow': case 'ash':
      a.x = Math.random() * (W + Math.abs(wind) * 2) - Math.max(0, wind) * 2; a.y = -8;
      a.vx = (Math.random() - 0.5) * 24 + wind;
      a.vy = L.k === 'snow' ? 32 + Math.random() * 26 : L.k === 'ash' ? 16 + Math.random() * 18 : 46 + Math.random() * 30;
      if (L.k === 'snow' && wind) a.vy *= 1.5;
      break;
    case 'rain': a.x = Math.random() * (W + 160) - (wind > 0 ? 160 : 0); a.y = -10; a.vx = wind || -60; a.vy = 540 + Math.random() * 160; break;
    case 'neon': case 'ember': a.x = Math.random() * W; a.y = H + 6; a.vx = (Math.random() - 0.5) * 14 + wind; a.vy = -(26 + Math.random() * 40); break;
    case 'sparkle': a.x = Math.random() * W; a.y = Math.random() * H; a.vx = 0; a.vy = 0; a.life = 1.6; break;
    case 'mist': a.x = -80; a.y = H * (0.75 + Math.random() * 0.2); a.vx = 12 + Math.random() * 14; a.vy = 0; a.r = 40 + Math.random() * 50; break;
    case 'dust': a.x = Math.random() * W; a.y = H * (0.3 + Math.random() * 0.6); a.vx = 8 + Math.random() * 10 + wind; a.vy = (Math.random() - 0.5) * 6; break;
  }
  if (L.band) a.y = H * (L.band[0] + Math.random() * (L.band[1] - L.band[0])); // sparkle / dust only
  ambient.push(a);
}
function updateAmbient(dt, genIdx) {
  const rec = ambientRecipe(genIdx);
  if (ambientGen !== rec.key) { ambient = []; ambientGen = rec.key; }
  updateFlocks(dt, genIdx);
  // reduced effects thin the weather (purely cosmetic — Math.random only)
  const thin = (typeof effectsLevel === 'function' && effectsLevel() >= 2) ? 0.5 : 1;
  for (const L of rec.layers) ambientCount[L.k] = 0;
  for (const a of ambient) if (ambientCount[a.k] !== undefined) ambientCount[a.k]++;
  for (const L of rec.layers) {
    if (ambientCount[L.k] < L.cap * thin && Math.random() < dt * L.rate) spawnAmbient(L);
  }
  for (const a of ambient) {
    a.ph += dt * 2;
    a.x += (a.vx + (a.k === 'rain' ? 0 : Math.sin(a.ph) * 10)) * dt;
    a.y += a.vy * dt;
    if (a.life != null) a.life -= dt;
  }
  ambient = ambient.filter(a => a.x > -200 && a.x < W + 200 && a.y > -40 && a.y < H + 40 && (a.life == null || a.life > 0));
  // shooting stars, rare and pretty — and only in a sky dark enough to show
  // them (they used to streak across the noon sun)
  if (SCENE_DARK >= 0.45 && Math.random() < dt * 0.035) {
    shootStars.push({ x: Math.random() * W * 0.8, y: Math.random() * H * 0.3, vx: 420 + Math.random() * 220, vy: 130 + Math.random() * 80, life: 0.7 });
  }
  for (const s of shootStars) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
  shootStars = shootStars.filter(s => s.life > 0);
}
function drawAmbient(genIdx) {
  if (genIdx === 0) drawFlocks(); // Kanto: distant birds behind the weather
  const accent = SKIN.gens[genIdx].accent;
  for (const a of ambient) {
    switch (a.k) {
      case 'firefly': {
        const tw = 0.5 + 0.5 * Math.sin(a.ph * 2.4);
        ctx.globalAlpha = tw * 0.7;
        ctx.fillStyle = '#d4ff8a';
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.6 + tw, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'petal': case 'leaf':
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = a.k === 'leaf' ? '#e0925a' : '#f1b7e4';
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph);
        ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      case 'rain':
        // the streak leans WITH the drift (it used to lean against it)
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#9fd4e8'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.vx / a.vy * 13, a.y - 13); ctx.stroke();
        break;
      case 'snow':
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#eef3ff';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        break;
      case 'ash':
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#a89aa2';
        ctx.fillRect(a.x, a.y, 1.6 + a.r * 0.4, 1.6 + a.r * 0.4);
        break;
      case 'neon': case 'ember':
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(a.ph * 3);
        ctx.fillStyle = a.col || (a.k === 'ember' ? '#ffab66' : accent);
        ctx.fillRect(a.x, a.y, 2.2, 2.2);
        break;
      case 'sparkle': {
        const tw = Math.sin((a.life / 1.6) * Math.PI);
        ctx.globalAlpha = tw * 0.8;
        ctx.fillStyle = a.col || '#ffd6ef';
        ctx.fillRect(a.x - 0.5, a.y - 3.5 * tw, 1, 7 * tw);
        ctx.fillRect(a.x - 3.5 * tw, a.y - 0.5, 7 * tw, 1);
        break;
      }
      case 'mist':
        // baked blob — a radial gradient per mote per frame was real GC churn
        ctx.globalAlpha = 1;
        ctx.drawImage(mistBlobSprite(), a.x - a.r, a.y - a.r, a.r * 2, a.r * 2);
        break;
      case 'dust':
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(a.ph * 2);
        ctx.fillStyle = '#e8c98a';
        ctx.fillRect(a.x, a.y, 1.6, 1.6);
        break;
    }
  }
  ctx.globalAlpha = 1;
  for (const s of shootStars) {
    // two solid segments fade the tail — no per-frame gradient allocation
    const a = Math.min(1, s.life / 0.3) * 0.55 * Math.min(1, SCENE_DARK * 1.25);
    const mx = s.x - s.vx * 0.06, my = s.y - s.vy * 0.06;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(mx, my); ctx.stroke();
    ctx.globalAlpha = a * 0.35;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
let mistBlob = null;
function mistBlobSprite() {
  if (mistBlob) return mistBlob;
  const S = 96;
  mistBlob = document.createElement('canvas'); mistBlob.width = mistBlob.height = S;
  const c = mistBlob.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(190,210,225,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  return mistBlob;
}
