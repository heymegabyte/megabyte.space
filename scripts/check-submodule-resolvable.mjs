#!/usr/bin/env node
/** Prove committed submodule pins can be fetched from their declared URLs.
 * A ref-tip listing cannot decide ancestor availability. Each pin is fetched by
 * SHA into a fresh temporary object store, never the existing fork checkout.
 * This is a provenance gate, not a recommendation to advance reviewed pins.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkSubmodules(root) {
  // Prove the committed tree, never a local refs/replace substitute.
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1' };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE',
    'GIT_SHALLOW_FILE', 'GIT_PREFIX', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT']) {
    delete env[key];
  }
  const git = (cwd, ...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  }).trim();
  let entries;
  const links = new Map();
  try {
    for (const entry of git(root, 'ls-tree', '-r', '-z', 'HEAD').split('\0').filter(Boolean)) {
      const match = entry.match(/^160000 commit ([0-9a-f]{40,64})\t([\s\S]+)$/);
      if (match) links.set(match[2], match[1]);
    }
    if (!git(root, 'ls-tree', 'HEAD', '--', '.gitmodules')) {
      if (links.size) {
        console.error('FAIL: committed gitlinks lack .gitmodules');
        return 1;
      }
      console.log('no committed gitlinks — nothing to check');
      return 0;
    }
    entries = git(root, 'config', '-z', '--blob', 'HEAD:.gitmodules', '--list')
      .split('\0').filter(Boolean);
  } catch {
    console.error('FAIL: cannot inspect committed gitlinks or parse .gitmodules');
    return 1;
  }
  const mods = new Map();
  for (const entry of entries) {
    const split = entry.indexOf('\n');
    const key = entry.slice(0, split);
    const match = key.match(/^submodule\.(.+)\.(path|url)$/);
    if (!match) continue;
    if (!mods.has(match[1])) mods.set(match[1], {});
    const mod = mods.get(match[1]);
    if (Object.hasOwn(mod, match[2])) {
      console.error('FAIL: submodule path and URL must each be declared once');
      return 1;
    }
    mod[match[2]] = entry.slice(split + 1);
  }
  // Match every committed gitlink exactly once before network verification.
  // Enumerating metadata alone would let omitted links silently evade the gate.
  const declared = new Set();
  for (const { path, url } of mods.values()) {
    if (!path || !url || !links.has(path) || declared.has(path)) {
      console.error('FAIL: submodule metadata must declare each gitlink exactly once with a URL');
      return 1;
    }
    declared.add(path);
  }
  if (declared.size !== links.size) {
    console.error('FAIL: committed gitlink missing from .gitmodules');
    return 1;
  }
  let failed = 0;
  for (const [name, { path, url }] of mods) {
    let scratch;
    try {
      if (!path || !url) throw new Error('missing path or url');
      // Use the exact enumerated path, never reinterpret it as a Git pathspec.
      const pin = links.get(path);
      // Relative submodule URLs are relative to the superproject remote, not cwd.
      // Fail closed rather than accidentally proving a different local source.
      if (/^\.\.?\//.test(url)) throw new Error('relative remote URL requires explicit resolution');
      const remote = isAbsolute(url) || /^(?:[a-z][a-z0-9+.-]*:\/\/|[^/]+:)/i.test(url)
        ? url : resolve(root, url);
      scratch = mkdtempSync(join(tmpdir(), 'submodule-resolvable-'));
      git(scratch, 'init', '--bare', '-q');
      if (git(scratch, 'ls-remote', '--get-url', '--', remote) !== remote) {
        throw new Error('Git URL rewrite changes declared source');
      }
      git(scratch, 'fetch', '--no-tags', '--depth=1', '--', remote, pin);
      const fetched = git(scratch, 'rev-parse', '--verify', 'FETCH_HEAD^{commit}');
      if (fetched !== pin) throw new Error('fetch returned a different commit');
      console.log(`PASS  ${name}: committed gitlink ${pin.slice(0, 8)} fetched from declared remote`);
    } catch (error) {
      // Avoid raw Git stderr/URL output: credential-bearing remote URLs can leak.
      const reason = error.status !== undefined || error.code
        ? 'Git verification failed (unavailable source, pin or timeout)'
        : error.message;
      console.error(`FAIL  ${name}: ${reason}`);
      failed++;
    } finally {
      if (scratch) rmSync(scratch, { recursive: true, force: true });
    }
  }
  console.log(failed ? `${failed} unresolvable gitlink(s)` : 'OK — all submodule gitlinks resolvable');
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(checkSubmodules(join(dirname(fileURLToPath(import.meta.url)), '..')));
}
