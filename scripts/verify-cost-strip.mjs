#!/usr/bin/env node
/**
 * fire-84 proof: the /gadgets cost/activity summary strip (North Star WS-N4 — Costs/Metrics
 * governance primitive) renders and RECONCILES against the actual table rows (verify-against-
 * source-of-truth, not render-alone). BA-authed real Chromium, PROD. Asserts the strip's four
 * cards exist, the Gadgets count === table row count, Favorites === pressed-star count, Total
 * spend === Σ of the table's cost cells (4dp tolerance), and 0 console errors. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
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
await page.goto(`${APEX}/gadgets`, { waitUntil: "domcontentloaded", timeout: 40000 });
// Data-loaded signal: a gadget row's favorite star (each row has exactly one).
await page.waitForSelector('button[aria-label^="Favorite"], button[aria-label^="Unfavorite"]', { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1200);

const recon = await page.evaluate(() => {
  const dl = document.querySelector("dl");
  const cards = {};
  if (dl) for (const card of dl.children) {
    const dt = card.querySelector("dt")?.innerText?.trim().toLowerCase();
    const dd = card.querySelector("dd")?.innerText?.trim();
    if (dt && dd) cards[dt] = dd;
  }
  const stars = Array.from(document.querySelectorAll('button[aria-label^="Favorite"], button[aria-label^="Unfavorite"]'));
  const rowCount = stars.length;
  const favCount = stars.filter((b) => b.getAttribute("aria-pressed") === "true").length;
  const table = document.querySelector("table");
  let costSum = 0;
  if (table) {
    const tb = table.querySelector("tbody") || table;
    for (const m of (tb.innerText.match(/\$\d+\.\d+/g) || [])) costSum += parseFloat(m.slice(1));
  }
  return { cards, rowCount, favCount, costSum };
});

await page.screenshot({ path: "scripts/.cost-strip-proof.png" });
await browser.close();

const num = (s) => parseFloat(String(s ?? "").replace(/[^0-9.]/g, ""));
const stripHas = ["total spend", "gadgets", "favorites", "last active"].every((k) => k in recon.cards);
const stripCount = parseInt(recon.cards["gadgets"] ?? "NaN", 10);
const stripFav = parseInt(recon.cards["favorites"] ?? "NaN", 10);
const stripSpend = num(recon.cards["total spend"]);
const countOk = stripHas && stripCount === recon.rowCount;
const favOk = stripHas && stripFav === recon.favCount;
const spendOk = stripHas && Math.abs(stripSpend - recon.costSum) < 0.0001;

console.log(JSON.stringify({ ...recon, stripHas, stripCount, stripFav, stripSpend, countOk, favOk, spendOk, consoleErrors: errors.length }, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
if (!stripHas) { console.log("❌ FAIL: cost summary strip (4 cards) not found"); ok = false; }
else console.log("✅ PASS: cost/activity strip renders (Total spend · Gadgets · Favorites · Last active)");
if (!countOk) { console.log(`❌ FAIL: strip Gadgets ${stripCount} ≠ ${recon.rowCount} table rows`); ok = false; }
else console.log(`✅ PASS: Gadgets count reconciles with table rows (${stripCount})`);
if (!favOk) { console.log(`❌ FAIL: strip Favorites ${stripFav} ≠ ${recon.favCount} pressed stars`); ok = false; }
else console.log(`✅ PASS: Favorites reconciles with pressed stars (${stripFav})`);
if (!spendOk) { console.log(`❌ FAIL: strip Total spend ${stripSpend} ≠ Σ table costs ${recon.costSum}`); ok = false; }
else console.log(`✅ PASS: Total spend reconciles with Σ table costs ($${recon.costSum.toFixed(4)})`);
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors");
process.exit(ok ? 0 : 1);
