#!/usr/bin/env python3
"""Fetch Marvel Database panels/pages for remaining #001–099 CREDITS cites.

Marvel Database rarely hosts full interior page scans, but it does host
character crops and secondary images tagged "from {Issue}". This script
pulls those (plus textless / numbered variants) into:

  images/sources-fx/candidates/{NNN}/{idx:02d}.jpg
  images/sources-fx/candidates/{NNN}/manifest.json

Skips cards already shipped (kind=crop + approved) and non-comic cites.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
AUDIT = ROOT / "verify-1-99-audit.json"
OUT = ROOT / "images" / "sources-fx" / "candidates"
API = "https://marvel.fandom.com/api.php"
UA = {"User-Agent": "Mozilla/5.0 (compatible; FlairSourceBot/1.0; +https://d3n4c3.com/94flair)"}

SKIP_TITLE_RE = re.compile(
    r"Ultimate |Adventures |Facsimile |Masterworks |Epic Collection|"
    r"Omnibus|True Believers|Wizard Ace|Vol 2 |Vol 3 |"
    r"Marvel Unlimited|logo|Icon\.|Website|Wiki",
    re.I,
)


def api(**params):
    params.setdefault("format", "json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def load_credits():
    t = INDEX.read_text()
    block = re.search(r"const CREDITS = \[(.*?)\n\];", t, re.S).group(1)
    return re.findall(
        r'\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]',
        block,
    )


def parse_issue(src: str) -> dict | None:
    if not src or not src.strip():
        return None
    s = src.strip()
    if re.search(
        r"in-house|sketch|suspected unused|playing cards|t-shirt|stand-up|standee|"
        r"magnets|impel|comic images|card set|house ad|promotional|unused corner",
        s,
        re.I,
    ):
        return None

    first = s.split(";")[0].split(". ")[0].strip()
    page = None
    pm = re.search(r"Page\s*(\d+)", first, re.I)
    if pm:
        page = int(pm.group(1))
    part = "cover"
    if re.search(r"\bPage\b", first, re.I):
        part = "page"
    elif re.search(r"Mini-?Poster|Poster|Hologram|Pin-?up|Ad/", first, re.I):
        part = "poster"
    elif re.search(r"Back Cover", first, re.I):
        part = "back"

    m = re.match(
        r"^(.+?)\s*(?:\((\d{4})(?:\s*[-–]\s*\d{4})?\))?\s+Annual\s*#(\d+)\b",
        first,
        re.I,
    )
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": m.group(2),
            "num": int(m.group(3)),
            "annual": True,
            "page": page,
            "part": part,
            "raw": s,
        }
    m = re.match(
        r"^(.+?)\s*(?:\((\d{4})(?:\s*[-–]\s*\d{4})?\))?\s*#(\d+)\b",
        first,
        re.I,
    )
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": m.group(2),
            "num": int(m.group(3)),
            "annual": False,
            "page": page,
            "part": part,
            "raw": s,
        }
    return None


def issue_keys(meta: dict) -> list[str]:
    title = meta["title"]
    num = meta["num"]
    variants = [title]
    if title.startswith("The "):
        variants.append(title[4:])
    else:
        variants.append("The " + title)
    # Common renames
    rep = {
        "Daredevil: The Man Without Fear": "Daredevil",
        "Marc Spector: Moon Knight": "Marc Spector Moon Knight",
        "Venom: Lethal Protector": "Venom Lethal Protector",
        "Deadpool: The Circle Chase": "Deadpool The Circle Chase",
        "Ghost Rider & Blaze: Spirits of Vengeance": "Ghost Rider Blaze Spirits of Vengeance",
        "The Fantastic Four": "Fantastic Four",
        "The Incredible Hulk": "Incredible Hulk",
        "The Uncanny X-Men": "Uncanny X-Men",
        "Uncanny X-Men": "Uncanny X-Men",
        "The Avengers": "Avengers",
        "The Spectacular Spider-Man": "Spectacular Spider-Man",
        "The Amazing Spider-Man": "Amazing Spider-Man",
        "The New Mutants": "New Mutants",
        "The New Warriors": "New Warriors",
        "The Infinity War": "Infinity War",
        "The Thanos Quest": "Thanos Quest",
        "The Original Ghost Rider": "Original Ghost Rider",
        "The Warlock Chronicles": "Warlock Chronicles",
        "The Punisher": "Punisher",
    }
    for k, v in list(rep.items()):
        if title == k or title.replace(":", "") == k.replace(":", ""):
            variants.append(v)

    keys = []
    for t in variants:
        t = re.sub(r"\s*\(\d{4}(?:\s*[-–]\s*\d{4})?\)\s*", " ", t)
        t = re.sub(r"\s+", " ", t).strip(" ,")
        if meta.get("annual"):
            keys += [
                f"{t} Annual Vol 1 {num}",
                f"{t} Vol 1 Annual {num}",
                f"{t} Annual {num}",
            ]
        else:
            keys += [
                f"{t} Vol 1 {num}",
                f"{t} Vol 2 {num}",
                f"{t} {num}",
            ]
    out, seen = [], set()
    for k in keys:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


def character_tokens(card_title: str) -> list[str]:
    t = re.sub(r"^(Origin of (the )?|The Creation of |The Return of |The Wedding of )", "", card_title, flags=re.I)
    t = re.sub(r"\s+vs\.?\s+.*$", "", t, flags=re.I)
    t = re.sub(r"[^A-Za-z0-9 \-]", " ", t)
    parts = [p for p in t.split() if len(p) > 2 and p.lower() not in {"the", "and", "for", "from", "with"}]
    return parts[:4]


def search_files(query: str, limit: int = 40) -> list[str]:
    try:
        d = api(action="query", list="search", srsearch=query, srnamespace=6, srlimit=limit)
    except Exception as e:
        print("  search err", query, e)
        return []
    return [h["title"] for h in d.get("query", {}).get("search", [])]


def score_file(title: str, issue_key: str, tokens: list[str], page: int | None) -> int:
    if SKIP_TITLE_RE.search(title):
        return -100
    # Drop other Earth/series noise lightly
    score = 0
    bare = title.replace("File:", "")
    ik = issue_key.lower()
    bl = bare.lower()
    if ik in bl:
        score += 50
    # prefer "from {issue}"
    if f"from {ik}" in bl:
        score += 40
    for tok in tokens:
        if tok.lower() in bl:
            score += 15
    if page is not None:
        if re.search(rf"(page|pg)[_\s-]*0*{page}\b", bl):
            score += 35
        if re.search(rf"\b0*{page}\.(jpg|png|jpeg|webp)\b", bl):
            score += 10
        # numbered panel suffixes near page number
        if re.search(rf"_{page:03d}\.|_{page:04d}\.| {page:03d}\.| {page:04d}\.", bare):
            score += 20
    if "textless" in bl:
        score += 8
    if re.search(r"_\d{3}\.(jpg|png)", bl) or re.search(r" \d{3}\.(jpg|png)", bl):
        score += 5
    # plain cover
    if bare.lower() == f"{issue_key.lower()}.jpg":
        score += 12
    return score


def image_url(file_title: str, width: int = 1400) -> str | None:
    try:
        d = api(
            action="query",
            titles=file_title,
            prop="imageinfo",
            iiprop="url|size|mime",
            iiurlwidth=width,
        )
    except Exception:
        return None
    for p in d.get("query", {}).get("pages", {}).values():
        infos = p.get("imageinfo") or []
        if not infos:
            return None
        info = infos[0]
        return info.get("thumburl") or info.get("url")
    return None


def download(url: str, dest: Path) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=50) as r:
            data = r.read()
            ctype = r.headers.get("Content-Type", "")
            if "html" in ctype.lower() or len(data) < 4000:
                return False
    except Exception:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    tmp.write_bytes(data)
    try:
        im = Image.open(tmp).convert("RGB")
        if min(im.size) < 160:
            tmp.unlink(missing_ok=True)
            return False
        # Cap very large
        w, h = im.size
        scale = 1400 / max(w, h)
        if scale < 1:
            im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
        im.save(dest, quality=88, optimize=True)
    except Exception:
        tmp.unlink(missing_ok=True)
        return False
    tmp.unlink(missing_ok=True)
    return True


def collect_for_card(n: int, title: str, source: str, max_keep: int = 8) -> dict:
    meta = parse_issue(source)
    key = f"{n:03d}"
    out_dir = OUT / key
    if not meta:
        return {"n": n, "key": key, "status": "unparseable", "candidates": [], "source": source, "title": title}

    keys = issue_keys(meta)
    tokens = character_tokens(title)
    scored: dict[str, int] = {}
    for ik in keys[:4]:
        # Quoted issue search + from-issue search
        for q in [f'"{ik}"', f"from {ik}", ik]:
            for ft in search_files(q, limit=50):
                sc = score_file(ft, ik, tokens, meta.get("page"))
                if sc < 10:
                    continue
                scored[ft] = max(scored.get(ft, 0), sc)
            time.sleep(0.08)
        # Also try page-specific search
        if meta.get("page"):
            for ft in search_files(f'"{ik}" page {meta["page"]}', limit=20):
                scored[ft] = max(scored.get(ft, 0), score_file(ft, ik, tokens, meta["page"]))
            time.sleep(0.05)

    ranked = sorted(scored.items(), key=lambda kv: (-kv[1], kv[0]))[: max_keep + 4]
    candidates = []
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, (ft, sc) in enumerate(ranked, 1):
        if len(candidates) >= max_keep:
            break
        url = image_url(ft)
        if not url:
            continue
        dest = out_dir / f"{len(candidates)+1:02d}.jpg"
        if dest.exists() and dest.stat().st_size > 4000:
            ok = True
        else:
            ok = download(url, dest)
            time.sleep(0.12)
        if not ok:
            continue
        candidates.append(
            {
                "idx": len(candidates) + 1,
                "file": dest.name,
                "wiki": ft,
                "score": sc,
                "url": url,
            }
        )

    man = {
        "n": n,
        "key": key,
        "title": title,
        "source": source,
        "issue_keys": keys[:4],
        "page": meta.get("page"),
        "part": meta.get("part"),
        "status": "ok" if candidates else "none",
        "candidates": candidates,
    }
    (out_dir / "manifest.json").write_text(json.dumps(man, indent=2))
    return man


def main():
    credits = load_credits()
    shipped = set()
    if AUDIT.exists():
        for c in json.loads(AUDIT.read_text()).get("cards", []):
            if c.get("verdict") == "shipped":
                shipped.add(c["n"])
    # Also treat enabled crop/approved in sources manifest as shipped
    sm = json.loads((ROOT / "images/sources-fx/manifest.json").read_text())
    for k, v in sm.items():
        if k.isdigit() and int(k) < 100 and not v.get("disabled") and v.get("kind") == "crop" and v.get("approved"):
            shipped.add(int(k))

    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for i, (title, source, _artist) in enumerate(credits[:99], 1):
        if i in shipped:
            continue
        print(f"\n## {i:03d} {title}")
        print(f"   cite: {source[:90]}")
        man = collect_for_card(i, title, source)
        print(f"   -> {man['status']} {len(man['candidates'])} candidates")
        for c in man["candidates"][:5]:
            print(f"      [{c['score']:3d}] {c['wiki'][:90]}")
        results.append(man)

    summary = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cards": len(results),
        "with_candidates": sum(1 for r in results if r["candidates"]),
        "results": [
            {
                "n": r["n"],
                "status": r["status"],
                "count": len(r["candidates"]),
                "source": r["source"],
                "title": r["title"],
            }
            for r in results
        ],
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2))
    print("\nDONE", summary["with_candidates"], "/", summary["cards"], "have candidates")


if __name__ == "__main__":
    main()
