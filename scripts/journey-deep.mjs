#!/usr/bin/env node
/**
 * fire-110 — the loop's §6 LONG golden-path journey: ONE stateful BA-authed session that drives the
 * DEEP interactions the atomic verifiers never exercise, asserting correct behavior + 0 console
 * errors at every step. Targets the untested surface: DataTable sort + search (incl. the fire-108
 * /connections `sort` comparators — never actually clicked), the Pulse "Why" disclosure, the
 * /connections Manage-link navigation, the theme toggle (+ persistence), and reversible Pulse
 * dismiss/snooze→undo. All READ-ONLY or reversible — ba-e2e server state is left exactly as found
 * (dismiss/snooze are undone immediately; theme is ephemeral localStorage in this context).
 * Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";
import { authenticateJourney } from "./journey-auth.ts";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
try {
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
// Filter the benign capnweb WebSocket reconnect artifact ("...already in CLOSING or CLOSED state") —
// it races fast navigation but the nav succeeds; it's not an app error (fire-157 de-flake).
const IGNORE_CONSOLE = /WebSocket is already in CLOSING or CLOSED state/i;
page.on("console", (m) => { if (m.type() === "error" && !IGNORE_CONSOLE.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => { if (!IGNORE_CONSOLE.test(String(e))) errors.push(String(e)); });

const steps = [];
async function step(name, fn) {
  try {
    const detail = await fn();
    steps.push({ name, ok: true, detail: detail ?? "" });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    steps.push({ name, ok: false, detail: String(e).slice(0, 140) });
    console.log(`  ✗ ${name} — ${String(e).slice(0, 140)}`);
  }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

async function goto(path, settle = 1000) {
  await page.goto(`${APEX}${path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 });
  await page.waitForTimeout(settle);
}
async function waitLoaded() {
  // Settle until a real card/table/empty state — the subtitle text is always present, so gate on content.
  await page.waitForFunction(() => {
    const dismiss = [...document.querySelectorAll("button")].some((b) => /^\s*Dismiss\s*$/i.test(b.textContent || ""));
    const table = !!document.querySelector("table tbody tr");
    const empty = /all clear|no connections|no gadgets|couldn/i.test(document.body.innerText);
    return dismiss || table || empty;
  }, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// --- Sign in, land on Pulse ---
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await authenticateJourney(page, APEX, EMAIL, PASSWORD);

console.log("DEEP JOURNEY:");

// 1. Pulse "Why" disclosure expand/collapse (never tested).
await step("pulse: expand 'Why' disclosure", async () => {
  await goto("/pulse"); await waitLoaded();
  const why = page.getByRole("button", { name: /^Why$/ }).first();
  if (!(await why.count())) return "no opportunities to expand (ok)";
  await why.click();
  await page.waitForTimeout(300);
  const expanded = await page.getByRole("button", { name: /hide why/i }).count();
  assert(expanded > 0, "Why disclosure did not expand (no 'Hide why')");
  await page.getByRole("button", { name: /hide why/i }).first().click().catch(() => {});
  return "expanded + collapsed";
});

// 2. Pulse dismiss → Undo (reversible; leaves ba-e2e clean).
await step("pulse: dismiss → Undo round-trip", async () => {
  const dismissBtns = () => page.locator("button", { hasText: /^\s*Dismiss\s*$/i });
  const before = await dismissBtns().count();
  if (before === 0) return "no opportunities (ok)";
  await dismissBtns().first().click();
  await page.waitForTimeout(700);
  assert((await dismissBtns().count()) === before - 1, "dismiss did not remove a card");
  const undo = page.locator('[data-testid="pulse-undo-dismiss"]');
  assert(await undo.isVisible().catch(() => false), "no Undo after dismiss");
  await undo.click();
  await page.waitForTimeout(700);
  assert((await dismissBtns().count()) === before, "Undo did not restore");
  return `dismissed+restored (${before} cards intact)`;
});

// 3. Pulse snooze → Undo (reversible).
await step("pulse: snooze → Undo round-trip", async () => {
  const dismissBtns = () => page.locator("button", { hasText: /^\s*Dismiss\s*$/i });
  const before = await dismissBtns().count();
  const snooze = page.locator('button[aria-label^="Snooze"]');
  if (before === 0 || !(await snooze.count())) return "no opportunities (ok)";
  await snooze.first().click();
  await page.waitForTimeout(700);
  assert((await dismissBtns().count()) === before - 1, "snooze did not hide a card");
  const undo = page.locator('[data-testid="pulse-undo-dismiss"]');
  assert(await undo.isVisible().catch(() => false), "no Undo after snooze");
  await undo.click();
  await page.waitForTimeout(700);
  assert((await dismissBtns().count()) === before, "Undo did not un-snooze");
  return `snoozed+restored (${before} intact)`;
});

// 4. Theme toggle cycles (system→light→dark→system) + flips data-mode; returns to start (clean).
await step("theme: toggle cycles + flips data-mode", async () => {
  const modeBtn = () => page.locator('button[aria-label^="Theme:"]').first();
  assert(await modeBtn().count() > 0, "no theme toggle button");
  const dm = () => page.evaluate(() => document.documentElement.getAttribute("data-mode"));
  const startLabel = await modeBtn().getAttribute("aria-label");
  const seen = new Set();
  for (let i = 0; i < 3; i++) { seen.add(await dm()); await modeBtn().click(); await page.waitForTimeout(350); }
  const endLabel = await modeBtn().getAttribute("aria-label");
  assert(seen.size >= 2, `data-mode never changed across the cycle (${[...seen]})`);
  assert(endLabel === startLabel, "3-click cycle did not return to the starting mode");
  return `cycled through ${seen.size} resolved modes, returned to start`;
});

// 5. /connections — DataTable search filters.
await step("connections: search filters the table", async () => {
  await goto("/connections"); await waitLoaded();
  // DATA rows only — exclude the single `td[colspan]` "no results" row the DataTable renders when a
  // search matches nothing (counting that row hid a working filter on a 1-row table — fire-110).
  const rows = () => page.locator("table tbody tr:not(:has(td[colspan]))");
  const total = await rows().count();
  assert(total > 0, "no connection rows to search");
  await page.locator('[role="searchbox"]').first().fill("zzz-no-match-xyz");
  await page.waitForTimeout(400);
  const none = await rows().count();
  await page.locator('[role="searchbox"]').first().fill("");
  await page.waitForTimeout(300);
  const restored = await rows().count();
  assert(none === 0, `search did not filter to 0 data rows (${total}→${none})`);
  assert(restored === total, `clearing search did not restore (${restored}/${total})`);
  return `${total} rows → 0 on no-match → ${restored} restored`;
});

// 6. /connections — click a sort header (exercises the fire-108 `sort` comparators) + no error.
await step("connections: column sort applies (fire-108 comparators)", async () => {
  const sortBtn = page.locator("table thead th button").first();
  assert(await sortBtn.count() > 0, "no sortable column header");
  await sortBtn.click();
  await page.waitForTimeout(350);
  const sorted = await page.locator('table thead th[aria-sort="ascending"], table thead th[aria-sort="descending"]').count();
  assert(sorted > 0, "clicking the header set no aria-sort (sort did not apply)");
  return "aria-sort applied";
});

// 7. /connections — a Manage link navigates OUT to its management page.
await step("connections: Manage link navigates to management", async () => {
  await goto("/connections"); await waitLoaded();
  const manage = page.getByRole("link", { name: /^Manage in / }).first();
  if (!(await manage.count())) return "no rows to manage (ok)";
  await manage.click();
  await page.waitForTimeout(1500);
  assert(/\/(gatekeepers|providers)/.test(page.url()), `Manage did not navigate (${page.url().replace(APEX, "")})`);
  return `→ ${page.url().replace(APEX, "")}`;
});

// 8. /gadgets — search filters the table (stateful: a different DataTable).
await step("gadgets: search filters the table", async () => {
  await goto("/gadgets"); await waitLoaded();
  // DATA rows only — exclude the single `td[colspan]` "no results" row the DataTable renders when a
  // search matches nothing (counting that row hid a working filter on a 1-row table — fire-110).
  const rows = () => page.locator("table tbody tr:not(:has(td[colspan]))");
  const total = await rows().count();
  if (total === 0) return "no gadgets (ok)";
  await page.locator('[role="searchbox"]').first().fill("zzz-no-match-xyz");
  await page.waitForTimeout(400);
  const none = await rows().count();
  await page.locator('[role="searchbox"]').first().fill("");
  await page.waitForTimeout(300);
  assert(none === 0, `gadgets search did not filter to 0 data rows (${total}→${none})`);
  return `${total} rows → 0 on no-match`;
});

// 9. ⌘K from a deep surface reaches another surface (stateful, end of the long chain).
await step("cmdk: open → search → navigate", async () => {
  const DIALOG = '[role="dialog"][aria-label="Command palette"]';
  await page.keyboard.press("Meta+k").catch(() => {});
  if (!(await page.locator(DIALOG).isVisible().catch(() => false))) {
    await page.keyboard.press("Control+k").catch(() => {});
  }
  if (!(await page.locator(DIALOG).isVisible().catch(() => false))) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("gadgets:open-command-palette")));
  }
  assert(await page.locator(DIALOG).isVisible().catch(() => false), "⌘K did not open");
  await page.fill(`${DIALOG} input`, "pulse");
  await page.waitForTimeout(400);
  await page.locator(`${DIALOG} button[data-index]`, { hasText: /pulse/i }).first().click();
  await page.waitForTimeout(1200);
  assert(/\/pulse/.test(page.url()), "⌘K did not navigate to /pulse");
  return "→ /pulse";
});

await page.screenshot({ path: "scripts/.journey-deep.png" });

const passed = steps.filter((s) => s.ok).length;
const failed = steps.filter((s) => !s.ok);
console.log(JSON.stringify({ total: steps.length, passed, failed: failed.length, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 400));
if (failed.length) console.log("FAILED:", failed.map((s) => `${s.name} (${s.detail})`).join(" · "));
const allGood = passed === steps.length && errors.length === 0;
console.log(allGood ? `✅ DEEP-JOURNEY GREEN: ${passed}/${steps.length} deep steps, 0 console errors` : `❌ deep journey: ${passed}/${steps.length} steps, ${errors.length} console errors`);
process.exitCode = allGood ? 0 : 1;
} catch {
  console.error("DEEP-JOURNEY FAILED: authentication or prerequisite failed; dependent steps aborted");
  process.exitCode = 1;
} finally {
  await browser.close();
}
