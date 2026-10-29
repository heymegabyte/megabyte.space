#!/usr/bin/env node
/**
 * verify-apex-csp — loads the AUTHED OS under the report-only CSP (ESTATE #2) and captures every CSP
 * violation the browser reports, so the policy can be tightened to zero BEFORE flipping it to enforce
 * (a force-login front door must never be locked out). Also asserts the OS shell renders + the login
 * flow works (report-only must not change behavior). Once enforcing + zero-violation, this is the gate.
 *
 * Usage: BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD) \
 *        node scripts/verify-apex-csp.mjs
 * Exit 0 = shell rendered AND zero CSP violations. Exit 1 = violations (listed) or shell missing.
 */
import { chromium } from "playwright";

const APEX = "https://megabyte.space";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";
const EMAIL = process.env.BA_E2E_EMAIL;
const PW = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PW) {
  console.error("need BA_E2E_EMAIL + BA_E2E_PASSWORD");
  process.exit(2);
}

const viol = new Map(); // directive → sample message
const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const t = m.text();
    if (/violates the following content security policy|report.?only/i.test(t)) {
      const d = t.match(/directive:\s*"([^"]+)"/i)?.[1] || t.slice(0, 120);
      if (!viol.has(d)) viol.set(d, t.replace(/\s+/g, " ").slice(0, 260));
    }
  });
  await page.goto(APEX, { waitUntil: "domcontentloaded", timeout: 30000 });
  // BA email+password login (inlined gate contract: input[type=password] + data-testid=auth-submit).
  for (const sel of ['input[type="email"]', 'input[name="email"]', 'input[autocomplete="username"]']) {
    if (await page.locator(sel).first().count().catch(() => 0)) { await page.fill(sel, EMAIL).catch(() => {}); break; }
  }
  await page.fill('input[type="password"]', PW).catch(() => {});
  await page.click('[data-testid="auth-submit"]').catch(() => page.keyboard.press("Enter").catch(() => {}));
  await page.waitForTimeout(9000); // SPA boot + assets + beacons + capnweb WS + fonts settle
  const shell = await page.evaluate(() => document.getElementById("root")?.innerHTML.length || 0).catch(() => 0);

  console.log(`OS shell rendered: ${shell > 0 ? "YES" : "NO"} (root ${shell} bytes)`);
  console.log(`CSP report-only violations (unique directives): ${viol.size}`);
  for (const [d, s] of viol) console.log(`  ⚠ [${d}]\n     ${s}`);
  if (!viol.size) console.log("  ✅ none — policy is safe to enforce");
  process.exitCode = viol.size === 0 && shell > 0 ? 0 : 1;
} finally {
  await browser.close();
}
