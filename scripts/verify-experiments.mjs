#!/usr/bin/env node
/**
 * WS-DEMO: the /experiments surface (A/B testing — run variants, measure lift, ship the winner).
 * Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip +
 * experiment list + the selected experiment's variant breakdown. The SIGNATURE behavior is
 * interactive: clicking an experiment opens its variants, and a settled "winner" exposes a working
 * "Ship the winner" action. Clearly labeled "Preview · sample data". BA-authed Chromium, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + list + variant breakdown + honesty label all rendered.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /experiments/i,            // the page
  /\b(running|winners?)\b/i, // the stat strip + status
  /control/i,                // the variant breakdown (control chip)
  /vs control/i,             // the lift metric
  /goal/i,                   // the per-experiment goal
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

// Return to an authed surface with the rail, then click the Experiments rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Experiments", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/experiments/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: click the "Hero headline" (winner) experiment → its detail opens → its "Ship the
// winner" button works (resolves locally). Proves both the drill-in AND the ship-winner action.
let drillInWorks = false, shipWorks = false;
const row = page.getByRole("button", { name: "Experiment: Hero headline" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Experiment: Hero headline"]').count().then((c) => c > 0).catch(() => false);
  const ship = page.getByRole("button", { name: /Ship the winner/ }).first();
  if (await ship.count().then((c) => c > 0).catch(() => false)) {
    await ship.click().catch(() => {});
    await page.waitForTimeout(400);
    const body2 = await page.evaluate(() => document.body.innerText);
    shipWorks = /shipped .* to 100% of traffic/i.test(body2);
  }
}

await page.screenshot({ path: "scripts/.experiments-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, drillInWorks, shipWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Experiments reachable from the sidebar rail", "no Experiments rail link (nav wiring missing)");
check(onPath, "Experiments rail click → /experiments", "rail click did not reach /experiments");
check(renders, "Experiments content renders (stats + list + variant breakdown + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Experiment click opens its variant breakdown (Hero headline)", "detail did not open for Hero headline");
check(shipWorks, "Ship-the-winner resolves locally (shipped to 100%)", "ship-winner did not confirm");
check(errors.length === 0, "0 console errors on /experiments", `${errors.length} console errors`);
console.log(ok ? "✅ EXPERIMENTS GREEN" : "❌ experiments check failed");
process.exit(ok ? 0 : 1);
