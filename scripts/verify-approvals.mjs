#!/usr/bin/env node
/**
 * WS-DEMO: the /approvals surface (the human-in-the-loop GOVERNANCE queue — documented in ULTIMATE-
 * REQUIREMENTS §34/§36/§41; a NEW Resources panel). Reachable via the SIDEBAR rail (real-user path,
 * proves nav wiring); renders the stat strip + a kind filter + search + the request cards with
 * Approve/Reject controls. The SIGNATURE interactions: a kind pill + search narrow the queue, a per-item
 * "Approve" resolves one request (one fewer Approve button + an "Approved" badge), and "Auto-approve
 * low-risk" clears the low-risk backlog in bulk. It cross-links to Activity. "Preview · sample data".
 * Also asserts the fire-238 "Needs a human" cluster DIVIDER — a labeled role="separator" between the
 * leading pending-high-risk block and the lower-risk/resolved rest (the prod regression net the shipped
 * UX lacked; fire-239). BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + kind filter + a sample request + risk + policy + honesty.
const NEEDLES = [
  /sample data/i,                              // honest "Preview · sample data"
  /approvals/i,                                // the page
  /\b(deploy|spend|send|delete|publish)\b/i,   // the kind filter / kinds
  /lead-scorer|press release|budget/i,         // real sample request titles
  /high risk|low risk/i,                       // the risk chips
  /pending|auto-approve/i,                     // the queue state / policy action
];

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

// Return to an authed surface with the rail, then click the Approvals rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Approvals", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/approvals/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every request card (kind/risk chips + Approve/Reject) visible for the vision read.
await page.screenshot({ path: "scripts/.approvals-proof.png", fullPage: true });

// DIVIDER (fire-238) — the "Needs a human" cluster separator renders between the leading pending
// high-risk block and the lower-risk/resolved rest. Asserted in the PRISTINE ALL state (before any
// mutating interaction below). AA-safe: a LABELED role="separator" (not color-only); non-article, so
// it never perturbs the article row count. Must sit BETWEEN cards (≥1 article before AND after) —
// never at the top/bottom/uniform list (the needsHumanDividerIndex contract). The shipped UX had unit
// tests (approvals.test.ts) but no prod real-browser net until this assertion (fire-239).
const dividerSel = 'section[aria-label="Approval queue"] [role="separator"]';
const dividerCount = await page.locator(dividerSel).count().catch(() => 0);
const dividerLabel = dividerCount > 0 ? await page.locator(dividerSel).first().getAttribute("aria-label").catch(() => null) : null;
const dividerText = dividerCount > 0 ? await page.locator(dividerSel).first().innerText().catch(() => "") : "";
const dividerBetween = dividerCount > 0 ? await page.evaluate(() => {
  const sec = document.querySelector('section[aria-label="Approval queue"]');
  if (!sec) return false;
  const kids = Array.from(sec.children);
  const sepIdx = kids.findIndex((el) => el.getAttribute && el.getAttribute("role") === "separator");
  if (sepIdx < 0) return false;
  const before = kids.slice(0, sepIdx).filter((el) => el.tagName === "ARTICLE").length;
  const after = kids.slice(sepIdx + 1).filter((el) => el.tagName === "ARTICLE").length;
  return before >= 1 && after >= 1;
}).catch(() => false) : false;
const dividerLabelled = /lower-risk/i.test(`${dividerLabel || ""} ${dividerText}`);
const dividerWorks = dividerCount === 1 && dividerBetween && dividerLabelled;

// cross-link to Activity.
const activityLink = await page.getByRole("button", { name: /^Activity/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Approval queue"] article').count();
const countApprove = () => page.getByRole("button", { name: "Approve", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a kind pill narrows the queue. All → Deploy (fewer, >0).
let countDeploy = countAll;
const deployPill = page.getByRole("button", { name: /^Deploy/ }).first();
if (await deployPill.count().then((c) => c > 0).catch(() => false)) {
  await deployPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countDeploy = await countRows().catch(() => countAll);
}
const kindFilterWorks = countAll > 0 && countDeploy > 0 && countDeploy < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a title fragment → fewer, >0.
// Also capture the divider count in the single-RESULT state: a 1-item list is uniform, so the
// "needs a human" divider MUST be absent (the needsHumanDividerIndex never-at-edge/uniform contract,
// proven LIVE — the RED contrast to the present-in-ALL assertion above; robust for ANY 1-item result).
let countSearch = countAll;
let dividerWhenSingle = -1;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search approvals/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("press");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  dividerWhenSingle = await page.locator(dividerSel).count().catch(() => -1);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;
const dividerHidesInSingleList = countSearch === 1 && dividerWhenSingle === 0;

// INTERACTIVE 3 — a per-item "Approve" resolves one request (one fewer Approve button + an "Approved" badge).
let approveWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const approveBefore = await countApprove().catch(() => 0);
const firstApprove = page.getByRole("button", { name: "Approve", exact: true }).first();
if (approveBefore > 0 && (await firstApprove.count().then((c) => c > 0).catch(() => false))) {
  await firstApprove.click().catch(() => {});
  await page.waitForTimeout(450);
  const approveAfter = await countApprove().catch(() => approveBefore);
  const hasBadge = /approved/i.test(await page.evaluate(() => document.body.innerText));
  approveWorks = approveAfter === approveBefore - 1 && hasBadge;
}

// INTERACTIVE 4 — "Auto-approve low-risk" clears the low-risk backlog (Approve-button count drops again).
let autoApproveWorks = false;
const autoBtn = page.getByRole("button", { name: /^Auto-approve low-risk/ }).first();
const beforeAuto = await countApprove().catch(() => 0);
if (beforeAuto > 0 && (await autoBtn.count().then((c) => c > 0).catch(() => false)) && !(await autoBtn.isDisabled().catch(() => true))) {
  await autoBtn.click().catch(() => {});
  await page.waitForTimeout(450);
  const afterAuto = await countApprove().catch(() => beforeAuto);
  autoApproveWorks = afterAuto < beforeAuto;
}

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, dividerCount, dividerBetween, dividerLabelled, dividerWorks, dividerWhenSingle, dividerHidesInSingleList, countAll, countDeploy, countSearch, approveBefore, kindFilterWorks, searchWorks, approveWorks, autoApproveWorks, activityLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Approvals reachable from the sidebar rail", "no Approvals rail link (nav wiring missing)");
check(onPath, "Approvals rail click → /approvals", "rail click did not reach /approvals");
check(renders, "Approvals content renders (stats + kind filter + queue + risk chips + policy + honesty label)", `content missing: ${missing.join(", ")}`);
check(dividerWorks, `"Needs a human" cluster divider renders between the high-risk block and the rest (labeled role=separator, 1 found, between cards, AA-safe)`, `divider assertion failed (count=${dividerCount} between=${dividerBetween} labelled=${dividerLabelled})`);
check(dividerHidesInSingleList, `Divider ABSENT in a single-result list (uniform → needsHumanDividerIndex=-1, proven live)`, `divider did not hide in the 1-item list (countSearch=${countSearch} dividerWhenSingle=${dividerWhenSingle})`);
check(kindFilterWorks, `Kind filter narrows the queue (All ${countAll} → Deploy ${countDeploy})`, "kind pill did not narrow the queue");
check(searchWorks, `Search narrows the queue (All ${countAll} → "press" ${countSearch})`, "search did not narrow the queue");
check(approveWorks, `Approve resolves one request (Approve buttons ${approveBefore} → ${approveBefore - 1} + "Approved" badge)`, "per-item approve did not resolve a request");
check(autoApproveWorks, "Auto-approve low-risk clears the low-risk backlog (fewer Approve buttons)", "auto-approve-low-risk did not resolve the low-risk requests");
check(activityLink, "Cross-link to Activity present (interconnect)", "no Activity cross-link");
check(realErrors.length === 0, "0 console errors on /approvals", `${realErrors.length} console errors`);
console.log(ok ? "✅ APPROVALS GREEN" : "❌ approvals check failed");
process.exit(ok ? 0 : 1);
