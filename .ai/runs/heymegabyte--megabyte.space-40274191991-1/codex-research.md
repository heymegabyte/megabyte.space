# Fire-321 independent control-plane inventory

Mode: research, read-only Cloudflare GET requests. Assigned base `2f8bc30b`; declared fork
`0eeb9053ea9e22644ba1c0e43addc1f7834e271c` initialized without changing the gitlink.
Official upstream HEAD remains `bd10b0ece6842b8f486b3467eab6cc3b9c920920`.

## Recovery and publication

Fetched origin/main; fire-320 result `2f8bc30b` is an ancestor. Latest failed run
40240495517 has no committed changes and its retained worktree is clean. Its receipt
records backend exit 1 with no structured agent report. Prior recovered copy fixtures
are already published; no duplicate recovery required. Other retained trees untouched.

## Observed deployment evidence

`live-deployments.json` is an allowlisted snapshot of Cloudflare deployments and version
metadata. Credential retrieved through get-secret only into process memory; values,
headers, response bodies, author identities and binding values are not stored.
The six configured core Workers have newer deployment records dated 2026-10-25;
the router latest returned deployment is `f176b5bb-be54-453c-a819-cfed49c32656`,
version `b83778c5-fe04-4d2f-b32a-9f42b88c1a83`, at 100% in that record.
The separate Better Auth Worker latest returned record is dated 2026-10-03.
The extended snapshot includes all twelve EXTRA_GATEKEEPERS declared by scripts/deploy.ts.
This is a bounded history query, not a complete history, route or resource audit.

The local receipt dates to 2026-10-09 and identifies fork `80b7209e`. The newer records
prove subsequent Worker deployments occurred, but do not identify their source commit.
Version annotation keys inspected so far contain only workers/triggered_by, no Git SHA.
Do not reconstruct a fork SHA from timing, current branch tip, asset names or version UUID.
Leave .last-deploy.json unchanged: stamping current HEAD would manufacture provenance.

## Loop improvement and next acceptance

The deploy-state guard's mismatch text asserts HEAD is ahead of prod and likely never
deployed. That causal claim is stronger than its inputs: it compares HEAD against a
local receipt, without inspecting deployed source. Operator guidance must treat it as
receipt disagreement until source correlation is independently established. Matching
fork SHAs also do not prove wrapper/configuration or current live-version equality.

Next: add regression cases and neutral guard wording for stale receipts; separately
correlate observed versions with an immutable source/build receipt or approved read-only
bundle comparison. Do not redeploy just to silence a stale receipt. Maintain approval
boundaries for ADR 0002 migration phases. No runtime defect or migration completion proved.

## Fresh local checks

Frozen root install with pnpm 11.17.0; all 137 root script tests pass; scripts typecheck
passes; exact declared submodule resolvability passes. No full fork build, candidate
build, deployment, authenticated journey, live provider, native client, storage or visual
acceptance is claimed. No UI surface visited, so modifier matrix remains unchanged.

API contract consulted: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/
Version metadata reference: https://developers.cloudflare.com/api/resources/workers/
