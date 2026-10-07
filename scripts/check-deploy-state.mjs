#!/usr/bin/env node
/**
 * check-deploy-state — "is prod AHEAD of HEAD?" salvage guard (fire-221).
 *
 * THE CLASS IT RETIRES: a fire commits its slice + bumps the cloudflare-os fork gitlink + pushes,
 * then DIES before `pnpm deploy` runs. `check-fire-committed.mjs` is GIT-STATE ONLY — it reads
 * CLEAN in that case (everything IS committed), so the next lead cannot mechanically tell
 * "committed AND deployed" from "committed but NOT deployed to prod." fire-220 hit exactly this:
 * HEAD was committed + pushed but the deploy may not have run; the salvage needed a manual prod
 * probe. This gate makes that mechanical at orient.
 *
 * THE SIGNAL — a deploy ledger (`.claude/run-the-loop/.last-deploy.json`, written by
 * `record-deploy.mjs` right after a successful `pnpm deploy`). Prod exposes no deployed-SHA signal
 * (the apex serves the router's inlined login gate — no asset refs, no `define`'d SHA, no version
 * header; the authed SPA's hashed assets don't reliably map to a fork SHA and rebase churn would
 * confound it), so the deploy step recording what it shipped is the cheapest RELIABLE probe.
 *
 * THE COMPARISON — the FORK gitlink is the strong signal (that is literally the code prod runs):
 * if HEAD's fork gitlink != the ledger's `forkSha`, HEAD is ahead of what is deployed → DRIFT.
 * Outer-SHA divergence (HEAD has moved past the recorded deploy's `outerSha`) is a WEAK/advisory
 * signal — a docs-only or bookkeeping commit moves outer without changing what ships — so it is
 * reported but never the sole DRIFT trigger. No ledger at all ⇒ INFORMATIONAL: can't prove, tells
 * the lead to probe prod.
 *
 * SECOND SIGNAL (fire-239) — UNPUSHED DEPLOY: `check-fire-committed` verifies the FORK submodule is
 * pushed, but nothing verified the OUTER deployed commit reached origin/main. fire-238 deployed outer
 * `9b01ae54` then DIED before `git push` — prod ran a commit sitting only in `origin/main..HEAD`,
 * lost had the machine died. `pushAdvisory` (pure) + an impure origin/main ancestry check now WARN
 * (advisory, exit 0 even under --ci) when the last-deployed outer commit is absent from the remote.
 *
 * GREEN-BY-DEFAULT, never a permanently-red gate (project memory
 * `permanently-red-gate-causes-starvation`): on DRIFT it WARNs (exit 0) with a crisp
 * probe-prod-first message; a clean match prints an OK line. `--ci` is available for a caller that
 * wants exit 1 on real drift, but the loop runs it advisory. `--json` emits the structured verdict.
 *
 * Usage:
 *   node scripts/check-deploy-state.mjs            # human, advisory (exit 0 always)
 *   node scripts/check-deploy-state.mjs --json     # machine-readable verdict
 *   node scripts/check-deploy-state.mjs --ci        # exit 1 on confirmed drift (fork mismatch)
 *   node scripts/check-deploy-state.mjs --selftest  # run the embedded branch tests
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const LEDGER = `${ROOT}/.claude/run-the-loop/.last-deploy.json`;
const SUBMODULE = "cloudflare-os";

/**
 * PURE comparison — no git, no fs. Given HEAD's SHAs + the ledger (or null), decide the verdict.
 * Verdict statuses:
 *   "ok"       — fork gitlink matches the ledger; prod reflects HEAD's deployable code.
 *   "drift"    — fork gitlink differs from the ledger; HEAD is AHEAD of what's deployed.
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
      message: `DRIFT: HEAD's fork gitlink ${headFork.slice(0, 8)} != last-deployed ${ledFork.slice(0, 8)} ` +
        `(ledger ${ledIso ?? "?"}). HEAD is AHEAD of prod — a prior fire likely committed+pushed but ` +
        `did NOT \`pnpm deploy\`. Do NOT trust the clean git tree: PROBE PROD (run the slice's ` +
        `verifier against megabyte.space), then either deploy the gitlink or salvage per §0.` };
  }
  // fork matches — prod reflects HEAD's deployable code. Outer drift is advisory noise only.
  return { status: "ok", forkMatches, outerMoved, ...base,
    message: outerMoved
      ? `OK: fork gitlink ${headFork.slice(0, 8)} matches last-deployed (ledger ${ledIso ?? "?"}). ` +
        `Outer HEAD moved past the recorded deploy's outer SHA, but that is non-deployable churn ` +
        `(docs/bookkeeping) — prod reflects the current fork.`
      : `OK: fork gitlink ${headFork.slice(0, 8)} matches last-deployed (ledger ${ledIso ?? "?"}). ` +
        `Prod reflects HEAD's deployable code.` };
}

/**
 * PURE: given the last-deployed OUTER commit SHA + whether it is reachable from origin/main, produce
 * the unpushed-deploy advisory (or null when there's nothing to warn about). THE STRAND IT CATCHES:
 * a fire deploys an outer commit but DIES before `git push origin main` — fire-238 deployed HEAD
 * `9b01ae54` yet it sat only in `origin/main..HEAD`, so prod ran code absent from the remote (lost if
 * the machine died). `check-fire-committed` verifies the FORK submodule is pushed; NOTHING verified
 * the OUTER deployed commit reached origin. Advisory only (never gates) — green-by-default.
 *
 * @param {string|null|undefined} ledgerOuterSha  the `.last-deploy.json` outerSha (what prod ran)
 * @param {boolean} reachableFromOrigin           is that commit an ancestor of origin/main?
 * @returns {string|null}  the advisory message, or null when nothing to warn
 */
export function pushAdvisory(ledgerOuterSha, reachableFromOrigin) {
  if (!ledgerOuterSha || reachableFromOrigin) return null;
  return `last-deployed OUTER commit ${ledgerOuterSha.slice(0, 8)} is NOT reachable from origin/main — ` +
    `prod runs a commit absent from the remote (the fire-238 unpushed-deploy strand; the FORK-push ` +
    `guard in check-fire-committed does NOT cover the outer repo). \`git push origin main\` before ` +
    `releasing the lease, or salvage the strand per §0.`;
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
  // The COMMITTED gitlink (`HEAD:cloudflare-os`) is the fork SHA that ships — compare apples to
  // apples with record-deploy's stamp. The submodule's floating working HEAD can be a dirty
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
  // GREEN-by-default: advisory exit 0 unless --ci asked for a hard fail on confirmed drift (the push
  // advisory stays advisory even under --ci — green-by-default, never a permanently-red gate).
  process.exit(ci && verdict.status === "drift" ? 1 : 0);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
