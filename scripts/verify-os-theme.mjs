#!/usr/bin/env node
/**
 * verify-os-theme — proof the Megabyte OS shell renders the estate BLACK+CYAN
 * Kumo theme (WS-1), not the upstream light/violet+orange palette.
 *
 * os.megabyte.space is Access-gated → driven with the `megabyte-os-e2e` service
 * token. We skip the landing splash (localStorage flag) so the Kumo-themed shell
 * surface renders, then assert the default mode is dark + the body background is
 * near-black. The full data-shell needs a real SSO session (service-token RPC
 * WebSocket 403s — browsers can't send the token on a WS handshake), so this
 * verifies the reachable Kumo surface + the computed theme tokens.
 *
 * Exit 0 = dark + near-black bg. Exit 1 = still light/off-brand. Exit 2 = no shell.
 */
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "https://os.megabyte.space/";
const SHOT_DIR = join(ROOT, "e2e", "screenshots", "os-theme");
const readTmp = (p) => (existsSync(p) ? readFileSync(p, "utf8").trim() : "");
const clientId = process.env.CF_ACCESS_CLIENT_ID || readTmp("/tmp/cfos-st-id.txt");
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || readTmp("/tmp/cfos-st-secret.txt");
if (!clientId || !clientSecret) {
  console.error("missing CF_ACCESS_CLIENT_ID/SECRET");
  process.exit(2);
}

const { chromium } = await import("playwright");
mkdirSync(SHOT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  extraHTTPHeaders: { "CF-Access-Client-Id": clientId, "CF-Access-Client-Secret": clientSecret },
});
// Skip the landing splash so the Kumo shell surface renders; DO NOT set a theme
// pref — we are testing that the DEFAULT is now dark.
await context.addInitScript(() => {
  try { localStorage.setItem("megabyteOS_entered", "1"); } catch {}
});
const page = await context.newPage();

let code = 1;
try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Give the app a beat to apply the theme + render a Kumo surface.
  await page.waitForTimeout(4500);

  const probe = await page.evaluate(() => {
    const mode = document.documentElement.getAttribute("data-mode");
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
    const sum = (m[0] || 0) + (m[1] || 0) + (m[2] || 0);
    const hasContent = (document.getElementById("root")?.innerHTML.length || 0) > 0;
    return { mode, bg, sum, hasContent };
  });
  console.log(`data-mode=${probe.mode}  body-bg=${probe.bg}  rgbSum=${probe.sum}  rootHasContent=${probe.hasContent}`);
  await page.screenshot({ path: join(SHOT_DIR, "shell.png"), fullPage: false });

  if (!probe.hasContent) { code = 2; throw new Error("no shell content rendered"); }
  const isDark = probe.mode === "dark";
  const isNearBlack = probe.sum < 90; // #060610 = 28; anything light is >600
  if (isDark && isNearBlack) {
    code = 0;
    console.log("\nPASS — OS shell default mode is dark + body background is near-black (black/cyan theme live)");
  } else {
    console.log(`\nFAIL — expected dark + near-black; got mode=${probe.mode}, rgbSum=${probe.sum}`);
  }
} catch (e) {
  if (code !== 2) console.error("verify failed:", e.message);
} finally {
  await browser.close();
}
process.exit(code);
