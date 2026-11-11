# Fire-370: retained memory-pressure guidance recovery

Operation: read-only recovery review plus documentation maintenance. ADR 0002 and docs/MIGRATION.md keep production migration approval-gated. No architect assignment or material behavior change is involved.

## Observed recovery evidence

- Assigned base f9ee706175e5224ce3b9ffb81cbc0e2bf7de0496 is an ancestor of freshly fetched origin/main. GitHub Actions reports prior run 43048112422 failed; success labels were not used as publication proof.
- Prior worktree remains at that base with only a four-line loop-command change. Recovered that exact diff without modifying the retained worktree. It advises inspecting memory.high alongside memory.max and serializing installs when concurrent attempts experience pressure.
- Prior report records an interrupted concurrent fork install followed by a passing serial retry. Its wrapper log ends at Router dry-run output, without terminal wrapper exit evidence. This review does not upgrade that incomplete result.
- Current independent submodule checkout matches committed gitlink 240899ec34e822a0afa695e3c7b48a41c2db9c4c using the declared remote. Preflight passes. The pin is unchanged.
- Current process cgroup reports memory.high 1572864000, memory.max 2147483648 and nonzero high events. A sampled memory.current was 1556844544. Cumulative events do not assign causality to one command; shared ancestor limits and other processes also matter. Host limits were preserved.
- Fresh lifecycle fixture suite: 42 passed, zero failed, terminal exit 0. git diff --check passes. These tests cover existing lifecycle helpers, not memory-pressure behavior or deployment acceptance.
- Direct DeepSeek read-only review was bounded to 45 seconds and exited 124 without output. No review acceptance is credited and no paid frontier fallback was used.

## Limits and next action

This documentation recovery prevents a known operational mistake but does not complete full wrapper, candidate release, browser/native/provider or isolated migration acceptance. No UI was visited, no visual score changed, no deployment or historical receipt was changed. Keep the existing measured-wrapper-evidence backlog item open. Frozen install outcomes are recorded separately in agent-report.json; dependency consumers require both installs to finish.
