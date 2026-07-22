#!/usr/bin/env python3
"""Export high-resolution VESSEL PREVIEW sprites from the production masters.

The runtime bestiary ships at 128x128 — right for gameplay, but the setup
screens and the codex gallery now draw a chosen vessel at up to ~190px (and
the gallery at 384px), where a 128px source visibly softens.

This re-keys the 1254px chroma masters for the 54 PILOT VESSEL forms only
(ids 10-63) and writes padded RGBA previews. Everything else keeps using the
128px finals; the game falls back to them whenever a preview is absent, so a
partial run is always safe.

    python3 tools/build-aetherfall-previews.py [--size 384]

Output: art/aetherfall-production/sprites/preview/af-<id>-<slug>.png
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
from PIL import Image

import importlib.util as _ilu
_spec = _ilu.spec_from_file_location(
    "afradiant", Path(__file__).resolve().parent / "build-aetherfall-radiant-variants.py")
_afr = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_afr)
transform_final = _afr.transform_final

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "aetherfall-production" / "sprites" / "source"
FINAL = ROOT / "art" / "aetherfall-production" / "sprites" / "final"
OUT = ROOT / "art" / "aetherfall-production" / "sprites" / "preview"

# pilot vessels only: 18 classes x 3 forms, ids 10..63 (see aetherfall.js)
VESSEL_IDS = range(10, 64)


def key_chroma(im: Image.Image) -> Image.Image:
    """Green-screen key + despill, matching the production look."""
    rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # a chroma pixel is one where green dominates BOTH other channels
    dom = g - np.maximum(r, b)
    alpha = np.clip((dom - 24) / 46.0, 0.0, 1.0)  # soft edge, not a hard cut
    alpha = 1.0 - alpha
    # despill: pull green back to the neighbours' level on fringe pixels
    spill = np.clip(g - np.maximum(r, b), 0, None)
    g2 = np.where(spill > 0, np.maximum(r, b) + np.clip(g - np.maximum(r, b) - 18, 0, None), g)
    out = np.dstack([r, g2, b, (alpha * 255)]).astype(np.uint8)
    return Image.fromarray(out).convert("RGBA")


def crop_pad_resize(im: Image.Image, size: int) -> Image.Image:
    """Trim to the subject, then centre it in a square with even padding."""
    bbox = im.split()[3].point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    side = max(im.size)
    # the shipped 128px finals frame their subject at ~79% of the canvas —
    # match it exactly, or the hull visibly jumps size when the game swaps
    # between a preview and its fallback final
    pad = int(round(side * 0.134))
    canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, ((canvas.width - im.width) // 2, (canvas.height - im.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=320)
    ap.add_argument("--only", type=int, default=None, help="single id, for spot checks")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    by_id: dict[int, Path] = {}
    for p in SRC.glob("af-*-source.png"):
        if "-radiant-" in p.name:
            continue
        m = re.match(r"af-(\d+)-", p.name)
        if m:
            by_id[int(m.group(1))] = p

    made = 0
    for vid in VESSEL_IDS:
        if args.only is not None and vid != args.only:
            continue
        src = by_id.get(vid)
        if not src:
            continue
        slug = re.sub(r"^af-\d+-|-source\.png$", "", src.name)
        im = crop_pad_resize(key_chroma(Image.open(src)), args.size)
        dst = OUT / f"af-{vid:03d}-{slug}.png"
        im.save(dst, optimize=True)
        made += 1
        # the LIGHT path flies the RADIANT casting — give it a matching preview
        # using the SHIPPED transform and stable key, so the preview's palette
        # is identical to the 128px radiant final it replaces
        rad = OUT / f"af-{vid:03d}-{slug}-radiant.png"
        transform_final(dst, rad, f"aetherfall:{vid}:radiant")
        made += 1

    total_kb = sum(p.stat().st_size for p in OUT.glob("*.png")) / 1024
    print(f"build-aetherfall-previews: {made} preview(s) at {args.size}px -> {OUT.relative_to(ROOT)}"
          f" ({total_kb/1024:.1f} MB total)")


if __name__ == "__main__":
    main()
