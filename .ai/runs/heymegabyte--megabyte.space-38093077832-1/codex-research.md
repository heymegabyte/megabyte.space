# Independent source-gate review — fire-306

The incoming base is a30cbb40; current committed fork is
1739f1915af71f12c4bb3802458502c6453ba450. ADR 0002 and MIGRATION §11
keep candidate rehearsal and production acceptance open. No gitlink, workspace
catalog, lockfile, deployment configuration, resource identity or Access policy changed.

## Findings and implementation

The exact-fetch gate iterated only committed .gitmodules declarations. Real Git
fixtures reproduced false passes for a missing metadata file, an empty metadata
file and an omitted nested gitlink. Enumerate HEAD recursively, require a one-to-one
mapping between gitlinks and declarations with URLs, then verify each exact SHA
against its declared source. Duplicate paths fail before fetching. Ordinary repos
without gitlinks still pass without metadata.

Independent official subscription review through cr identified two additional
issues: reinterpreting literal paths as Git pathspecs could select a different pin;
recursive listing exceeds the default 1 MiB subprocess buffer on larger trees.
Verification now consumes the exact SHA map, sets a bounded 64 MiB output budget,
and reports tree/metadata inspection failure without raw Git diagnostics. Added
Git pathspec-magic and >1 MiB tree fixtures; the large-tree failure was reproduced
before the fix. Outputs exceeding 64 MiB still fail closed rather than pass partial
coverage. This remains a source-provenance gate, not runtime or deployment evidence.

## Recovery and upstream

Fetched origin/main and checked every retained project worktree read-only. All
tracked retained trees were clean; all result tips except historical 8770b90e were
ancestors of origin/main. git cherry marks that result's code/research ancestors
patch-equivalent; its remaining fire-273 bookkeeping is already represented in
current backlog/recovery records, so no replay or cleanup occurred. Prior Actions
and local failed receipts were inspected; failures do not imply unpublished code.

Official git ls-remote now advertises main
33a5b70cc45e210b9aada8b5a1d61013528f4e5f, superseding the earlier watched
7ec49d8c tip. This is an unreviewed observation, not candidate selection. Next lane
must review the new commit range and preserve immutable source attribution before
choosing any evaluation ref. No API fallback, source URL substitution or pointer move.

## Limits

Retained deployment receipt remains 80b7209e and differs from the committed fork.
Do not infer live fork identity from a clean checkout. No production mutation,
authenticated journey, state reconciliation or visual inspection performed; visual
matrix and migration acceptance remain unchanged. Bare pnpm in recursive scripts
was unavailable; a run-local launcher delegates to corepack pnpm 11.17.0 without
changing host configuration. Final commands/results are in the sanitized run report.

Final independent cr subscription review found no remaining material bypass or
regression in the two-file diff. Its sandbox allowed syntax inspection, not fixture
execution; the parent executed all 16 focused fixtures and 122 script tests.
