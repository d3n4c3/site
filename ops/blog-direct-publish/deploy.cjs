// Direct publish of blog redesign + Fortnite/Bets removal to parent Worker d3n4c3.
// Usage: node deploy.cjs [--dry]   (token from env CLOUDFLARE_API_TOKEN, never printed)
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const blake3 = require("blake3-wasm");
const DRY = process.argv.includes("--dry");
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) { console.log("no token"); process.exit(1); }
const account = "c23dc2d5c3471b5eb145460c1d662228";
const SCRIPT = "d3n4c3";
const EXPECTED_VERSION = process.env.EXPECTED_VERSION || "d44675c5-1d64-444a-9d99-80887ee82b68";
const root = "/workspace/flair-site-local";
const outDir = "/workspace/site-redesign/deploy/out";
fs.mkdirSync(outDir, { recursive: true });

function hashBytes(buf, ext) {
  const b64 = Buffer.from(buf).toString("base64");
  return { hash: blake3.hash(b64 + ext).toString("hex").slice(0, 32), size: buf.length, b64 };
}
async function cf(urlPath, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${urlPath}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
  });
  const text = await res.text();
  let json = {}; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { ok: res.ok && json.success !== false, status: res.status, json };
}
function extractWorkerJs(buf, ctype) {
  const m = /boundary=([^;\s]+)/.exec(ctype || "");
  if (!m) return buf.toString("utf8");
  const b = Buffer.from("--" + m[1]);
  const start = buf.indexOf(b) + b.length;
  const hdrEnd = buf.indexOf("\r\n\r\n", start) + 4;
  const next = buf.indexOf(Buffer.from("\r\n--" + m[1]), hdrEnd);
  const hdr = buf.slice(start, hdrEnd).toString();
  if (!/name="worker\.js"/.test(hdr)) throw new Error("first part not worker.js");
  if (buf.indexOf(Buffer.from("--" + m[1]), next + 4) !== -1 && buf.indexOf(Buffer.from("--" + m[1] + "\r\n"), next + 2) !== -1) throw new Error("more than one module part");
  return buf.slice(hdrEnd, next).toString("utf8");
}
function replaceOnce(js, a, b, label) {
  const n = js.split(a).length - 1;
  if (n !== 1) throw new Error(`patch ${label}: expected 1 match, got ${n}`);
  return js.replace(a, b);
}

async function main() {
  // 1) Assets: only changed files, merged with keep_assets.
  const pairs = [
    ["/index.html", "index.html"], ["/about.html", "about.html"], ["/categories.html", "categories.html"],
    ["/category/announcements.html", "category/announcements.html"], ["/category/projects.html", "category/projects.html"],
    ["/errors/404.html", "errors/404.html"], ["/errors/403.html", "errors/403.html"],
    ["/assets/site.css", "assets/site.css"], ["/assets/next-shell.css", "assets/next-shell.css"],
    ["/_next/static/css/0598427d81c5a7ef.css", "assets/next-shell.css"],
  ];
  for (const n of fs.readdirSync(path.join(root, "blog"))) if (n.endsWith(".html")) pairs.push([`/blog/${n}`, `blog/${n}`]);
  const manifest = {}, files = {}, types = {};
  const MIME = { html: "text/html", css: "text/css", js: "application/javascript", json: "application/json" };
  for (const [ap, rel] of pairs) {
    const buf = fs.readFileSync(path.join(root, rel));
    const info = hashBytes(buf, path.extname(ap).slice(1));
    manifest[ap] = { hash: info.hash, size: info.size };
    files[info.hash] = info.b64;
    types[info.hash] = MIME[path.extname(ap).slice(1)] || "application/octet-stream";
  }
  // Workers assets uploads REPLACE the whole asset set, so start from the full current set
  // (the flair-guard baked manifest, verified equal to live) and override only changed paths.
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, "base-asset-manifest.json"), "utf8"));
  const full = {};
  for (const x of base.blog) full[x.path] = { hash: x.hash, size: x.size };
  for (const x of base.cards) full[x.path] = { hash: x.hash, size: x.size };
  full[base.masterset[0]] = { hash: base.masterset[1], size: Number(base.masterset[2]) };
  const baseCount = Object.keys(full).length;
  let overridden = 0, added = 0;
  for (const [k, v] of Object.entries(manifest)) { if (full[k]) overridden++; else added++; full[k] = v; }
  console.log("base assets", baseCount, "overridden", overridden, "added", added, "final", Object.keys(full).length);
  for (const k of Object.keys(manifest)) delete manifest[k];
  Object.assign(manifest, full);
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log("manifest entries", Object.keys(manifest).length);

  // 2) Preflight: current deployment must still be the one we inspected.
  const deps = await cf(`workers/scripts/${SCRIPT}/deployments`);
  const cur = deps.json.result.deployments[0];
  const curVid = cur.versions[0].version_id;
  console.log("current deployment", cur.id, curVid, cur.created_on);
  if (curVid !== EXPECTED_VERSION || cur.versions.length !== 1) { console.log("refuse: production changed since inspection"); process.exit(1); }
  const settings = await cf(`workers/scripts/${SCRIPT}/settings`);
  if (!settings.ok) { console.log("settings failed"); process.exit(1); }
  const S = settings.json.result;
  const ver = await cf(`workers/scripts/${SCRIPT}/versions/${curVid}`);
  const rt = ver.json.result.resources.script_runtime;
  fs.writeFileSync(path.join(outDir, "pre-settings.json"), JSON.stringify({ settings: S, runtime: rt }, null, 1));

  // 3) Worker module: exact live module + three surgical patches.
  const cres = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${SCRIPT}/content/v2`, { headers: { Authorization: `Bearer ${token}` } });
  const cbuf = Buffer.from(await cres.arrayBuffer());
  let js = extractWorkerJs(cbuf, cres.headers.get("content-type"));
  fs.writeFileSync(path.join(outDir, "worker.live.js"), js);
  console.log("live module sha256", crypto.createHash("sha256").update(js).digest("hex"), "bytes", js.length);
  if (!js.includes("__flair_origin") || !js.includes("worker_default2_flair")) { console.log("refuse: flair proxy missing"); process.exit(1); }

  const alreadyPatched = js.includes("__removed_sections");
  if (alreadyPatched) {
    const s = crypto.createHash("sha256").update(js).digest("hex");
    if (s !== "d5ee1648ff5685b588c1d574dc13458161289a77fec43b6b7461056c4b3e3fc1") { console.log("refuse: unknown patched module"); process.exit(1); }
    console.log("module already carries this patch; reusing it unchanged");
  }
  if (!alreadyPatched) js = replaceOnce(js,
    '(0, d.jsx)(j(), { href: "/fortnite", children: "Fortnite" }), (0, d.jsx)(j(), { href: "/bets", children: "Bets" }), (0, d.jsx)(m.SessionNav, {})',
    '(0, d.jsx)("a", { href: "/94flair/", className: "nav-checklist", children: "\\u201994 Flair Checklist" }), (0, d.jsx)(m.SessionNav, {})',
    "header nav");
  if (!alreadyPatched) js = replaceOnce(js,
    '(0, d.jsx)(j(), { href: "/fortnite", children: "Fortnite" }), (0, d.jsx)(o.FooterAuthLinks, {})',
    '(0, d.jsx)("a", { href: "/94flair/", children: "\\u201994 Flair Checklist" }), (0, d.jsx)(o.FooterAuthLinks, {})',
    "footer nav");
  if (!alreadyPatched) js = replaceOnce(js,
    'const worker_default2_flair = {\n  async fetch(request, env, ctx) {\n    try {\n      const url = new URL(request.url);\n',
    'const __removed_sections = /^\\/(?:fortnite|bets|sprites|api\\/fortnite|api\\/bets|api\\/cron\\/fortnite-sync)(?:\\.rsc)?(?:\\/.*)?$/;\n' +
    'const worker_default2_flair = {\n  async fetch(request, env, ctx) {\n    try {\n      const url = new URL(request.url);\n' +
    '      if (__removed_sections.test(url.pathname)) {\n' +
    '        // Fortnite and Bets sections were removed Nov 9, 2026: fall through to the normal site 404.\n' +
    '        const gone = new URL(request.url);\n' +
    '        gone.pathname = "/__removed-section";\n' +
    '        gone.search = "";\n' +
    '        return __orig_default.fetch(new Request(gone.toString(), { method: "GET", headers: request.headers }), env, ctx);\n' +
    '      }\n',
    "wrapper");
  fs.writeFileSync(path.join(outDir, "worker.patched.js"), js);
  console.log("patched module sha256", crypto.createHash("sha256").update(js).digest("hex"), "bytes", js.length);

  // 4) Bindings and assets config, preserved.
  const newBindings = [];
  for (const b of S.bindings) {
    if (b.type === "secret_text" || b.name === "ASSETS") continue;
    const e = { name: b.name, type: b.type };
    if (b.type === "plain_text") e.text = b.text;
    else if (b.type === "r2_bucket") e.bucket_name = b.bucket_name;
    else if (b.type === "service") { e.service = b.service; e.environment = b.environment || "production"; }
    else { console.log("refuse: unexpected binding type", b.type); process.exit(1); }
    newBindings.push(e);
  }
  newBindings.push({ name: "ASSETS", type: "assets" });
  const rwf = [...(rt.assets.raw_run_worker_first || [])];
  for (const p of ["/fortnite", "/fortnite/*", "/bets", "/bets/*"]) if (!rwf.includes(p)) rwf.push(p);
  const metadata = {
    main_module: "worker.js",
    compatibility_date: S.compatibility_date,
    compatibility_flags: S.compatibility_flags,
    keep_assets: true,
    keep_bindings: ["secret_text", "secret_key"],
    bindings: newBindings,
    annotations: { "workers/message": "blog home redesign; remove Fortnite + Bets (direct publish)" },
    assets: { jwt: null, config: { html_handling: rt.assets.html_handling, not_found_handling: rt.assets.not_found_handling, run_worker_first: rwf } },
  };
  console.log("bindings", newBindings.map((b) => b.name + ":" + b.type).join(","), "rwf", JSON.stringify(rwf));
  if (DRY) { console.log("dry run: stop before upload session"); return; }

  let session = await cf(`workers/scripts/${SCRIPT}/assets-upload-session`, { method: "POST", body: JSON.stringify({ keep_assets: true, manifest }) });
  if (!session.ok) { console.log("session failed", session.status, JSON.stringify(session.json.errors).slice(0, 500)); process.exit(1); }
  let jwt = session.json.result.jwt;
  const buckets = session.json.result.buckets || [];
  console.log("upload buckets", buckets.length, "hashes", buckets.flat().length);
  for (const bucket of buckets) {
    const form = new FormData();
    for (const h of bucket) {
      if (!files[h]) { console.log("refuse: unknown hash requested"); process.exit(1); }
      form.append(h, new Blob([files[h]], { type: types[h] }), h);
    }
    const up = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/assets/upload?base64=true`, { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: form });
    const uj = await up.json();
    if (!uj.success) { console.log("upload failed", JSON.stringify(uj.errors).slice(0, 500)); process.exit(1); }
    if (uj.result && uj.result.jwt) jwt = uj.result.jwt;
  }
  metadata.assets.jwt = jwt;
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new Blob([js], { type: "application/javascript+module" }), "worker.js");
  const vr = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${SCRIPT}/versions`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const vj = await vr.json();
  if (!vj.success) { console.log("version failed", JSON.stringify(vj.errors).slice(0, 800)); process.exit(1); }
  const newVid = vj.result.id;
  console.log("new version", newVid, "rwf", JSON.stringify(vj.result.resources?.script_runtime?.assets?.raw_run_worker_first));
  const dep = await cf(`workers/scripts/${SCRIPT}/deployments`, { method: "POST", body: JSON.stringify({ strategy: "percentage", versions: [{ version_id: newVid, percentage: 100 }], annotations: { "workers/message": "blog home redesign; remove Fortnite + Bets" } }) });
  console.log("deploy", dep.ok, dep.status, dep.json.result && dep.json.result.id, (dep.json.errors || []).map((e) => e.message).join(";"));
  fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify({ newVid, deployment: dep.json.result && dep.json.result.id, previousVersion: curVid }, null, 1));
  if (!dep.ok) process.exit(1);
}
main().catch((e) => { console.error("error", e.message); process.exit(1); });
