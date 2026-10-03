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
import { isKnownRoute } from "./src/known-routes";

interface Env {
  ASSETS: Fetcher;
  ANALYTICS: DurableObjectNamespace<AnalyticsCounter>;
  ANALYTICS_LIVE?: string;
  // Bearer token gating POST /api/vitals/reset (self-generated secret). Absent ⇒ reset 404s.
  VITALS_ADMIN_TOKEN?: string;
}

const OS_ORIGIN = "https://os.megabyte.space";

// Field Core Web Vitals we accept from the client beacon. Anything else is dropped
// at the boundary (no free-form metric names in the store).
const VITAL_METRICS = ["LCP", "CLS", "INP", "TTFB"] as const;
type VitalMetric = (typeof VITAL_METRICS)[number];
const isVitalMetric = (m: unknown): m is VitalMetric => typeof m === "string" && (VITAL_METRICS as readonly string[]).includes(m);

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
  // Everything the worker returns is dynamic or security-header-bearing: the index.html
  // shell, /health, /api/analytics/live, the /login 302. The CF edge otherwise caches the
  // shell (cf-cache-status HIT) and serves STALE security headers for minutes after a deploy
  // — fire-4 shipped a corrected CSP that stayed invisible until a manual purge. no-store
  // kills that class (new headers are live instantly, no purge needed). The big immutable
  // hashed /assets/* bypass the worker (run_worker_first "!/assets/*") and keep their own
  // long-lived cache, so LCP is unaffected — only the ~3 KB shell re-fetches.
  headers.set("Cache-Control", "no-store");
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
    // Field Core Web Vitals samples — metric + raw value, zero PII. Growth is
    // bounded to the most-recent 1000 samples per metric on each insert.
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS vital_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value REAL NOT NULL, day TEXT NOT NULL)",
    );
    // Migration: tag each sample probe(1)/field(0). The public card reads field only
    // (real users), verifiers write probe samples that never reach it. ADD COLUMN
    // throws if it already exists — the catch makes it a safe idempotent migration.
    try {
      this.sql.exec("ALTER TABLE vital_samples ADD COLUMN probe INTEGER NOT NULL DEFAULT 0");
    } catch {
      /* column already present */
    }
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

  /** Last `days` of total pageviews per day (oldest→newest), zero-filled for a continuous sparkline. */
  daily(days: number): { day: string; count: number }[] {
    const rows = this.sql
      .exec("SELECT day, SUM(count) AS n FROM visitor_events GROUP BY day ORDER BY day DESC LIMIT ?", days)
      .toArray() as unknown as { day: string; n: number }[];
    const map = new Map(rows.map((r) => [r.day, Number(r.n)]));
    const out: { day: string; count: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, count: map.get(key) ?? 0 });
    }
    return out;
  }

  /** Top `limit` paths by all-time pageviews. */
  topPaths(limit: number): { path: string; count: number }[] {
    return (
      this.sql
        .exec("SELECT path, SUM(count) AS n FROM visitor_events GROUP BY path ORDER BY n DESC LIMIT ?", limit)
        .toArray() as unknown as { path: string; n: number }[]
    ).map((r) => ({ path: String(r.path), count: Number(r.n) }));
  }

  /** Record one Web-Vital sample. probe=true tags it a verifier sample (never public). */
  recordVital(metric: string, value: number, probe = false): void {
    if (!isVitalMetric(metric)) return;
    if (!Number.isFinite(value) || value < 0 || value > 120000) return;
    const day = new Date().toISOString().slice(0, 10);
    const p = probe ? 1 : 0;
    this.sql.exec("INSERT INTO vital_samples (metric, value, day, probe) VALUES (?, ?, ?, ?)", metric, value, day, p);
    // Keep only the most-recent 1000 samples per metric+class so the DO never grows unbounded.
    this.sql.exec(
      "DELETE FROM vital_samples WHERE metric = ? AND probe = ? AND id NOT IN (SELECT id FROM vital_samples WHERE metric = ? AND probe = ? ORDER BY id DESC LIMIT 1000)",
      metric,
      p,
      metric,
      p,
    );
  }

  /** p50 + p75 per vital. Public (includeProbe=false) = real FIELD samples only. */
  vitals(includeProbe = false): { metric: VitalMetric; p50: number | null; p75: number | null; n: number }[] {
    const filter = includeProbe ? "" : " AND probe = 0";
    return VITAL_METRICS.map((metric) => {
      const n = Number(this.sql.exec(`SELECT COUNT(*) AS c FROM vital_samples WHERE metric = ?${filter}`, metric).one().c);
      const pct = (p: number): number | null => {
        if (n === 0) return null;
        const offset = Math.min(n - 1, Math.floor(n * p));
        const row = this.sql
          .exec(`SELECT value FROM vital_samples WHERE metric = ?${filter} ORDER BY value ASC LIMIT 1 OFFSET ?`, metric, offset)
          .one();
        return Number(row.value);
      };
      return { metric, p50: pct(0.5), p75: pct(0.75), n };
    });
  }

  /** Clear stored vital samples (FIELD only by default; all when includeProbe). Returns rows removed. */
  resetVitals(includeProbe = false): number {
    const before = Number(this.sql.exec("SELECT COUNT(*) AS c FROM vital_samples").one().c);
    this.sql.exec(includeProbe ? "DELETE FROM vital_samples" : "DELETE FROM vital_samples WHERE probe = 0");
    const after = Number(this.sql.exec("SELECT COUNT(*) AS c FROM vital_samples").one().c);
    return before - after;
  }

  /** Full build-in-public pulse in ONE round-trip: totals + daily sparkline + top paths + field CWV. */
  pulse(includeProbe = false): {
    total: number;
    today: number;
    daily: { day: string; count: number }[];
    topPaths: { path: string; count: number }[];
    vitals: { metric: VitalMetric; p50: number | null; p75: number | null; n: number }[];
  } {
    return { ...this.totals(), daily: this.daily(14), topPaths: this.topPaths(6), vitals: this.vitals(includeProbe) };
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
      // ?includeProbe=1 returns verifier samples too (verify-vitals only, never the public card).
      const includeProbe = url.searchParams.get("includeProbe") === "1";
      const pulse = await env.ANALYTICS.getByName("global").pulse(includeProbe);
      return withSecurityHeaders(Response.json({ ok: true, ...pulse }));
    }

    // Field Web Vitals beacon (navigator.sendBeacon POST) — validated at the boundary,
    // stored in the DO. Always 200 {ok:true} (beacons ignore the response); flag off ⇒ 404.
    // body.probe===true tags a verifier sample so it never reaches the public card.
    if (url.pathname === "/api/vitals" && request.method === "POST") {
      if (!flagOn) return withSecurityHeaders(Response.json({ error: "not_found" }, { status: 404 }));
      let body: unknown = null;
      try {
        body = await request.json();
      } catch {
        body = null;
      }
      const b = body as { metric?: unknown; value?: unknown; probe?: unknown } | null;
      if (b && isVitalMetric(b.metric) && typeof b.value === "number") {
        ctx.waitUntil(Promise.resolve(env.ANALYTICS.getByName("global").recordVital(b.metric, b.value, b.probe === true)));
      }
      return withSecurityHeaders(Response.json({ ok: true }));
    }

    // Admin: clear stored vitals (FIELD by default; ?all=1 clears probe too). Bearer-gated;
    // absent token ⇒ 404 (never leak the endpoint). Used once to purge pre-guard pollution.
    if (url.pathname === "/api/vitals/reset" && request.method === "POST") {
      const token = env.VITALS_ADMIN_TOKEN;
      if (!token || (request.headers.get("authorization") || "") !== `Bearer ${token}`) {
        return withSecurityHeaders(Response.json({ error: "not_found" }, { status: 404 }));
      }
      const removed = await env.ANALYTICS.getByName("global").resetVitals(url.searchParams.get("all") === "1");
      return withSecurityHeaders(Response.json({ ok: true, removed }));
    }

    // Server-side pageview capture: HTML navigations only, never /api or assets.
    if (flagOn && request.method === "GET" && !url.pathname.startsWith("/api/")) {
      const dest = request.headers.get("sec-fetch-dest") || "";
      const accept = request.headers.get("accept") || "";
      if ((dest === "document" || (dest === "" && accept.includes("text/html"))) && isKnownRoute(url.pathname)) {
        ctx.waitUntil(Promise.resolve(env.ANALYTICS.getByName("global").record(url.pathname)));
      }
    }

    const assetResponse = await env.ASSETS.fetch(request);
    // Soft-404 guard: an unknown HTML path gets the SPA index.html fallback at 200.
    // Rewrite to a real 404 STATUS so junk URLs aren't indexed — the shell still
    // renders the styled NotFound page. Assets, public files (text/plain, images),
    // and the known routes ("/", "/status") are left untouched.
    const navAccept = request.headers.get("accept") || "";
    const navDest = request.headers.get("sec-fetch-dest") || "";
    const isDoc = navDest === "document" || (navDest === "" && navAccept.includes("text/html"));
    const contentType = assetResponse.headers.get("content-type") || "";
    if (isDoc && assetResponse.status === 200 && contentType.includes("text/html") && !isKnownRoute(url.pathname)) {
      return withSecurityHeaders(new Response(assetResponse.body, { status: 404, headers: assetResponse.headers }));
    }
    return withSecurityHeaders(assetResponse);
  },
} satisfies ExportedHandler<Env>;
