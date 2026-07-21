# Implementation log

Chronological record of completed roadmap work and unresolved design
decisions. Newest entries first. Roadmap: `FULL_GAME_ROADMAP.md`.

---

## 2026-07-20 — Rift shards are EARNED + the VMAX bounty is one choose-2 draft

Owner: shards were too easy in region 1 ("perhaps you have to shoot down
enemies that are only temporarily on the screen, and if you miss them, you
miss the shard — this way getting to Mew VMAX feels special"), and the double
upgrade after Mew VMAX read as 2 separated events instead of one event where
you choose 2.

- **RIFT COURIERS (shooter modes).** `spawnRiftShard` no longer drops a homing
  pickup there: it spawns a swift, shiny bare crosser (`SKIN.secret.courier` —
  Abra on pokemon, the bonus-flight species on aetherfall) that crosses the
  cleared field ONCE (~4.2s, `vx = max(210, W·0.26)`, 2 HP). Shot down → the
  shard drops with the legacy generous homing (the shoot-down was the test);
  reaches the far edge → the rift closes (miss handling in the crosser fly-by
  block; drop handling in damageBrick's kill path). Couriers inherit every
  crosser exemption (no formation/solver/overlap/clear participation). The
  spawn announce uses the strip, never a hero card — the player must SEE the
  courier to track it.
- **BREAKER shards (calm classic — no gun, crossers forbidden):** the shard
  itself falls FAST (vy 205) on a swaying, NON-homing line at a random column
  (`pu.swift`) — one pass, paddle-catch it or lose it.
- **VMAX bounty = ONE draft, CHOOSE TWO.** `G.secret.bonusDrafts` +
  `chainBonusDraft` (a second chained hand) are replaced by `G.bonusPicks = 2`
  + `holdBonusPick` (input.js): after the first install the SAME hand stays
  open minus the picked card (survivors re-validated against slot caps /
  eligibility; hand emptied → one fresh deal, still the same event). The draft
  header names the state (RIFT BOUNTY — CHOOSE TWO / ONE MORE PICK, rift
  violet). `G.bonusPicks` lives on G (reset in resetRun), never checkpointed.
- Also fixed in passing: the classic pause-help still said "EARN A BLASTER
  FROM DROPS & DRAFTS" (stale after the calm rework) → ball-only copy.
- **Real state-hygiene bug exposed by the new courier test:** `resetRun` never
  cleared `G.dramaticT`/`G.freeze`, so a fresh run started right after a
  dramatic kill began at ×0.3 slow-mo for ~0.9s (in the suite this leaked from
  the courier shoot-down into the M0 ledger test — a planted charged laser
  moved 4.5px instead of 15px, missed the y<40 cull, and 'wasted charge' went
  undetected). resetRun now zeroes both.
- **Verified** by console sim: courier spawn/flight/shoot-down/catch, courier
  escape closes the rift, classic swift-fall miss (~3.7s), bounty first pick
  holds the same hand (state 'upgrade', remaining ⊂ original), second pick
  resumes play; screenshots of the courier mid-flight + the CHOOSE TWO header.
- **Suite:** 'Kanto Rift Key' test extended (classic one-pass assertions +
  courier shoot-down/escape sections); the two-drafts test rewritten as
  'Mew VMAX bounty: ONE draft event, choose two from the same hand'.

---

## 2026-07-20 — BREAKER goes calm: no enemy fire, no paddle gun

Owner request: "On the normal brick breaker game, take away enemy fire and
the other things related to it (upgrades, weapon on the paddle, etc). It
makes the game too tough. I want it to be a fun, challenging, calm game
without enemy fire coming at you." Scoped to **classic only** (BLASTER /
STARFIGHTER are shooters — untouched). Owner chose **reskin to ball power**
so no draft pick is dead.

Classic already had no flyers/divers, so classic fire came from only two
places: static bricks shooting down, and bosses. Both removed:

- **No enemy fire in classic.** The enemy-fire director skips boss abilities,
  boss volleys, and wave fire in classic; `spawnEnemyShot` is a hard no-op
  there (also neutralizes the phase-transition shockwave, which routes through
  it); beam columns are cleared; the diver shot is guarded. The only loss
  condition is now dropping the ball. Anchor-style bosses (Mewtwo) get a calm
  phase-1 drift since their abilities are off; they still phase + summon guard
  bricks. (update.js)
- **No paddle gun.** `blasterArmed()` returns false in classic, always — no
  LASER auto-fire, no Mega guns, no offense-tier-3 unlock, no charge. Gated the
  auto-laser block, added a `blasterArmed()` guard to `fireCharge` (airtight),
  and hid the paddle's weapon barrels in classic. (state.js / update.js /
  input.js / render.js)
- **Offense reskin (ball power, no dead picks).** VOLLEY: TWIN ORB (`twin`)
  serves a 2nd ball on launch, WIDE ARRAY (`hyper`) widens the paddle +15%.
  IMPACT: POWER CORE (`pulse`) / SHATTER CORE (`impactX`) each add +30% ball
  damage. Mega is now a pure ball overdrive (the ball already pierces + 3–4.2×
  under `megaT`). A LASER pickup remaps to MULTIBALL (`modePower`). New
  classic-facing `cname`/`desc`/`crole`/`csummary` + a `pathSummary` helper;
  shooter modes keep the SAME tiers as real guns via each tier's `sdesc`
  (unchanged). (data.js / input.js / update.js / render.js)
- **Verified** by console sim (both skins: armed=false, 0 shots/lasers/charge/
  columns under all arming sources; reskin: twin→2 balls, hyper 130→149.5px,
  pulse ×1.3, nova ×1.6, laser→multi) + a clean showcase screenshot.
- **Suite:** replaced the now-obsolete 'classic deflector core' and 'classic
  guns' tests with 'classic calm' + 'classic offense reskin'; updated
  'brick-only classic' + mode-smoke. Docs (CLAUDE.md / README) updated.

---

## 2026-07-20 — Continuity pass + a caught regression (78/78 green)

Housekeeping to make the folder self-contained, plus a real bug the
suite gate caught:

- **Docs made current.** Rewrote `NEXT_SESSION_HANDOFF.md` from scratch
  (status, the art-override workflow, deploy loop, gotchas). Archived 10
  implemented plan/handoff docs to `docs/archive/` (+ an index README) —
  root is now just `CLAUDE.md` + `README.md`. Updated CLAUDE.md's title
  invariant to THE THREE DOORS; roadmap M10 SHIPPED note + fixed stale
  checkpoint-v3 / "regions 3-9 default" facts + repointed moved refs.
- **Art:** swept 71 more production finals → **130 overrides live**
  (all vessels + realms 1-5 creatures).
- **Regression caught + fixed.** The full suite (triggered to close the
  open gate) surfaced a crash: the adversarial-review `attackElement()`
  → null fix (correct: a NO-PARTNER pilot is typeless/neutral) broke
  `drawHUD` (render.js:3900), which called `.toUpperCase()` on the
  element assuming junkie always has one — crashing every frame of a
  NO-PARTNER Starfighter run. Fixed: the element readout renders null as
  'NEUTRAL'. Every other `attackElement()` consumer was already
  null-safe. **This is the value of the gate — the review fixes had NOT
  yet cleared a full suite run, and this only manifested in the HUD
  render path no finder dimension covered.** Re-run: 78/78 PASSED at
  `45d7693`.

## 2026-07-20 — The voice & pacing pass (M3/M9 slice)

Two authored layers that previously covered only the opening regions
now cover the whole campaign:

- **Flight-log flavor, all 27 stages × both skins** (`STAGE_FLAVOR` /
  aetherfall `stageFlavor`). One narrative line after every clear, in
  each world's own voice — the pilot's FLIGHT LOG across nine regions
  (migration weather, Coronet cold, rush-hour Unova, stadium Galar,
  paradox Paldea), and the EXPEDITION LOG across nine realms (vow
  gales, the drowned world, the sibyls' boilers, the night board of
  the glass spire, the crucible's ticketed war). Stage-2 lines hook
  the next region; day numbers run 1–27; objective stages reference
  their objective (migration/escort/defend).
- **All nine region grammars authored** (`REGION_GRAMMAR` — was Kanto
  + Johto + a default). Each region paces differently using ONLY the
  tested beat actions: Hoenn gusts in squalls and leaves the migration
  alone; Sinnoh's escort owns its arrival (empty grammar there — the
  traveler IS the story) with avalanche-front raids in the challenge;
  Unova runs rush-hour surge→raid→finalPush; Kalos gifts a bonus
  flock and lets DEFEND carry the challenge; Alola gives a genuine
  mid-wave breather before its trial; Galar rolls stadium pressure in
  waves to a championship finish; Paldea opens aggressive and runs
  the journey in miniature. Live-sim verified: every authored beat
  fires in order on Unova/Alola/Galar/Paldea seeds, zero errors;
  objective stages (2:1, 3:0, 5:1) keep their proven shapes.

## 2026-07-20 — Title overhaul: THE THREE DOORS + the calm roster

User brief: the home screen was overwhelming and the 18-partner grid
doubly so — "simple, clean, visually beautiful, obvious options."

- **Home = three doors.** The selected-hero + copy column + start button
  + mode rail + progression bands collapse into THREE equal game cards
  (columns on wide screens, stacked diorama-beside-text rows on
  phones). Each card: its live diorama (the game explains itself by
  looking like itself), the name, ONE recipe line, ONE play affordance.
  Tapping a card selects that game AND opens partner selection — one
  tap, one decision, Back to change. The daily chip rides the Breaker
  card's diorama corner (it IS a Breaker run); CONTINUE is a slim band
  under the header only when a checkpoint exists; journey/research is
  one quiet footer line (desktop only). `menuLayout` keeps its API
  (quick aliases the selected card; preview/hero alias the card band).
- **Partner screen = one hero, three shelves.** All reading moved into
  a single DETAIL HERO card (sprite, name, ability + type, effect line,
  evolution chain); the 18 partners are small identity tiles (sprite +
  name only) on three labeled shelves — `SKIN.rosterGroups` names them
  (THE CLASSICS / WILD & FIERCE / MYSTICS & TITANS on pokemon; the
  MAGIC/TECH/MAGITECH disciplines with their colors on AETHERFALL).
  Shelf block centers in its room; tiles cap at thumb-friendly sizes;
  NO PARTNER stays a quiet ghost chip. `setupLayout` keeps its API
  (info aliases the hero; new shelf(g)/tile fields).
- The setup-walk test moved to the new contract (tap a card → that
  game's partner screen); the viewport-fit sweep passes at all six
  sizes incl. 310×670 and 667×375. Suite 78/78.

## 2026-07-20 — BREAKER guns: support arm, Starfighter grammar + the
## production-art override layer

**Guns (user report: "incredibly overpowered").** Root cause: Mega and
LASER auto support-fire spawned untyped generic bolts at 0.3–0.6s with
up to 4 barrels, and during Mega EVERY bolt was `explosive` — each one a
~100px fireball hitting everything in radius, free of heat. Effective
Mega auto DPS ≈ 17; LASER t3 ≈ 13. The ball could never compete.
- Support fire is now the PARTNER's typed volley: bolts carry
  `pilotInfo().shape` + `attackElement()` + partner tier in classic too —
  the Starfighter look/feel/type-chart complexity, one grammar across
  modes (PRISM mastery now matters to classic gunplay).
- Numbers: auto cadence 0.8/0.6/0.45s (was 0.6/0.42/0.3), bolts ×0.7;
  `explosive` comes ONLY from FIREBALL — Mega keeps its ×1.25/1.4 bolt
  bonus + HYPERNOVA cadence, never a free fireball carpet. Mega auto
  ≈ 2.2 DPS, LASER t3 ≈ 6.2 — the guns support, the ball clears.
- The CHARGE ARC now runs in classic while armed (hold right-click/
  Shift/FIRE-pad): resonance window, overcharge cost, shell-cracking —
  and never accumulates unarmed (ball-first preserved).
- Suite 77 → 78: 'classic guns: partner-typed support fire, no Mega
  fireball carpet' (typed bolts, 0.7 power, lazy cadence, FIREBALL owns
  AoE, charge armed-only).

**Production-art override layer.** The user's generation pipeline
(art/aetherfall-production/ — style bible, 518-asset manifest, chroma-
key workflow) now plugs straight into the game: `npm run art-overrides`
scans `sprites/final/af-<id>-*.png` → `js/aetherfall-overrides.
generated.js`; `aetherart.js` blits each override ONTO its cached
canvas on load (same object identity — every reference upgrades in
place, procedural bake covers the gap and every unmapped id). Radiant
variants hue-rotate the PNG + keep sparkles/aura. gallery.html reports
coverage ("N overridden by production art"). Local same-origin files
only — the no-remote-fetch rule stands. First 5 finals (Pyromancer,
Thistling line, Velmora) live in-game.

## 2026-07-20 — BREAKER balance: the deflector core (width was a trap)

User report: classic's enemy fire sometimes reads impossible to dodge,
and widening the paddle — sold as a pure upgrade — made it worse.

**Diagnosis (instrumented dodge-bot, 90s seeded runs, Normal):** wave
fire tops out at 3 simultaneous shots (the telegraph cap works), so the
pain wasn't volume — it was the HURTBOX. Classic used the full live
paddle width as the shot target: base 130px × wide tier 1.18 × WIDE
power ×2.05 × Tailwind ×1.3 ≈ 346–409px visual → a 322–432px kill zone
vs shots at ~350–450px/s. An elite 3-fan's prongs land closer together
than that, so every prong clipped — mathematically unavoidable. Bot lost
4 lives in 90s at region 8. Column beams used `paddleW()/2` too, so a
wide paddle could make warned lanes inescapable.

**Fix — the deflector core** (`classicCoreHalf()`, update.js):
- Enemy shots + column beams damage only a FIXED core: 0.42 × BASE
  width (≈55px half). Width mods never touch it — the junkie "upgrades
  never widen the hurtbox" invariant, translated to the paddle.
- The visual wings beyond the core DEFLECT shots free (consumed, spark
  + throttled 'DEFLECTED' floater, no life, no i-frames) — every width
  upgrade is now purely good: more ball reach AND more armor. Aimed
  elite/boss fire still targets your center, so movement stays the
  counterplay.
- Once per run, the first wing save announces the rule; the paddle
  renders the warm vulnerable core + pale wing sheen from level 2 on
  (pure fills, no per-frame gradient/shadow work).
- Safety ceiling: classic wave fire stops scheduling telegraphs past 8
  live non-boss shots (measured max was 3 on Normal — this bounds
  Ace/One-Life × ambush × late-region stacking).
- Blaster beam collision fixed to its base width (WIDE CATCH no longer
  inflates beam hits); junkie untouched.

**After (same seeds, same bot):** R8 4 → 1 lives lost; R2 2 → 1 and the
wave now clears; core pinned at 55px under a 346px paddle. Suite 76 →
77 ('classic deflector core: width is armor, never a bigger target' —
fixed core under stacked width, wing shots + beams deflect free, core
costs exactly 1, the 8-shot ceiling holds).

## 2026-07-20 — AETHERFALL art v2: every design bespoke

Full rewrite of `js/aetherart.js` (~3.9k lines): the ten generic
archetypes are gone; **all 99 designs are authored painters** — 54
creature lines, 18 pilot vessels, 9 sentinels, 9 legendaries, 9 mythics
(259 baked ids incl. forms). Every unit now looks like what it IS:
thorn-bud sprites, living bells, paper-lantern wraiths, bonsai spirits,
anglerfiends, iceberg whales, gear golems, furnace stoves, neon
wireframe hounds, noir trenchcoat phantoms, living billboards,
shattered-pane phantoms, hand-mirror seers, sacred-geometry ley nodes,
satellite-dish palms, electric mantas, double-exposure echo wraiths,
walking castle golems, living swords, photograph ghosts, hourglass
spirits, rising suns. Vessels carry the class fantasy (bone-ribbed
necromancer skiff with scythe prow; tesla-mast stormbinder; drone-hive
swarm carrier; patched drifter with lantern pole). Legendaries are
set-pieces: the armillary Clockwork Regent, pylon-titan Voltrex with a
living arc crown, half-gold/half-chrome Aurelion Prime, stained-glass
Lucerna, crown-strung Marionne.

- **Finish pipeline** (`finishSprite`): every bake gets a cel SHADE
  (alpha-clipped underside gradient), a RIM LIGHT (offset-silhouette
  subtraction, top-left), and an 8-direction STICKER OUTLINE stamped
  from the alpha silhouette — one look unifies all 259 sprites and
  keeps them readable at 36 px combat size.
- **Part library**: blobPath/mirror/teardrop/lens/crescent/flame/
  crystal/gearRing/halo/orbitals/wing×4 (feather/blade/membrane/
  energy)/thruster/plate/eyes×3/visor/skull/runes/lantern/crowns/
  motes/mist/tailSpline. Painters stay 25–45 lines each.
- Forms escalate inside each painter (sprout → circlet → gold crown,
  plus per-design growth); sentinels share a realm painter with
  per-member emblems (`drawGlyph(type)`); bosses ride style-true
  silhouettes (anchor oracle, infinity gale-bird, serpent leviathan,
  bastion clock, flank pylon, swoop carrion angel, phase crescent,
  perimeter blade-fan, charge split-fusion).
- Same contract as v1: deterministic seeded rand, bake-once cache,
  `.complete/.naturalWidth`, zero network, `AF.spriteClassify` kept
  for the suite's asset audit. Console audit: 259/259 ids bake ≥2%
  opaque pixels, radiant variants distinct, zero page errors.

## 2026-07-19 — AETHERFALL rounds S1–S7: the original skin ships

The complete Milestone-10 release-identity build, in one arc. Designs:
`ORIGINAL_SKIN_PLAN.md` (approved) + `S1_SKIN_SPINE_DESIGN.md` (audit).

- **S1 · spine + storage.** `js/skin.js` between config and audio:
  `SKINS` registry, `?skin=` → `SETTINGS.skin` → pokemon resolution,
  `storeKey()` (pokemon keeps LEGACY bare keys — zero migration; other
  skins get `pkbrk-<skin>-*`), `STARTER_KEYS` + runtime `skinStarters()`
  (the config.js STARTERS literal is DEAD), `assembleSkins()` attach-by-
  reference + stub default-fill. Checkpoint **v4** (`skin` + `affinity`
  fields; v1–v3 accepted forever; cross-skin checkpoints treated as
  absent). ~120 consumers migrated to `SKIN.*`; easter eggs (pika chirp,
  MISSINGNO., Ditto, Magikarp, Konami Mew) gated `SKIN.id === 'pokemon'`
  with rand streams kept aligned; Dialga's ×0.85 became data
  (`BOSS_ABILITIES[483].p2FireMul`); `eff === -1` untouched.
- **S2 · classes + strings.** 18 classes over the 18 type keys in three
  disciplines (MAGIC awakens / TECH upgrades / MAGITECH synthesizes),
  engine mods shared verbatim; `SKIN.strings` (dex → CODEX ⬢, shiny →
  RADIANT, catch/research/coach/ending copy), `skinEvolveVerb()`,
  discipline `treeLexicon` voicing the six path names via
  `skinPathName()`, mode-card copy patch, drawGlyph 'sigil' + pokeball
  choke-point redirect.
- **S3 · world.** Nine realms (GREENSPELL MARCHES → SUNDERED CRADLE)
  with palettes, 54 unit lines × 3 forms (realm-based id space r*100+n),
  habitat packs, region intros, stage flavor, acts (THE OLD MAGIC / THE
  ASCENDANCY / THE CONVERGENCE), research rewards, cheat labels, junkie
  items, objective species remaps (courier 401 / beacon 616).
- **S4 · bosses.** All 9 legendaries + 9 mythics + 27 sentinels clone
  their same-slot pokemon kit rows bit-for-bit (style, channels,
  params, projectile kinds, entrance styles) under new ids/names —
  VELMORA (Mewtwo kit) through AURELION PRIME (Koraidon kit); move-name
  strings all original (MIND SPIKE, GALEBREAK, DECREE OF HOURS…). The
  rift secret is skin data (`SKIN.secret` — LUMINE VMAX on aetherfall).
- **S5 · procedural art.** `js/aetherart.js`: deterministic seeded
  parts renderer — 10 body archetypes (wisp/critter/beast/avian/serpent/
  golem/drone/knight/fish/moth) + a bespoke pilot VESSEL archetype, act
  design language (organic → angular+thrusters → chrome+glowing inlays),
  form escalation (circlet → crown), legendary flourishes keyed by boss
  STYLE (third eye / great wings / gear halo / storm pods / crescent /
  six blades / dash fins), radiant hue-shift variants. Baked once,
  cached, `.complete/.naturalWidth` contract — zero call-site changes,
  zero network. getSprite dispatches through `SKIN.spriteMaker`.
- **S6 · affinity.** LIGHT/DARK pick on the difficulty screen (skins
  with `SKIN.affinities`; tap-again clears), 3+3 affinity satellites on
  the STACK_ITEMS machinery (dawn/halo/grace · fang/tithe/hex) swapped
  via `activeSatellites()` — slot rules and web caps untouched; effects
  wired at real chokes (dropChance, kill-mega, shield grant, damage,
  charge damage, score price). Checkpoint carries the pick.
- **S7 · toggle.** The title edition pill IS the switch (render writes
  the rect, input reads it; flip saves + reloads clean of `?skin=`).
  gallery.html gained the 200-look AETHERFALL unit sheet.
- **Tests 71 → 76**: legacy-key preservation, v3→v4 stamping, per-skin
  isolation, S5 asset audit (every id classifies + bakes pixels +
  radiant distinct), affinity trio gating. Migration tests updated v3→v4.

## 2026-07-19 — Milestone 3 Round C: the friendly entity + protect objectives

The first entity-based objective families, on the game's first
FRIENDLY combat entity. Design: `M3_ENTITY_OBJECTIVES.md`.
- **`br.friendly`**: crosser-parity exclusions (solver/overlap/shooter
  pool/snap/slow-mo/clear/director baseline) PLUS laser pass-through
  (no damage, no pierce, no lastHit — and a damageBrick guard so AoE
  can't hurt it either) and a NEW enemy-shot collision (3 heart pips,
  shot consumed, ring+floater). Every 2nd aimed MICRO volley redirects
  onto the friendly (redirect, never add — heavies keep hunting the
  pilot, so interception is the counterplay and dodging stays yours).
- **ESCORT THE TRAVELER** ('3:0' L10, Togepi 175): crosses bottom→top
  at ~34 px/s (~17-20s — retuned from the spec's 55 for journey feel);
  banner shows path % + hearts. **DEFEND THE RELAY** ('5:1' L17,
  Porygon 137): stationary, 22s countdown. Both hold the wave open
  (survive-guard parity + reuse of its reinforcement drip); completion
  = +600, potion at the friendly, survive-style disperse, clear.
- **First objective FAIL state**: friendly faints → `O.failed`, strip
  notice, banner suppressed, wave reverts to a normal attrition clear
  (the clear guard ignores done OR failed objectives). No extra
  punishment.
- **Ledger**: `statsObjective(type, done)` + one OBJECTIVE line in
  results (mastery list shifts a row when present).
- Tests 69 → 71 (escort: pass-through/chip/guard/exit/disperse/faint-
  fail; defend: hold/redirect-vs-heavy/timer). One test fix from the
  first run: the faint branch injected its shot on the very first
  post-reset update (still serve) — primed past the serve→play
  transition. M9 note: near the exit the escort passes behind the
  banner/formation band briefly — consider an exit-lane nudge in the
  region-authoring pass.
- Verified: 71/71 fronted, live escort (banner ♥♥ · 61%) and relay
  (♥♥♥ · 16s) screenshots, console clean, verify-assets OK (175/137
  named + sprited locally).

## 2026-07-19 — Milestone 4 Round D: sentinel rhythm + presentation

The combat template was complete (18 duels); Round D gave round 1 a
rhythm and caught presentation up. Design: `M4_BOSS_KITS.md` ROUND D.
- **Sentinel GUARD/OPENING** (`br.openT`, damageBrick scaling strictly
  on `subBoss`): guarded ×0.55 behind a hexagonal ring tell; firing
  `subAbility` drops that sentinel's guard 2.4s (full damage, first
  hit ×1.2, ring-shatter + `OPENING!`, once-per-wave strip teach
  `SENTINELS GUARD — STRIKE AFTER THEY ATTACK!`). Ledger records
  scaled damage (armor pattern). Choreography invariants intact.
- **Entrance FX**: 13 new motif branches in `drawGauntletEntranceFx`
  — every one of the 27 styles now has bespoke geometry (strokes/arcs
  only, wash scaled by the reduced factor).
- **Transition/defeat garnish**: `br.enrageAnimT = 0.9` on phase-up
  (decays beside `br.flash` in update) → ×1.06 silhouette pulse + 8
  radial speed lines in drawBossMon (motion, no added flash); isBoss
  death → `G.dramaticT ≥ 0.45` + triple type-colored ring echo.
  Known gap: Mew VMAX renders via drawMewVmax, so no enrage pulse
  there (logged).
- **Practice phase selection**: `jumpToGauntletRound(round, phase)` →
  `jumpToBossPhase` clamps to phaseCount and lands mid-band HP (no
  retroactive shockwave/adds — practice caveat); trial screen gained
  a PHASE chip row (2 chips legendary / 3 mythic+secret, resets on
  round/stage change, render + hit-test share `trialLayout` rects);
  `DEV.boss(region, round, {phase})`.
- **Music heat**: `bossMusicHeat()` (audio.js, pure, testable) — 0
  none/phase-1/sentinels/dormant; 1 past phase 1 (or Mega over a live
  boss); 2 last stand. musicTick: heat ≥1 = the old intense layer
  exactly; heat 2 adds off-16th half-gain hats + a quiet off-beat
  diatonic-third counter echo. `buildMusicPattern` untouched
  (soundtrack signatures stable). Semantic shift, intentional: Mega
  during the sentinel round no longer triggers the layer (sentinels
  read 0 — matches "sentinels stay 0").
- Suite 67 → 69 (guard/opening rhythm; phase jump + heat ladder).
  Verified: 69/69 fronted, screenshots (timesplit entrance, sentinel
  guard rings with Zapdos open mid-BOLT STRIKE, trial phase row),
  console clean.
- Still open in M4 (logged, low priority): per-species defeat
  animations; VMAX enrage garnish.

## 2026-07-19 — Milestone 4 Round C: the nine mythicals

Round 3 of every gauntlet now duels by the template — lighter kits
(mythics are 0.82× HP, 3-phase), every signature a sibling reuse.
Design: `M4_BOSS_KITS.md` ROUND C.
- **Gate**: channel-open now keys on a `BOSS_CHANNELS` entry +
  `!secretBoss` only (dropped `!mythic`). Mew VMAX shares `poke.id`
  151 with Mew — the `!secretBoss` clause is load-bearing and TESTED
  (VMAX runs to 8% HP with `BOSS_CHANNELS[151]` present and never
  opens a channel).
- **Infra**: `s.orbit.launchType:'column'` (at launchAt the shot
  becomes a warned lane strike at its x — "the wish comes due");
  `s.feather.home` (capped ~40 px/s stalk toward the pilot);
  `s.feather.swayAmp` (real sway amplitude; old feathers bit-identical
  at 34); `s.gear.dripEvery` (drip every Nth beat; default 1);
  `boss.sweep.image{Species,Kind,LaunchAt,Notice}` (afterimage drops
  parameterized; Koraidon defaults bit-identical). Gear drip inherits
  `s.species`/`s.kind` (Dialga unchanged).
- **Kits** (signature / channel, all `dur 2.4, cd 9, hpFrac 0.15`):
  Mew ECHO BUBBLES (high-sway feathers, fan 4) / GENESIS WAVE rain 6;
  Celebi BLOOM PODS (dripping gears, seed) / LEAF STORM pincer 4;
  Jirachi WISH STARS (stationary orbit anchors, launchType column,
  4.0s) / MILLENNIUM COMET columns 5 ×1.2; Darkrai HAUNTING WISPS
  (homing feathers) / DARK VOID pincer 6 ×1.5; Victini V-SPARKS
  (orbiting launchers, 3.5s) / V-CREATE sweep 6; Diancie JEWEL
  TURRETS (conduits; DIAMOND STORM +1 column per live node) /
  MOONBLAST rain 5; Marshadow SHADOW SNEAK (rush drops 2 fist
  afterimages, 3.0s) / SPECTRAL THIEF clock; Zarude BINDING VINES
  (vine gears, dripEvery 2) / POWER WHIP pincer 6; Pecharunt MOCHI
  PUPPETS (swayAmp 55 feathers, fan 3) / MALIGNANT CHAIN rain 7.
- **Pairing rule held**: no mythic clones its own gauntlet's legendary
  mechanic; cross-gauntlet sibling reuse only.
- **Tests**: two looping duels (A: Kanto–Unova; B: Kalos–Paldea +
  VMAX exclusion), suite 65 → 67. One test-only fix from the first
  run: a warn-value assert had to tolerate the same-frame dt decrement
  (column warns tick down within the spawn frame — assert simultaneity
  + the multiplier's floor, not an absolute value).
- Implementation: two sequential agents (Mew–Victini + infra,
  Diancie–Pecharunt + VMAX guard) over the shared dispatch.
- Next: sentinel openings; entrance-FX/polish column; phase music
  layering; practice mode.

## 2026-07-19 — Milestone 4 Round B: all six remaining legendaries

Every finale legendary now carries the Mewtwo template. Design:
`M4_BOSS_KITS.md` ROUND B section. Infrastructure first, then six kits:
- **Channel params**: `BOSS_CHANNELS` entries take optional
  `params {count, w, gap, warnMul, bounce, color}`; `spawnChannelPunish`
  gained `rain` (distinct gameRand lanes, quick sequence — lanes picked
  by precomputed keys, no gameRand in comparators) and `pincer` (pairs
  close outer→inner, wider-warned center pair), plus `bounce` on sweep
  (second pass, reversed lane order). No-params entries bit-identical —
  the Mewtwo/Lugia/Dialga duel tests all passed untouched.
- **Rayquaza (L9)**: METEOR SHARDS — feather lifecycle generalized with
  `accel` (no sway, commit-fall) and `fan` burst count; phase-2 SKY
  SWEEP drops a 3-comet wake along its path (`boss.sweep.wake`).
  DRAGON ASCENT sweep {6, 0.24}.
- **Zekrom (L15)**: CHARGE CONDUITS — descend-and-hold `s.conduit`
  anchors; each live conduit adds a BOLT STRIKE column at its x.
  FUSION BOLT rain {7, 0.16, #80d8ff}.
- **Yveltal (L18)**: DRAIN WISPS — `s.wisp` spirals home; absorb heals
  +3% maxHp via direct hp mutation (never damageBrick — ledger clean),
  clamped so healing can't re-cross the current phase's entry
  threshold. DARK PULSE pincer {6}.
- **Lunala (L21)**: LUNAR MOTES — `s.mote` anchors exist only during
  PHANTOM PHASE; destroying 2 snaps `phaseT` to 0; a full-duration
  phase converts survivors to aimed crescents. MOONGEIST BEAM columns
  {3, w110, warn×1.3}. **Generic change:** channel-open now clears
  `boss.phaseT` for every boss — a desperation must never be
  uninterruptible (no-op for bosses that never phase).
- **Eternatus (L24)**: VENOM CYSTS — feather-lifecycle drifters flagged
  `s.cyst`; while one lives the phase-1 toxic rain fires 9 instead of
  7 (spawnBossFire reads live cysts, mirroring Zekrom's conduit read).
  ETERNABEAM sweep {4, w90, 0.34}.
- **Koraidon (L27)**: AFTERIMAGES — WILD CHARGE dashes drop 3
  stationary orbit-lifecycle launchers along the path (`s.ghost`
  low-alpha render, single globalAlpha line inside the saved ctx);
  each launches an aimed heavy shock at 3.5s. COLLISION COURSE sweep
  {8, 0.18, bounce} = 16 strikes out-and-back. Duel test runs level 27
  as a trial so `beginEnding()` is never reached.
- Phase-2 cadence garnishes (Lunala/Koraidon) intentionally inherit the
  generic last-stand ×0.62 ability-cd multiplier instead of stacking.
- Verified: suite 59 → 65 (six new duels + all three prior duels as
  regression guards), browser smoke of all six kits + screenshots
  (Zekrom conduit-multiplied BOLT STRIKE, Koraidon afterimage wake),
  console clean, `npm run check`/`verify-assets` green.
- Implementation ran as three sequential agents (Rayquaza+Zekrom /
  Yveltal+Lunala / Eternatus+Koraidon) over the shared dispatch, each
  handing forward the extension shape.
- Next: mythicals + sentinels on the template; entrance FX for the
  styles still on the default banner (skycoil, suncharge, maelstrom,
  timesplit); phase music layering; practice mode.

## 2026-07-19 — Milestone 4 Round A: Lugia + Dialga on the boss template

The Mewtwo duel template (normal-fire answer + charge-interrupt channel +
movement identity + reduced-flash variant) rolled onto the next two
prototype bosses. Design doc: `M4_BOSS_KITS.md`.
- **Shared refactor**: `BOSS_CHANNELS` (data.js) makes the desperation
  channel data-driven — `spawnChannelPunish(boss, pattern)` (update.js)
  dispatches `columns` (Mewtwo, unchanged), `sweep` (5 sequential columns,
  a traveling wall mirrored by boss half), and `clock` (6 clockwise
  strikes, one rotating safe lane starting at the pilot's column). The
  charged-hit interrupt / 1.5s ×1.35 stagger / cd 9 stay uniform template
  constants. Mewtwo's duel test passed untouched — bit-identical.
- **Lugia (L6)**: previously its gust only curved the ball — inert in
  STARFIGHTER. Now: STORM FEATHERS (3 heavy-class 2-HP `aeroring` shots
  on the deferred-shot lifecycle, sine-drift down, burst into 3 aimed
  micros at the ship band, orphan-fizzle, capped at 3), TAILWIND CURRENT
  (`G.gustDir` — player bolts and enemy micros drift ±150/s in shooter
  modes; ball modes untouched; the pilot is never pushed), phase-2
  pursuit (infinity patrol center lerps toward the pilot), AEROBLAST
  sweep channel.
- **Dialga (L12)**: previously `timeWarpT` only slowed the ball — inert
  in STARFIGHTER. Now: CHRONO GEARS (2 anti-phase orbiting 2-HP nodes on
  fixed flank anchors, metronome micro drip, 9s self-expiry), TIME
  DILATION (`enemyShotTimeScale()` next to `ballTimeScale` — square wave
  ×1.7/×0.15 over a 0.45s tick driven by the deterministic
  `G.timeWarpClock`; displacement scaled at integration time, stored
  vx/vy never mutated, audible tick, cast flash now reduceFlash-gated),
  phase-2 volley period ×0.85, ROAR OF TIME clock channel.
- **Side effect noted**: Celebi also sets `timeWarpT`, so its warp now
  lurches shots in shooter modes too — previously inert there;
  thematically consistent, kept.
- Verified: suite 57 → 59 (both new duels + Mewtwo regression green),
  browser duels driven live at desktop/390×844/844×390, console clean,
  reduceFlash checked, `npm run check` + `verify-assets` green.
- Next round: Round B rolls the template across the remaining 6
  legendaries (Rayquaza, Zekrom, Yveltal, Lunala, Eternatus, Koraidon),
  then mythics/sentinels.

## 2026-07-19 — Milestone 3 Round B: objective families (survive)

The first LIVE in-wave objective — a family that changes the win
condition, not just a stat overlay.
- **Framework**: `G.objective` (state.js, set in buildLevel from
  `encounterObjective(lvl)` / `ENCOUNTER_OBJECTIVES` in data.js);
  `updateObjective` (update.js); `drawObjectiveBanner` (render.js — a gold
  top strip naming the objective + a countdown/progress fill).
- **SURVIVE THE MIGRATION**: you can't clear by attrition — periodic
  reinforcements keep the swarm dense; a clear guard holds the wave open
  until the timer ends. On completion the flock DISPERSES (remaining
  flyers become fleeing crossers, so the crosser-exempt clear takes the
  wave) and `G.reinforce = 0` so no grind wave follows. Authored on Hoenn
  challenge (`2:1`, level 8).
- Suite 56 → 57 (survive: no clear-by-attrition, timer, disperse, clear).
- Round C will add the entity-based families (escort / capture / defend).

## 2026-07-19 — Milestone 3 Round A: the reusable encounter director

Generalized Kanto's hardcoded `G.beat` prototype into a data-driven
director (`G.director`), the foundation every region's pacing rides on.
- **Data**: `REGION_GRAMMAR` + `encounterScript(lvl)` (data.js) — each
  region has an `arrival`/`challenge` beat list; unlisted regions fall back
  to `REGION_GRAMMAR_DEFAULT` (never an empty stage). A beat fires ONCE at
  its trigger: `p` (alive/baseline progress threshold) or `afterPrev`
  (seconds after the previous beat fired).
- **Controller**: `updateDirector`/`runBeat` (update.js, replaced
  `updateKantoBeat`). Beat actions: `bonusFlock`, `raid`, `surge`,
  `recovery`, `finalPush` — all reuse existing machinery (spawnBonusFlock,
  squad maneuvers, enemyShotCD/healthDropPity).
- **Threat budget**: `G.director.threatMul` (+ `threatT` window) multiplies
  `starThreatCap` via `directorThreatMul()` — recovery eases it to 0.35,
  surge/finalPush raise it to 1.25–1.4. The "limit simultaneous threat"
  contract is now a real, tested knob.
- **Grammars authored**: Kanto (teaching — bonus flock; raid → recovery),
  Johto (the hunt — surge; raid → recovery → final push). Regions 3-9 get
  the default arc until their M9 pass.
- Behaviour preserved: Kanto's M1 arcs are unchanged, just data-driven.
- Suite 55 → 56 (Kanto arc via the director; generalization + threat-budget
  test with Johto's distinct grammar).

## 2026-07-19 — Mobile-first home and start-flow redesign

- Replaced the crowded three-card title dashboard and duplicate Starfighter
  quick-start with one selected-mode hero: readable description, a single
  **START [MODE]** action, and an equal three-item mode switcher.
- Added large live gameplay dioramas for all modes. Starfighter shows the
  player rig, enemy formation, friendly fire, and incoming shots; Breaker
  shows a Pokémon wall, paddle, rally line, and ball; Blaster shows direct
  volleys and its charged shot.
- Reduced secondary chrome: Daily/Continue sit below the main action,
  Pokédex/Settings move to stable utility targets, and roomy screens use one
  quiet journey/research footer rather than three competing status bands.
- Mobile is the reference layout: stacked preview and copy, 44–50px primary
  touch targets (including the 320×568 compact layout), three partner cards
  per row, and a two-by-two challenge grid. Desktop partner selection moves
  from nine cramped columns to six readable columns.
- Mode selection no longer launches setup immediately; it updates the hero,
  and the primary action opens the selected mode's Partner → Challenge flow.
- Visual QA covered 320×568, 360×800, 390×700, 390×844, and 1280×720;
  browser console stayed clean and the invariant suite remains **55/55**.

## 2026-07-19 — Polish pass: UI fixes + Mew VMAX reward rebalance

Four player-reported items:
- **Results medal overlap**: the objective description ran into the NEW
  MEDAL! / EARNED badge on narrow screens. `drawResults` now measures the
  badge column first and, on phones (`narrow = W < 620`), stacks name+badge
  over the description on a taller row; desktop keeps one line with the
  badge column reserved.
- **OPTION tags covered by hexagons**: the constellation drew each OPTION
  pill inline in the node loops, so a later neighbour painted over it. Pills
  are now COLLECTED (`offerPills`) and drawn in one final pass above every
  node + the pilot core, each on a dark padding cushion.
- **"WIDE PADDLE" in Starfighter**: `wide` (and `laser`) power-ups weren't
  remapped for shooter modes, so pickup announced paddle copy. Added
  `sname`/`sdesc` to those POWERS and made `applyPower`'s announce
  mode-aware (WIDE CATCH / SUPPORT LASERS).
- **Mew VMAX reward** (user decision — two normal picks): retired the
  one-off superpowers. Victory now sets `G.secret.bonusDrafts = 1` and
  drops the rift background (`vmax = false`); the first pick chains a
  second normal draft via `chainBonusDraft` (input.js), then Johto. No
  reroll block (bonus drafts are normal, rerollable). `SECRET_UPGRADES`/
  `applySecretUpgrade` kept only for grandfathered saves. Test rewritten.

## 2026-07-19 — Milestone 2 Round A: resonance, overcharge, Spectral Veil

- **Resonant release**: `RESONANCE_WINDOW` (0.38s, state.js) after the
  charge tops out; `G.chargeFullT` clocks it (update.js charge block);
  `fireCharge(c, resonant)` applies +25% power / +1 pierce / ×0.7 heat +
  chime + `statsResonant()`. FIRE pad label walks % → RESONANT! →
  RELEASE! → OVERCHARGE.
- **Overcharge**: >1.4s on a full charge → `addWeaponHeat(dt*0.4)` — nets
  ≈ +0.12 heat/s over passive cooling, so hoarding costs.
- **Spectral Veil**: `br.specVeil` assigned in buildLevel (region 3+,
  ≤2 spirit-type flyers, junkie, non-boss; one-per-run teach card);
  `specVeilActive` cycles 2.0s on / 1.4s off; charged bolts `continue`
  through active veils in the bolt block (no pierce/lastHit spend);
  dashed-halo shimmer tell in the bareMon render path.
- **Tests** (53 → 55): resonance boost/count, plain-release contrast,
  overcharge net heat, sustained-spam overheat band [5, 10.5]s, fire-rate
  upgrades never crueller; veil active/open windows both directions.

## 2026-07-19 — Milestone 1 Round D (part 2): Kanto sky life + demo audit

- **Distant flocks** (scenery.js `updateFlocks`/`drawFlocks`): loose V
  formations of tiny stroke-drawn bird silhouettes drift across Kanto's
  high sky (≤2 flocks × 5 birds, no gradients, behind the weather layer,
  Kanto-gated). Background life with zero readability cost.
- **Kanto demo audit** (scripted bot, Normal, seed KANTO-AUDIT, fire
  starter, naive steering/dodging, blind 7s charges, no Mega): full
  Kanto in ~205s play, 2 knockouts, finished 1/4 HP, 79 kills. Damage
  taken = micro-class fire almost exclusively (fist/prism/wisp/boulder)
  + 2 Psystrike columns — the readable-danger contract holds. Boss
  clocks: Mewtwo P1 2.8s / P2 14.7s; Mew 11.4/6.1/15.6s. Spam fire →
  27 overheats / 54s locked (the heat lesson bites as designed).
- **Tuning notes for the Milestone 9 pass** (not bugs): Mewtwo P1 melts
  too fast for the focus-orb showcase to breathe (consider +P1 HP share
  or first-orb-volley-on-engage); stage-3 entry pressure can spike a
  1-HP carryover pilot (crystal/heavy at 9s) — potion pity into finales
  may deserve a nudge.
- **Milestone 1 declared COMPLETE**: results/medals/intros (A), authored
  beats (B), the Mewtwo duel (C), flight log + sky life + audited demo
  baseline (D). Remaining Kanto polish rides M2 (combat ecology) and the
  M9 balance pass.

## 2026-07-19 — Milestone 1 Round D (part 1): the flight-log narrative

- `STAGE_FLAVOR`/`stageFlavor` (data.js): one authored expedition-log line
  per stage, surfaced on the results screen (`R.flavor`, italic muted
  wrap under the next-stage tease; hidden on short viewports). Kanto's
  three lines seed the campaign voice and tease Johto; other regions get
  theirs in Milestone 9's polish pass. Zero pacing cost — it rides the
  existing one-tap interstitial.
- Still queued for Round D part 2: Kanto-specific ambient scenery motion
  (drifting flocks over the hills) + the demo polish pass.

## 2026-07-18 — Milestone 1 Round C shipped: the Mewtwo duel

- **Focus orbs** (bossAbility case 150 + `s.orbit` handling in the
  enemy-shot loop): P1 alternates teleport with a three-orb summon —
  2-HP boss shots that ride the summoner (age-frozen while orbiting, so
  the 9s ballistic cull starts at launch), deniable by basic fire,
  launching as aimed heavy shots after ~4s, fizzling if Mewtwo dies.
- **Psystrike channel** (boss block + bolt-block interrupt): <15% HP →
  rooted 2.6s channel (fire quiets, teleport cancelled, abilities pause);
  complete → five warned columns with dodge lanes; a charged hit breaks
  it → 1.5s stagger, boss fire holds, damage ×1.35 (multiplier lives in
  damageBrick next to the mastery stacks). 9s recur cooldown.
- reduceFlash: channel pulse rings are skipped; combat notices + the
  column warn phases carry the danger information.
- Suite 51 → 52 (summon/orbit/deny/launch/fizzle + channel/break/
  stagger-window/columns). Two-phase legendary contract preserved.

## 2026-07-18 — Milestone 1 Round B shipped: Kanto authored beats

- `G.beat` (buildLevel, junkie region-1 non-boss) + `updateKantoBeat`
  (update.js): Arrival's BONUS FLOCK (harmless `br.crosser` fly-bys —
  no flight slot, excluded from the shooter pool, the blocksStatic
  position snap, the dramatic slow-mo, and the clear condition; +150 and
  Mega per chain kill, escape off-screen if ignored) and Challenge's
  RAID → RECOVERY arc (early raid maneuver with warning, then a 3.4s
  fire hold + primed heal pity).
- Suite 50 → 51 (beat arcs, crosser isolation, clear exemption).
- Deliberately Kanto-scoped; Milestone 3 generalizes the grammar.

## 2026-07-18 — Milestone 1 Round A shipped: results, medals, region intros

- **Stage results interstitial**: `G.state === 'results'` between clear and
  draft. `buildStageResults` (state.js) snapshots the cleared level's
  ledger + evaluates `stageObjectives(lvl)`; `drawResults` (render.js)
  renders hero title, ledger rows, objective list with NEW MEDAL / EARNED
  states, the not-saved notice for trial/daily/cheated, and the next-stage
  tease; `advanceResults` (input.js — tap, Space, Enter, Esc; 0.45s dwell
  gate) routes results → pending act ceremony → draft. The ceremony now
  PENDS (its `G.state='ceremony'` override was removed from the clear
  block). Paddle/HUD suppressed during results; announces cleared at entry.
- **Mastery objectives + medals**: `STAGE_OBJECTIVE_SETS` +
  `DEFAULT_OBJECTIVE_SETS` (data.js), Kanto fully authored; `MEDALS` map
  persisted at `pkbrk-medals` (DAILY_RECORDS pattern); new ledger counters
  `intercepts` + `shellCracks` feed the checks.
- **Region intros**: `REGION_INTROS` (data.js) hero card + `SFX.regionIntro`
  sting on every arrival wave; junkie arrivals now grant a 3.4s
  first-volley grace (state.js) so the card honours the lane invariant —
  CLAUDE.md's hero-announcement rule updated to codify the contract.
- **Audio**: `SFX.stageClear` fanfare, `SFX.medal` sparkle, `SFX.regionIntro`.
- **Tests** (suite 48 → 50): results flow (grace window, payload identity,
  dwell gate, tap-through), medal persistence + repeat-clear EARNED
  semantics + results→ceremony→draft ordering.

## 2026-07-18 — Milestone 1 planning (Kanto vertical slice)

M1 decomposes into rounds; each ships through the full quality gates:

- **Round A (SHIPPED — see entry above):** stage-results interstitial (`G.state ===
  'results'` between wave clear and the draft, powered by the M0 ledger),
  Kanto mastery objectives + persistent medals (`pkbrk-medals`,
  `STAGE_OBJECTIVE_SETS` in data.js with per-stage-type defaults for
  unauthored regions), region-intro hero cards (`REGION_INTROS`), and the
  stage-clear/region/medal audio stings. Results must stay ONE TAP to
  continue — arcade pacing is a design invariant.
- **Round B (next):** Kanto authored encounter beats. Arrival: a scripted
  low-risk BONUS FLOCK beat (a swift crossing line of unevolved birds that
  don't fire, rewarding group destruction) when the main squad is half
  down. Challenge: a mid-stage RAID escalation with a warning strip, then
  a recovery beat (brief calm + guaranteed orb/heal drop). Implemented as
  a small Kanto-keyed beat controller (`G.beat`) — deliberately minimal,
  the seed Milestone 3 generalizes into the encounter director.
- **Round C (NEXT — design locked):** Mewtwo rebuilt as the boss-framework
  prototype (shared with Milestone 4). Keep the two-phase STARFIGHTER
  legendary contract (the boss-harness test asserts it; Mew stays the
  three-phase finale) but make the phases mechanically DISTINCT:
  - **P1 · FOCUS ORBS (normal-fire answer):** Mewtwo periodically summons
    three slow psy-orbs that orbit him (spawned as boss enemy-shots with
    `interceptHP 2`, zero velocity + orbit fields). Shot down in time =
    clean deny; ignored ~4s = they launch as aimed HEAVY shots. Teaches
    "normal fire clears the sky".
  - **P2 · PSYSTRIKE CHANNEL (charge answer / desperation):** below ~15%
    HP Mewtwo channels 2.6s behind a big telegraph; uninterrupted, it
    fires a five-column barrage (reuse `G.columnStrikes`); a CHARGED hit
    landing during the channel CANCELS it and staggers him 1.5s (bonus
    window). Implement via `br.channel {t,dur}`, cancel check in the bolt
    block where `L.charged` lands on a channelling boss.
  - Reduced-flash variants for every new effect; boss-harness tests for
    orb deny, orb launch, channel fire, channel interrupt.
- **Round D:** narrative cards + Kanto scenery motion + demo polish pass.

**Decisions:**
- Medals persist by absolute level key ('1'..'27'), so future region
  reordering would need a migration — accepted; levels are stable.
- Trials/dailies/cheated runs EVALUATE objectives on the results screen
  (labelled "not saved") but never write medals — keeps trial jumps from
  farming medals with granted builds.

## 2026-07-18 — Milestone 0 kickoff: baseline audit

**Audit findings (what already exists, to extend rather than duplicate):**
- `G.runStats` (state.js:233, reset at state.js:1309) already tracks
  bricksBroken / bossesDefeated / itemsCaught / damageTaken;
  `G.lastDamageCause` is a display string; `finalizeRun` (update.js:1597)
  snapshots `G.runSummary` for the game-over screen. This is the seed of the
  Milestone-0 stats layer.
- Seeded gameplay RNG exists: `setRunSeed`/`gameRand`/`hashSeed`
  (config.js:31-49). Daily mode uses it (`dailySeed`). Cosmetic effects
  intentionally use raw `Math.random()` so visuals don't repeat.
- Trial mode is already a debug launcher: region × stage grid + gauntlet
  round row (+ Mew VMAX secret tile), grants tree advances via
  `resetRun(startLevel, trial=true)`.
- Cheat panel (pause screen) grants power-up/shield/mega/life/element.
- `test.html` is a 45-check headless invariant suite with
  `window.TEST_RESULTS` automation output.
- README's own roadmap section lists "local balance telemetry" as wanted —
  confirming the stats layer was known-missing.

**Unresolved design decisions:**
- Release identity (fan project vs original universe) — user decision,
  parked until Milestone 10.

**Built this round (Milestone 0):**
- **Stats layer** (state.js `stats*` helpers + hooks across update.js /
  input.js): one record per wave ATTEMPT on `G.runStats.levels` — time,
  kills, damage-in by projectile family (`loseLife(cause, shot)` now takes
  the shot object), damage-out by `meta.source` on `damageBrick`
  (bolt/charge/ball/splash/other), charge uses + wasted charges (laser cull
  checks `L.charged && !bhits && !hits`), overheats + weapons-locked
  seconds, absorbs/deflects, Mega uses, draft picks + rerolls (recorded on
  the CLEARED level's record, before buildLevel opens the next), boss phase
  durations (`br.phaseClockT`, engagement-clocked), knockouts;
  `SESSION_STATS` counts restarts/quits across resets.
- **js/dev.js** (new 11th module, loaded before main.js; local-only):
  URL/console dev launches (`?dev&level=&region=&stage=&round=&mode=&diff=`
  `&starter=&seed=&upg=&real=1`), `window.DEV` API (launch/boss/grant/
  report/download/panel/seed/levels/help), the JSON balance report
  (`devRunReport` — includes why the run ended), and the F9 DOM dashboard
  overlay (deliberately DOM, not canvas: zero hot-loop cost).
- **`jumpToGauntletRound(round)`** extracted into update.js — shared by the
  trial picker, dev launches, and the boss harness.
- **gallery.html**: projectile readability audit rendered by the game's OWN
  `drawProjectiles`/`drawTypedBolt` — 18 type kinds + 43 boss silhouettes ×
  all 4 SHOT_CLASSES + 17 player bolt shapes × 3 tiers, each split
  bright-sky/dark-arena with dashed honest hitR + art-radius overlays.
- **Determinism fix**: `rollUpgradeChoices`' satellite backfill called
  `gameRand()` inside a sort comparator (engine-defined draw count —
  desyncs seeded runs across browsers); now one draw per satellite,
  precomputed. Audit confirmed ALL other sim randomness routes through
  `gameRand()` and all 33 raw `Math.random()` sites are cosmetic-only.
- **3 new tests** (suite 45 → 48): the instrumentation ledger end-to-end,
  the boss phase harness (round jumps, 2/3-phase math, timed phases,
  shockwave + escape spoke, 0.78s damage gate, last-stand adds), and
  seeded dev-launch reproducibility (same seed → identical wave).

**Decisions:**
- Stats stay run-scoped in memory (download to keep); only restart/quit
  counters persist across resets, and nothing touches localStorage — keeps
  the analytics-local guarantee trivially true.
- Boss phase clocks start on first damaging hit (engagement), not entrance
  ceremonies — that is the number balance tuning needs.
- The dashboard is a DOM overlay, not canvas UI: dev-only surface must never
  add cost or hit-test complexity to the game loop.
