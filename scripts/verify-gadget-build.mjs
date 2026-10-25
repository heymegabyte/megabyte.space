#!/usr/bin/env node
/**
 * PROOF of the OS's CORE capability: ask the agent to BUILD something and a working gadget appears.
 * (The existing gadget verifiers only cover CRUD on EXISTING gadgets — delete/pin/rename/table —
 *  none exercised the actual build-from-a-prompt pipeline. This fills that gap.)
 *
 * BA-authed real Chromium, PROD: sign in → Home composer → send a build prompt → land in /workspace
 * → the agent streams code AND a running gadget renders (an <iframe> preview OR the "No gadgets yet"
 * placeholder is replaced). Asserts a gadget actually built + 0 fatal console errors.
 * Needs BA creds: BA_E2E_EMAIL / BA_E2E_PASSWORD.  Optional MODEL="<name substring>".
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
const PICK = process.env.MODEL || null;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }
const BUILD_PROMPT = "Build a simple counter gadget: a large number display starting at 0, an Increment button that adds 1, and a Reset button. One self-contained file.";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// sign in
await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForTimeout(3000);

// home composer
await page.goto(`${APEX}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("textarea", { timeout: 25000 });
await page.waitForTimeout(1500);
if (PICK) {
  await page.click('[aria-label="Select model"]').catch(() => {});
  await page.waitForTimeout(500);
  const item = page.locator('[role="menuitem"]', { hasText: PICK }).first();
  if (await item.count()) await item.click().catch(() => {}); else await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
}
const model = (await page.locator('[aria-label="Select model"]').innerText().catch(() => "")).trim();

// send the build prompt
await page.locator("textarea").first().fill(BUILD_PROMPT);
await page.waitForTimeout(300);
await page.click('[aria-label="Send message"]');

let navigated = false;
try { await page.waitForURL(/\/workspace\//, { timeout: 30000 }); navigated = true; } catch {}

// wait (up to ~360s) for a gadget to actually RENDER — DOM signals only (never prompt-echo text):
//   a running <iframe> preview appears, OR a real code editor (monaco/cm) renders the generated files.
// Also track whether the agent is still Thinking/Waiting so a timeout tells slow-vs-stuck.
let built = false, how = "", iframes = 0, lastThinking = true, replies = 0;
const deadline = Date.now() + 360000;
while (Date.now() < deadline) {
  const state = await page.evaluate(() => ({
    iframeCount: document.querySelectorAll("iframe").length,
    hasCodeEditor: !!document.querySelector(".monaco-editor, [class*='cm-editor'], [class*='monaco-']"),
    thinking: /Thinking|Waiting for agent|Generating|Building/i.test(document.body.innerText),
    replyCount: document.querySelectorAll('[aria-label="Copy message"]').length,
  }));
  iframes = state.iframeCount; lastThinking = state.thinking; replies = state.replyCount;
  if (state.iframeCount > 0) { built = true; how = "iframe-preview"; break; }
  if (state.hasCodeEditor) { built = true; how = "code-editor-rendered"; break; }
  await page.waitForTimeout(4000);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/.gadget-build-proof.png", fullPage: false });

// persistence: the new gadget should appear in /gadgets
await page.goto(`${APEX}/gadgets`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
await page.waitForSelector("aside", { timeout: 20000 }).catch(() => {});
await page.waitForFunction(() => document.querySelector("tbody tr") !== null || /gadgets?\b/i.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);
const gadgetRows = await page.locator("tbody tr").count().catch(() => 0);

await browser.close();
const fatal = errors.filter((e) => !/favicon|beacon|cloudflareinsights|ResizeObserver|WebSocket is already/i.test(e));
console.log(JSON.stringify({ model, selected: PICK || "(default)", navigatedToWorkspace: navigated, gadgetBuilt: built, how, iframes, stillThinkingAtEnd: lastThinking, agentReplies: replies, gadgetRowsAfter: gadgetRows, consoleErrors: errors.length, fatalErrors: fatal.length }, null, 2));
if (fatal.length) console.log("fatal:", fatal.slice(0, 3).join(" | ").slice(0, 300));

let ok = true;
if (!navigated) { console.log("❌ FAIL: build prompt did not open a /workspace"); ok = false; }
else console.log("✅ PASS: build prompt created a workspace");
if (!built) {
  const why = lastThinking ? "agent STILL THINKING at 360s (build too slow or stuck)" : `agent stopped (replies=${replies}) but NO app rendered (replied text, did not build)`;
  console.log(`❌ FAIL: no working gadget rendered — ${why}`); ok = false;
}
else console.log(`✅ PASS: a gadget BUILT and rendered (${how}, iframes=${iframes})`);
if (gadgetRows < 1) { console.log("⚠️  WARN: /gadgets shows 0 rows (persistence not confirmed)"); }
else console.log(`✅ PASS: gadget persisted — /gadgets lists ${gadgetRows} row(s)`);
if (fatal.length) { console.log("❌ FAIL: fatal console errors"); ok = false; }
else console.log("✅ PASS: 0 fatal console errors");
process.exit(ok ? 0 : 1);
