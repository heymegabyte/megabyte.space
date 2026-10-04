#!/usr/bin/env node
/**
 * fire-76 Deep-UI-Explorer: BA-authed walk of the main authed OS surfaces, screenshotting each for
 * a vision assessment (find the highest-value opportunity, break the /models tunnel). Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errorsByRoute = {};
let current = "signin";
page.on("console", (m) => { if (m.type() === "error") (errorsByRoute[current] ??= []).push(m.text()); });
page.on("pageerror", (e) => (errorsByRoute[current] ??= []).push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForTimeout(2500);
// Reach the home shell.
current = "home";
await page.goto(`${APEX}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {}); // the sidebar
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/.os-home.png" });

// Client-side nav via the sidebar (no full reboot) to each surface.
const surfaces = ["Workspaces", "Blueprints", "Explore", "Outputs"];
for (const label of surfaces) {
  current = label.toLowerCase();
  const link = page.locator('aside a, aside [role="button"]', { hasText: new RegExp(`^${label}$`) }).first();
  if (await link.count()) {
    await link.click().catch(() => {});
    await page.waitForTimeout(2800);
    await page.screenshot({ path: `scripts/.os-${current}.png` });
  } else {
    console.log(`(no sidebar link for ${label})`);
  }
}

await browser.close();
console.log(JSON.stringify({ errorsByRoute }, null, 2));
console.log("screenshots: .os-home.png " + surfaces.map((s) => `.os-${s.toLowerCase()}.png`).join(" "));
