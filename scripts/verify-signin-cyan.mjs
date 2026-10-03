#!/usr/bin/env node
/**
 * fire-70 proof: the apex /signin surface is (1) console-error-free (the Header/UserMenu
 * useAuthenticatedApi throw is gone) and (2) vibrant cyan, not orange (the .signin-cyan
 * brand-token override matches the homepage "Enter the OS" CTA). Real Chromium, PROD.
 */
import { chromium } from "playwright";

const URL = "https://megabyte.space/signin";
const CYAN = "rgb(0, 229, 255)"; // #00E5FF

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});

const consoleErrors = [];
const pageErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => pageErrors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector('[data-testid="auth-submit"]', { timeout: 15000 });

// Brand mark (always rendered) — the clearest always-on cyan proof.
const markBg = await page.evaluate(() => {
  const hex = document.querySelector('svg')?.closest('div');
  // The brand mark is the small rounded square holding the Hexagon icon.
  const mark = [...document.querySelectorAll('div')].find(
    (d) => d.className.includes('rounded-xl') && d.querySelector('svg')
  );
  return mark ? getComputedStyle(mark).backgroundColor : null;
});

// Enable the primary button (needs email+password) and read its real brand bg.
await page.fill('input[type="email"]', "probe@example.com");
await page.fill('input[type="password"]', "probe-password-123");
await page.waitForTimeout(150);
const btnBg = await page.evaluate(() => {
  const b = document.querySelector('[data-testid="auth-submit"]');
  if (!b) return null;
  // Kumo may paint the fill on the button or an inner span; walk to the colored node.
  const nodes = [b, ...b.querySelectorAll('*')];
  for (const n of nodes) {
    const bg = getComputedStyle(n).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
  }
  return getComputedStyle(b).backgroundColor;
});

// The magic-link + "Create an account" affordances use text-kumo-brand → should be cyan text.
const linkColor = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="auth-magiclink"]');
  return el ? getComputedStyle(el).color : null;
});

// The app Header (SiteLogo + nav + UserMenu) must NOT be on /signin anymore.
const hasAppHeader = await page.evaluate(() => !!document.querySelector('header'));

await page.screenshot({ path: "scripts/.signin-cyan-proof.png" });
await browser.close();

const errs = [...consoleErrors, ...pageErrors];
const cyanOk = markBg === CYAN || btnBg === CYAN || linkColor === CYAN;
const lines = [
  `markBg=${markBg}`,
  `btnBg=${btnBg}`,
  `linkColor=${linkColor}`,
  `appHeaderPresent=${hasAppHeader}`,
  `consoleErrors=${errs.length}${errs.length ? " :: " + errs.join(" | ").slice(0, 300) : ""}`,
];
console.log(lines.join("\n"));

let ok = true;
if (!cyanOk) { console.log("❌ FAIL: no cyan (#00E5FF) brand surface on /signin"); ok = false; }
else console.log("✅ PASS: /signin renders vibrant cyan (#00E5FF)");
if (errs.length) { console.log("❌ FAIL: /signin has console errors"); ok = false; }
else console.log("✅ PASS: /signin is console-error-free");
if (hasAppHeader) { console.log("⚠️  WARN: an app <header> is still on /signin"); }
process.exit(ok ? 0 : 1);
