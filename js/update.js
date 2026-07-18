'use strict';
// ============================================================
//  UPDATE
// ============================================================
function paddleW() {
  return G.paddle.w * (1 + 0.18 * upgN('wide')) * (G.fx_wide ? (1 + 0.35 * G.fx_wide.tier) : 1)
    * starterMod('paddle', 1);
}
function timeScale() {
  return (G.fx_slow ? 0.5 : 1) * (G.starterChillT > 0 ? 0.7 : 1)
    * SETTINGS.speed * (G.dramaticT > 0 ? 0.3 : 1);
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
    * starterMod('score', 1)
    * (1 + Math.min(G.combo, 20) * starterMod('comboScore', 0))
    * (1 + 0.06 * ((G.stacks && G.stacks.bell) || 0)); // SOOTHE BELL stacks
}

function tickEffects(dt) {
  G.livesMax = Math.max(G.livesMax || G.lives, G.lives); // health ring denominator tracks the peak
  for (const k of ['fx_fire', 'fx_laser', 'fx_wide', 'fx_slow', 'fx_magnet', 'fx_score', 'fx_draco']) {
    if (G[k]) { G[k].t -= dt; if (G[k].t <= 0) G[k] = null; }
  }
  if (G.megaT > 0) G.megaT = Math.max(0, G.megaT - dt);
  else if (G.state === 'play') G.mega = Math.min(1, G.mega + dt * starterMod('megaPassive', 0));
  G.starterChillT = Math.max(0, (G.starterChillT || 0) - dt);
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
    // vents on a pause — but slower than sustained fire builds, so holding the
    // trigger (or spamming the charge shot) really can cook the barrel
    G.heat = Math.max(0, G.heat - dt * (G.mode === 'junkie' ? 0.28 : 0.22));
  }
  G.gustT = Math.max(0, G.gustT - dt);
  G.timeWarpT = Math.max(0, G.timeWarpT - dt);
  G.reactiveCD = Math.max(0, (G.reactiveCD || 0) - dt); // REACTIVE OVERDRIVE regrow clock
  // ELEMENTAL ASCENSION (superskill): during Mega the live element retunes
  // every 1.5s to counter the most common enemy type on screen. The retune is
  // a normal timed override, so Mega's end lets it lapse back naturally.
  if (upgN('ascension') && G.megaT > 0 && G.state === 'play') {
    G.ascendT -= dt;
    if (G.ascendT <= 0) {
      G.ascendT = 1.5;
      const counts = {};
      for (const br of G.bricks) if (!br.dead && !br.dormant && !br.barrier) counts[br.poke.t] = (counts[br.poke.t] || 0) + 1;
      const dom = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      const counter = dom && Object.keys(TYPE_COLORS).find(t => (EFFECTIVE[t] || []).includes(dom));
      if (counter) {
        if (counter !== attackElement()) {
          addFloater(G.paddle.x, shipY() - 66, 'ASCENSION · ' + counter.toUpperCase(), TYPE_COLORS[counter], 12);
          sparkle(G.paddle.x, shipY() - 20, 4, false);
        }
        G.ballElement = counter;
        G.ballElementT = Math.max(G.ballElementT, 2.2);
        G.resistStreak = 0;
      }
    }
  } else if (G.megaT <= 0) G.ascendT = 0;
  G.veilHintCD = Math.max(0, (G.veilHintCD || 0) - dt);
  G.chargeHintCD = Math.max(0, (G.chargeHintCD || 0) - dt);
}

// ball-only power-ups make no sense in the no-ball shooter modes — swap them
// for shooter-useful equivalents at drop time. Multiball's stand-in is DRACO
// MISSILES, but homing missiles trivialise region 1's small 1-hp flocks (the
// two hinted "CATCH!" drops made them near-guaranteed) — so the first region
// swaps to a score star instead and draco waits for tankier waves.
function modePower(p) {
  if (G.mode === 'classic' || !p || !p.key) return p;
  const swap = { multi: regionIdx(G.level) >= 1 ? 'draco' : 'star', magnet: 'shield', warp: 'star' };
  return swap[p.key] ? POWERS[swap[p.key]] : p;
}

function shieldGeneratorFor(br) {
  if (!br || br.behavior === 'shield') return null;
  return G.bricks.find(g => !g.dead && g.behavior === 'shield' &&
    Math.abs(g.row - br.row) <= 1 && Math.abs(g.col - br.col) <= 1);
}
function behaviorDrop(br) {
  const ks = Object.keys(POWERS).filter(k => k !== 'pokeball');
  const p = modePower(POWERS[ks[Math.floor(gameRand() * ks.length)]] || POWERS.star);
  G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 105, p, srcType: br.poke.t, rot: 0, hint: true });
}
function triggerBrickBehavior(br) {
  if (br.behavior === 'treasure') behaviorDrop(br);
  if (br.behavior === 'split') {
    for (const side of [-1, 1]) {
      G.bricks.push({
        bx: br.bx + side * br.w * 0.23, by: br.by, hx: br.hx + side * br.w * 0.23, hy: br.hy,
        row: br.row, col: br.col + side * 0.2, w: br.w * 0.45, h: br.h * 0.72,
        hp: 1, maxHp: 1, miniBrick: true, armored: false,
        poke: { ...br.poke }, flash: 0, wobble: br.wobble + side,
      });
    }
    setAnnounce('multi', '#90caf9', 'BRICK SPLIT!', 'TWO SMALL TARGETS ENTERED THE WALL', 1.5);
  }
  if (['bomb', 'volatile', 'reactor'].includes(br.behavior)) {
    const radius = br.behavior === 'reactor' ? 150 : 105;
    const bx = br.bx + G.fx, by = br.by + G.fy;
    burst(bx, by, br.behavior === 'reactor' ? '#ffd740' : '#ff7043', 32, 360, 0.75);
    ringFx(bx, by, '#fff3e0', 8, radius, 4, 0.45);
    if (br.behavior === 'reactor') behaviorDrop(br);
    for (const other of G.bricks.slice()) {
      if (other.dead || other === br || other.isBoss) continue;
      const ox = other.bx + G.fx, oy = other.by + G.fy;
      if (Math.hypot(ox - bx, oy - by) <= radius) damageBrick(other, 1, ox, oy, 'fire', { behavior: true, ignoreShield: true });
    }
  }
}

// Starter follow-up attacks pick nearby live targets and are marked so they
// cannot recursively trigger another chain, quake, crit, or corrosion hit.
function starterStrikeTargets(source, count, dmg, element, color, label) {
  const sx = source.bx + G.fx, sy = source.by + G.fy;
  const targets = G.bricks.filter(b => !b.dead && b !== source && !b.barrier)
    .sort((a, b) => Math.hypot(a.bx + G.fx - sx, a.by + G.fy - sy) - Math.hypot(b.bx + G.fx - sx, b.by + G.fy - sy))
    .slice(0, count);
  if (!targets.length) return;
  ringFx(sx, sy, color, 5, 74, 3, 0.34);
  addFloater(sx, sy - source.h / 2 - 12, label, color, 12);
  for (const target of targets) {
    const tx = target.bx + G.fx, ty = target.by + G.fy;
    ringFx(tx, ty, color, 3, 30, 2, 0.25);
    damageBrick(target, dmg, tx, ty, element, { starterChain: true });
  }
}

function damageBrick(br, dmg, sx, sy, element, meta = {}) {
  if (!br || br.dead) return;
  const generator = !meta.ignoreShield && shieldGeneratorFor(br);
  if (generator) {
    br.flash = 0.65; generator.flash = 0.8;
    if (!br.shieldHintT || G.time > br.shieldHintT) {
      br.shieldHintT = G.time + 1.2;
      addFloater(sx, sy - 18, 'SHIELDED', '#66bb6a', 11);
      ringFx(sx, sy, '#66bb6a', 4, 32, 2, 0.25);
    }
    haptic('hit');
    return;
  }
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
  if (dmg < 90 && G.secretUpg.lens) dmg *= 1.15;
  const starterDirect = dmg < 90 && !meta.starterChain && !meta.behavior && !meta.linked;
  if (starterDirect && G.starter) {
    G.starterHits = (G.starterHits || 0) + 1;
    dmg *= starterMod('damage', 1);
    if (starterPerk() === 'GUTS') {
      const missing = Math.max(0, (G.livesMax || G.lives) - G.lives);
      dmg *= 1 + missing * starterMod('guts', 0);
      if (br.isBoss) dmg *= starterMod('bossDamage', 1);
    }
    if (starterPerk() === 'SAND FORCE' && (br.armored || br.shellArmor || br.barrier || br.isBoss)) {
      dmg *= starterMod('armorDamage', 1);
    }
    if (starterPerk() === 'MOXIE') dmg *= 1 + Math.min(G.combo, 20) * starterMod('comboDamage', 0);
    if (starterPerk() === 'CORROSION') {
      br.starterCorrosion = Math.min(5, (br.starterCorrosion || 0) + 1);
      dmg *= 1 + (br.starterCorrosion - 1) * starterMod('corrosion', 0);
    }
    const critEvery = starterMod('critEvery', 0);
    if (critEvery && G.starterHits % critEvery === 0) {
      dmg *= starterMod('critMul', 1);
      setCombatNotice('FORESIGHT · PRECISION CRIT', '#ec407a');
      ringFx(sx, sy, '#ec407a', 4, 46, 3, 0.3);
    }
  }
  // type effectiveness: super effective ×2 (PRISM AMPLIFY pushes it further),
  // resisted ×¼ — unless the OMNI LENS capstone ignores resistances outright
  if (element && dmg < 90) {
    if ((EFFECTIVE[element] || []).includes(br.poke.t)) {
      dmg *= 2 * (upgN('amplify') ? 1.3 : 1);
      // AURORA DRIVE: super-effective hits feed the Mega ring (gold motes)
      if (upgN('aurora') && G.megaT <= 0) {
        G.mega = Math.min(1, G.mega + 0.015);
        G.surgeFlash = Math.max(G.surgeFlash || 0, 0.4);
      }
      if (element === G.ballElement) G.resistStreak = 0;
      if (G.seCD <= 0) {
        // PRISM AMPLIFY proc: the notice itself reports the boosted multiplier
        setCombatNotice(upgN('amplify') ? 'SUPER EFFECTIVE · AMPLIFIED 2.6×' : 'SUPER EFFECTIVE · 2× DAMAGE',
          upgN('amplify') ? '#80e8ff' : '#ffd54f');
        SFX.superFx();
        G.seCD = 0.45;
      }
    } else if ((RESIST[element] || []).includes(br.poke.t) && (upgN('prismX') || G.secretUpg.lens)) {
      // OMNI LENS proc: this hit WOULD have been resisted — say the capstone
      // just pierced it, so the upgrade never feels like a silent no-op
      if (G.seCD <= 0) {
        setCombatNotice('OMNI LENS · RESIST PIERCED', '#b39ddb', 1.1);
        G.seCD = 0.45;
      }
    } else if ((RESIST[element] || []).includes(br.poke.t)) {
      // resisted hits barely scratch — gentler on Easy, brutal beyond
      dmg *= SETTINGS.preset === 'easy' ? 0.5 : 0.25;
      if (G.seCD <= 0) {
        setCombatNotice('RESISTED · CHANGE BALL TYPE', '#b0bec5');
        tone(180, 0.1, 'sine', 0.04, -60);
        G.seCD = 0.45;
      }
      // a badly-matched element eventually wears off — punishing, never a
      // soft-lock. PRISM TRANSFUSE keeps your element lit no matter what.
      if (!upgN('transfuse') && element === G.ballElement && ++G.resistStreak >= 4) {
        G.ballElement = null; G.resistStreak = 0;
        setCombatNotice('ELEMENT WORE OFF · NEUTRAL BALL RESTORED', '#cfd8dc', 1.4);
      }
    } else if (element === G.ballElement) G.resistStreak = 0;
  }
  br.hp -= dmg;
  if (dmg < 90 && G.secretUpg.echo && !meta.secretEcho) {
    G.secretHit = (G.secretHit || 0) + 1;
    if (G.secretHit % 7 === 0) {
      const ex = br.bx + G.fx, ey = br.by + G.fy;
      const echoes = G.bricks.filter(b => !b.dead && b !== br && !b.barrier && !b.dormant)
        .sort((a, b) => Math.hypot(a.bx + G.fx - ex, a.by + G.fy - ey) -
          Math.hypot(b.bx + G.fx - ex, b.by + G.fy - ey)).slice(0, 2);
      if (echoes.length) {
        setCombatNotice('ECHO RELAY · CHAIN HIT', '#d780ff');
        ringFx(ex, ey, '#d780ff', 6, 74, 3, 0.4);
        for (const target of echoes) {
          const tx = target.bx + G.fx, ty = target.by + G.fy;
          ringFx(tx, ty, '#80d8ff', 4, 34, 2, 0.3);
          damageBrick(target, Math.max(0.75, dmg * 0.4), tx, ty, null,
            { secretEcho: true, ignoreShield: true });
        }
      }
    }
  }
  br.flash = 1;
  haptic('hit');
  if (starterDirect) {
    const chainEvery = starterMod('chainEvery', 0);
    if (chainEvery && G.starterHits % chainEvery === 0) {
      starterStrikeTargets(br, starterMod('chainTargets', 1), Math.max(0.75, dmg * 0.45), 'electric', '#ffd740', 'OVERDRIVE CHAIN!');
    }
    const quakeEvery = starterMod('quakeEvery', 0);
    if (quakeEvery && G.starterHits % quakeEvery === 0) {
      starterStrikeTargets(br, Math.min(4, 1 + G.starterLvl), 1, 'ground', '#d4a373', 'SAND FORCE QUAKE!');
      G.shake = Math.min(12, G.shake + 6);
    }
  }
  if (br.behavior === 'link' && !meta.linked) {
    const mate = G.bricks.find(b => !b.dead && b !== br && b.behavior === 'link' && b.linkGroup === br.linkGroup);
    if (mate) {
      ringFx(mate.bx + G.fx, mate.by + G.fy, '#ce93d8', 4, 30, 2, 0.3);
      damageBrick(mate, Math.max(0.5, dmg * 0.35), mate.bx + G.fx, mate.by + G.fy, null,
        { linked: true, ignoreShield: true });
    }
  }
  const col = TYPE_COLORS[br.poke.t];
  if (br.isBoss && br.hp > 0) {
    SFX.bossHit();
    G.mega = Math.min(1, G.mega + 0.004);
    // Phase count belongs to the encounter tier. STARFIGHTER legendaries
    // split at 50% (two phases), mythicals split at ⅔/⅓ (three), and the
    // sentinels never enter this boss-only transition path.
    const phaseCount = bossPhaseCount(br);
    const fracLeft = Math.max(0, br.hp / br.maxHp);
    const newPhase = Math.min(phaseCount, 1 + Math.floor((1 - fracLeft) * phaseCount));
    if (newPhase > br.phase) {
      br.phase = newPhase;
      const lastStand = newPhase === phaseCount;
      SFX.enrage();
      G.shake = 14; G.flashT = 0.18;
      G.freeze = Math.max(G.freeze, 0.18);
      const bx3 = br.bx + G.fx, by3 = br.by + G.fy;
      burst(bx3, by3, lastStand ? '#ff5252' : '#ff8a65', 40, 420, 0.9);
      ringFx(bx3, by3, lastStand ? '#ff1744' : '#ff8a65', 10, 160, 4, 0.55);
      // shockwave ring — slow enough to weave through
      const nRing = lastStand ? 12 : 8;
      const spR = (170 + diff().lv * 10) * diff().shotSpeed;
      for (let i = 0; i < nRing; i++) {
        const a = (i / nRing) * Math.PI * 2 + (lastStand ? 0.26 : 0);
        G.enemyShots.push({ x: bx3, y: by3, vx: Math.cos(a) * spR, vy: Math.sin(a) * spR, boss: true, type: br.poke.t });
      }
      if (lastStand && !br.addsCalled) {
        br.addsCalled = true; // the last stand summons a guard ring
        const gen2 = genFor(G.level);
        const pool4 = gen2.tiers[1];
        const nAdd = 5;
        const [idA, tA] = pool4[Math.floor(gameRand() * pool4.length)];
        for (let i = 0; i < nAdd; i++) {
          const add = {
            bx: bx3 - G.fx, by: by3 - G.fy, hx: bx3 - G.fx, hy: by3 - G.fy, row: 0, col: i,
            w: Math.min(48, Math.max(34, G.brickW * 0.5)), h: Math.min(42, Math.max(30, G.brickH * 0.7)),
            hp: 2, maxHp: 2, poke: { id: idA, t: tA },
            flash: 0, wobble: gameRand() * Math.PI * 2,
          };
          if (G.mode === 'junkie') {
            // last-stand adds are the INNER counter-rotating ring — anchored
            // to the boss every update, so a teleport carries them with it
            add.bare = true;
            add.guard = { side: 1, sideF: 1, targetSide: 1, idx: i, n: nAdd, ring: 1 };
          } else {
            // Brick Breaker keeps even the boss's moving last-stand guards in
            // their frames. They orbit as dangerous bricks, never bare mons.
            if (G.mode === 'classic') add.brickOnly = true;
            add.flight = {
              kind: 'ring', state: 2, launch: 0, sq: null,
              cx: bx3, cy: Math.min(by3 + 60, H * 0.42), rx: Math.min(150, W * 0.16), ry: 90,
              spd: 1.4, phase: i / nAdd, dir: 1, strand: i % 2,
            };
          }
          G.bricks.push(add);
        }
      }
      setAnnounce('alert', lastStand ? '#ff1744' : '#ff5252',
        br.poke.n.toUpperCase() + (lastStand ? ' — LAST STAND!' : ' IS ENRAGED!'),
        lastStand ? 'RELENTLESS FIRE · GUARDS INBOUND — FINISH IT' : 'FASTER, SPREADING ATTACKS', 2.4);
      haptic('boss');
    }
  }
  if (br.hp <= 0) {
    br.dead = true;
    if (G.runStats) {
      G.runStats.bricksBroken++;
      if (br.isBoss) G.runStats.bossesDefeated++;
    }
    haptic(br.isBoss ? 'boss' : 'break');
    G.combo++;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    if (G.starter) {
      G.starterKOs = (G.starterKOs || 0) + 1;
      const chillEvery = starterMod('chillEvery', 0);
      if (chillEvery && G.starterKOs % chillEvery === 0) {
        G.starterChillT = Math.max(G.starterChillT, starterMod('chillDur', 3));
        setAnnounce('ice', '#4dd0e1', 'SNOW WARNING!', 'THE BATTLE SLOWS DOWN', 1.8);
      }
      const swarmEvery = starterMod('swarmEvery', 0);
      if (swarmEvery && G.starterKOs % swarmEvery === 0) {
        starterStrikeTargets(br, starterMod('swarmTargets', 1), 1, 'bug', '#9ccc65', 'SWARM STRIKE!');
      }
    }
    // tuned so Mega comes online roughly once per region (3 waves)
    // a squad falls briefly SILENT when its elite falls — the Galaga nod
    if (G.mode === 'junkie' && G.encounter && br.flight && br.flight.sq != null && (br.elite || 0) >= 2) {
      const Sq = G.encounter.squads[br.flight.sq];
      if (Sq) Sq.silenceT = 1.5;
    }
    // RALLY MASTER's shooter translation: kills are the only tempo there, so
    // they charge much harder (×2.5 total) — mega lands roughly every 2 waves
    const rallyKill = upgN('rally') ? (br.isBoss ? 0.04 : (G.mode !== 'classic' ? 0.012 : 0.004)) : 0;
    if (G.megaT <= 0) G.mega = Math.min(1, G.mega + (br.isBoss ? 0.12 : 0.008) + rallyKill);
    // RALLY proc: the surge ring on the rig flashes as the kill banks Mega
    if (rallyKill && G.megaT <= 0) G.surgeFlash = Math.max(G.surgeFlash || 0, 0.5);
    // SINGULARITY LENS (classic): every 5th break implodes for typed splash.
    // The counter resets FIRST, so a cascade needs five fresh kills per layer.
    if (G.mode === 'classic' && upgN('singularity') && dmg < 90 && ++G.lensKills >= 5) {
      G.lensKills = 0;
      const lensEl = G.ballElement || ((G.starter && G.starter !== 'none') ? G.starter : null);
      chargeSplash(br.bx + G.fx, br.by + G.fy, lensEl, upgN('horizon') ? 1 : 0.5);
    }
    if (br.poke.id === 25) { tone(990, 0.08, 'square', 0.06); setTimeout(() => tone(1320, 0.12, 'square', 0.05), 70); } // pika!
    if (br.poke.id === -1) { // MISSINGNO. — the item duplication glitch lives on
      setAnnounce('▒', '#b0bec5', 'MISSINGNO.', 'ITEM DUPLICATION! ×3 POWER-UPS', 2.2);
      G.score += 999;
      const ks = Object.keys(POWERS);
      for (let i = 0; i < 3; i++) {
        const p = modePower(POWERS[ks[Math.floor(gameRand() * ks.length)]]);
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
    // Shooter bosses faint as bare legendaries; Brick Breaker boss bricks
    // fracture like the oversized blocks they are.
    shatterBrick(br, br.bx + G.fx, br.by + G.fy,
      br.secretBoss || bareMon(br) || (br.isBoss && G.mode !== 'classic'));
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
    triggerBrickBehavior(br);
    // every region's arrival wave seeds a Sky Warp on the first kill —
    // an early invitation up to the high ground
    if (!G.waveFirstKill) {
      G.waveFirstKill = true;
      // Sky Warp is a ball mechanic — only seed it in classic mode
      if (stageIdx(G.level) === 0 && !br.isBoss && G.mode === 'classic') {
        G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 95, p: POWERS.warp, rot: 0, hint: G.level === 1 });
      }
    }
    // Drops: when the player is hurt, recovery gets first priority. A small
    // pity counter guarantees a potion after a run of eligible kills, so the
    // healing loop is dependable without flooding a healthy board with items.
    // Otherwise drop the usual type-keyed power-up or a catchable Poké Ball.
    const d = diff();
    if (br.isBoss && !br.secretBoss) {
      const p = modePower(POWERS[POWER_BY_TYPE[br.poke.t] || 'star']);
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 130, p, srcType: br.poke.t, rot: 0 });
      G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy - 40, vy: 110, p: { key: 'pokeball' }, dexId: br.poke.id, rot: 0 });
    } else if (!br.isBoss && br.poke.id > 0 && !br.barrier) {
      const missingHp = Math.max(0, (G.livesMax || preset().lives) - G.lives);
      if (missingHp > 0) G.healthDropPity = (G.healthDropPity || 0) + 1;
      else G.healthDropPity = 0;
      const healChance = Math.min(0.42,
        (0.055 + missingHp * 0.025) * (G.daily ? 1 : SETTINGS.drops) * (br.maxHp >= 3 ? 1.35 : 1)
        * starterMod('healChance', 1));
      if (missingHp > 0 && (G.healthDropPity >= starterMod('healPity', 10) || gameRand() < healChance)) {
        G.healthDropPity = 0;
        G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 112, p: POWERS.heal, rot: 0, hint: true });
      } else if (gameRand() < d.dropChance) {
        const p = modePower(POWERS[POWER_BY_TYPE[br.poke.t] || 'star']);
        const pu = { x: br.bx + G.fx, y: br.by + G.fy, vy: 130, p, srcType: br.poke.t, rot: 0 };
        if (G.level === 1 && G.dropHint < 2) { pu.hint = true; G.dropHint++; } // first drops get a CATCH! tag
        G.powerups.push(pu);
        // BOND FORTUNE proc: the blessed drop rate shows itself — every drop
        // born under Fortune arrives with a gold blessing ring
        if (upgN('fortune')) { ringFx(pu.x, pu.y, '#ffd54f', 4, 26, 2, 0.32); sparkle(pu.x, pu.y, 4); }
      } else if (gameRand() < d.catchChance && (G.daily || !DEX.has(br.poke.id))) {
        G.powerups.push({ x: br.bx + G.fx, y: br.by + G.fy, vy: 120, p: { key: 'pokeball' }, dexId: br.poke.id, rot: 0 });
      }
    }
    // last brick → dramatic slow-mo
    if (!G.bricks.some(b => !b.dead && !b.barrier)) G.dramaticT = 0.9;
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
    if (br.dead || br.veil) continue; // veils shrug off explosions too
    const bx = br.bx + G.fx, by = br.by + G.fy;
    if (Math.hypot(bx - x, by - y) < radius + br.w / 2) damageBrick(br, 1, bx, by, 'fire');
  }
}

// SPLASH CHARGE (IMPACT path): a charged shot detonates, damaging every brick
// in a radius. Typed by the pilot's element so matchups still apply; NOVA ROUND
// (impactX) enlarges the blast and doubles its bite (dmg 1 → 2).
function chargeSplash(x, y, element, dmg) {
  const radius = (78 + 34 * dmg) * (1 + 0.2 * upgN('blaze'));
  const col = element ? TYPE_COLORS[element] : '#ffab40';
  burst(x, y, col, 26, 340, 0.7);
  burst(x, y, '#fff3e0', 12, 200, 0.5);
  ringFx(x, y, col, 8, radius, 4, 0.4);
  G.shake = Math.min(G.shake + 5, 12);
  noiseBurst(0.22, 0.09);
  for (const br of G.bricks) {
    if (br.dead) continue;
    const bx = br.bx + G.fx, by = br.by + G.fy;
    if (Math.hypot(bx - x, by - y) < radius + br.w / 2) damageBrick(br, dmg, bx, by, element);
  }
  // SINGULARITY LENS: the detonation leaves a typed implosion that keeps
  // burning; EVENT HORIZON grows it into a gravity well that eats enemy fire
  if (upgN('singularity') && G.vortexes.length < 6) {
    const horizon = !!upgN('horizon');
    G.vortexes.push({ x, y, element, t: 0, dur: horizon ? 1.5 : 0.9, tick: 0.24,
      r: radius * (horizon ? 1.15 : 0.75), dmg: horizon ? 0.5 : 0.4, horizon });
  }
}
// is this block out of its box and flying a pattern?
function flying(br) { return !!(br.flight && br.flight.state >= 1); }
// is this a BARE Pokémon (no box around it) — flyer, diver, or once-dived?
// bare mons faint when killed instead of shattering a card.
function bareMon(br) {
  if (G.mode === 'classic' || br.brickOnly) return false;
  return !br.isBoss && !!(br.bare || br.dive || (br.flight && br.flight.state >= 1));
}

// ---- the flight pattern library: ~30 curves & formations the free-flying
// Pokémon ride, nose to tail (Space Junkie / Galaga / Galaxian canon). Two
// families: FORMATION-HOLDERS (ring/oval/lane/chevron/arc/cross/carousel/
// phalanx/…) keep a crisp silhouette while the whole body drifts or rotates —
// riders never cross; and BUSY CURVES (inf/liss/rose/star/vortex/spiral/clover/
// butterfly/…) that pass through a shared center — the separation solver packs
// those so they stay distinct. Early regions unlock the clean formation set;
// the busy showpieces come later (see the `kinds` list in state.js). ----
// change a rider's pattern speed WITHOUT teleporting it: flightPos scales
// ABSOLUTE time by spd, so an instant spd change would jump the rider to a
// different point on its curve — re-base the phase to keep it continuous
function setFlightSpd(F, newSpd) {
  const tAbs = G.swayT * G.pathSpeed;
  F.phase += tAbs * (F.dir || 1) * ((F.spd || 1) - newSpd);
  F.spd = newSpd;
}

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
    // ---- formation-holding shapes (Galaga/Galaxian canon): the flock keeps a
    // crisp silhouette and the WHOLE body drifts/rotates, so riders never cross
    case 'chevron': { // a V / arrowhead of wings (geese) that sways side to side
      const u = F.phase - 0.5; // -0.5..0.5 across the two wings
      const sway = Math.sin(t * Math.PI * 2) * F.rx * 0.22;
      return { x: F.cx + u * F.rx * 2 + sway,
        y: F.cy - F.ry * 0.7 + Math.abs(u) * F.ry * 1.8 + Math.cos(t * Math.PI * 2) * F.ry * 0.12 };
    }
    case 'arc': { // a shallow dome / rainbow that slides across the airspace —
      // riders spaced EVENLY across the full span (a parabola holds the dome)
      const u = F.phase - 0.5;
      const drift = Math.sin(t * Math.PI * 2) * F.rx * 0.22;
      return { x: F.cx + u * F.rx * 2 + drift, y: F.cy - (1 - 4 * u * u) * F.ry };
    }
    case 'cross': { // a rigid plus/cross of four arms, turning slowly
      const arm = Math.floor(((F.phase * 4) % 4 + 4) % 4);
      const along = 0.28 + 0.72 * ((F.phase * 4) % 1); // center → tip
      const A = arm * Math.PI / 2 + t * Math.PI * 2 * 0.35;
      return { x: F.cx + Math.cos(A) * along * F.rx, y: F.cy + Math.sin(A) * along * F.ry };
    }
    case 'carousel': { // two concentric rings turning together — a wheel-in-wheel
      const rr = F.strand ? 0.52 : 1; // odd riders take the inner ring
      return { x: F.cx + c * F.rx * rr, y: F.cy + s * F.ry * rr };
    }
    case 'phalanx': { // a rigid rectangular block that slides side-to-side and
      // gently bobs — Space Invaders' marching grid, as a flock
      const n = F.n || 8, cols = Math.max(3, Math.round(Math.sqrt(n * 2)));
      const idx = Math.round(F.phase * (n - 1));
      const rows = Math.max(1, Math.ceil(n / cols));
      const gx = (idx % cols) - (cols - 1) / 2, gy = Math.floor(idx / cols) - (rows - 1) / 2;
      return { x: F.cx + gx * F.rx * 0.42 + Math.sin(t * Math.PI * 2) * F.rx * 0.4,
        y: F.cy + gy * F.ry * 0.5 + Math.abs(Math.cos(t * Math.PI * 2)) * F.ry * 0.12 };
    }
    // ---- busy showpieces (later regions): riders cross a shared center, the
    // separation solver packs them so they stay distinct
    case 'spiral': { // an Archimedean spiral arm turning like a pinwheel galaxy
      const rr = 0.25 + 0.75 * F.phase;
      const ang = F.phase * Math.PI * 2 * 2.2 + t * Math.PI * 2;
      return { x: F.cx + Math.cos(ang) * F.rx * rr, y: F.cy + Math.sin(ang) * F.ry * rr };
    }
    case 'clover': // three-petal rose (trefoil)
      return { x: F.cx + Math.cos(th * 3) * c * F.rx, y: F.cy + Math.cos(th * 3) * s * F.ry };
    case 'butterfly': { // the butterfly curve — a slow, gorgeous, busy bloom
      const rr = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin(th / 12), 5);
      return { x: F.cx + Math.sin(th) * rr * F.rx * 0.28, y: F.cy - Math.cos(th) * rr * F.ry * 0.28 };
    }
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
function spawnRiftShard(index, x = W / 2, y = Math.max(105, H * 0.22)) {
  if (!secretEligible() || index < 0 || index > 2 || G.secret.shards[index] ||
      G.secret.offered[index] || G.secret.pendingShard != null) return null;
  const pu = {
    x, y, vy: 72, p: RIFT_SHARD, rot: index * 1.7,
    secretShard: true, shardIndex: index, secretT: 9.5, hint: true,
  };
  G.secret.offered[index] = true;
  G.secret.pendingShard = index;
  G.powerups.push(pu);
  // The collection beat is safe and deliberate: no leftover volley can steal
  // a life while the player is reading the shard reveal.
  G.enemyShots = []; G.telegraphs = []; G.columnStrikes = [];
  const found = secretShardCount();
  setAnnounce('fairy', '#d780ff', 'A RIFT SHARD APPEARED',
    'CATCH PIECE ' + (index + 1) + '/3 TO REWRITE KANTO\'S FINAL ROUND', 3,
    found ? 'RIFT KEY · ' + found + '/3 PIECES HELD' : 'THE FIRST ARC IS HIDING SOMETHING');
  SFX.mega();
  ringFx(x, y, '#d780ff', 10, 150, 4, 0.65);
  return pu;
}
function collectPickup(pu) {
  if (G.runStats) G.runStats.itemsCaught++;
  haptic('item');
  webPickupProcs(); // RESCUE / SALVAGE / GUARDIAN pickup economy
  if (pu.p && (pu.p.key === 'heal' || pu.p.key === 'pokeball')) webGuardianCharge();
  if (pu.secretShard || pu.p.key === 'riftShard') {
    const i = Math.max(0, Math.min(2, pu.shardIndex || 0));
    G.secret.shards[i] = true;
    G.secret.pendingShard = null;
    const held = secretShardCount();
    G.score += [400, 600, 1000][i];
    burst(pu.x, pu.y, '#d780ff', 34, 340, 0.9);
    ringFx(pu.x, pu.y, '#80d8ff', 12, 210, 5, 0.75);
    sparkle(pu.x, pu.y, 12, true);
    G.freeze = Math.max(G.freeze, 0.12);
    G.shake = Math.max(G.shake, 9);
    SFX.mega();
    if (held === 3) {
      setAnnounce('fairy', '#ffffff', 'RIFT KEY COMPLETE!',
        'THE NORMAL MEW ROUND HAS BEEN REPLACED', 3.5,
        'SECRET ROUND · MEW VMAX IS BREAKING THROUGH');
    } else {
      setAnnounce('fairy', '#d780ff', 'RIFT SHARD ' + held + '/3 SECURED',
        i === 0 ? 'A SECOND PIECE IS HIDDEN IN KANTO\'S CHALLENGE'
          : 'THE LAST PIECE RESTS BEYOND MEWTWO', 2.8,
        '+' + [400, 600, 1000][i] + ' · KEEP THE SET INTACT');
    }
  } else if (pu.p.key === 'element') {
    // pure element swap — no other effect, just fixes your matchup.
    // SPACE JUNKIE type changes are shorter-lived: they revert to the
    // pilot's base type on a visible timer
    G.ballElement = pu.p.t;
    G.ballElementT = (G.mode === 'junkie' ? 20 : 30) * (1 + 0.5 * upgN('attune')); // PRISM: ATTUNE
    G.resistStreak = 0;
    SFX.power();
    burst(pu.x, pu.y, TYPE_COLORS[pu.p.t], 16, 200);
    // PRISM SCALE proc: the extended clock is announced AT the pickup — the
    // tier stops being an invisible multiplier on a timer nobody reads
    if (upgN('attune')) addFloater(pu.x, pu.y - 22, 'ATTUNED · +50% DURATION', '#4dd0e1', 11);
    const strong = (EFFECTIVE[pu.p.t] || []).slice(0, 3).join(', ').toUpperCase();
    setAnnounce(pu.p.t, TYPE_COLORS[pu.p.t], pu.p.t.toUpperCase() + ' BALL',
      strong ? '2× vs ' + strong : 'ELEMENT CHANGED', 1.8);
  } else if (pu.p.key === 'pokeball') {
    // trial runs are a sandbox — catches don't touch the real Pokédex
    const isNew = !G.trial && !G.daily && addToDex(pu.dexId, pu.shiny);
    G.caughtRun++;
    SFX.gotcha();
    burst(pu.x, pu.y, pu.shiny ? '#ffd700' : '#ef5350', 18, 220);
    sparkle(pu.x, pu.y, pu.shiny ? 12 : 6, pu.shiny);
    if (upgN('bond')) {
      G.catchBonus += 0.06 * upgN('bond');
      addFloater(pu.x, pu.y - 26, 'BOND +' + Math.round(G.catchBonus * 100) + '% SCORE', '#ffd54f', 12);
    }
    const nm = (NAMES[pu.dexId] || 'POKÉMON').toUpperCase();
    const research = isNew ? dexRewardAt(DEX.size) : null;
    if (research) {
      setAnnounce(research.icon, research.color, research.name + ' UNLOCKED!',
        research.desc, 3.1, DEX.size + ' POKÉMON RESEARCHED', pu.dexId, pu.shiny);
      SFX.mega();
    } else {
      setAnnounce(null, pu.shiny ? '#ffd700' : isNew ? '#66bb6a' : '#ef5350',
        (pu.shiny ? 'SHINY ' : '') + nm + ' CAUGHT!',
        (G.trial || G.daily) ? (G.daily ? 'DAILY — CATCH NOT REGISTERED · +250 PTS' : 'TRIAL — CATCH NOT REGISTERED · +250 PTS')
          : isNew ? 'NEW! ADDED TO YOUR POKÉDEX · +100 PTS' : 'ALREADY IN YOUR POKÉDEX · +250 PTS',
        2.2, null, pu.dexId, pu.shiny);
    }
    G.score += isNew ? 100 : 250;
  } else {
    applyPower(pu.p, pu.srcType);
    burst(pu.x, pu.y, pu.p.color, 16, 200);
  }
}

// signature legendary mechanics — each region's boss fights differently
function bossAbility(boss) {
  const id = boss.poke.id;
  const ab = boss.secretBoss ? { name: 'MAX MIRAGE', cd: 5.4 }
    : boss.mythic ? (MYTHIC_ABILITIES[id] || { name: 'MYTHIC BLINK', cd: 5 })
      : BOSS_ABILITIES[id] || null;
  if (!ab) return;
  const bx = boss.bx + G.fx, by = boss.by + G.fy;
  if (boss.secretBoss) {
    // A readable VMAX pattern: blink, then a seven-shot psychic halo with a
    // conspicuous safe lane aimed at the player. It asks for movement without
    // turning the secret reward into a bullet-hell tax.
    burst(bx, by, '#d780ff', 34, 360, 0.75);
    const lim = Math.min(W * 0.28, boss.w / 2 + 28);
    boss.hx = lim + gameRand() * Math.max(1, W - lim * 2) - G.fx;
    boss.bx = boss.hx; boss.flash = 1;
    const nx = boss.bx + G.fx;
    burst(nx, by, '#80d8ff', 34, 360, 0.75);
    const aim = Math.atan2(shipY() - by, G.paddle.x - nx);
    const sp = (185 + diff().lv * 9) * diff().shotSpeed;
    for (let i = 0; i < 8; i++) {
      if (i === 4) continue; // open lane through the center of the fan
      const a = aim + (i - 4) * Math.PI * 2 / 8;
      G.enemyShots.push({ x: nx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        boss: true, type: 'psychic', r: 12 });
    }
    ringFx(nx, by, '#ffffff', 10, 170, 4, 0.55);
    tone(980, 0.2, 'sine', 0.07, -480);
  } else switch (id) {
    case 151: { // Mew: a rotating halo with one generous missing spoke
      const lim = boss.w / 2 + 24;
      boss.hx = lim + gameRand() * Math.max(1, W - lim * 2) - G.fx; boss.bx = boss.hx;
      const sp = (190 + diff().lv * 8) * diff().shotSpeed, rot = G.time * 0.7;
      for (let i = 0; i < 8; i++) if (i !== 5) {
        const a = rot + i * Math.PI / 4;
        G.enemyShots.push({ x: boss.bx + G.fx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, boss: true, type: 'psychic' });
      }
      ringFx(boss.bx + G.fx, by, '#ff80ab', 8, 145, 4, 0.5); break;
    }
    case 251: { // Celebi: slows time, then plants a slow spiralling seed bloom
      G.timeWarpT = 2.4;
      const sp = 145 * diff().shotSpeed;
      for (let i = 0; i < 5; i++) { const a = G.time + i * Math.PI * 2 / 5; G.enemyShots.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, boss: true, type: 'grass', r: 12 }); }
      ringFx(bx, by, '#9ccc65', 10, 180, 4, 0.7); break;
    }
    case 385: { // Jirachi: three readable falling-star lanes
      const gap = Math.min(120, W * 0.16);
      for (const off of [-gap, 0, gap]) G.columnStrikes.push({ x: Math.max(28, Math.min(W - 28, G.paddle.x + off)), w: 34, warn: 1.15, strike: 0.26, color: '#ffd54f' });
      break;
    }
    case 491: { // Darkrai: vanishes, crosses behind you, returns with a dark fan
      boss.phaseT = 1.5;
      boss.hx = Math.max(boss.w / 2, Math.min(W - boss.w / 2, W - G.paddle.x)) - G.fx; boss.bx = boss.hx;
      G.telegraphs.push({ br: boss, boss: true, fan: true, t: 0.85, max: 0.85 });
      burst(boss.bx + G.fx, by, '#5c4b8a', 28, 280, 0.7); break;
    }
    case 494: { // Victini: a fast victory lap leaves a five-way flame wake
      boss.sweep = { dir: G.paddle.x > bx ? 1 : -1, t: 1.8, fast: true };
      const aim = Math.atan2(shipY() - by, G.paddle.x - bx), sp = 225 * diff().shotSpeed;
      for (const off of [-0.5, -0.25, 0, 0.25, 0.5]) G.enemyShots.push({ x: bx, y: by, vx: Math.cos(aim + off) * sp, vy: Math.sin(aim + off) * sp, boss: true, type: 'fire' });
      break;
    }
    case 719: { // Diancie: crystal facets close around the player's lane
      const gap = Math.min(105, W * 0.14);
      for (const off of [-gap, gap]) G.columnStrikes.push({ x: Math.max(30, Math.min(W - 30, G.paddle.x + off)), w: 48, warn: 1.2, strike: 0.42, color: '#f8bbd0' });
      G.columnStrikes.push({ x: G.paddle.x, w: 26, warn: 1.65, strike: 0.28, color: '#80d8ff' }); break;
    }
    case 802: { // Marshadow: short, direct rush followed by a tight combo
      boss.sweep = { dir: G.paddle.x > bx ? 1 : -1, t: 1.15, fast: true };
      G.telegraphs.push({ br: boss, boss: true, fan: true, t: 0.48, max: 0.48 }); break;
    }
    case 893: { // Zarude: heavy vine fan from alternating arena flanks
      boss.hx = (boss.hx < W / 2 ? W * 0.74 : W * 0.26) - G.fx; boss.bx = boss.hx;
      const aim = Math.atan2(shipY() - by, G.paddle.x - (boss.bx + G.fx)), sp = 165 * diff().shotSpeed;
      for (const off of [-0.7, -0.35, 0, 0.35, 0.7]) G.enemyShots.push({ x: boss.bx + G.fx, y: by, vx: Math.cos(aim + off) * sp, vy: Math.sin(aim + off) * sp, boss: true, type: 'grass', r: 13 });
      break;
    }
    case 1025: { // Pecharunt: mirror-steps and hangs a crooked poison wheel
      boss.hx = Math.max(boss.w / 2, Math.min(W - boss.w / 2, W - G.paddle.x)) - G.fx; boss.bx = boss.hx;
      const sp = 180 * diff().shotSpeed;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + (i % 2 ? 0.2 : -0.2); G.enemyShots.push({ x: boss.bx + G.fx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, boss: true, type: 'poison', r: 12 }); }
      break;
    }
    case 150: { // Mewtwo: teleport — a 0.5s anticipation (guards compress,
      // psychic flash) THEN the jump, so the wings vanish and reform WITH it
      burst(bx, by, '#ec407a', 20, 260, 0.5);
      const lim = boss.w / 2 + 20;
      boss.tpX = lim + gameRand() * (W - lim * 2) - G.fx;
      boss.teleportAt = 0.5;
      boss.reformT = 1.0; // compress now, reform after the jump
      tone(880, 0.18, 'sine', 0.06, -400);
      break;
    }
    case 249: // Lugia: gusting winds curve the ball
      G.gustT = 4;
      tone(180, 0.6, 'sawtooth', 0.06, 220);
      break;
    case 384: // Rayquaza: crosses the playfield
      boss.sweep = { dir: gameRand() < 0.5 ? -1 : 1, t: 2.6 };
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
    default:
      if (boss.mythic) { // MYTHIC BLINK: vanish, reappear, radial burst
        burst(bx, by, '#ff80ab', 26, 300, 0.6);
        const lim2 = boss.w / 2 + 24;
        boss.hx = lim2 + gameRand() * (W - lim2 * 2) - G.fx;
        boss.bx = boss.hx;
        boss.flash = 1;
        burst(boss.bx + G.fx, by, '#ff80ab', 26, 300, 0.6);
        const nR = 6, spR2 = (200 + diff().lv * 10) * diff().shotSpeed;
        for (let i2 = 0; i2 < nR; i2++) {
          const a2 = (i2 / nR) * Math.PI * 2 + gameRand() * 0.4;
          G.enemyShots.push({ x: boss.bx + G.fx, y: by, vx: Math.cos(a2) * spR2, vy: Math.sin(a2) * spR2, boss: true, type: boss.poke.t });
        }
        tone(920, 0.16, 'sine', 0.06, -420);
      }
      break;
  }
  addFloater(boss.bx + G.fx, by - boss.h / 2 - 44, ab.name + '!', TYPE_COLORS[boss.poke.t], 16);
}

// Deal (or re-deal) the between-wave draft on the UPGRADE WEB. The hand
// follows a COMMIT / ADAPT / EXPLORE shape:
//  • COMMIT — continue the most-invested eligible path (build bias).
//  • ADAPT — survival/utility, force-weighted at low health.
//  • EXPLORE — an eligible SUPERSKILL takes the slot with priority, then a
//    Form II bridge, then an uninvested constellation.
// Guarantees: offense + non-offense while both groups remain; a fresh
// evolution surfaces a newly unlocked ring node; a reroll never re-deals the
// hand it replaced (when alternatives exist); reachable nodes unseen for 4+
// drafts gain pity weight; mastery satellites only fill EMPTY slots — never
// crowding out an authored node — capped-wedge satellites first.
function rollUpgradeChoices() {
  const rerolledFrom = G.rerolled ? (G.lastOfferKeys || []) : [];
  const bridges = WEB_BRIDGES.filter(bridgeEligible);
  const supers = WEB_SUPERS.filter(superEligible);
  const needDefense = G.lives < Math.max(2, Math.ceil((G.livesMax || preset().lives) * 0.6));
  const seen = G.webSeen || (G.webSeen = {});
  const pity = key => Math.min(3, Math.max(0, (seen[key] || 0) - 3));
  const avoid = key => rerolledFrom.includes(key) ? 9 : 0;
  const contKey = k => 'path:' + k + ':' + pathLvl(k);
  const scoreCont = k =>
    pathLvl(k) * 4 + gameRand() * 2 + pity(contKey(k)) - avoid(contKey(k)) +
    (needDefense && ['defense', 'utility'].includes(PATHS[k].family) ? 5 : 0) +
    (G.mode === 'classic' && PATHS[k].family === 'offense' && pathLvl(k) === 2 ? 4 : 0);
  const rankedCont = PATH_KEYS.filter(k => pathLvl(k) < 4)
    .map(k => ({ k, s: scoreCont(k) })).sort((a, b) => b.s - a.s).map(x => x.k);
  const picked = [], webPicked = [], used = new Set();
  const takeCont = pred => {
    const k = rankedCont.find(kk => !used.has(kk) && (!pred || pred(kk)));
    if (!k) return false;
    used.add(k); picked.push(k); return true;
  };
  // EXPLORE — supers outrank bridges outrank fresh constellations. A fresh
  // evolution (Form II/III just reached) hard-guarantees the new ring here.
  const freshForm = webForm() > (G.lastDraftForm || 1);
  if (supers.length) {
    const s = supers.map(d => ({ d, s: 8 + pity(d.key) - avoid(d.key) + gameRand() * 2 }))
      .sort((a, b) => b.s - a.s)[0].d;
    webPicked.push({ def: s, kind: 'super' });
  } else if (bridges.length && (freshForm || !rankedCont.length || gameRand() < 0.75)) {
    const b = bridges.map(d => ({ d, s: 6 + pity(d.key) - avoid(d.key) + gameRand() * 2 }))
      .sort((a, b) => b.s - a.s)[0].d;
    webPicked.push({ def: b, kind: 'bridge' });
  } else {
    takeCont(k => pathLvl(k) === 0) || takeCont();
  }
  // COMMIT — deepen an invested route; ADAPT — survival/utility, but only
  // FORCED when health is low (otherwise the top-ranked option keeps reroll
  // hands honestly fresh — scoring already leans defensive at low health)
  takeCont(k => pathLvl(k) >= 1) || takeCont();
  if (needDefense) takeCont(k => ['defense', 'utility'].includes(PATHS[k].family)) || takeCont();
  else takeCont();
  // offense/non-offense guard while both groups remain among continuations
  for (const wantOffense of [true, false]) {
    const has = picked.some(k => (PATHS[k].family === 'offense') === wantOffense);
    const avail = rankedCont.some(k => !used.has(k) && (PATHS[k].family === 'offense') === wantOffense);
    if (!has && avail) {
      if (picked.length + webPicked.length >= 3 && picked.length) { used.delete(picked[picked.length - 1]); picked.pop(); }
      takeCont(k => (PATHS[k].family === 'offense') === wantOffense);
    }
  }
  // top up: remaining continuations, then any remaining authored web nodes
  while (picked.length + webPicked.length < 3) {
    if (takeCont()) continue;
    const s2 = supers.find(s => !webPicked.some(w => w.def.key === s.key));
    const b2 = bridges.find(b => !webPicked.some(w => w.def.key === b.key));
    if (s2) webPicked.push({ def: s2, kind: 'super' });
    else if (b2) webPicked.push({ def: b2, kind: 'bridge' });
    else break;
  }
  const choices = [
    ...picked.map(k => {
      const tierIdx = pathLvl(k);
      return { pathKey: k, path: PATHS[k], tier: PATHS[k].tiers[tierIdx], tierIdx,
        tags: tierTags(k, tierIdx), synergy: tierSynergy(k, tierIdx), comparison: tierComparison(k, tierIdx) };
    }),
    ...webPicked.map(w => ({
      web: w.def, webKind: w.kind,
      tags: w.kind === 'super' ? ['SUPERSKILL', 'FINAL FORM']
        : [PATHS[w.def.paths[0]].name, PATHS[w.def.paths[1]].name],
      synergy: w.kind === 'super'
        ? 'RECIPE: ' + webBridge(w.def.bridge).name + ' + THE ' + PATHS[w.def.path].name + ' CAPSTONE'
        : 'BRIDGES ' + PATHS[w.def.paths[0]].name + ' AND ' + PATHS[w.def.paths[1]].name,
      comparison: w.kind === 'super' ? '★ RULE CHANGE · FINAL FORM' : 'NEW SYSTEM · FORM II BRIDGE',
    })),
  ];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(gameRand() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  // mastery satellites fill EMPTY slots only — capped home wedges first, so
  // the late run always has a useful pick without burying authored content
  if (choices.length < 3) {
    const sats = WEB_SATELLITES.map(sat => ({ sat, item: stackItem(sat.stackKey) }))
      .sort((a, b) => (pathLvl(b.sat.path) >= 4 ? 1 : 0) - (pathLvl(a.sat.path) >= 4 ? 1 : 0) + gameRand() - 0.5);
    for (const { item } of sats) if (choices.length < 3) choices.push({ stack: item });
  }
  // pity + reroll memory: every eligible node not in this hand ages a draft
  const handKeys = choices.map(c => c.pathKey ? contKey(c.pathKey) : c.web ? c.web.key : 'stack:' + c.stack.key);
  for (const key of [
    ...rankedCont.map(contKey),
    ...bridges.map(b => b.key), ...supers.map(s => s.key),
  ]) seen[key] = handKeys.includes(key) ? 0 : (seen[key] || 0) + 1;
  G.lastOfferKeys = handKeys;
  G.lastDraftForm = webForm();
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
  G.hurtHud = 2.2;   // flash the health readout around the player
  addFloater(G.paddle.x, y - 46, 'SHIELD!', '#66bb6a', 15);
  burst(x, y, '#66bb6a', 18, 240, 0.5);
  ringFx(G.paddle.x, y, '#a5d6a7', 6, 64, 3, 0.4);
  SFX.shield();
  // REACTIVE OVERDRIVE: the break feeds the Mega ring — gold surge on the rig
  if (upgN('reactive') && G.megaT <= 0) {
    G.mega = Math.min(1, G.mega + 0.15);
    G.surgeFlash = 1;
    addFloater(G.paddle.x, y - 64, '+15% MEGA', '#dce775', 12);
  }
  webGuardianCharge(); // GUARDIAN ANGEL counts shield saves
  return true;
}

// ---- pickup-economy bridges: RESCUE CIRCUIT + SALVAGE DRONES (and the
// GUARDIAN ANGEL superskill) all key off collection — one shared hook so
// every collection path counts exactly once.
function webPickupProcs() {
  if (upgN('rescue') && ++G.rescueN >= 8) {
    G.rescueN = 0;
    if (G.shieldCharges < shieldCap()) {
      G.shieldCharges++;
      ringFx(G.paddle.x, shipY(), '#ff8a80', 5, 54, 3, 0.4);
      addFloater(G.paddle.x, shipY() - 34, 'RESCUE SHIELD!', '#ff8a80', 12);
      SFX.shield();
    }
  }
  if (upgN('salvage') && ++G.salvageCount >= 3) {
    G.salvageCount = 0;
    launchSalvageDrones();
  }
}
function launchSalvageDrones() {
  if (G.mode === 'classic') {
    // classic stays ball-first: drones bank up to two stored INTERCEPTS that
    // eat the next enemy shots aimed at you — never a free blaster
    if (G.salvageStored < 2) {
      G.salvageStored++;
      addFloater(G.paddle.x, shipY() - 46, 'DRONES ON STATION ×' + G.salvageStored, '#ea80fc', 12);
      tone(720, 0.1, 'sine', 0.05, 140);
    }
    return;
  }
  const el = attackElement();
  for (const dir of [-1, 1]) {
    G.missiles.push({ x: G.paddle.x + dir * 26, y: shipY() - 8, vx: dir * 200, vy: -260, tier: 1, drone: true, element: el });
  }
  addFloater(G.paddle.x, shipY() - 46, 'SALVAGE VOLLEY!', '#ea80fc', 12);
  SFX.missile();
}
// GUARDIAN ANGEL (superskill): potions, catches, and shield saves each add a
// charge; at six the guardian pulse sweeps the sky clear and heals one life.
function webGuardianCharge() {
  if (!upgN('guardian')) return;
  G.guardCharge = (G.guardCharge || 0) + 1;
  if (G.guardCharge >= 6) {
    G.guardCharge = 0;
    for (const s of G.enemyShots) if (!s.boss) s.dead = true;
    if (G.lives < Math.max(1, G.livesMax)) { G.lives++; G.hurtHud = 2.6; }
    ringFx(G.paddle.x, shipY(), '#b9f6ca', 12, 230, 6, 0.7);
    ringFx(G.paddle.x, shipY(), '#f8bbd0', 8, 160, 4, 0.55);
    sparkle(G.paddle.x, shipY() - 30, 10, true);
    addFloater(G.paddle.x, shipY() - 70, 'GUARDIAN ANGEL!', '#b9f6ca', 16);
    SFX.mega();
  } else {
    addFloater(G.paddle.x, shipY() - 30, 'GUARDIAN ' + G.guardCharge + '/6', '#b9f6ca', 10);
  }
}
// METEOR MATRIX (superskill): a delayed rain of six typed strikes across the
// living wave — shooter modes call it on a full charge, classic on Mega.
function beginMeteorRain() {
  G.meteorRain = { n: 6, t: 0.15, element: attackElement() };
  addFloater(G.paddle.x, shipY() - 74, 'METEOR MATRIX!', '#40c4ff', 14);
}

function favoriteRunPath() {
  const ranked = PATH_KEYS.map(k => ({ k, n: pathLvl(k) })).sort((a, b) => b.n - a.n);
  return ranked[0] && ranked[0].n ? PATHS[ranked[0].k].name + ' · TIER ' + ranked[0].n : 'NO PATH YET';
}
function finalizeRun() {
  const oldBest = G.daily ? dailyBest() : G.best;
  let newRecord = false;
  if (G.daily && !G.cheated) newRecord = recordDailyScore(G.score);
  else if (!G.trial && !G.cheated && G.score > G.best) {
    G.best = G.score; saveStore('pkbrk-best', G.best); newRecord = true;
  }
  const rs = G.runStats || {};
  G.runSummary = {
    region: genFor(G.level).name, stage: stageIdx(G.level) + 1, level: G.level,
    score: G.score, newRecord, priorBest: oldBest,
    bestRally: G.bestRally, maxCombo: G.maxCombo, catches: G.caughtRun,
    bricks: rs.bricksBroken || 0, bosses: rs.bossesDefeated || 0,
    items: rs.itemsCaught || 0, hits: rs.damageTaken || 0,
    path: favoriteRunPath(), cause: G.lastDamageCause || 'RUN ENDED', mode: G.mode,
  };
}

function loseLife(cause = 'MISSED BALL') {
  const dodge = starterMod('dodge', 0);
  if (dodge && gameRand() < dodge) {
    G.invuln = Math.max(G.invuln, 1.1);
    addFloater(G.paddle.x, shipY() - 42, 'PHASE SHIFT!', '#b388ff', 16);
    ringFx(G.paddle.x, shipY(), '#b388ff', 6, 78, 3, 0.45);
    tone(540, 0.18, 'sine', 0.06, 220);
    return;
  }
  // IMMORTAL REACTOR (superskill): once per wave, the reactor eats a lethal
  // hit by draining the Mega meter (needs 25%+ banked) — the armored core
  // cracks, flares, and a counterburst clears ordinary enemy fire.
  if (upgN('immortal') && !G.reactorUsed && G.megaT <= 0 && G.mega >= 0.25 && G.state === 'play') {
    G.reactorUsed = true;
    G.mega = 0;
    G.invuln = Math.max(G.invuln, 1.6);
    for (const s of G.enemyShots) if (!s.boss) s.dead = true;
    ringFx(G.paddle.x, shipY(), '#ffea00', 10, 190, 6, 0.6);
    ringFx(G.paddle.x, shipY(), '#69f0ae', 6, 120, 4, 0.5);
    burst(G.paddle.x, shipY(), '#ffea00', 30, 360, 0.7);
    addFloater(G.paddle.x, shipY() - 58, 'IMMORTAL REACTOR!', '#ffea00', 16);
    G.shake = Math.min(G.shake + 8, 14);
    SFX.mega();
    return;
  }
  G.lastDamageCause = cause;
  if (G.runStats) G.runStats.damageTaken++;
  haptic('damage');
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
    // KNOCKOUT: the build absorbs the defeat. Burn two web LEAVES (nodes with
    // no owned dependents — a removal can never orphan a bridge or a
    // superskill's recipe), refill lives, and retry this wave — the run only
    // truly ends once there's nothing left to burn.
    if (totalBuildLevels() > 0) {
      const lost = [];
      for (let i = 0; i < 2 && totalBuildLevels() > 0; i++) {
        const leaves = webRegressibleLeaves();
        if (!leaves.length) break;
        const name = regressWebLeaf(leaves[Math.floor(gameRand() * leaves.length)]);
        if (name) lost.push(name);
      }
      G.lives = preset().lives + starterMod('bonusHp', 0);
      G.livesMax = Math.max(G.livesMax, G.lives);
      G.shieldCharges = Math.min(G.shieldCharges, shieldCap());
      SFX.gameOver();
      buildLevel(G.level);
      serve();
      setAnnounce('alert', '#ff8a65', 'KNOCKED OUT!',
        'THE TREE ABSORBED IT — LOST: ' + lost.join(' · '), 3.6, 'RETRYING THE WAVE WITH FULL LIVES');
      return;
    }
    G.state = 'gameover'; G.stateT = 0;
    SFX.gameOver();
    finalizeRun();
  } else {
    G.hurtHud = 2.4; // show the remaining health around the player on respawn
    serve();
  }
}

// ---- sprite kinematics: velocity, facing, bank and gait phase live HERE,
// dt-smoothed (identical at 60 Hz and 120 Hz) — render only READS them.
// (They used to be derived in render from position-delta × 60, which tied
// banking and animation speed to the display's refresh rate.)
// ---- SENTINEL specials (top-level: shared by update + trial jumps): each sub-legendary attacks BY ITS TYPE ----
const SUB_ABILITY_NAMES = {
  ice: 'FROST FAN', electric: 'BOLT STRIKE', fire: 'EMBER RAIN',
  water: 'TIDAL LINE', rock: 'BOULDER TOSS', steel: 'FLASH CANNON',
  psychic: 'WARP PULSE', grass: 'SPORE BURST', dragon: 'DRAGON PULSE',
  ground: 'FISSURE', fairy: 'DAZZLE', fighting: 'AURA SPHERE',
};
function subAbility(br2) {
  const t3 = br2.poke.t;
  const bx2 = br2.bx + G.fx, by2 = br2.by + G.fy + br2.h / 2;
  const dd = diff();
  const sp4 = (230 + dd.lv * 14) * dd.shotSpeed;
  const aim = Math.atan2(shipY() - by2, G.paddle.x - bx2);
  const push = (a3, m2, extra) => G.enemyShots.push(Object.assign(
    { x: bx2, y: by2, vx: Math.cos(a3) * sp4 * m2, vy: Math.sin(a3) * sp4 * m2, type: t3 }, extra));
  switch (t3) {
    case 'ice': // a wide, slow wall of frost
      for (const off of [-0.45, -0.15, 0.15, 0.45]) push(aim + off, 0.62, { heavy: true, r: 14 });
      break;
    case 'electric': // column lightning at your position (Zekrom's trick)
      G.columnStrikes.push({ x: G.paddle.x, w: 46, warn: 0.9, strike: 0.3, color: '#80d8ff' });
      tone(1200, 0.25, 'square', 0.04, -800);
      break;
    case 'fire': { // ember rain: a curtain of fireballs beneath its wings
      for (const k2 of [-1.5, -0.5, 0.5, 1.5]) {
        G.enemyShots.push({ x: bx2 + k2 * 48, y: by2, vy: sp4 * 0.78, type: t3, r: 12 });
      }
      break;
    }
    case 'water': // a low, fast three-shot wave
      for (const off of [-0.18, 0, 0.18]) push(aim + off, 1.05);
      break;
    case 'rock': case 'ground': // two heavy, slow, splashing boulders
      for (const off of [-0.14, 0.14]) push(aim + off, 0.55, { heavy: true, r: 17, splash: true });
      break;
    case 'steel': // one precise, very fast shot
      push(aim, 1.6, { r: 12 });
      break;
    case 'psychic': case 'fairy': { // warp pulse: blink + a 4-shot ring
      burst(bx2, by2 - br2.h / 2, '#ec407a', 20, 260, 0.5);
      br2.bx = 90 + gameRand() * (W - 180) - G.fx;
      br2.flash = 1;
      for (let k2 = 0; k2 < 4; k2++) push((k2 / 4) * Math.PI * 2 + 0.4, 0.8);
      break;
    }
    case 'grass': // spore burst: a slow five-shot bloom
      for (let k2 = 0; k2 < 5; k2++) push((k2 / 5) * Math.PI * 2, 0.55, { r: 12 });
      break;
    default: // dragon/fighting/others: a hard three-shot pulse
      for (const off of [-0.2, 0, 0.2]) push(aim + off, 1.2);
  }
  addFloater(br2.bx + G.fx, br2.by + G.fy - br2.h / 2 - 26,
    (SUB_ABILITY_NAMES[t3] || 'ONSLAUGHT') + '!', TYPE_COLORS[t3], 14);
  SFX.enemyShot();
}
// ---- SENTINEL choreography: the trio cycles through THREE formations on
// one clock — a rotating triangle, a sweeping battle line, and spread
// sentry posts — never parked, each bird springing between eased slots.
// Called from update() each frame.
function updateSentinels(dt, ts) {
  if (!G.gauntlet || G.gauntlet.phase !== 0 || (G.state !== 'play' && G.state !== 'serve')) return;
  if (G.gauntlet.entry?.role === 'sentinel') return;
  const gj2 = G.gauntlet;
  gj2.subT += dt * ts;
  const t4 = gj2.subT;
  const formIdx = Math.floor(t4 / 8) % 3;
  for (const br2 of G.bricks) {
    if (br2.dead || !br2.subBoss) continue;
    const k2 = br2.subIdx || 0, n2 = Math.max(1, br2.subN || 1);
    let tx2, ty2;
    if (formIdx === 0) { // rotating triangle / ring around the arena heart
      const a3 = (k2 / n2) * Math.PI * 2 + t4 * 0.55;
      tx2 = W / 2 + Math.cos(a3) * W * 0.22;
      ty2 = 176 + Math.sin(a3) * 66;
    } else if (formIdx === 1) { // battle line sweeping the full width
      tx2 = W / 2 + Math.sin(t4 * 0.7) * W * 0.28 + (k2 - (n2 - 1) / 2) * 118;
      ty2 = 150 + (k2 % 2) * 36;
    } else { // spread sentry posts, each weaving its own watch
      tx2 = W * (0.5 + (k2 - (n2 - 1) / 2) * 0.3) + Math.sin(t4 * 0.9 + k2 * 2.1) * 44;
      ty2 = 168 + Math.sin(t4 * 0.6 + k2 * 1.7) * 52;
    }
    const kk2 = Math.min(1, dt * ts * 3);
    br2.bx += (tx2 - G.fx - br2.bx) * kk2;
    br2.by += (ty2 - G.fy - br2.by) * kk2;
    br2.hx = br2.bx; br2.hy = br2.by;
  }
  // typed specials on a shared cadence — round 1 presses the attack
  if (G.state === 'play') {
    gj2.subAbilityCD -= dt * ts;
    if (gj2.subAbilityCD <= 0) {
      const living = G.bricks.filter(b => !b.dead && b.subBoss);
      if (living.length) {
        gj2.subAbilityCD = 4.8 + gameRand() * 2.6;
        subAbility(living[Math.floor(gameRand() * living.length)]);
      }
    }
  }
}

function gauntletEntryPoint(style, k = 0, n = 1, target = false) {
  const mid = (n - 1) / 2, spread = Math.min(130, W * 0.15);
  if (target) {
    switch (style) {
      case 'prism': return { x: W / 2 + (k - mid) * spread, y: 150 + Math.abs(k - mid) * 42 };
      case 'stampede': return { x: W / 2 + (k - mid) * spread * 1.08, y: 155 + (k % 2) * 42 };
      case 'monolith': return { x: W / 2 + (k - mid) * spread * 0.9, y: 128 + k * 48 };
      case 'orbit': { const a = k / n * Math.PI * 2 - Math.PI / 2; return { x: W / 2 + Math.cos(a) * W * 0.2, y: 180 + Math.sin(a) * 64 }; }
      case 'swords': return { x: W / 2 + (k - mid) * spread, y: 140 + Math.abs(k - mid) * 58 };
      case 'cocoon': { const a = (k - mid) * 0.9; return { x: W / 2 + Math.sin(a) * W * 0.22, y: 176 + Math.cos(a) * 56 }; }
      case 'totem': return { x: W / 2 + (k - mid) * spread * 0.78, y: 126 + (k % 3) * 54 };
      case 'stormfront': return { x: W / 2 + (k - mid) * spread * 1.1, y: 138 + (k % 2) * 70 };
      case 'shrine': return { x: W / 2 + (k - mid) * spread, y: 168 + Math.abs(k - mid) * 28 };
      default: return { x: W / 2 + (k - mid) * spread, y: 165 };
    }
  }
  switch (style) {
    case 'prism': return { x: k % 2 ? -100 : W + 100, y: 30 + k * 36 };
    case 'stampede': return { x: -140 - k * 50, y: 155 + (k % 2) * 42 };
    case 'monolith': return { x: W / 2 + (k - mid) * spread * 0.9, y: H + 110 + k * 35 };
    case 'orbit': { const a = k / n * Math.PI * 2 + Math.PI; return { x: W / 2 + Math.cos(a) * W * 0.48, y: 180 + Math.sin(a) * H * 0.32 }; }
    case 'swords': return { x: k < n / 2 ? -120 : W + 120, y: -90 - k * 25 };
    case 'cocoon': { const a = k / n * Math.PI * 2; return { x: W / 2 + Math.cos(a) * 34, y: 176 + Math.sin(a) * 34 }; }
    case 'totem': return { x: W / 2 + (k - mid) * 30, y: -110 - k * 90 };
    case 'stormfront': return { x: W * (0.18 + k / Math.max(1, n - 1) * 0.64), y: -130 - k * 45 };
    case 'shrine': return { x: -110 - k * 75, y: 118 + k * 42 };
    default: return { x: -100, y: 150 };
  }
}

function beginGauntletEntry(role, round, style, boss, color, dur = 2.8) {
  if (!G.gauntlet || G.mode !== 'junkie') return;
  const e = { role, round, style, t: 0, dur, color, boss,
    targetX: boss?.hx ?? W / 2, targetY: boss?.hy ?? 150 };
  G.gauntlet.entry = e;
  if (boss) {
    boss.gauntletEntering = true;
    boss.introAlpha = 0; boss.introScale = 0.55; boss.introRot = 0;
  }
  G.enemyShots = []; G.telegraphs = []; G.columnStrikes = [];
  G.bossIntro = dur;
}

function updateGauntletEntrance(dt) {
  const e = G.gauntlet?.entry;
  if (!e || (G.state !== 'play' && G.state !== 'serve')) return;
  e.t += dt;
  const p = Math.min(1, e.t / e.dur), q = p * p * (3 - 2 * p);
  const pulse = Math.sin(p * Math.PI), style = e.style;
  G.bossIntro = Math.max(G.bossIntro, Math.max(0, e.dur - e.t));
  if (e.role === 'sentinel') {
    const living = G.bricks.filter(b => !b.dead && b.subBoss);
    for (let i = 0; i < living.length; i++) {
      const br = living[i], k = br.subIdx || i, n = Math.max(1, br.subN || living.length);
      const a = gauntletEntryPoint(style, k, n, false), z = gauntletEntryPoint(style, k, n, true);
      let bendX = 0, bendY = 0;
      if (style === 'prism') bendY = -90 * pulse;
      else if (style === 'stampede') bendX = 90 * pulse;
      else if (style === 'orbit') { bendX = Math.sin(p * Math.PI * 2 + k) * 85 * pulse; bendY = Math.cos(p * Math.PI * 2 + k) * 55 * pulse; }
      else if (style === 'swords') bendX = (k - (n - 1) / 2) * -65 * pulse;
      else if (style === 'cocoon') { bendX = Math.cos(p * Math.PI * 4 + k) * 105 * pulse; bendY = Math.sin(p * Math.PI * 4 + k) * 70 * pulse; }
      else if (style === 'stormfront') bendX = Math.sin(p * Math.PI * 7 + k) * 46 * pulse;
      else if (style === 'shrine') bendY = -38 * Math.sin(p * Math.PI * 3 + k);
      br.bx = a.x + (z.x - a.x) * q + bendX - G.fx;
      br.by = a.y + (z.y - a.y) * q + bendY - G.fy;
      br.hx = br.bx; br.hy = br.by;
      br.introAlpha = Math.min(1, p * 2.8);
      br.introScale = 0.7 + q * 0.3;
      br.introRot = style === 'swords' ? (k - (n - 1) / 2) * (1 - q) * 0.42 : 0;
    }
  } else {
    const br = e.boss && !e.boss.dead ? e.boss : G.bricks.find(b => b.isBoss && !b.dead && !b.dormant);
    if (br) {
      const tx = e.targetX, ty = e.targetY;
      let sx = tx, sy = -Math.max(150, br.h), bendX = 0, bendY = 0, scale = 0.55 + q * 0.45, rot = 0;
      if (['maelstrom', 'moonrise', 'timebloom', 'junglecall'].includes(style)) sy = H + br.h;
      if (['skycoil', 'suncharge', 'shadowstep', 'victorflare'].includes(style)) { sx = style === 'shadowstep' ? W + br.w : -br.w; sy = ty; }
      if (['psybreak', 'timesplit', 'blackwing', 'voidcrown', 'nightmare', 'diamondbirth', 'toxicmask', 'maxrift'].includes(style)) { sx = tx; sy = ty; }
      switch (style) {
        case 'psybreak': bendX = Math.sin(p * Math.PI * 8) * W * 0.16 * (1 - q); scale = 1.25 - q * 0.25; break;
        case 'maelstrom': bendX = Math.sin(p * Math.PI * 4) * W * 0.18 * pulse; rot = pulse * 0.55; break;
        case 'skycoil': bendY = Math.sin(p * Math.PI * 3) * 115 * pulse; rot = -0.35 * (1 - q); break;
        case 'timesplit': scale = 0.12 + q * 0.88; rot = (1 - q) * Math.PI; break;
        case 'thunderhead': bendX = Math.sin(p * Math.PI * 9) * 75 * (1 - q); break;
        case 'blackwing': scale = 1.7 - q * 0.7; rot = Math.sin(p * Math.PI * 2) * 0.22; break;
        case 'moonrise': bendY = -110 * pulse; scale = 0.75 + q * 0.25; break;
        case 'voidcrown': scale = 2.2 - q * 1.2; rot = -(1 - q) * 0.7; break;
        case 'suncharge': bendX = 120 * pulse; scale = 0.72 + q * 0.28; break;
        case 'wishgate': scale = 0.05 + q * 0.95; rot = (1 - q) * -1.2; break;
        case 'timebloom': bendX = Math.sin(p * Math.PI * 3) * 90 * pulse; scale = 0.4 + q * 0.6; break;
        case 'starfall': bendX = Math.sin(p * Math.PI * 5) * 48 * pulse; rot = (1 - q) * 0.8; break;
        case 'nightmare': bendX = Math.cos(p * Math.PI * 6) * 160 * (1 - q); scale = 1.45 - q * 0.45; break;
        case 'victorflare': bendY = -95 * pulse; rot = pulse * -0.35; break;
        case 'diamondbirth': scale = 0.08 + q * 0.92; rot = (1 - q) * Math.PI * 1.5; break;
        case 'shadowstep': bendX = -Math.sin(p * Math.PI * 4) * 110 * pulse; break;
        case 'junglecall': bendX = Math.sin(p * Math.PI * 2) * W * 0.2 * pulse; break;
        case 'toxicmask': scale = 1.8 - q * 0.8; rot = Math.sin(p * Math.PI * 5) * 0.3 * (1 - q); break;
        case 'maxrift': scale = 0.04 + q * 0.96; rot = (1 - q) * Math.PI * 2; break;
      }
      br.bx = sx + (tx - sx) * q + bendX - G.fx;
      br.by = sy + (ty - sy) * q + bendY - G.fy;
      br.introAlpha = Math.min(1, style === 'nightmare' ? p * 1.6 : p * 2.5);
      br.introScale = scale; br.introRot = rot;
    }
  }
  if (p >= 1) {
    for (const br of G.bricks) if (br.gauntletEntering || (e.role === 'sentinel' && br.subBoss)) {
      br.gauntletEntering = false; br.introAlpha = 1; br.introScale = 1; br.introRot = 0;
    }
    G.gauntlet.entry = null;
    G.bossIntro = 0.45;
  }
}

// ---- gauntlet round transitions — used by the controller AND trial jumps
function gauntletWake() {
  const gj = G.gauntlet;
  if (!gj) return;
  gj.phase = 1;
  let legend = null;
  for (const b of G.bricks) {
    if (!b.dormant) continue;
    b.dormant = false;
    if (b.isBoss) {
      b.bx = b.hx = gj.origX;
      legend = b;
      burst(b.bx + G.fx, b.by + G.fy, TYPE_COLORS[b.poke.t], 44, 400, 0.9);
      ringFx(b.bx + G.fx, b.by + G.fy, TYPE_COLORS[b.poke.t], 8, 180, 5, 0.6);
    }
  }
  if (G.mode === 'junkie' && legend) {
    const style = LEGENDARY_ENTRANCE_STYLES[legend.poke.id] || 'psybreak';
    beginGauntletEntry('legendary', 2, style, legend, TYPE_COLORS[legend.poke.t], 2.8);
  } else G.bossIntro = 1.4;
  G.shake = 12; G.freeze = Math.max(G.freeze, 0.12);
  SFX.roar();
  const gen2 = genFor(G.level);
  const legendStyle = LEGENDARY_ENTRANCE_STYLES[gen2.boss.id] || 'psybreak';
  setAnnounce('alert', TYPE_COLORS[gen2.boss.t], gen2.boss.n.toUpperCase() + ' DESCENDS!',
    'ROUND 2 — THE LEGENDARY' + (G.mode === 'junkie' ? ' · 2 PHASES' : ''), 3,
    G.mode === 'junkie' ? gauntletEntranceName(legendStyle) : null, null, false, true);
}
function gauntletSummonMythic(forceSecret = false) {
  const gj = G.gauntlet;
  if (!gj) return;
  gj.phase = 2;
  const gen2 = genFor(G.level);
  const riftOpen = forceSecret || (secretEligible() && secretShardCount() === 3);
  if (riftOpen) {
    const vw = Math.min(300, Math.max(170, W * 0.38));
    const vh = Math.min(230, vw * 0.82);
    const vHp = Math.max(18, Math.round(gj.legendHp * 1.05));
    G.secret.vmax = true;
    G.bricks.push({
      bx: W / 2, by: Math.max(145, H * 0.2), hx: W / 2, hy: Math.max(145, H * 0.2),
      row: -1, col: -1, w: vw, h: vh,
      hp: vHp, maxHp: vHp, phase: 1, phaseCount: 3, roundRole: 'secret', mythic: true, secretBoss: true, mewVmax: true,
      poke: { id: 151, t: 'psychic', n: 'MEW VMAX' },
      isBoss: true, flash: 0, wobble: gameRand() * Math.PI * 2,
      abilityCD: 4.4,
    });
    burst(W / 2, H * 0.22, '#d780ff', 70, 480, 1.1);
    ringFx(W / 2, H * 0.22, '#80d8ff', 14, Math.min(W * 0.42, 300), 6, 0.8);
    const vmax = G.bricks[G.bricks.length - 1];
    if (G.mode === 'junkie') beginGauntletEntry('secret', 3, 'maxrift', vmax, '#d780ff', 3.1);
    else { G.enemyShots = []; G.telegraphs = []; G.columnStrikes = []; G.bossIntro = 1.8; }
    G.shake = 16; G.freeze = Math.max(G.freeze, 0.18); G.flashT = Math.max(G.flashT, 0.2);
    SFX.roar();
    G.announce = null; G.announceQueue = [];
    setAnnounce('fairy', '#d780ff', 'RIFT BREACH · MEW VMAX!',
      'SECRET ROUND · 3 PHASES — THE NORMAL MEW FIGHT HAS BEEN REPLACED', 4,
      'MAX RIFT · DODGE MAX MIRAGE · WIN A FORBIDDEN UPGRADE', null, false, true);
    return;
  }
  const [mid, mt2] = gen2.gauntlet.myth;
  const mHp = Math.max(6, Math.round(gj.legendHp * 0.6));
  G.bricks.push({
    bx: W / 2, by: 150, hx: W / 2, hy: 150, row: -1, col: -1,
    w: Math.min(G.brickW * 1.6, W * 0.3), h: G.brickH * 1.4,
    hp: mHp, maxHp: mHp, phase: 1, phaseCount: 3, roundRole: 'mythical', mythic: true,
    poke: { id: mid, t: mt2, n: NAMES[mid] },
    isBoss: true, flash: 0, wobble: gameRand() * Math.PI * 2,
    abilityCD: 3.5,
  });
  getSprite(mid);
  burst(W / 2, 150, '#ff80ab', 40, 380, 0.9);
  ringFx(W / 2, 150, '#ff80ab', 8, 170, 5, 0.6);
  const myth = G.bricks[G.bricks.length - 1];
  const mythStyle = MYTHIC_ENTRANCE_STYLES[mid] || 'wishgate';
  if (G.mode === 'junkie') beginGauntletEntry('mythical', 3, mythStyle, myth, '#ff80ab', 2.8);
  else G.bossIntro = 1.4;
  G.shake = 12; G.freeze = Math.max(G.freeze, 0.12);
  SFX.roar();
  setAnnounce('fairy', '#ff80ab', NAMES[mid].toUpperCase() + ' — THE MYTHICAL!',
    'FINAL ROUND · 3 PHASES — A NEW KIND OF FIGHT', 3.2,
    G.mode === 'junkie' ? gauntletEntranceName(mythStyle) : null, null, false, true);
}

function updateSpriteKinematics(dt) {
  if (dt <= 0) return;
  for (const br of G.bricks) {
    if (br.dead || br.isBoss || br.dormant) continue;
    if (!bareMon(br) && !br.guard) { br.pbx = br.bx; br.pby = br.by; continue; }
    const ivx = (br.bx - (br.pbx ?? br.bx)) / dt, ivy = (br.by - (br.pby ?? br.by)) / dt;
    br.pbx = br.bx; br.pby = br.by;
    const k = Math.min(1, dt * 9);
    br.vvx = (br.vvx ?? 0) + (ivx - (br.vvx ?? 0)) * k;
    br.vvy = (br.vvy ?? 0) + (ivy - (br.vvy ?? 0)) * k;
    br.vspd = Math.hypot(br.vvx, br.vvy);
    // gait phase integrates distance travelled plus a slow idle breath —
    // stride quickens with real speed, and a parked mon still breathes
    br.animPh = (br.animPh ?? br.wobble) + br.vspd * dt * 0.045 + dt * 1.6;
    // facing flips only after the direction HOLDS ~150ms — no apex flicker
    const want = br.vvx > 22 ? -1 : br.vvx < -22 ? 1 : (br.face || 1);
    if (want !== (br.face || 1)) {
      br.faceT = (br.faceT || 0) + dt;
      if (br.faceT >= 0.15) { br.face = want; br.faceT = 0; }
    } else br.faceT = 0;
    // bank follows the path tangent; vertical velocity adds a touch of pitch
    const bankTgt = Math.max(-0.3, Math.min(0.3, br.vvx * 0.0011))
      + Math.max(-0.13, Math.min(0.13, br.vvy * 0.0005));
    br.bank = (br.bank ?? 0) + (bankTgt - (br.bank ?? 0)) * Math.min(1, dt * 7);
  }
}

function nearestBrick(x, y) {
  let best = null, bd = Infinity;
  for (const br of G.bricks) {
    if (br.dead || br.entry || br.barrier || br.dormant) continue; // barriers are cover, not targets
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
  if (G.announce) {
    G.announce.t -= dt;
    if (G.announce.t <= 0) G.announce = G.announceQueue.length ? G.announceQueue.shift() : null;
  }
  musicTick();

  const target = Math.max(paddleW() / 2 + 8, Math.min(W - paddleW() / 2 - 8, mouseX));
  G.paddle.speed = (target - G.paddle.x) / Math.max(dt, 0.001);
  const follow = (IS_TOUCH ? SETTINGS.touchFollow : 1) * starterMod('follow', 1);
  G.paddle.x += (target - G.paddle.x) * Math.min(1, dt * 18 * follow);
  // SPACE JUNKIE: the ship also flies vertically — mouse/finger Y steers it
  // within a band above the old paddle line. On touch the ship rides ~85px
  // ABOVE the finger, so your own thumb never hides your Pokémon.
  if (G.mode === 'junkie') {
    const bot = PADDLE_Y() + 8, top = PADDLE_Y() - SHIP_BAND;
    const ty = Math.max(top, Math.min(bot, lastMouseY - (IS_TOUCH ? 85 : 0)));
    G.shipYv += (ty - G.shipYv) * Math.min(1, dt * 14 * follow);
  } else G.shipYv = PADDLE_Y();
  G.invuln = Math.max(0, G.invuln - dt);
  G.blasterCD = Math.max(0, G.blasterCD - dt);
  G.muzzle = Math.max(0, G.muzzle - dt);
  G.shieldFlash = Math.max(0, (G.shieldFlash || 0) - dt * 3); // shield-bubble flare after an absorb
  G.surgeFlash = Math.max(0, (G.surgeFlash || 0) - dt * 2.4); // surge-ring flare after a Rally bank
  G.hurtHud = Math.max(0, (G.hurtHud || 0) - dt); // on-hit health readout at the player
  G.attackAnim = Math.max(0, G.attackAnim - dt * 4.5); // pilot lunge decays fast
  if (G.upgradeFx) { G.upgradeFx.t -= dt; if (G.upgradeFx.t <= 0) G.upgradeFx = null; }
  if (G.uiTouchPulse) { G.uiTouchPulse.t -= dt; if (G.uiTouchPulse.t <= 0) G.uiTouchPulse = null; }
  G.shareToast = Math.max(0, (G.shareToast || 0) - dt);
  if (G.combatNotice) {
    G.combatNotice.t -= dt;
    if (G.combatNotice.t <= 0) G.combatNotice = null;
  }
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
  for (const br of G.bricks) {
    if (br.flash > 0) br.flash = Math.max(0, br.flash - dt * 4.8);
    // after an entry lands, its idle bob eases in instead of popping on
    if (br.settleT != null && br.settleT < 1) br.settleT = Math.min(1, br.settleT + dt * 1.4);
    if (!paused && (G.state === 'play' || G.state === 'serve') && !br.dead && br.behavior === 'regen' && br.hp < br.maxHp) {
      br.regenT = (br.regenT || 4) - dt;
      if (br.regenT <= 0) {
        br.hp = Math.min(br.maxHp, br.hp + 1); br.regenT = 4.5;
        ringFx(br.bx + G.fx, br.by + G.fy, '#81c784', 4, 28, 2, 0.3);
        addFloater(br.bx + G.fx, br.by + G.fy - 20, '+1 REPAIR', '#81c784', 10);
      }
    }
  }
  // HUD juice: the score COUNTS up instead of teleporting; combo pops on kills
  G.scoreShown += (G.score - G.scoreShown) * Math.min(1, dt * 9);
  if (Math.abs(G.score - G.scoreShown) < 1) G.scoreShown = G.score;
  G.comboPop = Math.max(0, G.comboPop - dt * 3.2);

  if (G.state === 'ending') {
    // the ending owns its own clock: no combat sim, no timers, just beats.
    // Taps (input.js) advance a beat after a grace period; veterans who have
    // seen the dawn before jump straight to the completion card.
    const E = G.ending;
    if (E) {
      E.t += dt;
      while (E.beat < 5 && E.t >= ENDING_BEATS[E.beat - 1]) E.beat++;
      if (E.beat >= 5 && E.t >= ENDING_BEATS[4] + 1.5) E.done = true; // choices go live
    }
    G.scoreShown = G.score;
    return;
  }
  if (G.state === 'menu' || G.state === 'gameover' || G.state === 'dex') return;
  if (paused) return;
  if (G.state === 'upgrade') {
    // no draftable upgrades left → brief breather, then straight on
    if (!G.upgradeChoices && G.stateT > 2.2) { buildLevel(G.level); serve(); }
    return;
  }
  if (G.state === 'ceremony') {
    // act-boundary evolution ceremony: a scripted beat sheet. The radiant flash
    // burst and the reveal shower fire exactly once each; render only reads.
    const c = G.ceremony;
    if (!c) { G.state = 'upgrade'; G.stateT = 0; return; }
    c.t += dt;
    const cx = W / 2, cy = H * 0.36;
    if (c.evo) {
      if (!c.burst1 && c.t >= 1.9) { // radiant flash: the change begins
        c.burst1 = true;
        G.flashT = 0.25;
        ringFx(cx, cy, '#ffffff', 8, Math.min(W, H) * 0.34, 4, 0.6);
        SFX.mega();
      }
      if (!c.burst2 && c.t >= 2.45) { // the reveal — congratulations!
        c.burst2 = true;
        burst(cx, cy, '#ffffff', 40, 420, 1);
        burst(cx, cy, ACTS[c.act].color, 30, 340, 0.9);
        sparkle(cx, cy, 14, true);
        ringFx(cx, cy, ACTS[c.act].color, 10, Math.min(W, H) * 0.42, 5, 0.7);
        G.shake = 10;
        SFX.gotcha();
      }
    } else if (!c.burst1 && c.t >= 0.5) { // no partner: the act card itself lands
      c.burst1 = true;
      ringFx(cx, H * 0.4, ACTS[c.act].color, 8, Math.min(W, H) * 0.4, 4, 0.7);
      SFX.mega();
    }
    return;
  }

  tickEffects(dt);
  if (G.state === 'play') G.playT += dt;
  // ---- shooter modes (BLASTER / SPACE JUNKIE): hold FIRE to build a heavy
  // shot, release to fire. While a hold is pending or charging, normal fire
  // pauses so no stray bolt leaks out before the charged shot.
  G.chargeCD = Math.max(0, G.chargeCD - dt);
  let charging = false, chargedThisFrame = false;
  if (G.mode !== 'classic' && G.state === 'play') {
    // A FIRE touch still down past the intent threshold promotes into a charge;
    // a quicker release is dispatched as one normal shot by input.js.
    if (touchFirePendingId !== null && performance.now() - touchFirePendingT >= TOUCH_CHARGE_HOLD_MS) {
      chargeHeld = true; chargeTouchId = touchFirePendingId; touchFirePendingId = null;
    }
    if (chargeHeld && G.overheat <= 0 && G.chargeCD <= 0) {
      charging = true;
      // COOLANT's shooter translation: a cooler barrel also charges faster
      G.charge = Math.min(1, G.charge + dt / (upgN('heavy') ? 0.8 : 1.1)); // ~1.1s to full (0.8 w/ Heavy Bolt — IMPACT owns charge)
    } else if (G.charge > 0) {
      fireCharge(G.charge);
      chargedThisFrame = true;
      G.charge = 0; G.chargeCD = 0.25;
    }
  } else if (G.charge > 0) { G.charge = 0; }
  // Held desktop/CLASSIC fire keeps shooting. The optional shooter auto-fire
  // setting does the same without a held pointer, but yields immediately when
  // a FIRE-pad touch may be turning into (or is already) a charged shot.
  const autoFiring = G.mode !== 'classic' && !!SETTINGS.autoFire;
  const touchChargeIntent = touchFirePendingId !== null || chargeTouchId !== null;
  if (fireHeld && !charging && G.state === 'play') fireAction(true); // preserve desktop/CLASSIC held fire
  else if (autoFiring && !charging && !chargedThisFrame && !touchChargeIntent && G.state === 'play') fireAction(true);
  // SUPER SHIELD capstone: a floor-shield charge regrows on a timer
  if (G.state === 'play' && upgN('aegisX')) {
    if (G.shieldCharges < shieldCap()) {
      G.shieldRegenT -= dt;
      if (G.shieldRegenT <= 0) {
        G.shieldRegenT = 10;
        G.shieldCharges++;
        SFX.shield();
        // capstone proc reads on the SHIP, not just as text: the bubble
        // flares green and a ring blooms outward as the charge regrows
        G.shieldFlash = Math.max(G.shieldFlash || 0, 0.8);
        ringFx(G.paddle.x, shipY(), '#66bb6a', 6, 52, 3, 0.4);
        addFloater(G.paddle.x, shipY() - 30, 'SUPER SHIELD +1', '#66bb6a', 12);
      }
    } else G.shieldRegenT = 10;
  }

  // one-time callout the first time the mega meter fills
  if (G.mega >= 1 && G.megaT <= 0 && !G.megaCalloutDone && G.state === 'play') {
    G.megaCalloutDone = true;
    setAnnounce('mega', '#ffd54f', 'MEGA READY!', IS_TOUCH ? 'TAP THE GLOWING MEGA BUTTON TO UNLEASH' : 'PRESS E TO UNLEASH', 2.6);
  }
  // EVERY time the meter fills: a distinct haptic + a ring pulse on the MEGA
  // button itself, so readiness registers without reading the corner meter
  {
    const megaReadyNow = G.mega >= 1 && G.megaT <= 0;
    if (megaReadyNow && !G.megaWasReady && G.state === 'play') {
      haptic('mega');
      if (IS_TOUCH) {
        const B = touchButtons();
        G.uiTouchPulse = { x: B.mega.x, y: B.mega.y, label: 'MEGA READY', t: 0.9, max: 0.9 };
      }
    }
    G.megaWasReady = megaReadyNow;
  }
  // ---- STARFIGHTER first-flight coach: each step completes on the action it
  // teaches. Steps 4 (orb) and 5 (mega) are contextual — they only surface
  // when their moment exists, and the coach retires quietly with the region
  // if that moment never comes. State mutates HERE; render only reads.
  {
    const jc = G.jCoach;
    if (jc && G.mode === 'junkie' && G.state === 'play' && !paused) {
      if (jc.doneT > 0) {
        jc.doneT -= dt;
        if (jc.doneT <= 0) { jc.step++; jc.doneT = 0; }
      } else {
        // horizontal only, above a per-frame dead-band: neither the ship's
        // settle into its band nor its idle sway may complete "drag to fly" —
        // only a real steer moves the ship more than a pixel a frame
        if (jc.lastX != null) {
          const dx = Math.abs(G.paddle.x - jc.lastX);
          // deliberate steering only: above walking pace, and not the fast
          // re-centering glide right after a hit (hurtHud = respawn window)
          if (dx > 2.5 && G.hurtHud <= 0) jc.moved += dx;
        }
        jc.lastX = G.paddle.x;
        const orbNow = !!(G.ballElement && G.ballElementT < 1000); // item override = orb collected
        const done =
          jc.step === 1 ? jc.moved > 150 :
          jc.step === 2 ? G.shotsFired >= 3 :
          jc.step === 3 ? G.chargedEver :
          jc.step === 4 ? orbNow :
          jc.step === 5 ? G.megaT > 0 : true;
        if (done) { jc.doneT = 0.9; haptic('tap'); }
      }
    }
    // course complete — or the player has flown far enough without the
    // contextual moments — either way it never shows again
    if (jc && (jc.step > 5 || G.level >= 3)) {
      G.jCoach = null;
      saveStore('pkbrk-jcoach', 1);
    }
  }
  // magikarp keeps it real
  G.splashCD -= dt;
  if (G.splashCD <= 0) {
    G.splashCD = 9 + gameRand() * 8;
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
      G.elementOrbCD = (struggling ? (jkOrbs ? 4 : 8) : jkOrbs ? 10 + gameRand() * 8 : 34 + gameRand() * 20)
        * (upgN('transfuse') ? 0.6 : 1); // PRISM: orbs flow faster
      if (struggling || gameRand() < (jkOrbs ? 0.7 : 0.22)) {
        // offer an element that's super effective against the dominant type
        const counts = {};
        for (const b of alive) counts[b.poke.t] = (counts[b.poke.t] || 0) + 1;
        const domType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const cands = Object.keys(EFFECTIVE).filter(el => EFFECTIVE[el].includes(domType) && el !== curEl);
        const el = cands.length ? cands[Math.floor(gameRand() * cands.length)] : 'normal';
        G.powerups.push({ x: 50 + gameRand() * (W - 100), y: -20, vy: 62, p: { key: 'element', t: el }, rot: gameRand() * 6, orb: true });
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
            setFlightSpd(br.flight, br.flight.spd0); br.flight.spd0 = null; // ease back, no jump
          }
        }
        G.maneuver = null;
      }
    } else if (regionsIn3 >= 1 && (!G.encounter || G.encounter.t > 3)) {
      G.maneuverCD -= dt * ts;
      if (G.maneuverCD <= 0) {
        G.maneuverCD = 7 + gameRand() * 6;
        const sqs = [...new Set(G.bricks.filter(b => !b.dead && b.flight && b.flight.state === 2 && b.flight.sq != null)
          .map(b => b.flight.sq))];
        if (sqs.length) {
          const sq = sqs[Math.floor(gameRand() * sqs.length)];
          const opts = (G.encounter && G.encounter.rotary) ? ['surge'] : ['scatter'];
          if (regionsIn3 >= 2) opts.push('raid');
          const mv = { sq, kind: opts[Math.floor(gameRand() * opts.length)], t: 0 };
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
              br.flight.spd0 = br.flight.spd;
              setFlightSpd(br.flight, br.flight.spd * 1.8); // phase-preserving — no teleport
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
  // ---- SPACE JUNKIE encounter controller: the wave's ONE shared clock.
  // Formation-level morphs (breathe/relay/bloom/eclipse/orbit/blend) mutate
  // every squad's anchor/radii together, so multi-squad waves act as one
  // choreographed body instead of overlaid random patterns.
  if (G.mode === 'junkie' && G.encounter && (G.state === 'play' || G.state === 'serve')) {
    const E = G.encounter;
    E.t += dt * ts;
    const et = E.t;
    if (E.rotateAttack) { // late-act families ROTATE which role attacks
      const nSq = E.squads.length;
      if (nSq) E.attackSq = (Math.max(0, E.squads.findIndex(q => q.role === 'attacker')) + Math.floor(et / E.rotateAttack)) % nSq;
    }
    for (let s = 0; s < E.squads.length; s++) {
      const S = E.squads[s];
      let cx = S.cx0, cy = S.cy0, rx = S.rx0, ry = S.ry0, blend = 0;
      switch (E.morph) {
        case 'breathe': { // pincer: wings open wide, warn, close on the gap
          if (S.role !== 'core') {
            const b2 = 0.5 + 0.5 * Math.sin(et * 0.55);
            cx = W / 2 + (S.cx0 - W / 2) * (0.55 + 0.65 * b2);
            rx = S.rx0 * (0.8 + 0.4 * b2);
          }
          break;
        }
        case 'swapCy': { // relay: the two bodies exchange layers — and slide
          // AROUND each other laterally while crossing, never through
          if (E.squads.length >= 2) {
            const other = E.squads[s === 0 ? 1 : 0];
            const sw = 0.5 - 0.5 * Math.cos(et * Math.PI / 7); // full exchange every 7s
            cy = S.cy0 + (other.cy0 - S.cy0) * sw;
            cx += Math.sin(sw * Math.PI) * W * 0.13 * (s === 0 ? -1 : 1);
          }
          break;
        }
        case 'bloom': { // ring smoothly opens into petals and closes again —
          // contraction is capped so slots never pack tighter than daylight
          const b2 = 0.5 + 0.5 * Math.sin(et * 0.4);
          ry = S.ry0 * (0.72 + 0.45 * b2);
          rx = S.rx0 * (1.08 - 0.24 * b2);
          break;
        }
        case 'eclipse': { // rings align (radii converge), darken, separate
          const e2 = Math.pow(Math.max(0, Math.sin(et * 0.3)), 2);
          if (S.role === 'wing') rx = S.rx0 * (1 - 0.28 * e2), ry = S.ry0 * (1 - 0.28 * e2);
          else if (S.role === 'core') rx = S.rx0 * (1 + 0.3 * e2), ry = S.ry0 * (1 + 0.3 * e2);
          break;
        }
        case 'orbit': { // the whole set of anchors slowly wheels as one vortex
          const midY = (E.openTop + E.floorY) / 2;
          const dx = S.cx0 - W / 2, dy = S.cy0 - midY;
          const a2 = et * 0.22, ca = Math.cos(a2), sa = Math.sin(a2);
          cx = W / 2 + dx * ca - dy * sa;
          cy = midY + dx * sa + dy * ca;
          break;
        }
        case 'blend': // mastery: the silhouette ITSELF morphs between kinds
          blend = 0.5 - 0.5 * Math.cos(et * Math.PI / 8); // full morph every 16s
          break;
      }
      // the RIGID body is what moves: a slow patrol glide (eased sine,
      // ~8s period, ~14% of the screen) plus the Galaga THROB — the whole
      // slot frame breathes ±5% on one squad-synced clock
      // ONE body: every squad shares the same patrol phase — concentric
      // families (carousel rings, eclipse, moons) must never drift apart
      cx += Math.sin(et * 0.75) * W * 0.07;
      cy += Math.sin(et * 0.5) * 5;
      const breath = 1 + 0.05 * Math.sin(et * 1.4 + s * 0.9);
      rx *= breath; ry *= breath;
      if (S.silenceT > 0) S.silenceT = Math.max(0, S.silenceT - dt * ts);
      S.cx = cx; S.cy = cy; S.rx = rx; S.ry = ry; S.blend = blend;
    }
    // write the controller's frame into every member — one clock, one body
    for (const br of G.bricks) {
      if (br.dead || !br.flight) continue;
      const S = E.squads[br.flight.sq];
      if (!S) continue;
      const F = br.flight;
      F.cx = S.cx; F.cy = S.cy; F.rx = S.rx; F.ry = S.ry;
      F.kind2 = S.kind2; F.blend = S.blend || 0;
    }
  }
  // ---- ROCK TOMB barriers: boulder Pokémon drifting across their band,
  // turning at the walls — living cover the flocks hide behind
  if (G.mode === 'junkie' && (G.state === 'play' || G.state === 'serve')) {
    for (const br of G.bricks) {
      if (br.dead || !br.barrier) continue;
      br.bx += br.barrier.vx * ts * dt;
      if (br.bx < 60) { br.bx = 60; br.barrier.vx = Math.abs(br.barrier.vx); }
      if (br.bx > W - 60) { br.bx = W - 60; br.barrier.vx = -Math.abs(br.barrier.vx); }
      br.hx = br.bx; br.hy = br.by;
    }
  }
  updateGauntletEntrance(dt);
  updateSentinels(dt, ts);
  // ---- THE GAUNTLET: three rounds per finale. Round 1 the sentinels hold
  // the arena; felling them wakes the LEGENDARY (and its wings); felling
  // the legendary summons the MYTHICAL — smaller, faster, wilder.
  if (G.gauntlet && G.state === 'play') {
    const gj = G.gauntlet;
    if (gj.phase === 0 && !G.bricks.some(b => !b.dead && b.subBoss)) {
      gauntletWake();
    } else if (gj.phase === 1 && !G.bricks.some(b => !b.dead && b.isBoss)) {
      // Kanto's last key piece belongs to Mewtwo. Round 3 waits until the
      // guaranteed pickup is caught; a complete key then replaces Mew.
      if (secretEligible() && !G.secret.shards[2] && !G.secret.offered[2]) {
        spawnRiftShard(2, W / 2, Math.max(120, H * 0.25));
      } else if (G.secret.pendingShard == null) gauntletSummonMythic();
    }
  }
  // ---- SPACE JUNKIE boss guards: two mirrored wing arcs TETHERED to the
  // legendary. They trail its sweeps, compress + reform through teleports,
  // exchange sides in phase 2, and become counter-rotating orbits in the
  // last stand — never an unrelated marching grid.
  if (G.mode === 'junkie' && (G.state === 'play' || G.state === 'serve')) {
    const boss = G.bricks.find(b => b.isBoss && !b.dead && !b.dormant);
    if (boss) {
      if (boss.reformT > 0) boss.reformT = Math.max(0, boss.reformT - dt * ts);
      // phase 2+: wings periodically EXCHANGE sides along split verticals
      if ((boss.phase || 1) >= 2 && G.state === 'play') {
        G.guardSwapCD -= dt * ts;
        if (G.guardSwapCD <= 0) {
          G.guardSwapCD = 8;
          for (const br of G.bricks) {
            if (!br.dead && br.guard && br.guard.ring == null) br.guard.targetSide = -br.guard.targetSide;
          }
        }
      }
      for (const br of G.bricks) {
        if (br.dead || !br.guard) continue;
        const g2 = br.guard;
        // last stand: surviving wing guards become the OUTER orbit
        if (bossLastStand(boss) && g2.ring == null) g2.ring = 0;
        let tx, ty;
        if (g2.ring != null) {
          // counter-rotating orbits, centered on the boss EVERY update
          const a2 = (g2.idx / Math.max(1, g2.n)) * Math.PI * 2
            + (g2.side > 0 ? 0 : Math.PI)
            + G.time * (g2.ring ? 0.9 : -0.5);
          const R = g2.ring ? boss.w * 0.7 + 26 : boss.w * 0.95 + 64;
          tx = boss.bx + Math.cos(a2) * R;
          ty = boss.by + Math.sin(a2) * R * 0.7;
        } else {
          // mirrored wing arc slots relative to the boss anchor
          g2.sideF += (g2.targetSide - g2.sideF) * Math.min(1, dt * ts * 1.7);
          const u = (g2.idx + 0.5) / Math.max(1, g2.n);
          const spanX = Math.min(W * 0.07, 66) + u * Math.min(W * 0.11, 100);
          tx = boss.bx + g2.sideF * (boss.w * 0.55 + spanX);
          ty = Math.max(56, boss.by - 20 - Math.sin(u * Math.PI * 0.85) * (64 + u * 44))
            // crossing guards split into over/under lanes — never one center
            + (1 - Math.abs(g2.sideF)) * 96 * (g2.idx % 2 ? -1 : 1);
        }
        if (boss.reformT > 0) { // teleport: compress INTO the boss, then reform
          tx = boss.bx + (tx - boss.bx) * 0.12;
          ty = boss.by + (ty - boss.by) * 0.12;
        }
        // wing slots stay ON the battlefield: a boss hugging a screen edge
        // would otherwise park its outer wing past the edge, out of reach of
        // every upward bolt (bolts fire from inside the screen)
        tx = Math.max(28, Math.min(W - 28, tx));
        ty = Math.max(44, Math.min(H * 0.8, ty));
        const kk = Math.min(1, dt * ts * (boss.reformT > 0 ? 10 : 5));
        br.bx += (tx - br.bx) * kk;
        br.by += (ty - br.by) * kk;
        br.hx = br.bx; br.hy = br.by;
      }
    } else {
      // ORPHANED WINGS fall with their legendary. Their anchor is gone (the
      // round's final boss felled mid-sweep), and an untethered guard simply
      // froze wherever its slot last was — which could be past the screen
      // edge, unhittable, silently blocking the every-brick-dead wave-clear
      // check: an empty-looking arena that never advances. Round transitions
      // are safe: the controller summons the next round's boss before this
      // block runs, so a live anchor exists on every mid-gauntlet frame.
      // (dormant wings are round-1 sleepers parked with their legendary —
      // they haven't entered the fight, so they're not orphans)
      for (const br of G.bricks) {
        if (!br.dead && br.guard && !br.dormant) damageBrick(br, 9999, br.bx + G.fx, br.by + G.fy);
      }
    }
  }
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
      // masteryMorph: the formation SILHOUETTE itself eases between two
      // kinds (chevron→ring→phalanx) — blend the two paths per member
      if (F.kind2 && F.blend > 0.001) {
        const k0 = F.kind;
        F.kind = F.kind2;
        const p2 = flightPos(F, tAbs);
        F.kind = k0;
        pos.x += (p2.x - pos.x) * F.blend;
        pos.y += (p2.y - pos.y) * F.blend;
      }
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
      // SPACE JUNKIE entrance TRAIN: riders follow the squad's swooping
      // spline nose-to-tail (firing on the way), then PEEL into their slot
      // with a spring settle — the formation visibly assembles itself
      if (F.inDelay != null && G.encounter) {
        const S2 = G.encounter.squads[F.sq];
        const pIn = (G.encounter.t - F.inDelay) / (F.inDur || 2.8);
        if (S2 && pIn < 1) {
          if (pIn <= 0) { // waiting off-screen at the spline's mouth
            pos.x = S2.e0x + S2.inSide * 40; pos.y = S2.e0y;
          } else if (pIn < 0.72) { // the swoop: corner → across → up
            const q2 = pIn / 0.72, u2 = 1 - q2;
            pos.x = u2 * u2 * S2.e0x + 2 * u2 * q2 * S2.e1x + q2 * q2 * S2.e2x;
            pos.y = u2 * u2 * S2.e0y + 2 * u2 * q2 * S2.e1y + q2 * q2 * S2.e2y;
          } else { // peel: formation edge → slot, slight overshoot, settle
            const u = (pIn - 0.72) / 0.28;
            const eb = 1 + 2.3 * Math.pow(u - 1, 3) + 1.3 * Math.pow(u - 1, 2);
            pos.x = S2.e2x + (pos.x - S2.e2x) * eb;
            pos.y = S2.e2y + (pos.y - S2.e2y) * eb;
          }
        } else { F.inDelay = null; F.entering = false; }
      }
      if (F.state === 1) { // breaking out: glide from the wall onto the pattern
        F.t += dt * ts;
        // negative t = a stream rider still holding off-screen for its turn
        const p = Math.max(0, Math.min(1, F.t / 1.35));
        const q = 1 - Math.pow(1 - p, 2);
        br.hx = (F.sx + (pos.x - F.sx) * q) - G.fx;
        br.hy = (F.sy + (pos.y - F.sy) * q) - G.fy;
        if (p >= 1) F.state = 2;
      } else {
        br.hx = pos.x - G.fx; br.hy = pos.y - G.fy;
      }
      if (!br.entry && !br.dive) { br.bx = br.hx; br.by = br.hy; }
    }
    // ---- flyers NEVER overlap. A proper little constraint solver: several
    // full-projection passes push any two sprites out to a minimum spacing.
    // When a pattern tries to converge (vortex contracting, star pinching
    // through its center), the flock packs into a crisp, non-overlapping knot
    // instead of a blob. Runs in EVERY mode now — so classic/blaster flyers no
    // longer bump each other either. In the walled modes it clamps to the open
    // band below the wall so a push can't shove a flyer into the static bricks.
    {
      const fl = [];
      for (const br of G.bricks) {
        // state 1 (still gliding in) is EXCLUDED: entering riders trail
        // nose-to-tail from one edge point, so the solver shoved them apart
        // every frame while the glide lerp snapped them back — a visible
        // jitter on every wave entrance. Entries are transient; the overlap
        // invariant (and its test) covers settled flyers (state 2).
        if (!br.dead && br.flight && br.flight.state >= 2 && !br.dive && !br.entry && !br.flight.entering
            // Authored choreography normally holds its own clean slots. On a
            // short landscape screen, however, the airspace band is too
            // shallow for nested rings; let the smoothed solver add just the
            // breathing room the composition physically needs.
            && !(G.mode === 'junkie' && br.flight.choreo && !G.maneuver && H >= 560)) fl.push(br);
      }
      const gr = G.mode !== 'junkie' ? G.gridRect : null;
      // SPACE JUNKIE separation is SMOOTHED: pushes build into a per-rider
      // offset that eases in AND out — so when a neighbour dies, the released
      // pressure drains over ~0.4s instead of snapping the survivor sideways
      const eased = G.mode === 'junkie';
      if (eased) {
        for (const br of fl) {
          br.sepX = (br.sepX || 0) * (1 - Math.min(1, dt * ts * 2.5));
          br.sepY = (br.sepY || 0) * (1 - Math.min(1, dt * ts * 2.5));
          br.slotX = br.bx; br.slotY = br.by;
          br.bx += br.sepX; br.by += br.sepY;
        }
      }
      if (fl.length > 1) {
        for (let it = 0; it < 12; it++) {
          let moved = false;
          for (let i = 0; i < fl.length; i++) {
            for (let j = i + 1; j < fl.length; j++) {
              const a = fl[i], b2 = fl[j];
              // 0.7: sprites draw at ~1.25× their hitbox, so anything tighter
              // than 1.4× min-dimension still LOOKS like an overlap
              const minD = (Math.min(a.w, a.h) + Math.min(b2.w, b2.h)) * 0.7;
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
          // keep any flyer a push nudged INTO the static wall below it — done
          // INSIDE the loop so the NEXT pass re-spreads them along the wall's
          // underside instead of stacking on one line. 'square' loops around
          // the wall legitimately, so it's never inside the rect.
          if (gr) {
            for (const br of fl) {
              if (Math.abs(br.bx - gr.cx) < gr.hw + br.w / 2 &&
                  br.by + br.h / 2 > gr.top && br.by - br.h / 2 < gr.bottom) {
                br.by = gr.bottom + br.h / 2 + 4; moved = true;
              }
            }
          }
          if (!moved) break;
        }
      }
      if (eased) { // blend the raw pushes into the persistent offset
        const k2 = Math.min(1, dt * ts * 14);
        for (const br of fl) {
          const wantX = br.bx - br.slotX, wantY = br.by - br.slotY;
          br.sepX += (wantX - br.sepX) * k2;
          br.sepY += (wantY - br.sepY) * k2;
          br.bx = br.slotX + br.sepX;
          br.by = br.slotY + br.sepY;
        }
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
      // straight eased glide from above — the old 150px swoop-over-the-top,
      // layered with the render bob, read as fast/stuttery on wave 1
      br.bx = e.sx + (br.hx - e.sx) * q;
      br.by = e.sy + (br.hy - e.sy) * q;
      if (p >= 1) { br.entry = null; br.settleT = 0; } // bob fades IN after landing
    }
  }
  if (G.state === 'play' && G.bossIntro <= 0) {
    G.swayT += dt * ts;
    const boss = G.bricks.find(b => b.isBoss && !b.dead && !b.dormant);
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
        if (br.dead || br.isBoss || br.dive || br.entry || br.dormant || br.guard || br.barrier || br.subBoss || flying(br)) continue;
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
      // every legendary OWNS its arena differently (BOSS_STYLE, data.js) —
      // the patrol widens and quickens with each phase either way
      const bp = boss.phase || 1;
      const t2 = G.swayT, sp2 = 0.45 + bp * 0.22;
      const jk3 = G.mode === 'junkie';
      const yAmp = jk3 ? 1 : 0.45; // classic keeps clear of its guard wall
      const style = boss.secretBoss ? 'maxrift' : boss.mythic
        ? (MYTHIC_BATTLE_STYLES[boss.poke.id] || 'mythic') : (BOSS_STYLE[boss.poke.id] || 'anchor');
      switch (style) {
        case 'infinity': // a wide figure-eight through mid-air
          boss.bx = boss.hx + Math.sin(t2 * sp2) * W * (0.16 + bp * 0.02);
          boss.by = boss.hy + (30 + Math.sin(t2 * sp2 * 2) * 52) * yAmp;
          break;
        case 'serpent': // threads a long slow wave across the whole width
          boss.bx = boss.hx + Math.sin(t2 * (0.3 + bp * 0.14)) * W * 0.3;
          boss.by = boss.hy + Math.sin(t2 * (0.9 + bp * 0.2)) * 40 * yAmp;
          break;
        case 'bastion': // locked mid-arena — the fight comes to YOU
          boss.bx = boss.hx + Math.sin(t2 * 0.2) * 30;
          boss.by = boss.hy + (jk3 ? 64 : 22) + Math.sin(t2 * 0.35) * 12 * yAmp;
          break;
        case 'flank': // slams flank to flank, hanging low at each turn
          boss.bx = boss.hx + Math.tanh(Math.sin(t2 * 0.35) * 2.4) * W * (0.24 + bp * 0.03);
          boss.by = boss.hy + Math.abs(Math.cos(t2 * 0.35)) * 46 * yAmp;
          break;
        case 'swoop': // predator dives along a deep V, corner to corner
          boss.bx = boss.hx + Math.sin(t2 * sp2) * W * 0.26;
          boss.by = boss.hy + Math.abs(Math.sin(t2 * sp2)) * (jk3 ? 92 : 52);
          break;
        case 'phase': // dreamlike lissajous glide between moon stations
          boss.bx = boss.hx + Math.sin(t2 * 0.3) * W * 0.24;
          boss.by = boss.hy + (Math.cos(t2 * 0.6) * 36 + 16) * yAmp;
          break;
        case 'perimeter': // rides the top rim end to end
          boss.bx = W / 2 - G.fx + Math.sin(t2 * (0.3 + bp * 0.06)) * W * 0.38;
          boss.by = boss.hy - 16;
          break;
        case 'charge': // tears back and forth at full sprint
          boss.bx = boss.hx + Math.sin(t2 * (0.75 + bp * 0.25)) * W * 0.3;
          boss.by = boss.hy + Math.abs(Math.sin(t2 * 1.5)) * 26 * yAmp;
          break;
        case 'mythic': // erratic, dreamlike — never where you left it
          boss.bx = boss.hx + Math.sin(t2 * 1.1) * W * 0.2 + Math.sin(t2 * 2.3) * 40;
          boss.by = boss.hy + (Math.sin(t2 * 1.7) * 36 + Math.sin(t2 * 0.6) * 16) * yAmp;
          break;
        case 'orbit':
          boss.bx = boss.hx + Math.cos(t2 * (0.75 + bp * 0.12)) * W * 0.2;
          boss.by = boss.hy + Math.sin(t2 * (0.75 + bp * 0.12)) * 70; break;
        case 'flutter':
          boss.bx = boss.hx + Math.sin(t2 * 1.7) * W * 0.16;
          boss.by = boss.hy + Math.sin(t2 * 3.4) * 42 + Math.cos(t2 * 0.5) * 24; break;
        case 'starfall':
          boss.bx = boss.hx + Math.sin(t2 * 0.8) * W * 0.27;
          boss.by = boss.hy + Math.abs(Math.sin(t2 * 1.6)) * 82; break;
        case 'ambush':
          boss.bx = boss.hx + Math.tanh(Math.sin(t2 * 0.72) * 3.2) * W * 0.3;
          boss.by = boss.hy + Math.cos(t2 * 1.44) * 28; break;
        case 'burst':
          boss.bx = boss.hx + Math.sin(t2 * (1.3 + bp * 0.18)) * W * 0.3;
          boss.by = boss.hy + Math.abs(Math.cos(t2 * 2.6)) * 48; break;
        case 'crystal':
          boss.bx = boss.hx + Math.round(Math.sin(t2 * 0.55) * 2) * W * 0.13;
          boss.by = boss.hy + Math.sin(t2 * 1.1) * 24; break;
        case 'brawler':
          boss.bx = boss.hx + Math.tanh(Math.sin(t2 * 1.25) * 2.5) * W * 0.25;
          boss.by = boss.hy + Math.abs(Math.sin(t2 * 2.5)) * 96; break;
        case 'vine':
          boss.bx = boss.hx + Math.sin(t2 * 0.55) * W * 0.28;
          boss.by = boss.hy + Math.sin(t2 * 1.1 + Math.sin(t2 * 0.4)) * 58; break;
        case 'trick':
          boss.bx = boss.hx + Math.sin(t2 * 1.9) * Math.cos(t2 * 0.37) * W * 0.28;
          boss.by = boss.hy + Math.sin(t2 * 2.3) * 50; break;
        case 'maxrift':
          boss.bx = boss.hx + Math.sin(t2 * 0.65) * W * 0.18;
          boss.by = boss.hy + Math.sin(t2 * 1.3) * 38 + Math.cos(t2 * 0.43) * 20; break;
        default: // 'anchor' — the classic high, imperious patrol
          boss.bx = boss.hx + (mt >= 1 || bp >= 2
            ? Math.sin(t2 * sp2) * Math.min(90 + bp * 26, W * (0.07 + bp * 0.02))
            : 0);
      }
    }
    for (const br of G.bricks) {
      if (br.dead || br.isBoss || br.entry || br.guard || br.barrier || br.subBoss) continue; // guards/barriers/sentinels have their own controllers
      // GALAGA DIVE: peel off, swoop at the paddle, fire, loop back home
      if (br.dive) {
        const dv = br.dive;
        dv.t += dt * ts;
        // butterfly veer: the descent tracks the player's CURRENT position
        if (dv.t / dv.dur < 0.5) dv.tx += ((G.paddle.x - G.fx) - dv.tx) * Math.min(1, dt * ts * 0.9);
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
          G.enemyShots.push({ x: sx2, y: sy2, vx: Math.cos(ang) * sp2, vy: Math.sin(ang) * sp2, type: br.poke.t });
          SFX.enemyShot();
        }
        if (p >= 1) { br.dive = null; br.bx = br.hx; br.by = br.hy; }
        continue;
      }
      if (flying(br)) continue; // flyers are positioned by their pattern
      let ox = 0, oy = 0;
      if (G.blocksStatic) {
        // Slider behaviors are the exception to the anchored wall: they move
        // only along a short rail and never turn into free-flying enemies.
        const sliding = br.behavior === 'shift' || br.behavior === 'volatile';
        br.bx = br.hx + (sliding ? Math.sin(G.time * 1.45 + (br.behaviorPhase || 0)) * Math.min(30, br.w * 0.32) : 0);
        br.by = br.hy;
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
        // SPACE JUNKIE keeps ONE attack group at a time (two only from Galar);
        // choreographed waves pick their divers from the designated attacker
        // squad, so the rest of the formation stays a stable frame of reference
        const jk2 = G.mode === 'junkie';
        const maxDivers = jk2 ? (regionsIn2 >= 7 ? 2 : 1) : 1 + Math.floor(regionsIn2 / 3);
        const diving = G.bricks.filter(b => !b.dead && b.dive).length;
        G.diveCD = Math.max(2.2, 7 - regionsIn2 * 0.5) * (0.7 + gameRand() * 0.5);
        if (diving < maxDivers &&
            // no peel-offs while a junkie encounter is still floating in
            !(jk2 && G.encounter && G.encounter.t < 4)) {
          let pool2 = G.bricks.filter(b => !b.dead && !b.isBoss && !b.armored && !b.entry && !b.dive && !b.guard && !b.barrier);
          if (jk2 && G.encounter && G.encounter.attackSq >= 0) {
            const att = pool2.filter(b => b.flight && b.flight.sq === G.encounter.attackSq);
            if (att.length) pool2 = att;
          }
          if (pool2.length) {
            const dvb = pool2[Math.floor(gameRand() * pool2.length)];
            if (!flying(dvb) && !dvb.bare) {
              // the peel-off SHATTERS its box — nothing dives as a full brick
              dvb.bare = true;
              shatterBox(dvb, dvb.bx + G.fx, dvb.by + G.fy);
              burst(dvb.bx + G.fx, dvb.by + G.fy, TYPE_COLORS[dvb.poke.t], 12, 190, 0.5);
            }
            dvb.dive = {
              t: 0, dur: 2.9, dir: gameRand() < 0.5 ? -1 : 1,
              tx: Math.max(60, Math.min(W - 60, G.paddle.x - G.fx + (gameRand() - 0.5) * 160)),
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
        loseLife('BRICKS REACHED THE DANGER LINE');
        return;
      }
    }
  }

  // every system that writes positions has run — settle the sprite kinematics
  if (G.state === 'play' || G.state === 'serve') updateSpriteKinematics(dt * ts);

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
        const a = -Math.PI / 2 + (gameRand() < 0.5 ? -1 : 1) * (0.55 + gameRand() * 0.3);
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
    // never let the ball ride near-horizontal — a flat ball shuttles wall to
    // wall for ages before it comes back down. Enforce ≥ ~16° of pitch,
    // preserving speed and travel direction (a one-frame nudge, imperceptible)
    {
      const spb = Math.hypot(b.vx, b.vy);
      const minVy = spb * 0.28;
      if (spb > 1 && Math.abs(b.vy) < minVy) {
        b.vy = (b.vy === 0 ? 1 : Math.sign(b.vy)) * minVy;
        b.vx = Math.sign(b.vx || 1) * Math.sqrt(Math.max(0, spb * spb - minVy * minVy));
      }
    }
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
            G.coachStep = 2;
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
          tilt = Math.max(-0.52, Math.min(0.52, tilt + (gameRand() - 0.5) * 0.4));
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
        // CALIBRATED BARRAGE (classic): every 4th clean return primes the ball
        if (G.mode === 'classic' && upgN('calibrated') && ++G.calibReturns >= 4) {
          G.calibReturns = 0; G.calibShots = 1;
          addFloater(G.paddle.x, py - 48, 'CALIBRATED!', '#ffcc80', 13);
          tone(760, 0.1, 'sine', 0.05, 180);
        }
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
      haptic('tap');
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
        if (br.veil) {
          // ENERGY VEIL: the ball simply can't crack it — solid bounce, zero
          // damage (even pierced/mega balls). Blaster fire is the only answer.
          const ox = (hw + b.r) - Math.abs(b.x - bx);
          const oy = (hh + b.r) - Math.abs(b.y - by);
          if (ox < oy) { b.vx = b.x < bx ? -Math.abs(b.vx) : Math.abs(b.vx); }
          else { b.vy = b.y < by ? -Math.abs(b.vy) : Math.abs(b.vy); }
          burst(b.x, b.y, '#4dd0e1', 6, 140, 0.3);
          tone(980, 0.05, 'square', 0.03, -220);
          if ((G.veilHintCD || 0) <= 0) {
            G.veilHintCD = 4;
            addFloater(bx, by - br.h / 2 - 10,
              blasterArmed() ? 'BLASTER ONLY!' : 'NEED THE BLASTER — CATCH A LASER DROP', '#4dd0e1', 12);
          }
          break;
        }
        const pierce = G.fx_fire || G.megaT > 0;
        if (pierce && !br.isBoss) {
          // Fireball torches blocks outright; bare Mega punches through for 3
          // with brief contact i-frames so a surviving block isn't melted
          // frame-by-frame as the ball ghosts through it
          if (br.flash <= 0.5) {
            damageBrick(br, G.fx_fire ? 99 : (upgN('megaX') ? 4.2 : 3), b.x, b.y, G.ballElement);
            if (G.fx_fire) fireballExplosion(b.x, b.y, G.fx_fire.tier);
            awardRally(b, b.x, b.y);
          }
        } else {
          const ox = (hw + b.r) - Math.abs(b.x - bx);
          const oy = (hh + b.r) - Math.abs(b.y - by);
          if (ox < oy) { b.vx = b.x < bx ? -Math.abs(b.vx) : Math.abs(b.vx); }
          else { b.vy = b.y < by ? -Math.abs(b.vy) : Math.abs(b.vy); }
          // Blaze embers from the last paddle return add burn damage
          let dmg = pierce ? (upgN('megaX') ? 4.2 : 3) : 1;
          if (b.ember > 0) {
            b.ember--;
            dmg += G.starterLvl >= 3 ? 2 : 1;
            burst(b.x, b.y, '#ffab66', 8, 160, 0.4);
          }
          if (G.mode === 'classic') {
            dmg *= 1 + 0.15 * upgN('heavy') + 0.25 * upgN('demo');
            // CALIBRATED BARRAGE proc: the primed return lands white-hot
            if (upgN('calibrated') && G.calibShots > 0) {
              G.calibShots--;
              dmg *= 1.6;
              burst(b.x, b.y, '#ffcc80', 10, 190, 0.4);
            }
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
  if (G.mode === 'classic' && G.state === 'play' && G.balls.length === 0) { loseLife('MISSED BALL'); return; }

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
        if (L.hits > (L.charged ? 2 + upgN('intercept') : upgN('intercept'))) L.dead = true;
        // a CANCELLATION mark, distinct from damage: ✕ + a crisp ring, so a
        // shot-down bolt never reads as an enemy hit landing
        burst(s.x, s.y, '#ffab91', 8, 170, 0.4);
        ringFx(s.x, s.y, '#e0f7ff', 3, 20, 2, 0.22);
        addFloater(s.x, s.y - 14, L.hits > 1 && upgN('intercept') ? '✕ INTERCEPTOR ×' + L.hits : '✕ INTERCEPTED',
          L.hits > 1 ? '#b3e5fc' : '#80d8ff', 11);
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
        // SHELL ARMOR / ROCK TOMB: normal bolts shatter harmlessly on the
        // casing — only a CHARGED shot cracks through. One charged hit
        // breaks shell armor for good; barriers take charged damage only.
        if ((br.shellArmor || br.barrier) && !L.charged) {
          L.dead = true;
          burst(L.x, by + br.h / 2, '#b0bec5', 6, 130, 0.3);
          tone(1050, 0.05, 'square', 0.03, -260);
          if ((G.chargeHintCD || 0) <= 0 && G.mode !== 'classic') {
            G.chargeHintCD = 4;
            addFloater(bx, by - br.h / 2 - 12,
              IS_TOUCH ? 'CHARGE IT! HOLD FIRE' : 'CHARGE IT! HOLD RIGHT-CLICK / SHIFT', '#4dd0e1', 12);
          }
          continue;
        }
        if (br.shellArmor && L.charged) {
          br.shellArmor = false; // the shell CRACKS off — the mon is exposed
          burst(bx, by, '#e0e0e0', 18, 240, 0.5);
          ringFx(bx, by, '#b0bec5', 5, 50, 3, 0.4);
          addFloater(bx, by - br.h / 2 - 12, 'SHELL CRACKED!', '#ffd54f', 13);
          SFX.wall();
        }
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
        if (L.nova) dmg *= 2;
        if (L.calib) dmg *= 1.6; // CALIBRATED BARRAGE: primed volley
        if (L.mega) dmg *= upgN('megaX') ? 1.4 : 1.25;
        // JUNKIE-mode bolts carry the pilot's element; the base blaster stays neutral
        damageBrick(br, dmg, L.x, L.y, L.element || (L.basic ? null : 'electric'));
        // MOMENTUM: in the shooter modes there are no paddle returns, so
        // blaster hits carry the whole tier — twice the classic trickle
        if (L.basic && G.megaT <= 0 && upgN('momentum')) G.mega = Math.min(1, G.mega + (G.mode !== 'classic' ? 0.004 : 0.002));
        if (L.explosive) fireballExplosion(L.x, L.y, 1);
        // SPLASH CHARGE (IMPACT): a spent charged shot detonates for AoE — the
        // typed blast supersedes the old flame-only detonation
        if (L.charged && L.dead) {
          if (upgN('demo')) chargeSplash(L.x, L.y, L.element, upgN('impactX') ? 2 : 1);
          else if (L.shape === 'flame') fireballExplosion(L.x, L.y, 1);
        }
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
    // SALVAGE / ACE drones hunt enemy FIRE first — interception is their job —
    // and only fall back to the nearest enemy when the sky is clear
    let tx = null, ty = null, shotTgt = null;
    if (m.drone) {
      let td = 240;
      for (const s of G.enemyShots) {
        if (s.dead || s.boss) continue;
        const d = Math.hypot(s.x - m.x, s.y - m.y);
        if (d < td) { td = d; shotTgt = s; }
      }
      if (shotTgt) { tx = shotTgt.x; ty = shotTgt.y; }
    }
    if (tx == null) {
      const tgt = nearestBrick(m.x, m.y);
      if (tgt) { tx = tgt.bx + G.fx; ty = tgt.by + G.fy; }
    }
    if (tx != null) {
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
    if (G.particles.length < 430) G.particles.push({ x: m.x, y: m.y, vx: -m.vx * 0.08, vy: -m.vy * 0.08, life: 0.3, maxLife: 0.3, color: m.drone ? '#ea80fc' : '#ffab91', r: 2.5 });
    if (shotTgt && !shotTgt.dead && Math.hypot(shotTgt.x - m.x, shotTgt.y - m.y) < 18) {
      // drone intercept: the shot dies to a hex flash, never reaching you
      shotTgt.dead = true; m.dead = true;
      ringFx(m.x, m.y, '#ea80fc', 4, 30, 3, 0.3);
      tone(880, 0.07, 'square', 0.04, -160);
    }
    for (const br of G.bricks) {
      if (br.dead || br.phaseT > 0 || m.dead) continue;
      const bx = br.bx + G.fx, by = br.by + G.fy;
      if (Math.abs(m.x - bx) < br.w / 2 + 6 && Math.abs(m.y - by) < br.h / 2 + 6) {
        m.dead = true;
        if (m.drone) { // reduced payload, typed like your attack — you stay the star
          damageBrick(br, 1, m.x, m.y, m.element || null);
          ringFx(m.x, m.y, '#ea80fc', 4, 28, 2, 0.3);
        } else {
          damageBrick(br, 2, m.x, m.y, 'dragon');
          fireballExplosion(m.x, m.y, m.tier >= 3 ? 2 : 1);
        }
      }
    }
    if (m.y < 30 || m.x < -40 || m.x > W + 40) m.dead = true;
  }
  G.missiles = G.missiles.filter(m => !m.dead);

  // ---- SINGULARITY / EVENT HORIZON gravity wells: a lingering typed
  // implosion at the blast point. Ticks reuse damageBrick (so effectiveness
  // and mastery apply); the HORIZON well also erases ordinary enemy fire.
  for (const v of G.vortexes) {
    v.t += dt;
    v.tick -= dt;
    if (v.tick <= 0) {
      v.tick = 0.24;
      for (const br of G.bricks) {
        if (br.dead) continue;
        const bx = br.bx + G.fx, by = br.by + G.fy;
        if (Math.hypot(bx - v.x, by - v.y) < v.r + br.w / 2) damageBrick(br, v.dmg, bx, by, v.element);
      }
    }
    if (v.horizon) {
      for (const s of G.enemyShots) {
        if (!s.dead && !s.boss && Math.hypot(s.x - v.x, s.y - v.y) < v.r) {
          s.dead = true;
          ringFx(s.x, s.y, TYPE_COLORS[v.element] || '#b388ff', 3, 20, 2, 0.25);
        }
      }
    }
  }
  G.vortexes = G.vortexes.filter(v => v.t < v.dur);

  // ---- METEOR MATRIX rain: six spaced typed strikes on random living targets
  if (G.meteorRain && G.state === 'play') {
    const mr = G.meteorRain;
    mr.t -= dt;
    if (mr.t <= 0) {
      mr.t = 0.22;
      mr.n--;
      const targets = G.bricks.filter(b => !b.dead && !b.dormant && !b.barrier);
      if (targets.length) {
        const br = targets[Math.floor(gameRand() * targets.length)];
        const bx = br.bx + G.fx, by = br.by + G.fy;
        const col = TYPE_COLORS[mr.element] || '#40c4ff';
        damageBrick(br, 1.2, bx, by, mr.element);
        burst(bx, by - 8, col, 14, 240, 0.5);
        ringFx(bx, by, col, 4, 44, 3, 0.3);
        for (let i = 0; i < 5 && G.particles.length < 440; i++) { // the falling streak
          G.particles.push({ x: bx + (i - 2) * 3, y: by - 60 - i * 26, vx: 0, vy: 480,
            life: 0.22, maxLife: 0.22, color: i % 2 ? '#ffffff' : col, r: 2.6 });
        }
        tone(240 + mr.n * 60, 0.08, 'sawtooth', 0.05, -120);
      }
      if (mr.n <= 0) G.meteorRain = null;
    }
  }

  // ---- ACE INTERCEPTOR WING patrol: permanent wingmates. Shooter modes fire
  // seeking drone bolts; classic wingmates only bank INTERCEPTS — the ball
  // stays THE weapon.
  if (upgN('acewing') && G.state === 'play') {
    G.wingCD -= dt;
    if (G.wingCD <= 0) {
      G.wingCD = 5;
      if (G.mode === 'classic') {
        if (G.salvageStored < 2) G.salvageStored++;
      } else {
        const el = attackElement();
        for (const dir of [-1, 1]) {
          G.missiles.push({ x: G.paddle.x + dir * 34, y: shipY() + 6, vx: dir * 160, vy: -240, tier: 1, drone: true, element: el });
        }
        tone(660, 0.06, 'sine', 0.03, 120);
      }
    }
  }

  // ---- enemy fire (telegraphed — a warning flashes before every shot) ----
  if (G.state === 'play' && G.bossIntro <= 0) {
    const boss = G.bricks.find(b => b.isBoss && !b.dead && !b.dormant);
    if (boss) {
      // signature ability (teleport, winds, sweeps, time warp...)
      if (BOSS_ABILITIES[boss.poke.id] || boss.mythic || boss.secretBoss) {
        boss.abilityCD -= dt * ts;
        if (boss.abilityCD <= 0) {
          const abilityBase = boss.secretBoss ? 5.4
            : boss.mythic ? (MYTHIC_ABILITIES[boss.poke.id]?.cd || 5)
              : (BOSS_ABILITIES[boss.poke.id]?.cd || 5);
          boss.abilityCD = abilityBase * (bossLastStand(boss) ? 0.62 : boss.phase === 2 ? 0.78 : 1);
          bossAbility(boss);
        }
      }
      // deferred teleport (Mewtwo): anticipation ran, now the jump lands
      if (boss.teleportAt != null) {
        boss.teleportAt -= dt * ts;
        if (boss.teleportAt <= 0) {
          boss.teleportAt = null;
          burst(boss.bx + G.fx, boss.by + G.fy, '#ec407a', 34, 340, 0.7);
          boss.hx = boss.tpX;
          boss.bx = boss.hx;
          boss.flash = 1;
          burst(boss.bx + G.fx, boss.by + G.fy, '#ec407a', 34, 340, 0.7);
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
        G.bossShotCD = d.bossShotInt * (bossLastStand(boss) ? 0.5 : boss.phase === 2 ? 0.7 : 1)
          * (boss.secretBoss ? 0.88 : boss.mythic ? 0.7 : 1);
        G.telegraphs.push({ br: boss, boss: true, t: 0.55, max: 0.55 });
      }
    }
    // the shooter modes lean into the fantasy: enemies fire from the first
    // wave and roughly twice as often, with a bigger warning-line budget
    const blaster = G.mode !== 'classic';
    if (G.level >= 2 || blaster) {
      G.enemyShotCD -= dt * ts;
      if (G.enemyShotCD <= 0) {
        G.enemyShotCD = d.enemyShotInt * (0.7 + gameRand() * 0.6) * (blaster ? 0.5 : 1);
        // off-screen flyers (wrapping patterns / streams) can't fire
        const alive = G.bricks.filter(b => !b.dead && !b.isBoss && !b.subBoss && !b.entry && !b.dive
          && !b.barrier && !b.dormant && b.bx + G.fx > 30 && b.bx + G.fx < W - 30
          && !(G.encounter && b.flight && b.flight.sq != null && G.encounter.squads[b.flight.sq]
            && G.encounter.squads[b.flight.sq].silenceT > 0));
        // cap concurrent warnings so the board never fills with warning lines
        const activeTel = G.telegraphs.reduce((n, t) => n + (t.boss ? 0 : 1), 0);
        if (alive.length && activeTel < (blaster ? 5 : 3)) {
          const shooter = alive[Math.floor(gameRand() * alive.length)];
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
        const bStyle = BOSS_STYLE[tg.br.poke.id];
        const DOWN = Math.PI / 2;
        // each arena fires differently: Dialga's clockwork hands SWEEP the
        // arena; Eternatus rains bombs straight off the rim; everyone else
        // aims at you (their signature ability carries the rest)
        const angles = tg.fan ? [-0.5, -0.25, 0, 0.25, 0.5].map(a => base + a)
          : bStyle === 'bastion'
            ? (tg.br.phase >= 2
              ? [G.swayT * 0.9, G.swayT * 0.9 + Math.PI * 2 / 3, G.swayT * 0.9 + Math.PI * 4 / 3]
              : [G.swayT * 0.9, G.swayT * 0.9 + Math.PI])
          : bStyle === 'perimeter'
            ? (bossLastStand(tg.br) ? [DOWN - 0.32, DOWN, DOWN + 0.32]
              : tg.br.phase === 2 ? [DOWN - 0.2, DOWN + 0.2] : [DOWN])
          : bossLastStand(tg.br) ? [base - 0.6, base - 0.3, base, base + 0.3, base + 0.6]
          : tg.br.phase === 2 ? [base - 0.35, base, base + 0.35] : [base];
        for (const a of angles) G.enemyShots.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, boss: true, type: tg.br.poke.t });
      } else {
        // FIRE BY RANK: the unevolved rank-and-file keep the classic straight
        // bolt; evolved elites AIM at you with a heavy splash blast; the
        // sub-legendary sentinels and apex elites sweep a three-shot fan
        const src = tg.br;
        const eliteT = src.subBoss ? 3 : Math.max(src.elite || 0, src.maxHp >= 3 ? 2 : 0);
        const heavy = eliteT >= 2;
        const spd = (240 + d.lv * 18) * d.shotSpeed * (heavy ? 0.82 : 1);
        if (eliteT >= 3) {
          const base2 = Math.atan2(shipY() - by, G.paddle.x - bx);
          for (const off of [-0.26, 0, 0.26]) {
            G.enemyShots.push({ x: bx, y: by,
              vx: Math.cos(base2 + off) * spd, vy: Math.sin(base2 + off) * spd,
              type: src.poke.t, heavy: true, r: 15, splash: true });
          }
        } else if (eliteT === 2) {
          const base2 = Math.atan2(shipY() - by, G.paddle.x - bx);
          G.enemyShots.push({ x: bx, y: by,
            vx: Math.cos(base2) * spd, vy: Math.sin(base2) * spd,
            type: src.poke.t, heavy: true, r: 15, splash: true });
        } else {
          G.enemyShots.push({ x: bx, y: by, vy: spd, type: src.poke.t, r: 10 });
        }
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
        loseLife('BOSS BEAM');
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
    // heavy elite blasts have SPLASH — a wider hit envelope you can't quite dodge
    const spl = s.heavy ? (s.r || 12) * 0.7 : 0;
    const hitW = (jk ? 26 : (G.mode === 'classic' ? paddleW() : G.paddle.w) / 2 + 6) + spl;
    const hitH = (jk ? 24 : G.paddle.h) + spl;
    if (!s.dead && G.invuln <= 0 && s.y > py - hitH && s.y < py + hitH &&
        Math.abs(s.x - G.paddle.x) < hitW) {
      // SALVAGE DRONES (classic): a stored drone intercepts the shot short of you
      if (G.mode === 'classic' && G.salvageStored > 0 && !s.boss) {
        G.salvageStored--;
        s.dead = true;
        ringFx(s.x, py - 30, '#ea80fc', 5, 40, 3, 0.35);
        addFloater(G.paddle.x, py - 44, 'DRONE INTERCEPT!', '#ea80fc', 12);
        tone(880, 0.08, 'square', 0.05, -160);
        continue;
      }
      const eff = shotEffect(s.type); // +1 super-effective, -1 you resist
      const pc = TYPE_COLORS[playerType()] || '#90a4ae';
      // a NORMAL shot your type resists is deflected — no life lost. Heavy elite
      // blasts punch through your resist (that's what makes elites scary).
      if (eff === -1 && !s.heavy) {
        s.dead = true; G.invuln = 0.55;
        addFloater(G.paddle.x, py - 42, 'RESISTED', pc, 12);
        burst(s.x, py, pc, 10, 150, 0.4);
        ringFx(s.x, py, pc, 4, 26, 2, 0.3);
        tone(300, 0.06, 'sine', 0.04);
        continue;
      }
      s.dead = true;
      // elite blast: a splash burst + shake land even if a shield eats the hit
      if (s.heavy) {
        const bc = s.type ? TYPE_COLORS[s.type] : '#ff7043';
        burst(s.x, py, bc, 26, 340, 0.7);
        ringFx(s.x, py, bc, 8, (s.r || 14) * 3, 4, 0.4);
        G.shake = Math.min(G.shake + 8, 16);
      }
      if (absorbHit(s.x, py)) continue;
      G.invuln = 2;
      const weak = eff === 1;
      // super-effective HEAVY blasts really hurt — they take an extra life
      // (guarded so they never turn a last life into a double knockout)
      if (weak && s.heavy && G.lives > 1) { G.lives--; G.hurtHud = 2.4; }
      addFloater(G.paddle.x, py - 50, weak ? (s.heavy ? 'WEAK! −2' : 'WEAK!') : 'HIT!', weak ? '#ffab40' : '#ff5252', weak ? 24 : 22);
      burst(G.paddle.x, py, weak ? '#ffab40' : '#ff5252', weak ? 40 : 30, weak ? 380 : 320);
      loseLife((s.type || 'ENEMY').toUpperCase() + (s.heavy ? ' HEAVY ATTACK' : ' ATTACK'));
      return;
    }
    if (s.y > H + 20) s.dead = true;
  }
  G.enemyShots = G.enemyShots.filter(s => !s.dead);

  // ---- falling pickups (power-ups + pokéballs + element orbs) ----
  for (const pu of G.powerups) {
    pu.y += pu.vy * ts * dt; pu.rot += dt * 3;
    if (pu.orb) pu.x += Math.sin(pu.rot * 0.9) * 26 * dt; // orbs waft down gently
    if (pu.secretShard) {
      // The shard is generous but still optional: it bends toward the player
      // for a long catch window, then the rift closes and the normal finale
      // remains available if the player deliberately lets it pass.
      pu.secretT -= dt;
      pu.x += (G.paddle.x - pu.x) * Math.min(1, dt * 2.6);
      pu.vy = pu.y > shipY() - 120 ? 48 : 72;
    }
    if (upgN('magnetize')) { // Item Magnet: pickups drift toward the paddle
      const dx = G.paddle.x - pu.x;
      pu.x += Math.sign(dx) * Math.min(Math.abs(dx) * 2, 75 * upgN('magnetize')) * dt;
    }
    const pw = paddleW(), py = shipY(); // the ship catches wherever it flies
    // Overgrowth widens the pickup catch envelope at each evolution.
    const reach = 18 + starterMod('catchReach', 0);
    if (pu.y > py - 20 && pu.y < py + 24 && Math.abs(pu.x - G.paddle.x) < pw / 2 + reach) {
      pu.dead = true;
      collectPickup(pu);
    }
    if (!pu.dead && pu.secretShard && (pu.secretT <= 0 || pu.y > H + 30)) {
      pu.dead = true;
      if (G.secret.pendingShard === pu.shardIndex) G.secret.pendingShard = null;
      setAnnounce('alert', '#78909c', 'THE RIFT CLOSED',
        'SHARD ' + (pu.shardIndex + 1) + '/3 WAS LEFT BEHIND', 2.5,
        'MISS ANY PIECE AND KANTO KEEPS ITS NORMAL MEW FINALE');
    } else if (!pu.dead && pu.y > H + 30) pu.dead = true;
  }
  G.powerups = G.powerups.filter(p => !p.dead);

  // ---- level clear → reinforcements first, then draft and move on ----
  if (G.state === 'play' && G.dramaticT <= 0 && G.bricks.every(b => b.dead || b.barrier)) {
    // the enemies are gone — any ROCK TOMB barriers crumble on their own
    for (const b of G.bricks) if (!b.dead && b.barrier) { b.dead = true; burst(b.bx + G.fx, b.by + G.fy, '#a1887f', 12, 180, 0.5); }
    if (G.reinforce > 0) {
      G.reinforce--;
      spawnReinforcement();
      return;
    }
    // A gauntlet is not clear between rounds, even though every entity from
    // the previous round is dead for one frame.
    if (G.gauntlet && G.gauntlet.phase < 2) return;
    // Kanto Arrival and Challenge each offer one guaranteed piece. The clear
    // waits for the generous catch window, then continues whether caught or
    // deliberately left behind.
    if (secretEligible() && G.level <= 2 && !G.secret.shards[G.level - 1] && !G.secret.offered[G.level - 1]) {
      spawnRiftShard(G.level - 1, W / 2, Math.max(110, H * 0.22));
      return;
    }
    if (G.secret.pendingShard != null) return;
    // ---- THE NINEFOLD DAWN: clearing stage 27 on a real journey ENDS the
    // campaign — it must never silently roll into a harder Kanto loop. The
    // old loop survives as TIME SPIRAL, an explicit choice on the ending's
    // final beat. Trials and dailies keep their existing flow.
    if (G.level === 27 && !G.trial && !G.daily) {
      G.score += Math.round((300 + 2 * 250) * (G.fx_score ? 2 : 1));
      beginEnding();
      return;
    }
    const clearedStage = stageIdx(G.level);
    const secretVictory = !!(G.secret.vmax && clearedStage === 2);
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
    if (secretVictory) {
      G.secret.completed = true;
      G.secret.rewardDraft = true;
      G.secret.deferredChoices = G.upgradeChoices;
      G.upgradeChoices = SECRET_UPGRADES.map(secret => ({ secret }));
      G.score += 3000;
    }
    // The constellation is the primary choice surface for every normal hand —
    // tiers, bridges, superskills, and satellites all live on the map now.
    // Only the fixed secret Rift draft keeps its dedicated cards.
    upgradeTreeOpen = G.mode === 'junkie' && !secretVictory && !!G.upgradeChoices &&
      G.upgradeChoices.every(c => c.pathKey || c.web || c.stack);
    draftSel = null; // nothing inspected yet on a fresh draft
    if (upgradeTreeOpen) syncTreeSelectionToDraft();
    G.rerolled = secretVictory; // forbidden rewards are a fixed, one-time set
    // ---- ACT BOUNDARY: clearing Hoenn (→ act II) or Kalos (→ act III) is
    // the game's biggest beat — a full evolution ceremony plays before the
    // draft. The ceremony OWNS the partner evolution (bumps starterLvl now),
    // so buildLevel won't re-announce it with the plain banner later.
    if (!G.trial && !secretVictory && actIdx(G.level) > actIdx(G.level - 1)) {
      const sm = STARTER_MON[G.starter];
      const newLvl = starterStage(G.level, G.starter);
      let evo = null;
      if (sm && newLvl > G.starterLvl) {
        const ids = sm.ids, names = sm.names;
        evo = {
          fromId: ids[G.starterLvl - 1], toId: ids[newLvl - 1],
          fromName: names[G.starterLvl - 1], toName: names[newLvl - 1],
          type: G.starter,
          abilityOnly: ids[newLvl - 1] === ids[G.starterLvl - 1],
          ability: sm.ability + ' ' + romanTier(newLvl) + ' — ' + sm.tiers[newLvl - 1],
        };
        getSprite(evo.toId);
        getSprite(evo.fromId);
        applyStarterTierUpgrade(G.starterLvl, newLvl);
        G.starterLvl = newLvl;
      }
      G.ceremony = { act: actIdx(G.level), t: 0, evo, burst1: false, burst2: false };
      G.state = 'ceremony'; G.stateT = 0;
    }
    SFX.levelUp();
    // confetti!
    const palette = ['#ffd54f', '#66bb6a', '#42a5f5', '#ec407a', '#ab47bc', '#ff7043'];
    for (let i = 0; i < 6; i++) {
      burst(W * (0.15 + Math.random() * 0.7), H * (0.2 + Math.random() * 0.3),
        palette[i % palette.length], 14, 280, 1.2);
    }
  }
}
