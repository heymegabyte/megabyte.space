#!/usr/bin/env node
/**
 * WS-DEMO: the /social surface (the social-media auto-scheduler as a POST-QUEUE board — the
 * ResourcesPanel + /admin "Social" card). Reachable via the SIDEBAR rail (real-user path, proves nav
 * wiring); renders a stat strip + a "Schedule a post" composer + platform-chip filter + search + the
 * post queue (scheduled/published/draft/failed w/ per-status accent borders + engagement). The
 * SIGNATURE interactions: a platform chip + search narrow the board, the composer queues a new post,
 * and "Publish now" flips a scheduled post to published. Clearly labeled "Preview · sample data".
 * BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + statuses + platform chips + honesty label.
const NEEDLES = [
  /sample data/i,               // honest "Preview · sample data" — never lies-empty
  /\bsocial\b/i,                // the page
  /scheduled|published/i,       // post statuses
  /linkedin|instagram/i,        // platform chips / filter
  /next up/i,                   // a stat card
  /engagement/i,                // a stat card
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

// Return to an authed surface with the rail, then click the Social rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Social", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/social/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// surfaceAccent prod net: failed posts carry a danger left-border + drafts a warning one (scheduled =
// muted, published quiet) — the per-status attention mapping, asserted in the live DOM.
const accents = await countAccentBorders(page, 'section[aria-label="Post queue"]');
const accentBordersRender = accents.danger >= 1 && accents.warning >= 1;

const countRows = () => page.locator('section[aria-label="Post queue"] li').count();
const countPublishBtns = () => page.getByRole("button", { name: "Publish now" }).count();

// INTERACTIVE 1 — platform filter narrows. All → LinkedIn (fewer, >0).
const countAll = await countRows().catch(() => 0);
let countPlat = countAll;
const platPill = page.getByRole("button", { name: /^LinkedIn/ }).first();
if (await platPill.count().then((c) => c > 0).catch(() => false)) {
  await platPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countPlat = await countRows().catch(() => countAll);
}
const platformFilterWorks = countAll > 0 && countPlat > 0 && countPlat < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a distinctive fragment → fewer, >0.
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
let countSearch = countAll;
const search = page.getByRole("searchbox", { name: /search posts/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("opportunity");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — the "Schedule a post" composer queues a new post (rows +1; it resets the view to all).
let composeWorks = false;
const draft = page.getByRole("textbox", { name: /post content/i }).first();
if (await draft.count().then((c) => c > 0).catch(() => false)) {
  await draft.fill("E2E verifier — queued a post");
  await page.getByRole("button", { name: "Schedule", exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  const countAfter = await countRows().catch(() => countAll);
  composeWorks = countAfter === countAll + 1;
}

// INTERACTIVE 4 — "Publish now" flips a scheduled post to published (one fewer Publish-now button).
let publishWorks = false;
const pubBefore = await countPublishBtns().catch(() => 0);
const pubBtn = page.getByRole("button", { name: "Publish now" }).first();
if (pubBefore > 0 && (await pubBtn.count().then((c) => c > 0).catch(() => false))) {
  await pubBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const pubAfter = await countPublishBtns().catch(() => pubBefore);
  publishWorks = pubAfter < pubBefore;
}

await page.screenshot({ path: "scripts/.social-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countPlat, countSearch, composeWorks, publishWorks, accents, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Social reachable from the sidebar rail", "no Social rail link (nav wiring missing)");
check(onPath, "Social rail click → /social", "rail click did not reach /social");
check(renders, "Social content renders (stats + statuses + platform chips + honesty label)", `content missing: ${missing.join(", ")}`);
check(platformFilterWorks, `Platform filter narrows the board (All ${countAll} → LinkedIn ${countPlat})`, "platform chip did not narrow the board");
check(searchWorks, `Search narrows the board (All ${countAll} → "opportunity" ${countSearch})`, "search did not narrow the board");
check(composeWorks, `Compose → Schedule queues a new post (rows ${countAll} → ${countAll + 1})`, "the schedule composer did not add a post");
check(publishWorks, "Publish now flips a scheduled post to published", "publish-now did not resolve");
check(accentBordersRender, `Failed + draft posts carry accent borders (danger ${accents.danger} + warning ${accents.warning})`, `surfaceAccent borders missing on /social (danger ${accents.danger}, warning ${accents.warning})`);
check(realErrors.length === 0, "0 console errors on /social", `${realErrors.length} console errors`);
console.log(ok ? "✅ SOCIAL GREEN" : "❌ social check failed");
process.exit(ok ? 0 : 1);
