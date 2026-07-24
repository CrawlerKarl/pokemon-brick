# AFT-008 — REDESIGNED-CAMPAIGN CLOSEOUT MATRIX

Generated 2026-07-24T13:24:15.574Z at `7e7273f096` by `npm run baseline`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/aft008-redesigned-campaign.json`.

> Provenance corrected 2026-07-24 (AFT-021 Phase 0): this file measures the
> REDESIGNED campaign (post-AFT-020 finale formats + Section-9 corrections) —
> the generator used to stamp every run with the old-campaign title and JSON
> link. `tools/run-baseline.js` now takes `--label` and names its own output.

Determinism check (same seed, same bot, DEX-isolated): **PASS** — {"kills":37,"playTime":24,"dmgNormal":50.3} vs {"kills":37,"playTime":24,"dmgNormal":50.3}

## Finales — campaign sweep (junkie · normal · progressive build)

| stage | cleared | duration | boss equivalents | progress share | active-threat share | channels open/broken | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | yes | 84.6s | 3.24 | 90% | 98% | 1/0 | 0 |
| L6 | yes | 63.3s | 2.90 | 71% | 76% | 1/0 | 0 |
| L9 | yes | 51.7s | 2.17 | 86% | 94% | 1/0 | 0 |
| L12 | yes | 54.2s | 2.85 | 91% | 98% | 2/1 | 0 |
| L15 | yes | 52.3s | 2.90 | 100% | 100% | 1/0 | 0 |
| L18 | yes | 31.8s | 1.97 | 87% | 96% | 1/0 | 0 |
| L21 | yes | 20.1s | 2.98 | 82% | 91% | 1/0 | 0 |
| L24 | yes | 13.8s | 2.32 | 67% | 87% | 1/0 | 0 |
| L27 | yes | 27.2s | 2.97 | 96% | 100% | 2/0 | 0 |

## Non-boss stages — campaign sweep

| stage | cleared | duration | kills | dmg out | dmg out/s | progress share | heat lockout | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | yes | 25.6s | 17 | 36.0 | 1.4 | 93% | 23% | 0 |
| L2 | yes | 13.1s | 8 | 8.0 | 0.6 | 93% | 20% | 0 |
| L4 | yes | 36.5s | 20 | 52.0 | 1.4 | 98% | 0% | 0 |
| L5 | yes | 28.7s | 22 | 51.8 | 1.8 | 89% | 0% | 0 |
| L7 | yes | 25.2s | 24 | 67.4 | 2.7 | 93% | 0% | 0 |
| L8 | yes | 24.0s | 37 | 75.2 | 3.1 | 92% | 0% | 0 |
| L10 | yes | 22.9s | 52 | 139.1 | 6.1 | 98% | 0% | 0 |
| L11 | yes | 27.9s | 39 | 108.8 | 3.9 | 85% | 0% | 0 |
| L13 | yes | 36.9s | 43 | 157.4 | 4.3 | 93% | 0% | 0 |
| L14 | yes | 22.2s | 19 | 45.9 | 2.1 | 96% | 0% | 0 |
| L16 | yes | 21.9s | 49 | 225.3 | 10.3 | 87% | 0% | 0 |
| L17 | yes | 25.8s | 57 | 137.3 | 5.3 | 85% | 0% | 0 |
| L19 | yes | 38.0s | 46 | 207.2 | 5.5 | 91% | 0% | 0 |
| L20 | yes | 35.9s | 50 | 233.2 | 6.5 | 89% | 0% | 0 |
| L22 | yes | 23.6s | 55 | 272.3 | 11.5 | 81% | 0% | 0 |
| L23 | yes | 7.8s | 15 | 60.4 | 7.7 | 59% | 0% | 0 |
| L25 | yes | 18.1s | 52 | 323.8 | 17.9 | 73% | 0% | 0 |
| L26 | yes | 14.1s | 53 | 229.2 | 16.3 | 70% | 0% | 0 |

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | classic | yes | 321.2s | 7.05 | 177.0 | 0 | 3 |
| L3 | blaster | **no** (gameover) | 164.0s | 14.10 | 213.3 | 1 | 0 |
| L3 | junkie | yes | 61.2s | 3.24 | 99.0 | 0 | 4 |
| L12 | classic | yes | 220.5s | 5.15 | 176.1 | 0 | 1 |
| L12 | blaster | yes | 405.5s | 10.31 | 328.2 | 1 | 2 |
| L12 | junkie | yes | 56.9s | 2.85 | 133.6 | 0 | 5 |
| L21 | classic | yes | 50.6s | 4.44 | 258.0 | 0 | 5 |
| L21 | blaster | yes | 26.7s | 4.44 | 255.8 | 0 | 5 |
| L21 | junkie | yes | 17.7s | 2.98 | 160.6 | 0 | 5 |
| L27 | classic | yes | 37.3s | 4.32 | 338.7 | 0 | 5 |
| L27 | blaster | yes | 21.2s | 4.32 | 357.2 | 0 | 5 |
| L27 | junkie | yes | 31.5s | 2.97 | 157.9 | 0 | 5 |

## Continuous run (real journey · junkie · normal · commit drafts)

- Outcome: **campaign completed** (ending) · sim 1020.9s · play 982.8s
- Kills 876 · dmg out 4160.8 · dmg taken 9 · knockouts 0 · megas 26 · overheats 16 (32.3s locked, 3%)
- Boss equivalents 41.82 · progress share 89% · active-threat share 92% · channels 11/1

### Drop families per act (top 8, % of act drops)

- **Act I (L1-9)** (21 drops): shield 33% · star 24% · heal 19% · slow 14% · draco 10%
- **Act II (L10-18)** (35 drops): draco 26% · heal 20% · fire 17% · star 17% · laser 9% · wide 9% · shield 3%
- **Act III (L19-27)** (23 drops): draco 30% · wide 26% · laser 17% · shield 13% · star 9% · slow 4%

### Draft economy — offers vs picks

- Offers (top 12 keys): surge ×17 · arsenal ×13 · prism ×12 · impact ×11 · aegis ×11 · bond ×10 · singularity ×4 · reactive ×4 · rescue ×2 · salvage ×2 · calibrated ×1 · aurora ×1
- Picks (all, in order weight): prism:1 ×1 · arsenal:1 ×1 · impact:1 ×1 · aegis:1 ×1 · impact:2 ×1 · arsenal:2 ×1 · bond:1 ×1 · surge:1 ×1 · surge:2 ×1 · calibrated ×1 · arsenal:3 ×1 · aegis:2 ×1 · aurora ×1 · arsenal:4 ×1 · impact:3 ×1 · impact:4 ×1 · aegis:3 ×1 · aegis:4 ×1 · battery ×1 · meteor ×1 · rescue ×1 · prism:2 ×1 · surge:3 ×1 · prism:3 ×1 · surge:4 ×1 · bond:2 ×1
- 26 drafts offered · 26 picks taken · surge by source: {"kills":10.962,"prep":0.24,"bossHits":1.432,"wasted":0.509,"momentum":6.108,"aurora":8.085}

## Vessel probes — region-5 finale (junkie · normal · arsenal:3,aegis:2)

| vessel | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| electric | yes | 47.4s | 102.9 | 2.2 | 0 | 0 | 0% |
| fighting | yes | 48.7s | 97.9 | 2.0 | 0 | 0 | 0% |
| ground | yes | 38.6s | 77.5 | 2.0 | 0 | 0 | 0% |
| poison | yes | 105.6s | 132.0 | 1.3 | 0 | 0 | 0% |
| dark | yes | 67.9s | 101.9 | 1.5 | 0 | 0 | 0% |
| fire | yes | 61.1s | 91.6 | 1.5 | 1 | 0 | 0% |
| none | yes | 75.7s | 77.3 | 1.0 | 1 | 0 | 0% |

Electric sustained dmg/s = 2.2 vs median other-vessel 1.5 (×1.45) — the intentionally OP pick, quantified.

## Path / web probes (shared seed per family — banked base identical, grant is the variable)

| probe | level | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout | charge share of dmg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| path-arsenal | L15 | yes | 54.6s | 95.5 | 1.7 | 0 | 0 | 0% | 37% |
| path-impact | L15 | yes | 57.9s | 94.8 | 1.6 | 0 | 0 | 3% | 14% |
| path-prism | L15 | yes | 66.4s | 71.0 | 1.1 | 0 | 0 | 3% | 13% |
| path-aegis | L15 | yes | 154.0s | 65.9 | 0.4 | 0 | 0 | 5% | 0% |
| path-surge | L15 | yes | 131.0s | 71.5 | 0.5 | 0 | 0 | 5% | 0% |
| path-bond | L15 | yes | 40.6s | 100.9 | 2.5 | 0 | 0 | 5% | 0% |
| fusion-meteor | L15 | yes | 49.6s | 96.4 | 1.9 | 0 | 0 | 0% | 15% |
| fusion-ascension | L15 | yes | 53.4s | 68.7 | 1.3 | 0 | 0 | 0% | 0% |
| fusion-immortal | L15 | yes | 138.7s | 81.4 | 0.6 | 0 | 0 | 4% | 8% |
| fusion-guardian | L15 | yes | 40.6s | 100.1 | 2.5 | 0 | 0 | 5% | 0% |
| apex-warmachine | L24 | yes | 21.8s | 148.3 | 6.8 | 1 | 0 | 0% | 45% |
| apex-celestial | L24 | yes | 19.2s | 115.5 | 6.0 | 0 | 0 | 0% | 27% |

## Difficulty probes — region-5 finale

| difficulty | cleared | duration | dmg taken | KOs | lives left | dmg out/s | heat lockout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | yes | 26.8s | 0 | 0 | 5 | 1.8 | 0% |
| normal | yes | 52.6s | 0 | 0 | 4 | 1.7 | 0% |
| hard | yes | 54.7s | 0 | 0 | 4 | 1.7 | 0% |
| nuzlocke | yes | 56.4s | 0 | 0 | 2 | 1.4 | 0% |

## Affinity probes — region-5 finale (satellite trios ×3)

| affinity | cleared | duration | dmg out | dmg taken | surge by source | shields by source |
| --- | --- | --- | --- | --- | --- | --- |
| light | yes | 68.5s | 104.4 | 0 | {"kills":0.286,"bossHits":0.136} | {"guard":1,"regen":3,"rescue":4,"halo":1} |
| dark | yes | 48.5s | 89.0 | 0 | {"kills":0.286,"tithe":0.486,"bossHits":0.1} | {"guard":1,"regen":2,"rescue":2} |
| none | yes | 68.5s | 104.4 | 0 | {"kills":0.286,"bossHits":0.136} | {"guard":1,"regen":3,"rescue":4} |

## AEGIS economy — final gauntlet (aegis:4,arsenal:3)

- Cleared: yes in 35.9s
- Shields by source: {"guard":1,"regen":3,"reactive":1,"rescue":2}
- Lives by source: {}
- Absorbs 5 · deflects 0 · dmg taken 0 · KOs 0

## ANOMALIES

- B-finale-L3-blaster: did not clear (gameover, 166.1s sim, state gameover)
- B-finale-L3-blaster: 1 knockout(s), build burned and wave retried
- B-finale-L12-blaster: 1 knockout(s), build burned and wave retried

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
