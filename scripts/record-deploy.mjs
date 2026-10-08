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
 *   { forkSha, outerSha, iso, fire?, note? }
 * - forkSha  = the cloudflare-os fork gitlink that was deployed (what actually ships to prod)
 * - outerSha = the superproject HEAD at deploy time
 * - iso      = when (a plain Date().toISOString() in a plain node script — NOT a workflow event)
 * - fire     = the fire slug that deployed, auto-read from the lease (fire-263). SELF-DOCUMENTS a
 *              stranded record: the deploy-record strand (fires 224/225, 259/260, 262/263) leaves
 *              EXACTLY this file dirty, and without a fire tag the salvager must reverse-engineer
 *              the commit msg to learn what shipped. The tag lets check-fire-committed name it.
 * - note     = optional one-line slice description (`--note "/search depth"`) for the same reason.
 *
 * Usage:
 *   node scripts/record-deploy.mjs                      # stamp HEAD's SHAs, iso = now, fire from lease
 *   node scripts/record-deploy.mjs <iso>                # override the timestamp (replaying a known deploy)
 *   node scripts/record-deploy.mjs --note "<slice>"     # tag the slice that shipped
 *   node scripts/record-deploy.mjs --fire <slug>        # override the fire slug (else read from lease)
 *
 * Idempotent: re-running after the same deploy rewrites the same SHAs. Commit the resulting
 * .last-deploy.json alongside the fire's slice so the ledger travels with git.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const LEDGER = `${ROOT}/.claude/run-the-loop/.last-deploy.json`;
const LEASE = `${ROOT}/.claude/run-the-loop/.fire-lease.json`;
const SUBMODULE = "cloudflare-os";

function sha(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

// Flag-aware arg parse (backward-compatible: the first bare arg is still the iso override).
// `--note`/`--fire` each consume the following token as their VALUE, so that value is excluded
// from the positional scan — otherwise `--note "/search depth"` would be misread as the iso.
const argv = process.argv.slice(2);
const consumed = new Set();
function flag(name) {
  const i = argv.indexOf(name);
  if (i >= 0 && i + 1 < argv.length) {
    consumed.add(i);
    consumed.add(i + 1);
    return argv[i + 1];
  }
  if (i >= 0) consumed.add(i);
  return null;
}
const noteArg = flag("--note");
const fireArg = flag("--fire");
const isoArg = argv.find((a, i) => !consumed.has(i) && !a.startsWith("--") && a !== "--");
const iso = isoArg || new Date().toISOString();

// Auto-read the fire slug from the lease (fail-soft) so a stranded record self-identifies its fire.
function leaseFire() {
  if (fireArg) return fireArg;
  try {
    return JSON.parse(readFileSync(LEASE, "utf8")).fire || null;
  } catch {
    return null;
  }
}
const fire = leaseFire();

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

const record = { forkSha, outerSha, iso, ...(fire ? { fire } : {}), ...(noteArg ? { note: noteArg } : {}) };
writeFileSync(LEDGER, JSON.stringify(record, null, 2) + "\n");
const tag = fire ? ` · ${fire}` : "";
process.stdout.write(`recorded deploy → fork ${forkSha.slice(0, 8)} · outer ${outerSha.slice(0, 8)} · ${iso}${tag}\n`);
