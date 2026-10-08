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
