# flair-guard (`d3n4c3-flair-guard`)

Keeps `https://d3n4c3.com/94flair/` on the **Masterset Checklist** after the daily stock OpenNext/`wrangler` redeploy of worker `d3n4c3`.

## Root cause

Around **14:06 UTC** (~7:06 AM PDT), `wrangler` runs as `dennis.mayer03@gmail.com` and redeploys `d3n4c3` without the `/94flair` patch. That wipe:

1. Removes the script wrapper that proxies `/94flair*` → `d3n4c3-94flair`
2. Clears `run_worker_first` for `/94flair*`
3. Drops the `FLAIR` service binding
4. Ships stale ASSETS that look like the old “Collector Checklist”

Zone Workers Routes / page-rule writes are blocked for the current API token (`No access` / `Unauthorized`), so a path route to `d3n4c3-94flair` cannot be installed from here.

## Durable auto-heal (live now)

Cron: **`*/10 * * * *`** (every 10 minutes — one free-plan trigger).

Each repair:

1. Re-injects the `/94flair` proxy export wrapper
2. Opens an `assets-upload-session` JWT and sets `run_worker_first: ["/94flair","/94flair/*"]`
3. Re-binds **Masterset** `index.html` into main ASSETS (`masterset-asset.js`) so even a failed RWF still serves Masterset from ASSETS
4. Restores the `FLAIR` service binding
5. Verifies live HTML contains `Masterset Checklist` and force-retries once if needed

Endpoints: `/health`, `/status`, `/repair`, `/repair?force=1`

## Permanent stop (needs account owner)

Do **one** of:

1. **Disable** the daily ~14:06 UTC `wrangler` / OpenNext / Workers Builds deploy of `d3n4c3` (check Cloudflare Workers Builds, a laptop cron, or whatever pushes as `dennis.mayer03@gmail.com`), **or** bake this proxy + `run_worker_first` + Masterset `public/94flair` into that pipeline; **or**
2. Grant the API token **Zone → Workers Routes → Edit** and attach `d3n4c3.com/94flair*` → `d3n4c3-94flair` so main-worker redeploys cannot unseat `/94flair`.

Until then, flair-guard heals within ~10 minutes of any wipe.

## Deploy

```bash
cd ops/flair-guard
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler deploy
```

Regenerate `masterset-asset.js` after Masterset HTML changes:

```bash
python3 - <<'PY'
import base64
from pathlib import Path
from blake3 import blake3
raw = Path("../../94flair/index.html").read_bytes()  # or flair-deploy public copy
h = blake3(base64.b64encode(raw) + b"html").hexdigest()[:32]
b64 = base64.b64encode(raw).decode("ascii")
Path("masterset-asset.js").write_text(
    f'export const MASTERSET_PATH = "/94flair/index.html";\n'
    f'export const MASTERSET_HASH = "{h}";\n'
    f'export const MASTERSET_SIZE = {len(raw)};\n'
    f'export const MASTERSET_BASE64 = "{b64}";\n'
    'export function mastersetBytes(){const bin=atob(MASTERSET_BASE64);'
    'const out=new Uint8Array(bin.length);'
    'for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}\n'
)
print(h, len(raw))
PY
```
