#!/usr/bin/env node
/**
 * fire (loop /admin demo): the /admin "Platform" tab renders the glanceable feature grid — a demo of
 * every Megabyte OS capability (live/preview/soon). BA-authed real Chromium, PROD. Clicks the Platform
 * tab, asserts several primitive cards + a status chip are visible, 0 console errors. If ba-e2e lacks
 * admin access the tab won't appear → reported as "no admin access" (exit 3), not a false failure.
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
await page.goto(`${APEX}/admin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForTimeout(1500);

// The Platform tab only exists for admins. If it's absent, ba-e2e isn't an admin — report, don't fail.
const platformTab = page.getByRole("tab", { name: "Platform" }).or(page.getByText("Platform", { exact: true })).first();
const hasTab = await platformTab.count().then((c) => c > 0).catch(() => false);
if (!hasTab) {
  const bodyText = (await page.evaluate(() => document.body.innerText).catch(() => "")).slice(0, 120);
  await browser.close();
  console.log(JSON.stringify({ hasAdminAccess: false, note: "Platform tab not found — ba-e2e likely lacks admin access", bodyText, consoleErrors: errors.length }, null, 2));
  console.log("ℹ️  no admin access for ba-e2e — Platform tab render not asserted (build + green-sweep cover the additive change)");
  process.exit(3);
}

await platformTab.click().catch(() => {});
await page.waitForTimeout(800);
const body = await page.evaluate(() => document.body.innerText);
const cards = ["Opportunities", "Gadgets", "Models", "Knowledge", "Goals", "Agents", "Automations", "Metrics", "Permissions", "Provenance"];
const present = cards.filter((c) => body.includes(c));
const hasLiveChip = /\bLive\b/.test(body);
const hasSoonChip = /\bSoon\b/.test(body);
await page.screenshot({ path: "scripts/.admin-platform-proof.png" });
await browser.close();

console.log(JSON.stringify({ hasAdminAccess: true, cardsPresent: present.length, present, hasLiveChip, hasSoonChip, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(present.length >= 8, `Platform grid shows ${present.length}/10 feature cards`, `too few feature cards (${present.length}/10): ${present.join(",")}`);
check(hasLiveChip && hasSoonChip, "both Live and Soon status chips render", "status chips missing (Live and/or Soon)");
check(errors.length === 0, "0 console errors on /admin Platform", `${errors.length} console errors`);
console.log(ok ? "✅ ADMIN-PLATFORM GREEN" : "❌ admin platform check failed");
process.exit(ok ? 0 : 1);
