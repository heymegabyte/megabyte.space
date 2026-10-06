#!/usr/bin/env node
/**
 * WS-DEMO: the /artifacts surface (Artifacts — the explorable artifact canvas; a NEW Resources panel,
 * documented ULTIMATE-REQUIREMENTS primitive list "Knowledge · Sources · Artifacts" + "variants, explorable
 * artifact canvas" (Replit) + "knowledge→many artifacts" (NotebookLM)). Reachable via the SIDEBAR rail
 * (real-user path, proves nav wiring); renders the stat strip (artifacts · variants · types · size) + a
 * type filter + search + artifact cards (type · "Variant N of M" · producedBy · size) with a per-artifact
 * "Next variant" stepper. Distinct from /outputs (the flat produced-files list) + /releases (deploys). The
 * SIGNATURE interactions: a type pill + search narrow the artifacts, and "Next variant" steps the chosen
 * variant (Variant 1 → Variant 2 on the first card). Cross-links Outputs. "Preview · sample data". BA-authed.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + type filter + an artifact + the variant model + honesty.
const NEEDLES = [
  /sample data/i,                                    // honest "Preview · sample data"
  /artifacts/i,                                      // the page
  /\b(document|image|code|dataset|design)\b/i,       // the type filter / types
  /homepage|banner|logo|competitor/i,                // real sample artifact names
  /variant/i,                                        // the variant model ("Variant N of M")
  /explorable|generate/i,                            // the "explorable canvas / generated" framing
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

// Return to an authed surface with the rail, then click the Artifacts rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Artifacts", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/artifacts/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every artifact card (type/variant + producedBy + Next variant) visible for the vision read.
await page.screenshot({ path: "scripts/.artifacts-proof.png", fullPage: true });

// cross-link to Outputs.
const outputsLink = await page.getByRole("button", { name: /^Outputs/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Artifacts"] article').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a type pill narrows the artifacts. All → Document (fewer, >0).
let countDocument = countAll;
const docPill = page.getByRole("button", { name: /^Document/ }).first();
if (await docPill.count().then((c) => c > 0).catch(() => false)) {
  await docPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countDocument = await countRows().catch(() => countAll);
}
const typeFilterWorks = countAll > 0 && countDocument > 0 && countDocument < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a name fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search artifacts/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("logo");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Next variant" steps the first artifact's chosen variant (Variant 1 → Variant 2).
let variantWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const firstCard = page.locator('section[aria-label="Artifacts"] article').first();
const beforeText = await firstCard.innerText().catch(() => "");
const nextBtn = firstCard.getByRole("button", { name: "Next variant", exact: true }).first();
if (await nextBtn.count().then((c) => c > 0).catch(() => false)) {
  await nextBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const afterText = await firstCard.innerText().catch(() => "");
  variantWorks = /Variant 1 of/.test(beforeText) && /Variant 2 of/.test(afterText);
}

await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countDocument, countSearch, typeFilterWorks, searchWorks, variantWorks, outputsLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Artifacts reachable from the sidebar rail", "no Artifacts rail link (nav wiring missing)");
check(onPath, "Artifacts rail click → /artifacts", "rail click did not reach /artifacts");
check(renders, "Artifacts content renders (stats + type filter + artifacts + variant model + honesty label)", `content missing: ${missing.join(", ")}`);
check(typeFilterWorks, `Type filter narrows the artifacts (All ${countAll} → Document ${countDocument})`, "type pill did not narrow the artifacts");
check(searchWorks, `Search narrows the artifacts (All ${countAll} → "logo" ${countSearch})`, "search did not narrow the artifacts");
check(variantWorks, "Next variant steps the chosen variant (Variant 1 → Variant 2 on the first card)", "next-variant stepper did not advance the chosen variant");
check(outputsLink, "Cross-link to Outputs present (interconnect)", "no Outputs cross-link");
check(realErrors.length === 0, "0 console errors on /artifacts", `${realErrors.length} console errors`);
console.log(ok ? "✅ ARTIFACTS GREEN" : "❌ artifacts check failed");
process.exit(ok ? 0 : 1);
