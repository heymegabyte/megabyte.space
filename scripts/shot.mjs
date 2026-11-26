#!/usr/bin/env node
/**
 * shot.mjs — capture a settled screenshot of any authed OS route (or the public apex) for a vision pass.
 *
 * Usage:  BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD) \
 *           node scripts/shot.mjs <route> [--out <path>] [--light] [--clip x,y,w,h | --full] [--wait <ms>]
 * Example: node scripts/shot.mjs /analytics --clip 300,0,980,540
 *          node scripts/shot.mjs /database --full --out scripts/.database-proof.png
 *
 * Why: the UX/Visual (§1.5) + Deep-UI-Explorer (§1.17) roles capture a settled screenshot of a surface
 * every fire for the Beautify-10x vision verdict. Before this, each pass hand-rolled a one-off
 * playwright+BA-login script (and a copy under /tmp can't even resolve `playwright`, so it broke —
 * fire-274). This folds the PROVEN login contract (input[type=email]/password + data-testid=auth-submit
 * + the auth-success/auth-already marker — the SAME path every verify-*.mjs uses) into one reusable
 * helper, so a vision pass is a single command instead of a fresh throwaway script. (fire-274 §8.)
 */
import { chromium } from "playwright";

const APEX = process.env.APEX || "https://megabyte.space";
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const route = argv.find((a) => a.startsWith("/")) || "/";
const light = argv.includes("--light");
const full = argv.includes("--full");
const waitMs = Number(flag("--wait") || 1500);
const out =
  flag("--out") ||
  `scripts/.shot${route === "/" ? "-root" : route.replace(/\//g, "-")}${light ? "-light" : ""}.png`;
const clipStr = flag("--clip");
const clip = clipStr
  ? (([x, y, width, height]) => ({ x, y, width, height }))(clipStr.split(",").map(Number))
  : undefined;

const EMAIL = process.env.BA_E2E_EMAIL,
  PASSWORD = process.env.BA_E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.log("missing BA creds — export BA_E2E_EMAIL/BA_E2E_PASSWORD via get-secret");
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  locale: "en-US", // deterministic toLocaleString for value snapshots
  colorScheme: light ? "light" : "dark",
});
await page.addInitScript(() => {
  try {
    localStorage.setItem("megabyteOS_entered", "1");
  } catch {}
});

// Log in through the inlined router gate — the SAME contract every verify-*.mjs uses.
await page.goto(`${APEX}/signin`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('[data-testid="auth-submit"]');
await page
  .waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 })
  .catch(() => {});

await page.goto(`${APEX}${route}`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("aside", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(waitMs);
await page.screenshot({ path: out, ...(full ? { fullPage: true } : clip ? { clip } : {}) });
await browser.close();
console.log(
  `shot → ${out}  (${route}, ${light ? "light" : "dark"}${clip ? `, clip ${clipStr}` : full ? ", fullPage" : ""})`,
);
