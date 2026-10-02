#!/usr/bin/env node
// Generate a designed 1200×630 OG social card → packages/home/public/og.jpg.
// Replaces the busy homepage SCREENSHOT with a clean branded card (wordmark + hero
// headline over the black/cyan field) — matches og:image:alt and looks premium in
// every link preview. Run on demand when the brand/headline changes.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "home", "public", "og.jpg");

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  body{background:#060610;font-family:'Sora',system-ui,sans-serif;color:#fff;overflow:hidden;position:relative}
  .glow{position:absolute;inset:0;background:radial-gradient(72% 95% at 78% 88%,rgba(0,229,255,.18),transparent 60%),radial-gradient(60% 80% at 12% 6%,rgba(124,58,237,.14),transparent 55%)}
  .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.055) 1px,transparent 1px);background-size:26px 26px;-webkit-mask-image:linear-gradient(to top right,transparent 32%,#000 92%)}
  .wrap{position:relative;padding:74px 82px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:16px}
  .brand span{font-size:36px;font-weight:800;letter-spacing:-.02em}
  .cyan{color:#00E5FF}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:21px;letter-spacing:.22em;text-transform:uppercase;color:#00E5FF;opacity:.88}
  h1{font-size:90px;font-weight:800;line-height:.98;letter-spacing:-.03em;max-width:1030px;margin-top:20px}
  .grad{background:linear-gradient(100deg,#fff 8%,#7ef0ff 38%,#00E5FF 60%,#7C3AED 96%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .foot{font-family:'JetBrains Mono',monospace;font-size:23px;color:rgba(255,255,255,.58)}
</style></head><body>
  <div class="glow"></div><div class="grid"></div>
  <div class="wrap">
    <div class="brand">
      <svg width="54" height="54" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="#00E5FF" stroke-width="2"/><path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#00E5FF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>Megabyte <span class="cyan">OS</span></span>
    </div>
    <div>
      <p class="eyebrow">Megabyte Labs · internal AI workspace</p>
      <h1>The operating system for <span class="grad">one human and a fleet of agents.</span></h1>
    </div>
    <p class="foot">agents with context · apps that build themselves · on Cloudflare</p>
  </div>
</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const buf = await page.screenshot({ type: "jpeg", quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
writeFileSync(OUT, buf);
console.log(`✅ og card: wrote ${OUT} (${Math.round(buf.length / 1024)} KB, 1200x630)`);
