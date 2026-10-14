#!/usr/bin/env python3
"""Trim scanner overscan / uneven cuts from landscape card-back scans.

Portrait scans of landscape backs sometimes include dark/gray fringe on one or
more edges. When rotated into the viewer gold frame, that fringe reads as a gap.

Usage:
  python3 scripts/trim_back_overscan.py            # dry-run report
  python3 scripts/trim_back_overscan.py --apply    # rewrite matching HD backs
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = (738, 1024)
SETS = {
    "base": ROOT / "images/backs-fx/hd",
    "pb": ROOT / "images/powerblast-backs-fx/hd",
}


def detect_trims(path: str | Path, max_trim: int = 48) -> tuple[int, int, int, int]:
    bgr = cv2.imread(str(path))
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    h, w = gray.shape
    sat = rgb.max(2) - rgb.min(2)
    center_g = float(gray[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4].mean())
    center_s = float(sat[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4].mean())

    def walk(g_line, s_line, from_start=True):
        g = g_line if from_start else g_line[::-1]
        s = s_line if from_start else s_line[::-1]
        n = 0
        for i in range(min(max_trim, len(g) // 6)):
            gv, sv = float(g[i]), float(s[i])
            dark = gv < 48 and sv < 22
            gray_flat = 48 <= gv < 105 and sv < 16
            if dark or gray_flat:
                n += 1
            else:
                break
        if n < 3:
            return 0
        fg = float(g[:n].mean())
        fs = float(s[:n].mean())
        if abs(fg - center_g) < 25 and abs(fs - center_s) < 8:
            return 0
        nxt, nxs = g[n : n + 12], s[n : n + 12]
        if len(nxt) == 0:
            return 0
        transition = (
            float(nxt.mean()) > fg + 18
            or float(nxs.mean()) > fs + 6
            or float(nxt.max()) > fg + 40
        )
        return n if transition else 0

    row_g, col_g = gray.mean(1), gray.mean(0)
    row_s, col_s = sat.mean(1), sat.mean(0)
    return (
        walk(row_g, row_s, True),
        walk(col_g, col_s, False),
        walk(row_g, row_s, False),
        walk(col_g, col_s, True),
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--min-trim", type=int, default=3)
    args = ap.parse_args()

    report = []
    for label, folder in SETS.items():
        for path in sorted(folder.glob("*.jpg")):
            trims = detect_trims(path)
            if max(trims) < args.min_trim:
                continue
            t, r, b, l = trims
            # 1px safety inset on sides we already trim
            if t:
                t += 1
            if r:
                r += 1
            if b:
                b += 1
            if l:
                l += 1
            entry = {"set": label, "file": path.name, "trims_TRBL": [t, r, b, l]}
            report.append(entry)
            print(f"{label}/{path.name}: TRBL={[t, r, b, l]}")
            if args.apply:
                im = Image.open(path).convert("RGB")
                w, h = im.size
                fixed = im.crop((l, t, w - r, h - b)).resize(
                    TARGET, Image.Resampling.LANCZOS
                )
                fixed.save(path, quality=95, optimize=True)

    print(json.dumps({"count": len(report), "files": report}, indent=2))


if __name__ == "__main__":
    main()
