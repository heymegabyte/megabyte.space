#!/usr/bin/env node
/**
 * WS-DEMO: the "coming-soon" preview surfaces (Goals, Automations, …) each render + are reachable via
 * the SIDEBAR (the real-user path, which also proves nav wiring). BA-authed real Chromium, PROD. For
 * each surface: click its rail link, assert the URL + demo content + 0 console errors. One gate for
 * the whole demo-surface CLASS (generalized from fire-130's verify-goals so adding a surface = one
 * array entry, not a new verifier). Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// Each demo surface: the rail LABEL to click, the URL it should reach, and ≥2 content needles that
// prove the demo rendered (not a blank/partial page). Goals/Agents/Automations became INTERACTIVE
// previews (fire-160) — their `interact` config fills the composer + submits + asserts the new item
// appears (the signature new behavior). Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
const SURFACES = [
  { label: "Goals", path: "/goals", needles: [/sample data/i, /describe an outcome|set goal|new goal/i, /% complete|opportunities · .* tasks/i, /\b(running|queued)\b/i],
    interact: { fillLabel: "Describe an outcome", text: "Zz demo goal probe", submitName: "Set goal", expect: /Zz demo goal probe/ } },
  { label: "Automations", path: "/automations", needles: [/sample (schedules|data)/i, /new automation|create automation/i, /next run|every 15 minutes|every day/i],
    interact: { fillLabel: "Name the automation", text: "Zz demo automation probe", submitName: "Create automation", expect: /Zz demo automation probe/ } },
  { label: "Agents", path: "/agents", needles: [/sample data/i, /new agent|hire agent|describe a role/i, /\b(working|idle)\b/i],
    interact: { fillLabel: "Describe a role", text: "Zz demo agent probe", submitName: "Hire agent", expect: /Zz demo agent probe/ } },
  { label: "Context & Skills", path: "/context", needles: [/sample data/i, /collections.*skills|search collections/i, /collection/i],
    interact: { fillLabel: "Name a collection", text: "Zz demo collection probe", submitName: "Add collection", expect: /Zz demo collection probe/ } },
  { label: "Database", path: "/database", needles: [/database studio/i, /sample data/i, /schema/i, /select \* from/i] },
  { label: "Customers", path: "/customers", needles: [/sample data/i, /conversion funnel/i, /timeline/i, /visitors/i, /in pipeline|active mrr/i] },
  { label: "Images", path: "/images", needles: [/sample images/i, /variant/i, /imagedelivery|deliver/i] },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
// Filter the benign capnweb WebSocket reconnect artifact ("...already in CLOSING or CLOSED state") —
// this verifier navigates 6 surfaces + submits composers, racing the reconnect; the actions succeed,
// it's not an app error (fire-161 de-flake; same filter as the nav journeys + gadget-pin).
const IGNORE_CONSOLE = /WebSocket is already in CLOSING or CLOSED state/i;
page.on("console", (m) => { if (m.type() === "error" && !IGNORE_CONSOLE.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => { if (!IGNORE_CONSOLE.test(String(e))) errors.push(String(e)); });

await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {});

const results = [];
for (const s of SURFACES) {
  // Return to an authed surface with the rail, then click the surface's rail link (real-user nav).
  await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(700);
  const link = page.getByRole("link", { name: s.label, exact: true }).first();
  const reachable = await link.count().then((c) => c > 0).catch(() => false);
  if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
  const onPath = new RegExp(s.path.replace("/", "\\/")).test(page.url());
  const body = await page.evaluate(() => document.body.innerText);
  const renders = s.needles.every((re) => re.test(body));
  // Interactive composer: fill the field + submit → the new item must appear (the signature behavior
  // of the enriched preview surfaces). null for render-only surfaces (Database/Customers).
  let interactive = null;
  if (reachable && onPath && s.interact) {
    await page.getByLabel(s.interact.fillLabel).fill(s.interact.text).catch(() => {});
    await page.getByRole("button", { name: s.interact.submitName, exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    const body2 = await page.evaluate(() => document.body.innerText);
    interactive = s.interact.expect.test(body2);
  }
  results.push({ label: s.label, reachable, onPath, renders, interactive });
}

await page.screenshot({ path: "scripts/.demo-surfaces-proof.png" });
await browser.close();

console.log(JSON.stringify({ results, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
for (const r of results) {
  check(r.reachable, `${r.label} reachable from the sidebar rail`, `${r.label}: no rail link (nav wiring missing)`);
  check(r.onPath, `${r.label} → its route`, `${r.label}: rail click did not reach the route`);
  check(r.renders, `${r.label} demo content renders`, `${r.label}: demo content missing (blank/partial render)`);
  if (r.interactive !== null) check(r.interactive, `${r.label} composer adds an item (interactive)`, `${r.label}: composer did not add the submitted item`);
}
check(errors.length === 0, "0 console errors across the demo surfaces", `${errors.length} console errors`);
console.log(ok ? "✅ DEMO-SURFACES GREEN" : "❌ demo-surfaces check failed");
process.exit(ok ? 0 : 1);
