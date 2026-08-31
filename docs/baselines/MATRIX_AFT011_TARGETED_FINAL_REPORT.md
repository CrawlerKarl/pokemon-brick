# CAMPAIGN MATRIX — AFT011-TARGETED-FINAL

Generated 2026-08-30T09:19:32.722Z at `f98823d2c7` by `npm run baseline -- --label aft011-targeted-final`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/matrix-aft011-targeted-final.json`.

Determinism check (same seed, same bot, DEX-isolated): **SKIPPED (FILTERED RUN)** — null vs null

## Targeted outlier evidence

| cell | seed | cleared | duration | KOs | damage rate |
| --- | --- | --- | --- | --- | --- |
| H-late-J23-S1 | TARGET-LATE-23-0 | yes | 37.1s | 0 | 17.0 |
| H-late-J23-S2 | TARGET-LATE-23-1 | yes | 35.7s | 0 | 30.7 |
| H-late-J23-S3 | TARGET-LATE-23-2 | yes | 35.6s | 0 | 27.5 |
| H-late-J23-S4 | TARGET-LATE-23-3 | yes | 35.8s | 0 | 31.5 |
| H-late-J23-S5 | TARGET-LATE-23-4 | yes | 36.3s | 0 | 25.7 |
| H-late-J26-S1 | TARGET-LATE-26-0 | yes | 47.3s | 0 | 37.6 |
| H-late-J26-S2 | TARGET-LATE-26-1 | yes | 30.6s | 0 | 52.0 |
| H-late-J26-S3 | TARGET-LATE-26-2 | yes | 53.7s | 0 | 32.8 |
| H-late-J26-S4 | TARGET-LATE-26-3 | yes | 61.1s | 0 | 26.6 |
| H-late-J26-S5 | TARGET-LATE-26-4 | yes | 30.9s | 0 | 49.7 |
| H-rite-L21-S1 | TARGET-RITE-0 | yes | 71.6s | 0 | 20.3 |
| H-rite-L21-S2 | TARGET-RITE-1 | yes | 75.8s | 0 | 18.1 |
| H-rite-L21-S3 | TARGET-RITE-2 | yes | 77.2s | 0 | 22.3 |
| H-rite-L21-S4 | TARGET-RITE-3 | yes | 56.9s | 0 | 24.4 |
| H-rite-L21-S5 | TARGET-RITE-4 | yes | 63.4s | 0 | 22.7 |
| H-rite-L21-S6 | TARGET-RITE-5 | yes | 57.8s | 0 | 24.1 |
| H-rite-L21-S7 | TARGET-RITE-6 | yes | 78.8s | 0 | 17.3 |

## Path / web probes (shared seed per family — banked base identical, grant is the variable)

| probe | level | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout | charge share of dmg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| apex-warmachine | L24 | yes | 68.0s | 3748.9 | 55.1 | 4 | 1 | 0% | 18% |
| apex-warmachine-S2 | L24 | yes | 48.6s | 3638.6 | 74.9 | 0 | 0 | 0% | 21% |
| apex-warmachine-S3 | L24 | yes | 35.6s | 3253.5 | 91.4 | 0 | 0 | 0% | 12% |
| apex-warmachine-S4 | L24 | yes | 58.1s | 3631.9 | 62.5 | 0 | 0 | 0% | 28% |
| apex-warmachine-S5 | L24 | yes | 37.4s | 3450.3 | 92.3 | 0 | 0 | 0% | 16% |
| apex-warmachine-S6 | L24 | yes | 36.9s | 3222.5 | 87.3 | 0 | 0 | 0% | 19% |
| apex-warmachine-S7 | L24 | yes | 46.2s | 3949.4 | 85.5 | 1 | 0 | 0% | 20% |
| apex-celestial | L24 | yes | 48.2s | 3478.4 | 72.2 | 0 | 0 | 0% | 12% |
| apex-celestial-S2 | L24 | yes | 50.0s | 3858.2 | 77.2 | 0 | 0 | 0% | 20% |
| apex-celestial-S3 | L24 | yes | 236.8s | 7815.4 | 33.0 | 11 | 2 | 0% | 16% |
| apex-celestial-S4 | L24 | yes | 65.9s | 3143.4 | 47.7 | 0 | 0 | 0% | 15% |
| apex-celestial-S5 | L24 | yes | 62.3s | 3354.4 | 53.8 | 0 | 0 | 0% | 14% |
| apex-celestial-S6 | L24 | yes | 53.0s | 3445.0 | 65.0 | 0 | 0 | 0% | 16% |
| apex-celestial-S7 | L24 | yes | 52.8s | 3798.8 | 71.9 | 0 | 0 | 0% | 14% |

## AEGIS economy — final gauntlet (aegis:4,arsenal:3)

- Cleared: yes in 37.1s
- Shields by source: {"guard":1,"regen":2,"rescue":1}
- Lives by source: {}
- Absorbs 2 · deflects 0 · dmg taken 0 · KOs 0

## BUDGETS (AFT-021 — the approved bands)

**GREEN — every hard budget holds.**

## ANOMALIES

- E-apex-warmachine: 1 knockout(s), build burned and wave retried
- E-apex-celestial-S3: 2 knockout(s), build burned and wave retried

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
