#!/usr/bin/env python3
"""Fetch @exotechktx Instagram Flair source crops via mobile feed API.

Slide 2 = cropped original art; slide 3 = full comic page/cover context.
"""
from __future__ import annotations

import json
import random
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HD = ROOT / "images" / "sources-fx" / "hd"
TH = ROOT / "images" / "thumbs" / "sources"
MAN = ROOT / "images" / "sources-fx" / "manifest.json"
RAW = Path("/tmp/exotechktx-sources/raw")

UID = "46257896100"
APP = "936619743392459"
UAS = [
    "Instagram 192.168.1.2.75 Android (31/12; 420dpi; 1080x2400; Google/google; Pixel 6; redfin; redfin; en_US; 458229237)",
    "Instagram 10.0.1.1.107 Android (33/13; 480dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229258)",
]


def best_url(obj: dict) -> str | None:
    vers = (obj.get("image_versions2") or {}).get("candidates") or []
    if not vers:
        return None
    return sorted(vers, key=lambda c: c.get("width", 0) * c.get("height", 0), reverse=True)[0]["url"]


def get(url: str, retries: int = 12) -> bytes:
    last: Exception | None = None
    for i in range(retries):
        h = {
            "User-Agent": random.choice(UAS),
            "X-IG-App-ID": APP,
            "X-IG-Capabilities": "3brTvw==",
            "Accept": "*/*",
        }
        try:
            req = urllib.request.Request(url, headers=h)
            return urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            last = e
            wait = min(300, 20 * (2 ** min(i, 4)))
            print(f"  HTTP {e.code}, sleep {wait}s", flush=True)
            time.sleep(wait)
    assert last
    raise last


def card_key(cap: str) -> str | None:
    m = re.search(r"Base\s*\((\d+)\s*of\s*150\)", cap, re.I)
    if m:
        return f"{int(m.group(1)):03d}"
    pb = re.search(r"Power\s*Blast[^\n]*\((\d+)\s*of\s*18\)", cap, re.I)
    if pb:
        return f"pb{int(pb.group(1)):02d}"
    return None


def save_item(it: dict, manifest: dict) -> bool:
    cap = (it.get("caption") or {}).get("text") or ""
    code = it.get("code") or ""
    if "Flair" not in cap:
        return False
    key = card_key(cap)
    if not key:
        return False
    if (manifest.get(key) or {}).get("kind") == "crop" and (HD / f"{key}.jpg").exists():
        return False
    source = re.search(r"Source of Art:\s*(.+)", cap)
    source_line = source.group(1).strip() if source else ""
    urls = [u for u in (best_url(c) for c in (it.get("carousel_media") or [])) if u]
    if len(urls) < 2:
        print(f"  few imgs {key} {len(urls)}", flush=True)
        return False
    tmp = RAW / key
    tmp.mkdir(parents=True, exist_ok=True)
    for i, u in enumerate(urls, 1):
        data = urllib.request.urlopen(
            urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=90
        ).read()
        (tmp / f"ig{i}.jpg").write_bytes(data)
        time.sleep(0.15)
    crop = tmp / "ig2.jpg"
    comic = tmp / "ig3.jpg" if (tmp / "ig3.jpg").exists() else crop
    im = Image.open(crop).convert("RGB")
    HD.mkdir(parents=True, exist_ok=True)
    TH.mkdir(parents=True, exist_ok=True)
    im.save(HD / f"{key}.jpg", quality=90)
    t = im.copy()
    t.thumbnail((360, 360))
    t.save(TH / f"{key}.jpg", quality=82)
    Image.open(comic).convert("RGB").save(HD / f"{key}-comic.jpg", quality=90)
    manifest[key] = {
        "file": f"{key}.jpg",
        "comic": f"{key}-comic.jpg",
        "source_line": source_line,
        "shortcode": code,
        "kind": "crop",
        "ig": code,
        "disabled": False,
    }
    print(f"  SAVED {key} {code} {source_line[:60]}", flush=True)
    return True


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MAN.read_text()) if MAN.exists() else {}
    max_id = None
    pages = 0
    saved = 0
    while pages < 80:
        url = f"https://i.instagram.com/api/v1/feed/user/{UID}/?count=12"
        if max_id:
            url += f"&max_id={urllib.parse.quote(str(max_id))}"
        print(f"page {pages}…", flush=True)
        body = get(url)
        (RAW / f"mobile_feed_{pages}.json").write_bytes(body)
        feed = json.loads(body)
        for it in feed.get("items") or []:
            if save_item(it, manifest):
                saved += 1
        MAN.write_text(json.dumps(manifest, indent=2, sort_keys=True))
        pages += 1
        if not feed.get("more_available") or not feed.get("next_max_id"):
            break
        max_id = feed["next_max_id"]
        time.sleep(8 + random.random() * 6)
    ig = sum(1 for v in manifest.values() if v.get("kind") == "crop")
    print(f"DONE saved={saved} ig={ig}")


if __name__ == "__main__":
    main()
