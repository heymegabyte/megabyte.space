import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claimLease, handoffLease, heartbeatLease, isLive, readLease, releaseLease } from "./loop-fire-lock.mjs";

function tmpLease(): string {
  return join(mkdtempSync(join(tmpdir(), "fire-lease-")), "lease.json");
}

test("claim on an empty path succeeds and writes the lease", () => {
  const path = tmpLease();
  const res = claimLease({ fire: "fire-t1", runId: "run-a", path });
  assert.equal(res.ok, true);
  const lease = readLease(path);
  assert.equal(lease?.runId, "run-a");
  assert.equal(lease?.phase, "orient");
});

test("claim against a LIVE lease coalesces with code 3", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t1", runId: "run-a", path });
  const res = claimLease({ fire: "fire-t2", runId: "run-b", path });
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.code, 3);
  assert.equal(readLease(path)?.runId, "run-a"); // holder untouched
});

test("a STALE lease (heartbeat older than the window) is reclaimed", () => {
  const path = tmpLease();
  const old = new Date(Date.now() - 21 * 60 * 1000).toISOString(); // > 20 min default
  writeFileSync(path, JSON.stringify({ fire: "fire-dead", runId: "run-dead", phase: "fan-out", heartbeat: old }));
  assert.equal(isLive(readLease(path)), false);
  const res = claimLease({ fire: "fire-t3", runId: "run-new", path });
  assert.equal(res.ok, true);
  assert.equal(res.ok === true && res.reclaimed, true);
  assert.equal(readLease(path)?.runId, "run-new");
});

test("a corrupt lease file is treated as reclaimable, never a wedge", () => {
  const path = tmpLease();
  writeFileSync(path, "{not json");
  assert.equal(readLease(path), null);
  const res = claimLease({ fire: "fire-t4", runId: "run-c", path });
  assert.equal(res.ok, true);
});

test("heartbeat refreshes the owned lease and can advance the phase", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t5", runId: "run-a", path });
  const before = readFileSync(path, "utf8");
  const res = heartbeatLease({ runId: "run-a", phase: "converge", path, now: Date.now() + 5000 });
  assert.equal(res.ok, true);
  const lease = readLease(path);
  assert.equal(lease?.phase, "converge");
  assert.notEqual(readFileSync(path, "utf8"), before);
});

test("heartbeat by a non-owner is refused with code 4", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t6", runId: "run-a", path });
  const res = heartbeatLease({ runId: "run-intruder", path });
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.code, 4);
});

test("release is owner-only and idempotent when absent", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t7", runId: "run-a", path });
  const refuse = releaseLease({ runId: "run-b", path });
  assert.equal(refuse.ok, false);
  const ok = releaseLease({ runId: "run-a", path });
  assert.equal(ok.ok, true && ok.ok);
  assert.equal(readLease(path), null);
  const again = releaseLease({ runId: "run-a", path });
  assert.equal(again.ok, true);
});

test("handoff writes a released-handoff lease with a stale heartbeat (the infinite-loop close)", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t8", runId: "run-a", path });
  const res = handoffLease({ runId: "run-a", note: "shipped the slice", path });
  assert.equal(res.ok, true);
  const lease = readLease(path);
  assert.equal(lease?.phase, "released-handoff"); // the exact phase the watchdog relaunches on
  assert.equal(lease?.fire, "fire-t8"); // carries the fire forward
  assert.equal(lease?.note, "shipped the slice");
  assert.equal(isLive(lease), false); // deliberately stale → immediately reclaimable by the next fire
});

test("handoff by a non-owner is refused with code 4", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t9", runId: "run-a", path });
  const res = handoffLease({ runId: "run-intruder", path });
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.code, 4);
  assert.equal(readLease(path)?.phase, "orient"); // holder untouched
});

test("handoff on an absent lease still re-arms (idempotent)", () => {
  const path = tmpLease();
  const res = handoffLease({ runId: "run-solo", fire: "fire-t10", path });
  assert.equal(res.ok, true);
  assert.equal(readLease(path)?.phase, "released-handoff");
});

test("handoff --wedged writes a wedged-handoff (fast-retry) lease, still stale + reclaimable", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t11", runId: "run-a", path });
  const res = handoffLease({ runId: "run-a", wedged: true, note: "classifier wedge at orient, no work", path });
  assert.equal(res.ok, true);
  const lease = readLease(path);
  assert.equal(lease?.phase, "wedged-handoff"); // the DISTINCT phase → watchdog uses the ~10-min backoff
  assert.equal(lease?.fire, "fire-t11"); // carries the fire forward
  assert.equal(lease?.note, "classifier wedge at orient, no work");
  assert.equal(isLive(lease), false); // stale → the next (hopefully unwedged) fire reclaims instantly
});

test("handoff defaults to released-handoff when wedged is omitted (the two phases never blur)", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t12", runId: "run-a", path });
  assert.equal(handoffLease({ runId: "run-a", path }).ok, true);
  assert.equal(readLease(path)?.phase, "released-handoff");
  assert.equal(handoffLease({ runId: "run-a", wedged: false, path }).ok, true);
  assert.equal(readLease(path)?.phase, "released-handoff");
});

test("a wedged handoff by a non-owner is refused with code 4", () => {
  const path = tmpLease();
  claimLease({ fire: "fire-t13", runId: "run-a", path });
  const res = handoffLease({ runId: "run-intruder", wedged: true, path });
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.code, 4);
  assert.equal(readLease(path)?.phase, "orient"); // holder untouched
});
