# Aetherfall production style lock

## Chosen blend

The common visual foundation is **Relicforge Miniatures**: pre-rendered 3D
sprites with controlled PBR-like materials, hand-painted color variation,
strong silhouettes, restrained bloom, and a consistent three-quarter
front/top game camera.

**Arcane Alloy** detail is added in proportion to gameplay importance. It is
not a second style. It contributes denser material storytelling, layered rune
engraving, sharper highlights, selective painterly accents, iridescent energy,
and more intricate construction.

The definitive visual reference is
`aetherfall-relicforge-arcane-alloy-style-lock.png`.

## Effort ladder

| Asset tier | Relicforge | Arcane Alloy | Intended treatment |
|---|---:|---:|---|
| Common creature | 90% | 10% | 3–4 large material zones; cleanest silhouettes |
| Evolved creature | 80% | 20% | One additional prop or armor system |
| Elite creature | 68% | 32% | Richer surface wear, inlays, and secondary silhouette |
| Pilot form I | 88% | 12% | Compact, extremely readable vessel |
| Pilot form II | 76% | 24% | Added hardpoints and clearer class ornament |
| Pilot form III | 60% | 40% | Ceremony-grade silhouette without boss density |
| Sentinel | 55% | 45% | Boss-adjacent armor and one signature effect |
| Legendary boss | 25% | 75% | Dense authored materials and dramatic hierarchy |
| Mythic boss | 20% | 80% | Highest detail, stranger materials, unique energy grammar |

## Shared invariants

- Identical three-quarter front/top camera across every character sprite.
- Top-left key light and cool opposing rim light.
- Deep navy value check; silhouettes must remain readable without their glow.
- Controlled bloom only around cores, eyes, runes, and thrusters.
- Ordinary enemies use three to five major color/value blocks.
- Bosses may use eight to thirteen material zones, but the outer silhouette
  still carries the first read.
- Antique brass, weathered steel, ceramic, bark, glass, crystal, cloth, and
  aether energy form one common material library.
- No ground plane, pedestal, cast shadow, environmental scenery, text, logos,
  or watermark in final sources.
- Original designs only; never imitate an existing creature franchise.

## Boss investment rules

Spend the most effort where the game displays art largest or longest:

1. Legendary and mythic combat sprites.
2. Boss-introduction and codex portraits derived from those sprites.
3. Pilot form III and affinity variants.
4. Sentinels and rare anomalies.
5. Ordinary elite forms.

Do not spend boss-level texture density on early common enemies. Their value is
silhouette variety, personality, material separation, and instant type read.

## Source and export contract

- Generate one isolated asset per image-generation call.
- Keep a full-resolution source before any background removal or downscaling.
- Ordinary units and pilots target a 1024–1536 square source and a 128 square
  gameplay export.
- Sentinels and bosses target a 1536–2048 square source and a 192 square
  gameplay export.
- Verify every asset at its real 36–64 px combat footprint as well as its
  nominal export size.
- Preserve generous transparent padding and a stable center of mass.
- `manifests/aetherfall-core-art-manifest.json` and `.csv` are the stable handoff
  contracts for generation and implementation.

## Chroma-key strategy

Use flat `#ff00ff` for green, cyan, translucent-green, or foliage-heavy
subjects. Use flat `#00ff00` for purple, brass, steel, fire, and neutral
subjects. The background must be perfectly uniform with no floor, shadow,
reflection, or gradient.

Thin glass, smoke, semi-transparent energy, and crystalline wings may require a
native-transparency fallback instead of chroma removal. Do not silently change
generation paths; flag those assets after validation.

## Style-lock generation prompt

The production reference was generated with the built-in image-generation
workflow using the Relicforge board as the primary reference and the Arcane
Alloy board as the secondary reference.

```text
Blend the references into one coherent tiered production language. Ordinary
creatures use approximately 85–90% Relicforge and 10–15% Arcane Alloy. Evolved
elites and final pilot forms use approximately 60–75% Relicforge and 25–40%
Arcane Alloy. Sentinels use 55% Relicforge and 45% Arcane Alloy. Legendary and
mythic bosses use 20–25% Relicforge and 75–80% Arcane Alloy. Preserve the
Relicforge camera, silhouette discipline, lighting direction, common material
library, and controlled bloom at every tier. Add Arcane Alloy's painterly
micro-detail, layered rune engraving, surface wear, iridescent energy, and
dramatic hierarchy only as gameplay importance rises. No text, logos, frames,
watermark, ground plane, environmental scene, or mismatched rendering style.
```
