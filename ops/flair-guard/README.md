# d3n4c3-flair-guard

Cron `*/10 * * * *` Worker that keeps `d3n4c3.com/94flair` proxied to `d3n4c3-94flair`. If its checks fail
(proxy wrapper missing, FLAIR binding missing, run_worker_first lacks /94flair, or /94flair HTML wrong), it
re-uploads the `d3n4c3` Worker with its baked asset set: `masterset-asset.js` + `blog-shell.js` + `card-manifest.js`.
That upload REPLACES the whole `d3n4c3` asset set, so the baked copy must always equal the live blog.

These four modules are the exact deployed sources (from the deployed source map).

Nov 9, 2026: `blog-shell.js` re-baked with the PR42 blog redesign (15 files replaced, `/_next/static/css/0598427d81c5a7ef.css`
added). The guard's full set (372 paths) now equals live `d3n4c3` version 07f369ec-8b57-465a-b4d1-4f46417912e9 exactly.
Nothing else changed (bundle bytes outside BLOG_ASSETS identical; schedule, secret, workers.dev unchanged).

- Previous guard version: 3f69d497-9b0e-4229-b97f-b3d76864d199 (bundle sha256 6868e7dbee6f6134e41dddb7b26bf554cbcee839e6a2a3bceaa5f5e25206db4d)
- New guard version: 7fa8f605-9564-4111-837b-53a7c986883b, deployment c5d0c753-dca1-4fe8-b0a6-e4db60e4f246 (bundle sha256 12a4be64248550de10eaca0d5422ed9622072dd54d84e05529380ae094411a48)

Whenever the blog files change, re-bake `blog-shell.js` (path, blake3 hash = blake3(base64(bytes)+ext)[:32], size, base64) and redeploy the guard.
Known limit: if `d3n4c3` is wiped by a stock OpenNext deploy, the guard restores the /94flair proxy and these assets,
but not the Fortnite/Bets route removal or Next nav edits (those live in the d3n4c3 Worker module patch, see ops/blog-direct-publish).
