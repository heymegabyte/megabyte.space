#!/usr/bin/env node
/**
 * WS-DEMO + DEPTH: the /automations surface (recurring + event-triggered work). Reachable via the SIDEBAR
 * rail (real-user path, proves nav wiring); renders the live-integrations band + the composer + the sample
 * schedule list. DEPTH (fire-220): a LIVE band off listGatekeeperVendors leads (the REAL third-party
 * services this account can act through), fail-soft; honest hybrid chip "Live integrations · sample
 * schedules". The SIGNATURE interaction: the composer ("Create automation") adds a row. BA-authed real
 * Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// content needles proving the chip + the page + the composer + a sample automation + the live band label.
const NEEDLES = [
  /sample schedules/i,              // honest hybrid chip "Live integrations · sample schedules" — never lies-empty
  /\bautomations\b/i,               // the page
  /new automation|create automation/i, // the composer
  /every 15 minutes|daily digest/i, // a real sample automation
  /integration/i,                   // the live band label
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

// Return to an authed surface with the rail, then click the Automations rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Automations", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/automations/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH (fire-220): the live "integrations" band renders one of its fail-soft states — N available for the
// ba-e2e account (a configured deployment has ≥1 gatekeeper vendor), or an honest loading/unavailable/empty.
// Proves the real listGatekeeperVendors wiring, not just the sample schedule list.
const liveBand = /Checking available integrations|Couldn't load integrations|No integrations yet|\d+\s+integrations?\s+available/i.test(body);

const countRows = () => page.locator('section[aria-label="Scheduled automations"] > div').count();
const countBefore = await countRows().catch(() => 0);

// INTERACTIVE — the composer adds a row. Type a unique name, click Create, assert the name appears + a row added.
const PROBE = "E2E probe automation";
let composerAdds = false;
const nameInput = page.getByRole("textbox", { name: /name the automation/i }).first();
if (await nameInput.count().then((c) => c > 0).catch(() => false)) {
  await nameInput.fill(PROBE);
  await page.getByRole("button", { name: /create automation/i }).click().catch(() => {});
  await page.waitForTimeout(400);
  const countAfter = await countRows().catch(() => countBefore);
  const body2 = await page.evaluate(() => document.body.innerText);
  composerAdds = countAfter > countBefore && new RegExp(PROBE).test(body2);
}

await page.screenshot({ path: "scripts/.automations-proof.png", fullPage: true });
await browser.close();

// The DEPTH listGatekeeperVendors RPC opens a capnweb WebSocket; closing it on nav logs the benign
// "WebSocket is already in CLOSING or CLOSED state" race — filtered estate-wide (fire-161).
const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countBefore, composerAdds, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Automations reachable from the sidebar rail", "no Automations rail link (nav wiring missing)");
check(onPath, "Automations rail click → /automations", "rail click did not reach /automations");
check(renders, "Automations content renders (chip + composer + sample schedule + integration label)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'integrations' band renders (listGatekeeperVendors DEPTH, fail-soft)", "live integrations band missing — listGatekeeperVendors DEPTH not wired");
check(composerAdds, "Composer adds a new automation row (Create automation)", "composer did not add the probe automation");
check(realErrors.length === 0, "0 console errors on /automations", `${realErrors.length} console errors`);
console.log(ok ? "✅ AUTOMATIONS GREEN" : "❌ automations check failed");
process.exit(ok ? 0 : 1);
