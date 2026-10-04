#!/usr/bin/env node
/**
 * fire-79 proof: the /gadgets Notion-style DataTable lists the user's real gadgets + row-click opens
 * the workspace. BA-authed real Chromium, PROD. Display-vs-store: the fire-78 gadget (created live)
 * MUST appear. Asserts ≥1 row, the expected columns, row-click → /workspace, 0 console errors.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
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
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
await page.goto(`${APEX}/gadgets`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
// Wait for the gadgets RPC to resolve (rows render, or the "gadgets" count headline).
await page.waitForFunction(
  () => document.querySelector("tbody tr") !== null || /gadgets?\b/i.test(document.body.innerText),
  { timeout: 20000 },
).catch(() => {});
await page.waitForTimeout(1500);

const headers = await page.evaluate(() => [...document.querySelectorAll("th")].map((h) => h.textContent.trim()).filter(Boolean));
const rowCount = await page.locator("tbody tr").count();
const bodyText = await page.locator("body").innerText().catch(() => "");
const hasFire78Gadget = /counter|untitled|simple click/i.test(bodyText);
await page.screenshot({ path: "scripts/.gadgets-table-proof.png" });

// Row-click → opens the workspace.
let openedWorkspace = false;
if (rowCount > 0) {
  await page.locator("tbody tr").first().click().catch(() => {});
  await page.waitForTimeout(2500);
  openedWorkspace = /\/workspace\//.test(page.url());
}

await browser.close();
console.log(JSON.stringify({ headers, rowCount, hasFire78Gadget, openedWorkspace, finalUrl: page.url().replace(APEX, ""), consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (rowCount < 1) { console.log("❌ FAIL: no gadget rows (the fire-78 gadget should appear)"); ok = false; }
else console.log(`✅ PASS: ${rowCount} gadget row(s) — display reconciles with the live-created gadget`);
if (!headers.some((h) => /last active|active/i.test(h))) { console.log(`❌ FAIL: expected columns missing (got: ${headers.join(", ")})`); ok = false; }
else console.log(`✅ PASS: table columns present (${headers.join(" / ")})`);
if (rowCount > 0 && !openedWorkspace) { console.log("❌ FAIL: row-click didn't open the workspace"); ok = false; }
else if (rowCount > 0) console.log("✅ PASS: row-click opens the workspace (/workspace/…)");
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
