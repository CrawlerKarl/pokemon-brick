# Space Junkie Motion Plan V2 — Rigid Bodies, Living Slots

> **STATUS: EXECUTED (2026-07-15).** All five steps shipped, plus the
> sentinel-trio redesign (three cycling formations + typed specials).
> Notable deviations found during implementation: anchor patrol must share
> ONE phase across squads (concentric rings drift apart otherwise); frozen
> `lane` slots need `ry × 0.28` (sine scatter reads as a ragged band);
> concentric families startle with a SPIN because a scatter-swollen inner
> ring collides with its outer; the solver returns as a safety net only
> while a maneuver runs.

## Goal

Make every Space Junkie wave read like the 1997 original and its Galaga
ancestry: a **clean, crisp formation** you can parse in a single frame, that
is **never still** — it breathes, it assembles itself out of swooping
entrance trains, and individual attackers constantly come and go "like bees
from a hive." Kill the current failure mode: squads rushing in on straight
lines and then swirling as an amorphous mass.

## What the reference actually does (research, 2026-07-15)

Sources: MobyGames + Macintosh Garden + Internet Archive listings for Space
Junkie (Pointware, 1995/97); direct frame sampling of the Top Retro Games
longplay (youtube.com/watch?v=ZVnzcvUOlKg); Galaga 30th-anniversary interview
(shmuplations.com/galaga) and retrogamedeconstructionzone.com's
Galaxian→Galaga analysis.

- **Space Junkie holds SHAPES, not grids**: waves park as wide arcs/domes or
  ragged diagonal clusters in the **upper third** of the screen. In sampled
  footage the body does NOT race side to side; the shape itself is the
  identity. Fire is heavy, simultaneous, and downward. Each wave "behaves
  differently."
- **Galaga's aliveness** is three things, none of which is body speed:
  1. **Staggered curved entrance trains** — small groups swoop in along
     S-curves and *assemble* the formation (a deliberate departure from
     Galaxian's instant grid).
  2. **The held formation "throbs like a living thing"** — a breathing
     expand/contract pulse, not a static block and not a wandering blob.
  3. **Fliers come and go continuously** — individual peel-off dives on
     curved, player-tracking paths that **loop back to their slot**, so the
     silhouette persists while something is always in flight.

## Why our current build reads as "rush in, then blob" (code diagnosis)

1. **Entries are straight and fast.** Member ingress is a 1.5s eased LINE
   from an off-screen point to the slot (`F.inDelay/inDx/inDy`, update.js
   flight loop). No curve, no train identity, no settle beat.
2. **Hold state is built on CIRCULATION.** Most families (`ring`, `oval`,
   `diamond`, `carousel`, `nestedCarousel`, `binaryMoons`, `eclipse`,
   `fountain`) advance each rider's phase around a closed curve — riders
   orbit *inside* the silhouette. At the current 2.1× clocks this is a
   swirl, not a formation.
3. **The anchor patrol amplified the swirl.** The ~10%-of-W anchor sway
   (encounter controller) moves an already-churning mass — more motion,
   less legibility. Speed was added to the wrong layer.
4. **Eased separation offsets deform the silhouette.** `sepX/sepY`
   (update.js solver) constantly nudge riders off their true slots and
   drain back over ~0.4s — visible dough-like wobble.
5. **Idle bob phases are random per mon** (`br.wobble`), so a clean rank
   shimmers like noise (the V1 handoff explicitly warned about this).

## The model: RIGID BODY, LIVING SLOTS

Hold-state position becomes:

```
pos(member) = anchor(t)                       // the ONLY translator
            + slot[i] * breath(t)             // fixed local offset, breathing
            + bobSync(t, squadPhase, i)       // small squad-synced idle
```

- **`slot[i]` is FIXED at build** per family: arc positions, chevron V,
  echelon ranks, ring positions, lattice points. No per-rider phase advance
  in hold. Circulation survives only in explicitly rotary families
  (`carousel`, `nestedCarousel`, `binaryMoons`) at a capped ≤0.03 rev/s.
- **`breath(t)`** = slot scale `1 ± 0.05` at ~0.22 Hz, squad-synced — the
  Galaga throb. Morph verbs (breathe/relay/bloom/eclipse/orbit/blend) keep
  operating on the slot frame exactly as today.
- **`anchor(t)`** = slow patrol, **smaller than current**: lateral sine
  12–16% of W with eased turnarounds, period 7–9s, plus a 3–4px vertical
  breath. Multi-squad waves offset patrol phases so bodies interleave
  without crossing.
- **Separation solver: bypassed for settled slot members.** Slot spacing is
  guaranteed at build (the capacity cap already exists), so the solver runs
  only for divers/entering riders as a safety net. This deletes failure
  mode 4 outright — and deaths already leave honest Galaga gaps.
- **Idle bob**: `wobble` becomes `squadPhase + i * 0.35` for choreo members
  (tiny per-member offset, one squad clock). Amplitude stays small.

## Entrances: swooping trains (the assembly IS the show)

Replace the linear ingress with an authored **3-point spline train** per
squad:

1. **Ingress (2.5–3.5s)**: enter from a top corner, sweep down across
   mid-screen (heading change ≥ 60°), curve back up toward the formation's
   side. Riders follow nose-to-tail with 0.22s headway. Firing stays live
   from the moment a rider is on screen (already wired: `enemyShotCD = 0.9`).
2. **Peel + settle (last ~25% of each rider's run)**: blend from the spline
   onto the slot with ~8% overshoot and a 250ms spring settle — no pop,
   no landing.
3. Squads stagger 0.8–1.0s; mirrored entry sides per squad (existing
   `mirror` variety knob).

Implementation: `entrySpline` control points stored on
`G.encounter.squads[s]`; rider parameter `p_j = (E.t − j·0.22) / dur`;
`flight.entering` flag and test/solver exclusions carry over unchanged.

## Bees from the hive: continuous comings and goings

- Keep ONE attack group at a time (two from Galar), but bias the dive's
  mid-flight control point toward the player's **live** x (Galaga's
  butterfly veer) instead of only the launch-time snapshot.
- Divers already loop home; keep that — returning to the slot is what keeps
  the silhouette legible.
- Optional polish (Galaga's fire-discipline nod): when a squad's elite dies,
  that squad's fire falls silent for ~1.5s.

## What does NOT change

- `JUNKIE_CHOREO` stays the authored source of truth — families are
  *reinterpreted* as slot lattices, table untouched except tuning.
- Classic/blaster breakout flyers, boss gauntlet, wing guards, maneuvers,
  shell armor, ROCK TOMB barriers: untouched.
- Sprite kinematics (dt-smoothed, species profiles) already fit this model.

## Acceptance criteria

- **Crisp**: zero solver corrections and zero in-squad visual crossings in
  hold; the family silhouette is identifiable in any single frame.
- **Alive**: breathing visible (±5% scale @ ~0.22 Hz); anchor covers
  12–16% of W per period; at least one rider in transit (entering, diving,
  or recovering) ≥ 60% of the time after wave start.
- **Entrance**: train visible ≥ 2.5s with real curvature; ≥ half the squad
  fires before settling; settle overshoot ≤ 8%, no single-frame pop.
- **Tests**: hold-state blob budget tightens to 0 (entries/divers excluded
  as today); add a train-curvature check and a "solver dormant in hold"
  assertion; 60/120 Hz parity retained.

## Implementation order (one session)

1. `slotPos()` + hold-state rewrite in the flight loop for choreo members;
   solver bypass for settled slots. (The crispness win — do first.)
2. Entrance splines replacing the linear ingress.
3. Anchor patrol retune (smaller/slower, eased turnarounds) + breathing +
   squad-synced bob.
4. Dive player-tracking bias; optional fire discipline.
5. Retune all 18 table entries against the acceptance criteria; update the
   invariant suite; screenshot each act's arrival + challenge.
