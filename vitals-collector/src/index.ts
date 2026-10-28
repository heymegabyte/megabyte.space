// megabyte-os-vitals — the estate's QUERYABLE field-CWV (RUM) sink.
//
// CF Web Analytics collects RUM but is DASHBOARD-ONLY (free-tier RUM isn't in the GraphQL Analytics
// API). This is the queryable complement: any Brian surface beacons web-vitals here (POST /), and
// GET / returns p75 per metric — so the loop can self-measure LCP/INP/CLS (e.g. to gate ESTATE #3
// SSR on real field data) without the dashboard. Public + rate-limited + validated; aggregate-only
// output (no PII). Standalone worker (zero apex risk), like mcp-server + os-agent.
//
// `probe` samples (POST {probe:true}) are stored but EXCLUDED from the public summary — so a verifier
// can prove the pipeline end-to-end without polluting the real field data (the proven RUM pattern).

import { DurableObject } from "cloudflare:workers";

const METRICS = new Set(["LCP", "INP", "CLS", "TTFB", "FCP"]);
const MAX_ROWS = 20000; // ring-bound the table (prune oldest beyond this)
const WINDOW_DAYS = 7;

interface Env {
  VITALS: DurableObjectNamespace<VitalsStore>;
  VITALS_RATELIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> };
}

const CORS = {
  "access-control-allow-origin": "*", // beacons come from megabyte.space + subdomains; output is non-sensitive aggregate
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};
const SEC = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

// Served beacon snippet — any surface adds `<script src="https://vitals.megabyte.space/beacon.js" defer>`
// and it reports LCP/CLS/TTFB/FCP here on page-hide. Self-contained, dependency-free, fail-soft (RUM is
// best-effort — never affects the host app). This keeps the beacon logic cohesive with its sink + makes
// wiring a consumer (e.g. the OS frontend) a ONE-LINE script tag, not a bundled module.
const BEACON_JS = `(function(){if(typeof PerformanceObserver==='undefined')return;var EP='https://vitals.megabyte.space/',lcp=0,cls=0,sent=false;function send(m,v){try{navigator.sendBeacon&&navigator.sendBeacon(EP,new Blob([JSON.stringify({metric:m,value:Math.round(v*1000)/1000,path:location.pathname})],{type:'text/plain'}))}catch(e){}}try{new PerformanceObserver(function(l){var es=l.getEntries(),last=es[es.length-1];if(last)lcp=last.renderTime||last.loadTime||last.startTime||lcp}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){}try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput)cls+=e.value})}).observe({type:'layout-shift',buffered:true})}catch(e){}try{var nav=performance.getEntriesByType('navigation')[0];if(nav&&nav.responseStart)send('TTFB',nav.responseStart);new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(e.name==='first-contentful-paint')send('FCP',e.startTime)})}).observe({type:'paint',buffered:true})}catch(e){}function flush(){if(sent)return;sent=true;if(lcp>0)send('LCP',lcp);send('CLS',cls)}addEventListener('visibilitychange',function(){document.visibilityState==='hidden'&&flush()});addEventListener('pagehide',flush)})();`;

export class VitalsStore extends DurableObject<Env> {
  sql: SqlStorage;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS samples (id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value REAL NOT NULL, path TEXT, probe INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL)",
    );
  }

  add(metric: string, value: number, path: string, probe: number): void {
    this.sql.exec(
      "INSERT INTO samples (metric, value, path, probe, ts) VALUES (?, ?, ?, ?, ?)",
      metric,
      value,
      path,
      probe,
      Date.now(),
    );
    const n = [...this.sql.exec("SELECT COUNT(*) AS c FROM samples")][0].c as number;
    if (n > MAX_ROWS) this.sql.exec("DELETE FROM samples WHERE id <= (SELECT MAX(id) - ? FROM samples)", MAX_ROWS);
  }

  summary(includeProbe: boolean): { vitals: { metric: string; p75: number; n: number }[]; windowDays: number; generatedAt: string } {
    const since = Date.now() - WINDOW_DAYS * 86400000;
    const probeClause = includeProbe ? "" : " AND probe = 0";
    const vitals: { metric: string; p75: number; n: number }[] = [];
    for (const metric of METRICS) {
      const vals = [
        ...this.sql.exec(
          `SELECT value FROM samples WHERE metric = ? AND ts >= ?${probeClause} ORDER BY value ASC`,
          metric,
          since,
        ),
      ].map((r) => r.value as number);
      if (!vals.length) continue;
      const idx = Math.min(vals.length - 1, Math.floor(vals.length * 0.75)); // nearest-rank p75
      vitals.push({ metric, p75: Math.round(vals[idx] * 1000) / 1000, n: vals.length });
    }
    return { vitals, windowDays: WINDOW_DAYS, generatedAt: new Date().toISOString() };
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const stub = env.VITALS.get(env.VITALS.idFromName("global"));
    const url = new URL(req.url);

    if (req.method === "GET") {
      if (url.pathname === "/beacon.js")
        return new Response(BEACON_JS, {
          headers: { ...CORS, ...SEC, "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      const summary = await stub.summary(url.searchParams.has("includeProbe"));
      return Response.json(summary, { headers: { ...CORS, ...SEC, "cache-control": "max-age=30" } });
    }

    if (req.method === "POST") {
      if (env.VITALS_RATELIMIT) {
        const ip = req.headers.get("cf-connecting-ip") || "anon";
        const { success } = await env.VITALS_RATELIMIT.limit({ key: ip });
        if (!success) return new Response(null, { status: 429, headers: CORS });
      }
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: "bad json" }, { status: 400, headers: CORS });
      }
      const b = body as { metric?: unknown; value?: unknown; path?: unknown; probe?: unknown };
      const metric = String(b?.metric ?? "").toUpperCase();
      const value = Number(b?.value);
      // CLS is a unitless ratio (0..~5); the rest are ms (0..600000). One generous bound covers both.
      if (!METRICS.has(metric) || !Number.isFinite(value) || value < 0 || value > 600000)
        return Response.json({ error: "invalid metric/value" }, { status: 400, headers: CORS });
      const path = String(b?.path ?? "").slice(0, 256);
      await stub.add(metric, value, path, b?.probe ? 1 : 0);
      return new Response(null, { status: 204, headers: CORS });
    }

    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  },
};
