#!/usr/bin/env node
/**
 * verify-apex — the single apex ship gate. Runs the three apex verifiers in
 * sequence and fails if ANY fails, so a future fire runs one command after an
 * apex deploy instead of remembering three. Wires verify-reduced-motion into the
 * standard flow (fire-39 next-wave item) — a blank-under-reduced-motion
 * regression can no longer slip past because someone forgot to run it.
 *
 * Run after `pnpm --dir packages/home deploy` (allow ~15s for hashed-asset
 * propagation first, per the deploy-lag gotcha).
 *
 * Usage: node scripts/verify-apex.mjs
 * Exit 0 = all gates green. Exit 1 = ≥1 gate failed (named in the summary).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATES = [
  ["verify-prod", "verify-prod.mjs"],
  ["verify-apex-journey", "verify-apex-journey.mjs"],
  ["verify-reduced-motion", "verify-reduced-motion.mjs"],
];

const results = [];
for (const [name, file] of GATES) {
  console.log(`\n━━━ ${name} ━━━`);
  const r = spawnSync("node", [join(ROOT, "scripts", file)], { stdio: "inherit" });
  results.push({ name, ok: r.status === 0 });
}

console.log("\n━━━ apex gate summary ━━━");
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} gates green`);
process.exit(failed.length ? 1 : 0);
