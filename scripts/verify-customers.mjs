#!/usr/bin/env node
/**
 * WS-DEMO: the /customers surface (Customers / People — the CRM hub of the Autonomous Business OS).
 * Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip +
 * conversion funnel + people grid + a per-customer unified timeline. The SIGNATURE behavior is
 * interactive: clicking a person's row drives the detail/timeline panel (row → `aside[aria-label=
 * "Timeline for <name>"]`). Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + funnel + grid + timeline + honesty label all rendered.
const NEEDLES = [
  /sample data/i,          // honest "Preview · sample data" — never lies-empty
  /conversion funnel/i,    // the funnel section
  /visitors/i,             // a funnel stage
  /customers/i,            // the page + a funnel stage
  /timeline/i,             // the per-customer unified timeline
  /in pipeline|active mrr/i, // the stat strip
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

// Return to an authed surface with the rail, then click the Customers rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Customers", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/customers/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: detail defaults to the first customer (Sarah Chen); clicking Priya Nair's row must
// switch the timeline panel to her (proves the row → detail drill-in, the surface's signature).
const detailBefore = await page.locator('aside[aria-label="Timeline for Sarah Chen"]').count().catch(() => 0);
let detailSwitched = false;
const row = page.getByRole("button", { name: "Open Priya Nair" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  detailSwitched = await page.locator('aside[aria-label="Timeline for Priya Nair"]').count().then((c) => c > 0).catch(() => false);
}
const drillInWorks = detailBefore > 0 && detailSwitched;

await page.screenshot({ path: "scripts/.customers-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, detailBefore, detailSwitched, drillInWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Customers reachable from the sidebar rail", "no Customers rail link (nav wiring missing)");
check(onPath, "Customers rail click → /customers", "rail click did not reach /customers");
check(renders, "Customers content renders (stats + funnel + grid + timeline + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Row click drives the timeline panel (Sarah → Priya)", `detail did not switch (before=${detailBefore}, switched=${detailSwitched})`);
check(errors.length === 0, "0 console errors on /customers", `${errors.length} console errors`);
console.log(ok ? "✅ CUSTOMERS GREEN" : "❌ customers check failed");
process.exit(ok ? 0 : 1);
