#!/usr/bin/env node
/**
 * WS-DEMO: the /browser-runs surface (browser-agentic sessions — agents driving a real browser, with
 * a human-in-the-loop pause for MFA/CAPTCHA). Reachable via the SIDEBAR rail (real-user path, proves
 * nav wiring); renders the stat strip + sessions list + the selected-run detail (step trace + HITL).
 * The SIGNATURE behavior is interactive: clicking a run opens its trace, and the "needs input" run
 * exposes a working Provide action. Clearly labeled "Preview · sample data". BA-authed Chromium, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + list + detail + HITL + honesty label all rendered.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /browser runs/i,           // the page
  /\b(running|needs input|completed)\b/i, // the stat strip + status
  /\bsteps\b/i,              // the step trace
  /needs your input|2fa|captcha|mfa/i, // the HITL prompt
  /agent/i,                  // the per-run agent
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

// Return to an authed surface with the rail, then click the Browser Runs rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Browser Runs", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/browser-runs/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: click the "needs input" run (Download last month's invoices) → its detail opens with
// the HITL prompt → the "Provide code & resume" button works (resolves locally). Proves drill-in + HITL.
let drillInWorks = false, hitlWorks = false;
const row = page.getByRole("button", { name: "Browser run: Download last month’s invoices" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Browser run: Download last month’s invoices"]').count().then((c) => c > 0).catch(() => false);
  const provide = page.getByRole("button", { name: /Provide code & resume/ }).first();
  if (await provide.count().then((c) => c > 0).catch(() => false)) {
    await provide.click().catch(() => {});
    await page.waitForTimeout(400);
    const body2 = await page.evaluate(() => document.body.innerText);
    hitlWorks = /resuming the run/i.test(body2);
  }
}

await page.screenshot({ path: "scripts/.browser-runs-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, drillInWorks, hitlWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Browser Runs reachable from the sidebar rail", "no Browser Runs rail link (nav wiring missing)");
check(onPath, "Browser Runs rail click → /browser-runs", "rail click did not reach /browser-runs");
check(renders, "Browser Runs content renders (stats + list + detail + steps + HITL + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Run click opens its trace (invoices run)", "detail did not open for the invoices run");
check(hitlWorks, "HITL Provide resolves locally (resuming the run)", "HITL provide did not confirm");
check(errors.length === 0, "0 console errors on /browser-runs", `${errors.length} console errors`);
console.log(ok ? "✅ BROWSER-RUNS GREEN" : "❌ browser-runs check failed");
process.exit(ok ? 0 : 1);
