# Fire-336 — source bootstrap investigation

Scope: one migration/provenance iteration; no production mutation or pin adoption.

## Independent findings

- Assigned base and fetched `origin/main` are `1a737f3a`. Commit `39472432` introduced gitlink `026dceebc177931a7af490485350a1c7248d9a66`; `.gitmodules` declares `https://github.com/heymegabyte/cloudflare-os.git`.
- The prior failed result `0b611f883690f56470657248f5df7bab7180f59e` is not an ancestor of fetched main. Its retained worktree is clean. Comparing actual candidate files confirms collector/journal recovery remains unpublished. No earlier bookkeeping was transplanted.
- Initial submodule initialization was interrupted, and a bounded 75-second retry exited 124. The submodule has its own `.git` marker but no valid HEAD or router package. A marker alone does not establish a checked-out pin.
- Two direct exact-pin fetches against that submodule's unchanged origin returned `remote error: upload-pack: not our ref 026dceebc177931a7af490485350a1c7248d9a66`. This is a failed retrieval at this observation, not proof the commit never existed, a diagnosis of account permissions, or authorization to substitute another repository/ref.
- Both bounded dependency-install invocations timed out (90 seconds). Package progress reached “done”, but neither invocation returned success. The fork invocation ran against an empty submodule and resolved the parent workspace; this is NOT a fork dependency installation. Do not credit workspace discovery as source/bootstrap acceptance.
- Focused provenance and metadata-validator regressions pass: 50 tests, zero failures. These local fixtures do not establish real remote fetchability or a full wrapper build.

## Decision

Keep retained runtime recovery gated on exact declared-source verification and both real workspace installs. Preserve pin, URL, deployed versions, historical receipt, and visual scores. Production deployment, authenticated/native journeys, storage reconciliation and migration acceptance remain unattempted.

## Loop improvement

Before crediting a submodule install, require both a valid exact HEAD and the expected package marker inside the submodule. Package-manager parent-workspace discovery can make an invocation from an empty directory look like meaningful fork progress. Record terminal exit status and actual workspace scope independently.

## Terminal verification and review

The fresh-object-store `node scripts/check-submodule-resolvable.mjs` exited 1 with
one unresolvable gitlink. This confirms failed verification without distinguishing
source absence, access failure or timeout. GitHub Actions queries returned no usable
history (bounded queries timed out or yielded empty output); local failed receipts
were inspected instead. No claim of live Actions success is made.

Official subscription Codex review via `cr --provider codex` exited 0 and found no
actionable overclaim in the documentation diff. It explicitly did not verify execution
receipts; the primary agent collected the checks. The legacy provider-policy file is
absent; explicit incoming provider restrictions were followed. No credentials changed.
