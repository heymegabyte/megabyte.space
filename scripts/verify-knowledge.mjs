#!/usr/bin/env node
/**
 * WS-DEMO: the /knowledge surface (Knowledge — VIEW 2 of the "one context layer, two views" #33: the live
 * OPERATIONAL knowledge layer; a NEW Resources panel). Entries continuously synced FROM sources, each with
 * provenance, a confidence score, a scope + a freshness window (fresh vs STALE). DISTINCT from /context
 * (VIEW 1 — the "Context & Skills" authoring library) + /vectorize (the embedding index). Reachable via the
 * SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip (entries · sources · avg
 * confidence · stale) + a scope filter + search + entry cards (scope · via source · confidence · freshness)
 * with a per-STALE RESYNC action. The SIGNATURE interactions: a scope pill + search narrow the entries, and
 * "Resync" refreshes a stale entry (one fewer Resync button). Cross-links Connections. "Preview · sample
 * data". BA-authed, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + scope filter + an entry + provenance/confidence + freshness.
const NEEDLES = [
  /sample entries/i,                                 // honest hybrid "Live sources · sample entries" (DEPTH fire-208)
  /knowledge/i,                                      // the page
  /\b(org|project|agent|customer|site)\b/i,          // the scope filter / scopes
  /brand voice|pricing|changelog|competitor/i,       // real sample entry titles
  /via |confidence/i,                                // provenance ("via {source}") + confidence
  /stale|synced/i,                                   // the freshness window
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

// Return to an authed surface with the rail, then click the Knowledge rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Knowledge", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/knowledge/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;
// DEPTH (fire-208): the LIVE "sources feeding your knowledge" band renders (real listConnectedAccounts, fail-
// soft). State-independent — keys on the band's stable chip anchor; the fail-soft state logic (loading/
// unavailable/empty/connected) is unit-proven in knowledge.test.ts (summarizeKnowledgeSources).
const liveBand = /sources feeding your knowledge/i.test(body);

// Proof in the ALL state — every entry card (scope/source + confidence + freshness + Resync) visible for the vision read.
await page.screenshot({ path: "scripts/.knowledge-proof.png", fullPage: true });

// cross-link to Connections.
const connectionsLink = await page.getByRole("button", { name: /^Connections/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Knowledge entries"] article').count();
const countResync = () => page.getByRole("button", { name: "Resync", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a scope pill narrows the entries. All → Org (fewer, >0).
let countOrg = countAll;
const orgPill = page.getByRole("button", { name: /^Org/ }).first();
if (await orgPill.count().then((c) => c > 0).catch(() => false)) {
  await orgPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countOrg = await countRows().catch(() => countAll);
}
const scopeFilterWorks = countAll > 0 && countOrg > 0 && countOrg < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a title fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search knowledge/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("pricing");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Resync" refreshes a stale entry (one fewer Resync button).
let resyncWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const resyncBefore = await countResync().catch(() => 0);
const firstResync = page.getByRole("button", { name: "Resync", exact: true }).first();
if (resyncBefore > 0 && (await firstResync.count().then((c) => c > 0).catch(() => false))) {
  await firstResync.click().catch(() => {});
  await page.waitForTimeout(400);
  const resyncAfter = await countResync().catch(() => resyncBefore);
  resyncWorks = resyncAfter === resyncBefore - 1;
}

// INTERACTIVE 4 — expand an entry reveals its synced documents + per-entry sync log (fire-298).
let expandWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const expandBtn = page.getByRole("button", { name: /Brand Voice & Style Guide/i }).first();
if (await expandBtn.count().then((c) => c > 0).catch(() => false)) {
  await expandBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const detail = await page.evaluate(() => document.body.innerText);
  expandWorks =
    /Documents/i.test(detail) &&                                        // expand-only header ("docs" count ≠ "Documents")
    /Sync log/i.test(detail) &&                                         // expand-only header
    /Tone of voice|Logo & color usage|Writing principles/.test(detail); // an actual document name
}

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countAll, countOrg, countSearch, resyncBefore, scopeFilterWorks, searchWorks, resyncWorks, expandWorks, connectionsLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Knowledge reachable from the sidebar rail", "no Knowledge rail link (nav wiring missing)");
check(onPath, "Knowledge rail click → /knowledge", "rail click did not reach /knowledge");
check(renders, "Knowledge content renders (stats + scope filter + entries + provenance/confidence + freshness + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'sources feeding your knowledge' band renders (real listConnectedAccounts, DEPTH)", "no live knowledge-sources band");
check(scopeFilterWorks, `Scope filter narrows the entries (All ${countAll} → Org ${countOrg})`, "scope pill did not narrow the entries");
check(searchWorks, `Search narrows the entries (All ${countAll} → "pricing" ${countSearch})`, "search did not narrow the entries");
check(resyncWorks, `Resync refreshes a stale entry (Resync buttons ${resyncBefore} → ${resyncBefore - 1})`, "resync did not refresh a stale entry");
check(expandWorks, "Expand-row reveals the synced documents + per-entry sync log", "expand-row did not reveal the documents/sync-log detail");
check(connectionsLink, "Cross-link to Connections present (interconnect)", "no Connections cross-link");
check(realErrors.length === 0, "0 console errors on /knowledge", `${realErrors.length} console errors`);
console.log(ok ? "✅ KNOWLEDGE GREEN" : "❌ knowledge check failed");
process.exit(ok ? 0 : 1);
