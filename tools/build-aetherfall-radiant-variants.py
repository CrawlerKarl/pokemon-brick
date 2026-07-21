#!/usr/bin/env python3
"""Build deterministic radiant variants from validated Aetherfall base sprites."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
from pathlib import Path
import warnings

import numpy as np
from PIL import Image, ImageFilter


warnings.filterwarnings("ignore", category=DeprecationWarning, module="PIL")


def stable_phase(stable_key: str) -> tuple[int, float]:
    digest = hashlib.sha256(stable_key.encode("utf-8")).digest()
    return 72 + digest[0] % 64, (digest[1] / 255.0) * math.tau


def radiant_rgb(
    rgb: np.ndarray, stable_key: str, alpha: np.ndarray, y_offset: int = 0
) -> np.ndarray:
    height, width = rgb.shape[:2]
    hue_shift, phase = stable_phase(stable_key)
    rgb_image = Image.fromarray(rgb.astype(np.uint8), "RGB")
    hsv = np.asarray(rgb_image.convert("HSV"), dtype=np.float32)

    hue = (hsv[..., 0] + hue_shift) % 256
    saturation = np.clip(hsv[..., 1] * 1.12 + 10, 0, 255)
    value = np.clip(hsv[..., 2] * 1.045 + 4, 0, 255)
    shifted_hsv = np.stack((hue, saturation, value), axis=-1).astype(np.uint8)
    shifted = np.asarray(Image.fromarray(shifted_hsv, "HSV").convert("RGB"), dtype=np.float32)

    source = rgb.astype(np.float32)
    neutral = np.clip((58.0 - hsv[..., 1]) / 58.0, 0.0, 1.0)
    yy, xx = np.mgrid[y_offset : y_offset + height, 0:width]
    wave = 0.5 + 0.5 * np.sin(xx * 0.073 + yy * 0.051 + phase)
    opal_a = np.array([174.0, 224.0, 255.0])
    opal_b = np.array([255.0, 178.0, 228.0])
    opal = opal_a[None, None, :] * wave[..., None] + opal_b[None, None, :] * (1.0 - wave[..., None])
    luminance = (0.2126 * source[..., 0] + 0.7152 * source[..., 1] + 0.0722 * source[..., 2]) / 255.0
    opal = opal * (0.28 + 0.72 * luminance[..., None])

    color_mix = 0.82 - 0.20 * neutral
    result = source * (1.0 - color_mix[..., None]) + shifted * color_mix[..., None]
    neutral_mix = neutral * (0.24 + 0.20 * luminance)
    result = result * (1.0 - neutral_mix[..., None]) + opal * neutral_mix[..., None]

    alpha_image = Image.fromarray(alpha.astype(np.uint8), "L")
    eroded = np.asarray(alpha_image.filter(ImageFilter.MinFilter(3)), dtype=np.float32)
    inner_edge = np.clip((alpha.astype(np.float32) - eroded) / 255.0, 0.0, 1.0)
    rim = np.array([255.0, 226.0, 142.0])
    rim_mix = inner_edge * 0.24
    result = result * (1.0 - rim_mix[..., None]) + rim * rim_mix[..., None]

    highlight = np.clip((luminance - 0.68) / 0.32, 0.0, 1.0) ** 2
    highlight_mix = highlight * 0.12
    result = result * (1.0 - highlight_mix[..., None]) + 255.0 * highlight_mix[..., None]
    return np.clip(result, 0, 255).astype(np.uint8)


def transform_final(source_path: Path, target_path: Path, stable_key: str) -> dict:
    source = Image.open(source_path).convert("RGBA")
    array = np.asarray(source)
    rgb = radiant_rgb(array[..., :3], stable_key, array[..., 3])
    output = np.dstack((rgb, array[..., 3])).astype(np.uint8)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output, "RGBA").save(target_path)

    verified = Image.open(target_path).convert("RGBA")
    alpha = verified.getchannel("A")
    width, height = verified.size
    corners = [
        verified.getpixel((0, 0))[3],
        verified.getpixel((width - 1, 0))[3],
        verified.getpixel((0, height - 1))[3],
        verified.getpixel((width - 1, height - 1))[3],
    ]
    edge_nonzero = sum(
        bool(verified.getpixel((x, 0))[3] or verified.getpixel((x, height - 1))[3])
        for x in range(width)
    ) + sum(
        bool(verified.getpixel((0, y))[3] or verified.getpixel((width - 1, y))[3])
        for y in range(height)
    )
    return {
        "file": str(target_path),
        "mode": verified.mode,
        "size": list(verified.size),
        "bbox": list(alpha.getbbox() or (0, 0, 0, 0)),
        "corners": corners,
        "edgeNonzero": edge_nonzero,
        "valid": verified.mode == "RGBA" and not any(corners) and edge_nonzero == 0,
    }


def transform_source(source_path: Path, target_path: Path, stable_key: str) -> None:
    source = Image.open(source_path).convert("RGB")
    rgb = np.asarray(source)
    border = np.concatenate((rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]), axis=0)
    key = np.median(border, axis=0)
    mixed = rgb.copy()
    band_height = 128
    for y_start in range(0, rgb.shape[0], band_height):
        y_end = min(y_start + band_height, rgb.shape[0])
        chunk = rgb[y_start:y_end]
        distance = np.linalg.norm(
            chunk.astype(np.float32) - key[None, None, :], axis=-1
        )
        blend = np.clip((distance - 14.0) / 72.0, 0.0, 1.0)
        alpha = np.clip(blend * 255.0, 0, 255).astype(np.uint8)
        radiant = radiant_rgb(chunk, stable_key, alpha, y_start).astype(np.float32)
        transformed = (
            chunk.astype(np.float32) * (1.0 - blend[..., None])
            + radiant * blend[..., None]
        )
        transformed[distance <= 14.0] = chunk[distance <= 14.0]
        mixed[y_start:y_end] = np.clip(transformed, 0, 255).astype(np.uint8)
        del distance, blend, alpha, radiant, transformed
    target_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(mixed, "RGB").save(target_path)
    del rgb, border, mixed
    gc.collect()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    production = root / "art/aetherfall-production"
    manifest_path = production / "manifests/aetherfall-core-art-manifest.json"
    progress_path = production / "manifests/generation-progress.json"
    validation_path = production / "manifests/radiant-validation.json"

    manifest = json.loads(manifest_path.read_text())
    rows = manifest if isinstance(manifest, list) else manifest.get("assets", manifest.get("rows", []))
    base_by_key = {row["stableKey"]: row for row in rows if row.get("variant") is None}
    radiant_rows = [row for row in rows if row.get("variant") == "radiant"]
    progress = json.loads(progress_path.read_text())
    validations = []

    for index, radiant in enumerate(radiant_rows, start=1):
        base_key = radiant["stableKey"].removesuffix(":radiant")
        base = base_by_key[base_key]
        base_source = production / base["sourceFile"]
        radiant_source = production / radiant["sourceFile"]
        base_final = production / base["finalFile"]
        radiant_final = production / radiant["finalFile"]
        transform_source(base_source, radiant_source, radiant["stableKey"])
        validation = transform_final(base_final, radiant_final, radiant["stableKey"])
        validation["stableKey"] = radiant["stableKey"]
        validation["sourceFile"] = str(radiant_source)
        validations.append(validation)
        if not validation["valid"] or validation["size"] != [radiant["gameplaySize"], radiant["gameplaySize"]]:
            raise RuntimeError(f"Radiant validation failed: {validation}")
        progress[radiant["stableKey"]] = {
            "status": "generated-validated",
            "generatedAt": "2026-07-20",
            "promptLog": "PRODUCTION_RUN.md#radiant-variant-generation",
            "alphaValidated": True,
            "generationMethod": "deterministic-prismatic-palette-transform-v1",
        }
        if index % 25 == 0 or index == len(radiant_rows):
            print(f"radiants {index}/{len(radiant_rows)}", flush=True)

    validation_report = {
        "generatedAt": "2026-07-20",
        "method": "deterministic-prismatic-palette-transform-v1",
        "total": len(validations),
        "valid": sum(1 for item in validations if item["valid"]),
        "items": validations,
    }
    validation_path.write_text(json.dumps(validation_report, indent=2) + "\n")
    progress_path.write_text(json.dumps(progress, indent=2) + "\n")
    print(f"validated {validation_report['valid']}/{validation_report['total']}")


if __name__ == "__main__":
    main()
