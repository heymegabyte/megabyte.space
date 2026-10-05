#!/usr/bin/env node
/**
 * WS-DEMO: the /forms surface (lead capture — submissions scored into leads, spam filtered). Reachable
 * via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + forms list + the
 * selected form's submissions (lead tiers + spam flags). The SIGNATURE behavior is interactive:
 * clicking a form opens its submissions (form → `aside[aria-label="Form: <name>"]`). Clearly labeled
 * "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + list + submissions + honesty label all rendered.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /\bforms\b/i,              // the page
  /\b(submissions|hot leads|spam blocked)\b/i, // the stat strip
  /recent submissions/i,     // the submissions section
  /\bspam\b/i,               // the spam flag
  /\b(hot|warm|cold)\b/i,    // the lead tiers
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

// Return to an authed surface with the rail, then click the Forms rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Forms", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/forms/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: detail defaults to the first form (Demo request); clicking "Contact us" must switch
// the submissions panel to it (proves the form → submissions drill-in, the signature).
const detailBefore = await page.locator('aside[aria-label="Form: Demo request"]').count().catch(() => 0);
let detailSwitched = false;
const row = page.getByRole("button", { name: "Form: Contact us" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  detailSwitched = await page.locator('aside[aria-label="Form: Contact us"]').count().then((c) => c > 0).catch(() => false);
}
const drillInWorks = detailBefore > 0 && detailSwitched;

await page.screenshot({ path: "scripts/.forms-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, detailBefore, detailSwitched, drillInWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Forms reachable from the sidebar rail", "no Forms rail link (nav wiring missing)");
check(onPath, "Forms rail click → /forms", "rail click did not reach /forms");
check(renders, "Forms content renders (stats + list + submissions + tiers + spam + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Form click opens its submissions (Demo request → Contact us)", `detail did not switch (before=${detailBefore}, switched=${detailSwitched})`);
check(errors.length === 0, "0 console errors on /forms", `${errors.length} console errors`);
console.log(ok ? "✅ FORMS GREEN" : "❌ forms check failed");
process.exit(ok ? 0 : 1);
