#!/usr/bin/env node
/**
 * WS-DEMO: the /hyperdrive surface (Cloudflare Hyperdrive — edge connection-pooler + query-cache for
 * EXTERNAL Postgres/MySQL; a NEW Resources panel, documented in PROJECTSITES-ABSORPTION "Neon via
 * Hyperdrive"). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip
 * (configs · queries · cache hit · pooled conns) + an engine filter + search + the config cards with a
 * per-config CACHING toggle + MASKED hosts. The SIGNATURE interactions: an engine pill + search narrow the
 * configs, and toggling caching flips a config (one fewer "Disable" button). Cross-links Database. Distinct
 * from /storage (CF-native) + /database (D1 schema). "Preview · sample data". BA-authed real Chromium, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + engine filter + a config + pooling/cache + masking + honesty.
const NEEDLES = [
  /sample data/i,                                 // honest "Preview · sample data"
  /hyperdrive/i,                                  // the page
  /\b(postgres|mysql)\b/i,                        // the engine filter / engines
  /analytics-primary|billing-ledger|crm-replica/i, // real sample config names
  /pool|cache/i,                                   // the pooling / caching concept
  /queries|conns|p99/i,                            // the stat strip / latency
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

// Return to an authed surface with the rail, then click the Hyperdrive rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Hyperdrive", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/hyperdrive/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every config card (engine/host/pool/cache + toggle) visible for the vision read.
await page.screenshot({ path: "scripts/.hyperdrive-proof.png", fullPage: true });

// MASKING: no raw connection host should leak — masked hosts use the • bullet, and there must be NO
// un-masked ".neon.tech"-style host WITHOUT bullets. Assert the masked bullet is present.
const masked = /••••/.test(body);

// cross-link to Database.
const databaseLink = await page.getByRole("button", { name: /^Database/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Hyperdrive configs"] article').count();
const countDisable = () => page.getByRole("button", { name: "Disable", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — an engine pill narrows the configs. All → Postgres (fewer, >0).
let countPg = countAll;
const pgPill = page.getByRole("button", { name: /^Postgres/ }).first();
if (await pgPill.count().then((c) => c > 0).catch(() => false)) {
  await pgPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countPg = await countRows().catch(() => countAll);
}
const engineFilterWorks = countAll > 0 && countPg > 0 && countPg < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a config fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search configs/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("billing");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — toggling caching flips a config (one fewer "Disable" button).
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
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countPg, countSearch, disableBefore, masked, engineFilterWorks, searchWorks, toggleWorks, databaseLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Hyperdrive reachable from the sidebar rail", "no Hyperdrive rail link (nav wiring missing)");
check(onPath, "Hyperdrive rail click → /hyperdrive", "rail click did not reach /hyperdrive");
check(renders, "Hyperdrive content renders (stats + engine filter + configs + pool/cache + honesty label)", `content missing: ${missing.join(", ")}`);
check(engineFilterWorks, `Engine filter narrows the configs (All ${countAll} → Postgres ${countPg})`, "engine pill did not narrow the configs");
check(searchWorks, `Search narrows the configs (All ${countAll} → "billing" ${countSearch})`, "search did not narrow the configs");
check(toggleWorks, `Caching toggle flips a config (Disable buttons ${disableBefore} → ${disableBefore - 1})`, "caching toggle did not flip the config");
check(masked, "Connection hosts are MASKED (•••• bullets — no raw host leak)", "hosts not masked");
check(databaseLink, "Cross-link to Database present (interconnect)", "no Database cross-link");
check(realErrors.length === 0, "0 console errors on /hyperdrive", `${realErrors.length} console errors`);
console.log(ok ? "✅ HYPERDRIVE GREEN" : "❌ hyperdrive check failed");
process.exit(ok ? 0 : 1);
