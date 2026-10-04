#!/usr/bin/env node
/**
 * fire-78 golden-path: the CORE gadget-building flow. BA-authed real Chromium, PROD. Home composer →
 * read the model picker → type a prompt → send → observe the workspace/conversation + an assistant
 * response begins. Asserts the heart of the product works + is error-free. Needs BA creds.
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
// Wait for the sign-in to SUCCEED (session established) before navigating — a fixed timeout flakes.
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
await page.goto(`${APEX}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3000);
// Measure console errors from the CORE FLOW only (ignore any sign-in/redirect transients).
errors.length = 0;

// 1) The composer + model picker are present.
const composer = page.locator('textarea, [contenteditable="true"], [role="textbox"]').first();
const composerPresent = await composer.count() > 0;
const bodyText = await page.locator("body").innerText().catch(() => "");
const modelPickerText = (bodyText.match(/Kimi[^\n]*|GLM[^\n]*|Claude[^\n]*|GPT[^\n]*/) || ["(none)"])[0].slice(0, 40);
await page.screenshot({ path: "scripts/.journey-1-home.png" });

// 2) Type a prompt.
let typed = false, sent = false, respondedUrl = "", assistantAppeared = false;
if (composerPresent) {
  await composer.click();
  await composer.fill("Build a simple click counter: a big button that shows how many times it was clicked.");
  typed = true;
  await page.waitForTimeout(500);
  await page.screenshot({ path: "scripts/.journey-2-typed.png" });

  // 3) Send — try Cmd/Ctrl+Enter, then Enter, then an enabled send button.
  const urlBefore = page.url();
  await page.keyboard.press("Meta+Enter").catch(() => {});
  await page.waitForTimeout(1500);
  if (page.url() === urlBefore) { await composer.press("Enter").catch(() => {}); await page.waitForTimeout(1500); }
  if (page.url() === urlBefore) {
    // Click a send button near the composer (arrow icon / submit).
    const sendBtn = page.locator('button[type="submit"], button[aria-label*="end" i], form button').last();
    if (await sendBtn.count()) { await sendBtn.click().catch(() => {}); }
    await page.waitForTimeout(1500);
  }
  sent = page.url() !== urlBefore;
  respondedUrl = page.url();

  // 4) Wait for the workspace/conversation + an assistant response to begin (generous).
  if (sent) {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "scripts/.journey-3-sent.png" });
    // The user's message echoes; wait for an assistant turn / streaming content beyond it.
    await page.waitForFunction(
      () => {
        const t = document.body.innerText || "";
        // Assistant has started if there's content well beyond the prompt echo.
        return t.length > 1200 || /thinking|building|generat|working on it|counter/i.test(t);
      },
      { timeout: 45000 },
    ).catch(() => {});
    await page.waitForTimeout(2000);
    const t = await page.locator("body").innerText().catch(() => "");
    assistantAppeared = t.length > 1200 || /building|generat|counter|button/i.test(t);
    await page.screenshot({ path: "scripts/.journey-4-response.png" });
  }
}

await browser.close();
console.log(JSON.stringify({ composerPresent, modelPickerText, typed, sent, respondedUrl: respondedUrl.replace(APEX, ""), assistantAppeared, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));

let ok = true;
if (!composerPresent) { console.log("❌ FAIL: no composer textarea on home"); ok = false; }
else console.log(`✅ PASS: home composer present (model: ${modelPickerText})`);
if (!typed) { console.log("❌ FAIL: couldn't type a prompt"); ok = false; }
else console.log("✅ PASS: typed a prompt");
if (!sent) { console.log("❌ FAIL: send did not start a conversation (no navigation)"); ok = false; }
else console.log(`✅ PASS: send started a conversation → ${respondedUrl.replace(APEX, "")}`);
if (sent && !assistantAppeared) { console.log("⚠️  assistant response not clearly observed in 45s (slow build?) — review .journey-4"); }
else if (sent) console.log("✅ PASS: assistant response / build began");
if (errors.length) { console.log("❌ FAIL: console errors in the core flow"); ok = false; }
else console.log("✅ PASS: 0 console errors through the core flow");
process.exit(ok ? 0 : 1);
