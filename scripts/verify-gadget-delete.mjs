#!/usr/bin/env node
/**
 * fire-99 proof: the /gadgets row DELETE affordance + confirm dialog. BA-authed real Chromium, PROD.
 * SAFE by design — it exercises the trash button → DeleteConfirmationDialog → CANCEL path on
 * ba-e2e's real gadget, asserting NO deletion occurs (row count unchanged). The actual commit
 * (confirm → openGadget().deleteSelf()) REUSES GadgetList's proven handler verbatim, so this never
 * risks ba-e2e's only gadget. Asserts: trash opens the dialog with the gadget title + "Delete
 * workspace" confirm, Cancel closes it + the gadget survives, 0 console errors. Needs BA creds.
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
await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector('button[aria-label^="Delete "]', { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1000);

const deleteBtns = () => page.locator('button[aria-label^="Delete "]');
const rowsBefore = await deleteBtns().count();
const firstTitle = (await page.getByRole("link", { name: /^Open / }).first().getAttribute("aria-label").catch(() => "") || "").replace(/^Open /, "").trim();

// 1. Trash → confirm dialog opens.
let dialogOpened = false, dialogShowsTitle = false, hasDangerConfirm = false;
if (rowsBefore > 0) {
  await deleteBtns().first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  const dialog = page.getByRole("dialog");
  dialogOpened = await dialog.isVisible().catch(() => false);
  if (dialogOpened) {
    const dtext = await dialog.innerText().catch(() => "");
    dialogShowsTitle = /delete workspace\?/i.test(dtext) && (firstTitle ? dtext.includes(firstTitle) : true);
    hasDangerConfirm = await page.getByRole("button", { name: /^Delete workspace$/i }).isVisible().catch(() => false);
  }
}

// 2. Cancel → dialog closes, gadget SURVIVES (no deletion).
await page.getByRole("button", { name: /^Cancel$/i }).first().click({ timeout: 6000 }).catch(() => {});
await page.waitForTimeout(600);
const dialogClosed = !(await page.getByRole("dialog").isVisible().catch(() => false));
// Reload to confirm the gadget is genuinely still there (display-vs-store).
await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector('button[aria-label^="Delete "]', { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1000);
const rowsAfter = await deleteBtns().count();

await page.screenshot({ path: "scripts/.delete-proof.png" });
await browser.close();

console.log(JSON.stringify({ rowsBefore, firstTitle, dialogOpened, dialogShowsTitle, hasDangerConfirm, dialogClosed, rowsAfter, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(rowsBefore > 0, `the table has ${rowsBefore} row(s) with a Delete affordance`, "no Delete affordance on the rows");
check(dialogOpened, "trash opens the confirm dialog", "trash didn't open a confirm dialog");
check(dialogShowsTitle, 'dialog says "Delete workspace?" + names the gadget', "dialog missing the title/gadget name");
check(hasDangerConfirm, 'dialog has the "Delete workspace" (danger) confirm', "no danger confirm button");
check(dialogClosed, "Cancel closes the dialog", "Cancel didn't close the dialog");
check(rowsAfter === rowsBefore, `Cancel did NOT delete — ${rowsAfter}/${rowsBefore} rows survive (ba-e2e safe)`, `row count changed after Cancel (${rowsBefore}→${rowsAfter}) — a gadget may have been deleted!`);
check(errors.length === 0, "0 console errors", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
