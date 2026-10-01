import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claimLease, heartbeatLease, isLive, readLease, releaseLease } from "./loop-fire-lock.mjs";

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
