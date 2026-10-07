#!/usr/bin/env node
/**
 * WS-DEMO: the /skills surface (Agent Skills — the reusable-capability REGISTRY; a NEW Resources panel,
 * documented ULTIMATE-REQUIREMENTS #29 agent object model "…model policy, SKILLS, knowledge, …, TOOLS…"
 * where skills ≠ tools ≠ knowledge + "Agent Skills · Claude Code/OpenCode"). Reachable via the SIDEBAR rail
 * (real-user path, proves nav wiring); renders the stat strip (skills · enabled · invocations · avg success)
 * + a category filter + search + skill cards (category · description · agents/invocations/success) with a
 * per-skill ENABLE/DISABLE toggle. Distinct from /tools (low-level tools) + /context (authoring) + /mcp
 * (protocol servers). The SIGNATURE interactions: a category pill + search narrow the skills, and Disable
 * toggles a skill off (one fewer Disable button). Cross-links Tools. "Preview · sample data". BA-authed, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + category filter + a skill + the usage analytics + honesty.
const NEEDLES = [
  /sample data/i,                                    // honest "Preview · sample data"
  /agent skills/i,                                   // the page
  /\b(research|writing|sales|support|ops)\b/i,       // the category filter / categories
  /summarize|triage|qualify|invoice/i,               // real sample skill names
  /invocation|runs|success/i,                        // the usage analytics
  /reusable|capabilit/i,                             // the "reusable capability" framing
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

// Return to an authed surface with the rail, then click the Agent Skills rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Agent Skills", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/skills/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every skill card (category/metrics + toggle) visible for the vision read.
await page.screenshot({ path: "scripts/.skills-proof.png", fullPage: true });

// cross-link to Tools.
const toolsLink = await page.getByRole("button", { name: /^Tools/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Agent skills"] article').count();
const countDisable = () => page.getByRole("button", { name: "Disable", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a category pill narrows the skills. All → Writing (fewer, >0).
let countWriting = countAll;
const writingPill = page.getByRole("button", { name: /^Writing/ }).first();
if (await writingPill.count().then((c) => c > 0).catch(() => false)) {
  await writingPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countWriting = await countRows().catch(() => countAll);
}
const categoryFilterWorks = countAll > 0 && countWriting > 0 && countWriting < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a name fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search skills/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("invoice");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Disable" toggles a skill off (one fewer Disable button).
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

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countWriting, countSearch, disableBefore, categoryFilterWorks, searchWorks, toggleWorks, toolsLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Agent Skills reachable from the sidebar rail", "no Agent Skills rail link (nav wiring missing)");
check(onPath, "Agent Skills rail click → /skills", "rail click did not reach /skills");
check(renders, "Agent Skills content renders (stats + category filter + skills + invocations/success + honesty label)", `content missing: ${missing.join(", ")}`);
check(categoryFilterWorks, `Category filter narrows the skills (All ${countAll} → Writing ${countWriting})`, "category pill did not narrow the skills");
check(searchWorks, `Search narrows the skills (All ${countAll} → "invoice" ${countSearch})`, "search did not narrow the skills");
check(toggleWorks, `Disable toggles a skill off (Disable buttons ${disableBefore} → ${disableBefore - 1})`, "disable did not toggle a skill off");
check(toolsLink, "Cross-link to Tools present (interconnect)", "no Tools cross-link");
check(realErrors.length === 0, "0 console errors on /skills", `${realErrors.length} console errors`);
console.log(ok ? "✅ SKILLS GREEN" : "❌ skills check failed");
process.exit(ok ? 0 : 1);
