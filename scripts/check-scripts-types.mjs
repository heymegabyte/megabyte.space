#!/usr/bin/env node
// check-scripts-types.mjs — STATIC GATE (fire-236): `scripts/` type-checks clean.
//
// WHY this exists: scripts/ (the loop's own tooling — deploy, verify-*, the fire lock, the
// backlog-frontier extractor + their *.test.ts) is type-checked ONLY by `pnpm types:scripts`
// (tsc -p scripts/tsconfig.json), which `pnpm lint` runs. But the LOOP's standard gates —
// `pnpm check` (submodule + interconnect + deploy dry-run) and green-sweep (prod verifiers) —
// never ran a scripts typecheck. So a RED types:scripts could (and did, fires ~230-235) hide for
// several fires while the loop kept shipping: `backlog-frontier.test.ts` + `loop-fire-lock.test.ts`
// drifted RED (untyped .mjs exports inferred as `never`/required-params) and no gate noticed.
//
// This wraps that typecheck as a fast, secret-free, node-only static gate (no pnpm needed) so it
// can sit in `pnpm check` (per-fire convergence) AND green-sweep's static preamble (the coherence
// gate). A RED scripts typecheck now fails a gate the loop actually runs — the RED can't hide.
//
// Exit 0 + "SCRIPTS-TYPES GREEN" on a clean typecheck; prints tsc's errors + exit 1 otherwise.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TSC = join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc");
const TSCONFIG = join("scripts", "tsconfig.json");

if (!existsSync(TSC)) {
  console.log(`❌ SCRIPTS-TYPES — typescript not installed at ${TSC} (run the dependency install first)`);
  process.exit(1);
}

const res = spawnSync(process.execPath, [TSC, "-p", TSCONFIG], { cwd: REPO_ROOT, encoding: "utf8" });
const out = `${res.stdout || ""}${res.stderr || ""}`.trim();

if (res.status === 0) {
  console.log("✅ SCRIPTS-TYPES GREEN — scripts/ type-checks clean (tsc -p scripts/tsconfig.json)");
  process.exit(0);
}

console.log("❌ SCRIPTS-TYPES RED — scripts/ typecheck failed:");
if (out) console.log(out);
process.exit(1);
