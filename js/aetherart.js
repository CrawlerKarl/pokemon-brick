'use strict';
// ============================================================
//  AETHERART v2 — bespoke procedural art for the AETHERFALL skin.
//
//  Round S5 shipped ten generic archetypes; this redesign replaces them
//  with an AUTHORED look for every design in the game:
//    · 18 pilot vessels (one per class, forms escalate regalia)
//    · 54 creature lines (one painter per line — thorn treants, bell
//      spirits, anglerfiends, gear golems, holo-sprites, glass phantoms,
//      war engines, memory ghosts…)
//    · 9 sentinel guardians, 9 legendaries, 9 mythics (bespoke bodies)
//
//  QUALITY PIPELINE — what makes it cohesive:
//    every sprite is painted into a work canvas, then finished with
//    three universal passes: a cel SHADE (darkened underside), a RIM
//    LIGHT (top-left edge), and a dark STICKER OUTLINE stamped from the
//    alpha silhouette. Bold silhouette first, few high-contrast details
//    — everything must read at 36 px in combat.
//
//  Deterministic (seeded per line id — never gameRand), baked ONCE and
//  cached, `.complete/.naturalWidth` contract, ZERO network. Painters
//  draw around (0,0) in a ±52-unit box, nose/face UP-ish; the bake
//  scales per kind/form.
// ============================================================
(() => {
  const AF = SKINS.aetherfall;
  const CACHE = {};
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

  // ---------- deterministic rand ----------
  function rng(seed) {
    let s = (Math.imul(seed, 2654435761) ^ 0x9e3779b9) >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // ---------- color ----------
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbHex(r, g, b) {
    const c = v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(hex, f) {
    const [r, g, b] = hexRgb(hex);
    return f >= 0 ? rgbHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
      : rgbHex(r * (1 + f), g * (1 + f), b * (1 + f));
  }
  function mix(h1, h2, t) {
    const a = hexRgb(h1), b = hexRgb(h2);
    return rgbHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }
  function hueShift(hex, deg) {
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
  // aetherfall tints for types whose pokemon hues read muddy on flat art
  const TYPE_TINT = { dark: '#8a76c9', ground: '#d9a05b', normal: '#c2ae94', rock: '#a08573' };
  function makePalette(type, shiny) {
    let base = TYPE_TINT[type] || TYPE_COLORS[type] || '#90a4ae';
    if (shiny) base = hueShift(base, 150);
    return {
      base,
      dark: shade(base, -0.42), deep: shade(base, -0.68),
      light: shade(base, 0.4), pale: shade(base, 0.75),
      glow: shiny ? '#ffe97a' : shade(base, 0.58),
      gold: shiny ? '#fff3b0' : '#ffd700',
      bone: '#efe6d4', metal: '#c3cfdc', metalDark: '#5a6a7a', chrome: '#dde7f0',
      ink: '#0d1220',
    };
  }

  // ============================================================
  //  PART LIBRARY — the shared vocabulary every painter composes from
  // ============================================================
  // smooth closed path through the midpoints of a control polygon
  function blobPath(c, pts) {
    const n = pts.length;
    c.beginPath();
    c.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath();
  }
  // mirror-draw: fn(c, side) is called for side=1 and side=-1
  function mirror(c, fn) {
    for (const s of [1, -1]) { c.save(); c.scale(s, 1); fn(c, s); c.restore(); }
  }
  function poly(c, pts, close = true) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (close) c.closePath();
  }
  // vertical teardrop / kite / lens bodies (the workhorse silhouettes)
  function teardrop(c, x, y, w, h, tip = 0.5) {
    c.beginPath(); c.moveTo(x, y - h / 2);
    c.bezierCurveTo(x + w * 0.62, y - h * tip * 0.5, x + w / 2, y + h * 0.34, x, y + h / 2);
    c.bezierCurveTo(x - w / 2, y + h * 0.34, x - w * 0.62, y - h * tip * 0.5, x, y - h / 2);
    c.closePath();
  }
  function lens(c, x, y, w, h) {
    c.beginPath(); c.moveTo(x, y - h / 2);
    c.quadraticCurveTo(x + w * 0.66, y, x, y + h / 2);
    c.quadraticCurveTo(x - w * 0.66, y, x, y - h / 2);
    c.closePath();
  }
  function crescent(c, x, y, r, thick, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath();
    c.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5, false);
    c.arc(0, -r * (1 - thick), r * (1 - thick * 0.4), Math.PI * 1.42, Math.PI * 0.58, true);
    c.closePath(); c.restore();
  }
  function flame(c, x, y, s, col1, col2, lean = 0) {
    c.save(); c.translate(x, y);
    c.fillStyle = col1;
    c.beginPath(); c.moveTo(lean * s, -s);
    c.bezierCurveTo(s * 0.8 + lean * s * 0.4, -s * 0.25, s * 0.55, s * 0.5, 0, s * 0.62);
    c.bezierCurveTo(-s * 0.55, s * 0.5, -s * 0.8 + lean * s * 0.4, -s * 0.25, lean * s, -s);
    c.closePath(); c.fill();
    c.fillStyle = col2;
    c.beginPath(); c.moveTo(lean * s * 0.5, -s * 0.48);
    c.bezierCurveTo(s * 0.4, -s * 0.05, s * 0.3, s * 0.32, 0, s * 0.44);
    c.bezierCurveTo(-s * 0.3, s * 0.32, -s * 0.4, -s * 0.05, lean * s * 0.5, -s * 0.48);
    c.closePath(); c.fill();
    c.restore();
  }
  function crystal(c, x, y, s, col, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = col;
    poly(c, [[0, -s], [s * 0.5, -s * 0.28], [s * 0.34, s * 0.72], [-s * 0.34, s * 0.72], [-s * 0.5, -s * 0.28]]);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, -s); c.lineTo(-s * 0.1, s * 0.7); c.stroke();
    c.restore();
  }
  function gearRing(c, x, y, r, teeth, col, holeR = 0.45) {
    c.save(); c.translate(x, y);
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.22;
      const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      if (!i) c.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
      c.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
      c.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
    }
    c.closePath();
    c.arc(0, 0, r * holeR, 0, Math.PI * 2, true);
    c.fill('evenodd');
    c.restore();
  }
  function halo(c, x, y, rx, ry, col, lw = 3, alpha = 0.95) {
    c.save(); c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = lw;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  function orbitals(c, n, rx, ry, size, col, phase = 0.6, cy = -4) {
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + phase;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry + cy;
      c.save(); c.translate(x, y); c.rotate(a + Math.PI / 4);
      poly(c, [[0, -size], [size * 0.62, 0], [0, size], [-size * 0.62, 0]]); c.fill();
      c.restore();
    }
  }
  // layered feather wing — organic, majestic
  function wingFeather(c, span, drop, col, colDark, layers = 3) {
    for (let L = layers - 1; L >= 0; L--) {
      const k = 1 - L * 0.22;
      c.fillStyle = L === 0 ? col : mix(col, colDark, L * 0.34);
      c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(span * 0.42 * k, -span * 0.5 * k, span * k, -span * 0.24 * k);
      // scalloped trailing edge
      const n = 4;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const ex = span * k * (1 - t * 0.82), ey = -span * 0.24 * k + t * (drop * k + span * 0.24 * k);
        c.quadraticCurveTo(ex + span * 0.05, ey - drop * 0.08, ex, ey);
      }
      c.closePath(); c.fill();
    }
  }
  // angular tech wing
  function wingBlade(c, span, drop, col, colGlow) {
    c.fillStyle = col;
    poly(c, [[2, 0], [span * 0.92, -span * 0.3], [span, -span * 0.06], [span * 0.5, drop], [6, drop * 0.62]]);
    c.fill();
    c.strokeStyle = colGlow; c.lineWidth = 2;
    c.beginPath(); c.moveTo(8, drop * 0.28); c.lineTo(span * 0.82, -span * 0.18); c.stroke();
  }
  // dragon membrane wing
  function wingMembrane(c, span, drop, col, colDark) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(span * 0.3, -span * 0.55, span * 0.95, -span * 0.42);
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      c.quadraticCurveTo(span * (0.95 - t * 0.6) + span * 0.1, -span * 0.42 + t * (drop + span * 0.42) - drop * 0.22,
        span * (0.95 - t * 0.72), -span * 0.42 + t * (drop + span * 0.42));
    }
    c.closePath(); c.fill();
    c.strokeStyle = colDark; c.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(2, 2);
      c.quadraticCurveTo(span * 0.4, -span * 0.2 + i * span * 0.16, span * (0.9 - i * 0.22), -span * 0.4 + i * (span * 0.3));
      c.stroke();
    }
  }
  // pure energy wing (three light strokes)
  function wingEnergy(c, span, col, up = 0.5) {
    c.save(); c.strokeStyle = col; c.lineCap = 'round';
    c.shadowColor = col; c.shadowBlur = 8;
    for (let i = 0; i < 3; i++) {
      c.lineWidth = 4 - i;
      c.globalAlpha = 0.9 - i * 0.22;
      c.beginPath(); c.moveTo(4, i * 3);
      c.quadraticCurveTo(span * 0.55, -span * up * (0.5 + i * 0.16), span * (0.9 + i * 0.06), -span * up * (0.24 + i * 0.2));
      c.stroke();
    }
    c.restore();
  }
  function thruster(c, x, y, w, colGlow) {
    const g = c.createLinearGradient(x, y, x, y + w * 2.6);
    g.addColorStop(0, colGlow); g.addColorStop(1, 'rgba(120,220,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - w, y); c.lineTo(x + w, y); c.lineTo(x, y + w * 2.6); c.closePath(); c.fill();
    c.fillStyle = '#41505f';
    c.beginPath(); c.roundRect(x - w * 1.15, y - w * 1.5, w * 2.3, w * 1.6, w * 0.5); c.fill();
  }
  function plate(c, x, y, w, h, col, r = 4, rivets = true) {
    c.fillStyle = col;
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
    c.strokeStyle = 'rgba(10,16,26,0.55)'; c.lineWidth = 1.4; c.stroke();
    if (rivets) {
      c.fillStyle = 'rgba(10,16,26,0.5)';
      c.beginPath(); c.arc(x + 4, y + 4, 1.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + w - 4, y + 4, 1.3, 0, Math.PI * 2); c.fill();
    }
  }
  // ---- faces (eyes carry the character; mouths only when they help)
  function eyeAlmond(c, x, y, r, P, fierce = 0) {
    c.save(); c.translate(x, y); c.rotate(fierce * 0.28);
    c.fillStyle = '#ffffff';
    lens(c, 0, 0, r * 2.1, r * 1.5); c.fill();
    c.fillStyle = P.deep;
    c.beginPath(); c.arc(r * 0.14, r * 0.1, r * 0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(-r * 0.18, -r * 0.22, r * 0.26, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function eyeGlow(c, x, y, r, col, slant = 0) {
    c.save(); c.translate(x, y); c.rotate(slant);
    c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 7;
    lens(c, 0, 0, r * 2.2, r * 1.1); c.fill();
    c.restore();
  }
  function visor(c, x, y, w, h, colGlow, ink = '#0d1220') {
    c.fillStyle = ink;
    c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); c.fill();
    c.fillStyle = colGlow; c.shadowColor = colGlow; c.shadowBlur = 6;
    c.beginPath(); c.roundRect(x - w * 0.36, y - h * 0.18, w * 0.72, h * 0.36, h * 0.18); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(x - w * 0.24, y - h * 0.02, h * 0.1, 0, Math.PI * 2); c.fill();
  }
  function skullFace(c, x, y, s, col = '#efe6d4', ink = '#0d1220') {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y - s * 0.14, s * 0.72, Math.PI * 0.96, Math.PI * 0.04);
    c.lineTo(x + s * 0.5, y + s * 0.34);
    c.quadraticCurveTo(x, y + s * 0.66, x - s * 0.5, y + s * 0.34);
    c.closePath(); c.fill();
    c.fillStyle = ink;
    c.beginPath(); c.ellipse(x - s * 0.3, y - s * 0.04, s * 0.17, s * 0.21, 0.12, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + s * 0.3, y - s * 0.04, s * 0.17, s * 0.21, -0.12, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(x, y + s * 0.14); c.lineTo(x - s * 0.09, y + s * 0.32); c.lineTo(x + s * 0.09, y + s * 0.32);
    c.closePath(); c.fill();
  }
  function runeMarks(c, R, n, spread, col, cy = 0) {
    c.save(); c.strokeStyle = col; c.lineWidth = 1.8; c.lineCap = 'round'; c.globalAlpha = 0.9;
    for (let i = 0; i < n; i++) {
      const x = (R() - 0.5) * spread * 2, y = cy + (R() - 0.5) * spread;
      const k = Math.floor(R() * 4);
      c.beginPath();
      if (k === 0) { c.moveTo(x - 3, y + 3); c.lineTo(x, y - 4); c.lineTo(x + 3, y + 3); }
      else if (k === 1) { c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.moveTo(x, y - 3); c.lineTo(x, y + 3); }
      else if (k === 2) { c.arc(x, y, 3, 0.4, Math.PI * 1.7); }
      else { c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 1, y - 3); c.lineTo(x + 3, y - 1); }
      c.stroke();
    }
    c.restore();
  }
  function lantern(c, x, y, s, colGlow, colFrame = '#3c4654') {
    c.strokeStyle = colFrame; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x, y - s * 1.5); c.lineTo(x, y - s); c.stroke();
    c.fillStyle = colGlow; c.shadowColor = colGlow; c.shadowBlur = 8;
    lens(c, x, y, s * 1.3, s * 1.9); c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = colFrame;
    lens(c, x, y, s * 1.3, s * 1.9); c.stroke();
    c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.85); c.lineTo(x + s * 0.5, y - s * 0.85); c.stroke();
  }
  function crownGold(c, y, w, P, big = false) {
    c.fillStyle = P.gold;
    c.beginPath();
    const k = big ? 5 : 3;
    c.moveTo(-w, y);
    for (let i = 0; i <= k; i++) {
      const x = -w + (2 * w * i) / k;
      c.lineTo(x - w / k * 0.5, y); c.lineTo(x, y - w * 0.46 - (i === Math.floor(k / 2) ? w * 0.24 : 0));
    }
    c.lineTo(w, y); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,70,0,0.5)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(0, y - w * 0.52, w * 0.09, 0, Math.PI * 2); c.fill();
  }
  function circlet(c, y, w, col) {
    c.strokeStyle = col; c.lineWidth = 2.6;
    c.beginPath(); c.arc(0, y + w * 0.9, w, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.arc(0, y - w * 0.06, 2.2, 0, Math.PI * 2); c.fill();
  }
  function motes(c, R, n, spread, col, cy = 0) {
    c.save(); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 6;
    for (let i = 0; i < n; i++) {
      c.globalAlpha = 0.5 + R() * 0.5;
      c.beginPath(); c.arc((R() - 0.5) * spread * 2, cy + (R() - 0.5) * spread * 1.4, 1 + R() * 1.8, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  function mistSkirt(c, y, w, col, R, n = 5) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(-w, y - 6);
    for (let i = 0; i <= n; i++) {
      const x = -w + (2 * w * i) / n;
      c.quadraticCurveTo(x - w / n * 0.5, y + (i % 2 ? 10 : 2) + R() * 4, x, y + (i % 2 ? 6 : 12));
    }
    c.lineTo(w, y - 6); c.closePath(); c.fill();
  }
  function tailSpline(c, pts, w0, col, colDark) {
    // tapered tail drawn as stacked circles along a spline
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const w = w0 * (1 - t * 0.85);
        c.fillStyle = pass === 0 ? colDark : col;
        c.beginPath(); c.arc(pts[i][0], pts[i][1], pass === 0 ? w + 1.6 : w, 0, Math.PI * 2); c.fill();
      }
    }
  }
  function splinePts(x0, y0, x1, y1, x2, y2, n = 9) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2]);
    }
    return out;
  }

  // ============================================================
  //  FINISH PIPELINE — shade → rim light → sticker outline
  // ============================================================
  function finishSprite(work, size, P, opts = {}) {
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const c = out.getContext('2d');
    // build the dark silhouette once
    const sil = document.createElement('canvas');
    sil.width = sil.height = size;
    const sc = sil.getContext('2d');
    sc.drawImage(work, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = opts.outline || 'rgba(10,14,24,0.9)';
    sc.fillRect(0, 0, size, size);
    // 1) sticker outline: stamp the silhouette in 8 directions
    const o = Math.max(1.5, size / 72);
    for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.7, o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, -o * 0.7]]) {
      c.drawImage(sil, dx, dy);
    }
    // 2) the art itself
    c.drawImage(work, 0, 0);
    // 3) cel shade: darken the lower part, clipped to the art's alpha
    const wc = work.getContext('2d');
    wc.save();
    wc.globalCompositeOperation = 'source-atop';
    const g = wc.createLinearGradient(0, size * 0.3, 0, size);
    g.addColorStop(0, 'rgba(10,16,30,0)'); g.addColorStop(1, 'rgba(10,16,30,0.26)');
    wc.fillStyle = g; wc.fillRect(0, 0, size, size);
    // 4) rim light: the silhouette nudged down-right, subtracted → lit edge up-left
    const rim = document.createElement('canvas');
    rim.width = rim.height = size;
    const rc = rim.getContext('2d');
    rc.drawImage(work, 0, 0);
    rc.globalCompositeOperation = 'destination-out';
    rc.drawImage(work, size / 46, size / 40);
    rc.globalCompositeOperation = 'source-in';
    rc.fillStyle = opts.rim || 'rgba(255,255,255,0.5)';
    rc.fillRect(0, 0, size, size);
    wc.drawImage(rim, 0, 0);
    wc.restore();
    // recomposite the shaded art over the outline stamp
    c.clearRect(0, 0, size, size);
    for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.7, o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, -o * 0.7]]) {
      c.drawImage(sil, dx, dy);
    }
    c.drawImage(work, 0, 0);
    return out;
  }

  // ============================================================
  //  PILOT VESSELS — 18 bespoke craft (nose up, ±50 box)
  //  Every vessel: back layer → hull → class prop → canopy → thrust.
  //  o.form (0..2) escalates trim; the class fantasy IS the silhouette.
  // ============================================================
  function vesselThrust(c, P, n = 1, w = 5, y = 30) {
    if (n === 1) { thruster(c, 0, y, w, P.glow); }
    else mirror(c, cc => thruster(cc, 8, y, w * 0.8, P.glow));
  }
  const VESSELS = {
    fire(c, P, R, o) { // PYROMANCER — brazier chariot, wings of flame
      mirror(c, cc => { cc.save(); cc.translate(10, 2); cc.rotate(0.1); flame(cc, 18, -2, 20 + o.form * 3, P.base, P.glow, 0.35); cc.restore(); });
      c.fillStyle = shade('#5a3a2e', 0.08);
      teardrop(c, 0, 2, 30, 58, 0.7); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // brazier bowl
      c.fillStyle = '#7c4a33';
      c.beginPath(); c.ellipse(0, 10, 15, 8, 0, 0, Math.PI * 2); c.fill();
      flame(c, 0, 0, 13 + o.form * 2.5, P.base, P.glow);
      // ember canopy
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 10;
      lens(c, 0, -18, 9, 14); c.fill(); c.shadowBlur = 0;
      vesselThrust(c, P, 2);
      if (o.form >= 1) mirror(c, cc => { cc.fillStyle = P.gold; poly(cc, [[13, -24], [20, -34], [16, -20]]); cc.fill(); });
      if (o.form >= 2) crownGold(c, -44, 12, P);
    },
    ice(c, P, R, o) { // FROSTWEAVER — crystalline loom, shard wings
      mirror(c, cc => {
        crystal(cc, 24, -4, 16 + o.form * 3, mix(P.base, '#ffffff', 0.3), 0.9);
        crystal(cc, 30, 8, 10 + o.form * 2, P.base, 1.2);
      });
      c.fillStyle = mix(P.base, '#ffffff', 0.45);
      poly(c, [[0, -32], [12, -8], [8, 26], [-8, 26], [-12, -8]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // woven lattice
      c.strokeStyle = P.base; c.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 6, -22); c.lineTo(i * 6 - 3, 22); c.stroke(); }
      c.beginPath(); c.moveTo(-9, -4); c.lineTo(9, -4); c.moveTo(-8, 8); c.lineTo(8, 8); c.stroke();
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
      crystal(c, 0, -14, 8, '#eafcff'); c.shadowBlur = 0;
      vesselThrust(c, P, 1, 4.6);
      if (o.form >= 2) mirror(c, cc => crystal(cc, 10, -34, 8, '#eafcff', -0.3));
    },
    grass(c, P, R, o) { // DRUID — living seed-pod glider, leaf rotors
      mirror(c, cc => { // leaf wings
        cc.fillStyle = mix(P.base, '#2e7d32', 0.25);
        cc.beginPath(); cc.moveTo(6, -2);
        cc.quadraticCurveTo(30, -18 - o.form * 3, 44, -4);
        cc.quadraticCurveTo(28, 8, 6, 8); cc.closePath(); cc.fill();
        cc.strokeStyle = shade('#2e7d32', -0.25); cc.lineWidth = 1.5;
        cc.beginPath(); cc.moveTo(8, 2); cc.quadraticCurveTo(26, -8, 42, -4); cc.stroke();
      });
      c.fillStyle = '#6d4c33';
      teardrop(c, 0, 4, 26, 52, 0.62); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // sprout prow
      c.strokeStyle = '#66bb6a'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -26); c.quadraticCurveTo(-2, -36, -8, -40); c.stroke();
      c.fillStyle = '#81c784';
      lens(c, -10, -42, 10, 6); c.fill();
      lens(c, 2, -38, 8, 5); c.fill();
      // seed canopy
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
      lens(c, 0, -8, 10, 15); c.fill(); c.shadowBlur = 0;
      c.fillStyle = 'rgba(255,255,255,0.5)';
      lens(c, -2.4, -12, 3, 6); c.fill();
      vesselThrust(c, P, 1, 4.4);
      if (o.form >= 1) motes(c, R, 5, 30, '#aef58a', -10);
      if (o.form >= 2) crownGold(c, -50, 11, P);
    },
    ghost(c, P, R, o) { // NECROMANCER — bone-ribbed skiff, scythe prow, soul lanterns
      // scythe prow (back layer)
      c.save(); c.rotate(-0.12);
      c.strokeStyle = P.bone = '#e8e0d0'; c.lineWidth = 3.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -40); c.stroke();
      c.fillStyle = '#e8e0d0';
      crescent(c, 8, -40, 16, 0.42, Math.PI * 0.62); c.fill();
      c.restore();
      // hull
      c.fillStyle = '#3c3550';
      teardrop(c, 0, 6, 30, 50, 0.55); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // bone ribs
      c.strokeStyle = '#e8e0d0'; c.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.arc(0, 2 + i * 9, 15 - i * 2.4, Math.PI * 0.16, Math.PI * 0.84); c.stroke();
      }
      // soul core
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 11;
      c.beginPath(); c.arc(0, -8, 6.5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      mirror(c, cc => lantern(cc, 17, 14, 4, P.glow));
      mistSkirt(c, 26, 20, 'rgba(126,87,194,0.4)', R);
      vesselThrust(c, P, 1, 4);
      if (o.form >= 2) skullFace(c, 0, -26, 9);
    },
    dark(c, P, R, o) { // SHADOWMANCER — stealth dagger-wing, void trail
      mirror(c, cc => {
        cc.fillStyle = mix(P.dark, '#1a1030', 0.5);
        poly(cc, [[4, -6], [40 + o.form * 4, 6], [30, 14], [4, 10]]); cc.fill();
        cc.strokeStyle = P.base; cc.lineWidth = 1.6;
        cc.beginPath(); cc.moveTo(8, 2); cc.lineTo(34, 8); cc.stroke();
      });
      c.fillStyle = '#241a3d';
      poly(c, [[0, -38], [9, -6], [7, 24], [-7, 24], [-9, -6]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // void slit canopy
      eyeGlow(c, 0, -14, 4.6, P.glow);
      // trailing shadow ribbons
      c.save(); c.globalAlpha = 0.66; c.strokeStyle = P.base; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-5, 24); c.quadraticCurveTo(-10, 36, -4, 44); c.stroke();
      c.beginPath(); c.moveTo(5, 24); c.quadraticCurveTo(10, 38, 3, 46); c.stroke();
      c.restore();
      if (o.form >= 1) orbitals(c, 3, 22, 10, 3, P.base, 0.4, -22);
      if (o.form >= 2) crownGold(c, -46, 10, P);
    },
    fairy(c, P, R, o) { // FEYWARDEN — butterfly court barge
      mirror(c, cc => { // double butterfly wings
        for (const [dy, sc2] of [[-8, 1], [8, 0.72]]) {
          cc.fillStyle = mix(P.base, '#ffffff', 0.28);
          cc.beginPath(); cc.moveTo(5, dy);
          cc.quadraticCurveTo(34 * sc2, dy - 24 * sc2, 40 * sc2, dy - 6 * sc2);
          cc.quadraticCurveTo(34 * sc2, dy + 10 * sc2, 5, dy + 6);
          cc.closePath(); cc.fill();
          cc.fillStyle = P.base;
          cc.beginPath(); cc.arc(26 * sc2, dy - 7 * sc2, 4 * sc2, 0, Math.PI * 2); cc.fill();
          cc.fillStyle = '#fff';
          cc.beginPath(); cc.arc(26 * sc2, dy - 7 * sc2, 1.6 * sc2, 0, Math.PI * 2); cc.fill();
        }
      });
      c.fillStyle = mix(P.base, '#ffffff', 0.5);
      teardrop(c, 0, 2, 22, 48, 0.6); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
      lens(c, 0, -12, 8, 12); c.fill(); c.shadowBlur = 0;
      halo(c, 0, -34, 10, 4, P.gold, 2.6);
      vesselThrust(c, P, 1, 4);
      if (o.form >= 1) motes(c, R, 6, 32, '#ffe3f2', -6);
      if (o.form >= 2) crownGold(c, -46, 12, P, true);
    },
    steel(c, P, R, o) { // ENGINEER — gun platform with tool arms
      mirror(c, cc => { // tool arms
        cc.strokeStyle = '#5a6a7a'; cc.lineWidth = 4; cc.lineCap = 'round';
        cc.beginPath(); cc.moveTo(14, -4); cc.lineTo(28, -14); cc.stroke();
        cc.fillStyle = '#8fa0b3';
        if (o.form >= 1) { cc.beginPath(); cc.roundRect(24, -24, 9, 12, 2); cc.fill(); }
        else { cc.beginPath(); cc.arc(29, -16, 4.6, 0, Math.PI * 2); cc.fill(); }
      });
      c.fillStyle = '#8fa0b3';
      c.beginPath(); c.roundRect(-17, -24, 34, 48, 7); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      plate(c, -13, -18, 26, 12, '#a9bac9', 4);
      plate(c, -13, 2, 12, 14, '#7e8fa0', 3);
      plate(c, 1, 2, 12, 14, '#7e8fa0', 3);
      // twin cannon prow
      mirror(c, cc => {
        cc.fillStyle = '#5a6a7a';
        cc.beginPath(); cc.roundRect(4, -38, 6, 16, 2); cc.fill();
        cc.fillStyle = P.glow;
        cc.beginPath(); cc.arc(7, -38, 2.2, 0, Math.PI * 2); cc.fill();
      });
      visor(c, 0, -8, 20, 8, P.glow);
      vesselThrust(c, P, 2, 4.6, 26);
      if (o.form >= 2) crownGold(c, -46, 11, P);
    },
    bug(c, P, R, o) { // SWARM OPERATOR — carrier hive + orbiting drones
      c.fillStyle = mix(P.base, '#5b6e2e', 0.3);
      c.beginPath();
      for (let i = 0; i < 6; i++) { // hex hull
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 24, Math.sin(a) * 28);
      }
      c.closePath(); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // hive cells
      c.strokeStyle = shade(P.base, -0.3); c.lineWidth = 1.6;
      for (const [hx, hy] of [[-8, -8], [8, -8], [0, 2], [-8, 12], [8, 12]]) {
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          c[i ? 'lineTo' : 'moveTo'](hx + Math.cos(a) * 5, hy + Math.sin(a) * 5);
        }
        c.closePath(); c.stroke();
      }
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 7;
      c.beginPath(); c.arc(0, 2, 4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      // orbiting micro-drones (the class fantasy)
      const n = 2 + o.form;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.5;
        const x = Math.cos(a) * 36, y = Math.sin(a) * 24 - 4;
        c.fillStyle = P.base;
        poly(c, [[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]]); c.fill();
        c.strokeStyle = P.glow; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.stroke();
      }
      vesselThrust(c, P, 2, 4, 28);
      if (o.form >= 2) crownGold(c, -42, 10, P);
    },
    poison(c, P, R, o) { // CHEMIST — vial-nacelle craft, bubbling tanks
      mirror(c, cc => { // glass tank nacelles
        cc.fillStyle = 'rgba(190,240,200,0.35)';
        cc.beginPath(); cc.roundRect(16, -14, 12, 30, 6); cc.fill();
        cc.strokeStyle = '#cfe8d8'; cc.lineWidth = 1.6; cc.stroke();
        cc.fillStyle = P.base; cc.globalAlpha = 0.85;
        cc.beginPath(); cc.roundRect(17.5, -2 - o.form * 3, 9, 17 + o.form * 3, 4.5); cc.fill();
        cc.globalAlpha = 1;
        cc.fillStyle = mix(P.base, '#ffffff', 0.5);
        cc.beginPath(); cc.arc(22, -4 - o.form * 3, 1.6, 0, Math.PI * 2); cc.fill();
        cc.beginPath(); cc.arc(24.5, 2, 1.1, 0, Math.PI * 2); cc.fill();
        cc.fillStyle = '#5a6a7a';
        cc.beginPath(); cc.roundRect(15, -18, 14, 5, 2); cc.fill();
      });
      c.fillStyle = '#7e57c2';
      teardrop(c, 0, 0, 26, 52, 0.6); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // mask visor (chemists wear one)
      visor(c, 0, -12, 18, 8, P.glow, '#241a3d');
      c.fillStyle = '#241a3d';
      c.beginPath(); c.arc(-5, -2, 3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(5, -2, 3, 0, Math.PI * 2); c.fill();
      vesselThrust(c, P, 1, 4.6);
      if (o.form >= 2) crownGold(c, -44, 10, P);
    },
    flying(c, P, R, o) { // AERONAUT — classic sky racer
      mirror(c, cc => { // gull wings
        cc.fillStyle = '#c9d6e2';
        poly(cc, [[6, 0], [26, -8], [46 + o.form * 3, -2], [44, 4], [24, 4], [6, 8]]); cc.fill();
        cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
        cc.fillStyle = '#ef5350'; // wing roundel
        cc.beginPath(); cc.arc(30, -1, 3.4, 0, Math.PI * 2); cc.fill();
        cc.fillStyle = '#fff';
        cc.beginPath(); cc.arc(30, -1, 1.4, 0, Math.PI * 2); cc.fill();
      });
      c.fillStyle = '#e3ecf3';
      teardrop(c, 0, 0, 22, 56, 0.72); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // striped nose
      c.fillStyle = '#ef5350';
      c.beginPath(); c.moveTo(0, -28); c.bezierCurveTo(8, -22, 8, -16, 7, -12); c.lineTo(-7, -12);
      c.bezierCurveTo(-8, -16, -8, -22, 0, -28); c.closePath(); c.fill();
      // prop disc
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#cfd8dc'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, -30, 16, 4, 0, 0, Math.PI * 2); c.stroke(); c.restore();
      c.fillStyle = '#5a6a7a';
      c.beginPath(); c.arc(0, -30, 2.4, 0, Math.PI * 2); c.fill();
      // open cockpit + goggles glint
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 6;
      lens(c, 0, -4, 9, 11); c.fill(); c.shadowBlur = 0;
      vesselThrust(c, P, 1, 4);
      if (o.form >= 1) mirror(c, cc => { cc.fillStyle = '#ffd54f'; poly(cc, [[10, 16], [18, 22], [10, 20]]); cc.fill(); });
      if (o.form >= 2) crownGold(c, -46, 10, P);
    },
    rock(c, P, R, o) { // SIEGEWRIGHT — flying rampart with ram prow
      mirror(c, cc => { // tower pods
        cc.fillStyle = '#8d7466';
        cc.beginPath(); cc.roundRect(16, -16, 13, 30, 3); cc.fill();
        cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
        // crenellation
        cc.fillStyle = '#a08573';
        for (let i = 0; i < 3; i++) { cc.fillRect(16.5 + i * 4.4, -20, 3, 5); }
      });
      c.fillStyle = '#a08573';
      poly(c, [[0, -34], [15, -18], [13, 26], [-13, 26], [-15, -18]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // stone blocks
      c.strokeStyle = 'rgba(20,14,10,0.35)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-13, -6); c.lineTo(13, -6); c.moveTo(-12, 8); c.lineTo(12, 8);
      c.moveTo(0, -6); c.lineTo(0, 8); c.moveTo(-7, 8); c.lineTo(-7, 22); c.moveTo(7, 8); c.lineTo(7, 22); c.stroke();
      // iron ram prow
      c.fillStyle = '#5a6a7a';
      poly(c, [[0, -42], [8, -30], [-8, -30]]); c.fill();
      c.strokeStyle = P.ink; c.stroke();
      visor(c, 0, -14, 16, 7, P.glow);
      vesselThrust(c, P, 2, 4.6, 28);
      if (o.form >= 2) crownGold(c, -48, 11, P);
    },
    fighting(c, P, R, o) { // VANGUARD — blade interceptor, gauntlet prow
      mirror(c, cc => {
        cc.fillStyle = '#c62828';
        poly(cc, [[6, 4], [34 + o.form * 4, -6], [38 + o.form * 4, 2], [10, 12]]); cc.fill();
        cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
      });
      c.fillStyle = '#ef5350';
      poly(c, [[0, -36], [10, -10], [8, 26], [-8, 26], [-10, -10]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // gauntlet fist prow
      c.fillStyle = '#ffccbc';
      c.beginPath(); c.roundRect(-7, -46, 14, 12, 4); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.moveTo(-3, -46); c.lineTo(-3, -40); c.moveTo(1, -46); c.lineTo(1, -40); c.moveTo(5, -46); c.lineTo(5, -40); c.stroke();
      visor(c, 0, -16, 16, 7, P.glow, '#5d1616');
      c.fillStyle = '#fff';
      poly(c, [[0, -4], [6, 4], [0, 12], [-6, 4]]); c.fill();
      vesselThrust(c, P, 2, 4.4, 26);
      if (o.form >= 2) crownGold(c, -54, 10, P);
    },
    electric(c, P, R, o) { // STORMBINDER — twin tesla masts, living arc
      mirror(c, cc => { // masts
        cc.fillStyle = '#5a6a7a';
        cc.beginPath(); cc.roundRect(12, -34, 5, 26, 2); cc.fill();
        cc.fillStyle = P.base; cc.shadowColor = P.base; cc.shadowBlur = 8;
        cc.beginPath(); cc.arc(14.5, -36, 4 + o.form, 0, Math.PI * 2); cc.fill(); cc.shadowBlur = 0;
      });
      // the arc between masts
      c.save(); c.strokeStyle = P.glow; c.lineWidth = 2.2; c.shadowColor = P.base; c.shadowBlur = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-14, -36);
      c.lineTo(-6, -40); c.lineTo(-2, -34); c.lineTo(4, -41); c.lineTo(9, -35); c.lineTo(14, -36);
      c.stroke(); c.restore();
      c.fillStyle = '#3d4f63';
      teardrop(c, 0, 0, 26, 50, 0.62); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // coil bands
      c.strokeStyle = P.base; c.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -2 + i * 9, 12 - i * 1.6, Math.PI * 0.12, Math.PI * 0.88); c.stroke(); }
      // storm-heart canopy
      c.fillStyle = P.glow; c.shadowColor = P.base; c.shadowBlur = 10;
      poly(c, [[0, -20], [4, -13], [1, -13], [5, -5], [-3, -12], [0, -12]]); c.fill(); c.shadowBlur = 0;
      vesselThrust(c, P, 1, 5);
      if (o.form >= 2) crownGold(c, -50, 11, P);
    },
    psychic(c, P, R, o) { // PSION — eye-cockpit craft in floating rings
      halo(c, 0, -4, 34, 12, P.base, 2.4, 0.8);
      c.fillStyle = mix(P.base, '#ffffff', 0.35);
      lens(c, 0, -2, 30, 58); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // the great eye
      c.fillStyle = '#ffffff';
      lens(c, 0, -6, 19, 15); c.fill();
      c.fillStyle = P.deep;
      c.beginPath(); c.arc(0, -6, 6.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 6;
      c.beginPath(); c.arc(0, -6, 2.6, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(-2.4, -9, 1.6, 0, Math.PI * 2); c.fill();
      // lash fins
      mirror(c, cc => {
        cc.strokeStyle = P.base; cc.lineWidth = 2.2; cc.lineCap = 'round';
        cc.beginPath(); cc.moveTo(14, -14); cc.quadraticCurveTo(22, -20, 27, -19); cc.stroke();
        cc.beginPath(); cc.moveTo(16, -6); cc.quadraticCurveTo(25, -9, 30, -6); cc.stroke();
      });
      if (o.form >= 1) orbitals(c, 3 + o.form, 30, 12, 3, P.glow, 0.2, -2);
      vesselThrust(c, P, 1, 4.4, 28);
      if (o.form >= 2) { halo(c, 0, -40, 12, 4.4, P.gold, 2.6); }
    },
    dragon(c, P, R, o) { // WYRMRIDER — dragon-prow longship with sail wings
      mirror(c, cc => wingMembrane(cc, 34 + o.form * 4, 16, mix(P.base, '#1a237e', 0.25), P.deep), 0);
      c.fillStyle = '#5c6bc0';
      teardrop(c, 0, 4, 26, 52, 0.6); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // dragon figurehead: curved neck + horned head
      c.strokeStyle = '#3f51b5'; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(2, -32, -6, -38); c.stroke();
      c.fillStyle = '#3f51b5';
      lens(c, -9, -41, 14, 9); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.6; lens(c, -9, -41, 14, 9); c.stroke();
      mirror(c, () => {}); // (horn pair drawn directly — head is offset)
      c.fillStyle = P.pale;
      poly(c, [[-14, -46], [-18, -54], [-11, -47]]); c.fill();
      poly(c, [[-5, -47], [-2, -56], [-1, -46]]); c.fill();
      eyeGlow(c, -12, -41, 2, P.glow);
      // scale rows on hull
      c.strokeStyle = 'rgba(13,18,32,0.4)'; c.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.arc(0, 0 + i * 9, 11 - i, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
      }
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
      lens(c, 0, -6, 7, 10); c.fill(); c.shadowBlur = 0;
      vesselThrust(c, P, 1, 4.6);
      if (o.form >= 2) crownGold(c, -60, 10, P);
    },
    ground(c, P, R, o) { // TERRASHAPER — geode hover-barge with drill
      mirror(c, cc => { // floating rock chunks
        cc.fillStyle = '#8d6e63';
        poly(cc, [[24, -10], [32, -14], [36, -6], [30, 0], [24, -2]]); cc.fill();
        cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
        if (o.form >= 1) { cc.fillStyle = P.glow; poly(cc, [[28, -10], [31, -11], [31, -7], [28, -6]]); cc.fill(); }
      });
      c.fillStyle = '#a1887f';
      c.beginPath(); c.roundRect(-18, -18, 36, 40, 10); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // geode canopy: cracked open, crystal inside
      c.fillStyle = '#6d4c41';
      c.beginPath(); c.arc(0, -6, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
      crystal(c, -3, -8, 6, P.glow, -0.3); crystal(c, 4, -4, 5, mix(P.glow, '#ffffff', 0.3), 0.4);
      c.shadowBlur = 0;
      // drill prow
      c.fillStyle = '#78909c';
      poly(c, [[0, -40], [7, -22], [-7, -22]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.moveTo(-5, -27); c.lineTo(5, -30); c.moveTo(-4, -33); c.lineTo(4, -35); c.stroke();
      vesselThrust(c, P, 2, 4.6, 24);
      if (o.form >= 2) crownGold(c, -46, 11, P);
    },
    water(c, P, R, o) { // FLUXWEAVER — craft inside a flowing water loop
      // the water ring (back half)
      c.save(); c.strokeStyle = P.base; c.lineWidth = 6; c.lineCap = 'round'; c.globalAlpha = 0.85;
      c.beginPath(); c.ellipse(0, -2, 30, 38, 0.3, Math.PI * 0.6, Math.PI * 1.5); c.stroke();
      c.restore();
      c.fillStyle = mix(P.base, '#ffffff', 0.4);
      teardrop(c, 0, 0, 24, 52, 0.66); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // wave chevrons
      c.strokeStyle = P.base; c.lineWidth = 2.2;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.moveTo(-8, 2 + i * 8);
        c.quadraticCurveTo(-3, -2 + i * 8, 0, 2 + i * 8);
        c.quadraticCurveTo(3, 6 + i * 8, 8, 2 + i * 8); c.stroke();
      }
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
      lens(c, 0, -14, 8, 12); c.fill(); c.shadowBlur = 0;
      // the loop's front half over the hull
      c.save(); c.strokeStyle = mix(P.base, '#ffffff', 0.25); c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.ellipse(0, -2, 30, 38, 0.3, -Math.PI * 0.42, Math.PI * 0.52); c.stroke();
      c.fillStyle = mix(P.base, '#ffffff', 0.5);
      c.beginPath(); c.arc(27, 12, 4, 0, Math.PI * 2); c.fill();
      c.restore();
      vesselThrust(c, P, 1, 4.4);
      if (o.form >= 2) crownGold(c, -44, 10, P);
    },
    normal(c, P, R, o) { // DRIFTER — patched wanderer, mismatched wings
      mirror(c, (cc, s) => {
        if (s === 1) { // right: proper wing
          cc.fillStyle = '#c2ae94';
          poly(cc, [[6, 0], [36, -8], [40, 0], [10, 8]]); cc.fill();
          cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
        } else { // left: patched sail wing
          cc.fillStyle = '#9c8468';
          poly(cc, [[6, -2], [30, -14], [36, 2], [10, 8]]); cc.fill();
          cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
          cc.strokeStyle = '#e0cfa8'; cc.lineWidth = 1.4;
          cc.beginPath(); cc.moveTo(18, -8); cc.lineTo(24, -2); cc.moveTo(21, -9); cc.lineTo(27, -3); cc.stroke();
        }
      });
      c.fillStyle = '#c2ae94';
      teardrop(c, 0, 2, 25, 50, 0.62); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // patch + stitches
      c.fillStyle = '#9c8468';
      c.beginPath(); c.roundRect(2, 4, 11, 10, 2); c.fill();
      c.strokeStyle = '#e8dcc0'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(2, 6); c.lineTo(0, 8); c.moveTo(2, 11); c.lineTo(0, 13); c.stroke();
      // lantern on a pole (the wanderer's light)
      c.strokeStyle = '#6d5c44'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(10, -18); c.quadraticCurveTo(16, -26, 15, -32); c.stroke();
      lantern(c, 15, -36, 3.6, P.glow, '#6d5c44');
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 7;
      lens(c, 0, -12, 8, 11); c.fill(); c.shadowBlur = 0;
      vesselThrust(c, P, 1, 4.2);
      if (o.form >= 1) { c.fillStyle = '#ffd54f'; poly(c, [[-10, -30], [-6, -36], [-5, -29]]); c.fill(); }
      if (o.form >= 2) crownGold(c, -44, 10, P);
    },
  };

  // ============================================================
  //  CREATURE LINE PAINTERS — appended per realm below
  // ============================================================
  const LINE_PAINTERS = {};
  const SENTINEL_PAINTERS = {};
  const LEGEND_PAINTERS = {};
  const MYTH_PAINTERS = {};

  // ============================================================
  //  REALM 1 · GREENSPELL MARCHES — hedge spirits of the old magic
  // ============================================================
  LINE_PAINTERS[101] = function thornSprite(c, P, R, o) { // walking thorn-bud
    // brier vines behind
    c.strokeStyle = '#3e5d33'; c.lineWidth = 3; c.lineCap = 'round';
    mirror(c, cc => {
      cc.beginPath(); cc.moveTo(8, 8); cc.quadraticCurveTo(28, 2 - o.form * 4, 34, -14 - o.form * 5); cc.stroke();
      cc.fillStyle = P.base;
      for (let i = 0; i < 3; i++) {
        const t = 0.35 + i * 0.3;
        const x = 8 + t * 24, y = 8 - t * (20 + o.form * 5);
        poly(cc, [[x, y], [x + 5, y - 2], [x + 1, y - 6]]); cc.fill();
      }
    });
    // bud body
    const g = c.createLinearGradient(0, -26, 0, 30);
    g.addColorStop(0, P.light); g.addColorStop(0.6, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    teardrop(c, 0, 2, 40, 52, 0.8); c.fill();
    // bud wrap leaves
    c.fillStyle = mix(P.base, '#1b5e20', 0.35);
    c.beginPath(); c.moveTo(0, 28); c.quadraticCurveTo(-22, 12, -14, -14); c.quadraticCurveTo(-4, 2, 0, 28); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 28); c.quadraticCurveTo(22, 12, 14, -14); c.quadraticCurveTo(4, 2, 0, 28); c.closePath(); c.fill();
    // thorn studs
    c.fillStyle = P.pale;
    for (const [tx, ty] of [[-16, 2], [16, 2], [-9, 18], [9, 18]]) {
      poly(c, [[tx, ty], [tx + 4, ty - 1], [tx + 1, ty - 5]]); c.fill();
    }
    eyeAlmond(c, -8, -6, 4, P); eyeAlmond(c, 8, -6, 4, P);
    // sprout / crown by form
    if (o.form === 0) {
      c.strokeStyle = '#66bb6a'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(0, -26); c.quadraticCurveTo(2, -34, 7, -37); c.stroke();
      c.fillStyle = '#81c784'; lens(c, 9, -38, 9, 5); c.fill();
    } else if (o.form === 1) circlet(c, -34, 9, P.glow);
    else { crownGold(c, -36, 12, P); mirror(c, cc => { cc.fillStyle = '#3e5d33'; poly(cc, [[20, -8], [30, -20], [24, -6]]); cc.fill(); }); }
  };
  LINE_PAINTERS[104] = function faeMote(c, P, R, o) { // court light-sprite
    mirror(c, cc => { // gossamer double wings
      cc.fillStyle = 'rgba(255,230,250,0.55)';
      lens(cc, 20, -12, 26, 13); cc.save(); cc.translate(20, -12); cc.rotate(0.55); lens(cc, 0, 0, 26, 13); cc.fill(); cc.restore();
      lens(cc, 18, 2, 20, 10); cc.save(); cc.translate(18, 2); cc.rotate(0.2); lens(cc, 0, 0, 20, 10); cc.fill(); cc.restore();
      cc.strokeStyle = 'rgba(255,255,255,0.7)'; cc.lineWidth = 1;
      cc.beginPath(); cc.moveTo(8, -8); cc.lineTo(30, -18); cc.stroke();
    });
    // bell-skirt body
    const g = c.createLinearGradient(0, -22, 0, 26);
    g.addColorStop(0, P.pale); g.addColorStop(1, P.base);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -18);
    c.quadraticCurveTo(13, -10, 12, 10);
    c.quadraticCurveTo(8, 18, 12, 24); c.lineTo(-12, 24);
    c.quadraticCurveTo(-8, 18, -12, 10);
    c.quadraticCurveTo(-13, -10, 0, -18); c.closePath(); c.fill();
    // head
    c.fillStyle = P.pale;
    c.beginPath(); c.arc(0, -22, 10, 0, Math.PI * 2); c.fill();
    eyeAlmond(c, -3.6, -23, 3, P); eyeAlmond(c, 3.6, -23, 3, P);
    // antennae with light beads
    c.strokeStyle = P.glow; c.lineWidth = 1.6;
    mirror(c, cc => {
      cc.beginPath(); cc.moveTo(3, -30); cc.quadraticCurveTo(8, -38, 13, -40); cc.stroke();
      cc.fillStyle = P.glow; cc.shadowColor = P.glow; cc.shadowBlur = 6;
      cc.beginPath(); cc.arc(13, -40, 2.2, 0, Math.PI * 2); cc.fill(); cc.shadowBlur = 0;
    });
    // heart-light
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
    c.beginPath(); c.arc(0, 0, 4.4 + o.form, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    if (o.form >= 1) motes(c, R, 5 + o.form * 2, 30, P.glow, -6);
    if (o.form >= 2) crownGold(c, -38, 9, P);
  };
  LINE_PAINTERS[107] = function galeBird(c, P, R, o) { // bird-shaped wind eddy
    // trailing gust curls
    c.save(); c.strokeStyle = mix(P.base, '#ffffff', 0.4); c.lineWidth = 2.6; c.lineCap = 'round'; c.globalAlpha = 0.8;
    c.beginPath(); c.moveTo(8, 22); c.quadraticCurveTo(22, 30, 34, 26); c.quadraticCurveTo(28, 34, 18, 33); c.stroke();
    c.beginPath(); c.moveTo(-6, 26); c.quadraticCurveTo(-16, 34, -28, 30); c.stroke();
    c.restore();
    mirror(c, cc => wingFeather(cc, 36 + o.form * 5, 18, mix(P.base, '#ffffff', 0.5), P.base, 3), 0);
    // swoosh body: a comma of wind
    const g = c.createLinearGradient(0, -30, 0, 26);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, mix(P.base, '#ffffff', 0.2));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -30);
    c.bezierCurveTo(16, -26, 18, -4, 8, 12);
    c.quadraticCurveTo(2, 22, -8, 24);
    c.quadraticCurveTo(-2, 12, -8, 2);
    c.bezierCurveTo(-16, -14, -10, -28, 0, -30);
    c.closePath(); c.fill();
    // storm crest
    c.fillStyle = P.base;
    c.beginPath(); c.moveTo(-2, -30); c.quadraticCurveTo(6 + o.form * 3, -42 - o.form * 3, 14 + o.form * 3, -38); c.quadraticCurveTo(6, -34, 2, -28); c.closePath(); c.fill();
    // beak + eye
    c.fillStyle = '#ffb74d';
    poly(c, [[-10, -22], [-20, -18], [-9, -15]]); c.fill();
    eyeAlmond(c, -2, -20, 3.4, P, 0.2);
    if (o.form >= 2) { c.strokeStyle = P.glow; c.lineWidth = 2; halo(c, 0, -44, 10, 3.6, P.glow, 2); }
  };
  LINE_PAINTERS[110] = function spiritDeer(c, P, R, o) { // rune-antlered wanderer
    // legs
    c.strokeStyle = shade('#c2ae94', -0.35); c.lineWidth = 3.4; c.lineCap = 'round';
    for (const [x0, x1] of [[-10, -13], [-3, -3], [5, 4], [12, 14]]) {
      c.beginPath(); c.moveTo(x0, 14); c.lineTo(x1, 34); c.stroke();
      c.fillStyle = '#6d5c44'; c.beginPath(); c.ellipse(x1, 35, 2.6, 1.8, 0, 0, Math.PI * 2); c.fill();
    }
    // body
    const g = c.createLinearGradient(0, -10, 0, 20);
    g.addColorStop(0, mix('#c2ae94', '#ffffff', 0.25)); g.addColorStop(1, '#a08b6c');
    c.fillStyle = g;
    lens(c, 0, 4, 40, 26); c.fill();
    // chest ruff
    c.fillStyle = '#e8dcc0';
    lens(c, -12, 8, 14, 16); c.fill();
    // neck + head
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(-16, -14, -14, -22);
    c.quadraticCurveTo(-13, -28, -18, -30); c.lineTo(-26, -27);
    c.quadraticCurveTo(-24, -22, -24, -18); c.quadraticCurveTo(-22, -6, -6, 4); c.closePath(); c.fill();
    eyeAlmond(c, -19, -25, 2.6, P);
    // antlers with rune glow
    c.strokeStyle = '#8a7355'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -30); c.quadraticCurveTo(-8, -40, 2, -42);
    c.moveTo(-8, -37); c.lineTo(-6, -44); c.moveTo(-2, -41) ; c.lineTo(0, -48); c.stroke();
    c.beginPath(); c.moveTo(-18, -31); c.quadraticCurveTo(-26, -40, -34, -40);
    c.moveTo(-26, -37); c.lineTo(-30, -44); c.stroke();
    if (o.form >= 1) { c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 6;
      for (const [mx, my] of [[-6, -44], [0, -48], [-30, -44], [2, -42]]) { c.beginPath(); c.arc(mx, my, 1.8, 0, Math.PI * 2); c.fill(); } c.shadowBlur = 0; }
    if (o.form >= 2) { // sun-disc between antlers
      c.fillStyle = P.gold; c.shadowColor = P.gold; c.shadowBlur = 10;
      c.beginPath(); c.arc(-12, -44, 7, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    }
    // rune on flank
    runeMarks(c, R, 2, 8, P.glow, 4);
  };
  LINE_PAINTERS[113] = function spellMoth(c, P, R, o) { // glyph-winged moth
    mirror(c, cc => { // big glyph wings
      const g = cc.createLinearGradient(6, -20, 40, 8);
      g.addColorStop(0, mix(P.base, '#ffffff', 0.35)); g.addColorStop(1, P.base);
      cc.fillStyle = g; cc.globalAlpha = 0.95;
      cc.beginPath(); cc.moveTo(4, -4);
      cc.bezierCurveTo(20, -30 - o.form * 4, 44, -22, 42, -6);
      cc.bezierCurveTo(41, 4, 28, 8, 4, 4); cc.closePath(); cc.fill();
      cc.beginPath(); cc.moveTo(4, 6);
      cc.bezierCurveTo(24, 6, 34, 16, 26, 24);
      cc.bezierCurveTo(18, 30, 6, 20, 4, 12); cc.closePath(); cc.fill();
      cc.globalAlpha = 1;
      // rune sigils on the wing
      runeMarks(cc, R, 3, 9, P.pale, -10);
      cc.save(); cc.translate(24, 18); runeMarks(cc, R, 1, 4, P.pale, 0); cc.restore();
      // wing eyespot
      cc.fillStyle = P.deep; cc.beginPath(); cc.arc(28, -12, 4.6, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = P.glow; cc.beginPath(); cc.arc(28, -12, 2, 0, Math.PI * 2); cc.fill();
    });
    // furred body
    const g = c.createLinearGradient(0, -18, 0, 26);
    g.addColorStop(0, P.light); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    lens(c, 0, 4, 13, 34); c.fill();
    c.strokeStyle = P.dark; c.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-6, 4 + i * 6); c.quadraticCurveTo(0, 7 + i * 6, 6, 4 + i * 6); c.stroke(); }
    // fluffy collar + head
    c.fillStyle = P.pale;
    lens(c, 0, -12, 17, 10); c.fill();
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -19, 8, 0, Math.PI * 2); c.fill();
    eyeGlow(c, -3.4, -20, 2.2, P.glow); eyeGlow(c, 3.4, -20, 2.2, P.glow);
    // feather antennae
    c.strokeStyle = P.dark; c.lineWidth = 1.8;
    mirror(c, cc => {
      cc.beginPath(); cc.moveTo(3, -26); cc.quadraticCurveTo(9, -36, 16, -38); cc.stroke();
      cc.strokeStyle = P.dark; cc.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { cc.beginPath(); cc.moveTo(4 + i * 3.4, -29 - i * 2.6); cc.lineTo(6 + i * 3.4, -25 - i * 2); cc.stroke(); }
    });
    motes(c, R, 4 + o.form * 2, 26, P.glow, -2);
    if (o.form >= 2) crownGold(c, -32, 8, P);
  };
  LINE_PAINTERS[116] = function riverSprite(c, P, R, o) { // living wave
    // splash crown behind
    mirror(c, cc => {
      cc.fillStyle = mix(P.base, '#ffffff', 0.4);
      cc.beginPath(); cc.moveTo(10, -14);
      cc.quadraticCurveTo(20, -26 - o.form * 4, 16, -34 - o.form * 4);
      cc.quadraticCurveTo(24, -28, 22, -16); cc.quadraticCurveTo(18, -8, 10, -8); cc.closePath(); cc.fill();
      cc.fillStyle = '#ffffff';
      cc.beginPath(); cc.arc(19, -34 - o.form * 4, 2.4, 0, Math.PI * 2); cc.fill();
    });
    // wave body: curl silhouette
    const g = c.createLinearGradient(0, -24, 0, 30);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.45)); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-24, 26);
    c.bezierCurveTo(-30, 4, -18, -22, 4, -26);
    c.bezierCurveTo(20, -28, 28, -18, 26, -10);
    c.bezierCurveTo(24, -16, 14, -18, 10, -12);
    c.bezierCurveTo(22, -4, 26, 12, 20, 26);
    c.closePath(); c.fill();
    // foam edge
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(24, -11); c.bezierCurveTo(20, -17, 13, -17, 10, -12); c.stroke();
    // face in the wave
    eyeAlmond(c, -6, -8, 4, P); eyeAlmond(c, 8, -4, 4, P);
    // koi fin
    c.fillStyle = mix(P.base, '#ffffff', 0.3);
    c.beginPath(); c.moveTo(-20, 8); c.quadraticCurveTo(-32, 2, -34, -8); c.quadraticCurveTo(-26, -2, -18, -2); c.closePath(); c.fill();
    motes(c, R, 3, 24, '#ffffff', 10);
    if (o.form >= 2) crownGold(c, -34, 11, P);
  };

  // ============================================================
  //  REALM 2 · BELLTOWER REACHES — rites on the mountain wind
  // ============================================================
  LINE_PAINTERS[201] = function windMonk(c, P, R, o) { // robed gust spirit
    // prayer streamers
    c.save(); c.lineCap = 'round';
    for (const [col, x0, amp] of [['#ef9a9a', -16, 10], ['#fff59d', 16, -8], ['#90caf9', 0, 12]]) {
      c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(x0 * 0.4, -18);
      c.quadraticCurveTo(x0 + amp, -6, x0 * 1.6, 16 + Math.abs(x0) * 0.4); c.stroke();
    }
    c.restore();
    // robe (wind-blown)
    const g = c.createLinearGradient(0, -26, 0, 30);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.5)); g.addColorStop(1, mix(P.base, '#37474f', 0.25));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -24);
    c.quadraticCurveTo(16, -16, 15, 4);
    c.quadraticCurveTo(14, 16, 22, 26);
    c.quadraticCurveTo(4, 22, -6, 26);
    c.quadraticCurveTo(-18, 28, -22, 22);
    c.quadraticCurveTo(-14, 16, -14, 2);
    c.quadraticCurveTo(-15, -16, 0, -24); c.closePath(); c.fill();
    // sash
    c.strokeStyle = '#ffb74d'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(-13, 0); c.quadraticCurveTo(0, 6, 14, 0); c.stroke();
    // hood + calm face
    c.fillStyle = mix(P.base, '#ffffff', 0.32);
    c.beginPath(); c.arc(0, -26, 11, Math.PI * 0.92, Math.PI * 0.08); c.quadraticCurveTo(0, -14, -10.6, -23); c.closePath(); c.fill();
    c.fillStyle = '#fff8ee';
    c.beginPath(); c.arc(0, -24, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -25); c.quadraticCurveTo(-2.5, -23.6, -1, -25); c.stroke();
    c.beginPath(); c.moveTo(1, -25); c.quadraticCurveTo(2.5, -23.6, 4, -25); c.stroke();
    if (o.form >= 1) { // straw hat
      c.fillStyle = '#d7b98c';
      c.beginPath(); c.ellipse(0, -33, 15, 5, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(-8, -34); c.quadraticCurveTo(0, -42, 8, -34); c.closePath(); c.fill();
      c.strokeStyle = '#a9853f'; c.lineWidth = 1; c.stroke();
    }
    if (o.form >= 2) halo(c, 0, -40, 13, 4.6, P.gold, 2.6);
  };
  LINE_PAINTERS[204] = function templeFist(c, P, R, o) { // stone guardian of fists
    const stone = mix('#c62828', '#8d6e63', 0.5);
    // rear arm pair (form 2+ grows four arms)
    if (o.form >= 1) mirror(c, cc => {
      cc.strokeStyle = shade(stone, -0.25); cc.lineWidth = 6; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(12, -8); cc.quadraticCurveTo(26, -18, 30, -28); cc.stroke();
      cc.fillStyle = '#ffccbc';
      cc.beginPath(); cc.roundRect(25, -38, 11, 11, 3); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
    });
    // torso wedge
    const g = c.createLinearGradient(0, -26, 0, 30);
    g.addColorStop(0, shade(stone, 0.25)); g.addColorStop(1, shade(stone, -0.3));
    c.fillStyle = g;
    poly(c, [[-20, -20], [20, -20], [15, 22], [-15, 22]]); c.fill();
    // rope belt (shimenawa)
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(-16, 6); c.quadraticCurveTo(0, 12, 16, 6); c.stroke();
    c.fillStyle = '#e8dcc0';
    for (const zx of [-8, 0, 8]) poly(c, [[zx - 2, 10], [zx + 2, 10], [zx, 17]]), c.fill();
    // main arms: guard stance
    mirror(c, cc => {
      cc.strokeStyle = stone; cc.lineWidth = 7; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(14, -6); cc.quadraticCurveTo(24, 0, 24, 8); cc.stroke();
      cc.fillStyle = '#ffccbc';
      cc.beginPath(); cc.roundRect(18, 8, 12, 12, 3.4); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
      cc.beginPath(); cc.moveTo(21, 8); cc.lineTo(21, 14); cc.moveTo(24.6, 8); cc.lineTo(24.6, 14); cc.stroke();
    });
    // head: stern mask
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-11, -38, 22, 19, 6); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    eyeGlow(c, -5, -30, 2.2, P.glow, 0.2); eyeGlow(c, 5, -30, 2.2, P.glow, -0.2);
    c.strokeStyle = P.ink; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-4, -23.5); c.lineTo(4, -23.5); c.stroke();
    // topknot / mandala
    if (o.form < 2) { c.fillStyle = stone; c.beginPath(); c.arc(0, -40, 4, 0, Math.PI * 2); c.fill(); }
    else { halo(c, 0, -30, 26, 26, P.gold, 2.2, 0.6); orbitals(c, 6, 26, 26, 3, P.gold, 0.3, -30); }
  };
  LINE_PAINTERS[207] = function bellSpirit(c, P, R, o) { // the living bell
    // sound rings
    c.save(); c.strokeStyle = P.glow; c.globalAlpha = 0.55; c.lineWidth = 2;
    for (let i = 1; i <= 1 + o.form; i++) halo(c, 0, 6, 26 + i * 7, 9 + i * 3, P.glow, 2, 0.5 - i * 0.12);
    c.restore();
    // bell body
    const g = c.createLinearGradient(0, -28, 0, 26);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.45)); g.addColorStop(1, mix(P.base, '#4a2c6b', 0.3));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -30);
    c.bezierCurveTo(15, -28, 16, -8, 17, 6);
    c.quadraticCurveTo(18, 12, 22, 15); c.lineTo(-22, 15);
    c.quadraticCurveTo(-18, 12, -17, 6);
    c.bezierCurveTo(-16, -8, -15, -28, 0, -30); c.closePath(); c.fill();
    // engraved bands
    c.strokeStyle = shade(P.base, -0.35); c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-15, -6); c.quadraticCurveTo(0, -2, 15, -6); c.stroke();
    c.beginPath(); c.moveTo(-16.6, 4); c.quadraticCurveTo(0, 8, 16.6, 4); c.stroke();
    runeMarks(c, R, 3, 8, P.pale, -14);
    // sleepy face on the bell
    eyeAlmond(c, -6, -16, 3, P); eyeAlmond(c, 6, -16, 3, P);
    // clapper heart glowing below
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 10;
    c.beginPath(); c.arc(0, 22, 5 + o.form, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // crown loop
    c.strokeStyle = shade(P.base, -0.3); c.lineWidth = 3.4;
    c.beginPath(); c.arc(0, -32, 4.6, Math.PI * 0.9, Math.PI * 0.1); c.stroke();
    if (o.form >= 2) crownGold(c, -40, 10, P);
  };
  LINE_PAINTERS[210] = function lanternWraith(c, P, R, o) { // vesper lantern ghost
    // hanging tassels
    mirror(c, cc => {
      cc.strokeStyle = '#b39ddb'; cc.lineWidth = 2; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(10, 22); cc.quadraticCurveTo(12, 32, 9, 40); cc.stroke();
      cc.fillStyle = '#b39ddb';
      cc.beginPath(); cc.arc(9, 42, 2.2, 0, Math.PI * 2); cc.fill();
    });
    // paper lantern body
    const g = c.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.35)); g.addColorStop(0.5, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 0, 22, 26, 0, 0, Math.PI * 2); c.fill();
    // paper ribs
    c.strokeStyle = 'rgba(20,12,40,0.4)'; c.lineWidth = 1.4;
    for (const rx of [8, 15, 20]) { c.beginPath(); c.ellipse(0, 0, rx, 26, 0, 0, Math.PI * 2); c.stroke(); }
    // caps
    c.fillStyle = '#4a3b63';
    c.beginPath(); c.roundRect(-9, -30, 18, 6, 2); c.fill();
    c.beginPath(); c.roundRect(-9, 24, 18, 6, 2); c.fill();
    // inner flame face
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    flame(c, 0, -2, 10 + o.form * 2, P.glow, '#ffffff');
    c.shadowBlur = 0;
    eyeGlow(c, -6, -4, 2.6, '#2a1a4a', 0.15); eyeGlow(c, 6, -4, 2.6, '#2a1a4a', -0.15);
    // ghostly arms
    mirror(c, cc => {
      cc.fillStyle = 'rgba(179,157,219,0.8)';
      cc.beginPath(); cc.moveTo(20, -4); cc.quadraticCurveTo(32, -8, 36, -16 - o.form * 3);
      cc.quadraticCurveTo(30, -4, 22, 2); cc.closePath(); cc.fill();
    });
    if (o.form >= 2) crownGold(c, -36, 9, P);
  };
  LINE_PAINTERS[213] = function bonsaiSpirit(c, P, R, o) { // potted cloud-pine
    // pot with tiny legs
    c.fillStyle = '#8d5b3f';
    c.beginPath(); c.moveTo(-16, 16); c.lineTo(16, 16); c.lineTo(12, 30); c.lineTo(-12, 30); c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#6d452f';
    c.beginPath(); c.roundRect(-17, 14, 34, 5, 2); c.fill();
    // trunk S-curve
    c.strokeStyle = '#6d4c33'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 16); c.bezierCurveTo(-8, 4, 8, -6, -2, -18); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(-3, -4); c.quadraticCurveTo(-14, -8, -18, -16); c.stroke();
    // foliage clouds
    for (const [fx, fy, fr] of [[-2, -26, 13 + o.form * 2], [-18, -18, 9], [12, -14, 8 + o.form]]) {
      const g = c.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, fr * 1.5);
      g.addColorStop(0, mix(P.base, '#ffffff', 0.4)); g.addColorStop(1, mix(P.base, '#1b5e20', 0.25));
      c.fillStyle = g;
      blobPath(c, [[fx - fr, fy], [fx - fr * 0.5, fy - fr], [fx + fr * 0.5, fy - fr * 0.9], [fx + fr, fy], [fx + fr * 0.4, fy + fr * 0.6], [fx - fr * 0.5, fy + fr * 0.6]]);
      c.fill();
    }
    // face on the pot
    eyeAlmond(c, -6, 22, 2.8, P); eyeAlmond(c, 6, 22, 2.8, P);
    // hanging scroll charm
    if (o.form >= 1) {
      c.strokeStyle = '#e8dcc0'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(14, -12); c.lineTo(16, -2); c.stroke();
      c.fillStyle = '#fff8ee'; c.fillRect(13, -2, 7, 10);
      c.strokeStyle = '#c62828'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(16.5, 0); c.lineTo(16.5, 6); c.stroke();
    }
    if (o.form >= 2) motes(c, R, 5, 26, P.glow, -18);
  };
  LINE_PAINTERS[216] = function chorister(c, P, R, o) { // hymn-singer spirit
    // hymn scroll
    if (o.form >= 1) {
      c.save(); c.rotate(-0.08);
      c.fillStyle = '#fff8ee';
      c.beginPath(); c.roundRect(-26, -6, 16, 20, 2); c.fill();
      c.strokeStyle = '#c9b891'; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = '#8a7a5c';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-23, -2 + i * 4.4); c.lineTo(-13, -2 + i * 4.4); c.stroke(); }
      c.restore();
    }
    // robe
    const g = c.createLinearGradient(0, -24, 0, 30);
    g.addColorStop(0, '#f5efe2'); g.addColorStop(1, '#cbbfa4');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -20);
    c.quadraticCurveTo(15, -12, 14, 8);
    c.quadraticCurveTo(13, 22, 18, 28); c.lineTo(-18, 28);
    c.quadraticCurveTo(-13, 22, -14, 8);
    c.quadraticCurveTo(-15, -12, 0, -20); c.closePath(); c.fill();
    // collar
    c.fillStyle = '#c62828';
    poly(c, [[-8, -16], [8, -16], [0, -4]]); c.fill();
    // head, singing
    c.fillStyle = '#fff8ee';
    c.beginPath(); c.arc(0, -24, 10, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-5.6, -27); c.quadraticCurveTo(-4, -28.6, -2.4, -27); c.stroke();
    c.beginPath(); c.moveTo(2.4, -27); c.quadraticCurveTo(4, -28.6, 5.6, -27); c.stroke();
    c.fillStyle = P.ink;
    c.beginPath(); c.ellipse(0, -20, 2.6, 3.4, 0, 0, Math.PI * 2); c.fill();
    // the sung note, floating
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 6;
    c.beginPath(); c.ellipse(10, -36, 3, 2.2, -0.3, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = P.glow; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(12.6, -37); c.lineTo(13.4, -46); c.stroke();
    if (o.form >= 2) { halo(c, 0, -38, 11, 4, P.gold, 2.4); motes(c, R, 4, 24, P.glow, -30); }
  };

  // ============================================================
  //  REALM 3 · DROWNED EXPANSE — the old world sleeps below
  // ============================================================
  LINE_PAINTERS[301] = function brineGolem(c, P, R, o) { // coral-crusted tide golem
    // body boulder of sea-stone
    const g = c.createLinearGradient(0, -24, 0, 30);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.25)); g.addColorStop(1, mix(P.base, '#0d2a3a', 0.4));
    c.fillStyle = g;
    blobPath(c, [[-24, 8], [-20, -16], [0, -26], [20, -16], [25, 6], [12, 26], [-12, 26]]);
    c.fill();
    // coral outcrops
    c.strokeStyle = '#ff8a65'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -18); c.lineTo(-17, -27); c.moveTo(-14, -18); c.lineTo(-10, -26); c.moveTo(-12, -22); c.lineTo(-15, -30); c.stroke();
    c.strokeStyle = '#ffab91'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(14, -14); c.lineTo(18, -22); c.moveTo(16, -16); c.lineTo(12, -24); c.stroke();
    // barnacle clusters
    for (const [bx, by] of [[-16, 6], [18, 2], [4, 20]]) {
      c.fillStyle = '#cfd8dc';
      c.beginPath(); c.arc(bx, by, 3.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#607d8b';
      c.beginPath(); c.arc(bx, by, 1.4, 0, Math.PI * 2); c.fill();
    }
    // starfish badge
    c.fillStyle = '#ffb74d';
    c.save(); c.translate(10, 12);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; poly(c, [[0, 0], [Math.cos(a - 0.3) * 3, Math.sin(a - 0.3) * 3], [Math.cos(a) * 6.4, Math.sin(a) * 6.4], [Math.cos(a + 0.3) * 3, Math.sin(a + 0.3) * 3]]); c.fill(); }
    c.restore();
    // glow eyes in a crag
    c.fillStyle = shade(P.base, -0.55);
    lens(c, -2, -8, 22, 10); c.fill();
    eyeGlow(c, -7, -8, 2.6, P.glow); eyeGlow(c, 4, -8, 2.6, P.glow);
    // dripping water
    c.fillStyle = mix(P.base, '#ffffff', 0.5);
    for (const [dx, dy] of [[-8, 28], [6, 30]]) { teardrop(c, dx, dy, 4, 7, 0.9); c.fill(); }
    if (o.form >= 1) { c.strokeStyle = '#80cbc4'; c.lineWidth = 2; halo(c, 0, 2, 30, 30, '#80cbc4', 1.8, 0.35); }
    if (o.form >= 2) crownGold(c, -32, 11, P);
  };
  LINE_PAINTERS[304] = function bergLeviathan(c, P, R, o) { // iceberg-backed whale
    // the berg riding its back
    c.fillStyle = '#eaf7fb';
    poly(c, [[-6, -14], [4, -40 - o.form * 5], [14, -18], [24, -30], [30, -12]]);
    c.fill();
    c.strokeStyle = '#9fd8e8'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = 'rgba(160,220,235,0.6)';
    poly(c, [[0, -16], [4, -32], [10, -17]]); c.fill();
    // whale body
    const g = c.createLinearGradient(0, -14, 0, 26);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.2)); g.addColorStop(1, mix(P.base, '#0a2740', 0.45));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-34, 2);
    c.bezierCurveTo(-30, -12, -8, -16, 12, -12);
    c.bezierCurveTo(30, -8, 36, 2, 32, 10);
    c.bezierCurveTo(24, 22, -16, 24, -28, 14);
    c.quadraticCurveTo(-34, 10, -34, 2); c.closePath(); c.fill();
    // tail fluke
    c.fillStyle = g;
    c.beginPath(); c.moveTo(30, 6); c.quadraticCurveTo(42, 2, 46, -6);
    c.quadraticCurveTo(44, 4, 47, 8); c.quadraticCurveTo(40, 8, 34, 13); c.closePath(); c.fill();
    // belly grooves
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-26 + i * 2, 12 + i * 3.4); c.quadraticCurveTo(0, 16 + i * 3.6, 22 - i * 3, 12 + i * 3.4); c.stroke(); }
    eyeAlmond(c, -24, 2, 3, P);
    // frost breath
    if (o.form >= 1) { c.fillStyle = '#eaf7fb'; motes(c, R, 4, 10, '#eaf7fb', -20); }
    if (o.form >= 2) crystal(c, 24, -34, 8, '#eaf7fb', 0.2);
  };
  LINE_PAINTERS[307] = function anglerFiend(c, P, R, o) { // deep-trench lure horror
    // the lure
    c.strokeStyle = mix(P.base, '#ffffff', 0.2); c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -22); c.quadraticCurveTo(-16, -38, -26, -34); c.stroke();
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    c.beginPath(); c.arc(-28, -32, 4.4 + o.form, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // bulbous body
    const g = c.createLinearGradient(0, -22, 0, 26);
    g.addColorStop(0, mix(P.base, '#2a1a4a', 0.2)); g.addColorStop(1, '#161028');
    c.fillStyle = g;
    blobPath(c, [[-26, -2], [-14, -20], [12, -22], [30, -6], [26, 14], [4, 24], [-18, 18]]);
    c.fill();
    // tail fin
    c.fillStyle = mix(P.base, '#2a1a4a', 0.4);
    c.beginPath(); c.moveTo(28, 0); c.quadraticCurveTo(40, -8, 44, -14);
    c.quadraticCurveTo(42, 0, 45, 8); c.quadraticCurveTo(36, 8, 29, 10); c.closePath(); c.fill();
    // gaping jaw with needle teeth
    c.fillStyle = '#0d0a18';
    c.beginPath(); c.moveTo(-26, -2);
    c.quadraticCurveTo(-10, 2, 6, 0);
    c.quadraticCurveTo(-4, 12, -20, 10);
    c.quadraticCurveTo(-26, 6, -26, -2); c.closePath(); c.fill();
    c.fillStyle = '#eaf2f5';
    for (let i = 0; i < 5; i++) { const tx = -22 + i * 6; poly(c, [[tx, 0 + (i % 2)], [tx + 2.4, 0 + (i % 2)], [tx + 1.2, 5 + (i % 2) * 2]]); c.fill(); }
    for (let i = 0; i < 4; i++) { const tx = -19 + i * 6; poly(c, [[tx, 9], [tx + 2.4, 9], [tx + 1.2, 5]]); c.fill(); }
    // mad glow eye
    eyeGlow(c, -8, -12, 3.6, P.glow, 0.3);
    // photophore dots along flank
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 5;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(2 + i * 7, 14 - i * 1.4, 1.4, 0, Math.PI * 2); c.fill(); }
    c.shadowBlur = 0;
    // dorsal spines
    c.strokeStyle = mix(P.base, '#ffffff', 0.15); c.lineWidth = 2;
    for (let i = 0; i < 3 + o.form; i++) { c.beginPath(); c.moveTo(0 + i * 7, -20 + i); c.lineTo(3 + i * 7, -28 + i); c.stroke(); }
    if (o.form >= 2) crownGold(c, -30, 9, P);
  };
  LINE_PAINTERS[310] = function drownedWraith(c, P, R, o) { // kelp-shrouded drowned soul
    // anchor dragged behind
    if (o.form >= 1) {
      c.save(); c.rotate(0.2); c.strokeStyle = '#6a7d8c'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(16, -6); c.lineTo(24, 18); c.stroke();
      c.beginPath(); c.arc(24, 24, 7, Math.PI * 0.85, Math.PI * 0.15, true); c.stroke();
      c.beginPath(); c.moveTo(24, 14); c.lineTo(24, 26); c.stroke();
      c.fillStyle = '#6a7d8c'; poly(c, [[21, 12], [27, 12], [24, 7]]); c.fill();
      c.restore();
    }
    // shroud body
    const g = c.createLinearGradient(0, -26, 0, 30);
    g.addColorStop(0, mix(P.base, '#c5e8dd', 0.35)); g.addColorStop(1, mix(P.base, '#0a2430', 0.5));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -28);
    c.quadraticCurveTo(16, -20, 14, 2);
    c.lineTo(17, 26);
    c.quadraticCurveTo(8, 20, 4, 28);
    c.quadraticCurveTo(0, 22, -6, 29);
    c.quadraticCurveTo(-10, 22, -16, 27);
    c.lineTo(-14, 2);
    c.quadraticCurveTo(-16, -20, 0, -28); c.closePath(); c.fill();
    // kelp ribbons draped over
    c.strokeStyle = '#2e7d5b'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, -22); c.bezierCurveTo(-16, -8, -10, 6, -14, 20); c.stroke();
    c.beginPath(); c.moveTo(8, -24); c.bezierCurveTo(14, -10, 8, 6, 12, 18); c.stroke();
    c.strokeStyle = '#3e9b70'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(0, -27); c.bezierCurveTo(-3, -12, 2, 0, -2, 12); c.stroke();
    // hollow face
    c.fillStyle = '#0d1a20';
    lens(c, 0, -14, 16, 12); c.fill();
    eyeGlow(c, -4.6, -15, 2.4, P.glow); eyeGlow(c, 4.6, -15, 2.4, P.glow);
    // bubbles rising
    c.strokeStyle = 'rgba(200,240,255,0.7)'; c.lineWidth = 1.4;
    for (const [bx, by, br2] of [[12, -32, 2.6], [16, -40, 1.8], [8, -38, 1.3]]) { c.beginPath(); c.arc(bx, by, br2, 0, Math.PI * 2); c.stroke(); }
    if (o.form >= 2) crownGold(c, -36, 10, P); // the Drowned King
  };
  LINE_PAINTERS[313] = function seaWyrm(c, P, R, o) { // eel-dragon of the trench
    // serpentine body
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      pts.push([Math.sin(t * Math.PI * 2.2 + 0.6) * (24 + o.form * 3) * (1 - t * 0.3), 34 - t * 66]);
    }
    // dorsal fin ribbon along the spine
    c.fillStyle = mix(P.base, '#00e5ff', 0.25);
    c.beginPath();
    c.moveTo(pts[2][0], pts[2][1]);
    for (let i = 2; i <= 20; i += 2) c.lineTo(pts[i][0] + (i % 4 ? 10 : 13), pts[i][1] - 4);
    for (let i = 20; i >= 2; i -= 2) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.fill();
    tailSpline(c, pts, 10 + o.form, P.base, P.deep);
    // belly shine
    c.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 4; i < 20; i += 3) { c.beginPath(); c.arc(pts[i][0] - 2, pts[i][1] + 2, 4.4, 0, Math.PI * 2); c.fill(); }
    // head
    const [hx, hy] = pts[22];
    c.fillStyle = P.base;
    lens(c, hx, hy - 3, 22, 16); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 1.6; lens(c, hx, hy - 3, 22, 16); c.stroke();
    // jaw + fangs
    c.fillStyle = P.pale;
    poly(c, [[hx - 9, hy + 2], [hx - 4, hy + 7], [hx - 6, hy + 2]]); c.fill();
    poly(c, [[hx + 9, hy + 2], [hx + 4, hy + 7], [hx + 6, hy + 2]]); c.fill();
    // horn fins
    mirror(c, cc => { cc.fillStyle = mix(P.base, '#00e5ff', 0.3);
      poly(cc, [[Math.abs(hx) * 0 + 8, hy - 6], [20, hy - 16], [12, hy - 2]]); cc.fill(); });
    eyeGlow(c, hx - 6, hy - 5, 2.6, P.glow, 0.2); eyeGlow(c, hx + 6, hy - 5, 2.6, P.glow, -0.2);
    // whisker barbels
    c.strokeStyle = P.glow; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx - 10, hy + 1); c.quadraticCurveTo(hx - 18, hy + 6, hx - 17, hy + 12); c.stroke();
    c.beginPath(); c.moveTo(hx + 10, hy + 1); c.quadraticCurveTo(hx + 18, hy + 6, hx + 17, hy + 12); c.stroke();
    if (o.form >= 2) crownGold(c, hy - 20, 9, P);
  };
  LINE_PAINTERS[316] = function kelpShade(c, P, R, o) { // tangle of living kelp
    // kelp ribbon cluster (the whole body is ribbons)
    const ribbons = [[-16, 0.9, 30], [-6, -0.6, 38], [4, 0.7, 34], [14, -0.8, 28], [0, 0.2, 44]];
    for (const [x0, lean, len] of ribbons) {
      const g = c.createLinearGradient(0, 24, 0, 24 - len - o.form * 6);
      g.addColorStop(0, mix(P.base, '#0a3524', 0.5)); g.addColorStop(1, mix(P.base, '#7bd88a', 0.35));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x0 - 4, 26);
      c.bezierCurveTo(x0 - 8 + lean * 8, 8, x0 + lean * 12, -6, x0 + lean * 6 - 3, 26 - len - o.form * 6);
      c.bezierCurveTo(x0 + lean * 14 + 4, -4, x0 + 6 + lean * 6, 10, x0 + 4, 26);
      c.closePath(); c.fill();
    }
    // gas-bladder floats
    for (const [bx, by] of [[-10, -14], [8, -20], [0, -6]]) {
      c.fillStyle = mix(P.base, '#d3f58a', 0.5);
      c.beginPath(); c.arc(bx, by, 4.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(bx - 1.2, by - 1.4, 1.4, 0, Math.PI * 2); c.fill();
    }
    // holdfast root ball
    c.fillStyle = '#3e2f23';
    blobPath(c, [[-14, 28], [-8, 22], [0, 24], [8, 22], [14, 28], [6, 33], [-6, 33]]); c.fill();
    // peering eyes between fronds
    eyeGlow(c, -5, -2, 2.8, P.glow, 0.1); eyeGlow(c, 6, 2, 2.8, P.glow, -0.1);
    if (o.form >= 1) motes(c, R, 4, 20, 'rgba(200,255,220,0.8)', -10);
    if (o.form >= 2) crownGold(c, -34, 9, P);
  };

  // ============================================================
  //  REALM 4 · FOUNDRY PEAKS — the first machine city
  // ============================================================
  LINE_PAINTERS[401] = function gearGolem(c, P, R, o) { // walking cog assembly
    // shoulder gears (behind)
    mirror(c, cc => gearRing(cc, 20, -14, 10 + o.form * 2, 7, '#8fa0b3'));
    // main gear torso
    gearRing(c, 0, 0, 22 + o.form * 2, 9, '#a9bac9', 0.36);
    c.fillStyle = '#5a6a7a';
    c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
    // molten core in the hub
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
    c.beginPath(); c.arc(0, 0, 5.4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // legs: piston stubs
    mirror(c, cc => {
      cc.fillStyle = '#7e8fa0';
      cc.beginPath(); cc.roundRect(6, 22, 8, 14, 3); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
      cc.fillStyle = '#5a6a7a';
      cc.beginPath(); cc.roundRect(4, 34, 12, 5, 2); cc.fill();
    });
    // arms: wrench + clamp
    c.strokeStyle = '#7e8fa0'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-20, -4); c.lineTo(-32, 6); c.stroke();
    c.fillStyle = '#a9bac9';
    c.beginPath(); c.arc(-34, 9, 5, Math.PI * 0.2, Math.PI * 1.8); c.lineTo(-34, 9); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(20, -4); c.lineTo(30, 8);
    c.strokeStyle = '#7e8fa0'; c.stroke();
    c.fillStyle = '#a9bac9';
    poly(c, [[28, 6], [36, 10], [28, 14]]); c.fill();
    // head: riveted dome with visor
    c.fillStyle = '#a9bac9';
    c.beginPath(); c.roundRect(-10, -36 - o.form * 2, 20, 15, 5); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    visor(c, 0, -28 - o.form * 2, 15, 6, P.glow);
    if (o.form >= 1) { c.fillStyle = '#8fa0b3'; gearRing(c, 0, -42 - o.form, 5, 6, '#8fa0b3', 0.4); }
    if (o.form >= 2) crownGold(c, -50, 10, P);
  };
  LINE_PAINTERS[404] = function slagBrute(c, P, R, o) { // magma-cracked boulder
    // arms: heavy knuckle-down slabs
    mirror(c, cc => {
      cc.fillStyle = '#6d5850';
      blobPath(cc, [[18, -8], [30, -12], [36, 2], [32, 16], [22, 18], [16, 6]]); cc.fill();
      // magma knuckle cracks
      cc.strokeStyle = P.glow; cc.lineWidth = 2; cc.shadowColor = P.glow; cc.shadowBlur = 5;
      cc.beginPath(); cc.moveTo(26, 4); cc.lineTo(31, 8); cc.moveTo(28, 12); cc.lineTo(24, 15); cc.stroke(); cc.shadowBlur = 0;
    });
    // squat body
    const g = c.createLinearGradient(0, -22, 0, 30);
    g.addColorStop(0, '#8a7066'); g.addColorStop(1, '#4a3a34');
    c.fillStyle = g;
    blobPath(c, [[-22, 4], [-16, -18], [2, -24], [20, -16], [24, 8], [10, 26], [-14, 24]]);
    c.fill();
    // magma fissures
    c.strokeStyle = P.glow; c.lineWidth = 2.6; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.moveTo(-10, -16); c.lineTo(-4, -8); c.lineTo(-12, 0); c.moveTo(-4, -8); c.lineTo(4, -2); c.lineTo(0, 10); c.stroke();
    c.shadowBlur = 0;
    // slag drips
    c.fillStyle = P.glow;
    teardrop(c, 6, 20, 4, 8, 0.9); c.fill();
    teardrop(c, -8, 26, 3.4, 7, 0.9); c.fill();
    // deep-set glow eyes
    c.fillStyle = '#2a1c16';
    lens(c, 2, -14, 20, 9); c.fill();
    eyeGlow(c, -3, -14, 2.6, P.glow, 0.2); eyeGlow(c, 7, -14, 2.6, P.glow, -0.2);
    if (o.form >= 1) { // vent stacks
      mirror(c, cc => { cc.fillStyle = '#4a3a34'; cc.beginPath(); cc.roundRect(8, -30, 6, 10, 2); cc.fill();
        flame(cc, 11, -32, 5, P.glow, '#ffffff'); });
    }
    if (o.form >= 2) crownGold(c, -34, 11, P);
  };
  LINE_PAINTERS[407] = function furnaceImp(c, P, R, o) { // living smelter stove
    // chimney head pipe
    c.fillStyle = '#4a4440';
    c.beginPath(); c.roundRect(-6, -42 - o.form * 3, 12, 14, 3); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    // puffing smoke
    c.fillStyle = 'rgba(120,110,105,0.55)';
    c.beginPath(); c.arc(2, -46 - o.form * 3, 5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(8, -52 - o.form * 3, 3.4, 0, Math.PI * 2); c.fill();
    // stove body
    const g = c.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, '#6b625c'); g.addColorStop(1, '#3c3531');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-20, -28, 40, 52, 10); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // fire door (the belly furnace)
    c.fillStyle = '#241a14';
    c.beginPath(); c.roundRect(-13, -4, 26, 20, 6); c.fill();
    flame(c, -5, 6, 8, P.base, P.glow); flame(c, 5, 7, 6.4, P.base, P.glow);
    // grate bars
    c.strokeStyle = '#241a14'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-13, 6); c.lineTo(13, 6); c.stroke();
    // rivet trim + gauge eyes
    c.fillStyle = '#8a7f78';
    for (const rx of [-16, 0, 16]) { c.beginPath(); c.arc(rx, -24, 1.6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff3e0';
    c.beginPath(); c.arc(-8, -16, 5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(8, -16, 5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3c3531'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-8, -16); c.lineTo(-5.4, -18.4); c.stroke(); // gauge needles
    c.beginPath(); c.moveTo(8, -16); c.lineTo(10.6, -18.4); c.stroke();
    // stubby feet
    mirror(c, cc => { cc.fillStyle = '#3c3531'; cc.beginPath(); cc.roundRect(6, 24, 9, 7, 2); cc.fill(); });
    if (o.form >= 1) { c.strokeStyle = P.glow; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, -10); c.lineTo(-24, -10); c.moveTo(20, -10); c.lineTo(24, -10); c.stroke(); }
    if (o.form >= 2) crownGold(c, -50, 10, P);
  };
  LINE_PAINTERS[410] = function drillMole(c, P, R, o) { // tunnel-boring machine-beast
    // tread base
    c.fillStyle = '#4a4440';
    c.beginPath(); c.roundRect(-24, 18, 48, 14, 7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#2c2724';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-17 + i * 8.6, 25, 3.2, 0, Math.PI * 2); c.fill(); }
    // dome body
    const g = c.createLinearGradient(0, -26, 0, 20);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.25)); g.addColorStop(1, shade(P.base, -0.35));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 2, 24, Math.PI, 0); c.lineTo(24, 18); c.lineTo(-24, 18); c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // the great drill nose
    c.save(); c.translate(0, -22); c.rotate(-0.06);
    c.fillStyle = '#8fa0b3';
    poly(c, [[0, -22 - o.form * 4], [11, 2], [-11, 2]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = '#5a6a7a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-8, -3); c.lineTo(8, -7); c.moveTo(-6, -9); c.lineTo(6, -13); c.moveTo(-3.4, -15 - o.form * 2); c.lineTo(3.4, -17 - o.form * 2); c.stroke();
    c.restore();
    // goggle eyes on the dome
    visor(c, 0, -6, 22, 8, P.glow);
    // side scoops
    mirror(c, cc => {
      cc.fillStyle = shade(P.base, -0.2);
      cc.beginPath(); cc.moveTo(20, 0); cc.quadraticCurveTo(32, 2, 34, 12); cc.lineTo(24, 14); cc.closePath(); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
    });
    // kicked-up rubble
    c.fillStyle = '#8d6e63';
    for (const [rx, ry] of [[-30, 30], [30, 28], [-34, 24]]) poly(c, [[rx, ry], [rx + 5, ry - 3], [rx + 6, ry + 2]]), c.fill();
    if (o.form >= 2) crownGold(c, -40, 11, P);
  };
  LINE_PAINTERS[413] = function rivetBot(c, P, R, o) { // dynamo worker spark
    // tesla coil topknot
    c.fillStyle = '#5a6a7a';
    c.beginPath(); c.roundRect(-3, -40, 6, 12, 2); c.fill();
    c.fillStyle = P.base; c.shadowColor = P.base; c.shadowBlur = 10;
    c.beginPath(); c.arc(0, -43, 5 + o.form, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.save(); c.strokeStyle = P.glow; c.lineWidth = 1.8; c.lineCap = 'round'; c.shadowColor = P.base; c.shadowBlur = 6;
    c.beginPath(); c.moveTo(-4, -46); c.lineTo(-9, -50); c.moveTo(4, -46); c.lineTo(9, -51); c.stroke(); c.restore();
    // barrel body
    const g = c.createLinearGradient(0, -28, 0, 26);
    g.addColorStop(0, '#ffe082'); g.addColorStop(1, '#f9a825');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-16, -28, 32, 48, 12); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // hazard chevrons
    c.fillStyle = '#37474f';
    for (let i = 0; i < 3; i++) poly(c, [[-16 + i * 11, 20], [-10 + i * 11, 12], [-5 + i * 11, 20]]), c.fill();
    // rivets
    c.fillStyle = '#8d6e63';
    for (const [rx, ry] of [[-12, -24], [12, -24], [-12, 6], [12, 6]]) { c.beginPath(); c.arc(rx, ry, 1.8, 0, Math.PI * 2); c.fill(); }
    // face plate
    visor(c, 0, -14, 20, 9, P.glow, '#33291a');
    // wrench arm + bolt arm
    c.strokeStyle = '#5a6a7a'; c.lineWidth = 4.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-16, -4); c.lineTo(-27, 4); c.stroke();
    c.fillStyle = '#8fa0b3';
    c.beginPath(); c.arc(-29, 7, 4.4, Math.PI * 0.25, Math.PI * 1.75); c.lineTo(-29, 7); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(16, -4); c.lineTo(26, 2);
    c.strokeStyle = '#5a6a7a'; c.stroke();
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 6;
    poly(c, [[26, -2], [31, 1], [29, 6], [24, 3]]); c.fill(); c.shadowBlur = 0;
    if (o.form >= 2) crownGold(c, -52, 9, P);
  };
  LINE_PAINTERS[416] = function smogShade(c, P, R, o) { // chimney-born smoke spirit
    // the chimney stub it rises from
    c.fillStyle = '#4a4440';
    c.beginPath(); c.roundRect(-10, 18, 20, 14, 3); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#3a3431';
    c.beginPath(); c.roundRect(-12, 14, 24, 6, 2); c.fill();
    // billowing smoke body (stacked puffs)
    const puffs = [[0, 6, 16], [-10, -4, 12], [9, -6, 13], [-4, -18, 11 + o.form * 2], [6, -26, 8 + o.form * 2]];
    for (const [px, py, pr] of puffs) {
      const g = c.createRadialGradient(px - 2, py - 3, 1, px, py, pr * 1.5);
      g.addColorStop(0, mix(P.base, '#d5cfe0', 0.4)); g.addColorStop(1, mix(P.base, '#241a2e', 0.45));
      c.fillStyle = g;
      c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
    }
    // toxic glints inside
    motes(c, R, 4, 14, P.glow, -8);
    // heavy-lidded eyes + grin crack
    eyeGlow(c, -6, -14, 3, P.glow, 0.25); eyeGlow(c, 6, -16, 3, P.glow, -0.25);
    c.strokeStyle = P.glow; c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-5, -5); c.quadraticCurveTo(0, -2, 6, -6); c.stroke();
    // drifting wisps
    c.save(); c.globalAlpha = 0.6; c.fillStyle = mix(P.base, '#d5cfe0', 0.3);
    c.beginPath(); c.arc(-18, -24, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(16, -32, 3, 0, Math.PI * 2); c.fill();
    c.restore();
    if (o.form >= 2) crownGold(c, -40, 9, P);
  };

  // ============================================================
  //  REALM 5 · CHROME SPRAWL — the grid never sleeps
  // ============================================================
  LINE_PAINTERS[501] = function neonHound(c, P, R, o) { // wireframe current-dog
    const wire = P.base, wireHi = P.glow;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    // filled dark body first (so the neon reads)
    c.fillStyle = 'rgba(16,20,34,0.9)';
    blobPath(c, [[-28, 4], [-20, -10], [0, -14], [20, -8], [28, 2], [18, 14], [-16, 16]]);
    c.fill();
    // neon contour
    c.strokeStyle = wire; c.lineWidth = 2.6; c.shadowColor = wire; c.shadowBlur = 8;
    blobPath(c, [[-28, 4], [-20, -10], [0, -14], [20, -8], [28, 2], [18, 14], [-16, 16]]);
    c.stroke();
    // legs (lightning zags)
    c.strokeStyle = wireHi; c.lineWidth = 2.2;
    for (const x0 of [-18, -6, 8, 20]) {
      c.beginPath(); c.moveTo(x0, 14); c.lineTo(x0 - 3, 22); c.lineTo(x0 + 2, 24); c.lineTo(x0 - 1, 32); c.stroke();
    }
    // head
    c.fillStyle = 'rgba(16,20,34,0.95)';
    blobPath(c, [[-36, -18], [-26, -26], [-16, -22], [-16, -12], [-26, -8], [-34, -10]]);
    c.fill();
    c.strokeStyle = wire; c.lineWidth = 2.4;
    blobPath(c, [[-36, -18], [-26, -26], [-16, -22], [-16, -12], [-26, -8], [-34, -10]]);
    c.stroke();
    // zig ears + arc tail
    c.beginPath(); c.moveTo(-28, -26); c.lineTo(-30, -34); c.lineTo(-24, -31); c.lineTo(-22, -38); c.stroke();
    c.beginPath(); c.moveTo(26, 0); c.lineTo(34, -6); c.lineTo(31, -1); c.lineTo(38, -8); c.stroke();
    c.shadowBlur = 0; c.restore();
    eyeGlow(c, -27, -17, 2.6, wireHi, 0.2);
    // charge core
    c.fillStyle = wireHi; c.shadowColor = wireHi; c.shadowBlur = 9;
    poly(c, [[-2, -8], [3, -1], [0, -1], [4, 7], [-4, -2], [-1, -2]]); c.fill(); c.shadowBlur = 0;
    if (o.form >= 1) { c.strokeStyle = wire; c.lineWidth = 1.6; halo(c, 0, 0, 32, 20, wire, 1.6, 0.35); }
    if (o.form >= 2) crownGold(c, -34, 10, P);
  };
  LINE_PAINTERS[504] = function sentryDrone(c, P, R, o) { // skyline patrol unit
    // rotor ring
    halo(c, 0, -26, 24 + o.form * 3, 6, '#b9c8d6', 3, 0.8);
    c.fillStyle = '#5a6a7a';
    c.beginPath(); c.roundRect(-2.4, -34, 4.8, 10, 2); c.fill();
    // chassis: chamfered pod
    const g = c.createLinearGradient(0, -24, 0, 26);
    g.addColorStop(0, '#dde7f0'); g.addColorStop(1, '#8fa0b3');
    c.fillStyle = g;
    poly(c, [[0, -24], [18, -14], [14, 18], [0, 26], [-14, 18], [-18, -14]]);
    c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // panel seams
    c.strokeStyle = 'rgba(13,18,32,0.4)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-14, -4); c.lineTo(14, -4); c.moveTo(0, -4); c.lineTo(0, 24); c.stroke();
    // the single sensor eye
    c.fillStyle = '#0d1220';
    c.beginPath(); c.arc(0, -10, 8.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
    c.beginPath(); c.arc(0, -10, 4.6, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-1.8, -12, 1.6, 0, Math.PI * 2); c.fill();
    // side stabilizers + spotlight
    mirror(c, cc => {
      cc.fillStyle = '#8fa0b3';
      poly(cc, [[16, 0], [30, -4], [30, 4], [16, 8]]); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
    });
    if (o.form >= 1) { // spotlight cone
      c.save(); c.globalAlpha = 0.3; c.fillStyle = P.glow;
      poly(c, [[0, 8], [10, 34], [-10, 34]]); c.fill(); c.restore();
    }
    thruster(c, 0, 28, 4.6, P.glow);
    if (o.form >= 2) crownGold(c, -42, 10, P);
  };
  LINE_PAINTERS[507] = function noirShade(c, P, R, o) { // trenchcoat phantom
    // coat body
    const g = c.createLinearGradient(0, -26, 0, 30);
    g.addColorStop(0, mix(P.base, '#1a1030', 0.5)); g.addColorStop(1, '#140e24');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -22);
    c.quadraticCurveTo(17, -16, 16, 2);
    c.lineTo(20, 28); c.lineTo(8, 24); c.lineTo(0, 29); c.lineTo(-8, 24); c.lineTo(-20, 28); c.lineTo(-16, 2);
    c.quadraticCurveTo(-17, -16, 0, -22); c.closePath(); c.fill();
    // popped collar
    c.fillStyle = mix(P.base, '#1a1030', 0.3);
    poly(c, [[-14, -18], [-4, -26], [-2, -16]]); c.fill();
    poly(c, [[14, -18], [4, -26], [2, -16]]); c.fill();
    // fedora
    c.fillStyle = '#241a3d';
    c.beginPath(); c.ellipse(0, -30, 15, 4.6, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.roundRect(-9, -40, 18, 11, 4); c.fill();
    c.strokeStyle = P.base; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-9, -32); c.lineTo(9, -32); c.stroke();
    // face: only neon eyes under the brim
    eyeGlow(c, -4.6, -26, 2.4, P.glow, 0.15); eyeGlow(c, 4.6, -26, 2.4, P.glow, -0.15);
    // neon sign reflection stripes on the coat
    c.save(); c.globalAlpha = 0.6; c.strokeStyle = P.base; c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, -6); c.lineTo(-10, 14); c.stroke();
    c.strokeStyle = '#ff4081';
    c.beginPath(); c.moveTo(12, -2); c.lineTo(12, 18); c.stroke();
    c.restore();
    if (o.form >= 1) { // cigarillo glow / breath of static
      c.fillStyle = '#ff7043'; c.shadowColor = '#ff7043'; c.shadowBlur = 6;
      c.beginPath(); c.arc(8, -18, 1.6, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    }
    if (o.form >= 2) crownGold(c, -46, 10, P);
  };
  LINE_PAINTERS[510] = function holoSprite(c, P, R, o) { // living billboard ad
    // billboard frame
    c.fillStyle = '#37474f';
    c.beginPath(); c.roundRect(-24, -30, 48, 40, 4); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // screen
    const g = c.createLinearGradient(0, -28, 0, 8);
    g.addColorStop(0, mix(P.base, '#12081f', 0.55)); g.addColorStop(1, '#12081f');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-20, -26, 40, 32, 2); c.fill();
    // the ad-being: winking face made of light
    c.save(); c.shadowColor = P.glow; c.shadowBlur = 8;
    c.strokeStyle = P.glow; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.arc(-8, -14, 3.4, 0, Math.PI * 2); c.stroke(); // open eye
    c.beginPath(); c.moveTo(4, -14); c.lineTo(12, -14); c.stroke(); // winking eye
    c.beginPath(); c.moveTo(-8, -2); c.quadraticCurveTo(0, 4, 10, -4); c.stroke(); // grin
    c.restore();
    // scanlines
    c.save(); c.globalAlpha = 0.25; c.strokeStyle = '#ffffff'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-20, -24 + i * 7); c.lineTo(20, -24 + i * 7); c.stroke(); }
    c.restore();
    // it LEAKS out of the screen: light arms escaping the frame
    c.save(); c.strokeStyle = P.base; c.lineWidth = 3; c.lineCap = 'round'; c.shadowColor = P.base; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(-20, -8); c.quadraticCurveTo(-32, -12, -34, -22 - o.form * 4); c.stroke();
    c.beginPath(); c.moveTo(20, -4); c.quadraticCurveTo(30, 0, 34, -10 - o.form * 3); c.stroke();
    c.restore();
    c.fillStyle = P.glow;
    c.beginPath(); c.arc(-34, -24 - o.form * 4, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(34, -12 - o.form * 3, 2.6, 0, Math.PI * 2); c.fill();
    // mount pole
    c.fillStyle = '#37474f';
    c.beginPath(); c.roundRect(-3, 10, 6, 20, 2); c.fill();
    if (o.form >= 1) { c.fillStyle = P.glow; c.font = ''; runeMarks(c, R, 2, 8, P.glow, 2); }
    if (o.form >= 2) crownGold(c, -38, 10, P);
  };
  LINE_PAINTERS[513] = function pipeOoze(c, P, R, o) { // vent-dwelling sludge
    // burst pipe it lives in
    c.fillStyle = '#5a6a7a';
    c.beginPath(); c.roundRect(-26, 8, 52, 16, 8); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#41505f';
    c.beginPath(); c.roundRect(-26, 8, 8, 16, 4); c.fill();
    c.beginPath(); c.roundRect(18, 8, 8, 16, 4); c.fill();
    // ooze body erupting from the crack
    const g = c.createLinearGradient(0, -26, 0, 12);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.25)); g.addColorStop(1, shade(P.base, -0.3));
    c.fillStyle = g;
    blobPath(c, [[-14, 10], [-16, -6], [-6, -20], [6, -24 - o.form * 4], [16, -12], [14, 8]]);
    c.fill();
    // drips
    teardrop(c, -18, 16, 5, 9, 0.9); c.fill();
    teardrop(c, 20, 18, 4, 8, 0.9); c.fill();
    // bubbles
    c.fillStyle = mix(P.base, '#ffffff', 0.45);
    for (const [bx, by, br2] of [[-6, -12, 2.6], [6, -16, 2], [2, -4, 1.6]]) { c.beginPath(); c.arc(bx, by, br2, 0, Math.PI * 2); c.fill(); }
    // happy toxic face
    eyeAlmond(c, -6, -10, 3.4, P); eyeAlmond(c, 6, -12, 3.4, P);
    c.strokeStyle = P.deep; c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -2); c.quadraticCurveTo(1, 2, 6, -3); c.stroke();
    // hazard sign on pipe
    c.fillStyle = '#ffd54f';
    poly(c, [[-4, 12], [4, 12], [0, 20]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1; c.stroke();
    if (o.form >= 1) { c.save(); c.globalAlpha = 0.5; c.fillStyle = P.base; c.beginPath(); c.arc(14, -28 - o.form * 2, 3.4, 0, Math.PI * 2); c.fill(); c.restore(); }
    if (o.form >= 2) crownGold(c, -36, 9, P);
  };
  LINE_PAINTERS[516] = function scrapStray(c, P, R, o) { // junk-built alley cat
    // tail: bent antenna
    c.strokeStyle = '#8fa0b3'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(20, 8); c.quadraticCurveTo(32, 2, 34, -8); c.lineTo(37, -12); c.stroke();
    c.fillStyle = '#ef5350';
    c.beginPath(); c.arc(37.6, -13, 2, 0, Math.PI * 2); c.fill();
    // body: patched sheet-metal loaf
    const g = c.createLinearGradient(0, -12, 0, 22);
    g.addColorStop(0, '#c2ae94'); g.addColorStop(1, '#8a7a62');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-22, -10, 44, 30, 12); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // mismatched patch + weld seam
    c.fillStyle = '#8fa0b3';
    c.beginPath(); c.roundRect(2, -6, 14, 11, 3); c.fill();
    c.strokeStyle = 'rgba(13,18,32,0.5)'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-6, -10); c.lineTo(-8, 20); c.stroke();
    // legs
    c.fillStyle = '#6d5c44';
    for (const lx of [-16, -6, 8, 16]) { c.beginPath(); c.roundRect(lx - 2.4, 18, 4.8, 9, 2); c.fill(); }
    // head: bucket helm with torn ear
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-30, -28, 22, 20, 7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
    // ears: one metal, one torn cloth
    c.fillStyle = '#8fa0b3';
    poly(c, [[-28, -28], [-26, -38], [-20, -29]]); c.fill();
    c.fillStyle = '#c62828';
    poly(c, [[-16, -28], [-12, -36], [-10, -28], [-13, -31]]); c.fill();
    // face: one live eye, one glow implant
    eyeAlmond(c, -24, -19, 2.8, P);
    eyeGlow(c, -13, -19, 2.4, P.glow);
    // whisker wires
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-30, -14); c.lineTo(-37, -13); c.moveTo(-30, -11); c.lineTo(-36, -9); c.stroke();
    if (o.form >= 1) { c.fillStyle = '#ffd54f'; poly(c, [[-2, -16], [2, -22], [3, -15]]); c.fill(); }
    if (o.form >= 2) crownGold(c, -40, 10, P);
  };

  // ============================================================
  //  REALM 6 · SPIRE OF GLASS — beauty, incorporated
  // ============================================================
  LINE_PAINTERS[601] = function paneWraith(c, P, R, o) { // shattered-glass phantom
    // floating pane fragments arranged as a figure
    const panes = [
      [[-16, -30], [2, -34], [-2, -16], [-18, -14]],       // head pane
      [[-20, -10], [6, -12], [10, 12], [-16, 16]],         // torso pane
      [[10, -20], [24, -26], [26, -8], [14, -6]],          // shoulder shard
      [[-26, 18], [-8, 20], [-14, 34]],                    // hem shard
      [[6, 16], [22, 12], [16, 32]],                       // hem shard 2
    ];
    for (let i = 0; i < panes.length; i++) {
      const g = c.createLinearGradient(panes[i][0][0], panes[i][0][1], panes[i][2][0], panes[i][2][1]);
      g.addColorStop(0, 'rgba(216,236,248,0.85)'); g.addColorStop(1, 'rgba(150,190,215,0.55)');
      c.fillStyle = g;
      poly(c, panes[i]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.4; c.stroke();
    }
    // glints
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -28); c.lineTo(-6, -30); c.stroke();
    c.beginPath(); c.moveTo(-14, -2); c.lineTo(-2, -6); c.stroke();
    // the face REFLECTED in the head pane (not on it)
    eyeGlow(c, -11, -24, 2.6, P.glow, 0.2); eyeGlow(c, -4, -25, 2.6, P.glow, -0.1);
    // spectral glow between panes
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    c.beginPath(); c.arc(-4, 0, 4 + o.form, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    if (o.form >= 1) { // more orbiting slivers
      c.fillStyle = 'rgba(216,236,248,0.8)';
      poly(c, [[26, 0], [32, -4], [30, 6]]); c.fill();
      poly(c, [[-30, -20], [-24, -26], [-25, -14]]); c.fill();
    }
    if (o.form >= 2) crownGold(c, -42, 10, P);
  };
  LINE_PAINTERS[604] = function eclipseSpirit(c, P, R, o) { // the dark disc
    // corona flare
    c.save(); c.shadowColor = P.glow; c.shadowBlur = 14;
    c.fillStyle = P.glow;
    c.beginPath(); c.arc(0, -4, 24 + o.form * 2, 0, Math.PI * 2); c.fill();
    c.restore();
    // flare tongues
    c.fillStyle = P.glow;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const r0 = 24 + o.form * 2;
      c.save(); c.translate(Math.cos(a) * r0, -4 + Math.sin(a) * r0); c.rotate(a + Math.PI / 2);
      poly(c, [[-3, 0], [3, 0], [0, -8 - (i % 2) * 4]]); c.fill();
      c.restore();
    }
    // the black disc
    const g = c.createRadialGradient(-6, -10, 2, 0, -4, 26);
    g.addColorStop(0, '#2a2140'); g.addColorStop(1, '#0d0a16');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -4, 22 + o.form * 2, 0, Math.PI * 2); c.fill();
    // sliver of light on the rim
    c.strokeStyle = '#fff8e1'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -4, 22 + o.form * 2, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
    // quiet closed eyes + magnate collar at apex
    c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, -8); c.quadraticCurveTo(-7, -5.4, -4, -8); c.stroke();
    c.beginPath(); c.moveTo(4, -8); c.quadraticCurveTo(7, -5.4, 10, -8); c.stroke();
    if (o.form >= 1) { // floating cuff-shards
      c.fillStyle = '#d8ecf8';
      poly(c, [[-30, 12], [-24, 8], [-25, 16]]); c.fill();
      poly(c, [[26, 10], [32, 8], [29, 16]]); c.fill();
    }
    if (o.form >= 2) { // the Magnate's white tie
      c.fillStyle = '#f5f5f5';
      poly(c, [[0, 12], [5, 18], [0, 30], [-5, 18]]); c.fill();
      crownGold(c, -36, 10, P);
    }
  };
  LINE_PAINTERS[607] = function chemWraith(c, P, R, o) { // spill from a broken vial
    // the cracked vial (tilted, above)
    c.save(); c.rotate(-0.5); c.translate(-10, -30);
    c.fillStyle = 'rgba(220,240,235,0.5)';
    c.beginPath(); c.roundRect(-7, -14, 14, 22, 5); c.fill();
    c.strokeStyle = '#cfe8d8'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#8fa0b3';
    c.beginPath(); c.roundRect(-8, -18, 16, 5, 2); c.fill();
    // crack
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(2, -4); c.lineTo(5, 0); c.lineTo(2, 4); c.stroke();
    c.restore();
    // pouring stream into the body
    c.fillStyle = P.base;
    c.beginPath(); c.moveTo(-14, -26); c.quadraticCurveTo(-10, -16, -4, -10);
    c.quadraticCurveTo(-12, -12, -17, -21); c.closePath(); c.fill();
    // the spill-being
    const g = c.createLinearGradient(0, -12, 0, 28);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.3)); g.addColorStop(1, shade(P.base, -0.35));
    c.fillStyle = g;
    blobPath(c, [[-18, 8], [-12, -8], [4, -14], [18, -4], [20, 14], [6, 24], [-12, 22]]);
    c.fill();
    // reaching pseudopod
    c.beginPath(); c.moveTo(16, -2); c.quadraticCurveTo(30, -8, 34, -18 - o.form * 4);
    c.quadraticCurveTo(28, -6, 20, 4); c.closePath(); c.fill();
    c.fillStyle = P.glow;
    c.beginPath(); c.arc(34, -20 - o.form * 4, 3, 0, Math.PI * 2); c.fill();
    // skull-ish face suggestion (chemical hazard)
    c.fillStyle = '#0d1220';
    c.beginPath(); c.arc(-4, 2, 3.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(6, 2, 3.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(1, 10, 3.4, 2.2, 0, 0, Math.PI * 2); c.fill();
    // fizzing bubbles
    c.strokeStyle = mix(P.base, '#ffffff', 0.6); c.lineWidth = 1.4;
    for (const [bx, by, br2] of [[-12, -16, 2], [12, -10, 2.6], [0, -18, 1.6]]) { c.beginPath(); c.arc(bx, by, br2, 0, Math.PI * 2); c.stroke(); }
    if (o.form >= 2) crownGold(c, -34, 9, P);
  };
  LINE_PAINTERS[610] = function chandelierFae(c, P, R, o) { // crystal chandelier sprite
    // suspension chain
    c.strokeStyle = P.gold; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -46); c.lineTo(0, -34); c.stroke();
    c.fillStyle = P.gold;
    c.beginPath(); c.arc(0, -46, 2.4, 0, Math.PI * 2); c.fill();
    // crown ring + arms
    c.strokeStyle = P.gold; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, -14, 22 + o.form * 2, 7, 0, 0, Math.PI * 2); c.stroke();
    mirror(c, cc => {
      cc.strokeStyle = P.gold; cc.lineWidth = 2.4; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(8, -18); cc.quadraticCurveTo(20, -26, 26, -22); cc.stroke();
      flame(cc, 27, -26, 4.4, '#ffe082', '#ffffff');
    });
    // central body: great teardrop crystal
    const g = c.createLinearGradient(0, -18, 0, 26);
    g.addColorStop(0, 'rgba(255,240,250,0.95)'); g.addColorStop(1, mix(P.base, '#ffffff', 0.2));
    c.fillStyle = g;
    teardrop(c, 0, 2, 22, 40, 0.5); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(0, -16); c.lineTo(-4, 16); c.moveTo(4, -8); c.lineTo(2, 14); c.stroke();
    // face inside the crystal
    eyeAlmond(c, -5, -2, 3, P); eyeAlmond(c, 5, -2, 3, P);
    c.strokeStyle = P.deep; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-2.4, 6); c.quadraticCurveTo(0, 8, 2.4, 6); c.stroke();
    // hanging prism drops
    for (const [dx, dy] of [[-16, -6], [16, -6], [-9, -2], [9, -2]]) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(dx, dy - 4); c.lineTo(dx, dy); c.stroke();
      crystal(c, dx, dy + 5, 4.6, mix(P.base, '#ffffff', 0.55));
    }
    motes(c, R, 4 + o.form * 2, 26, '#fff3fa', -8);
    if (o.form >= 2) crownGold(c, -40, 10, P);
  };
  LINE_PAINTERS[613] = function mirrorSeer(c, P, R, o) { // hand-mirror oracle
    // ornate mirror body
    c.fillStyle = P.gold;
    c.beginPath(); c.ellipse(0, -8, 20 + o.form, 26 + o.form, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade('#ffd700', -0.35); c.lineWidth = 1.6; c.stroke();
    // handle
    c.fillStyle = P.gold;
    c.beginPath(); c.roundRect(-3.4, 16, 6.8, 18, 3); c.fill();
    c.beginPath(); c.arc(0, 36, 4, 0, Math.PI * 2); c.fill();
    // glass
    const g = c.createLinearGradient(-12, -28, 12, 10);
    g.addColorStop(0, '#eaf6ff'); g.addColorStop(0.5, mix(P.base, '#ffffff', 0.5)); g.addColorStop(1, '#b39ddb');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, -8, 15 + o.form, 21 + o.form, 0, 0, Math.PI * 2); c.fill();
    // the face LIVES IN the glass — serene, third-eye
    eyeAlmond(c, -5.4, -12, 3, P); eyeAlmond(c, 5.4, -12, 3, P);
    c.fillStyle = P.deep;
    lens(c, 0, -22, 5, 7); c.fill();
    c.fillStyle = P.glow;
    c.beginPath(); c.arc(0, -22, 1.8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-3, -1); c.quadraticCurveTo(0, 1, 3, -1); c.stroke();
    // glass glint
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-9, -22); c.quadraticCurveTo(-12, -14, -9, -6); c.stroke();
    // floating ornament wings
    mirror(c, cc => {
      cc.strokeStyle = P.gold; cc.lineWidth = 2; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(20, -12); cc.quadraticCurveTo(30, -18, 32, -26); cc.stroke();
      cc.fillStyle = P.gold;
      cc.beginPath(); cc.arc(32, -27, 2, 0, Math.PI * 2); cc.fill();
    });
    if (o.form >= 1) orbitals(c, 3, 28, 12, 2.6, P.glow, 0.5, -8);
    if (o.form >= 2) halo(c, 0, -40, 11, 4, P.gold, 2.4);
  };
  LINE_PAINTERS[616] = function latticeKnight(c, P, R, o) { // glass-armored warden
    // cape of drapery glass
    c.fillStyle = 'rgba(180,215,235,0.4)';
    poly(c, [[-14, -18], [14, -18], [20, 26], [8, 22], [0, 27], [-8, 22], [-20, 26]]); c.fill();
    // armored torso: faceted glass plates over steel
    const g = c.createLinearGradient(0, -22, 0, 24);
    g.addColorStop(0, '#dde7f0'); g.addColorStop(1, '#8fa0b3');
    c.fillStyle = g;
    poly(c, [[-16, -18], [16, -18], [12, 16], [0, 22], [-12, 16]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
    // glass chest facet with inner light
    c.fillStyle = 'rgba(214,240,252,0.85)';
    poly(c, [[0, -12], [9, -2], [0, 10], [-9, -2]]); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.arc(0, -2, 2.6, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // pauldrons: crystal clusters
    mirror(c, cc => {
      crystal(cc, 19, -18, 9, '#cfe5f2', 0.5);
      crystal(cc, 24, -12, 6, '#e8f4fb', 0.9);
    });
    // helm: tall glass visor crest
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-9, -36, 18, 16, 5); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    visor(c, 0, -29, 13, 5.4, P.glow);
    c.fillStyle = 'rgba(214,240,252,0.9)';
    poly(c, [[-2, -36], [2, -36], [0, -46 - o.form * 3]]); c.fill();
    // glaive of glass
    c.strokeStyle = '#8fa0b3'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(22, 20); c.lineTo(22, -30); c.stroke();
    crystal(c, 22, -36, 8, '#e8f4fb');
    if (o.form >= 2) crownGold(c, -50, 9, P);
  };

  // ============================================================
  //  REALM 7 · RIFT ATOLLS — where the ley lines surface
  // ============================================================
  LINE_PAINTERS[701] = function leyNode(c, P, R, o) { // sacred-geometry sprite
    // outer rotated triangle frame
    c.save(); c.rotate(0.1);
    c.strokeStyle = P.base; c.lineWidth = 2.4; c.shadowColor = P.base; c.shadowBlur = 6;
    poly(c, [[0, -34 - o.form * 3], [30 + o.form * 3, 18], [-30 - o.form * 3, 18]]); c.stroke();
    c.restore();
    // inner circle body
    const g = c.createRadialGradient(-4, -8, 2, 0, -2, 24);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.55)); g.addColorStop(1, mix(P.base, '#123c4a', 0.35));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -2, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.glow; c.lineWidth = 1.8;
    c.beginPath(); c.arc(0, -2, 18, 0, Math.PI * 2); c.stroke();
    // node points at triangle corners
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
    for (const [nx, ny] of [[0, -33 - o.form * 3], [29 + o.form * 3, 17], [-29 - o.form * 3, 17]]) {
      c.beginPath(); c.arc(nx, ny, 3.4, 0, Math.PI * 2); c.fill();
    }
    c.shadowBlur = 0;
    // meridian lines across the body
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, -2, 18, 7, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(0, -2, 7, 18, 0, 0, Math.PI * 2); c.stroke();
    // serene single eye
    eyeAlmond(c, 0, -4, 4.4, P);
    if (o.form >= 1) orbitals(c, 3 + o.form, 26, 26, 2.6, P.glow, 0.9, -2);
    if (o.form >= 2) halo(c, 0, -40, 12, 4.4, P.gold, 2.4);
  };
  LINE_PAINTERS[704] = function reefDancer(c, P, R, o) { // coral-crowned current spirit
    // flowing fin ribbons (the dance)
    c.save(); c.lineCap = 'round';
    for (const [col, x0, len] of [[mix(P.base, '#ffffff', 0.4), -14, 30], [P.base, 14, 26], [mix(P.base, '#80deea', 0.5), 0, 36]]) {
      c.strokeStyle = col; c.lineWidth = 5; c.globalAlpha = 0.85;
      c.beginPath(); c.moveTo(x0 * 0.4, 6);
      c.bezierCurveTo(x0, 16, x0 * 1.4, 22, x0 * 1.1, 6 + len);
      c.stroke();
    }
    c.restore();
    // slender body
    const g = c.createLinearGradient(0, -26, 0, 20);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.5)); g.addColorStop(1, P.base);
    c.fillStyle = g;
    lens(c, 0, -4, 18, 40); c.fill();
    // scale shimmer
    c.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-3 + i * 4, 2 + i * 5, 2.6, 0, Math.PI * 2); c.fill(); }
    // arm fins mid-pose
    mirror(c, cc => {
      cc.fillStyle = mix(P.base, '#ffffff', 0.35);
      cc.beginPath(); cc.moveTo(8, -8); cc.quadraticCurveTo(24, -14, 30, -24 - o.form * 3);
      cc.quadraticCurveTo(22, -10, 10, -2); cc.closePath(); cc.fill();
    });
    // head + coral crown
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -26, 9, 0, Math.PI * 2); c.fill();
    eyeAlmond(c, -3.4, -27, 2.6, P); eyeAlmond(c, 3.4, -27, 2.6, P);
    c.strokeStyle = '#ff8a65'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -33); c.lineTo(-6, -40); c.moveTo(-4, -33); c.lineTo(-1, -41); c.moveTo(2, -33); c.lineTo(4, -39); c.stroke();
    c.strokeStyle = '#ffab91'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(5, -32); c.lineTo(8, -37); c.stroke();
    // bubble trail
    c.strokeStyle = 'rgba(220,250,255,0.8)'; c.lineWidth = 1.2;
    for (const [bx, by, br2] of [[14, -18, 2], [18, -26, 1.4]]) { c.beginPath(); c.arc(bx, by, br2, 0, Math.PI * 2); c.stroke(); }
    if (o.form >= 2) crownGold(c, -44, 9, P);
  };
  LINE_PAINTERS[707] = function antennaPalm(c, P, R, o) { // jungle tree with a signal crown
    // trunk with segment rings
    c.fillStyle = '#8d6e50';
    c.beginPath(); c.moveTo(-5, 30); c.bezierCurveTo(-8, 10, -2, -8, 2, -22); c.lineTo(8, -20);
    c.bezierCurveTo(4, -6, 8, 12, 7, 30); c.closePath(); c.fill();
    c.strokeStyle = '#6d4c33'; c.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-5 + i * 0.8, 22 - i * 11); c.lineTo(7, 20 - i * 11); c.stroke(); }
    // frond wings
    for (const [a0, len] of [[-2.4, 26], [-1.4, 30], [-0.4, 28], [0.5, 30], [1.4, 26]]) {
      c.save(); c.translate(4, -22); c.rotate(a0 * 0.5);
      const g = c.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, mix(P.base, '#1b5e20', 0.3)); g.addColorStop(1, mix(P.base, '#aef58a', 0.3));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(len * 0.5, -6, len, -2);
      c.quadraticCurveTo(len * 0.5, 4, 0, 3); c.closePath(); c.fill();
      c.restore();
    }
    // the dish nested in the crown
    c.save(); c.translate(4, -30); c.rotate(-0.3);
    c.fillStyle = '#cfd8dc';
    c.beginPath(); c.ellipse(0, 0, 11 + o.form * 2, 5 + o.form, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#78909c'; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = '#78909c'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -8); c.stroke();
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.arc(0, -9, 2.4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.restore();
    // signal rings
    c.save(); c.strokeStyle = P.glow; c.globalAlpha = 0.6; c.lineWidth = 1.6;
    for (let i = 1; i <= 1 + o.form; i++) { c.beginPath(); c.arc(4, -40, 6 + i * 5, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
    c.restore();
    // face on the trunk
    eyeAlmond(c, -1, -12, 2.8, P); eyeAlmond(c, 6, -11, 2.8, P);
    // root toes
    c.fillStyle = '#6d4c33';
    for (const rx of [-8, 0, 9]) { c.beginPath(); c.ellipse(rx, 31, 4, 2.6, 0, 0, Math.PI * 2); c.fill(); }
    if (o.form >= 2) crownGold(c, -48, 9, P);
  };
  LINE_PAINTERS[710] = function stormRay(c, P, R, o) { // electric manta
    // wing-cape body
    const g = c.createLinearGradient(0, -20, 0, 22);
    g.addColorStop(0, mix(P.base, '#3d4f63', 0.4)); g.addColorStop(1, '#22303f');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -18);
    c.bezierCurveTo(22, -22, 42 + o.form * 4, -8, 34 + o.form * 3, 6);
    c.quadraticCurveTo(16, 2, 0, 14);
    c.quadraticCurveTo(-16, 2, -34 - o.form * 3, 6);
    c.bezierCurveTo(-42 - o.form * 4, -8, -22, -22, 0, -18);
    c.closePath(); c.fill();
    // charge veins across the wings
    c.save(); c.strokeStyle = P.glow; c.lineWidth = 1.8; c.lineCap = 'round'; c.shadowColor = P.base; c.shadowBlur = 7;
    mirror(c, cc => {
      cc.beginPath(); cc.moveTo(6, -8); cc.lineTo(14, -10); cc.lineTo(18, -4); cc.lineTo(28, -6); cc.stroke();
      cc.beginPath(); cc.moveTo(10, 0); cc.lineTo(18, 2); cc.lineTo(24, 0); cc.stroke();
    });
    c.restore();
    // head lobes + eyes
    mirror(c, cc => {
      cc.fillStyle = '#22303f';
      cc.beginPath(); cc.roundRect(3, -24, 5, 8, 2); cc.fill();
    });
    eyeGlow(c, -6, -14, 2.6, P.glow, 0.2); eyeGlow(c, 6, -14, 2.6, P.glow, -0.2);
    // long stinger tail with charge bead
    c.strokeStyle = '#22303f'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 12); c.quadraticCurveTo(4, 26, 0, 38); c.stroke();
    c.fillStyle = P.base; c.shadowColor = P.base; c.shadowBlur = 8;
    poly(c, [[0, 34], [3, 39], [0, 44], [-3, 39]]); c.fill(); c.shadowBlur = 0;
    // belly glow slits
    c.fillStyle = P.glow;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.roundRect(-6 + i * 5, 4, 2.6, 5, 1.3); c.fill(); }
    if (o.form >= 2) crownGold(c, -28, 10, P);
  };
  LINE_PAINTERS[713] = function echoWraith(c, P, R, o) { // double-exposure spirit
    // ghost body drawn THREE times, offset — the echo is the identity
    const body = (dx, dy, alpha, col) => {
      c.save(); c.translate(dx, dy); c.globalAlpha = alpha;
      const g = c.createLinearGradient(0, -24, 0, 26);
      g.addColorStop(0, mix(col, '#ffffff', 0.35)); g.addColorStop(1, col);
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, -24);
      c.quadraticCurveTo(14, -18, 13, 0);
      c.lineTo(15, 22);
      c.quadraticCurveTo(8, 17, 3, 24);
      c.quadraticCurveTo(-2, 18, -8, 25);
      c.quadraticCurveTo(-12, 18, -14, 22);
      c.lineTo(-13, 0);
      c.quadraticCurveTo(-14, -18, 0, -24); c.closePath(); c.fill();
      c.restore();
    };
    body(-7 - o.form * 2, -3, 0.4, '#4dd0e1');
    body(7 + o.form * 2, -1, 0.4, '#ff4081');
    body(0, 0, 1, mix(P.base, '#4a3b63', 0.3));
    // rift crack through the middle
    c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.moveTo(-2, -22); c.lineTo(2, -12); c.lineTo(-3, -2); c.lineTo(2, 8); c.stroke();
    c.shadowBlur = 0;
    // one solid eye, one echoed pair
    eyeGlow(c, -5, -12, 2.8, '#ffffff', 0.1);
    c.save(); c.globalAlpha = 0.55;
    eyeGlow(c, 4, -13, 2.4, '#4dd0e1'); eyeGlow(c, 8, -12, 2.4, '#ff4081');
    c.restore();
    if (o.form >= 2) crownGold(c, -32, 9, P);
  };
  LINE_PAINTERS[716] = function horizonWyrm(c, P, R, o) { // sea-sky gradient serpent
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      pts.push([Math.sin(t * Math.PI * 1.9 + 2.4) * (26 + o.form * 3) * (1 - t * 0.22), 36 - t * 68]);
    }
    // body painted in horizon bands (sunset above, sea below)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const w = (11 + o.form) * (0.6 + 0.5 * Math.sin(t * Math.PI));
        const col = mix('#0288d1', '#ff8a65', t); // sea → sunset along the body
        c.fillStyle = pass === 0 ? shade(col, -0.5) : col;
        c.beginPath(); c.arc(pts[i][0], pts[i][1], pass === 0 ? w + 1.6 : w, 0, Math.PI * 2); c.fill();
      }
    }
    // sun-disc fins along the spine
    c.fillStyle = '#ffd54f';
    for (let i = 4; i < 20; i += 5) {
      c.beginPath(); c.arc(pts[i][0] + 9, pts[i][1] - 6, 4, 0, Math.PI * 2); c.fill();
    }
    // head: horizon-split face
    const [hx, hy] = pts[22];
    c.fillStyle = '#ff8a65';
    lens(c, hx, hy - 4, 20, 15); c.fill();
    c.fillStyle = '#0288d1';
    c.beginPath(); c.ellipse(hx, hy - 1, 10, 6, 0, 0, Math.PI); c.fill();
    eyeGlow(c, hx - 5, hy - 6, 2.4, '#fff8e1', 0.2); eyeGlow(c, hx + 5, hy - 6, 2.4, '#fff8e1', -0.2);
    // ray horns
    c.strokeStyle = '#ffd54f'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx - 6, hy - 12); c.lineTo(hx - 10, hy - 20); c.moveTo(hx, hy - 13); c.lineTo(hx, hy - 22); c.moveTo(hx + 6, hy - 12); c.lineTo(hx + 10, hy - 20); c.stroke();
    if (o.form >= 2) crownGold(c, hy - 28, 9, P);
  };

  // ============================================================
  //  REALM 8 · THE CRUCIBLE — the war that never ended
  // ============================================================
  LINE_PAINTERS[801] = function pitBrawler(c, P, R, o) { // wrapped-fist gladiator
    // torso: lean muscle wedge
    const skin = mix('#ef5350', '#8d6e63', 0.35);
    const g = c.createLinearGradient(0, -22, 0, 26);
    g.addColorStop(0, shade(skin, 0.2)); g.addColorStop(1, shade(skin, -0.28));
    c.fillStyle = g;
    poly(c, [[-15, -16], [15, -16], [11, 14], [-11, 14]]); c.fill();
    // chest strap + belt
    c.strokeStyle = '#6d4c33'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-13, -14); c.lineTo(10, 8); c.stroke();
    c.fillStyle = '#6d4c33';
    c.beginPath(); c.roundRect(-12, 12, 24, 6, 2); c.fill();
    c.fillStyle = P.gold;
    c.beginPath(); c.roundRect(-3, 12.6, 6, 5, 1); c.fill();
    // legs in stance
    c.fillStyle = shade(skin, -0.15);
    poly(c, [[-11, 16], [-4, 16], [-8, 34], [-15, 34]]); c.fill();
    poly(c, [[4, 16], [11, 16], [15, 34], [8, 34]]); c.fill();
    // guard arms with wrapped fists (the class signature)
    mirror(c, cc => {
      cc.strokeStyle = skin; cc.lineWidth = 6.4; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(13, -10); cc.quadraticCurveTo(22, -8, 23, -1); cc.stroke();
      // wraps
      cc.fillStyle = '#e8dcc0';
      cc.beginPath(); cc.roundRect(17, -6, 13, 13, 4.4); cc.fill();
      cc.strokeStyle = '#c9b891'; cc.lineWidth = 1.4;
      cc.beginPath(); cc.moveTo(18, -2); cc.lineTo(29, 0); cc.moveTo(18, 2); cc.lineTo(29, 4); cc.stroke();
    });
    // head: cropped + battle scar
    c.fillStyle = shade(skin, 0.16);
    c.beginPath(); c.arc(0, -26, 10, 0, Math.PI * 2); c.fill();
    eyeGlow(c, -3.6, -27, 2, '#fff3e0', 0.24); eyeGlow(c, 3.6, -27, 2, '#fff3e0', -0.24);
    c.strokeStyle = shade(skin, -0.4); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(4, -33); c.lineTo(7, -28); c.stroke();
    // determined brow
    c.strokeStyle = P.ink; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-6.4, -30.4); c.lineTo(-1.4, -29); c.moveTo(6.4, -30.4); c.lineTo(1.4, -29); c.stroke();
    if (o.form >= 1) { // champion sash
      c.strokeStyle = '#ffd54f'; c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(13, -14); c.lineTo(-10, 10); c.stroke();
    }
    if (o.form >= 2) crownGold(c, -40, 10, P);
  };
  LINE_PAINTERS[804] = function rampartGolem(c, P, R, o) { // the wall that walks
    // body IS a castle wall segment
    const g = c.createLinearGradient(0, -26, 0, 30);
    g.addColorStop(0, '#b5a08c'); g.addColorStop(1, '#6d5c4e');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-24, -22, 48, 46, 4); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // crenellated top
    c.fillStyle = '#b5a08c';
    for (let i = 0; i < 4; i++) { c.fillRect(-22 + i * 12.4, -30, 8, 9); c.strokeStyle = P.ink; c.lineWidth = 1.4; c.strokeRect(-22 + i * 12.4, -30, 8, 9); }
    // brick coursing
    c.strokeStyle = 'rgba(30,20,14,0.35)'; c.lineWidth = 1.4;
    for (let r2 = 0; r2 < 3; r2++) {
      c.beginPath(); c.moveTo(-24, -10 + r2 * 11); c.lineTo(24, -10 + r2 * 11); c.stroke();
      for (let b = 0; b < 4; b++) { const bx = -24 + ((r2 % 2) ? 6 : 0) + b * 12; c.beginPath(); c.moveTo(bx, -21 + r2 * 11); c.lineTo(bx, -10 + r2 * 11); c.stroke(); }
    }
    // arrow-slit eyes
    c.fillStyle = '#241a10';
    c.beginPath(); c.roundRect(-11, -14, 4, 10, 2); c.fill();
    c.beginPath(); c.roundRect(7, -14, 4, 10, 2); c.fill();
    eyeGlow(c, -9, -9, 1.6, P.glow); eyeGlow(c, 9, -9, 1.6, P.glow);
    // gate mouth with portcullis teeth
    c.fillStyle = '#241a10';
    c.beginPath(); c.moveTo(-8, 24); c.lineTo(-8, 8); c.arc(0, 8, 8, Math.PI, 0); c.lineTo(8, 24); c.closePath(); c.fill();
    c.strokeStyle = '#8a7a68'; c.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, 4 + Math.abs(i)); c.lineTo(i * 4, 24); c.stroke(); }
    // fists: tower chunks
    mirror(c, cc => {
      cc.fillStyle = '#8a7462';
      cc.beginPath(); cc.roundRect(24, -8, 12, 18, 3); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
      cc.fillStyle = '#b5a08c';
      for (let i = 0; i < 2; i++) cc.fillRect(25 + i * 5.4, -12, 4, 5);
    });
    // battle standard
    if (o.form >= 1) {
      c.strokeStyle = '#6d5c4e'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(18, -30); c.lineTo(18, -46); c.stroke();
      c.fillStyle = '#c62828';
      poly(c, [[18, -46], [34, -42], [18, -37]]); c.fill();
    }
    if (o.form >= 2) crownGold(c, -38, 12, P);
  };
  LINE_PAINTERS[807] = function pyreHound(c, P, R, o) { // cinder war hound
    // flame mane + tail
    flame(c, 24, 6, 12 + o.form * 2, P.base, P.glow, 0.4);
    // body: charcoal beast
    const g = c.createLinearGradient(0, -18, 0, 24);
    g.addColorStop(0, '#4a3f3a'); g.addColorStop(1, '#2a221e');
    c.fillStyle = g;
    blobPath(c, [[-28, -4], [-16, -16], [6, -18], [24, -8], [26, 8], [10, 18], [-18, 16]]);
    c.fill();
    // ember cracks along the flank
    c.strokeStyle = P.glow; c.lineWidth = 2.2; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.moveTo(-10, -8); c.lineTo(-2, -4); c.lineTo(-8, 2); c.moveTo(4, -10); c.lineTo(10, -4); c.lineTo(6, 4); c.stroke();
    c.shadowBlur = 0;
    // legs braced
    c.fillStyle = '#2a221e';
    for (const [x0, x1] of [[-22, -25], [-10, -11], [6, 5], [18, 21]]) {
      poly(c, [[x0, 12], [x0 + 6, 12], [x1 + 5, 30], [x1 - 2, 30]]); c.fill();
    }
    c.fillStyle = P.glow;
    for (const fx of [-24, -10, 6, 20]) { c.beginPath(); c.ellipse(fx + 2, 30, 3, 1.8, 0, 0, Math.PI * 2); c.fill(); }
    // head: snarling furnace maw
    c.fillStyle = g;
    blobPath(c, [[-38, -18], [-28, -26], [-16, -22], [-14, -10], [-24, -4], [-36, -8]]);
    c.fill();
    // jaw glow
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 8;
    poly(c, [[-36, -10], [-24, -8], [-26, -4], [-34, -6]]); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#fff3e0';
    poly(c, [[-33, -10], [-31, -6.4], [-29.6, -9.4]]); c.fill();
    eyeGlow(c, -28, -19, 2.4, P.glow, 0.3);
    // horn studs + flame crest
    c.fillStyle = '#6d5c50';
    poly(c, [[-20, -24], [-17, -31], [-14, -23]]); c.fill();
    flame(c, -24, -30, 7 + o.form * 2, P.base, P.glow);
    if (o.form >= 2) crownGold(c, -40, 10, P);
  };
  LINE_PAINTERS[810] = function livingBlade(c, P, R, o) { // the sword that woke up
    // great blade body (point down — planted in the arena)
    const g = c.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, '#8fa0b3'); g.addColorStop(0.5, '#dde7f0'); g.addColorStop(1, '#8fa0b3');
    c.fillStyle = g;
    poly(c, [[0, 34], [-8, 18], [-8, -22], [0, -28], [8, -22], [8, 18]]);
    c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
    // fuller line + forge script
    c.strokeStyle = '#6a7a8a'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 28); c.stroke();
    runeMarks(c, R, 2, 4, P.glow, -8);
    // crossguard arms — they GESTURE
    c.fillStyle = '#5a4634';
    c.beginPath(); c.roundRect(-22, -30, 44, 7, 3); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    mirror(c, cc => {
      cc.fillStyle = '#5a4634';
      cc.beginPath(); cc.roundRect(20, -33, 6, 12, 3); cc.fill();
    });
    // grip + pommel head
    c.fillStyle = '#7a3c2e';
    c.beginPath(); c.roundRect(-4.4, -42, 8.8, 12, 4); c.fill();
    c.strokeStyle = '#4a2018'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-4, -38); c.lineTo(4, -37); c.moveTo(-4, -34); c.lineTo(4, -33); c.stroke();
    c.fillStyle = P.gold;
    c.beginPath(); c.arc(0, -46, 4.4 + o.form, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade('#ffd700', -0.3); c.lineWidth = 1.2; c.stroke();
    // the eye opens ON the blade
    eyeGlow(c, 0, -8, 3.4, P.glow);
    c.strokeStyle = P.glow; c.lineWidth = 1.4;
    c.beginPath(); c.arc(0, -8, 6, 0, Math.PI * 2); c.stroke();
    // edge glint
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-7, 12); c.lineTo(-7, -16); c.stroke();
    if (o.form >= 1) { // battle chips in the edge
      c.fillStyle = '#3d4a56';
      poly(c, [[8, 4], [5, 6], [8, 9]]); c.fill();
      poly(c, [[-8, -6], [-5, -4], [-8, -1]]); c.fill();
    }
    if (o.form >= 2) { // Warforge Colossus: floating gauntlets
      mirror(c, cc => {
        cc.fillStyle = '#8fa0b3';
        cc.beginPath(); cc.roundRect(26, -6, 12, 12, 4); cc.fill();
        cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
      });
      crownGold(c, -54, 9, P);
    }
  };
  LINE_PAINTERS[813] = function riotFiend(c, P, R, o) { // the crowd's jeer made flesh
    // banner it waves
    c.save(); c.rotate(-0.12);
    c.strokeStyle = '#4a3b63'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(-20, 6); c.lineTo(-30, -28); c.stroke();
    c.fillStyle = '#c62828';
    c.beginPath(); c.moveTo(-30, -28); c.quadraticCurveTo(-16, -34, -6, -28);
    c.lineTo(-8, -18); c.quadraticCurveTo(-18, -24, -28, -18); c.closePath(); c.fill();
    c.fillStyle = '#fff';
    c.font = ''; poly(c, [[-20, -28], [-16, -24], [-20, -20], [-24, -24]]); c.fill();
    c.restore();
    // hunched imp body
    const g = c.createLinearGradient(0, -18, 0, 26);
    g.addColorStop(0, mix(P.base, '#4a2c6b', 0.3)); g.addColorStop(1, '#241a3d');
    c.fillStyle = g;
    blobPath(c, [[-16, 2], [-10, -14], [6, -18], [18, -6], [16, 12], [2, 22], [-12, 18]]);
    c.fill();
    // MANY mouths across the body (the jeer)
    for (const [mx, my, mw] of [[-6, -6, 8], [8, -2, 7], [-2, 8, 9], [10, 10, 6]]) {
      c.fillStyle = '#12081f';
      lens(c, mx, my, mw, mw * 0.55); c.fill();
      c.fillStyle = '#fff';
      for (let t = 0; t < 3; t++) poly(c, [[mx - mw * 0.3 + t * mw * 0.3, my - 1], [mx - mw * 0.3 + t * mw * 0.3 + 1.6, my - 1], [mx - mw * 0.3 + t * mw * 0.3 + 0.8, my + 1.6]]), c.fill();
    }
    // single cyclops eye above
    eyeGlow(c, 0, -14, 3.4, P.glow, 0);
    // spindly legs
    c.strokeStyle = '#241a3d'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, 20); c.lineTo(-10, 32); c.moveTo(8, 20); c.lineTo(12, 32); c.stroke();
    if (o.form >= 1) motes(c, R, 4, 22, '#ff4081', -10);
    if (o.form >= 2) crownGold(c, -26, 9, P);
  };
  LINE_PAINTERS[816] = function warDrake(c, P, R, o) { // drake in tournament barding
    mirror(c, cc => wingMembrane(cc, 28 + o.form * 4, 12, mix(P.base, '#1a237e', 0.3), P.deep), 0);
    // body with caparison (armored skirt)
    const g = c.createLinearGradient(0, -16, 0, 26);
    g.addColorStop(0, P.base); g.addColorStop(1, P.dark);
    c.fillStyle = g;
    blobPath(c, [[-24, -2], [-14, -14], [8, -16], [24, -6], [22, 10], [6, 18], [-16, 14]]);
    c.fill();
    // barding plates
    c.fillStyle = '#8fa0b3';
    plate(c, -14, 0, 16, 10, '#8fa0b3', 3, false);
    plate(c, 4, -2, 16, 10, '#a9bac9', 3, false);
    // heraldic caparison drape
    c.fillStyle = '#c62828';
    poly(c, [[-18, 12], [16, 14], [12, 26], [-2, 22], [-14, 26]]); c.fill();
    c.fillStyle = P.gold;
    poly(c, [[-2, 15], [2, 19], [-2, 23], [-6, 19]]); c.fill();
    // legs
    c.fillStyle = P.dark;
    for (const lx of [-16, -4, 10]) poly(c, [[lx, 16], [lx + 6, 16], [lx + 4, 32], [lx - 1, 32]]), c.fill();
    // neck + helmeted head
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-20, -10); c.quadraticCurveTo(-28, -22, -26, -32); c.lineTo(-16, -30);
    c.quadraticCurveTo(-16, -20, -12, -12); c.closePath(); c.fill();
    // chanfron (head armor) with eye slit
    c.fillStyle = '#a9bac9';
    blobPath(c, [[-32, -34], [-22, -40], [-14, -36], [-14, -28], [-24, -26], [-32, -28]]);
    c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    eyeGlow(c, -24, -33, 2.2, P.glow, 0.2);
    // horn spike through the armor
    c.fillStyle = P.pale;
    poly(c, [[-18, -40], [-14, -50 - o.form * 3], [-12, -39]]); c.fill();
    // plume
    c.fillStyle = '#c62828';
    flame(c, -26, -44, 6, '#c62828', '#ef5350');
    if (o.form >= 2) crownGold(c, -54, 9, P);
  };

  // ============================================================
  //  REALM 9 · SUNDERED CRADLE — where one power became two
  // ============================================================
  LINE_PAINTERS[901] = function riftHatchling(c, P, R, o) { // dragon born of the split
    // the rift egg-shard it coils around
    crystal(c, 8, 8, 16 + o.form * 3, mix(P.base, '#ffd166', 0.3), 0.2);
    c.save(); c.globalAlpha = 0.7;
    c.strokeStyle = '#ffd166'; c.lineWidth = 1.8; c.shadowColor = '#ffd166'; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(4, -2); c.lineTo(9, 4); c.lineTo(5, 12); c.stroke();
    c.restore();
    // coiled hatchling body
    const pts = splinePts(-22, 22, -30, -8, -4, -20, 10).concat(splinePts(-4, -20, 18, -30, 22, -14, 8));
    tailSpline(c, pts, 8 + o.form, P.base, P.deep);
    // half-organic / half-chrome: chrome plates on alternate segments
    c.fillStyle = '#dde7f0';
    for (let i = 2; i < pts.length - 3; i += 4) {
      c.beginPath(); c.arc(pts[i][0], pts[i][1], 5, -Math.PI * 0.8, Math.PI * 0.1); c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill();
    }
    // head
    const [hx, hy] = pts[pts.length - 1];
    c.fillStyle = P.base;
    lens(c, hx, hy - 3, 17, 13); c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 1.4; lens(c, hx, hy - 3, 17, 13); c.stroke();
    // one organic eye, one glowing rift eye
    eyeAlmond(c, hx - 4, hy - 5, 2.6, P);
    eyeGlow(c, hx + 4, hy - 5, 2.2, '#ffd166');
    // nub horns
    c.fillStyle = P.pale;
    poly(c, [[hx - 5, hy - 10], [hx - 7, hy - 16], [hx - 2, hy - 10]]); c.fill();
    poly(c, [[hx + 5, hy - 10], [hx + 7, hy - 16], [hx + 2, hy - 10]]); c.fill();
    if (o.form >= 1) wingMembrane(c, 20 + o.form * 5, 10, mix(P.base, '#1a237e', 0.25), P.deep);
    if (o.form >= 2) crownGold(c, hy - 22, 9, P);
  };
  LINE_PAINTERS[904] = function dawnSprite(c, P, R, o) { // the rising sun, small
    // ray crown
    c.save(); c.fillStyle = P.gold; c.shadowColor = P.gold; c.shadowBlur = 8;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI; // fan over the top half
      const r0 = 24 + o.form * 3, len = 9 + (i % 2) * 6 + o.form * 2;
      c.save(); c.translate(Math.cos(a) * r0, -4 + Math.sin(a) * r0 * 0.9); c.rotate(a + Math.PI / 2);
      poly(c, [[-2.6, 0], [2.6, 0], [0, -len]]); c.fill();
      c.restore();
    }
    c.restore();
    // horizon line it rises from
    c.strokeStyle = mix(P.base, '#8d6e63', 0.4); c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-30, 16); c.lineTo(30, 16); c.stroke();
    // sun-disc body (half risen)
    const g = c.createLinearGradient(0, -24, 0, 16);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(1, mix(P.base, '#ff8a65', 0.4));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -2, 20 + o.form * 2, Math.PI * 1.06, Math.PI * -0.06); c.lineTo(20 + o.form * 2, 16); c.lineTo(-20 - o.form * 2, 16); c.closePath(); c.fill();
    // blissful face
    c.strokeStyle = '#a35b2e'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-9, -6); c.quadraticCurveTo(-6, -3.4, -3, -6); c.stroke();
    c.beginPath(); c.moveTo(3, -6); c.quadraticCurveTo(6, -3.4, 9, -6); c.stroke();
    c.beginPath(); c.moveTo(-4, 4); c.quadraticCurveTo(0, 7, 4, 4); c.stroke();
    // cheek blush
    c.fillStyle = 'rgba(255,138,101,0.5)';
    c.beginPath(); c.arc(-13, -1, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(13, -1, 3, 0, Math.PI * 2); c.fill();
    motes(c, R, 4 + o.form * 2, 26, '#fff3b0', -14);
    if (o.form >= 2) crownGold(c, -42, 10, P);
  };
  LINE_PAINTERS[907] = function vaultGuardian(c, P, R, o) { // the ark that walks
    // body: ornate reliquary chest
    const g = c.createLinearGradient(0, -24, 0, 26);
    g.addColorStop(0, '#c9b891'); g.addColorStop(1, '#8a7355');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-22, -20, 44, 40, 6); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // gold banding + lock sigil
    c.fillStyle = P.gold;
    c.beginPath(); c.roundRect(-22, -6, 44, 6, 2); c.fill();
    c.beginPath(); c.roundRect(-4, -24, 8, 48, 3); c.fill();
    c.strokeStyle = shade('#ffd700', -0.35); c.lineWidth = 1.2;
    c.strokeRect(-4, -24, 8, 48);
    // the keyhole eye (it watches through the lock)
    c.fillStyle = '#241a10';
    c.beginPath(); c.arc(0, -2, 5, 0, Math.PI * 2); c.fill();
    poly(c, [[-2.4, 0], [2.4, 0], [1.4, 8], [-1.4, 8]]); c.fill();
    eyeGlow(c, 0, -2, 2, P.glow);
    // relief carvings
    runeMarks(c, R, 3, 10, '#6d5c40', -14);
    runeMarks(c, R, 2, 8, '#6d5c40', 12);
    // stone cherub hands carrying it
    mirror(c, cc => {
      cc.fillStyle = '#b5a890';
      cc.beginPath(); cc.roundRect(22, 2, 10, 12, 4); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
      cc.beginPath(); cc.moveTo(25, 4); cc.lineTo(25, 10); cc.moveTo(28, 4); cc.lineTo(28, 10); cc.stroke();
    });
    // hover glow beneath
    c.save(); c.globalAlpha = 0.5; c.fillStyle = P.glow;
    c.beginPath(); c.ellipse(0, 26, 18, 4, 0, 0, Math.PI * 2); c.fill(); c.restore();
    // lid crest
    if (o.form >= 1) {
      c.fillStyle = P.gold;
      mirror(c, cc => { // kneeling guardian wings on the lid
        cc.beginPath(); cc.moveTo(6, -24); cc.quadraticCurveTo(16, -34, 24, -32);
        cc.quadraticCurveTo(16, -28, 10, -22); cc.closePath(); cc.fill();
      });
    }
    if (o.form >= 2) crownGold(c, -34, 11, P);
  };
  LINE_PAINTERS[910] = function hourglassSpirit(c, P, R, o) { // time-sand elemental
    // hourglass frame
    c.fillStyle = '#8a7355';
    c.beginPath(); c.roundRect(-18, -30, 36, 6, 3); c.fill();
    c.beginPath(); c.roundRect(-18, 24, 36, 6, 3); c.fill();
    c.strokeStyle = '#8a7355'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-16, -24); c.lineTo(-16, 24); c.moveTo(16, -24); c.lineTo(16, 24); c.stroke();
    // glass bulbs
    c.fillStyle = 'rgba(230,245,250,0.35)';
    c.beginPath(); c.moveTo(-14, -24); c.lineTo(14, -24); c.quadraticCurveTo(10, -6, 2, -1);
    c.lineTo(-2, -1); c.quadraticCurveTo(-10, -6, -14, -24); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-14, 24); c.lineTo(14, 24); c.quadraticCurveTo(10, 6, 2, 1);
    c.lineTo(-2, 1); c.quadraticCurveTo(-10, 6, -14, 24); c.closePath(); c.fill();
    // sand: top reservoir, falling thread, bottom dune FACE
    const sand = mix(P.base, '#ffd166', 0.3);
    c.fillStyle = sand;
    c.beginPath(); c.moveTo(-11, -24); c.lineTo(11, -24); c.quadraticCurveTo(6, -12, 0, -8); c.quadraticCurveTo(-6, -12, -11, -24); c.closePath(); c.fill();
    c.fillRect(-1, -8, 2, 16);
    c.beginPath(); c.moveTo(-12, 24); c.quadraticCurveTo(0, 8 - o.form * 2, 12, 24); c.closePath(); c.fill();
    // the face forms in the falling sand
    eyeGlow(c, -5, 14, 2.2, '#fff3b0', 0.1); eyeGlow(c, 5, 14, 2.2, '#fff3b0', -0.1);
    // sand arms leaking from the seams
    mirror(c, cc => {
      cc.fillStyle = sand;
      cc.beginPath(); cc.moveTo(16, 2); cc.quadraticCurveTo(26, 0, 30, -8 - o.form * 3);
      cc.quadraticCurveTo(24, 2, 18, 8); cc.closePath(); cc.fill();
      motes(cc, R, 2, 6, sand, -6);
    });
    if (o.form >= 2) crownGold(c, -38, 10, P);
  };
  LINE_PAINTERS[913] = function memoryGhost(c, P, R, o) { // the faded photograph
    // tilted frame
    c.save(); c.rotate(-0.06);
    c.fillStyle = '#8a7355';
    c.beginPath(); c.roundRect(-24, -30, 48, 56, 3); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#c9b891';
    c.beginPath(); c.roundRect(-20, -26, 40, 48, 2); c.fill();
    // sepia photo
    const g = c.createLinearGradient(0, -24, 0, 20);
    g.addColorStop(0, '#e8d9b0'); g.addColorStop(1, '#b39a6e');
    c.fillStyle = g;
    c.fillRect(-17, -23, 34, 42);
    // the figure IN the photo — reaching out of it
    c.fillStyle = 'rgba(90,70,50,0.85)';
    c.beginPath(); c.arc(0, -10, 8, 0, Math.PI * 2); c.fill(); // head
    c.beginPath(); c.moveTo(-9, 20); c.quadraticCurveTo(-8, 0, 0, -2); c.quadraticCurveTo(8, 0, 9, 20); c.closePath(); c.fill();
    // its arm ESCAPES the frame
    c.fillStyle = 'rgba(90,70,50,0.9)';
    c.beginPath(); c.moveTo(6, -4); c.quadraticCurveTo(20, -10, 30, -20 - o.form * 4);
    c.quadraticCurveTo(22, -8, 12, 0); c.closePath(); c.fill();
    c.beginPath(); c.arc(31, -22 - o.form * 4, 4, 0, Math.PI * 2); c.fill();
    // hollow moon eyes
    eyeGlow(c, -3, -11, 2.2, '#fff8e1', 0.1); eyeGlow(c, 3, -11, 2.2, '#fff8e1', -0.1);
    // photo corners + scratches
    c.fillStyle = '#8a7355';
    for (const [cx2, cy2] of [[-17, -23], [17, -23], [-17, 19], [17, 19]]) poly(c, [[cx2, cy2], [cx2 + (cx2 < 0 ? 5 : -5), cy2], [cx2, cy2 + (cy2 < 0 ? 5 : -5)]]), c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-12, -20); c.lineTo(-6, 10); c.stroke();
    c.restore();
    // dust motes of memory
    motes(c, R, 4 + o.form * 2, 28, '#e8d9b0', -6);
    if (o.form >= 2) crownGold(c, -40, 10, P);
  };
  LINE_PAINTERS[916] = function genesisCoil(c, P, R, o) { // the first spark, coiled
    // rising helix body
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push([Math.sin(t * Math.PI * 3.2) * (18 + o.form * 2) * (1 - t * 0.4), 32 - t * 62]);
    }
    // glow pass then core pass
    c.save(); c.shadowColor = P.base; c.shadowBlur = 10;
    tailSpline(c, pts, 7 + o.form, P.base, shade(P.base, -0.4));
    c.restore();
    // energy arcs bridging the coils
    c.save(); c.strokeStyle = P.glow; c.lineWidth = 1.8; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 6;
    for (let i = 3; i < 21; i += 6) {
      c.beginPath(); c.moveTo(pts[i][0], pts[i][1]);
      c.lineTo((pts[i][0] + pts[i + 3][0]) / 2 + 4, (pts[i][1] + pts[i + 3][1]) / 2);
      c.lineTo(pts[i + 3][0], pts[i + 3][1]); c.stroke();
    }
    c.restore();
    // head: radiant spark diamond
    const [hx, hy] = pts[24];
    c.fillStyle = '#ffffff'; c.shadowColor = P.glow; c.shadowBlur = 12;
    poly(c, [[hx, hy - 12], [hx + 8, hy - 2], [hx, hy + 8], [hx - 8, hy - 2]]); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = P.base;
    poly(c, [[hx, hy - 7], [hx + 4.6, hy - 2], [hx, hy + 3], [hx - 4.6, hy - 2]]); c.fill();
    eyeGlow(c, hx, hy - 2, 1.8, '#ffffff');
    if (o.form >= 1) orbitals(c, 3, 24, 14, 2.6, P.glow, 0.2, hy + 6);
    if (o.form >= 2) crownGold(c, hy - 20, 9, P);
  };

  // ============================================================
  //  SENTINELS — realm guardians (one painter per realm; o.idx = member)
  // ============================================================
  SENTINEL_PAINTERS[1] = function herald(c, P, R, o) { // the Three Heralds: banner spirits
    // banner staff
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(16, 30); c.lineTo(16, -44); c.stroke();
    c.fillStyle = P.base;
    c.beginPath(); c.moveTo(16, -44); c.quadraticCurveTo(38, -40, 44, -30);
    c.lineTo(20, -26); c.closePath(); c.fill();
    drawGlyph(c, o.type, 31, -34, 6, '#ffffff');
    // tall cloaked figure
    const g = c.createLinearGradient(0, -34, 0, 32);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.3)); g.addColorStop(1, mix(P.base, '#1a1030', 0.35));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -34);
    c.quadraticCurveTo(17, -26, 16, -2);
    c.lineTo(20, 30);
    c.quadraticCurveTo(0, 24, -20, 30);
    c.lineTo(-16, -2);
    c.quadraticCurveTo(-17, -26, 0, -34); c.closePath(); c.fill();
    mistSkirt(c, 28, 20, mix(P.base, '#1a1030', 0.2), R);
    // deep hood, elemental visage
    c.fillStyle = '#0d1220';
    c.beginPath(); c.arc(0, -26, 10, 0, Math.PI * 2); c.fill();
    eyeGlow(c, -4, -26, 2.6, P.glow, 0.15); eyeGlow(c, 4, -26, 2.6, P.glow, -0.15);
    // shoulder emblems
    circlet(c, -40, 10, P.glow);
    halo(c, 0, -4, 26, 32, P.base, 1.8, 0.3);
  };
  SENTINEL_PAINTERS[2] = function vowKnight(c, P, R, o) { // the Three Vows: oath-armored
    // votive brazier held forward
    c.strokeStyle = '#8a7355'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -2); c.lineTo(-28, -10); c.stroke();
    c.fillStyle = '#8a7355';
    c.beginPath(); c.arc(-30, -14, 6, Math.PI * 0.9, Math.PI * 0.1, true); c.closePath(); c.fill();
    flame(c, -30, -20, 8, P.base, P.glow);
    // armored bulk
    const g = c.createLinearGradient(0, -28, 0, 30);
    g.addColorStop(0, '#cfd8dc'); g.addColorStop(1, '#78909c');
    c.fillStyle = g;
    poly(c, [[-18, -22], [18, -22], [14, 18], [0, 26], [-14, 18]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // oath-scroll sash
    c.fillStyle = '#fff8ee';
    poly(c, [[-16, -18], [16, 2], [16, 10], [-16, -10]]); c.fill();
    c.strokeStyle = '#c9b891'; c.lineWidth = 1.2; c.stroke();
    runeMarks(c, R, 2, 6, '#8a7a5c', -4);
    // pauldrons + type sigil
    mirror(c, cc => { cc.fillStyle = '#a9bac9'; cc.beginPath(); cc.ellipse(20, -20, 10, 8, 0, 0, Math.PI * 2); cc.fill(); cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke(); });
    drawGlyph(c, o.type, 0, -6, 6.4, P.base);
    // great helm
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-10, -40, 20, 17, 6); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    visor(c, 0, -32, 14, 5.4, P.glow);
    // helm plume
    flame(c, 0, -46, 7, P.base, P.glow);
    halo(c, 0, -2, 27, 33, P.base, 1.8, 0.28);
  };
  SENTINEL_PAINTERS[3] = function sunkenColossus(c, P, R, o) { // barnacled statue titan
    // eroded stone giant, half-kneeling
    const stone = o.idx === 0 ? '#8a7a68' : o.idx === 1 ? '#9fb8c4' : '#8fa0b3';
    const g = c.createLinearGradient(0, -34, 0, 32);
    g.addColorStop(0, shade(stone, 0.2)); g.addColorStop(1, shade(stone, -0.35));
    // torso monolith
    c.fillStyle = g;
    poly(c, [[-20, -30], [20, -30], [16, 20], [-16, 20]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // fallen-crown head (tilted block)
    c.save(); c.rotate(-0.08);
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-12, -46, 24, 17, 3); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    eyeGlow(c, -5, -38, 2.6, P.glow, 0.1); eyeGlow(c, 5, -38, 2.6, P.glow, -0.1);
    c.restore();
    // erosion cracks + barnacles + weed drape
    c.strokeStyle = 'rgba(13,18,32,0.5)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-12, -20); c.lineTo(-6, -10); c.lineTo(-12, 2); c.stroke();
    c.fillStyle = '#cfd8dc';
    for (const [bx, by] of [[12, -24], [-14, -28], [10, 8]]) { c.beginPath(); c.arc(bx, by, 2.8, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#2e7d5b'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-18, -30); c.bezierCurveTo(-22, -18, -18, -6, -22, 6); c.stroke();
    c.beginPath(); c.moveTo(14, -30); c.bezierCurveTo(18, -20, 14, -12, 18, -2); c.stroke();
    // arms: one lost at the elbow, one braced
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-30, -24, 11, 22, 4); c.fill(); c.strokeStyle = P.ink; c.stroke();
    c.beginPath(); c.roundRect(20, -24, 11, 34, 4); c.fill(); c.stroke();
    // per-member emblem carved in the chest
    drawGlyph(c, o.type, 0, -8, 7, 'rgba(255,255,255,0.65)');
    // seafloor base
    c.fillStyle = '#3e4a52';
    c.beginPath(); c.ellipse(0, 26, 26, 7, 0, 0, Math.PI * 2); c.fill();
    motes(c, R, 3, 20, 'rgba(200,240,255,0.5)', -40); // rising bubbles
  };
  SENTINEL_PAINTERS[4] = function steamSibyl(c, P, R, o) { // oracle automaton
    // tripod legs
    mirror(c, cc => {
      cc.strokeStyle = '#5a6a7a'; cc.lineWidth = 4; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(8, 14); cc.lineTo(20, 32); cc.stroke();
    });
    c.strokeStyle = '#5a6a7a'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 16); c.lineTo(0, 33); c.stroke();
    // boiler-gown body
    const g = c.createLinearGradient(0, -24, 0, 22);
    g.addColorStop(0, '#c9a04a'); g.addColorStop(1, '#8a6a2e');
    c.fillStyle = g;
    teardrop(c, 0, -2, 38, 46, 0.7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // riveted bands + gauge trio (it reads fates in pressure)
    c.strokeStyle = '#6d5324'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, 2); c.quadraticCurveTo(0, 8, 16, 2); c.stroke();
    for (const [gx, gy] of [[-10, -8], [0, -12], [10, -8]]) {
      c.fillStyle = '#fff8e1';
      c.beginPath(); c.arc(gx, gy, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6d5324'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 2.4, gy - 2); c.stroke();
    }
    // oracle head: veiled dome with third-eye lens
    c.fillStyle = '#dde7f0';
    c.beginPath(); c.arc(0, -30, 11, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    eyeGlow(c, 0, -32, 3.4, P.glow);
    c.strokeStyle = P.base; c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, -32, 6, 0, Math.PI * 2); c.stroke();
    // steam wisps from head vents
    c.save(); c.globalAlpha = 0.6; c.fillStyle = '#eceff1';
    c.beginPath(); c.arc(-10, -42, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(12, -44, 3, 0, Math.PI * 2); c.fill();
    c.restore();
    halo(c, 0, -6, 28, 34, P.base, 1.8, 0.3);
  };
  SENTINEL_PAINTERS[5] = function riotPaladin(c, P, R, o) { // enforcer mech + tower shield
    // tower shield (held front-left)
    c.save(); c.translate(-18, -2); c.rotate(-0.06);
    const sg = c.createLinearGradient(0, -26, 0, 26);
    sg.addColorStop(0, mix(P.base, '#ffffff', 0.3)); sg.addColorStop(1, shade(P.base, -0.3));
    c.fillStyle = sg;
    c.beginPath(); c.roundRect(-12, -26, 24, 50, 7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.roundRect(-8, -22, 16, 12, 4); c.fill();
    drawGlyph(c, o.type, 0, 4, 7, '#ffffff');
    c.restore();
    // mech body behind
    const g = c.createLinearGradient(0, -26, 0, 28);
    g.addColorStop(0, '#dde7f0'); g.addColorStop(1, '#8fa0b3');
    c.fillStyle = g;
    poly(c, [[-8, -24], [20, -20], [22, 16], [4, 24], [-6, 16]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    plate(c, 4, -14, 14, 10, '#a9bac9', 3);
    // helm
    c.fillStyle = g;
    c.beginPath(); c.roundRect(0, -38, 18, 15, 5); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    visor(c, 9, -31, 12, 5, P.glow);
    // stun-mace arm
    c.strokeStyle = '#5a6a7a'; c.lineWidth = 4.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(20, -8); c.lineTo(30, 2); c.stroke();
    c.fillStyle = P.base; c.shadowColor = P.base; c.shadowBlur = 8;
    c.beginPath(); c.arc(32, 5, 5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // legs
    c.fillStyle = '#78909c';
    poly(c, [[2, 22], [10, 22], [12, 34], [4, 34]]); c.fill();
    poly(c, [[14, 20], [20, 18], [24, 32], [17, 33]]); c.fill();
  };
  SENTINEL_PAINTERS[6] = function foundationSerpent(c, P, R, o) { // the building's bones
    // rebar-and-glass wyrm coiling out of a floor slab
    c.fillStyle = '#78909c';
    c.beginPath(); c.roundRect(-30, 22, 60, 10, 3); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push([Math.sin(t * Math.PI * 1.8 + 0.4) * 26 * (1 - t * 0.3), 24 - t * 62]);
    }
    // rebar core: three parallel rods along the spline
    c.save(); c.lineCap = 'round';
    for (const off of [-3, 0, 3]) {
      c.strokeStyle = off ? '#5a6a7a' : '#8fa0b3'; c.lineWidth = off ? 3 : 5;
      c.beginPath(); c.moveTo(pts[0][0] + off, pts[0][1]);
      for (const [px, py] of pts) c.lineTo(px + off, py);
      c.stroke();
    }
    c.restore();
    // glass plates skewered along the body
    for (let i = 3; i < 19; i += 4) {
      c.save(); c.translate(pts[i][0], pts[i][1]); c.rotate(0.4 - (i % 8) * 0.1);
      c.fillStyle = 'rgba(214,240,252,0.75)';
      poly(c, [[-10, -6], [10, -8], [8, 6], [-8, 7]]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2; c.stroke();
      c.restore();
    }
    // wire binding ties
    c.strokeStyle = P.base; c.lineWidth = 1.6;
    for (let i = 5; i < 20; i += 5) { c.beginPath(); c.arc(pts[i][0], pts[i][1], 6, 0, Math.PI * 2); c.stroke(); }
    // head: girder jaw with glass fangs
    const [hx, hy] = pts[20];
    c.fillStyle = '#8fa0b3';
    poly(c, [[hx - 12, hy - 2], [hx + 12, hy - 8], [hx + 10, hy + 6], [hx - 10, hy + 8]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    crystal(c, hx - 4, hy + 10, 5, '#e8f4fb', Math.PI);
    crystal(c, hx + 4, hy + 9, 4.4, '#e8f4fb', Math.PI);
    eyeGlow(c, hx - 4, hy - 4, 2.6, P.glow, 0.2); eyeGlow(c, hx + 5, hy - 5, 2.6, P.glow, -0.2);
  };
  SENTINEL_PAINTERS[7] = function islandTotem(c, P, R, o) { // stacked rite-mask pillar
    // three stacked carved masks, top one alive
    const cols = [shade(P.base, -0.25), P.base, mix(P.base, '#ffffff', 0.25)];
    for (let s2 = 0; s2 < 3; s2++) {
      const y = 22 - s2 * 21, w = 21 - s2 * 2;
      c.fillStyle = cols[s2];
      c.beginPath(); c.roundRect(-w, y - 10, w * 2, 20, 5); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
      // carved features
      if (s2 < 2) {
        c.fillStyle = 'rgba(13,18,32,0.55)';
        lens(c, -w * 0.4, y - 2, 7, 4); c.fill(); lens(c, w * 0.4, y - 2, 7, 4); c.fill();
        c.strokeStyle = 'rgba(13,18,32,0.55)'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(-w * 0.3, y + 5); c.lineTo(w * 0.3, y + 5); c.stroke();
      }
    }
    // living top face
    eyeGlow(c, -8, -20, 3, P.glow, 0.15); eyeGlow(c, 8, -20, 3, P.glow, -0.15);
    c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-5, -14); c.quadraticCurveTo(0, -11, 5, -14); c.stroke();
    // wing boards
    mirror(c, cc => {
      cc.fillStyle = shade(P.base, -0.15);
      poly(cc, [[19, -24], [40, -30], [42, -22], [21, -14]]); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.6; cc.stroke();
      cc.strokeStyle = 'rgba(255,255,255,0.4)'; cc.lineWidth = 1.2;
      cc.beginPath(); cc.moveTo(24, -22); cc.lineTo(38, -26); cc.stroke();
    });
    // crest feathers
    for (let i = -2; i <= 2; i++) {
      c.save(); c.translate(i * 7, -34); c.rotate(i * 0.22);
      c.fillStyle = i % 2 ? P.glow : P.base;
      lens(c, 0, -6, 6, 14); c.fill();
      c.restore();
    }
    drawGlyph(c, o.type, 0, 2, 6.4, 'rgba(255,255,255,0.8)');
  };
  SENTINEL_PAINTERS[8] = function warEngine(c, P, R, o) { // siege machines of the pit
    if (o.idx === 2) { // the Frost Destrier: mechanical warhorse
      // body
      const g = c.createLinearGradient(0, -20, 0, 24);
      g.addColorStop(0, '#dde7f0'); g.addColorStop(1, '#8fa0b3');
      c.fillStyle = g;
      blobPath(c, [[-24, -6], [-12, -16], [10, -16], [24, -6], [22, 8], [-20, 8]]);
      c.fill(); c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      // piston legs
      for (const [x0, lean] of [[-18, -3], [-8, 2], [8, -2], [18, 3]]) {
        c.strokeStyle = '#5a6a7a'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x0, 8); c.lineTo(x0 + lean, 24); c.stroke();
        c.fillStyle = '#41505f'; c.beginPath(); c.roundRect(x0 + lean - 3.4, 24, 6.8, 5, 2); c.fill();
      }
      // neck + armored head
      c.fillStyle = g;
      poly(c, [[-22, -12], [-30, -30], [-20, -32], [-14, -14]]); c.fill(); c.stroke();
      blobPath(c, [[-36, -34], [-24, -40], [-18, -34], [-22, -26], [-32, -26]]); c.fill(); c.stroke();
      eyeGlow(c, -27, -33, 2.4, P.glow, 0.2);
      // frost mane: crystal row
      for (let i = 0; i < 4; i++) crystal(c, -18 + i * 6, -22 + i * 4, 6, '#eaf7fb', -0.4);
      // icy breath
      motes(c, R, 3, 8, '#eaf7fb', -38);
    } else { // Volt / Drake Engine: treaded siege tower
      const accent = o.idx === 0 ? P.base : '#5c6bc0';
      // treads
      c.fillStyle = '#41505f';
      c.beginPath(); c.roundRect(-26, 16, 52, 14, 7); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = '#2c3540';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-19 + i * 9.4, 23, 3.4, 0, Math.PI * 2); c.fill(); }
      // hull
      const g = c.createLinearGradient(0, -30, 0, 16);
      g.addColorStop(0, '#a9bac9'); g.addColorStop(1, '#6b7c8c');
      c.fillStyle = g;
      poly(c, [[-20, 16], [-16, -22], [16, -22], [20, 16]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
      plate(c, -12, -16, 24, 10, '#8fa0b3', 3);
      // main weapon: tesla lance / drake maw cannon
      if (o.idx === 0) {
        c.fillStyle = '#5a6a7a';
        c.beginPath(); c.roundRect(-4, -44, 8, 22, 3); c.fill();
        c.fillStyle = accent; c.shadowColor = accent; c.shadowBlur = 10;
        c.beginPath(); c.arc(0, -46, 6, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
        c.save(); c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round'; c.shadowColor = accent; c.shadowBlur = 6;
        c.beginPath(); c.moveTo(-5, -50); c.lineTo(-9, -55); c.moveTo(5, -50); c.lineTo(9, -56); c.stroke(); c.restore();
      } else {
        // drake-head cannon
        c.fillStyle = accent;
        blobPath(c, [[-8, -40], [6, -46], [14, -40], [10, -30], [-4, -30]]); c.fill();
        c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
        c.fillStyle = '#0d1220';
        c.beginPath(); c.arc(12, -38, 3, 0, Math.PI * 2); c.fill();
        eyeGlow(c, 0, -40, 2.2, P.glow);
        flame(c, 16, -38, 5, '#ff7043', '#ffd54f', 0.5);
      }
      // battle pennant
      c.strokeStyle = '#5a6a7a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(14, -22); c.lineTo(14, -34); c.stroke();
      c.fillStyle = '#c62828'; poly(c, [[14, -34], [24, -31], [14, -28]]); c.fill();
      drawGlyph(c, o.type, 0, 2, 6.4, '#ffffff');
    }
  };
  SENTINEL_PAINTERS[9] = function ruinVessel(c, P, R, o) { // sealed urn-titans
    // great urn body
    const g = c.createLinearGradient(0, -28, 0, 30);
    g.addColorStop(0, mix(P.base, '#c9b891', 0.4)); g.addColorStop(1, mix(P.base, '#4a3a28', 0.4));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -30);
    c.bezierCurveTo(20, -28, 24, -8, 20, 8);
    c.bezierCurveTo(17, 20, 10, 26, 0, 27);
    c.bezierCurveTo(-10, 26, -17, 20, -20, 8);
    c.bezierCurveTo(-24, -8, -20, -28, 0, -30); c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // sealed lid + wax sigil
    c.fillStyle = '#8a7355';
    c.beginPath(); c.ellipse(0, -30, 14, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#c62828';
    c.beginPath(); c.arc(0, -30, 4.4, 0, Math.PI * 2); c.fill();
    // seal ropes crossed over the belly
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-18, -14); c.quadraticCurveTo(0, 2, 18, -14); c.stroke();
    c.beginPath(); c.moveTo(-20, 2); c.quadraticCurveTo(0, 14, 20, 2); c.stroke();
    // ancient face relief — eyes LEAK power through the glaze
    eyeGlow(c, -7, -10, 3, P.glow, 0.15); eyeGlow(c, 7, -10, 3, P.glow, -0.15);
    c.strokeStyle = 'rgba(13,18,32,0.5)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(0, 2.4, 4, 0); c.stroke();
    // crack venting the sealed type
    c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 7;
    c.beginPath(); c.moveTo(10, 8); c.lineTo(14, 14); c.lineTo(10, 20); c.stroke(); c.shadowBlur = 0;
    drawGlyph(c, o.type, 0, -20, 5.4, 'rgba(255,255,255,0.7)');
    // spirit hands gripping the rim from inside
    mirror(c, cc => {
      cc.fillStyle = mix(P.base, '#ffffff', 0.4);
      for (let f = 0; f < 3; f++) { cc.beginPath(); cc.roundRect(4 + f * 4, -36, 2.6, 7, 1.3); cc.fill(); }
    });
    motes(c, R, 4, 22, P.glow, -34);
  };

  // ============================================================
  //  LEGENDARIES — bespoke boss bodies (style echoes the arena kit)
  // ============================================================
  LEGEND_PAINTERS[180] = function velmora(c, P, R) { // the First Oracle (anchor)
    // mandorla halo
    c.save(); c.strokeStyle = P.gold; c.lineWidth = 2.6; c.globalAlpha = 0.85;
    lens(c, 0, -6, 52, 96); c.stroke(); c.restore();
    // six light-feather wings
    mirror(c, cc => {
      for (const [a, len] of [[-0.9, 40], [-0.3, 46], [0.3, 38]]) {
        cc.save(); cc.translate(8, -10); cc.rotate(a);
        wingEnergy(cc, len, P.glow, 0.45);
        cc.restore();
      }
    });
    // robed levitating body
    const g = c.createLinearGradient(0, -40, 0, 44);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.45)); g.addColorStop(1, mix(P.base, '#2a1a4a', 0.3));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -36);
    c.quadraticCurveTo(20, -28, 18, -2);
    c.lineTo(24, 40);
    c.quadraticCurveTo(0, 30, -24, 40);
    c.lineTo(-18, -2);
    c.quadraticCurveTo(-20, -28, 0, -36); c.closePath(); c.fill();
    mistSkirt(c, 38, 24, mix(P.base, '#2a1a4a', 0.15), R);
    // floating detached sleeves + palms
    mirror(c, cc => {
      cc.fillStyle = mix(P.base, '#ffffff', 0.3);
      lens(cc, 30, 2, 12, 22); cc.fill();
      cc.fillStyle = '#ffe3f2';
      cc.beginPath(); cc.arc(30, -12, 4.6, 0, Math.PI * 2); cc.fill();
    });
    // cowled head with the TRIPLE EYE
    c.fillStyle = mix(P.base, '#2a1a4a', 0.4);
    c.beginPath(); c.arc(0, -28, 13, 0, Math.PI * 2); c.fill();
    eyeGlow(c, -5.4, -28, 2.6, P.glow, 0.15); eyeGlow(c, 5.4, -28, 2.6, P.glow, -0.15);
    c.fillStyle = '#ffffff';
    lens(c, 0, -34, 7, 9); c.fill();
    c.fillStyle = P.deep;
    c.beginPath(); c.arc(0, -34, 2.6, 0, Math.PI * 2); c.fill();
    // oracle crown
    crownGold(c, -46, 15, P, true);
    orbitals(c, 5, 42, 30, 3.4, P.glow, 0.3, -6);
  };
  LEGEND_PAINTERS[280] = function zephyrion(c, P, R) { // Warden of Gales (infinity)
    // storm-scarf: a cloud ribbon looping the body in a figure-eight hint
    c.save(); c.globalAlpha = 0.85;
    c.fillStyle = '#eceff1';
    blobPath(c, [[-46, 4], [-28, -8], [-6, -2], [10, 8], [30, 10], [44, 2], [40, 16], [16, 20], [-12, 14], [-38, 18]]);
    c.fill(); c.restore();
    // great gale-bird body
    const g = c.createLinearGradient(0, -40, 0, 30);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, mix(P.base, '#b0bec5', 0.4));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-2, -40);
    c.bezierCurveTo(20, -36, 26, -12, 16, 6);
    c.quadraticCurveTo(8, 20, -6, 24);
    c.quadraticCurveTo(-2, 10, -10, 0);
    c.bezierCurveTo(-22, -16, -16, -36, -2, -40);
    c.closePath(); c.fill();
    // vast feather wings
    mirror(c, cc => { cc.save(); cc.translate(6, -12); wingFeather(cc, 52, 26, '#ffffff', mix(P.base, '#90a4ae', 0.5), 3); cc.restore(); });
    // storm crest: three long plume blades
    for (const [a, len] of [[-0.5, 22], [-0.1, 26], [0.3, 20]]) {
      c.save(); c.translate(0, -38); c.rotate(a);
      c.fillStyle = mix(P.base, '#4dd0e1', 0.3);
      lens(c, 0, -len / 2, 7, len); c.fill();
      c.restore();
    }
    // masked face
    c.fillStyle = '#37474f';
    lens(c, -4, -30, 16, 10); c.fill();
    eyeGlow(c, -8, -30, 2.6, P.glow, 0.2); eyeGlow(c, 0, -31, 2.6, P.glow, -0.1);
    // beak
    c.fillStyle = '#ffb74d';
    poly(c, [[-12, -26], [-22, -22], [-11, -20]]); c.fill();
    // tail streamers
    c.save(); c.strokeStyle = mix(P.base, '#4dd0e1', 0.4); c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(2, 22); c.quadraticCurveTo(10, 38, 4, 50); c.stroke();
    c.beginPath(); c.moveTo(-6, 22); c.quadraticCurveTo(-14, 36, -24, 44); c.stroke();
    c.restore();
    crownGold(c, -52, 13, P, true);
  };
  LEGEND_PAINTERS[380] = function thalassar(c, P, R) { // the Deep Current (serpent)
    // vast abyssal serpent in a great S
    const pts = [];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      pts.push([Math.sin(t * Math.PI * 2.3 + 0.5) * 38 * (1 - t * 0.25), 46 - t * 92]);
    }
    // lantern spines first (behind)
    for (let i = 4; i < 24; i += 4) {
      c.strokeStyle = mix(P.base, '#00e5ff', 0.3); c.lineWidth = 2;
      c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i][0] + 12, pts[i][1] - 10); c.stroke();
      c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 9;
      c.beginPath(); c.arc(pts[i][0] + 13, pts[i][1] - 11, 3.4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    }
    tailSpline(c, pts, 15, P.base, P.deep);
    // bioluminescent belly line
    c.save(); c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round'; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(pts[1][0], pts[1][1]);
    for (const [px, py] of pts.slice(1, 25)) c.lineTo(px - 3, py + 4);
    c.stroke(); c.restore();
    // head: great jawed leviathan
    const [hx, hy] = pts[26];
    c.fillStyle = P.base;
    blobPath(c, [[hx - 16, hy + 2], [hx - 10, hy - 12], [hx + 6, hy - 14], [hx + 16, hy - 4], [hx + 12, hy + 8], [hx - 6, hy + 10]]);
    c.fill();
    c.strokeStyle = P.deep; c.lineWidth = 2; c.stroke();
    // fin crest + jaw fangs
    mirror(c, cc => { cc.fillStyle = mix(P.base, '#00e5ff', 0.35);
      poly(cc, [[Math.abs(hx) * 0 + 10, hy - 10], [26, hy - 24], [16, hy - 4]]); cc.fill(); });
    c.fillStyle = '#eaf2f5';
    poly(c, [[hx - 10, hy + 8], [hx - 7, hy + 14], [hx - 5, hy + 8]]); c.fill();
    poly(c, [[hx + 8, hy + 7], [hx + 5, hy + 13], [hx + 3, hy + 7]]); c.fill();
    eyeGlow(c, hx - 6, hy - 4, 3.4, P.glow, 0.25); eyeGlow(c, hx + 7, hy - 5, 3.4, P.glow, -0.25);
    // barbels
    c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx - 14, hy + 4); c.quadraticCurveTo(hx - 24, hy + 10, hx - 23, hy + 18); c.stroke();
    c.beginPath(); c.moveTo(hx + 13, hy + 3); c.quadraticCurveTo(hx + 22, hy + 9, hx + 21, hy + 17); c.stroke();
    crownGold(c, hy - 26, 12, P, true);
  };
  LEGEND_PAINTERS[480] = function clockworkRegent(c, P, R) { // the armillary titan (bastion)
    // nested armillary rings
    c.save();
    c.strokeStyle = P.gold; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, -2, 52, 20, 0.5, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#8fa0b3'; c.lineWidth = 2.4;
    c.beginPath(); c.ellipse(0, -2, 44, 44, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
    // ring gears riding the orbits
    gearRing(c, -44, -14, 7, 6, P.gold);
    gearRing(c, 46, 8, 6, 6, '#8fa0b3');
    // pendulum swinging beneath
    c.strokeStyle = '#8a7355'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(0, 10); c.lineTo(16, 44); c.stroke();
    c.fillStyle = P.gold;
    c.beginPath(); c.arc(17, 47, 6.4, 0, Math.PI * 2); c.fill();
    // the clock-face heart
    const g = c.createRadialGradient(-6, -10, 4, 0, -2, 34);
    g.addColorStop(0, '#fff8e1'); g.addColorStop(1, '#c9a04a');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -2, 30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6d5324'; c.lineWidth = 3; c.stroke();
    // hour ticks
    c.strokeStyle = '#6d5324'; c.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 25, -2 + Math.sin(a) * 25);
      c.lineTo(Math.cos(a) * 29, -2 + Math.sin(a) * 29); c.stroke();
    }
    // the REGENT'S EYE at the center, hands as its regalia
    eyeGlow(c, 0, -2, 5, P.glow);
    c.strokeStyle = '#3c2f14'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -2); c.lineTo(0, -20); c.stroke(); // hour
    c.beginPath(); c.moveTo(0, -2); c.lineTo(13, 6); c.stroke(); // minute
    // shoulder cog epaulettes + crown
    gearRing(c, -26, -26, 10, 7, '#a9bac9');
    gearRing(c, 26, -26, 10, 7, '#a9bac9');
    crownGold(c, -42, 16, P, true);
  };
  LEGEND_PAINTERS[580] = function voltrex(c, P, R) { // the Grid Tyrant (flank)
    // pylon-titan: lattice tower body with arc crown
    const g = c.createLinearGradient(0, -44, 0, 44);
    g.addColorStop(0, '#a9bac9'); g.addColorStop(1, '#5a6a7a');
    // splayed lattice legs
    mirror(c, cc => {
      cc.fillStyle = g;
      poly(cc, [[8, 6], [34, 44], [24, 44], [4, 12]]); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.8; cc.stroke();
      // cross-bracing
      cc.strokeStyle = '#41505f'; cc.lineWidth = 2;
      cc.beginPath(); cc.moveTo(10, 16); cc.lineTo(22, 34); cc.moveTo(20, 18); cc.lineTo(12, 30); cc.stroke();
    });
    // torso mast
    c.fillStyle = g;
    poly(c, [[-12, -40], [12, -40], [8, 10], [-8, 10]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#41505f'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-9, -26); c.lineTo(9, -14); c.moveTo(9, -26); c.lineTo(-9, -14); c.moveTo(-8, -2); c.lineTo(8, 6); c.stroke();
    // crossarm shoulders with insulator stacks
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-38, -40, 76, 8, 3); c.fill();
    c.strokeStyle = P.ink; c.stroke();
    for (const ix of [-30, -16, 16, 30]) {
      c.fillStyle = '#78909c';
      for (let d = 0; d < 3; d++) { c.beginPath(); c.ellipse(ix, -30 + d * 4, 5 - d, 2.4, 0, 0, Math.PI * 2); c.fill(); }
    }
    // the tyrant's visor face on the mast
    visor(c, 0, -34, 18, 7, P.glow, '#1c2630');
    // ARC CROWN: living electricity between the crossarm tips
    c.save(); c.strokeStyle = P.glow; c.lineWidth = 2.6; c.lineCap = 'round'; c.shadowColor = P.base; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(-36, -42);
    c.lineTo(-24, -50); c.lineTo(-12, -44); c.lineTo(0, -54); c.lineTo(12, -45); c.lineTo(24, -52); c.lineTo(36, -42);
    c.stroke(); c.restore();
    // charge core
    c.fillStyle = P.base; c.shadowColor = P.base; c.shadowBlur = 12;
    poly(c, [[-4, -14], [4, -6], [0, -6], [6, 4], [-5, -4], [-1, -4]]); c.fill(); c.shadowBlur = 0;
    crownGold(c, -58, 13, P, true);
  };
  LEGEND_PAINTERS[680] = function nyxharrow(c, P, R) { // the Carrion Angel (swoop)
    // halo of glass shards
    c.save(); c.globalAlpha = 0.95;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 1.06 + (i / 6) * Math.PI * 0.88;
      crystal(c, Math.cos(a) * 34, -30 + Math.sin(a) * 22, 7, 'rgba(216,236,248,0.85)', a + Math.PI / 2);
    }
    c.restore();
    // six ragged wings
    mirror(c, cc => {
      for (const [a, len, drop] of [[-0.8, 46, 26], [-0.25, 52, 30], [0.35, 42, 26]]) {
        cc.save(); cc.translate(6, -8); cc.rotate(a);
        cc.fillStyle = mix(P.base, '#12081f', 0.35);
        cc.beginPath(); cc.moveTo(0, 0);
        cc.quadraticCurveTo(len * 0.5, -len * 0.36, len, -len * 0.12);
        for (let f = 0; f <= 3; f++) {
          const t = f / 3;
          cc.quadraticCurveTo(len * (1 - t * 0.7) + 6, -len * 0.12 + t * drop - 6, len * (1 - t * 0.8), -len * 0.12 + t * drop);
        }
        cc.closePath(); cc.fill();
        cc.strokeStyle = P.base; cc.lineWidth = 1.6;
        cc.beginPath(); cc.moveTo(2, 2); cc.quadraticCurveTo(len * 0.5, -len * 0.24, len * 0.92, -len * 0.1); cc.stroke();
        cc.restore();
      }
    });
    // sleek angelic body
    const g = c.createLinearGradient(0, -36, 0, 44);
    g.addColorStop(0, mix(P.base, '#4a2c6b', 0.3)); g.addColorStop(1, '#12081f');
    c.fillStyle = g;
    teardrop(c, 0, 2, 26, 74, 0.5); c.fill();
    // ribcage armor plates
    c.strokeStyle = mix(P.base, '#ffffff', 0.25); c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -4 + i * 9, 12 - i * 1.6, Math.PI * 0.14, Math.PI * 0.86); c.stroke(); }
    // heart of carrion light
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    c.beginPath(); c.arc(0, -10, 5.4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // helm: blind mask with weeping glow
    c.fillStyle = '#12081f';
    lens(c, 0, -30, 18, 14); c.fill();
    c.strokeStyle = P.base; c.lineWidth = 1.6; lens(c, 0, -30, 18, 14); c.stroke();
    eyeGlow(c, -5, -31, 2.8, P.glow, 0.2); eyeGlow(c, 5, -31, 2.8, P.glow, -0.2);
    c.strokeStyle = P.glow; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-5, -27); c.lineTo(-5, -20); c.moveTo(5, -27); c.lineTo(5, -20); c.stroke();
    crownGold(c, -44, 14, P, true);
  };
  LEGEND_PAINTERS[780] = function paleEclipse(c, P, R) { // the moon that phases
    // outer dream-ring
    halo(c, 0, -2, 50, 50, mix(P.base, '#ffffff', 0.3), 2, 0.5);
    // great crescent body
    const g = c.createLinearGradient(-30, -30, 20, 30);
    g.addColorStop(0, '#f6f3ff'); g.addColorStop(1, mix(P.base, '#b39ddb', 0.5));
    c.fillStyle = g;
    crescent(c, 0, -2, 40, 0.62, -0.5); c.fill();
    c.strokeStyle = mix(P.base, '#ffffff', 0.5); c.lineWidth = 2;
    crescent(c, 0, -2, 40, 0.62, -0.5); c.stroke();
    // craters
    c.fillStyle = 'rgba(130,110,180,0.35)';
    for (const [cx2, cy2, cr2] of [[-22, -18, 5], [-27, 4, 3.4], [-16, 18, 4]]) { c.beginPath(); c.arc(cx2, cy2, cr2, 0, Math.PI * 2); c.fill(); }
    // the sleeping face on the crescent's inner edge
    c.strokeStyle = mix(P.base, '#2a1a4a', 0.3); c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, -14); c.quadraticCurveTo(-2, -11, 2, -14); c.stroke(); // closed eye
    c.beginPath(); c.moveTo(-4, 2); c.quadraticCurveTo(0, 4.4, 4, 2); c.stroke();
    // the phased TWIN — a ghost duplicate offset (the boss's lissajous glide)
    c.save(); c.globalAlpha = 0.35;
    c.fillStyle = P.base;
    crescent(c, 22, -8, 34, 0.55, 2.6); c.fill();
    c.restore();
    // dream motes orbiting
    orbitals(c, 6, 48, 34, 3, P.glow, 0.4, -2);
    motes(c, R, 6, 40, '#f6f3ff', -8);
    crownGold(c, -52, 13, P, true);
  };
  LEGEND_PAINTERS[880] = function omegaSeraph(c, P, R) { // war seraph machine (perimeter)
    // six blade-wings in a full fan
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      c.save(); c.translate(0, -6); c.rotate(a + Math.PI / 2);
      const g = c.createLinearGradient(0, 0, 0, -50);
      g.addColorStop(0, '#8fa0b3'); g.addColorStop(1, i % 2 ? P.base : '#dde7f0');
      c.fillStyle = g;
      poly(c, [[-5, 0], [5, 0], [7, -34], [0, -52], [-7, -34]]); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = P.glow; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -44); c.stroke();
      c.restore();
    }
    // armored core body
    const g2 = c.createLinearGradient(0, -30, 0, 40);
    g2.addColorStop(0, '#dde7f0'); g2.addColorStop(1, '#5a6a7a');
    c.fillStyle = g2;
    poly(c, [[0, -30], [16, -18], [12, 22], [0, 34], [-12, 22], [-16, -18]]); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    // reactor rings down the chest
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = P.glow; c.lineWidth = 2;
      c.beginPath(); c.arc(0, -8 + i * 12, 6 - i, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = P.glow; c.shadowColor = P.glow; c.shadowBlur = 12;
    c.beginPath(); c.arc(0, -8, 3.4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    // faceless helm with a single seam
    c.fillStyle = '#dde7f0';
    lens(c, 0, -24, 16, 18); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8; lens(c, 0, -24, 16, 18); c.stroke();
    c.strokeStyle = P.glow; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(0, -32); c.lineTo(0, -17); c.stroke();
    eyeGlow(c, 0, -24, 2.8, P.glow);
    crownGold(c, -44, 15, P, true);
  };
  LEGEND_PAINTERS[980] = function aurelionPrime(c, P, R) { // the First Fusion (charge)
    // the split: LEFT organic gold dragon / RIGHT chrome machine — one body
    // tail sweep behind
    c.strokeStyle = '#c9a04a'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, 30); c.quadraticCurveTo(-34, 40, -44, 28); c.stroke();
    flame(c, -46, 24, 9, '#ffd166', '#fff3b0');
    c.strokeStyle = '#8fa0b3'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(10, 30); c.quadraticCurveTo(30, 42, 42, 34); c.stroke();
    thruster(c, 42, 36, 4.4, P.glow);
    // wings: one membrane, one blade
    c.save(); c.translate(-6, -14); c.scale(-1, 1); wingMembrane(c, 44, 22, mix('#ffd166', '#c9a04a', 0.4), '#8a6a2e'); c.restore();
    c.save(); c.translate(6, -14); wingBlade(c, 46, 22, '#8fa0b3', P.glow); c.restore();
    // body: split down the center line
    const gL = c.createLinearGradient(-30, 0, 0, 0);
    gL.addColorStop(0, '#ffd166'); gL.addColorStop(1, '#c9a04a');
    c.fillStyle = gL;
    c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(-24, -26, -22, 4);
    c.quadraticCurveTo(-20, 26, 0, 34); c.closePath(); c.fill();
    const gR = c.createLinearGradient(0, 0, 30, 0);
    gR.addColorStop(0, '#dde7f0'); gR.addColorStop(1, '#8fa0b3');
    c.fillStyle = gR;
    c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(24, -26, 22, 4);
    c.quadraticCurveTo(20, 26, 0, 34); c.closePath(); c.fill();
    // the glowing seam where the halves fuse
    c.strokeStyle = P.glow; c.lineWidth = 3; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(0, -36); c.lineTo(0, 34); c.stroke(); c.shadowBlur = 0;
    // left: organic scales / right: panel lines
    c.strokeStyle = '#8a6a2e'; c.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-10, -8 + i * 12, 7, Math.PI * 0.2, Math.PI * 0.9); c.stroke(); }
    c.strokeStyle = '#5a6a7a'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(4, -16); c.lineTo(18, -12); c.moveTo(4, 0); c.lineTo(19, 2); c.moveTo(4, 14); c.lineTo(17, 16); c.stroke();
    c.fillStyle = '#41505f';
    c.beginPath(); c.arc(14, -4, 2, 0, Math.PI * 2); c.fill();
    // head: half dragon skull, half chrome helm
    c.fillStyle = '#ffd166';
    c.beginPath(); c.moveTo(0, -52); c.quadraticCurveTo(-16, -50, -18, -36); c.quadraticCurveTo(-8, -30, 0, -32); c.closePath(); c.fill();
    c.fillStyle = '#dde7f0';
    c.beginPath(); c.moveTo(0, -52); c.quadraticCurveTo(16, -50, 18, -36); c.quadraticCurveTo(8, -30, 0, -32); c.closePath(); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(0, -52); c.quadraticCurveTo(-16, -50, -18, -36); c.quadraticCurveTo(-8, -30, 0, -32); c.quadraticCurveTo(8, -30, 18, -36); c.quadraticCurveTo(16, -50, 0, -52); c.stroke();
    // horns: bone / antenna
    c.fillStyle = '#fff3b0';
    poly(c, [[-12, -50], [-20, -62], [-8, -52]]); c.fill();
    c.strokeStyle = '#8fa0b3'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(10, -51); c.lineTo(16, -62); c.stroke();
    c.fillStyle = P.glow;
    c.beginPath(); c.arc(16.8, -63, 2.2, 0, Math.PI * 2); c.fill();
    eyeGlow(c, -8, -40, 3, '#ffd166', 0.2); visor(c, 9, -40, 12, 5, P.glow);
    crownGold(c, -66, 14, P, true);
  };

  // ============================================================
  //  MYTHICS — the secret ninth notes
  // ============================================================
  MYTH_PAINTERS[181] = function lumine(c, P, R) { // the First Dream
    // crescent cradle
    c.fillStyle = mix(P.base, '#ffffff', 0.5);
    crescent(c, 0, 12, 34, 0.5, Math.PI); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; crescent(c, 0, 12, 34, 0.5, Math.PI); c.stroke();
    // the dreaming child-star curled inside
    const g = c.createRadialGradient(-4, -8, 2, 0, -4, 22);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, mix(P.base, '#ffe3f2', 0.4));
    c.fillStyle = g;
    blobPath(c, [[-14, -2], [-9, -16], [4, -20], [15, -10], [13, 4], [0, 10], [-10, 8]]);
    c.fill();
    // closed dreaming eyes + tiny smile
    c.strokeStyle = mix(P.base, '#4a2c6b', 0.4); c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-7, -8); c.quadraticCurveTo(-4, -5.6, -1, -8); c.stroke();
    c.beginPath(); c.moveTo(4, -9); c.quadraticCurveTo(7, -6.6, 10, -9); c.stroke();
    c.beginPath(); c.moveTo(0, -1); c.quadraticCurveTo(3, 1, 6, -1); c.stroke();
    // star veil trailing
    c.save(); c.globalAlpha = 0.8; c.fillStyle = mix(P.base, '#ffffff', 0.6);
    blobPath(c, [[10, -16], [26, -24], [34, -12], [24, -2], [14, -6]]); c.fill();
    c.restore();
    motes(c, R, 8, 34, '#fff3fa', -8);
    orbitals(c, 4, 38, 26, 2.6, P.glow, 0.8, 0);
    halo(c, 0, -30, 12, 4.4, P.gold, 2.6);
  };
  MYTH_PAINTERS[281] = function verdandi(c, P, R) { // the Hourseed
    // seed body with clock-hand sprout
    const g = c.createLinearGradient(0, -18, 0, 26);
    g.addColorStop(0, mix(P.base, '#ffffff', 0.35)); g.addColorStop(1, mix(P.base, '#1b5e20', 0.3));
    c.fillStyle = g;
    teardrop(c, 0, 6, 34, 44, 0.8); c.fill();
    c.strokeStyle = mix(P.base, '#1b5e20', 0.5); c.lineWidth = 2; teardrop(c, 0, 6, 34, 44, 0.8); c.stroke();
    // seed seam + ring dial carved on the belly
    c.strokeStyle = 'rgba(20,40,20,0.5)'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(4, 6, 0, 26); c.stroke();
    c.beginPath(); c.arc(0, 6, 12, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 10, 6 + Math.sin(a) * 10); c.lineTo(Math.cos(a) * 12, 6 + Math.sin(a) * 12); c.stroke();
    }
    // clock hands ARE the sprout leaves
    c.save(); c.translate(0, -16);
    c.strokeStyle = '#66bb6a'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -12); c.stroke();
    c.fillStyle = '#81c784';
    c.save(); c.rotate(-0.6); lens(c, 0, -16, 9, 18); c.fill(); c.restore(); // hour leaf
    c.save(); c.rotate(0.9); lens(c, 0, -13, 7, 14); c.fill(); c.restore();  // minute leaf
    c.restore();
    // gentle face
    eyeAlmond(c, -7, 2, 3, P); eyeAlmond(c, 7, 2, 3, P);
    motes(c, R, 5, 26, P.glow, -6);
    halo(c, 0, -34, 11, 4, P.gold, 2.4);
  };
  MYTH_PAINTERS[381] = function mirajin(c, P, R) { // the Wishing Star
    // comet ribbons
    c.save(); c.lineCap = 'round';
    for (const [col, off] of [['#4dd0e1', -6], ['#ff80ab', 0], ['#ffd54f', 6]]) {
      c.strokeStyle = col; c.lineWidth = 4; c.globalAlpha = 0.85;
      c.beginPath(); c.moveTo(off * 0.5, 4);
      c.bezierCurveTo(off + 10, 18, off + 22, 30, off + 30, 44);
      c.stroke();
    }
    c.restore();
    // five-point star body
    c.fillStyle = '#fff8e1'; c.shadowColor = P.glow; c.shadowBlur = 14;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r2 = i % 2 ? 13 : 30;
      c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r2, -6 + Math.sin(a) * r2);
    }
    c.closePath(); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#ffd54f'; c.lineWidth = 2; c.stroke();
    // wishing face
    eyeAlmond(c, -6, -8, 3.2, P); eyeAlmond(c, 6, -8, 3.2, P);
    c.fillStyle = '#ffab91';
    c.beginPath(); c.arc(-10, -1, 2.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(10, -1, 2.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#a35b2e'; c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-3, 2); c.quadraticCurveTo(0, 4.4, 3, 2); c.stroke();
    motes(c, R, 6, 34, '#fff8e1', 8);
  };
  MYTH_PAINTERS[481] = function nocthern(c, P, R) { // the Still Hour
    // cloak of midnight
    const g = c.createLinearGradient(0, -34, 0, 40);
    g.addColorStop(0, mix(P.base, '#12081f', 0.2)); g.addColorStop(1, '#0a0614');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -32);
    c.quadraticCurveTo(20, -24, 19, 2);
    c.lineTo(24, 38);
    c.quadraticCurveTo(0, 28, -24, 38);
    c.lineTo(-19, 2);
    c.quadraticCurveTo(-20, -24, 0, -32); c.closePath(); c.fill();
    mistSkirt(c, 34, 22, 'rgba(74,44,107,0.45)', R);
    // the STOPPED CLOCK face where a head should be
    c.fillStyle = '#e8e0d0';
    c.beginPath(); c.arc(0, -24, 14, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4a3b63'; c.lineWidth = 2.4; c.stroke();
    c.strokeStyle = '#4a3b63'; c.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 11, -24 + Math.sin(a) * 11); c.lineTo(Math.cos(a) * 13, -24 + Math.sin(a) * 13); c.stroke();
    }
    // both hands frozen at midnight
    c.strokeStyle = '#241a3d'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -24); c.lineTo(0, -34); c.stroke();
    c.beginPath(); c.moveTo(0, -24); c.lineTo(0, -31); c.stroke();
    // the crack across the glass
    c.strokeStyle = P.glow; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-8, -32); c.lineTo(-2, -26) ; c.lineTo(-7, -18); c.stroke();
    // reaper hands: long still fingers
    mirror(c, cc => {
      cc.fillStyle = '#241a3d';
      for (let f = 0; f < 3; f++) {
        cc.save(); cc.translate(20 + f * 3.4, 2 + f * 5); cc.rotate(0.5);
        cc.beginPath(); cc.roundRect(0, 0, 3, 14 - f * 2, 1.5); cc.fill();
        cc.restore();
      }
    });
    // stilled hourglass pendant
    c.strokeStyle = P.gold; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -4); c.stroke();
    c.fillStyle = P.gold;
    poly(c, [[-4, -4], [4, -4], [0, 2]]); c.fill();
    poly(c, [[-4, 8], [4, 8], [0, 2]]); c.fill();
    orbitals(c, 5, 34, 24, 2.6, P.base, 0.5, -6);
  };
  MYTH_PAINTERS[581] = function ignivar(c, P, R) { // the Victory Flame
    // great V-wings of fire
    mirror(c, cc => {
      cc.save(); cc.translate(4, 2); cc.rotate(-0.2);
      flame(cc, 20, -16, 26, P.base, P.glow, 0.5);
      cc.restore();
    });
    // core body: winged ember spirit
    const g = c.createRadialGradient(-3, -10, 2, 0, -2, 26);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(1, P.base);
    c.fillStyle = g;
    teardrop(c, 0, -2, 26, 46, 0.6); c.fill();
    // the V emblazoned on the chest
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-8, -8); c.lineTo(0, 8); c.lineTo(8, -8); c.stroke();
    // determined eyes
    eyeGlow(c, -6, -20, 3, '#ffffff', 0.3); eyeGlow(c, 6, -20, 3, '#ffffff', -0.3);
    // crown of five victory tongues
    for (let i = -2; i <= 2; i++) {
      flame(c, i * 8, -34 - (i % 2 ? 0 : 4), 6 + (i === 0 ? 3 : 0), P.base, P.glow);
    }
    // laurel sparks
    orbitals(c, 6, 34, 22, 2.6, P.gold, 0.3, -4);
  };
  MYTH_PAINTERS[681] = function lucerna(c, P, R) { // the Glass Saint
    // stained-glass window body (pointed arch)
    const arch = () => {
      c.beginPath(); c.moveTo(-20, 34); c.lineTo(-20, -10);
      c.quadraticCurveTo(-20, -34, 0, -42);
      c.quadraticCurveTo(20, -34, 20, -10);
      c.lineTo(20, 34); c.closePath();
    };
    // lead frame
    c.fillStyle = '#4a4a55';
    arch(); c.fill();
    // glass panes (radiant palette)
    const panes = [
      ['#f8bbd0', -16, -20, 14, 18], ['#b39ddb', 2, -20, 14, 18],
      ['#ffe082', -16, 0, 14, 15], ['#80deea', 2, 0, 14, 15],
      ['#f8bbd0', -16, 17, 14, 13], ['#ffe082', 2, 17, 14, 13],
    ];
    for (const [col, px, py, pw, ph] of panes) {
      c.fillStyle = col; c.globalAlpha = 0.92;
      c.beginPath(); c.roundRect(px, py, pw, ph, 2); c.fill();
    }
    c.globalAlpha = 1;
    // rose window head
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(0, -28, 9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4a4a55'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, -28, 9, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath(); c.moveTo(0, -28); c.lineTo(Math.cos(a) * 9, -28 + Math.sin(a) * 9); c.stroke();
    }
    eyeGlow(c, 0, -28, 2.4, P.glow);
    // the saint's halo above the arch
    halo(c, 0, -46, 12, 4.4, P.gold, 3);
    // light beaming THROUGH the glass
    c.save(); c.globalAlpha = 0.35; c.fillStyle = '#fff8e1';
    poly(c, [[-6, -20], [6, -20], [18, 40], [-18, 40]]); c.fill();
    c.restore();
    // floating glass shards attend her
    crystal(c, -30, -8, 7, 'rgba(248,187,208,0.9)', 0.4);
    crystal(c, 30, -14, 6, 'rgba(179,157,219,0.9)', -0.4);
    crystal(c, 28, 12, 5, 'rgba(255,224,130,0.9)', 0.8);
  };
  MYTH_PAINTERS[781] = function umbrix(c, P, R) { // the Stolen Shadow
    // it IS a shadow: flat black boxer silhouette with rift-crack veins
    c.fillStyle = '#12101c';
    // legs in stance
    poly(c, [[-14, 12], [-4, 10], [-8, 36], [-18, 36]]); c.fill();
    poly(c, [[4, 10], [14, 12], [20, 36], [10, 36]]); c.fill();
    // torso
    blobPath(c, [[-14, -12], [0, -18], [14, -12], [12, 8], [-12, 8]]); c.fill();
    // guard arms + wrapped fists
    blobPath(c, [[-14, -10], [-26, -16], [-30, -8], [-22, -2], [-14, -4]]); c.fill();
    blobPath(c, [[14, -10], [26, -18], [32, -10], [24, -2], [14, -4]]); c.fill();
    // head with champion's hood point
    blobPath(c, [[-8, -20], [0, -34], [8, -20], [6, -14], [-6, -14]]); c.fill();
    // rift-cracks of stolen light across the body
    c.save(); c.strokeStyle = P.glow; c.lineWidth = 2; c.lineCap = 'round'; c.shadowColor = P.glow; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(-6, -10); c.lineTo(0, -4); c.lineTo(-4, 4); c.stroke();
    c.beginPath(); c.moveTo(6, -14); c.lineTo(10, -8); c.stroke();
    c.beginPath(); c.moveTo(-26, -12); c.lineTo(-23, -7); c.stroke();
    c.restore();
    // burning green-gold eyes
    eyeGlow(c, -3.4, -24, 2.4, P.gold, 0.2); eyeGlow(c, 3.4, -24, 2.4, P.gold, -0.2);
    // the stolen crown — worn askew
    c.save(); c.translate(2, -34); c.rotate(0.18); crownGold(c, 0, 9, P); c.restore();
    // shadow pooling at the feet
    c.fillStyle = 'rgba(18,16,28,0.6)';
    c.beginPath(); c.ellipse(0, 37, 26, 5, 0, 0, Math.PI * 2); c.fill();
  };
  MYTH_PAINTERS[881] = function vyrakka(c, P, R) { // the Feral Law
    // vine-whip tails lashing
    c.save(); c.lineCap = 'round';
    for (const [a, len] of [[-0.4, 34], [0.2, 40], [0.7, 30]]) {
      c.strokeStyle = '#2e7d5b'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(10, 18);
      c.quadraticCurveTo(24 + Math.cos(a) * 12, 22 + Math.sin(a) * 10, 20 + Math.cos(a) * len, 16 + Math.sin(a) * len);
      c.stroke();
      c.fillStyle = '#66bb6a';
      lens(c, 20 + Math.cos(a) * len, 16 + Math.sin(a) * len, 7, 4); c.fill();
    }
    c.restore();
    // beast body: moss-armored ape-warden
    const g = c.createLinearGradient(0, -24, 0, 30);
    g.addColorStop(0, mix(P.base, '#1b5e20', 0.15)); g.addColorStop(1, mix(P.base, '#0d3a18', 0.5));
    c.fillStyle = g;
    blobPath(c, [[-20, -8], [-10, -22], [8, -24], [20, -10], [16, 12], [0, 20], [-16, 14]]);
    c.fill();
    // bark chest plate with the LAW glyph
    c.fillStyle = '#6d4c33';
    poly(c, [[-10, -8], [10, -8], [7, 8], [-7, 8]]); c.fill();
    c.strokeStyle = P.gold; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -4); c.lineTo(4, -4); c.moveTo(0, -4); c.lineTo(0, 4); c.stroke();
    // heavy vine arms with root-knuckles
    mirror(c, cc => {
      cc.strokeStyle = '#2e7d5b'; cc.lineWidth = 8; cc.lineCap = 'round';
      cc.beginPath(); cc.moveTo(16, -12); cc.quadraticCurveTo(28, -6, 28, 6); cc.stroke();
      cc.fillStyle = '#6d4c33';
      cc.beginPath(); cc.roundRect(22, 6, 13, 12, 4); cc.fill();
      cc.strokeStyle = P.ink; cc.lineWidth = 1.4; cc.stroke();
    });
    // judged mask face: stern wooden visage
    c.fillStyle = '#8d6e50';
    blobPath(c, [[-10, -30], [0, -36], [10, -30], [8, -18], [-8, -18]]);
    c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke();
    eyeGlow(c, -4.4, -26, 2.4, P.gold, 0.25); eyeGlow(c, 4.4, -26, 2.4, P.gold, -0.25);
    c.strokeStyle = P.ink; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-3, -20); c.lineTo(3, -20); c.stroke();
    // leaf-mane
    for (let i = -3; i <= 3; i++) {
      c.save(); c.translate(i * 6, -34); c.rotate(i * 0.24);
      c.fillStyle = i % 2 ? '#66bb6a' : '#2e7d5b';
      lens(c, 0, -6, 6, 13); c.fill();
      c.restore();
    }
  };
  MYTH_PAINTERS[981] = function marionne(c, P, R) { // the Hollow Crown
    // the crown floats ABOVE — the strings descend to the puppet
    c.save(); c.translate(0, -44);
    crownGold(c, 0, 13, P, true);
    c.restore();
    // strings
    c.strokeStyle = 'rgba(240,230,255,0.8)'; c.lineWidth = 1.2;
    for (const sx of [-10, -3, 4, 11]) {
      c.beginPath(); c.moveTo(sx, -42); c.lineTo(sx * 1.4, -20 + Math.abs(sx)); c.stroke();
    }
    // porcelain puppet-monarch body
    const g = c.createLinearGradient(0, -22, 0, 30);
    g.addColorStop(0, '#f3e8f5'); g.addColorStop(1, mix(P.base, '#4a2c6b', 0.3));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -20);
    c.quadraticCurveTo(16, -12, 15, 6);
    c.quadraticCurveTo(14, 22, 20, 30); c.lineTo(-20, 30);
    c.quadraticCurveTo(-14, 22, -15, 6);
    c.quadraticCurveTo(-16, -12, 0, -20); c.closePath(); c.fill();
    // royal sash + orb
    c.strokeStyle = P.base; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-13, -8); c.lineTo(12, 16); c.stroke();
    c.fillStyle = P.base;
    c.beginPath(); c.arc(-16, 14, 4.4, 0, Math.PI * 2); c.fill();
    // jointed puppet arms on strings
    mirror(c, cc => {
      cc.fillStyle = '#f3e8f5';
      cc.beginPath(); cc.roundRect(14, -14, 5, 12, 2.5); cc.fill();
      cc.beginPath(); cc.roundRect(16, -2, 5, 11, 2.5); cc.fill();
      cc.strokeStyle = 'rgba(90,60,110,0.5)'; cc.lineWidth = 1;
      cc.beginPath(); cc.arc(16.5, -2.4, 2.2, 0, Math.PI * 2); cc.stroke();
    });
    // porcelain mask: sweet face, cracked hollow
    c.fillStyle = '#faf3fb';
    c.beginPath(); c.arc(0, -26, 11, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(90,60,110,0.4)'; c.lineWidth = 1.4; c.stroke();
    eyeAlmond(c, -4.4, -27, 2.8, P); eyeAlmond(c, 4.4, -27, 2.8, P);
    c.fillStyle = P.base;
    c.beginPath(); c.arc(-8, -22, 1.8, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(8, -22, 1.8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8a5a9b'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-2.4, -20); c.quadraticCurveTo(0, -18.4, 2.4, -20); c.stroke();
    // the crack — and the hollow dark behind it
    c.strokeStyle = '#4a2c6b'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(6, -36); c.lineTo(3, -30); c.lineTo(7, -25); c.stroke();
    c.fillStyle = '#241a3d';
    poly(c, [[6, -35], [8, -33], [5, -29]]); c.fill();
    // toxic wisps curling from the sleeves
    motes(c, R, 5, 26, P.glow, 4);
  };

  // ============================================================
  //  ID CLASSIFICATION + BAKE
  // ============================================================
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
      return { kind: 'pilot', type: key, form: f, seed: 10 + i * 3 };
    }
    const realm = Math.floor(id / 100), n = id % 100;
    if (realm < 1 || realm > 9) return null;
    const type = TYPE_BY_ID[id] || 'normal';
    if (n === 80) return { kind: 'legend', type, form: 2, seed: id, realm };
    if (n === 81) return { kind: 'myth', type, form: 2, seed: id, realm };
    if (n >= 90 && n <= 92) return { kind: 'sentinel', type, form: 2, seed: id, realm, idx: n - 90 };
    if (n >= 1 && n <= 18) {
      const li = Math.floor((n - 1) / 3), f = (n - 1) % 3;
      return { kind: 'unit', type, form: f, seed: realm * 100 + 1 + li * 3, realm, li };
    }
    return null;
  }

  function bake(id, shiny) {
    const cls = classify(id);
    const boss = cls && (cls.kind === 'legend' || cls.kind === 'myth' || cls.kind === 'sentinel');
    const size = boss ? 192 : 128;
    const work = document.createElement('canvas');
    work.width = work.height = size;
    const c = work.getContext('2d');
    if (!cls) { // unknown id: rune chip, never blank
      c.fillStyle = '#22304a';
      c.beginPath(); c.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2); c.fill();
      work.complete = true; work.naturalWidth = size; work.naturalHeight = size;
      return work;
    }
    const P = makePalette(cls.type, shiny);
    const R = rng(cls.seed * 13 + (shiny ? 5 : 0));
    const o = { form: cls.form, type: cls.type, typeKey: cls.type, idx: cls.idx || 0 };
    c.save();
    c.translate(size / 2, size / 2 + size * 0.02);
    // aura behind bosses and radiants
    if (boss || shiny) {
      const g = c.createRadialGradient(0, 0, 4, 0, 0, size * 0.48);
      g.addColorStop(0, (shiny ? '#ffe97a' : P.base) + '4d');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(-size / 2, -size / 2, size, size);
    }
    // painter dispatch — every design is authored; the fallback rune chip
    // exists only so an unmapped id can never crash a wave
    const s = (size / 128) * (cls.kind === 'unit' ? (0.82 + cls.form * 0.09)
      : cls.kind === 'pilot' ? 0.92 : cls.kind === 'sentinel' ? 0.82 : 0.88);
    c.scale(s, s);
    const painter = cls.kind === 'pilot' ? VESSELS[cls.type]
      : cls.kind === 'unit' ? LINE_PAINTERS[cls.seed]
        : cls.kind === 'sentinel' ? SENTINEL_PAINTERS[cls.realm]
          : cls.kind === 'legend' ? LEGEND_PAINTERS[id]
            : MYTH_PAINTERS[id];
    if (painter) painter(c, P, R, o);
    else {
      c.fillStyle = P.base;
      c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill();
      drawGlyph(c, cls.type, 0, 0, 14, '#ffffff');
    }
    // radiant sparkles ride above the art
    if (shiny) {
      c.fillStyle = '#fff8d0';
      for (let i = 0; i < 6; i++) {
        const x = (R() - 0.5) * 92, y = (R() - 0.5) * 92;
        c.save(); c.translate(x, y);
        c.beginPath(); c.moveTo(0, -4.4); c.lineTo(1.3, -1.3); c.lineTo(4.4, 0); c.lineTo(1.3, 1.3);
        c.lineTo(0, 4.4); c.lineTo(-1.3, 1.3); c.lineTo(-4.4, 0); c.lineTo(-1.3, -1.3);
        c.closePath(); c.fill(); c.restore();
      }
    }
    c.restore();
    // finish: cel shade + rim light + sticker outline
    const out = finishSprite(work, size, P, {
      outline: boss ? 'rgba(8,10,20,0.95)' : 'rgba(10,14,24,0.9)',
      rim: 'rgba(255,255,255,0.45)',
    });
    out.complete = true; out.naturalWidth = size; out.naturalHeight = size;
    return out;
  }

  AF.spriteMaker = function (id, shiny) {
    const key = (shiny ? 's' : '') + id;
    if (!CACHE[key]) CACHE[key] = bake(id, shiny);
    return CACHE[key];
  };
  AF.spriteClassify = classify;
})();
