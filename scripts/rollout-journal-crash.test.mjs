import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendJournal, readJournal } from './rollout-journal.mjs';

const plan = { invocationId: 'crash-run', accountId: 'account', manifestDigest: 'a'.repeat(64), workers: ['backend'] };
// Faults run in a child so the real parent reader always uses unmodified filesystem IO.
const childSource = `
import { mock } from 'node:test';
import * as fs from 'node:fs/promises';
const [directory, phase, mode, moduleUrl] = process.argv.slice(1);
const inputPlan = { invocationId: 'mutation-run', accountId: 'account', manifestDigest: 'a'.repeat(64), workers: ['backend'] };
async function boundary(name) {
  const combined = { 'write-and-close': ['before-write', 'file-close'],
    'link-and-unlink': ['before-link', 'pending-unlink'],
    'sync-and-close': ['directory-sync', 'directory-close'] };
  if (phase !== name && !combined[phase]?.includes(name)) return;
  if (mode === 'fail') throw new Error('injected persistence failure at ' + name);
  process.send({ boundary: name });
  await new Promise(() => {});
}
mock.module('node:fs/promises', { namedExports: {
  ...fs,
  open: async (...args) => {
    const handle = await fs.open(...args);
    return {
      writeFile: async (...values) => {
        if (mode === 'mutate') inputPlan.workers.push('bad worker');
        await boundary('before-write');
        if (phase === 'partial-write') {
          await handle.writeFile(values[0].slice(0, 17));
          await boundary('partial-write');
        }
        return handle.writeFile(...values);
      },
      close: async () => {
        await handle.close();
        await boundary(args[1] === 'r' ? 'directory-close' : 'file-close');
      },
      sync: async () => {
        const kind = args[1] === 'r' ? 'directory-sync' : 'file-sync';
        await boundary(kind);
        return handle.sync();
      },
    };
  },
  link: async (...args) => {
    await boundary('before-link');
    await fs.link(...args);
    await boundary('after-link');
  },
  unlink: async (...args) => { await boundary('pending-unlink'); return fs.unlink(...args); },
} });
const { appendJournal } = await import(moduleUrl);
let uploads = 0;
const upload = () => { uploads += 1; }; // Isolated caller stand-in; no provider calls.
try {
  await appendJournal(directory, mode === 'mutate' ? { plan: inputPlan } : { kind: 'intent', worker: 'backend' });
  upload();
  process.send({ result: 'resolved', uploads });
} catch (error) {
  process.send({ result: 'rejected', message: error.message, uploads,
    failures: error instanceof AggregateError ? error.errors.map(e => e.message) : [],
    cause: error.cause?.message });
}
process.disconnect();
`;

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'rollout-crash-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await appendJournal(directory, { plan });
  return directory;
}
async function runChild(t, directory, phase, mode) {
  const child = spawn(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', childSource,
    directory, phase, mode, new URL('./rollout-journal.mjs', import.meta.url).href],
  { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let stderr = '';
  child.stderr.on('data', bytes => { stderr += bytes; });
  const exited = once(child, 'exit');
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  const message = await Promise.race([
    once(child, 'message').then(([value]) => value),
    exited.then(([code, signal]) => { throw new Error(`child exited before boundary: ${code}/${signal} ${stderr}`); }),
  ]);
  if (mode === 'kill') {
    assert.equal(message.boundary, phase);
    child.kill('SIGKILL');
    const [code, signal] = await exited;
    assert.equal(code, null); assert.equal(signal, 'SIGKILL');
  } else {
    assert.equal(message.result, mode === 'mutate' ? 'resolved' : 'rejected');
    if (mode !== 'mutate') {
      assert.match(message.message, /injected persistence failure/);
      assert.equal(message.uploads, 0, 'caller must stop after a rejected intent append');
      if (['write-and-close', 'link-and-unlink', 'sync-and-close'].includes(phase)) {
        const expected = {
          'write-and-close': ['before-write', 'file-close'],
          'link-and-unlink': ['before-link', 'pending-unlink'],
          'sync-and-close': ['directory-sync', 'directory-close'],
        }[phase];
        assert.deepEqual(message.failures, expected.map(name => 'injected persistence failure at ' + name));
        assert.equal(message.cause, message.failures[0]);
        for (const failure of message.failures) assert.ok(message.message.includes(failure));
      }
      if (phase === 'write-and-close') {
        assert.match(message.message, /before-write/);
        assert.match(message.message, /file-close/);
      }
      if (phase === 'link-and-unlink') {
        assert.match(message.message, /before-link/);
        assert.match(message.message, /pending-unlink/);
      }
    }
    const [code, signal] = await exited;
    assert.equal(code, 0, stderr);
    assert.equal(signal, null);
  }
}

for (const phase of ['file-sync', 'directory-sync']) {
  test(`${phase} failure rejects append and recovery never implies completion`, { timeout: 10000 }, async t => {
    const directory = await fixture(t);
    await runChild(t, directory, phase, 'fail');
    const recovered = await readJournal(directory);
    assert.equal(recovered.complete, false);
    assert.equal(recovered.workers[0].outcome, phase === 'directory-sync' ? 'pending' : 'not-started');
    if (phase === 'directory-sync') {
      // Readability after failed fsync is not durability; never blindly upload again.
      await assert.rejects(appendJournal(directory, { kind: 'intent', worker: 'backend' }), /invalid journal transition/);
    }
  });
}
for (const phase of ['file-sync', 'before-link', 'directory-sync']) {
  test(`SIGKILL at ${phase} recovers only the committed prefix`, { timeout: 10000 }, async t => {
    const directory = await fixture(t);
    await runChild(t, directory, phase, 'kill');
    const recovered = await readJournal(directory);
    const linked = phase === 'directory-sync';
    assert.equal(recovered.events.length, linked ? 2 : 1);
    assert.equal(recovered.workers[0].outcome, linked ? 'pending' : 'not-started');
    assert.equal(recovered.complete, false);
    assert.ok((await readdir(directory)).some(name => name.startsWith('.pending-')));
    if (linked) await assert.rejects(appendJournal(directory, { kind: 'intent', worker: 'backend' }));
    else {
      await appendJournal(directory, { kind: 'intent', worker: 'backend' });
      assert.equal((await readJournal(directory)).workers[0].outcome, 'pending');
    }
  });
}

for (const phase of ['before-write', 'before-link']) {
  test(`${phase} failure preserves the committed prefix and permits a fresh append`, { timeout: 10000 }, async t => {
    const directory = await fixture(t);
    const before = await readJournal(directory);
    await runChild(t, directory, phase, 'fail');
    assert.deepEqual(await readJournal(directory), before);
    await appendJournal(directory, { kind: 'intent', worker: 'backend' });
    const recovered = await readJournal(directory);
    assert.equal(recovered.events.length, 2);
    assert.equal(recovered.workers[0].outcome, 'pending');
    assert.equal(recovered.complete, false);
  });
}

test('mutation at the write boundary cannot change the successfully persisted plan', { timeout: 10000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'rollout-mutation-write-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await runChild(t, directory, 'unused', 'mutate');
  const recovered = await readJournal(directory);
  assert.equal(recovered.events.length, 1);
  assert.deepEqual(recovered.plan.workers, ['backend']);
  assert.equal(recovered.plan.invocationId, 'mutation-run');
  assert.equal(recovered.complete, false);
});

for (const phase of ['partial-write', 'after-link', 'file-close', 'pending-unlink']) {
  test(`${phase} real-operation failure has an explicit recovery boundary`, { timeout: 10000 }, async t => {
    const directory = await fixture(t);
    const originalPlan = await readFile(join(directory, '00000000.json'), 'utf8');
    await runChild(t, directory, phase, 'fail');
    const linked = ['after-link', 'pending-unlink'].includes(phase);
    const files = (await readdir(directory)).sort();
    assert.deepEqual(files.filter(name => /^\d{8}\.json$/.test(name)),
      linked ? ['00000000.json', '00000001.json'] : ['00000000.json']);
    assert.equal(await readFile(join(directory, '00000000.json'), 'utf8'), originalPlan);
    const pending = files.filter(name => name.startsWith('.pending-'));
    assert.equal(pending.length, phase === 'after-link' ? 0 : 1);
    if (pending.length) {
      const bytes = await readFile(join(directory, pending[0]), 'utf8');
      if (phase === 'partial-write') {
        assert.equal(bytes, '{"sequence":1,"pr');
        assert.throws(() => JSON.parse(bytes));
      } else {
        assert.equal(JSON.parse(bytes).kind, 'intent');
      }
    }
    const recovered = await readJournal(directory);
    assert.equal(recovered.events.length, linked ? 2 : 1);
    assert.equal(recovered.workers[0].outcome, linked ? 'pending' : 'not-started');
    assert.equal(recovered.complete, false);
    if (linked) {
      await assert.rejects(appendJournal(directory, { kind: 'intent', worker: 'backend' }),
        /invalid journal transition/);
    } else {
      await appendJournal(directory, { kind: 'intent', worker: 'backend' });
      assert.equal((await readJournal(directory)).workers[0].outcome, 'pending');
      // A fresh append never deletes the interrupted writer's pending file.
      assert.deepEqual((await readdir(directory)).filter(name => name.startsWith('.pending-')), pending);
    }
  });
}

for (const phase of ['write-and-close', 'link-and-unlink']) {
  test(`${phase} preserves original and cleanup failure context`, { timeout: 10000 }, async t => {
    const directory = await fixture(t);
    const before = await readJournal(directory);
    await runChild(t, directory, phase, 'fail');
    assert.deepEqual(await readJournal(directory), before);
    const files = await readdir(directory);
    assert.deepEqual(files.filter(name => /^\d{8}\.json$/.test(name)), ['00000000.json']);
    assert.equal(files.filter(name => name.startsWith('.pending-')).length, 1);
    await appendJournal(directory, { kind: 'intent', worker: 'backend' });
    assert.equal((await readJournal(directory)).workers[0].outcome, 'pending');
  });
}

test('directory sync and close failures preserve both causes after real link', { timeout: 10000 }, async t => {
  const directory = await fixture(t);
  await runChild(t, directory, 'sync-and-close', 'fail');
  const recovered = await readJournal(directory);
  assert.equal(recovered.events.length, 2);
  assert.equal(recovered.workers[0].outcome, 'pending');
  assert.equal(recovered.complete, false);
  assert.deepEqual((await readdir(directory)).sort(), ['00000000.json', '00000001.json']);
  await assert.rejects(appendJournal(directory, { kind: 'intent', worker: 'backend' }),
    /invalid journal transition/);
});
