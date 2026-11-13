# HANDOFF — resume here

> ## STATUS (2026-11-13) — AFT-029 THE POLISH REBUILD, slice 3: every screen redesigned on one kit, phone layout measured and fixed, music rebuilt. Committed locally; NOT pushed or deployed.
>
> **Read the 2026-11-13 log entry first.** In one paragraph: the game had
> never been measured at a phone. At 412×775 it fielded half its riders and
> squads overlapped on most stages (on desktop too — the suite's overlap
> test only flew level 4). Tall phones now stand formations in up to three
> RANKS with larger sprites and a lower floor; every settled flyer is
> solved; rings keep a sprite gap; reinforcements arrive into free air.
> The title, vessel-select, results, draft, Forge, pause and combat HUD
> were rebuilt on the shared kit at the top of render.js; the music engine
> has real instrument voices behind a limiter.
>
> **OWNER, ON YOUR PHONE — the things no tool here can judge:**
> 1. **Listen.** Patch character per realm (FM bell/marimba/glass may be
>    metallic; brass/strings attack may feel late; drive may be harsh), low
>    end on the phone speaker, the kick ducking (pulse, not seasick), the
>    reverb/echo amount, music vs enemy-shot cues (music gained ~3 dB —
>    `MUSIC_TRIM` in audio.js is the knob), and any hiccup the first time
>    audio starts.
> 2. **Feel.** Do ranks of larger enemies read well; is the lower phone
>    floor still comfortably clear of your vessel; do boss fights on the
>    phone feel right (finales were NOT re-laid-out, only ordinary stages).
> 3. **Look.** Every redesigned screen at your real size, and that the HUD
>    sits at the very top inside your browser (the phantom-notch fix).
>
> **Slice 4 (same day):** boss stages got their phone pass (larger
> Sovereigns, guards/sentinels/stations kept apart), the trial picker and
> journal frame joined the kit, and a stage can no longer be ended in its
> first seconds without one reserve flight. PUSHED AND DEPLOYED at the
> owner's word — both sites.
>
> **AFT-031 FULL SONGS (evening):** every realm, boss and the menu now
> plays a 64–79s composed piece (log entry AFT-031). COMMITTED LOCALLY,
> NOT DEPLOYED — the owner was sent five audio previews and decides after
> listening. If they approve: push, trigger both Pages builds, rebuild and
> ship the dist. If they want changes, the levers are `MUSIC_SONGS`
> (form/progressions/voices per theme), `SONG_LEVELS` (section mix) and
> the patches (`horn`, `harp`, `musicString`); re-render previews with the
> harness in the session scratch `songs/` folder's pattern (offline
> render → WAV → `afconvert`).
>
> **Not done / known rough:** BREAKER/BLASTER were not measured at a phone
> at all (owner deferred — run `BASE_VP=412x775 BASE_QUERY=touch` on them
> next); the journal is cramped at 667×375; long realm/stage names
> ellipsize in the trial picker at 320px.
>
> ## Earlier — slice 1 and 2 (2026-11-12, late)
>
> **Owner's standing brief (verbatim intent):** the game "still feels really
> rough"; keep the concept, but redesign UI, intro screens, music and
> movement as far as needed — "rebuild it from the ground up if you need
> to". Full creative licence. They test on a real Android phone over the
> LAN (`node serve.js` → `http://<mac-ip>:8741/?skin=aetherfall`; no deploy
> needed for that) and want BIG visible change, not cleanups.
>
> **Slice 1 shipped (log entry AFT-029):** phantom-notch fix (HUD no longer
> pushed down inside Android browsers), STARFIGHTER's deep flown sky with a
> streaming star field and take-off, the formation swing + level-2 dives,
> quiet phone stage title.
>
> **Slice 2 shipped the same evening:** vessel 22% larger on tall phones
> (`pilotRigSize`, art + edge clamp only), Surge stretches the star field
> into warp streaks, the touch controls sit on a backed dock gradient,
> combat floaters step clear of the announce strip, BREAKER/BLASTER got the
> deeper stage wash, and audio runs through a MASTER BUS (`audioBus` —
> glue compressor + generated-impulse room reverb; smoke-tested for node
> wiring only, NOT judged by ear — the owner must listen and say if the
> reverb or loudness is wrong; sends are `sendM 0.2` / `sendS 0.07`).
>
> **The rest of the programme, in priority order (items 2 and part of 1, 4, 5 are done — see slice 2):**
> 1. **Combat HUD rebuild (phone-first).** Still floating fragments: COMBO
>    label, RIFT KEY row (enemies fly through it), RESONANCE bar + element
>    chip bottom-left, hardpoint chips under the ship. Target: ONE top bar
>    (score · stage · HP) with a single status row beneath it, and ONE
>    bottom control dock (meters left, SURGE + FIRE right) on a backed
>    shelf; four type sizes only; nothing unbacked over the playfield.
> 2. **Apply the deep stage to BREAKER and BLASTER** (their daytime skies
>    are still washed-out beige — see `flightSky` in `buildBackground`;
>    keep landmarks there, just deepen and saturate).
> 3. **Title + vessel-select redesign.** The three-doors title works but
>    reads as a settings list; the STARFIGHTER diorama's neon look is
>    stronger than the real game. Want a real attract screen: logo
>    lock-up, animated hero, one primary PLAY.
> 4. **Actor scale on tall phones.** Vessel ≈45px and formations occupy
>    ~27–51% of a 775px viewport; scale sprites/airspace with HEIGHT, not
>    only width (hitboxes are balance — baseline after).
> 5. **Music + SFX engine.** Still raw oscillators with no bus: add a
>    master compressor/limiter, a generated-impulse reverb send, stereo
>    width, a real drum kit and bass voice; keep `ADVENTURE_MUSIC` patterns.
>    Cannot be judged by ear in-session — owner must listen.
> 6. **Results / draft / Forge / pause** to the same panel language.
> 7. **Entrances and exits:** landing beat on stage clear (mirror of the
>    take-off), bolder authored entrances for realms 1–2.
> 8. AETHERFALL role words (LEGENDARY/MYTHICAL vs SOVEREIGNS) — owner call.
>
> ## Earlier the same day — AFT-027 + AFT-028 + AFT-013 (all in the same local commits)
>
> **Latest (same day, after AFT-027): AFT-028 THE MOTION PASS + AFT-013
> CODEX BOSS DOSSIERS — suite 144/144, gate GREEN (33 scenes × 2), baseline
> GREEN (`--label aft028-motion`).** The owner reported enemies "feel drunk"
> and "shift to centre when hit": the hit flash is now the sprite's own
> silhouette + a recoil (was a disc at its centre); formation riders stay
> upright and in step; reinforcements arrive as a rigid lattice instead of
> a pack the solver jostled; every velocity snap (maneuver start/end, dive
> V, BLASTER solver vibration) is gone; the patrol is one clean glide. The
> codex gained a boss tab with per-boss dossiers and a persistent boss log.
> Log entry 2026-11-12 (AFT-028) has the measurements and the balance
> attribution. **Owner checks on a real phone:** does enemy motion now read
> as crisp (STARFIGHTER realms 1–4 and a late BLASTER stage); does the hit
> recoil feel right or too strong; the dossier tab's touch-drag scroll.
> **Open copy decision:** AETHERFALL boss roles still read LEGENDARY /
> MYTHICAL (in the reveal too) while the tab says SOVEREIGNS.
>
> **Suite 138/138 at the AFT-027 checkpoint · gate GREEN (~73s full, 31 scenes × 2 viewports, incl.
> a dist OFFLINE-BOOT check).** The working tree carries AFT-026c (the
> 10-17 haptic round, found uncommitted) plus the whole AFT-027 round —
> commit, push both repos, and rebuild/ship the dist when the owner says so.
>
> **AFT-027 in one paragraph** (full detail: log entry 2026-11-12): a
> presentation-only COMBAT FEEL PASS (combat text never stacks — score pops
> sum, call-outs refresh in place; combo tiers 10/25/50/100; colour-coded
> screen flashes via `flashFx`; distinct elite-kill, charged-shot, Surge
> and ward-save beats; the capture-ball paddle hub no longer leaks onto
> AETHERFALL); **BREAKER's wall now GROWS with the journey** (it was
> shrinking to 6–12 bricks / ~18s stages by realm 8 — rows 3→6 plus the
> `CLASSIC_WALL_MUL` durability curve); the SCENERY DEPTH pass (a far
> parallax range, per-stage weather/clouds/aurora, shaded suns and moons —
> and overdraw went DOWN, 4.48 → 4.01 screens/frame); **BOSS RUSH**
> (AFT-014's first slice: nine finales back to back on the campaign
> economy, timed, best time saved under `storeKey('rush')`); and
> **AFT-015** (manifest + icons + service worker: the standalone installs
> and plays fully offline after one visit). New tool: `node tools/shot.js`
> — headless screenshots of any state; use it for every visual judgement.
>
> **Waiting on the owner's phone (a simulator cannot answer these):**
> (1) do late BREAKER stages feel like real stages now, or too long/short;
> (2) the new kill/charge/Surge beats — satisfying or too much (hit-stop
> lengths are the knobs: 25/50/140ms kill tiers, 40ms charge, 90ms Surge);
> (3) Add-to-Home-Screen: icon, fullscreen, safe areas, audio after
> backgrounding, an airplane-mode launch; (4) a human BOSS RUSH time vs the
> bot's 9–17 minutes; (5) night cloud banks at ~0.6–0.74H — any readability
> cost; plus the four items still open from AFT-025/026 below.
>
> **⚠ `npm run baseline` is RED on one budget — and it PREDATES this
> round:** `C-continuous-run-S2: a knockout attempt burned 175.4s (>150s)`
> (the L9 siege, defensive-draft seed). Control runs: HEAD `fc01eda` and
> AFT-026 `77bc93d` fail identically; its parent is green only because
> that seed hit the sim cap unfinished. This round's campaigns are
> bit-identical to HEAD. Untuned on purpose — see log §7 of 2026-11-12.
>
> The three rounds before it:
> **AFT-011** (mobile loading: 690 WebP / 10.3 MB dist, realm-first art
> streaming, bounded decoded caches — found complete-but-uncommitted from
> the 08-30 session and committed as its own round); **AFT-025 THE
> FLAT FRAME** (the owner's "aetherfall lags at the region-1 boss"
> report: the per-shot `shadowBlur` in `drawAetherRelic` — AETHERFALL
> only, invisible to the old synchronous storm — plus the overdraw
> collapse: atmosphere baked into `bgWash`, a rung-3 background PLATE,
> DPR-aware 0.62 resolution, the MINIMAL setting, and painted-screens +
> dense-probe budgets in the gate. `tools/profile-boss.js` is the new
> throttled diagnostic); and **AFT-010 STAGE 1** (the ACCESS settings
> tab: text size, background dimming, outline strength, colorblind-safe
> threat colors, tap-toggle charge, easier charge timing, visual sound
> cues — every option inert at its default, suite-asserted; stage 2, the
> DOM/screen-reader layer, remains open). Then **AFT-026 (2026-09-01)**,
> two owner playtest fixes: the state-'upgrade' breather was EATING the
> AETHER FORGE 2.2s after it opened (no player who hesitated ever used
> it — the breather now excepts `G.forge`, and the suite idles at the
> menu), and the relay Sovereign's death cut straight to the Hourseed
> reveal so the kill never read (players anchor on the 50% LAST STAND
> flash — junkie gauntlet legendaries are TWO-phase; the fall now gets
> slow-mo + a preempting FALLS card, reveal deferred 1.5s). And
> **AFT-026b**: haptics were buzzing once per hit/kill/pickup, so a
> big build drowned the charge arc — ambient ticks now mute while a
> charge is armed and share one 450ms budget (`hapticGate`, a pure
> function the suite drives headless). **AFT-026c (2026-10-17)** supersedes
> that mitigation with an essential-only model after the owner still found
> the phone too busy: FIRE, hits, ordinary kills, pickups, paddle returns,
> charge promotion and resonant release are silent; only decisions, full
> charge, ability readiness/activation, urgent danger, real damage and major
> success vibrate. Global recovery is 320ms and same-kind cooldowns are
> 0.75–2.0s.
>
> - workshop `CrawlerKarl/pokemon-brick` →
>   https://crawlerkarl.github.io/pokemon-brick/
> - dist `CrawlerKarl/aetherfall` →
>   https://crawlerkarl.github.io/aetherfall/
>
> **The prior rounds (newest first — full detail in
> `IMPLEMENTATION_LOG.md`):**
>
> - **AFT-024 THE STAGE DIVIDEND** (owner directive: upgrades per level,
>   not per XP threshold). One draft per ordinary stage clear + the realm
>   Forge = **3 decisions per realm, ~26 per journey**, none during live
>   combat. Resonance repurposed from FREQUENCY to HAND WIDTH (3/4/5
>   cards). The mid-wave draft path was DELETED, not disabled. A knockout
>   deals a RECOVERY HAND (banked resonance cashed in, capped 2/stage).
> - **AFT-023c manual fire**: taps are buffered through the cooldown
>   (three taps = three shots, always) and active tapping now outpaces the
>   auto-fire assist by ~25% instead of losing to it.
> - **AFT-023b codex vocabulary**: the CODEX tally spoke raw Pokémon
>   words ("CAUGHT"/"SHINY") on AETHERFALL; it now rides
>   `SKIN.strings.caughtWord`/`shinyTag`, and the gate's vocabulary scan
>   bans the whole franchise family (POKÉMON/POKÉDEX/POKEBALL) across
>   every copy table plus `SKIN.strings`.
> - **AFT-023 the STARFIGHTER improvement pass** (six goals): draft
>   pacing, finale knockout checkpoints, apex identity re-forge, the
>   rising duration curve, vessel/affinity/Aegis normalization, and the
>   guided first-session vessel view.
>
> **Two traps worth not rediscovering** (both cost real debugging time):
> a **draft freezes `update()`**, so any cinematic armed behind one can
> never finish — that was a genuine soft-lock; and the baseline harness's
> `wallguard` is a **wall-clock** guard, so a runaway sim reports as a
> timeout that looks exactly like machine load (it is not).
>
> ---
>
> <details><summary>Historical: the 2026-07-23 P0 closeout (kept for
> context)</summary>
>
> **ALL P0 ITEMS FROM THE BACKLOG ARE IMPLEMENTED, TESTED, AND LIVE** (rounds g–o in the log): AFT-005A the
> headless release gate (`npm test`), AFT-001 safe zones + fitted
> labels, AFT-003 the SURGE lexicon, AFT-004 the kinded announce queue +
> clean launches, AFT-002 the full-resolution boss reveal + HUD-lane dock,
> AFT-017 the oath evolution channels, AFT-006 save safety
> (export/import/backups/durable storage), AFT-018 frame stability
> (baked hot loops + the adaptive effects budget), and AFT-005B mobile
> scenes with fitted-label assertions + the artifact-storm ledger.
>
> **Suite (as of that closeout): 127/127** — 103 at the 07-23 closeout;
> AFT-021 +12, AFT-022 +7, AFT-009R +5. *(Current count is 129 — see the
> status banner at the top of this file.)* `npm test` ran green before
> every commit.** Production art: 259 base + 259 radiant + 54 previews +
> **43 boss reveals** + 21 weapon sprites. Both sites live:
> - workshop `CrawlerKarl/pokemon-brick` → https://crawlerkarl.github.io/pokemon-brick/
> - dist `CrawlerKarl/aetherfall` → the standalone AETHERFALL build
>
> **✅ THE BOSS FRAME-RATE THREAD IS CLOSED.** The owner confirmed on
> 2026-07-23 (real device) that boss levels run smoothly after the cadence
> profiler round. The deeper rungs (3+) stay unimplemented by design; the
> storm ledger keeps accumulating the baseline every gate run.
>
> **`AETHERFALL_IMPROVEMENT_BACKLOG.md` remains the scope authority** (now
> including AFT-020 + acceptance criteria) and SUPERSEDES `FULL_GAME_ROADMAP.md`
> where they disagree — but read its status banner: its P0 list is DONE, and
> some of its status lines describe the pre-P0 world. Its **P1 ranking and
> acceptance criteria are still live and authoritative.**
>
> **AFT-020 + AFT-008 SHIPPED (2026-07-24, one autonomous program):** all
> NINE realm finales now run their authored formats (ladder / relay /
> siege / hourglass / circuit / hunt / rite / raid / chase — only
> Greenspell keeps the classic ladder), every stage carries an authored
> display title, wardbreak/lanes/bells/undercard non-attrition identities
> run in every mode, Victory Drafts deal 4/5 mastery-sized hands with a
> pinned mastered reroll, Preparation banks a Challenge benefit, realm
> crests persist, Time Spiral remixes tighten learned tells, and the
> Section-9 balance corrections (Stormbinder tempo, AEGIS restore + gated
> regen, One Life un-stacked, diminishing stacks, renewable-add
> exclusions, drop diversification) are landed with regression fixtures.
> The old-campaign baseline AND the redesigned-campaign closeout matrix
> live in docs/baselines/. Suite is at 103 invariants; the working design
> log is docs/archive/AFT020_PHASE_NOTES.md (marked COMPLETE).
>
> **Post-ship owner round (2026-07-24h, `09cea36` / dist `2efd83d`):** two
> real-phone art-pop reports fixed same day — reveal portraits + weapon
> sprites are WARMED ahead of first draw (`warmRevealArt`/`warmSetupArt`)
> and each reveal LATCHES its art source at 0.35s so nothing swaps
> mid-scene. The subsequent owner playtest is now complete; its findings are
> the AFT-021 program immediately below.
>
> **AFT-021 EXECUTED IN FULL (2026-07-24, autonomous session — log rounds
> 2026-07-24i–p, commits `6910fa6…HEAD`).** All ten playtest defects were
> locked in reproducing fixtures first, then fixed and promoted to
> permanent invariants (suite 103 → **115**; gate green end to end):
> - **A win must LOOK won**: the clear enters `G.state === 'resolve'` —
>   hostile fire dissolves at the win moment, actors play their completion
>   verb (disperse/rescue/stand-down), results wait for the field and
>   speak the verbs; `combatIsLive()` makes damage structurally impossible
>   outside live combat.
> - **One owner per screen region**: the `claimSurface` registry + per-scene
>   overlap enforcement; the goal pill owns the narrow top row; trial copy
>   finishes inside a briefing hold; results/drafts ride a static arena
>   plate; the sound circle moved to pause.
> - **The combat-safe viewport** (`combatSafeRect`): boss-class actors clamp
>   inside it (both axes); ONE active target carries the local nameplate,
>   co-actors ride the ROSTER RAIL; idle pads soften under combat.
> - **One weapon clock**: hostile slows and cinematics never touch player
>   projectiles or charge; touch holds credit from the press (full at
>   1.10s on every input/framerate); pause/background disarm charges.
> - **The measured rebalance (BASELINE GREEN, 142 scenarios, budgets
>   enforced by `npm run baseline`)**: finale work from measured per-mode
>   DPS curves (`sovereignHp`/`FINALE_WORK`/`FINALE_WORK_MODE`, state.js);
>   `journeyDmgMul` baseline weapon growth; path spread 3.8× → 1.36×
>   (Aegis retaliation, Surge afterglow, Bond/Hyper/electric trims);
>   blaster deflector core + hull plate; Ace = threat, not sponges; the
>   per-stage shield income budget (`tryShieldGain`).
> - Three DOCUMENTED calibration deviations live in `evaluateBudgets`
>   (tools/run-baseline.js): classic-bot band = human band ×1.8; ratio
>   hard cap 2.5 (1.6 target re-checked by the human pass); ≤2 blaster
>   seed-outliers tolerated outside L3/L12.
> - Open for the OWNER's real-device judgment: blaster feel at mid-realm
>   finales, Ace's threat-heavy pacing (+~2× bot duration), and the
>   1.8s trial briefing hold's feel.
>
> **AFT-022 (portrait round) and AFT-009R (the progression redesign —
> Attunement / Aether Forge / journal) BOTH SHIPPED 2026-07-24** — see
> log rounds 2026-07-24q/r and the numbered pickup list below.
>
> **AFT-023 (the STARFIGHTER improvement pass) SHIPPED 2026-07-24s** —
> draft pacing discipline (~23 picks/campaign, capped per-stage income,
> reveal/phase holds, combined banked hands), FINALE KNOCKOUT CHECKPOINTS
> (resume at the reached round/beat/segment — the 424.9s L27 replay class
> is dead; KO overhead measured 30-38s), apex identity re-forge (WAR
> MACHINE offense + plating vs CELESTIAL 14s ward cooldown; 3-seeded
> fair probes + an enforced identity budget), the rising duration curve
> (lateWaveMul from r2, reinforcement waves 1/2/3/4, Ace combo volleys,
> massive shots enter r6 with a longer telegraph), vessel normalization
> (ground/poison trims, fire kindle in shooters, dark execute, LIGHT
> Radiant Ward, UNSWORN neutral launch, Aegis overflow → bounded Surge),
> and the guided first-session vessel view + mode-correct strings +
> HIGH-CONTRAST PROJECTILES + the 320×568 fit sweep (which caught a real
> settings-panel overflow). Suite 129; gate 56 scenes; baseline
> matrix-aft023. Log round 2026-07-24s has the full detail.
>
> **AFT-024 (THE STAGE DIVIDEND) SHIPPED 2026-07-27** — upgrades now
> arrive ONE PER STAGE CLEAR (owner directive: per level, not per XP
> threshold). 3 decisions per realm = 2 stage hands + 1 Forge, 26 per
> journey; resonance repurposed from FREQUENCY to HAND WIDTH (3/4/5
> cards); the mid-wave draft path deleted outright; a RECOVERY HAND
> cashes banked resonance when you're knocked out on a finale. Suite 129.
>
> </details>

**NEXT UP (code):** AFT-013 is DONE (see the status banner). Next: more AFT-014 (run history, custom modifiers), AFT-010
STAGE 2 (the DOM/screen-reader layer), and the rest of AFT-012 (enemy
scale/shadow/rim standardisation — this round did scenery and VFX only).

**NEXT UP (owner):** AFT-019's remainder — the real-device pass. Beyond the
AFT-027 list in the status banner, four older things still
wait on the owner's phone rather than on code: (1) the region-1 boss
frame rate after AFT-025, (2) the Aether Forge is actually usable after
AFT-026, (3) the relay Sovereign's fall reads as a kill, (4) the haptics
feel calm after AFT-026b. After that, AFT-010 STAGE 2 (the DOM /
screen-reader accessibility layer) is the next build round. See "Pick up
here" below.

**A caution learned on 2026-09-01 (AFT-026):** three of the last four
defects were INVISIBLE to a green gate — the Forge auto-skip (nothing
ever idled at a decision surface), the relay fall (nothing asserted what
the player SEES between a kill and the next scene), and the haptic
pile-up (nothing counted feedback events per unit of player attention).
When a report says "it felt wrong," check what the harness never
simulates — a hesitating player, an un-tapped screen, a full build — not
just what it asserts.

Work in `/Users/andariel/Downloads/Pokemon Brick Breaker and Alien Invader`.

---

## Read these first

- `AETHERFALL_POST_AFT020_UX_PLAYTEST_REMEDIATION_PLAN.md` — **AFT-021,
  EXECUTED 2026-07-24**: post-clear correctness, combat readability,
  charge/input timing, and campaign rebalance. Still the reference for
  what each fix guarantees; matrix evidence in
  `baselines/AFT021_MATRIX_REPORT.md`.
- `AETHERFALL_IMPROVEMENT_BACKLOG.md` — **the backlog. Start here.**
- `AETHERFALL_REALM_FINALE_AND_VARIETY_PLAN.md` — **the new AFT-020
  execution plan: nine finale formats plus campaign-wide variety work.**
- `../CLAUDE.md` — workflow + the design invariants you must not regress.
- `../README.md` — file map + system tour + gotchas.
- `IMPLEMENTATION_LOG.md` — newest-first record of every shipped round and
  the reasoning behind it. Newest entries run through **2026-07-24r**.
- `FULL_GAME_ROADMAP.md` — milestone history (useful design context; the
  backlog wins on open items).
- `archive/` — historical plan docs for shipped features (see its README).

---

## The architecture in one screen

Vanilla-JS canvas game, **no build step** for the game itself. **16 JS
modules** in `js/`, loaded in order via `<script>` tags in `index.html`
(later files reference earlier):

```
setup → config → skin → audio → data → pokeworld → aetherfall
      → aetherfall-overrides.generated → aetherart → scenery
      → state → input → update → render → dev → main
```

- **Engine / world split.** `js/data.js` is now ENGINE-ONLY (shared tables,
  `STARTER_KIT` balance numbers, and the lexicon helpers `typeLabel()` /
  `typeWord()` / `pathSummary()` / `dexEntryInfo()`). The entire pokemon
  world moved to **`js/pokeworld.js`** (rosters, motion profiles, gens,
  habitat packs, boss kits, names, dex rewards, region intros, objectives)
  and calls `assembleSkins({...})` at its tail. The dist replaces
  `pokeworld.js` with a generated, name-stripped stub.
- **Two skins, one engine.** `js/skin.js` owns the `SKINS` registry and the
  live `SKIN` (resolved at boot: `?skin=` → `SETTINGS.skin` → `pokemon`).
  Presentation + world data ride `SKIN.*`; the engine (type keys,
  effectiveness, modes, paths, the 50-node web) is shared. **pokemon** keeps
  LEGACY bare storage keys (`pkbrk-*`); **aetherfall** namespaces via
  `storeKey()`. Checkpoints are schema v5 (`skin`/`affinity` since v4; attune arc + Focus + Reforge since v5).
- **AETHERFALL** (`js/aetherfall.js`) is an original sci-fi × fantasy world:
  18 classes across MAGIC/TECH/MAGITECH, 9 realms, 54 vessel lines, 27
  sentinels + 9 legendary + 9 mythic bosses cloning the M4 kit mechanics
  under original ids/names. Owns `typeNames` (the ASPECT lexicon),
  `weaponArt`, `relicDrops`, and the rift secret (LUMINE ASCENDANT).
- **Art layers.** `js/aetherart.js` draws every AETHERFALL unit procedurally
  (no image assets, baked + cached) AND hosts the production-art override
  layer that blits real PNGs over the cached canvases.
- Three modes: **classic** (BREAKER — calm, ball-only, no enemy fire, no
  paddle gun), **blaster** (BLASTER, ball-less), **junkie** (STARFIGHTER,
  the flagship flight shooter). Internal keys are storage-stable — never
  rename.

---

## THE ART PIPELINE (the user runs generation in parallel — check every session)

New finals land in `art/aetherfall-production/`. **To wire them in:**

```
python3 tools/build-aetherfall-previews.py     # 320px setup portraits from the 1254px masters
python3 tools/build-aetherfall-reveals.py      # 512px boss-reveal portraits (43 boss ids)
npm run art-overrides                          # scans final/ + preview/ + reveal/, regenerates the 5 maps
npm run build-dist                             # regenerates dist-aetherfall/ (RESIDUE must be "none")
```

**Live coverage today: 259 base + 259 radiant + 54 preview + 54
radiant-preview + 43 reveal overrides, plus 21 weapon sprites.** Procedural
art still covers any id with no override and any load gap, so a partial run
is always safe.

**At session start: `git status` — if the user dropped new finals, run
`npm run art-overrides`, verify, commit, deploy.**

### Two art-tooling rules learned the hard way

- **Never assume the chroma colour — read it off the frame.** The production
  run uses **two** screens: green for most subjects, **magenta** for
  green-heavy art (water/grass/ice/bug lines — ids 13–18, 28–30, 43–45).
  Assuming green silently left 12 vessels sitting on a solid backdrop block.
  `detect_chroma()` medians a 6px border; the despill is channel-matched.
- **Previews/reveals must match THE ID'S OWN final's framing.** The finals'
  subject ratios VARY per id (0.725–0.785), so both tools measure each id's
  final (`final_subject_ratio`) and pad to match. A fixed global ratio made
  hulls visibly GROW when the high-res art finished loading (2026-07-23
  owner report) — regenerate both sets if you touch either tool.

### Disk

`art/` is **1.1 GB** — but **1.0 GB of that is `sprites/source/`** (the
1254px editable masters) plus 31 MB of weapon art. Only `final/`(14 MB),
`preview/`(13 MB) and `weapons/final/` are referenced at runtime.
`dist-aetherfall/` is about 37.4 MiB excluding its nested Git metadata
(about 114 MB on disk including `.git`). If repo size becomes a problem, pruning
`sprites/source/` is the lever — **but ASK FIRST, it's the user's working
art.** Local same-origin files only; the no-remote-fetch rule stands.

---

## What shipped, in brief (full detail in `IMPLEMENTATION_LOG.md`)

**2026-07-24: the AFT-008 + AFT-020 program (rounds a–h)** — the finale
director + nine authored realm-finale formats in both skins and all three
modes, stage display titles ×27, four non-attrition objective identities
(wardbreak/lanes/bells/undercard), mastery-sized Victory Drafts + pinned
mastered reroll, Preparation, realm crests, authored conditions ×9, Time
Spiral remixes, the Section-9 balance corrections with fixtures, the
old/redesigned baselines (`npm run baseline`, docs/baselines/), suite
87→103, and the same-day owner art-pop fix round (warming + reveal latch).

**2026-07-22 → 07-23: all P0 items** — the headless gate (AFT-005A), safe
zones + fitted labels (001), the SURGE lexicon (003), the kinded announce
queue (004), the boss reveal scene (002), the oath evolution channels (017),
save safety (006), frame stability (018 + 018b + the cadence profiler), and
the mobile scene/label/storm harness (005B). Plus owner-reported fixes: the
trial picker overflow, the vessel size "pop", and two rounds of boss-level
performance work.

**2026-07-23d (owner feedback round):** upgrade-web labels never hide behind
nodes (late plate pass + per-spoke slots + relocated ring names), boss
reveals hand off continuously into the fight (`viaReveal`/`fxOnly` — no more
bottom re-entry after the portrait docks), draft descriptions read at body
size and fill their sheet, and vessel-select art is warmed at the title so
the hero/tiles never swap renders after a click (plus a skin gate that
stopped aetherfall previews leaking onto colliding pokemon ids).

### Earlier context — the 2026-07-22 art/identity rounds

1. **Calm BREAKER + earned Rift** (07-21 tail, deployed 07-22): classic takes
   zero enemy fire and has no paddle gun; offense paths reskin to ball power
   (TWIN ORB / WIDE ARRAY / POWER+SHATTER CORE / LASER→MULTIBALL) so no draft
   pick is dead. Kanto shards became one-shot skill tests (RIFT COURIER you
   must shoot down; a swaying one-pass fall in BREAKER), and the Mew VMAX
   reward is ONE bounty draft where you choose TWO from the same hand
   (`G.bonusPicks` + `holdBonusPick`).
2. **STARFIGHTER edge lock + MEGA scaling** — the MEGA-ready halo inflated
   `paddleW()`, which was BOTH the giant-halo bug and the movement clamp that
   pinned the ship off the screen edges. MEGA now scales with the journey
   (`megaRegions()` / `megaBoltMul()` / `megaBallDmg()`), so it stays relevant
   late.
3. **The ASPECT lexicon + the CODEX GALLERY** — Pokémon type words are gone
   from AETHERFALL (`SKIN.typeNames` → `typeLabel()`, `typeWord()` = ASPECT),
   and the codex gained a full-size sprite gallery so the art can be
   appreciated on the player's terms.
4. **Vessel showcase, Relicforge drops, the deepening oath** — a large detail
   hero on the vessel screen, dropped items restyled as relic plates + binding
   sigils (no Pokémon symbols), the oath graded by form, and high-resolution
   previews. Then the two fixes below.

### Two user-reported bugs fixed in the last round

- **"Green block behind a ship"** → the magenta-screen discovery above.
- **"The light outline is on the ship before I choose"** → a returning player
  with a saved affinity saw their radiant casting while still picking a hull.
  `drawAffinityVessel(..., neutral)` now forces the base casting on the
  vessel-select screen; the oath appears only after it is sworn.

### One reverted change — the lesson stands

A **FIRST ENCOUNTER splash** (new creature flashes larger with its name) was
built and then removed at the user's request: *"It's distracting and happens
mid-level."* **Mid-level celebration interrupts the shooter's flow — the
CODEX GALLERY is where art gets appreciated, on the player's terms.** Don't
rebuild it. (The low-band text fix that shipped alongside it was kept: in
shooter modes the announce strip and combat notices anchor above the ship
band so copy never covers the flock or the pilot.)

---

## Pick up here

### 0. ~~FIRST: confirm boss-level frame rate on a real device~~ — DONE

**Confirmed smooth on the owner's phone (2026-07-23).** The P1 track is
unblocked. Historical context below stands in case a future regression
reopens it.

- **What shipped, round 1 (AFT-018b)**: adaptive resolution (rung 2 → 75% of
  native DPR), ~0.5s ladder escalation, `fxGlow()` flattening the big
  whole-sprite blurs (pilot, paddle hull, pad rings), baked rig gradients.
- **What shipped, round 2 (cadence)**: work time alone missed the problem —
  JS was ~1ms while the COMPOSITOR fell behind, so AUTO never engaged.
  `PERF` now keeps a second ring of real `requestAnimationFrame` cadence
  (ignoring bootstrap/resume gaps and hidden-tab returns) and
  `effectsLevel()` treats it as an equal input: cadence >20ms drops bloom +
  big glows, >26ms adds emission + resolution. Freeze/hit-stop frames are
  profiled too (phase transitions are the densest boss frames).
- **How to check on device**: play a finale, then read `DEV.perf()` — it
  reports `cadenceMs`, `fps`, the active `level`, weighted `load`, and live
  effect counts. `level` should climb above 0 while it's struggling.
- **Round 3 HAPPENED (AFT-025, 2026-08-31)** — the owner reported the
  region-1 finale lagging again on AETHERFALL. Root causes and fixes are in
  the AFT-025 log entry: `drawAetherRelic`'s per-shot `shadowBlur`
  (aetherfall-only, invisible to the synchronous storm), the ~6.5
  painted-screens overdraw, and the rung-3/MINIMAL ladder extension.
  `tools/profile-boss.js` replays the exact scenario throttled. If lag
  EVER returns after that: (a) offscreen fragment/trail culls + animation
  sampling (the still-unbuilt rung 4), (b) a WebGL compositor.
- **The gate now guards this**: a BOSS storm runs every `npm test` with
  machine-portable budgets (grad ≤8, blur ≤14/frame at FULL; ≤6 lean).
  Absolute ms stay advisory; state-change counts gate hard. The final
  closeout run was green in 28s: wave 1.01ms average; boss 0.87ms average /
  1.3ms P95; boss FULL 1.4 gradients + 3.9 blur writes/frame.

### The programme sequence

```
✅ AFT-007 ORBITAL RELIC
✅ AFT-008 BASELINE + SCHEMA LOCK (docs/baselines/, npm run baseline)
✅ AFT-020 NINE REALM FINALES + CAMPAIGN VARIETY (all 10 phases)
✅ AFT-008 REDESIGNED-CAMPAIGN CLOSEOUT (Section-9 corrections + matrix)
✅ AFT-021 POST-AFT-020 UX STABILIZATION + BALANCE REREAD (Phases 0–9)
✅ AFT-022 PORTRAIT-MOBILE PLAYTEST ROUND
✅ AFT-009R PROGRESSION REDESIGN (Attunement / Forge / journal)
✅ AFT-023  STARFIGHTER IMPROVEMENT PASS (six goals)
✅ AFT-023b CODEX VOCABULARY + widened gate scan
✅ AFT-023c MANUAL FIRE (tap buffering + manual cadence edge)
✅ AFT-024  THE STAGE DIVIDEND (one draft per stage; no combat interrupts)
✅ AFT-011  MOBILE LOADING + WEBP (690 WebP; current-first stream; bounded caches)
✅ AFT-025  THE FLAT FRAME (per-shot blur baked; overdraw budgets; rung 3 + MINIMAL)
✅ AFT-010 STAGE 1 (the ACCESS settings tab — 7 settings-level accessibility wins)
✅ AFT-026  OWNER PLAYTEST (the Forge auto-skip; the relay Sovereign's fall beat)
✅ AFT-026b HAPTIC CALM (the hold owns the thumb; one shared noise budget)
✅ AFT-026c ESSENTIAL-ONLY HAPTICS (2026-10-17)
✅ AFT-027  THE FEEL PASS + BREAKER WALL GROWTH + SCENERY DEPTH (AFT-012 slice)
✅ AFT-014  slice 1: BOSS RUSH (timed nine-finale run, saved best)
✅ AFT-015  INSTALLABLE + OFFLINE (manifest, icons, service worker, lifecycle)
→ AFT-013 codex boss dossiers (now has rush splits/KOs to show)
→ AFT-019 first-session pass — REAL-DEVICE REMAINDER ONLY (now incl. confirming AFT-025 killed the boss lag,
   the Forge is usable, the relay fall reads, and the haptics feel calm)
→ AFT-010 STAGE 2 (the DOM/screen-reader layer for menus/results/codex/web)
→ AFT-012 visual pass
```

**What "AFT-019 remainder" means:** the guided first-session vessel view,
mode-correct strings, high-contrast projectiles, the bloom/coach occlusion
fixes and the 320×568 fit sweep all SHIPPED in AFT-023. What is left is
the part a simulator cannot answer — long-press charging, two-thumb
movement, haptics, safe areas, browser chrome, thermals — on the owner's
actual phone.

1. **AFT-021 is DONE** (Phases 0–9, log rounds 2026-07-24i–p) and
   **AFT-022 (the portrait-mobile playtest round) is DONE** (log round
   2026-07-24q): auto-fire vents itself, must-read copy wraps, pause never
   mirrors, the ship clamps by rendered footprint, constellation taps are
   offered-first, notices dedupe — plus the seeded-launch position-
   dependence fix and the baseline TRUTH RE-ZERO it forced (see the log).
   OWNER-JUDGMENT items outstanding: blaster feel at mid-realm finales,
   Ace pacing, the 1.8s briefing hold, the fast-rite seeds (L21), and the
   two owner-flagged matrix deviations (L12-blaster-S3, rite floors).
2. **AFT-009R (mobile-first progression redesign) is DONE** (log round
   2026-07-24r): Attunement levels (Resonance-driven three-card combat
   drafts with a combat-safe queue and a curated opening), the realm
   AETHER FORGE (Refine/Link/Evolve/Reforge — ordinary stage drafts are
   GONE), the constellation as a non-installing journal with a phone
   list view, Focus Charges, checkpoint schema v5 with lossless
   migration, and knockout that never uninstalls.
   **⚠ SUPERSEDED BY AFT-024 in part:** the Resonance-driven MID-COMBAT
   draft is gone. Hands now arrive once per STAGE CLEAR and resonance
   buys hand WIDTH instead of frequency. The Forge, Focus, Reforge,
   four-path cap, journal and v5 saves are all unchanged.
3. **AFT-023 / 023b / 023c / 024 are DONE** — see the status banner at
   the top of this file for the one-paragraph summary of each.
4. **Open follow-ups from AFT-023/024** (noted, not started):
   - **the campaign bot grinds the L24 Seraph raid** — it shoots the
     crown-shielded Sovereign instead of breaking segments, so two of the
     three campaign seeds burn 15-25 knockouts there. This is a HARNESS
     limitation, not a game one: the same finale clears in ~46s with zero
     knockouts under a granted build, and a human reads the crown cue.
     Targeting the captains directly was tried and measured WORSE (30/29
     knockouts) — do not retry that specific fix without new evidence.
   - **the apex identity gap is inside seed noise** — WAR MACHINE should
     be 10-15% faster than CELESTIAL; it currently trades the lead
     ±5% run-to-run. The budget rails a gross re-inversion, and the
     residual is warn-tracked; closing it properly needs more seeds per
     cell, not more knob turns.
   - **L21's rite is chain-fast** (~26s vs the 60-100s target) regardless
     of work coefficients — owner-flagged since TRUE-HEAD; the fix, if
     wanted, is rite pacing (riteMark arming), not the work vector.
5. **Cheap follow-ups spotted during the earlier closeout** (still open):
   - the ground vessel clears ~27% faster than the median vessel (matrix
     evidence in docs/baselines/AFT008_CLOSEOUT_REPORT.md) — candidate for
     a gentle trim if the owner confirms it feels dominant;
   - a no-build L3 blaster run showed a game-over gap in the matrix —
     verify a human can actually hit it before tuning anything;
   - retired mythic duel specs (the seven formats that no longer end on a
     mythic health bar) wait on a future Boss Rush / Trial-extra surface if
     the owner ever wants those duels back as practice.

Notes so you don't redo finished work:

- **`npm test` is the gate** (~73s full, `--fast` ~20s, `--suite` ~17s):
  syntax → assets → **138 invariants** headless → both-skin + dist boots →
  the vocabulary scan (no player-facing MEGA, and since AFT-023b no
  POKÉMON/POKÉDEX/POKEBALL in any copy table or `SKIN.strings`) → RESIDUE →
  **29 mobile scenes × 2 viewports (58 screenshots** → `.gate-shots/` +
  metadata sidecars) that each PROVE their named state via `expect`
  assertions, under the overlap + single-actor-label contracts → the
  wave AND boss storm ledgers (`.gate-report.json`). Run it before every
  commit.
- **`npm run baseline`** replays **162** deterministic autopilot scenarios
  (~70–90s) and ENFORCES the AFT-021 budgets (finale duration bands ×
  mode, mode ratios, path spread, vessel cap, shield income, heat,
  difficulty drift separation, clear rules) — violations exit red. Always
  pass `--label <provenance>`; `BASE_ONLY=<substring>` filters scenarios for
  tuning loops, **but an unlabeled BASE_ONLY run writes over the committed
  old-campaign fixtures** (this happened once — `git checkout --` restored
  them). The committed snapshots in `docs/baselines/` (old campaign +
  redesigned closeout + aft021) are FIXTURES: regenerate to compare, then
  restore; never overwrite history.
- **Tests that finish a wave must step through `G.state === 'resolve'`**
  before expecting results/draft — the resolution beat sits between clear
  and results in every mode (helpers in test.html already do this; new
  tests should reuse them).
- **`FINALE_WORK` × `FINALE_WORK_MODE` multiply** (state.js) — retune them
  together, never one in isolation, and remember boss-class actors are
  exempt from the hp≥900 unkillable-scenery convention. Any new shield
  source must route through `tryShieldGain` or it escapes the income
  budget.
- **The per-finale implementation pattern is documented** in
  `docs/archive/AFT020_PHASE_NOTES.md` (skin profiles → buildLevel block →
  director fns → damageBrick tail gate → kill hooks → summon override →
  strokes-only fx → mastery → suite test → deliberate legacy-test updates).
  Follow it for any new format work; don't invent a second pattern.
- **AFT-003's optional tail** (renaming internal `G.mega`/`megaT`) remains
  ruled out by the backlog itself — engine identifiers ship unchanged.
- **AFT-018's rung 3 SHIPPED as AFT-025 (2026-08-31)** — the owner's
  region-1 boss-lag report was the real-device evidence it waited on. The
  background plate, DPR-aware 0.62 resolution, MINIMAL, and the
  painted-screens/dense-probe storm budgets are all live; further rungs
  (offscreen fragment/trail culls, animation sampling) remain unbuilt and
  wait on new evidence.

---

## How to work (this project's loop)

1. Plan one coherent slice; log it in `IMPLEMENTATION_LOG.md`.
2. Implement → `node --check js/<file>.js` (or `npm run check`).
3. Verify in the browser by driving the sim from the console (the preview
   throttles rAF): `DEV.launch({level, mode:'junkie', diff, seed})`, loop
   `update(1/60)`, read `G.*`; `G.freeze=999; render()` for a screenshot.
   Add `&skin=aetherfall` to any dev URL. If `!W`, force `W/H/canvas` then
   `buildStars(); buildVignette(); bgGen=-1`.
4. **Suite:** `npm test` (headless, ~30–35s; `--fast` ~15s while iterating).
   The fronted `/test.html` tab still works for interactive debugging but is
   never required. Modal boss reveals are dormant under the suite
   (`window.__SUITE`); a test that needs one sets `window.__SUITE_REVEALS`.
5. Gates: `npm run check`, `npm run verify-assets`, `npm run art-overrides`
   (if new finals), suite green, no console errors, both skins boot
   (`/?skin=aetherfall` + default), inspect 1280×720 + 390×844 + short
   landscape, docs updated, `git diff --check`.
6. Ship: commit (end-user message + `Co-Authored-By: Claude …`), push, then
   `gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds` and poll
   `.../pages/builds/latest` until `.commit == HEAD && .status == "built"`.
   Verify a changed file serves live.
7. **For the standalone:** `npm run build-dist` → confirm **RESIDUE: none** →
   commit/push inside `dist-aetherfall/` → trigger + poll that repo's Pages
   build the same way. `dist-aetherfall/` is GENERATED — never hand-edit it.

---

## Gotchas

- **`npm run art-overrides` after every new-finals batch** — otherwise the
  game keeps drawing procedural art for ids that have real PNGs.
- **`'lighter'` composite paints transparent pixels too.** The LIGHT affinity
  wash lit the sprite's whole bounding box as a glowing square until it moved
  to `'source-atop'`. Use `source-atop` for any tint over a sprite.
- **aetherfall ids numerically collide with pokemon PNG filenames on disk**
  (`assets/sprites/101.png` is Electrode). `getSprite` dispatches to
  `SKIN.spriteMaker` BEFORE the PNG path — never bypass it.
- **test.html pins `?skin=pokemon` itself** so the user's saved edition
  toggle can't leak into the bit-identity gate. Don't remove that.
- **Tests that set `SETTINGS.starter` must reset it to `'none'`** at the end —
  a partner's damage mods leak into later integer-math tests.
- **`tierDesc` reads `G.mode`, not `SETTINGS.mode`.** A test that sets only
  the latter silently checks the wrong mode's copy.
- **A Pages build POSTed while another is building can transiently `errored`**
  — just re-trigger; it's not a real failure.
- **New-repo pushes can be rejected for email privacy** — copy the workshop's
  `user.email`/`user.name`, then `git commit --amend --reset-author`.
- **The dev server occasionally dies mid-suite** — `preview_list`, restart
  with `preview_start`, re-run.
- **`gameRand()` never in a sort comparator** (desyncs seeds). The VOLLEY
  path's internal key is `arsenal`. Storage only via `loadStore`/`saveStore`
  → `storeKey`.
- **Don't poll agents with sleep loops** — background work notifies
  automatically.
- **A free-running timer that consumes `gameRand()` must be reset in
  `resetRun`** — `G.splashCD` wasn't, so a seeded run's RNG stream depended
  on how many runs preceded it in the page, and the AFT-018 sim-identity
  check went intermittently red. Fixed 2026-07-23; the AFT-008 round then
  widened this to the WHOLE clock family (`G.time`, laser/blaster/missile/
  invuln/se/enemyShot/bossShot/splash CDs, `lastChargeT`) plus a
  cross-launch aged-page determinism test. Add any new free-running
  consumer to that reset block. If a determinism test ever goes flaky,
  instrument `gameRand` call SITES (wrap it and capture
  `new Error().stack`) and diff two runs — that found this in minutes.
- **`fireAction()` per frame is how a test FINISHES a wave in any mode** —
  it launches serves AND releases stuck/dropped balls; `serve()` re-racks
  and can wedge a finish loop (the classic mode-smoke flake, fixed
  2026-07-24). Test bots in finale scenarios also want `G.lives = 99` +
  periodic strike/shot clears so a knockout can't pollute the assertion.
- **Props at `hp ≥ 900` are unkillable scenery by convention** — the
  AFT-008 workHp/BE stamps skip them (a 999-hp prop once inflated a
  stage's earned-BE to 13×). Keep any new indestructible prop at 999 hp.
- **`buildLevel` clears `G.reveal`/`G.revealDock` at build start** — a
  knockout rebuild once left a stale dock reading from the HUD lane.
- **Production art is WARMED, never first-drawn** (owner-report round 24h):
  `warmSetupArt()` on the title (roster + all 21 weapon PNGs),
  `warmRevealArt(rIdx)` in buildLevel (current + next region) and on Trial
  region tap, and every reveal LATCHES its portrait source at t ≥ 0.35
  (`revealLatch`). Any NEW PNG surface needs the same treatment or it will
  visibly swap over its fallback on a real phone.
- **Effects quality must never touch the seeded stream.** Cosmetic spawns
  ride `Math.random()`; anything gated by `effectsLevel()` must not sit in
  front of a `gameRand()` call.
- **Git worktrees don't carry gitignored files** — an agent running the gate
  in a worktree will find `serve.js`-adjacent gitignored assets missing;
  restore what the task needs or expect a red step that isn't real.
- **A DRAFT FREEZES `update()` — never leave a cinematic armed behind
  one.** A boss entrance armed by a knockout rebuild sat forever behind
  the AFT-024 recovery hand, because the reveal needed `update()` to
  advance and the draft had stopped it. Permanent soft-lock. Recovery
  hands now drop any armed reveal and `beginBossReveal` skips while
  `G.finaleResume` is set. Any NEW surface that both freezes the sim and
  can coexist with a reveal needs the same treatment.
- **The baseline's `wallguard` is a WALL-CLOCK guard, not a sim guard.**
  A runaway sim (that soft-lock burned 625,920 simulated seconds in one
  scenario) reports as `endReason: 'wallguard'`, which looks exactly like
  a slow/loaded machine. Check `simT` in the scenario record before
  blaming the host: an absurd `simT` means the bot is spinning on a state
  that early-returns, not that the box is busy. Note the bot's
  `simCap` check sits AFTER the per-state early returns, so a state that
  loops forever is never capped.
- **Don't run two `npm run baseline` invocations at once.** They fight
  over CPU and leak headless Chrome; kill strays with
  `pkill -f run-baseline` and `pkill -f remote-debugging-port`.
- **`migrateCheckpoint` rejects lvl<4 BY DESIGN** — checkpoints only exist
  from region boundaries; a test that hand-saves at level 2 will "fail" the
  bundle validator correctly.

---

## The release-identity terms (unchanged)

The Pokémon skin must stay playable locally — **never delete or degrade it.**
Any PUBLIC/commercial distribution of the Pokémon-branded skin still requires
the user's explicit call. AETHERFALL is the IP-clean identity and now ships
from its own repo; the workshop keeps both.
