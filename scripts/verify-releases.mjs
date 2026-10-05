#!/usr/bin/env node
/**
 * WS-DEMO: the /releases surface (deploy history — versioned builds with promote/rollback). Reachable
 * via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + release list +
 * the selected-release detail (changes manifest + action). The SIGNATURE behavior is interactive:
 * clicking a release opens its detail, and a rollback-eligible release exposes a working "Roll back"
 * that resolves locally. Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + list + detail + honesty label all rendered.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /\breleases\b/i,           // the page
  /\b(deployments|live|success rate)\b/i, // the stat strip
  /\bchanges\b/i,            // the changes manifest in the detail
  /rolled back|superseded|building/i, // the release statuses
  /production|preview/i,     // the env labels
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

// Return to an authed surface with the rail, then click the Releases rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Releases", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/releases/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: click the superseded v22 release → its detail opens → its "Roll back" button works
// (resolves locally to a "now live" confirmation). Proves both the drill-in AND the rollback action.
let drillInWorks = false, rollbackWorks = false;
const row = page.getByRole("button", { name: /Release v22 of Marketing Site/ }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Release v22"]').count().then((c) => c > 0).catch(() => false);
  const rollbackBtn = page.getByRole("button", { name: /Roll back to this version/ }).first();
  if (await rollbackBtn.count().then((c) => c > 0).catch(() => false)) {
    await rollbackBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const body2 = await page.evaluate(() => document.body.innerText);
    rollbackWorks = /is now live/i.test(body2);
  }
}

await page.screenshot({ path: "scripts/.releases-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, drillInWorks, rollbackWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Releases reachable from the sidebar rail", "no Releases rail link (nav wiring missing)");
check(onPath, "Releases rail click → /releases", "rail click did not reach /releases");
check(renders, "Releases content renders (stats + list + detail + changes + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Release click opens its detail (v22)", "detail did not open for v22");
check(rollbackWorks, "Roll back resolves locally (v22 now live)", "rollback did not confirm");
check(errors.length === 0, "0 console errors on /releases", `${errors.length} console errors`);
console.log(ok ? "✅ RELEASES GREEN" : "❌ releases check failed");
process.exit(ok ? 0 : 1);
