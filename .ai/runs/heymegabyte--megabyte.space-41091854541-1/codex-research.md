# Fire-335 independent recovery review

Scope: control-plane migration evidence, documentation only. Reviewed retained
fire-334 journal, collector and subprocess fixture source before any external
review. No runtime implementation recovered or changed.

- Assigned base/fetched origin main: `39472432a1217911965cbbd1f7427e76a76a4051`.
- `git merge-base --is-ancestor 0b611f88 origin/main` exits 1: result unpublished.
- Retained fire-333/fire-334 worktrees have clean `git status --short`; preserved.
- Prior receipts explicitly report failed root suite/typecheck and unavailable
  fork initialization. Their 65/68 focused passes remain historical claims.
- Reviewed actual fire-334 code: before-write and before-link adapters throw
  before underlying filesystem calls; directory-sync failure is after real link.
  Partial-write and post-link exception coverage remains absent.
- The append path can reject after a linked intent (directory sync or cleanup).
  This is already compatible with the stop/reconcile contract; do not invent a
  runtime defect or authorize blind retry from rejection alone.
- Fresh current validator tests: 29/29, exit 0. They do not exercise retained code.
- Declared pinned fork initialization timed out at 35 seconds, exit 124.
  This does not distinguish unavailable credentials, network or absent repository.
- Bounded GitHub Actions history API timed out at 20 seconds, exit 124; local
  failed receipts inspected. No live GitHub history acceptance credited.

Decision: publish a documentation-only recovery/acceptance contract instead of
repeating the unpublished runtime recovery with the same unresolved bootstrap.
Exact candidate commits and filesystem failure-state matrix are recorded in
`docs/deployment-provenance.md`. No pin, receipt, production resource, credential,
scheduler, visual score or migration phase changed. Full wrapper/browser/native
and production checks are not run for this documentation-only slice.
