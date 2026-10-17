#!/usr/bin/env python3
"""Re-fetch Marvel Database candidates for remaining (unshipped) #001–099 cards.

Broader than the first pass: character-name searches, alternate volumes
(e.g. Ghost Rider 1990 = Vol 3), textless covers, and more "from Issue" panels.
"""
from __future__ import annotations

import json
import re
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
AUDIT = ROOT / "verify-1-99-audit.json"
MAN = ROOT / "images" / "sources-fx" / "manifest.json"
OUT = ROOT / "images" / "sources-fx" / "candidates"
API = "https://marvel.fandom.com/api.php"
UA = {"User-Agent": "Mozilla/5.0 (compatible; FlairSourceBot/1.0)"}

SKIP_RE = re.compile(
    r"Ultimate |Adventures |Facsimile |Masterworks |Epic Collection|Omnibus|"
    r"True Believers|Wizard Ace|All-New |Age of Apocalypse|Earth X|"
    r"Marvel Unlimited|logo|\.svg|Website|Wiki|Halloween|Exclusive Variant|"
    r"Studio Exclusive|Marvelous Merchandise|\(MX\)|\(UK\)",
    re.I,
)

# Volume overrides when CREDITS year implies a specific series
VOLUME_HINTS = {
    ("Ghost Rider", 1990): ["Ghost Rider Vol 3", "Ghost Rider Vol 2"],
    ("X-Men", 1991): ["X-Men Vol 2"],
    ("X-Factor", 1986): ["X-Factor Vol 1"],
    ("X-Factor", 1988): ["X-Factor Vol 1"],
    ("Deadpool: The Circle Chase", None): ["Deadpool The Circle Chase Vol 1", "Deadpool Vol 1"],
    ("Spider-Man 2099", 1993): ["Spider-Man 2099 Vol 1"],
    ("Nightstalkers", 1992): ["Nightstalkers Vol 1"],
    ("Deathlok", 1990): ["Deathlok Vol 1", "Deathlok Vol 2"],
    ("Nova", 1993): ["Nova Vol 2", "Nova Vol 1"],
    ("Alpha Flight", 1983): ["Alpha Flight Vol 1"],
    ("Wolverine", 1988): ["Wolverine Vol 2"],
    ("Iron Man", 1968): ["Iron Man Vol 1"],
    ("Captain America", 1968): ["Captain America Vol 1"],
    ("Spectacular Spider-Man", 1976): ["Spectacular Spider-Man Vol 1"],
    ("Web of Spider-Man", 1985): ["Web of Spider-Man Vol 1"],
    ("Punisher", 1987): ["Punisher Vol 2", "Punisher Vol 1"],
}


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


def shipped_ids() -> set[int]:
    out = set()
    if AUDIT.exists():
        for c in json.loads(AUDIT.read_text()).get("cards", []):
            if c.get("verdict") == "shipped":
                out.add(c["n"])
    if MAN.exists():
        for k, v in json.loads(MAN.read_text()).items():
            if k.isdigit() and int(k) < 100 and v.get("approved") and not v.get("disabled"):
                out.add(int(k))
    return out


def parse_issue(src: str) -> dict | None:
    if not src or not src.strip():
        return None
    s = src.strip()
    if re.search(
        r"in-house|sketch|suspected unused|playing cards|t-shirt|stand-up|standee|"
        r"magnets|impel|comic images card|house ad|promotional|unused corner|"
        r"card set #",
        s,
        re.I,
    ):
        return {"raw": s, "promo": True, "title": None, "num": None}
    first = s.split(";")[0].split(". ")[0].strip()
    page = None
    pm = re.search(r"Page\s*(\d+)", first, re.I)
    if pm:
        page = int(pm.group(1))
    m = re.match(
        r"^(.+?)\s*(?:\((\d{4})(?:\s*[-–]\s*\d{4})?\))?\s+Annual\s*#(\d+)\b",
        first,
        re.I,
    )
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": int(m.group(2)) if m.group(2) else None,
            "num": int(m.group(3)),
            "annual": True,
            "page": page,
            "raw": s,
            "promo": False,
        }
    m = re.match(
        r"^(.+?)\s*(?:\((\d{4})(?:\s*[-–]\s*\d{4})?\))?\s*#(\d+)\b",
        first,
        re.I,
    )
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": int(m.group(2)) if m.group(2) else None,
            "num": int(m.group(3)),
            "annual": False,
            "page": page,
            "raw": s,
            "promo": False,
        }
    # Back cover / hologram without clean number already handled; try softer
    m = re.match(r"^(.+?)\s*\((\d{4})\).*?#(\d+)", s)
    if m:
        return {
            "title": m.group(1).strip(" ,"),
            "year": int(m.group(2)),
            "num": int(m.group(3)),
            "annual": False,
            "page": page,
            "raw": s,
            "promo": False,
        }
    return {"raw": s, "promo": True, "title": None, "num": None}


def character_tokens(card_title: str) -> list[str]:
    t = re.sub(
        r"^(Origin of (the )?|The Creation of |The Return of |The Wedding of |"
        r"The Origin of |Formation of |Ballad of )",
        "",
        card_title,
        flags=re.I,
    )
    t = re.sub(r"\s+(vs\.?|meets|Appears|Attacks|Returns|Reborn|Strikes).*$", "", t, flags=re.I)
    # Keep multiword heroes
    specials = [
        "Silver Surfer", "Doctor Strange", "Dr. Strange", "Doc Ock", "Ghost Rider",
        "Beta Ray Bill", "Spider-Man", "Mary Jane", "Black Cat", "Mr. Sinister",
        "Typhoid Mary", "War Machine", "Nightstalkers", "Omega Red", "Archangel",
        "Hellfire Club", "New Warriors", "Alpha Flight", "Deadpool", "Deathlok",
        "Carnage", "Venom", "Thanos", "Galactus", "Sentinels", "Jubilee", "Gambit",
        "Bishop", "Cable", "Stryfe", "Mephisto", "Morbius", "Hobgoblin", "Elektra",
        "Punisher", "Iron Man", "Captain America", "Daredevil", "Hulk", "Apocalypse",
        "Excalibur", "X-Factor", "Blaze", "Speedball", "Mariko",
    ]
    found = []
    low = card_title.lower()
    for s in specials:
        if s.lower() in low:
            found.append(s)
    parts = re.findall(r"[A-Za-z][A-Za-z\-']{2,}", t)
    for p in parts:
        if p.lower() not in {"the", "and", "for", "from", "with", "song"} and p not in found:
            found.append(p)
    return found[:5]


def issue_queries(meta: dict) -> list[str]:
    if meta.get("promo") or not meta.get("title"):
        return []
    title = meta["title"]
    num = meta["num"]
    year = meta.get("year")
    qs = []
    bases = [title]
    if title.startswith("The "):
        bases.append(title[4:])
    rep = {
        "Daredevil: The Man Without Fear": "Daredevil",
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
        "The Punisher": "Punisher",
        "Marc Spector: Moon Knight": "Marc Spector Moon Knight",
    }
    for k, v in rep.items():
        if title == k:
            bases.append(v)

    vol_hints = []
    for (tn, yr), vols in VOLUME_HINTS.items():
        if tn.lower() in title.lower() and (yr is None or yr == year):
            vol_hints.extend(vols)

    for b in bases:
        b = re.sub(r"\s*\(\d{4}.*?\)\s*", " ", b)
        b = re.sub(r"\s+", " ", b).strip()
        if meta.get("annual"):
            qs += [f'"{b} Annual Vol 1 {num}"', f"{b} Annual Vol 1 {num}", f"from {b} Annual Vol 1 {num}"]
        else:
            qs += [
                f'"{b} Vol 1 {num}"',
                f"{b} Vol 1 {num}",
                f"from {b} Vol 1 {num}",
                f'"{b} Vol 2 {num}"',
                f"from {b} Vol 2 {num}",
            ]
        for vh in vol_hints:
            qs += [f'"{vh} {num}"', f"from {vh} {num}", f"{vh} {num}"]
        if meta.get("page"):
            qs.append(f'"{b}" {num} page {meta["page"]}')
    # unique
    out, seen = [], set()
    for q in qs:
        if q not in seen:
            seen.add(q)
            out.append(q)
    return out[:14]


def search_files(query: str, limit: int = 40) -> list[str]:
    try:
        d = api(action="query", list="search", srsearch=query, srnamespace=6, srlimit=limit)
        return [h["title"] for h in d.get("query", {}).get("search", [])]
    except Exception as e:
        print("  search err", e)
        return []


def score_file(title: str, issue_bits: list[str], tokens: list[str], page: int | None) -> int:
    if SKIP_RE.search(title):
        return -100
    bare = title.replace("File:", "")
    bl = bare.lower()
    score = 0
    for bit in issue_bits:
        if bit.lower() in bl:
            score += 40
            if f"from {bit.lower()}" in bl:
                score += 35
    for tok in tokens:
        if tok.lower() in bl:
            score += 18
    if page is not None and re.search(rf"(page|pg)[_\s-]*0*{page}\b", bl):
        score += 30
    if "textless" in bl:
        score += 10
    if re.search(r" 0*\d{3,4}\.(jpg|png|jpeg|webp)", bl) or re.search(r"_\d{3,4}\.", bl):
        score += 6
    # Prefer Earth-616 panels
    if "earth-616" in bl:
        score += 8
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
        if infos:
            return infos[0].get("thumburl") or infos[0].get("url")
    return None


def download(url: str, dest: Path) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=50) as r:
            data = r.read()
            if "html" in r.headers.get("Content-Type", "").lower() or len(data) < 4000:
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


def collect(n: int, title: str, source: str, max_keep: int = 10) -> dict:
    meta = parse_issue(source) or {"promo": True, "raw": source}
    key = f"{n:03d}"
    out_dir = OUT / key
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tokens = character_tokens(title)
    scored: dict[str, int] = {}
    issue_bits = []

    queries = issue_queries(meta) if not meta.get("promo") else []
    # Always also search by character + comic keywords
    for tok in tokens[:3]:
        queries.append(f"{tok} cover")
        if meta.get("title") and meta.get("num"):
            queries.append(f'{tok} "{meta["title"]}" {meta["num"]}')
            queries.append(f"{tok} from {meta['title']}")
    # Promo / in-house: character-only search
    if meta.get("promo"):
        for tok in tokens[:3]:
            queries += [f'"{tok}" pin-up', f'"{tok}" poster', f"{tok} textless", f"{tok} trading card"]

    for q in queries[:18]:
        for ft in search_files(q, limit=35):
            # extract issue bit guesses for scoring
            bits = []
            if meta.get("title") and meta.get("num"):
                t0 = meta["title"].replace(":", "")
                bits.append(f"{t0} Vol 1 {meta['num']}")
                bits.append(f"{t0} Vol 2 {meta['num']}")
                bits.append(f"{t0} Vol 3 {meta['num']}")
                if meta.get("annual"):
                    bits.append(f"{t0} Annual Vol 1 {meta['num']}")
            for vh_key, vols in VOLUME_HINTS.items():
                if meta.get("title") and vh_key[0].lower() in meta["title"].lower():
                    for v in vols:
                        bits.append(f"{v} {meta['num']}")
            issue_bits = bits
            sc = score_file(ft, bits, tokens, meta.get("page"))
            if sc < 12:
                continue
            scored[ft] = max(scored.get(ft, 0), sc)
        time.sleep(0.07)

    ranked = sorted(scored.items(), key=lambda kv: (-kv[1], kv[0]))
    candidates = []
    for ft, sc in ranked:
        if len(candidates) >= max_keep:
            break
        url = image_url(ft)
        if not url:
            continue
        dest = out_dir / f"{len(candidates)+1:02d}.jpg"
        ok = download(url, dest)
        time.sleep(0.1)
        if not ok:
            continue
        candidates.append({"idx": len(candidates) + 1, "file": dest.name, "wiki": ft, "score": sc, "url": url})

    man = {
        "n": n,
        "key": key,
        "title": title,
        "source": source,
        "tokens": tokens,
        "page": meta.get("page"),
        "promo": bool(meta.get("promo")),
        "status": "ok" if candidates else "none",
        "candidates": candidates,
    }
    (out_dir / "manifest.json").write_text(json.dumps(man, indent=2))
    return man


def main():
    credits = load_credits()
    shipped = shipped_ids()
    print("shipped", sorted(shipped), "count", len(shipped))
    results = []
    for i, (title, source, _) in enumerate(credits[:99], 1):
        if i in shipped:
            continue
        print(f"\n## {i:03d} {title}")
        print(f"   {source[:90]}")
        man = collect(i, title, source)
        print(f"   -> {man['status']} {len(man['candidates'])}")
        for c in man["candidates"][:4]:
            print(f"      [{c['score']:3d}] {c['wiki'][:88]}")
        results.append(man)

    summary = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "shipped": sorted(shipped),
        "cards": len(results),
        "with_candidates": sum(1 for r in results if r["candidates"]),
        "results": [
            {"n": r["n"], "status": r["status"], "count": len(r["candidates"]), "title": r["title"], "source": r["source"]}
            for r in results
        ],
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2))
    print("\nDONE", summary["with_candidates"], "/", summary["cards"])


if __name__ == "__main__":
    main()
