#!/usr/bin/env node
/**
 * WS-DEMO: the /metrics surface (per-gadget activity over time — the ResourcesPanel "Metrics" card:
 * requests · errors · p95). Reachable via the SIDEBAR rail (real-user path, proves nav wiring);
 * renders the stat strip + a metric toggle + a gadget selector + a trend chart + a per-gadget table.
 * The SIGNATURE interactions: toggling the metric or selecting a gadget RE-DRAWS the chart (the chart
 * heading reflects "{gadget} · {metric}"), and the surface cross-links to Analytics + Compute.
 * Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + metric toggle + a gadget + chart + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bmetrics\b/i,              // the page
  /(requests|error rate|latency)/i, // the metric toggle
  /lead-scorer|click-counter/i, // real sample gadget names
  /avg p95|gadgets/i,          // the stat strip
  /latest|intervals/i,         // the chart caption
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});

// Return to an authed surface with the rail, then click the Metrics rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Metrics", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/metrics/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const chartHeading = () => page.locator('section[aria-label="Metric chart"] h2').first().innerText().catch(() => '');

// INTERACTIVE 1 — the gadget selector re-draws the chart. Default "All gadgets · …" → pick lead-scorer.
const h0 = await chartHeading();
let gadgetSelectWorks = false;
const gadgetPill = page.getByRole("button", { name: "lead-scorer", exact: true }).first();
if (await gadgetPill.count().then((c) => c > 0).catch(() => false)) {
  await gadgetPill.click().catch(() => {});
  await page.waitForTimeout(400);
  const h1 = await chartHeading();
  gadgetSelectWorks = /all gadgets/i.test(h0) && /lead-scorer/i.test(h1);
}

// INTERACTIVE 2 — the metric toggle re-draws the chart. Requests → Error rate.
let metricToggleWorks = false;
const errPill = page.getByRole("button", { name: "Error rate", exact: true }).first();
if (await errPill.count().then((c) => c > 0).catch(() => false)) {
  await errPill.click().catch(() => {});
  await page.waitForTimeout(400);
  const h2 = await chartHeading();
  metricToggleWorks = /error rate/i.test(h2);
}

// INTERACTIVE 3 — cross-links to Analytics + Compute (the interconnect pattern).
const analyticsLink = await page.getByRole("button", { name: /Full analytics/ }).count().then((c) => c > 0).catch(() => false);
const runtimeLink = await page.getByRole("button", { name: /Runtime/ }).count().then((c) => c > 0).catch(() => false);
const crossLinksPresent = analyticsLink && runtimeLink;

await page.screenshot({ path: "scripts/.metrics-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, gadgetSelectWorks, metricToggleWorks, crossLinksPresent, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Metrics reachable from the sidebar rail", "no Metrics rail link (nav wiring missing)");
check(onPath, "Metrics rail click → /metrics", "rail click did not reach /metrics");
check(renders, "Metrics content renders (stats + metric toggle + gadgets + chart + honesty label)", `content missing: ${missing.join(", ")}`);
check(gadgetSelectWorks, "Gadget selector re-draws the chart (All gadgets → lead-scorer)", "chart heading did not update on gadget select");
check(metricToggleWorks, "Metric toggle re-draws the chart (Requests → Error rate)", "chart heading did not update on metric toggle");
check(crossLinksPresent, "Cross-links to Analytics + Compute present (interconnect)", "missing Full-analytics / Runtime cross-links");
check(realErrors.length === 0, "0 console errors on /metrics", `${realErrors.length} console errors`);
console.log(ok ? "✅ METRICS GREEN" : "❌ metrics check failed");
process.exit(ok ? 0 : 1);
