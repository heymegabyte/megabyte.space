#!/usr/bin/env node
/**
 * WS-DEMO: the /presence surface (the live "ACTIVE NOW" manifest — §47 presence; a NEW Resources panel).
 * Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + a kind
 * filter + search + the presence manifest (people / agents / sessions / devices with live-status dots).
 * The SIGNATURE interactions: a kind pill + search narrow the manifest, and a self-status toggle flips
 * YOUR presence active ⇄ away ("Set yourself away" → "Set yourself active"). Cross-links Activity + Agents.
 * "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + kind filter + a sample entry + status + self + honesty.
const NEEDLES = [
  /sample presence/i,                           // honest hybrid "Live you · sample presence" (DEPTH fire-203)
  /presence|active now/i,                        // the page / headline
  /\b(person|agent|session|device)\b/i,          // the kind filter / kinds
  /lead scorer|ava chen|browser run/i,           // real sample presence names
  /\b(active|running|idle|away)\b/i,             // the live status
  /agents running|set yourself/i,                // the rollup / self-status action
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

// Return to an authed surface with the rail, then click the Presence rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Presence", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/presence/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH (fire-203): the LIVE "active now" band renders (real whoami — always non-empty, there's always a
// logged-in user). The band section is present regardless of the loading/active state.
const liveBand = await page.locator('section[aria-label="Live active now"]').count().then((c) => c > 0).catch(() => false);

// Proof in the ALL state — the full manifest (people/agents/sessions/devices) visible for the vision read.
await page.screenshot({ path: "scripts/.presence-proof.png", fullPage: true });

// cross-link to Activity.
const activityLink = await page.getByRole("button", { name: /^Activity/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Presence list"] article').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a kind pill narrows the manifest. All → Agent (fewer, >0).
// Scope to the filter group so /^Agent/ hits the "Agent" PILL, not the header "Agents" cross-link.
const kindGroup = page.getByRole("group", { name: "Filter by kind" });
let countAgent = countAll;
const agentPill = kindGroup.getByRole("button", { name: /^Agent/ }).first();
if (await agentPill.count().then((c) => c > 0).catch(() => false)) {
  await agentPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countAgent = await countRows().catch(() => countAll);
}
const kindFilterWorks = countAll > 0 && countAgent > 0 && countAgent < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a context fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search presence/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("scraping");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — the self-status toggle flips you active ⇄ away ("Set yourself away" → "Set yourself active").
let selfToggleWorks = false;
const awayBtn = page.getByRole("button", { name: "Set yourself away" }).first();
if (await awayBtn.count().then((c) => c > 0).catch(() => false)) {
  await awayBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const activeBtn = page.getByRole("button", { name: "Set yourself active" });
  selfToggleWorks = await activeBtn.count().then((c) => c > 0).catch(() => false);
}

await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, countAll, countAgent, countSearch, kindFilterWorks, searchWorks, selfToggleWorks, activityLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Presence reachable from the sidebar rail", "no Presence rail link (nav wiring missing)");
check(onPath, "Presence rail click → /presence", "rail click did not reach /presence");
check(renders, "Presence content renders (stats + kind filter + manifest + status + self action + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'active now' band renders (real whoami, DEPTH)", "no live active-now band");
check(kindFilterWorks, `Kind filter narrows the manifest (All ${countAll} → Agent ${countAgent})`, "kind pill did not narrow the manifest");
check(searchWorks, `Search narrows the manifest (All ${countAll} → "scraping" ${countSearch})`, "search did not narrow the manifest");
check(selfToggleWorks, "Self-status toggle flips you active ⇄ away", "the self-status toggle did not flip");
check(activityLink, "Cross-link to Activity present (interconnect)", "no Activity cross-link");
check(realErrors.length === 0, "0 console errors on /presence", `${realErrors.length} console errors`);
console.log(ok ? "✅ PRESENCE GREEN" : "❌ presence check failed");
process.exit(ok ? 0 : 1);
