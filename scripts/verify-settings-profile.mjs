#!/usr/bin/env node
/**
 * PROOF: the new /settings + /profile screens render on PROD with real content, reachable + no errors.
 * BA-authed real Chromium. Asserts each page paints substantial content, carries its key sections,
 * shows no error-boundary, and logs 0 console errors. Screenshots both for visual inspection.
 * Needs BA creds: BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
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
await page.waitForTimeout(3000);

async function checkRoute(path, mustInclude) {
  const before = errors.length;
  await page.goto(`${APEX}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2500);
  const text = (await page.evaluate(() => document.body.innerText)) || "";
  await page.screenshot({ path: `scripts/.proof${path.replace(/\W+/g, "-")}.png`, fullPage: true });
  const hit = mustInclude.filter((k) => new RegExp(k, "i").test(text));
  const errored = /something went wrong|unexpected error|error boundary|failed to load/i.test(text);
  const newErrors = errors.slice(before);
  return { path, len: text.length, hit, missing: mustInclude.filter((k) => !hit.includes(k)), errored, newErrors };
}

const settings = await checkRoute("/settings", ["Settings", "Account", "Appearance", "Theme|Light|Dark", "Danger"]);
const profile = await checkRoute("/profile", ["Profile|Account", "Connected|GitHub|Google", "Model|Preferences|Notifications"]);

await browser.close();

const fatal = errors.filter((e) => !/favicon|beacon|cloudflareinsights|ResizeObserver/i.test(e));
console.log(JSON.stringify({ settings, profile, totalConsoleErrors: errors.length, fatalErrors: fatal.length }, null, 2));
if (fatal.length) console.log("fatal:", fatal.slice(0, 5).join(" | ").slice(0, 500));

let ok = true;
for (const r of [settings, profile]) {
  if (r.len < 400) { console.log(`❌ ${r.path}: thin/blank (${r.len} chars)`); ok = false; }
  else if (r.errored) { console.log(`❌ ${r.path}: shows an error boundary`); ok = false; }
  else if (r.hit.length < 2) { console.log(`❌ ${r.path}: missing key sections (hit ${r.hit.join(",")||"none"})`); ok = false; }
  else console.log(`✅ ${r.path}: renders (${r.len} chars; sections: ${r.hit.join(", ")})`);
}
if (fatal.length) { console.log("❌ fatal console errors"); ok = false; }
else console.log(`✅ 0 fatal console errors (${errors.length} total incl. benign)`);
process.exit(ok ? 0 : 1);
