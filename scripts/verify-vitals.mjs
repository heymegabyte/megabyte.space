#!/usr/bin/env node
/**
 * verify-vitals — proves the apex's field-CWV (RUM) mechanism is LIVE.
 *
 * The OS's RUM is **Cloudflare Web Analytics** (the edge beacon), NOT a custom pipeline.
 * Post-WS-11 the old custom `/api/analytics/live` + `/api/vitals` belonged to the RETIRED
 * homepage worker (now 404) — this verifier used to test those and was stale drift. The apex
 * (OS) collects field CWV via the CF Web Analytics beacon; the real LCP/INP/CLS p75 live in the
 * CF dashboard (Web Analytics → megabyte.space → Core Web Vitals). Free-tier RUM is NOT exposed
 * via the GraphQL Analytics API (`rumPageloadEventsAdaptiveGroups` → "unknown field"), so the
 * dashboard is the field source of truth.
 *
 * This asserts the beacon is SERVED on the apex (RUM keeps flowing) + the retired custom endpoint
 * stays GONE (drift guard) — a regression net: if the beacon is ever dropped, field CWV dies silently.
 *
 * Usage: node scripts/verify-vitals.mjs   (no auth, no browser — a fast HTML + status check)
 * Exit 0 = RUM beacon live. Exit 1 = a check failed (named in output).
 */
const APEX = "https://megabyte.space";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

const checks = [];
const ok = (name, pass, detail = "") => {
  checks.push({ name, pass: !!pass });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};

const res = await fetch(`${APEX}/`, { headers: { "User-Agent": UA, Accept: "text/html" } });
const html = await res.text();
ok("apex serves 200 HTML", res.status === 200, `status=${res.status}`);
ok(
  "CF Web Analytics beacon present (field RUM live)",
  /static\.cloudflareinsights\.com\/beacon\.min\.js/.test(html) || /cloudflareinsights\.com/.test(html),
);
ok("beacon carries a cf-beacon config/token", /cf-beacon|data-cf-beacon|__cfBeacon/.test(html));

// Drift guard: the retired homepage's custom-RUM endpoint must stay GONE (not resurface as a stale 200).
const retired = await fetch(`${APEX}/api/analytics/live`, { headers: { "User-Agent": UA } });
ok("retired custom-RUM endpoint is gone (404)", retired.status === 404, `status=${retired.status}`);

console.log("\nℹ real field LCP/INP/CLS p75: dash.cloudflare.com → Web Analytics → megabyte.space → Core Web Vitals");
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} checks green`);
process.exit(failed.length ? 1 : 0);
