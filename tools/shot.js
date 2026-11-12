#!/usr/bin/env node
'use strict';

// tools/shot.js — headless screenshots of ANY game state, for visual review.
//
// The preview pane throttles rAF and auto-pauses on focus loss, so judging
// art by eye there is unreliable. This drives the real game in headless
// Chrome (the gate's raw-CDP approach — zero deps, Node 21+), runs a setup
// snippet, renders ONE frozen frame, and writes a PNG.
//
//   node tools/shot.js --out /tmp/a.png \
//     --q "skin=aetherfall&level=5&mode=junkie&seed=A&upg=arsenal:2" \
//     --play 12                # autopilot-play 12 sim seconds, then capture
//
//   --q <query>     appended to index.html?dev&touch&  (default: aetherfall)
//   --vp WxH        viewport (default 390x844), --dpr N (default 2)
//   --play N        run the built-in autopilot for N sim seconds (weaves,
//                   fires, serves the ball, skips reveals + results)
//   --js "<code>"   extra setup run AFTER --play, BEFORE the capture
//   --zones         keep the dev zone overlay (off by default)
//   --page <file>   a different html page (default index.html)
//   --multi "a.png@4,b.png@9"  several captures along one --play timeline
//                   (file@simSecond; overrides --out/--play)
//
// The autopilot is a REVIEW aid, not a balance bot: it exists to put real
// combat on screen. Prints the page's console errors, exits 1 on failure.

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

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
}

function serveDir(root) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (p.endsWith('/')) p += 'index.html';
      if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
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
      } else if (m.method) for (const fn of this.listeners) fn(m);
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

async function launchChrome() {
  const bin = (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) ? process.env.CHROME_BIN
    : CHROME_PATHS.find(p => fs.existsSync(p));
  if (!bin) throw new Error('no Chrome/Chromium found — set CHROME_BIN');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pkbrk-shot-'));
  const proc = spawn(bin, [
    '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--window-size=1280,900', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    'about:blank',
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
  const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} };
  return { cdp: new CDP(ws), cleanup };
}

// The review autopilot: weave under the action, fire, serve, skip modal
// beats. Steps the sim in-page so N seconds cost milliseconds.
const AUTOPILOT = `window.__shotPlay = function (secs) {
  const n = Math.round(secs * 60);
  for (let i = 0; i < n; i++) {
    paused = false; G.freeze = 0;
    if (G.reveal && typeof revealSkip === 'function') revealSkip();
    if (G.state === 'results' && G.stateT > 0.6 && typeof advanceResults === 'function') advanceResults();
    if (G.state === 'serve' || G.state === 'play') {
      const b = G.balls && G.balls.find(x => !x.stuck);
      if (G.mode === 'classic') {
        if (b) mouseX = b.x + Math.sin(G.time * 2.3) * 26;
        if (G.state === 'serve' && G.stateT > 0.4) fireAction();
      } else {
        // sit under the nearest live target, dodge sideways off incoming fire
        let tx = W / 2 + Math.sin(G.time * 1.3) * W * 0.3, best = 1e9;
        for (const br of G.bricks) { if (br.dead || br.dormant || br.friendly) continue;
          const d = Math.abs(br.bx - G.paddle.x) + (H - br.by) * 0.15; if (d < best) { best = d; tx = br.bx; } }
        for (const s of G.enemyShots) { if (s.y > shipY() - 150 && s.y < shipY() + 10 && Math.abs(s.x - G.paddle.x) < 34) tx += (s.x > G.paddle.x ? -70 : 70); }
        mouseX = Math.max(30, Math.min(W - 30, tx));
        if (i % 7 === 0) fireAction();
        if (G.mega >= 1 && G.megaT <= 0 && typeof megaAction === 'function') megaAction();
      }
    }
    update(1 / 60);
  }
  return G.state;
};`;

(async () => {
  const out = arg('out', path.join(os.tmpdir(), 'shot.png'));
  const q = arg('q', 'skin=aetherfall');
  const [vw, vh] = String(arg('vp', '390x844')).split('x').map(Number);
  const dpr = +arg('dpr', 2);
  const play = +arg('play', 0);
  const js = arg('js', '');
  const pageFile = arg('page', 'index.html');
  const multi = arg('multi', '');
  const plan = multi && multi !== true
    ? String(multi).split(',').map(s => { const [f, t] = s.split('@'); return { file: f, at: +t }; }).sort((a, b) => a.at - b.at)
    : [{ file: out, at: play }];

  const { srv, port } = await serveDir(ROOT);
  const { cdp, cleanup } = await launchChrome();
  let code = 0;
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const errors = [];
    cdp.on(m => {
      if (m.sessionId !== sid) return;
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push('exception: ' + (d.exception && d.exception.description || d.text).split('\n').slice(0, 3).join(' | '));
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
        errors.push('console.error: ' + (m.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ').split('\n')[0]);
    });
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Page.enable', {}, sid);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: dpr, mobile: vw < 700 }, sid);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/${pageFile}?dev&touch&${q}` }, sid);
    const evaluate = async (expr) => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
      if (r.exceptionDetails) throw new Error('evaluate failed: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const t0 = Date.now();
    for (;;) {
      let ok = false;
      try { ok = await evaluate(`typeof G !== 'undefined' && typeof DEV !== 'undefined' && typeof SKIN !== 'undefined' && !!W`); } catch (e) {}
      if (ok) break;
      if (Date.now() - t0 > 30000) throw new Error('boot timed out');
      await new Promise(r => setTimeout(r, 250));
    }
    // let on-demand art (sprites, weapon PNGs) actually load
    await new Promise(r => setTimeout(r, 900));
    await evaluate(`resize(); ${arg('zones', false) ? '' : `if (typeof ZONE_DEBUG !== 'undefined') ZONE_DEBUG = false;`} ${AUTOPILOT} 'ok'`);
    let clock = 0;
    for (const p of plan) {
      const dt = Math.max(0, p.at - clock); clock = p.at;
      if (dt > 0) await evaluate(`__shotPlay(${dt})`);
      await new Promise(r => setTimeout(r, 350)); // sprites requested mid-play
      const info = await evaluate(`(() => { ${p === plan[plan.length - 1] || !multi ? js : ''}; paused = false; const f = G.freeze; G.freeze = 999; render(); G.freeze = f;
        return JSON.stringify({ state: G.state, level: G.level, mode: G.mode, t: +G.time.toFixed(1), score: G.score, lives: G.lives,
          alive: G.bricks.filter(b => !b.dead).length, shots: G.enemyShots.length, particles: G.particles.length }); })()`);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sid);
      fs.mkdirSync(path.dirname(path.resolve(p.file)), { recursive: true });
      fs.writeFileSync(p.file, Buffer.from(shot.data, 'base64'));
      console.log(p.file + '  ' + info);
    }
    if (errors.length) { console.log('PAGE ERRORS:\n  ' + errors.slice(0, 8).join('\n  ')); code = 1; }
  } catch (e) { console.error('shot failed: ' + e.message); code = 1; }
  cleanup(); srv.close();
  process.exit(code);
})();
