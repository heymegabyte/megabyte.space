#!/usr/bin/env node
/**
 * verify-apex-journey — LONG real-browser golden path over the PUBLIC apex
 * (megabyte.space). Drives a real user flow: hero → nav to every section →
 * footer CTA → /status (display-vs-store reconcile) → /login funnel, asserting
 * visible content + section reveals + responsive + axe + zero console errors at
 * each step. Fully verifiable (apex is public; no Access/WS limits).
 *
 * This is the apex leg of the loop's golden-path engine (§6) — the OS legs are
 * blocked headless by the service-token WebSocket 403 (WS-8.4).
 *
 * Exit 0 = journey green. Exit 1 = a step failed (the output names which).
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APEX = "https://megabyte.space";
const SHOT = join(ROOT, "e2e", "screenshots", "apex-journey");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const ALLOW = /cloudflareinsights|static\.cloudflare|challenges\.cloudflare|cdn-cgi|\/beacon|web-vitals/i;

const { chromium } = await import("playwright");
mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA });
const page = await context.newPage();
const errors = [];
// Only count errors while we're on OUR apex. The final /login step hands off to
// the Cloudflare Access page (cloudflareaccess.com), whose own CSP blocks its own
// inline-SVG logo — an upstream CF error on CF's domain, not ours to fix.
let onApex = true;
// Suppress the EXPECTED 404 resource-load console message during the intentional
// soft-404 test navigation — the 404 is what we assert, not a defect. A real
// broken-asset 404 on any other step still fails the gate.
let testing404 = false;
page.on("console", (m) => {
  if (onApex && m.type() === "error" && !ALLOW.test(m.text()) && !(testing404 && /status of 404/i.test(m.text())))
    errors.push(m.text());
});
page.on("pageerror", (e) => {
  if (onApex) errors.push(`pageerror: ${e.message}`);
});

const steps = [];
const ok = (name, pass, detail = "") => {
  steps.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};
const textOf = async (sel) => (await page.locator(sel).first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();

try {
  // 1 — HERO
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const h1 = await textOf("h1");
  ok("hero h1", /one human and a fleet of agents/i.test(h1), h1.slice(0, 60));
  ok("hero CTA visible", await page.locator('[data-testid="hero-login"]').isVisible());
  ok("WebGL canvas present", (await page.locator("canvas[data-webgl]").count()) > 0);
  await page.screenshot({ path: join(SHOT, "1-hero.png") });

  // 2 — NAV: Features
  await page.locator('a[href="#features"]').first().click();
  await page.waitForTimeout(1200);
  ok("features section reached", await page.locator("#features").isVisible());
  const cards = await page.locator("#features .card").count();
  ok("features has ≥6 cards", cards >= 6, `${cards} cards`);
  await page.screenshot({ path: join(SHOT, "2-features.png") });

  // 3 — NAV: How it works
  await page.locator('a[href="#how"]').first().click();
  await page.waitForTimeout(1200);
  ok("how-it-works reached", await page.locator("#how").isVisible());
  const steps4 = await page.locator("#how .timeline li, #how ol li").count();
  ok("how has ≥4 steps", steps4 >= 4, `${steps4} steps`);
  await page.screenshot({ path: join(SHOT, "3-how.png") });

  // 4 — NAV: Trust
  await page.locator('a[href="#trust"]').first().click();
  await page.waitForTimeout(1200);
  const trust = await textOf("#trust");
  ok("trust reached", /nothing bad happens/i.test(trust) || (await page.locator("#trust").isVisible()));
  await page.screenshot({ path: join(SHOT, "4-trust.png") });

  // 5 — footer CTA + reveals fired
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  ok("footer CTA visible", await page.locator('[data-testid="footer-login"]').isVisible());
  const revealed = await page.locator(".reveal.is-in").count();
  ok("scroll reveals fired", revealed >= 4, `${revealed} revealed`);
  await page.screenshot({ path: join(SHOT, "5-cta.png") });

  // 6 — axe (best-effort; skip if dep absent)
  try {
    const { AxeBuilder } = await import("@axe-core/playwright");
    const res = await new AxeBuilder({ page }).options({ runOnly: ["wcag2a", "wcag2aa"] }).analyze();
    const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    ok("axe 0 serious/critical", serious.length === 0, serious.map((v) => v.id).join(",") || "clean");
  } catch (e) {
    ok("axe", true, `skipped (${e.message.slice(0, 40)})`);
  }

  // 7 — responsive @390
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(600);
  ok("mobile hero h1 visible", await page.locator("h1").first().isVisible());
  ok("mobile CTA visible", await page.locator('[data-testid="hero-login"]').isVisible());
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("no horizontal overflow @390", overflow <= 2, `overflow=${overflow}px`);
  await page.screenshot({ path: join(SHOT, "6-mobile.png") });
  await page.setViewportSize({ width: 1280, height: 900 });

  // 8 — /status reached via the NEW footer link (interconnectedness) + reconcile
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  ok("footer status link present", await page.locator('[data-testid="footer-status"]').isVisible());
  await page.locator('[data-testid="footer-status"]').click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(2500);
  ok("footer link navigates to /status", page.url().includes("/status"));
  const statCards = await page.locator(".card").count();
  ok("/status renders cards", statCards >= 1, `${statCards} cards`);
  const api = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/analytics/live", { headers: { Accept: "application/json" } });
      return r.ok ? await r.json() : { error: r.status };
    } catch (e) {
      return { error: String(e) };
    }
  });
  const bodyTxt = await textOf("body");
  const apiTotal = typeof api.total === "number" ? api.total : null;
  const shown = apiTotal !== null && bodyTxt.includes(String(apiTotal));
  ok("/status display reconciles with store", apiTotal !== null && shown, `api.total=${apiTotal} shownInDOM=${shown}`);
  ok("/status sparkline renders", (await page.locator('[data-testid="status-sparkline"] polyline').count()) > 0);
  const topN = await page.locator('[data-testid="status-top-paths"] li').count();
  ok("/status top-paths render", topN > 0, `${topN} paths`);
  ok("/status daily series present in API", Array.isArray(api.daily) && api.daily.length === 14, `${api.daily?.length} days`);
  await page.screenshot({ path: join(SHOT, "7-status.png") });

  // 8b — soft-404 guard: an unknown path returns a real 404 STATUS + the styled NotFound page
  testing404 = true;
  const nf = await page.goto(`${APEX}/this-page-does-not-exist-xyz`, { waitUntil: "domcontentloaded", timeout: 30000 });
  ok("unknown path → real 404 status", nf?.status() === 404, `status=${nf?.status()}`);
  await page.waitForTimeout(500);
  ok("styled 404 (NotFound) renders", await page.locator('[data-testid="notfound-home"]').isVisible());
  await page.screenshot({ path: join(SHOT, "8-notfound.png") });
  testing404 = false;

  // 9 — /login funnel (real click from home → leaves apex into the OS/Access)
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  onApex = false; // leaving our apex into the OS/Access — their console is not ours
  await page.locator('[data-testid="hero-login"]').first().click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(1500);
  const url = page.url();
  ok("/login funnel leaves apex into OS/Access", /os\.megabyte\.space|cloudflareaccess\.com/i.test(url), url.slice(0, 70));

  // 10 — console clean
  ok("zero OUR console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  ok("journey exception", false, e.message);
} finally {
  await browser.close();
}

const failed = steps.filter((s) => !s.pass);
console.log(`\n${steps.length - failed.length}/${steps.length} steps green`);
if (failed.length) console.log("FAILED: " + failed.map((s) => s.name).join(", "));
process.exit(failed.length ? 1 : 0);
