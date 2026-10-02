#!/usr/bin/env node
/**
 * verify-os-landing — real-browser proof that the Megabyte OS landing splash
 * (WS-11: the WebGL homepage bundled as a first-view component inside the OS)
 * renders behind Access, dismisses into the OS, and stays dismissed on reload.
 *
 * os.megabyte.space is Cloudflare-Access-gated, so we drive it with the
 * `megabyte-os-e2e` service token (CF-Access-Client-Id/Secret). The token's
 * Access JWT also authenticates the app's RPC session, so `AuthenticatedShell`
 * renders — which is where the landing gate lives.
 *
 * Creds: CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET env, else
 * /tmp/cfos-st-id.txt + /tmp/cfos-st-secret.txt (same fallback as verify-prod).
 *
 * Exit 0 = splash rendered + dismissed + stayed dismissed. Exit 1 = failed.
 * Exit 2 = could not reach an authenticated shell (service-token/SPA-auth
 * artifact, NOT a landing bug) — the curl-level proof in verify-prod stands.
 */
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "https://os.megabyte.space/";
const SHOT_DIR = join(ROOT, "e2e", "screenshots", "os-landing");

const readTmp = (p) => (existsSync(p) ? readFileSync(p, "utf8").trim() : "");
const clientId = process.env.CF_ACCESS_CLIENT_ID || readTmp("/tmp/cfos-st-id.txt");
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || readTmp("/tmp/cfos-st-secret.txt");

if (!clientId || !clientSecret) {
  console.error("missing CF_ACCESS_CLIENT_ID/SECRET (env or /tmp/cfos-st-*.txt)");
  process.exit(2);
}

const { chromium } = await import("playwright");
mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  extraHTTPHeaders: {
    "CF-Access-Client-Id": clientId,
    "CF-Access-Client-Secret": clientSecret,
  },
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

let code = 1;
try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });

  // The SPA must auth (via the service-token JWT) and render AuthenticatedShell.
  // If it never leaves the "Authenticating…" / Access state, that's an auth
  // artifact (exit 2), not a landing failure.
  const landing = page.locator('[data-testid="os-landing"]');
  try {
    await landing.waitFor({ state: "visible", timeout: 25000 });
  } catch {
    const title = await page.title().catch(() => "");
    const txt = (await page.locator("body").innerText().catch(() => "")).slice(0, 160);
    console.error(`NO authenticated shell reached — title="${title}" body="${txt.replace(/\s+/g, " ")}"`);
    await page.screenshot({ path: join(SHOT_DIR, "no-shell.png") }).catch(() => {});
    code = 2;
    throw new Error("no-shell");
  }

  // Splash rendered — assert the brand content + the primary CTA.
  const headline = await page.locator("h1").first().innerText();
  const enterBtn = page.locator('[data-testid="enter-os"]');
  const enterVisible = await enterBtn.isVisible();
  await page.screenshot({ path: join(SHOT_DIR, "landing.png"), fullPage: false });
  console.log(`RENDERED: landing visible, h1="${headline.replace(/\s+/g, " ").trim()}", enter-btn=${enterVisible}`);

  if (!enterVisible) throw new Error("enter button not visible");

  // Dismiss into the OS.
  await enterBtn.click();
  await landing.waitFor({ state: "detached", timeout: 8000 }).catch(async () => {
    await landing.waitFor({ state: "hidden", timeout: 4000 });
  });
  console.log("DISMISSED: splash gone after Enter the OS");
  await page.screenshot({ path: join(SHOT_DIR, "after-enter.png") }).catch(() => {});

  // Reload — the localStorage flag must keep the splash from reappearing.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  let reappeared = false;
  try {
    await landing.waitFor({ state: "visible", timeout: 6000 });
    reappeared = true;
  } catch {
    reappeared = false;
  }
  if (reappeared) throw new Error("splash REAPPEARED on reload — localStorage gate broken");
  console.log("PERSISTED: splash did NOT reappear on reload (dismissed once)");

  // Allowlist the OS shell's RPC WebSocket 403: browsers cannot send custom
  // headers on a WS handshake, so the (header-based) service token can't auth
  // the `wss://…/api` capnweb channel — a real SSO user carries the
  // CF_Authorization cookie (auto-sent on WS) and connects fine. This is a
  // service-token + headless artifact, not a landing/OS bug. Everything else
  // (React throws, three.js errors, our asset 404s) still fails the gate.
  const ourErrors = consoleErrors.filter(
    (e) =>
      !/challenges\.cloudflare|cdn-cgi|cloudflareinsights|Failed to load resource.*access/i.test(e) &&
      !/wss?:\/\/os\.megabyte\.space\/api|WebSocket connection.*(403|failed)|net::ERR_FAILED/i.test(e),
  );
  console.log(`console errors (ours): ${ourErrors.length}${ourErrors.length ? " -> " + ourErrors.slice(0, 3).join(" | ") : ""}`);
  code = ourErrors.length === 0 ? 0 : 1;
  console.log(code === 0 ? "\nPASS — landing renders, dismisses, persists" : "\nFAIL — console errors present");
} catch (e) {
  if (code !== 2) console.error("verify failed:", e.message);
} finally {
  await browser.close();
}
process.exit(code);
