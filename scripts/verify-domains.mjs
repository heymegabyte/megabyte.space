#!/usr/bin/env node
/**
 * WS-DEMO: the /domains surface (custom routes gadgets serve — the ResourcesPanel "Domains" card:
 * *.megabyte.space + brought-your-own domains, with DNS + SSL + traffic). Reachable via the SIDEBAR
 * rail (real-user path, proves nav wiring); renders the stat strip + status filter + search + domain
 * list. The SIGNATURE interactions: a status pill narrows the list, search narrows it, and "Add
 * domain" opens a composer that provisions a new pending domain. Clearly labeled "Preview · sample
 * data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + hosts + SSL + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bdomains\b/i,              // the page
  /\b(active|pending|error)\b/i, // the status filter / statuses
  /\bssl\b/i,                  // SSL state on each row
  /megabyte\.space|acme\.com/i, // real sample hosts
  /req 24h|requests/i,         // the traffic column / stat
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

// Return to an authed surface with the rail, then click the Domains rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Domains", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/domains/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// surfaceAccent prod net (fire-245): error domains carry a danger left-border + pending-DNS ones a
// warning border (active stays quiet) — the shared per-status row-accent.
const accents = await countAccentBorders(page, 'section[aria-label="Domains"]');
const accentBordersRender = accents.danger >= 1 && accents.warning >= 1;

const countRows = () => page.locator('section[aria-label="Domains"] li').count();

// INTERACTIVE 1 — a status pill narrows the list. All → Active (fewer, >0).
const countAll = await countRows().catch(() => 0);
let countActive = countAll;
const activePill = page.getByRole("button", { name: /^Active/ }).first();
if (await activePill.count().then((c) => c > 0).catch(() => false)) {
  await activePill.click().catch(() => {});
  await page.waitForTimeout(400);
  countActive = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countActive > 0 && countActive < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a host fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search domains/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("acme");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill(""); // restore
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Add domain" composer provisions a new pending domain (count increases).
let addWorks = false;
const addBtn = page.getByRole("button", { name: /Add domain/ }).first();
if (await addBtn.count().then((c) => c > 0).catch(() => false)) {
  await addBtn.click().catch(() => {});
  await page.waitForTimeout(300);
  const input = page.getByRole("textbox", { name: /new domain/i }).first();
  if (await input.count().then((c) => c > 0).catch(() => false)) {
    await input.fill("shop.verify-probe.com");
    const confirm = page.getByRole("button", { name: "Add", exact: true }).first();
    await confirm.click().catch(() => {});
    await page.waitForTimeout(500);
    const countAfter = await countRows().catch(() => countAll);
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    addWorks = countAfter === countAll + 1 && /shop\.verify-probe\.com/.test(bodyAfter) && /pending/i.test(bodyAfter);
  }
}

await page.screenshot({ path: "scripts/.domains-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countActive, countSearch, statusFilterWorks, searchWorks, addWorks, accents, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Domains reachable from the sidebar rail", "no Domains rail link (nav wiring missing)");
check(onPath, "Domains rail click → /domains", "rail click did not reach /domains");
check(renders, "Domains content renders (stats + status filter + hosts + SSL + honesty label)", `content missing: ${missing.join(", ")}`);
check(statusFilterWorks, `Status filter narrows the list (All ${countAll} → Active ${countActive})`, "status pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "acme" ${countSearch})`, "search did not narrow the list");
check(addWorks, "Add-domain composer provisions a new pending domain (row count +1)", "add-domain did not add a pending row");
check(realErrors.length === 0, "0 console errors on /domains", `${realErrors.length} console errors`);
check(accentBordersRender, `Error + pending domains carry accent borders (danger ${accents.danger} + warning ${accents.warning})`, `surfaceAccent borders missing on /domains (danger ${accents.danger}, warning ${accents.warning})`);
console.log(ok ? "✅ DOMAINS GREEN" : "❌ domains check failed");
process.exit(ok ? 0 : 1);
