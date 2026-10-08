import { test } from "node:test";
import assert from "node:assert/strict";
// The .mjs guards its main() behind an import.meta check, so importing yields the pure helpers only.
import { parseArgs, pushMain } from "./record-deploy.mjs";

test("parseArgs: --push is an opt-in boolean, default off", () => {
  assert.equal(parseArgs([]).push, false);
  assert.equal(parseArgs(["--push"]).push, true);
});

test("parseArgs: --push coexists with the positional iso override", () => {
  const a = parseArgs(["2026-01-02T03:04:05.000Z", "--push"]);
  assert.equal(a.iso, "2026-01-02T03:04:05.000Z");
  assert.equal(a.push, true);
});

test("parseArgs: --note/--fire VALUES are never misread as the iso or as --push", () => {
  const a = parseArgs(["--note", "/autorag salvage", "--fire", "fire-266", "--push"]);
  assert.equal(a.noteArg, "/autorag salvage");
  assert.equal(a.fireArg, "fire-266");
  assert.equal(a.push, true);
  assert.equal(a.iso, null, "a flag value must not leak into the positional iso scan");
});

test("pushMain: publishes origin/main AND the fork, in that order", () => {
  const calls: Array<{ args: string[]; cwd: string }> = [];
  const res = pushMain((args: string[], cwd: string) => {
    calls.push({ args, cwd });
  });
  assert.deepEqual(res.map((r) => r.label), ["origin/main", "fork megabyte-os"]);
  assert.ok(res.every((r) => r.pushed === true));
  assert.deepEqual(calls[0].args, ["push", "origin", "main"]);
  assert.deepEqual(calls[1].args, ["push", "origin", "megabyte-os"]);
  assert.ok(calls[1].cwd.endsWith("/cloudflare-os"), "the fork push must run inside the submodule tree");
});

test("pushMain: fail-soft — a throwing git NEVER throws, each target independent", () => {
  // Simulate origin failing (non-ff race) while the fork succeeds: the failure must not abort the fork.
  let n = 0;
  const res = pushMain(() => {
    if (n++ === 0) throw new Error("! [rejected] main -> main (non-fast-forward)\nextra line");
    /* fork: succeed */
  });
  assert.equal(res[0].pushed, false);
  assert.equal(res[1].pushed, true, "the fork push must still run after origin/main failed");
  assert.ok(res[0].detail && !res[0].detail.includes("\n"), "detail is a single trimmed line");
});
