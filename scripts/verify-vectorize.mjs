#!/usr/bin/env node
/**
 * WS-DEMO: the /vectorize surface (vector indexes for semantic search / RAG — a NEW Resources panel).
 * Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + a metric
 * filter + search + an index list + the selected index's SAMPLE SIMILARITY QUERY + scored matches. The
 * SIGNATURE interactions: a metric pill + search narrow the list, clicking an index shows its sample
 * query + matches, and the surface cross-links to Knowledge. "Preview · sample data". BA-authed real
 * Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + metric filter + an index + similarity + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /vectorize/i,                // the page
  /\b(cosine|euclidean|dot)\b/i, // the metric filter / metrics
  /docs-embeddings|support-tickets/i, // real sample index names
  /similarity|sample query|vectors/i, // the query/matches section
  /dimensions|queries/i,       // the stat strip / detail
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

// Return to an authed surface with the rail, then click the Vectorize rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Vectorize", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/vectorize/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Indexes"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — index→detail drill-in shows the sample query + matches. docs-embeddings → product-catalog.
let drillInWorks = false, matchesRender = false;
const row = page.getByRole("button", { name: "Index: product-catalog" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Index: product-catalog"]').count().then((c) => c > 0).catch(() => false);
  // product-catalog's top match is the "Aero Trainer 2" product → proves the matches rendered.
  const body2 = await page.evaluate(() => document.body.innerText);
  matchesRender = /Aero Trainer/i.test(body2);
}

// INTERACTIVE 2 — a metric pill narrows the list. All → Cosine (fewer, >0).
let countCosine = countAll;
const cosinePill = page.getByRole("button", { name: /^Cosine/ }).first();
if (await cosinePill.count().then((c) => c > 0).catch(() => false)) {
  await cosinePill.click().catch(() => {});
  await page.waitForTimeout(400);
  countCosine = await countRows().catch(() => countAll);
}
const metricFilterWorks = countAll > 0 && countCosine > 0 && countCosine < countAll;

// INTERACTIVE 3 — search narrows. Reset to All, type an index fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search vectorize/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("support");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 4 — the Knowledge cross-link to /context (interconnect).
const knowledgeLink = await page.getByRole("button", { name: /^Knowledge/ }).count().then((c) => c > 0).catch(() => false);

await page.screenshot({ path: "scripts/.vectorize-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countCosine, countSearch, drillInWorks, matchesRender, metricFilterWorks, searchWorks, knowledgeLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Vectorize reachable from the sidebar rail", "no Vectorize rail link (nav wiring missing)");
check(onPath, "Vectorize rail click → /vectorize", "rail click did not reach /vectorize");
check(renders, "Vectorize content renders (stats + metric filter + indexes + similarity + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Index click opens its detail (docs-embeddings → product-catalog)", "detail did not switch");
check(matchesRender, "The sample query's scored matches render (Aero Trainer)", "match results did not render");
check(metricFilterWorks, `Metric filter narrows the list (All ${countAll} → Cosine ${countCosine})`, "metric pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "support" ${countSearch})`, "search did not narrow the list");
check(knowledgeLink, "Cross-link to Knowledge present (interconnect)", "no Knowledge cross-link");
check(realErrors.length === 0, "0 console errors on /vectorize", `${realErrors.length} console errors`);
console.log(ok ? "✅ VECTORIZE GREEN" : "❌ vectorize check failed");
process.exit(ok ? 0 : 1);
