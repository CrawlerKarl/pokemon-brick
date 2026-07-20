# Aetherfall sprite style directions

Generated 2026-07-20 with the built-in image-generation workflow.

These are art-direction mockups, not final sprite sheets. Each board uses the
same representative cast so the rendering language can be compared directly:

- a three-stage thorn familiar
- a floating bell-and-wind spirit
- a clockwork foundry golem
- a fractured-glass necrotech phantom
- a neon grid hound
- a magitech rift serpent
- a player starfighter vessel
- a six-winged biomechanical dragon-seraph boss

All boards also include a small bottom-row readability test. Final production
will use isolated subjects and dedicated prompts rather than cutting individual
assets out of these boards.

## Directions

### 01 — Arcane Alloy

File: `01-arcane-alloy.png`

Painterly stylized realism. The richest material rendering and most imposing
boss presence, with a premium action-RPG feel. It is the most expensive look to
keep consistent over hundreds of sprites and needs disciplined simplification
for ordinary 36–64 px enemies.

### 02 — Prismatic Cel-Tech

File: `02-prismatic-cel-tech.png`

Detailed cel rendering with inked silhouettes, crisp highlights, emissive
inlays, and strongly separated colors. This is the best default for gameplay
readability and high-volume consistency while still looking substantially more
modern and dimensional than the current procedural art.

### 03 — Relicforge Miniatures

File: `03-relicforge-miniatures.png`

Pre-rendered 3D sprites with tactile, hand-painted materials. This direction
has excellent material depth and is naturally consistent across large batches.
It feels collectible and substantial, although slightly less illustrative than
the other directions.

### 04 — Luminous Relic Ink

File: `04-luminous-relic-ink.png`

Gouache, etched contours, stained-glass energy, and engraved machinery. This
has the strongest singular identity and the most balanced ancient-magic versus
advanced-tech blend. Its internal textures need careful control at gameplay
scale.

## Recommended production direction

Use **02 — Prismatic Cel-Tech** as the structural base: silhouette design,
two-to-three-value shading, color separation, and combat readability. Borrow
the engraved texture, patina, stained-glass energy, and stranger shapes from
**04 — Luminous Relic Ink**. Reserve the richer rendering density seen in
**01 — Arcane Alloy** for bosses, mythics, final pilot forms, codex portraits,
and large ceremony art.

This hybrid keeps hundreds of gameplay assets achievable while preventing the
world from becoming flat or generic.

## Current-game asset audit

The current procedural renderer exposes 259 authored Aetherfall looks:

| Group | Count | Current structure |
|---|---:|---|
| Player pilots | 54 | 18 classes × 3 forms |
| Realm creatures | 162 | 9 realms × 6 families × 3 forms |
| Sentinels | 25 | Realm-specific boss guards |
| Legendaries | 9 | One realm boss each |
| Mythics | 9 | One rare boss each |
| **Total** | **259** | Existing replacement baseline |

## Full-production matrix after style lock

The next generation run should produce versioned source masters and game-ready
exports, never crop assets from a multi-character board.

### Core character coverage

- 54 player-pilot sprites, preserving all three-form silhouettes.
- 162 realm-creature sprites, preserving the 54 three-stage family identities.
- 25 sentinel sprites.
- 9 legendary boss sprites.
- 9 mythic boss sprites.
- 259 radiant/anomaly variants made with authored material and motif changes,
  not simple hue shifts.

### Replay-variety expansion

- 81 alternate realm-creature sprites: three additional three-stage families
  per realm. A run selects different ecological families so repeated journeys
  visibly change, not just their stats or colors.
- 54 rare regional morphs: one alternate silhouette/material treatment for
  every existing creature family.
- 36 affinity pilot forms: LIGHT and DARK treatments for each class's final
  form, with distinct ornament and energy language.
- 18 roaming anomalies: two rare one-off encounters per realm.

### Combat and UI support

- 18 elemental player-bolt families with normal, charged, and apex states.
- 18 enemy-shot families with micro, standard, heavy, and massive states.
- 43 boss-projectile silhouettes matching the existing boss kit table.
- 12 universal pickup icons and their in-flight sprites.
- 18 class emblems, 18 elemental emblems, LIGHT/DARK affinity marks, realm
  crests, boss badges, and codex rarity marks.
- Destruction fragments, shield shells, hit flashes, status emblems, summon
  sigils, portal forms, and type-readable auras.

### Presentation art

- Nine realm key-art plates or layered background elements.
- Nine boss-introduction portraits plus nine mythic portraits.
- 18 pilot codex portraits and three discipline-group illustrations.
- Title/menu hero art and ending tableau.

### Export contract

- Isolated PNG/WebP subjects with transparent backgrounds.
- Ordinary units authored at a large square master size, then verified at
  128×128 and at actual 36–64 px combat size.
- Bosses authored at a larger square master size, then verified at 192×192 and
  at their real on-screen bounds.
- Consistent three-quarter front/top camera, lighting direction, grounding,
  silhouette padding, and center of mass.
- A manifest row per asset containing stable id, name, group, realm, class or
  type, form, rarity, variant, source file, export file, and prompt version.

## Final prompts used for the four boards

### Prompt 01 — Arcane Alloy

```text
Use case: stylized-concept
Asset type: Aetherfall game-sprite art-direction mockup sheet, landscape 16:9
Primary request: Create a premium modern 2D game sprite style board for an original sci-fi × fantasy creature-collection arcade game. This is STYLE DIRECTION A: "ARCANE ALLOY" — painterly stylized realism with rich material rendering, readable silhouettes, luminous magic, and believable engineered construction. The goal is detailed but still exceptionally clear when downscaled to 36–64 px.
Scene/backdrop: dark neutral blue-gray studio board with a subtle grid and very faint vignette, no environment scenes
Subjects: a consistent representative Aetherfall cast arranged as isolated full-body sprite concepts: (1) a three-stage thorn familiar evolving from a tiny bud creature into an imposing antlered Thornwarden; (2) a cute floating bell-and-wind spirit; (3) a squat clockwork foundry golem with brass gears and furnace glow; (4) a translucent fractured-glass necrotech phantom; (5) a sleek neon grid hound with chrome armor and electric conduits; (6) a long magitech rift serpent with rune-inlaid plating; (7) a compact player starfighter vessel combining a winged magical familiar silhouette with precision thrusters; (8) one large showcase boss, a six-winged biomechanical dragon-seraph with an exposed rune reactor, elegant and intimidating.
Style/medium: hand-painted high-end game sprites, stylized realism, 2D digital painting, subtle cel control, crisp silhouette edges, restrained dark outline only where needed, detailed highlights and surface wear, premium RPG/roguelite asset quality, original creature designs
Composition/framing: clean production concept sheet; isolated subjects; consistent three-quarter front/top game camera; each full body visible; generous spacing; three-stage familiar visibly related but progressively more complex; large boss anchoring one side; tiny downscaled sprite-readability samples in a narrow strip along the bottom without labels
Lighting/mood: dramatic top-left key light, colored emissive runes and engine glow, controlled rim light, mysterious but inviting
Color palette: deep navy shadows; moss green, arcane violet, ember orange, cyan electricity, rose glass, old gold; balanced saturation
Materials/textures: hammered brass, brushed gunmetal, patinated copper, cracked glass, bark, leaf veins, woven spellcloth, enamel, crystal, translucent aether energy
Constraints: no text, no logos, no watermark; no frames around individual sprites; no flat vector art; no pixel art; no generic robots; strong color/value separation; silhouettes must remain distinct at thumbnail scale; original designs only, do not resemble characters from any existing franchise
Avoid: chibi-only proportions, plastic toy finish, muddy darkness, excessive particle clutter, busy backgrounds, concept-art scene composition, photorealism, UI labels
```

### Prompt 02 — Prismatic Cel-Tech

```text
Use case: stylized-concept
Asset type: Aetherfall game-sprite art-direction mockup sheet, landscape 16:9
Primary request: Create a premium modern 2D game sprite style board for an original sci-fi × fantasy creature-collection arcade game. This is STYLE DIRECTION B: "PRISMATIC CEL-TECH" — richly detailed hand-inked animation rendering, energetic and colorful, combining magical anatomy with precision sci-fi panels. It must feel dimensional and modern, never flat, with two-to-three-value cel shading plus fine texture, sharp specular accents, emissive inlays, and bold readable silhouettes at 36–64 px.
Scene/backdrop: clean deep indigo studio board with extremely subtle radial pools behind clusters, no environment scene
Subjects: the same representative Aetherfall cast as a coherent asset family: (1) a three-stage thorn familiar evolving from round seed-sprite to agile briar beast to majestic antlered Thornwarden; (2) a cute floating bell-and-wind spirit; (3) a squat clockwork foundry golem with brass gear armor and orange furnace core; (4) a translucent fractured-glass necrotech phantom; (5) a sleek neon grid hound with white/chrome plates and cyan electric channels; (6) a long magitech rift serpent with violet rune inlays; (7) a compact player starfighter vessel marrying familiar-like wings with precise thrusters; (8) one large showcase boss, a six-winged biomechanical dragon-seraph with an exposed rune reactor.
Style/medium: high-end 2D cel-shaded game sprites; elegant variable-width ink contours; painterly material accents inside clean shapes; sophisticated anime-inspired rendering without copying any existing franchise; crisp hard highlights; selectively soft glowing energy; highly authored detail clusters; polished action-RPG/roguelite asset quality
Composition/framing: production concept sheet; isolated full-body sprites; consistent three-quarter front/top game camera; each full body visible; generous separation; three-stage familiar visibly related and increasingly elaborate; boss anchoring one side; a narrow bottom strip of tiny downscaled sprite-readability samples without labels
Lighting/mood: bright directional key light, saturated colored bounce, luminous magic and engine cores, adventurous, fast, premium
Color palette: indigo and deep plum shadows, vivid emerald, coral, electric cyan, hot magenta, amber brass, pearl white; controlled saturation and strong value separation
Materials/textures: crisp lacquered armor, brushed brass, inked bark grain, faceted glass, patterned spellcloth, ceramic panels, energized crystal, holographic rune channels
Constraints: no text, no logos, no watermark; no frames around sprites; not flat vector art; not pixel art; not low-detail cartoons; no generic robots; original designs only; distinct silhouettes and facial/personality cues; details must simplify intelligently when small
Avoid: childish chibi sameness, huge empty eyes on every creature, plastic toy surfaces, muddy gradients, excessive particles, complex backgrounds, photorealism, UI labels
```

### Prompt 03 — Relicforge Miniatures

```text
Use case: stylized-concept
Asset type: Aetherfall game-sprite art-direction mockup sheet, landscape 16:9
Primary request: Create a premium modern sprite style board for an original sci-fi × fantasy creature-collection arcade game. This is STYLE DIRECTION C: "RELICFORGE MINIATURES" — high-quality pre-rendered 3D characters with tactile materials and hand-painted finish, like exquisitely crafted animated diorama pieces, rendered into clean 2D sprites. Detailed, varied, charming but formidable, with silhouettes designed to survive at 36–64 px.
Scene/backdrop: charcoal-to-deep-navy studio background, subtle cool floorless ambient shadows directly behind subjects only, no scenery, no pedestals
Subjects: a coherent representative Aetherfall cast: (1) a three-stage thorn familiar evolving from a round bud creature to a nimble briar quadruped to a regal antlered Thornwarden; (2) a cute floating bell-and-wind spirit; (3) a squat clockwork foundry golem with brass machinery and furnace glow; (4) a semi-translucent fractured-glass necrotech phantom; (5) a sleek neon grid hound with chrome plating and cyan conduits; (6) a long magitech rift serpent with rune-inlaid segmented armor; (7) a compact player starfighter vessel combining familiar-like wing shapes with real thrusters; (8) one large showcase boss, a six-winged biomechanical dragon-seraph with an exposed circular rune reactor.
Style/medium: stylized 3D game character renders designed as 2D sprites, physically convincing but art-directed materials, sculpted forms, hand-painted color variation, subtle bevels and micro-scratches, soft global illumination, clean subsurface/translucency where appropriate, premium contemporary indie action-RPG quality, original creature design
Composition/framing: production sprite sheet; isolated full-body subjects; consistent three-quarter front/top camera and scale logic; each body fully visible; generous separation; boss anchors one side; three-stage family clearly related; a narrow bottom strip shows tiny downscaled readability samples without labels
Lighting/mood: soft cinematic key plus colored rim, warm material response, luminous cores with controlled bloom, tactile and collectible, adventurous
Color palette: antique brass, weathered silver, moss and jade, amethyst energy, cyan electricity, ember orange, pearl ceramic; deep cool shadows
Materials/textures: PBR-like hammered metal, ceramic armor, patinated brass, bark with moss, translucent crystal and glass, etched runes filled with light, worn leather, luminous aether
Constraints: no text, no logos, no watermark; no frames around sprites; no flat vector art; no pixel art; no generic robot kitbash; original designs only; strong facial/personality cues; silhouettes and major color blocks must stay readable as tiny sprites
Avoid: toy-store plastic, glossy vinyl, claymation, bobble heads, overly cute uniform proportions, muddy lighting, heavy ground shadows, complex environment, photorealistic live-action, UI labels
```

### Prompt 04 — Luminous Relic Ink

```text
Use case: stylized-concept
Asset type: Aetherfall game-sprite art-direction mockup sheet, landscape 16:9
Primary request: Create a premium modern 2D game sprite style board for an original sci-fi × fantasy creature-collection arcade game. This is STYLE DIRECTION D: "LUMINOUS RELIC INK" — expressive painterly illustration with crisp etched contours, stained-glass energy, visible gouache texture, and elegant technical rune diagrams embedded into armor. It should balance ancient magic and advanced machinery equally, feel authored and soulful, and remain readable at 36–64 px through strong silhouettes and controlled internal detail.
Scene/backdrop: warm-black and midnight-teal studio board with subtle paper/canvas grain and faint constellation geometry, no environment scenes
Subjects: a consistent representative Aetherfall cast: (1) a three-stage thorn familiar evolving from tiny seed spirit to briar beast to regal antlered Thornwarden; (2) a whimsical floating bell-and-wind spirit; (3) a squat clockwork foundry golem with etched brass plates and furnace heart; (4) a fractured-glass necrotech phantom whose inner spirit shows through translucent shards; (5) a sleek neon grid hound with dark chrome armor and cyan circuit calligraphy; (6) a long magitech rift serpent with mosaic plates and luminous runes; (7) a compact player starfighter vessel with wing-like familiar silhouette, visible thrusters, and a rune sail; (8) one large showcase boss, a six-winged biomechanical dragon-seraph with an exposed circular rune reactor, simultaneously holy, alien, and engineered.
Style/medium: high-end 2D painted sprites, gouache and digital ink, etched variable-width contour work, selective crosshatching, stained-glass color fields, metallic foil-like highlights, luminous energy painted as crisp calligraphic shapes, layered texture without muddying, contemporary illustrated action-RPG quality, original designs
Composition/framing: clean production sprite style board; isolated full-body subjects; consistent three-quarter front/top game camera; each body visible; generous separation; three-stage familiar clearly related with increasing detail; large boss anchors one side; narrow bottom strip with tiny downscaled sprite-readability samples, no labels
Lighting/mood: moody illustrated key light, pools of supernatural color, high-contrast warm/cool accents, strange, poetic, adventurous
Color palette: midnight teal, soot black, oxidized turquoise, moss, antique gold, ember vermilion, electric cyan, amethyst, bone white; jewel tones against deep shadow
Materials/textures: fibrous bark, hammered and engraved metal, rough gouache, crystalline fracture planes, patina, inlaid enamel, woven spell banners, luminous mosaic glass
Constraints: no text, no logos, no watermark; no rectangular frames around sprites; no flat vector art; no pixel art; no generic robot kitbash; original designs only; distinct poses and personalities; silhouettes and major value blocks must remain clear at thumbnail size
Avoid: washed-out watercolor, flat abstract shapes, excessive black outline, muddy painterliness, uniform chibi proportions, plastic 3D, busy scenery, photorealism, UI labels
```
