#!/usr/bin/env node
/**
 * WS-DEMO: the /audit surface (site/gadget quality audit — a11y · SEO · perf · best-practices scores +
 * findings). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip
 * + targets list + the selected target's category scores + findings. The SIGNATURE behavior is
 * interactive: clicking a target opens its breakdown, and "Re-run audit" kicks a fresh pass. Clearly
 * labeled "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + targets + category scores + findings + honesty label.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /\baudit\b/i,              // the page
  /\b(avg score|open issues)\b/i, // the stat strip
  /accessibility|best practices/i, // the category breakdown
  /findings/i,               // the findings section
  /\b(pass|warn|fail)\b/i,   // finding statuses
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

// Return to an authed surface with the rail, then click the Audit rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Audit", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/audit/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: detail defaults to Marketing Site; clicking "Click Counter" switches the breakdown,
// and its "Re-run audit" button flips to "Re-running…". Proves both the drill-in AND the re-run.
const detailBefore = await page.locator('aside[aria-label="Audit: Marketing Site"]').count().catch(() => 0);
let detailSwitched = false, rerunWorks = false;
const row = page.getByRole("button", { name: "Audit: Click Counter" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  detailSwitched = await page.locator('aside[aria-label="Audit: Click Counter"]').count().then((c) => c > 0).catch(() => false);
  const rerunBtn = page.getByRole("button", { name: /Re-run audit/ }).first();
  if (await rerunBtn.count().then((c) => c > 0).catch(() => false)) {
    await rerunBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const body2 = await page.evaluate(() => document.body.innerText);
    rerunWorks = /re-running/i.test(body2);
  }
}
const drillInWorks = detailBefore > 0 && detailSwitched;

await page.screenshot({ path: "scripts/.audit-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, drillInWorks, rerunWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Audit reachable from the sidebar rail", "no Audit rail link (nav wiring missing)");
check(onPath, "Audit rail click → /audit", "rail click did not reach /audit");
check(renders, "Audit content renders (stats + targets + category scores + findings + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Target click opens its breakdown (Marketing Site → Click Counter)", "detail did not switch");
check(rerunWorks, "Re-run audit kicks a fresh pass (Re-running…)", "re-run did not confirm");
check(errors.length === 0, "0 console errors on /audit", `${errors.length} console errors`);
console.log(ok ? "✅ AUDIT GREEN" : "❌ audit check failed");
process.exit(ok ? 0 : 1);
