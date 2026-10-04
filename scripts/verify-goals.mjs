#!/usr/bin/env node
/**
 * WS-DEMO: the /goals demo surface renders + is reachable via the SIDEBAR (the real-user path, which
 * also proves the nav wiring). BA-authed real Chromium, PROD. Clicks the "Goals" rail link, asserts
 * the demo content (coming-soon + the outcome composer + an example goal) + 0 console errors.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

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
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(800);

// Real-user path: click the Goals rail link (proves the Sidebar wiring), not page.goto.
const railGoals = page.getByRole("link", { name: "Goals", exact: true }).first();
const reachable = await railGoals.count().then((c) => c > 0).catch(() => false);
if (reachable) { await railGoals.click().catch(() => {}); await page.waitForTimeout(1200); }

const onGoals = /\/goals/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const hasComingSoon = /coming soon/i.test(body);
const hasComposer = /describe an outcome|set goal|new goal/i.test(body);
const hasExample = /opportunities · .* tasks|% complete/i.test(body);
await page.screenshot({ path: "scripts/.goals-proof.png" });
await browser.close();

console.log(JSON.stringify({ reachableFromRail: reachable, onGoals, hasComingSoon, hasComposer, hasExample, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Goals is reachable from the sidebar rail", "no Goals link in the sidebar — nav wiring missing");
check(onGoals, "clicking Goals navigates to /goals", `did not reach /goals (${page.url().replace(APEX, "")})`);
check(hasComingSoon && hasComposer && hasExample, "the Goals demo renders (coming-soon + outcome composer + example goal)", "Goals demo content missing (blank/partial render)");
check(errors.length === 0, "0 console errors on /goals", `${errors.length} console errors`);
console.log(ok ? "✅ GOALS GREEN" : "❌ goals check failed");
process.exit(ok ? 0 : 1);
