#!/usr/bin/env python3
"""Export high-resolution BOSS REVEAL portraits from the production masters.

A new boss-reveal scene draws each boss-class unit far larger than its 128px
gameplay sprite (or even the 320px setup preview), where the upscale visibly
softens. This re-keys the 1254px chroma masters for every BOSS-CLASS id only
(legendary, mythic, sentinel — ids derived from js/aetherfall.js REALM_BOSSES,
see BOSS_IDS below) and writes padded RGBA reveal portraits at 512px.

Bosses reveal in BASE form only — no radiant pass here (that's a shiny/catch
flourish, not a reveal beat).

    python3 tools/build-aetherfall-reveals.py [--size 512]

Output: art/aetherfall-production/sprites/reveal/af-<id>-<slug>.png

Everything else keeps using the 128px finals / 320px previews; the game
falls back to them whenever a reveal is absent, so a partial run is safe.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "aetherfall-production" / "sprites" / "source"
OUT = ROOT / "art" / "aetherfall-production" / "sprites" / "reveal"
FINAL = ROOT / "art" / "aetherfall-production" / "sprites" / "final"

# boss-class ids only: legendary (base+80), mythic (base+81), and sentinels
# (base+90..base+90+n-1, n = REALM_BOSSES[realm].sents.length) for each of the
# 9 realms, base = (realm+1)*100 — derived directly from js/aetherfall.js
# REALM_BOSSES, NOT guessed. Every realm has exactly 3 sentinels EXCEPT the
# Spire of Glass (realm 6 / base 600), which authors only one ("The Foundation
# Serpent", id 690) — so this is 43 ids total, not the flat 9*5=45 a naive
# count would assume. The secret rift boss (`secret.id` 181) reuses the realm-1
# mythic's own id (Lumine, the First Dream) rather than adding a new one, so
# it needs no separate entry here.
BOSS_IDS = (
    180, 181, 190, 191, 192,   # realm 1 — Velmora / Lumine / Frost, Storm, Ember Herald
    280, 281, 290, 291, 292,   # realm 2 — Zephyrion / Verdandi / Storm, Ember, Tide Vow
    380, 381, 390, 391, 392,   # realm 3 — Thalassar / Mirajin / Tide, Frost, Hull Colossus
    480, 481, 490, 491, 492,   # realm 4 — Clockwork Regent / Nocthern / Anvil, Piston, Furnace Sibyl
    580, 581, 590, 591, 592,   # realm 5 — Voltrex / Ignivar / Chrome, Granite, Verdant Paladin
    680, 681, 690,             # realm 6 — Nyxharrow / Lucerna / Foundation Serpent (only sentinel)
    780, 781, 790, 791, 792,   # realm 7 — Pale Eclipse / Umbrix / Storm, Dream, Grove Totem
    880, 881, 890, 891, 892,   # realm 8 — Omega Seraph / Vyrakka / Volt, Drake Engine, Frost Destrier
    980, 981, 990, 991, 992,   # realm 9 — Aurelion Prime / Marionne / Vessel of Moss, Snow, Earth
)


def detect_chroma(rgb: np.ndarray) -> np.ndarray:
    """Sample the border for the backdrop colour.

    The production run does NOT use one screen colour: green-heavy subjects
    (water/grass/ice/bug vessels) were shot against MAGENTA so the key would
    not eat the art. Assuming green silently leaves those on a solid block,
    so always read the actual backdrop off the frame edge.
    """
    h, w = rgb.shape[:2]
    edge = np.concatenate([
        rgb[:6, :, :].reshape(-1, 3), rgb[-6:, :, :].reshape(-1, 3),
        rgb[:, :6, :].reshape(-1, 3), rgb[:, -6:, :].reshape(-1, 3),
    ])
    return np.median(edge, axis=0)


def key_chroma(im: Image.Image) -> Image.Image:
    """Distance key against the detected backdrop, plus a matched despill."""
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    key = detect_chroma(rgb)
    dist = np.sqrt(((rgb - key) ** 2).sum(axis=2))
    alpha = np.clip((dist - 58.0) / 52.0, 0.0, 1.0)  # soft edge, not a hard cut
    # despill: pull back whichever channels the backdrop is made of, so the
    # fringe stops glowing in the key colour (green screen -> G; magenta -> R+B)
    out = rgb.copy()
    hot = key >= (key.max() * 0.55)
    cool = ~hot
    if cool.any():
        ceiling = out[..., cool].max(axis=2) + 16.0
        for c in np.nonzero(hot)[0]:
            out[..., c] = np.minimum(out[..., c], ceiling)
    arr = np.dstack([out, alpha * 255.0]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr).convert("RGBA")


def crop_pad_resize(im: Image.Image, size: int, ratio: float = 0.785) -> Image.Image:
    """Trim to the subject, then pad so the subject fills `ratio` of the canvas
    (the id's OWN final's measured ratio — see build-aetherfall-previews.py)."""
    bbox = im.split()[3].point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    side = max(im.size)
    canvas_side = int(round(side / ratio))
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    canvas.paste(im, ((canvas.width - im.width) // 2, (canvas.height - im.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def final_subject_ratio(final_dir: Path, vid: int, default: float = 0.785) -> float:
    hits = sorted(final_dir.glob(f"af-{vid:03d}-*.png"))
    if not hits:
        return default
    im = Image.open(hits[0]).convert("RGBA")
    bbox = im.split()[3].point(lambda a: 255 if a > 24 else 0).getbbox()
    if not bbox:
        return default
    subj = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
    return max(0.5, min(0.95, subj / max(im.size)))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=512)
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
    missing = []
    for bid in BOSS_IDS:
        if args.only is not None and bid != args.only:
            continue
        src = by_id.get(bid)
        if not src:
            missing.append(bid)
            continue
        slug = re.sub(r"^af-\d+-|-source\.png$", "", src.name)
        im = crop_pad_resize(key_chroma(Image.open(src)), args.size, final_subject_ratio(FINAL, bid))
        dst = OUT / f"af-{bid:03d}-{slug}.png"
        im.save(dst, optimize=True)
        made += 1

    total_kb = sum(p.stat().st_size for p in OUT.glob("*.png")) / 1024
    print(f"build-aetherfall-reveals: {made} reveal(s) at {args.size}px -> {OUT.relative_to(ROOT)}"
          f" ({total_kb/1024:.1f} MB total)")
    if missing:
        print(f"build-aetherfall-reveals: MISSING sources for ids: {missing}")


if __name__ == "__main__":
    main()
