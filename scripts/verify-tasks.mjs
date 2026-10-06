#!/usr/bin/env node
/**
 * WS-DEMO: the /tasks surface (the unified WORK/JOB tracker — a North-Star primitive "Tasks"; §45
 * observability rollup; a NEW Resources panel). Reachable via the SIDEBAR rail (real-user path, proves
 * nav wiring); renders the stat strip + a status filter + search + the task cards. The SIGNATURE
 * interactions: a status pill + search narrow the list, a per-row "Retry" re-queues a failed task (one
 * fewer Retry button), and "Retry failed" clears the failed backlog in bulk. It cross-links to Activity.
 * It LEADS with a LIVE "results" band (real listOutputs — the outputs your work has produced). "Live
 * results · sample runs". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a sample task + cost + success + honesty.
const NEEDLES = [
  /sample runs/i,                                       // honest hybrid "Live results · sample runs" (DEPTH live band)
  /tasks/i,                                             // the page
  /\b(running|queued|succeeded|failed|blocked)\b/i,     // the status filter / statuses
  /lead|invoice|competitor|board summary/i,             // real sample task titles
  /\bsuccess\b|retry/i,                                 // the rollup / retry action
  /spend|\$\d/i,                                         // the cost rollup
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

// Return to an authed surface with the rail, then click the Tasks rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Tasks", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/tasks/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH: the live "results" band (real listOutputs) — assert the section renders (populated OR honest-empty;
// both are valid live states). A regression here means the band broke, not that the account has no outputs.
const liveBand = await page.locator('section[aria-label="Live results"]').count().then((c) => c > 0).catch(() => false);

// Proof in the ALL state — every task card (status/type chips + Retry on failed) visible for the vision read.
await page.screenshot({ path: "scripts/.tasks-proof.png", fullPage: true });

// cross-link to Activity.
const activityLink = await page.getByRole("button", { name: /^Activity/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Task list"] article').count();
const countRetry = () => page.getByRole("button", { name: "Retry", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a status pill narrows the list. All → Succeeded (fewer, >0).
let countSucceeded = countAll;
const succPill = page.getByRole("button", { name: /^Succeeded/ }).first();
if (await succPill.count().then((c) => c > 0).catch(() => false)) {
  await succPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countSucceeded = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countSucceeded > 0 && countSucceeded < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a title fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search tasks/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("invoice");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — a per-row "Retry" re-queues one failed task (one fewer Retry button).
let retryWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const retryBefore = await countRetry().catch(() => 0);
const firstRetry = page.getByRole("button", { name: "Retry", exact: true }).first();
if (retryBefore > 0 && (await firstRetry.count().then((c) => c > 0).catch(() => false))) {
  await firstRetry.click().catch(() => {});
  await page.waitForTimeout(450);
  const retryAfter = await countRetry().catch(() => retryBefore);
  retryWorks = retryAfter === retryBefore - 1;
}

// INTERACTIVE 4 — "Retry failed" clears the remaining failed backlog (no Retry buttons left).
let retryAllWorks = false;
const retryAllBtn = page.getByRole("button", { name: /^Retry failed/ }).first();
const beforeAll = await countRetry().catch(() => 0);
if (beforeAll > 0 && (await retryAllBtn.count().then((c) => c > 0).catch(() => false)) && !(await retryAllBtn.isDisabled().catch(() => true))) {
  await retryAllBtn.click().catch(() => {});
  await page.waitForTimeout(450);
  const afterAll = await countRetry().catch(() => beforeAll);
  retryAllWorks = afterAll === 0;
}

await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countAll, countSucceeded, countSearch, retryBefore, statusFilterWorks, searchWorks, retryWorks, retryAllWorks, activityLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Tasks reachable from the sidebar rail", "no Tasks rail link (nav wiring missing)");
check(onPath, "Tasks rail click → /tasks", "rail click did not reach /tasks");
check(renders, "Tasks content renders (stats + status filter + list + cost rollup + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'results' band renders (real listOutputs, DEPTH)", "live results band missing");
check(statusFilterWorks, `Status filter narrows the list (All ${countAll} → Succeeded ${countSucceeded})`, "status pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "invoice" ${countSearch})`, "search did not narrow the list");
check(retryWorks, `Retry re-queues one failed task (Retry buttons ${retryBefore} → ${retryBefore - 1})`, "per-row retry did not re-queue a task");
check(retryAllWorks, "Retry failed clears the failed backlog (no Retry buttons left)", "retry-failed did not clear the failed tasks");
check(activityLink, "Cross-link to Activity present (interconnect)", "no Activity cross-link");
check(realErrors.length === 0, "0 console errors on /tasks", `${realErrors.length} console errors`);
console.log(ok ? "✅ TASKS GREEN" : "❌ tasks check failed");
process.exit(ok ? 0 : 1);
