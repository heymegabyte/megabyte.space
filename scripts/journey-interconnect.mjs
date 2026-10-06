#!/usr/bin/env node
/**
 * fire-191 — §6 golden-path journey for the WS-DEMO surface web. The atomic verifiers each test ONE
 * surface via rail-nav and assert its cross-links EXIST — but nothing proves the cross-links actually
 * NAVIGATE + land on a rendered destination, and nothing proves the new routes survive a HARD REFRESH
 * (the verifiers always arrive via SPA rail-nav, never a direct/reloaded load). This journey closes both
 * gaps across ~14 cases (~35 real UI actions), asserting 0 console errors throughout.
 *
 * PHASE A — hard-refresh resilience: for each new surface, rail-nav in → assert it renders → RELOAD →
 *   assert the SAME route re-renders cleanly (URL preserved, real content, no new console errors). A route
 *   that only works via SPA-nav but breaks on direct-load is the defect class this catches.
 * PHASE B — cross-link navigation: rail-nav to a surface → CLICK a cross-link button → assert it lands on
 *   the right route + that route renders. Proves the interconnect web is wired to real, live destinations.
 *
 * READ-ONLY + NON-POLLUTING: only navigates + reloads + clicks cross-links (no approve/retry/toggle/send).
 * ba-e2e state is left exactly as found. Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)"); process.exit(2); }

// PHASE A — surfaces to hard-refresh (rail label → path + a content needle proving it re-rendered).
const REFRESH = [
  ["Notifications", "/notifications", /notifications|unread/i],
  ["Approvals", "/approvals", /approvals|pending/i],
  ["Tasks", "/tasks", /tasks|running|failed/i],
  ["Tools", "/tools", /tools|built-in|providers/i],
  ["Presence", "/presence", /presence|active now|agent/i],
  ["Environments", "/environments", /environments|quota|workspaces/i],
  ["AI Gateway", "/ai-gateway", /gateway|cache|provider/i],
  ["Vectorize", "/vectorize", /vectorize|index|embedding/i],
];

// PHASE B — cross-links: rail label (from) → cross-link button name → expected destination path + needle.
const LINKS = [
  ["Tasks", /^Approvals/, "/approvals", /approvals|pending/i],
  ["Approvals", /^Activity/, "/activity", /activity|action/i],
  ["Environments", /^Compute/, "/compute", /compute|workers|runtime/i],
  ["AI Gateway", /^Models/, "/models", /model/i],
  ["Tools", /^Connections/, "/connections", /connection|integration/i],
  ["Presence", /^Agents/, "/agents", /agent/i],
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
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
    if (errors.length > before) throw new Error(`console error: ${errors.slice(before).join(" | ").slice(0, 120)}`);
    steps.push({ name, ok: true, detail: detail ?? "" });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    steps.push({ name, ok: false, detail: String(e).slice(0, 160) });
    console.log(`  ✗ ${name} — ${String(e).slice(0, 160)}`);
  }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

async function railTo(label) {
  const link = page.getByRole("link", { name: label, exact: true }).first();
  assert(await link.count().then((c) => c > 0), `no rail link "${label}"`);
  await link.click({ timeout: 8000 });
  await page.waitForTimeout(900);
}
const bodyText = () => page.evaluate(() => document.body.innerText);

// --- Sign in ---
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(600);

console.log("INTERCONNECT JOURNEY:");
console.log("PHASE A — hard-refresh resilience:");
for (const [label, path, needle] of REFRESH) {
  await step(`${label}: rail-nav → render → RELOAD → re-render`, async () => {
    await railTo(label);
    assert(new RegExp(path.replace("/", "\\/")).test(page.url()), `rail-nav missed ${path} (${page.url().replace(APEX, "")})`);
    assert(needle.test(await bodyText()), `${path} did not render its content pre-reload`);
    // THE TARGET: hard-refresh the route directly (not SPA-nav) — it must re-render cleanly.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForFunction((p) => location.pathname === p && document.body.innerText.trim().length > 150, path, { timeout: 25000 });
    assert(page.url().includes(path), `reload left ${path} (${page.url().replace(APEX, "")})`);
    assert(needle.test(await bodyText()), `${path} did not re-render its content after reload`);
    return "survives reload";
  });
}

console.log("PHASE B — cross-link navigation (link clicks land on a rendered destination):");
for (const [from, btn, to, needle] of LINKS) {
  await step(`${from} → ${btn.source} cross-link → ${to}`, async () => {
    await railTo(from);
    const b = page.getByRole("button", { name: btn }).first();
    assert(await b.count().then((c) => c > 0), `no "${btn.source}" cross-link on ${from}`);
    await b.click({ timeout: 8000 });
    await page.waitForTimeout(1000);
    assert(page.url().includes(to), `cross-link did not land on ${to} (${page.url().replace(APEX, "")})`);
    assert(needle.test(await bodyText()), `${to} did not render after the cross-link`);
    return `landed on ${to}`;
  });
}

await browser.close();
const passed = steps.filter((s) => s.ok).length;
const failed = steps.filter((s) => !s.ok);
console.log(JSON.stringify({ total: steps.length, passed, failed: failed.length, consoleErrors: errors.length }, null, 2));
if (failed.length) console.log("failed:", failed.map((s) => `${s.name} (${s.detail})`).join(" | ").slice(0, 400));
if (errors.length) console.log("console:", errors.join(" | ").slice(0, 300));
const allGood = passed === steps.length && errors.length === 0;
console.log(allGood ? `✅ INTERCONNECT-JOURNEY GREEN: ${passed}/${steps.length} cases, 0 console errors` : `❌ interconnect journey: ${passed}/${steps.length} cases, ${errors.length} console errors`);
process.exit(allGood ? 0 : 1);
