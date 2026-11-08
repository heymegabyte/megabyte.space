# fire-368 — candidate ambient Web Search authority review

Mode: read-only source research, no deployment or upgrade.
Base c362a374cb6a5e78e4ce556d57f8e409ebd31e44; gitlink remains
240899ec34e822a0afa695e3c7b48a41c2db9c4c. Candidate reviewed:
2726e932a3fbfcfffa04ee093a881604009f2034.

## Recovery and scope

Recovered unfinished source-review notes from failed runs 42435582301 and
42461293723. Neither receipt established completed review acceptance. Its dirty files were inspected read-only;
no earlier worktree was modified. Current origin/main contains base c362a374;
Actions history confirms the prior failure and earlier success. Initialized
this run's declared fork at exact gitlink 240899ec and passed preflight.
Independently recomputed every inventory SHA-256 from retained
42293062320/cloudflare-os Git objects after verifying its own .git marker;
all six match candidate 2726e932. Reviewed search, vendor, manifest and wrapper
wiring directly. These are local object identities, not proof of remote candidate
fetchability or whole-release compatibility. The repository skill router is
absent in this checkout; the repository cloudflare-os-operator skill was used.

## Findings from exact source

1. scripts/release/manifest-lib.ts marks Context, Scheduler and Web Search
   preinstall and singleton. Preinstall entries must have no deploy inputs.
   Gatekeeper backend expansion uses GatekeeperVendor; Router expansion uses
   HTTP default entrypoints. Context alone receives public-origin sharingDomain
   props. These manifest declarations do not prove a deploy service installed them.
2. The wrapper's EXTRA_GATEKEEPERS and packageDirs omit Web Search. Its backend
   WORKERS_AI binding is not the Web Search Worker's AI binding. The candidate
   Web Search wrangler.jsonc declares AI, Text rules and a v1 SQLite migration
   for WebSearchGatekeeper. Simply adding a backend service does not deploy that
   Worker or preserve those runtime requirements.
3. Candidate search.ts explicitly supplies provider ceramic, limit 10, and the
   Web Search Worker's CF_AI_GATEWAY or literal default when absent. This is
   source behavior; comments about billing/retention are not independently
   verified provider terms. Backend gateway vars are not automatically inherited
   by a separately deployed Worker. The wrapper's generic extra-worker generation
   applies setCommon only, not backend gateway vars: a future registry-only add
   would need its gateway choice reviewed separately.
4. search validates query length before recording, awaits authorizeObservation
   before sending, then calls AI.websearch. A refused record prevents sending;
   HTTP errors, binding errors and malformed results occur after the record.
   Existing upstream search.test.ts describes seven fixture cases covering this;
   those candidate tests were read, not executed in either run. An audit row proves
   an attempt, not provider success or successful persisted application state.
5. The vendor advertises autoProvisionsAccount=true and providesAuth=false; its
   account singleton is WebSearchSession. Observer verification admits supplied
   observers and the verifier is a no-op. Source describes public-result authority,
   not credentialed auth. Public results do not erase query privacy implications.
   Do not count this vendor as an available replacement login provider.

## Required evaluation evidence before enabling

Keep production unchanged. Obtain the documented migration approval for resource,
identity, billing and provider changes. For an approved isolated evaluation:

- Reopen generated Web Search config and verify Worker identity, AI binding,
  migration, Text rules, both service entrypoints, singleton uniqueness and the
  explicitly selected gateway on that Worker. Compare backend gateway separately.
- Build the exact candidate, validate exports and pinned Wrangler dry-run, then
  prove actual account provisioning and one ambient WEB_SEARCH per workspace.
- Execute blank/oversized refusal, audit refusal, provider failure and successful
  result cases. Correlate the recorded attempt with actual request outcome;
  do not put real queries or provider response bodies in run reports.
- Check account/gateway/provider availability and approved cost/privacy policy
  using current authoritative provider documentation at evaluation time. Verify
  cross-account behavior independently; backend transport settings do not attest it.
- Exercise observer removal and workspace boundaries, absence/disabled capability,
  and confirm auth provider enumeration excludes Web Search. Preserve all existing
  Access/native/browser, isolated state, continuity and rollback gates.

## Acceptance boundary

This is a targeted source review and decision-independent evaluation checklist.
No release service execution, candidate test/build/dry-run, provider call, namespace
migration, browser/native journey or production acceptance is credited. No pin,
historical receipt, auth configuration or visual score changed.

Loop improvement: distinguish a manifest preinstall declaration, actual service
binding, per-Worker gateway configuration, an audit attempt and successful provider
execution. Each needs its own evidence; backend AI availability proves none of the
other Worker's runtime state.

## Current recovery verification

This run independently recomputed all six hashes and reviewed the exact search and
Worker source. A fresh independent adversarial reviewer confirmed the manifest,
Worker and wrapper claims. Router binding uses the default entrypoint; backend
binding uses GatekeeperVendor. Full EXTRA_GATEKEEPERS registration already
preserves base AI/migration/rules fields; a backend-service-only addition does not
constitute that registration. Prior worktrees were left untouched. DeepSeek review
was attempted through the approved direct launcher but timed out after 25 seconds
without output; no result is credited.
