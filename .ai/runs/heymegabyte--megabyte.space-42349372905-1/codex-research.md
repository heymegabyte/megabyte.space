# fire-365 — recover unpublished candidate configuration regression

This iteration recovered retained work rather than duplicating it. GitHub Actions
42320764130 reports execution failure and resultCommit c8037141, while its actual
clean worktree retains 4f16714e and 3263c25d. A fresh origin/main fetch still points
to c8037141 and does not contain 3263c25d. These observations explain why the prior
agent report alone cannot establish publication. The shared canonical main points
to a different commit; this assigned snapshot was preserved without rebasing.

Cherry-picks cf8d8d7b and 9abf6782 recover the exact test, snapshot, research and
bookkeeping. No prior worktree was mutated. The declared submodule initialized at
240899ec34e822a0afa695e3c7b48a41c2db9c4c and passed its own-marker/top-level/HEAD
preflight. The candidate fixture SHA-256 remains
8edcd80ff4502ac5ce4a86777d03c041a03f3f568f1281c310a4420b84959376.

Independent acceptance review in this iteration: the regression checks explicit
ordered v0-v4 migrations, existence of eight preserved runtime fields, JSON reopen,
base nonmutation, and separately the wrapper's overwritten arrays. It does not
execute candidate modules, validate their exports, prove all-candidate bindings,
run lifecycle scripts or migrate state. Retaining an upstream snapshot under a
run directory is intentional provenance; moving it would be unnecessary churn.
The prior independent subscription review is retained as historical evidence only.

No new implementation work was assigned to a provider: this is frontier acceptance
and exact-commit recovery. The repository router returned status ok, no selected
skills; deploy-and-runtime-verification was read for its local/release evidence
boundary. No external mutation, Browser Harness, scheduler change, credential
change, submodule pointer move or visual score occurred. Outer-runner publication
remains separate from these commits. Current fresh check results are recorded in
the fire-365 ledger and incoming agent report, not inferred from prior logs.
