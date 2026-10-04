#!/usr/bin/env node
/**
 * fire-85 GOLDEN-PATH (navigation): a LONG click-driven journey through the OS, exercising the
 * recently-shipped surfaces (Pulse · Models · Gadgets + cost strip · ⌘K · workspace) the way a real
 * user moves — sidebar clicks + ⌘K ONLY, NEVER page.goto after the initial load. This is net-new vs
 * the per-feature verifiers (which each page.goto a route): it tests NAVIGATION + shell + cross-
 * surface state. BA-authed real Chromium, PROD. Each step asserts the expected URL + a surface
 * marker + 0 NEW console errors, and screenshots to scripts/.journey/. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const DIALOG = '[role="dialog"][aria-label="Command palette"]';
const ROWS = `${DIALOG} button[data-index]`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
let errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const steps = [];
let n = 0;
async function step(name, action, expectUrl, markerRe) {
  n += 1;
  const before = errors.length;
  let ok = false, url = "", marker = false, note = "";
  try {
    await action();
    await page.waitForTimeout(900);
    url = page.url().replace(APEX, "");
    // URL expectation (if given).
    const urlOk = expectUrl ? expectUrl.test(url) : true;
    // Surface marker (visible text) expectation (if given).
    const body = await page.locator("body").innerText().catch(() => "");
    marker = markerRe ? markerRe.test(body) : true;
    ok = urlOk && marker;
    if (!urlOk) note = `url ${url} !~ ${expectUrl}`;
    else if (!marker) note = `marker ${markerRe} absent`;
  } catch (e) {
    note = `threw: ${String(e).slice(0, 80)}`;
  }
  const newErrors = errors.length - before;
  await page.screenshot({ path: `scripts/.journey/${String(n).padStart(2, "0")}-${name}.png` }).catch(() => {});
  steps.push({ n, name, ok: ok && newErrors === 0, url, marker, newErrors, note });
  console.log(`${ok && newErrors === 0 ? "✅" : "❌"} ${n}. ${name} — url=${url} marker=${marker} newErr=${newErrors}${note ? " · " + note : ""}`);
}

// Nav helpers — UI-only.
const sidebarClick = (label) => async () => {
  await page.getByRole("link", { name: label, exact: false }).first().click({ timeout: 8000 });
};
const cmdkGo = (query, rowRe) => async () => {
  if (!(await page.locator(DIALOG).isVisible().catch(() => false))) {
    await page.keyboard.press("Meta+k").catch(() => {});
    if (!(await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1200 }).then(() => true).catch(() => false))) {
      await page.keyboard.press("Control+k").catch(() => {});
      if (!(await page.locator(DIALOG).waitFor({ state: "visible", timeout: 1200 }).then(() => true).catch(() => false))) {
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("gadgets:open-command-palette")));
        await page.locator(DIALOG).waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
      }
    }
  }
  await page.fill(`${DIALOG} input`, query).catch(() => {});
  await page.waitForTimeout(350);
  await page.locator(ROWS, { hasText: rowRe }).first().click({ timeout: 6000 });
};

// 0) Homepage-start: sign in, land on the authed shell. (The ONLY goto — the journey's entry.)
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);
errors = []; // Measure console errors from the NAVIGATION journey only (ignore sign-in transients).

// All cross-surface SHELL nav happens FIRST (sidebar + ⌘K), THEN the focused workspace-editor
// detour LAST — the workspace is a focused view whose chrome intentionally drops the full nav, so
// a real user does their surface-hopping from the shell and enters the editor at the end.
await step("home-composer", async () => {}, /^\/$/, /.+/);
await step("sidebar→pulse", sidebarClick("Pulse"), /^\/pulse/, /opportunit|all clear/i);
await step("pulse-action", async () => {
  const act = page.locator("button", { hasText: /enable providers|view gadgets|browse integrations|build your first|connect/i }).first();
  if (await act.count()) await act.click({ timeout: 6000 });
}, /^\/(models|gadgets|gatekeepers|providers)/, /.+/);
await step("cmdk→models", cmdkGo("models", /models/i), /^\/models/, /model|available|provider/i);
await step("sidebar→explore", sidebarClick("Explore"), /^\/explore/, /.+/);
await step("sidebar→blueprints", sidebarClick("Blueprints"), /^\/blueprints/, /.+/);
await step("sidebar→outputs", sidebarClick("Outputs"), /^\/outputs/, /.+/);
await step("cmdk→pulse", cmdkGo("pulse", /pulse/i), /^\/pulse/, /opportunit|all clear/i);
await step("sidebar→gadgets", sidebarClick("Gadgets"), /^\/gadgets/, /total spend/i); // cost strip (fire-84) reached via nav
await step("open-workspace", async () => {
  // fire-94: the gadget title is a real <Link name="Open …"> (the row is no longer a role=button
  // wrapper around the star — a11y nested-interactive fix).
  const link = page.getByRole("link", { name: /^Open / }).first();
  if (await link.count()) await link.click({ timeout: 8000 });
}, /^\/workspace\//, /.+/);
// fire-86: ⌘K must now open INSIDE the fullscreen workspace editor (the universal escape hatch).
// Before the CommandPaletteHost fix this failed (the handler lived only in AppShell, which the
// editor bypasses) — so this step is RED on pre-fix prod, GREEN after.
await step("cmdk-in-editor→pulse", cmdkGo("pulse", /pulse/i), /^\/pulse/, /opportunit|all clear/i);

await browser.close();
const passed = steps.filter((s) => s.ok).length;
const failed = steps.filter((s) => !s.ok);
console.log(JSON.stringify({ total: steps.length, passed, failed: failed.length, totalConsoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));
console.log(passed === steps.length ? `✅ GOLDEN-PATH GREEN: ${passed}/${steps.length} UI-click steps` : `❌ ${failed.length} step(s) failed: ${failed.map((s) => s.name).join(", ")}`);
process.exit(passed === steps.length && errors.length === 0 ? 0 : 1);
