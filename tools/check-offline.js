#!/usr/bin/env node
'use strict';
// tools/check-offline.js — AFT-015 functional proof: the BUILT standalone
// (dist-aetherfall/) installs its service worker, precaches the shell + all art,
// and then BOOTS with the server gone.
//   node tools/check-offline.js [--root dist-aetherfall]
// Uses the `?sw` escape hatch (the worker never registers on localhost
// otherwise). Offline is simulated by actually stopping the static server —
// CDP network emulation does not reach the worker's own fetches.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const rootArg = process.argv.indexOf('--root');
const SITE = path.resolve(ROOT, rootArg > 0 ? process.argv[rootArg + 1] : 'dist-aetherfall');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };

function serve(root, port) {
  const sockets = new Set();
  const srv = http.createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  srv.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return new Promise(resolve => srv.listen(port || 0, '127.0.0.1', () => resolve({
    srv, port: srv.address().port,
    stop: () => new Promise(r => { for (const s of sockets) s.destroy(); srv.close(r); }),
  })));
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(path.join(SITE, 'sw.js'))) { console.error('check-offline: no sw.js in ' + SITE + ' (run npm run build-dist)'); process.exit(1); }
  const site = await serve(SITE);
  const { cdp, cleanup } = await launchChrome();
  let ok = false, detail = '';
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Page.enable', {}, sid);
    const ev = async expr => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
      if (r.exceptionDetails) throw new Error('evaluate failed: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const waitFor = async (expr, ms, label) => {
      const t0 = Date.now();
      for (;;) {
        let v = null; try { v = await ev(expr); } catch (e) {}
        if (v) return v;
        if (Date.now() - t0 > ms) throw new Error(label + ' timed out');
        await sleep(400);
      }
    };
    const base = 'http://127.0.0.1:' + site.port + '/index.html?sw';
    await cdp.send('Page.navigate', { url: base }, sid);
    await waitFor(`typeof G !== 'undefined' && document.title === 'AETHERFALL'`, 30000, 'online boot');
    await waitFor(`navigator.serviceWorker.getRegistration().then(r => !!(r && r.active))`, 20000, 'worker activation');
    // shell cached + the whole art library warmed in the background
    const want = await ev(`fetch('sw.js').then(r => r.text()).then(t => (t.match(/\\.webp"/g) || []).length)`);
    await waitFor(`caches.open('wb-art-v1').then(c => c.keys()).then(k => k.length >= ${want})`, 90000, 'art warm-up (' + want + ' files)');
    await waitFor(`caches.keys().then(ks => ks.some(k => k.startsWith('wb-shell-')))`, 5000, 'shell cache');
    await site.stop(); // the server is GONE
    await cdp.send('Page.navigate', { url: base + '&skin=aetherfall' }, sid);
    await waitFor(`typeof G !== 'undefined' && typeof SKIN !== 'undefined' && SKIN.id === 'aetherfall' && !!W`, 30000, 'OFFLINE boot');
    const state = await ev(`JSON.stringify({ title: document.title, ctl: !!navigator.serviceWorker.controller, online: navigator.onLine })`);
    ok = true; detail = want + ' art files warmed; offline boot OK ' + state;
  } catch (e) { detail = e.message; }
  cleanup(); try { await site.stop(); } catch (e) {}
  console.log((ok ? 'OFFLINE OK: ' : 'OFFLINE FAIL: ') + detail);
  process.exit(ok ? 0 : 1);
})();
