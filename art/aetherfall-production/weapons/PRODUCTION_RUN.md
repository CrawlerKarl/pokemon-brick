# Aetherfall Relicforge weapon production run

This run extends the locked Relicforge Miniatures / Arcane Alloy language from
the 259-vessel bestiary into the complete combat-effects layer. Each source was
generated separately with the built-in image-generation workflow, chroma-keyed
to transparency, softly despilled, centered, and exported as a 128×128 RGBA PNG.

## Shared final prompt

```text
Create one isolated original AETHERFALL gameplay asset in the exact visual
language of the supplied Relicforge Miniatures / Arcane Alloy style-lock
reference: premium pre-rendered 3D miniature, strong game-readable silhouette,
antique brass, weathered steel, ceramic, crystal, bark, glass, or cloth chosen
to suit the aspect; hand-painted surface variation; restrained engraved runes;
top-left key light with a cool opposing rim; controlled glow only at a tiny
core or rune. Use the same three-quarter front/top gameplay camera and material
scale as the existing vessel and enemy sprites. Center one complete object with
generous padding on a perfectly flat chroma background. No ground, cast shadow,
environment, frame, text, logo, watermark, character, smoke, motion trail,
projectile streak, aura, or bloom extending into the background. The result
must remain recognizable at a 36–64 pixel gameplay footprint.
```

The following asset-specific instruction was appended once per generation:

| Key | Asset-specific prompt |
|---|---|
| `volt` | A vertical storm-conductor dart: forked brass prongs, steel spine, tiny cyan-white capacitor core. |
| `flame` | A compact ember reliquary bolt: dark forged cage holding a faceted flame crystal, pointed upward. |
| `aqua` | A sleek tide harpoon: silver-blue alloy, teardrop ceramic reservoir, small aquamarine glass core. |
| `leaf` | A razor-leaf glaive projectile: carved living wood, brass vein inlay, single green crystal bud. |
| `shard` | A frost crystal lance: pale translucent shard held by weathered steel and tiny brass clamps. |
| `draco` | A wyrm-headed pulse dart: compact brass dragon muzzle, dark steel spine, ruby aether heart. |
| `fist` | A miniature armored impact gauntlet flying knuckles-first: weathered steel plates and brass joints. |
| `gear` | A compact forge cog-blade: toothed antique brass wheel, steel hub, restrained cyan rune core. |
| `sting` | A long insectile stinger dart: chitin-like ceramic, paired brass barbs, tiny amber venom chamber. |
| `venom` | A sealed toxin ampoule projectile: dark metal cage, translucent violet glass, pointed ceramic cap. |
| `quake` | A compact rune-bound stone ram: broken basalt head, brass bands, glowing amber fault line. |
| `gale` | A feather-shaped turbine blade: pale ceramic vanes, fine brass spine, small sky-blue bearing. |
| `pixel` | A neutral omni data cube projectile: beveled ceramic/steel voxel, brass corners, tiny white grid core. |
| `psy` | A levitating psionic prism dart: violet faceted crystal in a thin brass gyroscope cradle. |
| `star` | A compact fey star-wheel: ivory ceramic points, antique-gold filigree, restrained rose crystal center. |
| `wisp` | A grave lantern dart: small dark brass cage around a pale spectral glass flame, pointed upward. |
| `claw` | A shadow crescent blade: blackened steel talon, worn brass root, narrow amethyst rune inlay. |
| `homing-missile` | A miniature Relicforge homing rocket with a pointed steel nose, brass guidance fins, and blue aether engine. |
| `training-drone` | A compact neutral pilot craft with a strong upward-facing silhouette, ceramic shell, brass frame, and cyan lens. |
| `affinity-light` | A sun-forged rear ship fitting: symmetric radiant brass/ivory wings and a crown-like halo collar, open center. |
| `affinity-dark` | An umbral rear ship fitting: symmetric blackened crescent vanes, dark brass collar, amethyst rune details, open center. |

## Export contract

- Full generated sources: `source/afw-*-source.png`
- Runtime sprites: `final/afw-*.png`
- Runtime scale and tint are non-destructive; original materials remain visible.
- All 21 final files were checked for 128×128 RGBA output, transparent corners,
  transparent outer edges, generous padding, and a centered non-empty alpha box.
- Player attacks use all 17 signature relics. Enemy species and boss shot kinds
  map to the nearest signature relic while preserving their authored motion,
  size class, tracer, rotation, and hitbox.
