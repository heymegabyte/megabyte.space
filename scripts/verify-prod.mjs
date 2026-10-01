#!/usr/bin/env node
// Post-deploy production verification for the megabyte.space Cloudflare OS estate.
//
// Topology under test:
//   https://megabyte.space/        → PUBLIC cinematic homepage (200, no auth wall,
//                                    WebGL canvas mount + login CTA present)
//   https://megabyte.space/login   → 302 into the gated app at os.megabyte.space
//   https://os.megabyte.space/     → Cloudflare Access gate (302 to manhattan team
//                                    login) for anonymous visitors
//   os.megabyte.space + service token → Cloudflare OS app shell (200, id="root")
//   https://www.megabyte.space/    → 301 to the apex
//
// Service-token credentials: CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET
// (falling back to the session drop files under /tmp).
//
// Exit 0 = all green; 1 = any assertion failed. TDD: rewritten BEFORE the
// topology change and must fail (RED) until the swap lands.

import { readFileSync } from "node:fs";

const APEX = "https://megabyte.space/";
const LOGIN = "https://megabyte.space/login";
const OS = "https://os.megabyte.space/";
const WWW = "https://www.megabyte.space/";
const ISSUER_HOST = "manhattan.cloudflareaccess.com";

const readTmp = (path) => {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
};

const clientId = process.env.CF_ACCESS_CLIENT_ID || readTmp("/tmp/cfos-st-id.txt");
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || readTmp("/tmp/cfos-st-secret.txt");

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const tryFetch = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    return { error: String(error?.cause?.code || error) };
  }
};

// 1. Apex is a PUBLIC homepage — no Access redirect, WebGL mount + login CTA.
{
  const res = await tryFetch(APEX, { redirect: "manual" });
  if (res.error) {
    record("apex serves public homepage", false, `fetch failed: ${res.error}`);
  } else {
    // Static-shell markers only — the WebGL canvas + login CTAs render client-side
    // and are asserted by the real-browser pass (Playwright + screenshot + console).
    const body = res.status === 200 ? await res.text() : "";
    const hasRoot = body.includes('id="app"');
    const isOurs = body.includes("Megabyte OS") && body.includes("/assets/");
    const noAccessWall = !(res.headers.get("location") || "").includes(ISSUER_HOST);
    const pass = res.status === 200 && hasRoot && isOurs && noAccessWall && body.length > 1000;
    record(
      "apex serves public homepage",
      pass,
      `status=${res.status} root=${hasRoot} branded=${isOurs} bytes=${body.length}`,
    );
  }
}

// 2. /login funnels into the gated OS — with BROWSER headers. A plain curl
//    (Accept: */*) skips the asset layer's SPA fallback and flatters the worker;
//    a real navigation (Accept: text/html) is what users send, and is exactly
//    the path that regressed when /login lacked run_worker_first.
{
  const res = await tryFetch(LOGIN, {
    redirect: "manual",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
    },
  });
  if (res.error) {
    record("/login redirects into the OS", false, `fetch failed: ${res.error}`);
  } else {
    const location = res.headers.get("location") || "";
    const pass = [301, 302].includes(res.status) && location.startsWith("https://os.megabyte.space");
    record("/login redirects into the OS", pass, `status=${res.status} location=${location || "(none)"}`);
  }
}

// 3. Anonymous os.megabyte.space is gated by Access.
{
  const res = await tryFetch(OS, { redirect: "manual" });
  if (res.error) {
    record("os subdomain gated by Access", false, `fetch failed: ${res.error}`);
  } else {
    const location = res.headers.get("location") || "";
    const pass = res.status === 302 && location.includes(ISSUER_HOST);
    record(
      "os subdomain gated by Access",
      pass,
      `status=${res.status} location=${location.slice(0, 80) || "(none)"}`,
    );
  }
}

// 4. Service-token request reaches the OS app shell.
{
  if (!clientId || !clientSecret) {
    record("service token reaches app shell", false, "missing CF_ACCESS_CLIENT_ID/SECRET");
  } else {
    const res = await tryFetch(OS, {
      redirect: "manual",
      headers: {
        "CF-Access-Client-Id": clientId,
        "CF-Access-Client-Secret": clientSecret,
      },
    });
    if (res.error) {
      record("service token reaches app shell", false, `fetch failed: ${res.error}`);
    } else {
      const body = res.status === 200 ? await res.text() : "";
      const pass =
        res.status === 200 &&
        (res.headers.get("content-type") || "").includes("text/html") &&
        body.includes('id="root"') &&
        body.length > 500;
      record("service token reaches app shell", pass, `status=${res.status} bytes=${body.length}`);
    }
  }
}

// 5. The OG card is a real image — the SPA asset fallback happily serves
//    index.html as a 200 for any missing file, so content-type is the tell.
{
  const res = await tryFetch("https://megabyte.space/og.jpg", { redirect: "manual" });
  if (res.error) {
    record("og image serves as image", false, `fetch failed: ${res.error}`);
  } else {
    const type = res.headers.get("content-type") || "";
    const bytes = (await res.arrayBuffer()).byteLength;
    const pass = res.status === 200 && type.includes("image/jpeg") && bytes > 20000 && bytes < 150000;
    record("og image serves as image", pass, `status=${res.status} type=${type} bytes=${bytes}`);
  }
}

// 6. www → apex.
{
  const res = await tryFetch(WWW, { redirect: "manual" });
  if (res.error) {
    record("www redirects to apex", false, `fetch failed: ${res.error}`);
  } else {
    const location = res.headers.get("location") || "";
    const pass = [301, 308].includes(res.status) && location.startsWith("https://megabyte.space");
    record("www redirects to apex", pass, `status=${res.status} location=${location || "(none)"}`);
  }
}

// 7. The apex serves the full security-header set. The asset layer used to
//    serve "/" without ever invoking the worker (run_worker_first gap), so
//    browsers received NO security headers while the worker code looked fine.
{
  const EXPECTED_CSP =
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";
  const res = await tryFetch(APEX, {
    redirect: "manual",
    headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
  });
  if (res.error) {
    record("apex serves security headers", false, `fetch failed: ${res.error}`);
  } else {
    const csp = res.headers.get("content-security-policy") || "";
    const coop = res.headers.get("cross-origin-opener-policy") || "";
    const corp = res.headers.get("cross-origin-resource-policy") || "";
    const pp = res.headers.get("permissions-policy") || "";
    const pass = csp === EXPECTED_CSP && coop === "same-origin" && corp === "same-origin" && pp.length > 0;
    record(
      "apex serves security headers",
      pass,
      `csp=${csp ? (csp === EXPECTED_CSP ? "exact" : "MISMATCH") : "absent"} coop=${coop || "absent"} corp=${corp || "absent"} pp=${pp ? "present" : "absent"}`,
    );
  }
}

// 8. Live analytics endpoint (ANALYTICS_LIVE flag on): real reconciled counts
//    from the AnalyticsCounter Durable Object — JSON shape, never the SPA shell
//    (the asset fallback happily 200s index.html for unknown paths).
{
  const res = await tryFetch("https://megabyte.space/api/analytics/live", { redirect: "manual" });
  if (res.error) {
    record("analytics live endpoint", false, `fetch failed: ${res.error}`);
  } else {
    const type = res.headers.get("content-type") || "";
    let body = null;
    try {
      body = type.includes("application/json") ? await res.json() : null;
    } catch {
      body = null;
    }
    const pass =
      res.status === 200 &&
      body?.ok === true &&
      Number.isFinite(body?.total) &&
      Number.isFinite(body?.today) &&
      body.total >= body.today;
    record(
      "analytics live endpoint",
      pass,
      `status=${res.status} type=${type.split(";")[0] || "(none)"} total=${body?.total ?? "—"} today=${body?.today ?? "—"}`,
    );
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} assertions green`);
process.exit(failed.length === 0 ? 0 : 1);
