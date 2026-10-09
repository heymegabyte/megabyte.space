#!/usr/bin/env node
/**
 * WS-DEMO: the /realtime surface (Cloudflare Realtime / Calls — the WebRTC SFU; a NEW Resources panel,
 * documented §56-58 Realtime SFU · voice-first · WebRTC). Reachable via the SIDEBAR rail (real-user path,
 * proves nav wiring); renders the stat strip (active rooms · participants · bandwidth · regions) + a status
 * filter + search + the room cards (participants · A/V tracks · bandwidth · region) with a per-room End
 * action. Distinct from /presence (the activity manifest) + /browser-runs (headless sessions). The SIGNATURE
 * interactions: a status pill + search narrow the rooms, and "End" ends a live call (one fewer End button).
 * Cross-links Presence. "Preview · sample data". BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) { console.log("missing BA creds"); process.exit(2); }

// ≥6 content needles proving the stat strip + status filter + a room + tracks/bandwidth + SFU + honesty.
const NEEDLES = [
  /sample data/i,                                 // honest "Preview · sample data"
  /realtime/i,                                    // the page
  /\b(live|connecting|ended)\b/i,                 // the status filter / statuses
  /standup-sync|sales-demo|voice-note/i,          // real sample room names
  /audio|video|participant/i,                     // the media tracks / participants
  /bandwidth|mbps|sfu|room/i,                      // the stat strip / SFU concept
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

// Return to an authed surface with the rail, then click the Realtime rail link (real-user nav).
await page.goto(`${APEX}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(700);
const link = page.getByRole("link", { name: "Realtime", exact: true }).first();
const reachable = await link.count().then((c) => c > 0).catch(() => false);
if (reachable) { await link.click().catch(() => {}); await page.waitForTimeout(1200); }
const onPath = /\/realtime/.test(page.url());
const body = await page.evaluate(() => document.body.innerText);
const missing = NEEDLES.filter((re) => !re.test(body)).map((re) => re.source);
const renders = missing.length === 0;

// Proof in the ALL state — every room card (status/region + tracks/bandwidth + End) visible for the vision read.
await page.screenshot({ path: "scripts/.realtime-proof.png", fullPage: true });

// cross-link to Presence.
const presenceLink = await page.getByRole("button", { name: /^Presence/ }).count().then((c) => c > 0).catch(() => false);

const countRows = () => page.locator('section[aria-label="Realtime rooms"] article').count();
const countEnd = () => page.getByRole("button", { name: "End", exact: true }).count();
const countAll = await countRows().catch(() => 0);

// INTERACTIVE 1 — a status pill narrows the rooms. All → Live (fewer, >0).
let countLive = countAll;
const livePill = page.getByRole("button", { name: /^Live/ }).first();
if (await livePill.count().then((c) => c > 0).catch(() => false)) {
  await livePill.click().catch(() => {});
  await page.waitForTimeout(400);
  countLive = await countRows().catch(() => countAll);
}
const statusFilterWorks = countAll > 0 && countLive > 0 && countLive < countAll;

// INTERACTIVE 2 — search narrows. Reset to All, type a room fragment → fewer, >0.
let countSearch = countAll;
const allPill = page.getByRole("button", { name: /^All/ }).first();
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const search = page.getByRole("searchbox", { name: /search rooms/i }).first();
if (await search.count().then((c) => c > 0).catch(() => false)) {
  await search.fill("standup");
  await page.waitForTimeout(400);
  countSearch = await countRows().catch(() => countAll);
  await search.fill("");
  await page.waitForTimeout(200);
}
const searchWorks = countSearch > 0 && countSearch < countAll;

// INTERACTIVE 3 — "End" ends a live call (one fewer End button).
let endWorks = false;
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(250); }
const endBefore = await countEnd().catch(() => 0);
const firstEnd = page.getByRole("button", { name: "End", exact: true }).first();
if (endBefore > 0 && (await firstEnd.count().then((c) => c > 0).catch(() => false))) {
  await firstEnd.click().catch(() => {});
  await page.waitForTimeout(400);
  const endAfter = await countEnd().catch(() => endBefore);
  endWorks = endAfter === endBefore - 1;
}

// AVATAR ROW + AUDIO METER — always-visible per-room participants + the active-speaker level meter (fire-297).
if (await allPill.count().then((c) => c > 0).catch(() => false)) { await allPill.click().catch(() => {}); await page.waitForTimeout(300); }
const avatarRows = await page.locator('ul[aria-label$="participants"]').count().catch(() => 0);
const meterImgs = await page.getByRole("img", { name: /audio level \d+ of 100/i }).count().catch(() => 0);
const bodyNow = await page.evaluate(() => document.body.innerText).catch(() => "");
const avatarMeterWorks =
  avatarRows > 0 &&
  meterImgs > 0 &&
  /speaking/i.test(bodyNow) &&
  /(Sam Rivera|Support Agent|Voice Agent|Alice Chen)/.test(bodyNow); // a real active-speaker name

await browser.close();

const realErrors = errors.filter((e) => !/WebSocket is already in (CLOSING|CLOSED)/i.test(e));
console.log(JSON.stringify({ reachable, onPath, renders, missing, countAll, countLive, countSearch, endBefore, statusFilterWorks, searchWorks, endWorks, avatarRows, meterImgs, avatarMeterWorks, presenceLink, consoleErrors: realErrors.length }, null, 2));
if (realErrors.length) console.log("errors:", realErrors.join(" | ").slice(0, 300));

let ok = true;
const check = (c, p, f) => { if (c) console.log(`✅ PASS: ${p}`); else { console.log(`❌ FAIL: ${f}`); ok = false; } };
check(reachable, "Realtime reachable from the sidebar rail", "no Realtime rail link (nav wiring missing)");
check(onPath, "Realtime rail click → /realtime", "rail click did not reach /realtime");
check(renders, "Realtime content renders (stats + status filter + rooms + tracks/bandwidth + honesty label)", `content missing: ${missing.join(", ")}`);
check(statusFilterWorks, `Status filter narrows the rooms (All ${countAll} → Live ${countLive})`, "status pill did not narrow the rooms");
check(searchWorks, `Search narrows the rooms (All ${countAll} → "standup" ${countSearch})`, "search did not narrow the rooms");
check(endWorks, `End ends a live call (End buttons ${endBefore} → ${endBefore - 1})`, "end did not end a room");
check(avatarMeterWorks, `Participant avatar rows + active-speaker audio meter render (${avatarRows} rows, ${meterImgs} meters)`, "no participant avatar row / audio meter");
check(presenceLink, "Cross-link to Presence present (interconnect)", "no Presence cross-link");
check(realErrors.length === 0, "0 console errors on /realtime", `${realErrors.length} console errors`);
console.log(ok ? "✅ REALTIME GREEN" : "❌ realtime check failed");
process.exit(ok ? 0 : 1);
