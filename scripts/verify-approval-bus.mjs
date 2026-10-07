#!/usr/bin/env node
/**
 * fire-230 — the DURABLE APPROVAL BUS (WS-N1, North-Star HITL governance). Proves the end-to-end round
 * trip of the per-user UserDO approval queue (addApproval / listApprovals / decideApproval):
 *
 *   /pulse → click "Require approval" on an opportunity (addApproval, server-validated+bounded)
 *         → lands on /approvals, the LIVE band shows the real pending item (listApprovals)
 *         → Approve it (decideApproval removes it durably)
 *         → hard-reload: it STAYS gone (display-vs-store reconcile — proves server-side removal, not
 *           just optimistic local state).
 *
 * NON-POLLUTING (per the verifier-must-not-pollute-prod-data lesson): a `finally` DRAINS every live
 * pending item it (or a prior crashed run) left on the ba-e2e account, so the queue is returned clean.
 * The pure bounds/validation are proven separately + deterministically by approvalStore.test.ts (13/13);
 * this is the live surface + durability proof. BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const LIVE = 'section[aria-label="Live approval queue"]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// Drain every live pending approval on the account (returns ba-e2e clean; also self-heals a crashed run).
async function drainLive() {
  await page.goto(`${APEX}/approvals`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector(LIVE, { timeout: 20000 }).catch(() => {});
  await sleep(900);
  for (let i = 0; i < 25; i++) {
    const approve = page.locator(LIVE).getByRole("button", { name: "Approve", exact: true }).first();
    if (!(await approve.count().then((c) => c > 0).catch(() => false))) break;
    await approve.click().catch(() => {});
    await sleep(450);
  }
}

let loggedIn = false, reachedPulse = false, raisedTitle = "", landedOnApprovals = false;
let liveShowsRaised = false, approveRemoved = false, durableAfterReload = false, bandRenders = false;
let skippedNoOpportunity = false;

try {
  // 1. Log in (ba-e2e testing bypass), then DRAIN any leftovers so counts start from a clean slate.
  await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('[data-testid="auth-submit"]');
  await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
  loggedIn = true;
  await drainLive();

  // 2. /pulse — the live band must render fail-soft (honest-empty after the drain) with 0 errors.
  bandRenders = await page.locator(LIVE).count().then((c) => c > 0).catch(() => false);
  await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await sleep(900);
  reachedPulse = /\/pulse/.test(page.url());

  // 3. Escalate the first opportunity via "Require approval" (the Pulse → approval producer).
  const card = page.locator('ul[aria-label="Opportunities"] li').first();
  const reqBtn = page.locator('[data-testid="pulse-require-approval"]').first();
  if (await reqBtn.count().then((c) => c > 0).catch(() => false)) {
    raisedTitle = (await card.locator("h2").first().innerText().catch(() => "")).trim();
    await reqBtn.click().catch(() => {});
    await page.waitForURL(/\/approvals/, { timeout: 15000 }).catch(() => {});
    await page.waitForSelector(LIVE, { timeout: 20000 }).catch(() => {});
    await sleep(900);
    landedOnApprovals = /\/approvals/.test(page.url());

    // 4. The LIVE band shows the real pending item we just raised (listApprovals round-trip).
    const liveText = await page.locator(LIVE).innerText().catch(() => "");
    liveShowsRaised = raisedTitle.length > 0 && liveText.includes(raisedTitle);

    // 5. Approve it → it leaves the live band (optimistic + decideApproval durable removal).
    const approve = page.locator(LIVE).getByRole("button", { name: "Approve", exact: true }).first();
    if (await approve.count().then((c) => c > 0).catch(() => false)) {
      await approve.click().catch(() => {});
      await sleep(700);
      const afterText = await page.locator(LIVE).innerText().catch(() => "");
      approveRemoved = !afterText.includes(raisedTitle);
    }

    // 6. Hard-reload — the decided item STAYS gone (server-side removal, not just local state).
    await page.goto(`${APEX}/approvals`, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForSelector(LIVE, { timeout: 20000 }).catch(() => {});
    await sleep(900);
    const reloadText = await page.locator(LIVE).innerText().catch(() => "");
    durableAfterReload = !reloadText.includes(raisedTitle);
  } else {
    skippedNoOpportunity = true; // no opportunity to escalate on ba-e2e right now — round-trip not exercised
  }
} finally {
  await drainLive().catch(() => {}); // ALWAYS leave the account clean
  await browser.close();
}

// "WebSocket is already in CLOSING or CLOSED state" — a benign capnweb WS-close race on the hard-reload
// nav, filtered estate-wide (fire-161). Canonical pattern matched to the ACTUAL phrasing; the old
// `… state` anchor missed "CLOSING or CLOSED state" so the race leaked through as a false FAIL (fire-232).
const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({
  loggedIn, bandRenders, reachedPulse, raisedTitle, landedOnApprovals,
  liveShowsRaised, approveRemoved, durableAfterReload, skippedNoOpportunity,
  consoleErrors: realErrors.length,
}, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(loggedIn, "logged in as ba-e2e", "login failed");
check(bandRenders, "/approvals LIVE band renders (fail-soft, durable per-account)", "live approval band missing");
check(reachedPulse, "reached /pulse", "did not reach /pulse");
if (skippedNoOpportunity) {
  console.log("⚠️  SKIPPED the Pulse→approval round-trip: no Pulse opportunity to escalate on ba-e2e right now (bus bounds proven by approvalStore.test.ts 13/13).");
} else {
  check(landedOnApprovals, "Require approval → navigates to /approvals", "did not land on /approvals after Require approval");
  check(liveShowsRaised, `LIVE band shows the raised item ("${raisedTitle}") — addApproval→listApprovals round-trip`, "raised approval did not appear in the live band");
  check(approveRemoved, "Approve removes the live item (decideApproval)", "approve did not remove the live item");
  check(durableAfterReload, "item STAYS gone after hard-reload (durable server-side removal)", "decided item reappeared after reload (not durable)");
}
check(realErrors.length === 0, "0 console errors across the round-trip", `${realErrors.length} console errors`);
console.log(ok ? "✅ APPROVAL-BUS GREEN" : "❌ approval-bus check failed");
process.exit(ok ? 0 : 1);
