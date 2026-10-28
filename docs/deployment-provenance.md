# Deployment source correlation — execution specification

Status: proposed implementation contract, fire-326 (2026-10-27). No deployment
behavior has changed. Fire-327 adds an offline validator only (below).
Governing mission: [ADR 0002](decisions/0002-fresh-cloudflare-os-relaunch.md).
The [operator procedure](../.agents/skills/cloudflare-os-operator/SKILL.md) continues
to govern production approval, storage compatibility and rollback.

The current `.last-deploy.json` is a local assertion about HEAD, not immutable
build or live-version evidence. Keep historical receipts unchanged. Implement this
contract before crediting the migration's per-Worker source-correlation acceptance.

## Observed seams

| Entry point | Build/upload behavior today | Required scope |
|---|---|---|
| `scripts/deploy.ts` | Builds working-tree sources; sequential uploads, router last | Configured core Workers (errors conditional), plus every `EXTRA_GATEKEEPERS` entry |
| `scripts/deploy-router-only.ts` | Generates router config; uploads existing frontend dist | Router only, with a verified frontend build manifest |
| `packages/auth` deploy script | Independent Wrangler deployment | Auth only; never implied by a core rollout |
| `scripts/deploy-authed.mjs` / root deploy script | Calls full deployment, then recorder | Preserve scope and durable partial results through wrapper failures |
| `scripts/record-deploy.mjs` | Reads HEAD/gitlink after command completion | Consume build/upload evidence; never invent version IDs or stamp current HEAD as proof |

Source inventory in [`deploy.ts`](../scripts/deploy.ts) and
[`auth/package.json`](../packages/auth/package.json) includes six core Workers and twelve extras. With separate
auth this is nineteen; derive scope from reviewed configuration, not this count.
An omitted/disabled Worker is explicitly outside the rollout. A snapshot of the
estate includes its observed prior version without claiming it was rebuilt.

## Build inputs and manifest

1. Build from a fresh isolated checkout of an exact outer commit and its exact
   committed fork gitlink, never from a mutable checkout merely labeled with HEAD.
   Verify the submodule's own `.git` marker, HEAD, declared remote provenance and
   absence of replacement refs. Freeze both workspace lockfiles and record SHA-256
   digests, Node/pnpm/Wrangler versions, and the exact build commands. Resolve and
   record the CLI executable/package from each invocation workspace: root/auth use
   the outer lock, fork packages use the fork lock. Never assume the pins agree.
2. Reject staged, unstaged, untracked or nested-submodule source changes before
   snapshot creation. Never reset/remove owner files to satisfy this gate. Keep
   journal/bookkeeping outside the build snapshot. Reject unexpected ignored inputs
   such as local env/config files; explicitly enumerate allowed dependency/build
   outputs. Do not publish secret values or hashes of low-entropy secrets.
3. Install both workspaces frozen. Rebuild required frontend/configurators without
   replaying stale cached artifacts. Record permitted non-secret build environment
   inputs; reject unrecorded overrides. Router-only must rebuild or consume a manifest
   identifying and hashing the actual frontend asset tree, not trust existing dist.
   Require its outer/fork input commits to match this snapshot; reject mixed-source
   router uploads in this first implementation. Auth uses the same pipeline; its
   receipt covers code/config upload, never a D1 schema migration.
4. Hash each generated effective Wrangler config and actual upload artifacts,
   including frontend/configurator assets and Worker modules. Define canonical path
   ordering and byte hashing. Reject source symlinks escaping the snapshot; record
   in-snapshot targets and reject cycles/dangling links. Capture Wrangler transforms/bundling;
   a source hash or pre-bundle hash is not an upload digest. If exact uploaded-byte
   capture is unavailable, label it unverified and do not claim byte attestation.
5. Write a canonical versioned manifest with outer/fork commit, lock digests,
   toolchain, approved config identity, Worker scope, input/artifact digests and
   non-secret build settings. Store it in durable content-addressed evidence; compute
   its digest before uploading. Pin immutable dependencies/artifacts or explicitly
   state remaining reproducibility limits. No credentials, env dumps or raw CLI logs.

The upload must use the same sealed artifacts/config as the manifest. Source or
artifact mutation between snapshot, build and upload aborts before the next write;
mutations after any successful upload produce a partial rollout. Tags and messages
are untrusted publisher assertions, not cryptographic proof of a trustworthy build.

## Per-Worker rollout journal and read-back

- Allocate an invocation ID and a planned Worker/account scope before the first
  mutation. Persist a private non-secret journal outside the disposable build tree.
  Proposed implementation location: `~/ai/state/deployment-evidence/megabyte.space/`
  under owner-only directories/files (0700/0600), keyed by invocation/manifest digest.
  Export only allowlisted non-secret manifests and journal snapshots as GitHub Actions
  evidence artifacts with the fleet's 90-day retention. Artifact upload failure is
  reported; local persistence alone is not off-host backup. Rehearse retention/access
  and retrieval before accepting this store. Hash verification detects changed bytes
  against the recorded digest; it does not defend against a malicious deploy owner.
  Record prior deployment/version allocations for all affected Workers as rollback
  anchors. Before writes, require approved old/new RPC compatibility for the planned
  order and compare live routes/domains/triggers against approved intent. Changes
  require operator review; config hashing alone cannot prevent hostname detachment.
  Anchors feed the operator rollback matrix; migration-incompatible Workers require
  forward repair, not automatic rollback to a version ID. Reading history is bounded;
  record truncation and pagination explicitly.
- Attach a compact manifest identifier through documented Wrangler version metadata.
  Verify `--tag`/`--message` support and length/character limits using the locked CLI
  and isolated rehearsal. Do not guess limits or add runtime bindings/headers.
- After EACH upload, persist Worker name, account, manifest digest, returned version
  ID and command outcome atomically. Retrieve that exact version's metadata and the
  observed deployment ID/version allocations through authenticated read-only APIs.
  Assert metadata matches the manifest identifier and deployment references that ID
  at the intended traffic percentage (100% for the current one-step deploy path).
  Record observation time and concurrent changes.
- Do not match by latest version, timestamps, branch tips or short SHA alone. A
  version existing is not evidence that it receives traffic. If an upload times out
  or its response is lost, mark outcome unknown and reconcile invocation metadata
  before retrying; never assume absence from a truncated list means no write occurred.
- On upload, persistence or read-back failure, stop later uploads and preserve prior
  results. Missing or ambiguous IDs remain unknown. Write an interrupted/partial
  receipt even when the wrapper exits nonzero. Persist intent before the upload;
  if storage itself fails, preserve the last durable journal and reconstruct missing
  outcomes on restart. Write the partial receipt once persistence is available.
  Never continue with a fabricated
  all-success summary or overwrite the previous complete receipt with partial data.
- Read-back correlation is per Worker at a recorded time; it does not establish an
  atomic whole-estate snapshot. Unrelated concurrent deploys invalidate affected
  correlations until re-read. Preserve actual mixed-version allocations.

Every Worker entry records `evidenceLevel`: `metadata-only`, `sealed-inputs`, or
`upload-bytes-verified`. The last requires a rehearsed single-build/sealed-upload
mechanism and independent comparison of remote content/digests where supported; two
bundling runs and a matching publisher tag are insufficient. Missing remote byte
comparison stays explicit. An out-of-band deploy or secret update can change the
version and invalidates the affected correlation until reconciled.

A separate complete rollout receipt references the content-addressed manifest and
all journal entries. `complete` means planned rollout metadata/allocation coverage,
not source/byte attestation. Record aggregate evidence at the weakest Worker level;
source/byte acceptance cannot pass on metadata-only evidence. Mark complete only
when EVERY planned Worker has matching
version metadata and intended observed deployment allocation. Keep scoped receipts
for router/auth-only work; never advance a whole-estate deployment marker from one
Worker. Preserve the legacy receipt schema/guard behavior until consumers migrate;
new evidence is additive, and absent evidence remains absent.

## Acceptance and safe implementation order

1. **Offline contract tests first:** dirty/staged/untracked/nested fork inputs,
   absent fork marker, divergent gitlink, replacement refs, ignored env injection,
   stale router dist, asset/config mutation, lock mismatch and unrecorded overrides
   must fail before any upload. Include paths with spaces and source symlinks.
2. **Journal tests:** simulate failure at every stage (including first/last Worker),
   lost response, disk-write failure, interruption/restart, read-back failure,
   metadata mismatch, zero/split traffic, concurrent deployment and truncated history.
   Prove a partial rollout cannot advance a complete receipt. Verify conditional
   errors, every extra gatekeeper and independent router/auth scopes.
3. **Local gates:** frozen installs in both workspaces; touched tests, root script
   suite, scripts typecheck and `pnpm check`. Inspect generated configs and upload
   artifact collection under locked Wrangler. `--check`/dry runs never create a
   successful remote receipt or require deployment credentials to stamp fake IDs.
4. **Isolated rehearsal:** only after approving independent test Worker identities,
   protected route and fresh state, exercise upload metadata round trip and a safe
   interrupted rollout. Do not use production resources as a fixture. Test journal
   durability and restart reconciliation, then inspect exact version allocations.
5. **Production:** present the operator mutation/rollback summary, with unchanged
   auth/storage/routing boundaries unless separately approved. One controlled deploy
   records every affected Worker; verify metadata and runtime separately under
   operator §11 and the existing `scripts/verify-prod.mjs` estate checks. Neither
   that verifier nor a receipt substitutes for the other migration acceptance gates. Do not
   redeploy legacy production just to repair its historical receipt.

Future code seams: manifest/snapshot and journal helpers in `scripts/`; integrate
`deployWorker`, router-only and auth upload paths; migrate recorder/guard consumers
last. No submodule edits, scheduler changes, new public telemetry or source headers
are needed. One helper with explicit scopes avoids divergent receipt formats.

## Evidence limits and references

Source correlation cannot establish Access/admin denial, route ownership, provider
billing/retention, RPC compatibility, state migration/persistence, browser correctness,
visual quality or rollback safety. These remain separate operator acceptance gates.
A retained manifest supplies auditable publisher evidence; trustworthy byte-level
attestation requires a verified build/upload capture and protected evidence storage.

Cloudflare documentation checked 2026-10-27:

- [Wrangler deploy metadata options](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [Versions versus traffic deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Retrieve exact Worker version](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/)

These establish platform mechanisms. Locked-CLI compatibility and live round-trip
behavior remain untested in this iteration.

## Offline metadata validator — fire-327

`scripts/rollout-evidence.mjs` exports `assessRollout(plan, entries)` without network,
filesystem or deployment side effects. It requires exact planned Worker coverage,
invocation/account/manifest agreement, successful upload outcomes, exact-version
read-back and a single observed 100% allocation. Missing/unknown/duplicate results,
metadata mismatch and split/zero traffic fail closed. Observation times must be
round-tripping UTC ISO timestamps with seconds or milliseconds (a trailing `Z`).
Auth/router-only plans remain independent scopes. Run `node --test scripts/rollout-evidence.test.mjs`.

A complete result means supplied metadata coverage only. Its evidence level is
capped at `metadata-only`, even if a caller supplies stronger labels. Inputs must
come from a trusted collector; this helper neither authenticates API responses nor
checks snapshot/build artifacts. Observations describe their recorded time only;
the collector must invalidate/re-read affected entries after concurrent changes.
Disk durability, interrupted upload reconciliation, paginated remote discovery,
source/byte attestation and deploy/recorder integration remain unimplemented.
Historical receipts and production behavior are unchanged.
