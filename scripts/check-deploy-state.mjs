#!/usr/bin/env node
/**
 * Compare committed source with the local deployment receipt; never probe production.
 * A mismatch is receipt drift, not proof that HEAD is ahead of production. A matching
 * fork does not establish wrapper identity, per-Worker versions or runtime health.
 * Keep legacy status values and --ci behavior for existing callers: --ci exits 1 on
 * receipt fork mismatch; default mode remains advisory. --json exposes both sources.
 * Use live per-Worker version/source evidence before deciding whether to deploy.
 * Usage: node scripts/check-deploy-state.mjs [--json] [--ci] [--selftest]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const LEDGER = `${ROOT}/.claude/run-the-loop/.last-deploy.json`;
const SUBMODULE = "cloudflare-os";

/**
 * PURE comparison — no git, no fs. Given HEAD's SHAs + the ledger (or null), decide the verdict.
 * Verdict statuses:
 *   "ok"       — fork gitlink matches the local receipt; live source remains unverified.
 *   "drift"    — fork gitlink differs from the local receipt; no ordering is inferred.
 *   "no-ledger"— no deploy ledger yet; deploy-state is unprovable from git alone.
 *   "unknown"  — HEAD fork SHA couldn't be resolved (shouldn't happen in-repo).
 *
 * @param {{ forkSha?: string|null, outerSha?: string|null }} head
 * @param {{ forkSha?: string, outerSha?: string, iso?: string }|null} ledger
 * @returns {{ status: "ok"|"drift"|"no-ledger"|"unknown", forkMatches: boolean, outerMoved: boolean,
 *             head: {forkSha: string|null, outerSha: string|null},
 *             ledger: {forkSha: string|null, outerSha: string|null, iso: string|null},
 *             message: string }}
 */
export function compareDeployState(head, ledger) {
  const headFork = head?.forkSha ?? null;
  const headOuter = head?.outerSha ?? null;
  const ledFork = ledger?.forkSha ?? null;
  const ledOuter = ledger?.outerSha ?? null;
  const ledIso = ledger?.iso ?? null;
  const base = {
    head: { forkSha: headFork, outerSha: headOuter },
    ledger: { forkSha: ledFork, outerSha: ledOuter, iso: ledIso },
  };

  if (!headFork) {
    return { status: "unknown", forkMatches: false, outerMoved: false, ...base,
      message: "could not resolve HEAD's cloudflare-os fork gitlink — cannot assess deploy-state." };
  }
  if (!ledger || !ledFork) {
    return { status: "no-ledger", forkMatches: false, outerMoved: false, ...base,
      message: `no deploy ledger at .last-deploy.json — deploy-state is unprovable from git alone. ` +
        `If this fire's HEAD was committed but you can't confirm \`pnpm deploy\` ran, PROBE PROD ` +
        `before trusting a clean git tree, then run \`node scripts/record-deploy.mjs\` after deploying.` };
  }

  const forkMatches = headFork === ledFork;
  const outerMoved = Boolean(headOuter && ledOuter && headOuter !== ledOuter);

  if (!forkMatches) {
    return { status: "drift", forkMatches, outerMoved, ...base,
      message: `DRIFT: HEAD's fork gitlink ${headFork.slice(0, 8)} != receipt ${ledFork.slice(0, 8)} ` +
        `(ledger ${ledIso ?? "?"}). Receipt mismatch does not establish which source is live. ` +
        `PROBE PROD and correlate per-Worker versions with source before deciding whether to deploy; ` +
        `do not rewrite the receipt or redeploy merely to silence this warning.` };
  }
  // A fork match says nothing about wrapper changes or the current live deployment.
  return { status: "ok", forkMatches, outerMoved, ...base,
    message: `OK: fork gitlink ${headFork.slice(0, 8)} matches the local receipt (ledger ${ledIso ?? "?"}). ` +
      (outerMoved ? `Outer HEAD differs; wrapper/runtime changes may require deployment. ` : "") +
      `Live source identity and runtime health remain unverified; a fork match alone is insufficient.` };

}

/**
 * Warn when the receipt's outer commit is absent from fetched origin/main.
 * This is local ancestry evidence only; it does not identify the live source.
 * @param {string|null|undefined} ledgerOuterSha
 * @param {boolean} reachableFromOrigin
 * @returns {string|null}
 */
export function pushAdvisory(ledgerOuterSha, reachableFromOrigin) {
  if (!ledgerOuterSha || reachableFromOrigin) return null;
  return `receipt OUTER commit ${ledgerOuterSha.slice(0, 8)} is NOT reachable from local origin/main tracking ref — ` +
    `possible unpushed-deploy strand. The tracking ref may be stale; inspect retained commits and publication evidence; ` +
    `this does not prove production runs that commit. In fleet runs the outer runner owns publication.`;
}

/**
 * IMPURE: is `sha` an ancestor of origin/main? Resolves origin/main first; if the remote ref is
 * absent (no fetch) we cannot assess → treat as reachable (no spurious warn). The loop fetches
 * origin/main at orient, so this is live there.
 * @param {string} sha
 * @returns {boolean}
 */
function isAncestorOfOrigin(sha) {
  let originMain;
  try { originMain = execFileSync("git", ["rev-parse", "--verify", "origin/main"], { cwd: ROOT, encoding: "utf8" }).trim(); }
  catch { return true; }
  try { execFileSync("git", ["merge-base", "--is-ancestor", sha, originMain], { cwd: ROOT, stdio: "ignore" }); return true; }
  catch { return false; }
}

function readHead() {
  const g = (args) => {
    try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim(); }
    catch { return null; }
  };
  // Compare the COMMITTED gitlink (`HEAD:cloudflare-os`) with the receipt, rather than
  // inferring live identity. The submodule's floating working HEAD can be a dirty
  // checkout ahead of the gitlink (a separate concern GUARD 4 of check-fire-committed owns).
  return { forkSha: g(["rev-parse", "HEAD:" + SUBMODULE]), outerSha: g(["rev-parse", "HEAD"]) };
}

function readLedger() {
  try { return JSON.parse(readFileSync(LEDGER, "utf8")); }
  catch { return null; }
}

// ── embedded branch tests (also exercised by check-deploy-state.test.ts) ──────────────────────
function selftest() {
  const assert = (cond, label) => { if (!cond) { console.error(`FAIL: ${label}`); process.exit(1); } };
  const F = "a".repeat(40), F2 = "b".repeat(40), O = "c".repeat(40), O2 = "d".repeat(40);

  let v = compareDeployState({ forkSha: F, outerSha: O }, { forkSha: F, outerSha: O, iso: "t" });
  assert(v.status === "ok" && v.forkMatches && !v.outerMoved, "fork+outer match ⇒ ok");

  v = compareDeployState({ forkSha: F, outerSha: O2 }, { forkSha: F, outerSha: O, iso: "t" });
  assert(v.status === "ok" && v.outerMoved, "fork match, outer moved ⇒ ok (advisory)");

  v = compareDeployState({ forkSha: F2, outerSha: O }, { forkSha: F, outerSha: O, iso: "t" });
  assert(v.status === "drift" && !v.forkMatches, "fork mismatch ⇒ drift");

  v = compareDeployState({ forkSha: F, outerSha: O }, null);
  assert(v.status === "no-ledger", "no ledger ⇒ no-ledger");

  v = compareDeployState({ forkSha: F, outerSha: O }, { outerSha: O, iso: "t" });
  assert(v.status === "no-ledger", "ledger without forkSha ⇒ no-ledger");

  v = compareDeployState({ forkSha: null, outerSha: O }, { forkSha: F, outerSha: O, iso: "t" });
  assert(v.status === "unknown", "unresolved HEAD fork ⇒ unknown");

  // pushAdvisory (fire-239) — the unpushed-deployed-commit advisory.
  assert(pushAdvisory(O, true) === null, "pushed deployed commit ⇒ no advisory");
  assert(pushAdvisory(O, false) !== null && pushAdvisory(O, false).includes(O.slice(0, 8)), "unpushed deployed commit ⇒ advisory names the sha");
  assert(pushAdvisory(null, false) === null, "no ledger outer ⇒ no advisory");
  assert(pushAdvisory(undefined, false) === null, "undefined outer ⇒ no advisory");

  console.log("check-deploy-state selftest: 10/10 OK");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) { selftest(); return; }
  const asJson = argv.includes("--json");
  const ci = argv.includes("--ci");

  const verdict = compareDeployState(readHead(), readLedger());

  // Push-state of the DEPLOYED outer commit (impure git ancestry vs origin/main). Advisory only.
  const ledgerOuter = verdict.ledger.outerSha;
  const pushMsg = ledgerOuter ? pushAdvisory(ledgerOuter, isAncestorOfOrigin(ledgerOuter)) : null;

  if (asJson) {
    console.log(JSON.stringify({ ...verdict, pushAdvisory: pushMsg }, null, 2));
  } else {
    const tag = verdict.status === "ok" ? "OK" : verdict.status === "drift" ? "WARN" : "WARN";
    console.log(`[check-deploy-state ${tag}] ${verdict.message}`);
    if (pushMsg) console.log(`[check-deploy-state WARN] ${pushMsg}`);
  }
  // GREEN-by-default: advisory exit 0 unless --ci asked for a hard fail on receipt fork mismatch (the push
  // advisory stays advisory even under --ci — green-by-default, never a permanently-red gate).
  process.exit(ci && verdict.status === "drift" ? 1 : 0);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
