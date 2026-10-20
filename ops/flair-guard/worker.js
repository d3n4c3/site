/**
 * d3n4c3-flair-guard
 * After the daily ~14:06 UTC stock OpenNext/wrangler redeploy (author
 * dennis.mayer03@gmail.com), restores:
 *  - /94flair → d3n4c3-94flair proxy in the worker script
 *  - run_worker_first for /94flair* (required or stale ASSETS win)
 *  - FLAIR service binding
 *
 * RWF only sticks when assets-upload-session JWT is included AND the
 * worker module is uploaded as filename "worker.js".
 */
const ACCOUNT_ID = "c23dc2d5c3471b5eb145460c1d662228";
const SCRIPT = "d3n4c3";
const FLAIR_ORIGIN = "https://d3n4c3-94flair.dennis-mayer03.workers.dev";
const FLAIR_SERVICE = "d3n4c3-94flair";
const LIVE_URL = "https://d3n4c3.com/94flair/";
const GOOD_MARKER = "Masterset Checklist";
const BAD_MARKER = "Collector Checklist";

const EXPORT_OLD = `export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
  worker_default2 as default
};`;

const EXPORT_NEW = `const __flair_origin = "${FLAIR_ORIGIN}";
const __orig_default = worker_default2;
const worker_default2_flair = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/94flair" || url.pathname.startsWith("/94flair/")) {
        if (env.FLAIR) {
          const proxied = new Request(__flair_origin + url.pathname + url.search, request);
          return env.FLAIR.fetch(proxied);
        }
        const headers = new Headers(request.headers);
        headers.delete("host");
        return fetch(__flair_origin + url.pathname + url.search, {
          method: request.method,
          headers,
          body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
          redirect: "manual",
        });
      }
    } catch (e) {
      console.error("[flair-guard] proxy failed", e);
    }
    return __orig_default.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof __orig_default.scheduled === "function") {
      return __orig_default.scheduled(controller, env, ctx);
    }
  },
};
export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
  worker_default2_flair as default
};`;

async function cfJson(path, token, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

function extractWorkerJs(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 0x2d && bytes[1] === 0x2d) {
    const text = new TextDecoder().decode(bytes);
    const idx = text.indexOf("\r\n\r\n");
    let body = text.slice(idx + 4);
    const end = body.lastIndexOf("\r\n--");
    if (end !== -1) body = body.slice(0, end);
    return body;
  }
  return new TextDecoder().decode(bytes);
}

async function liveLooksGood() {
  try {
    const res = await fetch(LIVE_URL, {
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const html = await res.text();
    const good = html.includes(GOOD_MARKER);
    const bad = html.includes(BAD_MARKER) && !good;
    return { ok: good && !bad, status: res.status, good, bad, sample: html.slice(0, 120) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function ensureProxy(env, { force = false } = {}) {
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!token) return { ok: false, error: "CLOUDFLARE_API_TOKEN missing" };

  const settings = await cfJson(`workers/scripts/${SCRIPT}/settings`, token);
  if (!settings.ok) return { ok: false, error: "settings fetch failed", details: settings.json };
  const bindingsIn = (settings.json.result || {}).bindings || [];
  const hasFlairBind = bindingsIn.some((b) => b.name === "FLAIR" && b.type === "service");

  const contentRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!contentRes.ok) return { ok: false, error: "script download failed", status: contentRes.status };
  let js = extractWorkerJs(await contentRes.arrayBuffer());
  const alreadyPatched = js.includes("__flair_origin") && js.includes("worker_default2_flair");

  const deps = await cfJson(`workers/scripts/${SCRIPT}/deployments`, token);
  const latest = (((deps.json.result || {}).deployments) || [])[0];
  const vid = latest?.versions?.[0]?.version_id;
  let hasRwf = false;
  if (vid) {
    const ver = await cfJson(`workers/scripts/${SCRIPT}/versions/${vid}`, token);
    const assets = ver.json.result?.resources?.script_runtime?.assets || {};
    hasRwf = Array.isArray(assets.raw_run_worker_first) && assets.raw_run_worker_first.includes("/94flair");
  }

  const live = await liveLooksGood();

  if (!force && alreadyPatched && hasFlairBind && hasRwf && live.ok) {
    return { ok: true, action: "noop", alreadyPatched, hasFlairBind, hasRwf, version: vid, live };
  }

  if (!alreadyPatched) {
    if (!js.includes(EXPORT_OLD)) {
      return {
        ok: false,
        error: "export block not found; refuse to patch unknown bundle",
        alreadyPatched,
        hasFlairBind,
        hasRwf,
        live,
        tail: js.slice(-240),
      };
    }
    js = js.replace(EXPORT_OLD, EXPORT_NEW);
  }

  // Assets upload session so run_worker_first actually sticks
  const session = await cfJson(`workers/scripts/${SCRIPT}/assets-upload-session`, token, {
    method: "POST",
    body: JSON.stringify({ manifest: {}, keep_assets: true }),
  });
  const jwt = session.json.result?.jwt;
  if (!session.ok || !jwt) {
    return { ok: false, error: "assets-upload-session failed", details: session.json.errors || session.json, live };
  }

  const newBindings = [];
  for (const b of bindingsIn) {
    if (b.type === "secret_text") continue;
    if (b.name === "ASSETS" || b.name === "FLAIR") continue;
    const entry = { name: b.name, type: b.type };
    if (b.type === "plain_text") entry.text = b.text || "";
    if (b.type === "r2_bucket") entry.bucket_name = b.bucket_name;
    if (b.type === "service") {
      entry.service = b.service;
      entry.environment = b.environment || "production";
    }
    newBindings.push(entry);
  }
  newBindings.push({ name: "ASSETS", type: "assets" });
  newBindings.push({ name: "FLAIR", type: "service", service: FLAIR_SERVICE, environment: "production" });

  const compat = settings.json.result?.compatibility_date || "2025-12-01";
  const flags = settings.json.result?.compatibility_flags || ["nodejs_compat", "global_fetch_strictly_public"];

  const metadata = {
    main_module: "worker.js",
    compatibility_date: compat,
    compatibility_flags: flags,
    keep_assets: true,
    bindings: newBindings,
    annotations: { "workers/message": "flair-guard: restore /94flair proxy + run_worker_first" },
    assets: {
      jwt,
      config: {
        html_handling: "auto-trailing-slash",
        not_found_handling: "none",
        run_worker_first: ["/94flair", "/94flair/*"],
      },
    },
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new Blob([js], { type: "application/javascript+module" }), "worker.js");

  const uploadRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/versions`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  const uploadJson = await uploadRes.json();
  if (!uploadJson.success) {
    return {
      ok: false,
      error: "version upload failed",
      details: uploadJson.errors,
      alreadyPatched,
      hasFlairBind,
      hasRwf,
      live,
    };
  }
  const newVid = uploadJson.result.id;
  const rwfAfter = uploadJson.result?.resources?.script_runtime?.assets?.raw_run_worker_first;

  const deploy = await cfJson(`workers/scripts/${SCRIPT}/deployments`, token, {
    method: "POST",
    body: JSON.stringify({
      strategy: "percentage",
      versions: [{ version_id: newVid, percentage: 100 }],
      annotations: { "workers/message": "flair-guard deploy" },
    }),
  });

  // Give edge a moment, then verify live HTML
  await new Promise((r) => setTimeout(r, 1500));
  const liveAfter = await liveLooksGood();
  const rwfOk = Array.isArray(rwfAfter) && rwfAfter.includes("/94flair");

  return {
    ok: !!deploy.json.success && rwfOk && liveAfter.ok,
    action: alreadyPatched ? "redeploy-rwf" : "patched",
    newVersion: newVid,
    run_worker_first: rwfAfter,
    deploySuccess: !!deploy.json.success,
    alreadyPatched,
    hasFlairBind,
    hasRwfBefore: hasRwf,
    liveBefore: live,
    liveAfter,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "d3n4c3-flair-guard" });
    }
    if (url.pathname === "/repair" || url.pathname === "/repair/") {
      const force = url.searchParams.get("force") === "1";
      const result = await ensureProxy(env, { force });
      // If first pass left live bad (race with stock deploy), force once more
      if (result.ok === false || (result.liveAfter && !result.liveAfter.ok) || (result.action === "noop" && result.live && !result.live.ok)) {
        const retry = await ensureProxy(env, { force: true });
        return Response.json({ first: result, retry }, { status: retry.ok ? 200 : 500 });
      }
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }
    if (url.pathname === "/status") {
      const token = env.CLOUDFLARE_API_TOKEN;
      if (!token) return Response.json({ ok: false, error: "no token" }, { status: 500 });
      const deps = await cfJson(`workers/scripts/${SCRIPT}/deployments`, token);
      const latest = (((deps.json.result || {}).deployments) || [])[0];
      const vid = latest?.versions?.[0]?.version_id;
      let rwf = null;
      if (vid) {
        const ver = await cfJson(`workers/scripts/${SCRIPT}/versions/${vid}`, token);
        rwf = ver.json.result?.resources?.script_runtime?.assets?.raw_run_worker_first ?? null;
      }
      const live = await liveLooksGood();
      return Response.json({
        latestDeploy: latest?.created_on,
        version: vid,
        run_worker_first: rwf,
        live,
      });
    }
    return Response.json({
      service: "d3n4c3-flair-guard",
      endpoints: ["/health", "/status", "/repair"],
      crons: ["10 14 * * *", "25 14 * * *"],
      note: "Stock wipe ~14:06 UTC from wrangler as dennis.mayer03@gmail.com; disable that deploy for a permanent fix.",
    });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        let r = await ensureProxy(env);
        if (!r.ok || (r.liveAfter && !r.liveAfter.ok) || (r.action === "noop" && r.live && !r.live.ok)) {
          r = await ensureProxy(env, { force: true });
        }
        console.log("[flair-guard]", JSON.stringify(r));
      })()
    );
  },
};
