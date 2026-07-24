# AETHERFALL — realm finales and campaign variety plan

> **Living execution plan · 2026-07-23.**
>
> This is the handoff-ready design for replacing Aetherfall's repeated
> Heralds/Sovereign/Mythic finale ladder and for breaking repetition across
> the rest of the 27-stage expedition. It is the detailed scope document for
> **AFT-020** in `AETHERFALL_IMPROVEMENT_BACKLOG.md`.
>
> **Immediate sequencing decision:** run the baseline half of AFT-008 first,
> execute AFT-020 in the vertical slices below, then close AFT-008 against the
> redesigned campaign. Do not spend a full balance pass tuning the finale
> structure that this plan replaces.

## 1. Intended outcome

A player should remember the nine realms as nine different adventures, not as
nine skins over the same sequence.

The new campaign rhythm is:

> **Enter a realm → learn its rule → face a complication → resolve its unique
> finale → carry a visible consequence forward.**

The boss change is the center of the work, but not the whole work. The same
repetition currently appears in four places:

1. every finale is Heralds/Sentinels → Sovereign → Mythic;
2. many signature attacks still resolve as a fan, lane strike, sweep, or
   universal low-health charge interrupt;
3. non-boss encounter scripts use only five beat actions and just three stages
   in the campaign have a special win condition;
4. nearly every clear has the same results → three-offer draft cadence.

The plan preserves the content that already works: the 43 boss reveals, the
259-unit art library, the 21 Relicforge weapons, the authored formation
families, the six-path upgrade web, the two affinities, the Ninefold Dawn
ending, the deterministic trial tools, and the mobile performance gate.

## 2. Product decisions

### Aetherfall leads the fiction

Design and player-facing language start with Aetherfall:

- realm, not region;
- vessel, not partner;
- Aspect, not type;
- Surge, not Mega;
- Herald / Vow / Colossus / Sibyl / Paladin / Totem / Engine / Vessel for
  the opening cast;
- Sovereign for the realm's central boss;
- Mythic, anomaly, ally, invader, or coda according to its actual role.

The shared engine still supports both skins. Mechanics belong in engine data;
Aetherfall names, ids, titles, scene copy, and role descriptions belong in
`SKIN.*`. The Pokémon workshop skin receives equivalent slot-based mechanics
and its own copy, but it is no longer the creative source for the public game.

### One traditional ladder, not nine

Greenspell remains the only recognizable three-part ladder. It establishes a
grammar that the next eight realms deliberately break.

### Keep every headliner, change its role

No boss art is discarded. A Mythic does not need another three-phase health
bar to matter. It may be:

- a short mirror coda;
- a recovery or reward event;
- an invading second timeline;
- an ally in the climax;
- a saboteur inside another fight;
- a rescue target;
- one half of a linked final encounter.

### Variety comes from rules, not density

Do not solve repetition with more bullets, more health, or more particles.
Each realm owns a rule that changes how the player reads space, timing, target
priority, or risk.

### One progression economy

Do not add realm coins, boss currency, keys, crafting dust, or a seventh path.
Finale mastery changes choice quality and presentation, not the number of
permanent ranks awarded. The Marches Rift remains the one explicit choose-two
exception.

## 3. Current-state diagnosis

### What is already varied

- All 18 non-boss Starfighter stages have authored formation layouts in
  `JUNKIE_CHOREO`.
- All nine realms have bespoke rosters, habitat packs, palettes, music
  arrangements, entrances, boss identities, and stage flavor.
- Arrival, Challenge, and finale skies already use 27 different sky states.
- Bosses have different movement styles and projectile silhouettes.
- Survive, escort, and defend prove that non-attrition objectives work.
- The results ledger, Trial Mode, boss-phase launcher, reveal scene, safe
  zones, and artifact-storm benchmark provide the right production rails.

### Where the repetition actually lives

- `buildLevel()` creates the same dormant Sovereign, opening group, and final
  Mythic structure for every finale.
- `updateGauntlet` advances only when the previous role has no living entity.
- all 18 Sovereigns/Mythics inherit the same 15%-HP channel rhythm and the same
  stagger reward;
- `REGION_GRAMMAR` recombines `bonusFlock`, `raid`, `surge`, `recovery`, and
  `finalPush`, so the formation looks different but the dramatic verbs repeat;
- only Drowned Challenge, Foundry Arrival, and Spire Challenge change the
  stage's win condition;
- four global modifiers recur across all realms without realm-specific
  meaning;
- stage labels remain ARRIVAL / CHALLENGE / LEGENDARY even when the fiction
  describes a migration, escort, rite, tournament, or siege;
- all ordinary clears lead to the same upgrade hand, and the region clear is
  only distinguished by a larger heading and score bonus.

## 4. The nine realm finales

### Realm 1 — Greenspell Marches: **THE FIRST COVENANT**

**Format:** the one classic ladder.

**Cast:** Frost Herald, Storm Herald, Ember Herald → Velmora, the First
Oracle → Lumine, the First Dream / Lumine Ascendant.

**Opening — The Triune Ward**

- The three Heralds are one coordinated mechanism, not three unrelated HP
  bars.
- One Herald is the active voice; the others maintain two sides of a visible
  ward.
- Answering the active Herald's Aspect rule rotates the opening and exposes a
  seam through all three.
- Defeating one creates a permanent gap in the ward, so progress visibly
  changes the formation.

**Core — Velmora remembers**

- Velmora records the vessel's prior position during BLINK STEP.
- A harmless first echo demonstrates the memory.
- Later echoes form delayed lines or a triangle around previous positions.
- The player succeeds by moving with intention, not by reacting to another
  fan of shots.
- Breaking two memory anchors produces a long, obvious punish window.

**Coda — The First Dream**

- Lumine copies the silhouette of the player's current weapon and returns a
  slower, readable dream version.
- This is a short mastery coda, roughly 35–45% of Velmora's combat time.
- The existing three-piece Marches Rift still replaces ordinary Lumine with
  Lumine Ascendant and preserves the choose-two bounty.

**Why this stays a ladder:** it teaches opening group, main rule, coda, and
secret. Later realms can now violate a pattern the player understands.

### Realm 2 — Belltower Reaches: **THE GALE RELAY**

**Format:** one continuous pursuit; no round reset.

**Cast:** Storm Vow, Ember Vow, Tide Vow, Zephyrion, Verdandi.

**Rule:** the wind defines the safe corridor.

- The Vows carry a single storm core and pass it around the arena.
- Only the carrier can be meaningfully damaged; the other two draw the next
  corridor with banners and wind lines.
- The player completes three clean passes rather than emptying three separate
  health bars.
- Zephyrion descends into the still-running encounter and absorbs the core.
- Zephyrion bends player and enemy projectiles through broad corridors, then
  dives through the space it just defined.
- The last remix combines a rotating outer gale with a calm eye.

**Verdandi coda:** the storm rewinds into Hourseed blooms. Collecting or
striking blooms before they vanish improves the Victory Draft's control. It is
a restorative reward event, not another boss.

### Realm 3 — Drowned Expanse: **SIEGE OF THE DEEP CURRENT**

**Format:** environmental siege; the Sovereign is present from the start.

**Cast:** Tide, Frost, and Hull Colossi; Thalassar; Mirajin.

**Rule:** the path behind Thalassar becomes dangerous.

- Thalassar circles the arena from the opening but cannot be damaged while
  three Colossi maintain the pressure seal.
- The Colossi become moving monolith stations with readable weak seams.
- The player chooses the destruction order.
- Each broken Colossus removes one hazard but strengthens one different
  property of Thalassar's final weather. The order is a play-style choice,
  not a hidden correct answer.
- Thalassar's body path leaves a delayed current trail; later attacks reverse
  whether the trail or open water is safe.
- The climax forms a narrowing current tunnel. Three exposed pressure nodes
  can widen it.

**Mirajin coda:** three falling wishes represent Commit, Adapt, and Explore.
Choosing one determines the shape of the Victory Draft without awarding an
extra permanent rank.

### Realm 4 — Foundry Peaks: **THE FRACTURED HOUR**

**Format:** protect objective that becomes a linked dual-timeline encounter.

**Cast:** Anvil, Piston, and Furnace Sibyls; Clockwork Regent; Nocthern.

**Rule:** every major event happens twice.

- The three Sibyls begin as hostile inspectors but are awakened into timeline
  anchors through short target-order tests.
- Once awakened, they become friendly forge clocks that must survive.
- The Clockwork Regent records major attacks as pale ghost paths and replays
  them several seconds later.
- The player can damage the Regent only while at least one anchor is ringing.
- At the midpoint Nocthern steals one timeline rather than waiting as a third
  round.
- The arena alternates Forge Hour and Still Hour. Regent and Nocthern share
  the encounter budget and alternate vulnerability.
- The climax overlaps one current pattern with one clearly previewed replay;
  it does not double the live bullet count.

**Reward consequence:** surviving Sibyls improve Victory Draft control by
weighting one Commit, Adapt, or Explore family. They never raise the five-offer
ceiling or add extra picks.

### Realm 5 — Chrome Sprawl: **TRIAL OF THE LIVE GRID**

**Format:** a branching opening duel feeding a circuit boss.

**Cast:** Chrome, Granite, and Verdant Paladins; Voltrex; Ignivar.

**Rule:** power follows a circuit that can be redirected.

- The player chooses one Paladin to challenge in a short 20–30 second duel.
- The chosen Paladin determines the first circuit grammar: fast branching,
  slow heavy relays, or growing/restoring nodes.
- The other two Paladins become neutral grid terminals rather than waiting
  enemies.
- Voltrex's attacks illuminate their complete route before electricity moves.
- Later circuits include the player's position as the final node, teaching
  bait-and-move.
- Destroying or striking the charged terminal redirects the circuit into
  Voltrex and re-lights one part of the Sprawl.

All three Paladin routes are sidegrades. Their P50 clear time and completion
rate should remain inside the Section 9 route-choice thresholds; none is the
quiet “easy route.”

**Ignivar coda:** Ignivar enters during the climax as a moving Victory Flame.
Staying in its wake is safe and score-rich; falling away is safer but earns
less draft control. Ignivar is not fought.

### Realm 6 — Spire of Glass: **THE FALSE FOUNDATION**

**Format:** hunt and rescue.

**Cast:** Foundation Serpent; Nyxharrow; Lucerna.

**Rule:** the Carrion Shadow steals power only from marked space.

- The Foundation Serpent sheds glass cells into mirrored routes.
- The player must identify and break real cells among reflections to stop the
  Spire from sealing itself.
- Nyxharrow enters before the hunt fully ends and casts wing-shaped shadow
  sectors.
- A sector drains Surge and restores Nyxharrow only if the vessel occupies it
  when it closes.
- Nyxharrow tethers one shadow seed to the vessel; the seed can be destroyed
  or lured into a glass facet.
- Lucerna is visible, imprisoned inside those facets.
- Reflecting three marked attacks into the prison frees Lucerna, whose prism
  opens the final damage window.

**Structure result:** one opening hunt, one main boss, one rescue climax—no
single-member “trio” followed by two solo fights.

### Realm 7 — Rift Atolls: **THE ECLIPSE RITE**

**Format:** ritual tests flowing into a Sovereign fight with a saboteur.

**Cast:** Storm, Dream, and Grove Totems; Pale Eclipse; Umbrix.

**Rule:** the moon state changes which gates are solid.

- Each Totem conducts a brief non-HP rite: follow a rotating opening, match a
  pulse, or break a growing root before it closes the ring.
- Success carries a visible Totem mark into the Sovereign encounter.
- The Pale Eclipse alternates bright and dark crescent gates. Shape, stroke,
  and motion—not color alone—identify the active set.
- Portal pairs preview their exit paths before redirecting attacks.
- During the full eclipse Umbrix steals the player's weapon silhouette and a
  portion of banked Surge.
- Tagging Umbrix three times reclaims both and causes the stolen attack to hit
  the Pale Eclipse.
- Completed Totem marks each keep one safe star active during the climax.

### Realm 8 — The Crucible: **THE SERAPH RAID**

**Format:** simultaneous stadium raid with one shared objective meter.

**Cast:** Volt Engine, Drake Engine, Frost Destrier; Omega Seraph; Vyrakka.

**Rule:** the arena is being assembled into a weapon.

- Omega Seraph is visible overhead from the opening and gradually assembles a
  crown-lance from arena segments.
- The three captains occupy distinct jobs: energize, reinforce, and freeze a
  crown segment.
- Damaging the correct captain fills the Break meter; ordinary damage to the
  Seraph is secondary until a segment is exposed.
- Broken segments become temporary cover or ricochet surfaces.
- The crowd meter responds to counters, rescues, and clean dodges—not raw
  damage per second.
- Vyrakka begins bound by the arena's control vines. Breaking the binding is
  an optional risk that makes Vyrakka tear open a crown segment.
- The climax is one short coordinated damage window after the weapon fails.

**No sequential cleanup:** captains, Sovereign, and Mythic all matter inside
one raid.

### Realm 9 — Sundered Cradle: **THE FIRST FUSION**

**Format:** branching route, moving chase, linked two-boss climax.

**Cast:** Vessel of Moss, Snow, and Earth; Aurelion Prime; Marionne.

**Rule:** momentum commits the First Fusion to a path.

- Choose one Vessel as the route into the Cradle. Its Aspect determines the
  environmental support and one hazard family; the others remain visible as
  sealed paths.
- Aurelion is fought through a horizontal/vertical chase with a distance
  meter rather than a stationary health-bar prelude.
- Road markings, dust, and sound identify the true committed lane.
- A missed Aurelion charge breaks one of the Cradle's locks.
- Marionne possesses the two unopened Vessels and uses them as puppet hazards
  during the chase instead of waiting for a final separate round.
- In the climax Marionne chains itself to Aurelion. The player must bait
  Aurelion into breaking the chains, then damage the exposed pair.
- The last successful collision cracks the Sundering seam and enters the
  existing ending immediately.

**Reward:** no draft before the Ninefold Dawn. Completion records, Theater /
Time Spiral hooks, and the ending are the reward.

## 5. Boss attack redesign

### The attack-state contract

Every major attack uses these states:

1. **teach** — harmless or forgiving demonstration;
2. **tell** — unmistakable shape, sound, direction, and counter cue;
3. **commit** — the boss or hazard becomes locked into the action;
4. **resolve** — success/failure is evaluated once;
5. **recover** — a visible punish or relief window.

This replaces “cooldown expired, spawn pattern” as the authored boss layer.
Generic fire may continue as low-pressure texture, but the threat director
must thin or pause it during a lethal major mechanic.

### Nine distinct primary verbs

| Realm | Primary verb | Player decision |
|---|---|---|
| Greenspell | **Remember** | Leave safe previous positions; break memory anchors |
| Belltower | **Route** | Read and follow a moving wind corridor |
| Drowned | **Trail** | Decide whether the boss trail or open arena is safe |
| Foundry | **Replay** | Plan for current and previewed future attacks |
| Chrome | **Redirect** | Bait and reroute a visible circuit |
| Spire | **Mark** | Escape or weaponize a closing shadow sector |
| Atolls | **Phase** | Read which gates exist in the current moon state |
| Crucible | **Assemble** | Break the component building the next attack |
| Cradle | **Commit** | Lure a momentum-locked charge into a target |

### Counter-answer budget

Charge interruption must not remain the answer to almost everything.

- no more than three finales use a charge interrupt as a primary solution;
- at least three reward sustained normal fire;
- at least three reward movement/baiting;
- at least two use protection or target-order play;
- at least two offer an Aspect-matched offensive opening, while neutral damage
  remains viable;
- every Breaker adaptation uses the ball, rebound geometry, or destructible
  boss bricks—never a hidden gun.

### Phase progression

Boss progression may be triggered by:

- objective completion;
- a shared encounter meter;
- broken anchors or segments;
- a successful redirect;
- a route transition;
- linked actor state;
- HP thresholds only where HP is genuinely the dramatic measure.

Do not give every Sovereign three phases. Use one, two, or three named beats
according to the format.

## 6. Mode adapters

The fantasy and success condition remain shared; execution adapts by mode.

### Breaker

- no hostile enemy fire, preserving the calm contract;
- safe corridors become ball-curvature zones or moving rebound rails;
- anchors, cells, terminals, chains, and crown segments are ball-breakable
  bricks;
- a precise rebound or high-ground return can cancel a major action;
- temporary geometry must not trap the ball or make a miss unavoidable;
- the paddle never gains a gun.

### Blaster

- moderate player-movement requirements;
- shootable anchors, circuits, tethers, and segments;
- charge can pierce or cancel selected mechanics, not every mechanic;
- keep simultaneous hazard count below Starfighter's budget.

### Starfighter

- full corridor, pursuit, raid, protection, and chase choreography;
- compact player hitbox and current ship band remain authoritative;
- major mechanics spend the existing threat budget instead of stacking over
  ordinary fire;
- charge shortens some objectives; basic fire remains the efficient answer to
  small interceptors.

## 7. Variety outside the finales

### 7.1 Expand the encounter-director vocabulary

Keep the existing five beats, but stop asking them to carry the entire
campaign. Add a small reusable set:

- **formationReveal** — the formation changes silhouette after a clear tell;
- **eliteIntervention** — one named-role elite changes the current problem;
- **splitFront** — two squads take different jobs or lanes;
- **pursuit** — a target attempts to escape and does not block the normal
  clear if missed;
- **controlNodes** — activate or destroy 2–3 positions in an authored order;
- **supplyRun** — optional dangerous targets release recovery or temporary
  resources;
- **hazardPulse** — one realm-specific environmental rule cycles briefly;
- **ceasefireChoice** — a short breather with two visible optional targets;
- **victoryBeat** — the last few enemies transform or flee instead of always
  entering `finalPush`.

Each realm should use no more than two new beat families. Reuse is desirable
across non-adjacent realms; adjacent realms must not share the same dramatic
arc.

### 7.2 Give every realm one non-attrition stage identity

Do not make all 18 regular stages objectives. Target one primary objective per
realm, with lighter optional mastery on the other stage.

| Realm | Authored non-boss identity |
|---|---|
| Greenspell | **Cleanse the ward** — destroy three linked ward sources; the ordinary flock disperses |
| Belltower | **Ring the sky bells** — cross three moving control zones in order |
| Drowned | **Survive the migration** — keep the shipped timer objective |
| Foundry | **Escort the courier** — keep the shipped friendly objective |
| Chrome | **Run the live lanes** — follow a changing safe traffic circuit while clearing marked targets |
| Spire | **Defend the beacon** — keep the shipped friendly objective |
| Rift Atolls | **Stabilize the ley crossing** — hold two alternating nodes; LIGHT/DARK changes presentation, not the rule |
| Crucible | **Win the undercard** — three short scored waves with a shared crowd meter |
| Sundered Cradle | **Seal the echoes** — three prior-realm verbs return in forgiving miniature |

Failure should usually revert to an ordinary clear, as escort/defend already
do. Optional objectives must not end a long expedition through surprise
failure.

### 7.3 Make enemy roles matter

Habitat packs currently change who appears more than what the encounter asks.
Add reusable, visible roles without species-specific code:

- **standard** — formation body;
- **vanguard** — leads dives or protects a lane;
- **artillery** — slow, heavily telegraphed siege action;
- **support** — powers a shield, circuit, heal, or formation morph;
- **courier** — carries an optional resource and tries to escape;
- **anchor** — holds the formation or objective together.

Role is assigned by encounter data and communicated by silhouette treatment
and position. HP alone must not silently turn a unit into artillery.

Each normal stage should feature at most one special role early, two late.
This keeps the screen readable and makes the role learnable.

### 7.4 Replace four generic modifiers with realm-authored conditions

The current Winds / Ambush / Swift / Bounty pool can remain as fallback
mechanics, but player-facing conditions should be authored per realm:

- Greenspell: wandering wards;
- Belltower: crosswinds and bell cadence;
- Drowned: rising current / low-visibility squall;
- Foundry: heat cycle / conveyor shift;
- Chrome: grid surge / blackout;
- Spire: reflection / pane fracture;
- Atolls: ley phase;
- Crucible: crowd decree / sudden-death round;
- Cradle: memory echo / fusion instability.

Prefer parameterized versions of existing physics. Add a new mechanic only
when it creates a new decision.

Do not randomize away realm identity. Arrival conditions are authored;
Challenge may choose between two seeded variants; Time Spiral may combine
conditions after they have been learned.

### 7.5 Give all 27 stages distinct display titles

Keep internal indices and `STAGE_NAMES` stable. Add optional
`SKIN.stageTitles[realm][stage]` for presentation:

- realm-specific title, e.g. **HEDGEROW AWAKENING**, **WARDSTORM**, **THE
  FIRST COVENANT**;
- structural subtitle remains ARRIVAL / CHALLENGE / FINALE for orientation;
- results, Trial Mode, and checkpoint copy show both.

This is a presentation win with low mechanical risk and makes Trial Mode much
easier to remember.

### 7.6 Let the environment react to play

The 27 skies are already distinct, but the landmark and ambient state usually
remain fixed through a stage.

Add at most three state changes per stage:

1. one large slow background change;
2. one landmark response;
3. one ambient family.

Examples:

- Greenspell wards extinguish as sources fall;
- Belltower bells ring and streamers align with the live corridor;
- Drowned waterline or pressure glow changes after each Colossus;
- Foundry clocks visibly skip during replays;
- Chrome districts relight after redirects;
- Spire panes crack where reflected attacks land;
- Atolls moon/ley state follows the active gate;
- Crucible crowd lights track the Break meter;
- Cradle sealed routes rejoin during the final chain break.

During lethal tells, decorative motion slows and contrast recedes. No scenic
response may compete with threat readability.

### 7.7 Vary the stage-clear and reward cadence

Keep one permanent upgrade per ordinary clear.

**Arrival — Field Find**

- the existing Commit / Adapt / Explore hand;
- short realm arrival consequence on the results screen;
- no extra modal.

**Challenge — Preparation**

- the same permanent upgrade count;
- completing the realm objective adds one preparation benefit for the finale:
  an extra visible offer, a pinned reroll, a starting shield, or an objective
  shortcut according to realm;
- preparation is temporary and expires after the finale;
- preparation never increases the five-offer ceiling, creates a second
  fusion/apex candidate, pushes shields above cap, or skips the finale's
  signature teach and first real test;
- if the authored benefit would duplicate a full resource, convert it to a
  one-use intercept, a small heat vent, or offer-family weighting;
- failure never removes the normal draft.

**Finale — Victory Draft**

- base: choose one permanent upgrade from four visible offers;
- **Countered:** complete the signature counter once → reveal a fifth offer;
- **Mastered:** satisfy every major-beat counter → pin one offer and reroll
  the rest once;
- never award a second permanent pick except the completed Marches Rift;
- final Cradle victory enters the ending before any draft.

The reward screen should show the realm's healed landmark, crest, mastery
result, and draft on one flowing surface. Avoid results → stamp → postcard →
reward → draft as five separate taps.

### 7.8 Make mastery specific to the encounter

Replace generic finale objectives such as “take no hits” as the only
aspiration. Keep a no-knockout medal, but pair it with rules the fight taught:

- escape all memory echoes;
- complete every storm-core pass;
- break all pressure nodes;
- save two Sibyls;
- redirect three circuits;
- free Lucerna;
- recover the stolen shadow;
- break every crown segment;
- shatter every puppet chain.

These are more memorable, more teachable in a boss dossier, and less biased
toward already-dominant builds.

### 7.9 Use the three acts as mechanical development

**Act I — Old Magic: assemble and read**

- one mechanic at a time;
- target order, formation silhouettes, corridors;
- generous recoveries and explicit teaches.

**Act II — Ascendancy: transform and operate**

- systems with state: anchors, replays, circuits, reflection;
- more target-priority decisions;
- mechanics change role mid-encounter.

**Act III — Convergence: combine and choose**

- two previously learned verbs interact;
- optional assistance and branching routes;
- no surprise rule in the final seconds—difficulty comes from mastery.

### 7.10 Use Time Spiral for remixes, not the first campaign

The first expedition presents each realm's authored baseline.

Time Spiral may:

- combine two learned realm conditions;
- swap a finale's optional opening route;
- add one extra attack remix per Sovereign;
- reverse one objective order;
- shorten tells modestly;
- preserve the same counter solution.

Do not make the first clear carry all possible variants.

## 8. Reward and progression rules

### Finale Mastery

Track three non-persistent states inside the current finale:

- `clear` — encounter completed;
- `countered` — signature answer performed at least once;
- `mastered` — every authored major-beat counter achieved.

This controls offer visibility and reroll behavior only. It does not add a
new save currency.

### Realm crests

Persist the best mastery result per realm/mode/difficulty alongside medals.
Use it for:

- journey-map treatment;
- boss dossier completion;
- Trial/Time Spiral records;
- later Boss Rush seeding.

It provides durable recognition without combat power.

### Recovery between finale beats

- clear hostile telegraphs and non-persistent boss projectiles;
- vent weapon heat;
- provide a short 1.5–2.5 second calm;
- if current life is critical, prime the existing potion pity rather than
  granting a free full heal;
- do not undo burned upgrade ranks or erase the value of AEGIS.

## 9. Balance framework and recommended corrections

This plan has been reread as a balance plan, not only an encounter plan. The
new finales create more states, objectives, and transitions than the current
gauntlet. Copying the current HP, shield, drop, and meter rules into longer
encounters would make defense and kill-fed builds scale upward while
low-damage or single-target builds fall behind.

The current ladder is already roughly **3.08 Sovereign-equivalents** of raw
HP when it uses three opening actors (`3 × 0.42 + 1.00 + 0.82`), or **2.67**
with a singleton opener (`0.85 + 1.00 + 0.82`), before guards, resistance,
phase gates, and non-boss targets. The new finales must not inherit that raw
work and then add objective downtime on top.

All numeric values below are initial tuning brackets. Phase 0 records the old
campaign, then the relay and raid slices validate or replace them.

### 9.1 Measure work, danger, and recovery separately

Add three explicit budgets to every encounter profile:

- **work budget** — damage or objective actions needed to advance;
- **threat budget** — simultaneous sources capable of costing life;
- **recovery budget** — heat vents, clear lanes, pity, shields, and safe time.

Use a **Boss Equivalent (BE)** for authored work: `1.0 BE` is that realm's
central Sovereign HP under the current mode and difficulty. Count protected
anchors, shield layers, mandatory adds, and objective hit requirements as
work even when they are not boss HP.

Track both:

- **elapsed time** — the complete finale;
- **meaningful-progress time** — time during which the player can deal damage,
  move an objective, perform a counter, protect an ally, or make a route
  decision.

At least 70% of active finale time should permit meaningful progress. No
untargetable sequence should exceed six seconds unless it is a skippable
reveal or ending scene. A visible objective still counts as progress; waiting
for a timer with nothing to do does not.

### 9.2 Initial finale work brackets

Use these as starting points, not permanent constants:

| Component | Initial work budget |
|---|---:|
| opening teach/objective | 0.30–0.50 BE |
| central Sovereign rule | 0.85–1.00 BE |
| short Mythic coda | 0.25–0.45 BE |
| linked climax replacing a coda | 0.45–0.65 BE |
| complete ordinary finale | 1.65–2.20 BE |
| Greenspell's deliberate ladder ceiling | 2.35 BE |

Rules:

- multi-actor encounters share the bracket; they do not each receive a full
  boss bar;
- protection time, invulnerability, route puzzles, and movement tests spend
  work budget and therefore require less HP;
- optional targets add score or mastery, not mandatory clear time;
- a failed optional objective returns to an ordinary clear and may not add a
  second full health bar;
- mode adapters translate the bracket into ball contacts, basic volleys,
  charges, or objective seconds. Do not give all three modes identical raw
  hit counts when their contact rates differ;
- difficulty scales the bracket modestly. It should not multiply both
  required work and downtime.

The player should see one teach and one real test of a signature rule before
raw damage can end that rule. After that, strong builds may skip repeated
remixes. This protects boss identity without turning every fight into an
unskippable script.

### 9.3 Player firepower and burst

The damage ledger needs to attribute the final value after each category:

1. base weapon/ball;
2. path tiers;
3. vessel;
4. Aspect matchup;
5. mastery satellite;
6. Surge;
7. fusion/apex;
8. authored counter window.

Avoid an unrestricted chain of multipliers. Bonuses within one category
should add together or use diminishing returns; the counter window remains a
separate, readable reward. Initial targets:

- a complete, non-fusion end-run build deals roughly 2.3–3.3× baseline
  sustained boss damage;
- a coherent fusion build may reach roughly 3.0–4.0×;
- an apex window may briefly reach roughly 4.0–5.0×;
- no one vessel should contribute more than about 35% sustained damage over a
  neutral vessel, though a conditional burst may briefly exceed that;
- a normal hit should not remove more than about 8% of a Sovereign phase, and
  a scripted fusion/apex proc should not remove more than about 12%;
- one counter window should expose at most 20–25% of a phase to burst.

Prefer phase-transition spill protection and per-proc boss coefficients over
a hidden global damage cap. If telemetry proves a cap necessary, surface it
as an armor break, stagger limit, or phase transition so a strong shot never
looks like it failed.

Keep the current **5–10 seconds of cold sustained fire before overheat** as
the weapon-health target. Across an ordinary stage, a viable shooter build
should remain able to attack 65–85% of active combat time. Recovery beats may
vent heat, but reveal time and empty objective waits may not secretly become
free cooling advantages for one build.

### 9.4 High-confidence vessel correction: Stormbinder

The shared electric vessel currently inherits an intentionally overpowered
workshop line: up to `2.2×` damage, a `0.58` cadence multiplier, three-target
chains every four hits, 75% starting Surge, and passive Surge gain. That is
not a small identity bonus; before paths or Aspect advantage it can exceed
the intended end-run contribution of an entire ordinary build.

Because the engine is shared, do not hide a weaker Aetherfall-only version
behind the skin. Normalize the electric line for both editions and preserve
its identity as **fast chain/Surge tempo**, not raw supremacy.

Initial playtest bracket:

| Tier | Damage | Cadence multiplier | Starting Surge | Chain |
|---|---:|---:|---:|---|
| I | 1.15× | 0.95 | 20% | 1 target every 8 hits |
| II | 1.25× | 0.90 | 35% | 1 target every 7 hits |
| III | 1.40× | 0.82 | 50% | 2 targets every 6 hits |

Reduce passive Surge in the same pass. Treat these as seed values for the
matrix, not as a balance conclusion. If the workshop wants a novelty
overpowered character, it should be an explicit non-standard mode and must
not define the public campaign's shared vessel numbers.

Audit the other boss-focused vessels at the same time:

- Fighting can add missing-life scaling and another 30% boss multiplier;
- Ground reaches 60% against armor and bosses;
- Poison can reach 30% per repeated-hit stack;
- Dark can reach 80% bonus at a full combo.

Their conditions are valid identities, but category stacking must keep their
full-fight median within the firepower bands above.

### 9.5 Enemy HP, armor, shields, and required targets

Every target owns at most one primary defensive rule:

- extra HP;
- shell armor;
- a nearby generator;
- a timed ward;
- Aspect resistance;
- spectral charge immunity.

Do not stack two of these on a target required for progression. In
particular, no mandatory target may combine a generator ward, high HP, and
Aspect resistance.

Initial shield adapter:

| Shield class | Breaker | Blaster / Starfighter |
|---|---:|---:|
| light ward | 1 committed ball contact | 2 basics or a half charge |
| standard shell | 1–2 contacts | 3 basics or 1 full charge |
| major anchor | 2 contacts | 5–6 basics or 2 charges |

A full charge should always make meaningful shield progress, but IMPACT must
not be required. Basic fire, the ball, Relic, and an authored environmental
counter all need viable answers.

Additional rules:

- support and courier roles stay near normal wave HP;
- artillery may reach about 1.5× a normal elite only when sparse;
- shield generators stay at or below about 1.25× a normal elite;
- spawning a role consumes existing entity and threat capacity;
- linked bosses use shared effective work, not two full HP curves;
- damageable weak points remain available for at least 65% of meaningful
  combat time;
- the current 1.35× stagger is the reference counter reward; new windows
  normally live in the 1.25–1.40× range.

### 9.6 Enemy offense and survival economy

Only one system owns the lethal moment. During a finale signature attack:

- generic boss fire yields;
- ambient artillery yields or becomes non-lethal setup;
- role attacks cannot overlap merely because their cooldowns matured;
- spawned projectiles still pass through the existing threat-cap accounting;
- phase-transition rings, objective hazards, and boss attacks share one
  volley/threat identity so a cluster cannot consume several lives.

Difficulty should change tell width, pattern remix, and recovery margin before
it increases projectile count. One Life receives the same readable solutions
as Adventure; it may demand cleaner execution, never foreknowledge.

The following timers advance only during **active threat time**, not reveals,
route choice, dialogue, recovery, or a defeated boss waiting for the next
beat:

- AEGIS shield regeneration;
- passive or hit-fed Surge where no hostile target is available;
- kill and return counters;
- healing pity;
- fusion/apex charge loops.

Objective props, endlessly replaced reinforcements, allied actors, and
non-hostile codas do not feed kill-based shields, healing, Surge, chains,
drops, score combo, or fusion meters unless the encounter explicitly budgets
that reward.

### 9.7 High-confidence survival correction: AEGIS

The current SUPER SHIELD grants a life on acquisition, another life after
every later realm, and a shield every ten seconds. Because `livesMax` follows
the highest held life total, the realm reward becomes permanent maximum
health. A long finale can also regenerate many shields during low-danger or
untargetable time.

Recommended shared correction:

- on acquisition: **+1 maximum life and restore that segment once**;
- on later realm clear: **restore one missing life, up to maximum**, rather
  than increasing maximum again;
- shield regeneration counts active-threat seconds only;
- start playtesting at 10–12 active seconds per shield with a ceiling of
  three regenerated charges per stage;
- the IMMORTAL REACTOR lock and other explicit costs remain meaningful;
- temporary Preparation never pushes shields above normal cap. If the player
  already begins full, convert the benefit to one counter-safe intercept or a
  small heat vent.

This retains AEGIS as the best survival path without letting campaign length
turn it into unlimited health. Update copy, checkpoint migration assumptions,
regression behavior, and tests together.

Healing follows the same rule:

- ordinary potions restore one missing segment;
- critical-health pity may be primed between beats but never guarantees
  repeated full heals;
- a finale can produce at most one authored recovery drop per beat;
- failed optional objectives cannot remove life or burn tree ranks directly.

### 9.8 Upgrade-path balance contracts

| Path | Must remain good at | Primary risk in the new plan | Guardrail |
|---|---|---|---|
| VOLLEY | lane coverage and steady pressure | Twin + cadence + cooling becomes best at everything | keep twin near 1.2× raw volley and validate heat-limited DPS |
| IMPACT | aligned burst and quick objective work | boss charge coefficient or movement makes it a trap | single-target median within 10% of VOLLEY; no charge-only objective |
| PRISM | turning temporary matchups into opportunity | fixed boss Aspect makes it useless or 2.6× advantage melts phases | guarantee neutral progress and authored attunement chances; cap counter-window burst |
| AEGIS | forgiving mistakes and converting defense into tempo | long finales create unlimited shields/lives | active-time regen, per-stage ceiling, restored-not-added realm life |
| SURGE | planned power windows | objective adds and long stages refill it for free | authored counters may grant fixed meter; unbounded adds grant none |
| RELIC | off-axis coverage, return skill, interception | many anchors let one returning blade clear the whole mechanic | each prop takes at most one hit per outward/return pass; retain single-target usefulness |

Fusion and apex rules:

- a proc that clears adds still uses its authored boss coefficient;
- area damage cannot multi-hit linked actors to exceed the shared work budget;
- objective props may accept utility from a fusion but not refill the resource
  that caused it;
- apex eligibility and the one-apex/two-fusion limits stay unchanged;
- the fifth Finale Mastery offer may not place a second fusion/apex in a hand
  that already contains one;
- measure fusion/apex availability as well as pick count—extra visibility is
  real power even when mastery does not grant a second rank.

### 9.9 Mastery stacks, affinities, and drop economy

“Stacks forever” is acceptable within a 27-stage first expedition only if
Time Spiral cannot reduce a resource to zero or grow damage without bound.
Use full value for the first five stacks, then diminishing value, with a
tested effective ceiling:

- damage stacks: half value after five and no more than ten effective stacks;
- cooling: never reduce heat generation below 50–55% of its pre-mastery
  value;
- kill-fed Surge/shield stacks: diminish after five and ignore unbounded
  objective reinforcements;
- LIGHT drop bonuses: cap the final eligible-kill drop chance near 12–14%;
- DARK score penalty may keep its existing 30% floor;
- one potion should not bank more than 40% Surge after all GRACE stacks.

Do not retroactively delete owned stacks. Clamp their effective contribution
while keeping the stored integer and showing the effective value in the
constellation inspector.

LIGHT and DARK should produce different stories, not different win rates.
Flag a balance problem if, within the same vessel/build family:

- median finale time differs by more than 10%;
- completion differs by more than 10 percentage points;
- one affinity owns more than 60% of successful top-difficulty runs.

The current type-to-power mapping also needs a distribution audit after
mode remapping. Ghost, Dark, and Poison all feed the same multi-shot family,
and realm rosters can therefore flood one power. Across an act:

- no ordinary random power should exceed roughly 25% of eligible drops;
- objective props and codas drop nothing unless authored;
- boss-beat rewards use a curated small table rather than the defeated
  actor's Aspect alone;
- repeated shield drops must be considered alongside AEGIS and HALO WARD;
- drops remain helpful variance, never the assumed solution to a finale.

### 9.10 Difficulty and mode normalization

Adventure is the tuning baseline. All mechanics appear on every difficulty;
lower difficulties widen response margins rather than deleting the lesson.

| Preset | Mechanical treatment |
|---|---|
| Scenic | 20–30% wider counters, lighter anchor work, fewer remixes, complete teaches |
| Adventure | authored baseline |
| Ace | about 10% more work, tighter tells, one learned remix, no surprise answer |
| One Life | Ace-like patterns with one-life stakes; no extra hidden attrition |

The current One Life preset stacks one hit point with `1.65×` boss HP and
`2.35×` shot rate, versus Adventure's `1.12×` and `1.0×`. Its identity is
already the one-life/tree-burn consequence, so simultaneously making it the
longest and fastest campaign is a triple penalty.

Start the matrix with a One Life bracket around:

- boss HP `1.30–1.40×`;
- shot rate `1.70–1.90×`;
- shot speed no higher than the current Ace-to-One-Life step without evidence;
- the same work/objective rules as Ace;
- no new attack reducing the Ace tell by more than another 10%.

The exact preset waits for Phase-0 results, but the closeout should not retain
the current triple stacking by default.

Mode targets:

- Breaker never receives enemy fire, so difficulty uses ball-control demands,
  safe target order, moving geometry, and fewer required contacts;
- Blaster and Starfighter share weapon math but not exposure—Starfighter
  movement hazards and Blaster wall occlusion need separate completion data;
- an objective's P50 duration should stay within about 15% across modes;
- no path may be mandatory in one mode or mechanically dead in another;
- reduced effects never change collision, timing, RNG, or threat capacity.

### 9.11 Balance gates for AFT-008 closeout

These thresholds are flags for investigation, not reasons to blindly flatten
interesting builds:

- strongest versus weakest viable non-apex build exceeds about 1.8× sustained
  boss DPS on Adventure;
- a vessel clears a comparable finale more than 20% faster than the median;
- a path appears in more than 45% or fewer than 10% of eligible successful
  builds after offer frequency is normalized;
- a supplemental passive source supplies more than 35% of total damage;
- heat lockout exceeds 20% of active combat time on an otherwise coherent
  build;
- a boss dies before teach + one real test, or P90 duration exceeds 1.5× P50;
- required-target downtime exceeds 30%;
- seeded route choices differ by more than 10% in P50 clear time or 10
  percentage points in completion/mastery after build is controlled;
- a stage produces more than three AEGIS regrowths, one authored healing drop
  per beat, or uncapped meter gain from renewable enemies;
- Adventure objective success falls below 60% or exceeds 90% after the teach;
- any unavoidable-damage fixture, Breaker enemy-fire event, multi-life volley,
  or deterministic divergence occurs.

For every tuning fix, retain the seed, mode, difficulty, vessel, affinity,
build, stage, and exact failing measurement as a regression fixture.

## 10. Data and code architecture

### Engine data (`js/data.js`)

Add engine-only definitions:

- finale format/action keys;
- attack-state descriptors and counter verbs;
- reusable objective/beat/role definitions;
- work, threat, and recovery budgets;
- active-threat and meaningful-progress clock rules;
- reward mastery thresholds;
- mode adapter keys;
- no Aetherfall names or player-facing realm copy.

### World data (`js/aetherfall.js`, `js/pokeworld.js`)

Add skin-owned tables:

- `SKIN.finaleProfiles`;
- actor ids and encounter roles;
- display titles and counter cues;
- `SKIN.stageTitles`;
- realm condition names/copy;
- realm-specific mastery names;
- optional scenery and audio cue names.

The Aetherfall table is authored first. The Pokémon table maps the same
engine slots to its own cast and language.

### Runtime state (`js/state.js`)

Introduce `G.finale`:

```js
{
  realm,
  format,
  beat,
  beatT,
  actors,
  objective,
  mastery,
  carry,
  reward,
  budgets,
  clocks,
  procEligibility,
  entry
}
```

During migration, keep `G.gauntlet` as a compatibility adapter for old tests,
Trial calls, and the Rift. Do not delete or globally rename it in the first
round.

Add:

- encounter-role fields;
- stage-title lookup;
- temporary finale preparation state;
- crest persistence through `loadStore` / `saveStore`;
- no mid-finale checkpoint requirement unless a later playtest proves finale
  duration makes one necessary.

### Simulation (`js/update.js`)

Add:

- `updateFinaleDirector`;
- `startFinaleBeat` / `completeFinaleBeat`;
- tell/commit/resolve/recover attack controller;
- linked actors and shared meters;
- objective-based phase transitions;
- reward/counter resolution;
- threat-budget ownership during major attacks;
- deterministic behavior through `gameRand()`.

Retain current boss ability/channel functions as a per-realm legacy fallback
until migration is complete.

### Rendering (`js/render.js`, `js/scenery.js`)

Add:

- named objective/meter HUD variants;
- multi-actor health or objective rails;
- attack-family tells that communicate by shape and motion;
- stage-specific landmark states;
- healed-world finale backdrops;
- Victory Draft / realm crest presentation;
- reduced-flash and reduced-motion variants for every new tell.

Use cached sprites and strokes. No repeated per-frame gradients or
`shadowBlur` writes.

### Audio (`js/audio.js`)

- retain the nine arrangement identities;
- add short teach, commit, counter-success, and recovery cues;
- expose stage/beat layers without making gameplay depend on audio;
- synchronize large transitions to musical boundaries only within a small
  capped wait.

### Trial and input (`js/config.js`, `js/input.js`)

- replace generic ROUND 1/2/3 choices with named chapters such as PRELUDE,
  CORE, and CLIMAX;
- keep direct actor/phase launches for QA;
- add exact finale-beat launch to `DEV`;
- prevent reveal/ending taps from leaking into the first live action.

### Stats (`js/state.js`, `js/dev.js`)

Extend the existing ledger, not a parallel system:

- finale format and beat durations;
- attack id, tells shown, commits, failures, and counters;
- objective result;
- active-actor overlap;
- Boss Equivalents requested and completed;
- meaningful-progress, active-threat, invulnerable, and recovery time;
- damage after each multiplier category;
- shield sources, charges spent/regrown, healing sources, and life maximum;
- heat-ready time, lockout time, Surge sources, and meter wasted;
- drop distribution after mode remapping;
- time from tell to hit;
- reward mastery;
- stage condition and encounter roles;
- temporary preparation used;
- mode adapter.

## 11. Implementation sequence

### Phase 0 — AFT-008 baseline and design lock

**Scope:** measurement only plus final schema decisions.

1. Record current finale duration, damage, knockouts, phase time, channel
   interruption rate, and how often bosses die before showing their kit.
2. Record current non-boss stage duration, director beats actually fired,
   objective results, modifier distribution, and upgrade offer/pick rates.
3. Record BE work, meaningful-progress/downtime, damage multiplier
   contribution, heat lockout, shield/heal/life sources, Surge sources, drop
   distribution, and renewable-enemy proc gain.
4. Add deterministic launch/report coverage for all 27 stages × 3 modes at
   representative builds.
5. Include explicit probes for Stormbinder, the four boss-focused vessel
   lines, AEGIS, all six paths, LIGHT/DARK satellites, at least four fusions,
   both apexes, and One Life.
6. Save baseline reports before changing encounters.
7. Lock `FINALE_FORMATS`, `finaleProfiles`, attack states, counter verbs,
   mastery payloads, and work/threat/recovery budget shapes.

**Exit:** old and new results can be compared from the same ledger; no combat
behavior changed.

### Phase 1 — Finale director foundation + Greenspell migration

1. Add `G.finale` and the data-driven beat lifecycle.
2. Express the current Greenspell ladder through it first.
3. Preserve Marches Rift/Lumine Ascendant behavior and choose-two bounty.
4. Add Trial named-beat launches.
5. Preserve the old gauntlet adapter and current boss tests.

**Exit:** Greenspell completes, rewards, resumes, and secrets identically
through the new director in all modes.

### Phase 2 — Prove two opposite finales

Build:

- **Belltower Gale Relay** — continuous pursuit;
- **Crucible Seraph Raid** — simultaneous multi-actor objective.

Ship Starfighter, Breaker, and Blaster adapters in the same slice. Do not
declare a finale complete with only the flagship mode implemented.

**Exit:** both encounters are describable without projectile color; each has
a deterministic teach/counter/recover test; performance stays inside the boss
storm gate.

### Phase 3 — Non-boss variety framework

1. Add the new beat actions and role system.
2. Add realm conditions as data-driven variants.
3. Add optional stage titles.
4. Build one new non-attrition objective in Greenspell and one in Chrome.
5. Add Preparation and Victory Draft selection-control rules.

**Exit:** two normal stages feel structurally different without new currencies
or a longer modal chain.

### Phase 4 — Act I rollout

- finish Greenspell's new attack rule and Lumine coda;
- Drowned Siege + Mirajin wishes;
- Greenspell/Belltower/Drowned stage titles, conditions, objectives, scenery
  responses, and mastery;
- balance the complete Old Magic act.

### Phase 5 — Act II rollout

- Foundry Fractured Hour;
- Chrome Live Grid;
- Spire False Foundation;
- act-specific objectives, role mixes, stage titles, and mastery;
- balance the complete Ascendancy act.

### Phase 6 — Act III rollout

- Atolls Eclipse Rite;
- complete Crucible;
- Cradle First Fusion;
- objective reprises and branching routes;
- direct final victory into the existing ending;
- balance the complete Convergence act and Time Spiral variants.

### Phase 7 — AFT-008 closeout

Run the full matrix on the redesigned campaign:

- three modes;
- four difficulties;
- LIGHT and DARK;
- representative vessels and at least eight builds;
- all 27 stages;
- phone performance and reduced-effects variants.

Fix spikes and preserve deterministic regressions for every balance issue.
Resolve or explicitly reject, with evidence, the Stormbinder, AEGIS,
forever-stack, drop-distribution, multiplier-stacking, and One Life
recommendations in Section 9.

### Phase 8 — Presentation/replay integration

Coordinate, do not duplicate:

- AFT-009: constellation, build identity, limited respec, practice chamber;
- AFT-012: realm grades and Relicforge integration;
- AFT-013: boss dossiers using the new counter rules;
- AFT-014: Boss Rush and Time Spiral records using finale crests.

## 12. Acceptance criteria

### Campaign variety

- only Greenspell uses the opening group → Sovereign → Mythic ladder;
- no adjacent realms share a finale format or primary counter verb;
- each realm has one non-attrition regular-stage identity;
- all 27 stages have memorable display titles;
- no adjacent Challenge stages use the same beat sequence;
- Time Spiral adds remixes without hiding baseline mechanics from first-clear
  players.

### Boss identity

- every Sovereign has a one-sentence rule;
- each authored rule has teach, test, and remix states; an ordinary baseline
  build sees all three, while a strong build may finish after the real test;
- no more than three finales use charge interrupt as the primary answer;
- Mythics occupy at least five different roles across the campaign;
- major attacks never become “same pattern, faster” at the climax;
- generic fire yields to the active major mechanic.

### Reward quality

- one permanent upgrade per ordinary clear;
- Marches Rift remains the only choose-two exception;
- mastery improves choice, not raw rank count;
- finale results name the mechanic the player mastered;
- the Cradle enters the ending before a draft;
- no new persistent currency.

### Fairness and accessibility

- every lethal mechanic has a visible safe solution and a non-color cue;
- reduced flash, reduced shake, and reduced motion remain complete;
- Breaker receives no hostile fire and no hidden weapon;
- a failed optional objective usually reverts to attrition clear;
- mobile HUD/objective/touch zones never overlap;
- every multi-actor fight respects the active threat budget.

### Combat balance

- encounter work stays inside the measured BE bracket or carries an explicit
  playtest exception;
- at least 70% of active finale time permits meaningful progress;
- every signature appears for a teach and one real test, after which strong
  builds may earn faster resolution;
- no required target stacks multiple defensive rules;
- multi-actor fights share a work budget;
- required objectives are viable with basic/ball, charge, Relic, defense,
  Surge, and Prism-leaning builds;
- active-threat clocks prevent transition/reinforcement farming;
- AEGIS no longer grows maximum life every realm;
- Stormbinder, One Life, mastery stacks, and multiplicative boss damage are
  resolved against the matrix, not grandfathered without measurement;
- LIGHT/DARK, all six paths, and the three modes remain within the Section 9
  investigation thresholds;
- mastery offer control does not bypass fusion/apex hand limits.

### Duration and pacing

- early finales target roughly 2.5–3 minutes;
- late finales target roughly 3–4 minutes;
- the redesigned campaign does not grow more than about 10% without explicit
  playtest approval;
- finale beat transitions provide 1.5–2.5 seconds of calm;
- no Mythic coda outlasts the Sovereign unless it is a deliberately linked
  climax.

### Technical

- checkpoints, saves, affinities, the Rift, ending, Time Spiral, daily mode,
  Trial Mode, and both skins remain compatible;
- seeded runs reproduce finale beat order and objective state;
- exact-beat Trial launches exist;
- all new mechanics record through the existing stats ledger;
- the invariant suite, both-skin boots, standalone RESIDUE scan, mobile scenes,
  and artifact-storm budgets stay green;
- new repeated art uses caches and strict entity caps.

## 13. What not to do

- Do not merely add more boss projectile sprites.
- Do not give all new encounters three phases.
- Do not preserve the mandatory Mythic cleanup fight out of habit.
- Do not scale difficulty mainly through fire rate, projectile count, or HP.
- Do not build all nine finales before proving the relay and raid vertical
  slices.
- Do not create Aetherfall-only engine behavior; use skin-owned presentation
  over shared rules.
- Do not add mid-wave celebration cards. The Codex and boss reveal own art
  appreciation.
- Do not turn Breaker into a shooter.
- Do not hand-edit `dist-aetherfall/`.
- Do not tune the entire old campaign immediately before replacing it.
- Do not copy the old 2.67–3.08 BE gauntlet HP into an encounter that also
  contains mandatory objective time.
- Do not let untargetable/recovery time farm shields, healing, Surge, drops,
  or kill-fed fusion resources.
- Do not preserve an intentionally overpowered workshop vessel as the public
  Aetherfall baseline.
- Do not stack One Life, the highest HP, the fastest fire, and the smallest
  recovery window without matrix evidence.

## 14. Next-session start checklist

1. Read `CLAUDE.md`, `README.md`, `AETHERFALL_IMPROVEMENT_BACKLOG.md`, this
   plan, and `NEXT_SESSION_HANDOFF.md`.
2. Run `git status` and preserve any existing worktree changes.
3. Start **Phase 0 only**: inventory existing ledger coverage and produce the
   baseline matrix/report shape.
4. Add missing measurement fields before changing boss or wave behavior.
5. Draft the exact engine/world data schemas for:
   `FINALE_FORMATS`, `SKIN.finaleProfiles`, `G.finale`, counter results, and
   stage titles, including work/threat/recovery and active-threat clocks.
6. Implement no more than one coherent slice per round, with deterministic
   tests and the full release gate before handoff.

The first implementation handoff should contain the baseline report, the
locked schemas, a recommendation verdict on the six high-risk balance areas,
and a concrete Phase-1 Greenspell migration checklist. It should not contain
nine half-built finales.
