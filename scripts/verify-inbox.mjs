#!/usr/bin/env node
/**
 * WS-DEMO: the /inbox surface (unified conversations — email/chat/SMS in one thread list). Reachable
 * via the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + conversation
 * list + the selected thread. The SIGNATURE behavior is interactive: clicking a conversation opens
 * its thread (row → `aside[aria-label="Conversation with <name>"]`). Clearly labeled "Preview ·
 * sample data". BA-authed real Chromium, PROD. Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + list + thread + honesty label all rendered.
const NEEDLES = [
  /sample data/i,        // honest "Preview · sample data" — never lies-empty
  /\bInbox\b/i,          // the page
  /\b(unread|open|closed)\b/i, // the stat strip + status
  /email|live chat|sms/i,      // the channel labels
  /reply to/i,                 // the composer preview
  /agent/i,                    // the agent-handoff chip
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

// Return to an authed surface with the rail, then click the Inbox rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Inbox", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/inbox/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: the thread defaults to the first conversation (Priya Nair); clicking Marcus Webb's
// row must switch the thread panel to him (proves the row → thread drill-in, the signature).
const threadBefore = await page.locator('aside[aria-label="Conversation with Priya Nair"]').count().catch(() => 0);
let threadSwitched = false;
const row = page.getByRole("button", { name: "Open conversation with Marcus Webb" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(400);
  threadSwitched = await page.locator('aside[aria-label="Conversation with Marcus Webb"]').count().then((c) => c > 0).catch(() => false);
}
const drillInWorks = threadBefore > 0 && threadSwitched;

await page.screenshot({ path: "scripts/.inbox-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, threadBefore, threadSwitched, drillInWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Inbox reachable from the sidebar rail", "no Inbox rail link (nav wiring missing)");
check(onPath, "Inbox rail click → /inbox", "rail click did not reach /inbox");
check(renders, "Inbox content renders (stats + list + thread + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Row click opens the thread (Priya → Marcus)", `thread did not switch (before=${threadBefore}, switched=${threadSwitched})`);
check(errors.length === 0, "0 console errors on /inbox", `${errors.length} console errors`);
console.log(ok ? "✅ INBOX GREEN" : "❌ inbox check failed");
process.exit(ok ? 0 : 1);
