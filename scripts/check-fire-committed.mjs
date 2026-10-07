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
 * THIRD GUARD (fire-148): SUBMODULE SYNC. The PID-205 / fire-147 stranding class — a fire commits
 * INSIDE the cloudflare-os fork but dies before (a) bumping the superproject gitlink, or (b) pushing
 * the submodule commit to origin. Result: prod/git drift + the gitlink pointing at an unreachable
 * (unpushed) SHA. GUARD 1 MISSES it: `cloudflare-os` (the gitlink) is NOT in WATCHED, so a dirty
 * ` M cloudflare-os` slips through — which is EXACTLY how PID 205's a11y commit stranded (fire-148
 * had to salvage it). This guard closes the gap: the fork pointer must be committed AND the
 * submodule HEAD must be reachable from the pushed fork branch (origin/megabyte-os).
 *
 * FOURTH GUARD (fire-164): FORK WORKING-TREE DIRT. This repo sets `diff.ignoreSubmodules=dirty`, so the
 * parent `git status` (GUARD 1 + GUARD 3's gitlink check) is BLIND to UNCOMMITTED changes INSIDE the
 * cloudflare-os fork working tree — it surfaces the fork only on a committed-HEAD/gitlink mismatch, never
 * on a dirty working file. That blindness is EXACTLY how fire-164's Audit-panel feature
 * (`ResourcesPanel.tsx`, edited + DEPLOYED but never committed to the fork) slipped past fire-165's
 * partial salvage: GUARD 3 caught the unpushed COMMITS but nothing saw the uncommitted WORKING-TREE file,
 * leaving prod ahead of git on the fork + the committed journey-editor (expects the Audit panel)
 * incoherent with the committed fork source (no Audit panel). This guard queries the fork DIRECTLY (its
 * own porcelain, unaffected by the parent's ignore setting) + flags dirty TRACKED files (untracked ?? =
 * allowed, same policy as GUARD 1 — generated wrangler.prod.jsonc etc.).
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

// GUARD 3 — SUBMODULE SYNC (fire-148). The cloudflare-os fork pointer must be committed (no dirty
// gitlink) AND the submodule's checked-out HEAD must be pushed (reachable from origin/megabyte-os).
const SUBMODULE = "cloudflare-os";
const submoduleIssues = [];
try {
  const gitlinkStatus = execFileSync("git", ["status", "--porcelain", "--", SUBMODULE], { cwd: ROOT, encoding: "utf8" }).trim();
  if (gitlinkStatus) {
    submoduleIssues.push(`gitlink uncommitted ('${gitlinkStatus}') — commit the ${SUBMODULE} pointer bump (fork advanced without a superproject commit)`);
  }
  const subHead = execFileSync("git", ["-C", SUBMODULE, "rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  let pushed = false;
  try {
    execFileSync("git", ["-C", SUBMODULE, "merge-base", "--is-ancestor", subHead, "origin/megabyte-os"], { cwd: ROOT });
    pushed = true;
  } catch { /* non-zero = not an ancestor = unpushed */ }
  if (!pushed) {
    submoduleIssues.push(`submodule HEAD ${subHead.slice(0, 8)} NOT pushed to origin/megabyte-os — push the fork (the gitlink points at an unreachable SHA)`);
  }
} catch { /* submodule absent or git error — not a stranding signal, skip quietly */ }

// GUARD 4 — FORK WORKING-TREE DIRT (fire-164). Query the fork's OWN porcelain directly; the parent's
// `diff.ignoreSubmodules=dirty` can't suppress it. Dirty TRACKED fork files = a feature edited/deployed
// but never committed to the fork (prod-ahead-of-git). Untracked (??) inside the fork is allowed.
const forkDirty = [];
try {
  const forkPorcelain = execFileSync("git", ["-C", SUBMODULE, "status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  for (const line of forkPorcelain.split("\n")) {
    if (!line.trim()) continue;
    const xy = line.slice(0, 2);
    if (xy === "??") continue; // untracked inside the fork — allowed (generated/scratch)
    forkDirty.push({ xy, path: line.slice(3).replace(/^"|"$/g, "") });
  }
} catch { /* submodule absent or git error — skip quietly */ }

const out = {
  meta: { repo: ROOT },
  dirty,
  placeholders,
  submoduleIssues,
  forkDirty,
  summary: { dirty: dirty.length, placeholders: placeholders.length, submoduleIssues: submoduleIssues.length, forkDirty: forkDirty.length, exit: (dirty.length || placeholders.length || submoduleIssues.length || forkDirty.length) && CI ? 1 : 0 },
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");

if (dirty.length) {
  process.stderr.write(`\n⚠️  ${dirty.length} dirty TRACKED file(s) at end of fire — commit or revert before releasing the lease:\n`);
  for (const d of dirty) process.stderr.write(`   ${d.xy}  ${d.path}\n`);
  process.stderr.write(`A fire that ticks the BACKLOG done but leaves work uncommitted lies to the next fire (fire-52 class).\n`);
  // HINT (fire-225): the deploy-record-only strand. A fire that deployed + ran record-deploy but died
  // before committing leaves EXACTLY one dirty watched file — the deploy ledger. A salvaging lead
  // otherwise has to cross-reference the commit msg + the .last-deploy diff + check-deploy-state to
  // conclude "prod is live, just commit it." Classify it here so the gate says it outright.
  const DEPLOY_RECORD = ".claude/run-the-loop/.last-deploy.json";
  if (dirty.length === 1 && dirty[0].path === DEPLOY_RECORD) {
    process.stderr.write(`ℹ️  deploy-record-only strand (fire-224/225 class): the SOLE dirty file is the deploy ledger — a fire deployed + ran record-deploy but died before committing it. If 'node scripts/check-deploy-state.mjs' reads OK, prod already reflects HEAD → just COMMIT the record (NO rebuild/redeploy), per prod-ahead-of-git-salvage.\n`);
  }
} else {
  process.stderr.write(`✅ working tree clean on watched surfaces — the fire committed everything it touched.\n`);
}
if (placeholders.length) {
  process.stderr.write(`\n⚠️  ${placeholders.length} ticked BACKLOG item(s) with an UNFILLED placeholder SHA — fill the real fork/commit SHA (fire-146 class):\n`);
  for (const p of placeholders) process.stderr.write(`   L${p.line}  ${p.text}\n`);
} else {
  process.stderr.write(`✅ no placeholder-SHA ticked items in BACKLOG — the fire credited real commits.\n`);
}
if (submoduleIssues.length) {
  process.stderr.write(`\n⚠️  ${submoduleIssues.length} ${SUBMODULE} submodule-sync issue(s) — the PID-205/fire-147 stranding class; resolve before releasing the lease:\n`);
  for (const s of submoduleIssues) process.stderr.write(`   ${s}\n`);
} else {
  process.stderr.write(`✅ ${SUBMODULE} fork synced — gitlink committed + submodule HEAD pushed to origin.\n`);
}
if (forkDirty.length) {
  process.stderr.write(`\n⚠️  ${forkDirty.length} dirty TRACKED file(s) INSIDE the ${SUBMODULE} fork — commit them to the fork + bump the gitlink before releasing the lease (fire-164 class — invisible to the parent's diff.ignoreSubmodules=dirty):\n`);
  for (const f of forkDirty) process.stderr.write(`   ${f.xy}  ${SUBMODULE}/${f.path}\n`);
  process.stderr.write(`A deployed-but-uncommitted fork file leaves prod ahead of git (the gitlink points at source without the change).\n`);
} else {
  process.stderr.write(`✅ ${SUBMODULE} fork working tree clean — no deployed-but-uncommitted fork changes.\n`);
}
process.exit(out.summary.exit);
