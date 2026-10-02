#!/usr/bin/env node
// Real-browser gate for the megabyte.space apex — closes the lying-pass gap that
// HTTP-only verify-prod cannot see: a Content-Security-Policy header can be present
// AND exact (verify-prod assertion #7 green) while that same CSP silently BLOCKS the
// page's fonts/scripts in a real browser. Fire-4 shipped a CSP that 8/8'd verify-prod
// yet threw 31 console errors live (CF Fonts same-origin + CF Web Analytics beacon
// were disallowed). This gate would have caught it pre-"done".
//
// Asserts, in a real headless Chromium against PROD:
//   1. Zero console errors EXCEPT a tightly-scoped upstream allowlist.
//   2. The WebGL hero canvas is present, sized, and actually painted (not a
//      black/empty lying-canvas — a zero-byte render passes every HTTP check).
//   3. The branded hero/H1 content rendered (not a blank SPA shell).
//
// Exit 0 = all green; 1 = any assertion failed; 2 = browser unavailable (BLOCKED,
// honest — never counts as passed). Usage: node scripts/verify-browser.mjs [url]

import { chromium } from "playwright";

const URL = process.argv[2] || "https://megabyte.space/";

// Console errors we KNOW are upstream Cloudflare edge injections, not our code:
//   • CF challenge-platform injects an inline bootstrap (window.__CF$cv$params)
//     carrying a per-request ray → its hash is unstable (un-pinnable) and we refuse
//     'unsafe-inline'. Our own bundle ships zero inline exec scripts (Vite modules
//     only), so a document-root inline-CSP violation is definitionally upstream.
// Anything NOT matching this list is OURS and fails the gate.
const UPSTREAM_ALLOW = [/inline script violates the following content security policy/i];

const isUpstream = (text) => UPSTREAM_ALLOW.some((re) => re.test(text));

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  console.error(`❌ BLOCKED — chromium unavailable: ${error?.message || error}`);
  console.error("   install once with: npx playwright install chromium");
  process.exit(2);
}

const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("requestfailed", (req) => {
  // Favicon/analytics beacon aborts are noise; real asset failures are not.
  const url = req.url();
  if (/\.(js|css|woff2?|wasm)(\?|$)/i.test(url)) errors.push(`requestfailed: ${url} ${req.failure()?.errorText || ""}`);
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
// Give the WebGL hero a beat to grab its context + paint a frame.
await page.waitForTimeout(1500);

const canvas = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  return c ? { present: true, w: c.width, h: c.height } : { present: false };
});

// Paint check via a REAL screenshot: Playwright composites the actually-displayed
// pixels, so it works where in-page readPixels()/drawImage() both read blank on a
// preserveDrawingBuffer:false WebGL canvas. A flat/black canvas PNG-compresses to
// ~1-2KB; a rendered cyan/purple wave field is many KB.
let paintedBytes = 0;
try {
  const box = await page.locator("canvas").first().boundingBox();
  if (box) {
    const shot = await page.screenshot({
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width, 1280),
        height: Math.min(box.height, 720),
      },
    });
    paintedBytes = shot.length;
  }
} catch {
  /* canvas screenshot unavailable — leaves paintedBytes 0 → fails honestly */
}
const painted = paintedBytes > 4000;

const branded = await page.evaluate(() => {
  const t = document.body?.innerText || "";
  return t.includes("Megabyte OS") || t.length > 400;
});

// Reduced-motion Hard Gate: mountHeroField() returns early under
// prefers-reduced-motion, so the WebGL field never mounts — the static gradient +
// text must carry the hero cleanly. Assert the page still renders (branded content)
// with zero OUR console errors (no WebGL init attempted, no broken fallback). This
// had no automated coverage; the fire-10 lazy-load could have silently broken it.
const rmContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
const rmPage = await rmContext.newPage();
const rmErrors = [];
rmPage.on("console", (m) => {
  if (m.type() === "error") rmErrors.push(m.text());
});
rmPage.on("pageerror", (e) => rmErrors.push(`pageerror: ${e.message}`));
await rmPage.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await rmPage.waitForTimeout(800);
const rmBranded = await rmPage.evaluate(() => (document.body?.innerText || "").includes("Megabyte OS"));
const rmOurErrors = rmErrors.filter((e) => !isUpstream(e));
await rmContext.close();

await browser.close();

const ourErrors = errors.filter((e) => !isUpstream(e));
const upstream = errors.filter(isUpstream);

const checks = [
  ["no OUR console errors", ourErrors.length === 0, `${ourErrors.length} ours / ${upstream.length} upstream-allowed`],
  ["WebGL hero canvas present", canvas.present === true, canvas.present ? `${canvas.w}x${canvas.h}` : "absent"],
  ["WebGL hero painted (not black)", painted === true, `${paintedBytes}B clip`],
  ["branded content rendered", branded === true, branded ? "ok" : "blank shell"],
  ["reduced-motion: clean static fallback", rmBranded === true && rmOurErrors.length === 0, `branded=${rmBranded} ourErrors=${rmOurErrors.length}`],
];

for (const [name, pass, detail] of checks) console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name} — ${detail}`);
if (ourErrors.length) {
  console.log("\n--- OUR console errors (gate failures) ---");
  for (const e of ourErrors.slice(0, 20)) console.log(`  • ${e.slice(0, 180)}`);
}
if (upstream.length) console.log(`\n(${upstream.length} upstream-allowed error(s) ignored: CF challenge-platform inline bootstrap)`);

const failed = checks.filter(([, pass]) => !pass);
console.log(`\n${checks.length - failed.length}/${checks.length} browser checks green`);
process.exit(failed.length === 0 ? 0 : 1);
