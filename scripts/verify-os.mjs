#!/usr/bin/env node
/**
 * verify-os — the single OS ship gate (counterpart to verify-apex.mjs). Runs the
 * OS-relevant verifiers in sequence and fails if ANY fails, so a fork/OS fire
 * runs one command after `pnpm deploy` instead of remembering three.
 *
 * Needs the megabyte-os-e2e service token in the environment (or /tmp fallback):
 *   export CF_ACCESS_CLIENT_ID=$(get-secret CF_ACCESS_CLIENT_ID) \
 *          CF_ACCESS_CLIENT_SECRET=$(get-secret CF_ACCESS_CLIENT_SECRET)
 * The child verifiers inherit this env (and also read /tmp/cfos-st-*.txt).
 *
 * Run after `pnpm deploy` (allow ~15s for the router's hashed-asset propagation).
 *
 * Usage: node scripts/verify-os.mjs
 * Exit 0 = all gates green. Exit 1 = ≥1 gate failed (named in the summary).
 * Exit 2 = verify-os-landing hit the service-token WS/SPA-auth artifact (not an
 *          OS bug — the curl-level proof in verify-prod still stands).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATES = [
  ["verify-prod", "verify-prod.mjs"], // apex + OS service-token shell (#4) + headers
  ["verify-os-theme", "verify-os-theme.mjs"], // dark black/cyan shell live
  ["verify-os-landing", "verify-os-landing.mjs"], // landing render→dismiss→persist
];

const results = [];
for (const [name, file] of GATES) {
  console.log(`\n━━━ ${name} ━━━`);
  const r = spawnSync("node", [join(ROOT, "scripts", file)], { stdio: "inherit" });
  // verify-os-landing exit 2 = known service-token/headless artifact, not a failure.
  const artifact = name === "verify-os-landing" && r.status === 2;
  results.push({ name, ok: r.status === 0 || artifact, artifact });
}

console.log("\n━━━ OS gate summary ━━━");
for (const r of results) console.log(`  ${r.ok ? (r.artifact ? "⚠️ " : "✅") : "❌"} ${r.name}${r.artifact ? " (service-token WS artifact — curl proof stands)" : ""}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} gates green`);
process.exit(failed.length ? 1 : 0);
