'use strict';
// ============================================================
//  UPDATE
// ============================================================
function paddleW() {
  return G.paddle.w * (1 + 0.1 * upgN('wide')) * (G.fx_wide ? (1 + 0.35 * G.fx_wide.tier) : 1);
}
function timeScale() {
  return (G.fx_slow ? 0.5 : 1) * SETTINGS.speed * (G.dramaticT > 0 ? 0.3 : 1);
}
// Dialga's Roar of Time slows only the balls, not the player
function ballTimeScale() { return G.timeWarpT > 0 ? 0.55 : 1; }
function scoreMult() {
  return (G.fx_score ? 2 * G.fx_score.tier : 1)
    * (1 + Math.min(G.combo, 20) * 0.1)
    * (G.modifier?.key === 'bounty' ? 2 : 1)
    * (1 + G.catchBonus);
}

function tickEffects(dt) {
  for (const k of ['fx_fire', 'fx_laser', 'fx_wide', 'fx_slow', 'fx_magnet', 'fx_score', 'fx_draco']) {
    if (G[k]) { G[k].t -= dt; if (G[k].t <= 0) G[k] = null; }
  }
  if (G.megaT > 0) G.megaT = Math.max(0, G.megaT - dt);
  if (G.ballElement) { G.ballElementT -= dt; if (G.ballElementT <= 0) G.ballElement = null; }
  // blaster heat cools slowly on its own, faster once fully overheated
  if (G.overheat > 0) {
    G.overheat -= dt;
    if (G.overheat <= 0) { G.overheat = 0; G.heat = 0.3; }
  } else {
    G.heat = Math.max(0, G.heat - dt * 0.15);
  }
  G.gustT = Math.max(0, G.gustT - dt);
  G.timeWarpT = Math.max(0, G.timeWarpT - dt);
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
    // ---- boss enrage phase ----
    if (br.phase === 1 && br.hp <= br.maxHp / 2) {
      br.phase = 2;
      SFX.enrage();
      G.shake = 12; G.flashT = 0.15;
      setAnnounce('alert', '#ff5252', br.poke.n.toUpperCase() + ' IS ENRAGED!', 'FASTER, SPREADING ATTACKS', 2.4);
    }
  }
  if (br.hp <= 0) {
    br.dead = true;
    G.combo++;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    // tuned so Mega comes online roughly once per region (3 waves)
    if (G.megaT <= 0) G.mega = Math.min(1, G.mega + (br.isBoss ? 0.12 : 0.008));
    if (br.poke.id === 25) { tone(990, 0.08, 'square', 0.06); setTimeout(() => tone(1320, 0.12, 'square', 0.05), 70); } // pika!
    if (br.poke.id === -1) { // MISSINGNO. — the item duplication glitch lives on
      setAnnounce('▒', '#b0bec5', 'MISSINGNO.', 'ITEM DUPLICATION! ×3 POWER-UPS', 2.2);
      G.score += 999;
      const ks = Object.keys(POWERS);
      for (let i = 0; i < 3; i++) {
        const p = POWERS[ks[Math.floor(Math.random() * ks.length)]];
        G.powerups.push({ x: br.bx + G.fx + (i - 1) * 44, y: br.by + G.fy, vy: 130, p, rot: 0 });
      }
      noiseBurst(0.3, 0.1);
    }
    if (br.shiny) { // shiny: jackpot + guaranteed catch
      G.score += 500;
      setAnnounce('fairy', '#ffd700', 'SHINY POKÉMON!', '+500 · GUARANTEED POKÉBALL DROP', 2.2);
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy - 36, vy: 115, p: { key: 'pokeball' }, dexId: br.poke.id, shiny: true, rot: 0 });
      burst(br.bx + G.fx, br.by + G.fy, '#ffd700', 30, 320, 0.9);
      SFX.gotcha();
    }
    const base = br.isBoss ? 1000 : br.maxHp * 25;
    const pts = Math.round(base * scoreMult());
    G.score += pts;
    // only surface the noteworthy numbers — constant +NN spam reads as noise
    if (br.isBoss || pts >= 150) addFloater(br.bx + G.fx, br.by + G.fy, '+' + pts, '#fff', br.isBoss ? 26 : 15);
    if (!br.isBoss && G.combo > 2 && G.combo % 5 === 0) addFloater(br.bx + G.fx, br.by + G.fy - 26, 'COMBO x' + G.combo, '#ffd54f', 18);
    burst(sx, sy, col, br.isBoss ? 70 : 22, br.isBoss ? 420 : 300, br.isBoss ? 1.1 : 0.7);
    shatterBrick(br, br.bx + G.fx, br.by + G.fy);
    G.shake = Math.min(G.shake + (br.isBoss ? 14 : 4), 16);
    G.freeze = Math.max(G.freeze, br.isBoss ? 0.14 : 0.025); // hit-stop
    if (br.isBoss) { SFX.bossDown(); addFloater(W / 2, H * 0.3, br.poke.n.toUpperCase() + ' DEFEATED!', col, 30); }
    else SFX.brick();
    // every region's arrival wave seeds a Sky Warp on the first kill —
    // an early invitation up to the high ground
    if (!G.waveFirstKill) {
      G.waveFirstKill = true;
      if (stageIdx(G.level) === 0 && !br.isBoss) {
        G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 95, p: POWERS.warp, rot: 0, hint: G.level === 1 });
      }
    }
    // drops: power-up tied to type, or a catchable pokéball
    const d = diff();
    if (br.isBoss) {
      const p = POWERS[POWER_BY_TYPE[br.poke.t] || 'star'];
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 130, p, srcType: br.poke.t, rot: 0 });
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy - 40, vy: 110, p: { key: 'pokeball' }, dexId: br.poke.id, rot: 0 });
    } else if (br.poke.id > 0 && Math.random() < d.dropChance) {
      const p = POWERS[POWER_BY_TYPE[br.poke.t] || 'star'];
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

// reward keeping the ball alive up top — the classic breakout thrill.
// rally = brick contacts since this ball last touched the paddle; it resets
// on a paddle return, so long rallies mean skilful top-of-screen play.
function awardRally(b, x, y) {
  b.rally = (b.rally || 0) + 1;
  G.bestRally = Math.max(G.bestRally, b.rally);
  if (b.rally < 3) return;
  const bonus = Math.round(b.rally * 15 * scoreMult());
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
    // pure element swap — no other effect, just fixes your matchup
    G.ballElement = pu.p.t;
    G.ballElementT = 30;
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
    if (upgN('bond')) {
      G.catchBonus += 0.06 * upgN('bond');
      addFloater(pu.x, pu.y - 26, 'BOND +' + Math.round(G.catchBonus * 100) + '% SCORE', '#ffd54f', 12);
    }
    setAnnounce(pu.shiny ? 'fairy' : 'pokeball', pu.shiny ? '#ffd700' : '#ef5350',
      pu.shiny ? 'SHINY GOTCHA!' : 'GOTCHA!',
      G.trial ? 'TRIAL — CATCH NOT REGISTERED · +250 PTS'
        : isNew ? 'NEW POKÉMON REGISTERED TO POKÉDEX' : 'ALREADY REGISTERED · +250 PTS', 1.8);
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

function loseLife() {
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
    G.state = 'gameover'; G.stateT = 0;
    SFX.gameOver();
    if (!G.trial && G.score > G.best) { G.best = G.score; localStorage.setItem('pkbrk-best', G.best); }
  } else {
    serve();
  }
}

function nearestBrick(x, y) {
  let best = null, bd = Infinity;
  for (const br of G.bricks) {
    if (br.dead || br.entry) continue; // ignore ranks still flying in
    const d = Math.hypot(br.bx + G.fx - x, br.by + G.fy - y);
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
  G.invuln = Math.max(0, G.invuln - dt);
  G.blasterCD = Math.max(0, G.blasterCD - dt);
  G.muzzle = Math.max(0, G.muzzle - dt);
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
  for (const gh of G.ghosts) { gh.life -= dt; gh.s += dt * 60; gh.rot += gh.vr * dt; }
  G.ghosts = G.ghosts.filter(g => g.life > 0);

  if (G.state === 'menu' || G.state === 'gameover' || G.state === 'dex') return;
  if (paused) return;
  if (G.state === 'upgrade') {
    // no draftable upgrades left → brief breather, then straight on
    if (!G.upgradeChoices && G.stateT > 2.2) { buildLevel(G.level); serve(); }
    return;
  }

  tickEffects(dt);
  if (G.state === 'play') G.playT += dt;
  // held FIRE keeps shooting — the heat lockout is the only governor
  if (fireHeld && G.state === 'play') fireAction(true);

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
  if (G.elementOrbCD <= 0 && G.state === 'play' && !G.powerups.some(p => p.p.key === 'element')) {
    const alive = G.bricks.filter(b => !b.dead && b.poke.id > 0);
    if (alive.length >= 4) {
      const resisted = G.ballElement ? alive.filter(b => (RESIST[G.ballElement] || []).includes(b.poke.t)).length : 0;
      const struggling = G.ballElement && resisted >= alive.length * 0.5;
      // orbs are a rescue mechanic, not a scheduled shower: quick when you're
      // genuinely walled off, otherwise scarce
      G.elementOrbCD = struggling ? 8 : 34 + Math.random() * 20;
      if (struggling || Math.random() < 0.22) {
        // offer an element that's super effective against the dominant type
        const counts = {};
        for (const b of alive) counts[b.poke.t] = (counts[b.poke.t] || 0) + 1;
        const domType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const cands = Object.keys(EFFECTIVE).filter(el => EFFECTIVE[el].includes(domType) && el !== G.ballElement);
        const el = cands.length ? cands[Math.floor(Math.random() * cands.length)] : 'normal';
        G.powerups.push({ x: 50 + Math.random() * (W - 100), y: -20, vy: 62, p: { key: 'element', t: el }, rot: Math.random() * 6, orb: true });
      }
    } else {
      G.elementOrbCD = 8;
    }
  }

  // ---- formation drift ----
  // ---- Space Junkie entrances: ranks pour in from off-screen, swooping on a
  // curve into their formation slot. They animate even during the serve, and
  // they're fair game to shoot mid-flight.
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
    // global sway softens once individual choreography takes over
    const swayAmp = Math.min(50, W * 0.04) * (boss?.phase === 2 ? 1.5 : 1) * (style !== 'classic' ? 0.5 : 1);
    G.fx = Math.sin(G.swayT * 0.7) * swayAmp;
    // ---- motion choreography: each wave rolls one behavior from the pool
    // its region has unlocked. Boss guards instead ripple in rings around
    // their legendary, who patrols its arena.
    if (boss) {
      boss.bx = boss.hx + (mt >= 1 ? Math.sin(G.swayT * 0.45) * Math.min(90, W * 0.07) : 0);
    }
    if (style !== 'classic' || (boss && mt >= 1)) {
      for (const br of G.bricks) {
        if (br.dead || br.isBoss || br.entry) continue;
        let ox = 0, oy = 0;
        if (boss && mt >= 1) { // rings radiating from the boss
          const dist = Math.hypot(br.hx - boss.bx, br.hy - boss.hy);
          oy = Math.sin(G.swayT * 1.5 - dist * 0.02) * Math.min(11, br.h * 0.2);
          if (mt >= 2) ox = Math.sin(G.swayT * 0.8 + br.row * 0.9) * Math.min(14, br.w * 0.16);
        } else if (style === 'serpent') { // rows slide against each other
          ox = Math.sin(G.swayT * 0.9 + br.row * 0.85) * Math.min(16, br.w * 0.18);
        } else if (style === 'colwave') { // vertical wave rolls across columns
          ox = Math.sin(G.swayT * 0.9 + br.row * 0.85) * Math.min(12, br.w * 0.14);
          oy = Math.sin(G.swayT * 1.5 - br.col * 0.65) * Math.min(12, br.h * 0.24);
        } else if (style === 'breathe') { // the formation inhales and exhales
          ox = Math.sin(G.swayT * 0.9 + br.row * 0.85) * Math.min(10, br.w * 0.12)
            + (br.hx - W / 2) * Math.sin(G.swayT * 0.5) * 0.07;
          oy = Math.sin(G.swayT * 0.7 + (br.row + br.col) * 0.6) * 7;
        } else if (style === 'swirl') { // rolling circular shimmer
          const ph = G.swayT * 1.1 + (br.row + br.col) * 0.7;
          ox = Math.cos(ph) * Math.min(14, br.w * 0.16);
          oy = Math.sin(ph) * Math.min(9, br.h * 0.18);
        }
        br.bx = br.hx + ox;
        br.by = br.hy + oy;
      }
    }
    const alive = G.bricks.filter(b => !b.dead).length;
    const total = G.bricks.length;
    const thin = total > 0 ? 1 + (1 - alive / total) * 2.2 * preset().descent : 1;
    G.fy += d.descent * thin * ts * dt;
    let lowest = -Infinity;
    for (const br of G.bricks) if (!br.dead) lowest = Math.max(lowest, br.by + G.fy + br.h / 2);
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
    if (!br.isBoss) rallyFloor = Math.max(rallyFloor, br.by + G.fy + br.h / 2);
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
        const gapColumn = !G.bricks.some(br => !br.dead && !br.isBoss && Math.abs(b.x - (br.bx + G.fx)) < br.w / 2 + b.r);
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
            if (G.shieldCharges < 3) {
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
      b.zoneSaves = 2; // fresh possession recharges the rally barrier
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
            damageBrick(br, G.fx_fire ? 99 : 3, b.x, b.y, G.ballElement);
            if (G.fx_fire) fireballExplosion(b.x, b.y, G.fx_fire.tier);
            awardRally(b, b.x, b.y);
          }
        } else {
          const ox = (hw + b.r) - Math.abs(b.x - bx);
          const oy = (hh + b.r) - Math.abs(b.y - by);
          if (ox < oy) { b.vx = b.x < bx ? -Math.abs(b.vx) : Math.abs(b.vx); }
          else { b.vy = b.y < by ? -Math.abs(b.vy) : Math.abs(b.vy); }
          // Blaze embers from the last paddle return add burn damage
          let dmg = pierce ? 3 : 1;
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
  if (G.state === 'play' && G.balls.length === 0) { loseLife(); return; }

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
      xs.forEach(off => G.lasers.push({ x: G.paddle.x + off, y: PADDLE_Y() - 14, explosive: !!G.fx_fire || G.megaT > 0 }));
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
      if (br.dead || br.phaseT > 0 || L.dead) continue;
      const bx = br.bx + G.fx, by = br.by + G.fy;
      if (Math.abs(L.x - bx) < br.w / 2 && Math.abs(L.y - by) < br.h / 2) {
        L.dead = true;
        damageBrick(br, 1, L.x, L.y, L.basic ? null : 'electric'); // base blaster is type-neutral
        if (L.explosive) fireballExplosion(L.x, L.y, 1);
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
        G.missiles.push({ x: G.paddle.x + (i ? 18 : -18), y: PADDLE_Y() - 16, vx: (i ? 1 : -1) * 120, vy: -340, tier });
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
          boss.abilityCD = BOSS_ABILITIES[boss.poke.id].cd * (boss.phase === 2 ? 0.7 : 1);
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
        G.bossShotCD = d.bossShotInt * (boss.phase === 2 ? 0.55 : 1);
        G.telegraphs.push({ br: boss, boss: true, t: 0.55, max: 0.55 });
      }
    }
    if (G.level >= 2) {
      G.enemyShotCD -= dt * ts;
      if (G.enemyShotCD <= 0) {
        G.enemyShotCD = d.enemyShotInt * (0.7 + Math.random() * 0.6);
        const alive = G.bricks.filter(b => !b.dead && !b.isBoss && !b.entry);
        if (alive.length) {
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
        const base = Math.atan2(PADDLE_Y() - by, G.paddle.x - bx);
        const sp = (230 + d.lv * 12) * d.shotSpeed;
        const angles = tg.fan ? [-0.5, -0.25, 0, 0.25, 0.5].map(a => base + a)
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
      if (G.invuln <= 0 && Math.abs(G.paddle.x - cs.x) < cs.w / 2 + paddleW() / 2) {
        cs.strike = 0;
        G.invuln = 2;
        addFloater(G.paddle.x, PADDLE_Y() - 50, 'HIT!', '#ff5252', 22);
        burst(G.paddle.x, PADDLE_Y(), '#ffd54f', 30, 320);
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
    if (s.y > FLOOR() - 18 && G.shieldCharges > 0) {
      s.dead = true; G.shieldCharges--;
      burst(s.x, FLOOR() - 14, '#66bb6a', 14, 180); SFX.shield();
    }
    const pw = paddleW(), py = PADDLE_Y();
    if (!s.dead && G.invuln <= 0 && s.y > py - G.paddle.h && s.y < py + G.paddle.h &&
        Math.abs(s.x - G.paddle.x) < pw / 2 + 6) {
      s.dead = true;
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
    const pw = paddleW(), py = PADDLE_Y();
    // Overgrowth (grass partner) widens the pickup catch envelope
    const reach = 18 + (G.starter === 'grass' ? 10 + 6 * G.starterLvl : 0);
    if (pu.y > py - 20 && pu.y < py + 24 && Math.abs(pu.x - G.paddle.x) < pw / 2 + reach) {
      pu.dead = true;
      collectPickup(pu);
    }
    if (pu.y > H + 30) pu.dead = true;
  }
  G.powerups = G.powerups.filter(p => !p.dead);

  // ---- level clear → draft an upgrade, then on to the next stage ----
  if (G.state === 'play' && G.dramaticT <= 0 && G.bricks.every(b => b.dead)) {
    const clearedStage = stageIdx(G.level);
    G.level++;
    G.state = 'upgrade'; G.stateT = 0;
    G.clearedStage = clearedStage;
    G.score += Math.round((300 + clearedStage * 250) * (G.fx_score ? 2 : 1));
    if (G.deathsThisWave === 0) G.adapt = Math.min(1.15, G.adapt * 1.04); // flawless → push back
    // offer three draftable upgrades (skip any already maxed)
    const pool = UPGRADES.filter(u => upgN(u.key) < u.max);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    G.upgradeChoices = pool.length ? pool.slice(0, 3) : null;
    SFX.levelUp();
    // confetti!
    const palette = ['#ffd54f', '#66bb6a', '#42a5f5', '#ec407a', '#ab47bc', '#ff7043'];
    for (let i = 0; i < 6; i++) {
      burst(W * (0.15 + Math.random() * 0.7), H * (0.2 + Math.random() * 0.3),
        palette[i % palette.length], 14, 280, 1.2);
    }
  }
}
