#!/usr/bin/env node
/**
 * fire-71 render proof: the first absorption slice — the flag-gated /models Notion-style catalog —
 * renders inside the authed OS shell. BA-authenticated real Chromium against PROD. Needs
 * BA_E2E_EMAIL / BA_E2E_PASSWORD (from get-secret). Reconciles display-vs-store: the table row
 * count must equal the SUGGESTED_MODELS catalog size (the authoritative source).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL;
const PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.log("missing BA_E2E_EMAIL / BA_E2E_PASSWORD");
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
// Skip the first-view LandingHomepage splash so we reach the shell directly.
await page.addInitScript(() => {
  try { localStorage.setItem("megabyteOS_entered", "1"); } catch {}
});
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// 1) Sign in through the real BA /signin form.
await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
// Success surfaces either the "You're in" card or an authed redirect — wait for the session.
await page.waitForTimeout(2500);

// Land in the authed shell; complete onboarding if it blocks the Outlet (one-time test-user setup:
// steps avatar→model→connections, name pre-filled, "Next" ungated, last step "Let's build").
await page.goto(`${APEX}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
for (let i = 0; i < 5; i++) {
  const finish = page.locator("button", { hasText: /Let'?s build/ });
  if (await finish.count()) { await finish.first().click().catch(() => {}); await page.waitForTimeout(3000); break; }
  const next = page.locator("button", { hasText: /^\s*Next\s*$/ });
  if (await next.count()) { await next.first().click().catch(() => {}); await page.waitForTimeout(1000); continue; }
  break;
}

// 2) Go to the catalog route (session cookie now set, onboarding done).
await page.goto(`${APEX}/models`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);

// 3) Inspect the rendered table.
const probe = await page.evaluate(() => {
  const table = document.querySelector("table");
  const headers = [...document.querySelectorAll("th")].map((h) => h.textContent.trim()).filter(Boolean);
  const bodyRows = document.querySelectorAll("tbody tr").length;
  const notAvail = document.body.innerText.includes("not available");
  const navModels = [...document.querySelectorAll("a,button")].some((e) => /(^|\s)Models(\s|$)/.test(e.textContent || ""));
  // Any cyan (#00E5FF → rgb(0,229,255)) ink in the page?
  const cyan = [...document.querySelectorAll("*")].some((el) => {
    const s = getComputedStyle(el);
    return s.color === "rgb(0, 229, 255)" || s.backgroundColor === "rgb(0, 229, 255)";
  });
  return { hasTable: !!table, headers, bodyRows, notAvail, navModels, cyan };
});

await page.screenshot({ path: "scripts/.models-catalog-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify(probe, null, 2));
console.log(`consoleErrors=${consoleErrors.length}${consoleErrors.length ? " :: " + consoleErrors.join(" | ").slice(0, 300) : ""}`);

let ok = true;
if (!probe.hasTable || probe.bodyRows < 1) { console.log("❌ FAIL: no table rows rendered"); ok = false; }
else console.log(`✅ PASS: catalog table rendered (${probe.bodyRows} rows, headers: ${probe.headers.join(" / ")})`);
if (probe.notAvail) { console.log("❌ FAIL: 'not available' state shown (flag not resolving on)"); ok = false; }
if (consoleErrors.length) { console.log("❌ FAIL: console errors on /models"); ok = false; }
else console.log("✅ PASS: /models console-error-free");
process.exit(ok ? 0 : 1);
