#!/usr/bin/env node
/**
 * Proof of the "Native Cloudflare OS only" sidebar toggle (Brian: hide every custom preview page so
 * the stock Cloudflare OS can be seen + fully used). BA-authed real Chromium, PROD. Asserts:
 *   1. the toggle (role="switch" "Native OS only") renders in the sidebar rail;
 *   2. OFF → every custom row is visible (Goals/Analytics/Database/…);
 *   3. clicking it ON hides every custom row + the "Operate" header, keeps the native rows
 *      (Home/Workspaces/Blueprints/Explore/Outputs/Context & Skills);
 *   4. the choice PERSISTS across a reload (localStorage);
 *   5. ⌘K mirrors it — a custom destination is dropped while a native one stays;
 *   6. toggling OFF restores the custom rows;
 *   7. zero console errors throughout.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL/BA_E2E_PASSWORD)"); process.exit(2); }

// Native rows that MUST survive native-only mode (stock Cloudflare OS surfaces).
const NATIVE = ["Home", "Workspaces", "Blueprints", "Explore", "Outputs", "Context & Skills"];
// Custom rows (always-rendered, not flag-gated) that MUST hide in native-only mode.
const CUSTOM = ["Goals", "Analytics", "Automations", "Agents", "Database", "Billing", "Domains", "Knowledge"];
const TOGGLE = 'aside [role="switch"]';

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
// Skip the first-run splash so the OS shell mounts straight away. Do NOT touch the native-only key
// here (addInitScript runs on every nav) — a fresh context starts with it absent = mode OFF.
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const navLabels = async () =>
  (await page.locator("aside nav a").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
const hasRow = (labels, name) => labels.some((t) => t.toLowerCase() === name.toLowerCase() || t.toLowerCase().startsWith(name.toLowerCase()));

try {
  // 1. BA sign-in → a native authed route (Home) so the AppShell + rail are present.
  await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('[data-testid="auth-submit"]');
  await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside nav a", { timeout: 25000 });
  await page.waitForTimeout(1000);

  // 2. The toggle renders.
  const toggle = page.locator(TOGGLE).first();
  ok("toggle present in sidebar", await toggle.count() > 0);

  // 3. OFF baseline: custom rows visible.
  const before = await navLabels();
  const customVisibleBefore = CUSTOM.filter((c) => hasRow(before, c));
  ok("custom rows visible when OFF", customVisibleBefore.length === CUSTOM.length,
    `${customVisibleBefore.length}/${CUSTOM.length} shown`);
  ok("native rows visible when OFF", NATIVE.every((n) => hasRow(before, n)));

  // 4. Toggle ON → custom rows hidden, native rows + Operate header gone/kept.
  await toggle.click();
  await page.waitForTimeout(600);
  const afterOn = await navLabels();
  const customStillShown = CUSTOM.filter((c) => hasRow(afterOn, c));
  ok("custom rows HIDDEN when ON", customStillShown.length === 0,
    customStillShown.length ? `still shown: ${customStillShown.join(", ")}` : "all hidden");
  ok("native rows KEPT when ON", NATIVE.every((n) => hasRow(afterOn, n)),
    `kept ${NATIVE.filter((n) => hasRow(afterOn, n)).length}/${NATIVE.length}`);
  const asideText = (await page.locator("aside").innerText()).replace(/\s+/g, " ");
  ok('"Operate" header hidden when ON', !/\bOperate\b/.test(asideText));
  ok("toggle aria-checked=true when ON", (await toggle.getAttribute("aria-checked")) === "true");
  await page.screenshot({ path: "scripts/.native-mode-on.png" });

  // 5. Persists across a reload.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside nav a", { timeout: 25000 });
  await page.waitForTimeout(800);
  const afterReload = await navLabels();
  ok("native-only PERSISTS across reload", CUSTOM.every((c) => !hasRow(afterReload, c)) && hasRow(afterReload, "Home"));

  // 6. ⌘K mirrors native mode: a native destination present, a custom one absent.
  const DIALOG = '[role="dialog"][aria-label="Command palette"]';
  const openPalette = async () => {
    await page.keyboard.press("Meta+k").catch(() => {});
    if (await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) return true;
    await page.keyboard.press("Control+k").catch(() => {});
    if (await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) return true;
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("gadgets:open-command-palette")));
    return page.locator(DIALOG).waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
  };
  const opened = await openPalette();
  await page.waitForTimeout(400);
  const palette = opened ? (await page.locator(`${DIALOG} button[data-index]`).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()) : [];
  const paletteHasNative = palette.some((t) => /\bWorkspaces\b/i.test(t));
  const paletteHasCustom = palette.some((t) => /\bAnalytics\b/i.test(t) || /\bGoals\b/i.test(t) || /\bDatabase\b/i.test(t));
  ok("⌘K keeps a native destination in native mode", opened && paletteHasNative);
  ok("⌘K drops custom destinations in native mode", opened && !paletteHasCustom,
    paletteHasCustom ? "a custom command still listed" : "none listed");
  await page.keyboard.press("Escape").catch(() => {});

  // 7. Toggle OFF restores the custom rows.
  await page.waitForTimeout(300);
  await page.locator(TOGGLE).first().click();
  await page.waitForTimeout(600);
  const afterOff = await navLabels();
  ok("custom rows RESTORED when OFF again", CUSTOM.every((c) => hasRow(afterOff, c)));

  // 8. Zero console errors throughout.
  ok("zero console errors", errors.length === 0, errors.length ? errors.slice(0, 4).join(" | ") : "");
} catch (e) {
  ok("verifier ran to completion", false, String(e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? "❌" : "✅"} verify-native-mode: ${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length ? 1 : 0);
