# CAMPAIGN MATRIX — TMP-L21

Generated 2026-07-25T01:44:19.536Z at `440b41960a` by `npm run baseline -- --label tmp-l21`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/matrix-tmp-l21.json`.

Determinism check (same seed, same bot, DEX-isolated): **FAIL** — null vs null

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L21 | blaster | yes | 59.5s | 1.17 | 1418.8 | 0 | 5 |
| L21 | blaster | yes | 76.4s | 1.17 | 1376.9 | 0 | 5 |
| L21 | blaster | yes | 41.8s | 1.17 | 1475.7 | 0 | 5 |

## BUDGETS (AFT-021 — the approved bands)

**GREEN — every hard budget holds.**

1 target-band warning(s):
- ⚠ L21-blaster: mean 59.5s outside the 60–95s target

## ANOMALIES

- DETERMINISM CHECK FAILED — totals diverged — investigate bot state derivation or a game-side leak

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
