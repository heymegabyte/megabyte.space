#!/usr/bin/env node
/**
 * WS-DEMO: the /activity surface (Activity & Approvals — the autonomous engine made observable +
 * human-in-the-loop governance). Reachable via the SIDEBAR rail (real-user path, proves nav wiring),
 * renders the pending-approvals gate + the recent-activity feed, AND the Approve button actually
 * resolves a pending request (the HITL flow is interactive, not just a static mock). Clearly labeled
 * "sample data" (the global cross-gadget feed awaits a backend aggregation). BA-authed real Chromium,
 * PROD. Needs BA creds.
 */
import { chromium } from "playwright";
import { countAccentBorders } from "./lib/accent-borders.mjs";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles that prove both sections rendered + the honesty label.
const NEEDLES = [
  /sample data/i,            // honest "Preview · sample data" — never claims a real action ran
  /needs your approval/i,    // the HITL gate section
  /requests? waiting/i,
  /recent activity/i,
  /\b(waiting|approved|denied|observed)\b/i,  // the status vocabulary (mirrors Activity.tsx)
  /auto/i,                   // the auto-approved chip
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

// Return to an authed surface with the rail, then click the Activity rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Activity", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/activity/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// fire-248: the shared surfaceAccent per-status LEFT-BORDER must actually render — pending rows carry
// a warning border, rejected feed rows a danger border (graphical, AA-safe both themes). The shared
// net proves it reaches the live DOM (unit-tested in activityAccent.test.ts; a class rename / Tailwind
// purge would slip past a unit test). Scoped to the surface's labeled region.
const accents = await countAccentBorders(page, '[aria-label="Activity and approvals"]');
const accentBordersRender = accents.danger >= 1 && accents.warning >= 1;

// Count "requests waiting" before, click the first Approve, assert it decremented (HITL is interactive).
const waitingBefore = Number((body.match(/(\d+)\s+requests?\s+waiting/i) || [])[1] ?? NaN);
let hitlWorks = false, waitingAfter = NaN;
const approve = page.getByRole("button", { name: "Approve", exact: true }).first();
if (await approve.count().then((c) => c > 0).catch(() => false)) {
  await approve.click().catch(() => {});
  await page.waitForTimeout(500);
  const body2 = await page.evaluate(() => document.body.innerText);
  waitingAfter = Number((body2.match(/(\d+)\s+requests?\s+waiting/i) || [])[1] ?? NaN);
  hitlWorks = Number.isFinite(waitingBefore) && Number.isFinite(waitingAfter) && waitingAfter === waitingBefore - 1;
}

await page.screenshot({ path: "scripts/.activity-proof.png" });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, accents, waitingBefore, waitingAfter, hitlWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Activity reachable from the sidebar rail", "no Activity rail link (nav wiring missing)");
check(onPath, "Activity rail click → /activity", "rail click did not reach /activity");
check(renders, "Activity content renders (approvals + feed + honesty label)", `content missing: ${missing.join(", ")}`);
check(accentBordersRender, `Pending + rejected rows carry accent borders (danger ${accents.danger} + warning ${accents.warning})`, `surfaceAccent borders missing on /activity (danger ${accents.danger}, warning ${accents.warning})`);
check(hitlWorks, "Approve resolves a pending request (HITL interactive)", `Approve did not decrement waiting (${waitingBefore}→${waitingAfter})`);
check(errors.length === 0, "0 console errors on /activity", `${errors.length} console errors`);
console.log(ok ? "✅ ACTIVITY GREEN" : "❌ activity check failed");
process.exit(ok ? 0 : 1);
