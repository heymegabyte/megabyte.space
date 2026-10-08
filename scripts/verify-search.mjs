#!/usr/bin/env node
/**
 * WS-DEMO: the /search surface (universal CONTENT search over the workspace — the ResourcesPanel +
 * /admin "Search" card). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders a
 * prominent search box, a stat strip (Indexed · Types · Results · Top match), type-filter chips and a
 * relevance-ranked results list with matched terms <mark>-highlighted. DISTINCT from ⌘K (which navigates
 * ACTIONS): this searches the content itself, the way a D1 FTS5 index will. The SIGNATURE interactions:
 * typing a query narrows + ranks the index, and a type chip scopes it. Clearly labeled "Preview · sample
 * data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the box + stat strip + type chips + honesty label.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /\bsearch\b/i,             // the page + the box
  /indexed/i,                // a stat card + the footer
  /top match/i,              // a stat card
  /customer|knowledge/i,     // type chips
  /relevance|fts5/i,         // the footer honesty copy
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

// Return to an authed surface with the rail, then click the Search rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Search", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/search/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Search results"] li').count();

// INTERACTIVE 1 — a query narrows + ranks the index. "acme" matches across customer/form/task (fewer, >0).
const countAll = await countRows().catch(() => 0);
let countQuery = countAll;
const search = page.getByRole("searchbox", { name: /search content/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("acme");
  await page.waitForTimeout(400);
  countQuery = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countAll > 0 && countQuery > 0 && countQuery < countAll;

// INTERACTIVE 2 — a type chip scopes the index. All → Customer (fewer, >0).
let countType = countAll;
const typePill = page.getByRole("button", { name: /^Customer/ }).first();
if (await typePill.count().then((c) => c > 0).catch(() => false)) {
  await typePill.click().catch(() => {});
  await page.waitForTimeout(400);
  countType = await countRows().catch(() => countAll);
}
const typeFilterWorks = countAll > 0 && countType > 0 && countType < countAll;

// INTERACTIVE 3 — matched terms are highlighted (<mark>) when searching.
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(200); }
let highlightWorks = false;
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("acme");
  await page.waitForTimeout(400);
  const marks = await page.locator('section[aria-label="Search results"] mark').count().catch(() => 0);
  highlightWorks = marks > 0;
  await search.fill("");
  await page.waitForTimeout(150);
}

await page.screenshot({ path: "scripts/.search-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countQuery, countType, highlightWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Search reachable from the sidebar rail", "no Search rail link (nav wiring missing)");
check(onPath, "Search rail click → /search", "rail click did not reach /search");
check(renders, "Search content renders (box + stats + type chips + honesty label)", `content missing: ${missing.join(", ")}`);
check(searchWorks, `A query narrows the index (All ${countAll} → "acme" ${countQuery})`, "typing a query did not narrow the results");
check(typeFilterWorks, `A type chip scopes the index (All ${countAll} → Customer ${countType})`, "type chip did not narrow the results");
check(highlightWorks, "Matched terms are <mark>-highlighted in the hits", "no <mark> highlight on matched terms");
check(realErrors.length === 0, "0 console errors on /search", `${realErrors.length} console errors`);
console.log(ok ? "✅ SEARCH GREEN" : "❌ search check failed");
process.exit(ok ? 0 : 1);
