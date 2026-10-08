#!/usr/bin/env node
/**
 * WS-DEMO: the /autorag surface (AI Search — Cloudflare's MANAGED retrieval-augmented generation;
 * point an index at a data source, ask in natural language, get a generated answer WITH citations.
 * DISTINCT from /vectorize (raw vectors), /search (keyword FTS), /knowledge (source registry) — the
 * end-to-end ask → cited-answer pipeline). Reachable via the SIDEBAR rail (real-user path, proves nav
 * wiring); renders the signature ask panel (natural-language question → cited answer), the stat strip,
 * the status filter + search, and the index registry with per-status surfaceAccent left-borders.
 * Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 *
 * SIGNATURE behaviors are interactive: a suggested question SWAPS the cited answer, a status pill narrows
 * the registry, search narrows it further, and indexing/error rows carry a status left-border. (fire-265
 * — the prod net the accent-coverage gate requires; completes fire-264's stranded /autorag slice.)
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the ask panel + stat strip + status vocabulary + index registry + honesty.
const NEEDLES = [
  /sample data/i,                   // honest "Preview · sample data" — never lies-empty
  /ai search/i,                     // the page (h1 + document title)
  /managed rag/i,                   // the concept (header blurb)
  /\bindexes\b/i,                   // stat strip + footer
  /\bdocuments\b/i,                 // stat strip
  /\b(ready|indexing|error)\b/i,    // the status vocabulary (filter pills + rows)
  /citation|cites|\banswer\b/i,     // the ask → cited-answer signature
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

// Return to an authed surface with the rail, then click the AI Search rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "AI Search", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/autorag/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const rowCount = () => page.locator('li[data-testid="rag-index-row"]').count();
const countAll = await rowCount().catch(() => 0);
const askSelector = 'section[aria-label="Ask your indexed content"]';
const askText = () => page.locator(askSelector).innerText().catch(() => "");

// INTERACTIVE 1 — a suggested question SWAPS the cited answer. Default is Q1 (magic-link); click the
// autostop question → the answer region updates to the autostop answer (proves ask → cited-answer).
const askBefore = await askText();
let askAfter = askBefore;
const autostopPill = page.getByRole("button", { name: /autostop policy/i }).first();
if (await autostopPill.count().then((c) => c > 0).catch(() => false)) {
  await autostopPill.click().catch(() => {});
  await page.waitForTimeout(400);
  askAfter = await askText();
}
const askWorks = /inactivity window|idle governed/i.test(askAfter) && askAfter !== askBefore;

// INTERACTIVE 2 — a status pill narrows the registry. All → Error (exactly the one erroring index, >0).
let countError = countAll;
const errorPill = page.getByRole("button", { name: /^Error/ }).first();
if (await errorPill.count().then((c) => c > 0).catch(() => false)) {
  await errorPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countError = await rowCount().catch(() => countAll);
}
const statusFilterWorks = countError > 0 && countError < countAll;

// INTERACTIVE 3 — search narrows. Reset to All, type a name → fewer rows, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /filter indexes by name or source/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("handbook");
  await page.waitForTimeout(400);
  countSearch = await rowCount().catch(() => countAll);
  await search.fill(""); // restore so the accent net sees every row
  await page.waitForTimeout(250);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// surfaceAccent prod net: the erroring index carries a danger left-border + the indexing one a warning
// border (ready rows stay quiet) — the shared row-accent that lifts the at-risk indexes out of the list.
const accents = await countAccentBorders(page, 'section[aria-label="Search indexes"]');
const accentBordersRender = accents.danger >= 1 && accents.warning >= 1;

// INTERACTIVE 4 — citation drill-in: clicking a citation chip opens the retrieved source-chunk preview
// (RAG provenance made inspectable). Assert the preview is absent before, present after, and carries a
// relevance "% match" + the "Retrieved chunk" excerpt. Left OPEN so the proof screenshot shows it.
const citeChip = page.locator('section[aria-label="Ask your indexed content"] button[title="View the cited source chunk"]').first();
const haveCite = await citeChip.count().then((c) => c > 0).catch(() => false);
const previewBefore = await page.locator('[data-testid="citation-preview"]').count().catch(() => 0);
let previewAfter = 0, previewText = "";
if (haveCite) {
  await citeChip.click().catch(() => {});
  await page.waitForTimeout(400);
  previewAfter = await page.locator('[data-testid="citation-preview"]').count().catch(() => 0);
  previewText = previewAfter ? await page.locator('[data-testid="citation-preview"]').innerText().catch(() => "") : "";
}
const citationDrillWorks = haveCite && previewBefore === 0 && previewAfter === 1 && /% match/i.test(previewText) && /retrieved chunk/i.test(previewText);

await page.screenshot({ path: "scripts/.autorag-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countError, countSearch, askWorks, statusFilterWorks, searchWorks, accents, citationDrillWorks, previewBefore, previewAfter, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "AI Search reachable from the sidebar rail", "no AI Search rail link (nav wiring missing)");
check(onPath, "AI Search rail click → /autorag", "rail click did not reach /autorag");
check(renders, "AI Search content renders (ask panel + stats + status + registry + honesty label)", `content missing: ${missing.join(", ")}`);
check(askWorks, "Ask panel swaps the cited answer (autostop question → autostop answer)", "clicking a suggested question did not swap the cited answer");
check(statusFilterWorks, `Status filter narrows the registry (All ${countAll} → Error ${countError})`, "status pill did not narrow the registry");
check(searchWorks, `Search narrows the registry (All ${countAll} → "handbook" ${countSearch})`, "search did not narrow the registry");
check(accentBordersRender, `Indexing + error rows carry accent borders (danger ${accents.danger} + warning ${accents.warning})`, `surfaceAccent borders missing on /autorag (danger ${accents.danger}, warning ${accents.warning})`);
check(citationDrillWorks, `Citation drill-in opens the retrieved source chunk (preview ${previewBefore}→${previewAfter}, "% match" + "Retrieved chunk")`, "clicking a citation chip did not open the source-chunk preview");
check(realErrors.length === 0, "0 console errors on /autorag", `${realErrors.length} console errors`);
console.log(ok ? "✅ AUTORAG GREEN" : "❌ autorag check failed");
process.exit(ok ? 0 : 1);
