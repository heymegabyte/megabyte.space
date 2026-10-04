#!/usr/bin/env node
/**
 * fire-81 Deep-UI-Explorer: BA-authed goto-walk of specific ROUTES (args, default a few), screenshot
 * each, report console errors per route. Complements walk-os.mjs (which navigates via the sidebar).
 * Usage: node walk-routes.mjs /outputs /gatekeepers /gadgets
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/outputs", "/gatekeepers", "/gadgets"];

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
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);

for (const route of routes) {
  current = route.replace(/\//g, "") || "home";
  await page.goto(`${APEX}${route}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `scripts/.route-${current}.png` });
}
await browser.close();
console.log(JSON.stringify({ errorsByRoute }, null, 2));
console.log("shots: " + routes.map((r) => `.route-${r.replace(/\//g, "") || "home"}.png`).join(" "));
