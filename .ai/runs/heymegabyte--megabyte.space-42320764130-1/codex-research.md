# fire-364 — executed candidate configuration preservation

Operation: offline research/regression acceptance, not upgrade or deployment.
Root base: c8037141fe194f24994c75fde8aca401a39d6690.
Declared fork remains 240899ec34e822a0afa695e3c7b48a41c2db9c4c.
Candidate: official 2726e932a3fbfcfffa04ee093a881604009f2034.

The fixture is copied verbatim using git show from that exact candidate object in the
retained fire-363 submodule, read-only. SHA-256:
8edcd80ff4502ac5ce4a86777d03c041a03f3f568f1281c310a4420b84959376.
This run's direct fetch did not complete within 55 seconds; the initial short-SHA
fetch failed because Git requires a remote ref or full object ID. No current remote
fetchability claim follows from the retained object.

The regression executes the current wrapper generateConfigs with the candidate
Workshop base and legacy bases for the other Workers, persists the result to a
temporary JSON file, reopens it, and compares the complete ordered v0–v4 migration
history, main/build, compatibility, Browser, loader and version bindings against
the snapshot. Required-field assertions prevent missing-on-both-sides false passes.
Input nonmutation and intentional replacement of vars/services/KV/R2 are separate
assertions. Those replacements equal existing wrapper behavior; that equality does
not establish suitability for the fresh apex, where legacy Better Auth is inappropriate.

This is mixed-base offline Workshop preservation only, not all-candidate generation,
production-writer crash durability, candidate package installation, validated exports,
Wrangler dry-run, namespace creation, v3→v4 data preservation or runtime acceptance.
The fixture cannot prove candidate release wiring matches the wrapper's replacement
arrays. The wrapper intentionally remains unchanged.

Independent review through cr with Codex subscription exited 0 and independently
identified the same evidence boundaries; summarized in adversarial-review.md.
Two bounded OpenCode/DeepSeek attempts timed out with no changes; parent completed
the bounded test after provider unavailability. Initial install stalled and was
terminated; pinned pnpm 11.17.0 frozen offline retry with --ignore-scripts exited 0
in 19.9 seconds. This is not lifecycle-script or full fork-install acceptance.
No full-wrapper retry was performed for this test-only slice.
