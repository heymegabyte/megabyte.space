#!/usr/bin/env node
/**
 * record-deploy — stamp the deploy-state ledger (fire-221) + optionally publish origin the instant
 * prod goes live (fire-266 `--push`).
 *
 * THE LOOP RUNS THIS IMMEDIATELY AFTER A SUCCESSFUL `pnpm deploy` (the `deploy` npm script is
 * literally `node scripts/deploy.ts && node scripts/record-deploy.mjs`). It records which SHAs are
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
 *              stranded record: the deploy-record strand (fires 224/225, 259/260, 262/263, 264/265)
 *              leaves EXACTLY this file dirty, and without a fire tag the salvager must reverse-
 *              engineer the commit msg to learn what shipped. The tag lets check-fire-committed name it.
 * - note     = optional one-line slice description (`--note "/search depth"`) for the same reason.
 *
 * `--push` (fire-266): after stamping, fail-soft `git push origin main` + fork `git push origin
 * megabyte-os`. WHY HERE: the committed code + gitlink that `pnpm deploy` just shipped ALREADY exist
 * at this point, and record-deploy runs ONE step after the deploy — so publishing here shrinks the
 * "prod runs a commit absent from origin" window (the fire-238 unpushed-outer strand, which recurred
 * at fires 238 + 264/265) from the many death-prone steps between deploy and §11 down to a single
 * step. Fail-soft by design: a push failure (offline, a non-fast-forward race with a concurrent
 * shared-tree fire) is logged and NON-FATAL — the deploy already succeeded, and §11's push
 * (rebase-if-rejected) remains the backstop. The `.last-deploy.json` write itself is uncommitted, so
 * the push publishes only the already-committed HEAD; the record still travels with git in §11.
 *
 * `--commit` (fire-269): after stamping, commit ONLY `.last-deploy.json` as its own tiny
 * `chore(loop): deploy-record <fire>` commit — fail-soft, idempotent, pathspec-limited (never `git
 * add -A`). WHY: the record WRITE was uncommitted (deferred to §11's bookkeeping commit), so a fire
 * dying between `pnpm deploy` and §11 left EXACTLY this file dirty — the deploy-record-only strand
 * that recurred at fires 224/225, 259/260, 262, 264/265, 268 (each cost the next fire a salvage).
 * `--commit` closes that window to ZERO: the record is committed in the SAME invocation that writes
 * it, one step after deploy — the record-file analog of what `--push` did for the unpushed-code
 * window. The `deploy` npm script runs `--commit --push` (commit the record, then publish it). A
 * commit failure is logged + NON-FATAL (the deploy already succeeded; §11 remains the backstop).
 *
 * Usage:
 *   node scripts/record-deploy.mjs                      # stamp HEAD's SHAs, iso = now, fire from lease
 *   node scripts/record-deploy.mjs <iso>                # override the timestamp (replaying a known deploy)
 *   node scripts/record-deploy.mjs --note "<slice>"     # tag the slice that shipped
 *   node scripts/record-deploy.mjs --fire <slug>        # override the fire slug (else read from lease)
 *   node scripts/record-deploy.mjs --commit             # commit the record as its own tiny commit (fail-soft)
 *   node scripts/record-deploy.mjs --push               # also publish origin/main + fork (fail-soft)
 *
 * Idempotent: re-running after the same deploy rewrites the same SHAs; `--commit` then no-ops
 * (nothing dirty). Without `--commit`, commit the resulting .last-deploy.json alongside the fire's
 * §11 bookkeeping so the ledger still travels with git.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const LEDGER_REL = ".claude/run-the-loop/.last-deploy.json"; // repo-relative; the commit pathspec (cwd=ROOT)
const LEDGER = `${ROOT}/${LEDGER_REL}`;
const LEASE = `${ROOT}/.claude/run-the-loop/.fire-lease.json`;
const SUBMODULE = "cloudflare-os";

function sha(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

// Flag-aware arg parse (backward-compatible: the first bare arg is still the iso override).
// `--note`/`--fire` each consume the following token as their VALUE, so that value is excluded
// from the positional scan — otherwise `--note "/search depth"` would be misread as the iso.
// `--push` is a bare boolean (consumes only itself). Pure + exported so the test needs no process.
export function parseArgs(argv) {
  const consumed = new Set();
  function value(name) {
    const i = argv.indexOf(name);
    if (i >= 0 && i + 1 < argv.length) {
      consumed.add(i);
      consumed.add(i + 1);
      return argv[i + 1];
    }
    if (i >= 0) consumed.add(i);
    return null;
  }
  function bool(name) {
    const i = argv.indexOf(name);
    if (i >= 0) consumed.add(i);
    return i >= 0;
  }
  const noteArg = value("--note");
  const fireArg = value("--fire");
  const push = bool("--push");
  const commit = bool("--commit");
  const isoArg = argv.find((a, i) => !consumed.has(i) && !a.startsWith("--") && a !== "--") || null;
  return { iso: isoArg, noteArg, fireArg, push, commit };
}

// Auto-read the fire slug from the lease (fail-soft) so a stranded record self-identifies its fire.
function leaseFire(fireArg) {
  if (fireArg) return fireArg;
  try {
    return JSON.parse(readFileSync(LEASE, "utf8")).fire || null;
  } catch {
    return null;
  }
}

function defaultExec(args, cwd) {
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
}

// Publish the already-committed HEAD + fork so prod never runs a commit absent from origin. Each
// push is INDEPENDENTLY fail-soft: one failing (e.g. fork up-to-date is a success; a non-ff race is
// a soft fail) never aborts the other, and NEITHER ever throws. Returns a per-target verdict for the
// caller to log + the test to assert. `exec` is injected so the test can simulate failure offline.
export function pushMain(exec = defaultExec) {
  const targets = [
    { label: "origin/main", args: ["push", "origin", "main"], cwd: ROOT },
    { label: "fork megabyte-os", args: ["push", "origin", "megabyte-os"], cwd: `${ROOT}/${SUBMODULE}` },
  ];
  return targets.map(({ label, args, cwd }) => {
    try {
      exec(args, cwd);
      return { label, pushed: true };
    } catch (e) {
      return { label, pushed: false, detail: String((e && e.message) || e).split("\n")[0] };
    }
  });
}

// Is the record file dirty in the working tree? (porcelain over ONLY the record path.) Injected into
// commitRecord so the test needs no real git. Reads real git by default.
function defaultIsDirty() {
  try {
    const out = execFileSync("git", ["status", "--porcelain", "--", LEDGER_REL], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return out.trim().length > 0;
  } catch {
    return false; // can't tell → treat as clean so a broken git never forces a bogus commit
  }
}

// Commit ONLY the deploy record as its own tiny `chore(loop): deploy-record <fire>` commit the instant
// it is written — one step after `pnpm deploy`. WHY: the record write (writeFileSync below) was deferred
// to §11's bookkeeping commit, and a fire dying in between left EXACTLY .last-deploy.json dirty — the
// "deploy-record-only strand" that recurred at fires 224/225, 259/260, 262, 264/265, 268 (five+ fires
// each burned salvaging it). `--commit` closes that window to ZERO: the record is committed in the SAME
// invocation that writes it, exactly as `--push` (fire-266) closed the unpushed-code window. Fail-soft
// (a commit failure NEVER aborts the deploy that already succeeded) · idempotent (an unchanged record is
// a no-op) · stages ONLY the record path via a pathspec-limited commit (never `git add -A`, never sweeps a
// concurrent shared-tree fire's edits). `exec`/`isDirty` injected so the test asserts the staged path +
// simulates failure with no real git.
export function commitRecord(fire, { exec = defaultExec, isDirty = defaultIsDirty } = {}) {
  if (!isDirty()) return { committed: false, reason: "unchanged" };
  try {
    exec(["add", "--", LEDGER_REL], ROOT);
    exec(["commit", "-m", `chore(loop): deploy-record${fire ? ` ${fire}` : ""}`, "--", LEDGER_REL], ROOT);
    return { committed: true, fire: fire || null };
  } catch (e) {
    return { committed: false, detail: String((e && e.message) || e).split("\n")[0] };
  }
}

export function main(argv) {
  const { iso: isoArg, noteArg, fireArg, push, commit } = parseArgs(argv);
  const iso = isoArg || new Date().toISOString();
  const fire = leaseFire(fireArg);

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

  // Commit the record FIRST (so a later --push publishes it) — closes the deploy-record-strand window.
  if (commit) {
    const r = commitRecord(fire);
    process.stdout.write(
      r.committed
        ? `committed deploy-record (${fire || "untagged"})\n`
        : `deploy-record commit skipped: ${r.reason || r.detail}\n`,
    );
  }

  if (push) {
    for (const r of pushMain()) {
      process.stdout.write(
        r.pushed ? `pushed ${r.label}\n` : `⚠️  push ${r.label} failed (non-fatal): ${r.detail}\n`,
      );
    }
  }
}

// Execute only when invoked directly — importing (the test) gets the pure helpers with NO side effects.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
