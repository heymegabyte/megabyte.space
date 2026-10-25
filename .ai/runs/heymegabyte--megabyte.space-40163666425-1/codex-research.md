# Fire-316 — recover unpublished provenance protection

Assigned base: `633b4384de439c008135ff6d692c7848ab16da7b`.

## Independent findings

Inspected GitHub Actions history, local failed receipts and four retained worktrees read-only.
The 40136517631 attempt exited before producing an agent report. The 40145905691
attempt retained result `baa0faf5` after publication conflict. That result is not an
ancestor of fetched `origin/main` at `633b4384`. More importantly, direct comparison
of the affected files shows its implementation `7fe32d3c` is still missing from main.
All four inspected retained worktrees have empty `git status --short` output.
No retained checkout was changed or removed.

Recovered its existing regression test, rather than rewriting verified work.
On the assigned snapshot, the test fails: a local replacement commit removes
`.gitmodules` and gitlinks from Git's view, causing the provenance checker to
return success despite an unavailable actual declared source. Recovering the
`GIT_NO_REPLACE_OBJECTS=1` environment override makes all Git subprocesses inspect
the real committed objects. This override does not alter stored replacement refs.

## Fresh evidence

- Regression before fix: 1 failed, actual return 0 versus expected 1.
- Full provenance suite after fix: 21 passed, 0 failed.
- Fire-commit and atomic-bookkeeping suites: 27 passed, 0 failed.
- Actual declared-source gate: bb88b90e fetched successfully.
- Independent adversarial reviewer: no blocking findings; separately ran 21 tests.
- Official upstream HEAD advertisement: bd10b0ece6842b8f486b3467eab6cc3b9c920920.
  Advertisement only; no range review, candidate build or adoption is claimed.

## Limits and next work

Committed fork remains bb88b90e; deployment receipt remains 80b7209e dated
2026-10-09. The comparison reports drift, not a verified live version. Inventory
actual Worker versions before reconciling the receipt. No production mutation,
submodule pin move, full application build, authenticated journey, storage
reconciliation or visual acceptance was performed. Migration acceptance stays open.
The missing legacy provider-policy path is not recreated; current fleet policy applies.

Loop improvement: restores the verified source-provenance regression lost to a
publication conflict. Publication is left to the outer runner; local commits are
not evidence that main contains this recovery.
