#!/usr/bin/env node
/**
 * verify-os — the single OS ship gate (counterpart to verify-apex.mjs). POST-FLIP (fire-64), the
 * Cloudflare OS lives AT THE APEX (megabyte.space); os.megabyte.space is detached (→ 000). So this
 * aggregator runs the two apex/Better-Auth verifiers in sequence and fails if ANY fails:
 *   - verify-prod   — the apex serves the OS + auth-on-action (anon→/signin, authed→shell) + SSO +
 *                     the BA rail + www→apex + security headers.
 *   - verify-ba-flip — the auth-on-action proof end to end (anon nav → /signin, allowlisted BA
 *                     sign-in → session cookie, authed nav → OS shell passthrough).
 * The retired os.-theme / os.-landing sub-calls were dropped — they targeted the dead os. subdomain.
 *
 * Needs the BA e2e creds in the environment (exported from get-secret; child verifiers inherit it):
 *   export BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD)
 *
 * Run after `pnpm deploy` (allow ~15s for the router's hashed-asset propagation).
 *
 * Usage: node scripts/verify-os.mjs
 * Exit 0 = all gates green. Exit 1 = ≥1 gate failed (named in the summary).
 * Exit 2 = BA creds missing (a child exited 2 — not an OS bug).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATES = [
  ["verify-prod", "verify-prod.mjs"], // apex serves OS + auth-on-action + SSO + BA rail + headers
  ["verify-ba-flip", "verify-ba-flip.mjs"], // auth-on-action proof end to end
];

const results = [];
for (const [name, file] of GATES) {
  console.log(`\n━━━ ${name} ━━━`);
  const r = spawnSync("node", [join(ROOT, "scripts", file)], { stdio: "inherit" });
  // Exit 2 = creds missing (not a prod/OS failure) — propagate it as a distinct "skipped" signal.
  results.push({ name, ok: r.status === 0, credsMissing: r.status === 2 });
}

console.log("\n━━━ OS gate summary ━━━");
for (const r of results) {
  const glyph = r.ok ? "✅" : r.credsMissing ? "⚠️ " : "❌";
  console.log(`  ${glyph} ${r.name}${r.credsMissing ? " (BA creds missing — export BA_E2E_EMAIL/PASSWORD)" : ""}`);
}
const credsMissing = results.some((r) => r.credsMissing);
const failed = results.filter((r) => !r.ok && !r.credsMissing);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} gates green`);
if (credsMissing) process.exit(2);
process.exit(failed.length ? 1 : 0);
