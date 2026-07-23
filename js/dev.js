'use strict';
// ============================================================
//  DEV TOOLING — deterministic launches, build grants, balance reports.
//  Loaded after render.js and before main.js. Everything here is
//  LOCAL-ONLY (nothing ever leaves the machine) and inert during normal
//  play: it activates only via URL parameters or the window.DEV console
//  API, and never runs inside the per-frame hot loops.
//
//  URL parameters (all optional, combine freely):
//    ?dev                 enable the dev HUD badge + keep the run in trial
//    ?level=14            open a specific stage (1-27)
//    ?region=5&stage=3    same, by region (1-9) and stage (1-3)
//    ?round=2             legendary stages: 1 legendary · 2 mythic · 3 secret
//    ?mode=junkie         junkie | classic | blaster (starfighter/breaker ok)
//    ?diff=hard           easy | normal | hard | nuzlocke
//    ?starter=fire        any starter key, or none
//    ?seed=MYSEED         deterministic gameplay RNG (setRunSeed)
//    ?upg=arsenal:3,aegis:2,vshred   grant path ranks / web nodes on top
//    ?real=1              non-trial run (records count; default is trial)
//    ?skin=aetherfall     boot under a skin (rides location.search, so it
//                         propagates through every dev launch for free)
//  Example: ?dev&level=3&round=1&mode=junkie&seed=MEWTWO-A&diff=normal
// ============================================================
const DEV_QS = new URLSearchParams(location.search);
const DEV_MODE = DEV_QS.has('dev');
const DEV_MODE_ALIASES = {
  junkie: 'junkie', starfighter: 'junkie', classic: 'classic',
  breaker: 'classic', blaster: 'blaster',
};

function devNormalizeLaunch(o) {
  const out = {};
  if (o.mode && DEV_MODE_ALIASES[String(o.mode).toLowerCase()])
    out.mode = DEV_MODE_ALIASES[String(o.mode).toLowerCase()];
  if (o.diff && PRESETS[String(o.diff).toLowerCase()]) out.diff = String(o.diff).toLowerCase();
  const st = o.starter != null ? String(o.starter).toLowerCase() : null;
  if (st && (st === 'none' || STARTER_KEYS.includes(st))) out.starter = st;
  let lv = parseInt(o.level, 10);
  if (!lv && o.region) {
    const r = Math.max(1, Math.min(9, parseInt(o.region, 10) || 1));
    const s = Math.max(1, Math.min(3, parseInt(o.stage, 10) || 1));
    lv = (r - 1) * STAGES + s;
  }
  out.level = Math.max(1, Math.min(27, lv || 1));
  out.round = Math.max(0, Math.min(3, parseInt(o.round, 10) || 0));
  if (o.phase != null) out.phase = Math.max(1, parseInt(o.phase, 10) || 1); // jumpToGauntletRound clamps to phaseCount
  if (o.seed != null && o.seed !== '') out.seed = String(o.seed);
  if (o.upg) out.upg = String(o.upg);
  out.real = o.real === true || o.real === '1' || o.real === 1;
  return out;
}

// Grant an explicit build on top of whatever resetRun banked for a deep
// start: "arsenal:3,aegis:2,vshred" → 3 VOLLEY ranks (path key 'arsenal'),
// 2 AEGIS ranks, and the web node 'vshred'. Path grants route through
// advancePath so tier unlock side effects stay real; unknown keys are
// reported, never fatal.
function devGrantBuild(spec) {
  const unknown = [];
  for (const part of String(spec).split(',').map(s => s.trim()).filter(Boolean)) {
    const [key, nRaw] = part.split(':');
    const n = Math.max(1, parseInt(nRaw, 10) || 1);
    if (PATHS[key]) { for (let i = 0; i < n && pathLvl(key) < 4; i++) advancePath(key); }
    else if ([...WEB_BRIDGES, ...WEB_FUSIONS, ...WEB_APEXES].some(w => w.key === key)) G.upg[key] = 1;
    else if (WEB_SATELLITES.some(s => s.stackKey === key)) G.stacks[key] = (G.stacks[key] || 0) + n;
    else unknown.push(key);
  }
  if (unknown.length) console.warn('[DEV] unknown upgrade keys ignored:', unknown.join(', '));
}

// The one launch entry — console: DEV.launch({level: 6, round: 2, seed: 'A'})
function devLaunch(opts = {}) {
  const o = devNormalizeLaunch(opts);
  if (o.mode) SETTINGS.mode = o.mode;
  if (o.diff) SETTINGS.preset = o.diff;
  if (o.starter) SETTINGS.starter = o.starter === 'none' ? 'none' : o.starter;
  trialOpen = false; advOpen = false; cheatOpen = false;
  resetRun(o.level, !o.real, o.seed != null ? { seed: o.seed } : {});
  if (o.upg) devGrantBuild(o.upg);
  if (stageIdx(G.level) === 2) jumpToGauntletRound(o.round, o.phase);
  console.log('[DEV] launched', {
    level: o.level, region: regionIdx(o.level) + 1, stage: stageIdx(o.level) + 1,
    round: o.round, mode: G.mode, preset: SETTINGS.preset, seed: G.runSeed,
    trial: G.trial,
  });
  return G;
}

// URL auto-launch: any gameplay param counts as intent, not just ?dev.
// Retries until the viewport is real (main.js's bootstrap may still be
// waiting on layout when the load event fires).
function devMaybeAutoLaunch() {
  if (!['level', 'region', 'seed', 'upg', 'round'].some(k => DEV_QS.has(k))) return;
  let tries = 0;
  const kick = () => {
    resize();
    if (!W || !H) { if (++tries < 120) setTimeout(kick, 50); return; }
    devLaunch({
      level: DEV_QS.get('level'), region: DEV_QS.get('region'), stage: DEV_QS.get('stage'),
      round: DEV_QS.get('round'), mode: DEV_QS.get('mode'), diff: DEV_QS.get('diff'),
      starter: DEV_QS.get('starter'), seed: DEV_QS.get('seed'), upg: DEV_QS.get('upg'),
      real: DEV_QS.get('real'),
    });
  };
  const start = () => setTimeout(kick, 60);
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}
devMaybeAutoLaunch();

// ---- BALANCE REPORT — everything the stats layer recorded, as one
// serializable object. Works on any finished or in-progress run.
function devRunReport() {
  const rs = G.runStats || {};
  const levels = (rs.levels || []).map(L => ({ ...L }));
  const agg = (field) => levels.reduce((n, L) => n + (L[field] || 0), 0);
  const hitsBy = {};
  for (const L of levels) for (const k in (L.dmgInBy || {})) hitsBy[k] = (hitsBy[k] || 0) + L.dmgInBy[k];
  return {
    generated: new Date().toISOString(),
    build: 'wavebreaker-dev-report-v1',
    run: {
      mode: G.mode, preset: SETTINGS.preset, starter: G.starter || 'none',
      seed: G.runSeed, trial: G.trial, daily: G.daily, cheated: G.cheated,
      startLevel: G.runStartLevel, level: G.level, state: G.state,
      score: G.score, lives: G.lives + '/' + G.livesMax, playT: +G.playT.toFixed(1),
      ended: G.runSummary ? { cause: G.runSummary.cause, score: G.runSummary.score } : null,
      lastDamage: G.lastDamageCause,
    },
    totals: {
      kills: agg('kills'), damageTaken: rs.damageTaken || 0, hitsByFamily: hitsBy,
      shotsNormal: agg('shotsN'), shotsCharged: agg('shotsC'),
      chargeHits: agg('chargeHits'), chargeWasted: agg('chargeWasted'),
      dmgNormal: +agg('dmgN').toFixed(1), dmgCharge: +agg('dmgC').toFixed(1),
      dmgBall: +agg('dmgBall').toFixed(1), dmgSplash: +agg('dmgSplash').toFixed(1),
      dmgOther: +agg('dmgOther').toFixed(1),
      overheats: agg('overheats'), coolingTime: +agg('coolT').toFixed(1),
      absorbs: agg('absorbs'), deflects: agg('deflects'),
      knockouts: rs.knockouts || 0, megas: agg('megas'), rerolls: agg('rerolls'),
    },
    session: { restarts: SESSION_STATS.restarts, quits: SESSION_STATS.quits },
    upgrades: levels.flatMap(L => (L.upgrades || []).map(u => ({ afterLevel: L.lv, pick: u }))),
    levels,
  };
}

function devDownloadReport() {
  const data = JSON.stringify(devRunReport(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wavebreaker-run-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  return a.download;
}

// ---- BALANCE DASHBOARD — a DOM overlay (deliberately NOT canvas UI: it
// costs the game loop nothing, needs no hit-testing, and can't collide with
// the HUD). Toggle with F9 or DEV.panel(); refreshes twice a second while
// open. ?dev also shows a tiny corner badge that toggles it (touch access).
let devPanelEl = null, devPanelTimer = null;
function devPanelHtml() {
  const r = devRunReport();
  const esc = s => String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  const fams = Object.entries(r.totals.hitsByFamily).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([k, n]) => esc(k) + ' ×' + n).join('<br>') || '—';
  const lvls = r.levels.slice(-6).map(L =>
    '<tr><td>' + L.lv + (L.knockout ? ' ✖' : L.cleared ? ' ✓' : ' …') + '</td>'
    + '<td>' + L.t.toFixed(0) + 's</td>'
    + '<td>' + Object.values(L.dmgInBy).reduce((a, b) => a + b, 0) + '</td>'
    + '<td>' + L.shotsN + '/' + L.shotsC + '</td>'
    + '<td>' + (L.dmgN + L.dmgC > 0 ? Math.round(100 * L.dmgC / (L.dmgN + L.dmgC)) + '%' : '—') + '</td>'
    + '<td>' + L.overheats + '</td></tr>').join('');
  const t = r.totals;
  return '<b>BALANCE · ' + esc(r.run.mode) + ' · ' + esc(r.run.preset) + (r.run.seed ? ' · seed ' + esc(r.run.seed) : '') + '</b>'
    + '<div>lv ' + r.run.level + ' · score ' + r.run.score + ' · HP ' + esc(r.run.lives)
    + ' · ' + r.run.playT + 's · dmg taken ' + t.damageTaken
    + ' · KOs ' + t.knockouts + '</div>'
    + '<div>shots N/C ' + t.shotsNormal + '/' + t.shotsCharged
    + ' · charge waste ' + t.chargeWasted + ' · overheats ' + t.overheats
    + ' (' + t.coolingTime + 's locked) · mega ×' + t.megas + '</div>'
    + '<div>dmg out — bolt ' + t.dmgNormal + ' · charge ' + t.dmgCharge
    + ' · ball ' + t.dmgBall + ' · splash ' + t.dmgSplash + ' · other ' + t.dmgOther + '</div>'
    + '<div style="margin-top:4px"><b>hits by family</b><br>' + fams + '</div>'
    + '<table style="margin-top:4px;border-collapse:collapse" border="0" cellpadding="0">'
    + '<style>#dev-balance-panel th,#dev-balance-panel td{padding:0 7px 0 0;text-align:left}</style>'
    + '<tr><th>lv</th><th>time</th><th>hits</th><th>N/C</th><th>chg%</th><th>heat</th></tr>'
    + lvls + '</table>'
    + '<div style="margin-top:6px"><a href="#" id="dev-dl">⤓ download JSON</a> · '
    + (r.run.lastDamage ? 'last hit: ' + esc(r.run.lastDamage) : '') + '</div>';
}
function devTogglePanel(force) {
  const want = force != null ? force : !devPanelEl;
  if (!want) {
    if (devPanelTimer) clearInterval(devPanelTimer);
    if (devPanelEl) devPanelEl.remove();
    devPanelEl = null; devPanelTimer = null;
    return;
  }
  devPanelEl = document.createElement('div');
  devPanelEl.id = 'dev-balance-panel';
  devPanelEl.style.cssText = 'position:fixed;top:8px;left:8px;z-index:40;max-width:min(430px,92vw);'
    + 'max-height:86vh;overflow:auto;background:rgba(4,8,20,0.92);color:#cfe8ff;'
    + 'font:11px/1.5 Menlo,monospace;padding:10px 12px;border:1px solid #274;border-radius:8px;'
    + 'pointer-events:auto;cursor:auto';
  devPanelEl.addEventListener('click', e => {
    if (e.target && e.target.id === 'dev-dl') { e.preventDefault(); devDownloadReport(); }
  });
  document.body.appendChild(devPanelEl);
  const refresh = () => { if (devPanelEl) devPanelEl.innerHTML = devPanelHtml(); };
  refresh();
  devPanelTimer = setInterval(refresh, 500);
}
window.addEventListener('keydown', e => { if (e.code === 'F9') devTogglePanel(); });
if (DEV_MODE) {
  window.addEventListener('load', () => {
    const badge = document.createElement('div');
    badge.textContent = 'DEV';
    badge.style.cssText = 'position:fixed;bottom:6px;left:6px;z-index:41;background:#123;color:#8fd;'
      + 'font:bold 10px Menlo,monospace;padding:4px 8px;border-radius:6px;opacity:0.75;cursor:pointer';
    badge.addEventListener('click', () => devTogglePanel());
    document.body.appendChild(badge);
  });
}

// ---- console API. Everything a balance pass needs without touching the UI.
window.DEV = {
  launch: devLaunch,
  grant: devGrantBuild,
  boss(region = 1, round = 1, opts = {}) {
    return devLaunch({ region, stage: 3, round, ...opts });
  },
  report: devRunReport,
  // AFT-017 reference captures: every vessel family × 3 forms × LIGHT/DARK,
  // side by side, downloaded as one PNG contact sheet. Run it twice if PNG
  // overrides were still loading on the first pass (bakes cache per form).
  oathSheet(cell = 96) {
    const roster = SKIN.starterMon || {};
    const keys = Object.keys(roster).filter(k => roster[k] && roster[k].ids);
    const cols = 6; // I/II/III light · I/II/III dark
    const sheet = document.createElement('canvas');
    sheet.width = cols * cell + 140; sheet.height = keys.length * cell + 30;
    const q = sheet.getContext('2d');
    q.fillStyle = '#0a0f22'; q.fillRect(0, 0, sheet.width, sheet.height);
    q.font = '700 10px Orbitron, sans-serif'; q.textBaseline = 'middle';
    const savedAff = SETTINGS.affinity;
    try {
      keys.forEach((k, row) => {
        q.fillStyle = '#90a4ae';
        q.fillText(k.toUpperCase(), 6, 30 + row * cell + cell / 2);
        roster[k].ids.forEach((id, fi) => {
          for (const [ai, aff] of [[0, 'light'], [1, 'dark']]) {
            SETTINGS.affinity = aff;
            const img = affinityVesselSprite(id, true, false);
            if (img) q.drawImage(img, 140 + (ai * 3 + fi) * cell + 4, 30 + row * cell + 4, cell - 8, cell - 8);
          }
        });
      });
    } finally { SETTINGS.affinity = savedAff; }
    q.fillStyle = '#e3f2fd';
    ['LIGHT I', 'LIGHT II', 'LIGHT III', 'DARK I', 'DARK II', 'DARK III']
      .forEach((t, i) => q.fillText(t, 140 + i * cell + 8, 14));
    const a = document.createElement('a');
    a.download = 'oath-sheet.png'; a.href = sheet.toDataURL('image/png');
    a.click();
    return keys.length + ' families × 6 castings';
  },
  download: devDownloadReport,
  panel: devTogglePanel,
  perf() { // AFT-018: the profiler at a glance
    return { avgMs: +PERF.avg().toFixed(2), p95Ms: +PERF.p95().toFixed(2),
      level: effectsLevel(), load: +fxLoad().toFixed(3),
      counts: { particles: G.particles.length, rings: G.rings.length, fragments: G.fragments.length,
        ghosts: G.ghosts.length, floaters: G.floaters.length, shots: G.enemyShots.length, lasers: G.lasers.length } };
  },
  seed(s) { setRunSeed(s); return s; },
  levels() { return (G.runStats && G.runStats.levels) || []; },
  help() {
    console.log([
      'DEV.launch({level|region+stage, round, mode, diff, starter, seed, upg, real})',
      'DEV.boss(region 1-9, round 1-3, opts) — jump straight to a boss round',
      'DEV.grant("arsenal:3,aegis:2,vshred") — grant paths / web nodes / stacks',
      'DEV.report() — balance report object · DEV.download() — save as JSON',
      'DEV.panel() / F9 — live balance dashboard overlay',
      'DEV.levels() — per-level stat records',
      'URL: ?dev&level=3&round=1&mode=junkie&diff=normal&seed=S&upg=arsenal:3',
    ].join('\n'));
  },
};
if (DEV_MODE) console.log('[DEV] dev mode active — DEV.help() for commands');
