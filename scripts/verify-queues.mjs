#!/usr/bin/env node
/**
 * WS-DEMO: the /queues surface (async work gadgets enqueue — the ResourcesPanel "Queues" card:
 * Cloudflare Queues · batched). Reachable via the SIDEBAR rail (real-user path, proves nav wiring);
 * renders the stat strip + status filter + search + a queue list + the selected queue's message/DLQ
 * detail. The SIGNATURE interactions: a status pill + search narrow the list, clicking a queue opens
 * its detail, and "Retry failed" replays its dead-letter. Clearly labeled "Preview · sample data".
 * BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a queue + depth/DLQ + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bqueues\b/i,               // the page
  /\b(healthy|backlogged|paused)\b/i, // the status filter / statuses
  /email-dispatch|lead-enrichment/i, // real sample queue names
  /dead-letter|dlq/i,          // the dead-letter concept
  /throughput|depth/i,         // the detail stats
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

// Return to an authed surface with the rail, then click the Queues rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Queues", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/queues/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Queues list"] li').count();

// INTERACTIVE 1 — queue→detail drill-in. Default detail = email-dispatch; click lead-enrichment.
let drillInWorks = false;
const row = page.getByRole("button", { name: "Queue: lead-enrichment" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Queue: lead-enrichment"]').count().then((c) => c > 0).catch(() => false);
}

// INTERACTIVE 2 — "Retry N failed" on a DLQ>0 queue (lead-enrichment has 3) → "Retrying…".
let retryWorks = false;
const retryBtn = page.getByRole("button", { name: /Retry \d+ failed/ }).first();
if (await retryBtn.count().then((c) => c > 0).catch(() => false)) {
  await retryBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const body2 = await page.evaluate(() => document.body.innerText);
  retryWorks = /retrying/i.test(body2);
}

// INTERACTIVE 3 — a status pill narrows the list. All → Backlogged (fewer, >0).
const countAll = await countRows().catch(() => 0);
let countBack = countAll;
const backPill = page.getByRole("button", { name: /^Backlogged/ }).first();
if (await backPill.count().then((c) => c > 0).catch(() => false)) {
  await backPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countBack = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countBack > 0 && countBack < countAll;

// INTERACTIVE 4 — search narrows. Reset to All, type a queue fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search queues/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("sms");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

await page.screenshot({ path: "scripts/.queues-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countBack, countSearch, drillInWorks, retryWorks, statusFilterWorks, searchWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Queues reachable from the sidebar rail", "no Queues rail link (nav wiring missing)");
check(onPath, "Queues rail click → /queues", "rail click did not reach /queues");
check(renders, "Queues content renders (stats + status filter + queues + depth/DLQ + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Queue click opens its detail (email-dispatch → lead-enrichment)", "detail did not switch");
check(retryWorks, "Retry failed replays the dead-letter (Retrying…)", "retry did not confirm");
check(statusFilterWorks, `Status filter narrows the list (All ${countAll} → Backlogged ${countBack})`, "status pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "sms" ${countSearch})`, "search did not narrow the list");
check(realErrors.length === 0, "0 console errors on /queues", `${realErrors.length} console errors`);
console.log(ok ? "✅ QUEUES GREEN" : "❌ queues check failed");
process.exit(ok ? 0 : 1);
