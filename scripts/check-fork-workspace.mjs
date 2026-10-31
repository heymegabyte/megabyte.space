#!/usr/bin/env node
/** Local prerequisite for fork dependency consumers. This is neither a remote
 * fetchability check nor a clean-tree/build/deployment acceptance check. */
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkForkWorkspace(root) {
  const fork = join(root, 'cloudflare-os');
  // Ambient Git routing must not make a parent repository look like the fork.
  const env = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0' };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_') && !['GIT_NO_REPLACE_OBJECTS', 'GIT_TERMINAL_PROMPT'].includes(key)) delete env[key];
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  let expectedHead = null;
  let actualHead = null;
  try {
    const entry = git(root, 'ls-tree', 'HEAD', '--', 'cloudflare-os');
    const match = /^160000 commit ([a-f0-9]{40,64})\tcloudflare-os$/.exec(entry);
    if (!match) throw new Error('committed cloudflare-os gitlink is missing');
    expectedHead = match[1];
    if (!existsSync(join(fork, '.git'))) throw new Error('fork has no own .git marker; initialize the pinned submodule');
    if (realpathSync(git(fork, 'rev-parse', '--show-toplevel')) !== realpathSync(fork)) throw new Error('fork Git top-level is not its workspace');
    const commonDir = (cwd) => realpathSync(resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir')));
    if (commonDir(fork) === commonDir(root)) throw new Error('fork uses the parent Git directory, not its own top-level repository');
    actualHead = git(fork, 'rev-parse', '--verify', 'HEAD^{commit}');
    if (actualHead !== expectedHead) throw new Error('fork HEAD differs from committed gitlink');
    if (!statSync(join(fork, 'packages/router/package.json')).isFile()) throw new Error('fork router package is missing');
    return { ok: true, expectedHead, actualHead };
  } catch (error) {
    // Avoid returning raw Git stderr or environment values to fleet receipts.
    const message = error instanceof Error ? error.message : 'workspace inspection failed';
    const safe = message.startsWith('Command failed:') ? 'fork Git inspection failed' : message.startsWith('ENOENT:') ? 'fork router package is missing' : message;
    return { ok: false, expectedHead, actualHead, error: safe };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkForkWorkspace(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
