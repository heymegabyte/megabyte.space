#!/usr/bin/env node
/**
 * WS-DEMO: the /research surface (Research — the parallel-research primitive; a NEW Resources panel,
 * documented NORTH-STAR "Research · … · Tools · Skills · MCP-Apps" + the Manus pattern "decompose → parallel
 * research/exec → synthesize to ACTIONS"). Reachable via the SIDEBAR rail (real-user path, proves nav
 * wiring); renders the stat strip (runs · active · findings · avg duration) + a status filter + search +
 * run cards (depth · model · status · sources/findings/duration) with a per-active CANCEL action. Distinct
 * from /agents (the workers that launch research) + /tasks (the generic tracker). The SIGNATURE
 * interactions: a status pill + search narrow the runs, and "Cancel" stops an in-flight run (one fewer
 * Cancel button). Cross-links Agents. "Preview · sample data". BA-authed, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a run + the parallel-research detail + honesty.
const NEEDLES = [
  /sample data/i,                                      // honest "Preview · sample data"
  /research/i,                                         // the page
  /\b(researching|synthesizing|done|failed)\b/i,       // the status filter / statuses
  /coffee|competitors|pricing|keyword/i,               // real sample research questions
  /sources|findings/i,                                 // the parallel-research detail line
  /quick|standard|deep/i,                              // the research-depth chip
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

// Return to an authed surface with the rail, then click the Research rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Research", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/research/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every run card (depth/model/status + sources/findings + Cancel) visible for the vision read.
await page.screenshot({ path: "scripts/.research-proof.png", fullPage: true });

// cross-link to Agents.
const agentsLink = await page.getByRole("button", { name: /^Agents/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Research runs"] article').count();
const countCancel = () => page.getByRole("button", { name: "Cancel", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a status pill narrows the runs. All → Done (fewer, >0).
let countDone = countAll;
const donePill = page.getByRole("button", { name: /^Done/ }).first();
if (await donePill.count().then((c) => c > 0).catch(() => false)) {
  await donePill.click().catch(() => {});
  await page.waitForTimeout(400);
  countDone = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countDone > 0 && countDone < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a question fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search research/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("coffee");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Cancel" stops an in-flight run (one fewer Cancel button).
let cancelWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const cancelBefore = await countCancel().catch(() => 0);
const firstCancel = page.getByRole("button", { name: "Cancel", exact: true }).first();
if (cancelBefore > 0 && (await firstCancel.count().then((c) => c > 0).catch(() => false))) {
  await firstCancel.click().catch(() => {});
  await page.waitForTimeout(400);
  const cancelAfter = await countCancel().catch(() => cancelBefore);
  cancelWorks = cancelAfter === cancelBefore - 1;
}

await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countDone, countSearch, cancelBefore, statusFilterWorks, searchWorks, cancelWorks, agentsLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Research reachable from the sidebar rail", "no Research rail link (nav wiring missing)");
check(onPath, "Research rail click → /research", "rail click did not reach /research");
check(renders, "Research content renders (stats + status filter + runs + sources/findings + honesty label)", `content missing: ${missing.join(", ")}`);
check(statusFilterWorks, `Status filter narrows the runs (All ${countAll} → Done ${countDone})`, "status pill did not narrow the runs");
check(searchWorks, `Search narrows the runs (All ${countAll} → "coffee" ${countSearch})`, "search did not narrow the runs");
check(cancelWorks, `Cancel stops an in-flight run (Cancel buttons ${cancelBefore} → ${cancelBefore - 1})`, "cancel did not stop a run");
check(agentsLink, "Cross-link to Agents present (interconnect)", "no Agents cross-link");
check(realErrors.length === 0, "0 console errors on /research", `${realErrors.length} console errors`);
console.log(ok ? "✅ RESEARCH GREEN" : "❌ research check failed");
process.exit(ok ? 0 : 1);
