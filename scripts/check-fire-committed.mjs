#!/usr/bin/env node
/**
 * check-fire-committed — end-of-fire salvage guard (fire-53).
 *
 * THE CLASS IT RETIRES: fire-52's lead died mid-`verify` having edited
 * `packages/auth/src/auth.ts` (cross-subdomain cookies) + ticked the BACKLOG to DONE,
 * but NEVER committed either — the BACKLOG on disk claimed a commit (`auth cd943d94`)
 * that never reached main. fire-53 had to salvage it by hand. A fire that MARKS work done
 * but leaves it in the working tree is lying to the next fire.
 *
 * THE GUARD: at §11 (right before releasing the fire lease), the working tree must have NO
 * dirty TRACKED files under the source + canonical-home surfaces. Untracked files (??) are
 * allowed — screenshots, scratch captures, generated wrangler.prod.jsonc are expected noise.
 * Ground truth is `git status --porcelain`; no deploy-id / rebased-fork confound (unlike a
 * SHA-resolution check — see the deleted check-ledger-shas.mjs, 2026-10-03).
 *
 * Advisory by default (exit 0 + warn). `--ci` exits 1 on any dirty tracked file.
 *
 * Usage: node scripts/check-fire-committed.mjs [--ci]
 *   Run it last in a fire, before `loop-fire-lock release`.
 */
import { execFileSync } from "node:child_process";

const CI = process.argv.includes("--ci");
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

// Surfaces a fire is expected to COMMIT (not leave dirty). Dirty files elsewhere are ignored —
// this guard is about "did the fire land the work it touched", not general repo hygiene.
const WATCHED = [/^packages\//, /^scripts\//, /^deployment\.jsonc$/, /^\.claude\/run-the-loop\//, /^\.claude\/modifier-matrix\.json$/, /^docs\//, /^CLAUDE\.md$/];

let porcelain = "";
try {
  porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  process.stderr.write(`git status failed: ${e.message}\n`);
  process.exit(CI ? 1 : 0);
}

// Each line: "XY <path>" — XY is the two-char status. "??" = untracked (allowed). Anything else
// with a non-space in X or Y is a tracked change that should have been committed.
const dirty = [];
for (const line of porcelain.split("\n")) {
  if (!line.trim()) continue;
  const xy = line.slice(0, 2);
  const path = line.slice(3).replace(/^"|"$/g, "");
  if (xy === "??") continue; // untracked — allowed
  if (WATCHED.some((re) => re.test(path))) dirty.push({ xy, path });
}

const out = {
  meta: { repo: ROOT },
  dirty,
  summary: { dirty: dirty.length, exit: dirty.length && CI ? 1 : 0 },
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");

if (dirty.length) {
  process.stderr.write(`\n⚠️  ${dirty.length} dirty TRACKED file(s) at end of fire — commit or revert before releasing the lease:\n`);
  for (const d of dirty) process.stderr.write(`   ${d.xy}  ${d.path}\n`);
  process.stderr.write(`A fire that ticks the BACKLOG done but leaves work uncommitted lies to the next fire (fire-52 class).\n`);
} else {
  process.stderr.write(`✅ working tree clean on watched surfaces — the fire committed everything it touched.\n`);
}
process.exit(out.summary.exit);
