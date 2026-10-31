#!/usr/bin/env node
/**
 * Proof the sidebar sections are collapsible DROPDOWNS (Brian: "make the different pages belong to
 * drop downs in the side menu"). Each section header (Operate / Build / Library) is now a disclosure
 * <button aria-expanded aria-controls> that collapses/expands its rows; the open/closed choice
 * persists per-section in localStorage. Defaults OPEN (nothing hidden on first run). BA-authed real
 * Chromium, PROD. Asserts:
 *   1. three section disclosure buttons exist (Operate / Build / Library), each aria-expanded;
 *   2. default OPEN — all aria-expanded=true + a representative row of each section visible;
 *   3. clicking "Build" COLLAPSES it — aria-expanded=false, region goes `inert`, a Build-only row
 *      ("Workspaces") is no longer visible, while Operate ("Goals") + Library ("Agent Skills") stay;
 *   4. the collapse PERSISTS across a reload (localStorage);
 *   5. re-expanding restores the rows;
 *   6. zero console errors throughout.
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
  viewport: { width: 1280, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
});
// Dismiss the first-run splash + ensure native-mode OFF; do NOT touch the section-state key so the
// dropdowns default open (the reload-persistence step writes it itself).
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); localStorage.removeItem("gadgets:native-os-only"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const header = (id) => page.locator(`aside button[aria-controls="sidebar-section-${id}"]`).first();
const rowVisible = async (id, text) => {
  const row = page.locator(`#sidebar-section-${id} a`, { hasText: text }).first();
  return (await row.count()) > 0 && (await row.isVisible());
};
const expanded = async (id) => (await header(id).getAttribute("aria-expanded")) === "true";
const inert = async (id) => (await page.locator(`#sidebar-section-${id}`).first().getAttribute("inert")) !== null;
// The real VISUAL-collapse signal: the grid-0fr region's own rendered height → ~0 when collapsed.
// (Playwright isVisible() isn't clip-aware, so a row clipped by overflow-hidden still reads visible.)
const regionH = async (id) => { const b = await page.locator(`#sidebar-section-${id}`).first().boundingBox(); return b ? Math.round(b.height) : -1; };

try {
  await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('[data-testid="auth-submit"]');
  await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside nav a", { timeout: 25000 });
  await page.waitForTimeout(1000);

  // 1. three disclosure buttons.
  ok("Operate header is a disclosure button", (await header("operate").count()) > 0 && (await header("operate").getAttribute("aria-expanded")) !== null);
  ok("Build header is a disclosure button", (await header("build").count()) > 0 && (await header("build").getAttribute("aria-expanded")) !== null);
  ok("Library header is a disclosure button", (await header("library").count()) > 0 && (await header("library").getAttribute("aria-expanded")) !== null);

  // The 34-row "Build" was split into 6 right-sized sibling dropdowns — assert the 5 new ones exist
  // + default open (so every CF-primitive group is independently collapsible).
  for (const id of ["data", "compute", "delivery", "observe", "govern"]) {
    ok(`'${id}' section is a collapsible dropdown (default open)`, (await header(id).count()) > 0 && (await expanded(id)));
  }

  // 2. default OPEN + representative rows visible.
  ok("all three default OPEN (aria-expanded=true)", (await expanded("operate")) && (await expanded("build")) && (await expanded("library")));
  ok('Operate row "Goals" visible', await rowVisible("operate", "Goals"));
  ok('Build row "Workspaces" visible', await rowVisible("build", "Workspaces"));
  ok('Library row "Agent Skills" visible', await rowVisible("library", "Agent Skills"));

  // 3. collapse Build — assert it VISUALLY collapses (region height → ~0), goes inert, siblings stay.
  const buildOpenH = await regionH("build");
  ok("Build region has real height when open", buildOpenH > 100, `${buildOpenH}px`);
  await header("build").click();
  await page.waitForTimeout(500); // let the grid-rows transition settle
  const buildCollapsedH = await regionH("build");
  ok("Build aria-expanded → false after click", !(await expanded("build")));
  ok("Build region is inert when collapsed", await inert("build"));
  ok("Build region VISUALLY collapses (height → ~0)", buildCollapsedH < 8, `${buildOpenH}px → ${buildCollapsedH}px`);
  ok("Operate stays open (Goals still visible)", (await expanded("operate")) && (await rowVisible("operate", "Goals")));
  ok("Library stays open (Agent Skills still visible)", (await expanded("library")) && (await rowVisible("library", "Agent Skills")));

  // 4. persists across reload.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside nav a", { timeout: 25000 });
  await page.waitForTimeout(800);
  const buildHAfterReload = await regionH("build");
  ok("Build STILL collapsed after reload (persisted)", !(await expanded("build")) && buildHAfterReload < 8, `height ${buildHAfterReload}px`);
  ok("Operate STILL open after reload", (await expanded("operate")) && (await rowVisible("operate", "Goals")));

  // 5. re-expand restores rows.
  await header("build").click();
  await page.waitForTimeout(450);
  ok("Build re-expands (Workspaces visible again)", (await expanded("build")) && (await rowVisible("build", "Workspaces")));

  await page.screenshot({ path: "scripts/.sidebar-dropdowns.png" });
  ok("zero console errors", errors.length === 0, errors.length ? errors.slice(0, 4).join(" | ") : "");
} catch (e) {
  ok("verifier ran to completion", false, String(e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? "❌" : "✅"} verify-sidebar-dropdowns: ${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length ? 1 : 0);
