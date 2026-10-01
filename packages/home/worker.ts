// Public front door for megabyte.space.
// Serves the marketing homepage from static assets; /login funnels into the
// Access-gated Cloudflare OS at os.megabyte.space. Every response carries the
// full security-header set (CSP included), and HTML pageviews land in a
// SQLite-backed Durable Object counter behind the ANALYTICS_LIVE flag.
//
// run_worker_first is ["/*", "!/assets/*"] — without worker-first routing the
// asset layer serves "/" directly and NONE of these headers (nor the pageview
// capture) ever reach a real browser. Hashed /assets/* stay on the fast path.

import { DurableObject } from "cloudflare:workers";

interface Env {
  ASSETS: Fetcher;
  ANALYTICS: DurableObjectNamespace<AnalyticsCounter>;
  ANALYTICS_LIVE?: string;
}

const OS_ORIGIN = "https://os.megabyte.space";

// Allowlist matches what the Cloudflare edge actually serves + injects:
//   • Cloudflare Fonts rewrites the Google Fonts <link> to SAME-ORIGIN woff2 at
//     /cf-fonts/* → font-src 'self' (NOT gstatic; the browser never hits gstatic).
//     gstatic kept as a fallback for if CF Fonts is ever disabled.
//   • Cloudflare Web Analytics auto-injects static.cloudflareinsights.com/beacon.min.js
//     (script-src) which POSTs RUM to cloudflareinsights.com (connect-src).
//   • JSON-LD blocks are non-executable (type=ld+json) — unaffected by script-src.
// Our own scripts are same-origin Vite modules, so no nonce is needed. The ONE
// residual is CF's challenge-platform inline bootstrap (window.__CF$cv$params): it
// embeds a per-request ray, so its hash is unstable (un-pinnable) and we refuse
// 'unsafe-inline' — it is a documented upstream edge injection, not our code.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(response.body, { status: response.status, headers });
}

// One named instance ("global") aggregates the whole apex. Counts only —
// path + day buckets, zero PII (no IP, no UA, no cookies).
export class AnalyticsCounter extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS visitor_events (path TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (path, day))",
    );
  }

  record(path: string): void {
    const day = new Date().toISOString().slice(0, 10);
    this.sql.exec(
      "INSERT INTO visitor_events (path, day, count) VALUES (?, ?, 1) ON CONFLICT(path, day) DO UPDATE SET count = count + 1",
      path,
      day,
    );
  }

  totals(): { total: number; today: number } {
    const day = new Date().toISOString().slice(0, 10);
    const total = Number(this.sql.exec("SELECT COALESCE(SUM(count), 0) AS n FROM visitor_events").one().n);
    const today = Number(
      this.sql.exec("SELECT COALESCE(SUM(count), 0) AS n FROM visitor_events WHERE day = ?", day).one().n,
    );
    return { total, today };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const flagOn = env.ANALYTICS_LIVE === "1";

    if (url.pathname === "/login" || url.pathname === "/login/") {
      return withSecurityHeaders(Response.redirect(`${OS_ORIGIN}/${url.search}`, 302));
    }

    if (url.pathname === "/health") {
      return withSecurityHeaders(Response.json({ status: "ok", surface: "megabyte-home" }));
    }

    if (url.pathname === "/api/analytics/live") {
      // Flag off ⇒ 404 (never 403 — don't leak existence).
      if (!flagOn) {
        return withSecurityHeaders(Response.json({ error: "not_found" }, { status: 404 }));
      }
      const counts = await env.ANALYTICS.getByName("global").totals();
      return withSecurityHeaders(Response.json({ ok: true, ...counts }));
    }

    // Server-side pageview capture: HTML navigations only, never /api or assets.
    if (flagOn && request.method === "GET" && !url.pathname.startsWith("/api/")) {
      const dest = request.headers.get("sec-fetch-dest") || "";
      const accept = request.headers.get("accept") || "";
      if (dest === "document" || (dest === "" && accept.includes("text/html"))) {
        ctx.waitUntil(Promise.resolve(env.ANALYTICS.getByName("global").record(url.pathname)));
      }
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
