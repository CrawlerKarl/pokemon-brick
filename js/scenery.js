'use strict';
// ============================================================
//  REGION BACKGROUNDS (prerendered per gen)
// ============================================================
let bgSky = null, bgScenery = null, bgGen = -1;
function sRand(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
function buildBackground(genIdx) {
  if (bgGen === genIdx && bgSky) return;
  bgGen = genIdx;
  const g = GENS[genIdx];
  bgSky = document.createElement('canvas'); bgSky.width = W; bgSky.height = H;
  const sc = bgSky.getContext('2d');
  const grad = sc.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, g.sky[0]); grad.addColorStop(0.55, g.sky[1]); grad.addColorStop(1, g.sky[2]);
  sc.fillStyle = grad; sc.fillRect(0, 0, W, H);
  const rg = sc.createRadialGradient(W / 2, H * 0.95, 0, W / 2, H * 0.95, W * 0.6);
  rg.addColorStop(0, g.accent + '22'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sc.fillStyle = rg; sc.fillRect(0, 0, W, H);
  // a moon, drifting position per region
  const mx = W * (0.16 + ((genIdx * 0.23) % 0.68)), my = H * (0.1 + (genIdx % 3) * 0.05), mr = 26 + (genIdx % 3) * 9;
  const mg = sc.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 2.6);
  mg.addColorStop(0, 'rgba(232,234,246,0.16)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  sc.fillStyle = mg; sc.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
  sc.fillStyle = 'rgba(225,228,245,0.34)';
  sc.beginPath(); sc.arc(mx, my, mr, 0, Math.PI * 2); sc.fill();
  sc.fillStyle = 'rgba(140,150,185,0.25)';
  for (const [cx2, cy2, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.35, 0.12]]) {
    sc.beginPath(); sc.arc(mx + cx2 * mr, my + cy2 * mr, cr * mr, 0, Math.PI * 2); sc.fill();
  }

  bgScenery = document.createElement('canvas'); bgScenery.width = W; bgScenery.height = H;
  const c = bgScenery.getContext('2d');
  const rnd = sRand(genIdx * 1337 + 7);
  drawScene[g.scene](c, rnd, g);
}
function silhouetteBase(c, color, baseY) {
  c.fillStyle = color;
  c.fillRect(0, baseY, W, H - baseY);
}
// scatter lit windows over a building silhouette (restores fillStyle after)
function bWindows(c, rnd, x, y, w, h, col, chance = 0.45, sz = 3.5, gap = 10) {
  const prev = c.fillStyle;
  c.fillStyle = col;
  for (let wy = y + 5; wy < y + h - 5; wy += gap)
    for (let wx = x + 5; wx < x + w - 7; wx += gap)
      if (rnd() < chance) c.fillRect(wx, wy, sz, sz + 1);
  c.fillStyle = prev;
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
        if (rnd() < 0.3) c.fillRect(x + bw / 2 - 1.5, baseY - bh - 14, 3, 14);
        c.save(); c.fillStyle = g.accent + (li ? '26' : '40');
        for (let wy = baseY - bh + 8; wy < baseY - 8; wy += 14)
          for (let wx = x + 5; wx < x + bw - 6; wx += 12) if (rnd() < 0.32) c.fillRect(wx, wy, 4, 5);
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
    c.strokeStyle = g.accent + '99'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(t1, dy - th); c.quadraticCurveTo(W / 2, dy - 6, t2, dy - th); c.stroke();
    c.beginPath(); c.moveTo(0, dy - 4); c.quadraticCurveTo(t1 * 0.55, dy - th * 0.9, t1, dy - th); c.stroke();
    c.beginPath(); c.moveTo(W, dy - 4); c.quadraticCurveTo(W - (W - t2) * 0.55, dy - th * 0.9, t2, dy - th); c.stroke();
    c.lineWidth = 1.2; // hangers
    for (let hx = t1 + 36; hx < t2 - 20; hx += 36) {
      c.beginPath(); c.moveTo(hx, cableY(hx)); c.lineTo(hx, dy - 3); c.stroke();
    }
    c.fillStyle = g.accent + 'bb'; // deck lights
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
const AMBIENT_TYPES = ['firefly', 'petal', 'rain', 'snow', 'neon', 'sparkle', 'ember', 'mist', 'dust'];
let ambient = [], ambientGen = -1, shootStars = [];
function updateAmbient(dt, genIdx) {
  if (ambientGen !== genIdx) { ambient = []; ambientGen = genIdx; }
  const type = AMBIENT_TYPES[genIdx];
  const cap = type === 'rain' ? 64 : type === 'mist' ? 10 : 34;
  if (ambient.length < cap && Math.random() < dt * (type === 'rain' ? 60 : 14)) {
    const a = { ph: Math.random() * Math.PI * 2, r: 1 + Math.random() * 2 };
    switch (type) {
      case 'firefly': a.x = Math.random() * W; a.y = H * (0.55 + Math.random() * 0.4); a.vx = (Math.random() - 0.5) * 18; a.vy = (Math.random() - 0.5) * 12; break;
      case 'petal': case 'snow': a.x = Math.random() * W; a.y = -8; a.vx = (Math.random() - 0.5) * 24; a.vy = type === 'snow' ? 32 + Math.random() * 26 : 46 + Math.random() * 30; break;
      case 'rain': a.x = Math.random() * W; a.y = -10; a.vx = -60; a.vy = 540 + Math.random() * 160; break;
      case 'neon': case 'ember': a.x = Math.random() * W; a.y = H + 6; a.vx = (Math.random() - 0.5) * 14; a.vy = -(26 + Math.random() * 40); break;
      case 'sparkle': a.x = Math.random() * W; a.y = Math.random() * H; a.vx = 0; a.vy = 0; a.life = 1.6; break;
      case 'mist': a.x = -80; a.y = H * (0.75 + Math.random() * 0.2); a.vx = 12 + Math.random() * 14; a.vy = 0; a.r = 40 + Math.random() * 50; break;
      case 'dust': a.x = Math.random() * W; a.y = H * (0.3 + Math.random() * 0.6); a.vx = 8 + Math.random() * 10; a.vy = (Math.random() - 0.5) * 6; break;
    }
    ambient.push(a);
  }
  for (const a of ambient) {
    a.ph += dt * 2;
    a.x += (a.vx + Math.sin(a.ph) * 10) * dt;
    a.y += a.vy * dt;
    if (a.life != null) a.life -= dt;
  }
  ambient = ambient.filter(a => a.x > -120 && a.x < W + 120 && a.y > -40 && a.y < H + 40 && (a.life == null || a.life > 0));
  // shooting stars, rare and pretty
  if (Math.random() < dt * 0.035) {
    shootStars.push({ x: Math.random() * W * 0.8, y: Math.random() * H * 0.3, vx: 420 + Math.random() * 220, vy: 130 + Math.random() * 80, life: 0.7 });
  }
  for (const s of shootStars) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
  shootStars = shootStars.filter(s => s.life > 0);
}
function drawAmbient(genIdx) {
  const type = AMBIENT_TYPES[genIdx];
  const accent = GENS[genIdx].accent;
  for (const a of ambient) {
    switch (type) {
      case 'firefly': {
        const tw = 0.5 + 0.5 * Math.sin(a.ph * 2.4);
        ctx.globalAlpha = tw * 0.7;
        ctx.fillStyle = '#d4ff8a';
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.6 + tw, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'petal':
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#f1b7e4';
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph);
        ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      case 'rain':
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#9fd4e8'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + 2.4, a.y + 13); ctx.stroke();
        break;
      case 'snow':
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#eef3ff';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        break;
      case 'neon': case 'ember':
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(a.ph * 3);
        ctx.fillStyle = type === 'ember' ? '#ffab66' : accent;
        ctx.fillRect(a.x, a.y, 2.2, 2.2);
        break;
      case 'sparkle': {
        const tw = Math.sin((a.life / 1.6) * Math.PI);
        ctx.globalAlpha = tw * 0.8;
        ctx.fillStyle = '#ffd6ef';
        ctx.fillRect(a.x - 0.5, a.y - 3.5 * tw, 1, 7 * tw);
        ctx.fillRect(a.x - 3.5 * tw, a.y - 0.5, 7 * tw, 1);
        break;
      }
      case 'mist': {
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r);
        g.addColorStop(0, 'rgba(190,210,225,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(a.x - a.r, a.y - a.r, a.r * 2, a.r * 2);
        break;
      }
      case 'dust':
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(a.ph * 2);
        ctx.fillStyle = '#e8c98a';
        ctx.fillRect(a.x, a.y, 1.6, 1.6);
        break;
    }
  }
  ctx.globalAlpha = 1;
  for (const s of shootStars) {
    ctx.globalAlpha = Math.min(1, s.life / 0.3) * 0.55;
    const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
