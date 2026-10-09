#!/usr/bin/env node
/**
 * WS-DEMO: the /sources surface (Sources — the sync-connector manifest behind the knowledge layer; a NEW
 * Resources panel, documented primitive list "Knowledge · Sources · Artifacts"). The external systems the OS
 * syncs from (Notion / GitHub / Zendesk / Drive / PostHog / crawls), each with ingest health, cadence +
 * records. Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip
 * (sources · healthy · records · syncing) + a kind filter + search + source cards (kind · status · records ·
 * frequency · last-sync) with a per-source "Sync now" action. Distinct from /connections (OAuth accounts) +
 * /knowledge (synced entries). The SIGNATURE interactions: a kind pill + search narrow the sources, and
 * "Sync now" kicks a connector into syncing (one fewer Sync-now button). Cross-links Knowledge. BA-authed.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + kind filter + a source + the ingest metrics + honesty.
const NEEDLES = [
  /sample sync/i,                                    // honest hybrid "Live accounts · sample sync" (DEPTH fire-202)
  /sources/i,                                        // the page
  /\b(docs|code|support|analytics|crawl)\b/i,        // the kind filter / kinds
  /notion|github|zendesk|posthog/i,                  // real sample source names
  /records|synced/i,                                 // the ingest metrics
  /hourly|daily|realtime/i,                          // the sync cadence
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

// Return to an authed surface with the rail, then click the Sources rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Sources", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/sources/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH (fire-202): the LIVE connected-accounts band renders (real listConnectedAccounts, fail-soft — the
// band header is always present regardless of whether the account has 0 or N connected accounts).
const liveBand = /your connected accounts/i.test(body);

// Proof in the ALL state — every source card (kind/status + records/cadence + Sync now) visible for the vision read.
await page.screenshot({ path: "scripts/.sources-proof.png", fullPage: true });

// cross-link to Knowledge.
const knowledgeLink = await page.getByRole("button", { name: /^Knowledge/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Sources"] article').count();
const countSync = () => page.getByRole("button", { name: "Sync now", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a kind pill narrows the sources. All → Docs (fewer, >0).
let countDocs = countAll;
const docsPill = page.getByRole("button", { name: /^Docs/ }).first();
if (await docsPill.count().then((c) => c > 0).catch(() => false)) {
  await docsPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countDocs = await countRows().catch(() => countAll);
}
const kindFilterWorks = countAll > 0 && countDocs > 0 && countDocs < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a name fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search sources/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("posthog");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Sync now" kicks a connector into syncing (one fewer Sync-now button).
let syncWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const syncBefore = await countSync().catch(() => 0);
const firstSync = page.getByRole("button", { name: "Sync now", exact: true }).first();
if (syncBefore > 0 && (await firstSync.count().then((c) => c > 0).catch(() => false))) {
  await firstSync.click().catch(() => {});
  await page.waitForTimeout(400);
  const syncAfter = await countSync().catch(() => syncBefore);
  syncWorks = syncAfter === syncBefore - 1;
}

// INTERACTIVE 4 — expand a source reveals its sync log (runs + outcomes + an error note) (fire-296).
let expandWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const expandBtn = page.getByRole("button", { name: /Google Drive/i }).first();
if (await expandBtn.count().then((c) => c > 0).catch(() => false)) {
  await expandBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const detail = await page.evaluate(() => document.body.innerText);
  expandWorks =
    /Sync log/i.test(detail) &&
    /partial/i.test(detail) &&                 // an outcome only present in the sync log
    /files skipped|permission/i.test(detail);  // an actual error note
}

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, liveBand, countAll, countDocs, countSearch, syncBefore, kindFilterWorks, searchWorks, syncWorks, expandWorks, knowledgeLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Sources reachable from the sidebar rail", "no Sources rail link (nav wiring missing)");
check(onPath, "Sources rail click → /sources", "rail click did not reach /sources");
check(renders, "Sources content renders (stats + kind filter + sources + records/cadence + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live connected-accounts band renders (real listConnectedAccounts, DEPTH)", "no live connected-accounts band");
check(kindFilterWorks, `Kind filter narrows the sources (All ${countAll} → Docs ${countDocs})`, "kind pill did not narrow the sources");
check(searchWorks, `Search narrows the sources (All ${countAll} → "posthog" ${countSearch})`, "search did not narrow the sources");
check(syncWorks, `Sync now kicks a connector into syncing (Sync-now buttons ${syncBefore} → ${syncBefore - 1})`, "sync-now did not move a connector into syncing");
check(expandWorks, "Expand-row reveals the per-source sync log (runs + outcomes + error notes)", "expand-row did not reveal the sync log");
check(knowledgeLink, "Cross-link to Knowledge present (interconnect)", "no Knowledge cross-link");
check(realErrors.length === 0, "0 console errors on /sources", `${realErrors.length} console errors`);
console.log(ok ? "✅ SOURCES GREEN" : "❌ sources check failed");
process.exit(ok ? 0 : 1);
