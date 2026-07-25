# CAMPAIGN MATRIX — TMP-L3

Generated 2026-07-25T01:43:22.983Z at `440b41960a` by `npm run baseline -- --label tmp-l3`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/matrix-tmp-l3.json`.

Determinism check (same seed, same bot, DEX-isolated): **FAIL** — null vs null

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | classic | yes | 119.2s | 4.89 | 70.0 | 0 | 4 |
| L3 | classic | yes | 90.2s | 4.89 | 50.3 | 0 | 4 |
| L3 | classic | yes | 116.6s | 4.89 | 70.0 | 0 | 4 |
| L3 | blaster | yes | 63.6s | 4.89 | 60.0 | 0 | 4 |
| L3 | blaster | yes | 40.6s | 4.89 | 70.0 | 0 | 5 |
| L3 | blaster | yes | 50.7s | 4.89 | 70.0 | 0 | 4 |
| L3 | junkie | yes | 49.6s | 2.96 | 114.0 | 0 | 4 |
| L3 | junkie | yes | 58.9s | 2.96 | 113.9 | 0 | 4 |
| L3 | junkie | yes | 81.9s | 2.96 | 114.0 | 0 | 5 |

## BUDGETS (AFT-021 — the approved bands)

**RED — 1 hard violation(s):**
- ✗ L3-blaster: mean 50.7s outside [55,120] (63.6/40.6/50.7)

## ANOMALIES

- DETERMINISM CHECK FAILED — totals diverged — investigate bot state derivation or a game-side leak

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
