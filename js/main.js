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
  PERF.push(tR - tU, performance.now() - tR, cadenceMs); // work + real FPS
  requestAnimationFrame(frame);
}
resize(); // every module is parsed by now — the real init
requestAnimationFrame(frame);
