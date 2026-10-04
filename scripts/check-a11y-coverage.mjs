#!/usr/bin/env node
/**
 * DRIFT GATE (fire-151, §8 loop-improvement) — every navigable STATIC route in the fork must be in
 * verify-a11y.mjs's audited surface list. Retires a recurring shortcoming: a new route shipped WITHOUT
 * being added to the a11y sweep ships latent (esp. light-theme) violations unaudited — it bit
 * /providers (fire-103), /profile (fire-117), /analytics (fire-146), /activity (fire-147), and
 * /database + /customers (fire-148/149, caught retroactively fire-150). verify-a11y's own fire-117
 * COVERAGE NOTE said "cross-check ls src/routes/*.tsx by hand" — this makes that check DETERMINISTIC.
 *
 * Pure static analysis (no browser, no creds, fast) → safe for the green-sweep preamble + pre-deploy.
 * Source of truth = the fork's TanStack file-based routes; the audited set = the paths quoted in
 * verify-a11y.mjs. Dynamic ($param) + __root routes are excluded BY RULE (can't be audited by a
 * static path; /workspace/$id is covered via click-nav inside verify-a11y).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES_DIR = join(ROOT, "cloudflare-os/packages/workshop-frontend/src/routes");
const A11Y = join(ROOT, "scripts/verify-a11y.mjs");

if (!existsSync(ROUTES_DIR)) {
  console.log(`❌ FAIL: routes dir not found: ${ROUTES_DIR} (fork layout changed — update this gate)`);
  process.exit(1);
}
if (!existsSync(A11Y)) {
  console.log(`❌ FAIL: verify-a11y.mjs not found: ${A11Y}`);
  process.exit(1);
}

// Derive the auditable static path for each route file (null = excluded by rule).
function routeToPath(file) {
  const name = file.replace(/\.tsx$/, "");
  if (name === "__root") return null; // layout, not a route
  if (name.includes("$")) return null; // dynamic ($param) — no static path
  if (name === "index") return "/";
  // TanStack flat routes: dots are path separators; a trailing `_` is a layout-escape marker.
  return "/" + name.replace(/\./g, "/").replace(/_$/, "");
}

const routeFiles = readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".tsx"));
const staticRoutes = routeFiles
  .map((f) => ({ file: f, path: routeToPath(f) }))
  .filter((r) => r.path !== null);

// Audited paths = every single-quoted string starting with "/" in verify-a11y.mjs, reduced to its
// first whitespace token (so '/signin (anon)' → '/signin'). Backtick template-literals (`${APEX}…`)
// are intentionally NOT matched — only the literal surface list counts.
const a11ySrc = readFileSync(A11Y, "utf8");
const audited = new Set(
  [...a11ySrc.matchAll(/'(\/[^']*)'/g)].map((m) => m[1].split(/\s/)[0]),
);

const uncovered = staticRoutes.filter((r) => !audited.has(r.path));
// Stale entries: audited paths with no matching route file (WARN, not fail — may be anon/dynamic).
const routePathSet = new Set(staticRoutes.map((r) => r.path));
const DYNAMIC_OK = new Set(["/workspace/$id", "/workspace"]); // editor audited via click-nav ('/workspace (editor)' label), not a static entry
const stale = [...audited].filter(
  (p) => !routePathSet.has(p) && !DYNAMIC_OK.has(p) && p !== "/signin" && p !== "/signup",
);

console.log(
  JSON.stringify(
    {
      routeFiles: routeFiles.length,
      staticRoutes: staticRoutes.length,
      audited: audited.size,
      uncovered: uncovered.map((r) => `${r.path} (${r.file})`),
      stale,
    },
    null,
    2,
  ),
);

if (uncovered.length) {
  console.log(
    `\n❌ FAIL: ${uncovered.length} static route(s) NOT in verify-a11y.mjs — add them to its surface list THIS fire:`,
  );
  for (const r of uncovered) console.log(`   ↳ ${r.path}  (from ${r.file})`);
  console.log("   (a green a11y sweep that doesn't LIST a route proves nothing about it.)");
  process.exit(1);
}
if (stale.length) console.log(`\n⚠️  WARN: audited path(s) with no route file (verify intentional): ${stale.join(", ")}`);
console.log(`\n✅ A11Y-COVERAGE GREEN: all ${staticRoutes.length} static routes are in verify-a11y.mjs`);
process.exit(0);
