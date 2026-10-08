#!/usr/bin/env node
/**
 * WS-DEMO: the /images surface (Cloudflare Images — the ResourcesPanel "Images" card: store an original
 * once, deliver many VARIANTS over imagedelivery.net). Reachable via the SIDEBAR rail (real-user path,
 * proves nav wiring); renders the stat strip + format filter + search + a gallery + the selected-image
 * detail (metadata + access posture + named delivery variants + the TRANSFORM PLAYGROUND). The SIGNATURE
 * interactions: a format pill narrows the gallery, and the transform playground (fire-279) composes a
 * live Cloudflare Images FLEXIBLE-VARIANT URL (width/fit/quality/format straight in the delivery path) —
 * clicking a fit/format toggle rewrites the URL on the fly. Clearly labeled sample images.
 * BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + format filter + the CDN + sizes + the playground heading.
const NEEDLES = [
  /sample images/i,          // honest hybrid chip "Live workspaces · sample images" — never lies-empty
  /\bimages\b/i,             // the page
  /imagedelivery\.net/i,     // the Cloudflare Images delivery CDN (the real URL shape)
  /webp|avif/i,              // formats
  /\b(KB|MB)\b/,             // formatted sizes
  /transform on delivery/i,  // the fire-279 transform playground heading
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
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

// Return to an authed surface with the rail, then click the Images rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Images", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/images/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// DEPTH: the live "your workspaces delivering images" band renders a fail-soft state (running for the
// ba-e2e account, which has ≥1 gadget). Proves the real listGadgets wiring, not just the sample gallery.
const liveBand = /Checking your workspaces|Image owners unavailable|No workspaces yet|\d+\s+workspaces?\s+delivering images/i.test(body);

// INTERACTIVE 1 — a format pill narrows the gallery. All (10) → WebP (fewer, >0).
const galleryRows = () => page.locator('section[aria-label="Image gallery"] li').count();
const countAll = await galleryRows().catch(() => 0);
let countWebp = countAll;
// The FilterPill accessible name is "<label> <count>" (e.g. "WebP 3"), so match the prefix — a
// case-sensitive /^WebP/ also avoids colliding with the playground's uppercase "WEBP" format toggle.
const webpPill = page.getByRole("button", { name: /^WebP/ }).first();
if (await webpPill.count().then((c) => c > 0).catch(() => false)) {
  await webpPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countWebp = await galleryRows().catch(() => countAll);
}
const formatFilterWorks = countAll > 0 && countWebp > 0 && countWebp < countAll;
// Reset to All so the default image (landing-nebula) is selected for the playground assertions.
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }

// INTERACTIVE 2 — the selected-image detail renders with its named delivery variants.
const detail = page.locator('aside[aria-label^="Image:"]').first();
const detailOpens = await detail.count().then((c) => c > 0).catch(() => false);
const detailText = detailOpens ? await detail.innerText().catch(() => "") : "";
const variantsPresent = /public/.test(detailText) && /thumbnail/.test(detailText) && /hero/.test(detailText);

// INTERACTIVE 3 (fire-279) — the TRANSFORM PLAYGROUND composes a live CF flexible-variant URL. The
// default reads width=800,fit=scale-down,quality=80,format=auto; clicking the "cover" fit toggle and the
// "WEBP" format toggle rewrites the URL on the fly (the signature Cloudflare Images capability).
const urlOf = () => detail.locator('[data-testid="transform-url"]').innerText().catch(() => "");
const urlDefault = await urlOf();
const playgroundDefault = /width=800,fit=scale-down,quality=80,format=auto/.test(urlDefault);

let fitRewrites = false, formatRewrites = false;
const coverToggle = detail.getByRole("button", { name: "cover", exact: true }).first();
if (await coverToggle.count().then((c) => c > 0).catch(() => false)) {
  await coverToggle.click().catch(() => {});
  await page.waitForTimeout(250);
  fitRewrites = /fit=cover/.test(await urlOf());
}
const webpToggle = detail.getByRole("button", { name: "WEBP", exact: true }).first();
if (await webpToggle.count().then((c) => c > 0).catch(() => false)) {
  await webpToggle.click().catch(() => {});
  await page.waitForTimeout(250);
  formatRewrites = /format=webp/.test(await urlOf());
}
const urlAfter = await urlOf();

await page.screenshot({ path: "scripts/.images-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, liveBand, missing, countAll, countWebp, formatFilterWorks, detailOpens, variantsPresent, urlDefault, playgroundDefault, fitRewrites, formatRewrites, urlAfter, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Images reachable from the sidebar rail", "no Images rail link (nav wiring missing)");
check(onPath, "Images rail click → /images", "rail click did not reach /images");
check(renders, "Images content renders (stats + format filter + CDN + sizes + playground heading)", `content missing: ${missing.join(", ")}`);
check(liveBand, "Live 'your workspaces delivering images' band renders (listGadgets DEPTH, fail-soft)", "live image-owners band missing — listGadgets DEPTH not wired");
check(formatFilterWorks, `Format filter narrows the gallery (All ${countAll} → WebP ${countWebp})`, "format pill did not narrow the gallery");
check(detailOpens, "Selected-image detail renders", "image detail aside missing");
check(variantsPresent, "Detail lists the named delivery variants (public + thumbnail + hero)", "named variants missing from the detail");
check(playgroundDefault, "Transform playground shows the default flexible-variant URL (width=800,fit=scale-down,quality=80,format=auto)", `playground default URL wrong: ${urlDefault.slice(0, 120)}`);
check(fitRewrites, "Clicking the 'cover' fit toggle rewrites the URL (fit=cover)", "fit toggle did not rewrite the transform URL");
check(formatRewrites, "Clicking the 'WEBP' format toggle rewrites the URL (format=webp)", "format toggle did not rewrite the transform URL");
check(realErrors.length === 0, "0 console errors on /images", `${realErrors.length} console errors`);
console.log(ok ? "✅ IMAGES GREEN" : "❌ images check failed");
process.exit(ok ? 0 : 1);
