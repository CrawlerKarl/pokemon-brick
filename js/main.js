'use strict';
// ============================================================
//  MAIN LOOP
// ============================================================
let lastT = performance.now();
function frame(now) {
  const rdt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  if (!W && window.innerWidth) { resize(); G.paddle.x = W / 2; } // recover from 0×0 load
  if (G.freeze > 0) { // hit-stop: render but don't simulate
    G.freeze -= rdt;
    render();
    requestAnimationFrame(frame);
    return;
  }
  update(rdt);
  render();
  requestAnimationFrame(frame);
}
resize();
G.paddle.x = W / 2;
requestAnimationFrame(frame);