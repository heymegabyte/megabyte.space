#!/usr/bin/env node
/**
 * fire-114 proof: the HOME composer — the North-Star value-path ENTRY ("tell Megabyte an outcome") —
 * is functional. BA-authed real Chromium, PROD. READ-ONLY by design: it types into the composer and
 * exercises the submit affordance + task-suggestions WITHOUT ever submitting, so NO gadget is created
 * and ba-e2e is untouched. (The full create→generate→editor E2E is a dedicated-session task — it
 * mutates + costs inference; tracked in BACKLOG.)
 *
 * Asserts: the composer renders; Send is DISABLED when empty and ENABLES on input (embarrassingly-easy
 * gate — you can't send nothing); clearing re-disables it; the "Example tasks" suggestions render and
 * clicking one SEEDS the composer (so the one-tap idea → prompt path works); 0 console errors.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

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

// Land on the home composer.
await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForSelector("textarea", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1000);

const composer = page.locator("textarea").first();
const sendBtn = page.locator('button[aria-label="Send message"]').first();
const suggestions = page.locator('section[aria-label="Example tasks"] button');

const composerPresent = await composer.count() > 0 && await composer.isVisible().catch(() => false);
const sendPresent = await sendBtn.count() > 0;

// 1. Empty composer → Send disabled (can't send nothing).
const disabledWhenEmpty = sendPresent ? await sendBtn.isDisabled().catch(() => false) : false;

// 2. Type → Send enables.
let enablesOnInput = false, reDisablesOnClear = false;
if (composerPresent) {
  await composer.click();
  await composer.fill("Build a simple visitor counter for my site");
  await page.waitForTimeout(400);
  enablesOnInput = sendPresent ? !(await sendBtn.isDisabled().catch(() => true)) : false;
  // 3. Clear → Send re-disables (the gate round-trips).
  await composer.fill("");
  await page.waitForTimeout(400);
  reDisablesOnClear = sendPresent ? await sendBtn.isDisabled().catch(() => false) : false;
}

// 4. Task suggestions render + clicking one SEEDS the composer (one-tap idea → prompt).
const suggestionCount = await suggestions.count();
let suggestionSeedsComposer = false;
if (suggestionCount > 0) {
  await suggestions.first().click().catch(() => {});
  await page.waitForTimeout(500);
  const seeded = (await composer.inputValue().catch(() => "")) || "";
  suggestionSeedsComposer = seeded.trim().length > 0;
  await composer.fill("").catch(() => {}); // leave the composer empty (no draft lingering)
}

await page.screenshot({ path: "scripts/.home-composer-proof.png" });
await browser.close();

console.log(JSON.stringify({ composerPresent, sendPresent, disabledWhenEmpty, enablesOnInput, reDisablesOnClear, suggestionCount, suggestionSeedsComposer, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(composerPresent, "the home composer renders", "no composer textarea on the home page");
check(sendPresent, "the Send affordance is present", "no Send button");
check(disabledWhenEmpty, "Send is disabled on an empty composer (can't send nothing)", "Send was enabled with an empty composer");
check(enablesOnInput, "Send enables once you type a prompt", "Send did not enable after typing");
check(reDisablesOnClear, "Send re-disables when the composer is cleared (gate round-trips)", "Send stayed enabled after clearing");
check(suggestionCount > 0, `task suggestions render (${suggestionCount})`, "no task suggestions on the home page");
check(suggestionSeedsComposer, "clicking a suggestion seeds the composer (one-tap idea → prompt)", "clicking a suggestion did not seed the composer");
check(errors.length === 0, "0 console errors on the home composer", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
