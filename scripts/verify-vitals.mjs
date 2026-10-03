#!/usr/bin/env node
/**
 * verify-vitals — CAUSAL field-Web-Vitals proof (verify-against-source-of-truth):
 * a REAL browser visit fires the web-vitals beacon → the AnalyticsCounter DO
 * stores samples → /status displays reconciled p50/p75. Proves the CLIENT beacon
 * works end-to-end, not just the endpoint.
 *
 *  1. baseline — GET /api/analytics/live, record per-metric sample counts (store).
 *  2. act      — real Chromium: load apex, settle LCP, click a nav link (INP),
 *                navigate away (pagehide → web-vitals flush → sendBeacon).
 *  3. store    — poll /api/analytics/live until real metrics' n increases.
 *  4. display  — load /status, assert the CWV card renders; reconcile a shown
 *                p75 value against the API (display-vs-store).
 *
 * Exit 0 = beacon→store→display proven. Exit 1 = a leg failed (named in output).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APEX = "https://megabyte.space";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

const steps = [];
const ok = (name, pass, detail = "") => {
  steps.push({ name, pass });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};
const getPulse = async () => {
  const r = await fetch(`${APEX}/api/analytics/live`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  return r.ok ? await r.json() : null;
};
const counts = (pulse) => Object.fromEntries((pulse?.vitals ?? []).map((v) => [v.metric, v.n]));
const totalN = (pulse) => (pulse?.vitals ?? []).reduce((s, v) => s + v.n, 0);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const before = await getPulse();
  ok("baseline pulse has vitals array", Array.isArray(before?.vitals), JSON.stringify(counts(before)));
  const baseTotal = totalN(before);

  // Act — a real visit that will flush web-vitals on pagehide.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA });
  const page = await context.newPage();
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500); // let LCP resolve
  await page.locator('a[href="#features"]').first().click().catch(() => {}); // an interaction → INP
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  // Navigating away fires pagehide → web-vitals flushes LCP/CLS/INP/TTFB via sendBeacon.
  await page.goto("about:blank").catch(() => {});
  await page.waitForTimeout(400);
  await context.close();

  // Store — poll until the real visit's samples land (DO write is ctx.waitUntil-async).
  let after = before;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    after = await getPulse();
    if (totalN(after) > baseTotal) break;
  }
  const grew = totalN(after) - baseTotal;
  ok("real visit → DO stored new vital samples", grew > 0, `+${grew} samples, now ${JSON.stringify(counts(after))}`);
  const withData = (after?.vitals ?? []).filter((v) => v.n > 0).map((v) => v.metric);
  ok("≥1 field metric populated", withData.length >= 1, withData.join(",") || "none");

  // Display — /status renders the CWV card and reconciles with the API.
  const page2 = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA })).newPage();
  await page2.goto(`${APEX}/status`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page2.waitForTimeout(2500);
  const cardVisible = await page2
    .locator('[data-testid="status-vitals"]')
    .isVisible()
    .catch(() => false);
  ok("/status renders the Core Web Vitals card", cardVisible);
  // Reconcile: a populated metric's p75 (as displayed) should appear in the API.
  const apiPopulated = (after?.vitals ?? []).find((v) => v.n > 0 && v.p75 !== null);
  if (apiPopulated) {
    const shown = apiPopulated.metric === "CLS" ? apiPopulated.p75.toFixed(3) : String(Math.round(apiPopulated.p75));
    const dom = (await page2.locator('[data-testid="status-vitals"]').innerText().catch(() => "")) || "";
    ok(
      "display reconciles with store (p75 shown)",
      dom.includes(apiPopulated.metric) && dom.replace(/[\s,]/g, "").includes(shown),
      `${apiPopulated.metric} p75=${shown}`,
    );
  } else {
    ok("display reconciles with store (p75 shown)", false, "no populated metric to reconcile");
  }
} catch (e) {
  ok("exception", false, e.message);
} finally {
  await browser.close();
}

const failed = steps.filter((s) => !s.pass);
console.log(`\n${steps.length - failed.length}/${steps.length} checks green`);
process.exit(failed.length ? 1 : 0);
