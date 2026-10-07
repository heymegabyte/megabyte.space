#!/usr/bin/env node
/**
 * WS-DEMO: the /sandboxes surface (Cloudflare Sandboxes — the execution ladder's T3, isolated code
 * execution; a NEW Resources panel, documented ULTIMATE-REQUIREMENTS §7/§12/§50). Reachable via the
 * SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip (runs · running · failed · avg
 * duration) + a language filter + search + the run cards (language · status · trigger · duration · CPU/mem
 * · exit) with a per-running KILL action. Distinct from /compute (T1 runtime) + /environments + /browser-
 * runs (T4). The SIGNATURE interactions: a language pill + search narrow the runs, and "Kill" terminates a
 * running sandbox (one fewer Kill button). Cross-links Compute. "Preview · sample data". BA-authed, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + language filter + a run + resources + exit + honesty.
const NEEDLES = [
  /sample data/i,                                 // honest "Preview · sample data"
  /sandboxes/i,                                   // the page
  /\b(python|node|typescript|bash)\b/i,           // the language filter / languages
  /parse-invoice|train-classifier|render-chart/i, // real sample run labels
  /cpu|mem|exit/i,                                 // the resource metering
  /running|succeeded|avg duration/i,               // the stat strip / statuses
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

// Return to an authed surface with the rail, then click the Sandboxes rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Sandboxes", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/sandboxes/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every run card (language/status + resources + Kill) visible for the vision read.
await page.screenshot({ path: "scripts/.sandboxes-proof.png", fullPage: true });

// cross-link to Compute.
const computeLink = await page.getByRole("button", { name: /^Compute/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Sandbox runs"] article').count();
const countKill = () => page.getByRole("button", { name: "Kill", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a language pill narrows the runs. All → Python (fewer, >0).
let countPy = countAll;
const pyPill = page.getByRole("button", { name: /^Python/ }).first();
if (await pyPill.count().then((c) => c > 0).catch(() => false)) {
  await pyPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countPy = await countRows().catch(() => countAll);
}
const languageFilterWorks = countAll > 0 && countPy > 0 && countPy < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a label fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search runs/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("webhook");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Kill" terminates a running sandbox (one fewer Kill button).
let killWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const killBefore = await countKill().catch(() => 0);
const firstKill = page.getByRole("button", { name: "Kill", exact: true }).first();
if (killBefore > 0 && (await firstKill.count().then((c) => c > 0).catch(() => false))) {
  await firstKill.click().catch(() => {});
  await page.waitForTimeout(400);
  const killAfter = await countKill().catch(() => killBefore);
  killWorks = killAfter === killBefore - 1;
}

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countPy, countSearch, killBefore, languageFilterWorks, searchWorks, killWorks, computeLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Sandboxes reachable from the sidebar rail", "no Sandboxes rail link (nav wiring missing)");
check(onPath, "Sandboxes rail click → /sandboxes", "rail click did not reach /sandboxes");
check(renders, "Sandboxes content renders (stats + language filter + runs + CPU/mem/exit + honesty label)", `content missing: ${missing.join(", ")}`);
check(languageFilterWorks, `Language filter narrows the runs (All ${countAll} → Python ${countPy})`, "language pill did not narrow the runs");
check(searchWorks, `Search narrows the runs (All ${countAll} → "webhook" ${countSearch})`, "search did not narrow the runs");
check(killWorks, `Kill terminates a running sandbox (Kill buttons ${killBefore} → ${killBefore - 1})`, "kill did not terminate a run");
check(computeLink, "Cross-link to Compute present (interconnect)", "no Compute cross-link");
check(realErrors.length === 0, "0 console errors on /sandboxes", `${realErrors.length} console errors`);
console.log(ok ? "✅ SANDBOXES GREEN" : "❌ sandboxes check failed");
process.exit(ok ? 0 : 1);
