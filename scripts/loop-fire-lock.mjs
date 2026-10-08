#!/usr/bin/env node
/**
 * loop-fire-lock — serializes /run-the-loop fires via a file lease.
 *
 * The lease lives at .claude/run-the-loop/.fire-lease.json. A LIVE lease
 * (heartbeat younger than the stale window) means another fire is running:
 * overlapping scheduled fires COALESCE (exit 3) instead of colliding. A stale
 * lease (dead lead) is reclaimed. See .claude/commands/run-the-loop.md §0.
 *
 * Usage:
 *   node scripts/loop-fire-lock.mjs claim --fire <slug> [--run-id <id>]
 *   node scripts/loop-fire-lock.mjs heartbeat --run-id <id> [--phase <phase>]
 *   node scripts/loop-fire-lock.mjs release --run-id <id>
 *   node scripts/loop-fire-lock.mjs handoff --run-id <id> [--wedged] [--note <text>]
 *   node scripts/loop-fire-lock.mjs status
 *
 * `handoff` is §11's INFINITE-loop close: instead of deleting the lease on a clean completion, it
 * writes a `released-handoff` lease with a deliberately stale heartbeat, so space.megabyte.loop-watchdog
 * launches a FRESH `claude -p "run the loop"` within ~10 min and the loop runs forever hands-free (the
 * model cannot self-/clear). Deleting instead would leave NO signal and the loop would idle.
 *
 * `--wedged` writes a `wedged-handoff` instead: the distinct phase a session uses when it hit the
 * Bash-classifier outage at orient + did NO work. The watchdog relaunches on it too but with a
 * SHORT backoff (~10 min, vs ~30 min for a productive `released-handoff`), so the loop retries ~3×
 * faster through an intermittent outage — the single change that stops a wedge from needing a human
 * `/clear`. (During a FULL wedge, node is dead too → write this lease with the Write tool instead;
 * see run-the-loop.md §0. The watchdog triggers on the `wedged-handoff` phase regardless of heartbeat.)
 *
 * Exit codes: 0 ok · 2 usage/error · 3 live lease (coalesce) · 4 not owner.
 * Env: LOOP_FIRE_LEASE_PATH (override lease path, tests) ·
 *      LOOP_FIRE_STALE_MS (override stale window, default 20 min).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_LEASE_PATH = join(REPO_ROOT, ".claude", "run-the-loop", ".fire-lease.json");
export const DEFAULT_STALE_MS = 20 * 60 * 1000;

/**
 * The on-disk fire lease. `note` is only carried on a `released-handoff` (what the watchdog reads).
 * @typedef {object} Lease
 * @property {string} fire
 * @property {string} runId
 * @property {string} phase
 * @property {string} heartbeat
 * @property {string} [note]
 */

/** @returns {string} lease path honoring the env override. */
export function leasePath() {
  return process.env.LOOP_FIRE_LEASE_PATH || DEFAULT_LEASE_PATH;
}

/** @returns {number} stale window in ms honoring the env override. */
export function staleMs() {
  const raw = Number(process.env.LOOP_FIRE_STALE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STALE_MS;
}

/** @returns {Lease|null} parsed lease or null (absent/corrupt). */
export function readLease(path = leasePath()) {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed?.runId !== "string" || typeof parsed?.heartbeat !== "string") return null;
    return parsed;
  } catch {
    return null; // corrupt lease = reclaimable
  }
}

/**
 * @param {Lease|null} lease
 * @returns {boolean} true when the lease heartbeat is within the stale window.
 */
export function isLive(lease, now = Date.now(), windowMs = staleMs()) {
  if (!lease) return false;
  const beat = Date.parse(lease.heartbeat);
  if (!Number.isFinite(beat)) return false;
  return now - beat < windowMs;
}

function writeLease(path, lease) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(lease, null, 2)}\n`);
  renameSync(tmp, path); // atomic on the same volume
}

/**
 * Claim the fire lease.
 * @param {{ fire: string, runId?: string, path?: string, now?: number }} opts
 * @returns {{ok:true,lease:Lease,reclaimed:boolean}|{ok:false,code:3,holder:Lease}}
 */
export function claimLease({ fire, runId = `${fire}-${randomUUID().slice(0, 8)}`, path = leasePath(), now = Date.now() }) {
  const current = readLease(path);
  if (isLive(current, now) && current.runId !== runId) {
    return { ok: false, code: 3, holder: current };
  }
  const lease = { fire, runId, phase: "orient", heartbeat: new Date(now).toISOString() };
  writeLease(path, lease);
  return { ok: true, lease, reclaimed: Boolean(current) };
}

/**
 * Refresh the heartbeat (and optionally the phase) of an owned lease.
 * @param {{ runId: string, phase?: string, path?: string, now?: number }} opts
 * @returns {{ok:true,lease:Lease}|{ok:false,code:4,holder:Lease|null}}
 */
export function heartbeatLease({ runId, phase, path = leasePath(), now = Date.now() }) {
  const current = readLease(path);
  if (!current || current.runId !== runId) return { ok: false, code: 4, holder: current };
  const lease = { ...current, phase: phase || current.phase, heartbeat: new Date(now).toISOString() };
  writeLease(path, lease);
  return { ok: true, lease };
}

/**
 * Release an owned lease. Absent lease is a no-op success (idempotent).
 * @param {{ runId: string, path?: string }} opts
 * @returns {{ok:true,released:boolean}|{ok:false,code:4,holder:Lease}}
 */
export function releaseLease({ runId, path = leasePath() }) {
  const current = readLease(path);
  if (!current) return { ok: true, released: false };
  if (current.runId !== runId) return { ok: false, code: 4, holder: current };
  unlinkSync(path);
  return { ok: true, released: true };
}

/**
 * Hand the fire off so the watchdog chains the NEXT fire — writes a handoff lease with a deliberately
 * STALE heartbeat INSTEAD of deleting. The out-of-session watchdog (which the model cannot replace — it
 * cannot self-/clear) sees the handoff phase and relaunches a fresh session, so the loop runs forever
 * hands-free. The stale heartbeat also makes the lease immediately reclaimable (isLive === false) by
 * whoever runs next. Owner-only (like release), but writes the handoff even when the lease is absent
 * (idempotent re-arm).
 *
 * Two kinds, distinguished by `wedged`:
 *   - `released-handoff` (default) — §11's close after a PRODUCTIVE fire; watchdog relaunches on the
 *     normal ~30-min backoff.
 *   - `wedged-handoff` (`wedged:true`) — a session that hit the Bash-classifier outage at orient + did
 *     NO work; watchdog relaunches on a SHORT ~10-min backoff so the loop retries ~3× faster through an
 *     intermittent outage instead of crawling at one attempt / 30 min (project memory
 *     `infinite-loop-rearm-watchdog-at-s11`). Single-flight (pid-alive) remains the anti-runaway guard.
 * @param {{ runId: string, note?: string, fire?: string, wedged?: boolean, path?: string, now?: number }} opts
 * @returns {{ok:true,lease:Lease}|{ok:false,code:4,holder:Lease}}
 */
export function handoffLease({ runId, note = "", fire, wedged = false, path = leasePath(), now = Date.now() }) {
  const current = readLease(path);
  if (current && current.runId !== runId) return { ok: false, code: 4, holder: current };
  const lease = {
    fire: fire || current?.fire || "unknown",
    runId,
    phase: wedged ? "wedged-handoff" : "released-handoff",
    heartbeat: new Date(now - 2 * staleMs()).toISOString(), // clearly stale → reclaimable + triggers the watchdog
    note,
  };
  writeLease(path, lease);
  return { ok: true, lease };
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      flags[arg.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[(i += 1)] : "true";
    }
  }
  return { cmd, flags };
}

function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const out = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);
  switch (cmd) {
    case "claim": {
      if (!flags.fire) {
        process.stderr.write("usage: loop-fire-lock claim --fire <slug> [--run-id <id>]\n");
        process.exit(2);
      }
      const res = claimLease({ fire: flags.fire, runId: flags["run-id"] || undefined });
      if (!res.ok) {
        out({ coalesce: true, holder: res.holder });
        process.exit(3);
      }
      out({ claimed: true, reclaimed: res.reclaimed, lease: res.lease });
      return;
    }
    case "heartbeat": {
      if (!flags["run-id"]) {
        process.stderr.write("usage: loop-fire-lock heartbeat --run-id <id> [--phase <phase>]\n");
        process.exit(2);
      }
      const res = heartbeatLease({ runId: flags["run-id"], phase: flags.phase });
      if (!res.ok) {
        out({ error: "not-owner-or-missing", holder: res.holder });
        process.exit(4);
      }
      out({ heartbeat: res.lease.heartbeat, phase: res.lease.phase });
      return;
    }
    case "release": {
      if (!flags["run-id"]) {
        process.stderr.write("usage: loop-fire-lock release --run-id <id>\n");
        process.exit(2);
      }
      const res = releaseLease({ runId: flags["run-id"] });
      if (!res.ok) {
        out({ error: "not-owner", holder: res.holder });
        process.exit(4);
      }
      out({ released: res.released });
      return;
    }
    case "handoff": {
      if (!flags["run-id"]) {
        process.stderr.write("usage: loop-fire-lock handoff --run-id <id> [--wedged] [--fire <slug>] [--note <text>]\n");
        process.exit(2);
      }
      const res = handoffLease({
        runId: flags["run-id"],
        note: flags.note && flags.note !== "true" ? flags.note : "",
        fire: flags.fire && flags.fire !== "true" ? flags.fire : undefined,
        wedged: flags.wedged === "true",
      });
      if (!res.ok) {
        out({ error: "not-owner", holder: res.holder });
        process.exit(4);
      }
      out({ handoff: true, lease: res.lease });
      return;
    }
    case "status": {
      const lease = readLease();
      out({ lease, live: isLive(lease) });
      return;
    }
    default:
      process.stderr.write("usage: loop-fire-lock <claim|heartbeat|release|handoff|status> [flags]\n");
      process.exit(2);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
