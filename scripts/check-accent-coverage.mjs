#!/usr/bin/env node
/**
 * DRIFT GATE (fire-245, §8 loop-improvement) — every Operate surface that renders the shared
 * surfaceAccent row-border (a route calling `accentBorder(...)`) MUST carry a PROD regression net
 * asserting those borders render live: its `verify-<route>.mjs` importing the shared
 * `countAccentBorders` helper (scripts/lib/accent-borders.mjs).
 *
 * THE CLASS IT RETIRES — "a visual mapping shipped without a prod net". fire-243/244 shipped the
 * surfaceAccent left-border across Logs/Domains/Queues with the per-status mapping unit-tested but NOT
 * prod-asserted — so a Tailwind content-purge or a class rename could silently blank every attention
 * border and no gate would catch it (unit tests assert the string the code RETURNS, never that it
 * survives the build to the live DOM). fire-245 extended the accent to Compute/Secrets/Storage AND
 * added the net to all six; this gate makes the net NON-OPTIONAL: the next surface that calls
 * accentBorder() cannot ship without its verifier assertion. Sibling of check-a11y-coverage (every
 * route in verify-a11y) + check-gate-coverage (every check-*.mjs wired) — a drift gate over the loop's
 * own tooling.
 *
 * Pure static analysis (no browser, no creds, fast) → safe for the `pnpm check` interconnect chain.
 * Source of truth = the route files under workshop-frontend that call accentBorder(); each maps by
 * convention to scripts/verify-<basename>.mjs, which must import the shared countAccentBorders net.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES = join(ROOT, "cloudflare-os/packages/workshop-frontend/src/routes");
const SCRIPTS = join(ROOT, "scripts");

// Surfaces whose accent prod net lives OUTSIDE a verify-<route>.mjs (none today). A DOCUMENTED escape
// with a reason — never a silent skip. Keyed by route basename.
const ALLOWLIST = {};

const routeFiles = existsSync(ROUTES) ? readdirSync(ROUTES).filter((f) => f.endsWith(".tsx")) : [];

// A route "uses the accent" when it CALLS accentBorder( — an import alone (unused) does not render a border.
const usingAccent = routeFiles.filter((f) => /\baccentBorder\s*\(/.test(readFileSync(join(ROUTES, f), "utf8")));

const missing = [];
for (const f of usingAccent) {
  const name = basename(f, ".tsx");
  if (ALLOWLIST[name]) continue;
  const verifier = join(SCRIPTS, `verify-${name}.mjs`);
  if (!existsSync(verifier)) {
    missing.push({ route: name, reason: `no scripts/verify-${name}.mjs (a surfaceAccent surface needs a prod net)` });
    continue;
  }
  if (!/countAccentBorders/.test(readFileSync(verifier, "utf8"))) {
    missing.push({ route: name, reason: `verify-${name}.mjs does not assert accent borders (import + call countAccentBorders)` });
  }
}

console.log(
  JSON.stringify(
    { accentRoutes: usingAccent.map((f) => basename(f, ".tsx")), covered: usingAccent.length - missing.length, missing },
    null,
    2,
  ),
);
if (missing.length) {
  console.log(`❌ check-accent-coverage: ${missing.length} surfaceAccent surface(s) without a prod regression net`);
  for (const m of missing) console.log(`   • /${m.route} — ${m.reason}`);
  process.exit(1);
}
console.log(`✅ check-accent-coverage: all ${usingAccent.length} surfaceAccent route(s) carry a prod regression net`);
process.exit(0);
