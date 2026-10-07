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
 * THE FIX, HARDENED (fire-237, after a 5th consecutive strand 230->236): `--ledger-file <path>` lets
 * this command WRITE the LEDGER entry too, so the entry-append and the commit are the SAME invocation.
 * fires 230->236 all died AFTER the slow LEDGER Edit but BEFORE the separate commit — that intermediate
 * "entry written, not committed" state no longer exists in the real file when you use --ledger-file
 * (the entry lives in a scratch file until the one atomic call folds it in + commits). Idempotent:
 * a re-run never double-appends, and the file must name the fire (a wrong-fire/junk file is refused).
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
 *   node scripts/commit-fire-bookkeeping.mjs --fire fire-237 --ledger-file /tmp/fire-237-entry.md  # write entry + commit, one call
 *
 * Exit: 0 committed (or nothing-to-commit no-op) · 2 guard failed (no/invalid LEDGER entry) · 1 usage/git error.
 * Idempotent: a second run with the bookkeeping already committed is a clean no-op.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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
 * OPENS with the fire (`## fire-235 — …`, case-insensitive, word-bounded so fire-23 never matches
 * fire-235). The fire number must come IMMEDIATELY after the `#…` marker — NOT anywhere in the line —
 * so a heading for ANOTHER fire that mentions this one in prose (e.g. `## fire-241 — … reconstructed by
 * fire-242 …`) does NOT count as this fire's entry. That mid-line false-match silently dropped the
 * fire-242 append (the entry was written to a scratch file but the guard skipped it); the anchoring
 * closes it. Regression: commit-fire-bookkeeping.test.ts "fire-242 guard".
 */
export function ledgerHasEntry(ledgerText, fireNum) {
  if (!fireNum) return false;
  const re = new RegExp(`^#{1,4}\\s+${fireNum.replace("-", "\\-")}\\b`, "im");
  return re.test(String(ledgerText || ""));
}

/** Parse `--fire`/`--note`/`--ledger-file` flags from argv. Pure. */
export function parseArgs(argv) {
  const out = { fire: null, note: null, ledgerFile: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fire") out.fire = argv[++i];
    else if (argv[i] === "--note") out.note = argv[++i];
    else if (argv[i] === "--ledger-file") out.ledgerFile = argv[++i];
  }
  return out;
}

/**
 * Decide how to fold a fire's LEDGER entry into the current LEDGER text — the pure core of the
 * `--ledger-file` mode (fire-237). This closes the strand window the orient-salvage keeps catching:
 * fires 230->236 all died AFTER writing the LEDGER entry (a slow Edit on the 3000-line file) but
 * BEFORE the separate commit. Letting the commit command WRITE the entry too means reaching the one
 * Bash call completes the record — there is no "entry written but not committed" state in the real file.
 *
 * Validates the entry actually names the fire (so a wrong-fire file or junk can never be appended),
 * and is idempotent: if the LEDGER already carries the entry, it skips (a re-run never double-appends).
 * @param {string} ledgerText current LEDGER.md contents
 * @param {string} entryText the fire's entry to fold in (must contain a `## fire-<n>` heading)
 * @param {string|null} fireNum canonical `fire-<n>` key
 * @returns {{action:'append',text:string}|{action:'skip'}|{action:'error',error:string}}
 */
export function ledgerWithEntry(ledgerText, entryText, fireNum) {
  if (!fireNum) return { action: "error", error: "no fire number" };
  if (!ledgerHasEntry(entryText, fireNum)) {
    return { action: "error", error: `entry text has no '## ${fireNum}' heading — refusing to append` };
  }
  if (ledgerHasEntry(ledgerText, fireNum)) return { action: "skip" };
  const base = String(ledgerText || "").replace(/\s*$/, "");
  const entry = String(entryText).trim();
  return { action: "append", text: `${base}\n\n${entry}\n` };
}

// --- side-effecting entrypoint (skipped when imported by the test) ---
function main() {
  const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

  const { fire, note, ledgerFile } = parseArgs(process.argv.slice(2));
  const fireNum = fireNumber(fire);
  if (!fireNum) {
    process.stderr.write("commit-fire-bookkeeping: pass --fire fire-<n> (e.g. --fire fire-235)\n");
    process.exit(1);
  }

  const ledgerPath = `${ROOT}/.claude/run-the-loop/LEDGER.md`;
  let ledgerText = existsSync(ledgerPath) ? readFileSync(ledgerPath, "utf8") : "";

  // --ledger-file: write the entry AND commit in this one invocation (fire-237). Removes the
  // write-then-commit gap fires 230->236 kept dying in — reaching this single call completes the record.
  if (ledgerFile) {
    if (!existsSync(ledgerFile)) {
      process.stderr.write(`commit-fire-bookkeeping: --ledger-file not found: ${ledgerFile}\n`);
      process.exit(1);
    }
    const entryText = readFileSync(ledgerFile, "utf8");
    const folded = ledgerWithEntry(ledgerText, entryText, fireNum);
    if (folded.action === "error") {
      process.stderr.write(`commit-fire-bookkeeping: REFUSING --ledger-file — ${folded.error}.\n`);
      process.exit(2);
    }
    if (folded.action === "append") {
      writeFileSync(ledgerPath, folded.text);
      ledgerText = folded.text;
      process.stdout.write(`commit-fire-bookkeeping: appended ${fireNum} LEDGER entry from ${ledgerFile}\n`);
    } else {
      process.stdout.write(`commit-fire-bookkeeping: ${fireNum} LEDGER entry already present — not re-appending\n`);
    }
  }

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
