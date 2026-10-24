#!/usr/bin/env node
/**
 * Proof that Home > "Add resource" lists the wired gatekeeper integrations. BA-authed real Chromium,
 * PROD, READ-ONLY (opens the "Create New Connection" modal, reads the vendor list, never connects).
 *
 * The picker = authenticatedApi.listGatekeeperVendors() = every GATEKEEPER_* service bound in the
 * backend (deploy.ts EXTRA_GATEKEEPERS). Asserts GitHub now lists (the first wired external gatekeeper),
 * alongside the built-in AI Model / Agent, with 0 console errors. Needs BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }
// Space-separated vendor substrings expected in the picker (default: github). Override with EXPECT.
const EXPECT = (process.env.EXPECT || "github").split(/\s+/).filter(Boolean);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});

await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("textarea", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1200);

const addBtn = page.locator('[aria-label="Add resource"]').first();
const addPresent = await addBtn.count() > 0;
let items = [], dialogText = "";
if (addPresent) {
  await addBtn.click().catch(() => {});
  await page.waitForTimeout(1500);
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.count() > 0) {
    dialogText = (await dialog.innerText().catch(() => "")) || "";
    items = (await dialog.locator('button, [role="option"], li, a').allInnerTexts().catch(() => []))
      .map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  }
  await page.keyboard.press("Escape").catch(() => {});
}
const hay = (dialogText + " " + items.join(" | ")).toLowerCase();
const found = EXPECT.filter((e) => hay.includes(e.toLowerCase()));

await page.screenshot({ path: "scripts/.add-resource-proof.png" });
await browser.close();

console.log(JSON.stringify({ addPresent, itemCount: items.length, items: items.slice(0, 30), expected: EXPECT, found, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(addPresent, "the Add resource trigger renders", "no Add resource button");
check(items.length > 0, `the connection picker lists vendors (${items.length})`, "the picker listed nothing");
for (const e of EXPECT)
  check(hay.includes(e.toLowerCase()), `"${e}" is listed in Add resource`, `"${e}" is NOT listed`);
check(errors.length === 0, "0 console errors", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
