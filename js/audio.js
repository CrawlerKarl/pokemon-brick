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
};
// ---- music: per-region chiptune with drums, bass, melody, pads ----
const MUSIC = { on: JSON.parse(localStorage.getItem('pkbrk-music') ?? 'true'), nextT: 0, step: 0 };
const GEN_ROOTS = [0, 2, 3, 5, 7, 8, 10, 1, 4];  // semitones above A2 per region
const GEN_TEMPO = [0.135, 0.15, 0.13, 0.155, 0.12, 0.14, 0.125, 0.118, 0.128];
let melPat = null, bassPat = null, melGen = -1;
function buildPattern(genIdx) {
  const r = sRand(genIdx * 999 + 5);
  const scale = [0, 3, 5, 7, 10, 12, 15, 17];
  melPat = []; bassPat = [];
  for (let i = 0; i < 64; i++) {
    // A section sparser, B section busier — a little song structure
    const density = i < 32 ? 0.38 : 0.52;
    melPat.push(r() < density ? scale[Math.floor(r() * scale.length)] + 12 : null);
  }
  for (let i = 0; i < 8; i++) bassPat.push(r() < 0.7 ? [0, 0, 3, 5, 7, 10][Math.floor(r() * 6)] : null);
  melGen = genIdx;
}
function playAt(f, t, dur, type, vol) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + dur);
}
function drumAt(buf, t, vol, hp) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const src = AC.createBufferSource(); src.buffer = buf;
  const g = AC.createGain(); g.gain.value = vol;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t);
}
function kickAt(t) {
  if (SETTINGS.music <= 0.01) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.11);
  g.gain.setValueAtTime(0.07 * SETTINGS.music, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + 0.14);
}
function musicTick() {
  if (!AC || !MUSIC.on || paused || document.hidden) return;
  const genIdx = G.state === 'menu' || G.state === 'dex' ? 0 : regionIdx(G.level);
  if (melGen !== genIdx) buildPattern(genIdx);
  if (MUSIC.nextT < AC.currentTime - 0.4) { MUSIC.nextT = AC.currentTime + 0.05; }
  const root = 110 * Math.pow(2, GEN_ROOTS[genIdx] / 12);
  const stepDur = GEN_TEMPO[genIdx];
  // intensity layer: enraged boss or mega evolution doubles the energy
  const intense = G.megaT > 0 || G.bricks.some(b => b.isBoss && !b.dead && b.phase === 2);
  while (MUSIC.nextT < AC.currentTime + 0.3) {
    const s = MUSIC.step, t = MUSIC.nextT;
    if (s % 8 === 0 || (intense && s % 8 === 6)) kickAt(t);
    if (s % 8 === 4 && snareBuf) drumAt(snareBuf, t, 0.028, 1600);
    if ((s % 2 === 1 || intense) && hatBuf) drumAt(hatBuf, t, intense ? 0.013 : 0.008, 6000);
    const b = bassPat[s % 8];
    if (b != null) playAt(root / 2 * Math.pow(2, b / 12), t, stepDur * 1.4, 'square', 0.022);
    const m = melPat[s];
    if (m != null) {
      playAt(root * 2 * Math.pow(2, m / 12), t, stepDur, 'triangle', 0.017);
      if (intense) playAt(root * 4 * Math.pow(2, m / 12), t, stepDur * 0.8, 'square', 0.006);
    }
    if (s % 32 === 0) [0, 3, 7].forEach(iv => playAt(root * Math.pow(2, iv / 12), t, stepDur * 14, 'sine', 0.006));
    MUSIC.step = (MUSIC.step + 1) % 64;
    MUSIC.nextT += stepDur;
  }
}
