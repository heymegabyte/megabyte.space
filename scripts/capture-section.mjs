#!/usr/bin/env node
/**
 * capture-section — screenshot ONE section of a live page by CSS selector, at a
 * given viewport, after its scroll-reveal/animation has settled. Closes the
 * recurring "dedicated <section> viewport screenshot + vision score" owed-item
 * in the Beautify-10x matrix (reuse, don't re-hand-roll a one-off each fire).
 *
 * Usage: node scripts/capture-section.mjs <url> <selector> <out.png> [width] [settleMs]
 * Prints a JSON line {ok, selector, box, consoleErrors} for the loop to read.
 */
import { chromium } from "playwright";

const [url, selector, out, width = "1280", settleMs = "2200"] = process.argv.slice(2);
if (!url || !selector || !out) {
  console.error("usage: capture-section <url> <selector> <out.png> [width] [settleMs]");
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
const el = page.locator(selector).first();
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(Number(settleMs)); // let beam draw + cards cascade in
const box = await el.boundingBox();
await el.screenshot({ path: out });
await browser.close();

// Our-origin console errors only. Tolerate genuinely third-party noise: a handed-off
// Access page, CF edge resources, and CF's edge-injected /cdn-cgi/challenge-platform
// inline script blocked by a strict CSP (see verify-apex-journey.mjs for rationale).
const TOLERATE =
  /cloudflareaccess\.com|cloudflareinsights|static\.cloudflare|challenges\.cloudflare|cdn-cgi\/|\/beacon(?:\.min)?\.js|web-vitals|(?:inline script|refused to execute inline script)[\s\S]*content security policy|content security policy[\s\S]*inline/i;
const ours = consoleErrors.filter((t) => !TOLERATE.test(t));
console.log(JSON.stringify({ ok: ours.length === 0, selector, box, consoleErrors: ours }));
process.exit(ours.length === 0 ? 0 : 1);
