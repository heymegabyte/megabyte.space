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

for (const scenario of ["rename-out", "rename-in", "unusual-path", "fork-rename", "copy-out", "unwatched-rename"] as const) {
  test(`NUL porcelain preserves tracked paths: ${scenario}`, () => {
    const root = mkdtempSync(join(tmpdir(), "fire-paths-"));
    try {
      mkdirSync(join(root, "scripts"));
      mkdirSync(join(root, "docs"));
      mkdirSync(join(root, "xxxdocs"));
      mkdirSync(join(root, "cloudflare-os"));
      copyFileSync(new URL("./check-fire-committed.mjs", import.meta.url), join(root, "scripts/check-fire-committed.mjs"));
      const repo = scenario === "fork-rename" ? join(root, "cloudflare-os") : root;
      const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["init", "-q"], { cwd: join(root, "cloudflare-os") });
      if (repo === root) {
        const forkGit = (...args: string[]) => execFileSync("git", args, { cwd: join(root, "cloudflare-os") });
        forkGit("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-qm", "fork fixture");
        forkGit("update-ref", "refs/remotes/origin/megabyte-os", "HEAD");
      }
      writeFileSync(join(root, ".gitignore"), "cloudflare-os/\n");
      execFileSync("git", ["add", ".gitignore"], { cwd: root });
      execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "parent fixture"], { cwd: root });
      // A parser that forgets the second NUL field would read xxxdocs/source.txt
      // as status "xx" plus watched path docs/source.txt, exposing framing errors.
      const source = scenario === "unwatched-rename" ? "xxxdocs/source.txt" : scenario === "rename-in" ? "outside-source.txt" : scenario === "unusual-path" ? "docs/雪\tline\nfile.txt" : scenario === "fork-rename" ? "source.txt" : "docs/source.txt";
      writeFileSync(join(repo, source), "before\n".repeat(100));
      const following = scenario === "fork-rename" ? "following.txt" : "docs/z-following.txt";
      writeFileSync(join(repo, following), "before");
      git("add", source, following);
      git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture");
      if (repo !== root) git("update-ref", "refs/remotes/origin/megabyte-os", "HEAD");
      const destination = scenario === "rename-in" ? "docs/destination.txt" : (scenario === "unwatched-rename" || scenario === "copy-out") ? "aaa-outside.txt" : "outside.txt";
      if (scenario === "unusual-path") writeFileSync(join(repo, source), "after");
      else if (scenario === "copy-out") {
        git("config", "status.renames", "copies");
        copyFileSync(join(repo, source), join(repo, destination));
        writeFileSync(join(repo, source), "before\n".repeat(100) + "changed\n");
        git("add", source, destination);
        const status = git("status", "--porcelain=v1", "-z");
        assert.ok(status.includes("C  " + destination + "\0" + source + "\0"), "fixture must emit a real Git copy record");
      } else {
        git("mv", source, destination);
      }
      writeFileSync(join(repo, following), "after");
      if (scenario === "unwatched-rename" || scenario === "copy-out") {
        const status = git("status", "--porcelain=v1", "-z");
        const record = (scenario === "copy-out" ? "C  " : "R  ") + destination + "\0" + source + "\0";
        assert.ok(status.includes(record), "fixture must emit a two-path Git record");
        assert.ok(status.indexOf(record) < status.indexOf(" M " + following + "\0"), "watched edit must follow the complete two-path record");
      }
      writeFileSync(join(root, "docs/scratch.txt"), "untracked artifact");
      const run = spawnSync(process.execPath, ["scripts/check-fire-committed.mjs", "--ci"], { cwd: root, encoding: "utf8" });
      const out = JSON.parse(run.stdout);
      assert.deepEqual(out.submoduleIssues, [], "no unrelated fork failure may mask the dirty-path gate");
      const entries = scenario === "fork-rename" ? out.forkDirty : out.dirty;
      if (scenario === "unwatched-rename") {
        assert.deepEqual(entries, [{ xy: " M", path: following }], "both unwatched rename paths must be excluded without consuming the following record");
        assert.equal(run.status, 1, "the following watched edit must still block CI");
        git("restore", following);
        const clean = spawnSync(process.execPath, ["scripts/check-fire-committed.mjs", "--ci"], { cwd: root, encoding: "utf8" });
        assert.deepEqual(JSON.parse(clean.stdout).dirty, []);
        assert.equal(clean.status, 0, "an unwatched rename alone must not block CI");
        return;
      }
      assert.equal(entries.length, scenario === "copy-out" ? 3 : 2);
      const entry = entries.find((item: { path: string }) => item.path !== following && (scenario !== "copy-out" || item.path === destination));
      assert.ok(entry);
      assert.ok(entries.some((item: { path: string; xy: string }) => item.path === following && item.xy === " M"));
      assert.equal(entry.path, scenario === "unusual-path" ? source : destination);
      if (scenario !== "unusual-path") assert.equal(entry.originalPath, source);
      if (scenario === "copy-out") {
        assert.equal(entry.xy, "C ");
        assert.ok(entries.some((item: { path: string; xy: string }) => item.path === source && item.xy === "M "));
      }
      assert.equal(run.status, 1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}


for (const scenario of ["copy-in", "fork-copy", "copy-in-unusual", "fork-copy-unusual", "copy-in-unusual-source", "fork-copy-unusual-source"] as const) {
  test(`real Git copy blocks CI without unrelated failures: ${scenario}`, () => {
    const root = mkdtempSync(join(tmpdir(), "fire-copy-"));
    try {
      mkdirSync(join(root, "scripts"));
      mkdirSync(join(root, "docs"));
      mkdirSync(join(root, "cloudflare-os"));
      copyFileSync(new URL("./check-fire-committed.mjs", import.meta.url), join(root, "scripts/check-fire-committed.mjs"));
      const fork = join(root, "cloudflare-os");
      const gitAt = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });
      for (const cwd of [root, fork]) {
        gitAt(cwd, "init", "-q");
        gitAt(cwd, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-qm", "fixture");
      }
      writeFileSync(join(root, ".gitignore"), "cloudflare-os/\n");
      gitAt(root, "add", ".gitignore");
      gitAt(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "ignore fork");
      const inFork = scenario.startsWith("fork-copy");
      const unusual = scenario.endsWith("-unusual");
      const repo = inFork ? fork : root;
      const source = scenario.endsWith("-unusual-source") ? "outside-雪\tline\nsource.txt" : "outside-source.txt";
      const destination = `${inFork ? "" : "docs/"}aaa-${unusual ? "雪\tline\n" : ""}copy.txt`;
      const following = inFork ? "zzz-following.txt" : "docs/zzz-following.txt";
      writeFileSync(join(repo, source), "before\n".repeat(100));
      writeFileSync(join(repo, following), "before");
      gitAt(repo, "add", source, following);
      gitAt(repo, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "copy sources");
      gitAt(fork, "update-ref", "refs/remotes/origin/megabyte-os", "HEAD");
      gitAt(repo, "config", "status.renames", "copies");
      copyFileSync(join(repo, source), join(repo, destination));
      writeFileSync(join(repo, source), "before\n".repeat(100) + "changed\n");
      gitAt(repo, "add", source, destination);
      writeFileSync(join(repo, following), "after");
      const status = gitAt(repo, "status", "--porcelain=v1", "-z");
      const record = "C  " + destination + "\0" + source + "\0";
      assert.ok(status.includes(record), "must exercise Git C framing, not an added-file fallback");
      assert.ok(status.indexOf(record) < status.indexOf(" M " + following + "\0"), "independent edit must follow the complete copy record");
      const run = () => spawnSync(process.execPath, ["scripts/check-fire-committed.mjs", "--ci"], { cwd: root, encoding: "utf8" });
      const result = run();
      const out = JSON.parse(result.stdout);
      assert.deepEqual(out.submoduleIssues, [], "healthy fork metadata must not mask copy detection");
      assert.deepEqual(out.placeholders, []);
      const entries = inFork ? out.forkDirty : out.dirty;
      assert.deepEqual(entries.find((item: { path: string }) => item.path === destination), { xy: "C ", path: destination, originalPath: source });
      assert.ok(entries.some((item: { path: string; xy: string }) => item.path === following && item.xy === " M"));
      assert.equal(entries.length, inFork ? 3 : 2);
      assert.deepEqual(inFork ? out.dirty : out.forkDirty, []);
      assert.equal(result.status, 1);
      // Remove the following edit. Copy-in now has only the copy in WATCHED;
      // fork-copy retains the modified source required for Git copy detection.
      // Exact C-entry assertions (rather than exit alone) prove fork-copy coverage.
      gitAt(repo, "restore", following);
      const isolated = run();
      const isolatedOut = JSON.parse(isolated.stdout);
      assert.equal(isolated.status, 1);
      assert.deepEqual(isolatedOut.submoduleIssues, []);
      const isolatedEntries = inFork ? isolatedOut.forkDirty : isolatedOut.dirty;
      assert.deepEqual(isolatedEntries.find((item: { path: string }) => item.path === destination), { xy: "C ", path: destination, originalPath: source });
      assert.equal(isolatedEntries.length, inFork ? 2 : 1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
