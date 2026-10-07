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

// 5. Three stepped tabs — Ask · Create · Build — render as a proper tablist.
const tabs = page.locator('[role="tablist"][aria-label="How to start"] [role="tab"]');
const tabCount = await tabs.count();
const tabLabels = (await tabs.allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, " ").trim());
const tabsRender = tabCount === 3 &&
  ["Ask", "Create", "Build"].every((name) => tabLabels.some((t) => t.includes(name)));

// 6. Each tab keeps its OWN draft — switching tabs never loses what you typed in another (preserve
//    state across tabs). Type a distinct draft per tab, round-trip, and assert each survives.
const askTab = page.getByRole("tab", { name: "Ask" });
const createTab = page.getByRole("tab", { name: "Create" });
const buildTab = page.getByRole("tab", { name: "Build" });
let drafTabsStatePreserved = false, createEmptyOnSwitch = false;
if (tabsRender && composerPresent) {
  await askTab.click().catch(() => {});
  await page.waitForTimeout(250);
  await composer.fill("ALPHA-ask-draft");
  await page.waitForTimeout(250);
  await createTab.click().catch(() => {});
  await page.waitForTimeout(350);
  // A freshly-visited tab starts from its own (empty) draft, not the previous tab's text.
  createEmptyOnSwitch = ((await composer.inputValue().catch(() => "x")) || "").length === 0;
  await composer.fill("BETA-create-draft");
  await page.waitForTimeout(250);
  await buildTab.click().catch(() => {});
  await page.waitForTimeout(350);
  await composer.fill("GAMMA-build-draft");
  await page.waitForTimeout(250);
  // Round-trip: each tab must still hold its own draft.
  await askTab.click().catch(() => {});
  await page.waitForTimeout(350);
  const askBack = (await composer.inputValue().catch(() => "")) || "";
  await createTab.click().catch(() => {});
  await page.waitForTimeout(350);
  const createBack = (await composer.inputValue().catch(() => "")) || "";
  await buildTab.click().catch(() => {});
  await page.waitForTimeout(350);
  const buildBack = (await composer.inputValue().catch(() => "")) || "";
  drafTabsStatePreserved = askBack === "ALPHA-ask-draft" &&
    createBack === "BETA-create-draft" && buildBack === "GAMMA-build-draft";
  // Clean up every tab's draft so ba-e2e's session leaves nothing lingering.
  for (const tab of [buildTab, createTab, askTab]) {
    await tab.click().catch(() => {});
    await page.waitForTimeout(150);
    await composer.fill("").catch(() => {});
  }
}

// 7. The left-gutter nebula is mounted (decorative, aria-hidden, but present in the DOM).
const nebulaPresent = (await page.locator('[data-testid="home-nebula"]').count()) > 0;

// 8. The home page sits on the brand base surface (bg-kumo-base), not a bare white page.
const bgIsBrandBase = await page.evaluate(() => {
  const panel = document.getElementById("home-composer-panel");
  let el = panel ? panel.parentElement : null;
  while (el) {
    const cls = typeof el.className === "string" ? el.className : "";
    if (cls.includes("bg-kumo-base") && cls.includes("min-h-full")) return true;
    el = el.parentElement;
  }
  return false;
});

await page.screenshot({ path: "scripts/.home-composer-proof.png" });
await browser.close();

console.log(JSON.stringify({ composerPresent, sendPresent, disabledWhenEmpty, enablesOnInput, reDisablesOnClear, suggestionCount, suggestionSeedsComposer, tabCount, tabsRender, createEmptyOnSwitch, drafTabsStatePreserved, nebulaPresent, bgIsBrandBase, consoleErrors: errors.length }, null, 2));
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
check(tabsRender, `the three stepped tabs render (Ask · Create · Build) [${tabCount}]`, `expected 3 tabs Ask/Create/Build, saw ${tabCount}: ${tabLabels.join("|")}`);
check(createEmptyOnSwitch, "switching to a fresh tab shows its own (empty) draft, not the prior tab's text", "a freshly-visited tab leaked the previous tab's text");
check(drafTabsStatePreserved, "each tab preserves its own draft across tab switches (state preserved)", "a tab lost its draft when switching away and back");
check(nebulaPresent, "the left-gutter nebula is mounted", "no nebula element (data-testid=home-nebula) on the home page");
check(bgIsBrandBase, "the home page sits on the brand base surface (bg-kumo-base)", "the home container is not on bg-kumo-base");
check(errors.length === 0, "0 console errors on the home composer", `${errors.length} console errors`);
process.exit(ok ? 0 : 1);
