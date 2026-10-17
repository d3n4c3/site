#!/usr/bin/env python3
"""Rematch missing #001–099 Flair fronts to candidate sources, then rebuild verify-1-99.html.

Cards are computer-enhanced crops of comic/sketch art, so matching uses:
  - multi-scale edge NCC (sliding window)
  - ORB feature inliers
Sketches are forced for #010 (Xavier) and #042 (Elektra).
"""
from __future__ import annotations

import json
import re
import shutil
from html import escape
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "images" / "cards-fx" / "hd"
CAND = ROOT / "images" / "sources-fx" / "candidates"
SKETCHES = ROOT / "images" / "sources-fx" / "sketches"
MATCHED = ROOT / "images" / "sources-fx" / "matched"
INDEX = ROOT / "index.html"
OUT_HTML = ROOT / "verify-1-99.html"

# Forced in-house sketch primaries (user-provided Reddit sketch sheets).
FORCE_SKETCH = {
    10: [
        ("xavier-pose2.jpg", "Ron Lim Xavier in-house sketch — extended hand (pose 2)"),
        ("xavier-pose3.jpg", "Ron Lim Xavier in-house sketch (pose 3)"),
        ("xavier-pose1.jpg", "Ron Lim Xavier in-house sketch (pose 1)"),
        ("xavier-sheet.jpg", "Ron Lim Xavier in-house sketch sheet"),
    ],
    42: [
        ("elektra-pose4.jpg", "Frank Miller Elektra in-house sketch — overhead katana (pose 4)"),
        ("elektra-pose1.jpg", "Frank Miller Elektra in-house sketch (pose 1)"),
        ("elektra-pose2.jpg", "Frank Miller Elektra in-house sketch (pose 2)"),
        ("elektra-pose3.jpg", "Frank Miller Elektra in-house sketch (pose 3)"),
        ("elektra-sheet.jpg", "Frank Miller Elektra in-house sketch sheet"),
    ],
}


def parse_source_art_keys(html: str) -> set[str]:
    m = re.search(r"const SOURCE_ART\s*=\s*\{([\s\S]*?)\n\s*\};", html)
    if not m:
        return set()
    return set(re.findall(r"['\"](\d{3})['\"]\s*:", m.group(1)))


def parse_credits(html: str) -> list[tuple[str, str, str]]:
    m = re.search(r"const CREDITS = \[([\s\S]*?)\];", html)
    items: list[tuple[str, str, str]] = []
    for line in m.group(1).split("\n"):
        qs = re.findall(r'"((?:\\.|[^"\\])*)"', line.strip().rstrip(","))
        if len(qs) >= 3:
            items.append((qs[0], qs[1], qs[2]))
        elif len(qs) == 2:
            items.append((qs[0], qs[1], ""))
        elif len(qs) == 1:
            items.append((qs[0], "", ""))
    return items


def load_gray(path: Path) -> np.ndarray | None:
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if im is None:
        return None
    return cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)


def card_query(gray: np.ndarray) -> np.ndarray:
    """Crop foil chrome, equalize, edge-map a card front for matching."""
    h, w = gray.shape
    y0, y1 = int(h * 0.08), int(h * 0.92)
    x0, x1 = int(w * 0.06), int(w * 0.94)
    crop = gray[y0:y1, x0:x1]
    crop = cv2.resize(crop, (180, 250), interpolation=cv2.INTER_AREA)
    crop = cv2.equalizeHist(crop)
    blur = cv2.GaussianBlur(crop, (3, 3), 0)
    edges = cv2.Canny(blur, 40, 110)
    return edges


def cand_edges(gray: np.ndarray, size: tuple[int, int] | None = None) -> np.ndarray:
    if size:
        gray = cv2.resize(gray, size, interpolation=cv2.INTER_AREA)
    gray = cv2.equalizeHist(gray)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.Canny(blur, 40, 110)


def ncc(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float32).ravel()
    b = b.astype(np.float32).ravel()
    if a.size != b.size or a.size == 0:
        return -1.0
    a = a - a.mean()
    b = b - b.mean()
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom < 1e-6:
        return -1.0
    return float(np.dot(a, b) / denom)


def multi_scale_edge_score(query_edges: np.ndarray, cand_gray: np.ndarray) -> float:
    """Best edge-NCC of query against resized / sliding windows of candidate."""
    best = -1.0
    qh, qw = query_edges.shape
    ch, cw = cand_gray.shape
    # Full-frame scales
    for scale in (0.55, 0.7, 0.85, 1.0, 1.15, 1.35, 1.6, 1.9):
        tw, th = max(32, int(qw * scale)), max(40, int(qh * scale))
        if tw > cw * 1.05 or th > ch * 1.05:
            continue
        resized = cv2.resize(cand_gray, (tw, th), interpolation=cv2.INTER_AREA)
        edges = cand_edges(resized, None) if False else cv2.Canny(
            cv2.GaussianBlur(cv2.equalizeHist(resized), (3, 3), 0), 40, 110
        )
        q = cv2.resize(query_edges, (tw, th), interpolation=cv2.INTER_AREA)
        best = max(best, ncc(q, edges))
    # Sliding window on larger candidates (panel may contain the crop)
    if ch >= qh and cw >= qw:
        base = cand_edges(cand_gray)
        # Downsample candidate for speed if huge
        max_dim = 900
        scale = min(1.0, max_dim / max(ch, cw))
        if scale < 1.0:
            base = cv2.resize(base, (int(cw * scale), int(ch * scale)), interpolation=cv2.INTER_AREA)
        bh, bw = base.shape
        for win_scale in (0.9, 1.0, 1.15, 1.35):
            wh, ww = int(qh * win_scale), int(qw * win_scale)
            if wh > bh or ww > bw:
                continue
            q = cv2.resize(query_edges, (ww, wh), interpolation=cv2.INTER_AREA)
            # stride ~1/3 window
            ys = range(0, bh - wh + 1, max(1, wh // 3))
            xs = range(0, bw - ww + 1, max(1, ww // 3))
            for y in ys:
                for x in xs:
                    patch = base[y : y + wh, x : x + ww]
                    best = max(best, ncc(q, patch))
    return best


def orb_score(card_gray: np.ndarray, cand_gray: np.ndarray) -> float:
    orb = cv2.ORB_create(nfeatures=800)
    c = card_query_gray(card_gray)
    k1, d1 = orb.detectAndCompute(c, None)
    k2, d2 = orb.detectAndCompute(cv2.equalizeHist(cand_gray), None)
    if d1 is None or d2 is None or len(k1) < 8 or len(k2) < 8:
        return 0.0
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    pairs = bf.knnMatch(d1, d2, k=2)
    good = []
    for m in pairs:
        if len(m) < 2:
            continue
        a, b = m
        if a.distance < 0.75 * b.distance:
            good.append(a)
    if len(good) < 6:
        return len(good) / 40.0
    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    if mask is None:
        return len(good) / 80.0
    inliers = int(mask.sum())
    return min(1.0, inliers / 25.0)


def card_query_gray(gray: np.ndarray) -> np.ndarray:
    h, w = gray.shape
    y0, y1 = int(h * 0.08), int(h * 0.92)
    x0, x1 = int(w * 0.06), int(w * 0.94)
    crop = gray[y0:y1, x0:x1]
    return cv2.equalizeHist(cv2.resize(crop, (220, 300), interpolation=cv2.INTER_AREA))


def score_pair(card_gray: np.ndarray, cand_path: Path) -> float:
    cand = load_gray(cand_path)
    if cand is None:
        return -1.0
    qe = card_query(card_gray)
    edge = multi_scale_edge_score(qe, cand)
    orb = orb_score(card_gray, cand)
    # Weighted blend — edges carry pose silhouette, ORB helps exact panels
    return 0.65 * max(edge, 0.0) + 0.35 * orb


def load_cand_label(n: int, file: str) -> str:
    man = CAND / f"{n:03d}" / "manifest.json"
    if not man.exists():
        return file
    try:
        data = json.loads(man.read_text())
    except Exception:
        return file
    for c in data.get("candidates") or []:
        if c.get("file") == file:
            return c.get("wiki") or c.get("label") or file
    return file


def rematch(missing: list[int], credits: list[tuple[str, str, str]]) -> list[dict]:
    if MATCHED.exists():
        shutil.rmtree(MATCHED)
    MATCHED.mkdir(parents=True)

    results = []
    for n in missing:
        key = f"{n:03d}"
        title, source, artist = credits[n - 1]
        out_dir = MATCHED / key
        out_dir.mkdir(parents=True)
        matches: list[dict] = []

        if n in FORCE_SKETCH:
            for i, (fname, label) in enumerate(FORCE_SKETCH[n], 1):
                src = SKETCHES / fname
                if not src.exists():
                    continue
                dest = out_dir / f"{i:02d}.jpg"
                # normalize to jpg
                im = cv2.imread(str(src), cv2.IMREAD_COLOR)
                if im is None:
                    continue
                cv2.imwrite(str(dest), im, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
                matches.append(
                    {
                        "idx": i,
                        "file": dest.name,
                        "score": 0.99 if i == 1 else 0.5,
                        "kind": "sketch",
                        "label": label,
                    }
                )
        else:
            card_path = CARDS / f"{key}.jpg"
            card = load_gray(card_path)
            if card is None:
                print(f"  skip {key}: missing card front")
                continue
            cand_dir = CAND / key
            scored: list[tuple[float, Path, str]] = []
            if cand_dir.exists():
                for p in sorted(cand_dir.glob("*.jpg")) + sorted(cand_dir.glob("*.png")):
                    s = score_pair(card, p)
                    label = load_cand_label(n, p.name)
                    scored.append((s, p, label))
            scored.sort(key=lambda t: t[0], reverse=True)
            for i, (s, p, label) in enumerate(scored[:6], 1):
                dest = out_dir / f"{i:02d}.jpg"
                im = cv2.imread(str(p), cv2.IMREAD_COLOR)
                if im is None:
                    continue
                cv2.imwrite(str(dest), im, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                matches.append(
                    {
                        "idx": i,
                        "file": dest.name,
                        "score": round(float(s), 4),
                        "kind": "wiki-candidate",
                        "label": label,
                    }
                )

        man = {
            "n": n,
            "key": key,
            "title": title,
            "source": source,
            "artist": artist,
            "matches": matches,
        }
        (out_dir / "manifest.json").write_text(json.dumps(man, indent=2))
        best = matches[0]["score"] if matches else 0.0
        results.append(
            {
                "n": n,
                "best": best,
                "label": matches[0]["label"] if matches else "",
                "title": title,
                "kind": matches[0]["kind"] if matches else "",
            }
        )
        print(f"  {key} best={best:.4f} kind={man['matches'][0]['kind'] if matches else '-'} {title}")

    summary = {"missing": missing, "count": len(missing), "results": results}
    (MATCHED / "summary.json").write_text(json.dumps(summary, indent=2))
    return results


def build_html(missing: list[int], credits: list[tuple[str, str, str]], live_count: int) -> None:
    rows = []
    nav = []
    for n in missing:
        key = f"{n:03d}"
        title, source, artist = credits[n - 1]
        man_path = MATCHED / key / "manifest.json"
        matches = []
        if man_path.exists():
            matches = json.loads(man_path.read_text()).get("matches") or []
        has = bool(matches)
        nav.append(
            f'<a href="#c{n}" class="{"has" if has else "miss"}">{n:03d}</a>'
        )
        cite = " · ".join(x for x in (source, artist) if x)
        best = matches[0] if matches else None
        gallery = []
        for m in matches:
            kind = m.get("kind") or "candidate"
            badge = "sketch" if kind == "sketch" else "match"
            gallery.append(
                f"""
          <label class="cand">
            <input type="radio" name="pick-{n}" value="{m['idx']}">
            <span class="cand-frame"><img src="images/sources-fx/matched/{key}/{m['file']}" alt="Candidate {m['idx']}" loading="lazy"></span>
            <span class="cand-meta"><span class="badge {badge}">{escape(kind)}</span> #{m['idx']} · {m['score']:.3f}<br><small>{escape(str(m.get('label') or '')[:90])}</small></span>
          </label>"""
            )
        best_block = ""
        if best:
            best_block = f"""
      <figure class="best-col">
        <figcaption>Top match <span class="badge {"sketch" if best.get("kind")=="sketch" else "match"}">{escape(best.get("kind") or "")}</span></figcaption>
        <div class="face"><img src="images/sources-fx/matched/{key}/{best['file']}" alt="Best match {key}" loading="lazy"></div>
        <p class="best-label">{escape(str(best.get("label") or "")[:120])}</p>
      </figure>"""
        rows.append(
            f"""
<article class="row" id="c{n}" data-n="{n}">
  <div class="meta">
    <div class="id">#{key} · {escape(title)}</div>
    <span class="pill">{len(matches)} matched</span>
  </div>
  <p class="cite">{escape(cite) if cite else "No spreadsheet citation"}</p>
  <div class="pair">
    <figure class="front-col">
      <figcaption>Card front</figcaption>
      <div class="face"><img src="images/cards-fx/hd/{key}.jpg" alt="Card {key}" loading="lazy"></div>
    </figure>
    {best_block}
  </div>
  <div class="cands-col">
    <figcaption>Pick the matching source (image-matched; CGI cards won’t be perfect)</figcaption>
    <div class="gallery">{"".join(gallery) if gallery else "<p class='empty'>No candidates</p>"}</div>
  </div>
</article>"""
        )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>94 Flair — missing sources (matched redo)</title>
<style>
  :root {{
    --bg:#120f0c; --text:#f3ece3; --muted:#a89988; --gold:#e6b84d;
    --line:rgba(230,184,77,.32); --ok:#6fbf8f; --card-ar:857/1200;
    --ink:#1a1410;
  }}
  * {{ box-sizing:border-box; }}
  body {{
    margin:0; font:15px/1.45 "Source Serif 4",Georgia,"Times New Roman",serif; color:var(--text);
    background:
      radial-gradient(1000px 520px at 12% -8%, rgba(200,40,35,.22), transparent 58%),
      radial-gradient(800px 420px at 92% 4%, rgba(230,184,77,.12), transparent 55%),
      linear-gradient(180deg, #1a1510 0%, var(--bg) 40%, #0c0a08 100%);
    padding-bottom:110px;
  }}
  .top {{ padding:22px 22px 10px; max-width:1180px; margin:0 auto; }}
  .top h1 {{
    margin:0; font-family:"Oswald","Arial Narrow",sans-serif; font-size:24px;
    letter-spacing:.14em; text-transform:uppercase; color:var(--gold);
  }}
  .top p {{ margin:10px 0 0; color:var(--muted); max-width:54rem; }}
  .stats {{ display:flex; flex-wrap:wrap; gap:10px 18px; margin-top:14px; font-size:13px; color:var(--muted); }}
  .stats b {{ color:var(--text); }}
  nav.index {{
    display:flex; flex-wrap:wrap; gap:5px; max-width:1180px; margin:14px auto 0; padding:0 22px 10px;
  }}
  nav.index a {{
    width:36px; height:28px; display:grid; place-items:center; text-decoration:none;
    font:11px/1 "Oswald",sans-serif; border-radius:3px; border:1px solid var(--line);
    color:var(--gold); background:rgba(0,0,0,.28);
  }}
  nav.index a.has {{ border-color:rgba(111,191,143,.5); color:#7dcea0; }}
  nav.index a.miss {{ color:var(--muted); }}
  nav.index a.picked {{ outline:2px solid var(--ok); outline-offset:1px; }}
  main {{ padding:8px 22px 28px; display:grid; gap:36px; max-width:1180px; margin:0 auto; }}
  .meta {{ display:flex; flex-wrap:wrap; gap:10px; align-items:baseline; margin-bottom:4px; }}
  .id {{ font-family:"Oswald","Arial Narrow",sans-serif; font-size:19px; letter-spacing:.06em; color:var(--gold); }}
  .pill {{
    font:11px/1 "Oswald",sans-serif; letter-spacing:.08em; text-transform:uppercase;
    border:1px solid var(--line); padding:5px 8px; border-radius:3px; color:var(--muted);
  }}
  .cite {{ margin:0 0 12px; color:var(--muted); font-size:13px; }}
  .pair {{
    display:grid; grid-template-columns:minmax(140px,220px) minmax(140px,220px); gap:18px; align-items:start;
  }}
  @media (max-width:700px) {{
    .pair {{ grid-template-columns:1fr 1fr; gap:10px; }}
  }}
  figcaption {{
    font:11px/1.2 "Oswald",sans-serif; letter-spacing:.1em; text-transform:uppercase;
    color:var(--muted); margin-bottom:8px;
  }}
  .face {{
    aspect-ratio:var(--card-ar); border:1px solid var(--line); background:#000;
    overflow:hidden; box-shadow:0 10px 28px rgba(0,0,0,.45);
  }}
  .face img {{ width:100%; height:100%; object-fit:cover; display:block; }}
  .best-label {{ margin:8px 0 0; font-size:12px; color:var(--muted); }}
  .cands-col {{ margin-top:16px; }}
  .gallery {{
    display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:12px;
  }}
  .cand {{
    display:flex; flex-direction:column; gap:6px; cursor:pointer; margin:0;
    border:1px solid transparent; border-radius:4px; padding:6px; background:rgba(0,0,0,.2);
  }}
  .cand:has(input:checked) {{ border-color:var(--ok); background:rgba(111,191,143,.1); }}
  .cand input {{ position:absolute; opacity:0; pointer-events:none; }}
  .cand-frame {{
    aspect-ratio:3/4; overflow:hidden; border:1px solid var(--line); background:#000;
  }}
  .cand-frame img {{ width:100%; height:100%; object-fit:cover; display:block; }}
  .cand-meta {{ font-size:11px; color:var(--muted); line-height:1.35; }}
  .cand-meta small {{ color:#8a7b6c; }}
  .badge {{
    display:inline-block; font:10px/1 "Oswald",sans-serif; letter-spacing:.08em;
    text-transform:uppercase; padding:3px 5px; border-radius:2px; margin-right:4px;
    border:1px solid var(--line); color:var(--gold);
  }}
  .badge.sketch {{ border-color:rgba(111,191,143,.55); color:#8fd4a8; }}
  .badge.match {{ border-color:rgba(230,184,77,.45); }}
  .empty {{ color:var(--muted); }}
  .submit-bar {{
    position:fixed; left:0; right:0; bottom:0; z-index:20;
    background:linear-gradient(180deg, transparent, rgba(10,8,6,.92) 28%);
    padding:18px 16px 14px; pointer-events:none;
  }}
  .submit-inner {{
    pointer-events:auto; max-width:1180px; margin:0 auto;
    display:flex; flex-wrap:wrap; gap:12px; align-items:center;
    background:rgba(22,18,14,.92); border:1px solid var(--line); border-radius:6px; padding:12px 14px;
  }}
  .count {{ color:var(--muted); font-size:13px; }}
  .count b {{ color:var(--text); }}
  #submitPicks {{
    font:13px/1 "Oswald",sans-serif; letter-spacing:.1em; text-transform:uppercase;
    background:var(--gold); color:var(--ink); border:0; border-radius:3px; padding:11px 16px; cursor:pointer;
  }}
  #submitPicks:disabled {{ opacity:.5; cursor:wait; }}
  #statusMsg {{ margin:0; font-size:12px; color:var(--muted); flex:1 1 200px; }}
  #statusMsg.err {{ color:#e07a6a; }}
</style>
</head>
<body>
  <header class="top">
    <h1>94 Flair — missing sources</h1>
    <p>Completely redone picker for cards still without live source art. Candidates were ranked by image matching (edge NCC + ORB) against each card front — Flair art is computer-enhanced, so pairs won’t be perfect. <b>#010</b> and <b>#042</b> use the in-house Xavier / Elektra sketch sheets. Select matches and submit; hash backup is saved automatically.</p>
    <div class="stats">
      <span><b>{live_count}</b> sources live on the flipper</span>
      <span><b>{len(missing)}</b> still missing</span>
      <span>Pick → submit → agent wires approved sources</span>
    </div>
  </header>
  <nav class="index" id="indexNav">{"".join(nav)}</nav>
  <main>
{"".join(rows)}
  </main>
  <div class="submit-bar">
    <div class="submit-inner">
      <div class="count"><b id="pickCount">0</b> cards with a pick</div>
      <button type="button" id="submitPicks">Submit picks</button>
      <p id="statusMsg"></p>
    </div>
  </div>
<script>
(function () {{
  const endpoint = (window.location.pathname.replace(/\\/verify-1-99\\/?$/, '') || '/94flair') + '/api/verify-selections';
  const countEl = document.getElementById('pickCount');
  const statusEl = document.getElementById('statusMsg');
  const submitBtn = document.getElementById('submitPicks');
  function selections() {{
    const out = [];
    document.querySelectorAll('article.row').forEach(row => {{
      const n = Number(row.dataset.n);
      const checked = row.querySelector('input[type=radio]:checked');
      if (checked) out.push({{ n, candidate: Number(checked.value) }});
    }});
    return out;
  }}
  function sync() {{
    const sel = selections();
    countEl.textContent = String(sel.length);
    const set = new Set(sel.map(s => s.n));
    document.querySelectorAll('#indexNav a').forEach(a => {{
      a.classList.toggle('picked', set.has(Number(a.textContent)));
    }});
    try {{ localStorage.setItem('flair-verify-1-99-cand-draft', JSON.stringify(sel)); }} catch (_) {{}}
  }}
  document.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', sync));
  try {{
    const draft = JSON.parse(localStorage.getItem('flair-verify-1-99-cand-draft') || '[]');
    if (Array.isArray(draft)) draft.forEach(s => {{
      const el = document.querySelector('article.row[data-n="'+s.n+'"] input[value="'+s.candidate+'"]');
      if (el) el.checked = true;
    }});
  }} catch (_) {{}}
  sync();
  submitBtn.addEventListener('click', async () => {{
    const sel = selections();
    statusEl.classList.remove('err');
    statusEl.textContent = 'Submitting…';
    submitBtn.disabled = true;
    const payload = {{ selected: sel.map(s => s.n), candidates: sel, notes: 'matched-redo-picks', page: location.href }};
    try {{
      const res = await fetch(endpoint, {{ method:'POST', headers:{{'content-type':'application/json'}}, body: JSON.stringify(payload) }});
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
      const detail = sel.map(s => String(s.n).padStart(3,'0') + ':' + s.candidate).join(',');
      location.hash = 'picks=' + detail;
      statusEl.textContent = 'Submitted ' + sel.length + ' picks. Hash saved as backup: ' + detail;
      try {{ localStorage.setItem('flair-verify-1-99-submitted', JSON.stringify({{...data, candidates: sel}})); }} catch (_) {{}}
    }} catch (err) {{
      statusEl.classList.add('err');
      statusEl.textContent = 'Submit failed: ' + (err && err.message ? err.message : err);
    }} finally {{
      submitBtn.disabled = false; sync();
    }}
  }});
}})();
</script>
</body>
</html>
"""
    OUT_HTML.write_text(html)
    print(f"Wrote {OUT_HTML} ({OUT_HTML.stat().st_size} bytes)")


def main() -> None:
    html = INDEX.read_text()
    keys = parse_source_art_keys(html)
    credits = parse_credits(html)
    missing = [n for n in range(1, 100) if f"{n:03d}" not in keys]
    print(f"Live SOURCE_ART <100: {sum(1 for n in range(1,100) if f'{n:03d}' in keys)}")
    print(f"Missing: {len(missing)}")
    rematch(missing, credits)
    live_count = sum(1 for n in range(1, 100) if f"{n:03d}" in keys)
    # also count 100+ for stats? page says flipper total — keep <100 live
    total_live = len(keys)
    build_html(missing, credits, total_live)


if __name__ == "__main__":
    main()
