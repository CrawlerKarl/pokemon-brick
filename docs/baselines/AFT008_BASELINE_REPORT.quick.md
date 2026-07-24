# AFT-008 — OLD-CAMPAIGN BASELINE

Generated 2026-07-24T18:21:31.269Z at `6910fa6a5f` by `npm run baseline` (**--quick** — partial matrix).
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/aft008-old-campaign.quick.json`.

Determinism check (same seed, same bot, DEX-isolated): **PASS** — {"kills":36,"playTime":22,"dmgNormal":48.4} vs {"kills":36,"playTime":22,"dmgNormal":48.4}

## Finales — campaign sweep (junkie · normal · progressive build)

| stage | cleared | duration | boss equivalents | progress share | active-threat share | channels open/broken | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | yes | 77.0s | 3.24 | 99% | 100% | 1/0 | 0 |

## Non-boss stages — campaign sweep

| stage | cleared | duration | kills | dmg out | dmg out/s | progress share | heat lockout | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | yes | 25.6s | 17 | 36.0 | 1.4 | 93% | 23% | 0 |
| L8 | yes | 22.0s | 36 | 68.3 | 3.1 | 100% | 0% | 0 |

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | junkie | yes | 59.1s | 3.24 | 99.0 | 0 | 4 |

## ANOMALIES

- none — every scenario cleared with zero errors

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
