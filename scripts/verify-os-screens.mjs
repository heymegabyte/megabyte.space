#!/usr/bin/env node
/**
 * verify-os-screens — "ALL the Cloudflare OS screens can load" (Brian 2026-10-06).
 *
 * BA-authed real Chromium against PROD. Logs in ONCE with the ba-e2e bypass, then visits EVERY
 * static OS route (enumerated from the fork's file-based routes), asserting each: (a) the session
 * held (NOT bounced to /signin), (b) real content rendered (not blank/5xx), (c) 0 NEW console
 * errors (benign capnweb reconnect filtered, as journey-os-nav does). Screenshots to scripts/.screens/.
 * Net-new vs journey-os-nav (15 nav clicks) + the per-surface verifiers — this is the full-set load gate.
 *
 *   export BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD)
 *   node scripts/verify-os-screens.mjs [--mobile]
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA_E2E_EMAIL / BA_E2E_PASSWORD (export from get-secret)"); process.exit(2); }
const MOBILE = process.argv.includes("--mobile");

// Every static OS screen (dynamic $id routes + signin/signup excluded — those are separate checks).
const ROUTES = [
  "/", "/pulse", "/goals", "/agents", "/automations", "/context", "/explore", "/blueprints",
  "/outputs", "/gadgets", "/models", "/providers", "/connections", "/gatekeepers", "/workspaces",
  "/profile", "/database", "/analytics", "/activity", "/logs", "/domains", "/queues", "/secrets",
  "/storage", "/compute", "/metrics", "/permissions", "/provenance", "/workflows", "/ai-gateway",
  "/vectorize", "/durable-objects", "/email", "/notifications", "/environments", "/approvals",
  "/tasks", "/tools", "/presence", "/analytics-engine", "/hyperdrive", "/realtime", "/sandboxes",
  "/mcp", "/research", "/knowledge", "/skills", "/artifacts", "/sources", "/audit", "/billing",
  "/booking", "/browser-runs", "/customers", "/experiments", "/forms", "/inbox", "/releases", "/admin",
];

// A few routes legitimately render a TERSE page, so assert intended content by marker instead of a
// raw char count. /admin shows the "no access" denied state for the non-admin ba-e2e account (by
// design — admin is reached via the rail by real admins); on mobile the shell sidebar text (counted
// on desktop) is drawer-hidden, so a correct denied page drops below a generic length threshold.
const MARKERS = { "/admin": /don'?t have access|access to this page|^admin/i };

const IGNORE_CONSOLE = /WebSocket is already in CLOSING or CLOSED state/i;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
let errors = [];
page.on("console", (m) => { if (m.type() === "error" && !IGNORE_CONSOLE.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => { if (!IGNORE_CONSOLE.test(String(e))) errors.push(String(e)); });

// ── Sign in once (email+password bypass) ────────────────────────────────────────
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1500);
if (/\/signin/.test(page.url())) { console.log("❌ sign-in failed — bounced to /signin; aborting"); await browser.close(); process.exit(1); }
errors = []; // measure per-route console errors only

const rows = [];
for (const route of ROUTES) {
  const before = errors.length;
  let status = 0, finalUrl = "", textLen = 0, ok = false, note = "";
  try {
    const resp = await page.goto(`${APEX}${route}`, { waitUntil: "domcontentloaded", timeout: 35000 });
    status = resp ? resp.status() : 0;
    await page.waitForTimeout(900);
    finalUrl = page.url().replace(APEX, "") || "/";
    const body = await page.locator("body").innerText().catch(() => "");
    textLen = body.trim().length;
    const bounced = /^\/signin/.test(finalUrl) && route !== "/signin";
    const marker = MARKERS[route];                   // marker routes assert INTENDED content
    const rendered = marker ? marker.test(body) : textLen >= 50; // blank/5xx would be ~0 chars
    const http5xx = status >= 500;
    const newErr = errors.length - before;
    ok = !bounced && rendered && !http5xx && newErr === 0;
    if (bounced) note = "BOUNCED to /signin (session lost)";
    else if (http5xx) note = `HTTP ${status}`;
    else if (!rendered) note = marker ? `intended content absent (${textLen} chars)` : `blank (${textLen} chars)`;
    else if (newErr) note = `${newErr} console err: ${errors.slice(before).join(" | ").slice(0, 120)}`;
  } catch (e) { note = `threw: ${String(e).slice(0, 90)}`; }
  const newErr = errors.length - before;
  await page.screenshot({ path: `scripts/.screens/${route.replace(/\//g, "_") || "_root"}.png` }).catch(() => {});
  rows.push({ route, ok, status, finalUrl, textLen, newErr, note });
  console.log(`${ok ? "✅" : "❌"} ${route.padEnd(18)} http=${status} url=${finalUrl.padEnd(16)} text=${textLen} err=${newErr}${note ? " · " + note : ""}`);
}
await browser.close();

const passed = rows.filter((r) => r.ok).length;
console.log(`\n${JSON.stringify({ viewport: MOBILE ? "390" : "1440", total: rows.length, passed, failed: rows.length - passed, totalConsoleErrors: errors.length }, null, 2)}`);
if (passed === rows.length) console.log(`✅ ALL OS SCREENS LOAD: ${passed}/${rows.length}`);
else { console.log(`❌ ${rows.length - passed} screen(s) did not cleanly load:`); rows.filter((r) => !r.ok).forEach((r) => console.log(`   ${r.route} — ${r.note}`)); process.exit(1); }
