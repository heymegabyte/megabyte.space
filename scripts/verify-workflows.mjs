#!/usr/bin/env node
/**
 * WS-DEMO: the /workflows surface (durable multi-step automation — Cloudflare Workflows; a NEW
 * Resources panel, ULTIMATE-REQUIREMENTS §8/§44). Reachable via the SIDEBAR rail (real-user path,
 * proves nav wiring); renders the stat strip + status filter + search + a workflow list + the selected
 * workflow's STEP PIPELINE. The SIGNATURE interactions: a status pill + search narrow the list,
 * clicking a workflow opens its step pipeline, and the surface links to Automations (triggers).
 * "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a workflow + steps + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bworkflows\b/i,            // the page
  /\b(active|paused|failed)\b/i, // the status filter / statuses
  /lead-onboarding|media-pipeline/i, // real sample workflow names
  /\bsteps\b/i,                // the step pipeline
  /instances|success/i,        // the stat strip
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

// Return to an authed surface with the rail, then click the Workflows rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Workflows", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/workflows/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Workflows list"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — workflow→detail drill-in opens the step pipeline. Default lead-onboarding → nightly-export.
let drillInWorks = false, stepsRender = false;
const row = page.getByRole("button", { name: "Workflow: nightly-export" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Workflow: nightly-export"]').count().then((c) => c > 0).catch(() => false);
  // the nightly-export pipeline includes an "Upload to S3" step → proves the step pipeline rendered.
  const body2 = await page.evaluate(() => document.body.innerText);
  stepsRender = /Upload to S3/i.test(body2);
}

// INTERACTIVE 2 — a status pill narrows the list. All → Active (fewer, >0).
let countActive = countAll;
const activePill = page.getByRole("button", { name: /^Active/ }).first();
if (await activePill.count().then((c) => c > 0).catch(() => false)) {
  await activePill.click().catch(() => {});
  await page.waitForTimeout(400);
  countActive = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countActive > 0 && countActive < countAll;

// INTERACTIVE 3 — search narrows. Reset to All, type a workflow fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search workflows/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("media");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 4 — the "Triggers" cross-link to /automations (interconnect).
const triggersLink = await page.getByRole("button", { name: /^Triggers/ }).count().then((c) => c > 0).catch(() => false);

await page.screenshot({ path: "scripts/.workflows-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countActive, countSearch, drillInWorks, stepsRender, statusFilterWorks, searchWorks, triggersLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Workflows reachable from the sidebar rail", "no Workflows rail link (nav wiring missing)");
check(onPath, "Workflows rail click → /workflows", "rail click did not reach /workflows");
check(renders, "Workflows content renders (stats + status filter + workflows + steps + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Workflow click opens its detail (lead-onboarding → nightly-export)", "detail did not switch");
check(stepsRender, "The step pipeline renders for the selected workflow (Upload to S3)", "step pipeline did not render");
check(statusFilterWorks, `Status filter narrows the list (All ${countAll} → Active ${countActive})`, "status pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "media" ${countSearch})`, "search did not narrow the list");
check(triggersLink, "Cross-link to Automations (Triggers) present (interconnect)", "no Triggers cross-link");
check(realErrors.length === 0, "0 console errors on /workflows", `${realErrors.length} console errors`);
console.log(ok ? "✅ WORKFLOWS GREEN" : "❌ workflows check failed");
process.exit(ok ? 0 : 1);
