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
// prove the demo mock rendered (not a blank/partial page).
const SURFACES = [
  { label: "Goals", path: "/goals", needles: [/coming soon/i, /describe an outcome|set goal|new goal/i, /% complete|opportunities · .* tasks/i, /\b(running|queued)\b/i] },
  { label: "Automations", path: "/automations", needles: [/coming soon/i, /new automation|create automation/i, /next run|every 15 minutes|every day/i] },
  { label: "Agents", path: "/agents", needles: [/coming soon/i, /new agent|hire agent|describe a role/i, /\b(working|idle)\b/i] },
  { label: "Database", path: "/database", needles: [/database studio/i, /sample data/i, /schema/i, /select \* from/i] },
  { label: "Customers", path: "/customers", needles: [/sample data/i, /conversion funnel/i, /timeline/i, /visitors/i, /in pipeline|active mrr/i] },
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
  results.push({ label: s.label, reachable, onPath, renders });
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
}
check(errors.length === 0, "0 console errors across the demo surfaces", `${errors.length} console errors`);
console.log(ok ? "✅ DEMO-SURFACES GREEN" : "❌ demo-surfaces check failed");
process.exit(ok ? 0 : 1);
