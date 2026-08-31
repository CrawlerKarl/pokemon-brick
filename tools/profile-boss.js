#!/usr/bin/env node
'use strict';

// Boss-fight frame profiler — the diagnostic companion to the gate's storm.
//
// The gate's artifact storm proves state-change budgets (gradients/blur) but
// runs unthrottled, so a fast desktop hides where a PHONE's frame time goes.
// This script replays the same reported scenario — the AETHERFALL region-1
// finale at last stand, guards live, player firing — under CPU throttling and
// a phone viewport, and breaks the frame down three ways:
//   1. per top-level draw function (ms, sorted worst-first)
//   2. canvas pixel throughput (drawImage dest area, source-size histogram,
//      downscale ratios, 'lighter' composite area, fillRect area)
//   3. the existing gradient/blur state-change counters
// at BOTH fx=full (rung 0) and fx=reduced (rung 2) — the gap between the two
// is what the ladder already saves; what remains at rung 2 is the rung-3
// candidate list.
//
//   node tools/profile-boss.js            # defaults: 4x throttle, dsf 3
//   node tools/profile-boss.js --cpu=6 --dsf=2 --frames=240
//
// Zero deps, raw CDP (Node 21+) — helpers copied from run-suite.js.

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
];
const BOOT_TIMEOUT_MS = 30 * 1000;

const argMap = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const CPU = +(argMap.cpu || 4);
const DSF = +(argMap.dsf || 3);
const FRAMES = +(argMap.frames || 240);
const LEVEL = +(argMap.level || 3);
const MODE = String(argMap.mode || 'junkie');

function serveDir(root) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (p.endsWith('/')) p += 'index.html';
      if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
        res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) { for (const fn of this.listeners) fn(m); }
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pkbrk-prof-'));
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
  cdp.on(m => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push('exception: ' + (d.exception && d.exception.description || d.text).split('\n')[0]);
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
  return { evaluate, close, errors, sessionId };
}

async function waitFor(evaluate, expr, timeoutMs, label) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await evaluate(expr); } catch (e) { /* mid-navigation */ }
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error(label + ' timed out');
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Injected into the page: wraps every top-level draw fn render() calls, plus
// the ctx pixel/state instrumentation, then runs the boss scenario.
// ASYNC on purpose: the AETHERFALL weapon art loads on demand, and a fully
// synchronous measure loop would never let those images arrive — silently
// profiling the vector-fallback path instead of what a real phone draws.
const PAGE_SCRIPT = `(async () => {
  try {
    resize(); ZONE_DEBUG = false; upgradeTreeOpen = false; advOpen = false;
    const FN_NAMES = ['update','drawBackground','drawGauntletEntranceFx','drawDangerLine',
      'drawRallyZone','drawTelegraphs','drawRelayFx','drawRaidFx','drawObjectiveFx',
      'drawSiegeFx','drawWardFx','drawHourglassFx','drawCircuitFx','drawHuntFx',
      'drawRiteFx','drawChaseFx','drawBricks','drawFragments','drawShield',
      'drawPowerups','drawProjectiles','drawBalls','drawServeGuide','drawPaddle',
      'drawUpgradeInstallFx','drawShootHint','drawParticles','drawAnnounce',
      'drawBloom','drawHUD','drawOverlays','drawCursor','drawAtmosphere',
      'drawAmbient','drawRings','drawVortexes','drawBossReveal',
      // drawHUD internals — attribute the HUD's cost to its sub-surfaces
      'drawPlayerHealthBar','drawBossLane','drawRosterRail','drawBrickBehaviorLegend',
      'drawCombatNotice','drawObjectiveBanner','drawHurtHealth','drawResonanceMeter',
      'drawRiftTracker','drawBuildRail','drawTouchControls','drawTouchPads','drawAnnounceStrip'];
    if (!window.__PROF) {
      window.__PROF = { fn: {}, px: {}, reset() {
        for (const k of Object.keys(this.fn)) { this.fn[k].ms = 0; this.fn[k].n = 0; }
        this.px = { grad: 0, blur: 0, di: 0, diDest: 0, diSrc: 0, downscale2x: 0,
          srcHist: { s64: 0, s128: 0, s256: 0, s512: 0, big: 0 },
          lighterSets: 0, lighterDest: 0, fillRectA: 0, fillText: 0, saveN: 0 };
      } };
      for (const name of FN_NAMES) {
        const orig = window[name];
        if (typeof orig !== 'function') continue;
        __PROF.fn[name] = { ms: 0, n: 0 };
        window[name] = function (...a) {
          const t = performance.now();
          const r = orig.apply(this, a);
          const rec = __PROF.fn[name]; rec.ms += performance.now() - t; rec.n++;
          return r;
        };
      }
      const cd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalCompositeOperation');
      Object.defineProperty(ctx, 'globalCompositeOperation', {
        set(v) { if (v === 'lighter' || v === 'screen') __PROF.px.lighterSets++; cd.set.call(this, v); },
        get() { return cd.get.call(this); },
      });
      // restore() can reset the composite without the setter firing — always
      // read the REAL state when attributing drawImage area
      const liveComposite = () => cd.get.call(ctx);
      const pL = ctx.createLinearGradient.bind(ctx), pR = ctx.createRadialGradient.bind(ctx);
      ctx.createLinearGradient = (...a) => { __PROF.px.grad++; return pL(...a); };
      ctx.createRadialGradient = (...a) => { __PROF.px.grad++; return pR(...a); };
      const bd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
      Object.defineProperty(ctx, 'shadowBlur', {
        set(v) { if (v > 0) __PROF.px.blur++; bd.set.call(this, v); },
        get() { return bd.get.call(this); },
      });
      const pDI = ctx.drawImage.bind(ctx);
      ctx.drawImage = function (img, ...a) {
        const p = __PROF.px; p.di++;
        let sw = (img && (img.naturalWidth || img.width)) || 0;
        let sh = (img && (img.naturalHeight || img.height)) || 0;
        let dw = sw, dh = sh;
        if (a.length === 4) { dw = a[2]; dh = a[3]; }
        else if (a.length === 8) { sw = a[2]; sh = a[3]; dw = a[6]; dh = a[7]; }
        p.diDest += Math.abs(dw * dh); p.diSrc += Math.abs(sw * sh);
        const m = Math.max(sw, sh);
        if (m <= 64) p.srcHist.s64++; else if (m <= 128) p.srcHist.s128++;
        else if (m <= 256) p.srcHist.s256++; else if (m <= 512) p.srcHist.s512++; else p.srcHist.big++;
        if (dw > 0 && sw / dw >= 2) p.downscale2x++;
        const gco = liveComposite();
        if (gco === 'lighter' || gco === 'screen') p.lighterDest += Math.abs(dw * dh);
        return pDI(img, ...a);
      };
      const pFR = ctx.fillRect.bind(ctx);
      ctx.fillRect = (x, y, w, h) => { __PROF.px.fillRectA += Math.abs(w * h); return pFR(x, y, w, h); };
      const pFT = ctx.fillText.bind(ctx);
      ctx.fillText = (...a) => { __PROF.px.fillText++; return pFT(...a); };
      const pSV = ctx.save.bind(ctx);
      ctx.save = () => { __PROF.px.saveN++; return pSV(); };
      __PROF.reset();
    }
    const timed = (frames, perFrame) => {
      __PROF.reset();
      const times = [], upd = [];
      let shotSum = 0;
      for (let i = 0; i < frames; i++) {
        paused = false; G.freeze = 0;
        if (perFrame) perFrame(i);
        const a = performance.now();
        update(1/60);
        const b = performance.now();
        render();
        const c = performance.now();
        upd.push(b - a); times.push(c - a);
        shotSum += G.enemyShots.length;
      }
      times.sort((x, y) => x - y); upd.sort((x, y) => x - y);
      const px = {};
      for (const [k, v] of Object.entries(__PROF.px)) {
        px[k] = typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k2, v2]) => [k2, +(v2 / frames).toFixed(1)]))
          : +(v / frames).toFixed(1);
      }
      const fns = Object.entries(__PROF.fn)
        .map(([k, v]) => [k, +(v.ms / frames).toFixed(3)])
        .filter(([, ms]) => ms > 0.005)
        .sort((x, y) => y[1] - x[1]);
      return { avg: +(times.reduce((s, v) => s + v, 0) / frames).toFixed(2),
        p95: +times[Math.floor(frames * 0.95)].toFixed(2),
        updAvg: +(upd.reduce((s, v) => s + v, 0) / frames).toFixed(2),
        shotsAvg: +(shotSum / frames).toFixed(1),
        px, fns };
    };
    DEV.launch({ level: ${LEVEL}, mode: '${MODE}', diff: 'hard', seed: 'BOSSTORM' });
    paused = false; G.freeze = 0;
    for (let i = 0; i < 10; i++) update(1/60);
    if (typeof jumpToGauntletRound === 'function' && stageIdx(G.level) === 2) jumpToGauntletRound(1, 3);
    while (G.reveal) update(0.5);
    // pin the WHOLE cast alive — the fight must stay dense for the measured
    // window, or the profile understates the reported "too much going on"
    const pin = () => {
      let boss = null;
      for (const b of G.bricks) {
        if (b.dead) continue;
        if (b.isBoss) { boss = b; b.hp = Math.max(b.hp, Math.round(b.maxHp * 0.2)); }
        else if (bareMon(b)) b.hp = Math.max(b.hp, 2);
      }
      return boss;
    };
    for (let i = 0; i < 180; i++) { G.freeze = 0; pin(); update(1/60); } // no player fire: the cast survives warmup
    render(); // first draws REQUEST the on-demand weapon art...
    await new Promise(r => setTimeout(r, 900)); // ...and this beat lets it ARRIVE
    SETTINGS.autoFire = true;
    const sweep = i => { const b = pin(); mouseX = b ? b.bx + G.fx + Math.sin(i * 0.08) * 80 : W / 2; };
    const countsAtStart = () => ({ bricks: G.bricks.filter(b => !b.dead).length, shots: G.enemyShots.length,
      lasers: G.lasers.length, particles: G.particles.length, rings: G.rings.length, fragments: G.fragments.length });
    SETTINGS.fx = 'full';
    for (let i = 0; i < 30; i++) { G.freeze = 0; pin(); update(1/60); render(); } // let the scale apply
    const preCounts = countsAtStart();
    const full = timed(${FRAMES}, sweep);
    full.renderScale = RENDER_SCALE;
    SETTINGS.fx = 'reduced';
    for (let i = 0; i < 30; i++) { G.freeze = 0; pin(); update(1/60); render(); } // let the scale apply
    const lean = timed(${FRAMES}, sweep);
    lean.renderScale = RENDER_SCALE;
    let min = null;
    if (TOGGLES.find(t => t.key === 'fx').cycle.includes('minimal')) {
      SETTINGS.fx = 'minimal';
      for (let i = 0; i < 120; i++) { G.freeze = 0; pin(); update(1/60); render(); } // let the scale + plate apply
      min = timed(${FRAMES}, sweep);
      min.renderScale = RENDER_SCALE;
    }
    SETTINGS.fx = 'auto'; SETTINGS.autoFire = false;
    return JSON.stringify({ ok: true,
      env: { W, H, DPR, backing: canvas.width + 'x' + canvas.height },
      counts: preCounts, countsEnd: countsAtStart(),
      full, lean, min });
  } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.stack || e).slice(0, 400) }); }
})()`;

(async () => {
  const { srv, port } = await serveDir(ROOT);
  const { cdp, cleanup } = await launchChrome();
  try {
    const page = await openPage(cdp, `http://127.0.0.1:${port}/index.html?skin=aetherfall&dev&touch`);
    await waitFor(page.evaluate, `typeof DEV !== 'undefined' && typeof G !== 'undefined' && W > 0`, BOOT_TIMEOUT_MS, 'boot');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: DSF, mobile: true }, page.sessionId);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU }, page.sessionId);
    const res = JSON.parse(await page.evaluate(PAGE_SCRIPT));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }, page.sessionId);
    if (!res.ok) throw new Error(res.err);
    console.log(`\n== boss profile · level ${LEVEL} ${MODE} · cpu ${CPU}x · dsf ${DSF} · ${FRAMES} frames ==`);
    console.log('env:', JSON.stringify(res.env), '\ncounts:', JSON.stringify(res.counts));
    for (const pass of ['full', 'lean', 'min']) {
      const r = res[pass];
      if (!r) continue;
      console.log(`\n-- fx=${pass}: frame ${r.avg}ms avg / ${r.p95}ms p95 (update ${r.updAvg}ms · ${r.shotsAvg} shots live) --`);
      console.log('px/frame:', JSON.stringify(r.px));
      console.log('draw fns (ms/frame):');
      for (const [k, ms] of r.fns) console.log(`  ${String(ms).padStart(7)}  ${k}`);
    }
    if (page.errors.length) console.log('\npage errors:', page.errors.slice(0, 5));
    const out = path.join(ROOT, '.profile-boss.json');
    fs.writeFileSync(out, JSON.stringify(res, null, 2));
    console.log('\nwritten:', out);
  } finally {
    cleanup(); srv.close();
  }
})().catch(e => { console.error('profile failed:', e.message); process.exit(1); });
