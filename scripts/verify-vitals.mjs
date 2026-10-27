#!/usr/bin/env node
/**
 * verify-vitals — checks static evidence of the apex's configured RUM beacon.
 *
 * The OS's RUM is **Cloudflare Web Analytics** (the edge beacon), NOT a custom pipeline.
 * Post-WS-11 the old custom `/api/analytics/live` + `/api/vitals` belonged to the RETIRED
 * homepage worker (now 404) — this verifier used to test those and was stale drift. The apex
 * (OS) collects field CWV via the CF Web Analytics beacon; the real LCP/INP/CLS p75 live in the
 * CF dashboard (Web Analytics → megabyte.space → Core Web Vitals). Free-tier RUM is NOT exposed
 * via the GraphQL Analytics API (`rumPageloadEventsAdaptiveGroups` → "unknown field"), so the
 * dashboard is the field source of truth.
 *
 * This asserts the beacon markup is SERVED on the apex + the retired custom endpoint
 * stays GONE (drift guard) — a regression net: if the beacon is ever dropped, field CWV dies silently.
 *
 * Usage: node scripts/verify-vitals.mjs   (no auth, no browser — a fast HTML + status check)
 * This does not prove browser execution, ingestion, or field-CWV values.
 * Exit 0 = configured beacon markup served. Exit 1 = a check failed (named in output).
 */
import { pathToFileURL } from "node:url";

const APEX = "https://megabyte.space";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

export async function verifyVitals(fetchImpl = fetch) {
  const checks = [];
  const ok = (name, pass, detail = "") => checks.push({ name, pass: !!pass, detail });
  const request = (path) => fetchImpl(`${APEX}${path}`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  try {
    const res = await request("/");
    const html = await res.text();
    ok("apex serves 200 HTML", res.status === 200 &&
      /^text\/html(?:;|$)/i.test(res.headers.get("content-type") ?? ""), `status=${res.status}`);
    // Inspect script markup, not incidental domain mentions in prose or comments.
    const scripts = html.replace(/<!--[\s\S]*?-->/g, "").match(/<script\b[^>]*>/gi) ?? [];
    const beaconScripts = scripts.filter(tag => /\ssrc\s*=\s*(["'])https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js(?:\/v[a-f0-9]+)?(?:\?[^"']*)?\1/i.test(tag));
    ok("CF Web Analytics beacon script markup present", beaconScripts.length > 0);
    ok("beacon script carries JSON configuration with a nonempty token",
      beaconScripts.some(tag => {
        const raw = tag.match(/\sdata-cf-beacon\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
        if (!raw) return false;
        try {
          // HTML attributes may encode JSON quotes; decode once as the HTML parser does.
          const decoded = raw.replace(/&(?:quot|#34|#x22);/gi, '\"')
            .replace(/&(?:apos|#39|#x27);/gi, "'").replace(/&amp;/gi, "&");
          const config = JSON.parse(decoded);
          return typeof config?.token === "string" && config.token.trim().length > 0;
        } catch { return false; }
      }));
  } catch {
    ok("apex HTML request completed", false, "request failed or timed out");
  }
  try {
    const retired = await request("/api/analytics/live");
    ok("retired custom-RUM endpoint is gone (404)", retired.status === 404, `status=${retired.status}`);
    await retired.body?.cancel();
  } catch {
    ok("retired custom-RUM endpoint request completed", false, "request failed or timed out");
  }
  return checks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checks = await verifyVitals();
  for (const { name, pass, detail } of checks) {
    console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  }
  console.log("\nℹ Static markup only; browser execution and metric ingestion remain unverified.");
  console.log("Field LCP/INP/CLS p75: Cloudflare dashboard → Web Analytics → megabyte.space → Core Web Vitals");
  const failed = checks.filter(c => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks green`);
  process.exitCode = failed.length ? 1 : 0;
}
