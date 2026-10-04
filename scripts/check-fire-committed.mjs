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
 * SECOND GUARD (fire-147): a PLACEHOLDER-SHA scan of BACKLOG.md. The fire-146 class — a lead
 * dies mid-slice having TICKED a frontier item (`- [x] … fork <this>`) but never filled the
 * real gitlink/commit SHA. A ticked item crediting a phantom `<this>` SHA lies to the next fire
 * exactly like uncommitted work does. Scoped to `- [x]` lines in BACKLOG.md ONLY — the LEDGER's
 * `outer <this>` is a DELIBERATE self-referential convention (the recording commit's own SHA is
 * unknowable at write time), never a lie, so it is NOT scanned.
 *
 * Usage: node scripts/check-fire-committed.mjs [--ci]
 *   Run it last in a fire, before `loop-fire-lock release`.
 */
import { execFileSync, } from "node:child_process";
import { readFileSync } from "node:fs";

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

// GUARD 2 — placeholder-SHA scan of BACKLOG.md ticked items (fire-146 class). A `- [x]` line that
// still carries `fork <…>` / `gitlink <…>` / a bare `<this>` is a ticked deliverable crediting a
// phantom SHA. (LEDGER.md is intentionally NOT scanned — `outer <this>` is an accepted convention.)
const PLACEHOLDER_RE = /(?:fork|gitlink)\s*<[^>]*>|<this>/i;
const placeholders = [];
try {
  const backlog = readFileSync(`${ROOT}/.claude/run-the-loop/BACKLOG.md`, "utf8").split("\n");
  backlog.forEach((line, i) => {
    if (/^\s*-\s*\[x\]/i.test(line) && PLACEHOLDER_RE.test(line)) {
      placeholders.push({ line: i + 1, text: line.trim().slice(0, 120) });
    }
  });
} catch { /* BACKLOG absent — nothing to scan */ }

const out = {
  meta: { repo: ROOT },
  dirty,
  placeholders,
  summary: { dirty: dirty.length, placeholders: placeholders.length, exit: (dirty.length || placeholders.length) && CI ? 1 : 0 },
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");

if (dirty.length) {
  process.stderr.write(`\n⚠️  ${dirty.length} dirty TRACKED file(s) at end of fire — commit or revert before releasing the lease:\n`);
  for (const d of dirty) process.stderr.write(`   ${d.xy}  ${d.path}\n`);
  process.stderr.write(`A fire that ticks the BACKLOG done but leaves work uncommitted lies to the next fire (fire-52 class).\n`);
} else {
  process.stderr.write(`✅ working tree clean on watched surfaces — the fire committed everything it touched.\n`);
}
if (placeholders.length) {
  process.stderr.write(`\n⚠️  ${placeholders.length} ticked BACKLOG item(s) with an UNFILLED placeholder SHA — fill the real fork/commit SHA (fire-146 class):\n`);
  for (const p of placeholders) process.stderr.write(`   L${p.line}  ${p.text}\n`);
} else {
  process.stderr.write(`✅ no placeholder-SHA ticked items in BACKLOG — the fire credited real commits.\n`);
}
process.exit(out.summary.exit);
