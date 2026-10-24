#!/usr/bin/env node
/**
 * Reproduce + measure the Home prompt's MODEL dropdown on PROD. BA-authed real Chromium, READ-ONLY
 * (opens the "Select model" dropdown, reads its items — never submits, never mutates ba-e2e).
 *
 * The dropdown is populated from overseer.listModels() (ChatInterface.tsx:5428), which in AI Gateway
 * mode returns SUGGESTED_MODELS for the enabled providers (deployment.jsonc aiGateway.providers =
 * openai,cloudflare,anthropic → 11 models, gpt-4o default). Asserts: ≥1 model lists, gpt-4o present +
 * is the selected default, 0 console errors. Needs BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});

await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("textarea", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1500);

const trigger = page.locator('[aria-label="Select model"]').first();
const triggerPresent = await trigger.count() > 0;
const triggerLabel = triggerPresent ? (await trigger.innerText().catch(() => "")).trim() : "(no trigger)";

let modelNames = [];
if (triggerPresent) {
  await trigger.click().catch(() => {});
  await page.waitForTimeout(600);
  // DropdownMenu.Content items render as menuitems; the last is "No agent".
  const items = page.locator('[role="menuitem"], [role="menu"] [role="menuitem"]');
  const texts = await items.allInnerTexts().catch(() => []);
  modelNames = texts.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  await page.keyboard.press("Escape").catch(() => {});
}

const modelsOnly = modelNames.filter((n) => n.toLowerCase() !== "no agent");
const hasGpt4o = modelNames.some((n) => /gpt-4o/i.test(n));
const defaultIsGpt4o = /gpt-4o/i.test(triggerLabel);

await page.screenshot({ path: "scripts/.home-models-proof.png" });
await browser.close();

console.log(JSON.stringify({ triggerPresent, triggerLabel, modelCount: modelsOnly.length, models: modelsOnly, hasGpt4o, defaultIsGpt4o, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(triggerPresent, "the Select model dropdown trigger renders", "no Select model trigger on the home composer");
check(modelsOnly.length > 0, `models are listed in the dropdown (${modelsOnly.length})`, "the model dropdown lists NO models (only 'No agent')");
check(hasGpt4o, "GPT-4o is in the list", "GPT-4o is not in the model list");
check(defaultIsGpt4o, `GPT-4o is the selected default (trigger: "${triggerLabel}")`, `the default is not GPT-4o (trigger shows "${triggerLabel}")`);
check(errors.length === 0, "0 console errors", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
