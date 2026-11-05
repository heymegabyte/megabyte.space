import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectRolloutEvidence } from './collect-rollout-evidence.mjs';

const plan = { invocationId: 'run', accountId: 'account', manifestDigest: 'a'.repeat(64), workers: ['backend', 'router'] };
function entry(worker, pass) {
  return { ...plan, worker, outcome: 'success', versionId: `${worker}-v1`, evidenceLevel: 'metadata-only',
    observation: { worker, accountId: plan.accountId, manifestDigest: plan.manifestDigest,
      versionId: `${worker}-v1`, deploymentId: `${worker}-d1`,
      observedAt: `2026-10-29T06:00:0${pass === 'first' ? 0 : 1}Z`,
      allocations: [{ versionId: `${worker}-v1`, percentage: 100 }] } };
}
const collect = (read = entry, checkpoint = async () => {}) => collectRolloutEvidence(plan, { read, checkpoint });

test('two complete sweeps retain only metadata and explicitly partial checkpoints', async () => {
  const calls = []; const snapshots = [];
  const result = await collect((worker, pass) => { calls.push([worker, pass]); return entry(worker, pass); }, s => snapshots.push(s));
  assert.equal(result.complete, true); assert.equal(result.evidenceLevel, 'metadata-only');
  assert.deepEqual(calls, [['backend', 'first'], ['router', 'first'], ['backend', 'confirmation'], ['router', 'confirmation']]);
  assert.equal(snapshots.length, 5); assert.ok(snapshots.every(s => s.complete === false));
  assert.equal(snapshots[0].first.length, 0); assert.equal(snapshots[4].confirmation.length, 2);
});
for (const field of ['deploymentId', 'versionId', 'manifestDigest', 'allocations']) {
  test(`changed ${field} invalidates complete attempt`, async () => {
    const result = await collect((worker, pass) => {
      const e = entry(worker, pass);
      if (worker === 'backend' && pass === 'confirmation') {
        if (field === 'deploymentId') e.observation.deploymentId = 'another-deployment';
        if (field === 'versionId') { e.versionId = e.observation.versionId = 'another-version'; e.observation.allocations[0].versionId = e.versionId; }
        if (field === 'manifestDigest') e.observation.manifestDigest = 'b'.repeat(64);
        if (field === 'allocations') e.observation.allocations[0].percentage = 50;
      }
      return e;
    });
    assert.equal(result.complete, false); assert.equal(result.evidenceLevel, null);
    assert.equal(result.first.length, 2);
    if (field === 'deploymentId' || field === 'versionId') assert.equal(result.confirmation.length, 2);
  });
}
test('redeploy of same version is detected by deployment identity', async () => {
  const result = await collect((worker, pass) => {
    const e = entry(worker, pass); if (pass === 'confirmation') e.observation.deploymentId = 'redeployed'; return e;
  });
  assert.equal(result.complete, false); assert.equal(result.confirmation.length, 2);
  assert.equal(result.errors.length, 2);
});
for (const failedPass of ['first', 'confirmation']) for (const failedWorker of plan.workers) {
  test(`interruption at ${failedPass}/${failedWorker} preserves observed prefix and sanitizes errors`, async () => {
    const snapshots = [];
    const result = await collect((worker, pass) => {
      if (pass === failedPass && worker === failedWorker) throw new Error('PRIVATE provider response');
      return entry(worker, pass);
    }, s => snapshots.push(s));
    assert.equal(result.complete, false); assert.equal(result.evidenceLevel, null);
    assert.ok(!JSON.stringify([result, snapshots]).includes('PRIVATE'));
    assert.equal(result.first.length, failedPass === 'first' ? plan.workers.indexOf(failedWorker) : 2);
    assert.equal(result.confirmation.length, failedPass === 'first' ? 0 : plan.workers.indexOf(failedWorker));
    assert.deepEqual(snapshots.at(-1).errors, result.errors);
  });
}
for (let failAt = 0; failAt < 5; failAt++) test(`checkpoint failure ${failAt} stops further reads`, async () => {
  let saves = 0; let reads = 0;
  const result = await collect((...args) => { reads++; return entry(...args); }, () => {
    if (saves++ === failAt) throw new Error('PRIVATE filesystem detail');
  });
  assert.equal(result.complete, false); assert.equal(reads, failAt);
  assert.deepEqual(result.errors, ['checkpoint failed; durability unknown']);
});
test('restart ignores previous partial data and recollects whole scope', async () => {
  await collect((worker, pass) => { if (worker === 'router') throw Error('interrupt'); return entry(worker, pass); });
  const calls = [];
  const result = await collect((worker, pass) => { calls.push([worker, pass]); return entry(worker, pass); });
  assert.equal(result.complete, true); assert.equal(calls.length, 4); assert.deepEqual(calls[0], ['backend', 'first']);
});
test('earlier confirmation timestamp fails closed', async () => {
  const result = await collect((worker, pass) => {
    const e = entry(worker, pass); if (pass === 'confirmation') e.observation.observedAt = '2026-10-28T00:00:00Z'; return e;
  });
  assert.equal(result.complete, false); assert.equal(result.confirmation.length, 2);
});
test('untrusted extra fields never enter partial evidence', async () => {
  const snapshots = [];
  const result = await collect((worker, pass) => {
    const e = entry(worker, pass); e.response = 'PRIVATE'; e.observation.raw = 'PRIVATE';
    e.observation.allocations[0].raw = 'PRIVATE'; e.evidenceLevel = 'upload-bytes-verified'; return e;
  }, s => snapshots.push(s));
  assert.equal(result.complete, true); assert.equal(result.evidenceLevel, 'metadata-only');
  assert.ok(!JSON.stringify([result, snapshots]).includes('PRIVATE'));
});
test('reader and checkpoint mutation cannot change detached plan or observations', async () => {
  const mutable = structuredClone(plan);
  const result = await collectRolloutEvidence(mutable, {
    read(worker, pass) { mutable.workers.length = 0; return entry(worker, pass); },
    checkpoint(s) { s.plan.workers.length = 0; s.first.length = 0; },
  });
  assert.equal(result.complete, true); assert.equal(result.first.length, 2);
});
test('malformed input invokes neither adapter', async () => {
  const bad = () => { throw Error('must not call'); };
  for (const value of [null, {}, { ...plan, workers: [] }]) {
    assert.equal((await collectRolloutEvidence(value, { read: bad, checkpoint: bad })).complete, false);
  }
  assert.equal((await collectRolloutEvidence(plan)).complete, false);
});
test('independent auth plan stays scoped and does not collect core Workers', async () => {
  const result = await collectRolloutEvidence({ ...plan, workers: ['auth'] }, { read: entry, checkpoint() {} });
  assert.equal(result.complete, true); assert.deepEqual(result.first.map(e => e.worker), ['auth']);
});
test('backend redeploy interleaved with router read invalidates earlier observation', async () => {
  const deployments = { backend: 'backend-d1', router: 'router-d1' };
  const result = await collect((worker, pass) => {
    if (worker === 'router' && pass === 'first') deployments.backend = 'backend-d2';
    const e = entry(worker, pass); e.observation.deploymentId = deployments[worker]; return e;
  });
  assert.equal(result.complete, false); assert.equal(result.confirmation.length, 2);
  assert.deepEqual(result.errors, ['backend: deployment changed during collection']);
});
test('last Worker is re-read and cannot evade invalidation', async () => {
  const result = await collect((worker, pass) => {
    const e = entry(worker, pass);
    if (worker === 'router' && pass === 'confirmation') e.observation.deploymentId = 'router-d2';
    return e;
  });
  assert.equal(result.complete, false); assert.equal(result.confirmation.length, 2);
  assert.deepEqual(result.errors, ['router: deployment changed during collection']);
});
test('a reader returning a different planned Worker cannot satisfy requested scope', async () => {
  const result = await collect((worker, pass) => entry('router', pass));
  assert.equal(result.complete, false); assert.equal(result.first.length, 0);
});
test('changing plan workers getter is read exactly once and frozen before validation', async () => {
  let reads = 0;
  const mutable = {
    invocationId: plan.invocationId, accountId: plan.accountId, manifestDigest: plan.manifestDigest,
    get workers() { reads++; return plan.workers.slice(); },
  };
  const calls = [];
  const result = await collectRolloutEvidence(mutable, {
    read(worker, pass) { calls.push([worker, pass]); return entry(worker, pass); },
    checkpoint() {},
  });
  assert.equal(reads, 1);
  assert.equal(result.complete, true);
  assert.deepEqual(calls, [['backend', 'first'], ['router', 'first'], ['backend', 'confirmation'], ['router', 'confirmation']]);
  assert.deepEqual(result.first.map(item => item.worker), ['backend', 'router']);
});

test('changing observation getter validates the same snapshot that is persisted', async () => {
  let reads = 0;
  let accessesInCall = 0;
  const result = await collect((worker, pass) => {
    const base = entry(worker, pass);
    accessesInCall = 0;
    return {
      ...base,
      get observation() {
        accessesInCall++;
        reads++;
        const drift = accessesInCall === 1 ? 'first-view' : 'second-view';
        return { ...base.observation, deploymentId: `${worker}-${drift}` };
      },
    };
  });
  assert.equal(reads, 4, 'observation must be read exactly once per read call');
  assert.equal(result.complete, true);
  for (const item of [...result.first, ...result.confirmation]) {
    assert.match(item.observation.deploymentId, /first-view$/);
  }
});

test('invalid uncloneable getter value fails closed with partial result', async () => {
  const snapshots = [];
  const result = await collect((worker, pass) => {
    const base = entry(worker, pass);
    if (worker === 'router' && pass === 'first') {
      return { ...base, get observation() { return () => 'uncloneable'; } };
    }
    return base;
  }, s => snapshots.push(s));
  assert.equal(result.complete, false);
  assert.equal(result.evidenceLevel, null);
  assert.equal(result.first.length, 1);
  assert.equal(result.first[0].worker, 'backend');
  assert.deepEqual(result.confirmation, []);
  assert.ok(!JSON.stringify([result, snapshots]).includes('uncloneable'));
});

test('JSON checkpoint round-trips through a real temporary directory', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'rollout-evidence-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'checkpoint.json');
  const persist = snapshot => writeFile(file, JSON.stringify(snapshot));
  const exactPlan = {
    invocationId: plan.invocationId, accountId: plan.accountId,
    manifestDigest: plan.manifestDigest, workers: [...plan.workers],
  };

  const interruptedReads = [];
  const interrupted = await collectRolloutEvidence(plan, {
    read(worker, pass) {
      interruptedReads.push([worker, pass]);
      const e = entry(worker, pass);
      e.response = 'PRIVATE provider response'; e.observation.raw = 'PRIVATE';
      e.observation.allocations[0].raw = 'PRIVATE';
      if (worker === 'router' && pass === 'first') throw new Error('PRIVATE provider response');
      return e;
    },
    checkpoint: persist,
  });

  assert.equal(interrupted.complete, false);
  assert.equal(interrupted.evidenceLevel, null);
  assert.deepEqual(interruptedReads, [['backend', 'first'], ['router', 'first']]);

  const savedText = await readFile(file, 'utf8');
  assert.ok(!savedText.includes('PRIVATE'));
  const saved = JSON.parse(savedText);
  assert.equal(saved.complete, false);
  assert.deepEqual(saved.plan, exactPlan);
  assert.equal(saved.first.length, 1);
  assert.equal(saved.first[0].worker, 'backend');
  assert.equal(saved.first[0].evidenceLevel, 'metadata-only');
  assert.deepEqual(saved.confirmation, []);
  assert.ok(Array.isArray(saved.errors) && saved.errors.length > 0);
  assert.ok(saved.errors.every(error => typeof error === 'string'));
  assert.ok(saved.errors.includes('router: first read failed or invalid metadata'));
  for (const item of saved.first) {
    assert.deepEqual(Object.keys(item).sort(),
      ['accountId', 'evidenceLevel', 'invocationId', 'manifestDigest', 'observation', 'outcome', 'versionId', 'worker']);
    assert.deepEqual(Object.keys(item.observation).sort(),
      ['accountId', 'allocations', 'deploymentId', 'manifestDigest', 'observedAt', 'versionId', 'worker']);
    for (const allocation of item.observation.allocations) {
      assert.deepEqual(Object.keys(allocation).sort(), ['percentage', 'versionId']);
    }
  }

  const freshReads = [];
  const completed = await collectRolloutEvidence(plan, {
    read(worker, pass) {
      freshReads.push([worker, pass]);
      return entry(worker, pass);
    },
    checkpoint: persist,
  });

  assert.equal(completed.complete, true);
  assert.equal(completed.evidenceLevel, 'metadata-only');
  assert.deepEqual(freshReads, [
    ['backend', 'first'], ['router', 'first'], ['backend', 'confirmation'], ['router', 'confirmation'],
  ]);
  assert.deepEqual(completed.first.map(item => item.worker), ['backend', 'router']);
  assert.deepEqual(completed.confirmation.map(item => item.worker), ['backend', 'router']);
  assert.deepEqual(completed.errors, []);
  assert.ok(!JSON.stringify(completed).includes('PRIVATE'));

  const completedText = await readFile(file, 'utf8');
  assert.ok(!completedText.includes('PRIVATE'));
  const completedSaved = JSON.parse(completedText);
  assert.equal(completedSaved.complete, false);
  assert.deepEqual(completedSaved.plan, exactPlan);
  assert.deepEqual(completedSaved.errors, []);
  assert.equal(completedSaved.first.length, 2);
  assert.equal(completedSaved.confirmation.length, 2);
  assert.deepEqual(completedSaved.confirmation.map(item => item.worker), ['backend', 'router']);
});
