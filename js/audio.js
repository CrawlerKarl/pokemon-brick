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
};
// Voices whose identity already implies a broken-chord texture get a quiet
// off-beat arpeggio on the chord tones in their exploration theme.
const ARP_VOICES = { bell: 1, clock: 1, marimba: 1, glass: 1, pluck: 1 };
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
  snare: 0.16, snareBody: 0.11, clap: 0.12, hat: 0.09, openHat: 0.06, tom: 0.2, crash: 0.06 };
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
// pad: a 3-note chord as two detuned, filtered halves panned L/R — 10 nodes a bar
function musicPad(M, freqs, t, len, vol, boss, bright) {
  vol *= SETTINGS.music; if (vol <= 0.0003) return;
  const ac = M.ac, E = AUDIO_EPS, end = t + len, att = boss ? 0.09 : 0.2, rel = Math.min(0.45, len * 0.3);
  const base = clampHz((boss ? 1100 : 1500) * bright);
  for (let side = -1; side <= 1; side += 2) {
    const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 0.7;
    flt.frequency.setValueAtTime(base * 0.5, t); flt.frequency.exponentialRampToValueAtTime(base, t + len * 0.45); flt.frequency.exponentialRampToValueAtTime(base * 0.7, end);
    const env = ac.createGain(), g = env.gain;
    g.setValueAtTime(E, t); g.linearRampToValueAtTime(vol, t + att); g.setValueAtTime(vol, end - rel); g.exponentialRampToValueAtTime(E, end);
    flt.connect(env); env.connect(side < 0 ? M.padL : M.padR);
    for (let i = 0; i < freqs.length; i++) {
      const o = ac.createOscillator(); o.type = boss ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(freqs[i], t); if (o.detune) o.detune.setValueAtTime(side * (7 + i * 2), t);
      o.connect(flt); o.start(t); o.stop(end + 0.02);
    }
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
function drumKick(M, kit, t, strong) {
  const v = MUSIC_MIX.kick * SETTINGS.music * kit.dv * (strong ? 1 : 0.86); if (v <= 0.0003) return;
  const ac = M.ac, o = ac.createOscillator(), g = ac.createGain(), end = t + kit.kd * (strong ? 1.12 : 1);
  o.type = 'sine';
  o.frequency.setValueAtTime(kit.k * (strong ? 1.1 : 1), t); o.frequency.exponentialRampToValueAtTime(46, t + 0.075);
  o.frequency.exponentialRampToValueAtTime(40, end);
  envPerc(g.gain, t, 0.003, v, end);
  o.connect(g); g.connect(M.kick); o.start(t); o.stop(end + 0.02);
  noiseHit(M, M.clickF, t, 0.012, MUSIC_MIX.click * SETTINGS.music * (strong ? 1.2 : 1));
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
// one 16th-step of the arrangement
function musicStep(M, cfg, pat, s, t, stepDur, heat) {
  const inBar = s % 16, bar = Math.floor(s / 16), kit = MUSIC.kit, boss = cfg.boss, X = MUSIC_MIX;
  const bright = heat >= 2 ? 1.4 : heat >= 1 ? 1.2 : 1;
  const accent = inBar % 4 === 0 ? 1.12 : 1;
  // ---- drums
  if (cfg.kick.includes(inBar)) drumKick(M, kit, t, boss || heat >= 1);
  if (heat >= 1 && boss && inBar === 15) drumKick(M, kit, t, true);
  if (cfg.snare.includes(inBar)) {
    drumSnare(M, kit, t, kit.dv * (boss ? 1 : 0.78), heat >= 2 ? stepDur * 0.5 : 0);
    if (boss && heat >= 1) drumClap(M, t, kit.dv * (heat >= 2 ? 1 : 0.75));
  }
  if (cfg.hat.includes(inBar)) drumHat(M, kit, t, heat >= 1 && inBar % 4 === 2, kit.dv * (boss ? 1 : 0.7));
  // last stand: fill the OFF 16th-steps with a half-gain hat — a double-time row
  else if (heat >= 2) drumHat(M, kit, t, false, kit.dv * (boss ? 1 : 0.7) * 0.5);
  if (boss && bar % 8 === 7 && (inBar === 12 || inBar === 14) && !cfg.kick.includes(inBar)) drumTom(M, t, inBar === 12 ? 190 : 140, kit.dv);
  if (boss && inBar === 0 && (bar % 8 === 0 || (heat >= 2 && bar % 4 === 0))) noiseHit(M, M.crashF, t, 0.9, X.crash * kit.dv * SETTINGS.music, 0.004);
  // ---- bass
  const bassDegree = pat.bass[s];
  if (bassDegree != null) {
    const bf = midiFreq(cfg.root - 24 + musicScaleSemitone(cfg.scale, bassDegree));
    musicBass(M, bf, t, stepDur * (boss ? 1.7 : 2.2), X.bass * (boss ? 0.95 : 1) * accent, boss);
  }
  // ---- lead
  const P = VOICE_PATCHES[cfg.voice] || VOICE_PATCHES.pulse;
  const degree = pat.melody[s];
  if (degree != null) {
    const f = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, degree));
    musicLead(M, P, f, t, stepDur * (boss ? 1.25 : 1.55), X.lead * accent * (0.95 + Math.random() * 0.1), bright, 'lead', true);
    // escalated: the added octave, as a bright sparkle panned right with echo
    if (heat >= 1) musicLead(M, VOICE_PATCHES.sparkle, f * 2, t, stepDur * 0.66, X.sparkle, bright, 'arp', false);
  } else if (!boss && ARP_VOICES[cfg.voice] && inBar % 4 === 2) {
    // the broken-chord texture on free off-beats
    const chord = cfg.prog[bar % cfg.prog.length], step = [0, 2, 4, 2][(inBar >> 2) & 3];
    const af = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, chord + step));
    musicLead(M, VOICE_PATCHES.arp, af, t, stepDur * 0.9, X.arp, 1, 'arp', false);
  }
  // ---- counter melody
  const counterDegree = pat.counter[s];
  if (counterDegree != null) {
    const CP = VOICE_PATCHES[boss ? 'pulse' : 'flute'];
    const cf = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, counterDegree));
    musicLead(M, CP, cf, t, stepDur * 1.8, X.counter, bright, 'counter', false);
    // last stand: an off-beat diatonic-third echo thickens the counter
    if (heat >= 2) {
      const ef = midiFreq(cfg.root + 12 + musicScaleSemitone(cfg.scale, counterDegree + 2));
      musicLead(M, CP, ef, t + stepDur * 0.5, stepDur * 1.1, X.counter * 0.65, bright, 'counter', false);
    }
  }
  // ---- pad: a three-note diatonic chord each bar, wide and ducked
  if (inBar === 0) {
    const chordDegree = cfg.prog[bar % cfg.prog.length];
    const freqs = [0, 2, 4].map(iv => midiFreq(cfg.root - 12 + musicScaleSemitone(cfg.scale, chordDegree + iv)));
    musicPad(M, freqs, t, stepDur * 16 + 0.18, X.pad * (boss ? 1.15 : 1), boss, bright);
  }
}
function musicTick() {
  if (!AC || !MUSIC.on || paused || (typeof document !== 'undefined' && document.hidden)) return;
  if (!(SETTINGS.music > 0)) return; // silent: schedule nothing, build nothing
  const M = musicGraph(AC); if (!M) return;
  const now = AC.currentTime;
  const scene = currentMusicScene();
  if (MUSIC.scene !== scene.key || !musicPat) {
    musicPat = buildMusicPattern(scene.genIdx, scene.boss);
    MUSIC.scene = scene.key; MUSIC.step = 0; MUSIC.nextT = now + 0.055; MUSIC.heat = -1;
    musicApplyScene(M, musicPat.cfg, scene.genIdx, now);
  }
  if (MUSIC.nextT < now - 0.4) MUSIC.nextT = now + 0.05;
  const cfg = musicPat.cfg, stepDur = 60 / cfg.bpm / 4;
  // Graded boss heat: 0 = none/phase-1/sentinels, 1 = escalated (mythic
  // phase 2 or Mega popped) — open hats, clap, the octave sparkle, bass
  // drive; 2 = last stand — double-time hats, snare flams, the counter
  // third, crashes every 4 bars, full drive and brightness.
  const heat = bossMusicHeat();
  if (heat !== MUSIC.heat) { musicApplyHeat(M, cfg, heat, now); MUSIC.heat = heat; }
  try {
    while (MUSIC.nextT < now + 0.3) {
      musicStep(M, cfg, musicPat, MUSIC.step, MUSIC.nextT, stepDur, heat);
      MUSIC.step = (MUSIC.step + 1) % 128;
      MUSIC.nextT += stepDur;
    }
  } catch (e) { MUSIC.nextT = now + 0.3; } // never throw into the frame loop
}
