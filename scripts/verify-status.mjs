#!/usr/bin/env node
// Gate for the build-in-public /status page (shipped fire-14, had no standing gate).
// Real-browser: the telemetry cards render, the LIVE DO data loads (not stuck on the
// loading "…" or offline "—"), it RECONCILES against the store (/api/analytics/live),
// zero OUR console errors, axe WCAG 2.2 AA clean.
//
// Exit 0 = all green; 1 = a check failed; 2 = browser unavailable.
// Usage: node scripts/verify-status.mjs [baseUrl]

import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const BASE = (process.argv[2] || "https://megabyte.space").replace(/\/$/, "");
const URL = `${BASE}/status`;
const UPSTREAM = /inline script violates the following content security policy/i; // CF challenge-platform inline

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  console.error(`❌ BLOCKED — chromium unavailable: ${error?.message || error}`);
  process.exit(2);
}

// Ground truth from the store, in parallel with the render.
const storePromise = fetch(`${BASE}/api/analytics/live`)
  .then((r) => r.json())
  .catch(() => null);

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`${URL}?cb=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500); // let the /api/analytics/live fetch resolve

const dom = await page.evaluate(() => {
  const text = document.body?.innerText || "";
  const nums = [...document.querySelectorAll(".tabular-nums")].map((e) => (e.textContent || "").trim());
  return {
    heading: (document.querySelector("h1")?.textContent || "").trim(),
    hasServed: /pageviews served/i.test(text),
    hasToday: /today/i.test(text),
    offline: /telemetry offline/i.test(text),
    served: nums[0] || "",
    today: nums[1] || "",
  };
});

// axe in its own fresh context (the main page's state trips axe's injector).
let axeBad = [];
try {
  const axeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const axePage = await axeCtx.newPage();
  await axePage.goto(`${URL}?cb=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await axePage.waitForTimeout(1000);
  const axe = await new AxeBuilder({ page: axePage }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  axeBad = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  await axeCtx.close();
} catch (e) {
  axeBad = [{ id: `axe-failed:${String(e?.message || e).slice(0, 40)}` }];
}

await browser.close();
const store = await storePromise;

const servedNum = Number(String(dom.served).replace(/,/g, ""));
const storeTotal = Number(store?.total);
const reconciled = Number.isFinite(servedNum) && Number.isFinite(storeTotal) && Math.abs(servedNum - storeTotal) <= 25;
const ourErrors = errors.filter((e) => !UPSTREAM.test(e));

const checks = [
  ['heading "Running in the open."', /running in the open/i.test(dom.heading), dom.heading.slice(0, 40)],
  ["telemetry cards render", dom.hasServed && dom.hasToday, `served=${dom.hasServed} today=${dom.hasToday}`],
  ["live data loaded (not …/—)", /^[\d,]+$/.test(dom.served) && servedNum > 0 && !dom.offline, `served=${dom.served} offline=${dom.offline}`],
  ["display reconciles with store", reconciled, `display=${dom.served} store=${store?.total ?? "—"}`],
  ["no OUR console errors", ourErrors.length === 0, `${ourErrors.length} ours`],
  ["axe WCAG 2.2 AA (0 crit/serious)", axeBad.length === 0, `${axeBad.length}${axeBad.length ? ": " + axeBad.map((v) => v.id).join(",") : ""}`],
];

for (const [name, pass, detail] of checks) console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name} — ${detail}`);
if (ourErrors.length) for (const e of ourErrors.slice(0, 5)) console.log(`   • ${e.slice(0, 140)}`);
const failed = checks.filter(([, p]) => !p);
console.log(`\n${checks.length - failed.length}/${checks.length} /status checks green`);
process.exit(failed.length ? 1 : 0);
