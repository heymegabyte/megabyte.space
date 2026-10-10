import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSubmodules } from './check-submodule-resolvable.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'submodule gate '));
  try {
    const remote = join(dir, 'declared remote');
    const root = join(dir, 'parent');
    for (const path of [remote, root]) {
      mkdirSync(path); git(path, 'init', '-q');
      git(path, 'config', 'user.email', 'test@example.test');
      git(path, 'config', 'user.name', 'Fixture');
    }
    writeFileSync(join(remote, 'file'), 'ancestor');
    git(remote, 'add', 'file'); git(remote, 'commit', '-qm', 'ancestor');
    const pin = git(remote, 'rev-parse', 'HEAD');
    writeFileSync(join(remote, 'file'), 'descendant');
    git(remote, 'commit', '-qam', 'descendant');
    git(root, 'config', '-f', '.gitmodules', 'submodule.fork.path', 'fork');
    git(root, 'config', '-f', '.gitmodules', 'submodule.fork.url', remote);
    git(root, 'add', '.gitmodules');
    git(root, 'update-index', '--add', '--cacheinfo', `160000,${pin},fork`);
    git(root, 'commit', '-qm', 'pin');
    fn({ root, remote, pin });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('ancestor pin passes without initialized checkout or ref-tip membership', () => fixture(({ root }) => {
  assert.equal(checkSubmodules(root), 0);
}));
test('absent pin fails even when a local checkout contains it', () => fixture(({ root, remote }) => {
  git(root, 'clone', '-q', remote, 'fork');
  const fork = join(root, 'fork');
  git(fork, 'config', 'user.email', 'test@example.test'); git(fork, 'config', 'user.name', 'Fixture');
  writeFileSync(join(fork, 'private'), 'local only'); git(fork, 'add', 'private'); git(fork, 'commit', '-qm', 'private');
  const pin = git(fork, 'rev-parse', 'HEAD');
  git(root, 'update-index', '--cacheinfo', `160000,${pin},fork`); git(root, 'commit', '-qm', 'private pin');
  assert.equal(checkSubmodules(root), 1);
}));
test('unreachable declared remote fails closed', () => fixture(({ root, remote }) => {
  rmSync(remote, { recursive: true, force: true });
  assert.equal(checkSubmodules(root), 1);
}));
test('working metadata deletion cannot bypass committed provenance', () => fixture(({ root, remote }) => {
  rmSync(join(root, '.gitmodules'));
  rmSync(remote, { recursive: true, force: true });
  assert.equal(checkSubmodules(root), 1);
}));
test('inherited Git repository and object context cannot override fresh verification', () => fixture(({ root, remote }) => {
  const keys = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'];
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.GIT_DIR = join(remote, '.git');
    process.env.GIT_WORK_TREE = remote;
    process.env.GIT_OBJECT_DIRECTORY = join(remote, '.git', 'objects');
    process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = join(remote, '.git', 'objects');
    assert.equal(checkSubmodules(root), 0);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
  assert.equal(git(remote, 'config', '--get', 'core.bare'), 'false');
}));
for (const kind of ['missing URL', 'relative URL', 'malformed configuration']) {
  test(`${kind} fails closed`, () => fixture(({ root }) => {
    if (kind === 'missing URL') git(root, 'config', '-f', '.gitmodules', '--unset', 'submodule.fork.url');
    else if (kind === 'relative URL') git(root, 'config', '-f', '.gitmodules', 'submodule.fork.url', '../remote');
    else writeFileSync(join(root, '.gitmodules'), '[broken');
    git(root, 'add', '.gitmodules'); git(root, 'commit', '-qm', kind);
    assert.equal(checkSubmodules(root), 1);
  }));
}
test('global URL rewrite cannot substitute a local source for an unavailable declared remote', () => fixture(({ root, remote }) => {
  const declared = 'https://unavailable.example.test/fork.git';
  git(root, 'config', '-f', '.gitmodules', 'submodule.fork.url', declared);
  git(root, 'add', '.gitmodules'); git(root, 'commit', '-qm', 'declared source');
  const config = join(root, 'isolated-global-config');
  git(root, 'config', '-f', config, `url.${remote}.insteadOf`, declared);
  const previous = process.env.GIT_CONFIG_GLOBAL;
  try {
    process.env.GIT_CONFIG_GLOBAL = config;
    assert.equal(checkSubmodules(root), 1);
  } finally {
    if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = previous;
  }
}));
