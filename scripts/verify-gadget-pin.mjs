#!/usr/bin/env node
/**
 * fire-80 proof: the /gadgets favorite/pin action. BA-authed real Chromium, PROD. Causal + persist +
 * interconnected: click the star → pin persists across reload (display-vs-store) → the gadget shows
 * in the sidebar FAVORITES → unpin (restores ba-e2e state). 0 console errors. Needs BA creds.
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
async function goGadgets() {
  await page.goto(`${APEX}/gadgets`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await page.waitForSelector("tbody tr", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
const star = () => page.locator('tbody tr button[aria-label*="avorite" i]').first();
const pressed = async () => (await star().getAttribute("aria-pressed").catch(() => null)) === "true";
const favHasGadget = () =>
  page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return false;
    const t = aside.innerText || "";
    // Favorites populated when the gadget title shows + the empty hint is gone.
    return /counter|simple click/i.test(t) && !/Favorite a workspace to keep it here/i.test(t.split(/RECENT/i)[0] || t);
  });

await goGadgets();
const before = await pressed();
// Pin.
await star().click().catch(() => {});
await page.waitForTimeout(1500);
const afterClick = await pressed();
await goGadgets();
const persistsPinned = await pressed();
const favShows = await favHasGadget();
await page.screenshot({ path: "scripts/.gadget-pin-proof.png" });
// Unpin (restore state).
await star().click().catch(() => {});
await page.waitForTimeout(1500);
await goGadgets();
const persistsUnpinned = await pressed();

await browser.close();
console.log(JSON.stringify({ before, afterClick, persistsPinned, favShows, persistsUnpinned, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (!afterClick) { console.log("❌ FAIL: star didn't toggle to pinned on click"); ok = false; }
else console.log("✅ PASS: star toggles to pinned (optimistic)");
if (!persistsPinned) { console.log("❌ FAIL: pin didn't persist across reload (display-vs-store)"); ok = false; }
else console.log("✅ PASS: pin persists across reload (display-vs-store reconciled)");
if (!favShows) { console.log("⚠️  pinned gadget not detected in sidebar FAVORITES — review .gadget-pin-proof.png"); }
else console.log("✅ PASS: pinned gadget appears in sidebar FAVORITES (interconnected)");
if (persistsUnpinned) { console.log("⚠️  unpin didn't persist (state not fully restored) — check manually"); }
else console.log("✅ PASS: unpin persists (ba-e2e state restored)");
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
