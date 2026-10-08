#!/usr/bin/env node
/**
 * WS-DEMO: the /analytics dashboard (ULTIMATE-REQUIREMENTS §45 — the observability surface) renders
 * its real demo dashboard AND is reachable via the SIDEBAR rail (the real-user path, which also
 * proves the nav wiring). Unlike the coming-soon surfaces this is a full dashboard mock (stat cards +
 * 14-day trend + top pages + sources + devices + Core Web Vitals), clearly labeled "sample data" so
 * it never lies-empty (verify-against-source-of-truth). BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles that prove the dashboard (not a blank/partial render) + the honesty label.
const NEEDLES = [
  /sample data/i,            // the honest "Preview · sample data" chip — never claims live traffic
  /visitors/i,
  /pageviews/i,
  /top pages/i,
  /traffic sources/i,
  /core web vitals/i,
  /active now/i,             // the live-now strip (fire-162)
  /activation funnel/i,      // the activation funnel section (fire-162)
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  locale: "en-US", // pin toLocaleString → "1,240" so the tooltip-value assertion is deterministic
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

// Return to an authed surface with the rail, then click the Analytics rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Analytics", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/analytics/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// fire-273 DEPTH+beautify: the visitors chart now has a NICE y-axis reference (1240 → top gridline
// "1.5k") + an interactive hover/focus tooltip. Prove all three on prod (the bars became focusable
// buttons with per-point aria-labels; focusing the 1,240 peak reveals its value tooltip).
const axisLabel = (await page.getByText("1.5k", { exact: true }).count()) > 0;
const barButtons = await page.getByRole("button", { name: /visitors on day/i }).count();
let tooltipShows = false;
try {
  const peak = page.getByRole("button", { name: /visitors on day 12/i }).first();
  await peak.scrollIntoViewIfNeeded();
  await peak.focus();
  await page.waitForTimeout(400);
  tooltipShows = (await page.getByText("1,240", { exact: true }).count()) > 0;
} catch {}

// fire-274 beautify: each of the 4 stat cards now carries a per-card 7-day mini-trend sparkline
// (role=img, aria-label "<label> 7-day trend") filling the previously-sparse lower region.
const sparklines = await page.getByRole("img", { name: /7-day trend/i }).count();

await page.screenshot({ path: "scripts/.analytics-proof.png" }); // captures the focused tooltip state
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, axisLabel, barButtons, tooltipShows, sparklines, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Analytics reachable from the sidebar rail", "no Analytics rail link (nav wiring missing)");
check(onPath, "Analytics rail click → /analytics", "rail click did not reach /analytics");
check(renders, "Analytics dashboard content renders", `dashboard content missing: ${missing.join(", ")}`);
check(axisLabel, "visitors chart has a y-axis reference (nice 1.5k top gridline)", "no y-axis tick labels (axis reference missing)");
check(barButtons >= 14, `chart bars are focusable buttons (${barButtons} ≥ 14)`, `chart bars not focusable (${barButtons} buttons)`);
check(tooltipShows, "focusing the 1,240 peak bar reveals its value tooltip", "hover/focus tooltip did not reveal the value");
check(sparklines >= 4, `each stat card has a 7-day trend sparkline (${sparklines} ≥ 4)`, `stat-card sparklines missing (${sparklines} found)`);
check(errors.length === 0, "0 console errors on /analytics", `${errors.length} console errors`);
console.log(ok ? "✅ ANALYTICS GREEN" : "❌ analytics check failed");
process.exit(ok ? 0 : 1);
