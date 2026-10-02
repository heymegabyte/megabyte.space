#!/usr/bin/env node
// Link-validity gate (Hard Gate #10 "all hyperlinks valid" — no coverage before).
// Loads the RENDERED apex + /status (links are client-rendered React), collects every
// <a href>, and checks:
//   HARD (exit 1): in-page #anchors must resolve to a real element; same-origin paths
//                  must not 404.
//   WARN (exit 0): external links are GET-checked but only WARNed — a third-party being
//                  down or rate-limiting us is not our regression, and failing on it
//                  would flake the gate. mailto:/tel: are skipped.
// Usage: node scripts/verify-links.mjs

import { chromium } from "playwright";

const PAGES = ["https://megabyte.space/", "https://megabyte.space/status"];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  console.error(`❌ BLOCKED — chromium unavailable: ${error?.message || error}`);
  process.exit(2);
}

const hardFails = [];
const warns = [];
const seenExternal = new Set();

for (const pageUrl of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  const links = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map((a) => ({ href: a.getAttribute("href") || "", abs: a.href })),
  );

  for (const { href, abs } of links) {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (href.startsWith("#")) {
      const ok = await page.evaluate((h) => !!document.querySelector(h), href);
      if (!ok) hardFails.push(`${pageUrl} → anchor ${href} has no target element`);
      continue;
    }
    const url = new URL(abs);
    if (url.origin === "https://megabyte.space") {
      const res = await fetch(abs, { method: "GET", redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html" } }).catch((e) => ({ status: 0, err: String(e) }));
      if (res.status === 404 || res.status === 0) hardFails.push(`${pageUrl} → internal ${url.pathname} = ${res.status}${res.err ? " " + res.err : ""}`);
    } else {
      if (seenExternal.has(abs)) continue;
      seenExternal.add(abs);
      const res = await fetch(abs, { method: "GET", redirect: "follow", headers: { "User-Agent": UA } }).catch((e) => ({ status: 0, err: String(e) }));
      if (!(res.status >= 200 && res.status < 400)) warns.push(`external ${abs} = ${res.status}${res.err ? " " + res.err : ""}`);
    }
  }
  await ctx.close();
}

await browser.close();

if (hardFails.length) {
  console.log(`❌ ${hardFails.length} broken link(s):`);
  for (const f of hardFails) console.log(`  • ${f}`);
} else {
  console.log(`✅ links: all in-page anchors resolve + 0 internal 404s`);
}
if (warns.length) {
  console.log(`⚠️  ${warns.length} external warning(s) (not blocking):`);
  for (const w of warns) console.log(`  • ${w}`);
}
process.exit(hardFails.length ? 1 : 0);
