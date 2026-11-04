/** Offline immutable upload-intent journal. Not a receipt, uploader or remote collector. */
import { open, readFile, readdir, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

// Cleanup must run, but must not replace the persistence failure that caused it.
async function withCleanup(operation, cleanup) {
  let failure;
  let failed = false;
  try { return await operation(); }
  catch (error) { failure = error; failed = true; throw error; }
  finally {
    try { await cleanup(); }
    catch (error) {
      if (failed) throw new AggregateError([failure, error],
        `${failure.message}; cleanup failed: ${error.message}`, { cause: failure });
      throw error;
    }
  }
}

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const filename = sequence => `${String(sequence).padStart(8, '0')}.json`;
function validate(events) {
  let plan;
  const states = new Map();
  for (const [sequence, event] of events.entries()) {
    if (event.sequence !== sequence || event.previous !== (sequence ? digest(events[sequence - 1]) : null))
      throw new Error('journal sequence or hash mismatch');
    if (sequence === 0) {
      plan = event.plan;
      if (event.kind !== 'plan' || !plan || !text(plan.invocationId) || !text(plan.accountId) ||
          typeof plan.manifestDigest !== 'string' || !/^[a-f0-9]{64}$/.test(plan.manifestDigest) || !Array.isArray(plan.workers) ||
          !plan.workers.length || !Array.from(plan.workers).every(text) || new Set(plan.workers).size !== plan.workers.length)
        throw new Error('invalid journal plan');
    } else {
      if (!plan.workers.includes(event.worker)) throw new Error('Worker outside planned scope');
      if (event.kind === 'intent' && !states.has(event.worker)) states.set(event.worker, 'pending');
      else if (event.kind === 'outcome' && states.get(event.worker) === 'pending' &&
          ['success', 'failed', 'unknown'].includes(event.outcome) &&
          (event.versionId === null || text(event.versionId)) &&
          (event.outcome !== 'success' || event.versionId !== null)) states.set(event.worker, event.outcome);
      else throw new Error('invalid journal transition');
    }
  }
  return { plan, states };
}

/** Directory must already exist, be private and trusted. Only numbered committed files are read. */
export async function readJournal(directory) {
  const files = (await readdir(directory)).filter(name => /^\d{8}\.json$/.test(name)).sort();
  const events = [];
  for (const [sequence, name] of files.entries()) {
    if (name !== filename(sequence)) throw new Error('journal gap');
    events.push(JSON.parse(await readFile(join(directory, name), 'utf8')));
  }
  const { plan, states } = validate(events);
  return { events, plan, workers: plan?.workers.map(worker => ({ worker, outcome: states.get(worker) ?? 'not-started' })), complete: false };
}

/** Persist before upload; pending/unknown outcomes require reconciliation, never blind retry.
 * Concurrent appends race on an exclusive hard link; loser must reload and reconcile.
 * Failed fsync means durability is unknown: stop, even if the new event is readable.
 */
export async function appendJournal(directory, input) {
  const { events } = await readJournal(directory);
  const event = { sequence: events.length, previous: events.length ? digest(events.at(-1)) : null };
  if (!events.length) {
    const p = input.plan;
    Object.assign(event, { kind: 'plan', plan: p && { invocationId: p.invocationId, accountId: p.accountId, manifestDigest: p.manifestDigest, workers: Array.isArray(p.workers) ? Array.from(p.workers) : p.workers } });
  } else if (input.kind === 'intent') Object.assign(event, { kind: 'intent', worker: input.worker });
  else Object.assign(event, { kind: input.kind, worker: input.worker, outcome: input.outcome, versionId: input.versionId ?? null });
  validate([...events, event]);
  const serialized = JSON.stringify(event) + '\n';
  const temporary = join(directory, `.pending-${randomUUID()}`);
  const handle = await open(temporary, 'wx', 0o600);
  await withCleanup(async () => {
    await handle.writeFile(serialized);
    await handle.sync();
  }, () => handle.close());
  await withCleanup(async () => {
    await link(temporary, join(directory, filename(events.length)));
    const dir = await open(directory, 'r');
    await withCleanup(() => dir.sync(), () => dir.close());
  }, () => unlink(temporary));
  return event;
}
