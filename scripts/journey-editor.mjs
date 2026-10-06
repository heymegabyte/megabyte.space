#!/usr/bin/env node
/**
 * fire-121 — §6 golden-path journey for the WORKSPACE EDITOR (GadgetEditor), the OS's most complex
 * surface. The atomic verifiers + a11y audit LOAD the editor, but no journey DRIVES it: switching
 * the right-pane tabs (app / Code / Connections), navigating away + back, and — the real target —
 * HARD-REFRESH persistence (the editor carries deep-link URL state `?chat&w`, so a reload must
 * re-render the same workspace cleanly). Asserts 0 console errors at every editor interaction.
 *
 * READ-ONLY + NON-POLLUTING: opens an EXISTING gadget, switches view tabs, navigates, reloads. It
 * NEVER sends a chat message (would cost AI $ + dirty ba-e2e), renames, or deletes. ba-e2e server
 * state is left exactly as found. Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const steps = [];
async function step(name, fn) {
  const before = errors.length;
  try {
    const detail = await fn();
    // Every editor interaction must be console-error-clean — a NEW error during the step fails it.
    if (errors.length > before) throw new Error(`console error: ${errors.slice(before).join(" | ").slice(0, 120)}`);
    steps.push({ name, ok: true, detail: detail ?? "" });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    steps.push({ name, ok: false, detail: String(e).slice(0, 160) });
    console.log(`  ✗ ${name} — ${String(e).slice(0, 160)}`);
  }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// The editor is fullscreen (no sidebar `aside`), so gate on its real content, not the shell.
async function waitEditor() {
  await page.waitForFunction(
    () => /\/workspace\//.test(location.pathname) && document.body.innerText.trim().length > 200,
    { timeout: 25000 },
  );
  await page.waitForTimeout(900);
}
const inEditor = async () =>
  page.evaluate(() => /\/workspace\//.test(location.pathname) && document.body.innerText.trim().length > 200);

// Click an editor right-pane tab by exact label if it's present; returns true if clicked.
async function clickTabIfPresent(label) {
  const tab = page.getByRole("button", { name: label, exact: true }).first();
  if (!(await tab.count())) return false;
  if (!(await tab.isVisible().catch(() => false))) return false;
  await tab.click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
  return true;
}

// --- Sign in ---
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});

console.log("EDITOR JOURNEY:");

// 1. From /gadgets, open an EXISTING gadget into the fullscreen editor (real UI nav, not goto).
let editorUrl = null;
let gadgetName = null;
await step("gadgets → open a gadget into the editor", async () => {
  await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const openLink = page.getByRole("link", { name: /^Open / }).first();
  if (!(await openLink.count())) return "SKIP: no gadget to open (empty account)";
  gadgetName = (await openLink.getAttribute("aria-label").catch(() => null)) || "";
  await openLink.click({ timeout: 8000 });
  await waitEditor();
  editorUrl = page.url();
  assert(/\/workspace\//.test(editorUrl), `did not reach the editor (${editorUrl.replace(APEX, "")})`);
  return editorUrl.replace(APEX, "");
});

// If we never reached the editor, there's nothing to journey — report + exit cleanly (not a failure).
if (!editorUrl) {
  await browser.close();
  console.log(JSON.stringify({ skipped: true, reason: "no gadget to open", consoleErrors: errors.length }, null, 2));
  console.log("ℹ️  EDITOR JOURNEY skipped — ba-e2e has no gadget to open");
  process.exit(errors.length ? 1 : 0);
}

// 2. Switch the right-pane view tabs (app / Code / Connections) — each must render error-free.
await step("editor: switch to Code tab", async () => {
  const clicked = await clickTabIfPresent("Code");
  assert(await inEditor(), "editor lost its content after Code tab");
  return clicked ? "clicked Code" : "Code tab not shown (chat-mode pane) — editor stayed clean";
});
await step("editor: switch to Connections tab", async () => {
  const clicked = await clickTabIfPresent("Connections");
  assert(await inEditor(), "editor lost its content after Connections tab");
  return clicked ? "clicked Connections" : "Connections tab not shown — editor stayed clean";
});

// 2c. The NEW Resources tab (DEMO-2) — a grid of resource panels (Models/Connections/Knowledge/
//     Storage/Secrets/Compute). Click it; assert the panel's cards render + the editor stays clean.
await step("editor: Resources tab shows the resource panels", async () => {
  const clicked = await clickTabIfPresent("Resources");
  assert(await inEditor(), "editor lost its content after Resources tab");
  if (clicked) {
    const body = await page.evaluate(() => document.body.innerText);
    const all = ["Models", "Connections", "Database", "Activity", "Context & Skills", "Knowledge", "Analytics", "Costs", "Audit", "Storage", "Secrets", "Compute", "Environments", "Logs", "Deployments", "Schedule", "Metrics", "Queues", "Domains", "Workflows", "AI Gateway", "Vectorize", "Durable Objects", "Email", "Notifications", "Approvals", "Tasks", "Tools", "Presence", "Analytics Engine", "Hyperdrive", "Realtime", "Sandboxes", "MCP Servers", "Research", "Agent Skills", "Artifacts", "Sources"];
    const cards = all.filter((c) => body.includes(c));
    assert(cards.length >= 15, `Resources panel showed too few cards (${cards.length}/${all.length}): ${cards.join(",")}`);
    // fire-136: the Models card shows the LIVE usable-model count ("N usable") once listModels resolves.
    const modelsLive = await page
      .waitForFunction(() => /\d+ usable/.test(document.body.innerText), { timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    assert(modelsLive, 'Models card did not show the live usable-model count ("N usable")');
    const connLive = await page
      .waitForFunction(() => /\d+ connected/.test(document.body.innerText), { timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    assert(connLive, 'Connections card did not show the live connected count ("N connected")');
    return `Resources panel: ${cards.length}/${all.length} cards, Models + Connections live`;
  }
  return "Resources tab not shown (chat-mode pane) — editor stayed clean";
});

// 3. Navigate OUT via the Home control, then back to /gadgets — the editor must tear down cleanly.
await step("editor: Home navigates out of the workspace", async () => {
  const home = page.getByRole("button", { name: "Home", exact: true }).first();
  if (!(await home.count())) { await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded" }); }
  else await home.click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1200);
  assert(!/\/workspace\//.test(page.url()), `still in the editor after Home (${page.url().replace(APEX, "")})`);
  return page.url().replace(APEX, "") || "/";
});

// 4. Re-open the SAME gadget — round-trip back into the editor is clean.
await step("gadgets → re-open the same gadget", async () => {
  await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const openLink = gadgetName
    ? page.getByRole("link", { name: gadgetName, exact: true }).first()
    : page.getByRole("link", { name: /^Open / }).first();
  await openLink.click({ timeout: 8000 });
  await waitEditor();
  assert(/\/workspace\//.test(page.url()), "did not re-enter the editor");
  return page.url().replace(APEX, "");
});

// 5. THE TARGET: hard-refresh on the editor URL — deep-link state (`?chat&w`) must re-render the
//    same workspace cleanly, with 0 console errors (a reload is the classic editor-state killer).
await step("editor: hard-refresh restores the workspace (deep-link state)", async () => {
  const before = page.url();
  await page.reload({ waitUntil: "domcontentloaded", timeout: 40000 });
  await waitEditor();
  assert(/\/workspace\//.test(page.url()), `refresh left the editor (${page.url().replace(APEX, "")})`);
  // Same workspace id survives the reload (URL path unchanged bar volatile search params).
  const pathOf = (u) => u.split("?")[0];
  assert(pathOf(page.url()) === pathOf(before), `refresh changed the workspace id (${pathOf(before)} → ${pathOf(page.url())})`);
  return "same workspace re-rendered after reload";
});

// 6. Leave cleanly back to /gadgets (ba-e2e state untouched — nothing was sent/renamed/deleted).
await step("editor: exit back to gadgets (no mutation)", async () => {
  const home = page.getByRole("button", { name: "Home", exact: true }).first();
  if (await home.count()) await home.click({ timeout: 6000 }).catch(() => {});
  await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(800);
  return "left editor clean";
});

await browser.close();
const passed = steps.filter((s) => s.ok).length;
const failed = steps.filter((s) => !s.ok);
console.log(JSON.stringify({ total: steps.length, passed, failed: failed.length, consoleErrors: errors.length, editorUrl: editorUrl?.replace(APEX, "") }, null, 2));
if (failed.length) console.log("failed:", failed.map((s) => `${s.name} (${s.detail})`).join(" | ").slice(0, 300));
if (errors.length) console.log("console:", errors.join(" | ").slice(0, 300));
const allGood = passed === steps.length && errors.length === 0;
console.log(allGood ? `✅ EDITOR-JOURNEY GREEN: ${passed}/${steps.length} steps, 0 console errors` : `❌ editor journey: ${passed}/${steps.length} steps, ${errors.length} console errors`);
process.exit(allGood ? 0 : 1);
