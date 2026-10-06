#!/usr/bin/env node
/**
 * WS-DEMO: the /notifications surface (the alerting center — NORTH-STAR primitive; a NEW Resources
 * panel). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip +
 * a type filter + search + the notifications feed (unread flagged). The SIGNATURE interactions: a type
 * pill + search narrow the feed, "Send test" raises a fresh unread notification, and the surface
 * cross-links to Activity. "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + type filter + a notification + channels + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /notifications/i,            // the page
  /\b(deploy|billing|lead|security)\b/i, // the type filter / types
  /budget alert|deploy succeeded|new sign-in/i, // real sample notification titles
  /\bunread\b/i,               // the stat strip
  /in-app|slack|email/i,       // the channels
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

// Return to an authed surface with the rail, then click the Notifications rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Notifications", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/notifications/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// cross-link to Activity.
const activityLink = await page.getByRole("button", { name: /^Activity/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Notifications feed"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a type pill narrows the feed. All → Security (fewer, >0).
let countSecurity = countAll;
const secPill = page.getByRole("button", { name: /^Security/ }).first();
if (await secPill.count().then((c) => c > 0).catch(() => false)) {
  await secPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countSecurity = await countRows().catch(() => countAll);
}
const typeFilterWorks = countAll > 0 && countSecurity > 0 && countSecurity < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a title fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search notifications/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("deploy");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Send test" raises a fresh unread notification (count +1, "Test notification").
let sendTestWorks = false;
const countBeforeTest = await countRows().catch(() => countAll);
const sendBtn = page.getByRole("button", { name: "Send test" }).first();
if (await sendBtn.count().then((c) => c > 0).catch(() => false)) {
  await sendBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const countAfter = await countRows().catch(() => countBeforeTest);
  const bodyAfter = await page.evaluate(() => document.body.innerText);
  sendTestWorks = countAfter === countBeforeTest + 1 && /test notification/i.test(bodyAfter);
}

await page.screenshot({ path: "scripts/.notifications-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countSecurity, countSearch, typeFilterWorks, searchWorks, sendTestWorks, activityLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Notifications reachable from the sidebar rail", "no Notifications rail link (nav wiring missing)");
check(onPath, "Notifications rail click → /notifications", "rail click did not reach /notifications");
check(renders, "Notifications content renders (stats + type filter + feed + channels + honesty label)", `content missing: ${missing.join(", ")}`);
check(typeFilterWorks, `Type filter narrows the feed (All ${countAll} → Security ${countSecurity})`, "type pill did not narrow the feed");
check(searchWorks, `Search narrows the feed (All ${countAll} → "deploy" ${countSearch})`, "search did not narrow the feed");
check(sendTestWorks, "Send test raises a fresh unread notification (count +1, Test notification)", "send-test did not raise a notification");
check(activityLink, "Cross-link to Activity present (interconnect)", "no Activity cross-link");
check(realErrors.length === 0, "0 console errors on /notifications", `${realErrors.length} console errors`);
console.log(ok ? "✅ NOTIFICATIONS GREEN" : "❌ notifications check failed");
process.exit(ok ? 0 : 1);
