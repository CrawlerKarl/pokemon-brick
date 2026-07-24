# AFT-008 — OLD-CAMPAIGN BASELINE

Generated 2026-07-24T19:02:20.701Z at `c2b4370e86` by `npm run baseline` (**--quick** — partial matrix).
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/aft008-old-campaign.quick.json`.

Determinism check (same seed, same bot, DEX-isolated): **PASS** — {"kills":38,"playTime":22,"dmgNormal":51.4} vs {"kills":38,"playTime":22,"dmgNormal":51.4}

## Finales — campaign sweep (junkie · normal · progressive build)

| stage | cleared | duration | boss equivalents | progress share | active-threat share | channels open/broken | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | yes | 76.6s | 3.24 | 99% | 100% | 1/0 | 0 |

## Non-boss stages — campaign sweep

| stage | cleared | duration | kills | dmg out | dmg out/s | progress share | heat lockout | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | yes | 25.6s | 17 | 36.0 | 1.4 | 93% | 23% | 0 |
| L8 | yes | 22.0s | 38 | 66.1 | 3.0 | 100% | 0% | 0 |

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | junkie | yes | 67.7s | 3.24 | 99.1 | 0 | 3 |

## BUDGETS (AFT-021 — the approved bands)

**RED — 3 hard violation(s):**
- ✗ A-sweep-J08: 3.0 shield charges earned (cap 2)
- ✗ A-sweep heat lockout 21% of play (>12%)
- ✗ A-sweep-J03: heat lockout 26% (>25%)

1 target-band warning(s):
- ⚠ A-sweep-J08: 22.0s outside the 25–50s target band

## ANOMALIES

- none — every scenario cleared with zero errors

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
