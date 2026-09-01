# CAMPAIGN MATRIX — AFT026-L6-PROBE

Generated 2026-09-01T16:13:33.773Z at `ab92ea9045` by `npm run baseline -- --label aft026-l6-probe`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/matrix-aft026-l6-probe.json`.

Determinism check (same seed, same bot, DEX-isolated): **SKIPPED (FILTERED RUN)** — null vs null

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L6 | classic | yes | 119.3s | 3.44 | 53.4 | 0 | 4 |
| L6 | classic | yes | 94.0s | 3.44 | 46.1 | 0 | 4 |
| L6 | classic | yes | 106.9s | 3.44 | 49.4 | 0 | 4 |
| L6 | blaster | yes | 56.0s | 3.92 | 170.3 | 0 | 4 |
| L6 | blaster | yes | 65.9s | 3.92 | 155.6 | 0 | 4 |
| L6 | blaster | yes | 62.8s | 3.92 | 178.3 | 0 | 4 |
| L6 | junkie | yes | 55.0s | 2.61 | 103.6 | 0 | 3 |
| L6 | junkie | yes | 51.4s | 2.61 | 113.2 | 0 | 4 |
| L6 | junkie | yes | 52.0s | 2.61 | 120.6 | 0 | 4 |

## BUDGETS (AFT-021 — the approved bands)

**GREEN — every hard budget holds.**

1 target-band warning(s):
- ⚠ L6-junkie: mean 52.0s outside the 60–100s target

## ANOMALIES

- none — every scenario cleared with zero errors

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
