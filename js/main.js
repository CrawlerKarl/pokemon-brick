'use strict';
// ============================================================
//  MAIN LOOP
// ============================================================
let lastT = performance.now();
let booted = false;
function frame(now) {
  const cadenceMs = now - lastT;
  const rdt = Math.min(0.033, cadenceMs / 1000);
  lastT = now;
  // ---- BOOTSTRAP: never simulate or render until the viewport is real and
  // the vignette/starfield exist. A 0×0 load, a mid-parse resize event, or a
  // rotate can all leave them unset — keep retrying instead of crashing.
  if (!W || !H || !vignette) {
    resize();
    if (W && H && vignette && !booted) { booted = true; G.paddle.x = W / 2; }
    requestAnimationFrame(frame);
    return;
  }
  if (!booted) { booted = true; G.paddle.x = G.paddle.x || W / 2; }
  if (G.freeze > 0) { // hit-stop: render but don't simulate
    G.freeze -= rdt;
    const tR = performance.now();
    render();
    AETHER_ART_STREAM.markFirstPaint();
    // Phase transitions are some of the densest boss frames. Profiling only
    // normal simulation frames hid their GPU pressure from AUTO effects.
    PERF.push(0, performance.now() - tR, cadenceMs);
    requestAnimationFrame(frame);
    return;
  }
  const tU = performance.now();
  update(rdt);
  const tR = performance.now();
  render();
  AETHER_ART_STREAM.markFirstPaint();
  PERF.push(tR - tU, performance.now() - tR, cadenceMs); // work + real FPS
  requestAnimationFrame(frame);
}
resize(); // every module is parsed by now — the real init
requestAnimationFrame(frame);

// AFT-015: installable + offline. The worker NEVER registers under the gate,
// dev launches, the test/gallery pages, automation, or localhost — unless the
// URL carries `sw` (the manual-testing escape hatch). Relative path: the game
// is served from a GitHub Pages sub-path.
(function registerServiceWorker() {
  try {
    if (typeof navigator === 'undefined' || typeof location === 'undefined' || !('serviceWorker' in navigator)) return;
    const q = new URLSearchParams(location.search);
    const forced = q.has('sw');
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (q.has('dev') || /(^|\/)(test|gallery)\.html$/.test(location.pathname)) return;
    if (!forced && (window.__SUITE || navigator.webdriver)) return;
    if (local && !forced) return;
    const go = () => navigator.serviceWorker.register('sw.js').catch(() => {});
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  } catch (e) { /* the worker is an enhancement, never a dependency */ }
})();
