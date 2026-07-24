# AFT-021 — POST-REMEDIATION CAMPAIGN MATRIX

Generated 2026-07-24T21:02:59.110Z at `3b52b47b7b` by `npm run baseline -- --label aft021`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/aft021-campaign.json`.

Determinism check (same seed, same bot, DEX-isolated): **PASS** — {"kills":26,"playTime":22,"dmgNormal":79.5} vs {"kills":26,"playTime":22,"dmgNormal":79.5}

## Finales — campaign sweep (junkie · normal · progressive build)

| stage | cleared | duration | boss equivalents | progress share | active-threat share | channels open/broken | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | yes | 161.4s | 6.17 | 99% | 100% | 2/0 | 1 |
| L6 | yes | 53.8s | 2.64 | 74% | 75% | 1/0 | 0 |
| L9 | yes | 158.8s | 1.76 | 97% | 97% | 1/1 | 0 |
| L12 | yes | 58.3s | 2.49 | 98% | 100% | 2/1 | 0 |
| L15 | yes | 93.0s | 2.42 | 100% | 100% | 1/1 | 0 |
| L18 | yes | 49.2s | 1.47 | 98% | 98% | 1/1 | 0 |
| L21 | yes | 57.1s | 1.10 | 98% | 98% | 1/1 | 0 |
| L24 | yes | 51.4s | 2.26 | 99% | 100% | 1/1 | 0 |
| L27 | yes | 56.4s | 2.34 | 98% | 98% | 2/1 | 0 |

## Non-boss stages — campaign sweep

| stage | cleared | duration | kills | dmg out | dmg out/s | progress share | heat lockout | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | yes | 22.3s | 18 | 46.0 | 2.1 | 92% | 20% | 0 |
| L2 | yes | 21.4s | 9 | 21.0 | 1.0 | 96% | 26% | 0 |
| L4 | yes | 40.2s | 20 | 63.0 | 1.6 | 98% | 0% | 0 |
| L5 | yes | 23.3s | 21 | 49.3 | 2.1 | 92% | 0% | 0 |
| L7 | yes | 23.3s | 24 | 78.1 | 3.4 | 92% | 0% | 0 |
| L8 | yes | 22.0s | 26 | 83.5 | 3.8 | 100% | 0% | 0 |
| L10 | yes | 22.4s | 57 | 164.9 | 7.4 | 100% | 0% | 0 |
| L11 | yes | 22.8s | 39 | 90.0 | 3.9 | 88% | 0% | 0 |
| L13 | yes | 28.7s | 43 | 133.8 | 4.7 | 91% | 0% | 0 |
| L14 | yes | 21.8s | 42 | 156.3 | 7.2 | 88% | 0% | 0 |
| L16 | yes | 24.6s | 47 | 259.2 | 10.5 | 89% | 0% | 0 |
| L17 | yes | 41.9s | 97 | 396.8 | 9.5 | 94% | 0% | 0 |
| L19 | yes | 42.8s | 45 | 342.5 | 8.0 | 94% | 0% | 0 |
| L20 | yes | 37.8s | 51 | 373.9 | 9.9 | 93% | 0% | 0 |
| L22 | yes | 28.0s | 55 | 463.1 | 16.5 | 90% | 0% | 0 |
| L23 | yes | 23.5s | 52 | 424.2 | 18.1 | 83% | 0% | 0 |
| L25 | yes | 22.1s | 53 | 634.2 | 28.7 | 88% | 0% | 0 |
| L26 | yes | 20.0s | 53 | 613.4 | 30.7 | 87% | 0% | 0 |

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | classic | yes | 129.2s | 4.89 | 70.0 | 0 | 4 |
| L3 | classic | yes | 158.3s | 4.89 | 59.0 | 0 | 4 |
| L3 | classic | yes | 130.4s | 4.89 | 60.0 | 0 | 4 |
| L3 | blaster | yes | 91.4s | 4.89 | 70.0 | 0 | 4 |
| L3 | blaster | yes | 67.1s | 4.89 | 70.0 | 0 | 4 |
| L3 | blaster | yes | 63.2s | 4.89 | 70.0 | 0 | 4 |
| L3 | junkie | yes | 62.5s | 3.08 | 106.1 | 0 | 4 |
| L3 | junkie | yes | 78.7s | 3.08 | 105.9 | 0 | 4 |
| L3 | junkie | yes | 60.4s | 3.08 | 106.0 | 0 | 4 |
| L6 | classic | yes | 74.6s | 3.41 | 48.4 | 0 | 4 |
| L6 | classic | yes | 81.7s | 3.41 | 42.2 | 0 | 4 |
| L6 | classic | yes | 71.8s | 3.41 | 40.6 | 0 | 4 |
| L6 | blaster | yes | 53.8s | 4.07 | 140.6 | 0 | 2 |
| L6 | blaster | yes | 63.2s | 4.07 | 126.1 | 0 | 4 |
| L6 | blaster | yes | 93.0s | 4.07 | 155.2 | 0 | 2 |
| L6 | junkie | yes | 64.9s | 2.64 | 102.9 | 0 | 2 |
| L6 | junkie | yes | 60.0s | 2.64 | 95.6 | 0 | 3 |
| L6 | junkie | yes | 65.4s | 2.64 | 112.0 | 0 | 3 |
| L9 | classic | yes | 52.3s | 2.62 | 103.4 | 0 | 4 |
| L9 | classic | yes | 103.3s | 2.62 | 109.1 | 0 | 5 |
| L9 | classic | yes | 89.5s | 2.62 | 106.5 | 0 | 4 |
| L9 | blaster | **no** (gameover) | 571.6s | 14.35 | 251.5 | 5 | 0 |
| L9 | blaster | yes | 40.2s | 2.39 | 66.0 | 0 | 2 |
| L9 | blaster | yes | 56.7s | 2.39 | 49.3 | 0 | 2 |
| L9 | junkie | yes | 105.0s | 1.76 | 137.2 | 0 | 2 |
| L9 | junkie | yes | 73.7s | 1.76 | 147.7 | 0 | 2 |
| L9 | junkie | yes | 52.1s | 1.76 | 167.9 | 0 | 4 |
| L12 | classic | yes | 185.6s | 3.28 | 244.4 | 0 | 4 |
| L12 | classic | yes | 102.3s | 3.28 | 214.9 | 0 | 5 |
| L12 | classic | yes | 184.6s | 3.28 | 219.1 | 0 | 4 |
| L12 | blaster | yes | 63.1s | 3.37 | 284.9 | 0 | 4 |
| L12 | blaster | yes | 63.9s | 3.37 | 267.3 | 0 | 5 |
| L12 | blaster | yes | 243.7s | 6.73 | 677.5 | 1 | 3 |
| L12 | junkie | yes | 60.4s | 2.49 | 291.4 | 0 | 5 |
| L12 | junkie | yes | 46.4s | 2.49 | 247.1 | 0 | 4 |
| L12 | junkie | yes | 71.0s | 2.49 | 203.5 | 0 | 5 |
| L15 | classic | yes | 296.2s | 2.94 | 305.0 | 0 | 2 |
| L15 | classic | yes | 107.5s | 2.94 | 328.4 | 0 | 4 |
| L15 | classic | yes | 227.9s | 2.94 | 314.3 | 0 | 2 |
| L15 | blaster | yes | 64.7s | 3.01 | 252.6 | 0 | 4 |
| L15 | blaster | yes | 159.4s | 6.01 | 456.7 | 1 | 1 |
| L15 | blaster | yes | 76.1s | 3.01 | 278.4 | 0 | 5 |
| L15 | junkie | yes | 54.7s | 2.42 | 334.3 | 0 | 3 |
| L15 | junkie | yes | 74.2s | 2.42 | 341.4 | 0 | 5 |
| L15 | junkie | yes | 82.3s | 2.42 | 354.5 | 0 | 4 |
| L18 | classic | yes | 88.3s | 1.87 | 578.9 | 0 | 5 |
| L18 | classic | yes | 74.6s | 1.87 | 536.7 | 0 | 5 |
| L18 | classic | yes | 366.7s | 1.87 | 544.7 | 0 | 4 |
| L18 | blaster | **no** (gameover) | 468.2s | 20.31 | 3657.3 | 10 | 0 |
| L18 | blaster | yes | 59.8s | 1.85 | 1171.7 | 0 | 5 |
| L18 | blaster | yes | 53.5s | 1.85 | 881.9 | 0 | 5 |
| L18 | junkie | yes | 41.2s | 1.47 | 349.0 | 0 | 5 |
| L18 | junkie | yes | 66.9s | 1.47 | 384.3 | 0 | 5 |
| L18 | junkie | yes | 59.2s | 1.47 | 378.9 | 0 | 5 |
| L21 | classic | yes | 161.4s | 1.19 | 1152.9 | 0 | 5 |
| L21 | classic | yes | 429.4s | 1.19 | 1175.3 | 0 | 5 |
| L21 | classic | yes | 236.5s | 1.19 | 1153.9 | 0 | 5 |
| L21 | blaster | yes | 55.6s | 1.19 | 1397.2 | 0 | 5 |
| L21 | blaster | yes | 54.0s | 1.19 | 1143.0 | 0 | 5 |
| L21 | blaster | yes | 56.1s | 1.19 | 1218.1 | 0 | 5 |
| L21 | junkie | yes | 64.9s | 1.10 | 1317.1 | 0 | 5 |
| L21 | junkie | yes | 31.8s | 1.10 | 1357.0 | 0 | 5 |
| L21 | junkie | yes | 56.3s | 1.10 | 1445.8 | 0 | 5 |
| L24 | classic | yes | 81.1s | 2.35 | 4620.2 | 0 | 5 |
| L24 | classic | yes | 100.3s | 2.35 | 3917.7 | 0 | 5 |
| L24 | classic | yes | 113.6s | 2.35 | 4454.1 | 0 | 5 |
| L24 | blaster | yes | 88.7s | 4.76 | 2654.6 | 1 | 5 |
| L24 | blaster | yes | 118.2s | 2.38 | 1860.5 | 0 | 2 |
| L24 | blaster | yes | 100.5s | 4.76 | 2722.7 | 1 | 5 |
| L24 | junkie | yes | 53.9s | 2.26 | 3449.8 | 0 | 5 |
| L24 | junkie | yes | 60.5s | 2.26 | 3313.9 | 0 | 5 |
| L24 | junkie | yes | 72.7s | 2.26 | 3192.4 | 0 | 5 |
| L27 | classic | yes | 118.9s | 2.47 | 1367.2 | 0 | 5 |
| L27 | classic | yes | 95.9s | 2.47 | 1401.2 | 0 | 5 |
| L27 | classic | yes | 129.5s | 2.47 | 1492.6 | 0 | 5 |
| L27 | blaster | yes | 64.0s | 2.47 | 1442.9 | 0 | 2 |
| L27 | blaster | yes | 85.4s | 2.47 | 1314.9 | 0 | 2 |
| L27 | blaster | yes | 113.7s | 4.94 | 2415.9 | 1 | 5 |
| L27 | junkie | yes | 82.9s | 2.34 | 1676.1 | 0 | 3 |
| L27 | junkie | yes | 60.0s | 2.34 | 1752.7 | 0 | 5 |
| L27 | junkie | yes | 413.4s | 9.34 | 6305.3 | 3 | 1 |

## Continuous run (real journey · junkie · normal · commit drafts)

- Outcome: **ended at level 6** (gameover) · sim 568.1s · play 547.5s
- Kills 144 · dmg out 688.3 · dmg taken 19 · knockouts 3 · megas 2 · overheats 70 (137.6s locked, 25%)
- Boss equivalents 17.04 · progress share 96% · active-threat share 95% · channels 3/0

### Drop families per act (top 8, % of act drops)

- **Act I (L1-9)** (13 drops): shield 46% · heal 23% · slow 15% · star 15%
- **Act II (L10-18)** (0 drops): none recorded
- **Act III (L19-27)** (0 drops): none recorded

### Draft economy — offers vs picks

- Offers (top 12 keys): prism ×5 · surge ×4 · impact ×3 · arsenal ×2 · aegis ×1 · bond ×1
- Picks (all, in order weight): surge:1 ×2 · prism:1 ×2 · prism:2 ×1
- 5 drafts offered · 5 picks taken · surge by source: {"kills":1.524,"momentum":0.976,"bossHits":0.436,"wasted":0.006}

## Vessel probes — region-5 finale (junkie · normal · arsenal:3,aegis:2)

| vessel | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| electric | yes | 57.5s | 326.2 | 5.7 | 0 | 0 | 0% |
| fighting | yes | 62.7s | 348.5 | 5.6 | 0 | 0 | 0% |
| ground | yes | 42.4s | 347.0 | 8.2 | 0 | 0 | 0% |
| poison | yes | 45.3s | 388.0 | 8.6 | 0 | 0 | 0% |
| dark | yes | 69.8s | 361.6 | 5.2 | 0 | 0 | 0% |
| fire | yes | 71.8s | 366.2 | 5.1 | 3 | 0 | 0% |
| none | yes | 59.6s | 370.9 | 6.2 | 1 | 0 | 0% |

Electric sustained dmg/s = 5.7 vs median other-vessel 5.6 (×1.02) — the intentionally OP pick, quantified.

## Path / web probes (shared seed per family — banked base identical, grant is the variable)

| probe | level | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout | charge share of dmg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| path-arsenal | L15 | yes | 73.0s | 361.0 | 4.9 | 0 | 0 | 0% | 10% |
| path-impact | L15 | yes | 64.4s | 358.9 | 5.6 | 0 | 0 | 3% | 11% |
| path-prism | L15 | yes | 53.8s | 322.2 | 6.0 | 0 | 0 | 4% | 6% |
| path-aegis | L15 | yes | 59.6s | 339.6 | 5.7 | 0 | 0 | 3% | 11% |
| path-surge | L15 | yes | 57.6s | 342.9 | 6.0 | 0 | 0 | 3% | 2% |
| path-bond | L15 | yes | 60.1s | 304.9 | 5.1 | 0 | 0 | 3% | 6% |
| fusion-meteor | L15 | yes | 60.8s | 356.8 | 5.9 | 0 | 0 | 0% | 19% |
| fusion-ascension | L15 | yes | 40.3s | 350.7 | 8.7 | 0 | 0 | 0% | 0% |
| fusion-immortal | L15 | yes | 62.6s | 319.7 | 5.1 | 0 | 0 | 3% | 7% |
| fusion-guardian | L15 | yes | 58.4s | 296.3 | 5.1 | 0 | 0 | 3% | 0% |
| apex-warmachine | L24 | yes | 129.7s | 4629.6 | 35.7 | 4 | 1 | 0% | 23% |
| apex-celestial | L24 | yes | 59.2s | 3219.5 | 54.4 | 0 | 0 | 0% | 15% |

## Difficulty probes — region-5 finale

| difficulty | cleared | duration | dmg taken | KOs | lives left | dmg out/s | heat lockout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | yes | 39.2s | 0 | 0 | 5 | 5.0 | 0% |
| easy | yes | 39.2s | 0 | 0 | 5 | 5.0 | 0% |
| normal | yes | 37.7s | 0 | 0 | 4 | 9.9 | 0% |
| normal | yes | 37.7s | 0 | 0 | 4 | 9.9 | 0% |
| hard | yes | 75.5s | 0 | 0 | 4 | 4.2 | 0% |
| hard | yes | 75.5s | 0 | 0 | 4 | 4.2 | 0% |
| nuzlocke | yes | 80.8s | 0 | 0 | 2 | 5.0 | 0% |
| nuzlocke | yes | 80.8s | 0 | 0 | 2 | 5.0 | 0% |

## Affinity probes — region-5 finale (satellite trios ×3)

| affinity | cleared | duration | dmg out | dmg taken | surge by source | shields by source |
| --- | --- | --- | --- | --- | --- | --- |
| light | yes | 81.5s | 349.8 | 0 | {"kills":0.286,"bossHits":0.432} | {"guard":1,"regen":2,"rescue":2} |
| dark | yes | 71.7s | 363.6 | 0 | {"kills":0.248,"tithe":0.459,"bossHits":0.38,"wasted":0.087} | {"guard":1,"regen":2,"rescue":3} |
| none | yes | 81.5s | 349.8 | 0 | {"kills":0.286,"bossHits":0.432} | {"guard":1,"regen":2,"rescue":2} |

## AEGIS economy — final gauntlet (aegis:4,arsenal:3)

- Cleared: yes in 167.8s
- Shields by source: {"guard":2,"regen":2,"rescue":5,"reactive":3}
- Lives by source: {"potion":1}
- Absorbs 12 · deflects 2 · dmg taken 7 · KOs 1

## BUDGETS (AFT-021 — the approved bands)

**GREEN — every hard budget holds.**

25 target-band warning(s):
- ⚠ B-finale-L9-blaster: blaster seed-outlier (gameover) — tolerated 1/2
- ⚠ B-finale-L18-blaster: blaster seed-outlier (gameover) — tolerated 2/2
- ⚠ A-sweep-J01: 22.3s outside the 25–50s target band
- ⚠ A-sweep-J02: 21.4s outside the 25–50s target band
- ⚠ A-sweep-J05: 23.3s outside the 25–50s target band
- ⚠ A-sweep-J07: 23.3s outside the 25–50s target band
- ⚠ A-sweep-J08: 22.0s outside the 25–50s target band
- ⚠ A-sweep-J10: 22.4s outside the 25–50s target band
- ⚠ A-sweep-J11: 22.8s outside the 25–50s target band
- ⚠ A-sweep-J14: 21.8s outside the 25–50s target band
- ⚠ A-sweep-J16: 24.6s outside the 25–50s target band
- ⚠ A-sweep-J23: 23.5s outside the 25–50s target band
- ⚠ A-sweep-J25: 22.1s outside the 25–50s target band
- ⚠ A-sweep-J26: 20.0s outside the 25–50s target band
- ⚠ L9-blaster: mean 56.7s outside the 60–95s target
- ⚠ L12-classic: mean 184.6s outside the 70–180s target
- ⚠ L15-classic: mean 227.9s outside the 70–180s target
- ⚠ L18-blaster: mean 59.8s outside the 60–95s target
- ⚠ L21-classic: mean 236.5s outside the 70–180s target
- ⚠ L21-blaster: mean 55.6s outside the 60–95s target
- ⚠ L24-blaster: mean 100.5s outside the 60–95s target
- ⚠ L12 mode-duration ratio ×1.70 (>1.6 target)
- ⚠ L15 mode-duration ratio ×1.71 (>1.6 target)
- ⚠ L21 mode-duration ratio ×2.36 (>1.6 target)
- ⚠ L24 mode-duration ratio ×1.80 (>1.6 target)

## ANOMALIES

- C-continuous-run: the real run ended in GAME OVER at level 6 (PSI HEAVY ATTACK) after 3 knockouts — with commit drafts the build never took the VOLLEY path and the gauntlet outpaced it. Data, not a harness failure.
- G-affinity-light is BIT-IDENTICAL to G-affinity-none on this wave: the LIGHT trio (dawn/halo/grace ×3) produced zero marginal sim effect in a short finale — halo's 25-kill shield can only land on the final kill, dawn's drop bonus flipped no roll, and no potion fed grace. The DARK trio measurably diverged. A real balance observation.
- A-sweep-J03: 1 knockout(s), build burned and wave retried
- B-finale-L9-blaster: did not clear (gameover, 577.7s sim, state gameover)
- B-finale-L9-blaster: 5 knockout(s), build burned and wave retried
- B-finale-L12-blaster-S3: 1 knockout(s), build burned and wave retried
- B-finale-L15-blaster-S2: 1 knockout(s), build burned and wave retried
- B-finale-L18-blaster: did not clear (gameover, 482.5s sim, state gameover)
- B-finale-L18-blaster: 10 knockout(s), build burned and wave retried
- B-finale-L24-blaster: 1 knockout(s), build burned and wave retried
- B-finale-L24-blaster-S3: 1 knockout(s), build burned and wave retried
- B-finale-L27-blaster-S3: 1 knockout(s), build burned and wave retried
- B-finale-L27-junkie-S3: 3 knockout(s), build burned and wave retried
- C-continuous-run: 3 knockout(s), build burned and wave retried
- E-apex-warmachine: 1 knockout(s), build burned and wave retried
- H-aegis-economy: 1 knockout(s), build burned and wave retried

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
