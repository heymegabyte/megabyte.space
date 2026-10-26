# Fire-322: deployment receipt evidence

Independent source inspection found the local comparison guard claimed receipt mismatch
proved HEAD ahead of production, matching fork proved deployed code, and outer movement
was necessarily non-deployable. These inferences cannot follow from local Git and receipt
inputs. The function performs no production request or wrapper diff.

Changed advisory wording and regression assertions while preserving statuses, booleans,
JSON fields and exit behavior. Publication advisory now identifies the potentially stale
local origin/main tracking ref and fleet runner publication ownership.

Recovery: fetched origin/main contains bec0e157 and 2f8bc30b. Latest failed retained tree
40240495517 is clean. Failed 40228684435 retains the both-unusual-path test patch, already
present in this HEAD via d8ea442b; no replay or mutation of retained files. Declared fork
6d7283a5 initialized successfully; no gitlink change. Existing receipt remains 80b7209e.

Verification: root frozen install, 138 root script tests, 11 focused tests, embedded
10-case selftest and scripts typecheck pass. Actual --ci invocation on current receipt
mismatch exits 1; advisory JSON invocation exits 0. Read-only independent reviewer agreed
with the evidence boundary and prompted explicit stale tracking-ref coverage.

Scope: tooling/docs only. No deployment, live Worker/source correlation, full fork build,
protected browser/native-client journey, storage reconciliation or visual acceptance.
No modifier scores or deployment receipt changed. Missing legacy provider-policy file
was handled using repository provider rules and fleet runtime, without credential changes.

Next: immutable per-Worker wrapper/fork source correlation; maintain migration acceptance
as open until its own production and identity gates have evidence.

Official Claude subscription review via cr found two downstream salvage instructions
still equated receipt match with live production. Corrected check-fire-committed output
and the loop's salvage branch in the same iteration. Review was source-only; its inability
to run tests is not credited as execution evidence. Human OK label retained for compatibility,
with explicit local-receipt wording in the message.
