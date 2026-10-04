#!/usr/bin/env node
/**
 * fire-75 proof: /models availability + set-default. BA-authed real Chromium, PROD. Asserts:
 * ≥1 "Available" badge (honest); an AVAILABLE model's dialog offers set-default (or shows it's the
 * current default); an UNAVAILABLE model's dialog shows NO set control (no doomed control); setting
 * a default persists across reload (display-vs-store); 0 console errors. Needs BA creds.
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
async function goModels() {
  await page.goto(`${APEX}/models`, { waitUntil: "networkidle", timeout: 30000 });
  // Wait for the authed shell to finish booting + the catalog table to render.
  await page.waitForSelector("tbody tr", { timeout: 25000 }).catch(() => {});
  // Then wait for the availability RPC (listModels/getPreferredModel) to resolve — the headline
  // gains "enabled in this workspace" once availabilityLoaded. Fail-soft so a genuine 0 still asserts.
  await page.waitForFunction(
    () => /enabled in this workspace/i.test(document.body.innerText),
    { timeout: 20000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
}
await goModels();

const availableBadges = await page.getByText(/^Available$/).count();

// Open an AVAILABLE model (Cloudflare = "Workers AI").
const availRow = page.locator('tbody tr', { hasText: /Workers AI/ }).first();
await availRow.click();
await page.waitForTimeout(600);
let dlg = page.locator('[role="dialog"]').first();
let dlgText = await dlg.innerText().catch(() => "");
const setBtn = page.locator('button', { hasText: /Set as default model/i }).first();
const hasSet = await setBtn.count() > 0;
const isAlreadyDefault = /current default/i.test(dlgText);
let setConfirmed = false;
if (hasSet) {
  await setBtn.click();
  await page.waitForTimeout(900);
  setConfirmed = /your default|current default/i.test(await dlg.innerText().catch(() => ""));
}
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// Open an UNAVAILABLE model (Anthropic) → must NOT offer a set control.
const unavailRow = page.locator('tbody tr', { hasText: /Anthropic/ }).first();
await unavailRow.click();
await page.waitForTimeout(600);
dlg = page.locator('[role="dialog"]').first();
const unavailText = await dlg.innerText().catch(() => "");
const unavailHasSetBtn = await page.locator('button', { hasText: /Set as default model/i }).count() > 0;
const unavailSaysNotEnabled = /not enabled/i.test(unavailText);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// Reload → the Default badge must persist (display-vs-store).
await goModels();
const defaultBadges = await page.getByText(/^Default$/).count();

await page.screenshot({ path: "scripts/.models-default-proof.png" });
await browser.close();

console.log(JSON.stringify({ availableBadges, hasSet, isAlreadyDefault, setConfirmed, unavailHasSetBtn, unavailSaysNotEnabled, defaultBadgesAfterReload: defaultBadges, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (availableBadges < 1) { console.log("❌ FAIL: no 'Available' badge (availability not working)"); ok = false; }
else console.log(`✅ PASS: ${availableBadges} 'Available' badge(s) (honest availability)`);
if (!(hasSet || isAlreadyDefault)) { console.log("❌ FAIL: available model offered no set-default / current-default"); ok = false; }
else console.log(`✅ PASS: available model has the default action (${isAlreadyDefault ? "already default" : "set-default"})`);
if (unavailHasSetBtn) { console.log("❌ FAIL: unavailable model showed a doomed set-default button"); ok = false; }
else console.log(`✅ PASS: unavailable model has NO set control${unavailSaysNotEnabled ? " (+ 'not enabled' line)" : ""}`);
if (defaultBadges < 1) { console.log("❌ FAIL: no 'Default' badge after reload (not persisted)"); ok = false; }
else console.log(`✅ PASS: 'Default' badge persists after reload (display-vs-store reconciled)`);
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
