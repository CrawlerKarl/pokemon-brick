# FUSION & APEX — the progression spine (three-level power system)

> **STATUS: EXECUTED (2026-07-18), first release.** SHIPPED: the full
> three-level system — 6 bridges (unchanged) → **15 Fusion powers** (the six
> shipped supers converted with stricter recipes + limiters, plus all nine
> cross-web pairs) → **2 Apex powers** (War Machine, Celestial Guardian).
> Acquisition rules, slot caps (2 Fusions / 1 Apex), offer & discovery
> rules, recursion guards, map presentation (silhouettes, selective
> connectors, fusion halo + apex ring), readiness hardware, and the seeded
> acquisition-rate suite are all live. DEFERRED (per this plan): Blackstar
> Bastion + Victory Armada (later expansion after balance data), route
> tracking's pity-guarantee, the discovery codex, per-phase boss target
> authoring (§encounter balance is tuning guidance, enforced only through
> the shipped limiters), and live selection-/win-rate telemetry.
> **Execution adjustments:** War Machine adds NO new control (the touch
> FIRE-pad contract is inviolable) — the fold is a pressure flow: basic hits
> bank Rail Pressure, a charge spends it (much cooler, cadence never
> resets); classic-mode charge-released Fusions fire on Mega activation
> instead (recipes force an offense path ≥3, so the sidearm is armed);
> Bestiary Chorus records element types (orbs + your live type at catches);
> "unfocused discovery 35–50%" was replaced by the enforceable pacing claim
> (unfocused discovery lands measurably LATER than a focused chase — a full
> 27-pick journey usually completes some recipe, which the 2-slot cap is
> designed to absorb).

## The three levels

1. **Bridge skill (Form II, midgame).** Unchanged: one node each side,
   one pick, a small two-system interaction. Teaches the combination.
2. **Fusion power (Final Form, late game).** `fusionEligible`: Form III +
   **3 ranks in BOTH paths** + **a capstone in EITHER** + the bridge
   (adjacent pairs only) + a free slot (**max 2 per run**). Never
   auto-granted: the node illuminates, takes strong offer priority, and
   still costs a pick.
3. **Apex power (endgame chase).** `apexEligible`: **stage 24+**, **two
   compatible installed Fusions**, **nine ranks** across its three paths,
   the single Apex slot, one pick. Apexes change flow/resources, never
   just numbers.

## The 15 Fusions (exactly one per unordered path pair)

Adjacent (bridge-backed — the converted supers, keys unchanged):
| Pair | Fusion | Rebalance shipped |
|---|---|---|
| V+I | Meteor Matrix | Rain gated on a FULL matrix built from lined-up hits (`G.matrixCharge`), never every charge |
| I+P | Event Horizon | Well damage hits each target ONCE per well; bosses take ×0.25; still erases ordinary fire |
| P+S | Elemental Ascension | Unchanged (already never extends Mega) |
| S+A | Immortal Reactor | Drains the whole meter AND stalls shield regrowth 6s |
| A+B | Guardian Angel | Meter 8, at most ONE pulse per wave |
| B+V | Ace Interceptor Wing | Documented low-DPS wingmates (patrol cadence) |

Cross-web (no bridge; same deep recipe):
| Pair | Fusion | Mechanic · limiter |
|---|---|---|
| V+P | Prismstorm Array | 12th hit primes a five-lane tuned volley · boss ≤1.25 volleys |
| V+S | Hypernova Cycle | Mega stream spins 3 cadence stages, echo bolts on intercepts · stage 3 heat ×1.5 |
| V+A | Bulwark Battery | Intercepts build a 3-segment hex wall; full wall → counterbeam · 12s rebuild floor |
| I+S | Cataclysm Core | Full charge consumes 50% banked Mega → screen nova · 20s CD, boss sliver, `noMega` |
| I+A | Aegis Lance | Full charge spends a REAL shield → unstoppable armor-breaking lance |
| I+B | Comet Shepherd | Pickups bank 3 comet seeds; release homes them · soft vs elites/bosses |
| P+A | Mirror Spectrum | Deflects + shield saves store 3 typed facets; release fires them back · reflections never re-charge |
| P+B | Bestiary Chorus | 3 distinct recorded types → favorable-type strike · once per wave |
| S+B | Victory Formation | Pickups fill Sync 8; Mega at full → 8s partner squadron · adds first |

## The 2 Apexes (Blackstar Bastion / Victory Armada deferred)

- **War Machine (V+I+S).** Basic hits bank Rail Pressure; a charge spends
  it — far cooler and the gatling cadence NEVER resets. One shared heat
  bar. Rig folds visibly at high pressure.
- **Celestial Guardian (P+A+B).** Type, shield and bond events fill three
  halo sectors; full → a typed ward: clears ordinary fire, cracks armor,
  restores ONE shield or ONE HP (never both), 4s favorable-type window.

## Structural safeguards (all enforced in code + suite)

- 2 Fusion slots, 1 Apex slot; only ONE fusion/apex per dealt hand.
- Proc source metadata: primed lanes/echoes/reflections excluded from hit
  meters; meteors can't call meteors; `meta.noMega` on fusion area damage;
  ward healing never charges the guardian pulse.
- Knockout regression SIMULATES each removal (`webBuildLegal`) — a burn
  can never break a recipe; grandfathered-illegal saves burn freely.
- Map: locked Fusions stay compact silhouettes until 2 ranks in both
  paths; connectors draw only for owned/offered/selected nodes; the halo
  (1.16r) and apex ring (1.3r) sit outside the capstone web.

## Validation shipped (test.html)

Graph integrity (15 pairs exactly once, apex compat sets, contract
fields), eligibility walks for every Fusion and Apex including both slot
caps, offer invariants (one-per-hand, cap exhaustion → satellites),
leaf-only knockout with recipe pinning, mechanics suites for all 15 + 2
with their limiters, and the seeded 40×27-draft acquisition sim
(focused ≥80% fusion-by-Galar; unfocused lands later; apex never pre-24).
Selection-rate / win-rate / damage-share targets (§validation) need live
telemetry — they remain tuning goals, not suite assertions.
