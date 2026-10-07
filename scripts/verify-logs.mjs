#!/usr/bin/env node
/**
 * WS-DEMO: the /logs surface (live runtime-logs tail — PROJECTSITES-ABSORPTION § Admin "what an admin
 * can see live", + the Editor Resources "Logs" panel). Reachable via the SIDEBAR rail (real-user path,
 * proves nav wiring); renders the stat strip + level filter + search + the monospace log stream. The
 * SIGNATURE behavior is interactive: a level pill narrows the stream, search narrows it further, and
 * the Live/Paused toggle flips. Clearly labeled "Preview · sample stream". BA-authed real Chromium,
 * PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + level filter + sources + stream + honesty label.
const NEEDLES = [
  /sample stream/i,            // honest "Preview · sample stream" — never lies-empty
  /\blogs\b/i,                 // the page
  /\b(lines|sources)\b/i,      // the stat strip
  /\b(error|warn|debug|info)\b/i, // the level filter / stream levels
  /router|scheduler|lead-scorer/i, // real emitting sources in the stream
  /\d\d:\d\d:\d\d/,            // timestamped log lines
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

// Return to an authed surface with the rail, then click the Logs rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Logs", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/logs/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE 1 — a level pill narrows the stream. All (18) → Error (fewer, >0).
const countLines = () => page.locator('section[aria-label="Log stream"] li').count();
const countAll = await countLines().catch(() => 0);
let countError = countAll;
const errorPill = page.getByRole("button", { name: /^Error/ }).first();
if (await errorPill.count().then((c) => c > 0).catch(() => false)) {
  await errorPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countError = await countLines().catch(() => countAll);
}
const levelFilterWorks = countAll > 0 && countError > 0 && countError < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a source → fewer lines, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search logs/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("scheduler");
  await page.waitForTimeout(400);
  countSearch = await countLines().catch(() => countAll);
  await search.fill(""); // restore
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — the Live/Paused toggle flips (aria-label Pause↔Resume).
let liveToggleWorks = false;
const toggle = page.getByRole("button", { name: /the live tail/i }).first();
if (await toggle.count().then((c) => c > 0).catch(() => false)) {
  const before = await toggle.getAttribute("aria-label").catch(() => null);
  await toggle.click().catch(() => {});
  await page.waitForTimeout(300);
  const after = await page.getByRole("button", { name: /the live tail/i }).first().getAttribute("aria-label").catch(() => null);
  liveToggleWorks = !!before && !!after && before !== after;
}

await page.screenshot({ path: "scripts/.logs-proof.png", fullPage: true });
await browser.close();

// A benign WS teardown message during nav is not a real console error.
const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countError, countSearch, levelFilterWorks, searchWorks, liveToggleWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Logs reachable from the sidebar rail", "no Logs rail link (nav wiring missing)");
check(onPath, "Logs rail click → /logs", "rail click did not reach /logs");
check(renders, "Logs content renders (stats + level filter + sources + timestamped stream + honesty label)", `content missing: ${missing.join(", ")}`);
check(levelFilterWorks, `Level filter narrows the stream (All ${countAll} → Error ${countError})`, "level pill did not narrow the stream");
check(searchWorks, `Search narrows the stream (All ${countAll} → "scheduler" ${countSearch})`, "search did not narrow the stream");
check(liveToggleWorks, "Live/Paused toggle flips", "live toggle did not flip");
check(realErrors.length === 0, "0 console errors on /logs", `${realErrors.length} console errors`);
console.log(ok ? "✅ LOGS GREEN" : "❌ logs check failed");
process.exit(ok ? 0 : 1);
