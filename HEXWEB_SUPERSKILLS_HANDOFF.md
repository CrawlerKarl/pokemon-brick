# HANDOFF — Hex-Web & Superskills Expansion

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

Implement the branching upgrade web and final-form superskills described in
`STARFIGHTER_UPGRADE_WEB_REDESIGN_PLAN.md` (§4 topology, §6 Form II bridge
synergies, §7 superskills, §8 repeatable mastery, §10 offer algorithm, plus
the visual contract in §9). This is an implementation task, not another
planning exercise.

Start by reading these completely:

- `CLAUDE.md` — workflow + invariants (do not regress anything listed there)
- `README.md` — file map, systems tour, gotchas
- `STARFIGHTER_UPGRADE_WEB_REDESIGN_PLAN.md` — the design source of truth;
  its status header says exactly what already shipped

## What already exists — do NOT rebuild it

- **The constellation choice surface** (`upgradeTreeLayout` in input.js;
  `drawFullUpgradeTree` / `drawTreeDetail` / `constellationHex` in render.js):
  six spokes × four rings mapping the current 24 save-compatible tiers,
  numbered glowing offers, owned/offered/selected/reachable/locked states,
  keyboard + touch + mouse, responsive at desktop / 390×844 / 844×390, a
  PATH PROGRESS strip in the wide detail panel, capstone chips that tuck
  centre-side, and an install animation (`beginUpgradeInstallFx`,
  `drawUpgradeInstallFx`).
- **The complete visual-tell layer**: all 24 tiers have persistent pilot
  hardware (`drawPilotUpgradeHardware`, composable slot comments in
  render.js) and either a proc tell or a documented reason not to
  (continuous passives). The wing hardpoint dock shows path/stack counts.
- **Draft plumbing**: `rollUpgradeChoices` (build-biased scoring already
  favours invested paths and defensive need), `pickUpgrade`, reroll,
  `choiceIndexForTreeNode`, `syncTreeSelectionToDraft`, STACK_ITEMS
  overflow after caps, secret Rift drafts (`G.secret.rewardDraft`).
- **Campaign frame**: stage 27 ends in THE NINEFOLD DAWN
  (`beginEnding`/`drawEnding`, state 'ending'); New Game+ is the explicit
  TIME SPIRAL (`beginTimeSpiral`, level 28+). Victory records persist in
  `pkbrk-victory`. Superskills should hook this frame, not replace it.

## Hard constraints

- Internal keys are STORAGE-STABLE: `classic`/`blaster`/`junkie` mode keys,
  path keys, tier keys, `pkbrk-*` storage names. New node ids must be
  additive. If the save schema for `G.path`/`G.upg`/`RUN_CKPT` (currently
  v2) must change, write an explicit migration that accepts v1/v2
  checkpoints and never bricks startup (storage access ONLY via
  `loadStore`/`saveStore`).
- Every node must stay live in ALL THREE modes (use the `sdesc`/mode-copy
  pattern in data.js; shields absorb-on-player, Momentum/Rally blaster
  wiring, hurtbox never widens).
- The §9 visual contract is law: a node is not content-complete without a
  persistent tell and a proc tell, written to the named rig slots — never a
  new orbiting ring around the pilot.
- Perf: no per-entity per-frame gradients/shadowBlur in hot loops; bake
  repeated art into the existing sprite caches. Respect `reduceFlash` /
  `reduceShake`. Balance: Scenic→One Life difficulty adapts by timing and
  telegraphs, not raw stat bloat.
- Preserve uncommitted user changes (`git status` first). Commit + push +
  Pages deploy per CLAUDE.md as slices land (builds are fast now —
  `.nojekyll` skips Jekyll).

## Suggested implementation order

1. **Node graph data model.** Extend the 24 tiers to the plan's three-ring
   topology as data (`NODE_GRAPH` or similar in data.js): inner ring =
   existing tier I-II equivalents, mid ring = branch/bridge nodes, outer
   ring = capstones + superskill gates. Keep the existing 24 as anchor
   nodes with unchanged keys/behaviour so old saves map 1:1.
2. **Offer algorithm** (§10): eligibility by adjacency (owned neighbours),
   three-offer composition rules (one continuation, one branch, one
   wildcard), anti-frustration guarantees. Extend the existing scoring
   rather than replacing it.
3. **Form II bridge synergies** (§6): the cross-path nodes between adjacent
   spokes; each needs its own mechanic, tells, and mode adapters.
4. **Superskills** (§7): one per path, gated on capstone + bridge
   ownership; strong acquisition beat (reuse the install FX language,
   bigger), rig transformation in a named slot, proc spectacle within the
   readability caps. Consider TIME SPIRAL as the natural superskill
   playground if first-run balance is a concern.
5. **Repeatable mastery** (§8): fold STACK_ITEMS into the web as revisitable
   nodes instead of a separate offer fallback.
6. **Map rendering at 40-56 nodes**: the current radial layout function
   takes (pi, ti); generalise to graph positions while keeping label zones,
   hit targets, and the phone layouts readable. Reuse the existing state
   language (only offers pulse).

## Validation (after every slice)

- `npm run check`; `npm run verify-assets` if data/assets change.
- Invariant suite in `test.html` — currently **33 checks, all green**; keep
  it green and ADD: graph integrity (every node reachable, no orphan
  prerequisites), offer-algorithm invariants, save-migration round-trip
  (v2 checkpoint loads into the new schema losslessly).
- Flyer/formation tests draw random patterns — re-run the suite a few times
  before trusting a pass.
- Drive the sim headlessly per CLAUDE.md (the preview pane sometimes lays
  out 0×0 — call `resize()` and force a virtual viewport if `!W`).
- Screenshot the map at desktop / 390×844 / 844×390 with an early, a
  mid-branch, and a maxed build; verify the install flow and a superskill
  acquisition end-to-end in all three modes.

## Acceptance criteria

- Old checkpoints and settings load cleanly; a v2 save's 24 owned tiers
  appear correctly placed in the new web.
- No mode loses access to any node; Breaker stays ball-first.
- Every new node satisfies the §9 contract (acquisition, persistent, proc).
- The map stays readable and tappable on a 390-wide phone with 40+ nodes.
- Suite green (including the new tests) across several runs; no console
  errors across Trial stage/round/mode/starter combinations.
- Superskill spectacle respects `reduceFlash` and the particle/ring caps.

Finish with: what shipped, what remains, tests run, visual evidence, files
changed — and update the status headers in
`STARFIGHTER_UPGRADE_WEB_REDESIGN_PLAN.md` (and CLAUDE.md if invariants
change) before handing back.
