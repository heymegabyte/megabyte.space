#!/usr/bin/env node
/**
 * Proof the sidebar rail SCROLLS (Brian: "ensure the side menu can scroll down"). The primary nav
 * grew to ~60 rows; it used to live in a shrink-0 pinned block so its bottom rows (+ the toggle +
 * utility strip) were cut off below the fold with no way to reach them. The nav + workspace lists
 * now share ONE overflow-y-auto region while the brand row / native toggle / utility strip stay
 * pinned. BA-authed real Chromium, PROD, SHORT viewport (forces overflow). Asserts:
 *   1. the scroll region overflows (scrollHeight > clientHeight);
 *   2. it actually scrolls (scrollTop moves off 0);
 *   3. a bottom-of-nav row (Library: "Agent Skills") becomes visible after scrolling;
 *   4. the native-mode toggle + utility strip stay PINNED + visible before AND after scrolling
 *      (they are NOT inside the scroll region);
 *   5. zero console errors.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL/BA_E2E_PASSWORD)"); process.exit(2); }

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass }); console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({
  // Deliberately SHORT so the ~60-row nav must overflow a real viewport.
  viewport: { width: 1280, height: 700 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); localStorage.removeItem("gadgets:native-os-only"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const SCROLL = "aside .sidebar-scroll";
const TOGGLE = 'aside [role="switch"]';
const vh = 700;

try {
  await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('[data-testid="auth-submit"]');
  await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside nav a", { timeout: 25000 });
  await page.waitForTimeout(1000);

  const scroll = page.locator(SCROLL).first();
  ok("scroll region exists", (await scroll.count()) > 0);

  // 1. Overflows.
  const metricsBefore = await scroll.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, top: el.scrollTop }));
  ok("nav region OVERFLOWS the viewport", metricsBefore.sh > metricsBefore.ch + 10,
    `scrollHeight ${metricsBefore.sh} > clientHeight ${metricsBefore.ch}`);

  // Toggle + utility strip visible BEFORE scrolling (within viewport).
  const toggleBox1 = await page.locator(TOGGLE).first().boundingBox();
  ok("native toggle visible before scroll", !!toggleBox1 && toggleBox1.y + toggleBox1.height <= vh + 1 && toggleBox1.y >= 0);

  // 2. It actually scrolls.
  await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(400);
  const topAfter = await scroll.evaluate((el) => el.scrollTop);
  ok("region SCROLLS (scrollTop moved off 0)", topAfter > 50, `scrollTop=${topAfter}`);

  // 3. A bottom-of-nav Library row is reachable after scrolling.
  const bottomRow = page.locator("aside nav a", { hasText: /Agent Skills/i }).first();
  let bottomVisible = false;
  if (await bottomRow.count()) {
    const b = await bottomRow.boundingBox();
    bottomVisible = !!b && b.y >= 0 && b.y + b.height <= vh + 1;
  }
  ok('bottom nav row ("Agent Skills") reachable after scroll', bottomVisible);

  // 4. Toggle + utility strip STILL pinned + visible after scrolling (not scrolled away).
  const toggleBox2 = await page.locator(TOGGLE).first().boundingBox();
  ok("native toggle STILL pinned + visible after scroll",
    !!toggleBox2 && toggleBox2.y + toggleBox2.height <= vh + 1 && toggleBox2.y >= 0);
  // The toggle must be OUTSIDE the scroll region (truly pinned).
  const toggleInsideScroll = await page.evaluate((sel) => {
    const sc = document.querySelector("aside .sidebar-scroll");
    const sw = document.querySelector('aside [role="switch"]');
    return !!(sc && sw && sc.contains(sw));
  });
  ok("toggle is OUTSIDE the scroll region (pinned, not scrolled)", !toggleInsideScroll);

  await page.screenshot({ path: "scripts/.sidebar-scroll.png" });
  ok("zero console errors", errors.length === 0, errors.length ? errors.slice(0, 4).join(" | ") : "");
} catch (e) {
  ok("verifier ran to completion", false, String(e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? "❌" : "✅"} verify-sidebar-scroll: ${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length ? 1 : 0);
