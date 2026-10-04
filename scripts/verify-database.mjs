#!/usr/bin/env node
/**
 * WS-DEMO: the /database surface (Database Studio — the OS's data layer made visible). Reachable via
 * the SIDEBAR rail (real-user path, proves nav wiring); renders the stat strip + schema browser +
 * schema panel + read-only query preview + the Notion-like result grid. The SIGNATURE behavior is
 * interactive: clicking a table in the schema browser switches the Schema/Query/Rows to that table
 * (default 'gadgets' → click 'action_log'). Clearly labeled "Preview · sample data". BA-authed real
 * Chromium, PROD. Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD).
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + schema browser + schema + query + grid + honesty label.
const NEEDLES = [
  /sample data/i,        // honest "Preview · sample data" — never lies-empty
  /schema/i,             // the schema panel ("Schema · <table>")
  /tables/i,             // the schema browser + stat
  /rows/i,               // the result grid + stat
  /query|read-only/i,    // the query preview panel
  /cloudflare d1/i,      // the engine stat
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

// Return to an authed surface with the rail, then click the Database rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Database", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/database/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// INTERACTIVE: schema browser defaults to 'gadgets' (Schema · gadgets); clicking the 'action_log'
// table button must switch the Schema panel to it (proves the schema-browser drill-in, the signature).
const schemaBefore = /Schema · gadgets/i.test(body);
let schemaSwitched = false;
const tableBtn = page.getByRole("button", { name: /action_log/ }).first();
if (await tableBtn.count().then((c) => c > 0).catch(() => false)) {
  await tableBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const body2 = await page.evaluate(() => document.body.innerText);
  schemaSwitched = /Schema · action_log/i.test(body2);
}
const drillInWorks = schemaBefore && schemaSwitched;

await page.screenshot({ path: "scripts/.database-proof.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ reachable, onPath, renders, missing, schemaBefore, schemaSwitched, drillInWorks, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Database reachable from the sidebar rail", "no Database rail link (nav wiring missing)");
check(onPath, "Database rail click → /database", "rail click did not reach /database");
check(renders, "Database content renders (stats + schema + query + grid + honesty label)", `content missing: ${missing.join(", ")}`);
check(drillInWorks, "Table click drives the schema panel (gadgets → action_log)", `schema did not switch (before=${schemaBefore}, switched=${schemaSwitched})`);
check(errors.length === 0, "0 console errors on /database", `${errors.length} console errors`);
console.log(ok ? "✅ DATABASE GREEN" : "❌ database check failed");
process.exit(ok ? 0 : 1);
