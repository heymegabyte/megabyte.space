#!/usr/bin/env node
/**
 * fire-73 proof: the DataTable search + provider-filter interactivity works on /models.
 * BA-authed real Chromium, PROD. Asserts: 9 rows initially; search "claude" → 3 (Anthropic);
 * provider chip "OpenAI" → 3; 0 console errors. Needs BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForTimeout(2500);
await page.goto(`${APEX}/models`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);

const rowCount = () => page.locator("tbody tr").count();
const initial = await rowCount();

// Search "claude" → Anthropic's 3 claude-* models.
const search = page.locator('input[type="search"], input[aria-label*="earch" i], input[placeholder*="earch" i]').first();
let searchCount = null;
if (await search.count()) {
  await search.fill("claude");
  await page.waitForTimeout(600);
  searchCount = await rowCount();
  await search.fill("");
  await page.waitForTimeout(400);
}

// Provider chip "OpenAI" → 3 OpenAI models.
const chip = page.locator('button', { hasText: /^OpenAI$/ }).first();
let chipCount = null;
if (await chip.count()) {
  await chip.click();
  await page.waitForTimeout(600);
  chipCount = await rowCount();
}
const chipPressed = await chip.getAttribute("aria-pressed").catch(() => null);

await page.screenshot({ path: "scripts/.models-filter-proof.png" });
await browser.close();

console.log(JSON.stringify({ initial, searchCount, chipCount, chipPressed, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (initial !== 9) { console.log(`❌ FAIL: expected 9 initial rows, got ${initial}`); ok = false; }
else console.log("✅ PASS: 9 rows initially");
if (searchCount !== 3) { console.log(`❌ FAIL: search "claude" → expected 3, got ${searchCount}`); ok = false; }
else console.log('✅ PASS: search "claude" → 3 Anthropic rows');
if (chipCount !== 3) { console.log(`❌ FAIL: OpenAI chip → expected 3, got ${chipCount}`); ok = false; }
else console.log("✅ PASS: OpenAI provider chip → 3 rows");
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
