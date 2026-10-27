# Fire-326 independent review and convergence

The read-only native `provenance_review` agent independently inspected deployment,
router-only, auth and receipt sources. It confirmed working-tree attribution,
stale-dist, independent-auth and partial-rollout gaps. It then reviewed the draft
contract and found no blocker, requesting explicit intent persistence/recovery
when journal storage fails. That requirement is incorporated.

An official Claude subscription review through `cr` (selected account `claude-3`,
exit 0) read only the specification and research note. Its review expressly did
not execute tests or independently inspect source/platform behavior. Its full raw
output remains in the private run log, not a committed transcript.

Accepted findings, now incorporated:

- Rollout completeness must not imply source/byte attestation. Add per-Worker
  evidence levels, weakest-level aggregation and independent remote byte comparison
  requirements; publisher tags cannot establish bytes or trustworthy authorship.
- Define proposed private persistent journal storage, off-host artifact retention,
  retrieval rehearsal and tamper-evidence limits. This fire creates no storage or
  uploader integration; the future implementation must verify these properties.
- Reject mixed-source router/frontend inputs in the initial implementation; require
  auth to use the same scoped pipeline and distinguish its D1 schema acceptance.
- Require compatibility/route-intent preflight and use version anchors through the
  operator rollback matrix; migrations may require forward repair.
- Resolve the actual locked CLI per workspace, define source-symlink behavior and
  retain explicit out-of-band/secret-update invalidation and runtime-verifier scope.

Review assertions about facts it had not inspected were treated as questions,
not evidence of defects: the core/extra count and upload order were inspected in
`scripts/deploy.ts`, separate auth in `packages/auth/package.json`, and root Wrangler
pin in `pnpm-lock.yaml`. Current official deploy docs explicitly list --tag/--message;
locked-CLI compatibility and round-trip behavior still require rehearsal. Recovery
claims are supported by this fire's actual git/Actions observations and final report,
not by the subscription review.

No runtime/deployment/schema/auth/route change and no new live source claim.
