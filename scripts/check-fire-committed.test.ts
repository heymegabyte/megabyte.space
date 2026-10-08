import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("uninitialized fork never borrows parent HEAD or working-tree dirt", () => {
  const root = mkdtempSync(join(tmpdir(), "fire-committed-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "cloudflare-os"));
    copyFileSync(new URL("./check-fire-committed.mjs", import.meta.url), join(root, "scripts/check-fire-committed.mjs"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "-q");
    writeFileSync(join(root, "source.txt"), "before");
    git("add", "source.txt");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture");
    writeFileSync(join(root, "source.txt"), "after");
    const run = spawnSync(process.execPath, ["scripts/check-fire-committed.mjs", "--ci"], { cwd: root, encoding: "utf8" });
    const out = JSON.parse(run.stdout);
    assert.equal(run.status, 1, "missing fork must block CI verification");
    assert.deepEqual(out.forkDirty, [], "parent dirt must not be classified as fork dirt");
    assert.equal(out.submoduleIssues.length, 1);
    assert.match(out.submoduleIssues[0], /not initialized/);
    assert.doesNotMatch(out.submoduleIssues[0], /NOT pushed/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


test("tracked loop command edits block end-of-fire verification", () => {
  const root = mkdtempSync(join(tmpdir(), "fire-command-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, ".claude/commands"), { recursive: true });
    copyFileSync(new URL("./check-fire-committed.mjs", import.meta.url), join(root, "scripts/check-fire-committed.mjs"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "-q");
    writeFileSync(join(root, ".claude/commands/run-the-loop.md"), "before");
    git("add", ".claude/commands/run-the-loop.md");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture");
    writeFileSync(join(root, ".claude/commands/run-the-loop.md"), "after");
    const run = spawnSync(process.execPath, ["scripts/check-fire-committed.mjs", "--ci"], { cwd: root, encoding: "utf8" });
    const out = JSON.parse(run.stdout);
    assert.deepEqual(out.dirty, [{ xy: " M", path: ".claude/commands/run-the-loop.md" }]);
    assert.equal(run.status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


test("broken fork gitdir marker fails closed instead of skipping inspection", () => {
  const root = mkdtempSync(join(tmpdir(), "fire-broken-fork-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "cloudflare-os"));
    copyFileSync(new URL("./check-fire-committed.mjs", import.meta.url), join(root, "scripts/check-fire-committed.mjs"));
    execFileSync("git", ["init", "-q"], { cwd: root });
    writeFileSync(join(root, "cloudflare-os/.git"), "gitdir: missing-directory\n");
    const run = spawnSync(process.execPath, ["scripts/check-fire-committed.mjs", "--ci"], { cwd: root, encoding: "utf8" });
    const out = JSON.parse(run.stdout);
    assert.equal(run.status, 1, "an unreadable fork must block CI verification");
    assert.ok(out.submoduleIssues.some((issue: string) => /HEAD inspection failed/.test(issue)));
    assert.ok(out.submoduleIssues.some((issue: string) => /working-tree inspection failed/.test(issue)));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
