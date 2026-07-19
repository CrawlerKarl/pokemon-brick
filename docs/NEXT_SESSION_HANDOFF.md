# HANDOFF — Starfighter campaign build-out (next session)

> **STATUS: LIVE through Milestone 4 Round A.** Milestones 0 and 1 are
> COMPLETE; Milestone 2 has its core round shipped; Milestone 3 has
> Rounds A+B shipped; Milestone 4 Round A (Lugia + Dialga on the Mewtwo
> template, `BOSS_CHANNELS` refactor) is shipped. Invariant suite
> **59/59 green**. Everything below is deployed at
> https://crawlerkarl.github.io/pokemon-brick/.

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

This is an **implementation** task, not another planning exercise. Continue
the campaign roadmap one milestone-round at a time: implement → verify →
test → document → commit → push → confirm the Pages build.

---

## Read these first (completely)

- `CLAUDE.md` — workflow + design invariants. **Do not regress anything
  listed there.** The newest invariants cover the encounter director,
  objective families, `br.crosser` entities, the charge timing arc, the
  armor/veil pair, and the results-screen flow.
- `README.md` — file map, system tour, tuning knobs, gotchas.
- `docs/FULL_GAME_ROADMAP.md` — the 11-milestone plan with per-milestone
  status and the quality-gate checklist. **This is the source of truth for
  what's done vs. what's left.**
- `docs/IMPLEMENTATION_LOG.md` — newest-first record of every shipped
  round and the design decisions behind it.

---

## Where the project stands

**Milestone 0 — instrumentation ✅** (`56a51c8`)
Per-wave combat ledger (`G.runStats.levels`), `js/dev.js` (seeded URL/console
launches, `window.DEV`, F9 balance dashboard, JSON run report),
`gallery.html` projectile-readability audit, boss phase harness.

**Milestone 1 — Kanto gold standard ✅** (through `fdb56c8`)
Stage RESULTS interstitial + mastery medals + region intros, authored Kanto
beats, the Mewtwo duel (focus orbs = normal-fire answer, Psystrike channel =
charge interrupt), the flight-log narrative, Kanto sky flocks, and an
instrumented demo audit of the whole region.

**Milestone 2 — combat ecology 🔶** (`a00b803`)
Resonant release, overcharge cost, SPECTRAL VEIL (the anti-charge-spam
counterweight to armor), and heat fairness proven by test (7.6s spam
overheat; fire-rate upgrades may only make it kinder). *Open:* cooling
upgrades that reshape play style, heat swept across all difficulties.

**Milestone 3 — encounter director 🔶** (`1886bdd`, `b3c1533`)
Data-driven beat scripts per region (`REGION_GRAMMAR` → `G.director` →
`updateDirector`/`runBeat`), a real threat-budget knob (`threatMul`), and
the first win-condition-changing objective family (SURVIVE THE MIGRATION
on Hoenn challenge). *Open:* see "Pick up here".

**Milestone 4 — boss overhaul 🔶** (Round A)
`BOSS_CHANNELS` made the desperation channel data-driven
(`spawnChannelPunish`: columns/sweep/clock, all on `G.columnStrikes`);
Lugia got STORM FEATHERS + TAILWIND (`G.gustDir` bolt drift) + phase-2
pursuit + AEROBLAST sweep; Dialga got CHRONO GEARS + TIME DILATION
(`enemyShotTimeScale()` square-wave lurch) + ROAR OF TIME clock. Design
doc: `docs/M4_BOSS_KITS.md`. *Open:* the remaining 6 legendaries, then
mythics/sentinels; phase-transition animations, phase music layering,
bespoke defeat animations, practice mode.

**Also shipped by the user:** a mobile-first home/start-flow redesign
(`4bd7489`) — one selected-mode hero, live gameplay dioramas, three-item
mode switcher. Their work; treat `config.js`/`menuLayout` as theirs.

---

## Pick up here (choose one)

### Option A — Milestone 3 Round C: entity-based objective families
The remaining families all need a **friendly/neutral entity type** (the one
piece of new infrastructure): escort/defend a friendly Pokémon, capture
without destroying, defend multiple lanes, chase a fleeing elite. Build the
entity once, then the families are cheap. Also queued: lighter overlay
objectives (break-N-projectiles, no-overheat section, shield-relay
sequence, weather survival), the remaining 7 region grammars, and the beat
types not yet built (formation reveal, elite intervention as a distinct
spawn, hazard, victory).

### Option B — Milestone 4 Round B: the remaining six legendaries
The template is proven three times over (Mewtwo, Lugia, Dialga): **one
move best answered by normal fire, one by charge (the `BOSS_CHANNELS`
desperation), a movement/arena identity, reduced-flash variants.**
Remaining: Rayquaza, Zekrom, Yveltal, Lunala, Eternatus, Koraidon — then
mythicals and sentinels. Design kits first in `docs/M4_BOSS_KITS.md`
(that file is the pattern), then implement. The `spawnChannelPunish`
dispatch and the deferred-shot lifecycle (orbit/feather/gear siblings)
make each new boss mostly data + one signature block. Highly
parallelizable across subagents — but they share update.js/data.js/
test.html, so run implementers SEQUENTIALLY with a handoff note, or give
each disjoint bosses and merge carefully.

**Recommendation:** either is a clean slice; B keeps the momentum while
the template muscle-memory is fresh.

---

## How to work (this project's loop)

1. **Plan the round** — one coherent slice, logged in
   `docs/IMPLEMENTATION_LOG.md`.
2. **Implement**, then `node --check js/<file>.js`.
3. **Verify in the browser** — the preview throttles rAF, so drive the sim
   from the console: `DEV.launch({level, mode:'junkie', diff, seed})`, then
   loop `update(1/60)` and read `G.*`. `G.freeze=999; render()` freezes a
   frame for a screenshot. Call `resize()` first; if `!W`, force
   `W/H/canvas` and `buildStars(); buildVignette()`.
4. **Run the suite** — open `/test.html` and **keep the tab FRONTED**
   (background throttling makes it crawl; a full run is ~2–4 min). Poll
   `window.TEST_DONE` / `window.TEST_RESULTS`.
5. **Gates** — `npm run check`, `npm run verify-assets`, suite green, no
   console errors, inspect 1280×720 + 390×844 + a short landscape, check
   `reduceFlash` and touch, update README/CLAUDE/roadmap/log,
   `git diff --check` clean.
6. **Ship** — commit (end-user message + `Co-Authored-By: Claude ...`),
   `git push`, then
   `gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds` and poll
   `.../pages/builds/latest` until `.commit == HEAD && .status == "built"`.

---

## Gotchas this session learned the hard way

- **The browser pane's viewport is SHARED across tabs.** Resizing for a
  phone screenshot changes the size the test suite sees. The upgrade-web
  camera test now forces the canonical 900×700 itself; if a layout test
  fails oddly, check the viewport first.
- **Don't poll agents with `until … sleep` loops.** Agent completions
  notify automatically; a stray polling loop ran for 14 hours before it
  was spotted.
- **Killing a legendary in a test advances the gauntlet** (and triggers the
  next round's entrance pause) — put any "boss dies" assertions LAST.
- **Bonus-damage windows can trip phase transitions.** The Psystrike
  stagger's ×1.35 pushed Mewtwo into phase 2 mid-test; force `br.phase`
  back if you need a specific phase.
- **`gameRand()` must never be called inside a sort comparator** — the draw
  count is engine-defined and desyncs seeded runs. Precompute one draw per
  element, then sort.
- **The VOLLEY path's internal key is `arsenal`** (not `volley`).
- **Storage always goes through `loadStore`/`saveStore`** — a raw
  `JSON.parse(localStorage…)` at module scope once bricked startup.

---

## Balance notes banked for Milestone 9

From the instrumented Kanto audit (scripted pilot, Normal, ~205s, 2
knockouts, finished 1/4 HP):

- Mewtwo's phase 1 melts too fast for the focus-orb showcase to breathe —
  consider a larger P1 HP share or an orb volley on first engagement.
- Finale-entry pressure spikes hard on a 1-HP carryover pilot (a
  crystal/heavy hit at 9s); potion pity into finales may deserve a nudge.
- Sustained fire is correctly punishing: 27 overheats / 54s locked.

---

## The one decision that is NOT yours to make

Release identity (Milestone 10). This is currently a **private Pokémon fan
project**. Before any public or commercial distribution the user must
choose between securing authorization and converting to an original
creature universe. Do not swap the game's identity autonomously — surface
the choice and keep improving the mechanics either way.
