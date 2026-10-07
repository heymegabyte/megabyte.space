#!/usr/bin/env node
/**
 * fire-224: the Editor right-pane "Resources" launchpad renders in a REAL browser.
 *
 * The existing gate scripts/verify-resources-launchpad.mjs is STATIC (source-level: no-dead-links +
 * /admin-sync + a ≥50-card count ratchet) — it never opens a browser. This is the missing BROWSER proof:
 * BA-authed, open a real workspace (the editor), click the Resources right-pane tab, and assert the
 * ResourcesPanel grid is actually VISIBLE with ≥50 cards + 0 console errors. Complements (does not
 * replace) the static gate — the static one proves the SOURCE is coherent, this proves it RENDERS.
 *
 * BA-authed real Chromium, PROD. Needs BA creds (get-secret BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }
const MIN_CARDS = 50; // the fire-223 ratchet floor (the static gate asserts the same); actual is 51.

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
// Benign capnweb WebSocket-close on nav (fire-157/159) — the only known non-defect console noise.
const IGNORE = /WebSocket is already in (CLOSING|CLOSED)/i;
page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => { if (!IGNORE.test(String(e))) errors.push(String(e)); });

// 1 — BA login (the testing bypass).
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);

// 2 — open a real workspace (the editor) via the /gadgets table (real-user nav, not a direct goto).
await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForFunction(
  () => document.querySelector("tbody tr") !== null || /gadgets?\b/i.test(document.body.innerText),
  { timeout: 20000 },
).catch(() => {});
await page.waitForTimeout(1200);
let openedWorkspace = false;
const openLink = page.getByRole("link", { name: /^Open / }).first();
if (await openLink.count().then((c) => c > 0).catch(() => false)) {
  await openLink.click().catch(() => {});
  await page.waitForTimeout(3000);
  openedWorkspace = /\/workspace\//.test(page.url());
}

// 3 — click the Resources right-pane tab (a PaneTab <button>; rail entries are links, so this is unique).
let tabClicked = false;
const resourcesTab = page.getByRole("button", { name: /^Resources/ }).first();
await resourcesTab.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
if (await resourcesTab.count().then((c) => c > 0).catch(() => false)) {
  await resourcesTab.click().catch(() => {});
  tabClicked = true;
  await page.waitForTimeout(800);
}

// 4 — the ResourcesPanel grid is VISIBLE (not display:none) with ≥MIN_CARDS cards.
const grid = page.locator('[data-testid="resources-grid"]');
await grid.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
const gridVisible = await grid.isVisible().catch(() => false);
const cardCount = await grid.locator("li").count().catch(() => 0);

// Honesty: the launchpad's real content renders (proves it's the live panel, not a stub).
const body = await page.evaluate(() => document.body.innerText).catch(() => "");
const hasLaunchpad = /\bResources\b/.test(body) && /\b(Models|Connections|Storage|Compute)\b/.test(body);

await page.screenshot({ path: "scripts/.resources-panel-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ openedWorkspace, tabClicked, gridVisible, cardCount, minCards: MIN_CARDS, hasLaunchpad, finalUrl: page.url().replace(APEX, ""), consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(openedWorkspace, "Opened a workspace (editor) from the /gadgets table", "could not open a workspace from the gadgets table");
check(tabClicked, "Clicked the Resources right-pane tab", "no Resources tab button found in the editor");
check(gridVisible, "ResourcesPanel grid is VISIBLE after activating the tab", "resources-grid not visible (tab did not reveal the panel)");
check(cardCount >= MIN_CARDS, `ResourcesPanel renders ${cardCount} cards (≥${MIN_CARDS} floor)`, `only ${cardCount} cards rendered (<${MIN_CARDS})`);
check(hasLaunchpad, "Resources launchpad content present (Models/Connections/Storage/Compute)", "launchpad content missing");
check(errors.length === 0, "0 console errors in the editor Resources panel", `${errors.length} console errors`);
console.log(ok ? "✅ RESOURCES-PANEL GREEN" : "❌ resources-panel check failed");
process.exit(ok ? 0 : 1);
