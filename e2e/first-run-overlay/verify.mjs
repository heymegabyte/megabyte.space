#!/usr/bin/env node
// WS-11 Slice 1 — first-run overlay behaviour (real-browser, local preview).
//
// The apex WebGL homepage becomes a FIRST-RUN intro layer over the OS: a first
// visitor sees it; pressing "Enter the OS" persists a flag + proceeds; a RETURN
// visitor (flag set) skips straight to the OS — "only shows the first time until
// you press the button to go in" (Brian 2026-10-01). This is gated by the build
// flag VITE_FIRST_RUN_OVERLAY so the live public apex stays byte-identical until
// the WS-11 domain flip.
//
// Run against an overlay-mode build served locally:
//   VITE_FIRST_RUN_OVERLAY=true pnpm --dir packages/home build
//   npx vite preview --root packages/home --port 4178 &   # (or `pnpm --dir packages/home exec vite preview`)
//   node e2e/first-run-overlay/verify.mjs http://localhost:4178
//
// Exit 0 = all green; 1 = a behaviour assertion failed; 2 = browser/preview unavailable.

import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:4178").replace(/\/$/, "");

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  console.error(`❌ BLOCKED — chromium unavailable: ${error?.message || error}`);
  process.exit(2);
}

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
// Stand in for the OS entry with a SAME-ORIGIN stub (no worker locally to 302).
// Same-origin keeps localStorage readable after the nav; aborting would drop the
// page to an opaque origin where localStorage is denied.
await context.route("**/login", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><body data-testid='os-stub'>OS</body>" }),
);
const page = await context.newPage();

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const visible = async (sel) => (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());

try {
  // 1. First visitor (no flag) sees the homepage/overlay, not the redirect splash.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const flag0 = await page.evaluate(() => localStorage.getItem("megabyteOS_entered"));
  record(
    "first visit shows the overlay",
    (await visible("[data-testid=hero-login]")) && !(await visible("[data-testid=os-redirect]")) && flag0 === null,
    `hero=${await visible("[data-testid=hero-login]")} splash=${await visible("[data-testid=os-redirect]")} flag=${flag0}`,
  );

  // 2. Pressing "Enter the OS" persists the first-run flag + proceeds to the OS entry.
  await Promise.all([
    page.waitForURL("**/login", { timeout: 5000 }).catch(() => {}),
    page.locator("[data-testid=hero-login]").first().click(),
  ]);
  const flag1 = await page.evaluate(() => localStorage.getItem("megabyteOS_entered"));
  record("entering persists the flag + goes to OS", flag1 === "1" && /\/login$/.test(page.url()), `flag=${flag1} url=${page.url()}`);

  // 3. Return visitor (flag set) auto-skips to the OS — no marketing layer, lands at the OS entry.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/login", { timeout: 5000 }).catch(() => {});
  record(
    "return visit auto-skips to the OS",
    /\/login$/.test(page.url()) && (await visible("[data-testid=os-stub]")) && !(await visible("[data-testid=hero-login]")),
    `url=${page.url()} stub=${await visible("[data-testid=os-stub]")} hero=${await visible("[data-testid=hero-login]")}`,
  );
} catch (error) {
  record("harness ran", false, String(error?.message || error).slice(0, 160));
}

await browser.close();
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} overlay checks green`);
process.exit(failed.length === 0 ? 0 : 1);
