#!/usr/bin/env python3
"""Patch a d3n4c3 OpenNext worker.js + wrangler.toml to proxy /94flair to d3n4c3-94flair.

Usage:
  python3 94flair/scripts/patch_d3n4c3_flair_proxy.py /path/to/deploy-main
"""
from __future__ import annotations

import sys
from pathlib import Path

EXPORT = """export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
  worker_default2 as default
};"""

PATCHED = """const __flair_origin = "https://d3n4c3-94flair.dennis-mayer03.workers.dev";
const __orig_default = worker_default2;
const worker_default2_flair = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/94flair" || url.pathname.startsWith("/94flair/")) {
        if (env.FLAIR) {
          return env.FLAIR.fetch(request);
        }
        const target = __flair_origin + url.pathname + url.search;
        const headers = new Headers(request.headers);
        headers.delete("host");
        return fetch(target, {
          method: request.method,
          headers,
          body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
          redirect: "manual"
        });
      }
    } catch (e) {
      console.error("[94flair-proxy]", e);
    }
    return __orig_default.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof __orig_default.scheduled === "function") {
      return __orig_default.scheduled(controller, env, ctx);
    }
  }
};
export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
  worker_default2_flair as default
};"""

WRANGLER = """name = "d3n4c3"
main = "worker.js"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]
account_id = "c23dc2d5c3471b5eb145460c1d662228"
workers_dev = true

[[routes]]
pattern = "d3n4c3.com/*"
zone_name = "d3n4c3.com"

[assets]
directory = "./public"
binding = "ASSETS"
html_handling = "auto-trailing-slash"
not_found_handling = "none"
run_worker_first = ["/94flair", "/94flair/*"]

[vars]
NEXT_PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAADQqBnYsRF2p4PU3"

[[r2_buckets]]
binding = "POSTS_BUCKET"
bucket_name = "d3n4c3-posts"

[[r2_buckets]]
binding = "TRAINER_BUCKET"
bucket_name = "trainer"

[[services]]
binding = "WORKER_SELF_REFERENCE"
service = "d3n4c3"

[[services]]
binding = "FLAIR"
service = "d3n4c3-94flair"
"""


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/deploy-main")
    worker = root / "worker.js"
    text = worker.read_text()
    if "worker_default2_flair" in text:
        print("worker already patched")
    else:
        if EXPORT not in text:
            raise SystemExit("unpatched export block not found in worker.js")
        worker.write_text(text.replace(EXPORT, PATCHED, 1))
        print("patched", worker)
    (root / "wrangler.toml").write_text(WRANGLER)
    print("wrote", root / "wrangler.toml")


if __name__ == "__main__":
    main()
