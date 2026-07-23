'use strict';
// ============================================================
//  AUDIO — sfx synth + per-region chiptune sequencer
// ============================================================
let AC = null, hatBuf = null, snareBuf = null;
function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const mk = dur => {
        const len = AC.sampleRate * dur;
        const buf = AC.createBuffer(1, len, AC.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        return buf;
      };
      hatBuf = mk(0.04);
      snareBuf = mk(0.13);
    } catch (e) {}
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, dur, type = 'square', vol = 0.06, slide = 0) {
  const ac = audio(); if (!ac) return;
  vol *= SETTINGS.sfx; if (vol <= 0.0005) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime + dur);
}
function noiseBurst(dur = 0.25, vol = 0.12) {
  const ac = audio(); if (!ac) return;
  vol *= SETTINGS.sfx; if (vol <= 0.0005) return;
  const len = ac.sampleRate * dur;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = vol;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
}
const SFX = {
  hit: c => tone(220 + Math.min(c, 12) * 40, 0.07, 'square', 0.05),
  brick: () => { tone(520, 0.1, 'triangle', 0.07, -200); noiseBurst(0.12, 0.05); },
  paddle: () => tone(180, 0.08, 'sine', 0.08, 60),
  wall: () => tone(140, 0.05, 'sine', 0.04),
  laser: () => tone(880, 0.09, 'sawtooth', 0.035, -500),
  blaster: () => tone(620, 0.1, 'square', 0.045, -300),
  missile: () => tone(320, 0.25, 'sawtooth', 0.05, 500),
  power: () => { tone(660, 0.1, 'triangle', 0.07); setTimeout(() => tone(990, 0.14, 'triangle', 0.07), 90); },
  superFx: () => tone(1320, 0.12, 'square', 0.045, 300),
  gotcha: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.07), i * 80)),
  mega: () => [262, 330, 392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sawtooth', 0.06), i * 70)),
  enrage: () => { tone(90, 0.5, 'sawtooth', 0.1, -30); noiseBurst(0.3, 0.08); },
  roar: () => tone(70, 0.7, 'sawtooth', 0.12, 160),
  lifeLost: () => { tone(300, 0.3, 'sawtooth', 0.09, -200); noiseBurst(0.4, 0.12); },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.07), i * 110)),
  gameOver: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.07), i * 220)),
  enemyShot: () => tone(160, 0.12, 'sawtooth', 0.04, -60),
  bossHit: () => tone(110, 0.15, 'square', 0.07, -30),
  bossDown: () => { noiseBurst(0.6, 0.16); [220, 330, 440, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.08), i * 90)); },
  shield: () => tone(440, 0.15, 'sine', 0.08, 220),
  relic: () => tone(520, 0.12, 'sawtooth', 0.04, 260),      // the glaive whips out
  relicBack: () => tone(300, 0.09, 'triangle', 0.05, -120), // and slaps home
  // stage-clear fanfare (results screen) — brighter than levelUp, shorter
  // than mega: an upward triad roll with a sparkle tail
  stageClear: () => {
    [392, 494, 587, 784].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.075), i * 90));
    setTimeout(() => tone(1175, 0.32, 'sine', 0.05), 400);
  },
  // region-arrival sting — two warm swells under the intro card
  regionIntro: () => {
    tone(196, 0.5, 'sine', 0.055, 30);
    setTimeout(() => { tone(294, 0.5, 'sine', 0.05, 20); tone(392, 0.55, 'triangle', 0.045); }, 260);
  },
  medal: () => [880, 1109, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.06), i * 70)),
};
// ---- music: an original nine-region creature-adventure score -------------
// Each route has its own scale, pulse, motif, rhythm and instrument family.
// Every region also carries a separately authored boss arrangement rather
// than merely speeding up the exploration loop. These are original procedural
// compositions; no recordings, samples, or melodies from another game ship.
const MUSIC = { on: loadStore('pkbrk-music', 'true') !== false, nextT: 0, step: 0, scene: '' };
const ADVENTURE_MUSIC = Object.freeze([
  { region: 'KANTO', title: 'TRAILHEAD SKIES', root: 60, bpm: 126, scale: [0,2,4,5,7,9,11], prog: [0,3,4,0],
    motif: [0,2,4,2,5,4,2,1], rhythm: [0,2,4,6,8,10,12,14], bass: [0,8], kick: [0,8], snare: [4,12], hat: [2,6,10,14], voice: 'pulse', counter: [7,15], echo: 0.2,
    boss: { title: 'INDIGO CHALLENGE', root: 60, bpm: 158, scale: [0,2,3,5,7,8,11], prog: [0,5,3,4], motif: [0,4,3,6,5,3,2,4], rhythm: [0,1,3,4,6,8,9,11,12,14], bass: [0,4,8,12], kick: [0,6,8,14], snare: [4,12], hat: [1,3,5,7,9,11,13,15], voice: 'brass', counter: [2,7,10,15], echo: 0.12 } },
  { region: 'JOHTO', title: 'BELLFLOWER ROAD', root: 62, bpm: 112, scale: [0,2,4,7,9], prog: [0,3,1,4],
    motif: [0,1,3,4,3,1,2,0], rhythm: [0,3,6,8,11,14], bass: [0,8], kick: [0,10], snare: [6,14], hat: [3,7,11,15], voice: 'bell', counter: [4,12], echo: 0.34,
    boss: { title: 'TIN TOWER STORM', root: 62, bpm: 148, scale: [0,2,3,5,7,9,10], prog: [0,4,5,3], motif: [0,5,2,4,6,3,1,5], rhythm: [0,2,3,5,7,8,10,12,13,15], bass: [0,6,8,14], kick: [0,6,10], snare: [4,12], hat: [1,3,5,7,9,11,13,15], voice: 'reed', counter: [4,11], echo: 0.25 } },
  { region: 'HOENN', title: 'TIDELINE EXPEDITION', root: 63, bpm: 132, scale: [0,2,4,5,7,9,10], prog: [0,4,3,5],
    motif: [0,2,4,5,4,6,3,2], rhythm: [0,3,6,8,11,14], bass: [0,6,12], kick: [0,6,12], snare: [4,10], hat: [2,5,8,11,14], voice: 'pluck', counter: [7,15], echo: 0.27,
    boss: { title: 'WEATHER TRIO ASCENT', root: 63, bpm: 164, scale: [0,1,3,5,7,8,10], prog: [0,6,3,5], motif: [0,6,5,2,4,1,3,6], rhythm: [0,1,3,4,6,7,9,10,12,13,15], bass: [0,3,6,9,12], kick: [0,5,8,13], snare: [4,12], hat: [2,3,6,7,10,11,14,15], voice: 'brass', counter: [5,11], echo: 0.14 } },
  { region: 'SINNOH', title: 'MOUNTAIN LANTERNS', root: 65, bpm: 118, scale: [0,2,3,5,7,9,10], prog: [0,3,6,4],
    motif: [0,2,5,4,2,1,3,6], rhythm: [0,2,5,8,10,13], bass: [0,8], kick: [0,8], snare: [4,12], hat: [2,6,10,14], voice: 'bell', counter: [6,14], echo: 0.38,
    boss: { title: 'SPEAR PILLAR CLOCKWORK', root: 65, bpm: 152, scale: [0,2,3,5,7,8,11], prog: [0,5,1,6], motif: [0,6,3,5,2,4,1,6], rhythm: [0,2,3,5,6,8,10,11,13,14], bass: [0,4,8,12], kick: [0,7,8,15], snare: [4,12], hat: [1,3,5,7,9,11,13,15], voice: 'clock', counter: [4,9,15], echo: 0.2 } },
  { region: 'UNOVA', title: 'SKYLINE EXPRESS', root: 67, bpm: 138, scale: [0,2,4,6,7,9,11], prog: [0,4,1,5],
    motif: [0,3,1,5,4,2,6,3], rhythm: [0,2,4,7,8,10,13,15], bass: [0,5,8,13], kick: [0,7,10], snare: [4,12], hat: [2,3,6,7,10,11,14,15], voice: 'reed', counter: [6,14], echo: 0.18,
    boss: { title: 'DRAGONSPIRAL DUEL', root: 67, bpm: 166, scale: [0,1,3,5,7,9,10], prog: [0,6,4,1], motif: [0,4,6,1,5,3,2,6], rhythm: [0,1,3,5,6,8,9,11,13,14,15], bass: [0,4,7,8,12], kick: [0,3,8,11,14], snare: [4,12], hat: [1,2,5,6,9,10,13,14], voice: 'drive', counter: [4,7,12], echo: 0.1 } },
  { region: 'KALOS', title: 'LUMIOSE PROMENADE', root: 68, bpm: 120, scale: [0,2,4,5,7,9,11], prog: [0,5,3,4],
    motif: [0,2,4,6,5,3,1,4], rhythm: [0,3,6,8,11,14], bass: [0,8], kick: [0,6,12], snare: [4,10], hat: [2,5,8,11,14], voice: 'flute', counter: [5,13], echo: 0.31,
    boss: { title: 'ULTIMATE WEAPON WALTZ', root: 68, bpm: 156, scale: [0,2,3,5,7,8,11], prog: [0,3,5,6], motif: [0,5,3,6,2,4,1,5], rhythm: [0,2,3,5,6,8,10,11,13,14], bass: [0,6,12], kick: [0,5,10,15], snare: [3,11], hat: [1,4,7,9,12,15], voice: 'strings', counter: [4,9,15], echo: 0.24 } },
  { region: 'ALOLA', title: 'ISLAND WINDWAY', root: 70, bpm: 128, scale: [0,2,4,7,9,10], prog: [0,3,4,1],
    motif: [0,2,4,1,5,3,2,4], rhythm: [0,3,5,8,10,11,14], bass: [0,6,10], kick: [0,6,10], snare: [4,12], hat: [2,5,7,9,13,15], voice: 'marimba', counter: [6,13], echo: 0.22,
    boss: { title: 'ULTRA WORMHOLE RITUAL', root: 70, bpm: 160, scale: [0,1,3,5,7,8,10], prog: [0,5,2,6], motif: [0,6,2,5,1,4,3,6], rhythm: [0,1,4,5,7,8,10,12,13,15], bass: [0,3,6,9,12,15], kick: [0,6,8,14], snare: [4,12], hat: [2,3,6,7,10,11,14,15], voice: 'glass', counter: [5,9,13], echo: 0.36 } },
  { region: 'GALAR', title: 'CROWN MARCH', root: 61, bpm: 134, scale: [0,2,4,5,7,9,10], prog: [0,4,5,3],
    motif: [0,2,4,5,6,4,3,1], rhythm: [0,2,4,6,8,10,12,14], bass: [0,4,8,12], kick: [0,8], snare: [4,12], hat: [2,6,10,14], voice: 'brass', counter: [3,7,11,15], echo: 0.15,
    boss: { title: 'STADIUM MAX FINALE', root: 61, bpm: 170, scale: [0,2,3,5,7,8,10], prog: [0,6,3,4], motif: [0,4,6,5,2,3,1,6], rhythm: [0,1,2,4,6,7,8,10,12,13,14], bass: [0,4,8,12], kick: [0,3,6,8,11,14], snare: [4,12], hat: [1,3,5,7,9,11,13,15], voice: 'stadium', counter: [5,9,15], echo: 0.11 } },
  { region: 'PALDEA', title: 'TREASURE ROAD', root: 64, bpm: 142, scale: [0,1,4,5,7,8,10], prog: [0,3,4,1],
    motif: [0,2,1,4,3,5,2,6], rhythm: [0,2,3,6,8,9,12,14], bass: [0,5,8,13], kick: [0,5,8,13], snare: [4,12], hat: [1,3,6,7,9,11,14,15], voice: 'guitar', counter: [4,10,15], echo: 0.19,
    boss: { title: 'PARADOX HORIZON', root: 64, bpm: 176, scale: [0,1,3,4,7,8,10], prog: [0,6,2,5], motif: [0,6,1,5,2,4,3,6], rhythm: [0,1,3,4,5,7,8,10,11,12,14,15], bass: [0,3,6,8,11,14], kick: [0,3,6,8,11,14], snare: [4,12], hat: [1,2,4,5,7,9,10,13,15], voice: 'drive', counter: [2,6,9,13], echo: 0.09 } },
]);

function musicTheme(genIdx, boss = false) {
  const base = ADVENTURE_MUSIC[Math.max(0, Math.min(ADVENTURE_MUSIC.length - 1, genIdx | 0))];
  return boss ? Object.assign({}, base, base.boss, { region: base.region, boss: true }) : Object.assign({}, base, { boss: false });
}
function musicScaleSemitone(scale, degree) {
  const n = scale.length, octave = Math.floor(degree / n), index = ((degree % n) + n) % n;
  return scale[index] + octave * 12;
}
function midiFreq(note) { return 440 * Math.pow(2, (note - 69) / 12); }

let musicPat = null;
function buildMusicPattern(genIdx, boss = false) {
  const cfg = musicTheme(genIdx, boss);
  const melody = new Array(128).fill(null), bass = new Array(128).fill(null), counter = new Array(128).fill(null);
  for (let bar = 0; bar < 8; bar++) {
    const rootDegree = cfg.prog[bar % cfg.prog.length];
    for (let i = 0; i < cfg.rhythm.length; i++) {
      const step = bar * 16 + cfg.rhythm[i];
      const phraseIndex = (bar * 3 + i) % cfg.motif.length;
      const lift = bar === 3 || bar === 7 ? 1 : 0;
      melody[step] = rootDegree + cfg.motif[phraseIndex] + lift * cfg.scale.length;
    }
    for (let i = 0; i < cfg.bass.length; i++) {
      const step = bar * 16 + cfg.bass[i];
      bass[step] = rootDegree + (i % 3 === 2 ? cfg.scale.length : 0);
    }
    for (let i = 0; i < cfg.counter.length; i++) {
      const step = bar * 16 + cfg.counter[i];
      const reverse = cfg.motif[(cfg.motif.length - 1 - i + bar) % cfg.motif.length];
      counter[step] = rootDegree + reverse - cfg.scale.length;
    }
  }
  return { cfg, melody, bass, counter };
}

// Shared music bus: brighter than the old blanket low-pass, with scene-tuned
// delay. Oscillator layers provide bell, reed, brass, marimba, guitar and
// glass-like colours without external audio files or licensing dependencies.
let musicBus = null, musicEcho = null, musicFilter = null, musicFeedback = null;
function musicOut() {
  if (!musicBus) {
    musicFilter = AC.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 5200;
    musicFilter.connect(AC.destination);
    musicBus = AC.createGain(); musicBus.gain.value = 0.92; musicBus.connect(musicFilter);
    musicEcho = AC.createDelay(0.8); musicEcho.delayTime.value = 0.24;
    musicFeedback = AC.createGain(); musicFeedback.gain.value = 0.28;
    const wet = AC.createGain(); wet.gain.value = 0.2;
    musicEcho.connect(musicFeedback); musicFeedback.connect(musicEcho);
    musicEcho.connect(wet); wet.connect(musicFilter);
  }
  return musicBus;
}
function playAt(f, t, dur, type, vol, echo = false, detune = 0) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.018, dur * 0.18));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicOut()); if (echo) g.connect(musicEcho);
  o.start(t); o.stop(t + dur + 0.02);
}
function musicVoiceAt(voice, f, t, dur, vol, echo) {
  switch (voice) {
    case 'bell': playAt(f, t, dur, 'sine', vol, echo); playAt(f * 2.005, t, dur * 0.72, 'sine', vol * 0.38, echo); break;
    case 'pluck': playAt(f, t, dur * 0.62, 'triangle', vol * 1.05, echo); playAt(f * 2, t, dur * 0.32, 'sine', vol * 0.28, echo); break;
    case 'flute': playAt(f, t, dur * 1.12, 'sine', vol, echo); playAt(f * 2, t, dur * 0.72, 'triangle', vol * 0.18, echo); break;
    case 'reed': playAt(f, t, dur, 'sawtooth', vol * 0.42, echo); playAt(f, t, dur * 0.9, 'square', vol * 0.3, echo, 5); break;
    case 'brass': playAt(f, t, dur * 0.9, 'sawtooth', vol * 0.58, echo); playAt(f / 2, t, dur, 'square', vol * 0.26, false); break;
    case 'clock': playAt(f, t, dur * 0.48, 'square', vol * 0.55, echo); playAt(f * 2, t, dur * 0.3, 'sine', vol * 0.34, echo); break;
    case 'strings': playAt(f, t, dur * 1.35, 'triangle', vol * 0.78, echo, -6); playAt(f, t, dur * 1.25, 'sawtooth', vol * 0.18, echo, 6); break;
    case 'marimba': playAt(f, t, dur * 0.42, 'sine', vol * 1.08, echo); playAt(f * 3, t, dur * 0.2, 'sine', vol * 0.18, false); break;
    case 'glass': playAt(f, t, dur * 1.1, 'sine', vol * 0.9, echo); playAt(f * 2.99, t, dur * 0.72, 'sine', vol * 0.22, echo); break;
    case 'stadium': playAt(f, t, dur, 'sawtooth', vol * 0.5, echo); playAt(f / 2, t, dur * 1.2, 'triangle', vol * 0.38, false); break;
    case 'guitar': playAt(f, t, dur * 0.55, 'triangle', vol, echo); playAt(f * 1.5, t, dur * 0.26, 'square', vol * 0.16, false); break;
    case 'drive': playAt(f, t, dur * 0.75, 'sawtooth', vol * 0.46, echo, -7); playAt(f, t, dur * 0.7, 'square', vol * 0.3, echo, 7); break;
    default: playAt(f, t, dur, 'square', vol * 0.62, echo); playAt(f, t, dur, 'triangle', vol * 0.5, echo, 4);
  }
}
function drumAt(buf, t, vol, hp) {
  vol *= SETTINGS.music; if (vol <= 0.0003 || !buf) return;
  const src = AC.createBufferSource(); src.buffer = buf;
  const g = AC.createGain(); g.gain.value = vol;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  src.connect(f); f.connect(g); g.connect(musicOut()); src.start(t);
}
function kickAt(t, strong = false) {
  if (SETTINGS.music <= 0.01) return;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(strong ? 145 : 118, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.11);
  g.gain.setValueAtTime((strong ? 0.072 : 0.055) * SETTINGS.music, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g); g.connect(musicOut()); o.start(t); o.stop(t + 0.14);
}
function currentMusicScene() {
  const genIdx = G.state === 'menu' || G.state === 'dex' ? 0 : regionIdx(G.level);
  const inCombat = G.state === 'play' || G.state === 'serve';
  const boss = inCombat && (!!G.gauntlet || G.bricks.some(b => !b.dead && !b.dormant && (b.isBoss || b.subBoss)));
  return { genIdx, boss, key: genIdx + ':' + (boss ? 'boss' : 'route') };
}
// Graded boss-music heat (pure — reads G, no audio API). musicTick consumes
// it: 0 = no live boss / phase 1 / sentinels (subBoss isn't isBoss, so they
// never register); 1 = a multi-phase boss past phase 1 but not last stand
// (mythic phase 2), OR Mega active over any live boss; 2 = last stand
// (phase === phaseCount with phaseCount >= 2 — legendary phase 2, mythic phase 3).
function bossMusicHeat() {
  let boss = null;
  for (const b of G.bricks) {
    if (b.dead || b.dormant || !b.isBoss) continue;
    boss = b; break; // only ever one active boss on stage
  }
  if (!boss) return 0;
  const pc = bossPhaseCount(boss), ph = boss.phase || 1;
  if (ph >= pc && pc >= 2) return 2;    // last stand
  if (ph > 1 || G.megaT > 0) return 1;  // escalated, or Mega popped mid-fight
  return 0;
}
function musicTick() {
  if (!AC || !MUSIC.on || paused || document.hidden) return;
  const scene = currentMusicScene();
  if (MUSIC.scene !== scene.key || !musicPat) {
    musicPat = buildMusicPattern(scene.genIdx, scene.boss);
    MUSIC.scene = scene.key; MUSIC.step = 0; MUSIC.nextT = AC.currentTime + 0.055;
    musicOut();
    musicEcho.delayTime.setTargetAtTime(musicPat.cfg.echo, AC.currentTime, 0.12);
    musicFilter.frequency.setTargetAtTime(scene.boss ? 6100 : 5200, AC.currentTime, 0.18);
  }
  if (MUSIC.nextT < AC.currentTime - 0.4) MUSIC.nextT = AC.currentTime + 0.05;
  const cfg = musicPat.cfg, stepDur = 60 / cfg.bpm / 4;
  // Graded boss heat (audio.js:222): 0 = none/phase-1/sentinels, 1 = escalated
  // (mythic phase 2 or Mega popped) — reproduces today's intense layer exactly,
  // 2 = last stand — adds a double-time hat row + a denser counter pulse.
  const heat = bossMusicHeat();
  while (MUSIC.nextT < AC.currentTime + 0.3) {
    const s = MUSIC.step, inBar = s % 16, bar = Math.floor(s / 16), t = MUSIC.nextT;
    if (cfg.kick.includes(inBar)) kickAt(t, cfg.boss || heat >= 1);
    if (heat >= 1 && cfg.boss && inBar === 15) kickAt(t, true);
    if (cfg.snare.includes(inBar)) drumAt(snareBuf, t, cfg.boss ? 0.024 : 0.017, 1500);
    if (cfg.hat.includes(inBar)) drumAt(hatBuf, t, cfg.boss ? 0.011 : 0.006, 5700);
    // last stand: fill the OFF 16th-steps with a half-gain hat — a double-time row
    else if (heat >= 2) drumAt(hatBuf, t, (cfg.boss ? 0.011 : 0.006) * 0.5, 5700);
    const bassDegree = musicPat.bass[s];
    if (bassDegree != null) {
      const bf = midiFreq(cfg.root - 24 + musicScaleSemitone(cfg.scale, bassDegree));
      playAt(bf, t, stepDur * (cfg.boss ? 1.7 : 2.2), cfg.boss ? 'sawtooth' : 'triangle', cfg.boss ? 0.016 : 0.023);
    }
    const degree = musicPat.melody[s];
    if (degree != null) {
      const f = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, degree));
      musicVoiceAt(cfg.voice, f, t, stepDur * (cfg.boss ? 1.25 : 1.55), cfg.boss ? 0.015 : 0.014, true);
      if (heat >= 1) playAt(f * 2, t, stepDur * 0.66, 'square', 0.0038, true);
    }
    const counterDegree = musicPat.counter[s];
    if (counterDegree != null) {
      const cf = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, counterDegree));
      musicVoiceAt(cfg.boss ? 'pulse' : 'flute', cf, t, stepDur * 1.8, 0.0052, false);
      // last stand: an off-beat diatonic-third echo thickens the counter into a
      // denser pulse (one extra quiet voice per counter note — cheap)
      if (heat >= 2) {
        const ef = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, counterDegree + 2));
        musicVoiceAt(cfg.boss ? 'pulse' : 'flute', ef, t + stepDur * 0.5, stepDur * 1.1, 0.0034, false);
      }
    }
    // A three-note diatonic pad changes every bar, giving exploration forward
    // motion and boss battles a harmonic floor under their busier percussion.
    if (inBar === 0) {
      const chordDegree = cfg.prog[bar % cfg.prog.length];
      [0,2,4].forEach(iv => {
        const pf = midiFreq(cfg.root - 12 + musicScaleSemitone(cfg.scale, chordDegree + iv));
        playAt(pf, t, stepDur * 15, cfg.boss ? 'triangle' : 'sine', cfg.boss ? 0.0034 : 0.0042);
      });
    }
    MUSIC.step = (MUSIC.step + 1) % 128;
    MUSIC.nextT += stepDur;
  }
}
