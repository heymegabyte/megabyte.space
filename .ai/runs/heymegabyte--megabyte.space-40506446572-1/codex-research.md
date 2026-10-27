# Fire-326 independent provenance research

Assigned base: `8239c41ee8e4f4fb2b9e5ab0abb4a078dd07c089`.
Mode: research; no production writes. Declared fork initialized at
`e89c7af70aeb0b7bc79e26a55ed3015a7f5b5b11`, unchanged.

## Recovery

Fetched origin/main and verified ancestry of recent successful results `8239c41e`
and `5a361f43`, and failed-run result/base commits `46489935` and `0f3be636`.
Inspected both failed retained worktrees: 40370252189 is clean; 40408427190 has
an untracked backup test. Its two cases (remote R2/private cleanup and same-size
corruption) are already superseded by committed backup coverage from fire-324.
No retained files copied, changed or removed. GitHub Actions lists the latest two
completed runs as success and the preceding two as failure; publication evidence
comes from git ancestry, not those conclusions.

## Independent finding

`scripts/record-deploy.mjs` resolves HEAD and its committed fork gitlink AFTER
`scripts/deploy.ts` returns. The deployment builds current working-tree paths,
not that commit object, and has no snapshot/cleanliness check. A local receipt
therefore does not establish exact built inputs even immediately after a successful
command. An independent source review confirmed this gap.

Full deploy stages up to 18 Workers sequentially; auth is a nineteenth, separately
deployed Worker. `deploy-router-only.ts` generates current router configuration but
assumes a pre-existing frontend build: tagging that upload with current HEAD alone
would misattribute stale dist. A partial full-deploy failure leaves earlier Workers
updated but skips the normal trailing recorder. The proposed specification addresses
these seams before implementation; it does not patch the uploader this fire.

Current official documentation (retrieved 2026-10-27) supports version tag/message
and per-version metadata retrieval. These are publisher assertions, not attestation
of source or runtime/data correctness. Root lock pins Wrangler 4.124.0; no installed
CLI compatibility or live metadata round trip was tested this iteration.

- https://developers.cloudflare.com/workers/wrangler/commands/workers/
- https://developers.cloudflare.com/workers/versions-and-deployments/
- https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/

Implementation contract: `docs/deployment-provenance.md`. Future acceptance remains
open until implementation, isolated rehearsal, approved deployment and read-back.
