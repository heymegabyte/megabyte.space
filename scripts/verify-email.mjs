#!/usr/bin/env node
/**
 * WS-DEMO: the /email surface (transactional-email deliverability — SES; a NEW Resources panel).
 * Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip (delivery/
 * bounce/complaint rates) + a status filter + search + the sends log with MASKED recipients. The
 * SIGNATURE interactions: a status pill + search narrow the log, recipients are masked, and the surface
 * cross-links to Inbox + Logs. "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a send + deliverability + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bemail\b/i,                // the page
  /\b(delivered|bounced|complained)\b/i, // the status filter / statuses
  /\b(delivery rate|bounce rate)\b/i, // the deliverability stat strip
  /\bses\b/i,                  // the transactional rail
  /invoice|welcome|digest/i,   // real sample subjects
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

// Return to an authed surface with the rail, then click the Email rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Email", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/email/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Recipients are MASKED — the mask char is present + a known sample recipient's full address is NOT.
const recipientsMasked = /•/.test(body) && !/priya@acme\.com/.test(body);
// cross-links to Inbox + Logs.
const inboxLink = await page.getByRole("button", { name: /^Inbox/ }).count().then((c) => c > 0).catch(() => false);
const logsLink = await page.getByRole("button", { name: /^Logs/ }).count().then((c) => c > 0).catch(() => false);
const crossLinksPresent = inboxLink && logsLink;

const countRows = () => page.locator('section[aria-label="Email sends"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a status pill narrows the log. All → Bounced (fewer, >0).
let countBounced = countAll;
const bouncedPill = page.getByRole("button", { name: /^Bounced/ }).first();
if (await bouncedPill.count().then((c) => c > 0).catch(() => false)) {
  await bouncedPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countBounced = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countBounced > 0 && countBounced < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a gadget → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search email/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("billing");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

await page.screenshot({ path: "scripts/.email-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countBounced, countSearch, recipientsMasked, crossLinksPresent, statusFilterWorks, searchWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Email reachable from the sidebar rail", "no Email rail link (nav wiring missing)");
check(onPath, "Email rail click → /email", "rail click did not reach /email");
check(renders, "Email content renders (deliverability stats + status filter + sends + SES + honesty label)", `content missing: ${missing.join(", ")}`);
check(statusFilterWorks, `Status filter narrows the log (All ${countAll} → Bounced ${countBounced})`, "status pill did not narrow the log");
check(searchWorks, `Search narrows the log (All ${countAll} → "billing" ${countSearch})`, "search did not narrow the log");
check(recipientsMasked, "Recipients are masked (no full sample address shown)", "a full recipient address leaked");
check(crossLinksPresent, "Cross-links to Inbox + Logs present (interconnect)", "missing Inbox / Logs cross-links");
check(realErrors.length === 0, "0 console errors on /email", `${realErrors.length} console errors`);
console.log(ok ? "✅ EMAIL GREEN" : "❌ email check failed");
process.exit(ok ? 0 : 1);
