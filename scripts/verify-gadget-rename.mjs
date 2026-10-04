#!/usr/bin/env node
/**
 * fire-96 proof: inline gadget RENAME on /gadgets. BA-authed real Chromium, PROD. Clicks the row's
 * pencil → inline input → types a new title → Enter → asserts the table shows it AND it PERSISTS
 * across reload (display-vs-store reconciled via the setTitle RPC) → then renames BACK to the
 * original (restores ba-e2e state). 0 console errors. Needs BA creds.
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

async function goGadgets() {
  await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector('button[aria-label^="Rename"]', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1000);
}
// The first row's current title (from the Open-link aria-label).
async function firstTitle() {
  const al = await page.getByRole("link", { name: /^Open / }).first().getAttribute("aria-label").catch(() => "");
  return (al || "").replace(/^Open /, "").trim();
}
async function rename(to) {
  await page.getByRole("button", { name: /^Rename / }).first().click({ timeout: 8000 });
  const input = page.getByRole("textbox", { name: /^Rename / }).first();
  await input.waitFor({ state: "visible", timeout: 6000 });
  await input.fill(to);
  await input.press("Enter");
  await page.waitForTimeout(1500);
}

await goGadgets();
const original = await firstTitle();
const NEW_TITLE = `${original} ∎96`.slice(0, 60);

// Rename → assert the table reflects it immediately.
let inputAppeared = false;
await page.getByRole("button", { name: /^Rename / }).first().click({ timeout: 8000 }).catch(() => {});
inputAppeared = await page.getByRole("textbox", { name: /^Rename / }).first().isVisible().catch(() => false);
if (inputAppeared) {
  const input = page.getByRole("textbox", { name: /^Rename / }).first();
  await input.fill(NEW_TITLE);
  await input.press("Enter");
  await page.waitForTimeout(1500);
}
const afterRename = await firstTitle();
const renamedInUi = afterRename === NEW_TITLE;

// Reload → persisted (display-vs-store)?
await goGadgets();
const afterReload = await firstTitle();
const persisted = afterReload === NEW_TITLE;

// Restore the original so ba-e2e state is unchanged.
let restored = false;
if (original) {
  await rename(original);
  await goGadgets();
  restored = (await firstTitle()) === original;
}

await browser.close();
console.log(JSON.stringify({ original, NEW_TITLE, inputAppeared, renamedInUi, persisted, afterReload, restored, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(!!original, `read the original title ("${original}")`, "couldn't read the original gadget title");
check(inputAppeared, "pencil opens an inline rename input", "pencil didn't open the rename input");
check(renamedInUi, "title updates in the table on Enter (optimistic)", `title didn't update (got "${afterRename}")`);
check(persisted, "rename PERSISTS across reload (setTitle RPC — display-vs-store)", `rename didn't persist (reload showed "${afterReload}")`);
check(restored, "original title restored (ba-e2e state unchanged)", "FAILED to restore the original title — ba-e2e state may be dirty");
check(errors.length === 0, "0 console errors", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
