import test from "node:test";
import assert from "node:assert/strict";

import { compareDeployState } from "./check-deploy-state.mjs";

// Fixed 40-char SHAs so the slice(0,8) in messages is stable.
const FORK_A = "a".repeat(40);
const FORK_B = "b".repeat(40);
const OUTER_A = "c".repeat(40);
const OUTER_B = "d".repeat(40);

test("fork gitlink matches the ledger ⇒ ok, no outer drift", () => {
  const v = compareDeployState(
    { forkSha: FORK_A, outerSha: OUTER_A },
    { forkSha: FORK_A, outerSha: OUTER_A, iso: "2026-10-06T00:00:00.000Z" },
  );
  assert.equal(v.status, "ok");
  assert.equal(v.forkMatches, true);
  assert.equal(v.outerMoved, false);
  assert.match(v.message, /^OK:/);
});

test("fork matches but outer HEAD moved ⇒ ok, advisory outerMoved=true", () => {
  const v = compareDeployState(
    { forkSha: FORK_A, outerSha: OUTER_B },
    { forkSha: FORK_A, outerSha: OUTER_A, iso: "t" },
  );
  assert.equal(v.status, "ok", "non-deployable outer churn is not drift");
  assert.equal(v.forkMatches, true);
  assert.equal(v.outerMoved, true);
  assert.match(v.message, /non-deployable churn/);
});

test("fork gitlink differs from the ledger ⇒ drift (HEAD ahead of prod)", () => {
  const v = compareDeployState(
    { forkSha: FORK_B, outerSha: OUTER_A },
    { forkSha: FORK_A, outerSha: OUTER_A, iso: "t" },
  );
  assert.equal(v.status, "drift");
  assert.equal(v.forkMatches, false);
  assert.match(v.message, /DRIFT/);
  assert.match(v.message, /PROBE PROD/);
  // the exact fork-ahead class fire-220 hit
  assert.match(v.message, /did NOT `pnpm deploy`/);
});

test("no ledger at all ⇒ no-ledger (unprovable, tells lead to probe)", () => {
  const v = compareDeployState({ forkSha: FORK_A, outerSha: OUTER_A }, null);
  assert.equal(v.status, "no-ledger");
  assert.match(v.message, /PROBE PROD/);
  assert.match(v.message, /record-deploy\.mjs/);
});

test("ledger object without a forkSha ⇒ no-ledger (treated as absent)", () => {
  const v = compareDeployState(
    { forkSha: FORK_A, outerSha: OUTER_A },
    { outerSha: OUTER_A, iso: "t" },
  );
  assert.equal(v.status, "no-ledger");
});

test("HEAD fork gitlink unresolved ⇒ unknown (never a false drift)", () => {
  const v = compareDeployState(
    { forkSha: null, outerSha: OUTER_A },
    { forkSha: FORK_A, outerSha: OUTER_A, iso: "t" },
  );
  assert.equal(v.status, "unknown");
  assert.equal(v.forkMatches, false);
});

test("verdict always carries both head and ledger SHAs for the json consumer", () => {
  const v = compareDeployState(
    { forkSha: FORK_B, outerSha: OUTER_B },
    { forkSha: FORK_A, outerSha: OUTER_A, iso: "iso-x" },
  );
  assert.equal(v.head.forkSha, FORK_B);
  assert.equal(v.head.outerSha, OUTER_B);
  assert.equal(v.ledger.forkSha, FORK_A);
  assert.equal(v.ledger.outerSha, OUTER_A);
  assert.equal(v.ledger.iso, "iso-x");
});
