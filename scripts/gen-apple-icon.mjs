#!/usr/bin/env node
// Generate the 180×180 apple-touch-icon (mandated by quality-metrics; the apex had
// only an SVG favicon, so iOS "Add to Home Screen" fell back to a generic icon).
// Full-square dark bg (iOS rounds the corners itself) + the cyan M-hexagon brand mark.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "home", "public", "apple-touch-icon.png");

const HTML = `<!doctype html><html><body style="margin:0">
<div style="width:180px;height:180px;background:#060610;display:flex;align-items:center;justify-content:center">
  <svg width="138" height="138" viewBox="0 0 32 32">
    <rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="none" stroke="#00E5FF" stroke-width="2"/>
    <path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#00E5FF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</div></body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
await page.setContent(HTML, { waitUntil: "load" });
await page.waitForTimeout(150);
const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 180, height: 180 } });
await browser.close();
writeFileSync(OUT, buf);
console.log(`✅ apple-touch-icon: wrote ${OUT} (${Math.round(buf.length / 1024)} KB, 180x180)`);
