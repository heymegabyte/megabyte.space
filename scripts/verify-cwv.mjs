#!/usr/bin/env node
// Core Web Vitals measurement + soft-gate for the apex. Throttled to 3G + 4× CPU
// (the house-target conditions). LCP/CLS had NO automated coverage before fire-17.
//
// Bands (house target LCP ≤2.0s / CLS ≤0.05, per quality-metrics):
//   PASS  LCP ≤2000 · CLS ≤0.05
//   WARN  LCP 2001-2500 · CLS 0.051-0.1   (Google "needs improvement"; exit 0)
//   FAIL  LCP >2500    · CLS >0.1          (Google "poor"; exit 1 — a real regression)
// The current apex sits in WARN (client-only SPA; the structural fix is SSG — backlogged).
// Soft-gate on purpose: it blocks a real regression without blocking deploys on the
// known, tracked SSG gap. Usage: node scripts/verify-cwv.mjs [url]

import { chromium } from "playwright";

const URL = (process.argv[2] || "https://megabyte.space/").replace(/\/$/, "/");

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  console.error(`❌ BLOCKED — chromium unavailable: ${error?.message || error}`);
  process.exit(2);
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  downloadThroughput: (1.5 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 100,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.goto(`${URL}?cb=${Date.now()}`, { waitUntil: "load", timeout: 60000 });
const m = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let lcp = 0;
      let cls = 0;
      new PerformanceObserver((l) => {
        const e = l.getEntries();
        lcp = e[e.length - 1].startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      setTimeout(() => {
        const fcp = (performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0;
        const nav = performance.getEntriesByType("navigation")[0] || {};
        resolve({ lcp: Math.round(lcp), fcp: Math.round(fcp), cls: Math.round(cls * 1000) / 1000, ttfb: Math.round(nav.responseStart || 0) });
      }, 6000);
    }),
);
await browser.close();

const band = (v, pass, warn) => (v <= pass ? "PASS" : v <= warn ? "WARN" : "FAIL");
const lcpBand = band(m.lcp, 2000, 2500);
const clsBand = band(m.cls, 0.05, 0.1);
const fail = lcpBand === "FAIL" || clsBand === "FAIL";

console.log(`LCP ${m.lcp}ms  [${lcpBand}]  (target ≤2000, poor >2500)`);
console.log(`CLS ${m.cls}    [${clsBand}]  (target ≤0.05, poor >0.1)`);
console.log(`FCP ${m.fcp}ms · TTFB ${m.ttfb}ms  (throttled 3G + 4× CPU)`);
if (lcpBand === "WARN") console.log("note: LCP WARN — apex is a client-only SPA; the structural fix is SSG/pre-render the hero (BACKLOG).");
console.log(`\n${fail ? "❌ CWV regression (poor band)" : "✅ CWV within acceptable bands"}`);
process.exit(fail ? 1 : 0);
