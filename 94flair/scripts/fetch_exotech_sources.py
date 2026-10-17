#!/usr/bin/env python3
"""Slowly scrape @exotechktx Instagram Flair carousels for comic source art.

Instagram rate-limits aggressively; this script backs off and resumes from
manifest. Prefer running infrequently. Writes:
  images/sources-fx/hd/{NNN}.jpg          cropped source (carousel #2)
  images/sources-fx/hd/{NNN}-comic.jpg    full comic page/cover (#3)
  images/thumbs/sources/{NNN}.jpg
  images/sources-fx/manifest.json
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images" / "sources-fx"
HD = OUT / "hd"
TH = ROOT / "images" / "thumbs" / "sources"
RAW = Path("/tmp/exotechktx-sources/raw")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
APP = "936619743392459"


def get(url: str, retries: int = 8) -> bytes:
    headers = {
        "User-Agent": UA,
        "X-IG-App-ID": APP,
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
    }
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 503):
                wait = min(300, 15 * (2**i))
                print(f"rate {e.code}, sleep {wait}s")
                time.sleep(wait)
                continue
            raise
    raise last  # type: ignore


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=90).read()
    dest.write_bytes(data)


def save_jpeg(src: Path, dest: Path, thumb: Path | None = None) -> None:
    im = Image.open(src).convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, quality=90, optimize=True)
    if thumb is not None:
        t = im.copy()
        t.thumbnail((360, 360))
        thumb.parent.mkdir(parents=True, exist_ok=True)
        t.save(thumb, quality=82)


def parse_caption(cap: str) -> dict:
    base = re.search(r"Base\s*\((\d+)\s*of\s*150\)", cap, re.I)
    pb = re.search(r"Power\s*Blast[^\n]*\((\d+)\s*of\s*18\)", cap, re.I)
    source = re.search(r"Source of Art:\s*(.+)", cap)
    return {
        "card": int(base.group(1)) if base else None,
        "powerblast": int(pb.group(1)) if pb else None,
        "source_line": source.group(1).strip() if source else "",
    }


def main() -> None:
    HD.mkdir(parents=True, exist_ok=True)
    TH.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    print("fetching profile…")
    body = get("https://www.instagram.com/api/v1/users/web_profile_info/?username=exotechktx")
    (RAW / "profile.json").write_bytes(body)
    user = json.loads(body)["data"]["user"]
    edges = user["edge_owner_to_timeline_media"]["edges"]
    print(f"got {len(edges)} posts on first page (of {user['edge_owner_to_timeline_media']['count']})")

    for e in edges:
        node = e["node"]
        caps = (
            ((node.get("edge_media_to_caption") or {}).get("edges") or [{}])[0]
            .get("node", {})
            .get("text")
            or ""
        )
        if "Flair" not in caps and "flair" not in caps.lower():
            continue
        meta = parse_caption(caps)
        key = None
        if meta["card"]:
            key = f"{meta['card']:03d}"
        elif meta["powerblast"]:
            key = f"pb{meta['powerblast']:02d}"
        else:
            continue
        if key in manifest and (HD / f"{key}.jpg").exists():
            print(f"skip {key}")
            continue
        kids = [c["node"] for c in (node.get("edge_sidecar_to_children") or {}).get("edges") or []]
        urls = [k.get("display_url") for k in kids if k.get("display_url")]
        if len(urls) < 2:
            print(f"skip {key}: only {len(urls)} images")
            continue
        tmp = RAW / f"{key}"
        tmp.mkdir(exist_ok=True)
        for i, url in enumerate(urls, 1):
            download(url, tmp / f"ig{i}.jpg")
            time.sleep(0.4)
        # carousel: 1=front, 2=source crop, 3=comic, 4=back (usually)
        crop = tmp / "ig2.jpg"
        comic = tmp / ("ig3.jpg" if (tmp / "ig3.jpg").exists() else "ig2.jpg")
        save_jpeg(crop, HD / f"{key}.jpg", TH / f"{key}.jpg")
        save_jpeg(comic, HD / f"{key}-comic.jpg")
        manifest[key] = {
            "file": f"{key}.jpg",
            "comic": f"{key}-comic.jpg",
            "source_line": meta["source_line"],
            "shortcode": node.get("shortcode"),
            "kind": "crop",
        }
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))
        print(f"saved {key}: {meta['source_line'][:80]}")
        time.sleep(1.5)

    print(f"done — {len(manifest)} sources in manifest")
    print("Note: Instagram only returns ~12 posts per profile call; re-run later for more.")


if __name__ == "__main__":
    main()
