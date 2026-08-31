# AFT-011 — Mobile loading, memory, and targeted balance closeout

Date: 2026-08-30

## Result

AFT-011 is implemented in the standalone Aetherfall package.

- The runtime art package fell from approximately 37 MB of PNGs to **10.3 MB**: **690 WebP files, zero PNG files**.
- Packaging encodes WebP directly from the validated production-pipeline masters; the review/source checkout remains PNG-based.
- Setup warms only visible vessel choices and the selected hero. Weapons load on demand behind their vector fallback.
- Stage entry loads the current realm first. The next realm starts after a 1.2-second quiet beat.
- Decoded sprite, preview, reveal, and vessel-treatment caches retain only the current realm, next realm, and the player's vessel line.
- A visible loading plate reports real per-bundle progress. It never blocks play and explicitly names the procedural fallback; failed files remain playable and are reported.
- `DEV.art()` exposes first-frame, stream, failure, decoded-art, cache-count, and JS-heap telemetry.

## Portrait phone profiles

The release gate performs cold reloads with cache bypass, touch emulation, portrait viewports, and CPU throttling. These are reproducible phone proxies on the development Mac, not physical-device process-RSS readings.

| profile | viewport | CPU slowdown | first canvas frame | decoded art at menu |
| --- | --- | ---: | ---: | ---: |
| compact / entry | 320 × 568 | 6× | 811 ms | 1.25 MB |
| current mid-range | 390 × 844 | 4× | 231 ms | 1.25 MB |
| large / flagship | 430 × 932 | 3× | 164 ms | 1.19 MB |

The same session launched all nine realm boundaries, forced each queued-next bundle to settle, and measured a **13.63 MB peak decoded-art estimate**. All three cold loads and all realm transitions completed with **zero art failures**.

The estimate counts decoded sprite canvases and loaded preview/reveal/weapon image dimensions. Physical iOS/Android validation should still record process memory, browser/WebView overhead, thermal state, and real network latency before store submission.

## Targeted balance cleanup

The permanent harness now uses seven seeds per apex and adds five-seed Level 23/26 cells plus seven Level 21 rite seeds. The consolidated result is in `docs/baselines/MATRIX_AFT011_TARGETED_FINAL_REPORT.md` and `docs/baselines/matrix-aft011-targeted-final.json`.

| target | before | after | change |
| --- | ---: | ---: | --- |
| Level 21 rite | about 26 s | **71.6 s median** (56.9–78.8 s) | rites awaken at 6, 23, and 40 seconds; no global HP change |
| War Machine vs Celestial | about 2–4% faster across expanded evidence | **12.8% faster** (46.2 s vs 53.0 s median) | War Machine weapon forms deal +15%; no enemy change |
| Level 23 ordinary stage | 22.3 s reference | **35.8 s median** (35.6–37.1 s) | authored undercard crowd clock slowed |
| Level 26 ordinary stage | 29.8 s reference | **47.3 s median** (30.6–61.1 s) | one extra sequential reinforcement flight; simultaneous density unchanged |

Level 24's Seraph raid was also cleared in a hands-on 390 × 844 portrait pass. Captain targeting, crown-segment progress, the freed mythic, the failing-weapon damage window, movement, and Surge were all usable. The screen is intentionally dense, but the encounter did not show evidence for a health/damage adjustment. No Seraph numbers changed; the campaign bot's targeting limitation remains classified as a harness limitation.

## Verification

- Full release gate: **green in 53 seconds**.
- Invariant suite: **129/129**.
- Mobile scene set: **56/56 screenshots**, fitted-label containment green.
- Standalone residue scan: clean.
- Artifact storms: wave 1.28 ms average; boss 0.59 ms average on the gate machine.

