# Blog direct publish — Nov 9, 2026

Direct Cloudflare publish of the parent Worker `d3n4c3` (no Cursor Cloud agent).

What shipped:
- Blog home (`index.html`) redesign and new home styles in `assets/site.css`.
- Fortnite and Bets removed from every static page's nav/footer, and their dead CSS removed from `assets/next-shell.css`.
- `assets/next-shell.css` also served again at `/_next/static/css/0598427d81c5a7ef.css` (the stylesheet the Next-rendered pages such as /login and the 404 page link to; it was missing).
- Worker module patch (applied by `deploy.cjs` to the live module): Next header nav drops Fortnite/Bets and gains the ’94 Flair Checklist link; Next footer swaps Fortnite for the checklist; the `/94flair` proxy wrapper now sends `/fortnite*`, `/bets*`, `/sprites*`, `/api/fortnite/*`, `/api/bets/*` and `/api/cron/fortnite-sync` to the normal site 404. `run_worker_first` gained `/fortnite`, `/fortnite/*`, `/bets`, `/bets/*`.

Important: a Workers assets upload replaces the whole asset set (keep_assets does not merge with a new manifest). `deploy.cjs` therefore starts from the full current set (`base-asset-manifest.json`, the flair-guard baked manifest verified equal to live) and overrides only changed paths. Upload blobs with their real MIME type; Cloudflare stores the type per content hash.

Live module before: sha256 09b8c2d6f8bd990b4e3447bee5a7bdd8afce78845b997bc3521156d71b329232 (version d44675c5-1d64-444a-9d99-80887ee82b68)
Live module after:  sha256 d5ee1648ff5685b588c1d574dc13458161289a77fec43b6b7461056c4b3e3fc1 (version 07f369ec-8b57-465a-b4d1-4f46417912e9, deployment dd006442-c619-44cb-8f19-87e557e8fdc8)
