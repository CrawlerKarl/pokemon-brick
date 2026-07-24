# AFT-008 — OLD-CAMPAIGN BASELINE

Generated 2026-07-24T11:03:16.836Z at `17992d4cae` by `npm run baseline`.
Deterministic fixtures: seeded `DEV.launch` + a state-derived autopilot stepping `update(1/60)`.
Full per-scenario `DEV.report()` payloads: `docs/baselines/aft008-old-campaign.json`.

Determinism check (same seed, same bot, DEX-isolated): **PASS** — {"kills":42,"playTime":23.5,"dmgNormal":49.7} vs {"kills":42,"playTime":23.5,"dmgNormal":49.7}

## Finales — campaign sweep (junkie · normal · progressive build)

| stage | cleared | duration | boss equivalents | progress share | active-threat share | channels open/broken | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | yes | 62.7s | 3.24 | 97% | 100% | 2/0 | 0 |
| L6 | yes | 86.5s | 2.90 | 97% | 100% | 2/0 | 0 |
| L9 | yes | 61.3s | 2.98 | 97% | 100% | 2/0 | 0 |
| L12 | yes | 44.5s | 2.85 | 93% | 100% | 2/0 | 0 |
| L15 | yes | 51.1s | 2.90 | 95% | 100% | 2/0 | 0 |
| L18 | yes | 46.8s | 2.51 | 84% | 98% | 2/0 | 0 |
| L21 | yes | 28.3s | 2.98 | 76% | 95% | 2/0 | 0 |
| L24 | yes | 31.7s | 3.05 | 88% | 100% | 2/0 | 0 |
| L27 | yes | 30.9s | 2.97 | 84% | 100% | 2/0 | 0 |

## Non-boss stages — campaign sweep

| stage | cleared | duration | kills | dmg out | dmg out/s | progress share | heat lockout | KOs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | yes | 25.6s | 17 | 36.0 | 1.4 | 93% | 23% | 0 |
| L2 | yes | 45.1s | 18 | 37.0 | 0.8 | 96% | 27% | 0 |
| L4 | yes | 27.5s | 20 | 52.0 | 1.9 | 93% | 0% | 0 |
| L5 | yes | 19.6s | 22 | 43.4 | 2.2 | 91% | 0% | 0 |
| L7 | yes | 25.2s | 24 | 67.4 | 2.7 | 93% | 0% | 0 |
| L8 | yes | 23.5s | 42 | 68.0 | 2.9 | 94% | 0% | 0 |
| L10 | yes | 24.4s | 52 | 127.8 | 5.2 | 94% | 0% | 0 |
| L11 | yes | 28.0s | 39 | 107.7 | 3.8 | 90% | 0% | 0 |
| L13 | yes | 36.9s | 43 | 157.4 | 4.3 | 93% | 0% | 0 |
| L14 | yes | 22.3s | 42 | 183.1 | 8.2 | 78% | 0% | 0 |
| L16 | yes | 21.9s | 49 | 225.3 | 10.3 | 87% | 0% | 0 |
| L17 | yes | 24.4s | 61 | 170.2 | 7.0 | 90% | 0% | 0 |
| L19 | yes | 38.0s | 46 | 207.2 | 5.5 | 91% | 0% | 0 |
| L20 | yes | 29.0s | 49 | 217.5 | 7.5 | 91% | 0% | 0 |
| L22 | yes | 23.6s | 55 | 272.3 | 11.5 | 81% | 0% | 0 |
| L23 | yes | 22.8s | 56 | 247.7 | 10.9 | 69% | 0% | 0 |
| L25 | yes | 18.1s | 52 | 323.8 | 17.9 | 73% | 0% | 0 |
| L26 | yes | 13.3s | 53 | 293.1 | 22.0 | 74% | 0% | 0 |

## Finales by mode

| finale | mode | cleared | duration | boss equivalents | dmg out | KOs | lives left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L3 | classic | **no** (simcap) | 593.9s | 14.10 | 256.1 | 1 | 4 |
| L3 | blaster | **no** (gameover) | 164.0s | 14.10 | 213.3 | 1 | 0 |
| L3 | junkie | yes | 182.5s | 6.48 | 191.8 | 1 | 3 |
| L12 | classic | yes | 123.6s | 5.15 | 219.2 | 0 | 4 |
| L12 | blaster | yes | 68.6s | 5.15 | 181.1 | 0 | 2 |
| L12 | junkie | yes | 68.6s | 2.85 | 211.0 | 0 | 6 |
| L21 | classic | yes | 73.1s | 4.44 | 360.6 | 0 | 6 |
| L21 | blaster | yes | 27.4s | 4.44 | 341.1 | 0 | 6 |
| L21 | junkie | yes | 25.3s | 2.98 | 265.9 | 0 | 6 |
| L27 | classic | yes | 84.0s | 4.32 | 411.5 | 0 | 6 |
| L27 | blaster | yes | 31.9s | 4.32 | 411.2 | 0 | 6 |
| L27 | junkie | yes | 31.7s | 2.97 | 285.9 | 0 | 6 |

## Continuous run (real journey · junkie · normal · commit drafts)

- Outcome: **ended at level 15** (gameover) · sim 1581.7s · play 1542.8s
- Kills 511 · dmg out 3204.7 · dmg taken 51 · knockouts 7 · megas 9 · overheats 215 (425.1s locked, 28%)
- Boss equivalents 43.64 · progress share 96% · active-threat share 98% · channels 12/2

### Drop families per act (top 8, % of act drops)

- **Act I (L1-9)** (27 drops): shield 41% · slow 19% · draco 19% · heal 11% · wide 7% · star 4%
- **Act II (L10-18)** (48 drops): wide 35% · heal 35% · draco 19% · fire 4% · laser 4% · shield 2%
- **Act III (L19-27)** (0 drops): none recorded

### Draft economy — offers vs picks

- Offers (top 12 keys): impact ×13 · aegis ×9 · arsenal ×5 · prism ×4 · surge ×4 · singularity ×3 · bond ×2 · aurora ×1 · reactive ×1
- Picks (all, in order weight): aegis:3 ×2 · prism:1 ×1 · prism:2 ×1 · prism:3 ×1 · prism:4 ×1 · surge:1 ×1 · impact:1 ×1 · aegis:1 ×1 · aegis:2 ×1 · aurora ×1 · reactive ×1 · impact:2 ×1 · impact:3 ×1
- 14 drafts offered · 14 picks taken · surge by source: {"kills":4.9,"bossHits":1.54,"wasted":0.13,"momentum":2.34,"aurora":0.57,"reactive":0.3}

## Vessel probes — region-5 finale (junkie · normal · arsenal:3,aegis:2)

| vessel | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| electric | yes | 32.7s | 173.2 | 5.3 | 0 | 0 | 0% |
| fighting | yes | 41.7s | 195.4 | 4.7 | 0 | 0 | 0% |
| ground | yes | 33.1s | 197.0 | 6.0 | 0 | 0 | 0% |
| poison | yes | 61.5s | 251.0 | 4.1 | 0 | 0 | 0% |
| dark | yes | 44.3s | 181.8 | 4.1 | 0 | 0 | 0% |
| fire | yes | 75.1s | 206.5 | 2.7 | 3 | 0 | 0% |
| none | yes | 51.2s | 214.5 | 4.2 | 1 | 0 | 0% |

Electric sustained dmg/s = 5.3 vs median other-vessel 4.1 (×1.29) — the intentionally OP pick, quantified.

## Path / web probes (shared seed per family — banked base identical, grant is the variable)

| probe | level | cleared | duration | dmg out | dmg out/s | dmg taken | KOs | heat lockout | charge share of dmg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| path-arsenal | L15 | yes | 48.5s | 196.2 | 4.0 | 0 | 0 | 0% | 23% |
| path-impact | L15 | yes | 75.8s | 177.5 | 2.3 | 0 | 0 | 5% | 11% |
| path-prism | L15 | yes | 65.6s | 149.5 | 2.3 | 0 | 0 | 6% | 5% |
| path-aegis | L15 | yes | 97.3s | 167.0 | 1.7 | 0 | 0 | 4% | 6% |
| path-surge | L15 | yes | 73.7s | 195.3 | 2.6 | 0 | 0 | 3% | 5% |
| path-bond | L15 | yes | 51.0s | 174.5 | 3.4 | 0 | 0 | 4% | 0% |
| fusion-meteor | L15 | yes | 42.9s | 220.7 | 5.1 | 0 | 0 | 0% | 17% |
| fusion-ascension | L15 | yes | 49.5s | 168.2 | 3.4 | 0 | 0 | 0% | 3% |
| fusion-immortal | L15 | yes | 73.7s | 195.3 | 2.6 | 0 | 0 | 3% | 5% |
| fusion-guardian | L15 | yes | 53.5s | 176.2 | 3.3 | 0 | 0 | 4% | 0% |
| apex-warmachine | L24 | yes | 40.7s | 344.7 | 8.5 | 0 | 0 | 0% | 13% |
| apex-celestial | L24 | yes | 37.5s | 296.2 | 7.9 | 0 | 0 | 0% | 22% |

## Difficulty probes — region-5 finale

| difficulty | cleared | duration | dmg taken | KOs | lives left | dmg out/s | heat lockout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | yes | 36.0s | 0 | 0 | 5 | 2.4 | 0% |
| normal | yes | 123.7s | 6 | 1 | 2 | 3.4 | 0% |
| hard | yes | 55.9s | 0 | 0 | 5 | 3.6 | 0% |
| nuzlocke | yes | 89.0s | 0 | 0 | 3 | 3.2 | 0% |

## Affinity probes — region-5 finale (satellite trios ×3)

| affinity | cleared | duration | dmg out | dmg taken | surge by source | shields by source |
| --- | --- | --- | --- | --- | --- | --- |
| light | yes | 63.1s | 201.5 | 0 | {"kills":0.424,"bossHits":0.276} | {"guard":1,"regen":3,"rescue":3} |
| dark | yes | 41.7s | 217.4 | 0 | {"kills":0.304,"tithe":0.648,"bossHits":0.228,"wasted":0.144} | {"guard":1,"regen":2,"rescue":2,"drop":1} |
| none | yes | 63.1s | 201.5 | 0 | {"kills":0.424,"bossHits":0.276} | {"guard":1,"regen":3,"rescue":3} |

## AEGIS economy — final gauntlet (aegis:4,arsenal:3)

- Cleared: yes in 40.5s
- Shields by source: {"guard":1,"regen":2,"rescue":2}
- Lives by source: {"aegisX":1}
- Absorbs 0 · deflects 0 · dmg taken 0 · KOs 0

## ANOMALIES

- C-continuous-run: the real run ended in GAME OVER at level 15 (STORM HEAVY ATTACK) after 7 knockouts — with commit drafts the build never took the VOLLEY path and the gauntlet outpaced it. Data, not a harness failure.
- G-affinity-light is BIT-IDENTICAL to G-affinity-none on this wave: the LIGHT trio (dawn/halo/grace ×3) produced zero marginal sim effect in a short finale — halo's 25-kill shield can only land on the final kill, dawn's drop bonus flipped no roll, and no potion fed grace. The DARK trio measurably diverged. A real balance observation.
- B-finale-L3-classic: did not clear (simcap, 600.0s sim, state play)
- B-finale-L3-classic: 1 knockout(s), build burned and wave retried
- B-finale-L3-blaster: did not clear (gameover, 166.1s sim, state gameover)
- B-finale-L3-blaster: 1 knockout(s), build burned and wave retried
- B-finale-L3-junkie: 1 knockout(s), build burned and wave retried
- C-continuous-run: 7 knockout(s), build burned and wave retried
- F-diff-normal: 1 knockout(s), build burned and wave retried

## Harness normalizations & known leaks

- `G.time = 0` after every launch: `resetRun` does not reset the page-lifetime clock, and boss volley geometry reads it (`update.js` — `rot = G.time * 0.7`; `const a = G.time + i * ...`), so cross-launch reproducibility requires normalizing it. This is a genuine game-side determinism leak (RNG stream is seeded and clean; shot GEOMETRY drifts with page age) — documented here rather than patched.
- Hit-stop frames (`G.freeze`) are zeroed each bot frame (run-suite storm convention): sim time excludes hit-stop.
- Trial launches auto-bank one seeded upgrade per level travelled; probe grants land on top. Families needing marginal comparisons (E, G) share one seed so the banked base is identical; each scenario's `buildAtStart` in the JSON records the full starting build.
- The determinism pair snapshots/restores DEX/DEXS: catch-ball drops branch on `!DEX.has(id)`.
- Affinity satellite stacks are granted by direct `G.stacks` writes (DEV.grant only routes the base orb/ice/bell trio; `AFFINITY_SATELLITES` is outside its `WEB_SATELLITES` lookup).
