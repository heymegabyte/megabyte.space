#!/usr/bin/env node
/**
 * WS-DEMO: the /environments surface (the Coder-inspired workspace-GOVERNANCE view — a NEW Resources
 * panel; Brian 2026-10-06 "source inspiration from Coder"). Reachable via the SIDEBAR rail (real-user
 * path, proves nav wiring); renders the stat strip + a lifecycle filter + search + the environment
 * cards (quota bars + budget + autostop ETA). The SIGNATURE interactions: a lifecycle pill + search
 * narrow the list, and "Stop idle" autostops every idle environment (idle count → 0). It cross-links to
 * Compute. "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + lifecycle filter + a sample env + quota/budget + honesty.
const NEEDLES = [
  /sample (data|governance)/i,                    // honest label — governance is sample (workspaces are LIVE)
  /your workspaces/i,                             // the LIVE workspaces band (fire-188 DEPTH)
  /environments/i,                                // the page
  /\b(running|idle|autostopped|provisioning)\b/i, // the lifecycle filter / states
  /lead-scorer|churn-winback|docs-rag/i,          // real sample environment names
  /quota/i,                                       // the quota meter
  /budget|autostop/i,                             // the budget cap / autostop governance
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

// Return to an authed surface with the rail, then click the Environments rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Environments", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/environments/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// cross-link to Compute.
const computeLink = await page.getByRole("button", { name: /^Compute/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Environment list"] article').count();
const countAll = await countRows().catch(() => 0);

// Proof in the ALL state — full page (the LIVE workspaces band at top + stat strip + every env card).
await page.screenshot({ path: "scripts/.environments-proof.png", fullPage: true });

// INTERACTIVE 1 — a lifecycle pill narrows the list. All → Running (fewer, >0).
let countRunning = countAll;
const runPill = page.getByRole("button", { name: /^Running/ }).first();
if (await runPill.count().then((c) => c > 0).catch(() => false)) {
  await runPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countRunning = await countRows().catch(() => countAll);
}
const lifecycleFilterWorks = countAll > 0 && countRunning > 0 && countRunning < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a name fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search environments/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("rag");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Stop idle" autostops every idle env (Idle count: >0 before → 0 after).
let stopIdleWorks = false;
const idlePill = () => page.getByRole("button", { name: /^Idle/ }).first();
async function idleCount() {
  const p = idlePill();
  if (!(await p.count().then((c) => c > 0).catch(() => false))) return -1;
  await p.click().catch(() => {});
  await page.waitForTimeout(350);
  return countRows().catch(() => -1);
}
const idleBefore = await idleCount();
// Reset to All, then click Stop idle.
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const stopBtn = page.getByRole("button", { name: /^Stop idle/ }).first();
if (idleBefore > 0 && (await stopBtn.count().then((c) => c > 0).catch(() => false))) {
  await stopBtn.click().catch(() => {});
  await page.waitForTimeout(500);
  const idleAfter = await idleCount();
  stopIdleWorks = idleAfter === 0;
}

await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countRunning, countSearch, idleBefore, lifecycleFilterWorks, searchWorks, stopIdleWorks, computeLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Environments reachable from the sidebar rail", "no Environments rail link (nav wiring missing)");
check(onPath, "Environments rail click → /environments", "rail click did not reach /environments");
check(renders, "Environments content renders (stats + lifecycle filter + cards + quota/budget + honesty label)", `content missing: ${missing.join(", ")}`);
check(lifecycleFilterWorks, `Lifecycle filter narrows the list (All ${countAll} → Running ${countRunning})`, "lifecycle pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "rag" ${countSearch})`, "search did not narrow the list");
check(stopIdleWorks, `Stop idle autostops every idle env (Idle ${idleBefore} → 0)`, "stop-idle did not clear the idle environments");
check(computeLink, "Cross-link to Compute present (interconnect)", "no Compute cross-link");
check(realErrors.length === 0, "0 console errors on /environments", `${realErrors.length} console errors`);
console.log(ok ? "✅ ENVIRONMENTS GREEN" : "❌ environments check failed");
process.exit(ok ? 0 : 1);
