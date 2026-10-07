#!/usr/bin/env node
/**
 * record-deploy — stamp the deploy-state ledger (fire-221).
 *
 * THE LOOP RUNS THIS IMMEDIATELY AFTER A SUCCESSFUL `pnpm deploy`. It records which SHAs are
 * actually live so the next lead can mechanically tell "committed AND deployed" from "committed
 * but NOT deployed" — the gap `check-fire-committed.mjs` (git-state only) cannot see.
 *
 * WHY A LEDGER (not a prod build-id probe): prod exposes no deployed-SHA signal. The apex's
 * anonymous HTML is the router's inlined login gate (painted pre-SPA, zero asset refs); the vite
 * build injects no `define`'d SHA; no `x-version` header. Mapping the authed SPA's hashed asset
 * names back to a fork SHA needs a session + a build manifest and is confounded by rebase churn.
 * So the cheapest RELIABLE signal is: the deploy step itself records what it shipped.
 *
 * Writes `.claude/run-the-loop/.last-deploy.json`:
 *   { forkSha, outerSha, iso }
 * - forkSha  = the cloudflare-os fork gitlink that was deployed (what actually ships to prod)
 * - outerSha = the superproject HEAD at deploy time
 * - iso      = when (a plain Date().toISOString() in a plain node script — NOT a workflow event)
 *
 * Usage:
 *   node scripts/record-deploy.mjs            # stamp HEAD's SHAs, iso = now
 *   node scripts/record-deploy.mjs <iso>      # override the timestamp (e.g. replaying a known deploy)
 *
 * Idempotent: re-running after the same deploy rewrites the same SHAs. Commit the resulting
 * .last-deploy.json alongside the fire's slice so the ledger travels with git.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const LEDGER = `${ROOT}/.claude/run-the-loop/.last-deploy.json`;
const SUBMODULE = "cloudflare-os";

function sha(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

const isoArg = process.argv[2];
const iso = isoArg && isoArg !== "--" ? isoArg : new Date().toISOString();

// The COMMITTED gitlink (`HEAD:cloudflare-os`) is what `pnpm deploy` builds + ships — NOT the
// submodule's floating working-tree HEAD, which can be a dirty checkout ahead of the gitlink.
let forkSha = "";
try {
  forkSha = sha(["rev-parse", "HEAD:" + SUBMODULE]);
} catch {
  process.stderr.write(`record-deploy: cannot resolve the committed ${SUBMODULE} gitlink (HEAD:${SUBMODULE})\n`);
  process.exit(1);
}
const outerSha = sha(["rev-parse", "HEAD"]);

const record = { forkSha, outerSha, iso };
writeFileSync(LEDGER, JSON.stringify(record, null, 2) + "\n");
process.stdout.write(`recorded deploy → fork ${forkSha.slice(0, 8)} · outer ${outerSha.slice(0, 8)} · ${iso}\n`);
