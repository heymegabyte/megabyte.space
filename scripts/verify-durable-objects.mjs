#!/usr/bin/env node
/**
 * WS-DEMO: the /durable-objects surface (stateful coordination — a NEW Resources panel, ULTIMATE-REQ
 * §8 "DO SQLite per-entity"). Reachable via the SIDEBAR rail (real-user path, proves nav wiring);
 * renders the stat strip + a status filter + search + a namespace list + the selected namespace's
 * sample INSTANCES. The SIGNATURE interactions: a status pill + search narrow the list, clicking a
 * namespace shows its instances, and the surface cross-links to Storage + Compute.
 * "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a class + instances + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /durable objects/i,          // the page
  /\b(active|idle|hibernated)\b/i, // the status filter / statuses
  /ChatRoom|RateLimiter/,      // real sample DO class names
  /instances|stateful/i,       // the detail / framing
  /namespaces|sqlite/i,        // the stat strip / backing store
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

// Return to an authed surface with the rail, then click the Durable Objects rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Durable Objects", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/durable-objects/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Durable Objects"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — namespace→detail drill-in shows the instances. ChatRoom → CounterDO.
let drillInWorks = false, instancesRender = false;
const row = page.getByRole("button", { name: "Namespace: CounterDO" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Namespace: CounterDO"]').count().then((c) => c > 0).catch(() => false);
  // CounterDO has a "counter:global" instance → proves the instances rendered.
  const body2 = await page.evaluate(() => document.body.innerText);
  instancesRender = /counter:global/i.test(body2);
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

// INTERACTIVE 3 — search narrows. Reset to All, type a class fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search durable objects/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("chat");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 4 — Storage + Compute cross-links (interconnect).
const storageLink = await page.getByRole("button", { name: /^Storage/ }).count().then((c) => c > 0).catch(() => false);
const computeLink = await page.getByRole("button", { name: /^Compute/ }).count().then((c) => c > 0).catch(() => false);
const crossLinksPresent = storageLink && computeLink;

await page.screenshot({ path: "scripts/.durable-objects-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countActive, countSearch, drillInWorks, instancesRender, statusFilterWorks, searchWorks, crossLinksPresent, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Durable Objects reachable from the sidebar rail", "no Durable Objects rail link (nav wiring missing)");
check(onPath, "Durable Objects rail click → /durable-objects", "rail click did not reach /durable-objects");
check(renders, "Durable Objects content renders (stats + status filter + classes + instances + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Namespace click opens its detail (ChatRoom → CounterDO)", "detail did not switch");
check(instancesRender, "The namespace's instances render (counter:global)", "instances did not render");
check(statusFilterWorks, `Status filter narrows the list (All ${countAll} → Active ${countActive})`, "status pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "chat" ${countSearch})`, "search did not narrow the list");
check(crossLinksPresent, "Cross-links to Storage + Compute present (interconnect)", "missing Storage / Compute cross-links");
check(realErrors.length === 0, "0 console errors on /durable-objects", `${realErrors.length} console errors`);
console.log(ok ? "✅ DURABLE-OBJECTS GREEN" : "❌ durable-objects check failed");
process.exit(ok ? 0 : 1);
