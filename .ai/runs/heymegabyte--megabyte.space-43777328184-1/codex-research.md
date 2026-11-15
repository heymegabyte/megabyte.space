# Fire-382 — Frozen sharing grants and downgrade acceptance

Observed 2026-11-15 UTC. Read-only review of official candidate
`ea926546cc340da28acf0a0c4b10361acedf2ca6`, fetched directly from
`https://github.com/cloudflare/cloudflare-os.git`, compared with the previously
inventoried official `2726e932a3fbfcfffa04ee093a881604009f2034`.
The declared fork remains `240899ec34e822a0afa695e3c7b48a41c2db9c4c`.
Neither official revision is claimed to be the live production binary.
Exact reviewed file digests are in `source-evidence.json`.

## Recovery and scope

Fresh origin/main fetch contains preceding result 734e5984 (and e70bcd73).
Actions reports 43754551155 and 43722249898 successful, 43684358849 failed.
The failed run has no agent report and its retained worktree is clean at fda5bdef:
no new source recovery is indicated. Canonical local main is older than fetched
origin/main; the assigned incoming snapshot was preserved. Only one fleet loop
iteration ran, under fire-382. No scheduler, credential or production changes.

## Forward migration and source-level fixture coverage

Candidate overseer-migrations.ts:397–430 guards on version 6, snapshots permanent
non-pending gadget IDs in numeric order and transforms workspace-wide use grants
inside transactionSync, stamping version 7 last. Build grants and explicitly
scoped grants do not match isWorkspaceWide. Inactive grants are frozen too,
preventing a sharer who regains build from implicitly sharing later gadgets.
A zero-gadget workspace revokes eligible links, removes their indexed aliases
and drops wide collaborator edges; one gadget writes gadgetId; multiple write
gadgetIds. Each wide collaborator edge expands to one edge per gadget, preserving
other fields by spread. Alias records are skipped as conversion targets.

Candidate overseer.ts:1658–1664 chains this after earlier migrations inside
blockConcurrencyWhile, before constructor-driven agent restoration. This is source
ordering evidence, not a measured durable-object wake or interrupted deployment.

The sharing.test.ts:1619–1822 migration block was inspected, NOT executed. It
contains cases for zero/one/many gadgets, inactive-grant reactivation, existing
share-key redemption, later-gadget exclusion, provisional/worktree exclusion,
per-gadget revocation and a version-stamp failure followed by transaction rollback
and retry. Its makeMigrationManager uses makeMockStorage; the stamp-failure
fixture establishes an intended unit contract, not process-kill durability,
platform transaction behavior, concurrent rollout or a binary downgrade test.

## Concrete downgrade interpretation mismatch

Candidate sharing.ts:80–92 reads plural gadgetIds and treats a use record with
neither selector as empty. Prior official 2726e932 sharing.ts:80–89 only reads
singular gadgetId: a use record without it has gadgetIds: "all". Therefore a
candidate-migrated multi-gadget link `{role: "use", gadgetIds: [1, 2]}` is narrowed
to those gadgets by the candidate, but the older ceilingOf interprets that record
as workspace-wide. That is a source-level downgrade hazard, not a demonstrated
live exploit or proof that the older binary can finish initialization on every
version-7 object. No explicit future-schema rejection appeared in the inspected
older constructor/version access sites; this targeted check is not an exhaustive
search for all possible startup barriers.

A binary rollback and a failed transaction rollback are different operations.
Do not credit the stamp-failure test as rollback compatibility. Before approved
adoption, rehearse on isolated copied state using the exact intended rollback
binary: migrate zero/one/many links and mixed user/key edges; add a later gadget;
reopen both previously redeemed and new-key sessions; verify no broader access.
Include inactive sharers regaining build, aliases, pending gadgets becoming
permanent, ownerInvitesOnly and already-held capabilities. Require an explicit
state restoration or compatible rollback procedure if the old reader widens
these grants. This review does not authorize a production restore, grant rewrite,
new Worker or source-pin move.

## Independent review and evidence limits

A bounded read-only OpenCode DeepSeek review via the direct fleet launcher exited
0. Parent review rejected several coverage claims: the existing key-copy fixture
DOES exercise aliases (including zero-gadget alias cleanup), and the first test
DOES mix a wide edge with an explicitly scoped edge. Its claimed absence of those
cases would overstate gaps. It correctly distinguished forward idempotence from
binary downgrade acceptance. Raw output is retained only in run logs.

Fresh exact-fork preflight passed, and wrapper fork/provenance/lease/bookkeeping
regressions passed 57/57. Candidate tests/build, both frozen installs, full wrapper
check, browser/native/provider acceptance and production verification did not run.
Existing measured wrapper-capacity and migration approval gates remain open.
No visual surface was visited; matrix scores remain unchanged. No OpenSpec
architectural artifacts were authored. Repository skill-router.py is absent;
local loop contract and operator guidance supplied this bounded research route.

Loop improvement: distinguish transaction rollback from binary downgrade and
review both writer and rollback-reader representations before accepting schema
migration rollback. Test descriptions and reviewer summaries must be reconciled
against actual fixture setup, including aliases created indirectly by helpers.
