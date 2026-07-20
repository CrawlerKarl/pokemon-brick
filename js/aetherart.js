'use strict';
// ============================================================
//  AETHERART — the AETHERFALL skin's procedural unit renderer (Round S5).
//  Every unit, pilot vessel, sentinel, legendary and mythic is DRAWN, not
//  loaded: a parts-based painter composes body archetypes (wisp / beast /
//  avian / serpent / golem / critter / drone / knight / fish / moth) with
//  a design language driven by the world's three acts —
//    act I  (realms 1–3, MAGIC):     organic curves, rune accents
//    act II (realms 4–6, TECH):      angular chassis, visors, thrusters
//    act III(realms 7–9, MAGITECH):  chrome + glowing runic inlays
//  Looks are DETERMINISTIC (seeded per line id — a line's three forms
//  share anatomy and escalate size/trim/crown), baked ONCE to an
//  offscreen canvas and cached (bake-time gradients are fine; the
//  per-frame rule is untouched). The bake carries .complete /
//  .naturalWidth so every getSprite call site works unchanged.
//  ZERO network access — the skin ships no image assets at all.
// ============================================================
(() => {
  const AF = SKINS.aetherfall;
  const CACHE = {};
  // native roundRect shipped ~2022; ancient WebKit gets a quiet polyfill so
  // a bake can never throw mid-boot
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(Math.abs(r) || 0, Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  // ---------- deterministic per-unit randomness (never gameRand) ----------
  function rng(seed) {
    let s = (Math.imul(seed, 2654435761) ^ 0x9e3779b9) >>> 0;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // ---------- palette helpers ----------
  function hexRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function rgbHex(r, g, b) {
    const c = v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(hex, f) { // f<0 darken · f>0 lighten toward white
    const [r, g, b] = hexRgb(hex);
    return f >= 0 ? rgbHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
      : rgbHex(r * (1 + f), g * (1 + f), b * (1 + f));
  }
  function mix(h1, h2, t) {
    const a = hexRgb(h1), b = hexRgb(h2);
    return rgbHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }
  function hueShift(hex, deg) { // rough hue rotation for RADIANT variants
    const [r, g, b] = hexRgb(hex);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return hex;
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = ((h * 60 + deg) % 360 + 360) % 360;
    const s = d / (255 - Math.abs(2 * l - 255));
    const C = (255 - Math.abs(2 * l - 255)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
    const [R, G, B] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X]
      : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
    return rgbHex(R + m, G + m, B + m);
  }
  const ACT_ACCENT = ['#c879ff', '#4de0f2', '#ffd166']; // magic · tech · magitech

  // aetherfall re-tints a few types whose pokemon hues read muddy on the
  // procedural bodies (dark = dusk violet, not brown; ground = warm ochre)
  const TYPE_TINT = { dark: '#7e6bb5', ground: '#d9a05b', normal: '#b3a08a' };
  function makePalette(type, act, shiny) {
    let base = TYPE_TINT[type] || TYPE_COLORS[type] || '#90a4ae';
    if (shiny) base = hueShift(base, 150);
    return {
      base,
      dark: shade(base, -0.45), deep: shade(base, -0.66),
      light: shade(base, 0.38), pale: shade(base, 0.72),
      glow: shiny ? '#ffe97a' : shade(base, 0.55),
      accent: shiny ? '#ffd700' : ACT_ACCENT[act],
      metal: act === 2 ? '#c8d4e0' : '#9aa8b5',
      metalDark: act === 2 ? '#5c6c7c' : '#4e5a64',
      ink: '#101522',
    };
  }

  // ---------- shared part painters (all draw around 0,0 in ~±50 units) ----
  // smooth organic blob through radial control points
  function blob(c, pts, close = true) {
    c.beginPath();
    const n = pts.length;
    c.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    if (close) c.closePath();
  }
  function radialPts(r0, wob, R, phase = 0, n = 10) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + phase;
      const rr = r0 * (1 + wob * (R() - 0.5));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]);
    }
    return pts;
  }
  function eye(c, x, y, r, P, act, R) {
    if (act === 1) { // tech visor slit
      c.fillStyle = P.ink;
      c.beginPath(); c.roundRect(x - r * 1.5, y - r * 0.62, r * 3, r * 1.24, r * 0.6); c.fill();
      c.fillStyle = P.glow;
      c.beginPath(); c.roundRect(x - r * 1.2, y - r * 0.34, r * 2.4, r * 0.68, r * 0.34); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(x - r * 0.55, y - r * 0.05, r * 0.22, 0, Math.PI * 2); c.fill();
      return;
    }
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(x, y, r, r * 1.14, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.deep;
    c.beginPath(); c.arc(x + r * 0.12, y + r * 0.12, r * 0.62, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(x - r * 0.2, y - r * 0.24, r * 0.26, 0, Math.PI * 2); c.fill();
  }
  function runeRing(c, r, P, R, n = 5) { // act-I magic halo of small runes
    c.save();
    c.strokeStyle = P.accent; c.globalAlpha = 0.85; c.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.6;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5 - r * 0.62;
      c.beginPath();
      const k = Math.floor(R() * 3);
      if (k === 0) { c.moveTo(x - 3, y + 3); c.lineTo(x, y - 4); c.lineTo(x + 3, y + 3); }
      else if (k === 1) { c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 3, y - 3); c.lineTo(x - 3, y + 3); }
      else { c.arc(x, y, 3.2, 0, Math.PI * 1.5); }
      c.stroke();
    }
    c.restore();
  }
  function thruster(c, x, y, w, P) { // act-II engine glow
    const g = c.createLinearGradient(x, y, x, y + w * 2.4);
    g.addColorStop(0, P.glow); g.addColorStop(1, 'rgba(80,200,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - w, y); c.lineTo(x + w, y); c.lineTo(x, y + w * 2.4); c.closePath(); c.fill();
    c.fillStyle = P.metalDark;
    c.beginPath(); c.roundRect(x - w * 1.1, y - w * 1.4, w * 2.2, w * 1.5, w * 0.5); c.fill();
  }
  function panelLines(c, P, R, r) { // act-II chassis seams
    c.strokeStyle = 'rgba(10,16,26,0.5)'; c.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const y = (R() - 0.35) * r * 1.1;
      c.beginPath(); c.moveTo(-r * (0.5 + R() * 0.3), y);
      c.quadraticCurveTo(0, y + r * 0.12, r * (0.5 + R() * 0.3), y); c.stroke();
    }
  }
  function inlay(c, P, R, r) { // act-III glowing runic circuit inlays
    c.save();
    c.strokeStyle = P.base; c.lineWidth = 2.2; c.shadowColor = P.base; c.shadowBlur = 6;
    for (let i = 0; i < 3; i++) {
      const a0 = R() * Math.PI * 2, len = 0.5 + R() * 0.9;
      c.beginPath();
      c.arc(0, 0, r * (0.45 + R() * 0.35), a0, a0 + len);
      c.stroke();
      const ax = Math.cos(a0 + len) * r * 0.6, ay = Math.sin(a0 + len) * r * 0.6;
      c.beginPath(); c.arc(ax, ay, 1.8, 0, Math.PI * 2); c.fillStyle = P.glow; c.fill();
    }
    c.restore();
  }
  function crown(c, y, w, P, tier) { // form-III / boss regalia
    c.fillStyle = tier >= 3 ? '#ffd700' : P.accent;
    c.beginPath();
    const k = 3 + (tier >= 3 ? 2 : 0);
    c.moveTo(-w, y);
    for (let i = 0; i <= k; i++) {
      const x = -w + (2 * w * i) / k;
      c.lineTo(x - w / k * 0.5, y); c.lineTo(x, y - w * 0.42 - (i === Math.floor(k / 2) ? w * 0.2 : 0));
    }
    c.lineTo(w, y); c.closePath(); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(0, y - w * 0.5, w * 0.1, 0, Math.PI * 2); c.fill();
  }
  function hornPair(c, x, y, s, P, curve, R) {
    for (const side of [-1, 1]) {
      c.fillStyle = P.pale;
      c.beginPath();
      c.moveTo(side * x, y);
      c.quadraticCurveTo(side * (x + s * curve), y - s * 0.8, side * (x + s * 0.45), y - s);
      c.quadraticCurveTo(side * (x + s * 0.2), y - s * 0.5, side * (x - s * 0.18), y);
      c.closePath(); c.fill();
    }
  }
  function wingPair(c, x, y, span, P, act, R, drop = 0.35) {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1); c.translate(x, y);
      if (act === 1) { // tech: angular panel wings
        c.fillStyle = P.metal;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(span, -span * 0.34); c.lineTo(span * 1.06, -span * 0.1);
        c.lineTo(span * 0.4, span * drop); c.closePath(); c.fill();
        c.fillStyle = P.base;
        c.beginPath(); c.moveTo(span * 0.16, 0); c.lineTo(span * 0.82, -span * 0.22); c.lineTo(span * 0.5, span * drop * 0.6); c.closePath(); c.fill();
      } else { // organic: two feathered lobes
        c.fillStyle = mix(P.base, '#ffffff', 0.15);
        c.beginPath(); c.moveTo(0, 0);
        c.quadraticCurveTo(span * 0.5, -span * 0.62, span, -span * 0.3);
        c.quadraticCurveTo(span * 0.62, span * 0.05, span * 0.4, span * drop * 0.5);
        c.quadraticCurveTo(span * 0.2, span * drop, 0, span * drop * 0.4);
        c.closePath(); c.fill();
        c.strokeStyle = P.dark; c.lineWidth = 1.6;
        for (let i = 1; i <= 2; i++) {
          c.beginPath(); c.moveTo(span * 0.12 * i, -span * 0.04 * i);
          c.quadraticCurveTo(span * 0.5, -span * 0.4 + span * 0.12 * i, span * (0.9 - 0.08 * i), -span * 0.26 + span * 0.1 * i);
          c.stroke();
        }
        if (act === 2) { c.strokeStyle = P.glow; c.lineWidth = 1.8; c.beginPath(); c.moveTo(span * 0.14, 0); c.quadraticCurveTo(span * 0.5, -span * 0.5, span * 0.95, -span * 0.28); c.stroke(); }
      }
      c.restore();
    }
  }
  function shadowBase(c, w) {
    c.fillStyle = 'rgba(8,12,22,0.28)';
    c.beginPath(); c.ellipse(0, 44, w, w * 0.22, 0, 0, Math.PI * 2); c.fill();
  }

  // ---------- body archetypes ----------
  function paintWisp(c, P, R, act, o) { // spirits, fairies, seers
    const r = 26 + o.bulk * 5;
    // trailing skirt
    c.fillStyle = P.dark;
    const tail = [];
    const tn = 5 + Math.floor(R() * 3);
    for (let i = 0; i <= tn; i++) {
      const x = -r + (2 * r * i) / tn;
      tail.push([x, 18 + ((i % 2) ? 14 + R() * 8 : 4)]);
    }
    c.beginPath(); c.moveTo(-r, 6);
    for (const [x, y] of tail) c.lineTo(x, y);
    c.lineTo(r, 6); c.closePath(); c.fill();
    // body teardrop
    const g = c.createRadialGradient(0, -8, 2, 0, -2, r * 1.5);
    g.addColorStop(0, P.light); g.addColorStop(0.55, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    blob(c, radialPts(r, 0.16, R, 0.4), true); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    // inner core
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    c.beginPath(); c.ellipse(0, 2, r * 0.3, r * 0.4, 0, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    if (act === 0) runeRing(c, r * 1.3, P, R);
    if (act === 2) inlay(c, P, R, r);
    // little arms
    for (const side of [-1, 1]) {
      c.fillStyle = P.base;
      c.beginPath(); c.ellipse(side * (r + 4), -2, 7, 4.6, side * 0.5, 0, Math.PI * 2); c.fill();
    }
    eye(c, -r * 0.34, -r * 0.4, 4.6 + o.bulk * 0.5, P, act, R);
    eye(c, r * 0.34, -r * 0.4, 4.6 + o.bulk * 0.5, P, act, R);
    if (o.horns) hornPair(c, r * 0.5, -r * 0.85, 12 + o.bulk * 3, P, 0.5, R);
  }

  function paintCritter(c, P, R, act, o) { // small woodland / street units
    const r = 22 + o.bulk * 5;
    shadowBase(c, r * 1.15);
    // feet
    c.fillStyle = P.dark;
    c.beginPath(); c.ellipse(-r * 0.5, 38, 7.5, 5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(r * 0.5, 38, 7.5, 5, 0, 0, Math.PI * 2); c.fill();
    // body
    const g = c.createLinearGradient(0, -r, 0, 40);
    g.addColorStop(0, P.light); g.addColorStop(0.6, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    blob(c, radialPts(r * 1.06, 0.1, R, 0.2), true);
    c.save(); c.translate(0, 12); c.fill(); c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke(); c.restore();
    // belly
    c.fillStyle = P.pale;
    c.beginPath(); c.ellipse(0, 22, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); c.fill();
    // head
    c.fillStyle = g;
    blob(c, radialPts(r * 0.82, 0.12, R, 1.1), true);
    c.save(); c.translate(0, -r * 0.72); c.fill(); c.stroke(); c.restore();
    // ears / crest by flavor
    if (o.leaf) { // leaf sprout
      c.fillStyle = '#66bb6a';
      c.save(); c.translate(0, -r * 1.5);
      c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(-14, -8, -3, -16); c.quadraticCurveTo(2, -8, 0, 4); c.fill();
      c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(14, -10, 5, -18); c.quadraticCurveTo(-1, -9, 0, 4); c.fill();
      c.restore();
    } else if (act === 1) { // antenna sensor
      c.strokeStyle = P.metalDark; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(0, -r * 1.4); c.lineTo(0, -r * 1.85); c.stroke();
      c.fillStyle = P.glow; c.beginPath(); c.arc(0, -r * 1.95, 3.4, 0, Math.PI * 2); c.fill();
    } else {
      for (const side of [-1, 1]) {
        c.fillStyle = P.base;
        c.beginPath();
        c.moveTo(side * r * 0.34, -r * 1.28);
        c.quadraticCurveTo(side * r * 0.85, -r * 2.05, side * r * 0.16, -r * 1.62);
        c.closePath(); c.fill();
      }
    }
    eye(c, -r * 0.3, -r * 0.76, 4.4, P, act, R);
    eye(c, r * 0.3, -r * 0.76, 4.4, P, act, R);
    // cheeks
    if (act !== 1) {
      c.fillStyle = P.accent; c.globalAlpha = 0.5;
      c.beginPath(); c.arc(-r * 0.62, -r * 0.5, 3.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(r * 0.62, -r * 0.5, 3.4, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    if (act === 2) inlay(c, P, R, r * 0.9);
  }

  function paintBeast(c, P, R, act, o) { // hounds, cats, war-beasts
    shadowBase(c, 34);
    // hind leg
    c.fillStyle = P.dark;
    c.beginPath(); c.ellipse(16, 24, 13, 15, -0.2, 0, Math.PI * 2); c.fill();
    // tail
    c.strokeStyle = P.base; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(26, 16);
    c.quadraticCurveTo(44, 6 - o.bulk * 4, 38, -12 - o.bulk * 5); c.stroke();
    if (o.flame) { // burning tail tip
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 10;
      c.beginPath(); c.arc(38, -14 - o.bulk * 5, 6, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    }
    // torso
    const g = c.createLinearGradient(0, -26, 0, 36);
    g.addColorStop(0, P.light); g.addColorStop(0.55, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-30, 8);
    c.quadraticCurveTo(-32, -16, -10, -20);
    c.quadraticCurveTo(14, -24, 26, -8);
    c.quadraticCurveTo(32, 8, 20, 24);
    c.quadraticCurveTo(0, 34, -18, 26);
    c.quadraticCurveTo(-32, 20, -30, 8);
    c.closePath(); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    // front legs
    c.fillStyle = P.base;
    c.beginPath(); c.roundRect(-24, 16, 9, 22, 4); c.fill();
    c.beginPath(); c.roundRect(-8, 18, 9, 21, 4); c.fill();
    c.fillStyle = P.dark;
    c.beginPath(); c.ellipse(-19.5, 39, 6.5, 4, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-3.5, 40, 6.5, 4, 0, 0, Math.PI * 2); c.fill();
    // mane / armor by act
    if (o.flame) {
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
      blob(c, radialPts(13, 0.5, R, 0.9, 8), true);
      c.save(); c.translate(-16, -22); c.fill(); c.restore(); c.shadowBlur = 0;
    }
    if (act === 1) { // plated saddle
      c.fillStyle = P.metal;
      c.beginPath(); c.roundRect(-12, -22, 26, 12, 5); c.fill();
      panelLines(c, P, R, 22);
    }
    if (act === 2) inlay(c, P, R, 20);
    // head
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-38, -30);
    c.quadraticCurveTo(-20, -42, -8, -30);
    c.quadraticCurveTo(-4, -18, -16, -12);
    c.quadraticCurveTo(-34, -10, -40, -20);
    c.closePath(); c.fill(); c.stroke();
    // snout
    c.fillStyle = P.pale;
    c.beginPath(); c.ellipse(-36, -20, 8, 6, 0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.ink;
    c.beginPath(); c.arc(-41, -22, 2.2, 0, Math.PI * 2); c.fill();
    // ears / horns
    if (o.horns) hornPair(c, 0, 0, 13, P, 0.8, R);
    else {
      for (const dx of [-30, -16]) {
        c.fillStyle = P.dark;
        c.beginPath(); c.moveTo(dx, -38); c.lineTo(dx + 5, -48 - R() * 4); c.lineTo(dx + 10, -38); c.closePath(); c.fill();
      }
    }
    eye(c, -24, -28, 4, P, act, R);
  }

  function paintAvian(c, P, R, act, o) { // birds, monks of the wind
    wingPair(c, 8, -6, 34 + o.bulk * 6, P, act, R);
    // tail feathers
    c.fillStyle = P.dark;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(6, 16);
      c.quadraticCurveTo(22 + i * 6, 30 + Math.abs(i) * 4, 34 + i * 8, 40);
      c.quadraticCurveTo(20 + i * 6, 34, 6, 22);
      c.closePath(); c.fill();
    }
    // body
    const g = c.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, P.light); g.addColorStop(0.6, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 2, 20 + o.bulk * 3, 26 + o.bulk * 3, 0.12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    // chest
    c.fillStyle = P.pale;
    c.beginPath(); c.ellipse(-4, 10, 11, 15, 0.12, 0, Math.PI * 2); c.fill();
    // head
    c.fillStyle = g;
    c.beginPath(); c.arc(-6, -26, 13 + o.bulk, 0, Math.PI * 2); c.fill(); c.stroke();
    // beak
    c.fillStyle = '#ffb74d';
    c.beginPath(); c.moveTo(-18, -26); c.lineTo(-30, -22); c.lineTo(-18, -19); c.closePath(); c.fill();
    // crest
    c.fillStyle = P.accent;
    c.beginPath();
    c.moveTo(-8, -38);
    c.quadraticCurveTo(2 + o.bulk * 2, -52, 12, -42);
    c.quadraticCurveTo(4, -40, -2, -36);
    c.closePath(); c.fill();
    eye(c, -10, -28, 3.8, P, act, R);
    if (act === 0 && o.rune) runeRing(c, 34, P, R, 4);
    if (act === 2) inlay(c, P, R, 18);
    // talons
    c.strokeStyle = '#ffb74d'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, 28); c.lineTo(-4, 38); c.moveTo(4, 28); c.lineTo(6, 38); c.stroke();
  }

  function paintSerpent(c, P, R, act, o) { // wyrms and dragons
    const seg = 9 + o.bulk;
    // coiled S-body drawn back-to-front
    const path = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = Math.sin(t * Math.PI * 2.1 + 0.5) * (26 + o.bulk * 3) * (1 - t * 0.25);
      const y = 36 - t * 72;
      path.push([x, y]);
    }
    // dorsal fins first
    c.fillStyle = P.accent;
    for (let i = 3; i < 18; i += 3) {
      const [x, y] = path[i];
      c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 1, y - 12 - R() * 5); c.lineTo(x + 7, y); c.closePath(); c.fill();
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i];
        const w = (seg + 3) * (0.65 + 0.5 * Math.sin((i / 20) * Math.PI));
        if (pass === 0) { // outline pass
          c.fillStyle = P.deep;
          c.beginPath(); c.arc(x, y, w + 2, 0, Math.PI * 2); c.fill();
        } else {
          const g = c.createRadialGradient(x - w * 0.3, y - w * 0.3, 1, x, y, w * 1.4);
          g.addColorStop(0, P.light); g.addColorStop(0.6, P.base); g.addColorStop(1, P.dark);
          c.fillStyle = g;
          c.beginPath(); c.arc(x, y, w, 0, Math.PI * 2); c.fill();
          if (i % 3 === 0) { // belly plates
            c.fillStyle = P.pale; c.globalAlpha = 0.7;
            c.beginPath(); c.ellipse(x, y + w * 0.45, w * 0.62, w * 0.3, 0, 0, Math.PI * 2); c.fill();
            c.globalAlpha = 1;
          }
        }
      }
    }
    if (act === 2) inlay(c, P, R, 26);
    // head at the top of the S
    const [hx, hy] = path[20];
    c.fillStyle = P.base;
    c.beginPath(); c.ellipse(hx, hy - 4, seg + 7, seg + 5, -0.15, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    hornPair(c, seg * 0.5, 0, 12 + o.bulk * 2, P, 0.9, R);
    c.save(); c.translate(hx, hy - 6);
    eye(c, -seg * 0.4, -2, 3.6, P, act, R);
    eye(c, seg * 0.4, -2, 3.6, P, act, R);
    // whiskers on magic serpents
    if (act === 0) {
      c.strokeStyle = P.accent; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-seg - 4, 4); c.quadraticCurveTo(-seg - 16, 8, -seg - 12, 16); c.stroke();
      c.beginPath(); c.moveTo(seg + 4, 4); c.quadraticCurveTo(seg + 16, 8, seg + 12, 16); c.stroke();
    }
    c.restore();
  }

  function paintGolem(c, P, R, act, o) { // stone, ore and machine hulks
    shadowBase(c, 36);
    const stone = act >= 1 ? P.metal : P.base;
    const stoneD = act >= 1 ? P.metalDark : P.dark;
    // legs
    for (const side of [-1, 1]) {
      c.fillStyle = stoneD;
      c.beginPath(); c.roundRect(side * 24 - 9, 18, 18, 22, 6); c.fill();
    }
    // torso: stacked chunks
    const g = c.createLinearGradient(0, -34, 0, 30);
    g.addColorStop(0, shade(stone, 0.25)); g.addColorStop(0.6, stone); g.addColorStop(1, stoneD);
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-30, -14, 60, 38, act >= 1 ? 8 : 14); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // shoulders
    for (const side of [-1, 1]) {
      c.fillStyle = g;
      c.beginPath(); c.roundRect(side * 22 - 12, -26, 24, 24, act >= 1 ? 6 : 11); c.fill(); c.stroke();
    }
    // arms
    for (const side of [-1, 1]) {
      c.fillStyle = stone;
      c.beginPath(); c.roundRect(side * 30 - 7, -6, 14, 30, 6); c.fill(); c.stroke();
      c.fillStyle = stoneD;
      c.beginPath(); c.arc(side * 30, 28, 8.5, 0, Math.PI * 2); c.fill();
    }
    // molten / power core seams
    c.strokeStyle = P.glow; c.lineWidth = 2.4; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.moveTo(-14, -8); c.lineTo(-4, 2); c.lineTo(-12, 12); c.stroke();
    c.beginPath(); c.moveTo(14, -10); c.lineTo(6, 0); c.lineTo(14, 10); c.stroke();
    c.shadowBlur = 0;
    // core
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    c.beginPath(); c.arc(0, 4, 7 + o.bulk, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = P.ink; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 4, 7 + o.bulk, 0, Math.PI * 2); c.stroke();
    // head block
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-14, -34, 28, 18, act >= 1 ? 5 : 9); c.fill(); c.stroke();
    eye(c, act === 1 ? 0 : -6, -25, 3.6, P, act, R);
    if (act !== 1) eye(c, 6, -25, 3.6, P, act, R);
    if (act === 1) { thruster(c, -24, 40, 5, P); thruster(c, 24, 40, 5, P); }
    if (act === 2) inlay(c, P, R, 24);
    if (o.mossy) { // overgrown ruins
      c.fillStyle = '#66bb6a'; c.globalAlpha = 0.8;
      c.beginPath(); c.ellipse(-18, -32, 9, 4, 0.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(20, -14, 7, 3.4, -0.3, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  function paintDrone(c, P, R, act, o) { // spark-life and city machines
    // rotor / halo
    c.strokeStyle = P.accent; c.lineWidth = 2.4; c.globalAlpha = 0.8;
    c.beginPath(); c.ellipse(0, -30, 26, 7, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
    // chassis
    const g = c.createLinearGradient(0, -24, 0, 26);
    g.addColorStop(0, shade(P.metal, 0.3)); g.addColorStop(0.55, P.metal); g.addColorStop(1, P.metalDark);
    c.fillStyle = act === 0 ? P.base : g;
    c.beginPath();
    c.moveTo(0, -24);
    c.lineTo(22, -6); c.lineTo(15, 22); c.lineTo(-15, 22); c.lineTo(-22, -6);
    c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // face plate
    c.fillStyle = P.ink;
    c.beginPath(); c.roundRect(-13, -10, 26, 12, 6); c.fill();
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
    c.beginPath(); c.roundRect(-9, -7, 18, 6, 3); c.fill(); c.shadowBlur = 0;
    // side pods
    for (const side of [-1, 1]) {
      c.fillStyle = P.base;
      c.beginPath(); c.ellipse(side * 24, 2, 6.5, 10, side * 0.2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.ink; c.stroke();
    }
    // bolt tail
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
    c.beginPath();
    c.moveTo(-4, 22); c.lineTo(5, 28); c.lineTo(-1, 30); c.lineTo(6, 40); c.lineTo(-6, 32); c.lineTo(0, 29);
    c.closePath(); c.fill(); c.shadowBlur = 0;
    if (act === 2) inlay(c, P, R, 20);
    panelLines(c, P, R, 18);
  }

  function paintKnight(c, P, R, act, o) { // brawlers and armored wardens
    shadowBase(c, 30);
    const armor = act >= 1 ? P.metal : mix(P.base, '#ffffff', 0.12);
    const armorD = act >= 1 ? P.metalDark : P.dark;
    // legs
    for (const side of [-1, 1]) {
      c.fillStyle = armorD;
      c.beginPath(); c.roundRect(side * 12 - 8, 16, 16, 24, 6); c.fill();
    }
    // torso wedge
    const g = c.createLinearGradient(0, -30, 0, 24);
    g.addColorStop(0, shade(armor, 0.25)); g.addColorStop(0.6, armor); g.addColorStop(1, armorD);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-24, -22); c.lineTo(24, -22); c.lineTo(16, 20); c.lineTo(-16, 20);
    c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // chest sigil
    c.fillStyle = P.base;
    c.beginPath(); c.moveTo(0, -12); c.lineTo(9, -2); c.lineTo(0, 8); c.lineTo(-9, -2); c.closePath(); c.fill();
    c.strokeStyle = P.glow; c.lineWidth = 1.6; c.stroke();
    // pauldrons + fists
    for (const side of [-1, 1]) {
      c.fillStyle = g;
      c.beginPath(); c.ellipse(side * 27, -18, 11, 9, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = P.ink; c.stroke();
      c.fillStyle = P.base;
      c.beginPath(); c.arc(side * 30, 8, 9 + o.bulk, 0, Math.PI * 2); c.fill(); c.stroke();
      // knuckle glow
      c.fillStyle = P.glow;
      c.beginPath(); c.arc(side * 33, 6, 2.6, 0, Math.PI * 2); c.fill();
    }
    // helm
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-12, -40, 24, 20, act >= 1 ? 5 : 10); c.fill(); c.strokeStyle = P.ink; c.stroke();
    eye(c, 0, -30, 4, P, 1, R); // all knights read as visored
    if (o.crest) {
      c.fillStyle = P.accent;
      c.beginPath(); c.moveTo(-3, -40); c.quadraticCurveTo(0, -52 - o.bulk * 3, 3, -40); c.closePath(); c.fill();
    }
    if (act === 2) inlay(c, P, R, 22);
  }

  function paintFish(c, P, R, act, o) { // tide spirits and berg-life
    // tail
    c.fillStyle = P.dark;
    c.beginPath();
    c.moveTo(24, 4); c.quadraticCurveTo(42, -8, 46, -18);
    c.quadraticCurveTo(40, 0, 46, 14); c.quadraticCurveTo(38, 12, 24, 10);
    c.closePath(); c.fill();
    // body
    const g = c.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, P.light); g.addColorStop(0.55, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(-2, 0, 30, 22 + o.bulk * 2, -0.08, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    // belly
    c.fillStyle = P.pale;
    c.beginPath(); c.ellipse(-6, 8, 18, 10, -0.06, 0, Math.PI * 2); c.fill();
    // dorsal
    c.fillStyle = P.accent;
    c.beginPath(); c.moveTo(-12, -18); c.quadraticCurveTo(0, -38 - o.bulk * 4, 14, -18); c.closePath(); c.fill();
    // side fin
    c.fillStyle = mix(P.base, '#ffffff', 0.2);
    c.beginPath(); c.ellipse(-2, 10, 10, 5.5, 0.7, 0, Math.PI * 2); c.fill();
    if (o.ice) { // crystal spikes
      c.fillStyle = '#e0f7fa';
      for (const [x, y, s] of [[-20, -16, 8], [-6, -22, 10], [8, -18, 7]]) {
        c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x, y - s * 1.4); c.lineTo(x + s * 0.5, y); c.closePath(); c.fill();
      }
      c.strokeStyle = '#80deea'; c.lineWidth = 1.2;
      for (const [x, y, s] of [[-20, -16, 8], [-6, -22, 10], [8, -18, 7]]) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - s * 1.3); c.stroke();
      }
    }
    eye(c, -22, -6, 4.4, P, act, R);
    // bubbles / circuitry
    if (act === 2) inlay(c, P, R, 20);
    else {
      c.strokeStyle = P.pale; c.globalAlpha = 0.7; c.lineWidth = 1.4;
      c.beginPath(); c.arc(-34, -18, 3, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(-38, -26, 2, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    }
  }

  function paintMoth(c, P, R, act, o) { // spellmoths and signal bugs
    // four wings
    for (const side of [-1, 1]) {
      for (const [dy, sc] of [[-6, 1], [10, 0.72]]) {
        c.save(); c.scale(side, 1);
        const g = c.createLinearGradient(6, dy - 16, 34, dy + 6);
        g.addColorStop(0, mix(P.base, '#ffffff', 0.25)); g.addColorStop(1, P.base);
        c.fillStyle = g; c.globalAlpha = 0.92;
        c.beginPath();
        c.moveTo(4, dy);
        c.quadraticCurveTo(30 * sc + 8, dy - 26 * sc, 36 * sc + 6, dy - 8 * sc);
        c.quadraticCurveTo(30 * sc + 4, dy + 10 * sc, 4, dy + 6);
        c.closePath(); c.fill();
        c.globalAlpha = 1;
        // wing eye-spot
        c.fillStyle = P.accent;
        c.beginPath(); c.arc(22 * sc + 6, dy - 6 * sc, 4.2 * sc, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.pale;
        c.beginPath(); c.arc(22 * sc + 6, dy - 6 * sc, 1.8 * sc, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    // body
    const g = c.createLinearGradient(0, -20, 0, 26);
    g.addColorStop(0, P.light); g.addColorStop(0.6, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 4, 9, 20, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    // fuzz bands
    c.strokeStyle = P.dark; c.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-8, 2 + i * 7); c.quadraticCurveTo(0, 5 + i * 7, 8, 2 + i * 7); c.stroke(); }
    // head
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -18, 9, 0, Math.PI * 2); c.fill(); c.stroke();
    eye(c, -3.6, -19, 3, P, act, R); eye(c, 3.6, -19, 3, P, act, R);
    // antennae
    c.strokeStyle = act === 1 ? P.metalDark : P.dark; c.lineWidth = 2;
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 3, -26);
      c.quadraticCurveTo(side * 10, -38, side * 16, -36); c.stroke();
      if (act === 1) { c.fillStyle = P.glow; c.beginPath(); c.arc(side * 16, -36, 2.6, 0, Math.PI * 2); c.fill(); }
    }
  }

  function paintVessel(c, P, R, act, o) { // pilot craft: the class IS the ship
    // wing blades
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      const g = c.createLinearGradient(8, 0, 46, 10);
      g.addColorStop(0, P.base); g.addColorStop(1, P.dark);
      c.fillStyle = act === 0 ? P.base : g;
      c.beginPath();
      if (act === 0) { // magic: swept feather-wing
        c.moveTo(8, 2);
        c.quadraticCurveTo(34, -10, 46, 4);
        c.quadraticCurveTo(32, 16, 10, 14);
      } else { // tech/magitech: angular blade
        c.moveTo(8, 0); c.lineTo(44, -4); c.lineTo(48, 8); c.lineTo(12, 14);
      }
      c.closePath(); c.fill();
      c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
      // wing glow stripe
      c.strokeStyle = P.glow; c.lineWidth = 2.2; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(12, 6); c.lineTo(act === 0 ? 40 : 42, act === 0 ? 2 : 1); c.stroke();
      c.globalAlpha = 1;
      c.restore();
    }
    // hull: forward-swept dart
    const g = c.createLinearGradient(0, -34, 0, 30);
    g.addColorStop(0, shade(act >= 1 ? P.metal : P.light, 0.2));
    g.addColorStop(0.55, act >= 1 ? P.metal : P.base);
    g.addColorStop(1, act >= 1 ? P.metalDark : P.dark);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -36);
    c.quadraticCurveTo(13, -18, 14, 4);
    c.quadraticCurveTo(13, 22, 0, 30);
    c.quadraticCurveTo(-13, 22, -14, 4);
    c.quadraticCurveTo(-13, -18, 0, -36);
    c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // canopy / focus crystal
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 10;
    c.beginPath(); c.ellipse(0, -12, 5.5, 9, 0, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(-1.6, -15, 1.8, 3.4, -0.3, 0, Math.PI * 2); c.stroke();
    // discipline flourish
    if (act === 0) runeRing(c, 30, P, R, 4);
    if (act === 1) { thruster(c, -8, 30, 4.4, P); thruster(c, 8, 30, 4.4, P); }
    if (act === 2) { inlay(c, P, R, 18); thruster(c, 0, 31, 5, P); }
    // type sigil on the nose
    drawGlyph(c, o.typeKey, 0, 8, 7, act >= 1 ? P.base : P.pale);
    // form fins
    if (o.bulk >= 1) {
      for (const side of [-1, 1]) {
        c.fillStyle = P.accent;
        c.beginPath(); c.moveTo(side * 6, 26); c.lineTo(side * 12, 40); c.lineTo(side * 2, 30);
        c.closePath(); c.fill();
      }
    }
    if (o.bulk >= 2) crown(c, -42, 11, P, 2);
  }

  // type → body archetype (per-act adjustments inline)
  function bodyFor(type, act, R) {
    switch (type) {
      case 'ghost': case 'fairy': case 'psychic': return paintWisp;
      case 'poison': return act === 0 ? paintWisp : paintDrone;
      case 'flying': return paintAvian;
      case 'dragon': return paintSerpent;
      case 'rock': case 'ground': return paintGolem;
      case 'steel': return act === 0 ? paintKnight : (R() < 0.5 ? paintGolem : paintKnight);
      case 'water': case 'ice': return paintFish;
      case 'bug': return paintMoth;
      case 'grass': return paintCritter;
      case 'electric': return paintDrone;
      case 'fire': return paintBeast;
      case 'fighting': return paintKnight;
      case 'dark': return paintBeast;
      default: return paintCritter; // normal
    }
  }

  // ---------- id classification (mirrors the aetherfall id space) ----------
  const TYPE_BY_ID = {};
  AF.gens.forEach(g => {
    Object.values(g.tiers).flat().forEach(([id, t]) => { TYPE_BY_ID[id] = t; });
    TYPE_BY_ID[g.boss.id] = g.boss.t;
    TYPE_BY_ID[g.gauntlet.myth[0]] = g.gauntlet.myth[1];
  });
  STARTER_KEYS.forEach((k, i) => { for (let f = 0; f < 3; f++) TYPE_BY_ID[10 + i * 3 + f] = k; });

  function classify(id) {
    if (id === -1) return null;
    if (id >= 10 && id <= 63) {
      const i = Math.floor((id - 10) / 3), f = (id - 10) % 3, key = STARTER_KEYS[i];
      const d = AF.classes[key].d;
      return { kind: 'pilot', type: key, form: f, seed: 10 + i * 3,
        act: d === 'magic' ? 0 : d === 'tech' ? 1 : 2 };
    }
    const realm = Math.floor(id / 100), n = id % 100;
    if (realm < 1 || realm > 9) return null;
    const act = Math.floor((realm - 1) / 3);
    const type = TYPE_BY_ID[id] || 'normal';
    if (n === 80) return { kind: 'legend', type, form: 2, seed: id, act, realm };
    if (n === 81) return { kind: 'myth', type, form: 2, seed: id, act, realm };
    if (n >= 90) return { kind: 'sentinel', type, form: 2, seed: id, act, realm };
    if (n >= 1 && n <= 18) {
      const li = Math.floor((n - 1) / 3), f = (n - 1) % 3;
      return { kind: 'unit', type, form: f, seed: realm * 100 + 1 + li * 3, act, realm };
    }
    return null;
  }

  // ---------- the bake ----------
  function bake(id, shiny) {
    const cls = classify(id);
    const size = cls && (cls.kind === 'legend' || cls.kind === 'myth' || cls.kind === 'sentinel') ? 192 : 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    if (!cls) { // unknown id: neutral rune chip (never blank, never throws)
      c.fillStyle = '#22304a'; c.beginPath(); c.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2); c.fill();
      cv.complete = true; cv.naturalWidth = size; cv.naturalHeight = size;
      return cv;
    }
    const R = rng(cls.seed * 7 + (shiny ? 3 : 0));
    const P = makePalette(cls.type, cls.act, shiny);
    const o = { // per-line flavor switches, stable because R is seeded by line
      bulk: cls.form, // forms grow
      typeKey: cls.type,
      horns: R() < 0.4 || cls.kind === 'legend',
      leaf: cls.type === 'grass',
      flame: cls.type === 'fire',
      ice: cls.type === 'ice',
      mossy: cls.type === 'rock' && cls.act === 0,
      rune: R() < 0.5,
      crest: cls.form >= 1 || cls.kind !== 'unit',
    };
    c.save();
    c.translate(size / 2, size / 2 + size * 0.03);
    const boss = cls.kind === 'legend' || cls.kind === 'myth' || cls.kind === 'sentinel';
    const formScale = 0.78 + cls.form * 0.13;
    const s = (size / 128) * formScale * (boss ? 1.16 : 1);
    // radiant / boss aura behind the body
    if (shiny || boss) {
      const g = c.createRadialGradient(0, 0, 4, 0, 0, size * 0.46);
      g.addColorStop(0, (shiny ? '#ffe97a' : P.base) + '55');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(-size / 2, -size / 2, size, size);
    }
    c.scale(s, s);
    const painter = cls.kind === 'pilot' ? paintVessel : bodyFor(cls.type, cls.act, rng(cls.seed));
    painter(c, P, rng(cls.seed * 13 + 5), cls.act, o);
    // legendary flourish keyed by the boss's ARENA STYLE — the silhouette
    // hints at how the fight will move before the nameplate is read
    if (cls.kind === 'legend') {
      const style = AF.bossStyle[id];
      const FR = rng(cls.seed * 31 + 9);
      c.save();
      if (style === 'anchor') { // the Oracle: a great third eye
        c.fillStyle = '#ffffff';
        c.beginPath(); c.ellipse(0, -34, 9, 6.4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.deep; c.beginPath(); c.arc(0, -34, 3.4, 0, Math.PI * 2); c.fill();
        c.strokeStyle = P.accent; c.lineWidth = 2;
        c.beginPath(); c.ellipse(0, -34, 12.5, 9, 0, 0, Math.PI * 2); c.stroke();
      } else if (style === 'infinity' || style === 'swoop') { // great wings
        wingPair(c, 10, -14, 44, P, cls.act, FR, 0.5);
      } else if (style === 'bastion') { // gear halo
        c.strokeStyle = P.accent; c.lineWidth = 3;
        c.beginPath(); c.arc(0, -8, 46, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          c.save(); c.translate(Math.cos(a) * 46, Math.sin(a) * 46 - 8); c.rotate(a);
          c.fillStyle = P.accent; c.fillRect(-3, -5, 6, 10); c.restore();
        }
      } else if (style === 'flank') { // twin storm pods
        for (const side of [-1, 1]) {
          c.fillStyle = P.metalDark;
          c.beginPath(); c.roundRect(side * 40 - 8, -22, 16, 30, 6); c.fill();
          c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
          c.beginPath(); c.arc(side * 40, -7, 5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
        }
      } else if (style === 'phase') { // pale crescent
        c.strokeStyle = shiny ? '#ffd700' : '#e8eaf6'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.arc(0, -6, 44, Math.PI * 0.7, Math.PI * 1.9); c.stroke();
      } else if (style === 'perimeter') { // six blade wings
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          c.save(); c.rotate(a); c.translate(0, -40);
          c.fillStyle = i % 2 ? P.accent : P.base;
          c.beginPath(); c.moveTo(0, -14); c.lineTo(5, 4); c.lineTo(-5, 4); c.closePath(); c.fill();
          c.restore();
        }
      } else if (style === 'charge') { // chrome dash fins
        for (const side of [-1, 1]) {
          c.fillStyle = P.metal;
          c.beginPath(); c.moveTo(side * 16, 10); c.lineTo(side * 52, 2); c.lineTo(side * 20, 20);
          c.closePath(); c.fill();
          c.strokeStyle = P.glow; c.lineWidth = 2;
          c.beginPath(); c.moveTo(side * 18, 12); c.lineTo(side * 46, 6); c.stroke();
        }
      }
      c.restore();
    }
    // escalating regalia: form II gets an accent circlet, form III a crown;
    // legendaries a gold crown + orbiting shards, mythics a radiant halo
    if (cls.kind === 'unit' && cls.form === 1) {
      c.strokeStyle = P.accent; c.lineWidth = 2.6;
      c.beginPath(); c.arc(0, -44, 10, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke();
    }
    if ((cls.kind === 'unit' && cls.form === 2) || cls.kind === 'sentinel') crown(c, -48, 13, P, 2);
    if (cls.kind === 'legend') crown(c, -50, 17, P, 3);
    if (cls.kind === 'myth') {
      c.strokeStyle = shiny ? '#ffd700' : P.accent; c.lineWidth = 3; c.globalAlpha = 0.9;
      c.beginPath(); c.arc(0, -46, 15, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    if (boss) { // orbiting aether shards
      c.fillStyle = P.glow;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.7;
        const x = Math.cos(a) * 52, y = Math.sin(a) * 34 - 6;
        c.save(); c.translate(x, y); c.rotate(a);
        c.beginPath(); c.moveTo(0, -5); c.lineTo(3, 0); c.lineTo(0, 5); c.lineTo(-3, 0); c.closePath(); c.fill();
        c.restore();
      }
    }
    if (shiny) { // radiant sparkles
      c.fillStyle = '#fff8d0';
      for (let i = 0; i < 6; i++) {
        const x = (R() - 0.5) * 90, y = (R() - 0.5) * 90;
        c.save(); c.translate(x, y);
        c.beginPath(); c.moveTo(0, -4); c.lineTo(1.2, -1.2); c.lineTo(4, 0); c.lineTo(1.2, 1.2);
        c.lineTo(0, 4); c.lineTo(-1.2, 1.2); c.lineTo(-4, 0); c.lineTo(-1.2, -1.2);
        c.closePath(); c.fill(); c.restore();
      }
    }
    c.restore();
    cv.complete = true; cv.naturalWidth = size; cv.naturalHeight = size;
    return cv;
  }

  AF.spriteMaker = function (id, shiny) {
    const key = (shiny ? 's' : '') + id;
    if (!CACHE[key]) CACHE[key] = bake(id, shiny);
    return CACHE[key];
  };
  // expose the classifier for the asset-audit test (every roster id must
  // classify and bake to nonzero pixels — the suite asserts it)
  AF.spriteClassify = classify;
})();
