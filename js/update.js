'use strict';
// ============================================================
//  UPDATE
// ============================================================
function paddleW() {
  return G.paddle.w * (1 + 0.18 * upgN('wide')) * (G.fx_wide ? (1 + 0.35 * G.fx_wide.tier) : 1);
}
function timeScale() {
  return (G.fx_slow ? 0.5 : 1) * SETTINGS.speed * (G.dramaticT > 0 ? 0.3 : 1);
}
// Dialga's Roar of Time slows only the balls, not the player
function ballTimeScale() { return G.timeWarpT > 0 ? 0.55 : 1; }
function scoreMult() {
  // RALLY MASTER's shooter translation: no ball rallies there, so the kill
  // combo carries its +50% score identity instead
  const comboAmp = (G.mode !== 'classic' && upgN('rally')) ? 1.5 : 1;
  return (G.fx_score ? 2 * G.fx_score.tier : 1)
    * (1 + Math.min(G.combo, 20) * 0.1 * comboAmp)
    * (G.modifier?.key === 'bounty' ? 2 : 1)
    * (1 + G.catchBonus)
    * (1 + 0.06 * ((G.stacks && G.stacks.bell) || 0)); // SOOTHE BELL stacks
}

function tickEffects(dt) {
  for (const k of ['fx_fire', 'fx_laser', 'fx_wide', 'fx_slow', 'fx_magnet', 'fx_score', 'fx_draco']) {
    if (G[k]) { G[k].t -= dt; if (G[k].t <= 0) G[k] = null; }
  }
  if (G.megaT > 0) G.megaT = Math.max(0, G.megaT - dt);
  if (G.ballElement) {
    G.ballElementT -= dt;
    if (G.ballElementT <= 0) {
      G.ballElement = null;
      // SPACE JUNKIE: a temporary type change reverts to the pilot's base type
      if (G.mode === 'junkie' && G.state === 'play') {
        addFloater(G.paddle.x, shipY() - 52, 'BACK TO ' + pilotInfo().t.toUpperCase() + ' TYPE', TYPE_COLORS[pilotInfo().t], 12);
        tone(340, 0.14, 'sine', 0.04, -80);
      }
    }
  }
  // blaster heat cools slowly on its own, faster once fully overheated
  if (G.overheat > 0) {
    G.overheat -= dt;
    if (G.overheat <= 0) { G.overheat = 0; G.heat = 0.3; }
  } else {
    // cools fast — brief pauses recover (junkie cools faster still)
    G.heat = Math.max(0, G.heat - dt * (G.mode === 'junkie' ? 0.36 : 0.26));
  }
  G.gustT = Math.max(0, G.gustT - dt);
  G.timeWarpT = Math.max(0, G.timeWarpT - dt);
}

// ball-only power-ups make no sense in the no-ball shooter modes — swap them
// for shooter-useful equivalents at drop time
function modePower(p) {
  if (G.mode === 'classic' || !p || !p.key) return p;
  const swap = { multi: 'draco', magnet: 'shield', warp: 'star' };
  return swap[p.key] ? POWERS[swap[p.key]] : p;
}

function damageBrick(br, dmg, sx, sy, element) {
  // ditto was disguised all along — first hit reveals it instead of damaging
  if (br.isDitto && !br.revealed) {
    br.revealed = true;
    br.poke = { id: 132, t: 'normal' };
    br.hp = br.maxHp = 1;
    br.flash = 1;
    addFloater(br.bx + G.fx, br.by + G.fy - br.h / 2 - 8, "IT'S DITTO!", '#c79bff', 15);
    tone(300, 0.2, 'sine', 0.06, 200);
    getSprite(132);
    return;
  }
  // Late-run mastery remains useful in every mode (ball, bolts, missiles,
  // explosions) without recreating the old giant weapon-capstone spike.
  if (dmg < 90 && G.stacks && G.stacks.orb) dmg *= 1 + 0.06 * G.stacks.orb;
  // type effectiveness: super effective ×2, resisted ×¼
  if (element && dmg < 90) {
    if ((EFFECTIVE[element] || []).includes(br.poke.t)) {
      dmg *= 2;
      if (element === G.ballElement) G.resistStreak = 0;
      if (G.seCD <= 0) {
        addFloater(sx, sy - 20, 'SUPER EFFECTIVE!', '#ffd54f', 13);
        SFX.superFx();
        G.seCD = 0.45;
      }
    } else if ((RESIST[element] || []).includes(br.poke.t)) {
      // resisted hits barely scratch — gentler on Easy, brutal beyond
      dmg *= SETTINGS.preset === 'easy' ? 0.5 : 0.25;
      if (G.seCD <= 0) {
        addFloater(sx, sy - 20, 'NOT VERY EFFECTIVE...', '#90a4ae', 11);
        tone(180, 0.1, 'sine', 0.04, -60);
        G.seCD = 0.45;
      }
      // a badly-matched element eventually wears off — punishing, never a soft-lock
      if (element === G.ballElement && ++G.resistStreak >= 4) {
        G.ballElement = null; G.resistStreak = 0;
        addFloater(sx, sy - 38, 'ELEMENT WORE OFF', '#cfd8dc', 12);
      }
    } else if (element === G.ballElement) G.resistStreak = 0;
  }
  br.hp -= dmg;
  br.flash = 1;
  const col = TYPE_COLORS[br.poke.t];
  if (br.isBoss && br.hp > 0) {
    SFX.bossHit();
    G.mega = Math.min(1, G.mega + 0.004);
    // ---- THREE boss phases at ⅔ and ⅓ HP. Each transition is an event:
    // hit-stop, a dodgeable radial shockwave of shots, and at the LAST
    // STAND the legendary calls in a ring of bare minions.
    const newPhase = br.hp > br.maxHp * 2 / 3 ? 1 : br.hp > br.maxHp / 3 ? 2 : 3;
    if (newPhase > br.phase) {
      br.phase = newPhase;
      SFX.enrage();
      G.shake = 14; G.flashT = 0.18;
      G.freeze = Math.max(G.freeze, 0.18);
      const bx3 = br.bx + G.fx, by3 = br.by + G.fy;
      burst(bx3, by3, newPhase === 3 ? '#ff5252' : '#ff8a65', 40, 420, 0.9);
      ringFx(bx3, by3, newPhase === 3 ? '#ff1744' : '#ff8a65', 10, 160, 4, 0.55);
      // shockwave ring — slow enough to weave through
      const nRing = newPhase === 3 ? 12 : 8;
      const spR = (170 + diff().lv * 10) * diff().shotSpeed;
      for (let i = 0; i < nRing; i++) {
        const a = (i / nRing) * Math.PI * 2 + (newPhase === 3 ? 0.26 : 0);
        G.enemyShots.push({ x: bx3, y: by3, vx: Math.cos(a) * spR, vy: Math.sin(a) * spR, boss: true });
      }
      if (newPhase === 3 && !br.addsCalled) {
        br.addsCalled = true; // the last stand summons a guard ring
        const gen2 = genFor(G.level);
        const pool4 = gen2.tiers[1];
        const nAdd = 5;
        for (let i = 0; i < nAdd; i++) {
          const [id2, t2] = pool4[Math.floor(Math.random() * pool4.length)];
          G.bricks.push({
            bx: bx3, by: by3, hx: bx3 - G.fx, hy: by3 - G.fy, row: 0, col: i,
            w: Math.min(48, Math.max(34, G.brickW * 0.5)), h: Math.min(42, Math.max(30, G.brickH * 0.7)),
            hp: 2, maxHp: 2, poke: { id: id2, t: t2 },
            flash: 0, wobble: Math.random() * Math.PI * 2,
            flight: {
              kind: 'ring', state: 2, launch: 0, sq: null,
              cx: bx3, cy: Math.min(by3 + 60, H * 0.42), rx: Math.min(150, W * 0.16), ry: 90,
              spd: 1.4, phase: i / nAdd, dir: 1, strand: i % 2,
            },
          });
        }
      }
      setAnnounce('alert', newPhase === 3 ? '#ff1744' : '#ff5252',
        br.poke.n.toUpperCase() + (newPhase === 3 ? ' — LAST STAND!' : ' IS ENRAGED!'),
        newPhase === 3 ? 'RELENTLESS FIRE · GUARDS INBOUND — FINISH IT' : 'FASTER, SPREADING ATTACKS', 2.4);
    }
  }
  if (br.hp <= 0) {
    br.dead = true;
    G.combo++;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    // tuned so Mega comes online roughly once per region (3 waves)
    // RALLY MASTER's shooter translation: kills are the only tempo there, so
    // they charge much harder (×2.5 total) — mega lands roughly every 2 waves
    const rallyKill = upgN('rally') ? (br.isBoss ? 0.04 : (G.mode !== 'classic' ? 0.012 : 0.004)) : 0;
    if (G.megaT <= 0) G.mega = Math.min(1, G.mega + (br.isBoss ? 0.12 : 0.008) + rallyKill);
    if (br.poke.id === 25) { tone(990, 0.08, 'square', 0.06); setTimeout(() => tone(1320, 0.12, 'square', 0.05), 70); } // pika!
    if (br.poke.id === -1) { // MISSINGNO. — the item duplication glitch lives on
      setAnnounce('▒', '#b0bec5', 'MISSINGNO.', 'ITEM DUPLICATION! ×3 POWER-UPS', 2.2);
      G.score += 999;
      const ks = Object.keys(POWERS);
      for (let i = 0; i < 3; i++) {
        const p = modePower(POWERS[ks[Math.floor(Math.random() * ks.length)]]);
        G.powerups.push({ x: br.bx + G.fx + (i - 1) * 44, y: br.by + G.fy, vy: 130, p, rot: 0 });
      }
      noiseBurst(0.3, 0.1);
    }
    if (br.shiny) { // shiny: jackpot + guaranteed catch
      G.score += 500;
      setAnnounce('fairy', '#ffd700', 'SHINY POKÉMON!', '+500 · GUARANTEED POKÉBALL DROP', 2.2);
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy - 36, vy: 115, p: { key: 'pokeball' }, dexId: br.poke.id, shiny: true, rot: 0 });
      burst(br.bx + G.fx, br.by + G.fy, '#ffd700', 30, 320, 0.9);
      sparkle(br.bx + G.fx, br.by + G.fy, 10, true);
      SFX.gotcha();
    }
    const base = br.isBoss ? 1000 : br.maxHp * 25;
    const pts = Math.round(base * scoreMult());
    G.score += pts;
    // only surface the noteworthy numbers — constant +NN spam reads as noise
    if (br.isBoss || pts >= 150) addFloater(br.bx + G.fx, br.by + G.fy, '+' + pts, '#fff', br.isBoss ? 26 : 15);
    if (!br.isBoss && G.combo > 2 && G.combo % 5 === 0) addFloater(br.bx + G.fx, br.by + G.fy - 26, 'COMBO x' + G.combo, '#ffd54f', 18);
    burst(sx, sy, col, br.isBoss ? 70 : 22, br.isBoss ? 420 : 300, br.isBoss ? 1.1 : 0.7);
    // a twinkle of glints tops off every kill — more (and gold) for elites/bosses
    sparkle(sx, sy, br.isBoss ? 16 : br.maxHp >= 3 ? 6 : 3, br.isBoss || br.maxHp >= 3);
    // bosses are BARE legendaries now — they faint grandly, never card-shatter
    shatterBrick(br, br.bx + G.fx, br.by + G.fy, bareMon(br) || br.isBoss);
    // shockwave pop on every kill — bigger for elites, arena-wide for a boss
    ringFx(br.bx + G.fx, br.by + G.fy, col, 6,
      br.isBoss ? Math.min(W * 0.3, 240) : br.maxHp >= 3 ? 64 : 36,
      br.isBoss ? 5 : 3, br.isBoss ? 0.7 : 0.38);
    if (br.isBoss) ringFx(br.bx + G.fx, br.by + G.fy, '#ffffff', 6, 130, 3, 0.5);
    G.comboPop = 1;
    G.shake = Math.min(G.shake + (br.isBoss ? 14 : 4), 16);
    G.freeze = Math.max(G.freeze, br.isBoss ? 0.14 : 0.025); // hit-stop
    if (br.isBoss) { SFX.bossDown(); addFloater(W / 2, H * 0.3, br.poke.n.toUpperCase() + ' DEFEATED!', col, 30); }
    else SFX.brick();
    // every region's arrival wave seeds a Sky Warp on the first kill —
    // an early invitation up to the high ground
    if (!G.waveFirstKill) {
      G.waveFirstKill = true;
      // Sky Warp is a ball mechanic — only seed it in classic mode
      if (stageIdx(G.level) === 0 && !br.isBoss && G.mode === 'classic') {
        G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 95, p: POWERS.warp, rot: 0, hint: G.level === 1 });
      }
    }
    // drops: power-up tied to type, or a catchable pokéball
    const d = diff();
    if (br.isBoss) {
      const p = modePower(POWERS[POWER_BY_TYPE[br.poke.t] || 'star']);
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 130, p, srcType: br.poke.t, rot: 0 });
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy - 40, vy: 110, p: { key: 'pokeball' }, dexId: br.poke.id, rot: 0 });
    } else if (br.poke.id > 0 && Math.random() < d.dropChance) {
      const p = modePower(POWERS[POWER_BY_TYPE[br.poke.t] || 'star']);
      const pu = { x: br.bx + G.fx, y: br.by + G.fy, vy: 130, p, srcType: br.poke.t, rot: 0 };
      if (G.level === 1 && G.dropHint < 2) { pu.hint = true; G.dropHint++; } // first drops get a CATCH! tag
      G.powerups.push(pu);
    } else if (br.poke.id > 0 && Math.random() < d.catchChance && !DEX.has(br.poke.id)) {
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 120, p: { key: 'pokeball' }, dexId: br.poke.id, rot: 0 });
    }
    // last brick → dramatic slow-mo
    if (!G.bricks.some(b => !b.dead)) G.dramaticT = 0.9;
  } else {
    burst(sx, sy, col, 8, 180, 0.4);
    SFX.hit(G.combo);
  }
}

function fireballExplosion(x, y, tier) {
  const radius = (70 + tier * 30) * (1 + 0.35 * upgN('blaze'));
  burst(x, y, '#ff7043', 30, 380, 0.8);
  burst(x, y, '#ffd54f', 16, 250, 0.6);
  G.shake = Math.min(G.shake + 6, 12);
  noiseBurst(0.25, 0.1);
  for (const br of G.bricks) {
    if (br.dead) continue;
    const bx = br.bx + G.fx, by = br.by + G.fy;
    if (Math.hypot(bx - x, by - y) < radius + br.w / 2) damageBrick(br, 1, bx, by, 'fire');
  }
}

// is this block out of its box and flying a pattern?
function flying(br) { return !!(br.flight && br.flight.state >= 1); }
// is this a BARE Pokémon (no box around it) — flyer, diver, or once-dived?
// bare mons faint when killed instead of shattering a card.
function bareMon(br) { return !br.isBoss && !!(br.bare || br.dive || (br.flight && br.flight.state >= 1)); }

// ---- the flight pattern library: a dozen closed curves the free-flying
// Pokémon cycle around, nose to tail (Space Junkie / Galaga canon) ----
function flightPos(F, tAbs) {
  const t = tAbs * (F.spd || 1) * (F.dir || 1); // streams ride faster curves
  const th = (F.phase + t) * Math.PI * 2;
  const c = Math.cos(th), s = Math.sin(th);
  switch (F.kind) {
    case 'inf': // horizontal figure-eight
      return { x: F.cx + s * F.rx, y: F.cy + s * c * F.ry * 1.9 };
    case 'falls': // vertical figure-eight
      return { x: F.cx + s * c * F.rx * 1.9, y: F.cy + s * F.ry * 0.9 };
    case 'liss': // 3:2 Lissajous pretzel
      return { x: F.cx + Math.sin(th * 3) * F.rx * 0.85, y: F.cy + Math.sin(th * 2) * F.ry * 0.9 };
    case 'rose': // four-petal flower
      return { x: F.cx + Math.cos(th * 2) * c * F.rx, y: F.cy + Math.cos(th * 2) * s * F.ry };
    case 'diamond': // diamond circuit
      return { x: F.cx + Math.sign(c) * c * c * F.rx, y: F.cy + Math.sign(s) * s * s * F.ry };
    case 'pulsar': { // breathing ring — swells and shrinks while turning
      const rr = 0.55 + 0.45 * Math.sin(tAbs * Math.PI * 4);
      return { x: F.cx + c * F.rx * rr, y: F.cy + s * F.ry * rr };
    }
    case 'helix': { // two-strand conveyor weave, wrapping across the field
      const u = ((F.phase + t) % 1 + 1) % 1;
      const x = F.cx - F.rx + u * F.rx * 2;
      return { x, y: F.cy + Math.sin(x * 0.02 + F.strand * Math.PI) * F.ry * 0.7 };
    }
    case 'swoop': { // wrapping dive-run: off one edge, back in the other,
      // plunging through a deep valley mid-crossing
      const u = ((F.phase + t) % 1 + 1) % 1;
      return { x: F.cx - F.rx + u * F.rx * 2, y: F.cy + Math.sin(u * Math.PI * 2) * F.ry };
    }
    case 'lane': // each rider bobs in its own vertical lane; the phase
      // offsets make a wave travel across the rank of lanes
      return { x: F.cx + (F.phase - 0.5) * F.rx * 2, y: F.cy + Math.sin(th) * F.ry };
    case 'pend': { // swinging pendulum chain
      const a = Math.sin(th) * 1.15;
      return { x: F.cx + Math.sin(a) * F.rx, y: F.cy - F.ry * 0.9 + Math.cos(a) * F.ry * 1.4 };
    }
    case 'epi': // loop-the-loop riding a great circle
      return {
        x: F.cx + c * F.rx + Math.cos(th * 5) * F.rx * 0.22,
        y: F.cy + s * F.ry + Math.sin(th * 5) * F.ry * 0.3,
      };
    case 'snake': { // serpentine sweep, wrapping like a conveyor
      const u = ((F.phase + t) % 1 + 1) % 1;
      const x = F.cx - F.rx + u * F.rx * 2;
      return { x, y: F.cy + (F.strand ? 30 : -30) + Math.sin(u * Math.PI * 6) * F.ry * 0.45 };
    }
    case 'square': { // a marching loop traced AROUND the static grid, corner
      // to corner — the "squares around bricks" pattern
      const u = ((F.phase + t) % 1 + 1) % 1;
      const hw = F.rx, hh = F.ry, perim = 4 * (hw + hh);
      let dd = u * perim;
      if (dd < 2 * hh) return { x: F.cx + hw, y: F.cy - hh + dd };       // right edge ↓
      dd -= 2 * hh;
      if (dd < 2 * hw) return { x: F.cx + hw - dd, y: F.cy + hh };       // bottom ←
      dd -= 2 * hw;
      if (dd < 2 * hh) return { x: F.cx - hw, y: F.cy + hh - dd };       // left edge ↑
      dd -= 2 * hh;
      return { x: F.cx - hw + dd, y: F.cy - hh };                        // top →
    }
    case 'star': { // five-point star circuit — dips toward the center between points
      const r01 = 0.55 + 0.45 * Math.cos(th * 5);
      return { x: F.cx + c * F.rx * r01, y: F.cy + s * F.ry * r01 };
    }
    case 'binary': { // twin counter-rotating rings, one per strand — a binary star
      const d2 = F.strand ? -1 : 1;
      return { x: F.cx + d2 * F.rx * 0.5 + Math.cos(th * d2) * F.rx * 0.45,
        y: F.cy + Math.sin(th * d2) * F.ry * 0.8 };
    }
    case 'atom': { // three crossed orbitals — riders split across tilted ellipses
      const band = Math.floor(((F.phase * 3) % 3 + 3) % 3);
      const A = band * Math.PI / 3;
      const ex = c * Math.min(F.rx, F.ry * 1.1), ey = s * F.ry * 0.35;
      return { x: F.cx + ex * Math.cos(A) - ey * Math.sin(A),
        y: F.cy + ex * Math.sin(A) + ey * Math.cos(A) };
    }
    case 'fountain': { // rise-and-fall columns — a pumping curtain of risers
      // and fallers, each rider sweeping its own lane top to bottom and back
      const u = ((F.phase + t) % 1 + 1) % 1;
      const tri = 1 - Math.abs(2 * u - 1) * 2;
      return { x: F.cx + (F.phase - 0.5) * F.rx * 1.7 + Math.sin(th * 0.5) * F.rx * 0.15,
        y: F.cy + tri * F.ry };
    }
    case 'zigzag': { // hard-cornered lightning path — sharp switchbacks, no curves
      const v = ((F.phase + t) % 1 + 1) % 1;
      const tri = f => 1 - Math.abs(2 * ((f % 1 + 1) % 1) - 1) * 2;
      return { x: F.cx + tri(v) * F.rx, y: F.cy + tri(v * 3 + 0.25) * F.ry * 0.85 };
    }
    case 'vortex': { // swirling galaxy — the ring breathes per-rider, smearing
      // the squad into rotating spiral arms
      const rr = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(th * 0.7 + tAbs * 1.5));
      return { x: F.cx + c * F.rx * rr, y: F.cy + s * F.ry * rr };
    }
    case 'weave': // threads left↔right across the open lane, bobbing as it goes
      return { x: F.cx + s * F.rx, y: F.cy + Math.sin(th * 3) * F.ry };
    default: // 'ring' / 'oval' / 'olympic': the smooth circle or ellipse
      return { x: F.cx + c * F.rx, y: F.cy + s * F.ry };
  }
}

// reward keeping the ball alive up top — the classic breakout thrill.
// rally = brick contacts since this ball last touched the paddle; it resets
// on a paddle return, so long rallies mean skilful top-of-screen play.
function awardRally(b, x, y) {
  b.rally = (b.rally || 0) + 1;
  G.bestRally = Math.max(G.bestRally, b.rally);
  if (b.rally < 3) return;
  const bonus = Math.round(b.rally * 15 * scoreMult() * (upgN('rally') ? 1.5 : 1));
  G.score += bonus;
  if (G.megaT <= 0) G.mega = Math.min(1, G.mega + 0.0035); // rallies feed Mega
  if (b.rally === 3 || b.rally % 3 === 0) {
    const hot = b.rally >= 9;
    addFloater(x, y - 22, 'RALLY ×' + b.rally + '  +' + bonus, hot ? '#ff7043' : '#ffd54f', 13 + Math.min(9, b.rally));
    tone(480 + Math.min(b.rally, 18) * 45, 0.08, 'square', 0.05);
    if (b.rally >= 6 && !SETTINGS.reduceShake) G.shake = Math.min(G.shake + 2, 8);
  }
  if (!G.rallyHintDone) { // teach the mechanic the first time it triggers
    G.rallyHintDone = true;
    setAnnounce('star', '#ffd54f', 'RALLY x3!', 'ESCALATING POINTS · EVERY RALLY HIT CHARGES YOUR MEGA METER', 3);
  }
}

// apply a falling pickup's payload — shared by paddle catches and blaster snags
function collectPickup(pu) {
  if (pu.p.key === 'element') {
    // pure element swap — no other effect, just fixes your matchup.
    // SPACE JUNKIE type changes are shorter-lived: they revert to the
    // pilot's base type on a visible timer
    G.ballElement = pu.p.t;
    G.ballElementT = G.mode === 'junkie' ? 20 : 30;
    G.resistStreak = 0;
    SFX.power();
    burst(pu.x, pu.y, TYPE_COLORS[pu.p.t], 16, 200);
    const strong = (EFFECTIVE[pu.p.t] || []).slice(0, 3).join(', ').toUpperCase();
    setAnnounce(pu.p.t, TYPE_COLORS[pu.p.t], pu.p.t.toUpperCase() + ' BALL',
      strong ? '2× vs ' + strong : 'ELEMENT CHANGED', 1.8);
  } else if (pu.p.key === 'pokeball') {
    // trial runs are a sandbox — catches don't touch the real Pokédex
    const isNew = !G.trial && addToDex(pu.dexId, pu.shiny);
    G.caughtRun++;
    SFX.gotcha();
    burst(pu.x, pu.y, pu.shiny ? '#ffd700' : '#ef5350', 18, 220);
    sparkle(pu.x, pu.y, pu.shiny ? 12 : 6, pu.shiny);
    if (upgN('bond')) {
      G.catchBonus += 0.06 * upgN('bond');
      addFloater(pu.x, pu.y - 26, 'BOND +' + Math.round(G.catchBonus * 100) + '% SCORE', '#ffd54f', 12);
    }
    const nm = (NAMES[pu.dexId] || 'POKÉMON').toUpperCase();
    setAnnounce(null, pu.shiny ? '#ffd700' : isNew ? '#66bb6a' : '#ef5350',
      (pu.shiny ? 'SHINY ' : '') + nm + ' CAUGHT!',
      G.trial ? 'TRIAL — CATCH NOT REGISTERED · +250 PTS'
        : isNew ? 'NEW! ADDED TO YOUR POKÉDEX · +100 PTS' : 'ALREADY IN YOUR POKÉDEX · +250 PTS',
      2.2, null, pu.dexId, pu.shiny);
    G.score += isNew ? 100 : 250;
  } else {
    applyPower(pu.p, pu.srcType);
    burst(pu.x, pu.y, pu.p.color, 16, 200);
  }
}

// signature legendary mechanics — each region's boss fights differently
function bossAbility(boss) {
  const id = boss.poke.id;
  const ab = BOSS_ABILITIES[id];
  if (!ab) return;
  const bx = boss.bx + G.fx, by = boss.by + G.fy;
  switch (id) {
    case 150: { // Mewtwo: teleport across the arena
      burst(bx, by, '#ec407a', 34, 340, 0.7);
      const lim = boss.w / 2 + 20;
      boss.hx = lim + Math.random() * (W - lim * 2) - G.fx;
      boss.bx = boss.hx;
      boss.flash = 1;
      burst(boss.bx + G.fx, by, '#ec407a', 34, 340, 0.7);
      tone(880, 0.18, 'sine', 0.06, -400);
      break;
    }
    case 249: // Lugia: gusting winds curve the ball
      G.gustT = 4;
      tone(180, 0.6, 'sawtooth', 0.06, 220);
      break;
    case 384: // Rayquaza: crosses the playfield
      boss.sweep = { dir: Math.random() < 0.5 ? -1 : 1, t: 2.6 };
      SFX.roar();
      break;
    case 483: // Dialga: Roar of Time slows every ball
      G.timeWarpT = 3.2;
      tone(70, 0.8, 'sawtooth', 0.1, -20);
      G.flashT = Math.max(G.flashT, 0.12);
      break;
    case 644: // Zekrom: lightning column at your position
      G.columnStrikes.push({ x: G.paddle.x, w: 52, warn: 1.0, strike: 0.32, color: '#80d8ff' });
      tone(1200, 0.3, 'square', 0.04, -800);
      break;
    case 717: // Yveltal: five-shot fan
      G.telegraphs.push({ br: boss, boss: true, fan: true, t: 0.6, max: 0.6 });
      break;
    case 792: // Lunala: phases out — attacks pass through her
      boss.phaseT = 2.6;
      tone(520, 0.5, 'sine', 0.05, 300);
      break;
    case 890: // Eternatus: wide warned beam under itself
      G.columnStrikes.push({ x: bx, w: Math.max(90, boss.w * 0.6), warn: 1.2, strike: 0.5, color: '#b388ff' });
      tone(90, 0.7, 'sawtooth', 0.08, 40);
      break;
    case 1007: // Koraidon: wild charge toward you
      boss.sweep = { dir: G.paddle.x > bx ? 1 : -1, t: 1.5, fast: true };
      SFX.enrage();
      break;
  }
  addFloater(boss.bx + G.fx, by - boss.h / 2 - 44, ab.name + '!', TYPE_COLORS[boss.poke.t], 16);
}

// Deal (or re-deal) the between-wave draft. While both groups remain, every
// hand contains at least one offense path and one non-offense path; the third
// slot stays wild. Empty slots become small forever-stacking mastery items so
// the last third of a long journey never has dead reward screens.
function rollUpgradeChoices() {
  const pool = PATH_KEYS.filter(k => pathLvl(k) < 4);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = [];
  const take = familyTest => {
    const idx = pool.findIndex(k => familyTest(PATHS[k].family));
    if (idx >= 0) picked.push(pool.splice(idx, 1)[0]);
  };
  take(f => f === 'offense');
  take(f => f !== 'offense');
  while (picked.length < 3 && pool.length) picked.push(pool.shift());
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  const choices = picked.map(k => ({ pathKey: k, path: PATHS[k], tier: PATHS[k].tiers[pathLvl(k)], tierIdx: pathLvl(k) }));
  if (choices.length < 3) {
    const si = STACK_ITEMS.slice();
    for (let i = si.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [si[i], si[j]] = [si[j], si[i]];
    }
    while (choices.length < 3 && si.length) choices.push({ stack: si.pop() });
  }
  G.upgradeChoices = choices.length ? choices : null;
}

// A shield charge absorbs one lethal hit on the player (enemy shot or column
// strike) — consumed at impact, with a moment of grace so a shot cluster can't
// strip the whole bank in one frame. Returns true if the hit was eaten.
// (Shields used to burn at the FLOOR line, below the player — every shot they
// "blocked" had already missed, so AEGIS did nothing in the shooter modes.)
function absorbHit(x, y) {
  if (G.shieldCharges <= 0) return false;
  G.shieldCharges--;
  G.invuln = 1.2;
  G.shieldFlash = 1; // render: the bubble flares where it ate the hit
  addFloater(G.paddle.x, y - 46, 'SHIELD!', '#66bb6a', 15);
  burst(x, y, '#66bb6a', 18, 240, 0.5);
  ringFx(G.paddle.x, y, '#a5d6a7', 6, 64, 3, 0.4);
  SFX.shield();
  return true;
}

function loseLife() {
  ringFx(G.paddle.x, shipY(), '#ff5252', 8, 90, 4, 0.5);
  G.lives--;
  G.combo = 0;
  G.deathsThisWave++;
  G.adapt = Math.max(0.78, G.adapt * 0.94); // quiet rubber-band: ease off
  G.ballElement = null;
  G.megaT = 0;
  SFX.lifeLost();
  G.shake = 16; G.flashT = 0.35;
  G.fx_fire = G.fx_laser = G.fx_draco = null;
  if (G.lives <= 0) {
    // WHITE OUT: the skill tree absorbs the defeat. Burn two tree levels,
    // refill lives, and retry this wave — the run only truly ends once
    // there's no tree left to burn.
    if (totalPathLevels() > 0) {
      const lost = [];
      for (let i = 0; i < 2 && totalPathLevels() > 0; i++) {
        const owned = PATH_KEYS.filter(k => pathLvl(k) > 0);
        const t = regressPath(owned[Math.floor(Math.random() * owned.length)]);
        if (t) lost.push(t.name);
      }
      G.lives = preset().lives;
      G.shieldCharges = Math.min(G.shieldCharges, shieldCap());
      SFX.gameOver();
      buildLevel(G.level);
      serve();
      setAnnounce('alert', '#ff8a65', 'WHITED OUT!',
        'THE TREE ABSORBED IT — LOST: ' + lost.join(' · '), 3.6, 'RETRYING THE WAVE WITH FULL LIVES');
      return;
    }
    G.state = 'gameover'; G.stateT = 0;
    SFX.gameOver();
    if (!G.trial) clearCheckpoint(); // a TRUE game over ends the saved journey
    if (!G.trial && G.score > G.best) { G.best = G.score; saveStore('pkbrk-best', G.best); }
  } else {
    serve();
  }
}

function nearestBrick(x, y) {
  let best = null, bd = Infinity;
  for (const br of G.bricks) {
    if (br.dead || br.entry) continue; // ignore ranks still flying in
    const bx = br.bx + G.fx;
    let d = Math.hypot(bx - x, br.by + G.fy - y);
    if (bx < -10 || bx > W + 10) d += 600; // off-screen flyers are poor targets
    if (d < bd) { bd = d; best = br; }
  }
  return best;
}

function update(dt) {
  G.time += dt;
  const ts = timeScale();
  const d = diff();
  G.shake = Math.max(0, G.shake - dt * 30);
  G.flashT = Math.max(0, G.flashT - dt);
  G.stateT += dt;
  G.seCD = Math.max(0, G.seCD - dt);
  G.dramaticT = Math.max(0, G.dramaticT - dt);
  G.bossIntro = Math.max(0, G.bossIntro - dt);
  G.paddle.squash = Math.max(0, G.paddle.squash - dt * 5);
  if (G.announce) { G.announce.t -= dt; if (G.announce.t <= 0) G.announce = null; }
  musicTick();

  const target = Math.max(paddleW() / 2 + 8, Math.min(W - paddleW() / 2 - 8, mouseX));
  G.paddle.speed = (target - G.paddle.x) / Math.max(dt, 0.001);
  G.paddle.x += (target - G.paddle.x) * Math.min(1, dt * 18);
  // SPACE JUNKIE: the ship also flies vertically — mouse/finger Y steers it
  // within a band above the old paddle line. On touch the ship rides ~85px
  // ABOVE the finger, so your own thumb never hides your Pokémon.
  if (G.mode === 'junkie') {
    const bot = PADDLE_Y() + 8, top = PADDLE_Y() - SHIP_BAND;
    const ty = Math.max(top, Math.min(bot, lastMouseY - (IS_TOUCH ? 85 : 0)));
    G.shipYv += (ty - G.shipYv) * Math.min(1, dt * 14);
  } else G.shipYv = PADDLE_Y();
  G.invuln = Math.max(0, G.invuln - dt);
  G.blasterCD = Math.max(0, G.blasterCD - dt);
  G.muzzle = Math.max(0, G.muzzle - dt);
  G.shieldFlash = Math.max(0, (G.shieldFlash || 0) - dt * 3); // shield-bubble flare after an absorb
  G.attackAnim = Math.max(0, G.attackAnim - dt * 4.5); // pilot lunge decays fast
  updateAmbient(dt, G.state === 'menu' || G.state === 'dex' ? 0 : regionIdx(G.level));

  for (const p of G.particles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= (1 - dt * 2); p.vy = p.vy * (1 - dt * 2) + 320 * dt;
  }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const f of G.floaters) { f.life -= dt; f.y -= 40 * dt; }
  G.floaters = G.floaters.filter(f => f.life > 0);
  for (const f of G.fragments) {
    f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
    f.vy += 900 * dt; f.rot += f.vr * dt;
  }
  G.fragments = G.fragments.filter(f => f.life > 0);
  for (const gh of G.ghosts) {
    gh.life -= dt; gh.s += dt * (gh.faint ? 26 : 60); gh.rot += gh.vr * dt;
    if (gh.faint) { gh.y += gh.vy * dt; gh.vy += 520 * dt; } // faint = arc up then fall
  }
  G.ghosts = G.ghosts.filter(g => g.life > 0);
  for (const r of G.rings) r.life -= dt;
  G.rings = G.rings.filter(r => r.life > 0);
  // brick HIT FLASH decays here (dt-scaled), NOT in render: it gates the
  // piercing Fireball/Mega i-frame (`br.flash <= 0.5` in the ball loop), so a
  // fixed per-render-frame decay coupled that DPS to the display's refresh
  // rate and desynced during hit-stop. 4.8/s ≈ the old 0.08/frame at 60fps.
  for (const br of G.bricks) if (br.flash > 0) br.flash = Math.max(0, br.flash - dt * 4.8);
  // HUD juice: the score COUNTS up instead of teleporting; combo pops on kills
  G.scoreShown += (G.score - G.scoreShown) * Math.min(1, dt * 9);
  if (Math.abs(G.score - G.scoreShown) < 1) G.scoreShown = G.score;
  G.comboPop = Math.max(0, G.comboPop - dt * 3.2);

  if (G.state === 'menu' || G.state === 'gameover' || G.state === 'dex') return;
  if (paused) return;
  if (G.state === 'upgrade') {
    // no draftable upgrades left → brief breather, then straight on
    if (!G.upgradeChoices && G.stateT > 2.2) { buildLevel(G.level); serve(); }
    return;
  }

  tickEffects(dt);
  if (G.state === 'play') G.playT += dt;
  // ---- shooter modes (BLASTER / SPACE JUNKIE): hold CHARGE to build a heavy
  // shot, release to fire. While charging, normal auto-fire pauses.
  G.chargeCD = Math.max(0, G.chargeCD - dt);
  let charging = false;
  if (G.mode !== 'classic' && G.state === 'play') {
    // a double-tap on FIRE whose second press is still held past the threshold
    // promotes into a charge — one thumb fires AND charges (input.js)
    if (chargePendingId !== null && performance.now() - chargePendingT >= CHARGE_HOLD_MS) {
      chargeHeld = true; chargeTouchId = chargePendingId; chargePendingId = null;
    }
    if (chargeHeld && G.overheat <= 0 && G.chargeCD <= 0) {
      charging = true;
      // COOLANT's shooter translation: a cooler barrel also charges faster
      G.charge = Math.min(1, G.charge + dt / (upgN('coolant') ? 0.8 : 1.1)); // ~1.1s to full (0.8 w/ Coolant)
    } else if (G.charge > 0) {
      fireCharge(G.charge);
      G.charge = 0; G.chargeCD = 0.25;
    }
  } else if (G.charge > 0) { G.charge = 0; }
  // held FIRE keeps shooting — the heat lockout is the only governor
  if (fireHeld && !charging && G.state === 'play') fireAction(true);
  // SUPER SHIELD capstone: a floor-shield charge regrows on a timer
  if (G.state === 'play' && upgN('aegisX')) {
    if (G.shieldCharges < shieldCap()) {
      G.shieldRegenT -= dt;
      if (G.shieldRegenT <= 0) {
        G.shieldRegenT = 10;
        G.shieldCharges++;
        SFX.shield();
        addFloater(G.paddle.x, shipY() - 30, 'SUPER SHIELD +1', '#66bb6a', 12);
      }
    } else G.shieldRegenT = 10;
  }

  // one-time callout the first time the mega meter fills
  if (G.mega >= 1 && G.megaT <= 0 && !G.megaCalloutDone && G.state === 'play') {
    G.megaCalloutDone = true;
    setAnnounce('mega', '#ffd54f', 'MEGA READY!', IS_TOUCH ? 'TAP THE GLOWING MEGA BUTTON TO UNLEASH' : 'PRESS E TO UNLEASH', 2.6);
  }
  // magikarp keeps it real
  G.splashCD -= dt;
  if (G.splashCD <= 0) {
    G.splashCD = 9 + Math.random() * 8;
    const karp = G.bricks.find(b => !b.dead && b.poke.id === 129);
    if (karp && G.state === 'play') {
      karp.flash = 0.5;
      addFloater(karp.bx + G.fx, karp.by + G.fy - karp.h / 2 - 6, 'SPLASH! ...NOTHING HAPPENED', '#90a4ae', 11);
    }
  }

  // ---- element orbs: a calm, reliable way to fix a bad type matchup ----
  // they drift down slowly and only change your ball's element. When most of
  // the field resists your current element, one arrives quickly; otherwise
  // they show up now and then with something useful.
  G.elementOrbCD -= dt;
  // SPACE JUNKIE is BUILT on type-switching, so orbs flow much more freely
  // there (and two can be falling at once); elsewhere they stay a rescue
  const jkOrbs = G.mode === 'junkie';
  const orbsFalling = G.powerups.reduce((n, p) => n + (p.p.key === 'element' ? 1 : 0), 0);
  if (G.elementOrbCD <= 0 && G.state === 'play' && orbsFalling < (jkOrbs ? 2 : 1)) {
    const alive = G.bricks.filter(b => !b.dead && b.poke.id > 0);
    if (alive.length >= 4) {
      // in junkie the CURRENT attack type is what matters — walled off means
      // most of the field resists what you're firing right now
      const curEl = jkOrbs ? attackElement() : G.ballElement;
      const resisted = curEl ? alive.filter(b => (RESIST[curEl] || []).includes(b.poke.t)).length : 0;
      const struggling = curEl && resisted >= alive.length * (jkOrbs ? 0.35 : 0.5);
      // orbs are a rescue mechanic, not a scheduled shower: quick when you're
      // genuinely walled off, otherwise scarce
      G.elementOrbCD = struggling ? (jkOrbs ? 4 : 8) : jkOrbs ? 10 + Math.random() * 8 : 34 + Math.random() * 20;
      if (struggling || Math.random() < (jkOrbs ? 0.7 : 0.22)) {
        // offer an element that's super effective against the dominant type
        const counts = {};
        for (const b of alive) counts[b.poke.t] = (counts[b.poke.t] || 0) + 1;
        const domType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const cands = Object.keys(EFFECTIVE).filter(el => EFFECTIVE[el].includes(domType) && el !== curEl);
        const el = cands.length ? cands[Math.floor(Math.random() * cands.length)] : 'normal';
        G.powerups.push({ x: 50 + Math.random() * (W - 100), y: -20, vy: 62, p: { key: 'element', t: el }, rot: Math.random() * 6, orb: true });
      }
    } else {
      G.elementOrbCD = 8;
    }
  }

  // ---- SPACE JUNKIE squad maneuvers: every so often one flock does
  // something unexpected — startle-SCATTERS (the knot swells then contracts),
  // SURGES (rides its pattern nearly double-speed), or, deeper in, dips into
  // a RAID toward the ship band — then knits itself back into formation.
  if (G.mode === 'junkie' && G.state === 'play') {
    const regionsIn3 = Math.floor((G.level - 1) / STAGES);
    if (G.maneuver) {
      G.maneuver.t += dt * ts;
      if (G.maneuver.t >= G.maneuver.dur) {
        if (G.maneuver.kind === 'surge') {
          for (const br of G.bricks) if (br.flight && br.flight.sq === G.maneuver.sq && br.flight.spd0) {
            br.flight.spd = br.flight.spd0; br.flight.spd0 = null;
          }
        }
        G.maneuver = null;
      }
    } else if (regionsIn3 >= 1) {
      G.maneuverCD -= dt * ts;
      if (G.maneuverCD <= 0) {
        G.maneuverCD = 9 + Math.random() * 8;
        const sqs = [...new Set(G.bricks.filter(b => !b.dead && b.flight && b.flight.state === 2 && b.flight.sq != null)
          .map(b => b.flight.sq))];
        if (sqs.length) {
          const sq = sqs[Math.floor(Math.random() * sqs.length)];
          const opts = ['scatter', 'surge'];
          if (regionsIn3 >= 2) opts.push('raid');
          const mv = { sq, kind: opts[Math.floor(Math.random() * opts.length)], t: 0 };
          if (mv.kind === 'raid') {
            // dip the whole flock toward the ship band — capped so it never
            // crowds the ship's airspace
            const m0 = G.bricks.find(b => !b.dead && b.flight && b.flight.sq === sq);
            const allowed = m0 ? (PADDLE_Y() - 160) - (m0.flight.cy + m0.flight.ry) : 0;
            mv.dy = Math.max(0, Math.min(130, allowed));
            if (mv.dy < 30) mv.kind = 'scatter'; // no room below — startle instead
          }
          mv.dur = mv.kind === 'raid' ? 4.2 : mv.kind === 'scatter' ? 2.6 : 3;
          if (mv.kind === 'surge') {
            for (const br of G.bricks) if (!br.dead && br.flight && br.flight.sq === sq) {
              br.flight.spd0 = br.flight.spd; br.flight.spd *= 1.8;
            }
            tone(620, 0.16, 'sawtooth', 0.04, 260);
          } else {
            tone(mv.kind === 'raid' ? 240 : 460, 0.18, 'triangle', 0.045, mv.kind === 'raid' ? -120 : 180);
          }
          G.maneuver = mv;
        }
      }
    }
  }
  // ---- formation drift ----
  // ---- Space Junkie entrances: ranks pour in from off-screen, swooping on a
  // curve into their formation slot. They animate even during the serve, and
  // they're fair game to shoot mid-flight.
  // ---- FLYERS: Pokémon that break out of their boxes and fly one of a
  // dozen patterns, each following the one ahead of it. Their moving slot
  // means divers rejoin the train wherever it's cycled to.
  if (G.state === 'play' || G.state === 'serve') {
    const tAbs = G.swayT * G.pathSpeed;
    for (const br of G.bricks) {
      if (br.dead || !br.flight) continue;
      const F = br.flight;
      if (F.state === 0) { // still boxed in the formation, waiting
        if (G.state === 'play' && G.swayT >= F.launch) {
          F.state = 1; F.t = 0;
          F.sx = br.bx + G.fx; F.sy = br.by + G.fy; // capture SCREEN pos at breakout
          shatterBox(br, br.bx + G.fx, br.by + G.fy); // the box VISIBLY shatters
          burst(br.bx + G.fx, br.by + G.fy, TYPE_COLORS[br.poke.t], 14, 200, 0.5);
          tone(560, 0.12, 'triangle', 0.04, 260);
        }
        continue;
      }
      // flightPos is absolute SCREEN space; strip the formation transform back
      // out so flyers ride their pattern in screen coords — immune to the
      // march's downward creep, so the breathing-room floor actually holds
      const pos = flightPos(F, tAbs);
      // squad maneuver post-transform: a startle-scatter swells the knot
      // around its own center; a raid eases the whole flock down and back
      const mv = G.maneuver;
      if (mv && F.sq === mv.sq) {
        const pr = Math.sin(Math.PI * Math.min(1, mv.t / mv.dur)); // 0→1→0
        if (mv.kind === 'scatter') {
          pos.x = F.cx + (pos.x - F.cx) * (1 + 0.8 * pr);
          pos.y = F.cy + (pos.y - F.cy) * (1 + 0.8 * pr);
        } else if (mv.kind === 'raid') pos.y += mv.dy * pr;
      }
      if (F.state === 1) { // breaking out: glide from the wall onto the pattern
        F.t += dt * ts;
        // negative t = a stream rider still holding off-screen for its turn
        const p = Math.max(0, Math.min(1, F.t / 1.1));
        const q = 1 - Math.pow(1 - p, 2);
        br.hx = (F.sx + (pos.x - F.sx) * q) - G.fx;
        br.hy = (F.sy + (pos.y - F.sy) * q) - G.fy;
        if (p >= 1) F.state = 2;
      } else {
        br.hx = pos.x - G.fx; br.hy = pos.y - G.fy;
      }
      if (!br.entry && !br.dive) { br.bx = br.hx; br.by = br.hy; }
    }
    // ---- SPACE JUNKIE crispness: flyers NEVER overlap. A proper little
    // constraint solver: several full-projection passes push any two
    // sprites out to a minimum spacing. When a pattern tries to converge
    // (vortex contracting, star pinching through its center), the squad
    // packs into a crisp, non-overlapping knot instead of a blob — tightly
    // knit, but every Pokémon stays distinct and trackable.
    if (G.mode === 'junkie') {
      const fl = [];
      for (const br of G.bricks) {
        if (!br.dead && br.flight && br.flight.state >= 1 && !br.dive && !br.entry) fl.push(br);
      }
      for (let it = 0; it < 4; it++) {
        let moved = false;
        for (let i = 0; i < fl.length; i++) {
          for (let j = i + 1; j < fl.length; j++) {
            const a = fl[i], b2 = fl[j];
            const minD = (Math.min(a.w, a.h) + Math.min(b2.w, b2.h)) * 0.58;
            let dx = b2.bx - a.bx, dy = b2.by - a.by;
            let d = Math.hypot(dx, dy);
            if (d < minD) {
              if (d < 0.01) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); d = 1; }
              const push = (minD - d) / 2;
              a.bx -= dx / d * push; a.by -= dy / d * push;
              b2.bx += dx / d * push; b2.by += dy / d * push;
              moved = true;
            }
          }
        }
        if (!moved) break;
      }
    }
  }
  if (G.state === 'play' || G.state === 'serve') {
    for (const br of G.bricks) {
      if (br.dead || !br.entry) continue;
      const e = br.entry;
      e.t -= dt * ts;
      if (e.t > 0) { br.bx = e.sx; br.by = e.sy; continue; }
      const p = Math.min(1, -e.t / e.dur);
      const q = 1 - Math.pow(1 - p, 2.2); // ease out into the slot
      const u = 1 - q;
      const cx2 = (e.sx + br.hx) / 2, cy2 = br.hy - 150; // swoop over the top
      br.bx = u * u * e.sx + 2 * u * q * cx2 + q * q * br.hx;
      br.by = u * u * e.sy + 2 * u * q * cy2 + q * q * br.hy;
      if (p >= 1) br.entry = null;
    }
  }
  if (G.state === 'play' && G.bossIntro <= 0) {
    G.swayT += dt * ts;
    const boss = G.bricks.find(b => b.isBoss && !b.dead);
    const mt = G.motionTier;
    const style = G.motionStyle;
    const alive = G.bricks.filter(b => !b.dead).length;
    const total = G.bricks.length;
    const thin = total > 0 ? 1 + (1 - alive / total) * 2.2 * preset().descent : 1;
    // ---- GALAXIAN MARCH — only on boss waves now. Everywhere else the boxed
    // bricks are a STATIC wall (G.blocksStatic) and the Pokémon carry all the
    // motion in their own patterns; the wall never marches or descends, so a
    // flyer's pattern can never drift into it.
    if (!G.blocksStatic) {
      let minX = Infinity, maxX = -Infinity;
      for (const br of G.bricks) {
        if (br.dead || br.isBoss || br.dive || br.entry || flying(br)) continue;
        minX = Math.min(minX, br.hx - br.w / 2);
        maxX = Math.max(maxX, br.hx + br.w / 2);
      }
      if (minX < Infinity) {
        const lo = 8 - minX, hi = W - 8 - maxX;
        // capped so late-game never turns into a blur
        const marchV = Math.min(105, (24 + d.descent * 4.5) * Math.min(thin, 2));
        G.fx += G.marchDir * marchV * ts * dt;
        // gentle steps: pressure builds over minutes, not seconds
        const stepDown = Math.min(G.brickH * 0.35, 6 + d.descent * 0.6);
        if (G.fx >= hi && G.marchDir > 0) { G.fx = hi; G.marchDir = -1; G.fy += stepDown; tone(70, 0.1, 'sine', 0.045); }
        else if (G.fx <= lo && G.marchDir < 0) { G.fx = lo; G.marchDir = 1; G.fy += stepDown; tone(70, 0.1, 'sine', 0.045); }
      }
      G.fy += d.descent * 0.07 * thin * ts * dt; // whisper of constant pressure
    }
    // ---- choreography rides ON TOP of the march. Boss guards instead
    // ripple in rings around their legendary, who patrols its arena.
    if (boss) {
      // the patrol widens and quickens with each phase — a cornered legendary
      const bp = boss.phase || 1;
      boss.bx = boss.hx + (mt >= 1 || bp >= 2
        ? Math.sin(G.swayT * (0.45 + bp * 0.22)) * Math.min(90 + bp * 26, W * (0.07 + bp * 0.02))
        : 0);
    }
    for (const br of G.bricks) {
      if (br.dead || br.isBoss || br.entry) continue;
      // GALAGA DIVE: peel off, swoop at the paddle, fire, loop back home
      if (br.dive) {
        const dv = br.dive;
        dv.t += dt * ts;
        const p = Math.min(1, dv.t / dv.dur);
        const lowY = PADDLE_Y() - 130 - G.fy;
        if (p < 0.5) {
          const q = p / 0.5, u = 1 - q;
          const cxp = br.hx + dv.dir * 160, cyp = br.hy + (lowY - br.hy) * 0.35;
          br.bx = u * u * br.hx + 2 * u * q * cxp + q * q * dv.tx;
          br.by = u * u * br.hy + 2 * u * q * cyp + q * q * lowY;
        } else {
          const q = (p - 0.5) / 0.5, u = 1 - q;
          const cxp = dv.tx - dv.dir * 180, cyp = br.hy + (lowY - br.hy) * 0.35;
          br.bx = u * u * dv.tx + 2 * u * q * cxp + q * q * br.hx;
          br.by = u * u * lowY + 2 * u * q * cyp + q * q * br.hy;
        }
        if (!dv.shot && p > 0.42) { // one aimed shot at the bottom of the swoop
          dv.shot = true;
          const sx2 = br.bx + G.fx, sy2 = br.by + G.fy + br.h / 2;
          const ang = Math.atan2(shipY() - sy2, G.paddle.x - sx2);
          const sp2 = (240 + d.lv * 14) * d.shotSpeed;
          G.enemyShots.push({ x: sx2, y: sy2, vx: Math.cos(ang) * sp2, vy: Math.sin(ang) * sp2 });
          SFX.enemyShot();
        }
        if (p >= 1) { br.dive = null; br.bx = br.hx; br.by = br.hy; }
        continue;
      }
      if (flying(br)) continue; // flyers are positioned by their pattern
      let ox = 0, oy = 0;
      if (G.blocksStatic) {
        // anchored wall: no sway at all (just the tiny render bob for life)
        br.bx = br.hx; br.by = br.hy;
        continue;
      }
      if (boss && mt >= 1) { // rings radiating from the boss (regions 3-9)
        const dist = Math.hypot(br.hx - boss.bx, br.hy - boss.hy);
        oy = Math.sin(G.swayT * 1.5 - dist * 0.02) * Math.min(11, br.h * 0.2);
        if (mt >= 2) ox = Math.sin(G.swayT * 0.8 + br.row * 0.9) * Math.min(14, br.w * 0.16);
      } else if (style === 'serpent') { // early-boss guards (mt 0) slide in rows
        ox = Math.sin(G.swayT * 0.9 + br.row * 0.85) * Math.min(38, G.brickW * 0.8);
      }
      // (the static-wall redesign made the old colwave/split/breathe/swirl/free
      //  sway styles unreachable — non-boss walls never sway, and mt>=1 bosses
      //  use the ring branch above — so they were removed. Only 'serpent' on a
      //  region-1/2 boss's guards still uses this path.)
      br.bx = br.hx + ox;
      br.by = br.hy + oy;
    }
    // Galaga peel-offs: from mid-journey on, enemies dive at you.
    // Deeper in the journey, several break formation AT ONCE.
    if (G.divers) {
      G.diveCD -= dt * ts;
      if (G.diveCD <= 0) {
        const regionsIn2 = Math.floor((G.level - 1) / STAGES);
        const maxDivers = 1 + Math.floor(regionsIn2 / 3);
        const diving = G.bricks.filter(b => !b.dead && b.dive).length;
        G.diveCD = Math.max(2.2, 7 - regionsIn2 * 0.5) * (0.7 + Math.random() * 0.5);
        if (diving < maxDivers) {
          const pool2 = G.bricks.filter(b => !b.dead && !b.isBoss && !b.armored && !b.entry && !b.dive);
          if (pool2.length) {
            const dvb = pool2[Math.floor(Math.random() * pool2.length)];
            if (!flying(dvb) && !dvb.bare) {
              // the peel-off SHATTERS its box — nothing dives as a full brick
              dvb.bare = true;
              shatterBox(dvb, dvb.bx + G.fx, dvb.by + G.fy);
              burst(dvb.bx + G.fx, dvb.by + G.fy, TYPE_COLORS[dvb.poke.t], 12, 190, 0.5);
            }
            dvb.dive = {
              t: 0, dur: 2.9, dir: Math.random() < 0.5 ? -1 : 1,
              tx: Math.max(60, Math.min(W - 60, G.paddle.x - G.fx + (Math.random() - 0.5) * 160)),
            };
            tone(320, 0.2, 'sawtooth', 0.045, 220); // peel-off screech
          }
        }
      }
    }
    let lowest = -Infinity;
    for (const br of G.bricks) if (!br.dead && !br.dive && !flying(br)) lowest = Math.max(lowest, br.by + G.fy + br.h / 2);
    if (lowest > DANGER_Y()) {
      G.fy -= G.brickH * 3.5;
      if (!G.dangerWarned) { // first crossing per wave is a free warning
        G.dangerWarned = true;
        addFloater(W / 2, H / 2, 'PUSHED THEM BACK!', '#ffd54f', 26);
        G.shake = 10; G.flashT = 0.15;
        SFX.enrage();
      } else {
        addFloater(W / 2, H / 2, 'THEY GOT TOO CLOSE!', '#ff5252', 26);
        loseLife();
        return;
      }
    }
  }

  // ---- balls ----
  const windy = G.modifier?.key === 'winds' || G.gustT > 0; // Lugia gusts reuse the wind physics
  const bts = ts * ballTimeScale();
  const aliveCnt = G.bricks.filter(x => !x.dead).length;
  // rally-zone geometry: arm by getting above the wall's top; the net itself
  // hangs UNDER the whole formation, so a ball inside is free to pinball off
  // any block tops in the gaps — the net only matters where no block is left
  let wallTop = Infinity, rallyFloor = -Infinity;
  for (const br of G.bricks) {
    if (br.dead) continue;
    if (br.armored) wallTop = Math.min(wallTop, br.by + G.fy - br.h / 2);
    if (!br.isBoss && !br.dive && !flying(br)) rallyFloor = Math.max(rallyFloor, br.by + G.fy + br.h / 2);
  }
  rallyFloor += 14; // strung a little below the deepest rank
  for (const b of G.balls) {
    if (b.dead) continue;
    if (b.stuck) { b.x = G.paddle.x + (b.holdOff || 0); b.y = PADDLE_Y() - G.paddle.h / 2 - b.r - 2; continue; }
    // SKY WARP: the ball phases straight up through every block, then pops
    // out in the high-ground zone with a rally-friendly sideways angle
    if (b.phasing) {
      b.trail.unshift({ x: b.x, y: b.y });
      if (b.trail.length > 16) b.trail.length = 16;
      b.y -= ballSp() * 1.3 * bts * dt;
      const stopY = wallTop < Infinity ? Math.max(56 + b.r + 8, wallTop - 44) : 56 + b.r + 70;
      if (b.y <= stopY) {
        b.phasing = false;
        b.y = stopY;
        const sp = ballSp();
        const a = -Math.PI / 2 + (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.3);
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        burst(b.x, b.y, '#80d8ff', 18, 240, 0.55);
        tone(1100, 0.12, 'triangle', 0.06);
      }
      continue;
    }
    b.trail.unshift({ x: b.x, y: b.y });
    const tl = 10 + Math.min(10, G.combo); // trail charges up with your combo
    if (b.trail.length > tl) b.trail.length = tl;
    if (windy) b.vx += Math.sin(G.time * 1.6 + b.y * 0.012) * (G.gustT > 0 ? 320 : 230) * dt;
    // endgame aim-assist: gently steer rising balls toward the last few bricks
    if (aliveCnt > 0 && aliveCnt <= 4 && b.vy < 0) {
      const tgt = nearestBrick(b.x, b.y);
      if (tgt) {
        const want = Math.atan2((tgt.by + G.fy) - b.y, (tgt.bx + G.fx) - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        let da = want - cur;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const na = cur + Math.max(-1.4 * dt, Math.min(1.4 * dt, da));
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
    }
    b.x += b.vx * bts * dt; b.y += b.vy * bts * dt;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); SFX.wall(); }
    if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); SFX.wall(); }
    if (b.y < 56 + b.r) {
      b.y = 56 + b.r; b.vy = Math.abs(b.vy); SFX.wall();
      // reaching the very top is a skill beat — reward it (points + a little Mega)
      if (G.state === 'play' && !b.stuck) {
        G.score += Math.round(12 * scoreMult());
        if (G.megaT <= 0) G.mega = Math.min(1, G.mega + 0.0015);
        burst(b.x, 56 + b.r, '#ffd54f', 3, 90, 0.3);
      }
    }
    if (b.y > FLOOR() - 14 && G.shieldCharges > 0 && b.vy > 0) {
      b.vy = -Math.abs(b.vy); b.y = FLOOR() - 14;
      G.shieldCharges--;
      burst(b.x, FLOOR() - 12, '#66bb6a', 20, 220);
      SFX.shield();
    }
    if (b.y > H + 30) b.dead = true;
    // RALLY BARRIER — earning the high ground keeps you there for a bit.
    // Getting above the wall arms the net (3 charges per paddle possession).
    // The ball then pinballs freely off any block tops inside the formation;
    // only when it would fall out the BOTTOM through an empty column does the
    // net catch it and pop it back up — costing a charge. Spent net = it drops.
    if (rallyFloor > -Infinity && !b.stuck) {
      if (wallTop < Infinity && b.y < wallTop - b.r - 2) {
        if (!b.aboveWall) {
          b.aboveWall = true;
          // first trip up top each wave is celebrated — this is the fun zone
          if (!G.highGroundDone && G.state === 'play') {
            G.highGroundDone = true;
            const bo = Math.round(150 * scoreMult());
            G.score += bo;
            addFloater(b.x, b.y + 20, 'HIGH GROUND! +' + bo, '#ffd54f', 17);
            if (G.megaT <= 0) G.mega = Math.min(1, G.mega + 0.03);
            tone(880, 0.14, 'triangle', 0.06, 200);
          }
        }
      } else if (b.aboveWall && b.vy > 0 && b.y - b.r > rallyFloor) {
        // only catch in a truly empty column — if a block is (partially)
        // overhead the ball plays off it physically instead
        const gapColumn = !G.bricks.some(br => !br.dead && !br.isBoss && !br.dive && !flying(br) && Math.abs(b.x - (br.bx + G.fx)) < br.w / 2 + b.r);
        if (gapColumn && b.zoneSaves > 0) {
          b.zoneSaves--;
          // preserve speed, pop mostly upward (≤~30° tilt) — no sideways flings
          const sp2 = Math.hypot(b.vx, b.vy);
          let tilt = Math.atan2(b.vx, Math.abs(b.vy));
          tilt = Math.max(-0.52, Math.min(0.52, tilt + (Math.random() - 0.5) * 0.4));
          b.vx = Math.sin(tilt) * sp2;
          b.vy = -Math.cos(tilt) * sp2;
          b.y = rallyFloor - 2;
          burst(b.x, rallyFloor, '#ffd54f', 12, 180, 0.45);
          tone(720 + b.zoneSaves * 140, 0.09, 'triangle', 0.05);
          if (b.zoneSaves === 1) addFloater(b.x, rallyFloor - 20, 'BARRIER LOW!', '#ff8a65', 13);
          else if (b.zoneSaves === 0) { addFloater(b.x, rallyFloor - 20, 'BARRIER SPENT!', '#ff5252', 14); noiseBurst(0.14, 0.06); }
          if (!G.barrierHintDone) {
            G.barrierHintDone = true;
            addFloater(b.x, rallyFloor - 40, 'RALLY BARRIER!', '#ffd54f', 16);
          }
        } else {
          b.aboveWall = false; // spent, or it slipped out under a block
        }
      }
    }
    const pw = paddleW(), py = PADDLE_Y();
    if (b.vy > 0 && b.y + b.r > py - G.paddle.h / 2 && b.y - b.r < py + G.paddle.h / 2 &&
        b.x > G.paddle.x - pw / 2 - b.r && b.x < G.paddle.x + pw / 2 + b.r) {
      if (G.fx_magnet && !b.stuck) {
        b.stuck = true; b.holdOff = b.x - G.paddle.x;
        SFX.paddle();
      } else {
        const rel = (b.x - G.paddle.x) / (pw / 2);
        const ang = -Math.PI / 2 + rel * 1.05;
        // classic breakout pacing: bounces nudge speed up on Normal+ (Easy stays steady)
        const sp = SETTINGS.preset === 'easy'
          ? Math.min(Math.hypot(b.vx, b.vy), ballSp())
          : Math.min(Math.hypot(b.vx, b.vy) * 1.012, ballSp() * 1.18);
        b.vx = Math.cos(ang) * sp + G.paddle.speed * 0.06;
        b.vy = Math.sin(ang) * sp;
        b.y = py - G.paddle.h / 2 - b.r;
        SFX.paddle();
        G.paddle.squash = 1;
        burst(b.x, py, '#90caf9', 6, 120, 0.3);
        // a clean return vents blaster heat and (with Momentum) charges Mega
        if (G.overheat <= 0) G.heat = Math.max(0, G.heat - 0.5);
        if (G.megaT <= 0) G.mega = Math.min(1, G.mega + 0.02 * upgN('momentum'));
        // ---- starter partner abilities trigger on clean returns ----
        if (G.starter === 'fire') { // Blaze: the return ignites the ball
          b.ember = G.starterLvl;
          burst(b.x, py - 14, '#ffab66', 6, 130, 0.35);
        } else if (G.starter === 'water') { // Torrent: rhythm builds a shield
          if (++G.torrentCount >= 6 - G.starterLvl) {
            G.torrentCount = 0;
            if (G.shieldCharges < shieldCap()) {
              G.shieldCharges++;
              addFloater(G.paddle.x, py - 34, 'TORRENT SHIELD!', '#4dd0e1', 13);
              SFX.shield();
            }
          }
        }
      }
      G.combo = 0;
      // returning to the paddle banks the rally — celebrate a good one
      if (b.rally >= 5) addFloater(G.paddle.x, PADDLE_Y() - 32, 'NICE RALLY ×' + b.rally + '!', '#80d8ff', 15);
      b.rally = 0;
      b.zoneSaves = barrierCharges(); // fresh possession recharges the rally barrier
    }
    for (const br of G.bricks) {
      if (br.dead || br.phaseT > 0) continue; // Lunala's Phantom Phase: intangible
      const bx = br.bx + G.fx, by = br.by + G.fy;
      const hw = br.w / 2, hh = br.h / 2;
      const cx = Math.max(bx - hw, Math.min(b.x, bx + hw));
      const cy = Math.max(by - hh, Math.min(b.y, by + hh));
      const dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy < b.r * b.r) {
        const pierce = G.fx_fire || G.megaT > 0;
        if (pierce && !br.isBoss) {
          // Fireball torches blocks outright; bare Mega punches through for 3
          // with brief contact i-frames so a surviving block isn't melted
          // frame-by-frame as the ball ghosts through it
          if (br.flash <= 0.5) {
            damageBrick(br, G.fx_fire ? 99 : (upgN('megaX') ? 4.5 : 3), b.x, b.y, G.ballElement);
            if (G.fx_fire) fireballExplosion(b.x, b.y, G.fx_fire.tier);
            awardRally(b, b.x, b.y);
          }
        } else {
          const ox = (hw + b.r) - Math.abs(b.x - bx);
          const oy = (hh + b.r) - Math.abs(b.y - by);
          if (ox < oy) { b.vx = b.x < bx ? -Math.abs(b.vx) : Math.abs(b.vx); }
          else { b.vy = b.y < by ? -Math.abs(b.vy) : Math.abs(b.vy); }
          // Blaze embers from the last paddle return add burn damage
          let dmg = pierce ? (upgN('megaX') ? 4.5 : 3) : 1;
          if (b.ember > 0) {
            b.ember--;
            dmg += G.starterLvl >= 3 ? 2 : 1;
            burst(b.x, b.y, '#ffab66', 8, 160, 0.4);
          }
          damageBrick(br, dmg, b.x, b.y, G.ballElement);
          if (G.fx_fire) fireballExplosion(b.x, b.y, G.fx_fire.tier);
          awardRally(b, b.x, b.y);
        }
        break;
      }
    }
  }
  G.balls = G.balls.filter(b => !b.dead);
  // classic mode loses a life when the last ball drops; the shooter modes have
  // no ball — you only lose to enemy fire, so losing "all balls" never applies
  if (G.mode === 'classic' && G.state === 'play' && G.balls.length === 0) { loseLife(); return; }

  // ---- lasers ----
  const laserActive = G.fx_laser || G.megaT > 0;
  if (laserActive && G.state === 'play') {
    G.laserCD -= dt;
    if (G.laserCD <= 0) {
      // slowed down — lasers support the ball, they don't replace it.
      // Mega grants only tier-1 support fire now.
      const tier = Math.max(G.fx_laser ? G.fx_laser.tier : 0, G.megaT > 0 ? 1 : 0);
      G.laserCD = tier >= 3 ? 0.3 : tier >= 2 ? 0.42 : 0.6;
      const pw = paddleW();
      const xs = tier >= 3 ? [-pw / 2, -pw / 6, pw / 6, pw / 2] : [-pw / 2 + 8, pw / 2 - 8];
      // shipY, not PADDLE_Y — the junkie pilot fires from wherever it flies
      xs.forEach(off => G.lasers.push({ x: G.paddle.x + off, y: shipY() - 14,
        explosive: !!G.fx_fire || G.megaT > 0, mega: G.megaT > 0 }));
      SFX.laser();
    }
  }
  for (const L of G.lasers) {
    L.y -= 900 * ts * dt;
    // bolts intercept enemy fire — shoot the shots down!
    // (Interceptor upgrade lets one bolt take out several shots)
    for (const s of G.enemyShots) {
      if (L.dead || s.dead) continue;
      if (Math.abs(L.x - s.x) < 17 && Math.abs(L.y - s.y) < 26) {
        s.dead = true;
        L.hits = (L.hits || 0) + 1;
        if (L.hits > upgN('intercept')) L.dead = true;
        burst(s.x, s.y, '#ffab91', 12, 200, 0.5);
        addFloater(s.x, s.y - 14, 'INTERCEPTED!', '#80d8ff', 11);
        tone(740, 0.08, 'square', 0.05, -300);
        G.score += 25;
      }
    }
    // manual blaster bolts can also snag falling pickups out of the air —
    // a skill shot for drops you can't reach with the paddle
    if (L.basic) {
      for (const pu of G.powerups) {
        if (L.dead || pu.dead) continue;
        if (Math.abs(L.x - pu.x) < 20 && Math.abs(L.y - pu.y) < 26) {
          pu.dead = true; L.dead = true;
          addFloater(pu.x, pu.y - 16, 'SNAGGED!', '#80d8ff', 12);
          collectPickup(pu);
        }
      }
    }
    for (const br of G.bricks) {
      if (br.dead || br.phaseT > 0 || L.dead || L.lastHit === br) continue;
      const bx = br.bx + G.fx, by = br.by + G.fy;
      // charged shots are fat, so they connect over a wider span
      const xtol = br.w / 2 + (L.charged ? L.r * 0.5 : 0) + (L.heavy ? 6 : 0);
      if (Math.abs(L.x - bx) < xtol && Math.abs(L.y - by) < br.h / 2) {
        // Pulse rounds create occasional, readable line-clears. Charged shots
        // keep their own hold-to-aim pierce; fast Volley bolts never gain it.
        if (L.pulse || L.charged) {
          L.lastHit = br;
          L.bhits = (L.bhits || 0) + 1;
          if (L.bhits >= (L.charged ? L.pierce : 2)) L.dead = true;
        } else {
          L.dead = true;
        }
        let dmg = L.charged ? L.power : (L.powerMul || 1);
        if (L.heavy) dmg *= 1.15;
        if (upgN('lockon') && (br.isBoss || br.maxHp >= 3)) dmg *= 1.25;
        if (L.nova) dmg *= 2;
        if (L.mega) dmg *= upgN('megaX') ? 1.5 : 1.25;
        // JUNKIE-mode bolts carry the pilot's element; the base blaster stays neutral
        damageBrick(br, dmg, L.x, L.y, L.element || (L.basic ? null : 'electric'));
        // MOMENTUM: in the shooter modes there are no paddle returns, so
        // blaster hits carry the whole tier — twice the classic trickle
        if (L.basic && G.megaT <= 0 && upgN('momentum')) G.mega = Math.min(1, G.mega + (G.mode !== 'classic' ? 0.004 : 0.002));
        if (L.explosive) fireballExplosion(L.x, L.y, 1);
        // a fire pilot's spent charge shot detonates — Blaze in shooter form
        if (L.charged && L.dead && L.shape === 'flame') fireballExplosion(L.x, L.y, 1);
      }
    }
    if (L.y < 40) L.dead = true;
  }
  G.lasers = G.lasers.filter(L => !L.dead);

  // ---- draco missiles ----
  if (G.fx_draco && G.state === 'play') {
    G.missileCD -= dt;
    if (G.missileCD <= 0) {
      const tier = G.fx_draco.tier;
      G.missileCD = Math.max(0.5, 1.3 - tier * 0.25);
      const n = tier >= 2 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        G.missiles.push({ x: G.paddle.x + (i ? 18 : -18), y: shipY() - 16, vx: (i ? 1 : -1) * 120, vy: -340, tier });
      }
      SFX.missile();
    }
  }
  for (const m of G.missiles) {
    const tgt = nearestBrick(m.x, m.y);
    if (tgt) {
      const tx = tgt.bx + G.fx, ty = tgt.by + G.fy;
      const a = Math.atan2(ty - m.y, tx - m.x);
      const cur = Math.atan2(m.vy, m.vx);
      let da = a - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const na = cur + Math.max(-3.2 * dt, Math.min(3.2 * dt, da));
      const sp = 430;
      m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp;
    }
    m.x += m.vx * ts * dt; m.y += m.vy * ts * dt;
    if (G.particles.length < 430) G.particles.push({ x: m.x, y: m.y, vx: -m.vx * 0.08, vy: -m.vy * 0.08, life: 0.3, maxLife: 0.3, color: '#ffab91', r: 2.5 });
    for (const br of G.bricks) {
      if (br.dead || br.phaseT > 0 || m.dead) continue;
      const bx = br.bx + G.fx, by = br.by + G.fy;
      if (Math.abs(m.x - bx) < br.w / 2 + 6 && Math.abs(m.y - by) < br.h / 2 + 6) {
        m.dead = true;
        damageBrick(br, 2, m.x, m.y, 'dragon');
        fireballExplosion(m.x, m.y, m.tier >= 3 ? 2 : 1);
      }
    }
    if (m.y < 30 || m.x < -40 || m.x > W + 40) m.dead = true;
  }
  G.missiles = G.missiles.filter(m => !m.dead);

  // ---- enemy fire (telegraphed — a warning flashes before every shot) ----
  if (G.state === 'play' && G.bossIntro <= 0) {
    const boss = G.bricks.find(b => b.isBoss && !b.dead);
    if (boss) {
      // signature ability (teleport, winds, sweeps, time warp...)
      if (BOSS_ABILITIES[boss.poke.id]) {
        boss.abilityCD -= dt * ts;
        if (boss.abilityCD <= 0) {
          boss.abilityCD = BOSS_ABILITIES[boss.poke.id].cd * (boss.phase === 3 ? 0.5 : boss.phase === 2 ? 0.7 : 1);
          bossAbility(boss);
        }
      }
      // sweep motion (Rayquaza crossing / Koraidon charging)
      if (boss.sweep) { // sweeps move the boss's HOME so patrol/rings track it
        boss.hx += boss.sweep.dir * (boss.sweep.fast ? 460 : 280) * ts * dt;
        const lim = boss.w / 2 + 14;
        if (boss.hx < lim) { boss.hx = lim; boss.sweep.dir = 1; }
        if (boss.hx > W - lim) { boss.hx = W - lim; boss.sweep.dir = -1; }
        boss.bx = boss.hx;
        boss.sweep.t -= dt * ts;
        if (boss.sweep.t <= 0) boss.sweep = null;
      }
      if (boss.phaseT > 0) boss.phaseT -= dt;
      G.bossShotCD -= dt * ts;
      if (G.bossShotCD <= 0) {
        G.bossShotCD = d.bossShotInt * (boss.phase === 3 ? 0.4 : boss.phase === 2 ? 0.6 : 1);
        G.telegraphs.push({ br: boss, boss: true, t: 0.55, max: 0.55 });
      }
    }
    // the shooter modes lean into the fantasy: enemies fire from the first
    // wave and roughly twice as often, with a bigger warning-line budget
    const blaster = G.mode !== 'classic';
    if (G.level >= 2 || blaster) {
      G.enemyShotCD -= dt * ts;
      if (G.enemyShotCD <= 0) {
        G.enemyShotCD = d.enemyShotInt * (0.7 + Math.random() * 0.6) * (blaster ? 0.5 : 1);
        // off-screen flyers (wrapping patterns / streams) can't fire
        const alive = G.bricks.filter(b => !b.dead && !b.isBoss && !b.entry && !b.dive
          && b.bx + G.fx > 30 && b.bx + G.fx < W - 30);
        // cap concurrent warnings so the board never fills with warning lines
        const activeTel = G.telegraphs.reduce((n, t) => n + (t.boss ? 0 : 1), 0);
        if (alive.length && activeTel < (blaster ? 5 : 3)) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          G.telegraphs.push({ br: shooter, boss: false, t: 0.5, max: 0.5 });
        }
      }
    }
  }
  // telegraphs resolve into the actual shots
  for (const tg of G.telegraphs) {
    tg.t -= dt * ts;
    if (tg.t <= 0 && !tg.br.dead) {
      const bx = tg.br.bx + G.fx, by = tg.br.by + G.fy + tg.br.h / 2;
      if (tg.boss) {
        const base = Math.atan2(shipY() - by, G.paddle.x - bx);
        const sp = (230 + d.lv * 12) * d.shotSpeed;
        const angles = tg.fan ? [-0.5, -0.25, 0, 0.25, 0.5].map(a => base + a)
          : tg.br.phase === 3 ? [base - 0.6, base - 0.3, base, base + 0.3, base + 0.6]
          : tg.br.phase === 2 ? [base - 0.35, base, base + 0.35] : [base];
        for (const a of angles) G.enemyShots.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, boss: true });
      } else {
        G.enemyShots.push({ x: bx, y: by, vy: (240 + d.lv * 18) * d.shotSpeed });
      }
      SFX.enemyShot();
    }
  }
  G.telegraphs = G.telegraphs.filter(tg => tg.t > 0 && !tg.br.dead);
  // column strikes (Zekrom / Eternatus): a warned zone, then the beam lands
  for (const cs of G.columnStrikes) {
    if (cs.warn > 0) {
      cs.warn -= dt * ts;
      if (cs.warn <= 0) { G.shake = Math.min(G.shake + 10, 16); SFX.laser(); noiseBurst(0.25, 0.1); }
    } else {
      cs.strike -= dt * ts;
      // the junkie pilot is a compact mon — beam clips its small hitbox, not
      // a phantom paddle width (same rule as enemy shots)
      const halfW = G.mode === 'junkie' ? 26 : paddleW() / 2;
      if (G.invuln <= 0 && Math.abs(G.paddle.x - cs.x) < cs.w / 2 + halfW) {
        cs.strike = 0;
        if (absorbHit(G.paddle.x, shipY())) continue;
        G.invuln = 2;
        addFloater(G.paddle.x, shipY() - 50, 'HIT!', '#ff5252', 22);
        burst(G.paddle.x, shipY(), '#ffd54f', 30, 320);
        loseLife();
        return;
      }
    }
  }
  G.columnStrikes = G.columnStrikes.filter(cs => cs.warn > 0 || cs.strike > 0);
  for (const s of G.enemyShots) {
    s.y += (s.vy || 0) * ts * dt;
    if (s.vx != null) s.x += s.vx * ts * dt;
    else s.x += Math.sin(s.y * 0.03) * 30 * dt;
    // in SPACE JUNKIE the player is a compact mon, not a wide paddle — the
    // hit zone is a small box around the ship, wherever it's flying. BLASTER
    // dodges for a living, so upgrades never widen its hurtbox (base width).
    const jk = G.mode === 'junkie';
    const py = shipY();
    const hitW = jk ? 26 : (G.mode === 'classic' ? paddleW() : G.paddle.w) / 2 + 6;
    const hitH = jk ? 24 : G.paddle.h;
    if (!s.dead && G.invuln <= 0 && s.y > py - hitH && s.y < py + hitH &&
        Math.abs(s.x - G.paddle.x) < hitW) {
      s.dead = true;
      // AEGIS: a shield charge absorbs the hit at the moment of impact —
      // this is what makes the survival path real in the shooter modes,
      // where enemy fire is the only way to die
      if (absorbHit(s.x, py)) continue;
      G.invuln = 2;
      addFloater(G.paddle.x, py - 50, 'HIT!', '#ff5252', 22);
      burst(G.paddle.x, py, '#ff5252', 30, 320);
      loseLife();
      return;
    }
    if (s.y > H + 20) s.dead = true;
  }
  G.enemyShots = G.enemyShots.filter(s => !s.dead);

  // ---- falling pickups (power-ups + pokéballs + element orbs) ----
  for (const pu of G.powerups) {
    pu.y += pu.vy * ts * dt; pu.rot += dt * 3;
    if (pu.orb) pu.x += Math.sin(pu.rot * 0.9) * 26 * dt; // orbs waft down gently
    if (upgN('magnetize')) { // Item Magnet: pickups drift toward the paddle
      const dx = G.paddle.x - pu.x;
      pu.x += Math.sign(dx) * Math.min(Math.abs(dx) * 2, 75 * upgN('magnetize')) * dt;
    }
    const pw = paddleW(), py = shipY(); // the ship catches wherever it flies
    // Overgrowth (grass partner) widens the pickup catch envelope
    const reach = 18 + (G.starter === 'grass' ? 10 + 6 * G.starterLvl : 0);
    if (pu.y > py - 20 && pu.y < py + 24 && Math.abs(pu.x - G.paddle.x) < pw / 2 + reach) {
      pu.dead = true;
      collectPickup(pu);
    }
    if (pu.y > H + 30) pu.dead = true;
  }
  G.powerups = G.powerups.filter(p => !p.dead);

  // ---- level clear → reinforcements first, then draft and move on ----
  if (G.state === 'play' && G.dramaticT <= 0 && G.bricks.every(b => b.dead)) {
    if (G.reinforce > 0) {
      G.reinforce--;
      spawnReinforcement();
      return;
    }
    const clearedStage = stageIdx(G.level);
    G.level++;
    G.state = 'upgrade'; G.stateT = 0;
    G.clearedStage = clearedStage;
    G.score += Math.round((300 + clearedStage * 250) * (G.fx_score ? 2 : 1));
    if (G.deathsThisWave === 0) G.adapt = Math.min(1.15, G.adapt * 1.04); // flawless → push back
    // Poké Revive capstone: every region you finish grants a life
    if (clearedStage === 2 && upgN('revive')) {
      G.lives++;
      addFloater(W / 2, H * 0.42, 'POKÉ REVIVE — +1 LIFE', '#ec407a', 20);
    }
    // draft: advance one of up to three paths (skip maxed ones)
    rollUpgradeChoices();
    upgradeTreeOpen = false;
    G.rerolled = false; // one fresh reroll per draft screen
    SFX.levelUp();
    // confetti!
    const palette = ['#ffd54f', '#66bb6a', '#42a5f5', '#ec407a', '#ab47bc', '#ff7043'];
    for (let i = 0; i < 6; i++) {
      burst(W * (0.15 + Math.random() * 0.7), H * (0.2 + Math.random() * 0.3),
        palette[i % palette.length], 14, 280, 1.2);
    }
  }
}
