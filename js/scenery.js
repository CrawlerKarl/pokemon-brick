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
const drawScene = {
  hills(c, rnd, g) {
    [[g.land[0], H * 0.84, 36, 0.004], [g.land[1], H * 0.89, 26, 0.007], [g.land[2], H * 0.94, 18, 0.011]].forEach(([col, baseY, amp, f], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, baseY + Math.sin(x * f + li * 2) * amp);
      c.lineTo(W, H); c.closePath(); c.fill();
      if (li === 1) for (let i = 0; i < 7; i++) {
        const tx = rnd() * W, ty = baseY + Math.sin(tx * f + li * 2) * amp;
        c.beginPath(); c.arc(tx, ty - 10, 9 + rnd() * 8, 0, Math.PI * 2); c.fill();
        c.fillRect(tx - 2, ty - 8, 4, 12);
      }
    });
  },
  pagoda(c, rnd, g) {
    silhouetteBase(c, g.land[2], H * 0.93);
    c.fillStyle = g.land[1]; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) c.lineTo(x, H * 0.9 + Math.sin(x * 0.006) * 20);
    c.lineTo(W, H); c.closePath(); c.fill();
    for (const [px, scale, col] of [[W * 0.2, 1, g.land[1]], [W * 0.72, 1.35, g.land[0]], [W * 0.5, 0.7, g.land[2]]]) {
      const tiers = 5, bw = 90 * scale, th = 34 * scale, baseY = H * 0.92;
      c.fillStyle = col;
      for (let t = 0; t < tiers; t++) {
        const w = bw * (1 - t * 0.16), y = baseY - t * th;
        c.fillRect(px - w * 0.32, y - th * 0.55, w * 0.64, th * 0.6);
        c.beginPath();
        c.moveTo(px - w * 0.55, y - th * 0.5);
        c.quadraticCurveTo(px, y - th * 0.95, px + w * 0.55, y - th * 0.5);
        c.lineTo(px + w * 0.36, y - th * 0.62); c.lineTo(px - w * 0.36, y - th * 0.62);
        c.closePath(); c.fill();
      }
      c.fillRect(px - 2 * scale, baseY - tiers * th - 16 * scale, 4 * scale, 18 * scale);
    }
  },
  waves(c, rnd, g) {
    c.fillStyle = g.land[0];
    c.beginPath(); c.ellipse(W * 0.78, H * 0.88, 90, 26, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.moveTo(W * 0.74, H * 0.86); c.quadraticCurveTo(W * 0.78, H * 0.74, W * 0.82, H * 0.86); c.fill();
    [[g.land[0], H * 0.9], [g.land[1], H * 0.94], [g.land[2], H * 0.97]].forEach(([col, baseY], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) c.lineTo(x, baseY + Math.sin(x * 0.02 + li * 3) * 5);
      c.lineTo(W, H); c.closePath(); c.fill();
    });
    c.fillStyle = g.accent + '30';
    for (let i = 0; i < 14; i++) c.fillRect(W * 0.45 + (rnd() - 0.5) * 60, H * 0.9 + i * 6, 30 + rnd() * 40, 2);
  },
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
  },
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
    c.strokeStyle = g.land[2]; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, H * 0.93);
    c.quadraticCurveTo(W * 0.25, H * 0.86, W * 0.5, H * 0.93);
    c.quadraticCurveTo(W * 0.75, H * 0.86, W, H * 0.93); c.stroke();
  },
  tower(c, rnd, g) {
    silhouetteBase(c, g.land[2], H * 0.94);
    c.fillStyle = g.land[1]; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) c.lineTo(x, H * 0.91 + Math.sin(x * 0.008) * 9);
    c.lineTo(W, H); c.closePath(); c.fill();
    const tx = W * 0.5, baseY = H * 0.93, th = H * 0.34;
    c.fillStyle = g.land[0];
    c.beginPath();
    c.moveTo(tx - 70, baseY);
    c.quadraticCurveTo(tx - 26, baseY - th * 0.55, tx - 12, baseY - th);
    c.lineTo(tx + 12, baseY - th);
    c.quadraticCurveTo(tx + 26, baseY - th * 0.55, tx + 70, baseY);
    c.closePath(); c.fill();
    c.fillRect(tx - 3, baseY - th - 26, 6, 26);
    c.strokeStyle = g.land[2]; c.lineWidth = 3;
    for (const f of [0.3, 0.6, 0.85]) {
      const y = baseY - th * f, w = 70 * (1 - f * 0.75) + 14;
      c.beginPath(); c.moveTo(tx - w, y); c.lineTo(tx + w, y); c.stroke();
    }
    c.fillStyle = g.accent + '55';
    c.beginPath(); c.arc(tx, baseY - th - 28, 5, 0, Math.PI * 2); c.fill();
  },
  palms(c, rnd, g) {
    c.fillStyle = g.land[0];
    c.beginPath(); c.moveTo(W * 0.62, H * 0.9); c.lineTo(W * 0.76, H * 0.7); c.lineTo(W * 0.79, H * 0.7); c.lineTo(W * 0.92, H * 0.9); c.closePath(); c.fill();
    c.fillStyle = g.accent + '44';
    c.beginPath(); c.arc(W * 0.775, H * 0.7, 6, 0, Math.PI * 2); c.fill();
    [[g.land[1], H * 0.92], [g.land[2], H * 0.96]].forEach(([col, baseY], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, baseY + Math.sin(x * 0.015 + li) * 5);
      c.lineTo(W, H); c.closePath(); c.fill();
    });
    for (const [px, lean, s] of [[W * 0.12, 0.3, 1], [W * 0.2, -0.2, 0.8], [W * 0.88, -0.35, 1.1]]) {
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
  stadium(c, rnd, g) {
    silhouetteBase(c, g.land[2], H * 0.95);
    c.fillStyle = g.land[1];
    let x = 0;
    while (x < W) { const bw = 40 + rnd() * 70, bh = 24 + rnd() * 46; c.fillRect(x, H * 0.95 - bh, bw, bh); x += bw + 10 + rnd() * 30; }
    for (const sx of [W * 0.15, W * 0.85]) {
      c.fillRect(sx, H * 0.95 - 110, 16, 110);
      c.fillStyle = g.land[0] + '88';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sx + 8 + i * 8, H * 0.95 - 120 - i * 16, 8 + i * 4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = g.land[1];
    }
    const dx = W * 0.5, dy = H * 0.95, dr = Math.min(W * 0.2, 210);
    c.fillStyle = g.land[0];
    c.beginPath(); c.arc(dx, dy, dr, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = g.accent + '4d'; c.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      c.beginPath(); c.arc(dx, dy, dr * i / 6, Math.PI, 0); c.stroke();
    }
    c.fillStyle = g.accent + '33';
    c.fillRect(dx - dr, dy - 4, dr * 2, 4);
  },
  mesa(c, rnd, g) {
    const rg = c.createRadialGradient(W / 2, H * 0.98, 10, W / 2, H * 0.98, W * 0.3);
    rg.addColorStop(0, g.accent + '40'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, H * 0.5, W, H * 0.5);
    [[g.land[0], H * 0.82], [g.land[1], H * 0.89], [g.land[2], H * 0.95]].forEach(([col, baseY], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      let x = 0; c.lineTo(0, baseY);
      while (x < W) {
        const flat = 60 + rnd() * 130, gap = 40 + rnd() * 80, mh = 36 + rnd() * 50;
        c.lineTo(x + 14, baseY - mh); c.lineTo(x + flat - 14, baseY - mh); c.lineTo(x + flat, baseY);
        x += flat + gap; c.lineTo(Math.min(x, W), baseY);
      }
      c.lineTo(W, H); c.closePath(); c.fill();
    });
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
  if (Math.random() < dt * 0.06) {
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
    ctx.globalAlpha = Math.min(1, s.life / 0.3) * 0.8;
    const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
