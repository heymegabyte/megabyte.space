#!/usr/bin/env node
/**
 * verify-reduced-motion — load the apex with prefers-reduced-motion:reduce and
 * assert every motion-gated surface still renders its content VISIBLE (never
 * stuck at opacity:0 from a 'backwards'-fill animation that never plays) with a
 * clean console.
 *
 * This guards the invariant EVERY Beautify-10x motion pass must honor
 * (gorgeous-by-default / nebula-waiting: motion is gated, content is NEVER
 * hidden by animation alone). The reveal/step-card/trust-row cascades all start
 * at opacity:0 and rely on an entrance animation — a reduced-motion regression
 * that forgets the explicit visible override leaves the section permanently
 * blank with ZERO console errors, invisible to every other gate.
 *
 * Usage: node scripts/verify-reduced-motion.mjs
 * Exit 0 = reduced-motion safe. Exit 1 = a surface is hidden or console dirty.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APEX = "https://megabyte.space";
const SHOT = join(ROOT, "e2e", "screenshots", "reduced-motion");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
// Third-party console noise we don't own (CF edge beacon / challenge / cdn-cgi).
const CF = /cloudflareinsights|static\.cloudflare|challenges\.cloudflare|cdn-cgi\/|web-vitals|inline script[\s\S]*content security policy/i;

const { chromium } = await import("playwright");
mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: UA,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !CF.test(m.text())) errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const steps = [];
const ok = (name, pass, detail = "") => {
  steps.push({ name, pass });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};

try {
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);
  // Scroll the full page so every IntersectionObserver reveal + cascade fires —
  // reduced-motion must still END with content visible, just without the motion.
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);

  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  ok("prefers-reduced-motion:reduce active", reduced);

  // Every motion-gated surface must be VISIBLE (opacity ≥ .95), not stuck hidden.
  const checkVisible = async (sel, label, min) => {
    const res = await page.evaluate((s) => {
      const els = Array.from(document.querySelectorAll(s));
      const op = els.map((e) => parseFloat(getComputedStyle(e).opacity || "1"));
      return { count: els.length, hidden: op.filter((o) => o < 0.95).length, min: op.length ? Math.min(...op) : 1 };
    }, sel);
    ok(
      `${label} visible (${res.count} el, min-opacity ${res.min})`,
      res.count >= min && res.hidden === 0,
      res.hidden ? `${res.hidden} stuck hidden` : "",
    );
  };
  await checkVisible("h1", "hero h1", 1);
  await checkVisible(".reveal", "reveal elements", 4);
  await checkVisible("#features .card", "feature cards", 6);
  await checkVisible(".trust-row", "trust rows", 4);
  await checkVisible(".step-card", "step cards", 4);

  await page.screenshot({ path: join(SHOT, "apex-reduced-motion.png"), fullPage: true });
  ok("zero OUR console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  ok("exception", false, e.message);
} finally {
  await browser.close();
}

const failed = steps.filter((s) => !s.pass);
console.log(`\n${steps.length - failed.length}/${steps.length} checks green`);
process.exit(failed.length ? 1 : 0);
