#!/usr/bin/env node
/**
 * WS-DEMO: the /secrets surface (encrypted env-vars — the ResourcesPanel "Secrets" card: values never
 * shown, set & rotate). Reachable via the SIDEBAR rail (real-user path, proves nav wiring); renders
 * the stat strip + scope filter + search + the secrets list (masked values). The SIGNATURE
 * interactions: a scope pill + search narrow the list, "Rotate" replaces a secret, and "Add secret"
 * masks + adds one. Clearly labeled "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + scope filter + a secret + masking + honesty label.
const NEEDLES = [
  /sample data/i,              // honest "Preview · sample data" — never lies-empty
  /\bsecrets\b/i,              // the page
  /\b(workspace|account)\b/i,  // the scope filter / scopes
  /ANTHROPIC_API_KEY|STRIPE_SECRET_KEY/, // real sample secret names (env-style)
  /••••|never shown/i,         // the masking contract
  /rotation|rotate/i,          // the rotation policy / action
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

// Return to an authed surface with the rail, then click the Secrets rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Secrets", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/secrets/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

const countRows = () => page.locator('section[aria-label="Secrets"] li').count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — "Rotate" a secret → the row flips to "Rotated".
let rotateWorks = false;
const rotateBtn = page.getByRole("button", { name: /^Rotate / }).first();
if (await rotateBtn.count().then((c) => c > 0).catch(() => false)) {
  await rotateBtn.click().catch(() => {});
  await page.waitForTimeout(400);
  const body2 = await page.evaluate(() => document.body.innerText);
  rotateWorks = /rotated/i.test(body2);
}

// INTERACTIVE 2 — a scope pill narrows the list. All → Account (fewer, >0).
let countAccount = countAll;
const acctPill = page.getByRole("button", { name: /^Account/ }).first();
if (await acctPill.count().then((c) => c > 0).catch(() => false)) {
  await acctPill.click().catch(() => {});
  await page.waitForTimeout(400);
  countAccount = await countRows().catch(() => countAll);
}
const scopeFilterWorks = countAll > 0 && countAccount > 0 && countAccount < countAll;

// INTERACTIVE 3 — search narrows. Reset to All, type a secret name → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search secrets/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("stripe");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 4 — "Add secret" composer masks + adds a new row (count increases, value masked).
let addWorks = false;
const addBtn = page.getByRole("button", { name: "Add secret" }).first();
if (await addBtn.count().then((c) => c > 0).catch(() => false)) {
  await addBtn.click().catch(() => {});
  await page.waitForTimeout(300);
  const nameInput = page.locator('#new-secret-name');
  const valueInput = page.locator('#new-secret-value');
  if (await nameInput.count().then((c) => c > 0).catch(() => false)) {
    await nameInput.fill("VERIFY_PROBE");
    await valueInput.fill("probe-value-9999");
    const confirm = page.getByRole("button", { name: "Add", exact: true }).first();
    await confirm.click().catch(() => {});
    await page.waitForTimeout(500);
    const countAfter = await countRows().catch(() => countAll);
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    // masked (last-4 shown behind dots), full value NEVER present.
    addWorks = countAfter === countAll + 1 && /VERIFY_PROBE/.test(bodyAfter) && /••••9999/.test(bodyAfter) && !/probe-value-9999/.test(bodyAfter);
  }
}

await page.screenshot({ path: "scripts/.secrets-proof.png", fullPage: true });
await browser.close();

const realErrors = errors.filter((e) => !/already in (CLOSING|CLOSED) state/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countAccount, countSearch, rotateWorks, scopeFilterWorks, searchWorks, addWorks, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Secrets reachable from the sidebar rail", "no Secrets rail link (nav wiring missing)");
check(onPath, "Secrets rail click → /secrets", "rail click did not reach /secrets");
check(renders, "Secrets content renders (stats + scope filter + masked names + rotation + honesty label)", `content missing: ${missing.join(", ")}`);
check(rotateWorks, "Rotate replaces a secret (Rotated)", "rotate did not confirm");
check(scopeFilterWorks, `Scope filter narrows the list (All ${countAll} → Account ${countAccount})`, "scope pill did not narrow the list");
check(searchWorks, `Search narrows the list (All ${countAll} → "stripe" ${countSearch})`, "search did not narrow the list");
check(addWorks, "Add-secret composer masks + adds a row (value never shown in full)", "add-secret did not add a masked row");
check(realErrors.length === 0, "0 console errors on /secrets", `${realErrors.length} console errors`);
console.log(ok ? "✅ SECRETS GREEN" : "❌ secrets check failed");
process.exit(ok ? 0 : 1);
