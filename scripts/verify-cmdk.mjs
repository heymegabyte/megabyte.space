#!/usr/bin/env node
/**
 * fire-82 proof: the ⌘K Command Palette reaches EVERY primary surface the Sidebar does (the
 * Raycast universal-command principle). BA-authed real Chromium, PROD. Opens ⌘K, asserts the
 * empty-state Actions list contains all primary destinations incl. the recently-shipped
 * Pulse / Models / Gadgets (+ the previously-missing Outputs / Explore and the fixed Blueprints),
 * that typing filters, that the flag-gated Models + Gadgets commands NAVIGATE, and 0 console errors.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const DIALOG = '[role="dialog"][aria-label="Command palette"]';
const ROWS = `${DIALOG} button[data-index]`;
// The primary destinations ⌘K must expose (mirrors the Sidebar primary nav 1:1).
const EXPECTED = ["New workspace", "Pulse", "Workspaces", "Blueprints", "Outputs", "Explore", "Models", "Gadgets"];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// 1. BA sign-in, then land on an authed route so the AppShell (which mounts ⌘K) is present.
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1200);

// 2. Open ⌘K — try Meta+k, then Control+k, then the custom-event bus as a headless-safe fallback.
async function openPalette() {
  if (await page.locator(DIALOG).isVisible().catch(() => false)) return true;
  await page.keyboard.press("Meta+k").catch(() => {});
  if (await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) return true;
  await page.keyboard.press("Control+k").catch(() => {});
  if (await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) return true;
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("gadgets:open-command-palette")));
  return page.locator(DIALOG).waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
}
const opened = await openPalette();
await page.waitForTimeout(500);

// 3. Empty-state: collect the command labels and confirm every primary destination is present.
const rowText = async () =>
  (await page.locator(ROWS).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
const emptyLabels = opened ? await rowText() : [];
const present = Object.fromEntries(
  EXPECTED.map((d) => [d, emptyLabels.some((t) => t.toLowerCase().includes(d.toLowerCase()))]),
);
const missing = EXPECTED.filter((d) => !present[d]);
await page.screenshot({ path: "scripts/.cmdk-proof.png" });

// 4. Typing filters the list.
await page.fill(`${DIALOG} input`, "models").catch(() => {});
await page.waitForTimeout(400);
const filtered = await rowText();
const filterNarrows = opened && filtered.length > 0 && filtered.length < emptyLabels.length
  && filtered.some((t) => /models/i.test(t));

// 5. The flag-gated Models command NAVIGATES.
let modelsNavigates = false;
const modelsRow = page.locator(ROWS, { hasText: /models/i }).first();
if (await modelsRow.count()) {
  await modelsRow.click().catch(() => {});
  await page.waitForTimeout(1500);
  modelsNavigates = /\/models/.test(page.url());
}

// 6. The flag-gated Gadgets command NAVIGATES (reopen, filter, click).
let gadgetsNavigates = false;
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1000);
if (await openPalette()) {
  await page.fill(`${DIALOG} input`, "gadgets").catch(() => {});
  await page.waitForTimeout(400);
  const gRow = page.locator(ROWS, { hasText: /gadgets/i }).first();
  if (await gRow.count()) {
    await gRow.click().catch(() => {});
    await page.waitForTimeout(1500);
    gadgetsNavigates = /\/gadgets/.test(page.url());
  }
}

await browser.close();
console.log(JSON.stringify({
  opened, emptyCount: emptyLabels.length, present, missing,
  filteredCount: filtered.length, filterNarrows, modelsNavigates, gadgetsNavigates,
  consoleErrors: errors.length,
}, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (!opened) { console.log("❌ FAIL: ⌘K palette did not open"); ok = false; }
else console.log("✅ PASS: ⌘K palette opens");
if (missing.length) { console.log(`❌ FAIL: palette missing destinations: ${missing.join(", ")}`); ok = false; }
else console.log(`✅ PASS: all ${EXPECTED.length} primary destinations reachable in ⌘K (incl. Pulse/Models/Gadgets/Outputs/Explore)`);
if (!filterNarrows) { console.log("❌ FAIL: typing did not filter the command list"); ok = false; }
else console.log(`✅ PASS: typing filters (${emptyLabels.length} → ${filtered.length})`);
if (!modelsNavigates) { console.log("❌ FAIL: Models command did not navigate to /models"); ok = false; }
else console.log("✅ PASS: Models command navigates → /models");
if (!gadgetsNavigates) { console.log("❌ FAIL: Gadgets command did not navigate to /gadgets"); ok = false; }
else console.log("✅ PASS: Gadgets command navigates → /gadgets");
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
