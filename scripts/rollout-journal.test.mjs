import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendJournal, readJournal } from './rollout-journal.mjs';
const plan = { invocationId: 'run-1', accountId: 'account', manifestDigest: 'a'.repeat(64), workers: ['backend', 'router'] };
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'rollout-journal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await appendJournal(directory, { plan }); return directory;
}
test('restart preserves pending intent and cannot credit completion', async t => {
  const d = await fixture(t);
  await appendJournal(d, { kind: 'intent', worker: 'backend', secret: 'discard-me' });
  assert.deepEqual((await readJournal(d)).workers, [{ worker: 'backend', outcome: 'pending' }, { worker: 'router', outcome: 'not-started' }]);
  assert.equal((await readFile(join(d, '00000001.json'), 'utf8')).includes('discard-me'), false);
  assert.equal((await stat(join(d, '00000001.json'))).mode & 0o777, 0o600);
  await assert.rejects(appendJournal(d, { kind: 'intent', worker: 'backend' }));
  await appendJournal(d, { kind: 'outcome', worker: 'backend', outcome: 'unknown' });
  assert.equal((await readJournal(d)).complete, false);
});
test('scope, order, duplicate outcome and missing success ID fail closed', async t => {
  const d = await fixture(t);
  for (const input of [{ kind: 'intent', worker: 'auth' }, { kind: 'outcome', worker: 'backend', outcome: 'failed' }])
    await assert.rejects(appendJournal(d, input));
  await appendJournal(d, { kind: 'intent', worker: 'backend' });
  await assert.rejects(appendJournal(d, { kind: 'outcome', worker: 'backend', outcome: 'success' }));
  await appendJournal(d, { kind: 'outcome', worker: 'backend', outcome: 'success', versionId: 'v1' });
  await assert.rejects(appendJournal(d, { kind: 'outcome', worker: 'backend', outcome: 'failed' }));
});
test('concurrent writers cannot overwrite an event', async t => {
  const d = await fixture(t);
  const results = await Promise.allSettled(['backend', 'router'].map(worker => appendJournal(d, { kind: 'intent', worker })));
  const committed = results.filter(r => r.status === 'fulfilled').length;
  assert.ok(committed >= 1);
  const recovered = await readJournal(d);
  assert.equal(recovered.events.length, committed + 1);
  assert.equal(new Set(recovered.events.slice(1).map(e => e.worker)).size, committed);
});
test('gap, changed chain and truncated committed event reject recovery', async t => {
  const d = await fixture(t);
  await appendJournal(d, { kind: 'intent', worker: 'backend' });
  const path = join(d, '00000001.json');
  const original = await readFile(path, 'utf8');
  await writeFile(path, '{'); await assert.rejects(readJournal(d));
  await writeFile(path, original.replace(/"previous":"[a-f0-9]+"/, '"previous":"wrong"')); await assert.rejects(readJournal(d));
  await writeFile(path, original); await unlink(join(d, '00000000.json')); await assert.rejects(readJournal(d));
});
test('uncommitted temporary files are ignored and failed directory access throws', async t => {
  const d = await fixture(t);
  await writeFile(join(d, '.pending-interrupted'), '{');
  assert.equal((await readJournal(d)).events.length, 1);
  await assert.rejects(appendJournal(join(d, 'absent'), { plan }));
});
test('sparse plans are rejected before writing committed evidence', async t => {
  const d = await mkdtemp(join(tmpdir(), 'rollout-sparse-'));
  t.after(() => rm(d, { recursive: true, force: true }));
  await assert.rejects(appendJournal(d, { plan: { ...plan, workers: Array(1) } }));
  assert.equal((await readJournal(d)).events.length, 0);
});

test('caller mutation during write cannot change the validated plan', async t => {
  const d = await mkdtemp(join(tmpdir(), 'rollout-mutation-'));
  t.after(() => rm(d, { recursive: true, force: true }));
  const input = { ...plan, workers: [...plan.workers] };
  // Initial read is async. Mutation is scheduled after that read, during file IO.
  const append = appendJournal(d, { plan: input });
  const timer = setInterval(() => { input.workers.push('bad worker'); }, 1);
  try {
    await append.catch(() => {});
    const journal = await readJournal(d);
    assert.ok(journal.events.length === 0 || journal.plan.workers.every(w => !w.includes(' ')));
  } finally { clearInterval(timer); }
});

test('coercible digest objects reject before persisting an unreadable plan', async t => {
  const d = await mkdtemp(join(tmpdir(), 'rollout-digest-'));
  t.after(() => rm(d, { recursive: true, force: true }));
  const manifestDigest = { toString() { return 'a'.repeat(64); } };
  await assert.rejects(appendJournal(d, { plan: { ...plan, manifestDigest } }), /invalid journal plan/);
  assert.equal((await readJournal(d)).events.length, 0);
  await appendJournal(d, { plan });
  assert.deepEqual((await readJournal(d)).plan, plan);
});
