# Fire-308 independent verification findings

Run: heymegabyte--megabyte.space-38125624086-1. Base: c4cc1ff93bfa802cb4079f7eda2845dd433009e2.

## Decision

ADR 0002 makes migration/stabilization the active mission. Close existing salvage-verifier acceptance gaps without changing native product behavior, gitlink, auth, deployment configuration or storage identities. No migration cutover or runtime deployment attempted.

## Real-Git evidence

The copy fixture enables status.renames=copies, stages a modified watched source and its unchanged copy outside watched paths, then explicitly requires a C record with destination-NUL-source-NUL framing. The copy sorts before the subsequent watched edit. Both destination and original source are checked, as is the separately modified source record.

The wholly unwatched rename uses aaa-outside.txt and xxxdocs/source.txt. Both are unwatched; if the parser mistakenly treats the source field as another status record, slicing off its first three characters yields watched docs/source.txt. The fixture explicitly requires an R record before the subsequent watched edit, proves that edit blocks CI, restores it and proves the rename alone passes. Healthy fork metadata prevents unrelated submodule failure from masking results.

Mutation checks in temporary fixtures reject removing original-path watch coverage (copy-out) and failing to consume the second NUL field (unwatched-rename). Production verifier code is unchanged. Full script suite passes 128/128; focused suite passes 9/9. Root and fork frozen installs pass. Complete current-pin corepack pnpm check exits 0, including build/type/config gates and six Worker dry-runs. A run-local pnpm launcher supports recursive commands and is removed after the check; no host setup changes.

## Independent convergence

Official env-sanitized cr Codex subscription static review first found that the original rename fixture lacked explicit R framing and sorted the watched edit before the rename. Corrected both; added the adversarial source path above. Final review reports no remaining material blocker. Reviewer did not execute tests; the parent executed all fixtures.

## Source and recovery

Declared fork URL bootstrap succeeds at committed pin 9904d80867b6825d81b6b1189e2fccfd07af2ff5. Fresh exact-source verification fetched that SHA independently. Retained worktree tracked states are clean; recent successful 3fe436a9 and 6de42204 commits are ancestors of fetched origin/main. Six historical failed result commits are published. Historical non-ancestor 8770b90e contains only bookkeeping; its preceding implementation/research patches are equivalent on main and its two discovery items are now covered here. No salvage replay or retained-tree mutation.

GitHub official upstream commits API reports 54d4685d27fc7a1ba58b4ff1e1842ebf4701d0b7, dated 2026-10-11T04:24:29Z, subject Add install-local native app session handoff (#712). Releases API returned an empty list (per_page=1). This is a head observation only, not a reviewed diff, fetched candidate, selected pin or deployment approval. The new range needs review before migration candidate selection.

Committed deployment receipt still records fork 80b7209e / fire-298; this is historical metadata, not fresh production evidence. No authenticated journey, storage reconciliation, production browser or visual score credited. Modifier matrix remains unchanged.
