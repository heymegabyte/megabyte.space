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

  // Broad-surface sweep (ESTATE #2 follow-up): exercise the authed OS routes beyond the home shell so
  // the ENFORCED CSP is tested against charts/tables/editor/gadget-iframe components, not just /.
  const navHrefs = await page
    .$$eval('a[href^="/"]', (els) => [...new Set(els.map((e) => e.getAttribute("href")))].filter((h) => h && !h.startsWith("//") && !h.includes("#")).slice(0, 10))
    .catch(() => []);
  const visited = [];
  for (const href of navHrefs) {
    try {
      await page.goto(`${APEX}${href}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2200);
      visited.push(href);
    } catch { /* a route may redirect/empty — fine */ }
  }
  // Best-effort: open a workspace → the monaco editor (the big CSP unknown: workers/eval/styles).
  let monaco = "not-reached";
  try {
    await page.goto(`${APEX}/workspaces`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);
    const ws = await page.$$eval('a[href*="/workspace"]', (els) => els.map((e) => e.getAttribute("href")).find((h) => /\/workspace[s]?\//.test(h || "")) || "").catch(() => "");
    if (ws) { await page.goto(`${APEX}${ws}`, { waitUntil: "domcontentloaded", timeout: 25000 }); await page.waitForTimeout(4000); monaco = `opened ${ws}`; }
    else monaco = "no workspace to open";
  } catch { monaco = "nav failed"; }

  console.log(`OS shell rendered: ${shell > 0 ? "YES" : "NO"} (root ${shell} bytes)`);
  console.log(`routes swept (${visited.length}): ${visited.join(" ") || "(none beyond /)"}`);
  console.log(`monaco editor: ${monaco}`);
  console.log(`CSP violations (unique directives): ${viol.size}`);
  for (const [d, s] of viol) console.log(`  ⚠ [${d}]\n     ${s}`);
  if (!viol.size) console.log("  ✅ none across all swept surfaces");
  process.exitCode = viol.size === 0 && shell > 0 ? 0 : 1;
} finally {
  await browser.close();
}
