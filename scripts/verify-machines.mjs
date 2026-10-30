#!/usr/bin/env node
/**
 * Proof the Machines panel (absorbed gatekeeper-localhost model) is REACHABLE from the sidebar and
 * its scoped-grant + bounded-job governance works. BA-authed real Chromium, PROD. Real-user nav
 * (click the sidebar row, no direct goto). Asserts:
 *   1. the "Machines" sidebar row navigates to /machines + the panel h1 + preview pill render;
 *   2. a sample machine card shows the 3 grant types (Folders / Execution / Network) + quota footer;
 *   3. the Execution grant toggle (role=switch) flips;
 *   4. "Share a folder" adds a folder grant chip (scoped-grant governance);
 *   5. "Run a sample job" enqueues a job that transitions scheduled → Finished (bounded-job lifecycle);
 *   6. "Pair a machine" adds a machine;
 *   7. zero console errors throughout.
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL/BA_E2E_PASSWORD)"); process.exit(2); }

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass }); console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 1000 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); localStorage.removeItem("gadgets:native-os-only"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const STUDIO = 'section[aria-label="Studio MacBook Pro"]';
const execCount = () => page.locator('[role="switch"][aria-label="Execution grant"]').count();

try {
  await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('[data-testid="auth-submit"]');
  await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside nav a", { timeout: 25000 });
  await page.waitForTimeout(800);

  // 1. Reachable via the sidebar (real-user nav, no direct goto).
  const navRow = page.locator('aside nav a', { hasText: "Machines" }).first();
  ok("'Machines' row present in sidebar", (await navRow.count()) > 0);
  await navRow.click();
  await page.waitForTimeout(700);
  ok("navigated to /machines", page.url().endsWith("/machines"), page.url());
  ok("panel h1 'Machines' visible", await page.locator('h1', { hasText: /^Machines$/ }).first().isVisible());
  ok("preview pill present", await page.getByText("Preview · sample data").first().isVisible());

  // 2. A sample machine card + the 3 grant types + quota footer.
  ok("sample machine card renders", await page.locator(STUDIO).first().isVisible());
  ok("Folders grant shown", await page.locator(`${STUDIO}`).getByText("Folders", { exact: true }).first().isVisible());
  ok("Execution grant shown", await page.locator(`${STUDIO}`).getByText("Execution", { exact: true }).first().isVisible());
  ok("Network grant shown", await page.locator(`${STUDIO}`).getByText("Network", { exact: true }).first().isVisible());
  ok("quota/bounds footer shown", await page.locator(`${STUDIO}`).getByText(/30s max job/).first().isVisible());

  // 3. Execution toggle flips.
  const toggle = page.locator(`${STUDIO} [role="switch"][aria-label="Execution grant"]`).first();
  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await page.waitForTimeout(250);
  const after = await toggle.getAttribute("aria-checked");
  ok("Execution toggle flips (role=switch aria-checked)", before !== after, `${before} → ${after}`);

  // 4. Share a folder adds a scoped grant chip.
  const folderRevokes = () => page.locator(`${STUDIO} button[aria-label^="Revoke ~"]`).count();
  const foldersBefore = await folderRevokes();
  await page.locator(`${STUDIO} button`, { hasText: "Share a folder" }).first().click();
  await page.waitForTimeout(250);
  const foldersAfter = await folderRevokes();
  ok("'Share a folder' adds a grant chip", foldersAfter === foldersBefore + 1, `${foldersBefore} → ${foldersAfter}`);

  // 5. Run a sample job → scheduled → Finished (bounded-job lifecycle).
  const jobRows = () => page.locator('ul[aria-label="Recent machine jobs"] li').count();
  const jobsBefore = await jobRows();
  await page.locator(`${STUDIO} button`, { hasText: "Run a sample job" }).first().click();
  await page.waitForTimeout(300);
  ok("'Run a sample job' enqueues a job", (await jobRows()) > jobsBefore, `${jobsBefore} → ${await jobRows()}`);
  await page.waitForTimeout(2600); // let scheduled → running → finished settle
  const topJob = page.locator('ul[aria-label="Recent machine jobs"] li').first();
  ok("job transitions to Finished", /Finished/i.test((await topJob.innerText()) || ""), (await topJob.innerText()).replace(/\s+/g, " ").slice(0, 60));

  // 6. Pair a machine.
  const machinesBefore = await execCount();
  await page.locator('button', { hasText: "Pair a machine" }).first().click();
  await page.waitForTimeout(300);
  ok("'Pair a machine' adds a machine", (await execCount()) === machinesBefore + 1, `${machinesBefore} → ${await execCount()}`);

  await page.screenshot({ path: "scripts/.machines.png", fullPage: true });
  ok("zero console errors", errors.length === 0, errors.length ? errors.slice(0, 4).join(" | ") : "");
} catch (e) {
  ok("verifier ran to completion", false, String(e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? "❌" : "✅"} verify-machines: ${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length ? 1 : 0);
