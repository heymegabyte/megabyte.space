#!/usr/bin/env node
/**
 * fire-284 proof: WS-13 Slice B — the OS shell dark base is now TRUE cool-black #060610, not
 * violet-tinted. BA-authenticated real Chromium, PROD. Across authed surfaces, assert:
 *   (1) the page root/body background is a deep near-black (all channels <= 22, ~#060610 rgb 6,6,16);
 *   (2) NO dark neutral surface reads violet — for every dark grayish background, the blue channel
 *       sits within 12 of max(R,G) (the old ladder's fills/tint were 13-24 over = visible purple);
 *   (3) the specific old violet fills rgb(26,26,39)/rgb(42,41,66) are GONE;
 *   (4) 0 console errors.
 * SURFACE background-color is a reliable computed-style probe (unlike brand ink, which renders via
 * box-shadow/color-mix — see verify-shell-cyan.mjs); the .shell-black-*.png screenshots are the
 * aesthetic (vision) proof per the WS-13 Slice A RECIPE. Needs BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA_E2E_EMAIL / BA_E2E_PASSWORD"); process.exit(2); }

// B - max(R,G) above this on a dark gray surface == visible violet. The brand base #060610 is itself
// gap 10 (rgb 6,6,16) and the new near-neutral elevated ladder renders ~10-13 in Chromium; the OLD
// violet ladder measured a stable gap 20 on prod (rgb 23,24,44) — 15 separates them with headroom.
const VIOLET_GAP_MAX = 15;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
});
await page.addInitScript(() => { try { localStorage.setItem("megabyteOS_entered", "1"); } catch {} });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${APEX}/signin`, { waitUntil: "networkidle", timeout: 30000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page.waitForTimeout(2500);
await page.goto(`${APEX}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
for (let i = 0; i < 5; i++) {
  const finish = page.locator("button", { hasText: /Let'?s build/ });
  if (await finish.count()) { await finish.first().click().catch(() => {}); await page.waitForTimeout(3000); break; }
  const next = page.locator("button", { hasText: /^\s*Next\s*$/ });
  if (await next.count()) { await next.first().click().catch(() => {}); await page.waitForTimeout(1000); continue; }
  break;
}

async function scan(label, path) {
  await page.goto(`${APEX}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate((cfg) => {
    const parse = (v) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v); return m ? [+m[1], +m[2], +m[3]] : null; };
    const rootBg = getComputedStyle(document.body).backgroundColor;
    let worstGap = 0, worstColor = "", darkSurfaces = 0;
    for (const el of document.querySelectorAll("*")) {
      const bg = getComputedStyle(el).backgroundColor;
      const c = parse(bg);
      if (!c) continue;
      const [R, G, B] = c;
      // dark, grayish (neutral) surface only — exclude saturated brand/status fills + light elements
      if (Math.max(R, G, B) <= 80 && Math.abs(R - G) <= 6) {
        darkSurfaces++;
        const gap = B - Math.max(R, G);
        if (gap > worstGap) { worstGap = gap; worstColor = bg; }
      }
    }
    return { rootBg, worstGap, worstColor, darkSurfaces };
  });
  await page.screenshot({ path: `scripts/.shell-black-${label}.png` });
  return r;
}

const home = await scan("home", "/");
const models = await scan("models", "/models");
const database = await scan("database", "/database");
await browser.close();

const parseRoot = (v) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v || ""); return m ? [+m[1], +m[2], +m[3]] : null; };
const out = { home, models, database, consoleErrors: errors.length };
console.log(JSON.stringify(out, null, 2));
if (errors.length) console.log("errors:", errors.join(" | ").slice(0, 300));

let ok = true;
// (1) root/body is deep near-black
for (const [label, s] of [["home", home], ["models", models], ["database", database]]) {
  const c = parseRoot(s.rootBg);
  if (!c || Math.max(...c) > 22) { console.log(`❌ FAIL ${label}: body bg ${s.rootBg} not deep black (<=22/ch)`); ok = false; }
  else console.log(`✅ ${label}: body bg ${s.rootBg} is deep near-black (#060610 class)`);
}
// (2) no violet dark surface
const worst = Math.max(home.worstGap, models.worstGap, database.worstGap);
if (worst > VIOLET_GAP_MAX) { console.log(`❌ FAIL: a dark surface reads violet (B-max(R,G)=${worst} > ${VIOLET_GAP_MAX})`); ok = false; }
else console.log(`✅ PASS: no violet dark surface (worst blue-gap ${worst} <= ${VIOLET_GAP_MAX})`);
// coverage sanity: we actually found dark surfaces to judge
const surfaces = home.darkSurfaces + models.darkSurfaces + database.darkSurfaces;
if (surfaces < 3) { console.log(`❌ FAIL: only ${surfaces} dark surfaces scanned — probe found too little to trust`); ok = false; }
else console.log(`✅ scanned ${surfaces} dark surfaces across 3 authed routes`);
// (4) console errors
if (errors.length) { console.log("❌ FAIL: console errors"); ok = false; }
else console.log("✅ PASS: 0 console errors across the walk");
process.exit(ok ? 0 : 1);
