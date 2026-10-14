#!/usr/bin/env python3
"""Build 9-card promo panel composites from base card HD scans."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HD_CARDS = ROOT / "images" / "cards-fx" / "hd"
PROMO_HD = ROOT / "images" / "promo-fx" / "hd"
PROMO_TH = ROOT / "images" / "thumbs" / "promo"

NINE = [
    [[48, 84, 98], [131, 11, 145], [130, 36, 143]],
    [[130, 36, 143], [127, 83, 146], [78, 112, 117]],
    [[78, 112, 117], [48, 84, 98], [131, 11, 145]],
    [[69, 104, 52], [70, 111, 53], [71, 118, 46]],
    [[71, 118, 46], [77, 119, 50], [63, 109, 49]],
    [[63, 109, 49], [69, 104, 52], [70, 111, 53]],
    [[90, 16, 129], [94, 29, 55], [92, 30, 56]],
    [[92, 30, 56], [93, 33, 59], [87, 15, 133]],
    [[87, 15, 133], [90, 16, 129], [94, 29, 55]],
]

CELL_W, CELL_H = 480, 666


def cell(n: int) -> Image.Image:
    im = Image.open(HD_CARDS / f"{int(n):03d}.jpg").convert("RGB")
    tw, th = CELL_W, CELL_H
    target_ar = tw / th
    w, h = im.size
    ar = w / h
    if ar > target_ar:
        nw = int(h * target_ar)
        x = (w - nw) // 2
        im = im.crop((x, 0, x + nw, h))
    else:
        nh = int(w / target_ar)
        y = (h - nh) // 2
        im = im.crop((0, y, w, y + nh))
    return im.resize((tw, th), Image.Resampling.LANCZOS)


def save_thumb(im: Image.Image, path: Path, thumb_w: int = 220) -> None:
    th = im.copy()
    th.thumbnail((thumb_w, int(thumb_w * im.height / im.width) + 2))
    th.save(path, quality=85, optimize=True)


def main() -> None:
    PROMO_HD.mkdir(parents=True, exist_ok=True)
    PROMO_TH.mkdir(parents=True, exist_ok=True)
    for i, sheet in enumerate(NINE, 1):
        # Keep photographed sheet 2 as-is; only refresh its thumb.
        if i == 2 and (PROMO_HD / "sheet9-2.jpg").exists():
            photo = Image.open(PROMO_HD / "sheet9-2.jpg")
            save_thumb(photo, PROMO_TH / "sheet9-2.jpg")
            print(f"kept photo sheet9-2 {photo.size}")
            continue
        out = Image.new("RGB", (CELL_W * 3, CELL_H * 3))
        for r, row in enumerate(sheet):
            for c, n in enumerate(row):
                out.paste(cell(n), (c * CELL_W, r * CELL_H))
        name = f"sheet9-{i}.jpg"
        out.save(PROMO_HD / name, quality=92, optimize=True)
        save_thumb(out, PROMO_TH / name)
        print(f"wrote {name} {out.size}")


if __name__ == "__main__":
    main()
