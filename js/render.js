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

function drawBricks() {
  const boss = G.bricks.find(b => b.isBoss);
  const introOff = G.bossIntro > 0 ? -Math.pow(G.bossIntro / 1.6, 2) * (H * 0.4) : 0;
  for (const br of G.bricks) {
    if (br.dead) continue;
    const x = br.bx + G.fx;
    let y = br.by + G.fy + Math.sin(G.time * 2 + br.wobble) * (br.isBoss ? 4 : 2.5);
    if (br.isBoss) y += introOff;
    const col = TYPE_COLORS[br.poke.t];
    br.flash = Math.max(0, br.flash - 0.08);
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
    // HP dial (top-left corner): ring + number, mirroring the type badge —
    // corner-anchored so it never covers the Pokémon like the old bars did
    if (!br.isBoss && br.maxHp > 1) {
      const cRad = Math.min(10, br.h * 0.22);
      const cX = x - hw + cRad + 5, cY = y - hh + cRad + 5;
      const frac = Math.max(0, br.hp / br.maxHp);
      const hCol = aCol || '#9be7ff';
      ctx.beginPath(); ctx.arc(cX, cY, cRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6,9,24,0.78)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cX, cY, cRad - 1.6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.strokeStyle = hCol;
      ctx.stroke();
      ctx.font = `900 ${Math.max(7.5, cRad * 0.95)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(Math.ceil(br.hp), cX, cY + 0.5);
    }
    // type badge (top-right corner): symbol + color, so matchups don't rely
    // on card color alone — it lights up when your ball element is strong here
    if (br.poke.id !== -1) {
      const bR = br.isBoss ? 12 : Math.min(10, br.h * 0.22);
      const bx2 = x + hw - bR - 5, by2 = y - hh + bR + 5;
      const elem = G.ballElement;
      const strong = elem && (EFFECTIVE[elem] || []).includes(br.poke.t);
      const weak = elem && (RESIST[elem] || []).includes(br.poke.t);
      ctx.beginPath(); ctx.arc(bx2, by2, bR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6,9,24,0.78)'; ctx.fill();
      ctx.lineWidth = strong ? 2 : 1.4;
      ctx.strokeStyle = strong ? `rgba(255,213,79,${0.65 + 0.35 * Math.sin(G.time * 6)})` : weak ? 'rgba(120,130,140,0.9)' : col;
      ctx.stroke();
      drawGlyph(ctx, br.poke.t, bx2, by2, bR * 0.58, weak ? '#78909c' : col);
      if (strong) { // 2× tag pulses over super-effective targets
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
    ctx.fillText('GUARDIAN OF ' + genFor(G.level).name, W / 2, H * 0.42 + 40);
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

function drawPaddle() {
  const pw = paddleW(), py = PADDLE_Y(), x = G.paddle.x;
  const blink = G.invuln > 0 && Math.floor(G.time * 12) % 2 === 0;
  if (blink) return;
  const sq = 1 + G.paddle.squash * 0.25; // squash & stretch on bounce
  const ph = G.paddle.h * sq, pwv = pw * (2 - sq);
  ctx.save();
  const mega = G.megaT > 0;
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
  const g = ctx.createLinearGradient(x, py - 10, x, py + 10);
  if (mega) {
    g.addColorStop(0, '#fff9c4'); g.addColorStop(0.5, `hsl(${(G.time * 160) % 360},85%,62%)`); g.addColorStop(1, '#7b1fa2');
  } else {
    g.addColorStop(0, '#e3f2fd'); g.addColorStop(0.5, '#64b5f6'); g.addColorStop(1, '#1565c0');
  }
  roundRect(x - pwv / 2, py - ph / 2, pwv, ph, 9);
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = G.blasterCD > 0 ? '#546e7a' : '#cfd8dc';
  roundRect(x - 3.5, py - 24, 7, 12, 3); ctx.fill();
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
  ctx.restore();
}

function drawBalls() {
  const elemCol = G.ballElement ? TYPE_COLORS[G.ballElement] : null;
  for (const b of G.balls) {
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i], a = (1 - i / b.trail.length) * 0.35;
      ctx.globalAlpha = a;
      ctx.fillStyle = G.fx_fire ? '#ff7043' : (b.ember > 0 ? '#ffab66' : (elemCol || '#90caf9'));
      ctx.beginPath(); ctx.arc(t.x, t.y, b.r * (1 - i / b.trail.length * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = G.fx_fire ? '#ff5722' : (elemCol || '#90caf9');
    ctx.shadowBlur = SETTINGS.hcBall ? 0 : 16;
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
  let wallTop = Infinity, rallyFloor = -Infinity;
  for (const br of G.bricks) {
    if (br.dead) continue;
    if (br.armored) wallTop = Math.min(wallTop, br.by + G.fy - br.h / 2);
    if (!br.isBoss) rallyFloor = Math.max(rallyFloor, br.by + G.fy + br.h / 2);
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
    ctx.globalAlpha = 0.25 + prog * 0.45;
    ctx.setLineDash([6, 9]);
    ctx.lineDashOffset = -G.time * 70;
    ctx.lineWidth = 2;
    ctx.strokeStyle = tg.boss ? '#e1bee7' : '#ff8a80';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    if (tg.boss) {
      const ang = Math.atan2(PADDLE_Y() - by, G.paddle.x - bx);
      const len = Math.hypot(PADDLE_Y() - by, G.paddle.x - bx);
      ctx.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
    } else {
      ctx.lineTo(bx, PADDLE_Y());
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // charging glow at the muzzle
    ctx.globalAlpha = 0.5 + prog * 0.5;
    ctx.fillStyle = tg.boss ? '#b388ff' : '#ff5252';
    ctx.beginPath(); ctx.arc(bx, by, 3 + prog * 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const cs of G.columnStrikes) {
    ctx.save();
    const col = cs.color || '#80d8ff';
    if (cs.warn > 0) {
      const a = 0.14 + 0.1 * Math.sin(G.time * 14);
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

function drawProjectiles() {
  for (const L of G.lasers) {
    ctx.save();
    ctx.shadowColor = L.hyper ? '#ff5cf0' : L.explosive ? '#ff7043' : L.basic ? '#80d8ff' : '#ffd54f';
    ctx.shadowBlur = L.hyper ? 22 : 16;
    ctx.fillStyle = L.hyper ? '#f8bbf3' : L.explosive ? '#ff8a65' : L.basic ? '#b3e5fc' : '#fff176';
    roundRect(L.x - 4, L.y - 20, 8, 32, 4); ctx.fill();
    // bright core
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(L.x - 1.5, L.y - 16, 3, 24, 1.5); ctx.fill();
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
  for (const s of G.enemyShots) {
    const r = s.boss ? 13 : 10;
    const spikes = s.boss ? 8 : 6;
    const spin = G.time * (s.boss ? 4 : 6) + s.x * 0.05;
    const outer = s.boss ? '#ff5cf0' : '#ff5252';
    const inner = s.boss ? '#7b1fa2' : '#b71c1c';
    const core = s.boss ? '#fff0fb' : '#ffe0e0';
    // short motion tail shows travel direction
    const sp = Math.hypot(s.vx || 0, s.vy || 0) || 1;
    const ux = (s.vx || 0) / sp, uy = (s.vy || 1) / sp;
    ctx.save();
    ctx.globalAlpha = 0.5;
    const tg = ctx.createLinearGradient(s.x, s.y, s.x - ux * 26, s.y - uy * 26);
    tg.addColorStop(0, outer); tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = tg; ctx.lineWidth = r * 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - ux * 24, s.y - uy * 24); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.translate(s.x, s.y);
    ctx.rotate(spin);
    ctx.shadowColor = outer; ctx.shadowBlur = 14;
    // spiked star body
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = i * Math.PI / spikes;
      const rr = i % 2 === 0 ? r * 1.35 : r * 0.6;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.35);
    g.addColorStop(0, core); g.addColorStop(0.55, outer); g.addColorStop(1, inner);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0;
    // dark pupil-like core so the shape can't be mistaken for a glowing ball
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = inner; ctx.fill();
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

function drawParticles() {
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
  }
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
  ctx.font = '700 13px Orbitron, sans-serif';
  const descLines = wrapText(a.desc, maxTextW);
  ctx.font = '700 11px Orbitron, sans-serif';
  const subLines = a.sub ? wrapText(a.sub, maxTextW) : [];
  const descH = descLines.length * 19, subH = subLines.length * 16;
  let lineW = nameW;
  ctx.font = '700 13px Orbitron, sans-serif';
  for (const l of descLines) lineW = Math.max(lineW, ctx.measureText(l).width);
  ctx.font = '700 11px Orbitron, sans-serif';
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
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = alpha * 0.85;
  descLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 28 + i * 19));
  if (subLines.length) {
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.fillStyle = '#90a4ae';
    ctx.globalAlpha = alpha * 0.8;
    subLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 28 + descH + 8 + i * 16));
  }
  ctx.restore();
}

// transient tutorial hint: shows until you've fired a few shots.
// on touch it points at the FIRE button instead of the paddle
function drawShootHint() {
  if (G.state !== 'play' || G.shotsFired >= 3 || G.playT > 20) return;
  const a = Math.min(1, G.playT / 0.6) * (0.55 + 0.35 * Math.sin(G.time * 5));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 13px Orbitron, sans-serif';
  if (IS_TOUCH) {
    const B = touchButtons().fire;
    const text = 'HOLD FIRE TO SHOOT';
    const tw = ctx.measureText(text).width + 26;
    const x = B.x - B.r - tw / 2 - 14, y = B.y - 6;
    roundRect(x - tw / 2, y - 15, tw, 30, 15);
    ctx.fillStyle = 'rgba(8,12,30,0.75)'; ctx.fill();
    ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#b3e5fc';
    ctx.fillText(text, x, y + 1);
    // arrow pointing right at the button
    ctx.beginPath();
    ctx.moveTo(x + tw / 2 + 4, y - 5); ctx.lineTo(x + tw / 2 + 4, y + 5); ctx.lineTo(x + tw / 2 + 12, y);
    ctx.closePath();
    ctx.fillStyle = '#80d8ff'; ctx.fill();
  } else {
    const x = G.paddle.x, y = PADDLE_Y() - 72;
    const text = 'HOLD CLICK TO SHOOT — MIND THE HEAT';
    const tw = ctx.measureText(text).width + 26;
    roundRect(x - tw / 2, y - 15, tw, 30, 15);
    ctx.fillStyle = 'rgba(8,12,30,0.75)'; ctx.fill();
    ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#b3e5fc';
    ctx.fillText(text, x, y + 1);
    // little arrow pointing at the blaster barrel
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 15); ctx.lineTo(x + 5, y + 15); ctx.lineTo(x, y + 24);
    ctx.closePath();
    ctx.fillStyle = '#80d8ff'; ctx.fill();
  }
  ctx.restore();
}

function drawShield() {
  if (G.shieldCharges <= 0) return;
  ctx.save();
  const a = 0.25 + 0.12 * Math.sin(G.time * 4) + G.shieldCharges * 0.08;
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
  let lowest = -Infinity;
  for (const br of G.bricks) if (!br.dead) lowest = Math.max(lowest, br.by + G.fy + br.h / 2);
  const prox = (lowest - (DANGER_Y() - 200)) / 200;
  if (prox <= 0.35) return; // only warn when genuinely close — no early-game noise
  const a = Math.min(0.5, prox * 0.5) * (0.6 + 0.4 * Math.sin(G.time * 6));
  ctx.strokeStyle = `rgba(255,82,82,${a})`;
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, DANGER_Y()); ctx.lineTo(W, DANGER_Y()); ctx.stroke();
  ctx.setLineDash([]);
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
  ctx.fillStyle = '#fff';
  ctx.fillText(String(G.score).padStart(7, '0'), 20, 28);
  if (W >= 560) { // narrow screens: row 2 belongs to the wave title
    ctx.font = '500 10px Orbitron, sans-serif';
    ctx.fillStyle = '#90a4ae';
    ctx.fillText('BEST ' + G.best, 20, 46);
  }
  // combo + ball element live just below the bar, clear of the wave title
  if (G.combo > 1) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = '700 13px Orbitron, sans-serif';
    ctx.fillText('COMBO x' + G.combo, 20, 72);
  }
  if (G.ballElement) {
    ctx.fillStyle = TYPE_COLORS[G.ballElement];
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.fillText('⬤ ' + G.ballElement.toUpperCase() + ' BALL', 20, G.combo > 1 ? 90 : 72);
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
  for (let i = 0; i < G.lives; i++) {
    const lx = W - 28 - i * 30, ly = 28;
    ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 10, Math.PI, 0, true); ctx.fillStyle = '#ef5350'; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = '#eceff1'; ctx.fill();
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.stroke();
  }
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
}

// on-screen buttons for touch play — FIRE, MEGA ring meter, pause, sound
function drawTouchControls() {
  const B = touchButtons();
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // FIRE
  const hot = G.overheat > 0;
  const f = B.fire;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fillStyle = hot ? 'rgba(80,30,30,0.72)' : 'rgba(10,16,38,0.72)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = hot ? '#ff5252' : '#80d8ff';
  ctx.stroke();
  // heat arc wraps the fire button
  const frac = hot ? 1 - Math.min(1, (2.4 - G.overheat) / 2.4) : G.heat;
  if (frac > 0.02) {
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 5, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = hot ? '#ff5252' : frac > 0.66 ? '#ff7043' : '#ffd54f';
    ctx.stroke();
  }
  drawGlyph(ctx, 'target', f.x, f.y - 6, 13, hot ? '#ff8a80' : '#b3e5fc');
  ctx.font = '900 9px Orbitron, sans-serif';
  ctx.fillStyle = hot ? '#ff8a80' : '#b3e5fc';
  ctx.fillText(hot ? 'HOT!' : 'FIRE', f.x, f.y + 16);
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

// draw centered text, auto-shrinking to fit the viewport width
function fitText(text, y, baseSize, weight, color, maxW) {
  let size = baseSize;
  ctx.font = `${weight} ${size}px Orbitron, sans-serif`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size = Math.max(8.5, size * maxW / w);
    ctx.font = `${weight} ${size}px Orbitron, sans-serif`;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y);
}
function drawMenu() {
  dim(0.55);
  const L = menuLayout();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title('POKÉMON', L.titleY, L.titleSize, '#ffd54f');
  title('INVADERS BREAKOUT', L.titleY + L.titleSize, L.titleSize * 0.5, '#e3f2fd');
  const maxW = W * 0.92;
  // two lines only — the real tutorial happens in your first wave
  const lines = W < 560 ? [
    ['9 REGIONS · 3 STAGES EACH', '#cfd8dc'],
    ['CATCH POKÉMON · DRAFT UPGRADES', '#b0bec5'],
  ] : [
    ['JOURNEY THROUGH 9 REGIONS · 3 STAGES EACH · A LEGENDARY GUARDS EVERY THIRD', '#cfd8dc'],
    ['CATCH POKÉMON · EXPLOIT TYPE MATCHUPS · DRAFT UPGRADES BETWEEN WAVES', '#b0bec5'],
  ];
  lines.forEach(([l, c], i) => fitText(l, L.infoY + i * L.lineH, 13 * Math.max(0.85, L.s), '500', c, maxW));
  // starter Pokémon — a partner whose paddle ability grows all game
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = '#90a4ae';
  ctx.fillText('STARTER POKÉMON', W / 2, L.startLabelY);
  for (let i = 0; i < STARTERS.length; i++) {
    const st = STARTERS[i], pg = L.starter(i), sel = SETTINGS.starter === st.key;
    const hov = inRect(mouseX, lastMouseY, pg);
    const col = st.key === 'none' ? '#90a4ae' : TYPE_COLORS[st.key];
    const mon = STARTER_MON[st.key];
    ctx.save();
    if (sel) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
    roundRect(pg.x, pg.y, pg.w, pg.h, 10);
    ctx.fillStyle = sel ? col + '38' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeStyle = sel ? col : 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (mon) {
      const img = getSprite(mon.ids[0]);
      const sp = Math.min(38, pg.h * 0.7);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, pg.x + 4, pg.y + pg.h / 2 - sp / 2, sp, sp);
      else drawGlyph(ctx, st.key, pg.x + 6 + sp / 2, pg.y + pg.h / 2, 8, col);
      const tx = pg.x + sp + 4 + (pg.w - sp - 8) / 2;
      ctx.font = `900 ${Math.min(11, pg.w / 11)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel ? '#fff' : '#cfd8dc';
      ctx.fillText(st.label, tx, pg.y + pg.h / 2 - 9, pg.w - sp - 10);
      ctx.font = `900 ${Math.min(9.5, pg.w / 13)}px Orbitron, sans-serif`;
      ctx.fillStyle = col;
      ctx.fillText(mon.ability, tx, pg.y + pg.h / 2 + 9, pg.w - sp - 10);
    } else {
      ctx.font = `900 ${Math.min(12, pg.w / 8.2)}px Orbitron, sans-serif`;
      ctx.fillStyle = sel ? '#fff' : '#cfd8dc';
      ctx.fillText(st.label, pg.x + pg.w / 2, pg.y + pg.h / 2 - 8);
      ctx.font = '500 8px Orbitron, sans-serif';
      ctx.fillStyle = '#78909c';
      ctx.fillText('NO PARTNER', pg.x + pg.w / 2, pg.y + pg.h / 2 + 10);
    }
    ctx.restore();
  }
  // what the SELECTED partner actually does — full-size, readable
  {
    const selMon = STARTER_MON[SETTINGS.starter];
    const selCol = selMon ? TYPE_COLORS[SETTINGS.starter] : '#90a4ae';
    const narrowM = W < 560;
    if (selMon) {
      fitText(selMon.ability + ' — ' + selMon.tiers[0], L.starterInfoY, 13 * Math.max(0.85, L.s), '700', selCol, maxW);
      fitText(narrowM ? 'EVOLVES AT REGIONS 4 & 7 — ABILITY GROWS'
        : 'YOUR PARTNER RIDES THE PADDLE · EVOLVES AT REGIONS 4 & 7 — THE ABILITY GROWS EACH TIME',
        L.starterInfoY + 19, 10.5 * Math.max(0.85, L.s), '500', '#90a4ae', maxW);
    } else {
      fitText(narrowM ? 'NO PARTNER — PLAIN PADDLE' : 'NO PARTNER — A PLAIN PADDLE AND NO SERVE ELEMENT',
        L.starterInfoY, 13 * Math.max(0.85, L.s), '700', '#90a4ae', maxW);
      fitText(narrowM ? 'POWER-UPS STILL CHANGE BALL TYPE' : 'POWER-UPS AND ELEMENT ORBS STILL CHANGE YOUR BALL TYPE MID-RUN',
        L.starterInfoY + 19, 10.5 * Math.max(0.85, L.s), '500', '#78909c', maxW);
    }
  }
  // difficulty presets
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = '#90a4ae';
  ctx.fillText('DIFFICULTY', W / 2, L.chipsLabelY);
  const keys = Object.keys(PRESETS);
  for (let i = 0; i < keys.length; i++) {
    const pg = presetGeom(i), sel = SETTINGS.preset === keys[i];
    const hov = inRect(mouseX, lastMouseY, pg);
    ctx.save();
    if (sel) { ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 14; }
    roundRect(pg.x, pg.y, pg.w, pg.h, 10);
    ctx.fillStyle = sel ? 'rgba(255,213,79,0.22)' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeStyle = sel ? '#ffd54f' : 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `900 ${Math.min(13, pg.w / 8.2)}px Orbitron, sans-serif`;
    ctx.fillStyle = sel ? '#ffd54f' : '#cfd8dc';
    ctx.fillText(PRESETS[keys[i]].label, pg.x + pg.w / 2, pg.y + pg.h / 2 + 1);
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
  ctx.font = '900 20px Orbitron, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a1205';
  ctx.fillText('START JOURNEY', b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
  // pokédex + advanced settings links
  const db = dexBtnGeom();
  ctx.font = '700 14px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = inRect(mouseX, lastMouseY, db) ? '#ffd54f' : '#90a4ae';
  ctx.fillText('◓  POKÉDEX: ' + DEX.size + ' CAUGHT — VIEW', W / 2, db.y + db.h / 2);
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = inRect(mouseX, lastMouseY, L.trial) ? '#ffd54f' : '#80d8ff';
  ctx.fillText('▶  TRIAL MODE — JUMP TO ANY REGION', W / 2, L.trial.y + L.trial.h / 2);
  ctx.font = '700 12px Orbitron, sans-serif';
  ctx.fillStyle = inRect(mouseX, lastMouseY, L.adv) ? '#ffd54f' : '#78909c';
  ctx.fillText('⚙  ADVANCED SETTINGS', W / 2, L.adv.y + L.adv.h / 2);
  if (advOpen) drawAdvanced();
  if (trialOpen) drawTrial();
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
  let y = 118 - dexScroll;
  const headerH = 54;
  for (const g of GENS) {
    const roster = regionRoster(g);
    const caught = roster.filter(id => DEX.has(id)).length;
    const rows = Math.ceil(roster.length / cols);
    const sectionH = headerH + rows * cellH + 16;
    if (y + sectionH > 100 && y < H) { // only draw visible sections
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
        if (cy + cellH / 2 < 100 || cy - cellH / 2 > H) return;
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
  const maxScroll = Math.max(0, (y + dexScroll) - 118 - (H - 160));
  dexScroll = Math.min(dexScroll, maxScroll);
  // ---- fixed header on top ----
  const hg = ctx.createLinearGradient(0, 0, 0, 108);
  hg.addColorStop(0, 'rgba(5,8,25,0.97)'); hg.addColorStop(0.8, 'rgba(5,8,25,0.9)'); hg.addColorStop(1, 'rgba(5,8,25,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 108);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title('POKÉDEX', 44, Math.min(34, W / 12), '#ef5350');
  ctx.font = '700 12px Orbitron, sans-serif';
  ctx.fillStyle = '#b0bec5';
  const total = GENS.reduce((n, g) => n + regionRoster(g).length, 0);
  ctx.fillText(DEX.size + ' / ' + total + ' CAUGHT' + (DEXS.size ? '  ·  ' + DEXS.size + ' SHINY' : '') + '  ·  ' + (IS_TOUCH ? 'DRAG' : 'SCROLL') + ' TO BROWSE', W / 2, 82);
  // back button
  const cb = dexCloseGeom();
  roundRect(cb.x, cb.y, cb.w, cb.h, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '700 13px Orbitron, sans-serif';
  ctx.fillStyle = '#cfd8dc';
  ctx.fillText('◀ BACK', cb.x + cb.w / 2, cb.y + cb.h / 2 + 1);
}

function drawOverlays() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (G.state === 'menu') { drawMenu(); }
  else if (G.state === 'dex') { drawDex(); }
  else if (G.state === 'serve' && !paused) {
    pulse(IS_TOUCH ? 'TAP TO LAUNCH' : 'CLICK TO LAUNCH', H * 0.7);
    // interactive first-wave tutorial: contextual hints
    if (G.level === 1) {
      hintPill(IS_TOUCH ? 'DRAG ANYWHERE — MOVE PADDLE · SLIDE WHILE LAUNCHING TO AIM'
        : 'MOVE THE MOUSE — PADDLE FOLLOWS · SLIDE WHILE LAUNCHING TO AIM', H * 0.7 + 46);
      hintPill('GET THE BALL ABOVE THE ARMORED WALL — A GOLDEN NET KEEPS IT RALLYING UP THERE', H * 0.7 + 82, '#ffd54f');
    }
  } else if (G.state === 'upgrade') {
    dim(0.55);
    const wasBossStage = G.clearedStage === 2;
    const clearedGen = GENS[regionIdx(Math.max(1, G.level - 1))];
    title(wasBossStage ? clearedGen.name + ' CLEARED!' : 'STAGE CLEAR!', H * 0.16, Math.min(40, W / 12), wasBossStage ? clearedGen.accent : '#66bb6a');
    ctx.font = '700 15px Orbitron, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('+' + (300 + (G.clearedStage || 0) * 250) + ' BONUS', W / 2, H * 0.16 + 34);
    if (stageIdx(G.level) === 0) {
      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.fillStyle = genFor(G.level).accent;
      ctx.fillText('NEXT STOP: ' + genFor(G.level).name, W / 2, H * 0.16 + 62);
    }
    if (G.upgradeChoices && G.stateT > 0.8) {
      const a = Math.min(1, (G.stateT - 0.8) / 0.4);
      ctx.globalAlpha = a;
      ctx.font = '700 14px Orbitron, sans-serif';
      ctx.fillStyle = '#e3f2fd';
      const L = upgradeLayout();
      ctx.fillText('ADVANCE A PATH', W / 2, L.card(0).y - 26);
      // ---- the whole tree, so you can see where each path is heading ----
      if (!L.stacked) {
        const tw2 = Math.min(760, W * 0.86), colW = tw2 / 4;
        const ty = L.card(0).y - 96;
        for (let pi = 0; pi < PATH_KEYS.length; pi++) {
          const pk = PATH_KEYS[pi], P = PATHS[pk], lvl = pathLvl(pk);
          const cx3 = W / 2 - tw2 / 2 + colW * pi + colW / 2;
          ctx.font = '900 11px Orbitron, sans-serif';
          ctx.fillStyle = P.color;
          ctx.fillText(P.name, cx3, ty);
          for (let d = 0; d < 4; d++) { // tier pips
            ctx.beginPath(); ctx.arc(cx3 - 21 + d * 14, ty + 15, 4, 0, Math.PI * 2);
            ctx.fillStyle = d < lvl ? P.color : 'rgba(255,255,255,0.16)';
            ctx.fill();
          }
          ctx.font = '500 8.5px Orbitron, sans-serif';
          ctx.fillStyle = lvl >= 4 ? P.color : '#78909c';
          ctx.fillText((lvl >= 4 ? '★ ' : '→ ') + P.tiers[3].name, cx3, ty + 32, colW - 10);
        }
      }
      for (let i = 0; i < G.upgradeChoices.length; i++) {
        const c = G.upgradeChoices[i], r = L.card(i);
        const col = c.path.color, tier = c.tier;
        const isCap = c.tierIdx === 3;
        const hov = inRect(mouseX, lastMouseY, r);
        ctx.save();
        if (hov || isCap) { ctx.shadowColor = col; ctx.shadowBlur = isCap ? 26 : 22; }
        roundRect(r.x, r.y, r.w, r.h, 14);
        ctx.fillStyle = hov ? 'rgba(20,28,58,0.97)' : 'rgba(10,15,36,0.93)';
        ctx.fill();
        ctx.lineWidth = hov || isCap ? 2.5 : 1.5;
        ctx.strokeStyle = hov || isCap ? col : col + '77';
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
          drawGlyph(ctx, tier.icon, r.x + 34, r.y + r.h / 2, 17, col);
          ctx.textAlign = 'left';
          ctx.font = '900 9px Orbitron, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(c.path.name + ' PATH · TIER ' + (c.tierIdx + 1) + '/4' + (isCap ? ' — CAPSTONE!' : ''), r.x + 64, r.y + 15);
          ctx.font = '900 14px Orbitron, sans-serif';
          ctx.fillStyle = '#fff';
          ctx.fillText(tier.name, r.x + 64, r.y + 33);
          ctx.font = '500 9.5px Orbitron, sans-serif';
          ctx.fillStyle = '#b0bec5';
          wrapText(tier.desc, r.w - 80).forEach((l, li) => ctx.fillText(l, r.x + 64, r.y + 50 + li * 12));
        } else { // desktop: tall card
          ctx.textAlign = 'center';
          ctx.font = '900 10px Orbitron, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(c.path.name + ' PATH', r.x + r.w / 2, r.y + 20);
          pips(r.x + r.w / 2, r.y + 36);
          drawGlyph(ctx, tier.icon, r.x + r.w / 2, r.y + 72, 24, col);
          ctx.font = '900 15px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#fff';
          ctx.fillText((isCap ? '★ ' : '') + tier.name + (isCap ? ' ★' : ''), r.x + r.w / 2, r.y + 112, r.w - 20);
          ctx.font = '500 11px Orbitron, sans-serif';
          ctx.fillStyle = '#b0bec5';
          wrapText(tier.desc, r.w - 28).forEach((l, li) => ctx.fillText(l, r.x + r.w / 2, r.y + 136 + li * 16));
          ctx.font = '700 9.5px Orbitron, sans-serif';
          ctx.fillStyle = isCap ? col : '#546e7a';
          ctx.fillText(isCap ? 'THE PATH COMPLETES HERE' : '→ LEADS TO: ' + c.path.tiers[3].name, r.x + r.w / 2, r.y + r.h - 38, r.w - 16);
          ctx.fillStyle = '#546e7a';
          ctx.font = '700 11px Orbitron, sans-serif';
          ctx.fillText(IS_TOUCH ? 'TAP TO PICK' : 'CLICK OR PRESS ' + (i + 1), r.x + r.w / 2, r.y + r.h - 16);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
    }
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
    pulse(IS_TOUCH ? 'TAP FOR TITLE SCREEN' : 'CLICK FOR TITLE SCREEN', H * 0.7);
  }
  if (paused) {
    dim(0.5);
    title('PAUSED', H * 0.38, 44, '#e3f2fd');
    ctx.font = '500 13px Orbitron, sans-serif';
    ctx.fillStyle = '#90a4ae';
    (IS_TOUCH
      ? ['DRAG — MOVE PADDLE', 'FIRE BUTTON — LAUNCH · SHOOT BLASTER', 'MEGA BUTTON — EVOLVE WHEN THE RING IS FULL', 'RETURNS ON YOUR PADDLE VENT BLASTER HEAT']
      : ['MOUSE — MOVE PADDLE', 'CLICK / SPACE — LAUNCH · FIRE BLASTER', 'E — MEGA EVOLVE WHEN METER IS FULL', 'PADDLE RETURNS VENT BLASTER HEAT', 'M — MUSIC · P / ESC — PAUSE · Q — QUIT']
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
  }
  if (G.flashT > 0) {
    ctx.fillStyle = `rgba(255,60,60,${G.flashT * (SETTINGS.reduceFlash ? 0.18 : 0.6)})`;
    ctx.fillRect(0, 0, W, H);
  }
}
function dim(a) { ctx.fillStyle = `rgba(3,5,16,${a})`; ctx.fillRect(0, 0, W, H); }
function title(text, y, size, color) {
  ctx.font = `900 ${size}px Orbitron, sans-serif`;
  ctx.shadowColor = color; ctx.shadowBlur = 24;
  ctx.fillStyle = color;
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
  ctx.drawImage(vignette, 0, 0, W, H);
  if (G.state !== 'menu' && G.state !== 'dex' && G.state !== 'upgrade') drawHUD();
  drawOverlays();
  if (G.state === 'menu' || G.state === 'dex') drawAnnounce(); // konami toast etc.
  drawCursor();
}
