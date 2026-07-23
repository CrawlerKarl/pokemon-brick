#!/usr/bin/env node
'use strict';

// AFT-005A — the headless release gate. `npm test` for real.
//
// One command runs, in order:
//   1. npm run check          (syntax on every module)
//   2. npm run verify-assets  (every roster id named + sprited)
//   3. the invariant suite    (test.html in headless Chrome — the same 79
//      checks as the fronted tab, no 20-minute babysitting; the suite drives
//      its own sim clock, so headless runs it at CPU speed)
//   4. both-skin boot smoke   (index.html?skin=pokemon and ?skin=aetherfall
//      each boot with zero uncaught errors, worlds assembled)
//   5. the vocabulary scan    (RUNTIME walk of the aetherfall shared copy
//      tables: zero player-facing \bMEGA\b — the AFT-003 enforcement; a
//      static grep can't do this because the engine tables legitimately
//      carry MEGA and the lexicon rewrites them at boot)
//   6. npm run build-dist     (must print "RESIDUE: none")
//   7. dist boot smoke        (the built standalone boots, aetherfall skin,
//      zero errors, vocabulary scan clean)
//
// Zero dependencies: raw CDP over Node's built-in WebSocket (Node 21+).
// Failure = non-zero exit; any uncaught page error or console.error fails.
//
//   npm test              the full gate
//   npm test -- --fast    steps 1–5 only (skip dist/scenes/storm)
//   npm test -- --suite   step 3 only (the invariant suite alone)
//
// AFT-005B adds, to the full gate: DETERMINISTIC MOBILE SCENES — the game is
// driven through every named screen at two phone viewports, each frame's
// fitted labels are asserted inside the viewport (the AFT-001 zone log makes
// this checkable), and a screenshot of every scene lands in .gate-shots/ for
// human review — plus the ARTIFACT-STORM benchmark: a seeded worst-case
// effects load timed over 120 frames (reported always; only a catastrophic
// regression fails the gate, since absolute ms are machine-dependent).

const { spawn, spawnSync } = require('child_process');
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
const SUITE_TIMEOUT_MS = 30 * 60 * 1000;
const BOOT_TIMEOUT_MS = 45 * 1000;

const args = process.argv.slice(2);
const FAST = args.includes('--fast');
const SUITE_ONLY = args.includes('--suite');

// ── tiny static server (serve.js semantics: no-store, same mime map) ───────
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

// ── minimal CDP client over the built-in WebSocket ─────────────────────────
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pkbrk-gate-'));
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

// open a fresh page, collect console errors + exceptions, return helpers
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

async function waitFor(evaluate, expr, timeoutMs, label, onPoll) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await evaluate(expr); } catch (e) { /* mid-navigation */ }
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error(label + ' timed out after ' + Math.round(timeoutMs / 1000) + 's');
    if (onPoll) onPoll();
    await new Promise(r => setTimeout(r, 1500));
  }
}

// the AFT-003 vocabulary enforcement: walk the shared copy tables AT RUNTIME
// under the aetherfall skin — player-facing \bMEGA\b anywhere is a failure.
const VOCAB_SCAN = `(() => {
  const roots = { PATHS, STARTER_KIT, STACK_ITEMS, AFFINITIES, SECRET_UPGRADES,
    WEB_BRIDGES, WEB_FUSIONS, WEB_APEXES, WEB_SATELLITES, CHEAT_ITEMS, MODES };
  const leftover = []; const seen = new Set();
  const walk = (o, p) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') { if (/\\bMEGA\\b/.test(v)) leftover.push(p + '.' + k); }
      else if (Array.isArray(v) && v.every(x => typeof x === 'string')) v.forEach((s, i) => { if (/\\bMEGA\\b/.test(s)) leftover.push(p + '.' + k + '[' + i + ']'); });
      else walk(v, p + '.' + k);
    }
  };
  for (const [n, r] of Object.entries(roots)) walk(r, n);
  return JSON.stringify({ skin: SKIN.id, leftover, lexSample: lex('MEGA READY!') });
})()`;

// ── AFT-005B: deterministic mobile scenes + the artifact storm ─────────────
const SCENES = [
  { name: 'home', js: `G.state='menu'; advOpen=false;` },
  { name: 'settings-save', js: `G.state='menu'; advOpen=true; settingsPage=2;` },
  { name: 'arrival', js: `advOpen=false; DEV.launch({level:1,mode:'junkie',diff:'normal',seed:'SHOT'}); paused=false; G.freeze=0; for(let i=0;i<40;i++)update(1/60);` },
  { name: 'objective', js: `DEV.launch({level:8,mode:'junkie',diff:'normal',seed:'SHOT'}); paused=false; G.freeze=0; for(let i=0;i<100;i++)update(1/60);` },
  { name: 'charge', js: `G.charge=0.85; G.chargeHeld=true; update(1/60);` },
  { name: 'surge-ready', js: `G.charge=0; G.mega=1; G.megaT=0; for(let i=0;i<12;i++)update(1/60);` },
  { name: 'boss-reveal', js: `DEV.launch({level:3,mode:'junkie',diff:'normal',seed:'SHOT'}); paused=false; G.freeze=0; for(let i=0;i<8;i++)update(1/60); jumpToGauntletRound(1); for(let i=0;i<45;i++)update(1/60);` },
  { name: 'boss-combat', js: `revealSkip(); for(let i=0;i<220;i++)update(1/60);` },
  { name: 'draft', js: `G.state='upgrade'; G.stateT=1; if(!G.upgradeChoices) rollUpgradeChoices();` },
  { name: 'web', js: `upgradeTreeOpen=true;` },
  { name: 'results', js: `upgradeTreeOpen=false; DEV.launch({level:2,mode:'classic',diff:'normal',seed:'SHOT'}); paused=false; G.freeze=0; for(const b of G.bricks){b.dead=true;} for(let i=0;i<80;i++)update(1/60);` },
  { name: 'codex', js: `G.state='dex';` },
  { name: 'ending', js: `beginEnding(); paused=false; G.freeze=0; for(let i=0;i<60;i++)update(1/60);` },
  { name: 'gameover', js: `G.state='gameover'; G.stateT=1;` },
];
const SHOT_VIEWPORTS = [[390, 844], [667, 375]];
async function runScenes(cdp, port) {
  const t0 = Date.now();
  const shotsDir = path.join(ROOT, '.gate-shots');
  fs.mkdirSync(shotsDir, { recursive: true });
  const failures = [];
  let shots = 0;
  for (const [vw, vh] of SHOT_VIEWPORTS) {
    const page = await openPage(cdp, `http://127.0.0.1:${port}/index.html?skin=aetherfall&dev&touch`);
    const sid = page.sessionId;
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: vw, height: vh, deviceScaleFactor: 2, mobile: true }, sid);
    const booted = await waitFor(page.evaluate,
      `typeof SKIN !== 'undefined' && typeof DEV !== 'undefined' && typeof G !== 'undefined'`,
      BOOT_TIMEOUT_MS, 'scene boot ' + vw + 'x' + vh).catch(() => null);
    if (!booted) { failures.push(vw + 'x' + vh + ': boot failed'); await page.close(); continue; }
    await page.evaluate(`resize(); ZONE_DEBUG = true; 'ok'`);
    for (const sc of SCENES) {
      const res = await page.evaluate(`(() => {
        try {
          ${sc.js}
          G.freeze = 999; render();
          const out = (zoneLog || []).filter(b => b.x0 < -0.5 || b.x1 > W + 0.5)
            .map(b => (b.zone || '?') + ':' + String(b.text).slice(0, 34));
          return JSON.stringify({ ok: true, out, w: W, h: H });
        } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.message || e).slice(0, 120) }); }
      })()`).then(JSON.parse).catch(e => ({ ok: false, err: e.message }));
      if (!res.ok) { failures.push(sc.name + '@' + vw + 'x' + vh + ': ' + res.err); continue; }
      if (res.out.length) failures.push(sc.name + '@' + vw + 'x' + vh + ': labels out of viewport — ' + res.out.slice(0, 3).join(' · '));
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sid).catch(() => null);
      if (shot) { fs.writeFileSync(path.join(shotsDir, sc.name + '-' + vw + 'x' + vh + '.png'), Buffer.from(shot.data, 'base64')); shots++; }
    }
    for (const e of page.errors) failures.push('page@' + vw + 'x' + vh + ': ' + e);
    await page.close();
  }
  return { failures, shots, ms: Date.now() - t0 };
}
async function runStorm(cdp, port) {
  const t0 = Date.now();
  const page = await openPage(cdp, `http://127.0.0.1:${port}/index.html?skin=aetherfall&dev&touch`);
  const sid = page.sessionId;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sid);
  const booted = await waitFor(page.evaluate,
    `typeof DEV !== 'undefined' && typeof G !== 'undefined'`, BOOT_TIMEOUT_MS, 'storm boot').catch(() => null);
  if (!booted) { await page.close(); return { err: 'storm page failed to boot', ms: Date.now() - t0 }; }
  const res = await page.evaluate(`(() => {
    try {
      resize();
      DEV.launch({ level: 24, mode: 'junkie', diff: 'hard', seed: 'STORM', upg: 'arsenal:4,surge:4,impact:4,prism:3' });
      paused = false; G.freeze = 0;
      for (let i = 0; i < 90; i++) update(1/60);
      // the worst realistic combination: Surge active, bursts, rings, shots
      G.mega = 1; tryMega();
      for (let i = 0; i < 6; i++) { burst(W/2, H/2, '#ffd54f', 70, 420, 1); ringFx(W/2, H/2, '#80d8ff', 10, 200, 5, 0.7); }
      const times = [];
      for (let i = 0; i < 120; i++) {
        const a = performance.now();
        paused = false; G.freeze = 0;
        update(1/60); render();
        times.push(performance.now() - a);
      }
      times.sort((x, y) => x - y);
      const avg = times.reduce((s2, v) => s2 + v, 0) / times.length;
      return JSON.stringify({ ok: true, avg: +avg.toFixed(2), p95: +times[Math.floor(times.length * 0.95)].toFixed(2),
        counts: { particles: G.particles.length, shots: G.enemyShots.length, lasers: G.lasers.length, rings: G.rings.length } });
    } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.message || e).slice(0, 140) }); }
  })()`).then(JSON.parse).catch(e => ({ ok: false, err: e.message }));
  await page.close();
  return { ...res, ms: Date.now() - t0 };
}

// ── the gate steps ─────────────────────────────────────────────────────────
const report = { steps: [], failures: [] };
function step(name, ok, detail, ms) {
  report.steps.push({ name, ok, detail, ms });
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail ? ' — ' + detail : '') + (ms != null ? ' (' + (ms / 1000).toFixed(1) + 's)' : ''));
  if (!ok) report.failures.push(name + (detail ? ': ' + detail : ''));
}

function runNpm(script) {
  const t0 = Date.now();
  const r = spawnSync('npm', ['run', script], { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), ms: Date.now() - t0 };
}

async function main() {
  const t0 = Date.now();
  console.log('WAVEBREAKER release gate' + (SUITE_ONLY ? ' (--suite)' : FAST ? ' (--fast)' : ''));

  if (!SUITE_ONLY) {
    const c = runNpm('check');
    step('syntax check (npm run check)', c.ok, c.ok ? '16 modules' : c.out.split('\n').slice(-4).join(' '), c.ms);
    if (!c.ok) return finish(1);
    const v = runNpm('verify-assets');
    step('asset verification', v.ok, v.ok ? '' : v.out.split('\n').slice(-4).join(' '), v.ms);
    if (!v.ok) return finish(1);
  }

  const { srv, port } = await serveDir(ROOT);
  const { cdp, cleanup } = await launchChrome();
  process.on('exit', cleanup);

  try {
    // ── step 3: the invariant suite ──
    {
      const t = Date.now();
      const page = await openPage(cdp, `http://127.0.0.1:${port}/test.html`);
      let printed = 0;
      const done = await waitFor(page.evaluate, 'window.TEST_DONE === true', SUITE_TIMEOUT_MS, 'invariant suite', () => {
        // stream [TEST] progress lines as they land
        while (printed < page.consoleLines.length) {
          const l = page.consoleLines[printed++];
          if (l.startsWith('[TEST')) console.log('    ' + l);
        }
      }).catch(e => { step('invariant suite', false, e.message); return null; });
      if (!done) return finish(1);
      const res = await page.evaluate('JSON.stringify({ r: window.TEST_RESULTS, errs: window.__ERRORS })');
      const { r, errs } = JSON.parse(res);
      const failed = r.filter(x => x.status === 'FAIL');
      const passed = r.filter(x => x.status === 'PASS').length;
      const pageErrs = page.errors.concat(errs || []);
      for (const f of failed) console.log('    FAIL ' + f.name + ' — ' + f.detail);
      for (const e of pageErrs) console.log('    PAGE ERROR ' + e);
      step('invariant suite', failed.length === 0 && pageErrs.length === 0,
        passed + '/' + r.length + ' passed' + (pageErrs.length ? ' · ' + pageErrs.length + ' page errors' : ''), Date.now() - t);
      report.suite = { passed, total: r.length, failed: failed.map(f => f.name) };
      await page.close();
      if (failed.length || pageErrs.length) return finish(1);
    }

    // ── steps 4+5: both-skin boot smoke + vocabulary scan ──
    for (const skin of ['pokemon', 'aetherfall']) {
      const t = Date.now();
      const page = await openPage(cdp, `http://127.0.0.1:${port}/index.html?skin=${skin}`);
      const ok = await waitFor(page.evaluate,
        `typeof SKIN !== 'undefined' && SKIN.id === '${skin}' && typeof G !== 'undefined' && SKIN.gens && SKIN.gens.length === 9`,
        BOOT_TIMEOUT_MS, skin + ' boot').catch(e => { step('workshop boot: ' + skin, false, e.message); return null; });
      if (!ok) return finish(1);
      // give the boot a beat to surface async errors (sprite loads, first frames)
      await new Promise(r => setTimeout(r, 2500));
      step('workshop boot: ' + skin, page.errors.length === 0,
        page.errors.length ? page.errors[0] : 'world assembled, 0 errors', Date.now() - t);
      if (page.errors.length) return finish(1);
      if (skin === 'aetherfall') {
        const scan = JSON.parse(await page.evaluate(VOCAB_SCAN));
        const clean = scan.leftover.length === 0 && scan.lexSample === 'SURGE READY!';
        step('vocabulary scan (no player-facing MEGA)', clean,
          clean ? 'lex("MEGA READY!") → "' + scan.lexSample + '"' : scan.leftover.slice(0, 5).join(', '));
        if (!clean) return finish(1);
      }
      await page.close();
    }

    if (FAST || SUITE_ONLY) return finish(0);

    // ── step 6: the dist build + RESIDUE ──
    {
      const b = runNpm('build-dist');
      const residue = b.out.includes('RESIDUE: none');
      step('build-dist + RESIDUE: none', b.ok && residue,
        b.ok ? (residue ? '' : 'RESIDUE FOUND — see npm run build-dist') : b.out.split('\n').slice(-4).join(' '), b.ms);
      if (!b.ok || !residue) return finish(1);
    }

    // ── step 7: dist boot smoke + vocabulary scan ──
    {
      const t = Date.now();
      const distRoot = path.join(ROOT, 'dist-aetherfall');
      const { srv: dsrv, port: dport } = await serveDir(distRoot);
      const page = await openPage(cdp, `http://127.0.0.1:${dport}/index.html`);
      const ok = await waitFor(page.evaluate,
        `typeof SKIN !== 'undefined' && SKIN.id === 'aetherfall' && typeof G !== 'undefined' && document.title === 'AETHERFALL'`,
        BOOT_TIMEOUT_MS, 'dist boot').catch(e => { step('dist boot', false, e.message); return null; });
      if (ok) {
        await new Promise(r => setTimeout(r, 2500));
        const scan = JSON.parse(await page.evaluate(VOCAB_SCAN));
        const clean = page.errors.length === 0 && scan.leftover.length === 0 && scan.lexSample === 'SURGE READY!';
        step('dist boot + vocabulary scan', clean,
          clean ? 'standalone boots clean, 0 MEGA' : (page.errors[0] || scan.leftover.slice(0, 5).join(', ')), Date.now() - t);
        if (!clean) { dsrv.close(); return finish(1); }
      } else { dsrv.close(); return finish(1); }
      await page.close();
      dsrv.close();
    }

    // ── AFT-005B: mobile scenes + label containment + screenshots ──
    {
      const sc = await runScenes(cdp, port);
      for (const f of sc.failures) console.log('    SCENE ' + f);
      step('mobile scenes + fitted-label containment', sc.failures.length === 0,
        (SCENES.length * SHOT_VIEWPORTS.length) + ' scenes · ' + sc.shots + ' screenshots → .gate-shots/', sc.ms);
      report.scenes = { shots: sc.shots, failures: sc.failures };
      if (sc.failures.length) return finish(1);
    }
    // ── AFT-005B/018: the artifact-storm benchmark ──
    {
      const st = await runStorm(cdp, port);
      const catastrophic = st.ok && st.avg > 50; // absolute ms are machine-dependent — only a collapse fails
      step('artifact-storm benchmark', !!st.ok && !catastrophic,
        st.ok ? 'avg ' + st.avg + 'ms · p95 ' + st.p95 + 'ms/frame @390×844 dsf2' : (st.err || 'failed'), st.ms);
      report.storm = st;
      if (!st.ok || catastrophic) return finish(1);
    }

    return finish(0);
  } finally {
    try { srv.close(); } catch (e) {}
    cleanup();
  }

  function finish(code) {
    const total = ((Date.now() - t0) / 1000).toFixed(0);
    report.ok = code === 0; report.totalSeconds = +total;
    try { fs.writeFileSync(path.join(ROOT, '.gate-report.json'), JSON.stringify(report, null, 2)); } catch (e) {}
    console.log((code === 0 ? 'GATE GREEN' : 'GATE RED') + ' in ' + total + 's'
      + (report.suite ? ' · suite ' + report.suite.passed + '/' + report.suite.total : ''));
    process.exitCode = code;
    return code;
  }
}

main().catch(e => { console.error('gate crashed: ' + (e.stack || e)); process.exitCode = 1; });
