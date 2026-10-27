import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(corrupt = false, failStage = "", small = false) {
  const dir = mkdtempSync(join(tmpdir(), 'auth-backup-test-'));
  const scratch = join(dir, 'scratch');
  mkdirSync(scratch);
  writeFileSync(join(dir, 'npx'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_CALLS, JSON.stringify(args) + '\\n');
if (process.env.TEST_FAIL_STAGE && args.includes(process.env.TEST_FAIL_STAGE)) process.exit(7);
const output = args[args.indexOf('--output') + 1];
const file = args[args.indexOf('--file') + 1];
if (args.includes('export')) {
  fs.writeFileSync(output, 'CREATE TABLE users(id TEXT);\\n' + 'a'.repeat(process.env.TEST_SMALL === '1' ? 1 : 1500));
  fs.writeFileSync(process.env.TEST_MODE, String(fs.statSync(output).mode & 0o777));
}
if (args.includes('put')) fs.copyFileSync(file, process.env.TEST_OBJECT);
if (args.includes('get')) {
  const content = fs.readFileSync(process.env.TEST_OBJECT, 'utf8');
  fs.writeFileSync(file, process.env.TEST_CORRUPT === '1' ? content.replace('aaaa', 'bbbb') : content);
}
`, { mode: 0o755 });
  const result = spawnSync('bash', [resolve('scripts/backup-auth-d1.sh')], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, TMPDIR: scratch,
      CLOUDFLARE_API_KEY: 'fixture-only', TEST_FAIL_STAGE: failStage, TEST_SMALL: small ? '1' : '0', TEST_CALLS: join(dir, 'calls'),
      TEST_OBJECT: join(dir, 'object'), TEST_MODE: join(dir, 'mode'), TEST_CORRUPT: corrupt ? '1' : '0' },
  });
  const evidence = { ...result, calls: readFileSync(join(dir, 'calls'), 'utf8').trim().split('\n').map(JSON.parse),
    mode: failStage === "export" ? null : Number(readFileSync(join(dir, 'mode'), 'utf8')), leftovers: readdirSync(scratch) };
  rmSync(dir, { recursive: true, force: true });
  return evidence;
}

test('backup targets remote R2 and cleans private temporary exports', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 3);
  assert.deepEqual(result.calls[0].slice(0, 4), ['-y', 'pnpm@11.17.0', 'exec', 'wrangler']);
  assert.ok(result.calls[0].includes('export'));
  assert.ok(result.calls[0].includes('--remote'));
  for (const call of result.calls.filter(args => args.includes('object'))) {
    assert.ok(call.includes('--remote'), 'R2 object operation must use remote storage');
  }
  assert.equal(result.mode, 0o600, 'SQL export contains authentication data');
  assert.deepEqual(result.leftovers, []);
});

test('backup rejects same-size corruption instead of reporting success', () => {
  const result = run(true);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /✅ verified/);
  assert.deepEqual(result.leftovers, []);
});

for (const stage of ['export', 'put', 'get']) {
  test(`backup fails closed and cleans temporary SQL after ${stage} failure`, () => {
    const result = run(false, stage);
    assert.equal(result.status, 7);
    assert.doesNotMatch(result.stdout, /✅ verified/);
    assert.equal(result.calls.length, ['export', 'put', 'get'].indexOf(stage) + 1);
    assert.deepEqual(result.leftovers, []);
  });
}

test('undersized export is rejected before upload', () => {
  const result = run(false, '', true);
  assert.notEqual(result.status, 0);
  assert.equal(result.calls.length, 1);
  assert.doesNotMatch(result.stdout, /✅ verified/);
  assert.deepEqual(result.leftovers, []);
});
