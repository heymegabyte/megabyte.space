/** Offline rollout correlation only. Does not attest source bytes or mutate receipts. */
const LEVELS = ['metadata-only', 'sealed-inputs', 'upload-bytes-verified'];
const SHA256 = /^[a-f0-9]{64}$/;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
// Collector timestamps are UTC ISO strings, with optional millisecond precision.
const observationTime = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() ===
    (value.includes('.') ? value : value.replace('Z', '.000Z'));
};

/**
 * Validate a single invocation's complete planned scope. Observations must be collected
 * by a trusted caller; accepting this shape does not authenticate remote evidence.
 * Evidence is capped at metadata-only: source/byte claims require separate validation.
 * Traffic uses Cloudflare's percentage units (0–100). Partial results stay incomplete.
 */
export function assessRollout(plan, entries) {
  const errors = [];
  if (!plan || !nonempty(plan.invocationId) || !nonempty(plan.accountId) ||
      (typeof plan.manifestDigest !== 'string' || !SHA256.test(plan.manifestDigest)) || !Array.isArray(plan.workers) ||
      plan.workers.length === 0 || Array.from(plan.workers).some(name => !nonempty(name)) ||
      new Set(plan.workers).size !== plan.workers.length) {
    return { complete: false, evidenceLevel: null, errors: ['invalid plan'] };
  }
  if (!Array.isArray(entries)) return { complete: false, evidenceLevel: null, errors: ['invalid entries'] };
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || !plan.workers.includes(entry.worker) || seen.has(entry.worker)) {
      errors.push('unexpected or duplicate Worker');
      continue;
    }
    seen.add(entry.worker);
    const reject = reason => errors.push(`${entry.worker}: ${reason}`);
    if (entry.invocationId !== plan.invocationId || entry.accountId !== plan.accountId ||
        entry.manifestDigest !== plan.manifestDigest) reject('invocation/account/manifest mismatch');
    if (entry.outcome !== 'success' || !nonempty(entry.versionId)) reject('upload not confirmed');
    const observation = entry.observation;
    if (!observation || observation.versionId !== entry.versionId ||
        observation.manifestDigest !== plan.manifestDigest ||
        observation.accountId !== plan.accountId || observation.worker !== entry.worker ||
        !nonempty(observation.deploymentId) || !observationTime(observation.observedAt)) {
      reject('missing or mismatched exact-version read-back');
    }
    const allocations = observation?.allocations;
    if (!Array.isArray(allocations) || allocations.length !== 1 ||
        allocations[0]?.versionId !== entry.versionId || allocations[0]?.percentage !== 100) {
      reject('intended 100% allocation not observed');
    }
    const level = LEVELS.indexOf(entry.evidenceLevel);
    if (level < 0) reject('invalid evidence level');
  }
  for (const worker of plan.workers) if (!seen.has(worker)) errors.push(`${worker}: missing result`);
  return { complete: errors.length === 0, evidenceLevel: errors.length ? null : 'metadata-only', errors };
}
