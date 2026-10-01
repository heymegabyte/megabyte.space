#!/usr/bin/env node
/**
 * deep-ui-explorer — state-graph walker for both estate surfaces (role §1.17).
 *
 * Models the product as STATES (route · auth context · panel · overlay — never bare
 * URLs) and TRANSITIONS. Every meaningful action gets one settled screenshot plus
 * console-error / failed-request / visible-text capture. The coverage ledger
 * (coverage-ledger.json, committed) is the resumable cursor; run artifacts
 * (screenshots, manifest) stay in gitignored runs/<runId>/.
 *
 * Honest provider contract (OPERATING-PRINCIPLES § Deep UI Explorer):
 *   - cf-browser-rendering (REST /screenshot) = PREFERRED — needs CLOUDFLARE_API_KEY
 *     + CLOUDFLARE_EMAIL + CLOUDFLARE_ACCOUNT_ID (global-key pair, CLAUDE.md § Auth).
 *     BR REST is stateless per-shot: interactive graph walking still runs on the
 *     fallback; BR is used for pristine full-page captures when creds exist.
 *   - local-chromium (playwright) = FALLBACK — always labeled, never reported as BR.
 *   - Missing creds / failed Access handshake / OTP-interactive step = BLOCKED with
 *     the exact prerequisite. Blocked is never passed coverage.
 *
 * Auth contract: apex is PUBLIC. OS legs carry the megabyte-os-e2e service-token
 * headers (CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET — via get-secret, never
 * hardcoded) through extraHTTPHeaders, and MUST see the OS shell (not an Access
 * login page) before any OS state counts as visited.
 *
 * Usage:
 *   node e2e/deep-ui-explorer/explorer.mjs [--surface apex|os|both] [--max-states N]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = join(HERE, "coverage-ledger.json");
const APEX = "https://megabyte.space";
const OS = "https://os.megabyte.space";

const args = parseArgs(process.argv.slice(2));
const SURFACE = args.surface || "both";
const MAX_STATES = Number(args["max-states"]) || 40;

/** Planned state graph — key · entry transition · settle condition. Discovery appends more. */
const APEX_PLAN = [
  { key: "apex.home.hero", breadcrumb: ["/"], action: { type: "goto", url: `${APEX}/` } },
  { key: "apex.home.features", breadcrumb: ["/", "scroll #features"], action: { type: "scrollTo", selector: "#features" } },
  { key: "apex.home.how", breadcrumb: ["/", "scroll #how"], action: { type: "scrollTo", selector: "#how" } },
  { key: "apex.home.trust", breadcrumb: ["/", "scroll #trust"], action: { type: "scrollTo", selector: "#trust" } },
  { key: "apex.home.footer", breadcrumb: ["/", "scroll footer"], action: { type: "scrollTo", selector: "footer" } },
  { key: "apex.login.funnel", breadcrumb: ["/", "click Log in"], action: { type: "clickNav", selector: "a[href='/login']" } },
];
const OS_PLAN = [
  { key: "os.shell.root", breadcrumb: ["os:/"], action: { type: "goto", url: `${OS}/` }, requiresServiceToken: true },
];

main().catch((err) => {
  process.stderr.write(`explorer: fatal ${err?.stack || err}\n`);
  process.exit(2);
});

async function main() {
  const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runDir = join(HERE, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const ledger = readLedger();
  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    surface: SURFACE,
    provider: null,
    sessionId: null,
    states: [],
    blocked: [],
    notes: [],
  };

  const provider = await resolveProvider(manifest);
  if (!provider) {
    persist(ledger, manifest, runDir);
    process.stderr.write("explorer: no provider available — run recorded as BLOCKED\n");
    process.exit(3);
  }

  const plans = [];
  if (SURFACE === "apex" || SURFACE === "both") plans.push(...APEX_PLAN);
  if (SURFACE === "os" || SURFACE === "both") plans.push(...OS_PLAN);

  let visited = 0;
  for (const plan of plans) {
    if (visited >= MAX_STATES) break;
    if (plan.requiresServiceToken && !serviceTokenEnv()) {
      recordBlocked(ledger, manifest, plan, "CF_ACCESS_CLIENT_ID/CF_ACCESS_CLIENT_SECRET not set (get-secret megabyte-os-e2e)");
      continue;
    }
    try {
      const state = await provider.visit(plan, runDir);
      if (plan.requiresServiceToken && state.looksLikeAccessPage) {
        recordBlocked(ledger, manifest, plan, "Access handshake failed — service-token headers did not reach the OS shell");
        continue;
      }
      mergeState(ledger, manifest, { ...state, provider: provider.name });
      visited += 1;
    } catch (err) {
      recordBlocked(ledger, manifest, plan, `visit failed: ${String(err?.message || err).slice(0, 300)}`);
    }
  }

  await provider.close?.();
  manifest.finishedAt = new Date().toISOString();
  persist(ledger, manifest, runDir);
  const errs = manifest.states.filter((s) => s.consoleErrors?.length);
  process.stdout.write(
    `${JSON.stringify({ runId, provider: provider.name, visited, blocked: manifest.blocked.length, statesWithConsoleErrors: errs.map((s) => s.key) }, null, 2)}\n`,
  );
}

/** Prefer CF Browser Rendering for captures when creds exist; walking needs local chromium. */
async function resolveProvider(manifest) {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    manifest.provider = "BLOCKED";
    manifest.notes.push("playwright not installed — `pnpm add -D playwright` (fire-1 devDep)");
    return null;
  }
  const brCreds = process.env.CLOUDFLARE_API_KEY && process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_ACCOUNT_ID;
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: serviceTokenEnv()
      ? { "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID, "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET }
      : {},
  });
  const page = await context.newPage();
  const consoleBuf = [];
  const failedBuf = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") consoleBuf.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on("requestfailed", (r) => failedBuf.push(`${r.method()} ${r.url().slice(0, 200)} — ${r.failure()?.errorText}`));

  manifest.provider = brCreds ? "local-chromium (walk) + cf-browser-rendering (captures available)" : "local-chromium FALLBACK (BR creds absent)";
  manifest.sessionId = `pw-${Date.now()}`;
  if (!brCreds) manifest.notes.push("cf-browser-rendering preferred but CLOUDFLARE_API_KEY/EMAIL/ACCOUNT_ID absent — fallback labeled honestly");

  return {
    name: manifest.provider,
    async visit(plan, runDir) {
      consoleBuf.length = 0;
      failedBuf.length = 0;
      const prevUrl = page.url();
      await performAction(page, plan.action);
      await settle(page);
      const shotPath = join(runDir, `${plan.key}.png`);
      await page.screenshot({ path: shotPath });
      const text = (await page.evaluate(() => document.body?.innerText || "")).replace(/\s+/g, " ").slice(0, 400);
      const title = await page.title();
      const url = page.url();
      const looksLikeAccessPage = /cloudflareaccess\.com/.test(url) || /Cloudflare Access/i.test(title);
      return {
        key: plan.key,
        breadcrumb: plan.breadcrumb,
        prevState: prevUrl === "about:blank" ? null : prevUrl,
        url,
        title,
        looksLikeAccessPage,
        consoleErrors: [...consoleBuf],
        failedRequests: [...failedBuf],
        visibleTextSample: text,
        screenshot: shotPath,
        visitedAt: new Date().toISOString(),
      };
    },
    async close() {
      await browser.close();
    },
  };
}

async function performAction(page, action) {
  switch (action.type) {
    case "goto":
      await page.goto(action.url, { waitUntil: "domcontentloaded" });
      return;
    case "scrollTo":
      await page.locator(action.selector).first().scrollIntoViewIfNeeded();
      return;
    case "clickNav":
      await Promise.all([page.waitForLoadState("domcontentloaded"), page.locator(action.selector).first().click()]);
      return;
    default:
      throw new Error(`unknown action type ${action.type}`);
  }
}

/** Settled = network quiet + two animation frames (never a blind timeout). */
async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

function serviceTokenEnv() {
  return Boolean(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET);
}

function readLedger() {
  if (!existsSync(LEDGER_PATH)) return { $doc: "deep-ui-explorer coverage ledger — resumable cursor (states, not URLs)", states: {} };
  return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
}

function mergeState(ledger, manifest, state) {
  manifest.states.push(state);
  const prior = ledger.states[state.key] || { firstVisited: state.visitedAt, visits: 0 };
  ledger.states[state.key] = {
    ...prior,
    status: "visited",
    breadcrumb: state.breadcrumb,
    lastVisited: state.visitedAt,
    visits: (prior.visits || 0) + 1,
    lastProvider: state.provider,
    lastConsoleErrors: state.consoleErrors.length,
    lastRun: manifest.runId,
  };
}

function recordBlocked(ledger, manifest, plan, prerequisite) {
  manifest.blocked.push({ key: plan.key, prerequisite });
  const prior = ledger.states[plan.key] || {};
  ledger.states[plan.key] = { ...prior, status: "blocked", breadcrumb: plan.breadcrumb, prerequisite, lastRun: manifest.runId };
}

function persist(ledger, manifest, runDir) {
  writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
  writeFileSync(join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
  }
  return flags;
}
