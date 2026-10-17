#!/usr/bin/env python3
"""Fetch original comic covers for Flair CREDITS from Marvel Database image CDN.

Uses Fandom's MD5 image paths (no HTML scrape — wiki pages 403 bot traffic).
Writes images/sources-fx/hd/{NNN}.jpg and updates manifest.json.
Preserves existing Instagram crops unless --force.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OUT = ROOT / "images" / "sources-fx"
HD = OUT / "hd"
TH = ROOT / "images" / "thumbs" / "sources"
MAN = OUT / "manifest.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
CDN = "https://static.wikia.nocookie.net/marveldatabase/images"


def load_credits():
    t = INDEX.read_text()
    credits = ast.literal_eval("[" + re.search(r"const CREDITS = \[(.*?)\];", t, re.S).group(1) + "]")
    pb = ast.literal_eval("[" + re.search(r"const PB_CREDITS = \[(.*?)\];", t, re.S).group(1) + "]")
    return credits, pb


def parse_source(src: str):
    if not src or not src.strip():
        return None
    s = src.strip()
    if re.search(r"in-house|sketch|suspected unused|playing cards|t-shirt|stand-up|standee|magnets", s, re.I):
        return None
    first = s.split(". ")[0]
    # Annuals: "Title (YEAR) Annual #N, Page/Cover"
    m = re.match(
        r"^(.+?)\s*(?:\((\d{4})(?:\s*[-–]\s*\d{4})?\))?\s+Annual\s*#(\d+)\s*,\s*(Cover|Page\s*\d+|Splash|Pin-?up).*$",
        first,
        re.I,
    )
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": m.group(2),
            "num": int(m.group(3)),
            "annual": True,
            "part": m.group(4),
            "raw": s,
        }
    m = re.match(
        r"^(.+?)\s*(?:\((\d{4})(?:\s*[-–]\s*\d{4})?\))?\s*#(\d+)\s*,\s*(Cover|Page\s*\d+|Splash|Pin-?up).*$",
        first,
        re.I,
    )
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": m.group(2),
            "num": int(m.group(3)),
            "annual": False,
            "part": m.group(4),
            "raw": s,
        }
    m2 = re.match(r"^(.+?)\s*#(\d+)\s*,?\s*(Cover|Page\s*\d+|Splash|Pin-?up)", first, re.I)
    if m2:
        return {
            "title": m2.group(1).strip(" ,"),
            "year": None,
            "num": int(m2.group(2)),
            "annual": False,
            "part": m2.group(3),
            "raw": s,
        }
    return None


def title_bases(title: str) -> list[str]:
    t = title.strip()
    # Strip trailing "(1963)" already handled by parse; clean punctuation
    variants = [t]
    if t.startswith("The "):
        variants.append(t[4:])
    else:
        variants.append("The " + t)

    # Canonical Marvel Database renames
    canon = {
        "Amazing Spider-Man": "Amazing Spider-Man",
        "The Amazing Spider-Man": "Amazing Spider-Man",
        "Incredible Hulk": "Incredible Hulk",
        "The Incredible Hulk": "Incredible Hulk",
        "Spectacular Spider-Man": "Spectacular Spider-Man",
        "The Spectacular Spider-Man": "Spectacular Spider-Man",
        "Uncanny X-Men": "Uncanny X-Men",
        "The Uncanny X-Men": "Uncanny X-Men",
        "Fantastic Four": "Fantastic Four",
        "The Fantastic Four": "Fantastic Four",
        "Avengers": "Avengers",
        "The Avengers": "Avengers",
        "The Avengers (1963)": "Avengers",
        "Daredevil: The Man Without Fear": "Daredevil",
        "Daredevil": "Daredevil",
        "Marc Spector: Moon Knight": "Marc Spector Moon Knight",
        "Venom: Lethal Protector": "Venom Lethal Protector",
        "Venom: The Madness": "Venom The Madness",
        "Deadpool: The Circle Chase": "Deadpool The Circle Chase",
        "Ghost Rider & Blaze: Spirits of Vengeance": "Ghost Rider Blaze Spirits of Vengeance",
        "Punisher: War Journal": "Punisher War Journal",
        "The Punisher: War Zone": "Punisher War Zone",
        "Silver Surfer": "Silver Surfer",
        "The Silver Surfer": "Silver Surfer",
        "Thunderstrike!": "Thunderstrike",
        "Doctor Strange": "Doctor Strange",
        "Doctor Strange, Sorcerer Supreme": "Doctor Strange Sorcerer Supreme",
        "New Mutants": "New Mutants",
        "The New Mutants": "New Mutants",
        "New Warriors": "New Warriors",
        "The New Warriors": "New Warriors",
        "West Coast Avengers": "West Coast Avengers",
        "Sensational She-Hulk": "Sensational She-Hulk",
        "The Sensational She-Hulk": "Sensational She-Hulk",
        "Original Ghost Rider": "Original Ghost Rider",
        "The Original Ghost Rider": "Original Ghost Rider",
        "Infinity War": "Infinity War",
        "The Infinity War": "Infinity War",
        "Thanos Quest": "Thanos Quest",
        "The Thanos Quest": "Thanos Quest",
        "Invaders": "Invaders",
        "The Invaders": "Invaders",
        "Lethal Foes of Spider-Man": "Lethal Foes of Spider-Man",
        "Warlock Chronicles": "Warlock Chronicles",
        "The Warlock Chronicles": "Warlock Chronicles",
    }
    for k, v in canon.items():
        if t == k or t.replace(":", "") == k.replace(":", ""):
            variants.append(v)

    variants.append(t.replace(":", ""))
    variants.append(t.replace(":", " "))
    # Drop year parenthetical leftovers
    variants = [re.sub(r"\s*\(\d{4}(?:\s*[-–]\s*\d{4})?\)\s*", " ", v) for v in variants]
    variants = [re.sub(r"\s+", " ", v).strip(" ,") for v in variants]

    out, seen = [], set()
    for v in variants:
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def filename_candidates(meta: dict) -> list[str]:
    names = []
    num = meta["num"]
    annual = meta.get("annual")
    for base in title_bases(meta["title"]):
        slug = base.replace(" ", "_")
        slug = re.sub(r"[^\w\-]", "", slug.replace("'", "").replace("!", ""))
        slug = re.sub(r"_+", "_", slug)
        if annual:
            # Avengers_Annual_Vol_1_20 / Amazing_Spider-Man_Annual_Vol_1_N
            names += [
                f"{slug}_Annual_Vol_1_{num}.jpg",
                f"{slug}_Vol_1_Annual_{num}.jpg",
                f"{slug}_Annual_{num}.jpg",
            ]
        else:
            names += [
                f"{slug}_Vol_1_{num}.jpg",
                f"{slug}_Vol_2_{num}.jpg",
                f"{slug}_{num}.jpg",
            ]
        # Hyphenated Spider-Man already in slug; also try without The_
        if slug.startswith("The_"):
            names.append(f"{slug[4:]}_Vol_1_{num}.jpg")
    # unique preserve order
    out, seen = [], set()
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def cdn_url(filename: str) -> str:
    h = hashlib.md5(filename.encode()).hexdigest()
    return f"{CDN}/{h[0]}/{h[:2]}/{filename}/revision/latest"


def http_get(url: str) -> bytes | None:
    # Wikia CDN 403s when Accept is restricted to image/* — plain UA only.
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            data = r.read()
            ctype = r.headers.get("Content-Type", "")
            if "html" in ctype.lower():
                return None
            return data
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None


def save_image(data: bytes, dest: Path, thumb: Path | None = None) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    tmp.write_bytes(data)
    im = Image.open(tmp).convert("RGB")
    if min(im.size) < 180:
        tmp.unlink(missing_ok=True)
        raise ValueError(f"too small {im.size}")
    im.save(dest, quality=90, optimize=True)
    tmp.unlink(missing_ok=True)
    if thumb is not None:
        t = im.copy()
        t.thumbnail((360, 360))
        thumb.parent.mkdir(parents=True, exist_ok=True)
        t.save(thumb, quality=82)


def find_image(meta: dict) -> tuple[bytes | None, str | None, str | None]:
    for name in filename_candidates(meta):
        url = cdn_url(name)
        data = http_get(url)
        if data and len(data) > 8000:
            return data, url, name
    return None, None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    HD.mkdir(parents=True, exist_ok=True)
    TH.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MAN.read_text()) if MAN.exists() else {}
    credits, pb = load_credits()

    jobs = []
    for i, (_f, src, _a) in enumerate(credits, 1):
        meta = parse_source(src or "")
        if meta:
            jobs.append((f"{i:03d}", meta, src or ""))
    for i, (src, _a) in enumerate(pb, 1):
        meta = parse_source(src or "")
        if meta:
            jobs.append((f"pb{i:02d}", meta, src or ""))

    print(f"jobs={len(jobs)} existing={len(manifest)}")
    saved = missed = kept = 0
    for key, meta, raw in jobs:
        if args.limit and saved >= args.limit:
            break
        dest = HD / f"{key}.jpg"
        if dest.exists() and not args.force:
            kind = (manifest.get(key) or {}).get("kind")
            if kind in ("crop", "instagram", "ig"):
                kept += 1
                continue
            if key in manifest:
                kept += 1
                continue

        data, url, name = find_image(meta)
        if not data:
            print(f"MISS {key} {meta['title']} #{meta['num']}")
            missed += 1
            continue
        try:
            save_image(data, dest, TH / f"{key}.jpg")
        except Exception as e:
            print(f"BAD {key} {e}")
            missed += 1
            continue
        entry = dict(manifest.get(key) or {})
        entry.update(
            {
                "file": f"{key}.jpg",
                "source_line": raw,
                "kind": "wiki",
                "wiki_file": name,
            }
        )
        if (HD / f"{key}-comic.jpg").exists():
            entry.setdefault("comic", f"{key}-comic.jpg")
        else:
            # For wiki covers, comic zoom can reuse the same file
            entry["comic"] = f"{key}.jpg"
        manifest[key] = entry
        MAN.write_text(json.dumps(manifest, indent=2, sort_keys=True))
        print(f"OK {key} ← {name} ({len(data)//1024}KB)")
        saved += 1
        time.sleep(0.05)

    print(f"done saved={saved} kept={kept} missed={missed} manifest={len(manifest)}")


if __name__ == "__main__":
    main()
