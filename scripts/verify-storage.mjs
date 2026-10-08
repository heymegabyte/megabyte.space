#!/usr/bin/env node
/**
 * WS-DEMO: the /storage surface (durable data gadgets provision — the ResourcesPanel "Storage" card:
 * D1 · KV · R2). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat
 * strip + type filter + search + a store list + the selected store's detail (size/items/usage/region
 * + a usage bar; D1 stores link to Database Studio). The SIGNATURE interactions: a type pill + search
 * narrow the list, clicking a store opens its detail. Clearly labeled "Preview · sample data".
 * BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + type filter + a store + size/usage + honesty label.
const NEEDLES = [
  /sample stores/i,            // honest hybrid chip "Live workspaces · sample stores" — never lies-empty
  /\bstorage\b/i,              // the page
  /\b(d1|kv|r2)\b/i,           // the type filter / types
  /leads|media-uploads/i,      // real sample store names
  /\b(GB|MB|KB)\b/,            // formatted sizes
  /usage|near limit/i,         // the usage concept
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

// Return to an authed surface with the rail, then click the Storage rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Storage", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/storage/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// surfaceAccent prod net (fire-245): the near-limit store (media-uploads 83%) carries a warning
// left-border — keyed on the same NEAR_LIMIT_PERCENT as nearLimitCount + the per-row warning dot.
const accents = await countAccentBorders(page, 'section[aria-label="Stores"]');
const accentBordersRender = accents.warning >= 1;

// DEPTH (fire-224): the live "your workspaces provisioning storage" band renders one of its fail-soft
// states — running for the ba-e2e account (≥1 gadget). Proves the real listGadgets wiring (the STORAGE-
// OWNER lens on gadgets), not just the sample store list.
const liveBand = /Checking your workspaces|Storage owners unavailable|No workspaces yet|\d+\s+workspaces?\s+provisioning storage/i.test(body);

const countRows = () => page.locator('section[aria-label="Stores"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — store→detail drill-in. Default detail = click-counter-db; click leads (a D1 store).
let drillInWorks = false, browseLinkPresent = false;
const row = page.getByRole("button", { name: "Store: leads" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  drillInWorks = await page.locator('aside[aria-label="Store: leads"]').count().then((c) => c > 0).catch(() => false);
  // leads is D1 → its detail offers "Browse schema" → /database (interconnection; present, not clicked).
  browseLinkPresent = await page.getByRole("button", { name: /Browse schema/ }).count().then((c) => c > 0).catch(() => false);
}

// INTERACTIVE 2 — a type pill narrows the list. All → D1 (fewer, >0).
let countD1 = countAll;
const d1Pill = page.getByRole("button", { name: /^D1/ }).first();
if (await d1Pill.count().then((c) => c > 0).catch(() => false)) {
  await d1Pill.click().catch(() => {});
  await page.waitForTimeout(400);
  countD1 = await countRows().catch(() => countAll);
}
const typeFilterWorks = countAll > 0 && countD1 > 0 && countD1 < countAll;

// INTERACTIVE 3 — search narrows. Reset to All, type a store fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search storage/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("media");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 4 (fire-277) — R2 bucket → OBJECT browser drill-in. Click an R2 store (media-uploads);
// its detail opens an OBJECT browser (key · kind · size · modified). A key filter narrows; clicking an
// object opens its metadata dialog (copyable key + r2:// URI). D1 stores link to the schema instead.
let r2DetailOpens = false, objectRows = 0, objectFilterWorks = false, objectDialogOpens = false;
const r2Row = page.getByRole("button", { name: "Store: media-uploads" }).first();
if (await r2Row.count().then((c) => c > 0).catch(() => false)) {
  await r2Row.click().catch(() => {});
  await page.waitForTimeout(500);
  const r2Aside = page.locator('aside[aria-label="Store: media-uploads"]');
  const asidePresent = await r2Aside.count().then((c) => c > 0).catch(() => false);
  const asideText = asidePresent ? await r2Aside.innerText().catch(() => "") : "";
  r2DetailOpens = asidePresent && /Objects/.test(asideText) && /objects ·/i.test(asideText);

  const objList = page.locator('ul[aria-label="Objects in media-uploads"]');
  objectRows = await objList.locator("li").count().catch(() => 0);

  const objSearch = page.getByRole("searchbox", { name: /filter objects in media-uploads/i }).first();
  if (await objSearch.count().then((c) => c > 0).catch(() => false)) {
    await objSearch.fill("heroes");
    await page.waitForTimeout(400);
    const objFiltered = await objList.locator("li").count().catch(() => 0);
    objectFilterWorks = objectRows > 0 && objFiltered > 0 && objFiltered < objectRows;
    await objSearch.fill("");
    await page.waitForTimeout(200);
  }

  const firstObj = objList.getByRole("button").first();
  if (await firstObj.count().then((c) => c > 0).catch(() => false)) {
    await firstObj.click().catch(() => {});
    await page.waitForTimeout(400);
    const dlg = await page.evaluate(() => document.body.innerText);
    objectDialogOpens = /Copy r2:\/\/ URI/i.test(dlg) && /Content-Type/i.test(dlg);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(250);
  }
}

await page.screenshot({ path: "scripts/.storage-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countAll, countD1, countSearch, drillInWorks, browseLinkPresent, typeFilterWorks, searchWorks, r2DetailOpens, objectRows, objectFilterWorks, objectDialogOpens, accents, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Storage reachable from the sidebar rail", "no Storage rail link (nav wiring missing)");
check(onPath, "Storage rail click → /storage", "rail click did not reach /storage");
check(renders, "Storage content renders (stats + type filter + stores + size/usage + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'your workspaces provisioning storage' band renders (listGadgets DEPTH, fail-soft)", "live storage-owners band missing — listGadgets DEPTH not wired");
check(drillInWorks, "Store click opens its detail (click-counter-db → leads)", "detail did not switch");
check(browseLinkPresent, "D1 store detail links to Database Studio (Browse schema)", "no Browse-schema link on the D1 store detail");
check(typeFilterWorks, `Type filter narrows the list (All ${countAll} → D1 ${countD1})`, "type pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "media" ${countSearch})`, "search did not narrow the list");
check(realErrors.length === 0, "0 console errors on /storage", `${realErrors.length} console errors`);
check(accentBordersRender, `Near-limit store carries a warning accent border (warning ${accents.warning})`, `surfaceAccent border missing on /storage (warning ${accents.warning})`);
check(r2DetailOpens, "R2 store detail opens an Objects browser (media-uploads → Objects header + summary)", "R2 store did not open an object browser");
check(objectRows >= 5, `R2 object browser lists objects (media-uploads ${objectRows} rows)`, `too few object rows (${objectRows})`);
check(objectFilterWorks, "R2 object key filter narrows the list ('heroes')", "object key filter did not narrow the list");
check(objectDialogOpens, "R2 object click opens its metadata dialog (Content-Type + Copy r2:// URI)", "object detail dialog did not open");
console.log(ok ? "✅ STORAGE GREEN" : "❌ storage check failed");
process.exit(ok ? 0 : 1);
