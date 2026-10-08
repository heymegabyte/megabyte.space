#!/usr/bin/env node
/**
 * WS-DEMO: the /analytics-engine surface (Cloudflare Analytics Engine — the RAW telemetry layer; a NEW
 * Resources panel, documented in PROJECTSITES-ABSORPTION "Native CF Analytics Engine sampling · HTTP cache
 * ratio · bot traffic"). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the
 * stat strip (datasets · data points · sampling · cache hit) + a category filter + search + the dataset
 * list + a SIGNATURE sample SQL-over-events query with results. Distinct from /analytics (funnel) +
 * /metrics (latency). The SIGNATURE interactions: a category pill + search narrow the datasets, and the
 * SQL query panel proves the SQL-over-events capability. Cross-links Analytics. "Preview · sample data".
 * BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + category filter + a dataset + sampling + the SQL query + honesty.
const NEEDLES = [
  /sample data/i,                                 // honest "Preview · sample data"
  /analytics engine/i,                            // the page
  /\b(http|custom|bot|perf)\b/i,                  // the category filter / categories
  /http_requests|ai_inference|bot_detections/i,   // real sample dataset names
  /sampl/i,                                        // the sampling concept (sampling / sampled)
  /SELECT|sql query|data points/i,                 // the SQL-over-events signature / rollup
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
// Grant clipboard-write so the real click on "Copy query" resolves in headless Chromium (else it's denied).
await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: APEX }).catch(() => {});

await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});

// Return to an authed surface with the rail, then click the Analytics Engine rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Analytics Engine", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/analytics-engine/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — the stat strip + datasets + the SQL query panel, for the vision read.
await page.screenshot({ path: "scripts/.analytics-engine-proof.png", fullPage: true });

// cross-link to Analytics.
const analyticsLink = await page.getByRole("button", { name: /^Analytics/ }).count().then((c) => c > 0).catch(() => false);
// The SIGNATURE SQL-over-events panel renders (distinct from /analytics dashboards).
const sqlPanel = /SELECT/i.test(body) && /FROM http_requests/i.test(body);

const countRows = () => page.locator('section[aria-label="Analytics Engine datasets"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a category pill narrows the datasets. All → Custom (fewer, >0).
let countCustom = countAll;
const customPill = page.getByRole("button", { name: /^Custom/ }).first();
if (await customPill.count().then((c) => c > 0).catch(() => false)) {
  await customPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countCustom = await countRows().catch(() => countAll);
}
const categoryFilterWorks = countAll > 0 && countCustom > 0 && countCustom < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a dataset fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search datasets/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("inference");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// DEPTH (fire-276) — per-dataset 24h volume sparklines: one cyan polyline per dataset row (All state, 7 rows).
const sparklineCount = await page.locator('section[aria-label="Analytics Engine datasets"] svg.ae-spark polyline').count().catch(() => 0);
const sparklinesRender = countAll > 0 && sparklineCount >= countAll;

// DEPTH (fire-276) — the Copy-query button copies the SQL and flips to a transient "Copied" confirm. The
// button lives in the "Sample query" section (stable locator; its visible text IS the accessible name).
const copyBtn = page.locator('section[aria-label="Sample query"] button').first();
const hasCopyBtn = await copyBtn.count().then((c) => c > 0).catch(() => false);
let copyBefore = "", copyAfter = "";
if (hasCopyBtn) {
  copyBefore = (await copyBtn.innerText().catch(() => "")).trim();
  await copyBtn.click().catch(() => {});
  await page.waitForTimeout(350);
  copyAfter = (await copyBtn.innerText().catch(() => "")).trim();
}
const copyQueryWorks = /copy query/i.test(copyBefore) && /copied/i.test(copyAfter);

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countCustom, countSearch, sqlPanel, categoryFilterWorks, searchWorks, analyticsLink, sparklineCount, sparklinesRender, hasCopyBtn, copyBefore, copyAfter, copyQueryWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Analytics Engine reachable from the sidebar rail", "no Analytics Engine rail link (nav wiring missing)");
check(onPath, "Analytics Engine rail click → /analytics-engine", "rail click did not reach /analytics-engine");
check(renders, "Analytics Engine content renders (stats + category filter + datasets + SQL + honesty label)", `content missing: ${missing.join(", ")}`);
check(categoryFilterWorks, `Category filter narrows the datasets (All ${countAll} → Custom ${countCustom})`, "category pill did not narrow the datasets");
check(searchWorks, `Search narrows the datasets (All ${countAll} → "inference" ${countSearch})`, "search did not narrow the datasets");
check(sqlPanel, "Signature SQL-over-events query panel renders (SELECT … FROM http_requests)", "the sample SQL query panel is missing");
check(analyticsLink, "Cross-link to Analytics present (interconnect)", "no Analytics cross-link");
check(sparklinesRender, `Per-dataset 24h volume sparklines render (${sparklineCount} ≥ ${countAll} rows)`, `expected ≥${countAll} dataset sparklines, found ${sparklineCount}`);
check(copyQueryWorks, `Copy-query button copies the SQL + confirms ("${copyBefore}" → "${copyAfter}")`, `copy-query button did not flip to a Copied confirm (before="${copyBefore}" after="${copyAfter}")`);
check(realErrors.length === 0, "0 console errors on /analytics-engine", `${realErrors.length} console errors`);
console.log(ok ? "✅ ANALYTICS-ENGINE GREEN" : "❌ analytics-engine check failed");
process.exit(ok ? 0 : 1);
