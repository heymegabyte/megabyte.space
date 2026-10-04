#!/usr/bin/env node
/**
 * verify-apex-cwv — lab Core Web Vitals for the public apex (megabyte.space),
 * measured in a throttled real Chromium (CDP: Fast-3G-ish network + 4× CPU) so
 * the numbers approximate a mid-tier device rather than a fast dev machine.
 * Asserts the house cinematic targets: LCP ≤ 2000ms, CLS ≤ 0.05. FCP/TTFB + an
 * INP proxy (click→next-paint) are reported. A regression guard for the hero.
 *
 * Exit 0 = LCP + CLS within target. Exit 1 = a target missed.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APEX = process.env.CWV_URL || "https://megabyte.space/";
const SHOT = join(ROOT, "e2e", "screenshots", "apex-cwv");
const LCP_MAX = 2000;
const CLS_MAX = 0.05;

const { chromium } = await import("playwright");
mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Throttle via CDP so the lab number approximates a real mid-tier visitor.
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (0.75 * 1024 * 1024) / 8,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

let code = 1;
try {
  await page.goto(APEX, { waitUntil: "load", timeout: 45000 });
  const m = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const out = { lcp: 0, cls: 0, fcp: 0, ttfb: 0, lcpEl: "" };
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav) out.ttfb = Math.round(nav.responseStart);
        const fcp = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint");
        if (fcp) out.fcp = Math.round(fcp.startTime);
        try {
          new PerformanceObserver((list) => {
            const es = list.getEntries();
            const last = es[es.length - 1];
            out.lcp = Math.round(last.startTime);
            const el = last.element;
            out.lcpEl = el
              ? (el.tagName + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.split(" ").slice(0, 2).join(".") : "")).slice(0, 90)
              : "(none)";
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          /* observer unsupported */
        }
        setTimeout(() => resolve({ ...out, cls: Math.round(out.cls * 1000) / 1000 }), 5000);
      }),
  );

  // INP proxy: click the hero CTA, measure time to the next animation frame.
  let inp = 0;
  try {
    inp = await page.evaluate(async () => {
      const btn = document.querySelector('[data-testid="hero-login"]');
      if (!btn) return 0;
      const t0 = performance.now();
      btn.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return Math.round(performance.now() - t0);
    });
  } catch {
    /* ignore */
  }

  await page.screenshot({ path: join(SHOT, "apex.png") });
  const lcpOk = m.lcp > 0 && m.lcp <= LCP_MAX;
  const clsOk = m.cls <= CLS_MAX;
  console.log(`LCP=${m.lcp}ms (≤${LCP_MAX}) ${lcpOk ? "✅" : "❌"}`);
  console.log(`CLS=${m.cls} (≤${CLS_MAX}) ${clsOk ? "✅" : "❌"}`);
  console.log(`FCP=${m.fcp}ms · TTFB=${m.ttfb}ms · INP-proxy=${inp}ms (throttled: Fast-3G + 4× CPU)`);
  console.log(`LCP element: ${m.lcpEl}`);
  code = lcpOk && clsOk ? 0 : 1;
  console.log(code === 0 ? "\nPASS — apex within cinematic CWV targets" : "\nFAIL — a CWV target missed");
} catch (e) {
  console.error("cwv failed:", e.message);
} finally {
  await browser.close();
}
process.exit(code);
