'use strict';
// ============================================================
//  AUDIO — the sound engine: a layered SFX synth and a produced
//  per-region chiptune/synthwave score. Everything is synthesized with
//  the Web Audio API at runtime: no samples, no network, no licences.
// ============================================================
// Phone budget rules this file keeps (AFT-030):
//  * every note builds a SMALL FIXED set of nodes (2–5), each with a stop
//    time and an envelope that starts and ends near-silent (≥3 ms attack,
//    exponential ramps never target 0) — no clicks, no stuck voices;
//  * everything shared is built ONCE per context: the master bus, the
//    noise buffer, the drum/SFX filters, the instrument buses, the
//    vibrato LFO. No AudioBuffer is ever built per hit;
//  * melodic music voices and SFX voices are polyphony-capped;
//  * every Web Audio call that an old browser may lack is guarded, and
//    with no AudioContext at all the game simply runs silent;
//  * audio is sim-neutral: no gameRand(), no game-state writes. All the
//    humanizing jitter here is cosmetic Math.random().
let AC = null, AUDIO_OFFLINE = false;
const AUDIO_EPS = 0.0001; // the floor every exponential ramp lands on
function audio() {
  if (!AC) {
    try {
      const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (Ctor) AC = new Ctor();
    } catch (e) { AC = null; }
  }
  // AFT-015: anything not 'running' is resumable (iOS adds a non-standard 'interrupted')
  if (AC && !AUDIO_OFFLINE && AC.state !== 'running' && AC.state !== 'closed') { try { const rp = AC.resume(); if (rp && rp.catch) rp.catch(() => {}); } catch (e) {} }
  return AC;
}
// MEASUREMENT HOOK — tools only; the game never calls it. Points the engine
// at a caller-supplied context (an OfflineAudioContext in the audio
// harness) and returns the previous one. Every per-context cache below is
// keyed by its context, so swapping back is clean; the only state touched
// is the music scheduler's scene/position, which restarts on swap.
function audioUseContext(ctx) {
  const prev = AC;
  AC = ctx || null;
  AUDIO_OFFLINE = !!ctx && typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
  if (typeof MUSIC !== 'undefined') { MUSIC.scene = ''; MUSIC.heat = -1; }
  SFX_VOICES.ends.fill(0); SFX_EVENTS.ends.fill(0); MUSIC_VOICES.ends.fill(0); // ledgers hold times on the OLD clock
  musicPat = null;
  return prev;
}
function audioPan(ac, v) {
  // StereoPannerNode is missing on some old WebViews — a plain gain keeps
  // the routing intact (just mono there)
  try { if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = v; return p; } } catch (e) {}
  return ac.createGain();
}
function audioFilter(ac, type, freq, q) {
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q != null) f.Q.value = q; return f;
}
function softClipCurve(n, knee, drive) {
  // linear below the knee, a tanh shoulder above it — never reaches 1.0
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, ax = Math.abs(x) * (drive || 1);
    const y = ax <= knee ? ax : knee + (0.985 - knee) * Math.tanh((ax - knee) / (0.985 - knee));
    c[i] = (x < 0 ? -1 : 1) * Math.min(0.985, y);
  }
  return c;
}
// ---- THE MASTER BUS (AFT-029 → AFT-030) ---------------------------------
// sfx ──────────────┐
// music ── sendM ─┐ ├─ glue compressor ─ peak limiter ─ soft clip ─ out
// musicDry ───────┼─┘          ▲
// verb (input) ── convolver ───┘   (generated-impulse ROOM, built once)
// `music` feeds the room a little; `musicDry` (bass + kick) stays dry so
// the low end is tight; `verb` lets an instrument bus add its own send.
// Everything is guarded — any missing node degrades to a plainer chain,
// down to the bare destination.
let AUDIO_BUS = null;
function audioBus(ac) {
  if (AUDIO_BUS && AUDIO_BUS.ac === ac) return AUDIO_BUS;
  const bus = { ac, sfx: ac.destination, music: ac.destination, musicDry: ac.destination, verb: null };
  try {
    let out = ac.destination;
    try {
      const clip = ac.createWaveShaper(); clip.curve = softClipCurve(2049, 0.82); clip.connect(ac.destination); out = clip;
    } catch (e) {}
    try {
      const lim = ac.createDynamicsCompressor();
      lim.threshold.value = -2.5; lim.knee.value = 0; lim.ratio.value = 20;
      lim.attack.value = 0.001; lim.release.value = 0.09;
      lim.connect(out); out = lim;
    } catch (e) {}
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 2.5;
    comp.attack.value = 0.006; comp.release.value = 0.22;
    comp.connect(out);
    const sfx = ac.createGain(), music = ac.createGain(), musicDry = ac.createGain();
    sfx.gain.value = 1.35; // SFX trim: the table below is balanced against this
    sfx.connect(comp); music.connect(comp); musicDry.connect(comp);
    bus.sfx = sfx; bus.music = music; bus.musicDry = musicDry;
    try {
      const len = Math.floor(ac.sampleRate * 1.6);
      const ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.42 * t); // the tail darkens as it decays
          d[i] = lp * Math.pow(1 - t, 3) * (i < 400 ? i / 400 : 1);
        }
      }
      const conv = ac.createConvolver(); conv.buffer = ir;
      const verbIn = ac.createGain(); verbIn.connect(conv);
      const verbHp = audioFilter(ac, 'highpass', 220, 0.6); // no low-end mud in the room
      const wet = ac.createGain(); wet.gain.value = 0.85;
      conv.connect(verbHp); verbHp.connect(wet); wet.connect(comp);
      const sendM = ac.createGain(); sendM.gain.value = 0.16;  // music breathes
      const sendS = ac.createGain(); sendS.gain.value = 0.07;  // SFX stay punchy
      music.connect(sendM); sendM.connect(verbIn);
      sfx.connect(sendS); sendS.connect(verbIn);
      bus.verb = verbIn;
    } catch (e) { /* no reverb — the dry bus still works */ }
  } catch (e) { /* no bus — straight to the speaker */ }
  AUDIO_BUS = bus;
  return bus;
}
// ---- per-context shared parts: one noise buffer + the SFX filter rack ----
let AUDIO_KIT = null;
function audioKit(ac) {
  if (AUDIO_KIT && AUDIO_KIT.ac === ac) return AUDIO_KIT;
  const bus = audioBus(ac);
  const K = { ac, bus, noise: null, soft: bus.sfx, low: bus.sfx, click: bus.sfx, air: bus.sfx, body: bus.sfx, music: null };
  try {
    // 2 s of white noise, generated ONCE; every hit plays a looped slice
    // from a random offset, so repeats never phase-lock
    const len = Math.floor(ac.sampleRate * 2), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    K.noise = buf;
  } catch (e) {}
  try {
    const rack = (type, f, q) => { const n = audioFilter(ac, type, f, q); n.connect(bus.sfx); return n; };
    K.soft = rack('lowpass', 6800, 0.5);    // tames raw square/saw tones
    K.low = rack('lowpass', 1800, 0.7);     // the classic noise burst
    K.click = rack('highpass', 2600, 0.7);  // transients
    K.air = rack('bandpass', 4200, 0.8);    // whooshes / sparkle air
    K.body = rack('lowpass', 420, 0.9);     // thumps
  } catch (e) {}
  AUDIO_KIT = K;
  return K;
}
// Polyphony ledger: a fixed slot array of voice end-times (no allocation).
// A voice that finds no free slot is dropped (or, with `force`, takes the
// slot that ends soonest — used for the pattern-bound music lead).
function voiceLedger(n) { return { ends: new Float64Array(n) }; }
function ledgerClaim(L, t, end, force) {
  const e = L.ends; let oldest = 0;
  for (let i = 0; i < e.length; i++) {
    if (e[i] <= t) { e[i] = end; return true; }
    if (e[i] < e[oldest]) oldest = i;
  }
  if (!force) return false;
  e[oldest] = end; return true;
}
const SFX_VOICES = voiceLedger(28), SFX_EVENTS = voiceLedger(16);
// ambient voices share 28 slots; an EVENT-loud voice (base level ≥ the
// threshold) that finds them full takes one of 16 reserve slots instead —
// so a pile-up never silences a fanfare, and never exceeds 44 voices.
function sfxClaim(t, end, baseVol, loud) {
  return ledgerClaim(SFX_VOICES, t, end, false) || (baseVol >= loud && ledgerClaim(SFX_EVENTS, t, end, false));
}
function sfxVary(cents) { return Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200); }
// Shaped amp envelope on a GainNode: near-silent start, ≥3 ms attack,
// exponential decay to the floor at `end`.
function envPerc(g, t, a, peak, end) {
  g.setValueAtTime(AUDIO_EPS, t);
  g.linearRampToValueAtTime(peak, t + a);
  g.exponentialRampToValueAtTime(AUDIO_EPS, Math.max(t + a + 0.004, end));
}
// tone(): the generic SFX voice the whole game calls. Signature unchanged;
// the optional 6th arg schedules it `when` seconds ahead (sample-accurate,
// unlike the old setTimeout chains).
function tone(freq, dur, type = 'square', vol = 0.06, slide = 0, when = 0) {
  const ac = audio(); if (!ac) return;
  const base = vol; vol *= SETTINGS.sfx; if (vol <= 0.0005) return;
  try {
    const t = ac.currentTime + Math.max(0, when || 0), end = t + Math.max(0.02, dur);
    if (!sfxClaim(t, end, base, 0.06)) return;
    const K = audioKit(ac);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), end);
    envPerc(g.gain, t, 0.003, vol, end);
    o.connect(g); g.connect(type === 'square' || type === 'sawtooth' ? K.soft : K.bus.sfx);
    o.start(t); o.stop(end + 0.01);
  } catch (e) {}
}
// sfxNoise(): a slice of the shared noise buffer through one of the shared
// rack filters ('low' | 'click' | 'air' | 'body'). Two nodes per call.
function sfxNoise(dur, vol, kind = 'low', when = 0, shape = 'exp') {
  const ac = audio(); if (!ac) return;
  const base = vol; vol *= SETTINGS.sfx; if (vol <= 0.0005) return;
  try {
    const K = audioKit(ac); if (!K.noise) return;
    const t = ac.currentTime + Math.max(0, when || 0), end = t + Math.max(0.012, dur);
    if (!sfxClaim(t, end, base, 0.08)) return;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = K.noise; src.loop = true;
    const gp = g.gain;
    if (shape === 'lin') { // the legacy burst: a straight-line fade
      gp.setValueAtTime(AUDIO_EPS, t); gp.linearRampToValueAtTime(vol, t + 0.003); gp.linearRampToValueAtTime(AUDIO_EPS, end);
    } else envPerc(gp, t, 0.003, vol, end);
    src.connect(g); g.connect(K[kind] || K.low);
    src.start(t, Math.random() * 1.5); src.stop(end + 0.01);
  } catch (e) {}
}
// legacy name, legacy feel (lowpassed, linear fade) — now on the shared buffer
function noiseBurst(dur = 0.25, vol = 0.12) { sfxNoise(dur, vol, 'low', 0, 'lin'); }
// a tactile transient: a few ms of highpassed noise on the front of a hit
function sfxClick(vol = 0.03, when = 0) { sfxNoise(0.014, vol, 'click', when); }
// a low thump under impacts
function sfxThump(freq, dur, vol, when = 0) { tone(freq, dur, 'sine', vol, -freq * 0.45, when); }
// a scheduled arpeggio/fanfare: notes[i] at i*step seconds
function sfxRun(notes, step, dur, type, vol, layer) {
  notes.forEach((f, i) => {
    tone(f, dur, type, vol, 0, i * step);
    if (layer) tone(f * layer.mul, dur * (layer.len || 0.7), layer.type || 'sine', vol * layer.vol, 0, i * step);
  });
}
const SFX = {
  // ball contact / blaster connect: pitch climbs with the combo; a click on top
  hit: c => { const f = (220 + Math.min(c | 0, 12) * 40) * sfxVary(10); tone(f, 0.07, 'square', 0.05); tone(f * 2, 0.035, 'triangle', 0.018); sfxClick(0.022); },
  // AFT-027: a few cents of random detune per kill — a 30-kill streak never
  // plays one identical blip thirty times (cosmetic Math.random only)
  brick: () => { const v = 0.93 + Math.random() * 0.14; tone(520 * v, 0.1, 'triangle', 0.075, -200); sfxNoise(0.11, 0.05, 'low'); sfxClick(0.03); sfxThump(150 * v, 0.07, 0.04); },
  paddle: () => { tone(180 * sfxVary(8), 0.09, 'sine', 0.062, 60); tone(360, 0.035, 'triangle', 0.018); sfxClick(0.014); },
  wall: () => { tone(140 * sfxVary(8), 0.05, 'sine', 0.068); sfxClick(0.015); },
  laser: () => { const v = sfxVary(14); tone(880 * v, 0.09, 'sawtooth', 0.056, -500); tone(1760 * v, 0.04, 'square', 0.016, -900); },
  blaster: () => { const v = sfxVary(12); tone(620 * v, 0.1, 'square', 0.045, -300); tone(310 * v, 0.06, 'triangle', 0.03, -120); sfxClick(0.018); },
  missile: () => { tone(320, 0.25, 'sawtooth', 0.05, 500); sfxNoise(0.22, 0.04, 'air'); },
  power: () => { tone(660, 0.1, 'triangle', 0.07); tone(990, 0.14, 'triangle', 0.07, 0, 0.09); tone(1980, 0.12, 'sine', 0.02, 0, 0.09); },
  superFx: () => { tone(1320, 0.12, 'square', 0.04, 300); tone(660, 0.1, 'triangle', 0.035, 150); sfxNoise(0.08, 0.015, 'air'); },
  gotcha: () => sfxRun([660, 880, 1100], 0.08, 0.12, 'sine', 0.065, { mul: 2, vol: 0.22, type: 'triangle' }),
  mega: () => {
    sfxRun([262, 330, 392, 523, 659], 0.07, 0.22, 'sawtooth', 0.05, { mul: 0.5, vol: 0.5, type: 'triangle', len: 1 });
    sfxThump(90, 0.45, 0.11); sfxNoise(0.45, 0.03, 'air');
  },
  enrage: () => { tone(90, 0.5, 'sawtooth', 0.09, -30); tone(45, 0.5, 'sine', 0.09, -10); sfxNoise(0.32, 0.08, 'low'); },
  roar: () => { tone(70, 0.7, 'sawtooth', 0.095, 160); tone(52, 0.7, 'sine', 0.068, 60); sfxNoise(0.6, 0.045, 'body'); },
  lifeLost: () => { tone(300, 0.3, 'sawtooth', 0.075, -200); sfxThump(110, 0.32, 0.1); noiseBurst(0.4, 0.1); },
  levelUp: () => sfxRun([523, 659, 784, 1047], 0.11, 0.18, 'triangle', 0.07, { mul: 2, vol: 0.22 }),
  gameOver: () => sfxRun([392, 330, 262, 196], 0.22, 0.32, 'sawtooth', 0.075, { mul: 0.5, vol: 0.7, type: 'triangle', len: 1.1 }),
  enemyShot: () => { tone(160 * sfxVary(10), 0.12, 'sawtooth', 0.053, -60); sfxClick(0.016); },
  bossHit: () => { const v = sfxVary(6); tone(110 * v, 0.15, 'square', 0.04, -30); sfxThump(70 * v, 0.14, 0.048); sfxClick(0.02); },
  bossDown: () => {
    noiseBurst(0.6, 0.085); sfxThump(80, 0.6, 0.09);
    sfxRun([220, 330, 440, 660, 880], 0.09, 0.25, 'triangle', 0.065, { mul: 2, vol: 0.18 });
  },
  shield: () => { tone(440, 0.15, 'sine', 0.08, 220); tone(880, 0.1, 'triangle', 0.025, 440); },
  relic: () => { tone(520 * sfxVary(10), 0.12, 'sawtooth', 0.056, 260); sfxNoise(0.1, 0.028, 'air'); },      // the glaive whips out
  relicBack: () => { tone(300 * sfxVary(8), 0.09, 'triangle', 0.066, -120); sfxClick(0.024); }, // and slaps home
  // stage-clear fanfare (results screen) — brighter than levelUp, shorter
  // than mega: an upward triad roll with a sparkle tail
  stageClear: () => {
    sfxRun([392, 494, 587, 784], 0.09, 0.2, 'triangle', 0.085, { mul: 2, vol: 0.2 });
    tone(1175, 0.4, 'sine', 0.06, 0, 0.4); tone(587, 0.45, 'triangle', 0.045, 0, 0.4);
  },
  // region-arrival sting — two warm swells under the intro card
  regionIntro: () => {
    tone(196, 0.55, 'sine', 0.06, 30); tone(98, 0.55, 'triangle', 0.035, 15);
    tone(294, 0.5, 'sine', 0.05, 20, 0.26); tone(392, 0.55, 'triangle', 0.045, 0, 0.26);
  },
  medal: () => sfxRun([880, 1109, 1319], 0.07, 0.15, 'sine', 0.055, { mul: 2, vol: 0.18, type: 'triangle' }),
  // ---- AFT-027 (the feel pass): moments that used to share a generic blip ----
  // an elite/evolved foe going down: a low thump under a bright two-note cap
  eliteDown: () => {
    tone(150, 0.22, 'triangle', 0.08, -70); sfxThump(90, 0.2, 0.07); sfxNoise(0.18, 0.06, 'low'); sfxClick(0.03);
    tone(784, 0.1, 'triangle', 0.055, 0, 0.05);
    tone(1175, 0.16, 'sine', 0.045, 0, 0.12);
  },
  // combo tier crossed (1..4): a rising arpeggio that climbs with the tier
  comboUp: t => {
    const root = [523, 587, 659, 784][Math.max(0, Math.min(3, (t || 1) - 1))];
    [1, 1.25, 1.5, 2].slice(0, 2 + Math.min(2, t || 1)).forEach((m, i) => {
      tone(root * m, 0.11, 'triangle', 0.06, 0, i * 0.055); tone(root * m * 2, 0.07, 'sine', 0.014, 0, i * 0.055);
    });
  },
  // the charged shot leaving the barrel: weight (low sweep) + crack (noise)
  chargeShot: (c = 1) => {
    tone(240, 0.26, 'sawtooth', 0.04 + 0.025 * c, -150);
    tone(760, 0.12, 'square', 0.035, -420);
    sfxThump(120, 0.2, 0.05 + 0.02 * c);
    sfxNoise(0.14, 0.04 + 0.03 * c, 'low'); sfxClick(0.035);
  },
  // …and landing: a short, dry impact so a charged hit never sounds like a tap
  chargeHit: () => { tone(120, 0.16, 'triangle', 0.08, -50); sfxThump(80, 0.14, 0.07); sfxNoise(0.1, 0.07, 'low'); sfxClick(0.035); },
  // the charge topping out — a soft two-note "ready" so the arc reads by ear
  chargeFull: () => { tone(880, 0.08, 'sine', 0.05); tone(1319, 0.14, 'sine', 0.05, 0, 0.06); tone(2638, 0.08, 'sine', 0.008, 0, 0.06); },
  // Surge/overdrive ignition: a sub drop under the existing fanfare
  surgeIgnite: () => { tone(110, 0.5, 'sawtooth', 0.075, -60); sfxThump(70, 0.5, 0.1); sfxNoise(0.35, 0.07, 'low'); sfxNoise(0.4, 0.025, 'air'); },
  // a shield/ward eating a hit — glassy, clearly NOT the hurt sound
  wardBreak: () => { tone(1320, 0.1, 'sine', 0.05, -500); tone(660, 0.2, 'triangle', 0.05, -260); tone(1980, 0.12, 'sine', 0.015, -700); sfxNoise(0.12, 0.04, 'air'); },
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

// ---- THE SONGS (the arranger) ---------------------------------------------
// Each theme is a whole song built from its ADVENTURE_MUSIC signature (scale,
// prog, motif, rhythm, voice) plus the small authored table below. Fields:
//   form      the loop body as [section, bars] (INTRO / RISER play once first)
//   chorus    7 chord degrees for chorus bars 1–7 (bar 8 is the dominant —
//             a half cadence; the final chorus closes dominant → tonic)
//   bridge    the bridge / boss-break chords (4 or 6 bars)
//   hero      the chorus lead patch (the signature voice leads the verses)
//   oct       double the chorus lead with a soft flute an octave up
//   harm      the patch of the chorus harmony line (a third/sixth below)
//   ctr       the counter-melody patch
//   contrast  the third-phrase shape for A / A2 / A3: aug (augmented),
//             frag (fragment sequence), inv (inversion), dot (dotted)
//   bassB     the chorus bass: pump (octave eighths) or dotted
//   color     'sus2' voices the tonic pad chord as a suspended/add-9 colour
//   dom       the dominant-function degree (default: the scale's fifth)
// No randomness anywhere: every play of a theme is note-for-note identical.
const MUSIC_SONGS = Object.freeze({
  route: [
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [3, 4, 5, 2, 3, 1, 4], bridge: [5, 2, 3, 4],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'flute', contrast: ['aug', 'frag', 'dot'], bassB: 'pump', color: 'sus2' },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [4, 3, 2, 1, 4, 2, 1], bridge: [2, 1, 4, 3],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'flute', contrast: ['inv', 'aug', 'frag'], bassB: 'dotted', color: 'sus2' },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BRIDGE', 6], ['B2', 8]], chorus: [3, 6, 0, 5, 3, 6, 0], bridge: [5, 3, 6, 5, 3, 4],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'flute', contrast: ['frag', 'dot', 'inv'], bassB: 'pump', color: null },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [3, 6, 2, 6, 3, 1, 6], bridge: [2, 6, 3, 4],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'strings', contrast: ['dot', 'frag', 'aug'], bassB: 'dotted', color: 'sus2' },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['A3', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [5, 1, 2, 1, 5, 2, 1], bridge: [5, 2, 1, 4],
      hero: 'horn', oct: true, harm: 'strings', ctr: 'flute', contrast: ['frag', 'inv', 'dot'], bassB: 'pump', color: null },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [5, 3, 0, 4, 3, 5, 1], bridge: [2, 5, 1, 4],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'strings', contrast: ['aug', 'dot', 'frag'], bassB: 'dotted', color: 'sus2' },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BRIDGE', 6], ['B2', 8]], chorus: [4, 5, 2, 4, 5, 1, 2], bridge: [5, 4, 2, 5, 1, 3],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'flute', contrast: ['inv', 'frag', 'aug'], bassB: 'pump', color: 'sus2' },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['A3', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [5, 3, 6, 0, 3, 5, 6], bridge: [5, 6, 3, 4],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'strings', contrast: ['dot', 'aug', 'frag'], bassB: 'dotted', color: null },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['A3', 8], ['BRIDGE', 4], ['B2', 8]], chorus: [3, 6, 0, 3, 6, 0, 4], bridge: [6, 3, 6, 1],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'flute', contrast: ['frag', 'dot', 'inv'], bassB: 'pump', color: null, dom: 1 },
  ],
  boss: [
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BREAK', 4], ['A3', 8], ['B2', 8]], chorus: [5, 3, 0, 4, 3, 5, 0], bridge: [3, 5, 3, 4],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'pulse', contrast: ['frag', 'dot', 'aug'] },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BREAK', 4], ['A3', 8], ['B2', 8]], chorus: [3, 6, 0, 4, 3, 6, 2], bridge: [6, 3, 6, 4],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'pulse', contrast: ['dot', 'frag', 'inv'] },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BREAK', 6], ['A3', 8], ['B2', 8]], chorus: [5, 6, 3, 6, 3, 5, 6], bridge: [3, 1, 5, 6, 3, 6],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'pulse', contrast: ['aug', 'inv', 'frag'], dom: 1 },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BREAK', 4], ['A3', 8], ['B2', 8]], chorus: [3, 5, 4, 0, 3, 5, 3], bridge: [5, 3, 5, 4],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'pulse', contrast: ['inv', 'frag', 'dot'] },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BREAK', 4], ['A3', 8], ['B2', 8]], chorus: [3, 6, 4, 3, 6, 0, 3], bridge: [3, 4, 3, 6],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'pulse', contrast: ['frag', 'aug', 'inv'], dom: 6 },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BREAK', 4], ['A3', 8], ['B2', 8]], chorus: [5, 0, 3, 4, 5, 0, 3], bridge: [3, 0, 5, 4],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'pulse', contrast: ['dot', 'inv', 'aug'] },
    { form: [['A', 8], ['A2', 8], ['B', 8], ['BREAK', 6], ['A3', 8], ['B2', 8]], chorus: [5, 2, 6, 0, 6, 5, 3], bridge: [5, 6, 3, 2, 5, 6],
      hero: 'horn', oct: true, harm: 'strings', ctr: 'pulse', contrast: ['inv', 'dot', 'frag'], dom: 1 },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BREAK', 4], ['A3', 8], ['B2', 8], ['B3', 8]], chorus: [5, 2, 6, 0, 5, 2, 3], bridge: [5, 6, 5, 4],
      hero: 'strings', oct: true, harm: 'horn', ctr: 'pulse', contrast: ['aug', 'frag', 'dot'], dom: 6 },
    { form: [['A', 8], ['B', 8], ['A2', 8], ['BREAK', 4], ['A3', 8], ['B2', 8], ['B3', 8]], chorus: [5, 2, 5, 0, 2, 5, 0], bridge: [2, 5, 2, 4],
      hero: 'horn', oct: false, harm: 'strings', ctr: 'pulse', contrast: ['frag', 'inv', 'aug'] },
  ],
  // the title screen: a slower, calmer orchestral statement of the realm-1
  // tune (same verse and chorus melody, strings lead, no drum kit)
  menu: { of: 0, bpm: 96, title: 'OVERTURE', calm: true, lead: 'strings', hero: 'horn', oct: true, harm: 'strings', ctr: 'flute',
    form: [['A', 8], ['B', 8], ['BRIDGE', 4], ['B2', 8]] },
});
// per-section mix levels: lead · pad · drums · bass · harp
const SONG_LEVELS = {
  INTRO: [0.6, 0.8, 0.45, 0.5, 0.95], RISER: [0.6, 0.85, 0.75, 0.85, 0],
  A: [0.78, 0.55, 0.55, 0.72, 0.72], A2: [0.84, 0.62, 0.66, 0.8, 0.78], A3: [0.86, 0.64, 0.7, 0.82, 0.78],
  B: [1, 1, 1, 1, 0.62], B2: [1.1, 1.15, 1.1, 1.08, 0.68], B3: [1.12, 1.18, 1.14, 1.1, 0.68],
  BRIDGE: [0.62, 0.72, 0.22, 0.5, 0.5], BREAK: [0.58, 0.7, 0.36, 0.56, 0.5],
};
function songSpec(genIdx, boss, variant) {
  const gi = Math.max(0, Math.min(ADVENTURE_MUSIC.length - 1, genIdx | 0));
  if (variant === 'menu') {
    const m = MUSIC_SONGS.menu, base = MUSIC_SONGS.route[m.of];
    const cfg = Object.assign(musicTheme(m.of, false), { bpm: m.bpm, title: m.title, menu: true });
    return { cfg, S: Object.assign({}, base, m) };
  }
  return { cfg: musicTheme(gi, boss), S: (boss ? MUSIC_SONGS.boss : MUSIC_SONGS.route)[gi] };
}

let musicPat = null;
// buildMusicPattern(genIdx, boss, variant?) → the whole song as step tracks
// (16 steps a bar). Phase-agnostic: boss heat layers on at schedule time.
// Returned: cfg, sections [{name, bar, bars}], chord[bar] (scale degree),
// steps, loopStart (the step the loop returns to), the melodic tracks
// melody/harm/counter/desc/glock/harp/bass/stab (null or {n: MIDI, len:
// steps, v, i: patch}), pad (null or [{n, len, sw}]), the drum lanes and
// the per-step section levels lv.{lead,pad,drums,bass,harp}.
function buildMusicPattern(genIdx, boss = false, variant) {
  const { cfg, S } = songSpec(genIdx, boss, variant);
  const sc = cfg.scale, n = sc.length, M = cfg.motif, ML = M.length;
  const R = cfg.rhythm.slice().sort((a, b) => a - b);
  const semi = d => musicScaleSemitone(sc, d);
  const md = d => (((d % n) + n) % n);
  const isCT = (d, r) => { const x = md(d - r); return x === 0 || x === 2 || x === 4; };
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const fifthIdx = (() => { let b = 0; for (let i = 0; i < n; i++) if (Math.abs(sc[i] - 7) < Math.abs(sc[b] - 7)) b = i; return b; })();
  const dom = S.dom != null ? S.dom : fifthIdx;
  const near = r => { const x = md(r); return x > n / 2 ? x - n : x; }; // smallest signed transposition
  const leadBase = cfg.root + (cfg.root >= 66 ? 0 : 12);
  // ---- form + harmony
  const intro = [boss ? 'RISER' : 'INTRO', boss ? 2 : 4];
  const form = [intro].concat(S.form), secs = [];
  let bars = 0;
  for (const [name, nb] of form) { secs.push({ name, bar: bars, bars: nb }); bars += nb; }
  const steps = bars * 16, loopStart = secs[1].bar * 16;
  const p = cfg.prog, chord = new Array(bars).fill(0);
  for (const sec of secs) {
    const k = sec.name;
    let ch;
    if (k === 'INTRO') ch = [0, 0, p[1], dom];
    else if (k === 'RISER') ch = [0, dom];
    else if (k === 'A') ch = S.verse || [p[0], p[0], p[1], p[1], p[2], p[2], p[3], dom];
    else if (k[0] === 'A') ch = [p[0], p[0], p[1], p[1], p[2], p[3], dom, 0];
    else if (k === 'B') ch = S.chorus.concat([dom]);
    else if (k[0] === 'B' && k.length === 2) ch = S.chorus.slice(0, 6).concat([dom, 0]);
    else ch = S.bridge;
    for (let b = 0; b < sec.bars; b++) chord[sec.bar + b] = md(ch[b % ch.length]);
  }
  const chordAt = bar => chord[bar >= bars ? secs[1].bar + (bar - bars) : bar];
  const kindOf = name => name[0] === 'A' ? 'verse' : /^B\d?$/.test(name) ? 'chorus' : name === 'INTRO' || name === 'RISER' ? 'intro' : 'bridge';
  for (const sec of secs) sec.kind = kindOf(sec.name);
  // ---- tracks
  const T = () => new Array(steps).fill(null);
  const pat = { cfg, song: S, sections: secs, chord, steps, loopStart, leadBase, dom, fifthIdx,
    melody: T(), harm: T(), counter: T(), desc: T(), glock: T(), harp: T(), bass: T(), stab: T(), pad: T(),
    kick: new Uint8Array(steps), snare: new Float32Array(steps), hat: new Uint8Array(steps), tom: new Float32Array(steps),
    timp: new Float32Array(steps), timpV: new Float32Array(steps), roll: new Float32Array(steps), swell: new Float32Array(steps), crash: new Float32Array(steps),
    lv: { lead: new Float32Array(steps), pad: new Float32Array(steps), drums: new Float32Array(steps), bass: new Float32Array(steps), harp: new Float32Array(steps) } };
  // ---- pitch helpers (degrees are relative to the tonic of a register)
  // the chord tone nearest a semitone target inside [lo,hi] — restricted to
  // the listed scale indices when it can be, widening the window if it must
  const ctNear = (r, target, lo, hi, pcs) => {
    for (const usePcs of pcs ? [true, false] : [false]) for (let widen = 0; widen <= 12; widen += 3) {
      let best = null, bd = 1e9;
      for (let d = -2 * n; d <= 4 * n; d++) {
        const s = semi(d); if (s < lo - widen || s > hi + widen || !isCT(d, r)) continue;
        if (usePcs && !pcs.includes(md(d))) continue;
        const dd = Math.abs(s - target); if (dd < bd) { bd = dd; best = d; }
      }
      if (best != null) return best;
    }
    return 0;
  };
  const halfPcs = [1, fifthIdx];
  // the melody finisher: strong beats onto chord tones, the voice window,
  // leap recovery and the octave cap — written into a track
  function realize(notes, sec, lo, hi, track, inst, vel) {
    let prev = null, prev2 = null, prevEnd = false, prevEnd2 = false;
    for (const nt of notes) {
      const r = chordAt(sec.bar + (nt.s >> 4));
      let d = nt.d;
      const strong = (nt.s & 7) === 0 || !!nt.end;
      if (!nt.fixed) {
        if (strong && !isCT(d, r)) {
          let bestC = d, bd = 1e9;
          for (const c of [d - 1, d + 1, d - 2, d + 2]) { if (!isCT(c, r)) continue; const dd = Math.abs(semi(c) - semi(d)) * 2 + (prev != null && sgn(c - prev) !== sgn(d - prev) ? 1 : 0) + (prev != null && c === prev && d !== prev ? 9 : 0); if (dd < bd) { bd = dd; bestC = c; } }
          d = bestC;
        }
        // leap recovery: after a leap wider than a fourth, move back the other way
        if (prev != null && prev2 != null && !prevEnd2) {
          const leap = semi(prev) - semi(prev2);
          if (Math.abs(leap) > 5 && sgn(semi(d) - semi(prev)) !== -sgn(leap)) {
            const cands = [prev - sgn(leap), prev - 2 * sgn(leap), prev - 3 * sgn(leap)];
            for (const c of cands) if (!strong || isCT(c, r)) { d = c; break; }
          }
        }
        let guard = 0;
        while (semi(d) > hi && guard++ < 12) { d--; if (strong) while (!isCT(d, r) && guard++ < 24) d--; }
        while (semi(d) < lo && guard++ < 36) { d++; if (strong) while (!isCT(d, r) && guard++ < 48) d++; }
        if (prev != null) { while (semi(d) - semi(prev) > 12) d -= n; while (semi(prev) - semi(d) > 12) d += n; }
      }
      const st = sec.bar * 16 + nt.s;
      if (st < steps) track[st] = { n: leadBase + semi(d) + (nt.oct || 0), d, len: nt.len, v: (nt.v || 1) * (strong ? 1 : 0.9) * (vel || 1), i: nt.i || inst, end: nt.end || null, o: nt.o || 0 };
      prev2 = prev; prev = d; prevEnd2 = prevEnd; prevEnd = !!nt.end;
    }
    return prev;
  }
  // ---- verse phrase builders (2 bars = 32 steps, section-relative offset o)
  const VLO = -5, VHI = 9, CLO = 4, CHI = 14, BLO = -5, BHI = 6;
  // where the motif sits: on the tonic, or — if it climbs past the verse
  // window — started from a lower tonic-chord tone, so it is never clamped
  const vshift = (() => {
    let best = 0, bo = 1e9;
    for (const sh of [0, -(n - 4), -(n - 2)]) {
      let over = 0, sum = 0; for (const m of M) { const x = semi(sh + m); sum += x; over += Math.max(0, x - VHI) + Math.max(0, VLO - x); }
      const score = over * 10 + Math.abs(sum / ML - 2); // in the window, centred a little above the tonic
      if (score < bo) { bo = score; best = sh; }
    }
    return best;
  })();
  // shift a fragment (by a tonic-chord interval or an octave) so it sits in
  // [lo,hi] whole — a fragment is moved, never flattened against the edge
  const fitIn = (q, lo, hi) => {
    let best = 0, bo = 1e9;
    for (const sh of [0, -(n - 4), -(n - 2), -n, n - 4, n - 2, n, -2 * n + 4]) {
      let over = 0; for (const x of q) { const v = semi(x.d + sh); over += Math.max(0, v - hi) + Math.max(0, lo - v); }
      const score = over * 10 + Math.abs(sh) * 0.01;
      if (score < bo) { bo = score; best = sh; }
    }
    for (const x of q) x.d += best;
    return q;
  };
  const bar1 = (o, b) => R.map((s, i) => ({ s: o + s, len: (i + 1 < R.length ? R[i + 1] : 16) - s, d: b + M[i % ML] }));
  const bar2 = (o, b, endPick) => {
    const pre = R.filter(s => s < 8).slice(0, 4), out = pre.map((s, j) => ({ s: o + 16 + s, len: (j + 1 < pre.length ? pre[j + 1] : 8) - s, d: b + M[(R.length + j) % ML] }));
    const last = out.length ? out[out.length - 1].d : b, dir = sgn(M[(R.length + pre.length) % ML] - M[(R.length + pre.length - 1) % ML]) || -1;
    out.push({ s: o + 24, len: 8, d: last + dir + (endPick || 0), end: true });
    return out;
  };
  const contrast = (o, b, kind) => {
    const q = [];
    if (kind === 'aug') { for (let i = 0; i < 4; i++) q.push({ s: o + i * 4, len: 4, d: b + M[i] }); q.push({ s: o + 16, len: 6, d: b + M[4] }, { s: o + 22, len: 2, d: b + M[5] }); }
    else if (kind === 'frag') { for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) q.push({ s: o + k * 8 + i * 2, len: i === 2 ? 4 : 2, d: b + k + M[i] }); for (let i = 0; i < 3; i++) q.push({ s: o + 16 + i * 2, len: i === 2 ? 4 : 2, d: b + 2 + M[i] }); }
    else if (kind === 'inv') { const pos = [0, 3, 6, 8, 11, 14]; pos.forEach((s, i) => q.push({ s: o + s, len: (i + 1 < pos.length ? pos[i + 1] : 16) - s, d: b + 4 - M[i % ML] })); q.push({ s: o + 16, len: 4, d: b + 4 - M[6 % ML] }, { s: o + 20, len: 4, d: b + 4 - M[7 % ML] }); }
    else { q.push({ s: o, len: 6, d: b + M[0] }, { s: o + 6, len: 2, d: b + M[1] }, { s: o + 8, len: 6, d: b + M[2] }, { s: o + 14, len: 2, d: b + M[3] }, { s: o + 16, len: 6, d: b + M[4] }, { s: o + 22, len: 2, d: b + M[5] }); }
    const last = q[q.length - 1].d; q.push({ s: o + 24, len: 8, d: last - 1, end: true });
    return q;
  };
  const ornament = notes => { // A2's ornaments: an upper-neighbour turn on the tail of every long note
    const out = [];
    for (const nt of notes) {
      if (!nt.end && !nt.fixed && nt.len >= 4) { out.push(Object.assign({}, nt, { len: nt.len - 2 })); out.push({ s: nt.s + nt.len - 2, len: 2, d: nt.d + 1 }); }
      else out.push(nt);
    }
    return out;
  };
  function verse(sec, ver) {
    const o0 = 0, b0 = near(chordAt(sec.bar)) + vshift;
    const ct = S.contrast || ['aug', 'frag', 'dot'];
    const t1 = (() => { let t = near(chordAt(sec.bar + 2) - chordAt(sec.bar)); if (t > 2) t -= n; if (t < -2) t += n; return Math.abs(t) > 3 ? 1 : t || 1; })();
    let ph1 = bar1(o0, b0).concat(bar2(o0, b0, 0));
    const t1v = ver === 0 ? t1 : ver === 1 ? t1 + (t1 > 0 ? 1 : -1) : -t1; // A2/A3 sequence the phrase to a different degree
    let ph2 = bar1(32, b0 + t1v).concat(bar2(32, b0 + t1v, ver === 0 ? 1 : -1));
    const ph3 = contrast(64, b0 + near(chordAt(sec.bar + 4) - chordAt(sec.bar)), ct[Math.min(ver, ct.length - 1)]);
    const ret = bar1(96, b0);
    let cad;
    if (ver === 0) { // half cadence: hang on the 2nd or 5th over the dominant
      const r7 = chordAt(sec.bar + 7), prevS = semi(ret[ret.length - 1].d);
      const tgt = ctNear(r7, prevS, VLO + 2, VHI - 2, halfPcs);
      const dir = sgn(semi(tgt) - prevS) || 1;
      cad = [{ s: 112, len: 4, d: tgt - 2 * dir }, { s: 116, len: 4, d: tgt - dir }, { s: 120, len: 8, d: tgt, end: 'half', fixed: true }];
    } else { // full cadence: tonic root or third, held a whole bar
      const head = ret.filter(x => x.s < 104);
      const prevS = semi(head[head.length - 1].d);
      const tgt = ctNear(0, prevS, VLO + 1, VHI - 3, [0, 2]);
      const dir = sgn(semi(tgt) - prevS) || -1;
      ret.length = 0; ret.push(...head);
      ret[ret.length - 1].len = 104 - ret[ret.length - 1].s;
      cad = [{ s: 104, len: 4, d: tgt - 2 * dir }, { s: 108, len: 4, d: tgt - dir }, { s: 112, len: 16, d: tgt, end: 'full', fixed: true }];
    }
    let notes = ph1.concat(ph2, ph3, ret, cad);
    if (ver >= 1) notes = ornament(notes.filter(x => x.s < 96)).concat(notes.filter(x => x.s >= 96));
    return realize(notes, sec, VLO, VHI, pat.melody, S.lead || cfg.voice, 1);
  }
  function chorus(sec) {
    const final = sec.name !== 'B', C = b => chordAt(sec.bar + b), q = [];
    const n1 = ctNear(C(0), 7, CLO, 10);
    let n2 = null;
    for (const want of [7, 5]) for (let d = n1 + 1; d <= n1 + n && n2 == null; d++) if (isCT(d, C(0)) && semi(d) - semi(n1) === want) n2 = d;
    if (n2 == null) { n2 = n1 + 1; while (!(isCT(n2, C(0)) && semi(n2) - semi(n1) >= 5)) n2++; }
    // a chorus phrase: low chord tone, the heroic leap, a step back, then a
    // dotted answer that settles down onto a chord tone of the next bar
    const phrase = (o, t, cb) => {
      const a = n1 + t, b = n2 + t, c = b - 1;
      let d4 = c + 1; while (!isCT(d4, cb) || d4 === c) d4--;              // the nearest chord tone at or below the step
      let e = d4 - 1; while (!isCT(e, cb)) e--;                          // the next one down: the phrase's resting note
      if (semi(e) < CLO + 1) { e = d4 + 1; while (!isCT(e, cb)) e++; }   // …or up, if down would leave the chorus register
      return [{ s: o, len: 4, d: a, v: 1.05 }, { s: o + 4, len: 8, d: b, v: 1.1 }, { s: o + 12, len: 4, d: c },
        { s: o + 16, len: 6, d: d4 }, { s: o + 22, len: 2, d: e < d4 ? (e + 1 < d4 ? e + 1 : e - 1) : (e - 1 > d4 ? e - 1 : e + 1) }, { s: o + 24, len: 8, d: e, end: true }];
    };
    const peak = ctNear(C(5), CHI, CHI - 4, CHI); // the song's summit, held through chorus bar 6
    let t2 = isCT(n2 + 1, C(2)) || !isCT(n2 + 2, C(2)) ? 1 : 2;
    if (semi(n2 + t2) >= semi(peak)) t2 = isCT(n1 - 1, C(2)) ? -1 : -2; // no headroom: answer a step or third lower, saving the summit
    q.push(...phrase(0, 0, C(1)));
    q.push(...phrase(32, t2, C(3)));
    const ctBelow = (d, r) => { let x = d - 1; while (!isCT(x, r)) x--; return x; };
    const c72 = ctBelow(peak - 1, C(4)), c64 = ctBelow(c72 - 1, C(4)); // the climb: distinct chord tones on the strong beats
    q.push({ s: 64, len: 4, d: c64 }, { s: 68, len: 4, d: c64 + 1 < c72 ? c64 + 1 : c64 - 1 }, { s: 72, len: 6, d: c72 }, { s: 78, len: 2, d: peak - 1 },
      { s: 80, len: 16, d: peak, end: true, fixed: true, v: 1.15 });
    const c96 = ctBelow(peak, C(6)), c104 = ctBelow(c96 - 1, C(6)); // …and the way down
    if (!final) {
      const tgt = ctNear(C(7), Math.min(semi(peak - 5), 8), 0, CHI - 5, halfPcs); // low enough to hand back to the verse
      const dir = sgn(semi(tgt) - semi(peak - 4)) || -1;
      q.push({ s: 96, len: 6, d: c96 }, { s: 102, len: 2, d: c96 - 1 }, { s: 104, len: 4, d: c104 }, { s: 108, len: 4, d: c104 - 1 },
        { s: 112, len: 4, d: tgt - 2 * dir }, { s: 116, len: 4, d: tgt - dir }, { s: 120, len: 8, d: tgt, end: 'half', fixed: true });
    } else {
      const tgt = ctNear(0, semi(peak - 5), CLO, semi(peak) - 1, [0, 2]);
      q.push({ s: 96, len: 4, d: c96 }, { s: 100, len: 4, d: c96 - 1 }, { s: 104, len: 4, d: Math.max(c104, tgt + 2) }, { s: 108, len: 4, d: tgt + 1 },
        { s: 112, len: 16, d: tgt, end: 'full', fixed: true, v: 1.1 });
    }
    const hero = S.hero || 'horn';
    for (const x of q) { x.i = hero; if (S.oct) x.o = 1; }
    realize(q, sec, CLO, semi(peak) - 1, pat.melody, hero, 1.05);
    // the harmony line: the next chord tone below on strong beats, a third below elsewhere
    for (let b = 0; b < 8; b++) for (let s = 0; s < 16; s++) {
      const e = pat.melody[(sec.bar + b) * 16 + s]; if (!e) continue;
      const r = C(b);
      let h = e.d - 2;
      if ((s & 7) === 0 || e.end) { h = e.d - 1; while (!isCT(h, r) || semi(e.d) - semi(h) < 3) h--; }
      pat.harm[(sec.bar + b) * 16 + s] = { n: leadBase + semi(h), d: h, len: e.len, v: e.v * 0.9, i: S.harm || 'strings' };
    }
    // glock doubling at the peak; the final chorus adds a descant above
    for (let b = 3; b < 6; b++) for (let s = 0; s < 16; s++) {
      const e = pat.melody[(sec.bar + b) * 16 + s]; if (e) pat.glock[(sec.bar + b) * 16 + s] = { n: e.n + 12, len: Math.min(e.len, 8), v: 1, i: 'bell' };
    }
    if (final) {
      // a slow descant above the tune: half notes on chord tones that keep
      // moving (the nearest OTHER chord tone each time, drifting down then up)
      let prev = ctNear(C(0), 16, 12, 19), dir = -1;
      for (let b = 0; b < 8; b++) for (const s of [0, 8]) {
        const r = C(b);
        let d = null;
        for (const c of [prev + dir, prev - dir, prev + 2 * dir, prev - 2 * dir, prev + 3 * dir, prev - 3 * dir]) if (isCT(c, r) && semi(c) >= 11 && semi(c) <= 19) { d = c; break; }
        if (d == null) d = ctNear(r, semi(prev), 11, 19);
        if (semi(d) <= 12) dir = 1; else if (semi(d) >= 17) dir = -1;
        if (b === 7 && s === 8) d = ctNear(0, semi(prev), 11, 19, [0, 2]);
        pat.desc[(sec.bar + b) * 16 + s] = { n: leadBase + semi(d), d, len: 8, v: s ? 0.85 : 1, i: 'flute' }; prev = d;
      }
    }
  }
  function bridge(sec) {
    const nb = sec.bars;
    for (let b = 0; b < nb; b++) {
      const r = chordAt(sec.bar + b), base = near(r), o = b * 16;
      if (b === nb - 1) { // the swell: a rising run into the next chorus
        const run = fitIn([{ s: o, len: 8, d: base + 2, end: true }, { s: o + 8, len: 2, d: base + 2 }, { s: o + 10, len: 2, d: base + 3 }, { s: o + 12, len: 2, d: base + 4 }, { s: o + 14, len: 2, d: base + 5 }], BLO, BHI + 2);
        realize(run, sec, BLO, BHI + 2, pat.melody, cfg.voice, 0.85);
      } else if (b % 2 === 0) { // lead: a low fragment of the motif, augmented
        realize(fitIn([{ s: o, len: 4, d: base + M[0] }, { s: o + 4, len: 4, d: base + M[1] }, { s: o + 8, len: 8, d: base + M[2], end: true }], BLO, BHI), sec, BLO, BHI, pat.melody, S.lead || cfg.voice, 0.85);
      } else { // the counter answers, inverted, an octave down
        const q = fitIn([{ s: o, len: 4, d: base + 4 - M[1] }, { s: o + 4, len: 4, d: base + 4 - M[2] }, { s: o + 8, len: 8, d: base + 4 - M[3], end: true }], -2, 9);
        for (const x of q) x.oct = -12;
        realize(q, sec, -2, 9, pat.counter, S.ctr || 'flute', 0.95);
      }
    }
  }
  // counter responses in the verse: where the lead holds a phrase end, the
  // counter answers with the motif's tail, reversed, an octave down
  function verseCounter(sec, ver) {
    for (let ph = 0; ph < 4; ph++) {
      if (ver === 0 && ph % 2 === 1) continue;
      const b = sec.bar + ph * 2 + 1, r = chordAt(b);
      const q = fitIn([10, 12, 14].map((s, j) => ({ s: (ph * 2 + 1) * 16 + s, len: 2, d: near(r) + M[(ML - 1 - j - ph) % ML], oct: -12 })), -2, 9);
      realize(q, sec, -2, 9, pat.counter, S.ctr || 'flute', 0.8);
    }
  }
  function introCall(sec) { // a soft horn call on the motif head before the verse
    if (boss) return;
    const q = [{ s: 16, len: 4, d: M[0] }, { s: 20, len: 4, d: M[1] }, { s: 24, len: 8, d: M[2], end: true }, { s: 32, len: 6, d: M[3] }, { s: 38, len: 2, d: M[4] }, { s: 40, len: 8, d: M[5], end: true }];
    fitIn(q, -2, 9); for (const x of q) x.oct = -12;
    realize(q, sec, -2, 9, pat.counter, 'horn', 0.75);
  }
  for (const sec of secs) {
    if (sec.kind === 'verse') { const ver = sec.name === 'A' ? 0 : sec.name === 'A2' ? 1 : 2; verse(sec, ver); verseCounter(sec, ver); }
    else if (sec.kind === 'chorus') chorus(sec);
    else if (sec.kind === 'bridge') bridge(sec);
    else introCall(sec);
  }
  // ---- bass
  const bassRoot = r => { let d = md(r); if (semi(d) > 7) d -= n; return d; };
  const fifthOf = r => { let b = r + 1; for (let k = 1; k < n; k++) if (Math.abs(semi(r + k) - semi(r) - 7) < Math.abs(semi(b) - semi(r) - 7)) b = r + k; return b; };
  // the octave answer: up an octave from a low root, down to the fourth below
  // from a high one — keeps the bass inside about an octave and a half
  const hi8 = r => { if (semi(r) <= 0) return r + n; let b = r - 1; for (let k = 1; k < n; k++) if (Math.abs(semi(r - k) - semi(r) + 5) < Math.abs(semi(b) - semi(r) + 5)) b = r - k; return b; };
  const bassMidi = d => cfg.root - 24 + semi(d);
  const putBass = (st, d, len, v, stac) => { if (st < steps) pat.bass[st] = { n: bassMidi(d), len, v: v || 1, st: !!stac }; };
  for (const sec of secs) for (let b = 0; b < sec.bars; b++) {
    const bar = sec.bar + b, st = bar * 16, r = bassRoot(chordAt(bar)), nr = bassRoot(chordAt(bar + 1)), change = md(nr) !== md(r);
    const f5 = fifthOf(r), appr = (semi(f5) > semi(nr) ? nr + 1 : nr - 1), lastBar = b === sec.bars - 1;
    if (boss && sec.kind !== 'bridge' && !(sec.kind === 'intro' && b === 0)) {
      const pat8 = [r, r, hi8(r), r, f5, r, hi8(r), change ? appr : f5];
      for (let i = 0; i < 8; i++) putBass(st + i * 2, pat8[i], 2, i % 4 === 0 ? 1.1 : 0.85, true);
    } else if (sec.kind === 'intro') putBass(st, r, 16, 0.85);
    else if (sec.kind === 'bridge') {
      if (boss) { putBass(st, r, 8, 1); putBass(st + 8, f5, 8, 0.85); }
      else if (lastBar) { [r, r + 1, r + 2, nr - 1].forEach((d, i) => putBass(st + i * 4, d, 4, 0.8 + i * 0.07)); }
      else putBass(st, r, 16, 0.9);
    } else if (sec.kind === 'chorus') {
      if (S.bassB === 'dotted') { putBass(st, r, 6, 1.1); putBass(st + 6, hi8(r), 2, 0.8); putBass(st + 8, f5, 6, 1); putBass(st + 14, change ? appr : hi8(r), 2, 0.85); }
      else for (let i = 0; i < 8; i++) putBass(st + i * 2, i === 7 && change ? appr : (i % 2 ? hi8(r) : r), 2, i % 2 ? 0.8 : 1.05);
    } else {
      putBass(st, r, 6, 1); putBass(st + 8, f5, 4, 0.85);
      if (change) putBass(st + 14, appr, 2, 0.8); else putBass(st + 12, hi8(r), 4, 0.75);
    }
  }
  // ---- harp: broken chords inside a fixed window (eighths in the verse and
  // chorus, quarters on alternate bridge bars, silent in boss songs)
  if (!boss) for (const sec of secs) for (let b = 0; b < sec.bars; b++) {
    const bar = sec.bar + b, r = chordAt(bar), pool = [];
    for (let d = -2 * n; d <= 3 * n; d++) { const s = semi(d); if (s >= -5 && s <= 14 && isCT(d, r)) pool.push(d); }
    if (!pool.length) continue;
    let sub = 2;
    if (sec.kind === 'bridge') { if (b % 2 || b === sec.bars - 1) continue; sub = 4; }
    const up = []; for (let i = 0; i < pool.length; i++) up.push(pool[i]); for (let i = pool.length - 2; i > 0; i--) up.push(pool[i]);
    for (let s = 0, i = (b * 3) % up.length; s < 16; s += sub, i++) {
      const d = up[i % up.length];
      pat.harp[bar * 16 + s] = { n: leadBase - 12 + semi(d), len: sub, v: s % 8 === 0 ? 1 : 0.8, i: 'harp' };
    }
  }
  // ---- boss brass stabs: root + fifth on the accents of every chorus and break bar
  if (boss) for (const sec of secs) {
    if (sec.kind !== 'chorus' && sec.kind !== 'bridge' && sec.kind !== 'intro') continue;
    for (let b = 0; b < sec.bars; b++) {
      const bar = sec.bar + b, r = md(chordAt(bar));
      const hits = sec.kind === 'chorus' ? [0, 6, 10] : sec.kind === 'bridge' ? [0] : (b === sec.bars - 1 ? [12] : []);
      for (const s of hits) pat.stab[bar * 16 + s] = { n: leadBase - 12 + semi(r), n2: leadBase - 12 + semi(fifthOf(r)), len: 2, v: s ? 0.8 : 1, i: 'brass' };
    }
  }
  // ---- strings pad: three voices, smooth voice-leading, common tones held
  const PLO = cfg.root - 12, PHI = cfg.root + 7;
  let voices = null; const cur = [null, null, null];
  for (const sec of secs) for (let b = 0; b < sec.bars; b++) {
    const bar = sec.bar + b, r = chordAt(bar);
    const nextSec = secs[secs.indexOf(sec) + 1];
    const preChorus = b === sec.bars - 1 && nextSec && nextSec.kind === 'chorus';
    const retrig = b === 0 || preChorus;
    const degs = S.color === 'sus2' && md(r) === 0 && !boss ? [r, r + 1, r + 4] : [r, r + 2, r + 4];
    const pcs = degs.map(d => (((cfg.root + semi(d)) % 12) + 12) % 12);
    const cand = (pc, near_) => { let best = null; for (let m = PLO; m <= PHI; m++) if (m % 12 === pc && (best == null || Math.abs(m - near_) < Math.abs(best - near_))) best = m; return best; };
    let next;
    if (!voices) { next = pcs.map((pc, i) => cand(pc, PLO + 3 + i * 4)).sort((a, b2) => a - b2); }
    else {
      let bestCost = 1e9;
      for (const perm of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
        const v = perm.map((pi, i) => cand(pcs[pi], voices[i]));
        const cost = v.reduce((a, m, i) => a + Math.abs(m - voices[i]), 0) + (new Set(v).size < 3 ? 50 : 0);
        if (cost < bestCost) { bestCost = cost; next = v; }
      }
    }
    for (let i = 0; i < 3; i++) {
      if (!retrig && cur[i] && cur[i].n === next[i] && cur[i].len < 64) { cur[i].len += 16; continue; }
      cur[i] = { n: next[i], len: 16, sw: preChorus, vi: i };
      const st = bar * 16; (pat.pad[st] || (pat.pad[st] = [])).push(cur[i]);
    }
    voices = next;
  }
  // ---- drums, timpani, rolls, swells and crashes, section by section
  const timpMidi = d => 41 + ((((cfg.root + semi(d)) - 41) % 12) + 12) % 12;
  const calm = !!S.calm;
  for (let si = 0; si < secs.length; si++) {
    const sec = secs[si], nextSec = secs[si + 1] || secs[1];
    for (let b = 0; b < sec.bars; b++) {
      const bar = sec.bar + b, st = bar * 16, r = md(chordAt(bar));
      const lastBar = b === sec.bars - 1, preChorus = lastBar && nextSec.kind === 'chorus';
      const fillBar = !preChorus && (b % 8 === 7 || lastBar) && sec.kind !== 'intro';
      const half = fillBar || preChorus ? 8 : 16; // the groove yields to the fill on the bar's second half
      const kick = s => { if (!calm) pat.kick[st + s] = Math.max(pat.kick[st + s], s === 0 ? 2 : 1); };
      const snare = (s, v) => { if (!calm) pat.snare[st + s] = v; };
      const hat = (s, v) => { if (!calm) pat.hat[st + s] = v; };
      const timp = (s, d, v) => { pat.timp[st + s] = timpMidi(d); pat.timpV[st + s] = v; };
      if (sec.kind === 'verse') {
        const full = sec.name !== 'A' || boss;
        for (const s of cfg.kick) if (s < half) kick(s);
        for (const s of cfg.snare) if (s < half) snare(s, boss ? 1 : full ? 0.85 : 0.72);
        cfg.hat.forEach((s, i) => { if (s < half && (full || i % 2 === 0)) hat(s, 1); });
        if (b % 2 === 0) timp(0, r, boss ? 0.7 : 0.55);
        if (b === 0 && boss && sec.name !== 'A') pat.crash[st] = 0.7;
      } else if (sec.kind === 'chorus') {
        for (const s of cfg.kick.concat([0, 8])) if (s < half) kick(s);
        for (const s of cfg.snare) if (s < half) snare(s, 1);
        for (const s of cfg.hat.concat([2, 6, 10, 14])) if (s < half) hat(s, s === 14 && b % 2 ? 2 : 1);
        timp(0, r, 0.85); if (b % 2 && half > 8) timp(8, fifthOf(r), 0.6);
        if (b === 0) pat.crash[st] = 1; else if (b === 4) pat.crash[st] = 0.55;
      } else if (sec.kind === 'bridge') {
        if (boss) { kick(0); snare(8, 0.9); for (const s of [0, 4, 8, 12]) if (s < half) hat(s, 1); }
        if (b === 0) timp(0, r, 0.55); else if (b === 2) timp(0, fifthOf(r), 0.45);
        if (b === 0 && boss) pat.crash[st] = 0.6;
      } else { // INTRO / RISER
        if (boss) {
          const every = b === 0 ? 4 : 2;
          for (let s = 0; s < 16; s += every) { pat.timp[st + s] = timpMidi(s % 8 === 0 ? 0 : fifthOf(0)); pat.timpV[st + s] = 0.35 + 0.45 * ((b * 16 + s) / 32); }
          if (b === 0) kick(0);
          if (lastBar) pat.swell[st] = 16;
        } else {
          if (b === 0) timp(0, r, 0.7); else if (b === 2) timp(0, r, 0.6);
          if (lastBar) { for (let s = 8; s < 16; s++) { pat.timp[st + s] = timpMidi(s >= 14 ? fifthOf(0) : 0); pat.timpV[st + s] = 0.2 + 0.06 * (s - 8); } pat.swell[st + 8] = 8; }
        }
      }
      if (preChorus) { // snare roll (a timpani roll when calm) + cymbal swell into the chorus
        for (let s = 8; s < 16; s++) { if (calm) { pat.timp[st + s] = timpMidi(s >= 14 ? fifthOf(0) : 0); pat.timpV[st + s] = 0.25 + 0.07 * (s - 8); } else pat.roll[st + s] = 0.3 + 0.1 * (s - 8); }
        if (!calm) kick(8);
        pat.swell[st] = 16;
      } else if (fillBar && !calm) { // the 8th-bar fill: toms down the kit
        kick(8); pat.tom[st + 10] = 220; pat.tom[st + 12] = 165; pat.tom[st + 14] = 120; snare(15, 0.6);
        if (sec.kind === 'bridge' || nextSec.kind === 'verse' && boss) pat.swell[st] = 16;
      } else if (fillBar && calm) { pat.timp[st + 12] = timpMidi(fifthOf(r)); pat.timpV[st + 12] = 0.5; }
    }
  }
  // ---- per-step section levels, with a crescendo over the bar before each chorus
  for (let si = 0; si < secs.length; si++) {
    const sec = secs[si], nextSec = secs[si + 1] || secs[1];
    const L = SONG_LEVELS[sec.name] || SONG_LEVELS.A, NL = SONG_LEVELS[nextSec.name] || L;
    for (let b = 0; b < sec.bars; b++) for (let s = 0; s < 16; s++) {
      const st = (sec.bar + b) * 16 + s;
      const ramp = b === sec.bars - 1 && nextSec.kind === 'chorus' ? s / 16 : 0;
      const lv = k => L[k] + (Math.max(L[k], NL[k] * 0.92) - L[k]) * ramp;
      pat.lv.lead[st] = lv(0); pat.lv.pad[st] = lv(1); pat.lv.drums[st] = lv(2); pat.lv.bass[st] = lv(3); pat.lv.harp[st] = lv(4);
    }
  }
  return pat;
}

// ---- THE INSTRUMENTS (AFT-030) -------------------------------------------
// Each authored `voice` name keeps its identity but is now a real synth
// patch instead of one or two bare oscillators:
//   subtractive: two oscillators (detuned, or an interval layer) through a
//     key-tracked resonant lowpass with its own envelope, then a shaped amp;
//   fm: a sine/triangle carrier with a decaying modulator (bells, wood,
//     glass) — four nodes, no filter needed.
// Fields: w1/w2 waves · det ±cents · mul2 interval of osc 2 · mix2 its level
// · cut cutoff as a multiple of the note frequency · env filter-peak ×cut ·
// fa filter swell time (brass-style opening) · fdec filter decay · q · a
// attack · d decay · s sustain fraction · len length multiplier · vib
// vibrato on long notes · drive through the lead soft-clip · lvl loudness
// match (measured: every lead patch lands within ~1 dB, K-weighted).
const VOICE_PATCHES = {
  pulse:   { lvl: 0.97, w1: 'square', w2: 'square', det: 7, cut: 5, env: 2.4, fdec: 0.14, q: 1.4, a: 0.004, d: 0.1, s: 0.62, len: 1, vib: true },
  bell:    { lvl: 3.1, fm: 2.005, idx: 1.7, idxDec: 0.28, w1: 'sine', a: 0.003, d: 0.35, s: 0.05, len: 1.05 },
  pluck:   { lvl: 2.6, w1: 'sawtooth', w2: 'triangle', det: 4, mul2: 1, cut: 1.6, env: 7, fdec: 0.09, q: 2.2, a: 0.003, d: 0.14, s: 0.12, len: 0.68 },
  flute:   { lvl: 1.6, w1: 'triangle', w2: 'sine', det: 0, mul2: 2, mix2: 0.25, cut: 4, env: 1.3, fdec: 0.2, q: 0.7, a: 0.035, d: 0.2, s: 0.8, len: 1.12, vib: true },
  reed:    { lvl: 1.0, w1: 'sawtooth', w2: 'square', det: 5, cut: 2.8, env: 1.6, fdec: 0.18, q: 4.5, a: 0.012, d: 0.15, s: 0.7, len: 1, vib: true },
  brass:   { lvl: 1.65, w1: 'sawtooth', w2: 'square', det: 6, mul2: 0.5, mix2: 0.45, cut: 3.2, f0: 0.45, env: 2.3, fa: 0.05, fdec: 0.22, q: 1.2, a: 0.015, d: 0.18, s: 0.75, len: 0.95, vib: true },
  clock:   { lvl: 2.5, w1: 'square', w2: 'sine', det: 0, mul2: 2, mix2: 0.6, cut: 7, env: 1.8, fdec: 0.06, q: 1.5, a: 0.003, d: 0.08, s: 0.12, len: 0.5 },
  strings: { lvl: 1.3, w1: 'sawtooth', w2: 'sawtooth', det: 9, cut: 2.6, f0: 0.6, env: 1.3, fa: 0.09, fdec: 0.3, q: 0.8, a: 0.06, d: 0.25, s: 0.85, len: 1.35, vib: true },
  marimba: { lvl: 4.4, fm: 4, idx: 1.3, idxDec: 0.05, w1: 'sine', a: 0.003, d: 0.16, s: 0.03, len: 0.48 },
  glass:   { lvl: 2.0, fm: 2.99, idx: 1.1, idxDec: 0.4, w1: 'sine', a: 0.004, d: 0.4, s: 0.18, len: 1.1, vib: true },
  stadium: { lvl: 1.55, w1: 'sawtooth', w2: 'triangle', det: 0, mul2: 0.5, mix2: 0.7, cut: 3.6, f0: 0.5, env: 2.2, fa: 0.04, fdec: 0.2, q: 1.6, a: 0.008, d: 0.15, s: 0.75, len: 1.05, vib: true },
  guitar:  { lvl: 2.2, w1: 'sawtooth', w2: 'square', det: 0, mul2: 1.5, mix2: 0.2, cut: 1.9, env: 6, fdec: 0.11, q: 1.6, a: 0.003, d: 0.16, s: 0.3, len: 0.6, drive: true },
  drive:   { lvl: 0.74, w1: 'sawtooth', w2: 'square', det: 8, cut: 4.2, env: 2.2, fdec: 0.12, q: 2.8, a: 0.004, d: 0.12, s: 0.6, len: 0.78, drive: true },
  // texture voices (not authored voices — the arrangement layers)
  sparkle: { w1: 'square', w2: 'triangle', det: 3, cut: 4, env: 2.5, fdec: 0.05, q: 1, a: 0.003, d: 0.06, s: 0.15, len: 1 },
  arp:     { w1: 'triangle', w2: 'square', det: 2, mix2: 0.35, cut: 4, env: 3, fdec: 0.05, q: 1.2, a: 0.003, d: 0.07, s: 0.1, len: 1 },
  // the orchestra (the song arranger): a warm horn that swells open for the
  // chorus, and a soft FM harp for the broken-chord bed
  horn:    { lvl: 1.45, w1: 'sawtooth', w2: 'triangle', det: 5, mix2: 0.8, cut: 2.1, f0: 0.35, env: 1.9, fa: 0.08, fdec: 0.32, q: 0.9, a: 0.035, d: 0.25, s: 0.8, len: 1, vib: true },
  harp:    { lvl: 2.3, fm: 1, idx: 0.85, idxDec: 0.12, w1: 'triangle', a: 0.003, d: 0.32, s: 0.06, len: 1.7 },
};
// Per-region drum kit flavour (index = region): kick pitch/decay, snare body
// pitch / noise highpass / decay, hat highpass / decay.
const MUSIC_KITS = [
  { k: 150, kd: 0.26, sn: 190, shp: 1400, sd: 0.13, hhp: 7600, hd: 0.032 }, // clean pop kit
  { k: 132, kd: 0.28, sn: 245, shp: 1900, sd: 0.1, hhp: 9000, hd: 0.026 },  // light, woody
  { k: 140, kd: 0.25, sn: 180, shp: 1100, sd: 0.16, hhp: 6800, hd: 0.04 },  // splashy
  { k: 126, kd: 0.33, sn: 170, shp: 1000, sd: 0.15, hhp: 7000, hd: 0.03 },  // deep
  { k: 158, kd: 0.22, sn: 210, shp: 1600, sd: 0.12, hhp: 8600, hd: 0.026 }, // tight electro
  { k: 136, kd: 0.27, sn: 232, shp: 2000, sd: 0.1, hhp: 9500, hd: 0.022 },  // brushed
  { k: 146, kd: 0.25, sn: 262, shp: 1500, sd: 0.09, hhp: 8000, hd: 0.03 },  // rimshot snap
  { k: 122, kd: 0.34, sn: 165, shp: 950, sd: 0.18, hhp: 6500, hd: 0.034 },  // marching
  { k: 154, kd: 0.25, sn: 200, shp: 1300, sd: 0.14, hhp: 7800, hd: 0.03 },  // rock
];
// The mix (linear gains at the note). Calibrated with the offline harness:
// themes land within a few dB of each other, peaks stay well under 1.0.
const MUSIC_MIX = { lead: 0.085, counter: 0.072, arp: 0.11, sparkle: 0.05, pad: 0.03, bass: 0.112, kick: 0.62, click: 0.06,
  snare: 0.16, snareBody: 0.11, clap: 0.12, hat: 0.09, openHat: 0.06, tom: 0.2, crash: 0.06,
  // the song arranger's layers
  harm: 0.05, desc: 0.03, glock: 0.022, harp: 0.07, oct: 0.022, stab: 0.05, strings: 0.024, timp: 0.32, roll: 0.07, swell: 0.05 };
const MUSIC_TRIM = 0.12;
const MUSIC_VOICES = voiceLedger(24); // melodic voices (lead/counter/arp/sparkle)

// The music graph — built ONCE per context:
//   lead ─┬─────────────────────────────┐
//         ├─ echo send ─ delay ⟲ lp fb ─ pan ─┤
//         └─ room send                   ├─ tone filter ─ bus.music (room)
//   counter ─ pan L ──────────────────────┤
//   arp ─ pan R (+ echo send) ────────────┤
//   pad L/R pans ─ duck ─ (+ room send) ──┤
//   drums (snare/clap/tom/crash/hats) ─── (bypass the tone filter) ─ bus.music
//   bass ─┬─ clean ──┐
//         └─ drive ──┴─ duck ─ bus.musicDry   kick ─ bus.musicDry
// `duck` gains dip on every kick (light sidechain pump).
let MUSIC_GRAPH = null;
function musicGraph(ac) {
  if (MUSIC_GRAPH && MUSIC_GRAPH.ac === ac) return MUSIC_GRAPH;
  MUSIC_GRAPH = null;
  try {
    const bus = audioBus(ac), K = audioKit(ac);
    const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
    const M = { ac, noise: K.noise };
    // MUSIC_TRIM sets the whole score's level under the SFX
    M.wet = gain(MUSIC_TRIM); M.wet.connect(bus.music);
    M.tone = audioFilter(ac, 'lowpass', 7200, 0.5); M.tone.connect(M.wet); // melodic layers only — drums bypass it
    M.dry = gain(MUSIC_TRIM); M.dry.connect(bus.musicDry);
    const verb = (src, v) => { if (bus.verb) { const s = gain(v); src.connect(s); s.connect(bus.verb); } };
    // lead + echo
    M.lead = gain(1); M.lead.connect(M.tone); verb(M.lead, 0.12);
    M.echo = ac.createDelay(1); M.echo.delayTime.value = 0.24;
    M.echoFb = gain(0.3); const fbLp = audioFilter(ac, 'lowpass', 2800, 0.5);
    M.echo.connect(fbLp); fbLp.connect(M.echoFb); M.echoFb.connect(M.echo);
    M.echoSend = gain(0.22); M.lead.connect(M.echoSend); M.echoSend.connect(M.echo);
    const echoPan = audioPan(ac, 0.3); M.echo.connect(echoPan); echoPan.connect(M.tone);
    // lead soft-clip for the driven voices
    M.leadDrive = M.lead;
    try { const sh = ac.createWaveShaper(); sh.curve = softClipCurve(1025, 0.3, 2.2); sh.oversample = '2x'; const pad = gain(0.7); sh.connect(pad); pad.connect(M.lead); M.leadDrive = sh; } catch (e) {}
    M.counter = audioPan(ac, -0.32); M.counter.connect(M.tone);
    M.arp = audioPan(ac, 0.38); M.arp.connect(M.tone); M.arp.connect(M.echoSend);
    // pad: two decorrelated halves panned wide, ducked by the kick
    M.duckPad = gain(1); M.duckPad.connect(M.tone); verb(M.duckPad, 0.28);
    M.padL = audioPan(ac, -0.6); M.padR = audioPan(ac, 0.6); M.padL.connect(M.duckPad); M.padR.connect(M.duckPad);
    // bass: clean + heat-driven saturation, ducked, dry and centred
    M.duckBass = gain(1); M.duckBass.connect(M.dry);
    M.bass = gain(1); M.bass.connect(M.duckBass);
    M.bassDrive = gain(0);
    try { const sh = ac.createWaveShaper(); sh.curve = softClipCurve(1025, 0.2, 3); M.bass.connect(sh); sh.connect(M.bassDrive); M.bassDrive.connect(M.duckBass); } catch (e) {}
    M.kick = M.dry;
    // drums
    M.drums = gain(1); M.drums.connect(M.wet);
    M.snareF = audioFilter(ac, 'highpass', 1400, 0.7); M.snareF.connect(M.drums);
    M.clapF = audioFilter(ac, 'bandpass', 1500, 1.1); M.clapF.connect(M.drums);
    M.hatPan = audioPan(ac, 0.22); M.hatPan.connect(M.drums);
    M.hatF = audioFilter(ac, 'highpass', 7600, 0.8); M.hatF.connect(M.hatPan);
    M.crashF = audioFilter(ac, 'highpass', 4800, 0.6); const crashPan = audioPan(ac, -0.25); M.crashF.connect(crashPan); crashPan.connect(M.drums);
    M.clickF = audioFilter(ac, 'highpass', 3200, 0.7); M.clickF.connect(M.dry);
    // one shared vibrato LFO (≈9 cents at 5.3 Hz) — long notes patch into it
    M.vib = null;
    try { const lfo = ac.createOscillator(); lfo.frequency.value = 5.3; const d = gain(9); lfo.connect(d); lfo.start(); M.vib = d; } catch (e) {}
    MUSIC_GRAPH = M;
  } catch (e) { MUSIC_GRAPH = null; }
  return MUSIC_GRAPH;
}
const clampHz = f => Math.max(60, Math.min(16000, f));
// one melodic note through a patch: 4–5 nodes, all stopped at `end`
function musicNote(M, dest, P, f, t, dur, vol, bright = 1) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const ac = M.ac, E = AUDIO_EPS;
  const a = Math.max(0.003, P.a || 0.004), end = t + Math.max(dur, a + 0.03);
  const amp = ac.createGain(), g = amp.gain;
  const rel = Math.min(0.12, (end - t) * 0.35), tR = Math.max(t + a + 0.004, end - rel);
  const tD = Math.min(t + a + (P.d || 0.12), tR - 0.002), sus = Math.max(vol * (P.s == null ? 0.6 : P.s), E * 4);
  g.setValueAtTime(E, t); g.linearRampToValueAtTime(vol, t + a);
  if (tD > t + a + 0.001) g.exponentialRampToValueAtTime(sus, tD);
  g.exponentialRampToValueAtTime(Math.max(sus * 0.85, E * 2), tR);
  g.exponentialRampToValueAtTime(E, end);
  const oscs = [];
  const osc = (type, freq, det) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (det && o.detune) o.detune.setValueAtTime(det, t); oscs.push(o); return o; };
  if (P.fm) {
    const c = osc(P.w1 || 'sine', f), m = osc('sine', f * P.fm), mg = ac.createGain();
    const dev = f * P.fm * P.idx * bright;
    mg.gain.setValueAtTime(dev, t); mg.gain.exponentialRampToValueAtTime(Math.max(dev * 0.12, 1), t + P.idxDec);
    m.connect(mg); mg.connect(c.frequency); c.connect(amp);
  } else {
    const o1 = osc(P.w1, f, -(P.det || 0)), o2 = osc(P.w2 || P.w1, f * (P.mul2 || 1), P.det || 0);
    const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = P.q || 1;
    const cs = f * P.cut * bright, cp = clampHz(cs * (P.env || 1)), fq = flt.frequency;
    if (P.fa) { fq.setValueAtTime(clampHz(cs * (P.f0 || 0.5)), t); fq.exponentialRampToValueAtTime(cp, t + P.fa); fq.exponentialRampToValueAtTime(clampHz(cs), t + P.fa + P.fdec); }
    else { fq.setValueAtTime(cp, t); fq.exponentialRampToValueAtTime(clampHz(cs), t + (P.fdec || 0.12)); }
    o1.connect(flt);
    if (P.mix2 != null && P.mix2 !== 1) { const g2 = ac.createGain(); g2.gain.value = P.mix2; o2.connect(g2); g2.connect(flt); } else o2.connect(flt);
    flt.connect(amp);
  }
  if (P.vib && M.vib && dur > 0.22) for (const o of oscs) { if (o.detune) M.vib.connect(o.detune); }
  amp.connect(dest);
  for (const o of oscs) { o.start(t); o.stop(end + 0.02); }
}
function musicLead(M, P, f, t, dur, vol, bright, role, force) {
  const end = t + dur * (P.len || 1);
  if (!ledgerClaim(MUSIC_VOICES, t, end, force)) return; // low-priority voices yield when full
  const dest = role === 'counter' ? M.counter : role === 'arp' ? M.arp : (P.drive ? M.leadDrive : M.lead);
  musicNote(M, dest, P, f, t, dur * (P.len || 1), vol * (P.lvl || 1), bright);
}
// strings: ONE pad voice (the arranger voice-leads three of them) — two
// detuned saws through a slowly opening lowpass, one amp: 4 nodes, held
// across chords while the voice's pitch is a common tone. `swell` rides the
// bar before a chorus up from soft to full.
function musicString(M, f, t, len, vol, side, swell, boss, bright) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const ac = M.ac, E = AUDIO_EPS, end = t + len, rel = Math.min(0.6, len * 0.3);
  const att = swell ? Math.max(0.2, len - rel - 0.02) : Math.min(boss ? 0.14 : 0.4, len * 0.3);
  const cut = clampHz(Math.min(boss ? 3600 : 3000, f * (boss ? 6 : 4.5)) * bright);
  const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 0.6;
  flt.frequency.setValueAtTime(cut * 0.45, t); flt.frequency.exponentialRampToValueAtTime(cut, t + Math.max(0.05, att));
  const env = ac.createGain(), g = env.gain;
  g.setValueAtTime(E, t);
  if (swell) { g.linearRampToValueAtTime(vol * 0.3, t + 0.08); g.linearRampToValueAtTime(vol * 1.25, t + att); }
  else g.linearRampToValueAtTime(vol, t + att);
  g.setValueAtTime(swell ? vol * 1.25 : vol, end - rel); g.exponentialRampToValueAtTime(E, end);
  flt.connect(env); env.connect(side < 0 ? M.padL : side > 0 ? M.padR : M.duckPad);
  for (let i = 0; i < 2; i++) {
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); if (o.detune) o.detune.setValueAtTime((i ? 1 : -1) * (6 + 3 * side * side), t);
    o.connect(flt); o.start(t); o.stop(end + 0.02);
  }
}
// bass: a sine sub + a filtered harmonic layer, one amp — 4 nodes
function musicBass(M, f, t, dur, vol, boss) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const ac = M.ac, E = AUDIO_EPS, end = t + dur;
  const amp = ac.createGain(), g = amp.gain;
  g.setValueAtTime(E, t); g.linearRampToValueAtTime(vol, t + 0.004);
  g.exponentialRampToValueAtTime(vol * 0.62, t + Math.min(0.12, dur * 0.4));
  g.setValueAtTime(vol * 0.62, end - Math.min(0.07, dur * 0.3)); g.exponentialRampToValueAtTime(E, end);
  const sub = ac.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(f, t);
  const hm = ac.createOscillator(); hm.type = boss ? 'sawtooth' : 'square'; hm.frequency.setValueAtTime(f, t);
  const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = boss ? 3.2 : 1.8;
  flt.frequency.setValueAtTime(clampHz(f * (boss ? 9 : 6)), t); flt.frequency.exponentialRampToValueAtTime(clampHz(f * (boss ? 2.6 : 2)), t + 0.1);
  sub.connect(amp); hm.connect(flt); flt.connect(amp); amp.connect(M.bass);
  sub.start(t); hm.start(t); sub.stop(end + 0.02); hm.stop(end + 0.02);
}
function noiseHit(M, dest, t, dur, vol, a = 0.003) {
  if (!M.noise) return;
  const ac = M.ac, src = ac.createBufferSource(), g = ac.createGain(), end = t + dur;
  src.buffer = M.noise; src.loop = true;
  envPerc(g.gain, t, a, vol, end);
  src.connect(g); g.connect(dest); src.start(t, Math.random() * 1.5); src.stop(end + 0.01);
}
function musicDuck(M, t, deep) {
  // the light sidechain pump: dip pad + bass on the kick, recover over ~150 ms
  const p = M.duckPad.gain, b = M.duckBass.gain;
  p.setTargetAtTime(deep ? 0.45 : 0.6, t, 0.004); p.setTargetAtTime(1, t + 0.035, 0.07);
  b.setTargetAtTime(deep ? 0.7 : 0.8, t, 0.004); b.setTargetAtTime(1, t + 0.03, 0.06);
}
function drumKick(M, kit, t, strong, lvl = 1) {
  const v = MUSIC_MIX.kick * SETTINGS.music * kit.dv * (strong ? 1 : 0.86) * lvl; if (v <= 0.0003) return;
  const ac = M.ac, o = ac.createOscillator(), g = ac.createGain(), end = t + kit.kd * (strong ? 1.12 : 1);
  o.type = 'sine';
  o.frequency.setValueAtTime(kit.k * (strong ? 1.1 : 1), t); o.frequency.exponentialRampToValueAtTime(46, t + 0.075);
  o.frequency.exponentialRampToValueAtTime(40, end);
  envPerc(g.gain, t, 0.003, v, end);
  o.connect(g); g.connect(M.kick); o.start(t); o.stop(end + 0.02);
  noiseHit(M, M.clickF, t, 0.012, MUSIC_MIX.click * SETTINGS.music * (strong ? 1.2 : 1) * lvl);
  musicDuck(M, t, strong);
}
function drumSnare(M, kit, t, vol, flam) {
  const v = vol * SETTINGS.music; if (v <= 0.0003) return;
  noiseHit(M, M.snareF, t, kit.sd, MUSIC_MIX.snare * v);
  const ac = M.ac, o = ac.createOscillator(), g = ac.createGain(), end = t + 0.09;
  o.type = 'triangle'; o.frequency.setValueAtTime(kit.sn * 1.25, t); o.frequency.exponentialRampToValueAtTime(kit.sn, t + 0.04);
  envPerc(g.gain, t, 0.003, MUSIC_MIX.snareBody * v, end);
  o.connect(g); g.connect(M.drums); o.start(t); o.stop(end + 0.02);
  if (flam) noiseHit(M, M.snareF, t + flam, 0.05, MUSIC_MIX.snare * v * 0.32); // a ghost drag on the half-step
}
function drumClap(M, t, vol) {
  const v = MUSIC_MIX.clap * vol * SETTINGS.music; if (v <= 0.0003 || !M.noise) return;
  // three fast smacks then a short tail, on ONE source — 2 nodes
  const ac = M.ac, src = ac.createBufferSource(), g = ac.createGain(), gp = g.gain, E = AUDIO_EPS;
  src.buffer = M.noise; src.loop = true;
  gp.setValueAtTime(E, t);
  for (let i = 0; i < 3; i++) { const s = t + i * 0.011; gp.linearRampToValueAtTime(v * (i === 2 ? 1 : 0.7), s + 0.003); gp.exponentialRampToValueAtTime(v * 0.12, s + 0.0105); }
  gp.linearRampToValueAtTime(v * 0.55, t + 0.036); gp.exponentialRampToValueAtTime(E, t + 0.16);
  src.connect(g); g.connect(M.clapF); src.start(t, Math.random() * 1.5); src.stop(t + 0.17);
}
function drumHat(M, kit, t, open, vol) {
  const v = vol * SETTINGS.music * (0.88 + Math.random() * 0.24); if (v <= 0.0003) return; // cosmetic humanize
  noiseHit(M, M.hatF, t, open ? 0.2 : kit.hd, (open ? MUSIC_MIX.openHat : MUSIC_MIX.hat) * v, open ? 0.004 : 0.003);
}
function drumTom(M, t, f, vol) {
  const v = MUSIC_MIX.tom * vol * SETTINGS.music; if (v <= 0.0003) return;
  const ac = M.ac, o = ac.createOscillator(), g = ac.createGain(), end = t + 0.2;
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, end);
  envPerc(g.gain, t, 0.003, v, end); o.connect(g); g.connect(M.drums); o.start(t); o.stop(end + 0.02);
}
// timpani: a pitched sine (a quick settle onto the note) plus its 1.5×
// partial, one long decay — 4 nodes, into the drum bus (and its room)
function drumTimp(M, t, f, vol) {
  const v = MUSIC_MIX.timp * vol * SETTINGS.music; if (v <= 0.0003) return;
  const ac = M.ac, end = t + 0.95, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f * 1.05, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  o2.type = 'triangle'; o2.frequency.setValueAtTime(f * 1.505, t); g2.gain.value = 0.22;
  envPerc(g.gain, t, 0.004, v, end);
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(M.drums);
  o.start(t); o2.start(t); o.stop(end + 0.02); o2.stop(end + 0.02);
}
// the cymbal swell: a noise crescendo through the crash filter that cuts at
// the downbeat (where the crash lands) — 2 nodes
function cymbalSwell(M, t, dur, vol) {
  const v = vol * SETTINGS.music; if (v <= 0.0003 || !M.noise) return;
  const ac = M.ac, src = ac.createBufferSource(), g = ac.createGain(), gp = g.gain, E = AUDIO_EPS, end = t + dur;
  src.buffer = M.noise; src.loop = true;
  gp.setValueAtTime(E, t); gp.linearRampToValueAtTime(v * 0.12, t + dur * 0.55); gp.linearRampToValueAtTime(v, end - 0.012);
  gp.exponentialRampToValueAtTime(E, end + 0.05);
  src.connect(g); g.connect(M.crashF); src.start(t, Math.random() * 1.5); src.stop(end + 0.07);
}
function musicApplyScene(M, cfg, genIdx, now) {
  const kit = MUSIC_KITS[Math.max(0, Math.min(MUSIC_KITS.length - 1, genIdx | 0))];
  // dv: the drum-bus level — boss grooves are denser, so each hit sits lower
  MUSIC.kit = Object.assign({}, kit, cfg.boss ? { kd: kit.kd * 1.08, shp: kit.shp * 1.15, sd: kit.sd * 0.9, dv: 0.78 } : { dv: 1.12 });
  try {
    M.echo.delayTime.setTargetAtTime(cfg.echo, now, 0.12);
    M.snareF.frequency.setTargetAtTime(MUSIC.kit.shp, now, 0.05);
    M.hatF.frequency.setTargetAtTime(MUSIC.kit.hhp, now, 0.05);
  } catch (e) {}
}
// Heat is read ONLY through the pure bossMusicHeat() bridge; this applies
// the continuous parts of it (saturation, brightness) to the shared graph.
function musicApplyHeat(M, cfg, heat, now) {
  try {
    M.bassDrive.gain.setTargetAtTime(heat >= 2 ? 0.55 : heat >= 1 ? 0.3 : cfg.boss ? 0.12 : 0, now, 0.25);
    M.tone.frequency.setTargetAtTime(heat >= 2 ? 12000 : heat >= 1 || cfg.boss ? 9500 : 7200, now, 0.3);
  } catch (e) {}
}
function currentMusicScene() {
  // the title screen (and the dossier) plays the OVERTURE — its own song
  if (G.state === 'menu' || G.state === 'dex') return { genIdx: 0, boss: false, menu: true, key: 'menu' };
  const genIdx = regionIdx(G.level);
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
// one 16th-step of the song. Everything the arrangement does comes from
// the pattern; boss heat adds its layers on top in any section:
// 1 = open hats, clap, the pickup kick, the octave sparkle, bass drive;
// 2 = double-time hats, snare flams, the counter/harmony third, crashes
// every 4 bars, full drive and brightness.
function musicStep(M, cfg, pat, s, t, stepDur, heat) {
  const inBar = s & 15, bar = s >> 4, kit = MUSIC.kit, boss = cfg.boss, X = MUSIC_MIX, Lv = pat.lv;
  const bright = heat >= 2 ? 1.4 : heat >= 1 ? 1.2 : 1;
  const lLead = Lv.lead[s], lDr = Lv.drums[s], lBass = Lv.bass[s];
  const hum = () => 0.95 + Math.random() * 0.1; // cosmetic velocity humanize
  // ---- drums
  const k = pat.kick[s];
  if (k) drumKick(M, kit, t, k > 1 || boss || heat >= 1, lDr);
  else if (heat >= 1 && boss && inBar === 15) drumKick(M, kit, t, true, lDr);
  if (pat.snare[s]) {
    drumSnare(M, kit, t, kit.dv * pat.snare[s] * lDr * (boss ? 1 : 0.85), heat >= 2 ? stepDur * 0.5 : 0);
    if (boss && heat >= 1) drumClap(M, t, kit.dv * lDr * (heat >= 2 ? 1 : 0.75));
  }
  const h = pat.hat[s];
  if (h) drumHat(M, kit, t, h === 2 || (heat >= 1 && inBar % 4 === 2), kit.dv * lDr * (boss ? 1 : 0.7));
  else if (heat >= 2) drumHat(M, kit, t, false, kit.dv * lDr * (boss ? 1 : 0.7) * 0.5); // the double-time row (it breathes with the section)
  if (pat.tom[s]) drumTom(M, t, pat.tom[s], kit.dv * lDr);
  if (pat.timp[s]) drumTimp(M, t, midiFreq(pat.timp[s]), pat.timpV[s] * (0.6 + 0.4 * lDr));
  if (pat.roll[s]) noiseHit(M, M.snareF, t, 0.07, X.roll * pat.roll[s] * kit.dv * SETTINGS.music);
  if (pat.swell[s]) cymbalSwell(M, t, pat.swell[s] * stepDur, X.swell * kit.dv);
  const crash = pat.crash[s] || (boss && heat >= 2 && inBar === 0 && bar % 4 === 0 ? 0.8 : 0);
  if (crash) noiseHit(M, M.crashF, t, 1.1, X.crash * crash * kit.dv * SETTINGS.music * (pat.crash[s] ? 1 : lDr), 0.004);
  // ---- bass
  const b = pat.bass[s];
  if (b) musicBass(M, midiFreq(b.n), t, stepDur * (b.st ? 1.15 : b.len * 0.92), X.bass * b.v * lBass * (boss ? 0.9 : 1), boss);
  // ---- strings pad (three voice-led voices, held across common tones)
  const pd = pat.pad[s];
  if (pd) for (const v of pd) musicString(M, midiFreq(v.n), t, v.len * stepDur + 0.12, X.strings * Lv.pad[s] * (boss ? 1.1 : 1), v.vi - 1, v.sw, boss, bright);
  // ---- melody (signature voice in the verse, the hero voice in the chorus)
  const e = pat.melody[s];
  if (e) {
    const P = VOICE_PATCHES[e.i] || VOICE_PATCHES.pulse, f = midiFreq(e.n);
    const dur = Math.min(e.len * stepDur * 0.94, P.s != null && P.s < 0.2 ? 1.3 : 6);
    musicLead(M, P, f, t, dur, X.lead * e.v * lLead * hum(), bright, 'lead', true);
    if (e.o) musicLead(M, VOICE_PATCHES.flute, f * 2, t, dur, X.oct * e.v * lLead, 1, 'arp', false);
    if (heat >= 1) musicLead(M, VOICE_PATCHES.sparkle, f * 2, t, stepDur * 0.66, X.sparkle * Math.min(1, lLead + 0.2), bright, 'arp', false);
  }
  const hm = pat.harm[s];
  if (hm) {
    const P = VOICE_PATCHES[hm.i] || VOICE_PATCHES.strings;
    musicLead(M, P, midiFreq(hm.n), t, hm.len * stepDur * 0.92, X.harm * hm.v * lLead, bright, 'counter', false);
  }
  // ---- counter melody (verse answers, bridge trades, the intro call)
  const c = pat.counter[s];
  if (c) {
    const P = VOICE_PATCHES[c.i] || VOICE_PATCHES.flute, cf = midiFreq(c.n);
    musicLead(M, P, cf, t, c.len * stepDur * 0.95 + stepDur, X.counter * c.v * lLead, bright, 'counter', false);
    if (heat >= 2) musicLead(M, P, cf * Math.pow(2, 4 / 12), t + stepDur * 0.5, stepDur * 1.1, X.counter * 0.65, bright, 'counter', false);
  }
  if (heat >= 2 && hm && !c) musicLead(M, VOICE_PATCHES.pulse, midiFreq(hm.n - 12), t + stepDur * 0.5, stepDur * 1.1, X.counter * 0.5, bright, 'counter', false);
  // ---- the final chorus's descant + the glock at the chorus peak
  const ds = pat.desc[s];
  if (ds) musicLead(M, VOICE_PATCHES.flute, midiFreq(ds.n), t, ds.len * stepDur * 0.95, X.desc * ds.v * lLead, 1, 'arp', false);
  const gl = pat.glock[s];
  if (gl) musicLead(M, VOICE_PATCHES.bell, midiFreq(gl.n), t, Math.min(1.2, gl.len * stepDur), X.glock * lLead, 1, 'arp', false);
  // ---- harp bed
  const hp = pat.harp[s];
  if (hp) musicLead(M, VOICE_PATCHES.harp, midiFreq(hp.n), t, hp.len * stepDur * 1.6, X.harp * hp.v * Lv.harp[s] * hum(), 1, 'arp', false);
  // ---- boss brass stabs
  const sb = pat.stab[s];
  if (sb) {
    musicLead(M, VOICE_PATCHES.brass, midiFreq(sb.n), t, stepDur * 1.6, X.stab * sb.v * lLead, bright, 'counter', false);
    musicLead(M, VOICE_PATCHES.brass, midiFreq(sb.n2), t, stepDur * 1.6, X.stab * sb.v * lLead * 0.8, bright, 'counter', false);
  }
}
function musicTick() {
  if (!AC || !MUSIC.on || paused || (typeof document !== 'undefined' && document.hidden)) return;
  if (!(SETTINGS.music > 0)) return; // silent: schedule nothing, build nothing
  const M = musicGraph(AC); if (!M) return;
  const now = AC.currentTime;
  const scene = currentMusicScene();
  if (MUSIC.scene !== scene.key || !musicPat) {
    // a new scene starts its song from the top (the intro plays once)
    musicPat = buildMusicPattern(scene.genIdx, scene.boss, scene.menu ? 'menu' : undefined);
    MUSIC.scene = scene.key; MUSIC.step = 0; MUSIC.nextT = now + 0.055; MUSIC.heat = -1;
    musicApplyScene(M, musicPat.cfg, scene.genIdx, now);
  }
  if (MUSIC.nextT < now - 0.4) MUSIC.nextT = now + 0.05;
  const pat = musicPat, cfg = pat.cfg, stepDur = 60 / cfg.bpm / 4;
  // Graded boss heat (0/1/2) — read ONLY through the pure bossMusicHeat()
  // bridge; the layers it adds are in musicStep / musicApplyHeat.
  const heat = bossMusicHeat();
  if (heat !== MUSIC.heat) { musicApplyHeat(M, cfg, heat, now); MUSIC.heat = heat; }
  try {
    while (MUSIC.nextT < now + 0.3) {
      musicStep(M, cfg, pat, MUSIC.step, MUSIC.nextT, stepDur, heat);
      MUSIC.step = MUSIC.step + 1 >= pat.steps ? pat.loopStart : MUSIC.step + 1; // the loop returns to A, past the intro
      MUSIC.nextT += stepDur;
    }
  } catch (e) { MUSIC.nextT = now + 0.3; } // never throw into the frame loop
}
