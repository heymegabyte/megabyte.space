#!/usr/bin/env node
/**
 * commit-fire-bookkeeping — atomically commit a fire's §11 bookkeeping (fire-235).
 *
 * WHY THIS EXISTS: four consecutive fires (230->231, 232->233, 233->234, 234->235) shipped their
 * slice + deployed fine but DIED during the §11 tail — the multi-step manual sequence (append
 * LEDGER.md · write modifier-matrix.json · tick BACKLOG.md · `git add` each · `git commit`). A
 * headless `claude -p` run that runs out of budget mid-tail strands the bookkeeping, so the NEXT
 * fire burns itself salvaging it instead of advancing the frontier. Worse, the split is uneven:
 * fire-234 committed the matrix (f6964556) but stranded the LEDGER entry — ticked work with no
 * durable record of it.
 *
 * THE FIX: collapse the tail to ONE command that stages the canonical bookkeeping paths and commits
 * them TOGETHER, and REFUSE to commit unless LEDGER.md already carries an entry for the fire. That
 * single guard makes the fire-52/234 class impossible: you cannot land a matrix/backlog tick without
 * the matching LEDGER entry. Fewer tail tool-calls + enforced atomicity = a far smaller death window.
 *
 * Canonical bookkeeping paths (and ONLY these — this never sweeps source/scripts; the slice's code
 * is a separate `feat` commit):
 *   .claude/run-the-loop/LEDGER.md        (mandatory — the fire's durable record)
 *   .claude/modifier-matrix.json          (beautify tracker, if touched)
 *   .claude/run-the-loop/.last-deploy.json(deploy-state ledger, if touched)
 *   .claude/run-the-loop/BACKLOG.md       (frontier ticks, if touched)
 *
 * Usage:
 *   node scripts/commit-fire-bookkeeping.mjs --fire fire-235 [--note "<what shipped>"]
 *   node scripts/commit-fire-bookkeeping.mjs --fire fire-235-salvage-rotate   # slug ok; keys on fire-<n>
 *
 * Exit: 0 committed (or nothing-to-commit no-op) · 2 guard failed (no LEDGER entry) · 1 usage/git error.
 * Idempotent: a second run with the bookkeeping already committed is a clean no-op.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export const CANONICAL_PATHS = [
  ".claude/run-the-loop/LEDGER.md",
  ".claude/modifier-matrix.json",
  ".claude/run-the-loop/.last-deploy.json",
  ".claude/run-the-loop/BACKLOG.md",
];

/** Extract the canonical `fire-<n>` key from any fire slug/string (e.g. "fire-235-salvage" -> "fire-235"). */
export function fireNumber(slug) {
  const m = String(slug || "").match(/fire-(\d+)/i);
  return m ? `fire-${m[1]}` : null;
}

/**
 * Does the LEDGER text carry an entry heading for this fire? Matches a markdown heading line that
 * names the fire (`## fire-235 — …`, case-insensitive, word-bounded so fire-23 never matches fire-235).
 */
export function ledgerHasEntry(ledgerText, fireNum) {
  if (!fireNum) return false;
  const re = new RegExp(`^#{1,4}\\s+.*\\b${fireNum.replace("-", "\\-")}\\b`, "im");
  return re.test(String(ledgerText || ""));
}

/** Parse `--fire`/`--note` flags from argv. Pure. */
export function parseArgs(argv) {
  const out = { fire: null, note: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fire") out.fire = argv[++i];
    else if (argv[i] === "--note") out.note = argv[++i];
  }
  return out;
}

// --- side-effecting entrypoint (skipped when imported by the test) ---
function main() {
  const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

  const { fire, note } = parseArgs(process.argv.slice(2));
  const fireNum = fireNumber(fire);
  if (!fireNum) {
    process.stderr.write("commit-fire-bookkeeping: pass --fire fire-<n> (e.g. --fire fire-235)\n");
    process.exit(1);
  }

  const ledgerPath = `${ROOT}/.claude/run-the-loop/LEDGER.md`;
  const ledgerText = existsSync(ledgerPath) ? readFileSync(ledgerPath, "utf8") : "";
  if (!ledgerHasEntry(ledgerText, fireNum)) {
    process.stderr.write(
      `commit-fire-bookkeeping: REFUSING — LEDGER.md has no entry for ${fireNum}.\n` +
        `Write the fire's LEDGER entry FIRST (a '## ${fireNum} — …' heading), then re-run. This guard is\n` +
        `what stops a fire ticking the BACKLOG/matrix without a durable record (the fire-52/234 strand class).\n`,
    );
    process.exit(2);
  }

  // Stage ONLY the canonical paths that exist AND have staged-or-unstaged changes. Never a blanket add.
  const staged = [];
  for (const rel of CANONICAL_PATHS) {
    if (!existsSync(`${ROOT}/${rel}`)) continue;
    const dirty = git(["status", "--porcelain", "--", rel]) !== "";
    if (dirty) {
      git(["add", "--", rel]);
      staged.push(rel);
    }
  }

  if (staged.length === 0) {
    process.stdout.write(`commit-fire-bookkeeping: nothing to commit — ${fireNum} bookkeeping already clean.\n`);
    process.exit(0);
  }

  const msg = `chore(loop): ${fireNum} §11 bookkeeping${note ? ` — ${note}` : ""}`;
  git(["commit", "-q", "-m", msg]);
  const sha = git(["rev-parse", "--short", "HEAD"]);
  process.stdout.write(`committed ${fireNum} bookkeeping → ${sha} · ${staged.join(" · ")}\n`);
}

// Only run when executed directly (not when imported by the test).
if (process.argv[1] && process.argv[1].endsWith("commit-fire-bookkeeping.mjs")) main();
