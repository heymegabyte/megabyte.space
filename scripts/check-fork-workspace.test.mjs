import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const scenario of ['valid', 'empty', 'dangling-marker', 'parent-marker', 'parent-common-dir', 'wrong-head', 'missing-router', 'staged-pin']) {
  test(`fork workspace preflight: ${scenario}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-workspace-'));
    const fork = join(root, 'cloudflare-os');
    const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
    const commit = (cwd) => git(cwd, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture');
    try {
      mkdirSync(join(root, 'scripts'));
      copyFileSync(new URL('./check-fork-workspace.mjs', import.meta.url), join(root, 'scripts/check-fork-workspace.mjs'));
      git(root, 'init', '-q');
      mkdirSync(join(fork, 'packages/router'), { recursive: true });
      git(fork, 'init', '-q');
      writeFileSync(join(fork, 'packages/router/package.json'), '{"name":"router"}');
      git(fork, 'add', '.');
      commit(fork);
      const pin = git(fork, 'rev-parse', 'HEAD');
      git(root, 'update-index', '--add', '--cacheinfo', `160000,${pin},cloudflare-os`);
      commit(root);
      if (scenario === 'empty' || scenario === 'dangling-marker' || scenario === 'parent-marker' || scenario === 'parent-common-dir') {
        rmSync(join(fork, '.git'), { recursive: true, force: true });
        if (scenario === 'dangling-marker') writeFileSync(join(fork, '.git'), 'gitdir: missing\n');
        if (scenario === 'parent-common-dir') git(root, 'config', 'core.worktree', fork);
        if (scenario === 'parent-marker' || scenario === 'parent-common-dir') writeFileSync(join(fork, '.git'), 'gitdir: ../.git\n');
      }
      if (scenario === 'wrong-head' || scenario === 'staged-pin') {
        writeFileSync(join(fork, 'new.txt'), 'new');
        git(fork, 'add', '.');
        commit(fork);
        if (scenario === 'staged-pin') git(root, 'add', 'cloudflare-os');
      }
      if (scenario === 'missing-router') rmSync(join(fork, 'packages/router/package.json'));
      const run = spawnSync(process.execPath, ['scripts/check-fork-workspace.mjs'], { cwd: root, encoding: 'utf8' });
      assert.equal(run.status, scenario === 'valid' ? 0 : 1, run.stderr || run.stdout);
      const result = JSON.parse(run.stdout);
      assert.equal(result.ok, scenario === 'valid');
      assert.equal(result.expectedHead, pin, 'the committed gitlink, not staged pin, is authoritative');
      if (scenario === 'parent-marker') assert.match(result.error, /top.level/);
      if (scenario === 'parent-common-dir') assert.match(result.error, /parent Git directory/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

test('absorbed submodule in a linked parent worktree ignores ambient Git routing', () => {
  const base = mkdtempSync(join(tmpdir(), 'fork-linked-'));
  const source = join(base, 'source');
  const parent = join(base, 'parent');
  const linked = join(base, 'linked');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const commit = (cwd) => git(cwd, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture');
  try {
    mkdirSync(join(source, 'packages/router'), { recursive: true });
    git(source, 'init', '-q');
    writeFileSync(join(source, 'packages/router/package.json'), '{"name":"router"}');
    git(source, 'add', '.');
    commit(source);
    mkdirSync(parent);
    git(parent, 'init', '-q');
    git(parent, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', source, 'cloudflare-os');
    git(parent, 'add', '.');
    commit(parent);
    git(parent, 'worktree', 'add', '--detach', '-q', linked, 'HEAD');
    git(linked, '-c', 'protocol.file.allow=always', 'submodule', 'update', '--init', '-q');
    mkdirSync(join(linked, 'scripts'));
    copyFileSync(new URL('./check-fork-workspace.mjs', import.meta.url), join(linked, 'scripts/check-fork-workspace.mjs'));
    const run = spawnSync(process.execPath, ['scripts/check-fork-workspace.mjs'], {
      cwd: linked, encoding: 'utf8',
      env: { ...process.env, GIT_DIR: join(parent, '.git'), GIT_WORK_TREE: parent, GIT_INDEX_FILE: join(base, 'missing-index') },
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(JSON.parse(run.stdout).actualHead, git(source, 'rev-parse', 'HEAD'));
  } finally { rmSync(base, { recursive: true, force: true }); }
});
