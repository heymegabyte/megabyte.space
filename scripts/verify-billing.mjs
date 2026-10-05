#!/usr/bin/env node
/**
 * WS-DEMO: the /billing surface (cost/usage — the "governance everywhere" characteristic). A HYBRID:
 * a LIVE "Usage today" card (real getCloudflareUsage, marked "Live") + a SAMPLE per-gadget cost
 * breakdown + 14-day spend trend. Reachable via the SIDEBAR rail (real-user path, proves nav wiring);
 * renders both the live card + the sample sections. BA-authed real Chromium, PROD. Needs BA creds.
 *
 * Render-based (a dashboard, not a drill-in): asserts the STABLE structure (the Live card + the
 * labeled sample sections) — NOT the live usage NUMBERS, which vary by account state (per the
 * "don't assert mutable state" lesson).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the live card + the sample sections + honesty labels all rendered.
const NEEDLES = [
  /\bbilling\b/i,          // the page
  /usage today/i,          // the LIVE usage card
  /\blive\b/i,             // the "Live" chip marking the real card
  /cost by gadget/i,       // the sample cost breakdown
  /sample data/i,          // the honesty label on the sample sections
  /daily spend/i,          // the sample spend-trend chart
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

// Return to an authed surface with the rail, then click the Billing rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Billing", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1500); }
const onPath = /\/billing/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

await page.screenshot({ path: "scripts/.billing-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Billing reachable from the sidebar rail", "no Billing rail link (nav wiring missing)");
check(onPath, "Billing rail click → /billing", "rail click did not reach /billing");
check(renders, "Billing renders (live usage card + sample cost breakdown + trend + honesty labels)", `content missing: ${missing.join(", ")}`);
check(errors.length === 0, "0 console errors on /billing", `${errors.length} console errors`);
console.log(ok ? "✅ BILLING GREEN" : "❌ billing check failed");
process.exit(ok ? 0 : 1);
