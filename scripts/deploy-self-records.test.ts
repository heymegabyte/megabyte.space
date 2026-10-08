import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// fire-245 loop-improvement: `pnpm deploy` must self-record the deploy state.
//
// The recurring strand (fires 220 / 243 / 245): a fire deploys but dies before running
// `record-deploy.mjs`, leaving `.last-deploy.json` behind the real deploy — so the NEXT lead's
// check-deploy-state WARNs "HEAD ahead of prod" on code that is ACTUALLY live. That false positive
// is indistinguishable from the true "committed but never deployed" case without an expensive prod
// probe, and it burns a salvage fire re-deploying what already shipped.
//
// Fix: chain record-deploy into the `deploy` script itself, so a successful `pnpm deploy` can never
// skip the record. This drift gate keeps the chaining from being silently dropped AND keeps it OFF
// the dry-run `check` path (stamping the ledger for a --dry-run would lie about what prod serves).
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("the deploy script self-records deploy state after the deploy succeeds", () => {
  const deploy = pkg.scripts.deploy;
  assert.match(deploy, /scripts\/deploy\.ts/, "deploy still runs the deploy orchestrator");
  assert.match(deploy, /record-deploy\.mjs/, "deploy chains the deploy-state record");
  // `&&`, not `;` or `&`: record only on a SUCCESSFUL deploy, and sequentially after it — so the
  // ledger stamp reflects a real ship, not a crashed one, and never races the deploy.
  assert.match(
    deploy,
    /deploy\.ts\s*&&\s*node\s+scripts\/record-deploy\.mjs/,
    "record-deploy is gated behind deploy success with && (not ; or a background &)",
  );
});

test("the dry-run check path never records a deploy (a --dry-run is not a ship)", () => {
  assert.doesNotMatch(
    pkg.scripts.check,
    /record-deploy/,
    "check runs deploy.ts --check (a dry run) and must not stamp the deploy ledger",
  );
});
