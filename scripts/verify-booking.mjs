#!/usr/bin/env node
/**
 * WS-DEMO: the /booking surface (scheduling — a week grid of agent-booked, AI-qualified appointments).
 * Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + week
 * grid + the selected-appointment detail (with the AI-qualification note). The SIGNATURE behavior is
 * interactive: clicking an appointment opens its detail (block → `aside[aria-label="Appointment with
 * <name>"]`). Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + week grid + detail + honesty label all rendered.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /\bbooking\b/i,            // the page
  /\b(upcoming|pending|this week)\b/i, // the stat strip
  /ai qualification/i,       // the AI-qualification note (the North-Star touch)
  /booked by/i,              // the agent-booked line
  /onboarding|demo|discovery|support/i, // appointment types
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

// Return to an authed surface with the rail, then click the Booking rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Booking", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/booking/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: detail defaults to the first upcoming (Priya Nair, Wed 10am); clicking Tomás Rivera's
// appointment block must switch the detail panel to him (proves the block → detail drill-in).
const detailBefore = await page.locator('aside[aria-label="Appointment with Priya Nair"]').count().catch(() => 0);
let detailSwitched = false;
const block = page.getByRole("button", { name: /Tomás Rivera, Discovery/ }).first();
if (await block.count().then((c) => c > 0).catch(() => false)) {
  await block.click().catch(() => {});
  await page.waitForTimeout(400);
  detailSwitched = await page.locator('aside[aria-label="Appointment with Tomás Rivera"]').count().then((c) => c > 0).catch(() => false);
}
const drillInWorks = detailBefore > 0 && detailSwitched;

await page.screenshot({ path: "scripts/.booking-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, detailBefore, detailSwitched, drillInWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Booking reachable from the sidebar rail", "no Booking rail link (nav wiring missing)");
check(onPath, "Booking rail click → /booking", "rail click did not reach /booking");
check(renders, "Booking content renders (stats + week grid + detail + AI note + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Appointment click opens its detail (Priya → Tomás)", `detail did not switch (before=${detailBefore}, switched=${detailSwitched})`);
check(errors.length === 0, "0 console errors on /booking", `${errors.length} console errors`);
console.log(ok ? "✅ BOOKING GREEN" : "❌ booking check failed");
process.exit(ok ? 0 : 1);
