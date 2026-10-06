#!/usr/bin/env node
/**
 * WS-DEMO: the /provenance surface (audit trail — promotes the /admin "Provenance" mock tab to a real
 * route; the LAST /admin "soon" card). Reachable via the SIDEBAR rail (real-user path; ba-e2e is NOT
 * an admin so it can't reach it through /admin). Renders the stat strip + an action filter + search +
 * a day-grouped trail with before→after diffs. The SIGNATURE interactions: an action pill + search
 * narrow the trail, the before→after diffs render, and the surface links to Activity + Releases.
 * "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + action filter + an actor + the trail + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bprovenance\b/i,           // the page
  /\b(created|updated|deployed|deleted)\b/i, // the action filter / actions
  /Brian Zalewski|Ava Chen/,   // real sample actors
  /\b(events|actors)\b/i,      // the stat strip
  /immutable|audit/i,          // the audit-trail framing
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

// Return to an authed surface with the rail, then click the Provenance rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Provenance", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/provenance/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// before→after diffs render (the lead-scorer deploy v22 → v23 is an unambiguous pair).
const diffsPresent = /v22/.test(body) && /v23/.test(body);
// cross-links to Activity + Releases.
const activityLink = await page.getByRole("button", { name: /^Activity/ }).count().then((c) => c > 0).catch(() => false);
const releasesLink = await page.getByRole("button", { name: /^Releases/ }).count().then((c) => c > 0).catch(() => false);
const crossLinksPresent = activityLink && releasesLink;

const countRows = () => page.locator('section[aria-label="Audit trail"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — an action pill narrows the trail. All → Deployed (fewer, >0).
let countDeployed = countAll;
const deployedPill = page.getByRole("button", { name: /^Deployed/ }).first();
if (await deployedPill.count().then((c) => c > 0).catch(() => false)) {
  await deployedPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countDeployed = await countRows().catch(() => countAll);
}
const actionFilterWorks = countAll > 0 && countDeployed > 0 && countDeployed < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type an actor → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search provenance/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("ava");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

await page.screenshot({ path: "scripts/.provenance-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countDeployed, countSearch, diffsPresent, crossLinksPresent, actionFilterWorks, searchWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Provenance reachable from the sidebar rail", "no Provenance rail link (nav wiring missing)");
check(onPath, "Provenance rail click → /provenance", "rail click did not reach /provenance");
check(renders, "Provenance content renders (stats + action filter + actors + trail + honesty label)", `content missing: ${missing.join(", ")}`);
check(actionFilterWorks, `Action filter narrows the trail (All ${countAll} → Deployed ${countDeployed})`, "action pill did not narrow the trail");
check(searchWorks, `Search narrows the trail (All ${countAll} → "ava" ${countSearch})`, "search did not narrow the trail");
check(diffsPresent, "before→after diffs render (v22 → v23)", "no before/after diff values found");
check(crossLinksPresent, "Cross-links to Activity + Releases present (interconnect)", "missing Activity / Releases cross-links");
check(realErrors.length === 0, "0 console errors on /provenance", `${realErrors.length} console errors`);
console.log(ok ? "✅ PROVENANCE GREEN" : "❌ provenance check failed");
process.exit(ok ? 0 : 1);
