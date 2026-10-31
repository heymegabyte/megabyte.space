# Fire-338 — fork workspace prerequisite

## Independent findings

The assigned committed fork is `240899ec34e822a0afa695e3c7b48a41c2db9c4c` at
`https://github.com/heymegabyte/cloudflare-os.git`. Initial tree was clean.
Fresh `git fetch origin main` succeeded; fetched main remained `b0283222`.
Prior successful result `51e62f5c` is an ancestor; failed result `7801c73d` is not.
Its documentation slice was already recovered in `fa944da0`; do not replay its
old bookkeeping. Both retained worktrees inspected clean. Other retained runtime
candidates remain preserved under the existing source/bootstrap acceptance gate.

A bounded 65-second submodule initialization exited 124. The terminal local
preflight finds no own fork Git marker. This is missing local source, not evidence
of permanent remote absence or a permission diagnosis. A bounded Actions API
query also exited 124 with no usable live history; local failed receipts were read.
No declared URL, gitlink, credentials or historical deployment receipt changed.

## Decision-independent slice

Implement the fire-337 queued preflight before dependency consumers: a committed
160000 gitlink, fork-owned Git metadata distinct from the parent, exact HEAD and
router package are required. A staged pointer cannot redefine the committed pin.
Ambient Git routing is removed from inspection subprocesses. `pnpm check` now
fails here before consuming fork source; the loop calls it before fork installs.
The explicit `check:fork` command is usable without installed dependencies.

This checks local prerequisites only: it establishes neither remote fetchability,
source cleanliness, locked dependency installation nor runtime/deployment identity.
It intentionally leaves the existing clean-tree salvage guard's meaning unchanged.

## Verification boundaries

Regression fixtures cover missing/invalid markers, parent metadata with a matching
claimed top-level, wrong/staged pins, missing router, and a valid absorbed submodule
inside a linked parent worktree with conflicting ambient Git routing. See this run's
private sanitized agent report for terminal check outcomes. The frozen root install
hit its 120-second cap after package-link progress; completion is not credited.
Fork install and full wrapper/typecheck gates are blocked by absent fork source.

Independent read-only adversarial review found no correctness defect and requested
the real gitfile/linked-worktree and ambient-environment fixtures, which were added.
A separate `cr --provider codex` subscription review hit its 90-second cap without
returning a review verdict; it is not credited as passed. No paid API fallback used.
No product code, production mutation, browser/native journey, reconciliation,
visual score or migration phase acceptance is claimed.
