#!/usr/bin/env node
/**
 * WS-DEMO: the /permissions surface (access governance — promotes the /admin "Permissions" mock tab to
 * a real route). Reachable via the SIDEBAR rail (real-user path; ba-e2e is NOT an admin so it can't
 * reach it through the /admin card, which renders the denied state). Renders the stat strip + a role
 * filter + search + a members list + a capability matrix. The SIGNATURE interactions: a role pill +
 * search narrow the members list, "Invite member" adds a pending invite, and the surface links to
 * Activity. "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + role filter + members + capability matrix + honesty.
const NEEDLES = [
  /sample members/i,           // honest hybrid "Live you · sample members" (DEPTH live band)
  /\bpermissions\b/i,          // the page
  /\b(owner|admin|member|viewer)\b/i, // the role filter / roles
  /megabyte\.space|acme\.com/i, // real sample member emails
  /capabilit/i,                // the capability matrix
  /manage billing|deploy gadgets/i, // real capabilities in the matrix
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

// Return to an authed surface with the rail, then click the Permissions rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Permissions", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/permissions/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH (fire-212): the LIVE "your access" band renders — the REAL signed-in operator from whoami
// (always non-empty, there's always a logged-in user), shown as the workspace Owner. The section is
// present regardless of the loading/active state.
const liveBand = await page.locator('section[aria-label="Live your access"]').count().then((c) => c > 0).catch(() => false);

// Capability matrix + Activity cross-link present.
const matrixPresent = /capabilities by role/i.test(body) && /manage billing/i.test(body);
const activityLink = await page.getByRole("button", { name: /View activity/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Members"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a role pill narrows the members list. All → Admin (fewer, >0).
let countAdmin = countAll;
const adminPill = page.getByRole("button", { name: /^Admin/ }).first();
if (await adminPill.count().then((c) => c > 0).catch(() => false)) {
  await adminPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countAdmin = await countRows().catch(() => countAll);
}
const roleFilterWorks = countAll > 0 && countAdmin > 0 && countAdmin < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a domain → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search members/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("acme");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Invite member" composer adds a pending invite (count +1, Invited).
let inviteWorks = false;
const inviteBtn = page.getByRole("button", { name: "Invite member" }).first();
if (await inviteBtn.count().then((c) => c > 0).catch(() => false)) {
  await inviteBtn.click().catch(() => {});
  await page.waitForTimeout(300);
  const emailInput = page.locator('#invite-email');
  if (await emailInput.count().then((c) => c > 0).catch(() => false)) {
    await emailInput.fill("probe@verify-test.com");
    const confirm = page.getByRole("button", { name: "Invite", exact: true }).first();
    await confirm.click().catch(() => {});
    await page.waitForTimeout(500);
    const countAfter = await countRows().catch(() => countAll);
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    inviteWorks = countAfter === countAll + 1 && /probe@verify-test\.com/.test(bodyAfter) && /invited/i.test(bodyAfter);
  }
}

await page.screenshot({ path: "scripts/.permissions-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countAll, countAdmin, countSearch, matrixPresent, activityLink, roleFilterWorks, searchWorks, inviteWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Permissions reachable from the sidebar rail", "no Permissions rail link (nav wiring missing)");
check(onPath, "Permissions rail click → /permissions", "rail click did not reach /permissions");
check(renders, "Permissions content renders (stats + role filter + members + matrix + honesty label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'your access' band renders (real whoami, DEPTH)", "no live your-access band");
check(roleFilterWorks, `Role filter narrows the members list (All ${countAll} → Admin ${countAdmin})`, "role pill did not narrow the list");
check(searchWorks, `Search narrows the members list (All ${countAll} → "acme" ${countSearch})`, "search did not narrow the list");
check(inviteWorks, "Invite composer adds a pending invite (count +1, Invited)", "invite did not add a pending member");
check(matrixPresent, "Capability matrix renders (Capabilities by role + Manage billing)", "capability matrix missing");
check(activityLink, "Cross-link to Activity present (interconnect)", "no View-activity cross-link");
check(realErrors.length === 0, "0 console errors on /permissions", `${realErrors.length} console errors`);
console.log(ok ? "✅ PERMISSIONS GREEN" : "❌ permissions check failed");
process.exit(ok ? 0 : 1);
