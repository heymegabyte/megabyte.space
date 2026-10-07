#!/usr/bin/env node
/**
 * DRIFT GATE (fire-241, §8 loop-improvement) — every pass/fail static gate under `scripts/check-*.mjs`
 * must be WIRED into a runner (green-sweep.mjs `CHECKS`, or the package.json "check*" script chain), or
 * be on the explicit ALLOWLIST of intentionally-standalone orient/§11/discovery tools.
 *
 * THE CLASS IT RETIRES — the "orphaned gate": a `check-*.mjs` written + committed but referenced by NO
 * runner only ever runs if a human remembers to type it, so it protects nothing. This gate found its own
 * motivating case on its FIRST run: `check-stale-copy.mjs` (the fire-3 "Authentik SSO" copy-regression
 * gate) had been orphaned from creation — never in green-sweep, never in `pnpm check` — until fire-241
 * wired it. It is the sibling of `check-a11y-coverage` (every route in verify-a11y) and
 * `check-ledger-current` (every feat/fix cited in LEDGER): a drift gate over the loop's OWN tooling.
 *
 * Pure static analysis (no browser, no creds, fast) → safe for the green-sweep preamble + pre-deploy.
 * Source of truth = `ls scripts/check-*.mjs`; the wired set = basenames that appear in green-sweep.mjs
 * OR package.json. A gate that is neither wired nor allowlisted FAILs (exit 1). The allowlist is
 * explicit + reasoned, so registering a standalone tool is a deliberate one-line act, never a silent
 * escape — and a gate that is BOTH wired AND allowlisted FAILs too (the reason has rotted into a lie).
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(ROOT, "scripts");

// Intentionally-standalone gates: orient-phase / §11 / discovery tools that are NOT build-time
// pass/fail sweep gates. Each MUST carry a reason — a bare name cannot escape.
const ALLOWLIST = {
  "check-deploy-state.mjs":
    "orient advisory (exit 0 always — the prod-ahead-of-HEAD WARN); run at §0, never a pass/fail sweep gate",
  "check-depth-candidates.mjs":
    "discovery classifier (the DEPTH-target menu for the next fire) — informational, not pass/fail",
  "check-fire-committed.mjs":
    "orient + §11 tree-clean salvage guard — run at those phases, not a build-time sweep gate",
};

const gates = readdirSync(SCRIPTS)
  .filter((f) => /^check-.*\.mjs$/.test(f))
  .sort();

// A gate counts as WIRED if its basename appears in any runner's source (a green-sweep CHECKS tuple or
// a package.json "check*" command). Substring match is sufficient — basenames are unique + distinctive.
const runnerSrc = [
  readFileSync(join(SCRIPTS, "green-sweep.mjs"), "utf8"),
  readFileSync(join(ROOT, "package.json"), "utf8"),
].join("\n");

const wired = [];
const allowlisted = [];
const orphaned = [];
const contradictions = [];
for (const g of gates) {
  const isWired = runnerSrc.includes(g);
  const isAllowed = Object.prototype.hasOwnProperty.call(ALLOWLIST, g);
  if (isWired && isAllowed) contradictions.push(g);
  else if (isWired) wired.push(g);
  else if (isAllowed) allowlisted.push(g);
  else orphaned.push(g);
}

console.log(
  JSON.stringify(
    { gates: gates.length, wired: wired.length, allowlisted, orphaned, contradictions },
    null,
    2,
  ),
);

if (orphaned.length) {
  console.log(
    `\n❌ FAIL: ${orphaned.length} orphaned gate(s) — a check-*.mjs referenced by NO runner (green-sweep.mjs / package.json) and not allowlisted:`,
  );
  for (const g of orphaned)
    console.log(
      `   ↳ ${g}  — wire it into green-sweep.mjs CHECKS (or package.json "check"), or add it to ALLOWLIST with a reason THIS fire.`,
    );
  console.log(
    "   (a gate no runner invokes protects nothing — exactly the fire-3 check-stale-copy orphan this gate retires.)",
  );
  process.exit(1);
}
if (contradictions.length) {
  console.log(
    `\n❌ FAIL: ${contradictions.length} gate(s) are BOTH wired AND allowlisted — the allowlist reason is now a lie; remove them from ALLOWLIST: ${contradictions.join(", ")}`,
  );
  process.exit(1);
}
console.log(
  `\n✅ GATE-COVERAGE GREEN: all ${gates.length} check-*.mjs gates are wired into a runner or allowlisted (${wired.length} wired, ${allowlisted.length} standalone).`,
);
process.exit(0);
