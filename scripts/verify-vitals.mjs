#!/usr/bin/env node
/**
 * verify-vitals — proves the field-CWV pipeline WITHOUT polluting the public card.
 *
 *  1. guard    — a HEADLESS visit (navigator.webdriver=true) must add NO public
 *                sample (the beacon self-excludes automation). This is also why
 *                the standing verify-apex-journey no longer pollutes field data.
 *  2. isolation — POST probe samples (probe:true): they appear in
 *                `?includeProbe=1` but NEVER in the public pulse (probe column).
 *  3. display   — /status shows the CWV card IFF the public store has field data.
 *
 * Writes ONLY probe samples → safe to run any time (no field pollution).
 * Exit 0 = all green. Exit 1 = a leg failed (named in output).
 */
const APEX = "https://megabyte.space";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const steps = [];
const ok = (name, pass, detail = "") => {
  steps.push({ name, pass });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};
const pulse = async (includeProbe = false) => {
  const r = await fetch(`${APEX}/api/analytics/live${includeProbe ? "?includeProbe=1" : ""}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  return r.ok ? await r.json() : null;
};
const totalN = (p) => (p?.vitals ?? []).reduce((s, v) => s + v.n, 0);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  // 1. GUARD — a headless (webdriver=true) visit must NOT add a public sample.
  const beforePub = await pulse(false);
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const wd = await page.evaluate(() => navigator.webdriver).catch(() => null);
  await page.goto(`${APEX}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('a[href="#features"]').first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.goto("about:blank").catch(() => {}); // pagehide would flush — guard must suppress it
  await page.waitForTimeout(500);
  await ctx.close();
  let afterPub = beforePub;
  for (let i = 0; i < 6; i++) {
    await sleep(1000);
    afterPub = await pulse(false);
    if (totalN(afterPub) !== totalN(beforePub)) break;
  }
  ok("navigator.webdriver true in automation", wd === true, `webdriver=${wd}`);
  ok(
    "headless visit adds NO public field sample (beacon guard)",
    totalN(afterPub) === totalN(beforePub),
    `public ${totalN(beforePub)}→${totalN(afterPub)}`,
  );

  // 2. ISOLATION — probe POSTs land in includeProbe but NOT in the public pulse.
  const beforeProbe = totalN(await pulse(true));
  const beforePublic2 = totalN(await pulse(false));
  for (const [metric, value] of [
    ["LCP", 1500],
    ["CLS", 0.02],
    ["INP", 120],
    ["TTFB", 140],
  ]) {
    await fetch(`${APEX}/api/vitals`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json" },
      body: JSON.stringify({ metric, value, probe: true }),
    });
  }
  await sleep(1800);
  const afterProbe = totalN(await pulse(true));
  const afterPublic2 = totalN(await pulse(false));
  ok("probe POST stored (visible via includeProbe)", afterProbe > beforeProbe, `probe-incl ${beforeProbe}→${afterProbe}`);
  ok("probe samples EXCLUDED from the public card", afterPublic2 === beforePublic2, `public ${beforePublic2}→${afterPublic2}`);

  // 3. DISPLAY — /status renders the CWV card IFF public field data exists.
  const page2 = await (await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } })).newPage();
  await page2.goto(`${APEX}/status`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page2.waitForTimeout(2500);
  const hasPublicData = (await pulse(false))?.vitals?.some((v) => v.n > 0) ?? false;
  const cardVisible = await page2
    .locator('[data-testid="status-vitals"]')
    .isVisible()
    .catch(() => false);
  ok("/status CWV card presence matches public data", cardVisible === hasPublicData, `card=${cardVisible} hasData=${hasPublicData}`);
} catch (e) {
  ok("exception", false, e.message);
} finally {
  await browser.close();
}

const failed = steps.filter((s) => !s.pass);
console.log(`\n${steps.length - failed.length}/${steps.length} checks green`);
process.exit(failed.length ? 1 : 0);
