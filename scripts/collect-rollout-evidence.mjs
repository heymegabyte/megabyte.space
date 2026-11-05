import { assessRollout } from './rollout-evidence.mjs';

// Only allowlisted metadata enters checkpoints. Never retain arbitrary API fields.
// Each getter is read exactly once, so validation and persistence see one snapshot.
// The supplied evidenceLevel is retained for validation; it is not trusted metadata.
function metadata(entry) {
  const observation = entry.observation;
  return {
    invocationId: entry.invocationId, accountId: entry.accountId,
    manifestDigest: entry.manifestDigest, worker: entry.worker,
    outcome: entry.outcome, versionId: entry.versionId, evidenceLevel: entry.evidenceLevel,
    observation: {
      worker: observation.worker, accountId: observation.accountId,
      versionId: observation.versionId, manifestDigest: observation.manifestDigest,
      deploymentId: observation.deploymentId, observedAt: observation.observedAt,
      allocations: Array.from(observation.allocations, ({ versionId, percentage }) => ({ versionId, percentage })),
    },
  };
}

function identity(entry) {
  const { observedAt, ...observation } = entry.observation;
  return JSON.stringify(observation);
}

/**
 * Offline collection protocol; adapters supply trusted exact-version read-back.
 * read(worker, pass) returns an assessRollout entry. checkpoint(snapshot) must
 * resolve only when its chosen storage has accepted that partial snapshot.
 * No provider calls, storage implementation, retries or upload behavior live here.
 *
 * Each invocation starts over: first pass, then a full confirmation pass. A
 * changed deployment invalidates the whole attempt; no entries survive a retry.
 * Matching sweeps establish bounded metadata observations, never atomic estate
 * state, source attestation, future freshness or detection of between-read ABA.
 */
export async function collectRolloutEvidence(inputPlan, { read, checkpoint } = {}) {
  // Detach caller-owned inputs before validation and before the first await, so
  // validation and collection never observe different plan snapshots.
  let plan;
  try {
    plan = {
      invocationId: inputPlan.invocationId, accountId: inputPlan.accountId,
      manifestDigest: inputPlan.manifestDigest,
      workers: Array.from(inputPlan.workers),
    };
  } catch {
    return { complete: false, evidenceLevel: null, errors: ['invalid collection inputs'], first: [], confirmation: [] };
  }
  if (assessRollout(plan, []).errors.includes('invalid plan') ||
      typeof read !== 'function' || typeof checkpoint !== 'function') {
    return { complete: false, evidenceLevel: null, errors: ['invalid collection inputs'], first: [], confirmation: [] };
  }
  const first = [];
  const confirmation = [];
  const errors = [];
  const snapshot = () => structuredClone({ plan, complete: false, first, confirmation, errors });
  const finish = () => ({
    complete: errors.length === 0, evidenceLevel: errors.length ? null : 'metadata-only',
    errors: [...errors], first: structuredClone(first), confirmation: structuredClone(confirmation),
  });
  const save = async () => {
    try { await checkpoint(snapshot()); return true; }
    catch { errors.push('checkpoint failed; durability unknown'); return false; }
  };
  // Persist scope before reads. Every checkpoint remains explicitly partial.
  if (!await save()) return finish();
  for (const [pass, destination] of [['first', first], ['confirmation', confirmation]]) {
    for (const worker of plan.workers) {
      let entry;
      try {
        const candidate = await read(worker, pass);
        // Detach the allowlisted read result before validation. If a getter throws
        // or yields an uncloneable value, fail closed rather than partially persist.
        const detached = metadata(candidate);
        const verdict = assessRollout({ ...plan, workers: [worker] }, [detached]);
        if (!verdict.complete) throw new Error('invalid metadata');
        // Validation passed on the detached copy; persist only metadata-only.
        detached.evidenceLevel = 'metadata-only';
        entry = detached;
      } catch {
        errors.push(`${worker}: ${pass} read failed or invalid metadata`);
        await save();
        return finish();
      }
      destination.push(entry);
      if (pass === 'confirmation') {
        const previous = first.find(item => item.worker === worker);
        if (identity(previous) !== identity(entry)) errors.push(`${worker}: deployment changed during collection`);
        if (Date.parse(entry.observation.observedAt) < Date.parse(previous.observation.observedAt)) {
          errors.push(`${worker}: confirmation predates first observation`);
        }
      }
      if (!await save()) return finish();
    }
  }
  return finish();
}
