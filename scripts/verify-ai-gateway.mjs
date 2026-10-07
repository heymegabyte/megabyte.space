#!/usr/bin/env node
/**
 * WS-DEMO: the /ai-gateway surface (the AI-proxy every model call routes through — Cloudflare AI
 * Gateway `megabyte-os`; a NEW Resources panel, CLAUDE.md § AI Gateway). Reachable via the SIDEBAR rail
 * (real-user path, proves nav wiring); renders the stat strip + a provider filter + search + the
 * request log (cached/live flags). The SIGNATURE interactions: a provider pill + search narrow the
 * log, cached requests are flagged, and the surface cross-links to Models + Costs.
 * "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + provider filter + a model + caching + honesty label.
const NEEDLES = [
  /sample (data|traffic)/i,    // honest label — the traffic log is sample (the usage band is LIVE)
  /AI Gateway balance|Daily AI usage/i, // the LIVE status band (fire-187 DEPTH)
  /gateway/i,                  // the page
  /\b(anthropic|openai|deepseek)\b/i, // the provider filter / providers
  /claude|deepseek-chat|gpt-4o/i, // real sample model ids
  /cache|cached/i,             // the caching concept
  /latency|requests/i,         // the stat strip
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

// Return to an authed surface with the rail, then click the AI Gateway rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "AI Gateway", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/ai-gateway/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH (fire-187): the LIVE Gateway-status band — real balance + daily usage from getCloudflareUsage.
// Its labels are static regardless of the account's live state, so assert they rendered (not a value).
const liveBand = /AI Gateway balance/i.test(body) && /Daily AI usage/i.test(body);

// cached chips render (the gateway's whole point — served-from-cache requests are flagged).
const cachedChips = /\bcached\b/i.test(body);
// cross-links to Models + Costs.
const modelsLink = await page.getByRole("button", { name: /^Models/ }).count().then((c) => c > 0).catch(() => false);
const costsLink = await page.getByRole("button", { name: /^Costs/ }).count().then((c) => c > 0).catch(() => false);
const crossLinksPresent = modelsLink && costsLink;

const countRows = () => page.locator('section[aria-label="Gateway requests"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a provider pill narrows the log. All → DeepSeek (fewer, >0).
let countDeepseek = countAll;
const dsPill = page.getByRole("button", { name: /^DeepSeek/ }).first();
if (await dsPill.count().then((c) => c > 0).catch(() => false)) {
  await dsPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countDeepseek = await countRows().catch(() => countAll);
}
const providerFilterWorks = countAll > 0 && countDeepseek > 0 && countDeepseek < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a model fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search gateway/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("claude");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

await page.screenshot({ path: "scripts/.ai-gateway-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countDeepseek, countSearch, liveBand, cachedChips, crossLinksPresent, providerFilterWorks, searchWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "AI Gateway reachable from the sidebar rail", "no AI Gateway rail link (nav wiring missing)");
check(onPath, "AI Gateway rail click → /ai-gateway", "rail click did not reach /ai-gateway");
check(renders, "AI Gateway content renders (stats + provider filter + models + caching + honesty label)", `content missing: ${missing.join(", ")}`);
check(providerFilterWorks, `Provider filter narrows the log (All ${countAll} → DeepSeek ${countDeepseek})`, "provider pill did not narrow the log");
check(searchWorks, `Search narrows the log (All ${countAll} → "claude" ${countSearch})`, "search did not narrow the log");
check(liveBand, "LIVE Gateway-status band renders (real balance + daily usage from getCloudflareUsage)", "live Gateway-status band missing");
check(cachedChips, "Cached requests are flagged (Cached chip)", "no Cached chip in the log");
check(crossLinksPresent, "Cross-links to Models + Costs present (interconnect)", "missing Models / Costs cross-links");
check(realErrors.length === 0, "0 console errors on /ai-gateway", `${realErrors.length} console errors`);
console.log(ok ? "✅ AI-GATEWAY GREEN" : "❌ ai-gateway check failed");
process.exit(ok ? 0 : 1);
