#!/usr/bin/env node
/**
 * fire-101 proof (WS-N1): Pulse opportunity dismissals persist SERVER-SIDE (per-user) — NOT
 * localStorage — so a dismissal syncs across devices and survives a browser-storage clear. This is
 * the display-vs-store reconciliation that render-integrity alone can't prove (per
 * verify-against-source-of-truth): dismissing in one browser and seeing it gone in a FRESH,
 * independent browser (empty storage, own cookie jar, re-authed as the same user) can only happen
 * if the store — not client storage — holds the dismissal.
 *
 * Causal + cross-context + fully REVERSIBLE (leaves ba-e2e exactly as found):
 *   1. Context A: BA-auth, /pulse, dismiss the first opportunity X (A is never reloaded, so its
 *      session-scoped inline Undo stays live for cleanup).
 *   2. Context B: a FRESH isolated context, re-authed → /pulse shows X gone  ⇒ server-side.
 *   3. Context A: click Undo → X restored; reload A → still restored  ⇒ cleanup persisted.
 *
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const browser = await chromium.launch();

async function gotoPulse(page) {
  await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  // Wait for the load to actually FINISH. The subtitle "Opportunities Megabyte found for you" is
  // always present, so text can't gate it — wait for a real card OR a genuine empty/error state
  // (i.e. the loading skeleton is gone), else cardCount() races the skeleton and reads 0.
  await page
    .waitForFunction(
      () => {
        const hasCard = [...document.querySelectorAll("button")].some((b) => /^\s*Dismiss\s*$/i.test(b.textContent || ""));
        const settledEmpty = /all clear|couldn.t load your opportunities/i.test(document.body.innerText);
        return hasCard || settledEmpty;
      },
      { timeout: 20000 },
    )
    .catch(() => {});
  await page.waitForTimeout(700);
}

/** Open a fresh, fully-isolated context (own storage + cookie jar), BA-sign-in, land on /pulse. */
async function freshPulse(label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA });
  const errors = [];
  const page = await context.newPage();
  await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${label}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${label}] ${String(e)}`));
  await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('[data-testid="auth-submit"]');
  await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  await gotoPulse(page);
  return { context, page, errors };
}

const cardCount = (page) => page.locator("button", { hasText: /^\s*Dismiss\s*$/i }).count();
const UNDO = '[data-testid="pulse-undo-dismiss"]';

// 1. Context A — dismiss the first opportunity. A is NOT reloaded, so its inline Undo stays live.
const A = await freshPulse("A");
const cardsA0 = await cardCount(A.page);
if (cardsA0 > 0) {
  await A.page.locator("button", { hasText: /^\s*Dismiss\s*$/i }).first().click().catch(() => {});
  await A.page.waitForTimeout(900);
}
const cardsA1 = await cardCount(A.page);
const undoVisible = await A.page.locator(UNDO).isVisible().catch(() => false);

// 2. Context B — FRESH, independent (empty localStorage + own cookies), re-authed as the same user.
//    If X is gone here, the dismissal came from the SERVER, not client storage.
const B = await freshPulse("B");
const cardsB = await cardCount(B.page);
await B.context.close();

// 3. Restore in A via the inline Undo (server-side) → leaves ba-e2e clean; confirm via reload.
let cardsA2 = cardsA1, cardsA3 = cardsA1;
if (undoVisible) {
  await A.page.locator(UNDO).click().catch(() => {});
  await A.page.waitForTimeout(900);
  cardsA2 = await cardCount(A.page);
  await gotoPulse(A.page);
  cardsA3 = await cardCount(A.page);
}

await A.page.screenshot({ path: "scripts/.pulse-persist-proof.png" });
const errors = [...A.errors, ...B.errors];
await A.context.close();
await browser.close();

console.log(JSON.stringify({ cardsA0, cardsA1, undoVisible, cardsB, cardsA2, cardsA3, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(cardsA0 >= 2, `context A has ${cardsA0} opportunities to work with`, `context A had <2 opportunities (${cardsA0}) — can't prove dismissal`);
check(cardsA1 === cardsA0 - 1, `Dismiss removed the card in A (${cardsA0}→${cardsA1})`, `Dismiss didn't remove the card in A (${cardsA0}→${cardsA1})`);
check(undoVisible, "the inline Undo affordance appeared after Dismiss", "no inline Undo affordance after Dismiss");
check(
  cardsB === cardsA0 - 1,
  `FRESH context B sees the dismissal — SERVER-SIDE, not localStorage (${cardsB} === ${cardsA0 - 1})`,
  `fresh context B did NOT reflect the dismissal (${cardsB} ≠ ${cardsA0 - 1}) — persistence is NOT server-side`,
);
check(cardsA2 === cardsA0, `Undo restored the card in A (${cardsA2}/${cardsA0})`, `Undo didn't restore in A (${cardsA2}/${cardsA0})`);
check(cardsA3 === cardsA0, `restore persisted across reload (${cardsA3}/${cardsA0}) — ba-e2e left clean`, `restore didn't persist (${cardsA3}/${cardsA0}) — ba-e2e may be left dirty!`);
check(errors.length === 0, "0 console errors across both contexts", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
