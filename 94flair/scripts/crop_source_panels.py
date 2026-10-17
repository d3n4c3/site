#!/usr/bin/env python3
"""Crop @exotechktx Instagram source squares to the centered art panel."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HD = ROOT / "images" / "sources-fx" / "hd"
TH = ROOT / "images" / "thumbs" / "sources"
MAN = ROOT / "images" / "sources-fx" / "manifest.json"


def white_mask(a: np.ndarray, thr: int = 210) -> np.ndarray:
    return (a[:, :, 0] >= thr) & (a[:, :, 1] >= thr) & (a[:, :, 2] >= thr)


def longest_run(mask_1d: np.ndarray) -> tuple[int, int, int]:
    best = (0, 0, 0)
    i, n = 0, len(mask_1d)
    while i < n:
        if not mask_1d[i]:
            i += 1
            continue
        j = i
        while j < n and mask_1d[j]:
            j += 1
        if j - i > best[0]:
            best = (j - i, i, j)
        i = j
    return best


def outer_frame(a: np.ndarray) -> tuple[int, int, int, int]:
    h, w, _ = a.shape
    wm = white_mask(a)
    top = bot = left = right = None
    for y in range(0, h // 2):
        length, s, e = longest_run(wm[y])
        if length >= int(w * 0.5) and abs((s + e) / 2 - w / 2) < w * 0.12:
            top = y
            break
    for y in range(h - 1, h // 2, -1):
        length, s, e = longest_run(wm[y])
        if length >= int(w * 0.5) and abs((s + e) / 2 - w / 2) < w * 0.12:
            bot = y
            break
    for x in range(0, w // 2):
        length, s, e = longest_run(wm[:, x])
        if length >= int(h * 0.55) and abs((s + e) / 2 - h / 2) < h * 0.12:
            left = x
            break
    for x in range(w - 1, w // 2, -1):
        length, s, e = longest_run(wm[:, x])
        if length >= int(h * 0.55) and abs((s + e) / 2 - h / 2) < h * 0.12:
            right = x
            break
    if None in (top, bot, left, right):
        return (185, 44, 893, 1034)
    return (left, top, right, bot)


def purple_then_white_trim(col_w: np.ndarray, col_mean: np.ndarray, max_frac: float = 0.3) -> int:
    n = len(col_w)
    limit = int(n * max_frac)
    if col_mean[0] >= 115:
        return 0
    i = 0
    while i < limit and col_mean[i] < 115:
        i += 1
    dark_len = i
    if dark_len < 12:
        return 0
    while i < limit and col_w[i] < 0.7:
        i += 1
        if i - dark_len > 8:
            return 0
    if i >= limit:
        return 0
    j = i
    while j < limit and col_w[j] > 0.5:
        j += 1
    if j - i < 12:
        return 0
    return j


def crop_box(a: np.ndarray) -> tuple[int, int, int, int]:
    fr = outer_frame(a)
    x0, y0, x1, y1 = fr[0] + 3, fr[1] + 3, fr[2] - 3, fr[3] - 3
    sub = a[y0:y1, x0:x1]
    wm = white_mask(sub, 205)
    col_w = wm.mean(axis=0)
    row_w = wm.mean(axis=1)
    col_mean = sub.mean(axis=(0, 2))
    row_mean = sub.mean(axis=(1, 2))
    lt = purple_then_white_trim(col_w, col_mean)
    rt = purple_then_white_trim(col_w[::-1], col_mean[::-1])
    tt = purple_then_white_trim(row_w, row_mean, max_frac=0.22)
    bt = purple_then_white_trim(row_w[::-1], row_mean[::-1], max_frac=0.22)
    return (x0 + lt, y0 + tt, x1 - rt, y1 - bt)


def main() -> None:
    man = json.loads(MAN.read_text()) if MAN.exists() else {}
    keys = [k for k, v in man.items() if v.get("kind") == "crop"]
    for key in keys:
        path = HD / f"{key}.jpg"
        if not path.exists():
            continue
        im = Image.open(path).convert("RGB")
        # Only crop fresh Instagram squares
        if abs(im.size[0] - im.size[1]) > 80 or im.size[0] < 900:
            print(f"skip {key} {im.size}")
            continue
        box = crop_box(np.asarray(im))
        cropped = im.crop(box)
        cropped.save(path, quality=92, optimize=True)
        t = cropped.copy()
        t.thumbnail((360, 360))
        TH.mkdir(parents=True, exist_ok=True)
        t.save(TH / f"{key}.jpg", quality=85)
        print(f"{key}: {box} -> {cropped.size}")


if __name__ == "__main__":
    main()
