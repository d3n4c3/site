/** d3n4c3-94flair — static assets + verify-selection intake */
const SELECTIONS_KEY = "https://d3n4c3-94flair.internal/api/verify-selections";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/94flair/api/verify-selections") {
      if (request.method === "OPTIONS") {
        return json({ ok: true });
      }

      const cache = caches.default;
      const cacheReq = new Request(SELECTIONS_KEY);

      if (request.method === "GET") {
        const hit = await cache.match(cacheReq);
        if (!hit) return json({ submitted: false, selected: [], message: "No submission yet" });
        return new Response(hit.body, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      }

      if (request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Invalid JSON" }, 400);
        }
        const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";
        // Dev/reset: clear stored picks
        if (notes === "reset" || body.clear === true) {
          await cache.delete(cacheReq);
          return json({ ok: true, submitted: false, selected: [], count: 0, cleared: true });
        }
        const selected = Array.isArray(body.selected)
          ? [...new Set(body.selected.map((n) => Number(n)).filter((n) => n >= 1 && n <= 99))].sort((a, b) => a - b)
          : [];
        const payload = {
          submitted: true,
          submittedAt: new Date().toISOString(),
          selected,
          count: selected.length,
          notes,
          userAgent: request.headers.get("user-agent") || "",
        };
        await cache.put(
          cacheReq,
          new Response(JSON.stringify(payload, null, 2), {
            headers: { "content-type": "application/json; charset=utf-8" },
          })
        );
        return json({ ok: true, ...payload });
      }

      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    if (env.ASSETS) {
      if (url.pathname === "/94flair") {
        url.pathname = "/94flair/";
        return Response.redirect(url.toString(), 308);
      }
      return env.ASSETS.fetch(request);
    }
    return new Response("ASSETS binding missing", { status: 500 });
  },
};
