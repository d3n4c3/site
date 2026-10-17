#!/usr/bin/env python3
"""Build 9-card promo panel composites from base card HD scans (fronts + backs)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HD_CARDS = ROOT / "images" / "cards-fx" / "hd"
HD_BACKS = ROOT / "images" / "backs-fx" / "hd"
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


def front_cell(n: int) -> Image.Image:
    return fit_to(Image.open(HD_CARDS / f"{int(n):03d}.jpg").convert("RGB"), CELL_W, CELL_H)


def fit_to(im: Image.Image, tw: int, th: int) -> Image.Image:
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


def back_cell(n: int) -> Image.Image:
    """Portrait cell matching the front sheet; letterbox landscape backs."""
    im = Image.open(HD_BACKS / f"{int(n):03d}.jpg").convert("RGB")
    tw, th = CELL_W, CELL_H
    if im.width <= im.height:
        return fit_to(im, tw, th)
    # Landscape reading-orientation scan → letterbox into portrait cell.
    scale = tw / im.width
    nw, nh = tw, max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (tw, th), (12, 10, 16))
    canvas.paste(im, (0, (th - nh) // 2))
    return canvas


def save_thumb(im: Image.Image, path: Path, thumb_w: int = 220) -> None:
    th = im.copy()
    th.thumbnail((thumb_w, int(thumb_w * im.height / im.width) + 2))
    th.save(path, quality=85, optimize=True)


def compose(sheet: list[list[int]], cell_fn) -> Image.Image:
    out = Image.new("RGB", (CELL_W * 3, CELL_H * 3))
    for r, row in enumerate(sheet):
        for c, n in enumerate(row):
            out.paste(cell_fn(n), (c * CELL_W, r * CELL_H))
    return out


def main() -> None:
    PROMO_HD.mkdir(parents=True, exist_ok=True)
    PROMO_TH.mkdir(parents=True, exist_ok=True)
    for i, sheet in enumerate(NINE, 1):
        front_path = PROMO_HD / f"sheet9-{i}.jpg"
        # Keep existing fronts (photographed sheet 2, previously sized composites).
        if front_path.exists():
            print(f"kept front sheet9-{i} {Image.open(front_path).size}")
        else:
            front = compose(sheet, front_cell)
            front.save(front_path, quality=92, optimize=True)
            save_thumb(front, PROMO_TH / front_path.name)
            print(f"wrote {front_path.name} {front.size}")

        back = compose(sheet, back_cell)
        bname = f"sheet9-{i}-back.jpg"
        back.save(PROMO_HD / bname, quality=92, optimize=True)
        save_thumb(back, PROMO_TH / bname)
        print(f"wrote {bname} {back.size}")


if __name__ == "__main__":
    main()
