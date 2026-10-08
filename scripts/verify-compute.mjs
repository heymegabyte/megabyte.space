#!/usr/bin/env node
/**
 * WS-DEMO: the /compute surface (the edge runtime — the ResourcesPanel "Compute" card: Cloudflare
 * Workers). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip
 * + status filter + search + a worker list + the selected worker's detail (invocations/CPU/errors +
 * a request sparkline + a "View logs" link). The SIGNATURE interactions: a status pill + search narrow
 * the list, clicking a worker opens its detail which links to /logs. DEPTH (fire-210): a LIVE "your
 * workers" band off listGadgets leads; chip "Live workers · sample runtime". BA-authed real Chromium,
 * PROD. Needs BA creds.
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a worker + CPU/invocations + honesty.
const NEEDLES = [
  /sample runtime/i,           // honest hybrid chip "Live workers · sample runtime" — never lies-empty
  /\bcompute\b/i,              // the page
  /\b(healthy|throttled|erroring)\b/i, // the status filter / statuses
  /lead-scorer|click-counter/i, // real sample worker names
  /invocation|p95/i,           // the stat strip / CPU detail
  /workers|cloudflare workers/i, // the runtime label
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

// Return to an authed surface with the rail, then click the Compute rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Compute", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/compute/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH (fire-210): the live "your workers" band renders one of its fail-soft states — running for the
// ba-e2e account (≥1 gadget), or an honest loading/unavailable/empty — never a misleading "0". Proves
// the real listGadgets wiring, not just the sample runtime list.
const liveBand = /Checking your workers|Workers unavailable|No workers deployed|\d+\s+workers?\s+running/i.test(body);

const countRows = () => page.locator('section[aria-label="Workers"] li').count();
const countAll = await countRows().catch(() => 0);

// surfaceAccent prod net (fire-245): the erroring (lead-scorer) + throttled (media-orchestrator)
// workers carry their colored left-border — proves the shared row-accent survives the build + renders.
const accents = await countAccentBorders(page, 'section[aria-label="Workers"]');
const accentBordersRender = accents.danger >= 1 && accents.warning >= 1;

// INTERACTIVE 1 — worker→detail drill-in. Default detail = click-counter; click lead-scorer.
let drillInWorks = false, logsLinkPresent = false;
const row = page.getByRole("button", { name: "Worker: lead-scorer" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Worker: lead-scorer"]').count().then((c) => c > 0).catch(() => false);
  // the detail links to the worker's runtime logs (interconnect; present, not clicked).
  logsLinkPresent = await page.getByRole("button", { name: /View logs/ }).count().then((c) => c > 0).catch(() => false);
}

// INTERACTIVE 2 — a status pill narrows the list. All → Healthy (fewer, >0).
let countHealthy = countAll;
const healthyPill = page.getByRole("button", { name: /^Healthy/ }).first();
if (await healthyPill.count().then((c) => c > 0).catch(() => false)) {
  await healthyPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countHealthy = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countHealthy > 0 && countHealthy < countAll;

// INTERACTIVE 3 — search narrows. Reset to All, type a worker fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search compute/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("lead");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

await page.screenshot({ path: "scripts/.compute-proof.png", fullPage: true });
await browser.close();

// The DEPTH listGadgets RPC opens a capnweb WebSocket; closing it on nav logs the benign "WebSocket is
// already in CLOSING or CLOSED state" race — filtered estate-wide (fire-161), canonical pattern matched
// to the actual phrasing (the old `… state` anchor missed "CLOSING or CLOSED state").
const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countAll, countHealthy, countSearch, drillInWorks, logsLinkPresent, statusFilterWorks, searchWorks, accents, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Compute reachable from the sidebar rail", "no Compute rail link (nav wiring missing)");
check(onPath, "Compute rail click → /compute", "rail click did not reach /compute");
check(renders, "Compute content renders (stats + status filter + workers + CPU/invocations + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'your workers' band renders (listGadgets DEPTH, fail-soft)", "live workers band missing — listGadgets DEPTH not wired");
check(drillInWorks, "Worker click opens its detail (click-counter → lead-scorer)", "detail did not switch");
check(logsLinkPresent, "Worker detail links to its runtime Logs (View logs)", "no View-logs link on the worker detail");
check(statusFilterWorks, `Status filter narrows the list (All ${countAll} → Healthy ${countHealthy})`, "status pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "lead" ${countSearch})`, "search did not narrow the list");
check(realErrors.length === 0, "0 console errors on /compute", `${realErrors.length} console errors`);
check(accentBordersRender, `Attention rows carry accent borders (danger ${accents.danger} + warning ${accents.warning})`, `surfaceAccent borders missing on /compute (danger ${accents.danger}, warning ${accents.warning})`);
console.log(ok ? "✅ COMPUTE GREEN" : "❌ compute check failed");
process.exit(ok ? 0 : 1);
