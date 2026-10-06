#!/usr/bin/env node
/**
 * WS-DEMO: the /tools surface (the capability/TOOL registry — the §30 Tool/MCP layer; a NEW Resources
 * panel). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip
 * (incl. a LIVE connected-account count) + a category filter + search + the tool catalog cards with a
 * per-row Enable/Disable toggle. The SIGNATURE interactions: a category pill + search narrow the catalog,
 * and toggling a tool flips its enabled state (one fewer "Disable" button). It cross-links to Connections.
 * "Preview · sample catalog". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + category filter + a sample tool + kind + calls + honesty.
const NEEDLES = [
  /sample catalog/i,                                    // honest "Preview · sample catalog"
  /tools/i,                                             // the page
  /\b(web|communication|data|code|payments)\b/i,        // the category filter / categories
  /web search|send email|query database|create invoice/i, // real sample tool names
  /built-in|connection|mcp/i,                           // the kind chips (§30 chain)
  /calls today|enabled/i,                               // the usage / enabled rollup
  /AI providers/i,                                      // the 2nd LIVE stat — getAiConfig (fire-190 DEPTH)
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

// Return to an authed surface with the rail, then click the Tools rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Tools", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/tools/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every tool card (kind chips + Enable/Disable) visible for the vision read.
await page.screenshot({ path: "scripts/.tools-proof.png", fullPage: true });

// cross-link to Connections.
const connectionsLink = await page.getByRole("button", { name: /^Connections/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Tool catalog"] article').count();
const countDisable = () => page.getByRole("button", { name: "Disable", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a category pill narrows the catalog. All → Communication (fewer, >0).
let countComms = countAll;
const commsPill = page.getByRole("button", { name: /^Communication/ }).first();
if (await commsPill.count().then((c) => c > 0).catch(() => false)) {
  await commsPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countComms = await countRows().catch(() => countAll);
}
const categoryFilterWorks = countAll > 0 && countComms > 0 && countComms < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a source fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search tools/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("gmail");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — toggling a tool flips its enabled state (one fewer "Disable" button).
let toggleWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const disableBefore = await countDisable().catch(() => 0);
const firstDisable = page.getByRole("button", { name: "Disable", exact: true }).first();
if (disableBefore > 0 && (await firstDisable.count().then((c) => c > 0).catch(() => false))) {
  await firstDisable.click().catch(() => {});
  await page.waitForTimeout(400);
  const disableAfter = await countDisable().catch(() => disableBefore);
  toggleWorks = disableAfter === disableBefore - 1;
}

await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countComms, countSearch, disableBefore, categoryFilterWorks, searchWorks, toggleWorks, connectionsLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Tools reachable from the sidebar rail", "no Tools rail link (nav wiring missing)");
check(onPath, "Tools rail click → /tools", "rail click did not reach /tools");
check(renders, "Tools content renders (stats + category filter + catalog + kind chips + honesty label)", `content missing: ${missing.join(", ")}`);
check(categoryFilterWorks, `Category filter narrows the catalog (All ${countAll} → Communication ${countComms})`, "category pill did not narrow the catalog");
check(searchWorks, `Search narrows the catalog (All ${countAll} → "gmail" ${countSearch})`, "search did not narrow the catalog");
check(toggleWorks, `Toggle flips a tool's enabled state (Disable buttons ${disableBefore} → ${disableBefore - 1})`, "enable/disable toggle did not flip the tool");
check(connectionsLink, "Cross-link to Connections present (interconnect)", "no Connections cross-link");
check(realErrors.length === 0, "0 console errors on /tools", `${realErrors.length} console errors`);
console.log(ok ? "✅ TOOLS GREEN" : "❌ tools check failed");
process.exit(ok ? 0 : 1);
