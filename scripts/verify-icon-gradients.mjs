#!/usr/bin/env node
/**
 * fire-76 proof: the blueprint/gadget icon gradients are recolored orange→brand-cyan. BA-authed
 * real Chromium, PROD. Asserts on /workspaces (where the orange icons were): ZERO warm gradient
 * classes (from-orange/red/amber/rose/pink) in the DOM, ≥1 brand-cool gradient class
 * (from-cyan/sky/violet/indigo/teal), 0 console errors. Needs BA creds.
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
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForTimeout(2500);
await page.goto(`${APEX}/workspaces`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
// Wait for the blueprint cards (the icon gradient squares) to render.
await page.waitForFunction(
  () => document.querySelector('[class*="bg-gradient-to-br"]') !== null,
  { timeout: 20000 },
).catch(() => {});
await page.waitForTimeout(1500);

const g = await page.evaluate(() => {
  const all = [...document.querySelectorAll('[class*="from-"]')];
  const warm = all.filter((e) => /\bfrom-(orange|red|amber|rose|pink|yellow)-/.test(e.className) || /from-\[#(ff|e0|ec|f5|fb)/i.test(e.className));
  const cool = all.filter((e) => /\bfrom-(cyan|sky|violet|indigo|teal|blue|purple|slate)-/.test(e.className));
  return { total: all.length, warm: warm.length, cool: cool.length, warmSample: warm.slice(0, 3).map((e) => e.className.match(/from-\S+/)?.[0]) };
});

await page.screenshot({ path: "scripts/.icon-gradients-proof.png" });
await browser.close();

console.log(JSON.stringify({ ...g, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (g.warm > 0) { console.log(`❌ FAIL: ${g.warm} warm/orange gradient(s) remain: ${g.warmSample.join(", ")}`); ok = false; }
else console.log("✅ PASS: no warm/orange icon gradients on /workspaces");
if (g.cool < 1) { console.log("❌ FAIL: no brand-cool gradient classes found (did cards render?)"); ok = false; }
else console.log(`✅ PASS: ${g.cool} brand-cool (cyan/violet/sky/…) icon gradient(s) present`);
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
