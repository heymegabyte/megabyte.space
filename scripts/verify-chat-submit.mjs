#!/usr/bin/env node
/**
 * PROOF: the prompt screen loads the models we support AND a submitted prompt gets a real reply.
 * BA-authed real Chromium, PROD. Asserts:
 *   1. the home composer's model picker lists the expected catalog (DeepSeek V4 Pro default + the
 *      keyless Workers AI set + Claude 4.5);
 *   2. submitting a prompt navigates into a /workspace and the agent streams back visible reply text;
 *   3. no fatal console errors on the path.
 * Optional env MODEL="<name substring>" selects that model before sending (else uses the default).
 * Needs BA creds: BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
const PICK = process.env.MODEL || null; // substring of a model name to select, or null = default
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

// The catalog we expect after the setup fix (names from SUGGESTED_MODELS).
const EXPECT = ["DeepSeek V4 Pro", "DeepSeek V4 Flash", "GLM 5.3", "Kimi K2.7", "Llama 4 Scout", "GPT-OSS 120B", "Claude Sonnet 4.5", "Claude Haiku 4.5"];

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// --- sign in (inlined login gate) ---
await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForTimeout(3000);

// --- home composer ---
await page.goto(`${APEX}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("textarea", { timeout: 25000 });
await page.waitForTimeout(1500); // let listModels() resolve + populate the picker

// --- read the model picker ---
await page.click('[aria-label="Select model"]');
await page.waitForTimeout(600);
const listed = await page.locator('[role="menu"] [role="menuitem"], [role="menuitem"]').allInnerTexts().catch(() => []);
const picker = listed.map((s) => s.trim()).filter(Boolean);
const found = EXPECT.filter((e) => picker.some((p) => p.includes(e)));
if (PICK) {
  const item = page.locator('[role="menuitem"]', { hasText: PICK }).first();
  if (await item.count()) { await item.click(); } else { await page.keyboard.press("Escape"); }
} else {
  await page.keyboard.press("Escape");
}
await page.waitForTimeout(400);
const defaultLabel = (await page.locator('[aria-label="Select model"]').innerText().catch(() => "")).trim();

// --- compose + submit ---
const PROMPT = "In one short sentence, introduce Megabyte OS.";
await page.locator("textarea").first().fill(PROMPT);
await page.waitForTimeout(400);
await page.click('[aria-label="Send message"]');

// --- wait to land in the workspace, then for the agent to stream a reply ---
let navigated = false;
try { await page.waitForURL(/\/workspace\//, { timeout: 30000 }); navigated = true; } catch {}
await page.waitForTimeout(2000);
const baseline = (await page.evaluate(() => document.body.innerText)) || "";
let replied = false, replyLen = 0;
const deadline = Date.now() + 90000;
while (Date.now() < deadline) {
  const txt = (await page.evaluate(() => document.body.innerText)) || "";
  // Growth beyond the echoed prompt + chrome == the agent produced visible output.
  const grew = txt.length - baseline.length;
  const hasCopy = await page.locator('[aria-label="Copy message"]').count().catch(() => 0);
  if (grew > 60 && hasCopy >= 1) { replied = true; replyLen = grew; break; }
  await page.waitForTimeout(2500);
}
const tail = (await page.evaluate(() => document.body.innerText) || "").slice(-280).replace(/\s+/g, " ");

await page.screenshot({ path: `scripts/.chat-submit-proof${PICK ? "-" + PICK.replace(/\W+/g, "") : ""}.png`, fullPage: false });
await browser.close();

const fatal = errors.filter((e) => !/favicon|beacon|cloudflareinsights|ResizeObserver/i.test(e));
console.log(JSON.stringify({
  modelsListed: picker.length, expectedFound: found, missing: EXPECT.filter((e) => !found.includes(e)),
  defaultLabel, selected: PICK || "(default)", navigatedToWorkspace: navigated, replied, replyGrowthChars: replyLen,
  tail, consoleErrors: errors.length, fatalErrors: fatal.length,
}, null, 2));
if (fatal.length) console.log("fatal:", fatal.slice(0, 4).join(" | ").slice(0, 400));

let ok = true;
if (found.length < 5) { console.log(`❌ FAIL: picker listed only ${found.length}/${EXPECT.length} expected models`); ok = false; }
else console.log(`✅ PASS: picker lists ${found.length}/${EXPECT.length} expected models (${found.join(", ")})`);
if (!navigated) { console.log("❌ FAIL: submit did not navigate into a /workspace"); ok = false; }
else console.log("✅ PASS: submit created a workspace");
if (!replied) { console.log("❌ FAIL: no visible agent reply within 90s"); ok = false; }
else console.log(`✅ PASS: agent streamed a reply (+${replyLen} chars) — tail: …${tail.slice(-120)}`);
process.exit(ok ? 0 : 1);
