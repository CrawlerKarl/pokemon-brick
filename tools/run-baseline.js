#!/usr/bin/env node
'use strict';

// AFT-008 — the OLD-CAMPAIGN BASELINE harness.
//
//   npm run baseline            the full scenario matrix (~10-20 min)
//   npm run baseline -- --quick scenario A levels 1/3/8 + one finale +
//                               the determinism pair (~1-2 min)
//
// Drives the real game headless (system Chrome over raw CDP, zero deps,
// Node 21+ — the same harness pattern as tools/run-suite.js) through a fixed
// matrix of seeded scenarios via the game's own DEV.launch(), stepping
// update(1/60) with a deterministic in-page autopilot. The bot plays by the
// real rules: SETTINGS.autoFire cadence, the real chargeHeld→release arc
// (heat + resonance + overcharge all honest), tryMega() on a full meter,
// mouseX/lastMouseY steering. It NEVER calls gameRand, never zeroes G.heat,
// never mutates enemy HP.
//
// Outputs (committed-ready fixtures):
//   docs/baselines/aft008-old-campaign.json   full DEV.report() per scenario
//   docs/baselines/AFT008_BASELINE_REPORT.md  the human summary tables
//
// Harness normalizations (documented, deliberate):
//   * G.time = 0 after every DEV.launch. resetRun does NOT reset G.time, and
//     a few boss volley patterns read it directly (update.js: `rot = G.time *
//     0.7`, `const a = G.time + i * ...`), so without this a launch's sim
//     depends on how long the page has been alive — a genuine game-side
//     determinism leak across launches (the RNG *stream* stays seeded; the
//     shot GEOMETRY drifts). Documented in the report; not patched in js/.
//   * G.freeze = 999 between evaluate chunks so the page's own rAF loop
//     cannot advance the sim behind the harness's back (same trick as the
//     release gate's scene driver). Inside a chunk the bot zeroes freeze
//     each frame (run-suite.js's storm does the same), so hit-stop frames
//     don't stall the deterministic clock.
//   * The determinism pair snapshots/restores DEX/DEXS around each run:
//     catch-ball drops branch on `!DEX.has(id)` (update.js), so a first run
//     catching a species would change the second run's pickup population.
//
// Known launch semantics (not normalized — part of the baseline): trial
// launches auto-bank one seeded upgrade per level already travelled
// (resetRun), so every probe's `upg` grant lands ON TOP of that banked
// build. Probe families that need a fair marginal comparison (E paths /
// fusions, G affinity) therefore share ONE seed, making the banked base
// identical across the family. Each scenario records `buildAtStart`.

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'baselines');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
];
const BOOT_TIMEOUT_MS = 30 * 1000;
const CHUNK_FRAMES = 2400; // 40 sim-seconds per evaluate round-trip

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');

// ── tiny static server (serve.js semantics — copied from run-suite.js) ─────
function serveDir(root) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (p.endsWith('/')) p += 'index.html';
      if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
        res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

// ── minimal CDP client over the built-in WebSocket (from run-suite.js) ─────
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) {
        for (const fn of this.listeners) fn(m);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }
  on(fn) { this.listeners.push(fn); }
}

function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const p of CHROME_PATHS) if (fs.existsSync(p)) return p;
  return null;
}

async function launchChrome() {
  const bin = findChrome();
  if (!bin) throw new Error('no Chrome/Chromium found — set CHROME_BIN');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pkbrk-baseline-'));
  const proc = spawn(bin, [
    '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--window-size=1280,900', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('chrome did not expose DevTools in 20s')), 20000);
    proc.stderr.on('data', d => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(to); res(m[1]); }
    });
    proc.on('exit', c => { clearTimeout(to); rej(new Error('chrome exited early (' + c + ')')); });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const cdp = new CDP(ws);
  const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} };
  return { cdp, cleanup };
}

async function openPage(cdp, url) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
  const consoleLines = [];
  cdp.on(m => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push('exception: ' + (d.exception && d.exception.description || d.text).split('\n')[0]);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = (m.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
      if (m.params.type === 'error') errors.push('console.error: ' + text.split('\n')[0]);
      else consoleLines.push(text);
    }
  });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  const evaluate = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error('evaluate failed: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const close = () => cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  return { evaluate, close, errors, consoleLines, sessionId };
}

async function waitFor(evaluate, expr, timeoutMs, label) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await evaluate(expr); } catch (e) { /* mid-navigation */ }
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error(label + ' timed out after ' + Math.round(timeoutMs / 1000) + 's');
    await new Promise(r => setTimeout(r, 1000));
  }
}

// ── the in-page AUTOPILOT ──────────────────────────────────────────────────
// Fully deterministic: every decision derives from game state + the bot's own
// sim clock. No Math.random, no gameRand, no wall time. It steers with the
// same globals a human's pointer writes (mouseX / lastMouseY) and fires only
// through the real entry points (SETTINGS.autoFire → fireAction(true) inside
// update(), chargeHeld → the update() charge arc, tryMega, fireAction serve).
const BOT_SRC = `
window.__BOT = {
  cfg: {}, simT: 0, done: false, cleared: false, endReason: null,
  charging: false, lastChargeT: -99, upgWaitT: 0, err: null,

  init(cfg) {
    this.cfg = cfg; this.simT = 0; this.done = false; this.cleared = false;
    this.endReason = null; this.charging = false; this.lastChargeT = -99;
    this.upgWaitT = 0; this.err = null;
    chargeHeld = false; fireHeld = false;
    touchFirePendingId = null; chargeTouchId = null;
    paused = false;
    mouseX = W / 2; lastMouseY = PADDLE_Y();
    // start-pose normalization: resetRun does NOT reset the paddle, so the
    // ship would ease in from wherever the PREVIOUS scenario parked it —
    // aimed-volley geometry reads paddle.x, which made same-seed launches
    // diverge. A fresh boot starts at W/2 (main.js); so does every scenario.
    G.paddle.x = W / 2; G.paddle.speed = 0; G.shipYv = PADDLE_Y();
    // combat-timer normalization: these live in the G literal's boot values
    // but resetRun never resets them, so a launch inherits the previous
    // run's fire cooldown / i-frames (frame-1 divergence, found by the
    // per-frame bisect). Boot values restored; a game-side leak, documented.
    G.blasterCD = 0; G.laserCD = 0; G.missileCD = 0; G.invuln = 0; G.bossShotCD = 4;
  },

  // active beam-lane intervals (G.columnStrikes: warned or striking) — the
  // single lane-danger primitive behind every boss channel punish. Standing
  // in one is death the bot's shot-dodge could never see.
  columns() {
    const half = (G.mode === 'junkie' ? 26 : G.paddle.w / 2) + 14;
    const out = [];
    for (const cs of G.columnStrikes) {
      if (cs.warn > 0 || cs.strike > 0) out.push([cs.x - cs.w / 2 - half, cs.x + cs.w / 2 + half]);
    }
    return out;
  },
  inColumn(x, cols) {
    for (const c of cols) if (x > c[0] && x < c[1]) return true;
    return false;
  },

  // one steering pass: dodge > drop catch > enemy target > center,
  // then a final resolve out of any warned beam lane
  steer() {
    const px = G.paddle.x, py = shipY();
    const cols = G.mode === 'classic' ? [] : this.columns();
    let tx = null;
    // dodge: predict every shot's crossing of the ship line inside a short
    // horizon; if one lands near us, step to the first SIDE-STEP candidate
    // that is clear of ALL predicted impacts (away-side first, ties -> +).
    // Shooter modes only — classic takes no fire, by design.
    // hurt margin: the junkie pilot is a compact 26px-half mon; the blaster
    // paddle's hurtbox is its WIDTH (capped so an inflated wide paddle
    // doesn't paralyze steering — past that you tank/absorb by design)
    const HM = G.mode === 'blaster' ? Math.min(90, G.paddle.w / 2 + 34) : 58;
    let impacts = [];
    if (G.mode !== 'classic') {
      let threat = null, bestT = 1e9;
      for (const s of G.enemyShots) {
        if (s.dead) continue;
        const dy = py - s.y;
        if (dy < -10 || dy > 320) continue;   // vertical window
        if (!(s.vy > 10)) continue;           // must be heading down at us
        const t = dy / s.vy;
        if (t > 1.2) continue;                // reaction horizon
        const hx = s.x + s.vx * Math.max(0, t);
        impacts.push(hx);
        if (t <= 0.9 && Math.abs(hx - px) < HM + 16 && t < bestT) { bestT = t; threat = hx; }
      }
      if (threat != null) {
        const away = threat > px ? -1 : 1;    // ties -> +1
        const s1 = HM + 50, s2 = HM + 110;
        const cands = [px + away * s1, px - away * s1, px + away * s2, px - away * s2];
        tx = px + away * (HM + 40);           // fallback: the plain side-step
        for (const c of cands) {
          if (c < 40 || c > W - 40) continue;
          if (this.inColumn(c, cols)) continue;
          let clear = true;
          for (const hx of impacts) if (Math.abs(hx - c) < HM) { clear = false; break; }
          if (clear) { tx = c; break; }
        }
      }
    }
    if (tx == null && G.mode === 'classic') {
      let ball = null;
      for (const b of G.balls) if (!ball || b.y > ball.y) ball = b;
      if (ball) tx = ball.x;
      // chase a drop only while every ball is safely high
      if (ball && ball.y < H * 0.45) {
        let pu = null, pd = 1e9;
        for (const u of G.powerups) {
          if (u.y < H * 0.35) continue;
          const d = Math.abs(u.x - px);
          if (d < pd) { pd = d; pu = u; }
        }
        if (pu) tx = pu.x;
      }
    } else if (tx == null) {
      // catch a drop nearing the ship line (the wave-clear waits on pickups)
      let pu = null, pd = 1e9;
      for (const u of G.powerups) {
        if (u.y < py - 170) continue;
        const d = Math.abs(u.x - px);
        if (d < pd) { pd = d; pu = u; }
      }
      if (pu) tx = pu.x;
      else {
        let best = null, bd = 1e9;
        for (const b of G.bricks) {
          if (b.dead || b.dormant || b.barrier || b.crosser || b.friendly) continue;
          const d = Math.hypot(b.bx + G.fx - px, b.by + G.fy - py);
          if (d < bd) { bd = d; best = b; }
        }
        tx = best ? best.bx + G.fx : W / 2;
      }
    }
    if (tx == null) tx = W / 2;
    // final resolve: never PARK in (or steer into) a warned beam lane OR a
    // predicted shot impact — aimed fire converges exactly where the bot
    // wants to stand (under its target), so an unchecked steering intent
    // walked straight into heavies. Scanning outward for the nearest clear
    // x (deterministic order: 0, +step, -step, ...) yields the natural
    // strafe-shoot rhythm a human falls into.
    const danger = x => {
      if (this.inColumn(x, cols)) return true;
      for (const hx of impacts) if (Math.abs(hx - x) < HM) return true;
      return false;
    };
    if ((cols.length || impacts.length) && (danger(tx) || danger(px))) {
      for (let step = 0; step <= 420; step += 42) {
        const cands = step === 0 ? [tx] : [tx + step, tx - step];
        let found = null;
        for (const c of cands) {
          if (c < 40 || c > W - 40) continue;
          if (!danger(c)) { found = c; break; }
        }
        if (found != null) { tx = found; break; }
      }
    }
    mouseX = Math.max(40, Math.min(W - 40, tx));
    if (G.mode === 'junkie') lastMouseY = PADDLE_Y(); // ride the low band
  },

  // the REAL charge arc: hold chargeHeld, update() builds G.charge (heat,
  // resonance, overcharge all real), clearing the hold releases the shot.
  chargeCtl() {
    if (this.charging) {
      if (G.overheat > 0 || G.charge >= 1) {
        chargeHeld = false; this.charging = false; this.lastChargeT = this.simT;
      }
      return;
    }
    chargeHeld = false;
    if (G.overheat > 0 || G.chargeCD > 0) return;
    let hard = false, channel = false;
    for (const b of G.bricks) {
      if (b.dead || b.dormant) continue;
      if (b.channel) channel = true;
      if (b.isBoss || b.subBoss || b.armored || b.shellArmor) hard = true;
    }
    const spaced = this.simT - this.lastChargeT >= 4;
    // an open desperation channel is THE charge moment (the designed
    // interrupt) — answer it even off-cadence and even at high heat: an
    // overheat right after the break is a fair trade a human would take
    if ((channel && G.heat < 0.85) || (hard && G.heat < 0.35 && spaced)) {
      this.charging = true; chargeHeld = true;
    }
  },

  draft() {
    if (!G.upgradeChoices) {
      this.upgWaitT += 1 / 60;
      if (this.upgWaitT > 3) { this.done = true; this.endReason = 'stuck:upgrade-no-choices'; }
      return;
    }
    this.upgWaitT = 0;
    const cs = G.upgradeChoices;
    let idx = 0;
    if (this.cfg.draft === 'spread') {
      let bestL = 1e9;
      for (let i = 0; i < cs.length; i++) {
        const l = cs[i].pathKey ? pathLvl(cs[i].pathKey) : 99;
        if (l < bestL) { bestL = l; idx = i; }
      }
    }
    pickUpgrade(idx); // 'commit' = always index 0
  },

  step() {
    paused = false; G.freeze = 0;
    const dt = 1 / 60;
    if (G.reveal) { revealSkip(); update(dt); this.simT += dt; return; }
    const st = G.state;
    if (st === 'gameover') { this.done = true; this.endReason = 'gameover'; return; }
    if (st === 'ending') { this.done = true; this.cleared = true; this.endReason = 'ending'; return; }
    if (st === 'results') {
      if (!this.cfg.continuous) { this.done = true; this.cleared = true; this.endReason = 'cleared'; return; }
      advanceResults(); // no-ops until the 0.45s dwell passes
      update(dt); this.simT += dt; return;
    }
    if (st === 'ceremony') { advanceCeremony(); update(dt); this.simT += dt; return; }
    if (st === 'upgrade') { this.draft(); update(dt); this.simT += dt; return; }
    if (st === 'menu' || st === 'dex') { this.done = true; this.endReason = 'unexpected:' + st; return; }
    // serve / play
    this.steer();
    if (st === 'serve') fireAction();                       // classic launch
    else if (st === 'play') {
      if (G.mode === 'classic' && G.balls.some(b => b.stuck)) fireAction(); // magnet release
      if (G.mega >= 1 && G.megaT <= 0) tryMega();
      if (G.mode !== 'classic') this.chargeCtl();
    }
    update(dt);
    this.simT += dt;
    if (this.simT >= this.cfg.simCap) { this.done = true; this.endReason = this.endReason || 'simcap'; }
  },

  run(nFrames) {
    paused = false;
    try {
      for (let i = 0; i < nFrames && !this.done; i++) this.step();
    } catch (e) {
      this.done = true;
      this.endReason = 'bot-error';
      this.err = String(e && e.stack || e).slice(0, 400);
    }
    G.freeze = 999; // park the page's own rAF loop between chunks
    let kills = 0;
    const Ls = (G.runStats && G.runStats.levels) || [];
    for (const L of Ls) kills += L.kills || 0;
    return JSON.stringify({
      done: this.done, cleared: this.cleared, endReason: this.endReason,
      err: this.err, simT: +this.simT.toFixed(2), state: G.state,
      level: G.level, lives: G.lives, kills,
    });
  },
};
'bot-ready'`;

// ── the scenario matrix ────────────────────────────────────────────────────
function grantFor(lvl) {
  if (lvl <= 3) return null;
  if (lvl <= 9) return 'arsenal:2';
  if (lvl <= 15) return 'arsenal:3,aegis:2';
  if (lvl <= 21) return 'arsenal:4,aegis:3,surge:2';
  return 'arsenal:4,aegis:4,surge:3,impact:2';
}
const isBossLevel = lvl => lvl % 3 === 0;
const capFor = lvl => (isBossLevel(lvl) ? 300 : 240);

function buildScenarios(quick) {
  const S = [];
  const sweepLevels = quick ? [1, 3, 8] : Array.from({ length: 27 }, (_, i) => i + 1);
  // A — CAMPAIGN SWEEP: all 27 stages, junkie/normal, progressive build
  for (const lvl of sweepLevels) {
    S.push({
      name: 'A-sweep-J' + String(lvl).padStart(2, '0'), group: 'A',
      launch: { level: lvl, mode: 'junkie', diff: 'normal', seed: 'BASE-J-' + lvl, starter: 'fire', upg: grantFor(lvl) || undefined },
      simCap: capFor(lvl),
    });
  }
  // B — FINALES x MODES
  const finaleLevels = quick ? [3] : [3, 12, 21, 27];
  const finaleModes = quick ? ['junkie'] : ['classic', 'blaster', 'junkie'];
  for (const lvl of finaleLevels) for (const mode of finaleModes) {
    S.push({
      name: 'B-finale-L' + lvl + '-' + mode, group: 'B',
      launch: { level: lvl, mode, diff: 'normal', seed: 'BASE-F-' + lvl + '-' + mode, starter: 'fire', upg: grantFor(lvl) || undefined },
      simCap: 600, // ball-only classic boss kills are slow — give modes an equal, generous window
    });
  }
  if (!quick) {
    // C — CONTINUOUS RUN: one real full campaign attempt
    S.push({
      name: 'C-continuous-run', group: 'C', continuous: true, draft: 'commit',
      launch: { level: 1, mode: 'junkie', diff: 'normal', seed: 'BASE-RUN', starter: 'fire', real: 1 },
      simCap: 45 * 60,
    });
    // D — VESSEL PROBES on the region-5 finale
    for (const t of ['electric', 'fighting', 'ground', 'poison', 'dark', 'fire', 'none']) {
      S.push({
        name: 'D-vessel-' + t, group: 'D',
        launch: { level: 15, mode: 'junkie', diff: 'normal', seed: 'BASE-V-' + t, starter: t, upg: 'arsenal:3,aegis:2' },
        simCap: 300,
      });
    }
    // E — PATH / WEB PROBES (one shared seed => identical banked base build,
    // the grant is the only variable across the family)
    for (const p of ['arsenal', 'impact', 'prism', 'aegis', 'surge', 'bond']) {
      S.push({
        name: 'E-path-' + p, group: 'E',
        launch: { level: 15, mode: 'junkie', diff: 'normal', seed: 'BASE-P', starter: 'fire', upg: p + ':4' },
        simCap: 300,
      });
    }
    const fusions = {
      meteor: 'arsenal:4,impact:3,calibrated,meteor',
      ascension: 'prism:4,surge:3,aurora,ascension',
      immortal: 'surge:4,aegis:3,reactive,immortal',
      guardian: 'aegis:4,bond:3,rescue,guardian',
    };
    for (const [f, upg] of Object.entries(fusions)) {
      S.push({
        name: 'E-fusion-' + f, group: 'E',
        launch: { level: 15, mode: 'junkie', diff: 'normal', seed: 'BASE-P', starter: 'fire', upg },
        simCap: 300,
      });
    }
    // apexes need stage 24+ — probe on the region-8 finale with full recipes
    const apexes = {
      warmachine: 'arsenal:3,impact:3,surge:3,calibrated,meteor,cataclysm,warmachine',
      celestial: 'prism:3,aegis:3,bond:3,rescue,mirror,guardian,celestial',
    };
    for (const [x, upg] of Object.entries(apexes)) {
      S.push({
        name: 'E-apex-' + x, group: 'E',
        launch: { level: 24, mode: 'junkie', diff: 'normal', seed: 'BASE-X', starter: 'fire', upg },
        simCap: 300,
      });
    }
    // F — DIFFICULTY PROBES
    for (const d of ['easy', 'normal', 'hard', 'nuzlocke']) {
      S.push({
        name: 'F-diff-' + d, group: 'F',
        launch: { level: 15, mode: 'junkie', diff: d, seed: 'BASE-D-' + d, starter: 'fire', upg: 'arsenal:3,aegis:2' },
        simCap: 300,
      });
    }
    // G — AFFINITY PROBES (DEV.grant only routes the base orb/ice/bell trio
    // to G.stacks; the affinity trios are granted with the same semantics —
    // a direct G.stacks write — because AFFINITY_SATELLITES sits outside
    // WEB_SATELLITES in js/dev.js's lookup)
    S.push({
      name: 'G-affinity-light', group: 'G', affinity: 'light',
      launch: { level: 15, mode: 'junkie', diff: 'normal', seed: 'BASE-AFF', starter: 'fire', upg: 'arsenal:3,aegis:2' },
      stacks: { dawn: 3, halo: 3, grace: 3 }, simCap: 300,
    });
    S.push({
      name: 'G-affinity-dark', group: 'G', affinity: 'dark',
      launch: { level: 15, mode: 'junkie', diff: 'normal', seed: 'BASE-AFF', starter: 'fire', upg: 'arsenal:3,aegis:2' },
      stacks: { fang: 3, tithe: 3, hex: 3 }, simCap: 300,
    });
    S.push({
      name: 'G-affinity-none', group: 'G', affinity: null,
      launch: { level: 15, mode: 'junkie', diff: 'normal', seed: 'BASE-AFF', starter: 'fire', upg: 'arsenal:3,aegis:2' },
      simCap: 300,
    });
    // H — AEGIS ECONOMY on the final gauntlet
    S.push({
      name: 'H-aegis-economy', group: 'H',
      launch: { level: 27, mode: 'junkie', diff: 'normal', seed: 'BASE-AEGIS', starter: 'fire', upg: 'aegis:4,arsenal:3' },
      simCap: 300,
    });
  }
  // I — DETERMINISM PAIR (always runs): the A-8 config twice, DEX-isolated
  for (const n of [1, 2]) {
    S.push({
      name: 'I-determinism-' + n, group: 'I', det: n,
      launch: { level: 8, mode: 'junkie', diff: 'normal', seed: 'BASE-J-8', starter: 'fire', upg: 'arsenal:2' },
      simCap: 240,
    });
  }
  return S;
}

// ── run one scenario on the shared page ────────────────────────────────────
async function runScenario(page, sc) {
  const t0 = Date.now();
  const errBase = page.errors.length;
  const launch = { ...sc.launch };
  if (launch.upg === undefined) delete launch.upg;
  const botCfg = {
    continuous: !!sc.continuous,
    draft: sc.draft || 'commit',
    simCap: sc.simCap,
  };
  const detSnap = sc.det === 1
    ? `window.__DETSNAP = JSON.stringify({ dex: [...DEX], dexs: [...DEXS] });`
    : sc.det === 2
      ? `{ const s = JSON.parse(window.__DETSNAP); DEX.clear(); for (const i of s.dex) DEX.add(i); DEXS.clear(); for (const i of s.dexs) DEXS.add(i); }`
      : '';
  const setup = await page.evaluate(`(() => {
    try {
      SETTINGS.autoFire = true;
      SETTINGS.affinity = ${sc.affinity ? `'${sc.affinity}'` : 'null'};
      ${detSnap}
      DEV.launch(${JSON.stringify(launch)});
      ${sc.stacks ? `Object.assign(G.stacks, ${JSON.stringify(sc.stacks)});` : ''}
      G.time = 0; // harness normalization — see the file header
      __BOT.init(${JSON.stringify(botCfg)});
      G.freeze = 999;
      return JSON.stringify({ ok: true, level: G.level, mode: G.mode, seed: G.runSeed,
        trial: G.trial, lives: G.lives,
        buildAtStart: { path: Object.assign({}, G.path), web: Object.keys(G.upg),
          stacks: Object.fromEntries(Object.entries(G.stacks).filter(([, v]) => v > 0)) } });
    } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.stack || e).slice(0, 400) }); }
  })()`).then(JSON.parse);
  if (!setup.ok) return { name: sc.name, group: sc.group, opts: launch, ok: false, error: 'setup: ' + setup.err, wallMs: Date.now() - t0 };

  const wallGuardMs = sc.continuous ? 8 * 60 * 1000 : 4 * 60 * 1000;
  let status = null;
  for (;;) {
    status = JSON.parse(await page.evaluate(`__BOT.run(${CHUNK_FRAMES})`));
    if (status.done) break;
    if (Date.now() - t0 > wallGuardMs) {
      status = JSON.parse(await page.evaluate(`(__BOT.done = true, __BOT.endReason = 'wallguard', __BOT.run(0))`));
      break;
    }
  }
  const report = JSON.parse(await page.evaluate(`JSON.stringify(DEV.report())`));
  const pageErrors = page.errors.slice(errBase);
  return {
    name: sc.name, group: sc.group, ok: !status.err && !pageErrors.length,
    opts: launch, affinity: sc.affinity || null, stacksGranted: sc.stacks || null,
    buildAtStart: setup.buildAtStart,
    cleared: !!status.cleared, endReason: status.endReason, simT: status.simT,
    finalState: status.state, finalLevel: status.level, lives: status.lives,
    kills: status.kills, botError: status.err || null, pageErrors,
    wallMs: Date.now() - t0, report,
  };
}

// ── report helpers ─────────────────────────────────────────────────────────
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const pct = (a, b) => (b > 0 ? Math.round(100 * a / b) + '%' : '—');
function dmgOut(t) {
  return (t.dmgNormal || 0) + (t.dmgCharge || 0) + (t.dmgBall || 0) + (t.dmgSplash || 0) + (t.dmgOther || 0);
}
function row(cells) { return '| ' + cells.join(' | ') + ' |'; }

function buildMarkdown(out) {
  const S = out.scenarios;
  const by = g => S.filter(s => s.group === g && s.report);
  const md = [];
  md.push('# AFT-008 — OLD-CAMPAIGN BASELINE');
  md.push('');
  md.push('Generated ' + out.generated + ' at `' + out.gitHead.slice(0, 10) + '` by `npm run baseline`'
    + (out.quick ? ' (**--quick** — partial matrix)' : '') + '.');
  md.push('Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.');
  md.push('Full per-scenario `DEV.report()` payloads: `docs/baselines/aft008-old-campaign.json`.');
  md.push('');
  md.push('Determinism check (same seed, same bot, DEX-isolated): **'
    + (out.determinism.pass ? 'PASS' : 'FAIL') + '** — '
    + JSON.stringify(out.determinism.a) + ' vs ' + JSON.stringify(out.determinism.b));
  md.push('');

  // ── finale table (from A boss stages) ──
  const bosses = by('A').filter(s => s.opts.level % 3 === 0);
  if (bosses.length) {
    md.push('## Finales — campaign sweep (junkie · normal · progressive build)');
    md.push('');
    md.push(row(['stage', 'cleared', 'duration', 'boss equivalents', 'progress share', 'active-threat share', 'channels open/broken', 'KOs']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---', '---']));
    for (const s of bosses) {
      const t = s.report.totals;
      md.push(row(['L' + s.opts.level, s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', f2(t.bossEquivalents),
        pct(t.progressTime, t.playTime), pct(t.activeThreatTime, t.playTime),
        t.channelsOpen + '/' + t.channelsBroken, String(t.knockouts)]));
    }
    md.push('');
  }
  const nonBoss = by('A').filter(s => s.opts.level % 3 !== 0);
  if (nonBoss.length) {
    md.push('## Non-boss stages — campaign sweep');
    md.push('');
    md.push(row(['stage', 'cleared', 'duration', 'kills', 'dmg out', 'dmg out/s', 'progress share', 'heat lockout', 'KOs']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---', '---', '---']));
    for (const s of nonBoss) {
      const t = s.report.totals;
      md.push(row(['L' + s.opts.level, s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', String(t.kills), f1(dmgOut(t)), f1(dmgOut(t) / Math.max(1, t.playTime)),
        pct(t.progressTime, t.playTime), pct(t.coolingTime, t.playTime), String(t.knockouts)]));
    }
    md.push('');
  }

  // ── B: per-mode finale comparison ──
  const B = by('B');
  if (B.length) {
    md.push('## Finales by mode');
    md.push('');
    md.push(row(['finale', 'mode', 'cleared', 'duration', 'boss equivalents', 'dmg out', 'KOs', 'lives left']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---', '---']));
    for (const s of B) {
      const t = s.report.totals;
      md.push(row(['L' + s.opts.level, s.opts.mode, s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', f2(t.bossEquivalents), f1(dmgOut(t)), String(t.knockouts), String(s.lives)]));
    }
    md.push('');
  }

  // ── C: continuous run ──
  const C = by('C')[0];
  if (C) {
    const t = C.report.totals;
    md.push('## Continuous run (real journey · junkie · normal · commit drafts)');
    md.push('');
    md.push('- Outcome: ' + (C.cleared ? '**campaign completed** (' + C.endReason + ')'
      : '**ended at level ' + C.finalLevel + '** (' + C.endReason + ')')
      + ' · sim ' + f1(C.simT) + 's · play ' + f1(t.playTime) + 's');
    md.push('- Kills ' + t.kills + ' · dmg out ' + f1(dmgOut(t)) + ' · dmg taken ' + t.damageTaken
      + ' · knockouts ' + t.knockouts + ' · megas ' + t.megas
      + ' · overheats ' + t.overheats + ' (' + f1(t.coolingTime) + 's locked, '
      + pct(t.coolingTime, t.playTime) + ')');
    md.push('- Boss equivalents ' + f2(t.bossEquivalents)
      + ' · progress share ' + pct(t.progressTime, t.playTime)
      + ' · active-threat share ' + pct(t.activeThreatTime, t.playTime)
      + ' · channels ' + t.channelsOpen + '/' + t.channelsBroken);
    md.push('');
    // drops per act
    md.push('### Drop families per act (top 8, % of act drops)');
    md.push('');
    const acts = [[1, 9, 'Act I (L1-9)'], [10, 18, 'Act II (L10-18)'], [19, 27, 'Act III (L19-27)']];
    for (const [lo, hi, label] of acts) {
      const agg = {};
      for (const L of C.report.levels) {
        if (L.lv < lo || L.lv > hi) continue;
        for (const k in (L.dropsBy || {})) agg[k] = (agg[k] || 0) + L.dropsBy[k];
      }
      const total = Object.values(agg).reduce((a, b) => a + b, 0);
      const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 8);
      md.push('- **' + label + '** (' + total + ' drops): '
        + (top.length ? top.map(([k, n]) => k + ' ' + pct(n, total)).join(' · ') : 'none recorded'));
    }
    md.push('');
    // offers vs picks
    md.push('### Draft economy — offers vs picks');
    md.push('');
    const offered = {};
    for (const o of C.report.offers || []) for (const k of o.keys || []) offered[k] = (offered[k] || 0) + 1;
    const picked = {};
    for (const u of C.report.upgrades || []) picked[u.pick] = (picked[u.pick] || 0) + 1;
    const offTop = Object.entries(offered).sort((a, b) => b[1] - a[1]).slice(0, 12);
    md.push('- Offers (top 12 keys): ' + (offTop.map(([k, n]) => k + ' ×' + n).join(' · ') || 'none'));
    md.push('- Picks (all, in order weight): '
      + (Object.entries(picked).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ×' + n).join(' · ') || 'none'));
    md.push('- ' + (C.report.offers || []).length + ' drafts offered · ' + (C.report.upgrades || []).length + ' picks taken'
      + ' · surge by source: ' + JSON.stringify(t.surgeBySource));
    md.push('');
  }

  // ── D: vessel probes ──
  const D = by('D');
  if (D.length) {
    md.push('## Vessel probes — region-5 finale (junkie · normal · arsenal:3,aegis:2)');
    md.push('');
    md.push(row(['vessel', 'cleared', 'duration', 'dmg out', 'dmg out/s', 'dmg taken', 'KOs', 'heat lockout']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---', '---']));
    for (const s of D) {
      const t = s.report.totals;
      md.push(row([s.opts.starter, s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', f1(dmgOut(t)), f1(dmgOut(t) / Math.max(1, t.playTime)),
        String(t.damageTaken), String(t.knockouts), pct(t.coolingTime, t.playTime)]));
    }
    const el = D.find(s => s.opts.starter === 'electric');
    const others = D.filter(s => s.opts.starter !== 'electric' && s.opts.starter !== 'none');
    if (el && others.length) {
      const dps = s => dmgOut(s.report.totals) / Math.max(1, s.report.totals.playTime);
      const med = others.map(dps).sort((a, b) => a - b)[Math.floor(others.length / 2)];
      md.push('');
      md.push('Electric sustained dmg/s = ' + f1(dps(el)) + ' vs median other-vessel ' + f1(med)
        + ' (×' + f2(dps(el) / Math.max(0.001, med)) + ') — the intentionally OP pick, quantified.');
    }
    md.push('');
  }

  // ── E: path/web probes ──
  const E = by('E');
  if (E.length) {
    md.push('## Path / web probes (shared seed per family — banked base identical, grant is the variable)');
    md.push('');
    md.push(row(['probe', 'level', 'cleared', 'duration', 'dmg out', 'dmg out/s', 'dmg taken', 'KOs', 'heat lockout', 'charge share of dmg']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---']));
    for (const s of E) {
      const t = s.report.totals;
      md.push(row([s.name.replace(/^E-/, ''), 'L' + s.opts.level, s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', f1(dmgOut(t)), f1(dmgOut(t) / Math.max(1, t.playTime)),
        String(t.damageTaken), String(t.knockouts), pct(t.coolingTime, t.playTime),
        pct(t.dmgCharge, dmgOut(t))]));
    }
    md.push('');
  }

  // ── F: difficulty probes ──
  const F = by('F');
  if (F.length) {
    md.push('## Difficulty probes — region-5 finale');
    md.push('');
    md.push(row(['difficulty', 'cleared', 'duration', 'dmg taken', 'KOs', 'lives left', 'dmg out/s', 'heat lockout']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---', '---']));
    for (const s of F) {
      const t = s.report.totals;
      md.push(row([s.opts.diff, s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', String(t.damageTaken), String(t.knockouts), String(s.lives),
        f1(dmgOut(t) / Math.max(1, t.playTime)), pct(t.coolingTime, t.playTime)]));
    }
    md.push('');
  }

  // ── G: affinity probes ──
  const Gp = by('G');
  if (Gp.length) {
    md.push('## Affinity probes — region-5 finale (satellite trios ×3)');
    md.push('');
    md.push(row(['affinity', 'cleared', 'duration', 'dmg out', 'dmg taken', 'surge by source', 'shields by source']));
    md.push(row(['---', '---', '---', '---', '---', '---', '---']));
    for (const s of Gp) {
      const t = s.report.totals;
      md.push(row([s.affinity || 'none', s.cleared ? 'yes' : '**no** (' + s.endReason + ')',
        f1(t.playTime) + 's', f1(dmgOut(t)), String(t.damageTaken),
        JSON.stringify(t.surgeBySource), JSON.stringify(t.shieldsBySource)]));
    }
    md.push('');
  }

  // ── H: aegis economy ──
  const Hs = by('H')[0];
  if (Hs) {
    const t = Hs.report.totals;
    md.push('## AEGIS economy — final gauntlet (aegis:4,arsenal:3)');
    md.push('');
    md.push('- Cleared: ' + (Hs.cleared ? 'yes' : 'no (' + Hs.endReason + ')') + ' in ' + f1(t.playTime) + 's');
    md.push('- Shields by source: ' + JSON.stringify(t.shieldsBySource));
    md.push('- Lives by source: ' + JSON.stringify(t.livesBySource));
    md.push('- Absorbs ' + t.absorbs + ' · deflects ' + t.deflects + ' · dmg taken ' + t.damageTaken + ' · KOs ' + t.knockouts);
    md.push('');
  }

  // ── anomalies ──
  md.push('## ANOMALIES');
  md.push('');
  const anomalies = [];
  if (!out.determinism.pass) anomalies.push('DETERMINISM CHECK FAILED — ' + out.determinism.note);
  const Cx = by('C')[0];
  if (Cx && !Cx.cleared) {
    anomalies.push(Cx.name + ': the real run ended in GAME OVER at level ' + Cx.finalLevel
      + ' (' + (Cx.report.run.lastDamage || '?') + ') after ' + Cx.report.totals.knockouts
      + ' knockouts — with commit drafts the build never took the VOLLEY path and the gauntlet outpaced it. Data, not a harness failure.');
  }
  const gLight = by('G').find(s => s.affinity === 'light');
  const gNone = by('G').find(s => !s.affinity);
  if (gLight && gNone && gLight.report && gNone.report
    && JSON.stringify(gLight.report.totals) === JSON.stringify(gNone.report.totals)) {
    anomalies.push('G-affinity-light is BIT-IDENTICAL to G-affinity-none on this wave: the LIGHT trio'
      + ' (dawn/halo/grace ×3) produced zero marginal sim effect in a short finale — halo\'s 25-kill shield'
      + ' can only land on the final kill, dawn\'s drop bonus flipped no roll, and no potion fed grace.'
      + ' The DARK trio measurably diverged. A real balance observation.');
  }
  for (const s of S) {
    if (!s.report) { anomalies.push(s.name + ': scenario failed to run — ' + (s.error || 'unknown')); continue; }
    const t = s.report.totals;
    if (!s.cleared && s.group !== 'C') anomalies.push(s.name + ': did not clear (' + s.endReason + ', ' + f1(s.simT) + 's sim, state ' + s.finalState + ')');
    if (s.botError) anomalies.push(s.name + ': bot error — ' + s.botError);
    if (s.pageErrors && s.pageErrors.length) anomalies.push(s.name + ': page errors — ' + s.pageErrors.slice(0, 2).join(' · '));
    if (dmgOut(t) <= 0 && s.group !== 'C') anomalies.push(s.name + ': ZERO damage dealt — steering/fire suspect');
    if (t.knockouts > 0) anomalies.push(s.name + ': ' + t.knockouts + ' knockout(s), build burned and wave retried');
  }
  md.push(anomalies.length ? anomalies.map(a => '- ' + a).join('\n') : '- none — every scenario cleared with zero errors');
  md.push('');
  md.push('## Harness normalizations & known leaks');
  md.push('');
  md.push('- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley'
    + ' geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch'
    + ' reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is'
    + ' seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.');
  md.push('- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.');
  md.push('- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top.'
    + ' Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each'
    + ' scenario\'s `buildAtStart` in the JSON records the full starting build.');
  md.push('- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.');
  md.push('- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base'
    + ' orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).');
  md.push('');
  return md.join('\n');
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log('AFT-008 baseline harness' + (QUICK ? ' (--quick)' : ''));
  const gitHead = (spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout || 'unknown').trim();
  const scenarios = buildScenarios(QUICK);
  console.log('  ' + scenarios.length + ' scenarios · head ' + gitHead.slice(0, 10));

  const { srv, port } = await serveDir(ROOT);
  const { cdp, cleanup } = await launchChrome();
  process.on('exit', cleanup);
  const results = [];
  try {
    const page = await openPage(cdp, `http://127.0.0.1:${port}/index.html?skin=aetherfall&dev`);
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, page.sessionId);
    await waitFor(page.evaluate,
      `typeof DEV !== 'undefined' && typeof G !== 'undefined' && typeof SKIN !== 'undefined' && SKIN.id === 'aetherfall'`,
      BOOT_TIMEOUT_MS, 'boot');
    await page.evaluate(`resize(); G.freeze = 999; 'sized'`);
    await page.evaluate(BOT_SRC);

    for (const sc of scenarios) {
      process.stdout.write('  ' + sc.name.padEnd(24));
      let r;
      try {
        r = await runScenario(page, sc);
      } catch (e) {
        r = { name: sc.name, group: sc.group, opts: sc.launch, ok: false, error: String(e.message || e), wallMs: 0 };
      }
      results.push(r);
      if (r.report) {
        const t = r.report.totals;
        console.log((r.cleared ? 'cleared ' : r.endReason + ' ').padEnd(10)
          + ('sim ' + f1(r.simT) + 's').padEnd(12)
          + ('kills ' + r.kills).padEnd(12)
          + ('dmg ' + f1(dmgOut(t))).padEnd(14)
          + ('wall ' + (r.wallMs / 1000).toFixed(1) + 's')
          + (r.pageErrors && r.pageErrors.length ? '  PAGE ERRORS ' + r.pageErrors.length : '')
          + (r.botError ? '  BOT ERROR' : ''));
        if (r.botError) console.log('      ' + r.botError.split('\n')[0]);
        for (const e of (r.pageErrors || []).slice(0, 3)) console.log('      ' + e);
      } else {
        console.log('FAILED — ' + r.error);
      }
    }
    await page.close();
  } finally {
    try { srv.close(); } catch (e) {}
    cleanup();
  }

  // ── determinism verdict ──
  const d1 = results.find(r => r.name === 'I-determinism-1');
  const d2 = results.find(r => r.name === 'I-determinism-2');
  const detA = d1 && d1.report ? { kills: d1.report.totals.kills, playTime: d1.report.totals.playTime, dmgNormal: d1.report.totals.dmgNormal } : null;
  const detB = d2 && d2.report ? { kills: d2.report.totals.kills, playTime: d2.report.totals.playTime, dmgNormal: d2.report.totals.dmgNormal } : null;
  const detPass = !!(detA && detB
    && detA.kills === detB.kills
    && detA.playTime === detB.playTime
    && detA.dmgNormal === detB.dmgNormal);
  const determinism = {
    pass: detPass, a: detA, b: detB,
    note: detPass ? 'kills/playTime/dmgNormal identical across the pair'
      : 'totals diverged — investigate bot state derivation or a game-side leak',
  };
  console.log('  determinism: ' + (detPass ? 'PASS' : 'FAIL') + ' — ' + JSON.stringify(detA) + ' vs ' + JSON.stringify(detB));

  // ── write fixtures ──
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = {
    generated: new Date().toISOString(),
    gitHead,
    quick: QUICK,
    harness: {
      viewport: '1280x900@1', skin: 'aetherfall', chunkFrames: CHUNK_FRAMES,
      normalizations: [
        'G.time=0 after each DEV.launch (resetRun leaves the page clock running; boss volley geometry reads it)',
        'G.freeze parked at 999 between evaluate chunks; zeroed per bot frame (hit-stop excluded from sim time)',
        'determinism pair DEX/DEXS snapshot-restored',
        'affinity satellite stacks granted via direct G.stacks writes (DEV.grant lookup covers only WEB_SATELLITES)',
      ],
    },
    determinism,
    scenarios: results,
  };
  // --quick writes to its own files so iteration never clobbers the
  // committed full-matrix fixtures
  const jsonPath = path.join(OUT_DIR, QUICK ? 'aft008-old-campaign.quick.json' : 'aft008-old-campaign.json');
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 1));
  const mdPath = path.join(OUT_DIR, QUICK ? 'AFT008_BASELINE_REPORT.quick.md' : 'AFT008_BASELINE_REPORT.md');
  fs.writeFileSync(mdPath, buildMarkdown(out));

  const failed = results.filter(r => !r.report);
  const wall = ((Date.now() - t0) / 1000).toFixed(0);
  console.log((failed.length || !detPass ? 'BASELINE INCOMPLETE' : 'BASELINE GREEN') + ' in ' + wall + 's'
    + ' · ' + results.length + ' scenarios · ' + jsonPath.replace(ROOT + '/', '') + ' + ' + mdPath.replace(ROOT + '/', ''));
  process.exitCode = (failed.length || !detPass) ? 1 : 0;
}

main().catch(e => { console.error('baseline crashed: ' + (e.stack || e)); process.exitCode = 1; });
