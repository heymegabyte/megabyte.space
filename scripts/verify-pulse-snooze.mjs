#!/usr/bin/env node
/**
 * fire-102 proof (WS-N1 snooze): Pulse opportunity SNOOZES persist SERVER-SIDE (per-user) — a
 * snoozed opportunity is hidden until its timer lapses, and that hidden-ness syncs across devices +
 * survives a storage clear (same store as dismissals, a `snoozedOpportunities` map on the UserDO).
 *
 * Cross-context causal + fully REVERSIBLE (leaves ba-e2e exactly as found):
 *   1. Context A: BA-auth, /pulse, Snooze the first opportunity (A is never reloaded so its
 *      session-scoped inline Undo stays live for cleanup).
 *   2. Context B: a FRESH isolated context, re-authed → /pulse shows it gone  ⇒ server-side.
 *   3. Context A: click Undo → un-snoozed; reload A → still restored  ⇒ cleanup persisted.
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
  // Wait for the load to actually FINISH (a real card OR a genuine empty/error state) — the subtitle
  // "Opportunities Megabyte found for you" is always present so text can't gate it.
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
const SNOOZE = 'button[aria-label^="Snooze"]';
const UNDO = '[data-testid="pulse-undo-dismiss"]';

// 1. Context A — snooze the first opportunity. A is NOT reloaded, so its inline Undo stays live.
const A = await freshPulse("A");
const cardsA0 = await cardCount(A.page);
if (cardsA0 > 0) {
  await A.page.locator(SNOOZE).first().click().catch(() => {});
  await A.page.waitForTimeout(900);
}
const cardsA1 = await cardCount(A.page);
const undoText = (await A.page.locator(UNDO).locator("xpath=..").innerText().catch(() => "")) || "";
const undoVisible = await A.page.locator(UNDO).isVisible().catch(() => false);
const undoSaysSnoozed = /snoozed/i.test(undoText);

// 2. Context B — FRESH, independent. If the opportunity is gone here, the snooze is SERVER-SIDE.
//    A's snooze is an optimistic fire-and-forget RPC; under load its server write can land just
//    after B's first read, so POLL (reload) until B reflects it — a propagation lag is not a false
//    RED. B is a fresh context, so if it EVER shows the reduced count that IS server-side proof.
const B = await freshPulse("B");
let cardsB = await cardCount(B.page);
for (let i = 0; i < 4 && cardsB !== cardsA0 - 1; i++) {
  await B.page.waitForTimeout(1200);
  await gotoPulse(B.page);
  cardsB = await cardCount(B.page);
}
await B.context.close();

// 3. Restore in A via the inline Undo (server-side un-snooze) → leaves ba-e2e clean; confirm via reload.
let cardsA2 = cardsA1, cardsA3 = cardsA1;
if (undoVisible) {
  await A.page.locator(UNDO).click().catch(() => {});
  await A.page.waitForTimeout(900);
  cardsA2 = await cardCount(A.page);
  await gotoPulse(A.page);
  cardsA3 = await cardCount(A.page);
}

await A.page.screenshot({ path: "scripts/.pulse-snooze-proof.png" });
const errors = [...A.errors, ...B.errors];
await A.context.close();
await browser.close();

console.log(JSON.stringify({ cardsA0, cardsA1, undoVisible, undoSaysSnoozed, cardsB, cardsA2, cardsA3, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(cardsA0 >= 2, `context A has ${cardsA0} opportunities to work with`, `context A had <2 opportunities (${cardsA0}) — can't prove snooze`);
check(cardsA1 === cardsA0 - 1, `Snooze removed the card in A (${cardsA0}→${cardsA1})`, `Snooze didn't remove the card in A (${cardsA0}→${cardsA1})`);
check(undoVisible, "the inline Undo affordance appeared after Snooze", "no inline Undo affordance after Snooze");
check(undoSaysSnoozed, 'the Undo line reads "Snoozed …" (not "Dismissed")', `the Undo line didn't say "Snoozed" (got: ${undoText.slice(0, 60)})`);
check(
  cardsB === cardsA0 - 1,
  `FRESH context B sees the snooze — SERVER-SIDE, not localStorage (${cardsB} === ${cardsA0 - 1})`,
  `fresh context B did NOT reflect the snooze (${cardsB} ≠ ${cardsA0 - 1}) — persistence is NOT server-side`,
);
check(cardsA2 === cardsA0, `Undo un-snoozed the card in A (${cardsA2}/${cardsA0})`, `Undo didn't un-snooze in A (${cardsA2}/${cardsA0})`);
check(cardsA3 === cardsA0, `un-snooze persisted across reload (${cardsA3}/${cardsA0}) — ba-e2e left clean`, `un-snooze didn't persist (${cardsA3}/${cardsA0}) — ba-e2e may be left dirty!`);
check(errors.length === 0, "0 console errors across both contexts", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
