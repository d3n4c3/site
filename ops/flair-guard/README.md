# flair-guard (`d3n4c3-flair-guard`)

Keeps `https://d3n4c3.com/94flair/` on the Masterset checklist after the daily stock OpenNext/wrangler redeploy of worker `d3n4c3`.

## Why this exists

Around **14:06 UTC** (~7:06 AM PDT), something runs `wrangler` as `dennis.mayer03@gmail.com` and redeploys `d3n4c3` without the `/94flair` proxy. That wipe:

1. Removes the script wrapper that proxies `/94flair*` to `d3n4c3-94flair`
2. Clears `run_worker_first` for `/94flair*`
3. Drops the `FLAIR` service binding
4. Ships stale ASSETS that look like the old “Collector Checklist”

Until those are restored, `d3n4c3.com/94flair/` serves the old page from ASSETS (`serve_directly`).

## What the guard does

Cron at **14:10** and **14:25 UTC**:

1. Download `d3n4c3` worker.js
2. Re-inject the `/94flair` proxy export wrapper
3. Create an `assets-upload-session` JWT (`manifest: {}`, `keep_assets: true`)
4. Upload a new version with `run_worker_first: ["/94flair","/94flair/*"]` + `FLAIR` binding
5. Deploy 100% and verify live HTML contains `Masterset Checklist`

Endpoints (workers.dev): `/health`, `/status`, `/repair`, `/repair?force=1`

## Permanent fix (needs you)

Disable or change the daily **14:06 UTC** wrangler/OpenNext deploy of `d3n4c3`, **or** grant the API token **Zone → Workers Routes → Edit** so `/94flair*` can route straight to `d3n4c3-94flair` and survive main-worker redeploys.

## Deploy

```bash
cd ops/flair-guard
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler deploy
```
