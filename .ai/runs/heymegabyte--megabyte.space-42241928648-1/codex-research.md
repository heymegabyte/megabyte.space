# Fire-362 — official candidate admin audit acceptance review

This is a source review of official Cloudflare OS
`2726e932a3fbfcfffa04ee093a881604009f2034`, fetched directly from
`https://github.com/cloudflare/cloudflare-os.git`. The declared fork was initialized
and passed identity preflight at `240899ec34e822a0afa695e3c7b48a41c2db9c4c`.
No checkout/pin/configuration/deployment change or candidate test execution occurred.

## Scope and recovery

Fetched origin/main contains prior result `15d1c1d0`; Actions lists runs
42179968935, 42136438907, 42090183537 and 42020651185 as successful. Publication
was checked with Git ancestry, not inferred from those labels. Inspected worktree
list and recent failed receipts including 41963669270. Its retained collector
source is byte-identical to this checkout; recovery is already committed as
`b9d32289`. Other retained changes were left untouched.

The repository has no `bin/skill-router.py`; used the local loop/migration contract
and operating-system skill directly. Review is frontier-required judgment;
mechanical test inventory was delegated through the mandated OpenCode/DeepSeek
launcher. A separate Codex subscription review was launched through `cr`.

## What the candidate actually records

1. **Rows represent attempts, not successful application.**
   `packages/workshop-backend/src/admin-settings.ts:492–531` serializes config
   mutations, appends the audit record before writing the config/KV mirror, and
   restores the old stored slot if the mirror rejects. The appended record stays.
   `packages/workshop-shared/src/api.ts:1700–1727` explicitly documents attempts;
   the record has no applied/failed outcome field. Existing test
   `admin-settings-audit.test.ts`, “keeps the record of a change the KV mirror then
   fails, which is rolled back”, encodes this intentionally.
   The frontend's `AdminAuditPanel.tsx:126–129,249–251` describes settings changes,
   without an attempt qualifier. Treat that as a user interpretation risk requiring
   failure-state browser acceptance; do not use its counts/diffs as proof of applied
   config or successful deployment. This review does not prescribe an upstream UI
   patch or change approved design.

2. **Workspace audit coverage is reserved schema, not a shipped access trail.**
   `admin-audit.ts:48–78` has workspace/exposed columns and CHECK constraints, but
   its append INSERT supplies only at/kind/admin/record. The public
   `AdminAuditRecord` type is only `AdminSettingRecord` (`api.ts:1727`).
   Backend and integration fixtures insert workspace rows directly via SQL
   (`admin-audit.test.ts:58–69`; `workshop-admin-audit.test.ts:265–299`).
   Production backend source search found no workspace record producer. This is
   not a demonstrated broken public workspace append API: no such typed API is
   claimed. Migration acceptance must not credit workspace reads/content access
   auditing from schema/filter tests alone.

3. **Retention has meaningful source protections, but is lazy.**
   `admin-access.ts:30–65` uses an environment floor, defaults blank/invalid values,
   caps valid values and applies max(chosen,floor). `admin-audit.ts:168–180` rejects
   invalid retention and prunes at most 1000 expired rows per call; list/stats filter
   by the cutoff even while more expired rows remain physically stored. No periodic
   purge is shown here. Retention is not proof of a deletion deadline when unused.
   `AdminApiImpl.#retentionDays` uses `committedAdminConfig()` so an in-flight shorter
   choice cannot prune against a rollback's longer policy. Existing tests cover
   raised-floor setter validation, effective/chosen/min display, committed retention
   during KV rollback and default-floor DO reads. These tests were inspected, not run.

4. **Admin authorization is checked when the capability is minted.**
   `server.ts:707–714` refuses a non-admin at getAdminApi().
   `admin-settings.ts:1235–1243` explicitly says methods do not re-check that status.
   This is the candidate's capability contract, not evidence of immediate revocation
   of a previously obtained handle. Before adoption, separately exercise retained
   handles/session expiry and reconnect under the intended Access/admin policy.

5. **v4 is a new SQLite DO class migration, not observed state migration.**
   `packages/workshop-backend/wrangler.jsonc:79–86` adds
   `AdminAuditDurableObject` with migration tag v4; server exports it and AdminSettings
   addresses it through ctx.exports. Source presence and test-worker bindings do
   not establish the generated wrapper config, remote migration application,
   namespace isolation, persistence across deployment or rollback compatibility.
   The wrapper replaces Workshop vars (`scripts/deploy.ts:490`); no explicit
   audit-floor forwarding exists. The candidate default must be deliberately
   accepted or configured in the isolated migration work, without modifying legacy
   production to make a rehearsal pass.

## Concrete next acceptance

- Execute the candidate's admin-access, admin-audit, admin-settings-audit,
  admin-policy/bounds, integration audit and frontend audit tests after frozen
  installs in both candidate/wrapper workspaces. Existing test presence is not green.
- On approved isolated identities, inspect generated v4/export metadata, append and
  reopen the same log after restart/deploy, and show that legacy namespaces remain
  separate. Review rollback limitations before applying a migration remotely.
- Force audit insert failure: setter must reject without config/KV change. Force
  mirror rejection: committed config must remain old while the attempted row stays;
  refresh log and settings independently and evaluate whether UI copy is truthful.
- Exercise >1000 expired rows, retention boundaries and a raised deployment floor;
  distinguish invisibility from physical purge and test rollback/concurrent reads.
- Test non-admin minting rejection separately from held-capability revocation and
  session expiry. Do not infer workspace-content auditing from fixture-only rows.

## Fresh local verification and limits

- Fork preflight passed with exact expected/actual 240899ec.
- Offline rollout/collector/journal/crash fixtures: 81/81 passed.
- Fork identity/lease fixtures: 24/24 passed.
- Deploy-state detector warns fork 240899ec versus historical receipt 80b7209e;
  this is receipt disagreement only, not observed live drift. Receipt preserved.
- No candidate install/build/workerd/browser/native/live-provider test, production
  inventory or migration acceptance is credited by these source/local fixture results.

Loop improvement: require separate evidence for an audit attempt, a committed
setting and an observed runtime effect; require a production producer before
crediting an audit record kind that fixtures can insert directly.
