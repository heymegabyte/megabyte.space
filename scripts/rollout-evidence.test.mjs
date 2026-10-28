import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessRollout } from './rollout-evidence.mjs';

const plan = { invocationId: 'run-1', accountId: 'account', manifestDigest: 'a'.repeat(64), workers: ['backend', 'router'] };
function result(worker) {
  return { ...plan, workers: undefined, worker, outcome: 'success', versionId: `${worker}-v1`, evidenceLevel: 'metadata-only',
    observation: { worker, accountId: plan.accountId, versionId: `${worker}-v1`, manifestDigest: plan.manifestDigest,
      deploymentId: 'deployment-1', observedAt: '2026-10-27T18:00:00Z',
      allocations: [{ versionId: `${worker}-v1`, percentage: 100 }] } };
}
const results = () => plan.workers.map(result);
test('complete metadata coverage does not imply source attestation', () => {
  assert.deepEqual(assessRollout(plan, results()), { complete: true, evidenceLevel: 'metadata-only', errors: [] });
});
test('mixed evidence labels remain metadata-only', () => {
  const entries = results(); entries[0].evidenceLevel = 'upload-bytes-verified';
  assert.equal(assessRollout(plan, entries).evidenceLevel, 'metadata-only');
});
for (const [name, mutate] of [
  ['first Worker failure', e => { e[0].outcome = 'failed'; }],
  ['last Worker lost response', e => { e[1].outcome = 'unknown'; delete e[1].versionId; }],
  ['missing result', e => e.pop()],
  ['duplicate result', e => e.push(e[0])],
  ['extra Worker', e => e.push(result('auth'))],
  ['other invocation', e => { e[0].invocationId = 'run-2'; }],
  ['other account', e => { e[0].observation.accountId = 'other'; }],
  ['other manifest', e => { e[0].observation.manifestDigest = 'b'.repeat(64); }],
  ['other version', e => { e[0].observation.versionId = 'other'; }],
  ['upload account mismatch', e => { e[0].accountId = 'other'; }],
  ['upload manifest mismatch', e => { e[0].manifestDigest = 'b'.repeat(64); }],
  ['missing deployment ID', e => { delete e[0].observation.deploymentId; }],
  ['no read-back', e => { delete e[0].observation; }],
  ['invalid observation time', e => { e[0].observation.observedAt = 'unknown'; }],
  ['zero traffic', e => { e[0].observation.allocations[0].percentage = 0; }],
  ['split traffic', e => { e[0].observation.allocations = [{ versionId: 'backend-v1', percentage: 50 }, { versionId: 'old', percentage: 50 }]; }],
  ['observed allocation differs from uploaded version', e => { e[0].observation.allocations[0].versionId = 'newer'; }],
  ['unknown evidence level', e => { e[0].evidenceLevel = 'trusted'; }],
]) test(name, () => {
  const entries = results(); mutate(entries);
  const verdict = assessRollout(plan, entries);
  assert.equal(verdict.complete, false); assert.equal(verdict.evidenceLevel, null); assert.ok(verdict.errors.length);
});
test('invalid plans and missing entries fail closed', () => {
  for (const invalid of [null, {}, { ...plan, workers: [] }, { ...plan, workers: Array(1) }, { ...plan, workers: ['router', 'router'] }, { ...plan, manifestDigest: 'short' }])
    assert.equal(assessRollout(invalid, results()).complete, false);
  assert.equal(assessRollout(plan, null).complete, false);
});
test('independent auth scope cannot satisfy the core plan', () => {
  const authPlan = { ...plan, workers: ['auth'] };
  assert.equal(assessRollout(authPlan, [result('auth')]).complete, true);
  assert.equal(assessRollout(plan, [result('auth')]).complete, false);
});

test('unsubstantiated high levels never promote metadata coverage to byte attestation', () => {
  const entries = results();
  for (const entry of entries) entry.evidenceLevel = 'upload-bytes-verified';
  assert.equal(assessRollout(plan, entries).evidenceLevel, 'metadata-only');
});

for (const timestamp of ['0', '2026-02-30T18:00:00Z', '2026-10-27', '2026-10-27T18:00:00'])
  test(`ambiguous or normalized observation time: ${timestamp}`, () => {
    const entries = results(); entries[0].observation.observedAt = timestamp;
    assert.equal(assessRollout(plan, entries).complete, false);
  });
test('millisecond UTC observation time accepted', () => {
  const entries = results(); entries[0].observation.observedAt = '2026-10-27T18:00:00.123Z';
  assert.equal(assessRollout(plan, entries).complete, true);
});
test('malformed JSON entry shapes fail closed without throwing', () => {
  for (const value of [null, false, 1, 'entry', [], {}]) {
    assert.equal(assessRollout(plan, [value]).complete, false);
    const entries = results(); entries[0].observation = value;
    assert.equal(assessRollout(plan, entries).complete, false);
    const allocated = results(); allocated[0].observation.allocations = [value];
    assert.equal(assessRollout(plan, allocated).complete, false);
  }
  assert.equal(assessRollout({ ...plan, manifestDigest: [plan.manifestDigest] }, results()).complete, false);
});
