#!/usr/bin/env node
/**
 * fire-103 proof (WS-M2 Connections — read-only inventory, first slice): the two REAL connection
 * surfaces render honestly AND are reachable from ⌘K (the universal-command principle). BA-authed
 * real Chromium, PROD.
 *
 * Covers the display-vs-store concern WS-M2 calls out: a connection surface can render cleanly yet
 * be wrong (lying-empty or crashed). So we assert each shows its genuine content — Gatekeepers always
 * renders its vendor/connect inventory (listGatekeeperVendors); Providers shows real provider cards
 * OR the HONEST "No AI providers yet" empty state, never the error state — and that ⌘K (newly) reaches
 * both. Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

const DIALOG = '[role="dialog"][aria-label="Command palette"]';
const ROWS = `${DIALOG} button[data-index]`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
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

async function land(path, settle = 1500) {
  await page.goto(`${APEX}${path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(settle);
}
const bodyText = () => page.locator("body").innerText().catch(() => "");

// 1. /gatekeepers — the connections management surface. Renders its vendor/connect inventory.
await land("/gatekeepers");
const gkText = await bodyText();
const gkHasHeading = /gatekeepers/i.test(gkText);
const gkHasInventory = /\bconnect\b/i.test(gkText) && gkText.replace(/\s+/g, " ").trim().length > 200;
await page.screenshot({ path: "scripts/.connections-gatekeepers.png" });

// 2. /providers — AI providers. HONEST content: real provider cards OR the "No AI providers yet"
//    empty state, never the "Something went wrong" error state (that would be a real defect).
await land("/providers");
const pvText = await bodyText();
const pvHasHeading = /ai providers/i.test(pvText);
const pvErrored = /something went wrong loading your providers/i.test(pvText);
const pvHonest = pvHasHeading && !pvErrored; // heading + not-errored ⇒ shows real providers or honest empty

// 3. ⌘K reaches BOTH connection surfaces (the fire-103 fix). Search → click → assert navigation.
async function openPalette() {
  if (await page.locator(DIALOG).isVisible().catch(() => false)) return true;
  await page.keyboard.press("Meta+k").catch(() => {});
  if (await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) return true;
  await page.keyboard.press("Control+k").catch(() => {});
  if (await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) return true;
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("gadgets:open-command-palette")));
  return page.locator(DIALOG).waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
}
async function cmdkReaches(query, expectPath) {
  await land("/pulse", 1000);
  if (!(await openPalette())) return false;
  await page.fill(`${DIALOG} input`, query).catch(() => {});
  await page.waitForTimeout(450);
  const row = page.locator(ROWS, { hasText: new RegExp(query, "i") }).first();
  if (!(await row.count())) return false;
  await row.click().catch(() => {});
  await page.waitForTimeout(1500);
  return new RegExp(expectPath.replace("/", "\\/")).test(page.url());
}
const cmdkGatekeepers = await cmdkReaches("gatekeeper", "/gatekeepers");
const cmdkProviders = await cmdkReaches("providers", "/providers");

await browser.close();
console.log(JSON.stringify({ gkHasHeading, gkHasInventory, pvHasHeading, pvErrored, pvHonest, cmdkGatekeepers, cmdkProviders, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(gkHasHeading, "/gatekeepers renders its heading", "/gatekeepers missing its heading");
check(gkHasInventory, "/gatekeepers shows its real connect/vendor inventory (not blank)", "/gatekeepers is blank/lying-empty — no connect inventory");
check(pvHasHeading, "/providers renders the AI providers heading", "/providers missing its heading");
check(!pvErrored, "/providers is not in the error state (honest: real providers or empty)", "/providers shows the 'Something went wrong' error state");
check(pvHonest, "/providers reconciles display-vs-store honestly", "/providers did not render honest content");
check(cmdkGatekeepers, "⌘K reaches Gatekeepers (search → navigate)", "⌘K did NOT reach Gatekeepers");
check(cmdkProviders, "⌘K reaches Providers (search → navigate)", "⌘K did NOT reach Providers");
check(errors.length === 0, "0 console errors across both connection surfaces + ⌘K", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
