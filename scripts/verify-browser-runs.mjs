#!/usr/bin/env node
/**
 * WS-DEMO + fire-218: the /browser-runs surface — the "browser-use-grade" inline animated browser.
 * Agents drive a real browser; the detail pane REPLAYS the run action-by-action in a rendered frame
 * (highlighted target + animated cursor), with a synchronized SCRUBBER and inline HITL (2FA) the human
 * clears WITHOUT leaving the row — then the run continues. Reachable via the SIDEBAR rail (real-user
 * path). Clearly labeled "Preview · sample data". BA-authed Chromium, PROD.
 *
 * Asserts: reachable → renders (stats + list + frame + scrubber) → SCRUB changes the frame → inline HITL
 * resolves (type a code, Resume) → the run CONTINUES to the invoices page → 0 console errors.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// Content needles proving the stat strip + list + honesty label all rendered (frame/scrubber/HITL are
// asserted via locators + interaction below, not innerText, since they change as you scrub).
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never lies-empty
  /browser runs/i,           // the page
  /\b(running|needs input|completed)\b/i, // the stat strip + status
  /\bsteps\b/i,              // the synchronized step trace
  /agent/i,                  // the per-run agent
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

// Return to an authed surface with the rail, then click the Browser Runs rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Browser Runs", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/browser-runs/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const frameText = () => page.locator('[data-testid="agent-browser-frame"]').first().innerText().catch(() => "");

// The inline animated browser + scrubber both rendered.
const frameRenders =
  (await page.locator('[data-testid="agent-browser-frame"]').count().catch(() => 0)) > 0 &&
  (await page.locator('[data-testid="run-scrubber"]').count().catch(() => 0)) > 0;

// SCRUB: the default run (running) opens on its "Reading" step; Next step → the frame changes (Verifying).
const f1 = await frameText();
await page.getByRole("button", { name: "Next step", exact: true }).first().click().catch(() => {});
await page.waitForTimeout(500);
const f2 = await frameText();
const scrubWorks = f2.length > 0 && f2 !== f1 && /Verifying|Price check/i.test(f2);

// INLINE HITL: open the needs-input run → the frame overlays a 2FA resolver → type a code + Resume →
// "resuming the run" confirms AND the run CONTINUES (the frame advances to the invoices page).
let drillInWorks = false, hitlWorks = false, continueWorks = false;
const row = page.getByRole("button", { name: "Browser run: Download last month’s invoices" }).first();
if (await row.count().then((c) => c > 0).catch(() => false)) {
  await row.click().catch(() => {});
  await page.waitForTimeout(500);
  drillInWorks = await page.locator('aside[aria-label="Browser run: Download last month’s invoices"]').count().then((c) => c > 0).catch(() => false);
  const codeInput = page.getByLabel("Verification code").first();
  const resume = page.locator('[data-testid="hitl-resume"]').first();
  if ((await codeInput.count().catch(() => 0)) > 0 && (await resume.count().catch(() => 0)) > 0) {
    await codeInput.fill("123456").catch(() => {});
    await resume.click().catch(() => {});
    await page.waitForTimeout(700);
    const body2 = await page.evaluate(() => document.body.innerText);
    hitlWorks = /resuming the run/i.test(body2);
    const f3 = await frameText();
    continueWorks = /billing\/invoices|Invoices/i.test(f3); // the agent moved on to the invoices page
  }
}

await page.screenshot({ path: "scripts/.browser-runs-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, frameRenders, scrubWorks, drillInWorks, hitlWorks, continueWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Browser Runs reachable from the sidebar rail", "no Browser Runs rail link (nav wiring missing)");
check(onPath, "Browser Runs rail click → /browser-runs", "rail click did not reach /browser-runs");
check(renders, "Browser Runs content renders (stats + list + steps + honesty label)", `content missing: ${missing.join(", ")}`);
check(frameRenders, "The inline agent-browser frame + scrubber render", "agent-browser-frame or run-scrubber missing");
check(scrubWorks, "Scrubbing (Next step) changes the replayed frame", "the frame did not change on Next step");
check(drillInWorks, "Run click opens its trace (invoices run)", "detail did not open for the invoices run");
check(hitlWorks, "Inline HITL resolves (type a code, Resume → resuming the run)", "inline HITL did not confirm");
check(continueWorks, "After HITL the run CONTINUES (frame advances to the invoices page)", "the run did not continue past the 2FA");
check(errors.length === 0, "0 console errors on /browser-runs", `${errors.length} console errors`);
console.log(ok ? "✅ BROWSER-RUNS GREEN" : "❌ browser-runs check failed");
process.exit(ok ? 0 : 1);
