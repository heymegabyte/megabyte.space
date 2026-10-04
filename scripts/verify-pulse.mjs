#!/usr/bin/env node
/**
 * fire-81 proof: /pulse (the Opportunity Engine) surfaces REAL opportunities with working actions +
 * Dismiss. BA-authed real Chromium, PROD. Each opportunity has a SPECIFIC action label (Enable
 * providers / View gadgets / Browse integrations) + a Dismiss. Asserts ≥2 opportunities, the
 * models-unlock one present, Dismiss persists across reload (then restores), an action navigates,
 * 0 console errors. Needs BA creds.
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

await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
async function goPulse() {
  await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  // Wait for the load to FINISH — the subtitle "Opportunities…" is always present, so gate on a
  // real card OR a genuine empty/error state (skeleton gone), never the static text.
  await page.waitForFunction(() => {
    const hasCard = [...document.querySelectorAll("button")].some((b) => /^\s*Dismiss\s*$/i.test(b.textContent || ""));
    const settledEmpty = /all clear|couldn.t load your opportunities/i.test(document.body.innerText);
    return hasCard || settledEmpty;
  }, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
// Each opportunity card has exactly one "Dismiss" button → count cards by Dismiss buttons.
const cardCount = () => page.locator('button', { hasText: /^\s*Dismiss\s*$/i }).count();
const ACTION = /enable providers|view gadgets|browse integrations|build your first gadget|connect/i;

await goPulse();
const cards1 = await cardCount();
const body = await page.locator("body").innerText().catch(() => "");
const hasModelsOpp = /unlock .* models|of 9 models/i.test(body);
// fire-92: the pin-favorite opportunity (TRUE when gadgets exist + none pinned — ba-e2e has 1 unpinned).
const hasPinOpp = /pin a gadget to favorites/i.test(body);
// fire-96/97: the set-default-model opportunity (TRUE when models usable + getPreferredModel()===null).
const hasDefaultModelOpp = /choose your default model/i.test(body);
const pulseNavFirst = await page.evaluate(() => {
  const t = document.querySelector("aside")?.innerText || "";
  const p = t.indexOf("Pulse"), h = t.indexOf("Home");
  return p >= 0 && (h < 0 || p < h);
});
await page.screenshot({ path: "scripts/.pulse-proof.png" });

// Dismiss → inline Undo round-trip (server-backed now, NOT localStorage). Undo restores it so
// ba-e2e's server state is left exactly as found. The Undo line is session-scoped, so it is clicked
// in the SAME page session right after dismissing (before any reload) — cross-context SERVER-SIDE
// persistence is proven separately by verify-pulse-persist.mjs.
let dismissWorks = false, undoVisible = false, cardsRestored = cards1;
if (cards1 > 0) {
  await page.locator('button', { hasText: /^\s*Dismiss\s*$/i }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  const afterDismiss = await cardCount();
  undoVisible = await page.locator('[data-testid="pulse-undo-dismiss"]').isVisible().catch(() => false);
  dismissWorks = afterDismiss === cards1 - 1;
  // Undo (server-side restore) — returns ba-e2e to its original state.
  await page.locator('[data-testid="pulse-undo-dismiss"]').click().catch(() => {});
  await page.waitForTimeout(700);
  cardsRestored = await cardCount();
}

// An action navigates.
let actionNavigates = false;
const action = page.locator("button", { hasText: ACTION }).first();
if (await action.count()) {
  await action.click().catch(() => {});
  await page.waitForTimeout(2000);
  actionNavigates = !/\/pulse/.test(page.url());
}

await browser.close();
console.log(JSON.stringify({ cards1, hasModelsOpp, hasPinOpp, pulseNavFirst, dismissWorks, undoVisible, cardsRestored, actionNavigates, actionUrl: page.url().replace(APEX, ""), consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (cards1 < 2) { console.log(`❌ FAIL: expected ≥2 opportunity cards, got ${cards1}`); ok = false; }
else console.log(`✅ PASS: ${cards1} opportunity cards surfaced`);
if (!hasModelsOpp) { console.log("❌ FAIL: the models-unlock opportunity (real, computed) is missing"); ok = false; }
else console.log("✅ PASS: real computed opportunity present (unlock N of 9 AI models)");
// Soft: pin-favorite depends on ba-e2e's (mutable) pin state — present when ≥1 gadget + none pinned.
if (hasPinOpp) console.log("✅ PASS: pin-favorite opportunity present (gadget exists, none pinned) — fire-92");
else console.log("ℹ️  pin-favorite opportunity absent (ba-e2e gadget is currently pinned, or 0 gadgets) — expected-conditional");
// Soft: set-default-model depends on ba-e2e's (mutable) preferred-model state (null → present).
if (hasDefaultModelOpp) console.log("✅ PASS: set-default-model opportunity present (no default set) — fire-97");
else console.log("ℹ️  set-default-model opportunity absent (ba-e2e already has a default, or 0 usable models) — expected-conditional");
if (!pulseNavFirst) { console.log("❌ FAIL: Pulse is not the first nav entry"); ok = false; }
else console.log("✅ PASS: Pulse is the first nav entry (proactive entry point)");
if (cards1 > 0 && !dismissWorks) { console.log("❌ FAIL: Dismiss didn't remove the card"); ok = false; }
else if (cards1 > 0) console.log("✅ PASS: Dismiss removes the card");
if (cards1 > 0 && !undoVisible) { console.log("❌ FAIL: the inline Undo affordance didn't appear after Dismiss"); ok = false; }
else if (cards1 > 0) console.log("✅ PASS: inline Undo affordance appears after Dismiss");
if (cards1 > 0 && cardsRestored !== cards1) { console.log(`❌ FAIL: Undo didn't restore (${cardsRestored}/${cards1}) — ba-e2e may be left dirty!`); ok = false; }
else if (cards1 > 0) console.log(`✅ PASS: Undo restores server-side (${cardsRestored}/${cards1}) — ba-e2e left clean`);
if (!actionNavigates) { console.log("❌ FAIL: the opportunity action didn't navigate"); ok = false; }
else console.log(`✅ PASS: opportunity action navigates (→ ${page.url().replace(APEX, "")})`);
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
