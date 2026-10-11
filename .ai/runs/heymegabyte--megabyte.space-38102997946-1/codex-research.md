# Independent source review — fire-307

Run: heymegabyte--megabyte.space-38102997946-1. Base: 61024b7434716c36fb23cf37b1c5fa44dd446367.
Mode: read-only upstream review plus starter verification maintenance; no deployment or pin change.

## Recovery and current source

Fetched origin/main. Prior successful results 6de42204 and a30cbb40 are ancestors of origin/main.
Seven failed-result retained worktrees were inspected read-only: all clean; six result commits
are published. Historical 8770b90e remains non-ancestor bookkeeping, already reconciled by
fire-305/306; its two-file bookkeeping commit does not justify replaying implementation.
The assigned fork initializes from the declared URL at exact committed pin 9af3a71d.
Deploy receipt remains 80b7209e from 2026-10-09; receipt drift is observed, actual deployed
commit remains unverified. No receipt rewrite or production claim follows from clean git.
The missing ~/.agentskills provider-policy path was resolved to the canonical shared
agent-skills/rules/agent-provider-policy.md; official authentication was preserved.

## Official upstream range (uncapped local Git comparison)

Fetched both exact refs from https://github.com/cloudflare/cloudflare-os.git.
HEAD advertises 33a5b70cc45e210b9aada8b5a1d61013528f4e5f. The range from
7ec49d8c865917c7be0401938eadc7218ed9d398 contains exactly one commit:
33a5b70 Fix Slack gatekeeper org-wide installation workspace scoping (#719).
16 paths changed, 1,274 insertions and 108 deletions. All source changes are under
packages/gatekeeper-slack plus its pnpm-lock.yaml importer. Full path inventory and
selected authority diff are stored alongside this review.

- OAuth installation metadata now records enterprise identity and installation kind.
  Org account identity uses canonical user + enterprise IDs; workspace installs retain
  workspace-qualified identity. Do not conflate an enterprise with a selected workspace.
- Workspace selection intersects app assignments with user memberships, including grant
  pagination. Bound reads pin one T... workspace and recheck each outgoing credential,
  including token replacement/retry. Shared channels, metadata-less DMs, directory reads
  and search matches receive workspace membership checks.
- Existing facets lazily persist boundTeamId in DO storage, independently of credential
  reconnects. Ambiguous org bindings and old E... resource URLs fail closed and require
  reselection. This is a persisted state change despite no Wrangler migration declaration.
- Conversation/thread grants require added metadata read scopes. Legacy narrow scopes are
  retained only for reconnect consent; reads cannot silently treat them as sufficient.
  Observer checks use collaborators' credentials and selected workspace, including tracked
  conversations. Keep scope/observer approval in the candidate evaluation checklist.
- Workspace/conversation configurator RPC and value shapes change together; conversation
  selection clears when workspace changes. Rehearse generated configurator and Worker RPC
  schemas as one artifact rather than mixing old and new frontend/backend versions.
- Dependency delta adds vitest catalog entry to Slack importer and switches configurator
  Vite export to withTests. No root catalog, router, workshop backend, deployment manifest
  or Wrangler migration paths changed in this range. Earlier adapter blockers remain.

Before selecting this candidate: run its Slack test:run, configurator build, capnweb schema
validation and dry-run; exercise org/workspace installs, reconnect scope expansion,
ambiguous legacy recovery, cross-workspace observer deny, shared channels and retry-token
replacement. Source review is complete for this range; candidate build/runtime proof,
Access/admin authority, state isolation, browser/visual acceptance and migration remain open.

## Verification improvement

The committed metadata parser silently overwrote repeated path/url keys within one subsection.
Real-Git identical duplicate fixtures both passed before repair (RED: expected rejection).
Reject repeated properties before assignment, including identical declarations. Independent
review confirms ambiguity but no demonstrated disagreement with Git's last-value behavior;
this is stricter single-declaration provenance, not a claimed exploit. Conflicting declarations
with a valid final value are also covered. Normal exact-source fetching stays unchanged.

## Independent official subscription review

Completed through env-sanitized cr --provider codex exec --sandbox read-only.
Reviewer found no blocker in the local duplicate-metadata patch. It identified two
candidate risks, inferred from source rather than proven live defects:

1. Reconnect-before-first-use: boundWorkspaceId prefers the account's current teamId for
   a legacy unpinned binding. If credentials switch workspace before initial upgraded use,
   the resource could persist the replacement workspace. The existing test pins before
   reconnect and does not prove this ordering safe. Thread recovery also prefers current
   account workspace over permalink domain. Add ordering fixtures before adoption.
2. Same-token revocation: successful workspace-access proofs are cached per token/client.
   A long-lived cursor may not refresh the proof after membership/app-assignment removal
   while the token is unchanged. Slack may deny the request itself; immediate revocation
   is not demonstrated. Require provider-backed deny proof or a reviewed invalidation rule.

The candidate lockfile pairs Vitest 4.1.11 with version-5 peer tools; frozen test/build
compatibility remains a rehearsal gate. These findings do not authorize modifying the
upstream pin, carrying over legacy state, or expanding OAuth scopes.
