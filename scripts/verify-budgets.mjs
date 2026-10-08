#!/usr/bin/env node
/**
 * WS-DEMO: the /budgets surface (cost GOVERNANCE — spend caps + alert thresholds + per-scope quotas;
 * a NORTH-STAR primitive, DISTINCT from /billing's spend history). Reachable via the SIDEBAR rail
 * (real-user path, proves nav wiring); renders the stat strip + scope filter + search + the budget
 * list with utilization bars. The SIGNATURE behaviors are interactive: a scope pill narrows the list,
 * search narrows it further, the composer ADDS a new cap, and over/near rows carry a status
 * left-border. Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + scope filter + list + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bbudgets\b/i,              // the page
  /monthly cap/i,             // the stat strip
  /spent mtd/i,               // the stat strip
  /\b(agent|workspace|gadget|account)\b/i, // scope filter / chips
  /\b(on track|near cap|over cap)\b/i,     // derived status labels
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

// Return to an authed surface with the rail, then click the Budgets rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Budgets", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/budgets/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Budgets"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — the composer ADDS a budget (count +1). Open → fill name + cap → submit.
let countAfterAdd = countAll;
const addToggle = page.getByRole("button", { name: /Add budget/ }).first();
if (await addToggle.count().then((c) => c > 0).catch(() => false)) {
  await addToggle.click().catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('form[aria-label="Add a budget"] input[aria-label="Budget name"]').fill("Research agent").catch(() => {});
  await page.locator('form[aria-label="Add a budget"] input[aria-label="Monthly cap in dollars"]').fill("300").catch(() => {});
  await page.locator('form[aria-label="Add a budget"] button[type="submit"]').click().catch(() => {});
  await page.waitForTimeout(500);
  countAfterAdd = await countRows().catch(() => countAll);
}
const addWorks = countAll > 0 && countAfterAdd === countAll + 1;

// INTERACTIVE 2 — a scope pill narrows the list. All → Agent (fewer, >0).
let countAgent = countAfterAdd;
const agentPill = page.getByRole("button", { name: /^Agent/ }).first();
if (await agentPill.count().then((c) => c > 0).catch(() => false)) {
  await agentPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countAgent = await countRows().catch(() => countAfterAdd);
}
const scopeFilterWorks = countAgent > 0 && countAgent < countAfterAdd;

// INTERACTIVE 3 — search narrows. Reset to All, type a name → fewer rows, >0.
let countSearch = countAfterAdd;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search budgets/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("lead-scorer");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAfterAdd);
  await search.fill(""); // restore
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAfterAdd;

// surfaceAccent prod net: the over-cap row carries a danger left-border + near-cap rows a warning one
// (on-track rows stay quiet) — the shared row-accent that lifts the at-risk budgets out of the list.
const accents = await countAccentBorders(page, 'section[aria-label="Budgets"]');
const accentBordersRender = accents.danger >= 1 && accents.warning >= 1;

// fire-275 — forward-looking governance: every row carries a spend-trajectory sparkline + a run-rate
// projected cap-hit readout. Date-robust PRESENCE checks (exact projected dates shift daily, so we
// assert one of each per row by testid, never an exact date). The over-cap budget's projection reads
// "Over cap" on ANY day (MTD actual, not a projection) — a stable anchor.
await page.getByRole("button", { name: /^All/ }).first().click().catch(() => {});
await page.waitForTimeout(300);
const rowCount = await countRows().catch(() => 0);
const sparklines = await page.locator('section[aria-label="Budgets"] [data-testid="budget-sparkline"]').count().catch(() => 0);
const projections = await page.locator('section[aria-label="Budgets"] [data-testid="cap-projection"]').count().catch(() => 0);
const overCapProjection = await page.locator('section[aria-label="Budgets"] [data-testid="cap-projection"]', { hasText: /over cap/i }).count().catch(() => 0);
const sparklinesRender = rowCount > 0 && sparklines >= rowCount;
const projectionsRender = rowCount > 0 && projections >= rowCount && overCapProjection >= 1;

await page.screenshot({ path: "scripts/.budgets-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countAfterAdd, countAgent, countSearch, addWorks, scopeFilterWorks, searchWorks, accents, rowCount, sparklines, projections, overCapProjection, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Budgets reachable from the sidebar rail", "no Budgets rail link (nav wiring missing)");
check(onPath, "Budgets rail click → /budgets", "rail click did not reach /budgets");
check(renders, "Budgets content renders (stats + scope filter + status + list + honesty label)", `content missing: ${missing.join(", ")}`);
check(addWorks, `Composer adds a budget (${countAll} → ${countAfterAdd})`, "add-budget composer did not add a row");
check(scopeFilterWorks, `Scope filter narrows the list (All ${countAfterAdd} → Agent ${countAgent})`, "scope pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAfterAdd} → "lead-scorer" ${countSearch})`, "search did not narrow the list");
check(accentBordersRender, `Over + near rows carry accent borders (danger ${accents.danger} + warning ${accents.warning})`, `surfaceAccent borders missing on /budgets (danger ${accents.danger}, warning ${accents.warning})`);
check(sparklinesRender, `Every row has a spend-trajectory sparkline (${sparklines} ≥ ${rowCount})`, `spend-trajectory sparklines missing (${sparklines} for ${rowCount} rows)`);
check(projectionsRender, `Every row has a run-rate cap projection, incl. an over-cap readout (${projections} ≥ ${rowCount}, over-cap ${overCapProjection})`, `cap projections missing (${projections} for ${rowCount} rows, over-cap ${overCapProjection})`);
check(realErrors.length === 0, "0 console errors on /budgets", `${realErrors.length} console errors`);
console.log(ok ? "✅ BUDGETS GREEN" : "❌ budgets check failed");
process.exit(ok ? 0 : 1);
