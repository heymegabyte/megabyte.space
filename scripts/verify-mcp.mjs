#!/usr/bin/env node
/**
 * WS-DEMO: the /mcp surface (MCP Servers — the capability PORTABILITY layer; a NEW Resources panel,
 * documented ULTIMATE-REQUIREMENTS #30 capability chain "…Tool/MCP → Agent" + #67 tool-preference ladder
 * "ProjectSites MCP → specialized MCP → CF API/MCP → GitHub API → …", NORTH-STAR primitive "…Tools · Skills
 * · MCP-Apps · Integrations…"). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders
 * the stat strip (servers · connected · tools exposed · calls/24h) + a transport filter + search + server
 * cards (transport · tier · status · endpoint · tools/resources/prompts) with a per-server ENABLE/DISABLE
 * toggle. Distinct from /connections (OAuth accounts) + /tools (the flat tool registry). The SIGNATURE
 * interactions: a transport pill + search narrow the servers, and Disable toggles a server off (one fewer
 * Disable button). Cross-links Tools. "Preview · sample data". BA-authed, PROD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + transport filter + a server + the capability bundle + honesty.
const NEEDLES = [
  /sample data/i,                                      // honest "Preview · sample data"
  /mcp servers/i,                                      // the page
  /\b(stdio|SSE|HTTP)\b/,                               // the transport filter / transports
  /projectsites|github|cloudflare|resend/i,            // real sample server names
  /tools exposed|calls \/ 24h|connected/i,             // the stat strip
  /resources|prompts/i,                                // the exposed capability bundle (tools/resources/prompts)
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

// Return to an authed surface with the rail, then click the MCP Servers rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "MCP Servers", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/mcp/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every server card (transport/tier/status + bundle + toggle) visible for the vision read.
await page.screenshot({ path: "scripts/.mcp-proof.png", fullPage: true });

// cross-link to Tools.
const toolsLink = await page.getByRole("button", { name: /^Tools/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="MCP servers"] article').count();
const countDisable = () => page.getByRole("button", { name: "Disable", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a transport pill narrows the servers. All → HTTP (fewer, >0).
let countHttp = countAll;
const httpPill = page.getByRole("button", { name: /^HTTP/ }).first();
if (await httpPill.count().then((c) => c > 0).catch(() => false)) {
  await httpPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countHttp = await countRows().catch(() => countAll);
}
const transportFilterWorks = countAll > 0 && countHttp > 0 && countHttp < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a name fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search servers/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("github");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "Disable" toggles a server off (one fewer Disable button).
let toggleWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const disableBefore = await countDisable().catch(() => 0);
const firstDisable = page.getByRole("button", { name: "Disable", exact: true }).first();
if (disableBefore > 0 && (await firstDisable.count().then((c) => c > 0).catch(() => false))) {
  await firstDisable.click().catch(() => {});
  await page.waitForTimeout(400);
  const disableAfter = await countDisable().catch(() => disableBefore);
  toggleWorks = disableAfter === disableBefore - 1;
}

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countHttp, countSearch, disableBefore, transportFilterWorks, searchWorks, toggleWorks, toolsLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "MCP Servers reachable from the sidebar rail", "no MCP Servers rail link (nav wiring missing)");
check(onPath, "MCP Servers rail click → /mcp", "rail click did not reach /mcp");
check(renders, "MCP content renders (stats + transport filter + servers + tools/resources/prompts + honesty label)", `content missing: ${missing.join(", ")}`);
check(transportFilterWorks, `Transport filter narrows the servers (All ${countAll} → HTTP ${countHttp})`, "transport pill did not narrow the servers");
check(searchWorks, `Search narrows the servers (All ${countAll} → "github" ${countSearch})`, "search did not narrow the servers");
check(toggleWorks, `Disable toggles a server off (Disable buttons ${disableBefore} → ${disableBefore - 1})`, "disable did not toggle a server off");
check(toolsLink, "Cross-link to Tools present (interconnect)", "no Tools cross-link");
check(realErrors.length === 0, "0 console errors on /mcp", `${realErrors.length} console errors`);
console.log(ok ? "✅ MCP GREEN" : "❌ mcp check failed");
process.exit(ok ? 0 : 1);
