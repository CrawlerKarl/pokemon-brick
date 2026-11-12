#!/usr/bin/env node
'use strict';
// tools/build-icons.js — draws the ORIGINAL app icon (a luminous chevron
// vessel descending through a ring, on a deep-space radial) with a headless
// Chrome canvas over raw CDP (zero deps, Node 21+) and writes assets/icons/*.png.
//   node tools/build-icons.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'icons');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
];

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


// kind: 'full' (edge-to-edge square, any-purpose/touch) | 'maskable' (emblem
// shrunk into the central 80% safe zone, background bleeds to every edge)
const DRAW = `(function (size, scale) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), S = size, m = S / 2;
  const bg = x.createRadialGradient(m, S * 0.42, S * 0.02, m, m, S * 0.78);
  bg.addColorStop(0, '#26206b'); bg.addColorStop(0.55, '#0e0c33'); bg.addColorStop(1, '#05060f');
  x.fillStyle = bg; x.fillRect(0, 0, S, S);
  x.save(); x.translate(m, m); x.scale(scale, scale); x.translate(-m, -m);
  // faint star dust
  x.fillStyle = 'rgba(190,220,255,0.55)';
  [[0.14,0.18,1.4],[0.84,0.14,1.8],[0.9,0.62,1.2],[0.1,0.7,1.6],[0.3,0.9,1.1],[0.72,0.88,1.4],[0.2,0.4,1],[0.8,0.38,1]].forEach(p => {
    x.beginPath(); x.arc(p[0] * S, p[1] * S, p[2] * S / 256, 0, 7); x.fill(); });
  // the ring (tilted-less, bold)
  const R = S * 0.355;
  x.lineCap = 'round';
  x.strokeStyle = 'rgba(80,220,255,0.28)'; x.lineWidth = S * 0.075;
  x.beginPath(); x.arc(m, m * 1.04, R, 0, 7); x.stroke();
  const rg = x.createLinearGradient(0, S * 0.2, 0, S * 0.85);
  rg.addColorStop(0, '#9af3ff'); rg.addColorStop(1, '#2a8cff');
  x.strokeStyle = rg; x.lineWidth = S * 0.04;
  x.beginPath(); x.arc(m, m * 1.04, R, 0, 7); x.stroke();
  // falling-star trail above the chevron
  const tr = x.createLinearGradient(0, S * 0.06, 0, S * 0.5);
  tr.addColorStop(0, 'rgba(255,255,255,0)'); tr.addColorStop(1, 'rgba(160,240,255,0.95)');
  x.fillStyle = tr;
  x.beginPath(); x.moveTo(m - S * 0.032, S * 0.5); x.lineTo(m + S * 0.032, S * 0.5);
  x.lineTo(m, S * 0.04); x.closePath(); x.fill();
  // chevron vessel (pointing up), glow then core
  const chev = () => { x.beginPath();
    x.moveTo(m, S * 0.27); x.lineTo(m + S * 0.25, S * 0.7); x.lineTo(m, S * 0.585);
    x.lineTo(m - S * 0.25, S * 0.7); x.closePath(); };
  x.save(); x.shadowColor = '#52e6ff'; x.shadowBlur = S * 0.09;
  chev(); x.fillStyle = '#52e6ff'; x.fill(); x.restore();
  const cg = x.createLinearGradient(0, S * 0.27, 0, S * 0.7);
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.6, '#bff6ff'); cg.addColorStop(1, '#43c7ff');
  chev(); x.fillStyle = cg; x.fill();
  // center keel line for depth
  x.strokeStyle = 'rgba(10,30,90,0.55)'; x.lineWidth = S * 0.012; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(m, S * 0.34); x.lineTo(m, S * 0.585); x.stroke();
  x.restore();
  return c.toDataURL('image/png').split(',')[1];
})`;

(async () => {
  const { cdp, cleanup } = await launchChrome();
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const jobs = [
      ['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['icon-maskable-512.png', 512, 0.74],
      ['apple-touch-icon-180.png', 180, 1], ['favicon-32.png', 32, 1.12],
    ];
    fs.mkdirSync(OUT, { recursive: true });
    for (const [name, size, scale] of jobs) {
      const r = await cdp.send('Runtime.evaluate', { expression: `${DRAW}(${size}, ${scale})`, returnByValue: true }, sid);
      if (r.exceptionDetails) throw new Error('draw failed: ' + JSON.stringify(r.exceptionDetails));
      fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.value, 'base64'));
      console.log('wrote assets/icons/' + name);
    }
  } catch (e) { console.error('build-icons failed: ' + e.message); process.exitCode = 1; }
  cleanup();
  process.exit(process.exitCode || 0);
})();
