import { test } from "node:test";
import assert from "node:assert/strict";
// The .mjs guards its main() behind an import.meta check, so importing yields the pure helpers only.
import { parseArgs, pushMain, commitRecord } from "./record-deploy.mjs";

const REL = ".claude/run-the-loop/.last-deploy.json";

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

test("parseArgs: --commit is an opt-in boolean, default off", () => {
  assert.equal(parseArgs([]).commit, false);
  assert.equal(parseArgs(["--commit"]).commit, true);
});

test("parseArgs: --commit coexists with --push + flag values (never misread as iso)", () => {
  const a = parseArgs(["--commit", "--push", "--fire", "fire-269", "--note", "x"]);
  assert.equal(a.commit, true);
  assert.equal(a.push, true);
  assert.equal(a.fireArg, "fire-269");
  assert.equal(a.noteArg, "x");
  assert.equal(a.iso, null, "no flag value leaks into the positional iso scan");
});

test("commitRecord: stages ONLY the record path then commits with a fire-tagged message, in order", () => {
  const calls: Array<{ args: string[]; cwd: string }> = [];
  const res = commitRecord("fire-269", {
    isDirty: () => true,
    exec: (args: string[], cwd: string) => {
      calls.push({ args, cwd });
    },
  });
  assert.equal(res.committed, true);
  assert.equal(calls.length, 2, "exactly one add + one commit");
  assert.deepEqual(calls[0].args, ["add", "--", REL], "stages ONLY the record path (never git add -A)");
  assert.deepEqual(
    calls[1].args,
    ["commit", "-m", "chore(loop): deploy-record fire-269", "--", REL],
    "pathspec-limited commit of ONLY the record, fire-tagged",
  );
});

test("commitRecord: idempotent — an unchanged record never stages or commits", () => {
  let called = false;
  const res = commitRecord("fire-269", {
    isDirty: () => false,
    exec: () => {
      called = true;
    },
  });
  assert.equal(res.committed, false);
  assert.equal(res.reason, "unchanged");
  assert.equal(called, false, "no git mutation when the record is already clean");
});

test("commitRecord: no fire → an untagged deploy-record message (still commits)", () => {
  const calls: string[][] = [];
  const res = commitRecord(null, { isDirty: () => true, exec: (args: string[]) => calls.push(args) });
  assert.equal(res.committed, true);
  assert.deepEqual(calls[1], ["commit", "-m", "chore(loop): deploy-record", "--", REL]);
});

test("commitRecord: fail-soft — a throwing git NEVER throws (the deploy already succeeded)", () => {
  const res = commitRecord("fire-269", {
    isDirty: () => true,
    exec: () => {
      throw new Error("fatal: unable to write new index file\nextra line");
    },
  });
  assert.equal(res.committed, false);
  assert.ok(res.detail && !res.detail.includes("\n"), "detail is a single trimmed line");
});
